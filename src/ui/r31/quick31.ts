// R31 · O — PAINEL RÁPIDO DE AÇÃO, BUSCA QUE ABRE A AÇÃO, FAVORITOS (RN-15) e METAS PESSOAIS (RN-09).
//
//  openQuick31(s, alvo, ação?)  abre sobre a tela atual as ações possíveis para um artista/pessoa/projeto/cidade, cada
//                               uma com custo e, quando travada, o motivo e a condição para liberar (núcleo: quick31core).
//                               As cenas da onda 2 abrem o mesmo painel (e registram ações com registerQuick31).
//  paletteCmds31(s, q)          comandos do Ctrl+K: "contratar X", "gravar com Y", "lançar Z", "turnê em Recife",
//                               "comprar casa em Salvador" → abrem o painel com a ação em foco; favoritos e "Metas".
//  openMine31(s)                favoritos (abrir/desafixar, fixar a tela atual) e metas (criar, acompanhar, apagar).
//  favStar31(s, tipo, destino)  estrela ☆/★ para fixar pessoas, artistas, cidades e telas em qualquer lugar.
import { tourList } from '../../sim/tours';
import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Dest } from '../../sim/r31/dest';
import { addGoal31, favs31, goalProgress31, GOAL31, isFav31, my31, removeGoal31, toggleFav31, type FavKind31, type GoalKind31 } from '../../sim/r31/mine';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, inspect, modal, rerender, toast } from '../common';
import { h, select } from '../dom';
import { openOffer, openPerson } from '../ficha';
import { setTourStops20 } from '../panels/misc';
import { setTourAct31 } from '../panels/tours';
import { store } from '../store';
import { chooseAction20 } from '../sys/actmenu20';
import { setVenueCity31 } from '../sys/live/venue';
import { goToProjects } from '../sys/project8';
import { ic, setTab } from '../vis';
import { lockBtn31, quickHook31 } from './lock31';
import { actOf31, quickRows31, searchActions31, targetName31, type QRow31, type QTarget31 } from './quick31core';
import { TOPBAR31 } from '../ps/menu31ui';

// ---------------------------------------------------------------- navegação por destino

/** Vai a um destino (área; aba "chave/id"; artista; pessoa). O app escuta 'vtn31-go' e usa o roteador dele. */
export function goDest31(d: Dest): void {
  if (d.tab && d.tab.includes('/')) { const [k, v] = d.tab.split('/'); setTab(k, v); }
  if (d.actId) store.selectedAct = d.actId;
  if (d.personId) { const id = d.personId.startsWith('p:') ? d.personId.slice(2) : d.personId; openPerson(id); return; }
  if (d.intent?.startsWith('city:')) { inspect.city(d.intent.slice(5)); return; }
  if (d.actId && !d.tab && d.area === 'artists') { inspect.act(d.actId); return; }
  const ev = new CustomEvent('vtn31-go', { detail: d.area, cancelable: true });
  if (document.dispatchEvent(ev)) { store.area = d.area as typeof store.area; rerender(); }
}

// ---------------------------------------------------------------- execução

/** Executa a linha (a regra do dono revalida de novo na hora: o painel só leva até ela). */
export function runQuick31(s: GameState, r: QRow31, tg: QTarget31): void {
  if (r.lock) { toast(`🔒 ${t(r.lock.why)} → ${t(r.lock.unlock)}`, 'bad'); return; }
  if (r.def.run) { r.def.run(s, tg); return; } // R31 · V: cenas de mecânica (renovar, rescindir, formação…)
  const a = actOf31(s, tg);
  switch (r.def.id) {
    case 'q.sign': if (a) openOffer(a.id); return;
    case 'q.record': if (a) chooseAction20(s, 'record.prepare', a.id); return;
    case 'q.release': if (a) goToProjects(a.id, tg.kind === 'project' ? tg.id : undefined); return;
    case 'q.tour':
      if (tg.kind === 'city') { const id = playerActs(s).find((x) => !tourList(s).some((tr) => tr.actId === x && (tr.status === 'planned' || tr.status === 'running'))); if (id) setTourAct31(id); setTourStops20(s, [tg.id]); }
      else if (a) setTourAct31(a.id);
      goDest31(r.dest);
      return;
    case 'q.buyVenue': setVenueCity31(tg.id); goDest31(r.dest); return;
    case 'q.open':
      if (tg.kind === 'act') inspect.act(tg.id);
      else if (tg.kind === 'person') openPerson(tg.id);
      else if (tg.kind === 'city') inspect.city(tg.id);
      else if (a) goToProjects(a.id, tg.id);
      return;
    case 'q.pin': {
      const on = toggleFav31(s, tg.kind === 'project' ? 'act' : (tg.kind as FavKind31), r.dest, targetName31(s, tg));
      toast(t(on ? l('Fixado nos favoritos.', 'Pinned to favourites.') : l('Tirado dos favoritos.', 'Removed from favourites.')), 'good');
      return;
    }
    case 'q.more': if (a) { store.selectedAct = a.id; goDest31({ area: 'artists', tab: 'artists20/overview' }); } return;
    default: goDest31(r.dest);
  }
}

// ---------------------------------------------------------------- painel rápido

/** Abre o painel rápido sobre a tela atual. `focus` = id da ação em destaque (vinda da busca). */
export function openQuick31(s: GameState, tg: QTarget31, focus?: string): void {
  const rows = quickRows31(s, tg);
  let close = () => {};
  const name = t(targetName31(s, tg));
  const kindL: Record<QTarget31['kind'], L> = { act: l('Artista', 'Act'), person: l('Pessoa', 'Person'), project: l('Projeto', 'Project'), city: l('Cidade', 'City') };
  const favKind: FavKind31 | null = tg.kind === 'project' ? null : tg.kind;
  const pinRow = rows.find((r) => r.def.id === 'q.pin');
  const list = h('ul', { class: 'qk31-list', role: 'list' }, rows.filter((r) => r.def.id !== 'q.pin').map((r) => h('li', { class: `qk31-row${r.def.id === focus ? ' focus' : ''}`, 'data-q31': r.def.id },
    lockBtn31(h('span', { class: 'qk31-btn' }, ic(r.def.icon), ' ', t(r.def.label)), r.lock, () => { close(); runQuick31(s, r, tg); }, { cls: `btn small${r.def.id === focus ? ' primary' : ''}` }),
    r.cost ? h('span', { class: 'qk31-cost', title: t(l('Custo estimado', 'Estimated cost')) }, '≈ ', $(r.cost)) : null)));
  const body = h('div', { class: 'qk31' },
    h('div', { class: 'qk31-head' }, h('span', { class: 'pill' }, t(kindL[tg.kind])), h('b', null, name),
      favKind && pinRow ? favStar31(s, favKind, pinRow.dest, targetName31(s, tg)) : null),
    rows.length ? list : h('p', { class: 'muted' }, t(l('Nada a fazer aqui agora.', 'Nothing to do here right now.'))),
    h('p', { class: 'muted small' }, t(l('Ações travadas mostram o motivo e o que precisa mudar. Nada acontece até você confirmar na tela da ação.', 'Locked actions show the reason and what must change. Nothing happens until you confirm on the action\'s screen.'))));
  close = modal(t(l('Ações rápidas · {n}', 'Quick actions · {n}'), { n: name }), body);
  setTimeout(() => body.querySelector<HTMLButtonElement>(`[data-q31="${focus ?? ''}"] button:not([disabled])`)?.focus(), 0);
}

quickHook31.open = (tg, focus) => { if (store.game) openQuick31(store.game, tg, focus); };

// ---------------------------------------------------------------- favoritos e metas

/** Estrela de favorito (☆ fixa, ★ desafixa). */
export function favStar31(s: GameState, kind: FavKind31, dest: Dest, name?: L): HTMLElement {
  const on = () => isFav31(s, kind, dest);
  const b = h('button', { type: 'button', class: 'fav31', 'aria-pressed': on() ? 'true' : 'false', title: t(on() ? l('Tirar dos favoritos', 'Remove from favourites') : l('Fixar nos favoritos', 'Pin to favourites')),
    onclick: (e: Event) => { e.stopPropagation(); const x = toggleFav31(s, kind, dest, name); b.textContent = x ? '★' : '☆'; b.setAttribute('aria-pressed', x ? 'true' : 'false'); b.title = t(x ? l('Tirar dos favoritos', 'Remove from favourites') : l('Fixar nos favoritos', 'Pin to favourites')); } }, on() ? '★' : '☆');
  return b;
}

const favName31 = (s: GameState, f: ReturnType<typeof favs31>[number]): string => {
  if (f.kind === 'act' && f.dest.actId) return s.acts[f.dest.actId]?.name ?? '—';
  if (f.kind === 'person' && f.dest.personId) return s.persons[f.dest.personId.replace(/^p:/, '')]?.name ?? '—';
  if (f.kind === 'city' && f.dest.intent?.startsWith('city:')) return t(cityById[f.dest.intent.slice(5)]?.name);
  return f.name ? t(f.name) : f.dest.area;
};
const favIcon31: Record<FavKind31, string> = { act: 'guitar', person: 'star', city: 'globe', screen: 'compass' };

function openFav31(s: GameState, f: ReturnType<typeof favs31>[number]): void {
  if (f.kind === 'act' && f.dest.actId) return openQuick31(s, { kind: 'act', id: f.dest.actId });
  if (f.kind === 'person' && f.dest.personId) return openQuick31(s, { kind: 'person', id: f.dest.personId.replace(/^p:/, '') });
  if (f.kind === 'city' && f.dest.intent?.startsWith('city:')) return openQuick31(s, { kind: 'city', id: f.dest.intent.slice(5) });
  goDest31(f.dest);
}

/** Nome da tela atual (o título da aba do navegador começa por ele). */
const screenName31 = (): string => (typeof document !== 'undefined' ? document.title.split(/ · | — /)[0] : '') || String(store.area);

/** Favoritos e metas pessoais. */
export function openMine31(s: GameState): void {
  let close = () => {};
  const box = h('div', { class: 'my31' });
  const form = { kind: 'cash' as GoalKind31, target: '', actId: playerActs(s)[0] ?? '', byYear: '' };
  const draw = () => {
    const fs = favs31(s);
    const area = String(store.area);
    const here: Dest = { area };
    const goals = my31(s).goals;
    const kinds = Object.keys(GOAL31) as GoalKind31[];
    const kindName: Record<GoalKind31, L> = { cash: l('Caixa', 'Cash'), fame: l('Fama de um artista', 'An act\'s fame'), roster: l('Tamanho do elenco', 'Roster size'), releases: l('Lançamentos', 'Releases'), top10s: l('Top 10', 'Top 10'), number1s: l('Números 1', 'Number 1s'), gold: l('Discos de ouro', 'Gold records') };
    box.replaceChildren(
      h('section', null, h('h4', null, '★ ', t(l('Favoritos', 'Favourites'))),
        fs.length ? h('ul', { class: 'my31-list' }, fs.map((f) => h('li', null, ic(favIcon31[f.kind]),
          h('button', { type: 'button', class: 'btn small ghost grow', onclick: () => { close(); openFav31(s, f); } }, favName31(s, f)),
          h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Tirar {n} dos favoritos', 'Remove {n} from favourites'), { n: favName31(s, f) }), onclick: () => { toggleFav31(s, f.kind, f.dest); draw(); } }, '✕'))))
          : h('p', { class: 'muted small' }, t(l('Nada fixado ainda. Use ☆ no painel rápido (⚡ ou Ctrl+K "fixar …") ou fixe a tela atual aqui.', 'Nothing pinned yet. Use ☆ in the quick panel (⚡ or Ctrl+K "pin …") or pin the current screen here.'))),
        h('div', { class: 'row wrap' }, isFav31(s, 'screen', here) ? null : h('button', { type: 'button', class: 'btn small', onclick: () => { const n = screenName31(); toggleFav31(s, 'screen', here, l(n, n)); draw(); } }, '☆ ', t(l('Fixar esta tela ({n})', 'Pin this screen ({n})'), { n: screenName31() })))),
      h('section', null, h('h4', null, '🎯 ', t(l('Metas pessoais', 'Personal goals'))),
        h('p', { class: 'muted small' }, t(l('Metas suas, sem prêmio: só para acompanhar. A virada do mês marca quando você chegou lá.', 'Your own goals, no prize: just to follow. The month turn marks when you got there.'))),
        goals.length ? h('ul', { class: 'my31-list' }, goals.map((g) => {
          const p = goalProgress31(s, g);
          const unitV = (v: number) => (GOAL31[g.kind].unit === 'money' ? $(v) : String(v));
          return h('li', null,
            h('span', { class: 'grow' }, p.done ? '✓ ' : p.missed ? '✗ ' : '', t(p.label), g.byYear ? h('small', { class: 'muted' }, ` · ${t(l('até {y}', 'by {y}'), { y: g.byYear })}`) : null),
            h('span', { class: `my31-meter${p.done ? ' done' : ''}`, role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(p.pct), title: `${unitV(p.cur)} / ${unitV(p.target)}` }, h('i', { style: `width:${p.pct}%` })),
            h('small', { class: 'muted' }, `${p.pct}%`),
            h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Apagar meta', 'Delete goal')), onclick: () => { removeGoal31(s, g.id); draw(); } }, '✕'));
        })) : null,
        h('div', { class: 'my31-form' },
          h('label', null, t(l('Meta', 'Goal')), select(form.kind, kinds.map((k) => ({ value: k, label: t(kindName[k]) })), (v) => { form.kind = v; draw(); })),
          GOAL31[form.kind].needsAct ? h('label', null, t(l('Artista', 'Act')), select(form.actId, playerActs(s).map((id) => ({ value: id, label: s.acts[id].name })), (v) => { form.actId = v; })) : null,
          h('label', null, GOAL31[form.kind].unit === 'money' ? t(l('Alvo ($)', 'Target ($)')) : t(l('Alvo', 'Target')),
            h('input', { type: 'number', min: 1, step: 1, value: form.target, style: 'width:7em', oninput: (e: Event) => { form.target = (e.target as HTMLInputElement).value; } })),
          h('label', null, t(l('Até o ano (opcional)', 'By year (optional)')), h('input', { type: 'number', min: s.year, max: 2040, value: form.byYear, style: 'width:6em', oninput: (e: Event) => { form.byYear = (e.target as HTMLInputElement).value; } })),
          h('button', { type: 'button', class: 'btn small primary', onclick: () => {
            const raw = Number(form.target);
            const r = addGoal31(s, { kind: form.kind, target: GOAL31[form.kind].unit === 'money' ? raw * 100 : raw, actId: form.actId || undefined, byYear: form.byYear ? Number(form.byYear) : undefined });
            if ('err' in r) toast(t(r.err), 'bad'); else { form.target = ''; draw(); }
          } }, t(l('Criar meta', 'Add goal'))))),
    );
  };
  draw();
  close = modal(t(l('Favoritos e metas', 'Favourites and goals')), box, { onClose: () => rerender() });
}

// ---------------------------------------------------------------- Ctrl+K

export interface Cmd31 { label: string; kind: string; icon?: string; hint?: string; weight?: number; alt?: string; run: () => void }

/** Comandos fixos (sem digitar): favoritos e o painel de metas. */
export function paletteBase31(s: GameState): Cmd31[] {
  return [
    { label: t(l('Favoritos e metas', 'Favourites and goals')), alt: t(l('metas objetivos favoritos fixados', 'goals targets favourites pinned')), kind: 'action', icon: 'star', weight: 6, run: () => openMine31(s) },
    ...favs31(s).map((f): Cmd31 => ({ label: `★ ${favName31(s, f)}`, alt: favName31(s, f), kind: 'recent', icon: favIcon31[f.kind], hint: t(l('Favorito', 'Favourite')), weight: 9, run: () => openFav31(s, f) })),
  ];
}

/** Comandos digitados: "verbo alvo" vira ação (abre o painel rápido com a ação em foco). */
export function paletteCmds31(s: GameState, q: string): Cmd31[] {
  return searchActions31(s, q).map((x): Cmd31 => ({
    label: `${t(x.row.def.label)} — ${t(x.name)}`,
    alt: q, // a busca casou pelo verbo + nome: o texto digitado é o melhor rótulo alternativo
    kind: 'action', icon: x.row.def.icon, weight: 14 + x.score,
    hint: x.row.lock ? `🔒 ${t(x.row.lock.why)} → ${t(x.row.lock.unlock)}` : x.row.cost ? `≈ ${$(x.row.cost)}` : undefined,
    run: () => openQuick31(s, x.target, x.row.def.id),
  }));
}

// R31 onda 1 (integração A × O): favoritos e metas ganham um botão na barra do topo.
TOPBAR31.push((g) => (g ? h('button', { class: 'btn small ghost', title: t(l('Favoritos e metas', 'Favourites and goals')), 'aria-label': t(l('Favoritos e metas', 'Favourites and goals')), onclick: () => openMine31(g as GameState) }, '☆') : null));
