// R31 · DECO-L — LOJAS DE DECORAÇÃO, COMPRA A DISTÂNCIA, ÉPOCA/VINTAGE E OS SEUS ESTABELECIMENTOS. Interruptor
// `deco31.shops` (padrão ligado; desligado = o jogo de hoje). Proposta aprovada: docs/r31/deco.md (frente DECO-L).
//
//  • Quatro lojas na cidade (prédios com arte própria — pred31): móveis/loja de departamentos, antiquário/brechó,
//    eletrônicos/hi-fi e galeria. O estoque troca INTEIRO na virada do mês pelo motor da vitrine (vitrine31 chama
//    `restockDeco31` como chama a loja de instrumentos: sem gancho próprio, sem cópia paralela). Cada peça à venda é um
//    OBJETO ÚNICO do registro (r31/object, modelo `deco:<id>`), com ano, estado, donos anteriores e acontecimentos; a
//    oferta aponta para a instância. Sorte pura por chave (`Rng.fromSeed(semente|deco31|cidade|loja|ano-mês)`): não gasta
//    nenhum fluxo do jogo, por isso os goldens não mudam.
//  • Comprar: para você (dinheiro pessoal → vai para a sua casa) ou para a empresa (caixa → sede/negócios), como na loja
//    de instrumentos. Robôs não compram decoração.
//  • Compra a distância: catálogo pelo correio (1900+, entrega em semanas) e internet (2000+, entrega em dias, na semana
//    seguinte). Paga na hora; a peça nasce (objeto único) quando chega, na caixa de entrada/porta (aviso + fato). Entrega
//    pendente tem data no calendário.
//  • Época: o item aparece no ano de lançamento e sai de linha no ano de fim; depois só usado (antiquário) ou leilão.
//    Preço "vintage" sobe a cada ano fora de linha. Peça RARA nunca vai a loja nem catálogo: quem já compra decoração vê,
//    de tempos em tempos, uma peça rara entrar num pregão da casa de leilões (relíquia do relics9, mesma casa de sempre).
//  • Conjunto completo de uma época (todos os itens não raros dela, seus ou da empresa) = conquista (fato público).
//  • Lugares: casa, sede e os seus estabelecimentos (estúdio, casa de shows, loja/bar do selo, festival, ensaio, filiais,
//    terrenos e imóveis do LOTE). Levar um item de um lugar a outro move a MESMA instância. Item em lugar aberto ao
//    público aparece para os clientes (efeito pequeno do catálogo, com teto por lugar — ex.: jukebox → público da casa
//    de shows) e pode ser roubado pelo submundo que já existe (facção da cidade, `steal` do registro de objetos).
//  • Interface mínima com a DECO-M (motor `sim/r31/deco31.ts`, catálogo `data/deco31.ts`): `registerDecoCatalog31` troca
//    o catálogo; `decoAt31`/`placeDeco31` são o "onde está" até o motor dela assumir (anotado em DECISOES).

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { DECOL31, DECO_ERAS31, DECO_ERA_NAME31, type DecoDef31, type DecoEffK31, type DecoEra31, type DecoSellK31, type DecoSlot31 } from '../../data/decol31';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { buildings18 } from '../sys/campus18';
import { addRelic, relics, type RelicKind } from '../sys/relics9';
import { underOrgs31 } from '../sys/under31';
import { ownerOf } from '../sys/people/owner';
import type { GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { homes31 } from './city31';
import { registerEditable, registerRunnable } from './editor';
import { createObj, obj31, offer, registerModelResolver, removeObj, steal, takeOffer, withdraw, type Holder, type ObjInst } from './object';
import { purse } from './purse31';
import { CO31, ME31 } from './relic31';
import { registerSwitch, sw } from './switches';
import { withTxn } from './txn';
import { peekLots31 } from '../sys/lots31';
import { DECO27, npcName27, type Place27 } from '../sys/place27';
import { registerVitSource31, type VitWhen31 } from './vitrine31';
import { VENUE_DECO17 } from '../sys/venues17';

export type { DecoDef31, DecoEra31, DecoSlot31 } from '../../data/decol31';

// ---------------------------------------------------------------- interruptor e regras

export const SW_DECO_SHOPS31 = 'deco31.shops';
registerSwitch({
  id: SW_DECO_SHOPS31, def: true, scope: 'game',
  desc: l('Decoração · lojas: móveis, antiquário, eletrônicos e galeria na cidade (estoque do mês), catálogo pelo correio e internet, itens por época, decorar os seus estabelecimentos (item exposto atrai público e pode ser roubado). Desligado: nada disso existe.',
    'Decoration · shops: furniture, antiques, electronics and gallery in town (monthly stock), mail-order and online catalogue, items by era, decorating your venues (displayed items draw a crowd and can be stolen). Off: none of this exists.'),
});
export const decoShopsOn31 = (s: GameState): boolean => sw<boolean>(s, SW_DECO_SHOPS31);

/** Regras editáveis (editor). */
export const DECOL = {
  /** peças por loja no mês */
  stock: 6,
  /** chance por mês de roubo de UMA peça exposta em lugar público (com facção na cidade) */
  theft: 0.04,
  /** teto do efeito por tipo e por lugar */
  cap: 5,
  /** semanas da entrega pelo correio [mín, máx] */
  mail: [3, 6] as [number, number],
  /** anos entre peças raras que entram no leilão (só para quem já compra decoração) */
  rareEvery: 2,
};

// ---------------------------------------------------------------- catálogo (interface mínima com a DECO-M)

let CAT: DecoDef31[] = DECOL31;
const BY = new Map<string, DecoDef31>();
const index = () => { BY.clear(); for (const d of CAT) BY.set(d.id, d); };
index();
/** A DECO-M registra o catálogo dela aqui quando chegar (mesmos campos). */
export function registerDecoCatalog31(defs: DecoDef31[]): void { CAT = defs; index(); }
export const decoCat31 = (): DecoDef31[] => CAT;
export const decoDef31 = (id: string): DecoDef31 | undefined => BY.get(id);
registerModelResolver('deco:', (id) => (BY.has(id.slice(5)) ? { id, kind: 'deco' } : undefined));

/** Em linha (à venda nova) no ano. */
export const inLine31 = (d: DecoDef31, y: number): boolean => y >= d.from && (d.to === undefined || y <= d.to);
/** Fora de linha (já saiu): só usado, antiquário ou leilão. */
export const outOfLine31 = (d: DecoDef31, y: number): boolean => d.to !== undefined && y > d.to;

// ---------------------------------------------------------------- lojas

export type DecoShopK31 = 'furniture' | 'antique' | 'hifi' | 'gallery';
export const DECO_SHOPS31: DecoShopK31[] = ['furniture', 'antique', 'hifi', 'gallery'];
/** Ano em que a loja abre na cidade. */
export const SHOP_FROM31: Record<DecoShopK31, number> = { furniture: 1889, antique: 1889, hifi: 1898, gallery: 1889 };
/** Nome da loja na época (o tipo é o mesmo; a fachada e o nome mudam). */
export function shopName31(k: DecoShopK31, y: number): L {
  switch (k) {
    case 'furniture': return y < 1930 ? l('Móveis e Tapeçaria', 'Furniture and Upholstery') : y < 1990 ? l('Loja de Departamentos', 'Department Store') : l('Megaloja de Móveis e Casa', 'Home and Furniture Superstore');
    case 'antique': return y < 1965 ? l('Antiquário', 'Antique Shop') : y < 2005 ? l('Antiquário e Brechó', 'Antiques and Thrift') : l('Brechó Vintage', 'Vintage Thrift Store');
    case 'hifi': return y < 1935 ? l('Gramofones e Rádios', 'Gramophones and Radios') : y < 1965 ? l('Rádios, Vitrolas e TVs', 'Radios, Record Players and TVs') : y < 2000 ? l('Eletrônicos e Hi-Fi', 'Electronics and Hi-Fi') : l('Eletrônicos', 'Electronics');
    case 'gallery': return y < 1960 ? l('Galeria de Arte', 'Art Gallery') : y < 2000 ? l('Galeria, Pôsteres e Molduras', 'Gallery, Posters and Frames') : l('Galeria e Arte Digital', 'Gallery and Digital Art');
  }
}
export const SHOP_WHAT31: Record<DecoShopK31, L> = {
  furniture: l('Móveis, luminárias, tapetes e papel de parede novos da época.', 'New furniture, lamps, rugs and wallpaper of the era.'),
  antique: l('Peças usadas de outras épocas, com história. Fora de linha, o preço "vintage" sobe ano a ano.', 'Used pieces from other eras, with a history. Once discontinued, the "vintage" price rises year by year.'),
  hifi: l('Aparelhos de som e imagem da época: do gramofone à caixa inteligente.', 'Sound and picture sets of the era: from the gramophone to the smart speaker.'),
  gallery: l('Quadros, pôsteres e discos emoldurados.', 'Paintings, posters and framed records.'),
};
/** Dono das peças à venda (não começa com `shop:`: a loja de instrumentos e a vitrine usam esse prefixo). */
export const decoShopId31 = (city: string, k: DecoShopK31): Holder => `decoshop:${city}:${k}`;
/** Lojas abertas na cidade no ano. */
export const decoShopsOpen31 = (s: GameState): DecoShopK31[] => (decoShopsOn31(s) ? DECO_SHOPS31.filter((k) => s.year >= SHOP_FROM31[k]) : []);

// ---------------------------------------------------------------- estado

/** Detalhe do exemplar: modelo, ano de fabricação, estado (0 impecável … 3 muito gasto), donos anteriores, acontecimentos. */
export interface DecoX31 { def: string; made: number; cond: number; prev: [string, number, number][]; ev: [number, L][] }
export interface DecoStock31 { ym: string; offers: string[] }
export type DecoVia31 = 'mail' | 'net';
export interface DecoOrd31 { id: string; def: string; via: DecoVia31; w: number; due: number; to: 'me' | 'co'; paid: number }
/** Onde a peça está: chave do lugar (`home`, `hq`, `b:<prédio>`, `lot:<n>`, `ab:<cidade>`) e o lugar dentro dele. */
export interface DecoAt31 { at: string; slot?: DecoSlot31; w: number }
export interface DecoL31St {
  stock: Record<string, DecoStock31>;
  d: Record<string, DecoX31>;
  ord: DecoOrd31[];
  at: Record<string, DecoAt31>;
  /** épocas completas (conquista) */
  sets: DecoEra31[];
  /** compras feitas por você (0 = nunca: nada de raro no leilão, nenhuma conta extra) */
  buys: number;
  stolen: Record<string, { w: number; org: string; at: string }>;
  /** relíquias raras de decoração postas em leilão: relíquia → modelo */
  rare: Record<string, string>;
  rareY?: number;
  n: number;
}
declare module '../ext4' { interface Ext4 { decol31: DecoL31St } }
const fresh = (): DecoL31St => ({ stock: {}, d: {}, ord: [], at: {}, sets: [], buys: 0, stolen: {}, rare: {}, n: 0 });
registerExt4('decol31', fresh);
export function decol31(s: GameState): DecoL31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.decol31 ??= fresh()) as DecoL31St;
  st.stock ??= {}; st.d ??= {}; st.ord ??= []; st.at ??= {}; st.sets ??= []; st.stolen ??= {}; st.rare ??= {};
  return st;
}
/** Leitura sem criar estado (interface). */
export const peekDecol31 = (s: GameState): DecoL31St | undefined => (s as unknown as { x4?: { decol31?: DecoL31St } }).x4?.decol31;

// ---------------------------------------------------------------- preço

const CONDM = [1.1, 1, 0.85, 0.7];
export const DECO_COND31: L[] = [l('impecável', 'mint'), l('bom', 'good'), l('gasto', 'worn'), l('muito gasto', 'well worn')];
/** Fator de época: novo = 1; usado em linha perde valor; fora de linha sobe ("vintage") a cada ano, até 4×. */
export function vintage31(d: DecoDef31, y: number, made: number): number {
  if (outOfLine31(d, y)) return Math.min(4, 1 + 0.07 * (y - d.to!));
  return made >= y ? 1 : Math.max(0.45, 1 - 0.05 * (y - made));
}
/** Preço do exemplar (dinheiro da época). */
export function decoPrice31(s: GameState, d: DecoDef31, x: Pick<DecoX31, 'made' | 'cond'>): number {
  return Math.max(1, Math.round(money(s, d.price * CONDM[x.cond] * vintage31(d, s.year, x.made))));
}
/** Preço no catálogo a distância (novo): correio com frete, internet um pouco mais barata. */
export const remotePrice31 = (s: GameState, d: DecoDef31, via: DecoVia31): number => Math.max(1, Math.round(money(s, d.price * (via === 'mail' ? 1.08 : 0.95))));

// ---------------------------------------------------------------- estoque do mês (motor; a tela só lê)

const ymOf = (s: GameState) => `${s.year}-${s.month}`;
const nextYm = (s: GameState) => (s.month >= 11 ? `${s.year + 1}-0` : `${s.year}-${s.month + 1}`);
const FIRST = ['Alda', 'Bruno', 'Cecília', 'Diogo', 'Estela', 'Flávio', 'Glória', 'Heitor', 'Inês', 'Joel', 'Lúcia', 'Mauro', 'Noêmia', 'Orlando', 'Pietra', 'Raul', 'Selma', 'Túlio', 'Vânia', 'Wagner'];
const LAST = ['Almeida', 'Bastos', 'Carvalho', 'Dias', 'Esteves', 'Fontes', 'Guerra', 'Holanda', 'Leme', 'Macedo', 'Neves', 'Oliva', 'Pacheco', 'Queiroz', 'Rezende', 'Salles', 'Teles', 'Valente', 'Xavier', 'Zanetti'];
const PREV_EV: [string, string][] = [['enfeitou a sala de um casarão', 'graced the parlour of a mansion'], ['passou anos num sótão', 'spent years in an attic'], ['foi restaurado com cuidado', 'was carefully restored'],
  ['decorou um salão de baile', 'decorated a dance hall'], ['veio de um espólio', 'came from an estate sale'], ['ficou na vitrine de um hotel', 'stood in a hotel lobby']];

/** Gera o estoque do mês de uma loja (só no motor). Não repete modelo do mês anterior; o que sobrou volta ao fornecedor. */
export function restockDecoShop31(s: GameState, city: string, k: DecoShopK31, ym = ymOf(s)): DecoStock31 {
  const st = decol31(s);
  const key = `${city}:${k}`;
  const old = st.stock[key];
  if (old?.ym === ym) return old;
  const venue = decoShopId31(city, k);
  const prevModels = new Set<string>();
  for (const id of old?.offers ?? []) {
    const of = obj31(s).offers[id];
    if (!of) continue;
    const o = obj31(s).objs[of.objId];
    if (o) prevModels.add(o.modelId.slice(5));
    if (o && o.owner === venue) { removeObj(s, o.id); delete st.d[o.id]; } else withdraw(s, id);
  }
  const out: DecoStock31 = { ym, offers: [] };
  st.stock[key] = out;
  if (s.year < SHOP_FROM31[k]) return out;
  const [y, m] = ym.split('-').map(Number);
  const r = Rng.fromSeed(`${s.config.seed}|deco31|${city}|${k}|${ym}`);
  const pool = k === 'antique'
    ? CAT.filter((d) => !d.rare && d.from <= y - 8 && !prevModels.has(d.id)).sort((a, b) => Number(outOfLine31(b, y)) - Number(outOfLine31(a, y)) || (a.id < b.id ? -1 : 1))
    : CAT.filter((d) => !d.rare && d.sell === k && inLine31(d, y) && !prevModels.has(d.id));
  // catálogo curto na época: repete modelo (outra peça, outra instância) em vez de deixar a loja vazia
  if (pool.length < 3) pool.push(...CAT.filter((d) => !d.rare && prevModels.has(d.id) && (k === 'antique' ? d.from <= y - 8 : d.sell === k && inLine31(d, y))));
  // antiquário: o que já saiu de linha vem primeiro (metade garantida), o resto é usado ainda em linha
  const picks = k === 'antique'
    ? [...r.shuffle(pool.filter((d) => outOfLine31(d, y))).slice(0, Math.ceil(DECOL.stock / 2)), ...r.shuffle(pool.filter((d) => !outOfLine31(d, y)))].slice(0, DECOL.stock)
    : r.shuffle([...pool]).slice(0, DECOL.stock);
  void m;
  for (const d of picks) {
    const used = k === 'antique';
    const last = Math.min(d.to ?? y, y);
    const made = used ? Math.max(d.from, last - r.int(0, Math.max(0, Math.min(25, last - d.from)))) : y;
    const cond = used ? r.int(1, 3) : 0;
    const prev: [string, number, number][] = [];
    const ev: [number, L][] = [];
    if (used) {
      let y0 = made;
      const n = r.int(1, 3);
      for (let i = 0; i < n && y0 < y; i++) {
        const y1 = i === n - 1 ? y : Math.min(y, y0 + r.int(3, Math.max(4, Math.round((y - made) / n))));
        prev.push([`${r.pick(FIRST)} ${r.pick(LAST)}`, y0, y1]);
        if (r.chance(0.6)) { const e = r.pick(PREV_EV); ev.push([Math.min(y1, y0 + 1), l(e[0], e[1])]); }
        y0 = y1;
      }
    }
    const res = createObj(s, { modelId: `deco:${d.id}`, origin: used ? 'used' : 'factory', owner: venue });
    if (!res.ok) continue;
    st.d[res.v.id] = { def: d.id, made, cond, prev, ev };
    const of = offer(s, res.v.id, venue, decoPrice31(s, d, { made, cond }));
    if (of.ok) out.offers.push(of.v.id); else { removeObj(s, res.v.id); delete st.d[res.v.id]; }
  }
  return out;
}
/** Fonte da vitrine do mês (vitrine31 chama na virada — estoque do mês que começa — e no editor). Na nova partida não
 *  faz nada: o primeiro estoque sai na primeira semana (gancho semanal), para o interruptor poder ser desligado antes. */
export function restockDeco31(s: GameState, when: VitWhen31): void {
  if (when === 'new') return;
  if (!decoShopsOn31(s)) { clearDeco31(s); return; }
  const ym = when === 'month' ? nextYm(s) : ymOf(s);
  for (const k of DECO_SHOPS31) { if (when === 'edit') { const x = peekDecol31(s)?.stock[`${s.config.homeCity}:${k}`]; if (x) x.ym = ''; } restockDecoShop31(s, s.config.homeCity, k, ym); }
}
/** Interruptor desligado no meio da partida: o que as lojas tinham à venda volta ao fornecedor (o que é seu fica seu). */
export function clearDeco31(s: GameState): void {
  const st = peekDecol31(s);
  if (!st) return;
  for (const [key, sk] of Object.entries(st.stock)) {
    for (const id of sk.offers) {
      const of = obj31(s).offers[id];
      const o = of ? obj31(s).objs[of.objId] : undefined;
      if (o && o.owner === of!.venue) { removeObj(s, o.id); delete st.d[o.id]; } else if (of) withdraw(s, id);
    }
    delete st.stock[key];
  }
}

registerVitSource31('decoshop31', restockDeco31);

// ---------------------------------------------------------------- no mapa: as lojas ocupam prédios da cidade comum

const ROLE31: Record<DecoShopK31, L> = { furniture: l('Gerente da loja', 'Store manager'), antique: l('Antiquário(a)', 'Antique dealer'), hifi: l('Vendedor(a) de som', 'Sound salesperson'), gallery: l('Galerista', 'Gallerist') };
/** Puro: troca prédios comuns (escritório, hotel, prédio de moradia) pelas lojas abertas, dos menos vistos para os mais. */
export function decoPlacesOnMap31(s: GameState, out: Place27[]): void {
  const open = decoShopsOpen31(s);
  if (!open.length) return;
  // prédio comum ou loja repetida (a cidade comum repete a loja de instrumentos/da época: a primeira fica)
  const firstShop = out.findIndex((p) => p.k === 'instruments');
  const free = (p: Place27, i: number) => p.src === 'fill' && !p.venue && !p.org && !p.fam31 && !p.lot31 && !p.deco31 && !p.outlet
    && (p.k === 'office' || p.k === 'apartments' || p.k === 'hotel' || (p.k === 'instruments' && i !== firstShop));
  const idx = [...out.keys()].filter((i) => free(out[i], i)).reverse();
  open.forEach((k, j) => {
    const i = idx[j];
    if (i === undefined) return;
    const lot = out[i].lot;
    const owner = npcName27(s, `deco31|${k}`);
    const n = decoRows31(s, k).length;
    out[i] = { id: `pl:${lot}`, lot, k: 'office', name: shopName31(k, s.year), what: SHOP_WHAT31[k], owner, ownerK: 'npc',
      now: n ? fmtL(l('{n} peça(s) à venda este mês; estoque novo em {w} semana(s).', '{n} piece(s) for sale this month; new stock in {w} week(s).'), { n, w: weeksToRestockDeco31(s) }) : l('Vitrine sendo arrumada.', 'Window being dressed.'),
      people: [{ name: owner, role: ROLE31[k], staff: true, job: 0 }], also: [], src: 'fill', draw: 'store', deco31: k };
  });
}
DECO27.fn = decoPlacesOnMap31;

// ---------------------------------------------------------------- leitura (interface)

export interface DecoRow31 { offer: string; obj: string; price: number; def: DecoDef31; x: DecoX31 }
/** Estoque de uma loja para a tela (só leitura). */
export function decoRows31(s: GameState, k: DecoShopK31, city = s.config.homeCity): DecoRow31[] {
  const st = peekDecol31(s);
  const stock = st?.stock[`${city}:${k}`];
  if (!st || !stock || !decoShopsOn31(s)) return [];
  const out: DecoRow31[] = [];
  for (const id of stock.offers) {
    const of = obj31(s).offers[id];
    const o = of ? obj31(s).objs[of.objId] : undefined;
    const x = o ? st.d[o.id] : undefined;
    const def = x ? decoDef31(x.def) : undefined;
    if (of && o && x && def) out.push({ offer: id, obj: o.id, price: of.price, def, x });
  }
  return out;
}
/** Catálogo a distância do momento (só o que está em linha e não é raro). */
export function remoteCat31(s: GameState, via: DecoVia31): DecoDef31[] {
  if (!remoteOpen31(s, via)) return [];
  return CAT.filter((d) => !d.rare && inLine31(d, s.year)).sort((a, b) => (a.sell < b.sell ? -1 : a.sell > b.sell ? 1 : a.from - b.from));
}
export const REMOTE_FROM31: Record<DecoVia31, number> = { mail: 1900, net: 2000 };
export const remoteOpen31 = (s: GameState, via: DecoVia31): boolean => decoShopsOn31(s) && s.year >= REMOTE_FROM31[via];
export const remoteName31 = (via: DecoVia31, y: number): L => via === 'net' ? (y < 2010 ? l('Loja na internet', 'Online shop') : l('Aplicativo de compras', 'Shopping app'))
  : y < 1950 ? l('Catálogo pelo correio', 'Mail-order catalogue') : l('Catálogo de vendas pelo correio', 'Mail-order sales catalogue');
/** Itens seus (pessoais ou da empresa), com onde estão. */
export interface DecoMine31 { o: ObjInst; x: DecoX31; def: DecoDef31; at?: DecoAt31; stolen?: { w: number; org: string } }
export function decoMine31(s: GameState): DecoMine31[] {
  const st = peekDecol31(s);
  if (!st) return [];
  const out: DecoMine31[] = [];
  for (const o of Object.values(obj31(s).objs)) {
    if ((o.owner !== ME31 && o.owner !== CO31) || !o.modelId.startsWith('deco:')) continue;
    const x = st.d[o.id];
    const def = x ? decoDef31(x.def) : undefined;
    if (x && def) out.push({ o, x, def, at: st.at[o.id], stolen: st.stolen[o.id] });
  }
  return out.sort((a, b) => (a.o.id < b.o.id ? -1 : 1));
}
export const weeksToRestockDeco31 = (s: GameState): number => Math.max(1, 4 - ((s.week % 4) || 0));

// ---------------------------------------------------------------- comprar

export type DecoHow31 = 'me' | 'co';
const NO = (pt: string, en: string) => ({ ok: false as const, text: l(pt, en) });
function pay(s: GameState, how: DecoHow31, price: number, key: string, memo: string): L | null {
  if (how === 'me') {
    const o = ownerOf(s);
    if (o.wealth < price) return l('Patrimônio pessoal insuficiente (sai do seu bolso, não da empresa).', 'Not enough personal wealth (it comes out of your pocket, not the company).');
    purse(s, -price, 'goods', 'deco31:buy', { who: o, ben: 'me' });
    return null;
  }
  if (freeCash20(s) < price) return cashWhy20(s, price, l('Caixa da empresa insuficiente.', 'Not enough company cash.'));
  withTxn({ payer: 'label', owner: 'label', beneficiary: 'label' }, () => post(s, `deco31:${key}`, -price, 'acquisitions', memo));
  return null;
}
export function buyLock31(s: GameState, how: DecoHow31, price: number): L | null {
  if (!decoShopsOn31(s)) return l('As lojas de decoração estão desligadas nesta partida.', 'Decoration shops are off in this game.');
  if (how === 'me') return ownerOf(s).wealth < price ? l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.') : null;
  return freeCash20(s) < price ? cashWhy20(s, price, l('Caixa da empresa insuficiente.', 'Not enough company cash.')) : null;
}

/** Compra na loja (oferta da peça única): para você (vai para a sua casa) ou para a empresa (vai para a sede). */
export function buyDeco31(s: GameState, offerId: string, how: DecoHow31): { ok: boolean; text: L } {
  if (!decoShopsOn31(s)) return NO('As lojas de decoração estão desligadas nesta partida.', 'Decoration shops are off in this game.');
  const st = decol31(s);
  const of = obj31(s).offers[offerId];
  const o = of ? obj31(s).objs[of.objId] : undefined;
  const x = o ? st.d[o.id] : undefined;
  const def = x ? decoDef31(x.def) : undefined;
  if (!of || !o || !x || !def || !of.venue.startsWith('decoshop:')) return NO('Esse item já não está à venda.', 'That item is no longer for sale.');
  const err = pay(s, how, of.price, o.id, `Decoração: ${def.name.pt}`);
  if (err) return { ok: false, text: err };
  const tk = takeOffer(s, offerId, how === 'me' ? ME31 : CO31);
  if (!tk.ok) return NO('Esse item já não está à venda.', 'That item is no longer for sale.');
  for (const sk of Object.values(st.stock)) if (sk.offers.includes(offerId)) sk.offers = sk.offers.filter((z) => z !== offerId);
  const k = of.venue.split(':')[2] as DecoShopK31;
  x.ev.push([s.year, fmtL(l('comprado na {n}', 'bought at the {n}'), { n: shopName31(k, s.year) })]);
  st.at[o.id] = { at: how === 'me' ? 'home' : 'hq', w: s.week };
  st.buys++;
  checkSets31(s);
  return { ok: true, text: how === 'me' ? fmtL(l('{n} agora é seu: foi para a sua casa.', '{n} is now yours: it went to your home.'), { n: def.name }) : fmtL(l('{n} é da empresa: foi para a sede.', '{n} belongs to the company: it went to HQ.'), { n: def.name }) };
}

/** Encomenda a distância: paga agora; a peça (objeto único) nasce quando chega. Correio: semanas; internet: dias. */
export function orderDeco31(s: GameState, defId: string, via: DecoVia31, how: DecoHow31): { ok: boolean; text: L } {
  const d = decoDef31(defId);
  if (!d) return NO('Item desconhecido.', 'Unknown item.');
  if (!remoteOpen31(s, via)) return via === 'net' ? NO('Ainda não existe compra pela internet.', 'Online shopping does not exist yet.') : NO('Ainda não existe catálogo pelo correio.', 'There is no mail-order catalogue yet.');
  if (d.rare) return NO('Peça rara: só aparece nos leilões.', 'Rare piece: it only turns up at auctions.');
  if (!inLine31(d, s.year)) return NO('Saiu de linha: só usado, no antiquário ou em leilão.', 'Discontinued: only used, at the antique shop or at auction.');
  const st = decol31(s);
  const price = remotePrice31(s, d, via);
  const id = `do${++st.n}`;
  const err = pay(s, how, price, id, `Encomenda (${via === 'mail' ? 'correio' : 'internet'}): ${d.name.pt}`);
  if (err) return { ok: false, text: err };
  const wait = via === 'net' ? 1 : Rng.fromSeed(`${s.config.seed}|deco31|mail|${id}`).int(DECOL.mail[0], DECOL.mail[1]);
  st.ord.push({ id, def: d.id, via, w: s.week, due: s.week + wait, to: how, paid: price });
  st.buys++;
  return { ok: true, text: via === 'net' ? fmtL(l('Pedido feito: {n} chega em poucos dias.', 'Order placed: {n} arrives in a few days.'), { n: d.name })
    : fmtL(l('Pedido enviado pelo correio: {n} chega em cerca de {w} semanas.', 'Order mailed: {n} arrives in about {w} weeks.'), { n: d.name, w: wait }) };
}

/** Entregas que vencem nesta semana (motor, gancho semanal). */
export function deliverDeco31(s: GameState): number {
  const st = peekDecol31(s);
  if (!st?.ord.length) return 0;
  let n = 0;
  const keep: DecoOrd31[] = [];
  for (const od of st.ord) {
    if (od.due > s.week) { keep.push(od); continue; }
    const d = decoDef31(od.def);
    const res = d ? createObj(s, { modelId: `deco:${d.id}`, origin: od.via, owner: od.to === 'me' ? ME31 : CO31 }) : null;
    if (!d || !res?.ok) continue;
    st.d[res.v.id] = { def: d.id, made: s.year, cond: 0, prev: [], ev: [[s.year, od.via === 'mail' ? l('chegou pelo correio', 'arrived by mail') : l('entregue pela loja da internet', 'delivered by the online shop')]] };
    st.at[res.v.id] = { at: od.to === 'me' ? 'home' : 'hq', w: s.week };
    n++;
    const text = fmtL(od.via === 'mail' ? l('Chegou pelo correio: {n} (na porta {w}).', 'Arrived by mail: {n} (at the door {w}).') : l('Entrega da internet: {n} (na porta {w}).', 'Online delivery: {n} (at the door {w}).'),
      { n: d.name, w: od.to === 'me' ? l('de casa', 'at home') : l('da sede', 'at HQ') });
    emitFact(s, { kind: 'deco_delivery', actors: ['player'], severity: 3, visibility: 'secret', tags: ['deco', 'delivery'], src: 'decoshop31', text, diary: true });
    notify(s, text, 'good');
  }
  st.ord = keep;
  if (n) checkSets31(s);
  return n;
}

// ---------------------------------------------------------------- conjunto completo de uma época

/** Progresso de cada época: quantos dos itens não raros dela você (ou a empresa) tem. */
export function setProgress31(s: GameState): { era: DecoEra31; have: number; of: number; done: boolean }[] {
  const mine = new Set(decoMine31(s).filter((m) => !m.stolen).map((m) => m.def.id));
  const done = new Set(peekDecol31(s)?.sets ?? []);
  return DECO_ERAS31.map((era) => {
    const all = CAT.filter((d) => d.era === era && !d.rare);
    return { era, have: all.filter((d) => mine.has(d.id)).length, of: all.length, done: done.has(era) };
  });
}
export function checkSets31(s: GameState): DecoEra31[] {
  const st = decol31(s);
  const got: DecoEra31[] = [];
  for (const p of setProgress31(s)) {
    if (p.done || !p.of || p.have < p.of) continue;
    st.sets.push(p.era); got.push(p.era);
    const text = fmtL(l('Conquista: conjunto completo de decoração {e}.', 'Achievement: complete {e} decoration set.'), { e: DECO_ERA_NAME31[p.era] });
    emitFact(s, { kind: 'deco_set', actors: ['player'], severity: 15, visibility: 'public', tags: ['deco', 'achievement', 'good'], src: 'decoshop31', text, diary: true });
    notify(s, text, 'good');
  }
  return got;
}

// ---------------------------------------------------------------- lugares (casa, sede e os seus estabelecimentos)

export type DecoPlaceK31 = 'home' | 'hq' | 'studio' | 'venue' | 'store' | 'fest' | 'rehearsal' | 'branch' | 'lot' | 'abroad';
export interface DecoPlace31 { key: string; k: DecoPlaceK31; name: L; city: string; pub: boolean }
/** Lugar aberto ao público: o item aparece para os clientes (efeito pequeno) e pode ser roubado. */
export const PUBLIC31 = new Set<DecoPlaceK31>(['venue', 'store', 'fest']);
const BK: Partial<Record<string, DecoPlaceK31>> = { studio: 'studio', venue: 'venue', store: 'store', fest: 'fest', rehearsal: 'rehearsal', branch: 'branch' };
/** Todos os lugares decoráveis que são seus agora (só lê). */
export function decoPlaces31(s: GameState): DecoPlace31[] {
  const out: DecoPlace31[] = [
    { key: 'home', k: 'home', name: l('Sua casa', 'Your home'), city: s.config.homeCity, pub: false },
    { key: 'hq', k: 'hq', name: l('Sede', 'HQ'), city: s.config.homeCity, pub: false },
  ];
  for (const b of buildings18(s)) {
    const k = BK[b.kind];
    if (!k || b.st === 'sold' || b.st === 'closed' || b.st === 'planned') continue;
    out.push({ key: `b:${b.id}`, k, name: l(b.name, b.name), city: b.city && !b.city.startsWith('@') ? b.city : s.config.homeCity, pub: PUBLIC31.has(k) });
  }
  for (const lot of Object.keys(peekLots31(s)?.own ?? {}).map(Number).sort((a, b) => a - b))
    out.push({ key: `lot:${lot}`, k: 'lot', name: fmtL(l('Seu terreno nº {n}', 'Your plot no. {n}'), { n: lot }), city: s.config.homeCity, pub: false });
  for (const h of homes31(s)) out.push({ key: `ab:${h.city}`, k: 'abroad', name: fmtL(l('Imóvel em {c}', 'Home in {c}'), { c: cityById[h.city]?.name ?? l(h.city, h.city) }), city: h.city, pub: false });
  return out;
}
export const decoPlace31 = (s: GameState, key: string): DecoPlace31 | undefined => decoPlaces31(s).find((p) => p.key === key);
/** Quantas peças cabem em cada lugar do cômodo (o motor da DECO-M afina por cômodo). */
export const SLOT_CAP31: Record<DecoSlot31, number> = { wall: 4, floor: 4, desk: 3, ceiling: 2, paper: 1, rug: 1, window: 1, sign: 1 };
/** Onde a peça está (sem criar estado). */
export const decoAt31 = (s: GameState, objId: string): DecoAt31 | undefined => peekDecol31(s)?.at[objId];
/** Peças num lugar (as roubadas não estão mais lá). */
export function decoIn31(s: GameState, key: string): DecoMine31[] { return decoMine31(s).filter((m) => !m.stolen && m.at?.at === key); }

/** Leva a peça (a MESMA instância) para outro lugar seu. */
export function placeDeco31(s: GameState, objId: string, key: string, slot?: DecoSlot31): { ok: boolean; text: L } {
  if (!decoShopsOn31(s)) return NO('A decoração está desligada nesta partida.', 'Decoration is off in this game.');
  const st = decol31(s);
  const o = obj31(s).objs[objId];
  const x = st.d[objId];
  const def = x ? decoDef31(x.def) : undefined;
  if (!o || !def || (o.owner !== ME31 && o.owner !== CO31)) return NO('Essa peça não é sua.', 'That piece is not yours.');
  if (st.stolen[objId] || o.holder !== o.owner) return NO('A peça foi roubada: não está com você.', 'The piece was stolen: you do not have it.');
  if (o.offer) return NO('A peça está à venda: tire da venda antes.', 'The piece is for sale: withdraw it first.');
  const p = decoPlace31(s, key);
  if (!p) return NO('Esse lugar não é seu.', 'That place is not yours.');
  const sl = slot ?? def.slot;
  const used = decoIn31(s, key).filter((m) => m.o.id !== objId && (m.at?.slot ?? m.def.slot) === sl).length;
  if (used >= SLOT_CAP31[sl]) return NO('Não cabe mais nada nesse lugar do cômodo.', 'Nothing more fits in that spot.');
  const from = st.at[objId]?.at;
  st.at[objId] = { at: key, slot: sl, w: s.week };
  if (from !== key) x.ev.push([s.year, fmtL(l('levado para: {p}', 'moved to: {p}'), { p: p.name })]);
  return { ok: true, text: fmtL(l('{n} agora está em: {p}.', '{n} is now at: {p}.'), { n: def.name, p: p.name }) };
}

/** Efeito pequeno das peças de um lugar (por tipo, com teto). Só peças que estão lá de verdade. */
export function decoEff31(s: GameState, key: string): Record<DecoEffK31, number> {
  const out: Record<DecoEffK31, number> = { pub: 0, prest: 0, rest: 0 };
  if (!peekDecol31(s) || !decoShopsOn31(s)) return out;
  for (const m of decoIn31(s, key)) if (m.def.eff) out[m.def.eff[0]] += m.def.eff[1];
  for (const k of Object.keys(out) as DecoEffK31[]) out[k] = Math.min(DECOL.cap, out[k]);
  return out;
}
/** Bônus de ocupação de uma casa de shows real sua (venues17): +1% por ponto de público, teto 5%. */
export const venueOcc31 = (s: GameState, venueId: string): number => (peekDecol31(s) ? decoEff31(s, `b:ve:${venueId}`).pub / 100 : 0);
VENUE_DECO17.occ = venueOcc31;

// ---------------------------------------------------------------- roubo (submundo que já existe)

/** Virada do mês: uma peça exposta em lugar público pode ser roubada por gente de uma facção da cidade. */
export function theftDeco31(s: GameState): string[] {
  const st = peekDecol31(s);
  if (!st || !decoShopsOn31(s) || !sw<boolean>(s, 'under31')) return [];
  const orgs = underOrgs31(s).here;
  if (!orgs.length) return [];
  const pub = new Map(decoPlaces31(s).filter((p) => p.pub).map((p) => [p.key, p]));
  const out: string[] = [];
  for (const m of decoMine31(s)) {
    if (m.stolen || !m.at || !pub.has(m.at.at)) continue;
    const r = Rng.fromSeed(`${s.config.seed}|deco31|theft|${m.o.id}|${ymOf(s)}`);
    if (!r.chance(DECOL.theft * (1 + m.def.size * 0.2 - (m.def.slot === 'paper' || m.def.slot === 'rug' ? 0.8 : 0)))) continue;
    const org = orgs[r.int(0, orgs.length - 1)];
    stealDeco31(s, m.o.id, org.id, org.name);
    out.push(m.o.id);
    break; // no máximo uma por mês
  }
  return out;
}
/** Roubo pelo registro de objetos (muda quem está com a peça, nunca o dono) com fato e aviso. */
export function stealDeco31(s: GameState, objId: string, orgId: string, orgName: L): boolean {
  const st = decol31(s);
  const at = st.at[objId];
  const x = st.d[objId];
  const d = x ? decoDef31(x.def) : undefined;
  if (!at || !d || !steal(s, objId, `org:${orgId}`).ok) return false;
  const pl = decoPlace31(s, at.at);
  st.stolen[objId] = { w: s.week, org: orgId, at: at.at };
  delete st.at[objId];
  x!.ev.push([s.year, fmtL(l('roubado de {p}', 'stolen from {p}'), { p: pl?.name ?? l('um lugar seu', 'one of your places') })]);
  const text = fmtL(l('Roubaram {n} de {p}. Na rua dizem que foi gente de {o}.', '{n} was stolen from {p}. Word on the street says it was {o} people.'), { n: d.name, p: pl?.name ?? l('um lugar seu', 'one of your places'), o: orgName });
  emitFact(s, { kind: 'theft', actors: ['player'], place: pl?.city, severity: 12, visibility: 'public', tags: ['deco', 'crime', 'theft', 'bad'], src: 'decoshop31', text, diary: true });
  notify(s, text, 'bad');
  return true;
}

// ---------------------------------------------------------------- peça rara → leilão (só para quem já compra)

const RELK: Record<DecoSellK31, RelicKind> = { furniture: 'prop', hifi: 'prop', gallery: 'art' };
/** De tempos em tempos (motor, virada do mês), uma peça rara fora de linha entra num pregão da casa de leilões. */
export function rareToAuction31(s: GameState): string | null {
  const st = peekDecol31(s);
  if (!st || !st.buys || !decoShopsOn31(s) || !sw<boolean>(s, 'auction31')) return null;
  if (st.rareY !== undefined && s.year - st.rareY < DECOL.rareEvery) return null;
  const used = new Set(Object.values(st.rare));
  const pool = CAT.filter((d) => d.rare && s.year >= d.from + 10 && !used.has(d.id));
  if (!pool.length) return null;
  const r = Rng.fromSeed(`${s.config.seed}|deco31|rare|${s.year}`);
  const d = r.pick(pool);
  const v = Math.round(d.price * vintage31(d, s.year, d.from) * 3);
  const rl = addRelic(s, /juke/.test(d.id) ? 'jukebox' : RELK[d.sell], d.name, undefined, undefined, v, d.from);
  rl.own[0] = [`${r.pick(FIRST)} ${r.pick(LAST)}`, d.from, 'origem'];
  rl.st = 'auction';
  rl.au = s.week + 6;
  st.rare[rl.id] = d.id;
  st.rareY = s.year;
  notify(s, fmtL(l('O antiquário avisa: {n}, peça rara de decoração, vai a leilão.', 'The antique dealer tips you off: {n}, a rare decoration piece, is going to auction.'), { n: d.name }), 'info');
  return rl.id;
}
/** A relíquia é uma peça rara de decoração (para a tela da casa de leilões e do antiquário). */
export const rareDeco31 = (s: GameState, relicId: string): DecoDef31 | undefined => decoDef31(peekDecol31(s)?.rare[relicId] ?? '');
export const rareLots31 = (s: GameState): { relic: string; def: DecoDef31; st: string }[] =>
  Object.entries(peekDecol31(s)?.rare ?? {}).map(([relic, id]) => ({ relic, def: decoDef31(id)!, st: relics(s).list.find((x) => x.id === relic)?.st ?? 'lost' })).filter((x) => !!x.def);

// ---------------------------------------------------------------- ganchos (motor)

registerSimHook('week', 'decoshop31', (s) => {
  if (!decoShopsOn31(s)) return;
  // primeiro estoque da partida (ou depois de religar o interruptor): o mês atual, na primeira semana
  const fresh = (ym?: string) => ym === ymOf(s) || ym === nextYm(s);
  if (decoShopsOpen31(s).some((k) => !fresh(peekDecol31(s)?.stock[`${s.config.homeCity}:${k}`]?.ym))) for (const k of DECO_SHOPS31) restockDecoShop31(s, s.config.homeCity, k);
  deliverDeco31(s);
});
registerSimHook('month', 'decoshop31', (s) => { if (!decoShopsOn31(s)) return; theftDeco31(s); rareToAuction31(s); });

registerDeadline('decoshop31', (s, from, to) => (peekDecol31(s)?.ord ?? []).filter((o) => o.due >= from && o.due <= to).map((o) => ({
  id: `deco31:${o.id}`, w: o.due, kind: 'other' as const, tone: 'info' as const,
  t: fmtL(o.via === 'mail' ? l('Chega pelo correio: {n}', 'Arrives by mail: {n}') : l('Entrega da internet: {n}', 'Online delivery: {n}'), { n: decoDef31(o.def)?.name ?? l('encomenda', 'parcel') }),
  d: o.to === 'me' ? l('Na porta de casa.', 'At your front door.') : l('Na porta da sede.', 'At the HQ door.'),
  goto: { area: 'deco31' },
})));

// ---------------------------------------------------------------- editor (regra 10)

registerRunnable({ id: 'deco31.restock', area: 'items', label: l('Decoração: trocar o estoque das lojas agora', 'Decoration: restock the shops now'),
  run: (s) => { const st = decol31(s); for (const k of DECO_SHOPS31) { const x = st.stock[`${s.config.homeCity}:${k}`]; if (x) x.ym = ''; restockDecoShop31(s, s.config.homeCity, k); } return l('Estoque das lojas de decoração trocado.', 'Decoration shop stock replaced.'); } });
registerRunnable({ id: 'deco31.give', area: 'items', label: l('Decoração: dar um item (pessoal)', 'Decoration: give an item (personal)'), raw: true,
  arg: { kind: 'select', label: l('Item', 'Item'), options: () => CAT.map((d) => ({ value: d.id, label: d.name })) },
  run: (s, _t, arg) => {
    const d = decoDef31(String(arg ?? ''));
    if (!d) return { ok: false, text: l('Escolha um item.', 'Choose an item.') };
    const res = createObj(s, { modelId: `deco:${d.id}`, origin: 'edit', owner: ME31 });
    if (!res.ok) return { ok: false, text: l('Não deu.', 'Could not.') };
    const st = decol31(s);
    st.d[res.v.id] = { def: d.id, made: s.year, cond: 0, prev: [], ev: [] };
    st.at[res.v.id] = { at: 'home', w: s.week };
    checkSets31(s);
    return fmtL(l('{n} está na sua casa.', '{n} is in your home.'), { n: d.name });
  } });
registerRunnable({ id: 'deco31.take', area: 'items', label: l('Decoração: tirar todos os itens seus', 'Decoration: remove all your items'), raw: true,
  run: (s) => { const st = decol31(s); let n = 0; for (const m of decoMine31(s)) { removeObj(s, m.o.id); delete st.d[m.o.id]; delete st.at[m.o.id]; delete st.stolen[m.o.id]; n++; } return fmtL(l('{n} item(ns) tirado(s).', '{n} item(s) removed.'), { n }); } });
registerEditable({ id: 'deco31.stock', area: 'items', kind: 'number', raw: true, min: 0, max: 12, label: l('Decoração: peças por loja no mês', 'Decoration: pieces per shop each month'),
  get: () => DECOL.stock, set: (_s, v) => { DECOL.stock = clamp(Math.round(Number(v)), 0, 12); } });
registerEditable({ id: 'deco31.theft', area: 'items', kind: 'number', raw: true, min: 0, max: 50, step: 1, label: l('Decoração: chance de roubo por mês em lugar público (%)', 'Decoration: monthly theft chance in public places (%)'),
  get: () => Math.round(DECOL.theft * 100), set: (_s, v) => { DECOL.theft = clamp(Number(v), 0, 50) / 100; } });
