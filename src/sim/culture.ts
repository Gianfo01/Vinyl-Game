// Cultura (GDD §14 + pedido do criador): movimentos que nascem nas cenas e geram subgêneros
// nomeados, casas e clubes por cena, moda e visual por era, geopolítica (guerras, ditaduras,
// embargos, choques) com efeitos reais em demanda, turnês e custos.

import { clamp, type Rng } from '../core/rng';
import { CITIES, GENRES, cityById, familyOf, genreById, l, type Genre, type L, type MarketId } from '../data/world';
import type { GameState } from './types';
import type { Movement } from './xtypes';
import { fmtL, money, nextId, notify, post, remember } from './util';
import { addAsset } from './finance';

// ---------- Moda e visual ----------
export function fashionOf(year: number, family: string): L {
  const d = Math.floor(year / 10) * 10;
  const table: Record<number, L> = {
    1920: l('chapéus cloche, colares longos e ternos de risca', 'cloche hats, long pearls and pinstripe suits'),
    1930: l('vestidos de cetim e smokings brancos', 'satin gowns and white dinner jackets'),
    1940: l('ombreiras, zoot suits e lenços', 'shoulder pads, zoot suits and scarves'),
    1950: l('topetes, jaquetas de couro e saias rodadas', 'pompadours, leather jackets and poodle skirts'),
    1960: l('franjas, estampas psicodélicas e botas', 'fringe, psychedelic prints and go-go boots'),
    1970: l('boca de sino, plataforma e purpurina', 'bell-bottoms, platforms and glitter'),
    1980: l('ombreiras, neon e cabelos armados', 'shoulder pads, neon and big hair'),
    1990: l('flanela, jeans rasgado e tênis gigantes', 'flannel, ripped jeans and chunky sneakers'),
    2000: l('cintura baixa, bonés e óculos espelhados', 'low-rise jeans, caps and mirrored shades'),
    2010: l('minimalismo, streetwear e logos grandes', 'minimalism, streetwear and big logos'),
    2020: l('tie-dye revival, balaclavas e unhas de LED', 'tie-dye revival, balaclavas and LED nails'),
    2030: l('tecidos reativos, máscaras háticas e hologramas no corpo', 'reactive fabrics, haptic masks and body holograms'),
    2040: l('roupas que mudam com a música', 'clothes that change with the music'),
  };
  const base = table[clamp(d, 1920, 2040)] ?? table[2020];
  if (family === 'rock' || family === 'punk') return fmtL(l('{b}, com tachas e couro', '{b}, with studs and leather'), { b: base });
  if (family === 'electronic') return fmtL(l('{b}, com acessórios refletivos', '{b}, with reflective accessories'), { b: base });
  return base;
}

// ---------- Movimentos e subgêneros ----------
const PREFIX = [l('Nova Onda', 'New Wave'), l('Som de', 'Sound of'), l('Cena', 'Scene'), l('Movimento', 'Movement')];
const SUFFIX = ['core', 'wave', 'beat', 'gaze', 'step', 'tropical', 'noir', 'pop', 'dub', 'folk'];

/** Gêneros criados por movimentos precisam existir após recarregar o save. */
export function registerMovementGenres(s: GameState): void {
  // gêneros dinâmicos pertencem ao save: limpa os de outra partida antes de registrar
  for (let i = GENRES.length - 1; i >= 0; i--) {
    const g = GENRES[i];
    if (g.id.startsWith('mv_') && !s.movements.some((m) => m.genreId === g.id)) {
      GENRES.splice(i, 1);
      delete (genreById as Record<string, Genre>)[g.id];
    }
  }
  for (const mv of s.movements) {
    if (genreById[mv.genreId]) continue;
    const parent = genreById[mv.parent];
    const g: Genre = { id: mv.genreId, name: mv.name, family: parent?.family ?? 'pop', born: mv.born, parents: [mv.parent] };
    GENRES.push(g);
    (genreById as Record<string, Genre>)[g.id] = g;
  }
}

function movementName(r: Rng, cityId: string, parent: string): L {
  const c = cityById[cityId]?.name ?? l(cityId);
  const short = (c.en.split(/[\s-]/)[0] ?? 'City').replace(/[^A-Za-z]/g, '').slice(0, 6).toLowerCase();
  const pg = genreById[parent]?.name ?? l(parent);
  switch (r.int(0, 3)) {
    case 0: return { pt: `${short}${r.pick(SUFFIX)}`, en: `${short}${r.pick(SUFFIX)}` };
    case 1: { const p = r.pick(PREFIX); return { pt: `${p.pt} ${c.pt}`, en: `${p.en} ${c.en}` }; }
    case 2: return { pt: `${pg.pt} de ${c.pt}`, en: `${c.en} ${pg.en}` };
    default: { const sx = r.pick(SUFFIX); return { pt: `${pg.pt.split(' ')[0]}-${sx}`, en: `${pg.en.split(' ')[0]}-${sx}` }; }
  }
}

function movementsMonth(s: GameState, r: Rng): void {
  // candidatos: cenas fortes com vários artistas ativos (a nomeação emerge de identidade compartilhada)
  const counts: Record<string, string[]> = {};
  for (const a of Object.values(s.acts)) {
    if (a.status !== 'active' && a.status !== 'emerging') continue;
    const k = `${a.city}:${a.genre}`;
    (counts[k] ??= []).push(a.id);
  }
  for (const [k, ids] of Object.entries(counts)) {
    if (ids.length < 3) continue;
    const strength = s.scenes[k] ?? 0;
    if (strength < 4 || s.movements.some((m) => `${m.city}:${m.parent}` === k && s.year - m.born < 15)) continue;
    if (!r.chance(0.004 + Math.min(0.01, strength / 1500))) continue;
    if (s.movements.filter((m) => s.year - m.born < 5).length >= 3 || s.movements.some((m) => m.born === s.year)) continue;
    const [city, parent] = k.split(':');
    const mv: Movement = { id: nextId(s, 'mv'), name: movementName(r, city, parent), city, parent, genreId: `mv_${s.idSeq}`, born: s.year, strength: strength * 2, fashion: fashionOf(s.year, familyOf(parent)), acts: [] };
    s.movements.push(mv);
    registerMovementGenres(s);
    s.genrePop[mv.genreId] = 0.7;
    // parte dos artistas da cena adota o novo nome; a identidade pública muda
    for (const id of ids) if (r.chance(0.5)) {
      const a = s.acts[id];
      a.genre = mv.genreId;
      a.movementId = mv.id;
      mv.acts.push(id);
      a.momentum = clamp(a.momentum + 10, 0, 100);
    }
    remember(s, 'movement', fmtL(l('Nasce em {c} o movimento "{m}" ({f}).', 'The "{m}" movement is born in {c} ({f}).'), { c: cityById[city]?.name ?? city, m: mv.name, f: mv.fashion }), { important: true });
    if (city === s.config.homeCity || s.player.territories.includes(cityById[city]?.market)) notify(s, fmtL(l('Novo movimento: {m} em {c}.', 'New movement: {m} in {c}.'), { m: mv.name, c: cityById[city]?.name ?? city }), 'event');
  }
  for (const mv of s.movements) {
    mv.strength *= 0.985;
    const pop = s.genrePop[mv.genreId] ?? 0.5;
    if (mv.strength > 20) s.genrePop[mv.genreId] = clamp(pop + 0.01, 0.2, 2);
  }
}

// ---------- Casas e clubes por cena ----------
const CLUB_NAMES = ['Porão', 'Galpão', 'Toca', 'Underground', 'Paradise', 'Garage', 'Lounge', 'Casbah', 'Electric', 'Velvet', 'Bunker', 'Factory', 'Haçienda', 'Roxy', 'Fillmore', 'Cavern'];

function clubsMonth(s: GameState, r: Rng): void {
  // abrem onde a cena ferve; fecham quando ela esfria (exceto o do jogador)
  if (r.chance(0.25)) {
    const hot = Object.entries(s.scenes).filter(([, v]) => v > 3).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const pick = hot.length ? r.pick(hot) : undefined;
    if (pick) {
      const [city, genre] = pick[0].split(':');
      if (s.clubs.filter((c) => c.city === city && !c.closed).length < 3 && cityById[city]) {
        const name = `${r.pick(CLUB_NAMES)} ${cityById[city].name.en.split(' ')[0]}`;
        s.clubs.push({ id: nextId(s, 'cl'), name, city, genre, capacity: r.int(150, 1200), prestige: r.int(10, 50), opened: s.year });
      }
    }
  }
  for (const c of s.clubs) {
    if (c.closed) continue;
    const scene = s.scenes[`${c.city}:${c.genre}`] ?? 0;
    c.prestige = clamp(c.prestige + (scene > 3 ? 0.4 : -0.3), 0, 100);
    if (c.owner === 'player') {
      const rev = money(s, c.capacity * 3 * (0.5 + scene / 10));
      const cost = money(s, c.capacity * 2.2);
      post(s, `club:${c.id}`, rev - cost, 'clubs', `Clube ${c.name}`);
      s.scenes[`${c.city}:${c.genre}`] = scene + 0.15;
    } else if (c.prestige < 3 && r.chance(0.1)) {
      c.closed = s.year;
      remember(s, 'club_closed', fmtL(l('Fecha o clube {n} em {c}.', 'The {n} club in {c} closes.'), { n: c.name, c: cityById[c.city]?.name ?? c.city }));
    }
  }
  s.clubs = s.clubs.filter((c) => !c.closed || s.year - c.closed < 5).slice(-80);
}

export function buyClub(s: GameState, clubId: string): L | null {
  const c = s.clubs.find((x) => x.id === clubId);
  if (!c || c.closed || c.owner) return l('Clube indisponível.', 'Club unavailable.');
  const price = money(s, 15000 + c.capacity * 40 + c.prestige * 500);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `clubbuy:${c.id}`, -price, 'acquisitions', `Compra do clube ${c.name}`);
  c.owner = 'player';
  addAsset(s, { kind: 'building', name: c.name, cost: price, lifeMonths: 240, refId: c.id });
  remember(s, 'club', fmtL(l('O selo compra o clube {n}.', 'The label buys the {n} club.'), { n: c.name }), { important: true });
  return null;
}

/** Clube próprio na cidade: shows ali rendem mais público e prestígio. */
export function clubBonus(s: GameState, cityId: string): number {
  return s.clubs.some((c) => c.city === cityId && c.owner === 'player' && !c.closed) ? 1.2 : 1;
}

export function seedClubs(s: GameState, r: Rng): void {
  for (const city of CITIES) {
    if (!r.chance(0.5)) continue;
    const genre = r.pick(city.scenes.filter((g) => genreById[g] && genreById[g].born <= s.year)) ?? city.scenes[0];
    if (!genre) continue;
    s.clubs.push({ id: nextId(s, 'cl'), name: `${r.pick(CLUB_NAMES)} ${city.name.en.split(' ')[0]}`, city: city.id, genre, capacity: r.int(150, 900), prestige: r.int(15, 60), opened: s.year - r.int(0, 10) });
  }
}

// ---------- Geopolítica ----------
export interface GeoEvent {
  id: string;
  name: L;
  from: number;
  to: number;
  markets: MarketId[];
  demand: number; // multiplicador de consumo nos mercados
  liveBlocked?: boolean; // shows suspensos
  pressingMult?: number; // custo de fabricação
  note: L;
}

export let GEO_EVENTS: GeoEvent[] = [
  { id: 'depression', name: l('Grande Depressão', 'Great Depression'), from: 1930, to: 1933, markets: ['na', 'eu', 'latam', 'br'], demand: 0.6, note: l('Discos viram luxo; o rádio gratuito domina.', 'Records become a luxury; free radio rules.') },
  { id: 'ww2', name: l('Segunda Guerra Mundial', 'World War II'), from: 1939, to: 1945, markets: ['eu', 'asia', 'oceania'], demand: 0.55, liveBlocked: true, pressingMult: 1.6, note: l('Goma-laca racionada e turnês internacionais suspensas.', 'Shellac rationed and international tours suspended.') },
  { id: 'cuba_embargo', name: l('Embargo a Cuba', 'Cuban embargo'), from: 1962, to: 2040, markets: ['latam'], demand: 0.97, note: l('Comércio e turnês entre EUA e Cuba bloqueados.', 'Trade and tours between the US and Cuba blocked.') },
  { id: 'oil73', name: l('Choque do petróleo', 'Oil shock'), from: 1973, to: 1975, markets: ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'], demand: 0.9, pressingMult: 1.5, note: l('Vinil (derivado do petróleo) encarece.', 'Vinyl (an oil product) gets pricier.') },
  { id: 'apartheid_boycott', name: l('Boicote cultural ao apartheid', 'Apartheid cultural boycott'), from: 1980, to: 1991, markets: ['africa'], demand: 0.95, note: l('Tocar na África do Sul custa reputação.', 'Playing South Africa costs reputation.') },
  { id: 'lost_decade', name: l('Década perdida e hiperinflação', 'Lost decade and hyperinflation'), from: 1982, to: 1993, markets: ['br', 'latam'], demand: 0.8, note: l('Preços sobem toda semana; o público compra menos.', 'Prices rise every week; fans buy less.') },
  { id: 'crash2008', name: l('Crise financeira global', 'Global financial crisis'), from: 2008, to: 2010, markets: ['na', 'eu'], demand: 0.85, note: l('Crédito some e patrocínios encolhem.', 'Credit dries up and sponsorships shrink.') },
  { id: 'pandemic', name: l('Pandemia global', 'Global pandemic'), from: 2020, to: 2021, markets: ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'], demand: 1.05, liveBlocked: true, note: l('Shows proibidos; streaming e lives explodem.', 'Shows banned; streaming and livestreams explode.') },
  { id: 'chip_crisis', name: l('Crise dos chips neurais', 'Neural chip shortage'), from: 2034, to: 2035, markets: ['na', 'asia', 'eu'], demand: 0.92, note: l('Interfaces neurais faltam nas lojas.', 'Neural interfaces vanish from stores.') },
];

export function setGeoEvents(list: GeoEvent[]): void {
  if (list.length) GEO_EVENTS = list;
}

export function activeGeo(s: GameState): GeoEvent[] {
  return GEO_EVENTS.filter((g) => s.year >= g.from && s.year <= g.to);
}

/** Efeitos de um evento geopolítico em frases curtas (sem revelar quando termina). */
export function geoEffects(g: GeoEvent): L[] {
  const out: L[] = [];
  const pct = Math.round((g.demand - 1) * 100);
  if (pct) out.push(fmtL(pct < 0 ? l('Consumo de música {p}%', 'Music spending {p}%') : l('Consumo de música +{p}%', 'Music spending +{p}%'), { p: pct }));
  if (g.liveBlocked) out.push(l('Shows e turnês suspensos', 'Shows and tours suspended'));
  if (g.pressingMult && g.pressingMult !== 1) out.push(fmtL(l('Fabricação +{p}%', 'Manufacturing +{p}%'), { p: Math.round((g.pressingMult - 1) * 100) }));
  if (!out.length) out.push(l('Clima social e político pesa nas escolhas', 'The social and political climate weighs on choices'));
  return out;
}

export function liveBlocked(s: GameState, cityId: string): GeoEvent | undefined {
  const m = cityById[cityId]?.market;
  return activeGeo(s).find((g) => g.liveBlocked && m && g.markets.includes(m));
}

/** Multiplicador global de consumo (ponderado pelos mercados). */
export function geoDemandMult(s: GameState): number {
  let m = 1;
  for (const g of activeGeo(s)) m *= 1 - (1 - g.demand) * (g.markets.length / 7);
  return m;
}

export function geoPressingMult(s: GameState): number {
  return activeGeo(s).reduce((t, g) => t * (g.pressingMult ?? 1), 1);
}

function geoMonth(s: GameState): void {
  const now = activeGeo(s).map((g) => g.id);
  for (const g of activeGeo(s)) if (!s.geo.active.includes(g.id)) {
    remember(s, 'geo', fmtL(l('{n}: {t}', '{n}: {t}'), { n: g.name, t: g.note }), { important: true });
    notify(s, fmtL(l('Mundo: {n}. {t}', 'World: {n}. {t}'), { n: g.name, t: g.note }), 'event');
  }
  s.geo.active = now;
  s.flags.geoDemand = geoDemandMult(s);
  s.flags.geoPressing = geoPressingMult(s);
}

export function cultureMonth(s: GameState, r: Rng): void {
  movementsMonth(s, r);
  clubsMonth(s, r);
  geoMonth(s);
}
