// R33 · MUNDO — crises econômicas reais, censura/política e memes/bolhas com efeito econômico.
// Três interruptores, todos DESLIGADOS no código (como os exp5.*): `exp33.crise`, `exp33.censura`, `exp33.memes`.
// Reaproveita o que já existe: os eventos históricos de geopolítica (geo_depression, geo_oil_1973, geo_2008, geo_pandemic
// em data/content.ts, que já movem `geoDemand`/liveBlocked/pressingMult e a flag de recessão), o selo de aviso da
// world4/laws.ts (PMRC) e o regime/AI-5 da society18. Aqui entra só a camada nova: curva da crise (choque, fundo,
// recuperação) por mercado, efeito separado em shows, vendas físicas × digitais e crédito, cartão de decisão na largada,
// pressão do regime (metáfora × exílio × calar) e o efeito econômico dos memes e bolhas de pop31 (por onFact, sem mexer
// no arquivo de dados). Sem sorteio no fluxo rng19: sorte pura por chave (Rng.fromSeed) → desligado = estado idêntico.
// GANCHO para o banco (INT-2): `creditCrisis33(s)`. GANCHO para UI: `mundoNow33(s)`.
import { Rng, clamp } from '../../core/rng';
import { censorshipIn, geoById } from '../../data/content';
import { cityById, familyOf, l, type L } from '../../data/world';
import type { EventDef } from '../events';
import { EH } from '../events_more';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { registerSwitch, sw } from '../r31/switches';
import { advisoryOn, cleanEdit, EDGY, stickerRelease } from '../sys/world4/laws';
import type { GameState } from '../types';
import { fmtL, notify, playerActs } from '../util';

// ================================================================ interruptores

export const SW_CRISE33 = 'exp33.crise';
export const SW_CENSURA33 = 'exp33.censura';
export const SW_MEMES33 = 'exp33.memes';
registerSwitch({ id: SW_CRISE33, def: true, scope: 'game',
  desc: l('Onda 33 · crises reais (1929, 1973, 2008, 2020): curva de choque e recuperação em shows, vendas físicas × digitais e crédito. Desligado: como antes.',
    'Wave 33 · real crises (1929, 1973, 2008, 2020): shock and recovery curve on shows, physical vs digital sales and credit. Off: as before.') });
registerSwitch({ id: SW_CENSURA33, def: true, scope: 'game',
  desc: l('Onda 33 · censura e política: pressão do regime (metáfora × exílio × calar) e audiência do selo de aviso nos EUA. Desligado: como antes.',
    'Wave 33 · censorship and politics: regime pressure (metaphor vs exile vs silence) and the US warning-sticker hearing. Off: as before.') });
registerSwitch({ id: SW_MEMES33, def: true, scope: 'game',
  desc: l('Onda 33 · memes e bolhas da cultura pop mexem na economia: meme dá fôlego curto às vendas; bolha infla, estoura e aperta o crédito. Desligado: só notícia.',
    'Wave 33 · pop-culture memes and bubbles move the economy: a meme gives sales a short lift; a bubble inflates, bursts and tightens credit. Off: news only.') });

export const crise33On = (s: GameState): boolean => sw<boolean>(s, SW_CRISE33);
export const censura33On = (s: GameState): boolean => sw<boolean>(s, SW_CENSURA33);
export const memes33On = (s: GameState): boolean => sw<boolean>(s, SW_MEMES33);

// ================================================================ estado

export interface Fx33 { id: string; kind: 'meme' | 'bolha'; week: number }
export interface Mundo33St {
  /** crise → semana em que o cartão de largada foi mostrado */
  fired: Record<string, number>;
  /** ato → pressão do regime (sobe com censura alta, desce com o tempo) */
  pressure: Record<string, number>;
  /** ato → exílio em andamento */
  exile: Record<string, { since: number; from: string; reg: string }>;
  /** memes e bolhas que viraram efeito econômico */
  fx: Fx33[];
  /** estourou a bolha (id → semana), uma vez */
  burst: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { mundo33: Mundo33St } }
const fresh = (): Mundo33St => ({ fired: {}, pressure: {}, exile: {}, fx: [], burst: {} });
registerExt4('mundo33', fresh);
export function mundo33(s: GameState): Mundo33St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.mundo33 ??= fresh()) as Mundo33St;
  st.fired ??= {}; st.pressure ??= {}; st.exile ??= {}; st.fx ??= []; st.burst ??= {};
  return st;
}

// ================================================================ crises

export interface Crise33 {
  id: string;
  /** evento histórico já existente (data/content.ts) — mercados e nome vêm dele */
  geo: string;
  y: number;
  /** mês de começo, 0–11 */
  m: number;
  months: number;
  /** perda máxima na bilheteria/procura de shows (0,3 = −30%) */
  shows: number;
  /** perda máxima nas vendas físicas e ganho nas digitais */
  phys: number;
  dig: number;
  /** crédito: juros extras, fator do limite, corte no valor de garantia, congelamento no choque */
  rateAdd: number;
  limit: number;
  haircut: number;
  freeze: boolean;
  /** meses de recessão que a largada liga */
  recession: number;
  title: [string, string];
  text: [string, string];
}
export const CRISES33: Crise33[] = [
  { id: 'crash29', geo: 'geo_depression', y: 1929, m: 9, months: 48, shows: 0.3, phys: 0.25, dig: 0, rateAdd: 0.06, limit: 0.5, haircut: 0.25, freeze: true, recession: 48,
    title: ['A Quinta-Feira Negra', 'Black Thursday'],
    text: ['A bolsa de Nova York desaba e os bancos recolhem o crédito. Teatros esvaziam, o disco vira artigo de luxo e o rádio de graça ocupa a sala. {gpt} começou.', 'The New York exchange collapses and the banks pull in credit. Theaters empty, records become a luxury and free radio takes over the parlor. The {gen} has begun.'] },
  { id: 'oil73', geo: 'geo_oil_1973', y: 1973, m: 9, months: 24, shows: 0.08, phys: 0.1, dig: 0, rateAdd: 0.04, limit: 0.8, haircut: 0.1, freeze: false, recession: 24,
    title: ['Embargo do petróleo', 'Oil embargo'],
    text: ['O barril quadruplica. O vinil, derivado de petróleo, encarece; as turnês gastam mais em gasolina e as tiragens encolhem. Em {gpt}, todo mundo faz conta.', 'The barrel price quadruples. Vinyl, an oil product, gets expensive; tours burn more fuel and pressings shrink. In the {gen}, everybody does the math.'] },
  { id: 'gfc08', geo: 'geo_2008', y: 2008, m: 8, months: 30, shows: 0.12, phys: 0.12, dig: 0.02, rateAdd: 0.05, limit: 0.55, haircut: 0.3, freeze: true, recession: 30,
    title: ['A quebra do Lehman', 'The Lehman collapse'],
    text: ['Um banco gigante quebra e o crédito seca da noite para o dia. Patrocinadores cortam verba, turnês encolhem e o banco não atende o telefone. {gpt}.', 'A giant bank fails and credit dries up overnight. Sponsors cut budgets, tours shrink and the bank stops taking calls. {gen}.'] },
  { id: 'covid20', geo: 'geo_pandemic', y: 2020, m: 2, months: 18, shows: 0.35, phys: 0.1, dig: 0.08, rateAdd: 0.01, limit: 0.8, haircut: 0.1, freeze: false, recession: 12,
    title: ['Tudo fecha', 'Everything shuts'],
    text: ['Casas de show fecham, turnês caem uma a uma e a plateia migra para a tela. {gpt}: o caixa do ao vivo some, o streaming sobe.', 'Venues close, tours fall one by one and the audience moves to the screen. {gen}: live income vanishes, streaming climbs.'] },
];
const crisisById33 = Object.fromEntries(CRISES33.map((c) => [c.id, c])) as Record<string, Crise33>;
const nowIdx = (s: GameState): number => s.year * 12 + s.month;
const marketsOf = (c: Crise33) => geoById[c.geo]?.markets ?? [];

/** Intensidade 0–1: choque cheio nos 6 primeiros meses, fundo até 60% da duração, depois recuperação linear. */
export function intensity33(c: Crise33, s: GameState): number {
  const d = nowIdx(s) - (c.y * 12 + c.m);
  if (d < 0 || d >= c.months) return 0;
  const rec = Math.floor(c.months * 0.6);
  return d < rec ? 1 : clamp(1 - (d - rec) / (c.months - rec), 0, 1);
}
/** Crises em curso (com intensidade), opcionalmente num mercado. Vazio com o interruptor desligado. */
export function crises33(s: GameState, market?: string): { c: Crise33; i: number }[] {
  if (!crise33On(s)) return [];
  const out: { c: Crise33; i: number }[] = [];
  for (const c of CRISES33) {
    if (market && !marketsOf(c).includes(market as never)) continue;
    const i = intensity33(c, s);
    if (i > 0) out.push({ c, i });
  }
  return out;
}

// ---------------------------------------------------------------- bolhas e memes (efeito econômico)

const MEME_W = 8, BOOM_W = 26, BURST_W = 13;
const MEME_LIFT = 0.03, BOOM_LIFT = 0.05, BURST_DROP = 0.07;
/** Efeito de um item de pop31 agora: +lift no boom/meme, −drop depois do estouro, 0 fora da janela. */
function fxNow33(s: GameState, f: Fx33): { lift: number; phase: 'meme' | 'boom' | 'burst' | 'done' } {
  const age = s.week - f.week;
  if (f.kind === 'meme') return age < MEME_W ? { lift: MEME_LIFT * (1 - age / MEME_W), phase: 'meme' } : { lift: 0, phase: 'done' };
  if (age < BOOM_W) return { lift: BOOM_LIFT * Math.min(1, 0.4 + age / 8), phase: 'boom' };
  if (age < BOOM_W + BURST_W) return { lift: -BURST_DROP * (1 - (age - BOOM_W) / BURST_W), phase: 'burst' };
  return { lift: 0, phase: 'done' };
}
/** Soma das alavancas de memes e bolhas (para vendas). Só leitura. */
export function pulse33(s: GameState): number {
  if (!memes33On(s)) return 0;
  let t = 0;
  for (const f of mundo33(s).fx) t += fxNow33(s, f).lift;
  return clamp(t, -0.12, 0.08);
}

// ================================================================ gancho do crédito (banco da INT-2 lê)

export interface CreditCrisis33 {
  active: boolean;
  ids: string[];
  /** somar à taxa de juros (0,05 = +5 pontos) */
  rateAdd: number;
  /** multiplicar o limite que o banco empresta */
  limitMult: number;
  /** cortar o valor aceito da garantia/catálogo (0,3 = −30%) */
  haircut: number;
  /** banco não empresta nada agora (choque de crédito) */
  freeze: boolean;
}
export function creditCrisis33(s: GameState): CreditCrisis33 {
  const out: CreditCrisis33 = { active: false, ids: [], rateAdd: 0, limitMult: 1, haircut: 0, freeze: false };
  for (const { c, i } of crises33(s)) {
    out.active = true; out.ids.push(c.id);
    out.rateAdd += c.rateAdd * i;
    out.limitMult *= 1 - (1 - c.limit) * i;
    out.haircut = Math.max(out.haircut, c.haircut * i);
    if (c.freeze && nowIdx(s) - (c.y * 12 + c.m) < 6) out.freeze = true;
  }
  if (memes33On(s)) {
    for (const f of mundo33(s).fx) {
      if (f.kind !== 'bolha' || fxNow33(s, f).phase !== 'burst') continue;
      const k = 1 - (s.week - f.week - BOOM_W) / BURST_W;
      out.active = true; out.ids.push(f.id);
      out.rateAdd += 0.02 * k; out.limitMult *= 1 - 0.15 * k; out.haircut = Math.max(out.haircut, 0.1 * k);
    }
  }
  return out;
}

/** Gancho de leitura para a interface: o que está mexendo na economia agora (crises e bolhas/memes). */
export function mundoNow33(s: GameState): { id: string; kind: 'crise' | 'meme' | 'bolha'; label: L; pct: number }[] {
  const out: { id: string; kind: 'crise' | 'meme' | 'bolha'; label: L; pct: number }[] = [];
  for (const { c, i } of crises33(s)) out.push({ id: c.id, kind: 'crise', label: geoById[c.geo]?.name ?? l(c.title[0], c.title[1]), pct: Math.round(i * 100) });
  if (memes33On(s)) for (const f of mundo33(s).fx) {
    const x = fxNow33(s, f);
    if (x.phase !== 'done') out.push({ id: f.id, kind: f.kind, label: l(f.kind === 'meme' ? 'Meme em alta' : x.phase === 'burst' ? 'Bolha estourou' : 'Bolha inflando', f.kind === 'meme' ? 'Meme on the rise' : x.phase === 'burst' ? 'Bubble burst' : 'Bubble inflating'), pct: Math.round(x.lift * 100) });
  }
  return out;
}

// ================================================================ efeitos em shows e vendas (modificadores)

const DIGITAL = new Set(['download', 'streaming', 'airplay']);
const L_SHOWS = l('Crise: menos gente nos shows', 'Crisis: fewer people at shows');
registerMod('showRevenue', 'mundo33', (s, v, ctx) => {
  if (!crise33On(s)) return null;
  const m = ctx.cityId ? cityById[ctx.cityId]?.market : undefined;
  let k = 1;
  for (const { c, i } of crises33(s, m)) k *= 1 - c.shows * i;
  return k === 1 ? null : { value: v * k, label: L_SHOWS };
});
registerMod('chartUnits', 'mundo33', (s, v, ctx) => {
  const rel = ctx.release;
  if (!rel) return null;
  let k = 1;
  const fm = rel.formats ?? [];
  const dShare = fm.length ? fm.filter((f) => DIGITAL.has(f)).length / fm.length : 0;
  for (const { c, i } of crises33(s)) {
    if (!rel.territories?.some((t) => marketsOf(c).includes(t))) continue;
    k *= 1 - c.phys * i * (1 - dShare) + c.dig * i * dShare;
  }
  const p = pulse33(s);
  if (p) k *= 1 + p;
  return Math.abs(k - 1) < 0.0005 ? null : { value: v * k, label: l('Mundo: crise, meme ou bolha', 'World: crisis, meme or bubble') };
});

// ================================================================ virada do mês

const exileCity = (reg: string): string => (reg === 'br' ? 'london' : reg === 'latam' ? 'paris' : reg === 'asia' ? 'los_angeles' : reg === 'africa' ? 'paris' : 'london');

/** QA33 (porto da INT-2): artista seu sob pressão do regime que ainda não partiu (o mesmo critério do cartão). */
export function exileCand33(s: GameState): string | undefined {
  if (!censura33On(s)) return undefined;
  const st = mundo33(s);
  return playerActs(s).find((id) => s.acts[id] && !st.exile[id] && (st.pressure[id] ?? 0) >= 8);
}
/** QA33: parte para o exílio pelo porto (mesmo efeito da opção do cartão; quem cobra a passagem é o porto). */
export function exileAct33(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a) return l('Artista inválido.', 'Invalid act.');
  const st = mundo33(s), reg = cityById[a.city]?.market ?? 'eu', city = exileCity(reg);
  st.exile[a.id] = { since: s.week, from: a.city, reg };
  a.city = city; st.pressure[a.id] = 0;
  EH.trust(a, 6); EH.mood(s, a, 'inspiration', 15); EH.mood(s, a, 'morale', -8);
  EH.log(s, 'exile33', '{a} embarca para o exílio em {c}.', '{a} sails into exile in {c}.', { a: a.name, c: cityById[city]?.name ?? city }, a.id, true);
  return null;
}
const actMarket = (s: GameState, id: string) => cityById[s.acts[id]?.city ?? '']?.market;

registerSimHook('month', 'mundo33', (s) => {
  const st = mundo33(s);
  if (crise33On(s)) {
    for (const c of CRISES33) {
      const d = nowIdx(s) - (c.y * 12 + c.m);
      if (d === 0 && st.fired[`start:${c.id}`] === undefined) {
        st.fired[`start:${c.id}`] = s.week;
        if (!s.economy.recession) { s.economy.recession = true; s.economy.recessionUntil = s.week + Math.round(c.recession * 4.35); }
        const g = geoById[c.geo];
        emitFact(s, { kind: 'culture31', actors: ['player'], place: s.config.homeCity, severity: 55, visibility: 'public', tags: ['mundo33', 'crise'], src: 'mundo33',
          data: { crise: c.id }, text: fmtL(l(c.text[0], c.text[1]), { gpt: g?.name.pt ?? '', gen: g?.name.en ?? '' }), diary: true });
        notify(s, l(c.title[0], c.title[1]), 'event');
      }
      // choque de crédito: o banco não empresta nos primeiros meses (usa a trava que já existe)
      if (c.freeze && d >= 0 && d < 6) s.flags.m19nolend = Math.max(s.flags.m19nolend ?? 0, s.week + 5);
    }
  }
  if (censura33On(s)) censuraMonth33(s);
  if (memes33On(s)) memesMonth33(s);
});

function censuraMonth33(s: GameState): void {
  const st = mundo33(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || (a.status !== 'active' && a.status !== 'emerging')) continue;
    const ex = st.exile[id];
    if (ex) {
      // volta triunfal quando o regime cai (ou depois de 3 anos fora)
      const reg = censorshipIn(s.year, cityById[ex.from]?.market ?? 'na').level;
      if (reg < 0.3 || s.week - ex.since > 156) {
        a.city = ex.from; delete st.exile[id];
        a.fame = clamp(a.fame + 3, 0, 100);
        a.fans.casual += 20000; a.fans.active += 4000;
        EH.log(s, 'exile33', '{a} volta do exílio e é recebido(a) como símbolo.', '{a} returns from exile and is welcomed as a symbol.', { a: a.name }, a.id, true);
      }
      continue;
    }
    const m = actMarket(s, id);
    const lvl = m ? censorshipIn(s.year, m).level : 0;
    const political = a.members.some((pid) => s.persons[pid]?.traits.some((t) => t === 'engaged' || t === 'controversial'));
    const p = st.pressure[id] ?? 0;
    st.pressure[id] = clamp(lvl >= 0.5 ? p + lvl * (political ? 3 : 0.8) : p - 2, 0, 30);
  }
}

function memesMonth33(s: GameState): void {
  const st = mundo33(s);
  for (const f of st.fx) {
    if (f.kind !== 'bolha' || st.burst[f.id] !== undefined || s.week - f.week < BOOM_W) continue;
    st.burst[f.id] = s.week;
    emitFact(s, { kind: 'culture31', actors: ['player'], place: s.config.homeCity, severity: 35, visibility: 'public', tags: ['mundo33', 'bolha'], src: 'mundo33',
      data: { estoura: f.id }, text: l('A bolha estourou: os preços despencam, quem apostou perde e o banco passa a olhar o seu catálogo com desconfiança.', 'The bubble burst: prices plunge, those who bet lose, and the bank starts eyeing your catalog with suspicion.'), diary: true });
  }
  st.fx = st.fx.filter((f) => s.week - f.week < BOOM_W + BURST_W + 4 && !(f.kind === 'meme' && s.week - f.week > MEME_W + 4));
}

// meme/bolha de pop31 que acabou de sair vira efeito econômico (o texto continua sendo só da extras31)
onFact('culture31', (s, f) => {
  if (!memes33On(s) || f.src !== 'extras31') return;
  const kind = (f.tags ?? []).includes('bolha') ? 'bolha' : (f.tags ?? []).includes('meme') ? 'meme' : null;
  const id = String(f.data?.pop ?? '');
  if (!kind || !id) return;
  const st = mundo33(s);
  if (!st.fx.some((x) => x.id === id)) st.fx.push({ id, kind, week: s.week });
}, 'mundo33:pop');

// ================================================================ cartões de decisão

const E = EH.E, o = EH.o;
type Ctx = Record<string, string | number>;

function criseEvent(c: Crise33): EventDef {
  return E(`crise33_${c.id}`, 'world', 'bad', ['crise33'], 60,
    (s) => {
      if (!crise33On(s) || mundo33(s).fired[`card:${c.id}`] !== undefined) return null;
      const d = nowIdx(s) - (c.y * 12 + c.m);
      if (d < 0 || d > 2 || !playerActs(s).length) return null;
      const g = geoById[c.geo];
      return { crise: c.id, gpt: g?.name.pt ?? '', gen: g?.name.en ?? '' };
    },
    c.title, c.text,
    [
      o('belts', 'Apertar os cintos', 'Tighten belts', (s, _r, k: Ctx) => {
        mundo33(s).fired[`card:${String(k.crise)}`] = s.week;
        EH.gain(s, `crise33cut:${k.crise}`, 2500, 'cost_cut', 'Corte de custos na crise');
        for (const id of playerActs(s)) EH.mom(s.acts[id], -3);
      }, ['Entra dinheiro agora; a banda sente.', 'Cash now; the band feels it.']),
      o('hold', 'Manter a agenda e apostar na volta', 'Hold the schedule and bet on the rebound', (s, _r, k: Ctx) => {
        mundo33(s).fired[`card:${String(k.crise)}`] = s.week;
        EH.pay(s, `crise33hold:${k.crise}`, 3000, 'marketing', 'Aposta na recuperação');
        const top = [...playerActs(s)].map((id) => s.acts[id]).sort((a, b) => b.fame - a.fame)[0];
        if (top) { EH.fame(top, 1); EH.mom(top, 4); }
      }, ['Custa agora; quem fica visível colhe depois.', 'Costs now; those who stay visible reap later.']),
      ...(c.id === 'covid20' ? [o('live', 'Transmissão ao vivo de casa', 'Livestream from home', (s, _r, k: Ctx) => {
        mundo33(s).fired[`card:${String(k.crise)}`] = s.week;
        EH.gain(s, 'crise33live', 3500, 'live', 'Transmissão ao vivo');
        const top = [...playerActs(s)].map((id) => s.acts[id]).sort((a, b) => b.fame - a.fame)[0];
        if (top) EH.fans(top, 15000, 2500, 400);
      })] : []),
    ]);
}

const censuraPressao33: EventDef = E('censura33_pressao', 'culture', 'bad', ['censorship', 'political', 'censura33'], 18,
  (s, r) => {
    if (!censura33On(s)) return null;
    const st = mundo33(s);
    const a = playerActs(s).map((id) => s.acts[id]).find((x) => x && !st.exile[x.id] && (st.pressure[x.id] ?? 0) >= 8 && r.chance(0.5));
    if (!a) return null;
    const m = cityById[a.city]?.market ?? 'br';
    return { act: a.id, reg: m, city: exileCity(m), cityName: cityById[exileCity(m)]?.name.pt ?? '' };
  },
  ['{act} no radar do regime', '{act} on the regime\'s radar'],
  ['A cada show, um homem de terno anota o que {act} canta. O departamento de censura mandou recado: a próxima letra será lida antes do palco. Há três caminhos — a metáfora, o exílio em {cityName} ou o silêncio.', 'At every show a man in a suit takes notes on what {act} sings. The censorship office sent word: the next lyric will be read before the stage. There are three paths — metaphor, exile in {cityName}, or silence.'],
  [
    o('metaphor', 'Escrever em metáfora', 'Write in metaphor', (s, _r, k: Ctx) => {
      const a = s.acts[String(k.act)];
      EH.pay(s, `censura33meta:${a.id}`, 1500, 'release', 'Letras reescritas');
      const win = Rng.fromSeed(`${s.config.seed}|censura33|${a.id}|${s.week}`).chance(0.65);
      const st = mundo33(s);
      if (win) { EH.fame(a, 2); EH.rep(s, 'artistic', 3); st.pressure[a.id] = Math.max(0, (st.pressure[a.id] ?? 0) - 6); EH.fans(a, 0, 3000, 1500); }
      else { s.flags[`banned:${a.id}`] = s.week; EH.mom(a, -8); st.pressure[a.id] = Math.max(0, (st.pressure[a.id] ?? 0) - 3); }
    }, ['Pode virar hino — ou ser percebida e vetada.', 'May become an anthem — or be spotted and banned.']),
    o('exile', 'Partir para o exílio', 'Go into exile', (s, _r, k: Ctx) => {
      const a = s.acts[String(k.act)];
      EH.pay(s, `censura33exil:${a.id}`, 3500, 'artist_dev', 'Exílio');
      const st = mundo33(s);
      st.exile[a.id] = { since: s.week, from: a.city, reg: String(k.reg) };
      a.city = String(k.city); st.pressure[a.id] = 0;
      EH.trust(a, 6); EH.mood(s, a, 'inspiration', 15); EH.mood(s, a, 'morale', -8);
      EH.log(s, 'exile33', '{a} parte para o exílio em {c}.', '{a} goes into exile in {c}.', { a: a.name, c: cityById[String(k.city)]?.name ?? String(k.city) }, a.id, true);
    }, ['Fama vira símbolo lá fora; volta quando o regime cair.', 'Fame turns into a symbol abroad; returns when the regime falls.']),
    o('silence', 'Ficar e calar', 'Stay and stay quiet', (s, _r, k: Ctx) => {
      const a = s.acts[String(k.act)];
      EH.trust(a, -6); EH.mom(a, -8); EH.mood(s, a, 'morale', -5);
      mundo33(s).pressure[a.id] = Math.max(0, (mundo33(s).pressure[a.id] ?? 0) - 8);
    }, ['Seguro, mas a banda se cala.', 'Safe, but the band falls silent.']),
  ]);

const pmrc33: EventDef = E('pmrc33_audiencia', 'culture', 'neutral', ['censorship', 'law', 'censura33'], 120,
  (s) => {
    if (!censura33On(s) || s.year < 1985 || s.year > 1990 || !advisoryOn(s) || mundo33(s).fired.pmrc !== undefined) return null;
    const rel = EH.myRels(s, (x) => EDGY.includes(familyOf(s.acts[x.actId]?.genre ?? '')) && s.week - x.week < 52 && x.territories.includes('na'))[0];
    return rel ? { act: rel.actId, release: rel.id } : null;
  },
  ['A audiência do selo de aviso', 'The warning-sticker hearing'],
  ['Mães de Washington pedem um selo de aviso nos discos. {act} está na lista de "{releaseTitle}". O Senado quer ouvir a indústria.', 'Washington moms ask for a warning sticker on records. {act} is on the list with "{releaseTitle}". The Senate wants to hear the industry.'],
  [
    o('sticker', 'Aceitar o selo', 'Accept the sticker', (s, _r, k: Ctx) => { mundo33(s).fired.pmrc = s.week; stickerRelease(s, String(k.release)); }, ['Vende como fruta proibida entre os jovens.', 'Sells as forbidden fruit among the young.']),
    o('clean', 'Lançar versão limpa', 'Issue a clean edit', (s, _r, k: Ctx) => { mundo33(s).fired.pmrc = s.week; cleanEdit(s, String(k.release)); EH.rep(s, 'commercial', 1); }),
    o('testify', 'Depor contra o selo', 'Testify against the sticker', (s, _r, k: Ctx) => {
      mundo33(s).fired.pmrc = s.week;
      const a = s.acts[String(k.act)];
      EH.rep(s, 'artistic', 3); EH.rep(s, 'institutional', -2);
      if (Rng.fromSeed(`${s.config.seed}|pmrc33|${s.week}`).chance(0.5)) { EH.fame(a, 2); EH.fans(a, 12000, 2000, 500); }
      else EH.appeal(s, k, 0.93);
    }, ['Defender a liberdade chama atenção — e as redes de varejo podem recusar.', 'Defending free speech draws attention — and retail chains may refuse.']),
  ]);

export const MUNDO33_EVENTS: EventDef[] = [...CRISES33.map(criseEvent), censuraPressao33, pmrc33];
export { crisisById33 };
