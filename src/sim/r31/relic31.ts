// R31 · onda 3 (G · Objetos + UNI-3/B.18) — RELÍQUIA COM DEFINIÇÃO ÚNICA, NÍVEIS E OBJETO INDIVIDUAL.
//
// A peça é a `Relic` de sys/relics9 (com `rl.meta`, onde moram os dados extras que antes ficavam em x4.relics18.m e
// x4.relics29.m). Aqui:
//  • NÍVEIS (Comum, Notável, Rara, Lendária, Mítica): saem do valor e da história, nunca de sorteio. Quatro medidas
//    separadas — preço, raridade, autenticidade e importância — e uma lista de motivos (vários caminhos por nível).
//    Anti-exploração: cada acontecimento tem identificador e conta UMA vez; o mesmo tipo repetido rende metade a cada
//    vez; venda entre partes ligadas a você não vale como recorde; peça de museu (catálogo real em museu) é Mítica e
//    nunca está à venda; Mítica negociável só com muita história (raríssima). A interface não mostra "o que falta".
//  • SINCRONIA com o objeto individual (r31/object): a peça que entra em oferta (leilão, vitrine de loja), muda de mãos
//    para você/para alguém por presente ou é fixa ganha um `ObjInst` (modelo `relic:<id>`, único). Roubo muda quem está
//    com ela (holder), não o dono; leilão é uma oferta; a loja só oferece peça sem outra oferta.
//  • Roubo e reaparecimento entram na lista de donos (como acontecimento; o dono não muda).
//  • VIOLINO DO EFRO: relíquia fixa, Mítica em todo save, nunca à venda nem para rival; roubado, sempre volta.
//    (Frente Z cria a família; se ela já criou a peça com o mesmo id, aqui só valem as regras.)

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pastSteps17, relicDef17 } from '../relics17';
import { crime17 } from '../sys/crime17';
import { meta18 } from '../sys/relics18';
import {
  addRelic, openingBid, ownerName, realOwners9, relMeta, relicGone9, relicHook, relicPrice, relics,
  type Relic, type RelicEv, type RelicEvK, type RelicStatus,
} from '../sys/relics9';
import type { GameState } from '../types';
import { fmtL, money } from '../util';
import { createObj, obj31, offer, recover, registerModelResolver, removeObj, steal, transfer, withdraw, type Holder } from './object';
import { registerSwitch, sw } from './switches';

// ---------------------------------------------------------------- interruptor

registerSwitch({
  id: 'objects31', def: true, scope: 'game',
  desc: l('Objetos da onda 3: loja com estoque mensal, compra para você/empresa/presente, níveis de relíquia pela história e regras anti-exploração.',
    'Wave 3 objects: shop with monthly stock, buying for you/the company/as a gift, relic levels from history and anti-exploit rules.'),
});
export const objectsOn31 = (s: GameState): boolean => sw<boolean>(s, 'objects31');

// ---------------------------------------------------------------- lugares (holders)

/** Acervo da empresa (selo do jogador). */
export const CO31: Holder = 'label:player';
export const ME31: Holder = 'player';
registerModelResolver('relic:', (id) => ({ id, kind: 'relic', unique: true }));

// ---------------------------------------------------------------- níveis

export const TIER_NAME31: L[] = [l('Comum', 'Common'), l('Notável', 'Notable'), l('Rara', 'Rare'), l('Lendária', 'Legendary'), l('Mítica', 'Mythic')];
/** Pontos mínimos de cada nível (2–5). Mítica exige também importância (história) alta: valor sozinho não chega lá. */
export const TIER_PTS31 = [0, 5, 9, 14, 21];
export const MYTH_IMPORTANCE31 = 12;

/** Pontos-base por tipo de acontecimento (o mesmo tipo repetido vale metade a cada vez). */
export const EV_PTS31: Record<RelicEvK, number> = {
  n1: 3, gold: 2, show: 3, cover: 2, legend: 4, hof: 3, young: 3, broke: 2, stolen: 1, recov: 2, record: 3, scandal: 2, museum: 2, last: 2, gift: 1, mine: 0,
};
export const EV_NAME31: Record<RelicEvK, L> = {
  n1: l('Gravou um nº 1', 'Recorded a number one'), gold: l('Disco de ouro', 'Gold record'), show: l('Tocou num show histórico', 'Played at a historic show'),
  cover: l('Está numa capa de disco', 'On a record cover'), legend: l('Pertenceu a uma lenda', 'Belonged to a legend'), hof: l('Dono premiado (Hall da Fama)', 'Award-winning owner (Hall of Fame)'),
  young: l('O dono morreu jovem', 'The owner died young'), broke: l('Quebrada no palco', 'Broken on stage'), stolen: l('Roubada', 'Stolen'),
  recov: l('Recuperada depois de roubada', 'Recovered after a theft'), record: l('Leiloada por valor recorde', 'Sold at a record price'),
  scandal: l('Envolvida em escândalo', 'Caught up in a scandal'), museum: l('Exposta em museu', 'Shown in a museum'), last: l('A última do dono', 'The owner\'s last'),
  gift: l('Dada de presente', 'Given as a gift'), mine: l('Passou por você', 'Passed through your hands'),
};

export interface TierWhy31 { k: string; t: L; y?: number; pts: number }
/** Medidas separadas da peça. */
export interface RelicMeasure31 {
  /** preço (valor em US$ reais) */
  price: number;
  /** raridade 0–3: 3 = peça única de catálogo real, 2 = peça única de história da partida, 1 = arquétipo comum, 0 = genérica */
  rarity: number;
  /** autenticidade: documentada (catálogo real), certificada (perícia), desconhecida, falsa (conhecida) */
  auth: 'doc' | 'cert' | 'unk' | 'fake';
  /** importância: soma dos pontos de história */
  importance: number;
  /** pontos de valor (escala logarítmica do preço) */
  valuePts: number;
  /** total que define o nível */
  pts: number;
  tier: 1 | 2 | 3 | 4 | 5;
  /** peça de museu (catálogo real em museu) ou fixa (violino do Efro): nunca à venda */
  locked: boolean;
  why: TierWhy31[];
}

const MUSEUM_HOW = new Set(['museu', 'doação']);
/** Acontecimentos guardados + derivados (lidos na hora, com identificador estável). */
export function relicEvents31(s: GameState, rl: Relic): RelicEv[] {
  const out: RelicEv[] = [...(rl.meta?.ev ?? [])];
  const add = (id: string, k: RelicEvK, y: number) => { if (!out.some((e) => e.id === id)) out.push({ id, k, y }); };
  const a = rl.a ? s.acts[rl.a] : undefined;
  if (a) {
    if (a.legend) add(`legend:${a.id}`, 'legend', rl.y);
    if (a.number1s > 0) add(`n1:${a.id}`, 'n1', rl.y);
    else if (a.hits > 0) add(`gold:${a.id}`, 'gold', rl.y);
    if (a.awards >= 3) add(`hof:${a.id}`, 'hof', rl.y);
  }
  const p = rl.p ? s.persons[rl.p] : undefined;
  if (p && !p.alive && p.died && p.died - p.born < 35) add(`young:${p.id}`, 'young', p.died);
  // origem da peça (relics18/28/29)
  const o = rl.meta?.o;
  const ORIG: Record<string, RelicEvK> = { show: 'show', mega: 'show', hit: 'n1', cover: 'cover', master: 'cover', reissue: 'cover', scandal: 'scandal', stage: 'broke', fire: 'broke', death: 'last', award: 'hof', farewell: 'show', icon: 'show' };
  if (o && ORIG[o]) add(`orig:${o}`, ORIG[o], rl.y);
  const q = rl.meta?.q;
  if (q) {
    const ai = +q.split('|')[0];
    const ARCH: Record<number, RelicEvK> = { 1: 'broke', 18: 'broke', 19: 'scandal', 22: 'cover', 12: 'last' };
    if (ARCH[ai]) add(`arch:${ai}`, ARCH[ai], rl.y);
  }
  // história real documentada (catálogo)
  if (rl.rr) {
    const d = relicDef17(rl.rr);
    if (d) pastSteps17(s, d).forEach((st, i) => {
      if (st[2] === 'gone') add(`real:${i}`, 'stolen', st[0]);
      else if (st[2] === 'found') add(`real:${i}`, 'recov', st[0]);
      else if (st[2] === 'museum') add(`real:${i}`, 'museum', st[0]);
      else if (st[2] === 'auction' && st[3] >= 250000) add(`real:${i}`, 'record', st[0]);
    });
  }
  // museu pela lista de donos (uma vez)
  const mu = rl.own.find((x) => MUSEUM_HOW.has(x[2]));
  if (mu) add('museum:own', 'museum', mu[1]);
  return out.sort((x, y) => x.y - y.y || (x.id < y.id ? -1 : 1));
}

const fakeKnown = (rl: Relic): boolean => /\(falsificação\)|\(forgery\)/.test(rl.n.pt + rl.n.en);
/** Peça de museu (nunca à venda): catálogo real hoje num museu, ou peça fixa. */
export const lockedRelic31 = (rl: Relic): boolean => !!rl.meta?.fix || (!!rl.rr && rl.st === 'museum');

/** Medidas e nível. Puro (não grava nada). */
export function relicMeasure31(s: GameState, rl: Relic): RelicMeasure31 {
  const why: TierWhy31[] = [];
  // importância: acontecimentos (id único; repetição rende metade a cada vez)
  const seen: Partial<Record<RelicEvK, number>> = {};
  let imp = 0;
  for (const e of relicEvents31(s, rl)) {
    const n = (seen[e.k] = (seen[e.k] ?? 0) + 1);
    const pts = Math.round(EV_PTS31[e.k] * 0.5 ** (n - 1) * 10) / 10;
    if (pts <= 0) continue;
    imp += pts;
    why.push({ k: e.k, t: EV_NAME31[e.k], y: e.y, pts });
  }
  // várias mãos famosas (donos de verdade, sem roubo/reaparecimento; teto 3)
  const owners = new Set(realOwners9(rl).map((o) => o[0])).size;
  if (owners >= 3) { const pts = Math.min(3, owners - 2); imp += pts; why.push({ k: 'hands', t: fmtL(l('Passou por {n} donos', 'Went through {n} owners'), { n: owners }), pts }); }
  // tempo: décadas (1 ponto a cada 20 anos, teto 3)
  const age = Math.max(0, s.year - rl.y);
  if (age >= 20) { const pts = Math.min(3, Math.floor(age / 20)); imp += pts; why.push({ k: 'age', t: fmtL(l('Sobreviveu {n} anos', 'Survived {n} years'), { n: age }), pts }); }
  if (rl.rr) { imp += 4; why.push({ k: 'doc', t: l('História real documentada', 'Documented real history'), pts: 4 }); }
  imp = Math.round(imp * 10) / 10;
  // raridade
  const rarity = rl.rr ? 3 : rl.meta?.fix ? 3 : rl.meta?.q ? (/^(13|15|17|21)\|/.test(rl.meta.q) ? 0 : 1) : 2;
  if (rarity) why.push({ k: 'rar', t: rarity === 3 ? l('Peça única', 'One of a kind') : rarity === 2 ? l('Peça única desta história', 'Unique to this story') : l('Poucas iguais', 'Few like it'), pts: rarity });
  // autenticidade
  const auth: RelicMeasure31['auth'] = fakeKnown(rl) ? 'fake' : rl.rr ? 'doc' : meta18(rl)?.auth ? 'cert' : 'unk';
  const authPts = auth === 'cert' ? 1 : 0;
  if (authPts) why.push({ k: 'auth', t: l('Autenticidade certificada', 'Certified authentic'), pts: authPts });
  // preço (escala log: US$ 500 = 0 … US$ 5 milhões = 6)
  const price = Math.max(0, rl.v);
  const valuePts = Math.round(clamp(Math.log10(Math.max(1, price / 500)) * 1.5, 0, 6) * 10) / 10;
  if (valuePts > 0) why.push({ k: 'val', t: l('Valor de mercado', 'Market value'), pts: valuePts });
  const pts = Math.round((imp + rarity + authPts + valuePts) * 10) / 10;
  let tier = (TIER_PTS31.filter((x) => pts >= x).length) as RelicMeasure31['tier'];
  if (tier === 5 && imp < MYTH_IMPORTANCE31) tier = 4;
  const locked = lockedRelic31(rl);
  if (locked) { tier = 5; why.unshift({ k: rl.meta?.fix ? 'fix' : 'museum', t: rl.meta?.fix ? l('Relíquia de família, nunca à venda', 'A family heirloom, never for sale') : l('Peça de museu, nunca à venda', 'A museum piece, never for sale'), pts: 0 }); }
  if (auth === 'fake') tier = 1;
  return { price, rarity, auth, importance: imp, valuePts, pts, tier, locked, why };
}
/** Nível 1–5 (para cenas e listas). */
export const relicTierOf31 = (s: GameState, rl: Relic): number => relicMeasure31(s, rl).tier;

// ---------------------------------------------------------------- acontecimentos guardados

/** Registra um acontecimento na peça. Conta uma vez por id (repetir a mesma chamada não soma). */
export function relicEvent31(rl: Relic, id: string, k: RelicEvK, y: number): boolean {
  const m = relMeta(rl);
  m.ev ??= [];
  if (m.ev.some((e) => e.id === id)) return false;
  m.ev.push({ id, k, y });
  if (m.ev.length > 24) m.ev.splice(0, m.ev.length - 24); // teto: os mais antigos já pesam pouco (metade a cada repetição)
  return true;
}

/** Venda limpa (sem parte ligada a você) por preço acima do maior já pago: vira recorde. `price` em US$ reais. */
export function noteSale31(s: GameState, rl: Relic, price: number, related: boolean): boolean {
  const m = relMeta(rl);
  const prev = m.hi;
  if (related) return false; // compra e venda entre partes ligadas a você não é recorde (nem mexe no maior preço)
  m.hi = Math.max(prev ?? 0, Math.round(price));
  if (prev === undefined || price <= prev * 1.1 || price < 50000) return false;
  return relicEvent31(rl, `record:${s.week}`, 'record', s.year);
}

// ---------------------------------------------------------------- objeto individual (sincronia)

/** Dono "lugar" que a peça deveria ter pelo estado do relics9. */
export function relicHolder31(rl: Relic): Holder {
  const m = rl.meta;
  if (rl.st === 'player') return m?.po === 'me' ? ME31 : CO31;
  if (rl.st === 'museum') return `museum:${ownerName(rl)}`;
  if (rl.st === 'lost') return 'world:lost';
  const real = realOwners9(rl);
  if (m?.oh && m.oh[1] === real.length) return m.oh[0];
  return `npc:${real[real.length - 1]?.[0] ?? '?'}`;
}
const AUCTION31 = 'auction:relics';
/** Põe o objeto individual em dia com a peça (cria quando precisa). Não sorteia nada. */
export function syncRelicObj31(s: GameState, rl: Relic): void {
  const m = relMeta(rl);
  const owner = relicHolder31(rl);
  const need = !!m.ob || rl.st === 'auction' || rl.st === 'player' || !!m.fix;
  if (!need) return;
  const st = obj31(s);
  let o = m.ob ? st.objs[m.ob] : undefined;
  if (!o) {
    const r = createObj(s, { modelId: `relic:${rl.id}`, origin: rl.rr ? 'catalog' : 'chronicle', owner, holder: rl.st === 'stolen' ? 'world:thief' : owner });
    if (!r.ok) return;
    o = r.v; m.ob = o.id;
  }
  if (o.owner !== owner && rl.st !== 'stolen') transfer(s, o.id, owner); // roubo não muda o dono
  if (rl.st === 'stolen' && o.holder === o.owner) steal(s, o.id, 'world:thief');
  else if (rl.st !== 'stolen' && o.holder !== o.owner) recover(s, o.id);
  const of = o.offer ? st.offers[o.offer] : undefined;
  if (rl.st === 'auction') {
    if (of && of.venue !== AUCTION31) withdraw(s, of.id);
    if (!o.offer) offer(s, o.id, AUCTION31, openingBid(s, rl));
  } else if (of && (of.venue === AUCTION31 || rl.st !== 'kept')) withdraw(s, of.id);
}

/** Transições de estado viram acontecimento e linha na lista de donos (roubo, reaparecimento, museu, venda). */
export function syncRelic31(s: GameState, rl: Relic): void {
  const m = relMeta(rl);
  const prev = m.ps;
  // violino do Efro: roubado, sempre volta (no mesmo fechamento)
  if (m.fix === 'efro' && rl.st === 'stolen' && prev && prev !== 'stolen') {
    relicEvent31(rl, `stolen:${s.week}`, 'stolen', s.year);
    rl.own.push([ownerName(rl), s.year, 'roubada']);
    rl.st = prev === 'player' ? 'player' : 'kept';
    relicEvent31(rl, `recov:${s.week}`, 'recov', s.year);
    rl.own.push([ownerName(rl), s.year, 'reapareceu']);
    emitFact(s, { kind: 'relic', actors: [], severity: 40, visibility: 'public', tags: ['relic', 'recovered', 'family'], src: 'relic31',
      text: fmtL(l('{n} é roubado — e volta para casa no mesmo mês.', '{n} is stolen — and back home the same month.'), { n: rl.n }), diary: true });
  }
  if (prev !== undefined && prev !== rl.st) {
    if (rl.st === 'stolen') { relicEvent31(rl, `stolen:${s.week}`, 'stolen', s.year); rl.own.push([ownerName(rl), s.year, 'roubada']); }
    if (prev === 'stolen' && (rl.st === 'kept' || rl.st === 'player' || rl.st === 'museum')) {
      relicEvent31(rl, `recov:${s.week}`, 'recov', s.year);
      // era sua quando sumiu: volta para você (o relics9 devolve "ao último dono")
      if (rl.st === 'kept' && realOwners9(rl).at(-1)?.[0] === s.config.companyName) rl.st = 'player';
      const last = rl.own[rl.own.length - 1];
      if (!(last && last[1] === s.year && last[2] === 'achado')) rl.own.push([ownerName(rl), s.year, 'reapareceu']);
    }
    if (prev === 'auction' && rl.st === 'kept') noteSale31(s, rl, rl.v, false); // arremate por colecionador (ninguém ligado a você)
  }
  if (rl.st === 'player') { m.mine = 1; m.po ??= 'co'; } else if (m.po) delete m.po;
  if (rl.st !== 'kept' && m.oh) delete m.oh;
  m.ps = rl.st;
  syncRelicObj31(s, rl);
}
export function syncRelics31(s: GameState): void { for (const rl of relics(s).list) syncRelic31(s, rl); }

// arquivar a peça tira o objeto individual do registro (o resumo fica no arquivo compacto do relics9)
relicGone9.f = (s, rl) => { if (rl.meta?.ob) removeObj(s, rl.meta.ob); };

// ---------------------------------------------------------------- violino do Efro

export const EFRO_VIOLIN_ID = 'rl_efro_violin';
const efroPid = (s: GameState): string | undefined => Object.values(s.persons).find((p) => p.name === 'Efro Fossati')?.id;
/** Garante o violino (idempotente). Se a frente Z já criou a peça com este id, só marca as regras. */
export function ensureEfroViolin31(s: GameState): Relic {
  let rl = relics(s).list.find((x) => x.id === EFRO_VIOLIN_ID);
  if (!rl) {
    rl = addRelic(s, 'prop', l('O violino do Efro', 'Efro\'s violin'), undefined, efroPid(s), 60000, Math.min(s.year, 1898), EFRO_VIOLIN_ID);
    rl.own[0] = ['Efro Fossati', Math.min(s.year, 1898), 'origem'];
  }
  const m = relMeta(rl);
  m.fix = 'efro';
  const pid = efroPid(s);
  if (pid && rl.st === 'kept' && !m.oh && realOwners9(rl).length === 1) m.oh = [`p:${pid}`, 1];
  m.st ??= l('O violino de Efro Fossati — engenheiro, empresário, violinista, piloto e tenista. Toca nos almoços de família há gerações. (Homenagem.)',
    'Efro Fossati\'s violin — engineer, businessman, violinist, pilot and tennis player. It has played at family lunches for generations. (A tribute.)');
  m.o ??= 'base'; m.b ??= rl.v;
  return rl;
}
/** O violino nunca vai para rival: destino permitido só você, a empresa e a família. */
export function violinOk31(s: GameState, rl: Relic, to: Holder): boolean {
  if (rl.meta?.fix !== 'efro') return true;
  if (to === ME31 || to === CO31) return true;
  const pid = to.startsWith('p:') ? to.slice(2) : '';
  return /Fossati$/.test(s.persons[pid]?.name ?? '');
}

registerSimHook('newgame', 'relic31', (s) => { ensureEfroViolin31(s); syncRelics31(s); });
registerSimHook('month', 'relic31', (s) => {
  ensureEfroViolin31(s);
  syncRelics31(s);
  // o mercado negro do crime17 nunca oferece peça fixa (violino do Efro)
  const cm = crime17(s);
  if (cm.market.some((x) => x.rl === EFRO_VIOLIN_ID)) cm.market = cm.market.filter((x) => x.rl !== EFRO_VIOLIN_ID);
});

// ---------------------------------------------------------------- valor explicado por inteiro

registerExplain('relic.value', (s, c) => {
  const rl = relics(s).list.find((x) => x.id === c.id);
  if (!rl) return null;
  const meta = meta18(rl);
  const parts: { label: L; value: number; fmt: 'money' | 'mult'; tone?: 'good' | 'bad' }[] = [];
  const base = money(s, meta?.b ?? rl.v);
  parts.push({ label: l('Valor de origem', 'Original value'), value: base, fmt: 'money' });
  if (!rl.rr) {
    // legado do relics18 (mesma conta do gancho anual)
    const lg = (meta?.lg ?? 1);
    if (Math.abs(lg - 1) > 0.005) parts.push({ label: l('Legado do artista e idade (recalculado todo ano)', 'Artist legacy and age (recalculated yearly)'), value: Math.round(lg * 100) / 100, fmt: 'mult', tone: 'good' });
    const drift = base > 0 ? money(s, rl.v) / (base * (meta?.lg ?? 1)) : 1;
    if (Math.abs(drift - 1) > 0.01) parts.push({ label: l('Mercado (leilões, mortes, escândalos, danos)', 'Market (auctions, deaths, scandals, damage)'), value: Math.round(drift * 100) / 100, fmt: 'mult', tone: drift >= 1 ? 'good' : 'bad' });
  }
  parts.push({ label: l('Valor de mercado', 'Market value'), value: money(s, rl.v), fmt: 'money' });
  const hype = relicHook.f(s, rl);
  if (Math.abs(hype - 1) > 0.005) parts.push({ label: l('Hype da peça', 'Buzz around the piece'), value: Math.round(hype * 100) / 100, fmt: 'mult', tone: hype >= 1 ? 'good' : 'bad' });
  if (rl.st === 'auction') parts.push({ label: l('Arremate já (sobre o lance inicial)', 'Buy now (over the opening bid)'), value: 1.25, fmt: 'mult' });
  else if (rl.st === 'kept') parts.push({ label: l('Pedida do dono', 'Owner\'s asking markup'), value: 1.3, fmt: 'mult' });
  const price = rl.st === 'auction' || rl.st === 'kept' ? relicPrice(s, rl) : money(s, rl.v);
  parts.push({ label: l('Preço final', 'Final price'), value: price, fmt: 'money' });
  return { title: l('Valor da relíquia', 'Relic value'), value: price, fmt: 'money', parts,
    note: rl.rr ? l('Peça real: o valor de mercado segue os leilões reais; o preço pedido soma o hype e a margem do dono.', 'Real piece: market value follows real auctions; the asking price adds buzz and the owner\'s markup.')
      : l('Valor de origem × legado (fama, nº 1, prêmios, lenda, morte, idade) × mercado = valor; × hype × margem = preço.', 'Original value × legacy (fame, #1s, awards, legend, death, age) × market = value; × buzz × markup = price.') };
});

// ---------------------------------------------------------------- estado (nada além do que mora na peça)

declare module '../ext4' { interface Ext4 { relic31: { v: 1 } } }
registerExt4('relic31', () => ({ v: 1 }));

/** Texto do "como entrou" de uma linha da lista de donos (bilíngue). */
export const OWN_HOW31: Record<string, L> = {
  origem: l('origem', 'origin'), compra: l('compra', 'purchase'), 'leilão': l('leilão', 'auction'), 'herança': l('herança', 'inheritance'), 'doação': l('doação', 'donation'),
  achado: l('achado', 'found'), museu: l('museu', 'museum'), presente: l('presente', 'gift'), roubada: l('roubada', 'stolen'), reapareceu: l('reapareceu', 'resurfaced'),
  saqueada: l('saqueada', 'looted'), 'mercado negro': l('mercado negro', 'black market'), loja: l('loja', 'shop'),
};
export const ownHow31 = (how: string): L => OWN_HOW31[how] ?? l(how, how);
/** Pista de nível para listas: estrelas. */
export const tierStars31 = (t: number): string => '★'.repeat(t) + '☆'.repeat(5 - t);
export type { RelicStatus };
