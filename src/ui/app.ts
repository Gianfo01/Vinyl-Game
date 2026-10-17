// Layout principal: barra superior, 10 áreas + Diário, avanço, paleta de comandos, fim de run.

import { attnSeq, notes } from '../sim/attention';
import { LABEL_LEGACY20 } from '../sim/oblig20';
import { ERA19 } from '../sim/era19';
import { ENDINGS, HQ_LEVELS, LEGACY_DIMS } from '../data/rules';
import { cityById, l, type L } from '../data/world';
import type { GameState } from '../sim/types';
import { ownerCity } from '../sim/sys/mapx8';
import { rw } from '../sim/sys/realworld';
import { S, t, type Lang } from '../i18n/strings';
import { endingScores, legacyTotal } from '../sim/legacy';
import { advance } from '../sim/tick';
import { cashDeltaL23, lastMonthView23 } from '../sim/close23';
import { advanceUntil, digestEnd, digestStart, type Digest } from '../sim/sys/pacing8';
import { openUntilConfig, showDigest, stopSummary } from './sys/pacing8';
import { playerActs } from '../sim/util';
import { $, dateLabel, inspect, kv, modal, toast } from './common';
import { applySkin31, settingsSkin31, skinHook31 } from './skin31'; // r31 (C) + onda 4 (M)
import { bar, h, select } from './dom';
import { registerInspect } from './ficha';
import { titleScreen } from './newgame';
import { artistsPanel } from './panels/artists';
import { creationPanel } from './panels/creation';
import { deskPanel } from './panels/desk';
import { catalogPanel, chartsPanel, companyPanel, diaryPanel, hqPanel, mediaPanel, showsPanel, stopHq } from './panels/misc';
import { applyPrefs, exportSave, migrate, saveGame, savePrefs, store, type Area } from './store';
import { settings27 } from './act27/prefs27';
import { flowGate27 } from './act27/flow27';
import './act27/flow27p2'; // r27 FLOW2: campanha, entrevista, favores, crise, reunião, estrada, turnê e renovação no caminho único
import { centralPanel } from './panels/central';
import { worldPanel } from './panels/world';
import { businessPanel } from './panels/business';
import { studioHub } from './panels/studio';
import { talentosHub23 } from './sys/talentos23';
import { pressSection } from './panels/media2';
import { compareActs } from './compare';
import { restartTutorial, tutorialCard, tutorialTick28 } from './tutorial';
import { afterRender18, helpButton18, paletteCmds18, resetTut18, settings18 } from './tutorial18'; // r18 tutorial18
import { paletteCmds20 } from './sys/actmenu20'; // r20 G4: ações do artista no Ctrl+K (registro único)
import { paletteBase31, paletteCmds31 } from './r31/quick31'; // R31 (O): busca que abre a ação, favoritos e metas
import './r31/results31ui'; // R31 onda 3 (P): resultados por projeto/artista e extrato pessoal (Finanças)
import './r31/learn31ui'; // R31 onda 4 (R): resultados e aprendizados — por projeto, coortes e biblioteca (correlação)
import './r31/socio31ui'; // R31 onda 3 (SOC): sócios e compras (Negócios, ficha da empresa, painel rápido da cidade)
import './r31/salas31'; // R31 onda 2 (K): salas da sede em cena (área 'sala31', topo das páginas)
import './r31/city31ui'; // R31 onda 4 (H): loja e casa em cena (áreas 'loja31' e 'casa31')
import './r31/decoshop31ui'; // R31 DECO-L: lojas de decoração, correio/internet e os seus lugares (área 'deco31')
import { area5Of } from './r31/casa5'; // R31 onda 5 (CASA): casa como "Você", sede que cresce e maquete (atrás de exp5.nav)
import { nav5On } from '../sim/r31/exp5';
import './r31/car31ui'; // R31 onda 3 (CAR): decisões de carreira que mudam o mundo (área 'car31', painel rápido, cena-assinatura)
import { salaHook31 } from './r31/salahook31';
import './r31/mech31'; // R31 · V: cenas de mecânica (negociar, renovar, rescindir, contratar, demitir, punir, formação)
import { eggCmds27, undoEgg27 } from './sys/eggs27'; // r27 ovos de Páscoa (busca secreta e 3/2/1959)
import { TUTOFF_LABEL19, setTutorials19, tutorialsOff19 } from './tutoff19'; // r19: "Sem tutoriais"
import { ic, registerIconRenderer, registerPortrait, tabs } from './vis';
import { ICON_NAMES, icon as pxIcon, type IconName } from './pixel/icons';
import { portraitDataUrl } from './pixel/avatar';
import { copyText, exportSaveText, importSaveText } from './store';
import { saveErrText20, saveManagerModal17 } from './saves17';
import { saveChip20 } from './savechip20';
import { noteTurnErr20 } from './savehealth20';
import { tx20 } from '../core/save20';
import { runCard17body } from './newgame17';
import { syncRealShow31 } from '../sim/r31/realshow31';
import { settingsRealNames31 } from './r31/realshow31ui';
import { settingsExtras31 } from './sys/extras31';
import { ensureBase31 } from '../sim/r31/base31'; // R31 (EDT)
import { INT_PREF23 } from '../sim/interrupt23';
import { AFTER_ADVANCE, EXTRA_AREAS, areaView20, extraSections, extraTabs, mergeTabs, showPendingCutscene } from './registry';
import { UX19UI } from './hooks19'; // r19 ux19: divulgação progressiva, rodapé do menu e fim de partida
import { openLabelStory } from './sys/story12';
import './sys';
import { defaultHome, type NavGroup } from './careernav13';
import { careers } from '../sim/sys/careers12';
import { setTab } from './vis';
import { alias14, type NavGroup14 } from './careernav14';
import { navGroups16 } from './careernav16';
import { themeButton } from './sys/theme14';
import { backChip29, bindRoute29, openCampaign29, openIndex29, paletteCmds29 } from './ps/route29';
import { REDIRECT29, resolve29, type Target29 } from './ps/route29model';
import { screenTop29 } from './ps/screentop29';
import { alertsSettings29 } from './ps/alerts29';
import { presetsSettings29 } from './ps/presets29';
import { crumbBar15, drawer15, initialRoute15, initRouter15, loadTabs15, menuButton15, pageTitle15, palette15, perfNote, saveSoon, saveTabs15, scroll15, shortcutsHelp15, stickyFix15, syncRoute15, type PCmd } from './nav15';
import { tabSnapshot } from './vis';
import { withPlayerActsCache } from '../sim/util';
import { visibleAct } from '../sim/future';
import { openPerson } from './ficha';
import { personRoute16, searchRoute16 } from './route16';
import { ALIAS17, CAREER_PAGE17, ICON17, KEY17, areaOfKey17, careerOfPage17, groupOf17, navGroups17, pushRecent17, resolve17, togglePin17 } from './nav17';
import { careerPages17 } from './sys/careerpages17';
import { icon17 } from './pixel/icons17';
import { installEmo31, pxEmoImg31 } from './pixel/emo31'; // r31 onda 4 (EMO): emojis → ícones em pixel art
import { isIcon31 } from './pixel/icons31';
import { askAdvance19, settings19 } from './sys/advance19'; // r19 B.5
import { PURPOSE23 } from './sys/journey23'; // r23: propósito de cada tela da jornada do disco
import { advanceToasts20, settings20 } from './sys/ui20'; // r20 G6
import { settingsRelics29 } from './sys/relics29'; // R29 (relíquias): densidade nas Opções
import './nav17.css';
// r25 Pixel Studio: 6 seções (Sede, Pessoas, Projetos, Ao vivo, Mundo, Gestão), busca global e encaixe da Sede
import { SECTIONS25, SEDE25, home25, landing27, navGroups25, sectionIdOf25, type NavGroup25 } from './ps/nav25';
import { sedeHome25, sedeNav25 } from './ps/slot25';
import { openSearch25, searchTabs25 } from './ps/search25';
// r27: menu em árvore (Seção › Página › Aba), folha do celular, todas as abas conhecidas e uma janela por vez
import { hubHome27, navSection27 } from './ps/tree27';
// r27 UX: páginas unificadas (hubs) como camada de mapeamento + vista Essencial/Completa (docs/ux27.md)
import { entries27, hubById27, resolveHub27, view27 } from './ps/hub27model';
import { enhanceSelects27 } from './ps/pick27';
import { kick27, mayShow27 } from './ps/queue27';
import { settingsCut27 } from './ps/cut27'; // r27 (K): cenas animadas dos grandes momentos
import { settingsAudio28 } from './audio28'; // r28 (F4): som opt-in (prévias e vinhetas)
import { editorModeSetting31 } from './editor31'; // R31 (EDT): editor dentro da partida (área "Editor", Ctrl+Shift+E)
import { openStory28 } from './end28'; // r28 (F4): capítulos, rumo e storyboard do fim
import { setAssist28 } from '../sim/sys/assist28'; // r28 F8 (D2): modo história
import { getLang } from '../i18n/strings';
import { locale } from '../i18n/strings';
import { artHook27, pageHeader27 } from './ps/ui27'; // r27 (J): sistema visual compartilhado
import { PURPOSE27, kpis27 } from './ps/ui27model';
import './ps/ctx27'; // r27 (CTX): clique direito / toque longo / Shift+F10 em nomes abre o menu de ações
// R31 (onda 1, A): menu "mundo primeiro" (entradas ≤ 10 + Lugares + Listas), Hoje, cabeçalho único e topo enxuto
import { LISTS31, LIST_TABS31, LKEY31, badges31, entryHome31, entryLabel31, find31, menu31, placeOf31, placesOf31, type Entry31, type EntryId31, type MenuCtx31 } from './ps/menu31';
import { regionCmds5 } from './r31/map5ui'; // R31 onda 5 (MAPA): busca aponta prédio/país no mapa (só com exp5.nav)
import { NAV5, TRANS5, keyNav5 } from './r31/nav5'; // R31 onda 5 (TEC): navegação nova atrás de exp5.nav (desligado = nada muda)
import { paperGo5, paperKey5Ev } from './r31/papers5'; // R31 onda 5 (PAPEL): páginas dentro dos papéis (registradas na casca; só com exp5.nav)
import { chordLabel5 } from './r31/keys5';
import { help5, shell5, shell5On, shellKey5, show5, type Shell5Host } from './r31/shell5'; // R31 onda 5 (NAV): casca do jogo explorável (exp5.nav)
import './r31/elenco5'; // R31 onda 5 (ELENCO): mural, quadro, agenda, fichário, contratação e chefe como papéis (só com exp5.nav ligado)
import { TOPBAR31, fullMenu31, listHome31, listsHome31, nav31, placesStrip31, setFullMenu31, subnav31 } from './ps/menu31ui';
import { pendingList } from '../sim/r31/pending';
import { settingsTrn31, transition31, trnBack31, trnGate31 } from './r31/trn31'; // R31 onda 5 (TRN): transições entre telas
import { cardInfo31, monthInfo31, type TrnPend31, type TrnPlace31 } from './r31/trn31model';
import { settingsLook31 } from './r31/look31ui'; // R31 (AP): opção Pressão estética

registerIconRenderer((name, scale = 1) => ((ICON_NAMES as readonly string[]).includes(name) ? pxIcon(name as IconName, scale) : icon17(name, scale) ?? (isIcon31(name) ? pxEmoImg31(name, undefined, scale) : null))); // r17: + ícones do menu; r31 EMO: + icons31
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
  installEmo31(); // r31 onda 4 (EMO): todo emoji que entrar na tela vira ícone em pixel art
  root = el;
  applyPrefs();
  registerInspect();
  store.rerender = render;
  store.toast = toast;
  skinHook31.options = () => settings(); skinHook31.rerender = () => render(); // r31 (M): ações do aviso de virada
  // r25: a cena da Sede navega pelo mesmo caminho do menu
  sedeNav25.go = (id) => go(id);
  sedeNav25.rerender = () => { navMemo = null; groupsMemo = null; if (store.game) render(); };
  window.addEventListener('keydown', onKey);
  // rodada 15: voltar/avançar do navegador, abas lembradas, paleta pelo botão da barra
  for (const [k, v] of Object.entries(loadTabs15())) setTab(k, v);
  // r29 (REORG, M01): catálogo único — Índice completo, Central da campanha e aliases (S07, "submundo", "quero:hire"…)
  bindRoute29({ game: () => store.game!, open: open29, inMenu: (a) => groups().some((gr) => gr.areas.includes(a)), registered: (a) => AREAS.some((x) => x.id === a) || EXTRA_AREAS.some((x) => x.id === a) || a === SEDE25,
    label: (a) => navItems().find((x) => x.id === a)?.label ?? (EXTRA_AREAS.find((x) => x.id === a) ? t(EXTRA_AREAS.find((x) => x.id === a)!.label) : AREAS.find((x) => x.id === a) ? t(S[AREAS.find((x) => x.id === a)!.label]) : a),
    files: () => saveManagerModal17((g) => { store.game = g; startGame(); }), options: () => settings(),
    view: () => ({ menuView: view27(), textScale: store.prefs.textScale, density: (store.prefs as { dens20?: string }).dens20, reducedMotion: store.prefs.reducedMotion, audio: !!(store.prefs as { audio28?: boolean }).audio28 }) });
  initRouter15((r) => { if (store.game && r.area === LISTS31) { goLists31(r.tab?.[0] === LKEY31 ? r.tab[1] : undefined); return true; } if (store.game && r.area.startsWith('hub:') && hubById27(r.area)) { go(r.area); return true; } if (store.game && (REDIRECT29[r.area] || !areaExists(r.area))) { const x = resolve29(r.area); if (x && (x.util || (x.area && areaExists(x.area)))) { open29(x); return true; } } if (!store.game || !areaExists(r.area)) return false; if (r.tab) setTab(r.tab[0], r.tab[1]); store.area = r.area; lastInGroup[groupOf(r.area).id] = r.area; render(); return true; });
  document.addEventListener('vtn15-palette', () => { if (store.game && !document.querySelector('.overlay')) palette(); });
  // R31 onda 5 (TEC): ganchos da navegação nova (só usados com exp5.nav ligado)
  NAV5.go = (x) => { paperGo5(store.game ?? undefined, x); if (shell5On(store.game)) show5(x.area, x.tab); else open29({ area: x.area, tab: x.tab }); }; NAV5.home = () => entryHome31('sede', menuCtx31()); NAV5.pause = () => settings(); // PAPEL: abrir o dono sem aba devolve a aba emprestada (Z depois de ⇧Z)
  NAV5.paper = () => document.querySelector<HTMLElement>('[data-paper5]')?.dataset.paper5 ?? (document.querySelector('main .m27-keys') ? 'correspondencia' : undefined); // caixa de entrada aberta: as teclas dela ganham
  // R31 onda 5 (NAV × TRN): as viagens e o abrir/fechar papel da casca passam pelas transições (sem animação, troca direto)
  TRANS5.run = (x, swap) => {
    const g = store.game;
    const card = x.kind === 'travel' && x.to && g ? cardInfo31({ to: x.to, city: t(cityById[ownerCity(g)]?.name) || ownerCity(g), month: g.month, year: g.year, pend: trnPend31(g) }) : undefined;
    if (!transition31(x.kind, { year: x.year, rect: x.rect, card }, swap)) swap();
  };
  NAV5.help = (rows) => shortcutsHelp15(rows.map((r) => ({ key: chordLabel5(r.key), label: t(r.label) })));
  document.addEventListener('vtn31-go', (e) => { if (!store.game) return; e.preventDefault(); go((e as CustomEvent<string>).detail); }); // R31 (O): destino do painel rápido/favoritos
  titleScreen(root, startGame);
}

/** Área existe e está visível agora (atalhos/rotas não abrem áreas de anos futuros). */
const areaExists = (id: string): boolean => navItems().some((x) => x.id === alias14(id));

function startGame(): void {
  // r27 (COCK): toda partida (nova ou carregada, de qualquer carreira) abre no Cockpit, a 1ª seção do menu;
  // a sede e a página da carreira ficam a um clique no menu em árvore.
  store.area = landing27(!!sedeHome25);
  navMemo = null;
  render();
  void saveGame('auto');
}

function onKey(e: KeyboardEvent): void {
  if (!store.game) return;
  const tag = (e.target as HTMLElement)?.tagName;
  // r25: Ctrl/Cmd+K (Buscar) vale também de dentro de um campo (ex.: filtro do "Mais")
  const ck = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
  const nav5 = shell5On(store.game); // R31 onda 5 (NAV): casca nova (exp5.nav); desligado, nada abaixo muda
  if (!ck && (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && !(nav5 && e.key === 'Escape')) return;
  if (document.querySelector('.overlay')) return;
  if (paperKey5Ev(e, store.game)) { e.preventDefault(); return; } // R31 onda 5 (PAPEL): A, 1–4 e Esc do papel aberto
  if (keyNav5(store.game, e)) { e.preventDefault(); return; } // R31 onda 5 (TEC): só com exp5.nav ligado
  if (nav5) {
    if (shellKey5(e)) { e.preventDefault(); return; }
    if (ck) { e.preventDefault(); palette(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doAdvance('month'); }
    return; // teclas antigas (KEY17, Shift+1…6) não valem na casca nova: o mapa é o de keys5
  }
  if (ck) {
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
  // R31 onda 5 (TRN): Esc numa página aberta pelo zoom de um objeto da sede faz o papel descer e volta à sede
  if (e.key === 'Escape' && trnBack31(store.area)) { e.preventDefault(); go(entryHome31('sede', menuCtx31()) ?? SEDE25); return; }
  // R31 (A): Shift+1…6 = entradas do menu (Hoje, Sede, Cidade, Mundo, Você, Listas); e.code não depende do teclado
  if (e.shiftKey && /^Digit[1-6]$/.test(e.code)) { const en = menu31(menuCtx31()).find((x) => x.key === e.code.slice(5)); if (en) { e.preventDefault(); openEntry31(en); return; } }
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
  const bs = wrap ? [...wrap.querySelectorAll<HTMLButtonElement>(':scope > .tabs > button[role=tab]')] : [];
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
  if (!ok19 && flowGate27(g, mode, () => doAdvance(mode))) return; // r27 FLOW: atividades jogáveis da janela (Jogar / Resolver rápido)
  if (!ok19 && askAdvance19(g, mode, () => doAdvance(mode, true))) return; // r19 B.5: cartões que vão valer o padrão
  // r20 (B27): instantâneo SEMPRE (também no ironman — isto é proteção contra erro de software, não "desfazer");
  // se qualquer gancho lançar no meio do avanço, o jogo meio-mutado é descartado e nada é gravado.
  const snap0 = JSON.stringify(g);
  const prevUndo = store.undoSnapshot;
  if (!g.config.ironman) store.undoSnapshot = snap0;
  const before = attnSeq(g); // r31 UNI-1: avisos = itens da fila única
  const m0: [number, number] = [g.month, g.year]; // R31 onda 5 (TRN): mês que sai (para a folha do calendário)
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
    advanceToasts20(notes(g, { after: before }).filter((n) => !n.fold));
  }
  if (res.stopReason && mode !== 'month' && !digest) toast(`⏸ ${t(res.stopReason)}`, 'event');
  announce(g.briefing.map((n) => t(n.text)).join('. '));
  saveSoon(() => void saveGame('auto')); // r15: grava depois de pintar (o mês aparece antes)
  if (g.ended && !g.flags.sandbox) {
    render();
    endScreen();
    return;
  }
  render();
  if (g.month !== m0[0] || g.year !== m0[1]) transition31('month', { year: g.year, month: monthInfo31({ old: m0, now: [g.month, g.year], pend: trnPend31(g) }) }); // R31 onda 5 (TRN): virada do mês (só a tela)
  INT_PREF23.v = store.prefs.interrupt23 ?? 'milestones'; // r23 (A)
  for (const f of AFTER_ADVANCE) f(g); // r18 decide18: resumo do mês
  if (digest) showDigest(g, digest.d, digest.why, () => showPendingCutscene(g, render, store.prefs.cutscenes === false));
  else showPendingCutscene(g, render, store.prefs.cutscenes === false);
}

function undo(): void {
  if (!store.undoSnapshot || !store.game || store.game.config.ironman) return;
  { const m27 = undoEgg27(store.game); if (m27) { toast(m27, 'info'); return; } } // r27 ovo: 3/2/1959
  store.game = migrate(JSON.parse(store.undoSnapshot));
  store.undoSnapshot = null;
  toast(t(l('Mês desfeito.', 'Month undone.')), 'info');
  render();
}

function topBar(): HTMLElement {
  const g = store.game!;
  const net = lastMonthView23(g).delta; // r23: variação do caixa do mês recém-fechado (mesmo retrato da Mesa/Cockpit)
  const rep = g.player.reputation;
  // R31 (A): topo enxuto — data · caixa (Δ) · ★ · [▶ Avançar ▾]; semana, trimestre, até…, critérios e desfazer no ▾;
  // tema e ⚙ moram em Opções (menu). Marca e "semana/run" saem (a marca fica no menu; semana e run no ▾).
  return h('header', { class: 'topbar topbar31' },
    menuButton15(openDrawer),
    h('div', { class: 'date' }, h('b', null, dateLabel(g))),
    saveChip20(), // r20 (B1, §4.4.6): saúde do save sempre visível
    h('div', { class: 'money' }, h('span', { class: 'muted' }, `${t(S.cash)} `), h('b', { class: g.player.cash < 0 ? 'bad' : '' }, $(g.player.cash)),
      h('small', { class: `${net >= 0 ? 'good' : 'bad'} why18`, 'data-why': 'cash.month', tabindex: '0', title: t(cashDeltaL23(g)), 'aria-label': `${t(cashDeltaL23(g))}: ${$(net)}` }, ` (${net >= 0 ? '+' : ''}${$(net)})`)),
    h('div', { class: 'rep', title: t(S.reputation) }, '★ ', Math.round((rep.artistic + rep.commercial + rep.artists + rep.institutional) / 4)),
    ...TOPBAR31.map((f) => { try { return f(g); } catch { return null; } }), // gancho: busca/favoritos/metas (frente O)
    h('div', { class: 'advance' },
      h('button', { class: 'btn primary m23-adv', title: 'Ctrl+Enter', 'data-short': t(l('Mês', 'Month')), onclick: () => doAdvance('month') }, '▶ ', h('span', { class: 'm23-advl' }, t(S.advanceMonth)), g.decisions.length ? h('span', { class: 'badge' }, g.decisions.length) : null),
      advMenu31(g),
      timeMenu23(g),
    ),
  );
}

/** R31 (A): o resto do tempo num ▾ (computador); no celular o mesmo conteúdo fica no ⋯ (timeMenu23). */
function advMenu31(g: NonNullable<typeof store.game>): HTMLElement {
  const item = (label: string, fn: () => void, title?: string) => h('button', { type: 'button', class: 'btn ghost small', role: 'menuitem', title, onclick: (e: Event) => { (e.currentTarget as HTMLElement).closest('details')?.removeAttribute('open'); fn(); } }, label);
  return h('details', { class: 'adv31' },
    h('summary', { class: 'btn small', 'aria-label': t(l('Mais formas de avançar', 'More ways to advance')), title: t(l('Semana, trimestre, até… e desfazer', 'Week, quarter, until… and undo')) }, '▾'),
    h('div', { class: 'adv31-list', role: 'menu' },
      h('small', { class: 'muted' }, `${t(S.week)} ${g.week} · Run ${g.signature}`),
      item('▷ ' + t(l('Semana', 'Week')) + (g.clock.opened ? ` (${g.clock.dayInMonth}d)` : ''), () => doAdvance('week'), t(l('Avança até o próximo fechamento semanal (dias de turnê, estúdio e crise)', 'Advance to the next weekly close (tour, studio and crisis days)'))),
      item('⏩ ' + t(S.advanceQuarter), () => doAdvance('quarter')),
      item('⏭ ' + t(l('Até…', 'Until…')), () => doAdvance('until'), stopSummary(g)),
      item('▾ ' + t(l('Critérios de parada', 'Stop criteria')), () => openUntilConfig(g, () => doAdvance('until'))),
      store.undoSnapshot && !g.config.ironman ? item('↶ ' + t(S.undo), undo) : null));
}

/** r23: no celular (≤760px) a barra do topo fica numa linha (data, caixa, avançar); o resto do tempo vai para este menu. */
function timeMenu23(g: NonNullable<typeof store.game>): HTMLElement {
  const item = (label: string, fn: () => void, title?: string) => h('button', { type: 'button', class: 'btn ghost small', role: 'menuitem', title, onclick: (e: Event) => { (e.currentTarget as HTMLElement).closest('details')?.removeAttribute('open'); fn(); } }, label);
  const rep = g.player.reputation;
  return h('details', { class: 'm23-tmenu' },
    h('summary', { 'aria-label': t(l('Mais controles de tempo e opções', 'More time controls and options')), title: t(l('Mais controles', 'More controls')) }, '⋯'),
    h('div', { class: 'm23-tlist', role: 'menu' },
      h('small', { class: 'muted' }, `${t(S.week)} ${g.week} · ★ ${Math.round((rep.artistic + rep.commercial + rep.artists + rep.institutional) / 4)} · ${t(cashDeltaL23(g))}`),
      item('▷ ' + t(l('Semana', 'Week')) + (g.clock.opened ? ` (${g.clock.dayInMonth}d)` : ''), () => doAdvance('week')),
      item('⏩ ' + t(S.advanceQuarter), () => doAdvance('quarter')),
      item('⏭ ' + t(l('Até…', 'Until…')), () => doAdvance('until'), stopSummary(g)),
      item('▾ ' + t(l('Critérios de parada', 'Stop criteria')), () => openUntilConfig(g, () => doAdvance('until'))),
      store.undoSnapshot && !g.config.ironman ? item('↶ ' + t(S.undo), undo) : null,
      item('⚙ ' + t(S.settings), settings)));
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
  // r25: 6 seções (nav25); a árvore r17 continua valendo para testes/ajuda (seções do ux20)
  return navGroups25({ active: g ? careers(g).active : ['label'], pages: g ? careerPages17(g) : [], has: (a) => has.has(a) && (!g || !UX19UI.has || UX19UI.has(g, a) || a === store.area), all: ids, hint: HINT17, sede: !!sedeHome25 });
})());
void navGroups16; void navGroups17; void defaultHome; void initialRoute15; void CAREER_PAGE17;

interface NavItem { id: string; label: string; icon: string; key: string; badge?: number; /** r25: nome no outro idioma (busca) */ alt?: string }
const altL25 = (x: L): string => (getLang() === 'pt' ? x.en : x.pt);
// rodada 15: menu (com selos/badges, alguns caros) calculado uma vez por render, não uma vez por grupo
let navMemo: NavItem[] | null = null;
let groupsMemo: NavGroup14[] | null = null;

function navItems(): NavItem[] {
  const g = store.game!;
  return navMemo ??= [
    ...(sedeHome25 ? [{ id: SEDE25, label: t(SEDE_L25), alt: altL25(SEDE_L25), icon: 'house', key: '' }] : []),
    ...AREAS.map((a) => ({ id: a.id as string, label: t(S[a.label]), alt: altL25(S[a.label]), icon: ICON17[a.id] ?? a.icon, key: KEY17[a.id] ?? '', badge: a.id === 'desk' && g.decisions.length ? g.decisions.length : undefined })),
    ...EXTRA_AREAS.filter((a) => !a.visible || a.visible(g)).map((a) => ({ id: a.id, label: t(a.label), alt: altL25(a.label), icon: ICON17[a.id] ?? a.icon, key: KEY17[a.id] ?? '', badge: a.badge?.(g) })),
  ];
}

export function groupOf(area: string): NavGroup14 {
  return groupOf17(groups(), alias14(area));
}

function groupItems(gr: NavGroup): NavItem[] {
  const all = navItems();
  return gr.areas.map((id) => all.find((x) => x.id === id)).filter((x): x is NavItem => !!x);
}

/** r29 (REORG): abre um alvo do catálogo (página + aba, ou utilidade global). */
function open29(x: Target29): void {
  if (x.util === 'index') return openIndex29();
  if (x.util === 'campaign') return openCampaign29();
  if (x.util === 'files') return saveManagerModal17((g) => { store.game = g; startGame(); });
  if (x.util === 'options') return settings();
  if (x.util === 'search') return openSearch25();
  if (!x.area) return;
  if (x.tab) setTab(x.tab[0], x.tab[1]);
  go(x.area);
}

function go(id: string): void {
  if (store.game && id === LISTS31) return goLists31(); // R31 (A): a entrada Listas abre a última lista vista
  // r29 (REORG, M01): nomes que não são página nem hub (S07, "submundo", "quero:hire") resolvem pelo catálogo único
  if (store.game && REDIRECT29[id]) return open29(REDIRECT29[id]); // nomes antigos (inbox, desk) abrem a aba certa do Cockpit
  if (store.game && !id.startsWith('hub:') && !areaExists(id)) { const x = resolve29(id); if (x && (x.util || (x.area && x.area !== id))) return open29(x); }
  // r27 UX: id de hub ("hub:money") abre a página certa do hub (a última visitada nele ou a 1ª visível)
  if (hubById27(id) && id.startsWith('hub:')) { const x = hubById27(id)!; id = resolveHub27(id, areaExists, hubHome27(x, x.areas.filter(areaExists))) ?? 'cockpit'; }
  const r = resolve17(alias14(id), groups());
  if (r.tab) setTab(r.tab[0], r.tab[1]);
  if (shell5On(store.game)) return show5(r.area, r.tab); // R31 onda 5 (NAV): a página abre como papel do objeto dono
  store.area = r.area;
  lastInGroup[groupOf(r.area).id] = r.area;
  render();
}

/** r21: clicar de novo no grupo aberto recolhe/expande (lembrado entre sessões). */
const FOLD21 = 'vtn.navFold21';
const navFold21: Set<string> = (() => { try { return new Set(JSON.parse(localStorage.getItem(FOLD21) ?? '[]') as string[]); } catch { return new Set<string>(); } })();
const saveFold21 = () => { try { localStorage.setItem(FOLD21, JSON.stringify([...navFold21])); } catch { /* sem armazenamento */ } };

// ---------------------------------------------------------------- R31 (onda 1, A): menu "mundo primeiro"
let menuMemo31: MenuCtx31 | null = null;
let badgeMemo31: ReturnType<typeof badges31> | null = null;
/** Contexto do menu novo (carreiras, fixados, páginas visíveis). Calculado uma vez por desenho. */
function menuCtx31(): MenuCtx31 {
  if (menuMemo31) return menuMemo31;
  const g = store.game!;
  const ids = new Set(navItems().map((x) => x.id));
  const has = (a: string) => ids.has(a) && (!UX19UI.has || UX19UI.has(g, a) || a === store.area);
  const listed = new Set(groups().flatMap((x) => x.areas));
  const ctx0: MenuCtx31 = { active: careers(g).active, pages: careerPages17(g), pins: store17.pins.filter((id) => listed.has(id)).length, sede: !!sedeHome25, has, nav5: nav5On(g) || undefined };
  // páginas registradas sem casa na tabela: Listas › Outras páginas (nada some)
  ctx0.extra = [...ids].filter((a) => placeOf31(a, ctx0).id === 'list:other');
  return (menuMemo31 = ctx0);
}
/** Contadores por pendência única (src/sim/r31/pending.ts): entrada e lugar do dono, cada pendência uma vez. */
function badge31(): ReturnType<typeof badges31> {
  if (badgeMemo31) return badgeMemo31;
  let xs: ReturnType<typeof pendingList> = [];
  try { xs = pendingList(store.game!); } catch { xs = []; }
  return (badgeMemo31 = badges31(xs, menuCtx31()));
}
/** Abre uma entrada do menu (página-base, Listas ou utilidade). */
function openEntry31(e: Entry31): void {
  if (e.util === 'search') return openSearch25();
  if (e.util === 'options') return settings();
  const home = e.id === 'listas' ? LISTS31 : entryHome31(e.id, menuCtx31());
  if (!home) return;
  if (e.tab) setTab(e.tab[0], e.tab[1]);
  go(home);
}
/** Listas: a última lista vista, ou a aba pedida (#/lists30/l30=calendar). */
function goLists31(tab?: string): void {
  const c = menuCtx31();
  const has = (a: string) => areaExists(a) && (c.has?.(a) ?? true);
  const lt = tab ? LIST_TABS31.find((x) => x.id === tab) : undefined;
  const a = (lt && listHome31(lt, has, c.extra)) || listsHome31(has, c.extra);
  go(a);
}

function nav(): HTMLElement {
  // r17: fixados (☆ na barra fixa/desfixa) — viram a entrada condicional "Fixados"
  const all = navItems(), listed = new Set(groups().flatMap((x) => x.areas));
  const pins = store17.pins.map((id) => all.find((x) => x.id === id && listed.has(id))).filter((x): x is NavItem => !!x);
  const g = store.game!;
  const act = careers(g).active;
  const houses = act.map((id) => CAREER_PAGE17[id]).filter((cp) => cp && areaExists(cp.area)).map((cp) => ({ id: cp.area, label: t(cp.label), icon: cp.icon }));
  // "Menu completo" (Opções): a árvore clássica (r27) inteira, sem abas na lateral
  const cur = groupOf(store.area);
  const tctx = { groups: groups() as NavGroup25[], item: (id: string) => all.find((x) => x.id === id), area: store.area, section: cur.id, live: liveTabs27,
    tabs: [], go, home: (gr: NavGroup25) => home25(gr), search: openSearch25, full: true,
    goTab: (area: string, path: [string, string][]) => { for (const [k, v] of path) setTab(k, v); go(area); } };
  return nav31({ menu: menuCtx31(), area: store.area, badge: badge31().entry, company: g.config.companyName, open: openEntry31,
    pins: pins.map((x) => ({ id: x.id, label: x.label, icon: x.icon })), houses, go,
    fullTree: () => groups().map((gr) => navSection27(tctx, gr as NavGroup25)), foot: UX19UI.navFoot?.(g) ?? null });
}
void navFold21; void saveFold21;

/** r27: seção de uma página para a busca — a do menu ou, se a página ainda não entrou no menu, a canônica. */
const secOf27 = (area: string): { label: L } => groups().find((x) => x.areas.includes(area)) ?? SECTIONS25.find((x) => x.id === sectionIdOf25(area)) ?? groupOf(area);
/** r27: abas abertas agora na página desenhada (chave da faixa → aba), para o destaque na árvore. */
let liveTabs27 = new Map<string, string>();
/** R31 (A): faixa sob a migalha — abas das Listas (≤ 6 + "Mais ▾") ou as páginas do lugar (quando há mais de uma). */
function subnav(): HTMLElement | null {
  const c = menuCtx31();
  return subnav31({ area: store.area, menu: c, has: (a) => areaExists(a) && (c.has?.(a) ?? true), label: areaLabel, go, extra: c.extra ?? [] });
}
/** R31 (A): faixa "Lugares" abaixo da área-base de cada entrada (cartão por lugar, contador e "ver detalhes"). */
function places31(): HTMLElement | null {
  const c = menuCtx31();
  const en = (['hoje', 'sede', 'cidade', 'mundo', 'voce'] as EntryId31[]).find((e) => entryHome31(e, c) === store.area);
  if (!en || (c.nav5 && (en === 'voce' || store.area === SEDE25))) return null; // R31 onda 5 (CASA): a casa e a sede nova substituem a faixa de lugares
  return placesStrip31({ entry: en, menu: c, places: placesOf31(en, c), badge: badge31().place, label: areaLabel,
    go: (a, tab) => { if (tab) setTab(tab[0], tab[1]); go(a); } });
}
const SEDE_L25 = l('Sua sede', 'Your HQ');

function panel(): HTMLElement {
  // R31 onda 5 (CASA): com exp5.nav ligado, a casa, a sede que cresce e a maquete trocam (ou encabeçam) a página antiga
  const r5 = store.game && nav5On(store.game) ? area5Of(store.area) : undefined;
  if (r5?.mode === 'replace') { stopHq(); return r5.render(store.game!); }
  return r5 ? h('div', null, r5.render(store.game!), panel0()) : panel0();
}
function panel0(): HTMLElement {
  const g = store.game!;
  // r25: tela da Sede (encaixe em ps/slot25.ts); sem tela registrada a área nem aparece no menu
  if (store.area === SEDE25) { stopHq(); const el = h('div', { class: 'sede25 page21-host' }); if (sedeHome25) sedeHome25(el); else el.append(deskPanel(g)); return el; }
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
    case 'market': return talentosHub23(g, render); // r23: tela Talentos (procurar / funil / decidir)
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
      { id: 'map', label: t(l('Mapa detalhado', 'Detailed map')), icon: 'globe', render: () => worldPanel(g) }, // r27: o mapa principal é a aba map27
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

// ---------------------------------------------------------------- R31 onda 5 (TRN): lugares das transições
/** Lugar (Sede/Casa/Cidade/Mundo) de uma área, pelo menu (a casa do jogador mora na cidade, mas é o lugar Casa). */
function trnPlace31(area: string): TrnPlace31 | null {
  if (area === 'casa31') return 'casa';
  const e = placeOf31(area, menuCtx31()).entry;
  return e === 'sede' || e === 'hoje' ? 'sede' : e === 'cidade' || e === 'mundo' ? e : e === 'voce' ? 'casa' : null;
}
/** Pendências únicas com o lugar dono (só leitura). */
function trnPend31(g: GameState): TrnPend31[] {
  let xs: ReturnType<typeof pendingList> = [];
  try { xs = pendingList(g); } catch { xs = []; }
  return xs.map((p) => ({ title: p.title, prio: p.prio, due: p.due, place: trnPlace31(p.owner.area) }));
}
function trnNav31() {
  const g = store.game!;
  const c = menuCtx31();
  const sede = entryHome31('sede', c) ?? SEDE25;
  const homeOf = (a: string): TrnPlace31 | null => a === 'casa31' ? 'casa' : a === sede ? 'sede' : a === entryHome31('cidade', c) ? 'cidade' : a === entryHome31('mundo', c) ? 'mundo' : null;
  return { from: shownArea, to: alias14(store.area), year: g.year, sede, placeOf: (a: string) => trnPlace31(alias14(a)), homeOf,
    info: (to: TrnPlace31) => ({ year: g.year, card: cardInfo31({ to, city: t(cityById[ownerCity(g)]?.name) || ownerCity(g), month: g.month, year: g.year, pend: trnPend31(g) }) }) };
}

export function render(): void {
  if (!store.game) return titleScreen(root, startGame);
  if (!shell5On(store.game) && trnGate31(trnNav31(), render)) return; // R31 onda 5 (TRN): a página nova entra com a cortina fechada / o zoom cheio
  const t0 = performance.now();
  renderApp();
  perfNote('render', performance.now() - t0);
}

/** R31 (A): topos r29 que são conteúdo (não atalho) e ficam: o trio S13 só em Listas › Finanças; a trajetória em Você. */
const TOP_KEEP31 = new Set(['finance', 'you']);
let shownArea = '';
function renderApp(): void {
  if (!store.game) return;
  const g = store.game;
  navMemo = null;
  groupsMemo = null;
  menuMemo31 = null;
  badgeMemo31 = null;
  store.area = alias14(store.area);
  { const r = resolve17(store.area, groups()); if (r.tab) setTab(r.tab[0], r.tab[1]); store.area = r.area; } // r17: telas absorvidas → página da carreira
  if (store17.recent[0] !== store.area) { store17.recent = pushRecent17(store17.recent, store.area); save17(); }
  syncRealShow31(g); // r31 (X): interruptor "Nomes e obras reais" (exibição; inclui o filtro antigo da rodada 6)
  ensureBase31(g); // r31 (EDT): base da partida aberta (idempotente; troca de partida/preview de outra não vaza)
  applySkin31(g.year, g.signature); // r31 (C): estilo da interface por era (data-era-skin, data-era) e aviso de troca
  if (shell5On(g)) { renderShell5(g); return; } // R31 onda 5 (NAV): casca do jogo explorável (exp5.nav ligado)
  // rodada 15: rolagem lembrada por área (mesma área mantém; área nova volta onde estava ou abre no topo)
  const old = document.querySelector('main');
  if (old && shownArea) scroll15.save(shownArea, old.scrollTop);
  const scroll = scroll15.get(store.area);
  const same = shownArea === store.area;
  shownArea = store.area;
  // render não muda o elenco: a lista de atos do jogador é calculada uma vez só
  const [sub, body] = withPlayerActsCache(g, () => [subnav(), panel()] as const);
  enhanceSelects27(body); // r27 UX: escolhas curtas (2–4 opções) viram controle segmentado; o <select> segue por baixo
  liveTabs27 = new Map([...body.querySelectorAll<HTMLElement>('[data-tabs]')].map((e) => [e.dataset.tabs ?? '', e.dataset.cur ?? '']));
  const app = withPlayerActsCache(g, () => h('div', { class: 'app' },
    topBar(),
    nav(),
    h('main', { id: 'main', tabindex: '-1' }, crumbs(body, sub), pageTitle21(body), TOP_KEEP31.has(store.area) ? screenTop29(store.area, g, body) : null, salaHook31.top?.(store.area, g) ?? null, body, places31()), // R31 (A): cabeçalho único; os cartões-atalho do topo r29 saem (ficam o trio de Finanças e a trajetória em Você)
    mayShow27('tutorial', g) ? tutorialCard(g, render) : null, // r27: as metas de abertura vêm antes (fila de janelas)
    h('div', { id: 'sr-live', class: 'sr-only', 'aria-live': 'polite' }),
  ));
  root.replaceChildren(app);
  const main = app.querySelector('main');
  if (main) { stickyFix15(main); main.scrollTop = scroll; if (!same && document.activeElement === document.body) main.focus({ preventScroll: true }); }
  const tw = body.querySelector<HTMLElement>('[data-tabs]');
  const tk = tw?.dataset.tabs;
  const tid = tw?.dataset.cur;
  syncRoute15({ area: store.area, tab: tk && tid ? [tk, tid] : undefined }, pageTitle15(areaLabel(store.area), g.config.companyName));
  saveTabs15(tabSnapshot());
  afterRender18(g, store.area, go); // r18 tutorial18: dicas de 1ª vez e trilhas (r27: tour só no "?")
  tutorialTick28(g, store.area, render); // r28 (F4): o passo do tutorial se conclui fazendo
  kick27(g); // r27: a próxima janela da fila (metas de abertura) entra logo
}

/** R31 onda 5 (NAV): a tela inteira pela casca nova (topo, cena da região, papel, viagem e bolso). */
function renderShell5(g: NonNullable<typeof store.game>): void {
  const host: Shell5Host = {
    page: (area) => {
      const rd = REDIRECT29[area]; // nomes antigos (inbox, desk) abrem a aba certa da página dona
      if (rd?.area) { if (rd.tab) setTab(rd.tab[0], rd.tab[1]); area = rd.area; }
      store.area = alias14(area) as Area;
      const r = resolve17(store.area, groups());
      if (r.tab) setTab(r.tab[0], r.tab[1]);
      store.area = r.area;
      return withPlayerActsCache(g, () => { const b = panel0(); enhanceSelects27(b); return b; }); // página de hoje pura: o que é da CASA/ELENCO entra pelos registros da casca
    },
    label: areaLabel, has: (a) => areaExists(a),
    advance: () => doAdvance('month'), advMore: () => advMenu31(g), search: palette, options: settings,
    files: () => saveManagerModal17((x) => { store.game = x; startGame(); }),
    save: async () => { const ok = await saveGame(`slot-${store.game?.signature}`); toast(ok ? t(S.saved) : 'Erro', ok ? 'good' : 'bad'); },
    mainMenu: () => { void saveGame('auto'); store.game = null; titleScreen(root, startGame); },
    rerender: render, saveChip: () => saveChip20(),
    extra: () => (mayShow27('tutorial', g) ? tutorialCard(g, render) : null),
  };
  const area0 = store.area;
  const el = shell5(g, host);
  root.replaceChildren(el);
  if (store.area !== area0 && !el.querySelector('.p5')) store.area = area0 as Area;
  kick27(g);
}

/** Rótulo da área igual ao do menu (casa da carreira usa o nome do grupo). */
function areaLabel(id: string): string {
  const gr = groupOf(id);
  const it = navItems().find((x) => x.id === id);
  return gr.home?.tab && gr.home.area === id ? t(gr.label) : it?.label ?? id;
}

/** Barra fixa: ← voltar, Grupo › Área › Aba, botão de busca e (no celular) as sub-áreas. */
/** r21 (Heritage): título grande da página (nome do menu), salvo quando a própria tela já traz um. */
/** R31 (A): números que já estão na barra do topo (data, caixa, fama) não se repetem no cabeçalho. */
const TOP_KPI31 = new Set(['Mês', 'Data', 'Caixa', 'Fama', 'Reputação']);
function pageTitle21(body: HTMLElement): HTMLElement | null {
  if (body.querySelector('.page21')) return null;
  const it = navItems().find((x) => x.id === store.area);
  if (!it) return null;
  // a tela repete o próprio nome logo no topo? o título grande assume e o repetido fica só para leitores de tela
  const dup = [...body.querySelectorAll<HTMLElement>('h2, h3')].slice(0, 2).find((x) => x.textContent?.trim() === it.label);
  dup?.classList.add('sr-only');
  // r23: uma pergunta por tela — linha curta de propósito sob o título (Projeto, Composição, Estúdio, Lançamentos)
  // r27 (J): cabeçalho único (ps/ui27.ts) — título, propósito, números-chave da página e arte opcional
  // a tela já abre com um parágrafo de apresentação (fora de cartão)? então o subtítulo genérico não repete a ideia
  const first = body.querySelector('p, h2, h3, table, .card, section, .tabs, [data-tabs]');
  const ownIntro = first?.tagName === 'P' && !first.closest('.card') && (first.textContent ?? '').trim().length > 40;
  const why = PURPOSE23[store.area] ?? (ownIntro ? undefined : PURPOSE27[store.area]);
  const g = store.game!;
  // R31 (A): cabeçalho único — sobrescrito = entrada do menu; ≤ 3 números-chave e nenhum que repita a barra do topo
  const c = menuCtx31();
  const pl = placeOf31(store.area, c);
  const kp = kpis27(store.area, g, locale()).filter((k) => !TOP_KPI31.has(k.label.pt)).slice(0, 3);
  return pageHeader27({ eyebrow: t(entryLabel31(pl.entry, c)), title: it.label, sub: why, kpis: kp, art: salaHook31.owns?.(store.area) ? null : artHook27.f?.(store.area, g) ?? null, area: store.area, go }); // R31 (K): a cena em cima substitui a ilustração
}

function crumbs(_body: HTMLElement, sub: HTMLElement | null): HTMLElement {
  // R31 (A): migalha de 2 níveis — Entrada › Lugar (a aba atual aparece só na faixa de abas)
  const c = menuCtx31();
  const pl = placeOf31(store.area, c);
  const en = menu31(c).find((x) => x.id === pl.entry);
  const enL = t(entryLabel31(pl.entry, c));
  const home = pl.entry === 'listas' ? undefined : entryHome31(pl.entry, c);
  const plL = t(pl.label);
  const bar0 = crumbBar15([{ label: enL, go: () => (en ? openEntry31(en) : go(pl.areas[0])) }, ...(store.area !== home && plL !== enL ? [{ label: plL, go: () => go(pl.areas[0]) }] : [])], sub);
  backChip29(bar0, store17.recent[1], store.area, areaLabel, (a) => groups().some((gr) => gr.areas.includes(a)), go); // r29 REORG (M43): ↩ Voltar a <origem>
  const row = bar0.querySelector('.crumbs15');
  const pinned = store17.pins.includes(store.area);
  const all = navItems();
  const rec = store17.recent.slice(1).map((id) => all.find((x) => x.id === id)).filter((x): x is NavItem => !!x).slice(0, 5);
  const tools = h('span', { class: 'tools17' },
    h('button', { class: 'icon fwd17', title: t(l('Avançar (Alt+→)', 'Forward (Alt+→)')), 'aria-label': t(l('Avançar', 'Forward')), onclick: () => history.forward() }, '→'),
    h('button', { class: `icon pin17 ${pinned ? 'on' : ''}`, 'aria-pressed': pinned ? 'true' : 'false', title: t(pinned ? l('Desafixar do menu', 'Unpin from the menu') : l('Fixar esta página no topo do menu', 'Pin this page to the top of the menu')), onclick: () => togglePin(store.area) }, pinned ? '★' : '☆'),
    rec.length ? h('details', { class: 'rec17' }, h('summary', { title: t(l('Páginas recentes', 'Recent pages')), 'aria-label': t(l('Páginas recentes', 'Recent pages')) }, '🕘'),
      h('div', { class: 'rec17-list' }, rec.map((a) => h('button', { class: 'link', onclick: () => go(a.id) }, ic(a.icon), ' ', a.label)))) : null);
  // R31 (A): →, ☆ e 🕘 num menu "⋯" (← fica à mostra)
  const more = h('details', { class: 'tools31' }, h('summary', { class: 'icon', title: t(l('Avançar, fixar e recentes', 'Forward, pin and recent')), 'aria-label': t(l('Mais ações da página', 'More page actions')) }, '⋯'), h('div', { class: 'tools31-list' }, tools));
  row?.insertBefore(more, row.querySelector('.find15'));
  row?.insertBefore(helpButton18(store.area), row.querySelector('.find15')); // r18 tutorial18: "?" em toda página
  return bar0;
}

function openDrawer(): void {
  const cur = groupOf(store.area);
  // R31 (A): no celular, a barra de baixo tem as 6 entradas; o ☰ traz as entradas (com Buscar e Opções) e a árvore completa
  const c = menuCtx31();
  const ents = { label: t(l('Menu', 'Menu')), icon: 'compass', on: true, items: menu31(c).filter((e) => !e.cond).map((e) => ({ label: t(e.label), icon: e.icon, key: e.key ? `⇧${e.key}` : '', badge: badge31().entry[e.id], on: placeOf31(store.area, c).entry === e.id, go: () => openEntry31(e) })) };
  drawer15([ents, ...groups().map((gr) => ({ label: t(gr.label), icon: gr.icon, on: gr.id === cur.id,
    items: groupItems(gr).map((a) => ({ label: gr.home?.tab && gr.home.area === a.id ? t(gr.label) : a.label, icon: a.icon, key: a.key, badge: a.badge, on: a.id === store.area,
      go: () => { if (gr.home?.tab && gr.home.area === a.id) setTab(gr.home.tab[0], gr.home.tab[1]); go(a.id); } })) }))]);
}


function settings(): void {
  const p = store.prefs;
  let close = () => {};
  const body = h('div', { class: 'form' },
    // R31 (A): o que saiu do menu lateral mora aqui (Arquivo, Campanha, Índice, Ajuda, tema) + "Menu completo"
    h('div', { class: 'row' },
      h('button', { class: 'btn small ghost', onclick: () => { close(); saveManagerModal17((g) => { store.game = g; startGame(); }); } }, '▤ ', t(l('Arquivo', 'Files'))),
      h('button', { class: 'btn small ghost', onclick: () => { close(); openCampaign29(); } }, '⚑ ', t(l('Campanha', 'Campaign'))),
      h('button', { class: 'btn small ghost', onclick: () => { close(); openIndex29(); } }, '☰ ', t(l('Índice de todas as páginas', 'Index of every page'))),
      h('button', { class: 'btn small ghost', onclick: () => { close(); go('tut18'); } }, '? ', t(l('Ajuda', 'Help'))),
      shell5On(store.game) ? h('button', { class: 'btn small ghost', onclick: () => { close(); help5(); } }, t(l('Teclas (trocar)', 'Keys (rebind)'))) : null, // R31 onda 5 (NAV): teclas configuráveis
      themeButton(() => render())),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: fullMenu31(), onchange: (e: Event) => { setFullMenu31((e.target as HTMLInputElement).checked); render(); } }),
      ' ', t(l('Menu completo: mostrar também a árvore com todas as páginas no menu lateral', 'Full menu: also show the tree with every page in the side menu'))),
    h('label', null, t(S.language), select(p.lang, [{ value: 'pt' as Lang, label: 'Português (BR)' }, { value: 'en' as Lang, label: 'English' }], (v) => { p.lang = v; savePrefs(); close(); render(); settings(); })),
    h('label', null, `${t(S.textSize)}: ${p.textScale}%`, h('input', { type: 'range', min: 90, max: 130, step: 5, value: p.textScale, oninput: (e: Event) => { p.textScale = Number((e.target as HTMLInputElement).value); savePrefs(); } })),
    h('label', null, t(S.theme), select(p.theme, [{ value: 'auto', label: t(S.themeAuto) }, { value: 'light', label: t(S.themeLight) }, { value: 'dark', label: t(S.themeDark) }] as { value: typeof p.theme; label: string }[], (v) => { p.theme = v; savePrefs(); })),
    h('label', null, t(l('Modo para daltonismo', 'Colorblind mode')), select(p.colorblind ?? 'none', [{ value: 'none' as const, label: t(l('Desligado', 'Off')) }, { value: 'deutan' as const, label: t(l('Deuteranopia (verde)', 'Deuteranopia (green)')) }, { value: 'protan' as const, label: t(l('Protanopia (vermelho)', 'Protanopia (red)')) }, { value: 'tritan' as const, label: t(l('Tritanopia (azul)', 'Tritanopia (blue)')) }], (v) => { p.colorblind = v; savePrefs(); })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: tutorialsOff19(p), onchange: (e: Event) => { setTutorials19(p, !(e.target as HTMLInputElement).checked); savePrefs(); close(); render(); settings(); } }), ' ', t(TUTOFF_LABEL19)), // r19 tutoff19
    h('button', { class: 'btn small ghost', onclick: () => { resetTut18('all'); setTutorials19(p, true); savePrefs(); if (store.game) restartTutorial(store.game); close(); render(); } }, t(l('Reiniciar tutoriais', 'Restart tutorials'))),
    h('button', { class: 'btn small ghost', onclick: () => { if (store.game) { restartTutorial(store.game); close(); render(); } } }, t(l('Rever tutorial', 'Replay tutorial'))),
    ...settings18(() => { close(); go('tut18'); }), // r18 tutorial18
    presetsSettings29(), // r29 REORG (M20): Guiado / Livre / Contemplativo — só apresentação
    settings19(), // r19 B.5
    settings20(), // r20 G6: densidade
    settingsRelics29(store.game), // R29 (relíquias): poucas / normal / muitas / tudo (config da partida)
    h('label', null, t(l('Interrupções', 'Interruptions')), select(p.interrupt23 ?? 'milestones', [{ value: 'decisions' as const, label: t(l('Só decisões', 'Decisions only')) }, { value: 'milestones' as const, label: t(l('Decisões e marcos', 'Decisions and milestones')) }, { value: 'all' as const, label: t(l('Tudo (cada cena abre)', 'Everything (every scene opens)')) }], (v) => { p.interrupt23 = v; INT_PREF23.v = v; savePrefs(); })), // r23 (A)
    settings27(), // r27: atividades jogáveis (jogáveis / só importantes / sempre rápido)
    settingsCut27(), // r27 (K): Cenas: todas / só importantes / desligadas
    settingsAudio28(), // r28 (F4): Som — desligado por padrão
    alertsSettings29(), // r29 REORG (M44): alertas por categoria (preferência, fora do save)
    editorModeSetting31(), // R31 (EDT): Modo editor (testes)
    settingsTrn31(), // R31 onda 5 (TRN): Transições completas / rápidas / desligadas
    ...(store.game ? [h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!store.game.config.assist28, onchange: (e: Event) => { if (store.game) setAssist28(store.game, (e.target as HTMLInputElement).checked); } }), t(l('Modo história (assistido): narrador alivia, socorro no aperto e dicas', 'Story mode (assisted): gentler narrator, bailout when broke and hints')))] : []), // r28 F8 (D2)
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.cutscenes !== false, onchange: (e: Event) => { p.cutscenes = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Mostrar cenas (premiações, críticas, entrevistas)', 'Show scenes (awards, reviews, interviews)'))),
    settingsSkin31(() => { close(); render(); settings(); }), // r31 (C): Estilo: automático pela época / fixo
    settingsRealNames31(), // R31 (X): Nomes e obras reais (só exibição)
    settingsExtras31(), // R31 (N): controle central de frequência e de tom da cultura pop
    settingsLook31(), // R31 (AP): Pressão estética: normal / suave / desligada
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.contrast, onchange: (e: Event) => { p.contrast = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.contrast)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.reducedMotion, onchange: (e: Event) => { p.reducedMotion = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(S.reducedMotion)),
    h('hr'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => { const ok = await saveGame(`slot-${store.game?.signature}`); toast(ok ? t(S.saved) : 'Erro', ok ? 'good' : 'bad'); } }, t(S.save)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveTextDialog(); } }, t(S.exportSave)),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveTextDialog(); } }, t(l('Copiar / colar save', 'Copy / paste save'))),
      h('button', { class: 'btn ghost', onclick: () => { close(); void saveGame('auto'); store.game = null; titleScreen(root, startGame); } }, t(l('Menu inicial', 'Main menu'))),
      h('button', { class: 'btn ghost', onclick: () => { close(); saveManagerModal17((g) => { store.game = g; startGame(); }); } }, t(l('Gerenciar saves', 'Manage saves'))), // r17
      h('button', { class: 'btn ghost', onclick: () => { close(); if (store.game) modal(t(l('Cartão da partida', 'Run card')), runCard17body(store.game)); } }, t(l('Cartão da partida', 'Run card'))), // r17
    ),
    h('p', { class: 'muted small' }, t(l('Atalhos: 1–0 e D trocam de área · Ctrl+Enter avança · Ctrl+K abre a busca · ? lista todos os atalhos · Alt+← volta.', 'Shortcuts: 1–0 and D switch area · Ctrl+Enter advances · Ctrl+K opens search · ? lists every shortcut · Alt+← goes back.'))),
    h('p', { class: 'muted small' }, t(l('Clique com o botão direito (ou toque longo) em nomes para ver ações — Shift+F10 pelo teclado; Ctrl+clique direito mostra o menu do navegador.', 'Right-click (or long-press) names to see actions — Shift+F10 from the keyboard; Ctrl+right-click shows the browser menu.'))), // r27 (CTX)
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
    h('button', { class: 'btn primary', onclick: async () => { try { store.game = await importSaveText(paste.value); close(); render(); toast(t(l('Save carregado.', 'Save loaded.')), 'good'); } catch (er) { toast(saveErrText20(er), 'bad'); } } }, t(l('Carregar save colado', 'Load pasted save'))),
  );
  close = modal(t(l('Save em texto', 'Save as text')), body);
}

/** Paleta de comandos (GDD §24; rodada 15: busca tolerante a acentos, setas, pessoas e todos os artistas visíveis). */
function palette(): void {
  const g = store.game!;
  navMemo = null;
  const mine = new Set(playerActs(g));
  const all17 = navItems();
  const base: PCmd[] = [
    // r17: recentes primeiro, abas da página atual e telas absorvidas pelas páginas de carreira
    ...store17.recent.slice(1, 6).map((id) => all17.find((x) => x.id === id)).filter((x): x is NavItem => !!x).map((a): PCmd => ({ label: a.label, kind: 'recent', icon: a.icon, weight: 7, run: () => go(a.id) })),
    ...[...document.querySelectorAll<HTMLButtonElement>('main [data-tabs] > .tabs > button[role=tab]')].map((b): PCmd => ({ label: `${areaLabel(store.area)} › ${b.textContent?.trim() ?? ''}`, kind: 'area', icon: 'compass', weight: 4, run: () => b.click() })),
    ...Object.keys(ALIAS17).filter((a) => groups().some((g) => g.areas.includes(ALIAS17[a][0]))).map((a): PCmd => ({ label: all17.find((x) => x.id === a)?.label ?? a, kind: 'area', icon: ICON17[a] ?? 'compass', hint: areaLabel(ALIAS17[a][0]), weight: 5, run: () => go(a) })),
    ...groups().flatMap((gr) => groupItems(gr).map((a): PCmd => ({ label: gr.home?.tab && gr.home.area === a.id ? t(gr.label) : a.label, alt: a.alt, kind: 'area', icon: a.icon, hint: t(gr.label) + (a.key ? ` · ${a.key.toUpperCase()}` : ''), weight: 6,
      run: () => { if (gr.home?.tab && gr.home.area === a.id) setTab(gr.home.tab[0], gr.home.tab[1]); go(a.id); } }))),
    // r25: as 6 seções e toda aba interna já vista (pt e en), com o caminho Seção › Página
    ...groups().map((gr): PCmd => ({ label: t(gr.label), alt: altL25(gr.label), kind: 'area', icon: gr.icon, hint: t(l('Seção', 'Section')), weight: 8, run: () => go(home25(gr)) })),
    // r27 UX: os hubs (páginas unificadas) também se acham pelo nome
    ...groups().flatMap((gr) => entries27(gr as NavGroup25).flatMap((e) => (e.kind === 'hub' ? [e] : []))).map((e): PCmd => ({ label: t(e.hub.label), alt: altL25(e.hub.label), kind: 'area', icon: e.hub.icon,
      hint: `${t(secOf27(e.areas[0]).label)} · ${e.areas.map((a) => areaLabel(a)).join(', ')}`, weight: 7, run: () => go(`hub:${e.hub.id}`) })),
    ...searchTabs25(g.year).filter((x) => areaExists(x.area) && all17.some((a) => a.id === x.area)).map((x): PCmd => ({ label: x.label, alt: x.alt, kind: 'tab', icon: 'compass', hint: `${t(secOf27(x.area).label)} › ${areaLabel(x.area)}`, weight: 3,
      run: () => { for (const [k, v] of x.trail) setTab(k, v); setTab(x.key, x.id); go(x.area); } })),
    { label: t(S.advanceMonth), kind: 'action', icon: 'calendar', hint: 'Ctrl+Enter', run: () => doAdvance('month') },
    { label: t(S.advanceQuarter), kind: 'action', icon: 'calendar', run: () => doAdvance('quarter') },
    { label: t(S.advanceEvent), kind: 'action', icon: 'calendar', run: () => doAdvance('event') },
    { label: t(l('Avançar até algo relevante', 'Advance until something relevant')), kind: 'action', icon: 'calendar', run: () => doAdvance('until') },
    { label: t(l('Avançar semana', 'Advance week')), kind: 'action', icon: 'calendar', run: () => doAdvance('week') },
    { label: t(l('Comparar carreiras', 'Compare careers')), kind: 'action', icon: 'chart-up', run: () => compareActs(g, playerActs(g)) },
    { label: t(l('Atalhos de teclado', 'Keyboard shortcuts')), kind: 'action', hint: '?', run: () => shortcutsHelp15(navItems().map((x) => ({ key: x.key, label: x.label }))) },
    { label: t(S.settings), kind: 'action', run: settings },
    ...paletteCmds18(go), // r18 tutorial18: glossário e ajuda no Ctrl+K
    // R31 (A): entradas do menu, lugares e abas das Listas ("Bandeja", "Cofre", "Troféus", "Calendário completo"…)
    ...find31(menuCtx31()).filter((x) => x.area && (x.area === LISTS31 || x.area === 'inbox' || x.area === 'desk' || areaExists(x.area))).map((x): PCmd => ({ label: t(x.label), alt: `${altL25(x.label)} ${x.terms.join(' ')}`, kind: 'area', icon: 'compass', hint: t(x.hint), weight: 9,
      run: () => { if (x.tab) setTab(x.tab[0], x.tab[1]); go(x.area!); } })),
    ...paletteCmds29(), // r29 REORG: as 17 telas canônicas (com aliases), intenções "Quero…", Índice e Central da campanha
    ...paletteCmds20(g), // r20 G4: ações do artista selecionado (mesmo custo/bloqueio do menu Ações ▾)
    ...paletteBase31(g), // R31 (O): favoritos e metas
    ...[...mine].map((id): PCmd => ({ label: g.acts[id].name, kind: 'mine', icon: 'guitar', weight: 12, run: () => inspect.act(id) })),
    // rodada 16: abas extras (Sync, Disputas...) também aparecem no Ir para… — antes só se achavam abrindo a área certa
    ...([['charts', 'chartsHub'], ['market', 'marketHub'], ['media', 'mediaHub'], ['catalog', 'catalogHub'], ['world', 'worldHub']] as const).flatMap(([area, host]) =>
      extraTabs(host, g).map((tb): PCmd => ({ label: tb.label, kind: 'area', icon: tb.icon, hint: navItems().find((x) => x.id === area)?.label, weight: 5, run: () => { setTab(host, tb.id); go(area); } }))),
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
    // R29 (formação): pessoas reais fora da formação inicial — existem sem banda (dá para achar e abrir a ficha)
    for (const id of Object.keys(rw(g).free29 ?? {})) { const p = g.persons[id]; if (p && !actOf[p.id] && p.born <= g.year && p.name.toLowerCase().includes(qq.slice(0, 2))) out.push({ label: p.name, kind: 'person', icon: 'star', hint: t(l('sem banda', 'no band')) + (p.alive ? '' : ' · †'), run: () => openPerson(p.id) }); }
    for (const x of searchRoute16.f?.(g, qq) ?? []) out.push({ label: x.label, kind: 'person', icon: 'star', hint: x.hint, run: () => personRoute16.f?.(x.key) });
    out.push(...paletteCmds20(g, true)); // r20 G4: ações dos outros artistas do elenco
    out.push(...paletteCmds31(g, q)); // R31 (O): "contratar X", "gravar com Y"… abrem o painel rápido na ação
    out.push(...regionCmds5(g, q).map((x): PCmd => ({ label: x.label, kind: 'area', icon: x.icon, hint: x.hint, weight: 6, run: x.run }))); // R31 onda 5 (MAPA)
    out.push(...eggCmds27(g, qq)); // r27 ovos: códigos secretos da busca (payola, hall da fama, 1889…)
    return out;
  };
  palette15(base, search);
}

// rodada 8: aposentadoria sem herdeiros encerra a run fora do avanço do tempo
// r28 (F4): "Encerrar e voltar ao menu" do storyboard do fim do prazo
if (typeof window !== 'undefined') window.addEventListener('vtn-menu28', () => { void saveGame('auto'); store.game = null; titleScreen(root, startGame); });
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
      h('button', { class: 'btn', onclick: () => openStory28(g) }, t(l('Storyboard', 'Storyboard'))), // r28 (F4)
      h('button', { class: 'btn', onclick: () => { document.querySelector('.overlay')?.remove(); store.area = 'diary'; render(); } }, t(S.areaDiary)),
      !insolvent ? h('button', { class: 'btn', onclick: () => { g.flags.sandbox = 1; document.querySelector('.overlay')?.remove(); render(); } }, t(S.sandbox)) : null,
      h('button', { class: 'btn primary', onclick: () => { document.querySelector('.overlay')?.remove(); store.game = null; titleScreen(root, startGame); } }, t(S.newGame)),
    ),
  );
  modal(t(S.endTitle), body, { wide: true });
}

export { HQ_LEVELS };
