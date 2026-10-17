// R31 · onda 4 (LOTE) — REGISTRO ÚNICO DE LOTES DA CIDADE. Pedido do dono: quase todo prédio do mapa tem FUNÇÃO —
//   · negócio que já existe, com dono (casa de shows, loja, estúdio, rádio, bar, hotel, gravadora, fachada…): é o
//     lugar do place27/gente31/under31/venues17 — aqui só se CONTA, nada é duplicado;
//   · terreno vago: à venda (preço pelo modelo de valor `landValue31`: área × lote × bairro na época) ou já SEU
//     (comprado com transação atribuída; depois se constrói pelos fluxos que já existem — lote do campus18);
//   · residência de quem mora na cidade: CEO de gravadora rival da cidade, artista (o rosto do ato), a família Fossati
//     na cidade dela. Porte pela fama/riqueza (apartamento → casa → mansão).
// Quem mora onde é decidido na VIRADA DO MÊS (e na nova partida): quem morreu, mudou de cidade ou fechou a gravadora
// deixa a casa, que passa ao próximo da fila; quem subiu de porte pode se mudar para uma casa maior (sorte própria:
// fluxo rng19 'lots31'). O mapa só lê: os prédios sem função (prédio de apartamentos genérico, escritório sem dono de
// verdade) viram, em ordem de lote, as casas das vagas ocupadas e, depois, terrenos vagos.
// Interruptor `lots31` (padrão ligado): desligado, o mapa volta ao de antes (prédios genéricos) e não há compra de
// terreno. `lots31.press` (padrão desligado): fofoca/paparazzi na porta da mansão usa o endereço (gancho pequeno).

import { clamp } from '../../core/rng';
import { formatMoney } from '../../core/money';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { addAsset, removeAsset } from '../finance';
import { cashWhy20, freeCash20 } from '../oblig20';
import { registerEditable, registerRunnable } from '../r31/editor';
import { registerSwitch, sw } from '../r31/switches';
import { withTxn } from '../r31/txn';
import { landValue31 } from '../r31/value31';
import { rng19 } from '../rng19';
import type { Act, GameState } from '../types';
import { fmtL, post } from '../util';
import { LAND18, LOTS18, buildings18, campus18, homeLot18, layout18, lotsOpen18 } from './campus18';
import { famCity31, famNow31 } from './fossati31';
import { meetHere31, scoutHere31 } from './gente31';
import { hoodStats19, nb19 } from './hood19';
import { FAMHOME27, INT33, LOTS27, PLACE_X27, type PAct27, type Person27, type Place27 } from './place27';
import { where31 } from './where31';
import { met31, meNode31, node31 } from '../social31';

// ---------------------------------------------------------------- regras (editáveis)

export const LOTS31 = {
  /** vagas de residência na cidade (o mapa usa as primeiras que couberem nos prédios sem função) */
  homes: 14,
  /** fama a partir da qual o artista mora numa casa / numa mansão */
  houseFame: 30, mansionFame: 65,
  /** chance por mês de quem subiu de porte se mudar para uma casa maior */
  upMove: 0.35,
  /** chance por mês de aparecer paparazzi na porta (só com `lots31.press`) */
  press: 0.25,
};
export const SW_LOTS31 = 'lots31';
export const SW_LOTS31_PRESS = 'lots31.press';
registerSwitch({
  id: SW_LOTS31, def: true, scope: 'game',
  desc: l('Lotes da cidade: prédio sem função vira casa de quem mora na cidade (CEO, artista, família) ou terreno vago à venda; você pode comprar o terreno e construir nele.',
    'City lots: buildings without a purpose become homes of people who live in town (CEO, artist, family) or vacant plots for sale; you can buy the plot and build on it.'),
});
registerSwitch({
  id: SW_LOTS31_PRESS, def: false, scope: 'game',
  desc: l('Lotes da cidade: fofoca e paparazzi usam o endereço das casas (fato público na porta da mansão).', 'City lots: gossip and paparazzi use home addresses (a public fact at the mansion door).'),
});
export const lotsOn31 = (s: GameState): boolean => sw<boolean>(s, SW_LOTS31);

// ---------------------------------------------------------------- estado

export type Tier31 = 0 | 1 | 2;
export const TIER31: L[] = [l('Apartamento', 'Apartment'), l('Casa', 'House'), l('Mansão', 'Mansion')];
export interface Home31 { who: string; w: number; tier: Tier31 }
export interface Own31 { w: number; price: number; asset?: string; edit?: 1 }
export interface Lots31St {
  /** vaga de residência → morador */
  h: Record<number, Home31>;
  /** terrenos seus (lote do mapa → compra) */
  own: Record<number, Own31>;
  /** últimas trocas: [semana, vaga, quem, 1 entrou · 0 saiu, motivo] */
  log: [number, number, string, number, L?][];
  /** cidade das vagas (mudou a sede: a cidade é outra) */
  city?: string;
}
declare module '../ext4' { interface Ext4 { lots31: Lots31St } }
const fresh = (): Lots31St => ({ h: {}, own: {}, log: [] });
registerExt4('lots31', fresh);
export function lots31(s: GameState): Lots31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.lots31 ??= fresh()) as Lots31St;
}
/** Leitura sem criar o estado (mapa e telas). */
export const peekLots31 = (s: GameState): Lots31St | undefined => (s.x4 as unknown as { lots31?: Lots31St }).lots31;

// ---------------------------------------------------------------- quem mora na cidade (puro)

export interface Res31 { who: string; name: string; tier: Tier31; kind: 'fam' | 'ceo' | 'artist'; pid?: string; actId?: string; labelId?: string; score: number }

const tierOfFame = (f: number): Tier31 => (f >= LOTS31.mansionFame ? 2 : f >= LOTS31.houseFame ? 1 : 0);
/** O rosto do ato: o primeiro integrante vivo (a voz/líder vem primeiro na formação). */
const faceOf = (s: GameState, a: Act): string | undefined => a.members.find((m) => s.persons[m]?.alive);
const actLives = (s: GameState, a: Act, city: string): boolean => a.city === city && !a.deceased && !!faceOf(s, a);

/** Quem pode morar na cidade agora, em ordem (família, CEOs, artistas por fama). */
export function residents31(s: GameState, city = s.config.homeCity): Res31[] {
  const out: Res31[] = [];
  // a família Fossati: quando a frente FOS põe a Casa Fossati no mapa (FAMHOME27), a casa é dela — não entra na fila
  if (city === famCity31(s) && !FAMHOME27.fn) out.push({ who: 'fam', name: 'Fossati', tier: 1, kind: 'fam', score: 1e6 });
  for (const lb of Object.values(s.labels ?? {})) {
    if (!lb || lb.id === 'player' || lb.city !== city || lb.active === false || lb.closedYear || (lb.founded ?? 0) > s.year || !lb.leaderId) continue;
    const n = lb.roster?.length ?? 0;
    out.push({ who: `l:${lb.leaderId}`, name: lb.ceo || lb.name, tier: n >= 8 ? 2 : 1, kind: 'ceo', labelId: lb.id, score: 5e5 + n });
  }
  const seen = new Set<string>();
  for (const a of Object.values(s.acts)) {
    if (!actLives(s, a, city)) continue;
    const pid = faceOf(s, a)!;
    if (seen.has(pid)) continue;
    seen.add(pid);
    const old = a.status === 'retired' || a.status === 'split';
    out.push({ who: `p:${pid}`, name: s.persons[pid]?.name ?? a.name, tier: tierOfFame(a.fame), kind: 'artist', pid, actId: a.id, score: a.fame * (old ? 0.6 : 1) });
  }
  return out.sort((a, b) => b.score - a.score || (a.who < b.who ? -1 : 1));
}

/** Ficha do morador pela chave (mesmo depois de morrer: a casa só muda de dono na virada do mês). */
export function resInfo31(s: GameState, who: string): Res31 | null {
  if (who === 'fam') return { who, name: 'Fossati', tier: 1, kind: 'fam', score: 0 };
  if (who.startsWith('l:')) {
    const lb = Object.values(s.labels ?? {}).find((x) => x && x.leaderId === who.slice(2));
    return lb ? { who, name: lb.ceo || lb.name, tier: (lb.roster?.length ?? 0) >= 8 ? 2 : 1, kind: 'ceo', labelId: lb.id, score: 0 } : null;
  }
  const pid = who.slice(2), p = s.persons[pid];
  if (!p) return null;
  const a = Object.values(s.acts).find((x) => x.members.includes(pid));
  return { who, name: p.name, tier: tierOfFame(a?.fame ?? 0), kind: 'artist', pid, actId: a?.id, score: 0 };
}

/** Por que o morador deixou a casa (null = continua). */
function leaveWhy(s: GameState, who: string, city: string): L | null {
  if (who === 'fam') return city === famCity31(s) ? null : l('a família mora em outra cidade', 'the family lives in another city');
  if (who.startsWith('l:')) {
    const lb = Object.values(s.labels ?? {}).find((x) => x && x.leaderId === who.slice(2));
    if (!lb || lb.active === false || lb.closedYear) return l('a gravadora fechou', 'the label closed');
    return lb.city === city ? null : l('a gravadora mudou de cidade', 'the label moved city');
  }
  const p = s.persons[who.slice(2)];
  if (!p || !p.alive) return l('morreu', 'died');
  const a = Object.values(s.acts).find((x) => x.members.includes(who.slice(2)) && !x.deceased && x.city === city);
  return a ? null : l('mudou-se da cidade', 'moved out of town');
}

// ---------------------------------------------------------------- virada do mês (motor)

/** Decide quem mora onde: quem saiu libera a casa; vagas vazias recebem o próximo da fila. */
export function homesMonth31(s: GameState): { out: number; in: number } {
  const r = { out: 0, in: 0 };
  if (!lotsOn31(s)) return r;
  const st = lots31(s), city = s.config.homeCity;
  const logIt = (slot: number, who: string, inn: number, why?: L) => { st.log.push([s.week, slot, who, inn, why]); if (st.log.length > 40) st.log.splice(0, st.log.length - 40); };
  if (st.city !== city) { for (const k of Object.keys(st.h)) delete st.h[+k]; st.city = city; }
  const cands = residents31(s, city);
  const byWho = new Map(cands.map((c) => [c.who, c]));
  for (const [k, hm] of Object.entries(st.h)) {
    const slot = +k;
    const why = leaveWhy(s, hm.who, city);
    if (why) { delete st.h[slot]; logIt(slot, hm.who, 0, why); r.out++; continue; }
    const c = byWho.get(hm.who);
    // subiu de porte (apartamento → casa → mansão): pode se mudar para uma casa maior (a casa antiga muda de dono)
    if (c && c.tier > hm.tier && rng19(s, 'lots31').next() < LOTS31.upMove) { delete st.h[slot]; logIt(slot, hm.who, 0, fmtL(l('mudou-se para um(a) {t}', 'moved to a bigger {t}'), { t: TIER31[c.tier] })); r.out++; }
  }
  const housed = new Set(Object.values(st.h).map((x) => x.who));
  const queue = cands.filter((c) => !housed.has(c.who));
  for (let slot = 0; slot < LOTS31.homes && queue.length; slot++) {
    if (st.h[slot]) continue;
    const c = queue.shift()!;
    st.h[slot] = { who: c.who, w: s.week, tier: c.tier };
    logIt(slot, c.who, 1);
    r.in++;
  }
  pressMonth31(s);
  return r;
}

/** Gancho pequeno (atrás de `lots31.press`): paparazzi na porta da casa mais famosa da cidade. */
function pressMonth31(s: GameState): void {
  if (!sw<boolean>(s, SW_LOTS31_PRESS)) return;
  const st = lots31(s);
  const top = Object.values(st.h).map((h) => resInfo31(s, h.who)).filter((x): x is Res31 => !!x && x.kind === 'artist' && !!x.actId).sort((a, b) => (s.acts[b.actId!]?.fame ?? 0) - (s.acts[a.actId!]?.fame ?? 0))[0];
  if (!top || rng19(s, 'lots31').next() >= LOTS31.press) return;
  const h = Object.values(st.h).find((x) => x.who === top.who)!;
  emitFact(s, { kind: 'statement', actors: [top.actId!], place: s.config.homeCity, severity: 12, visibility: 'public', tags: ['gossip', 'press', 'home'], src: 'lots31',
    text: fmtL(l('Paparazzi na porta do(a) {t} de {n}: a cidade inteira sabe onde fica.', 'Paparazzi at {n}\'s {t} door: the whole city knows where it is.'), { t: TIER31[h.tier], n: top.name }) });
}

registerSimHook('newgame', 'lots31', (s) => { homesMonth31(s); });
registerSimHook('month', 'lots31', (s) => { homesMonth31(s); });

// ---------------------------------------------------------------- terreno: preço, compra, ser seu

export const lotArea31 = (lot: number): number => (LOTS18[lot] ? LOTS18[lot].w * LOTS18[lot].d : 0);
/** Preço do terreno vago pelo modelo de valor (área, lote, bairro na época). */
export function lotPrice31(s: GameState, lot: number): number {
  const l0 = LOTS18[lot];
  if (!l0) return 0;
  return landValue31(s, { area: lotArea31(lot), pm: l0.pm, rent: hoodStats19(s).rent });
}
export const ownsLot31 = (s: GameState, lot: number): boolean => !!peekLots31(s)?.own[lot];

/** Por que não dá para comprar este terreno agora (null = dá). Sem estado criado: a tela chama antes do clique. */
export function lotLock31(s: GameState, lot: number): L | null {
  if (!lotsOn31(s)) return l('Compra de terreno desligada nesta partida.', 'Plot buying is off in this game.');
  if (!LOTS18[lot] || lot === 0) return l('Esse lote não existe.', 'That plot does not exist.');
  if (ownsLot31(s, lot)) return l('Esse terreno já é seu.', 'That plot is already yours.');
  const bs = buildings18(s);
  if (lot >= lotsOpen18(s, bs)) return l('Esse bairro ainda não abriu.', 'That district is not open yet.');
  if (new Set(layout18(s, bs).values()).has(lot) || campus18(s).proj.some((p) => p.lot === lot)) return l('Já tem um prédio seu nesse lote.', 'You already have a building on that plot.');
  if (nb19(s).some((x) => x.lot === lot)) return l('Esse imóvel é de um vizinho (compre pelo vizinho).', 'That property belongs to a neighbour (buy it from the neighbour).');
  if (lot === homeLot18(s)) return l('Esse é o lote residencial da sua casa.', 'That is your home\'s residential plot.');
  const price = lotPrice31(s, lot);
  if (freeCash20(s) < price) return cashWhy20(s, price, l('Caixa insuficiente.', 'Not enough cash.'));
  return null;
}

/** Comprar o terreno vago: transação atribuída (investimento), bem no balanço, o lote passa a ser seu. */
export function buyLot31(s: GameState, lot: number): { ok: boolean; text: L } {
  const why = lotLock31(s, lot);
  if (why) return { ok: false, text: why };
  const price = lotPrice31(s, lot);
  const name = LOTS18[lot].name;
  withTxn({ project: `lot31:${lot}`, payer: 'player', beneficiary: 'ext' }, () => post(s, `lot31:${lot}`, -price, 'acquisitions', `Compra do terreno: ${name.pt}`));
  const as = addAsset(s, { kind: 'building', name: fmtL(l('Terreno: {n}', 'Plot: {n}'), { n: name }), cost: price, lifeMonths: 0 });
  lots31(s).own[lot] = { w: s.week, price, asset: as.id };
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 8, visibility: 'public', tags: ['property', 'lot'], src: 'lots31',
    text: fmtL(l('Você comprou o terreno "{n}" na cidade.', 'You bought the "{n}" plot in town.'), { n: name }), diary: true });
  return { ok: true, text: fmtL(l('Terreno comprado: "{n}" é seu. Construa nele pelo mapa.', 'Plot bought: "{n}" is yours. Build on it from the map.'), { n: name }) };
}

/** Obra em terreno seu: sem a compra do terreno embutida no preço (o que você já pagou). */
export const ownLotBuildMult31 = (s: GameState, lot: number): number => (lotsOn31(s) && ownsLot31(s, lot) ? 0.85 : 1);
LAND18.mult = ownLotBuildMult31;

// ---------------------------------------------------------------- o mapa: prédio sem função → casa ou terreno

/** Prédio com função de verdade: liga a algo que existe (casa real, veículo, facção, vizinho, rival, lugar real da
 *  frente H, loja da época) ou tem dono real próprio. Prédio de apartamentos genérico não é negócio; a mesma equipe
 *  repetida em outro prédio (a cidade comum repete escritórios e hotéis) também não. */
export function functional31(s: GameState, p: Place27): boolean {
  if (p.lot31 || p.fam31 || p.deco31 || p.lot < 0) return true; // casa nossa, Casa Fossati (frente FOS), lugar real (frente H), loja de decoração (DECO-L)
  if (p.int2 || INT33.need?.(s).includes(p.k as never)) return true; // R33: prédio da INT-2 em lote reservado; hotel/escritório/apartamentos com ação (INT-1)
  if (p.src === 'nb' || p.venue || p.outlet || p.org || p.k === 'police' || p.k === 'market' || p.k === 'label') return true;
  if (eraBiz31(s, p)) return true;
  if (p.k === 'apartments') return false;
  const o = p.people[0];
  return !!(o && (o.pid || o.key));
}
/** Loja da época (frente H, city31): o prédio de cidade comum virou negócio com nome e ano de abrir e fechar. */
const eraBiz31 = (s: GameState, p: Place27): boolean => { const b = PLACE_X27.biz?.(s, p.lot, p.k); return !!b && b.name.pt === p.name.pt; };
/** Lotes (da cidade comum) sem função: os que `functional31` recusa e os que repetem o dono de outro lugar. */
export function noPurpose31(s: GameState, out: Place27[]): Set<number> {
  const seen = new Set<string>(), bad = new Set<number>();
  for (const p of out) {
    const o = p.people[0], id = o?.pid ?? o?.key;
    if (p.src !== 'fill' || p.lot < 0) { if (id) seen.add(id); continue; }
    if (!functional31(s, p) || (id && seen.has(id) && !p.lot31 && !eraBiz31(s, p))) bad.add(p.lot);
    else if (id) seen.add(id);
  }
  return bad;
}

/** Presença de quem mora na casa nesta semana (agenda real; o resto da semana é sorte pura por chave). */
function homePeople(s: GameState, r: Res31, lot: number): { people: Person27[]; now: L } {
  const at = (k: string) => { let x = 2166136261; for (let i = 0; i < k.length; i++) x = Math.imul(x ^ k.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };
  const key = `${s.config.seed}|lots31|${lot}|${s.week}`;
  if (r.kind === 'fam') {
    const fam = famNow31(s).filter((f) => !f.retired || f.m.id === 'sonia');
    const people: Person27[] = fam.map((f, i) => ({ name: f.m.name, role: l('Família Fossati', 'Fossati family'), key: f.key, ...(at(`${key}|${i}`) < 0.55 ? {} : { away: l('saiu', 'out') }) }));
    return { people, now: l('Casa da família: cheiro de molho no fogão.', 'Family home: sauce on the stove.') };
  }
  if (r.kind === 'ceo') {
    const home = at(key) < 0.5;
    return { people: [{ name: r.name, role: l('CEO (mora aqui)', 'CEO (lives here)'), key: r.who, ...(home ? {} : { away: l('no escritório', 'at the office') }) }], now: home ? l('Em casa.', 'At home.') : l('No escritório da gravadora.', 'At the label office.') };
  }
  const w = where31(s, r.pid!);
  const p: Person27 = { name: r.name, role: l('Artista (mora aqui)', 'Artist (lives here)'), pid: r.pid, actId: r.actId };
  if (w.k === 'here' && at(key) < 0.6) return { people: [p], now: l('Em casa.', 'At home.') };
  return { people: [{ ...p, away: w.k === 'here' ? l('saiu (volta à noite)', 'out (back tonight)') : w.why }], now: w.k === 'here' ? l('Saiu; volta à noite.', 'Out; back tonight.') : w.why };
}

export function homePlace31(s: GameState, lot: number, h: Home31): Place27 | null {
  const r = resInfo31(s, h.who);
  if (!r) return null;
  const { people, now } = homePeople(s, r, lot);
  const name = r.kind === 'fam' ? l('Casa dos Fossati', 'The Fossati house') : fmtL(l('{t} de {n}', '{n}\'s {t}'), { t: TIER31[h.tier], n: r.name });
  const what = fmtL(l('{t} · {k}', '{t} · {k}'), { t: TIER31[h.tier], k: r.kind === 'ceo' ? l('CEO de gravadora', 'label CEO') : r.kind === 'fam' ? l('família', 'family') : l('artista', 'artist') });
  return { id: `pl:${lot}`, lot, k: 'home', name, what, owner: r.name, ownerK: 'npc', now, people, also: [], src: 'fill', draw: h.tier === 0 ? 'office' : 'home', lot31: { k: 'home', who: h.who, tier: h.tier } };
}

export function vacantPlace31(s: GameState, lot: number, mine: boolean): Place27 {
  const nm = LOTS18[lot]?.name ?? l('Terreno', 'Plot');
  const price = lotPrice31(s, lot);
  return { id: `pl:${lot}`, lot, k: 'vacant', name: mine ? fmtL(l('Seu terreno: {n}', 'Your plot: {n}'), { n: nm }) : fmtL(l('Terreno vago: {n}', 'Vacant plot: {n}'), { n: nm }),
    what: l('Terreno vago', 'Vacant plot'), owner: mine ? s.config.companyName : '—', ownerK: 'npc',
    now: mine ? l('Seu: pronto para construir.', 'Yours: ready to build.') : fmtL(l('Vende-se: {p}.', 'For sale: {p}.'), { p: formatMoney(price) }),
    people: [], also: [], src: 'fill', draw: 'home', sale: mine ? undefined : price, lot31: { k: mine ? 'own' : 'sale' } };
}

/** Puro: dá função aos prédios sem função (em ordem de lote: casas das vagas ocupadas, depois terrenos vagos). */
export function applyLots31(s: GameState, out: Place27[]): void {
  if (!lotsOn31(s)) return;
  const st = peekLots31(s);
  const own = st?.own ?? {};
  const homes = Object.entries(st?.h ?? {}).map(([k, v]) => [+k, v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const bad = noPurpose31(s, out);
  const idx = out.map((p, i) => [p, i] as const).filter(([p]) => p.src === 'fill').sort((a, b) => a[0].lot - b[0].lot);
  for (const [p, i] of idx) {
    if (own[p.lot]) { out[i] = vacantPlace31(s, p.lot, true); continue; }
    if (!bad.has(p.lot)) continue;
    let hp: Place27 | null = null;
    while (!hp && homes.length) hp = homePlace31(s, p.lot, homes.shift()!);
    out[i] = hp ?? vacantPlace31(s, p.lot, false);
  }
}
LOTS27.fn = applyLots31;

// ---------------------------------------------------------------- ações (as que já existem)

function lotActs31(s: GameState, p: Pick<Place27, 'k' | 'id' | 'lot' | 'lot31'>): PAct27[] {
  const out: PAct27[] = [];
  if (p.k === 'vacant') {
    if (p.lot31?.k === 'own') out.push({ id: 'build', lot: true, label: l('Construir aqui', 'Build here'), desc: l('Abre o lote: loja, estúdio, casa de shows… (obra pelo fluxo de sempre, sem pagar o terreno de novo).', 'Opens the plot: shop, studio, venue… (the usual works flow, without paying for the land again).') });
    else out.push({ id: 'buy', label: l('Comprar o terreno', 'Buy the plot'), desc: l('O terreno passa a ser seu; depois construa pelo mapa.', 'The plot becomes yours; then build from the map.'), cost: lotPrice31(s, p.lot), dis: lotLock31(s, p.lot) ?? undefined });
    return out;
  }
  const r = p.lot31?.who ? resInfo31(s, p.lot31.who) : null;
  if (!r) return out;
  const homeNow = homePeople(s, r, p.lot).people.some((x) => !x.away);
  const key = r.kind === 'artist' ? `p:${r.pid}` : r.kind === 'ceo' ? r.who : 'fam';
  if (r.kind !== 'fam') {
    const met = met31(s, meNode31(s), node31(s, key));
    out.push({ id: 'visit', label: l('Visitar (conhecer)', 'Visit (meet)'), desc: l('Bater na porta e se apresentar.', 'Knock and introduce yourself.'),
      dis: met ? l('Vocês já se conhecem.', 'You already know each other.') : homeNow ? undefined : l('Não está em casa agora.', 'Not at home right now.') });
  }
  if (r.kind === 'artist' && r.actId) {
    const a = s.acts[r.actId];
    out.push({ id: 'scout', label: l('Pôr no radar', 'Put on the radar'), desc: l('Descobrir talento: o ato entra nos seus Talentos.', 'Discover talent: the act goes into your Talent list.'),
      dis: !a ? l('Artista desconhecido.', 'Unknown act.') : a.owner === 'player' ? l('Esse artista já é seu.', 'That act is already yours.') : s.knowledge[a.id] ? l('Esse artista já está no seu radar.', 'That act is already on your radar.') : undefined });
    out.push({ id: 'deal', label: l('Negociar em particular', 'Negotiate in private'), desc: l('Abre as conversas de contrato com o artista (painel rápido).', 'Opens contract talks with the act (quick panel).'), go: { area: 'talent18' } });
  }
  if (r.kind === 'ceo') out.push({ id: 'deal', label: l('Negociar em particular', 'Negotiate in private'), desc: l('Sociedade, compra ou acordo com a gravadora dele(a).', 'Partnership, buyout or a deal with their label.'), go: { area: 'labels' } });
  if (r.kind === 'fam') out.push({ id: 'fam', label: l('Visitar a família', 'Visit the family'), desc: l('Almoço, conversa e os favores da família (ficha da família).', 'Lunch, a chat and the family\'s favours (family card).'), go: { area: 'labels' } });
  return out;
}

function lotRun31(s: GameState, p: Pick<Place27, 'k' | 'id' | 'lot' | 'lot31'>, id: string): { ok: boolean; text: L } {
  if (id === 'buy') return buyLot31(s, p.lot);
  const r = p.lot31?.who ? resInfo31(s, p.lot31.who) : null;
  if (!r) return { ok: false, text: l('Ninguém mora aqui agora.', 'Nobody lives here now.') };
  if (id === 'visit') return meetHere31(s, r.kind === 'artist' ? `p:${r.pid}` : r.who);
  if (id === 'scout' && r.actId) return scoutHere31(s, r.actId);
  return { ok: false, text: l('Ação indisponível.', 'Action unavailable.') };
}
LOTS27.acts = lotActs31;
LOTS27.run = lotRun31;

// ---------------------------------------------------------------- endereço (fofoca, submundo) e leitura

/** Endereço de alguém na cidade (vaga de residência) — para fofoca/paparazzi e o submundo. */
export function homeOf31(s: GameState, who: string): { slot: number; tier: Tier31; since: number } | null {
  for (const [k, h] of Object.entries(peekLots31(s)?.h ?? {})) if (h.who === who) return { slot: +k, tier: h.tier, since: h.w };
  return null;
}
/** Últimas mudanças de dono das casas (painel da cidade). */
export function homeLog31(s: GameState, n = 6): { w: number; name: string; in: boolean; why?: L }[] {
  return (peekLots31(s)?.log ?? []).slice(-n).reverse().map(([w, , who, inn, why]) => ({ w, name: resInfo31(s, who)?.name ?? '?', in: inn === 1, why }));
}

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({ id: 'lots31.homes', area: 'world', label: l('Lotes: vagas de residência na cidade', 'Lots: residence slots in town'), kind: 'number', raw: true, min: 0, max: 40,
  get: () => LOTS31.homes, set: (_s, v) => { LOTS31.homes = clamp(Math.round(Number(v)), 0, 40); } });
registerEditable({ id: 'lots31.mansionFame', area: 'world', label: l('Lotes: fama para morar numa mansão', 'Lots: fame to live in a mansion'), kind: 'number', raw: true, min: 1, max: 100,
  get: () => LOTS31.mansionFame, set: (_s, v) => { LOTS31.mansionFame = clamp(Math.round(Number(v)), 1, 100); } });
registerEditable({ id: 'lots31.give', area: 'world', label: l('Lotes: dar terreno (número do lote; 0 = nada)', 'Lots: give a plot (lot number; 0 = none)'), kind: 'number', min: 0, max: LOTS18.length - 1,
  get: () => 0,
  set: (s, v) => {
    const lot = Math.round(Number(v));
    if (!lot) return;
    if (!LOTS18[lot] || ownsLot31(s, lot)) return l('Lote inválido ou já seu.', 'Invalid plot or already yours.');
    lots31(s).own[lot] = { w: s.week, price: 0, edit: 1 };
  } });
registerEditable({ id: 'lots31.take', area: 'world', label: l('Lotes: tirar terreno (número do lote; 0 = nada)', 'Lots: take a plot away (lot number; 0 = none)'), kind: 'number', min: 0, max: LOTS18.length - 1,
  get: () => 0,
  set: (s, v) => {
    const lot = Math.round(Number(v));
    if (!lot) return;
    const o = peekLots31(s)?.own[lot];
    if (!o) return l('Esse terreno não é seu.', 'That plot is not yours.');
    if (o.asset) removeAsset(s, o.asset);
    delete lots31(s).own[lot];
  } });
registerEditable({ id: 'lots31.owner', area: 'world', label: l('Lotes: mudar o morador da 1ª casa', 'Lots: change the resident of the 1st home'), kind: 'select',
  options: (s) => residents31(s).slice(0, 30).map((r) => ({ value: r.who, label: l(r.name, r.name) })),
  get: (s) => peekLots31(s)?.h[0]?.who ?? '',
  set: (s, v) => {
    const r = residents31(s).find((x) => x.who === v);
    if (!r) return l('Essa pessoa não mora na cidade.', 'That person does not live in town.');
    const st = lots31(s);
    for (const [k, h] of Object.entries(st.h)) if (h.who === r.who) delete st.h[+k];
    st.h[0] = { who: r.who, w: s.week, tier: r.tier };
    st.log.push([s.week, 0, r.who, 1, l('editor', 'editor')]);
  } });
registerRunnable({ id: 'lots31.month', area: 'world', label: l('Lotes: decidir quem mora onde agora', 'Lots: decide who lives where now'),
  help: l('Roda a troca de moradores da virada do mês (quem morreu ou se mudou sai; a fila entra).', 'Runs the month-turn resident change (the dead and the movers leave; the queue moves in).'),
  run: (s) => { const r = homesMonth31(s); return fmtL(l('{o} saída(s), {i} mudança(s).', '{o} departure(s), {i} move-in(s).'), { o: r.out, i: r.in }); } });

