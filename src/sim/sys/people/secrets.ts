import { deferEvents } from '../../ext4';
// Segredos e dossiês (Hollywood Animal / Crusader Kings III). Pessoas do elenco, CEOs rivais e o
// próprio dono têm segredos. Detetives (contratados pelo jogador), jornalistas e rivais podem
// descobri-los. Usar um segredo funciona — na Mesa de negociação ou contra um CEO rival — e arrisca
// exposição. Vazamentos viram crises de imagem e decisões na Mesa.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { emitEvent, type EventDef } from '../../events';
import { openCrisis } from '../../media';
import type { GameState } from '../../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../../util';
import { P, actOf, addMsg, addPost, clamp01, healthOf, socialEra, trackedPersons, type Secret } from './state';
import { addThought, thoughtAll } from './thoughts';
import { ownerOf } from './owner';

export const SECRET_NAME: Record<Secret['kind'], L> = {
  affair: l('caso extraconjugal', 'an affair'),
  debt: l('dívidas escondidas', 'hidden debts'),
  plagiarism: l('plágio escondido', 'hidden plagiarism'),
  child: l('filho não assumido', 'an unacknowledged child'),
  tax: l('sonegação de impostos', 'tax evasion'),
  fake_bio: l('biografia inventada', 'a made-up biography'),
  payola: l('jabá pago a rádios', 'paid radio payola'),
  addiction: l('dependência escondida', 'a hidden addiction'),
};

export function ownerLabel(s: GameState, sec: Secret): L {
  if (sec.owner === 'owner') return l(ownerOf(s).name);
  if (sec.owner.startsWith('label:')) {
    const lb = s.labels[sec.owner.slice(6)];
    return fmtL(l('CEO de {b} ({c})', 'CEO of {b} ({c})'), { b: lb?.name ?? '?', c: lb?.ceo ?? '?' });
  }
  return l(s.persons[sec.owner]?.name ?? '?');
}

export function secretsOf(s: GameState, owner: string): Secret[] {
  return P(s).secrets.filter((x) => x.owner === owner);
}

function seed(s: GameState, r: Rng): void {
  const st = P(s);
  for (const p of trackedPersons(s)) {
    if (st.secretsSeeded[p.id]) continue;
    st.secretsSeeded[p.id] = 1;
    if (!r.chance(0.32)) continue;
    const opts: [Secret['kind'], number][] = [
      ['affair', s.families[p.id]?.partner ? 3 : 0.5], ['debt', p.traits.includes('spendthrift') ? 4 : 1], ['plagiarism', p.traits.includes('manipulative') || p.traits.includes('opportunist') ? 3 : 0.8],
      ['child', 0.8], ['tax', 1], ['fake_bio', p.traits.includes('big_ego') ? 2 : 0.6], ['addiction', healthOf(s, p.id).history ? 3 : 0.4],
    ];
    const kind = r.weighted(opts, (x) => x[1])![0];
    st.secrets.push({ id: nextId(s, 'sc'), owner: p.id, kind, severity: r.int(1, 3), known: false, knownBy: [], leaked: false, used: 0 });
  }
  for (const lb of Object.values(s.labels)) {
    const key = `label:${lb.id}`;
    if (!lb.active || st.secretsSeeded[key]) continue;
    st.secretsSeeded[key] = 1;
    if (!r.chance(0.55)) continue;
    const kind = r.pick(['payola', 'tax', 'affair', 'debt'] as const);
    st.secrets.push({ id: nextId(s, 'sc'), owner: key, kind, severity: r.int(1, 3), known: false, knownBy: [], leaked: false, used: 0 });
  }
  if (!st.secretsSeeded.owner) {
    st.secretsSeeded.owner = 1;
    if (r.chance(0.3)) st.secrets.push({ id: nextId(s, 'sc'), owner: 'owner', kind: r.pick(['tax', 'affair', 'payola'] as const), severity: r.int(1, 2), known: true, knownBy: [], leaked: false, used: 0 });
  }
  if (st.secrets.length > 60) st.secrets = st.secrets.filter((x) => !x.leaked || x.used).slice(-60);
}

export function detectiveCost(s: GameState): number {
  return money(s, 3000);
}

/** Contrata um detetive particular para investigar uma pessoa ou CEO rival. */
export function hireDetective(s: GameState, r: Rng, target: string): L {
  const cost = detectiveCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `detective:${target}`, -cost, 'admin', 'Detetive particular');
  const st = P(s);
  const hidden = st.secrets.filter((x) => x.owner === target && !x.known);
  const lbId = target.startsWith('label:') ? target.slice(6) : undefined;
  if (lbId && r.chance(0.15)) {
    s.rivalries[lbId] = (s.rivalries[lbId] ?? 0) + 12;
    notify(s, l('O rival percebeu o detetive. A rixa aumentou.', 'The rival spotted the detective. The feud grew.'), 'bad');
  }
  if (!hidden.length || !r.chance(0.5 + (s.year >= 1995 ? 0.1 : 0))) return l('O detetive não encontrou nada concreto.', 'The detective found nothing solid.');
  const sec = hidden[0];
  sec.known = true;
  const who = ownerLabel(s, sec);
  addMsg(s, { from: l('Detetive particular', 'Private detective').pt, kind: 'secret', subject: l('Dossiê', 'Dossier'), body: fmtL(l('{w} esconde {k}. As provas estão no envelope.', '{w} is hiding {k}. The proof is in the envelope.'), { w: who, k: SECRET_NAME[sec.kind] }), tone: 'info' });
  return fmtL(l('Dossiê pronto: {w} esconde {k}.', 'Dossier ready: {w} is hiding {k}.'), { w: who, k: SECRET_NAME[sec.kind] });
}

/** Vaza um segredo: crise de imagem para o ato (ou golpe na reputação do selo). */
export function leakSecret(s: GameState, sec: Secret, by: L, sevMult = 1): void {
  if (sec.leaked) return;
  sec.leaked = true;
  sec.known = true;
  const who = ownerLabel(s, sec);
  const text = fmtL(l('{b} revela: {w} esconde {k}.', '{b} reveals: {w} is hiding {k}.'), { b: by, w: who, k: SECRET_NAME[sec.kind] });
  if (sec.owner === 'owner') {
    s.player.reputation.institutional = clamp01(s.player.reputation.institutional - 6 * sec.severity * sevMult);
    ownerOf(s).stress = clamp01(ownerOf(s).stress + 15);
  } else if (sec.owner.startsWith('label:')) {
    const lb = s.labels[sec.owner.slice(6)];
    if (lb) lb.reputation = clamp01(lb.reputation - 8 * sec.severity);
  } else {
    const act = actOf(s, sec.owner);
    if (act) {
      openCrisis(s, act, 'scandal', Math.round(Math.min(95, (20 + sec.severity * 22) * sevMult)), text);
      addThought(s, sec.owner, 'secret_leaked');
      thoughtAll(s, act.id, 'gossip');
    }
  }
  remember(s, 'secret_leak', text, { actId: actOf(s, sec.owner)?.id, important: true });
  addPost(s, socialEra(s.year)
    ? { author: '@fofocapop', role: 'journalist', text, sentiment: -0.7, actId: actOf(s, sec.owner)?.id, likes: 3000 }
    : { author: l('Coluna de fofocas', 'Gossip column').pt, role: 'gossip', text, sentiment: -0.6, actId: actOf(s, sec.owner)?.id, likes: 0 });
}

export type CeoDemand = 'back_off' | 'cash';

/** Pressiona um CEO rival com um segredo conhecido. Funciona, mas pode explodir. */
export function pressureCeo(s: GameState, r: Rng, secretId: string, demand: CeoDemand): L {
  const sec = P(s).secrets.find((x) => x.id === secretId);
  if (!sec || !sec.known || sec.leaked || !sec.owner.startsWith('label:')) return l('Segredo inválido.', 'Invalid secret.');
  if (sec.used >= 2) return l('Esse segredo já foi usado demais.', 'That secret is used up.');
  const lb = s.labels[sec.owner.slice(6)];
  if (!lb?.active) return l('Selo inativo.', 'Label inactive.');
  sec.used += 1;
  const exposed = r.chance(0.18 + sec.used * 0.1);
  if (exposed) {
    s.player.reputation.institutional = clamp01(s.player.reputation.institutional - 10);
    s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 40;
    leakSecret(s, sec, l('O próprio CEO', 'The CEO himself'));
    remember(s, 'blackmail_exposed', fmtL(l('{c} denuncia chantagem de {me}.', '{c} exposes blackmail by {me}.'), { c: lb.ceo ?? lb.name, me: s.config.companyName }), { important: true });
    return l('Deu errado: o CEO foi à imprensa e denunciou a chantagem.', 'It backfired: the CEO went to the press about the blackmail.');
  }
  if (demand === 'back_off') {
    lb.aggression = Math.max(0.05, lb.aggression * 0.6);
    s.rivalries[lb.id] = Math.max(0, (s.rivalries[lb.id] ?? 0) * 0.3);
    return fmtL(l('{b} recua: menos agressividade contra seu elenco.', '{b} backs off: less aggression toward your roster.'), { b: lb.name });
  }
  const amount = Math.min(Math.max(0, lb.cash) * 0.1, money(s, 15000 * sec.severity));
  lb.cash -= amount;
  post(s, `hush:${sec.id}`, Math.round(amount), 'other_income', 'Acordo confidencial');
  s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 15;
  return l('O CEO pagou pelo silêncio. Ele não vai esquecer.', 'The CEO paid for silence. He won\'t forget.');
}

export function secretsMonth(s: GameState, r: Rng): void {
  seed(s, r);
  const st = P(s);
  const mine = new Set(playerActs(s));
  for (const sec of st.secrets) {
    if (sec.leaked) continue;
    if (sec.owner.startsWith('label:')) continue;
    const act = sec.owner === 'owner' ? undefined : actOf(s, sec.owner);
    if (sec.owner !== 'owner' && (!act || !mine.has(act.id))) continue;
    const fame = act?.fame ?? 30;
    // jornalistas cavam histórias de quem aparece
    if (!sec.knownBy.includes('press') && r.chance(0.004 * sec.severity * (1 + fame / 40))) {
      sec.knownBy.push('press');
      emitEvent(s, r, 'people_journalist', { act: act?.id ?? '', secret: sec.id, person: sec.owner === 'owner' ? '' : sec.owner });
      continue;
    }
    // rivais descobrem e usam
    for (const lb of Object.values(s.labels)) {
      if (!lb.active || sec.knownBy.includes(lb.id)) continue;
      if ((s.rivalries[lb.id] ?? 0) > 20 && r.chance(0.008)) {
        sec.knownBy.push(lb.id);
        addMsg(s, {
          from: lb.ceo ?? lb.name, kind: 'secret', tone: 'bad', expires: s.week + 6,
          subject: l('Uma conversa discreta', 'A discreet conversation'),
          body: fmtL(l('{c} ({b}) sabe que {w} esconde {k}. Quer "compensação" para esquecer o assunto.', '{c} ({b}) knows {w} is hiding {k}. Wants "compensation" to forget it.'), { c: lb.ceo ?? '?', b: lb.name, w: ownerLabel(s, sec), k: SECRET_NAME[sec.kind] }),
          ref: { secret: sec.id, label: lb.id, amount: money(s, 5000 * sec.severity) },
          actions: [{ id: 'pay', label: fmtL(l('Pagar ({v})', 'Pay ({v})'), { v: `$${5000 * sec.severity}` }) }, { id: 'refuse', label: l('Recusar', 'Refuse') }],
        });
        break;
      }
    }
  }
}

const SECRET_EVENTS: EventDef[] = [
  {
    id: 'people_journalist', cat: 'scandal', tone: 'bad', tags: ['controversy'], cooldown: 1, forcedOnly: true,
    title: l('Um jornalista tem um dossiê', 'A journalist has a dossier'),
    text: l('Um repórter ligou: tem provas de um segredo e vai publicar. Dá para negociar o tom — ou o silêncio.', 'A reporter called: they have proof of a secret and will publish. You can negotiate the tone — or the silence.'),
    options: [
      { id: 'bury', label: l('Pagar para enterrar a matéria', 'Pay to bury the story'), hint: l('Caro; nem sempre funciona.', 'Expensive; not always works.'), apply: (s, r, c) => {
        const sec = P(s).secrets.find((x) => x.id === c.secret);
        if (!sec) return;
        post(s, `bury:${sec.id}`, -money(s, 4000 * sec.severity), 'marketing', 'Assessoria de imprensa');
        if (r.chance(0.65)) sec.knownBy = sec.knownBy.filter((x) => x !== 'press');
        else leakSecret(s, sec, l('Uma revista', 'A magazine'), 1.3);
      } },
      { id: 'interview', label: l('Entrevista exclusiva (contar antes)', 'Exclusive interview (tell it first)'), hint: l('Vaza, mas pela metade do estrago.', 'It leaks, but at half the damage.'), apply: (s, _r, c) => {
        const sec = P(s).secrets.find((x) => x.id === c.secret);
        if (!sec) return;
        leakSecret(s, sec, l('Uma entrevista exclusiva', 'An exclusive interview'), 0.5);
        const a = sec.owner !== 'owner' ? actOf(s, sec.owner) : undefined;
        if (a) a.trust = clamp01(a.trust + 5);
      } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: (s, _r, c) => {
        const sec = P(s).secrets.find((x) => x.id === c.secret);
        if (sec) leakSecret(s, sec, l('Um jornal', 'A newspaper'));
      } },
    ],
  },
];
deferEvents(SECRET_EVENTS);
