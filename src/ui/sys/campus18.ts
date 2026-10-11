// Rodada 18 (campus18) + Rodada 19 (world19): página "Nosso mundo" — o BAIRRO da sede em pixel art isométrica.
// R19: tudo acontece SOBRE o mapa: clique/toque num prédio abre um popup ancorado nele (números com "por quê",
// ampliar, reformar, mudar de lote, renomear, vender, ir para a gestão); num lote vazio, "Construir aqui" com
// custo, prazo, requisitos e vizinhança; vizinhos, marcos da cidade e eventos do bairro também são clicáveis.
// Esc ou clique fora fecha; tudo é botão (teclado). Filtro (meus/vizinhos/marcos), legenda, zoom e arraste
// (pinça no celular), ciclo dia/noite e linha do tempo com retratos anuais. Anima só enquanto visível.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import {
  CONTRACTORS18, KIND18, LOTS18, STATE18, ambient18, buildings18, campus18, decode18, layout18, styleName18, styleOf18, type Bld18,
} from '../../sim/sys/campus18';
import { act19, bldPop19, lotPop19, syn19, upkeep19, type Pop19, type PopAct19 } from '../../sim/sys/world19';
import { EV19, STAGE19, actEv19, buyNb19, evPop19, hoodStats19, live19ev, lmNow19, lmPop19, nb19, nbPop19 } from '../../sim/sys/hood19';
import { $, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { MH, MW, buildScene18, drawFrame18, env18, iso, nightOf, type Scene18 } from '../pixel/campus18px';
import { registerArea } from '../registry';
import { store } from '../store';
import { go18 } from './inbox18';
import { chips, ic, stat } from '../vis';
import './campus18.css';

const reduced = () => document.documentElement.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const latOf = (s: GameState) => cityById[s.config.homeCity]?.lat ?? 40;
const tx = (x: L | string | undefined) => (x === undefined ? '' : typeof x === 'string' ? x : t(x));

/** UI efêmera (por sessão; não vai para o save). */
const ui: { pop?: string; year?: number; mode: 'cycle' | 'day' | 'night'; q: number; moving?: string; f: { mine: boolean; nb: boolean; lm: boolean }; legend?: boolean; z: number; px: number; py: number } =
  { mode: 'cycle', q: 1, f: { mine: true, nb: true, lm: true }, z: 1, px: 0, py: 0 };

interface View { s: GameState; bs: Bld18[]; scene: Scene18; year: number; live: boolean }
function makeView(s: GameState, year?: number): View {
  const snap = year !== undefined ? campus18(s).snaps.find((x) => x.y === year) : undefined;
  const lms = lmNow19(s, snap ? snap.y : s.year);
  if (snap) {
    const bs = decode18(snap.b);
    const lots = new Map(bs.filter((b) => b.lot !== undefined).map((b) => [b.id, b.lot!] as [string, number]));
    return { s, bs, year: snap.y, live: false, scene: buildScene18(bs, lots, env18(snap.y, 6, latOf(s), s.config.homeCity), [], hashSeed(s), brand18(s), [], lms) };
  }
  const bs = buildings18(s);
  const amb = [...ambient18(s), ...live19ev(s).map((e) => ({ k: e.k as string, at: e.at, why: EV19[e.k].n }))];
  return { s, bs, year: s.year, live: true, scene: buildScene18(bs, layout18(s, bs), env18(s.year, s.month, latOf(s), s.config.homeCity), amb, hashSeed(s), brand18(s), nb19(s), lms) };
}
/** Iniciais do selo (placa da sede e letreiro). */
export const brand18 = (s: GameState): string => (s.config.companyName.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'REC');
const hashSeed = (s: GameState) => { let x = 7; for (const c of s.config.seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x % 9973; };

/** Canvas animado (para enquanto invisível; para sozinho quando sai do DOM). */
function mapCanvas(v: View): HTMLCanvasElement {
  const cv = h('canvas', { class: 'c18-cv px', width: MW, height: MH, role: 'img', 'aria-label': t(l('Mapa do bairro com os seus prédios', 'Map of the neighbourhood with your buildings')) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  const nightFor = (tm: number) => (ui.mode === 'day' ? 0 : ui.mode === 'night' ? 1 : reduced() ? 0 : nightOf(tm));
  const draw = (tm: number) => drawFrame18(ctx, v.scene, tm, nightFor(tm));
  draw(0);
  if (reduced() || typeof requestAnimationFrame !== 'function') return cv;
  let visible = false, running = false, start = 0, last = 0;
  const loop = (now: number) => {
    if (!cv.isConnected && start) { running = false; io?.disconnect(); return; }
    if (!visible || document.hidden) { running = false; return; }
    if (!start) start = now;
    if (now - last >= 100) { last = now; draw((now - start) / 1000); }
    requestAnimationFrame(loop);
  };
  const kick = () => { if (!running && visible) { running = true; requestAnimationFrame(loop); } };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); kick(); }) : null;
  if (io) io.observe(cv); else { visible = true; kick(); }
  return cv;
}

// ---------------------------------------------------------------- popup

/** Modelo do popup para um alvo (prédio, lote, vizinho, marco ou evento). */
function popFor(v: View, id: string): Pop19 | null {
  const s = v.s;
  if (!v.live) {
    if (id.startsWith('lm:')) return lmPop19(s, id.slice(3), v.year);
    const b = v.bs.find((x) => x.id === id);
    return b ? { kind: 'bld', id, title: b.name, icon: KIND18[b.kind].icon, tags: [KIND18[b.kind].name, STATE18[b.st], styleName18(styleOf18(b.sy))], rows: [{ k: l('Estágio', 'Stage'), v: String(b.lvl) }], notes: [{ t: { pt: `Retrato de ${v.year}.`, en: `Snapshot from ${v.year}.` } }], acts: [], opts: [] } : null;
  }
  if (id.startsWith('lot:')) return lotPop19(s, +id.slice(4), ui.q, ui.moving);
  if (id.startsWith('nb:')) return nbPop19(s, +id.slice(3));
  if (id.startsWith('lm:')) return lmPop19(s, id.slice(3));
  if (id.startsWith('ev:')) return evPop19(s, id.slice(3));
  return bldPop19(s, id, ui.q);
}

function contractorPick(rerun: () => void): HTMLElement {
  return h('div', { class: 'w19-seg', role: 'radiogroup', 'aria-label': t(l('Empreiteiro', 'Contractor')) },
    CONTRACTORS18.map((c, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(ui.q === i), class: ui.q === i ? 'on' : '', title: t(c.desc), onclick: () => { ui.q = i; rerun(); } }, t(c.name))));
}

function runAct(v: View, id: string, a: PopAct19, close: () => void): void {
  const s = v.s;
  if (a.dis) { toast(t(a.dis), 'bad'); return; }
  if (a.go) { close(); go18(a.go); return; }
  if (a.confirm && !confirm(t(a.confirm))) return;
  let e: L | null = null, ok: L = l('Feito.', 'Done.');
  if (a.ask === 'lot') { ui.moving = id; ui.pop = undefined; toast(t(l('Escolha um lote livre no mapa (marcado com +).', 'Pick a free lot on the map (marked with +).')), 'info'); rerender(); return; }
  if (a.ask === 'name') { const n = prompt(t(l('Novo nome do prédio (vazio = nome original):', 'New building name (empty = original):')), v.bs.find((b) => b.id === id)?.name ?? ''); if (n === null) return; e = act19(s, id, 'rename', { name: n }); ok = l('Nome trocado.', 'Renamed.'); }
  else if (a.id.startsWith('ev:')) { e = actEv19(s, id.slice(3), a.id.slice(3)); ok = l('Decidido.', 'Decided.'); ui.pop = undefined; }
  else if (a.id === 'buy') { e = buyNb19(s, +id.slice(3)); ok = l('Imóvel comprado: o lote é seu.', 'Property bought: the lot is yours.'); if (!e) ui.pop = `lot:${id.slice(3)}`; }
  else {
    e = act19(s, id, a.id, { q: ui.q, moving: ui.moving });
    ok = a.id === 'moveHere' ? l('Mudança contratada.', 'Move contracted.') : a.id === 'sell' ? l('Vendido.', 'Sold.') : a.id === 'up' ? l('Ampliação contratada.', 'Expansion contracted.') : a.id === 'reno' ? l('Reforma contratada.', 'Renovation contracted.') : a.id.startsWith('p:') || a.id.startsWith('v:') ? l('Obra contratada: a cerca já subiu no lote.', 'Works contracted: the fence is up on the lot.') : ok;
    if (!e && a.id === 'moveHere') { ui.pop = ui.moving; ui.moving = undefined; }
    if (!e && (a.id.startsWith('p:') || a.id.startsWith('v:'))) ui.pop = undefined;
    if (!e && a.id === 'sell') ui.pop = undefined;
  }
  toast(t(e ?? ok), e ? 'bad' : 'good');
  rerender();
}

function costTxt(c?: number): string { return c === undefined ? '' : c < 0 ? `+${$(-c)}` : $(c); }

/** Corpo do popup (sem posição). */
function popBody(v: View, p: Pop19, close: () => void, rerun: () => void): HTMLElement {
  const s = v.s;
  const anyQ = p.opts.some((o) => o.q) || p.acts.some((a) => a.ask === 'q');
  return h('div', { class: 'w19-pop-in' },
    h('header', null, h('b', null, ic(p.icon), ' ', p.title), h('button', { type: 'button', class: 'icon w19-x', 'aria-label': t(l('Fechar', 'Close')), onclick: close }, '✕')),
    h('div', { class: 'row wrap w19-tags' }, p.tags.map((x) => pill(tx(x)))),
    p.prog !== undefined ? h('div', { class: 'c18-bar', role: 'progressbar', 'aria-valuenow': Math.round(p.prog * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${Math.round(p.prog * 100)}%` })) : null,
    p.rows.length ? h('table', { class: 'c18-kpi small' }, p.rows.map((r) => h('tr', { class: r.tone ?? '' }, h('td', null, t(r.k)), h('td', null, r.why ? why18(s, r.why[0], r.why[1], r.v) : r.v)))) : null,
    p.notes.length ? h('ul', { class: 'w19-notes small' }, p.notes.map((n) => h('li', { class: n.tone ?? '' }, tx(n.t)))) : null,
    anyQ ? contractorPick(rerun) : null,
    p.opts.length ? h('div', { class: 'w19-opts' }, h('b', { class: 'small' }, t(l('Construir aqui', 'Build here'))), p.opts.map((o) => h('div', { class: `w19-opt ${o.dis ? 'dis' : ''}` },
      h('div', { class: 'row' }, h('b', null, ic(o.icon), ' ', t(o.name)), h('span', { class: 'w19-cost' }, `${$(o.cost)} · ${o.months} ${t(l('m', 'mo'))}`)),
      h('small', { class: 'muted' }, t(o.effect)),
      o.syn.length ? h('small', { class: 'good' }, o.syn.map((x) => tx(x)).join(' · ')) : null,
      o.dis ? h('small', { class: 'bad' }, t(o.dis)) : null,
      h('button', { type: 'button', class: 'btn small primary', disabled: !!o.dis, 'aria-disabled': o.dis ? 'true' : undefined, onclick: () => runAct(v, p.id, { id: o.id, label: o.name, cost: o.cost }, close) }, ic('building'), ' ', t(l('Construir', 'Build')))))) : null,
    p.acts.length ? h('div', { class: 'w19-acts' }, p.acts.map((a) => h('button', { type: 'button', class: `btn small ${a.tone === 'primary' ? 'primary' : a.tone === 'danger' ? 'danger ghost' : 'ghost'}`, disabled: !!a.dis, title: a.dis ? t(a.dis) : undefined,
      onclick: () => runAct(v, p.id, a, close) }, t(a.label), a.cost !== undefined ? h('small', null, ` ${costTxt(a.cost)}`) : null, a.go ? ' ↗' : null))) : null,
    p.acts.some((a) => a.dis) ? h('ul', { class: 'w19-notes small muted' }, p.acts.filter((a) => a.dis).map((a) => h('li', null, `${t(a.label)}: ${t(a.dis!)}`))) : null);
}

// ---------------------------------------------------------------- mapa com pontos clicáveis

function mapFrame(v: View): HTMLElement {
  const s = v.s;
  const frame = h('div', { class: 'w19-frame' });
  const vp = h('div', { class: 'w19-vp' });
  const zoom = h('div', { class: 'w19-zoom' });
  const layer = h('div', { class: 'w19-hot' });
  const tip = h('div', { class: 'c18-tip', hidden: true, role: 'tooltip' });
  const pop = h('div', { class: 'w19-pop', role: 'dialog', 'aria-modal': 'false', hidden: true });
  const pct = (x: number, w: number) => `${((x / w) * 100).toFixed(2)}%`;
  let lastHs: HTMLElement | null = null;
  const close = () => { ui.pop = undefined; v.scene.sel = undefined; pop.hidden = true; pop.replaceChildren(); lastHs?.focus(); };
  const open = (id: string, hs: HTMLElement | null) => {
    const p = popFor(v, id);
    if (!p) { close(); return; }
    ui.pop = id; lastHs = hs; v.scene.sel = id; tip.hidden = true;
    const rerun = () => open(id, hs);
    pop.replaceChildren(popBody(v, p, close, rerun));
    pop.setAttribute('aria-label', p.title);
    pop.hidden = false;
    // posição: perto do ponto clicado, dentro do quadro (no celular vira folha inferior via CSS)
    const fr = frame.getBoundingClientRect(), r = hs?.getBoundingClientRect() ?? fr;
    const pw = Math.min(340, fr.width - 16);
    let left = r.left - fr.left + r.width / 2 - pw / 2;
    left = Math.max(8, Math.min(fr.width - pw - 8, left));
    pop.style.width = `${pw}px`; pop.style.left = `${left}px`;
    pop.style.maxHeight = `${Math.max(200, fr.height - 16)}px`;
    const ph = pop.offsetHeight, below = r.bottom - fr.top + 6, above = r.top - fr.top - 6;
    const top = below + ph <= fr.height - 8 ? below : above - ph >= 8 ? above - ph : Math.max(8, Math.min(fr.height - ph - 8, below));
    pop.style.top = `${top}px`; pop.style.bottom = '';
    (pop.querySelector('.w19-pop-in button:not(.w19-x):not([disabled]), .w19-x') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  const hot = (id: string, cls: string, box: [number, number, number, number], label: string, txt = '') => {
    const [x0, y0, x1, y1] = box;
    const b = h('button', { type: 'button', class: `w19-hs ${cls}`, 'data-id': id, 'aria-label': label, 'aria-haspopup': 'dialog',
      style: `left:${pct(x0, MW)};top:${pct(y0, MH)};width:${pct(Math.max(6, x1 - x0), MW)};height:${pct(Math.max(6, y1 - y0), MH)}`,
      onclick: (e: Event) => { e.stopPropagation(); if (moved) return; open(id, e.currentTarget as HTMLElement); },
      onmouseenter: (e: MouseEvent) => { const fr = frame.getBoundingClientRect(); tip.textContent = label; tip.hidden = false; tip.style.left = `${e.clientX - fr.left + 12}px`; tip.style.top = `${e.clientY - fr.top + 10}px`; },
      onmouseleave: () => { tip.hidden = true; } }, txt);
    layer.appendChild(b);
    return b;
  };
  const sc = v.scene;
  // prédios (seus e vizinhos), em ordem de profundidade
  for (const sp of sc.sprites) {
    if (sp.nb ? !ui.f.nb : !ui.f.mine) continue;
    const b = v.bs.find((x) => x.id === sp.id);
    const nb = sp.nb ? nb19(s).find((x) => `nb:${x.lot}` === sp.id) : undefined;
    const label = b ? `${b.name} · ${t(KIND18[b.kind].name)} · ${t(STATE18[b.st])} · ${t(l('estágio', 'stage'))} ${b.lvl}` : nb ? `${nb.name} · ${t(l('vizinho', 'neighbour'))}${nb.sale ? ` · ${t(l('à venda', 'for sale'))}` : ''}` : sp.id;
    hot(sp.id, sp.nb ? 'nb' : 'mine', sp.box, label);
  }
  // marcos da cidade
  if (ui.f.lm) for (const m of sc.marks) { const lm = lmNow19(s, v.year).find((x) => x.id === m.id); if (lm) hot(`lm:${m.id}`, 'lm', m.box, `${t(lm.n)} · ${lm.from > 0 ? lm.from : ''}`); }
  // lotes livres: "+" (ou destino da mudança)
  if (v.live && ui.f.mine) {
    const used = new Set(layout18(s, v.bs).values()), nbl = new Set(nb19(s).map((x) => x.lot)), busy = new Set(campus18(s).proj.map((p) => p.lot));
    LOTS18.forEach((L0, i) => {
      if (used.has(i) || nbl.has(i) || busy.has(i)) return;
      const [cx, cy] = iso(L0.gx + L0.w / 2, L0.gy + L0.d / 2);
      hot(`lot:${i}`, `lot ${ui.moving ? 'mv' : ''}`, [cx - 6, cy - 6, cx + 6, cy + 6], `${t(L0.name)} · ${t(ui.moving ? l('mudar para cá', 'move here') : l('lote vazio: construir aqui', 'empty lot: build here'))}`, '+');
    });
    // eventos do bairro
    for (const e of live19ev(s)) { const sp = sc.sprites.find((x) => x.id === e.at); if (sp) hot(`ev:${e.id}`, 'ev', [sp.door[0] - 6, sp.door[1] - 2, sp.door[0] + 6, sp.door[1] + 10], `${t(EV19[e.k].n)} — ${t(l('decidir', 'decide'))}`, '!'); }
  }
  // zoom e arraste (pinça no celular)
  const apply = () => { zoom.style.transform = `translate(${ui.px}px, ${ui.py}px) scale(${ui.z})`; };
  const clampPan = () => { const w = vp.clientWidth, hh = vp.clientHeight; ui.px = Math.min(0, Math.max(w - w * ui.z, ui.px)); ui.py = Math.min(0, Math.max(hh - hh * ui.z, ui.py)); };
  const setZ = (z: number, cx = vp.clientWidth / 2, cy = vp.clientHeight / 2) => { const nz = Math.max(1, Math.min(3, z)); ui.px = cx - ((cx - ui.px) * nz) / ui.z; ui.py = cy - ((cy - ui.py) * nz) / ui.z; ui.z = nz; clampPan(); apply(); };
  const pts = new Map<number, [number, number]>();
  let moved = false, d0 = 0, z0 = 1, start: [number, number, number, number] = [0, 0, 0, 0];
  vp.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false; start = [e.clientX, e.clientY, ui.px, ui.py]; if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = ui.z; } });
  vp.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const r = vp.getBoundingClientRect(); setZ(z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(1, d0), (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); moved = true; return; }
    if (ui.z > 1 && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) { moved = true; ui.px = start[2] + e.clientX - start[0]; ui.py = start[3] + e.clientY - start[1]; clampPan(); apply(); }
  });
  const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (!pts.size) setTimeout(() => { moved = false; }, 0); };
  vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
  vp.addEventListener('wheel', (e) => { if (!e.ctrlKey && ui.z === 1 && e.deltaY > 0) return; e.preventDefault(); const r = vp.getBoundingClientRect(); setZ(ui.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  zoom.append(mapCanvas(v), layer);
  vp.append(zoom);
  requestAnimationFrame?.(() => { clampPan(); apply(); });
  // barra sobre o mapa
  const modes: [typeof ui.mode, L][] = [['cycle', l('Dia e noite', 'Day & night')], ['day', l('Dia', 'Day')], ['night', l('Noite', 'Night')]];
  const tog = (k: keyof typeof ui.f, n: L) => h('button', { type: 'button', class: `btn small ${ui.f[k] ? '' : 'ghost'}`, 'aria-pressed': String(ui.f[k]), onclick: () => { ui.f[k] = !ui.f[k]; rerender(); } }, t(n));
  const bar = h('div', { class: 'w19-bar' },
    h('div', { class: 'w19-grp', role: 'group', 'aria-label': t(l('Filtro', 'Filter')) }, tog('mine', l('Meus', 'Mine')), tog('nb', l('Vizinhos', 'Neighbours')), tog('lm', l('Marcos', 'Landmarks'))),
    h('div', { class: 'w19-grp', role: 'group', 'aria-label': t(l('Luz', 'Light')) }, modes.map(([m, n]) => h('button', { type: 'button', class: `btn small ${ui.mode === m ? '' : 'ghost'}`, 'aria-pressed': String(ui.mode === m), onclick: () => { ui.mode = m; rerender(); } }, t(n)))),
    h('div', { class: 'w19-grp' },
      h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Aproximar', 'Zoom in')), onclick: () => setZ(ui.z * 1.4) }, '+'),
      h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Afastar', 'Zoom out')), onclick: () => setZ(ui.z / 1.4) }, '−'),
      h('button', { type: 'button', class: `btn small ${ui.legend ? '' : 'ghost'}`, 'aria-pressed': String(!!ui.legend), onclick: () => { ui.legend = !ui.legend; rerender(); } }, t(l('Legenda', 'Legend')))));
  const mv = ui.moving ? h('div', { class: 'w19-moving' }, ic('building'), ' ', t(l('Escolha um lote livre (+) para a mudança.', 'Pick a free lot (+) for the move.')), ' ',
    h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.moving = undefined; rerender(); } }, t(l('Cancelar', 'Cancel')))) : null;
  frame.append(bar, mv ?? '', vp, tip, pop);
  if (ui.legend) frame.append(legend());
  // fechar: Esc ou clique fora
  frame.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); close(); } });
  const outside = (e: Event) => { if (!frame.isConnected) { document.removeEventListener('pointerdown', outside, true); return; } if (!pop.hidden && !pop.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('.w19-hs')) close(); };
  document.addEventListener('pointerdown', outside, true);
  if (ui.pop) requestAnimationFrame?.(() => { const hs = layer.querySelector(`[data-id="${CSS.escape(ui.pop!)}"]`) as HTMLElement | null; if (ui.pop) open(ui.pop, hs); });
  return frame;
}

function legend(): HTMLElement {
  const ks = ['hq', 'studio', 'venue', 'fest', 'publisher', 'media', 'platform', 'booking', 'plant', 'school', 'museum', 'store', 'sign', 'dorm', 'park', 'home'] as const;
  return h('div', { class: 'w19-legend small' },
    h('b', null, t(l('Legenda', 'Legend'))),
    h('ul', null, ks.map((k) => h('li', null, ic(KIND18[k].icon), ' ', t(KIND18[k].name)))),
    h('p', { class: 'muted' }, t(l('Placa amarela = obra; vermelha = danificado; cinza = vizinho ou vendido. "+" = lote vazio; "!" = evento do bairro esperando decisão. Marcos da cidade ficam no horizonte.', 'Yellow plate = works; red = damaged; grey = neighbour or sold. "+" = empty lot; "!" = neighbourhood event awaiting a decision. City landmarks sit on the skyline.'))));
}

// ---------------------------------------------------------------- página

function campusArea(s: GameState): HTMLElement {
  const st = campus18(s);
  if (ui.year !== undefined && !st.snaps.some((x) => x.y === ui.year)) ui.year = undefined;
  if (ui.year !== undefined) ui.moving = undefined;
  const v = makeView(s, ui.year);
  const hs = hoodStats19(s);
  const campus = v.bs.filter((b) => b.zone === 'campus' && b.st !== 'sold' && b.st !== 'closed');
  const sy = v.live ? syn19(s, v.bs) : [];
  const upk = v.live ? campus.reduce((t0, b) => t0 + (upkeep19(s, b)?.v ?? 0), 0) : 0;
  const env = v.scene.env;
  const sum = chips(
    stat('building', campus.length, l('Seus prédios', 'Your buildings')),
    stat('sparkle', sy.filter((x) => !x.rule.neg).length, l('Vizinhanças boas', 'Good neighbours')),
    stat('hourglass', v.bs.filter((b) => b.st === 'building' || b.st === 'planned' || b.st === 'renovating').length, l('Em obras', 'Under works')),
    stat('coin', $(upk), l('Custo mensal', 'Monthly cost')),
    stat('calendar', t(env.snow ? l('Neve', 'Snow') : env.rain ? l('Chuva', 'Rain') : env.season === 'winter' ? l('Inverno', 'Winter') : env.season === 'spring' ? l('Primavera', 'Spring') : env.season === 'summer' ? l('Verão', 'Summer') : l('Outono', 'Autumn')), l('Tempo', 'Weather')));
  const snaps = st.snaps;
  const tl = snaps.length > 1 ? h('div', { class: 'c18-tl' },
    h('span', null, ic('hourglass'), ' ', t(l('Ver em', 'See in'))),
    h('input', { type: 'range', min: 0, max: snaps.length, value: ui.year === undefined ? snaps.length : snaps.findIndex((x) => x.y === ui.year), 'aria-label': t(l('Ano do mapa', 'Map year')),
      oninput: (e: Event) => { const i = +(e.target as HTMLInputElement).value; ui.year = i >= snaps.length ? undefined : snaps[i].y; ui.pop = undefined; rerender(); } }),
    h('b', null, ui.year === undefined ? `${s.year} (${t(l('agora', 'now'))})` : String(ui.year)),
    ui.year !== undefined ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.year = undefined; rerender(); } }, t(l('Ao vivo', 'Live'))) : null)
    : h('p', { class: 'small muted' }, t(l('A linha do tempo ganha um retrato do quarteirão a cada virada de ano.', 'The timeline gets a snapshot of the block at every new year.')));
  const evs = v.live ? live19ev(s) : [];
  return h('div', { class: 'c18 w19' },
    section(`${t(l('Nosso mundo', 'Our world'))} — ${s.config.companyName}`,
      h('p', { class: 'w19-hood' }, ic('house'), ' ', why18(s, 'h19.hood', {}, h('b', null, t(hs.h.n)), ` · ${t(STAGE19[hs.stage])}`), h('span', { class: 'muted small' }, ` — ${t(hs.h.d)}`)),
      sum,
      mapFrame(v),
      tl,
      h('p', { class: 'muted small' }, t(l('Toque num prédio, lote, vizinho ou marco para agir ali mesmo. Prédios vizinhos (até uma rua de distância) formam sinergias.', 'Tap a building, lot, neighbour or landmark to act right there. Buildings within one street of each other form synergies.')))),
    v.live && (sy.length || evs.length) ? section(t(l('Vizinhança', 'Neighbourhood')),
      h('ul', { class: 'small w19-list' },
        sy.map((x) => h('li', { class: x.rule.neg ? 'bad' : 'good' }, h('b', null, t(x.rule.name)), ` — ${t(x.rule.eff)}`)),
        evs.map((e) => h('li', { class: 'warn' }, ic('warning'), ' ', h('button', { type: 'button', class: 'linklike', onclick: () => { ui.pop = `ev:${e.id}`; rerender(); } }, t(EV19[e.k].n)), ` — ${t(EV19[e.k].d)}`)))) : null,
    st.log.length ? h('details', { class: 'card w19-log' }, h('summary', null, t(l('Diário de obras e do bairro', 'Works and neighbourhood log'))),
      h('ul', { class: 'small' }, st.log.slice(-10).reverse().map((x) => h('li', null, `${x.y}/${x.m + 1} — ${t(x.t)}`)))) : null);
}

/** Miniatura (sem animação) para o Cockpit: clique abre a página. */
export function campusThumb18(s: GameState): HTMLElement {
  const v = makeView(s);
  const cv = h('canvas', { class: 'c18-thumb px', width: MW, height: MH, role: 'img', 'aria-label': t(l('Nosso mundo (miniatura)', 'Our world (thumbnail)')) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (ctx) drawFrame18(ctx, v.scene, 3, 0);
  const hs = hoodStats19(s), ev = live19ev(s).length;
  return h('button', { type: 'button', class: 'c18-thumbbtn', title: t(l('Abrir Nosso mundo', 'Open Our world')), onclick: () => { store.area = 'campus18' as typeof store.area; rerender(); } }, cv,
    h('small', { class: 'muted' }, `${t(hs.h.n)} · ${t(STAGE19[hs.stage])}${ev ? ` · ${ev} ${t(l('evento(s) no bairro', 'neighbourhood event(s)'))}` : ''}`));
}

registerArea({ id: 'campus18', label: l('Nosso mundo', 'Our world'), icon: 'skyline', key: '', render: campusArea,
  badge: (s) => campus18(s).proj.filter((p) => p.left <= 1).length + live19ev(s).length || Object.keys(campus18(s).dmg).length || undefined });
