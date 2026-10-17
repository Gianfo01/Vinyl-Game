// R33 · CIDADE — a cidade mexe no negócio. Quatro interruptores, todos DESLIGADOS no código (como os exp5.*):
//   exp33.cidade.lojas     lojas da época mexem nas vendas físicas do formato; loja própria em terreno seu = canal de venda
//   exp33.cidade.base      imóvel em outra cidade = base de turnê (menos risco de cancelar, cansaço e hospedagem) e,
//                          com escritório regional, olheiro local que põe talento da cidade no radar
//   exp33.cidade.terrenos  terreno seu valoriza com o tempo e o bairro, vende, aluga; vizinho ao lado dá parceria;
//                          o bairro muda (barato e artístico → na moda → caro) e a virada vira fato público
//   exp33.cidade.cenas     cenas locais por época (Seattle grunge, Memphis rock, Rio bossa…) puxam a demanda do gênero
// Só valores e regras: a posição dos lotes é da MAPA33. Tudo puro/determinístico (sorteio só no fluxo 'cidade33').
// Ganchos para outras frentes: baseFatigueRelief33 / baseLodgingSaving33 (turnê, só leitura), sceneAt33 (MUNDO/PESSOAS),
// lotValue33 (CATÁLOGO: terreno como garantia), districtStage33 (INT/MAPA: letreiro do bairro).

import { histAge19, hoodAt19 } from '../../data/hood19';
import { FORMATS, type FormatId } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { addAsset, removeAsset } from '../finance';
import { bizAt31, commonLots31, homes31, realLots31 } from '../r31/city31';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { rng19 } from '../rng19';
import { watchAct } from '../scouting';
import { LOTS18, buildings18, campus18, layout18 } from '../sys/campus18';
import { nb19 } from '../sys/hood19';
import { lots31, ownsLot31, peekLots31 } from '../sys/lots31';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';

// ---------------------------------------------------------------- interruptores

export const SW_LOJAS33 = 'exp33.cidade.lojas';
export const SW_BASE33 = 'exp33.cidade.base';
export const SW_TERRENOS33 = 'exp33.cidade.terrenos';
export const SW_CENAS33 = 'exp33.cidade.cenas';
const SWS33: [string, L][] = [
  [SW_LOJAS33, l('Versão 33 · lojas da época mexem nas vendas físicas do formato na cidade; loja própria em terreno seu é canal de venda. Desligado: tudo como antes.',
    'Version 33 · era shops move physical format sales in town; an own shop on your plot is a sales channel. Off: everything as before.')],
  [SW_BASE33, l('Versão 33 · imóvel em outra cidade vira base de turnê (menos cancelamento e cansaço, hospedagem) e escritório regional para A&R. Desligado: só imóvel de lazer.',
    'Version 33 · a home in another city becomes a tour base (fewer cancellations, less fatigue, lodging) and a regional A&R office. Off: leisure home only.')],
  [SW_TERRENOS33, l('Versão 33 · terreno seu valoriza, vende e aluga; vizinho ao lado dá parceria; o bairro muda com os anos. Desligado: terreno só compra e constrói.',
    'Version 33 · your plot appreciates, sells and rents; the next-door neighbour offers a partnership; the district changes over the years. Off: plots only buy and build.')],
  [SW_CENAS33, l('Versão 33 · cenas locais por época (Seattle grunge, Memphis rock, Rio bossa…) puxam a demanda de shows do gênero. Desligado: sem cena.',
    'Version 33 · local scenes by era (Seattle grunge, Memphis rock, Rio bossa…) lift live demand for the genre. Off: no scenes.')],
];
for (const [id, desc] of SWS33) {
  registerSwitch({ id, def: false, scope: 'game', desc });
  registerEditable({ id: `sw.${id}`, area: 'tools', label: desc, kind: 'bool', get: (s) => !!sw<boolean>(s, id), set: (s, v) => { setSw(s, id, !!v); } });
}
export const lojas33 = (s: GameState): boolean => !!sw<boolean>(s, SW_LOJAS33);
export const base33 = (s: GameState): boolean => !!sw<boolean>(s, SW_BASE33);
export const terrenos33 = (s: GameState): boolean => !!sw<boolean>(s, SW_TERRENOS33);
export const cenas33 = (s: GameState): boolean => !!sw<boolean>(s, SW_CENAS33);

export const CIDADE33 = {
  /** efeito das lojas sobre as vendas físicas: por loja do tipo (até `shopMax`), e sem nenhuma na cidade */
  shopPer: 0.05, shopMax: 3, shopNone: 0.93,
  /** cada loja própria (até `ownMax`) */
  ownPer: 0.04, ownMax: 2,
  shopCost: 5000, shopUpkeep: 150, shopIncome: 120,
  /** terreno: valorização ao ano, venda (fração do valor) e aluguel mensal (fração do valor), bônus da parceria */
  grow: 0.03, sellCut: 0.92, rentRate: 0.004, partner: 1.25,
  /** base de turnê: menos risco, alívio de cansaço por show, diária de hospedagem que se poupa; escritório regional */
  baseRisk: 0.9, baseRest: 1.5, nightCost: 90, officeCost: 2500, officeUpkeep: 400, officeScout: 0.35,
  /** cena: aumento da demanda do gênero */
  scene: 0.18,
};

// ---------------------------------------------------------------- estado

export interface Cidade33St {
  /** lojas próprias: lote → semana em que abriu */
  shops: Record<number, number>;
  /** terrenos alugados: lote → 1 */
  rent: Record<number, 1>;
  /** gentrificação do bairro no dia da compra (para valorizar pela mudança do bairro) */
  age0: Record<number, number>;
  /** parceria com o vizinho do lado: lote → nome */
  partner: Record<number, string>;
  /** escritórios regionais: cidade → semana */
  office: Record<string, number>;
  /** último estágio do bairro avisado */
  stage?: string;
}
declare module '../ext4' { interface Ext4 { cidade33: Cidade33St } }
const fresh = (): Cidade33St => ({ shops: {}, rent: {}, age0: {}, partner: {}, office: {} });
registerExt4('cidade33', fresh);
export function cidade33(s: GameState): Cidade33St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.cidade33 ??= fresh()) as Cidade33St;
  st.shops ??= {}; st.rent ??= {}; st.age0 ??= {}; st.partner ??= {}; st.office ??= {};
  return st;
}
const peek = (s: GameState): Cidade33St | undefined => (s as unknown as { x4?: { cidade33?: Cidade33St } }).x4?.cidade33;

// ---------------------------------------------------------------- 2 · lojas da época e loja própria

/** Que tipos de loja (BIZ31) vendem cada formato físico. */
export const FMT_BIZ33: Partial<Record<FormatId, string[]>> = {
  shellac: ['gramophone', 'records', 'radio_tv'], cylinder: ['gramophone'], piano_roll: ['piano', 'sheet'],
  single45: ['records', 'jukebox_bar', 'hifi', 'vinyl'], lp: ['records', 'hifi', 'vinyl'], cassette: ['records', 'hifi', 'radio_tv'], cd: ['cd_mega', 'records', 'hifi'],
};
const physical = (f: FormatId): boolean => !!FORMATS.find((x) => x.id === f)?.physical;
/** Quantas lojas que vendem o formato há na cidade da sede agora (cidade comum + lugares reais de loja + as suas). */
export function shopsFor33(s: GameState, fmt: FormatId): number {
  const ids = FMT_BIZ33[fmt];
  if (!ids) return 0;
  let n = commonLots31(s).filter((lot) => ids.includes(bizAt31(s.config.seed, s.config.homeCity, lot, s.year).id)).length;
  if (ids.includes('records')) n += realLots31(s).filter((x) => x.p.kind === 'store').length;
  return n;
}
/** Multiplicador das vendas físicas do formato pela oferta de lojas da época (1 = neutro). */
export function formatShopMult33(s: GameState, fmt: FormatId): number {
  if (!physical(fmt) || !FMT_BIZ33[fmt]) return 1;
  const n = shopsFor33(s, fmt);
  return n === 0 ? CIDADE33.shopNone : 1 + CIDADE33.shopPer * Math.min(n, CIDADE33.shopMax);
}
export const ownShops33 = (s: GameState): number => Object.keys(peek(s)?.shops ?? {}).length;

registerMod('chartUnits', 'cidade33', (s, v, ctx) => {
  if (!lojas33(s) || !ctx.release) return null;
  const fm = ctx.release.formats.filter((f) => physical(f) && FMT_BIZ33[f]);
  if (!fm.length) return null;
  let m = fm.reduce((t, f) => t + formatShopMult33(s, f), 0) / fm.length;
  if (ctx.release.owner === 'player') m *= 1 + CIDADE33.ownPer * Math.min(ownShops33(s), CIDADE33.ownMax);
  return { value: v * m, label: l('Lojas da cidade', 'City shops') };
});

/** Por que não dá para abrir loja própria neste terreno (null = dá). */
export function shopLock33(s: GameState, lot: number): L | null {
  if (!lojas33(s)) return l('Loja própria está desligada nesta partida.', 'Own shop is off in this game.');
  if (!ownsLot31(s, lot)) return l('O terreno não é seu.', 'You do not own that plot.');
  const st = cidade33(s);
  if (st.shops[lot] !== undefined) return l('Já há uma loja sua aí.', 'You already have a shop there.');
  if (st.rent[lot]) return l('O terreno está alugado.', 'The plot is rented out.');
  if (new Set(layout18(s, buildings18(s)).values()).has(lot) || campus18(s).proj.some((p) => p.lot === lot)) return l('Já há obra ou prédio seu nesse lote.', 'There is already a project or building of yours on that plot.');
  if (s.player.cash < money(s, CIDADE33.shopCost)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function openShop33(s: GameState, lot: number): { ok: boolean; text: L } {
  const why = shopLock33(s, lot);
  if (why) return { ok: false, text: why };
  const cost = money(s, CIDADE33.shopCost), nm = LOTS18[lot].name;
  post(s, `shop33:${lot}`, -cost, 'capex', `Loja própria: ${nm.pt}`);
  addAsset(s, { kind: 'building', name: fmtL(l('Loja própria: {n}', 'Own shop: {n}'), { n: nm }), cost, lifeMonths: 240 });
  cidade33(s).shops[lot] = s.week;
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 8, visibility: 'public', tags: ['property', 'shop'], src: 'cidade33',
    text: fmtL(l('Você abriu uma loja de discos própria em "{n}".', 'You opened your own record shop at "{n}".'), { n: nm }), diary: true });
  return { ok: true, text: fmtL(l('Loja aberta em "{n}": ela vende o seu catálogo físico.', 'Shop open at "{n}": it sells your physical catalogue.'), { n: nm }) };
}

// ---------------------------------------------------------------- 4 · terrenos: valor, venda, aluguel, parceria, bairro

export type Stage33 = 'artsy' | 'hip' | 'pricey';
/** Estágio do bairro de uma cidade num ano (barato e artístico → na moda → caro). */
export function districtStage33(city: string, year: number): { stage: Stage33; age: number } {
  const age = Math.max(0, Math.min(1, histAge19(hoodAt19(city, year), year)));
  return { stage: age < 0.4 ? 'artsy' : age < 0.75 ? 'hip' : 'pricey', age };
}
/** Valor atual de um terreno seu: o que pagou, valorizado pelos anos e pela mudança do bairro (nunca abaixo de 70%). */
export function lotValue33(s: GameState, lot: number): number {
  const o = peekLots31(s)?.own[lot];
  if (!o) return 0;
  const yrs = Math.max(0, (s.week - o.w) / 52), a0 = peek(s)?.age0[lot] ?? districtStage33(s.config.homeCity, s.year).age;
  const dAge = districtStage33(s.config.homeCity, s.year).age - a0;
  const f = Math.max(0.7, Math.pow(1 + CIDADE33.grow, yrs) * (1 + 0.5 * dAge));
  return Math.round((o.price || money(s, 800)) * f);
}
/** Dois lotes lado a lado (a rua entre eles não conta). */
export function adjacent33(a: number, b: number): boolean {
  const A = LOTS18[a], B = LOTS18[b];
  if (!A || !B || a === b) return false;
  const gap = (a0: number, a1: number, b0: number, b1: number) => Math.max(b0 - a1, a0 - b1);
  const gx = gap(A.gx, A.gx + A.w, B.gx, B.gx + B.w), gy = gap(A.gy, A.gy + A.d, B.gy, B.gy + B.d);
  return (gx <= 2 && gy < 0) || (gy <= 2 && gx < 0);
}
/** O vizinho (nb19) ao lado do terreno, se houver: dele vem a parceria. */
export function neighbourOf33(s: GameState, lot: number): { lot: number; name: string } | null {
  const n = nb19(s).find((x) => adjacent33(lot, x.lot));
  return n ? { lot: n.lot, name: n.name.pt } : null;
}
export const lotRent33 = (s: GameState, lot: number): number =>
  Math.round(lotValue33(s, lot) * CIDADE33.rentRate * (cidade33(s).partner[lot] ? CIDADE33.partner : 1));

export function lotUseLock33(s: GameState, lot: number): L | null {
  if (!terrenos33(s)) return l('Terrenos da versão 33 estão desligados.', 'Version 33 plots are off.');
  if (!ownsLot31(s, lot)) return l('O terreno não é seu.', 'You do not own that plot.');
  if (new Set(layout18(s, buildings18(s)).values()).has(lot) || campus18(s).proj.some((p) => p.lot === lot)) return l('Há obra ou prédio seu nesse lote.', 'There is a project or building of yours on that plot.');
  if (cidade33(s).shops[lot] !== undefined) return l('Há uma loja sua aí.', 'There is a shop of yours there.');
  return null;
}
export function sellLot33(s: GameState, lot: number): { ok: boolean; text: L } {
  const why = lotUseLock33(s, lot);
  if (why) return { ok: false, text: why };
  const o = peekLots31(s)!.own[lot], gain = Math.round(lotValue33(s, lot) * CIDADE33.sellCut), nm = LOTS18[lot].name;
  post(s, `lotsell33:${lot}`, gain, 'asset_sales', `Venda do terreno: ${nm.pt}`);
  if (o.asset) removeAsset(s, o.asset);
  delete lots31(s).own[lot];
  const st = cidade33(s);
  delete st.rent[lot]; delete st.age0[lot]; delete st.partner[lot];
  return { ok: true, text: fmtL(l('Terreno "{n}" vendido.', 'Plot "{n}" sold.'), { n: nm }) };
}
export function rentLot33(s: GameState, lot: number, on: boolean): { ok: boolean; text: L } {
  const why = lotUseLock33(s, lot);
  if (why) return { ok: false, text: why };
  const st = cidade33(s);
  if (on) st.rent[lot] = 1; else delete st.rent[lot];
  return { ok: true, text: on ? l('Terreno alugado: o aluguel cai todo mês.', 'Plot rented out: rent comes in every month.') : l('Terreno de volta para você.', 'Plot back with you.') };
}

// ---------------------------------------------------------------- 3 · base de turnê e escritório regional

/** A cidade tem imóvel seu (base de turnê)? Só conta com o interruptor ligado. */
export const isBase33 = (s: GameState, city: string): boolean => base33(s) && homes31(s).some((h) => h.city === city);
/** Cansaço a menos por show na cidade-base (gancho de leitura para a turnê). */
export const baseFatigueRelief33 = (s: GameState, city: string): number => (isBase33(s, city) ? CIDADE33.baseRest : 0);
/** Hospedagem poupada em N noites na cidade-base (gancho de leitura para o custo da turnê). */
export const baseLodgingSaving33 = (s: GameState, city: string, nights: number): number => (isBase33(s, city) ? money(s, CIDADE33.nightCost) * Math.max(0, nights) : 0);

registerMod('tourRisk', 'cidade33', (s, v, ctx) => (ctx.cityId && isBase33(s, ctx.cityId) ? { value: v * CIDADE33.baseRisk, label: l('Base na cidade', 'Base in the city') } : null));

export function officeLock33(s: GameState, city: string): L | null {
  if (!base33(s)) return l('Bases de turnê estão desligadas nesta partida.', 'Tour bases are off in this game.');
  if (!homes31(s).some((h) => h.city === city)) return l('Compre um imóvel nessa cidade primeiro.', 'Buy a home in that city first.');
  if (cidade33(s).office[city] !== undefined) return l('Já há escritório regional aí.', 'There is already a regional office there.');
  if (s.player.cash < money(s, CIDADE33.officeCost)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function openOffice33(s: GameState, city: string): { ok: boolean; text: L } {
  const why = officeLock33(s, city);
  if (why) return { ok: false, text: why };
  post(s, `office33:${city}`, -money(s, CIDADE33.officeCost), 'capex', `Escritório regional: ${cityById[city]?.name.pt ?? city}`);
  cidade33(s).office[city] = s.week;
  return { ok: true, text: fmtL(l('Escritório regional aberto em {c}: um olheiro local passa a pôr talentos no seu radar.', 'Regional office open in {c}: a local scout starts putting talent on your radar.'), { c: cityById[city]?.name ?? city }) };
}

// ---------------------------------------------------------------- 4 · cenas locais por época

export interface Scene33 { city: string; from: number; to: number; genres: string[]; name: L }
const S = (city: string, from: number, to: number, genres: string[], pt: string, en: string): Scene33 => ({ city, from, to, genres, name: l(pt, en) });
export const SCENES33: Scene33[] = [
  S('new_orleans', 1895, 1926, ['nola_jazz'], 'Jazz de Nova Orleans', 'New Orleans jazz'),
  S('chicago', 1945, 1961, ['delta_blues', 'classic_blues'], 'Blues de Chicago', 'Chicago blues'),
  S('nashville', 1945, 1976, ['country'], 'Country de Nashville', 'Nashville country'),
  S('memphis', 1950, 1963, ['rnr', 'classic_blues'], 'Rock de Memphis', 'Memphis rock'),
  S('memphis', 1963, 1975, ['soul'], 'Soul de Memphis', 'Memphis soul'),
  S('rio', 1957, 1969, ['bossa'], 'Bossa nova do Rio', 'Rio bossa nova'),
  S('liverpool', 1960, 1968, ['beat', 'pop_rock'], 'Beat de Liverpool', 'Liverpool beat'),
  S('detroit', 1959, 1973, ['soul'], 'Soul de Detroit', 'Detroit soul'),
  S('kingston', 1962, 1983, ['ska', 'reggae'], 'Ska e reggae de Kingston', 'Kingston ska and reggae'),
  S('london', 1975, 1981, ['punk'], 'Punk de Londres', 'London punk'),
  S('seattle', 1988, 1997, ['grunge'], 'Grunge de Seattle', 'Seattle grunge'),
];
/** A cena da cidade no ano (a primeira, se houver duas; PURO). Gancho de leitura para MUNDO/PESSOAS. */
export const sceneAt33 = (city: string, year: number): Scene33 | null => SCENES33.find((x) => x.city === city && year >= x.from && year < x.to) ?? null;
export const sceneFits33 = (city: string, year: number, genre: string): Scene33 | null => SCENES33.find((x) => x.city === city && year >= x.from && year < x.to && x.genres.includes(genre)) ?? null;

registerMod('cityDemand', 'cidade33', (s, v, ctx) => {
  if (!cenas33(s) || !ctx.cityId || !ctx.act) return null;
  const sc = sceneFits33(ctx.cityId, s.year, ctx.act.genre);
  return sc ? { value: v * (1 + CIDADE33.scene), label: sc.name } : null;
});

// ---------------------------------------------------------------- virada do mês e do ano

registerSimHook('month', 'cidade33', (s) => {
  const st = peek(s);
  if (!st) return;
  if (lojas33(s)) for (const lot of Object.keys(st.shops)) {
    post(s, `shop33up:${lot}`, -money(s, CIDADE33.shopUpkeep), 'misc', 'Loja própria: custo do mês');
    post(s, `shop33in:${lot}`, money(s, CIDADE33.shopIncome) * (1 + 0.2 * Math.min(3, shopsFor33(s, 'lp') + shopsFor33(s, 'cd')) / 3), 'other_income', 'Loja própria: vendas do mês');
  }
  if (terrenos33(s)) for (const lot of Object.keys(st.rent)) {
    if (!ownsLot31(s, +lot)) { delete st.rent[+lot]; continue; }
    if (!st.partner[+lot]) { const nbr = neighbourOf33(s, +lot); if (nbr) {
      st.partner[+lot] = nbr.name;
      emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 6, visibility: 'public', tags: ['property', 'partner'], src: 'cidade33',
        text: fmtL(l('Seu terreno alugado fez parceria com o vizinho: {n}.', 'Your rented plot partnered with the neighbour: {n}.'), { n: nbr.name }) });
    } }
    post(s, `lotrent33:${lot}`, lotRent33(s, +lot), 'other_income', `Aluguel do terreno: ${LOTS18[+lot]?.name.pt ?? lot}`);
  }
  if (base33(s)) for (const [city] of Object.entries(st.office)) {
    if (!homes31(s).some((h) => h.city === city)) { delete st.office[city]; continue; }
    post(s, `office33up:${city}`, -money(s, CIDADE33.officeUpkeep), 'misc', `Escritório regional: ${cityById[city]?.name.pt ?? city}`);
    if (rng19(s, 'cidade33').next() >= CIDADE33.officeScout) continue;
    const pick = Object.values(s.acts).filter((a: Act) => a.city === city && a.owner !== 'player' && !a.deceased && !s.knowledge[a.id]).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
    if (pick) watchAct(s, pick.id);
  }
});
/** Terreno comprado guarda a gentrificação do dia (a valorização depende da mudança do bairro). Roda no mês: barato. */
registerSimHook('month', 'cidade33.age', (s) => {
  if (!terrenos33(s)) return;
  const own = peekLots31(s)?.own;
  if (!own) return;
  const st = cidade33(s), now = districtStage33(s.config.homeCity, s.year).age;
  for (const k of Object.keys(own)) st.age0[+k] ??= now;
});
registerSimHook('year', 'cidade33', (s) => {
  if (!terrenos33(s)) return;
  const st = cidade33(s), d = districtStage33(s.config.homeCity, s.year);
  if (st.stage && st.stage !== d.stage) {
    const nm = hoodAt19(s.config.homeCity, s.year).n;
    emitFact(s, { kind: 'statement', actors: [], place: s.config.homeCity, severity: 7, visibility: 'public', tags: ['hood', 'gentrification'], src: 'cidade33',
      text: fmtL(d.stage === 'hip' ? l('{n} entrou na moda: o aluguel e os terrenos sobem.', '{n} turned hip: rents and plots go up.')
        : d.stage === 'pricey' ? l('{n} ficou caro: os artistas começam a sair.', '{n} got pricey: the artists start to leave.') : l('{n} voltou a ser barato e artístico.', '{n} is cheap and artsy again.'), { n: nm }) });
  }
  st.stage = d.stage;
});


