// Tela inicial e criação de run: papel, cenário, ano, cidade, modo, narrador, Carta, mutators (GDD §5, §23).

import { CARDS, HQ_LEVELS, MUTATORS, ROLES, STORYTELLERS } from '../data/rules';
import { CITIES, GENRES, l } from '../data/world';
import { S, t, type Lang } from '../i18n/strings';
import type { RunConfig, StartCustom } from '../sim/types';
import { createGame, DEFAULT_LABEL_IDS, labelPool, takeoverCandidates } from '../sim/worldgen';
import { formatMoney } from '../core/money';
import { genreById } from '../data/world';
import { locale } from '../i18n/strings';
import { cityName, toast } from './common';
import { h, select } from './dom';
import { deleteSave, importSave, importSaveText, listSaves, loadGame, savePrefs, store } from './store';
import { prepareNewGame, scenarioButton } from './sys/live/goals';
import { characterCard } from './charCreate';
import { labelsCard } from './newgameLabels';

/** Anos marcantes (rodada 9: lista longa; o campo ao lado aceita qualquer ano de 1920 a 2039). */
const NOTABLE: Record<number, ReturnType<typeof l>> = {
  1920: l('Goma-laca e rádio nascente', 'Shellac and early radio'),
  1927: l('Cinema falado e o jazz na tela', 'Talkies and jazz on screen'),
  1935: l('Era do swing', 'Swing era'),
  1948: l('Nasce o LP', 'The LP is born'),
  1950: l('Single, jukebox e rock\'n\'roll', 'Singles, jukebox and rock\'n\'roll'),
  1954: l('O rock\'n\'roll explode', 'Rock\'n\'roll explodes'),
  1958: l('Bossa nova e estéreo', 'Bossa nova and stereo'),
  1962: l('Bandas, LP e TV', 'Bands, LPs and TV'),
  1964: l('Invasão britânica', 'British Invasion'),
  1967: l('Verão do amor e psicodelia', 'Summer of love and psychedelia'),
  1969: l('Woodstock', 'Woodstock'),
  1973: l('Funk, soul e rock de arena', 'Funk, soul and arena rock'),
  1977: l('Punk e discoteca', 'Punk and disco'),
  1979: l('Hip hop e walkman', 'Hip hop and the walkman'),
  1981: l('MTV e clipes', 'MTV and music videos'),
  1983: l('Chega o CD', 'The CD arrives'),
  1985: l('Live Aid e o pop global', 'Live Aid and global pop'),
  1991: l('Grunge e rap no topo', 'Grunge and rap on top'),
  1995: l('CD no auge', 'The CD at its peak'),
  1999: l('Napster e o pânico digital', 'Napster and the digital panic'),
  2001: l('iPod e loja digital', 'iPod and the digital store'),
  2005: l('YouTube e redes sociais', 'YouTube and social media'),
  2008: l('Streaming nasce', 'Streaming is born'),
  2013: l('Streaming domina', 'Streaming takes over'),
  2020: l('Pandemia e lives', 'Pandemic and livestreams'),
  2025: l('Algoritmos e vídeos curtos', 'Algorithms and short video'),
  2030: l('Arco Neural', 'Neural Arc'),
  2035: l('Vozes sintéticas', 'Synthetic voices'),
};
const DECADE: [number, ReturnType<typeof l>][] = [
  [1920, l('goma-laca e rádio', 'shellac and radio')], [1930, l('swing e rádio', 'swing and radio')], [1940, l('big bands e guerra', 'big bands and war')],
  [1950, l('single e jukebox', 'singles and jukebox')], [1960, l('LP e TV', 'LPs and TV')], [1970, l('discoteca, punk e estádios', 'disco, punk and stadiums')],
  [1980, l('clipes e CD', 'videos and CD')], [1990, l('a era do CD', 'the CD era')], [2000, l('virada digital', 'the digital turn')],
  [2010, l('streaming', 'streaming')], [2020, l('algoritmos e IA', 'algorithms and AI')], [2030, l('Arco Neural', 'Neural Arc')],
];
const START_YEARS: { year: number; label: { pt: string; en: string } }[] = (() => {
  const ys = new Set<number>(Object.keys(NOTABLE).map(Number));
  for (let y = 1920; y <= 2035; y += 5) ys.add(y);
  ys.add(2039);
  return [...ys].sort((a, b) => a - b).map((year) => {
    const lab = NOTABLE[year] ?? [...DECADE].reverse().find(([d]) => year >= d)![1];
    return { year, label: { pt: `${year} — ${lab.pt}`, en: `${year} — ${lab.en}` } };
  });
})();

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
  const fileInput = h('input', { type: 'file', style: 'display:none', onchange: async (e: Event) => {
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
        h('button', { class: 'btn ghost', onclick: async () => { const tx = window.prompt(t(l('Cole o texto do save (JSON ou VTN1:...)', 'Paste the save text (JSON or VTN1:...)'))); if (!tx) return; try { store.game = await importSaveText(tx); onStart(); } catch { toast(t(l('Texto de save inválido.', 'Invalid save text.')), 'bad'); } } }, t(l('Colar save', 'Paste save'))),
        select(store.prefs.lang, [{ value: 'pt' as Lang, label: 'Português (BR)' }, { value: 'en' as Lang, label: 'English' }], (v) => { store.prefs.lang = v; savePrefs(); titleScreen(root, onStart); }, { 'aria-label': t(S.language) }),
      ),
      saves,
      h('p', { class: 'muted small foot' }, t(l('Nomes reais ligados por padrão (Elvis, Beatles, Roberto Carlos…); desligue "Nomes reais" para um universo ficcional.', 'Real names on by default (Elvis, Beatles…); turn off "Real names" for a fictional universe.'))),
    ),
  );
}

/** Início personalizado (rodada 7): tudo opcional; vazio = padrão do cenário. */
function customCard(cfg: RunConfig): HTMLElement {
  const c = (cfg.custom ??= {}) as StartCustom;
  const num = (key: 'cash' | 'personalCash', ph: string) => h('input', { type: 'number', min: 0, step: 1000, placeholder: ph, oninput: (e: Event) => { const v = (e.target as HTMLInputElement).value; if (v === '') delete c[key]; else c[key] = Math.max(0, Number(v)); } });
  const opt = <K extends keyof StartCustom>(key: K, options: { value: string; label: string }[], parse: (v: string) => StartCustom[K]) =>
    select<string>(c[key] === undefined ? '' : String(c[key]), [{ value: '', label: t(l('(padrão do cenário)', '(scenario default)')) }, ...options], (v) => { if (v === '') delete c[key]; else c[key] = parse(v); });
  const repLabel = h('span', null, t(l('(padrão)', '(default)')));
  return h('section', { class: 'card' },
    h('h3', null, t(l('Início personalizado', 'Custom start'))),
    h('p', { class: 'muted small' }, t(l('Deixe em branco para usar o padrão do cenário. Os valores em dinheiro são exatamente os que aparecem no jogo (dólares do ano de início).', 'Leave blank to use the scenario default. Money values are exactly what you will see in game (dollars of the start year).'))),
    h('label', null, t(l('Caixa da empresa', 'Company cash')), num('cash', '45000')),
    h('label', null, t(l('Patrimônio pessoal', 'Personal wealth')), num('personalCash', '5000')),
    h('label', null, t(l('Sede inicial', 'Starting HQ')), opt('hq', HQ_LEVELS.slice(0, 4).map((x, i) => ({ value: String(i), label: t(x.name) })), (v) => Number(v))),
    h('label', null, t(l('Estúdio e mobília iniciais', 'Starting studio and furniture')), opt('studio', [
      { value: 'none', label: t(l('Vazio: mesa, cadeiras e um microfone', 'Empty: a table, chairs and one mic')) },
      { value: 'basic', label: t(l('Básico: bateria, amplificadores, teclado e sofá', 'Basic: drums, amps, keys and a sofa')) },
      { value: 'pro', label: t(l('Completo: estúdio montado e sala confortável', 'Full: studio set up and a comfy lounge')) },
    ], (v) => v as StartCustom['studio'])),
    h('label', null, t(l('Seu artista: formação', 'Your act: line-up')), opt('members', [
      { value: '1', label: t(l('Carreira solo', 'Solo career')) }, { value: '2', label: t(l('Dupla', 'Duo')) },
      { value: '3', label: t(l('Trio', 'Trio')) }, { value: '4', label: t(l('Banda de 4', '4-piece band')) }, { value: '5', label: t(l('Banda de 5', '5-piece band')) }, { value: '6', label: t(l('Banda de 6', '6-piece band')) },
    ], (v) => Number(v))),
    h('label', null, t(l('Seu artista: estágio da carreira', 'Your act: career stage')), opt('level', [
      { value: 'garage', label: t(l('Garagem — nada lançado', 'Garage — nothing released')) },
      { value: 'local', label: t(l('Cena local — um single', 'Local scene — one single')) },
      { value: 'rising', label: t(l('Em ascensão — EP e primeiros fãs', 'Rising — an EP and first fans')) },
      { value: 'established', label: t(l('Estabelecido — discos e um sucesso', 'Established — records and a hit')) },
      { value: 'star', label: t(l('Estrela — discografia e fama', 'Star — discography and fame')) },
    ], (v) => v as StartCustom['level'])),
    h('small', { class: 'muted' }, t(l('Formação e estágio valem para o papel Híbrido (sua banda).', 'Line-up and stage apply to the Hybrid role (your band).'))),
    h('label', null, t(l('Atos já contratados (selo)', 'Acts already signed (label)')), opt('roster', [0, 1, 2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) })), (v) => Number(v))),
    h('label', null, t(l('Funcionários iniciais', 'Starting staff')), opt('staff', [0, 1, 2, 3, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) })), (v) => Number(v))),
    h('label', null, t(l('Mercados abertos', 'Open markets')), opt('markets', [
      { value: 'home', label: t(l('Só o mercado da cidade', 'Home market only')) }, { value: 'region', label: t(l('Mercado da cidade + vizinhos', 'Home + neighbours')) }, { value: 'world', label: t(l('O mundo todo', 'The whole world')) },
    ], (v) => v as StartCustom['markets'])),
    h('label', null, t(l('Reputação inicial', 'Starting reputation')), ' ', repLabel,
      h('input', { type: 'range', min: 0, max: 100, step: 5, value: 35, oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); c.reputation = v; repLabel.textContent = String(v); } })),
  );
}

/** Rodada 9 (11: qualquer gravadora do ano): fundar um selo novo ou assumir uma gravadora existente. */
function takeoverCard(cfg: RunConfig, nameInput: HTMLInputElement, citySel: () => void, onPick: () => void): { el: HTMLElement; refresh: () => void } {
  let on = false;
  let list: ReturnType<typeof takeoverCandidates> = [];
  let q = '';
  const box = h('div', { class: 'tk-list' });
  const SIZE = [l('', ''), l('Pequena', 'Small'), l('Média', 'Mid-size'), l('Grande', 'Major')];
  const search = h('input', { type: 'search', class: 'tk-search', placeholder: t(l('Buscar gravadora ou cidade…', 'Search label or city…')), 'aria-label': t(l('Buscar gravadora', 'Search label')),
    oninput: (e: Event) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); draw(); } }) as HTMLInputElement;
  const pickBtn = ({ label: lb, terms: x, extra }: (typeof list)[number]) => h('button', { type: 'button', class: `pick ${cfg.takeover === lb.id ? 'on' : ''}`, 'aria-pressed': cfg.takeover === lb.id ? 'true' : 'false',
    onclick: () => { cfg.takeover = lb.id; cfg.companyName = lb.name; nameInput.value = lb.name; nameInput.disabled = true; cfg.homeCity = lb.city; citySel(); draw(); onPick(); } },
    h('b', null, lb.name), h('small', null, `${t(SIZE[x.tier])} · ${cityName(lb.city)} · ${t(l('fundada em', 'founded'))} ${lb.founded}`),
    h('small', null, `${t(l('Caixa', 'Cash'))}: ${formatMoney(x.cash, locale())} · ${t(l('Elenco', 'Roster'))}: ${x.roster} · ${t(l('Reputação', 'Reputation'))}: ${x.reputation}`),
    h('small', null, `${t(l('Gêneros', 'Genres'))}: ${x.genres.map((g) => t(genreById[g]?.name)).join(', ') || '—'}`),
    x.debt ? h('small', { class: 'bad' }, `${t(l('Dívida', 'Debt'))}: ${formatMoney(x.debt, locale())} (${formatMoney(x.monthly, locale())}/${t(l('mês', 'month'))})`) : null,
    extra ? h('small', { class: 'muted' }, t(l('Fora das rivais escolhidas: entra no mundo se você a assumir.', 'Not among the chosen rivals: joins the world if you take it over.'))) : null,
    ...x.notes.map((n) => h('small', { class: 'muted' }, t(n))));
  const draw = () => {
    search.hidden = !on;
    if (!on) { box.replaceChildren(); return; }
    if (!list.length) { box.replaceChildren(h('p', { class: 'muted small' }, t(l('Nenhuma gravadora ativa neste começo.', 'No active label in this start.')))); return; }
    const f = list.filter(({ label: lb }) => !q || lb.name.toLowerCase().includes(q) || cityName(lb.city).toLowerCase().includes(q));
    const group = (title: string, xs: typeof list) => xs.length ? [h('h4', null, `${title} (${xs.length})`), h('div', { class: 'card-grid' }, ...xs.map(pickBtn))] : [];
    box.replaceChildren(...group(t(l('Rivais neste mundo', 'Rivals in this world')), f.filter((c) => !c.extra)),
      ...group(t(l('Outras gravadoras já fundadas neste ano', 'Other labels already founded this year')), f.filter((c) => c.extra)),
      ...(f.length ? [] : [h('p', { class: 'muted small' }, t(l('Nada encontrado.', 'Nothing found.')))]));
  };
  const refresh = () => {
    if (!on) return;
    try { list = takeoverCandidates(cfg); } catch { list = []; }
    if (cfg.takeover && !list.some((c) => c.label.id === cfg.takeover)) { delete cfg.takeover; nameInput.disabled = false; citySel(); onPick(); }
    draw();
  };
  const mode = (v: boolean) => { on = v; if (!v) { delete cfg.takeover; nameInput.disabled = false; citySel(); onPick(); } refresh(); draw(); };
  const el = h('section', { class: 'card wide', id: 'ng-takeover' },
    h('h3', null, t(l('Como começar', 'How to start'))),
    h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'tk', checked: true, onchange: () => mode(false) }), h('span', null, h('b', null, t(l('Fundar um selo novo', 'Found a new label'))), h('small', { class: 'muted' }, ` — ${t(l('do zero, com o cenário escolhido.', 'from scratch, with the chosen scenario.'))}`))),
    h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'tk', onchange: () => mode(true) }), h('span', null, h('b', null, t(l('Assumir uma gravadora existente', 'Take over an existing label'))), h('small', { class: 'muted' }, ` — ${t(l('elenco, contratos, catálogo e caixa passam a ser seus; as grandes vêm com dívidas e equipe.', 'roster, contracts, catalog and cash become yours; big ones come with debts and staff.'))}`))),
    h('p', { class: 'muted small' }, t(l('Qualquer gravadora que já exista no ano de início: as rivais do mundo e as demais do catálogo. Os termos dependem do ano, do modo, da semente e dos nomes reais.', 'Any label that already exists in the start year: the world\'s rivals and the rest of the catalog. Terms depend on year, mode, seed and real names.'))),
    search,
    box,
  );
  search.hidden = true;
  return { el, refresh };
}

type Tab = { id: string; name: ReturnType<typeof l>; body: HTMLElement[] };

export function newGameScreen(root: HTMLElement, onStart: () => void): void {
  const cfg: RunConfig = {
    seed: randomSeed(),
    role: 'hybrid',
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
    custom: {},
    realNames: true,
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
  const yearInput = h('input', { type: 'number', min: 1920, max: 2039, value: cfg.startYear, class: 'year-input', 'aria-label': t(l('Ano exato', 'Exact year')), title: t(l('Ano exato de início (1920–2039)', 'Exact start year (1920–2039)')),
    onchange: (e: Event) => { const v = Math.round(Number((e.target as HTMLInputElement).value)); if (v >= 1920 && v <= 2039) { cfg.startYear = v; renderBand(); refreshAll(); } } }) as HTMLInputElement;
  const yearSel = select(cfg.startYear, START_YEARS.map((y) => ({ value: y.year, label: t(y.label) })), (v) => { cfg.startYear = v; yearInput.value = String(v); renderBand(); refreshAll(); });
  const seedInput = h('input', { type: 'text', value: cfg.seed, oninput: (e: Event) => (cfg.seed = (e.target as HTMLInputElement).value || randomSeed()), onchange: () => refreshAll() });
  const nameInput = h('input', { type: 'text', value: cfg.companyName, oninput: (e: Event) => (cfg.companyName = (e.target as HTMLInputElement).value || 'Selo') }) as HTMLInputElement;
  const cityBox = h('span');
  const drawCity = () => cityBox.replaceChildren(select(cfg.homeCity, [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id))).map((c) => ({ value: c.id, label: cityName(c.id) })), (v) => (cfg.homeCity = v), cfg.takeover ? { disabled: true } : undefined));
  drawCity();
  const tk = takeoverCard(cfg, nameInput, drawCity, () => drawSummary());
  const lc = labelsCard(cfg, () => tk.refresh());
  function refreshAll(): void { tk.refresh(); lc.refresh(); drawSummary(); }
  const onYear = (y: number) => { yearInput.value = String(y); renderBand(); refreshAll(); };

  const tabs: Tab[] = [
    { id: 'char', name: l('Personagem', 'Character'), body: [characterCard(cfg)] },
    { id: 'label', name: l('Gravadora e papel', 'Label and role'), body: [
      h('section', { class: 'card' },
        h('label', null, t(S.companyName), nameInput),
        h('fieldset', null, h('legend', null, t(S.role)), ROLES.filter((r) => r.id === 'label' || r.id === 'hybrid').map((r) => h('label', { class: `radio ${r.available ? '' : 'disabled'}` },
          h('input', { type: 'radio', name: 'role', checked: cfg.role === r.id, disabled: !r.available, onchange: () => { cfg.role = r.id; renderBand(); } }),
          h('span', null, h('b', null, t(r.name)), h('small', { class: 'muted' }, ` — ${t(r.desc)}`))))),
        bandBox,
        h('label', null, t(S.scenario), select(cfg.scenario, [
          { value: 'from_zero', label: t(S.scenarioFromZero) },
          { value: 'emerging', label: t(S.scenarioEmerging) },
          { value: 'established', label: t(S.scenarioEstablished) },
        ] as { value: RunConfig['scenario']; label: string }[], (v) => (cfg.scenario = v))),
      ),
      customCard(cfg),
      tk.el,
    ] },
    { id: 'world', name: l('Mundo e ano', 'World and year'), body: [
      h('section', { class: 'card' },
        h('label', null, t(S.startYear), h('div', { class: 'row' }, yearSel, yearInput)),
        h('label', null, t(S.homeCity), cityBox),
        h('label', null, t(S.mode), select(cfg.mode, [
          { value: 'historic', label: t(S.modeHistoric) },
          { value: 'free', label: t(S.modeFree) },
          { value: 'chaos', label: t(S.modeChaos) },
        ] as { value: RunConfig['mode']; label: string }[], (v) => { cfg.mode = v; refreshAll(); })),
        h('label', { class: 'check', title: t(l('Cerca de 740 artistas reais (EUA, Reino Unido, Itália, Brasil e mundo) surgem perto do ano real de estreia, com integrantes e discografia; as gravadoras, festivais, rádios, revistas, plataformas, paradas e prêmios aparecem com os nomes reais (Beatles, Motown, Woodstock, Billboard, Grammy…). Artistas gerados continuam inventados.', 'About 740 real artists (US, UK, Italy, Brazil and worldwide) appear near their real debut year, with members and discographies; labels, festivals, radio, magazines, platforms, charts and awards use their real names (Beatles, Motown, Woodstock, Billboard, Grammy…). Generated artists stay invented.')) },
          h('input', { type: 'checkbox', checked: true, onchange: (e: Event) => { cfg.realNames = (e.target as HTMLInputElement).checked; refreshAll(); } }), t(l('Nomes reais (artistas, selos, festivais, mídia e prêmios)', 'Real names (artists, labels, festivals, media and awards)'))),
        h('label', { class: 'check', title: t(l('Só no modo histórico: artistas reais tendem a morrer no mesmo ano em que morreram na vida real. Desligado, a morte é só simulada (idade, saúde, vícios).', 'Historic mode only: real artists tend to die in the same year they did in real life. Off, death is only simulated (age, health, addiction).')) },
          h('input', { type: 'checkbox', onchange: (e: Event) => (cfg.realFates = (e.target as HTMLInputElement).checked) }), t(l('Mortes nos anos reais (modo histórico)', 'Deaths in their real years (historic mode)'))),
        h('label', null, t(S.seed), h('div', { class: 'row' }, seedInput, h('button', { class: 'btn small ghost', onclick: () => { cfg.seed = randomSeed(); seedInput.value = cfg.seed; refreshAll(); } }, '🎲'))),
      ),
      ...newgameCards().map((f) => f(cfg, onYear)),
    ] },
    { id: 'rivals', name: l('Gravadoras rivais', 'Rival labels'), body: [lc.el] },
    { id: 'rules', name: l('Regras e dificuldade', 'Rules and difficulty'), body: [
      h('section', { class: 'card' },
        h('fieldset', null, h('legend', null, t(S.storyteller)), STORYTELLERS.map((st) => h('label', { class: 'radio' },
          h('input', { type: 'radio', name: 'st', checked: cfg.storyteller === st.id, onchange: () => (cfg.storyteller = st.id) }),
          h('span', null, h('b', null, t(st.name)), h('small', { class: 'muted' }, ` — ${t(st.desc)}`))))),
      ),
      h('section', { class: 'card' },
        h('label', null, t(S.difficulty), select(cfg.difficulty, [
          { value: 'easy', label: t(S.easy) }, { value: 'normal', label: t(S.normal) }, { value: 'hard', label: t(S.hard) },
        ] as { value: RunConfig['difficulty']; label: string }[], (v) => { cfg.difficulty = v; tk.refresh(); })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => (cfg.ironman = (e.target as HTMLInputElement).checked) }), t(S.ironman)),
        h('fieldset', null, h('legend', null, t(S.contentFilters)), SENSITIVE.map((x) => h('label', { class: 'check' },
          h('input', { type: 'checkbox', onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; cfg.contentFilters = on ? [...cfg.contentFilters, x.id] : cfg.contentFilters.filter((y) => y !== x.id); } }),
          t(x.label)))),
      ),
      h('section', { class: 'card wide' }, h('h3', null, t(S.card)), cards),
      h('section', { class: 'card wide' }, h('h3', null, t(S.mutators)), muts),
    ] },
    { id: 'summary', name: l('Resumo', 'Summary'), body: [] },
  ];
  let cur = 0;
  const fullSummary = h('section', { class: 'card wide ng-summary-full' });
  tabs[tabs.length - 1].body.push(fullSummary);
  const side = h('div', { class: 'ng-side-body' });
  const mini = h('span', { class: 'ng-mini muted small' });
  const yesNo = (v: unknown) => t(v ? l('sim', 'yes') : l('não', 'no'));
  const SCN = () => [{ value: 'from_zero', label: t(S.scenarioFromZero) }, { value: 'emerging', label: t(S.scenarioEmerging) }, { value: 'established', label: t(S.scenarioEstablished) }];
  const MODES = () => [{ value: 'historic', label: t(S.modeHistoric) }, { value: 'free', label: t(S.modeFree) }, { value: 'chaos', label: t(S.modeChaos) }];
  const DIFF = () => [{ value: 'easy', label: t(S.easy) }, { value: 'normal', label: t(S.normal) }, { value: 'hard', label: t(S.hard) }];
  const opt = (v: string, xs: { value: string; label: string }[]) => xs.find((x) => x.value === v)?.label ?? v;
  const rows = (): [ReturnType<typeof l>, string, number][] => {
    const ids = cfg.labels?.ids ?? DEFAULT_LABEL_IDS();
    const rivals = cfg.labels?.count ?? labelPool().filter((d) => ids.includes(d.id) && d.founded <= cfg.startYear).length;
    return [
      [l('Personagem', 'Character'), cfg.character?.name || t(l('(sem nome)', '(unnamed)')), 0],
      [S.companyName, cfg.companyName, 1],
      [l('Começo', 'Start'), cfg.takeover ? t(l('assume a gravadora', 'takes over the label')) : t(l('selo novo', 'new label')), 1],
      [S.role, t(ROLES.find((r) => r.id === cfg.role)!.name), 1],
      [S.scenario, opt(cfg.scenario, SCN()), 1],
      [S.startYear, String(cfg.startYear), 2],
      [S.homeCity, cityName(cfg.homeCity), 2],
      [S.mode, opt(cfg.mode, MODES()), 2],
      [l('Nomes reais', 'Real names'), yesNo(cfg.realNames), 2],
      [S.seed, cfg.seed, 2],
      [l('Gravadoras rivais', 'Rival labels'), `${rivals}${cfg.labels?.start === 'equal' ? ` · ${t(l('todos iguais', 'all equal'))}` : ''}`, 3],
      [S.storyteller, t(STORYTELLERS.find((x) => x.id === cfg.storyteller)!.name), 4],
      [S.difficulty, `${opt(cfg.difficulty, DIFF())}${cfg.ironman ? ' · ironman' : ''}`, 4],
      [S.card, t(CARDS.find((c) => c.id === cfg.card)!.name), 4],
      [S.mutators, cfg.mutators.map((id) => t(MUTATORS.find((m) => m.id === id)!.name)).join(', ') || '—', 4],
    ];
  };
  function drawSummary(): void {
    const rs = rows();
    const dl = (edit: boolean) => h('dl', { class: 'ng-dl' }, ...rs.flatMap(([k, v, tab]) => [h('dt', null, t(k)),
      h('dd', null, edit ? h('button', { type: 'button', class: 'linkish', title: t(l('Editar', 'Edit')), onclick: () => go(tab) }, v) : v)]));
    side.replaceChildren(dl(false));
    fullSummary.replaceChildren(h('h3', null, t(l('Resumo da partida', 'Run summary'))), h('p', { class: 'muted small' }, t(l('Clique num valor para voltar à aba e mudar.', 'Click a value to go back to its tab and change it.'))), dl(true));
    mini.textContent = `${cfg.companyName} · ${cfg.startYear} · ${cityName(cfg.homeCity)}`;
  }
  const tabBtns = tabs.map((tb, i) => h('button', { type: 'button', role: 'tab', id: `ng-tab-${tb.id}`, 'aria-controls': `ng-panel-${tb.id}`, class: 'ng-tab', onclick: () => go(i), onkeydown: (e: KeyboardEvent) => {
    const k = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (k === null) return;
    e.preventDefault();
    go((k + tabs.length) % tabs.length, true);
  } }, h('span', { class: 'ng-num' }, String(i + 1)), ' ', t(tb.name)));
  const panels = tabs.map((tb) => h('div', { role: 'tabpanel', id: `ng-panel-${tb.id}`, 'aria-labelledby': `ng-tab-${tb.id}`, class: 'ng-grid ng-panel' }, ...tb.body));
  const back = h('button', { type: 'button', class: 'btn ghost', onclick: () => go(cur - 1) }, '← ' + t(l('Anterior', 'Previous')));
  const next = h('button', { type: 'button', class: 'btn', onclick: () => go(cur + 1) }, t(l('Próximo', 'Next')) + ' →');
  const step = h('span', { class: 'muted small' });
  function go(i: number, focus = false): void {
    cur = Math.max(0, Math.min(tabs.length - 1, i));
    tabBtns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === cur)); b.tabIndex = j === cur ? 0 : -1; b.classList.toggle('on', j === cur); });
    panels.forEach((p, j) => (p.hidden = j !== cur));
    back.disabled = cur === 0;
    next.hidden = cur === tabs.length - 1;
    step.textContent = `${cur + 1}/${tabs.length} · ${t(tabs[cur].name)}`;
    drawSummary();
    if (focus) tabBtns[cur].focus();
    else tabBtns[cur].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  const start = () => {
    prepareNewGame(cfg);
    store.game = createGame(cfg);
    store.area = 'desk';
    store.undoSnapshot = null;
    onStart();
  };
  const startBtn = (extra = '') => h('button', { class: `btn primary big ${extra}`, onclick: start }, t(S.start));
  const wrap = h('div', { class: 'newgame tabbed' },
    h('header', null, h('button', { class: 'btn ghost', onclick: () => titleScreen(root, onStart) }, '← ' + t(S.back)), h('h1', null, t(S.newGame))),
    h('div', { class: 'ng-tabs', role: 'tablist', 'aria-label': t(S.newGame) }, ...tabBtns),
    h('div', { class: 'ng-layout' },
      h('div', { class: 'ng-main' }, ...panels, h('div', { class: 'ng-nav' }, back, step, next)),
      h('aside', { class: 'ng-side card', 'aria-label': t(l('Resumo', 'Summary')) }, h('h3', null, t(l('Resumo', 'Summary'))), side, h('div', { class: 'row center' }, startBtn('ng-start')))),
    h('div', { class: 'ng-bar' }, mini, startBtn('ng-start-bar')),
  );
  // resumo sempre em dia: os handlers dos campos rodam antes deste (borbulha até o contêiner)
  for (const ev of ['input', 'change', 'click']) wrap.addEventListener(ev, () => drawSummary());
  root.replaceChildren(wrap);
  go(0);
}

/** Cartões extras do Novo Jogo (rodada 9: mundo/história prévia). Função içada: segura na ordem de carga. */
export function newgameCards(): ((cfg: RunConfig, onYear: (y: number) => void) => HTMLElement)[] {
  const f = newgameCards as unknown as { l?: ((cfg: RunConfig, onYear: (y: number) => void) => HTMLElement)[] };
  return (f.l ??= []);
}
