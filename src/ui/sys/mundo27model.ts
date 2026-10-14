// Rodada 27 (E1) — MUNDO: modelos puros (sem DOM) das telas novas da seção Mundo.
//  - monthlyDigest27: "Este mês no mundo" — só o que mudou nas últimas ~4 semanas (paradas, cenas, leis, escândalos,
//    mortes, rivais, marcos de era, crises), cada item com destino (área/aba/ato/cidade).
//  - citySheet27: ficha da cidade do mapa (cena, casas, rádios, público, quem domina, o que está fechado).
//  - eraTimeline27: faixa das eras (tecnologias desta história) — passado, agora e o que vem, com o que muda no negócio.
//  - known27: "O que sabemos" global — fatos públicos, confirmados, boatos e suspeitas (secrets23 + facts17).
//  - chartRow27: linha da parada (seta, semanas, "pioneiro de", é seu?).
// Só LÊ o estado (nada de sorteio, nada de escrita): a simulação é do E2.

import { CITIES, MARKETS, cityById, genreById, l, type L } from '../../data/world';
import { BRANCH_LEVELS, FORMATS, TECHS } from '../../data/rules';
import { FESTIVALS } from '../../data/catalog';
import { countryInfoByA3, countryMarketSize, countryPop } from '../../data/countries';
import { allCountryCodes, countryName, countryOfCity, marketOfCountry, unitOfCountry } from '../../data/geo';
import { recentFacts, type Fact } from '../../sim/facts17';
import { eraGenre23 } from '../../sim/genre23';
import { MILESTONES } from '../../sim/sys/world4/milestones';
import { w4 } from '../../sim/sys/world4/state';
import { lawById } from '../../sim/sys/world4/laws';
import { eraFeatures } from '../../sim/era';
import { npc17 } from '../../sim/sys/npc17';
import { activeGeo } from '../../sim/culture';
import { activeCensorship } from '../../sim/media';
import { VENUES17, venueOpen } from '../../sim/sys/venues17';
import { outlets17 } from '../../sim/sys/media17';
import { cityDemand } from '../../sim/tours';
import { hotList17 } from '../../sim/sys/trends17';
import { CHAN23, KIND23, knownAbout23, sec23, subjAct23, subjName23, type Lvl23 } from '../../sim/sys/secrets23';
import type { ChartEntry, GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { KIND18, buildings18, type BState } from '../../sim/sys/campus18';

// ================================================================ destinos

/** Para onde um item leva: área, aba (host do data-tabs, id), ato, cidade do mapa, camada, âncora na página. */
export interface Go27 { area: string; tab?: [string, string]; act?: string; city?: string; layer?: MapLayer27; anchor?: string }

/** Páginas novas desta frente. */
export const MUNDO27 = 'mundo27';
export const KNOWN27 = 'known27';
export const MAPTAB27 = 'map27';

// ================================================================ 1. Este mês no mundo

export type Kind27 = 'chart' | 'scene' | 'law' | 'scandal' | 'death' | 'rival' | 'era' | 'world';
export const KINDS27: Kind27[] = ['chart', 'scene', 'era', 'law', 'world', 'rival', 'scandal', 'death'];
export const KIND_INFO27: Record<Kind27, { name: L; icon: string; cap: number }> = {
  chart: { name: l('Paradas', 'Charts'), icon: 'chart-up', cap: 4 },
  scene: { name: l('Cenas e gêneros', 'Scenes and genres'), icon: 'fire', cap: 3 },
  era: { name: l('Era e tecnologia', 'Era and technology'), icon: 'clock', cap: 3 },
  law: { name: l('Leis e regras', 'Laws and rules'), icon: 'gavel', cap: 3 },
  world: { name: l('Crises e fronteiras', 'Crises and borders'), icon: 'globe', cap: 3 },
  rival: { name: l('Rivais e contratações', 'Rivals and signings'), icon: 'flag', cap: 3 },
  scandal: { name: l('Escândalos', 'Scandals'), icon: 'eye', cap: 3 },
  death: { name: l('Mortes', 'Deaths'), icon: 'skull', cap: 3 },
};

export interface DigestItem27 { id: string; kind: Kind27; title: L; text?: L; week: number; weight: number; go: Go27; act?: string; mine?: boolean }
export interface Digest27 { since: number; items: DigestItem27[]; counts: Partial<Record<Kind27, number>>; next?: EraStep27 }

/** Tipos de fato (facts17) → categoria do resumo. */
const FACT27: Record<string, Kind27> = {
  scandal: 'scandal', secret_exposed: 'scandal', arrest: 'scandal', payola: 'scandal', case_ruling: 'scandal', plagiarism_suit: 'scandal',
  stream_fraud: 'scandal', ai_voice_fake: 'scandal', affair: 'scandal', crime: 'scandal',
  death: 'death',
  law: 'law', mandate: 'law',
  signing: 'rival', poach: 'rival', label_sold: 'rival',
  scene: 'scene', zine_scene: 'scene', tribute_born: 'scene', faction_approach: 'scene', // r29c: facção aborda artista da cena (aff29npc)
  world_crisis: 'world', boycott: 'world', visa_denied: 'world', video_banned: 'world', disaster: 'world',
  chart: 'chart',
};
/** Movimentos de NPCs (npc17) que não viram fato próprio e importam ao jogador. */
const MOVE27: Record<string, Kind27> = { founded: 'rival', merger: 'rival', war: 'rival', imprint: 'rival' };
/** Memórias (remember) que contam como notícia do mundo. */
const MEM27: Record<string, Kind27> = { industry: 'era', movement9: 'scene', death: 'death', label_closed: 'rival' };

const isMineAct = (s: GameState, id: string | undefined): boolean => !!id && (s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand);
const firstAct = (s: GameState, xs: string[]): string | undefined => xs.find((x) => !!s.acts[x]);

function goFor(kind: Kind27, place?: string): Go27 {
  switch (kind) {
    case 'chart': return { area: 'charts' };
    case 'scene': return place ? { area: 'world', tab: ['worldHub', MAPTAB27], city: place, layer: 'glow' } : { area: 'world', tab: ['worldHub', MAPTAB27], layer: 'glow' };
    case 'law': return { area: 'world', tab: ['worldHub', 'history'] };
    case 'world': return { area: 'world', tab: ['worldHub', MAPTAB27], layer: 'closed', city: place };
    case 'rival': return { area: 'labels' };
    case 'scandal': return { area: KNOWN27 };
    case 'death': return { area: 'news17' };
    case 'era': return { area: MUNDO27, anchor: 'era27' };
  }
}

/** Itens da parada que mudaram: estreias no top 20, novos nº 1, saltos de 5+ posições (seus primeiro). */
function chartItems(s: GameState): DigestItem27[] {
  const out: DigestItem27[] = [];
  for (const which of ['singles', 'albums'] as const) for (const e of s.charts[which].slice(0, 40)) {
    const r = s.releases[e.releaseId];
    const a = r ? s.acts[r.actId] : undefined;
    if (!r || !a) continue;
    const mine = r.owner === 'player' || !!a.playerBand;
    const jump = e.last ? e.last - e.pos : 0;
    let text: L | null = null;
    if (e.pos === 1 && e.last !== 1) text = l('Novo nº 1', 'New No. 1');
    else if (!e.last && e.pos <= 20) text = fmtL(l('Estreia em nº {p}', 'Debuts at No. {p}'), { p: e.pos });
    else if (jump >= 5) text = fmtL(l('Sobe {d} posições, até nº {p}', 'Up {d} places, to No. {p}'), { d: jump, p: e.pos });
    else if (mine && e.pos <= 40 && !e.last) text = fmtL(l('Entra na parada em nº {p}', 'Enters the chart at No. {p}'), { p: e.pos });
    if (!text) continue;
    const where = which === 'singles' ? l('singles', 'singles') : l('álbuns', 'albums');
    out.push({ id: `c:${which}:${r.id}`, kind: 'chart', title: fmtL(l('{t} — {a}', '{t} — {a}'), { t: r.title, a: a.name }), text: fmtL(l('{x} ({w}).', '{x} ({w}).'), { x: text, w: where }),
      week: s.week, weight: 50 - e.pos + Math.max(0, jump) + (e.pos === 1 ? 30 : 0) + (mine ? 60 : 0), go: { area: 'charts' }, act: a.id, mine });
  }
  return out;
}

/** Resumo do mês: o que mudou nas últimas ~4 semanas (s.week − 4 em diante). */
export function monthlyDigest27(s: GameState): Digest27 {
  const since = s.week - 4;
  const items: DigestItem27[] = [...chartItems(s)];
  const seen = new Set<string>();
  // fatos públicos (e boatos graves) do período
  for (const f of recentFacts(s, { sinceWeek: since, notSecret: true, limit: 400 })) {
    const kind = FACT27[f.kind];
    if (!kind) continue;
    const mine = f.actors.includes('player') || f.actors.some((x) => isMineAct(s, x));
    if (!mine && f.severity < 20) continue;
    if (kind === 'scandal' && f.visibility !== 'public' && f.severity < 40) continue;
    const key = `${kind}|${f.text.pt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const act = firstAct(s, f.actors);
    items.push({ id: `f:${f.id}`, kind, title: f.text, text: f.visibility === 'rumor' ? l('Boato — ainda não confirmado.', 'Rumor — not confirmed yet.') : undefined,
      week: f.w, weight: f.severity + (mine ? 40 : 0), go: { ...goFor(kind, f.place), ...(kind === 'death' && act ? { act } : {}) }, act, mine });
  }
  // memórias marcadas (marcos da indústria, movimentos, mortes, selos fechados)
  for (const m of s.memory) {
    if (m.week < since) continue;
    const kind = MEM27[m.kind];
    if (!kind) continue;
    const key = `${kind}|${m.text.pt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const mine = isMineAct(s, m.actId);
    if (kind === 'death' && !mine && !m.important) continue;
    items.push({ id: `m:${m.id}`, kind, title: m.text, week: m.week, weight: (m.important ? 45 : 25) + (mine ? 40 : 0) + (kind === 'era' ? 20 : 0), go: { ...goFor(kind), ...(kind === 'death' && m.actId ? { act: m.actId } : {}) }, act: m.actId, mine });
  }
  // jogadas dos NPCs sem fato próprio (selos novos, fusões, guerras de preço)
  const mo = (s.month + 11) % 12, yo = s.month ? s.year : s.year - 1;
  for (const mv of npc17(s).log) {
    const kind = MOVE27[mv.k];
    if (!kind || !((mv.y === s.year && mv.m === s.month) || (mv.y === yo && mv.m === mo))) continue;
    items.push({ id: `n:${mv.y}-${mv.m}-${mv.k}-${mv.lb ?? mv.a ?? ''}`, kind, title: mv.t, week: s.week, weight: 30, go: { area: 'world17' }, act: mv.a });
  }
  // leis: votação que fechou (aprovada/derrubada) no período ou que fecha nas próximas 4 semanas
  for (const [id, st] of Object.entries(w4(s).laws)) {
    const def = lawById[id];
    if (!def || st.closes === undefined) continue;
    if (st.status === 'pending' && st.closes >= s.week && st.closes <= s.week + 4) {
      items.push({ id: `lw:${id}`, kind: 'law', title: fmtL(l('Votação em {n} semana(s): {x}', 'Vote in {n} week(s): {x}'), { n: Math.max(0, st.closes - s.week), x: def.name }), text: def.yes, week: s.week, weight: 55, go: goFor('law') });
    } else if (st.status !== 'pending' && st.closes >= since && st.closes <= s.week) {
      items.push({ id: `lw:${id}`, kind: 'law', title: fmtL(st.status === 'passed' ? l('Aprovada: {x}', 'Passed: {x}') : l('Derrubada: {x}', 'Rejected: {x}'), { x: def.name }), text: st.status === 'passed' ? def.yes : undefined, week: st.closes, weight: 60, go: goFor('law') });
    }
  }
  // virada do ano: tecnologias que chegam, gêneros que nascem, crises que começam (só em janeiro)
  if (s.month === 0) {
    for (const x of TECHS) {
      const y = s.techDates[x.id];
      if (y === undefined || Math.floor(y) !== s.year) continue;
      items.push({ id: `t:${x.id}`, kind: 'era', title: fmtL(l('Chegou: {t}', 'Arrived: {t}'), { t: x.name }), text: TECH_FX27[x.id], week: s.week, weight: 70, go: goFor('era') });
    }
    for (const g of Object.values(genreById)) {
      if (g.born !== s.year || g.id.startsWith('mv_')) continue;
      const city = CITIES.find((c) => c.scenes.includes(g.id));
      const par = g.parents.map((p) => genreById[p]?.name).filter((x): x is L => !!x)[0];
      items.push({ id: `g:${g.id}`, kind: 'scene', title: fmtL(l('Nasce um gênero: {g}', 'A genre is born: {g}'), { g: g.name }),
        text: par ? fmtL(city ? l('Vem de {p}; a cena começa em {c}.', 'Grows out of {p}; the scene starts in {c}.') : l('Vem de {p}.', 'Grows out of {p}.'), { p: par, c: city?.name ?? '' }) : undefined,
        week: s.week, weight: 40, go: goFor('scene', city?.id) });
    }
    for (const g of activeGeo(s)) if (g.from === s.year) {
      items.push({ id: `geo:${g.id}`, kind: 'world', title: g.name, text: g.note, week: s.week, weight: g.liveBlocked ? 75 : 50, go: goFor('world') });
    }
  }
  // corta por categoria e no total (seus primeiro, depois peso)
  items.sort((a, b) => Number(!!b.mine) - Number(!!a.mine) || b.weight - a.weight || b.week - a.week);
  const per: Partial<Record<Kind27, number>> = {};
  const counts: Partial<Record<Kind27, number>> = {};
  const kept: DigestItem27[] = [];
  for (const it of items) {
    counts[it.kind] = (counts[it.kind] ?? 0) + 1;
    if ((per[it.kind] ?? 0) >= KIND_INFO27[it.kind].cap || kept.length >= 16) continue;
    per[it.kind] = (per[it.kind] ?? 0) + 1;
    kept.push(it);
  }
  return { since, items: kept, counts, next: eraTimeline27(s).next };
}

// ================================================================ 2. Mapa: camadas e ficha da cidade

export type MapLayer27 = 'glow' | 'hot' | 'tour' | 'festivals' | 'rivals' | 'closed' | 'mine';
export const LAYERS27: { id: MapLayer27; icon: string; name: L }[] = [
  { id: 'glow', icon: 'sparkle', name: l('Força das cenas', 'Scene strength') },
  { id: 'hot', icon: 'fire', name: l('Gêneros em alta', 'Hot genres') },
  { id: 'tour', icon: 'tour-bus', name: l('Seus artistas na estrada', 'Your acts on tour') },
  { id: 'festivals', icon: 'star', name: l('Festivais', 'Festivals') },
  { id: 'rivals', icon: 'flag', name: l('Rivais', 'Rivals') },
  { id: 'closed', icon: 'lock', name: l('Países fechados', 'Closed countries') },
  { id: 'mine', icon: 'building', name: l('Seus lugares (filiais e escritórios)', 'Your places (branches and offices)') },
];

/** Força total das cenas de uma cidade (soma de "cidade:gênero"). */
export function sceneStrength27(s: GameState, cityId: string): number {
  let v = 0;
  const p = cityId + ':';
  for (const [k, x] of Object.entries(s.scenes)) if (x > 0 && k.startsWith(p)) v += x;
  return v;
}
/** 0 quieta · 1 crescendo · 2 forte · 3 em ebulição. */
export const sceneTier27 = (v: number): 0 | 1 | 2 | 3 => (v >= 6 ? 3 : v >= 3 ? 2 : v >= 1 ? 1 : 0);
export const TIER27: L[] = [l('quieta', 'quiet'), l('crescendo', 'growing'), l('forte', 'strong'), l('em ebulição', 'boiling')];

/** Brilho de cada cidade (0..1, relativo à cena mais forte do mundo agora). */
export function sceneGlow27(s: GameState): Map<string, number> {
  const raw = CITIES.map((c) => [c.id, sceneStrength27(s, c.id)] as const).filter(([, v]) => v >= 0.5);
  const max = Math.max(1, ...raw.map(([, v]) => v));
  return new Map(raw.map(([id, v]) => [id, Math.sqrt(v / max)]));
}

/** Gêneros em alta (top 3 das paradas) e onde eles fervem (0..1 por cidade). */
export function hotGenres27(s: GameState): { genres: string[]; heat: Map<string, number> } {
  const genres = hotList17(s, 3).map((x) => x.g);
  const heat = new Map<string, number>();
  for (const [k, v] of Object.entries(s.scenes)) {
    const i = k.indexOf(':');
    if (v > 0 && genres.includes(k.slice(i + 1))) heat.set(k.slice(0, i), (heat.get(k.slice(0, i)) ?? 0) + v);
  }
  const max = Math.max(1, ...heat.values());
  for (const [c, v] of heat) heat.set(c, v / max);
  return { genres, heat };
}

export interface Closed27 { a3: string; why: L; hard: boolean }
/** Onde cada evento/regra de censura vale DE FATO (a simulação trabalha por mercado; o mapa mostra o país certo).
 *  'east' = países do bloco socialista. Ids sem o prefixo 'geo_' (conteúdo) — servem às duas listas. */
const WHERE27: Record<string, string[] | 'east'> = {
  estado_novo: ['BRA'], br_dict: ['BRA'], brazil_regime: ['BRA'], spain_war: ['ESP'], franco: ['ESP'], portugal: ['PRT', 'AGO', 'MOZ', 'GNB'],
  occupation_paris: ['FRA'], soviet_bloc: 'east', eastbloc: 'east', apartheid: ['ZAF'], apartheid_boycott: ['ZAF'], cuba_embargo: ['CUB'],
  greek_junta: ['GRC'], vietnam: ['VNM'], chile: ['CHL'], argentina: ['ARG'], uruguay: ['URY'], latam_dict: ['CHL', 'ARG', 'URY', 'PRY', 'BOL'],
  iran: ['IRN'], yugoslav_wars: ['SRB', 'HRV', 'BIH', 'SVN', 'MKD', 'MNE'], eastern_war: ['UKR'], mccarthy: ['USA'], hays: ['USA'], pmrc: ['USA'],
  prohibition: ['USA'], recording_ban: ['USA'], arab_spring: ['TUN', 'EGY', 'LBY', 'SYR', 'YEM'],
  // hist19 (r19)
  cuban_rev: ['CUB'], sukarno: ['IDN'], burma: ['MMR'], cultural_rev: ['CHN'], new_order: ['IDN'], biafra: ['NGA'], prague_spring: ['CZE', 'SVK'],
  lebanon: ['LBN'], angola: ['AGO'], khmer: ['KHM'], iran_iraq: ['IRN', 'IRQ'], turkey_coup: ['TUR'], polish_martial: ['POL'], falklands: ['ARG', 'FLK'],
  gulf_war: ['IRQ', 'KWT'], algeria: ['DZA'], rwanda: ['RWA'], congo_wars: ['COD'], taliban: ['AFG'], taliban2: ['AFG'], ukraine_2014: ['UKR'],
  hk_nsl: ['HKG'], myanmar_2021: ['MMR'], sudan: ['SDN'], sept11: [], brexit: [], apartheid_end: [],
};
const where27 = (id: string): string[] | 'east' | undefined => WHERE27[id.replace(/^geo(19)?_/, '')];

/** Países fechados agora: guerra/pandemia (shows suspensos) e o bloco rival da Guerra Fria (duros); censura forte,
 *  embargo e boicote (moles). Regras por mercado só marcam os países onde valem de fato (WHERE27). */
export function closedCountries27(s: GameState): Map<string, Closed27> {
  const out = new Map<string, Closed27>();
  const geo = activeGeo(s);
  const cens = activeCensorship(s).filter((c) => c.level >= 0.25);
  const home = countryOfCity(s.config.homeCity);
  const homeBloc = home && s.year >= 1947 && s.year <= 1991 ? unitOfCountry(home, s.year).bloc : null;
  const fits = (id: string, a3: string, mk: string, markets: string[], loose: boolean): boolean => {
    const w = where27(id);
    if (w === 'east') return s.year >= 1947 && s.year <= 1991 && unitOfCountry(a3, s.year).bloc === 'east';
    if (w) return w.includes(a3);
    return loose && markets.includes(mk);
  };
  for (const a3 of allCountryCodes()) {
    const mk = marketOfCountry(a3);
    const g = geo.find((x) => x.liveBlocked && fits(x.id, a3, mk, x.markets, x.markets.length >= 3)); // sem mapa: só guerras/pandemias globais
    if (g) { out.set(a3, { a3, why: fmtL(l('Shows suspensos: {n}', 'Shows suspended: {n}'), { n: g.name }), hard: true }); continue; }
    const bloc = homeBloc ? unitOfCountry(a3, s.year).bloc : null;
    if (bloc && homeBloc && bloc !== homeBloc && bloc !== 'nonaligned' && homeBloc !== 'nonaligned') {
      out.set(a3, { a3, why: bloc === 'east' ? l('Cortina de Ferro: mercado fechado ao Ocidente', 'Iron Curtain: market closed to the West') : l('Bloco rival: mercado fechado', 'Rival bloc: market closed'), hard: true });
      continue;
    }
    const c = cens.find((x) => fits(x.id, a3, mk, x.markets, false));
    if (c) { out.set(a3, { a3, why: fmtL(l('Censura: {n} (risco de veto {p}%)', 'Censorship: {n} (ban risk {p}%)'), { n: c.name, p: Math.round(c.level * 100) }), hard: false }); continue; }
    const e = geo.find((x) => !x.liveBlocked && !!where27(x.id) && fits(x.id, a3, mk, x.markets, false));
    if (e) out.set(a3, { a3, why: e.name, hard: false });
  }
  return out;
}

export interface CitySheet27 {
  id: string; name: L; country: L; a3: string | null; market: L | null;
  scene: { strength: number; tier: 0 | 1 | 2 | 3; genres: { id: string; v: number; hot: boolean }[]; native: string[]; movements: L[] };
  venues: { id: string; name: string; cap: number; prestige: number; mine?: boolean }[];
  radios: { name: string; kind: 'radio' | 'tv'; reach: number }[];
  audience: { popM?: number; marketM?: number; yourFans: number; distributes: boolean };
  dominates: { label?: { id: string; name: string; share: number; player: boolean }; act?: { id: string; name: string; fame: number; mine: boolean }; acts: number; onChart: number };
  festivals: string[];
  closed: L[];
}

/** Ficha da cidade: cena, casas, rádios, público, quem domina e o que está fechado. Nada do futuro. */
export function citySheet27(s: GameState, cityId: string): CitySheet27 | null {
  const c = cityById[cityId];
  if (!c) return null;
  const a3 = countryOfCity(cityId);
  const ci = a3 ? countryInfoByA3[a3] : undefined;
  const mk = MARKETS.find((m) => m.id === c.market);
  const hot = new Set(hotList17(s, 5).map((x) => x.g));
  const genres = Object.entries(s.scenes).filter(([k, v]) => v > 0.2 && k.startsWith(cityId + ':')).map(([k, v]) => ({ id: k.slice(cityId.length + 1), v, hot: hot.has(k.slice(cityId.length + 1)) }))
    .filter((g) => genreById[g.id] && genreById[g.id].born <= s.year).sort((a, b) => b.v - a.v).slice(0, 5);
  const strength = sceneStrength27(s, cityId);
  const native = c.scenes.filter((g) => (genreById[g]?.born ?? 9999) <= s.year).slice(0, 6);
  const movements = s.movements.filter((m) => m.city === cityId && m.born <= s.year && s.year - m.born < 15).slice(-3).map((m) => m.name);
  const venues = VENUES17.filter((v) => v.city === cityId && venueOpen(s, v)).sort((a, b) => b.prestige - a.prestige).slice(0, 4).map((v): CitySheet27['venues'][number] => ({ id: v.id, name: v.name, cap: v.cap, prestige: v.prestige }));
  for (const cl of s.clubs) if (cl.city === cityId && !cl.closed && venues.length < 5) venues.push({ id: `club:${cl.name}`, name: cl.name, cap: cl.capacity, prestige: 0, mine: cl.owner === 'player' });
  const radios = outlets17(s).filter((o) => o.market === c.market && (o.kind === 'radio' || o.kind === 'tv')).sort((a, b) => b.reach - a.reach).slice(0, 4).map((o) => ({ name: o.name, kind: o.kind as 'radio' | 'tv', reach: o.reach }));
  let yourFans = 0;
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a && a.status !== 'retired') yourFans += cityDemand(s, a, cityId); }
  // quem domina: soma da fama dos atos da cidade por dono
  const acts = Object.values(s.acts).filter((a) => a.city === cityId && a.status !== 'retired' && a.formed <= s.year && a.members.length);
  const by = new Map<string, number>();
  let total = 0;
  for (const a of acts) { const k = a.owner === 'player' || a.playerBand ? 'player' : a.owner && s.labels[a.owner] ? a.owner : ''; by.set(k, (by.get(k) ?? 0) + a.fame); total += a.fame; }
  const top = [...by].filter(([k]) => k).sort((a, b) => b[1] - a[1])[0];
  const best = [...acts].sort((a, b) => b.fame - a.fame)[0];
  const chartIds = new Set([...s.charts.singles, ...s.charts.albums].slice(0, 80).map((e) => s.releases[e.releaseId]?.actId));
  const closed: L[] = [];
  if (a3) { const cl = closedCountries27(s).get(a3); if (cl) closed.push(cl.why); }
  return {
    id: cityId, name: c.name, country: countryName(a3), a3, market: mk?.name ?? null,
    scene: { strength, tier: sceneTier27(strength), genres, native, movements },
    venues, radios,
    audience: { popM: ci ? countryPop(ci, s.year) : undefined, marketM: ci ? countryMarketSize(ci, s.year) : undefined, yourFans: Math.round(yourFans), distributes: s.player.territories.includes(c.market) },
    dominates: {
      label: top ? { id: top[0], name: top[0] === 'player' ? s.config.companyName : s.labels[top[0]].name, share: total ? top[1] / total : 0, player: top[0] === 'player' } : undefined,
      act: best ? { id: best.id, name: best.name, fame: Math.round(best.fame), mine: isMineAct(s, best.id) } : undefined,
      acts: acts.length, onChart: acts.filter((a) => chartIds.has(a.id)).length,
    },
    festivals: FESTIVALS.filter((f) => f.city === cityId && f.start <= s.year).map((f) => f.name),
    closed,
  };
}

// ================================================================ 3. Linha das eras

/** O que cada tecnologia muda no negócio (uma frase; o detalhe mecânico vem dos marcos). */
export const TECH_FX27: Record<string, L> = {
  radio: l('O rádio vira vitrine: tocar vende disco e a execução pública rende direitos.', 'Radio becomes the shop window: airplay sells records and public performance pays royalties.'),
  electric_rec: l('Microfone: vozes suaves (crooners) e gravações bem melhores.', 'Microphones: soft voices (crooners) and much better recordings.'),
  disc: l('O disco plano substitui o cilindro: prensagem em massa e catálogo.', 'The flat disc replaces the cylinder: mass pressing and catalogs.'),
  lp: l('Álbum de 33 rpm: obra longa, preço maior por unidade.', '33 rpm album: long-form work, higher price per unit.'),
  single45: l('Single 45 rpm: hits baratos para jovens e jukebox.', '45 rpm single: cheap hits for teens and jukeboxes.'),
  tv_music: l('TV musical: imagem e performance contam; aparecer na TV dá fama nacional.', 'Music TV: looks and performance count; a TV spot brings national fame.'),
  multitrack: l('Fita multipista: o estúdio vira instrumento; discos conceituais e produção cara.', 'Multitrack tape: the studio becomes an instrument; concept albums and costly production.'),
  cassette: l('Cassete: portátil e copiável — abre mercados emergentes, mas traz a cópia caseira.', 'Cassette: portable and copyable — opens emerging markets, but brings home taping.'),
  fm: l('Rádio FM: faixas longas e álbuns tocam; rádios segmentadas por gênero.', 'FM radio: long tracks and albums get played; stations split by genre.'),
  synth: l('Sintetizadores: gêneros eletrônicos e banda pequena com som grande.', 'Synthesizers: electronic genres and small bands with a big sound.'),
  clipnet: l('Rede de clipes: videoclipe vira marketing obrigatório; imagem pesa como o som.', 'Music video network: the video becomes mandatory marketing; image weighs as much as sound.'),
  cd: l('CD: o catálogo antigo vende de novo (reedições) com margem alta.', 'CD: the back catalog sells again (reissues) at high margins.'),
  daw: l('Gravação digital: gravar fica barato; home studio e produtores independentes.', 'Digital recording: recording gets cheap; home studios and indie producers.'),
  internet: l('Internet doméstica: sites, fóruns e fãs organizados online.', 'Home internet: websites, forums and fans organizing online.'),
  p2p: l('Compartilhamento P2P: pirataria em massa derruba a venda física.', 'P2P sharing: mass piracy cuts physical sales.'),
  download: l('Loja de downloads: vende faixa avulsa; o álbum perde força.', 'Download store: single tracks sell; the album weakens.'),
  streaming: l('Streaming: paga por execução, playlists decidem e o catálogo rende para sempre.', 'Streaming: pays per play, playlists decide and the catalog earns forever.'),
  short_video: l('Vídeo curto: hits viralizam por trechos de 15 s; creators viram divulgação.', 'Short video: hits go viral through 15-second clips; creators become promotion.'),
  hologram: l('Hologramas de palco: shows de artistas ausentes ou mortos.', 'Stage holograms: shows by absent or dead artists.'),
  synthetic_voice: l('Vozes sintéticas: música gerada e clones de voz; direitos de voz viram disputa.', 'Synthetic voices: generated music and voice clones; voice rights become a fight.'),
  neural: l('Interface neural: música direto ao ouvinte, feeds personalizados.', 'Neural interface: music straight to the listener, personalized feeds.'),
};

export type EraStatus27 = 'past' | 'now' | 'next' | 'soon' | 'later' | 'never';
export interface EraStep27 { id: string; name: L; year: number; real: number; status: EraStatus27; fx: L; changes: L[]; formats: L[]; unlocks: L[]; shifted: boolean }
export interface EraTimeline27 { steps: EraStep27[]; next?: EraStep27; year: number }

/** Faixa das eras: cada tecnologia desta história com o ano em que chega (ou chegou) e o que muda no seu negócio. */
export function eraTimeline27(s: GameState): EraTimeline27 {
  const steps: EraStep27[] = TECHS.map((x) => {
    const at = s.techDates[x.id];
    const never = at === undefined && (s.divergence[x.id] === 'no' || s.year > x.base + x.spread + 2);
    const year = Math.round(at ?? x.base);
    const changes = MILESTONES.filter((m) => m.tech === x.id).map((m) => m.mech);
    const formats = FORMATS.filter((f) => f.tech === x.id).map((f) => fmtL(l('Novo formato: {f}', 'New format: {f}'), { f: f.name }));
    const unlocks = eraFeatures().filter((f) => f.tech === x.id).map((f) => fmtL(l('Desbloqueável: {f}', 'Unlockable: {f}'), { f: f.label }));
    const status: EraStatus27 = never ? 'never' : year < s.year - 1 ? 'past' : year <= s.year ? 'now' : year - s.year <= 12 ? 'soon' : 'later';
    return { id: x.id, name: x.name, year, real: x.base, status, fx: TECH_FX27[x.id] ?? x.name, changes, formats, unlocks, shifted: at !== undefined && year !== x.base };
  }).sort((a, b) => a.year - b.year || a.real - b.real);
  // r27: só o que já aconteceu NESTE save — nada do futuro (nem previsão), nem o que não veio
  const done = steps.filter((x) => (x.status === 'past' || x.status === 'now') && s.techDates[x.id] !== undefined && x.year <= s.year);
  return { steps: done, next: undefined, year: s.year };
}

// ================================================================ 4. O que sabemos

export interface KnownRow27 { id: string; subj: string; name: string; kind: L; lv: Lvl23; press: Lvl23; src?: L; mine: boolean; act?: string; person?: string; label?: string; sev: number }
export interface Known27 { pub: KnownRow27[]; confirmed: KnownRow27[]; rumor: KnownRow27[]; suspicion: KnownRow27[]; facts: Fact[]; rumorFacts: Fact[]; total: number }
const SCANDAL27 = ['scandal', 'secret_exposed', 'arrest', 'payola', 'case_ruling', 'plagiarism_suit', 'affair', 'stream_fraud', 'ai_voice_fake'];

/** Tudo o que o jogador sabe de segredos e vínculos (sem os "assumidos", que são identidade, não segredo). */
export function known27(s: GameState): Known27 {
  const st = sec23(s);
  const subs = new Set<string>();
  for (const id of Object.keys(st.k)) subs.add(id.slice(id.indexOf('|') + 1));
  for (const x of st.inv) subs.add(x.subj);
  for (const id of playerActs(s)) { subs.add(`a:${id}`); for (const m of s.acts[id]?.members ?? []) subs.add(`p:${m}`); }
  const rows: KnownRow27[] = [];
  const seen = new Set<string>();
  for (const subj of subs) for (const { sec, k } of knownAbout23(s, subj)) {
    if (seen.has(sec.id) || KIND23[sec.kind].vis === 'assumed') continue;
    seen.add(sec.id);
    const last = k.how.filter((x) => x.o === 'player').at(-1);
    const act = subj.startsWith('a:') ? subj.slice(2) : subjAct23(s, subj)?.id;
    rows.push({ id: sec.id, subj, name: subjName23(s, subj), kind: KIND23[sec.kind].n, lv: k.p, press: k.pr, src: last ? last.t ?? CHAN23[last.ch] : undefined,
      mine: subj === 'player' || isMineAct(s, act), act: act && s.acts[act] ? act : undefined, person: subj.startsWith('p:') ? subj.slice(2) : undefined, label: subj.startsWith('lb:') ? subj.slice(3) : undefined, sev: sec.sev });
  }
  rows.sort((a, b) => b.lv - a.lv || b.sev - a.sev);
  const facts = recentFacts(s, { vis: 'public', months: 12, kinds: SCANDAL27, limit: 12 });
  const rumorFacts = recentFacts(s, { vis: 'rumor', months: 6, limit: 10 }).filter((f) => f.severity >= 15);
  const pub = rows.filter((r) => r.lv >= 4 || r.press >= 4);
  const rest = rows.filter((r) => !pub.includes(r));
  return { pub, confirmed: rest.filter((r) => r.lv === 3), rumor: rest.filter((r) => r.lv === 2), suspicion: rest.filter((r) => r.lv === 1), facts, rumorFacts, total: rows.length + facts.length + rumorFacts.length };
}

// ================================================================ 5. Paradas

export interface ChartRow27 { pos: number; last: number; weeks: number; move: 'new' | 'up' | 'down' | 'same'; delta: number; mine: boolean; pioneer?: string }

/** Linha da parada: seta (estreia/sobe/desce/igual), semanas, se é seu e de que gênero o ato é pioneiro. */
export function chartRow27(s: GameState, e: ChartEntry): ChartRow27 {
  const r = s.releases[e.releaseId];
  const a = r ? s.acts[r.actId] : undefined;
  const move = !e.last ? 'new' : e.last > e.pos ? 'up' : e.last < e.pos ? 'down' : 'same';
  return { pos: e.pos, last: e.last, weeks: e.weeks, move, delta: e.last ? Math.abs(e.last - e.pos) : 0, mine: !!r && (r.owner === 'player' || !!a?.playerBand), pioneer: a ? pioneerOf27(s, a.genre, a.formed) : undefined };
}

/** Gênero do qual o ato é pioneiro: ainda não nasceu (genre23) ou nasceu há ≤ 3 anos e o ato já existia então. */
export function pioneerOf27(s: Pick<GameState, 'year'>, genre: string, formed: number): string | undefined {
  const e = eraGenre23(genre, s.year);
  if (e.pioneer) return e.real;
  const g = genreById[genre];
  if (g && !genre.startsWith('mv_') && s.year - g.born <= 3 && s.year >= g.born && formed <= g.born) return genre;
  return undefined;
}

// ================================================================ 5. Seus lugares fora da sede (r27 FLOW2)
// Filiais, escritórios no exterior e empreendimentos em outras cidades não aparecem no mapa da cidade-sede (CITY2):
// no mapa-múndi viram marcadores (camada "Seus lugares") com ficha (cidade, tipo, equipe, ações → a página).

export interface Site27 {
  id: string; city: string; kind: string; kindName: L; icon: string; name: string;
  lvl: number; staff?: number; acts?: number; state: BState; go: Go27;
}
const OFF27: ReadonlySet<BState> = new Set<BState>(['sold', 'closed', 'planned']);

/** Lugares do jogador fora da cidade-sede (não planejados, vendidos ou fechados). */
export function foreignSites27(s: GameState): Site27[] {
  const home = s.config.homeCity;
  return buildings18(s).filter((b) => b.zone === 'world' && b.city !== home && !!cityById[b.city] && !OFF27.has(b.st)).map((b): Site27 => {
    const br = b.kind === 'branch' ? s.branches.find((x) => `br:${x.id}` === b.id) : undefined;
    const go: Go27 = br ? { area: 'hq', anchor: `br27-${br.id}` } : { area: b.goto?.area ?? 'campus18', ...(b.goto?.tab ? { tab: b.goto.tab } : {}), ...(b.goto?.act ? { act: b.goto.act } : {}) };
    return {
      id: b.id, city: b.city, kind: b.kind, kindName: br ? BRANCH_LEVELS[br.level]?.name ?? KIND18.branch.name : KIND18[b.kind].name, icon: KIND18[b.kind].icon, name: b.name,
      lvl: b.lvl, staff: b.staff, state: b.st, go,
      ...(br ? { acts: Object.values(s.branchOf ?? {}).filter((x) => x === br.id).length } : {}),
    };
  }).sort((a, b) => (a.city < b.city ? -1 : a.city > b.city ? 1 : a.id < b.id ? -1 : 1));
}
/** Lugares por cidade (marcadores do mapa). */
export function sitesByCity27(s: GameState): Map<string, Site27[]> {
  const m = new Map<string, Site27[]>();
  for (const x of foreignSites27(s)) { const a = m.get(x.city); if (a) a.push(x); else m.set(x.city, [x]); }
  return m;
}
