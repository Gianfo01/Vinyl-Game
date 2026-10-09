// Rodada 9 — relíquias com história: guitarras lendárias, fitas master, letras manuscritas, troféus e
// figurinos. Nascem de fatos da crônica, trocam de dono (herança, leilão, colecionadores), são roubadas,
// reaparecem, viram peça de museu ou se perdem num incêndio. O jogador pode arrematar em leilão.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, money, nextId, notify, post } from '../util';
import { chron, chronListeners, nameOf, type ChronEv } from './chron9';

export type RelicKind = 'guitar' | 'tape' | 'lyrics' | 'trophy' | 'outfit' | 'mic';
export type RelicStatus = 'kept' | 'auction' | 'stolen' | 'lost' | 'museum' | 'player';
export interface Relic {
  id: string;
  k: RelicKind;
  n: L;
  /** ato de origem e pessoa */
  a?: string;
  p?: string;
  y: number;
  /** histórico de donos: nome, ano, como */
  own: [string, number, string][];
  st: RelicStatus;
  /** valor em dólares reais */
  v: number;
  /** semana em que o leilão termina */
  au?: number;
}
export interface Relics9State { list: Relic[] }
declare module '../ext4' { interface Ext4 { relics9: Relics9State } }
registerExt4('relics9', () => ({ list: [] }));
export function relics(s: GameState): Relics9State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.relics9 ??= { list: [] }) as Relics9State;
  st.list ??= [];
  return st;
}

export const RELIC_KIND: Record<RelicKind, L> = {
  guitar: l('Guitarra', 'Guitar'), tape: l('Fitas master', 'Master tapes'), lyrics: l('Letra manuscrita', 'Handwritten lyrics'),
  trophy: l('Troféu', 'Trophy'), outfit: l('Figurino', 'Stage outfit'), mic: l('Microfone', 'Microphone'),
};
export const RELIC_ST: Record<RelicStatus, L> = {
  kept: l('com o dono', 'with its owner'), auction: l('em leilão', 'at auction'), stolen: l('roubada', 'stolen'), lost: l('perdida', 'lost'), museum: l('em museu', 'in a museum'), player: l('no seu acervo', 'in your collection'),
};
const COLLECTORS = ['Hartmann', 'Sato', 'Okafor', 'Delacroix', 'Moreira', 'Lindqvist', 'Castellano', 'Brandt', 'Ivanova', 'Whitlock'];

export function addRelic(s: GameState, k: RelicKind, n: L, actId: string | undefined, pid: string | undefined, v: number, y = s.year): Relic {
  const st = relics(s);
  const owner = (pid && nameOf(s, pid)) || (actId && nameOf(s, actId)) || '?';
  const rl: Relic = { id: nextId(s, 'rl'), k, n, a: actId, p: pid, y, own: [[owner, y, 'origem']], st: 'kept', v: Math.round(v) };
  st.list.push(rl);
  if (st.list.length > 60) {
    const i = st.list.findIndex((x) => x.st === 'lost') >= 0 ? st.list.findIndex((x) => x.st === 'lost') : st.list.findIndex((x) => x.st !== 'player');
    if (i >= 0) st.list.splice(i, 1);
  }
  return rl;
}

/** Fatos que geram relíquias. */
chronListeners().push((s: GameState, e: ChronEv) => {
  const a = e.a?.[0] ? s.acts[e.a[0]] : undefined;
  if (!a) return;
  const lead = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0];
  const ln = lead ? nameOf(s, lead) : a.name;
  const has = (k: RelicKind) => relics(s).list.some((x) => x.a === a.id && x.k === k);
  if ((e.k === 'legend' || e.k === 'hall_of_fame') && !has('guitar')) addRelic(s, s.persons[lead ?? '']?.role === 'vocal' ? 'mic' : 'guitar', fmtL(l('{k} de {p}', '{p}\'s {k}'), { k: s.persons[lead ?? '']?.role === 'vocal' ? l('O microfone', 'microphone') : l('A guitarra', 'guitar'), p: ln }), a.id, lead, 40000 + a.fame * 2500);
  else if (e.k === 'number1' && a.fame > 45 && !has('tape') && (e.y + e.m) % 3 === 0) addRelic(s, 'tape', fmtL(l('Fitas master de {a}', '{a} master tapes'), { a: a.name }), a.id, undefined, 25000 + a.fame * 1500);
  else if (e.k === 'award' && e.i >= 4 && !has('trophy')) addRelic(s, 'trophy', fmtL(l('Gramófono de Ouro de {a} ({y})', '{a}\'s Golden Gramophone ({y})'), { a: a.name, y: e.y }), a.id, undefined, 15000 + a.fame * 800);
  else if (e.k === 'masterpiece') { const pid = e.a?.[1]; addRelic(s, 'lyrics', fmtL(l('Caderno do surto criativo de {p}', '{p}\'s creative-fit notebook'), { p: pid ? nameOf(s, pid) : ln }), a.id, pid, 12000 + a.fame * 900); }
  else if (e.k === 'death' && e.i >= 4 && !has('outfit')) { const pid = e.a?.find((x) => s.persons[x] && !s.persons[x].alive); addRelic(s, 'outfit', fmtL(l('Figurino de palco de {p}', '{p}\'s stage outfit'), { p: pid ? nameOf(s, pid) : ln }), a.id, pid, 20000 + a.fame * 1200); }
});

export function relicPrice(s: GameState, rl: Relic): number {
  return money(s, rl.v * (rl.st === 'auction' ? 1 : 1.3));
}

/** Arrematar uma relíquia em leilão. Devolve erro ou null. */
export function buyRelic(s: GameState, id: string): L | null {
  const rl = relics(s).list.find((x) => x.id === id);
  if (!rl || rl.st !== 'auction') return l('Não está em leilão.', 'Not at auction.');
  const price = relicPrice(s, rl);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `relic:${rl.id}`, -price, 'acquisitions', `Leilão: ${rl.n.pt}`);
  rl.st = 'player';
  rl.au = undefined;
  rl.own.push([s.config.companyName, s.year, 'leilão']);
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
  chron(s, { k: 'relic', i: 2, a: rl.a ? [rl.a] : [], t: fmtL(l('{c} arremata em leilão: {n}.', '{c} wins at auction: {n}.'), { c: s.config.companyName, n: rl.n }) });
  return null;
}
/** Vender uma relíquia do acervo (vai a leilão, recebe 85%). */
export function sellRelic(s: GameState, id: string): L | null {
  const rl = relics(s).list.find((x) => x.id === id);
  if (!rl || rl.st !== 'player') return l('Não é sua.', 'Not yours.');
  post(s, `relicsale:${rl.id}`, Math.round(money(s, rl.v) * 0.85), 'asset_sales', `Venda: ${rl.n.pt}`);
  rl.st = 'kept';
  rl.own.push([`${COLLECTORS[rl.id.length % COLLECTORS.length]} (colecionador)`, s.year, 'compra']);
  return null;
}

const fate = (s: GameState, r: Rng, rl: Relic): void => {
  const owner = rl.p ? s.persons[rl.p] : undefined;
  const col = () => `${r.pick(COLLECTORS)} (${r.pick(['colecionador', 'museu privado', 'fã'])})`;
  if (rl.st === 'auction') {
    if (rl.au !== undefined && s.week < rl.au) return;
    rl.st = 'kept';
    rl.au = undefined;
    rl.v = Math.round(rl.v * r.float(1, 1.4));
    rl.own.push([col(), s.year, 'leilão']);
    chron(s, { k: 'relic', i: 2, a: rl.a ? [rl.a] : [], t: fmtL(l('{n} é arrematado por um colecionador.', '{n} goes to a collector.'), { n: rl.n }) });
    return;
  }
  if (rl.st === 'stolen') {
    if (r.chance(0.15)) { rl.st = 'kept'; chron(s, { k: 'relic', i: 2, a: rl.a ? [rl.a] : [], t: fmtL(l('Reaparece {n}, roubado anos atrás.', '{n}, stolen years ago, resurfaces.'), { n: rl.n }) }); }
    return;
  }
  if (rl.st !== 'kept') return;
  rl.v = Math.round(rl.v * 1.03);
  const roll = r.next();
  const auc = owner && !owner.alive ? 0.2 : 0.02;
  if (roll < auc) {
    rl.st = 'auction';
    rl.au = s.week + 13;
    if (owner && !owner.alive && rl.own.length === 1) rl.own.push([`herdeiros de ${owner.name}`, s.year, 'herança']);
    chron(s, { k: 'relic', i: rl.v > 80000 ? 3 : 2, a: rl.a ? [rl.a] : [], t: fmtL(l('Vai a leilão: {n} (lance inicial ${v}).', 'Up for auction: {n} (opening bid ${v}).'), { n: rl.n, v: rl.v.toLocaleString('en-US') }) });
    if (rl.a && s.acts[rl.a]) notify(s, fmtL(l('Leilão: {n}. Veja Lendas → Relíquias.', 'Auction: {n}. See Legends → Relics.'), { n: rl.n }), 'info');
  } else if (roll < auc + 0.02) {
    rl.st = 'stolen';
    chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t: fmtL(l('Roubo! Somem {n}.', 'Theft! {n} vanishes.'), { n: rl.n }) });
  } else if (roll < auc + 0.03) {
    rl.st = 'lost';
    chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t: fmtL(l('Um incêndio destrói {n}.', 'A fire destroys {n}.'), { n: rl.n }) });
  } else if (roll < auc + 0.05 && s.year - rl.y > 15) {
    rl.st = 'museum';
    rl.own.push([r.pick(['Museu do Som', 'Arquivo Nacional da Música', 'Hall dos Ecos']), s.year, 'doação']);
    chron(s, { k: 'relic', i: 2, a: rl.a ? [rl.a] : [], t: fmtL(l('{n} vai para um museu.', '{n} goes to a museum.'), { n: rl.n }) });
  }
};

registerSimHook('month', 'relics9', (s, r) => {
  for (const rl of relics(s).list) if (rl.st === 'auction') fate(s, r, rl);
});
registerSimHook('year', 'relics9', (s, r) => {
  for (const rl of relics(s).list) if (rl.st !== 'auction') fate(s, r, rl);
});
