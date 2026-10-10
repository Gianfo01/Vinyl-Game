// Rodada 18 (supply18, frente B / P1): a cadeia física como atores.
// Fábricas nomeadas por época (capacidade, fila, qualidade, prioridade de cliente grande), reserva de prensagem por
// lançamento com prazo por material (o vinil de 2021 levava 22 semanas, o CD duas), escolha quando a fábrica atrasa
// (adiar, pagar prioridade, lançar sem o físico — quem perde a data perde a maior parte da venda de lançamento),
// variantes de vinil, contrato de capacidade (take-or-pay), armazém com custo e ponta de estoque (cut-out),
// devoluções do varejo com frete e reserva, distribuidoras (própria / rede independente / P&D com major: taxa,
// prazo, reserva, adiantamento, quebra) e agregadores digitais (taxa, assinatura, pitching, derrubada por fraude).
// Dinheiro: custo de fabricação/armazém = 'manufacturing'; frete de devolução = 'distribution'; adiantamento do
// distribuidor = financiamento ('financing'); perdas por quebra = não operacional ('other').

import { clamp, Rng, seedState } from '../../core/rng';
import { FORMATS } from '../../data/rules';
import { l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { registerExplain, type WhyPart } from '../explain18';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { fin18 } from '../ledger18';
import { physicalShare, pressingCost } from '../production';
import type { GameState, PendingRelease, Release } from '../types';
import { fmtL, money, notify, playerActs, post as post0, remember } from '../util';

/** post com coleta opcional para o balanço (globalThis.__sup18 = {}) */
function post(s: GameState, key: string, amount: number, cat: string, memo: string, cash = true): boolean {
  const G = (globalThis as { __sup18?: Record<string, number> }).__sup18;
  if (G) { const k = key.split(':')[0]; G[k] = (G[k] ?? 0) + Math.round(amount); }
  return post0(s, key, amount, cat, memo, cash);
}
import { postSalesAR18 } from './econ18';
import { retailCycle } from './industry/retail';
import type { Material } from './industry/state';
import { MATERIAL_NAMES } from './industry/supply';
import { matAvailable } from './industry/supply13';

const $ = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
/** depuração do balanço: globalThis.__sup18off = ['day','launch','month','bot','report'] desliga partes */
export const off18 = (k: string): boolean => !!(globalThis as { __sup18off?: string[] }).__sup18off?.includes(k);
const rngFor = (s: GameState, k: string) => new Rng(seedState(`sup18|${s.config.seed}|${k}`));

// ================================================================== fábricas

export interface Plant18 { id: string; name: L; where: L; from: number; to: number; mats: Material[]; cap: number; def: number; price: number; major?: boolean; ship?: number; desc: L }
export const PLANTS18: Plant18[] = [
  { id: 'major_east', name: l('Fábrica da major (Costa Leste)', 'Major-owned plant (East Coast)'), where: l('EUA', 'USA'), from: 1925, to: 1992, mats: ['shellac', 'vinyl', 'tape'], cap: 1.4, def: -0.005, price: 1, major: true,
    desc: l('Enorme e confiável, mas é da concorrência: os discos da casa e as estrelas furam a fila.', 'Huge and reliable, but owned by a rival: in-house records and stars jump the queue.') },
  { id: 'indie_press', name: l('Prensa independente do bairro', 'Neighbourhood indie press'), where: l('sua cidade', 'your city'), from: 1935, to: 2100, mats: ['shellac', 'vinyl'], cap: 0.5, def: 0.015, price: 0.92,
    desc: l('Pequena, barata e flexível; mais chiado e capas tortas.', 'Small, cheap and flexible; more crackle and crooked sleeves.') },
  { id: 'dutch', name: l('Fábrica holandesa de precisão', 'Dutch precision plant'), where: l('Holanda', 'Netherlands'), from: 1958, to: 2100, mats: ['vinyl'], cap: 0.8, def: -0.01, price: 1.15, ship: 1,
    desc: l('Qualidade de referência; pede mais caro e o frete leva uma semana.', 'Reference quality; pricier, and shipping takes a week.') },
  { id: 'central_eu', name: l('Gigante da Europa Central', 'Central European giant'), where: l('Europa Central', 'Central Europe'), from: 1951, to: 2100, mats: ['vinyl', 'tape', 'polycarbonate'], cap: 1.8, def: 0.004, price: 0.95, ship: 1,
    desc: l('A maior prensa do mundo depois do renascimento do vinil: escala, preço bom, fila de quem chega primeiro.', 'The world\'s biggest press after the vinyl revival: scale, good price, first-come queue.') },
  { id: 'tape_dup', name: l('Duplicadora de fitas', 'Tape duplicator'), where: l('EUA', 'USA'), from: 1966, to: 2012, mats: ['tape'], cap: 1.2, def: 0.006, price: 0.95,
    desc: l('Duplicação em alta velocidade: rápida, qualidade média.', 'High-speed duplication: fast, average quality.') },
  { id: 'cd_de', name: l('Fábrica de CDs (Alemanha)', 'CD plant (Germany)'), where: l('Alemanha', 'Germany'), from: 1983, to: 2100, mats: ['polycarbonate'], cap: 1.3, def: -0.006, price: 1.05, ship: 1,
    desc: l('As primeiras salas limpas de CD: confiáveis, caras no início.', 'The first CD clean rooms: reliable, expensive at first.') },
  { id: 'cd_asia', name: l('Fábrica asiática de discos ópticos', 'Asian optical-disc plant'), where: l('Ásia', 'Asia'), from: 1991, to: 2100, mats: ['polycarbonate'], cap: 1.6, def: 0.01, price: 0.78, ship: 3,
    desc: l('Baratíssima em escala; navio de 3 semanas e controle de qualidade irregular.', 'Dirt cheap at scale; a 3-week ship and patchy quality control.') },
  { id: 'brasil', name: l('Fábrica nacional (Brasil)', 'National plant (Brazil)'), where: l('Brasil', 'Brazil'), from: 1950, to: 2100, mats: ['shellac', 'vinyl', 'tape', 'polycarbonate'], cap: 0.6, def: 0.008, price: 0.9,
    desc: l('Atende o mercado brasileiro sem frete internacional; fecha o vinil nos anos 90 e reabre em 2009.', 'Serves the Brazilian market without overseas freight; drops vinyl in the 1990s and reopens it in 2009.') },
  { id: 'boutique', name: l('Boutique audiófila (180 g)', 'Audiophile boutique (180 g)'), where: l('EUA', 'USA'), from: 1994, to: 2100, mats: ['vinyl'], cap: 0.3, def: -0.015, price: 1.45,
    desc: l('Prensagem lenta e perfeita para colecionadores; o disco impressiona na mão.', 'Slow, perfect pressings for collectors; the record impresses in hand.') },
];
export const plant18 = (id: string) => PLANTS18.find((p) => p.id === id);
/** materiais que a fábrica faz NESTE ano (a brasileira larga o vinil 1997–2008) */
export function plantMats(p: Plant18, y: number, s?: GameState): Material[] {
  return p.mats.filter((m) => !(p.id === 'brasil' && m === 'vinyl' && y >= 1997 && y <= 2008) && !(m === 'shellac' && y > 1960) && (!s || matAvailable(s, m)));
}
export const plantsNow = (s: GameState): Plant18[] => PLANTS18.filter((p) => s.year >= p.from && s.year <= p.to && plantMats(p, s.year, s).length);

/** Fila base (semanas) por material e ano: os gargalos históricos. */
export function baseQueue18(m: Material, y: number): number {
  if (m === 'shellac') return y >= 1942 && y <= 1946 ? 7 : y >= 1950 ? 3 : 2;
  if (m === 'vinyl') {
    if (y < 1955) return 4; // poucas prensas de vinil na transição
    if (y >= 1973 && y <= 1974) return 6; // choque do petróleo
    if (y >= 1977 && y <= 1979) return 5; // febre da disco
    if (y < 1990) return 2;
    if (y < 2008) return 4; // poucas prensas sobrando
    if (y < 2014) return 5;
    if (y < 2017) return 7;
    if (y < 2020) return 8;
    return ({ 2020: 12, 2021: 22, 2022: 18, 2023: 12 } as Record<number, number>)[y] ?? 9;
  }
  if (m === 'tape') return y < 1972 ? 3 : y < 2000 ? 2 : 5;
  if (m === 'polycarbonate') return y < 1986 ? 6 : y < 1990 ? 4 : 2;
  return 2;
}
export const boom18 = (s: GameState): boolean => baseQueue18('vinyl', s.year) >= 7 || (s.year >= 1973 && s.year <= 1979);
const WHY_Q: [Material, number, number, L][] = [
  ['shellac', 1942, 1946, l('Guerra: goma-laca racionada.', 'War: shellac rationed.')],
  ['vinyl', 1948, 1954, l('Transição: poucas prensas de vinil.', 'Transition: few vinyl presses.')],
  ['vinyl', 1973, 1974, l('Choque do petróleo: falta PVC.', 'Oil shock: PVC shortage.')],
  ['vinyl', 1977, 1979, l('Febre da disco: as majors prensam milhões.', 'Disco fever: the majors press millions.')],
  ['vinyl', 1990, 2007, l('Prensas de vinil fecharam: sobraram poucas.', 'Vinyl presses closed: only a few left.')],
  ['vinyl', 2008, 2019, l('Renascimento do vinil: prensas velhas, demanda nova.', 'Vinyl revival: old presses, new demand.')],
  ['vinyl', 2020, 2023, l('Pandemia + incêndio numa fábrica de lacas + superestrelas prensando centenas de milhares: a fila foi de 8 a 22 semanas.', 'Pandemic + a lacquer-plant fire + superstars pressing hundreds of thousands: queues went from 8 to 22 weeks.')],
  ['polycarbonate', 1982, 1989, l('Tecnologia nova: poucas salas limpas.', 'New technology: few clean rooms.')],
  ['tape', 2000, 2100, l('Duplicadoras fechando.', 'Duplicators closing.')],
];
export const queueWhy18 = (m: Material, y: number): L | null => WHY_Q.find(([mm, a, b]) => mm === m && y >= a && y <= b)?.[3] ?? null;

/** Fatia de cada formato dentro do físico, por ano (vinil × fita × CD), para dividir lançamento e relatório. */
export function physMix18(y: number): Record<string, number> {
  const sh = y < 1950 ? 1 : y < 1959 ? (1959 - y) / 9 : 0;
  const tape = y < 1966 ? 0 : y < 1983 ? (y - 1966) / 17 * 0.5 : y < 1991 ? 0.55 : y < 2003 ? Math.max(0.05, 0.55 - (y - 1991) * 0.045) : y < 2016 ? 0.02 : 0.03;
  const cd = y < 1983 ? 0 : y < 1992 ? (y - 1983) / 9 * 0.55 : y < 2003 ? Math.min(0.9, 0.55 + (y - 1992) * 0.035) : y < 2010 ? 0.92 : Math.max(0.4, 0.92 - (y - 2009) * 0.045);
  const eight = y >= 1966 && y <= 1982 ? 0.12 * Math.max(0, 1 - Math.abs(y - 1975) / 8) : 0;
  const vin = Math.max(0.01, 1 - sh - tape - cd - eight);
  return { shellac: sh, vinyl: vin, eight, tape, cd };
}
const FMT_MAT: Record<string, Material> = { shellac: 'shellac', single45: 'vinyl', lp: 'vinyl', cassette: 'tape', cd: 'polycarbonate' };
/** Peso de cada material no físico de um lançamento (pelos formatos escolhidos e pela época). */
export function relMatShares(s: GameState, formats: string[]): Partial<Record<Material, number>> {
  const mix = physMix18(s.year);
  const w: Partial<Record<Material, number>> = {};
  let tot = 0;
  for (const f of formats) {
    const m = FMT_MAT[f];
    if (!m) continue;
    const k = m === 'vinyl' ? mix.vinyl / (formats.includes('lp') && formats.includes('single45') ? 2 : 1) : m === 'tape' ? mix.tape + mix.eight : m === 'polycarbonate' ? mix.cd : mix.shellac;
    w[m] = (w[m] ?? 0) + Math.max(0.03, k);
    tot += Math.max(0.03, k);
  }
  for (const m of Object.keys(w) as Material[]) w[m] = w[m]! / (tot || 1);
  return w;
}

// ================================================================== distribuidoras e agregadores

export interface Dist18 { id: string; name: L; desc: L; from: number; to: number; fee: number; lag: number; res: number; reach: number; queue: number; adv: number; risk: number; minRel: number }
export const DISTS18: Dist18[] = [
  { id: 'self', name: l('Distribuição própria', 'Own distribution'), desc: l('Seus vendedores e fretes: a taxa depende do tamanho da sede; nenhum compromisso.', 'Your own salesmen and freight: the fee depends on HQ size; no strings.'), from: 1900, to: 2100, fee: 0, lag: 0, res: 0, reach: 0, queue: 1, adv: 0, risk: 0, minRel: 0 },
  { id: 'indie_net', name: l('Rede de distribuidoras independentes', 'Independent distributor network'), desc: l('Taxa menor e lojas independentes que gostam de você — mas pagam um mês mais tarde, seguram 20% como reserva de devolução por 6 meses e, em crise, quebram levando o que devem.', 'Lower fee and indie shops that like you — but they pay a month later, hold 20% as a returns reserve for 6 months and, in a crisis, go bust owing you money.'), from: 1950, to: 2100, fee: -0.03, lag: 1, res: 0.2, reach: 0.03, queue: 1, adv: 0, risk: 0.05, minRel: 0 },
  { id: 'major_pd', name: l('P&D com uma major', 'P&D deal with a major'), desc: l('A major prensa e distribui: lojas grandes, fila menor na fábrica, pagamento mais rápido e adiantamento — por uma taxa maior e um mínimo de lançamentos por ano. Abaixo do mínimo, ela rescinde e cobra o adiantamento não recuperado.', 'The major presses and distributes: big stores, shorter plant queues, faster payment and an advance — for a higher fee and a minimum number of releases a year. Below the minimum, it terminates and claws back the unrecouped advance.'), from: 1955, to: 2100, fee: 0.05, lag: -1, res: 0.1, reach: 0.08, queue: 0.7, adv: 30000, risk: 0, minRel: 4 },
];
export interface Agg18 { id: string; name: L; desc: L; from: number; fee: number; flat: number; pitch: number; take: number; lock: number }
export const AGGS18: Agg18[] = [
  { id: 'none', name: l('Junto com o distribuidor', 'Bundled with the distributor'), desc: l('O digital segue a taxa do seu distribuidor.', 'Digital follows your distributor\'s fee.'), from: 1900, fee: -1, flat: 0, pitch: 0, take: 0, lock: 0 },
  { id: 'agg_pct', name: l('Agregador por porcentagem', 'Percentage aggregator'), desc: l('Fica com 9% do digital; você mantém os masters. Sem pitching editorial.', 'Keeps 9% of digital; you keep the masters. No editorial pitching.'), from: 2004, fee: 0.09, flat: 0, pitch: 0, take: 0.01, lock: 0 },
  { id: 'agg_flat', name: l('Agregador por assinatura', 'Subscription aggregator'), desc: l('0% de comissão por uma anuidade por artista. Filtro antifraude rígido: às vezes derruba faixas legítimas.', '0% commission for a yearly fee per artist. Strict anti-fraud filter: sometimes takes down legitimate tracks.'), from: 2012, fee: 0, flat: 90, pitch: 0, take: 0.05, lock: 0 },
  { id: 'agg_label', name: l('Serviços digitais com pitching', 'Digital label services with pitching'), desc: l('Fica com 18%, mas tem acesso aos editores das playlists (+alcance no digital). Contrato mínimo de 2 anos.', 'Keeps 18%, but has access to playlist editors (+digital reach). 2-year minimum term.'), from: 2010, fee: 0.18, flat: 0, pitch: 0.1, take: 0.01, lock: 24 },
];
export const dist18 = (id: string) => DISTS18.find((d) => d.id === id) ?? DISTS18[0];
export const agg18 = (id: string) => AGGS18.find((d) => d.id === id) ?? AGGS18[0];
export const digitalOn18 = (s: GameState): boolean => s.techDates.download !== undefined && s.year >= s.techDates.download;

// ================================================================== estado

export type LatePol = 'ask' | 'postpone' | 'launch' | 'rush' | 'smart';
export interface Book18 { pr: string; act: string; title: string; w: number; ready: Partial<Record<Material, number>>; plant: Partial<Record<Material, string>>; rush?: boolean; bumped?: boolean; asked?: boolean; var?: number; late?: number }
export interface RelInfo18 { plant: string; late: number; var: number; def: number }
export interface Sup18 {
  load: Record<string, number>;
  book: Record<string, Book18>;
  rel: Record<string, RelInfo18>;
  pref: Partial<Record<Material, string>>;
  late: LatePol;
  dist: string; distSince: number; partner: string; adv: number; health: number;
  agg: string; aggSince: number;
  top: { plant: string; units: number; until: number } | null;
  ret: Record<string, number>;
  stor: number;
  cut: string[];
  busts: number[];
  bl: string[];
  log: { w: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { sup18: Sup18 } }
const fresh = (): Sup18 => ({ load: {}, book: {}, rel: {}, pref: {}, late: 'ask', dist: 'self', distSince: 0, partner: '', adv: 0, health: 70, agg: 'none', aggSince: 0, top: null, ret: {}, stor: 0, cut: [], busts: [], bl: [], log: [] });
registerExt4('sup18', fresh);
export function sup18(s: GameState): Sup18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.sup18 ??= fresh()) as Sup18;
  if (st.log && st.busts && st.bl) return st;
  const f = fresh();
  for (const k of Object.keys(f) as (keyof Sup18)[]) if (st[k] === undefined) (st as unknown as Record<string, unknown>)[k] = f[k];
  return st;
}
const log = (s: GameState, t: L) => { const st = sup18(s); st.log.unshift({ w: s.week, t }); if (st.log.length > 30) st.log.length = 30; };

// ================================================================== fila

export const ownPlant18 = (s: GameState): boolean => (s.x4.industry?.plants?.length ?? 0) > 0;
/** Quem você é para a fábrica: selo pequeno espera mais; P&D com major e fábrica própria passam na frente. */
export function clientFactor18(s: GameState, p: Plant18): { k: number; why: [L, number][] } {
  const st = sup18(s);
  const why: [L, number][] = [];
  let k = 1;
  const add = (lab: L, v: number) => { if (Math.abs(v - 1) < 0.005) return; k *= v; why.push([lab, v]); };
  add(l('Tamanho do seu selo', 'Your label size'), [1.25, 1.15, 1.05, 1, 0.92, 0.85][s.player.hq] ?? 0.85);
  if (p.major) add(st.dist === 'major_pd' && st.partner ? l('P&D: você é cliente da casa', 'P&D: you are an in-house client') : l('Fábrica de major: a casa vem primeiro', 'Major-owned plant: in-house first'), st.dist === 'major_pd' ? 0.7 : 1.25);
  else if (st.dist === 'major_pd') add(l('P&D com major (peso do contrato)', 'P&D with a major (contract clout)'), dist18('major_pd').queue);
  return { k, why };
}
/** Semanas de fila desta fábrica para este material agora. */
export function queueOf18(s: GameState, p: Plant18, m: Material): number {
  const st = sup18(s);
  if (st.top && st.top.plant === p.id && st.top.until > s.week) return 1;
  const load = st.load[p.id] ?? 1;
  const size = p.cap >= 1.4 ? 0.9 : p.cap <= 0.35 ? 1.35 : 1;
  return Math.max(1, Math.round(baseQueue18(m, s.year) * load * size * clientFactor18(s, p).k + (p.ship ?? 0)));
}
/** Melhor fábrica para o material: a preferida do jogador, senão a de menor fila (desempate: preço). */
export function bestPlant18(s: GameState, m: Material): Plant18 | undefined {
  const opts = plantsNow(s).filter((p) => plantMats(p, s.year, s).includes(m));
  const pref = sup18(s).pref[m];
  const pp = pref ? opts.find((p) => p.id === pref) : undefined;
  if (pp) return pp;
  return opts.sort((a, b) => queueOf18(s, a, m) + a.price * 2 - (queueOf18(s, b, m) + b.price * 2))[0];
}
/** Semanas de crédito: master, laca e teste de prensagem já correm entre a mixagem e a data anunciada. */
export const GRACE18 = 4;

function matsOfRel(formats: string[]): Material[] {
  const out = new Set<Material>();
  for (const f of formats) { const m = FMT_MAT[f]; if (m) out.add(m); }
  return [...out];
}
const physOf = (formats: string[]) => formats.some((f) => FORMATS.find((x) => x.id === f)?.physical);

/** Reserva a prensagem de um lançamento programado (automático; pode ser refeito na tela). */
export function book18(s: GameState, pr: PendingRelease, plantFor: Partial<Record<Material, string>> = {}, w0 = s.week): Book18 | null {
  if (!physOf(pr.formats) || pr.press <= 0) return null;
  const st = sup18(s);
  const old = st.book[pr.id];
  const b: Book18 = { pr: pr.id, act: pr.actId, title: pr.title, w: old?.w ?? w0, ready: {}, plant: {}, var: old?.var, rush: old?.rush, asked: old?.asked, bumped: old?.bumped };
  for (const m of matsOfRel(pr.formats)) {
    const p = (plantFor[m] ? plant18(plantFor[m]!) : undefined) ?? (old?.plant[m] ? plant18(old.plant[m]!) : undefined) ?? bestPlant18(s, m);
    if (!p) continue;
    b.plant[m] = p.id;
    const q = ownPlant18(s) && m !== 'polycarbonate' ? Math.min(queueOf18(s, p, m), 2) : queueOf18(s, p, m);
    b.ready[m] = b.w + Math.max(0, Math.round(q * (b.rush ? 0.45 : 1)) - GRACE18) + (b.bumped && m === 'vinyl' ? 4 : 0);
  }
  st.book[pr.id] = b;
  return b;
}
/** Semanas de atraso do material mais pesado que chega depois da data (0 = em dia). */
export function lateOf18(s: GameState, pr: PendingRelease, b: Book18): { weeks: number; share: number } {
  const sh = relMatShares(s, pr.formats);
  let weeks = 0, share = 0;
  for (const [m, rw] of Object.entries(b.ready) as [Material, number][]) {
    const d = rw - pr.week;
    if (d > 0) { share += sh[m] ?? 0; weeks = Math.max(weeks, d); }
  }
  return { weeks, share };
}
/** Custo da prioridade (furar fila): % da prensagem, mais caro em época de aperto. */
export const rushCost18 = (s: GameState, pr: PendingRelease): number => Math.round(pressingCost(s, pr.formats, pr.press) * (boom18(s) ? 0.6 : 0.3));

/** Preço da fábrica escolhida em relação ao padrão (cobra ou devolve a diferença na reserva). */
function plantDelta(s: GameState, pr: PendingRelease, b: Book18): number {
  const sh = relMatShares(s, pr.formats);
  let k = 0;
  for (const [m, id] of Object.entries(b.plant) as [Material, string][]) k += (sh[m] ?? 0) * ((plant18(id)?.price ?? 1) - 1);
  return Math.round(pressingCost(s, pr.formats, pr.press) * k);
}

/** Troca a fábrica de um material numa reserva (refaz a fila a partir de hoje). */
export function setPlant18(s: GameState, prId: string, m: Material, plantId: string): L | null {
  const pr = s.pendingReleases.find((x) => x.id === prId);
  const st = sup18(s);
  const b = st.book[prId];
  const p = plant18(plantId);
  if (!pr || !b || !p || !plantMats(p, s.year, s).includes(m) || s.year < p.from || s.year > p.to) return l('Inválido.', 'Invalid.');
  const before = plantDelta(s, pr, b);
  b.w = s.week;
  b.plant[m] = plantId;
  book18(s, pr);
  const diff = plantDelta(s, pr, st.book[prId]) - before;
  if (diff) post(s, `sup18pl:${prId}:${m}:${plantId}`, -diff, 'manufacturing', `Troca de fábrica: ${pr.title}`);
  return null;
}
export function setPref18(s: GameState, m: Material, plantId: string): void { if (plantId) sup18(s).pref[m] = plantId; else delete sup18(s).pref[m]; }
export function setLatePol18(s: GameState, p: LatePol): void { sup18(s).late = p; }

/** Resolve um atraso: adiar a data, pagar prioridade ou lançar assim mesmo. */
export function resolveLate18(s: GameState, prId: string, how: 'postpone' | 'rush' | 'launch'): L {
  const pr = s.pendingReleases.find((x) => x.id === prId);
  const b = sup18(s).book[prId];
  if (!pr || !b) return l('Esse lançamento já saiu.', 'That release is already out.');
  if (how === 'rush') {
    if (b.rush) return l('Prioridade já paga.', 'Priority already paid.');
    const c = rushCost18(s, pr);
    if (s.player.cash < c) return l('Caixa insuficiente para a prioridade.', 'Not enough cash for priority.');
    post(s, `sup18rush:${prId}`, -c, 'manufacturing', `Prioridade na fábrica: ${pr.title}`);
    b.rush = true;
    book18(s, pr);
    const lt = lateOf18(s, pr, b);
    log(s, fmtL(l('"{t}": prioridade paga ({c}); atraso agora {d} sem.', '"{t}": priority paid ({c}); delay now {d} wk.'), { t: pr.title, c: $(c), d: lt.weeks }));
    return lt.weeks > 0 ? fmtL(l('Prioridade paga ({c}), mas ainda faltam {d} semanas.', 'Priority paid ({c}), but still {d} weeks short.'), { c: $(c), d: lt.weeks }) : fmtL(l('Prioridade paga ({c}): chega na data.', 'Priority paid ({c}): arrives on time.'), { c: $(c) });
  }
  if (how === 'postpone') {
    const lt = lateOf18(s, pr, b);
    if (lt.weeks <= 0) return l('Não há atraso.', 'There is no delay.');
    pr.week += lt.weeks;
    const a = s.acts[pr.actId];
    if (a) a.momentum = clamp(a.momentum - Math.min(6, 1 + lt.weeks / 3), 0, 100);
    log(s, fmtL(l('"{t}" adiado {d} semanas para esperar a fábrica.', '"{t}" pushed back {d} weeks to wait for the plant.'), { t: pr.title, d: lt.weeks }));
    return fmtL(l('Nova data: semana {w}. Os fãs reclamam um pouco, mas o disco chega às lojas no dia.', 'New date: week {w}. Fans grumble a little, but the record hits stores on the day.'), { w: pr.week });
  }
  b.asked = true;
  return l('Sai na data; o físico atrasado chega depois.', 'Out on the date; the late physical arrives later.');
}

/** Política automática (delegação): o que fazer quando a fábrica não cumpre a data. */
function autoLate(s: GameState, pr: PendingRelease, b: Book18, pol: LatePol): void {
  const lt = lateOf18(s, pr, b);
  if (lt.weeks <= 0) return;
  if (pol === 'postpone') { resolveLate18(s, pr.id, 'postpone'); return; }
  if (pol === 'rush') { resolveLate18(s, pr.id, 'rush'); if (lateOf18(s, pr, b).weeks > 0) resolveLate18(s, pr.id, 'postpone'); return; }
  if (pol === 'smart') {
    const phys = physicalShare(s) * lt.share;
    if (phys < 0.06) return; // o físico atrasado pesa pouco: lança
    if (!boom18(s) && lt.weeks <= 3 && s.player.cash > rushCost18(s, pr) * 20) { resolveLate18(s, pr.id, 'rush'); if (lateOf18(s, pr, b).weeks <= 0) return; }
    resolveLate18(s, pr.id, 'postpone');
  }
}

function askLate(s: GameState, pr: PendingRelease, b: Book18): void {
  const lt = lateOf18(s, pr, b);
  b.asked = true;
  const mats = (Object.keys(b.ready) as Material[]).filter((m) => (b.ready[m] ?? 0) > pr.week);
  pushInbox18(s, 'supply_late', {
    from: plant18(b.plant[mats[0]] ?? '')?.name.pt ?? 'Fábrica', tone: 'bad', weeks: Math.max(1, pr.week - s.week),
    subject: fmtL(l('Fábrica não cumpre a data de "{t}"', 'Plant will miss the date for "{t}"'), { t: pr.title }),
    body: fmtL(l('{m} só fica pronto {d} semana(s) depois da data de lançamento ({p}% do físico). Quem perde a data perde a maior parte da venda de lançamento: os fãs compram no dia, ou nunca. Adiar custa um pouco de expectativa; prioridade custa {c}.', '{m} will only be ready {d} week(s) after the street date ({p}% of the physical). Missing the date loses most launch sales: fans buy on the day, or never. Postponing costs a little hype; priority costs {c}.'),
      { m: mats.map((m) => MATERIAL_NAMES[m].pt).join(', '), d: lt.weeks, p: Math.round(lt.share * 100), c: $(rushCost18(s, pr)) }),
    ref: { pr: pr.id },
    actions: [{ id: 'postpone', label: l('Adiar o lançamento', 'Postpone the release') }, { id: 'rush', label: fmtL(l('Pagar prioridade ({c})', 'Pay priority ({c})'), { c: $(rushCost18(s, pr)) }) }, { id: 'launch', label: l('Lançar assim mesmo', 'Launch anyway') }],
  });
}

/** Na programação: reserva automática; atraso → política do jogador. Esbarrão de major em época de aperto. */
function scanPending(s: GameState): void {
  const st = sup18(s);
  const mine = s.pendingReleases.filter((p) => s.acts[p.actId]?.owner === 'player' && physOf(p.formats) && p.press > 0);
  for (const pr of mine) {
    let b = st.book[pr.id];
    if (!b) {
      b = book18(s, pr)!;
      if (!b) continue;
      const d = plantDelta(s, pr, b);
      if (d) post(s, `sup18plb:${pr.id}`, -d, 'manufacturing', `Fábrica (preço): ${pr.title}`);
      // época de aperto: um pedido gigante de estrela da major passa na sua frente
      const vp = b.plant.vinyl ? plant18(b.plant.vinyl) : undefined;
      if (vp && boom18(s) && st.dist !== 'major_pd' && !(st.top && st.top.plant === vp.id) && !ownPlant18(s) && rngFor(s, `bump|${pr.id}`).chance(vp.major || vp.cap >= 1.4 ? 0.25 : 0.1)) {
        b.bumped = true;
        book18(s, pr);
        const star = Object.values(s.labels).filter((x) => x.active && x.family === 'A').flatMap((x) => x.roster.slice(0, 6)).map((id) => s.acts[id]).filter(Boolean).sort((a, c) => c.fame - a.fame)[0];
        const who = star?.name ?? 'uma superestrela';
        pushInbox18(s, 'supply_bump', { from: vp.name.pt, tone: 'bad', subject: fmtL(l('"{t}" foi para o fim da fila', '"{t}" was bumped down the queue'), { t: pr.title }),
          body: fmtL(l('A fábrica aceitou um pedido gigante de {a} e empurrou o vinil de "{t}" mais 4 semanas. Selos pequenos são os primeiros a sair da fila. Contrato de capacidade, P&D com major ou fábrica própria evitam isso.', 'The plant took a giant order from {a} and pushed the vinyl of "{t}" back 4 more weeks. Small labels are the first bumped. A capacity contract, a P&D deal or your own plant prevents this.'), { a: who, t: pr.title }), ref: { pr: pr.id } });
        emitFact(s, { kind: 'deal', actors: ['player', star ? star.id : ''], severity: 15, visibility: 'rumor', tags: ['supply', 'pressing'], text: fmtL(l('Pedido de {a} atropela a fila das prensas; selos pequenos esperam.', '{a}\'s order flattens the pressing queue; small labels wait.'), { a: who }), src: 'supply18' });
      }
    }
    if (b.asked) continue;
    const lt = lateOf18(s, pr, b);
    if (lt.weeks <= 0 || lt.share < 0.15) continue;
    if (st.late === 'ask') askLate(s, pr, b);
    else { b.asked = true; autoLate(s, pr, b, st.late); }
  }
}
registerSimHook('day', 'supply18', (s) => { if (s.pendingReleases.length && !off18('day')) scanPending(s); });

// ================================================================== lançamento: a data e a fábrica

registerSimHook('launch', 'supply18', (s, _r, a) => {
  const rel = a.release;
  if (off18('launch')) return;
  if (!rel || rel.owner !== 'player' || rel.stock === Infinity || !rel.pressed) return;
  const st = sup18(s);
  const id = Object.keys(st.book).find((k) => { const b = st.book[k]; return b.act === rel.actId && b.title === rel.title && !s.pendingReleases.some((p) => p.id === k); });
  if (!id) return;
  const b = st.book[id];
  delete st.book[id];
  const sh = relMatShares(s, rel.formats);
  const r = rngFor(s, `def|${rel.id}`);
  let late = 0, held = 0, def = 0;
  const ind = s.x4.industry;
  for (const [m, rw] of Object.entries(b.ready) as [Material, number][]) {
    const p = plant18(b.plant[m] ?? '');
    const units = Math.round(rel.pressed * (sh[m] ?? 0));
    // qualidade da fábrica: defeitos extras (ou a menos) sobre o que a prensa padrão já descartou
    const dr = clamp((p?.def ?? 0) + (b.rush ? 0.008 : 0) + r.normal(0, 0.004), -0.02, 0.06);
    def += Math.round(units * dr);
    const d = rw - s.week;
    if (d > 0) {
      late = Math.max(late, d);
      const take = Math.min(rel.stock, units);
      rel.stock -= take; held += take;
      ind.orders.push({ releaseId: rel.id, units: take, ready: rw, own: false });
    }
  }
  if (def > 0) { rel.stock = Math.max(0, rel.stock - def); post(s, `sup18def:${rel.id}`, -Math.round(def * money(s, 0.35)), 'manufacturing', `Refugo da fábrica: ${rel.title}`); }
  else if (def < 0) rel.stock += Math.min(-def, rel.pressed * 0.02);
  st.rel[rel.id] = { plant: Object.values(b.plant)[0] ?? '', late, var: b.var ?? 0, def };
  const keys = Object.keys(st.rel);
  if (keys.length > 60) delete st.rel[keys[0]];
  if (late > 0 && held > 0) {
    const act = s.acts[rel.actId];
    const txt = fmtL(l('"{t}" chega às lojas sem {n} cópias físicas: a fábrica atrasou {d} semanas.', '"{t}" hits stores missing {n} physical copies: the plant ran {d} weeks late.'), { t: rel.title, n: held.toLocaleString('en-US'), d: late });
    notify(s, txt, 'bad');
    log(s, txt);
    emitFact(s, { kind: 'release', actors: ['player', rel.actId], severity: 20 + Math.min(30, late * 2), visibility: (act?.fame ?? 0) >= 40 ? 'public' : 'rumor', tags: ['supply', 'late', 'release'], text: txt, src: 'supply18' });
    if (act) act.trust = clamp(act.trust - Math.min(6, 1 + late / 3), 0, 100);
  }
});

// ================================================================== variantes e contrato de capacidade

export const variantsOk18 = (s: GameState, formats: string[]): boolean => s.year >= 2014 && formats.some((f) => f === 'lp' || f === 'single45');
export const variantCost18 = (s: GameState): number => money(s, 1500);
export function setVariants18(s: GameState, prId: string, n: number): L | null {
  const pr = s.pendingReleases.find((x) => x.id === prId);
  const b = sup18(s).book[prId];
  if (!pr || !b) return l('Inválido.', 'Invalid.');
  if (!variantsOk18(s, pr.formats)) return l('Variantes só existem para vinil, a partir de 2014.', 'Variants only exist for vinyl, from 2014.');
  n = clamp(Math.round(n), 0, 4);
  const add = n - (b.var ?? 0);
  if (add > 0) { const c = variantCost18(s) * add; if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.'); post(s, `sup18var:${prId}:${n}`, -c, 'manufacturing', `Variantes de vinil: ${pr.title}`); }
  b.var = n;
  return null;
}

export const topCost18 = (s: GameState, units: number): number => Math.round(money(s, units * 0.35));
/** Contrato de capacidade (take-or-pay): paga todo mês, usando ou não; fila de 1 semana nessa fábrica por 12 meses. */
export function reserveCap18(s: GameState, plantId: string, units: number): L | null {
  const p = plant18(plantId), st = sup18(s);
  if (!p || !plantsNow(s).includes(p)) return l('Fábrica indisponível.', 'Plant unavailable.');
  if (st.top && st.top.until > s.week) return l('Já existe um contrato de capacidade em vigor.', 'A capacity contract is already running.');
  const c = topCost18(s, units);
  if (s.player.cash < c) return l('Caixa insuficiente para o primeiro mês.', 'Not enough cash for the first month.');
  st.top = { plant: plantId, units, until: s.week + 52 };
  post(s, `sup18top:${plantId}:${s.week}`, -c, 'manufacturing', `Capacidade reservada: ${p.name.pt}`);
  log(s, fmtL(l('Contrato de capacidade com {p}: {u} cópias/mês por 12 meses.', 'Capacity contract with {p}: {u} copies/month for 12 months.'), { p: p.name, u: units.toLocaleString('en-US') }));
  return null;
}

registerMod('chartUnits', 'supply18', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const st = sup18(s);
  let k = 1;
  const age = s.week - rel.week;
  const vi = st.rel[rel.id]?.var ?? 0;
  if (vi && age <= 6) k *= 1 + 0.04 * vi;
  const d = dist18(st.dist), g = agg18(st.agg);
  if (d.reach || g.pitch) { const ph = physicalShare(s); k *= 1 + ph * d.reach + (digitalOn18(s) ? (1 - ph) * g.pitch : 0); }
  if (Math.abs(k - 1) < 0.002) return null;
  return { value: v * k, label: vi && age <= 6 ? l('Variantes e distribuição', 'Variants and distribution') : l('Distribuição e agregador', 'Distribution and aggregator') };
});

// ================================================================== distribuidor: escolha, taxa, prazo

/** Ajuste da taxa de distribuição (somado à taxa da sede em market.distributionFee). */
export function feeAdj18(s: GameState): number {
  const st = sup18(s);
  const ph = physicalShare(s);
  const d = dist18(st.dist), g = agg18(st.agg);
  let adj = ph * d.fee;
  if (g.fee >= 0 && digitalOn18(s)) adj += (1 - ph) * (g.fee - baseFee(s));
  return Math.round(adj * 1000) / 1000;
}
const baseFee = (s: GameState) => [0.22, 0.2, 0.17, 0.13, 0.1, 0.08][s.player.hq] ?? 0.08;
function syncFlags(s: GameState): void {
  const st = sup18(s), d = dist18(st.dist);
  s.flags.distFeeAdj18 = feeAdj18(s);
  s.flags.distLag18 = d.lag;
  s.flags.distRes18 = d.res;
}
export const partnerOf18 = (s: GameState): string => { const st = sup18(s); return st.partner && s.labels[st.partner]?.active ? st.partner : ''; };
export function majorFor18(s: GameState): string {
  const lbs = Object.values(s.labels).filter((x) => x.active && x.family === 'A');
  return lbs.sort((a, b) => (s.rivalries[a.id] ?? 0) - (s.rivalries[b.id] ?? 0) || b.reputation - a.reputation)[0]?.id ?? '';
}
export const distAdv18 = (s: GameState): number => Math.round(money(s, dist18('major_pd').adv) * (0.6 + s.player.hq * 0.25));

export function setDist18(s: GameState, id: string): L | null {
  const st = sup18(s), d = DISTS18.find((x) => x.id === id);
  if (!d || s.year < d.from || s.year > d.to) return l('Indisponível nesta época.', 'Unavailable in this era.');
  if (st.dist === id) return null;
  if (st.dist === 'major_pd' && st.adv > 0) {
    if (s.player.cash < st.adv) return fmtL(l('Para sair do P&D é preciso devolver o adiantamento não recuperado ({v}).', 'Leaving the P&D means repaying the unrecouped advance ({v}).'), { v: $(st.adv) });
    post(s, `sup18advback:${s.week}`, -st.adv, 'financing', 'Devolução do adiantamento do distribuidor');
    st.adv = 0;
  }
  if (id === 'major_pd') {
    const lb = majorFor18(s);
    if (!lb) return l('Nenhuma major ativa aceita o acordo.', 'No active major will take the deal.');
    if ((s.rivalries[lb] ?? 0) > 50) return l('A rivalidade com as majors impede o acordo.', 'Rivalry with the majors blocks the deal.');
    st.partner = lb;
    st.adv = distAdv18(s);
    post(s, `sup18adv:${s.week}`, st.adv, 'financing', `Adiantamento de distribuição (${s.labels[lb].name})`);
    s.rivalries[lb] = Math.max(0, (s.rivalries[lb] ?? 0) - 10);
    emitFact(s, { kind: 'deal', actors: ['player', `l:${lb}`], severity: 30, visibility: 'public', tags: ['deal', 'distribution'], text: fmtL(l('{c} fecha acordo de prensagem e distribuição com {m}.', '{c} signs a pressing & distribution deal with {m}.'), { c: s.config.companyName, m: s.labels[lb].name }), src: 'supply18' });
  } else st.partner = '';
  if (id === 'indie_net') st.health = 70;
  st.dist = id;
  st.distSince = s.week;
  syncFlags(s);
  log(s, fmtL(l('Novo distribuidor: {d}.', 'New distributor: {d}.'), { d: d.name }));
  return null;
}
export function setAgg18(s: GameState, id: string): L | null {
  const st = sup18(s), g = AGGS18.find((x) => x.id === id);
  if (!g || s.year < g.from || (id !== 'none' && !digitalOn18(s))) return l('Indisponível nesta época.', 'Unavailable in this era.');
  const cur = agg18(st.agg);
  if (cur.lock && s.week - st.aggSince < cur.lock * 4.35) return fmtL(l('Contrato mínimo: só a partir da semana {w}.', 'Minimum term: only from week {w}.'), { w: Math.ceil(st.aggSince + cur.lock * 4.35) });
  st.agg = id;
  st.aggSince = s.week;
  syncFlags(s);
  log(s, fmtL(l('Digital agora via {d}.', 'Digital now via {d}.'), { d: g.name }));
  return null;
}

/** Baixa de recebíveis de distribuidor (quebra): perde `frac` do que ele devia nos mercados dados. */
function writeOffDist(s: GameState, frac: number, mks: MarketId[] | null, memo: string): number {
  const f = fin18(s);
  let lost = 0;
  for (const b of f.ar) if (b.who === 'dist' && b.amt > 0 && (!mks || mks.includes(b.mk as MarketId))) { const x = Math.round(b.amt * frac); b.amt -= x; lost += x; }
  f.ar = f.ar.filter((b) => b.amt !== 0);
  if (lost > 0) post(s, `sup18wo:${s.week}:${memo.length}`, -lost, 'other', memo, false);
  return lost;
}

// ================================================================== mês: armazém, devoluções, saúde do distribuidor

function monthTick(s: GameState): void {
  const st = sup18(s);
  const r = rngFor(s, `m|${s.year}|${s.month}`);
  syncFlags(s);
  // carga das fábricas: anda devagar (pedidos grandes, quebras de máquina)
  for (const p of plantsNow(s)) st.load[p.id] = clamp((st.load[p.id] ?? 1) * 0.8 + 0.2 * (1 + r.normal(0, 0.18)) + (boom18(s) && p.cap >= 1.4 ? 0.02 : 0), 0.7, 1.6);
  // contrato de capacidade
  if (st.top) {
    if (st.top.until <= s.week) { log(s, l('Contrato de capacidade encerrado.', 'Capacity contract ended.')); st.top = null; }
    else post(s, `sup18topm:${s.year}:${s.month}`, -topCost18(s, st.top.units), 'manufacturing', 'Capacidade reservada (take-or-pay)');
  }
  // armazém e devoluções
  let stock = 0, retNew = 0;
  const own = playerActs(s);
  for (const aid of own) for (const rid of s.acts[aid]?.releases ?? []) {
    const rel = s.releases[rid];
    if (!rel || rel.owner !== 'player' || rel.stock === Infinity) continue;
    const age = s.week - rel.week;
    if (rel.stock > 0 && age > 6) stock += rel.stock;
    const ret = rel.returns ?? 0;
    const seen = st.ret[rid] ?? 0;
    if (ret > seen) { retNew += ret - seen; st.ret[rid] = ret; }
    // 1979–80: "shipped gold, returned platinum" — o varejo devolve a febre da disco
    if (s.year >= 1979 && s.year <= 1980 && age < 30 && age > 2 && rel.weekly.length) {
      const sold = rel.weekly.slice(-4).reduce((t, x) => t + x, 0) * 0.8;
      const back = Math.round(sold * 0.08);
      if (back > 50) {
        const per = rel.revenue / Math.max(1, rel.totalUnits);
        rel.stock += back; rel.returns = (rel.returns ?? 0) + back; st.ret[rid] = rel.returns;
        postSalesAR18(s, rel, `sup18disco:${rid}:${s.month}`, -Math.round(back * per), 'sales', `Devolução da febre disco: ${rel.title}`);
      }
    }
  }
  st.stor = Math.round(stock * money(s, 0.015));
  if (st.stor > 0) post(s, `sup18stor:${s.year}:${s.month}`, -st.stor, 'manufacturing', 'Armazém (estoque parado)');
  if (retNew > 0) post(s, `sup18ret:${s.year}:${s.month}`, -Math.round(retNew * money(s, 0.12)), 'distribution', 'Frete e triagem de devoluções');
  for (const k of Object.keys(st.ret)) if (!s.releases[k]) delete st.ret[k];
  // P&D: o adiantamento é recuperado das vendas (25% do faturamento do mês)
  if (st.dist === 'major_pd' && st.adv > 0) {
    const take = Math.min(st.adv, Math.round(Math.max(0, s.monthLedger.sales ?? 0) * 0.25));
    if (take > 0) { st.adv -= take; post(s, `sup18rec:${s.year}:${s.month}`, -take, 'financing', 'Recuperação do adiantamento do distribuidor'); }
  }
  if (st.dist === 'major_pd' && !partnerOf18(s)) { setDist18(s, 'self'); notify(s, l('A major do seu P&D fechou: você volta à distribuição própria.', 'Your P&D major closed: back to own distribution.'), 'bad'); }
  // rede independente: saúde e quebra
  if (st.dist === 'indie_net') {
    const crisis = (s.year >= 1979 && s.year <= 1982) || (s.year >= 1996 && s.year <= 2003) || (s.year >= 2008 && s.year <= 2012);
    st.health = clamp(st.health + r.normal(0.4, 3) - (crisis ? 1.6 : 0) + (retailCycle(s.year) - 1) * 2, 0, 100);
    if (st.health < 25 && r.chance(0.04 + (25 - st.health) / 250)) distBust(s);
  }
  // agregadores: anuidade e derrubada por fraude
  const g = agg18(st.agg);
  if (g.id !== 'none' && digitalOn18(s)) {
    if (g.flat && s.month === 0) post(s, `sup18flat:${s.year}`, -money(s, g.flat) * Math.max(1, own.length), 'distribution', `Anuidade do agregador (${own.length} artistas)`);
    if (r.chance(g.take / 12) && own.length) {
      const aid = own[r.int(0, own.length - 1)];
      const a = s.acts[aid];
      if (a) {
        a.momentum = clamp(a.momentum - 8, 0, 100);
        const txt = fmtL(l('O agregador derrubou o catálogo de {a} por suspeita de streams artificiais; a investigação devolve as faixas semanas depois.', 'The aggregator took down {a}\'s catalog over suspected artificial streams; the review restores the tracks weeks later.'), { a: a.name });
        pushInbox18(s, 'supply_takedown', { from: g.name.pt, tone: 'bad', subject: l('Faixas derrubadas pelo agregador', 'Tracks taken down by the aggregator'), body: txt, ref: { act: aid } });
        emitFact(s, { kind: 'scandal', actors: [aid, 'player'], severity: 18, visibility: 'rumor', tags: ['streaming', 'fraud', 'supply'], text: txt, src: 'supply18' });
        log(s, txt);
      }
    }
  }
}
registerSimHook('month', 'supply18', (s) => { if (!off18('month')) monthTick(s); });

function distBust(s: GameState): void {
  const st = sup18(s);
  const lost = writeOffDist(s, 0.6, null, 'Quebra do distribuidor independente');
  st.busts.push(s.year);
  const txt = fmtL(l('Sua rede de distribuição independente quebrou devendo {v} ao selo. Você volta à distribuição própria.', 'Your independent distribution network went bust owing the label {v}. You are back to own distribution.'), { v: $(lost) });
  setDist18(s, 'self');
  notify(s, txt, 'bad');
  pushInbox18(s, 'supply_bust', { from: 'Distribuidora', tone: 'bad', subject: l('Distribuidor quebrou', 'Distributor went bust'), body: txt });
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 40, visibility: 'public', tags: ['distribution', 'bankrupt', 'money'], text: txt, src: 'supply18' });
  remember(s, 'dist_bust', txt, { important: true });
}

/** Quebras de grandes redes de varejo (crise do disco, fim das megastores): levam parte do que deviam. */
const CHAIN_BUSTS: [number, MarketId[], L][] = [
  [1980, ['na'], l('A febre da disco acaba e redes de lojas quebram com estoques devolvidos.', 'Disco fever ends and store chains go bust with returned stock.')],
  [2006, ['na'], l('A maior rede de megastores dos EUA fecha as portas.', 'The biggest US megastore chain shuts its doors.')],
  [2009, ['eu'], l('Uma rede europeia de megastores pede falência.', 'A European megastore chain files for bankruptcy.')],
  [2013, ['eu'], l('A última grande rede de discos britânica entra em recuperação judicial.', 'The last big British record chain goes into administration.')],
];
registerSimHook('year', 'supply18', (s) => {
  const st = sup18(s);
  for (const [y, mks, t] of CHAIN_BUSTS) {
    if (s.year !== y + 1 || st.bl.includes(`chain${y}`)) continue;
    st.bl.push(`chain${y}`);
    const lost = writeOffDist(s, 0.15, mks, 'Quebra de rede de varejo');
    if (lost > 0) {
      const txt = fmtL(l('{t} O selo perde {v} em notas a receber.', '{t} The label loses {v} in receivables.'), { t, v: $(lost) });
      notify(s, txt, 'bad'); log(s, txt);
      emitFact(s, { kind: 'deal', actors: ['player'], severity: 30, visibility: 'public', tags: ['retail', 'bankrupt', 'money'], text: txt, src: 'supply18' });
    }
  }
  // P&D: mínimo de lançamentos por ano (o ano que fechou)
  if (st.dist === 'major_pd' && s.week - st.distSince > 40) {
    const y = s.year - 1;
    const n = playerActs(s).reduce((t, id) => t + (s.acts[id]?.releases ?? []).filter((rid) => s.releases[rid]?.year === y && s.releases[rid]?.owner === 'player').length, 0);
    if (n < dist18('major_pd').minRel) {
      const owed = st.adv;
      const lb = s.labels[st.partner]?.name ?? 'major';
      st.adv = 0;
      if (owed > 0) post(s, `sup18claw:${s.year}`, -owed, 'financing', 'Adiantamento cobrado de volta (P&D rescindido)');
      st.dist = 'self'; st.partner = ''; syncFlags(s);
      const txt = fmtL(l('{m} rescinde o P&D: só {n} lançamento(s) em {y} (mínimo {k}). Cobra {v} de adiantamento não recuperado.', '{m} terminates the P&D: only {n} release(s) in {y} (minimum {k}). It claws back {v} of unrecouped advance.'), { m: lb, n, y, k: dist18('major_pd').minRel, v: $(owed) });
      notify(s, txt, 'bad'); log(s, txt);
      pushInbox18(s, 'supply_bust', { from: lb, tone: 'bad', subject: l('P&D rescindido', 'P&D terminated'), body: txt });
    } else if (st.adv <= 0) { st.adv = distAdv18(s); post(s, `sup18adv:${s.year}:${s.week}`, st.adv, 'financing', 'Novo adiantamento de distribuição'); }
  }
  for (const k of Object.keys(st.book)) if (!s.pendingReleases.some((p) => p.id === k)) delete st.book[k];
});

// ================================================================== estoque: ponta de estoque e destruição

export function stockList18(s: GameState): { rel: Release; stock: number; weekly: number; cost: number }[] {
  const out: { rel: Release; stock: number; weekly: number; cost: number }[] = [];
  for (const aid of playerActs(s)) for (const rid of s.acts[aid]?.releases ?? []) {
    const rel = s.releases[rid];
    if (!rel || rel.owner !== 'player' || rel.stock === Infinity || rel.stock <= 0) continue;
    out.push({ rel, stock: rel.stock, weekly: Math.round((rel.weekly.slice(-4).reduce((t, x) => t + x, 0) / 4) * physicalShare(s)), cost: Math.round(rel.stock * money(s, 0.015)) });
  }
  return out.sort((a, b) => b.cost - a.cost);
}
/** Ponta de estoque (cut-out): vende o encalhe por ~15% a lojas de saldão. O artista não gosta de ver o disco no cesto. */
export function cutOut18(s: GameState, relId: string, destroy = false): L | null {
  const rel = s.releases[relId];
  if (!rel || rel.owner !== 'player' || rel.stock === Infinity || rel.stock <= 0) return l('Sem estoque.', 'No stock.');
  if (s.week - rel.week < 12) return l('Cedo demais: o disco acabou de sair.', 'Too early: the record just came out.');
  const n = rel.stock;
  const per = rel.revenue / Math.max(1, rel.totalUnits);
  rel.stock = 0;
  sup18(s).cut.push(relId);
  const a = s.acts[rel.actId];
  if (destroy) {
    post(s, `sup18destroy:${relId}`, -Math.round(n * money(s, 0.03)), 'manufacturing', `Destruição de estoque: ${rel.title}`);
    log(s, fmtL(l('{n} cópias de "{t}" destruídas.', '{n} copies of "{t}" destroyed.'), { n: n.toLocaleString('en-US'), t: rel.title }));
    return null;
  }
  const got = Math.round(n * Math.max(per * 0.15, money(s, 0.25)));
  post(s, `sup18cut:${relId}`, got, 'sales', `Ponta de estoque: ${rel.title}`);
  if (a && a.status !== 'retired' && a.owner === 'player') a.trust = clamp(a.trust - 3, 0, 100);
  emitFact(s, { kind: 'release', actors: [rel.actId, 'player'], severity: 10, visibility: 'rumor', tags: ['supply', 'cutout'], text: fmtL(l('Cópias de "{t}" aparecem furadas no cesto de saldão.', 'Copies of "{t}" turn up, punched, in the bargain bin.'), { t: rel.title }), src: 'supply18' });
  log(s, fmtL(l('{n} cópias de "{t}" vendidas como ponta de estoque por {v}.', '{n} copies of "{t}" sold off as cut-outs for {v}.'), { n: n.toLocaleString('en-US'), t: rel.title, v: $(got) }));
  return null;
}

// ================================================================== caixa de entrada, porquês e conselheiro

registerInboxKind('supply_late', {
  label: l('Fábrica', 'Plant'), cat: 'decision', icon: 'disc', prio: 3,
  goto: () => ({ area: 'supply18', label: l('Abrir cadeia física', 'Open supply chain') }),
  handle: (s, m, action) => resolveLate18(s, String(m.ref?.pr ?? ''), action === 'postpone' ? 'postpone' : action === 'rush' ? 'rush' : 'launch'),
});
registerInboxKind('supply_bump', { label: l('Fábrica', 'Plant'), cat: 'world', icon: 'disc', prio: 2, goto: () => ({ area: 'supply18' }) });
registerInboxKind('supply_bust', { label: l('Distribuição', 'Distribution'), cat: 'money', icon: 'bank', prio: 3, goto: () => ({ area: 'supply18' }) });
registerInboxKind('supply_takedown', { label: l('Agregador', 'Aggregator'), cat: 'press', icon: 'disc', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : { area: 'supply18' }) });

registerExplain('supply.queue', (s, c) => {
  const p = plant18(String(c.plant ?? '')), m = String(c.mat ?? 'vinyl') as Material;
  if (!p) return null;
  const st = sup18(s);
  const parts: WhyPart[] = [{ label: fmtL(l('Fila base de {m} em {y}', 'Base {m} queue in {y}'), { m: MATERIAL_NAMES[m], y: s.year }), value: baseQueue18(m, s.year), fmt: 'num', note: queueWhy18(m, s.year) ?? undefined }];
  parts.push({ label: l('Carga da fábrica (pedidos, máquinas)', 'Plant load (orders, machines)'), value: st.load[p.id] ?? 1, fmt: 'mult' });
  if (p.cap >= 1.4 || p.cap <= 0.35) parts.push({ label: l('Porte da fábrica', 'Plant size'), value: p.cap >= 1.4 ? 0.9 : 1.35, fmt: 'mult' });
  for (const [w, v] of clientFactor18(s, p).why) parts.push({ label: w, value: v, fmt: 'mult', tone: v > 1 ? 'bad' : 'good' });
  if (p.ship) parts.push({ label: l('Frete', 'Shipping'), value: p.ship, fmt: 'signed' });
  if (st.top && st.top.plant === p.id && st.top.until > s.week) parts.push({ label: l('Contrato de capacidade: 1 semana', 'Capacity contract: 1 week'), value: 1, fmt: 'num', tone: 'good' });
  return { title: fmtL(l('Fila: {p}', 'Queue: {p}'), { p: p.name }), value: queueOf18(s, p, m), fmt: 'num', parts, note: l('Semanas até o lote ficar pronto; 4 semanas de laca, teste e capa já correm antes da data anunciada.', 'Weeks until the batch is ready; 4 weeks of lacquer, test pressing and sleeves already run before the announced date.') };
});
registerExplain('supply.fee', (s) => {
  const st = sup18(s), ph = physicalShare(s), d = dist18(st.dist), g = agg18(st.agg);
  const parts: WhyPart[] = [{ label: l('Taxa da sede (escala)', 'HQ fee (scale)'), value: baseFee(s), fmt: 'pct' }];
  if (d.fee) parts.push({ label: fmtL(l('{d} × físico ({p}%)', '{d} × physical ({p}%)'), { d: d.name, p: Math.round(ph * 100) }), value: d.fee * ph, fmt: 'pct', tone: d.fee > 0 ? 'bad' : 'good' });
  if (g.fee >= 0 && digitalOn18(s)) parts.push({ label: fmtL(l('{g} no digital ({p}%)', '{g} on digital ({p}%)'), { g: g.name, p: Math.round((1 - ph) * 100) }), value: (1 - ph) * (g.fee - baseFee(s)), fmt: 'pct' });
  if ((s.flags.fastPay18 ?? 0) > 0) parts.push({ label: l('Distribuidor rápido', 'Fast distributor'), value: 0.03, fmt: 'pct', tone: 'bad' });
  return { title: l('Taxa de distribuição', 'Distribution fee'), value: baseFee(s) + feeAdj18(s) + ((s.flags.fastPay18 ?? 0) > 0 ? 0.03 : 0), fmt: 'pct', parts, note: fmtL(l('Prazo do físico: {m} meses + atraso do país; reserva de devolução {r}%.', 'Physical payment: {m} months + country delay; returns reserve {r}%.'), { m: (s.year < 1970 ? 4 : 3) + d.lag, r: Math.round(d.res * 100) }) };
});

registerAdvisorTip('supply18', (s) => {
  const st = sup18(s), out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  const lateN = s.pendingReleases.filter((p) => st.book[p.id] && lateOf18(s, p, st.book[p.id]).weeks > 0).length;
  if (lateN) out.push({ id: 'sup-late', level: 'warn', cat: 'release', score: 72, text: fmtL(l('{n} lançamento(s) programado(s) chegam antes do vinil.', '{n} scheduled release(s) arrive before the vinyl.'), { n: lateN }), why: [queueWhy18('vinyl', s.year) ?? l('Fila da fábrica maior que o prazo.', 'Plant queue longer than the lead time.')], effect: l('Adiar evita perder a venda de lançamento do físico.', 'Postponing avoids losing physical launch sales.'), goto: { area: 'supply18' } });
  if (boom18(s) && !st.top && s.player.hq >= 2 && !ownPlant18(s) && st.dist !== 'major_pd') out.push({ id: 'sup-top', level: 'info', cat: 'opportunity', score: 45, text: l('Prensas lotadas: um contrato de capacidade garante fila de 1 semana.', 'Presses are packed: a capacity contract guarantees a 1-week queue.'), why: [fmtL(l('Fila de vinil: ~{q} semanas.', 'Vinyl queue: ~{q} weeks.'), { q: baseQueue18('vinyl', s.year) })], effect: fmtL(l('{c}/mês por 5 mil cópias.', '{c}/month for 5k copies.'), { c: $(topCost18(s, 5000)) }), goto: { area: 'supply18' } });
  if (st.stor > money(s, 800)) {
    const top = stockList18(s).find((x) => s.week - x.rel.week > 26 && x.weekly * 52 < x.stock * 0.3);
    if (top) out.push({ id: 'sup-stor', level: 'warn', cat: 'cash', score: 50, text: fmtL(l('Estoque parado custa {c}/mês de armazém.', 'Idle stock costs {c}/month in storage.'), { c: $(st.stor) }), why: [fmtL(l('"{t}": {n} cópias, vendendo ~{w}/semana.', '"{t}": {n} copies, selling ~{w}/week.'), { t: top.rel.title, n: top.stock.toLocaleString('en-US'), w: top.weekly })], effect: l('Ponta de estoque: entra ~15% do preço; o artista torce o nariz.', 'Cut-outs: ~15% of price comes in; the artist frowns.'), goto: { area: 'supply18' }, run: { label: l('Vender como ponta de estoque', 'Sell off as cut-outs'), fn: (x) => cutOut18(x, top.rel.id) ?? l('Vendido.', 'Sold off.') } });
  }
  if (st.dist === 'indie_net' && st.health < 40) out.push({ id: 'sup-health', level: 'bad', cat: 'cash', score: 70, text: l('Sua distribuidora independente está mal das pernas.', 'Your independent distributor is in bad shape.'), why: [fmtL(l('Saúde {h}/100; se quebrar, leva ~60% do que deve.', 'Health {h}/100; if it fails, ~60% of what it owes is gone.'), { h: Math.round(st.health) })], effect: l('Trocar de distribuidor protege os recebíveis futuros.', 'Switching distributor protects future receivables.'), goto: { area: 'supply18' } });
  if (digitalOn18(s) && st.agg === 'none' && s.year >= 2010 && baseFee(s) > 0.12) out.push({ id: 'sup-agg', level: 'info', cat: 'opportunity', score: 40, text: l('Um agregador digital cobra menos que o seu distribuidor no digital.', 'A digital aggregator charges less than your distributor on digital.'), why: [fmtL(l('Taxa atual no digital: {p}%.', 'Current digital fee: {p}%.'), { p: Math.round(baseFee(s) * 100) })], goto: { area: 'supply18' }, run: { label: l('Usar agregador por porcentagem', 'Use a percentage aggregator'), fn: (x) => setAgg18(x, 'agg_pct') ?? l('Feito.', 'Done.') } });
  return out;
});

// ================================================================== bot (playbot): pedidos sensatos

/** Playbot: política de atraso inteligente, distribuidor/agregador pela época e ponta de estoque do encalhe. */
export function botSupply18(s: GameState, prof: 'cautious' | 'balanced' | 'aggressive'): void {
  if (off18('bot')) return;
  const st = sup18(s);
  st.late = 'smart';
  if (s.config.role === 'artist') return;
  const n = playerActs(s).length;
  if (digitalOn18(s) && s.year >= 2005) {
    const want = prof === 'aggressive' && s.year >= 2012 ? 'agg_label' : baseFee(s) > 0.12 ? (s.year >= 2013 && n >= 3 && prof !== 'cautious' ? 'agg_flat' : 'agg_pct') : 'none';
    if (st.agg !== want && AGGS18.find((g) => g.id === want)!.from <= s.year) setAgg18(s, want);
  }
  if (st.dist === 'self' && prof === 'aggressive' && s.year >= 1960 && n >= 3 && s.player.hq >= 1) setDist18(s, 'major_pd');
  if (st.dist === 'indie_net' && st.health < 35) setDist18(s, 'self');
  if (st.dist === 'self' && prof === 'cautious' && s.year >= 1955 && physicalShare(s) > 0.5 && st.busts.length === 0) setDist18(s, 'indie_net');
  for (const x of stockList18(s)) if (s.week - x.rel.week > 40 && x.weekly * 26 < x.stock * 0.2) cutOut18(s, x.rel.id);
}
