import { deferEvents } from '../../ext4';
// Segredos e dossiês (Hollywood Animal / Crusader Kings III). Pessoas do elenco, CEOs rivais e o
// próprio dono têm segredos. Detetives (contratados pelo jogador), jornalistas e rivais podem
// descobri-los. Usar um segredo funciona — na Mesa de negociação ou contra um CEO rival — e arrisca
// exposição. Vazamentos viram crises de imagem e decisões na Mesa.
// R31 · UNI-4 (B.5): o dossiê é um segredo do secrets23 (src 'people', depósito único). Quem sabe = níveis do
// secrets23 (jogador ≥ confirmado; imprensa ≥ boato; selo ≥ boato; vazou = público); o uso fica no holds17 (`su`).

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { emitEvent, type EventDef } from '../../events';
import { markSecretUse, secretUse } from '../../holds17';
import { openCrisis } from '../../media';
import type { GameState } from '../../types';
import { fmtL, money, notify, playerActs, post, remember } from '../../util';
import { actOf, addMsg, addPost, clamp01, healthOf, socialEra, trackedPersons } from './state';
import { addThought, thoughtAll } from './thoughts';
import { ownerOf } from './owner';
import { cashWhy20, freeCash20 } from '../../oblig20';
import { addSecret23, know23, ownOf23, sec23, setKnow23, dropSecrets23, type Kind23, type Lvl23, type Sec23 } from '../secstore23';

export type DossierKind = 'affair' | 'debt' | 'plagiarism' | 'child' | 'tax' | 'fake_bio' | 'payola' | 'addiction';
/** Dossiê = segredo do secrets23 com `data.ow` (dono: id de pessoa, `label:<id>` ou 'owner'), `data.pk` (tipo) e `data.sv` (gravidade 1..3). */
export type Secret = Sec23;

export const SECRET_NAME: Record<DossierKind, L> = {
  affair: l('caso extraconjugal', 'an affair'),
  debt: l('dívidas escondidas', 'hidden debts'),
  plagiarism: l('plágio escondido', 'hidden plagiarism'),
  child: l('filho não assumido', 'an unacknowledged child'),
  tax: l('sonegação de impostos', 'tax evasion'),
  fake_bio: l('biografia inventada', 'a made-up biography'),
  payola: l('jabá pago a rádios', 'paid radio payola'),
  addiction: l('dependência escondida', 'a hidden addiction'),
};
const PS_KIND: Record<DossierKind, Kind23> = { affair: 'affair', debt: 'debt', plagiarism: 'plagiarism', child: 'child', tax: 'tax', fake_bio: 'fake_bio', payola: 'payola', addiction: 'drugs' };

// ---------------------------------------------------------------- leitura (vista do dossiê sobre o secrets23)

export const dossiers = (s: GameState): Secret[] => ownOf23(s, 'people');
export const dossierById = (s: GameState, id: string): Secret | undefined => sec23(s).own.find((x) => x.id === id && x.src === 'people' && !x.end);
export const secOwner = (sec: Secret): string => String(sec.data?.ow ?? '');
export const secKind = (sec: Secret): DossierKind => String(sec.data?.pk ?? 'debt') as DossierKind;
export const secSev = (sec: Secret): number => Number(sec.data?.sv ?? 1);
/** o jogador sabe (confirmado) */
export const secKnown = (s: GameState, sec: Secret): boolean => know23(s, sec).p >= 3;
/** vazou (público) */
export const secLeaked = (s: GameState, sec: Secret): boolean => know23(s, sec).pr >= 4;
/** quem mais sabe: 'press' ou id de selo (boato ou mais) */
export function secKnownBy(s: GameState, sec: Secret): string[] {
  const k = know23(s, sec);
  return [...(k.pr >= 2 ? ['press'] : []), ...Object.entries(k.r).filter(([, v]) => v >= 2).map(([id]) => id)];
}
export const secUsed = (s: GameState, sec: Secret): number => secretUse(s, sec.id)?.n ?? 0;

// ---------------------------------------------------------------- escrita

export const setSecKnown = (s: GameState, sec: Secret): void => { if (!secKnown(s, sec)) setKnow23(s, sec, 'player', 3); };
export function addSecKnownBy(s: GameState, sec: Secret, who: string): void {
  const k = know23(s, sec);
  if (who === 'press') { if (k.pr < 2) setKnow23(s, sec, 'press', 2); } else if ((k.r[who] ?? 0) < 3) setKnow23(s, sec, who, 3);
}
export function delSecKnownBy(s: GameState, sec: Secret, who: string): void {
  if (who === 'press') { if (know23(s, sec).pr < 4) setKnow23(s, sec, 'press', 0); } else setKnow23(s, sec, who, 0);
}
export const useSecret = (s: GameState, sec: Secret): void => markSecretUse(s, sec.id);

const subjOf = (owner: string): string => (owner === 'owner' ? 'player' : owner.startsWith('label:') ? `lb:${owner.slice(6)}` : `p:${owner}`);
/** Cria um dossiê no depósito único (secrets23). */
export function addDossier(s: GameState, owner: string, kind: DossierKind, severity: number, known: boolean): Secret {
  const subj = subjOf(owner);
  const sec = addSecret23(s, { kind: PS_KIND[kind], subject: subj, sev: 20 + severity * 20, ev: 50, data: { ow: owner, pk: kind, sv: severity } }, 'people');
  if (known || owner === 'owner') setKnow23(s, sec, 'player', 3 as Lvl23);
  return sec;
}

export function ownerLabel(s: GameState, sec: Secret): L {
  const ow = secOwner(sec);
  if (ow === 'owner') return l(ownerOf(s).name);
  if (ow.startsWith('label:')) {
    const lb = s.labels[ow.slice(6)];
    return fmtL(l('CEO de {b} ({c})', 'CEO of {b} ({c})'), { b: lb?.name ?? '?', c: lb?.ceo ?? '?' });
  }
  return l(s.persons[ow]?.name ?? '?');
}

export function secretsOf(s: GameState, owner: string): Secret[] {
  return dossiers(s).filter((x) => secOwner(x) === owner);
}

function seed(s: GameState, r: Rng): void {
  const sd = sec23(s).sd;
  for (const p of trackedPersons(s)) {
    if (sd[`ps:${p.id}`]) continue;
    sd[`ps:${p.id}`] = 1;
    if (!r.chance(0.32)) continue;
    const opts: [DossierKind, number][] = [
      ['affair', s.families[p.id]?.partner ? 3 : 0.5], ['debt', p.traits.includes('spendthrift') ? 4 : 1], ['plagiarism', p.traits.includes('manipulative') || p.traits.includes('opportunist') ? 3 : 0.8],
      ['child', 0.8], ['tax', 1], ['fake_bio', p.traits.includes('big_ego') ? 2 : 0.6], ['addiction', healthOf(s, p.id).history ? 3 : 0.4],
    ];
    const kind = r.weighted(opts, (x) => x[1])![0];
    addDossier(s, p.id, kind, r.int(1, 3), false);
  }
  for (const lb of Object.values(s.labels)) {
    const key = `label:${lb.id}`;
    if (!lb.active || sd[`ps:${key}`]) continue;
    sd[`ps:${key}`] = 1;
    if (!r.chance(0.55)) continue;
    const kind = r.pick(['payola', 'tax', 'affair', 'debt'] as const);
    addDossier(s, key, kind, r.int(1, 3), false);
  }
  if (!sd['ps:owner']) {
    sd['ps:owner'] = 1;
    if (r.chance(0.3)) addDossier(s, 'owner', r.pick(['tax', 'affair', 'payola'] as const), r.int(1, 2), true);
  }
  const all = dossiers(s);
  if (all.length > 60) {
    const keep = all.filter((x) => !secLeaked(s, x) || secUsed(s, x)).slice(-60);
    dropSecrets23(s, (x) => x.src === 'people' && !keep.includes(x));
  }
}

export function detectiveCost(s: GameState): number {
  return money(s, 3000);
}

/** Contrata um detetive particular para investigar uma pessoa ou CEO rival. */
export function hireDetective(s: GameState, r: Rng, target: string): L {
  const cost = detectiveCost(s);
  if (freeCash20(s) < cost) return cashWhy20(s, cost, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `detective:${target}`, -cost, 'admin', 'Detetive particular');
  const hidden = dossiers(s).filter((x) => secOwner(x) === target && !secKnown(s, x));
  const lbId = target.startsWith('label:') ? target.slice(6) : undefined;
  if (lbId && r.chance(0.15)) {
    s.rivalries[lbId] = (s.rivalries[lbId] ?? 0) + 12;
    notify(s, l('O rival percebeu o detetive. A rixa aumentou.', 'The rival spotted the detective. The feud grew.'), 'bad');
  }
  if (!hidden.length || !r.chance(0.5 + (s.year >= 1995 ? 0.1 : 0))) return l('O detetive não encontrou nada concreto.', 'The detective found nothing solid.');
  const sec = hidden[0];
  setSecKnown(s, sec);
  const who = ownerLabel(s, sec);
  addMsg(s, { from: l('Detetive particular', 'Private detective').pt, kind: 'secret', subject: l('Dossiê', 'Dossier'), body: fmtL(l('{w} esconde {k}. As provas estão no envelope.', '{w} is hiding {k}. The proof is in the envelope.'), { w: who, k: SECRET_NAME[secKind(sec)] }), tone: 'info' });
  return fmtL(l('Dossiê pronto: {w} esconde {k}.', 'Dossier ready: {w} is hiding {k}.'), { w: who, k: SECRET_NAME[secKind(sec)] });
}

/** Vaza um segredo: crise de imagem para o ato (ou golpe na reputação do selo). */
export function leakSecret(s: GameState, sec: Secret, by: L, sevMult = 1): void {
  if (secLeaked(s, sec)) return;
  setKnow23(s, sec, 'press', 4); setKnow23(s, sec, 'player', 4);
  leakFx(s, sec, by, sevMult);
}
/** Efeitos do vazamento de um dossiê (também chamado pelo secrets23 quando ele expõe o segredo). */
export function leakFx(s: GameState, sec: Secret, by: L, sevMult = 1): void {
  const who = ownerLabel(s, sec);
  const text = fmtL(l('{b} revela: {w} esconde {k}.', '{b} reveals: {w} is hiding {k}.'), { b: by, w: who, k: SECRET_NAME[secKind(sec)] });
  if (secOwner(sec) === 'owner') {
    s.player.reputation.institutional = clamp01(s.player.reputation.institutional - 6 * secSev(sec) * sevMult);
    ownerOf(s).stress = clamp01(ownerOf(s).stress + 15);
  } else if (secOwner(sec).startsWith('label:')) {
    const lb = s.labels[secOwner(sec).slice(6)];
    if (lb) lb.reputation = clamp01(lb.reputation - 8 * secSev(sec));
  } else {
    const act = actOf(s, secOwner(sec));
    if (act) {
      openCrisis(s, act, 'scandal', Math.round(Math.min(95, (20 + secSev(sec) * 22) * sevMult)), text);
      addThought(s, secOwner(sec), 'secret_leaked');
      thoughtAll(s, act.id, 'gossip');
    }
  }
  remember(s, 'secret_leak', text, { actId: actOf(s, secOwner(sec))?.id, important: true });
  addPost(s, socialEra(s.year)
    ? { author: '@fofocapop', role: 'journalist', text, sentiment: -0.7, actId: actOf(s, secOwner(sec))?.id, likes: 3000 }
    : { author: l('Coluna de fofocas', 'Gossip column').pt, role: 'gossip', text, sentiment: -0.6, actId: actOf(s, secOwner(sec))?.id, likes: 0 });
}

export type CeoDemand = 'back_off' | 'cash';

/** Pressiona um CEO rival com um segredo conhecido. Funciona, mas pode explodir. */
export function pressureCeo(s: GameState, r: Rng, secretId: string, demand: CeoDemand): L {
  const sec = dossierById(s, secretId);
  if (!sec || !secKnown(s, sec) || secLeaked(s, sec) || !secOwner(sec).startsWith('label:')) return l('Segredo inválido.', 'Invalid secret.');
  if (secUsed(s, sec) >= 2) return l('Esse segredo já foi usado demais.', 'That secret is used up.');
  const lb = s.labels[secOwner(sec).slice(6)];
  if (!lb?.active) return l('Selo inativo.', 'Label inactive.');
  useSecret(s, sec);
  const exposed = r.chance(0.18 + secUsed(s, sec) * 0.1);
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
  const amount = Math.min(Math.max(0, lb.cash) * 0.1, money(s, 15000 * secSev(sec)));
  lb.cash -= amount;
  post(s, `hush:${sec.id}`, Math.round(amount), 'other_income', 'Acordo confidencial');
  s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 15;
  return l('O CEO pagou pelo silêncio. Ele não vai esquecer.', 'The CEO paid for silence. He won\'t forget.');
}

export function secretsMonth(s: GameState, r: Rng): void {
  seed(s, r);
  const mine = new Set(playerActs(s));
  for (const sec of dossiers(s)) {
    if (secLeaked(s, sec)) continue;
    if (secOwner(sec).startsWith('label:')) continue;
    const act = secOwner(sec) === 'owner' ? undefined : actOf(s, secOwner(sec));
    if (secOwner(sec) !== 'owner' && (!act || !mine.has(act.id))) continue;
    const fame = act?.fame ?? 30;
    // jornalistas cavam histórias de quem aparece
    if (!secKnownBy(s, sec).includes('press') && r.chance(0.004 * secSev(sec) * (1 + fame / 40))) {
      addSecKnownBy(s, sec, 'press');
      emitEvent(s, r, 'people_journalist', { act: act?.id ?? '', secret: sec.id, person: secOwner(sec) === 'owner' ? '' : secOwner(sec) });
      continue;
    }
    // rivais descobrem e usam
    for (const lb of Object.values(s.labels)) {
      if (!lb.active || secKnownBy(s, sec).includes(lb.id)) continue;
      if ((s.rivalries[lb.id] ?? 0) > 20 && r.chance(0.008)) {
        addSecKnownBy(s, sec, lb.id);
        addMsg(s, {
          from: lb.ceo ?? lb.name, kind: 'secret', tone: 'bad', expires: s.week + 6,
          subject: l('Uma conversa discreta', 'A discreet conversation'),
          body: fmtL(l('{c} ({b}) sabe que {w} esconde {k}. Quer "compensação" para esquecer o assunto.', '{c} ({b}) knows {w} is hiding {k}. Wants "compensation" to forget it.'), { c: lb.ceo ?? '?', b: lb.name, w: ownerLabel(s, sec), k: SECRET_NAME[secKind(sec)] }),
          ref: { secret: sec.id, label: lb.id, amount: money(s, 5000 * secSev(sec)) },
          actions: [{ id: 'pay', label: fmtL(l('Pagar ({v})', 'Pay ({v})'), { v: `$${5000 * secSev(sec)}` }) }, { id: 'refuse', label: l('Recusar', 'Refuse') }],
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
        const sec = dossierById(s, String(c.secret));
        if (!sec) return;
        post(s, `bury:${sec.id}`, -money(s, 4000 * secSev(sec)), 'marketing', 'Assessoria de imprensa');
        if (r.chance(0.65)) delSecKnownBy(s, sec, 'press');
        else leakSecret(s, sec, l('Uma revista', 'A magazine'), 1.3);
      } },
      { id: 'interview', label: l('Entrevista exclusiva (contar antes)', 'Exclusive interview (tell it first)'), hint: l('Vaza, mas pela metade do estrago.', 'It leaks, but at half the damage.'), apply: (s, _r, c) => {
        const sec = dossierById(s, String(c.secret));
        if (!sec) return;
        leakSecret(s, sec, l('Uma entrevista exclusiva', 'An exclusive interview'), 0.5);
        const a = secOwner(sec) !== 'owner' ? actOf(s, secOwner(sec)) : undefined;
        if (a) a.trust = clamp01(a.trust + 5);
      } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: (s, _r, c) => {
        const sec = dossierById(s, String(c.secret));
        if (sec) leakSecret(s, sec, l('Um jornal', 'A newspaper'));
      } },
    ],
  },
];
deferEvents(SECRET_EVENTS);
