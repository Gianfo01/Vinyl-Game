import { projAlias31, withTxn } from './r31/txn';
import { POOL19 } from './pool19';
// Mercado semanal: atenção finita, vendas, estoque, receita separada (master × edição),
// paradas WorldSound 100 / Albums e autópsia (GDD §7, §13, §14, §16, §24).

import { unlimitedStock20 } from './stock20';
import { chartName28, chartNameL28 } from './chartname28';
import { ART18 } from './artist18hook';
import { MEDIA18 } from './media18hook';
import { physShareRel18 } from './sys/eras18';
import { baseMult18, recoupable18, takeRecoup18 } from './sys/contracts18';
import { postRoyAP18, postSalesAR18 } from './sys/econ18';
import { pubRoute18 } from './sys/rights18';
import { clamp, type Rng } from '../core/rng';
import { nominal } from '../core/money';
import { isUnlocked } from './era';
import { CHANNELS, EQUIPMENT, FORMATS, type FormatId } from '../data/rules';
import { MARKETS, MARKET_PREF, cityById, familyOf, genreById, l, type MarketId } from '../data/world';
import { payAuthors } from './finance';
import { superfanDebut } from './fandom';
import type { Act, AutopsyFactor, ChartEntry, GameState, PendingRelease, Release } from './types';
import { rng19 } from './rng19';
import { artDelta18, fmtL, hasMutator, hasTech, nextId, notify, post, remember, staffCount, staffSkill } from './util';
import { songProfile } from './repertoire';
import { applyMods, runSimHooks } from './ext4';
import { artistRate, dealOfRelease, hasGuest, rightsOf } from './rights';
import { noteRelease17 } from './relidx17';
import { FC_ID31, FORECAST31, PRESSURE_LABEL31, Y31, commodOn31, marketPressure31, on31 } from './r31/market31';
import { allReleases17 } from './relidx17';

const POOL: [number, number][] = [
  // r18 era1889: antes de 1920 a demanda inclui a partitura (sucessos vendiam milhões de cópias impressas)
  [1889, 280e3], [1895, 320e3], [1900, 370e3], [1905, 410e3], [1910, 450e3], [1915, 450e3], [1919, 360e3],
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
  v *= marketPressure31(s, year); // R31 D: pressão de mercado da era digital, igual para todos (no lugar da penalização só do jogador)
  if (year === s.year && POOL19.f) v *= POOL19.f(s); // r19 (live19): curva sazonal do mês (Natal, janeiro) — fora dos tetos dos mods
  return v;
}
/** r19 (live19): fator sazonal do tamanho do mercado no mês (injetado pelo live19: sem ciclo). */
export { POOL19 } from './pool19';

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

export function marketingE(s: GameState, marketing: { channel: string; budget: number }[], owner: string, actId?: string): number {
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
      if (actId && MEDIA18.eff) eff *= MEDIA18.eff(s, actId, ch.id); // r18 media18: saturação e aprendizado
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

/** Acaso médio do lançamento (lognormal σ 0,33) e ruído semanal médio (σ 0,12): a previsão usa a média, não um sorteio. */
export const LUCK_MEAN31 = Math.exp(0.33 ** 2 / 2);
export const NOISE_MEAN31 = Math.exp(0.12 ** 2 / 2);

export function computeAppeal(s: GameState, r: Rng | null, rel: Release, act: Act, opt: { luck?: number } = {}): { appeal: number; factors: AutopsyFactor[] } {
  // (antes da R31) ferramentas digitais baratas: a partir dos anos 90 a qualidade do JOGADOR contava menos. Os rivais
  // já ganham o mesmo com a produção da época; com d31.pressure a penalização sai e a pressão vira mercado (weeklyPool).
  const commod = commodOn31(s) && (rel.owner === 'player' || act.playerBand) ? Math.max(0, Math.min(15, (s.year - 1990) * 0.75)) : 0;
  const qF = Math.pow(Math.max(5, rel.q - commod) / 55, 2.4);
  // convexo: estrelas concentram atenção; desconhecidos disputam a cauda
  const fameF = 0.12 + Math.pow(act.fame / 40, 1.6) + Math.log10(1 + act.fans.core) / 14;
  const gp = s.genrePop[act.genre] ?? 0.6;
  const cov = coverage(rel.territories, act.genre, s.year, act.positioning);
  const era = eraTypeFit(s.year, rel.type);
  const design = rel.owner === 'player' && staffCount(s, 'designer') ? 1.05 : 1;
  const mom = 0.8 + act.momentum / 250;
  const luck = opt.luck ?? Math.exp(rng19(s, 'launch').normal(0, 0.33)); // previsão: média, sem sortear
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
    prov: 'sim', // r20 (novarun §9.2): lançado nesta partida
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
    marketingE: Math.min(0.95, marketingE(s, pr.marketing, 'player', pr.actId) + (owner !== 'player' ? 0.25 : 0)),
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
  // R31 D/Y: o que mexe no mercado inteiro (pressão da era) e na demanda por país (fama local, leis, dominó) também aparece
  const press = marketPressure31(s);
  if (press < 0.995) rel.autopsy.push({ key: 'pressure31', label: PRESSURE_LABEL31, value: press, confidence: 'high' });
  if (Y31.why) for (const w of Y31.why(s, rel, act)) if (Math.abs(w.k - 1) > 0.01) rel.autopsy.push({ key: `y31:${w.label.pt}`, label: w.label, value: w.k, confidence: 'medium' });
  // rodada 8: guarda a previsão de 10 semanas no momento do lançamento (para comparar depois)
  if (owner === 'player' || act.playerBand) rel.fc = forecastUnits(s, act, rel.type, rel.q, rel.marketing, rel.territories, { songs: pr.songs, hype: pr.hype, kind: pr.kind, reissueOf: pr.reissueOf, owner }).mid;
  s.releases[rel.id] = rel;
  noteRelease17(s, rel);
  act.releases.push(rel.id);
  act.lastRelease = s.week;
  act.momentum = clamp(act.momentum + 12 + rel.marketingE * 15, 0, 100);
  for (const id of pr.songs) if (s.songs[id] && !pr.reissueOf && pr.kind !== 'compilation') s.songs[id].releaseId = rel.id;
  if (c) c.releasesDone += 1;
  if (act.status === 'emerging') act.status = 'active';
  if (owner === 'player' || act.playerBand) s.player.stats.releases += 1; // r18 artist18: disco da sua banda por selo NPC também conta
  if (pr.reissueOf) {
    s.player.reissues += 1;
    s.player.stats.reissues += 1;
  }
  // prestígio crítico: originalidade + canal de imprensa
  const crit = pr.songs.reduce((t, id) => t + (s.songs[id]?.originality ?? 50), 0) / Math.max(1, pr.songs.length);
  const pressBoost = pr.marketing.some((m) => m.channel === 'press') ? 6 : 0;
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + artDelta18(s.player.reputation.artistic, (crit + rel.q - 110 + pressBoost) / 40), 0, 100);
  for (const fn of projAlias31()) fn(s, pr.id, rel.id); // R31 P: o lançamento programado vira o lançamento (resultados juntam)
  withTxn({ artist: act.id, project: rel.id, release: rel.id }, () => // R31 P: o diário guarda o lançamento em jogo
  remember(s, 'release', fmtL(l('{act} lança "{title}" ({type}).', '{act} releases "{title}" ({type}).'), { act: act.name, title: rel.title, type: rel.type.toUpperCase() }), { actId: act.id }));
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
/** R31 CAR (sys/car31more.ts): o disco do selo NPC também passa pelo estúdio/editora do jogador (o gancho 'launch' só
 *  roda para lançamentos do jogador). Sem estúdio ou editora do jogador, não faz nada. */
export const NPCREL31: { f?: (s: GameState, rel: Release) => void } = {};
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
    peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: r.int(1, 2 ** 30), shortage: 0, live: true, prov: 'sim',
  };
  if (type !== 'single') rel.title = `${rel.title}${type === 'lp' ? '' : ' EP'}`;
  rel.appeal = computeAppeal(s, r, rel, act).appeal;
  NPCREL31.f?.(s, rel);
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

/** Foco promocional: quantos lançamentos recentes do mesmo dono a equipe sustenta. */
function focusCap(s: GameState, owner: string): number {
  if (owner === 'player') return 2 + s.player.hq + staffCount(s, 'publicist') * 2 + staffCount(s, 'admin');
  const fam = s.labels[owner]?.family;
  return fam === 'A' ? 8 : fam === 'C' ? 6 : 4;
}

/** Calor de um lançamento numa idade (semanas). `noise` = ruído semanal (sorteado no mercado; a média na previsão);
 *  `term` = termo de marketing do media18 quando ligado. A MESMA conta serve às vendas e à previsão (R31 D). */
function heatOf(s: GameState, rel: Release, act: Act, age: number, noise: number, term: number | null | undefined): number {
  let h = rel.appeal * decay(rel.type, age) * (term ?? (1 + 2.5 * rel.marketingE * Math.exp(-age / 9) + 0.3 * rel.marketingE));
  h *= 0.85 + act.momentum / 300;
  if (Y31.demand) h *= Y31.demand(s, rel, act); // R31 Y: fama no país, leis do país e efeito dominó mexem na demanda
  h *= noise;
  if (age > 52) h = Math.max(h, rel.appeal * 0.012 * (1 + act.fame / 40)); // cauda de catálogo
  if (hasMutator(s, 'no_stars')) h = Math.pow(h, 0.85);
  // mercado fragmentado (anos 90 em diante): muitos canais e nichos, nenhum hit leva tanto quanto antes
  if (h > 1) h = Math.pow(h, 1 - fragmentation(s.year));
  return h;
}

/** Processa uma semana: unidades, receita, estoque, paradas e fama. */
export function marketWeek(s: GameState, r: Rng): void {
  r = rng19(s, 'market'); // r19: ruído das paradas no fluxo próprio
  Y31.begin?.(s); // R31 Y: vetores por país da semana (fechados no fim das paradas)
  const pool = weeklyPool(s);
  s.stats.weeklyPool = pool;
  const live = allReleases17(s).filter((x) => x.live);
  Y31.normalize?.(s, live); // R31 Y: a demanda por país redistribui entre os lançamentos (fama → vendas → fama sem bola de neve)
  // foco promocional: lançamentos recentes do mesmo dono disputam a mesma equipe
  const recentByOwner: Record<string, number> = {};
  for (const rel of live) if (s.week - rel.week < 12) recentByOwner[rel.owner] = (recentByOwner[rel.owner] ?? 0) + 1;
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
    let h = heatOf(s, rel, act, age, Math.exp(r.normal(0, 0.12)), MEDIA18.term?.(s, rel, age)); // variação semanal: paradas se mexem
    const n = recentByOwner[rel.owner] ?? 0;
    const cap = focusCap(s, rel.owner);
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
  s.stats.lastK31 = k; // R31 D: a previsão usa o mesmo fator de escala da semana
  for (let i = 0; i < heats.length; i++) {
    const [rel] = heats[i];
    let units = Math.round(pre[i] * (mine(rel) ? k : 1));
    if (units <= 0) continue;
    if (rel.fc !== undefined && s.week - rel.week < 10) rel.dem10 = (rel.dem10 ?? 0) + units; // R31 D: procura × previsão
    // estoque: demanda física só vira venda com estoque
    const physUnits = Math.round(units * physShareRel18(s, rel));
    let physSold = physUnits;
    if (rel.owner === 'player' || (s.acts[rel.actId]?.playerBand && !unlimitedStock20(rel))) { // r20 (B25): null (save recarregado) = Infinity
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
    const physFmt = rel.formats.find((f) => FORMATS.find((x) => x.id === f)?.physical) ?? (s.year < (s.techDates.disc ?? 0) ? 'cylinder' : s.year < 1955 ? 'shellac' : hasTech(s, 'cd') ? 'cd' : 'lp');
    const physDef = FORMATS.find((x) => x.id === physFmt)!;
    let gross = physSold * nominal(physDef.net[rel.type], s.year);
    if (digital.length) {
      const per = digital.reduce((t, f) => t + FORMATS.find((x) => x.id === f)!.net[rel.type], 0) / digital.length;
      gross += nonPhys * nominal(per, s.year) * (rel.owner === 'player' ? digitalReach(s) * (MEDIA18.payout?.(s, rel, digital) ?? streamPayout(digital)) : 1);
    } else {
      gross += nonPhys * nominal(FORMATS.find((x) => x.id === (s.year < (s.techDates.radio ?? 1920) + 6 ? 'sheet' : 'airplay'))!.net[rel.type], s.year); // r18 era1889: antes do rádio, partitura
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

/** R29 (contratos+): liquidação de disco entregue por contrato de produção (sys/contracts29 registra). true = tratou. */
export function prod29(): { dist?: (s: GameState, rel: Release, act: Act, gross: number, units: number) => boolean } { const f = prod29 as unknown as { o?: { dist?: (s: GameState, rel: Release, act: Act, gross: number, units: number) => boolean } }; return (f.o ??= {}); } // hoisted (ciclo de imports)

/** Separa master e edição; recoupment só abate o saldo (não é receita extra; GDD §11, §16).
 *  Rodada 8: cada master segue o acordo que o cobre (não o contrato atual do ato), com a divisão da
 *  ficha de direitos (master compartilhado, pontos de produtor e convidados, fatia da edição) e
 *  masters revertidos pagam só o artista. */
function distribute(s: GameState, rel: Release, gross: number, units: number): void {
  const act = s.acts[rel.actId];
  if (!act) return;
  // subselo: liquidação no caixa próprio (sublabels.ts), nunca no da matriz
  if (s.subLabels.some((x) => x.id === rel.owner)) return;
  // R29 (contratos+): master entregue por contrato de produção (sua produtora → selo rival; produtora NPC → selo rival ou o seu)
  if (prod29().dist?.(s, rel, act, gross, units)) return; // (também o seu selo, quando licencia masters de produtora NPC)
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
        if (payout > 0 && !ART18.roy?.(s, rel, payout, artistShare)) post(s, `roy:${rel.id}`, payout, 'royalties', `Royalties de ${lb?.name ?? 'selo'}`); // r18 artist18: prestação de contas
      } else act.cash += payout;
    }
  } else {
    // independente: distribuição própria (taxa de agregador)
    const fee = act.playerBand && s.config.role === 'hybrid' ? 0 : hasTech(s, 'streaming') ? 0.15 : 0.35;
    const net = Math.round(gross * (1 - fee));
    if (act.playerBand) { if (!ART18.indie?.(s, rel, net, gross)) postSalesAR18(s, rel, `sales:${rel.id}`, net, 'sales', `Vendas ${rel.title}`); } // r18 artist18: master de selo antigo
    else act.cash += net;
  }
  rel.revenue += partyGets;
  // edição: autores e editora (a fatia do selo vem da ficha de direitos)
  const pubToPlayer = act.playerBand ? (c?.publishing && c.party !== 'player' ? 0.5 : 1) : c?.party === 'player' ? (terms ? terms.pubShare : c.publishing ? 0.5 : 0) : 0;
  if (pubToPlayer > 0) {
    let amount = Math.round(publishing * pubToPlayer * rightsLeak);
    pubRoute18(s, rel, amount); // r18 (rights18): sociedades por mercado, caixa preta, caução e prazos
  }
  if (pubToPlayer < 1 && !act.playerBand) act.cash += Math.round(publishing * (1 - pubToPlayer) * 0.5);
  // parcela dos autores: paga individualmente a cada compositor (GDD §42.10)
  payAuthors(s, rel, Math.round(publishing * 0.5));
  // fãs (r18 media18: por fonte de descoberta, quando ligado)
  if (MEDIA18.fans?.(s, rel, act, units)) return;
  act.fans.casual += Math.round(units * 0.1);
  act.fans.active += Math.round(units * 0.006);
}

export function distributionFee(s: GameState): number {
  return ([0.22, 0.2, 0.17, 0.13, 0.1, 0.08][s.player.hq] ?? 0.08) + (s.flags.distFeeAdj18 ?? 0); // r18 supply18: distribuidor/agregador
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
        notify(s, fmtL(l('"{t}" entrou no top 10 ({c}) em #{p}!', '"{t}" entered the top 10 ({c}) at #{p}!'), { t: rel.title, c: chartNameL28(which, s.year, !!s.config.realNames), p: e.pos }), 'good'); // r28: nome pelo ano
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
      remember(s, 'number1', fmtL(l('"{t}" de {a} chega ao #1 ({c}).', '"{t}" by {a} hits #1 ({c}).'), { t: rel.title, a: act?.name ?? '?', c: chartNameL28(which, s.year, !!s.config.realNames) }), { actId: rel.actId, important: !!mine || !!act?.catalogNo });
    }
  });
  // quem saiu da parada
  const inChart = new Set(top.map((e) => e.releaseId));
  for (const prev of s.charts[which]) {
    if (!inChart.has(prev.releaseId) && s.releases[prev.releaseId]) s.releases[prev.releaseId].lastPos = 0;
  }
  s.charts[which] = top;
}

export interface ForecastExtra31 { songs?: string[]; hype?: number; kind?: Release['kind']; reissueOf?: string; owner?: string }

/** Previsão de unidades nas primeiras 10 semanas, com intervalo (analista estreita; difícil alarga).
 *  R31 D (d31.forecast): a MESMA conta do mercado — apelo de computeAppeal (acaso médio, sem sortear), calor de heatOf
 *  (ruído médio), foco promocional, fragmentação, teto por lançamento, modificadores de unidades, fator de escala do
 *  selo e a pressão de mercado (pelo tamanho da semana). Não sorteia nem grava nada (explorar não muda o mundo). */
export function forecastUnits(s: GameState, act: Act, type: Release['type'], q: number, marketing: { channel: string; budget: number }[], territories: MarketId[], extra: ForecastExtra31 = {}): { lo: number; mid: number; hi: number } {
  const width = (staffCount(s, 'analyst') ? 0.35 : 0.6) * (s.config.difficulty === 'hard' ? 1.3 : s.config.difficulty === 'easy' ? 0.8 : 1);
  if (on31(s, 'd31.forecast')) {
    const total = forecast31(s, act, type, q, marketing, territories, extra);
    return { lo: Math.round(total * (1 - width * 0.6)), mid: Math.round(total), hi: Math.round(total * (1 + width)) };
  }
  const qF = Math.pow(Math.max(5, q) / 55, 2.4);
  const fameF = 0.12 + Math.pow(act.fame / 40, 1.6) + Math.log10(1 + act.fans.core) / 14;
  const appeal = qF * fameF * (s.genrePop[act.genre] ?? 0.6) * coverage(territories, act.genre, s.year, act.positioning) * eraTypeFit(s.year, type) * (0.8 + act.momentum / 250);
  const E = marketingE(s, marketing, 'player', act.id);
  const H = s.stats.lastH ?? 80;
  const pool = weeklyPool(s);
  let total = 0;
  for (let age = 0; age < 10; age++) {
    const h = appeal * decay(type, age) * (MEDIA18.fterm?.(s, marketing, E, age, type, q) ?? (1 + 2.5 * E * Math.exp(-age / 9) + 0.3 * E));
    total += (pool * h) / (H + MARKET_TAIL + h);
  }
  return { lo: Math.round(total * (1 - width * 0.6)), mid: Math.round(total), hi: Math.round(total * (1 + width)) };
}

function forecast31(s: GameState, act: Act, type: Release['type'], q: number, marketing: { channel: string; budget: number }[], territories: MarketId[], x: ForecastExtra31): number {
  const owner = x.owner ?? 'player';
  const E = Math.min(0.95, marketingE(s, marketing, 'player', act.id) + (owner !== 'player' ? 0.25 : 0));
  // lançamento de mentira (não entra no estado): os mesmos campos que launchPending monta
  const rel: Release = {
    id: FC_ID31, actId: act.id, owner, prov: 'sim', type, title: '', songs: x.songs ?? [], week: s.week, year: s.year, q, appeal: 0,
    formats: [], stock: 0, pressed: 0, marketing, marketingE: E, territories, weekly: [], totalUnits: 0, revenue: 0, peak: 999,
    weeksOnChart: 0, lastPos: 0, coverSeed: 0, shortage: 0, reissueOf: x.reissueOf, live: false,
  };
  rel.kind = x.kind;
  // o lançamento aquece o momento do ato (launchPending): a previsão já conta com esse momento, como as vendas
  const a: Act = { ...act, momentum: clamp(act.momentum + 12 + E * 15, 0, 100) };
  rel.hypeBoost = (1 + (x.hype ?? 0)) * superfanDebut(s, act);
  rel.appeal = computeAppeal(s, null, rel, a, { luck: LUCK_MEAN31 }).appeal * rel.hypeBoost;
  for (const f of FORECAST31.appeal) rel.appeal *= f(s, rel);
  const pool = weeklyPool(s);
  const H = s.stats.lastH ?? 80;
  const B = MARKET_TAIL * (s.year < 1950 ? 0.6 : 1);
  const cap = pool * maxShare(s.year);
  const mine = owner === 'player' || !!act.playerBand;
  const k = mine ? s.stats.lastK31 ?? 1 : 1;
  // foco promocional: o próprio lançamento entra na conta dos recentes do dono
  let n = 1;
  for (const r of allReleases17(s)) if (r.live && r.owner === owner && s.week - r.week < 12) n++;
  const fc = focusCap(s, owner);
  let total = 0;
  for (let age = 0; age < 10; age++) {
    let h = heatOf(s, rel, a, age, NOISE_MEAN31, MEDIA18.fterm?.(s, marketing, E, age, type, q));
    if (n > fc) h *= Math.sqrt(fc / n);
    rel.week = s.week - age; // os modificadores leem a idade pela semana do lançamento
    const u = Math.min(cap, applyMods(s, 'chartUnits', (pool * h) / (H + h + B), { release: rel }).value);
    total += u * k;
  }
  return total;
}

export function chartName(which: 'singles' | 'albums', year = 9999, real = false): string {
  return chartName28(which, year, real); // r28 (F3): o nome muda com o ano
}

export function genreLabel(id: string, lang: 'pt' | 'en'): string {
  return genreById[id]?.name[lang] ?? id;
}
