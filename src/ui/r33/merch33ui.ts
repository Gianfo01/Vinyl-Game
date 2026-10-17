// R33 · POL33-A itens 4 e 5 — o hub de MERCH (cartões de ações, ACOES5/EXP-13), sem tela nova: do botão do festival abre o
// cartão com os números e 6 ações; cada uma leva a um cartão (lojas e bancas, marca própria, banca na turnê, pirataria,
// vitrine para a rua, colecionadores). Comprar/ganhar peça, abrir a linha etc. chamam as funções de sim/r33/merch33.ts
// (fonte única) e só mostram o motivo do bloqueio no botão. Montar o cartão só lê.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { cashWhy20, freeCash20 } from '../../sim/oblig20';
import {
  ITEMS33, WHERE33, acceptOffer33, buyOffer33, clearWindow33, closeLine33, declineOffer33, letPass33, lineCost33, lineIncome33, lineLock33, mineActs33, merchOn, myRelics33, offers33,
  openLine33, peekM33, reportCost33, reportLock33, reportPirate33, setWindow33, standLock33, standUnits33, stockStand33, tourOf33, windowIncome33, windowLock33, type Where33,
} from '../../sim/r33/merch33';
import { TIER_NAME31, relicTierOf31 } from '../../sim/r31/relic31';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { usd } from '../../sim/sys/crime17';
import { showAdhoc5 } from '../r31/acoes5';
import type { ActRes5, Card5, CardAct5 } from '../r31/acoes5model';
import { rerender } from '../common';
import { store } from '../store';

const $ = (c: number): string => t(usd(c));
let view = 'hub';
let at: DOMRect | undefined;

const nav = (id: string, label: L, to: string): CardAct5 => ({ id, label, kind: 'do', run: () => { view = to; } });
const back = (to = 'hub'): CardAct5 => nav('m33.voltar', l('Voltar', 'Back'), to);
const go = (id: string, label: L, lock: L | null, fn: () => L | null, ok: L): CardAct5 => ({ id, label, kind: 'do', lock, run: (): ActRes5 => { const e = fn(); return e ? { text: e, bad: true } : { text: ok }; } });
const cashLock = (s: GameState, c: number): L | null => (c > 0 && freeCash20(s) < c ? cashWhy20(s, c, l('Caixa livre insuficiente.', 'Not enough free cash.')) : null);

function hub(s: GameState): Card5 {
  const m = peekM33(s), rel = myRelics33(s);
  return { id: 'm33.hub', title: l('Merch e colecionáveis', 'Merch and collectibles'), tip: l('Peças pelo sistema de relíquias: dono, valor, raridade, vitrine e leilão.', 'Pieces in the relic system: owner, value, rarity, window and auction.'),
    nums: [
      { label: l('Peças no acervo', 'Pieces owned'), value: String(rel.length) },
      { label: l('Linhas de merch abertas', 'Open merch lines'), value: String(Object.keys(m?.lines ?? {}).length) },
      { label: l('Pirataria solta', 'Bootlegs active'), value: String(Object.values(m?.pirate ?? {}).filter((p) => !p.ended).length), tone: Object.values(m?.pirate ?? {}).some((p) => !p.ended) ? 'bad' : undefined },
    ], lines: [], acts: [
      nav('m33.lojas', l('Lojas e bancas', 'Shops and stands'), 'shops'), nav('m33.linha', l('Marca própria de merch', 'Own merch label'), 'line'), nav('m33.banca', l('Banca na turnê', 'Tour stand'), 'stand'),
      nav('m33.pirata', l('Pirataria', 'Bootlegs'), 'pirate'), nav('m33.vitrine', l('Vitrine para a rua', 'Street window'), 'window'), nav('m33.colec', fmtL(l('Colecionadores ({n})', 'Collectors ({n})'), { n: m?.offers.length ?? 0 }), 'collect'),
    ] };
}
function shops(s: GameState): Card5 {
  const ws: Where33[] = ['festival', 'venue', 'records', 'stadium', 'museum', 'airport'];
  if (mineActs33(s).some((a) => tourOf33(s, a.id))) ws.push('show');
  const acts = ws.filter((w) => s.year >= WHERE33[w].from).map((w) => nav(`m33.w.${w}`, fmtL(l('{n} ({k})', '{n} ({k})'), { n: WHERE33[w].n, k: offers33(s, w).filter((o) => !o.bought).length }), `shop:${w}`));
  return { id: 'm33.lojas', title: l('Lojas e bancas', 'Shops and stands'), tip: l('O estoque muda a cada mês. Clubes de jazz e boates: pelo cartão do bar.', 'Stock changes every month. Jazz clubs and nightclubs: through the bar card.'), nums: [], lines: [], acts: [...acts, back()] };
}
function shop(s: GameState, w: Where33): Card5 {
  const os = offers33(s, w);
  const acts: CardAct5[] = os.map((o) => go(`m33.b.${o.key}`, o.bought ? fmtL(l('Levada: {n}', 'Taken: {n}'), { n: o.name }) : o.free ? fmtL(l('Ganhar: {n}', 'Get: {n}'), { n: o.name }) : fmtL(l('{n} · {c}', '{n} · {c}'), { n: o.name, c: $(o.price) }),
    o.bought ? l('Você já levou esta peça.', 'You already took this piece.') : cashLock(s, o.price), () => buyOffer33(s, o.key), l('A peça entrou no seu acervo de relíquias.', 'The piece joined your relic collection.')));
  return { id: `m33.shop.${w}`, title: WHERE33[w].n, tip: os.length ? undefined : l('Nada à venda neste mês.', 'Nothing for sale this month.'), nums: [], lines: os.filter((o) => o.fest).map((o) => fmtL(l('Festival: {f}', 'Festival: {f}'), { f: o.fest! })), acts: [...acts, back('shops')] };
}
function line(s: GameState): Card5 {
  const mine = mineActs33(s).slice(0, 4), m = peekM33(s);
  const total = mine.filter((a) => m?.lines[a.id]).reduce((n, a) => n + lineIncome33(s, a), 0);
  const acts = mine.map((a) => (m?.lines[a.id] ? go(`m33.l.x.${a.id}`, fmtL(l('Fechar a linha de {a}', 'Close {a}\'s line'), { a: a.name }), null, () => closeLine33(s, a.id), l('Linha fechada.', 'Line closed.'))
    : go(`m33.l.${a.id}`, fmtL(l('Abrir a linha de {a} · {c}', 'Open {a}\'s line · {c}'), { a: a.name, c: $(lineCost33(s)) }), lineLock33(s, a.id), () => openLine33(s, a.id), l('Linha aberta: a renda cai todo mês.', 'Line open: income arrives every month.'))));
  return { id: 'm33.linha', title: l('Marca própria de merch', 'Own merch label'), tip: l('Rende mais quando o artista está em alta; a pirataria come parte.', 'Earns more while the act is hot; bootlegs eat part of it.'),
    nums: [{ label: l('Renda por mês', 'Income per month'), value: $(total) }], lines: mine.length ? [] : [l('Você não tem artista.', 'You have no act.')], acts: [...acts, back()] };
}
function stand(s: GameState): Card5 {
  const tours = mineActs33(s).filter((a) => tourOf33(s, a.id)).slice(0, 2), m = peekM33(s);
  const acts: CardAct5[] = [];
  for (const a of tours) for (const u of standUnits33) acts.push(go(`m33.s.${a.id}.${u}`, fmtL(l('Levar {u} peças: {a}', 'Take {u} pieces: {a}'), { u, a: a.name }), standLock33(s, a.id, u), () => stockStand33(s, a.id, u), l('Banca montada: o que sobra encalha, o que falta perde venda.', 'Stand set up: leftovers sit unsold, shortfalls lose sales.')));
  const lines = Object.values(m?.stand ?? {}).map((x) => fmtL(l('{a}: sobram {n} · vendidas {v} · venda perdida {p}', '{a}: {n} left · {v} sold · {p} lost'), { a: s.acts[x.act]?.name ?? '?', n: x.left, v: x.sold, p: x.lost }));
  return { id: 'm33.banca', title: l('Banca na turnê', 'Tour stand'), tip: tours.length ? undefined : l('Nenhum artista seu está em turnê agora.', 'None of your acts is on tour now.'), nums: [], lines, acts: [...acts, back()] };
}
function pirate(s: GameState): Card5 {
  const ps = Object.entries(peekM33(s)?.pirate ?? {}).filter(([, p]) => !p.ended).slice(0, 3);
  const acts: CardAct5[] = [];
  for (const [id] of ps) {
    const a = s.acts[id]?.name ?? '?';
    acts.push(go(`m33.p.d.${id}`, fmtL(l('Denunciar no cartório: {a} · {c}', 'Report to the registry: {a} · {c}'), { a, c: $(reportCost33(s)) }), reportLock33(s, id), () => reportPirate33(s, id), l('Falsificação denunciada e encerrada.', 'Bootlegs reported and ended.')));
    acts.push(go(`m33.p.l.${id}`, fmtL(l('Deixar passar: {a}', 'Let it go: {a}'), { a }), null, () => letPass33(s, id), l('Você deixou passar: a venda cai um pouco.', 'You let it slide: sales dip a little.')));
  }
  return { id: 'm33.pirata', title: l('Pirataria', 'Bootlegs'), tip: l('Camisetas falsas aparecem perto de shows grandes.', 'Fake shirts show up near big shows.'), nums: [], lines: ps.length ? ps.map(([id, p]) => fmtL(l('{a}: nível {n}', '{a}: level {n}'), { a: s.acts[id]?.name ?? '?', n: p.lvl })) : [l('Nenhuma falsificação agora.', 'No bootlegs right now.')], acts: [...acts, back()] };
}
function window(s: GameState): Card5 {
  const m = peekM33(s), cur = m?.window ? myRelics33(s).find((r) => r.id === m.window) : undefined;
  const acts: CardAct5[] = myRelics33(s).filter((r) => r.id !== m?.window).slice(0, 4).map((r) => go(`m33.v.${r.id}`, fmtL(l('Expor: {n}', 'Show: {n}'), { n: r.n }), windowLock33(s, r.id), () => setWindow33(s, r.id), l('A peça está na vitrine voltada para a rua.', 'The piece is in the street-facing window.')));
  if (cur) acts.push(go('m33.v.x', l('Tirar da vitrine', 'Take out of the window'), null, () => clearWindow33(s), l('Vitrine vazia.', 'Window emptied.')));
  return { id: 'm33.vitrine', title: l('Vitrine para a rua', 'Street window'), tip: l('Uma peça na fachada da sede traz um pouco de movimento ao bairro.', 'A piece in the HQ window brings a little foot traffic to the block.'),
    nums: [{ label: l('Movimento por mês', 'Traffic per month'), value: $(windowIncome33(s)) }], lines: cur ? [fmtL(l('Na vitrine: {n} ({t})', 'In the window: {n} ({t})'), { n: cur.n, t: TIER_NAME31[relicTierOf31(s, cur)] })] : [l('A vitrine está vazia.', 'The window is empty.')], acts: [...acts, back()] };
}
function collect(s: GameState): Card5 {
  const os = peekM33(s)?.offers ?? [], acts: CardAct5[] = [];
  for (const o of os.slice(0, 2)) {
    const rl = myRelics33(s).find((r) => r.id === o.rid);
    acts.push(go(`m33.c.a.${o.rid}`, fmtL(l('Aceitar de {w}: {n} · {c}', 'Accept from {w}: {n} · {c}'), { w: o.who, n: rl?.n ?? '?', c: $(o.price) }), null, () => acceptOffer33(s, o.rid), l('Peça vendida ao colecionador.', 'Piece sold to the collector.')));
    acts.push(go(`m33.c.r.${o.rid}`, fmtL(l('Recusar {w}', 'Decline {w}'), { w: o.who }), null, () => declineOffer33(s, o.rid), l('Oferta recusada.', 'Offer declined.')));
  }
  return { id: 'm33.colec', title: l('Colecionadores rivais', 'Rival collectors'), tip: l('Disputam as suas peças e às vezes oferecem compra direta.', 'They chase your pieces and sometimes offer a direct buy.'), nums: [], lines: os.length ? [] : [l('Nenhuma oferta agora.', 'No offers right now.')], acts: [...acts, back()] };
}
const catalog = ITEMS33; void catalog;

function build(s: GameState): Card5 {
  if (view.startsWith('shop:')) return shop(s, view.slice(5) as Where33);
  switch (view) { case 'shops': return shops(s); case 'line': return line(s); case 'stand': return stand(s); case 'pirate': return pirate(s); case 'window': return window(s); case 'collect': return collect(s); default: return hub(s); }
}

/** Abre o hub de merch (ou uma das vistas) ao lado do botão. */
export function openMerch33(rect?: DOMRect, to = 'hub'): void {
  const s = store.game;
  if (!s || !merchOn(s)) return;
  view = to; at = rect;
  showAdhoc5(s, build(s), at, () => { const g = store.game; if (!g) return undefined; rerender(); return build(g); });
}
