// Rodada 19 (Frente 7, M17) — SEGURO DE PESSOA-CHAVE E PLANO DE SAÚDE (`insure19`). Complementa o seguro patrimonial
// do links19b (prédios). Pessoa-chave: o selo segura a estrela de um ato (prêmio mensal pela idade, estresse, saúde e
// época; cobertura em 3 faixas). Morte → indenização integral; colapso/internação/doença (fatos breakdown, health,
// rehab de gravidade 40+) → 20% (no máximo 1 por ano) e o prêmio sobe. Fato `keyman_claim` → herdeiros do espólio
// (post18) se ressentem de o selo "lucrar com a morte" (união cai, legado de quem cuida também), prêmio reajustado.
// Plano de saúde do elenco e da equipe: custo por pessoa pelo mercado de casa (saúde pública na Europa 1948+, Japão 1961+,
// Brasil 1988+; privada cara nos EUA, mais cara depois de 2000) → estresse do elenco −1/mês, recuperação de esgotamento,
// confiança dos atos, lealdade da equipe e +2% de aceitação nas propostas a artistas.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { homeMarket } from '../economy';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { pushInbox18, registerInboxKind, registerAdvisorTip } from '../inbox18';
import { addStress } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { headline19 } from './factlink19';
import { cnt19, link19, log19, mineA19, usd19, xs19, type Log19 } from './mkb19';
import { P } from './people/state';
import { post18 } from './post18';
import { schedule18 } from './decide18';

export interface Pol19 { act: string; pid: string; tier: 1 | 2 | 3; cover: number; prem: number; since: number; claims: number; lastIll: number; paid: number }
export interface Ins19 extends Log19 { pol: Pol19[]; plan: boolean; planSince: number; planPaid: number; out: number }
declare module '../ext4' { interface Ext4 { insure19: Ins19 } }
const fresh = (): Ins19 => ({ pol: [], plan: false, planSince: 0, planPaid: 0, out: 0, log: [], n: {} });
registerExt4('insure19', fresh);
export const ins19 = (s: GameState): Ins19 => xs19(s, 'insure19', fresh);
export const KEYMAN_FROM19 = 1920;
/** Pessoa-chave do ato: voz principal viva (ou o primeiro integrante vivo). */
export const keyPerson19 = (s: GameState, a: Act): Person | undefined => {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive);
  return ms.find((p) => p.role === 'vocal' || p.role === 'mc') ?? ms[0];
};
export const cover19 = (s: GameState, a: Act, tier: 1 | 2 | 3) => money(s, (15000 + a.fame * 1200) * tier);
/** Prêmio mensal, com o porquê. */
export function premium19(s: GameState, a: Act, tier: 1 | 2 | 3, claims = 0): { v: number; why: WhyPart[] } {
  const p = keyPerson19(s, a);
  const age = p ? s.year - p.born : 30;
  const why: WhyPart[] = [{ label: fmtL(l('Taxa base sobre a cobertura de {c}', 'Base rate on the {c} cover'), { c: usd19(cover19(s, a, tier)) }), value: 0.012, fmt: 'pct' }];
  if (age > 35) why.push({ label: fmtL(l('Idade ({a})', 'Age ({a})'), { a: age }), value: (age - 35) / 1500, fmt: 'pct', tone: 'bad' });
  if (p && p.stress > 40) why.push({ label: fmtL(l('Estresse ({s})', 'Stress ({s})'), { s: Math.round(p.stress) }), value: (p.stress - 40) / 2500, fmt: 'pct', tone: 'bad' });
  if (p && p.health !== 'ok') why.push({ label: fmtL(l('Saúde: {h}', 'Health: {h}'), { h: p.health }), value: p.health === 'addiction' ? 0.02 : 0.01, fmt: 'pct', tone: 'bad' });
  if (claims) why.push({ label: fmtL(l('Sinistros anteriores ({n})', 'Previous claims ({n})'), { n: claims }), value: claims * 0.004, fmt: 'pct', tone: 'bad' });
  if (s.year < 1950) why.push({ label: l('Mercado de seguros pequeno (antes de 1950)', 'Small insurance market (before 1950)'), value: 0.004, fmt: 'pct', tone: 'bad' });
  const rate = why.reduce((t, x) => t + Number(x.value ?? 0), 0);
  return { v: Math.round(cover19(s, a, tier) * rate / 12), why };
}
export function insureKey19(s: GameState, actId: string, tier: 1 | 2 | 3 | 0): L | null {
  const a = s.acts[actId], st = ins19(s);
  if (!a || !mineA19(a)) return l('Ato inválido.', 'Invalid act.');
  const i = st.pol.findIndex((x) => x.act === actId);
  if (!tier) { if (i >= 0) st.pol.splice(i, 1); return null; }
  if (s.year < KEYMAN_FROM19) return l('Seguro de pessoa-chave surge nos anos 1920.', 'Key-person cover appears in the 1920s.');
  const p = keyPerson19(s, a);
  if (!p) return l('Ninguém vivo para segurar.', 'Nobody alive to insure.');
  const old = i >= 0 ? st.pol[i] : undefined;
  const x: Pol19 = { act: actId, pid: p.id, tier, cover: cover19(s, a, tier), prem: premium19(s, a, tier, old?.claims ?? 0).v, since: old?.since ?? s.week, claims: old?.claims ?? 0, lastIll: old?.lastIll ?? -999, paid: old?.paid ?? 0 };
  if (i >= 0) st.pol[i] = x; else st.pol.push(x);
  cnt19(st, 'policy');
  if (!old) schedule18(s, 'ins19:key', { act: actId, person: p.id }, fmtL(l('Seguro de {p}', '{p} cover'), { p: p.name }), l('Segurar a pessoa-chave', 'Insure the key person'));
  log19(s, st, fmtL(l('Seguro de pessoa-chave: {p} ({a}), cobertura {c}, {v}/mês.', 'Key-person cover: {p} ({a}), {c} cover, {v}/month.'), { p: p.name, a: a.name, c: usd19(x.cover), v: usd19(x.prem) }));
  return null;
}
/** Custo do plano por pessoa/mês pelo sistema de saúde do mercado de casa, com o porquê. */
export function planCost19(s: GameState): { v: number; n: number; why: WhyPart[] } {
  const mk = homeMarket(s), y = s.year;
  const pub = (mk === 'eu' && y >= 1948) || (mk === 'asia' && y >= 1961) || (mk === 'br' && y >= 1988);
  const per = pub ? 25 : mk === 'na' ? (y >= 2000 ? 220 : 120) : 60;
  const ids = new Set<string>([...playerActs(s).flatMap((id) => s.acts[id]?.members ?? []), ...s.player.staff.map((m) => m.id)]);
  const n = ids.size;
  const why: WhyPart[] = [
    { label: pub ? l('Saúde pública no mercado de casa: plano só complementa', 'Public healthcare at home: the plan only tops up') : mk === 'na' ? l('Saúde privada (EUA): plano caro', 'Private healthcare (US): an expensive plan') : l('Sistema misto', 'Mixed system'), value: money(s, per), fmt: 'money' },
    { label: l('Pessoas cobertas (elenco + equipe)', 'People covered (roster + staff)'), value: n, fmt: 'num' },
  ];
  return { v: money(s, per) * n, n, why };
}
export function setPlan19(s: GameState, on: boolean): L | null {
  const st = ins19(s);
  if (on && s.year < 1930) return l('Planos de saúde coletivos surgem nos anos 1930.', 'Group health plans appear in the 1930s.');
  if (on && !st.plan) schedule18(s, 'ins19:plan', {}, l('Plano de saúde', 'Health plan'), l('Dar plano ao elenco e à equipe', 'Give roster and staff a plan'));
  st.plan = on; if (on) st.planSince = s.week;
  cnt19(st, on ? 'plan_on' : 'plan_off');
  log19(s, st, on ? l('Plano de saúde para elenco e equipe.', 'Health plan for roster and staff.') : l('Plano de saúde cancelado.', 'Health plan cancelled.'));
  return null;
}
registerConseq18('ins19:key', { now: l('Prêmio mensal; paga se a estrela morre ou adoece.', 'Monthly premium; pays if the star dies or falls ill.'), later: [{ in: [4, 12], p: 0.2, tone: 'mixed', hint: l('O artista pode descobrir que vale mais morto.', 'The artist may find out they are worth more dead.'),
  fx: (f) => (f.r.chance(0.5) ? (f.trust(-3), l('O artista descobre a apólice e fica desconfortável: "vocês apostam na minha morte?".', 'The artist finds the policy and is uneasy: "you are betting on my death?".')) : (f.mood('stress', -4), l('A seguradora exige exames e um médico: o artista se cuida mais.', 'The insurer demands check-ups and a doctor: the artist takes better care.'))) }] });
registerConseq18('ins19:plan', { now: l('Custo por pessoa; estresse e confiança melhoram.', 'Cost per head; stress and trust improve.'), later: [{ in: [3, 9], p: 0.3, tone: 'good', hint: l('Gente cuidada fala bem de quem cuida.', 'Cared-for people speak well of who cares.'),
  fx: (f) => (f.rep('artists', 1), l('Artistas comentam que o selo paga o médico de todo mundo: vira argumento nas negociações.', 'Artists mention the label pays everyone\'s doctor: it becomes a bargaining point.')) }] });
registerOfferMod('insure19:plan', (s, act) => (act.owner !== 'player' && ins19(s).plan ? { delta: 0.02, reason: l('O selo dá plano de saúde.', 'The label provides health cover.') } : null));

function claim(s: GameState, x: Pol19, f: Fact | null, death: boolean): void {
  const st = ins19(s), a = s.acts[x.act], p = s.persons[x.pid];
  const pay = death ? x.cover : Math.round(x.cover * 0.2);
  post(s, `ins19:${x.act}:${s.week}`, pay, 'other_income', `Seguro de pessoa-chave: ${p?.name ?? '?'}`);
  x.paid += pay; x.claims++;
  st.out += pay;
  cnt19(st, death ? 'death' : 'ill');
  const tx = fmtL(death ? l('Seguradora paga {v} a {c} pela morte de {p}.', 'Insurer pays {c} {v} for the death of {p}.') : l('Seguradora cobre {v} dos shows cancelados de {a} ({p}).', 'Insurer covers {v} of {a}\'s cancelled shows ({p}).'), { v: usd19(pay), c: s.config.companyName, p: p?.name ?? '?', a: a?.name ?? '?' });
  log19(s, st, tx);
  emitFact(s, { kind: 'keyman_claim', actors: ['player', x.pid, x.act], severity: death ? 40 : 20, visibility: death && (a?.fame ?? 0) >= 40 ? 'public' : 'rumor', tags: ['insure19', death ? 'death' : 'illness'], text: tx, src: 'insure19', data: { act: x.act, pay }, ...(f ? { cause: [f.id] } : {}) });
}
// morte: integral; colapso/doença/internação: 20% (1 por ano)
const dead = (s: GameState, x: Pol19) => !!s.persons[x.pid] && !s.persons[x.pid].alive;
onFact('death', (s, f) => { const st = ins19(s); for (const x of st.pol.slice()) if ((f.actors.includes(x.pid) || f.actors.includes(x.act)) && dead(s, x)) { claim(s, x, f, true); st.pol.splice(st.pol.indexOf(x), 1); } }, 'insure19:death');
for (const k of ['breakdown', 'health', 'rehab']) onFact(k, (s, f) => {
  if (f.severity < 35) return;
  for (const x of ins19(s).pol) if (f.actors.includes(x.pid) && x.lastIll < s.week - 52) { x.lastIll = s.week; claim(s, x, f, false); }
}, `insure19:${k}`);
// sinistro: prêmio sobe; na morte, herdeiros (post18) se ressentem do selo que "lucrou"
onFact('keyman_claim', (s, f) => {
  const x = ins19(s).pol.find((y) => y.pid === f.actors[1]);
  if (x) { const a = s.acts[x.act]; if (a) x.prem = Math.round(premium19(s, a, x.tier, x.claims).v * 1.1); }
  if (!f.tags.includes('death')) return;
  const e = post18(s).est[f.actors[1]];
  if (e) { e.unity = clamp(e.unity - 6, 0, 100); e.dispute = clamp((e.dispute ?? 0) + 8, 0, 100); }
  for (const h of e?.heirs ?? []) { const hp = h.pid ? s.persons[h.pid] : undefined; if (hp) hp.rel.player = clamp((hp.rel.player ?? 0) - 15, -100, 100); }
  if (f.visibility === 'public') headline19(s, f.text, 1);
  link19(s, 'insure', l('Indenização paga: os herdeiros acham que o selo lucrou com a morte (união do espólio −6).', 'Payout made: the heirs feel the label profited from the death (estate unity −6).'));
}, 'insure19:heirs');

export function insureMonth19(s: GameState): void {
  const st = ins19(s);
  for (const x of st.pol.slice()) if (dead(s, x)) { claim(s, x, null, true); st.pol.splice(st.pol.indexOf(x), 1); }
  let bill = 0;
  for (const x of st.pol) { const a = s.acts[x.act]; if (!a || !mineA19(a)) { x.prem = 0; continue; } bill += x.prem; }
  st.pol = st.pol.filter((x) => x.prem > 0);
  if (bill) post(s, `ins19p:${s.year}-${s.month}`, -bill, 'insurance', 'Seguros de pessoa-chave');
  if (!st.plan) return;
  const c = planCost19(s);
  if (c.v) { post(s, `ins19h:${s.year}-${s.month}`, -c.v, 'benefits', 'Plano de saúde (elenco e equipe)'); st.planPaid += c.v; }
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a) continue;
    if (a.trust < 80) a.trust = clamp(a.trust + 0.3, 0, 100);
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p?.alive) continue;
      addStress(s, pid, -1);
      if ((p.health === 'burnout' || p.health === 'ill') && (s.week + pid.length) % 6 === 0) p.health = 'recovering';
    }
  }
  for (const m of s.player.staff) { const cr = P(s).career[m.id]; if (cr && cr.loyalty < 75) cr.loyalty = clamp(cr.loyalty + 0.3, 0, 100); }
}
registerSimHook('month', 'insure19', (s) => insureMonth19(s));

// estrela em risco sem seguro → conselheiro e Caixa (uma vez por ato)
registerAdvisorTip('insure19', (s) => {
  if (s.year < KEYMAN_FROM19) return [];
  const st = ins19(s);
  const a = playerActs(s).map((id) => s.acts[id]).filter((x): x is Act => !!x && x.fame >= 45 && !x.playerBand && !st.pol.some((p) => p.act === x.id)).sort((p, q) => q.fame - p.fame)[0];
  if (!a) return [];
  const pr = premium19(s, a, 1).v;
  return [{ id: 'ins19-key', level: 'info', cat: 'cash', score: 28, text: fmtL(l('{a} é a sua estrela e não tem seguro de pessoa-chave.', '{a} is your star and has no key-person cover.'), { a: a.name }),
    why: [l('Se a estrela morre ou adoece, a receita some de uma vez.', 'If the star dies or falls ill, revenue vanishes at once.')], effect: fmtL(l('Prêmio de {v}/mês; cobertura {c}.', '{v}/month premium; {c} cover.'), { v: usd19(pr), c: usd19(cover19(s, a, 1)) }),
    run: { label: l('Segurar', 'Insure'), fn: (s2) => insureKey19(s2, a.id, 1) ?? l('Seguro contratado.', 'Cover bought.') } }];
});
registerInboxKind('ins19_risk', { label: l('Seguro', 'Insurance'), cat: 'money', icon: 'shield', prio: 1, goto: () => ({ area: 'firm19' }),
  handle: (s, m, act) => (act === 'buy' ? insureKey19(s, String(m.ref?.act), 2) ?? l('Seguro contratado (faixa 2).', 'Cover bought (tier 2).') : l('Sem seguro, por enquanto.', 'No cover, for now.')) });
// colapso de um astro sem seguro → oferta da seguradora
onFact('breakdown', (s, f) => {
  const a = s.acts[f.actors[1] ?? ''];
  if (!a || !mineA19(a) || a.fame < 35 || ins19(s).pol.some((x) => x.act === a.id) || s.year < KEYMAN_FROM19) return;
  pushInbox18(s, 'ins19_risk', { from: l('Corretora de seguros', 'Insurance broker').pt, tone: 'info', subject: fmtL(l('{a}: e se tivesse sido pior?', '{a}: what if it had been worse?'), { a: a.name }),
    body: fmtL(l('Depois do colapso, a corretora oferece seguro de pessoa-chave: cobertura de {c} por {v}/mês (o estresse encarece).', 'After the breakdown, the broker offers key-person cover: {c} for {v}/month (stress makes it pricier).'), { c: usd19(cover19(s, a, 2)), v: usd19(premium19(s, a, 2).v) }),
    ref: { act: a.id }, actions: [{ id: 'buy', label: l('Contratar', 'Buy') }, { id: 'no', label: l('Agora não', 'Not now') }], weeks: 6 });
}, 'insure19:offer');

registerDeadline('insure19', (s, from, to) => {
  const st = ins19(s);
  if (!st.plan && !st.pol.length) return [];
  const w = Math.ceil(from / 52) * 52 + 1;
  return w <= to ? [{ id: `insure19-renew-${w}`, w, kind: 'money' as const, t: l('Renovação anual dos seguros e do plano de saúde', 'Yearly renewal of insurance and the health plan'), tone: 'info' as const, goto: { area: 'firm19' } }] : [];
});
registerExplain('ins19.prem', (s, c) => {
  const x = ins19(s).pol.find((y) => y.act === String(c.act ?? '')), a = x && s.acts[x.act];
  if (!x || !a) return null;
  return { title: fmtL(l('Prêmio do seguro de {a}', '{a}\'s insurance premium'), { a: a.name }), value: x.prem, fmt: 'money', parts: premium19(s, a, x.tier, x.claims).why, note: l('Morte: cobertura integral. Colapso/doença/internação (gravidade 35+): 20%, no máximo uma vez por ano.', 'Death: full cover. Breakdown/illness/rehab (severity 35+): 20%, at most once a year.') };
});
registerExplain('ins19.plan', (s) => { const c = planCost19(s); return { title: l('Plano de saúde', 'Health plan'), value: c.v, fmt: 'money', parts: c.why, note: l('Estresse do elenco −1/mês, esgotados se recuperam, confiança dos atos e lealdade da equipe sobem; propostas a artistas +2%.', 'Roster stress −1/month, burnt-out people recover, act trust and staff loyalty rise; offers to artists +2%.') }; });
