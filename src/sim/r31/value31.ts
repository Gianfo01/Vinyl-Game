// R31 · onda 3 (E · Bolsa) — MODELO ÚNICO DE VALOR de empresa listada (o seu selo e os selos rivais).
//
// O valor sai do que a empresa TEM e FAZ, numa conta por partes que soma exatamente o total e não conta o mesmo
// dinheiro duas vezes (teste r31-bolsa):
//
//   patrimônio      caixa · bens (pelo valor contábil, sem catálogo/empresas, que entram pelo que rendem) ·
//                   relíquias (valor de venda) · adiantamentos a recuperar − dívidas e obrigações − processos
//   o que rende     masters (ritmo de vendas recente × anos de vida útil pela idade) · editora (12 meses) ·
//                   imagem e marca (12 meses) · outras operações (shows, serviços, fábrica: o que a receita tem
//                   além dos masters) · elenco sob contrato (o que os PRÓXIMOS discos devem render, pela fama que o
//                   MERCADO conhece, fase da carreira e anos de contrato restantes)
//   ajustes         resultado musical (paradas, prêmios, certificados, lançamentos a caminho → expectativa do elenco) ·
//                   margem dos últimos 12 meses · gente e reputação (equipe, reputação, calor da polícia, relíquias
//                   expostas) · acontecimentos (cada fato público uma vez, esfriando em 12 meses: escândalo, prisão,
//                   processo, boicote, antitruste, cancelamento, saída de gente, tragédia em festival…) · época e
//                   mercado (participação, aposta em formatos, crise, juros, bolhas)
//
// Sigilo: o modelo lê o mercado como observador (`know(s, ato, 'market')`) — só a fama pública (com a faixa e o
// desvio do know.ts) e sinais públicos (estreia, momento, paradas). Potencial, talento e nota interna das faixas
// nunca entram. Receita e lucro de 12 meses vêm dos meses fechados (fin18), sem o "ano corrente" que fazia o preço do
// seu selo escorregar todo janeiro.
//
// O preço segue o valor (`stepPrice31`) com um sorteio próprio e pequeno ("humor do mercado", fluxo rng19 'bolsa31');
// o motivo de cada alta/queda é a parte que mais mudou desde o pregão anterior. O mesmo valor serve para IPO,
// participações e ofertas de aquisição (`dealValue31`) — a frente SOC usa daqui.
//
// Módulo PURO (sem ganchos): só importa núcleo, dados e fontes únicas (know/facts/rng19/switches); o que mora em
// sistemas com ganchos (crise do ano da bolsa) chega por `registerValueEra31`.

import { clamp } from '../../core/rng';
import { formatMoney } from '../../core/money';
import { FORMATS, type FormatId } from '../../data/rules';
import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import { recentFacts, type Fact } from '../facts17';
import { band, know } from '../know';
import { rng19 } from '../rng19';
import type { Act, Contract, GameState, Release } from '../types';
import { fmtL, money, playerActs } from '../util';
import { registerSwitch, sw } from './switches';

// ---------------------------------------------------------------- interruptor e estado

export const SW_VALUE31 = 'bolsa31.value';
registerSwitch({
  id: SW_VALUE31, def: true, scope: 'game',
  desc: l('Bolsa: valor de verdade por empresa (elenco, catálogo, dinheiro, resultados, reputação e época) puxa o preço do seu selo e dos rivais; desligado volta ao sorteio por lucro/crescimento e aos solavancos por notícia.',
    'Exchange: real per-company value (roster, catalogue, money, results, reputation and era) drives your label\'s and rivals\' prices; off reverts to the profit/growth random walk and news jolts.'),
});
export const value31On = (s: GameState): boolean => sw<boolean>(s, SW_VALUE31);

export interface Val31State {
  /** humor do mercado por empresa (log-desvio do preço sobre o valor) */
  mood: Record<string, number>;
  /** retrato das partes no último pregão (para dizer o motivo da alta/queda) */
  last: Record<string, Record<string, number>>;
  /** motivo do último movimento */
  why: Record<string, L>;
}
declare module '../ext4' { interface Ext4 { val31: Val31State } }
const fresh = (): Val31State => ({ mood: {}, last: {}, why: {} });
registerExt4('val31', fresh);
export function val31(s: GameState): Val31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.val31 ??= fresh()) as Val31State;
  st.mood ??= {}; st.last ??= {}; st.why ??= {};
  return st;
}

// ---------------------------------------------------------------- provedores (sistemas com ganchos registram)

export interface Era31 { crash: number; why?: L }
const ERA: { f?: (s: GameState) => Era31 } = {};
/** A bolsa (bolsa10) informa a crise do ano sem que este módulo importe sistema com ganchos. */
export function registerValueEra31(f: (s: GameState) => Era31): void { ERA.f = f; }

// ---------------------------------------------------------------- tipos públicos

export type Basis31 = 'fact' | 'calc' | 'hyp';
export type PartKey31 = 'cash' | 'assets' | 'relics' | 'advances' | 'debt' | 'suits' | 'masters' | 'pub' | 'image' | 'otherops'
  | 'roster' | 'results' | 'margin' | 'people' | 'events' | 'era' | 'floor';
export interface Part31 { k: PartKey31; v: number; basis: Basis31; name: L; why: L }
export interface Value31 { id: string; total: number; parts: Part31[]; /** o que rende, antes dos ajustes */ earn: number; /** patrimônio líquido */ net: number }

export const BASIS31: Record<Basis31, L> = { fact: l('fato', 'fact'), calc: l('cálculo', 'estimate'), hyp: l('hipótese', 'assumption') };
export const PART31: Record<PartKey31, L> = {
  cash: l('Caixa', 'Cash'), assets: l('Bens', 'Property'), relics: l('Relíquias', 'Relics'), advances: l('Adiantamentos a recuperar', 'Unrecouped advances'),
  debt: l('Dívidas e obrigações', 'Debt and obligations'), suits: l('Processos', 'Lawsuits'), masters: l('Catálogo de masters', 'Master catalogue'),
  pub: l('Editora', 'Publishing'), image: l('Imagem e marca', 'Image and brand'), otherops: l('Outras operações', 'Other operations'),
  roster: l('Elenco sob contrato', 'Roster under contract'), results: l('Resultado musical', 'Musical results'), margin: l('Margem (12 meses)', 'Margin (12 months)'),
  people: l('Gente e reputação', 'People and reputation'), events: l('Acontecimentos', 'Events'), era: l('Época e mercado', 'Era and market'),
  floor: l('Piso de liquidação', 'Liquidation floor'),
};

const mL = (c: number): L => l(formatMoney(Math.round(c), 'pt-BR'), formatMoney(Math.round(c), 'en-US'));
const pctL = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))}%`;

// ---------------------------------------------------------------- 12 meses fechados (sem o ano corrente)

/** Soma das linhas da DRE com prefixo nos 12 meses FECHADOS anteriores ao mês atual (null sem DRE mensal). */
function t12(s: GameState, prefix: string): number | null {
  const f = (s.player as unknown as { fin18?: { m?: Record<number, Record<string, number>> } }).fin18;
  if (!f?.m) return null;
  const mi = s.year * 12 + s.month;
  let t = 0; let any = false;
  for (let k = mi - 12; k < mi; k++) {
    const o = f.m[k];
    if (!o) continue;
    any = true;
    for (const key in o) if (key.startsWith(prefix)) t += o[key];
  }
  return any ? t : null;
}
/** Receita/lucro anualizados por ano-calendário quando falta a DRE mensal: mistura proporcional, sem o ano corrente incompleto pesar como ano cheio. */
function yearBlend(cur: number, last: number, month: number): number {
  return Math.round(cur + last * Math.max(0, 12 - month) / 12);
}

export interface Money12 { rev: number; op: number; rec: number; pub: number; merch: number; live: number; svc: number; source: 'fin18' | 'years' }
/** Receita e lucro dos últimos 12 meses fechados de uma empresa. */
export function money12(s: GameState, id: string): Money12 {
  if (id === 'player') {
    const rev = t12(s, 'rev:');
    if (rev !== null) {
      return { rev, op: rev + (t12(s, 'cost:') ?? 0), rec: t12(s, 'rev:rec') ?? 0, pub: t12(s, 'rev:pub') ?? 0, merch: t12(s, 'rev:merch') ?? 0,
        live: t12(s, 'rev:live') ?? 0, svc: t12(s, 'rev:svc') ?? 0, source: 'fin18' };
    }
    const r = yearBlend(s.player.revenueByYear[s.year] ?? 0, s.player.revenueByYear[s.year - 1] ?? 0, s.month);
    const p = yearBlend(s.player.profitByYear[s.year] ?? 0, s.player.profitByYear[s.year - 1] ?? 0, s.month);
    return { rev: r, op: p, rec: r, pub: 0, merch: 0, live: 0, svc: 0, source: 'years' };
  }
  const lb = s.labels[id];
  const r = lb ? yearBlend(lb.revenueYear, lb.revenueLastYear, s.month) : 0;
  return { rev: r, op: 0, rec: r, pub: 0, merch: 0, live: 0, svc: 0, source: 'years' };
}

// ---------------------------------------------------------------- o que o mercado sabe de um artista

/** Fama que o MERCADO enxerga (faixa do know.ts para o observador 'market'; desconhecido = quase nada). */
export function marketFame31(s: GameState, a: Act): number {
  const k = know(s, a.id, 'market');
  const b = band(s, a.id, 'fame', a.fame, k.width('fame'), { obs: 'market' });
  return b ? b.mid : 4;
}

// ---------------------------------------------------------------- partes

const ownerOfRel = (r: Release): string => r.owner;
const isLive = (r: Release): boolean => r.live !== false;

interface Lot { rels: Release[]; acts: Act[]; contracts: Map<string, Contract> }
/** Índice dono → lançamentos, refeito quando muda a semana ou o número de lançamentos (só leitura; nada no save). */
const REL_IX = new WeakMap<GameState, { w: number; n: number; m: Map<string, Release[]> }>();
function relsOf(s: GameState, id: string): Release[] {
  const all = s.releases;
  let n = 0;
  for (const _ in all) n++;
  let c = REL_IX.get(s);
  if (!c || c.w !== s.week || c.n !== n) {
    const m = new Map<string, Release[]>();
    for (const k in all) { const r = all[k]; const o = ownerOfRel(r); let a = m.get(o); if (!a) m.set(o, (a = [])); a.push(r); }
    c = { w: s.week, n, m };
    REL_IX.set(s, c);
  }
  return (c.m.get(id) ?? []).filter((r) => r.owner === id);
}
function lotOf(s: GameState, id: string): Lot {
  const rels = relsOf(s, id);
  const acts: Act[] = [];
  const contracts = new Map<string, Contract>();
  const ids = id === 'player' ? playerActs(s) : (s.labels[id]?.roster ?? []);
  for (const aid of ids) {
    const a = s.acts[aid];
    if (!a) continue;
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (!c || c.party !== id) continue;
    acts.push(a);
    contracts.set(a.id, c);
  }
  return { rels, acts, contracts };
}

/** Ritmo anual recente de receita de um master (últimas até 13 semanas, anualizado) e anos de vida útil pela idade. */
export function masterYield31(s: GameState, r: Release): { rate: number; years: number } {
  if (!isLive(r) || !r.totalUnits || r.revenue <= 0) return { rate: 0, years: 0 };
  const rpu = r.revenue / Math.max(1, r.totalUnits);
  const w = r.weekly ?? [];
  const n = Math.min(13, w.length);
  if (!n) return { rate: 0, years: 0 };
  let u = 0;
  for (let i = w.length - n; i < w.length; i++) u += Math.max(0, w[i] ?? 0);
  const rate = (u / n) * 52 * rpu;
  const age = (s.week - r.week) / 52;
  // disco novo cai rápido; catálogo antigo rende estável por anos (vida útil equivalente, em anos de ritmo atual)
  const years = age < 0.5 ? 0.35 : age < 1 ? 0.8 : age < 3 ? 2.2 : 5;
  return { rate, years };
}

function contractYears(s: GameState, c: Contract): number {
  const left = Math.max(0, (c.endWeek - s.week) / 52);
  return Math.min(6, left + (c.options ?? 0) * 0.5);
}
const labelShare = (c: Contract): number => clamp(c.model === 'distribution' ? (c.distributionFee ?? 0.2) : 1 - (c.royalty ?? 0.15), 0.08, 0.95);

/** Quanto os PRÓXIMOS lançamentos de um artista devem render por ano ao selo (o que o mercado vê; sem potencial). */
export function actEarning31(s: GameState, a: Act, owner?: string): { e: number; why: L } {
  const mf = marketFame31(s, a);
  const yrs = Math.max(0, s.year - a.debutYear);
  const stage = a.status === 'retired' || a.status === 'split' ? 0 : a.status === 'hiatus' ? 0.25 : yrs <= 2 ? 1.1 : yrs <= 12 ? 1 : yrs <= 22 ? 0.8 : 0.6;
  const mom = 0.85 + clamp(a.momentum, 0, 100) / 330;
  const cancel = a.cancelledUntil && a.cancelledUntil > s.week ? 0.3 : 1;
  // prior pela fama pública; histórico público: o que os discos dos últimos 2 anos renderam ao selo, por ano
  const prior = money(s, 90) * Math.pow(Math.max(1, mf), 1.55);
  let track = 0;
  for (const rid of a.releases ?? []) {
    const r = s.releases[rid];
    if (r && (!owner || r.owner === owner) && s.week - r.week <= 104 && s.week >= r.week) track += Math.max(0, r.revenue) / 2;
  }
  const base = track > 0 ? 0.4 * prior + 0.6 * track : prior;
  const e = base * stage * mom * cancel;
  const why = fmtL(l('fama vista pelo mercado {f}, {y} anos de carreira{t}{c}', 'fame seen by the market {f}, {y} years of career{t}{c}'),
    { f: Math.round(mf), y: yrs, t: track > 0 ? fmtL(l(', discos recentes rendendo {r} por ano', ', recent records earning {r} a year'), { r: mL(track) }) : '', c: cancel < 1 ? l(', cancelado', ', cancelled') : '' });
  return { e, why };
}

// ---------------------------------------------------------------- acontecimentos (fatos)

interface EvW { w: number; name: L }
const EV31: Record<string, EvW> = {
  scandal: { w: -0.06, name: l('escândalo', 'scandal') },
  secret_exposed: { w: -0.04, name: l('segredo exposto', 'secret exposed') },
  affair: { w: -0.02, name: l('caso amoroso público', 'public affair') },
  addiction: { w: -0.02, name: l('dependência', 'addiction') },
  arrest: { w: -0.08, name: l('prisão', 'arrest') },
  crime: { w: -0.06, name: l('crime', 'crime') },
  crime_member: { w: -0.05, name: l('ligação com o crime', 'organized crime ties') },
  payola: { w: -0.05, name: l('jabá', 'payola') },
  stream_fraud: { w: -0.05, name: l('fraude de streams', 'stream fraud') },
  ghost_tracks: { w: -0.03, name: l('faixas fantasmas', 'ghost tracks') },
  ghost_band: { w: -0.03, name: l('banda fantasma', 'ghost band') },
  ai_voice_fake: { w: -0.03, name: l('voz falsa de IA', 'fake AI voice') },
  case_ruling: { w: -0.03, name: l('decisão judicial', 'court ruling') },
  plagiarism_suit: { w: -0.03, name: l('processo de plágio', 'plagiarism suit') },
  session_lawsuit: { w: -0.02, name: l('processo de músico', 'session musician lawsuit') },
  tribute_sued: { w: -0.02, name: l('processo de tributo', 'tribute lawsuit') },
  boycott: { w: -0.05, name: l('boicote', 'boycott') },
  video_banned: { w: -0.02, name: l('clipe proibido', 'banned video') },
  tour_cancel: { w: -0.02, name: l('turnê cancelada', 'cancelled tour') },
  crowd_incident: { w: -0.05, name: l('tragédia em show ou festival', 'crowd tragedy at a show or festival') },
  disaster: { w: -0.05, name: l('desastre', 'disaster') },
  exit: { w: -0.02, name: l('saída de gente importante', 'key departure') },
  poach: { w: -0.03, name: l('gente levada pela concorrência', 'people poached by a rival') },
  debt_called: { w: -0.04, name: l('dívida cobrada', 'debt called in') },
  award_revoked: { w: -0.03, name: l('prêmio cassado', 'award revoked') },
  comeback: { w: 0.02, name: l('volta por cima', 'comeback') },
  relic: { w: 0.01, name: l('relíquia', 'relic') },
  charity_show: { w: 0.01, name: l('show beneficente', 'charity show') },
  charity_single: { w: 0.01, name: l('single beneficente', 'charity single') },
};
const TAG31: Record<string, EvW> = {
  antitrust: { w: -0.06, name: l('antitruste', 'antitrust') },
  cancel: { w: -0.05, name: l('cancelamento', 'cancellation') },
  festival: { w: 0.01, name: l('festival', 'festival') },
};

export interface Ev31 { id: string; w: number; name: L; text: L }
/** Fatos públicos (e boatos, pela metade) dos últimos 12 meses que tocam a empresa, cada um uma vez, esfriando. */
export function events31(s: GameState, id: string, lot?: Lot): Ev31[] {
  const L0 = lot ?? lotOf(s, id);
  const who = new Set<string>([id]);
  for (const a of L0.acts) { who.add(a.id); for (const p of a.members) who.add(p); }
  if (id === 'player') for (const st of s.player.staff) who.add(st.id);
  const out: Ev31[] = [];
  const seen = new Set<string>();
  for (const f of recentFacts(s, { months: 12 }) as Fact[]) {
    if (seen.has(f.id) || f.visibility === 'secret') continue;
    if (!f.actors.some((x) => who.has(x.startsWith('p:') ? x.slice(2) : x))) continue;
    let d: EvW | undefined = EV31[f.kind];
    for (const t of f.tags) if (TAG31[t] && (!d || Math.abs(TAG31[t].w) > Math.abs(d.w))) d = TAG31[t];
    if (!d) continue;
    seen.add(f.id);
    const good = f.tags.includes('good') || f.tags.includes('positive');
    const sign = d.w < 0 && good ? -0.3 : 1;
    const age = clamp((s.week - f.w) / 52, 0, 1);
    const w = d.w * sign * (0.5 + f.severity / 100) * (1 - age) * (f.visibility === 'rumor' ? 0.5 : 1);
    if (Math.abs(w) < 0.001) continue;
    out.push({ id: f.id, w, name: d.name, text: f.text });
  }
  return out;
}

// ---------------------------------------------------------------- época

const RATE31 = (y: number): { f: number; why?: L } =>
  y >= 1979 && y <= 1984 ? { f: 0.85, why: l('juros altíssimos', 'very high interest rates') }
    : y >= 1973 && y <= 1978 ? { f: 0.92, why: l('juros altos e inflação', 'high rates and inflation') }
      : y >= 2009 && y <= 2021 ? { f: 1.08, why: l('juros baixos', 'low interest rates') } : { f: 1 };
const BUBBLE31 = (y: number): { f: number; why?: L } =>
  y === 1999 || y === 2000 ? { f: 1.06, why: l('bolha da internet', 'dot-com bubble') }
    : y === 2001 || y === 2002 ? { f: 0.94, why: l('estouro da bolha da internet', 'dot-com bust') }
      : y === 2021 ? { f: 1.04, why: l('febre de NFT e cripto', 'NFT and crypto mania') }
        : y === 2022 ? { f: 0.96, why: l('quebra da FTX e do cripto', 'FTX and crypto collapse') } : { f: 1 };

/** Formato mais novo disponível e formatos já superados no ano (pelas datas de tecnologia da partida). */
function formatsNow(s: GameState): { newest?: FormatId; dead: Set<FormatId> } {
  const T = (id: string): number => s.techDates[id] ?? 9999;
  let newest: FormatId | undefined; let ny = -1;
  const dead = new Set<FormatId>();
  for (const f of FORMATS) {
    if (f.id === 'airplay' || f.id === 'sheet') continue;
    if (f.until && T(f.until) <= s.year) dead.add(f.id);
    if (f.tech && T(f.tech) <= s.year && T(f.tech) > ny) { ny = T(f.tech); newest = f.id; }
  }
  return { newest, dead };
}

// ---------------------------------------------------------------- o valor

function heatOf31(s: GameState, id: string): number {
  const c = (s.x4 as unknown as { crime17?: { heat?: Record<string, number>; nh?: Record<string, number> } }).crime17;
  if (!c) return 0;
  if (id === 'player') return Object.values(c.heat ?? {}).reduce((m, x) => Math.max(m, x), 0);
  return c.nh?.[id] ?? 0;
}

interface Relic31 { st: string; v: number; ln?: unknown; ex?: unknown }
const relicsOf = (s: GameState): Relic31[] => ((s.x4 as unknown as { relics9?: { list?: Relic31[] } }).relics9?.list ?? []);

/** Valor da empresa `id` ('player' ou id de selo rival) com a conta por parte. */
export function companyValue31(s: GameState, id: string): Value31 {
  const P: Part31[] = [];
  const add = (k: PartKey31, v: number, basis: Basis31, why: L) => { P.push({ k, v: Math.round(v), basis, name: PART31[k], why }); };
  const me = id === 'player';
  const lb = me ? undefined : s.labels[id];
  const lot = lotOf(s, id);
  const m12 = money12(s, id);

  // ---- patrimônio
  const cash = me ? s.player.cash : lb?.cash ?? 0;
  add('cash', Math.max(0, cash), 'fact', l('Dinheiro em caixa hoje.', 'Cash on hand today.'));
  if (me) {
    const book = (s.assets ?? []).filter((a) => a.kind !== 'catalog' && a.kind !== 'company').reduce((t, a) => t + Math.max(0, a.bookValue), 0);
    add('assets', book, 'fact', l('Sede, salas, fábrica, equipamentos e participações pelo valor contábil (catálogo e empresas entram pelo que rendem).', 'HQ, rooms, plant, equipment and stakes at book value (catalogue and companies count by what they earn).'));
    const rl = relicsOf(s).filter((r) => r.st === 'player');
    add('relics', rl.reduce((t, r) => t + money(s, r.v) * 0.85, 0), 'calc', fmtL(l('{n} peças pelo valor de venda.', '{n} pieces at sale value.'), { n: rl.length }));
  }
  let rec = 0;
  for (const c of lot.contracts.values()) rec += Math.max(0, c.recoupBalance ?? 0);
  add('advances', rec * 0.3, 'hyp', l('Parte dos adiantamentos que deve voltar pelos royalties retidos.', 'Share of advances expected back through withheld royalties.'));
  let debt = Math.max(0, -cash);
  if (me) {
    debt += s.player.loans.reduce((t, x) => t + Math.max(0, x.balance), 0);
    debt += (s.creditors ?? []).reduce((t, c) => t + Math.max(0, c.owed), 0);
    const ap = (s.player as unknown as { fin18?: { ap?: { amt: number }[] } }).fin18?.ap ?? [];
    debt += -ap.reduce((t, b) => t + Math.min(0, b.amt), 0);
  } else debt += Math.max(0, lb?.debt ?? 0);
  add('debt', -debt, 'fact', l('Empréstimos, credores, contas a pagar e caixa negativo.', 'Loans, creditors, payables and negative cash.'));
  let suits = 0; let nS = 0;
  for (const x of s.lawsuits ?? []) {
    if (x.stage === 'settled' || x.stage === 'won' || x.stage === 'lost') continue;
    if (x.defendant === id) { suits += x.claim * (me ? 1 - clamp(x.odds, 0, 1) : 0.5); nS++; }
    else if (x.plaintiff === id) { suits -= x.claim * (me ? clamp(x.odds, 0, 1) : 0.5) * 0.5; nS++; }
  }
  add('suits', -suits, 'calc', fmtL(l('{n} processo(s) em aberto pela perda esperada.', '{n} open lawsuit(s) at expected loss.'), { n: nS }));

  // ---- o que rende
  let mRate = 0; let mVal = 0;
  for (const r of lot.rels) { const y = masterYield31(s, r); mRate += y.rate; mVal += y.rate * y.years; }
  add('masters', mVal, 'calc', fmtL(l('{n} masters rendendo {r} por ano no ritmo recente (disco novo cai rápido; catálogo antigo rende por anos).', '{n} masters earning {r} a year at the recent pace (new records fade fast; old catalogue earns for years).'), { n: lot.rels.length, r: mL(mRate) }));
  if (me) {
    add('pub', Math.max(0, m12.pub) * 6, 'fact', fmtL(l('Editora: {r} nos últimos 12 meses × 6 anos.', 'Publishing: {r} in the last 12 months × 6 years.'), { r: mL(Math.max(0, m12.pub)) }));
    add('image', Math.max(0, m12.merch) * 3, 'fact', fmtL(l('Produtos e marcas: {r} nos últimos 12 meses × 3 anos.', 'Merch and brands: {r} in the last 12 months × 3 years.'), { r: mL(Math.max(0, m12.merch)) }));
  }
  const residual = Math.max(0, m12.rec - mRate);
  const other = (me ? Math.max(0, m12.live + m12.svc) * 1.5 : 0) + residual;
  add('otherops', other, 'calc', me
    ? fmtL(l('Shows e serviços ({a}) e o que a receita de discos tem além dos masters ({b}), em 12 meses.', 'Shows and services ({a}) and record income beyond the masters ({b}), over 12 months.'), { a: mL(Math.max(0, m12.live + m12.svc)), b: mL(residual) })
    : fmtL(l('Receita de 12 meses além dos masters: {b}.', '12-month revenue beyond the masters: {b}.'), { b: mL(residual) }));
  let ros = 0;
  const topWhy: { v: number; t: L }[] = [];
  for (const a of lot.acts) {
    const c = lot.contracts.get(a.id)!;
    const yrs = contractYears(s, c);
    const { e, why } = actEarning31(s, a, id);
    let v = 0;
    for (let t = 0; t < Math.ceil(yrs); t++) v += e * Math.min(1, yrs - t) * Math.pow(0.9, t);
    v *= labelShare(c);
    ros += v;
    topWhy.push({ v, t: fmtL(l('{n}: {w}, {y} anos de contrato', '{n}: {w}, {y} years of contract'), { n: a.name, w: why, y: l(yrs.toFixed(1).replace('.', ','), yrs.toFixed(1)) }) });
  }
  topWhy.sort((x, y) => y.v - x.v);
  add('roster', ros, 'hyp', lot.acts.length
    ? fmtL(l('{n} artistas; o que os próximos discos devem render enquanto durar o contrato. Maior peso — {t}.', '{n} acts; what the next records should earn while the contracts last. Biggest — {t}.'), { n: lot.acts.length, t: topWhy[0].t })
    : l('Sem artistas sob contrato.', 'No acts under contract.'));

  // ---- resultado musical (expectativa do elenco)
  let top10 = 0; let no1 = 0; let certs = 0;
  for (const r of lot.rels) {
    if (s.week - r.week <= 52 && r.peak > 0 && r.peak <= 10) { top10++; if (r.peak === 1) no1++; }
    if (s.week - r.week <= 104 && r.certified) certs += r.certified === 'diamond' ? 3 : r.certified === 'platinum' ? 2 : 1;
  }
  const actSet = new Set(lot.acts.map((a) => a.id));
  const awards = (s.awards ?? []).filter((x) => x.year >= s.year - 1 && (me ? x.byPlayer : !!x.actId && actSet.has(x.actId))).length;
  const upcoming = me ? (s.pendingReleases ?? []).filter((p) => actSet.has(p.actId)).length : 0;
  const rm = 1 + Math.min(0.6, 0.04 * top10 + 0.06 * no1 + 0.05 * awards + 0.02 * certs + 0.02 * Math.min(5, upcoming));
  add('results', ros * (rm - 1), 'calc', fmtL(l('Top 10 em 12 meses: {a} (nº 1: {b}); prêmios: {c}; certificados: {d}; lançamentos a caminho: {e} → expectativa do elenco {p}.', 'Top 10s in 12 months: {a} (no. 1: {b}); awards: {c}; certifications: {d}; releases on the way: {e} → roster outlook {p}.'),
    { a: top10, b: no1, c: awards, d: certs, e: upcoming, p: pctL(rm - 1) }));

  // ---- margem (só onde há DRE)
  const base = ros * rm + other;
  let mm = 1; let mWhy = l('Sem demonstrativo público de lucro: margem neutra.', 'No public profit statement: neutral margin.');
  if (me && m12.rev > 0) {
    const margin = m12.op / m12.rev;
    mm = clamp(0.8 + margin, 0.4, 1.15);
    mWhy = fmtL(l('Lucro operacional de {p} da receita nos 12 meses fechados.', 'Operating profit of {p} of revenue over the last 12 closed months.'), { p: pctL(margin) });
  }
  add('margin', base * (mm - 1), me && m12.rev > 0 ? 'fact' : 'hyp', mWhy);

  const earn0 = mVal + (me ? Math.max(0, m12.pub) * 6 + Math.max(0, m12.merch) * 3 : 0) + other + ros * rm + base * (mm - 1);
  let F = earn0;

  // ---- gente e reputação
  const heat = heatOf31(s, id);
  let pf = 1; const pw: string[] = [];
  if (me) {
    const st = s.player.staff;
    const sk = st.length ? st.reduce((t, x) => t + x.skill, 0) / st.length : 30;
    pf *= 0.95 + sk / 1000;
    const rep = (s.player.reputation.commercial + s.player.reputation.artistic + s.player.reputation.institutional) / 3;
    pf *= 0.88 + rep / 400;
    const shown = relicsOf(s).filter((r) => r.st === 'player' && (r.ex || r.ln)).length;
    pf *= 1 + Math.min(0.05, shown * 0.01);
    pw.push(`${st.length}`, `${Math.round(sk)}`, `${Math.round(rep)}`, `${shown}`);
  } else {
    pf *= 0.88 + (lb?.reputation ?? 50) / 400;
  }
  pf *= 1 - clamp(heat, 0, 100) / 100 * 0.15;
  pf = clamp(pf, 0.5, 1.2);
  const pWhy = me
    ? fmtL(l('Equipe de {a} (média {b}), reputação {c}, {d} relíquia(s) exposta(s), calor da polícia {e}.', 'Staff of {a} (avg {b}), reputation {c}, {d} relic(s) on display, police heat {e}.'), { a: pw[0], b: pw[1], c: pw[2], d: pw[3], e: Math.round(heat) })
    : fmtL(l('Reputação {c}, calor da polícia {e}.', 'Reputation {c}, police heat {e}.'), { c: Math.round(lb?.reputation ?? 50), e: Math.round(heat) });
  add('people', F * (pf - 1), 'calc', pWhy);
  F *= pf;

  // ---- acontecimentos
  const evs = events31(s, id, lot);
  const sumW = clamp(evs.reduce((t, e) => t + e.w, 0), -0.5, 0.1);
  const big = evs.slice().sort((a, b) => Math.abs(b.w) - Math.abs(a.w))[0];
  add('events', F * sumW, 'calc', evs.length
    ? fmtL(l('{n} fato(s) público(s) em 12 meses, cada um uma vez e esfriando ({p}). Maior: {k}.', '{n} public fact(s) in 12 months, each once and cooling ({p}). Largest: {k}.'), { n: evs.length, p: pctL(sumW), k: big.name })
    : l('Nenhum fato público relevante em 12 meses.', 'No relevant public facts in 12 months.'));
  F *= 1 + sumW;

  // ---- época e mercado
  let total = Math.max(1, s.player.revenueByYear[s.year - 1] ?? 0);
  for (const x of Object.values(s.labels)) if (x.active) total += Math.max(0, x.revenueLastYear);
  const mine = me ? (s.player.revenueByYear[s.year - 1] ?? 0) : lb?.revenueLastYear ?? 0;
  const share = clamp(mine / total, 0, 1);
  let xf = 1 + Math.min(0.12, share * 0.4);
  const fm = formatsNow(s);
  const recent = lot.rels.filter((r) => s.week - r.week <= 104);
  let newF = 0; let deadF = 0;
  for (const r of recent) {
    if (fm.newest && r.formats.includes(fm.newest)) newF++;
    else if (r.formats.length && r.formats.every((f) => fm.dead.has(f))) deadF++;
  }
  if (recent.length) xf *= 1 + 0.06 * newF / recent.length - 0.1 * deadF / recent.length;
  const era = ERA.f?.(s) ?? { crash: 0 };
  xf *= 1 + clamp(era.crash, -0.6, 0.3) * 0.5;
  if (s.economy?.recession) xf *= 0.95;
  const rate = RATE31(s.year); const bub = BUBBLE31(s.year);
  xf *= rate.f * bub.f;
  xf = clamp(xf, 0.4, 1.3);
  const eraBits: L[] = [fmtL(l('participação de mercado {p}%', 'market share {p}%'), { p: Math.round(share * 100) })];
  if (recent.length) eraBits.push(fmtL(l('{a} de {b} lançamentos recentes no formato mais novo, {c} só em formato superado', '{a} of {b} recent releases in the newest format, {c} only in outdated formats'), { a: newF, b: recent.length, c: deadF }));
  if (era.crash < 0) eraBits.push(era.why ?? l('crise na bolsa', 'market crisis'));
  if (s.economy?.recession) eraBits.push(l('recessão', 'recession'));
  if (rate.why) eraBits.push(rate.why);
  if (bub.why) eraBits.push(bub.why);
  add('era', F * (xf - 1), era.crash < 0 || rate.why || bub.why ? 'hyp' : 'calc', l(eraBits.map((b) => b.pt).join('; ') + '.', eraBits.map((b) => b.en).join('; ') + '.'));
  F *= xf;

  // ---- total (as partes somam exatamente o total)
  let sum = P.reduce((t, p) => t + p.v, 0);
  const floor = money(s, 20000);
  if (sum < floor) { add('floor', floor - sum, 'hyp', l('Abaixo disto ninguém vende: marca, contatos e o que sobra numa liquidação.', 'Nobody sells below this: brand, contacts and what is left in a liquidation.')); sum = floor; }
  const net = P.filter((p) => ['cash', 'assets', 'relics', 'advances', 'debt', 'suits'].includes(p.k)).reduce((t, p) => t + p.v, 0);
  return { id, total: sum, parts: P, earn: Math.round(earn0), net };
}

// ---------------------------------------------------------------- negócios: IPO, participação, aquisição

/** Preço de uma fatia `share` da empresa pelo mesmo valor (prêmio de controle acima de 25% e de 50%; hostil +25%). */
export function dealValue31(s: GameState, id: string, share: number, mode: 'friendly' | 'hostile' = 'friendly', held = 0): number {
  const v = companyValue31(s, id).total;
  const after = held + share;
  const prem = after > 0.5 ? 1.3 : after >= 0.25 ? 1.1 : 1;
  return Math.round(v * share * prem * (mode === 'hostile' ? 1.25 : 1));
}

// ---------------------------------------------------------------- preço: segue o valor, humor próprio, motivo

const RISE: Partial<Record<PartKey31, L>> = {
  cash: l('caixa mais forte', 'stronger cash position'), assets: l('mais bens', 'more property'), relics: l('relíquias valorizadas', 'relics gaining value'),
  debt: l('dívida menor', 'lower debt'), suits: l('processos resolvidos', 'lawsuits resolved'), masters: l('catálogo rendendo mais', 'catalogue earning more'),
  pub: l('editora rendendo mais', 'publishing earning more'), image: l('marca vendendo mais', 'brand selling more'), otherops: l('shows e serviços em alta', 'shows and services up'),
  roster: l('elenco mais valioso (fama ou contratos longos)', 'more valuable roster (fame or long contracts)'), results: l('hits, prêmios e lançamentos a caminho', 'hits, awards and releases on the way'),
  margin: l('margem de lucro melhor', 'better profit margin'), people: l('equipe e reputação melhores', 'better staff and reputation'), events: l('notícias ruins esfriando', 'bad news cooling off'),
  era: l('mercado e época favoráveis', 'market and era tailwinds'),
};
const FALL: Partial<Record<PartKey31, L>> = {
  cash: l('caixa encolhendo', 'cash shrinking'), assets: l('bens depreciando', 'property depreciating'), relics: l('relíquias vendidas ou desvalorizadas', 'relics sold or losing value'),
  debt: l('dívida maior', 'higher debt'), suits: l('processos na justiça', 'lawsuits in court'), masters: l('catálogo rendendo menos', 'catalogue earning less'),
  pub: l('editora rendendo menos', 'publishing earning less'), image: l('marca vendendo menos', 'brand selling less'), otherops: l('shows e serviços em baixa', 'shows and services down'),
  roster: l('elenco perdendo valor (contratos acabando ou fama caindo)', 'roster losing value (contracts ending or fame falling)'), results: l('menos hits e prêmios', 'fewer hits and awards'),
  margin: l('margem de lucro pior', 'worse profit margin'), people: l('equipe ou reputação piores', 'weaker staff or reputation'), events: l('escândalos, processos ou crises', 'scandals, lawsuits or crises'),
  era: l('mercado e época desfavoráveis', 'market and era headwinds'),
};

export interface Step31 { p: number; chg: number; why?: L; value: Value31 }
/**
 * Um pregão (mês) da empresa: o preço caminha 35% do caminho até o valor por ação × humor do mercado. O humor é o
 * único sorteio (fluxo 'bolsa31', pequeno, com memória); o motivo é a parte que mais mudou desde o pregão anterior.
 */
export function stepPrice31(s: GameState, id: string, p: number, shares: number): Step31 {
  const st = val31(s);
  const v = companyValue31(s, id);
  const r = rng19(s, 'bolsa31');
  const mood = clamp((st.mood[id] ?? 0) * 0.8 + r.normal(0, 0.025), -0.12, 0.12);
  st.mood[id] = mood;
  const target = Math.max(1, v.total / Math.max(1, shares)) * Math.exp(mood);
  // segue 35% do caminho até o valor, com limite de oscilação de 20% por pregão (o mercado não salta de uma vez)
  const np = Math.max(1, Math.round(clamp(p + (target - p) * 0.35, p * 0.8, p * 1.2)));
  const chg = p > 0 ? np / p - 1 : 0;
  const prev = st.last[id];
  const now: Record<string, number> = {};
  for (const x of v.parts) now[x.k] = x.v;
  let why: L | undefined;
  if (prev && Math.abs(chg) >= 0.02) {
    let bk: PartKey31 | undefined; let bd = 0;
    for (const k of new Set([...Object.keys(prev), ...Object.keys(now)]) as Set<PartKey31>) {
      const d = (now[k] ?? 0) - (prev[k] ?? 0);
      if (Math.sign(d) === Math.sign(chg) && Math.abs(d) > Math.abs(bd)) { bd = d; bk = k; }
    }
    const moved = Math.abs(bd) / Math.max(1, v.total);
    const gap = Math.abs(Math.log(Math.max(1, v.total / Math.max(1, shares)) / Math.max(1, p)));
    const reason = bk && moved >= Math.abs(chg) * 0.25 ? (chg > 0 ? RISE[bk] : FALL[bk]) : undefined;
    why = fmtL(chg >= 0 ? l('subiu {p}: {w}', 'rose {p}: {w}') : l('caiu {p}: {w}', 'fell {p}: {w}'),
      { p: `${Math.abs(Math.round(chg * 100))}%`, w: reason ?? (gap > Math.abs(mood)
        ? (chg >= 0 ? l('o preço ainda corre atrás do valor da empresa', 'the price is still catching up with the company\'s value') : l('o preço ainda desce até o valor da empresa', 'the price is still settling down to the company\'s value'))
        : (chg >= 0 ? l('humor do mercado (otimismo)', 'market mood (optimism)') : l('humor do mercado (nervosismo)', 'market mood (jitters)'))) });
    st.why[id] = why;
  }
  st.last[id] = now;
  return { p: np, chg, why, value: v };
}

/** Motivo do último movimento relevante (para a ficha e as notícias). */
export const valueWhy31 = (s: GameState, id: string): L | undefined => val31(s).why[id];
/** Texto de dinheiro bilíngue (ficha). */
export const money31 = mL;
