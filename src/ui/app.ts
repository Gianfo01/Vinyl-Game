// Layout principal: barra superior, 10 áreas + Diário, avanço, paleta de comandos, fim de run.

import { ENDINGS, HQ_LEVELS, LEGACY_DIMS } from '../data/rules';
import { l, type L } from '../data/world';
import { S, t, type Lang } from '../i18n/strings';
import { endingScores, legacyTotal } from '../sim/legacy';
import { advance } from '../sim/tick';
import { advanceUntil, digestEnd, digestStart, type Digest } from '../sim/sys/pacing8';
import { openUntilConfig, showDigest, stopSummary } from './sys/pacing8';
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
import { centralPanel } from './panels/central';
import { worldPanel } from './panels/world';
import { businessPanel } from './panels/business';
import { studioHub } from './panels/studio';
import { auctionsSection, contestsSection, demosSection, scoutsSection } from './panels/discovery';
import { pressSection } from './panels/media2';
import { compareActs } from './compare';
import { restartTutorial, tutorialCard } from './tutorial';
import { ic, registerIconRenderer, registerPortrait, tabs } from './vis';
import { ICON_NAMES, icon as pxIcon, type IconName } from './pixel/icons';
import { portraitDataUrl } from './pixel/avatar';
import { copyText, exportSaveText, importSaveText } from './store';
import { applyRealNames } from '../data/realnames';
import { EXTRA_AREAS, extraSections, mergeTabs, showPendingCutscene } from './registry';
import { openLabelStory } from './sys/story12';
import './sys';
import { defaultHome, type NavGroup } from './careernav13';
import { careers } from '../sim/sys/careers12';
import { getTab, setTab } from './vis';
import { alias14, ALIAS14, groupOf14, navGroups14, type NavGroup14 } from './careernav14';
import { themeButton } from './sys/theme14';

registerIconRenderer((name, scale = 1) => ((ICON_NAMES as readonly string[]).includes(name) ? pxIcon(name as IconName, scale) : null));
registerPortrait((p, size) => {
  const img = document.createElement('img');
  img.src = portraitDataUrl(p, 64, store.game?.year ?? 1960);
  img.width = size;
  img.height = size;
  img.alt = p.name;
  img.title = p.name;
  img.className = 'px';
  return img;
});

/** Leitor de tela: resume o briefing após avançar. */
function announce(msg: string): void {
  const el = document.getElementById('sr-live');
  if (el) el.textContent = msg;
}

const AREAS: { id: Area; label: keyof typeof S; icon: string; key: string }[] = [
  { id: 'desk', label: 'areaDesk', icon: 'calendar', key: '1' },
  { id: 'plan', label: 'areaPlan', icon: 'clock', key: 'c' },
  { id: 'hq', label: 'areaHq', icon: 'house', key: '2' },
  { id: 'charts', label: 'areaCharts', icon: 'chart-up', key: '3' },
  { id: 'artists', label: 'areaArtists', icon: 'guitar', key: '4' },
  { id: 'market', label: 'areaMarket', icon: 'fans', key: '5' },
  { id: 'media', label: 'areaMedia', icon: 'radio', key: '6' },
  { id: 'catalog', label: 'areaCatalog', icon: 'disc', key: '7' },
  { id: 'creation', label: 'areaCreation', icon: 'note', key: '8' },
  { id: 'studio', label: 'areaStudio', icon: 'mic', key: 's' },
  { id: 'releases', label: 'areaReleases', icon: 'cd', key: 'u' },
  { id: 'shows', label: 'areaShows', icon: 'tour-bus', key: '9' },
  { id: 'world', label: 'areaWorld', icon: 'globe', key: 'w' },
  { id: 'business', label: 'areaBusiness', icon: 'bank', key: 'b' },
  { id: 'finance', label: 'areaFinance', icon: 'money', key: 'z' },
  { id: 'company', label: 'areaCompany', icon: 'contract', key: '0' },
  { id: 'diary', label: 'areaDiary', icon: 'newspaper', key: 'd' },
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
  // rodada 13: sem área escolhida, abre a casa da carreira principal
  if (!store.area || store.area === 'desk') { const hm = defaultHome(careers(store.game!).active); if (hm.tab) setTab(hm.tab[0], hm.tab[1]); store.area = hm.area; }
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
  const area = [...AREAS, ...EXTRA_AREAS].find((a) => a.key === e.key.toLowerCase());
  if (area && !e.ctrlKey && !e.metaKey && !e.altKey) go(area.id);
}

function doAdvance(mode: 'week' | 'month' | 'quarter' | 'event' | 'until'): void {
  const g = store.game;
  if (!g) return;
  if (g.ended && !g.flags.sandbox) return endScreen();
  if (!g.config.ironman) store.undoSnapshot = JSON.stringify(g);
  const before = g.notifications.length;
  const noteWeek = g.week;
  // rodada 8: avanços longos terminam num resumo agrupado em vez de uma chuva de avisos
  let digest: { d: Digest; why?: L } | null = null;
  let res: { stopReason?: L } = {};
  if (mode === 'until') {
    const u = advanceUntil(g);
    digest = { d: u.digest, why: u.reason };
  } else if (mode === 'quarter' || mode === 'event') {
    const snap = digestStart(g);
    const r0 = advance(g, mode);
    res = r0;
    digest = { d: digestEnd(g, snap, r0.months), why: r0.stopReason };
  } else res = advance(g, mode);
  if (!digest) {
    const fresh = g.notifications.filter((n) => n.week > noteWeek).slice(-3);
    for (const n of fresh) toast(t(n.text), n.kind);
  }
  if (res.stopReason && mode !== 'month' && !digest) toast(`⏸ ${t(res.stopReason)}`, 'event');
  announce(g.briefing.map((n) => t(n.text)).join('. '));
  void before;
  void saveGame('auto');
  if (g.ended && !g.flags.sandbox) {
    render();
    endScreen();
    return;
  }
  render();
  if (digest) showDigest(g, digest.d, digest.why, () => showPendingCutscene(g, render, store.prefs.cutscenes === false));
  else showPendingCutscene(g, render, store.prefs.cutscenes === false);
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
      h('span', { class: 'btn-split' },
        h('button', { class: 'btn ghost small', title: stopSummary(g), onclick: () => doAdvance('until') }, '⏭ ' + t(l('Até…', 'Until…'))),
        h('button', { class: 'btn ghost small', title: t(l('Critérios de parada', 'Stop criteria')), 'aria-label': t(l('Critérios de parada', 'Stop criteria')), onclick: () => openUntilConfig(g, () => doAdvance('until')) }, '▾')),
      h('button', { class: 'btn ghost small', onclick: () => doAdvance('quarter') }, '⏩ ' + t(S.advanceQuarter)),
      h('button', { class: 'btn small', title: t(l('Avança até o próximo fechamento semanal (dias de turnê, estúdio e crise)', 'Advance to the next weekly close (tour, studio and crisis days)')), onclick: () => doAdvance('week') }, '▷ ' + t(l('Semana', 'Week')), g.clock.opened ? h('small', null, ` ${g.clock.dayInMonth}d`) : null),
      h('button', { class: 'btn primary', title: 'Ctrl+Enter', onclick: () => doAdvance('month') }, '▶ ' + t(S.advanceMonth), g.decisions.length ? h('span', { class: 'badge' }, g.decisions.length) : null),
      themeButton(() => render()),
      h('button', { class: 'icon', 'aria-label': t(S.settings), onclick: settings }, '⚙'),
    ),
  );
}

/** Menus agrupados (rodada 7): 6 grupos no lugar de ~20 áreas soltas; o grupo atual abre suas áreas. */
const GROUPS: { id: string; label: { pt: string; en: string }; icon: string; areas: string[] }[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['cockpit', 'plan', 'goals', 'diary'] },
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth', 'night14'] },
];
const lastInGroup: Record<string, string> = {};
/** Rodada 14: cada carreira ativa é um grupo de topo; as inativas ficam em "Outras atividades". */
const groups = (): NavGroup14[] => navGroups14(store.game ? careers(store.game).active : ['label'], GROUPS);

interface NavItem { id: string; label: string; icon: string; key: string; badge?: number }

function navItems(): NavItem[] {
  const g = store.game!;
  return [
    ...AREAS.map((a) => ({ id: a.id as string, label: t(S[a.label]), icon: a.icon, key: a.key, badge: a.id === 'desk' && g.decisions.length ? g.decisions.length : undefined })),
    ...EXTRA_AREAS.filter((a) => !a.visible || a.visible(g)).map((a) => ({ id: a.id, label: t(a.label), icon: a.icon, key: a.key, badge: a.badge?.(g) })),
  ];
}

export function groupOf(area: string): NavGroup14 {
  return groupOf14(groups(), area, getTab);
}

function groupItems(gr: NavGroup): NavItem[] {
  const all = navItems();
  const listed = new Set(groups().flatMap((x) => x.areas));
  const items = gr.areas.map((id) => all.find((x) => x.id === id)).filter((x): x is NavItem => !!x);
  // áreas registradas que não estão em nenhum grupo caem em Início
  if (gr.id === 'home') items.push(...all.filter((x) => !listed.has(x.id) && !ALIAS14[x.id]));
  return items;
}

function go(id: string): void {
  id = alias14(id);
  store.area = id;
  lastInGroup[groupOf(id).id] = id;
  render();
}

function nav(): HTMLElement {
  const cur = groupOf(store.area);
  return h('nav', { class: 'nav grouped', 'aria-label': 'menu' }, groups().map((gr) => {
    const items = groupItems(gr);
    const badge = items.reduce((t0, x) => t0 + (x.badge ?? 0), 0);
    const open = gr.id === cur.id;
    // rodada 14: casa da carreira (com aba, ex.: Empreendimentos › Festival) e títulos por carreira em "Outras atividades"
    const tabbed = (id: string) => gr.home?.tab && gr.home.area === id;
    const enter = (id: string) => { if (tabbed(id)) setTab(gr.home!.tab![0], gr.home!.tab![1]); go(id); };
    const last = lastInGroup[gr.id] && items.some((x) => x.id === lastInGroup[gr.id]) ? lastInGroup[gr.id] : null;
    const btn = (a: NavItem) => { const on = store.area === a.id && (!tabbed(a.id) || open); const lbl = tabbed(a.id) ? t(gr.label) : a.label;
      return h('button', { class: on ? 'on' : '', 'aria-current': on ? 'page' : undefined, title: `${lbl} (${a.key.toUpperCase()})`, onclick: () => enter(a.id) },
        h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(a.icon)), h('span', { class: 'lbl' }, lbl), a.badge ? h('span', { class: 'badge' }, a.badge) : null); };
    const secs = gr.sections?.map((sc) => [sc, items.filter((x) => sc.areas.includes(x.id))] as const).filter(([, xs]) => xs.length).map(([sc, xs]) => [h('small', { class: 'nav-sec' }, t(sc.label)), ...xs.map(btn)]);
    return h('div', { class: `nav-group ${open ? 'open' : ''} ${gr.career ? 'nav-career' : ''} ${gr.other ? 'nav-other' : ''}`, 'data-career': gr.career },
      h('button', { class: `nav-head ${open ? 'on' : ''}`, 'aria-expanded': open ? 'true' : 'false', onclick: () => enter(last ?? (gr.home && items.some((x) => x.id === gr.home!.area) ? gr.home.area : items[0]?.id ?? 'cockpit')) },
        h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(gr.icon)), h('span', { class: 'lbl' }, t(gr.label)), badge ? h('span', { class: 'badge' }, badge) : null),
      open && items.length > 1 ? h('div', { class: 'nav-sub' }, secs ?? items.map(btn)) : null,
    );
  }));
}

/** Faixa de sub-áreas no topo do painel (útil no celular, onde o menu lateral vira barra). */
function subnav(): HTMLElement | null {
  const items = groupItems(groupOf(store.area));
  if (items.length < 2) return null;
  return h('div', { class: 'subnav', role: 'tablist' }, items.map((a) => h('button', { role: 'tab', 'aria-selected': store.area === a.id ? 'true' : 'false', class: store.area === a.id ? 'on' : '', onclick: () => go(a.id) }, ic(a.icon), ' ', a.label, a.badge ? h('span', { class: 'badge' }, a.badge) : null)));
}

function panel(): HTMLElement {
  const g = store.game!;
  const extra = EXTRA_AREAS.find((a) => a.id === store.area);
  if (extra) { stopHq(); return extra.render(g); }
  const el = basePanel(g);
  const more = store.area === 'charts' || store.area === 'world' ? null : extraSections(store.area, g);
  if (more) el.appendChild(more);
  return el;
}

function basePanel(g: NonNullable<typeof store.game>): HTMLElement {
  if (store.area !== 'hq') stopHq();
  switch (store.area) {
    case 'hq': return hqPanel(g);
    case 'plan': return centralPanel(g);
    case 'charts': return h('div', { class: 'hub' }, tabs('chartsHub', mergeTabs([
      { id: 'global', label: t(l('Parada mundial', 'World chart')), icon: 'chart-up', render: () => chartsPanel(g) },
      { id: 'more', label: t(l('Rádio e outras paradas', 'Radio and other charts')), icon: 'radio', render: () => extraSections('charts', g) ?? h('div') },
    ], 'chartsHub', g), render));
    case 'artists': return artistsPanel(g);
    case 'market': return h('div', { class: 'hub' }, tabs('marketHub', mergeTabs([
      { id: 'classic', label: t(l('Radar e pipeline', 'Radar and pipeline')), icon: 'fans', render: () => marketPanel(g) },
      { id: 'discovery', label: t(l('Olheiros, concursos e demos', 'Scouts, contests and demos')), icon: 'trophy', badge: g.demos.filter((d) => !d.heard).length || undefined, render: () => h('div', null, scoutsSection(g), contestsSection(g), demosSection(g)) },
      { id: 'auctions', label: t(l('Leilões', 'Auctions')), icon: 'gavel', badge: g.auctions.filter((a) => a.status === 'open').length || undefined, render: () => auctionsSection(g) },
    ], 'marketHub', g), render));
    case 'media': return h('div', { class: 'hub' }, tabs('mediaHub', mergeTabs([
      { id: 'press', label: t(l('Imprensa e crítica', 'Press and critics')), icon: 'newspaper', render: () => pressSection(g) },
      { id: 'channels', label: t(l('Canais e reputação', 'Channels and reputation')), icon: 'radio', render: () => mediaPanel(g) },
    ], 'mediaHub', g), render));
    case 'catalog': return h('div', { class: 'hub' }, tabs('catalogHub', mergeTabs([
      { id: 'list', label: t(l('Catálogo', 'Catalog')), icon: 'disc', render: () => catalogPanel(g) },
    ], 'catalogHub', g), render));
    case 'creation': return studioHub(g, () => creationPanel(g), 'write');
    case 'studio': return studioHub(g, () => creationPanel(g), 'studio');
    case 'releases': return studioHub(g, () => creationPanel(g), 'release');
    case 'world': return h('div', { class: 'hub' }, tabs('worldHub', mergeTabs([
      { id: 'map', label: t(l('Mapa e cenas', 'Map and scenes')), icon: 'globe', render: () => worldPanel(g) },
      { id: 'history', label: t(l('História, leis e lugares', 'History, laws and places')), icon: 'newspaper', render: () => extraSections('world', g) ?? h('div') },
    ], 'worldHub', g), render));
    case 'business': return businessPanel(g, 'business');
    case 'finance': return businessPanel(g, 'finance');
    case 'shows': return showsPanel(g);
    case 'company': return companyPanel(g);
    case 'diary': return diaryPanel(g);
    default: return deskPanel(g);
  }
}

export function render(): void {
  if (!store.game) return titleScreen(root, startGame);
  store.area = alias14(store.area);
  applyRealNames(!!store.game.config.realNames);
  if (store.prefs.eraSkin !== false) document.documentElement.dataset.era = String(Math.floor(store.game.year / 10) * 10);
  else delete document.documentElement.dataset.era;
  const scroll = document.querySelector('main')?.scrollTop ?? 0;
  root.replaceChildren(
    h('div', { class: 'app' },
      topBar(),
      nav(),
      h('main', { id: 'main', tabindex: '-1' }, subnav(), panel()),
      tutorialCard(store.game, render),
      h('div', { id: 'sr-live', class: 'sr-only', 'aria-live': 'polite' }),
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
    h('label', null, t(l('Modo para daltonismo', 'Colorblind mode')), select(p.colorblind ?? 'none', [{ value: 'none' as const, label: t(l('Desligado', 'Off')) }, { value: 'deutan' as const, label: t(l('Deuteranopia (verde)', 'Deuteranopia (green)')) }, { value: 'protan' as const, label: t(l('Protanopia (vermelho)', 'Protanopia (red)')) }, { value: 'tritan' as const, label: t(l('Tritanopia (azul)', 'Tritanopia (blue)')) }], (v) => { p.colorblind = v; savePrefs(); })),
    h('button', { class: 'btn small ghost', onclick: () => { if (store.game) { restartTutorial(store.game); close(); render(); } } }, t(l('Rever tutorial', 'Replay tutorial'))),
    h('label', null, t(l('Mini-jogos', 'Mini-games')), select(p.minigames ?? 'play', [{ value: 'play' as const, label: t(l('Jogar quando aparecerem', 'Play when they come up')) }, { value: 'auto' as const, label: t(l('Resolver automaticamente', 'Resolve automatically')) }], (v) => { p.minigames = v; savePrefs(); })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.cutscenes !== false, onchange: (e: Event) => { p.cutscenes = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Mostrar cenas (premiações, críticas, entrevistas)', 'Show scenes (awards, reviews, interviews)'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.eraSkin !== false, onchange: (e: Event) => { p.eraSkin = (e.target as HTMLInputElement).checked; savePrefs(); render(); } }), t(l('Interface com o visual da época', 'Era-themed interface'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.contrast, onchange: (e: Event) => { p.contrast = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.contrast)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.reducedMotion, onchange: (e: Event) => { p.reducedMotion = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.reducedMotion)),
    h('hr'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => { const ok = await saveGame(`slot-${store.game?.signature}`); toast(ok ? t(S.saved) : 'Erro', ok ? 'good' : 'bad'); } }, t(S.save)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveTextDialog(); } }, t(S.exportSave)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveTextDialog(); } }, t(l('Copiar / colar save', 'Copy / paste save'))),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveGame('auto'); store.game = null; titleScreen(root, startGame); } }, t(l('Menu inicial', 'Main menu'))),
    ),
    h('p', { class: 'muted small' }, t(l('Atalhos: 1–0 e D trocam de área · Ctrl+Enter avança · Ctrl+K abre a paleta de comandos.', 'Shortcuts: 1–0 and D switch area · Ctrl+Enter advances · Ctrl+K opens the command palette.'))),
  );
  close = modal(t(S.settings), body);
}

/** Save como texto: funciona mesmo onde downloads são bloqueados (ex.: link publicado). */
async function saveTextDialog(): Promise<void> {
  const text = await exportSaveText();
  const area = h('textarea', { class: 'save-text', rows: 6, readonly: true, 'aria-label': t(l('Save atual em texto', 'Current save as text')) }, text) as HTMLTextAreaElement;
  const paste = h('textarea', { class: 'save-text', rows: 4, placeholder: t(l('Cole aqui um save copiado antes', 'Paste a previously copied save here')), 'aria-label': t(l('Colar save', 'Paste save')) }) as HTMLTextAreaElement;
  let close = () => {};
  const body = h('div', { class: 'form' },
    h('p', { class: 'muted small' }, t(l('Copie o texto e guarde onde quiser (nota, e-mail). Para continuar depois, cole-o abaixo.', 'Copy the text and keep it anywhere (a note, an email). To continue later, paste it below.'))),
    area,
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { const ok = exportSave(); toast(ok ? t(l('Download iniciado. Se nada baixar, use Copiar save.', 'Download started. If nothing downloads, use Copy save.')) : t(l('Download bloqueado: use Copiar save.', 'Download blocked: use Copy save.')), ok ? 'good' : 'bad'); } }, t(l('Baixar arquivo', 'Download file')))),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: async () => { const ok = await copyText(text); if (!ok) { area.focus(); area.select(); } toast(ok ? t(l('Save copiado.', 'Save copied.')) : t(l('Selecionei o texto: use Ctrl+C.', 'Text selected: press Ctrl+C.')), 'good'); } }, t(l('Copiar save', 'Copy save'))), h('small', { class: 'muted' }, `${Math.round(text.length / 1024)} KB`)),
    h('hr'),
    paste,
    h('button', { class: 'btn primary', onclick: async () => { try { store.game = await importSaveText(paste.value); close(); render(); toast(t(l('Save carregado.', 'Save loaded.')), 'good'); } catch { toast(t(l('Texto de save inválido.', 'Invalid save text.')), 'bad'); } } }, t(l('Carregar save colado', 'Load pasted save'))),
  );
  close = modal(t(l('Save em texto', 'Save as text')), body);
}

/** Paleta de comandos (GDD §24). */
function palette(): void {
  const g = store.game!;
  type Cmd = { label: string; run: () => void };
  const cmds: Cmd[] = [
    ...AREAS.map((a) => ({ label: `→ ${t(S[a.label])}`, run: () => { store.area = a.id; render(); } })),
    ...EXTRA_AREAS.map((a) => ({ label: `→ ${t(a.label)}`, run: () => { store.area = a.id; render(); } })),
    { label: `▶ ${t(S.advanceMonth)}`, run: () => doAdvance('month') },
    { label: `⏩ ${t(S.advanceQuarter)}`, run: () => doAdvance('quarter') },
    { label: `⏭ ${t(S.advanceEvent)}`, run: () => doAdvance('event') },
    { label: `⏭ ${t(l('Avançar até algo relevante', 'Advance until something relevant'))}`, run: () => doAdvance('until') },
    { label: `▷ ${t(l('Avançar semana', 'Advance week'))}`, run: () => doAdvance('week') },
    { label: `⚖ ${t(l('Comparar carreiras', 'Compare careers'))}`, run: () => compareActs(g, playerActs(g)) },
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

// rodada 8: aposentadoria sem herdeiros encerra a run fora do avanço do tempo
if (typeof window !== 'undefined') window.addEventListener('vtn-ended', () => { if (store.game?.ended && !store.game.flags.sandbox) { render(); endScreen(); } });

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
      h('button', { class: 'btn', onclick: () => openLabelStory(g) }, t(l('História do selo', 'Label story'))),
      h('button', { class: 'btn', onclick: () => { document.querySelector('.overlay')?.remove(); store.area = 'diary'; render(); } }, t(S.areaDiary)),
      !insolvent ? h('button', { class: 'btn', onclick: () => { g.flags.sandbox = 1; document.querySelector('.overlay')?.remove(); render(); } }, t(S.sandbox)) : null,
      h('button', { class: 'btn primary', onclick: () => { document.querySelector('.overlay')?.remove(); store.game = null; titleScreen(root, startGame); } }, t(S.newGame)),
    ),
  );
  modal(t(S.endTitle), body, { wide: true });
}

export { HQ_LEVELS };
