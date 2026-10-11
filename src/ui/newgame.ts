// Tela inicial e criação de run: papel, cenário, ano, cidade, modo, narrador, Carta, mutators (GDD §5, §23).

import { DIR17, FREEDOM17, type Freedom17 } from '../sim/director17';
import { CARDS, HQ_LEVELS, MUTATORS, ROLES, STORYTELLERS } from '../data/rules';
import { CITIES, GENRES, l } from '../data/world';
import { realFounded } from '../data/realnames';
import { S, t, type Lang } from '../i18n/strings';
import type { RunConfig, StartCustom } from '../sim/types';
import { createGame, DEFAULT_LABEL_IDS, labelPool, takeoverCandidates } from '../sim/worldgen';
import { formatMoney } from '../core/money';
import { genreById } from '../data/world';
import { locale } from '../i18n/strings';
import { cityName, toast } from './common';
import { h, select } from './dom';
import { importSave, importSaveText, loadGame, savePrefs, store } from './store';
import { prepareNewGame, scenarioButton, scenarioScreen } from './sys/live/goals';
import { characterCard } from './charCreate';
import { labelsCard } from './newgameLabels';
import { careerCard, careerSummary } from './sys/careers12';
import { START_YEARS13 } from './ngdata13';
import { TUTOFF_HINT19, TUTOFF_LABEL19, setTutorials19, tutorialsOff19 } from './tutoff19';
import { addHelp, hl } from './newgame13';
import { charPreview17, copyCode20, diffCard17, pasteCode20, policyLine20, presetBar17, restoreDefault20, runCard17, startCard17, summaryExtra17, worldCard17 } from './newgame17';
import { lastSave17, profileBar17, saveErrText20, saveManager17 } from './saves17';
import { scenarioById } from '../sim/sys/live';
import { WORLDS17, newRunConfig20, notes17, resolveWorld20 } from '../sim/start17';
import { YEAR_MAX20, YEAR_MIN20 } from '../sim/worldpolicy20';
import './newgame20.css';

/** Anos de início com nomes únicos (rodada 13: ver ngdata13.ts; o campo ao lado aceita qualquer ano de 1889 a 2039). */
const START_YEARS = START_YEARS13;

const SENSITIVE = [
  { id: 'drugs', label: l('Drogas e dependência', 'Drugs and addiction') },
  { id: 'death', label: l('Morte e luto', 'Death and grief') },
  { id: 'violence', label: l('Violência e acidentes', 'Violence and accidents') },
  { id: 'crime', label: l('Crimes e corrupção', 'Crime and corruption') },
  { id: 'controversy', label: l('Polêmicas e boicotes', 'Controversies and boycotts') },
  { id: 'romance', label: l('Traição, armário e escândalos amorosos', 'Infidelity, closet and romance scandals') },
];

function randomSeed(): string {
  const words = ['vinil', 'shellac', 'groove', 'fita', 'agulha', 'eco', 'reverb', 'neon', 'jukebox', 'fader', 'loop', 'sample'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function titleScreen(root: HTMLElement, onStart: () => void): void {
  // r17: gerenciador completo (perfis, autosave por partida, nuvem por pessoa) e "Continuar" com o save mais recente
  const play = (g: NonNullable<typeof store.game>) => { store.game = g; onStart(); };
  const cont = h('span');
  void lastSave17().then((m) => { if (m) cont.replaceChildren(h('button', { class: 'btn primary big', onclick: async () => { const g = await loadGame(m.slot); if (!g) return toast(t(l('Não foi possível carregar.', 'Could not load.')), 'bad'); play(g); } }, `▶ ${t(S.continue)}: ${m.name || m.company} — ${m.year}`)); }, (e) => { cont.replaceChildren(h('p', { class: 'bad small', role: 'alert' }, '⚠ ', t(l('Não foi possível ler os saves deste navegador ({e}). Nada foi apagado; abra "Saves" para tentar de novo.', 'Could not read this browser\'s saves ({e}). Nothing was deleted; open "Saves" to try again.'), { e: String((e as Error)?.name || e) }))); });
  const saves = h('details', { class: 'saves sv17-wrap' }, h('summary', null, t(l('Saves, perfis e nuvem', 'Saves, profiles and cloud'))), saveManager17(play, { profiles: false }));
  const fileInput = h('input', { type: 'file', style: 'display:none', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      store.game = await importSave(f);
      onStart();
    } catch (er) {
      toast(saveErrText20(er), 'bad');
    }
  } });
  root.replaceChildren(
    h('div', { class: 'title-screen' },
      h('div', { class: 'disc', 'aria-hidden': 'true' }),
      h('h1', null, t(S.gameTitle)),
      h('p', { class: 'tagline' }, t(S.tagline)),
      profileBar17(() => titleScreen(root, onStart)),
      h('div', { class: 'row center' }, tutToggle19()),
      h('div', { class: 'row center' },
        cont,
        h('button', { class: 'btn primary big', onclick: () => newGameScreen(root, onStart) }, t(S.newGame)),
        scenarioButton(root, onStart, () => titleScreen(root, onStart)),
        h('button', { class: 'btn ghost', onclick: () => fileInput.click() }, t(S.importSave)),
        fileInput,
        h('button', { class: 'btn ghost', onclick: async () => { const tx = window.prompt(t(l('Cole o texto do save (JSON ou VTN1:...)', 'Paste the save text (JSON or VTN1:...)'))); if (!tx) return; try { store.game = await importSaveText(tx); onStart(); } catch (er) { toast(saveErrText20(er), 'bad'); } } }, t(l('Colar save', 'Paste save'))),
        select(store.prefs.lang, [{ value: 'pt' as Lang, label: 'Português (BR)' }, { value: 'en' as Lang, label: 'English' }], (v) => { store.prefs.lang = v; savePrefs(); titleScreen(root, onStart); }, { 'aria-label': t(S.language) }),
      ),
      saves,
      h('p', { class: 'muted small foot' }, t(l('Padrão: Reais em mundo aleatório — nomes reais (Elvis, Beatles, Roberto Carlos…) com músicas, contratos e carreiras simulados. Fidelidade histórica, universo ficcional e os outros modos ficam em Novo Jogo → Mundo.', 'Default: Real names, random world — real names (Elvis, Beatles…) with simulated songs, contracts and careers. Historical fidelity, a fictional universe and the other modes are in New Game → World.'))),
    ),
  );
}

/** Início personalizado (rodada 7): tudo opcional; vazio = padrão do cenário. */
function customCard(cfg: RunConfig): HTMLElement {
  const c = (cfg.custom ??= {}) as StartCustom;
  const num = (key: 'cash' | 'personalCash', ph: string) => h('input', { type: 'number', min: 0, step: 1000, placeholder: ph, value: c[key] ?? '', oninput: (e: Event) => { const v = (e.target as HTMLInputElement).value; if (v === '') delete c[key]; else c[key] = Math.max(0, Number(v)); } });
  const opt = <K extends keyof StartCustom>(key: K, options: { value: string; label: string }[], parse: (v: string) => StartCustom[K]) =>
    select<string>(c[key] === undefined ? '' : String(c[key]), [{ value: '', label: t(l('(padrão do cenário)', '(scenario default)')) }, ...options], (v) => { if (v === '') delete c[key]; else c[key] = parse(v); });
  const repLabel = h('span', null, c.reputation !== undefined ? String(c.reputation) : t(l('(padrão)', '(default)')));
  return h('section', { class: 'card' },
    h('h3', null, ...hl(l('Início personalizado', 'Custom start'), 'custom')),
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
    h('small', { class: 'muted' }, t(l('Formação e estágio valem para quem tem banda própria (atividade Músico).', 'Line-up and stage apply if you have a band of your own (Musician activity).'))),
    h('label', null, t(l('Atos já contratados (selo)', 'Acts already signed (label)')), opt('roster', [0, 1, 2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) })), (v) => Number(v))),
    h('label', null, t(l('Funcionários iniciais', 'Starting staff')), opt('staff', [0, 1, 2, 3, 4, 6, 8].map((n) => ({ value: String(n), label: String(n) })), (v) => Number(v))),
    h('label', null, t(l('Mercados abertos', 'Open markets')), opt('markets', [
      { value: 'home', label: t(l('Só o mercado da cidade', 'Home market only')) }, { value: 'region', label: t(l('Mercado da cidade + vizinhos', 'Home + neighbours')) }, { value: 'world', label: t(l('O mundo todo', 'The whole world')) },
    ], (v) => v as StartCustom['markets'])),
    h('label', null, t(l('Reputação inicial', 'Starting reputation')), ' ', repLabel,
      h('input', { type: 'range', min: 0, max: 100, step: 5, value: c.reputation ?? 35, oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); c.reputation = v; repLabel.textContent = String(v); } })),
  );
}

/** Rodada 9 (11: qualquer gravadora do ano): fundar um selo novo ou assumir uma gravadora existente. */
function takeoverCard(cfg: RunConfig, nameInput: HTMLInputElement, citySel: () => void, onPick: () => void): { el: HTMLElement; refresh: () => void; show: (v: boolean) => void } {
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
    h('h3', null, ...hl(l('Como começar', 'How to start'), 'takeover')),
    h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'tk', checked: true, onchange: () => mode(false) }), h('span', null, h('b', null, t(l('Fundar um selo novo', 'Found a new label'))), h('small', { class: 'muted' }, ` — ${t(l('do zero, com o cenário escolhido.', 'from scratch, with the chosen scenario.'))}`))),
    h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'tk', onchange: () => mode(true) }), h('span', null, h('b', null, t(l('Assumir uma gravadora existente', 'Take over an existing label'))), h('small', { class: 'muted' }, ` — ${t(l('elenco, contratos, catálogo e caixa passam a ser seus; as grandes vêm com dívidas e equipe.', 'roster, contracts, catalog and cash become yours; big ones come with debts and staff.'))}`))),
    h('p', { class: 'muted small' }, t(l('Qualquer gravadora que já exista no ano de início: as rivais do mundo e as demais do catálogo. Os termos dependem do ano, do modo, da semente e dos nomes reais.', 'Any label that already exists in the start year: the world\'s rivals and the rest of the catalog. Terms depend on year, mode, seed and real names.'))),
    search,
    box,
  );
  search.hidden = true;
  const show = (v: boolean) => { el.hidden = !v; if (!v && on) { el.querySelector<HTMLInputElement>('input[name=tk]')!.checked = true; mode(false); } };
  return { el, refresh, show };
}

type Tab = { id: string; name: ReturnType<typeof l>; body: HTMLElement[] };
/** r20 (G8): quatro áreas com navegação livre; uma frase por área dizendo o que se decide ali. */
const STEP20: Record<string, ReturnType<typeof l>> = {
  world: l('Mundo — qual realidade, quando, onde e com que semente. População, rivais e história prévia ficam em "Personalizar".', 'World — which reality, when, where and with which seed. Population, rivals and prior history are under "Customize".'),
  you: l('Você e seu começo — quem você é, sua empresa e atividades, o ponto de partida (ou um cenário) e se funda ou assume uma gravadora. Nada aqui é obrigatório.', 'You and your start — who you are, your company and activities, the starting point (or a scenario) and whether you found or take over a label. Nothing here is mandatory.'),
  rules: l('Regras e ritmo — dificuldade, prazo, narrador, liberdade dos NPCs, tutoriais, filtros, Ironman e regras especiais.', 'Rules and pace — difficulty, deadline, storyteller, NPC freedom, tutorials, filters, Ironman and special rules.'),
  review: l('Revisão — confira o que o motor vai executar. "Editar" leva ao grupo e volta direto para cá.', 'Review — check what the engine will run. "Edit" takes you to the group and straight back here.'),
};

export function newGameScreen(root: HTMLElement, onStart: () => void, init?: RunConfig, tab0 = 0): void {
  // r20 (G8): fábrica única (padrão "Reais em mundo aleatório", política v2); códigos/cenários chegam por `init` e não são sobrescritos
  const cfg: RunConfig = init ?? newRunConfig20({ seed: randomSeed(), companyName: t(l('Selo Agulha', 'Needle Records')) });
  // predefinição, código e cenário reconstroem a tela com a mesma configuração (mesma área)
  const rebuild = () => newGameScreen(root, onStart, cfg, cur);
  const bandBox = h('div', { class: 'band-box' });
  const renderBand = () => {
    const show = cfg.role !== 'label';
    const genres = GENRES.filter((g) => g.born <= cfg.startYear).sort((a, b) => t(a.name).localeCompare(t(b.name)));
    if (!genres.find((g) => g.id === cfg.bandGenre)) cfg.bandGenre = genres[0]?.id;
    bandBox.replaceChildren(...(show ? [
      h('label', null, ...hl(S.bandName, 'band'), h('input', { type: 'text', value: cfg.bandName, placeholder: t(l('(gerado)', '(generated)')), oninput: (e: Event) => (cfg.bandName = (e.target as HTMLInputElement).value) })),
      h('label', null, t(S.bandGenre), select(cfg.bandGenre ?? 'rnr', genres.map((g) => ({ value: g.id, label: t(g.name) })), (v) => (cfg.bandGenre = v))),
    ] : []));
  };
  renderBand();
  const cards = h('div', { class: 'card-grid' });
  const renderCards = () => cards.replaceChildren(...CARDS.map((c) => h('button', { type: 'button', class: `pick ${cfg.card === c.id ? 'on' : ''}`, 'aria-pressed': String(cfg.card === c.id), onclick: () => { cfg.card = c.id; renderCards(); } }, h('b', null, t(c.name)), h('small', null, t(c.passive)), h('small', { class: 'muted' }, t(c.goal)))));
  renderCards();
  // r20 (§7.4): todo controle nasce do rascunho (sobrevive à reconstrução por predefinição/código)
  const muts = h('div', { class: 'mut-grid' }, MUTATORS.map((m) => h('label', { class: 'check', title: t(m.desc) },
    h('input', { type: 'checkbox', checked: cfg.mutators.includes(m.id), onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; cfg.mutators = on ? [...cfg.mutators.filter((x) => x !== m.id), m.id] : cfg.mutators.filter((x) => x !== m.id); } }),
    h('span', null, t(m.name), h('small', { class: 'muted' }, ` — ${t(m.desc)}`)))));
  const yearMsg = t(l('Ano exato de início ({a}–{b})', 'Exact start year ({a}–{b})'), { a: YEAR_MIN20, b: YEAR_MAX20 });
  const yearErr = h('small', { class: 'bad', role: 'alert' });
  const yearInput = h('input', { type: 'number', min: YEAR_MIN20, max: YEAR_MAX20, value: cfg.startYear, class: 'year-input', 'aria-label': t(l('Ano exato', 'Exact year')), title: yearMsg,
    onchange: (e: Event) => { const v = Math.round(Number((e.target as HTMLInputElement).value)); if (v >= YEAR_MIN20 && v <= YEAR_MAX20) { yearErr.textContent = ''; cfg.startYear = v; renderBand(); refreshAll(); } else yearErr.textContent = yearMsg; } }) as HTMLInputElement;
  const yearSel = select(cfg.startYear, START_YEARS.map((y) => ({ value: y.year, label: t(y.label) })), (v) => { cfg.startYear = v; yearInput.value = String(v); renderBand(); refreshAll(); });
  // r20 (§7.5/§9.3): a semente é criada uma vez; editar não sorteia outra; vazia é validada ao começar
  const seedErr = h('small', { class: 'bad', role: 'alert' });
  const seedInput = h('input', { type: 'text', value: cfg.seed, 'aria-describedby': 'ng20-seed-help', oninput: (e: Event) => { cfg.seed = (e.target as HTMLInputElement).value; if (cfg.seed.trim()) seedErr.textContent = ''; }, onchange: () => refreshAll() }) as HTMLInputElement;
  const nameInput = h('input', { type: 'text', value: cfg.companyName, oninput: (e: Event) => (cfg.companyName = (e.target as HTMLInputElement).value || 'Selo') }) as HTMLInputElement;
  const cityBox = h('span');
  let cityQ = '';
  const drawCity = () => {
    const all = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
    const q = cityQ.trim().toLowerCase();
    const xs = all.filter((c) => !q || c.id === cfg.homeCity || cityName(c.id).toLowerCase().includes(q) || (c.a3 ?? '').toLowerCase().includes(q) || c.market.toLowerCase().includes(q));
    cityBox.replaceChildren(select(cfg.homeCity, xs.map((c) => ({ value: c.id, label: `${cityName(c.id)}${c.a3 ? ` · ${c.a3}` : ''}` })), (v) => { cfg.homeCity = v; drawSummary(); }, { 'aria-label': t(S.homeCity), ...(cfg.takeover ? { disabled: true } : {}) }));
  };
  const citySearch = h('input', { type: 'search', class: 'ng20-city-q', placeholder: t(l('Buscar cidade ou país (ex.: BRA)…', 'Search city or country (e.g. GBR)…')), 'aria-label': t(l('Buscar cidade', 'Search city')), oninput: (e: Event) => { cityQ = (e.target as HTMLInputElement).value; drawCity(); } });
  drawCity();
  const tk = takeoverCard(cfg, nameInput, drawCity, () => drawSummary());
  const lc = labelsCard(cfg, () => tk.refresh());
  function refreshAll(): void { tk.refresh(); lc.refresh(); drawSummary(); }
  const onYear = (y: number) => { yearInput.value = String(y); renderBand(); refreshAll(); };
  const extras = newgameCards().filter((f) => !(f as { hidden17?: boolean }).hidden17).map((f) => { const el = f(cfg, onYear); return el.querySelector('h3')?.textContent === t(l('Mundo', 'World')) ? addHelp(el, 'world') : el; });
  const popSum = h('span', { class: 'muted small' });
  const tutCard = h('section', { class: 'card' }, h('h3', null, t(l('Tutoriais e dicas', 'Tutorials and tips'))), tutToggle19(), h('small', { class: 'muted' }, t(l('Preferência deste navegador: vale para todas as partidas.', 'This browser\'s preference: applies to every run.'))));

  const tabs: Tab[] = [
    { id: 'world', name: l('Mundo', 'World'), body: [
      worldCard17(cfg, () => refreshAll(), rebuild),
      h('section', { class: 'card wide ng20-where' },
        h('label', null, ...hl(S.startYear, 'year'), h('div', { class: 'row wrap' }, yearSel, yearInput), yearErr),
        h('label', null, ...hl(S.homeCity, 'city'), h('div', { class: 'row wrap' }, citySearch, cityBox)),
        h('label', null, ...hl(S.seed, 'seed'), h('div', { class: 'row wrap' }, seedInput, h('button', { type: 'button', class: 'btn small ghost', onclick: () => { cfg.seed = randomSeed(); seedInput.value = cfg.seed; seedErr.textContent = ''; refreshAll(); toast(t(l('Outro mundo sorteado: nova semente. Suas escolhas continuam; personagem e população gerados podem mudar.', 'Another world rolled: new seed. Your choices stay; the generated character and population may change.')), 'good'); } }, '🎲 ', t(l('Sortear outro mundo', 'Roll another world')))), seedErr),
        h('small', { class: 'muted', id: 'ng20-seed-help' }, t(l('Mesma semente + mesma configuração + mesma versão do jogo = mesmo começo. Mudar ano, modo, rivais ou base gera outro mundo, mesmo com a mesma semente.', 'Same seed + same configuration + same game version = same start. Changing year, mode, rivals or database makes another world, even with the same seed.')))),
      h('details', { class: 'card wide ng20-pop' }, h('summary', null, h('b', null, t(l('Personalizar população, rivais e história prévia', 'Customize population, rivals and prior history'))), ' ', popSum),
        h('div', { class: 'ng-grid' }, ...extras, addHelp(lc.el, 'rivals'))),
    ] },
    { id: 'you', name: l('Você e seu começo', 'You and your start'), body: [
      characterCard(cfg), careerCard(cfg, undefined, 'identity'),
      h('section', { class: 'card' },
        h('h3', null, t(l('Gravadora e papel', 'Label and role'))),
        h('label', null, ...hl(S.companyName, 'company'), nameInput),
        bandBox,
      ),
      careerCard(cfg, () => { renderBand(); tk.show(cfg.careers?.main.includes('label') ?? true); }, 'main'),
      startCard17(cfg, rebuild, customCard(cfg)),
      tk.el,
    ] },
    { id: 'rules', name: l('Regras e ritmo', 'Rules and pace'), body: [
      h('section', { class: 'card' },
        h('label', null, ...hl(S.difficulty, 'difficulty'), select(cfg.difficulty, [
          { value: 'easy', label: t(S.easy) }, { value: 'normal', label: t(S.normal) }, { value: 'hard', label: t(S.hard) },
        ] as { value: RunConfig['difficulty']; label: string }[], (v) => { cfg.difficulty = v; tk.refresh(); })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!cfg.ironman, onchange: (e: Event) => (cfg.ironman = (e.target as HTMLInputElement).checked) }), ...hl(S.ironman, 'ironman')),
        h('small', { class: 'muted' }, t(l('Ironman: um save só, sem desfazer e sem carregar pontos antigos. É uma regra de jogo — não substitui backup do navegador.', 'Ironman: one save, no undo and no loading old points. It is a game rule — not a substitute for browser backups.'))),
        h('fieldset', null, h('legend', null, ...hl(S.contentFilters, 'filters')), SENSITIVE.map((x) => h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: cfg.contentFilters.includes(x.id), onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; cfg.contentFilters = on ? [...cfg.contentFilters.filter((y) => y !== x.id), x.id] : cfg.contentFilters.filter((y) => y !== x.id); } }),
          t(x.label)))),
      ),
      runCard17(cfg),
      h('section', { class: 'card' },
        h('fieldset', null, h('legend', null, ...hl(S.storyteller, 'storyteller')), STORYTELLERS.map((st) => h('label', { class: 'radio' },
          h('input', { type: 'radio', name: 'st', checked: cfg.storyteller === st.id, onchange: () => (cfg.storyteller = st.id) }),
          h('span', null, h('b', null, t(st.name)), h('small', { class: 'muted' }, ` — ${t(st.desc)} ${t(DIR17[st.id].how)}`))))),
        // r17: o narrador é o diretor criativo; a liberdade escala o quanto os NPCs mudam o mundo (não muda o modo de mundo)
        h('label', null, ...hl(l('Liberdade do diretor (mundo dos NPCs)', 'Director freedom (NPC world)'), 'freedom17'), select(cfg.freedom17 ?? 'normal', (Object.keys(FREEDOM17) as Freedom17[]).map((k) => ({ value: k, label: `${t(FREEDOM17[k].name)} — ${t(FREEDOM17[k].desc)}` })), (v) => (cfg.freedom17 = v))),
        h('small', { class: 'muted' }, t(l('Liberdade é a intensidade das decisões dos NPCs; não muda o contrato do mundo (a Fidelidade histórica continua seguindo o roteiro).', 'Freedom is how bold NPC decisions are; it does not change the world contract (Historical fidelity still follows the script).'))),
      ),
      tutCard,
      diffCard17(cfg),
      h('section', { class: 'card wide' }, h('h3', null, ...hl(S.card, 'card')), cards),
      h('section', { class: 'card wide' }, h('h3', null, ...hl(S.mutators, 'mutators')), muts),
    ] },
    { id: 'review', name: l('Revisão', 'Review'), body: [] },
  ];
  const REVIEW = tabs.length - 1;
  let cur = Math.max(0, Math.min(REVIEW, tab0));
  let fromReview = false;
  const fullSummary = h('section', { class: 'card wide ng-summary-full' });
  tabs[REVIEW].body.push(fullSummary);
  const side = h('div', { class: 'ng-side-body' });
  const mini = h('span', { class: 'ng-mini muted small' });
  const SCN = () => [{ value: 'from_zero', label: t(S.scenarioFromZero) }, { value: 'emerging', label: t(S.scenarioEmerging) }, { value: 'established', label: t(S.scenarioEstablished) }];
  const DIFF = () => [{ value: 'easy', label: t(S.easy) }, { value: 'normal', label: t(S.normal) }, { value: 'hard', label: t(S.hard) }];
  const opt = (v: string, xs: { value: string; label: string }[]) => xs.find((x) => x.value === v)?.label ?? v;
  type Row = [ReturnType<typeof l>, string];
  const groups = (): { tab: number; name: ReturnType<typeof l>; rows: Row[] }[] => {
    const ids = cfg.labels?.ids ?? DEFAULT_LABEL_IDS();
    const rivals = cfg.labels?.count ?? labelPool().filter((d) => ids.includes(d.id) && (cfg.realNames ? realFounded(d.id, d.founded) : d.founded) <= cfg.startYear).length;
    const dsum = Object.entries(cfg.diff17 ?? {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(', ');
    const rs = resolveWorld20(cfg);
    const prehist = (cfg as { prehist?: number }).prehist ?? 0;
    return [
      { tab: 0, name: l('Mundo', 'World'), rows: [
        [l('Modo', 'Mode'), `${t(WORLDS17.find((w) => w.id === rs.id)!.name)}${rs.custom ? ` · ${t(l('Personalizado', 'Custom'))}` : ''}`],
        [l('Contrato', 'Contract'), policyLine20(cfg)],
        [S.startYear, String(cfg.startYear)],
        [S.homeCity, cityName(cfg.homeCity)],
        [S.seed, cfg.seed || '—'],
        [l('Base de dados', 'Database'), cfg.dbSize ?? 'medium'],
        [l('Gravadoras rivais', 'Rival labels'), `${rivals}${cfg.labels?.start === 'equal' ? ` · ${t(l('todos iguais', 'all equal'))}` : ''}${cfg.labels ? ` · ${t(l('personalizado', 'customized'))}` : ''}`],
        ...(prehist ? [[l('História prévia', 'Prior history'), t(l('{n} anos', '{n} years'), { n: prehist })] as Row] : []),
      ] },
      { tab: 1, name: l('Você e seu começo', 'You and your start'), rows: [
        [l('Personagem', 'Character'), cfg.character?.name || t(l('(gerado)', '(generated)'))],
        [S.companyName, cfg.companyName],
        [l('Começo', 'Start'), cfg.takeover ? t(l('assume a gravadora (ignora o ponto de partida)', 'takes over the label (ignores the starting point)')) : t(l('selo novo', 'new label'))],
        [S.scenario, cfg.scenario17 && scenarioById[cfg.scenario17] ? `🏅 ${t(scenarioById[cfg.scenario17].name)}` : opt(cfg.scenario, SCN())],
        [S.role, t(ROLES.find((r) => r.id === cfg.role)!.name)],
        [l('Carreira', 'Career'), careerSummary(cfg)],
        ...(cfg.custom && Object.keys(cfg.custom).length ? [[l('Ajuste fino do começo', 'Start fine-tuning'), Object.keys(cfg.custom).join(', ')] as Row] : []),
      ] },
      { tab: 2, name: l('Regras e ritmo', 'Rules and pace'), rows: [
        [S.difficulty, `${opt(cfg.difficulty, DIFF())}${dsum ? ` · ${dsum}` : ''}`],
        [l('Prazo', 'Deadline'), cfg.runYears17 ? t(l('{n} anos', '{n} years'), { n: cfg.runYears17 }) : t(l('sem fim', 'endless'))],
        [S.ironman, cfg.ironman ? t(l('sim — um save, sem desfazer', 'yes — one save, no undo')) : t(l('não', 'no'))],
        [S.contentFilters, cfg.contentFilters.length ? cfg.contentFilters.map((id) => t(SENSITIVE.find((x) => x.id === id)?.label ?? l(id, id))).join(', ') : t(l('nenhum', 'none'))],
        [l('Tutoriais', 'Tutorials'), tutorialsOff19(store.prefs) ? t(l('desligados', 'off')) : t(l('ligados', 'on'))],
        [S.storyteller, `${t(STORYTELLERS.find((x) => x.id === cfg.storyteller)!.name)} · ${t(FREEDOM17[cfg.freedom17 ?? 'normal'].name)}`],
        [S.card, t(CARDS.find((c) => c.id === cfg.card)!.name)],
        [S.mutators, cfg.mutators.map((id) => t(MUTATORS.find((m) => m.id === id)!.name)).join(', ') || '—'],
      ] },
    ];
  };
  const startErr = h('p', { class: 'bad small', role: 'alert' });
  const sideM = h('div', { class: 'small' });
  function drawSummary(): void {
    startBtns.length = 0;
    const gs = groups();
    const dl = (rows: Row[]) => h('dl', { class: 'ng-dl' }, ...rows.flatMap(([k, v]) => [h('dt', null, t(k)), h('dd', null, v)]));
    fullSummary.replaceChildren(
      h('h3', null, t(l('Sua run', 'Your run'))),
      ...gs.map((g) => h('div', { class: 'ng20-group' },
        h('div', { class: 'row ng20-group-h' }, h('h4', null, t(g.name)), h('button', { type: 'button', class: 'btn small ghost', 'aria-label': `${t(l('Editar', 'Edit'))}: ${t(g.name)}`, onclick: () => { fromReview = true; go(g.tab, false, true); } }, '✎ ', t(l('Editar', 'Edit')))),
        dl(g.rows))),
      summaryExtra17(cfg),
      h('div', { class: 'row wrap ng20-review-acts' }, copyCode20(cfg), restoreDefault20(cfg, rebuild)),
      startErr,
      h('div', { class: 'row center' }, startBtn('ng-start-review')));
    const w = gs[0].rows, r = gs[2].rows;
    const sideNodes = () => [
      h('p', { class: 'small' }, h('b', null, w[0][1])),
      h('p', { class: 'small' }, `${cfg.startYear} · ${cityName(cfg.homeCity)}`),
      h('p', { class: 'small' }, `${cfg.takeover ? t(l('Assume gravadora', 'Takeover')) : opt(cfg.scenario, SCN())} · ${r[0][1]} · ${r[1][1]}`),
      h('p', { class: 'small muted' }, w[1][1]),
      ...notes17(cfg).filter((n) => n.level === 'warn').map((n) => h('p', { class: 'small warn' }, '⚠ ', t(n.text)))];
    side.replaceChildren(...sideNodes());
    sideM.replaceChildren(...sideNodes());
    mini.textContent = `${w[0][1]} · ${cfg.startYear} · ${cityName(cfg.homeCity)}`;
    const p = [cfg.dbSize && cfg.dbSize !== 'medium' ? `${t(l('base', 'database'))} ${cfg.dbSize}` : '', cfg.labels ? t(l('rivais personalizados', 'custom rivals')) : '', ((cfg as { prehist?: number }).prehist ?? 0) ? t(l('história prévia', 'prior history')) : ''].filter(Boolean);
    popSum.textContent = p.length ? `— ${t(l('personalizado', 'customized'))}: ${p.join(', ')}` : `— ${t(l('padrão', 'default'))}`;
    sideAct.replaceChildren(cur === REVIEW ? startBtn('ng-start') : reviewBtn('btn primary'));
    barAct.replaceChildren(cur === REVIEW ? startBtn('ng-start-bar') : reviewBtn('btn primary big'));
  }
  const tabBtns = tabs.map((tb, i) => h('button', { type: 'button', role: 'tab', id: `ng-tab-${tb.id}`, 'aria-controls': `ng-panel-${tb.id}`, class: 'ng-tab', onclick: () => { fromReview = false; go(i); }, onkeydown: (e: KeyboardEvent) => {
    const k = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (k === null) return;
    e.preventDefault();
    go((k + tabs.length) % tabs.length, true);
  } }, h('span', { class: 'ng-num' }, String(i + 1)), ' ', t(tb.name)));
  const panels = tabs.map((tb) => h('div', { role: 'tabpanel', id: `ng-panel-${tb.id}`, 'aria-labelledby': `ng-tab-${tb.id}`, class: 'ng-grid ng-panel' }, h('p', { class: 'muted small ng17-step' }, t(STEP20[tb.id] ?? l('', ''))), ...tb.body));
  // r17: ficha ao vivo em "Você e seu começo" (agora rotulada como prévia rápida)
  const charPanel = panels[tabs.findIndex((x) => x.id === 'you')];
  charPanel.append(charPreview17(cfg, charPanel));
  const back = h('button', { type: 'button', class: 'btn ghost', onclick: () => { fromReview = false; go(cur - 1); } }, '← ' + t(l('Anterior', 'Previous')));
  const navNext = h('span', { class: 'row ng20-next' });
  const step = h('span', { class: 'muted small' });
  const reviewBtn = (cls: string) => h('button', { type: 'button', class: cls, onclick: () => { fromReview = false; go(REVIEW); } }, t(l('Revisar e começar', 'Review and start')));
  const sideAct = h('div', { class: 'row center ng20-side-act' });
  const barAct = h('span');
  function go(i: number, focus = false, focusPanel = false, quiet = false): void {
    cur = Math.max(0, Math.min(REVIEW, i));
    tabBtns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === cur)); b.tabIndex = j === cur ? 0 : -1; b.classList.toggle('on', j === cur); });
    panels.forEach((p, j) => (p.hidden = j !== cur));
    back.disabled = cur === 0;
    // uma ação principal por momento: Continuar (ou voltar à revisão) nas áreas; Começar run na revisão
    navNext.replaceChildren(...(cur === REVIEW ? [] : fromReview
      ? [h('button', { type: 'button', class: 'btn primary', onclick: () => { fromReview = false; go(REVIEW, false, true); } }, '↩ ', t(l('Voltar à revisão', 'Back to review')))]
      : [reviewBtn('btn ghost small'), h('button', { type: 'button', class: 'btn primary', onclick: () => go(cur + 1) }, t(l('Continuar', 'Continue')) + ' →')]));
    step.textContent = `${cur + 1}/${tabs.length} · ${t(tabs[cur].name)}`;
    drawSummary();
    if (focus) tabBtns[cur].focus();
    else if (focusPanel) { panels[cur].scrollIntoView?.({ block: 'start' }); (panels[cur].querySelector('h3, h4') as HTMLElement | null)?.setAttribute('tabindex', '-1'); (panels[cur].querySelector('h3, h4') as HTMLElement | null)?.focus?.(); }
    else if (!quiet) tabBtns[cur].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  // r20 (§6.2, NR06): começar sem submissão dupla; gera sobre uma CÓPIA do rascunho; falha mantém rascunho e semente
  let busy = false;
  const startBtns: HTMLButtonElement[] = [];
  const setBusy = (v: boolean) => { busy = v; for (const b of startBtns) { b.disabled = v; b.textContent = v ? t(l('Gerando seu mundo…', 'Generating your world…')) : t(l('Começar run', 'Start run')); } };
  const start = () => {
    if (busy) return;
    if (!cfg.seed.trim()) { seedErr.textContent = t(l('Informe uma semente (ou use "Sortear outro mundo").', 'Enter a seed (or use "Roll another world").')); fromReview = true; go(0); seedInput.focus(); return; }
    startErr.textContent = '';
    setBusy(true);
    setTimeout(() => {
      const run = JSON.parse(JSON.stringify(cfg)) as RunConfig;
      run.seed = run.seed.trim();
      try {
        const sc = run.scenario17 ? scenarioById[run.scenario17] : undefined;
        if (sc) Object.assign(run, { startYear: sc.startYear, homeCity: sc.homeCity, scenario: sc.scenario, ...(sc.role ? { role: sc.role } : {}) });
        prepareNewGame(run);
        const g = createGame(run);
        store.game = g;
        store.area = 'desk';
        store.undoSnapshot = null;
        onStart();
      } catch (e) {
        console.error(e);
        setBusy(false);
        const msg = t(l('Não foi possível gerar o mundo ({e}). Seu rascunho e a semente continuam iguais — "Começar run" tenta de novo com a mesma configuração.', 'Could not generate the world ({e}). Your draft and seed are unchanged — "Start run" tries again with the same configuration.'), { e: String((e as Error)?.message ?? e).slice(0, 120) });
        startErr.textContent = msg;
        toast(msg, 'bad');
      }
    }, 30);
  };
  const startBtn = (extra = '') => { const b = h('button', { type: 'button', class: `btn primary big ${extra}`, disabled: busy, onclick: start }, busy ? t(l('Gerando seu mundo…', 'Generating your world…')) : t(l('Começar run', 'Start run'))) as HTMLButtonElement; startBtns.push(b); return b; };
  const intent = h('div', { class: 'ng20-intent', role: 'group', 'aria-label': t(l('Como você quer começar', 'How you want to start')) },
    h('button', { type: 'button', class: 'pick on', 'aria-pressed': 'true' }, h('b', null, t(l('Nova run livre', 'New free run'))), h('small', null, t(l('Configure com o padrão novo; tudo é editável.', 'Configure with the new default; everything is editable.')))),
    h('button', { type: 'button', class: 'pick', 'aria-pressed': 'false', onclick: () => scenarioScreen(root, onStart, () => newGameScreen(root, onStart, cfg, cur)) }, h('b', null, '🏅 ', t(l('Cenários e desafios', 'Scenarios and challenges'))), h('small', null, t(l('Veja regras, ano, cidade e meta antes de iniciar.', 'See rules, year, city and goal before starting.')))),
    h('button', { type: 'button', class: 'pick', 'aria-pressed': 'false', onclick: () => pasteCode20(cfg, () => newGameScreen(root, onStart, cfg, REVIEW)) }, h('b', null, '⇥ ', t(l('Usar código de run', 'Use a run code'))), h('small', null, t(l('Importa para o rascunho e mostra a revisão; mantém as regras do código.', 'Imports into the draft and shows the review; keeps the code\'s rules.')))));
  const wrap = h('div', { class: 'newgame tabbed ng20' },
    h('header', null, h('button', { type: 'button', class: 'btn ghost', onclick: () => titleScreen(root, onStart) }, '← ' + t(S.back)),
      h('div', null, h('h1', null, t(l('Crie sua próxima história', 'Create your next story'))), h('p', { class: 'muted small ng20-sub' }, t(l('Escolha o mundo e seu ponto de partida. Todas as opções avançadas continuam disponíveis.', 'Choose the world and your starting point. All advanced options are still available.'))))),
    intent,
    presetBar17(cfg, rebuild),
    h('div', { class: 'ng-tabs', role: 'tablist', 'aria-label': t(S.newGame) }, ...tabBtns),
    h('div', { class: 'ng-layout' },
      h('div', { class: 'ng-main' }, ...panels, h('div', { class: 'ng-nav' }, back, step, navNext)),
      h('aside', { class: 'ng-side card', 'aria-label': t(l('Sua run', 'Your run')) }, h('h3', null, t(l('Sua run', 'Your run'))), side,
        h('div', { class: 'row center' }, h('button', { type: 'button', class: 'linkish small', onclick: () => { fromReview = false; go(REVIEW); } }, t(l('Ver detalhes', 'See details')))), sideAct)),
    h('div', { class: 'ng-bar' }, h('details', { class: 'ng20-barsum' }, h('summary', null, mini), sideM), barAct),
  );
  // resumo sempre em dia: os handlers dos campos rodam antes deste (borbulha até o contêiner)
  for (const ev of ['input', 'change', 'click']) wrap.addEventListener(ev, (e) => { if ((e.target as HTMLElement).closest?.('.ng-nav, .ng20-side-act, .ng-bar, .ng-tabs, .ng20-group-h')) return; drawSummary(); });
  root.replaceChildren(wrap);
  go(cur, false, false, true);
}

/** Cartões extras do Novo Jogo (rodada 9: mundo/história prévia). Função içada: segura na ordem de carga. */
export function newgameCards(): ((cfg: RunConfig, onYear: (y: number) => void) => HTMLElement)[] {
  const f = newgameCards as unknown as { l?: ((cfg: RunConfig, onYear: (y: number) => void) => HTMLElement)[] };
  return (f.l ??= []);
}

/** r19 tutoff19: chave "Sem tutoriais (já sei jogar)" (preferência do navegador, vale para todas as partidas). */
function tutToggle19(): HTMLElement {
  return h('label', { class: 'check tut19-toggle', title: t(TUTOFF_HINT19) },
    h('input', { type: 'checkbox', checked: tutorialsOff19(store.prefs), onchange: (e: Event) => { setTutorials19(store.prefs, !(e.target as HTMLInputElement).checked); savePrefs(); } }), ' ', t(TUTOFF_LABEL19));
}
