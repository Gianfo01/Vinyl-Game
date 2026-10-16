// R31 · onda 2 (J) — PROJETO MUSICAL em cena: a rua do lançamento em pixel art (compor → estúdio → fábrica → rádio →
// loja, pelo plano real do projeto). Clicar numa casa abre o painel curto da etapa com as ações do projeto — as MESMAS
// funções dos botões do hub (PROJ_ACTS31) —; bandeiras levam a marketing/rollout; a van abre o painel rápido.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { projectById, type MusicProject } from '../../sim/sys/project8';
import { modal, rerender, toast } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, fitText, textWidth } from '../pixel/font';
import { C, INK, Px, mix, tint, withAlpha, type Col } from '../pixel/px';
import { vehiclePx29 } from '../pixel/things29';
import { playerPerson } from '../../sim/sys/life';
import { goToProjects } from '../sys/project8';
import { lockBtn31, quickBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { PROJ_ACTS31, ROAD_Y31, ST_TOP31, WALK_Y31, proj31, type FlagKind31, type Proj31, type Stage31 } from './proj31model';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';

// ---------------------------------------------------------------- pintura

const FACADE: Record<Stage31['id'], Col> = { compose: C('#d8c8a0'), studio: C('#c8b8a0'), factory: C('#8a8c94'), radio: C('#9a8a7a'), store: C('#a85a40') };
const FLAG: Record<FlagKind31, Col> = { promo: C('#f08a2c'), media: C('#3a6ad0'), video: C('#8a4ac8'), teaser: C('#f0c820'), tour: C('#3aa84a') };

function interior(p: Px, st: Stage31, x: number, y: number, w: number, hh: number, year: number): void {
  const fy = y + hh - 2, cx = x + Math.round(w / 2);
  switch (st.id) {
    case 'compose': // piano e banquinho com partitura
      p.rect(cx - 16, fy - 16, 24, 14, C('#4a2418')); p.rect(cx - 16, fy - 18, 24, 2, C('#6a3424')); p.rect(cx - 14, fy - 12, 20, 2, C('#f4ecd8'));
      for (let i = 0; i < 10; i++) p.put(cx - 13 + i * 2, fy - 12, INK);
      p.rect(cx - 14, fy - 2, 2, 2, C('#2a1410')); p.rect(cx + 4, fy - 2, 2, 2, C('#2a1410'));
      p.rect(cx - 8, fy - 22, 8, 5, C('#f4ecd8')); p.rect(cx + 12, fy - 7, 8, 2, C('#6a3424')); p.rect(cx + 15, fy - 5, 2, 5, C('#4a2418'));
      break;
    case 'studio': // mesa de som e microfone
      p.rect(cx - 18, fy - 10, 26, 10, C('#5a3a2a')); p.rect(cx - 18, fy - 13, 26, 3, C('#2a2a30'));
      for (let i = 0; i < 8; i++) p.put(cx - 16 + i * 3, fy - 12, i % 3 ? C('#f0c040') : C('#e83030'));
      p.rect(cx + 14, fy - 22, 1, 22, C('#2a2a30')); p.rect(cx + 12, fy - 25, 5, 4, C('#5a5a62')); p.rect(cx + 11, fy - 1, 7, 1, C('#2a2a30'));
      if (year < 1990) { p.disc(cx - 12, fy - 18, 3, C('#2a2a30')); p.disc(cx - 2, fy - 18, 3, C('#2a2a30')); p.rect(cx - 14, fy - 18, 14, 1, C('#5a4a3a')); }
      p.disc(cx - 4, y + 8, 2, C('#ffd889'));
      break;
    case 'factory': // prensa com disco e pilha de discos
      p.rect(cx - 14, fy - 24, 22, 24, C('#5a5c66')); p.rect(cx - 12, fy - 22, 18, 16, C('#3a3c44')); p.disc(cx - 3, fy - 14, 6, INK); p.disc(cx - 3, fy - 14, 2, C('#c8302c'));
      p.rect(cx + 12, fy - 8, 9, 8, C('#2a2a30')); p.rect(cx + 12, fy - 9, 9, 1, C('#5a5a62'));
      break;
    case 'radio': // placa "no ar" e transmissor
      p.rect(cx - 16, y + 6, 26, 7, C('#2a1214')); drawText(p, 'ON AIR', cx - 14, y + 7, C('#ff4a3a'));
      p.rect(cx - 14, fy - 12, 20, 12, C('#6a4a30')); p.rect(cx - 12, fy - 10, 8, 4, C('#d8c8a0')); p.disc(cx + 2, fy - 7, 2, C('#2a2a30'));
      break;
    case 'store': // estante de discos e caixotes
      p.rect(cx - 18, fy - 30, 20, 30, C('#4a2418'));
      for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) p.rect(cx - 17 + i * 2, fy - 28 + r * 7, 1, 5, [C('#c8302c'), C('#3a6ad0'), C('#f0c040'), C('#2a8a4a'), C('#e8e0d0')][(i + r) % 5]);
      p.rect(cx + 6, fy - 10, 10, 10, C('#6a3424')); p.rect(cx + 6, fy - 12, 10, 2, C('#8a4a30'));
      break;
  }
}

function paintStreet(cv: HTMLCanvasElement, s: GameState, m: Proj31): void {
  const W = m.W, H = m.H, year = m.year;
  const p = new Px(W, H);
  // céu ao entardecer com estrelas
  for (let y = 0; y < WALK_Y31; y++) { const k = y / WALK_Y31; const c = mix(C('#1e1a3c'), C('#e08a5a'), Math.max(0, k * k * 1.2)); for (let x = 0; x < W; x++) p.put(x, y, c); }
  for (let i = 0; i < 40; i++) p.put((i * 71) % W, (i * 29) % 26, C('#f4ecd8'));
  p.disc(W - 30, 12, 5, C('#f4ecd8')); p.disc(W - 28, 11, 5, C('#2a2448'));
  // casas da rua
  const layer = new Px(W, H);
  for (const st of m.stages) {
    const x = st.x + 2, w = st.w - 4, y = ST_TOP31, hh = WALK_Y31 - ST_TOP31;
    const fc = FACADE[st.id];
    layer.rect(x, y, w, hh, fc); layer.hline(x, x + w - 1, y, tint(fc, 0.3)); layer.rect(x, y, 2, hh, tint(fc, 0.15)); layer.rect(x + w - 2, y, 2, hh, tint(fc, -0.25));
    layer.rect(x - 1, y - 3, w + 2, 3, tint(fc, -0.35)); // cornija
    // letreiro
    const name = fitText(t(st.name).toUpperCase(), w - 10);
    const sw = textWidth(name) + 8, sx = x + Math.round((w - sw) / 2);
    layer.rect(sx, y + 4, sw, 10, C('#2a2026'));
    drawText(layer, name, sx + 4, y + 7, st.state === 'next' ? C('#9a9088') : year < 1960 ? C('#ffe2a0') : C('#ff9a4a'));
    // vão aberto com o interior
    const ix = x + 5, iy = y + 18, iw = w - 10, ih = hh - 20;
    layer.rect(ix, iy, iw, ih, st.state === 'next' ? C('#3a3036') : C('#6a4a3a'));
    for (let xx = ix; xx < ix + iw; xx += 6) layer.vline(xx, iy, iy + ih - 1, tint(st.state === 'next' ? C('#3a3036') : C('#6a4a3a'), -0.15));
    layer.rect(ix, iy + ih - 3, iw, 3, C('#8a7a5a'));
    interior(layer, st, ix, iy, iw, ih, year);
    if (st.id === 'radio') { const ax = x + w - 12; for (let yy = 6; yy < y; yy += 2) { layer.put(ax, yy, C('#c8302c')); layer.put(ax + 1, yy + 1, C('#f4ecd8')); } layer.line(ax - 4, y, ax, 6, C('#c8302c')); layer.line(ax + 5, y, ax + 1, 6, C('#c8302c')); }
    if (st.state === 'now') layer.rect(ix, iy, iw, ih, withAlpha(C('#ffd889'), 40)); // etapa atual acesa
  }
  layer.outline(INK);
  p.blit(layer, 0, 0);
  for (const st of m.stages) if (st.state === 'next') p.rect(st.x + 1, ST_TOP31 - 4, st.w - 2, WALK_Y31 - ST_TOP31 + 4, withAlpha(C('#0a0820'), 120)); // futuras apagadas
  // calçada, pista e meio-fio
  p.rect(0, WALK_Y31, W, ROAD_Y31 - WALK_Y31, C('#8a8c88')); for (let x = 0; x < W; x += 12) p.vline(x, WALK_Y31, ROAD_Y31 - 1, C('#7a7c78'));
  p.rect(0, ROAD_Y31, W, 26, C('#2e2c30')); for (let x = 4; x < W; x += 22) p.rect(x, ROAD_Y31 + 12, 10, 2, C('#e8c84a'));
  p.rect(0, ROAD_Y31 + 26, W, H - ROAD_Y31 - 26, C('#6a7a5a'));
  // bandeiras (marcos)
  for (const f of m.flags) {
    p.rect(f.x, WALK_Y31 - 24, 1, 24, C('#2a2a30'));
    p.poly([[f.x + 1, WALK_Y31 - 24], [f.x + 9, WALK_Y31 - 21], [f.x + 1, WALK_Y31 - 17]], FLAG[f.kind]);
    if (f.done) { p.put(f.x + 3, WALK_Y31 - 21, C('#ffffff')); p.put(f.x + 4, WALK_Y31 - 20, C('#ffffff')); p.put(f.x + 5, WALK_Y31 - 22, C('#ffffff')); }
    p.rect(f.x - 1, WALK_Y31 - 1, 3, 1, INK);
  }
  const ctx = blitPx31(cv, p.d, W, H);
  if (!ctx) return;
  const v = vehiclePx29('van', year, m.pid);
  const c = v.canvas(); const cx = c.getContext('2d'); if (cx) { const img = cx.getImageData(0, 0, v.w, v.h); for (let i = 0; i < v.w * 3; i++) img.data[(v.w * (v.h - 3)) * 4 + i * 4 + 3] = 0; cx.putImageData(img, 0, 0); }
  ctx.drawImage(c, m.van.x - (v.w >> 1), ROAD_Y31 + 2);
  const pr = (() => { try { return playerPerson(s); } catch { return undefined; } })();
  const sp = avatarSprite(lookOf(pr ?? { id: 'player' }), { year, role: pr?.role ?? null, pose: 'stand', dir: 'SE' });
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(m.me.x - 6, WALK_Y31 + 1, 12, 1);
  ctx.drawImage(sp.c, m.me.x - sp.ax, WALK_Y31 + 2 - sp.ay);
}

// ---------------------------------------------------------------- painel da etapa

function stagePanel(s: GameState, p: MusicProject, id?: string): void {
  const m = proj31(s, p);
  const st = m.stages.find((x) => x.id === id);
  if (!st) return;
  let close = (): void => {};
  const stName: L = st.state === 'done' ? l('feito', 'done') : st.state === 'now' ? l('agora', 'now') : l('depois', 'later');
  const body = h('div', { class: 'sc31-panel' },
    h('p', null, h('span', { class: `sc31-lv lvl-${st.state === 'now' ? 'normal' : 'info'}` }, st.state === 'done' ? '✓' : st.state === 'now' ? '▶' : '…'), h('b', null, t(st.name)), ` (${t(stName)}) · ${t(st.when)}`),
    h('p', { class: 'small' }, t(st.tip)),
    st.bar ? h('p', { class: 'small' }, h('meter', { min: 0, max: st.bar.b, value: st.bar.a }), ' ', t(st.bar.label)) : null,
    st.acts.length ? h('div', { class: 'row wrap' }, st.acts.map((a) => lockBtn31(t(PROJ_ACTS31[a.id].label), a.lock, () => {
      const e = PROJ_ACTS31[a.id].run(s, p);
      close(); toast(t(e ?? PROJ_ACTS31[a.id].ok), e ? 'bad' : 'good'); rerender();
    }, { cls: `btn small${a.id === 'schedule' || a.id === 'recordNow' || a.id === 'write' ? ' primary' : ''}` }))) : h('p', { class: 'muted small' }, t(l('Nada a fazer nesta etapa agora.', 'Nothing to do at this stage right now.'))),
    h('div', { class: 'row wrap' },
      moreBtn31(l('Detalhes: faixas, capa e verba', 'Details: tracks, cover and budget'), () => { close(); goToProjects(p.actId, p.id); }),
      st.id === 'studio' ? moreBtn31(l('Estúdio', 'Studio'), () => { close(); runGo31({ area: 'studio' }); }) : null,
      st.id === 'radio' || st.id === 'store' ? moreBtn31(l('Marketing e rollout', 'Marketing and rollout'), () => { close(); runGo31({ area: 'releases', tab: ['creation-release', p.type === 'lp' ? 'rollout' : 'launch'] }); }) : null,
      quickBtn31({ kind: 'project', id: p.id }, m.title)));
  close = modal(t(l('{n} · {p}', '{n} · {p}'), { n: t(st.name), p: m.title }), body, { wide: true });
}

// ---------------------------------------------------------------- vista

/** A rua do lançamento de um projeto (a tela do projeto continua logo abaixo). */
export function projView31(s: GameState, p: MusicProject): HTMLElement {
  const m = proj31(s, p);
  return sceneView31(s, {
    id: 'proj', title: l('Projeto musical', 'Music project'), W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintStreet(cv, s, m),
    panels: { stage: (id?: string) => { const x = projectById(s, p.id); if (x) stagePanel(s, x, id); } },
    list: () => h('p', { class: 'muted small' }, t(l('Cena oculta: a linha do tempo e os passos do projeto estão logo abaixo.', 'Scene hidden: the project timeline and steps are right below.'))),
    intro: l('O lançamento é uma rua: cada casa é uma etapa (feita ✓, atual acesa, futuras apagadas com o mês). As bandeiras são os marcos de divulgação e mídia; a van mostra onde o disco está.', 'The release is a street: each house is a stage (done ✓, current lit, future ones dimmed with the month). Flags are promotion and media milestones; the van shows where the record is.'),
    legend: h('p', { class: 'sc31-legend' },
      h('span', null, h('b', null, '✓'), ' ', t(l('etapa feita', 'stage done'))), h('span', null, h('b', null, '▶'), ' ', t(l('etapa atual (barra)', 'current stage (bar)'))),
      h('span', null, h('b', null, '≈'), ' ', t(l('mês estimado', 'estimated month'))),
      m.digital ? h('span', null, t(l('lançamento digital: sem fábrica', 'digital release: no pressing plant'))) : null,
      m.flags.length ? h('span', null, h('b', null, '⚑'), ' ', m.flags.map((f) => t(f.name)).join(' · ')) : null),
  });
}

// painel rápido de um projeto (wave 1): leva à rua do lançamento
registerQuick31({
  id: 'q.street', verb: 'open', icon: 'disc', kinds: ['project'], passive: true, label: l('Ver a rua do lançamento', 'See the release street'),
  applies: (s, tg) => tg.kind === 'project' && !!projectById(s, tg.id),
  dest: (s, tg) => ({ area: 'project', actId: projectById(s, tg.id)?.actId }),
});
