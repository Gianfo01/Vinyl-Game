// Rodada 20 (G4, uiux §3) — o botão `Ações ▾` e tudo que consome o registro único (ui/actions20.ts):
// menu de comandos no padrão W3C "menu button" (clique, toque, teclado: Enter/Espaço/↓ abrem, setas navegam,
// Home/End, letra salta, Esc fecha e devolve o foco; clique fora fecha), clique direito / Shift+F10 / tecla de menu
// no card do elenco, folha inferior no celular, itens indisponíveis com motivo (aria-disabled, execução bloqueada
// por código), pré-visualização de custo/efeito antes de qualquer mudança, botões fixados, ação em lote com escopo
// explícito, painel "Preparar gravação" (Protótipo A) e comandos do Ctrl+K. Abrir o menu nunca muda o estado.

import { APPROACHES } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import {
  CAT20, DEFAULT_PINS20, SUBTAB_KEY20, action20, actionRow20, actionRows20, actions20, applyRecordPlan20, batchPreview20, batchable20,
  paletteEntries20, recordPlan20, runAction20, runBatch20, togglePin20, type Nav20, type RecOpt20, type Row20,
} from '../actions20';
import { $, inspect, modal, rerender, toast } from '../common';
import { h, select } from '../dom';
import { openCutscene } from '../registry';
import { savePrefs, store } from '../store';
import { ic, setTab } from '../vis';
import { actionMenu18 } from './personact18';
import { ACT_CARD_EXTRA20 } from './hq8';
import './actmenu20.css';

// ---------------------------------------------------------------- favoritos (preferência do jogador, por navegador)

export function pins20(): string[] {
  const p = (store.prefs as { pins20?: string[] }).pins20;
  return Array.isArray(p) ? p.filter((id) => !!action20(id)) : [...DEFAULT_PINS20];
}
function setPins20(xs: string[]): void { (store.prefs as { pins20?: string[] }).pins20 = xs; savePrefs(); }

// ---------------------------------------------------------------- navegação e foco

/** Aplica um destino do registro: área/aba/subaba/artista ou abre uma ficha/painel. */
export function applyNav20(s: GameState, nav: Nav20 | undefined, anchor?: HTMLElement | null): void {
  if (!nav) return;
  if (nav.act && playerActs(s).includes(nav.act)) store.selectedAct = nav.act;
  if (nav.open === 'act' && nav.act) { inspect.act(nav.act); return; }
  if (nav.open === 'record20' && nav.act) { openRecord20(s, nav.act, anchor); return; }
  if (nav.open === 'pa18' && nav.person) { openPa20(s, nav.person, nav.act); return; }
  if (nav.open === 'batch' && nav.act) { openBatch20(s, nav.act); return; }
  if (nav.open === 'pins') { openPins20(s); return; }
  // saindo do cartão do artista na sede: fecha o cartão
  document.querySelector('.overlay .hq8-card')?.closest('.overlay')?.remove();
  if (nav.tab) setTab(nav.tab[0], nav.tab[1]);
  if (nav.sub) { setTab(SUBTAB_KEY20, nav.sub); store.area = 'artists'; }
  else if (nav.area) store.area = nav.area as typeof store.area;
  rerender();
  // foco segue para o conteúdo aberto (subaba) — ou volta ao botão de ações do artista
  setTimeout(() => {
    const tgt = nav.sub ? document.querySelector<HTMLElement>('[data-focus20]') : document.querySelector<HTMLElement>(`[data-actmenu20="${nav.act ?? ''}"]`);
    tgt?.focus?.();
  }, 30);
}

function done20(s: GameState, out: ReturnType<typeof runAction20>, anchor?: HTMLElement | null): void {
  toast(t(out.text), out.ok ? 'good' : 'bad');
  if (out.cutscene) { openCutscene(s, out.cutscene, rerender); return; }
  if (out.ok && out.nav) applyNav20(s, out.nav, anchor);
  else rerender();
}

/** Escolha de uma ação (menu, botão fixado, Ctrl+K, sede): navega, abre painel ou pré-visualiza antes de executar. */
export function chooseAction20(s: GameState, id: string, actId: string, anchor?: HTMLElement | null): void {
  const r = actionRow20(s, id, { act: actId });
  if (!r) { toast(t(l('Ação indisponível para este artista agora.', 'Action unavailable for this act right now.')), 'bad'); return; }
  if (r.block) { toast(t(r.block), 'bad'); return; }
  if (anchor?.isConnected) anchor.focus();
  if (r.def.form !== 'confirm') { applyNav20(s, r.def.nav?.(s, { act: actId }), anchor); return; }
  openPreview20(s, r, actId);
}

/** Pré-visualização: alvo, custo, tempo, efeito; confirmar revalida e executa; cancelar não muda nada. */
function openPreview20(s: GameState, r: Row20, actId: string): void {
  const a = s.acts[actId];
  let close = () => {};
  const body = h('div', { class: 'am20-prev' },
    h('p', null, h('b', null, t(l('Artista: ', 'Act: '))), a.name),
    r.def.desc ? h('p', { class: 'muted small' }, t(r.def.desc)) : null,
    h('dl', { class: 'am20-dl' },
      h('dt', null, t(l('Custo', 'Cost'))), h('dd', { class: 'num' }, r.cost ? $(r.cost) : t(l('sem custo direto', 'no direct cost'))),
      r.time ? [h('dt', null, t(l('Tempo e capacidade', 'Time and capacity'))), h('dd', null, t(r.time))] : null,
      r.effect ? [h('dt', null, t(l('O que muda', 'What changes'))), h('dd', null, t(r.effect))] : null,
      h('dt', null, t(l('Caixa agora', 'Cash now'))), h('dd', { class: 'num' }, $(s.player.cash)),
    ),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', onclick: () => { close(); done20(s, runAction20(s, r.def.id, { act: actId })); } }, t(l('Confirmar', 'Confirm'))),
      h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Cancelar', 'Cancel')))),
  );
  close = modal(t(r.def.label), body);
}

// ---------------------------------------------------------------- menu (padrão W3C menu button)

let openMenu: (() => void) | null = null;
let menuSeq = 0;

/** Abre o menu de ações do artista ancorado em `anchor` (ou no ponto do clique direito). */
export function openActionMenu20(s: GameState, actId: string, anchor: HTMLElement, at?: { x: number; y: number }): void {
  openMenu?.();
  const a = s.acts[actId];
  if (!a) return;
  const rows = actionRows20(s, { act: actId });
  const id = `am20-${++menuSeq}`;
  const items: HTMLElement[] = [];
  const mobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  const pick = (r: Row20) => {
    if (r.block) { status.textContent = t(r.block); return; }
    close(false);
    chooseAction20(s, r.def.id, actId, anchor);
  };
  const item = (r: Row20) => {
    const el = h('div', { role: 'menuitem', tabindex: '-1', class: `am20-item ${r.block ? 'off' : ''}`, 'aria-disabled': r.block ? 'true' : null, 'data-id': r.def.id,
      onclick: (e: Event) => { e.stopPropagation(); pick(r); } },
      h('span', { class: 'am20-l' }, r.def.icon ? ic(r.def.icon) : null, ' ', t(r.def.label), r.def.form === 'confirm' ? ' …' : r.def.form === 'panel' ? ' ›' : ''),
      r.cost ? h('span', { class: 'am20-c num' }, $(r.cost)) : null,
      r.block ? h('small', { class: 'am20-why' }, t(r.block)) : r.time ? h('small', { class: 'muted' }, t(r.time)) : null);
    items.push(el);
    return el;
  };
  const status = h('div', { class: 'am20-status small', role: 'status', 'aria-live': 'polite' });
  const menu = h('div', { role: 'menu', id, class: 'am20-menu', 'aria-label': t(l('Ações para {a}', 'Actions for {a}')).replace('{a}', a.name) },
    CAT20.map((c) => { const rs = rows.filter((r) => r.def.cat === c.id); return rs.length ? h('div', { role: 'group', class: 'am20-grp', 'aria-label': t(c.label) }, h('div', { class: 'am20-gh', role: 'presentation' }, t(c.label)), rs.map(item)) : null; }));
  const box = h('div', { class: `am20 ${mobile ? 'sheet' : ''}` },
    h('div', { class: 'am20-head' }, h('b', null, a.name), h('small', { class: 'muted' }, ' · ', t(l('ações', 'actions')))),
    menu, status);
  const scrim = mobile ? h('div', { class: 'am20-scrim', onclick: () => close(true) }) : null;
  const focusAt = (i: number) => { const n = items.length; if (!n) return; const k = ((i % n) + n) % n; items[k].focus(); };
  const cur = () => items.indexOf(document.activeElement as HTMLElement);
  const onKey = (e: KeyboardEvent) => {
    const i = cur();
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(items.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) { e.preventDefault(); items[i].click(); }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const n = items.length;
      for (let j = 1; j <= n; j++) { const el = items[(Math.max(i, 0) + j) % n]; if ((el.textContent ?? '').trim().toLowerCase().startsWith(k)) { el.focus(); break; } }
    }
  };
  const onDown = (e: Event) => { if (!box.contains(e.target as Node) && e.target !== anchor && !anchor.contains(e.target as Node)) close(false); };
  function close(refocus: boolean): void {
    if (!box.isConnected) return;
    box.remove(); scrim?.remove();
    document.removeEventListener('pointerdown', onDown, true);
    box.removeEventListener('keydown', onKey);
    anchor.setAttribute('aria-expanded', 'false');
    anchor.removeAttribute('aria-controls');
    openMenu = null;
    if (refocus && anchor.isConnected) anchor.focus();
  }
  if (scrim) document.body.appendChild(scrim);
  document.body.appendChild(box);
  box.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onDown, true);
  anchor.setAttribute('aria-expanded', 'true');
  anchor.setAttribute('aria-controls', id);
  openMenu = () => close(false);
  if (!mobile) {
    // ancorado; nunca passa da área útil
    const r = at ? { left: at.x, right: at.x, top: at.y, bottom: at.y } : anchor.getBoundingClientRect();
    const w = box.offsetWidth || 320, hh = box.offsetHeight || 300;
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.max(8, Math.min(vw - w - 8, r.left));
    const below = vh - r.bottom - 8 >= Math.min(hh, 260);
    const top = below ? r.bottom + 4 : Math.max(8, r.top - Math.min(hh, vh - 16) - 4);
    box.style.left = `${left}px`;
    box.style.top = `${Math.max(8, top)}px`;
    box.style.maxHeight = `${below ? vh - (r.bottom + 4) - 8 : Math.min(r.top - 12, vh - 16)}px`;
  }
  focusAt(0);
}

/** Botão `Ações ▾` (nome acessível inclui o artista). */
export function actionsButton20(s: GameState, actId: string, cls = 'btn'): HTMLElement {
  const a = s.acts[actId];
  const b = h('button', { class: `${cls} am20-btn`, 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-actmenu20': actId, 'aria-label': t(l('Ações para {a}', 'Actions for {a}')).replace('{a}', a?.name ?? ''),
    onclick: (e: Event) => { e.stopPropagation(); if (b.getAttribute('aria-expanded') === 'true') { openMenu?.(); b.focus(); } else openActionMenu20(s, actId, b); },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openActionMenu20(s, actId, b); if (e.key === 'ArrowUp') { const its = document.querySelectorAll<HTMLElement>('.am20 [role=menuitem]'); its[its.length - 1]?.focus(); } } } },
  t(l('Ações', 'Actions')), ' ▾') as HTMLButtonElement;
  return b;
}

/** Liga clique direito, Shift+F10 e a tecla de menu a um card/linha do artista (só nele; o resto da página mantém o menu nativo). */
export function bindContext20(s: GameState, el: HTMLElement, actId: string): HTMLElement {
  el.addEventListener('contextmenu', (e) => {
    const tg = e.target as HTMLElement;
    if (tg.closest('a, input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    openActionMenu20(s, actId, el, { x: e.clientX, y: e.clientY });
  });
  el.addEventListener('keydown', (e) => {
    if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); openActionMenu20(s, actId, el); }
  });
  return el;
}

/** Botões rápidos fixados (Agenda e Projeto de fábrica); o menu continua com a cauda longa. */
export function quickPins20(s: GameState, actId: string): HTMLElement {
  return h('span', { class: 'am20-pins' }, pins20().map((id) => {
    const r = actionRow20(s, id, { act: actId });
    if (!r) return null;
    return h('button', { class: 'btn small ghost', 'aria-disabled': r.block ? 'true' : null, title: r.block ? t(r.block) : t(r.def.label),
      onclick: (e: Event) => chooseAction20(s, id, actId, e.currentTarget as HTMLElement) }, r.def.icon ? ic(r.def.icon) : null, ' ', t(r.def.label));
  }));
}

// ---------------------------------------------------------------- painéis

function openPa20(s: GameState, personId: string, actId?: string): void {
  const p = s.persons[personId];
  if (!p) return;
  modal(`${p.name}${actId && s.acts[actId] ? ` · ${s.acts[actId].name}` : ''}`, actionMenu18(s, `p:${personId}`), { onClose: () => rerender() });
}

function openPins20(s: GameState): void {
  const box = h('div', { class: 'am20-pinlist' });
  const draw = () => {
    const pins = pins20();
    box.replaceChildren(
      h('p', { class: 'muted small' }, t(l('Fixe até 5 ações: viram botões no cabeçalho de todo artista. O menu continua com todas.', 'Pin up to 5 actions: they become buttons in every act\'s header. The menu keeps them all.'))),
      ...CAT20.map((c) => h('fieldset', null, h('legend', null, t(c.label)), actions20().filter((x) => x.cat === c.id && x.id !== 'pins.manage').map((x) =>
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: pins.includes(x.id), onchange: () => { setPins20(togglePin20(pins20(), x.id)); draw(); } }), t(x.label))))),
      h('button', { class: 'btn small ghost', onclick: () => { setPins20([...DEFAULT_PINS20]); draw(); } }, t(l('Voltar ao padrão', 'Reset to default'))),
    );
  };
  draw();
  void s;
  modal(t(l('Ações fixadas', 'Pinned actions')), box, { onClose: () => rerender() });
}

/** Lote: escolha explícita dos artistas e da ação; prévia por artista (elegível? custo?) antes de aplicar. */
function openBatch20(s: GameState, actId: string): void {
  const ids = playerActs(s);
  const chosen = new Set<string>([actId]);
  const defs = batchable20();
  let act = defs[0]?.id ?? '';
  const box = h('div', { class: 'am20-batch' });
  let close = () => {};
  const draw = (result?: string) => {
    const pv = batchPreview20(s, act, [...chosen]);
    box.replaceChildren(
      h('p', { class: 'muted small' }, t(l('O escopo é sempre visível: só os marcados recebem a ação. Cada um é conferido de novo na hora de aplicar.', 'The scope is always visible: only checked acts get the action. Each is re-checked when applying.'))),
      h('label', null, t(l('Ação: ', 'Action: ')), select(act, defs.map((d) => ({ value: d.id, label: t(d.label) })), (v) => { act = v; draw(); }, { 'aria-label': t(l('Ação em lote', 'Batch action')) })),
      h('fieldset', null, h('legend', null, t(l('Artistas', 'Acts')), ` (${chosen.size}/${ids.length})`),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn small ghost', onclick: () => { ids.forEach((x) => chosen.add(x)); draw(); } }, t(l('Marcar todos', 'Check all'))),
          h('button', { class: 'btn small ghost', onclick: () => { chosen.clear(); draw(); } }, t(l('Desmarcar', 'Uncheck all')))),
        ids.map((id) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: chosen.has(id), onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) chosen.add(id); else chosen.delete(id); draw(); } }), s.acts[id].name))),
      h('table', { class: 'am20-tbl small' }, h('caption', { class: 'sr-only' }, t(l('Prévia por artista', 'Preview per act'))),
        h('thead', null, h('tr', null, h('th', null, t(l('Artista', 'Act'))), h('th', null, t(l('Situação', 'Status'))), h('th', { class: 'num' }, t(l('Custo', 'Cost'))))),
        h('tbody', null, pv.rows.map((r) => h('tr', { class: r.block ? 'off' : '' }, h('td', null, r.name), h('td', null, r.block ? `✗ ${t(r.block)}` : `✓ ${t(l('elegível', 'eligible'))}`), h('td', { class: 'num' }, r.block ? '—' : $(r.cost)))))),
      h('p', null, h('b', null, t(l('Total: ', 'Total: '))), h('span', { class: 'num' }, $(pv.total)), ` · ${pv.ok}/${pv.rows.length} ${t(l('elegíveis', 'eligible'))}`),
      result ? h('p', { class: 'small', role: 'status' }, result) : '',
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', disabled: !pv.ok, onclick: () => {
          const res = runBatch20(s, act, [...chosen]);
          const ok = res.filter((x) => x.out.ok).length;
          toast(t(l('Aplicado a {n} de {m}.', 'Applied to {n} of {m}.')).replace('{n}', String(ok)).replace('{m}', String(res.length)), ok ? 'good' : 'bad');
          draw(res.map((x) => `${s.acts[x.act]?.name}: ${t(x.out.text)}`).join(' · '));
        } }, t(l('Aplicar aos elegíveis', 'Apply to eligible'))),
        h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Fechar', 'Close')))),
    );
  };
  draw();
  close = modal(t(l('Ação em lote', 'Batch action')), box, { wide: true, onClose: () => rerender() });
}

/** Protótipo A — "Preparar gravação": músicas escritas, voz/energia, estúdio real; comparar e confirmar o plano. */
export function openRecord20(s: GameState, actId: string, anchor?: HTMLElement | null): void {
  const a = s.acts[actId];
  if (!a) return;
  let tier = s.player.hq >= 1 ? 0 : 1, approach = 'balanced';
  let opt: RecOpt20 = 'now';
  const box = h('div', { class: 'am20-rec' });
  let close = () => {};
  const draw = () => {
    const rp = recordPlan20(s, actId, tier, approach);
    const o = rp.options.find((x) => x.id === opt) ?? rp.options[0];
    const st = rp.state;
    box.replaceChildren(
      h('p', null, h('b', null, t(l('Artista: ', 'Act: '))), a.name),
      rp.block ? h('p', { class: 'bad', role: 'alert' }, t(rp.block)) : '',
      h('div', { class: 'am20-rec-grid' },
        h('section', null, h('h4', null, t(l('Músicas escritas', 'Written songs'))),
          rp.songs.length ? h('ol', { class: 'small' }, rp.songs.map((x, i) => h('li', { class: i < rp.take ? '' : 'muted' }, `${x.title} `, h('span', { class: 'num muted' }, `(${x.score})`)))) : h('p', { class: 'muted small' }, t(l('Nenhuma.', 'None.'))),
          h('p', { class: 'muted small' }, t(l('Uma sessão grava até {n} (as melhores primeiro).', 'One session records up to {n} (best first).')).replace('{n}', String(rp.take)))),
        h('section', null, h('h4', null, t(l('Voz e energia', 'Voice and energy'))),
          h('ul', { class: 'small am20-kv' },
            h('li', null, t(l('Moral', 'Morale')), h('b', { class: 'num' }, Math.round(st.morale))),
            h('li', null, t(l('Cansaço', 'Fatigue')), h('b', { class: 'num' }, Math.round(st.fatigue))),
            h('li', null, t(l('Estresse', 'Stress')), h('b', { class: 'num' }, Math.round(st.stress))),
            h('li', null, t(l('Inspiração', 'Inspiration')), h('b', { class: 'num' }, Math.round(st.inspiration))),
            h('li', null, t(l('Entrosamento', 'Tightness')), h('b', { class: 'num' }, `${Math.round(st.rehearsed)}/15`)),
            h('li', null, t(l('Efeito na interpretação', 'Effect on performance')), h('b', { class: `num ${st.mood < 0 ? 'bad' : 'good'}` }, st.mood >= 0 ? `+${st.mood}` : String(st.mood)))),
          st.health ? h('p', { class: 'warn small' }, '⚠ ', t(st.health)) : null),
        h('section', null, h('h4', null, t(l('Estúdio', 'Studio'))),
          h('label', { class: 'small' }, t(l('Estúdio: ', 'Studio: ')), select(tier, rp.studio.tiers.map((x) => ({ value: x.id, label: `${t(x.name)} · ${$(x.cost)}`, disabled: !x.ok })), (v) => { tier = v; draw(); }, { 'aria-label': t(l('Estúdio', 'Studio')) })),
          h('label', { class: 'small' }, t(l('Abordagem: ', 'Approach: ')), select(approach, APPROACHES.map((x) => ({ value: x.id as string, label: t(x.name) })), (v) => { approach = v; draw(); }, { 'aria-label': t(l('Abordagem', 'Approach')) })),
          h('p', { class: 'muted small' }, t(l('Salas de gravação na sede: {n} · produtor da casa: +{p} de produção.', 'Recording rooms at HQ: {n} · in-house producer: +{p} production.')).replace('{n}', String(rp.studio.sessions)).replace('{p}', String(rp.studio.producer)))),
      ),
      h('fieldset', { class: 'am20-opts' }, h('legend', null, t(l('Comparar', 'Compare'))),
        rp.options.map((x) => h('label', { class: `am20-opt ${x.id === opt ? 'on' : ''}` },
          h('input', { type: 'radio', name: 'am20rec', checked: x.id === opt, onchange: () => { opt = x.id; draw(); } }),
          h('span', null, h('b', null, t(x.name)), h('small', { class: 'muted' }, ' — ', t(x.fx)),
            x.plan ? h('small', { class: x.plan.block ? 'bad' : 'muted' }, h('br'),
              x.plan.block ? t(x.plan.block) : `${t(l('Custo', 'Cost'))} ${$(x.plan.cost)} · ${t(l('ocupação', 'load'))} ${x.plan.load}% / ${x.plan.cap}%${x.plan.dropped.length ? ` · ${t(l('sai', 'drops'))}: ${x.plan.dropped.map((d) => d.action).join(', ')}` : ''}`) : null)))),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', disabled: !!rp.block || !!o.plan?.block, onclick: () => {
          const out = applyRecordPlan20(s, actId, opt, tier, approach);
          close();
          done20(s, out, anchor);
        } }, o.plan ? t(l('Confirmar plano na agenda', 'Confirm plan on the agenda')) : t(l('Ir aos produtores', 'Go to producers'))),
        h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Cancelar', 'Cancel')))),
      h('p', { class: 'muted small' }, t(l('O resultado (qualidade de cada faixa, gasto e o porquê) chega quando o mês correr; nada muda antes de confirmar.', 'The result (each track\'s quality, spend and the why) arrives as the month runs; nothing changes before you confirm.'))),
    );
  };
  draw();
  close = modal(t(l('Preparar gravação', 'Prepare a recording')), box, { wide: true });
}

// ---------------------------------------------------------------- Ctrl+K

/** Comandos de ação para a paleta: o artista selecionado sempre; os outros só na busca. */
export function paletteCmds20(s: GameState, others = false): { label: string; kind: string; icon?: string; hint?: string; weight?: number; run: () => void }[] {
  const mine = playerActs(s);
  const sel = store.selectedAct && mine.includes(store.selectedAct) ? store.selectedAct : mine[0];
  if (!sel) return [];
  const acts = others ? mine.filter((x) => x !== sel) : [sel];
  const kind = t(l('Ação', 'Action'));
  return paletteEntries20(s, acts).map((x) => ({ label: t(x.label), kind, icon: action20(x.id)?.icon ?? 'handshake', hint: x.block ? `✗ ${t(x.block)}` : undefined, weight: others ? 1 : 3, run: () => chooseAction20(s, x.id, x.act) }));
}

// sede espacial: o cartão do artista ganha o mesmo botão (G5 reaproveita o registro para as salas)
ACT_CARD_EXTRA20.f = (s, actId) => (playerActs(s).includes(actId) ? actionsButton20(s, actId, 'btn small') : null);

export const _am20 = { pins20, togglePin20 } as { pins20: () => string[]; togglePin20: typeof togglePin20 };
export type { L };
