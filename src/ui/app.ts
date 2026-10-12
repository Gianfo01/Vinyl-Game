// Layout principal: barra superior, 10 áreas + Diário, avanço, paleta de comandos, fim de run.

import { LABEL_LEGACY20 } from '../sim/oblig20';
import { ERA19 } from '../sim/era19';
import { freeCash20 } from '../sim/oblig20';
import { estimateMonthlyBurn } from '../sim/events';
import { ENDINGS, HQ_LEVELS, LEGACY_DIMS } from '../data/rules';
import { l, type L } from '../data/world';
import { S, t, type Lang } from '../i18n/strings';
import { endingScores, legacyTotal } from '../sim/legacy';
import { advance } from '../sim/tick';
import { advanceUntil, digestEnd, digestStart, type Digest } from '../sim/sys/pacing8';
import { openUntilConfig, showDigest, stopSummary } from './sys/pacing8';
import { playerActs } from '../sim/util';
import { $, closeOverlay, dateLabel, inspect, isModal21, kv, modal, toast } from './common';
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
import { afterRender18, helpButton18, paletteCmds18, resetTut18, setNav18, settings18 } from './tutorial18'; // r18 tutorial18
import { paletteCmds20 } from './sys/actmenu20'; // r20 G4: ações do artista no Ctrl+K (registro único)
import { TUTOFF_LABEL19, setTutorials19, tutorialsOff19 } from './tutoff19'; // r19: "Sem tutoriais"
import { ic, registerIconRenderer, registerPortrait, tabs } from './vis';
import { ICON_NAMES, icon as pxIcon, type IconName } from './pixel/icons';
import { portraitDataUrl } from './pixel/avatar';
import { copyText, exportSaveText, importSaveText, IRONMAN_OFF21, unIronman21 } from './store';
import { saveErrText20, saveManagerModal17 } from './saves17';
import { saveChip20 } from './savechip20';
import { noteTurnErr20 } from './savehealth20';
import { tx20 } from '../core/save20';
import { runCard17body } from './newgame17';
import { applyRealNames } from '../data/realnames';
import { AFTER_ADVANCE, EXTRA_AREAS, areaView20, extraSections, extraTabIds, extraTabs, mergeTabs, showPendingCutscene, type TabHost } from './registry';
import { tabIndex21 } from './tabgroups21'; // r21e (2.3.17): subabas indexadas no Ctrl+K sem abrir a página
import { UX19UI } from './hooks19'; // r19 ux19: divulgação progressiva, rodapé do menu e fim de partida
import { openLabelStory } from './sys/story12';
import './sys';
import { defaultHome, type NavGroup } from './careernav13';
import { careers } from '../sim/sys/careers12';
import { setTab } from './vis';
import { alias14, type NavGroup14 } from './careernav14';
import { navGroups16 } from './careernav16';
import { themeButton } from './sys/theme14';
import { crumbBar15, drawer15, initialRoute15, initRouter15, loadTabs15, menuButton15, pageTitle15, palette15, perfNote, saveSoon, saveTabs15, scroll15, shortcutsHelp15, stickyFix15, syncRoute15, type PCmd } from './nav15';
import { tabSnapshot } from './vis';
import { withPlayerActsCache } from '../sim/util';
import { visibleAct } from '../sim/future';
import { openPerson } from './ficha';
import { personRoute16, searchRoute16 } from './route16';
import { ALIAS17, CAREER_PAGE17, ICON17, KEY17, areaOfKey17, careerOfPage17, groupOf17, navGroups17, pushRecent17, resolve17, sectionOf17, togglePin17 } from './nav17';
import { careerPages17 } from './sys/careerpages17';
import { icon17 } from './pixel/icons17';
import { askAdvance19, settings19 } from './sys/advance19'; // r19 B.5
import { advanceToasts20, settings20 } from './sys/ui20'; // r20 G6
import './nav17.css';

registerIconRenderer((name, scale = 1) => ((ICON_NAMES as readonly string[]).includes(name) ? pxIcon(name as IconName, scale) : icon17(name, scale))); // r17: + ícones do menu
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
  // r21 (I-4): a região vive fora de `root` (o render a substituía, apagando o anúncio)
  let el = document.getElementById('sr-live');
  if (!el) { el = h('div', { id: 'sr-live', class: 'sr-only', 'aria-live': 'polite' }); document.body.appendChild(el); }
  el.textContent = '';
  setTimeout(() => { el!.textContent = msg; }, 50);
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
  setNav18(go, (id) => !!store.game && (areaExists(id) || (!!ALIAS17[id] && areaExists(ALIAS17[id][0])))); // r21 (I-5): Ctrl+K/ajuda só navegam para áreas que existem
  // rodada 15: voltar/avançar do navegador, abas lembradas, paleta pelo botão da barra
  for (const [k, v] of Object.entries(loadTabs15())) setTab(k, v);
  initRouter15((r) => { if (!store.game || !areaExists(r.area)) return false; if (r.tab) setTab(r.tab[0], r.tab[1]); store.area = r.area; lastInGroup[groupOf(r.area).id] = r.area; render(); return true; });
  document.addEventListener('vtn15-palette', () => { if (store.game && !document.querySelector('.overlay')) palette(); });
  titleScreen(root, startGame);
}

/** Área existe e está visível agora (atalhos/rotas não abrem áreas de anos futuros). */
const areaExists = (id: string): boolean => navItems().some((x) => x.id === alias14(id));

function startGame(): void {
  // rodada 13: sem área escolhida, abre a casa da carreira principal
  if (!store.area || store.area === 'desk') { const act = careers(store.game!).active; const hm = defaultHome(act); if (hm.tab) setTab(hm.tab[0], hm.tab[1]); store.area = hm.area;
    // r17: quem não tem selo abre na página exclusiva da carreira principal
    if (act.length && !act.includes('label') && CAREER_PAGE17[act[0]]) store.area = CAREER_PAGE17[act[0]].area; }
  // rodada 15: recarregar a página volta à mesma tela (rota no endereço)
  const r0 = initialRoute15();
  navMemo = null;
  if (r0 && areaExists(r0.area)) { store.area = r0.area; if (r0.tab) setTab(r0.tab[0], r0.tab[1]); }
  render();
  void saveGame('auto');
}

function onKey(e: KeyboardEvent): void {
  if (!store.game) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  // r21 (I-1): nada de atalhos globais dentro de menus, diálogos, cenas, tour ou tutorial (Ctrl+Enter avançava o mês por trás de uma cerimônia)
  if ((e.target as HTMLElement)?.closest?.('[role=menu], [role=dialog], .scene-overlay, .am20')) return;
  if (isModal21()) return;
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
  if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '?' || e.key === '/')) {
    e.preventDefault();
    if (e.key === '/') palette();
    else shortcutsHelp15(navItems().map((x) => ({ key: x.key, label: x.label })));
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // r17: { e } trocam de aba na página atual
  if (e.key === '{' || e.key === '}') { cycleTab17(e.key === '}' ? 1 : -1); e.preventDefault(); return; }
  // r17: uma tecla = uma página (KEY17); tecla de página de carreira oculta cai na tela que ela absorve
  const id = areaOfKey17(e.key);
  if (!id) return;
  const c = careerOfPage17(id);
  const tgt = areaExists(id) ? id : c ? CAREER_PAGE17[c].absorbs.find(areaExists) : undefined;
  if (tgt) { e.preventDefault(); go(tgt); }
}

function cycleTab17(d: number): void {
  const wrap = document.querySelector('main [data-tabs]');
  const bs = wrap ? [...wrap.querySelectorAll<HTMLButtonElement>(':scope > .tabs > button')] : [];
  if (bs.length < 2) return;
  const i = bs.findIndex((b) => b.classList.contains('on'));
  bs[(i + d + bs.length) % bs.length].click();
}

// r17: páginas fixadas e recentes (conveniência por navegador; nunca estado de jogo)
const store17 = { pins: [] as string[], recent: [] as string[] };
try { const j = JSON.parse(localStorage.getItem('vtn17.nav') ?? '{}') as Partial<typeof store17>; store17.pins = j.pins ?? []; store17.recent = j.recent ?? []; } catch { /* sem armazenamento */ }
const save17 = () => { try { localStorage.setItem('vtn17.nav', JSON.stringify(store17)); } catch { /* sem armazenamento */ } };
function togglePin(id: string): void { store17.pins = togglePin17(store17.pins, id); save17(); toast(t(store17.pins.includes(id) ? l('Página fixada no topo do menu.', 'Page pinned to the top of the menu.') : l('Página desafixada.', 'Page unpinned.')), 'info'); render(); }

function doAdvance(mode: 'week' | 'month' | 'quarter' | 'event' | 'until', ok19 = false): void {
  const g = store.game;
  if (!g) return;
  if (g.ended && !g.flags.sandbox) return endScreen();
  if (!ok19 && askAdvance19(g, mode, () => doAdvance(mode, true))) return; // r19 B.5: cartões que vão valer o padrão
  // r20 (B27): instantâneo SEMPRE (também no ironman — isto é proteção contra erro de software, não "desfazer");
  // se qualquer gancho lançar no meio do avanço, o jogo meio-mutado é descartado e nada é gravado.
  const snap0 = JSON.stringify(g);
  const prevUndo = store.undoSnapshot;
  if (!g.config.ironman) store.undoSnapshot = snap0;
  const before = g.notifications.length;
  const noteWeek = g.week;
  // rodada 8: avanços longos terminam num resumo agrupado em vez de uma chuva de avisos
  let digest = null as { d: Digest; why?: L } | null;
  let res = {} as { stopReason?: L };
  const tx = tx20(g, () => {
    if (mode === 'until') {
      const u = advanceUntil(g);
      digest = { d: u.digest, why: u.reason };
    } else if (mode === 'quarter' || mode === 'event') {
      const snap = digestStart(g);
      const r0 = advance(g, mode);
      res = r0;
      digest = { d: digestEnd(g, snap, r0.months), why: r0.stopReason };
    } else res = advance(g, mode);
  }, (sn) => migrate(JSON.parse(sn)), snap0);
  if (!tx.ok) {
    store.game = tx.g;
    store.undoSnapshot = prevUndo;
    noteTurnErr20(String((tx.err as Error)?.message ?? tx.err));
    toast(t(l('Erro interno ao avançar: o turno foi revertido inteiro e o último save continua válido. Detalhes em 💾 no topo.', 'Internal error while advancing: the turn was fully rolled back and the last save is still valid. Details in 💾 at the top.')), 'bad');
    render();
    return;
  }
  noteTurnErr20(null);
  if (!digest) {
    // r20 (B23): 3 destaques por severidade + "+N outros" que abre a lista inteira (antes: as 3 últimas por recência)
    advanceToasts20(g.notifications.filter((n) => n.week > noteWeek && !n.fold));
  }
  if (res.stopReason && mode !== 'month' && !digest) toast(`⏸ ${t(res.stopReason)}`, 'event');
  void before;
  saveSoon(() => void saveGame('auto')); // r15: grava depois de pintar (o mês aparece antes)
  if (g.ended && !g.flags.sandbox) {
    render();
    endScreen();
    return;
  }
  render();
  announce(g.briefing.map((n) => t(n.text)).join('. ')); // r21 (I-4): depois do render
  for (const f of AFTER_ADVANCE) f(g); // r18 decide18: resumo do mês
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
  // r21 (UX 2.3.14): caixa livre / total quando há reserva de ofertas; fôlego em meses com "por quê"
  const free = freeCash20(g), reserved = g.player.cash - free;
  const burn = estimateMonthlyBurn(g), run = burn > 0 ? g.player.cash / burn : null;
  return h('header', { class: 'topbar' },
    menuButton15(openDrawer),
    h('div', { class: 'brand' }, h('span', { class: 'disc-sm', 'aria-hidden': 'true' }), h('b', null, g.config.companyName)),
    h('div', { class: 'date' }, h('b', null, dateLabel(g)), h('small', { class: 'muted' }, ` · ${t(S.week)} ${g.week} · Run ${g.signature}`)),
    saveChip20(), // r20 (B1, §4.4.6): saúde do save sempre visível
    h('div', { class: 'money' }, h('span', { class: 'muted' }, `${t(S.cash)} `),
      reserved > 0 ? h('b', { class: `${free < 0 ? 'bad' : ''} why18`, 'data-why': 'cash.free', tabindex: '0', title: t(l('Caixa livre / total ({r} reservado para ofertas)', 'Free / total cash ({r} reserved for offers')).replace('{r}', $(reserved)) }, `${$(free)} / ${$(g.player.cash)}`)
        : h('b', { class: g.player.cash < 0 ? 'bad' : '' }, $(g.player.cash)),
      h('small', { class: `${net >= 0 ? 'good' : 'bad'} why18`, 'data-why': 'cash.month', tabindex: '0' }, ` (${net >= 0 ? '+' : ''}${$(net)})`),
      run !== null && run < 24 ? h('small', { class: `${run < 3 ? 'bad' : run < 6 ? 'warn' : 'muted'} why18 runway21`, 'data-why': 'cash.runway', tabindex: '0', title: t(l('Fôlego: meses de caixa no ritmo atual', 'Runway: months of cash at the current pace')) }, ` · ${t(l('{n} meses', '{n} months'), { n: Math.max(0, Math.round(run * 10) / 10) })}`) : null),
    h('div', { class: 'rep', title: t(S.reputation) }, '★ ', Math.round((rep.artistic + rep.commercial + rep.artists + rep.institutional) / 4)),
    h('div', { class: 'advance' },
      store.undoSnapshot && !g.config.ironman ? h('button', { class: 'icon undo21', title: t(S.undo), 'aria-label': t(S.undo), onclick: undo }, '↶') : null, // r21: ícone (a barra não muda de altura entre janeiro e fevereiro)
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
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry', 'biz17', 'rights18', 'supply18', 'long18', 'calendar19', 'firm19'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14', 'producers15', 'dyn18', 'talent18', 'artist18', 'contracts19'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media', 'cal17', 'tribute19', 'media19', 'live19'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16', 'shared18'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas', 'news17', 'world17', 'crime', 'dm18', 'after18', 'regions18', 'society18', 'regions19', 'market19a', 'zines19', 'fakes19'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth', 'night14', 'agenda17', 'scenes17', 'tut18'] },
];
const lastInGroup: Record<string, string> = {};
/** Rodada 14: cada carreira ativa é um grupo de topo; as inativas ficam em "Outras atividades". */
const HINT17: Record<string, string> = Object.fromEntries(GROUPS.flatMap((g) => g.areas.map((a) => [a, g.id])));
/** r17: menu reformado (nav17): grupos por função, carreiras em Você › Carreiras, resto em Mais. */
const groups = (): NavGroup14[] => (groupsMemo ??= (() => {
  const g = store.game, ids = navItems().map((x) => x.id), has = new Set(ids);
  return navGroups17({ active: g ? careers(g).active : ['label'], pages: g ? careerPages17(g) : [], has: (a) => has.has(a) && (!g || !UX19UI.has || UX19UI.has(g, a) || a === store.area), all: ids, hint: HINT17 });
})());
void navGroups16;

interface NavItem { id: string; label: string; icon: string; key: string; badge?: number }
// rodada 15: menu (com selos/badges, alguns caros) calculado uma vez por render, não uma vez por grupo
let navMemo: NavItem[] | null = null;
let groupsMemo: NavGroup14[] | null = null;

function navItems(): NavItem[] {
  const g = store.game!;
  return navMemo ??= [
    ...AREAS.map((a) => ({ id: a.id as string, label: t(S[a.label]), icon: ICON17[a.id] ?? a.icon, key: KEY17[a.id] ?? '', badge: a.id === 'desk' && g.decisions.length ? g.decisions.length : undefined })),
    ...EXTRA_AREAS.filter((a) => !a.visible || a.visible(g)).map((a) => ({ id: a.id, label: t(a.label), icon: ICON17[a.id] ?? a.icon, key: KEY17[a.id] ?? '', badge: a.badge?.(g) })),
  ];
}

export function groupOf(area: string): NavGroup14 {
  return groupOf17(groups(), alias14(area));
}

function groupItems(gr: NavGroup): NavItem[] {
  const all = navItems();
  return gr.areas.map((id) => all.find((x) => x.id === id)).filter((x): x is NavItem => !!x);
}

function go(id: string): void {
  const r = resolve17(alias14(id), groups());
  if (r.tab) setTab(r.tab[0], r.tab[1]);
  store.area = r.area;
  lastInGroup[groupOf(r.area).id] = r.area;
  render();
}

function nav(): HTMLElement {
  const cur = groupOf(store.area);
  // r17: fixados no topo (☆ na barra de migalhas fixa/desfixa)
  const all = navItems(), listed = new Set(groups().flatMap((x) => x.areas));
  const pins = store17.pins.map((id) => all.find((x) => x.id === id && listed.has(id))).filter((x): x is NavItem => !!x);
  const pinBox = pins.length ? h('div', { class: 'nav-pins17' }, h('small', { class: 'nav-sec' }, '★ ', t(l('Fixados', 'Pinned'))),
    pins.map((a) => h('button', { class: store.area === a.id ? 'on' : '', title: a.label, onclick: () => go(a.id) }, h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(a.icon)), h('span', { class: 'lbl' }, a.label), a.badge ? h('span', { class: 'badge' }, a.badge) : null))) : null;
  return h('nav', { class: 'nav grouped', 'aria-label': 'menu' }, pinBox, groups().map((gr) => {
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
  }), UX19UI.navFoot?.(store.game!) ?? null);
}

/** Faixa de sub-áreas no topo do painel (útil no celular, onde o menu lateral vira barra). */
function subnav(): HTMLElement | null {
  const gr = groupOf(store.area);
  const items = groupItems(gr);
  if (items.length < 2) return null;
  return h('div', { class: 'subnav', role: 'tablist' }, items.map((a) => h('button', { role: 'tab', 'aria-selected': store.area === a.id ? 'true' : 'false', class: store.area === a.id ? 'on' : '', onclick: () => go(a.id) }, ic(a.icon), ' ', gr.home?.tab && gr.home.area === a.id ? t(gr.label) : a.label, a.badge ? h('span', { class: 'badge' }, a.badge) : null)));
}

function panel(): HTMLElement {
  const g = store.game!;
  const extra = EXTRA_AREAS.find((a) => a.id === store.area);
  if (extra) { stopHq(); return extra.render(g); }
  const v20 = areaView20(store.area); // r20 hubs20: Shows, Sede e Mundo por intenção (o painel antigo vira "Tudo")
  if (v20) { if (store.area !== 'hq') stopHq(); return v20(g); }
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
      { id: 'more', label: t(ERA19.otherCharts(g)), icon: 'radio', render: () => extraSections('charts', g) ?? h('div') },
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
  if (!store.game) { stopHq(); return titleScreen(root, startGame); } // r21 (I-3): o loop da Sede não continua no título
  const t0 = performance.now();
  renderApp();
  perfNote('render', performance.now() - t0);
}

let shownArea = '';
function renderApp(): void {
  if (!store.game) return;
  const g = store.game;
  navMemo = null;
  groupsMemo = null;
  store.area = alias14(store.area);
  { const r = resolve17(store.area, groups()); if (r.tab) setTab(r.tab[0], r.tab[1]); store.area = r.area; } // r17: telas absorvidas → página da carreira
  if (store17.recent[0] !== store.area) { store17.recent = pushRecent17(store17.recent, store.area); save17(); }
  applyRealNames(!!g.config.realNames);
  if (store.prefs.eraSkin !== false) document.documentElement.dataset.era = String(Math.floor(g.year / 10) * 10);
  else delete document.documentElement.dataset.era;
  // rodada 15: rolagem lembrada por área (mesma área mantém; área nova volta onde estava ou abre no topo)
  const old = document.querySelector('main');
  if (old && shownArea) scroll15.save(shownArea, old.scrollTop);
  const scroll = scroll15.get(store.area);
  const same = shownArea === store.area;
  shownArea = store.area;
  // render não muda o elenco: a lista de atos do jogador é calculada uma vez só
  const [sub, body] = withPlayerActsCache(g, () => [subnav(), panel()] as const);
  const app = withPlayerActsCache(g, () => h('div', { class: 'app' },
    topBar(),
    nav(),
    h('main', { id: 'main', tabindex: '-1' }, crumbs(body, sub), body),
    tutorialCard(g, render),
  ));
  root.replaceChildren(app);
  const main = app.querySelector('main');
  if (main) { stickyFix15(main); slimHeader21(app, main); main.scrollTop = scroll; if (!same && document.activeElement === document.body) main.focus({ preventScroll: true }); }
  const tw = body.querySelector<HTMLElement>('[data-tabs]');
  const tk = tw?.dataset.tabs;
  const tid = tw?.dataset.cur;
  syncRoute15({ area: store.area, tab: tk && tid ? [tk, tid] : undefined }, pageTitle15(areaLabel(store.area), g.config.companyName));
  saveTabs15(tabSnapshot());
  afterRender18(g, store.area, go); // r18 tutorial18: tour da 1ª visita, dicas de 1ª vez, trilhas
}

/** r21e (§2.3.15): no celular o cabeçalho encolhe ao rolar para baixo (fica só o essencial: caixa e Avançar) e volta ao subir. */
function slimHeader21(app: HTMLElement, main: HTMLElement): void {
  let last = main.scrollTop;
  const apply = () => {
    const y = main.scrollTop;
    const slim = window.innerWidth <= 640 && y > 64 && y >= last;
    if (slim !== app.classList.contains('hdr-slim21')) app.classList.toggle('hdr-slim21', slim);
    last = y;
  };
  main.addEventListener('scroll', apply, { passive: true });
}

/** Rótulo da área igual ao do menu (casa da carreira usa o nome do grupo). */
function areaLabel(id: string): string {
  const gr = groupOf(id);
  const it = navItems().find((x) => x.id === id);
  return gr.home?.tab && gr.home.area === id ? t(gr.label) : it?.label ?? id;
}

/** Barra fixa: ← voltar, Grupo › Área › Aba, botão de busca e (no celular) as sub-áreas. */
function crumbs(body: HTMLElement, sub: HTMLElement | null): HTMLElement {
  const gr = groupOf(store.area);
  const items = groupItems(gr);
  const tabLbl = body.querySelector('[data-tabs] > .tabs > [aria-selected=true]')?.textContent?.trim();
  const segLbl = body.querySelector<HTMLElement>('[data-tabs]')?.dataset.seg || undefined; // r21e: segmento aberto dentro do grupo
  const head = () => { const last = lastInGroup[gr.id]; go(last && items.some((x) => x.id === last) ? last : gr.home && items.some((x) => x.id === gr.home!.area) ? gr.home.area : items[0]?.id ?? 'cockpit'); };
  // r17: Grupo › Seção › Página › Aba, avançar, fixar e recentes
  const secL = sectionOf17(gr, store.area);
  const bar0 = crumbBar15([{ label: t(gr.label), go: head }, ...(secL ? [{ label: t(secL), go: head }] : []), { label: areaLabel(store.area), go: () => go(store.area) }, ...(tabLbl ? [{ label: tabLbl }] : []), ...(segLbl ? [{ label: segLbl }] : [])], sub);
  const row = bar0.querySelector('.crumbs15');
  const pinned = store17.pins.includes(store.area);
  const all = navItems();
  const rec = store17.recent.slice(1).map((id) => all.find((x) => x.id === id)).filter((x): x is NavItem => !!x).slice(0, 5);
  const tools = h('span', { class: 'tools17' },
    h('button', { class: 'icon fwd17', title: t(l('Avançar (Alt+→)', 'Forward (Alt+→)')), 'aria-label': t(l('Avançar', 'Forward')), onclick: () => history.forward() }, '→'),
    h('button', { class: `icon pin17 ${pinned ? 'on' : ''}`, 'aria-pressed': pinned ? 'true' : 'false', title: t(pinned ? l('Desafixar do menu', 'Unpin from the menu') : l('Fixar esta página no topo do menu', 'Pin this page to the top of the menu')), onclick: () => togglePin(store.area) }, pinned ? '★' : '☆'),
    rec.length ? h('details', { class: 'rec17' }, h('summary', { title: t(l('Páginas recentes', 'Recent pages')), 'aria-label': t(l('Páginas recentes', 'Recent pages')) }, '🕘'),
      h('div', { class: 'rec17-list' }, rec.map((a) => h('button', { class: 'link', onclick: () => go(a.id) }, ic(a.icon), ' ', a.label)))) : null);
  row?.insertBefore(tools, row.querySelector('.find15'));
  row?.insertBefore(helpButton18(store.area), row.querySelector('.find15')); // r18 tutorial18: "?" em toda página
  return bar0;
}

function openDrawer(): void {
  const cur = groupOf(store.area);
  drawer15(groups().map((gr) => ({ label: t(gr.label), icon: gr.icon, on: gr.id === cur.id,
    items: groupItems(gr).map((a) => ({ label: gr.home?.tab && gr.home.area === a.id ? t(gr.label) : a.label, icon: a.icon, key: a.key, badge: a.badge, on: a.id === store.area,
      go: () => { if (gr.home?.tab && gr.home.area === a.id) setTab(gr.home.tab[0], gr.home.tab[1]); go(a.id); } })) })));
}


function settings(): void {
  const p = store.prefs;
  let close = () => {};
  const body = h('div', { class: 'form' },
    h('label', null, t(S.language), select(p.lang, [{ value: 'pt' as Lang, label: 'Português (BR)' }, { value: 'en' as Lang, label: 'English' }], (v) => { p.lang = v; savePrefs(); close(); render(); settings(); })),
    h('label', null, `${t(S.textSize)}: ${p.textScale}%`, h('input', { type: 'range', min: 90, max: 130, step: 5, value: p.textScale, oninput: (e: Event) => { p.textScale = Number((e.target as HTMLInputElement).value); savePrefs(); } })),
    h('label', null, t(S.theme), select(p.theme, [{ value: 'auto', label: t(S.themeAuto) }, { value: 'light', label: t(S.themeLight) }, { value: 'dark', label: t(S.themeDark) }] as { value: typeof p.theme; label: string }[], (v) => { p.theme = v; savePrefs(); })),
    h('label', null, t(l('Modo para daltonismo', 'Colorblind mode')), select(p.colorblind ?? 'none', [{ value: 'none' as const, label: t(l('Desligado', 'Off')) }, { value: 'deutan' as const, label: t(l('Deuteranopia (verde)', 'Deuteranopia (green)')) }, { value: 'protan' as const, label: t(l('Protanopia (vermelho)', 'Protanopia (red)')) }, { value: 'tritan' as const, label: t(l('Tritanopia (azul)', 'Tritanopia (blue)')) }], (v) => { p.colorblind = v; savePrefs(); })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: tutorialsOff19(p), onchange: (e: Event) => { setTutorials19(p, !(e.target as HTMLInputElement).checked); savePrefs(); close(); render(); settings(); } }), ' ', t(TUTOFF_LABEL19)), // r19 tutoff19
    h('button', { class: 'btn small ghost', onclick: () => { resetTut18('all'); setTutorials19(p, true); savePrefs(); if (store.game) restartTutorial(store.game); close(); render(); } }, t(l('Reiniciar tutoriais', 'Restart tutorials'))),
    h('button', { class: 'btn small ghost', onclick: () => { if (store.game) { restartTutorial(store.game); close(); render(); } } }, t(l('Rever tutorial', 'Replay tutorial'))),
    ...settings18(() => { close(); go('tut18'); }), // r18 tutorial18
    h('label', null, t(l('Mini-jogos', 'Mini-games')), select(p.minigames ?? 'play', [{ value: 'play' as const, label: t(l('Jogar quando aparecerem', 'Play when they come up')) }, { value: 'auto' as const, label: t(l('Resolver automaticamente', 'Resolve automatically')) }], (v) => { p.minigames = v; savePrefs(); })),
    settings19(), // r19 B.5
    settings20(), // r20 G6: densidade
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.cutscenes !== false, onchange: (e: Event) => { p.cutscenes = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Mostrar cenas (premiações, críticas, entrevistas)', 'Show scenes (awards, reviews, interviews)'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.eraSkin !== false, onchange: (e: Event) => { p.eraSkin = (e.target as HTMLInputElement).checked; savePrefs(); render(); } }), t(l('Interface com o visual da época', 'Era-themed interface'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.contrast, onchange: (e: Event) => { p.contrast = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.contrast)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.reducedMotion, onchange: (e: Event) => { p.reducedMotion = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.reducedMotion)),
    h('hr'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => { const ok = await saveGame(`slot-${store.game?.signature}`); toast(ok ? t(S.saved) : t(l('Erro', 'Error')), ok ? 'good' : 'bad'); } }, t(S.save)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveTextDialog(); } }, t(S.exportSave)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveTextDialog(); } }, t(l('Copiar / colar save', 'Copy / paste save'))),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveGame('auto'); store.game = null; stopHq(); titleScreen(root, startGame); } }, t(l('Menu inicial', 'Main menu'))),
      h('button', { class: 'btn ghost', onclick: () => { close(); saveManagerModal17((g) => { store.game = g; startGame(); }); } }, t(l('Gerenciar saves', 'Manage saves'))), // r17
      h('button', { class: 'btn ghost', onclick: () => { close(); if (store.game) modal(t(l('Cartão da partida', 'Run card')), runCard17body(store.game)); } }, t(l('Cartão da partida', 'Run card'))), // r17
    ),
    h('p', { class: 'muted small' }, t(l('Atalhos: 1–0 e D trocam de área · Ctrl+Enter avança · Ctrl+K abre a busca · ? lista todos os atalhos · Alt+← volta.', 'Shortcuts: 1–0 and D switch area · Ctrl+Enter advances · Ctrl+K opens search · ? lists every shortcut · Alt+← goes back.'))),
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
    h('button', { class: 'btn primary', onclick: async () => { try { store.game = await importSaveText(paste.value); const ir = unIronman21(store.game); close(); render(); toast(t(l('Save carregado.', 'Save loaded.')), 'good'); if (ir) toast(t(IRONMAN_OFF21), 'info'); } catch (er) { toast(saveErrText20(er), 'bad'); } } }, t(l('Carregar save colado', 'Load pasted save'))),
  );
  close = modal(t(l('Save em texto', 'Save as text')), body);
}

/** r21e (2.3.17): subabas dos hubs e das barras agrupadas no Ctrl+K, sem a página aberta ("Finanças › Capital › Empréstimos"). */
const HOST_OF21: Record<string, TabHost> = { 'business-finance': 'business', 'business-business': 'business', mediaHub: 'mediaHub', marketHub: 'marketHub', chartsHub: 'chartsHub', worldHub: 'worldHub', catalogHub: 'catalogHub', 'creation-write': 'creation', 'creation-studio': 'creation', 'creation-release': 'creation' };
function paletteTabs21(g: NonNullable<typeof store.game>): PCmd[] {
  const out: PCmd[] = [];
  const reg: Record<string, Set<string>> = {}, vis: Record<string, Set<string>> = {};
  for (const x of tabIndex21()) {
    if (!areaExists(x.area)) continue;
    const host = HOST_OF21[x.key];
    if (host) { // aba registrada por outro módulo e invisível agora (era, carreira): fora do índice
      reg[host] ??= new Set(extraTabIds(host)); vis[host] ??= new Set(extraTabs(host, g).map((tb) => tb.id));
      if (reg[host].has(x.id) && !vis[host].has(x.id)) continue;
    }
    const area = areaLabel(x.area);
    out.push({ label: `${area} › ${x.group ? `${t(x.group)} › ` : ''}${t(x.label)}`, kind: 'area', icon: ICON17[x.area] ?? 'compass', hint: t(groupOf(x.area).label), weight: 4, run: () => { setTab(x.key, x.id); go(x.area); } });
  }
  return out;
}

/** Paleta de comandos (GDD §24; rodada 15: busca tolerante a acentos, setas, pessoas e todos os artistas visíveis). */
function palette(): void {
  const g = store.game!;
  navMemo = null;
  const mine = new Set(playerActs(g));
  const all17 = navItems();
  const seenArea = new Set<string>(); // r21e: a Gravadora aparece em dois grupos (casa + atalho); o Ctrl+K lista uma vez
  const indexed = new Set(tabIndex21().map((x) => `${x.key}:${x.id}`)), indexedKeys = new Set(tabIndex21().map((x) => x.key));
  const base: PCmd[] = [
    // r17: recentes primeiro, abas da página atual e telas absorvidas pelas páginas de carreira
    ...store17.recent.slice(1, 6).map((id) => all17.find((x) => x.id === id)).filter((x): x is NavItem => !!x).map((a): PCmd => ({ label: a.label, kind: 'recent', icon: a.icon, weight: 7, run: () => go(a.id) })),
    ...(indexedKeys.has(document.querySelector('main [data-tabs]')?.getAttribute('data-tabs') ?? '') ? [] : [...document.querySelectorAll<HTMLButtonElement>('main [data-tabs] > .tabs > button')].map((b): PCmd => ({ label: `${areaLabel(store.area)} › ${b.textContent?.trim() ?? ''}`, kind: 'area', icon: 'compass', weight: 4, run: () => b.click() }))),
    ...paletteTabs21(g),
    ...Object.keys(ALIAS17).filter((a) => groups().some((g) => g.areas.includes(ALIAS17[a][0]))).map((a): PCmd => ({ label: all17.find((x) => x.id === a)?.label ?? a, kind: 'area', icon: ICON17[a] ?? 'compass', hint: areaLabel(ALIAS17[a][0]), weight: 5, run: () => go(a) })),
    ...groups().flatMap((gr) => groupItems(gr).filter((a) => !seenArea.has(a.id) && seenArea.add(a.id)).map((a): PCmd => ({ label: gr.home?.tab && gr.home.area === a.id ? t(gr.label) : a.label, kind: 'area', icon: a.icon, hint: t(gr.label) + (a.key ? ` · ${a.key.toUpperCase()}` : ''), weight: 6,
      run: () => { if (gr.home?.tab && gr.home.area === a.id) setTab(gr.home.tab[0], gr.home.tab[1]); go(a.id); } }))),
    { label: t(S.advanceMonth), kind: 'action', icon: 'calendar', hint: 'Ctrl+Enter', run: () => doAdvance('month') },
    { label: t(S.advanceQuarter), kind: 'action', icon: 'calendar', run: () => doAdvance('quarter') },
    { label: t(S.advanceEvent), kind: 'action', icon: 'calendar', run: () => doAdvance('event') },
    { label: t(l('Avançar até algo relevante', 'Advance until something relevant')), kind: 'action', icon: 'calendar', run: () => doAdvance('until') },
    { label: t(l('Avançar semana', 'Advance week')), kind: 'action', icon: 'calendar', run: () => doAdvance('week') },
    { label: t(l('Comparar carreiras', 'Compare careers')), kind: 'action', icon: 'chart-up', run: () => compareActs(g, playerActs(g)) },
    { label: t(l('Atalhos de teclado', 'Keyboard shortcuts')), kind: 'action', hint: '?', run: () => shortcutsHelp15(navItems().map((x) => ({ key: x.key, label: x.label }))) },
    { label: t(S.settings), kind: 'action', run: settings },
    ...paletteCmds18(go), // r18 tutorial18: glossário e ajuda no Ctrl+K
    ...paletteCmds20(g), // r20 G4: ações do artista selecionado (mesmo custo/bloqueio do menu Ações ▾)
    ...[...mine].map((id): PCmd => ({ label: g.acts[id].name, kind: 'mine', icon: 'guitar', weight: 12, run: () => inspect.act(id) })),
    // rodada 16: abas extras (Sync, Disputas...) também aparecem no Ir para… — antes só se achavam abrindo a área certa
    ...([['charts', 'chartsHub'], ['market', 'marketHub'], ['media', 'mediaHub'], ['catalog', 'catalogHub'], ['world', 'worldHub']] as const).flatMap(([area, host]) =>
      extraTabs(host, g).filter((tb) => !indexed.has(`${host}:${tb.id}`)).map((tb): PCmd => ({ label: tb.label, kind: 'area', icon: tb.icon, hint: navItems().find((x) => x.id === area)?.label, weight: 5, run: () => { setTab(host, tb.id); go(area); } }))),
  ];
  // busca sob demanda (base grande: milhares de nomes) — só o que já existe no ano atual
  const search = (q: string): PCmd[] => {
    const out: PCmd[] = [];
    for (const a of Object.values(g.acts)) if (!mine.has(a.id) && visibleAct(g, a)) out.push({ label: a.name, kind: 'act', icon: 'fans', hint: a.owner && g.labels[a.owner] ? g.labels[a.owner].name : undefined, weight: Math.min(8, a.fame / 12) + (g.knowledge[a.id] ? 3 : 0), run: () => inspect.act(a.id) });
    for (const x of Object.values(g.labels)) if (x.active) out.push({ label: x.name, kind: 'label', icon: 'building', weight: 4, run: () => inspect.label(x.id) });
    const qq = q.trim().toLowerCase();
    const actOf: Record<string, string> = {};
    for (const a of Object.values(g.acts)) if (visibleAct(g, a)) for (const m of a.members) actOf[m] = a.name;
    for (const p of Object.values(g.persons)) if (actOf[p.id] && p.name.toLowerCase().includes(qq.slice(0, 2))) out.push({ label: p.name, kind: 'person', icon: 'star', hint: actOf[p.id] + (p.alive ? '' : ' · †'), run: () => openPerson(p.id) });
    for (const x of searchRoute16.f?.(g, qq) ?? []) out.push({ label: x.label, kind: 'person', icon: 'star', hint: x.hint, run: () => personRoute16.f?.(x.key) });
    out.push(...paletteCmds20(g, true)); // r20 G4: ações dos outros artistas do elenco
    return out;
  };
  palette15(base, search);
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
    UX19UI.end?.(g) ?? null,
    h('p', { class: 'lead' }, insolvent && !def ? t(S.insolvencyText) : t(def?.text)),
    h('p', { class: 'muted' }, `${g.config.companyName} · ${g.config.startYear}–${end.year} · Run ${g.signature}`),
    h('h4', null, `${t(LABEL_LEGACY20)}: ${legacyTotal(g)}`), // r20 (B21): nome distinto do "Legado por caminhos" do epitáfio
    h('p', { class: 'small muted' }, t(l('Soma das 7 dimensões abaixo (0–100 cada). O "Legado por caminhos" do epitáfio mede outra coisa: melhor caminho + 30% do segundo + pontos de caminho.', 'Sum of the 7 dimensions below (0–100 each). The epitaph\'s "Path legacy" measures something else: best path + 30% of the second + path points.'))),
    LEGACY_DIMS.map((d) => kv(t(d.name), h('span', null, Math.round(g.player.legacy[d.id]), ' ', bar(g.player.legacy[d.id])))),
    !insolvent ? h('p', { class: 'small muted' }, t(l('Finais mais próximos: ', 'Closest endings: ')), top.map((x) => t(ENDINGS.find((e) => e.id === x.id)?.name)).join(' · ')) : null,
    h('div', { class: 'row center' },
      h('button', { class: 'btn', onclick: () => openLabelStory(g) }, t(l('História do selo', 'Label story'))),
      h('button', { class: 'btn', onclick: () => { closeOverlay(); store.area = 'diary'; render(); } }, t(S.areaDiary)),
      !insolvent ? h('button', { class: 'btn', onclick: () => { g.flags.sandbox = 1; closeOverlay(); render(); } }, t(S.sandbox)) : null,
      h('button', { class: 'btn primary', onclick: () => { closeOverlay(); store.game = null; stopHq(); titleScreen(root, startGame); } }, t(S.newGame)),
    ),
  );
  modal(t(S.endTitle), body, { wide: true });
}

export { HQ_LEVELS };
