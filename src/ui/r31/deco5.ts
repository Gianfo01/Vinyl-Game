// R31 · DECO-M — MODO ARRUMAR. Tecla própria (Shift+O, registrada em keys5) ou o botão "Arrumar" nas cenas da casa e da
// sede da onda 5 (e nos estabelecimentos que a DECO-L ligar). Abre o cômodo em cena com os lugares marcados:
//   · clicar num lugar abre a gaveta (o que você tem que encaixa ali + "comprar mais": a loja da DECO-L quando existir,
//     `registerDecoShop5`; antes dela, o catálogo do ano);
//   · arrastar uma peça de um lugar para outro MOVE a mesma peça (troca quando o destino estava ocupado); arrastar da
//     gaveta põe; arrastar para a gaveta tira;
//   · item obrigatório (telefone, mesa de som…) nunca sai: clicar mostra os níveis (modelo/acabamento) para trocar.
// Atrás de `deco31` e de `exp5.nav`: com a casca nova desligada o botão não aparece e a tecla não faz nada.
// Abrir, trocar de cômodo e olhar a gaveta só leem o estado (explorar não muda o mundo); colocar, tirar e comprar são
// ações do jogador (motor: src/sim/r31/deco31.ts).

import './deco5.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  DECO31, DECO_CAP31, REQ31, SLOT31_L, STYLE31_L, UPG31, inLine31, reqDef31, type DecoDef31, type DecoFxK31, type DecoPlace31, type DecoSlot31,
} from '../../data/deco31';
import {
  DECO_HOOK31, DECO_WHY31, buyDeco31, decoFx31, decoOfObj31, decoOn31, decoPlaces31, decoPrice31, drawer31, parseSpot31, placeDeco31, reqKey31,
  reqLevel31, setReq31, spotKey31, takeDeco31, upgOfObj31, type DecoPlaceDef31, type DecoRoom31,
} from '../../sim/r31/deco31';
import { obj31, type ObjInst } from '../../sim/r31/object';
import { nav5On } from '../../sim/r31/exp5';
import type { GameState } from '../../sim/types';
import { $, toast } from '../common';
import { h } from '../dom';
import { upscale, type Px } from '../pixel/px';
import { store } from '../store';
import { chordLabel5, chordOf5, key5, registerKey5 } from './keys5';
import { decoPx5, reqPx5, roomPx5 } from './deco5px';

registerKey5({ id: 'deco:arrumar', chord: 'shift+o', act: { kind: 'local', id: 'arrumar' }, label: l('Arrumar (decorar a casa, a sede e os negócios)', 'Arrange (decorate home, HQ and venues)'), scope: 'global' });

/** Loja da DECO-L: abre a vitrine que vende peças para o lugar escolhido. Sem registro, a gaveta mostra o catálogo do ano. */
export interface DecoShopCtx5 { s: GameState; slot?: DecoSlot31; kind: DecoPlace31; req?: string; spot: string; done: () => void }
let SHOP5: ((c: DecoShopCtx5) => void) | null = null;
export function registerDecoShop5(fn: (c: DecoShopCtx5) => void): void { SHOP5 = fn; }

/** Estado só da interface (não vai para o save). */
const UI = { open: false, place: 'home', room: '', sel: '' as string, shop: false };

// ---------------------------------------------------------------- disposição do cômodo (PURO)

export interface Box5 { key: string; kind: 'spot' | 'req'; slot: DecoSlot31; req?: string; x: number; y: number; w: number; h: number; anchor: 'center' | 'floor' | 'top' | 'desk' }
export interface Lay5 { W: number; H: number; FL: number; win?: [number, number]; noWin: boolean; boxes: Box5[] }
const CW = 58;
/** Onde fica cada lugar no desenho do cômodo: colunas à esquerda e à direita (parede em cima, chão embaixo), aparador
 *  no meio (sob a janela) com as peças "sobre a mesa", luz no teto, letreiro no alto. Nada se sobrepõe. */
export function lay5(place: string, r: DecoRoom31): Lay5 {
  const H = 120, FL = 100;
  const sp = (k: DecoSlot31) => r.spots.filter((x) => x.slot === k);
  const reqF = r.req.filter((q) => reqDef31(q)?.slot !== 'desk');
  const reqD = r.req.filter((q) => reqDef31(q)?.slot === 'desk');
  const walls = sp('wall'), floors = sp('floor'), desks = sp('desk');
  const cols = Math.max(1, walls.length, floors.length + reqF.length);
  const left = Math.ceil(cols / 2);
  const nd = desks.length + reqD.length;
  const CC = Math.max(72, 26 * nd + 14);
  // a coluna de um obrigatório de chão é mais larga (mesa de som de 24 pistas, piano de cauda, paredão de caixas)
  const cw = Array.from({ length: cols }, (_, i) => (i < reqF.length ? 84 : CW));
  const sum = (a: number, b: number) => cw.slice(a, b).reduce((x, y) => x + y, 0);
  const W = 8 + sum(0, cols) + CC + 8;
  const x0 = 8 + sum(0, left);
  const colX = (i: number) => (i < left ? 8 + sum(0, i) : x0 + CC + sum(left, i));
  const boxes: Box5[] = [];
  const S = (sid: string) => spotKey31(place, r.id, sid);
  walls.forEach((w, i) => boxes.push({ key: S(w.id), kind: 'spot', slot: 'wall', x: colX(i) + 4, y: 12, w: cw[i] - 8, h: 42, anchor: 'center' }));
  const fl: { key: string; kind: 'spot' | 'req'; req?: string }[] = [...reqF.map((q) => ({ key: reqKey31(place, r.id, q), kind: 'req' as const, req: q })), ...floors.map((f) => ({ key: S(f.id), kind: 'spot' as const }))];
  fl.forEach((f, i) => boxes.push({ key: f.key, kind: f.kind, req: f.req, slot: 'floor', x: colX(i) + 2, y: 56, w: cw[i] - 4, h: FL + 2 - 56, anchor: 'floor' }));
  const dk: { key: string; kind: 'spot' | 'req'; req?: string }[] = [...reqD.map((q) => ({ key: reqKey31(place, r.id, q), kind: 'req' as const, req: q })), ...desks.map((d) => ({ key: S(d.id), kind: 'spot' as const }))];
  const dx0 = x0 + Math.floor((CC - 26 * dk.length) / 2);
  dk.forEach((d, i) => boxes.push({ key: d.key, kind: d.kind, req: d.req, slot: 'desk', x: dx0 + i * 26, y: 58, w: 24, h: 20, anchor: 'desk' }));
  const win = sp('window')[0];
  const ww = 36;
  if (win) boxes.push({ key: S(win.id), kind: 'spot', slot: 'window', x: x0 + Math.floor((CC - ww) / 2) - 6, y: 16, w: ww + 12, h: 40, anchor: 'center' });
  const ce = sp('ceiling')[0];
  if (ce) boxes.push({ key: S(ce.id), kind: 'spot', slot: 'ceiling', x: x0 + Math.floor(CC / 2) - 16, y: 0, w: 32, h: 14, anchor: 'top' });
  const sg = sp('sign')[0];
  if (sg) boxes.push({ key: S(sg.id), kind: 'spot', slot: 'sign', x: 10, y: 0, w: 52, h: 11, anchor: 'top' });
  const pa = sp('paper')[0];
  if (pa) boxes.push({ key: S(pa.id), kind: 'spot', slot: 'paper', x: W - 22, y: 60, w: 14, h: 12, anchor: 'center' });
  const gr = sp('ground')[0];
  if (gr) boxes.push({ key: S(gr.id), kind: 'spot', slot: 'ground', x: x0 + Math.floor(CC / 2) - 20, y: FL + 4, w: 40, h: 14, anchor: 'center' });
  return { W, H, FL, win: win ? [x0 + Math.floor((CC - ww) / 2), ww] : undefined, noWin: !win, boxes };
}

/** Pinta o cômodo com tudo o que está posto (PURO, só lê). */
export function paintRoom5(s: GameState, place: string, r: DecoRoom31): { px: Px; lay: Lay5 } {
  const L5 = lay5(place, r);
  const at = (s as unknown as { x4?: { deco31?: { at: Record<string, string> } } }).x4?.deco31?.at ?? {};
  const objs = (s as unknown as { x4?: { obj31?: { objs: Record<string, ObjInst> } } }).x4?.obj31?.objs ?? {};
  const surf = (slot: DecoSlot31): DecoDef31 | undefined => { const b = L5.boxes.find((x) => x.slot === slot); return b ? decoOfObj31(objs[at[b.key]]) : undefined; };
  let seed = 0; for (const c of `${place}|${r.id}`) seed = (seed * 31 + c.charCodeAt(0)) % 997;
  const desks = L5.boxes.filter((b) => b.anchor === 'desk');
  const desk: [number, number] | undefined = desks.length ? [desks[0].x - 4, desks[desks.length - 1].x + desks[desks.length - 1].w + 4] : undefined;
  const px = roomPx5(L5.W, L5.H, s.year, { paper: surf('paper'), ground: surf('ground'), window: surf('window'), ceiling: surf('ceiling'), win: L5.win, noWin: L5.noWin, seed, desk });
  for (const bx of L5.boxes) {
    let p: Px | null = null;
    if (bx.kind === 'req') { const lvd = reqLevel31(s, bx.key); p = reqPx5(bx.req!, lvd.lv, s.year, lvd.upg); }
    else if (['wall', 'floor', 'desk', 'ceiling', 'sign'].includes(bx.slot)) { const d = decoOfObj31(objs[at[bx.key]]); if (d) p = decoPx5(d, s.year, s.config.companyName ?? ''); }
    if (!p) continue;
    const cx = bx.x + Math.floor(bx.w / 2) - Math.floor(p.w / 2);
    const y = bx.anchor === 'floor' ? L5.FL + 2 - p.h : bx.anchor === 'desk' ? 79 - p.h : bx.anchor === 'top' ? 0 : bx.y + Math.floor(bx.h / 2) - Math.floor(p.h / 2);
    px.blit(p, cx, y);
  }
  return { px, lay: L5 };
}

// ---------------------------------------------------------------- abrir / fechar

const game = (): GameState | undefined => store.game ?? undefined;
export const arrumarOk5 = (s: GameState | undefined): boolean => !!s && decoOn31(s) && nav5On(s);
export function openArrumar5(place?: string): void {
  const s = game();
  if (!arrumarOk5(s)) return;
  UI.open = true; UI.sel = ''; UI.shop = false;
  if (place) { UI.place = place; UI.room = ''; }
  draw5();
}
export function closeArrumar5(): void { UI.open = false; document.querySelector('.deco5')?.remove(); }

function draw5(): void {
  const s = game();
  document.querySelector('.deco5')?.remove();
  if (!UI.open || !s) return;
  const places = decoPlaces31(s);
  const p = places.find((x) => x.key === UI.place) ?? places[0];
  if (!p) return;
  UI.place = p.key;
  const r = p.rooms.find((x) => x.id === UI.room) ?? p.rooms[0];
  UI.room = r.id;
  const el = h('div', { class: 'deco5', role: 'dialog', 'aria-label': t(l('Arrumar', 'Arrange')) },
    h('div', { class: 'deco5-card' },
      head5(s, places, p, r),
      h('div', { class: 'deco5-main' }, scene5(s, p, r), side5(s, p, r)),
      fxLine5(s, p)));
  el.addEventListener('click', (e) => { if (e.target === el) closeArrumar5(); });
  document.body.append(el);
}

function head5(s: GameState, places: DecoPlaceDef31[], p: DecoPlaceDef31, r: DecoRoom31): HTMLElement {
  const k = chordLabel5(key5('deco:arrumar')?.chord ?? 'shift+o');
  return h('div', { class: 'deco5-h' },
    h('b', { class: 'deco5-t' }, t(l('Arrumar', 'Arrange')), ' ', h('kbd', { class: 'kb5' }, k)),
    h('span', { class: 'deco5-tabs' }, places.map((x) => h('button', { type: 'button', class: `deco5-tab${x.key === p.key ? ' on' : ''}`, onclick: () => { UI.place = x.key; UI.room = ''; UI.sel = ''; draw5(); } }, t(x.name)))),
    h('span', { class: 'deco5-rooms' }, p.rooms.map((x) => h('button', { type: 'button', class: `deco5-room${x.id === r.id ? ' on' : ''}`, onclick: () => { UI.room = x.id; UI.sel = ''; draw5(); } }, t(x.name)))),
    h('span', { class: 'deco5-yr' }, String(s.year)),
    h('button', { type: 'button', class: 'deco5-x', 'aria-label': t(l('Fechar', 'Close')), title: 'Esc', onclick: closeArrumar5 }, '×'));
}

// ---------------------------------------------------------------- cena com os lugares marcados

const SC = 4;
let dragObj = '';
function scene5(s: GameState, p: DecoPlaceDef31, r: DecoRoom31): HTMLElement {
  const { px, lay } = paintRoom5(s, p.key, r);
  const cv = upscale(px.canvas(), lay.W * SC, lay.H * SC);
  cv.className = 'deco5-cv px';
  const st = deco31peek(s);
  const layer = h('div', { class: 'deco5-layer' });
  for (const b of lay.boxes) {
    const filled = b.kind === 'req' ? true : !!st.at[b.key];
    const name = b.kind === 'req' ? reqDef31(b.req!)!.name : SLOT31_L[b.slot];
    const btn = h('button', {
      type: 'button', class: `deco5-spot ${b.kind}${filled ? ' full' : ''}${UI.sel === b.key ? ' sel' : ''}`,
      title: t(name), 'aria-label': t(name),
      style: `left:${(b.x / lay.W) * 100}%;top:${(b.y / lay.H) * 100}%;width:${(b.w / lay.W) * 100}%;height:${(b.h / lay.H) * 100}%`,
      draggable: b.kind === 'spot' && filled ? 'true' : undefined,
      onclick: () => { UI.sel = b.key; UI.shop = false; draw5(); },
    }, filled ? null : h('i', { class: 'deco5-pin', 'aria-hidden': 'true' }));
    if (b.kind === 'spot') {
      btn.addEventListener('dragstart', (e) => { dragObj = st.at[b.key] ?? ''; (e as DragEvent).dataTransfer?.setData('text/plain', dragObj); });
      btn.addEventListener('dragover', (e) => { e.preventDefault(); btn.classList.add('over'); });
      btn.addEventListener('dragleave', () => btn.classList.remove('over'));
      btn.addEventListener('drop', (e) => { e.preventDefault(); const id = (e as DragEvent).dataTransfer?.getData('text/plain') || dragObj; dragObj = ''; if (id) put5(s, id, b.key); });
    }
    layer.append(btn);
  }
  return h('div', { class: 'deco5-scroll' }, h('div', { class: 'deco5-stage', style: `width:max(100%, ${Math.round(lay.W * 2.5)}px);aspect-ratio:${lay.W} / ${lay.H}` }, cv, layer));
}
const deco31peek = (s: GameState) => (s as unknown as { x4?: { deco31?: { at: Record<string, string>; req: Record<string, string> } } }).x4?.deco31 ?? { at: {}, req: {} };

function put5(s: GameState, id: string, key: string): void {
  const r = placeDeco31(s, id, key);
  if (!r.ok) toast(t(DECO_WHY31[r.why]), 'bad');
  UI.sel = key;
  draw5();
}

// ---------------------------------------------------------------- gaveta

function mini5(px: Px, max = 44): HTMLCanvasElement {
  const k = Math.max(1, Math.min(3, Math.floor(max / Math.max(px.w, px.h)) || 1));
  const c = upscale(px.canvas(), px.w * k, px.h * k);
  c.className = 'deco5-mini px';
  return c;
}
const objName5 = (o: ObjInst): L => (decoOfObj31(o) ?? upgOfObj31(o))?.name ?? l('Peça', 'Item');

function side5(s: GameState, p: DecoPlaceDef31, r: DecoRoom31): HTMLElement {
  const key = UI.sel;
  if (!key) return h('aside', { class: 'deco5-side' }, h('p', { class: 'deco5-hint' }, t(l('Clique num lugar marcado para abrir a gaveta. Arraste uma peça para outro lugar para mudar de lugar (a mesma peça); solte na gaveta para tirar.', 'Click a marked spot to open the drawer. Drag an item to another spot to move it (the same item); drop it on the drawer to take it down.'))),
    h('p', { class: 'deco5-hint' }, t(l('Itens obrigatórios (telefone, mesa de som…) não saem: só trocam de modelo ou sobem de nível.', 'Fixed items (phone, mixing desk…) never leave: they only change model or level up.'))));
  const { spot } = parseSpot31(key);
  if (r.req.includes(spot)) return reqSide5(s, p, r, key, spot);
  const box = lay5(p.key, r).boxes.find((b) => b.key === key);
  const slot = box?.slot ?? 'wall';
  const cur = deco31peek(s).at[key];
  const curO = cur ? obj31(s).objs[cur] : undefined;
  const list = drawer31(s, slot, p.kind);
  const aside = h('aside', { class: 'deco5-side' },
    h('h4', null, `${t(SLOT31_L[slot])} · ${t(r.name)}`),
    curO ? h('div', { class: 'deco5-cur' }, mini5(decoPx5(decoOfObj31(curO)!, s.year)), h('span', null, t(objName5(curO))),
      h('button', { type: 'button', class: 'btn small', onclick: () => { const x = takeDeco31(s, key); if (!x.ok) toast(t(DECO_WHY31[x.why]), 'bad'); draw5(); } }, t(l('Tirar daqui', 'Take down')))) : null,
    h('div', { class: 'deco5-dr-h' }, t(l('Na gaveta', 'In the drawer')), ` (${list.length})`),
    list.length ? h('ul', { class: 'deco5-list' }, list.map((o) => {
      const d = decoOfObj31(o)!;
      const li = h('li', { draggable: 'true' }, h('button', { type: 'button', class: 'deco5-it', onclick: () => put5(s, o.id, key) }, mini5(decoPx5(d, s.year)),
        h('span', null, h('b', null, t(d.name)), h('small', null, `${t(STYLE31_L[d.style])}${d.fx ? ` · ${t(fxText5(d.fx.k, d.fx.v))}` : ''}`))));
      li.addEventListener('dragstart', (e) => { dragObj = o.id; (e as DragEvent).dataTransfer?.setData('text/plain', o.id); });
      return li;
    })) : h('p', { class: 'deco5-hint' }, t(l('Nada na gaveta que sirva aqui.', 'Nothing in the drawer that fits here.'))),
    h('button', { type: 'button', class: 'btn small primary deco5-buy', onclick: () => shop5(s, p, key, slot) }, t(l('Comprar mais', 'Buy more'))),
    UI.shop ? catalog5(s, p, key, slot) : null);
  // soltar uma peça na gaveta = tirar do lugar
  aside.addEventListener('dragover', (e) => e.preventDefault());
  aside.addEventListener('drop', (e) => { e.preventDefault(); const id = (e as DragEvent).dataTransfer?.getData('text/plain') || dragObj; dragObj = ''; const k = Object.entries(deco31peek(s).at).find(([, v]) => v === id)?.[0]; if (k) { takeDeco31(s, k); draw5(); } });
  return aside;
}

function shop5(s: GameState, p: DecoPlaceDef31, key: string, slot?: DecoSlot31, req?: string): void {
  if (SHOP5) { SHOP5({ s, slot, kind: p.kind, req, spot: key, done: draw5 }); return; }
  UI.shop = !UI.shop; draw5();
}

/** Catálogo do ano (antes das lojas da DECO-L): peças à venda agora que servem neste lugar. */
function catalog5(s: GameState, p: DecoPlaceDef31, key: string, slot: DecoSlot31): HTMLElement {
  const how = p.kind === 'home' ? 'me' : 'co';
  const list = DECO31.filter((d) => d.slots.includes(slot) && d.places.includes(p.kind) && inLine31(d, s.year) && d.price > 0).slice(0, 24);
  return h('ul', { class: 'deco5-list deco5-cat' }, list.map((d) => h('li', null, h('button', { type: 'button', class: 'deco5-it', onclick: () => {
    const r = buyDeco31(s, `deco:${d.id}`, how);
    if (!r.ok) { toast(t(r.why), 'bad'); return; }
    placeDeco31(s, r.obj.id, key);
    toast(t(l('Comprado e posto: {n}', 'Bought and placed: {n}'), { n: t(d.name) }), 'good');
    UI.shop = false; draw5();
  } }, mini5(decoPx5(d, s.year)), h('span', null, h('b', null, t(d.name)), h('small', null, `${$(decoPrice31(s, d))} · ${t(how === 'me' ? l('do seu bolso', 'from your pocket') : l('caixa da empresa', 'company cash'))}`))))));
}

function reqSide5(s: GameState, p: DecoPlaceDef31, r: DecoRoom31, key: string, req: string): HTMLElement {
  const def = reqDef31(req)!;
  const cur = reqLevel31(s, key);
  const owned = drawer31(s).filter((o) => upgOfObj31(o)?.req === req);
  const buy = UPG31.filter((u) => u.req === req && inLine31(u, s.year) && u.lv > cur.lv);
  return h('aside', { class: 'deco5-side' },
    h('h4', null, `${t(def.name)} · ${t(r.name)}`),
    h('div', { class: 'deco5-cur' }, mini5(reqPx5(req, cur.lv, s.year, cur.upg), 60),
      h('span', null, h('b', null, cur.upg ? t(cur.upg.name) : t(l('Modelo de fábrica', 'Stock model'))), h('small', null, t(l('Nível {n}', 'Level {n}'), { n: cur.lv }), cur.upg?.fx ? ` · ${t(fxText5(cur.upg.fx.k, cur.upg.fx.v))}` : ''))),
    h('p', { class: 'deco5-hint' }, t(l('Item obrigatório: não sai do lugar; troque o modelo ou suba o nível.', 'Fixed item: it stays; change the model or level it up.'))),
    owned.length ? h('ul', { class: 'deco5-list' }, owned.map((o) => { const u = upgOfObj31(o)!; return h('li', null, h('button', { type: 'button', class: 'deco5-it', onclick: () => { const x = setReq31(s, key, o.id); if (!x.ok) toast(t(DECO_WHY31[x.why]), 'bad'); draw5(); } },
      mini5(reqPx5(req, u.lv, s.year, u)), h('span', null, h('b', null, t(u.name)), h('small', null, t(l('Instalar · nível {n}', 'Install · level {n}'), { n: u.lv }))))); })) : null,
    cur.lv > 0 ? h('button', { type: 'button', class: 'btn small', onclick: () => { setReq31(s, key, ''); draw5(); } }, t(l('Voltar ao modelo de fábrica', 'Back to stock model'))) : null,
    h('div', { class: 'deco5-dr-h' }, t(l('Subir de nível', 'Level up'))),
    buy.length ? h('ul', { class: 'deco5-list deco5-cat' }, buy.map((u) => h('li', null, h('button', { type: 'button', class: 'deco5-it', onclick: () => {
      if (SHOP5) { shop5(s, p, key, undefined, req); return; }
      const x = buyDeco31(s, `upg:${u.id}`, p.kind === 'home' ? 'me' : 'co');
      if (!x.ok) { toast(t(x.why), 'bad'); return; }
      setReq31(s, key, x.obj.id);
      toast(t(l('Instalado: {n}', 'Installed: {n}'), { n: t(u.name) }), 'good');
      draw5();
    } }, mini5(reqPx5(req, u.lv, s.year, u)), h('span', null, h('b', null, t(u.name)), h('small', null, `${t(l('nível {n}', 'level {n}'), { n: u.lv })} · ${$(decoPrice31(s, u))}${u.fx ? ` · ${t(fxText5(u.fx.k, u.fx.v))}` : ''}`)))))) : h('p', { class: 'deco5-hint' }, t(l('Nenhum modelo melhor à venda neste ano.', 'No better model on sale this year.'))));
}

// ---------------------------------------------------------------- efeito do lugar

const FX_L: Record<DecoFxK31, L> = {
  rest: l('descanso +{n}%', 'rest +{n}%'), prestige: l('prestígio +{n}%', 'prestige +{n}%'), crowd: l('público +{n}%', 'crowd +{n}%'),
  opinion: l('opinião +{n}%', 'opinion +{n}%'), cap: l('capacidade +{n}%', 'capacity +{n}%'), rec: l('gravação +{n}%', 'recording +{n}%'),
};
const pctTxt = (v: number) => (Math.round(v * 1000) / 10).toString().replace('.', ',');
function fxText5(k: DecoFxK31, v: number): L { return { pt: FX_L[k].pt.replace('{n}', pctTxt(v)), en: FX_L[k].en.replace('{n}', (Math.round(v * 1000) / 10).toString()) }; }

function fxLine5(s: GameState, p: DecoPlaceDef31): HTMLElement {
  const scope = p.kind === 'home' ? 'home' : p.key;
  const ks: DecoFxK31[] = p.kind === 'home' ? ['rest', 'opinion'] : p.kind === 'sede' ? ['prestige', 'opinion', 'cap', 'rec'] : ['crowd', 'rec', 'cap'];
  const on = ks.map((k) => [k, decoFx31(s, k, scope)] as const).filter(([, v]) => v > 0);
  return h('div', { class: 'deco5-fx' },
    on.length ? on.map(([k, v]) => h('span', { class: 'pill good', title: `${t(DECO_HOOK31[k])} · ${t(l('teto por cômodo {n}%', 'cap per room {n}%'), { n: pctTxt(DECO_CAP31[k]) })}` }, t(fxText5(k, v))))
      : h('span', { class: 'deco5-hint' }, t(l('Sem efeito ainda: algumas peças dão um bônus pequeno (descanso, prestígio, público, gravação).', 'No effect yet: some items give a small bonus (rest, prestige, crowd, recording).'))));
}

// ---------------------------------------------------------------- entrada: tecla e botão nas cenas

const SCENE_SEL = '.reg5-sede, .reg5-casa, .casa5-root, .sede5-root, .reg5-venue';
const placeOfScene5 = (): string => (document.querySelector('.reg5-casa, .casa5-root') ? 'home' : document.querySelector('[data-deco-place]')?.getAttribute('data-deco-place') ?? 'sede');

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (UI.open && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeArrumar5(); return; }
    const tg = e.target as HTMLElement | null;
    if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
    const c = chordOf5(e);
    if (!c || c !== key5('deco:arrumar')?.chord) return;
    const s = game();
    if (!arrumarOk5(s)) return;
    if (UI.open) { e.preventDefault(); e.stopImmediatePropagation(); closeArrumar5(); return; }
    if (!document.querySelector(SCENE_SEL)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openArrumar5(placeOfScene5());
  }, true);
  // botão "Arrumar" no canto das cenas (casa, sede, estabelecimento) quando a decoração está ligada
  const inject = () => {
    const s = game();
    if (!arrumarOk5(s)) return;
    for (const host of document.querySelectorAll<HTMLElement>('.reg5-sede .s5-where, .reg5-casa .r5-head, .casa5-root .r5-head, .sede5-root .r5-head, [data-deco-place] .s5-where')) {
      if (host.querySelector('.deco5-open')) continue;
      const k = chordLabel5(key5('deco:arrumar')?.chord ?? 'shift+o');
      host.append(h('button', { type: 'button', class: 'deco5-open', onclick: (e: Event) => { e.stopPropagation(); openArrumar5(host.closest('[data-deco-place]')?.getAttribute('data-deco-place') ?? (host.closest('.reg5-casa, .casa5-root') ? 'home' : 'sede')); } },
        t(l('Arrumar', 'Arrange')), ' ', h('kbd', { class: 'kb5' }, k)));
    }
  };
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => inject());
    const start = () => mo.observe(document.body, { childList: true, subtree: true });
    if (document.body) start(); else window.addEventListener('DOMContentLoaded', start);
  }
}

export const REQ_LIST5 = REQ31;
