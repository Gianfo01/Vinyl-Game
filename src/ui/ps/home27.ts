// Rodada 27 — tela inicial e Nova run rápida no estilo do protótipo "Masters — Pixel Studio".
// Tela inicial: marca grande sobre a sede ilustrada, "Continuar" com o último save, Nova run, Carregar, links
// (cenários, configuração completa, código de run, importar/colar, opções) e, abaixo, perfis e saves com ações
// (carregar, renomear, apagar — sempre com confirmação).
// Nova run rápida: uma tela só (empresa, ano, cidade, atividade, ponto de partida, nível dos rivais, dificuldade) que gera a MESMA
// RunConfig da configuração completa (home27model.ts) e abre a configuração completa pré-preenchida.

import { langToggle5 } from '../r31/lang5';
import { endYearField28 } from '../endyear28'; // r28 (F4)
import { REC_YEARS28, pickStart28 } from '../../sim/start28data';
import { SITS29, sit29ById, sitOfScenario29, start28Fits29, statusLabel29, type Sit29 } from '../../sim/start29data'; // r29
import { RIVS29, riv29ById, statusLine29, type Riv29 } from '../../sim/rivals29data'; // r29: nível dos rivais
import { NAME_DEFAULT29, NS29, VNS29, labelsTag29, venKind29, type N29, type Vn29 } from '../../sim/labels29data'; // r29: gravadoras no início
import type { RunConfig } from '../../sim/types';
import { drawHqCutaway27 } from './hqpx27';
import { CITIES, l, type L } from '../../data/world';
import { S, locale, t } from '../../i18n/strings';
import { formatMoney } from '../../core/money';
import { careerDef } from '../../sim/sys/careers12';
import { YEAR_MAX20, YEAR_MIN20 } from '../../sim/worldpolicy20';
import { cityName, modal, toast } from '../common';
import { h, select } from '../dom';
import { deleteSave, importSave, importSaveText, listSaves, loadGame, lastLoadErr20, saveCompatible27, savePrefs, store, type SaveMeta } from '../store';
import { addProfile17, askNewProfile31, curProfile17, deleteProfile17, lastSave17, mySaves17, oldRow27, profiles17, renameLocal17, renameProfile17, saveErrText20, saveManagerModal17, switchProfile17 } from '../saves17';
import { SaveError20 } from '../../core/save20';
import { pasteCode20 } from '../newgame17';
import { launchRun27, newGameScreen, randomSeed } from '../newgame';
import { scenarioScreen } from '../sys/live/goals';
import { setTutorials19, tutorialsOff19, TUTOFF_LABEL19 } from '../tutoff19';
import { ic } from '../vis';
import { CAREER_SHORT27, DIFFS27, careerOpen27, clampYear27, quickDefaults27, quickRunConfig27, type QuickRun27 } from './home27model';
import { achBadge27, homeAch27 } from '../ach27';
import { profAchCount27 } from '../ach27store';
import './home27.css';
import { quickCharBlock29 } from './char29'; // r29: "Seu personagem" (nome, idade, sexo, instrumentos e banda)
import { charLine29, isArtist29 } from './char29model';
import { clampAge29 } from '../../sim/char29data';
import { askFile, askText } from '../ask31'; // r31 (B): perguntas dentro do jogo
import { dedication31, openCredits31 } from '../r31/credits31'; // R31 (N): dedicatória e créditos
import { baseEditorScreen31, baseLabel31 } from '../base31ui'; // R31 (EDT): editor de base

/** r27: arte da tela inicial e da Nova run = a sede em pixel art do próprio jogo (hqpx27), não ilustração externa. */
const SHOW27: [number, number, string][] = [[2, 1966, 'london'], [3, 1984, 'new_york'], [1, 1956, 'memphis'], [4, 2008, 'sao_paulo'], [0, 1977, 'liverpool'], [3, 1995, 'rio'], [5, 2030, 'tokyo'], [2, 1929, 'chicago']];
function hqArt27(hq: number, year: number, city: string, cls: string, brand = 'MASTERS'): HTMLCanvasElement {
  const cv = h('canvas', { class: cls, 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const c = CITIES.some((x) => x.id === city) ? city : (CITIES[0]?.id ?? '');
  try { drawHqCutaway27(cv, { hq, year, rooms: [], city: c, brand, seedKey: `home27|${hq}|${year}|${c}` }, { minW: 520 }); } catch { /* sem canvas (testes) */ }
  return cv;
}
const showcase27 = (): HTMLCanvasElement => { const [hq, y, c] = SHOW27[Math.floor(Math.random() * SHOW27.length)]; return hqArt27(hq, y, c, 'h27-bg'); };
/** Nível da sede sugerido pela situação inicial (só para a prévia; r29: a escada inteira). */
const HQ_PREV29: Record<Sit29, number> = { zero: 0, emerging: 1, mid: 2, hipster: 1, established: 3, top5: 4, leader: 5, fallen: 3 };
const hqOfStart27 = (sit: Sit29): number => HQ_PREV29[sit] ?? 1;
const PRIMARY27 = ['label', 'musician', 'manager', 'studio', 'festival', 'booking'];
const MORE27 = ['venue', 'publisher', 'media', 'platform'];
/** Troca de tela começa do topo (a rolagem da tela anterior não passa adiante). */
const top27 = () => { try { window.scrollTo(0, 0); } catch { /* sem janela */ } };
const monthName = (m: number) => new Date(2000, m, 1).toLocaleString(locale(), { month: 'short' });
const ago27 = (ts: number) => new Date(ts).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' });

/** Diálogo de escolha (confirmação) dentro do jogo: resolve com o id escolhido ou null (cancelar/Esc/fora). */
export function choose27(title: string, text: string, opts: { id: string; label: string; danger?: boolean }[]): Promise<string | null> {
  return new Promise((res) => {
    let done = false;
    const finish = (v: string | null) => { if (done) return; done = true; res(v); close(); };
    const body = h('div', { class: 'h27-confirm' },
      h('p', null, text),
      h('div', { class: 'row wrap h27-confirm-acts' },
        h('button', { type: 'button', class: 'btn ghost', 'data-choice': 'cancel', onclick: () => finish(null) }, t(l('Cancelar', 'Cancel'))),
        ...opts.map((o) => h('button', { type: 'button', class: `btn ${o.danger ? 'danger h27-danger' : 'primary'}`, 'data-choice': o.id, onclick: () => finish(o.id) }, o.label))));
    const close = modal(title, body, { onClose: () => { if (!done) { done = true; res(null); } } });
  });
}

/** Opções acessíveis já na tela inicial (idioma, tema, texto, tutoriais, contraste, movimento). */
export function options27(redraw: () => void): void {
  const p = store.prefs;
  let close = () => {};
  const body = h('div', { class: 'form h27-opts' },
    h('div', { class: 'h27-langrow' }, h('span', null, t(S.language)), langToggle5((v) => { p.lang = v; savePrefs(); close(); redraw(); options27(redraw); })),
    h('label', null, `${t(S.textSize)}: ${p.textScale}%`, h('input', { type: 'range', min: 90, max: 130, step: 5, value: p.textScale, oninput: (e: Event) => { p.textScale = Number((e.target as HTMLInputElement).value); savePrefs(); } })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: tutorialsOff19(p), onchange: (e: Event) => { setTutorials19(p, !(e.target as HTMLInputElement).checked); savePrefs(); } }), ' ', t(TUTOFF_LABEL19)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.contrast, onchange: (e: Event) => { p.contrast = (e.target as HTMLInputElement).checked; savePrefs(); } }), ' ', t(S.contrast)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.reducedMotion, onchange: (e: Event) => { p.reducedMotion = (e.target as HTMLInputElement).checked; savePrefs(); } }), ' ', t(S.reducedMotion)));
  close = modal(t(l('Opções', 'Options')), body);
}

// ---------------------------------------------------------------- tela inicial

export function homeScreen27(root: HTMLElement, onStart: () => void, at?: 'saves' | 'ach'): void {
  const redraw = () => homeScreen27(root, onStart);
  const redrawSaves = () => homeScreen27(root, onStart, 'saves'); // ações de perfis/saves voltam para a lista
  const play = (g: NonNullable<typeof store.game>) => { store.game = g; onStart(); };
  const loadSlot = async (m: SaveMeta) => {
    const g = await loadGame(m.slot);
    if (!g) return toast(['too_big', 'future', 'schema', 'malformed', 'format', 'old', 'old31'].includes(lastLoadErr20) ? saveErrText20(new SaveError20(lastLoadErr20 as never)) : t(l('Não foi possível carregar.', 'Could not load.')), 'bad');
    play(g);
  };
  // r31 (B): importar por área de arrastar arquivo (com botão), dentro do jogo
  const importFile = async () => {
    const f = await askFile({ title: l('Importar save', 'Import save'), body: l('Arraste o arquivo do save (.json) para cá ou escolha no computador.', 'Drag the save file (.json) here or pick it from your computer.'), accept: '.json,.txt,application/json,text/plain' });
    if (!f) return;
    try { play(await importSave(f)); } catch (er) { toast(saveErrText20(er), 'bad'); }
  };
  const pasteSave = async () => { const tx = await askText({ title: l('Colar save', 'Paste save'), label: l('Cole o texto do save (JSON ou VTN1:...)', 'Paste the save text (JSON or VTN1:...)'), multiline: true, ok: l('Importar', 'Import'), hint: l('Ctrl+Enter importa.', 'Ctrl+Enter imports.') }); if (!tx) return; try { play(await importSaveText(tx)); } catch (er) { toast(saveErrText20(er), 'bad'); } };
  const runCode = () => { const cfg = quickRunConfig27(quickDefaults27(randomSeed(), t(l('Selo Agulha', 'Needle Records')))); pasteCode20(cfg, () => newGameScreen(root, onStart, cfg, 5)); };
  const savesSec = h('section', { class: 'h27-saves', id: 'h27-saves', 'aria-label': t(l('Saves e perfis', 'Saves and profiles')) });
  const redrawAch = () => homeScreen27(root, onStart, 'ach'); // troca de perfil no painel de conquistas
  let achSec: HTMLElement = h('div');
  const toAch = () => { achSec.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); (achSec.querySelector('h2') as HTMLElement | null)?.focus?.(); };
  const toSaves = () => { savesSec.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); (savesSec.querySelector('h2') as HTMLElement | null)?.focus?.(); };

  // "Continuar": cartão com o save mais recente do perfil
  const cont = h('div', { class: 'h27-cont-slot' });
  void lastSave17().then((m) => {
    if (!m || !saveCompatible27(m)) return; // r27 (F): save antigo não "continua" — fica na lista com Excluir
    cont.replaceChildren(h('button', { type: 'button', class: 'h27-cont', onclick: () => void loadSlot(m) },
      h('span', { class: 'h27-cont-k' }, '▶ ', t(S.continue).toUpperCase()),
      h('b', null, m.name || m.company),
      h('small', null, [`${monthName(m.month)} ${m.year}`, m.player, m.cash !== undefined ? formatMoney(m.cash, locale()) : '', m.ironman ? '☠ ironman' : ''].filter(Boolean).join(' · ')),
      h('small', { class: 'h27-cont-ago' }, ago27(m.savedAt))));
  }, (e) => { cont.replaceChildren(h('p', { class: 'h27-warn small', role: 'alert' }, '⚠ ', t(l('Não foi possível ler os saves deste navegador ({e}). Nada foi apagado; veja "Saves & perfis" para tentar de novo.', 'Could not read this browser\'s saves ({e}). Nothing was deleted; see "Saves & profiles" to try again.'), { e: String((e as Error)?.name || e) }))); });

  const link = (label: string, fn: () => void, extra: Record<string, string> = {}) => h('button', { type: 'button', class: 'h27-link', onclick: fn, ...extra }, label);
  const hero = h('section', { class: 'h27-hero' },
    showcase27(),
    h('div', { class: 'h27-shade', 'aria-hidden': 'true' }),
    h('div', { class: 'h27-top' },
      h('span', { class: 'h27-prof' }, '👤 ', curProfile17().name, h('button', { type: 'button', class: 'h27-link h27-achk', title: t(l('Conquistas do perfil', 'Profile achievements')), onclick: () => toAch() }, achBadge27())),
      langToggle5((v) => { store.prefs.lang = v; savePrefs(); redraw(); }, 'h27-lang'),
      h('button', { type: 'button', class: 'h27-link', onclick: () => options27(redraw) }, '⚙ ', t(l('Opções', 'Options')))),
    h('div', { class: 'h27-content' },
      h('p', { class: 'h27-kicker' }, t(l('UM MUNDO VIVE DE MÚSICA', 'A WORLD THAT RUNS ON MUSIC'))),
      h('h1', { class: 'h27-logo' }, t(S.gameTitle).toUpperCase()),
      h('p', { class: 'h27-sub' }, t(l('Toda lenda começa\ncom uma escolha.', 'Every legend starts\nwith a choice.'))),
      h('p', { class: 'h27-desc' }, t(l('Descubra talentos. Produza discos. Ocupe os palcos.\nConstrua uma história que continue a tocar.', 'Discover talent. Make records. Take the stage.\nBuild a story that keeps on playing.'))),
      dedication31(), // R31 (N): dedicatória na abertura (homenagem à família Fossati)
      cont,
      h('div', { class: 'h27-actions' },
        h('button', { type: 'button', class: 'h27-btn h27-primary', onclick: () => quickRunScreen27(root, onStart) }, h('span', { class: 'h27-disc', 'aria-hidden': 'true' }), t(S.newGame).toUpperCase()),
        h('button', { type: 'button', class: 'h27-btn', onclick: toSaves }, '• ', t(l('Carregar', 'Load')))),
      h('div', { class: 'h27-links' },
        link(t(l('Cenários históricos', 'Historical scenarios')), () => scenarioScreen(root, onStart, redraw)),
        link(t(l('Saves & perfis', 'Saves & profiles')), toSaves),
        link(t(l('Conquistas', 'Achievements')), () => toAch(), { 'data-link': 'ach' }),
        link(t(l('Configuração completa', 'Full setup')), () => { newGameScreen(root, onStart); top27(); }),
        link(`${t(l('Editor de base', 'Database editor'))} · ${baseLabel31()}`, () => { baseEditorScreen31(root, redraw); top27(); }, { 'data-link': 'base31' }), // R31 (EDT)
        link(t(l('Usar código de run', 'Use a run code')), runCode),
        link(t(l('Importar arquivo', 'Import file')), () => void importFile()),
        link(t(l('Colar save', 'Paste save')), () => void pasteSave()),
        link(t(l('Créditos', 'Credits')), openCredits31, { 'data-link': 'credits31' }))), // R31 (N)
    h('div', { class: 'h27-foot' }, h('span', null, 'PIXEL STUDIO EDITION'), h('span', null, t(l('1889 — 2040 E ALÉM · SIMULAÇÃO HISTÓRICA & SANDBOX', '1889 — 2040 AND BEYOND · HISTORICAL SIMULATION & SANDBOX')))));

  // ---- perfis e saves
  const profBox = h('div', { class: 'h27-list' });
  const saveBox = h('div', { class: 'h27-list' }, h('p', { class: 'muted small' }, '…'));
  const drawProfiles = () => {
    const cur = curProfile17();
    profBox.replaceChildren(...profiles17().map((p) => h('div', { class: `h27-row ${p.id === cur.id ? 'on' : ''}`, 'data-profile': p.id },
      h('span', { class: 'h27-row-main' }, h('b', null, p.name, p.pin ? ' 🔒' : ''), h('small', { class: 'muted' }, p.id === cur.id ? t(l('perfil atual', 'current profile')) : p.id === 'default' ? t(l('perfil padrão', 'default profile')) : '')),
      h('span', { class: 'h27-acts' },
        p.id === cur.id ? null : h('button', { type: 'button', class: 'btn small', onclick: async () => { if (await switchProfile17(p.id)) redrawSaves(); } }, t(l('Usar', 'Use'))),
        h('button', { type: 'button', class: 'btn small ghost', title: t(l('Renomear', 'Rename')), 'aria-label': `${t(l('Renomear', 'Rename'))}: ${p.name}`, onclick: async () => { const n = await askText({ title: l('Renomear perfil', 'Rename profile'), label: l('Nome do perfil:', 'Profile name:'), default: p.name }); if (n) { renameProfile17(p.id, n); redrawSaves(); } } }, '✎'),
        p.id === 'default' ? null : h('button', { type: 'button', class: 'btn small ghost h27-del', title: t(l('Apagar perfil', 'Delete profile')), 'aria-label': `${t(l('Apagar perfil', 'Delete profile'))}: ${p.name}`, onclick: async () => {
          const n = (await mySavesOf27(p.id)).length;
          const na = profAchCount27(p.id);
          const achTx = na ? ' ' + t(l('As {a} conquista(s) do perfil também serão apagadas.', 'The profile\'s {a} achievement(s) will be deleted too.'), { a: na }) : '';
          const pick = await choose27(t(l('Apagar perfil', 'Delete profile')),
            (n ? t(l('Apagar o perfil "{p}"? Ele tem {n} save(s). Você pode passá-los para "{d}" ou apagá-los junto (sem desfazer).', 'Delete profile "{p}"? It has {n} save(s). You can move them to "{d}" or delete them too (no undo).'), { p: p.name, n, d: profiles17()[0].name })
              : t(l('Apagar o perfil "{p}"? Ele não tem saves.', 'Delete profile "{p}"? It has no saves.'), { p: p.name })) + achTx,
            n ? [{ id: 'move', label: t(l('Apagar perfil e mover saves', 'Delete profile, move saves')) }, { id: 'all', label: t(l('Apagar perfil e saves', 'Delete profile and saves')), danger: true }]
              : [{ id: 'move', label: t(l('Apagar perfil', 'Delete profile')), danger: true }]);
          if (!pick) return;
          try { const r = await deleteProfile17(p.id, pick === 'all'); if (r.ok) toast(t(l('Perfil apagado.', 'Profile deleted.')), 'good'); } catch (e) { toast(String((e as Error)?.message || e), 'bad'); }
          redrawSaves();
        } }, '🗑'))),
    ),
    h('button', { type: 'button', class: 'btn small ghost h27-add', onclick: async () => {
      const prof = await askNewProfile31();
      if (!prof) return;
      const p = addProfile17(prof.name, prof.pin);
      await switchProfile17(p.id);
      redrawSaves();
    } }, '+ ', t(l('Novo perfil', 'New profile'))));
  };
  const drawSaves = async () => {
    let list: SaveMeta[];
    try { list = await mySaves17(); } catch (e) {
      saveBox.replaceChildren(h('p', { class: 'bad small', role: 'alert' }, '⚠ ', t(l('Não foi possível ler os saves deste navegador ({e}). Eles não foram apagados.', 'Could not read this browser\'s saves ({e}). They were not deleted.'), { e: String((e as Error)?.name || e) }), ' ',
        h('button', { type: 'button', class: 'btn small', onclick: () => void drawSaves() }, t(l('Tentar de novo', 'Try again')))));
      return;
    }
    if (!list.length) { saveBox.replaceChildren(h('p', { class: 'muted small' }, t(l('Nenhum save neste perfil ainda. Comece uma Nova run — o jogo salva sozinho.', 'No saves in this profile yet. Start a New run — the game saves by itself.')))); return; }
    const groups = new Map<string, SaveMeta[]>();
    for (const m of list) { const k = m.run ?? m.signature; groups.set(k, [...(groups.get(k) ?? []), m]); }
    saveBox.replaceChildren(...[...groups.values()].map((ms) => h('article', { class: 'h27-run' },
      h('header', null, h('b', null, ms[0].company), h('small', { class: 'muted' }, [ms[0].player, ms[0].ironman ? '☠ ironman' : '', `${ms.length} save(s)`].filter(Boolean).join(' · '))),
      ...ms.map((m) => !saveCompatible27(m) ? oldRow27(m, redrawSaves) : h('div', { class: 'h27-row', 'data-slot': m.slot },
        h('button', { type: 'button', class: 'btn small h27-load', onclick: () => void loadSlot(m) }, '▶ ', `${m.name || (m.kind === 'auto' || m.slot.startsWith('auto') ? t(l('Autosave', 'Autosave')) : t(l('Save', 'Save')))} — ${monthName(m.month)} ${m.year}`),
        h('small', { class: 'muted h27-row-main' }, [m.cash !== undefined ? formatMoney(m.cash, locale()) : '', ago27(m.savedAt)].filter(Boolean).join(' · ')),
        h('span', { class: 'h27-acts' },
          h('button', { type: 'button', class: 'btn small ghost', title: t(l('Renomear', 'Rename')), 'aria-label': t(l('Renomear', 'Rename')), onclick: async () => { const n = await askText({ title: l('Renomear save', 'Rename save'), label: l('Nome do save:', 'Save name:'), default: m.name || m.company, allowEmpty: true }); if (n !== null) { await renameLocal17(m.slot, n); void drawSaves(); } } }, '✎'),
          h('button', { type: 'button', class: 'btn small ghost h27-del', title: t(l('Apagar save', 'Delete save')), 'aria-label': t(l('Apagar save', 'Delete save')), onclick: async () => {
            const ok = await choose27(t(l('Apagar save', 'Delete save')), t(l('Apagar "{n}" ({d})? Não dá para desfazer.', 'Delete "{n}" ({d})? This cannot be undone.'), { n: m.name || m.company, d: `${monthName(m.month)} ${m.year}` }), [{ id: 'yes', label: t(l('Apagar', 'Delete')), danger: true }]);
            if (!ok) return;
            await deleteSave(m.slot);
            toast(t(l('Save apagado.', 'Save deleted.')), 'good');
            redrawSaves();
          } }, '🗑')))))));
  };
  drawProfiles();
  void drawSaves();
  savesSec.append(
    h('div', { class: 'h27-saves-in' },
      h('div', { class: 'h27-panel' }, h('h2', { tabindex: '-1' }, t(l('Perfis', 'Profiles'))),
        h('p', { class: 'muted small' }, t(l('Cada perfil vê só os próprios saves neste navegador.', 'Each profile sees only its own saves in this browser.'))), profBox),
      h('div', { class: 'h27-panel h27-panel-wide' }, h('h2', null, t(l('Saves de {p}', '{p}\'s saves'), { p: curProfile17().name })),
        h('div', { class: 'row wrap h27-tools' },
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => saveManagerModal17(play) }, t(l('Exportar, duplicar e nuvem…', 'Export, duplicate and cloud…'))),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => void importFile() }, t(l('Importar arquivo', 'Import file'))),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => void pasteSave() }, t(l('Colar save', 'Paste save')))),
        saveBox),
      achSec = homeAch27(redrawAch)),
    h('p', { class: 'muted small h27-note' }, t(l('Padrão: nomes reais em um mundo simulado (Elvis, Beatles, Roberto Carlos…) com músicas, contratos e carreiras simulados. Fidelidade histórica, universo ficcional e os outros modos ficam na Configuração completa → Mundo.', 'Default: real names in a simulated world (Elvis, Beatles…) with simulated songs, contracts and careers. Historical fidelity, a fictional universe and the other modes are in Full setup → World.'))));
  root.replaceChildren(h('div', { class: 'h27', id: 'main', role: 'main', tabindex: '-1' }, hero, savesSec));
  if (at === 'saves') savesSec.scrollIntoView?.({ block: 'start' });
  else if (at === 'ach') achSec.scrollIntoView?.({ block: 'start' });
  else top27();
}

const mySavesOf27 = async (profile: string): Promise<SaveMeta[]> => (await listSaves()).filter((m) => (m.profile ?? 'default') === profile);

// ---------------------------------------------------------------- Nova run rápida

export function quickRunScreen27(root: HTMLElement, onStart: () => void, q0?: QuickRun27): void {
  const q: QuickRun27 = q0 ?? quickDefaults27(randomSeed(), t(l('Selo Agulha', 'Needle Records')));
  const redraw = () => quickRunScreen27(root, onStart, q);
  const err = h('p', { class: 'bad small', role: 'alert' });
  const yearErr = h('small', { class: 'bad', role: 'alert' });
  const careerBox = h('div', { class: 'h27-careers', role: 'radiogroup', 'aria-label': t(l('Sua atividade principal', 'Your main activity')) });
  let more = MORE27.includes(q.career);
  // os cartões nascem uma vez e só mudam de estado: trocar o ano e clicar direto num cartão não perde o clique
  const yearTag = new Map<string, HTMLElement>();
  const btns = [...PRIMARY27, ...MORE27].flatMap((id) => {
    const d = careerDef(id);
    if (!d) return [];
    const tag = h('small', null, String(d.from));
    yearTag.set(id, tag);
    return [h('button', { type: 'button', role: 'radio', class: 'h27-career', 'data-career': id, onclick: () => { q.career = id; drawCareers(); } },
      ic(d.icon, 2), h('span', null, t(CAREER_SHORT27[id] ?? d.name)), tag) as HTMLButtonElement];
  });
  const moreBtn = h('button', { type: 'button', class: 'h27-more', onclick: () => { more = !more; drawCareers(); } });
  let afterCareer = () => {}; // r29: o ponto de partida e o status seguem a carreira
  careerBox.append(...btns, moreBtn);
  const drawCareers = () => {
    if (!careerOpen27(q.career, q.startYear)) q.career = 'label';
    if (MORE27.includes(q.career)) more = true;
    for (const b of btns) {
      const id = b.dataset.career!, d = careerDef(id)!, open = careerOpen27(id, q.startYear), on = q.career === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      b.disabled = !open;
      b.hidden = MORE27.includes(id) && !more;
      b.title = open ? `${t(d.name)} — ${t(d.desc)}` : t(l('Abre em {y}', 'Opens in {y}'), { y: d.from });
      yearTag.get(id)!.hidden = open;
    }
    moreBtn.setAttribute('aria-expanded', String(more));
    moreBtn.textContent = more ? t(l('− menos atividades', '− fewer activities')) : t(l('+ mais atividades', '+ more activities'));
    moreBtn.title = t(l('Casa de shows, editora musical, mídia e plataforma', 'Venue, music publisher, media and platform'));
    afterCareer();
  };
  drawCareers();
  const nameIn = h('input', { type: 'text', id: 'h27-name', value: q.companyName, maxlength: 60, oninput: (e: Event) => (q.companyName = (e.target as HTMLInputElement).value) }) as HTMLInputElement;
  const prevArt = h('div', { class: 'h27-prev-art' });
  const sitNow = (): Sit29 => q.start29 ?? sitOfScenario29(q.scenario);
  const drawPrev = () => prevArt.replaceChildren(hqArt27(hqOfStart27(sitNow()), q.startYear, q.homeCity, 'h27-prev-cv', (q.companyName || 'MASTERS').toUpperCase().slice(0, 14)));
  const yearIn = h('input', { type: 'number', id: 'h27-year', min: YEAR_MIN20, max: YEAR_MAX20, step: 1, value: q.startYear, inputmode: 'numeric',
    onchange: (e: Event) => {
      const raw = Number((e.target as HTMLInputElement).value);
      if (!(raw >= YEAR_MIN20 && raw <= YEAR_MAX20)) { yearErr.textContent = t(l('Escolha um ano entre {a} e {b}.', 'Pick a year between {a} and {b}.'), { a: YEAR_MIN20, b: YEAR_MAX20 }); return; }
      yearErr.textContent = '';
      q.startYear = clampYear27(raw);
      if (q.art29 && q.art29.genre === undefined) q.art29.genreK = undefined; // r29: 🎲 do gênero recomeça no novo lugar
      drawCareers(); drawPrev(); endF.refresh();
    } }) as HTMLInputElement;
  // r28 (F4): ano de fim (o Recomendado sugere 25 anos; "Sem fim" = sandbox)
  const endF = endYearField28(() => q.startYear, () => q.runYears ?? REC_YEARS28, (v) => { q.runYears = v; }, 'h27-end');
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
  const citySel = select(q.homeCity, cities.map((c) => ({ value: c.id, label: cityName(c.id) })), (v) => { q.homeCity = v; if (q.art29 && q.art29.genre === undefined) q.art29.genreK = undefined; drawPrev(); charB.refresh(); drawStatus(); }, { id: 'h27-city' });
  // r29: situação inicial (escada zero → líder do mercado); o rótulo segue a carreira ("Artista hipster", "Produtor top 5"…)
  const status = h('p', { class: 'small h27-status', role: 'status', 'aria-live': 'polite' });
  const drawStatus = () => {
    const d = sit29ById(sitNow())!;
    const st28 = pickStart28(q.seed);
    const rv = riv29ById(q.rivals29 ?? 'mix')!;
    const tag = labelsTag29({ seed: q.seed, startYear: q.startYear, careers: { main: [q.career] }, labels29: { n: q.labels29n, vn: q.labels29vn } } as RunConfig); // r29: "· 8 gravadoras"
    const c = q.char29, a = isArtist29(q.career) ? q.art29 : undefined; // r29: "Ana Souza, 22 · Vocal · Guitarra · …"
    const who = c ? `${t(charLine29({ name: c.name, age: clampAge29(c.age), role: (a?.role ?? 'guitar') as never, roles27: a?.extra }, !!a))} · ` : '';
    status.replaceChildren(h('b', null, who, t(statusLine29(q.career, d.id, rv.id)), t(tag)), ' — ', h('span', { class: 'muted' }, t(d.fx)),
      ...(rv.id !== 'mix' ? [h('span', { class: 'muted' }, ` · ${t(l('Rivais', 'Rivals'))}: ${t(rv.fx)}`)] : []),
      ...(start28Fits29(st28.id, d.id) ? [h('span', { class: 'muted' }, ` · ${t(l('Começo sorteado', 'Rolled start'))}: ${t(st28.name)}`)] : []));
  };
  const startSel = select<Sit29>(sitNow(), SITS29.map((d) => ({ value: d.id, label: t(statusLabel29(q.career, d.id)) })), (v) => { q.start29 = v; q.scenario = sit29ById(v)!.base; drawPrev(); charB.refresh(); drawStatus(); }, { id: 'h27-start' });
  // r29: nível dos rivais (mesma escada; "mistura realista" = o mundo de sempre)
  const rivSel = select<Riv29>(q.rivals29 ?? 'mix', RIVS29.map((d) => ({ value: d.id, label: t(d.name) })), (v) => { q.rivals29 = v === 'mix' ? undefined : v; drawStatus(); }, { id: 'h27-rivals' });
  // r29: gravadoras no início (atalho; o número sai da semente e respeita a era) e concorrentes da carreira
  const lbSel = select<N29 | ''>(q.labels29n ?? '', [{ value: '', label: t(NAME_DEFAULT29) }, ...NS29.map((d) => ({ value: d.id, label: t(d.name) }))], (v) => { q.labels29n = v || undefined; drawStatus(); }, { id: 'h27-labels' });
  const venSel = select<Vn29 | ''>(q.labels29vn ?? '', [{ value: '', label: t(l('Padrão', 'Default')) }, ...VNS29.map((d) => ({ value: d.id, label: t(d.name) }))], (v) => { q.labels29vn = v || undefined; drawStatus(); }, { id: 'h27-ven' });
  const venLab = h('span');
  const venField = h('label', { class: 'h27-field', for: 'h27-ven' }, venLab, venSel);
  const drawVen = () => { const vk = venKind29(q.career, q.startYear); venField.hidden = !vk; if (!vk) { q.labels29vn = undefined; venSel.value = ''; } else venLab.textContent = t(l(`Concorrentes no início (${vk.pt[1]})`, `Competitors at the start (${vk.en[1]})`)); };
  // r29: "Seu personagem" segue atividade, ano, cidade e situação enquanto nome e idade forem automáticos
  const charB = quickCharBlock29(q, () => drawStatus());
  afterCareer = () => { drawVen(); charB.refresh(); SITS29.forEach((d, i) => { const o = startSel.options[i]; if (o) o.textContent = t(statusLabel29(q.career, d.id)); }); drawStatus(); };
  afterCareer();
  drawPrev();
  const diffSel = select(q.difficulty, DIFFS27.map((d) => ({ value: d.id, label: t(d.name) })), (v) => (q.difficulty = v), { id: 'h27-diff' });
  let busy = false;
  const go = h('button', { type: 'button', class: 'h27-btn h27-primary h27-go', onclick: () => {
    if (busy) return;
    if (yearErr.textContent) { yearIn.focus(); return; }
    busy = true; err.textContent = '';
    go.disabled = true; go.textContent = t(l('Gerando seu mundo…', 'Generating your world…'));
    setTimeout(() => {
      try { launchRun27(quickRunConfig27(q), onStart); } catch (e) {
        console.error(e);
        busy = false; go.disabled = false; go.textContent = label();
        err.textContent = t(l('Não foi possível gerar o mundo ({e}). Suas escolhas continuam; tente de novo.', 'Could not generate the world ({e}). Your choices are kept; try again.'), { e: String((e as Error)?.message ?? e).slice(0, 120) });
      }
    }, 30);
  } }) as HTMLButtonElement;
  const label = () => `${t(l('Começar minha história', 'Start my story')).toUpperCase()} ▸`;
  go.textContent = label();
  const full = () => { newGameScreen(root, onStart, quickRunConfig27(q), 0); top27(); };
  const code = () => { const cfg = quickRunConfig27(q); pasteCode20(cfg, () => newGameScreen(root, onStart, cfg, 5)); };
  const field = (id: string, lab: L, ctl: HTMLElement, extra?: HTMLElement) => h('label', { class: 'h27-field', for: id }, h('span', null, t(lab)), ctl, extra ?? null);
  root.replaceChildren(h('div', { class: 'h27 h27-start', id: 'main', role: 'main', tabindex: '-1' },
    h('header', { class: 'h27-start-h' },
      h('button', { type: 'button', class: 'h27-back', onclick: () => homeScreen27(root, onStart) }, '← ', t(S.back)),
      h('span', { class: 'h27-mini-logo', 'aria-hidden': 'true' }, t(S.gameTitle).toUpperCase())),
    h('div', { class: 'h27-start-grid' },
      h('figure', { class: 'h27-preview' },
        prevArt,
        h('figcaption', null, h('h2', null, t(l('Seu lugar na música', 'Your place in music'))), h('p', null, t(l('Escolha um começo. A história seguinte é sua.', 'Pick a beginning. The story that follows is yours.'))))),
      h('form', { class: 'h27-form', onsubmit: (e: Event) => { e.preventDefault(); go.click(); } },
        h('p', { class: 'h27-kicker gold' }, t(l('01 / ESCOLHA SEU COMEÇO', '01 / CHOOSE YOUR BEGINNING'))),
        h('h1', null, t(l('O próximo capítulo\ncomeça aqui.', 'The next chapter\nstarts here.'))),
        field('h27-name', l('Nome do selo ou projeto', 'Label or project name'), nameIn),
        h('div', { class: 'h27-2' },
          field('h27-year', l('Ano de início', 'Start year'), yearIn, yearErr),
          field('h27-city', l('Cidade', 'City'), citySel)),
        endF.el,
        h('div', { class: 'h27-field' }, h('span', null, t(l('Sua atividade principal', 'Your main activity'))), careerBox),
        charB.el,
        h('div', { class: 'h27-2' },
          field('h27-start', l('Ponto de partida', 'Starting point'), startSel),
          field('h27-rivals', l('Nível dos rivais', 'Rival level'), rivSel)),
        h('div', { class: 'h27-2' },
          field('h27-labels', l('Gravadoras no início', 'Labels at the start'), lbSel),
          field('h27-diff', l('Dificuldade', 'Difficulty'), diffSel)),
        h('div', { class: 'h27-2' }, venField),
        status,
        h('p', { class: 'muted small h27-hint' }, t(l('Nomes reais em um mundo simulado. Você pode ajustar história, personagem, carreiras simultâneas, gravadoras, regras e modificadores na configuração completa.', 'Real names in a simulated world. You can adjust history, character, simultaneous careers, labels, rules and modifiers in the full setup.'))),
        err,
        go,
        h('div', { class: 'h27-links h27-form-links' },
          h('button', { type: 'button', class: 'h27-link h27-full', onclick: full }, t(l('Configuração completa', 'Full setup')), ' →'),
          h('button', { type: 'button', class: 'h27-link', onclick: code }, '⇥ ', t(l('Usar código de run', 'Use a run code'))),
          h('button', { type: 'button', class: 'h27-link', onclick: () => scenarioScreen(root, onStart, redraw) }, t(l('Cenários históricos', 'Historical scenarios'))))))));
  top27();
  nameIn.focus({ preventScroll: true });
}
