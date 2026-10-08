// Metas: cenários históricos (tela própria a partir da tela inicial), desafio da semana com placar
// local e código de compartilhamento, editor de universo (JSON), conquistas e museu do selo.

import { CITIES, GENRES, l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  ACHIEVEMENTS, CHALLENGE_YEARS, MEDAL_NAME, SAMPLE_PACK, SCENARIOS, liveOf, scenarioById, scenarioConfig, scenarioProgress, setNextGameSetup, shareCode, validatePack,
  weekKeyOf, weeklyChallenge, type Medal, type UniversePack,
} from '../../../sim/sys/live';
import type { GameState, RunConfig } from '../../../sim/types';
import { createGame } from '../../../sim/worldgen';
import { $, N, cityName, genreName, pill, rerender, section, toast } from '../../common';
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
  return h('button', { class: 'btn big', onclick: () => scenarioScreen(root, onStart, back) }, '🏅 ', t(l('Cenários e desafios', 'Scenarios and challenges')));
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
    h('header', null, h('button', { class: 'btn ghost', onclick: back }, '← ', t(l('Voltar', 'Back'))), h('h1', null, t(l('Cenários e desafios', 'Scenarios and challenges')))),
    h('label', null, t(l('Nome do selo', 'Label name')), ' ', h('input', { type: 'text', value: screen.company, placeholder: t(l('Selo Agulha', 'Needle Records')), oninput: (e: Event) => (screen.company = (e.target as HTMLInputElement).value) })),
    tabs('lv-title', [
      { id: 'scen', label: t(l('Cenários históricos', 'Historical scenarios')), icon: 'trophy', render: scen },
      { id: 'week', label: t(l('Desafio da semana', 'Weekly challenge')), icon: 'calendar', render: () => challengePanel(onStart) },
      { id: 'pack', label: t(l('Editor de universo', 'Universe editor')), icon: 'globe', render: () => universeEditor(redraw) },
    ], redraw),
  ));
}

// ---------------------------------------------------------------- desafio da semana

function parseCode(code: string): { week: string; score: number; sig: string } | null {
  const m = code.trim().match(/^VTN-(\d{4}-W\d{2})·(\d+)·(.+)$/);
  return m ? { week: m[1], score: Number(m[2]), sig: m[3] } : null;
}

function challengePanel(onStart?: () => void): HTMLElement {
  const week = weekKeyOf(new Date());
  const ch = weeklyChallenge(week, baseConfig(screen.company));
  const all = readLS<BoardRow[]>(BOARD_KEY, []);
  const cmp = h('p', { class: 'small', 'aria-live': 'polite' });
  return h('div', null,
    h('h3', null, t(l('Semana {w}', 'Week {w}'), { w: week })),
    h('p', { class: 'small muted' }, t(l('Mesma seed e mesmas regras para todo mundo nesta semana. Jogue {n} anos e compare a pontuação pelo código.', 'Same seed and rules for everyone this week. Play {n} years and compare scores by code.'), { n: CHALLENGE_YEARS })),
    h('ul', null, ch.rules.map((r) => h('li', null, t(r)))),
    h('p', { class: 'small' }, t(l('Seed: {s}', 'Seed: {s}'), { s: ch.cfg.seed })),
    onStart ? h('button', { class: 'btn primary', onclick: () => {
      setNextGameSetup({ challenge: { code: ch.code, week, years: CHALLENGE_YEARS, rules: ch.rules } });
      startGame(ch.cfg, onStart);
    } }, ic('flag'), ' ', t(l('Jogar o desafio', 'Play the challenge'))) : null,
    h('h4', null, t(l('Placar local', 'Local scoreboard'))),
    all.length ? h('table', { class: 'tbl compact' }, h('tbody', null, all.slice(0, 12).map((x) => {
      const code = `VTN-${x.week}·${x.score}·${x.sig}`;
      return h('tr', { class: x.week === week ? '' : 'muted' }, h('td', null, x.week), h('td', null, h('b', null, N(x.score))), h('td', null, x.company), h('td', null, h('code', null, code)),
        h('td', null, h('button', { class: 'btn small ghost', onclick: () => { void navigator.clipboard?.writeText(code).then(() => toast(t(l('Código copiado.', 'Code copied.')), 'good'), () => undefined); } }, t(l('Copiar', 'Copy')))));
    }))) : h('p', { class: 'small muted' }, t(l('Nenhuma pontuação ainda.', 'No scores yet.'))),
    h('label', null, t(l('Comparar com o código de um amigo', 'Compare with a friend\'s code')), h('input', { type: 'text', placeholder: 'VTN-2026-W41·12345·ABCD-1999', oninput: (e: Event) => {
      const p = parseCode((e.target as HTMLInputElement).value);
      if (!p) return cmp.replaceChildren(t(l('Código inválido.', 'Invalid code.')));
      const mine = Math.max(0, ...all.filter((x) => x.week === p.week).map((x) => x.score));
      cmp.replaceChildren(t(l('Semana {w}: amigo {a} × você {b} — {r}', 'Week {w}: friend {a} × you {b} — {r}'), { w: p.week, a: N(p.score), b: N(mine), r: mine > p.score ? t(l('você vence!', 'you win!')) : mine === p.score ? t(l('empate', 'tie')) : t(l('amigo vence', 'friend wins')) }));
    } })),
    cmp,
  );
}

// ---------------------------------------------------------------- editor de universo

function universeEditor(redraw: () => void): HTMLElement {
  const ps = packStore();
  const p = ps.pack;
  const save = () => { writeLS(PACK_KEY, ps); redraw(); };
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id))).map((c) => ({ value: c.id, label: cityName(c.id) }));
  const genres = [...GENRES].sort((a, b) => genreName(a.id).localeCompare(genreName(b.id))).map((g) => ({ value: g.id, label: genreName(g.id) }));
  const nl = { name: '', city: 'london', family: 'B' as 'A' | 'B' | 'C' | 'D' };
  const na = { name: '', genre: 'rnr', city: 'london', members: 4, fame: 10, signed: false };
  const ns = { city: 'london', genre: 'rnr', strength: 10 };
  const ne = { year: 1970, month: 0, pt: '', en: '', textPt: '', cash: 0, genre: '', mult: 1.2 };
  const json = h('textarea', { class: 'lv-json', rows: 8, 'aria-label': 'JSON' }, JSON.stringify(p, null, 1));
  const v = validatePack(p);
  const remove = (k: keyof Pick<UniversePack, 'labels' | 'acts' | 'scenes' | 'events'>, i: number) => h('button', { class: 'btn small ghost', 'aria-label': t(l('Remover', 'Remove')), onclick: () => { (p[k] as unknown[]).splice(i, 1); save(); } }, '✕');
  const input = (o: Record<string, unknown>, k: string, type = 'text', label?: L) => h('input', { type, value: String(o[k] ?? ''), 'aria-label': label ? t(label) : k, oninput: (e: Event) => { const x = (e.target as HTMLInputElement).value; o[k] = type === 'number' ? Number(x) : x; } });
  return h('div', { class: 'lv-universe' },
    h('p', { class: 'small muted' }, t(l('Crie selos rivais, artistas iniciais, cenas locais e eventos. O pacote é aplicado ao criar a próxima partida (normal, cenário ou desafio). Cidades novas ficaram de fora: o mapa usa coordenadas fixas — use cenas para dar vida a uma cidade existente.', 'Create rival labels, starting artists, local scenes and events. The pack is applied when creating the next game (normal, scenario or challenge). New cities are left out: the map uses fixed coordinates — use scenes to bring an existing city to life.'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: ps.enabled, onchange: (e: Event) => { ps.enabled = (e.target as HTMLInputElement).checked; save(); } }), h('b', null, t(l('Usar este pacote na próxima partida', 'Use this pack in the next game')))),
    h('label', null, t(l('Nome do pacote', 'Pack name')), h('input', { type: 'text', value: p.name, onchange: (e: Event) => { p.name = (e.target as HTMLInputElement).value; save(); } })),
    'pt' in v ? h('p', { class: 'small warn' }, t(v)) : h('p', { class: 'small good' }, t(l('Pacote válido.', 'Valid pack.'))),
    h('h4', null, t(l('Selos rivais', 'Rival labels'))),
    h('ul', null, p.labels.map((x, i) => h('li', null, `${x.name} · ${cityName(x.city)} · ${x.family} `, remove('labels', i)))),
    h('div', { class: 'row' }, input(nl, 'name', 'text', l('Nome', 'Name')), select(nl.city, cities, (c) => (nl.city = c)), select(nl.family, (['A', 'B', 'C', 'D'] as const).map((f) => ({ value: f, label: f })), (f) => (nl.family = f)),
      h('button', { class: 'btn small', onclick: () => { if (!nl.name.trim()) return; p.labels.push({ name: nl.name, city: nl.city, family: nl.family, focus: [] }); save(); } }, '+')),
    h('h4', null, t(l('Artistas iniciais', 'Starting artists'))),
    h('ul', null, p.acts.map((x, i) => h('li', null, `${x.name} · ${genreName(x.genre)} · ${cityName(x.city)} · ★${x.fame}${x.signed ? ' · ✍' : ''} `, remove('acts', i)))),
    h('div', { class: 'row' }, input(na, 'name', 'text', l('Nome', 'Name')), select(na.genre, genres, (g) => (na.genre = g)), select(na.city, cities, (c) => (na.city = c)),
      select(na.members, [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n} 👤` })), (n) => (na.members = n)), select(na.fame, [0, 5, 10, 20, 35, 50].map((n) => ({ value: n, label: `★${n}` })), (n) => (na.fame = n)),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => (na.signed = (e.target as HTMLInputElement).checked) }), t(l('no seu selo', 'on your label'))),
      h('button', { class: 'btn small', onclick: () => { if (!na.name.trim()) return; p.acts.push({ ...na }); save(); } }, '+')),
    h('h4', null, t(l('Cenas locais', 'Local scenes'))),
    h('ul', null, p.scenes.map((x, i) => h('li', null, `${cityName(x.city)} · ${genreName(x.genre)} · ${x.strength} `, remove('scenes', i)))),
    h('div', { class: 'row' }, select(ns.city, cities, (c) => (ns.city = c)), select(ns.genre, genres, (g) => (ns.genre = g)), select(ns.strength, [5, 10, 20, 30].map((n) => ({ value: n, label: String(n) })), (n) => (ns.strength = n)),
      h('button', { class: 'btn small', onclick: () => { p.scenes.push({ ...ns }); save(); } }, '+')),
    h('h4', null, t(l('Eventos personalizados', 'Custom events'))),
    h('ul', null, p.events.map((x, i) => h('li', null, `${x.month + 1}/${x.year} · ${t(x.title)}${x.cash ? ` · US$ ${x.cash}` : ''}${x.genre ? ` · ${genreName(x.genre)} ×${x.genreMult}` : ''} `, remove('events', i)))),
    h('div', { class: 'row' }, input(ne, 'year', 'number', l('Ano', 'Year')), select(ne.month, Array.from({ length: 12 }, (_, i) => ({ value: i, label: String(i + 1) })), (m) => (ne.month = m)),
      input(ne, 'pt', 'text', l('Título (pt)', 'Title (pt)')), input(ne, 'en', 'text', l('Título (en)', 'Title (en)')), input(ne, 'textPt', 'text', l('Texto', 'Text')), input(ne, 'cash', 'number', l('Dinheiro (US$ reais)', 'Cash (real US$)')),
      select(ne.genre, [{ value: '', label: t(l('— gênero —', '— genre —')) }, ...genres], (g) => (ne.genre = g)),
      h('button', { class: 'btn small', onclick: () => { if (!ne.pt.trim()) return; p.events.push({ year: ne.year, month: ne.month, title: { pt: ne.pt, en: ne.en || ne.pt }, text: { pt: ne.textPt, en: ne.textPt }, cash: ne.cash || undefined, genre: ne.genre || undefined, genreMult: ne.genre ? ne.mult : undefined }); save(); } }, '+')),
    h('h4', null, t(l('Exportar / importar JSON', 'Export / import JSON'))),
    json,
    h('div', { class: 'row' },
      h('button', { class: 'btn small', onclick: () => { void navigator.clipboard?.writeText(JSON.stringify(p, null, 1)).then(() => toast(t(l('JSON copiado.', 'JSON copied.')), 'good'), () => undefined); } }, t(l('Copiar JSON', 'Copy JSON'))),
      h('button', { class: 'btn small', onclick: () => {
        try {
          const parsed = validatePack(JSON.parse((json as HTMLTextAreaElement).value));
          if ('pt' in parsed) return toast(t(parsed), 'bad');
          ps.pack = parsed;
          save();
          toast(t(l('Pacote importado.', 'Pack imported.')), 'good');
        } catch {
          toast(t(l('JSON inválido.', 'Invalid JSON.')), 'bad');
        }
      } }, t(l('Importar do texto', 'Import from text'))),
      h('button', { class: 'btn small ghost', onclick: () => { ps.pack = JSON.parse(JSON.stringify(SAMPLE_PACK)); save(); } }, t(l('Carregar exemplo', 'Load sample'))),
      h('button', { class: 'btn small ghost', onclick: () => {
        const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `${p.name || 'universo'}.json` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } }, t(l('Baixar .json', 'Download .json'))),
    ),
  );
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
      { id: 'run', label: t(l('Cenário e desafio', 'Scenario and challenge')), icon: 'flag', render: () => scenarioPanel(s) },
      { id: 'ach', label: t(l('Conquistas', 'Achievements')), icon: 'trophy', badge: liveOf(s).achNew.length || undefined, render: () => achievementsPanel(s) },
      { id: 'museum', label: t(l('Museu do selo', 'Label museum')), icon: 'building', render: () => museumView(s) },
      { id: 'week', label: t(l('Desafio da semana', 'Weekly challenge')), icon: 'calendar', render: () => challengePanel() },
      { id: 'pack', label: t(l('Editor de universo', 'Universe editor')), icon: 'globe', render: () => universeEditor(() => rerender()) },
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
