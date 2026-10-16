// Rodada 27 (M3) — OPERAÇÕES JOGÁVEIS DO SUBMUNDO. Uma ação de crime (crime17) vira um plano em 3 etapas:
//   1. Preparar — escolher a equipe entre gente disponível (artistas do selo, a sua equipe, contatos de organizações
//      que você conhece: lealdade, habilidade e calor visíveis), o alvo, o nível de risco e uma história de cobertura.
//   2. Executar — 2 ou 3 momentos de decisão com complicações (dica à polícia, traição de alguém pouco leal,
//      interferência de rival, testemunha, imprevisto). Cada escolha troca dinheiro × calor × relações.
//   3. Encobrir — depois do resultado: pagar, sumir com as provas, arranjar um bode expiatório ou se esconder.
// Nada de estatística paralela: o plano vira `dp`/`dq` do commitCrime (crime17) e o resto sai pelos sistemas que já
// existem — calor (addHeat), boatos (facts17 segredo → boato → público), investigação (feedCase / provas do caso),
// mágoas e segredos guardados (holds17), escândalo (scandal17) e segredos (secrets23).
// Modo rápido = commitCrime direto (bots, testes, balance19 seguem iguais). Tudo determinístico: o sorteio do plano
// usa um fluxo próprio (Rng.fromSeed com semente da partida + crime + alvo + semana), nunca os fluxos compartilhados.
// Só operações do negócio da música (pirataria, chantagem, desvio, paradas, sabotagem, grampo, relíquia, suborno):
// violência continua só no modo rápido.

import { clamp, Rng } from '../../core/rng';
import { STAFF_ROLES } from '../../data/rules';
import { l, type L } from '../../data/world';
import { emitFact, raiseVisibility, factById } from '../facts17';
import { grantHold, holds17 } from '../holds17';
import { scandal } from '../scandal17';
import type { GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import {
  addHeat, crime17, crimeById, crimeOdds, commitCrime, feedCase, heatIn, nameOf17, orgById, orgs17, ownerOfTarget, usd,
  type Ctx17, type CrimeOut, type Odds17,
} from './crime17';
import { mem23, name23 } from './crimemem23';
import { per13 } from './persona13';
import { addSecret23 } from './secrets23';
import { opinionRaw, shiftOpinion } from '../opinion';

// ================================================================ tipos

export type Risk27 = 'low' | 'mid' | 'high';
export type Cover27 = 'none' | 'alibi' | 'charity' | 'books';
export type Ev27 = 'tip' | 'betray' | 'rival' | 'witness' | 'snag';
export type Up27 = 'none' | 'payoff' | 'destroy' | 'scapegoat' | 'lielow';
/** Alguém disponível para a equipe. `key`: 'p:<pessoa>' | 's:<funcionário>'. */
export interface Crew27 { key: string; name: string; kind: 'artist' | 'staff' | 'contact'; loy: number; skill: number; heat: number; role: string; fit: boolean; fee: number; org?: string; why: L[] }
export interface Plan27 { cid: string; ctx: Ctx17; crew: string[]; risk: Risk27; cover: Cover27 }
/** Efeito de uma escolha (todas visíveis antes de escolher). */
export interface Fx27 {
  dp?: number; dq?: number; cash?: number; loot?: number; heat?: number; loy?: number; rival?: number;
  drop?: 1; grudge?: 1; rumor?: 1; secret?: 1; roll?: 1; tipRival?: 1; raid?: 1;
}
export interface Choice27 { id: string; name: L; hint: L; fx: Fx27; block?: L }
export interface Event27 { id: Ev27; who?: string; title: L; text: L; choices: Choice27[] }
/** Sinal visível emitido por uma etapa (para a linha do tempo e o relatório). */
export interface Sig27 { st: 1 | 2 | 3; k: 'heat' | 'rumor' | 'case' | 'grudge' | 'scandal' | 'secret' | 'money' | 'loyal'; t: L; tone: 'good' | 'bad' | 'info' }
export interface Mods27 { dp: number; dq: number; cash: number; loot: number; heat: number; why: L[] }
export interface Res27 {
  out: CrimeOut; odds: Odds17; resp: string; a3: string; caseId?: string; loot: number; betrayed: string[]; raid: boolean; sig: Sig27[];
  /** explicação curta: "saiu fraca porque…" */ because: L[]; crew: string[]; cid: string; info: Crew27[];
}

/** Crimes que viram operação jogável (violência fica de fora: continua só no modo rápido). */
export const HEIST27 = ['bootleg', 'blackmail', 'royalty_skim', 'chart_rig', 'sabotage', 'wiretap', 'steal_relic', 'bribe'] as const;
export const playable27 = (cid: string): boolean => (HEIST27 as readonly string[]).includes(cid);

export const RISK27: Record<Risk27, { name: L; hint: L; dp: number; dq: number; loot: number }> = {
  low: { name: l('Cauteloso', 'Cautious'), hint: l('Menos chance, bem menos exposição, rende 15% menos.', 'Lower odds, much less exposure, pays 15% less.'), dp: -0.06, dq: -0.08, loot: 0.85 },
  mid: { name: l('Normal', 'Standard'), hint: l('Como no modo rápido.', 'As in quick mode.'), dp: 0, dq: 0, loot: 1 },
  high: { name: l('Ousado', 'Bold'), hint: l('Mais chance e +20% de ganho, mas exposição bem maior.', 'Better odds and +20% take, but much more exposure.'), dp: 0.05, dq: 0.1, loot: 1.2 },
};
const MONEY_CRIMES = new Set(['bootleg', 'blackmail', 'royalty_skim', 'chart_rig']);
export const COVER27: Record<Cover27, { name: L; hint: L; cost: number; dq: number }> = {
  none: { name: l('Sem cobertura', 'No cover story'), hint: l('Grátis.', 'Free.'), cost: 0, dq: 0 },
  alibi: { name: l('Álibi: noite no estúdio', 'Alibi: a night at the studio'), hint: l('Testemunhas pagas juram que você estava gravando. Exposição −5%.', 'Paid witnesses swear you were recording. Exposure −5%.'), cost: 2000, dq: -0.05 },
  charity: { name: l('Show beneficente na mesma noite', 'Benefit show the same night'), hint: l('Foto nos jornais e boa vontade: exposição −4%, calor −3 depois.', 'Photos in the papers and goodwill: exposure −4%, heat −3 afterwards.'), cost: 4000, dq: -0.04 },
  books: { name: l('Notas frias na contabilidade', 'Cooked books'), hint: l('Só golpes de dinheiro. Exposição −7%, mas se vazar o caso ganha +10 de provas (fraude contábil).', 'Money schemes only. Exposure −7%, but if it leaks the case gains +10 evidence (accounting fraud).'), cost: 1500, dq: -0.07 },
};
export const UP27: Record<Up27, { name: L; hint: L }> = {
  none: { name: l('Não fazer nada', 'Do nothing'), hint: l('Sem custo; o que aconteceu fica como está.', 'No cost; things stay as they are.') },
  payoff: { name: l('Pagar para abafar', 'Pay it off'), hint: l('Caro. Exposto: provas −20 e calor −8. Em segredo: a equipe esquece (segredos guardados mais fracos).', 'Expensive. Exposed: evidence −20 and heat −8. Kept secret: the crew forgets (weaker held secrets).') },
  destroy: { name: l('Sumir com as provas', 'Destroy the evidence'), hint: l('Barato. Exposto: provas −12. Em segredo: segredos guardados perdem a prova. Quem tem lealdade baixa passa a saber disso também.', 'Cheap. Exposed: evidence −12. Kept secret: held secrets lose their proof. Low-loyalty crew learn about this too.') },
  scapegoat: { name: l('Arranjar um bode expiatório', 'Find a scapegoat'), hint: l('Só se vazou. Joga a culpa em alguém da equipe: suas provas −25 e calor −10; ele(a) ganha o caso, uma mágoa enorme e pode virar escândalo.', 'Only if it leaked. Pin it on a crew member: your evidence −25 and heat −10; they get the case, a huge grudge and maybe a scandal.') },
  lielow: { name: l('Sumir do mapa por um tempo', 'Lie low for a while'), hint: l('Grátis: calor −30%, mas a mercadoria esfria (−10% do ganho) e a equipe fica inquieta.', 'Free: heat −30%, but the goods cool off (−10% of the take) and the crew gets restless.') },
};
export const EV27: Record<Ev27, L> = {
  tip: l('Dica à polícia', 'Police tip-off'), betray: l('Traição na equipe', 'Crew betrayal'), rival: l('Rival no caminho', 'Rival interference'),
  witness: l('Testemunha', 'Witness'), snag: l('Imprevisto', 'Snag'),
};

// ================================================================ equipe

const F = (s: GameState, key: string, f: string): number => ((per13(s, key)?.facets as Record<string, number> | undefined)?.[f] ?? 50);
/** Funções que ajudam em cada operação (cargos da equipe e funções de membros de organização). */
const FIT27: Record<string, string[]> = {
  bootleg: ['manufacturing', 'motorista', 'promotor', 'tour_manager'],
  blackmail: ['olheiro', 'advogado', 'publicist', 'manager'],
  royalty_skim: ['contador', 'admin', 'rights', 'analyst'],
  chart_rig: ['promotor', 'contador', 'publicist', 'analyst'],
  sabotage: ['engineer', 'musico', 'olheiro', 'seguranca'],
  wiretap: ['engineer', 'olheiro'],
  steal_relic: ['seguranca', 'motorista', 'olheiro'],
  bribe: ['advogado', 'legal', 'contador'],
};
const ROLE_NAME: Record<string, L> = {
  musico: l('músico', 'musician'), contador: l('contador', 'accountant'), seguranca: l('segurança', 'muscle'), motorista: l('motorista', 'driver'),
  olheiro: l('olheiro', 'lookout'), advogado: l('advogado', 'lawyer'), promotor: l('promotor', 'promoter'),
};
export const roleName27 = (r: string): L => ROLE_NAME[r] ?? STAFF_ROLES.find((x) => x.id === r)?.name ?? l(r, r);

/** Gente disponível para a equipe (até 12), com lealdade, habilidade e calor visíveis. */
export function crewPool27(s: GameState, plan: Pick<Plan27, 'cid' | 'ctx'>): Crew27[] {
  const st = crime17(s);
  const fits = FIT27[plan.cid] ?? [];
  const out: Crew27[] = [];
  const M = mem23(s);
  const push = (key: string, name: string, kind: Crew27['kind'], baseSkill: number, loyBase: number, role: string, why: L[], org?: string): void => {
    const m = M[key];
    const ro = m?.ro ?? role;
    const fit = fits.includes(ro) || fits.includes(role);
    const dis = F(s, key, 'disciplina'), cor = F(s, key, 'coragem'), lea = F(s, key, 'lealdade');
    const skill = Math.round(clamp(dis * 0.35 + cor * 0.25 + baseSkill * 0.4 + (m ? m.rk * 6 : 0), 5, 99));
    const loy = Math.round(clamp(lea * 0.5 + loyBase * 0.5, 0, 100));
    const id = key.slice(2);
    const heat = Math.round(clamp((st.nh[key.startsWith('p:') ? id : key] ?? 0) + (m && m.k >= 1 ? 15 : 0), 0, 100));
    const fee = money(s, (kind === 'contact' ? 1400 : 600) + skill * (kind === 'contact' ? 40 : 25));
    if (m) why.push(fmtL(l('Membro de {o}', 'Member of {o}'), { o: orgById(s, m.o)?.name ?? l(m.o) }));
    if (fit) why.push(l('Função certa para o serviço', 'Right role for the job'));
    out.push({ key, name, kind, loy, skill, heat, role: ro, fit, fee, why, ...(org ? { org } : {}) });
  };
  // artistas do selo
  for (const aid of playerActs(s)) {
    const a = s.acts[aid];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p?.alive || p.isPlayer || pid === plan.ctx.actor || (st.jail[pid]?.u ?? 0) > s.week) continue;
      if (out.some((x) => x.key === `p:${pid}`)) continue;
      const sk = Object.values(p.skills ?? {}).reduce((t, v) => t + v, 0) / Math.max(1, Object.keys(p.skills ?? {}).length);
      push(`p:${pid}`, p.name, 'artist', sk, 50 + opinionRaw(s, `p:${pid}`) / 2 - p.resentment / 2, 'musico', [fmtL(l('Do elenco: {a}', 'On the roster: {a}'), { a: a.name })]);
    }
  }
  // sua equipe
  for (const x of s.player.staff) {
    const tl = x.trait === 'loyal' ? 25 : x.trait === 'opportunist' ? -25 : 0;
    const yrs = (s.week - x.hiredWeek) / 52;
    push(`s:${x.id}`, x.name, 'staff', x.skill, 45 + tl + Math.min(20, yrs * 4), x.role, [l('Sua equipe', 'Your staff')]);
  }
  // contatos: membros conhecidos de organizações que trabalham com você
  for (const [key, m] of Object.entries(M)) {
    if (m.k < 1 || out.some((x) => x.key === key) || !key.startsWith('p:')) continue;
    const p = s.persons[key.slice(2)];
    if (!p?.alive || p.isPlayer || (st.jail[p.id]?.u ?? 0) > s.week || key.slice(2) === plan.ctx.actor) continue;
    const rel = st.org[m.o] ?? 0;
    if (rel < 0 || (st.down[m.o] ?? 0) > s.week) continue;
    push(key, name23(s, key), 'contact', 55 + m.rk * 5, 25 + rel / 3, m.ro, [l('Contato do submundo (mais caro e menos leal)', 'Underworld contact (pricier, less loyal)')], m.o);
  }
  return out.sort((a, b) => Number(b.fit) - Number(a.fit) || b.skill - a.skill || a.key.localeCompare(b.key)).slice(0, 12);
}

// ================================================================ preparar

/** Efeito da preparação (equipe, risco, cobertura) — em dp/dq, custo e multiplicador de ganho. */
export function prepMods27(s: GameState, plan: Plan27, pool = crewPool27(s, plan)): Mods27 {
  const why: L[] = [];
  const R = RISK27[plan.risk];
  let dp = R.dp, dq = R.dq, cash = 0;
  const loot = R.loot;
  if (plan.risk !== 'mid') why.push(fmtL(l('Risco {r}: chance {p}, exposição {q}', 'Risk {r}: odds {p}, exposure {q}'), { r: R.name, p: pc(R.dp), q: pc(R.dq) }));
  for (const k of plan.crew) {
    const c = pool.find((x) => x.key === k);
    if (!c) continue;
    const a = 0.02 + (c.skill - 50) / 600 + (c.fit ? 0.03 : 0);
    const b = 0.025 + c.heat / 500 - (c.role === 'advogado' || c.role === 'legal' ? 0.03 : 0);
    dp += a; dq += b; cash += c.fee;
    why.push(fmtL(l('{n}: chance {a}, exposição {b}', '{n}: odds {a}, exposure {b}'), { n: c.name, a: pc(a), b: pc(b) }));
  }
  const cv = COVER27[plan.cover];
  if (plan.cover !== 'none') {
    const okBooks = plan.cover !== 'books' || MONEY_CRIMES.has(plan.cid);
    if (okBooks) { dq += cv.dq; cash += money(s, cv.cost); why.push(fmtL(l('Cobertura ({c}): exposição {q}', 'Cover ({c}): exposure {q}'), { c: cv.name, q: pc(cv.dq) })); }
  }
  return { dp, dq, cash, loot, heat: 0, why };
}
const pc = (x: number): string => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;

// ================================================================ executar: complicações

const hrng = (s: GameState, plan: Plan27, tag: string): Rng => Rng.fromSeed(`heist27|${s.config.seed}|${plan.cid}|${plan.ctx.target}|${s.week}|${tag}`);
/** Rival que pode atrapalhar: dono do alvo (se é selo) ou o maior rival do jogador. */
export function rivalOf27(s: GameState, plan: Plan27): string | undefined {
  const o = ownerOfTarget(s, plan.ctx.target);
  if (o && o !== 'player' && s.labels[o]?.active) return o;
  return Object.entries(s.rivalries).filter(([id, v]) => v > 0 && s.labels[id]?.active).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

/** As 2–3 complicações do plano (determinístico: mesma semana, alvo e equipe → mesmas complicações). */
export function heistEvents27(s: GameState, plan: Plan27, pool = crewPool27(s, plan)): Event27[] {
  const r = hrng(s, plan, 'ev');
  const u = [r.next(), r.next(), r.next(), r.next(), r.next(), r.next()]; // sorteios fixos (trocar a equipe não muda os dados)
  const crew = plan.crew.map((k) => pool.find((x) => x.key === k)).filter((c): c is Crew27 => !!c);
  const o = crimeOdds(s, plan.ctx, plan.cid);
  const heat = (plan.ctx.actor === 'player' ? heatIn(s, o.a3) : crime17(s).nh[plan.ctx.actor] ?? 0) + crew.reduce((t, c) => t + c.heat, 0) / 2;
  const weak = crew.slice().sort((a, b) => a.loy - b.loy || a.key.localeCompare(b.key))[0];
  const rival = rivalOf27(s, plan);
  const w: [Ev27, number][] = [
    ['tip', 0.25 + heat / 120],
    ['betray', weak ? (100 - weak.loy) / 110 : 0],
    ['rival', rival ? 0.3 + Math.min(0.4, (s.rivalries[rival] ?? 0) / 150) : 0],
    ['witness', crimeById(plan.cid)?.tk === 'person' || plan.cid === 'steal_relic' || plan.cid === 'sabotage' ? 0.55 : 0.3],
    ['snag', 0.45],
  ];
  const n = plan.risk === 'high' || crew.length >= 3 ? 3 : 2;
  // escolhe sem repetição: cada candidato ganha nota peso × sorteio fixo
  const ranked = w.filter(([, x]) => x > 0).map(([id, x], i) => ({ id, v: x * (0.35 + u[i]) })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id)).slice(0, n).map((x) => x.id);
  const order: Ev27[] = ['snag', 'witness', 'rival', 'tip', 'betray'];
  ranked.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return ranked.map((id) => buildEvent(s, plan, id, weak, rival, crew));
}

function buildEvent(s: GameState, plan: Plan27, id: Ev27, weak: Crew27 | undefined, rival: string | undefined, crew: Crew27[]): Event27 {
  const cash = s.player.cash;
  const need = (v: number): L | undefined => (cash < v ? l('Caixa insuficiente.', 'Not enough cash.') : undefined);
  const best = crew.reduce((m, c) => Math.max(m, c.skill), plan.ctx.actor === 'player' ? 50 : 45);
  if (id === 'tip') {
    const v = money(s, 2500 + heatIn(s, crimeOdds(s, plan.ctx, plan.cid).a3) * 60);
    return { id, title: EV27.tip, text: l('Um informante avisou a polícia: tem viatura rondando o ponto combinado.', 'An informant tipped off the police: a squad car is circling the meeting point.'), choices: [
      { id: 'delay', name: l('Adiar e trocar o ponto', 'Delay and move the spot'), hint: l('Chance −4%, exposição −8%; custa mais (equipe parada).', 'Odds −4%, exposure −8%; costs more (crew on standby).'), fx: { dp: -0.04, dq: -0.08, cash: money(s, 1500) }, block: need(money(s, 1500)) },
      { id: 'push', name: l('Seguir mesmo assim', 'Go ahead anyway'), hint: l('Exposição +12% e calor +4. Se vazar, vira batida policial.', 'Exposure +12% and heat +4. If it leaks, it becomes a raid.'), fx: { dq: 0.12, heat: 4, raid: 1 } },
      { id: 'grease', name: l('Molhar a mão do informante', 'Grease the informant'), hint: fmtL(l('{v}: exposição −5%, mas ele passa a guardar um segredo seu.', '{v}: exposure −5%, but he now holds a secret on you.'), { v: usd(v) }), fx: { dq: -0.05, cash: v, secret: 1 }, block: need(v) },
    ] };
  }
  if (id === 'betray' && weak) {
    const v = money(s, 1500 + weak.skill * 30);
    return { id, who: weak.key, title: EV27.betray, text: fmtL(l('{n} (lealdade {l}) anda falando demais e quer uma parte maior.', '{n} (loyalty {l}) is talking too much and wants a bigger cut.'), { n: weak.name, l: weak.loy }), choices: [
      { id: 'pay', name: l('Dar uma parte maior', 'Give a bigger cut'), hint: fmtL(l('{v} ou −20% do ganho; lealdade +15, ninguém trai.', '{v} or −20% of the take; loyalty +15, nobody betrays.'), { v: usd(v) }), fx: MONEY_CRIMES.has(plan.cid) ? { loot: -0.2, loy: 15 } : { cash: v, loy: 15 }, block: MONEY_CRIMES.has(plan.cid) ? undefined : need(v) },
      { id: 'threaten', name: l('Ameaçar', 'Threaten'), hint: fmtL(l('De graça, mas {n} guarda mágoa; ainda pode trair (chance pela lealdade) e entregar você.', 'Free, but {n} holds a grudge; may still betray you (by loyalty) and give you up.'), { n: weak.name }), fx: { grudge: 1, roll: 1, dq: 0.03, loy: -15 } },
      { id: 'cut', name: l('Tirar do plano', 'Cut them out'), hint: fmtL(l('{n} sai (perde a ajuda dele, recupera o pagamento); sabe demais e espalha boato.', '{n} is out (lose their help, keep their fee); knows too much and spreads a rumor.'), { n: weak.name }), fx: { drop: 1, rumor: 1, grudge: 1 } },
    ] };
  }
  if (id === 'rival' && rival) {
    const nm = s.labels[rival]?.name ?? '?';
    return { id, who: rival, title: EV27.rival, text: fmtL(l('{r} soube do esquema e quer entrar — ou melar.', '{r} heard about the scheme and wants in — or to ruin it.'), { r: nm }), choices: [
      { id: 'share', name: l('Dividir com eles', 'Cut them in'), hint: l('Ganho −30% (ou custo), chance +5%; rivalidade −10.', 'Take −30% (or cost), odds +5%; rivalry −10.'), fx: MONEY_CRIMES.has(plan.cid) ? { loot: -0.3, dp: 0.05, rival: -10 } : { cash: money(s, 2500), dp: 0.05, rival: -10 }, block: MONEY_CRIMES.has(plan.cid) ? undefined : need(money(s, 2500)) },
      { id: 'race', name: l('Correr na frente', 'Race ahead'), hint: l('Chance −6%, exposição +4%; rivalidade +10.', 'Odds −6%, exposure +4%; rivalry +10.'), fx: { dp: -0.06, dq: 0.04, rival: 10 } },
      { id: 'rat', name: l('Entregar o rival à polícia', 'Rat out the rival'), hint: l('A polícia olha para eles (calor deles +12), exposição −3%; rivalidade +20 e eles guardam mágoa.', 'Police look at them (their heat +12), exposure −3%; rivalry +20 and they hold a grudge.'), fx: { dq: -0.03, rival: 20, tipRival: 1, grudge: 1 } },
    ] };
  }
  if (id === 'witness') {
    const v = money(s, 1200 + (crimeById(plan.cid)?.sev ?? 30) * 40);
    return { id, title: EV27.witness, text: l('Alguém viu mais do que devia — um porteiro, um fã, um técnico.', 'Someone saw more than they should — a doorman, a fan, a technician.'), choices: [
      { id: 'buy', name: l('Comprar o silêncio', 'Buy their silence'), hint: fmtL(l('{v}: exposição −6%.', '{v}: exposure −6%.'), { v: usd(v) }), fx: { cash: v, dq: -0.06 }, block: need(v) },
      { id: 'scare', name: l('Dar um susto', 'Scare them off'), hint: l('Exposição −2%, calor +5 e começa um boato.', 'Exposure −2%, heat +5 and a rumor starts.'), fx: { dq: -0.02, heat: 5, rumor: 1 } },
      { id: 'ignore', name: l('Deixar pra lá', 'Let it go'), hint: l('Exposição +10%; mesmo dando certo, vira um segredo que a imprensa fareja.', 'Exposure +10%; even if it works, it becomes a secret the press sniffs at.'), fx: { dq: 0.1, secret: 1 } },
    ] };
  }
  // imprevisto
  const ok = best >= 60;
  return { id: 'snag', title: EV27.snag, text: snagText(plan.cid), choices: [
    { id: 'improv', name: l('Improvisar', 'Improvise'), hint: fmtL(l('Depende da habilidade da equipe (melhor: {b}). {r}', 'Depends on crew skill (best: {b}). {r}'), { b: best, r: ok ? l('Dá: chance +6%.', 'They can: odds +6%.') : l('Ninguém dá conta: chance −6%.', 'Nobody can: odds −6%.') }), fx: { dp: ok ? 0.06 : -0.06 } },
    { id: 'retreat', name: l('Fazer só parte', 'Do only part of it'), hint: l('Chance +5%, exposição −3%, ganho −25%.', 'Odds +5%, exposure −3%, take −25%.'), fx: { dp: 0.05, dq: -0.03, loot: -0.25 } },
    { id: 'force', name: l('Forçar a barra', 'Force it'), hint: l('Chance +8%, exposição +8%, calor +6.', 'Odds +8%, exposure +8%, heat +6.'), fx: { dp: 0.08, dq: 0.08, heat: 6 } },
  ] };
}
function snagText(cid: string): L {
  switch (cid) {
    case 'bootleg': return l('A prensa clandestina quebrou no meio da tiragem.', 'The clandestine press broke down mid-run.');
    case 'royalty_skim': case 'chart_rig': return l('Um auditor novo começou a fazer perguntas.', 'A new auditor started asking questions.');
    case 'steal_relic': return l('O alarme foi trocado na semana passada.', 'The alarm was replaced last week.');
    case 'wiretap': return l('A linha tem um chiado: o aparelho pode ser notado.', 'The line hisses: the device may be noticed.');
    case 'blackmail': return l('O alvo contratou um advogado esperto.', 'The target hired a sharp lawyer.');
    default: return l('Nada sai como no papel.', 'Nothing goes as planned.');
  }
}

/** Soma da preparação + escolhas feitas (`picks`: id do evento → id da escolha). */
export function planMods27(s: GameState, plan: Plan27, picks: Partial<Record<Ev27, string>> = {}, pool = crewPool27(s, plan), evs = heistEvents27(s, plan, pool)): Mods27 {
  const m = prepMods27(s, plan, pool);
  for (const e of evs) {
    const ch = e.choices.find((c) => c.id === picks[e.id]);
    if (!ch) continue;
    const f = ch.fx;
    m.dp += f.dp ?? 0; m.dq += f.dq ?? 0; m.cash += f.cash ?? 0; m.loot += f.loot ?? 0; m.heat += f.heat ?? 0;
    if (f.drop && e.who) { const c = pool.find((x) => x.key === e.who); if (c && plan.crew.includes(c.key)) { m.dp -= 0.02 + (c.skill - 50) / 600 + (c.fit ? 0.03 : 0); m.dq -= 0.025 + c.heat / 500; m.cash -= c.fee; } }
    m.why.push(fmtL(l('{e}: {c}', '{e}: {c}'), { e: e.title, c: ch.name }));
  }
  m.loot = Math.max(0.3, m.loot);
  return m;
}
/** Chances finais do plano (com o que já foi escolhido). */
export function planOdds27(s: GameState, plan: Plan27, picks: Partial<Record<Ev27, string>> = {}): Odds17 & { m: Mods27 } {
  const m = planMods27(s, plan, picks);
  const o = crimeOdds(s, { ...plan.ctx, dp: (plan.ctx.dp ?? 0) + m.dp, dq: m.dq, dpWhy: l('Plano (equipe, risco, escolhas)', 'Plan (crew, risk, choices)'), dqWhy: l('Plano (equipe, risco, cobertura, escolhas)', 'Plan (crew, risk, cover, choices)') }, plan.cid);
  return { ...o, cost: o.cost + m.cash, m };
}

// ================================================================ executar: resolução

/** Executa o plano: cobra a equipe, roda o crime (crime17) e espalha os sinais das escolhas. */
export function runHeist27(s: GameState, plan: Plan27, picks: Partial<Record<Ev27, string>>): Res27 | L {
  if (!playable27(plan.cid)) return l('Esta ação só tem modo rápido.', 'This action has quick mode only.');
  const pool = crewPool27(s, plan);
  const evs = heistEvents27(s, plan, pool);
  const m = planMods27(s, plan, picks, pool, evs);
  const st = crime17(s);
  const sig: Sig27[] = [];
  const because: L[] = [];
  const dropped = new Set(evs.filter((e) => e.who && e.choices.find((c) => c.id === picks[e.id])?.fx.drop).map((e) => e.who!));
  const crew = plan.crew.filter((k) => !dropped.has(k)).map((k) => pool.find((x) => x.key === k)).filter((c): c is Crew27 => !!c);
  const ctx: Ctx17 = { ...plan.ctx, dp: (plan.ctx.dp ?? 0) + m.dp, dq: m.dq, dpWhy: l('Plano (equipe, risco, escolhas)', 'Plan (crew, risk, choices)'), dqWhy: l('Plano (equipe, risco, cobertura, escolhas)', 'Plan (crew, risk, cover, choices)') };
  const pre = crimeOdds(s, ctx, plan.cid);
  if (pre.block) return pre.block;
  if (s.player.cash < pre.cost + m.cash) return l('Caixa insuficiente para a equipe e as escolhas.', 'Not enough cash for the crew and the choices.');
  // 1) preparar: pagar equipe/cobertura/escolhas
  if (m.cash > 0) post(s, `h27:${plan.cid}:${s.week}:${st.seq}`, -m.cash, 'legal', `Operação "discreta" (${crimeById(plan.cid)?.name.pt ?? plan.cid})`);
  if (m.cash > 0) sig.push({ st: 1, k: 'money', t: fmtL(l('Equipe, cobertura e extras: {v}', 'Crew, cover and extras: {v}'), { v: usd(m.cash) }), tone: 'info' });
  const hot = crew.filter((c) => c.heat >= 40);
  if (hot.length) { addHeat(s, 'player', pre.a3, 2 * hot.length); sig.push({ st: 1, k: 'heat', t: fmtL(l('Andar com gente marcada ({n}): calor +{h}', 'Running with marked people ({n}): heat +{h}'), { n: hot.map((c) => c.name).join(', '), h: 2 * hot.length }), tone: 'bad' }); }
  for (const c of crew.filter((x) => x.kind === 'contact' && x.org)) grantHold(s, { holder: `o:${c.org}`, target: 'player', kind: 'favor', strength: 35, months: 36, src: 'crime17', text: fmtL(l('Emprestou {n} para um serviço', 'Lent {n} for a job'), { n: c.name }), quiet: true });
  // 2) executar
  const lootBefore = st.loot19 ?? 0;
  const r = Rng.fromSeed(`heist27do|${s.config.seed}|${plan.cid}|${plan.ctx.target}|${s.week}|${st.seq}`);
  const out = commitCrime(s, plan.cid, ctx, r);
  if (typeof out !== 'object' || !('ok' in out)) return out as L;
  const o = pre;
  const resp = plan.ctx.actor;
  // ganho: risco/escolhas mudam o tamanho do golpe
  const got = (st.loot19 ?? 0) - lootBefore;
  let loot = got;
  if (got > 0 && Math.abs(m.loot - 1) > 1e-6) {
    const extra = Math.round(got * (m.loot - 1));
    post(s, `h27loot:${plan.cid}:${s.week}:${st.seq}`, extra, extra > 0 ? 'other' : 'legal', extra > 0 ? `Golpe maior (${crimeById(plan.cid)?.name.pt})` : `Parte da equipe (${crimeById(plan.cid)?.name.pt})`);
    st.loot19 = (st.loot19 ?? 0) + extra; loot += extra;
    sig.push({ st: 2, k: 'money', t: fmtL(l('Tamanho do golpe ×{x}: {v}', 'Size of the take ×{x}: {v}'), { x: m.loot.toFixed(2), v: usd(extra) }), tone: extra > 0 ? 'good' : 'info' });
  }
  if (m.heat) { addHeat(s, 'player', o.a3, m.heat); sig.push({ st: 2, k: 'heat', t: fmtL(l('Escolhas arriscadas: calor +{h}', 'Risky choices: heat +{h}'), { h: m.heat }), tone: 'bad' }); }
  const fact = out.fact;
  let raid = false;
  const betrayed: string[] = [];
  const cs = () => st.cases.find((x) => x.who === resp && x.a3 === o.a3 && x.stage !== 'closed');
  // escolhas → sistemas
  for (const e of evs) {
    const ch = e.choices.find((c) => c.id === picks[e.id]);
    if (!ch) continue;
    const f = ch.fx;
    const who = e.who ? pool.find((x) => x.key === e.who) : undefined;
    if (f.loy && who) { loyal(s, who.key, f.loy); sig.push({ st: 2, k: 'loyal', t: fmtL(l('{n}: lealdade {x}', '{n}: loyalty {x}'), { n: who.name, x: f.loy > 0 ? `+${f.loy}` : f.loy }), tone: f.loy > 0 ? 'good' : 'bad' }); }
    if (f.grudge && e.id === 'rival' && e.who) {
      grantHold(s, { holder: e.who, target: 'player', kind: 'grievance', strength: 60, months: 120, src: 'heist27', text: l('Nos entregou à polícia', 'Ratted us out to the police'), quiet: true });
      sig.push({ st: 2, k: 'grudge', t: fmtL(l('{r} guarda mágoa de você', '{r} holds a grudge against you'), { r: s.labels[e.who]?.name ?? '?' }), tone: 'bad' });
    } else if (f.grudge && who) {
      grantHold(s, { holder: who.key.startsWith('p:') ? who.key.slice(2) : who.key, target: 'player', kind: 'grievance', strength: f.drop ? 45 : 55, months: 120, src: 'heist27', text: f.drop ? l('Foi cortado do serviço', 'Was cut from the job') : l('Foi ameaçado no serviço', 'Was threatened on the job'), quiet: true });
      sig.push({ st: 2, k: 'grudge', t: fmtL(l('{n} guarda mágoa', '{n} holds a grudge'), { n: who.name }), tone: 'bad' });
    }
    if (f.drop && who) {
      grantHold(s, { holder: who.key.startsWith('p:') ? who.key.slice(2) : who.key, target: resp, kind: 'secret', strength: 40, proof: 1, months: 120, src: 'crime17', factId: fact?.id, text: fmtL(l('Sabe do plano de "{c}"', 'Knows about the "{c}" plan'), { c: crimeById(plan.cid)!.name }), quiet: true });
    }
    if (f.rumor && fact) {
      if (raiseVisibility(fact, 'rumor')) sig.push({ st: 2, k: 'rumor', t: l('O caso passou de segredo a boato', 'The job went from secret to rumor'), tone: 'bad' });
    }
    if (f.rival && e.who && s.labels[e.who]) { s.rivalries[e.who] = (s.rivalries[e.who] ?? 0) + f.rival; sig.push({ st: 2, k: 'grudge', t: fmtL(l('Rivalidade com {r} {x}', 'Rivalry with {r} {x}'), { r: s.labels[e.who].name, x: f.rival > 0 ? `+${f.rival}` : f.rival }), tone: f.rival > 0 ? 'bad' : 'good' }); }
    if (f.tipRival && e.who) { addHeat(s, e.who, o.a3, 12); sig.push({ st: 2, k: 'heat', t: fmtL(l('A polícia passa a olhar {r} (calor +12)', 'Police now watch {r} (heat +12)'), { r: s.labels[e.who]?.name ?? '?' }), tone: 'info' }); }
    if (f.secret && e.id === 'tip') grantHold(s, { holder: 'h27:informant', target: resp, kind: 'secret', strength: 35, proof: 1, months: 60, src: 'crime17', text: l('O informante sabe que você pagou', 'The informant knows you paid'), quiet: true });
    if (f.secret && e.id === 'witness' && out.ok && !out.ex) {
      addSecret23(s, { kind: 'crime', subject: s.persons[resp] ? `p:${resp}` : 'player', sev: crimeById(plan.cid)!.sev, ev: 35, base: { p: 4, pr: 1 }, data: { h27: plan.cid } });
      sig.push({ st: 2, k: 'secret', t: l('A testemunha virou um segredo que a imprensa fareja (suspeita)', 'The witness became a secret the press sniffs at (suspicion)'), tone: 'bad' });
    }
    if (f.raid && out.ex) raid = true;
    if (f.roll && who) {
      const rb = Rng.fromSeed(`heist27b|${s.config.seed}|${plan.cid}|${plan.ctx.target}|${s.week}|${who.key}`);
      if (rb.chance(clamp((100 - who.loy) / 200, 0.03, 0.45))) {
        betrayed.push(who.key);
        const c0 = feedCase(s, resp, o.a3, 25, o.sev, false, [who.key.startsWith('p:') ? who.key.slice(2) : who.key]);
        if (fact) raiseVisibility(fact, 'rumor');
        emitFact(s, { kind: 'betrayal', actors: [who.key.startsWith('p:') ? who.key.slice(2) : who.key, resp], place: o.place, severity: 40, visibility: 'rumor', tags: ['crime', 'informant', 'heist27'], text: fmtL(l('{b} entregou {a} à polícia.', '{b} gave {a} up to the police.'), { b: who.name, a: nameOf17(s, resp) }), src: 'heist27' });
        sig.push({ st: 2, k: 'case', t: fmtL(l('{n} traiu e entregou você: provas +25 (caso {c})', '{n} betrayed you: evidence +25 (case {c})'), { n: who.name, c: c0.id }), tone: 'bad' });
        because.push(fmtL(l('{n} traiu (lealdade {l})', '{n} betrayed (loyalty {l})'), { n: who.name, l: who.loy }));
      }
    }
  }
  // a equipe vira testemunha (guarda o segredo) e esquenta
  for (const c of crew) {
    const id = c.key.startsWith('p:') ? c.key.slice(2) : c.key;
    if (betrayed.includes(c.key)) continue;
    grantHold(s, { holder: id, target: resp, kind: 'secret', strength: clamp(o.sev / 1.3 - c.loy / 5, 15, 80), proof: 1, months: 120, src: 'crime17', factId: fact?.id, text: fmtL(l('Esteve no "{c}" contra {t}', 'Was in on the "{c}" against {t}'), { c: crimeById(plan.cid)!.name, t: nameOf17(s, plan.ctx.target) }), quiet: true });
    addHeat(s, c.key.startsWith('p:') ? id : c.key, o.a3, o.heat * (out.ex ? 1 : 0.4));
    if (out.ok) loyal(s, c.key, 4);
  }
  if (crew.length) sig.push({ st: 2, k: 'secret', t: fmtL(l('{n} pessoa(s) da equipe agora guardam um segredo seu', '{n} crew member(s) now hold a secret on you'), { n: crew.length }), tone: 'info' });
  if (betrayed.length) raid = true;
  if (out.ex) {
    sig.push({ st: 2, k: 'scandal', t: l('Vazou: manchete, escândalo e investigação', 'It leaked: headline, scandal and investigation'), tone: 'bad' });
    const c0 = cs();
    if (c0 && plan.cover === 'books' && MONEY_CRIMES.has(plan.cid)) { c0.ev = clamp(c0.ev + 10, 0, 100); sig.push({ st: 2, k: 'case', t: l('As notas frias viraram prova: +10', 'The cooked books became evidence: +10'), tone: 'bad' }); }
  }
  // por quê
  const pick = (id: Ev27) => evs.find((e) => e.id === id)?.choices.find((c) => c.id === picks[id]);
  if (!out.ok) {
    if (plan.risk === 'low') because.push(l('o plano cauteloso tirou chance', 'the cautious plan cost odds'));
    if (pick('snag')?.id === 'improv' && (pick('snag')?.fx.dp ?? 0) < 0) because.push(l('ninguém da equipe deu conta do imprevisto', 'nobody on the crew could handle the snag'));
    if (pick('rival')?.id === 'race') because.push(l('correr na frente do rival custou chance', 'racing the rival cost odds'));
    if (!crew.length) because.push(l('sem equipe, tudo nas suas costas', 'no crew, everything on your shoulders'));
    if (!because.length) because.push(fmtL(l('azar: a chance era {p}', 'bad luck: the odds were {p}'), { p: `${Math.round(o.p * 100)}%` }));
  }
  if (out.ex) {
    if (pick('tip')?.id === 'push') because.push(l('você seguiu com a polícia avisada', 'you went ahead with the police tipped off'));
    if (pick('witness')?.id === 'ignore') because.push(l('a testemunha falou', 'the witness talked'));
    if (plan.risk === 'high') because.push(l('o plano ousado chamou atenção', 'the bold plan drew attention'));
    if (crew.some((c) => c.heat >= 40)) because.push(l('gente marcada na equipe', 'marked people on the crew'));
    if (!because.length) because.push(fmtL(l('exposição era {q}', 'exposure was {q}'), { q: `${Math.round(o.q * 100)}%` }));
  }
  if (out.ok && !out.ex && !because.length) because.push(l('equipe e escolhas seguraram a exposição', 'crew and choices kept exposure down'));
  return { out, odds: o, resp, a3: o.a3, caseId: cs()?.id, loot, betrayed, raid, sig, because, crew: crew.map((c) => c.key), cid: plan.cid, info: crew };
}

function loyal(s: GameState, key: string, d: number): void {
  if (key.startsWith('p:')) {
    const p = s.persons[key.slice(2)];
    if (!p) return;
    shiftOpinion(s, key, d);
    if (d < 0) p.resentment = clamp(p.resentment - d / 2, 0, 100);
  } else if (key.startsWith('s:')) {
    const x = s.player.staff.find((y) => `s:${y.id}` === key);
    if (x && d < 0 && x.trait === 'loyal' && d <= -15) x.trait = 'opportunist';
    else if (x && d > 0 && x.trait === 'opportunist' && d >= 15) delete x.trait;
  }
}

/** Abortar no meio da execução: a equipe já foi mobilizada (30% do pagamento) e quem estava desconfiado comenta. */
export function abortHeist27(s: GameState, plan: Plan27): L {
  const pool = crewPool27(s, plan);
  const fee = Math.round(plan.crew.map((k) => pool.find((x) => x.key === k)?.fee ?? 0).reduce((t, v) => t + v, 0) * 0.3);
  if (fee > 0) post(s, `h27ab:${plan.cid}:${s.week}:${crime17(s).seq}`, -fee, 'legal', 'Operação abortada (equipe mobilizada)');
  for (const k of plan.crew) loyal(s, k, -3);
  return fee > 0 ? fmtL(l('Operação abortada. A equipe cobrou {v} pela mobilização.', 'Job aborted. The crew charged {v} for showing up.'), { v: usd(fee) }) : l('Operação abortada.', 'Job aborted.');
}

// ================================================================ encobrir

export function upCost27(s: GameState, res: Res27, how: Up27): number {
  const sev = res.odds.sev;
  if (how === 'payoff') return money(s, (2000 + sev * 120) * (res.out.ex ? 2 : 1));
  if (how === 'destroy') return money(s, 800 + sev * 20);
  return 0;
}
/** Opções de encobrimento disponíveis (com bloqueio e custo visíveis). */
export function upOptions27(s: GameState, res: Res27): { id: Up27; cost: number; block: L | null }[] {
  return (['payoff', 'destroy', 'scapegoat', 'lielow', 'none'] as Up27[]).map((id) => {
    const cost = upCost27(s, res, id);
    let block: L | null = cost > s.player.cash ? l('Caixa insuficiente.', 'Not enough cash.') : null;
    if (id === 'scapegoat' && !res.out.ex) block = l('Só faz sentido se vazou.', 'Only makes sense if it leaked.');
    if (id === 'scapegoat' && res.out.ex && !res.crew.some((k) => !res.betrayed.includes(k))) block = l('Ninguém da equipe para levar a culpa.', 'Nobody on the crew to take the fall.');
    return { id, cost, block };
  });
}
/** Encobrir: aplica custo e efeitos nos sistemas existentes; devolve os sinais. */
export function coverUp27(s: GameState, res: Res27, how: Up27): Sig27[] | L {
  const opt = upOptions27(s, res).find((x) => x.id === how);
  if (!opt) return l('Opção inválida.', 'Invalid option.');
  if (opt.block) return opt.block;
  const st = crime17(s);
  const sig: Sig27[] = [];
  const cs = res.caseId ? st.cases.find((x) => x.id === res.caseId) : undefined;
  if (opt.cost) { post(s, `h27up:${how}:${s.week}:${st.seq}`, -opt.cost, 'legal', `Encobrimento (${UP27[how].name.pt})`); sig.push({ st: 3, k: 'money', t: fmtL(l('{h}: {v}', '{h}: {v}'), { h: UP27[how].name, v: usd(opt.cost) }), tone: 'info' }); }
  const myHolds = () => holds17(s).h.filter((h) => h.status === 'open' && h.target === res.resp && h.kind === 'secret' && res.crew.some((k) => h.holder === (k.startsWith('p:') ? k.slice(2) : k)) && h.w === s.week);
  const cool = (d: number): void => { const a3 = res.a3; if (res.resp === 'player') st.heat[a3] = clamp((st.heat[a3] ?? 0) - d, 0, 100); else st.nh[res.resp] = clamp((st.nh[res.resp] ?? 0) - d, 0, 100); };
  if (how === 'payoff') {
    if (res.out.ex && cs) { cs.ev = clamp(cs.ev - 20, 0, 100); cool(8); sig.push({ st: 3, k: 'case', t: l('Provas −20 e calor −8', 'Evidence −20 and heat −8'), tone: 'good' }); }
    else { for (const h of myHolds()) h.strength = clamp(h.strength - 15, 1, 100); cool(3); sig.push({ st: 3, k: 'secret', t: l('A equipe foi paga para esquecer: segredos guardados −15', 'The crew was paid to forget: held secrets −15'), tone: 'good' }); }
  } else if (how === 'destroy') {
    if (res.out.ex && cs) { cs.ev = clamp(cs.ev - 12, 0, 100); sig.push({ st: 3, k: 'case', t: l('Provas −12', 'Evidence −12'), tone: 'good' }); }
    else { for (const h of myHolds()) h.proof = 0; sig.push({ st: 3, k: 'secret', t: l('Sem provas: quem sabe só tem a palavra', 'No proof left: those who know have only their word'), tone: 'good' }); }
    for (const c of res.info) {
      const k = c.key;
      if (c.loy < 40 && !res.betrayed.includes(k)) { grantHold(s, { holder: k.startsWith('p:') ? k.slice(2) : k, target: res.resp, kind: 'secret', strength: 50, proof: 1, months: 120, src: 'crime17', text: l('Viu você queimar as provas', 'Saw you burn the evidence'), quiet: true }); sig.push({ st: 3, k: 'secret', t: fmtL(l('{n} (pouco leal) viu tudo', '{n} (not loyal) saw it all'), { n: c.name }), tone: 'bad' }); }
    }
  } else if (how === 'scapegoat') {
    const goat = res.info.filter((c) => !res.betrayed.includes(c.key)).sort((a, b) => a.loy - b.loy || a.key.localeCompare(b.key))[0];
    if (!goat) return l('Ninguém da equipe para levar a culpa.', 'Nobody on the crew to take the fall.');
    const gid = goat.key.startsWith('p:') ? goat.key.slice(2) : goat.key;
    if (cs) cs.ev = clamp(cs.ev - 25, 0, 100);
    cool(10);
    feedCase(s, gid, res.a3, 25, res.odds.sev, false);
    addHeat(s, gid, res.a3, 15);
    grantHold(s, { holder: gid, target: 'player', kind: 'grievance', strength: 85, months: 240, src: 'heist27', text: l('Levou a culpa no seu lugar', 'Took the fall for you'), quiet: false });
    loyal(s, goat.key, -50);
    sig.push({ st: 3, k: 'case', t: fmtL(l('A culpa caiu em {n}: suas provas −25, calor −10; caso aberto contra ele(a)', 'The blame fell on {n}: your evidence −25, heat −10; case opened on them'), { n: goat.name }), tone: 'good' });
    sig.push({ st: 3, k: 'grudge', t: fmtL(l('{n} guarda uma mágoa enorme (85)', '{n} holds a huge grudge (85)'), { n: goat.name }), tone: 'bad' });
    if (s.persons[gid]) {
      const r = scandal(s, gid, 'crime', Math.round(res.odds.sev * 0.8), fmtL(l('{n} é apontado(a) como autor(a) do "{c}".', '{n} is named as the one behind the "{c}".'), { n: goat.name, c: crimeById(res.cid)?.name ?? l('crime', 'crime') }), { tags: ['crime', 'heist27'] });
      if (r.fact) sig.push({ st: 3, k: 'scandal', t: fmtL(l('Escândalo para {n}', 'Scandal for {n}'), { n: goat.name }), tone: 'bad' });
    }
    if (res.out.fact) { const f = factById(s, res.out.fact.id); if (f) f.actors = [...new Set([gid, ...f.actors])]; }
  } else if (how === 'lielow') {
    const a3 = res.a3;
    const before = res.resp === 'player' ? st.heat[a3] ?? 0 : st.nh[res.resp] ?? 0;
    cool(Math.round(before * 0.3));
    if (res.loot > 0) { const v = Math.round(res.loot * 0.1); post(s, `h27low:${s.week}:${st.seq}`, -v, 'legal', 'Mercadoria esfriou'); st.loot19 = (st.loot19 ?? 0) - v; sig.push({ st: 3, k: 'money', t: fmtL(l('A mercadoria esfriou: −{v}', 'The goods cooled off: −{v}'), { v: usd(v) }), tone: 'bad' }); }
    for (const k of res.crew) loyal(s, k, -4);
    sig.push({ st: 3, k: 'heat', t: fmtL(l('Calor −{h} (−30%)', 'Heat −{h} (−30%)'), { h: Math.round(before * 0.3) }), tone: 'good' });
  }
  if (how !== 'none') {
    const fact = res.out.fact;
    emitFact(s, { kind: 'cover_up', actors: [res.resp], severity: 15, visibility: 'secret', tags: ['crime', 'heist27', how], text: fmtL(l('{a} encobriu um serviço: {h}.', '{a} covered up a job: {h}.'), { a: nameOf17(s, res.resp), h: UP27[how].name }), src: 'heist27', ...(fact ? { cause: [fact.id] } : {}) });
  }
  if (how !== 'none' && res.resp === 'player' && cs && cs.ev < 1) notify(s, l('A investigação perdeu força.', 'The investigation lost steam.'), 'good');
  return sig;
}

/** Atalho para testes/bots: plano mínimo equivalente ao modo rápido (sem equipe, risco normal, sem cobertura). */
export const quickPlan27 = (cid: string, ctx: Ctx17): Plan27 => ({ cid, ctx, crew: [], risk: 'mid', cover: 'none' });
/** Organizações conhecidas com quem dá para conseguir contatos (para o texto da tela). */
export const contactOrgs27 = (s: GameState): string[] => orgs17(s).filter((o) => (crime17(s).org[o.id] ?? 0) >= 0).map((o) => o.id);
/** Uma complicação específica (testes e telas de ajuda): mesma montagem de heistEvents27. */
export function event27(s: GameState, plan: Plan27, id: Ev27, pool = crewPool27(s, plan)): Event27 {
  const crew = plan.crew.map((k) => pool.find((x) => x.key === k)).filter((c): c is Crew27 => !!c);
  const weak = crew.slice().sort((a, b) => a.loy - b.loy || a.key.localeCompare(b.key))[0];
  return buildEvent(s, plan, id, weak, rivalOf27(s, plan), crew);
}
