// R33 · POL33-A itens 4 e 5 — MERCH E ITENS EXCLUSIVOS PELO SISTEMA DE RELÍQUIAS (`exp33.pol.merch`, desligado no código).
// Desligado: nada daqui roda (o gancho mensal sai na 1ª linha; o estado só nasce numa ação do jogador).
// Ligado, cada peça é uma `Relic` de sim/sys/relics9 (dono registrado, valor em dólar real, tipo com desenho próprio em
// relic28, níveis e história pelo relic31, vitrine/leilão/garantia pelo relic33), comprada ou ganha em:
//   festival, casa de shows, loja de discos, clube de jazz, boate, estádio, museu, aeroporto (loja de souvenir) e show.
// Peças por época: camiseta de turnê, pôster autografado, pulseira/ingresso de festival, baqueta e palheta, setlist do palco,
// passe de backstage, vinil/fita/CD de edição limitada, jaqueta de equipe, boneco de artista e o bilhete de um festival
// histórico (Woodstock 1969, Rock in Rio 1985, Live Aid 1985). Cada artista grande tem uma peça própria (guitarra quebrada
// no palco, figurino de clipe) que sai no jornal quando é comprada. Artista seu: a peça é ganha (uma por mês e artista).
// As 6 ideias aprovadas do dono, no mesmo interruptor:
//   1. MARCA PRÓPRIA de merch (linha do artista: custo fixo, renda mensal pela fama e pelo momento);
//   2. BANCA NA TURNÊ (quanto levar: o que sobra encalha, o que falta perde venda);
//   3. PIRATARIA perto de show grande (denunciar no cartório ou deixar passar);
//   4. (rádio e TV: ver outdoor33.ts, `exp33.pol.outdoors`);
//   5. VITRINE PARA A RUA (peça exposta na fachada rende movimento ao bairro);
//   6. COLECIONADORES RIVAIS (oferecem compra direta pelas peças suas; ficam com o que recusar).
// Nada sorteia pelo RNG do jogo: ofertas, preços e rivais saem de hash estável de (semente, lugar, mês).
import { clamp } from '../../core/rng';
import { COLLECTORS, addRelic, relMeta, relics, relicPrice, type Relic, type RelicKind } from '../sys/relics9';
import { l, type L } from '../../data/world';
import { cashWhy20, freeCash20 } from '../oblig20';
import { registerSwitch, sw } from '../r31/switches';
import { registerSimHook } from '../ext4';
import { chron } from '../sys/chron9';
import { addHype } from '../sys/hype12';
import { xs19 } from '../sys/mkb19';
import { histLocked } from '../history15';
import { relicTierOf31, TIER_NAME31 } from '../r31/relic31';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { INT33, type PAct27 } from '../sys/place27';
import './int1'; // o INT-1 registra o seu `INT33.acts/run` primeiro: o merch encadeia depois dele

export const SW_MERCH33 = 'exp33.pol.merch';
registerSwitch({
  id: SW_MERCH33, def: false, scope: 'game',
  desc: l('R33 POL · merch e itens exclusivos pelo sistema de relíquias (festival, casas, lojas, estádio, museu, aeroporto), marca própria, banca na turnê, pirataria, vitrine para a rua e colecionadores rivais.',
    'R33 POL · merch and exclusive items through the relic system (festival, venues, shops, stadium, museum, airport), own label, tour stand, bootlegs, street window and rival collectors.'),
});
export const merchOn = (s: GameState): boolean => !!sw<boolean>(s, SW_MERCH33);
const abs = (s: GameState): number => s.year * 12 + s.month;
const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x; };

// ---------------------------------------------------------------- onde e o quê

export type Where33 = 'festival' | 'venue' | 'records' | 'jazz' | 'nightclub' | 'stadium' | 'museum' | 'airport' | 'show';
export const WHERE33: Record<Where33, { n: L; from: number }> = {
  festival: { n: l('Barraca do festival', 'Festival stall'), from: 1889 }, venue: { n: l('Banca da casa de shows', 'Venue stand'), from: 1889 },
  records: { n: l('Loja de discos', 'Record shop'), from: 1889 }, jazz: { n: l('Clube de jazz', 'Jazz club'), from: 1920 }, nightclub: { n: l('Boate', 'Nightclub'), from: 1970 },
  stadium: { n: l('Estádio', 'Stadium'), from: 1920 }, museum: { n: l('Loja do museu', 'Museum shop'), from: 1889 }, airport: { n: l('Loja de souvenir do aeroporto', 'Airport souvenir shop'), from: 1935 },
  show: { n: l('Banca do show', 'Show stand'), from: 1889 },
};
export interface Item33 {
  id: string; kind: RelicKind; pt: string; en: string; /** valor da peça (US$ reais) */ v: number; from: number; to?: number; where: Where33[];
  /** peça própria de artista grande: fama mínima; sai no jornal quando comprada */ big?: number;
}
const ALL: Where33[] = ['festival', 'venue', 'stadium', 'airport', 'show'];
export const ITEMS33: Item33[] = [
  { id: 'tee', kind: 'outfit', pt: 'Camiseta da turnê de {a}', en: '{a} tour T-shirt', v: 60, from: 1950, where: ALL },
  { id: 'poster', kind: 'poster', pt: 'Pôster autografado de {a}', en: 'Signed poster of {a}', v: 300, from: 1920, where: ['festival', 'venue', 'records', 'jazz', 'museum', 'show'] },
  { id: 'wrist', kind: 'ticket', pt: 'Pulseira do festival ({y})', en: 'Festival wristband ({y})', v: 80, from: 1975, where: ['festival'] },
  { id: 'stub', kind: 'ticket', pt: 'Ingresso de {a} ({y})', en: '{a} ticket ({y})', v: 120, from: 1889, where: ['venue', 'stadium', 'festival', 'jazz', 'nightclub'] },
  { id: 'pick', kind: 'sticks', pt: 'Palheta e baqueta de show de {a}', en: '{a} show pick and drumstick', v: 250, from: 1950, where: ['venue', 'festival', 'show', 'stadium'] },
  { id: 'setlist', kind: 'setlist', pt: 'Setlist do palco de {a}', en: '{a} stage setlist', v: 400, from: 1950, where: ['venue', 'festival', 'show', 'jazz', 'nightclub'] },
  { id: 'pass', kind: 'ticket', pt: 'Passe de backstage de {a}', en: '{a} backstage pass', v: 500, from: 1970, where: ['venue', 'festival', 'stadium', 'nightclub'] },
  { id: 'ltd', kind: 'record', pt: 'Disco de edição limitada de {a}', en: 'Limited-edition record by {a}', v: 350, from: 1930, where: ['records', 'venue', 'jazz', 'museum'] },
  { id: 'jacket', kind: 'outfit', pt: 'Jaqueta da equipe da turnê de {a}', en: '{a} tour crew jacket', v: 450, from: 1965, where: ['festival', 'venue', 'stadium'] },
  { id: 'toy', kind: 'prop', pt: 'Boneco de {a}', en: '{a} figurine', v: 90, from: 1965, where: ['airport', 'festival', 'records', 'museum'] },
  { id: 'hist', kind: 'ticket', pt: 'Bilhete do festival histórico: {f}', en: 'Historic festival ticket: {f}', v: 3500, from: 1970, where: ['festival', 'museum', 'airport'] },
  { id: 'broken', kind: 'guitar', pt: 'Guitarra quebrada no palco por {a}', en: 'Guitar smashed on stage by {a}', v: 18000, from: 1960, where: ['venue', 'festival', 'show', 'stadium'], big: 55 },
  { id: 'clipfit', kind: 'outfit', pt: 'Figurino do clipe de {a}', en: '{a} music-video costume', v: 9000, from: 1982, where: ['venue', 'festival', 'show', 'museum'], big: 50 },
];
const HIST_FEST: { y: number; pt: string; en: string }[] = [{ y: 1969, pt: 'Woodstock 1969', en: 'Woodstock 1969' }, { y: 1985, pt: 'Rock in Rio 1985', en: 'Rock in Rio 1985' }, { y: 1985, pt: 'Live Aid 1985', en: 'Live Aid 1985' }];
/** O disco de edição limitada muda de suporte com a época. */
const ltdName = (y: number): { pt: string; en: string } => (y < 1950 ? { pt: 'Disco de goma-laca numerado de {a}', en: 'Numbered shellac record by {a}' } : y < 1990 ? { pt: 'Vinil de edição limitada de {a}', en: 'Limited-edition vinyl by {a}' }
  : y < 2008 ? { pt: 'CD de edição limitada de {a}', en: 'Limited-edition CD by {a}' } : { pt: 'Vinil colorido numerado de {a}', en: 'Numbered coloured vinyl by {a}' });

// ---------------------------------------------------------------- estado

export interface Stand33 { act: string; tour: string; units: number; left: number; price: number; lost: number; sold: number; start: number }
export interface Offer33 { rid: string; who: string; price: number; exp: number }
export interface Merch33 {
  bought: Record<string, string>; gifts: Record<string, number>; lines: Record<string, { since: number; earned: number }>; stand: Record<string, Stand33>;
  pirate: Record<string, { m: number; lvl: number; ended?: 'cartorio' | 'deixou' }>; window?: string; offers: Offer33[]; news: number; seq: number; sold: number;
}
const fresh = (): Merch33 => ({ bought: {}, gifts: {}, lines: {}, stand: {}, pirate: {}, offers: [], news: -99, seq: 0, sold: 0 });
const st = (s: GameState): Merch33 => xs19(s, 'merch33', fresh);
export const peekM33 = (s: GameState): Merch33 | undefined => (s as unknown as { x4?: Record<string, Merch33> }).x4?.merch33;
export const mineActs33 = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased);

// ---------------------------------------------------------------- ofertas (hash estável)

export interface Offer33View { key: string; where: Where33; item: Item33; act?: Act; name: L; price: number; value: number; free: boolean; bought?: string; fest?: string }
/** Artistas que aparecem nas bancas: os seus e os de fama (ordem estável). */
const POOL = new WeakMap<GameState, { w: number; xs: Act[] }>();
function pool(s: GameState): Act[] {
  const c = POOL.get(s);
  if (c && c.w === s.week) return c.xs;
  const xs = pool0(s);
  POOL.set(s, { w: s.week, xs });
  return xs;
}
function pool0(s: GameState): Act[] {
  const mine = new Set(playerActs(s));
  return Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && !a.deceased && (mine.has(a.id) || a.fame >= 25 || a.legend))
    .sort((a, b) => (mine.has(b.id) ? 1000 : 0) + b.fame - ((mine.has(a.id) ? 1000 : 0) + a.fame) || (a.id < b.id ? -1 : 1)).slice(0, 40);
}
const fill = (t: { pt: string; en: string }, a: Act | undefined, y: number, f?: { pt: string; en: string }): L =>
  l(t.pt.replace('{a}', a?.name ?? '?').replace('{y}', String(y)).replace('{f}', f?.pt ?? ''), t.en.replace('{a}', a?.name ?? '?').replace('{y}', String(y)).replace('{f}', f?.en ?? ''));
export const slotsOf33 = (w: Where33): number => (w === 'stadium' || w === 'festival' ? 5 : 4);
export function offers33(s: GameState, w: Where33, m = abs(s)): Offer33View[] {
  if (!merchOn(s) || s.year < WHERE33[w].from) return [];
  const ps = pool(s), mine = new Set(playerActs(s)), out: Offer33View[] = [];
  const used = new Set<string>();
  for (let i = 0; i < slotsOf33(w); i++) {
    const key = `${w}:${m}:${i}`, h = hs(`${s.config.seed}|m33|${key}`);
    const elig = ITEMS33.filter((x) => x.where.includes(w) && s.year >= x.from && (!x.to || s.year <= x.to));
    if (!elig.length || !ps.length) continue;
    const item = elig[h % elig.length], cand = ps.filter((a) => (!item.big || a.fame >= item.big) && !used.has(`${item.id}|${a.id}`));
    if (!cand.length) continue;
    const act = cand[Math.floor((h >>> 8) % Math.min(cand.length, 12))];
    used.add(`${item.id}|${act.id}`);
    const avail = HIST_FEST.filter((x) => x.y <= s.year), hf = avail[(h >>> 4) % Math.max(1, avail.length)];
    const base = item.id === 'ltd' ? ltdName(s.year) : item;
    const name = fill(base, act, s.year, hf);
    const free = mine.has(act.id) && !item.big && (peekM33(s)?.gifts[`${act.id}:${m}`] ?? 0) === 0;
    const value = Math.round(item.v * (item.id === 'hist' ? 1 : 0.7 + 0.8 * clamp(act.fame / 100, 0, 1)));
    out.push({ key, where: w, item, act, name, value, price: free ? 0 : Math.round(money(s, value * 1.1)), free, bought: peekM33(s)?.bought[key], fest: item.id === 'hist' ? hf?.pt : undefined });
  }
  return out;
}

/** Compra (ou ganha) a peça: vira uma `Relic` sua, com o dono registrado e a história de onde veio. */
export function buyOffer33(s: GameState, key: string): L | null {
  if (!merchOn(s)) return l('Merch desligado nesta partida.', 'Merch is off in this game.');
  const [w, mm] = key.split(':'), o = offers33(s, w as Where33, Number(mm)).find((x) => x.key === key);
  if (!o) return l('Esta oferta já passou.', 'This offer is gone.');
  if (Number(mm) !== abs(s)) return l('Esta oferta já passou.', 'This offer is gone.');
  if (peekM33(s)?.bought[key]) return l('Você já levou esta peça.', 'You already took this piece.');
  if (o.price > 0 && freeCash20(s) < o.price) return cashWhy20(s, o.price, l('Caixa livre insuficiente.', 'Not enough free cash.'));
  const m = st(s);
  if (o.price > 0) post(s, `merch33:${key}`, -o.price, 'acquisitions', `Merch: ${o.name.pt}`);
  else if (o.act) m.gifts[`${o.act.id}:${abs(s)}`] = 1;
  const rid = `rl_m33_${++m.seq}`;
  const rl = addRelic(s, o.item.kind, o.name, o.act?.id, undefined, o.value, s.year, rid);
  rl.st = 'player';
  rl.own.push([s.config.companyName, s.year, o.free ? 'presente' : 'compra']);
  Object.assign(relMeta(rl), { o: o.item.big ? 'show' : 'merch', b: rl.v, st: fmtL(l('{p}, {y}.', '{p}, {y}.'), { p: WHERE33[o.where].n, y: s.year }) });
  m.bought[key] = rid;
  if (o.item.big && o.act && abs(s) - m.news >= 1) { // peça de artista grande: notícia (no máximo uma por mês)
    m.news = abs(s);
    chron(s, { k: 'relic', i: 3, a: [o.act.id], t: fmtL(l('{c} leva {n}.', '{c} takes home {n}.'), { c: s.config.companyName, n: o.name }) });
  }
  return null;
}

// ---------------------------------------------------------------- 1 · marca própria de merch

export const lineCost33 = (s: GameState): number => Math.round(money(s, 800));
export function lineLock33(s: GameState, actId: string): L | null {
  if (!merchOn(s)) return l('Merch desligado nesta partida.', 'Merch is off in this game.');
  if (s.year < 1955) return l('Antes de 1955 não há linha de merch para abrir.', 'There is no merch line to open before 1955.');
  if (peekM33(s)?.lines[actId]) return l('A linha deste artista já está aberta.', 'This act\'s line is already open.');
  const c = lineCost33(s);
  return freeCash20(s) < c ? cashWhy20(s, c, l('Caixa livre insuficiente.', 'Not enough free cash.')) : null;
}
export function openLine33(s: GameState, actId: string): L | null {
  const lock = lineLock33(s, actId);
  if (lock) return lock;
  post(s, `merch33:line:${actId}`, -lineCost33(s), 'marketing', `Linha de merch: ${s.acts[actId]?.name}`);
  st(s).lines[actId] = { since: abs(s), earned: 0 };
  return null;
}
export const closeLine33 = (s: GameState, actId: string): L | null => { const m = peekM33(s); if (!m?.lines[actId]) return l('Não há linha aberta.', 'No open line.'); delete m.lines[actId]; return null; };
/** Renda mensal esperada da linha: fama e momento do artista; cai com pirataria solta. */
export function lineIncome33(s: GameState, a: Act): number {
  const up = clamp((a.fame + Math.max(0, a.momentum - 40)) / 120, 0.05, 1.4);
  const pir = peekM33(s)?.pirate[a.id]; const k = pir && !pir.ended ? 1 - 0.1 * pir.lvl : 1;
  return Math.round(money(s, 600 * up * k * (s.year < 1980 ? 0.7 : 1)));
}

// ---------------------------------------------------------------- 2 · banca na turnê

export const standUnits33 = [200, 500, 1000] as const;
const unitCost33 = (s: GameState): number => Math.max(1, Math.round(money(s, 8)));
const unitPrice33 = (s: GameState): number => Math.max(2, Math.round(money(s, 24)));
export function tourOf33(s: GameState, actId: string): { id: string; name: string } | undefined {
  const t = (s.tours ?? []).find((x) => x.actId === actId && x.status !== 'cancelled' && x.status !== 'done');
  return t ? { id: t.id, name: t.name } : undefined;
}
export function standLock33(s: GameState, actId: string, units: number): L | null {
  if (!merchOn(s)) return l('Merch desligado nesta partida.', 'Merch is off in this game.');
  const t = tourOf33(s, actId);
  if (!t) return l('Este artista não está em turnê agora.', 'This act is not on tour now.');
  if (peekM33(s)?.stand[t.id]?.left) return l('Já há uma banca com peças nesta turnê.', 'A stand with stock already runs on this tour.');
  const c = units * unitCost33(s);
  return freeCash20(s) < c ? cashWhy20(s, c, l('Caixa livre insuficiente.', 'Not enough free cash.')) : null;
}
export function stockStand33(s: GameState, actId: string, units: number): L | null {
  const lock = standLock33(s, actId, units);
  if (lock) return lock;
  const t = tourOf33(s, actId)!, c = units * unitCost33(s);
  post(s, `merch33:stand:${t.id}:${abs(s)}`, -c, 'merch33', `Banca da turnê: ${t.name}`);
  st(s).stand[t.id] = { act: actId, tour: t.id, units, left: units, price: unitPrice33(s), lost: 0, sold: 0, start: abs(s) };
  return null;
}

// ---------------------------------------------------------------- 3 · pirataria

export const reportCost33 = (s: GameState): number => Math.round(money(s, 500));
export function reportLock33(s: GameState, actId: string): L | null {
  const p = peekM33(s)?.pirate[actId];
  if (!p || p.ended) return l('Não há falsificação deste artista agora.', 'No bootlegs of this act right now.');
  const c = reportCost33(s);
  return freeCash20(s) < c ? cashWhy20(s, c, l('Caixa livre insuficiente.', 'Not enough free cash.')) : null;
}
/** Denunciar no cartório: 60% de chance (hash estável do mês) de acabar com a falsificação; reputação comercial +1. */
export function reportPirate33(s: GameState, actId: string): L | null {
  const lock = reportLock33(s, actId);
  if (lock) return lock;
  post(s, `merch33:cart:${actId}:${abs(s)}`, -reportCost33(s), 'legal', `Cartório: falsificação de ${s.acts[actId]?.name}`);
  const p = peekM33(s)!.pirate[actId];
  if (hs(`${s.config.seed}|m33|rep|${actId}|${abs(s)}`) % 100 < 60) { p.ended = 'cartorio'; s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100); return null; }
  return l('A denúncia foi aceita, mas a falsificação continua por enquanto.', 'The complaint was accepted, but the bootlegs go on for now.');
}
export function letPass33(s: GameState, actId: string): L | null {
  const p = peekM33(s)?.pirate[actId];
  if (!p || p.ended) return l('Não há falsificação deste artista agora.', 'No bootlegs of this act right now.');
  p.ended = 'deixou'; p.lvl = Math.max(1, p.lvl - 1);
  return null;
}

// ---------------------------------------------------------------- 5 · vitrine para a rua

export function windowLock33(s: GameState, rid: string): L | null {
  const rl = relics(s).list.find((x) => x.id === rid);
  if (!merchOn(s)) return l('Merch desligado nesta partida.', 'Merch is off in this game.');
  if (!rl || rl.st !== 'player') return l('A peça não é sua.', 'The piece is not yours.');
  if (peekM33(s)?.window === rid) return l('A peça já está na vitrine.', 'The piece is already in the window.');
  return null;
}
export function setWindow33(s: GameState, rid: string): L | null { const e = windowLock33(s, rid); if (e) return e; st(s).window = rid; return null; }
export function clearWindow33(s: GameState): L | null { const m = peekM33(s); if (!m?.window) return l('A vitrine está vazia.', 'The window is empty.'); m.window = undefined; return null; }
/** O que a vitrine rende por mês: movimento do bairro (renda pequena) pelo nível da peça. */
export function windowIncome33(s: GameState): number {
  const rid = peekM33(s)?.window, rl = rid ? relics(s).list.find((x) => x.id === rid && x.st === 'player') : undefined;
  return rl ? Math.round(money(s, 40 * (1 + relicTierOf31(s, rl)))) : 0;
}
export const myRelics33 = (s: GameState): Relic[] => relics(s).list.filter((r) => r.st === 'player').sort((a, b) => b.v - a.v || (a.id < b.id ? -1 : 1));

// ---------------------------------------------------------------- 6 · colecionadores rivais

export function acceptOffer33(s: GameState, rid: string): L | null {
  const m = peekM33(s), o = m?.offers.find((x) => x.rid === rid), rl = relics(s).list.find((x) => x.id === rid);
  if (!m || !o || !rl || rl.st !== 'player') return l('A oferta não vale mais.', 'The offer no longer stands.');
  if (o.exp < s.week) return l('A oferta venceu.', 'The offer expired.');
  post(s, `merch33:sell:${rid}`, o.price, 'asset_sales', `Venda: ${rl.n.pt}`);
  rl.st = 'kept'; rl.own.push([`${o.who} (colecionador)`, s.year, 'compra']);
  if (m.window === rid) m.window = undefined;
  m.offers = m.offers.filter((x) => x.rid !== rid); m.sold++;
  return null;
}
export const declineOffer33 = (s: GameState, rid: string): L | null => { const m = peekM33(s); if (!m?.offers.some((x) => x.rid === rid)) return l('A oferta não vale mais.', 'The offer no longer stands.'); m.offers = m.offers.filter((x) => x.rid !== rid); return null; };

// ---------------------------------------------------------------- a virada do mês

registerSimHook('month', 'merch33', (s) => {
  if (!merchOn(s)) return;
  const m = peekM33(s);
  if (!m) return;
  const t = abs(s);
  for (const [actId, ln] of Object.entries(m.lines)) { // marca própria: renda mensal
    const a = s.acts[actId];
    if (!a || a.status === 'retired' || a.deceased) { delete m.lines[actId]; continue; }
    const inc = lineIncome33(s, a);
    if (post(s, `merch33:inc:${actId}:${t}`, inc, 'merch33', `Merch de ${a.name}`)) ln.earned += inc;
    if (a.fame >= 55 && !m.pirate[actId] && hs(`${s.config.seed}|m33|pir|${actId}|${t}`) % 100 < 14) m.pirate[actId] = { m: t, lvl: 1 + (hs(`${actId}|${t}`) % 3) }; // pirataria perto de show grande
  }
  for (const [tid, sd] of Object.entries(m.stand)) { // banca na turnê
    const tr = (s.tours ?? []).find((x) => x.id === tid), a = s.acts[sd.act];
    if (!tr || !a || tr.status === 'cancelled') { sd.left = 0; delete m.stand[tid]; continue; }
    const shows = tr.stops.filter((x) => x.status !== 'scheduled' || (x.day >= s.day - 30 && x.day <= s.day)).length;
    const demand = Math.round(40 * Math.max(1, shows) * (0.4 + a.fame / 60));
    const sold = Math.min(sd.left, demand);
    sd.left -= sold; sd.sold += sold; sd.lost += Math.max(0, demand - sold);
    if (sold) post(s, `merch33:standinc:${tid}:${t}`, sold * sd.price, 'merch33', `Banca da turnê: ${tr.name}`);
    if (sd.left > 0) post(s, `merch33:storage:${tid}:${t}`, -Math.round(sd.left * unitCost33(s) * 0.03), 'merch33', `Estoque encalhado: ${tr.name}`);
    if (tr.status === 'done' || sd.left === 0) delete m.stand[tid];
  }
  for (const [actId, p] of Object.entries(m.pirate)) if (p.ended && t - p.m > 3) delete m.pirate[actId];
  if (m.window) { const inc = windowIncome33(s); if (inc) post(s, `merch33:window:${t}`, inc, 'merch33', 'Vitrine para a rua'); else m.window = undefined; }
  m.offers = m.offers.filter((o) => o.exp >= s.week && relics(s).list.some((r) => r.id === o.rid && r.st === 'player'));
  if (m.offers.length < 2) { // colecionador rival: oferta direta por uma peça sua de nível Notável ou mais
    const cand = myRelics33(s).filter((r) => relicTierOf31(s, r) >= 1 && !m.offers.some((o) => o.rid === r.id) && !r.rr && !r.meta?.fix);
    const rl = cand[hs(`${s.config.seed}|m33|col|${t}`) % Math.max(1, cand.length)];
    if (rl && hs(`${s.config.seed}|m33|colp|${t}`) % 100 < 30) {
      const who = COLLECTORS[hs(`${rl.id}|${t}`) % COLLECTORS.length];
      m.offers.push({ rid: rl.id, who, price: Math.round(relicPrice(s, rl) * (1.1 + (hs(`${who}|${t}`) % 40) / 100)), exp: s.week + 8 });
      if (rl.a && s.acts[rl.a] && !histLocked(s, s.acts[rl.a]!)) addHype(s, `a:${rl.a}`, 'merch33col', fmtL(l('Colecionador quer {n}', 'A collector wants {n}'), { n: rl.n }), 1);
    }
  }
});
export { TIER_NAME31 };

// ---------------------------------------------------------------- ações nos cartões dos lugares (casa de shows, loja de discos, bar)

const whereOfPlace = (s: GameState, k: string): Where33 | undefined => (k === 'venue' ? 'venue' : k === 'records' ? 'records' : k === 'bar' ? (s.year < 1975 ? 'jazz' : 'nightclub') : undefined);
const prevActs = INT33.acts, prevRun = INT33.run;
INT33.acts = (s, p, actId) => {
  const base = prevActs?.(s, p, actId) ?? [];
  if (!merchOn(s)) return base;
  const w = whereOfPlace(s, p.k);
  if (!w) return base;
  const out: PAct27[] = [...base];
  for (const o of offers33(s, w).filter((x) => !x.bought).slice(0, 2)) {
    const dis = o.price > 0 && freeCash20(s) < o.price ? cashWhy20(s, o.price, l('Caixa livre insuficiente.', 'Not enough free cash.')) : undefined;
    out.push({ id: `m33:${o.key}`, label: o.free ? fmtL(l('Ganhar: {n}', 'Get: {n}'), { n: o.name }) : fmtL(l('Comprar: {n}', 'Buy: {n}'), { n: o.name }), desc: l('Uma peça do acervo de relíquias (vitrine, leilão e história como as outras).', 'A piece for the relic collection (window, auction and history like the others).'), cost: o.price || undefined, dis });
  }
  return out;
};
INT33.run = (s, p, id, actId) => {
  if (id.startsWith('m33:')) { const e = merchOn(s) ? buyOffer33(s, id.slice(4)) : l('Merch desligado nesta partida.', 'Merch is off in this game.'); return e ? { ok: false, text: e } : { ok: true, text: l('A peça entrou no seu acervo de relíquias.', 'The piece joined your relic collection.') }; }
  return prevRun?.(s, p, id, actId) ?? null;
};
