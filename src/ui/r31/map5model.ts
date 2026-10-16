// R31 · onda 5 (MAPA · EXP-3) — CIDADE E MUNDO SÓ PELO MAPA (modelo PURO, sem DOM). Atrás de `exp5.nav` (desligado).
// O que antes só se achava na lista ao lado do mapa ("Seus prédios", "Vizinhos e rivais", "À venda", "Lugares da cidade",
// "Lotes da cidade…") vira PINO do mapa: cada pino tem camada (Meus, Vizinhos, Marcos, Funções, Lojas, Shows e rádios,
// Lotes à venda, Lugares reais), rótulo para leitor de tela e "!" quando há novidade (vitrine do mês, à venda, recados).
//   cityPins5(s)            — todos os pinos da cidade da sede (mesmas fontes que o mapa usa: campus18, cityLots31…);
//   cityListIds5(s)         — o que a lista antiga mostrava (o teste confere que tudo isso é pino visível);
//   next5(pts, from, dir)   — navegação por setas (vizinho mais perto na direção), igual para prédios e países;
//   find5(s, q)             — busca (Ctrl K) de prédios, lugares, países e cidades, com o alvo para apontar no mapa;
//   worldCountries5(s)      — países com nome da época (fronteiras do ano), cidades, "!" e o centro para o teclado;
//   countryInfo5(s, a3)     — o painel do país: mercado, cidades, cultura, turnês e o que está fechado;
//   telex5(s)               — o telex/jornal do mês ancorado no mapa (3 manchetes, cada uma leva à tela certa).
// Explorar não muda o mundo: tudo aqui só lê (nada de sorteio, nada criado no save; os testes conferem).

import { CITIES, cityById, l, type L } from '../../data/world';
import { countryOfCity, unitOfCity, unitOfCountry } from '../../data/geo';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { tourList } from '../../sim/tours';
import { KIND18, LOTS18, buildings18 } from '../../sim/sys/campus18';
import { EV19, live19ev } from '../../sim/sys/hood19';
import { pendingList } from '../../sim/r31/pending';
import { peekVit31, vitOn31, VIT_OF_KIND31 } from '../../sim/r31/vitrine31';
import type { PlaceK27 } from '../../sim/sys/place27';
import { bldVis27, mapLms27, nbInfo27 } from '../pixel/city27';
import { cityLots31 } from '../pixel/lots31map';
import { citySheet27, closedCountries27, monthlyDigest27, sitesByCity27, type Go27 } from '../sys/mundo27model';

// ---------------------------------------------------------------- camadas da cidade

export type Layer5 = 'mine' | 'nb' | 'lm' | 'fn' | 'shops' | 'venues' | 'sale' | 'real' | 'homes';
export interface LayerDef5 { id: Layer5; name: L; tip: L; def: boolean }
/** As placas do mapa (o painel "Placas" do mock): ligar/desligar mostra ou esconde os pinos daquela camada. */
export const CITY_LAYERS5: LayerDef5[] = [
  { id: 'mine', name: l('Meus prédios', 'My buildings'), tip: l('Sede, estúdio, casa de shows e o que mais for seu.', 'HQ, studio, venue and whatever else is yours.'), def: true },
  { id: 'nb', name: l('Vizinhos e rivais', 'Neighbours and rivals'), tip: l('Gravadoras rivais, rádios e bares da vizinhança.', 'Rival labels, radios and bars next door.'), def: true },
  { id: 'shops', name: l('Lojas e serviços', 'Shops and services'), tip: l('Lojas de discos e instrumentos, bares, hotéis, escritórios.', 'Record and instrument shops, bars, hotels, offices.'), def: true },
  { id: 'venues', name: l('Casas de show e rádios', 'Venues and radios'), tip: l('Onde se toca e onde se ouve: palcos, rádios, TV e imprensa.', 'Where music is played and heard: stages, radio, TV and press.'), def: true },
  { id: 'sale', name: l('Lotes à venda', 'Plots for sale'), tip: l('Terrenos e prédios à venda (preço na placa).', 'Plots and buildings for sale (price on the sign).'), def: true },
  { id: 'real', name: l('Lugares reais da música', 'Real music places'), tip: l('Casas, rádios e estúdios que existiram nesta cidade e época.', 'Venues, radios and studios that existed in this city and era.'), def: true },
  { id: 'homes', name: l('Casas de moradores', 'Residents\' homes'), tip: l('Quem mora na cidade (artistas, executivos, a família).', 'Who lives in town (artists, executives, the family).'), def: true },
  { id: 'lm', name: l('Marcos da cidade', 'City landmarks'), tip: l('Monumentos e cartões-postais da época.', 'Monuments and postcard sights of the era.'), def: true },
  { id: 'fn', name: l('Funções dos prédios', 'Building purposes'), tip: l('Pinta cada prédio pela função: negócio, casa, terreno à venda ou seu.', 'Colours each building by purpose: business, home, plot for sale or yours.'), def: false },
];
export const defaultLayers5 = (): Set<Layer5> => new Set(CITY_LAYERS5.filter((x) => x.def).map((x) => x.id));

const SHOP_K5 = new Set<PlaceK27>(['records', 'instruments', 'bar', 'hotel', 'office', 'apartments', 'market', 'facade', 'police', 'rehearsal']);
const VENUE_K5 = new Set<PlaceK27>(['venue', 'radio', 'press', 'studio', 'label']);
/** Camada de um lugar da cidade. */
export function placeLayer5(p: { k: PlaceK27; src: 'nb' | 'fill'; real?: boolean }): Layer5 {
  if (p.real) return 'real';
  if (p.src === 'nb') return 'nb';
  if (p.k === 'home') return 'homes';
  if (p.k === 'vacant') return 'sale';
  if (VENUE_K5.has(p.k)) return 'venues';
  return SHOP_K5.has(p.k) ? 'shops' : 'shops';
}

// ---------------------------------------------------------------- "!" (novidade)

export type BangK5 = 'vit' | 'sale' | 'msg' | 'alert' | 'event';
export interface Bang5 { k: BangK5; text: L }
const BANG_TXT5: Record<BangK5, L> = {
  vit: l('vitrine do mês', 'this month\'s showcase'), sale: l('à venda', 'for sale'), msg: l('recado esperando', 'message waiting'),
  alert: l('pedindo atenção', 'needs attention'), event: l('acontecendo agora', 'happening now'),
};
export const bangText5 = (k: BangK5): L => BANG_TXT5[k];

/** Páginas cujas pendências moram em cada tipo de lugar ("recados" do prédio). */
const PEND_OF_K5: Partial<Record<PlaceK27, string[]>> = {
  venue: ['shows', 'live19'], radio: ['media'], press: ['news17', 'critics', 'zines19'], bar: ['talent18', 'after18', 'night14'], label: ['labels'],
  studio: ['producers15'], instruments: ['loja31'], market: ['crime', 'bauc31'], facade: ['crime'], police: ['crime'], office: ['managers14'],
};

/** Quantas pendências moram em cada página (cada uma conta uma vez, no dono). */
function pendByArea5(s: GameState): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pendingList(s)) m.set(p.owner.area, (m.get(p.owner.area) ?? 0) + 1);
  return m;
}
/** Itens da vitrine do mês por tipo de lugar (só lê o que já foi sorteado na virada; nunca sorteia). */
function vitByKind5(s: GameState): Map<string, number> {
  const m = new Map<string, number>();
  const st = vitOn31(s) ? peekVit31(s) : undefined;
  if (!st) return m;
  const ym = s.year * 12 + s.month;
  for (const [k, ps] of Object.entries(VIT_OF_KIND31)) m.set(k, st.items.filter((it) => (ps ?? []).includes(it.p) && it.at <= ym && it.to >= ym).length);
  return m;
}

// ---------------------------------------------------------------- pinos da cidade

export type PinK5 = 'mine' | 'nb' | 'place' | 'sale' | 'event' | 'lm';
export interface Pin5 {
  /** o mesmo id do ponto clicável no mapa (data-id): prédio, `nb:<lote>`, `pl:<lote>`, `lot:<n>`, `ev:<id>`, `lm:<id>` */
  id: string;
  k: PinK5;
  layer: Layer5;
  name: L | string;
  what: L | string;
  bang: Bang5[];
}

/** Todos os pinos da cidade da sede agora (só leitura; as mesmas fontes que o mapa "Nosso mundo" usa). */
export function cityPins5(s: GameState): Pin5[] {
  const out: Pin5[] = [];
  const bs = buildings18(s);
  const vis = bldVis27(s, bs);
  const lots = cityLots31(s);
  const pend = pendByArea5(s);
  const vit = vitByKind5(s);
  for (const b of bs) {
    if (b.zone !== 'campus' || b.st === 'sold' || b.st === 'closed') continue;
    const x = vis.get(b.id);
    out.push({ id: b.id, k: 'mine', layer: 'mine', name: b.name, what: KIND18[b.kind].name, bang: x?.alerts ? [{ k: 'alert', text: BANG_TXT5.alert }] : [] });
  }
  const nbs = nbInfo27(s);
  const realIds = new Set(lots.cx.places.map((p) => p.id));
  const seen = new Set(out.map((p) => p.id));
  for (const n of nbs) {
    const id = `nb:${n.lot}`;
    seen.add(id);
    const plc = lots.places.find((p) => p.id === id);
    const bang: Bang5[] = [];
    if (n.sale) bang.push({ k: 'sale', text: BANG_TXT5.sale });
    if (plc && (PEND_OF_K5[plc.k] ?? []).some((a) => (pend.get(a) ?? 0) > 0)) bang.push({ k: 'msg', text: BANG_TXT5.msg });
    if (plc && (vit.get(plc.k) ?? 0) > 0) bang.push({ k: 'vit', text: BANG_TXT5.vit });
    out.push({ id, k: 'nb', layer: 'nb', name: n.name, what: n.doing, bang });
  }
  for (const p of lots.places) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const bang: Bang5[] = [];
    if ((vit.get(p.k) ?? 0) > 0) bang.push({ k: 'vit', text: BANG_TXT5.vit });
    if (p.sale !== undefined) bang.push({ k: 'sale', text: BANG_TXT5.sale });
    if ((PEND_OF_K5[p.k] ?? []).some((a) => (pend.get(a) ?? 0) > 0)) bang.push({ k: 'msg', text: BANG_TXT5.msg });
    out.push({ id: p.id, k: 'place', layer: placeLayer5({ k: p.k, src: p.src, real: realIds.has(p.id) }), name: p.name, what: p.what, bang });
  }
  for (const x of lots.sale) {
    // terreno à venda já tem a placa com o preço no desenho: sem "!" por cima (o "!" de à venda fica para prédios)
    out.push({ id: `lot:${x.lot}`, k: 'sale', layer: 'sale', name: LOTS18[x.lot]?.name ?? `#${x.lot}`, what: x.name, bang: [] });
  }
  // um "!" por tipo de lugar e motivo (o recado da rádio acende UMA rádio, não todas): vizinho e lugar real primeiro
  const kindOf = new Map(lots.places.map((p) => [p.id, p.k]));
  const rank = (p: Pin5) => (p.k === 'nb' ? 0 : p.layer === 'real' ? 1 : 2);
  const lit = new Set<string>();
  for (const p of [...out].sort((a, b) => rank(a) - rank(b))) {
    const k = kindOf.get(p.id);
    if (!k) continue;
    p.bang = p.bang.filter((b) => { if (b.k !== 'vit' && b.k !== 'msg') return true; const key = `${k}:${b.k}`; if (lit.has(key)) return false; lit.add(key); return true; });
  }
  for (const e of live19ev(s)) out.push({ id: `ev:${e.id}`, k: 'event', layer: 'mine', name: EV19[e.k].n, what: EV19[e.k].d, bang: [{ k: 'event', text: BANG_TXT5.event }] });
  for (const m of mapLms27(s.config.homeCity, s.year)) if (!lots.cx.lmOut.has(m.id)) out.push({ id: `lm:${m.id}`, k: 'lm', layer: 'lm', name: m.n, what: l('Marco da cidade', 'City landmark'), bang: [] });
  return out;
}

/** O que a lista antiga ao lado do mapa mostrava (Seus prédios · Vizinhos e rivais · À venda · Lugares da cidade). */
export function cityListIds5(s: GameState): string[] {
  const lots = cityLots31(s);
  return [
    ...buildings18(s).filter((b) => b.zone === 'campus' && b.st !== 'sold' && b.st !== 'closed').map((b) => b.id),
    ...nbInfo27(s).map((n) => `nb:${n.lot}`),
    ...lots.sale.map((x) => `lot:${x.lot}`),
    ...lots.places.filter((p) => p.src === 'fill').map((p) => p.id),
  ];
}

/** Pinos visíveis com estas camadas (Funções não esconde nada: só pinta). */
export const visiblePins5 = (pins: Pin5[], on: Set<Layer5>): Pin5[] => pins.filter((p) => on.has(p.layer));

// ---------------------------------------------------------------- teclado (setas)

export type Dir5 = 'left' | 'right' | 'up' | 'down';
export interface Pt5 { id: string; x: number; y: number }
/** Próximo ponto na direção: o mais perto num cone de 45° para aquele lado (empate: o mais alinhado). Sem ponto na
 *  direção, dá a volta (o mais distante do lado oposto), para nunca prender o foco. Sem `from`: o primeiro da leitura. */
export function next5(pts: Pt5[], from: string | undefined, dir: Dir5): string | undefined {
  if (!pts.length) return undefined;
  const cur = pts.find((p) => p.id === from);
  if (!cur) return [...pts].sort((a, b) => a.y - b.y || a.x - b.x)[0].id;
  const v = dir === 'left' ? [-1, 0] : dir === 'right' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
  let best: Pt5 | undefined, bd = Infinity;
  for (const p of pts) {
    if (p.id === cur.id) continue;
    const dx = p.x - cur.x, dy = p.y - cur.y;
    const along = dx * v[0] + dy * v[1];
    if (along <= 0) continue;
    const across = Math.abs(dx * v[1] - dy * v[0]);
    if (across > along * 1.0001) continue;
    const d = along + across * 2;
    if (d < bd) { bd = d; best = p; }
  }
  if (best) return best.id;
  // volta: o mais longe do lado oposto, na mesma faixa
  let wrap: Pt5 | undefined, wd = -Infinity;
  for (const p of pts) {
    if (p.id === cur.id) continue;
    const dx = p.x - cur.x, dy = p.y - cur.y;
    const back = -(dx * v[0] + dy * v[1]) - Math.abs(dx * v[1] - dy * v[0]) * 0.5;
    if (back > wd) { wd = back; wrap = p; }
  }
  return wrap?.id;
}

/** Ordem de leitura (Tab): de cima para baixo, da esquerda para a direita, como o olho percorre o mapa. */
export const readOrder5 = (pts: Pt5[]): string[] => [...pts].sort((a, b) => a.y - b.y || a.x - b.x).map((p) => p.id);

// ---------------------------------------------------------------- mundo

export interface Country5 {
  /** unidade política NAQUELE ano (URSS junta Rússia e Ucrânia; Alemanha Ocidental e Oriental se separam) */
  id: string;
  /** país moderno principal (ISO alpha-3) — sombra no mapa e "tudo sobre o país" */
  a3: string;
  /** nome do país NAQUELE ano (fronteiras da época: Alemanha Ocidental, URSS, Iugoslávia…) */
  name: L;
  cities: string[];
  /** centro (média das cidades do jogo): o teclado anda por ele */
  lon: number; lat: number;
  /** graus de longitude para enquadrar o país inteiro (país grande = mapa mais afastado) */
  span: number;
  bang: Bang5[];
}
const tx5 = (x: L | string): string => (typeof x === 'string' ? x : x.pt);

/** Turnês suas (paradas na ordem) — as rotas desenhadas no mapa-múndi. */
export function tours5(s: GameState): { actId: string; stops: { city: string; played: boolean }[] }[] {
  const mine = new Set(playerActs(s));
  return tourList(s).filter((tr) => mine.has(tr.actId)).map((tr) => ({ actId: tr.actId, stops: tr.stops.filter((x) => x.status !== 'cancelled').map((x) => ({ city: x.cityId, played: x.status === 'played' })) }));
}

/** Países (unidades políticas do ano) que têm cidade no jogo, com o nome da época, as cidades e o "!" (turnê marcada,
 *  lugar seu, fechado). A chave é a unidade do ano: as fronteiras mudam com a época. */
export function worldCountries5(s: GameState): Country5[] {
  const by = new Map<string, { a3: string; name: L; cs: string[] }>();
  for (const c of CITIES) {
    const a3 = countryOfCity(c.id);
    if (!a3) continue;
    const u = unitOfCity(c.id, s.year) ?? unitOfCountry(a3, s.year);
    const k = u?.id ?? a3;
    const cur = by.get(k);
    if (cur) cur.cs.push(c.id); else by.set(k, { a3, name: u?.name ?? l(a3, a3), cs: [c.id] });
  }
  const tourAt = new Set<string>();
  for (const tr of tours5(s)) for (const st of tr.stops) if (!st.played) tourAt.add(st.city);
  const sites = sitesByCity27(s);
  const closed = closedCountries27(s);
  const out: Country5[] = [];
  for (const [id, { a3, name, cs }] of by) {
    const bang: Bang5[] = [];
    if (cs.some((c) => tourAt.has(c))) bang.push({ k: 'event', text: l('turnê marcada', 'tour booked') });
    if (cs.some((c) => sites.has(c)) || cs.includes(s.config.homeCity)) bang.push({ k: 'alert', text: l('seu mercado', 'your market') });
    if (closed.get(a3)?.hard) bang.push({ k: 'msg', text: l('fechado agora', 'closed now') });
    const lon = cs.reduce((a, c) => a + (cityById[c]?.lon ?? 0), 0) / cs.length;
    const lat = cs.reduce((a, c) => a + (cityById[c]?.lat ?? 0), 0) / cs.length;
    const lons = cs.map((c) => cityById[c]?.lon ?? lon), lats = cs.map((c) => cityById[c]?.lat ?? lat);
    const span = Math.max(16, Math.min(110, Math.max(Math.max(...lons) - Math.min(...lons), (Math.max(...lats) - Math.min(...lats)) * 1.6) * 1.8));
    out.push({ id, a3, name, cities: cs, lon, lat, span, bang });
  }
  return out.sort((a, b) => tx5(a.name).localeCompare(tx5(b.name)));
}

export interface CountryInfo5 {
  id: string; a3: string; name: L;
  cities: { id: string; name: L; unit: L | null; home: boolean; tier: number; tour: boolean; mine: boolean }[];
  market: { popM?: number; marketM?: number; distributes: boolean; yourFans: number };
  culture: { genres: string[]; movements: L[]; native: string[] };
  closed: L[];
  tours: string[];
}
/** O país (unidade do ano) por id da unidade, por cidade ou pelo código moderno. */
export function country5(s: GameState, key: string): Country5 | undefined {
  const cs = worldCountries5(s);
  return cs.find((x) => x.id === key) ?? cs.find((x) => x.cities.includes(key)) ?? cs.find((x) => x.a3 === key);
}
/** Painel do país: mercado, cidades (cada uma leva ao mapa dela), cultura, turnês e o que está fechado. */
export function countryInfo5(s: GameState, key: string): CountryInfo5 | null {
  const c5 = country5(s, key);
  if (!c5) return null;
  const tourAt = new Map<string, string[]>();
  for (const tr of tours5(s)) for (const st of tr.stops) if (!st.played) (tourAt.get(st.city) ?? tourAt.set(st.city, []).get(st.city)!).push(tr.actId);
  const sites = sitesByCity27(s);
  const sheets = c5.cities.map((id) => citySheet27(s, id)).filter((x): x is NonNullable<typeof x> => !!x);
  const genres = new Map<string, number>(), native = new Set<string>(), mov = new Map<string, L>();
  for (const sh of sheets) { for (const g of sh.scene.genres) genres.set(g.id, (genres.get(g.id) ?? 0) + g.v); for (const n of sh.scene.native) native.add(n); for (const m of sh.scene.movements) mov.set(m.pt, m); }
  const first = sheets[0];
  const closed = new Map<string, L>();
  for (const sh of sheets) for (const x of sh.closed) closed.set(x.pt, x);
  return {
    id: c5.id, a3: c5.a3, name: c5.name,
    cities: sheets.map((sh) => ({ id: sh.id, name: sh.name, unit: unitOfCity(sh.id, s.year)?.name ?? null, home: sh.id === s.config.homeCity, tier: sh.scene.tier, tour: tourAt.has(sh.id), mine: sites.has(sh.id) }))
      .sort((a, b) => Number(b.home) - Number(a.home) || b.tier - a.tier || tx5(a.name).localeCompare(tx5(b.name))),
    market: { popM: first?.audience.popM, marketM: first?.audience.marketM, distributes: sheets.some((x) => x.audience.distributes), yourFans: sheets.reduce((a, x) => a + x.audience.yourFans, 0) },
    culture: { genres: [...genres].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g), movements: [...mov.values()].slice(0, 4), native: [...native].slice(0, 4) },
    closed: [...closed.values()],
    tours: [...new Set(c5.cities.flatMap((c) => tourAt.get(c) ?? []))],
  };
}

/** Telex/jornal do mês ancorado no mapa: as 3 manchetes mais pesadas (as suas primeiro), cada uma com o destino. */
export function telex5(s: GameState, n = 3): { id: string; title: L; go: Go27; mine: boolean }[] {
  return [...monthlyDigest27(s).items].sort((a, b) => Number(!!b.mine) - Number(!!a.mine) || b.weight - a.weight).slice(0, n).map((x) => ({ id: x.id, title: x.title, go: x.go, mine: !!x.mine }));
}

// ---------------------------------------------------------------- busca (Ctrl K)

export type Find5 = { region: 'cidade'; id: string; name: L | string; what: L | string } | { region: 'mundo'; country: string; a3: string; city?: string; name: L | string; what: L | string };
const norm5 = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const both5 = (x: L | string): string => (typeof x === 'string' ? x : `${x.pt} ${x.en}`);
/** Prédios e lugares da cidade, países da época e cidades do mundo que batem com a busca (acentos não importam). */
export function find5(s: GameState, q: string, max = 12): Find5[] {
  const qq = norm5(q.trim());
  if (qq.length < 2) return [];
  const hit = (x: L | string) => norm5(both5(x)).includes(qq);
  const out: Find5[] = [];
  for (const p of cityPins5(s)) if (hit(p.name) || hit(p.what)) out.push({ region: 'cidade', id: p.id, name: p.name, what: p.what });
  const cs = worldCountries5(s);
  for (const c of cs) if (hit(c.name)) out.push({ region: 'mundo', country: c.id, a3: c.a3, name: c.name, what: l('País', 'Country') });
  for (const c of CITIES) if (c.id !== s.config.homeCity && hit(c.name)) { const k = cs.find((x) => x.cities.includes(c.id)); if (k) out.push({ region: 'mundo', country: k.id, a3: k.a3, city: c.id, name: c.name, what: l('Cidade', 'City') }); }
  return out.slice(0, max);
}
