// R31 · DECO-L — LOJAS DE DECORAÇÃO, COMPRA A DISTÂNCIA, ÉPOCA/VINTAGE E OS SEUS ESTABELECIMENTOS. Interruptor
// `deco31.shops` (padrão ligado; desligado = o jogo de hoje). Proposta aprovada: docs/r31/deco.md (frente DECO-L).
// Catálogo e motor são os da DECO-M (`data/deco31.ts`, `sim/r31/deco31.ts`): aqui só se VENDE e se ENTREGA a peça, e
// se acrescentam os seus estabelecimentos aos lugares decoráveis do motor dela.
//
//  • Quatro lojas na cidade (prédios com arte própria — pred31): móveis/loja de departamentos, antiquário/brechó,
//    eletrônicos/hi-fi e galeria. O estoque troca INTEIRO na virada do mês pelo motor da vitrine (vitrine31 chama
//    `restockDeco31` como chama a loja de instrumentos: sem gancho próprio, sem cópia paralela). Cada peça à venda é um
//    OBJETO ÚNICO do registro (r31/object, modelo `deco:<id>` da DECO-M) com ano, estado, donos anteriores e
//    acontecimentos; a oferta aponta para a instância. Sorte pura por chave (`Rng.fromSeed(semente|deco31|…)`): não gasta
//    fluxo do jogo, por isso os goldens não mudam. O primeiro estoque sai na primeira semana (gancho semanal).
//  • Comprar: para você (dinheiro pessoal → a peça vai para a sua casa) ou para a empresa (caixa → sede), no primeiro
//    lugar livre que serve (ou na gaveta). Robôs não compram decoração.
//  • Compra a distância: catálogo pelo correio (1900+, entrega em semanas) e internet (2000+, entrega em dias, na semana
//    seguinte). Paga na hora; a peça nasce (objeto único) quando chega, na porta (aviso na caixa de entrada + fato).
//    Entrega pendente tem data no calendário.
//  • Época: o item aparece no ano de lançamento e sai de linha no ano de fim (`inLine31` da DECO-M); depois só usado
//    (antiquário, preço `vintagePrice31` que sobe ano a ano) ou leilão. Peça RARA (fora de linha e cara) não vai ao
//    antiquário: quem já compra decoração vê, de tempos em tempos, uma entrar num pregão da casa de leilões que já existe.
//  • Conjunto completo de uma época (todas as peças de um estilo, suas ou da empresa) = conquista (fato público).
//  • Estabelecimentos: casa de shows comprada, loja/bar do selo, festival próprio, sala de ensaio, filiais e terrenos do
//    LOTE entram como lugares do motor da DECO-M (`registerDecoVenues31`); levar a peça de um lugar a outro é o
//    `placeDeco31` dela (MESMA instância). Peça em lugar aberto ao público aparece para os clientes (efeito `crowd` com
//    teto; casa de shows comprada: ocupação, gancho em venues17) e pode ser roubada pelo submundo que já existe (facção
//    da cidade, `steal` do registro de objetos: muda quem está com a peça, nunca o dono).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { DECO31, STYLE31, STYLE31_L, decoDef31, inLine31, vintagePrice31, type DecoCat31, type DecoDef31, type DecoSlot31, type DecoStyle31 } from '../../data/deco31';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { buildings18 } from '../sys/campus18';
import { peekLots31 } from '../sys/lots31';
import { DECO27, FAMHOME27, MUSIC27, UNDER27, npcName27, type Place27 } from '../sys/place27';
import { addRelic, relics, type RelicKind } from '../sys/relics9';
import { underOrgs31 } from '../sys/under31';
import { VENUE_DECO17 } from '../sys/venues17';
import { ventures } from '../sys/ventures9';
import { ownerOf } from '../sys/people/owner';
import type { GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { decoFx31, decoOn31, decoPlace31, deco31, placeDeco31, registerDecoVenues31, whereIs31, type DecoPlaceDef31, type DecoRoom31, type DecoSpot31 } from './deco31';
import { registerEditable, registerRunnable } from './editor';
import { createObj, obj31, offer, removeObj, steal, takeOffer, withdraw, type Holder, type ObjInst } from './object';
import { purse } from './purse31';
import { CO31, ME31 } from './relic31';
import { registerSwitch, sw } from './switches';
import { withTxn } from './txn';
import { registerVitSource31, type VitWhen31 } from './vitrine31';

export type { DecoDef31, DecoSlot31, DecoStyle31 };

// ---------------------------------------------------------------- interruptor e regras

export const SW_DECO_SHOPS31 = 'deco31.shops';
registerSwitch({
  id: SW_DECO_SHOPS31, def: true, scope: 'game',
  desc: l('Decoração · lojas: móveis, antiquário, eletrônicos e galeria na cidade (estoque do mês), catálogo pelo correio e internet, itens por época, decorar os seus estabelecimentos (peça exposta atrai público e pode ser roubada). Desligado: nada disso existe.',
    'Decoration · shops: furniture, antiques, electronics and gallery in town (monthly stock), mail-order and online catalogue, items by era, decorating your venues (displayed items draw a crowd and can be stolen). Off: none of this exists.'),
});
/** Lojas ligadas (precisa da decoração da DECO-M ligada também). */
export const decoShopsOn31 = (s: GameState): boolean => sw<boolean>(s, SW_DECO_SHOPS31) && decoOn31(s);

/** Regras editáveis (editor). */
export const DECOL = {
  /** peças por loja no mês */
  stock: 6,
  /** chance por mês de roubo de uma peça exposta em lugar público (com facção na cidade) */
  theft: 0.04,
  /** semanas da entrega pelo correio [mín, máx] */
  mail: [3, 6] as [number, number],
  /** anos entre peças raras que entram no leilão (só para quem já compra decoração) */
  rareEvery: 2,
  /** peça rara: fora de linha e com preço novo a partir disto (US$ reais) */
  rarePrice: 700,
};

// ---------------------------------------------------------------- catálogo (o da DECO-M) por loja

export type DecoShopK31 = 'furniture' | 'antique' | 'hifi' | 'gallery';
export const DECO_SHOPS31: DecoShopK31[] = ['furniture', 'antique', 'hifi', 'gallery'];
/** Loja que vende a peça nova (o antiquário vende usado de todas). */
export const SELL31: Record<DecoCat31, Exclude<DecoShopK31, 'antique'>> = {
  furniture: 'furniture', lamp: 'furniture', plant: 'furniture', paper: 'furniture', ground: 'furniture', light: 'furniture', window: 'furniture',
  hifi: 'hifi', art: 'gallery', collect: 'gallery', sign: 'gallery',
};
export { inLine31 };
/** Fora de linha (já saiu): só usado, antiquário ou leilão. */
export const outOfLine31 = (d: Pick<DecoDef31, 'to'>, y: number): boolean => d.to !== undefined && y >= d.to;
/** Peça rara: saiu de linha e era cara — não vai ao antiquário, só ao leilão. */
export const rare31 = (d: DecoDef31, y: number): boolean => outOfLine31(d, y) && d.price >= DECOL.rarePrice;

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
  furniture: l('Móveis, luminárias, plantas, tapetes, cortinas e papel de parede novos da época.', 'New furniture, lamps, plants, rugs, curtains and wallpaper of the era.'),
  antique: l('Peças usadas de outras épocas, com história. Fora de linha, o preço "vintage" sobe ano a ano.', 'Used pieces from other eras, with a history. Once discontinued, the "vintage" price rises year by year.'),
  hifi: l('Aparelhos de som e imagem da época: do gramofone à caixa inteligente.', 'Sound and picture sets of the era: from the gramophone to the smart speaker.'),
  gallery: l('Quadros, pôsteres, discos emoldurados, enfeites de coleção e letreiros.', 'Paintings, posters, framed records, collectibles and signs.'),
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
export type DecoHow31 = 'me' | 'co';
export interface DecoOrd31 { id: string; def: string; via: DecoVia31; w: number; due: number; to: DecoHow31; paid: number }
export interface DecoL31St {
  stock: Record<string, DecoStock31>;
  d: Record<string, DecoX31>;
  ord: DecoOrd31[];
  /** estilos completos (conquista) */
  sets: DecoStyle31[];
  /** compras feitas por você (0 = nunca: nada de raro no leilão) */
  buys: number;
  stolen: Record<string, { w: number; org: string; at: string }>;
  /** relíquias raras de decoração postas em leilão: relíquia → modelo */
  rare: Record<string, string>;
  rareY?: number;
  n: number;
}
declare module '../ext4' { interface Ext4 { decol31: DecoL31St } }
const fresh = (): DecoL31St => ({ stock: {}, d: {}, ord: [], sets: [], buys: 0, stolen: {}, rare: {}, n: 0 });
registerExt4('decol31', fresh);
export function decol31(s: GameState): DecoL31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.decol31 ??= fresh()) as DecoL31St;
  st.stock ??= {}; st.d ??= {}; st.ord ??= []; st.sets ??= []; st.stolen ??= {}; st.rare ??= {};
  return st;
}
/** Leitura sem criar estado (interface). */
export const peekDecol31 = (s: GameState): DecoL31St | undefined => (s as unknown as { x4?: { decol31?: DecoL31St } }).x4?.decol31;

// ---------------------------------------------------------------- preço

const CONDM = [1.1, 1, 0.85, 0.7];
export const DECO_COND31: L[] = [l('impecável', 'mint'), l('bom', 'good'), l('gasto', 'worn'), l('muito gasto', 'well worn')];
/** Fator de época: novo = 1; usado ainda em linha perde valor; fora de linha segue o "vintage" da DECO-M (sobe ano a ano). */
export function vintage31(d: DecoDef31, y: number, made: number): number {
  if (outOfLine31(d, y)) return vintagePrice31(d, y) / Math.max(1, d.price);
  return made >= y ? 1 : Math.max(0.45, 1 - 0.05 * (y - made));
}
/** Preço do exemplar (dinheiro da época). */
export function shopPrice31(s: GameState, d: DecoDef31, x: Pick<DecoX31, 'made' | 'cond'>): number {
  return Math.max(1, Math.round(money(s, Math.max(10, d.price) * CONDM[x.cond] * vintage31(d, s.year, x.made))));
}
/** Preço no catálogo a distância (novo): correio com frete, internet um pouco mais barata. */
export const remotePrice31 = (s: GameState, d: DecoDef31, via: DecoVia31): number => Math.max(1, Math.round(money(s, Math.max(10, d.price) * (via === 'mail' ? 1.08 : 0.95))));

// ---------------------------------------------------------------- estoque do mês (motor; a tela só lê)

const ymOf = (s: GameState) => `${s.year}-${s.month}`;
const nextYm = (s: GameState) => (s.month >= 11 ? `${s.year + 1}-0` : `${s.year}-${s.month + 1}`);
const FIRST = ['Alda', 'Bruno', 'Cecília', 'Diogo', 'Estela', 'Flávio', 'Glória', 'Heitor', 'Inês', 'Joel', 'Lúcia', 'Mauro', 'Noêmia', 'Orlando', 'Pietra', 'Raul', 'Selma', 'Túlio', 'Vânia', 'Wagner'];
const LAST = ['Almeida', 'Bastos', 'Carvalho', 'Dias', 'Esteves', 'Fontes', 'Guerra', 'Holanda', 'Leme', 'Macedo', 'Neves', 'Oliva', 'Pacheco', 'Queiroz', 'Rezende', 'Salles', 'Teles', 'Valente', 'Xavier', 'Zanetti'];
const PREV_EV: [string, string][] = [['enfeitou a sala de um casarão', 'graced the parlour of a mansion'], ['passou anos num sótão', 'spent years in an attic'], ['foi restaurado com cuidado', 'was carefully restored'],
  ['decorou um salão de baile', 'decorated a dance hall'], ['veio de um espólio', 'came from an estate sale'], ['ficou na vitrine de um hotel', 'stood in a hotel lobby']];

/** O que a loja pode ter no ano (sem raras; o antiquário só tem o que já tem idade). */
function poolOf(k: DecoShopK31, y: number): DecoDef31[] {
  if (k === 'antique') return DECO31.filter((d) => d.from <= y - 8 && !rare31(d, y));
  return DECO31.filter((d) => SELL31[d.cat] === k && inLine31(d, y));
}
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
  const y = Number(ym.split('-')[0]);
  if (y < SHOP_FROM31[k]) return out;
  const r = Rng.fromSeed(`${s.config.seed}|deco31|${city}|${k}|${ym}`);
  const all = poolOf(k, y).sort((a, b) => (a.id < b.id ? -1 : 1));
  let pool = all.filter((d) => !prevModels.has(d.id));
  if (pool.length < DECOL.stock) pool = all; // catálogo curto na época: repete o modelo (outra peça, outra instância)
  // antiquário: metade do que já saiu de linha (o "vintage"), o resto usado ainda em linha
  const picks = k === 'antique'
    ? [...r.shuffle(pool.filter((d) => outOfLine31(d, y))).slice(0, Math.ceil(DECOL.stock / 2)), ...r.shuffle(pool.filter((d) => !outOfLine31(d, y)))].slice(0, DECOL.stock)
    : r.shuffle([...pool]).slice(0, DECOL.stock);
  for (const d of picks) {
    const used = k === 'antique';
    const last = Math.min(d.to ?? y, y);
    const made = used ? Math.max(d.from, last - 1 - r.int(0, Math.max(0, Math.min(25, last - 1 - d.from)))) : y;
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
    const of = offer(s, res.v.id, venue, shopPrice31(s, d, { made, cond }));
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
  for (const k of DECO_SHOPS31) {
    if (when === 'edit') { const x = peekDecol31(s)?.stock[`${s.config.homeCity}:${k}`]; if (x) x.ym = ''; }
    restockDecoShop31(s, s.config.homeCity, k, ym);
  }
}
registerVitSource31('decoshop31', restockDeco31);
/** Interruptor desligado no meio da partida: o que as lojas tinham à venda volta ao fornecedor (o que é seu fica seu). */
export function clearDeco31(s: GameState): void {
  const st = peekDecol31(s);
  if (!st) return;
  for (const [key, sk] of Object.entries(st.stock)) {
    for (const id of sk.offers) {
      const of = obj31(s).offers[id];
      const o = of ? obj31(s).objs[of.objId] : undefined;
      if (o && of && o.owner === of.venue) { removeObj(s, o.id); delete st.d[o.id]; } else if (of) withdraw(s, id);
    }
    delete st.stock[key];
  }
}

// ---------------------------------------------------------------- no mapa: as lojas ocupam prédios da cidade comum

const ROLE31: Record<DecoShopK31, L> = { furniture: l('Gerente da loja', 'Store manager'), antique: l('Antiquário(a)', 'Antique dealer'), hifi: l('Vendedor(a) de som', 'Sound salesperson'), gallery: l('Galerista', 'Gallerist') };
/** Nome do prédio que junta as lojas quando falta terreno (galeria comercial → centro comercial → shopping). */
export const mallName31 = (y: number): L => (y < 1950 ? l('Galeria Comercial', 'Shopping Arcade') : y < 1990 ? l('Centro Comercial', 'Shopping Centre') : l('Shopping', 'Shopping Mall'));
/** Puro: as lojas abertas ocupam prédios comuns (escritório, hotel, moradia, loja repetida), dos menos vistos para os
 *  mais. Sempre aparecem: faltando terreno, as que sobram dividem o último prédio (galeria comercial); sem nenhum
 *  prédio comum, ocupam o prédio de cidade comum menos visto que não é lugar básico da música. */
export function decoPlacesOnMap31(s: GameState, out: Place27[]): void {
  const open = decoShopsOpen31(s);
  if (!open.length) return;
  // a cidade comum repete a loja de instrumentos/da época: a primeira fica
  const firstShop = out.findIndex((p) => p.k === 'instruments');
  const base = (p: Place27) => p.src === 'fill' && !p.venue && !p.org && !p.fam31 && !p.lot31 && !p.deco31 && !p.outlet;
  const free = (p: Place27, i: number) => base(p) && (p.k === 'office' || p.k === 'apartments' || p.k === 'hotel' || (p.k === 'instruments' && i !== firstShop));
  // a Casa Fossati (vem depois) fica com o primeiro prédio de moradia livre: não mexe nele
  const famFree = (p: Place27, i: number) => free(p, i) && p.k !== 'instruments';
  const famApt = out.findIndex((p, i) => famFree(p, i) && p.k === 'apartments');
  const famAt = FAMHOME27.fn ? (famApt >= 0 ? famApt : out.findIndex(famFree)) : -1;
  let idx = [...out.keys()].filter((i) => i !== famAt && free(out[i], i)).reverse();
  if (!idx.length) idx = [...out.keys()].filter((i) => base(out[i]) && !MUSIC27.includes(out[i].k) && i !== firstShop).reverse().slice(0, 1);
  if (!idx.length) return;
  // deixa terreno para o submundo (fachadas, delegacia, beco), que vem depois: as lojas ficam com o que sobra (mínimo 1)
  const under = UNDER27.fn?.(s).length ?? 0;
  const n = Math.max(1, Math.min(idx.length - under, open.length));
  for (let j = 0; j < n; j++) {
    const i = idx[j];
    const ks = j === n - 1 ? open.slice(j) : [open[j]];
    const k = ks[0];
    const lot = out[i].lot;
    const owner = npcName27(s, `deco31|${k}`);
    const rows = ks.reduce((a, x) => a + shopRows31(s, x).length, 0);
    const mall = ks.length > 1;
    out[i] = { id: `pl:${lot}`, lot, k: 'office', name: mall ? mallName31(s.year) : shopName31(k, s.year),
      what: mall ? fmtL(l('{n} lojas de decoração: {l}.', '{n} decoration shops: {l}.'), { n: ks.length, l: ks.map((x) => shopName31(x, s.year).pt).join(', ') }) : SHOP_WHAT31[k], owner, ownerK: 'npc',
      now: rows ? fmtL(l('{n} peça(s) à venda este mês; estoque novo em {w} semana(s).', '{n} piece(s) for sale this month; new stock in {w} week(s).'), { n: rows, w: weeksToRestockDeco31(s) }) : l('Vitrine sendo arrumada.', 'Window being dressed.'),
      people: ks.map((x) => ({ name: npcName27(s, `deco31|${x}`), role: ROLE31[x], staff: true, job: 0 })), also: [], src: 'fill', draw: 'store', deco31: k, ...(mall ? { deco31x: ks.slice(1) } : {}) };
  }
}
DECO27.fn = decoPlacesOnMap31;

// ---------------------------------------------------------------- leitura (interface)

export interface DecoRow31 { offer: string; obj: string; price: number; def: DecoDef31; x: DecoX31 }
/** Estoque de uma loja para a tela (só leitura). */
export function shopRows31(s: GameState, k: DecoShopK31, city = s.config.homeCity): DecoRow31[] {
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
export const REMOTE_FROM31: Record<DecoVia31, number> = { mail: 1900, net: 2000 };
export const remoteOpen31 = (s: GameState, via: DecoVia31): boolean => decoShopsOn31(s) && s.year >= REMOTE_FROM31[via];
/** Catálogo a distância do momento (só o que está em linha). */
export function remoteCat31(s: GameState, via: DecoVia31): DecoDef31[] {
  if (!remoteOpen31(s, via)) return [];
  const o: Record<string, number> = { furniture: 0, hifi: 1, gallery: 2 };
  return DECO31.filter((d) => inLine31(d, s.year)).sort((a, b) => o[SELL31[a.cat]] - o[SELL31[b.cat]] || b.from - a.from || (a.id < b.id ? -1 : 1));
}
export const remoteName31 = (via: DecoVia31, y: number): L => via === 'net' ? (y < 2010 ? l('Loja na internet', 'Online shop') : l('Aplicativo de compras', 'Shopping app'))
  : y < 1950 ? l('Catálogo pelo correio', 'Mail-order catalogue') : l('Catálogo de vendas pelo correio', 'Mail-order sales catalogue');
/** Peças de decoração suas (pessoais ou da empresa), com onde estão e se foram roubadas. */
export interface DecoMine31 { o: ObjInst; def: DecoDef31; x?: DecoX31; at?: string; stolen?: { w: number; org: string } }
export function decoMine31(s: GameState): DecoMine31[] {
  const st = peekDecol31(s);
  const objs = (s as unknown as { x4?: { obj31?: { objs: Record<string, ObjInst> } } }).x4?.obj31?.objs ?? {};
  const out: DecoMine31[] = [];
  for (const o of Object.values(objs)) {
    if ((o.owner !== ME31 && o.owner !== CO31) || !o.modelId.startsWith('deco:')) continue;
    const def = decoDef31(o.modelId.slice(5));
    if (def) out.push({ o, def, x: st?.d[o.id], at: whereIs31(s, o.id), stolen: st?.stolen[o.id] });
  }
  return out.sort((a, b) => (a.o.id < b.o.id ? -1 : 1));
}
export const weeksToRestockDeco31 = (s: GameState): number => Math.max(1, 4 - ((s.week % 4) || 0));

// ---------------------------------------------------------------- comprar

const NO = (pt: string, en: string) => ({ ok: false as const, text: l(pt, en) });
function pay(s: GameState, how: DecoHow31, price: number, key: string, memo: string): L | null {
  if (how === 'me') {
    const o = ownerOf(s);
    if (o.wealth < price) return l('Patrimônio pessoal insuficiente (sai do seu bolso, não da empresa).', 'Not enough personal wealth (it comes out of your pocket, not the company).');
    purse(s, -price, 'goods', 'deco31:shop', { who: o, ben: 'me' });
    return null;
  }
  if (freeCash20(s) < price) return cashWhy20(s, price, l('Caixa da empresa insuficiente.', 'Not enough company cash.'));
  withTxn({ payer: 'label', owner: 'label', beneficiary: 'label' }, () => post(s, `decol31:${key}`, -price, 'acquisitions', memo));
  return null;
}
/** Motivo do bloqueio antes do clique (ou null). */
export function buyLock31(s: GameState, how: DecoHow31, price: number): L | null {
  if (!decoShopsOn31(s)) return l('As lojas de decoração estão desligadas nesta partida.', 'Decoration shops are off in this game.');
  if (how === 'me') return ownerOf(s).wealth < price ? l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.') : null;
  return freeCash20(s) < price ? cashWhy20(s, price, l('Caixa da empresa insuficiente.', 'Not enough company cash.')) : null;
}
/** Põe a peça nova no primeiro lugar livre que serve (casa para você, sede para a empresa); sem lugar, fica na gaveta. */
export function autoPlace31(s: GameState, objId: string, how: DecoHow31): string | undefined {
  const d = decoDef31(obj31(s).objs[objId]?.modelId.slice(5) ?? '');
  const p = decoPlace31(s, how === 'me' ? 'home' : 'sede');
  if (!d || !p || !d.places.includes(p.kind)) return undefined;
  const used = deco31(s).at;
  for (const slot of d.slots) for (const r of p.rooms) for (const sp of r.spots) {
    const key = `${p.key}|${r.id}|${sp.id}`;
    if (sp.slot === slot && !used[key] && placeDeco31(s, objId, key).ok) return key;
  }
  return undefined;
}
/** Leva a peça (a MESMA instância) para o primeiro lugar livre que serve num lugar seu (casa, sede, estabelecimento). */
export function moveTo31(s: GameState, objId: string, placeKey: string): { ok: boolean; text: L } {
  const d = decoDef31(obj31(s).objs[objId]?.modelId.slice(5) ?? '');
  const p = decoPlace31(s, placeKey);
  if (!d || !p) return NO('Lugar ou peça não encontrados.', 'Place or piece not found.');
  if (!d.places.includes(p.kind)) return NO('Essa peça não combina com esse lugar.', 'This piece does not suit that place.');
  const used = deco31(s).at;
  for (const slot of d.slots) for (const r of p.rooms) for (const sp of r.spots) {
    const key = `${p.key}|${r.id}|${sp.id}`;
    if (sp.slot !== slot || (used[key] && used[key] !== objId)) continue;
    const res = placeDeco31(s, objId, key);
    if (res.ok) { decol31(s).d[objId]?.ev.push([s.year, fmtL(l('levada para {p}', 'moved to {p}'), { p: p.name })]); return { ok: true, text: fmtL(l('{n} agora está em {p} · {r}.', '{n} is now at {p} · {r}.'), { n: d.name, p: p.name, r: r.name }) }; }
  }
  return NO('Não há lugar livre que sirva para essa peça lá.', 'There is no free spot that fits this piece there.');
}
const whereTxt = (s: GameState, key: string | undefined, how: DecoHow31): L => {
  if (!key) return how === 'me' ? l('na gaveta da casa', 'in the home drawer') : l('na gaveta da sede', 'in the HQ drawer');
  const [pk, rid] = key.split('|');
  const p = decoPlace31(s, pk);
  const r = p?.rooms.find((x) => x.id === rid);
  return fmtL(l('{p} · {r}', '{p} · {r}'), { p: p?.name ?? l('?', '?'), r: r?.name ?? l('?', '?') });
};

/** Compra na loja (oferta da peça única): para você (vai para a sua casa) ou para a empresa (vai para a sede). */
export function buyShop31(s: GameState, offerId: string, how: DecoHow31): { ok: boolean; text: L } {
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
  st.buys++;
  const at = autoPlace31(s, o.id, how);
  checkSets31(s);
  return { ok: true, text: fmtL(how === 'me' ? l('{n} agora é seu: {w}.', '{n} is now yours: {w}.') : l('{n} é da empresa: {w}.', '{n} belongs to the company: {w}.'), { n: def.name, w: whereTxt(s, at, how) }) };
}

/** Encomenda a distância: paga agora; a peça (objeto único) nasce quando chega. Correio: semanas; internet: dias. */
export function orderDeco31(s: GameState, defId: string, via: DecoVia31, how: DecoHow31): { ok: boolean; text: L } {
  const d = decoDef31(defId);
  if (!d) return NO('Item desconhecido.', 'Unknown item.');
  if (!remoteOpen31(s, via)) return via === 'net' ? NO('Ainda não existe compra pela internet.', 'Online shopping does not exist yet.') : NO('Ainda não existe catálogo pelo correio.', 'There is no mail-order catalogue yet.');
  if (!inLine31(d, s.year)) return NO('Fora de linha: só usado, no antiquário, ou em leilão.', 'Discontinued: only used, at the antique shop, or at auction.');
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
    const at = autoPlace31(s, res.v.id, od.to);
    n++;
    const text = fmtL(od.via === 'mail' ? l('Chegou pelo correio, na porta {d}: {n} ({w}).', 'Arrived by mail at the {d} door: {n} ({w}).') : l('Entrega da internet na porta {d}: {n} ({w}).', 'Online delivery at the {d} door: {n} ({w}).'),
      { n: d.name, d: od.to === 'me' ? l('de casa', 'home') : l('da sede', 'HQ'), w: whereTxt(s, at, od.to) });
    emitFact(s, { kind: 'deco_delivery', actors: ['player'], severity: 3, visibility: 'secret', tags: ['deco', 'delivery'], src: 'decoshop31', text, diary: true });
    notify(s, text, 'good');
  }
  st.ord = keep;
  if (n) checkSets31(s);
  return n;
}

// ---------------------------------------------------------------- conjunto completo de uma época

/** Progresso de cada estilo: quantas das peças dele você (ou a empresa) tem — inclusive a rara ganha em leilão. */
export function setProgress31(s: GameState): { style: DecoStyle31; have: number; of: number; done: boolean }[] {
  const mine = new Set(decoMine31(s).filter((m) => !m.stolen && m.o.holder === m.o.owner).map((m) => m.def.id));
  const st = peekDecol31(s);
  for (const [rid, id] of Object.entries(st?.rare ?? {})) if (relics(s).list.find((x) => x.id === rid)?.st === 'player') mine.add(id);
  const done = new Set(st?.sets ?? []);
  return STYLE31.map((style) => {
    const all = DECO31.filter((d) => d.style === style);
    return { style, have: all.filter((d) => mine.has(d.id)).length, of: all.length, done: done.has(style) };
  });
}
export function checkSets31(s: GameState): DecoStyle31[] {
  const st = decol31(s);
  const got: DecoStyle31[] = [];
  for (const p of setProgress31(s)) {
    if (p.done || !p.of || p.have < p.of) continue;
    st.sets.push(p.style); got.push(p.style);
    const text = fmtL(l('Conquista: conjunto completo de decoração {e}.', 'Achievement: complete {e} decoration set.'), { e: STYLE31_L[p.style] });
    emitFact(s, { kind: 'deco_set', actors: ['player'], severity: 15, visibility: 'public', tags: ['deco', 'achievement', 'good'], src: 'decoshop31', text, diary: true });
    notify(s, text, 'good');
  }
  return got;
}

// ---------------------------------------------------------------- seus estabelecimentos no motor da DECO-M

/** Cômodo-modelo do estabelecimento (mesmo desenho de lugares do motor: superfícies + paredes, chão, mesa). */
function roomOf(id: string, name: L, n: number, f: number, d: number, o: { window?: boolean; sign?: boolean; req?: string[] } = {}): DecoRoom31 {
  const sp: DecoSpot31[] = [{ id: 'paper', slot: 'paper', x: 0.5, y: 0.3 }, { id: 'ground', slot: 'ground', x: 0.5, y: 0.95 }, { id: 'ceil', slot: 'ceiling', x: 0.5, y: 0.04 }];
  if (o.window !== false) sp.push({ id: 'win', slot: 'window', x: 0.5, y: 0.32 });
  if (o.sign) sp.push({ id: 'sign', slot: 'sign', x: 0.5, y: 0.02 });
  for (let i = 0; i < n; i++) sp.push({ id: `w${i + 1}`, slot: 'wall', x: (i + 1) / (n + 1), y: 0.36 });
  for (let i = 0; i < f; i++) sp.push({ id: `f${i + 1}`, slot: 'floor', x: (i + 0.5) / f, y: 0.86 });
  for (let i = 0; i < d; i++) sp.push({ id: `d${i + 1}`, slot: 'desk', x: 0.35 + 0.3 * (i / Math.max(1, d - 1 || 1)), y: 0.62 });
  return { id, name, spots: sp, req: o.req ?? [] };
}
const R_BAR = l('Bar', 'Bar'), R_HALL = l('Salão', 'Hall'), R_SHOP = l('Loja', 'Shop'), R_STAGE = l('Palco', 'Stage'), R_ROOM = l('Sala', 'Room'), R_OFFICE = l('Escritório', 'Office');
/** Tipo de cada estabelecimento seu e se é aberto ao público (o motor da DECO-M só sabe 'venue'). */
export type EstK31 = 'venue' | 'store' | 'fest' | 'studio' | 'rehearsal' | 'branch' | 'lot' | 'club';
const PUB31: Record<EstK31, boolean> = { venue: true, store: true, fest: true, club: true, studio: false, rehearsal: false, branch: false, lot: false };
/** Tipo do estabelecimento pela chave do lugar (`venue:b:<prédio>`, `venue:lot:<n>`, `venue:club`, `venue:<empreendimento>`). */
export function estKind31(s: GameState, key: string): EstK31 | null {
  if (key === 'venue:club') return 'club';
  if (key.startsWith('venue:lot:')) return 'lot';
  if (key.startsWith('venue:b:')) {
    const b = buildings18(s).find((x) => `venue:b:${x.id}` === key);
    return b ? (b.kind === 'venue' || b.kind === 'store' || b.kind === 'fest' || b.kind === 'rehearsal' || b.kind === 'branch' ? b.kind : null) : null;
  }
  if (key.startsWith('venue:')) { const v = ventures(s).list.find((x) => `venue:${x.id}` === key); return v ? (v.kind === 'festival' ? 'fest' : 'studio') : null; }
  return null;
}
/** Lugares que a DECO-L acrescenta (prédios do campus que não são da DECO-M e os terrenos do LOTE). PURO. */
export function estPlaces31(s: GameState): DecoPlaceDef31[] {
  if (!decoShopsOn31(s)) return [];
  const out: DecoPlaceDef31[] = [];
  const add = (key: string, name: L, rooms: DecoRoom31[]) => out.push({ key, kind: 'venue', name, rooms });
  for (const b of buildings18(s)) {
    if (b.st === 'sold' || b.st === 'closed' || b.st === 'planned') continue;
    // estúdio/festival dos empreendimentos e a casa de shows da carreira já são lugares da DECO-M
    if (b.id.startsWith('v:') || b.id === 'lv:venue') continue;
    const nm = (pt: string, en: string) => l(`${pt} · ${b.name}`, `${en} · ${b.name}`);
    const key = `venue:b:${b.id}`;
    if (b.kind === 'venue') add(key, nm('Casa de shows', 'Venue'), [roomOf('stage', R_STAGE, 2, 2, 0, { sign: true, window: false }), roomOf('bar', R_BAR, 2, 3, 1, { window: false })]);
    else if (b.kind === 'store') add(key, nm('Loja do selo', 'Label shop'), [roomOf('shop', R_SHOP, 3, 3, 2, { sign: true }), roomOf('bar', R_BAR, 2, 2, 1)]);
    else if (b.kind === 'fest') add(key, nm('Festival', 'Festival'), [roomOf('stage', R_STAGE, 2, 3, 0, { sign: true, window: false }), roomOf('bar', R_BAR, 2, 3, 1, { window: false })]);
    else if (b.kind === 'rehearsal') add(key, nm('Sala de ensaio', 'Rehearsal room'), [roomOf('room', R_ROOM, 2, 2, 1)]);
    else if (b.kind === 'branch') add(key, nm('Filial', 'Branch'), [roomOf('office', R_OFFICE, 2, 2, 2, { sign: true }), roomOf('lobby', R_HALL, 2, 2, 0)]);
  }
  for (const lot of Object.keys(peekLots31(s)?.own ?? {}).map(Number).sort((a, b) => a - b))
    add(`venue:lot:${lot}`, fmtL(l('Seu terreno nº {n}', 'Your plot no. {n}'), { n: lot }), [roomOf('room', R_ROOM, 2, 2, 1)]);
  return out;
}
registerDecoVenues31('decoshop31', estPlaces31);
/** O lugar (chave do motor) é aberto ao público? */
export const placePub31 = (s: GameState, key: string): boolean => { const k = estKind31(s, key); return !!k && PUB31[k]; };
/** Peças postas num lugar (chave do motor da DECO-M). */
export function decoIn31(s: GameState, placeKey: string): DecoMine31[] { return decoMine31(s).filter((m) => !m.stolen && m.at?.split('|')[0] === placeKey); }
/** Ocupação extra de uma casa de shows real sua (venues17): o efeito `crowd` do motor da DECO-M no lugar dela. */
export const venueOcc31 = (s: GameState, venueId: string): number => (decoShopsOn31(s) ? decoFx31(s, 'crowd', `venue:b:ve:${venueId}`) : 0);
VENUE_DECO17.occ = venueOcc31;

// ---------------------------------------------------------------- roubo (submundo que já existe)

/** Virada do mês: uma peça exposta em lugar aberto ao público pode ser roubada por gente de uma facção da cidade. */
export function theftDeco31(s: GameState): string[] {
  if (!decoShopsOn31(s) || !sw<boolean>(s, 'under31')) return [];
  const at = (s as unknown as { x4?: { deco31?: { at: Record<string, string> } } }).x4?.deco31?.at ?? {};
  const keys = Object.keys(at).filter((k) => placePub31(s, k.split('|')[0])).sort();
  if (!keys.length) return [];
  const orgs = underOrgs31(s).here;
  if (!orgs.length) return [];
  for (const key of keys) {
    const id = at[key];
    const o = obj31(s).objs[id];
    const d = o ? decoDef31(o.modelId.slice(5)) : undefined;
    if (!o || !d || o.holder !== o.owner) continue;
    // papel de parede, piso e cortina não saem; peça pequena some mais fácil
    if (d.slots[0] === 'paper' || d.slots[0] === 'ground' || d.slots[0] === 'window') continue;
    const r = Rng.fromSeed(`${s.config.seed}|deco31|theft|${id}|${ymOf(s)}`);
    if (!r.chance(DECOL.theft * (d.w * d.h <= 400 ? 1.3 : 0.8))) continue;
    const org = orgs[r.int(0, orgs.length - 1)];
    return stealDeco31(s, id, org.id, org.name) ? [id] : []; // no máximo uma por mês
  }
  return [];
}
/** Roubo pelo registro de objetos (muda quem está com a peça, nunca o dono) com fato e aviso. A peça sai do lugar. */
export function stealDeco31(s: GameState, objId: string, orgId: string, orgName: L): boolean {
  const st = decol31(s);
  const d = decoDef31(obj31(s).objs[objId]?.modelId.slice(5) ?? '');
  const key = whereIs31(s, objId);
  if (!d || !key || !steal(s, objId, `org:${orgId}`).ok) return false;
  const pk = key.split('|')[0];
  const pl = decoPlace31(s, pk);
  delete deco31(s).at[key];
  st.stolen[objId] = { w: s.week, org: orgId, at: pk };
  st.d[objId]?.ev.push([s.year, fmtL(l('roubado de {p}', 'stolen from {p}'), { p: pl?.name ?? l('um lugar seu', 'one of your places') })]);
  const text = fmtL(l('Roubaram {n} de {p}. Na rua dizem que foi gente de {o}.', '{n} was stolen from {p}. Word on the street says it was {o} people.'), { n: d.name, p: pl?.name ?? l('um lugar seu', 'one of your places'), o: orgName });
  emitFact(s, { kind: 'theft', actors: ['player'], place: s.config.homeCity, severity: 12, visibility: 'public', tags: ['deco', 'crime', 'theft', 'bad'], src: 'decoshop31', text, diary: true });
  notify(s, text, 'bad');
  return true;
}

// ---------------------------------------------------------------- peça rara → leilão (só para quem já compra)

const RELK: Partial<Record<DecoCat31, RelicKind>> = { art: 'art', collect: 'prop', hifi: 'prop', furniture: 'prop', lamp: 'prop', sign: 'prop' };
/** De tempos em tempos (motor, virada do mês), uma peça rara fora de linha entra num pregão da casa de leilões. */
export function rareToAuction31(s: GameState): string | null {
  const st = peekDecol31(s);
  if (!st || !st.buys || !decoShopsOn31(s) || !sw<boolean>(s, 'auction31')) return null;
  if (st.rareY !== undefined && s.year - st.rareY < DECOL.rareEvery) return null;
  const used = new Set(Object.values(st.rare));
  const pool = DECO31.filter((d) => rare31(d, s.year) && !used.has(d.id)).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!pool.length) return null;
  const r = Rng.fromSeed(`${s.config.seed}|deco31|rare|${s.year}`);
  const d = r.pick(pool);
  const rl = addRelic(s, /arcade|juke/.test(d.id) ? 'jukebox' : RELK[d.cat] ?? 'prop', d.name, undefined, undefined, Math.round(vintagePrice31(d, s.year) * 3), d.from);
  rl.own[0] = [`${r.pick(FIRST)} ${r.pick(LAST)}`, d.from, 'origem'];
  rl.st = 'auction';
  rl.au = s.week + 6;
  st.rare[rl.id] = d.id;
  st.rareY = s.year;
  notify(s, fmtL(l('O antiquário avisa: {n}, peça rara de decoração, vai a leilão.', 'The antique dealer tips you off: {n}, a rare decoration piece, is going to auction.'), { n: d.name }), 'info');
  return rl.id;
}
/** Peças raras de decoração que passaram pelos leilões (para a tela do antiquário). */
export const rareLots31 = (s: GameState): { relic: string; def: DecoDef31; st: string }[] =>
  Object.entries(peekDecol31(s)?.rare ?? {}).map(([relic, id]) => ({ relic, def: decoDef31(id)!, st: relics(s).list.find((x) => x.id === relic)?.st ?? 'lost' })).filter((x) => !!x.def);

// ---------------------------------------------------------------- ganchos (motor)

registerSimHook('week', 'decoshop31', (s) => {
  if (!decoShopsOn31(s)) return;
  // primeiro estoque da partida (ou depois de religar o interruptor): o mês atual, na primeira semana
  const ok = (ym?: string) => ym === ymOf(s) || ym === nextYm(s);
  if (decoShopsOpen31(s).some((k) => !ok(peekDecol31(s)?.stock[`${s.config.homeCity}:${k}`]?.ym))) for (const k of DECO_SHOPS31) restockDecoShop31(s, s.config.homeCity, k);
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

registerRunnable({ id: 'decol31.restock', area: 'items', label: l('Decoração: trocar o estoque das lojas agora', 'Decoration: restock the shops now'),
  run: (s) => { restockDeco31(s, 'edit'); return l('Estoque das lojas de decoração trocado.', 'Decoration shop stock replaced.'); } });
registerRunnable({ id: 'decol31.deliver', area: 'items', label: l('Decoração: entregar as encomendas agora', 'Decoration: deliver the orders now'),
  run: (s) => { const st = decol31(s); for (const o of st.ord) o.due = s.week; return fmtL(l('{n} entrega(s).', '{n} delivery(ies).'), { n: deliverDeco31(s) }); } });
registerEditable({ id: 'decol31.stock', area: 'items', kind: 'number', raw: true, min: 0, max: 12, label: l('Decoração: peças por loja no mês', 'Decoration: pieces per shop each month'),
  get: () => DECOL.stock, set: (_s, v) => { DECOL.stock = clamp(Math.round(Number(v)), 0, 12); } });
registerEditable({ id: 'decol31.theft', area: 'items', kind: 'number', raw: true, min: 0, max: 50, step: 1, label: l('Decoração: chance de roubo por mês em lugar público (%)', 'Decoration: monthly theft chance in public places (%)'),
  get: () => Math.round(DECOL.theft * 100), set: (_s, v) => { DECOL.theft = clamp(Number(v), 0, 50) / 100; } });
