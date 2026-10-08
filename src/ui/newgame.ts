// Tela inicial e criação de run: papel, cenário, ano, cidade, modo, narrador, Carta, mutators (GDD §5, §23).

import { CARDS, MUTATORS, ROLES, STORYTELLERS } from '../data/rules';
import { CITIES, GENRES, l } from '../data/world';
import { S, t, type Lang } from '../i18n/strings';
import type { RunConfig } from '../sim/types';
import { createGame } from '../sim/worldgen';
import { cityName, toast } from './common';
import { h, select } from './dom';
import { deleteSave, importSave, listSaves, loadGame, savePrefs, store } from './store';
import { prepareNewGame, scenarioButton } from './sys/live/goals';
import { characterCard } from './charCreate';

const START_YEARS: { year: number; label: { pt: string; en: string } }[] = [
  { year: 1920, label: l('1920 — Goma-laca e rádio nascente', '1920 — Shellac and early radio') },
  { year: 1950, label: l('1950 — Single, jukebox e rock\'n\'roll', '1950 — Singles, jukebox and rock\'n\'roll') },
  { year: 1962, label: l('1962 — Bandas, LP e TV', '1962 — Bands, LPs and TV') },
  { year: 1980, label: l('1980 — Garagem 1980 (clipes e CD)', '1980 — Garage 1980 (videos and CD)') },
  { year: 2000, label: l('2000 — A virada digital', '2000 — The digital turn') },
  { year: 2030, label: l('2030 — Arco Neural', '2030 — Neural Arc') },
];

const SENSITIVE = [
  { id: 'drugs', label: l('Drogas e dependência', 'Drugs and addiction') },
  { id: 'death', label: l('Morte e luto', 'Death and grief') },
  { id: 'violence', label: l('Violência e acidentes', 'Violence and accidents') },
  { id: 'crime', label: l('Crimes e corrupção', 'Crime and corruption') },
  { id: 'controversy', label: l('Polêmicas e boicotes', 'Controversies and boycotts') },
];

function randomSeed(): string {
  const words = ['vinil', 'shellac', 'groove', 'fita', 'agulha', 'eco', 'reverb', 'neon', 'jukebox', 'fader', 'loop', 'sample'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function titleScreen(root: HTMLElement, onStart: () => void): void {
  const saves = h('div', { class: 'saves' }, h('p', { class: 'muted' }, '…'));
  listSaves().then((list) => {
    saves.replaceChildren(...(list.length ? list.map((m) => h('div', { class: 'save-row' },
      h('button', { class: 'btn', onclick: async () => {
        const g = await loadGame(m.slot);
        if (!g) return toast(t(l('Não foi possível carregar.', 'Could not load.')), 'bad');
        store.game = g;
        onStart();
      } }, `${t(S.continue)}: ${m.company} — ${m.year} (${m.signature})`),
      h('small', { class: 'muted' }, ` ${m.slot} · ${new Date(m.savedAt).toLocaleString()}`),
      h('button', { class: 'icon', 'aria-label': 'apagar', onclick: async () => { await deleteSave(m.slot); titleScreen(root, onStart); } }, '🗑'),
    )) : [h('p', { class: 'muted' }, t(l('Nenhum save ainda.', 'No saves yet.')))]));
  });
  const fileInput = h('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      store.game = await importSave(f);
      onStart();
    } catch {
      toast(t(l('Arquivo inválido.', 'Invalid file.')), 'bad');
    }
  } });
  root.replaceChildren(
    h('div', { class: 'title-screen' },
      h('div', { class: 'disc', 'aria-hidden': 'true' }),
      h('h1', null, t(S.gameTitle)),
      h('p', { class: 'tagline' }, t(S.tagline)),
      h('div', { class: 'row center' },
        h('button', { class: 'btn primary big', onclick: () => newGameScreen(root, onStart) }, t(S.newGame)),
        scenarioButton(root, onStart, () => titleScreen(root, onStart)),
        h('button', { class: 'btn ghost', onclick: () => fileInput.click() }, t(S.importSave)),
        fileInput,
        select(store.prefs.lang, [{ value: 'pt' as Lang, label: 'Português (BR)' }, { value: 'en' as Lang, label: 'English' }], (v) => { store.prefs.lang = v; savePrefs(); titleScreen(root, onStart); }, { 'aria-label': t(S.language) }),
      ),
      saves,
      h('p', { class: 'muted small foot' }, t(l('Universo 100% ficcional. Protótipo jogável do GDD v8 (fases 0–3 e parte da 5).', 'A 100% fictional universe. Playable prototype of GDD v8 (phases 0–3 and part of 5).'))),
    ),
  );
}

export function newGameScreen(root: HTMLElement, onStart: () => void): void {
  const cfg: RunConfig = {
    seed: randomSeed(),
    role: 'label',
    scenario: 'from_zero',
    startYear: 1962,
    mode: 'free',
    storyteller: 'maestro',
    card: 'none',
    mutators: [],
    difficulty: 'normal',
    ironman: false,
    homeCity: 'london',
    companyName: t(l('Selo Agulha', 'Needle Records')),
    bandName: '',
    bandGenre: 'rnr',
    contentFilters: [],
  };
  const bandBox = h('div', { class: 'band-box' });
  const renderBand = () => {
    const show = cfg.role !== 'label';
    const genres = GENRES.filter((g) => g.born <= cfg.startYear).sort((a, b) => t(a.name).localeCompare(t(b.name)));
    if (!genres.find((g) => g.id === cfg.bandGenre)) cfg.bandGenre = genres[0]?.id;
    bandBox.replaceChildren(...(show ? [
      h('label', null, t(S.bandName), h('input', { type: 'text', value: cfg.bandName, placeholder: t(l('(gerado)', '(generated)')), oninput: (e: Event) => (cfg.bandName = (e.target as HTMLInputElement).value) })),
      h('label', null, t(S.bandGenre), select(cfg.bandGenre ?? 'rnr', genres.map((g) => ({ value: g.id, label: t(g.name) })), (v) => (cfg.bandGenre = v))),
    ] : []));
  };
  renderBand();
  const cards = h('div', { class: 'card-grid' });
  const renderCards = () => cards.replaceChildren(...CARDS.map((c) => h('button', { class: `pick ${cfg.card === c.id ? 'on' : ''}`, onclick: () => { cfg.card = c.id; renderCards(); } }, h('b', null, t(c.name)), h('small', null, t(c.passive)), h('small', { class: 'muted' }, t(c.goal)))));
  renderCards();
  const muts = h('div', { class: 'mut-grid' }, MUTATORS.map((m) => h('label', { class: 'check', title: t(m.desc) },
    h('input', { type: 'checkbox', onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; cfg.mutators = on ? [...cfg.mutators, m.id] : cfg.mutators.filter((x) => x !== m.id); } }),
    h('span', null, t(m.name), h('small', { class: 'muted' }, ` — ${t(m.desc)}`)))));
  const seedInput = h('input', { type: 'text', value: cfg.seed, oninput: (e: Event) => (cfg.seed = (e.target as HTMLInputElement).value || randomSeed()) });
  root.replaceChildren(
    h('div', { class: 'newgame' },
      h('header', null, h('button', { class: 'btn ghost', onclick: () => titleScreen(root, onStart) }, '← ' + t(S.back)), h('h1', null, t(S.newGame))),
      h('div', { class: 'ng-grid' },
        h('section', { class: 'card' },
          h('label', null, t(S.companyName), h('input', { type: 'text', value: cfg.companyName, oninput: (e: Event) => (cfg.companyName = (e.target as HTMLInputElement).value || 'Selo') })),
          h('fieldset', null, h('legend', null, t(S.role)), ROLES.map((r) => h('label', { class: `radio ${r.available ? '' : 'disabled'}` },
            h('input', { type: 'radio', name: 'role', checked: cfg.role === r.id, disabled: !r.available, onchange: () => { cfg.role = r.id; renderBand(); } }),
            h('span', null, h('b', null, t(r.name)), h('small', { class: 'muted' }, ` — ${t(r.desc)}`))))),
          bandBox,
          h('label', null, t(S.scenario), select(cfg.scenario, [
            { value: 'from_zero', label: t(S.scenarioFromZero) },
            { value: 'emerging', label: t(S.scenarioEmerging) },
            { value: 'established', label: t(S.scenarioEstablished) },
          ] as { value: RunConfig['scenario']; label: string }[], (v) => (cfg.scenario = v))),
          h('label', null, t(S.startYear), select(cfg.startYear, START_YEARS.map((y) => ({ value: y.year, label: t(y.label) })), (v) => { cfg.startYear = v; renderBand(); })),
          h('label', null, t(S.homeCity), select(cfg.homeCity, [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id))).map((c) => ({ value: c.id, label: cityName(c.id) })), (v) => (cfg.homeCity = v))),
        ),
        h('section', { class: 'card' },
          h('label', null, t(S.mode), select(cfg.mode, [
            { value: 'historic', label: t(S.modeHistoric) },
            { value: 'free', label: t(S.modeFree) },
            { value: 'chaos', label: t(S.modeChaos) },
          ] as { value: RunConfig['mode']; label: string }[], (v) => (cfg.mode = v))),
          h('fieldset', null, h('legend', null, t(S.storyteller)), STORYTELLERS.map((st) => h('label', { class: 'radio' },
            h('input', { type: 'radio', name: 'st', checked: cfg.storyteller === st.id, onchange: () => (cfg.storyteller = st.id) }),
            h('span', null, h('b', null, t(st.name)), h('small', { class: 'muted' }, ` — ${t(st.desc)}`))))),
          h('label', null, t(S.difficulty), select(cfg.difficulty, [
            { value: 'easy', label: t(S.easy) }, { value: 'normal', label: t(S.normal) }, { value: 'hard', label: t(S.hard) },
          ] as { value: RunConfig['difficulty']; label: string }[], (v) => (cfg.difficulty = v))),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => (cfg.ironman = (e.target as HTMLInputElement).checked) }), t(S.ironman)),
          h('label', null, t(S.seed), h('div', { class: 'row' }, seedInput, h('button', { class: 'btn small ghost', onclick: () => { cfg.seed = randomSeed(); seedInput.value = cfg.seed; } }, '🎲'))),
          h('fieldset', null, h('legend', null, t(S.contentFilters)), SENSITIVE.map((x) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; cfg.contentFilters = on ? [...cfg.contentFilters, x.id] : cfg.contentFilters.filter((y) => y !== x.id); } }),
            t(x.label)))),
        ),
        characterCard(cfg),
        h('section', { class: 'card wide' }, h('h3', null, t(S.card)), cards),
        h('section', { class: 'card wide' }, h('h3', null, t(S.mutators)), muts),
      ),
      h('div', { class: 'row center' }, h('button', { class: 'btn primary big', onclick: () => {
        prepareNewGame(cfg);
        store.game = createGame(cfg);
        store.area = 'desk';
        store.undoSnapshot = null;
        onStart();
      } }, t(S.start))),
    ),
  );
}
