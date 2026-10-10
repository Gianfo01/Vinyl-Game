// Cenários históricos com meta, prazo e medalhas (inspiração: cenários de RollerCoaster Tycoon),
// desafio da semana (seed e regras fixas derivadas da semana — a data real entra só pela interface)
// e pacote de universo (selos, artistas, cenas e eventos personalizados em JSON).

import { clamp, hashString, type Rng } from '../../../core/rng';
import { toReal } from '../../../core/money';
import { CARDS, MUTATORS } from '../../../data/rules';
import { CITIES, cityById, genreById, l, type L } from '../../../data/world';
import { queueCutscene, registerSimHook } from '../../ext4';
import { makeAct } from '../../people';
import type { Act, GameState, Label, RunConfig } from '../../types';
import { fmtL, money, nextId, notify, post, remember, sum } from '../../util';
import { grantPlayerContract } from '../../worldgen';
import { liveOf, type ChallengeRun, type CustomEvent, type ScenarioRun } from './state';
import { allReleases17 } from '../../relidx17';

// ---------------------------------------------------------------- preparação da próxima partida

export interface UniversePack {
  name: string;
  version: 1;
  labels: { name: string; city: string; family: Label['family']; focus: string[] }[];
  acts: { name: string; genre: string; city: string; members: number; fame: number; signed?: boolean }[];
  scenes: { city: string; genre: string; strength: number }[];
  events: { year: number; month: number; title: L; text: L; cash?: number; genre?: string; genreMult?: number; fame?: number }[];
}

export interface NextGameSetup {
  scenarioId?: string;
  challenge?: { code: string; week: string; years: number; rules: L[] };
  pack?: UniversePack;
}

let pending: NextGameSetup | null = null;

/** A interface chama isto logo antes de createGame; o gancho 'newgame' consome e limpa. */
export function setNextGameSetup(setup: NextGameSetup | null): void {
  pending = setup;
}

// ---------------------------------------------------------------- cenários

type Medal = 'gold' | 'silver' | 'bronze' | 'none';

export interface ScenarioDef {
  id: string;
  name: L;
  desc: L;
  goal: L;
  unit: L;
  startYear: number;
  endYear: number;
  homeCity: string;
  scenario: RunConfig['scenario'];
  role?: RunConfig['role'];
  bandGenre?: string;
  tiers: [number, number, number];
  setup?: (s: GameState, r: Rng) => void;
  /** valor atual da meta (pode usar o retrato inicial `base`) */
  metric: (s: GameState, base: Record<string, number>) => number;
  fail?: (s: GameState) => L | null;
}

function signAct(s: GameState, r: Rng, genre: string, city: string, fame: number, members?: number, name?: string): Act {
  const act = makeAct(s, r, { name, genre, city, members: members ?? r.int(1, 5), potential: r.int(62, 82), formed: s.year - 2, debutYear: s.year - 1, fame });
  if (name) act.name = name;
  const f = Math.pow(10, 2 + fame / 25);
  act.fans = { casual: Math.round(f), active: Math.round(f * 0.15), core: Math.round(f * 0.03) };
  act.status = 'active';
  grantPlayerContract(s, act, 48);
  return act;
}

function adjustCash(s: GameState, factor: number): void {
  const d = Math.round(s.player.cash * factor) - s.player.cash;
  s.player.cash += d;
  s.player.initialCash += d;
}

const insolvent = (s: GameState): L | null => (s.ended?.reason === 'insolvency' ? l('O selo quebrou antes do prazo.', 'The label went bust before the deadline.') : null);

function genreUnits(s: GameState, genres: string[]): number {
  return sum(allReleases17(s).filter((x) => (x.owner === 'player' || s.acts[x.actId]?.playerBand) && genres.includes(s.acts[x.actId]?.genre ?? '')).map((x) => x.totalUnits));
}

const bestFame = (s: GameState, pred: (a: Act) => boolean = () => true) => Math.round(Math.max(0, ...Object.values(s.acts).filter((a) => (a.owner === 'player' || a.playerBand) && pred(a)).map((a) => a.fame)));

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'soul_1972', name: l('Salve um selo de soul em 1972', 'Save a soul label in 1972'), startYear: 1972, endYear: 1975, homeCity: 'detroit', scenario: 'emerging',
    desc: l('Um selo de soul de Detroit está à beira da falência: pouco caixa, dois artistas talentosos e a disco chegando.', 'A Detroit soul label is on the brink: little cash, two gifted acts and disco on the way.'),
    goal: l('Emplaque músicas no top 10 até o fim de 1975 sem quebrar.', 'Land top-10 songs by the end of 1975 without going bust.'), unit: l('top 10', 'top 10s'), tiers: [1, 3, 6],
    setup: (s, r) => { adjustCash(s, 0.45); signAct(s, r, 'soul', 'detroit', 18); signAct(s, r, 'funk', 'detroit', 12); },
    metric: (s, b) => s.player.stats.top10s - (b.top10s ?? 0), fail: insolvent,
  },
  {
    id: 'tropicalia', name: l('Lance a Tropicália antes do AI-5', 'Launch Tropicália before AI-5'), startYear: 1966, endYear: 1968, homeCity: 'sao_paulo', scenario: 'from_zero',
    desc: l('São Paulo, 1966. Jovens baianos misturam guitarra elétrica, poesia e Brasil. Em dezembro de 1968 o AI-5 vai fechar a porta.', 'São Paulo, 1966. Young Bahians mix electric guitars, poetry and Brazil. In December 1968 the AI-5 decree will shut the door.'),
    goal: l('Venda discos tropicalistas antes do fim de 1968.', 'Sell Tropicália records before the end of 1968.'), unit: l('mil cópias', 'thousand copies'), tiers: [15, 60, 180],
    setup: (s, r) => { signAct(s, r, 'tropicalia', 'salvador', 8, 3); signAct(s, r, 'tropicalia', 'sao_paulo', 6, 1); signAct(s, r, 'mpb', 'rio', 10, 1); },
    metric: (s) => Math.round(genreUnits(s, ['tropicalia', 'mpb']) / 1000), fail: insolvent,
  },
  {
    id: 'napster', name: l('Sobreviva ao Napster', 'Survive Napster'), startYear: 1998, endYear: 2004, homeCity: 'new_york', scenario: 'established',
    desc: l('1998: o CD nunca vendeu tanto. Logo a troca de arquivos vai derreter as vendas físicas.', '1998: CDs have never sold better. Soon file sharing will melt physical sales.'),
    goal: l('Chegue a 2004 com o caixa (em valor real) preservado ou maior.', 'Reach 2004 with your cash (in real terms) preserved or larger.'), unit: l('% do caixa inicial', '% of starting cash'), tiers: [60, 100, 160],
    metric: (s, b) => Math.round((toReal(s.player.cash, s.year) / Math.max(1, b.cashReal ?? 1)) * 100), fail: insolvent,
  },
  {
    id: 'trainees', name: l('Leve um grupo de trainees ao topo mundial', 'Take a trainee group to the global top'), startYear: 2012, endYear: 2020, homeCity: 'seoul', scenario: 'from_zero',
    desc: l('Seul, 2012. Sete trainees, anos de ensaio e um sonho: estádios no mundo todo.', 'Seoul, 2012. Seven trainees, years of practice and one dream: stadiums worldwide.'),
    goal: l('Leve a fama do grupo ao máximo até 2020.', 'Max out the group\'s fame by 2020.'), unit: l('de fama', 'fame'), tiers: [45, 65, 85],
    setup: (s, r) => { signAct(s, r, 'kpop', 'seoul', 4, 5); },
    metric: (s) => bestFame(s, (a) => a.genre === 'kpop'), fail: insolvent,
  },
  {
    id: 'human_2040', name: l('Feche 2040 com catálogo humano', 'Close 2040 with a human catalog'), startYear: 2026, endYear: 2040, homeCity: 'london', scenario: 'emerging',
    desc: l('As vozes sintéticas dominam as paradas. Você aposta em gente de carne e osso até o fim.', 'Synthetic voices rule the charts. You bet on flesh-and-blood artists to the end.'),
    goal: l('Tenha artistas humanos com fama 40+ em 2040, sem nenhum ato sintético.', 'Have human acts with fame 40+ in 2040, with no synthetic act.'), unit: l('atos humanos fortes', 'strong human acts'), tiers: [1, 3, 5],
    metric: (s) => Object.values(s.acts).filter((a) => a.owner === 'player' && a.archetype !== 'synthetic' && a.fame >= 40 && a.status !== 'retired' && a.status !== 'split').length,
    fail: (s) => insolvent(s) ?? (s.player.neural.synthActs > 0 ? l('O selo lançou um ato sintético.', 'The label launched a synthetic act.') : null),
  },
  {
    id: 'jazz_1920', name: l('Goma-laca em Nova Orleans', 'Shellac in New Orleans'), startYear: 1920, endYear: 1931, homeCity: 'new_orleans', scenario: 'from_zero',
    desc: l('1920: o jazz sai dos salões para o disco. E em 1929 vem o crash.', '1920: jazz moves from dance halls to records. And in 1929 comes the crash.'),
    goal: l('Some sucessos no top 10 e atravesse o crash.', 'Rack up top-10 hits and make it through the crash.'), unit: l('top 10', 'top 10s'), tiers: [2, 5, 10],
    setup: (s, r) => { signAct(s, r, 'nola_jazz', 'new_orleans', 6, 5); },
    metric: (s, b) => s.player.stats.top10s - (b.top10s ?? 0), fail: insolvent,
  },
  {
    id: 'mersey_1962', name: l('A invasão de Liverpool', 'The Liverpool invasion'), startYear: 1962, endYear: 1966, homeCity: 'liverpool', scenario: 'from_zero',
    desc: l('Porões de Liverpool, 1962. Quatro rapazes de terno e um som novo.', 'Liverpool cellars, 1962. Four lads in suits and a new sound.'),
    goal: l('Chegue ao número 1 até 1966.', 'Reach number 1 by 1966.'), unit: l('números 1', 'number 1s'), tiers: [1, 2, 4],
    setup: (s, r) => { signAct(s, r, 'beat', 'liverpool', 10, 4); },
    metric: (s, b) => s.player.stats.number1s - (b.number1s ?? 0), fail: insolvent,
  },
  {
    id: 'bronx_1979', name: l('Do Bronx para o rádio', 'From the Bronx to the radio'), startYear: 1979, endYear: 1987, homeCity: 'new_york', scenario: 'from_zero',
    desc: l('Festas de quarteirão, toca-discos e MCs. Ninguém acha que isso vai tocar no rádio.', 'Block parties, turntables and MCs. No one thinks this will ever play on the radio.'),
    goal: l('Coloque hip hop no top 10.', 'Put hip hop in the top 10.'), unit: l('top 10', 'top 10s'), tiers: [1, 3, 6],
    setup: (s, r) => { signAct(s, r, 'hiphop', 'new_york', 6, 2); signAct(s, r, 'hiphop', 'new_york', 4, 1); },
    metric: (s, b) => s.player.stats.top10s - (b.top10s ?? 0), fail: insolvent,
  },
  {
    id: 'grunge_1989', name: l('Seattle antes da explosão', 'Seattle before the explosion'), startYear: 1989, endYear: 1995, homeCity: 'seattle', scenario: 'from_zero',
    desc: l('Chuva, flanela e guitarras sujas. O mundo ainda não sabe o que vem aí.', 'Rain, flannel and dirty guitars. The world doesn\'t know what\'s coming.'),
    goal: l('Conquiste discos de ouro e platina.', 'Earn gold and platinum records.'), unit: l('certificações', 'certifications'), tiers: [1, 3, 6],
    setup: (s, r) => { signAct(s, r, 'grunge', 'seattle', 8, 4); },
    metric: (s, b) => s.player.stats.gold + s.player.stats.platinum - (b.certs ?? 0), fail: insolvent,
  },
  {
    id: 'festival_king', name: l('Rei dos festivais', 'Festival king'), startYear: 1985, endYear: 1995, homeCity: 'london', scenario: 'emerging',
    desc: l('1985: a era dos megafestivais começa. Monte o seu e faça seus artistas tocarem em todos.', '1985: the mega-festival era begins. Build your own and get your acts on every bill.'),
    goal: l('Some edições boas do seu festival e participações em festivais.', 'Add up good editions of your festival and festival appearances.'), unit: l('pontos de festival', 'festival points'), tiers: [4, 10, 18],
    metric: (s, b) => (liveOf(s).counters.festGood ?? 0) * 2 + s.player.stats.festivals - (b.festivals ?? 0), fail: insolvent,
  },
];
export const scenarioById = Object.fromEntries(SCENARIOS.map((x) => [x.id, x])) as Record<string, ScenarioDef>;

export function scenarioConfig(def: ScenarioDef, base: RunConfig): RunConfig {
  return { ...base, startYear: def.startYear, homeCity: def.homeCity, scenario: def.scenario, role: def.role ?? 'label', mode: 'historic', mutators: [], card: 'none', bandGenre: def.bandGenre ?? base.bandGenre };
}

export function medalOf(def: ScenarioDef, value: number): Medal {
  return value >= def.tiers[2] ? 'gold' : value >= def.tiers[1] ? 'silver' : value >= def.tiers[0] ? 'bronze' : 'none';
}

function scenarioMonth(s: GameState): void {
  const run = liveOf(s).scenario;
  if (!run || run.done) return;
  const def = scenarioById[run.id];
  if (!def) return;
  run.value = def.metric(s, run.base);
  const failed = def.fail?.(s) ?? null;
  const deadline = s.year > run.endYear || (s.year === run.endYear && s.month === 11);
  if (!failed && !deadline) return;
  const medal = failed ? 'none' : medalOf(def, run.value);
  run.done = { medal, value: run.value, year: s.year, failed: !!failed };
  remember(s, 'scenario_end', fmtL(l('Cenário "{n}" encerrado: {m}.', 'Scenario "{n}" finished: {m}.'), { n: def.name, m: MEDAL_NAME[medal] }), { important: true });
  queueCutscene(s, 'scenarioResult', { title: def.name, scenarioId: def.id, medal, value: run.value, failed: failed ?? undefined });
}

export const MEDAL_NAME: Record<Medal, L> = {
  gold: l('ouro', 'gold'), silver: l('prata', 'silver'), bronze: l('bronze', 'bronze'), none: l('sem medalha', 'no medal'),
};

// ---------------------------------------------------------------- desafio da semana

/** Chave ISO da semana ("2026-W41"). Recebe a data pela interface; a simulação nunca lê relógio. */
export function weekKeyOf(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

export const CHALLENGE_YEARS = 8;

/** Regras fixas da semana: mesma chave → mesma seed, ano, cidade, carta, mutadores e prazo. */
export function weeklyChallenge(week: string, base: RunConfig): { cfg: RunConfig; rules: L[]; code: string } {
  const years = [1950, 1962, 1980, 2000, 1920, 2030];
  const startYear = years[hashString(week + 'y') % years.length];
  const cityPool = CITIES.filter((c) => ['new_york', 'london', 'rio', 'sao_paulo', 'tokyo', 'paris', 'berlin', 'los_angeles', 'kingston', 'lagos', 'seoul', 'detroit', 'memphis', 'buenos_aires'].includes(c.id));
  const city = cityPool[hashString(week + 'c') % cityPool.length];
  const card = CARDS[hashString(week + 'k') % CARDS.length];
  const mut1 = MUTATORS[hashString(week + 'm1') % MUTATORS.length];
  const mut2 = MUTATORS[hashString(week + 'm2') % MUTATORS.length];
  const mutators = [...new Set([mut1.id, mut2.id])];
  const difficulty = (['easy', 'normal', 'hard'] as const)[hashString(week + 'd') % 3];
  const cfg: RunConfig = { ...base, seed: `semana-${week}`, startYear, homeCity: city.id, card: card.id, mutators, difficulty, mode: 'free', role: 'label', scenario: 'from_zero', ironman: true };
  const rules: L[] = [
    fmtL(l('Início: {y} em {c}', 'Start: {y} in {c}'), { y: startYear, c: city.name }),
    fmtL(l('Carta: {k}', 'Card: {k}'), { k: card.name }),
    fmtL(l('Mutadores: {m}', 'Mutators: {m}'), { m: { pt: mutators.map((id) => MUTATORS.find((x) => x.id === id)!.name.pt).join(', '), en: mutators.map((id) => MUTATORS.find((x) => x.id === id)!.name.en).join(', ') } }),
    fmtL(l('Dificuldade: {d} · ironman · {n} anos', 'Difficulty: {d} · ironman · {n} years'), { d: difficulty, n: CHALLENGE_YEARS }),
  ];
  return { cfg, rules, code: `VTN-${week}` };
}

/** Pontuação do desafio: legado + sucessos. */
export function challengeScore(s: GameState): number {
  const p = s.player;
  return Math.round(sum(Object.values(p.legacy)) * 10 + p.stats.top10s * 40 + p.stats.number1s * 120 + p.stats.gold * 60 + p.stats.platinum * 120 + (liveOf(s).counters.festGood ?? 0) * 50);
}

export function shareCode(run: ChallengeRun, signature: string): string {
  return `${run.code}·${run.done?.score ?? 0}·${signature}`;
}

function challengeMonth(s: GameState): void {
  const c = liveOf(s).challenge;
  if (!c || c.done) return;
  if (s.ended || s.year > c.endYear || (s.year === c.endYear && s.month === 11)) {
    c.done = { score: challengeScore(s), year: s.year };
    remember(s, 'challenge_end', fmtL(l('Desafio {c} encerrado: {p} pontos.', 'Challenge {c} finished: {p} points.'), { c: c.code, p: c.done.score }), { important: true });
    queueCutscene(s, 'challengeResult', { title: l('Desafio da semana', 'Weekly challenge'), score: c.done.score, code: c.code });
  }
}

// ---------------------------------------------------------------- pacote de universo

const FAMILIES: Label['family'][] = ['A', 'B', 'C', 'D'];

/** Valida e normaliza um pacote vindo de JSON. Devolve o pacote ou uma mensagem de erro. */
export function validatePack(raw: unknown): UniversePack | L {
  if (!raw || typeof raw !== 'object') return l('JSON inválido.', 'Invalid JSON.');
  const o = raw as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(o[k]) ? (o[k] as Record<string, unknown>[]) : []);
  const str = (v: unknown, max = 60) => String(v ?? '').slice(0, max).trim();
  const num = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? clamp(Number(v), lo, hi) : d);
  const lt = (v: unknown): L => (v && typeof v === 'object' ? { pt: str((v as L).pt, 200), en: str((v as L).en || (v as L).pt, 200) } : { pt: str(v, 200), en: str(v, 200) });
  const pack: UniversePack = {
    name: str(o.name, 40) || 'Pacote',
    version: 1,
    labels: arr('labels').filter((x) => cityById[str(x.city)]).slice(0, 12).map((x) => ({ name: str(x.name) || 'Selo', city: str(x.city), family: FAMILIES.includes(x.family as Label['family']) ? (x.family as Label['family']) : 'B', focus: Array.isArray(x.focus) ? (x.focus as unknown[]).map((f) => str(f, 20)).slice(0, 4) : [] })),
    acts: arr('acts').filter((x) => cityById[str(x.city)] && genreById[str(x.genre)]).slice(0, 30).map((x) => ({ name: str(x.name) || 'Ato', genre: str(x.genre), city: str(x.city), members: Math.round(num(x.members, 1, 7, 3)), fame: num(x.fame, 0, 80, 5), signed: !!x.signed })),
    scenes: arr('scenes').filter((x) => cityById[str(x.city)] && genreById[str(x.genre)]).slice(0, 30).map((x) => ({ city: str(x.city), genre: str(x.genre), strength: num(x.strength, 0, 30, 5) })),
    events: arr('events').slice(0, 40).map((x) => ({ year: Math.round(num(x.year, 1920, 2040, 1960)), month: Math.round(num(x.month, 0, 11, 0)), title: lt(x.title), text: lt(x.text), cash: x.cash !== undefined ? num(x.cash, -1e7, 1e7, 0) : undefined, genre: genreById[str(x.genre)] ? str(x.genre) : undefined, genreMult: x.genreMult !== undefined ? num(x.genreMult, 0.2, 3, 1) : undefined, fame: x.fame !== undefined ? num(x.fame, -30, 30, 0) : undefined })),
  };
  if (!pack.labels.length && !pack.acts.length && !pack.scenes.length && !pack.events.length) return l('O pacote está vazio (ou com cidades/gêneros desconhecidos).', 'The pack is empty (or uses unknown cities/genres).');
  return pack;
}

export const SAMPLE_PACK: UniversePack = {
  name: 'Exemplo: Cena de Recife', version: 1,
  labels: [{ name: 'Mangue Discos', city: 'recife', family: 'B', focus: ['brazil'] }],
  acts: [{ name: 'Caranguejo Elétrico', genre: 'mpb', city: 'recife', members: 4, fame: 12, signed: false }],
  scenes: [{ city: 'recife', genre: 'mpb', strength: 12 }],
  events: [{ year: 1994, month: 2, title: { pt: 'Manifesto da lama', en: 'The mud manifesto' }, text: { pt: 'Um manifesto agita a cena local.', en: 'A manifesto stirs the local scene.' }, genre: 'mpb', genreMult: 1.2 }],
};

function applyPack(s: GameState, r: Rng, pack: UniversePack): void {
  const lv = liveOf(s);
  lv.pack = pack.name;
  for (const lb of pack.labels) {
    const id = nextId(s, 'lbx');
    const home = cityById[lb.city]?.market ?? 'na';
    s.labels[id] = {
      id, name: lb.name, family: lb.family, city: lb.city, founded: s.year - 3, focus: lb.focus, cash: Math.round(s.player.cash * 4), reputation: 45, roster: [], active: true,
      aggression: 0.5, strategy: 'develop', territories: [home], revenueYear: 0, revenueLastYear: 0, procedural: true,
    };
  }
  for (const a of pack.acts) {
    const act = makeAct(s, r, { name: a.name, genre: a.genre, city: a.city, members: a.members, potential: r.int(55, 85), formed: s.year - 2, debutYear: s.year - 1, fame: a.fame });
    act.name = a.name;
    const f = Math.pow(10, 2 + a.fame / 25);
    act.fans = { casual: Math.round(f), active: Math.round(f * 0.15), core: Math.round(f * 0.03) };
    act.status = 'active';
    if (a.signed) grantPlayerContract(s, act, 36);
  }
  for (const sc of pack.scenes) s.scenes[`${sc.city}:${sc.genre}`] = (s.scenes[`${sc.city}:${sc.genre}`] ?? 0) + sc.strength;
  lv.events = pack.events.filter((e) => e.year >= s.year).map((e) => ({ ...e }) as CustomEvent);
  remember(s, 'pack', fmtL(l('Universo personalizado: {n}.', 'Custom universe: {n}.'), { n: pack.name }), { important: true });
}

function customEventsMonth(s: GameState): void {
  const lv = liveOf(s);
  for (const e of lv.events) {
    if (e.fired || e.year !== s.year || e.month !== s.month) continue;
    e.fired = true;
    if (e.cash) {
      // dinheiro do evento (dólares reais → centavos do ano) sempre via post
      post(s, `custom:${e.year}:${e.month}:${e.title.pt.slice(0, 20)}`, money(s, e.cash), 'admin', `Evento: ${e.title.pt}`);
    }
    if (e.genre && e.genreMult) s.genrePop[e.genre] = clamp((s.genrePop[e.genre] ?? 0.6) * e.genreMult, 0.1, 2);
    if (e.fame) for (const a of Object.values(s.acts)) if (a.owner === 'player') a.fame = clamp(a.fame + e.fame, 0, 100);
    notify(s, e.title, 'event');
    remember(s, 'custom_event', fmtL(l('{t}: {x}', '{t}: {x}'), { t: e.title, x: e.text }), { important: true });
  }
}

// ---------------------------------------------------------------- gancho de nova partida

registerSimHook('newgame', 'live-setup', (s, r) => {
  const setup = pending;
  pending = null;
  if (!setup) return;
  const lv = liveOf(s);
  if (setup.pack) applyPack(s, r, setup.pack);
  if (setup.scenarioId && scenarioById[setup.scenarioId]) {
    const def = scenarioById[setup.scenarioId];
    def.setup?.(s, r);
    const p = s.player;
    const run: ScenarioRun = {
      id: def.id, startYear: def.startYear, endYear: def.endYear, value: 0,
      base: { top10s: p.stats.top10s, number1s: p.stats.number1s, certs: p.stats.gold + p.stats.platinum, festivals: p.stats.festivals, cashReal: Math.round(toReal(p.cash, s.year)) },
    };
    lv.scenario = run;
    remember(s, 'scenario', fmtL(l('Cenário: {n}. Meta: {g}', 'Scenario: {n}. Goal: {g}'), { n: def.name, g: def.goal }), { important: true });
  }
  if (setup.challenge) {
    lv.challenge = { code: setup.challenge.code, week: setup.challenge.week, endYear: s.year + setup.challenge.years - 1, rules: setup.challenge.rules };
  }
});

registerSimHook('month', 'live-goals', (s) => {
  customEventsMonth(s);
  scenarioMonth(s);
  challengeMonth(s);
});

export function scenarioProgress(s: GameState): { def: ScenarioDef; run: ScenarioRun; value: number; medal: Medal; yearsLeft: number } | null {
  const run = liveOf(s).scenario;
  if (!run) return null;
  const def = scenarioById[run.id];
  if (!def) return null;
  const value = run.done ? run.done.value : def.metric(s, run.base);
  return { def, run, value, medal: run.done ? run.done.medal : medalOf(def, value), yearsLeft: Math.max(0, run.endYear - s.year) };
}

export type { Medal };
