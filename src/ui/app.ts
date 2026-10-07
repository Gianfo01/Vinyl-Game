// Layout principal: barra superior, 10 áreas + Diário, avanço, paleta de comandos, fim de run.

import { ENDINGS, HQ_LEVELS, LEGACY_DIMS } from '../data/rules';
import { l } from '../data/world';
import { S, t, type Lang } from '../i18n/strings';
import { endingScores, legacyTotal } from '../sim/legacy';
import { advance } from '../sim/tick';
import { playerActs } from '../sim/util';
import { $, dateLabel, inspect, kv, modal, toast } from './common';
import { bar, h, select } from './dom';
import { registerInspect } from './ficha';
import { titleScreen } from './newgame';
import { artistsPanel } from './panels/artists';
import { creationPanel } from './panels/creation';
import { deskPanel } from './panels/desk';
import { marketPanel } from './panels/market';
import { catalogPanel, chartsPanel, companyPanel, diaryPanel, hqPanel, mediaPanel, showsPanel, stopHq } from './panels/misc';
import { applyPrefs, exportSave, migrate, saveGame, savePrefs, store, type Area } from './store';

const AREAS: { id: Area; label: keyof typeof S; icon: string; key: string }[] = [
  { id: 'desk', label: 'areaDesk', icon: '🗂', key: '1' },
  { id: 'hq', label: 'areaHq', icon: '🏠', key: '2' },
  { id: 'charts', label: 'areaCharts', icon: '📈', key: '3' },
  { id: 'artists', label: 'areaArtists', icon: '🎸', key: '4' },
  { id: 'market', label: 'areaMarket', icon: '🔎', key: '5' },
  { id: 'media', label: 'areaMedia', icon: '📻', key: '6' },
  { id: 'catalog', label: 'areaCatalog', icon: '💿', key: '7' },
  { id: 'creation', label: 'areaCreation', icon: '🎚', key: '8' },
  { id: 'shows', label: 'areaShows', icon: '🎤', key: '9' },
  { id: 'company', label: 'areaCompany', icon: '🏢', key: '0' },
  { id: 'diary', label: 'areaDiary', icon: '📖', key: 'd' },
];

let root: HTMLElement;

export function boot(el: HTMLElement): void {
  root = el;
  applyPrefs();
  registerInspect();
  store.rerender = render;
  store.toast = toast;
  window.addEventListener('keydown', onKey);
  titleScreen(root, startGame);
}

function startGame(): void {
  store.area = store.area || 'desk';
  render();
  void saveGame('auto');
}

function onKey(e: KeyboardEvent): void {
  if (!store.game) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (document.querySelector('.overlay')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    palette();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    doAdvance('month');
    return;
  }
  const area = AREAS.find((a) => a.key === e.key.toLowerCase());
  if (area && !e.ctrlKey && !e.metaKey && !e.altKey) {
    store.area = area.id;
    render();
  }
}

function doAdvance(mode: 'month' | 'quarter' | 'event'): void {
  const g = store.game;
  if (!g) return;
  if (g.ended && !g.flags.sandbox) return endScreen();
  if (!g.config.ironman) store.undoSnapshot = JSON.stringify(g);
  const before = g.notifications.length;
  const noteWeek = g.week;
  const res = advance(g, mode);
  const fresh = g.notifications.filter((n) => n.week > noteWeek).slice(-3);
  for (const n of fresh) toast(t(n.text), n.kind);
  if (res.stopReason && mode !== 'month') toast(`⏸ ${t(res.stopReason)}`, 'event');
  void before;
  void saveGame('auto');
  if (g.ended && !g.flags.sandbox) {
    render();
    endScreen();
    return;
  }
  render();
}

function undo(): void {
  if (!store.undoSnapshot || !store.game || store.game.config.ironman) return;
  store.game = migrate(JSON.parse(store.undoSnapshot));
  store.undoSnapshot = null;
  toast(t(l('Mês desfeito.', 'Month undone.')), 'info');
  render();
}

function topBar(): HTMLElement {
  const g = store.game!;
  const net = Object.values(g.lastMonthLedger).reduce((a, b) => a + b, 0);
  const rep = g.player.reputation;
  return h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, h('span', { class: 'disc-sm', 'aria-hidden': 'true' }), h('b', null, g.config.companyName)),
    h('div', { class: 'date' }, h('b', null, dateLabel(g)), h('small', { class: 'muted' }, ` · ${t(S.week)} ${g.week} · Run ${g.signature}`)),
    h('div', { class: 'money' }, h('span', { class: 'muted' }, `${t(S.cash)} `), h('b', { class: g.player.cash < 0 ? 'bad' : '' }, $(g.player.cash)),
      h('small', { class: net >= 0 ? 'good' : 'bad' }, ` (${net >= 0 ? '+' : ''}${$(net)})`)),
    h('div', { class: 'rep', title: t(S.reputation) }, '★ ', Math.round((rep.artistic + rep.commercial + rep.artists + rep.institutional) / 4)),
    h('div', { class: 'advance' },
      store.undoSnapshot && !g.config.ironman ? h('button', { class: 'btn ghost small', onclick: undo }, '↶ ' + t(S.undo)) : null,
      h('button', { class: 'btn ghost small', title: t(S.advanceEvent), onclick: () => doAdvance('event') }, '⏭ ' + t(S.advanceEvent)),
      h('button', { class: 'btn ghost small', onclick: () => doAdvance('quarter') }, '⏩ ' + t(S.advanceQuarter)),
      h('button', { class: 'btn primary', title: 'Ctrl+Enter', onclick: () => doAdvance('month') }, '▶ ' + t(S.advanceMonth), g.decisions.length ? h('span', { class: 'badge' }, g.decisions.length) : null),
      h('button', { class: 'icon', 'aria-label': t(S.settings), onclick: settings }, '⚙'),
    ),
  );
}

function nav(): HTMLElement {
  const g = store.game!;
  return h('nav', { class: 'nav', 'aria-label': 'áreas' }, AREAS.map((a) =>
    h('button', { class: store.area === a.id ? 'on' : '', 'aria-current': store.area === a.id ? 'page' : undefined, title: `${t(S[a.label])} (${a.key.toUpperCase()})`, onclick: () => { store.area = a.id; render(); } },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, a.icon), h('span', { class: 'lbl' }, t(S[a.label])),
      a.id === 'desk' && g.decisions.length ? h('span', { class: 'badge' }, g.decisions.length) : null,
    )));
}

function panel(): HTMLElement {
  const g = store.game!;
  if (store.area !== 'hq') stopHq();
  switch (store.area) {
    case 'hq': return hqPanel(g);
    case 'charts': return chartsPanel(g);
    case 'artists': return artistsPanel(g);
    case 'market': return marketPanel(g);
    case 'media': return mediaPanel(g);
    case 'catalog': return catalogPanel(g);
    case 'creation': return creationPanel(g);
    case 'shows': return showsPanel(g);
    case 'company': return companyPanel(g);
    case 'diary': return diaryPanel(g);
    default: return deskPanel(g);
  }
}

export function render(): void {
  if (!store.game) return titleScreen(root, startGame);
  const scroll = document.querySelector('main')?.scrollTop ?? 0;
  root.replaceChildren(
    h('div', { class: 'app' },
      topBar(),
      nav(),
      h('main', { id: 'main', tabindex: '-1' }, panel()),
    ),
  );
  const main = document.querySelector('main');
  if (main) main.scrollTop = scroll;
}

function settings(): void {
  const p = store.prefs;
  let close = () => {};
  const body = h('div', { class: 'form' },
    h('label', null, t(S.language), select(p.lang, [{ value: 'pt' as Lang, label: 'Português (BR)' }, { value: 'en' as Lang, label: 'English' }], (v) => { p.lang = v; savePrefs(); close(); render(); settings(); })),
    h('label', null, `${t(S.textSize)}: ${p.textScale}%`, h('input', { type: 'range', min: 90, max: 130, step: 5, value: p.textScale, oninput: (e: Event) => { p.textScale = Number((e.target as HTMLInputElement).value); savePrefs(); } })),
    h('label', null, t(S.theme), select(p.theme, [{ value: 'auto', label: t(S.themeAuto) }, { value: 'light', label: t(S.themeLight) }, { value: 'dark', label: t(S.themeDark) }] as { value: typeof p.theme; label: string }[], (v) => { p.theme = v; savePrefs(); })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.contrast, onchange: (e: Event) => { p.contrast = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.contrast)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.reducedMotion, onchange: (e: Event) => { p.reducedMotion = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.reducedMotion)),
    h('hr'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => { const ok = await saveGame(`slot-${store.game?.signature}`); toast(ok ? t(S.saved) : 'Erro', ok ? 'good' : 'bad'); } }, t(S.save)),
      h('button', { class: 'btn ghost', onclick: () => exportSave() }, t(S.exportSave)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveGame('auto'); store.game = null; titleScreen(root, startGame); } }, t(l('Menu inicial', 'Main menu'))),
    ),
    h('p', { class: 'muted small' }, t(l('Atalhos: 1–0 e D trocam de área · Ctrl+Enter avança · Ctrl+K abre a paleta de comandos.', 'Shortcuts: 1–0 and D switch area · Ctrl+Enter advances · Ctrl+K opens the command palette.'))),
  );
  close = modal(t(S.settings), body);
}

/** Paleta de comandos (GDD §24). */
function palette(): void {
  const g = store.game!;
  type Cmd = { label: string; run: () => void };
  const cmds: Cmd[] = [
    ...AREAS.map((a) => ({ label: `→ ${t(S[a.label])}`, run: () => { store.area = a.id; render(); } })),
    { label: `▶ ${t(S.advanceMonth)}`, run: () => doAdvance('month') },
    { label: `⏩ ${t(S.advanceQuarter)}`, run: () => doAdvance('quarter') },
    { label: `⏭ ${t(S.advanceEvent)}`, run: () => doAdvance('event') },
    ...playerActs(g).map((id) => ({ label: `🎸 ${g.acts[id].name}`, run: () => inspect.act(id) })),
    ...Object.values(g.knowledge).filter((k) => g.acts[k.actId] && g.acts[k.actId].owner !== 'player').map((k) => ({ label: `🔎 ${g.acts[k.actId].name}`, run: () => inspect.act(k.actId) })),
    ...Object.values(g.labels).filter((x) => x.active).map((x) => ({ label: `🏢 ${x.name}`, run: () => inspect.label(x.id) })),
  ];
  const list = h('ul', { class: 'palette-list' });
  let close = () => {};
  const input = h('input', { type: 'search', placeholder: t(l('Buscar área, ato, selo, ação…', 'Search area, act, label, action…')), oninput: () => fill(), onkeydown: (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const first = list.querySelector('button') as HTMLButtonElement | null;
      first?.click();
    }
  } });
  const fill = () => {
    const q = input.value.toLowerCase();
    list.replaceChildren(...cmds.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 14).map((c) => h('li', null, h('button', { class: 'link', onclick: () => { close(); c.run(); } }, c.label))));
  };
  fill();
  close = modal(t(l('Paleta de comandos', 'Command palette')), h('div', null, input, list));
  input.focus();
}

function endScreen(): void {
  const g = store.game!;
  const end = g.ended!;
  const def = ENDINGS.find((e) => e.id === end.ending);
  const insolvent = end.reason === 'insolvency';
  const top = endingScores(g).slice(0, 3);
  const body = h('div', { class: 'ending' },
    h('div', { class: 'disc big', 'aria-hidden': 'true' }),
    h('h3', null, insolvent && !def ? t(S.insolvencyTitle) : t(def?.name)),
    h('p', { class: 'lead' }, insolvent && !def ? t(S.insolvencyText) : t(def?.text)),
    h('p', { class: 'muted' }, `${g.config.companyName} · ${g.config.startYear}–${end.year} · Run ${g.signature}`),
    h('h4', null, `${t(S.legacy)}: ${legacyTotal(g)}`),
    LEGACY_DIMS.map((d) => kv(t(d.name), h('span', null, Math.round(g.player.legacy[d.id]), ' ', bar(g.player.legacy[d.id])))),
    !insolvent ? h('p', { class: 'small muted' }, t(l('Finais mais próximos: ', 'Closest endings: ')), top.map((x) => t(ENDINGS.find((e) => e.id === x.id)?.name)).join(' · ')) : null,
    h('div', { class: 'row center' },
      h('button', { class: 'btn', onclick: () => { document.querySelector('.overlay')?.remove(); store.area = 'diary'; render(); } }, t(S.areaDiary)),
      !insolvent ? h('button', { class: 'btn', onclick: () => { g.flags.sandbox = 1; document.querySelector('.overlay')?.remove(); render(); } }, t(S.sandbox)) : null,
      h('button', { class: 'btn primary', onclick: () => { document.querySelector('.overlay')?.remove(); store.game = null; titleScreen(root, startGame); } }, t(S.newGame)),
    ),
  );
  modal(t(S.endTitle), body, { wide: true });
}

export { HQ_LEVELS };
