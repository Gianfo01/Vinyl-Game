// Mercado semanal: atenção finita, vendas, estoque, receita separada (master × edição),
// paradas WorldSound 100 / Albums e autópsia (GDD §7, §13, §14, §16, §24).

import { physShareRel18 } from './sys/eras18';
import { baseMult18, recoupable18, takeRecoup18 } from './sys/contracts18';
import { postAR18, postRoyAP18, postSalesAR18, proDue18 } from './sys/econ18';
import { clamp, type Rng } from '../core/rng';
import { nominal } from '../core/money';
import { isUnlocked } from './era';
import { CHANNELS, EQUIPMENT, FORMATS, type FormatId } from '../data/rules';
import { MARKETS, MARKET_PREF, cityById, familyOf, genreById, l, type MarketId } from '../data/world';
import { payAuthors } from './finance';
import { superfanDebut } from './fandom';
import type { Act, AutopsyFactor, ChartEntry, GameState, PendingRelease, Release } from './types';
import { fmtL, hasCard, hasMutator, hasTech, nextId, notify, post, remember, staffCount, staffSkill } from './util';
import { songProfile } from './repertoire';
import { applyMods, runSimHooks } from './ext4';
import { artistRate, dealOfRelease, hasGuest, rightsOf } from './rights';
import { noteRelease17 } from './relidx17';
import { allReleases17 } from './relidx17';

const POOL: [number, number][] = [
  [1920, 260e3], [1930, 300e3], [1945, 600e3], [1955, 1.5e6], [1965, 3e6], [1975, 5e6], [1985, 6e6],
  [1995, 8e6], [2001, 8e6], [2006, 5e6], [2010, 4.2e6], [2015, 5e6], [2020, 7e6], [2030, 9e6], [2040, 10e6],
];

const MARKET_TAIL = 140;
/** 0 até 1994, sobe até 0.22 em 2015: hits concentram menos a demanda. */
/** Fatia semanal máxima de um único lançamento: alta na era do rádio, baixa no streaming. */
/** Fatia do mercado a partir da qual o selo do jogador rende menos; na era do streaming três majors
 *  dominam playlists e varejo, e o espaço para um selo independente encolhe. */
const scaleShare = (y: number): number => Math.max(0.012, Math.min(0.03, 0.03 - (y - 2000) * 0.0012));
export const maxShare = (y: number): number => Math.max(0.02, Math.min(0.06, 0.06 - (y - 1985) * 0.0012));
export const fragmentation = (y: number): number => Math.max(0, Math.min(0.22, (y - 1994) * 0.0105));

export function weeklyPool(s: GameState, year = s.year): number {
  let v = POOL[POOL.length - 1][1];
  for (let i = 1; i < POOL.length; i++) {
    if (year <= POOL[i][0]) {
      const [y0, v0] = POOL[i - 1];
      const [y1, v1] = POOL[i];
      v = v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
      break;
    }
  }
  if (year < POOL[0][0]) v = POOL[0][1];
  if (hasMutator(s, 'fragile_market')) v *= 0.75;
  if (s.economy.recession) v *= 0.85;
  v *= s.flags.geoDemand ?? 1; // guerras, crises e pandemias (culture.ts)
  return v;
}

export function coverage(territories: MarketId[], genre: string, year: number, positioning = 40): number {
  const fam = familyOf(genre);
  let num = 0;
  let den = 0;
  for (const m of MARKETS) {
    const size = m.size(year);
    const pref = MARKET_PREF[m.id][fam] ?? 0.6;
    // crossover reduz o peso do gosto local
    const eff = pref + (1 - pref) * (positioning / 100) * 0.5;
    den += size;
    if (territories.includes(m.id)) num += size * eff;
  }
  return den ? num / den : 0;
}

export function marketingE(s: GameState, marketing: { channel: string; budget: number }[], owner: string): number {
  let x = 0;
  for (const m of marketing) {
    const ch = CHANNELS.find((c) => c.id === m.channel);
    if (!ch) continue;
    const real = m.budget / 100 / (nominal(1, s.year) / 100);
    let eff = ch.sales;
    if (hasMutator(s, 'hostile_radio') && ch.id === 'radio_plug') eff *= 0.6;
    if (owner === 'player') {
      eff *= 1 + staffSkill(s, 'publicist') / 250;
      for (const id of s.player.equipment) eff *= 1 + (EQUIPMENT.find((e) => e.id === id)?.effect.marketing ?? 0);
      if (hasCard(s, 'digital_native') && ['playlists', 'social', 'short_clips', 'web_forums', 'neural_feed'].includes(ch.id)) eff *= 1.25;
    }
    x += (real * eff) / ch.reachCost;
  }
  return 1 - Math.exp(-x); // E = 1 − exp(−investimento / custo de alcance)
}

export function availableChannels(s: GameState): typeof CHANNELS {
  return CHANNELS.filter((c) => (!c.from || hasTech(s, c.from)) && (!c.untilYear || s.year <= c.untilYear) && isUnlocked(s, c.id));
}

export function decay(type: Release['type'], age: number): number {
  if (type === 'single') return age < 2 ? 0.75 + 0.12 * age : Math.pow(0.88, age - 2);
  if (type === 'ep') return age < 2 ? 0.85 : Math.pow(0.9, age - 2);
  return age < 3 ? 0.9 + age * 0.03 : Math.pow(0.935, age - 3);
}

function releaseQ(s: GameState, songIds: string[]): number {
  const qs = songIds.map((id) => s.songs[id]?.q ?? 0).sort((a, b) => b - a);
  if (!qs.length) return 0;
  if (qs.length === 1) return qs[0];
  const avg = qs.reduce((t, x) => t + x, 0) / qs.length;
  return qs[0] * 0.5 + avg * 0.5;
}

function eraTypeFit(year: number, type: Release['type']): number {
  if (type === 'lp') return year < 1950 ? 0.5 : year < 1965 ? 0.8 : year < 2008 ? 1.15 : 0.85;
  if (type === 'ep') return 0.9;
  return year < 1965 ? 1.15 : year < 2008 ? 0.95 : 1.1;
}

const t0 = (x: { pt: string }) => x.pt;

export function computeAppeal(s: GameState, r: Rng, rel: Release, act: Act): { appeal: number; factors: AutopsyFactor[] } {
  // ferramentas digitais baratas: a partir dos anos 90 todo mundo grava bem, e a qualidade técnica
  // do jogador conta menos contra a concorrência (sem isso, começar tarde era fácil demais)
  const commod = rel.owner === 'player' || act.playerBand ? Math.max(0, Math.min(15, (s.year - 1990) * 0.75)) : 0;
  const qF = Math.pow(Math.max(5, rel.q - commod) / 55, 2.4);
  // convexo: estrelas concentram atenção; desconhecidos disputam a cauda
  const fameF = 0.12 + Math.pow(act.fame / 40, 1.6) + Math.log10(1 + act.fans.core) / 14;
  const gp = s.genrePop[act.genre] ?? 0.6;
  const cov = coverage(rel.territories, act.genre, s.year, act.positioning);
  const era = eraTypeFit(s.year, rel.type);
  const design = rel.owner === 'player' && staffCount(s, 'designer') ? 1.05 : 1;
  const mom = 0.8 + act.momentum / 250;
  const luck = Math.exp(r.normal(0, 0.33));
  const nostalgia = rel.reissueOf ? (hasMutator(s, 'strong_nostalgia') ? 0.6 : 0.35) : rel.kind === 'compilation' ? 0.45 + act.fame / 250 : rel.kind === 'demo' ? 0.35 : rel.kind === 'live' ? 0.55 + act.fame / 300 : 1;
  // gancho: singles vivem do refrão (perfil comercial da faixa principal)
  const lead = s.songs[rel.songs[0]];
  const hook = rel.type === 'single' && lead ? 0.85 + songProfile(lead).hook / 330 : 1;
  // superexposição: lançar demais no mesmo ano cansa o público
  const recent = act.releases.filter((id) => s.releases[id] && s.week - s.releases[id].week < 52 && id !== rel.id).length;
  const overexposure = 1 / (1 + Math.max(0, recent - 1) * 0.35);
  const base = qF * fameF * gp * cov * era * design * mom * luck * nostalgia * overexposure * hook;
  const mods = applyMods(s, 'appeal', base, { release: rel, act });
  const appeal = mods.value;
  const conf = (v: number): AutopsyFactor['confidence'] => (Math.abs(Math.log(v)) > 0.5 ? 'high' : Math.abs(Math.log(v)) > 0.2 ? 'medium' : 'low');
  const factors: AutopsyFactor[] = [
    { key: 'quality', label: l('Qualidade (Q)', 'Quality (Q)'), value: qF, confidence: conf(qF) },
    { key: 'fame', label: l('Alcance e fãs do ato', 'Act reach and fans'), value: fameF, confidence: conf(fameF) },
    { key: 'genre', label: l('Popularidade do gênero', 'Genre popularity'), value: gp, confidence: conf(gp) },
    { key: 'coverage', label: l('Cobertura de distribuição', 'Distribution coverage'), value: cov * 2, confidence: conf(cov * 2) },
    { key: 'era', label: l('Formato na era', 'Format fit for the era'), value: era, confidence: 'medium' },
    { key: 'momentum', label: l('Momento da carreira', 'Career momentum'), value: mom, confidence: 'low' },
    { key: 'luck', label: l('Acaso (não explicado)', 'Chance (unexplained)'), value: luck, confidence: 'low' },
  ];
  for (const f of mods.factors) factors.push({ key: `mod:${t0(f.label)}`, label: f.label, value: f.ratio, confidence: Math.abs(Math.log(f.ratio)) > 0.2 ? 'medium' : 'low' });
  if (hook !== 1) factors.push({ key: 'hook', label: l('Gancho do single', 'Single hook'), value: hook, confidence: conf(hook) });
  if (overexposure < 1) factors.push({ key: 'overexposure', label: l('Superexposição (lançamentos no ano)', 'Overexposure (releases this year)'), value: overexposure, confidence: 'medium' });
  return { appeal, factors };
}

export function launchPending(s: GameState, r: Rng, pr: PendingRelease): Release {
  const act = s.acts[pr.actId];
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const owner = c && c.party !== 'player' ? c.party : 'player';
  const rel: Release = {
    id: nextId(s, 'r'),
    actId: pr.actId,
    owner,
    type: pr.type,
    title: pr.title,
    songs: pr.songs,
    week: s.week,
    year: s.year,
    q: pr.reissueOf ? s.releases[pr.reissueOf]?.q ?? 50 : releaseQ(s, pr.songs),
    appeal: 0,
    formats: pr.formats,
    stock: pr.press,
    pressed: pr.press,
    marketing: pr.marketing,
    marketingE: Math.min(0.95, marketingE(s, pr.marketing, 'player') + (owner !== 'player' ? 0.25 : 0)),
    territories: owner !== 'player' && s.labels[owner] ? [...new Set([...pr.territories, ...s.labels[owner].territories])] : contractScope(pr.territories, c),
    weekly: [],
    totalUnits: 0,
    revenue: 0,
    peak: 999,
    weeksOnChart: 0,
    lastPos: 0,
    coverSeed: pr.cover?.seed ?? r.int(1, 2 ** 30),
    coverChoice: pr.cover?.style,
    shortage: 0,
    reissueOf: pr.reissueOf,
    live: true,
  };
  rel.kind = pr.kind;
  rel.rolloutId = pr.rolloutId;
  const { appeal, factors } = computeAppeal(s, r, rel, act);
  // campanha de rollout (teaser, pré-save, singles, clipe) e superfãs aquecem a estreia
  const hype = 1 + (pr.hype ?? 0);
  const fans = superfanDebut(s, act);
  rel.hypeBoost = hype * fans;
  rel.appeal = appeal * rel.hypeBoost;
  if (rel.hypeBoost > 1.02) factors.push({ key: 'hype', label: l('Rollout e superfãs', 'Rollout and superfans'), value: rel.hypeBoost, confidence: 'medium' });
  rel.autopsy = [...factors, { key: 'marketing', label: l('Marketing (E)', 'Marketing (E)'), value: 1 + 2.5 * rel.marketingE, confidence: rel.marketingE > 0.3 ? 'high' : 'low' }];
  // rodada 8: guarda a previsão de 10 semanas no momento do lançamento (para comparar depois)
  if (owner === 'player' || act.playerBand) rel.fc = forecastUnits(s, act, rel.type, rel.q, rel.marketing, rel.territories).mid;
  s.releases[rel.id] = rel;
  noteRelease17(s, rel);
  act.releases.push(rel.id);
  act.lastRelease = s.week;
  act.momentum = clamp(act.momentum + 12 + rel.marketingE * 15, 0, 100);
  for (const id of pr.songs) if (s.songs[id] && !pr.reissueOf && pr.kind !== 'compilation') s.songs[id].releaseId = rel.id;
  if (c) c.releasesDone += 1;
  if (act.status === 'emerging') act.status = 'active';
  if (owner === 'player') s.player.stats.releases += 1;
  if (pr.reissueOf) {
    s.player.reissues += 1;
    s.player.stats.reissues += 1;
  }
  // prestígio crítico: originalidade + canal de imprensa
  const crit = pr.songs.reduce((t, id) => t + (s.songs[id]?.originality ?? 50), 0) / Math.max(1, pr.songs.length);
  const pressBoost = pr.marketing.some((m) => m.channel === 'press') ? 6 : 0;
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + (crit + rel.q - 110 + pressBoost) / 40, 0, 100);
  remember(s, 'release', fmtL(l('{act} lança "{title}" ({type}).', '{act} releases "{title}" ({type}).'), { act: act.name, title: rel.title, type: rel.type.toUpperCase() }), { actId: act.id });
  runSimHooks('launch', s, r, { release: rel });
  return rel;
}

/** Rodada 8: o selo só lança onde o contrato cobre (escopo territorial da ficha de direitos). */
function contractScope(ts: MarketId[], c: { party: string; territories?: MarketId[] } | undefined): MarketId[] {
  if (!c || c.party !== 'player' || !c.territories?.length) return ts;
  const ok = ts.filter((m) => c.territories!.includes(m));
  return ok.length ? ok : [c.territories[0]];
}

/** Lançamento de rivais e independentes (mesmos validadores e economia). */
export function launchNpcRelease(s: GameState, r: Rng, act: Act, owner: string, songIds: string[], type: Release['type'], budgetReal: number): Release {
  const lb = s.labels[owner];
  const channels = CHANNELS.filter((c) => (!c.from || hasTech(s, c.from)) && (!c.untilYear || s.year <= c.untilYear) && isUnlocked(s, c.id));
  const ch = channels.length ? r.pick(channels) : CHANNELS[0];
  const marketing = budgetReal > 0 ? [{ channel: ch.id, budget: nominal(budgetReal, s.year) }] : [];
  const territories: MarketId[] = lb ? lb.territories : [cityById[act.city]?.market ?? 'na'];
  const rel: Release = {
    id: nextId(s, 'r'), actId: act.id, owner, type, title: s.songs[songIds[0]]?.title ?? 'Untitled', songs: songIds,
    week: s.week, year: s.year, q: releaseQ(s, songIds), appeal: 0, formats: [], stock: Infinity, pressed: 0,
    marketing, marketingE: marketingE(s, marketing, owner), territories, weekly: [], totalUnits: 0, revenue: 0,
    peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: r.int(1, 2 ** 30), shortage: 0, live: true,
  };
  if (type !== 'single') rel.title = `${rel.title}${type === 'lp' ? '' : ' EP'}`;
  rel.appeal = computeAppeal(s, r, rel, act).appeal;
  for (const id of songIds) if (s.songs[id]) s.songs[id].releaseId = rel.id;
  // terceiros: só a faixa principal fica guardada (save leve)
  for (const id of songIds.slice(1)) delete s.songs[id];
  rel.songs = songIds.slice(0, 1);
  act.songs = act.songs.filter((id) => s.songs[id]);
  s.releases[rel.id] = rel;
  noteRelease17(s, rel);
  act.releases.push(rel.id);
  act.lastRelease = s.week;
  act.momentum = clamp(act.momentum + 10 + rel.marketingE * 12, 0, 100);
  if (act.status === 'emerging') act.status = 'active';
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c) c.releasesDone += 1;
  return rel;
}

/** Selo novo na era digital: sem acesso a playlists, lojas em destaque e acordos de plataforma,
 *  o digital rende menos até a casa se firmar (8 anos; mesmo firmada, rende 90%). */
/** r17 final: no streaming o selo independente recebe menos por unidade-equivalente (rateio pró-rata do bolo,
 *  acordos melhores das majors, distribuidora digital no meio). Corrige começos 2010+ rendendo ~8× os de 1990. */
export const STREAM_PAYOUT17 = 0.6;
export const streamPayout = (digital: string[]): number => (digital.includes('streaming') ? STREAM_PAYOUT17 : 1);

export function digitalReach(s: GameState): number {
  const age = Math.max(0, s.year - s.config.startYear);
  return 0.3 + 0.6 * Math.min(1, age / 8);
}

function piracyLoss(s: GameState): number {
  const p2p = s.techDates.p2p;
  const st = s.techDates.streaming;
  let loss = st !== undefined && s.year >= st + 3 ? 0.1 : 0.03;
  if (p2p !== undefined && s.year >= p2p && (st === undefined || s.year < st + 3)) loss = 0.38;
  if (hasMutator(s, 'heavy_piracy')) loss += 0.18;
  return clamp(loss, 0, 0.6);
}

function digitalFormats(s: GameState): FormatId[] {
  const out: FormatId[] = [];
  if (hasTech(s, 'download')) out.push('download');
  if (hasTech(s, 'streaming')) out.push('streaming');
  return out;
}

/** Processa uma semana: unidades, receita, estoque, paradas e fama. */
export function marketWeek(s: GameState, r: Rng): void {
  const pool = weeklyPool(s);
  s.stats.weeklyPool = pool;
  const live = allReleases17(s).filter((x) => x.live);
  // foco promocional: lançamentos recentes do mesmo dono disputam a mesma equipe
  const recentByOwner: Record<string, number> = {};
  for (const rel of live) if (s.week - rel.week < 12) recentByOwner[rel.owner] = (recentByOwner[rel.owner] ?? 0) + 1;
  const focusCap = (owner: string) => {
    if (owner === 'player') return 2 + s.player.hq + staffCount(s, 'publicist') * 2 + staffCount(s, 'admin');
    const fam = s.labels[owner]?.family;
    return fam === 'A' ? 8 : fam === 'C' ? 6 : 4;
  };
  const heats: [Release, number][] = [];
  let H = 0;
  for (const rel of live) {
    const age = s.week - rel.week;
    const act = s.acts[rel.actId];
    if (!act) {
      rel.live = false;
      continue;
    }
    if (age > 60 && rel.owner !== 'player' && !act.playerBand) {
      rel.live = false;
      continue;
    }
    let h = rel.appeal * decay(rel.type, age) * (1 + 2.5 * rel.marketingE * Math.exp(-age / 9) + 0.3 * rel.marketingE);
    h *= 0.85 + act.momentum / 300;
    h *= Math.exp(r.normal(0, 0.12)); // variação semanal: paradas se mexem
    if (age > 52) h = Math.max(h, rel.appeal * 0.012 * (1 + act.fame / 40)); // cauda de catálogo
    if (hasMutator(s, 'no_stars')) h = Math.pow(h, 0.85);
    // mercado fragmentado (anos 90 em diante): muitos canais e nichos, nenhum hit leva tanto quanto antes
    if (h > 1) h = Math.pow(h, 1 - fragmentation(s.year));
    const n = recentByOwner[rel.owner] ?? 0;
    const cap = focusCap(rel.owner);
    if (age < 12 && n > cap) h *= Math.sqrt(cap / n);
    heats.push([rel, h]);
  }
  // rodada 7: com centenas de artistas reais o mundo ficou mais denso; a atenção de terceiros é
  // normalizada pela densidade (mais artistas dividem a mesma fatia, sem esmagar o jogador)
  const npc = heats.filter(([rel]) => rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand).length;
  const density = Math.pow(Math.max(1, npc / 280), 0.85);
  for (const e of heats) {
    if (density > 1 && e[0].owner !== 'player' && !s.acts[e[0].actId]?.playerBand) e[1] /= density;
    H += e[1];
  }
  const B = MARKET_TAIL * (s.year < 1950 ? 0.6 : 1);
  s.stats.lastH = H;
  // r18: a fatia física depende dos mercados e da idade do público de cada lançamento (eras18)
  const digital = digitalFormats(s);
  const piracy = piracyLoss(s);
  const singles: ChartEntry[] = [];
  const albums: ChartEntry[] = [];
  let playerUnits = 0;
  let marketUnits = 0;
  // unidades depois de todos os modificadores, com teto por lançamento
  const cap = pool * maxShare(s.year);
  const pre = heats.map(([rel, h]) => Math.min(cap, applyMods(s, 'chartUnits', (pool * h) / (H + B), { release: rel }).value));
  // retornos decrescentes de escala: acima de ~3% do mercado, o selo do jogador esbarra em
  // concorrência de majors, espaço de varejo/playlist e atenção do público (evita bola de neve)
  const mine = (rel: Release) => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
  const tot = pre.reduce((t, u) => t + u, 0) + pool * B / (H + B);
  const Sp = heats.reduce((t, e, i) => t + (mine(e[0]) ? pre[i] : 0), 0) / Math.max(1, tot);
  const k = Sp > scaleShare(s.year) ? Math.pow(scaleShare(s.year) / Sp, 0.7) : 1;
  for (let i = 0; i < heats.length; i++) {
    const [rel] = heats[i];
    let units = Math.round(pre[i] * (mine(rel) ? k : 1));
    if (units <= 0) continue;
    // estoque: demanda física só vira venda com estoque
    const physUnits = Math.round(units * physShareRel18(s, rel));
    let physSold = physUnits;
    if (rel.owner === 'player' || (s.acts[rel.actId]?.playerBand && rel.stock !== Infinity)) {
      if (rel.formats.some((f) => FORMATS.find((x) => x.id === f)?.physical)) {
        physSold = Math.min(physUnits, rel.stock);
        rel.stock -= physSold;
        rel.shortage += physUnits - physSold;
      } else physSold = 0;
      units = units - physUnits + physSold;
    }
    const nonPhys = units - physSold;
    rel.weekly.push(units);
    if (rel.weekly.length > 60) rel.weekly.splice(0, rel.weekly.length - 60);
    rel.totalUnits += units;
    marketUnits += units;
    // receita bruta do master (centavos nominais)
    const physFmt = rel.formats.find((f) => FORMATS.find((x) => x.id === f)?.physical) ?? (s.year < 1955 ? 'shellac' : hasTech(s, 'cd') ? 'cd' : 'lp');
    const physDef = FORMATS.find((x) => x.id === physFmt)!;
    let gross = physSold * nominal(physDef.net[rel.type], s.year);
    if (digital.length) {
      const per = digital.reduce((t, f) => t + FORMATS.find((x) => x.id === f)!.net[rel.type], 0) / digital.length;
      gross += nonPhys * nominal(per, s.year) * (rel.owner === 'player' ? digitalReach(s) * streamPayout(digital) : 1);
    } else {
      gross += nonPhys * nominal(FORMATS.find((x) => x.id === 'airplay')!.net[rel.type], s.year);
    }
    gross = Math.round(gross * (1 - piracy));
    if (rel.kind === 'limited') gross = Math.round(gross * 1.8);
    // devoluções do varejo: parte do físico volta quando a venda esfria (GDD §19)
    if (rel.owner === 'player' && physSold > 0 && rel.weekly.length > 6 && rel.stock > rel.pressed * 0.3) {
      const back = Math.round(physSold * 0.08);
      rel.returns = (rel.returns ?? 0) + back;
      rel.stock += back;
      gross -= Math.round(back * nominal(physDef.net[rel.type], s.year));
    }
    distribute(s, rel, gross, units);
    if (rel.owner === 'player' || s.acts[rel.actId]?.playerBand) playerUnits += units;
    const entry: ChartEntry = { releaseId: rel.id, units, pos: 0, last: rel.lastPos, weeks: rel.weeksOnChart };
    (rel.type === 'single' ? singles : albums).push(entry);
    certify(s, rel);
  }
  s.stats.marketUnitsYear += marketUnits;
  s.stats.playerUnitsYear += playerUnits;
  rankChart(s, singles, 'singles');
  rankChart(s, albums, 'albums');
}

const CERT_NAME = { gold: l('ouro', 'gold'), platinum: l('platina', 'platinum'), diamond: l('diamante', 'diamond') };

function certify(s: GameState, rel: Release): void {
  const levels: [Release['certified'], number][] = [['diamond', 10e6], ['platinum', 1e6], ['gold', 5e5]];
  for (const [lvl, n] of levels) {
    if (rel.totalUnits >= n) {
      if (rel.certified === lvl || (rel.certified === 'diamond') || (rel.certified === 'platinum' && lvl === 'gold')) return;
      rel.certified = lvl;
      const act = s.acts[rel.actId];
      if (rel.owner === 'player' || act?.playerBand) {
        if (lvl === 'gold') s.player.stats.gold += 1;
        else s.player.stats.platinum += 1;
        notify(s, fmtL(l('"{t}" de {a} é {lvl}!', '"{t}" by {a} went {lvl}!'), { t: rel.title, a: act?.name ?? '', lvl: CERT_NAME[lvl ?? 'gold'] }), 'good');
        remember(s, 'cert', fmtL(l('"{t}" ({a}) recebe disco de {lvl} da AMIF.', '"{t}" ({a}) certified {lvl} by AMIF.'), { t: rel.title, a: act?.name ?? '', lvl: CERT_NAME[lvl ?? 'gold'] }), { actId: rel.actId, important: true });
      }
      return;
    }
  }
}

/** Separa master e edição; recoupment só abate o saldo (não é receita extra; GDD §11, §16).
 *  Rodada 8: cada master segue o acordo que o cobre (não o contrato atual do ato), com a divisão da
 *  ficha de direitos (master compartilhado, pontos de produtor e convidados, fatia da edição) e
 *  masters revertidos pagam só o artista. */
function distribute(s: GameState, rel: Release, gross: number, units: number): void {
  const act = s.acts[rel.actId];
  if (!act) return;
  // subselo: liquidação no caixa próprio (sublabels.ts), nunca no da matriz
  if (s.subLabels.some((x) => x.id === rel.owner)) return;
  const current = act.contractId ? s.contracts[act.contractId] : undefined;
  // master do selo: vale o acordo da época do disco; master que voltou ao artista não é do selo
  const deal = !act.playerBand && rel.owner === 'player' ? dealOfRelease(s, rel) : undefined;
  const reverted = !act.playerBand && rel.owner === 'indie' && current?.party === 'player';
  const c = reverted ? undefined : deal ?? current;
  const terms = c && c.party === 'player' && !act.playerBand ? rightsOf(c) : undefined;
  const publishing = Math.round(gross * 0.1);
  const rightsLeak = 1 - Math.min(0.25, staffSkill(s, 'rights') / 300) ;
  let artistShare = 0;
  let partyGets = gross;
  if (c) {
    const fee = c.party === 'player' ? distributionFee(s) : 0.2;
    artistShare = Math.round(gross * (terms ? artistRate(c, fee) : c.royalty) * baseMult18(c, s.year)); // r18: base do royalty
    if (c.model === 'distribution') {
      artistShare = Math.round(gross * (1 - (c.distributionFee ?? 0.2)));
    }
    let payout = artistShare;
    if (c.recoupBalance > 0 && c.model !== 'distribution') {
      const rec = Math.min(recoupable18(c, rel.id), artistShare); // r18: por projeto ou cruzado
      c.recoupBalance -= rec;
      takeRecoup18(c, rel.id, rec);
      if (c.party === 'player') c.recouped = (c.recouped ?? 0) + rec;
      payout = artistShare - rec;
    }
    // pontos de produtor e convidados: all-in (saem do que o artista recebe) ou pagos pelo selo
    let points = 0;
    if (terms) {
      const pts = Math.round(gross * (terms.producerPts + (hasGuest(s, rel) ? terms.guestPts : 0)));
      points = terms.pointsFromLabel ? pts : Math.min(payout, pts);
      if (!terms.pointsFromLabel) payout -= points;
    }
    partyGets = gross - payout - points;
    // quem recebe o quê
    if (c.party === 'player') {
      // r18: receita reconhecida agora, caixa no prazo do distribuidor/plataforma (econ18); o distribuidor desconta a taxa na remessa
      postSalesAR18(s, rel, `sales:${rel.id}`, gross, 'sales', `Vendas ${rel.title}`);
      postSalesAR18(s, rel, `distfee:${rel.id}`, -Math.round(gross * (distributionFee(s) + ((s.flags.fastPay18 ?? 0) > 0 ? 0.03 : 0))), 'distribution', `Distribuição ${rel.title}`);
      // royalties do artista: custo agora, pagos na prestação de contas do contrato
      if (payout > 0 && !act.playerBand) postRoyAP18(s, act, `roy:${rel.id}`, payout, `Royalties ${act.name}`);
      if (points > 0) postRoyAP18(s, undefined, `pts:${rel.id}`, points, `Pontos de produção ${rel.title}`);
    } else {
      const lb = s.labels[c.party];
      if (lb) {
        lb.cash += partyGets;
        lb.revenueYear += gross;
      }
      if (act.playerBand) {
        if (payout > 0) post(s, `roy:${rel.id}`, payout, 'royalties', `Royalties de ${lb?.name ?? 'selo'}`);
      } else act.cash += payout;
    }
  } else {
    // independente: distribuição própria (taxa de agregador)
    const fee = act.playerBand && s.config.role === 'hybrid' ? 0 : hasTech(s, 'streaming') ? 0.15 : 0.35;
    const net = Math.round(gross * (1 - fee));
    if (act.playerBand) postSalesAR18(s, rel, `sales:${rel.id}`, net, 'sales', `Vendas ${rel.title}`);
    else act.cash += net;
  }
  rel.revenue += partyGets;
  // edição: autores e editora (a fatia do selo vem da ficha de direitos)
  const pubToPlayer = act.playerBand ? (c?.publishing && c.party !== 'player' ? 0.5 : 1) : c?.party === 'player' ? (terms ? terms.pubShare : c.publishing ? 0.5 : 0) : 0;
  if (pubToPlayer > 0) {
    let amount = Math.round(publishing * pubToPlayer * rightsLeak);
    if (hasCard(s, 'publisher')) amount = Math.round(amount * 1.3);
    postAR18(s, `pub:${rel.id}`, amount, 'publishing', `Edição ${rel.title}`, 'pro', proDue18(s));
  }
  if (pubToPlayer < 1 && !act.playerBand) act.cash += Math.round(publishing * (1 - pubToPlayer) * 0.5);
  // parcela dos autores: paga individualmente a cada compositor (GDD §42.10)
  payAuthors(s, rel, Math.round(publishing * 0.5));
  // fãs
  act.fans.casual += Math.round(units * 0.1);
  act.fans.active += Math.round(units * 0.006);
}

export function distributionFee(s: GameState): number {
  return [0.22, 0.2, 0.17, 0.13, 0.1, 0.08][s.player.hq] ?? 0.08;
}

function rankChart(s: GameState, entries: ChartEntry[], which: 'singles' | 'albums'): void {
  entries.sort((a, b) => b.units - a.units);
  const top = entries.slice(0, 100);
  top.forEach((e, i) => {
    e.pos = i + 1;
    const rel = s.releases[e.releaseId];
    const act = s.acts[rel.actId];
    const wasPos = rel.lastPos;
    rel.lastPos = e.pos;
    rel.weeksOnChart += 1;
    e.weeks = rel.weeksOnChart;
    if (e.pos < rel.peak) rel.peak = e.pos;
    if (act) {
      if (e.pos < act.peakChart) act.peakChart = e.pos;
      act.fame = clamp(act.fame + (e.pos === 1 ? 0.4 : e.pos <= 10 ? 0.16 : e.pos <= 40 ? 0.05 : 0.012) * (1 - act.fame / 110), 0, 100);
      s.scenes[`${act.city}:${act.genre}`] = (s.scenes[`${act.city}:${act.genre}`] ?? 0) + (e.pos <= 40 ? 0.3 : 0.05);
    }
    const mine = rel.owner === 'player' || act?.playerBand;
    if (e.pos <= 10 && (wasPos === 0 || wasPos > 10)) {
      if (act) act.hits += 1;
      if (mine) {
        s.player.stats.top10s += 1;
        notify(s, fmtL(l('"{t}" entrou no top 10 ({c}) em #{p}!', '"{t}" entered the top 10 ({c}) at #{p}!'), { t: rel.title, c: which === 'singles' ? 'WorldSound 100' : 'WorldSound Albums', p: e.pos }), 'good');
      }
    }
    if (e.pos === 1 && wasPos !== 1) {
      if (act) act.number1s += 1;
      s.charts.number1History.push({ week: s.week, releaseId: rel.id, title: rel.title, act: act?.name ?? '?' });
      if (s.charts.number1History.length > 600) s.charts.number1History.splice(0, 100);
      if (mine) {
        if (act?.archetype === 'synthetic') s.flags.synthNumber1 = 1;
        s.player.stats.number1s += 1;
        s.player.reputation.commercial = clamp(s.player.reputation.commercial + 3, 0, 100);
      }
      remember(s, 'number1', fmtL(l('"{t}" de {a} chega ao #1 ({c}).', '"{t}" by {a} hits #1 ({c}).'), { t: rel.title, a: act?.name ?? '?', c: which === 'singles' ? 'WorldSound 100' : 'WorldSound Albums' }), { actId: rel.actId, important: !!mine || !!act?.catalogNo });
    }
  });
  // quem saiu da parada
  const inChart = new Set(top.map((e) => e.releaseId));
  for (const prev of s.charts[which]) {
    if (!inChart.has(prev.releaseId) && s.releases[prev.releaseId]) s.releases[prev.releaseId].lastPos = 0;
  }
  s.charts[which] = top;
}

/** Previsão de unidades nas primeiras 10 semanas, com intervalo (analista estreita; difícil alarga). */
export function forecastUnits(s: GameState, act: Act, type: Release['type'], q: number, marketing: { channel: string; budget: number }[], territories: MarketId[]): { lo: number; mid: number; hi: number } {
  const qF = Math.pow(Math.max(5, q) / 55, 2.4);
  const fameF = 0.12 + Math.pow(act.fame / 40, 1.6) + Math.log10(1 + act.fans.core) / 14;
  const appeal = qF * fameF * (s.genrePop[act.genre] ?? 0.6) * coverage(territories, act.genre, s.year, act.positioning) * eraTypeFit(s.year, type) * (0.8 + act.momentum / 250);
  const E = marketingE(s, marketing, 'player');
  const H = s.stats.lastH ?? 80;
  const pool = weeklyPool(s);
  let total = 0;
  for (let age = 0; age < 10; age++) {
    const h = appeal * decay(type, age) * (1 + 2.5 * E * Math.exp(-age / 9) + 0.3 * E);
    total += (pool * h) / (H + MARKET_TAIL + h);
  }
  const width = (staffCount(s, 'analyst') ? 0.35 : 0.6) * (s.config.difficulty === 'hard' ? 1.3 : s.config.difficulty === 'easy' ? 0.8 : 1);
  return { lo: Math.round(total * (1 - width * 0.6)), mid: Math.round(total), hi: Math.round(total * (1 + width)) };
}

export function chartName(which: 'singles' | 'albums'): string {
  return which === 'singles' ? 'WorldSound 100' : 'WorldSound Albums';
}

export function genreLabel(id: string, lang: 'pt' | 'en'): string {
  return genreById[id]?.name[lang] ?? id;
}
