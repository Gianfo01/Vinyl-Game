// Rodada 9 — relíquias com história: guitarras lendárias, fitas master, letras manuscritas, troféus e
// figurinos. Nascem de fatos da crônica, trocam de dono (herança, leilão, colecionadores), são roubadas,
// reaparecem, viram peça de museu ou se perdem num incêndio. O jogador pode arrematar em leilão.

import { clamp, hashString, type Rng } from '../../core/rng';
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
  /** rodada 11: lance fechado do jogador (dinheiro do jogo) */
  bid?: number;
  /** contraproposta do dono: preço e semana em que expira */
  ctr?: { p: number; w: number };
  /** dono não aceita nova conversa até esta semana */
  cd?: number;
  /** emprestada a um museu até a semana */
  ln?: { to: string; w: number };
  /** exposta na sede do jogador */
  ex?: 1;
  /** emprestada pelo museu ao jogador até a semana */
  brw?: number;
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

/** Preço: no leilão, a compra imediata (arremate já); fora dele, a pedida do dono. */
export function relicPrice(s: GameState, rl: Relic): number {
  return money(s, rl.v * (rl.st === 'auction' ? 1.25 : 1.3));
}
/** Lance inicial do leilão (dinheiro do jogo). */
export const openingBid = (s: GameState, rl: Relic): number => money(s, rl.v);
export const ownerName = (rl: Relic): string => rl.own[rl.own.length - 1]?.[0] ?? '?';
const MUSEUMS = ['Museu do Som', 'Arquivo Nacional da Música', 'Hall dos Ecos'];
const roll = (s: GameState, rl: Relic, what: string): number => (hashString(`${s.config.seed}|rl11|${what}|${rl.id}|${s.week}`) % 1000) / 1000;
const find = (s: GameState, id: string) => relics(s).list.find((x) => x.id === id);

/** Apego do dono à peça (0..1): o próprio artista vivo segura muito; herdeiros e fãs, pouco. */
export function relicAttach(s: GameState, rl: Relic): number {
  const o = ownerName(rl);
  const p = rl.p ? s.persons[rl.p] : undefined;
  let x = rl.own.length === 1 && p?.alive ? 0.75 : /herdeiros/.test(o) ? 0.25 : /fã/.test(o) ? 0.4 : /colecionador|museu privado/.test(o) ? 0.5 : 0.45;
  if (rl.k === 'trophy' || rl.k === 'lyrics') x += 0.08;
  return clamp(x, 0.05, 0.95);
}

export type NegRes = { r: 'accept' | 'counter' | 'refuse'; price: number; msg: L };
/** Oferta direta ao dono de uma peça que não está à venda. `mult` multiplica a pedida (0.5..2.5). */
export function negotiateRelic(s: GameState, id: string, mult: number): NegRes | L {
  const rl = find(s, id);
  if (!rl || rl.st !== 'kept') return l('O dono atual não está negociando.', 'The current owner is not negotiating.');
  if (rl.cd && s.week < rl.cd) return l('O dono não quer conversa agora. Tente mais tarde.', 'The owner will not talk right now. Try later.');
  const ask = relicPrice(s, rl);
  const price = Math.round(ask * clamp(mult, 0.5, 2.5));
  if (s.player.cash < price) return l('Caixa insuficiente para essa oferta.', 'Not enough cash for that offer.');
  const at = relicAttach(s, rl);
  const pAcc = clamp((mult - 0.7) * 0.9 - at * 0.6 + 0.25 + (s.player.reputation.artistic - 50) / 300, 0, 0.95);
  const x = roll(s, rl, 'neg');
  const who = ownerName(rl);
  if (x < pAcc) { buyFrom(s, rl, price, 'compra'); return { r: 'accept', price, msg: fmtL(l('{o} aceita: {n} agora é seu.', '{o} accepts: {n} is now yours.'), { o: who, n: rl.n }) }; }
  if (x < pAcc + 0.35 * (1 - at / 2)) {
    const cp = Math.round(Math.max(price * 1.15, ask * (1 + at * 0.6)));
    rl.ctr = { p: cp, w: s.week + 4 };
    rl.cd = s.week + 4;
    return { r: 'counter', price: cp, msg: fmtL(l('{o} faz uma contraproposta, válida por 4 semanas.', '{o} makes a counter-offer, good for 4 weeks.'), { o: who }) };
  }
  rl.cd = s.week + (mult < 0.9 ? 52 : 26);
  return { r: 'refuse', price, msg: fmtL(l('{o} recusa: "{n} não está à venda."', '{o} refuses: "{n} is not for sale."'), { o: who, n: rl.n }) };
}
export function acceptCounter(s: GameState, id: string): L | null {
  const rl = find(s, id);
  if (!rl?.ctr || rl.st !== 'kept' || s.week > rl.ctr.w) return l('A contraproposta expirou.', 'The counter-offer expired.');
  if (s.player.cash < rl.ctr.p) return l('Caixa insuficiente.', 'Not enough cash.');
  buyFrom(s, rl, rl.ctr.p, 'compra');
  return null;
}
function buyFrom(s: GameState, rl: Relic, price: number, how: string): void {
  post(s, `relicbuy:${rl.id}`, -price, 'acquisitions', `Relíquia: ${rl.n.pt}`);
  rl.st = 'player';
  rl.ctr = rl.au = rl.bid = undefined;
  rl.own.push([s.config.companyName, s.year, how]);
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
  chron(s, { k: 'relic', i: 2, a: rl.a ? [rl.a] : [], t: fmtL(l('{c} compra {n}.', '{c} buys {n}.'), { c: s.config.companyName, n: rl.n }) });
}
/** Lance fechado no leilão: resolvido quando o martelo bate (paga pouco acima do 2º lance, até o seu teto). */
export function placeBid(s: GameState, id: string, amount: number): L | null {
  const rl = find(s, id);
  if (!rl || rl.st !== 'auction') return l('Não está em leilão.', 'Not at auction.');
  if (amount < openingBid(s, rl)) return l('Abaixo do lance inicial.', 'Below the opening bid.');
  if (s.player.cash < amount) return l('Caixa insuficiente para cobrir o lance.', 'Not enough cash to cover the bid.');
  rl.bid = Math.round(amount);
  return null;
}
/** Emprestar uma peça do acervo a um museu por um ano: cachê agora e prestígio. */
export function lendRelic(s: GameState, id: string): L | null {
  const rl = find(s, id);
  if (!rl || rl.st !== 'player' || rl.ln) return l('Indisponível para empréstimo.', 'Not available for loan.');
  const to = MUSEUMS[hashString(rl.id) % MUSEUMS.length];
  rl.ln = { to, w: s.week + 52 };
  rl.ex = undefined;
  post(s, `relicloan:${rl.id}`, Math.round(money(s, rl.v) * 0.05), 'asset_sales', `Empréstimo: ${rl.n.pt}`);
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
  return null;
}
/** Expor na sede (rende prestígio no fim do ano) ou guardar no cofre. */
export function toggleExhibit(s: GameState, id: string): L | null {
  const rl = find(s, id);
  if (!rl || rl.st !== 'player' || rl.ln) return l('Não está no seu cofre.', 'Not in your vault.');
  rl.ex = rl.ex ? undefined : 1;
  return null;
}
/** Doar a um museu: a peça sai do acervo, a reputação sobe bem. */
export function donateRelic(s: GameState, id: string): L | null {
  const rl = find(s, id);
  if (!rl || rl.st !== 'player') return l('Não é sua.', 'Not yours.');
  const m = rl.ln?.to ?? MUSEUMS[hashString(rl.id) % MUSEUMS.length];
  rl.st = 'museum';
  rl.ln = rl.ex = undefined;
  rl.own.push([m, s.year, 'doação']);
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100);
  chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t: fmtL(l('{c} doa {n} ao {m}.', '{c} donates {n} to the {m}.'), { c: s.config.companyName, n: rl.n, m }) });
  return null;
}
/** Pedir a peça de um museu emprestada para expor na sede por um ano. */
export function borrowRelic(s: GameState, id: string): L | null {
  const rl = find(s, id);
  if (!rl || rl.st !== 'museum' || rl.brw) return l('O museu não pode emprestar agora.', 'The museum cannot lend it now.');
  if (rl.cd && s.week < rl.cd) return l('O museu negou há pouco. Tente mais tarde.', 'The museum said no recently. Try later.');
  const fee = Math.round(money(s, rl.v) * 0.06);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  if (roll(s, rl, 'brw') > 0.35 + s.player.reputation.artistic / 140) { rl.cd = s.week + 26; return l('O museu recusa: sua reputação ainda não basta.', 'The museum declines: your reputation is not enough yet.'); }
  post(s, `relicbrw:${rl.id}`, -fee, 'hq', `Empréstimo de museu: ${rl.n.pt}`);
  rl.brw = s.week + 52;
  return null;
}
export const borrowFee = (s: GameState, rl: Relic): number => Math.round(money(s, rl.v) * 0.06);
export const seekFee = (s: GameState, rl: Relic): number => Math.round(money(s, 4000 + rl.v * 0.03));
/** Contratar um detetive atrás de uma peça roubada (devolve ao último dono, com crédito para você). */
export function seekRelic(s: GameState, id: string): L | null {
  const rl = find(s, id);
  if (!rl || rl.st !== 'stolen') return l('Não está desaparecida.', 'Not missing.');
  if (rl.cd && s.week < rl.cd) return l('O detetive ainda está no caso.', 'The investigator is still on the case.');
  const fee = seekFee(s, rl);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `relicseek:${rl.id}`, -fee, 'legal', `Detetive: ${rl.n.pt}`);
  rl.cd = s.week + 26;
  if (roll(s, rl, 'seek') < 0.3) {
    rl.st = 'kept';
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
    chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t: fmtL(l('Detetive pago por {c} recupera {n}.', 'An investigator hired by {c} recovers {n}.'), { c: s.config.companyName, n: rl.n }) });
    return null;
  }
  return l('O detetive não achou nada desta vez.', 'The investigator found nothing this time.');
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
    const top = Math.round(rl.v * r.float(1, 1.4));
    const bid = rl.bid;
    rl.bid = undefined;
    if (bid && bid >= money(s, top)) {
      const pay = Math.min(bid, Math.max(money(s, rl.v), Math.round(money(s, top) * 1.05)));
      if (s.player.cash >= pay) {
        rl.v = top;
        buyFrom(s, rl, pay, 'leilão');
        notify(s, fmtL(l('Seu lance venceu: {n} é seu.', 'Your bid won: {n} is yours.'), { n: rl.n }), 'info');
        return;
      }
    }
    if (bid) notify(s, fmtL(l('Seu lance por {n} foi superado.', 'You were outbid for {n}.'), { n: rl.n }), 'info');
    rl.st = 'kept';
    rl.au = undefined;
    rl.v = top;
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
    chron(s, { k: 'relic', i: rl.v > 80000 ? 3 : 2, a: rl.a ? [rl.a] : [], t: fmtL(l('Vai a leilão: {n} (lance inicial ${v}).', 'Up for auction: {n} (opening bid ${v}).'), { n: rl.n, v: Math.round(money(s, rl.v)).toLocaleString('en-US') }) });
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
  for (const rl of relics(s).list) {
    if (rl.st === 'auction') fate(s, r, rl);
    if (rl.ln && s.week >= rl.ln.w) { notify(s, fmtL(l('{n} voltou do empréstimo ao {m}.', '{n} is back from its loan to the {m}.'), { n: rl.n, m: rl.ln.to }), 'info'); rl.ln = undefined; }
    if (rl.brw && s.week >= rl.brw) rl.brw = undefined;
    if (rl.ctr && s.week > rl.ctr.w) rl.ctr = undefined;
  }
});
registerSimHook('year', 'relics9', (s, r) => {
  for (const rl of relics(s).list) if (rl.st !== 'auction') fate(s, r, rl);
  // peças expostas na sede (suas ou emprestadas de museu) rendem prestígio
  const shown = relics(s).list.filter((x) => (x.st === 'player' && x.ex && !x.ln) || x.brw).length;
  if (shown) s.player.reputation.artistic = clamp(s.player.reputation.artistic + Math.min(3, shown), 0, 100);
});
