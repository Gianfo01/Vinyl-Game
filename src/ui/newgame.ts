// Tela inicial e criação de run: papel, cenário, ano, cidade, modo, narrador, Carta, mutators (GDD §5, §23).

import { nrConfirm29, nrHero29 } from './ps/nr29'; // r29 (NR01–NR06, Atlas)
import { SEXES29 } from './ps/char29'; // r29: personagem (revisão)
import { roleName29 } from './ps/char29model';
import { rolesOfSpec29 } from '../sim/char29data';
import { riv29ById, rivOf29 } from '../sim/rivals29data'; // r29: nível dos rivais
import { FREQS29, count29, statusAll29 } from '../sim/labels29data'; // r29: gravadoras no início e selos novos
import { labelsCard29 } from './ng29labels'; // r29
import { DIR17, FREEDOM17, type Freedom17 } from '../sim/director17';
import { HQ_LEVELS, MUTATORS, ROLES, STORYTELLERS } from '../data/rules';
import { CITIES, GENRES, l } from '../data/world';
import { realFounded } from '../data/realnames';
import { S, t } from '../i18n/strings';
import type { RunConfig, StartCustom } from '../sim/types';
import { createGame, labelPool, takeoverCandidates } from '../sim/worldgen';
import { formatMoney } from '../core/money';
import { genreById } from '../data/world';
import { locale } from '../i18n/strings';
import { cityName, toast } from './common';
import { h, select } from './dom';
import { savePrefs, store } from './store';
import { prepareNewGame } from './sys/live/goals';
import { cards22, chips22, seg22, toggle22, type Opt22 } from './pick22';
import { helpTip } from './newgame13';
import { endYearField28, type EndField28 } from './endyear28'; // r28 (F4)
let endF28: EndField28 | null = null;
import { attrsCard22 } from './newgame20you';
import { chosenLabels22, labelsCard } from './newgameLabels';
import { identityCard22, traitsCard22 } from './charCreate';
import { careerCard, careerSummary } from './sys/careers12';
import { START_YEARS13 } from './ngdata13';
import { setTutorials19, tutorialsOff19 } from './tutoff19';
import { addHelp, hl } from './newgame13';
import { copyCode20, diffCard17, pasteCode20, policyLine20, presetBar17, restoreDefault20, rivalsCard29, startCard17, summaryExtra17, worldCard17 } from './newgame17';
import { WORLDS17, newRunConfig20, notes17, resolveWorld20 } from '../sim/start17';
import { LINEUP29_DEFAULT, LINEUPS29, lineupApplies29 } from '../sim/lineup29';
import { YEAR_MAX20, YEAR_MIN20 } from '../sim/worldpolicy20';
import { originById } from '../sim/sys/identity/data';
import { AMBITIONS, type Ambition } from '../sim/sys/careers12';
import { careerOfSpec } from '../sim/sys/persona';
import './newgame20.css';
import { buildRun27, draftDefaults27 } from './ps/home27model';
import { homeScreen27 } from './ps/home27';

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

export function randomSeed(): string {
  const words = ['vinil', 'shellac', 'groove', 'fita', 'agulha', 'eco', 'reverb', 'neon', 'jukebox', 'fader', 'loop', 'sample'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** r27: tela inicial no estilo "Pixel Studio" (ps/home27.ts); mantém o nome usado por app.ts. */
export function titleScreen(root: HTMLElement, onStart: () => void): void {
  homeScreen27(root, onStart);
}

/** r27: preparo comum (buildRun27) + createGame; usado pela configuração completa e pela Nova run rápida. */
export function launchRun27(cfg: RunConfig, onStart: () => void): void {
  const run = buildRun27(cfg);
  prepareNewGame(run);
  const g = createGame(run);
  store.game = g;
  store.area = 'desk';
  store.undoSnapshot = null;
  onStart();
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
  world: l('Mundo — quão real é o mundo, em que ano começa, o que já aconteceu antes e quantos artistas existem.', 'World — how real the world is, the start year, what happened before and how many artists exist.'),
  you: l('Personagem — quem é você: identidade, trajetória, traços, ambição e atributos. Nada aqui é obrigatório.', 'Character — who you are: identity, path, traits, ambition and attributes. Nothing here is mandatory.'),
  mode: l('Modo — o que você faz, de onde parte (do zero, em ascensão, estabelecido ou num cenário), se funda ou assume uma gravadora, e a sua empresa.', 'Mode — what you do, where you start (from zero, rising, established or in a scenario), whether you found or take over a label, and your company.'),
  labels: l('Gravadoras — quais existem, quantas e como começam. Sem mexer, vale a sugestão para o ano, a cidade e o mundo escolhidos.', 'Labels — which exist, how many and how they start. Untouched, the suggestion for the chosen year, city and world applies.'),
  rules: l('Regras e ritmo — dificuldade, prazo, narrador, liberdade dos NPCs, tutoriais, filtros, Ironman e regras especiais.', 'Rules and rhythm — difficulty, deadline, storyteller, NPC freedom, tutorials, filters, Ironman and special rules.'),
  review: l('Revisão — confira o que o motor vai executar. "Editar" leva à etapa e volta direto para cá.', 'Review — check what the engine will run. "Edit" takes you to the step and straight back here.'),
};

export function newGameScreen(root: HTMLElement, onStart: () => void, init?: RunConfig, tab0 = 0): void {
  // r20 (G8): fábrica única (padrão "Reais em mundo aleatório", política v2); códigos/cenários chegam por `init` e não são sobrescritos
  const cfg: RunConfig = draftDefaults27(init ?? newRunConfig20({ seed: randomSeed(), companyName: t(l('Selo Agulha', 'Needle Records')) }));
  delete cfg.scenario17; // r22: cenários são outra modalidade (tela inicial)
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
  // r20 (§7.4): todo controle nasce do rascunho (sobrevive à reconstrução por predefinição/código)
  const yearMsg = t(l('Ano exato de início ({a}–{b})', 'Exact start year ({a}–{b})'), { a: YEAR_MIN20, b: YEAR_MAX20 });
  const yearErr = h('small', { class: 'bad', role: 'alert' });
  const yearInput = h('input', { type: 'number', min: YEAR_MIN20, max: YEAR_MAX20, value: cfg.startYear, class: 'year-input', 'aria-label': t(l('Ano exato', 'Exact year')), title: yearMsg,
    onchange: (e: Event) => { const v = Math.round(Number((e.target as HTMLInputElement).value)); if (v >= YEAR_MIN20 && v <= YEAR_MAX20) { yearErr.textContent = ''; cfg.startYear = v; renderBand(); refreshAll(); } else yearErr.textContent = yearMsg; } }) as HTMLInputElement;
  // r27: ano fora da lista (vindo da Nova run rápida ou de um código) aparece como opção própria, sem cair em 1889
  const yearOpts = [...(START_YEARS.some((y) => y.year === cfg.startYear) ? [] : [{ value: cfg.startYear, label: `${cfg.startYear} — ${t(l('ano escolhido', 'chosen year'))}` }]), ...START_YEARS.map((y) => ({ value: y.year, label: t(y.label) }))];
  const yearSel = select(cfg.startYear, yearOpts, (v) => { cfg.startYear = v; yearInput.value = String(v); renderBand(); refreshAll(); });
  // r20 (§7.5/§9.3): a semente é criada uma vez; editar não sorteia outra; vazia é validada ao começar
  const seedErr = h('small', { class: 'bad', role: 'alert' });
  const seedInput = h('input', { type: 'text', value: cfg.seed, 'aria-label': t(S.seed), 'aria-describedby': 'ng20-seed-help', // r20b (Z3): o <label> envolve o (?) antes, que virava o controle rotulado
    oninput: (e: Event) => { cfg.seed = (e.target as HTMLInputElement).value; if (cfg.seed.trim()) seedErr.textContent = ''; }, onchange: () => refreshAll() }) as HTMLInputElement;
  const nameInput = h('input', { type: 'text', value: cfg.companyName, oninput: (e: Event) => (cfg.companyName = (e.target as HTMLInputElement).value || 'Selo') }) as HTMLInputElement;
  // r22: a cidade-sede é escolhida só pela lista (sem busca)
  const cityBox = h('span');
  const drawCity = () => {
    const all = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
    cityBox.replaceChildren(select(cfg.homeCity, all.map((c) => ({ value: c.id, label: `${cityName(c.id)}${c.a3 ? ` · ${c.a3}` : ''}` })), (v) => { cfg.homeCity = v; lc.refresh(); drawSummary(); }, { 'aria-label': t(S.homeCity), ...(cfg.takeover ? { disabled: true } : {}) }));
  };
  drawCity();
  const tk = takeoverCard(cfg, nameInput, drawCity, () => drawSummary());
  const lc = labelsCard(cfg, () => tk.refresh());
  function refreshAll(): void { tk.refresh(); lc.refresh(); drawSummary(); }
  const onYear = (y: number) => { yearInput.value = String(y); renderBand(); refreshAll(); };
  const extras = newgameCards().filter((f) => !(f as { hidden17?: boolean }).hidden17).map((f) => { const el = f(cfg, onYear); return el.querySelector('h3')?.textContent === t(l('Mundo', 'World')) ? addHelp(el, 'world') : el; });
  // r22: a semente mora no cartão "Mundo" (história prévia e continuação)
  const seedRow = h('div', { class: 'ng22-seed' },
    h('label', null, ...hl(S.seed, 'seed'), h('div', { class: 'row wrap' }, seedInput, h('button', { type: 'button', class: 'btn small ghost', onclick: () => { cfg.seed = randomSeed(); seedInput.value = cfg.seed; seedErr.textContent = ''; refreshAll(); toast(t(l('Outro mundo sorteado: nova semente. Suas escolhas continuam; personagem e população gerados podem mudar.', 'Another world rolled: new seed. Your choices stay; the generated character and population may change.')), 'good'); } }, '🎲 ', t(l('Sortear outro mundo', 'Roll another world')))), seedErr),
    h('small', { class: 'muted', id: 'ng20-seed-help' }, t(l('Mesma semente + mesma configuração + mesma versão do jogo = mesmo começo.', 'Same seed + same configuration + same game version = same start.'))));
  const worldExtra = extras.find((el) => el.querySelector('h3')?.textContent?.startsWith(t(l('Mundo', 'World'))));
  if (worldExtra) worldExtra.append(seedRow);
  let redrawAttrs = (): void => undefined;

  const tabs: Tab[] = [
    { id: 'world', name: l('Mundo', 'World'), body: [
      worldCard17(cfg, () => refreshAll(), rebuild),
      h('section', { class: 'card wide ng22-year' },
        h('h3', null, ...hl(S.startYear, 'year')),
        h('div', { class: 'row wrap' }, yearSel, yearInput), yearErr,
        h('small', { class: 'muted' }, t(l('O ano decide a tecnologia, os formatos, os gêneros vivos, as gravadoras que já existem e os artistas em atividade.', 'The year decides technology, formats, living genres, which labels already exist and which artists are active.')))),
      ...extras,
      ...(worldExtra ? [] : [h('section', { class: 'card' }, seedRow)]),
    ] },
    { id: 'you', name: l('Personagem', 'Character'), body: [
      identityCard22(cfg, () => redrawAttrs()),
      traitsCard22(cfg, () => redrawAttrs()),
      careerCard(cfg, undefined, 'ambition'),
    ] },
    { id: 'mode', name: l('Modo', 'Mode'), body: [
      careerCard(cfg, () => { renderBand(); tk.show(cfg.careers?.main.includes('label') ?? true); }, 'main'),
      startCard17(cfg, rebuild, customCard(cfg)),
      tk.el,
      h('section', { class: 'card wide ng22-company' },
        h('h3', null, t(l('Empresa', 'Company'))),
        h('div', { class: 'ng22-row' },
          h('label', { class: 'ng22-grow' }, ...hl(S.companyName, 'company'), nameInput),
          h('label', null, ...hl(S.homeCity, 'city'), cityBox)),
        h('small', { class: 'muted' }, t(l('A cidade-sede define o seu mercado, a cena local e a concorrência por perto. Assumindo uma gravadora, vale a cidade dela.', 'The home city sets your market, the local scene and nearby competition. Taking over a label, its city applies.'))),
        bandBox,
      ),
    ] },
    { id: 'labels', name: l('Gravadoras', 'Labels'), body: [rivalsCard29(cfg, rebuild), labelsCard29(cfg, () => drawSummary(), rebuild), lc.el] }, // r29: nível dos rivais e gravadoras no início antes da lista
    // r22: regras em cartões, seletor segmentado, chaves e etiquetas (o ajuste fino fica recolhido)
    { id: 'rules', name: l('Regras e ritmo', 'Rules and rhythm'), body: [
      h('section', { class: 'card wide' }, h('h3', null, ...hl(S.difficulty, 'difficulty')),
        cards22(t(S.difficulty), [
          { value: 'easy', name: t(S.easy), desc: t(l('Caixa inicial ×1,5, previsões de venda mais precisas e aquisições mais baratas.', 'Starting cash ×1.5, sharper sales forecasts and cheaper acquisitions.')) },
          { value: 'normal', name: t(S.normal), badge: t(l('PADRÃO', 'DEFAULT')), desc: t(l('O jogo como foi pensado.', 'The game as designed.')) },
          { value: 'hard', name: t(S.hard), desc: t(l('Caixa inicial ×0,7, previsões mais incertas e aquisições mais caras.', 'Starting cash ×0.7, hazier forecasts and pricier acquisitions.')) },
        ] as Opt22<RunConfig['difficulty']>[], () => cfg.difficulty, (v) => { cfg.difficulty = v; tk.refresh(); drawSummary(); }, 'ng22-3'),
        // r28 F8 (D2): modo história — puxa o Fácil, narrador alivia e o conselheiro dá dicas concretas (sys/assist28.ts)
        h('label', { class: 'check as28-check' }, h('input', { type: 'checkbox', checked: !!cfg.assist28, onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; cfg.assist28 = on || undefined; if (on && cfg.difficulty !== 'easy') { const easy = (e.target as HTMLElement).closest('section')?.querySelector<HTMLButtonElement>('.ng22-3 button'); if (easy) easy.click(); else cfg.difficulty = 'easy'; } tk.refresh(); drawSummary(); } }), ' ',
          h('b', null, t(l('Modo história (assistido)', 'Story mode (assisted)'))), ' ', h('small', { class: 'muted' }, t(l('Menos golpes do destino, um mecenas socorre no aperto (uma vez a cada 3 anos) e o conselheiro diz o que fazer agora. Dá para desligar nas Opções.', 'Fewer twists of fate, a patron bails you out when cash runs dry (once every 3 years) and the advisor tells you what to do next. Can be turned off in Options.')))),
        h('details', { class: 'ng22-more' }, h('summary', null, t(l('Ajuste fino por eixo (mercado, custos, rivais, talento)', 'Fine-tune per axis (market, costs, rivals, talent)'))), diffCard17(cfg))),
      h('section', { class: 'card wide' }, h('h3', null, t(l('Duração da partida', 'Run length')), ' ', helpTip(l('Sem fim: jogue quanto quiser. Com prazo: em dezembro do último ano o jogo soma legado, sucessos, certificações e festivais numa pontuação com patente. Dá para continuar depois.', 'No end: play as long as you like. With a deadline: in December of the last year the game totals legacy, hits, certifications and festivals into a ranked score. You can keep playing after.'))),
        (endF28 = endYearField28(() => cfg.startYear, () => cfg.runYears17 ?? 0, (v) => { cfg.runYears17 = v; drawSummary(); }, 'ng28-end')).el), // r28 (F4): ano de fim escolhido (Recomendado sugere 25 anos)
      h('section', { class: 'card wide' }, h('h3', null, ...hl(S.storyteller, 'storyteller')),
        cards22(t(S.storyteller), STORYTELLERS.map((st) => ({ value: st.id, name: t(st.name), desc: `${t(st.desc)} ${t(DIR17[st.id].how)}` })), () => cfg.storyteller, (v) => { cfg.storyteller = v; drawSummary(); }),
        h('div', { class: 'ng22-field' }, h('b', null, ...hl(l('Liberdade do diretor (mundo dos NPCs)', 'Director freedom (NPC world)'), 'freedom17')),
          seg22(t(l('Liberdade do diretor', 'Director freedom')), (Object.keys(FREEDOM17) as Freedom17[]).map((k) => ({ value: k, name: t(FREEDOM17[k].name), desc: t(FREEDOM17[k].desc) })), () => cfg.freedom17 ?? 'normal', (v) => { cfg.freedom17 = v; drawSummary(); }))),
      h('section', { class: 'card wide' }, h('h3', null, t(l('Opções da partida', 'Run options'))),
        h('div', { class: 'ng22-toggles' },
          toggle22(t(S.ironman), t(l('Um save só, sem desfazer e sem carregar pontos antigos. Não substitui backup do navegador.', 'One save, no undo and no loading old points. Not a substitute for browser backups.')), () => !!cfg.ironman, (v) => { cfg.ironman = v; drawSummary(); }),
          toggle22(t(l('Tutoriais e dicas', 'Tutorials and tips')), t(l('Preferência deste navegador: vale para todas as partidas.', 'This browser\'s preference: applies to every run.')), () => !tutorialsOff19(store.prefs), (v) => { setTutorials19(store.prefs, v); savePrefs(); drawSummary(); })),
        h('div', { class: 'ng22-field' }, h('b', null, ...hl(S.contentFilters, 'filters')), h('small', { class: 'muted' }, t(l('Temas marcados ficam fora da partida.', 'Checked themes stay out of the run.'))),
          chips22(t(S.contentFilters), SENSITIVE.map((x) => ({ value: x.id, name: t(x.label) })), () => cfg.contentFilters, (v) => { cfg.contentFilters = v; drawSummary(); }))),
      h('section', { class: 'card wide' }, h('h3', null, ...hl(S.mutators, 'mutators')), h('p', { class: 'muted small' }, t(l('Regras especiais que mudam o mundo inteiro. Passe o mouse para ver o efeito.', 'Special rules that change the whole world. Hover to see the effect.'))),
        chips22(t(S.mutators), MUTATORS.map((m) => ({ value: m.id, name: t(m.name), desc: t(m.desc) })), () => cfg.mutators, (v) => { cfg.mutators = v; drawSummary(); })),
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
  const DIFF = () => [{ value: 'easy', label: t(S.easy) }, { value: 'normal', label: t(S.normal) }, { value: 'hard', label: t(S.hard) }];
  const opt = (v: string, xs: { value: string; label: string }[]) => xs.find((x) => x.value === v)?.label ?? v;
  type Row = [ReturnType<typeof l>, string];
  const LBSTART: Record<string, ReturnType<typeof l>> = { history: l('pela história', 'by history'), random: l('aleatório', 'random'), equal: l('todos iguais', 'all equal'), inverted: l('mundo virado', 'upside down'), giants: l('gigantes', 'giants'), startups: l('todas novatas', 'all newcomers') };
  const groups = (): { tab: number; name: ReturnType<typeof l>; rows: Row[] }[] => {
    const ids = chosenLabels22(cfg);
    const rivals = (cfg.scenario17 ? undefined : count29(cfg)) ?? cfg.labels?.count ?? labelPool().filter((d) => ids.includes(d.id) && (cfg.realNames ? realFounded(d.id, d.founded) : d.founded) <= cfg.startYear).length;
    const dsum = Object.entries(cfg.diff17 ?? {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(', ');
    const rs = resolveWorld20(cfg);
    const prehist = (cfg as { prehist?: number }).prehist ?? 0;
    const ch = cfg.character;
    return [
      { tab: 0, name: l('Mundo', 'World'), rows: [
        [l('Mundo', 'World'), `${t(WORLDS17.find((w) => w.id === rs.id)!.name)}${rs.custom ? ` · ${t(l('Personalizado', 'Custom'))}` : ''}`],
        [l('Contrato', 'Contract'), policyLine20(cfg)],
        ...(lineupApplies29(cfg) ? [[l('Formação inicial', 'Starting lineup'), t(LINEUPS29.find((x) => x.id === (cfg.lineup29 ?? LINEUP29_DEFAULT))!.name)] as Row] : []), // R29 (formação)
        [S.startYear, String(cfg.startYear)],
        [l('História prévia', 'Prior history'), prehist ? t(l('{n} anos', '{n} years'), { n: prehist }) : t(l('nenhuma', 'none'))],
        [l('Base de dados', 'Database'), cfg.dbSize ?? 'medium'],
        [S.seed, cfg.seed || '—'],
      ] },
      { tab: 1, name: l('Personagem', 'Character'), rows: [
        [l('Nome', 'Name'), ch?.name || t(l('(gerado)', '(generated)'))],
        [l('Idade e sexo', 'Age and sex'), ch ? `${ch.age} · ${t(SEXES29.find((x) => x.id === (ch.sex ?? 'x'))!.name)}` : '—'], // r29
        ...(cfg.role !== 'label' ? [[l('Instrumentos', 'Instruments'), ch ? rolesOfSpec29(ch).map((r) => t(roleName29(r))).join(' · ') : '—'] as Row,
          [l('Formação', 'Line-up'), cfg.custom?.members === 1 ? t(l('solo', 'solo')) : cfg.custom?.members ? t(l('banda de {n}', '{n}-piece band'), { n: cfg.custom.members }) : t(l('sorteada (1–4)', 'random (1–4)'))] as Row] : []),
        [l('Trajetória', 'Path'), ch ? t(originById[careerOfSpec(ch)]?.name ?? l('—', '—')) : '—'],
        [l('Traços', 'Traits'), ch?.traits?.length ? String(ch.traits.length) : '—'],
        [l('Ambição', 'Ambition'), t(AMBITIONS[cfg.careers?.ambition as Ambition]?.name ?? l('—', '—'))],
      ] },
      { tab: 2, name: l('Modo', 'Mode'), rows: [
        [l('Atividades', 'Activities'), (cfg.careers?.main ?? ['label']).length ? careerSummary(cfg).split(' · ')[0] : '—'],
        [S.role, t(ROLES.find((r) => r.id === cfg.role)!.name)],
        [l('Situação inicial', 'Starting situation'), t(statusAll29(cfg))], // r29: carreira × situação × rivais × gravadoras ("Selo emergente · rivais gigantes · 8 gravadoras")
        [l('Como começa', 'How it starts'), cfg.takeover ? t(l('assume a gravadora (ignora o ponto de partida)', 'takes over the label (ignores the starting point)')) : t(l('selo novo', 'new label'))],
        [S.companyName, cfg.companyName],
        [S.homeCity, cityName(cfg.homeCity)],
        ...(cfg.custom && Object.keys(cfg.custom).length ? [[l('Ajuste fino do começo', 'Start fine-tuning'), Object.keys(cfg.custom).join(', ')] as Row] : []),
      ] },
      { tab: 3, name: l('Gravadoras', 'Labels'), rows: [
        [l('No começo', 'At the start'), `${rivals} · ${!cfg.scenario17 && count29(cfg) !== undefined ? t(l('escolha da Nova run', 'New run choice')) : cfg.labels?.ids ? t(l('lista personalizada', 'custom list')) : t(l('sugestão', 'suggestion'))}`],
        [l('Nível dos rivais', 'Rival level'), t(riv29ById(rivOf29(cfg))!.name)], // r29
        ...(cfg.labels29 ? [[l('Selos novos', 'New labels'), cfg.labels29.freq ? t(FREQS29.find((f) => f.id === cfg.labels29!.freq)!.name) : count29(cfg) !== undefined ? t(FREQS29[2].name) : t(l('como sempre', 'as usual'))] as Row] : []), // r29
        [l('Como começam', 'How they start'), t(LBSTART[cfg.labels?.start ?? 'history'])],
        [l('Fundadas depois', 'Founded later'), t(cfg.labels?.future === 'all' ? l('todas do catálogo', 'all from the catalog') : cfg.labels?.future === 'none' ? l('nenhuma', 'none') : l('as da lista', 'the listed ones'))],
      ] },
      { tab: 4, name: l('Regras e ritmo', 'Rules and rhythm'), rows: [
        [S.difficulty, `${opt(cfg.difficulty, DIFF())}${dsum ? ` · ${dsum}` : ''}`],
        [l('Prazo', 'Deadline'), cfg.runYears17 ? t(l('{n} anos', '{n} years'), { n: cfg.runYears17 }) : t(l('sem fim', 'endless'))],
        [S.ironman, cfg.ironman ? t(l('sim — um save, sem desfazer', 'yes — one save, no undo')) : t(l('não', 'no'))],
        [S.contentFilters, cfg.contentFilters.length ? cfg.contentFilters.map((id) => t(SENSITIVE.find((x) => x.id === id)?.label ?? l(id, id))).join(', ') : t(l('nenhum', 'none'))],
        [l('Tutoriais', 'Tutorials'), tutorialsOff19(store.prefs) ? t(l('desligados', 'off')) : t(l('ligados', 'on'))],
        [S.storyteller, `${t(STORYTELLERS.find((x) => x.id === cfg.storyteller)!.name)} · ${t(FREEDOM17[cfg.freedom17 ?? 'normal'].name)}`],
        [S.mutators, cfg.mutators.map((id) => t(MUTATORS.find((m) => m.id === id)!.name)).join(', ') || '—'],
      ] },
    ];
  };
  const startErr = h('p', { class: 'bad small', role: 'alert' });
  const sideM = h('div', { class: 'small' });
  function drawSummary(): void {
    endF28?.refresh(); // r28 (F4): o fim acompanha o ano de início
    startBtns.length = 0;
    const gs = groups();
    const dl = (rows: Row[]) => h('dl', { class: 'ng-dl' }, ...rows.flatMap(([k, v]) => [h('dt', null, t(k)), h('dd', null, v)]));
    fullSummary.replaceChildren(
      h('h3', null, t(l('Sua run', 'Your run'))),
      ...gs.map((g) => h('div', { class: 'ng20-group' },
        h('div', { class: 'row ng20-group-h' }, h('h4', null, t(g.name)), h('button', { type: 'button', class: 'btn small ghost', 'aria-label': `${t(l('Editar', 'Edit'))}: ${t(g.name)}`, onclick: () => { fromReview = true; go(g.tab, false, true); } }, '✎ ', t(l('Editar', 'Edit')))),
        dl(g.rows))),
      summaryExtra17(cfg),
      h('div', { class: 'row wrap ng20-review-acts' }, copyCode20(cfg), h('button', { type: 'button', class: 'btn small ghost', onclick: () => pasteCode20(cfg, () => newGameScreen(root, onStart, cfg, REVIEW)) }, '⇥ ', t(l('Usar código de run', 'Use a run code'))), restoreDefault20(cfg, rebuild)),
      startErr,
      h('div', { class: 'row center' }, startBtn('ng-start-review')));
    const w = gs[0].rows, y = gs[1].rows, m = gs[2].rows, lb = gs[3].rows, r = gs[4].rows;
    const sideNodes = () => [
      h('p', { class: 'small' }, h('b', null, w[0][1]), ` · ${cfg.startYear}`),
      h('p', { class: 'small' }, `${y[0][1]} · ${y[1][1]}`),
      h('p', { class: 'small' }, `${m[2][1]} · ${cfg.companyName} · ${cityName(cfg.homeCity)}`),
      h('p', { class: 'small' }, `${t(l('Gravadoras', 'Labels'))}: ${lb[0][1]} · ${lb[1][1]}`),
      h('p', { class: 'small' }, `${r[0][1]} · ${r[1][1]}`),
      h('p', { class: 'small muted' }, w[1][1]),
      ...notes17(cfg).filter((n) => n.level === 'warn').map((n) => h('p', { class: 'small warn' }, '⚠ ', t(n.text))),
      ...(cur === REVIEW ? [nrConfirm29(cfg, notes17(cfg).filter((n) => n.level === 'warn').length)] : [])]; // r29 (NR-03): confirmação da campanha
    side.replaceChildren(...sideNodes());
    sideM.replaceChildren(...sideNodes());
    mini.textContent = `${w[0][1]} · ${cfg.startYear} · ${cityName(cfg.homeCity)}`;
    sideAct.replaceChildren(cur === REVIEW ? startBtn('ng-start') : reviewBtn('btn primary'));
    barAct.replaceChildren(cur === REVIEW ? startBtn('ng-start-bar') : reviewBtn('btn primary big'));
    const warns = notes17(cfg).filter((n) => n.level === 'warn').length;
    const subs = [`${w[0][1]} · ${cfg.startYear}`, `${y[0][1]} · ${y[3][1]}`, `${m[0][1]} · ${m[2][1]}`, `${lb[0][1].split(' · ')[0]} · ${lb[1][1]}`, `${r[0][1]} · ${r[1][1]}`,
      warns ? t(l('{n} avisos', '{n} warnings'), { n: warns }) : t(l('pronto para começar', 'ready to start'))];
    tabSubs.forEach((el, i) => (el.textContent = subs[i] ?? ''));
  }
  const tabSubs = tabs.map(() => h('small', { class: 'ng21-sub' }));
  const tabBtns = tabs.map((tb, i) => h('button', { type: 'button', role: 'tab', id: `ng-tab-${tb.id}`, 'aria-controls': `ng-panel-${tb.id}`, class: 'ng-tab', onclick: () => { fromReview = false; go(i); }, onkeydown: (e: KeyboardEvent) => {
    const k = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (k === null) return;
    e.preventDefault();
    go((k + tabs.length) % tabs.length, true);
  } }, h('span', { class: 'ng-num ng21-ic', 'aria-hidden': 'true' }, String(i + 1)) /* r29 (Atlas): etapas numeradas */, h('span', { class: 'ng21-tl' }, h('b', null, `${i + 1}. ${t(tb.name).toUpperCase()}`), tabSubs[i])));
  const panels = tabs.map((tb, ti) => h('div', { role: 'tabpanel', id: `ng-panel-${tb.id}`, 'aria-labelledby': `ng-tab-${tb.id}`, class: 'ng-grid ng-panel' }, nrHero29(tb.id, t(STEP20[tb.id] ?? l('', '')), ti + 1, tabs.length), ...tb.body)); // r29 (NR/Atlas): herói por etapa
  // r22: cartão Atributos (pontos livres + o que o passado soma + prévia rápida), atento às mudanças da etapa
  const charPanel = panels[tabs.findIndex((x) => x.id === 'you')];
  const attrs = attrsCard22(cfg, charPanel);
  redrawAttrs = attrs.redraw;
  charPanel.append(attrs.el);
  const back = h('button', { type: 'button', class: 'btn ghost', onclick: () => { fromReview = false; go(cur - 1); } }, '← ' + t(l('Anterior', 'Previous')));
  const navNext = h('span', { class: 'row ng20-next' });
  const step = h('span', { class: 'muted small' });
  const reviewBtn = (cls: string) => h('button', { type: 'button', class: cls, onclick: () => { fromReview = false; go(REVIEW); } }, t(l('Revisar e começar', 'Review and start')));
  const sideAct = h('div', { class: 'row center ng20-side-act' });
  const barAct = h('span');
  function go(i: number, focus = false, focusPanel = false, quiet = false): void {
    cur = Math.max(0, Math.min(REVIEW, i));
    tabBtns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === cur)); b.tabIndex = j === cur ? 0 : -1; b.classList.toggle('on', j === cur); b.classList.toggle('done', j < cur); });
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
      try {
        launchRun27(cfg, onStart); // r27: mesmo preparo da Nova run rápida (cópia, cenário, gravadoras materializadas)
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
  const wrap = h('div', { class: 'newgame tabbed ng20 ng21', id: 'main', role: 'main', tabindex: '-1' }, // r23: alvo do skip link
    h('header', null, h('button', { type: 'button', class: 'btn ghost', onclick: () => titleScreen(root, onStart) }, '← ' + t(S.back)),
      h('div', null, h('h1', null, t(l('Nova run', 'New run'))), h('p', { class: 'muted small ng20-sub' }, t(l('6 etapas · clique numa etapa para ir direto · clique no título de uma seção para recolher ou abrir.', '6 steps · click a step to jump to it · click a section title to collapse or expand it.'))))),
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
  // r21: clicar no título de uma seção recolhe/abre (o estado vale até sair da tela)
  wrap.addEventListener('click', (e) => {
    const hd = (e.target as HTMLElement).closest?.('.ng-panel > section.card > h3, .ng-panel > section.card > fieldset > legend > h3');
    if (!hd || (e.target as HTMLElement).closest('button, a, input, select, .help')) return;
    hd.closest('section.card')!.classList.toggle('ng21-folded');
  });
  root.replaceChildren(wrap);
  go(cur, false, false, true);
}

/** Cartões extras do Novo Jogo (rodada 9: mundo/história prévia). Função içada: segura na ordem de carga. */
export function newgameCards(): ((cfg: RunConfig, onYear: (y: number) => void) => HTMLElement)[] {
  const f = newgameCards as unknown as { l?: ((cfg: RunConfig, onYear: (y: number) => void) => HTMLElement)[] };
  return (f.l ??= []);
}
