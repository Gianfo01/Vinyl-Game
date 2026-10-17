// R31 · onda 4 (VIT) — VITRINE DO MÊS: motor único dos interiores dinâmicos (no estilo da loja de instrumentos, que
// vende coisas diferentes a cada mês), expandido para os lugares que já existem.
//
//  • Cada lugar (loja de discos, instrumentos, casa de shows, bar, estúdio, rádio, hotel, gravadora rival, beco, leilão,
//    feira/sebo da época, aeroporto) tem um CONTEÚDO DO MÊS sorteado NA VIRADA DO MÊS, no motor (gancho 'month', fluxo
//    rng19 'vit31'); a tela só lê. O primeiro mês da partida é sorteado na primeira semana (gancho 'week').
//  • Catálogo por época × país × porte do lugar × estado do mundo (`VIT_DEFS31`). Cada item tem: o que é (texto lido
//    do estado na hora, bilíngue), desenho (`art`), ações — SEMPRE funções que já existem no jogo (comprar pela loja,
//    comprar no beco, ouvir, pôr no radar, conhecer, ação do lugar, lance no leilão, grampo do submundo, denúncia, ficha,
//    painel rápido, uma tela) — e duração (o raro dura um mês e pode sumir no seguinte).
//  • Três fontes de aleatoriedade: reflexo do mundo (paradas, falências → equipamento usado, mortes → disco some e
//    encarece, modas de gênero), raridade por época/porte (motivo para voltar) e encontros com pessoas reais da agenda.
//  • FONTES MIGRADAS (uma fonte só, sem depósito paralelo): o estoque da loja de instrumentos (items31), o do beco
//    (under31) e os lotes da casa de leilões (auction31) são gerados por este motor na virada (as três perderam o gancho
//    próprio) e a vitrine NÃO copia nada deles: lê as ofertas/lotes na hora (`vitItems31`). O que a vitrine põe à venda
//    (disco raro, instrumento "era de fulano", consignado, novidade, equipamento de falência) entra no MESMO registro de
//    objetos e ofertas (r31/object via items31.stockOne31) e se compra pela mesma `buyOffer31`.
//  • Interruptor `vit31` (padrão ligado): desligado, só as fontes migradas giram (comportamento antigo); ligado, entram o
//    conteúdo novo e as duas regras econômicas (ofertas novas e o prejuízo da fita pirata do SEU disco no beco).

import { clamp, hashString, type Rng } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { REAL_MGRS } from '../../data/managers14';
import { registerExt4, registerSimHook } from '../ext4';
import { rng19 } from '../rng19';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { activeCritics } from '../media';
import { registerSwitch, sw } from './switches';
import { registerEditable, registerRunnable } from './editor';
import { ITEMS31, available31, buyErr31, buyOffer31, itemDef31, offerRow31, restockShops31, shopCities31, shopRows31, stockOne31, unstock31, type ItemDef31 } from './items31';
import { relics, relicPrice } from '../sys/relics9';
import { bmLock31, bmRows31, buyBm31, denounce31, restockUnder31, underOrgs31 } from '../sys/under31';
import { bidLock31, ladder31, openSessions31, raise31, restockAuction31 } from '../sys/auction31';
import { meetHere31, peekGente31 } from '../sys/gente31';
import { scoutHere31 } from '../sys/gente31';
import { playingThisWeek31, tourCity31 } from '../sys/where31';
import { doPlace27, placeActs27, type PlaceK27 } from '../sys/place27';
import { commitCrime, crimeOdds, usd } from '../sys/crime17';
import { mgrActive } from '../sys/managers14';
import { nameOfKey18 } from '../sys/agency18';

// ---------------------------------------------------------------- tipos

export type VitPlace31 = 'records' | 'instruments' | 'venue' | 'bar' | 'studio' | 'radio' | 'hotel' | 'label' | 'market' | 'auction' | 'fair' | 'airport';
export const VIT_PLACES31: VitPlace31[] = ['records', 'instruments', 'venue', 'bar', 'studio', 'radio', 'hotel', 'label', 'market', 'auction', 'fair', 'airport'];
/** Desenho do item (ui/pixel/vit31px). 'person' = a pessoa entra na cena como gente (clicável). */
export type VitArt31 = 'disc' | 'crate' | 'guitar' | 'amp' | 'keys' | 'drums' | 'horn' | 'mic' | 'poster' | 'tape' | 'note' | 'contract' | 'lot' | 'gear' | 'person';
export const VIT_ARTS31: VitArt31[] = ['disc', 'crate', 'guitar', 'amp', 'keys', 'drums', 'horn', 'mic', 'poster', 'tape', 'note', 'contract', 'lot', 'gear', 'person'];
/** Fonte de aleatoriedade (documento e testes). */
export type VitSrc31 = 'world' | 'rare' | 'people' | 'stock';

/** Referências ao estado (nada é copiado: o texto e o preço são lidos na hora). */
export interface VitRef31 { offer?: string; rel?: string; act?: string; pid?: string; key?: string; relic?: string; row?: string; org?: string; lb?: string; song?: string; g?: string }
export interface VitItem31 {
  id: string; /** definição do catálogo */ c: string; p: VitPlace31;
  /** mês (índice ano×12+mês) em que entrou e o último mês em que fica */ at: number; to: number;
  ref: VitRef31; rare?: 1; /** a vitrine criou a oferta (tira da venda quando o item sai) */ mk?: 1;
}
export interface Vit31St { ym: number; seq: number; items: VitItem31[]; /** sorteios forçados pelo editor */ forced: number; /** prejuízo acumulado com pirataria do seu disco */ pir: number }

declare module '../ext4' { interface Ext4 { vit31: Vit31St } }
const fresh = (): Vit31St => ({ ym: -1, seq: 0, items: [], forced: 0, pir: 0 });
registerExt4('vit31', fresh);
export function vit31(s: GameState): Vit31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.vit31 ??= fresh()) as Vit31St;
  st.items ??= [];
  return st;
}
/** Leitura sem criar estado (interface). */
export const peekVit31 = (s: GameState): Vit31St | undefined => (s as unknown as { x4?: { vit31?: Vit31St } }).x4?.vit31;

registerSwitch({
  id: 'vit31', def: true, scope: 'game',
  desc: l('Vitrine do mês: cada lugar ganha conteúdo novo sorteado na virada do mês (discos raros, instrumentos com história, gente da agenda, cartaz, boatos) e a fita pirata do seu disco no beco dá prejuízo. Desligado: só o estoque antigo da loja, do beco e dos leilões.',
    'Showcase of the month: each place gets new content drawn at the month turn (rare records, instruments with a history, people from the agenda, posters, rumours) and a bootleg of your record in the alley costs you sales. Off: only the old shop, alley and auction stock.'),
});
export const vitOn31 = (s: GameState): boolean => sw<boolean>(s, 'vit31');

/** Ajustes do editor (regra 10). */
export const VIT31 = { slots: 3, pirate: 1 };

// ---------------------------------------------------------------- contexto e leituras

export const ymIdx31 = (s: GameState): number => s.year * 12 + s.month;
export interface VitCtx31 { s: GameState; year: number; city: string; a3: string; porte: number; mine: Set<string> }
/** Porte/prestígio do lugar (0..1): o tamanho da cena da cidade e o peso dela no mundo. */
export function porte31(s: GameState, city = s.config.homeCity): number {
  const c = cityById[city];
  return clamp(0.25 + (c?.scenes.length ?? 1) * 0.1 + ((c?.w ?? 1) - 1) * 0.25, 0, 1);
}
function ctxOf(s: GameState): VitCtx31 {
  const city = s.config.homeCity;
  return { s, year: s.year, city, a3: countryOfCity(city) ?? '', porte: porte31(s, city), mine: new Set(playerActs(s)) };
}
const live = (a?: Act): a is Act => !!a && !a.deceased && a.status !== 'retired' && a.status !== 'split';
/** Lançamentos das paradas (singles + álbuns), sem repetir. */
export function chartRels31(s: GameState, n = 20): Release[] {
  const out: Release[] = [];
  for (const e of [...s.charts.singles.slice(0, n), ...s.charts.albums.slice(0, n)]) { const r = s.releases[e.releaseId]; if (r && !out.includes(r)) out.push(r); }
  return out;
}
export const songOf31 = (s: GameState, r?: Release): string | undefined => r?.songs.find((x) => !!s.songs[x]);
const actName = (s: GameState, id?: string): string => (id ? s.acts[id]?.name : undefined) ?? '?';
const sortId = <T extends { id: string }>(xs: T[]): T[] => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
/** Atos da cidade sem contrato (revelações possíveis). */
// R31 (DBTAM, desempenho): dentro de um rollVit31 o mundo não muda (as ofertas não mexem em atos) — a lista por cidade sai
// uma vez por sorteio em vez de uma vez por tipo × vaga × lugar (varria todos os atos a cada pergunta)
let UH31: Map<string, Act[]> | null = null;
function unsignedHere(s: GameState, city: string): Act[] {
  const hit = UH31?.get(city);
  if (hit) return hit;
  const v = unsignedHere0(s, city);
  UH31?.set(city, v);
  return v;
}
function unsignedHere0(s: GameState, city: string): Act[] {
  return sortId(Object.values(s.acts).filter((a) => live(a) && a.city === city && !a.owner && !a.playerBand && a.fame < 40)).sort((a, b) => b.potential - a.potential).slice(0, 8);
}
/** Músicos que fazem bico nos lugares (gente31). */
function bicos(s: GameState): string[] {
  const j = peekGente31(s)?.j ?? {};
  return Object.keys(j).sort().map((k) => j[k]).filter((x) => x.bico && s.persons[x.p]?.alive).map((x) => x.p);
}
/** Selos rivais ativos com chefe (ficha `l:`). */
function rivals(s: GameState): { id: string; key: string; name: string; city: string }[] {
  return Object.values(s.labels).filter((lb) => lb.active && lb.founded <= s.year).map((lb) => ({ id: lb.id, key: (lb as { leaderId?: string }).leaderId ? `l:${(lb as { leaderId?: string }).leaderId}` : '', name: lb.name, city: lb.city }))
    .filter((x) => x.key).sort((a, b) => (a.id < b.id ? -1 : 1));
}
/** Equipamento de estúdio/sintetizador (lojas e estúdio). */
const gearDefs = (y: number, fams: string[]): ItemDef31[] => ITEMS31.filter((d) => d.cat === 'instr' && available31(d, y) && !!d.fam && fams.includes(d.fam));
/** Disco de época para a caixa de saldos / feira. */
const discDefs = (y: number): ItemDef31[] => ITEMS31.filter((d) => d.cat === 'disc' && available31(d, y));
const vitShop = (s: GameState, what: string) => `shop:${s.config.homeCity}:${what}`;

// ---------------------------------------------------------------- catálogo

export type VitRun31 =
  | { k: 'buy'; offer: string; how: 'me' | 'co' }
  | { k: 'bm'; row: string }
  | { k: 'radar'; act: string }
  | { k: 'meet'; key: string }
  | { k: 'place'; pk: PlaceK27; act: string }
  | { k: 'bid'; relic: string; amount: number }
  | { k: 'crime'; cid: string; target: string }
  | { k: 'denounce'; org: string }
  // só interface (a tela traduz para a função que já existe)
  | { k: 'listen'; song: string }
  | { k: 'go'; area: string; tab?: [string, string] }
  | { k: 'ficha'; key: string }
  | { k: 'person'; pid: string }
  | { k: 'quick'; act: string }
  | { k: 'enter'; place: VitPlace31 };
export interface VitBtn31 { label: L; run: VitRun31; lock?: L | null; main?: boolean }
export interface VitView31 { name: L; note: L; btns: VitBtn31[] }

export interface VitDef31 {
  id: string; p: VitPlace31; art: VitArt31; src: VitSrc31;
  /** peso no sorteio; o raro pesa menos em lugar pequeno */ w: number;
  /** duração em meses [mín, máx]; o raro dura 1 */ dur: [number, number];
  rare?: boolean; from?: number; to?: number; /** países (a3) onde existe */ a3?: string[]; minPorte?: number;
  /** cria oferta/preço (regra econômica: só com `vit31`) */ econ?: boolean;
  /** candidatos (lidos do estado, ordem fixa) */ cands: (c: VitCtx31) => VitRef31[];
  /** cria o que precisar no motor (oferta no registro de objetos); null = desiste */ make?: (c: VitCtx31, r: Rng, ref: VitRef31) => VitRef31 | null;
  /** o item ainda vale (oferta não vendida, pessoa viva…) */ ok?: (s: GameState, it: VitItem31) => boolean;
  view: (s: GameState, it: VitItem31) => VitView31;
}

const refKey = (r: VitRef31): string => JSON.stringify([r.rel, r.act, r.pid, r.key, r.relic, r.row, r.org, r.lb, r.g]);
const cashLock = (s: GameState, price: number): L | null => (s.player.cash < price ? l('Caixa insuficiente.', 'Not enough cash.') : null);

/** Botões de compra de uma oferta da loja (as mesmas formas da loja; presente fica na tela da loja). */
function buyBtns(s: GameState, offer: string): VitBtn31[] {
  const row = offerRow31(s, offer);
  if (!row) return [];
  return [
    { label: l('Ficar comigo (pessoal)', 'Keep it (personal)'), run: { k: 'buy', offer, how: 'me' }, main: true },
    { label: l('Para a empresa', 'For the company'), run: { k: 'buy', offer, how: 'co' }, lock: cashLock(s, row.price) },
    { label: l('Dar de presente (loja)', 'Give as a gift (shop)'), run: { k: 'enter', place: 'instruments' } },
  ];
}
const offerOk = (s: GameState, it: VitItem31): boolean => !!it.ref.offer && !!offerRow31(s, it.ref.offer);
const actOk = (s: GameState, it: VitItem31): boolean => live(it.ref.act ? s.acts[it.ref.act] : undefined);
const pidOk = (s: GameState, it: VitItem31): boolean => !!it.ref.pid && !!s.persons[it.ref.pid]?.alive;
const listenBtn = (s: GameState, rel?: Release): VitBtn31 | null => { const so = songOf31(s, rel); return so ? { label: fmtL(l('Ouvir "{t}"', 'Hear "{t}"'), { t: s.songs[so].title }), run: { k: 'listen', song: so } } : null; };
const radarBtn = (s: GameState, act: string): VitBtn31 => {
  const a = s.acts[act];
  return { label: l('Pôr no radar', 'Put on the radar'), run: { k: 'radar', act }, lock: !a ? l('Artista desconhecido.', 'Unknown act.') : a.owner === 'player' ? l('Esse artista já é seu.', 'That act is already yours.') : s.knowledge[act] ? l('Já está no seu radar.', 'Already on your radar.') : null, main: true };
};
const quickBtn = (s: GameState, act: string, label = l('Ações rápidas (propor contrato…)', 'Quick actions (offer a contract…)')): VitBtn31 => ({ label, run: { k: 'quick', act } });
const meetBtn = (key: string): VitBtn31 => ({ label: l('Conhecer', 'Meet'), run: { k: 'meet', key }, main: true });
const placeBtn = (s: GameState, pk: PlaceK27, act: string): VitBtn31 | null => {
  const a = placeActs27(s, { k: pk, id: `vit31:${pk}`, src: 'nb' }).find((x) => x.id === act);
  return a ? { label: a.label, run: { k: 'place', pk, act }, lock: a.dis ?? null, main: true } : null;
};
const L0 = l('', '');
const prevOwner = (name: string, y0: number, y1: number): [string, number, number] => [name, y0, y1];

/** Oferta nova no registro da loja (holder `shop:<cidade>:<what>`). */
function mkOffer(c: VitCtx31, r: Rng, what: string, defId: string, o: { prev?: [string, number, number][]; ev?: [number, L][]; mul: number; used?: boolean }): string | null {
  const d = itemDef31(defId);
  if (!d) return null;
  const used = o.used ?? true;
  const made = used ? Math.max(d.from, c.year - r.int(2, Math.max(2, Math.min(40, c.year - d.from)))) : c.year;
  return stockOne31(c.s, vitShop(c.s, what), d.id, { made, cond: used ? r.int(1, 3) : 0, prev: o.prev, ev: o.ev, mul: o.mul, origin: used ? 'used' : 'factory' });
}

export const VIT_DEFS31: VitDef31[] = [
  // ============ LOJA DE DISCOS
  { id: 'rec_new', p: 'records', art: 'disc', src: 'world', w: 6, dur: [1, 2],
    cands: (c) => chartRels31(c.s, 10).filter((r) => c.s.week - r.week < 26).map((r) => ({ rel: r.id, act: r.actId })),
    ok: (s, it) => !!it.ref.rel && !!s.releases[it.ref.rel],
    view: (s, it) => { const r = s.releases[it.ref.rel!]; const mine = r?.owner === 'player';
      return { name: fmtL(l('Lançamento: "{t}"', 'New release: "{t}"'), { t: r?.title ?? '?' }), note: fmtL(mine ? l('{a} — seu disco no expositor de lançamentos, tirado das paradas.', '{a} — your record on the new-releases rack, straight from the charts.') : l('{a} — direto das paradas para o expositor.', '{a} — straight from the charts to the rack.'), { a: actName(s, r?.actId) }),
        btns: [listenBtn(s, r), mine ? placeBtn(s, 'records', 'instore') : radarBtn(s, r?.actId ?? ''), r ? quickBtn(s, r.actId, l('Ficha do artista', 'Act card')) : null].filter((b): b is VitBtn31 => !!b) }; } },
  { id: 'rec_genre', p: 'records', art: 'crate', src: 'world', w: 3, dur: [1, 2],
    cands: (c) => { const m = new Map<string, number>(); for (const r of chartRels31(c.s, 20)) { const g = c.s.acts[r.actId]?.genre; if (g) m.set(g, (m.get(g) ?? 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([g]) => ({ g })); },
    view: (s, it) => ({ name: fmtL(l('Moda do mês: {g}', 'Craze of the month: {g}'), { g: it.ref.g!.replace(/_/g, ' ') }), note: l('A loja abriu uma caixa só para o gênero que está nas paradas.', 'The shop opened a crate just for the genre in the charts.'),
      btns: [{ label: l('Descobrir talentos', 'Discover talent'), run: { k: 'go', area: 'market' }, main: true }] }) },
  { id: 'rec_bargain', p: 'records', art: 'crate', src: 'rare', w: 1.4, dur: [1, 1], rare: true, econ: true,
    cands: (c) => discDefs(c.year).map((d) => ({ g: d.id })),
    make: (c, r, ref) => { const of = mkOffer(c, r, 'disc', ref.g!, { mul: r.float(0.3, 0.6), ev: [[c.year, l('Achado na caixa de saldos', 'Found in the bargain bin')]] }); return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: fmtL(l('Caixa de saldos: {n}', 'Bargain bin: {n}'), { n: row?.def?.name ?? l('disco', 'record') }),
      note: l('Preço de saldo; com a história certa pode virar relíquia. Some no mês que vem.', 'Bargain price; with the right history it can become a relic. Gone next month.'), btns: buyBtns(s, it.ref.offer!) }; } },
  { id: 'rec_gone', p: 'records', art: 'disc', src: 'world', w: 4, dur: [1, 3],
    cands: (c) => { const out: VitRef31[] = []; for (const a of sortId(Object.values(c.s.acts))) { if (!a.releases.length || a.fame < 25) continue; const dead = a.members.map((m) => c.s.persons[m]).find((p) => p && !p.alive && (p.died ?? 0) >= c.year - 1); if (dead) out.push({ act: a.id, pid: dead.id, rel: a.releases[a.releases.length - 1] }); } return out.slice(0, 6); },
    view: (s, it) => ({ name: fmtL(l('Esgotado: discos de {a}', 'Sold out: {a} records'), { a: actName(s, it.ref.act) }), note: fmtL(l('Desde a morte de {p}, os discos sumiram das prateleiras e o usado encareceu.', 'Since {p} died, the records vanished from the shelves and used copies got dearer.'), { p: s.persons[it.ref.pid!]?.name ?? '?' }),
      btns: [listenBtn(s, s.releases[it.ref.rel ?? '']), { label: l('Troféus e relíquias', 'Trophies and relics'), run: { k: 'go', area: 'lendas' } }].filter((b): b is VitBtn31 => !!b) }) },
  { id: 'rec_fan', p: 'records', art: 'person', src: 'people', w: 4, dur: [1, 1],
    cands: (c) => { const acts = [...c.mine].map((id) => c.s.acts[id]).filter(live).filter((a) => a.fame >= 5); if (!acts.length) return []; const ps = bicos(c.s); return ps.slice(0, 6).map((pid, i) => ({ pid, act: acts[i % acts.length].id, key: `p:${pid}` })); },
    ok: (s, it) => pidOk(s, it) && actOk(s, it),
    view: (s, it) => { const a = s.acts[it.ref.act!]; const p = s.persons[it.ref.pid!]; const hot = (a?.momentum ?? 0) >= 50;
      return { name: fmtL(l('{p} comenta {a}', '{p} talks about {a}'), { p: p?.name ?? '?', a: a?.name ?? '?' }), note: hot ? l('"Não sai da minha vitrola." O boca a boca está a seu favor.', '"It never leaves my turntable." Word of mouth is on your side.') : l('"Já foram melhores." O boca a boca esfriou.', '"They used to be better." Word of mouth has cooled.'),
        btns: [meetBtn(it.ref.key!), quickBtn(s, it.ref.act!, l('Ações do artista', 'Act actions'))] }; } },
  // ============ LOJA DE INSTRUMENTOS
  { id: 'ins_story', p: 'instruments', art: 'guitar', src: 'rare', w: 1.2, dur: [1, 1], rare: true, econ: true, from: 1900,
    cands: (c) => { const out: VitRef31[] = []; for (const a of sortId(Object.values(c.s.acts)).filter((x) => x.fame >= 55)) for (const m of a.members) { const p = c.s.persons[m]; if (p && p.role !== 'vocal' && p.role !== 'mc') out.push({ pid: p.id, act: a.id }); } return out.slice(0, 10); },
    make: (c, r, ref) => { const p = c.s.persons[ref.pid!]; const fam = p?.role === 'drums' ? 'drums' : p?.role === 'bass' ? 'bass' : p?.role === 'keys' ? 'keys' : p?.role === 'horns' ? 'horns' : 'guitar';
      const ds = gearDefs(c.year, [fam]); if (!p || !ds.length) return null; const d = r.pick(ds);
      const of = mkOffer(c, r, 'gear', d.id, { mul: r.float(1.6, 2.4), prev: [prevOwner(p.name, Math.max(d.from, c.year - r.int(3, 12)), c.year)], ev: [[c.year - 1, fmtL(l('Tocado nos shows de {a}', 'Played at {a} shows'), { a: actName(c.s, ref.act) })]] });
      return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: fmtL(l('{n} — era de {p}', '{n} — once {p}\'s'), { n: row?.def?.name ?? l('Instrumento', 'Instrument'), p: s.persons[it.ref.pid!]?.name ?? '?' }), note: l('Usado com história: a procedência pesa no preço e pode virar relíquia. Raro: some no mês que vem.', 'Used with a history: provenance weighs on the price and it can become a relic. Rare: gone next month.'), btns: buyBtns(s, it.ref.offer!) }; } },
  { id: 'ins_broke', p: 'instruments', art: 'amp', src: 'people', w: 2.5, dur: [1, 2], econ: true,
    cands: (c) => bicos(c.s).slice(0, 6).map((pid) => ({ pid, key: `p:${pid}` })),
    make: (c, r, ref) => { const p = c.s.persons[ref.pid!]; const ds = gearDefs(c.year, ['guitar', 'bass', 'drums', 'keys', 'horns', 'mic']); if (!p || !ds.length) return null; const d = r.pick(ds);
      const of = mkOffer(c, r, 'gear', d.id, { mul: r.float(0.6, 0.8), prev: [prevOwner(p.name, Math.max(d.from, c.year - r.int(2, 9)), c.year)], ev: [[c.year, l('Deixado em consignação para pagar as contas', 'Left on consignment to pay the bills')]] });
      return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); const p = s.persons[it.ref.pid!]; return { name: fmtL(l('Consignado: {n}', 'Consigned: {n}'), { n: row?.def?.name ?? l('instrumento', 'instrument') }),
      note: fmtL(l('{p} está sem dinheiro e deixou o instrumento aqui. Vale conhecer: quem toca na noite pode ser uma revelação.', '{p} is broke and left the instrument here. Worth meeting: whoever plays at night may be a find.'), { p: p?.name ?? '?' }),
      btns: [...buyBtns(s, it.ref.offer!), meetBtn(it.ref.key!)] }; } },
  { id: 'ins_tech', p: 'instruments', art: 'keys', src: 'world', w: 3, dur: [1, 3], econ: true,
    cands: (c) => ITEMS31.filter((d) => d.cat === 'instr' && d.from <= c.year && d.from >= c.year - 4).map((d) => ({ g: d.id })),
    make: (c, r, ref) => { const of = mkOffer(c, r, 'gear', ref.g!, { mul: 1.15, used: false, ev: [[c.year, l('Lançamento da época', 'New for the era')]] }); return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: fmtL(l('Novidade: {n}', 'New: {n}'), { n: row?.def?.name ?? l('instrumento', 'instrument') }), note: row?.def?.desc ?? L0, btns: buyBtns(s, it.ref.offer!) }; } },
  { id: 'ins_bankrupt', p: 'instruments', art: 'gear', src: 'world', w: 3, dur: [1, 2], econ: true,
    cands: (c) => sortId(Object.values(c.s.labels).filter((lb) => !lb.active && (lb.closedYear ?? 0) >= c.year - 1)).map((lb) => ({ lb: lb.id })),
    make: (c, r, ref) => { const ds = gearDefs(c.year, ['studio', 'mic', 'keys']); const lb = c.s.labels[ref.lb!]; if (!ds.length || !lb) return null; const d = r.pick(ds);
      const of = mkOffer(c, r, 'gear', d.id, { mul: r.float(0.45, 0.65), prev: [prevOwner(lb.name, Math.max(d.from, lb.founded), lb.closedYear ?? c.year)], ev: [[lb.closedYear ?? c.year, l('Leiloado na falência do selo', 'Sold off in the label\'s bankruptcy')]] });
      return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: fmtL(l('Massa falida: {n}', 'Bankruptcy lot: {n}'), { n: row?.def?.name ?? l('equipamento', 'gear') }), note: fmtL(l('Equipamento do estúdio de {b}, que fechou. Barato enquanto dura.', 'Studio gear from {b}, which closed. Cheap while it lasts.'), { b: s.labels[it.ref.lb!]?.name ?? '?' }), btns: buyBtns(s, it.ref.offer!) }; } },
  // ============ CASA DE SHOWS
  { id: 'ven_bill', p: 'venue', art: 'poster', src: 'world', w: 5, dur: [1, 1],
    cands: (c) => { const ids = new Set<string>(); for (const w of playingThisWeek31(c.s)) ids.add(w.actId); for (const t of c.s.tours ?? []) if ((t.status === 'running' || t.status === 'planned') && tourCity31(c.s, t.actId) === c.city) ids.add(t.actId);
      const xs = [...ids].map((id) => c.s.acts[id]).filter(live); if (!xs.length) xs.push(...sortId(Object.values(c.s.acts).filter((a) => live(a) && a.city === c.city && a.status === 'active')).sort((a, b) => b.fame - a.fame).slice(0, 3)); return xs.map((a) => ({ act: a.id })); },
    ok: actOk,
    view: (s, it) => { const a = s.acts[it.ref.act!]; return { name: fmtL(l('Cartaz do mês: {a}', 'Poster of the month: {a}'), { a: a?.name ?? '?' }), note: a?.owner === 'player' ? l('Seu artista é a atração da casa este mês.', 'Your act is the house\'s headliner this month.') : fmtL(l('A atração da casa ({g}).', 'The house\'s headliner ({g}).'), { g: (a?.genre ?? '').replace(/_/g, ' ') }),
      btns: [placeBtn(s, 'venue', 'show'), quickBtn(s, it.ref.act!, l('Ficha do artista', 'Act card'))].filter((b): b is VitBtn31 => !!b) }; } },
  { id: 'ven_opener', p: 'venue', art: 'person', src: 'rare', w: 1.6, dur: [1, 1], rare: true,
    cands: (c) => unsignedHere(c.s, c.city).filter((a) => a.potential >= 60 && !c.s.knowledge[a.id]).map((a) => ({ act: a.id, pid: a.members[0] })),
    ok: actOk,
    view: (s, it) => { const a = s.acts[it.ref.act!]; return { name: fmtL(l('Abrindo a noite: {a}', 'Opening the night: {a}'), { a: a?.name ?? '?' }), note: l('Um desconhecido sem contrato abriu a noite e a plateia não arredou o pé. Possível revelação — só neste mês.', 'An unsigned unknown opened the night and the crowd stayed put. A possible find — this month only.'),
      btns: [radarBtn(s, it.ref.act!), quickBtn(s, it.ref.act!)] }; } },
  { id: 'ven_scout', p: 'venue', art: 'person', src: 'people', w: 2.5, dur: [1, 1],
    cands: (c) => rivals(c.s).filter((r) => r.city === c.city || c.porte >= 0.5).slice(0, 6).map((r) => ({ key: r.key, lb: r.id })),
    view: (s, it) => { const lb = s.labels[it.ref.lb!]; const target = unsignedHere(s, s.config.homeCity)[0];
      return { name: fmtL(l('Olheiro de {b} na plateia', '{b} scout in the crowd'), { b: lb?.name ?? '?' }), note: target ? fmtL(l('Está de olho em {a}. Se você não se mexer, ele assina primeiro.', 'Has an eye on {a}. If you don\'t move, they sign first.'), { a: target.name }) : l('Anotando tudo num caderninho.', 'Taking notes in a little book.'),
        btns: [meetBtn(it.ref.key!), { label: l('Ficha do chefe', 'The boss\'s card'), run: { k: 'ficha', key: it.ref.key! } }, ...(target ? [radarBtn(s, target.id)] : [])] }; } },
  // ============ BAR
  { id: 'bar_bico', p: 'bar', art: 'person', src: 'people', w: 3, dur: [1, 1],
    cands: (c) => bicos(c.s).slice(0, 8).map((pid) => ({ pid, key: `p:${pid}` })), ok: pidOk,
    view: (s, it) => { const p = s.persons[it.ref.pid!]; return { name: fmtL(l('No balcão: {p}', 'At the bar: {p}'), { p: p?.name ?? '?' }), note: l('Trabalha de dia e toca de noite. Contratar tira da vaga (quem assina larga o bico).', 'Works by day and plays by night. Signing them frees the job (whoever signs quits the day job).'),
      btns: [meetBtn(it.ref.key!), { label: l('Ver a ficha', 'See the card'), run: { k: 'person', pid: it.ref.pid! } }] }; } },
  { id: 'bar_press', p: 'bar', art: 'person', src: 'people', w: 2, dur: [1, 1], from: 1900,
    cands: (c) => activeCritics(c.s).map((x) => x.name).sort().slice(0, 8).map((n) => ({ key: `c:${n}` })),
    view: (s, it) => ({ name: fmtL(l('No balcão: {n}, jornalista', 'At the bar: {n}, journalist'), { n: it.ref.key!.slice(2) }), note: l('Crítico de folga. Conhecer agora pesa nas próximas resenhas (pela opinião).', 'A critic off duty. Meeting now weighs on the next reviews (through opinion).'),
      btns: [meetBtn(it.ref.key!), { label: l('Ficha', 'Card'), run: { k: 'ficha', key: it.ref.key! } }] }) },
  { id: 'bar_mgr', p: 'bar', art: 'person', src: 'people', w: 1.6, dur: [1, 1],
    cands: (c) => REAL_MGRS.filter((m) => mgrActive(c.s, m)).map((m) => ({ key: `e:${m.id}` })).slice(0, 6),
    view: (s, it) => ({ name: fmtL(l('No balcão: {n}, empresário', 'At the bar: {n}, manager'), { n: nameOfKey18(s, it.ref.key!) }), note: l('Procura artista novo para empresariar.', 'Looking for a new act to manage.'),
      btns: [meetBtn(it.ref.key!), { label: l('Ficha', 'Card'), run: { k: 'ficha', key: it.ref.key! } }] }) },
  { id: 'bar_juke', p: 'bar', art: 'disc', src: 'world', w: 3, dur: [1, 1], from: 1925,
    cands: (c) => chartRels31(c.s, 5).slice(0, 4).map((r) => ({ rel: r.id, act: r.actId })),
    view: (s, it) => { const r = s.releases[it.ref.rel!]; return { name: fmtL(l('Na jukebox: "{t}"', 'On the jukebox: "{t}"'), { t: r?.title ?? '?' }), note: fmtL(l('{a} — o que mais toca na cidade agora.', '{a} — what plays most in town now.'), { a: actName(s, r?.actId) }), btns: [listenBtn(s, r)].filter((b): b is VitBtn31 => !!b) }; } },
  { id: 'bar_rumor', p: 'bar', art: 'note', src: 'world', w: 3, dur: [1, 1],
    cands: (c) => ((c.s.x4 as unknown as { facts17?: { f?: { visibility: string; w: number; text?: L }[] } }).facts17?.f ?? []).filter((f) => f.visibility === 'rumor' && c.s.week - f.w <= 8).slice(-5).map((f) => ({ g: `${f.w}:${hashString(JSON.stringify(f.text ?? ''))}` })),
    view: (s, it) => { const fs = ((s.x4 as unknown as { facts17?: { f?: { visibility: string; w: number; text: L }[] } }).facts17?.f ?? []).filter((f) => f.visibility === 'rumor');
      const [w, hh] = it.ref.g!.split(':').map(Number); const f = fs.find((x) => x.w === w && hashString(JSON.stringify(x.text ?? '')) === hh);
      return { name: l('Boato do dia', 'Rumour of the day'), note: f ? f.text : l('Ninguém confirma nada.', 'Nobody confirms anything.'), btns: [{ label: l('Notícias', 'News'), run: { k: 'go', area: 'news17' } }] }; } },
  // ============ ESTÚDIO
  { id: 'stu_who', p: 'studio', art: 'person', src: 'world', w: 4, dur: [1, 1],
    cands: (c) => (c.s.sessions ?? []).filter((x) => !x.done && !c.mine.has(x.actId)).map((x) => ({ act: x.actId })).slice(0, 6),
    ok: actOk,
    view: (s, it) => ({ name: fmtL(l('Gravando: {a}', 'Recording: {a}'), { a: actName(s, it.ref.act) }), note: l('A sala está ocupada; dá para espiar o que eles estão fazendo.', 'The room is booked; you can peek at what they\'re doing.'), btns: [radarBtn(s, it.ref.act!), quickBtn(s, it.ref.act!, l('Ficha do artista', 'Act card'))] }) },
  { id: 'stu_gear', p: 'studio', art: 'gear', src: 'world', w: 2, dur: [1, 2], econ: true, from: 1930,
    cands: (c) => gearDefs(c.year, ['studio', 'mic']).map((d) => ({ g: d.id })),
    make: (c, r, ref) => { const of = mkOffer(c, r, 'gear', ref.g!, { mul: r.float(0.7, 0.9), ev: [[c.year, l('Saiu do estúdio do bairro na troca de equipamento', 'Left the local studio in a gear upgrade')]] }); return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: fmtL(l('À venda no estúdio: {n}', 'For sale at the studio: {n}'), { n: row?.def?.name ?? l('equipamento', 'gear') }), note: l('O estúdio trocou de equipamento e vende o antigo.', 'The studio upgraded and is selling the old gear.'), btns: buyBtns(s, it.ref.offer!) }; } },
  { id: 'stu_slot', p: 'studio', art: 'note', src: 'world', w: 2, dur: [1, 1],
    cands: () => [{ g: 'slot' }],
    view: (s) => ({ name: l('Horário vago', 'Free slot'), note: l('Uma sessão desmarcada deixou a sala livre este mês.', 'A cancelled session left the room free this month.'), btns: [placeBtn(s, 'studio', 'rent')].filter((b): b is VitBtn31 => !!b) }) },
  // ============ RÁDIO
  { id: 'rad_onair', p: 'radio', art: 'disc', src: 'world', w: 4, dur: [1, 1], from: 1922,
    cands: (c) => chartRels31(c.s, 6).slice(0, 4).map((r) => ({ rel: r.id, act: r.actId })),
    view: (s, it) => { const r = s.releases[it.ref.rel!]; return { name: fmtL(l('No ar: "{t}"', 'On air: "{t}"'), { t: r?.title ?? '?' }), note: fmtL(l('{a}{m}', '{a}{m}'), { a: actName(s, r?.actId), m: r?.owner === 'player' ? l(' — é seu!', ' — it\'s yours!') : L0 }), btns: [listenBtn(s, r)].filter((b): b is VitBtn31 => !!b) }; } },
  { id: 'rad_request', p: 'radio', art: 'note', src: 'people', w: 3, dur: [1, 1], from: 1922,
    cands: (c) => [...c.mine].map((id) => c.s.acts[id]).filter(live).filter((a) => a.fans.core + a.fans.active > 0).map((a) => ({ act: a.id })),
    ok: actOk,
    view: (s, it) => ({ name: fmtL(l('Pedido de ouvinte: {a}', 'Listener request: {a}'), { a: actName(s, it.ref.act) }), note: l('Cartas pedindo o seu artista. Hora de levar o disco ao diretor.', 'Letters asking for your act. Time to take the record to the director.'), btns: [placeBtn(s, 'radio', 'pitch')].filter((b): b is VitBtn31 => !!b) }) },
  { id: 'rad_interview', p: 'radio', art: 'mic', src: 'world', w: 2, dur: [1, 1], from: 1925,
    cands: () => [{ g: 'iv' }],
    view: (s) => ({ name: l('Vaga de entrevista', 'Interview slot'), note: l('O programa da tarde tem uma vaga para entrevista este mês.', 'The afternoon show has an interview slot this month.'), btns: [placeBtn(s, 'press', 'interview')].filter((b): b is VitBtn31 => !!b) }) },
  // ============ HOTEL
  { id: 'hot_guest', p: 'hotel', art: 'person', src: 'world', w: 4, dur: [1, 1],
    cands: (c) => (c.s.tours ?? []).filter((t) => t.status === 'running' && tourCity31(c.s, t.actId) === c.city).map((t) => ({ act: t.actId })),
    ok: actOk,
    view: (s, it) => ({ name: fmtL(l('Hóspede: {a} (em turnê)', 'Guest: {a} (on tour)'), { a: actName(s, it.ref.act) }), note: l('Chegaram para tocar na cidade e estão no hotel.', 'They came to play in town and are staying here.'), btns: [quickBtn(s, it.ref.act!, l('Ficha do artista', 'Act card')), radarBtn(s, it.ref.act!)] }) },
  { id: 'hot_exec', p: 'hotel', art: 'person', src: 'people', w: 2, dur: [1, 1],
    cands: (c) => rivals(c.s).filter((r) => r.city !== c.city).slice(0, 8).map((r) => ({ key: r.key, lb: r.id })),
    view: (s, it) => ({ name: fmtL(l('Hóspede: executivo de {b}', 'Guest: {b} executive'), { b: s.labels[it.ref.lb!]?.name ?? '?' }), note: l('De passagem pela cidade, procurando parceiros e talentos.', 'Passing through town, looking for partners and talent.'), btns: [meetBtn(it.ref.key!), { label: l('Ficha', 'Card'), run: { k: 'ficha', key: it.ref.key! } }] }) },
  { id: 'hot_note', p: 'hotel', art: 'note', src: 'world', w: 2, dur: [1, 1],
    cands: (c) => ((c.s.decisions?.length ?? 0) > 0 ? [{ g: 'note' }] : []),
    view: (s) => ({ name: l('Recado na recepção', 'Message at reception'), note: fmtL(l('{n} decisão(ões) esperando por você.', '{n} decision(s) waiting for you.'), { n: s.decisions?.length ?? 0 }), btns: [{ label: l('Atender os recados', 'Take the messages'), run: { k: 'go', area: 'inbox' }, main: true }] }) },
  // ============ GRAVADORA RIVAL
  { id: 'lab_wait', p: 'label', art: 'person', src: 'people', w: 3, dur: [1, 1],
    cands: (c) => unsignedHere(c.s, c.city).filter((a) => a.fame >= 5 || a.potential >= 55).map((a) => ({ act: a.id, pid: a.members[0] })),
    ok: actOk,
    view: (s, it) => ({ name: fmtL(l('Na sala de espera: {a}', 'In the waiting room: {a}'), { a: actName(s, it.ref.act) }), note: l('Esperando para assinar com o rival. Ainda dá tempo de fazer a sua proposta.', 'Waiting to sign with the rival. There is still time to make your offer.'), btns: [quickBtn(s, it.ref.act!), radarBtn(s, it.ref.act!)] }) },
  { id: 'lab_contract', p: 'label', art: 'contract', src: 'rare', w: 1.2, dur: [1, 1], rare: true,
    cands: (c) => rivals(c.s).filter((r) => r.city === c.city).map((r) => ({ lb: r.id })),
    view: (s, it) => { const lb = s.labels[it.ref.lb!]; const o = crimeOdds(s, { actor: 'player', target: it.ref.lb!, partners: [] }, 'wiretap');
      return { name: fmtL(l('Contrato largado na mesa de {b}', 'Contract left on {b}\'s desk'), { b: lb?.name ?? '?' }), note: fmtL(l('Ler os planos deles é coisa do submundo: chance {p}%, risco de ser exposto {q}%.', 'Reading their plans is underworld business: {p}% chance, {q}% risk of exposure.'), { p: Math.round(o.p * 100), q: Math.round(o.q * 100) }),
        btns: [{ label: l('Grampear o escritório', 'Bug the office'), run: { k: 'crime', cid: 'wiretap', target: it.ref.lb! }, lock: o.block, main: true }] }; } },
  // ============ BECO (mercado negro)
  { id: 'bm_pirate', p: 'market', art: 'tape', src: 'world', w: 6, dur: [1, 2], econ: true, from: 1960,
    cands: (c) => { const orgs = underOrgs31(c.s).here; return chartRels31(c.s, 15).filter((r) => r.owner === 'player').slice(0, 2).map((r, i) => ({ rel: r.id, act: r.actId, org: orgs[i % Math.max(1, orgs.length)]?.id })); },
    ok: (s, it) => !!it.ref.rel && !!s.releases[it.ref.rel],
    view: (s, it) => { const r = s.releases[it.ref.rel!]; const o = it.ref.org ? underOrgs31(s).here.find((x) => x.id === it.ref.org) : undefined;
      return { name: fmtL(l('Fita pirata do SEU disco: "{t}"', 'Bootleg of YOUR record: "{t}"'), { t: r?.title ?? '?' }), note: o ? fmtL(l('Cada mês no beco é venda perdida. Pista: quem fabrica é gente de {o}.', 'Every month in the alley is a lost sale. Clue: {o} people make them.'), { o: o.name }) : l('Cada mês no beco é venda perdida. Ninguém diz de onde vem.', 'Every month in the alley is a lost sale. Nobody says where it comes from.'),
        btns: o ? [{ label: fmtL(l('Denunciar {o}', 'Report {o}'), { o: o.name }), run: { k: 'denounce', org: o.id }, main: true }] : [{ label: l('Submundo', 'Underworld'), run: { k: 'go', area: 'crime' } }] }; } },
  // ============ FEIRA / SEBO / BRECHÓ (lugar da época, dentro da loja de discos)
  { id: 'fair_disc', p: 'fair', art: 'crate', src: 'rare', w: 3, dur: [1, 1], econ: true,
    cands: (c) => discDefs(c.year).map((d) => ({ g: d.id })),
    make: (c, r, ref) => { const of = mkOffer(c, r, 'fair', ref.g!, { mul: r.float(0.5, 1.4), ev: [[c.year, fairName31(c.year)]] }); return of ? { ...ref, offer: of } : null; },
    ok: offerOk,
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: row?.def?.name ?? l('Disco', 'Record'), note: fmtL(l('Garimpo da {f}. Preço de feira: pode ser achado, pode ser cilada.', 'A find at the {f}. Fair price: could be a gem, could be a trap.'), { f: fairName31(s.year) }), btns: buyBtns(s, it.ref.offer!) }; } },
  { id: 'fair_demo', p: 'fair', art: 'tape', src: 'people', w: 3, dur: [1, 1],
    cands: (c) => unsignedHere(c.s, c.city).filter((a) => !c.s.knowledge[a.id]).map((a) => ({ act: a.id, pid: a.members[0] })),
    ok: actOk,
    view: (s, it) => ({ name: fmtL(l('{f} à venda na banca: {a}', '{f} on sale at the stall: {a}'), { f: s.year < 1950 ? l('Gravação caseira', 'Home recording') : s.year < 1972 ? l('Compacto independente', 'Indie single') : s.year < 2000 ? l('Fita demo', 'Demo tape') : l('Disco independente', 'Indie record'), a: actName(s, it.ref.act) }),
      note: l('A banda vende o próprio disco na feira. Quem compra cedo descobre antes.', 'The band sells its own record at the fair. Early buyers discover first.'), btns: [radarBtn(s, it.ref.act!), quickBtn(s, it.ref.act!)] }) },
  { id: 'fair_old', p: 'fair', art: 'disc', src: 'world', w: 2, dur: [1, 1],
    cands: (c) => sortId(Object.values(c.s.releases)).filter((r) => r.peak <= 3 && c.year - Math.floor(r.week / 52) >= 0 && c.s.week - r.week > 520).slice(0, 8).map((r) => ({ rel: r.id, act: r.actId })),
    view: (s, it) => { const r = s.releases[it.ref.rel!]; return { name: fmtL(l('Clássico usado: "{t}"', 'Used classic: "{t}"'), { t: r?.title ?? '?' }), note: fmtL(l('{a} — sucesso de outros tempos voltando às bancas.', '{a} — a hit from other times back on the stalls.'), { a: actName(s, r?.actId) }), btns: [listenBtn(s, r)].filter((b): b is VitBtn31 => !!b) }; } },
  // ============ AEROPORTO
  { id: 'air_arrive', p: 'airport', art: 'person', src: 'world', w: 3, dur: [1, 1],
    cands: (c) => (c.s.tours ?? []).filter((t) => (t.status === 'running' || t.status === 'planned') && !c.mine.has(t.actId)).map((t) => ({ act: t.actId })).slice(0, 8),
    ok: actOk,
    view: (s, it) => { const a = s.acts[it.ref.act!]; return { name: fmtL(l('Desembarque: {a}', 'Arrivals: {a}'), { a: a?.name ?? '?' }), note: l('Em turnê, passando pelo saguão com a equipe.', 'On tour, passing through the hall with the crew.'), btns: [quickBtn(s, it.ref.act!, l('Ficha do artista', 'Act card')), radarBtn(s, it.ref.act!)] }; } },
  { id: 'air_exec', p: 'airport', art: 'person', src: 'people', w: 2, dur: [1, 1], from: 1930,
    cands: (c) => rivals(c.s).filter((r) => r.city !== c.city).slice(0, 8).map((r) => ({ key: r.key, lb: r.id })),
    view: (s, it) => ({ name: fmtL(l('Sala VIP: chefe de {b}', 'VIP lounge: {b} boss'), { b: s.labels[it.ref.lb!]?.name ?? '?' }), note: l('Esperando o voo. Dez minutos de conversa valem um almoço.', 'Waiting for the flight. Ten minutes of talk are worth a lunch.'), btns: [meetBtn(it.ref.key!), { label: l('Ficha', 'Card'), run: { k: 'ficha', key: it.ref.key! } }] }) },
];
export const vitDef31 = (id: string): VitDef31 | undefined => VIT_DEFS31.find((d) => d.id === id);

/** Nome da feira da época: 78 rpm antes de 1950, sebo de LPs, fitas nos anos 80, brechó de CDs, vinil redescoberto. */
export function fairName31(y: number): L {
  return y < 1950 ? l('feira de discos de 78 rotações', '78 rpm record fair') : y < 1975 ? l('sebo de discos', 'second-hand record shop') : y < 1995 ? l('feira de fitas e discos', 'tape and record fair')
    : y < 2010 ? l('brechó de CDs', 'CD thrift market') : l('feira de vinil', 'vinyl fair');
}

// ---------------------------------------------------------------- fontes migradas (lidas na hora, nunca copiadas)

/** Itens-espelho das fontes que já existiam: loja de instrumentos (items31), beco (under31), leilão (auction31). */
function mirror(s: GameState, p: VitPlace31): VitItem31[] {
  const ym = ymIdx31(s);
  const it = (c: string, ref: VitRef31, i: number): VitItem31 => ({ id: `m-${c}-${i}-${String(ref.offer ?? ref.row ?? ref.relic).replace(/[^a-zA-Z0-9]/g, '_')}`, c, p, at: ym, to: ym, ref });
  if (p === 'instruments') return shopRows31(s, s.config.homeCity).map((r, i) => it(r.relic ? 'ins_relic' : 'ins_stock', { offer: r.offer, relic: r.relic?.id }, i));
  if (p === 'market') return bmRows31(s).map((r, i) => it('bm_row', { row: r.id }, i));
  if (p === 'auction') {
    const se = openSessions31(s).filter((x) => x.w >= s.week).slice(0, 2);
    const out: VitItem31[] = [];
    for (const x of se) for (const rid of x.lots.slice(0, 2)) out.push(it('auc_lot', { relic: rid, g: x.id }, out.length));
    return out;
  }
  return [];
}
/** Definições dos espelhos (texto e ações). */
export const MIRROR31: Record<string, Omit<VitDef31, 'cands' | 'w' | 'dur' | 'src'> & { src: 'stock' }> = {
  ins_stock: { id: 'ins_stock', p: 'instruments', art: 'guitar', src: 'stock',
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: row?.def?.name ?? l('Instrumento', 'Instrument'), note: row?.x && row.x.made < s.year ? fmtL(l('Usado, de {y}. Estoque do mês da loja.', 'Used, from {y}. This month\'s shop stock.'), { y: row.x.made }) : l('Novo. Estoque do mês da loja.', 'New. This month\'s shop stock.'), btns: buyBtns(s, it.ref.offer!) }; } },
  ins_relic: { id: 'ins_relic', p: 'instruments', art: 'lot', src: 'stock',
    view: (s, it) => { const row = offerRow31(s, it.ref.offer!); return { name: row?.relic?.n ?? l('Relíquia', 'Relic'), note: l('Na vitrine por consignação de um colecionador.', 'In the showcase on consignment from a collector.'), btns: buyBtns(s, it.ref.offer!) }; } },
  bm_row: { id: 'bm_row', p: 'market', art: 'crate', src: 'stock',
    view: (s, it) => { const row = bmRows31(s).find((x) => x.id === it.ref.row); return { name: row?.name ?? l('Mercadoria', 'Goods'), note: row ? fmtL(l('{n} Risco de apreensão: {p}%.', '{n} Seizure risk: {p}%.'), { n: row.note, p: Math.round(row.risk * 100) }) : L0,
      btns: row ? [{ label: l('Comprar', 'Buy'), run: { k: 'bm', row: row.id }, lock: bmLock31(s, row), main: true }] : [] }; } },
  auc_lot: { id: 'auc_lot', p: 'auction', art: 'lot', src: 'stock',
    view: (s, it) => { const rl = relics(s).list.find((x) => x.id === it.ref.relic); if (!rl) return { name: l('Lote', 'Lot'), note: L0, btns: [] };
      const ld = ladder31(s, it.ref.g!, rl); const amt = Math.max(ld.price + ld.inc, rl.bid ?? 0);
      return { name: fmtL(l('Lote do mês: {n}', 'Lot of the month: {n}'), { n: rl.n }), note: fmtL(l('Lance inicial {v}. Pregão em {w} semana(s).', 'Opening bid {v}. Sale in {w} week(s).'), { v: usd(ld.open), w: Math.max(0, (openSessions31(s).find((x) => x.id === it.ref.g)?.w ?? s.week) - s.week) }),
        btns: [{ label: l('Deixar um lance', 'Leave a bid'), run: { k: 'bid', relic: rl.id, amount: amt }, lock: bidLock31(s, amt), main: true }, { label: l('Casa de leilões', 'Auction house'), run: { k: 'go', area: 'auction31' } }] }; } },
};
void relicPrice; void notify;
const defOrMirror = (c: string) => vitDef31(c) ?? (MIRROR31[c] as unknown as VitDef31 | undefined);

// ---------------------------------------------------------------- sorteio (motor)

/** Lugares de vitrine por lugar da cidade (a feira entra pela loja de discos). */
export const VIT_OF_KIND31: Partial<Record<string, VitPlace31[]>> = { records: ['records', 'fair'], instruments: ['instruments'], venue: ['venue'], bar: ['bar'], studio: ['studio'], radio: ['radio'], hotel: ['hotel'], label: ['label'], market: ['market'] };

const okEra = (d: VitDef31, c: VitCtx31): boolean => (!d.from || c.year >= d.from) && (!d.to || c.year <= d.to) && (!d.a3 || d.a3.includes(c.a3)) && (d.minPorte === undefined || c.porte >= d.minPorte);

/** Sorteia o conteúdo do mês `target` (índice). Só o motor chama (virada do mês, nova partida, editor). */
export function rollVit31(s: GameState, target: number): { added: number; dropped: number } {
  UH31 = new Map();
  try { return rollVit31b(s, target); } finally { UH31 = null; }
}
function rollVit31b(s: GameState, target: number): { added: number; dropped: number } {
  const st = vit31(s);
  const r = rng19(s, 'vit31');
  const c = ctxOf(s);
  const keep: VitItem31[] = [];
  let dropped = 0;
  for (const it of st.items) {
    const d = vitDef31(it.c);
    if (d && it.to >= target && (!d.ok || d.ok(s, it))) { keep.push(it); continue; }
    dropped++;
    if (it.mk && it.ref.offer) unstock31(s, it.ref.offer);
  }
  st.items = keep;
  let added = 0;
  const econ = vitOn31(s);
  for (const p of VIT_PLACES31) {
    const n = VIT31.slots + Math.round(c.porte * 2) - keep.filter((x) => x.p === p).length;
    const used = new Set(keep.filter((x) => x.p === p).map((x) => refKey(x.ref)));
    const defs = VIT_DEFS31.filter((d) => d.p === p && okEra(d, c) && (!d.econ || econ));
    for (let i = 0; i < n; i++) {
      const opts: [VitDef31, VitRef31[], number][] = [];
      for (const d of defs) {
        const cs = d.cands(c).filter((x) => !used.has(refKey(x)));
        // variedade: cada repetição do mesmo tipo no lugar pesa 1/3; no máximo 2 do mesmo tipo
        const twice = st.items.filter((x) => x.p === p && x.c === d.id).length;
        if (cs.length && twice < 2) opts.push([d, cs, (d.rare ? d.w * (0.3 + 0.7 * c.porte) : d.w) * Math.pow(1 / 3, twice)]);
      }
      if (!opts.length) break;
      const tot = opts.reduce((a, x) => a + x[2], 0);
      let k = r.float(0, tot), j = 0;
      while (j < opts.length - 1 && k >= opts[j][2]) { k -= opts[j][2]; j++; }
      const [d, cs] = opts[j];
      const cand = cs[r.int(0, cs.length - 1)];
      used.add(refKey(cand));
      const ref = d.make ? d.make(c, r, cand) : cand;
      if (!ref) continue;
      const dur = d.rare ? 1 : r.int(d.dur[0], d.dur[1]);
      st.items.push({ id: `v${++st.seq}`, c: d.id, p, at: target, to: target + dur - 1, ref, ...(d.rare ? { rare: 1 as const } : {}), ...(d.make ? { mk: 1 as const } : {}) });
      added++;
    }
  }
  st.ym = target;
  return { added, dropped };
}

/** Prejuízo da fita pirata do SEU disco (na virada, antes de sortear o mês novo). */
export function pirateLoss31(s: GameState): number {
  const st = peekVit31(s);
  if (!st || !VIT31.pirate) return 0;
  let tot = 0;
  for (const it of st.items) {
    if (it.c !== 'bm_pirate' || !it.ref.rel) continue;
    const a = s.acts[s.releases[it.ref.rel]?.actId ?? ''];
    const v = Math.round(money(s, 80 + 6 * (a?.fame ?? 0)) * VIT31.pirate);
    if (post(s, `vit31pir:${it.id}`, -v, 'misc', `Pirataria: "${s.releases[it.ref.rel]?.title ?? '?'}"`)) tot += v;
  }
  st.pir += tot;
  return tot;
}

registerSimHook('newgame', 'vit31', (s) => {
  restockAuction31(s);
  restockShops31(s, false);
});
// o primeiro mês da partida é sorteado na primeira semana (no motor): na nova partida os índices de pessoas e papéis
// ainda estão sendo montados por outros ganchos, e ler gente cedo demais deixaria esses caches velhos
registerSimHook('week', 'vit31', (s) => { if (vitOn31(s) && (peekVit31(s)?.ym ?? -1) < ymIdx31(s)) rollVit31(s, ymIdx31(s)); });
registerSimHook('month', 'vit31', (s) => {
  // as fontes migradas giram sempre (com o interruptor desligado o jogo fica como era)
  restockAuction31(s);
  restockShops31(s, true);
  restockUnder31(s);
  if (!vitOn31(s)) return;
  pirateLoss31(s);
  rollVit31(s, ymIdx31(s) + 1);
});

// ---------------------------------------------------------------- leitura (interface)

/** Tudo o que o lugar mostra neste mês: o sorteado da vitrine + o espelho das fontes migradas. Só lê. */
export function vitItems31(s: GameState, p: VitPlace31): VitItem31[] {
  const ym = ymIdx31(s);
  const own = (peekVit31(s)?.items ?? []).filter((it) => it.p === p && it.at <= ym && it.to >= ym && (() => { const d = vitDef31(it.c); return !!d && (!d.ok || d.ok(s, it)); })());
  return [...own, ...mirror(s, p)];
}
export const vitItemsOfKind31 = (s: GameState, k: string): VitItem31[] => (VIT_OF_KIND31[k] ?? []).flatMap((p) => vitItems31(s, p));
export function vitItem31(s: GameState, id: string): VitItem31 | undefined {
  for (const p of VIT_PLACES31) { const x = vitItems31(s, p).find((y) => y.id === id); if (x) return x; }
  return undefined;
}
/** Texto, desenho e botões do item (lidos do estado agora). */
export function vitView31(s: GameState, it: VitItem31): VitView31 & { art: VitArt31; src: VitSrc31; rare: boolean; left: number } {
  const d = defOrMirror(it.c)!;
  const v = d.view(s, it);
  return { ...v, art: d.art, src: d.src, rare: !!it.rare, left: Math.max(0, it.to - ymIdx31(s)) };
}

// ---------------------------------------------------------------- ações (só funções que já existem)

export type VitDo31 = { ok: boolean; text: L } | { ui: VitRun31 };
/** Executa o botão `i` do item. Ações de interface (ouvir, ir à tela, ficha) voltam para a tela resolver. */
export function vitDo31(s: GameState, itemId: string, i: number): VitDo31 {
  const it = vitItem31(s, itemId);
  if (!it) return { ok: false, text: l('Isso já saiu da vitrine.', 'That has left the showcase.') };
  const b = vitView31(s, it).btns[i];
  if (!b) return { ok: false, text: l('Ação indisponível.', 'Action unavailable.') };
  if (b.lock) return { ok: false, text: b.lock };
  return runVit31(s, b.run);
}
export function runVit31(s: GameState, run: VitRun31): VitDo31 {
  switch (run.k) {
    case 'buy': { const t = buyOffer31(s, run.offer, { k: run.how }); return { ok: !buyErr31(t), text: t }; }
    case 'bm': return buyBm31(s, run.row);
    case 'radar': return scoutHere31(s, run.act);
    case 'meet': return meetHere31(s, run.key);
    case 'place': return doPlace27(s, { k: run.pk, id: `vit31:${run.pk}`, src: 'nb', name: l('o lugar', 'the place') }, run.act);
    case 'bid': { const e = raise31(s, run.relic, run.amount); return e ? { ok: false, text: e } : { ok: true, text: l('Lance deixado com o representante.', 'Bid left with the representative.') }; }
    case 'crime': { const o = commitCrime(s, run.cid, { actor: 'player', target: run.target, partners: [] }); return 'text' in o ? { ok: o.ok, text: o.text } : { ok: false, text: o }; }
    case 'denounce': return denounce31(s, run.org);
    default: return { ui: run };
  }
}

// ---------------------------------------------------------------- editor (regra 10)

registerRunnable({ id: 'vit31.roll', area: 'world', label: l('Vitrine do mês: sortear de novo agora', 'Showcase of the month: redraw now'),
  help: l('Tira o que a vitrine pôs à venda, sorteia o mês de novo (fluxo próprio) e gira as fontes (loja, beco, leilões).', 'Removes what the showcase put on sale, redraws the month (own stream) and rotates the sources (shop, alley, auctions).'),
  run: (s) => {
    const st = vit31(s);
    for (const it of st.items) if (it.mk && it.ref.offer) unstock31(s, it.ref.offer);
    st.items = []; st.forced++;
    for (const c of shopCities31(s)) { const x = (s.x4 as unknown as { items31?: { stock: Record<string, { ym: string }> } }).items31?.stock[c]; if (x) x.ym = ''; }
    restockShops31(s, false);
    const r = rollVit31(s, ymIdx31(s));
    return fmtL(l('{n} item(ns) novo(s) na vitrine.', '{n} new item(s) in the showcase.'), { n: r.added });
  } });
registerEditable({ id: 'vit31.slots', area: 'world', label: l('Vitrine do mês: itens por lugar (base, + porte)', 'Showcase: items per place (base, + size)'), kind: 'number', raw: true, min: 0, max: 8,
  get: () => VIT31.slots, set: (_s, v) => { VIT31.slots = Math.max(0, Math.min(8, Math.round(Number(v)))); } });
registerEditable({ id: 'vit31.pirate', area: 'world', label: l('Vitrine do mês: peso do prejuízo da pirataria do seu disco', 'Showcase: weight of the loss from bootlegs of your record'), kind: 'number', raw: true, min: 0, max: 5, step: 0.1,
  get: () => VIT31.pirate, set: (_s, v) => { VIT31.pirate = Math.max(0, Math.min(5, Number(v))); } });
