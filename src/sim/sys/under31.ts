// R31 · onda 4 (S) — O SUBMUNDO NO NOSSO MUNDO. Uma camada de LUGAR por cima dos sistemas que já existem (crime17,
// crimemem23, mob29, aff29), sem regra paralela:
//  · Fachadas: só as facções que operam no PAÍS da sua sede (de 1 a 3) têm fachada fixa na cidade — restaurante,
//    boate, galpão no porto, cassino, barracão do baile, gabinete —, conforme o tipo e o país; a facção do país com base
//    em outra cidade aparece só como CONTATO (o emissário no bar). Mudar a sede de país muda quem aparece.
//  · Polícia: mais calor no país = mais viaturas e paradas (crime17.heat).
//  · Sala dos fundos (uma por facção): chefe e tenentes conhecidos (crimemem23), pedidos em aberto e envelopes do que
//    você deve e do que te devem (mob29.favorRows29); aceitar, recusar, negociar, pagar, denunciar — as funções do mob29.
//  · Mural de ligações (na sua sede): facções do país e as de fora já contatadas; fios facção×facção (rixa), facção×
//    artista (laço de rua), facção×gênero (aff29) e os seus favores e dívidas — cada fio conta a história.
//  · Delegacia com cadeia: as celas mostram quem está preso agora (crime17.jail), com o tempo que falta; o detetive do
//    seu caso, sua pasta (casos abertos e indícios), o calor; visitar, fiança e advogado (estes dois atrás do interruptor
//    'under31', regra econômica nova); no seu caso indiciado, as saídas de sempre (crime17.resolveCase).
//  · Mercado negro: estoque que GIRA na virada do mês como o da loja — cópias piratas de sucessos e equipamento roubado
//    (objetos individuais, r31/object) — e, raramente, a relíquia roubada que já existe (crime17.market). Barato, com
//    risco de apreensão e escândalo; na lista de donos fica "comprada no mercado negro".
//  · Baile: o convite em aberto da facção (pedido 'baile' do mob29/aff29) vira cena: tocar até o fim, sair antes ou
//    chamar a imprensa — o resultado é o das regras de sempre.
// Geração só no motor (gancho do mês); as cenas só leem. Sorte própria: Rng.fromSeed('under31|…').

import { Rng, clamp } from '../../core/rng';
import { countryName } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { holds17 } from '../holds17';
import { opine } from '../opinion';
import { cashWhy20, freeCash20 } from '../oblig20';
import { createObj, obj31, offer, removeObj, takeOffer, withdraw } from '../r31/object';
import { CO31 } from '../r31/relic31';
import { registerEditable, registerRunnable } from '../r31/editor';
import { registerSwitch, sw } from '../r31/switches';
import { withTxn } from '../r31/txn';
import { ITEMS31, items31, itemPrice31 } from '../r31/items31';
import { scandal } from '../scandal17';
import { meet31, meNode31, node31 } from '../social31';
import type { GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { orgAff29 } from './aff29';
import { RANK23, knownMembers23, name23 } from './crimemem23';
import {
  PLEA17, a3Of, addHeat, agency, bossName, buyOffer, crime17, fences, heatIn, myCases, orgById, orgs17, reportOrg, resolveCase, usd,
  type Case17, type Org17, type Plea,
} from './crime17';
import { relics } from './relics9';
import { asks29, delay29, doMob29, favorRows29, fulfill29, meter29, peek29, refuse29, type FavorRow29, type Meter29 } from './mob29';
import { UNDER27, npcName27, type Person27, type Under27 } from './place27';
import { actOfPid31 } from './where31';

// ---------------------------------------------------------------- interruptor e estado

registerSwitch({
  id: 'under31', def: true, scope: 'game',
  desc: l('Submundo na cidade: mercado negro com estoque que gira (cópias piratas e equipamento roubado), fiança e advogado na delegacia.',
    'Underworld in the city: black market with rotating stock (bootleg copies and stolen gear), bail and lawyers at the police station.'),
});
export const UNDER31 = {
  /** teto de fachadas na cidade */
  facades: 3,
  /** lucro das cópias piratas revendidas (fator sobre o preço pago) */
  copyResale: 1.6,
  /** desconto do equipamento roubado sobre o preço de loja */
  gearCut: 0.45,
};

export interface Copy31 { id: string; rel: string; n: number; price: number }
export interface Lot31 { rel: string; n: number; paid: number; w: number }
export interface Under31St {
  /** estoque do mês do mercado negro por cidade */
  bm: Record<string, { ym: string; copies: Copy31[]; gear: string[] }>;
  /** lotes de cópias compradas, à espera da revenda na virada do mês */
  lots: Lot31[];
  /** equipamento roubado comprado ainda "quente" (objeto → semana) */
  hotGear: Record<string, number>;
  /** visitas à cadeia (pessoa → semana) */
  vis: Record<string, number>;
  seq: number;
}
declare module '../ext4' { interface Ext4 { under31: Under31St } }
const fresh = (): Under31St => ({ bm: {}, lots: [], hotGear: {}, vis: {}, seq: 0 });
registerExt4('under31', fresh);
export function under31(s: GameState): Under31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.under31 ??= fresh()) as Under31St;
  st.bm ??= {}; st.lots ??= []; st.hotGear ??= {}; st.vis ??= {};
  return st;
}
const peek = (s: GameState): Under31St | undefined => (s.x4 as unknown as { under31?: Under31St }).under31;

// ---------------------------------------------------------------- facções do país

export const homeA3 = (s: GameState): string => a3Of(s, s.config.homeCity);
const down = (s: GameState, o: Org17): boolean => ((s.x4 as unknown as { crime17?: { down?: Record<string, number> } }).crime17?.down?.[o.id] ?? 0) > s.week;

/** Facções do país da sede nesta época: as da cidade têm fachada (até 3, as mais fortes); as de outra cidade do país, um emissário. */
export function localOrgs31(s: GameState): { here: Org17[]; via: Org17[] } {
  const a3 = homeA3(s);
  const all = orgs17(s, false, true).filter((o) => o.kind !== 'cyber' && o.a3 === a3 && !down(s, o)).sort((a, b) => b.power - a.power || (a.id < b.id ? -1 : 1));
  const inCity = all.filter((o) => o.city === s.config.homeCity);
  const here = inCity.slice(0, UNDER31.facades);
  return { here, via: all.filter((o) => !here.includes(o)) };
}
/** Facções de fora já contatadas (aparecem no mural). */
export function contacted31(s: GameState): Org17[] {
  const a3 = homeA3(s);
  const ids = new Set(Object.keys(peek29(s)?.o ?? {}));
  for (const h of holds17(s).h) if (h.status === 'open' && (h.holder.startsWith('o:') || h.target.startsWith('o:'))) ids.add((h.holder.startsWith('o:') ? h.holder : h.target).slice(2));
  return [...ids].map((id) => orgById(s, id)).filter((o): o is Org17 => !!o && o.a3 !== a3);
}

export type FacadeK31 = 'restaurant' | 'club' | 'warehouse' | 'casino' | 'barracao' | 'office';
export const FACADE31: Record<FacadeK31, { front: L; back: L }> = {
  restaurant: { front: l('Restaurante', 'Restaurant'), back: l('os fundos do restaurante', 'the back of the restaurant') },
  club: { front: l('Boate', 'Nightclub'), back: l('o escritório da boate', 'the club office') },
  warehouse: { front: l('Galpão no porto', 'Harbour warehouse'), back: l('o contêiner no porto', 'the container at the docks') },
  casino: { front: l('Cassino', 'Casino'), back: l('o escritório do cassino', 'the casino office') },
  barracao: { front: l('Barracão do baile', 'Dance hall shed'), back: l('o barracão do baile', 'the dance hall shed') },
  office: { front: l('Escritório de fachada', 'Front office'), back: l('o gabinete', 'the private office') },
};
/** A fachada da facção: pelo tipo, pelo país e pela época (cassino só onde e quando existe). */
export function facadeOf31(s: GameState, o: Org17): FacadeK31 {
  if (o.a3 === 'BRA' && (o.kind === 'gang' || o.rackets.includes('carnival'))) return o.rackets.includes('carnival') && o.kind === 'syndicate' ? 'casino' : 'barracao';
  if (o.kind === 'cartel') return 'warehouse';
  if (o.kind === 'mafia') return 'restaurant';
  if (o.kind === 'firm') return 'club';
  if (o.kind === 'syndicate') return o.rackets.includes('clubs') || s.year < 1946 ? 'club' : (o.a3 === 'USA' && s.year >= 1946) || o.a3 === 'JPN' ? 'casino' : 'office';
  return o.rackets.includes('clubs') ? 'club' : 'warehouse';
}
/** Nome da fachada (estável pela facção). */
export function facadeName31(s: GameState, o: Org17): L {
  const k = facadeOf31(s, o);
  const sur = npcName27(s, `fac31|${o.id}`).split(' ').slice(-1)[0];
  const T: Record<FacadeK31, L> = {
    restaurant: fmtL(l('Cantina {n}', 'Cantina {n}'), { n: sur }), club: fmtL(l('Clube {n}', 'Club {n}'), { n: sur }), warehouse: fmtL(l('Armazém {n}', '{n} Warehouse'), { n: sur }),
    casino: fmtL(l('Cassino {n}', '{n} Casino'), { n: sur }), barracao: fmtL(l('Barracão do {n}', '{n} Dance Hall'), { n: sur }), office: fmtL(l('{n} & Associados', '{n} & Associates'), { n: sur }),
  };
  return T[k];
}

// ---------------------------------------------------------------- polícia

export interface Police31 { heat: number; cars: number; stops: boolean; agency: L; text: L }
/** Calor do país → viaturas e paradas na região (de noite, mais movimento). */
export function police31(s: GameState): Police31 {
  const a3 = homeA3(s);
  const heat = heatIn(s, a3);
  const cars = heat >= 70 ? 4 : heat >= 45 ? 3 : heat >= 20 ? 2 : 1;
  const text = heat >= 70 ? l('Blitz em toda esquina: a região está quente.', 'Checkpoints on every corner: the area is hot.')
    : heat >= 45 ? l('Viaturas passam o tempo todo; paradas de vez em quando.', 'Patrol cars all the time; occasional stops.')
      : heat >= 20 ? l('Ronda normal.', 'Normal patrols.') : l('Polícia tranquila.', 'Quiet police.');
  return { heat, cars, stops: heat >= 45, agency: agency(s, a3), text };
}

// ---------------------------------------------------------------- sala dos fundos

export interface Face31 { name: string; key?: string; role: L }
export interface Room31 { o: Org17; facade: FacadeK31; name: L; boss: Face31; lts: Face31[]; rows: FavorRow29[]; meter: Meter29; contact: boolean }
/** Quem está na sala dos fundos e o que está na mesa (só leitura). */
export function room31(s: GameState, oid: string): Room31 | null {
  const o = orgById(s, oid);
  if (!o) return null;
  const boss: Face31 = { name: bossName(o).pt, key: o.key, role: l('Chefe', 'Boss') };
  const lts: Face31[] = knownMembers23(s, o.id).filter(([, m]) => m.rk >= 1).slice(0, 3).map(([k, m]) => ({ name: name23(s, k), key: k, role: RANK23[m.rk] }));
  const rows = favorRows29(s).filter((r) => r.o === o.id);
  return { o, facade: facadeOf31(s, o), name: facadeName31(s, o), boss, lts, rows, meter: meter29(s, o.id), contact: o.city !== s.config.homeCity };
}
/** Ações do chefe na mesa (as do mob29, com o motivo do bloqueio). */
export const ROOM_ACTS31 = ['approach', 'pizzo_pay', 'loan', 'paydebt', 'inform'] as const;
/** Executa uma linha da mesa (mesmo despacho do Cockpit): aceitar, recusar, negociar prazo, pagar. */
export function rowAct31(s: GameState, id: string): { ok: boolean; text: L } {
  if (id.startsWith('mob.ask:')) return fulfill29(s, id.slice(8));
  if (id.startsWith('mob.refuse:')) return refuse29(s, id.slice(11));
  if (id.startsWith('mob.delay:')) return delay29(s, id.slice(10));
  if (id.startsWith('mob.pay:')) return doMob29(s, id.slice(8), 'paydebt');
  return { ok: false, text: l('Ação desconhecida.', 'Unknown action.') };
}
/** Denunciar a facção (as consequências são as do crime17). */
export function denounce31(s: GameState, oid: string): { ok: boolean; text: L } {
  return { ok: true, text: reportOrg(s, oid) };
}

// ---------------------------------------------------------------- mural de ligações

export type NodeK31 = 'org' | 'act' | 'genre' | 'you';
export interface MNode31 { id: string; k: NodeK31; name: L; key?: string; actId?: string; local?: boolean }
export type EdgeK31 = 'war' | 'tie' | 'genre' | 'debt' | 'owed' | 'ask';
export interface MEdge31 { a: string; b: string; k: EdgeK31; story: L }
/** Facções do país e as de fora já contatadas; fios com a história. Só lê. */
export function mural31(s: GameState): { nodes: MNode31[]; edges: MEdge31[] } {
  const { here, via } = localOrgs31(s);
  const orgs = [...here, ...via, ...contacted31(s)];
  const ids = new Set(orgs.map((o) => o.id));
  const nodes: MNode31[] = orgs.map((o) => ({ id: `o:${o.id}`, k: 'org', name: o.name, key: o.key, local: o.a3 === homeA3(s) }));
  const edges: MEdge31[] = [];
  const add = (n: MNode31) => { if (!nodes.some((x) => x.id === n.id)) nodes.push(n); };
  const c17 = crime17(s);
  // facção × artista (laço de rua) e rixa entre artistas de facções diferentes → guerra entre as facções
  const mine = new Set(playerActs(s));
  for (const [actId, oid] of Object.entries(c17.ties)) {
    if (!ids.has(oid)) continue;
    const a = s.acts[actId];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    if (nodes.filter((x) => x.k === 'act').length >= 10 && !mine.has(actId)) continue;
    add({ id: `a:${actId}`, k: 'act', name: l(a.name, a.name), actId, local: mine.has(actId) });
    const o = orgById(s, oid)!;
    edges.push({ a: `o:${oid}`, b: `a:${actId}`, k: 'tie', story: fmtL(l('{a} tem laço de rua com {o}: toca nos eventos deles e carrega a fama.', '{a} has street ties to {o}: plays their events and carries the reputation.'), { a: a.name, o: o.name }) });
  }
  for (const [key, v] of Object.entries(c17.feud)) {
    if (v < 30) continue;
    const [x, y] = key.split('|');
    const ox = c17.ties[x], oy = c17.ties[y];
    if (!ox || !oy || ox === oy || !ids.has(ox) || !ids.has(oy)) continue;
    if (edges.some((e) => e.k === 'war' && ((e.a === `o:${ox}` && e.b === `o:${oy}`) || (e.a === `o:${oy}` && e.b === `o:${ox}`)))) continue;
    edges.push({ a: `o:${ox}`, b: `o:${oy}`, k: 'war', story: fmtL(l('Guerra: a rixa entre {x} e {y} arrastou {o} e {p}.', 'War: the feud between {x} and {y} dragged in {o} and {p}.'), { x: s.acts[x]?.name ?? '?', y: s.acts[y]?.name ?? '?', o: orgById(s, ox)!.name, p: orgById(s, oy)!.name }) });
  }
  // facção × gênero/cena (aff29)
  for (const o of orgs) for (const af of orgAff29(s, o.id).slice(0, 2)) {
    const g = af.genres[0] ?? af.fams?.[0];
    if (!g) continue;
    const gid = `g:${g}`;
    add({ id: gid, k: 'genre', name: af.scene });
    edges.push({ a: `o:${o.id}`, b: gid, k: 'genre', story: fmtL(l('{o} e a cena: {n}', '{o} and the scene: {n}'), { o: o.name, n: af.note }) });
  }
  // você: pedidos, favores e dívidas
  add({ id: 'you', k: 'you', name: l(s.config.companyName, s.config.companyName) });
  for (const r of favorRows29(s)) {
    if (!ids.has(r.o)) continue;
    edges.push({ a: 'you', b: `o:${r.o}`, k: r.kind === 'owe' ? 'debt' : r.kind === 'owed' ? 'owed' : 'ask', story: fmtL(l('{t} — {m}', '{t} — {m}'), { t: r.title, m: r.meta }) });
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------- delegacia e cadeia

export interface Cell31 { pid: string; name: string; a3: string; weeks: number; why: L; mine: boolean; actId?: string; org?: string }
/** Quem está preso agora no país da sede (seus e do mundo), com o tempo que falta. */
export function cells31(s: GameState): Cell31[] {
  const a3 = homeA3(s);
  const jail = (s.x4 as unknown as { crime17?: { jail?: Record<string, { u: number; a3: string; why: L }> } }).crime17?.jail ?? {};
  const mine = new Set(playerActs(s));
  const mem = (s.x4 as unknown as { crime17?: { mem23?: Record<string, { o: string; k: number }> } }).crime17?.mem23 ?? {};
  const out: Cell31[] = [];
  for (const [pid, j] of Object.entries(jail)) {
    if (j.u <= s.week || j.a3 !== a3) continue;
    const p = s.persons[pid];
    if (!p || !p.alive) continue;
    const a = actOfPid31(s, pid);
    const m = mem[`p:${pid}`];
    out.push({ pid, name: p.name, a3: j.a3, weeks: j.u - s.week, why: j.why, mine: !!a && mine.has(a.id), actId: a?.id, org: m && m.k >= 1 ? m.o : undefined });
  }
  return out.sort((x, y) => Number(y.mine) - Number(x.mine) || x.weeks - y.weeks || (x.pid < y.pid ? -1 : 1));
}
/** O detetive do seu caso (pessoa da delegacia, estável pela semente). */
export const detective31 = (s: GameState): string => npcName27(s, `det31|${homeA3(s)}`);
export interface File31 { cases: Case17[]; heat: number; known: L[] }
/** Sua pasta na mesa: casos abertos e o que a polícia já sabe. */
export function myFile31(s: GameState): File31 {
  const cases = myCases(s);
  const known: L[] = cases.map((c) => fmtL(l('{st}: indícios {e}/100, {n} crime(s){r}.', '{st}: evidence {e}/100, {n} crime(s){r}.'), {
    st: c.stage === 'charged' ? l('Indiciado', 'Charged') : l('Investigação', 'Investigation'), e: Math.round(c.ev), n: c.n, r: c.inf.length ? l(', com informante', ', with an informant') : l('', ''),
  }));
  return { cases, heat: heatIn(s, homeA3(s)), known };
}
export const bailCost31 = (s: GameState, c: Pick<Cell31, 'weeks'>): number => money(s, 1500 + c.weeks * 220);
export const lawyerCost31 = (s: GameState): number => money(s, 2500);

/** Motivo para não visitar/pagar fiança/advogado (null = pode). */
export function cellLock31(s: GameState, pid: string, what: 'visit' | 'bail' | 'lawyer'): L | null {
  const c = cells31(s).find((x) => x.pid === pid);
  if (!c) return l('Essa pessoa não está presa.', 'That person is not in prison.');
  if (what === 'visit') return (peek(s)?.vis[pid] ?? -99) > s.week - 4 ? l('Você visitou há pouco (uma visita por mês).', 'You visited recently (one visit a month).') : null;
  if (!sw<boolean>(s, 'under31')) return l('Fiança e advogado estão desligados nesta partida.', 'Bail and lawyers are off in this game.');
  const cost = what === 'bail' ? bailCost31(s, c) : lawyerCost31(s);
  if (what === 'bail' && c.weeks > 52) return l('Pena longa: o juiz não concede fiança.', 'Long sentence: the judge denies bail.');
  if (what === 'lawyer' && c.weeks < 3) return l('Já está para sair.', 'About to be released anyway.');
  return freeCash20(s) < cost ? cashWhy20(s, cost, l('Caixa insuficiente.', 'Not enough cash.')) : null;
}
/** Visitar o preso: vocês se conhecem (grafo social) e ele lembra (opinião, só via opinion.ts). */
export function visitCell31(s: GameState, pid: string): { ok: boolean; text: L } {
  const lk = cellLock31(s, pid, 'visit');
  if (lk) return { ok: false, text: lk };
  under31(s).vis[pid] = s.week;
  meet31(s, meNode31(s), node31(s, `p:${pid}`), 'visit');
  opine(s, `p:${pid}`, 4, l('Visitou na cadeia', 'Visited in prison'));
  return { ok: true, text: fmtL(l('Você visitou {p} na cadeia: ele(a) não esquece.', 'You visited {p} in prison: they won\'t forget.'), { p: s.persons[pid]?.name ?? '?' }) };
}
/** Fiança: sai agora (paga a empresa; pena curta). */
export function bail31(s: GameState, pid: string): { ok: boolean; text: L } {
  const lk = cellLock31(s, pid, 'bail');
  if (lk) return { ok: false, text: lk };
  const c = cells31(s).find((x) => x.pid === pid)!;
  const cost = bailCost31(s, c);
  withTxn({ payer: 'label', owner: 'label', beneficiary: `p:${pid}` }, () => post(s, `bail31:${pid}:${s.week}`, -cost, 'legal', `Fiança: ${c.name}`));
  const j = crime17(s).jail[pid];
  if (j) j.u = s.week;
  addHeat(s, 'player', homeA3(s), 2);
  opine(s, `p:${pid}`, 10, l('Pagou a fiança', 'Paid the bail'));
  emitFact(s, { kind: 'bail31', actors: ['player', pid], place: s.config.homeCity, severity: 20, visibility: 'public', tags: ['crime', 'jail'], src: 'under31',
    text: fmtL(l('{p} sai da cadeia sob fiança paga por {c}.', '{p} leaves prison on bail paid by {c}.'), { p: c.name, c: s.config.companyName }), diary: true });
  return { ok: true, text: fmtL(l('Fiança paga ({v}): {p} está solto(a).', 'Bail paid ({v}): {p} is out.'), { v: usd(cost), p: c.name }) };
}
/** Advogado: a pena cai um terço (recurso). */
export function lawyer31(s: GameState, pid: string): { ok: boolean; text: L } {
  const lk = cellLock31(s, pid, 'lawyer');
  if (lk) return { ok: false, text: lk };
  const c = cells31(s).find((x) => x.pid === pid)!;
  const cost = lawyerCost31(s);
  withTxn({ payer: 'label', owner: 'label', beneficiary: `p:${pid}` }, () => post(s, `law31:${pid}:${s.week}`, -cost, 'legal', `Advogado: ${c.name}`));
  const j = crime17(s).jail[pid];
  const cut = Math.max(1, Math.round(c.weeks / 3));
  if (j) j.u -= cut;
  opine(s, `p:${pid}`, 5, l('Pagou um advogado', 'Paid a lawyer'));
  return { ok: true, text: fmtL(l('O recurso tira {n} semana(s) da pena de {p}.', 'The appeal takes {n} week(s) off {p}\'s sentence.'), { n: cut, p: c.name }) };
}
/** Seu caso indiciado: as saídas de sempre (advogado = julgamento, subornar, colaborar = delação). */
export const CASE_WAYS31: { how: Plea; label: L }[] = [
  { how: 'trial', label: l('Pagar advogado e ir a julgamento', 'Hire a lawyer and go to trial') },
  { how: 'bribe', label: l('Subornar (com risco)', 'Bribe (risky)') },
  { how: 'plea', label: l('Colaborar (a facção não gosta)', 'Cooperate (the faction won\'t like it)') },
];
export function caseWay31(s: GameState, caseId: string, how: Plea): { ok: boolean; text: L } {
  const cs = myCases(s).find((c) => c.id === caseId);
  if (!cs) return { ok: false, text: l('Esse caso não está aberto.', 'That case is not open.') };
  if (cs.stage !== 'charged') return { ok: false, text: l('Ainda em investigação: não há o que decidir.', 'Still under investigation: nothing to decide yet.') };
  return { ok: true, text: resolveCase(s, cs.id, how) };
}
export const PLEA31 = PLEA17;

// ---------------------------------------------------------------- mercado negro

const ymOf = (s: GameState) => `${s.year}-${s.month}`;
const bmHolder = (city: string) => `bm:${city}`;
/** Gera o estoque do mês (só no motor): cópias piratas dos sucessos da parada e equipamento roubado. */
export function restockBm31(s: GameState, city = s.config.homeCity): void {
  const st = under31(s);
  const ym = ymOf(s);
  const old = st.bm[city];
  if (old?.ym === ym) return;
  for (const ofId of old?.gear ?? []) {
    const of = obj31(s).offers[ofId];
    if (!of) continue;
    const o = obj31(s).objs[of.objId];
    if (o && o.owner === bmHolder(city)) { removeObj(s, o.id); delete items31(s).d[o.id]; } else withdraw(s, ofId);
  }
  const r = Rng.fromSeed(`${s.config.seed}|under31|bm|${city}|${ym}`);
  const hits = s.charts.albums.slice(0, 15).map((e) => s.releases[e.releaseId]).filter((x) => !!x);
  const copies: Copy31[] = r.shuffle([...hits]).slice(0, 3).map((rel) => ({ id: `c${++st.seq}`, rel: rel.id, n: r.int(2, 6) * 50, price: Math.round(money(s, r.int(150, 420))) }));
  const pool = r.shuffle(ITEMS31.filter((d) => d.cat === 'instr' && s.year >= d.from && (!d.to || s.year <= d.to) && s.year - d.from >= 2)).slice(0, 3);
  const gear: string[] = [];
  for (const d of pool) {
    const made = Math.max(d.from, s.year - r.int(1, Math.min(30, s.year - d.from)));
    const cond = r.int(0, 2);
    const res = createObj(s, { modelId: `it:${d.id}`, origin: 'stolen', owner: bmHolder(city) });
    if (!res.ok) continue;
    items31(s).d[res.v.id] = { def: d.id, made, cond, prev: [], ev: [[s.year, l('Roubado e posto no mercado negro', 'Stolen and put on the black market')]] };
    const of = offer(s, res.v.id, bmHolder(city), Math.round(itemPrice31(s, d, { made, cond }) * UNDER31.gearCut));
    if (of.ok) gear.push(of.v.id);
  }
  st.bm[city] = { ym, copies, gear };
}
export interface BmRow31 { id: string; k: 'copies' | 'gear' | 'relic'; name: L; price: number; risk: number; note: L }
/** Risco de apreensão (0..1): calor do país e a época (perícia). */
export const seizeRisk31 = (s: GameState, k: BmRow31['k']): number => clamp((k === 'relic' ? 0.1 : k === 'gear' ? 0.06 : 0.08) + heatIn(s, homeA3(s)) / 300, 0.03, 0.6);
/** O que está à venda no beco (só leitura). */
export function bmRows31(s: GameState, city = s.config.homeCity): BmRow31[] {
  const st = peek(s)?.bm[city];
  const out: BmRow31[] = [];
  for (const c of st?.copies ?? []) {
    const rel = s.releases[c.rel];
    if (!rel) continue;
    out.push({ id: `copies:${c.id}`, k: 'copies', price: c.price, risk: seizeRisk31(s, 'copies'), name: fmtL(l('{n} cópias piratas de "{t}"', '{n} bootleg copies of "{t}"'), { n: c.n, t: rel.title }),
      note: fmtL(l('Revenda na virada do mês por ~{v}, se não apreenderem.', 'Resold at the month turn for ~{v}, unless seized.'), { v: usd(c.price * UNDER31.copyResale) }) });
  }
  for (const ofId of st?.gear ?? []) {
    const of = obj31(s).offers[ofId];
    const o = of ? obj31(s).objs[of.objId] : undefined;
    const d = o ? ITEMS31.find((x) => x.id === items31(s).d[o.id]?.def) : undefined;
    if (!of || !o || !d) continue;
    out.push({ id: `gear:${ofId}`, k: 'gear', price: of.price, risk: seizeRisk31(s, 'gear'), name: fmtL(l('{n} (roubado)', '{n} (stolen)'), { n: d.name }),
      note: l('Entra no acervo da empresa; se a polícia achar, perde a peça e vira escândalo.', 'Joins the company collection; if police find it, you lose it and it becomes a scandal.') });
  }
  for (const of of crime17(s).market) {
    const rl = relics(s).list.find((x) => x.id === of.rl);
    if (!rl || of.until <= s.week) continue;
    out.push({ id: `relic:${of.id}`, k: 'relic', price: of.price, risk: seizeRisk31(s, 'relic'), name: fmtL(l('Relíquia roubada: {n}', 'Stolen relic: {n}'), { n: rl.n }),
      note: fmtL(l('Pelo receptador {f}; pode ser falsa.', 'Through fence {f}; may be fake.'), { f: fences(s)[of.fence]?.name ?? l('do beco', 'of the alley') }) });
  }
  return out;
}
export function bmLock31(s: GameState, row: Pick<BmRow31, 'k' | 'price'>): L | null {
  if (!sw<boolean>(s, 'under31') && row.k !== 'relic') return l('O mercado negro da cidade está desligado nesta partida.', 'The city black market is off in this game.');
  if (s.config.role === 'artist' && row.k === 'copies') return l('Na carreira de artista você não tem loja para revender.', 'As an artist you have no shop to resell through.');
  return freeCash20(s) < row.price ? cashWhy20(s, row.price, l('Caixa insuficiente.', 'Not enough cash.')) : null;
}
/** Compra no beco. */
export function buyBm31(s: GameState, rowId: string, city = s.config.homeCity): { ok: boolean; text: L } {
  const row = bmRows31(s, city).find((x) => x.id === rowId);
  if (!row) return { ok: false, text: l('Isso já saiu do beco.', 'That has left the alley.') };
  const lk = bmLock31(s, row);
  if (lk) return { ok: false, text: lk };
  const st = under31(s);
  if (row.k === 'copies') {
    const bm = st.bm[city];
    const c = bm?.copies.find((x) => `copies:${x.id}` === rowId);
    if (!bm || !c) return { ok: false, text: l('Isso já saiu do beco.', 'That has left the alley.') };
    post(s, `bm31c:${c.id}`, -c.price, 'acquisitions', `Mercado negro: cópias piratas`);
    st.lots.push({ rel: c.rel, n: c.n, paid: c.price, w: s.week });
    bm.copies = bm.copies.filter((x) => x !== c);
    addHeat(s, 'player', homeA3(s), 2);
    return { ok: true, text: fmtL(l('{n} cópias no seu depósito: revenda na virada do mês.', '{n} copies in your storeroom: resold at the month turn.'), { n: c.n }) };
  }
  if (row.k === 'gear') {
    const ofId = rowId.slice(5);
    const of = obj31(s).offers[ofId];
    if (!of) return { ok: false, text: l('Isso já saiu do beco.', 'That has left the alley.') };
    withTxn({ payer: 'label', owner: 'label', beneficiary: 'label' }, () => post(s, `bm31g:${ofId}`, -of.price, 'acquisitions', `Mercado negro: equipamento`));
    const tk = takeOffer(s, ofId, CO31);
    if (!tk.ok) return { ok: false, text: l('Isso já saiu do beco.', 'That has left the alley.') };
    const bm = st.bm[city];
    if (bm) bm.gear = bm.gear.filter((x) => x !== ofId);
    const x = items31(s).d[of.objId];
    if (x) { x.prev.push(['?', x.made, s.year]); x.ev.push([s.year, l('Comprado no mercado negro', 'Bought on the black market')]); }
    st.hotGear[of.objId] = s.week;
    addHeat(s, 'player', homeA3(s), 2);
    return { ok: true, text: l('O equipamento entra no acervo da empresa (comprado no mercado negro).', 'The gear joins the company collection (bought on the black market).') };
  }
  const oid = rowId.slice(6);
  const of = crime17(s).market.find((x) => x.id === oid);
  const rl = of ? relics(s).list.find((x) => x.id === of.rl) : undefined;
  const text = buyOffer(s, oid);
  const ok = !!rl && !crime17(s).market.some((x) => x.id === oid) && crime17(s).stash.includes(rl.id);
  if (ok && rl) rl.own.push([s.config.companyName, s.year, 'mercado negro']);
  return { ok, text };
}

/** Virada do mês: cópias revendidas (ou apreendidas), equipamento quente achado ou "esfriado", estoque novo. */
export function bmMonth31(s: GameState): { sold: number; seized: number } {
  const res = { sold: 0, seized: 0 };
  const st = peek(s);
  if (st) {
    const r = Rng.fromSeed(`${s.config.seed}|under31|month|${ymOf(s)}`);
    for (const lot of st.lots.splice(0)) {
      if (r.chance(seizeRisk31(s, 'copies'))) {
        res.seized++;
        addHeat(s, 'player', homeA3(s), 6);
        scandal(s, 'player', 'crime', 25, [`Cópias piratas de "${s.releases[lot.rel]?.title ?? '?'}" apreendidas`]);
        notify(s, l('A polícia apreendeu as suas cópias piratas: escândalo e mais calor.', 'Police seized your bootleg copies: scandal and more heat.'), 'bad');
        continue;
      }
      const v = Math.round(lot.paid * UNDER31.copyResale);
      post(s, `bm31sell:${s.week}:${lot.rel}`, v, 'misc', 'Revenda de cópias (mercado negro)');
      res.sold++;
    }
    for (const [ob, w] of Object.entries(st.hotGear)) {
      if (s.week - w > 26 || !obj31(s).objs[ob]) { delete st.hotGear[ob]; continue; }
      if (r.chance(seizeRisk31(s, 'gear') / 3)) {
        delete st.hotGear[ob];
        removeObj(s, ob); delete items31(s).d[ob];
        res.seized++;
        addHeat(s, 'player', homeA3(s), 5);
        scandal(s, 'player', 'crime', 20, ['Equipamento roubado achado no acervo']);
        notify(s, l('A polícia achou equipamento roubado no seu acervo: a peça foi apreendida.', 'Police found stolen gear in your collection: it was seized.'), 'bad');
      }
    }
    if (Object.keys(st.vis).length > 60) for (const [k, w] of Object.entries(st.vis)) if (s.week - w > 8) delete st.vis[k];
  }
  if (sw<boolean>(s, 'under31')) restockBm31(s);
  return res;
}
registerSimHook('month', 'under31', (s) => { bmMonth31(s); });

// ---------------------------------------------------------------- baile da facção

export interface Baile31 { askId: string; o: Org17; actId?: string; due: number; police: number }
/** Convites para o baile em aberto (pedido 'baile' de uma facção do país). */
export function bailes31(s: GameState): Baile31[] {
  const a3 = homeA3(s);
  return asks29(s).filter((a) => a.k === 'baile').map((a) => ({ a, o: orgById(s, a.o) })).filter((x): x is { a: (typeof x)['a']; o: Org17 } => !!x.o && x.o.a3 === a3)
    .map(({ a, o }) => ({ askId: a.id, o, actId: a.act ?? playerActs(s).find((id) => orgAff29(s, o.id).some((af) => af.genres.includes(s.acts[id]?.genre ?? '') )), due: a.dl, police: police31(s).heat }));
}
export type BaileWay31 = 'play' | 'leave' | 'press';
export const BAILE_WAYS31: Record<BaileWay31, { label: L; tip: L }> = {
  play: { label: l('Tocar até o fim', 'Play to the end'), tip: l('Cumpre o convite: cachê, fama na cena e o laço com a facção (e o risco de batida).', 'Fulfils the invitation: fee, scene fame and the tie to the faction (and the raid risk).') },
  leave: { label: l('Sair antes', 'Leave early'), tip: l('Recusa o convite: a facção cobra a desfeita (escalada).', 'Turns down the invitation: the faction holds it against you (escalation).') },
  press: { label: l('Chamar a imprensa', 'Call the press'), tip: l('Recusa e entrega a facção: investigação aberta, sua ficha limpa um pouco — e eles juram vingança.', 'Refuse and expose the faction: investigation opened, your record cleans up a bit — and they swear revenge.') },
};
export function baile31(s: GameState, askId: string, way: BaileWay31): { ok: boolean; text: L } {
  const b = bailes31(s).find((x) => x.askId === askId);
  if (!b) return { ok: false, text: l('Esse baile já passou.', 'That party is over.') };
  if (way === 'play') return fulfill29(s, askId);
  const r = refuse29(s, askId);
  if (way === 'leave' || !r.ok) return r;
  return { ok: true, text: fmtL(l('{a} {b}', '{a} {b}'), { a: r.text, b: reportOrg(s, b.o.id) }) };
}

// ---------------------------------------------------------------- textos de apoio

export const countryOf31 = (s: GameState): L => countryName(homeA3(s));
export const cityName31 = (s: GameState): L => cityById[s.config.homeCity]?.name ?? l(s.config.homeCity, s.config.homeCity);

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({ id: 'under31.facades', area: 'world', label: l('Submundo: fachadas no máximo na cidade', 'Underworld: maximum front businesses in the city'), kind: 'number', raw: true, min: 0, max: 6,
  get: () => UNDER31.facades, set: (_s, v) => { UNDER31.facades = clamp(Math.round(Number(v)), 0, 6); } });
registerEditable({ id: 'under31.copyResale', area: 'world', label: l('Submundo: revenda das cópias piratas (× o preço)', 'Underworld: bootleg resale (× price)'), kind: 'number', raw: true, min: 0, max: 5, step: 0.1,
  get: () => UNDER31.copyResale, set: (_s, v) => { UNDER31.copyResale = clamp(Number(v), 0, 5); } });
registerRunnable({ id: 'under31.restock', area: 'world', label: l('Submundo: girar o estoque do mercado negro agora', 'Underworld: rotate the black-market stock now'),
  run: (s) => { const st = under31(s); delete st.bm[s.config.homeCity]; restockBm31(s); return fmtL(l('{n} item(ns) no beco.', '{n} item(s) in the alley.'), { n: bmRows31(s).length }); } });

// ---------------------------------------------------------------- no mapa da cidade (place27)

/** Delegacia, fachadas e beco como lugares do Nosso mundo (sempre visíveis, conforme a época e o país). */
export function underPlaces31(s: GameState): Under27[] {
  const out: Under27[] = [];
  const pol = police31(s);
  const cells = cells31(s);
  out.push({ k: 'police', key: 'police', name: s.year < 1930 ? l('Delegacia do Centro', 'Central Police Station') : l('Delegacia Central', 'Central Precinct'), what: fmtL(l('Delegacia com cadeia · {a}', 'Police station with cells · {a}'), { a: pol.agency }),
    owner: pol.agency.pt, now: cells.length ? fmtL(l('{n} preso(s) nas celas. {t}', '{n} in the cells. {t}'), { n: cells.length, t: pol.text }) : pol.text,
    people: [{ name: npcName27(s, `chief31|${homeA3(s)}`), role: l('Delegado(a)', 'Police chief') }, { name: detective31(s), role: l('Detetive', 'Detective') },
      ...cells.slice(0, 3).map((c) => ({ name: c.name, role: fmtL(l('Preso(a) · {n} sem.', 'Prisoner · {n} wk'), { n: c.weeks }), pid: c.pid, cell: true }))] });
  for (const o of localOrgs31(s).here) {
    const k = facadeOf31(s, o);
    const lts = room31(s, o.id)?.lts ?? [];
    out.push({ k: 'facade', key: `fac:${o.id}`, org: o.id, name: facadeName31(s, o), what: fmtL(l('{f} · fachada de {o}', '{f} · front for {o}'), { f: FACADE31[k].front, o: o.name }), owner: o.name.pt,
      now: s.week % 2 ? l('Movimento de sempre na porta; de noite, mais.', 'The usual crowd at the door; busier at night.') : l('Carros parados na frente, gente na esquina.', 'Cars parked out front, people on the corner.'),
      people: [{ name: npcName27(s, `fac31m|${o.id}`), role: l('Gerente da casa', 'House manager') }, ...lts.slice(0, 2).map((x) => ({ name: x.name, role: x.role, key: x.key }))] });
  }
  if (s.year >= 1900) out.push({ k: 'market', key: 'market', name: l('Beco do Mercado', 'Market Alley'), what: l('Mercado negro', 'Black market'), owner: l('receptadores', 'fences').pt,
    now: fmtL(l('{n} coisa(s) circulando no beco este mês.', '{n} thing(s) going around the alley this month.'), { n: bmRows31(s).length }),
    people: [{ name: npcName27(s, `fence31|${s.config.homeCity}`), role: l('Receptador(a)', 'Fence') }, { name: npcName27(s, `look31|${s.config.homeCity}`), role: l('Olheiro(a)', 'Lookout') }] });
  return out;
}
/** O emissário de cada facção do país com base em outra cidade (no bar). */
export const emissaries31 = (s: GameState): Person27[] => localOrgs31(s).via.slice(0, 2).map((o) => ({ name: npcName27(s, `emis31|${o.id}`), role: fmtL(l('Emissário(a) de {o}', 'Envoy of {o}'), { o: o.name }), key: o.key }));
UNDER27.fn = underPlaces31;
UNDER27.bar = emissaries31;
