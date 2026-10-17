// R31 · onda 5 (INI, EXP-10) — TELA INICIAL com arte própria (mock `docs/r31/mocks/onda5/onda5-mock-inicio.png`):
// a cena do palco (stage5px) da época e da cidade da última partida salva (ou sorteadas), logo MASTERS em pixel,
// menu (Nova run, Continuar, Carregar, Cenários, Opções), links (código de run, conquistas, créditos, idioma) e a
// dedicatória. A tela antiga (ps/home27) continua por trás: o interruptor `exp5.ini` desligado volta a ela, e
// "Perfis e saves" abre a lista completa dela.

import { l } from '../../data/world';
import { S, locale, t, type Lang } from '../../i18n/strings';
import { formatMoney } from '../../core/money';
import { SaveError20 } from '../../core/save20';
import { h, select } from '../dom';
import { modal, toast } from '../common';
import { importSave, importSaveText, lastLoadErr20, loadGame, saveCompatible27, savePrefs, store, type SaveMeta } from '../store';
import { lastSave17, mySaves17, saveErrText20 } from '../saves17';
import { askFile, askText } from '../ask31';
import { pasteCode20 } from '../newgame17';
import { newGameScreen, randomSeed } from '../newgame';
import { scenarioScreen } from '../sys/live/goals';
import { homeAch27 } from '../ach27';
import { dedication31, openCredits31 } from './credits31';
import { baseEditorScreen31 } from '../base31ui';
import { homeScreen27, options27 } from '../ps/home27';
import { quickDefaults27, quickRunConfig27 } from '../ps/home27model';
import { last5 } from './ini5sw';
import { logo5, mountStage5 } from './stage5ui';
import { quickRun5Screen } from './newrun5';
import './home5.css';

/** Épocas e cidades da vitrine quando não há partida salva (sorteio só de interface). */
export const SHOW5: [number, string][] = [[1905, 'rio'], [1927, 'chicago'], [1956, 'memphis'], [1962, 'london'], [1967, 'san_francisco'], [1977, 'new_york'], [1984, 'london'], [1995, 'rio'], [2008, 'sao_paulo'], [2025, 'new_york'], [2032, 'tokyo']];
const monthName = (m: number) => new Date(2000, m, 1).toLocaleString(locale(), { month: 'short' });
const top5 = () => { try { window.scrollTo(0, 0); } catch { /* sem janela */ } };

/** Época e cidade da cena: a última partida salva neste perfil, senão uma da vitrine. */
export function homeScene5(): { year: number; city: string; career: string } {
  const last = last5();
  if (last) return last;
  const [year, city] = SHOW5[Math.floor(Math.random() * SHOW5.length)];
  return { year, city, career: 'label' };
}

export function homeScreen5(root: HTMLElement, onStart: () => void): void {
  const redraw = () => homeScreen5(root, onStart);
  const play = (g: NonNullable<typeof store.game>) => { store.game = g; onStart(); };
  const loadSlot = async (m: SaveMeta) => {
    const g = await loadGame(m.slot);
    if (!g) return toast(['too_big', 'future', 'schema', 'malformed', 'format', 'old', 'old31'].includes(lastLoadErr20) ? saveErrText20(new SaveError20(lastLoadErr20 as never)) : t(l('Não foi possível carregar.', 'Could not load.')), 'bad');
    play(g);
  };
  const runCode = () => { const cfg = quickRunConfig27(quickDefaults27(randomSeed(), t(l('Selo Agulha', 'Needle Records')))); pasteCode20(cfg, () => newGameScreen(root, onStart, cfg, 5)); };
  const sc = homeScene5();
  const stage = mountStage5({ year: sc.year, city: sc.city, career: sc.career, lang: store.prefs.lang === 'en' ? 'en' : 'pt' }, 'h5-stage');

  const btn = (label: string, fn: () => void, cls = '', extra: Record<string, string> = {}) => h('button', { type: 'button', class: `h5-b ${cls}`, onclick: fn, ...extra }, label);
  const cont = btn(t(S.continue).toUpperCase(), () => undefined, '', { 'data-h5': 'continue', disabled: 'true' }) as HTMLButtonElement;
  cont.title = t(l('Nenhuma partida salva neste perfil ainda.', 'No saved run in this profile yet.'));
  void lastSave17().then((m) => {
    if (!m || !saveCompatible27(m)) return;
    cont.disabled = false;
    cont.title = [m.name || m.company, `${monthName(m.month)} ${m.year}`, m.player, m.cash !== undefined ? formatMoney(m.cash, locale()) : ''].filter(Boolean).join(' · ');
    cont.onclick = () => void loadSlot(m);
  }, () => { cont.title = t(l('Não foi possível ler os saves deste navegador.', 'Could not read this browser\'s saves.')); });

  const link = (label: string, fn: () => void, extra: Record<string, string> = {}) => h('button', { type: 'button', class: 'h5-l', onclick: fn, ...extra }, label);
  const lang = select(store.prefs.lang, [{ value: 'pt' as Lang, label: 'PT' }, { value: 'en' as Lang, label: 'EN' }], (v) => { store.prefs.lang = v; savePrefs(); redraw(); }, { 'aria-label': t(S.language), class: 'h5-lang' });
  root.replaceChildren(h('div', { class: 'h5', id: 'main', role: 'main', tabindex: '-1' },
    stage.el,
    h('div', { class: 'h5-shade', 'aria-hidden': 'true' }),
    h('header', { class: 'h5-head' },
      h('h1', { class: 'h5-h1', 'aria-label': `${t(S.gameTitle)}: ${t(S.gameSubtitle)}` }, logo5(t(S.gameTitle).toUpperCase())),
      h('p', { class: 'h5-sub' }, t(S.gameSubtitle).toUpperCase()),
      h('p', { class: 'h5-tag' }, t(l('UM MUNDO VIVE DE MÚSICA · 1889 – 2040', 'A WORLD THAT RUNS ON MUSIC · 1889 – 2040')))),
    h('nav', { class: 'h5-menu', 'aria-label': t(l('Menu inicial', 'Main menu')) },
      btn(t(S.newGame).toUpperCase(), () => quickRun5Screen(root, onStart), 'h5-main', { 'data-h5': 'new' }),
      cont,
      btn(t(l('CARREGAR', 'LOAD')), () => loadModal5(root, onStart, play, loadSlot), '', { 'data-h5': 'load' }),
      btn(t(l('CENÁRIOS', 'SCENARIOS')), () => { scenarioScreen(root, onStart, redraw); top5(); }, '', { 'data-h5': 'scen' }),
      btn(t(l('OPÇÕES', 'OPTIONS')), () => options27(redraw), '', { 'data-h5': 'opts' })),
    h('div', { class: 'h5-links' },
      link(t(l('Usar código de run', 'Use a run code')), runCode),
      link(t(l('Conquistas', 'Achievements')), () => { let close = () => {}; close = modal(t(l('Conquistas', 'Achievements')), homeAch27(() => { close(); redraw(); }), { wide: true }); }, { 'data-link': 'ach' }),
      link(t(l('Créditos', 'Credits')), openCredits31, { 'data-link': 'credits31' }),
      lang),
    dedication31('h5-ded'),
    h('footer', { class: 'h5-foot' },
      h('span', null, 'PIXEL STUDIO EDITION', ' · ', link(t(l('Editor de base', 'Database editor')), () => { baseEditorScreen31(root, redraw); top5(); }, { 'data-link': 'base31' })),
      h('span', null, 'R32'))));
  fitHead5(root, stage);
  top5();
}

/** O título nunca cobre o letreiro do palco (AO VIVO / RÁDIO / STREAM): o canvas usa object-fit cover (corta em cima
 *  nas janelas largas e baixas), então mede onde o letreiro caiu na tela e sobe/encolhe o cabeçalho até caber acima dele. */
function fitHead5(root: HTMLElement, stage: { el: HTMLCanvasElement; signTop: () => number; floorY: () => number }): void {
  const head = root.querySelector<HTMLElement>('.h5-head'), logo = head?.querySelector<HTMLElement>('canvas');
  if (!head || !logo) return;
  const fit = () => {
    if (!head.isConnected) { window.removeEventListener('resize', fit); return; }
    const cv = stage.el;
    head.style.top = ''; logo.style.width = ''; cv.style.objectPosition = '';
    const W = cv.width, H = cv.height;
    let r = cv.getBoundingClientRect();
    if (!W || !H || !r.height) return;
    const k = Math.max(r.width / W, r.height / H), extra = r.height - H * k; // < 0: o cover corta em cima/embaixo
    const signAt = (py: number) => r.top + extra * py + stage.signTop() * k - 8; // folga acima dos cabos
    let hr = head.getBoundingClientRect();
    if (hr.bottom <= signAt(0.7)) return;
    // 1) mostra mais céu (corta mais da plateia embaixo), até 25%, sem o piso do palco descer até os botões
    const menu = root.querySelector<HTMLElement>('.h5-menu')?.getBoundingClientRect().top ?? Infinity;
    const floorAt = (y: number) => r.top + extra * y + stage.floorY() * k;
    let py = 0.7;
    while (py > 0.25 && hr.bottom > signAt(py) && floorAt(py - 0.05) <= menu - 4) py -= 0.05;
    cv.style.objectPosition = `center ${Math.round(py * 100)}%`;
    r = cv.getBoundingClientRect();
    const sign = signAt(py);
    if (hr.bottom <= sign) return;
    // 2) sobe o cabeçalho; 3) só então encolhe o logo
    head.style.top = `${Math.max(Math.max(6, r.top + 6), hr.top - (hr.bottom - sign))}px`;
    hr = head.getBoundingClientRect();
    if (hr.bottom <= sign) return;
    const lb = logo.getBoundingClientRect();
    logo.style.width = `${Math.max(160, lb.width * Math.max(0.3, (lb.height - (hr.bottom - sign)) / lb.height))}px`;
  };
  window.addEventListener('resize', fit);
  requestAnimationFrame(fit);
}

/** "Carregar": saves do perfil (mais recentes primeiro), importar e a lista completa (perfis, renomear, apagar). */
function loadModal5(root: HTMLElement, onStart: () => void, play: (g: NonNullable<typeof store.game>) => void, loadSlot: (m: SaveMeta) => Promise<void>): void {
  const list = h('div', { class: 'h5-saves' }, h('p', { class: 'muted small' }, '…'));
  let close = () => {};
  const importFile = async () => {
    const f = await askFile({ title: l('Importar save', 'Import save'), body: l('Arraste o arquivo do save (.json) para cá ou escolha no computador.', 'Drag the save file (.json) here or pick it from your computer.'), accept: '.json,.txt,application/json,text/plain' });
    if (!f) return;
    try { close(); play(await importSave(f)); } catch (er) { toast(saveErrText20(er), 'bad'); }
  };
  const pasteSave = async () => { const tx = await askText({ title: l('Colar save', 'Paste save'), label: l('Cole o texto do save (JSON ou VTN1:...)', 'Paste the save text (JSON or VTN1:...)'), multiline: true, ok: l('Importar', 'Import') }); if (!tx) return; try { close(); play(await importSaveText(tx)); } catch (er) { toast(saveErrText20(er), 'bad'); } };
  void mySaves17().then((ms) => {
    const ok = ms.filter(saveCompatible27).slice(0, 12);
    list.replaceChildren(...(ok.length ? ok.map((m) => h('button', { type: 'button', class: 'h5-save', 'data-slot': m.slot, onclick: () => { close(); void loadSlot(m); } },
      h('b', null, m.name || m.company), h('small', null, [`${monthName(m.month)} ${m.year}`, m.player, m.cash !== undefined ? formatMoney(m.cash, locale()) : '', m.kind === 'auto' || m.slot.startsWith('auto') ? t(l('autosave', 'autosave')) : ''].filter(Boolean).join(' · '))))
      : [h('p', { class: 'muted small' }, t(l('Nenhum save neste perfil ainda. Comece uma Nova run — o jogo salva sozinho.', 'No saves in this profile yet. Start a New run — the game saves by itself.')))]));
  }, (e) => list.replaceChildren(h('p', { class: 'bad small', role: 'alert' }, t(l('Não foi possível ler os saves deste navegador ({e}). Eles não foram apagados.', 'Could not read this browser\'s saves ({e}). They were not deleted.'), { e: String((e as Error)?.name || e) }))));
  close = modal(t(l('Carregar partida', 'Load a run')), h('div', { class: 'h5-load' }, list,
    h('div', { class: 'row wrap h5-load-acts' },
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => void importFile() }, t(l('Importar arquivo', 'Import file'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => void pasteSave() }, t(l('Colar save', 'Paste save'))),
      h('button', { type: 'button', class: 'btn small', onclick: () => { close(); homeScreen27(root, onStart, 'saves'); } }, t(l('Perfis e saves (renomear, apagar, exportar)…', 'Profiles and saves (rename, delete, export)…'))))));
}
