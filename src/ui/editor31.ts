// R31 · onda 1 (EDT) — EDITOR DENTRO DA PARTIDA (interface). Só aparece com Opções › "Modo editor (testes)" ou
// Ctrl+Shift+E; aí surge a área "Editor" (registerArea). Nenhuma outra tela ganha botão de editar.
// A tela é genérica: lista o registro de sim/r31/editor.ts por área (editáveis e executáveis) — sistema novo que
// registra lá aparece aqui sem mexer neste arquivo. Pessoas, atos, selos, relíquias e gêneros têm um seletor de alvo.
//
// Ponto de entrada para o menu (agente A): `openEditor31()` (abre a área) e `editorMode31()` (está ligado?).

import { GENRES, l, type L } from '../data/world';
import { t } from '../i18n/strings';
import {
  applyEdit, edit31, editables, editorOn31, genres31, isEdited31, registerRunnable, relicName31, runEdit, runnables, searchActs31,
  searchPeople31, setEditorOn, targetName, type EditArea, type EditTarget, type Editable, type Runnable, type EditVal,
} from '../sim/r31/editor';
import { relics, RELIC_ST } from '../sim/sys/relics9';
import { advanceMonth } from '../sim/tick';
import type { GameState } from '../sim/types';
import { fmtL } from '../sim/util';
import { rerender, toast } from './common';
import { h } from './dom';
import { registerArea, registerSection } from './registry';
import { NAVEXTRA31 } from './ps/menu31ui';
import { store } from './store';
import './editor31.css';

export const EDITOR_AREA31 = 'editor31';
const MODE_KEY = 'masters31.editorMode';

/** Modo editor (preferência deste navegador, fora do save). */
export function editorMode31(): boolean { try { return localStorage.getItem(MODE_KEY) === '1'; } catch { return false; } }
export function setEditorMode31(on: boolean): void {
  try { if (on) localStorage.setItem(MODE_KEY, '1'); else localStorage.removeItem(MODE_KEY); } catch { /* sem armazenamento: só nesta sessão */ }
  MODE.on = on;
  if (store.game) setEditorOn(store.game, on);
}
const MODE = { on: false };
const modeOn = (): boolean => MODE.on || editorMode31();

/** Abre o editor (liga o modo se preciso). */
export function openEditor31(): void {
  if (!store.game) return;
  if (!modeOn()) setEditorMode31(true);
  setEditorOn(store.game, true);
  store.area = EDITOR_AREA31;
  rerender();
}

/** Linha das Opções: "Modo editor (testes)". */
export function editorModeSetting31(): HTMLElement {
  return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: modeOn(), onchange: (e: Event) => { setEditorMode31((e.target as HTMLInputElement).checked); rerender(); } }),
    ' ', t(l('Modo editor (testes): mostra o item "Editor" no menu (Ctrl+Shift+E). A partida editada fica marcada e não conta para conquistas.', 'Editor mode (testing): shows the "Editor" menu item (Ctrl+Shift+E). An edited game is flagged and does not count for achievements.')));
}

if (typeof window !== 'undefined') window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key.toLowerCase() !== 'e' || !store.game) return;
  e.preventDefault();
  if (store.area === EDITOR_AREA31) { store.area = 'desk'; rerender(); return; }
  openEditor31();
});

// ---------------------------------------------------------------- abas

const AREAS: { id: EditArea; label: L }[] = [
  { id: 'money', label: l('Dinheiro', 'Money') }, { id: 'people', label: l('Pessoas', 'People') }, { id: 'companies', label: l('Empresas', 'Companies') },
  { id: 'careers', label: l('Carreiras e trapaças', 'Careers and cheats') }, { id: 'items', label: l('Itens e relíquias', 'Items and relics') },
  { id: 'scenes', label: l('Cenas e eventos', 'Scenes and events') }, { id: 'world', label: l('Mundo', 'World') }, { id: 'tools', label: l('Ferramentas', 'Tools') },
  { id: 'log', label: l('Registro de edições', 'Edit log') },
];
const UI = { tab: 'money' as string, q: '', person: '' as string, act: '' as string, label: '' as string, genre: '' as string };

const done = (r: { ok: boolean; text: L }) => { toast(t(r.text), r.ok ? 'good' : 'bad'); if (r.ok) rerender(); };
const money = (c: number) => `$ ${Math.round(c / 100).toLocaleString(store.prefs.lang === 'en' ? 'en-US' : 'pt-BR')}`;

function editRow(s: GameState, e: Editable, target?: string): HTMLElement | null {
  if (e.when && !e.when(s, target)) return null;
  const cur = e.get(s, target);
  let input: HTMLInputElement | HTMLSelectElement;
  if (e.kind === 'bool') {
    input = h('input', { type: 'checkbox', checked: !!cur, 'aria-label': t(e.label), onchange: () => done(applyEdit(s, e.id, (input as HTMLInputElement).checked, target)) }) as HTMLInputElement;
    return h('div', { class: 'ed31-row' }, h('label', { class: 'check' }, input, ' ', t(e.label)), e.help ? h('small', { class: 'muted' }, t(e.help)) : null, e.raw ? h('small', { class: 'muted ed31-raw' }, t(l('edição crua', 'raw edit'))) : null);
  }
  if (e.kind === 'select') {
    input = h('select', { 'aria-label': t(e.label) }, (e.options?.(s) ?? []).map((o) => h('option', { value: o.value, selected: o.value === cur }, t(o.label)))) as HTMLSelectElement;
  } else {
    const isMoney = e.kind === 'money';
    input = h('input', { type: e.kind === 'text' ? 'text' : 'number', value: isMoney ? Math.round(Number(cur) / 100) : cur, min: isMoney ? undefined : e.min, max: isMoney ? undefined : e.max, step: isMoney ? 100 : e.step ?? 1, 'aria-label': t(e.label) }) as HTMLInputElement;
  }
  const val = (): EditVal => (e.kind === 'money' ? Math.round(Number(input.value) * 100) : e.kind === 'number' ? Number(input.value) : input.value);
  return h('div', { class: 'ed31-row' },
    h('label', null, t(e.label), e.kind === 'money' ? h('small', { class: 'muted' }, ` (${t(l('agora', 'now'))} ${money(Number(cur))})`) : null, ' ', input),
    h('button', { type: 'button', class: 'btn small', onclick: () => done(applyEdit(s, e.id, val(), target)) }, t(l('Aplicar', 'Apply'))),
    e.help ? h('small', { class: 'muted' }, t(e.help)) : null,
    e.raw ? h('small', { class: 'muted ed31-raw' }, t(l('edição crua', 'raw edit'))) : null);
}

function runRow(s: GameState, r: Runnable, target?: string): HTMLElement | null {
  if (r.when && !r.when(s, target)) return null;
  let arg: HTMLInputElement | HTMLSelectElement | null = null;
  if (r.arg?.kind === 'select') arg = h('select', { 'aria-label': t(r.arg.label) }, (r.arg.options?.(s) ?? []).map((o) => h('option', { value: o.value, selected: o.value === r.arg!.def }, t(o.label)))) as HTMLSelectElement;
  else if (r.arg) arg = h('input', { type: r.arg.kind === 'number' ? 'number' : 'text', value: r.arg.def ?? '', 'aria-label': t(r.arg.label) }) as HTMLInputElement;
  return h('div', { class: 'ed31-row' },
    arg ? h('label', null, t(r.arg!.label), ' ', arg) : null,
    h('button', { type: 'button', class: 'btn small', onclick: () => done(runEdit(s, r.id, target, arg ? (r.arg!.kind === 'number' ? Number(arg.value) : arg.value) : undefined)) }, t(r.label)),
    r.help ? h('small', { class: 'muted' }, t(r.help)) : null);
}

/** Tudo o que está registrado para a área (sem alvo) e para um alvo escolhido. */
const block = (s: GameState, area: EditArea, target: EditTarget | null, id?: string): HTMLElement[] =>
  [...editables(area, target).map((e) => editRow(s, e, id)), ...runnables(area, target).map((r) => runRow(s, r, id))].filter((x): x is HTMLElement => !!x);

function pickPeople(s: GameState): HTMLElement {
  const list = h('div', { class: 'ed31-list' });
  const draw = () => {
    const ps = searchPeople31(s, UI.q, 20);
    const as = searchActs31(s, UI.q, 10);
    list.replaceChildren(
      ...ps.map((p) => h('button', { type: 'button', class: `btn small ghost ${UI.person === p.id ? 'ed31-sel' : ''}`, 'aria-pressed': UI.person === p.id ? 'true' : 'false', onclick: () => { UI.person = p.id; UI.act = ''; rerender(); } }, p.name, p.alive ? '' : ' †')),
      ...as.map((a) => h('button', { type: 'button', class: `btn small ghost ${UI.act === a.id ? 'ed31-sel' : ''}`, 'aria-pressed': UI.act === a.id ? 'true' : 'false', onclick: () => { UI.act = a.id; UI.person = ''; rerender(); } }, '♪ ', a.name)),
      ...(UI.q.trim().length >= 2 && !ps.length && !as.length ? [h('small', { class: 'muted' }, t(l('Ninguém com esse nome.', 'Nobody by that name.')))] : []));
  };
  const q = h('input', { type: 'search', value: UI.q, placeholder: t(l('Buscar pessoa ou artista pelo nome…', 'Search a person or act by name…')), 'aria-label': t(l('Buscar pessoa', 'Search person')),
    oninput: (e: Event) => { UI.q = (e.target as HTMLInputElement).value; draw(); } });
  draw();
  const tgt: HTMLElement[] = [];
  if (UI.person && s.persons[UI.person]) {
    tgt.push(h('h4', null, s.persons[UI.person].name), ...block(s, 'people', 'person', UI.person));
    for (const a of Object.values(s.acts).filter((x) => x.members.includes(UI.person))) tgt.push(h('button', { type: 'button', class: 'btn small ghost', onclick: () => { UI.act = a.id; UI.person = ''; rerender(); } }, '♪ ', a.name));
  }
  if (UI.act && s.acts[UI.act]) tgt.push(h('h4', null, '♪ ', s.acts[UI.act].name), ...block(s, 'people', 'act', UI.act));
  return h('div', null, q, list, ...block(s, 'people', null), h('div', { class: 'ed31-target' }, tgt));
}

function pickLabel(s: GameState): HTMLElement {
  const labs = Object.values(s.labels).filter((x) => x.active).sort((a, b) => a.name.localeCompare(b.name));
  if (!labs.some((x) => x.id === UI.label)) UI.label = labs[0]?.id ?? '';
  const sel = h('select', { 'aria-label': t(l('Empresa', 'Company')), onchange: (e: Event) => { UI.label = (e.target as HTMLSelectElement).value; rerender(); } },
    labs.map((x) => h('option', { value: x.id, selected: x.id === UI.label }, `${x.name} · ${x.roster.length} ${t(l('atos', 'acts'))}`)));
  return h('div', null, h('label', null, t(l('Empresa', 'Company')), ' ', sel), ...block(s, 'companies', null), UI.label ? h('div', { class: 'ed31-target' }, ...block(s, 'companies', 'label', UI.label)) : null);
}

function pickRelic(s: GameState): HTMLElement {
  const list = relics(s).list.slice().sort((a, b) => (a.st === 'player' ? 0 : 1) - (b.st === 'player' ? 0 : 1));
  return h('div', null, ...block(s, 'items', null),
    h('div', { class: 'ed31-list ed31-relics' }, list.slice(0, 60).map((rl) => h('div', { class: 'ed31-row' },
      h('span', null, t(relicName31(s, rl.id) ?? rl.n), ' · ', h('small', { class: 'muted' }, t(RELIC_ST[rl.st]))),
      ...block(s, 'items', 'relic', rl.id)))),
    !list.length ? h('p', { class: 'muted small' }, t(l('Ainda não há relíquias nesta partida.', 'No relics in this game yet.'))) : null);
}

function pickGenre(s: GameState): HTMLElement {
  const gs = genres31(s);
  if (!gs.some((g) => g.id === UI.genre)) UI.genre = gs[0]?.id ?? GENRES[0].id;
  const sel = h('select', { 'aria-label': t(l('Gênero', 'Genre')), onchange: (e: Event) => { UI.genre = (e.target as HTMLSelectElement).value; rerender(); } },
    gs.map((g) => h('option', { value: g.id, selected: g.id === UI.genre }, t(g.name))));
  return h('div', null, ...block(s, 'world', null), h('h4', null, t(l('Tendências', 'Trends'))), h('label', null, t(l('Gênero', 'Genre')), ' ', sel), h('div', { class: 'ed31-target' }, ...block(s, 'world', 'genre', UI.genre)));
}

function logView(s: GameState): HTMLElement {
  const lg = edit31(s).log.slice().reverse();
  return h('div', null, lg.length ? h('ol', { class: 'ed31-log' }, lg.map((x) => h('li', null, `${x.m + 1}/${x.y} · `, t(x.text), x.raw ? h('small', { class: 'muted' }, ` (${t(l('crua', 'raw'))})`) : null)))
    : h('p', { class: 'muted' }, t(l('Nada foi editado nesta partida.', 'Nothing was edited in this game.'))));
}

function page(s: GameState): HTMLElement {
  if (modeOn() && !editorOn31(s)) setEditorOn(s, true);
  const extra = [...new Set([...editables().map((e) => e.area), ...runnables().map((r) => r.area ?? 'tools')])].filter((a) => !AREAS.some((x) => x.id === a));
  const tabs = [...AREAS.slice(0, -1), ...extra.map((a) => ({ id: a, label: l(a, a) })), AREAS[AREAS.length - 1]];
  const body = UI.tab === 'people' ? pickPeople(s) : UI.tab === 'companies' ? pickLabel(s) : UI.tab === 'items' ? pickRelic(s) : UI.tab === 'world' ? pickGenre(s) : UI.tab === 'log' ? logView(s)
    : h('div', null, ...block(s, UI.tab, null));
  return h('div', { class: 'page ed31', 'data-area': EDITOR_AREA31 },
    h('header', { class: 'ed31-head' },
      h('h2', null, t(l('Editor (testes)', 'Editor (testing)'))),
      isEdited31(s) ? h('span', { class: 'pill bad ed31-flag' }, t(l('Partida editada', 'Edited game'))) : h('span', { class: 'pill' }, t(l('Ainda não editada', 'Not edited yet'))),
      s.config.base31 ? h('span', { class: 'pill' }, fmtL(l('Base: {n}', 'Database: {n}'), { n: s.config.base31.name }).pt) : null,
      h('small', { class: 'muted' }, t(l('Cada alteração entra no diário e marca a partida: ela deixa de contar para conquistas e recordes.', 'Every change goes into the diary and flags the game: it no longer counts for achievements and records.')))),
    h('div', { class: 'tabs ed31-tabs', role: 'tablist' }, tabs.map((x) => h('button', { type: 'button', role: 'tab', 'aria-selected': UI.tab === x.id ? 'true' : 'false', class: UI.tab === x.id ? 'on' : '', onclick: () => { UI.tab = x.id; rerender(); } }, t(x.label)))),
    h('section', { class: 'card ed31-body' }, body));
}

registerArea({ id: EDITOR_AREA31, label: l('Editor', 'Editor'), icon: 'gear', key: '', render: page, visible: () => modeOn() });

// selo visível de partida editada (no topo do Hoje/Mesa)
registerSection('desk', { id: 'edited31', order: 1, when: (s) => isEdited31(s), render: (s) => (isEdited31(s)
  ? h('p', { class: 'pill bad ed31-flag' }, t(s.config.base31 ? fmtL(l('Partida editada · base "{n}"', 'Edited game · database "{n}"'), { n: s.config.base31.name }) : l('Partida editada pelo editor', 'Game edited with the editor')))
  : null) });

// ferramentas que dependem do motor de tempo (ficam na interface para não mexer na ordem de carga da simulação)
registerRunnable({
  id: 'tools.advance', area: 'tools', label: l('Avançar meses', 'Advance months'),
  arg: { kind: 'number', label: l('Quantos meses', 'How many months'), def: 3 },
  run: (s, _t, arg) => {
    const n = Math.max(1, Math.min(120, Math.round(Number(arg) || 1)));
    for (let i = 0; i < n && !s.ended; i++) advanceMonth(s);
    return fmtL(l('{n} meses avançados (agora {m}/{y}).', '{n} months advanced (now {m}/{y}).'), { n, m: s.month + 1, y: s.year });
  },
});

export const targetLabel31 = targetName; // reexporta para quem montar atalhos de editor em outras telas

// R31 onda 1 (integração A × EDT): com o modo editor ligado, o menu lateral ganha a entrada "Editor".
NAVEXTRA31.push(() => (modeOn() ? h('button', { class: 'nav-item nav31-extra', 'data-area': EDITOR_AREA31, onclick: () => openEditor31() }, '🛠 ', t(l('Editor', 'Editor'))) : null));
