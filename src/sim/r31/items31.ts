// R31 · onda 3 (G · Objetos) — ITENS COM HISTÓRIA, LOJA DA CIDADE E AS TRÊS FORMAS DE COMPRA.
//
//  • Catálogo de modelos (`ItemDef31`): instrumentos de todas as épocas (antes de 1920 também), presentes e, na janela
//    da garagem, os carros e motos do catálogo de bens (goods8). Cada exemplar à venda é um OBJETO INDIVIDUAL
//    (r31/object) com origem, ano de fabricação, estado, donos anteriores com anos e acontecimentos.
//  • Loja: o estoque é gerado no MOTOR, na virada do mês (gancho mensal), de forma fixa por loja e mês
//    (`Rng.fromSeed(semente|shop31|cidade|ano-mês)`), e troca INTEIRO: nenhum modelo repete o do mês anterior. A tela
//    só lê (explorar não muda o mundo). A vitrine pode ter uma relíquia que JÁ EXISTE no mundo (com colecionador),
//    sorteada por chance de nível — Notável é comum, Rara de vez em quando, Lendária raramente, Mítica quase nunca;
//    peça de museu e o violino do Efro nunca. A oferta aponta para a peça: ela não pode estar em outra oferta.
//  • Comprar: para você (dinheiro pessoal, entra no patrimônio), para a empresa (caixa do selo, entra no acervo e no
//    balanço como compra de bem) ou de presente para qualquer pessoa que você conhece (paga com dinheiro pessoal ou da
//    empresa). O presente mexe na opinião (só via opinion.ts) pelo valor e pelo gosto: instrumento do instrumento dela
//    vale mais; vários presentes seguidos à mesma pessoa rendem cada vez menos.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { know } from '../know';
import { hasOpinion, opine } from '../opinion';
import { cashWhy20, freeCash20 } from '../oblig20';
import { GOODS, addOwned8, goodById, goodGone8, goods, type GoodCat, type GoodDef } from '../sys/goods8';
import { ownerOf } from '../sys/people/owner';
import { realOwners9, relMeta, relicPrice, relics, type Relic } from '../sys/relics9';
import type { GameState } from '../types';
import { fmtL, money, post } from '../util';
import { createObj, itemModel, obj31, offer, registerItemModel, removeObj, takeOffer, transfer, withdraw, type Holder, type ObjInst } from './object';
import { CO31, ME31, lockedRelic31, objectsOn31, relicEvent31, relicMeasure31, syncRelic31, violinOk31 } from './relic31';
import { registerEditable, registerRunnable } from './editor';
import { withTxn } from './txn';

// ---------------------------------------------------------------- catálogo

/** Família do instrumento (gosto de quem recebe) */
export type Fam31 = 'guitar' | 'bass' | 'drums' | 'keys' | 'strings' | 'horns' | 'mic' | 'dj' | 'studio';
export type ItemCat31 = 'instr' | 'gift' | 'garage';
export interface ItemDef31 {
  id: string; cat: ItemCat31; name: L; desc: L; from: number; to?: number;
  /** preço novo em dólares reais */
  price: number;
  fam?: Fam31;
  /** bem do goods8 (efeitos e patrimônio quando é seu) */
  good: string;
}
const I = (id: string, cat: ItemCat31, pt: string, en: string, dp: string, de: string, from: number, to: number | undefined, price: number, fam?: Fam31, good?: string): ItemDef31 =>
  ({ id, cat, name: l(pt, en), desc: l(dp, de), from, to, price, fam, good: good ?? `it31:${id}` });

export const ITEMS31: ItemDef31[] = [
  // instrumentos (todas as épocas; antes de 1920 também)
  I('violin', 'instr', 'Violino de oficina', 'Workshop violin', 'Madeira curada, cravelhas de ébano.', 'Seasoned wood, ebony pegs.', 1880, undefined, 900, 'strings'),
  I('upright_piano', 'instr', 'Piano de armário', 'Upright piano', 'O centro da sala de qualquer família musical.', 'The heart of any musical family\'s parlour.', 1880, 1990, 3500, 'keys'),
  I('mandolin', 'instr', 'Bandolim', 'Mandolin', 'Oito cordas para choro, serenata e bluegrass.', 'Eight strings for choro, serenades and bluegrass.', 1880, undefined, 400, 'strings'),
  I('accordion', 'instr', 'Acordeão', 'Accordion', 'Fole, botões e baile até o dia raiar.', 'Bellows, buttons and dancing till dawn.', 1880, undefined, 1200, 'keys'),
  I('banjo', 'instr', 'Banjo', 'Banjo', 'Som de vaudeville e de varanda.', 'Vaudeville and front-porch sound.', 1880, undefined, 350, 'strings'),
  I('cornet', 'instr', 'Cornetim', 'Cornet', 'O metal das bandas de coreto.', 'The brass of bandstand bands.', 1880, 1950, 450, 'horns'),
  I('clarinet', 'instr', 'Clarinete', 'Clarinet', 'Do chorinho ao swing.', 'From choro to swing.', 1880, undefined, 500, 'horns'),
  I('parlor_guitar', 'instr', 'Violão de salão', 'Parlour guitar', 'Corpo pequeno, som doce.', 'Small body, sweet tone.', 1880, 1940, 300, 'guitar'),
  I('double_bass', 'instr', 'Contrabaixo acústico', 'Double bass', 'A base de toda orquestra e combo de jazz.', 'The floor of every orchestra and jazz combo.', 1880, undefined, 1500, 'bass'),
  I('snare', 'instr', 'Caixa clara de banda', 'Marching snare', 'Rufo de desfile e de baile.', 'Parade and dance-hall rolls.', 1880, 1930, 250, 'drums'),
  I('harmonica', 'instr', 'Gaita de boca', 'Harmonica', 'Cabe no bolso, chora como gente.', 'Fits in a pocket, cries like a person.', 1880, undefined, 40, 'horns'),
  I('drum_kit', 'instr', 'Bateria completa', 'Full drum kit', 'Bumbo com pedal, caixa, pratos.', 'Pedal kick, snare, cymbals.', 1920, undefined, 1800, 'drums'),
  I('sax', 'instr', 'Saxofone tenor', 'Tenor saxophone', 'A voz do jazz e do rock\'n\'roll.', 'The voice of jazz and rock\'n\'roll.', 1915, undefined, 1400, 'horns'),
  I('trumpet', 'instr', 'Trompete', 'Trumpet', 'Brilho para big bands e mariachis.', 'Brightness for big bands and mariachis.', 1900, undefined, 900, 'horns'),
  I('ukulele', 'instr', 'Ukulele', 'Ukulele', 'Quatro cordas, sorriso garantido.', 'Four strings, guaranteed smiles.', 1900, undefined, 120, 'strings'),
  I('cavaquinho', 'instr', 'Cavaquinho', 'Cavaquinho', 'O coração da roda de samba.', 'The heart of the samba circle.', 1900, undefined, 250, 'strings'),
  I('archtop', 'instr', 'Guitarra archtop', 'Archtop guitar', 'Para as orquestras de dança.', 'For the dance orchestras.', 1925, 1975, 1600, 'guitar'),
  I('ribbon_mic', 'instr', 'Microfone de fita', 'Ribbon microphone', 'Voz quente de rádio.', 'Warm radio voice.', 1932, undefined, 1200, 'mic'),
  I('hammond', 'instr', 'Órgão elétrico', 'Electric organ', 'Gospel, jazz e rock progressivo.', 'Gospel, jazz and prog rock.', 1935, undefined, 6000, 'keys'),
  I('solid_body', 'instr', 'Guitarra elétrica de corpo sólido', 'Solid-body electric guitar', 'Alta, clara, pronta para o palco.', 'Loud, clear, stage-ready.', 1950, undefined, 2500, 'guitar'),
  I('electric_bass', 'instr', 'Baixo elétrico', 'Electric bass', 'Grave que se ouve no fundo do salão.', 'Low end you hear at the back of the hall.', 1952, undefined, 1800, 'bass'),
  I('tube_amp', 'instr', 'Amplificador valvulado', 'Valve amplifier', 'Distorce bonito no volume certo.', 'Breaks up beautifully at the right volume.', 1950, undefined, 1500, 'guitar'),
  I('condenser_mic', 'instr', 'Microfone condensador', 'Condenser microphone', 'Cada respiração gravada.', 'Every breath on tape.', 1950, undefined, 3000, 'mic'),
  I('fuzz', 'instr', 'Pedal de distorção', 'Fuzz pedal', 'O som de 1965 numa caixinha.', 'The sound of 1965 in a little box.', 1965, undefined, 150, 'guitar'),
  I('analog_synth', 'instr', 'Sintetizador analógico', 'Analogue synthesizer', 'Osciladores e filtros sem fim.', 'Endless oscillators and filters.', 1970, undefined, 4000, 'keys'),
  I('dj_decks', 'instr', 'Toca-discos de DJ', 'DJ decks', 'Dois pratos e um mixer.', 'Two decks and a mixer.', 1975, undefined, 2000, 'dj'),
  I('drum_machine', 'instr', 'Bateria eletrônica', 'Drum machine', 'Batidas que viraram gêneros.', 'Beats that became genres.', 1980, undefined, 1200, 'drums'),
  I('sampler', 'instr', 'Sampler', 'Sampler', 'Um disco vira instrumento.', 'A record becomes an instrument.', 1985, undefined, 3000, 'studio'),
  I('midi_ctrl', 'instr', 'Controlador MIDI', 'MIDI controller', 'O estúdio inteiro na ponta dos dedos.', 'The whole studio at your fingertips.', 2000, undefined, 400, 'studio'),
  I('modular', 'instr', 'Módulos de sintetizador', 'Synth modules', 'Cabos e mais cabos.', 'Cables and more cables.', 2010, undefined, 2500, 'keys'),
  // presentes
  I('flowers', 'gift', 'Buquê de flores', 'Bouquet of flowers', 'Gentileza que nunca sai de moda.', 'A kindness that never goes out of style.', 1880, undefined, 40),
  I('cigars', 'gift', 'Caixa de charutos', 'Box of cigars', 'O presente dos escritórios antigos.', 'The old-office gift.', 1880, 1995, 150),
  I('wine', 'gift', 'Vinho de safra', 'Vintage wine', 'Uma garrafa com ano no rótulo.', 'A bottle with a year on the label.', 1880, undefined, 200),
  I('champagne', 'gift', 'Champanhe', 'Champagne', 'Para comemorar o contrato.', 'To celebrate the contract.', 1880, undefined, 120),
  I('pocket_watch', 'gift', 'Relógio de bolso', 'Pocket watch', 'Corrente de ouro e tampa gravada.', 'Gold chain and engraved lid.', 1880, 1950, 600),
  I('wristwatch', 'gift', 'Relógio de pulso', 'Wristwatch', 'Clássico e preciso.', 'Classic and precise.', 1920, undefined, 800),
  I('fountain_pen', 'gift', 'Caneta-tinteiro', 'Fountain pen', 'Para assinar contratos com estilo.', 'For signing contracts in style.', 1890, undefined, 250),
  I('silk_scarf', 'gift', 'Lenço de seda', 'Silk scarf', 'Elegância de palco.', 'Stage elegance.', 1880, undefined, 180),
  I('perfume', 'gift', 'Perfume importado', 'Imported perfume', 'Um frasco de Paris.', 'A bottle from Paris.', 1900, undefined, 150),
  I('rare_book', 'gift', 'Livro raro', 'Rare book', 'Primeira edição com dedicatória.', 'First edition with an inscription.', 1880, undefined, 500),
  I('record_box', 'gift', 'Caixa de discos raros', 'Box of rare records', 'Prensagens originais garimpadas.', 'Hand-picked original pressings.', 1905, undefined, 350, 'dj'),
  I('headphones', 'gift', 'Fones de estúdio', 'Studio headphones', 'Para ouvir cada detalhe.', 'To hear every detail.', 1960, undefined, 300, 'studio'),
];
export const itemDef31 = (id: string): ItemDef31 | undefined => ITEMS31.find((x) => x.id === id) ?? GARAGE31().find((x) => x.id === id);
/** Janela da garagem: carros e motos do catálogo de bens (mesmo modelo, exemplar com história). */
const GARAGE_CACHE: ItemDef31[] = [];
function GARAGE31(): ItemDef31[] {
  if (!GARAGE_CACHE.length) for (const d of GOODS) if (d.cat === 'vehicle' && d.from < 9999)
    GARAGE_CACHE.push({ id: `g_${d.id}`, cat: 'garage', name: d.name, desc: d.desc, from: d.from, to: d.to, price: d.price, good: d.id });
  return GARAGE_CACHE;
}

// bens do goods8 para os itens da loja (efeitos e patrimônio quando é seu); "from 9999" esconde do catálogo de bens
const SKILL: Partial<Record<Fam31, GoodDef['skill']>> = { guitar: ['instr', 0.15], bass: ['instr', 0.12], drums: ['instr', 0.12], keys: ['comp', 0.15], strings: ['instr', 0.12], horns: ['instr', 0.12], mic: ['voice', 0.1], dj: ['prod', 0.1], studio: ['prod', 0.15] };
for (const d of ITEMS31) {
  if (goodById[d.good]) continue;
  const g: GoodDef = { id: d.good, cat: (d.cat === 'instr' ? 'gear' : 'collect') as GoodCat, name: d.name, desc: d.desc, from: 9999, price: d.price, upkeep: Math.max(1, Math.round(d.price / 400)), drift: d.cat === 'instr' ? 0.01 : -0.2, vol: 0.05, ...(d.fam && d.cat === 'instr' ? { skill: SKILL[d.fam] } : {}) };
  GOODS.push(g); goodById[g.id] = g;
}
for (const d of ITEMS31) registerItemModel({ id: `it:${d.id}`, kind: d.cat });

const available = (d: ItemDef31, y: number) => y >= d.from && (!d.to || y <= d.to);

// ---------------------------------------------------------------- estado

/** Detalhe do exemplar: modelo, ano de fabricação, estado (0 impecável … 3 gasto), donos anteriores com anos, acontecimentos. */
export interface ItemX31 { def: string; made: number; cond: number; prev: [string, number, number][]; ev: [number, L][] }
export interface Stock31 { ym: string; offers: string[]; models: string[]; relics: string[] }
export interface Items31St {
  stock: Record<string, Stock31>;
  d: Record<string, ItemX31>;
  /** presentes dados: [pessoa, semana] (rende menos quando repete) */
  gifts: [string, number][];
}
declare module '../ext4' { interface Ext4 { items31: Items31St } }
const fresh = (): Items31St => ({ stock: {}, d: {}, gifts: [] });
registerExt4('items31', fresh);
export function items31(s: GameState): Items31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.items31 ??= fresh()) as Items31St;
  st.stock ??= {}; st.d ??= {}; st.gifts ??= [];
  return st;
}
/** Leitura sem criar estado (interface). */
const ro = (s: GameState): Items31St | undefined => (s as unknown as { x4?: { items31?: Items31St } }).x4?.items31;

// ---------------------------------------------------------------- loja: estoque mensal

export const shopId31 = (city: string): Holder => `shop:${city}`;
/** Cidades com loja aberta para você: a sua e as de suas casas. */
export function shopCities31(s: GameState): string[] {
  const out = [s.config.homeCity];
  for (const o of goods(s).owned) { const c = goodById[o.id]?.city; if (c && !out.includes(c)) out.push(c); }
  return out;
}
const ymOf = (s: GameState) => `${s.year}-${s.month}`;
/** O gancho mensal roda no fechamento do mês (antes de virar): o estoque novo é o do mês que começa. */
const nextYm = (s: GameState) => (s.month >= 11 ? `${s.year + 1}-0` : `${s.year}-${s.month + 1}`);

const FIRST = ['Ada', 'Bento', 'Clara', 'Dino', 'Elsa', 'Fábio', 'Greta', 'Hugo', 'Irene', 'Jonas', 'Lina', 'Marco', 'Nina', 'Otto', 'Paula', 'Rui', 'Sara', 'Tito', 'Vera', 'Zeca'];
const LAST = ['Amaral', 'Becker', 'Costa', 'Duarte', 'Esposito', 'Ferraz', 'Gallo', 'Hansen', 'Ibarra', 'Jansen', 'Klein', 'Lopes', 'Moretti', 'Novak', 'Ortiz', 'Prado', 'Quintana', 'Rossi', 'Sandoval', 'Toledo'];
const PREV_EV: [string, string][] = [['tocou em bailes por anos', 'played dances for years'], ['ficou guardado num porão', 'sat in a basement'], ['foi reformado por um luthier', 'was restored by a luthier'],
  ['acompanhou uma banda de rádio', 'backed a radio band'], ['viajou numa turnê de circo', 'travelled with a circus tour'], ['foi herdado de um tio', 'was inherited from an uncle']];
const CONDM = [1.1, 1, 0.85, 0.7];
export const COND31: L[] = [l('impecável', 'mint'), l('bom', 'good'), l('gasto', 'worn'), l('muito gasto', 'well worn')];

/** Preço do exemplar (centavos da época): novo, usado ou de época. */
export function itemPrice31(s: GameState, d: ItemDef31, x: Pick<ItemX31, 'made' | 'cond'>): number {
  const age = Math.max(0, s.year - x.made);
  const vint = d.cat === 'instr' && age >= 25 ? 1 + Math.min(1.5, (age - 25) / 30) : age > 0 ? Math.max(0.45, 1 - age * 0.04) : 1;
  return Math.round(money(s, d.price * CONDM[x.cond] * vint));
}

/** Chance por nível de a vitrine trazer uma relíquia (densidade escolhida na nova partida escala). */
export const SHOWCASE31 = [0.5, 0.3, 0.08, 0.02, 0.002];
const DENS_M: Record<string, number> = { few: 0.5, normal: 0.8, many: 1, all: 1.3 };

/** Gera o estoque do mês da loja (só no motor). Nunca repete modelo do mês anterior; tira o que sobrou. */
export function restock31(s: GameState, city: string, ym = ymOf(s)): Stock31 {
  const st = items31(s);
  const old = st.stock[city];
  if (old?.ym === ym) return old;
  const venue = shopId31(city);
  // o que não foi vendido volta ao fornecedor (o exemplar sai do registro); relíquia da vitrine só sai da oferta
  for (const id of old?.offers ?? []) {
    const of = obj31(s).offers[id];
    if (!of) continue;
    const o = obj31(s).objs[of.objId];
    if (o && o.owner === venue) { removeObj(s, o.id); delete st.d[o.id]; } else withdraw(s, id);
  }
  const prev = new Set(old?.models ?? []);
  const r = Rng.fromSeed(`${s.config.seed}|shop31|${city}|${ym}`);
  const pool = (cat: ItemCat31, n: number) => r.shuffle([...(cat === 'garage' ? GARAGE31() : ITEMS31)].filter((d) => d.cat === cat && available(d, s.year) && !prev.has(d.id))).slice(0, n);
  const picks = [...pool('instr', 6), ...pool('gift', 3), ...pool('garage', 2)];
  const out: Stock31 = { ym, offers: [], models: picks.map((d) => d.id), relics: [] };
  for (const d of picks) {
    const used = d.cat !== 'gift' && r.chance(0.45) && s.year - d.from >= 4;
    const made = used ? Math.max(d.from, s.year - r.int(3, Math.min(60, s.year - d.from))) : s.year;
    const cond = used ? r.int(1, 3) : 0;
    const prevOwners: [string, number, number][] = [];
    const ev: [number, L][] = [];
    if (used) {
      let y = made;
      const n = r.int(1, 3);
      for (let i = 0; i < n && y < s.year; i++) {
        const y1 = i === n - 1 ? s.year : Math.min(s.year, y + r.int(2, Math.max(3, Math.round((s.year - made) / n))));
        prevOwners.push([`${r.pick(FIRST)} ${r.pick(LAST)}`, y, y1]);
        if (r.chance(0.5)) { const e = r.pick(PREV_EV); ev.push([Math.min(y1, y + 1), l(e[0], e[1])]); }
        y = y1;
      }
    }
    const res = createObj(s, { modelId: `it:${d.id}`, origin: used ? 'used' : 'factory', owner: venue });
    if (!res.ok) continue;
    st.d[res.v.id] = { def: d.id, made, cond, prev: prevOwners, ev };
    const of = offer(s, res.v.id, venue, itemPrice31(s, d, { made, cond }));
    if (of.ok) out.offers.push(of.v.id);
  }
  // vitrine: relíquia que já existe, com colecionador, livre de outra oferta; uma chance por nível (a mais rara primeiro)
  const dm = DENS_M[s.config.relicDensity ?? 'many'] ?? 1;
  const free = relics(s).list.filter((rl) => rl.st === 'kept' && !lockedRelic31(rl) && !rl.rr && !(rl.meta?.ob && obj31(s).objs[rl.meta.ob]?.offer)); // peça real segue a história real
  for (let t = 5; t >= 1 && !out.relics.length; t--) {
    if (!r.chance(SHOWCASE31[t - 1] * dm)) continue;
    const c = free.filter((rl) => relicMeasure31(s, rl).tier === t).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!c.length) continue;
    const rl = r.pick(c);
    syncRelicObjForShop(s, rl);
    const ob = rl.meta?.ob;
    if (!ob) continue;
    const of = offer(s, ob, venue, relicPrice(s, rl));
    if (of.ok) { out.offers.push(of.v.id); out.relics.push(rl.id); }
  }
  st.stock[city] = out;
  return out;
}
/** A peça da vitrine precisa de objeto individual (criado sem sortear nada). */
function syncRelicObjForShop(s: GameState, rl: Relic): void {
  const m = relMeta(rl);
  if (m.ob && obj31(s).objs[m.ob]) return;
  const owner = `npc:${realOwners9(rl).at(-1)?.[0] ?? '?'}`;
  const r = createObj(s, { modelId: `relic:${rl.id}`, origin: rl.rr ? 'catalog' : 'chronicle', owner: m.oh?.[0] ?? owner });
  if (r.ok) m.ob = r.v.id;
}

registerSimHook('newgame', 'items31', (s) => { if (objectsOn31(s)) for (const c of shopCities31(s)) restock31(s, c); });
registerSimHook('month', 'items31', (s) => {
  if (!objectsOn31(s)) return;
  for (const c of shopCities31(s)) restock31(s, c, nextYm(s));
  const st = items31(s);
  st.gifts = st.gifts.filter(([, w]) => s.week - w < 104);
});

// ---------------------------------------------------------------- leitura (interface)

export interface ShopRow31 { offer: string; obj: string; price: number; def?: ItemDef31; x?: ItemX31; relic?: Relic }
/** Estoque da loja para a tela (só leitura; nada é criado). */
export function shopRows31(s: GameState, city: string): ShopRow31[] {
  const stock = ro(s)?.stock[city];
  if (!stock) return [];
  const st = obj31(s);
  const out: ShopRow31[] = [];
  for (const id of stock.offers) {
    const of = st.offers[id];
    if (!of) continue;
    const o = st.objs[of.objId];
    if (!o) continue;
    if (o.modelId.startsWith('relic:')) {
      const rl = relics(s).list.find((x) => x.id === o.modelId.slice(6));
      if (rl && rl.st === 'kept') out.push({ offer: id, obj: o.id, price: of.price, relic: rl });
    } else out.push({ offer: id, obj: o.id, price: of.price, def: itemDef31(ro(s)!.d[o.id]?.def ?? ''), x: ro(s)!.d[o.id] });
  }
  return out;
}
/** Semanas até o estoque trocar (virada do mês). */
export const weeksToRestock31 = (s: GameState): number => Math.max(1, 4 - ((s.week % 4) || 0));

// ---------------------------------------------------------------- conhecidos

/** Pessoa que você conhece: já tem opinião sobre você ou laço/conhecimento direto. */
export function isKnown31(s: GameState, pid: string): boolean {
  const p = s.persons[pid];
  if (!p || !p.alive || p.isPlayer) return false;
  return hasOpinion(s, `p:${pid}`) || know(s, pid).priv >= 1;
}
/** Lista de conhecidos (interface; ordem por fama/opinião). */
export function knownPeople31(s: GameState, max = 60): string[] {
  const out: string[] = [];
  for (const p of Object.values(s.persons)) if (isKnown31(s, p.id)) { out.push(p.id); if (out.length >= max * 4) break; }
  return out.sort((a, b) => (s.persons[a].name < s.persons[b].name ? -1 : 1)).slice(0, max);
}

// ---------------------------------------------------------------- presente: efeito na opinião

const ROLE_FAM: Record<string, Fam31[]> = { guitar: ['guitar'], bass: ['bass'], drums: ['drums'], keys: ['keys'], strings: ['strings'], horns: ['horns'], vocal: ['mic'], mc: ['mic', 'dj'], dj: ['dj', 'studio'], producer: ['studio', 'keys'] };
export interface GiftEffect31 { delta: number; why: L[] }
/** Quanto o presente mexe na opinião (puro). `usd` em dólares reais. */
export function giftEffect31(s: GameState, pid: string, usd: number, fam?: Fam31, relic = false): GiftEffect31 {
  const p = s.persons[pid];
  const why: L[] = [];
  let d = clamp(3 * Math.log2(1 + usd / 100), 2, 25);
  why.push(fmtL(l('Valor do presente: +{n}', 'Gift value: +{n}'), { n: Math.round(d) }));
  const mine = p ? ROLE_FAM[p.role] ?? [] : [];
  if (fam && mine.includes(fam)) { d *= 1.8; why.push(l('É do instrumento dela: vale bem mais', 'It is their own instrument: worth much more')); }
  else if (fam && p && p.role !== 'synthetic') { d *= 1.2; why.push(l('É coisa de música: agrada', 'It is a music thing: welcome')); }
  if (relic) { d *= 1.3; why.push(l('Uma relíquia: gesto raro', 'A relic: a rare gesture')); }
  const n = (ro(s)?.gifts ?? []).filter(([x, w]) => x === pid && s.week - w < 52).length;
  if (n) { d *= 0.5 ** n; why.push(fmtL(l('Já ganhou {n} presente(s) seu(s) neste ano: rende menos', 'Already got {n} gift(s) from you this year: less effect'), { n })); }
  return { delta: Math.max(1, Math.round(d)), why };
}

// ---------------------------------------------------------------- comprar

export type BuyHow31 = { k: 'me' } | { k: 'co' } | { k: 'gift'; to: string; pay: 'me' | 'co' };

function pay31(s: GameState, how: 'me' | 'co', price: number, key: string, memo: string, gift?: string): L | null {
  if (how === 'me') {
    const o = ownerOf(s);
    if (o.wealth < price) return l('Patrimônio pessoal insuficiente (sai do seu bolso, não da empresa).', 'Not enough personal wealth (it comes out of your pocket, not the company).');
    o.wealth -= price;
    return null;
  }
  if (freeCash20(s) < price) return cashWhy20(s, price, l('Caixa da empresa insuficiente.', 'Not enough company cash.'));
  withTxn({ payer: 'label', owner: 'label', beneficiary: gift ? `p:${gift}` : 'label' }, () =>
    post(s, gift ? `gift31:${key}` : `item:g31:${key}`, -price, gift ? 'promo' : 'acquisitions', memo));
  return null;
}

/** Compra pela oferta da loja, numa das três formas. Devolve erro (texto) ou o resumo do que aconteceu. */
export function buyOffer31(s: GameState, offerId: string, how: BuyHow31): L {
  const st = obj31(s);
  const of = st.offers[offerId];
  if (!of || !of.venue.startsWith('shop:')) return l('Esse item já não está à venda.', 'That item is no longer for sale.');
  const o = st.objs[of.objId];
  if (!o) return l('Esse item já não está à venda.', 'That item is no longer for sale.');
  const rl = o.modelId.startsWith('relic:') ? relics(s).list.find((x) => x.id === o.modelId.slice(6)) : undefined;
  if (o.modelId.startsWith('relic:') && (!rl || rl.st !== 'kept')) return l('A peça saiu da vitrine.', 'The piece has left the showcase.');
  const def = rl ? undefined : itemDef31(items31(s).d[o.id]?.def ?? '');
  const name = rl ? rl.n : def?.name ?? l('Item', 'Item');
  if (how.k === 'gift') {
    if (!isKnown31(s, how.to)) return l('Você só pode presentear quem conhece.', 'You can only give gifts to people you know.');
    if (rl && !violinOk31(s, rl, `p:${how.to}`)) return l('Essa peça não sai da família.', 'This piece does not leave the family.');
  }
  if (how.k === 'me' && def && !rl && goods(s).owned.length >= 24) return l('Bens demais para cuidar: venda algo antes.', 'Too many things to look after: sell something first.');
  const payer = how.k === 'gift' ? how.pay : how.k;
  const err = pay31(s, payer, of.price, o.id, `${how.k === 'gift' ? 'Presente' : 'Compra'}: ${name.pt}`, how.k === 'gift' ? how.to : undefined);
  if (err) return err;
  const buyer: Holder = how.k === 'me' ? ME31 : how.k === 'co' ? CO31 : `p:${how.to}`;
  const tk = takeOffer(s, offerId, buyer);
  if (!tk.ok) return l('Esse item já não está à venda.', 'That item is no longer for sale.');
  const stock = Object.values(items31(s).stock).find((x) => x.offers.includes(offerId));
  if (stock) stock.offers = stock.offers.filter((x) => x !== offerId);
  const usd = rl ? rl.v : (def?.price ?? 0);
  if (rl) {
    const pname = how.k === 'gift' ? s.persons[how.to].name : how.k === 'me' ? (Object.values(s.persons).find((p) => p.isPlayer)?.name ?? s.config.companyName) : s.config.companyName;
    rl.own.push([pname, s.year, how.k === 'gift' ? 'presente' : 'loja']);
    const m = relMeta(rl);
    m.hi = Math.max(m.hi ?? 0, rl.v); // compra sua não é recorde (parte ligada a você)
    m.mine = 1;
    if (how.k === 'gift') { rl.st = 'kept'; m.oh = [`p:${how.to}`, realOwners9(rl).length]; relicEvent31(rl, `gift:${s.week}:${how.to}`, 'gift', s.year); }
    else { rl.st = 'player'; m.po = how.k; }
    m.ps = rl.st;
    syncRelic31(s, rl);
  } else if (how.k === 'me' && def) {
    addOwned8(s, def.good, of.price, o.id);
  }
  let res = how.k === 'me' ? fmtL(l('{n} agora é seu (patrimônio pessoal).', '{n} is now yours (personal wealth).'), { n: name })
    : how.k === 'co' ? fmtL(l('{n} entra no acervo da empresa.', '{n} joins the company collection.'), { n: name }) : name;
  if (how.k === 'gift') {
    const ef = giftEffect31(s, how.to, usd, def?.fam, !!rl);
    opine(s, `p:${how.to}`, ef.delta, fmtL(l('Ganhou de presente: {n}', 'Got a gift: {n}'), { n: name }));
    items31(s).gifts.push([how.to, s.week]);
    if (items31(s).gifts.length > 200) items31(s).gifts.splice(0, items31(s).gifts.length - 200);
    const p = s.persons[how.to];
    emitFact(s, { kind: 'gift', actors: ['player', how.to], severity: Math.min(40, 5 + ef.delta), visibility: 'public', tags: ['gift', 'good'], src: 'items31',
      text: fmtL(l('Você presenteia {p} com {n}.', 'You give {p} {n}.'), { p: p.name, n: name }), diary: true });
    res = fmtL(l('{p} recebe {n}: a opinião sobre você sobe (+{d}).', '{p} receives {n}: their opinion of you rises (+{d}).'), { p: p.name, n: name, d: ef.delta });
  }
  return res;
}
export const buyErr31 = (r: L): boolean => /insuficiente|não está|saiu da|só pode|não sai|demais/.test(r.pt);

/** Dar de presente algo que JÁ é seu (relíquia do acervo/pessoal). */
export function giveRelic31(s: GameState, relicId: string, pid: string): L | null {
  const rl = relics(s).list.find((x) => x.id === relicId);
  if (!rl || rl.st !== 'player' || rl.ln) return l('A peça não está livre com você.', 'The piece is not free in your hands.');
  if (!isKnown31(s, pid)) return l('Você só pode presentear quem conhece.', 'You can only give gifts to people you know.');
  if (!violinOk31(s, rl, `p:${pid}`)) return l('Essa peça não sai da família.', 'This piece does not leave the family.');
  const p = s.persons[pid];
  rl.st = 'kept'; rl.ex = undefined;
  rl.own.push([p.name, s.year, 'presente']);
  const m = relMeta(rl);
  m.oh = [`p:${pid}`, realOwners9(rl).length];
  relicEvent31(rl, `gift:${s.week}:${pid}`, 'gift', s.year);
  m.ps = 'kept';
  if (m.ob) transfer(s, m.ob, `p:${pid}`);
  syncRelic31(s, rl);
  const ef = giftEffect31(s, pid, rl.v, undefined, true);
  opine(s, `p:${pid}`, ef.delta, fmtL(l('Ganhou de presente: {n}', 'Got a gift: {n}'), { n: rl.n }));
  items31(s).gifts.push([pid, s.week]);
  emitFact(s, { kind: 'gift', actors: ['player', pid], severity: Math.min(50, 10 + ef.delta), visibility: 'public', tags: ['gift', 'relic', 'good'], src: 'items31',
    text: fmtL(l('Você dá {n} de presente a {p}.', 'You give {n} to {p} as a gift.'), { p: p.name, n: rl.n }), diary: true });
  return null;
}

// bem vendido/retomado/roubado no goods8: o exemplar muda de mãos
goodGone8.f = (s, o, how) => {
  if (!o.ob || !obj31(s).objs[o.ob]) return;
  transfer(s, o.ob, how === 'stolen' ? 'world:thief' : 'npc:mercado');
  const x = items31(s).d[o.ob];
  if (x) x.ev.push([s.year, how === 'sold' ? l('vendido por você', 'sold by you') : how === 'repo' ? l('retomado por falta de manutenção', 'repossessed for unpaid upkeep') : l('roubado da sua casa', 'stolen from your home')]);
};

/** Itens com história de um dono (seus, da empresa ou de uma pessoa). */
export function itemsOf31(s: GameState, h: Holder): { o: ObjInst; x: ItemX31; def: ItemDef31 }[] {
  const st = ro(s);
  if (!st) return [];
  const out: { o: ObjInst; x: ItemX31; def: ItemDef31 }[] = [];
  for (const o of Object.values(obj31(s).objs)) {
    if (o.owner !== h || !o.modelId.startsWith('it:')) continue;
    const x = st.d[o.id];
    const def = x && itemDef31(x.def);
    if (x && def) out.push({ o, x, def });
  }
  return out;
}
export const modelKnown31 = (id: string): boolean => !!itemModel(id);

// ---------------------------------------------------------------- editor (regra 10)

registerRunnable({ id: 'items31.restock', area: 'items', label: l('Trocar o estoque da loja agora', 'Restock the shop now'),
  run: (s) => { const c = s.config.homeCity; const st = items31(s); if (st.stock[c]) st.stock[c].ym = ''; restock31(s, c); return l('Estoque trocado.', 'Stock replaced.'); } });
registerEditable({ id: 'relic.tier', area: 'items', target: 'relic', label: l('Nível (só leitura: sai do valor e da história)', 'Level (read only: comes from value and history)'), kind: 'text', raw: true,
  get: (s, id) => { const rl = relics(s).list.find((x) => x.id === id); return rl ? String(relicMeasure31(s, rl).tier) : ''; },
  set: () => l('O nível não se edita: mude o valor ou a história da peça.', 'The level cannot be edited: change the value or the history of the piece.') });
registerEditable({ id: 'relic.value', area: 'items', target: 'relic', label: l('Valor (US$ reais)', 'Value (real US$)'), kind: 'number', min: 0, raw: true,
  get: (s, id) => relics(s).list.find((x) => x.id === id)?.v ?? 0,
  set: (s, v, id) => { const rl = relics(s).list.find((x) => x.id === id); if (!rl) return l('Peça não encontrada.', 'Piece not found.'); rl.v = Math.max(0, Math.round(Number(v))); } });
