// Rodada 17 — CRIME entre NPCs e contra você. Chefes de selo e de organizações tramam pelos TRAÇOS (persona13:
// ambição, coragem, impulsividade, empatia, disciplina, lealdade), pelas MÁGOAS (holds17) e pelas RIVALIDADES;
// gravadoras se juntam em conluio (inclusive convidando você), traem e delatam. Planos contra você podem ser
// descobertos pela sua segurança e viram cartão com opções. Rappers/funkeiros/corridistas ligados a gangues
// criam rixas sangrentas (diss → briga → tiros, só entre personagens fictícios). Situações do diretor: pizzo,
// carreira atrás das grades e a oferta de lavagem.

import { clamp, Rng, seedState } from '../../core/rng';
import { countryName } from '../../data/geo';
import { familyOf, l, type L } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { grantHold, holdsOf } from '../holds17';
import { histMode } from '../history15';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import {
  SEC17, a3Of, addHeat, bossName, commitCrime, crime17, crimeById, famOf, feedCase, hasRacket, isReal, jailedIn, mIdx, nameOf17, orgById, orgs17,
  ownerOfTarget, pizzoFee, reportOrg, toggleLaunder, launderFee, usd, type Ctx17, type Org17, type Warn17,
} from './crime17';
import { leaderOf } from './leaders10';
import { per13 } from './persona13';
import { relics } from './relics9';
import { registerSituation } from './situations17';

const F = (s: GameState, key: string, f: string): number => ((per13(s, key)?.facets as Record<string, number> | undefined)?.[f] ?? 50);
const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const STREET = (g: string): boolean => familyOf(g) === 'hiphop' || ['funk_carioca', 'corridos_tumbados', 'norteno', 'dancehall', 'reggaeton', 'gfunk', 'drill', 'trap'].includes(g);
const bestAct = (s: GameState, owner: string): Act | undefined =>
  (owner === 'player' ? playerActs(s).map((id) => s.acts[id]) : (s.labels[owner]?.roster ?? []).map((id) => s.acts[id])).filter(live).sort((a, b) => b.fame - a.fame)[0];
const leadOf = (s: GameState, a?: Act): string | undefined => a ? (a.leaderId && s.persons[a.leaderId]?.alive ? a.leaderId : a.members.find((m) => s.persons[m]?.alive && !s.persons[m].isPlayer)) : undefined;

// ================================================================ quem trama e contra quem

interface Actor { id: string; key: string; w: number; org?: Org17 }
function npcActors(s: GameState): Actor[] {
  const out: Actor[] = [];
  const strict = histMode(s) === 'strict';
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || !lb.leaderId || (strict && isReal(s, lb.id))) continue;
    const k = `l:${lb.leaderId}`;
    const w = (F(s, k, 'ambicao') + F(s, k, 'coragem') + F(s, k, 'impulsividade') + (100 - F(s, k, 'empatia'))) / 400;
    if (w > 0.52) out.push({ id: lb.id, key: k, w: (w - 0.45) * 2 });
  }
  for (const o of orgs17(s)) if (!(strict && o.real) && (crime17(s).down[o.id] ?? 0) < s.week) out.push({ id: o.key, key: o.key, w: o.power / 200, org: o });
  return out;
}
function pickW<T>(r: Rng, xs: T[], w: (x: T) => number): T | undefined {
  const tot = xs.reduce((t, x) => t + Math.max(0, w(x)), 0);
  if (tot <= 0) return undefined;
  let k = r.float(0, tot);
  for (const x of xs) { k -= Math.max(0, w(x)); if (k <= 0) return x; }
  return xs[xs.length - 1];
}
/** Inimigos de um ator: você (rivalidade/mágoa/vingança) e selos cujo líder ele detesta. */
function enemies(s: GameState, A: Actor): { id: string; w: number; why: L }[] {
  const st = crime17(s);
  const out: { id: string; w: number; why: L }[] = [];
  const griev = holdsOf(s, A.id).has.filter((h) => h.target === 'player' && h.kind === 'grievance' && h.status === 'open').length;
  const riv = s.labels[A.id] ? s.rivalries[A.id] ?? 0 : 0;
  const vend = A.org && (st.vend[A.org.id] ?? 0) > s.week ? 3 : 0;
  const pw = riv / 60 + griev * 1.2 + vend;
  if (pw > 0.6 && playerActs(s).length) out.push({ id: 'player', w: pw, why: vend ? l('vingança', 'revenge') : griev ? l('mágoa', 'grievance') : l('rivalidade', 'rivalry') });
  if (s.labels[A.id]) {
    const L0 = leaderOf(s, A.id);
    for (const lb of Object.values(s.labels)) {
      if (!lb.active || lb.id === A.id) continue;
      const Lb = leaderOf(s, lb.id);
      const rel = L0 && Lb ? L0.rel[Lb.id] ?? 0 : 0;
      if (rel < -25) out.push({ id: lb.id, w: -rel / 60, why: l('desafeto', 'bad blood') });
    }
  } else if (A.org) {
    // orgs: selos ricos da sua praça (extorsão, roubo)
    for (const lb of Object.values(s.labels)) if (lb.active && a3Of(s, lb.city) === A.org.a3 && lb.cash > 0) out.push({ id: lb.id, w: 0.3, why: l('praça deles', 'their turf') });
  }
  return out;
}

const CHOICES: { c: string; w: (s: GameState, k: string, o?: Org17) => number }[] = [
  { c: 'sabotage', w: (s, k) => (F(s, k, 'coragem') + F(s, k, 'impulsividade')) / 100 },
  { c: 'blackmail', w: (s, k) => F(s, k, 'ambicao') / 80 },
  { c: 'wiretap', w: (s, k, o) => (o?.kind === 'gang' ? 0 : F(s, k, 'disciplina') / 110) },
  { c: 'assault', w: (s, k, o) => (F(s, k, 'coragem') * (100 - F(s, k, 'empatia'))) / 9000 + (o && hasRacket(o, 'violence') ? 0.6 : 0) },
  { c: 'bootleg', w: (s, k, o) => (o ? (hasRacket(o, 'bootleg') ? 1.2 : 0) : F(s, k, 'ambicao') / 200) },
  { c: 'steal_relic', w: (_s, _k, o) => (o ? 0.5 : 0.1) },
  { c: 'chart_rig', w: (s, k, o) => (o ? 0 : F(s, k, 'ambicao') / 150) },
  { c: 'murder', w: (s, k, o) => (o && hasRacket(o, 'violence') && F(s, k, 'empatia') < 30 ? 0.12 : 0) },
];

/** Escolhe o alvo concreto conforme o tipo de ação. */
function concrete(s: GameState, c: string, enemy: string, actorId: string, r: Rng, org?: Org17): string | undefined {
  const d = crimeById(c)!;
  const a = bestAct(s, enemy);
  switch (d.tk) {
    case 'person': { const p = leadOf(s, a); return p && !(d.violent && isReal(s, p)) && !(c === 'murder' && a && a.fame < 20) ? p : undefined; }
    case 'act': return a?.id;
    case 'own_act': return bestAct(s, actorId)?.id;
    case 'label': return s.labels[enemy] ? enemy : undefined;
    case 'relic': {
      const near = (x: { id: string; a?: string }) => !org || a3Of(s, crime17(s).rcity[x.id] ?? s.acts[x.a ?? '']?.city ?? '') === org.a3;
      const pool = relics(s).list.filter((x) => (enemy === 'player' ? x.st === 'player' && !x.ln : x.st === 'kept' || x.st === 'museum') && near(x));
      return pool.length ? r.pick(pool).id : undefined;
    }
    default: return undefined;
  }
}

function plotMonth(s: GameState, r: Rng): void {
  const st = crime17(s);
  const actors = npcActors(s);
  const n = (r.chance(0.55) ? 1 : 0) + (r.chance(0.2) ? 1 : 0);
  const flags = s.flags as Record<string, number>;
  for (let i = 0; i < n; i++) {
    const A = pickW(r, actors, (x) => x.w);
    if (!A) return;
    const en = enemies(s, A);
    const E = pickW(r, en, (x) => x.w);
    if (!E) continue;
    const ch = pickW(r, CHOICES.filter((x) => x.c !== 'murder' || s.week - (flags.c17mw ?? -9999) > (E.id === 'player' ? 520 : 260)), (x) => x.w(s, A.key, A.org));
    if (!ch) continue;
    const target = concrete(s, ch.c, E.id, A.id, r, A.org);
    if (!target) continue;
    if (ch.c === 'murder' && (isReal(s, A.id) || isReal(s, target))) continue;
    // conluio: outro selo que gosta do ator e também odeia o alvo
    const partners: string[] = [];
    if (s.labels[A.id]) {
      const L0 = leaderOf(s, A.id);
      const ally = Object.values(s.labels).find((lb) => lb.active && lb.id !== A.id && lb.id !== E.id && (() => { const Lb = leaderOf(s, lb.id); return !!(L0 && Lb && (Lb.rel[L0.id] ?? 0) > 30 && (E.id === 'player' ? (s.rivalries[lb.id] ?? 0) > 30 : (Lb.rel[leaderOf(s, E.id)?.id ?? ''] ?? 0) < -20)); })());
      if (ally && !(histMode(s) === 'strict' && isReal(s, ally.id))) partners.push(ally.id);
      // convite para você: o inimigo deles também é seu rival
      if (E.id !== 'player' && (s.rivalries[E.id] ?? 0) > 40 && (L0?.rel.player ?? 0) > 10 && st.warn.length < 4 && r.chance(0.5)) {
        st.warn.push({ id: `cw${++st.seq}`, actor: A.id, c: ch.c, target, w: s.week, dl: s.week + 4, partners: ['invite'] });
        notify(s, fmtL(l('{a} convida você para um "trabalho" contra {t}. Veja Crime → Planos.', '{a} invites you to a "job" against {t}. See Crime → Plans.'), { a: nameOf17(s, A.id), t: nameOf17(s, target) }), 'event');
        continue;
      }
    }
    const ms = (crimeById(ch.c)?.methods ?? []).filter((m) => !(isReal(s, target) && (m.id === 'fire' || m.sev && m.sev >= 70)));
    const ctx: Ctx17 = { actor: A.id, target, method: ms.length ? r.pick(ms).id : undefined, partners, org: A.org && ch.c !== 'chart_rig' ? A.org.id : undefined };
    if (ctx.method === 'plane' && famOf(s, target) < 30) ctx.method = 'accident';
    if (ch.c === 'murder') flags.c17mw = s.week;
    // contra você: sua segurança pode descobrir antes
    const vsMe = E.id === 'player' || ownerOfTarget(s, target) === 'player';
    if (vsMe) {
      const disc = clamp(0.12 + SEC17[st.sec].def * 1.6 + ((s.flags.securityUntil ?? 0) > s.week ? 0.15 : 0), 0, 0.85);
      if (r.chance(disc)) {
        st.warn.push({ id: `cw${++st.seq}`, actor: A.id, c: ch.c, target, method: ctx.method, w: s.week, dl: s.week + 4, partners, org: ctx.org });
        notify(s, fmtL(l('Sua segurança descobriu: {a} trama "{c}" contra {t}. Decida em Crime → Planos.', 'Your security found out: {a} is plotting "{c}" against {t}. Decide in Crime → Plans.'), { a: nameOf17(s, A.id), c: crimeById(ch.c)!.name, t: nameOf17(s, target) }), 'event');
        continue;
      }
    }
    commitCrime(s, ch.c, ctx, r);
  }
}

// ================================================================ respostas aos planos descobertos / convites

export type WarnReply = 'police' | 'strike' | 'pay' | 'ignore' | 'join' | 'decline';
export const WARN_REPLY: Record<WarnReply, { name: L; hint: L }> = {
  police: { name: l('Avisar a polícia', 'Tip off the police'), hint: l('O plano cai; abre caso contra eles; rivalidade +20.', 'The plot collapses; opens a case on them; rivalry +20.') },
  strike: { name: l('Revidar primeiro', 'Strike first'), hint: l('60% de abortar o plano; você sabota o maior ato deles (custo e risco normais).', '60% to abort the plot; you sabotage their biggest act (normal cost and risk).') },
  pay: { name: l('Pagar para esquecer', 'Pay them off'), hint: l('Custa dinheiro; plano cancelado; eles guardam um favor seu.', 'Costs money; plot cancelled; they keep a favor from you.') },
  ignore: { name: l('Reforçar e esperar', 'Brace and wait'), hint: l('O plano segue, mas avisado você corta 20% da chance deles.', 'The plot goes ahead, but forewarned you cut their odds by 20%.') },
  join: { name: l('Entrar no esquema', 'Join the scheme'), hint: l('Você paga metade, divide o calor e ganha um aliado (e um cúmplice que sabe demais).', 'You pay half, share the heat and gain an ally (and an accomplice who knows too much).') },
  decline: { name: l('Recusar', 'Decline'), hint: l('Nada acontece com você; eles fazem sozinhos.', 'Nothing happens to you; they do it alone.') },
};
export const payOffCost = (s: GameState): number => money(s, 6000);
export function replyWarn(s: GameState, wid: string, how: WarnReply, r: Rng = new Rng(seedState(`c17w|${s.config.seed}|${wid}|${s.week}`))): L {
  const st = crime17(s);
  const w = st.warn.find((x) => x.id === wid);
  if (!w) return l('Já passou.', 'Already over.');
  st.warn = st.warn.filter((x) => x !== w);
  const d = crimeById(w.c)!;
  const ctx: Ctx17 = { actor: w.actor, target: w.target, method: w.method, partners: w.partners.filter((p) => p !== 'invite'), org: w.org };
  const invite = w.partners.includes('invite');
  if (invite) {
    if (how !== 'join') { const res = commitCrime(s, w.c, ctx, r); return typeof res === 'object' && 'ok' in res ? fmtL(l('Você recusou. Eles fizeram sozinhos: {x}', 'You declined. They went alone: {x}'), { x: res.text }) : l('Você recusou.', 'You declined.'); }
    const share = Math.round(money(s, d.cost) / 2);
    if (s.player.cash < share) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `c17join:${wid}`, -share, 'legal', `Sociedade "discreta" (${nameOf17(s, w.actor)})`);
    const res = commitCrime(s, w.c, { ...ctx, dp: 0.06, dpWhy: l('Você entrou como sócio +6%', 'You joined as partner +6%') }, r);
    if (typeof res !== 'object' || !('ok' in res)) return res as L;
    const a3 = a3Of(s, s.config.homeCity);
    addHeat(s, 'player', a3, d.heat * (res.ex ? 1.5 : 0.6));
    if (res.ex) feedCase(s, 'player', a3, 25, d.sev, false);
    grantHold(s, { holder: w.actor, target: 'player', kind: 'secret', strength: 55, proof: 1, months: 120, src: 'crime17', text: fmtL(l('Cúmplice no "{c}"', 'Accomplice in the "{c}"'), { c: d.name }), quiet: true });
    grantHold(s, { holder: 'player', target: w.actor, kind: 'secret', strength: 55, proof: 1, months: 120, src: 'crime17', text: fmtL(l('Cúmplice no "{c}"', 'Accomplice in the "{c}"'), { c: d.name }), quiet: true });
    const L0 = leaderOf(s, w.actor);
    if (L0) L0.rel.player = clamp((L0.rel.player ?? 0) + 20, -100, 100);
    s.rivalries[w.actor] = Math.max(0, (s.rivalries[w.actor] ?? 0) - 15);
    return fmtL(l('Feito em sociedade. {x}{e}', 'Done together. {x}{e}'), { x: res.text, e: res.ex ? l(' E vazou: você também é investigado.', ' And it leaked: you are investigated too.') : '' });
  }
  if (how === 'police') {
    feedCase(s, w.actor, a3Of(s, s.config.homeCity), 40, d.sev, !!w.org);
    if (s.labels[w.actor]) s.rivalries[w.actor] = (s.rivalries[w.actor] ?? 0) + 20;
    if (w.org) crime17(s).org[w.org] = clamp((crime17(s).org[w.org] ?? 0) - 30, -100, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
    emitFact(s, { kind: 'statement', actors: ['player', w.actor], place: s.config.homeCity, severity: 45, visibility: 'public', tags: ['crime'], text: fmtL(l('{c} denuncia plano de {a}; a polícia investiga.', '{c} reports a plot by {a}; police investigate.'), { c: s.config.companyName, a: nameOf17(s, w.actor) }), src: 'crime17' });
    return l('Plano desmontado; eles agora têm um caso nas costas.', 'Plot dismantled; now they have a case on their backs.');
  }
  if (how === 'pay') {
    const c = payOffCost(s);
    if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `c17payoff:${wid}`, -c, 'legal', `Acordo com ${nameOf17(s, w.actor)}`);
    grantHold(s, { holder: w.actor, target: 'player', kind: 'favor', strength: 45, months: 48, src: 'crime17', text: l('Pagou para não ser alvo', 'Paid not to be a target'), quiet: true });
    if (s.labels[w.actor]) s.rivalries[w.actor] = Math.max(0, (s.rivalries[w.actor] ?? 0) - 10);
    return l('Pago. Eles recuam — e lembram que você paga.', 'Paid. They back off — and remember that you pay.');
  }
  if (how === 'strike') {
    const tgt = bestAct(s, w.actor);
    let x: L = l('', '');
    if (tgt) { const res = commitCrime(s, 'sabotage', { actor: 'player', target: tgt.id, method: 'release', partners: [] }, r); x = typeof res === 'object' && 'ok' in res ? res.text : (res as L); }
    if (r.chance(0.6)) return fmtL(l('Você revidou primeiro e o plano deles morreu. {x}', 'You struck first and their plot died. {x}'), { x });
    const res = commitCrime(s, w.c, { ...ctx, dp: -0.2, dpWhy: l('Alvo avisado −20%', 'Target forewarned −20%') }, r);
    return fmtL(l('Você revidou, mas eles seguiram: {y} {x}', 'You struck back, but they went ahead: {y} {x}'), { x, y: typeof res === 'object' && 'ok' in res ? res.text : '' });
  }
  const res = commitCrime(s, w.c, { ...ctx, dp: -0.2, dpWhy: l('Alvo avisado −20%', 'Target forewarned −20%') }, r);
  return typeof res === 'object' && 'ok' in res ? res.text : (res as L);
}

// ================================================================ laços de rua e rixas sangrentas

export const tieOf = (s: GameState, actId: string): Org17 | undefined => { const o = crime17(s).ties[actId]; return o ? orgById(s, o) : undefined; };
export function tieAct(s: GameState, actId: string, oid: string): L {
  const st = crime17(s);
  const a = s.acts[actId], o = orgById(s, oid);
  if (!a || !o) return l('Inválido.', 'Invalid.');
  if (!STREET(a.genre)) return l('Só artistas de rua (rap, funk, corridos…) ganham credibilidade com isso.', 'Only street artists (rap, funk, corridos…) gain credibility from this.');
  st.ties[actId] = o.id;
  addHeat(s, 'player', o.a3, 6);
  grantHold(s, { holder: o.key, target: actId, kind: 'loyalty', strength: 50, months: 120, src: 'crime17', text: l('Protegido da organização', 'Under the organization\'s protection'), quiet: true });
  emitFact(s, { kind: 'tie', actors: [actId, o.key], place: a.city, severity: 40, visibility: 'rumor', tags: ['crime', 'street'], text: fmtL(l('{a} agora anda com gente de {o}.', '{a} now runs with {o} people.'), { a: a.name, o: o.name }), src: 'crime17' });
  return fmtL(l('{a} ganha proteção e "credibilidade de rua" (+5% de apelo) — e entra nas rixas de {o}.', '{a} gains protection and "street cred" (+5% appeal) — and enters {o}\'s feuds.'), { a: a.name, o: o.name });
}
export function cutTie(s: GameState, actId: string): L {
  const st = crime17(s);
  const o = tieOf(s, actId);
  if (!o) return l('Sem laços.', 'No ties.');
  delete st.ties[actId];
  for (const k of Object.keys(st.feud)) if (k.split('|').includes(actId)) delete st.feud[k];
  grantHold(s, { holder: o.key, target: actId, kind: 'grievance', strength: 55, months: 60, src: 'crime17', text: l('Virou as costas para a quebrada', 'Turned his back on the hood'), quiet: true });
  return fmtL(l('{a} corta os laços com {o}. Eles não esquecem.', '{a} cuts ties with {o}. They don\'t forget.'), { a: s.acts[actId]?.name ?? '?', o: o.name });
}
export const truceCost = (s: GameState): number => money(s, 9000);
export function truce(s: GameState, key: string): L {
  const st = crime17(s);
  if (st.feud[key] === undefined) return l('Sem rixa.', 'No feud.');
  const c = truceCost(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `c17truce:${key}`, -c, 'legal', 'Trégua mediada');
  st.feud[key] = Math.max(0, st.feud[key] - 45);
  return l('Encontro num território neutro: a rixa esfria (−45).', 'A sit-down on neutral ground: the feud cools (−45).');
}
const rivalOrgs = (a: Org17, b: Org17): boolean => a.id !== b.id && (a.kind === 'gang' || a.kind === 'cartel' || a.kind === 'firm') && (b.kind === 'gang' || b.kind === 'cartel' || b.kind === 'firm');

function streetMonth(s: GameState, r: Rng): void {
  const st = crime17(s);
  const strict = histMode(s) === 'strict';
  const gangs = orgs17(s).filter((o) => o.kind === 'gang' || o.kind === 'cartel' || o.kind === 'firm');
  if (!gangs.length) return;
  // novos laços (só fictícios; nos modos livres, atos reais só como boato)
  for (const a of Object.values(s.acts)) {
    if (!live(a) || st.ties[a.id] || !STREET(a.genre) || a.owner === 'player' || a.playerBand || a.fame < 8) continue;
    if (a.catalogNo && strict) continue;
    const near = gangs.filter((o) => o.a3 === a3Of(s, a.city));
    if (!near.length || !r.chance(a.catalogNo ? 0.004 : 0.03)) continue;
    const o = r.pick(near);
    st.ties[a.id] = o.id;
    emitFact(s, { kind: 'tie', actors: [a.id, o.key], place: a.city, severity: 35, visibility: 'rumor', tags: ['crime', 'street', 'rumor'], text: fmtL(a.catalogNo ? l('Boato: {a} visto com gente de {o}.', 'Rumor: {a} seen with {o} people.') : l('{a} anda com gente de {o}.', '{a} runs with {o} people.'), { a: a.name, o: o.name }), src: 'crime17' });
  }
  // rixas: atos ligados a organizações rivais no mesmo país (ou ambos famosos)
  const tied = Object.entries(st.ties).map(([id, o]) => [s.acts[id], orgById(s, o)] as const).filter(([a, o]) => live(a) && o) as [Act, Org17][];
  for (let i = 0; i < tied.length; i++) for (let j = i + 1; j < tied.length; j++) {
    const [a, oa] = tied[i], [b, ob] = tied[j];
    if (!rivalOrgs(oa, ob) || (oa.a3 !== ob.a3 && (a.fame < 30 || b.fame < 30))) continue;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    const prev = st.feud[key] ?? 0;
    const cur = clamp(prev + r.int(1, 6) + (a.fame + b.fame) / 60, 0, 100);
    st.feud[key] = cur;
    const both = `${a.name} × ${b.name}`;
    const mine = [a, b].some((x) => x.owner === 'player' || x.playerBand);
    if (prev < 25 && cur >= 25) {
      for (const x of [a, b]) { x.momentum = clamp(x.momentum + 6, 0, 100); x.fame = clamp(x.fame + 0.5, 0, 100); }
      emitFact(s, { kind: 'feud', actors: [a.id, b.id], place: a.city, severity: 45, visibility: 'public', tags: ['street', 'feud'], text: fmtL(l('Rixa: {x} trocam faixas de ataque (diss) — o público adora.', 'Feud: {x} trade diss tracks — the public loves it.'), { x: both }), src: 'crime17' });
      if (mine) notify(s, fmtL(l('Rixa começou: {x}. Dá vendas… e pode sangrar. Veja Crime → Organizações.', 'A feud started: {x}. It sells… and it can bleed. See Crime → Organizations.'), { x: both }), 'event');
    } else if (prev < 55 && cur >= 55) {
      const [atk, vic, o] = r.chance(0.5) ? [a, b, oa] : [b, a, ob];
      const p = leadOf(s, vic), hot = leadOf(s, atk);
      // o próprio artista (fictício) parte para a briga com a gangue atrás: pode acabar preso
      const doer = hot && !isReal(s, hot) && !(atk.owner === 'player' || atk.playerBand) ? hot : o.key;
      if (p && !isReal(s, p)) commitCrime(s, 'assault', { actor: doer, target: p, partners: [], org: o.id }, r);
      emitFact(s, { kind: 'feud', actors: [atk.id, vic.id], place: vic.city, severity: 55, visibility: 'public', tags: ['street', 'feud', 'bad'], text: fmtL(l('Briga generalizada entre as equipes de {x} depois de um show.', 'A brawl between {x}\'s crews after a show.'), { x: both }), src: 'crime17' });
    } else if (prev < 85 && cur >= 85) {
      const [vic, o] = r.chance(0.5) ? [b, oa] : [a, ob];
      const p = leadOf(s, vic);
      const fictional = !a.catalogNo && !b.catalogNo && p && !isReal(s, p);
      if (fictional && p) commitCrime(s, 'murder', { actor: o.key, target: p, method: 'accident', partners: [], org: o.id, dp: -0.15, dpWhy: l('Tiroteio, não emboscada perfeita −15%', 'A shootout, not a perfect ambush −15%') }, r);
      else emitFact(s, { kind: 'feud', actors: [a.id, b.id], place: vic.city, severity: 50, visibility: 'rumor', tags: ['street', 'feud', 'rumor'], text: fmtL(l('Boato: a rixa {x} teria passado dos limites; ninguém confirma.', 'Rumor: the {x} feud allegedly crossed the line; nobody confirms.'), { x: both }), src: 'crime17' });
      st.feud[key] = 30;
    } else if (cur === prev) st.feud[key] = Math.max(0, cur - 2);
  }
  for (const k of Object.keys(st.feud)) if (k.split('|').some((id) => !live(s.acts[id]))) delete st.feud[k];
}

// credibilidade de rua para atos ligados
registerMod('appeal', 'crime17tie', (s, v, { release }) => {
  if (!release || s.week - release.week > 2) return null;
  const a = s.acts[release.actId];
  return a && crime17(s).ties[a.id] && STREET(a.genre) ? { value: v * 1.05, label: l('Credibilidade de rua', 'Street credibility') } : null;
});

// ================================================================ situações do diretor

const homeOrgs = (s: GameState, r: string): Org17[] => { const a3 = a3Of(s, s.config.homeCity); return orgs17(s).filter((o) => o.a3 === a3 && o.rackets.includes(r as never)); };
registerSituation({
  id: 'crime17_pizzo', pressure: 'law', cost: 2, cooldown: 30, playerOnly: true,
  when: (s) => playerActs(s).length > 0 && homeOrgs(s, 'protection').some((o) => crime17(s).pizzo[o.id] === undefined && (crime17(s).vend[o.id] ?? 0) < s.week),
  actorsPick: (s, _c, r) => { const os = homeOrgs(s, 'protection').filter((o) => crime17(s).pizzo[o.id] === undefined); return os.length ? { hero: 'player', cast: { org: r.pick(os).key }, data: {} } : null; },
  title: (s, c) => fmtL(l('{o} quer "taxa de proteção"', '{o} wants "protection money"'), { o: orgById(s, c.cast.org)?.name ?? '?' }),
  text: (s, c) => { const o = orgById(s, c.cast.org)!; return fmtL(l('Um homem de {b} aparece no escritório: seus shows na cidade "precisam de segurança". {v} por mês.', 'A man from {b} shows up at the office: your shows in town "need security". {v} a month.'), { b: bossName(o), v: usd(pizzoFee(s, o)) }); },
  options: [
    { id: 'report', label: l('Denunciar à polícia', 'Report to the police'), hint: l('Reputação +3, abre caso contra eles; vingança provável por 18 meses.', 'Reputation +3, opens a case on them; likely revenge for 18 months.'), weightByTraits: (P) => (P?.facets.coragem ?? 50) / 50,
      apply: (s, c) => reportOrg(s, c.cast.org) },
    { id: 'refuse', label: l('Recusar', 'Refuse'), hint: l('Por 6 meses, ~30%/mês de show depredado (segurança reduz).', 'For 6 months, ~30%/month chance of a trashed show (security reduces).'), weightByTraits: (P) => (P?.facets.teimosia ?? 50) / 50,
      apply: (s, c) => { const st = crime17(s); const o = orgById(s, c.cast.org)!; st.pizzo[o.id] = -s.week; st.org[o.id] = clamp((st.org[o.id] ?? 0) - 15, -100, 100); grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 40, months: 24, src: 'crime17', text: l('Recusou a proteção', 'Refused protection'), quiet: true }); } },
    { id: 'pay', label: l('Pagar', 'Pay'), hint: l('Taxa mensal; relação com eles sobe; calor leve.', 'Monthly fee; relationship rises; light heat.'), weightByTraits: (P) => (P?.facets.ansiedade ?? 50) / 50,
      apply: (s, c) => { const o = orgById(s, c.cast.org)!; crime17(s).pizzo[o.id] = s.week; addHeat(s, 'player', o.a3, 3); } },
  ],
});
registerSituation({
  id: 'crime17_launder', pressure: 'money', cost: 2, cooldown: 36, playerOnly: true,
  when: (s) => homeOrgs(s, 'laundering').some((o) => !crime17(s).laund[o.id] && (crime17(s).org[o.id] ?? 0) > -20) && (s.player.cash < money(s, 20000) || (crime17(s).org[homeOrgs(s, 'laundering')[0]?.id ?? ''] ?? 0) > 20),
  actorsPick: (s, _c, r) => { const os = homeOrgs(s, 'laundering').filter((o) => !crime17(s).laund[o.id]); return os.length ? { hero: 'player', cast: { org: r.pick(os).key }, data: {} } : null; },
  title: (s, c) => fmtL(l('Uma proposta de {o}', 'An offer from {o}'), { o: orgById(s, c.cast.org)?.name ?? '?' }),
  text: (s, c) => { const o = orgById(s, c.cast.org)!; return fmtL(l('{b} quer "investir" no seu selo: notas de shows fantasmas e prensagens que nunca existiram. {v} por mês para você.', '{b} wants to "invest" in your label: invoices for ghost shows and pressings that never existed. {v} a month for you.'), { b: bossName(o), v: usd(launderFee(s, o)) }); },
  options: [
    { id: 'accept', label: l('Aceitar', 'Accept'), hint: l('Renda mensal; calor +3/mês; eles passam a ter um segredo provado seu; casos viram crime organizado.', 'Monthly income; heat +3/month; they hold a proven secret on you; cases become organized crime.'), apply: (s, c) => toggleLaunder(s, c.cast.org) },
    { id: 'refuse', label: l('Recusar com educação', 'Politely decline'), hint: l('Nada muda; relação −5.', 'Nothing changes; relationship −5.'), apply: (s, c) => { const o = orgById(s, c.cast.org)!; crime17(s).org[o.id] = clamp((crime17(s).org[o.id] ?? 0) - 5, -100, 100); } },
  ],
});
registerSituation({
  id: 'crime17_jail', pressure: 'law', cost: 1, cooldown: 2, trigger: ['arrest'],
  when: (s, c) => !!c.fact?.tags.includes('jail') && !!s.persons[c.fact.actors[0]]?.alive,
  actorsPick: (s, c) => ({ hero: c.fact!.actors[0], act: c.fact!.actors[1], cast: { person: c.fact!.actors[0] }, data: {}, fact: c.fact }),
  title: (s, c) => fmtL(l('{p} atrás das grades', '{p} behind bars'), { p: s.persons[c.hero]?.name ?? '?' }),
  text: (s, c) => fmtL(l('{p} cumpre pena. A carreira para — ou não? 2Pac chegou ao nº 1 com "Me Against the World" de dentro da prisão.', '{p} is serving time. Does the career stop — or not? 2Pac hit No. 1 with "Me Against the World" from inside prison.'), { p: s.persons[c.hero]?.name ?? '?' }),
  options: [
    { id: 'album', label: l('Lançar disco de dentro', 'Release a record from inside'), hint: l('Gênero de rua: +18% de apelo no lançamento; outros: −8%. Estresse −10.', 'Street genre: +18% release appeal; others: −8%. Stress −10.'), weightByTraits: (P) => (P?.facets.ambicao ?? 50) / 40,
      apply: (s, c) => { const j = crime17(s).jail[c.hero]; if (j) j.album = 1; addStress(s, c.hero, -10, l('Compondo na cela', 'Writing in the cell')); const a = c.act ? s.acts[c.act] : undefined; if (a) a.momentum = clamp(a.momentum + 10, 0, 100); } },
    { id: 'gang', label: l('Entrar para uma facção', 'Join a prison gang'), hint: l('Proteção (estresse −15) e laço com uma gangue: credibilidade e rixas.', 'Protection (stress −15) and a gang tie: credibility and feuds.'), weightByTraits: (P) => ((P?.facets.coragem ?? 50) + (100 - (P?.facets.empatia ?? 50))) / 90,
      apply: (s, c) => { const j = crime17(s).jail[c.hero]; const g = orgs17(s).find((o) => (o.kind === 'gang' || o.kind === 'cartel') && o.a3 === j?.a3) ?? orgs17(s).find((o) => o.kind === 'gang'); addStress(s, c.hero, -15, l('Protegido na cadeia', 'Protected inside')); if (g && c.act && s.acts[c.act]) crime17(s).ties[c.act] = g.id; } },
    { id: 'behave', label: l('Bom comportamento', 'Good behavior'), hint: l('Pena −30%; sai mais cedo e mais calmo(a).', 'Sentence −30%; gets out earlier and calmer.'), weightByTraits: (P) => (P?.facets.disciplina ?? 50) / 45,
      apply: (s, c) => { const j = crime17(s).jail[c.hero]; if (j) j.u = s.week + Math.round((j.u - s.week) * 0.7); addStress(s, c.hero, -5, l('Rotina na cadeia', 'Prison routine')); } },
  ],
});

// ================================================================ ligações (audit #24): jabá/fraude exposto vira caso

onFact('scandal', (s, f) => {
  if (!f.tags.some((t) => t === 'mem:payola' || t === 'mem:payola9' || t === 'mem:chart_rig')) return;
  if (f.actors.length && !f.actors.some((a) => a === 'player' || s.acts[a]?.owner === 'player')) return;
  feedCase(s, 'player', a3Of(s, s.config.homeCity), 30, 45, hasRacketHome(s));
}, 'crime17:payola');
onFact('secret_exposed', (s, f) => { if (f.tags.includes('mem:spy_exposed')) addHeat(s, 'player', a3Of(s, s.config.homeCity), 12); }, 'crime17:spy');
const hasRacketHome = (s: GameState): boolean => Object.keys(crime17(s).laund).length > 0;

// ================================================================ gancho mensal

registerSimHook('month', 'crime17npc', (s) => {
  const r = new Rng(seedState(`crime17npc|${s.config.seed}|${mIdx(s)}`));
  const st = crime17(s);
  // avisos vencidos: o plano segue (você foi avisado), convites expiram
  for (const w of st.warn.slice()) if (w.dl <= s.week) replyWarn(s, w.id, w.partners.includes('invite') ? 'decline' : 'ignore', r);
  plotMonth(s, r);
  streetMonth(s, r);
  // presos: show do ato perde receita (mod); sem divulgação ao vivo
  for (const a of playerActs(s).map((id) => s.acts[id])) if (live(a) && jailedIn(s, a).length) a.momentum = clamp(a.momentum - 1, 0, 100);
});

export const _crimenpc17 = { npcActors, enemies, plotMonth, streetMonth, countryName };
export type { Warn17 };
