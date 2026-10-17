// R31 · onda 5 (NAV, EXP-1) — A SEDE COMO CENTRO: o prédio em corte (hqpx27, o mesmo desenho da sede de hoje) com os
// objetos da onda 5 (objects5) desenhados em pixel art (exp5px) na época certa, cada um com estado parado / novidade
// ("!") / aceso (mouse em cima ou foco), rótulo pequeno com a tecla e clique = abrir o papel do objeto.
// `sedeLay5` é puro (testável sem DOM); `sedeScene5` desenha. Atrás de `exp5.nav` (só a casca shell5.ts chama).
// Salas com objetos da onda 5 ficam sem a mobília padrão (`bare`) para nada ficar sobreposto; estúdio, palco, lounge e
// arquivo mantêm o desenho de hoje e ganham "pontos" clicáveis (mesa de som, palco…). O que não cabe na sala fica na
// lista da sala (o selo da sala abre a lista) — nada fica inalcançável.

import { cityById, l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { careers } from '../../sim/sys/careers12';
import { h } from '../dom';
import { lookOf } from '../pixel/avatar';
import { PAD5, obj5Canvas, obj5Def, type Obj5 as Art5, type St5 } from '../pixel/exp5px';
import { hqModel25, type Sprite25 } from '../ps/hq25model';
import { buyDlg27 } from '../ps/hq25';
import { $ } from '../common';
import type { Unit27 } from '../../sim/sys/hqrooms27';
import { drawHqCutaway27, plan27, type Cell27, type Kind27, type Plan27 } from '../ps/hqpx27';
import { chordLabel5, key5 } from './keys5';
import { object5 } from './objects5';
import { worldTag5 } from './acoes5model';
import { store } from '../store';

type Mount5 = 'floor' | 'wall' | 'desk' | 'spot' | 'list';
/** Objeto da sede: id (objects5), arte (exp5px; null = ponto sobre o desenho da sala), salas preferidas, montagem. */
type Def5 = [id: string, art: Art5 | null, rooms: Kind27[], mount: Mount5];

/** Onde mora cada objeto da sede (ordem = prioridade dentro da sala). */
export const SEDE_OBJS5: Def5[] = [
  ['mesames', 'monthdesk', ['office'], 'floor'],
  ['arquivoaco', 'filing', ['office'], 'floor'],
  ['cofre', 'safe', ['office'], 'floor'],
  ['livrocaixa', 'ledger', ['office'], 'desk'],
  ['telefone', 'phone', ['office'], 'desk'],
  ['fichario', 'rolodex', ['office'], 'desk'],
  ['correspondencia', 'mail', ['office'], 'desk'],
  ['jornal', 'paper', ['office'], 'desk'],
  ['diario', 'diary', ['office'], 'desk'],
  ['portaretrato', 'photo', ['office'], 'desk'],
  ['agenda', 'calendar', ['office'], 'wall'],
  ['quadroplan', 'planning', ['office', 'meeting'], 'wall'],
  ['quadrometas', 'goals', ['meeting', 'office'], 'wall'],
  ['caderno', 'learnbook', ['office', 'anr'], 'wall'],
  ['radiotv', 'radiotv', ['office', 'lounge'], 'floor'],
  ['mural', 'cork', ['anr', 'lounge', 'office'], 'wall'],
  ['olheiro', 'scoutdesk', ['anr', 'office'], 'floor'],
  ['demos', 'demos', ['anr', 'office'], 'desk'],
  ['quadrobranco', 'whiteboard', ['meeting', 'office'], 'wall'],
  ['mesareuniao', 'meeting', ['meeting'], 'floor'],
  ['maquete', 'model', ['meeting', 'lobby'], 'floor'],
  ['porta', 'door', ['lobby'], 'floor'],
  ['trofeus', 'trophies', ['lobby', 'lounge'], 'floor'],
  ['mapaparede', 'worldmap', ['lobby'], 'wall'],
  ['chaveiro', 'keys', ['lobby'], 'wall'],
  ['secretaria', null, ['lobby'], 'list'],
  ['salagravacao', null, ['studio'], 'spot'],
  ['mesasom', null, ['studio'], 'spot'],
  ['piano', null, ['rehearsal', 'studio'], 'spot'],
  ['palco', null, ['stage', 'rehearsal'], 'spot'],
  ['lounge', null, ['lounge'], 'spot'],
  ['prateleiras', null, ['archive', 'anr'], 'spot'],
  ['contador', null, ['legal', 'office'], 'spot'],
  ['graficos', null, ['marketing', 'office'], 'spot'],
  ['revista', null, ['press', 'lounge', 'office'], 'list'],
  ['quadrofunc', null, ['office'], 'list'],
  ['chefe', null, ['office'], 'list'],
];

/** Nomes curtos das salas (selo da sala). */
export const ROOM_L5: Partial<Record<Kind27, L>> = {
  office: l('Escritório', 'Office'), anr: l('A&R', 'A&R'), lobby: l('Recepção', 'Reception'), studio: l('Estúdio', 'Studio'),
  stage: l('Palco', 'Stage'), lounge: l('Lounge', 'Lounge'), meeting: l('Reunião', 'Meeting room'), rehearsal: l('Ensaio', 'Rehearsal'),
  archive: l('Arquivo', 'Archive'), legal: l('Financeiro', 'Finance'), marketing: l('Pesquisa', 'Research'), press: l('Imprensa', 'Press'),
  studioB: l('Estúdio B', 'Studio B'), garden: l('Jardim', 'Garden'), neural: l('Sala imersiva', 'Immersive room'),
};

export interface Item5 { id: string; art: Art5 | null; room: Kind27; mount: Mount5; x: number; y: number; w: number; h: number }
export interface Room5 { kind: Kind27; cell: Cell27; objs: string[] }
export interface SedeLay5 { plan: Plan27; items: Item5[]; rooms: Room5[]; bare: Kind27[] }

const BARE5: Kind27[] = ['office', 'anr', 'lobby', 'meeting'];
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, m = 2): boolean =>
  a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

/** Distribui os objetos pelas salas da planta (puro). `has` filtra objetos que existem agora (época, carreiras). */
export function sedeLay5(plan: Plan27, has: (id: string) => boolean = () => true): SedeLay5 {
  const open = plan.cells.filter((c) => !c.lock && !plan.flock[c.floor]);
  const cellOf = (k: Kind27) => open.find((c) => c.kind === k);
  const items: Item5[] = [];
  const rooms = new Map<Kind27, Room5>();
  const room = (c: Cell27) => rooms.get(c.kind) ?? (rooms.set(c.kind, { kind: c.kind, cell: c, objs: [] }), rooms.get(c.kind)!);
  const cursor = new Map<Kind27, number>();
  const hosts = new Map<Kind27, { x: number; y: number; w: number; used: number }[]>();
  const office = cellOf('office') ?? open[0];
  const home = (prefs: Kind27[]) => prefs.map(cellOf).find((x) => !!x) ?? office;
  const live = SEDE_OBJS5.filter(([id, , prefs]) => object5(id) && has(id) && home(prefs));
  for (const [id, , prefs] of live) room(home(prefs)!).objs.push(id);
  // chão e mesa primeiro, parede depois (a parede procura o espaço livre acima do que está no chão)
  const rank: Record<Mount5, number> = { floor: 0, desk: 1, spot: 2, list: 3, wall: 4 };
  for (const [id, art, prefs, mount] of [...live].sort((a, b) => rank[a[3]] - rank[b[3]])) {
    const c = home(prefs)!;
    const fy = c.y + c.h - 3;
    if (mount === 'list') continue;
    if (mount === 'spot' && BARE5.includes(c.kind)) continue; // sala sem mobília padrão: o ponto não tem o que mostrar (fica na lista)
    if (mount === 'spot') {
      // pontos: partes da sala desenhada (estúdio: gravação à esquerda, técnica à direita)
      const k = c.kind;
      const r = k === 'studio' ? (id === 'salagravacao' ? [0.02, 0.4] : id === 'mesasom' ? [0.42, 0.98] : null)
        : k === 'rehearsal' && id === 'piano' ? [0.2, 0.5] : [0.08, 0.92];
      if (!r) continue;
      const taken = items.filter((x) => x.room === k && x.mount === 'spot').length;
      if (k !== 'studio' && taken) continue;
      items.push({ id, art: null, room: k, mount, x: c.x + Math.round(c.w * r[0]), y: c.y + 14, w: Math.round(c.w * (r[1] - r[0])), h: c.h - 16 });
      continue;
    }
    const d = obj5Def(art!);
    if (mount === 'floor') {
      const x = cursor.get(c.kind) ?? c.x + (c.kind === 'lobby' ? 2 : 5);
      if (x + d.w > c.x + c.w - 4) continue;
      const it: Item5 = { id, art, room: c.kind, mount, x, y: fy - d.h, w: d.w, h: d.h };
      items.push(it);
      cursor.set(c.kind, x + d.w + 5);
      if (art === 'monthdesk' || art === 'scoutdesk' || art === 'meeting') {
        const ty = art === 'monthdesk' ? 13 : art === 'scoutdesk' ? 12 : 11;
        const used = art === 'monthdesk' ? 29 : art === 'scoutdesk' ? 30 : 4;
        hosts.set(c.kind, [...(hosts.get(c.kind) ?? []), { x, y: it.y + (d.h - ty), w: d.w, used }]);
      }
      continue;
    }
    if (mount === 'desk') {
      const hs = hosts.get(c.kind) ?? [];
      const ho = hs.find((q) => q.used + d.w <= q.w);
      if (!ho) continue;
      items.push({ id, art, room: c.kind, mount, x: ho.x + ho.used, y: ho.y - d.h, w: d.w, h: d.h });
      ho.used += d.w + 1;
      continue;
    }
    // parede: primeiro lugar livre da esquerda para a direita, sem encostar no que está no chão
    const top = c.y + 6;
    let placed = false;
    for (let x = c.x + 5; x + d.w <= c.x + c.w - 5 && !placed; x += 2) {
      for (const y of [top, top + 4]) {
        const r = { x, y, w: d.w, h: d.h };
        if (y + d.h > fy - 2) continue;
        if (items.some((o) => o.room === c.kind && o.mount !== 'spot' && overlap(o, r))) continue;
        items.push({ id, art, room: c.kind, mount, ...r });
        placed = true;
        break;
      }
    }
  }
  return { plan, items, rooms: [...rooms.values()], bare: BARE5 };
}

/** Objetos que existem agora: o chaveiro só com 2+ carreiras ativas. */
export const sedeHas5 = (s: GameState) => (id: string): boolean => id !== 'chaveiro' || careers(s).active.length >= 2;

// ---------------------------------------------------------------- desenho

export interface SedeIn5 {
  s: GameState;
  bangs: Record<string, number>;
  open: (id: string) => void;
  /** objeto aceso por um "ir até lá" (pisca) */
  flash?: string;
}

const pct = (v: number, of: number): string => `${((v / of) * 100).toFixed(3)}%`;
const at = (pl: Plan27, x: number, y: number, w: number, hh: number): string =>
  `left:${pct(x, pl.W)};top:${pct(y, pl.H)};width:${pct(w, pl.W)};height:${pct(hh, pl.H)}`;

const keyOf5 = (id: string): string => { const b = key5(`obj:${id}`); return b ? chordLabel5(b.chord) : ''; };
/** Rótulo da interface no idioma atual sem a troca de nomes reais de `t()` (ela troca palavras como "Telefone"). */
export const tl5 = (x: L): string => x[getLang()] ?? x.pt;
/** Texto da interface sem `disp31` (o interruptor de nomes reais troca palavras como "Telefone"). */
export const txt5 = (x: string): Text => document.createTextNode(x);
/** Texto curto sem `disp31` (números e teclas). */
export const raw5 = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, txt: string): HTMLElementTagNameMap[K] => { const e = h(tag, { class: cls }); e.textContent = txt; return e; };
/** Tecla desenhada. Texto direto (sem `disp31`: o interruptor de nomes reais troca textos curtos como "5"). */
export const kbd5 = (k: string): HTMLElement | null => { if (!k) return null; const e = h('kbd', { class: 'kb5' }); e.textContent = k; return e; };

/** Botão de um objeto: arte parada/novidade e acesa por cima (CSS troca no hover/foco), rótulo pequeno com a tecla. */
function objBtn(pl: Plan27, it: Item5, n: number, year: number, k: number, on: (id: string) => void, flash: boolean): HTMLElement {
  const o = object5(it.id)!;
  const name = tl5(o.label);
  const key = keyOf5(it.id);
  const say = `${name}${key ? ` (${key})` : ''}${n ? ` — ${n} ${t(l('novidade(s)', 'new item(s)'))}` : ''}`;
  const kids: (HTMLElement | null)[] = [];
  if (it.art) {
    const st: St5 = n ? 'new' : 'idle';
    const a = obj5Canvas(it.art, year, st, k); a.className = 'px s5-art';
    const b = obj5Canvas(it.art, year, 'lit', k); b.className = 'px s5-lit';
    kids.push(a, b);
  } else if (n) kids.push(h('i', { class: 's5-bang', 'aria-hidden': 'true' }, '!'));
  const tag = store.game ? worldTag5(store.game, it.id) : undefined; // ACOES5: o número mora no objeto (caixa no livro-caixa, fama no jornal…)
  kids.push(h('span', { class: 's5-lab', 'aria-hidden': 'true' }, txt5(name), kbd5(key), tag ? h('small', { class: 'r5-tag' }, tag) : null));
  const box = it.art ? at(pl, it.x - PAD5, it.y - PAD5, it.w + 2 * PAD5, it.h + 2 * PAD5) : at(pl, it.x, it.y, it.w, it.h);
  return h('button', { type: 'button', class: `s5-obj ${it.art ? 'art' : 'spot'} m-${it.mount}${n ? ' new' : ''}${flash ? ' flash' : ''}`, 'data-obj': it.id, style: box, 'aria-label': say, title: say, onclick: () => on(it.id) }, ...kids);
}

/** Selo da sala: nome, quantos objetos e "!"; abre a lista da sala (tudo da sala, inclusive o que não coube no desenho). */
function roomChip(pl: Plan27, r: Room5, bangs: Record<string, number>, on: (id: string) => void, flash?: string): HTMLElement {
  const n = r.objs.reduce((a, id) => a + (bangs[id] ?? 0), 0);
  const name = tl5(ROOM_L5[r.kind] ?? l('Sala', 'Room'));
  const list = h('div', { class: 's5-pop', role: 'menu', hidden: true },
    h('b', null, txt5(`${name} · ${t(l('{n} objetos', '{n} objects'), { n: r.objs.length })}`)),
    ...r.objs.map((id) => h('button', { type: 'button', role: 'menuitem', class: 's5-pop-i', onclick: () => on(id) },
      h('span', null, txt5(tl5(object5(id)!.label))), bangs[id] ? raw5('i', 'bg5', String(bangs[id])) : null, kbd5(keyOf5(id)))),
    h('small', null, t(l('Clique num objeto ou use a tecla.', 'Click an object or use its key.'))));
  const lit = !!flash && r.objs.includes(flash);
  const btn = h('button', { type: 'button', class: `s5-room${lit ? ' flash' : ''}`, 'aria-haspopup': 'menu', 'data-room': r.kind,
    onclick: (e: Event) => { e.stopPropagation(); const was = !list.hidden; document.querySelectorAll<HTMLElement>('.s5-pop').forEach((x) => { x.hidden = true; }); list.hidden = was; if (!was) { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); list.classList.toggle('up', r.top > (window.innerHeight || 800) * 0.4); list.classList.toggle('left', r.left > (window.innerWidth || 1280) * 0.6); (list.querySelector('button') as HTMLElement | null)?.focus(); } } },
    name, n ? raw5('i', 'bg5', String(n)) : null);
  return h('div', { class: 's5-roomw', style: `left:${pct(r.cell.x + 3, pl.W)};top:${pct(r.cell.y + 3, pl.H)}` }, btn, list);
}

/** Salas e andares à venda ou em obra (mesmo diálogo de compra da sede de hoje). */
function lockChips(s: GameState, pl: Plan27, units: Unit27[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const chip = (u: Unit27, r: { x: number; y: number; w: number; h: number }) => {
    const work = u.status === 'building';
    const txt = work ? t(l('Em obra · falta {m} mês(es)', 'Under construction · {m} month(s) left'), { m: u.eta }) : `${t(u.kind === 'floor' ? l('Comprar andar', 'Buy floor') : l('Comprar sala', 'Buy room'))} — ${$(u.cost)}`;
    return h('div', { class: 's5-lockw', style: at(pl, r.x, r.y, r.w, r.h) },
      h(work ? 'span' : 'button', { type: work ? undefined : 'button', class: `s5-lock${work ? ' work' : ''}`, 'data-unit': u.id, title: t(u.effect), onclick: work ? undefined : () => buyDlg27(s, u.id) },
        h('b', null, t(u.name)), h('span', null, txt)));
  };
  for (const [f] of Object.entries(pl.flock)) {
    const cs = pl.cells.filter((c) => c.floor === Number(f));
    const u = units.find((x) => x.kind === 'floor' && x.floor === Number(f) && x.status !== 'open');
    if (u && cs.length) out.push(chip(u, { x: cs[0].x, y: cs[0].y, w: cs[cs.length - 1].x + cs[cs.length - 1].w - cs[0].x, h: cs[0].h }));
  }
  for (const c of pl.cells) {
    if (!c.unit || !c.lock || pl.flock[c.floor]) continue;
    const u = byId.get(c.unit);
    if (u) out.push(chip(u, c));
  }
  return out;
}

/** Alt (mostrar todos os nomes): empurra rótulos que se sobrepõem para baixo, sem cobrir os selos das salas. */
export function declutter5(root: ParentNode = document): void {
  const hit = (a: DOMRect, b: DOMRect) => a.left < b.right + 2 && b.left < a.right + 2 && a.top < b.bottom + 1 && b.top < a.bottom + 1;
  const labs = [...root.querySelectorAll<HTMLElement>('.s5-lab')];
  for (const x of labs) x.style.transform = '';
  const placed: DOMRect[] = [...root.querySelectorAll<HTMLElement>('.s5-room')].map((x) => x.getBoundingClientRect());
  const rows = labs.map((x) => ({ x, r: x.getBoundingClientRect() })).filter((o) => o.r.width > 0).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
  for (const { x, r } of rows) {
    let dy = 0;
    let rr = r;
    // o lugar livre mais perto: acima ou abaixo, alternando
    for (let i = 1; i < 24 && placed.some((q) => hit(q, rr)); i++) { dy = (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (r.height + 2); rr = new DOMRect(r.x, r.y + dy, r.width, r.height); }
    if (dy) x.style.transform = `translateX(-50%) translateY(${dy}px)`;
    placed.push(rr);
  }
}

/** A cena da sede (sem o topo nem a barra, que são da casca). */
export function sedeScene5(o: SedeIn5): HTMLElement {
  const { s } = o;
  const m = hqModel25(s);
  const cv = h('canvas', { class: 's5-cv px', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const layer = h('div', { class: 's5-layer' });
  const stage = h('div', { class: 's5-stage', role: 'group', 'aria-label': t(l('Sua sede em corte: cada objeto abre um papel.', 'Your HQ in cutaway: each object opens a paper.')) }, cv, layer);
  const wrap = h('div', { class: 's5-scroll' }, stage);
  const look = (x: Sprite25) => lookOf((x.personId ? s.persons[x.personId] : undefined) ?? { id: x.id });
  const role = (x: Sprite25) => (x.personId ? s.persons[x.personId]?.role : null) ?? null;
  const need = plan27({ hq: m.hq, year: m.year }).W;
  const has = sedeHas5(s);
  let last = '';
  const paint = (cw: number, ch: number): void => {
    // escala inteira: cabe na largura e na altura (a sede inteira à vista, sem rolar)
    const H0 = plan27({ hq: m.hq, year: m.year }).H;
    // escala em quartos (pixels quase iguais) para a sede encher a tela como no mock; arte em resolução inteira acima
    const k = Math.max(1, Math.min(4, Math.floor(Math.min(cw / need, ch / H0) * 4) / 4));
    const minW = Math.max(need, Math.floor(cw / k));
    const key = `${k}|${minW}`;
    if (key === last) return;
    last = key;
    const d = drawHqCutaway27(cv, m, { minW, look, role, bare: BARE5 });
    const lay = sedeLay5(d.plan, has);
    stage.style.width = `${Math.round(d.plan.W * k)}px`;
    stage.style.height = `${Math.round(d.plan.H * k)}px`;
    layer.replaceChildren(
      ...lay.items.map((it) => objBtn(d.plan, it, o.bangs[it.id] ?? 0, s.year, Math.ceil(k), o.open, o.flash === it.id)),
      ...lay.rooms.map((r) => roomChip(d.plan, r, o.bangs, o.open, lay.items.some((x) => x.id === o.flash) ? undefined : o.flash)),
      ...lockChips(s, d.plan, m.units));
  };
  const size = () => ({ w: wrap.clientWidth || Math.max(640, (window.innerWidth || 1280) - 40), h: wrap.clientHeight || Math.max(360, (window.innerHeight || 800) - 170) });
  paint(size().w, size().h);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { if (!wrap.isConnected) { ro.disconnect(); return; } const z = size(); paint(z.w, z.h); });
    ro.observe(wrap);
  }
  wrap.addEventListener('click', () => document.querySelectorAll<HTMLElement>('.s5-pop').forEach((x) => { x.hidden = true; }));
  const city = cityById[m.city];
  return h('section', { class: 's5' },
    h('div', { class: 's5-where' }, h('b', null, t(l('Sede', 'HQ'))), ` · ${city ? t(city.name) : ''} · ${m.year}`),
    wrap);
}

