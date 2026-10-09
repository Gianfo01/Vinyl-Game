// Metas: cenários históricos (tela própria a partir da tela inicial), conquistas e museu do selo.

import { l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  ACHIEVEMENTS, MEDAL_NAME, SCENARIOS, liveOf, scenarioById, scenarioConfig, scenarioProgress, setNextGameSetup, shareCode, validatePack,
  type Medal, type UniversePack,
} from '../../../sim/sys/live';
import type { GameState, RunConfig } from '../../../sim/types';
import { createGame } from '../../../sim/worldgen';
import { $, N, cityName, pill, rerender, section, toast } from '../../common';
import { h, select } from '../../dom';
import { registerArea, registerCutscene } from '../../registry';
import { store } from '../../store';
import { chips, ic, meter, stat, tabs } from '../../vis';
import { museumView } from './museum';

void $;

// ---------------------------------------------------------------- armazenamento local (try/catch)

function readLS<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
}
function writeLS(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* armazenamento indisponível */
  }
}

const PACK_KEY = 'vtn:live:pack';
const BOARD_KEY = 'vtn:live:board';
const MEDAL_KEY = 'vtn:live:medals';

interface PackStore { enabled: boolean; pack: UniversePack }
interface BoardRow { week: string; score: number; company: string; sig: string; savedAt: number }

function packStore(): PackStore {
  return readLS<PackStore>(PACK_KEY, { enabled: false, pack: { name: 'Meu universo', version: 1, labels: [], acts: [], scenes: [], events: [] } });
}
function activePack(): UniversePack | undefined {
  const ps = packStore();
  if (!ps.enabled) return undefined;
  const v = validatePack(ps.pack);
  return 'pt' in v ? undefined : v;
}

/** Chamado pela tela de nova partida antes de createGame: aplica o pacote de universo ativo. */
export function prepareNewGame(_cfg: RunConfig): void {
  setNextGameSetup({ pack: activePack() });
}

function recordBoard(s: GameState): void {
  const c = liveOf(s).challenge;
  if (!c?.done) return;
  const rows = readLS<BoardRow[]>(BOARD_KEY, []);
  if (rows.some((x) => x.sig === s.signature && x.week === c.week)) return;
  rows.push({ week: c.week, score: c.done.score, company: s.config.companyName, sig: s.signature, savedAt: Date.now() });
  rows.sort((a, b) => b.score - a.score);
  writeLS(BOARD_KEY, rows.slice(0, 30));
}

function recordMedal(s: GameState): void {
  const run = liveOf(s).scenario;
  if (!run?.done) return;
  const m = readLS<Record<string, Medal>>(MEDAL_KEY, {});
  const rank: Record<Medal, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };
  if (rank[run.done.medal] > rank[m[run.id] ?? 'none']) {
    m[run.id] = run.done.medal;
    writeLS(MEDAL_KEY, m);
  }
}

const MEDAL_ICON: Record<Medal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '—' };

function baseConfig(company: string): RunConfig {
  const words = ['vinil', 'groove', 'fita', 'agulha', 'eco', 'neon', 'jukebox', 'fader'];
  return {
    seed: `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 1e6).toString(36)}`, role: 'label', scenario: 'from_zero', startYear: 1962, mode: 'historic', storyteller: 'maestro',
    card: 'none', mutators: [], difficulty: 'normal', ironman: false, homeCity: 'london', companyName: company || t(l('Selo Agulha', 'Needle Records')), bandName: '', bandGenre: 'rnr', contentFilters: [],
  };
}

function startGame(cfg: RunConfig, onStart: () => void): void {
  store.game = createGame(cfg);
  store.area = 'desk';
  store.undoSnapshot = null;
  onStart();
}

// ---------------------------------------------------------------- tela de cenários (tela inicial)

const screen = { company: '' };

/** Botão "Cenários" da tela inicial. */
export function scenarioButton(root: HTMLElement, onStart: () => void, back: () => void): HTMLElement {
  return h('button', { class: 'btn big', onclick: () => scenarioScreen(root, onStart, back) }, '🏅 ', t(l('Cenários históricos', 'Historical scenarios')));
}

export function scenarioScreen(root: HTMLElement, onStart: () => void, back: () => void): void {
  const redraw = () => scenarioScreen(root, onStart, back);
  const medals = readLS<Record<string, Medal>>(MEDAL_KEY, {});
  const scen = () => h('div', { class: 'lv-scen-grid' }, SCENARIOS.map((d) => h('article', { class: 'card lv-scen' },
    h('h3', null, t(d.name), ' ', h('span', { title: t(l('Melhor medalha', 'Best medal')) }, MEDAL_ICON[medals[d.id] ?? 'none'])),
    h('p', null, pill(`${d.startYear}→${d.endYear}`), pill(cityName(d.homeCity))),
    h('p', { class: 'small' }, t(d.desc)),
    h('p', { class: 'small' }, h('b', null, t(l('Meta: ', 'Goal: '))), t(d.goal)),
    h('p', { class: 'small muted' }, `🥉 ${d.tiers[0]} · 🥈 ${d.tiers[1]} · 🥇 ${d.tiers[2]} ${t(d.unit)}`),
    h('button', { class: 'btn primary', onclick: () => {
      setNextGameSetup({ scenarioId: d.id, pack: activePack() });
      startGame(scenarioConfig(d, baseConfig(screen.company)), onStart);
    } }, t(l('Jogar cenário', 'Play scenario'))),
  )));
  root.replaceChildren(h('div', { class: 'newgame lv-scenarios' },
    h('header', null, h('button', { class: 'btn ghost', onclick: back }, '← ', t(l('Voltar', 'Back'))), h('h1', null, t(l('Cenários históricos', 'Historical scenarios')))),
    h('label', null, t(l('Nome do selo', 'Label name')), ' ', h('input', { type: 'text', value: screen.company, placeholder: t(l('Selo Agulha', 'Needle Records')), oninput: (e: Event) => (screen.company = (e.target as HTMLInputElement).value) })),
    tabs('lv-title', [
      { id: 'scen', label: t(l('Cenários históricos', 'Historical scenarios')), icon: 'trophy', render: scen },
    ], redraw),
  ));
}

// ---------------------------------------------------------------- área "Metas" (tecla F)

function scenarioPanel(s: GameState): HTMLElement {
  const pr = scenarioProgress(s);
  const lv = liveOf(s);
  const c = lv.challenge;
  if (c?.done) recordBoard(s);
  if (pr?.run.done) recordMedal(s);
  return h('div', null,
    pr ? section(t(pr.def.name),
      h('p', { class: 'small' }, t(pr.def.desc)),
      h('p', null, h('b', null, t(l('Meta: ', 'Goal: '))), t(pr.def.goal)),
      chips(stat('trophy', `${pr.value} ${t(pr.def.unit)}`, l('Progresso', 'Progress')), stat('calendar', pr.run.done ? '✓' : `${pr.yearsLeft}`, l('Anos restantes', 'Years left')), stat('star', MEDAL_ICON[pr.medal], l('Medalha atual', 'Current medal'))),
      meter('trophy', l('Rumo ao ouro', 'Toward gold'), Math.min(100, (pr.value / pr.def.tiers[2]) * 100)),
      h('p', { class: 'small muted' }, `🥉 ${pr.def.tiers[0]} · 🥈 ${pr.def.tiers[1]} · 🥇 ${pr.def.tiers[2]} · ${t(l('prazo: dezembro de {y}', 'deadline: December {y}'), { y: pr.run.endYear })}`),
      pr.run.done ? h('p', { class: pr.run.done.medal === 'none' ? 'bad' : 'good' }, t(l('Resultado: {m}.', 'Result: {m}.'), { m: MEDAL_NAME[pr.run.done.medal] })) : null,
    ) : section(t(l('Cenário', 'Scenario')), h('p', { class: 'muted small' }, t(l('Esta partida é livre. Cenários históricos começam pela tela inicial (Cenários e desafios).', 'This is a free game. Historical scenarios start from the title screen (Scenarios and challenges).')))),
    c ? section(t(l('Desafio {c}', 'Challenge {c}'), { c: c.code }),
      h('ul', null, c.rules.map((r) => h('li', null, t(r)))),
      c.done ? h('div', null, h('p', null, t(l('Pontuação final: {p}', 'Final score: {p}'), { p: N(c.done.score) })), h('code', { class: 'lv-code' }, shareCode(c, s.signature)),
        h('button', { class: 'btn small', onclick: () => { void navigator.clipboard?.writeText(shareCode(c, s.signature)).then(() => toast(t(l('Código copiado.', 'Code copied.')), 'good'), () => undefined); } }, t(l('Copiar código', 'Copy code'))))
        : h('p', { class: 'small' }, t(l('Termina em dezembro de {y}.', 'Ends in December {y}.'), { y: c.endYear })),
    ) : null,
    lv.pack ? section(t(l('Universo personalizado', 'Custom universe')), h('p', null, lv.pack)) : null,
  );
}

function achievementsPanel(s: GameState): HTMLElement {
  const lv = liveOf(s);
  const fresh = new Set(lv.achNew);
  lv.achNew = [];
  const got = ACHIEVEMENTS.filter((a) => lv.ach[a.id] !== undefined).length;
  return section(t(l('Conquistas ({n}/{m})', 'Achievements ({n}/{m})'), { n: got, m: ACHIEVEMENTS.length }),
    h('div', { class: 'cards' }, ACHIEVEMENTS.map((a) => {
      const on = lv.ach[a.id] !== undefined;
      const hidden = a.hidden && !on;
      return h('div', { class: `tile lv-ach ${on ? 'on' : 'locked'} ${fresh.has(a.id) ? 'fresh' : ''}` },
        h('div', { class: 'tile-ic' }, hidden ? h('span', { 'aria-hidden': 'true' }, '❔') : ic(a.icon, 2)),
        h('div', { class: 'tile-body' }, h('b', null, hidden ? '???' : t(a.name)), h('small', null, hidden ? t(l('Conquista escondida.', 'Hidden achievement.')) : t(a.desc)),
          on ? h('small', { class: 'good' }, '✓ ', fresh.has(a.id) ? t(l('nova!', 'new!')) : '') : null));
    })),
  );
}

registerArea({
  id: 'goals', label: l('Metas', 'Goals'), icon: 'trophy', key: 'f',
  badge: (s) => liveOf(s).achNew.length || undefined,
  render: (s) => h('div', { class: 'panel lv-goals' },
    tabs('lv-goals', [
      { id: 'run', label: t(l('Cenário', 'Scenario')), icon: 'flag', render: () => scenarioPanel(s) },
      { id: 'ach', label: t(l('Conquistas', 'Achievements')), icon: 'trophy', badge: liveOf(s).achNew.length || undefined, render: () => achievementsPanel(s) },
      { id: 'museum', label: t(l('Museu do selo', 'Label museum')), icon: 'building', render: () => museumView(s) },
    ], () => rerender()),
  ),
});

// ---------------------------------------------------------------- cenas de resultado

registerCutscene('scenarioResult', (s, cs, close) => {
  recordMedal(s);
  const d = cs.data as { scenarioId: string; medal: Medal; value: number; failed?: L };
  const def = scenarioById[d.scenarioId];
  return h('div', { class: 'lv-result' },
    h('div', { class: `lv-medal ${d.medal}`, 'aria-hidden': 'true' }, MEDAL_ICON[d.medal]),
    h('h3', null, t(l('Medalha: {m}', 'Medal: {m}'), { m: MEDAL_NAME[d.medal] })),
    d.failed ? h('p', { class: 'bad' }, t(d.failed)) : null,
    def ? h('p', null, t(l('{v} {u} (bronze {a}, prata {b}, ouro {c}).', '{v} {u} (bronze {a}, silver {b}, gold {c}).'), { v: d.value, u: def.unit, a: def.tiers[0], b: def.tiers[1], c: def.tiers[2] })) : null,
    h('p', { class: 'small' }, t(l('Você pode continuar jogando livremente.', 'You can keep playing freely.'))),
    h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue'))),
  );
});

registerCutscene('challengeResult', (s, cs, close) => {
  recordBoard(s);
  const c = liveOf(s).challenge;
  const code = c ? shareCode(c, s.signature) : '';
  return h('div', { class: 'lv-result' },
    h('div', { class: 'lv-medal gold', 'aria-hidden': 'true' }, '🏁'),
    h('h3', null, t(l('{p} pontos', '{p} points'), { p: N(Number(cs.data.score)) })),
    h('p', null, t(l('Compartilhe o código:', 'Share the code:'))),
    h('code', { class: 'lv-code' }, code),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => { void navigator.clipboard?.writeText(code).then(() => toast(t(l('Código copiado.', 'Code copied.')), 'good'), () => undefined); } }, t(l('Copiar', 'Copy'))),
      h('button', { class: 'btn primary', onclick: close }, t(l('Fechar', 'Close')))),
  );
});

void select;
