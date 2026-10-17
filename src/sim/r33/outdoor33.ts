// R33 · POL33-A item 3 — OUTDOORS ESPALHADOS, ALUGUEL E COMPRA (`exp33.pol.outdoors`, ligado por padrão desde 17/10, pedido do dono).
// Desligado: nada daqui roda (o gancho mensal sai na 1ª linha, o estado só nasce numa ação do jogador) e o mapa mostra os
// outdoors de sempre (`billboards31`). Ligado:
//  · 18 PONTOS fixos pela cidade (avenida, esquina, estação, beira-rio, casas de show, centro financeiro, estádio,
//    periferia, zona industrial, orla…), cada um num lote; só aparecem nos bairros já abertos e em lote comum (nenhum
//    cobre prédio seu). Movimento do bairro (`traffic`) e a época dão o preço e o alcance;
//  · ALUGAR por 1, 3 ou 6 meses para anunciar disco, turnê ou artista: paga à vista, dá hype no alvo todo mês
//    (`addHype`, o mesmo do ACOES5/camp27) e o anúncio aparece no próprio outdoor do mapa;
//  · COMPRAR o ponto (60× o aluguel) e alugar a terceiros: marcas e rivais ocupam o ponto em blocos de 3 meses
//    (hash estável, sem sorteio do jogo) e pagam 85% do aluguel; vender devolve 80% do preço;
//  · RÁDIO e TV: pacote de 4 semanas de intervalo pago, por época (rádio 1922+, TV 1950+).
// Fonte única de preço/estado; a interface (outdoor33ui.ts) só lê e chama estas funções.
import { BRANDS, type BrandDef } from '../../data/content';
import { l, type L } from '../../data/world';
import { cashWhy20, freeCash20 } from '../oblig20';
import { registerSwitch, sw } from '../r31/switches';
import { registerSimHook } from '../ext4';
import { addHype } from '../sys/hype12';
import { xs19 } from '../sys/mkb19';
import type { GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { LOTS18 } from '../sys/campus18';
import { billboards31, type Billboard31 } from '../r31/city31';

export const SW_OUT33 = 'exp33.pol.outdoors';
registerSwitch({
  id: SW_OUT33, def: true, scope: 'game',
  desc: l('R33 POL · outdoors espalhados pela cidade com aluguel por meses e compra (renda alugando a terceiros) e anúncio pago na rádio e na TV.',
    'R33 POL · billboards spread across the city with monthly rental and purchase (income by renting to others), plus paid radio and TV spots.'),
});
export const outOn = (s: GameState): boolean => !!sw<boolean>(s, SW_OUT33);

const abs = (s: GameState): number => s.year * 12 + s.month;
const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x; };

// ---------------------------------------------------------------- os pontos

export interface Site33 { id: string; lot: number; name: L; where: L; /** movimento do bairro (0,6…1,6) */ traffic: number; from: number }
const S = (id: string, lot: number, traffic: number, from = 1900): Site33 => {
  const n = LOTS18[lot]?.name ?? l('Lote', 'Lot');
  return { id, lot, name: l(`Outdoor: ${n.pt}`, `Billboard: ${n.en}`), where: n, traffic, from };
};
/** Espalhados de propósito: no centro vários lotes de cantos diferentes (avenida, esquinas, fundos, rio) e, a cada bairro que
 *  abre, mais pontos até a periferia e a orla. O movimento (`traffic`) segue o tipo de vizinhança. */
export const SITES33: Site33[] = [
  // centro (lotes 0–13)
  S('avenida', 1, 1.6), S('noroeste', 2, 1.3), S('sudeste', 4, 1.4), S('avsul', 5, 1.5), S('sudoeste', 6, 1.2), S('rua-tras', 9, 0.9), S('beco-norte', 12, 0.8), S('rio', 13, 0.9),
  // leste, avenida sul e bairro novo
  S('rua-nova', 14, 1.0, 1960), S('fim-avenida', 15, 0.9, 1960), S('leste-sul', 18, 0.8, 1960), S('avenida-nova', 23, 1.1, 1985), S('cruzamento', 26, 0.9, 1985), S('loteamento', 29, 0.8, 2010), S('trilho', 31, 0.8, 2010),
  // porto, estação, casas de show, centro financeiro
  S('cais', 34, 1.0, 2015), S('armazem', 35, 0.9, 2015), S('patio-trens', 36, 1.0, 2015), S('estacao', 40, 1.5, 2015),
  S('palcos', 45, 1.3, 2025), S('neon', 46, 1.4, 2025), S('musicos', 47, 1.1, 2025), S('bancos', 52, 1.2, 2035), S('bolsa', 53, 1.3, 2035),
  // periferia e orla (só com bairros novos abertos)
  S('periferia', 63, 0.7), S('estadio', 58, 1.3), S('industrial', 64, 0.6), S('orla', 67, 0.8), S('hospital', 70, 0.8), S('rodovia', 80, 0.7),
];
export const site33 = (id: string): Site33 | undefined => SITES33.find((x) => x.id === id);
/** Pontos que existem na época (o lote tem de existir no mapa). */
export const sitesNow33 = (s: GameState): Site33[] => SITES33.filter((x) => s.year >= x.from && !!LOTS18[x.lot]);

/** Arte por época: lambe-lambe → cartaz pintado → painel iluminado → luminoso de neon → telão de LED → holograma (2030+). */
export type Style33 = 'paste' | 'painted' | 'lit' | 'neon' | 'led' | 'holo';
export const style33 = (y: number): Style33 => (y < 1920 ? 'paste' : y < 1950 ? 'painted' : y < 1975 ? 'lit' : y < 1995 ? 'neon' : y < 2030 ? 'led' : 'holo');
const eraK = (y: number): number => (y < 1920 ? 0.5 : y < 1950 ? 0.8 : y < 1990 ? 1 : y < 2010 ? 1.3 : y < 2030 ? 1.7 : 2.2);

/** Aluguel mensal do ponto (dólares reais da época → caixa do jogo). Pelo movimento do bairro e pela época. */
export const rent33 = (s: GameState, site: Site33): number => Math.round(money(s, 400 * site.traffic * eraK(s.year)));
export const buyPrice33 = (s: GameState, site: Site33): number => rent33(s, site) * 60;
export const sellPrice33 = (s: GameState, site: Site33): number => Math.round(buyPrice33(s, site) * 0.8);
/** Alcance no bairro (0..1): movimento × força da mídia da época. */
export const reach33 = (s: GameState, site: Site33): number => Math.min(1, site.traffic * (s.year < 1950 ? 0.45 : s.year < 2010 ? 0.6 : 0.55));
const discount = (months: number): number => (months >= 6 ? 0.9 : months >= 3 ? 0.95 : 1);

// ---------------------------------------------------------------- estado (nasce numa ação do jogador)

export interface Tgt33 { k: 'release' | 'tour' | 'act'; actId: string; relId?: string; prId?: string; title: string }
export interface Rent33 { site: string; k: Tgt33['k']; actId: string; relId?: string; prId?: string; title: string; start: number; months: number; paid: number }
export interface Own33 { since: number; price: number; out: boolean; income: number }
export interface Out33 { rents: Rent33[]; own: Record<string, Own33>; tgt: number; sold: number }
const fresh = (): Out33 => ({ rents: [], own: {}, tgt: 0, sold: 0 });
const st = (s: GameState): Out33 => xs19(s, 'outdoor33', fresh);
/** Leitura sem criar estado. */
export const peek33o = (s: GameState): Out33 | undefined => (s as unknown as { x4?: Record<string, Out33> }).x4?.outdoor33;

/** O que o jogador pode anunciar: lançamento a caminho, lançamento recente, turnê em andamento, o artista. */
export function targets33(s: GameState): Tgt33[] {
  const out: Tgt33[] = [], seen = new Set<string>();
  const add = (t: Tgt33): void => { const k = `${t.k}:${t.relId ?? t.prId ?? t.actId}`; if (!seen.has(k) && s.acts[t.actId]) { seen.add(k); out.push(t); } };
  const mine = new Set(playerActs(s));
  for (const p of s.pendingReleases ?? []) if (mine.has(p.actId)) add({ k: 'release', actId: p.actId, prId: p.id, title: p.title });
  for (const r of Object.values(s.releases)) if (r.owner === 'player' && mine.has(r.actId) && (r.week ?? -99) <= s.week && s.week - (r.week ?? -99) <= 16) add({ k: 'release', actId: r.actId, relId: r.id, title: r.title });
  for (const t of s.tours ?? []) if (t.status !== 'cancelled' && t.status !== 'done' && mine.has(t.actId)) add({ k: 'tour', actId: t.actId, title: fmtL(l('Turnê: {n}', 'Tour: {n}'), { n: t.name }).pt });
  for (const id of mine) { const a = s.acts[id]; if (a && a.status !== 'retired' && !a.deceased) add({ k: 'act', actId: id, title: a.name }); }
  return out.slice(0, 8);
}
export function target33(s: GameState): Tgt33 | undefined { const xs = targets33(s); return xs.length ? xs[(peek33o(s)?.tgt ?? 0) % xs.length] : undefined; }
/** "Trocar o que anunciar": passa para o próximo alvo. */
export function nextTarget33(s: GameState): L | null {
  const xs = targets33(s);
  if (!xs.length) return l('Nada para anunciar ainda: lance um disco, marque uma turnê ou tenha um artista.', 'Nothing to advertise yet: release a record, book a tour or have an act.');
  const o = st(s); o.tgt = (o.tgt + 1) % xs.length;
  return null;
}

// ---------------------------------------------------------------- quem ocupa o ponto

const brandsNow = (y: number): BrandDef[] => BRANDS.filter((b) => b.start <= y && (!b.end || b.end >= y));
/** Marca ou rival num bloco de 3 meses (hash estável); a probabilidade cresce com o movimento. */
export function tenant33(s: GameState, site: Site33, m = abs(s)): BrandDef | null {
  const block = Math.floor(m / 3), occ = Math.min(88, 28 + 40 * site.traffic);
  if (hs(`${s.config.seed}|${site.id}|${block}`) % 100 >= occ) return null;
  const bs = brandsNow(Math.floor(m / 12));
  return bs.length ? bs[hs(`${s.config.seed}|${site.id}|${block}|b`) % bs.length] : null;
}
export const tenantUntil33 = (m: number): number => (Math.floor(m / 3) + 1) * 3;
export const rentOf33 = (s: GameState, siteId: string, m = abs(s)): Rent33 | undefined => peek33o(s)?.rents.find((r) => r.site === siteId && r.start <= m && m < r.start + r.months);
export type Slot33 = { who: 'player'; rent: Rent33 } | { who: 'third'; brand: BrandDef; own: boolean } | { who: 'free'; own: boolean };
export function slot33(s: GameState, site: Site33, m = abs(s)): Slot33 {
  const own = !!peek33o(s)?.own[site.id], r = rentOf33(s, site.id, m);
  if (r) return { who: 'player', rent: r };
  const t = tenant33(s, site, m);
  return t ? { who: 'third', brand: t, own } : { who: 'free', own };
}
export const monthName33 = (m: number): L => { const y = Math.floor(m / 12), i = m % 12; return l(`${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][i]}. ${y}`, `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]} ${y}`); };

// ---------------------------------------------------------------- ações

const hypeKey = (t: { relId?: string; prId?: string; actId: string }): string => (t.relId ? `r:${t.relId}` : t.prId ? `n:${t.actId}` : `a:${t.actId}`);
function push33(s: GameState, site: Site33 | undefined, kind: string, t: Tgt33 | Rent33, v: number): void {
  addHype(s, hypeKey(t), kind, fmtL(l('{o} ({t})', '{o} ({t})'), { o: site ? site.name : kind === 'radio' ? l('Rádio', 'Radio') : l('TV', 'TV'), t: t.title }), v);
}
/** Hype de um mês de outdoor: 1,5 a 6 pontos, pelo alcance do bairro (mesmo `addHype` das campanhas). */
const monthHype = (s: GameState, site: Site33): number => Math.max(1, Math.round(1.5 + 4.5 * reach33(s, site) * (s.year >= 1990 ? 1.1 : 1)));

export function rentLock33(s: GameState, siteId: string, months: number): L | null {
  const site = site33(siteId);
  if (!outOn(s) || !site) return l('Outdoors espalhados desligados nesta partida.', 'Spread-out billboards are off in this game.');
  if (s.year < site.from) return l('Este ponto ainda não existe nesta época.', 'This spot does not exist in this era yet.');
  const sl = slot33(s, site);
  if (sl.who === 'player') return fmtL(l('Você já anuncia aqui até {m}.', 'You already advertise here until {m}.'), { m: monthName33(sl.rent.start + sl.rent.months) });
  if (sl.who === 'third') return fmtL(l('Alugado por {b} até {m}.', 'Rented by {b} until {m}.'), { b: sl.brand.name, m: monthName33(tenantUntil33(abs(s))) });
  if (!target33(s)) return l('Nada para anunciar ainda: lance um disco, marque uma turnê ou tenha um artista.', 'Nothing to advertise yet: release a record, book a tour or have an act.');
  // o aluguel por vários meses passa por cima de uma marca que ainda não alugou o bloco seguinte (o jogador chegou primeiro)
  const cost = Math.round(rent33(s, site) * months * discount(months));
  if (freeCash20(s) < cost) return cashWhy20(s, cost, l('Caixa livre insuficiente.', 'Not enough free cash.'));
  return null;
}
export const rentCost33 = (s: GameState, site: Site33, months: number): number => Math.round(rent33(s, site) * months * discount(months));

/** Aluga o ponto por `months` meses para o alvo escolhido. Devolve o motivo do bloqueio ou null (feito). */
export function rentSite33(s: GameState, siteId: string, months: 1 | 3 | 6): L | null {
  const lock = rentLock33(s, siteId, months);
  if (lock) return lock;
  const site = site33(siteId)!, t = target33(s)!, cost = rentCost33(s, site, months);
  if (!post(s, `ob33:${siteId}:${abs(s)}`, -cost, 'marketing', `Outdoor: ${site.name.pt}`)) return l('Já alugado neste mês.', 'Already rented this month.');
  st(s).rents.push({ site: siteId, k: t.k, actId: t.actId, relId: t.relId, prId: t.prId, title: t.title, start: abs(s), months, paid: cost });
  push33(s, site, 'ob33', t, monthHype(s, site));
  return null;
}
/** Encerra o aluguel em andamento (sem reembolso: o que foi pago já rendeu cartaz). */
export function endRent33(s: GameState, siteId: string): L | null {
  const o = peek33o(s), r = o?.rents.find((x) => x.site === siteId && x.start <= abs(s) && abs(s) < x.start + x.months);
  if (!o || !r) return l('Nenhum aluguel seu neste ponto.', 'You rent nothing here.');
  r.months = Math.max(1, abs(s) - r.start);
  return null;
}

export function buyLock33(s: GameState, siteId: string): L | null {
  const site = site33(siteId);
  if (!outOn(s) || !site) return l('Outdoors espalhados desligados nesta partida.', 'Spread-out billboards are off in this game.');
  if (peek33o(s)?.own[siteId]) return l('O ponto já é seu.', 'You already own this spot.');
  const p = buyPrice33(s, site);
  if (freeCash20(s) < p) return cashWhy20(s, p, l('Caixa livre insuficiente para comprar o ponto.', 'Not enough free cash to buy the spot.'));
  return null;
}
export function buySite33(s: GameState, siteId: string): L | null {
  const lock = buyLock33(s, siteId);
  if (lock) return lock;
  const site = site33(siteId)!, price = buyPrice33(s, site);
  if (!post(s, `building:ob33:${siteId}`, -price, 'acquisitions', `Outdoor: ${site.name.pt}`)) return l('Compra já feita.', 'Purchase already made.');
  st(s).own[siteId] = { since: abs(s), price, out: true, income: 0 };
  return null;
}
export function sellSite33(s: GameState, siteId: string): L | null {
  const o = peek33o(s), site = site33(siteId);
  if (!o || !site || !o.own[siteId]) return l('Este ponto não é seu.', 'This spot is not yours.');
  if (rentOf33(s, siteId)) return l('Há uma campanha sua no ar: espere acabar ou encerre.', 'One of your campaigns is running: wait for it to end or end it.');
  if (!post(s, `asset_sale:ob33:${siteId}`, sellPrice33(s, site), 'asset_sales', `Outdoor: ${site.name.pt}`)) return l('Venda já feita.', 'Sale already made.');
  delete o.own[siteId]; o.sold++;
  return null;
}
/** Seu ponto: alugar a terceiros (renda) ou deixar livre para você. */
export function toggleOut33(s: GameState, siteId: string): L | null {
  const o = peek33o(s);
  if (!o?.own[siteId]) return l('Este ponto não é seu.', 'This spot is not yours.');
  o.own[siteId].out = !o.own[siteId].out;
  return null;
}
export const incomeNow33 = (s: GameState, site: Site33): number => Math.round(rent33(s, site) * 0.85);

// ---------------------------------------------------------------- rádio e TV (pacote de 4 semanas)

export type Air33 = 'radio' | 'tv';
export const airFrom33 = (k: Air33): number => (k === 'radio' ? 1922 : 1950);
export const airName33 = (k: Air33, y: number): L => (k === 'radio'
  ? (y < 1950 ? l('Reclame no rádio', 'Radio commercial') : y < 1990 ? l('Spot de rádio', 'Radio spot') : l('Spot em rádio e streaming de áudio', 'Radio and audio-streaming spot'))
  : (y < 1990 ? l('Comercial de TV', 'TV commercial') : y < 2010 ? l('Intervalo no horário nobre', 'Prime-time slot') : l('TV e vídeo sob demanda', 'TV and video on demand')));
export const airCost33 = (s: GameState, k: Air33): number => Math.round(money(s, (k === 'radio' ? 1200 : 4200) * (s.year >= 1990 ? 1.2 : 1)));
export function airLock33(s: GameState, k: Air33): L | null {
  if (!outOn(s)) return l('Anúncio de rádio e TV desligado nesta partida.', 'Radio and TV ads are off in this game.');
  if (s.year < airFrom33(k)) return fmtL(l('Ainda não existe nesta época (desde {y}).', 'Does not exist in this era yet (since {y}).'), { y: airFrom33(k) });
  const t = target33(s);
  if (!t) return l('Nada para anunciar ainda: lance um disco, marque uma turnê ou tenha um artista.', 'Nothing to advertise yet: release a record, book a tour or have an act.');
  if (peek33o(s)?.rents.some((r) => r.site === k && r.actId === t.actId && r.start === abs(s))) return l('Já no ar este mês para este alvo.', 'Already on air this month for this target.');
  const c = airCost33(s, k);
  return freeCash20(s) < c ? cashWhy20(s, c, l('Caixa livre insuficiente.', 'Not enough free cash.')) : null;
}
export function buyAir33(s: GameState, k: Air33): L | null {
  const lock = airLock33(s, k);
  if (lock) return lock;
  const t = target33(s)!, c = airCost33(s, k);
  if (!post(s, `ob33:air:${k}:${abs(s)}:${t.actId}`, -c, 'marketing', `${airName33(k, s.year).pt}: ${t.title}`)) return l('Intervalo já comprado.', 'Slot already bought.');
  st(s).rents.push({ site: k, k: t.k, actId: t.actId, relId: t.relId, prId: t.prId, title: t.title, start: abs(s), months: 1, paid: c });
  push33(s, undefined, k, t, k === 'radio' ? 4 : 8);
  return null;
}

// ---------------------------------------------------------------- a virada do mês

registerSimHook('month', 'outdoor33', (s) => {
  if (!outOn(s)) return;
  const o = peek33o(s);
  if (!o) return;
  const m = abs(s);
  for (const r of o.rents) {
    const site = site33(r.site);
    if (site && r.start < m && m < r.start + r.months && s.acts[r.actId]) push33(s, site, 'ob33', r, monthHype(s, site));
  }
  o.rents = o.rents.filter((r) => r.start + r.months > m - 24); // guarda 2 anos de histórico
  for (const [id, w] of Object.entries(o.own)) {
    const site = site33(id);
    if (!site || !w.out || rentOf33(s, id, m)) continue;
    const t = tenant33(s, site, m);
    if (!t) continue;
    const inc = incomeNow33(s, site);
    if (post(s, `ob33:inc:${id}:${m}`, inc, 'outdoor33', `Outdoor alugado: ${t.name}`)) w.income += inc;
  }
});

// ---------------------------------------------------------------- o que cada ponto mostra no mapa

export interface Board33 {
  site: string; sprite: string; /** quem anuncia */ who: 'player' | 'rival' | 'brand' | 'free';
  relId: string; actId?: string; title: string; act: string; label: L; mine: boolean; own: boolean; vacant: boolean; col?: string;
  /** marca curta no painel (pt, en) */ tag: [string, string]; kind: Billboard31['kind'] | 'brand'; style: Style33;
}
const BRAND_COL = ['#c8483a', '#3a6ac8', '#e0b040', '#2a8a4a', '#8a5a8a', '#d86a2a', '#2ec8c0'];
/** Os pontos visíveis (o lote comum existe no mapa: `have` = ids de sprite) com o que mostram agora. PURO. */
export function boards33(s: GameState, have: ReadonlySet<string>): Board33[] {
  if (!outOn(s)) return [];
  const sites = sitesNow33(s).filter((x) => have.has(`fl:${x.lot}`));
  const rivals = billboards31(s).filter((b) => !b.mine);
  let ri = 0;
  const m = abs(s), style = style33(s.year);
  const base = (x: Site33, sl: Slot33): Board33 => ({ site: x.id, sprite: `fl:${x.lot}`, who: 'free', relId: '', title: '', act: '', label: l('Ponto livre', 'Free spot'), mine: false, own: !!sl && 'own' in sl && sl.own, vacant: true, tag: ['ALUGUE', 'RENT'], kind: 'brand', style });
  return [...sites].sort((a, b) => b.traffic - a.traffic || (a.id < b.id ? -1 : 1)).map((x) => {
    const sl = slot33(s, x, m), own = !!peek33o(s)?.own[x.id], b = base(x, sl);
    b.own = own;
    if (sl.who === 'player') {
      const r = sl.rent, rel = r.relId ? s.releases[r.relId] : undefined;
      return { ...b, who: 'player', vacant: false, mine: true, relId: rel?.id ?? '', actId: r.actId, title: r.title, act: s.acts[r.actId]?.name ?? '', label: l('Seu anúncio', 'Your ad'), kind: r.k === 'tour' ? 'tour' : r.k === 'release' ? 'paid' : 'hot', tag: r.k === 'tour' ? ['TURNÊ', 'TOUR'] : r.k === 'release' ? ['NOVO', 'NEW'] : ['HOT', 'HOT'] };
    }
    if (sl.who === 'third') {
      const item = rivals[ri];
      if (item && !own) { ri++; return { ...b, who: 'rival', vacant: false, relId: item.relId, actId: item.actId, title: item.title, act: item.act, label: item.label, kind: item.kind, tag: item.kind === 'chart' ? ['N1', 'N1'] : item.kind === 'hot' ? ['HOT', 'HOT'] : item.kind === 'tour' ? ['TURNÊ', 'TOUR'] : ['NOVO', 'NEW'] }; }
      return { ...b, who: 'brand', vacant: false, title: sl.brand.name, label: l(sl.brand.name, sl.brand.name), kind: 'brand', col: BRAND_COL[hs(sl.brand.id) % BRAND_COL.length], tag: [sl.brand.name.slice(0, 5).toUpperCase(), sl.brand.name.slice(0, 5).toUpperCase()] };
    }
    return b;
  });
}
