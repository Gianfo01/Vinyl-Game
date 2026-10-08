// Gerador de mundo em camadas (GDD §5): L0 seed → L1 mundo → L2 elenco → L3 mercado → L5 jogador.

import './sys';
import { emptyExt, ensureExt } from './ext';
import { initWorldExt } from './worldext';
import { registerMovementGenres } from './culture';
import { clamp, hashString, Rng, seedState } from '../core/rng';
import { nominal } from '../core/money';
import { CATALOG_ACTS, CATALOG_LABELS } from '../data/catalog';
import { REAL_ACTS, REAL_LABELS, applyRealNames } from '../data/realnames';
import { REAL_CLASSIC } from '../data/realacts_classic';
import { STAFF_ROLES, TECHS } from '../data/rules';
import { CITIES, GENRES, MARKETS, cityById, familyOf, genreById, type MarketId } from '../data/world';
import { actTalent, makeAct, personName } from './people';
import type { Act, GameState, Label, RunConfig, StaffMember } from './types';
import { dayOfDate, fmtL, hasMutator, nextId, remember } from './util';
import { l } from '../data/world';
import { runSimHooks } from './ext4';

export const SAVE_VERSION = 5;

export function runSignature(seed: string, startYear: number): string {
  const h = hashString(seed).toString(16).toUpperCase().padStart(8, '0');
  return `${h.slice(0, 4)}-${startYear + (hashString(seed + 'y') % 61)}`;
}

function genTechDates(cfg: RunConfig, r: Rng): { dates: Record<string, number>; divergence: Record<string, string> } {
  const dates: Record<string, number> = {};
  const divergence: Record<string, string> = {};
  for (const t of TECHS) {
    let y = t.base;
    if (cfg.mode === 'free') y += r.int(-t.spread, t.spread);
    if (cfg.mode === 'chaos') y += r.int(-t.spread * 2, t.spread * 2);
    if (cfg.mutators.includes('early_streaming') && ['internet', 'p2p', 'download', 'streaming', 'short_video'].includes(t.id)) y -= 4;
    if (cfg.mutators.includes('early_synthetic') && ['synthetic_voice', 'neural'].includes(t.id)) y -= 5;
    for (const d of t.deps) if (dates[d] !== undefined) y = Math.max(y, dates[d] + 1);
    if (t.id === 'radio') y = Math.min(y, 1920);
    dates[t.id] = y;
  }
  // ponto de divergência: a rede de clipes surge ou não (GDD §5.4)
  const clipChance = cfg.mode === 'historic' ? 1 : cfg.mode === 'free' ? 0.85 : 0.6;
  if (!r.chance(clipChance)) {
    delete dates.clipnet;
    divergence.clipnet = 'no';
  } else divergence.clipnet = 'yes';
  // qual formato domina os anos 80
  divergence.format80 = cfg.mode === 'historic' ? 'cd' : r.chance(0.75) ? 'cd' : 'cassette';
  // modelo de streaming
  divergence.streamingModel = cfg.mode === 'historic' ? 'subscription' : r.chance(0.6) ? 'subscription' : 'ads';
  return { dates, divergence };
}

const OLD_LABEL_NAMES = ['Halcyon Disc Company', 'Eagle Phonograph Co.', 'Bluebell Records', 'Monarch Talking Machine', 'Crescent Gramophone', 'Union Cylinder Works'];

function makeLabel(s: GameState, r: Rng, def: { id: string; name: string; family: Label['family']; city: string; founded: number; focus: string[] }, procedural = false): Label {
  const capital = { A: 9_000_000, B: 1_200_000, C: 3_000_000, D: 4_000_000 }[def.family];
  const year = Math.max(s.year, def.founded);
  const label: Label = {
    id: def.id,
    name: def.name,
    family: def.family,
    city: def.city,
    founded: def.founded,
    focus: def.focus,
    cash: nominal(capital * r.float(0.7, 1.3), year),
    reputation: r.int(35, 70),
    roster: [],
    active: def.founded <= s.year,
    aggression: clamp(r.float(0.3, 0.8) + (hasMutator(s, 'cruel_industry') ? 0.25 : 0), 0, 1),
    strategy: r.pick(['develop', 'buy_catalog', 'niche', 'stars'] as const),
    territories: [],
    revenueYear: 0,
    revenueLastYear: 0,
    procedural,
  };
  const home = cityById[def.city]?.market ?? 'na';
  label.territories = def.family === 'A' ? MARKETS.map((m) => m.id) : def.family === 'B' ? [home] : [home, 'na', 'eu'].filter((v, i, a) => a.indexOf(v) === i) as MarketId[];
  if (def.family === 'D') label.territories = [home, 'na', 'eu'].filter((v, i, a) => a.indexOf(v) === i) as MarketId[];
  s.labels[label.id] = label;
  return label;
}

export function aliveGenres(s: GameState, year = s.year): string[] {
  return GENRES.filter((g) => g.born <= year).map((g) => g.id);
}

export function spawnProceduralAct(s: GameState, r: Rng, opts: { city?: string; genre?: string; potential?: number; formedYear?: number; fame?: number } = {}): Act {
  const year = opts.formedYear ?? s.year;
  const city = opts.city ?? r.weighted(CITIES, (c) => MARKETS.find((m) => m.id === c.market)!.size(year))!.id;
  const cityDef = cityById[city];
  let genre = opts.genre;
  if (!genre) {
    const sceneGenres = cityDef.scenes.filter((gid) => genreById[gid] && genreById[gid].born <= year);
    const alive = aliveGenres(s, year);
    genre = sceneGenres.length && r.chance(0.65) ? r.pick(sceneGenres) : r.weighted(alive, (gid) => (s.genrePop[gid] ?? 0.6))!;
  }
  const fam = familyOf(genre);
  const soloChance = ['pop', 'hiphop', 'country_folk', 'latin', 'brazil', 'europe', 'sacred'].includes(fam) ? 0.6 : 0.35;
  const members = r.chance(soloChance) ? 1 : r.chance(0.2) ? 2 : r.int(3, 5);
  // distribuição de potencial: maioria média, cauda rara de gênios
  let potential = opts.potential ?? clamp(r.normal(52, 14), 15, 92);
  if (hasMutator(s, 'rare_talent')) potential = Math.min(potential, r.chance(0.97) ? 78 : 92);
  let archetype: Act['archetype'];
  if (opts.potential === undefined && r.chance(0.012)) {
    archetype = 'genius';
    potential = r.int(90, 99);
  }
  const act = makeAct(s, r, {
    genre,
    city,
    members,
    potential,
    formed: year - r.int(0, 2),
    debutYear: year,
    archetype,
    fame: opts.fame ?? (archetype === 'genius' ? 0.5 : r.float(0, 5)),
    startFrac: r.float(0.4, 0.62),
  });
  return act;
}

function spawnCatalogAct(s: GameState, r: Rng, u: GameState['upcoming'][number], activeYears: number): Act {
  const act = makeAct(s, r, {
    name: u.members === 1 ? u.name : u.name,
    genre: u.genre,
    city: u.city,
    members: u.members,
    potential: u.potential,
    formed: u.debut - 1,
    debutYear: u.debut,
    catalogNo: u.no,
    archetype: u.synthetic ? 'synthetic' : undefined,
    fame: 0,
    startFrac: activeYears > 0 ? 0.75 : r.float(0.5, 0.65),
    rs: u.rs,
  });
  act.name = u.name;
  // modo nomes reais: integrantes conhecidos com os nomes de verdade
  const real = s.config.realNames ? REAL_ACTS[u.no] : undefined;
  if (real) {
    act.name = real.name;
    const names = real.members ?? (act.members.length === 1 ? [real.name] : []);
    act.members.forEach((id, i) => { if (names[i] && s.persons[id]) s.persons[id].name = names[i]; });
  }
  if (activeYears > 0) {
    act.status = 'active';
    act.fame = clamp((15 + activeYears * 4) * (u.potential / 95) + r.normal(0, 6), 5, 85);
    act.momentum = r.float(30, 70);
    act.positioning = r.float(30, 80);
    const f = Math.pow(10, 2 + act.fame / 22);
    act.fans = { casual: Math.round(f), active: Math.round(f * 0.2), core: Math.round(f * 0.04) };
    for (const id of act.members) {
      const p = s.persons[id];
      for (const k of Object.keys(p.skills) as (keyof typeof p.skills)[]) p.skills[k] = Math.min(p.potential, p.skills[k] + activeYears * 2);
    }
  }
  return act;
}

export function createGame(cfg: RunConfig): GameState {
  applyRealNames(!!cfg.realNames);
  const startDay = 0;
  const s: GameState = {
    ...emptyExt(),
    version: SAVE_VERSION,
    config: cfg,
    signature: runSignature(cfg.seed, cfg.startYear),
    rng: seedState(cfg.seed),
    week: 0,
    day: startDay,
    year: cfg.startYear,
    month: 0,
    idSeq: 0,
    techDates: {},
    divergence: {},
    rumors: [],
    persons: {},
    acts: {},
    songs: {},
    releases: {},
    contracts: {},
    labels: {},
    knowledge: {},
    offers: [],
    pendingReleases: [],
    agenda: {},
    delegated: {},
    scoutRequests: [],
    scoutActionsUsed: 0,
    player: {
      cash: 0,
      initialCash: 0,
      totalPosted: 0,
      hq: 1,
      staff: [],
      equipment: [],
      reputation: { artistic: 30, commercial: 25, artists: 40, institutional: 35 },
      territories: [],
      loans: [],
      legacy: { commercial: 0, cultural: 0, artists: 0, innovation: 0, industry: 0, catalog: 0, reputation: 0 },
      neural: { synthActs: 0, voiceLicenses: 0, consentPolicy: 'none', catalogTraining: false, neuralAdopted: null, voiceScandal: false, ghostVoice: false, humanFocus: 0 },
      insolvencyMonths: 0,
      revenueByYear: {},
      profitByYear: {},
      stats: { releases: 0, number1s: 0, top10s: 0, gold: 0, platinum: 0, awards: 0, headlines: 0, festivals: 0, reissues: 0, signed: 0, leftUnhappy: 0, scandalsSurvived: 0, marketsPresent: 1, influential: 0 },
      goalsDone: [],
      reissues: 0,
      totals: {},
    },
    ledger: [],
    ledgerKeys: {},
    monthLedger: {},
    lastMonthLedger: {},
    charts: { singles: [], albums: [], number1History: [] },
    decisions: [],
    eventCooldowns: {},
    tension: 0.3,
    memory: [],
    notifications: [],
    briefing: [],
    genrePop: {},
    scenes: {},
    economy: { cycle: 0, recession: false, recessionUntil: 0, rightsMult: 1, strikeUntil: 0, investorShare: 0, investorUntil: 0 },
    flags: {},
    awards: [],
    professionals: [],
    upcoming: [],
    stats: { weeklyPool: 0, marketUnitsYear: 0, playerUnitsYear: 0, marketShare: 0 },
  };
  registerMovementGenres(s);
  s.day = dayOfDate(cfg.startYear, cfg.startYear, 0);
  const r = new Rng(s.rng);

  // L1 — mundo
  const tech = genTechDates(cfg, r);
  s.techDates = tech.dates;
  s.divergence = tech.divergence;
  for (const g of GENRES) s.genrePop[g.id] = g.born <= cfg.startYear ? clamp(r.float(0.6, 1.3) - Math.max(0, (cfg.startYear - g.born - 25) / 60), 0.25, 1.4) : 0.4;

  // L3 — mercado: gravadoras
  for (const def of CATALOG_LABELS) {
    const founded = cfg.mode === 'chaos' ? def.founded + r.int(-12, 12) : cfg.mode === 'free' ? def.founded + r.int(-4, 4) : def.founded;
    makeLabel(s, r, { ...def, name: cfg.realNames ? REAL_LABELS[def.id] ?? def.name : def.name, founded: def.id === 'cortex' ? Math.max(founded, s.techDates.synthetic_voice - 2) : founded });
  }
  const activeCount = Object.values(s.labels).filter((x) => x.active).length;
  for (let i = 0; i < Math.max(0, 5 - activeCount); i++) {
    const city = r.pick(['new_york', 'london', 'paris', 'berlin', 'rio', 'buenos_aires']);
    makeLabel(s, r, { id: 'old' + i, name: OLD_LABEL_NAMES[i], family: r.pick(['A', 'B', 'C', 'D'] as const), city, founded: cfg.startYear - r.int(3, 20), focus: [] }, true);
  }

  // L2 — elenco: catálogo como banco de arquétipos
  const presence = cfg.mode === 'historic' ? 1 : cfg.mode === 'free' ? r.float(0.6, 1) : r.float(0.3, 1);
  for (const ca of CATALOG_ACTS) {
    if (!r.chance(presence)) continue;
    const jitter = cfg.mode === 'historic' ? 0 : cfg.mode === 'free' ? r.int(-2, 2) : r.int(-7, 7);
    let potential = r.int(80, 97);
    if (hasMutator(s, 'rare_talent')) potential -= r.int(0, 10);
    if (hasMutator(s, 'no_stars')) potential -= 6;
    const realD = cfg.realNames ? REAL_CLASSIC[ca.no]?.d : undefined;
    const u = { no: ca.no, name: ca.name, genre: ca.genre, city: ca.city, members: ca.members, debut: (realD ?? ca.debut) + jitter, potential, rs: ca.rs, synthetic: ca.synthetic };
    const activeYears = cfg.startYear - u.debut;
    if (activeYears >= 0) {
      const realE = cfg.realNames ? REAL_CLASSIC[ca.no]?.e : undefined;
      const careerLen = realE !== undefined ? realE - u.debut + (cfg.mode === 'historic' ? 0 : r.int(-3, 3)) : r.int(14, 40);
      if (activeYears > careerLen) continue; // já faz parte da história
      const act = spawnCatalogAct(s, r, u, activeYears);
      act.careerEnd = u.debut + careerLen;
      signToBestRival(s, r, act);
    } else s.upcoming.push(u);
  }

  // procedurais iniciais
  const procCount = Math.round((hasMutator(s, 'small_world') ? 50 : hasMutator(s, 'giant_world') ? 150 : 95) * (cfg.mode === 'historic' ? 0.9 : 1.1));
  for (let i = 0; i < procCount; i++) {
    const act = spawnProceduralAct(s, r, { formedYear: cfg.startYear - r.int(0, 8) });
    const years = cfg.startYear - act.formed;
    act.status = years > 1 ? 'active' : 'emerging';
    act.fame = clamp(r.normal(4 + years * 2.5, 5) * (act.potential / 60), 0, 60);
    const f = Math.pow(10, 2 + act.fame / 25);
    act.fans = { casual: Math.round(f), active: Math.round(f * 0.15), core: Math.round(f * 0.03) };
    if (act.fame > 18 && r.chance(0.6)) signToBestRival(s, r, act);
  }

  // L5 — jogador
  setupPlayer(s, r);
  for (const lb of Object.values(s.labels)) lb.revenueLastYear = 0;
  s.professionals = genProfessionals(s, r, 8);

  // rumores iniciais de cena (sinais)
  seedInitialSignals(s, r);
  ensureExt(s);
  initWorldExt(s, r);
  runSimHooks('newgame', s, r);

  remember(s, 'start', fmtL(l('{company} abre as portas em {city}, {year}. Run {sig}.', '{company} opens its doors in {city}, {year}. Run {sig}.'), {
    company: cfg.companyName,
    city: cityById[cfg.homeCity]?.name ?? cfg.homeCity,
    year: cfg.startYear,
    sig: s.signature,
  }), { important: true });
  return s;
}

export function signToBestRival(s: GameState, r: Rng, act: Act): void {
  const fam = familyOf(act.genre);
  const candidates = Object.values(s.labels).filter((lb) => lb.active && lb.roster.length < 40);
  const lb = r.weighted(candidates, (x) => (x.focus.length === 0 ? 1 : x.focus.includes(fam) ? 3 : 0.2) * (cityById[x.city]?.market === cityById[act.city]?.market ? 2 : 1));
  if (!lb) return;
  const id = nextId(s, 'k');
  s.contracts[id] = {
    id,
    actId: act.id,
    party: lb.id,
    model: 'classic',
    advance: 0,
    royalty: r.float(0.12, 0.2),
    termMonths: r.int(36, 84),
    startWeek: s.week - r.int(0, 100),
    endWeek: s.week + r.int(20, 300),
    releasesOwed: 4,
    releasesDone: 0,
    creativeControl: false,
    publishing: lb.family === 'D',
    share360: 0,
    recoupBalance: 0,
    promises: [],
  };
  act.owner = lb.id;
  act.contractId = id;
  lb.roster.push(act.id);
}

function setupPlayer(s: GameState, r: Rng): void {
  const cfg = s.config;
  const p = s.player;
  const home = cityById[cfg.homeCity]?.market ?? 'na';
  p.territories = [home];
  const diffMult = cfg.difficulty === 'easy' ? 1.5 : cfg.difficulty === 'hard' ? 0.7 : 1;
  let real = 0;
  if (cfg.role === 'artist') {
    real = 60000;
    p.hq = 0;
  } else if (cfg.role === 'hybrid') {
    real = 55000;
    p.hq = 1;
  } else {
    real = cfg.scenario === 'from_zero' ? 45000 : cfg.scenario === 'emerging' ? 110000 : 650000;
    p.hq = cfg.scenario === 'established' ? 2 : 1;
  }
  if (cfg.card === 'prospector') real *= 0.8;
  real *= diffMult;
  p.cash = nominal(real, s.year);
  p.initialCash = p.cash;

  if (cfg.role === 'artist' || cfg.role === 'hybrid') {
    const genre = cfg.bandGenre && genreById[cfg.bandGenre] ? cfg.bandGenre : 'rnr';
    const members = r.int(1, 4);
    const act = makeAct(s, r, { name: cfg.bandName || undefined, genre, city: cfg.homeCity, members, potential: r.int(62, 78), formed: s.year, debutYear: s.year, fame: 1, startFrac: 0.6 });
    if (cfg.bandName) act.name = cfg.bandName;
    act.owner = 'player';
    act.playerBand = true;
    act.trust = 100;
    act.status = 'emerging';
    p.bandActId = act.id;
    s.knowledge[act.id] = { actId: act.id, degree: 5, stage: 'negotiation', bias: 0, updatedWeek: 0, source: 'self' };
    s.delegated[act.id] = true;
  }
  if (cfg.role !== 'artist' && cfg.scenario !== 'from_zero') {
    const n = cfg.scenario === 'established' ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const act = spawnProceduralAct(s, r, { city: cfg.homeCity, potential: r.int(50, 72), fame: r.int(8, 25), formedYear: s.year - 2 });
      act.status = 'active';
      grantPlayerContract(s, act, r.int(36, 60));
      s.knowledge[act.id] = { actId: act.id, degree: 4, stage: 'negotiation', bias: r.normal(0, 3), updatedWeek: 0, source: 'roster' };
    }
    if (cfg.scenario === 'established') {
      for (const role of ['producer', 'anr', 'publicist']) p.staff.push(genStaff(s, r, role, r.int(45, 65)));
      p.territories = [...new Set([home, 'na', 'eu'] as MarketId[])];
    }
  }
}

export function grantPlayerContract(s: GameState, act: Act, months: number): void {
  const id = nextId(s, 'k');
  s.contracts[id] = {
    id,
    actId: act.id,
    party: 'player',
    model: 'classic',
    advance: 0,
    royalty: 0.16,
    termMonths: months,
    startWeek: s.week,
    endWeek: s.week + Math.round(months * 4.35),
    releasesOwed: 3,
    releasesDone: 0,
    creativeControl: false,
    publishing: false,
    share360: 0,
    recoupBalance: 0,
    promises: [],
  };
  act.owner = 'player';
  act.contractId = id;
  act.trust = 60;
  s.delegated[act.id] = true;
}

export function genStaff(s: GameState, r: Rng, role: string, skill: number): StaffMember {
  const def = STAFF_ROLES.find((x) => x.id === role)!;
  const lang = r.pick(['en', 'pt', 'es', 'fr', 'de', 'it'] as const);
  return {
    id: nextId(s, 'st'),
    name: personName(r, lang),
    role,
    skill,
    salary: nominal(def.salary * (0.5 + skill / 100), s.year),
    hiredWeek: s.week,
    trait: r.pick(['disciplined', 'workaholic', 'diplomatic', 'perfectionist', 'lazy', 'ambitious', 'loyal', 'opportunist']),
  };
}

export function genProfessionals(s: GameState, r: Rng, n: number): StaffMember[] {
  const out: StaffMember[] = [];
  for (let i = 0; i < n; i++) out.push(genStaff(s, r, r.pick(STAFF_ROLES).id, clamp(Math.round(r.normal(48, 16)), 15, 95)));
  return out;
}

function seedInitialSignals(s: GameState, r: Rng): void {
  const home = s.config.homeCity;
  const unsigned = Object.values(s.acts).filter((a) => !a.owner);
  const local = unsigned.filter((a) => a.city === home);
  const pool = r.shuffle([...local, ...r.shuffle(unsigned.filter((a) => a.city !== home)).slice(0, 4)]).slice(0, 6);
  for (const a of pool) addSignal(s, r, a.id, 'scene');
  // garante pelo menos três sinais locais
  for (let i = local.length; i < 3; i++) {
    const act = spawnProceduralAct(s, r, { city: home });
    addSignal(s, r, act.id, 'scene');
  }
}

export function addSignal(s: GameState, r: Rng, actId: string, source: string): void {
  if (s.knowledge[actId]) return;
  s.knowledge[actId] = { actId, degree: 1, stage: 'signal', bias: r.normal(0, 7), updatedWeek: s.week, source };
}

export function talentScore(s: GameState, act: Act): number {
  const t = actTalent(s, act);
  return t.comp * 0.25 + t.lyr * 0.15 + Math.max(t.voice, t.instr) * 0.3 + t.stage * 0.15 + t.prod * 0.15;
}
