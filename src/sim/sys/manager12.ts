// Rodada 12 — o empresário de verdade, por cima das rodadas 9 e 11. O recurso-chave é a CONFIANÇA de cada
// cliente (mais tempo e contatos). Ciclo: prospectar → entender as ambições → acordar um plano de carreira
// (o artista co-escolhe; metas podem brigar entre si) → negociar o mandato (áreas, comissão, exclusividade,
// autonomia) → acompanhar resultados (prestação de contas: fracasso dentro do plano é tolerado, esconder
// problema corrói) → renovar. Equipe por cliente (assessor, advogado, agente de shows), dilemas que ficam
// na memória (turnê internacional × promessa à família), agência grande com agentes contratados que
// podem sair levando estrelas, sucessão e desenvolvimento de talentos. Gerador próprio (semente+ano+mês).

import { Rng, clamp } from '../../core/rng';
import { GENRES, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, personName } from '../people';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { contactsFor, isActive, originTrust, registerLoad } from './careers12';
import { cxOf } from './manager11';
import { ownerOf } from './people/owner';
import { SVC, isForeign, onServiceOutcome, providerById, registerContactBonus, requestService, signService, type Ask, type SvcKind } from './services12';
import { dropClient, funds, grossShows, mgCap, ventures, type Client } from './ventures9';

export type Area = 'recordings' | 'shows' | 'endorsements' | 'international';
export type Amb = 'money' | 'recognition' | 'genre' | 'family' | 'international' | 'art';
export type TeamRole = 'pub' | 'law' | 'book';
export type DilemmaMove = 'full' | 'fewer' | 'other' | 'pressure' | 'decline';
export const AREA_NAME: Record<Area, L> = { recordings: l('Gravações', 'Recordings'), shows: l('Shows', 'Shows'), endorsements: l('Patrocínios', 'Endorsements'), international: l('Internacional', 'International') };
export const AMB_NAME: Record<Amb, L> = {
  money: l('Ganhar dinheiro', 'Make money'), recognition: l('Reconhecimento (+8 de fama)', 'Recognition (+8 fame)'), genre: l('Mudar de gênero', 'Change genre'),
  family: l('Tempo com a família', 'Time with family'), international: l('Carreira internacional', 'International career'), art: l('Fazer o disco que quer', 'Make the record they want'),
};
export const TEAM_NAME: Record<TeamRole, L> = { pub: l('Assessor de imprensa', 'Publicist'), law: l('Advogado', 'Lawyer'), book: l('Agente de shows', 'Booking agent') };
const TEAM_COST: Record<TeamRole, number> = { pub: 800, law: 1000, book: 700 };
export const AUTO_NAME: L[] = [l('Consultar sempre', 'Always consult'), l('Informar depois', 'Inform afterwards'), l('Carta branca', 'Free hand')];
/** Metas que brigam entre si (explicadas na tela). */
export const CLASH: [Amb, Amb, L][] = [
  ['money', 'family', l('dinheiro pede estrada; família pede casa', 'money wants the road; family wants home')],
  ['international', 'family', l('turnê lá fora é tempo longe de casa', 'touring abroad is time away from home')],
  ['genre', 'money', l('mudar de gênero costuma derrubar a renda no começo', 'changing genre usually dents income at first')],
  ['art', 'money', l('o disco do coração raramente é o que mais vende', 'the passion record is rarely the bestseller')],
];
const AREA_OF: Record<SvcKind, Area | null> = { studio: 'recordings', producer: 'recordings', label: 'recordings', booking: 'shows', festival: 'shows', media: null };

export interface Mandate { areas: Area[]; rate: number; excl: boolean; auto: 0 | 1 | 2; until: number; legacy?: boolean }
export interface PlanGoal { k: Amb; base: number; done?: boolean }
export interface Plan { goals: PlanGoal[]; w: number; steps: number; target?: string; broken: number }
export interface Promise12 { k: Amb; t: L; w: number; kept?: boolean }
export interface C12 {
  trust: number; known: boolean; talkW?: number; mandate: Mandate; negW?: number; plan?: Plan; team: Partial<Record<TeamRole, boolean>>;
  promises: Promise12[]; issue?: { t: L; w: number }; hidden: { t: L; w: number }[]; dilemma?: { gross: number; w: number }; pressured: number;
  agent?: string; bond: number; dev?: boolean; devDone?: boolean; fame0: number; since: number; flags: { intl?: boolean; art?: boolean }; counter?: { prov: string; price: number; w: number }; endW?: number; book: L[];
}
export interface Agent { id: string; name: string; skill: number; loyalty: number; hired: number; raiseW?: number }
export interface Mgr12 { c: Record<string, C12>; agents: Agent[]; successor?: string; prestige: number; gen: number; seq: number; alumni: { name: string; y: number; took: string[] }[]; devHits: number }

declare module '../ext4' { interface Ext4 { manager12: Mgr12 } }
const fresh = (): Mgr12 => ({ c: {}, agents: [], prestige: 0, gen: 1, seq: 0, alumni: [], devHits: 0 });
registerExt4('manager12', fresh);
export const mgr12 = (s: GameState): Mgr12 => {
  const x = s.x4 as unknown as { manager12?: Mgr12 };
  x.manager12 ??= fresh();
  return x.manager12;
};
const clientOf = (s: GameState, id: string): Client | undefined => ventures(s).mg.clients.find((c) => c.actId === id);
type Res = { ok: boolean; text: L };
const bad = (t: L): Res => ({ ok: false, text: t });
const INVALID = l('Inválido.', 'Invalid.');
const ALL_AREAS: Area[] = ['recordings', 'shows', 'endorsements', 'international'];

/** Ficha do cliente. Clientes antigos recebem um mandato informal (todas as áreas, sem exclusividade). */
export function c12(s: GameState, id: string): C12 {
  const st = mgr12(s);
  const c = clientOf(s, id);
  return (st.c[id] ??= {
    trust: clamp(50 + originTrust(s) + ((c?.sat ?? 60) - 60) / 2, 5, 95), known: false, team: {}, promises: [], hidden: [], pressured: 0, bond: 0,
    mandate: { areas: ALL_AREAS.slice(), rate: c?.rate ?? 0.15, excl: false, auto: 1, until: s.week + 104, legacy: true },
    fame0: s.acts[id]?.fame ?? 0, since: s.week, flags: {}, book: [],
  });
}
const trust = (s: GameState, id: string, d: number) => { const x = c12(s, id); x.trust = clamp(x.trust + d, 0, 100); };
const book = (x: C12, t: L) => { x.book.push(t); if (x.book.length > 8) x.book.shift(); };

/** Ambições do artista (estáveis pela semente). Escondidas até a conversa. */
export function ambitionsOf(s: GameState, id: string): Amb[] {
  const r = Rng.fromSeed(`${s.config.seed}:amb12:${id}`);
  const all: Amb[] = ['money', 'recognition', 'genre', 'family', 'international', 'art'];
  r.shuffle(all);
  return all.slice(0, 2);
}

function pay(s: GameState, amount: number, key: string, memo: string, c?: Client): void {
  amount = Math.round(amount);
  if (!amount) return;
  const mg = ventures(s).mg;
  if (mg.owner === 'label') post(s, `m12:${key}`, amount, 'business', memo);
  else ownerOf(s).wealth += amount;
  if (c && amount > 0) { c.earned += amount; mg.total += amount; }
}

// ---------------------------------------------------------------- tempo

export const agentCap = 4;
export function capacityHours(s: GameState): number { return (isActive(s, 'manager') ? 160 : 70) + mgr12(s).agents.length * 20; }
export function clientHours(s: GameState, id: string): number {
  const x = c12(s, id);
  if (x.agent) return 4;
  return Math.max(8, 26 - 6 * Object.values(x.team).filter(Boolean).length);
}
export const demandHours = (s: GameState) => ventures(s).mg.clients.reduce((t, c) => t + clientHours(s, c.actId), 0);
registerLoad('manager12', (s) => Math.max(0, demandHours(s) / Math.max(1, capacityHours(s)) - 1) * 0.4);

// ---------------------------------------------------------------- entender as ambições

export const talkReady = (s: GameState, id: string) => !c12(s, id).talkW || s.week - c12(s, id).talkW! >= 13;
export function talk(s: GameState, id: string): Res {
  const a = s.acts[id];
  if (!a || !clientOf(s, id)) return bad(INVALID);
  const x = c12(s, id);
  if (!talkReady(s, id)) return bad(l('Vocês conversaram há pouco.', 'You talked recently.'));
  x.talkW = s.week;
  const first = !x.known;
  x.known = true;
  trust(s, id, first ? 4 : 1);
  const am = ambitionsOf(s, id).map((k) => AMB_NAME[k].pt).join(' + ');
  return { ok: true, text: first ? fmtL(l('Longa conversa com {a}. Sonha com: {m}. (+4 de confiança)', 'Long talk with {a}. Dreams of: {m}. (+4 trust)'), { a: a.name, m: am }) : fmtL(l('Conversa com {a} (+1 de confiança).', 'Talk with {a} (+1 trust).'), { a: a.name }) };
}

// ---------------------------------------------------------------- plano de carreira

export const clashesOf = (goals: Amb[]) => CLASH.filter(([x, y]) => goals.includes(x) && goals.includes(y));
export const planStepKinds: Record<Amb, SvcKind[]> = { money: ['booking', 'festival', 'label'], recognition: ['festival', 'media', 'label'], genre: ['producer', 'studio'], family: [], international: ['booking', 'festival'], art: ['studio', 'producer'] };

export function proposePlan(s: GameState, id: string, goals: Amb[], target?: string): Res {
  const a = s.acts[id];
  if (!a || !clientOf(s, id)) return bad(INVALID);
  goals = [...new Set(goals)].slice(0, 3);
  if (!goals.length) return bad(l('Escolha ao menos uma meta.', 'Pick at least one goal.'));
  if (goals.includes('genre') && (!target || target === a.genre)) return bad(l('Escolha o gênero novo.', 'Pick the new genre.'));
  const x = c12(s, id);
  const amb = ambitionsOf(s, id);
  const match = goals.filter((g) => amb.includes(g)).length;
  if (!match) {
    trust(s, id, -3);
    return bad(fmtL(l('{a} não se reconhece nesse plano: "isso é o que VOCÊ quer". (−3 de confiança){h}', '{a} does not see themselves in this plan: "that is what YOU want". (−3 trust){h}'), { a: a.name, h: x.known ? '' : l(' Converse antes para saber o que ele quer.', ' Talk first to learn what they want.') }));
  }
  let d = 4 * match - 3 * (goals.length - match);
  if (x.plan && s.week - x.plan.w < 26) d -= 3;
  trust(s, id, d);
  x.plan = { w: s.week, steps: 0, broken: 0, target: goals.includes('genre') ? target : undefined, goals: goals.map((k) => ({ k, base: k === 'money' ? a.cash : k === 'recognition' ? a.fame : 0 })) };
  x.flags = {};
  if (goals.includes('family')) x.promises.push({ k: 'family', w: s.week, t: l('Prometeu preservar o tempo com a família.', 'Promised to protect family time.') });
  const cl = clashesOf(goals);
  book(x, fmtL(l('Plano acordado: {g}.', 'Plan agreed: {g}.'), { g: goals.map((g) => AMB_NAME[g].pt).join(', ') }));
  return { ok: true, text: fmtL(l('Plano acordado com {a} ({d} de confiança).{c}', 'Plan agreed with {a} ({d} trust).{c}'), { a: a.name, d: d >= 0 ? `+${d}` : d, c: cl.length ? fmtL(l(' Atenção: {x}.', ' Careful: {x}.'), { x: cl.map((c) => c[2].pt).join('; ') }) : '' }) };
}

function goalMet(s: GameState, a: Act, x: C12, g: PlanGoal): boolean {
  if (g.k === 'money') return a.cash >= g.base + money(s, 4000 + a.fame * 300);
  if (g.k === 'recognition') return a.fame >= g.base + 8;
  if (g.k === 'genre') return !!x.plan?.target && a.genre === x.plan.target;
  if (g.k === 'international') return !!x.flags.intl;
  if (g.k === 'art') return !!x.flags.art;
  return !x.promises.some((p) => p.k === 'family' && p.kept === false && p.w >= x.plan!.w);
}

/** Reinvenção (meta de mudar de gênero): o público estranha no começo. */
export function reinvent(s: GameState, id: string): Res {
  const a = s.acts[id];
  const x = c12(s, id);
  if (!a || !x.plan?.target || a.genre === x.plan.target) return bad(INVALID);
  if (!x.mandate.areas.includes('recordings')) return bad(l('O mandato não cobre gravações.', 'The mandate does not cover recordings.'));
  a.genre = x.plan.target;
  a.momentum = clamp(a.momentum - 15, 0, 100);
  a.fans.casual = Math.round(a.fans.casual * 0.85);
  x.plan.steps += 1;
  trust(s, id, 3);
  return { ok: true, text: fmtL(l('{a} vira a chave para {g}: parte do público estranha (−15% de fãs casuais), mas o artista se sente ouvido.', '{a} switches to {g}: some fans balk (−15% casual fans), but the act feels heard.'), { a: a.name, g: GENRES.find((g) => g.id === a.genre)?.name ?? a.genre }) };
}

// ---------------------------------------------------------------- mandato

export function mandateChance(s: GameState, id: string, m: Omit<Mandate, 'until'>): number {
  const x = c12(s, id);
  return clamp(0.3 + (x.trust - 50) / 60 - (m.rate - 0.15) * 6 - (m.excl ? 0.15 : 0) - (m.auto === 2 ? 0.15 : m.auto === 0 ? -0.05 : 0) - m.areas.length * 0.02
    + (x.team.law ? 0.08 : 0) + (ownerOf(s).attrs.negotiation - 50) / 300 - x.pressured * 0.06 - x.promises.filter((p) => p.kept === false).length * 0.08, 0.03, 0.95);
}
export function negotiateMandate(s: GameState, r: Rng, id: string, m: Omit<Mandate, 'until'>): Res {
  const a = s.acts[id];
  const c = clientOf(s, id);
  if (!a || !c || !m.areas.length) return bad(INVALID);
  const x = c12(s, id);
  if (x.negW && s.week - x.negW < 13) return bad(l('O mandato foi discutido há pouco.', 'The mandate was discussed recently.'));
  x.negW = s.week;
  m = { ...m, rate: clamp(m.rate, 0.08, 0.25) };
  if (!r.chance(mandateChance(s, id, m))) {
    trust(s, id, -3);
    return bad(fmtL(l('{a} não assina esse mandato (−3 de confiança). Menos comissão, menos exclusividade ou mais confiança ajudam.', '{a} will not sign that mandate (−3 trust). Lower commission, no exclusivity or more trust help.'), { a: a.name }));
  }
  x.mandate = { ...m, until: s.week + 104 };
  c.rate = m.rate;
  book(x, fmtL(l('Mandato assinado: {ar}, {p}%{e}.', 'Mandate signed: {ar}, {p}%{e}.'), { ar: m.areas.map((k) => AREA_NAME[k].pt).join('/'), p: Math.round(m.rate * 100), e: m.excl ? l(', exclusivo', ', exclusive') : '' }));
  return { ok: true, text: fmtL(l('{a} assina o mandato por dois anos.', '{a} signs the mandate for two years.'), { a: a.name }) };
}

// ---------------------------------------------------------------- equipe

export const teamCost = (s: GameState, k: TeamRole) => money(s, TEAM_COST[k]);
export function toggleTeam(s: GameState, id: string, k: TeamRole): Res {
  const x = c12(s, id);
  if (!clientOf(s, id)) return bad(INVALID);
  x.team[k] = !x.team[k];
  return { ok: true, text: x.team[k] ? fmtL(l('{k} contratado: {v}/mês, menos horas suas por este cliente.', '{k} hired: {v}/mo, fewer of your hours on this client.'), { k: TEAM_NAME[k], v: `$${Math.round(teamCost(s, k) / 100)}` }) : fmtL(l('{k} dispensado.', '{k} let go.'), { k: TEAM_NAME[k] }) };
}

// ---------------------------------------------------------------- serviços (mercado da rodada 12)

registerContactBonus('manager12', (s, kind, by) => {
  if (!by.startsWith('mgr:')) return 0;
  const x = mgr12(s).c[by.slice(4)];
  return contactsFor(s, kind) / 100 + ventures(s).mg.rep / 400 + (x?.team.book && (kind === 'booking' || kind === 'festival') ? 0.08 : 0) + (x?.team.pub && kind === 'media' ? 0.08 : 0);
});

export function canArrange(s: GameState, id: string, provId: string): L | null {
  const x = c12(s, id);
  const p = providerById(s, provId);
  const a = s.acts[id];
  if (!p || !a) return INVALID;
  const ar = AREA_OF[p.kind];
  if (ar && !x.mandate.areas.includes(ar)) return fmtL(l('Fora do mandato: {k}.', 'Outside the mandate: {k}.'), { k: AREA_NAME[ar] });
  if (isForeign(s, a, p) && SVC[p.kind].pays && !x.mandate.areas.includes('international')) return l('Fora do mandato: internacional.', 'Outside the mandate: international.');
  if (p.kind === 'label' && a.owner) return l('Já tem gravadora.', 'Already signed.');
  return null;
}

/** O empresário pede um serviço em nome do cliente. Contraproposta fica guardada para aceitar ou não. */
export function arrange(s: GameState, r: Rng, id: string, provId: string, amount: number): Ask {
  const e = canArrange(s, id, provId);
  if (e) return { status: 'refused', price: 0, text: e };
  const x = c12(s, id);
  const ask = requestService(s, r, provId, id, amount, `mgr:${id}`);
  if (ask.status === 'counter') x.counter = { prov: provId, price: ask.price, w: s.week };
  if (ask.status !== 'accepted') return ask;
  const done = close(s, r, id, provId, amount);
  return { ...ask, status: done.ok ? 'accepted' : 'refused', text: done.text };
}
export function acceptCounter(s: GameState, r: Rng, id: string): Res {
  const x = c12(s, id);
  if (!x.counter || s.week - x.counter.w > 2) { x.counter = undefined; return bad(l('A contraproposta expirou.', 'The counteroffer expired.')); }
  const { prov, price } = x.counter;
  x.counter = undefined;
  return close(s, r, id, prov, price);
}
function close(s: GameState, r: Rng, id: string, provId: string, price: number): Res {
  const a = s.acts[id]!;
  const x = c12(s, id);
  const p = providerById(s, provId)!;
  const mg = ventures(s).mg;
  const charge = !SVC[p.kind].pays;
  const fronted = charge && a.cash < price;
  if (fronted && funds(s, mg.owner) < price) return bad(l('Nem o artista nem você têm o dinheiro.', 'Neither the act nor you have the money.'));
  const res = signService(s, r, provId, id, price, `mgr:${id}`, fronted ? mg.owner : 'act');
  if (!res.ok) return res;
  if (fronted) trust(s, id, 2);
  if (x.mandate.auto === 0) trust(s, id, 1);
  if (x.plan && x.plan.goals.some((g) => planStepKinds[g.k].includes(p.kind))) x.plan.steps += 1;
  const how = x.mandate.auto === 0 ? l(' Você consultou o artista antes (+1).', ' You consulted the act first (+1).') : x.mandate.auto === 2 ? l(' Carta branca: se der errado, a culpa é toda sua.', ' Free hand: if it goes wrong, it is all on you.') : '';
  return { ok: true, text: fmtL(l('{t}{f}{h}', '{t}{f}{h}'), { t: res.text, f: fronted ? l(' Você adiantou o dinheiro (+2 de confiança).', ' You fronted the money (+2 trust).') : '', h: how }) };
}

onServiceOutcome('manager12', (s, c, ok, text) => {
  if (!c.by.startsWith('mgr:')) return;
  const id = c.by.slice(4);
  const cl = clientOf(s, id);
  const a = s.acts[id];
  if (!cl || !a) return;
  const x = c12(s, id);
  const p = providerById(s, c.prov);
  if (ok) {
    const ar = AREA_OF[c.kind];
    if (SVC[c.kind].pays && (!ar || x.mandate.areas.includes(ar))) pay(s, c.price * cl.rate, `svc:${c.id}`, `Comissão ${a.name}: ${c.pname}`, cl);
    if (p && SVC[c.kind].pays && isForeign(s, a, p)) x.flags.intl = true;
    if (c.kind === 'studio' || c.kind === 'producer') x.flags.art = true;
    trust(s, id, 2);
    book(x, text);
  } else {
    x.issue = { t: text, w: s.week };
    if (x.mandate.auto === 2) trust(s, id, -3);
  }
});

// ---------------------------------------------------------------- prestação de contas

/** Explicar: dói um pouco agora (menos se o plano foi respeitado). Esconder: nada agora, muito depois. */
export function answerIssue(s: GameState, id: string, how: 'explain' | 'hide'): Res {
  const x = c12(s, id);
  const a = s.acts[id];
  if (!x.issue || !a) return bad(INVALID);
  const t = x.issue.t;
  x.issue = undefined;
  if (how === 'hide') { x.hidden.push({ t, w: s.week }); return { ok: true, text: l('Você guarda o problema para si. Por enquanto.', 'You keep the problem to yourself. For now.') }; }
  const respected = !x.plan || x.plan.broken === 0;
  const d = respected ? -1 : -4;
  trust(s, id, d);
  book(x, fmtL(l('Você explicou: {t}', 'You explained: {t}'), { t }));
  return { ok: true, text: fmtL(respected ? l('{a} entende: o tropeço estava dentro do plano ({d}).', '{a} understands: the stumble was within the plan ({d}).') : l('{a} aceita a explicação, mas o plano já vinha sendo descumprido ({d}).', '{a} accepts it, but the plan had already been broken ({d}).'), { a: a.name, d }) };
}

// ---------------------------------------------------------------- dilema: turnê internacional × família

export function resolveDilemma(s: GameState, id: string, m: DilemmaMove): Res {
  const x = c12(s, id);
  const a = s.acts[id];
  const c = clientOf(s, id);
  if (!x.dilemma || !a || !c) return bad(INVALID);
  if (m === 'other' && !x.mandate.areas.includes('endorsements')) return bad(l('Patrocínios estão fora do mandato.', 'Endorsements are outside the mandate.'));
  if (m === 'pressure' && x.trust < 60) return bad(l('Falta confiança para pressionar.', 'Not enough trust to push.'));
  const g = x.dilemma.gross;
  x.dilemma = undefined;
  const share = m === 'full' || m === 'pressure' ? 1 : m === 'fewer' ? 0.4 : m === 'other' ? 0.3 : 0;
  if (share) {
    pay(s, g * share * c.rate, `intl:${id}:${s.week}`, `Comissão internacional ${a.name}`, c);
    a.cash += Math.round(g * share * (1 - c.rate) * 0.3);
    if (m !== 'other') { a.fame = clamp(a.fame + Math.round(3 * share), 0, 100); x.flags.intl = true; }
  }
  const fam = x.promises.find((p) => p.k === 'family' && p.kept === undefined);
  let t: L;
  if (m === 'full') {
    trust(s, id, -18);
    if (fam) fam.kept = false; else x.promises.push({ k: 'family', w: s.week, kept: false, t: l('Turnê longa por cima da família.', 'Long tour over family.') });
    if (x.plan) x.plan.broken += 1;
    t = fmtL(l('{a} cumpre a turnê inteira, mas não esquece: você escolheu o dinheiro (−18).', '{a} plays the whole tour but will not forget: you chose the money (−18).'), { a: a.name });
    remember(s, 'manager12', t);
  } else if (m === 'pressure') {
    trust(s, id, -8);
    x.pressured += 1;
    t = fmtL(l('Você convence {a} a ir. A pressão fica registrada (−8; pesa na renovação).', 'You talk {a} into going. The pressure is remembered (−8; weighs on renewal).'), { a: a.name });
    remember(s, 'manager12', t);
  } else if (m === 'fewer') { trust(s, id, 4); if (fam) fam.kept = true; t = fmtL(l('Menos datas, voltas para casa: {a} agradece (+4).', 'Fewer dates, trips home: {a} is grateful (+4).'), { a: a.name }); }
  else if (m === 'other') { trust(s, id, 2); if (fam) fam.kept = true; t = fmtL(l('Você troca a turnê por um patrocínio: menos dinheiro, {a} em casa (+2).', 'You swap the tour for an endorsement: less money, {a} stays home (+2).'), { a: a.name }); }
  else { trust(s, id, 1); if (fam) fam.kept = true; t = fmtL(l('Você recusa a turnê por {a} (+1).', 'You turn the tour down for {a} (+1).'), { a: a.name }); }
  book(x, t);
  return { ok: !['full', 'pressure'].includes(m), text: t };
}

// ---------------------------------------------------------------- patrocínio

export const endorseReady = (s: GameState, id: string) => !c12(s, id).endW || s.week - c12(s, id).endW! >= 26;
export const endorseValue = (s: GameState, a: Act) => Math.round(money(s, 1500) * Math.pow(1 + a.fame / 10, 1.4));
export function endorse(s: GameState, id: string): Res {
  const a = s.acts[id];
  const c = clientOf(s, id);
  const x = c12(s, id);
  if (!a || !c) return bad(INVALID);
  if (!x.mandate.areas.includes('endorsements')) return bad(l('Patrocínios estão fora do mandato.', 'Endorsements are outside the mandate.'));
  if (!endorseReady(s, id)) return bad(l('Um patrocínio por semestre.', 'One endorsement per half-year.'));
  x.endW = s.week;
  const v = endorseValue(s, a);
  a.cash += Math.round(v * (1 - c.rate));
  pay(s, v * c.rate, `endorse:${id}:${s.week}`, `Comissão patrocínio ${a.name}`, c);
  const amb = ambitionsOf(s, id);
  const d = amb.includes('art') ? -4 : amb.includes('money') ? 3 : 0;
  trust(s, id, d);
  if (x.plan?.goals.some((g) => g.k === 'money')) x.plan.steps += 1;
  return { ok: true, text: fmtL(d < 0 ? l('Patrocínio fechado ({v}), mas {a} se sente vendido ({d}).', 'Endorsement closed ({v}), but {a} feels like a sellout ({d}).') : d > 0 ? l('Patrocínio fechado ({v}): {a} adora (+{d}).', 'Endorsement closed ({v}): {a} loves it (+{d}).') : l('Patrocínio fechado ({v}).', 'Endorsement closed ({v}).'), { v: `$${Math.round(v / 100).toLocaleString()}`, a: a.name, d }) };
}

// ---------------------------------------------------------------- agência: agentes, sucessão, talentos

export const agentSalary = (s: GameState) => money(s, 2500);
export const agentMax = (s: GameState) => 1 + Math.floor((ventures(s).mg.rep + mgr12(s).prestige) / 30);
export function hireAgent(s: GameState): Res {
  const st = mgr12(s);
  if (st.agents.length >= agentMax(s)) return bad(l('A agência ainda não comporta mais agentes (reputação e prestígio).', 'The agency cannot hold more agents yet (reputation and prestige).'));
  const r = Rng.fromSeed(`${s.config.seed}:agent12:${st.seq++}`);
  const ag: Agent = { id: `ag${st.seq}`, name: personName(r, langForCity(s.config.homeCity, r)), skill: r.int(35, 80), loyalty: r.int(50, 75), hired: s.week };
  st.agents.push(ag);
  return { ok: true, text: fmtL(l('{n} entra na agência (talento {k}).', '{n} joins the agency (skill {k}).'), { n: ag.name, k: ag.skill }) };
}
export function assignAgent(s: GameState, id: string, agentId?: string): Res {
  const x = c12(s, id);
  if (agentId && !mgr12(s).agents.some((g) => g.id === agentId)) return bad(INVALID);
  if (agentId && Object.values(mgr12(s).c).filter((y) => y !== x && y.agent === agentId).length >= agentCap) return bad(l('Esse agente já está no limite.', 'That agent is at capacity.'));
  x.agent = agentId || undefined;
  if (!agentId) x.bond = 0;
  return { ok: true, text: agentId ? l('Cliente entregue ao agente: menos horas suas, mas o vínculo passa a ser com ele.', 'Client handed to the agent: fewer of your hours, but the bond shifts to them.') : l('Você volta a cuidar pessoalmente.', 'You take personal care again.') };
}
export function raiseAgent(s: GameState, agentId: string): Res {
  const g = mgr12(s).agents.find((x) => x.id === agentId);
  if (!g) return bad(INVALID);
  if (g.raiseW && s.week - g.raiseW < 52) return bad(l('Já recebeu aumento este ano.', 'Already got a raise this year.'));
  const cost = money(s, 5000);
  if (funds(s, ventures(s).mg.owner) < cost) return bad(l('Sem dinheiro.', 'Not enough money.'));
  pay(s, -cost, `raise:${g.id}:${s.week}`, `Bônus ${g.name}`);
  g.raiseW = s.week;
  g.loyalty = clamp(g.loyalty + 15, 0, 100);
  return { ok: true, text: fmtL(l('{n} fica mais leal (+15).', '{n} grows more loyal (+15).'), { n: g.name }) };
}
export function fireAgent(s: GameState, agentId: string): void {
  const st = mgr12(s);
  st.agents = st.agents.filter((g) => g.id !== agentId);
  for (const x of Object.values(st.c)) if (x.agent === agentId) { x.agent = undefined; x.bond = 0; }
  if (st.successor === agentId) st.successor = undefined;
}
export function setSuccessor(s: GameState, agentId?: string): void { mgr12(s).successor = agentId; }

export function devCandidates(s: GameState): Act[] {
  const taken = new Set(ventures(s).mg.clients.map((c) => c.actId));
  return Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && !a.playerBand && a.fame < 8 && !taken.has(a.id)).sort((a, b) => b.momentum - a.momentum).slice(0, 12);
}
export function signDev(s: GameState, r: Rng, id: string): Res {
  const a = s.acts[id];
  const mg = ventures(s).mg;
  if (!a || mg.clients.some((c) => c.actId === id)) return bad(INVALID);
  if (mg.clients.length >= mgCap(s) + mgr12(s).agents.length * 2) return bad(l('Você não dá conta de mais artistas.', 'You cannot handle more acts.'));
  if (!r.chance(clamp(0.55 + mg.rep / 300 + originTrust(s) / 100, 0.2, 0.9))) return bad(fmtL(l('{a} prefere seguir sozinho por enquanto.', '{a} would rather go it alone for now.'), { a: a.name }));
  mg.clients.push({ actId: id, rate: 0.2, since: s.week, sat: 70, earned: 0 });
  const x = c12(s, id);
  x.dev = true;
  x.trust = clamp(x.trust + 12, 0, 100);
  x.mandate.legacy = false;
  return { ok: true, text: fmtL(l('Você aposta em {a}, um desconhecido: muita confiança, pouco dinheiro agora.', 'You bet on {a}, an unknown: lots of trust, little money for now.'), { a: a.name }) };
}

export const agencyTier = (s: GameState): L => {
  const n = ventures(s).mg.clients.length + mgr12(s).agents.length * 3;
  return n >= 18 ? l('Grande agência', 'Major agency') : n >= 10 ? l('Agência', 'Agency') : n >= 5 ? l('Escritório', 'Office') : l('Butique pessoal', 'Personal boutique');
};

// ---------------------------------------------------------------- mês

function managerMonth(s: GameState, r: Rng): void {
  const st = mgr12(s);
  const mg = ventures(s).mg;
  const o = ownerOf(s);
  // sucessão: troca de geração do dono
  if (o.generation !== st.gen) {
    st.gen = o.generation;
    const succ = st.agents.find((g) => g.id === st.successor);
    for (const c of mg.clients) trust(s, c.actId, succ ? -2 : -12);
    if (succ) succ.loyalty = clamp(succ.loyalty + 20, 0, 100);
    if (mg.clients.length) notify(s, succ ? fmtL(l('{n} segura a agência na transição: os artistas mal sentem a troca.', '{n} holds the agency through the transition: clients barely notice.'), { n: succ.name }) : l('Sem sucessor preparado, os agenciados desconfiam do novo dono (−12 de confiança).', 'With no successor groomed, clients distrust the new owner (−12 trust).'), succ ? 'good' : 'bad');
  }
  const cap = capacityHours(s);
  const demand = demandHours(s);
  const short = demand > cap ? demand / cap - 1 : 0;
  const personal = mg.clients.filter((c) => !c12(s, c.actId).agent).length;
  for (const c of mg.clients.slice()) {
    const a = s.acts[c.actId];
    if (!a) continue;
    const x = c12(s, a.id);
    // equipe: custo mensal; sem dinheiro, a equipe sai
    for (const k of Object.keys(x.team) as TeamRole[]) if (x.team[k]) {
      if (funds(s, mg.owner) < teamCost(s, k)) { x.team[k] = false; notify(s, fmtL(l('Sem dinheiro: {k} de {a} foi embora.', 'Out of money: {a}\'s {k} left.'), { k: TEAM_NAME[k], a: a.name }), 'bad'); }
      else pay(s, -teamCost(s, k), `team:${a.id}:${k}`, `${TEAM_NAME[k].pt} ${a.name}`);
    }
    // tempo e atenção
    if (x.agent) x.bond = clamp(x.bond + 2, 0, 100);
    else if (short > 0) { trust(s, a.id, -Math.min(4, short * 6)); if (short > 0.2 && r.chance(0.3)) book(x, l('Você sumiu este mês: sem tempo para mim.', 'You vanished this month: no time for me.')); }
    else if (personal <= 3) trust(s, a.id, 0.7);
    if (x.team.pub && c.crisis) trust(s, a.id, 1);
    // problemas escondidos podem vir à tona
    for (const hd of x.hidden.slice()) if (r.chance(0.12)) {
      x.hidden = x.hidden.filter((y) => y !== hd);
      trust(s, a.id, -15);
      if (x.plan) x.plan.broken += 1;
      const t = fmtL(l('{a} descobriu o que você escondeu: "{t}" (−15 de confiança).', '{a} found out what you hid: "{t}" (−15 trust).'), { a: a.name, t: hd.t });
      book(x, t);
      notify(s, t, 'bad');
    }
    if (x.issue && s.week - x.issue.w > 8) { x.hidden.push(x.issue); x.issue = undefined; }
    if (!x.issue && r.chance(0.025)) x.issue = { w: s.week, t: r.pick([l('Um promotor não pagou o cachê inteiro.', 'A promoter shorted the fee.'), l('Erro no extrato de royalties.', 'An error in the royalty statement.'), l('Uma data foi vendida em dobro.', 'A date was double-booked.')]) };
    // contraproposta expira
    if (x.counter && s.week - x.counter.w > 2) x.counter = undefined;
    // dilema: turnê internacional × família
    const fam = ambitionsOf(s, a.id).includes('family') || x.plan?.goals.some((g) => g.k === 'family');
    if (x.dilemma && s.week - x.dilemma.w > 6) { x.dilemma = undefined; trust(s, a.id, 1); }
    else if (!x.dilemma && fam && a.fame >= 20 && x.mandate.areas.includes('shows') && r.chance(0.05)) {
      x.dilemma = { gross: Math.round(grossShows(s, a) * 10), w: s.week };
      notify(s, fmtL(l('Turnê internacional milionária para {a} — mas há a promessa à família. Decida em Gestão de artistas.', 'A lucrative international tour for {a} — but there is the family promise. Decide in Artist management.'), { a: a.name }), 'event');
    }
    // exclusividade: o artista recusa sozinho o assédio de rivais
    const x11 = cxOf(s, a.id);
    if (x11.poach && x.mandate.excl && x.trust >= 60) { book(x, fmtL(l('Recusou sozinho o empresário {b}: "tenho contrato exclusivo".', 'Turned down manager {b} alone: "I have an exclusive deal".'), { b: x11.poach.by })); x11.poach = undefined; }
    // plano: revisão anual
    if (x.plan) {
      for (const g of x.plan.goals) if (!g.done && g.k !== 'family' && goalMet(s, a, x, g)) { g.done = true; trust(s, a.id, 6); book(x, fmtL(l('Meta do plano cumprida: {g} (+6).', 'Plan goal met: {g} (+6).'), { g: AMB_NAME[g.k] })); }
      if (s.week - x.plan.w >= 52) {
        const fl = x.plan.goals.filter((g) => !(g.done || (g.k === 'family' && goalMet(s, a, x, g))));
        const respected = x.plan.broken === 0 && x.plan.steps > 0;
        const d = fl.length ? (respected ? -1 : -6) * fl.length : 3;
        trust(s, a.id, d);
        book(x, fl.length ? fmtL(respected ? l('Revisão do plano: {n} meta(s) falharam, mas o plano foi seguido — fracasso tolerado ({d}).', 'Plan review: {n} goal(s) missed, but the plan was followed — failure tolerated ({d}).') : l('Revisão do plano: {n} meta(s) falharam e o plano foi abandonado ({d}).', 'Plan review: {n} goal(s) missed and the plan was abandoned ({d}).'), { n: fl.length, d }) : l('Revisão do plano: tudo cumprido (+3).', 'Plan review: everything delivered (+3).'));
        x.plan = undefined;
        notify(s, fmtL(l('Ano do plano de {a} encerrado. Hora de acordar o próximo.', '{a}\'s plan year is over. Time to agree the next one.'), { a: a.name }));
      }
    }
    // desenvolvimento de talentos
    if (x.dev && !x.devDone && a.fame >= 30) {
      x.devDone = true; st.devHits += 1; st.prestige += 10; mg.rep = clamp(mg.rep + 3, 0, 100);
      const t = fmtL(l('Você descobriu {a}: de desconhecido a nome nacional.', 'You discovered {a}: from unknown to a household name.'), { a: a.name });
      remember(s, 'manager12', t); notify(s, t, 'good');
    }
    // confiança puxa a satisfação; renovação do mandato
    c.sat = clamp(c.sat + (x.trust - c.sat) * 0.1, 0, 100);
    if (x.mandate.until <= s.week) {
      const p = clamp(x.trust / 100 + 0.2 - x.pressured * 0.08 - x.promises.filter((q) => q.kept === false).length * 0.1, 0.05, 0.98);
      if (r.chance(p)) { x.mandate = { ...x.mandate, until: s.week + 104, legacy: false }; book(x, l('Mandato renovado por mais dois anos.', 'Mandate renewed for two more years.')); }
      else {
        dropClient(s, a.id);
        mg.fired.push({ actId: a.id, y: s.year });
        const t = fmtL(l('{a} não renova o mandato com você.', '{a} does not renew the mandate with you.'), { a: a.name });
        remember(s, 'manager12', t); notify(s, t, 'bad');
        continue;
      }
    }
  }
  // agentes: salário, lealdade e saída levando estrelas
  for (const g of st.agents.slice()) {
    pay(s, -agentSalary(s), `agent:${g.id}`, `Salário ${g.name}`);
    const mine = mg.clients.filter((c) => c12(s, c.actId).agent === g.id);
    const stars = mine.filter((c) => (s.acts[c.actId]?.fame ?? 0) >= 50).length;
    g.loyalty = clamp(g.loyalty - 0.6 - stars * 0.8 + (st.successor === g.id ? 0.8 : 0) + st.prestige / 200, 0, 100);
    if (g.loyalty < 35 && r.chance(0.1)) {
      const took = mine.filter((c) => c12(s, c.actId).bond > c12(s, c.actId).trust);
      for (const c of took) dropClient(s, c.actId);
      fireAgent(s, g.id);
      st.alumni.push({ name: g.name, y: s.year, took: took.map((c) => c.actId) });
      if (st.alumni.length > 10) st.alumni.shift();
      mg.rep = clamp(mg.rep - took.length * 2, 0, 100);
      const t = took.length ? fmtL(l('{n} sai para abrir a própria agência e leva {a}.', '{n} leaves to start an agency and takes {a}.'), { n: g.name, a: took.map((c) => s.acts[c.actId]?.name ?? '?').join(', ') }) : fmtL(l('{n} sai da agência.', '{n} leaves the agency.'), { n: g.name });
      remember(s, 'manager12', t); notify(s, t, 'bad');
    }
  }
  for (const id of Object.keys(st.c)) if (!mg.clients.some((c) => c.actId === id)) delete st.c[id];
  // prestígio: carreiras duradouras e clientes satisfeitos
  if (s.month === 0 && mg.clients.length) {
    const durable = mg.clients.filter((c) => s.week - c.since >= 260).length;
    const avg = mg.clients.reduce((t, c) => t + c12(s, c.actId).trust, 0) / mg.clients.length;
    st.prestige = Math.max(0, Math.round(st.prestige * 0.92 + durable * 2 + (avg - 50) / 10));
    mg.rep = clamp(mg.rep + st.prestige / 100, 0, 100);
  }
}

registerSimHook('month', 'manager12', (s) => managerMonth(s, Rng.fromSeed(`${s.config.seed}:manager12:${s.year}:${s.month}`)));
