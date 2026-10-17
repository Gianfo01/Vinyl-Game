// R31 · DECO-L — tela das LOJAS DE DECORAÇÃO (área 'deco31'): as quatro lojas da cidade em cena (estoque do mês; a
// tela só lê), o catálogo pelo correio (1900+) e a loja da internet (2000+), e "Seus lugares": a cena de cada
// estabelecimento seu com as peças postas, levar a mesma peça de um lugar a outro e o que foi roubado. Comprar: para
// você (dinheiro pessoal → casa) ou para a empresa (caixa → sede). O prédio da loja no mapa ganha "Entrar na loja".

import { l, type L } from '../../data/world';
import { STYLE31_L, SLOT31_L, CAT31_L, type DecoDef31 } from '../../data/deco31';
import { getLang, t } from '../../i18n/strings';
import { decoPlaces31, deco31, drawer31, type DecoPlaceDef31 } from '../../sim/r31/deco31';
import {
  DECO_COND31, buyLock31, buyShop31, decoMine31, decoShopsOn31, decoShopsOpen31, moveTo31, orderDeco31, peekDecol31,
  placePub31, remoteCat31, remoteName31, remoteOpen31, remotePrice31, setProgress31, shopName31, shopRows31, weeksToRestockDeco31, SHOP_WHAT31,
  type DecoHow31, type DecoRow31, type DecoShopK31, type DecoVia31,
} from '../../sim/r31/decoshop31';
import { decoFx31 } from '../../sim/r31/deco31';
import { playerPerson } from '../../sim/sys/life';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { registerArea } from '../registry';
import { registerObject5 } from './objects5';
import { PLACE_UI31 } from '../sys/place27ui';
import { lockBtn31 } from './lock31';
import { goDest31 } from './quick31';
import { blitPx31, sceneView31 } from './scene31';
import { MON31 } from './scene31model';
import { SH31, SW31, paintDecoShop31, paintEst31, pieceIcon31, type EstItem31 } from './decol31px';
import type { Painted31 } from './shop31px';

export const DECO_AREA31 = 'deco31';
type Tab = DecoShopK31 | 'mail' | 'net' | 'places';
const UI: { tab: Tab; place: string; room: string; more: boolean } = { tab: 'furniture', place: '', room: '', more: false };
/** Estado da tela (escolha de aba/lugar; só interface). */
export const DECO_UI31 = UI;
/** Abre a tela numa loja (botão do prédio no mapa, calendário, caixa de entrada). */
export function openDecoShop31(tab: Tab): void { UI.tab = tab; goDest31({ area: DECO_AREA31 }); }

const FX_L: Record<string, L> = { rest: l('descanso', 'rest'), prestige: l('prestígio', 'prestige'), crowd: l('público', 'crowd'), opinion: l('opinião de quem visita', 'visitors\' opinion'), cap: l('capacidade', 'capacity'), rec: l('qualidade de gravação', 'recording quality') };
const PLACE_L: Record<string, L> = { home: l('casa', 'home'), sede: l('sede', 'HQ'), venue: l('negócios', 'venues') };
const fxTxt = (d: DecoDef31): string | null => (d.fx ? `${t(FX_L[d.fx.k])} +${Math.round(d.fx.v * 100)}%` : null);
function icon(d: DecoDef31, year: number): HTMLElement {
  const cv = pieceIcon31(d, year);
  cv.className = 'dl31-ic';
  cv.style.width = `${cv.width * 2}px`; cv.style.height = `${cv.height * 2}px`; cv.style.imageRendering = 'pixelated';
  return cv;
}
const say = (r: { ok: boolean; text: L }) => { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); };
const buyBtns = (s: GameState, price: number, go: (how: DecoHow31) => void) => h('div', { class: 'row wrap' },
  lockBtn31(t(l('Para mim (pessoal → casa)', 'For me (personal → home)')), buyLock31(s, 'me', price), () => go('me'), { cls: 'btn small primary' }),
  lockBtn31(t(l('Para a empresa (caixa → sede)', 'For the company (cash → HQ)')), buyLock31(s, 'co', price), () => go('co')));

/** Cartão de uma peça à venda na loja (história, época, efeito, onde pode ir, compra). */
function card(s: GameState, r: DecoRow31): HTMLElement {
  const d = r.def, x = r.x;
  return h('div', { class: 'card dl31-card' },
    h('div', { class: 'row' }, icon(d, s.year), h('div', null, h('b', null, t(d.name)), h('div', { class: 'small' },
      pill(t(STYLE31_L[d.style])), ' ', pill(t(CAT31_L[d.cat])), ' ', pill(x.made === s.year ? t(l('novo', 'new')) : `${x.made}`), ' ', pill(t(DECO_COND31[x.cond])),
      d.to !== undefined && s.year >= d.to ? [' ', pill(t(l('fora de linha · vintage', 'discontinued · vintage')), 'gold')] : null))),
    h('div', null, h('b', null, $(r.price))),
    h('p', { class: 'small muted' }, t(l('Vai em: {p} · lugar: {s}', 'Goes in: {p} · spot: {s}'), { p: d.places.map((p) => t(PLACE_L[p])).join(', '), s: d.slots.map((z) => t(SLOT31_L[z])).join(', ') }), fxTxt(d) ? ` · ${fxTxt(d)}` : ''),
    x.prev.length ? h('div', { class: 'small' }, t(l('Donos anteriores:', 'Previous owners:')), h('ol', null, x.prev.map(([n, a, b]) => h('li', null, `${n} · ${a}–${b}`)))) : null,
    x.ev.length ? h('ul', { class: 'small muted' }, x.ev.map(([y, e]) => h('li', null, `${y} · ${t(e)}`))) : null,
    buyBtns(s, r.price, (how) => say(buyShop31(s, r.offer, how))));
}

// ---------------------------------------------------------------- cenas (fundo → bonecos → frente)

function paintLayers(s: GameState, cv: HTMLCanvasElement, d: Painted31, key: string): void {
  const ctx = blitPx31(cv, d.px.d, SW31, SH31);
  if (!ctx) return;
  for (const pp of d.people) {
    const who = pp.id === 'you' ? playerPerson(s) : { id: `deco31:${key}:${pp.id}` };
    if (!who) continue;
    const sp = avatarSprite(lookOf(who), { year: s.year, pose: 'stand', dir: pp.dir, frame: 0 });
    if (!pp.behind) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(pp.x - 6, pp.y, 12, 1); }
    ctx.drawImage(sp.c, pp.x - sp.ax, pp.y - sp.ay + 1);
  }
  const fc = document.createElement('canvas');
  const fctx = blitPx31(fc, d.front.d, SW31, SH31);
  if (fctx) ctx.drawImage(fc, 0, 0);
}

function shopScene(s: GameState, k: DecoShopK31): HTMLElement {
  const rows = shopRows31(s, k);
  const pt = getLang() === 'pt';
  const w = weeksToRestockDeco31(s);
  const d = paintDecoShop31({ k, year: s.year, month: s.month, city: s.config.homeCity, seed: s.config.homeCity.length * 17 + s.year, name: t(shopName31(k, s.year)),
    head: `${pt ? 'Novidades' : 'New in'} ${t(MON31[s.month])}`, when: pt ? `muda em ${w} sem` : `changes in ${w} wk`, weeks: w,
    items: rows.map((r) => ({ offer: r.offer, def: r.def, price: $(r.price), name: r.def.name })) });
  const list = () => h('div', null, h('p', { class: 'small muted' }, t(SHOP_WHAT31[k])),
    rows.length ? h('div', { class: 'cards' }, rows.map((r) => card(s, r))) : h('p', { class: 'muted small' }, t(l('Tudo vendido. Volte no mês que vem.', 'Sold out. Come back next month.'))));
  return sceneView31(s, {
    id: `deco31-${k}`, title: shopName31(k, s.year), W: SW31, H: SH31,
    spots: d.spots,
    paint: (cv) => paintLayers(s, cv, d, k),
    panels: {
      buy: (offer?: string) => { const r = rows.find((x) => x.offer === offer); modal(t(l('Peça à venda', 'Piece for sale')), r ? card(s, r) : h('p', { class: 'muted' }, t(l('Esta peça já saiu.', 'This piece is gone.')))); },
      news: () => modal(t(shopName31(k, s.year)), list(), { wide: true }),
    },
    list,
    intro: l('Cada peça é única, com ano, estado e história. O estoque inteiro troca na virada do mês.', 'Each piece is unique, with year, condition and history. The whole stock changes at the turn of the month.'),
    legend: h('p', { class: 'small muted' }, t(l('Pessoal sai do seu bolso e vai para a sua casa; empresa sai do caixa e vai para a sede.', 'Personal comes out of your pocket and goes home; company comes out of the cash and goes to HQ.'))),
  });
}

// ---------------------------------------------------------------- correio e internet

function remote(s: GameState, via: DecoVia31): HTMLElement {
  if (!remoteOpen31(s, via)) return h('p', { class: 'muted' }, t(via === 'mail' ? l('O catálogo pelo correio começa em 1900.', 'The mail-order catalogue starts in 1900.') : l('Comprar pela internet só a partir de 2000.', 'Online shopping only from 2000.')));
  const all = remoteCat31(s, via);
  const shown = UI.more ? all : all.slice(0, 18);
  const ord = (peekDecol31(s)?.ord ?? []).filter((o) => o.via === via);
  const row = (d: DecoDef31) => { const price = remotePrice31(s, d, via);
    return h('div', { class: 'card dl31-row' }, h('div', { class: 'row' }, icon(d, s.year), h('div', null, h('b', null, t(d.name)), h('div', { class: 'small' }, pill(t(STYLE31_L[d.style])), ' ', pill(t(CAT31_L[d.cat])), fxTxt(d) ? [' ', pill(fxTxt(d)!, 'good')] : null))),
      h('div', null, h('b', null, $(price)), ' ', h('small', { class: 'muted' }, t(via === 'mail' ? l('com frete · chega em semanas', 'with postage · arrives in weeks') : l('chega em poucos dias', 'arrives in a few days')))),
      buyBtns(s, price, (how) => say(orderDeco31(s, d.id, via, how)))); };
  return h('div', { class: via === 'mail' ? 'dl31-mail' : 'dl31-net' },
    h('div', { class: 'dl31-head' }, h('b', null, t(remoteName31(via, s.year))), ' ', h('span', { class: 'small muted' }, `${s.year}`)),
    ord.length ? section(t(l('A caminho', 'On the way')), h('ul', { class: 'attr-list' }, ord.map((o) => { const d = all.find((x) => x.id === o.def);
      return h('li', null, h('b', null, d ? t(d.name) : o.def), ' · ', t(l('chega em {n} semana(s), na porta {w}', 'arrives in {n} week(s), at the {w} door'), { n: Math.max(0, o.due - s.week), w: t(o.to === 'me' ? l('de casa', 'home') : l('da sede', 'HQ')) })); }))) : null,
    h('div', { class: 'cards' }, shown.map(row)),
    all.length > shown.length ? h('button', { class: 'btn small', onclick: () => { UI.more = true; rerender(); } }, t(l('Ver o catálogo inteiro ({n} peças)', 'See the whole catalogue ({n} pieces)'), { n: all.length })) : null,
    h('p', { class: 'small muted' }, t(l('Fora de linha não está no catálogo: procure no antiquário ou nos leilões.', 'Discontinued pieces are not in the catalogue: look at the antique shop or at auctions.'))));
}

// ---------------------------------------------------------------- seus lugares

function placeScene(s: GameState, p: DecoPlaceDef31): HTMLElement {
  const room = p.rooms.find((r) => r.id === UI.room) ?? p.rooms.find((r) => r.id === 'bar') ?? p.rooms[0];
  const at = deco31(s).at;
  const items: EstItem31[] = [];
  const mine = decoMine31(s);
  for (const sp of room.spots) { const id = at[`${p.key}|${room.id}|${sp.id}`]; const m = id ? mine.find((x) => x.o.id === id) : undefined; if (m) items.push({ d: m.def, slot: sp.slot, x: sp.x }); }
  const pub = placePub31(s, p.key);
  const d = paintEst31({ year: s.year, month: s.month, city: s.config.homeCity, seed: p.key.length * 13 + s.year, name: t(p.name), room, items, pub });
  return sceneView31(s, { id: `deco31-place`, title: p.name, W: SW31, H: SH31, spots: d.spots, paint: (cv) => paintLayers(s, cv, d, p.key), panels: { room: () => undefined }, list: () => h('div'), intro: l('As peças postas aparecem na cena; num lugar aberto ao público, os clientes veem (e o submundo também).', 'Placed pieces show in the scene; in a place open to the public, customers see them (and so does the underworld).') });
}
function places(s: GameState): HTMLElement {
  const ps = decoPlaces31(s);
  const p = ps.find((x) => x.key === UI.place) ?? ps.find((x) => x.kind === 'venue') ?? ps[0];
  if (!p) return h('p', { class: 'muted' }, t(l('Nenhum lugar decorável.', 'No place to decorate.')));
  const mine = decoMine31(s);
  const here = mine.filter((m) => m.at?.split('|')[0] === p.key);
  const others = ps.filter((x) => x.key !== p.key);
  const pub = placePub31(s, p.key);
  const fx = (['crowd', 'prestige', 'rest', 'opinion', 'rec', 'cap'] as const).map((k) => [k, decoFx31(s, k, p.key)] as const).filter(([, v]) => v > 0);
  const stolen = mine.filter((m) => m.stolen);
  // chegou agora (correio/internet nas últimas 4 semanas), com onde foi parar
  const fresh = mine.filter((m) => (m.o.origin === 'mail' || m.o.origin === 'net') && s.week - (m.o.history[0]?.w ?? -99) <= 4);
  return h('div', null,
    h('div', { class: 'row wrap' },
      select(p.key, ps.map((x) => ({ value: x.key, label: t(x.name) })), (v) => { UI.place = v; UI.room = ''; rerender(); }),
      p.rooms.length > 1 ? select(UI.room || p.rooms[0].id, p.rooms.map((r) => ({ value: r.id, label: t(r.name) })), (v) => { UI.room = v; rerender(); }) : null,
      pub ? pill(t(l('aberto ao público', 'open to the public')), 'gold') : pill(t(l('fechado', 'private'))),
      ...fx.map(([k, v]) => pill(`${t(FX_L[k])} +${Math.round(v * 100)}%`, 'good'))),
    fresh.length ? h('div', { class: 'card dl31-arrived' }, h('b', null, t(l('Chegou na porta', 'Arrived at the door'))), h('ul', { class: 'attr-list' }, fresh.map((m) => h('li', null, icon(m.def, s.year), ' ', h('b', null, t(m.def.name)), ' · ',
      t(m.o.origin === 'mail' ? l('pelo correio', 'by mail') : l('pela internet', 'online')), ' · ', m.at ? t(l('já posta: {p}', 'already placed: {p}'), { p: t(decoPlaces31(s).find((x) => x.key === m.at!.split('|')[0])?.name ?? l('?', '?')) }) : t(l('na gaveta', 'in the drawer')))))) : null,
    placeScene(s, p),
    section(t(l('Peças aqui', 'Pieces here')), here.length ? h('ul', { class: 'attr-list' }, here.map((m) => { const sel = { to: others[0]?.key ?? '' };
      return h('li', null, icon(m.def, s.year), ' ', h('b', null, t(m.def.name)), ` · ${t(STYLE31_L[m.def.style])} `,
        others.length ? [select(sel.to, others.map((x) => ({ value: x.key, label: t(x.name) })), (v) => { sel.to = v; }), h('button', { class: 'btn small', onclick: () => say(moveTo31(s, m.o.id, sel.to)) }, t(l('Levar para lá', 'Take it there')))] : null); }))
      : h('p', { class: 'small muted' }, t(l('Nada posto aqui ainda.', 'Nothing placed here yet.')))),
    section(t(l('Na gaveta (suas peças fora do lugar)', 'In the drawer (your pieces not placed)')), (() => { const dr = drawer31(s, undefined, p.kind); return dr.length ? h('ul', { class: 'attr-list' }, dr.map((o) => { const m = mine.find((x) => x.o.id === o.id); return m ? h('li', null, icon(m.def, s.year), ' ', h('b', null, t(m.def.name)), ' ', h('button', { class: 'btn small', onclick: () => say(moveTo31(s, o.id, p.key, UI.room || undefined)) }, t(l('Pôr aqui', 'Place here')))) : null; })) : h('p', { class: 'small muted' }, t(l('Gaveta vazia para este lugar.', 'Drawer empty for this place.'))); })()),
    stolen.length ? section(t(l('Roubadas', 'Stolen')), h('ul', { class: 'attr-list' }, stolen.map((m) => h('li', null, h('b', null, t(m.def.name)), ' · ', t(l('roubada na semana {w}; quem está com ela é gente do submundo', 'stolen in week {w}; underworld people have it'), { w: m.stolen!.w }))))) : null,
    section(t(l('Conjuntos por época', 'Sets by era')), h('div', { class: 'row wrap' }, setProgress31(s).map((x) => pill(`${t(STYLE31_L[x.style])} ${x.have}/${x.of}`, x.done ? 'gold' : '')))));
}

// ---------------------------------------------------------------- a tela

export function decoShop31Page(s: GameState): HTMLElement {
  if (!decoShopsOn31(s)) return h('p', { class: 'muted' }, t(l('As lojas de decoração estão desligadas nesta partida.', 'Decoration shops are off in this game.')));
  const open = decoShopsOpen31(s);
  const tabs: [Tab, L][] = [...open.map((k) => [k, shopName31(k, s.year)] as [Tab, L]),
    ...(remoteOpen31(s, 'mail') ? [['mail', remoteName31('mail', s.year)] as [Tab, L]] : []),
    ...(remoteOpen31(s, 'net') ? [['net', remoteName31('net', s.year)] as [Tab, L]] : []),
    ['places', l('Seus lugares', 'Your places')]];
  const tab = tabs.some(([k]) => k === UI.tab) ? UI.tab : tabs[0][0];
  const body = tab === 'mail' || tab === 'net' ? remote(s, tab) : tab === 'places' ? places(s) : shopScene(s, tab);
  return h('div', { class: 'r31-deco' },
    h('div', { class: 'row wrap', role: 'tablist' }, tabs.map(([k, lb]) => h('button', { type: 'button', role: 'tab', class: `btn small${k === tab ? ' primary' : ''}`, 'aria-selected': k === tab ? 'true' : 'false', onclick: () => { UI.tab = k; UI.more = false; rerender(); } }, t(lb)))),
    body);
}

// onda 5: as lojas de decoração são prédios da cidade (Shift+O: decOração)
registerObject5({ id: 'decoracao', label: l('Lojas de decoração', 'Decoration shops'), place: 'cidade.loja', frame: 'predio', key: 'shift+o', opens: [{ area: DECO_AREA31 }],
  note: l('Móveis, antiquário, eletrônicos, galeria, correio/internet e os seus lugares decorados.', 'Furniture, antiques, electronics, gallery, mail/online and your decorated places.') });
registerArea({ id: DECO_AREA31, label: l('Lojas de decoração', 'Decoration shops'), icon: 'house', key: '', render: (s) => decoShop31Page(s), visible: () => false });
// o prédio da loja no mapa: "Entrar na loja" (uma por loja quando o centro comercial junta várias)
PLACE_UI31.extra.push((s, p) => (p.deco31 ? h('span', { class: 'row wrap' }, [p.deco31, ...(p.deco31x ?? [])].map((k) =>
  h('button', { type: 'button', class: 'btn small', onclick: () => openDecoShop31(k) }, t(p.deco31x?.length ? shopName31(k, s.year) : l('Entrar na loja', 'Enter the shop'))))) : null));
