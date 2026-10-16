// R31 · onda 4 (T2) — LEILÃO SILENCIOSO DO MERCADO NEGRO. Interruptor 't31.blackAuction'.
//
// No submundo da sua cidade (a sala dos fundos do Beco do Mercado — interiores I+S), uma vez por mês: dois a três lotes
// de peças roubadas ou falsas — a relíquia roubada que já existe (relics9 'stolen', fora do esconderijo e da vitrine do
// receptador do crime17) e instrumentos roubados (objetos individuais, r31/object, como o estoque do beco). Não há
// plateia com nome: a FOLHA DE LANCES passa de mão em mão, e cada linha é uma letra anônima ("mão nº 3"). As linhas
// dos outros aparecem ao longo do mês (geradas na virada, mostradas por semana); você escreve a sua.
// Fechamento na virada seguinte (motor): quem escreveu mais leva e paga o que escreveu; se o teto secreto de alguém passa
// do seu, a folha volta com um lance acima.
// Risco de falsificação: cada lote tem a sua chance (secreta); CONHECER O VENDEDOR reduz (know.ts: a cada nível, −30%), e a
// cena mostra pistas só de quem você conhece. Falsa: relíquia vira réplica (o padrão do crime17) e o instrumento se
// revela de fabricação recente.
// Ganhar pode virar FATO e OPINIÃO NEGATIVA se a peça for rastreada (perícia da época + calor da polícia): manchete,
// escândalo, calor e um caso aberto (crime17) — e depois as batidas de sempre (esconderijo do crime17, equipamento
// "quente" do under31). Lote que está noutro país vem pela alfândega (customs31), como carga sem nota.
// Sorte: pura por chave (Rng.fromSeed). Geração e fechamento na virada do mês; a cena só lê. Estado: x4.bauc31.

import { clamp, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { know, know3 } from '../know';
import { cashWhy20, freeCash20 } from '../oblig20';
import { shiftOpinion } from '../opinion';
import { createObj, obj31, offer, removeObj, takeOffer } from '../r31/object';
import { CO31 } from '../r31/relic31';
import { registerEditable, registerRunnable } from '../r31/editor';
import { ITEMS31, items31, itemPrice31 } from '../r31/items31';
import { registerSwitch, sw } from '../r31/switches';
import { scandal } from '../scandal17';
import type { GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { capitals31 } from './auction31';
import { a3Of, addHeat, crime17, feedCase, forensic, heatIn } from './crime17';
import { customsOn31, ship31 } from './customs31';
import { headline19 } from './factlink19';
import { npcName27 } from './place27';
import { addRelic, relics, type Relic } from './relics9';
import { room31, under31, underOrgs31 } from './under31';

// ---------------------------------------------------------------- interruptor e estado

export const SW_BAUC31 = 't31.blackAuction';
registerSwitch({
  id: SW_BAUC31, def: true, scope: 'game',
  desc: l('Leilão silencioso do mercado negro (onda 4): no beco, uma folha de lances passa de mão em mão com peças roubadas ou falsas; conhecer o vendedor reduz o risco de falsificação; peça rastreada vira fato, opinião negativa e polícia.',
    'Black-market silent auction (wave 4): in the alley, a bid sheet goes from hand to hand with stolen or fake pieces; knowing the seller lowers the forgery risk; a traced piece becomes a fact, bad opinion and police.'),
});
export const baucOn31 = (s: GameState): boolean => sw<boolean>(s, SW_BAUC31);

export interface BLine31 { hand: number; amt: number; w: number }
export interface BLot31 {
  id: string;
  k: 'relic' | 'instr';
  /** relíquia (relics9) ou objeto (r31/object) */
  ref: string;
  /** oferta do objeto (instrumento) */
  of?: string;
  n: L;
  /** ano da peça */
  y: number;
  /** onde a peça está (outro país = vem pela alfândega) */
  city: string;
  seller: string;
  /** chave da pessoa (quando é alguém do jogo) */
  sk?: string;
  open: number;
  step: number;
  /** chance base de ser falsa — secreta */
  fakeP: number;
  /** teto da maior mão anônima — secreto */
  max: number;
  /** linhas das outras mãos (aparecem por semana) */
  lines: BLine31[];
  mine?: number;
  mw?: number;
  st: 'open' | 'won' | 'lost' | 'void';
  fake?: 1;
  traced?: 1;
  price?: number;
  /** relíquia que você levou (a réplica, se era falsa) */
  got?: string;
}
export interface Sheet31 { id: string; ym: string; city: string; w0: number; ends: number; lots: BLot31[]; done?: 1 }
export interface Bauc31State {
  sheets: Sheet31[];
  seq: number;
  log: [number, L][];
  /** editor: multiplicador da chance de falsificação */
  fakeX?: number;
}
declare module '../ext4' { interface Ext4 { bauc31: Bauc31State } }
const fresh = (): Bauc31State => ({ sheets: [], seq: 0, log: [] });
registerExt4('bauc31', fresh);
export function bauc31(s: GameState): Bauc31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.bauc31 ??= fresh()) as Bauc31State;
  st.sheets ??= []; st.seq ??= 0; st.log ??= [];
  return st;
}
const peek = (s: GameState): Bauc31State | undefined => (s.x4 as unknown as { bauc31?: Bauc31State }).bauc31;
const logB = (s: GameState, t: L): void => { const st = bauc31(s); st.log.push([s.week, t]); if (st.log.length > 30) st.log.splice(0, st.log.length - 30); };
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const ymOf = (s: GameState): string => `${s.year}-${s.month}`;
const holder = (city: string): string => `bauc:${city}`;
const abroad = (s: GameState, city: string): boolean => (countryOfCity(city) ?? '') !== (countryOfCity(s.config.homeCity) ?? '');

/** A folha aberta agora na sua cidade. */
export const sheet31 = (s: GameState): Sheet31 | undefined => peek(s)?.sheets.find((x) => !x.done && x.city === s.config.homeCity);
export const lastSheet31 = (s: GameState): Sheet31 | undefined => peek(s)?.sheets.filter((x) => x.done && x.city === s.config.homeCity).slice(-1)[0];

// ---------------------------------------------------------------- vendedor e pistas (know.ts)

/** Quanto você conhece o vendedor (0 = só um nome). */
export function sellerK31(s: GameState, lot: Pick<BLot31, 'sk'>): 0 | 1 | 2 | 3 {
  if (!lot.sk) return 0;
  try { return know3(know(s, lot.sk)); } catch { return 0; }
}
/** Chance efetiva de a peça ser falsa (o que conta no fechamento): cada nível de conhecimento do vendedor tira 30%. */
export const fakeOdds31 = (s: GameState, lot: Pick<BLot31, 'fakeP' | 'sk'>): number => clamp(lot.fakeP * (1 - 0.3 * sellerK31(s, lot)) * (peek(s)?.fakeX ?? 1), 0, 0.95);
/** Pista do vendedor (só para quem você conhece). */
export function sellerHint31(s: GameState, lot: BLot31): L {
  const k = sellerK31(s, lot);
  if (k === 0) return l('Você não conhece quem vende: pode ser verdadeira, pode não ser.', 'You do not know the seller: it may be genuine, it may not.');
  const p = fakeOdds31(s, lot);
  if (k === 1) return l('Você já ouviu falar de quem vende: menos chance de levar gato por lebre.', 'You have heard of the seller: less chance of being conned.');
  return p < 0.08 ? l('Você conhece bem quem vende: quase certo que é verdadeira.', 'You know the seller well: almost certainly genuine.')
    : p < 0.2 ? l('Você conhece quem vende: provavelmente verdadeira.', 'You know the seller: probably genuine.')
      : l('Você conhece quem vende — e sabe que ele mente às vezes.', 'You know the seller — and know they lie sometimes.');
}
/** Chance de a peça ser rastreada depois da compra (perícia da época + calor da polícia). */
export const traceP31 = (s: GameState, lot: Pick<BLot31, 'k'>): number => clamp(0.06 + heatIn(s, a3Of(s, s.config.homeCity)) / 300 + forensic(s.year).v + (lot.k === 'relic' ? 0.06 : 0), 0.03, 0.6);

// ---------------------------------------------------------------- folha (leitura)

/** Linhas visíveis na folha agora: as das outras mãos até esta semana (as que ficaram abaixo do seu lance depois que
 *  você escreveu não aparecem: a mão desistiu). */
export function visibleLines31(s: GameState, lot: BLot31): BLine31[] {
  return lot.lines.filter((x) => x.w <= s.week && !(lot.mine && lot.mw !== undefined && x.w > lot.mw && x.amt <= lot.mine)).sort((a, b) => a.amt - b.amt);
}
/** Lance mais alto escrito na folha (o seu incluído) e o mínimo para escrever o próximo. */
export function top31(s: GameState, lot: BLot31): { top: number; need: number; mineTop: boolean } {
  const vis = visibleLines31(s, lot);
  const other = vis.length ? vis[vis.length - 1].amt : 0;
  const top = Math.max(other, lot.mine ?? 0);
  return { top, need: top ? top + lot.step : lot.open, mineTop: !!lot.mine && lot.mine >= other };
}

// ---------------------------------------------------------------- geração (motor)

const step = (open: number): number => { const raw = Math.max(1, open * 0.08); const mag = 10 ** Math.floor(Math.log10(raw)); return Math.max(1, Math.round(raw / mag) * mag); };
function linesFor(r: Rng, open: number, st: number, max: number, w0: number): BLine31[] {
  const hands = r.int(2, 5);
  const out: BLine31[] = [];
  let amt = open;
  for (let i = 0; i < 8 && amt <= max * 0.8; i++) {
    out.push({ hand: 1 + r.int(0, hands - 1), amt, w: w0 + Math.min(3, Math.floor(i / 2)) });
    amt += st * r.int(1, 3);
  }
  return out;
}
/** Abre a folha do mês (só no motor). */
export function newSheet31(s: GameState, city = s.config.homeCity): Sheet31 | null {
  const st = bauc31(s);
  const ym = ymOf(s);
  if (st.sheets.some((x) => x.ym === ym && x.city === city)) return null;
  const r = Rng.fromSeed(`${s.config.seed}|bauc31|${city}|${ym}`);
  const lots: BLot31[] = [];
  const faces = underOrgs31(s).here.flatMap((o) => { const rm = room31(s, o.id); return rm ? [rm.boss, ...rm.lts] : []; }).filter((f) => f.key);
  const seller = (i: number): { seller: string; sk?: string } => {
    if (faces.length && r.chance(0.55)) { const f = faces[r.int(0, faces.length - 1)]; return { seller: f.name, sk: f.key }; }
    return { seller: npcName27(s, `bauc31|${city}|${ym}|${i}`) };
  };
  const far = (): string => { const caps = capitals31(s).filter((c) => abroad(s, c)); return caps.length && r.chance(0.3) ? caps[r.int(0, caps.length - 1)] : city; };
  const w0 = s.week;
  // relíquia roubada que já existe (fora do esconderijo e da vitrine do receptador)
  const cr = crime17(s);
  const pool = relics(s).list.filter((rl) => rl.st === 'stolen' && !cr.stash.includes(rl.id) && !cr.market.some((x) => x.rl === rl.id)
    && !st.sheets.some((sh) => !sh.done && sh.lots.some((x) => x.ref === rl.id)));
  if (pool.length && r.chance(0.7)) {
    const rl = pool[r.int(0, pool.length - 1)];
    const open = Math.max(money(s, 200), Math.round(money(s, rl.v) * r.float(0.2, 0.3)));
    const stp = step(open);
    const max = Math.round(open * (1.25 + r.float(0, 1.1)));
    lots.push({ id: `bl${++st.seq}`, k: 'relic', ref: rl.id, n: rl.n, y: rl.y, city: far(), ...seller(0), open, step: stp, fakeP: r.float(0.15, 0.45), max, lines: linesFor(r, open, stp, max, w0), st: 'open' });
  }
  // instrumentos roubados (objetos novos, como o estoque do beco)
  const defs = r.shuffle(ITEMS31.filter((d) => d.cat === 'instr' && s.year >= d.from && (!d.to || s.year <= d.to) && s.year - d.from >= 2)).slice(0, lots.length ? 1 : 2);
  for (const d of defs) {
    const made = Math.max(d.from, s.year - r.int(1, Math.min(40, s.year - d.from)));
    const cond = r.int(0, 2);
    const res = createObj(s, { modelId: `it:${d.id}`, origin: 'stolen', owner: holder(city) });
    if (!res.ok) continue;
    items31(s).d[res.v.id] = { def: d.id, made, cond, prev: [], ev: [[s.year, l('Roubado; posto na folha do leilão silencioso', 'Stolen; put on the silent-auction sheet')]] };
    const open = Math.max(money(s, 40), Math.round(itemPrice31(s, d, { made, cond }) * 0.35));
    const of = offer(s, res.v.id, holder(city), open);
    if (!of.ok) { removeObj(s, res.v.id); delete items31(s).d[res.v.id]; continue; }
    const stp = step(open);
    const max = Math.round(open * (1.2 + r.float(0, 1)));
    lots.push({ id: `bl${++st.seq}`, k: 'instr', ref: res.v.id, of: of.v.id, n: d.name, y: made, city: far(), ...seller(lots.length), open, step: stp, fakeP: r.float(0.1, 0.35), max, lines: linesFor(r, open, stp, max, w0), st: 'open' });
  }
  if (!lots.length) return null;
  const sh: Sheet31 = { id: `bs${st.seq}`, ym, city, w0, ends: w0 + 4, lots };
  st.sheets.push(sh);
  st.sheets = st.sheets.slice(-6);
  return sh;
}

// ---------------------------------------------------------------- seu lance

export function bidLock31(s: GameState, lotId: string, amt: number): L | null {
  if (!baucOn31(s)) return l('O leilão silencioso está desligado nesta partida.', 'The silent auction is off in this game.');
  const sh = sheet31(s);
  const lot = sh?.lots.find((x) => x.id === lotId);
  if (!sh || !lot || lot.st !== 'open') return l('A folha já foi recolhida.', 'The sheet has already been collected.');
  const t = top31(s, lot);
  if (t.mineTop && lot.mine) return l('O seu lance é o mais alto da folha.', 'Your bid is the highest on the sheet.');
  if (amt < t.need) return fmtL(l('Precisa escrever pelo menos {v}.', 'You must write at least {v}.'), { v: usd(t.need) });
  return freeCash20(s) >= amt ? null : cashWhy20(s, amt, l('Caixa livre não cobre o lance.', 'Free cash does not cover the bid.'));
}
/** Escrever um lance na folha (vale o maior que você escreveu). */
export function writeBid31(s: GameState, lotId: string, amt: number): L | null {
  const a = Math.round(amt);
  const lk = bidLock31(s, lotId, a);
  if (lk) return lk;
  const lot = sheet31(s)!.lots.find((x) => x.id === lotId)!;
  lot.mine = a; lot.mw = s.week;
  return null;
}

// ---------------------------------------------------------------- fechamento (motor)

function deliver(s: GameState, lot: BLot31): void {
  const cr = crime17(s);
  const ship = customsOn31(s) && abroad(s, lot.city);
  if (lot.k === 'relic') {
    const rl = relics(s).list.find((x) => x.id === lot.ref);
    if (!rl) return;
    let got: Relic = rl;
    if (lot.fake) {
      got = addRelic(s, rl.k, fmtL(l('{n} (réplica)', '{n} (replica)'), { n: rl.n }), rl.a, rl.p, rl.v, rl.y);
      got.st = 'stolen';
      cr.fake[got.id] = 1;
    } else rl.own.push([s.config.companyName, s.year, 'leilão clandestino']);
    cr.stash.push(got.id); cr.hot[got.id] = 'player'; cr.rcity[got.id] = s.config.homeCity;
    lot.got = got.id;
    if (ship) ship31(s, { n: got.n, k: 'relic', ref: got.id, v: lot.price ?? lot.open, law: 'stolen', from: lot.city, src: 'bauc31' });
    return;
  }
  if (!lot.of || !takeOffer(s, lot.of, CO31).ok) return;
  const x = items31(s).d[lot.ref];
  if (x) {
    x.prev.push(['?', x.made, s.year]);
    if (lot.fake) { x.made = s.year; x.cond = Math.max(x.cond, 1); x.ev.push([s.year, l('Réplica recente vendida como peça de época', 'A recent replica sold as a period piece')]); }
    x.ev.push([s.year, l('Arrematado no leilão silencioso do beco', 'Won at the alley\'s silent auction')]);
  }
  under31(s).hotGear[lot.ref] = s.week;
  if (ship) ship31(s, { n: lot.n, k: 'instr', ref: lot.ref, v: lot.price ?? lot.open, law: 'stolen', from: lot.city, src: 'bauc31' });
}
function traced(s: GameState, lot: BLot31): void {
  lot.traced = 1;
  const a3 = a3Of(s, s.config.homeCity);
  const rl = lot.k === 'relic' ? relics(s).list.find((x) => x.id === lot.ref) : undefined;
  const text = fmtL(l('A polícia rastreia {n}, peça roubada vendida num leilão clandestino, até {c}.', 'Police trace {n}, a stolen piece sold at a clandestine auction, to {c}.'), { n: lot.n, c: s.config.companyName });
  emitFact(s, { kind: 'relic', actors: ['player', ...(rl?.a ? [rl.a] : [])], place: s.config.homeCity, severity: 45, visibility: 'public', tags: ['crime', 'relic', 'bauc31', 'traced'], text, src: 'bauc31' });
  headline19(s, text, 2);
  scandal(s, 'player', 'crime', 30, [`Peça roubada rastreada: ${lot.n.pt}`]);
  addHeat(s, 'player', a3, 10);
  feedCase(s, 'player', a3, 20, 35, false);
  if (rl?.p && s.persons[rl.p]?.alive) shiftOpinion(s, `p:${rl.p}`, -12, { why: fmtL(l('Comprou {n}, roubada dele(a), no mercado negro', 'Bought {n}, stolen from them, on the black market'), { n: lot.n }) });
  notify(s, fmtL(l('{n} foi rastreada: virou notícia e a polícia está de olho em você.', '{n} was traced: it made the news and the police are watching you.'), { n: lot.n }), 'bad');
}
/** Recolhe a folha: quem escreveu mais leva. */
export function closeSheet31(s: GameState, sh: Sheet31): void {
  for (const lot of sh.lots) {
    if (lot.st !== 'open') continue;
    const rl = lot.k === 'relic' ? relics(s).list.find((x) => x.id === lot.ref) : undefined;
    const gone = lot.k === 'relic' ? !rl || rl.st !== 'stolen' || crime17(s).stash.includes(lot.ref) : !lot.of || !obj31(s).offers[lot.of];
    if (gone) { lot.st = 'void'; continue; }
    const mine = lot.mine ?? 0;
    if (mine > lot.max && s.player.cash >= mine) {
      lot.st = 'won'; lot.price = mine;
      post(s, `bauc31:${lot.id}`, -mine, 'acquisitions', 'Leilão silencioso (mercado negro)');
      addHeat(s, 'player', a3Of(s, s.config.homeCity), 3);
      const r = Rng.fromSeed(`${s.config.seed}|bauc31|close|${lot.id}`);
      if (r.chance(fakeOdds31(s, lot))) lot.fake = 1;
      deliver(s, lot);
      if (!lot.fake && r.chance(traceP31(s, lot))) traced(s, lot);
      notify(s, lot.fake ? fmtL(l('Você levou {n} por {v} — e era falsa.', 'You took {n} for {v} — and it was fake.'), { n: lot.n, v: usd(mine) }) : fmtL(l('Você levou {n} por {v} no leilão silencioso.', 'You took {n} for {v} at the silent auction.'), { n: lot.n, v: usd(mine) }), lot.fake ? 'bad' : 'good');
      logB(s, fmtL(l('{n}: sua por {v}{f}.', '{n}: yours for {v}{f}.'), { n: lot.n, v: usd(mine), f: lot.fake ? l(' (falsa)', ' (fake)') : '' }));
    } else {
      const top = Math.max(lot.max, ...lot.lines.map((x) => x.amt));
      const price = mine ? Math.min(lot.max, mine + lot.step) : Math.max(...lot.lines.map((x) => x.amt), lot.open);
      if (mine) lot.lines.push({ hand: 1 + (lot.lines.length % 4), amt: price, w: s.week });
      lot.st = 'lost'; lot.price = price;
      if (lot.k === 'instr') { removeObj(s, lot.ref); delete items31(s).d[lot.ref]; }
      if (mine) logB(s, fmtL(l('{n}: a folha voltou com {v}, acima do seu lance.', '{n}: the sheet came back with {v}, above your bid.'), { n: lot.n, v: usd(price) }));
      void top;
    }
  }
  sh.done = 1;
}
/** Virada do mês: recolhe a folha anterior e abre a nova. */
export function baucMonth31(s: GameState): void {
  const st = peek(s);
  for (const sh of st?.sheets ?? []) if (!sh.done) closeSheet31(s, sh);
  if (baucOn31(s) && s.year >= 1900) newSheet31(s);
}
registerSimHook('month', 'bauc31', (s) => { baucMonth31(s); });

// ---------------------------------------------------------------- calendário e editor

registerDeadline('bauc31', (s, from, to) => {
  const sh = sheet31(s);
  if (!sh || !baucOn31(s) || sh.ends < from || sh.ends > to) return [];
  const mine = sh.lots.some((x) => x.mine);
  return [{ id: `bauc31:${sh.id}`, w: sh.ends, kind: 'other' as const, tone: mine ? 'bad' as const : 'info' as const, act: mine || undefined,
    t: l('A folha do leilão silencioso é recolhida', 'The silent-auction sheet is collected'),
    d: mine ? l('Você escreveu lance na folha.', 'You wrote a bid on the sheet.') : fmtL(l('{n} lote(s) no beco ({c}).', '{n} lot(s) in the alley ({c}).'), { n: sh.lots.length, c: cityById[sh.city]?.name ?? sh.city }),
    goto: { area: 'bauc31' } }];
});
registerEditable({
  id: 'bauc31.fakeX', area: 'world', kind: 'number', raw: true, min: 0, max: 3, step: 0.1, label: l('Leilão silencioso: chance de peça falsa (×)', 'Silent auction: chance of a fake piece (×)'),
  get: (s) => peek(s)?.fakeX ?? 1, set: (s, v) => { bauc31(s).fakeX = clamp(Number(v), 0, 3); },
});
registerRunnable({
  id: 'bauc31.close', area: 'world', label: l('Leilão silencioso: recolher a folha agora', 'Silent auction: collect the sheet now'),
  run: (s) => { const sh = sheet31(s); if (!sh) return { ok: false, text: l('Nenhuma folha circulando.', 'No sheet going around.') }; closeSheet31(s, sh); return l('Folha recolhida.', 'Sheet collected.'); },
});
