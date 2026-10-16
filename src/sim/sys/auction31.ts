// R31 · onda 4 (T) — CASA DE LEILÕES. Plano: docs/r31/plano-pagina.md, "Casa de leilões".
//
// Calendário de pregões (gerado no motor, na virada do mês; a tela só lê):
//  • leilão LOCAL na cidade da sede (todo mês; a cada 2 meses antes de 1946), GRANDE na maior praça do seu mercado
//    (a cada 3 meses; 6 antes de 1946) e de PRESTÍGIO nas capitais da música (a cada 6 meses; 12 antes de 1946).
//  • Cada pregão tem o catálogo de lotes publicado com antecedência (lote entra até 2 semanas antes do martelo).
//  • Lotes nunca se repetem: a peça só volta a leilão se mudar de dono de verdade (contagem de donos no registro).
//
// Lances: plateia com pessoas que JÁ existem (líderes dos selos rivais e artistas famosos; o comprador real de uma
// peça histórica entra por telefone). Cada uma tem um teto SECRETO (sorte pura por pregão/lote/pessoa, limitado pelo
// caixa do selo ou pela fama). O que você vê sai de know.ts (regra única): quem você conhece mostra pistas
// (costuma gastar pouco/muito, quer muito a peça, hesita perto do limite); quem não conhece é só um rosto. O teto nunca
// aparece (campo `negMin`, "nunca").
// O pregão é um leilão inglês: o preço sobe de degrau em degrau enquanto houver duas partes com teto acima dele. A cena
// e o fechamento usam a MESMA conta (`ladder31`): levantar a plaquinha = subir o seu limite (rl.bid, o mesmo campo do
// "lance fechado" do relics9) — e o representante é esse mesmo limite deixado antes do pregão.
// Ligações: preço recorde conta ponto de história (relic31.noteSale31); o comprador entra na lista de donos; ganhar uma
// peça disputada deixa quem queria muito com opinião pior de você (e o selo dele mais rival).
// Consignação: sua peça vai ao próximo pregão; você recebe o martelo menos a comissão da casa.
// Alfândega: o que você arremata fora do seu país paga imposto de importação e chega depois (calendário).
// Interruptor 'auction31' (desligado = leilões do relics9 como antes). Estado: x4.auction31.

import { clamp, hashString, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { know, know3, see } from '../know';
import { cashWhy20, freeCash20 } from '../oblig20';
import { shiftOpinion } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import { noteSale31 } from '../r31/relic31';
import { registerSwitch, sw } from '../r31/switches';
import type { GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { leaders } from './leaders10';
import {
  isRelicFixed9, openingBid, ownerName, placeBid, realOwners9, relicAuctionHook9, relicBuyFrom9, relics, relMeta, type Relic,
} from './relics9';

// ---------------------------------------------------------------- interruptor

registerSwitch({
  id: 'auction31', def: true, scope: 'game',
  desc: l('Casa de leilões (onda 4): pregões com data no calendário, plateia de pessoas do jogo dando lances, representante com limite, consignação e alfândega.',
    'Auction house (wave 4): sales with calendar dates, an audience of in-game people bidding, a representative with a limit, consignment and customs.'),
});
export const auctionOn31 = (s: GameState): boolean => sw<boolean>(s, 'auction31');

// ---------------------------------------------------------------- casas

export type House31 = 'local' | 'big' | 'prestige';
export const HOUSE31: Record<House31, { name: L; minV: number; every: [number, number]; lots: number }> = {
  local: { name: l('Leilão local', 'Local sale'), minV: 0, every: [2, 1], lots: 6 },
  big: { name: l('Grande leilão', 'Major sale'), minV: 25000, every: [6, 3], lots: 8 },
  prestige: { name: l('Leilão de prestígio', 'Prestige sale'), minV: 250000, every: [12, 6], lots: 10 },
};
/** Capitais da música (pregões de prestígio): cidade e ano em que a praça passa a ter leilão de memorabilia. */
export const CAPITALS31: [string, number][] = [['london', 1889], ['new_york', 1889], ['paris', 1889], ['los_angeles', 1980], ['tokyo', 1990]];
/** Casa (nome fictício) por porte; a cidade dá o resto do nome. */
const HOUSE_NAME31: Record<House31, L> = {
  local: l('Casa do Martelo', 'Hammer House'), big: l('Galeria Leilões', 'Gallery Auctions'), prestige: l('Salão do Lustre', 'Chandelier Hall'),
};
/** Comissão da casa sobre o martelo (consignação). */
export const COMMISSION31 = 0.15;

export interface Sess31 {
  id: string;
  house: House31;
  city: string;
  /** semana do martelo */
  w: number;
  /** relíquias no catálogo (ids do relics9) */
  lots: string[];
  /** fechado */
  done?: 1;
  /** resultado por lote: [id, comprador (nome), preço em dinheiro do jogo (0 = sem venda), você?] */
  res?: [string, string, number, 0 | 1][];
}
export interface Import31 { rid: string; n: L; from: string; w: number; arrive: number; duty: number }
export interface Auction31State {
  sess: Sess31[];
  /** contagem de donos da peça na última vez que foi a pregão (lote não se repete sem troca de dono) */
  listed: Record<string, number>;
  /** peças suas em consignação */
  cons: Record<string, 1>;
  imports: Import31[];
  log: [number, L][];
  /** editor: comissão da casa (fração) */
  fee?: number;
}
declare module '../ext4' { interface Ext4 { auction31: Auction31State } }
const fresh = (): Auction31State => ({ sess: [], listed: {}, cons: {}, imports: [], log: [] });
registerExt4('auction31', fresh);
export function auction31(s: GameState): Auction31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.auction31 ??= fresh()) as Auction31State;
  st.sess ??= []; st.listed ??= {}; st.cons ??= {}; st.imports ??= []; st.log ??= [];
  return st;
}
const peek = (s: GameState): Auction31State | undefined => (s.x4 as unknown as { auction31?: Auction31State }).auction31;
const commission = (s: GameState): number => peek(s)?.fee ?? COMMISSION31;

const homeA3 = (s: GameState): string => countryOfCity(s.config.homeCity) ?? '';
/** Maior praça do seu mercado (grande leilão): a primeira cidade do mesmo país com cena maior; senão a própria sede. */
function bigCity(s: GameState): string {
  const home = cityById[s.config.homeCity];
  if (!home) return s.config.homeCity;
  const a3 = homeA3(s);
  const same = Object.values(cityById).filter((c) => (countryOfCity(c.id) ?? '') === a3 && a3);
  same.sort((a, b) => b.scenes.length - a.scenes.length || (a.id < b.id ? -1 : 1));
  return same[0]?.id ?? home.id;
}
export function capitals31(s: GameState): string[] { return CAPITALS31.filter(([c, y]) => cityById[c] && s.year >= y).map(([c]) => c); }
export function houseCity31(s: GameState, h: House31, k: number): string {
  if (h === 'local') return s.config.homeCity;
  if (h === 'big') return bigCity(s);
  const caps = capitals31(s);
  return caps[k % Math.max(1, caps.length)] ?? s.config.homeCity;
}
export const houseName31 = (s: GameState, h: House31, city: string): L => {
  const c = cityById[city]?.name ?? l(city, city);
  return l(`${HOUSE_NAME31[h].pt} (${c.pt})`, `${HOUSE_NAME31[h].en} (${c.en})`);
};
/** Época da sala (a cena muda com ela): salão com lustre, auditório, tela de lances online, aplicativo. */
export type Room31 = 'salon' | 'hall' | 'screen' | 'app';
export const roomOf31 = (y: number): Room31 => (y < 1965 ? 'salon' : y < 2000 ? 'hall' : y < 2012 ? 'screen' : 'app');

// ---------------------------------------------------------------- calendário de pregões (motor)

const absMonth = (s: GameState): number => s.year * 12 + s.month;
/** Cria os pregões dos próximos 6 meses (idempotente: id = casa + mês absoluto). */
export function ensureSessions31(s: GameState): void {
  const st = auction31(s);
  const now = absMonth(s);
  const era = s.year < 1946 ? 0 : 1;
  for (let k = 1; k <= 6; k++) {
    const m = now + k;
    for (const h of Object.keys(HOUSE31) as House31[]) {
      const every = HOUSE31[h].every[era];
      if (m % every) continue;
      const id = `${h}:${m}`;
      if (st.sess.some((x) => x.id === id)) continue;
      st.sess.push({ id, house: h, city: houseCity31(s, h, Math.floor(m / every)), w: s.week + Math.round(k * 4.33) - 1, lots: [] });
    }
  }
  st.sess.sort((a, b) => a.w - b.w || (a.id < b.id ? -1 : 1));
  // guarda os fechados do último ano (para o histórico da cena)
  st.sess = st.sess.filter((x) => !x.done || x.w >= s.week - 52).slice(-60);
}
export const openSessions31 = (s: GameState): Sess31[] => (peek(s)?.sess ?? []).filter((x) => !x.done);
export const sessionOf31 = (s: GameState, rid: string): Sess31 | undefined => openSessions31(s).find((x) => x.lots.includes(rid));
export const nextSession31 = (s: GameState): Sess31 | undefined => openSessions31(s).find((x) => x.w >= s.week);

const houseFor = (rl: Relic): House31 => (rl.v >= HOUSE31.prestige.minV ? 'prestige' : rl.v >= HOUSE31.big.minV ? 'big' : 'local');
const ownersN = (rl: Relic): number => realOwners9(rl).length;

/** Põe as peças em leilão no catálogo do próximo pregão adequado. Lote repetido (sem troca de dono) volta ao dono. */
export function assignLots31(s: GameState): void {
  const st = auction31(s);
  for (const rl of relics(s).list) {
    if (rl.st !== 'auction' || isRelicFixed9(rl) || rl.meta?.fix || sessionOf31(s, rl.id)) continue;
    const n = ownersN(rl);
    if (st.listed[rl.id] === n && !st.cons[rl.id]) { // já foi a pregão com este mesmo dono: não repete
      rl.st = 'kept'; rl.au = undefined; rl.bid = undefined;
      continue;
    }
    const want = houseFor(rl);
    const order: House31[] = want === 'prestige' ? ['prestige', 'big', 'local'] : want === 'big' ? ['big', 'local'] : ['local', 'big'];
    let target: Sess31 | undefined;
    for (const h of order) {
      target = openSessions31(s).find((x) => x.house === h && x.w >= s.week + 2 && x.lots.length < HOUSE31[h].lots);
      if (target) break;
    }
    if (!target) continue; // o motor cria mais pregões na virada do mês
    target.lots.push(rl.id);
    st.listed[rl.id] = n;
    rl.au = target.w + 1; // o relics9 não resolve antes do martelo
  }
}

// ---------------------------------------------------------------- plateia e tetos (puros)

export interface Bidder31 {
  /** chave da pessoa: 'p:<id>' (artista), 'l:<id>' (líder de selo) ou 'phone:<nome>' (comprador por telefone) */
  key: string;
  name: string;
  /** para o boneco */
  pid?: string;
  kind: 'artist' | 'leader' | 'phone';
  /** teto SECRETO (dinheiro do jogo) — nunca mostrado */
  max: number;
  /** vontade 0.5..1.8 — secreta; aparece só como pista para quem conhece */
  want: number;
  /** quanto costuma gastar (dinheiro do jogo) */
  cap: number;
}
const H = (s: GameState, k: string): number => hashString(`${s.config.seed}|auc31|${k}`) / 4294967296;

const CAND = new WeakMap<GameState, { w: number; c: Omit<Bidder31, 'max' | 'want'>[] }>();
/** Candidatos à plateia nesta semana: líderes ativos dos selos e artistas famosos (gente que já existe). */
function candidates(s: GameState): Omit<Bidder31, 'max' | 'want'>[] {
  const hit = CAND.get(s);
  if (hit && hit.w === s.week) return hit.c;
  const c: Omit<Bidder31, 'max' | 'want'>[] = [];
  const L = (leaders(s) as unknown as { L?: Record<string, { id: string; name: string; st: string; label?: string }> } | undefined)?.L ?? {};
  for (const x of Object.values(L)) {
    if (x.st !== 'active' || !x.label) continue;
    const lb = s.labels[x.label];
    if (!lb || lb.cash <= 0) continue;
    c.push({ key: `l:${x.id}`, name: x.name, kind: 'leader', cap: Math.round(lb.cash * 0.06) });
  }
  for (const a of Object.values(s.acts)) {
    if (a.owner === 'player' || a.playerBand || a.fame < 55) continue;
    const pid = a.members.find((p) => s.persons[p]?.alive && !s.persons[p]?.isPlayer);
    if (!pid) continue;
    c.push({ key: `p:${pid}`, name: s.persons[pid].name, pid, kind: 'artist', cap: money(s, 2000 + a.fame * a.fame * 60) });
  }
  c.sort((a, b) => (a.key < b.key ? -1 : 1));
  CAND.set(s, { w: s.week, c });
  return c;
}

/** Plateia de um lote (determinística por pregão e lote): 3 a 5 pessoas + o artista da peça + o comprador real. */
export function bidders31(s: GameState, sessId: string, rl: Relic): Bidder31[] {
  const open = openingBid(s, rl);
  const pool = candidates(s);
  const rank = pool.map((c) => ({ c, h: H(s, `pick|${sessId}|${rl.id}|${c.key}`) })).sort((a, b) => a.h - b.h);
  const n = 3 + Math.floor(H(s, `n|${sessId}|${rl.id}`) * 3);
  const out: Bidder31[] = [];
  const add = (c: Omit<Bidder31, 'max' | 'want'>, bonus = 0, wantMin = 0.5): void => {
    if (out.some((x) => x.key === c.key)) return;
    const want = clamp(0.5 + H(s, `want|${sessId}|${rl.id}|${c.key}`) * 1.1 + bonus, wantMin, 1.8);
    const max = Math.round(Math.min(c.cap, open * (0.7 + want * 0.55)));
    out.push({ ...c, want: Math.round(want * 100) / 100, max });
  };
  for (const x of rank.slice(0, n)) add(x.c);
  // o próprio artista (vivo, que não é dono) quer a peça de volta
  const p = rl.p ? s.persons[rl.p] : undefined;
  if (p?.alive && !p.isPlayer && ownerName(rl) !== p.name) {
    const a = rl.a ? s.acts[rl.a] : undefined;
    if (a && a.owner !== 'player') add({ key: `p:${p.id}`, name: p.name, pid: p.id, kind: 'artist', cap: money(s, 2000 + a.fame * a.fame * 60) }, 0.4, 1.1);
  }
  // peça real: o comprador da história real, por telefone, paga o preço da história (um pouco acima)
  if (rl.rb) out.push({ key: `phone:${rl.rb}`, name: rl.rb, kind: 'phone', want: 1.2, cap: Number.MAX_SAFE_INTEGER, max: Math.round(open * 1.06) });
  // colecionador anônimo ao telefone: garante disputa de peça boa
  out.push({ key: 'phone:anon', name: '', kind: 'phone', want: 1, cap: Number.MAX_SAFE_INTEGER, max: Math.round(open * (0.95 + H(s, `anon|${sessId}|${rl.id}`) * 0.35)) });
  return out;
}

/** Degrau do martelo: ~5% do lance inicial, arredondado para um número redondo. */
export function step31(open: number): number {
  const raw = Math.max(1, open * 0.05);
  const mag = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, Math.round(raw / mag) * mag);
}

export interface Ladder31 {
  open: number;
  inc: number;
  /** preço em que o pregão para com o seu limite atual */
  price: number;
  /** quem está com o lance ('player', a chave de um licitante ou '' = ninguém chegou ao lance inicial) */
  lead: string;
  /** quem já baixou a plaquinha e em que preço (público: todo mundo na sala viu) */
  out: { key: string; at: number }[];
  /** próximo lance que você precisa dar para liderar */
  need: number;
}
/** O pregão inglês, a conta única da cena e do fechamento. `mine` = seu limite (0 = não está disputando). */
export function ladder31(s: GameState, sessId: string, rl: Relic, mine = rl.bid ?? 0): Ladder31 {
  const open = openingBid(s, rl);
  const inc = step31(open);
  const bs = bidders31(s, sessId, rl).filter((b) => b.max >= open).sort((a, b) => b.max - a.max || (a.key < b.key ? -1 : 1));
  const parties = [...bs.map((b) => ({ key: b.key, max: b.max })), ...(mine >= open ? [{ key: 'player', max: mine }] : [])]
    .sort((a, b) => b.max - a.max || (a.key === 'player' ? -1 : b.key === 'player' ? 1 : 0)); // empate: quem levantou antes (você)
  const out = bs.filter((b) => !parties.slice(0, 2).some((p) => p.key === b.key)).map((b) => ({ key: b.key, at: Math.max(open, Math.floor(b.max / inc) * inc) }));
  if (!parties.length) return { open, inc, price: 0, lead: '', out, need: open };
  if (parties.length === 1) return { open, inc, price: open, lead: parties[0].key, out, need: parties[0].key === 'player' ? open : open + inc };
  const [a, b] = parties;
  const price = Math.min(a.max, Math.max(open, b.max + (a.max > b.max ? inc : 0)));
  if (b.key !== 'player') out.push({ key: b.key, at: Math.max(open, Math.floor(b.max / inc) * inc) });
  out.sort((x, y) => x.at - y.at);
  return { open, inc, price, lead: a.key, out, need: a.key === 'player' ? price : price + inc };
}

// ---------------------------------------------------------------- pistas (know.ts — regra única)

export interface Hint31 {
  /** 0 só um rosto · 1 de ouvir falar · 2 conhece bem · 3 a fundo */
  k: 0 | 1 | 2 | 3;
  /** costuma gastar (faixa em texto) — só com atributos visíveis */
  spend?: L;
  /** quer muito a peça — só com ambição visível */
  keen?: boolean;
  /** hesita (perto do teto) — só com humor visível, e só no pregão */
  hesitant?: boolean;
}
const SPEND31: L[] = [l('costuma gastar pouco', 'usually spends little'), l('gasta com cuidado', 'spends carefully'), l('gasta bem', 'spends well'), l('gasta fortunas', 'spends fortunes')];
/** O que você percebe de um licitante (nada do teto). `price` = preço atual do pregão (para a hesitação). */
export function hint31(s: GameState, b: Bidder31, price = 0): Hint31 {
  if (b.kind === 'phone') return { k: 0 };
  const id = b.key.slice(2);
  const tgt = b.kind === 'artist' ? id : b.key;
  let k: Hint31['k'] = 0;
  try { k = know3(know(s, tgt)); } catch { k = 0; }
  const out: Hint31 = { k };
  const vis = (f: 'attrs' | 'ambition' | 'mood'): boolean => { try { return see(s, tgt, f) !== 'hidden'; } catch { return false; } };
  if (k >= 1 && vis('attrs')) {
    const capReal = b.cap / Math.max(1e-9, money(s, 1));
    out.spend = SPEND31[capReal < 30000 ? 0 : capReal < 200000 ? 1 : capReal < 2e6 ? 2 : 3];
  }
  if (k >= 2 && vis('ambition')) out.keen = b.want >= 1.25;
  if (k >= 2 && vis('mood') && price > 0) out.hesitant = price >= b.max * 0.85 && price <= b.max;
  return out;
}

// ---------------------------------------------------------------- ações do jogador

/** Levantar a plaquinha (ou deixar um representante com limite): sobe o seu limite no lote. */
export function raise31(s: GameState, rid: string, amount: number): L | null {
  const rl = relics(s).list.find((x) => x.id === rid);
  if (!rl) return l('Lote inexistente.', 'No such lot.');
  if (auction31(s).cons[rid]) return l('A peça é sua: você não dá lance no próprio lote.', 'The piece is yours: you cannot bid on your own lot.');
  if (!sessionOf31(s, rid)) return l('Este lote não está em nenhum pregão marcado.', 'This lot is not in any scheduled sale.');
  return placeBid(s, rid, Math.round(Math.max(amount, rl.bid ?? 0)));
}
/** Retirar o representante (zera o seu limite). Não vale durante o pregão em que você já lidera. */
export function dropBid31(s: GameState, rid: string): void { const rl = relics(s).list.find((x) => x.id === rid); if (rl) rl.bid = undefined; }

/** Peças suas que podem ir a consignação. */
export const consignable31 = (s: GameState): Relic[] => relics(s).list.filter((x) => x.st === 'player' && !x.meta?.fix && !isRelicFixed9(x) && !x.ln && !x.brw);
/** Mandar uma peça sua ao balcão de consignação: entra no próximo pregão adequado. */
export function consign31(s: GameState, rid: string): L | null {
  if (!auctionOn31(s)) return l('A casa de leilões está desligada nesta partida.', 'The auction house is off in this game.');
  const rl = consignable31(s).find((x) => x.id === rid);
  if (!rl) return l('Só peças do seu acervo, fora de empréstimo.', 'Only pieces in your collection, not on loan.');
  const st = auction31(s);
  rl.st = 'auction'; rl.ex = undefined; rl.bid = undefined;
  st.cons[rid] = 1;
  ensureSessions31(s);
  assignLots31(s);
  const se = sessionOf31(s, rid);
  if (!se) { rl.st = 'player'; delete st.cons[rid]; return l('Nenhum pregão com vaga nos próximos meses.', 'No sale with room in the coming months.'); }
  st.log.push([s.week, fmtL(l('{n} vai a pregão por consignação ({h}).', '{n} goes to auction on consignment ({h}).'), { n: rl.n, h: houseName31(s, se.house, se.city) })]);
  return null;
}

// ---------------------------------------------------------------- martelo

/** Imposto de importação por época (fração do preço). */
export const dutyRate31 = (y: number): number => (y < 1946 ? 0.2 : y < 1980 ? 0.12 : y < 2000 ? 0.08 : 0.05);
/** Semanas até a peça chegar (navio até 1946, avião depois). */
export const shipWeeks31 = (y: number): number => (y < 1946 ? 4 : y < 1970 ? 2 : 1);

/** Fecha um lote: o pregão corre pela mesma conta da cena. Devolve o resultado (ou null se não era lote aberto). */
export function hammer31(s: GameState, sess: Sess31, rid: string): [string, string, number, 0 | 1] | null {
  const rl = relics(s).list.find((x) => x.id === rid);
  const st = auction31(s);
  if (!rl || rl.st !== 'auction' || !sess.lots.includes(rid) || sess.res?.some((x) => x[0] === rid)) return null;
  const cons = !!st.cons[rid];
  // seu limite só vale se o caixa cobre (o representante não empenha dinheiro que você não tem)
  let mine = cons ? 0 : rl.bid ?? 0;
  if (mine && freeCash20(s) < mine) mine = Math.max(0, freeCash20(s));
  const lad = ladder31(s, sess.id, rl, mine);
  const bs = bidders31(s, sess.id, rl);
  const foreign = (countryOfCity(sess.city) ?? '') !== homeA3(s);
  let row: [string, string, number, 0 | 1];
  rl.bid = undefined;
  rl.au = undefined;
  if (!lad.lead) { // ninguém chegou ao lance inicial: a peça volta ao dono (não repete sem trocar de dono)
    rl.st = cons ? 'player' : 'kept';
    delete st.cons[rid];
    row = [rid, '', 0, 0];
    st.log.push([s.week, fmtL(l('{n}: sem lance no valor pedido; volta ao dono.', '{n}: no bid at the asking level; back to its owner.'), { n: rl.n })]);
  } else if (lad.lead === 'player') {
    const price = lad.price;
    relicBuyFrom9(s, rl, price, 'leilão');
    row = [rid, s.config.companyName, price, 1];
    if (foreign) {
      const duty = Math.round(price * dutyRate31(s.year));
      post(s, `auc31duty:${rid}:${s.week}`, -duty, 'acquisitions', `Alfândega: ${rl.n.pt}`);
      st.imports.push({ rid, n: rl.n, from: sess.city, w: s.week, arrive: s.week + shipWeeks31(s.year), duty });
      if (st.imports.length > 20) st.imports.splice(0, st.imports.length - 20);
    }
    // quem queria muito e perdeu para você: opinião pior; selo dele mais rival
    const rival = bs.filter((b) => b.kind !== 'phone' && b.want >= 1.25 && b.max >= lad.open).sort((a, b) => b.max - a.max)[0];
    if (rival) {
      shiftOpinion(s, rival.key, -8, { why: fmtL(l('Perdeu {n} para você no leilão', 'Lost {n} to you at auction'), { n: rl.n }) });
      if (rival.kind === 'leader') {
        const lb = Object.values(s.labels).find((x) => (x as unknown as { leaderId?: string }).leaderId === rival.key.slice(2));
        if (lb) s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 5;
      }
      emitFact(s, { kind: 'relic', actors: ['player', ...(rival.pid ? [`p:${rival.pid}`] : [])], severity: 25, visibility: 'public', tags: ['relic', 'auction31', 'feud'], src: 'auction31',
        text: fmtL(l('{p} perde {n} para {c} no leilão e não esconde a irritação.', '{p} loses {n} to {c} at auction and does not hide the annoyance.'), { p: rival.name, n: rl.n, c: s.config.companyName }) });
    }
    notify(s, fmtL(l('Martelo batido: {n} é seu por {v}.', 'Hammer down: {n} is yours for {v}.'), { n: rl.n, v: `$${price.toLocaleString('en-US')}` }), 'good');
  } else {
    const b = bs.find((x) => x.key === lad.lead)!;
    const name = b.kind === 'phone' && !b.name ? 'colecionador anônimo (telefone)' : b.name;
    const factor = lad.price / Math.max(1, lad.open);
    rl.v = Math.round(rl.v * factor);
    rl.st = 'kept';
    rl.own.push([name, s.year, 'leilão']);
    if (b.kind !== 'phone') relMeta(rl).oh = [b.key, realOwners9(rl).length];
    if (cons) {
      const net = Math.round(lad.price * (1 - commission(s)));
      post(s, `auc31sale:${rid}:${s.week}`, net, 'asset_sales', `Leilão (consignação): ${rl.n.pt}`);
      delete st.cons[rid];
      notify(s, fmtL(l('{n} vendido em leilão: você recebe {v} (já sem a comissão da casa).', '{n} sold at auction: you get {v} (after the house commission).'), { n: rl.n, v: `$${net.toLocaleString('en-US')}` }), 'good');
    } else if (mine) notify(s, fmtL(l('Seu limite por {n} foi superado.', 'Your limit for {n} was beaten.'), { n: rl.n }), 'info');
    if (noteSale31(s, rl, rl.v, false)) {
      emitFact(s, { kind: 'relic', actors: [...(rl.a ? [rl.a] : []), ...(b.pid ? [`p:${b.pid}`] : [])], severity: 40, visibility: 'public', tags: ['relic', 'auction31', 'record'], src: 'auction31',
        text: fmtL(l('Preço recorde: {n} arrematado por {p}.', 'Record price: {n} bought by {p}.'), { n: rl.n, p: name }) });
    }
    row = [rid, name, lad.price, 0];
  }
  (sess.res ??= []).push(row);
  return row;
}

/** Fecha o pregão inteiro (todos os lotes). */
export function closeSession31(s: GameState, sess: Sess31): void {
  for (const rid of [...sess.lots]) hammer31(s, sess, rid);
  sess.done = 1;
  const sold = (sess.res ?? []).filter((x) => x[2] > 0);
  if (sold.length) auction31(s).log.push([s.week, fmtL(l('{h}: {n} lote(s) vendido(s).', '{h}: {n} lot(s) sold.'), { h: houseName31(s, sess.house, sess.city), n: sold.length })]);
  const st = auction31(s);
  if (st.log.length > 40) st.log.splice(0, st.log.length - 40);
}

// ---------------------------------------------------------------- ganchos do motor

relicAuctionHook9.f = (s, rl) => auctionOn31(s) && !!sessionOf31(s, rl.id);

registerSimHook('newgame', 'auction31', (s) => { if (auctionOn31(s)) { ensureSessions31(s); assignLots31(s); } });
registerSimHook('month', 'auction31', (s) => { if (auctionOn31(s)) { ensureSessions31(s); assignLots31(s); } });
registerSimHook('week', 'auction31', (s) => {
  if (!auctionOn31(s) || !peek(s)) return;
  assignLots31(s);
  for (const se of openSessions31(s)) if (se.w < s.week) closeSession31(s, se);
  const st = auction31(s);
  st.imports = st.imports.filter((x) => x.arrive >= s.week - 4);
});

// ---------------------------------------------------------------- calendário

registerDeadline('auction31', (s, from, to) => {
  const st = peek(s);
  if (!st || !auctionOn31(s)) return [];
  const out = st.sess.filter((x) => !x.done && x.w >= from && x.w <= to && (x.lots.length || x.house === 'prestige')).map((x) => {
    const mine = x.lots.some((r) => st.cons[r] || relics(s).list.find((y) => y.id === r)?.bid);
    return { id: `auc31:${x.id}`, w: x.w, kind: 'other' as const, tone: mine ? 'bad' as const : 'info' as const, act: mine || undefined,
      t: fmtL(l('{h}: {n} lote(s)', '{h}: {n} lot(s)'), { h: houseName31(s, x.house, x.city), n: x.lots.length }),
      d: mine ? l('Você tem lance ou peça neste pregão.', 'You have a bid or a piece in this sale.') : l('Catálogo aberto na casa de leilões.', 'Catalogue open at the auction house.'),
      goto: { area: 'auction31' } };
  });
  for (const im of st.imports) if (im.arrive >= from && im.arrive <= to) out.push({ id: `auc31i:${im.rid}:${im.w}`, w: im.arrive, kind: 'other', tone: 'info', act: undefined, t: fmtL(l('Chega da alfândega: {n}', 'Clears customs: {n}'), { n: im.n }), d: l('Peça importada a caminho da sede.', 'Imported piece on its way to HQ.'), goto: { area: 'airport31' } });
  return out;
});

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({
  id: 'auction31.fee', area: 'items', kind: 'number', label: l('Comissão da casa de leilões (%)', 'Auction house commission (%)'),
  min: 0, max: 50, step: 1, get: (s) => Math.round(commission(s) * 100), set: (s, v) => { auction31(s).fee = clamp(Number(v), 0, 50) / 100; },
  help: l('Quanto a casa fica do martelo de uma peça sua em consignação.', 'How much the house keeps from the hammer price of your consigned piece.'),
});
registerRunnable({
  id: 'auction31.close', area: 'items', label: l('Bater o martelo do próximo pregão agora', 'Bring down the hammer on the next sale now'),
  help: l('Fecha o próximo pregão com a mesma conta de sempre (lances da plateia e o seu limite).', 'Closes the next sale with the usual calculation (audience bids and your limit).'),
  run: (s) => {
    const se = openSessions31(s).find((x) => x.lots.length);
    if (!se) return { ok: false, text: l('Nenhum pregão com lotes.', 'No sale with lots.') };
    closeSession31(s, se);
    return fmtL(l('{h} fechado.', '{h} closed.'), { h: houseName31(s, se.house, se.city) });
  },
});

/** Lances de um lote para a cena: preço, quem lidera e o próximo lance — e a trava de caixa. */
export function bidLock31(s: GameState, amount: number): L | null {
  return freeCash20(s) >= amount ? null : cashWhy20(s, amount, l('Caixa livre não cobre esse lance.', 'Free cash does not cover that bid.'));
}
/** Sorte pura para a cena (ordem da plateia na sala). */
export const seatRng31 = (s: GameState, sessId: string): Rng => Rng.fromSeed(`${s.config.seed}|auc31seat|${sessId}`);
