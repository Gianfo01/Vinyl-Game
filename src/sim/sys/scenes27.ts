// Rodada 27 (E2) — CENAS COM CICLO DE VIDA E CAUSAS. Camada sobre o que já existe (s.scenes = força cidade×gênero,
// movimentos de culture.ts/movements9, cenas históricas de world4/scenes, redes locais do scenes12): cada cena viva
// tem CIDADE DE ORIGEM, CASA FUNDADORA (um clube real de s.clubs quando há), ATOS FUNDADORES, e passa por
//   nascimento → crescimento → auge → saturação → declínio → morte
// com causas visíveis (fato `scene_life` + linha do tempo da cena): quantos atos tocam o som, quantas cidades já
// copiaram, imitadores (rivals27), a casa fundadora que fechou, o fundador que morreu/saiu, censura no país de origem,
// reação do público contra o gênero (world4 backlash). Ela SE ESPALHA para outras cidades (turnê de um ato da cena,
// rádios do mesmo mercado, afinidade local, imprensa) e cada cidade nova ganha força de cena (s.scenes).
// Origens: movimento que nasce (culture.ts), cena histórica que começa (world4/scenes), cena local que ferve sem nome,
// e um HIT DO JOGADOR (top 10) que planta uma cena na cidade do ato.
// Jogador: entrar cedo (nascimento/crescimento) rende bônus de apelo enquanto a cena vive; chegar no auge rende pouco;
// chegar tarde numa cena saturada da sua cidade custa apelo (saturação). Gerador próprio por mês (sem tocar no RNG do jogo).

import { Rng, clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { CITIES, cityById, genreById, l, marketById, type L } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import type { Act, GameState, Release } from '../types';
import { fmtL, notify } from '../util';
import { headline19 } from './factlink19';
import { regimeAt18 } from './society18';
import { HIST_SCENES, sceneStage } from './world4/scenes';
import { w4 } from './world4/state';
import { mov9 } from './movements9';

export type Ph27 = 'born' | 'growing' | 'peak' | 'saturated' | 'fading' | 'dead';
export const PH27: Record<Ph27, L> = {
  born: l('nascendo', 'being born'), growing: l('crescendo', 'growing'), peak: l('no auge', 'at its peak'),
  saturated: l('saturada', 'saturated'), fading: l('em declínio', 'fading'), dead: l('morta', 'dead'),
};
export type Src27 = 'movement' | 'hist' | 'hit' | 'local';
export interface SceneCity27 { c: string; y: number; why: L }
export interface Scene27 {
  id: string; name: L; genre: string; gs: string[]; city: string; venue: string; club?: string;
  founders: string[]; w0: number; y0: number; src: Src27; ref?: string;
  ph: Ph27; heat: number; sat: number; phW: number; peakY?: number; died?: number; cause?: L;
  /** pancadas já sofridas (uma vez cada): casa fechou, fundador saiu */
  hit?: Record<string, 1>;
  /** causa dominante do declínio (peso) */
  why?: { k: string; v: number; t: L }[];
  cities: SceneCity27[];
  log: { y: number; m: number; t: L }[];
}
/** quando um ato do jogador entrou na cena */
export interface Ride27 { ph: Ph27; w: number; y: number }
export interface Sc27State { list: Scene27[]; ride: Record<string, Ride27>; seen: Record<string, 1>; seq: number }

declare module '../ext4' { interface Ext4 { sc27: Sc27State } }
const init = (): Sc27State => ({ list: [], ride: {}, seen: {}, seq: 0 });
registerExt4('sc27', init);
export function sc27(s: GameState): Sc27State {
  const x = s.x4 as unknown as { sc27?: Sc27State };
  const st = (x.sc27 ??= init());
  st.list ??= []; st.ride ??= {}; st.seen ??= {}; st.seq ??= 0;
  return st;
}

/** Desligar (bisecção de balanceamento). */
export const OFF27: { scenes?: boolean } = {};
const LIVE: Ph27[] = ['born', 'growing', 'peak', 'saturated', 'fading'];
export const alive27 = (sc: Scene27) => sc.ph !== 'dead';
const cname = (id: string): L => cityById[id]?.name ?? l(id, id);
const gname = (id: string): L => genreById[id]?.name ?? l(id, id);
const liveAct = (a?: Act) => !!a && (a.status === 'active' || a.status === 'emerging') && !a.deceased && a.members.length > 0;
const mine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const months = (s: GameState, w: number) => Math.max(0, Math.round((s.week - w) / 4.35));

function logSc(s: GameState, sc: Scene27, t: L): void {
  sc.log.push({ y: s.year, m: s.month, t });
  if (sc.log.length > 14) sc.log.splice(1, 1);
}

/** Fato da vida da cena (consumido aqui: manchete, força da cena na cidade nova). */
function fact(s: GameState, sc: Scene27, tag: string, t: L, sev: number, extra: string[] = [], place = sc.city): void {
  emitFact(s, { kind: 'scene_life', actors: [...extra, ...sc.founders.slice(0, 2)], place, severity: sev, visibility: 'public', tags: ['scene27', tag, sc.genre], src: 'scenes27', text: t, data: { sc: sc.id, ph: sc.ph } });
}

// ---------------------------------------------------------------- casa fundadora

const VENUE_ERA: [number, string[]][] = [
  [0, ['Salão', 'Cabaré', 'Dancing', 'Café-Concerto']],
  [1950, ['Boate', 'Clube', 'Café', 'Beco']],
  [1975, ['Porão', 'Galpão', 'Squat', 'Garagem']],
  [1995, ['Galpão', 'Clube', 'Coletivo', 'Inferninho']],
  [2010, ['Coletivo', 'Festa', 'Estúdio', 'Laje']],
];
const EN_VENUE: Record<string, string> = { 'Salão': 'Ballroom', 'Cabaré': 'Cabaret', 'Dancing': 'Dancehall', 'Café-Concerto': 'Café-Concert', 'Boate': 'Nightclub', 'Clube': 'Club', 'Café': 'Café', 'Beco': 'Alley',
  'Porão': 'Basement', 'Galpão': 'Warehouse', 'Squat': 'Squat', 'Garagem': 'Garage', 'Coletivo': 'Collective', 'Inferninho': 'Dive', 'Festa': 'Party', 'Estúdio': 'Studio', 'Laje': 'Rooftop' };
function venueFor(s: GameState, r: Rng, city: string, gs: string[]): { name: string; club?: string } {
  const open = s.clubs.filter((c) => c.city === city && !c.closed);
  const cl = open.find((c) => gs.includes(c.genre)) ?? open.sort((a, b) => b.prestige - a.prestige)[0];
  if (cl) return { name: cl.name, club: cl.id };
  let pool = VENUE_ERA[0][1];
  for (const [y, p] of VENUE_ERA) if (s.year >= y) pool = p;
  const kind = r.pick(pool);
  const short = (cityById[city]?.name.pt ?? city).split(/[\s-]/)[0];
  return { name: `${kind} ${short}` };
}
/** nome da casa nos dois idiomas (o tipo é traduzido; o nome próprio não) */
export function venueL27(name: string): L {
  const [k, ...rest] = name.split(' ');
  return EN_VENUE[k] ? l(name, `${EN_VENUE[k]} ${rest.join(' ')}`.trim()) : l(name, name);
}

// ---------------------------------------------------------------- nascimento

function actsByKey(s: GameState): Map<string, Act[]> {
  const m = new Map<string, Act[]>();
  for (const a of Object.values(s.acts)) {
    if (!liveAct(a)) continue;
    const k = `${a.city}:${a.genre}`;
    const arr = m.get(k);
    if (arr) arr.push(a); else m.set(k, [a]);
  }
  return m;
}
const founderSort = (a: Act, b: Act) => a.debutYear - b.debutYear || b.fame - a.fame || a.id.localeCompare(b.id);

function birth(s: GameState, r: Rng, o: { name: L; genre: string; gs?: string[]; city: string; founders: Act[]; src: Src27; ref?: string; cause: L; heat?: number }): Scene27 {
  const st = sc27(s);
  const gs = o.gs ?? [o.genre];
  const v = venueFor(s, r, o.city, gs);
  const sc: Scene27 = {
    id: `sc27_${++st.seq}`, name: o.name, genre: o.genre, gs, city: o.city, venue: v.name, ...(v.club ? { club: v.club } : {}),
    founders: o.founders.slice(0, 3).map((a) => a.id), w0: s.week, y0: s.year, src: o.src, ...(o.ref ? { ref: o.ref } : {}),
    ph: 'born', heat: o.heat ?? 12, sat: 0, phW: s.week, cities: [{ c: o.city, y: s.year, why: o.cause }], log: [],
  };
  const fn = o.founders.slice(0, 3).map((a) => a.name).join(', ');
  const t = fmtL(fn ? l('Nasce em {c} a cena "{n}": {why} Casa fundadora: {v}. Fundadores: {f}.', 'The "{n}" scene is born in {c}: {why} Founding venue: {v}. Founders: {f}.')
    : l('Nasce em {c} a cena "{n}": {why} Casa fundadora: {v}.', 'The "{n}" scene is born in {c}: {why} Founding venue: {v}.'), { c: cname(o.city), n: o.name, why: o.cause, v: venueL27(v.name), f: fn });
  logSc(s, sc, t);
  st.list.push(sc);
  fact(s, sc, 'born', t, 35);
  const mk = cityById[o.city]?.market;
  if (o.src !== 'hit' && (o.city === s.config.homeCity || (mk && s.player.territories.includes(mk)))) notify(s, fmtL(l('Cena nascendo perto de você: {n} ({c}). Quem entra cedo ganha mais.', 'A scene is being born near you: {n} ({c}). Early arrivals gain the most.'), { n: o.name, c: cname(o.city) }), 'event');
  return sc;
}

const covers = (sc: Scene27, city: string, g: string) => sc.gs.includes(g) && sc.cities.some((x) => x.c === city);

function births(s: GameState, r: Rng, by: Map<string, Act[]>): void {
  const st = sc27(s);
  const living = st.list.filter(alive27);
  // 1) movimentos que nascem (culture.ts / movements9)
  for (const mv of s.movements) {
    if (st.seen[`mv:${mv.id}`] || mv.born < s.year - 1) continue;
    st.seen[`mv:${mv.id}`] = 1;
    if (Object.values(mov9(s).scene).includes(mv.id)) continue; // espelho de cena histórica: a cena histórica cobre
    const acts = mv.acts.map((id) => s.acts[id]).filter(liveAct).sort(founderSort);
    birth(s, r, { name: mv.name, genre: mv.genreId, gs: [mv.genreId, mv.parent], city: mv.city, founders: acts, src: 'movement', ref: mv.id,
      cause: fmtL(l('artistas de {p} da cidade passam a se chamar por um nome só.', 'local {p} artists start calling themselves by one name.'), { p: gname(mv.parent) }), heat: 22 });
  }
  // 2) cenas históricas que começam (datas reais)
  for (const hs of HIST_SCENES) {
    if (st.seen[`hs:${hs.id}`] || sceneStage(s, hs) !== 'rise' || s.config.startYear > hs.from + 2) continue;
    st.seen[`hs:${hs.id}`] = 1;
    const gs = hs.genres.filter((g) => genreById[g] && genreById[g].born <= s.year);
    if (!gs.length) continue;
    const acts = gs.flatMap((g) => by.get(`${hs.city}:${g}`) ?? []).sort(founderSort);
    birth(s, r, { name: hs.name, genre: gs[0], gs, city: hs.city, founders: acts, src: 'hist', ref: hs.id, cause: hs.arc[0], heat: 18 });
  }
  // 3) cena local que ferve sem nome (força alta e 3+ atos na mesma cidade × gênero)
  if (living.length < 14) {
    const cand = Object.entries(s.scenes).filter(([k, v]) => v >= 8 && (by.get(k)?.length ?? 0) >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
    for (const [k, v] of cand) {
      const [city, g] = k.split(':');
      if (!cityById[city] || !genreById[g] || genreById[g].born < s.year - 15 || living.some((sc) => covers(sc, city, g)) || st.seen[`loc:${k}:${Math.floor(s.year / 10)}`]) continue;
      if (!r.chance(0.04 + Math.min(0.06, v / 400))) continue;
      st.seen[`loc:${k}:${Math.floor(s.year / 10)}`] = 1;
      const acts = (by.get(k) ?? []).slice().sort(founderSort);
      birth(s, r, { name: fmtL(l('{g} de {c}', '{c} {g}'), { g: gname(g), c: cname(city) }), genre: g, city, founders: acts, src: 'local',
        cause: fmtL(l('{n} atos de {g} tocando nas mesmas casas criam um som com cara própria.', '{n} {g} acts playing the same venues create a sound of their own.'), { n: acts.length, g: gname(g) }) });
      break;
    }
  }
}

/** Hit do jogador (top 10) planta uma cena na cidade do ato, se ainda não há cena viva ali para o gênero. */
function hitSeeds(s: GameState, r: Rng): void {
  const st = sc27(s);
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || s.week - rel.week > 10 || rel.peak > 10 || rel.peak <= 0 || st.seen[`hit:${rel.id}`]) continue;
    st.seen[`hit:${rel.id}`] = 1;
    const a = s.acts[rel.actId];
    if (!a || !cityById[a.city] || st.list.some((sc) => alive27(sc) && covers(sc, a.city, a.genre))) continue;
    if ((s.scenes[`${a.city}:${a.genre}`] ?? 0) >= 12) continue; // a cidade já é cena forte desse som
    const sc = birth(s, r, { name: fmtL(l('{g} de {c}', '{c} {g}'), { g: gname(a.genre), c: cname(a.city) }), genre: a.genre, city: a.city, founders: [a], src: 'hit', ref: rel.id,
      cause: fmtL(l('o sucesso de "{t}" ({a}) faz a garotada da cidade montar bandas iguais.', 'the success of "{t}" ({a}) makes local kids start bands just like it.'), { t: rel.title, a: a.name }), heat: 26 });
    fact(s, sc, 'seed', fmtL(l('{a} planta uma cena em {c}: o hit "{t}" vira escola.', '{a} seeds a scene in {c}: the hit "{t}" becomes a school.'), { a: a.name, c: cname(a.city), t: rel.title }), 40, [a.id, 'player']);
  }
}

// ---------------------------------------------------------------- vida

function setPh(s: GameState, sc: Scene27, p: Ph27, t: L): void {
  sc.ph = p;
  sc.phW = s.week;
  if (p === 'peak') sc.peakY = s.year;
  logSc(s, sc, t);
}
function addWhy(sc: Scene27, k: string, v: number, t: L): void {
  sc.why ??= [];
  const x = sc.why.find((w) => w.k === k);
  if (x) { x.v += v; x.t = t; } else sc.why.push({ k, v, t });
}
/** causa dominante do declínio */
export function mainCause27(sc: Scene27): L {
  const w = [...(sc.why ?? [])].sort((a, b) => b.v - a.v)[0];
  return w && w.v >= 6 ? w.t : l('saturação: o som virou fórmula e o público cansou.', 'saturation: the sound became a formula and audiences tired of it.');
}

function lifeHist(s: GameState, sc: Scene27): void {
  const hs = HIST_SCENES.find((x) => x.id === sc.ref);
  if (!hs) return;
  const st = sceneStage(s, hs);
  const want: Ph27 = st === 'rise' ? (s.year - hs.from >= (hs.peak - hs.from) / 2 ? 'growing' : 'born') : st === 'peak' ? 'peak' : st === 'decline' ? (s.year >= hs.to - 1 ? 'fading' : 'saturated') : st === 'over' ? 'dead' : sc.ph;
  sc.heat = want === 'born' ? 25 : want === 'growing' ? 55 : want === 'peak' ? 85 : want === 'saturated' ? 50 : want === 'fading' ? 20 : 0;
  sc.sat = want === 'saturated' || want === 'fading' ? 70 : want === 'peak' ? 40 : 10;
  if (want === sc.ph) return;
  if (want === 'dead') {
    sc.died = s.year; sc.cause = hs.arc[2];
    setPh(s, sc, 'dead', fmtL(l('Fim da cena: {t}', 'The scene ends: {t}'), { t: hs.arc[2] }));
    fact(s, sc, 'dead', fmtL(l('Morre a cena {n}: {t}', 'The {n} scene dies: {t}'), { n: sc.name, t: hs.arc[2] }), 40);
    return;
  }
  const t = want === 'peak' ? hs.arc[1] : want === 'growing' ? fmtL(l('A cena {n} cresce: as casas lotam e chegam os primeiros discos.', 'The {n} scene grows: venues fill up and the first records arrive.'), { n: sc.name })
    : want === 'saturated' ? fmtL(l('{n} vira moda nacional: todo selo quer o seu.', '{n} goes national: every label wants one.'), { n: sc.name }) : hs.arc[2];
  setPh(s, sc, want, t);
  if (want === 'peak' || want === 'saturated') fact(s, sc, want, fmtL(l('{n} {p}: {t}', '{n} {p}: {t}'), { n: sc.name, p: PH27[want], t }), want === 'peak' ? 38 : 28);
}

function life(s: GameState, sc: Scene27, by: Map<string, Act[]>, nGlobal: Record<string, number>): void {
  if (sc.src === 'hist') { lifeHist(s, sc); return; }
  const n = sc.cities.reduce((t, x) => t + sc.gs.reduce((u, g) => u + (by.get(`${x.c}:${g}`)?.length ?? 0), 0), 0);
  const nc = sc.cities.length;
  const ng = sc.gs.reduce((t, g) => t + (nGlobal[g] ?? 0), 0);
  const age = months(s, sc.phW);
  // pancadas (uma vez cada)
  sc.hit ??= {};
  const club = sc.club ? s.clubs.find((c) => c.id === sc.club) : undefined;
  if (sc.club && (!club || club.closed) && !sc.hit.club) {
    sc.hit.club = 1; sc.heat -= 8;
    const t = fmtL(l('Fecha {v}, a casa onde tudo começou.', '{v}, where it all began, closes.'), { v: venueL27(sc.venue) });
    addWhy(sc, 'club', 10, t); logSc(s, sc, t);
    fact(s, sc, 'blow', fmtL(l('{n}: {t}', '{n}: {t}'), { n: sc.name, t }), 25);
  }
  const lost = sc.founders.filter((id) => !liveAct(s.acts[id]));
  if (sc.founders.length && lost.length === sc.founders.length && !sc.hit.founders) {
    sc.hit.founders = 1; sc.heat -= 10;
    const a = s.acts[lost[0]];
    const t = fmtL(a?.deceased || a?.members.every((m) => s.persons[m] && !s.persons[m].alive) ? l('Os fundadores ({a}) morreram; a cena perde a referência.', 'The founders ({a}) have died; the scene loses its compass.') : l('Os fundadores ({a}) saíram de cena.', 'The founders ({a}) have left the scene.'), { a: a?.name ?? '?' });
    addWhy(sc, 'founders', 12, t); logSc(s, sc, t);
    fact(s, sc, 'blow', fmtL(l('{n}: {t}', '{n}: {t}'), { n: sc.name, t }), 30);
  }
  // pressões contínuas
  const reg = regimeAt18(s, countryOfCity(sc.city));
  if (reg?.hard && s.year >= reg.hard[0] && s.year <= reg.hard[1]) { sc.heat -= 2; addWhy(sc, 'censor', 2, fmtL(l('a censura de {r} fecha casas e prende gente.', '{r} censorship shuts venues and jails people.'), { r: reg.name })); }
  if (w4(s).backlash.some((b) => sc.gs.includes(b.genre) && s.year >= b.from && s.year <= b.until)) { sc.heat -= 3; addWhy(sc, 'backlash', 3, l('o público virou as costas para o gênero (reação).', 'the public turned against the genre (backlash).')); }
  const cp = copies27(s, sc.genre);
  if (cp) { sc.sat += cp * 0.8; addWhy(sc, 'copy', cp * 0.8, l('selos rivais encheram o mercado de imitações.', 'rival labels flooded the market with imitations.')); }
  const inv = ((s.x4 as unknown as { scene12?: { nets?: Record<string, { health: number }> } }).scene12?.nets?.[sc.city]?.health ?? 0) / 100;
  switch (sc.ph) {
    case 'born':
      sc.heat += 1.5 + Math.min(2, n * 0.2) + inv * 1.5; sc.sat += 0.2 + nc * 0.1;
      if (sc.heat >= 35) setPh(s, sc, 'growing', fmtL(l('A cena cresce: {n} atos já tocam o som em {c} cidade(s).', 'The scene grows: {n} acts already play the sound in {c} city(ies).'), { n, c: nc }));
      else if (age >= 30 && sc.heat < 15) { sc.heat = 0; addWhy(sc, 'stillborn', 20, l('não juntou gente suficiente para virar cena.', 'never gathered enough people to become a scene.')); }
      break;
    case 'growing':
      sc.heat += 1.2 + Math.min(1.8, n * 0.15) + inv - sc.sat * 0.02; sc.sat += 0.3 + nc * 0.12;
      if (sc.heat >= 70 || age >= 48) {
        setPh(s, sc, 'peak', fmtL(l('Auge: {c} cidades, {n} atos e a imprensa inteira falando de {v}.', 'Peak: {c} cities, {n} acts and the whole press talking about {v}.'), { c: nc, n, v: venueL27(sc.venue) }));
        fact(s, sc, 'peak', fmtL(l('A cena {n} chega ao auge ({c} cidades).', 'The {n} scene reaches its peak ({c} cities).'), { n: sc.name, c: nc }), 38);
      }
      break;
    case 'peak':
      sc.heat += 0.8 + Math.min(2, n * 0.15) - sc.sat * 0.03; sc.sat += 0.6 + nc * 0.15 + Math.min(1.2, ng * 0.015);
      addWhy(sc, 'sat', 0.6, l('saturação: o som virou fórmula e o público cansou.', 'saturation: the sound became a formula and audiences tired of it.'));
      if (sc.sat >= 60 || age >= 54) {
        setPh(s, sc, 'saturated', fmtL(l('Saturação: {g} toca em todo lugar ({n} atos); quem chega agora disputa migalhas.', 'Saturation: {g} plays everywhere ({n} acts); newcomers fight for crumbs.'), { g: gname(sc.genre), n: n + ng }));
        fact(s, sc, 'saturated', fmtL(l('A cena {n} satura: imitadores demais, novidade de menos.', 'The {n} scene saturates: too many imitators, too little novelty.'), { n: sc.name }), 28);
      }
      break;
    case 'saturated':
      sc.heat -= 1 + sc.sat * 0.012; sc.sat += 0.3;
      if (sc.heat < 30) setPh(s, sc, 'fading', fmtL(l('Declínio: {w}', 'Decline: {w}'), { w: mainCause27(sc) }));
      break;
    case 'fading':
      sc.heat -= 1.6;
      break;
    default: break;
  }
  sc.heat = clamp(sc.heat, 0, 100); sc.sat = clamp(sc.sat, 0, 100);
  if (sc.ph !== 'dead' && sc.heat < 6 && (sc.ph === 'fading' || sc.ph === 'born' || sc.ph === 'saturated')) {
    sc.died = s.year; sc.cause = mainCause27(sc);
    setPh(s, sc, 'dead', fmtL(l('Morre a cena. Causa: {w}', 'The scene dies. Cause: {w}'), { w: sc.cause }));
    fact(s, sc, 'dead', fmtL(l('Morre a cena {n} ({y}–{z}). Causa: {w}', 'The {n} scene dies ({y}–{z}). Cause: {w}'), { n: sc.name, y: sc.y0, z: s.year, w: sc.cause }), 34);
  }
}

// ---------------------------------------------------------------- expansão

function spread(s: GameState, r: Rng, sc: Scene27, by: Map<string, Act[]>): void {
  const p = sc.ph === 'growing' ? 0.04 : sc.ph === 'peak' ? 0.06 : sc.ph === 'saturated' ? 0.02 : 0;
  if (!p || sc.cities.length >= 8 || !r.chance(p)) return;
  const has = new Set(sc.cities.map((x) => x.c));
  const mk0 = cityById[sc.city]?.market;
  // atos da cena (qualquer dono) e onde tocaram nos últimos 6 meses
  const acts = sc.cities.flatMap((x) => sc.gs.flatMap((g) => by.get(`${x.c}:${g}`) ?? [])).sort((a, b) => b.fame - a.fame).slice(0, 12);
  const toured = new Map<string, Act>();
  for (const a of acts) for (const c of CITIES) if (!has.has(c.id) && !toured.has(c.id)) { const w = s.flags[`played:${a.id}:${c.id}`]; if (w !== undefined && s.week - w <= 26) toured.set(c.id, a); }
  const fam = genreById[sc.genre]?.family;
  const wt = (c: (typeof CITIES)[number]): number => {
    if (has.has(c.id)) return 0;
    let w = 0;
    if (toured.has(c.id)) w += 5;
    if (c.market === mk0) w += 2;
    if (c.scenes.some((g) => sc.gs.includes(g) || genreById[g]?.family === fam)) w += 2;
    if (sc.ph === 'peak') w += 0.3;
    return w * (c.w ?? 1);
  };
  const c = r.weighted(CITIES, wt);
  if (!c) return;
  const ta = toured.get(c.id);
  const why = ta ? fmtL(l('a turnê de {a} levou o som a {c}.', '{a}\'s tour carried the sound to {c}.'), { a: ta.name, c: c.name })
    : c.market === mk0 ? fmtL(l('as rádios de {m} adotam o som.', 'radio across {m} picks up the sound.'), { m: marketById[c.market]?.name ?? l('?', '?') })
      : c.scenes.some((g) => sc.gs.includes(g) || genreById[g]?.family === fam) ? fmtL(l('a cena local de {c} já tinha afinidade com o som.', '{c}\'s local scene already had an affinity for the sound.'), { c: c.name })
        : l('a imprensa musical espalha a novidade.', 'the music press spreads the news.');
  sc.cities.push({ c: c.id, y: s.year, why });
  const t = fmtL(l('{n} chega a {c}: {w}', '{n} reaches {c}: {w}'), { n: sc.name, c: c.name, w: why });
  logSc(s, sc, t);
  fact(s, sc, 'spread', t, 26, ta ? [ta.id] : [], c.id);
}

// ---------------------------------------------------------------- jogador: entrar cedo × tarde

/** Cenas vivas que um ato do jogador pode "pegar" agora (mesmo gênero; cidade da cena ou, no auge em diante, qualquer lugar). */
export function scenesFor27(s: GameState, a: Act): Scene27[] {
  return sc27(s).list.filter((sc) => alive27(sc) && sc.gs.includes(a.genre) && (sc.cities.some((x) => x.c === a.city) || sc.ph === 'peak' || sc.ph === 'saturated'));
}
/** multiplicador de apelo de um ato do jogador numa cena (entrada × fase atual) */
export function rideMult27(s: GameState, ride: Ride27, sc: Scene27, local: boolean): number {
  if (sc.ph === 'dead') return 1;
  const early = ride.ph === 'born' || ride.ph === 'growing';
  if (early) return sc.ph === 'fading' ? 1.02 : sc.ph === 'saturated' ? 1.05 : 1.12;
  if (ride.ph === 'peak') return sc.ph === 'peak' ? 1.05 : sc.ph === 'fading' ? 0.98 : 1;
  if (!local) return 1;
  const k = sc.ph === 'fading' ? 0.9 : sc.ph === 'saturated' ? 0.93 : 1;
  return s.config.difficulty === 'easy' ? 1 - (1 - k) / 2 : k;
}
export function rideOf27(s: GameState, actId: string): { sc: Scene27; ride: Ride27; k: number }[] {
  const st = sc27(s), a = s.acts[actId];
  const out: { sc: Scene27; ride: Ride27; k: number }[] = [];
  if (!a) return out;
  for (const sc of st.list) {
    const ride = st.ride[`${actId}:${sc.id}`];
    if (ride) out.push({ sc, ride, k: rideMult27(s, ride, sc, sc.cities.some((x) => x.c === a.city)) });
  }
  return out;
}
/** prévia para a interface: quanto rende entrar AGORA numa cena */
export function entryPreview27(s: GameState, sc: Scene27): number {
  return rideMult27(s, { ph: sc.ph, w: s.week, y: s.year }, sc, true);
}

registerMod('appeal', 'scenes27', (s, v, c) => {
  const a = c.act, rel = c.release;
  if (OFF27.scenes || !a || !rel || !(rel.owner === 'player' || a.playerBand)) return null;
  const rs = rideOf27(s, a.id).filter((x) => x.sc.ph !== 'dead' && x.k !== 1);
  if (!rs.length) return null;
  const best = rs.sort((x, y) => Math.abs(y.k - 1) - Math.abs(x.k - 1))[0];
  return { value: v * best.k, label: best.k > 1 ? fmtL(l('Chegou cedo à cena {n}', 'Early to the {n} scene'), { n: best.sc.name }) : fmtL(l('Chegou tarde à cena {n} (saturada)', 'Late to the {n} scene (saturated)'), { n: best.sc.name }) };
});

registerSimHook('launch', 'scenes27', (s, _r, arg) => {
  const rel: Release | undefined = arg.release;
  const a = rel && s.acts[rel.actId];
  if (OFF27.scenes || !rel || !a || !mine(a)) return;
  const st = sc27(s);
  for (const sc of scenesFor27(s, a)) {
    const k = `${a.id}:${sc.id}`;
    if (st.ride[k]) continue;
    st.ride[k] = { ph: sc.ph, w: s.week, y: s.year };
    const local = sc.cities.some((x) => x.c === a.city);
    const m = rideMult27(s, st.ride[k], sc, local);
    const early = sc.ph === 'born' || sc.ph === 'growing';
    const t = early ? fmtL(l('{a} entra cedo na cena {n} ({p}): pioneiro, apelo ×{k} enquanto a cena viver.', '{a} gets into the {n} scene early ({p}): a pioneer, appeal ×{k} while the scene lives.'), { a: a.name, n: sc.name, p: PH27[sc.ph], k: m.toFixed(2) })
      : m < 1 ? fmtL(l('{a} chega tarde à cena {n} ({p}): saturação, apelo ×{k}.', '{a} arrives late to the {n} scene ({p}): saturation, appeal ×{k}.'), { a: a.name, n: sc.name, p: PH27[sc.ph], k: m.toFixed(2) })
        : fmtL(l('{a} entra na cena {n} já {p}.', '{a} joins the {n} scene already {p}.'), { a: a.name, n: sc.name, p: PH27[sc.ph] });
    logSc(s, sc, t);
    fact(s, sc, 'ride', t, early ? 30 : 20, [a.id, 'player'], a.city);
  }
});

// ---------------------------------------------------------------- imitadores (preenchido por rivals27: sem ciclo)
export const COPIES27: { f?: (s: GameState, genre: string) => number } = {};
const copies27 = (s: GameState, g: string) => COPIES27.f?.(s, g) ?? 0;

// ---------------------------------------------------------------- mês

export function scenes27Month(s: GameState): void {
  if (OFF27.scenes) return;
  const r = Rng.fromSeed(`${s.config.seed}|sc27|${s.year}|${s.month}`);
  const by = actsByKey(s);
  const nGlobal: Record<string, number> = {};
  for (const [k, v] of by) { const g = k.slice(k.indexOf(':') + 1); nGlobal[g] = (nGlobal[g] ?? 0) + v.length; }
  births(s, r, by);
  hitSeeds(s, r);
  const st = sc27(s);
  for (const sc of st.list) {
    if (!alive27(sc)) continue;
    life(s, sc, by, nGlobal);
    if (alive27(sc)) spread(s, r, sc, by);
    // cidades que a cena alcançou ganham força de cena enquanto ela vive (a de origem já tem a sua)
    const d = sc.ph === 'growing' ? 0.25 : sc.ph === 'peak' ? 0.35 : sc.ph === 'saturated' ? 0.1 : 0;
    if (d) for (const x of sc.cities.slice(1)) s.scenes[`${x.c}:${sc.genre}`] = (s.scenes[`${x.c}:${sc.genre}`] ?? 0) + d;
  }
  // poda: mortas há 25+ anos saem; no máximo 60 cenas guardadas
  st.list = st.list.filter((sc) => alive27(sc) || s.year - (sc.died ?? s.year) < 25);
  if (st.list.length > 60) st.list.splice(0, st.list.length - 60);
  for (const k of Object.keys(st.ride)) if (!st.list.some((sc) => k.endsWith(`:${sc.id}`))) delete st.ride[k];
}
registerSimHook('month', 'scenes27', (s) => scenes27Month(s));

// ouvinte do fato: manchete (nascimento, auge, morte, semente) e força de cena na cidade nova (expansão)
onFact('scene_life', (s, f) => {
  const tag = f.tags[1];
  if (tag === 'spread' && f.place) { const g = f.tags[2]; s.scenes[`${f.place}:${g}`] = (s.scenes[`${f.place}:${g}`] ?? 0) + 2; }
  if (tag === 'born' || tag === 'peak' || tag === 'dead' || tag === 'seed') headline19(s, f.text, tag === 'seed' ? 3 : 2);
}, 'scenes27:life');

// ---------------------------------------------------------------- leitura (interface)

export const scenes27 = (s: GameState, o: { alive?: boolean } = {}): Scene27[] => sc27(s).list.filter((sc) => !o.alive || alive27(sc)).slice().sort((a, b) => b.heat - a.heat || b.y0 - a.y0);
export const LIVE_PH27 = LIVE;

registerExplain('scene27', (s, c) => {
  const sc = sc27(s).list.find((x) => x.id === c.id);
  if (!sc) return null;
  const parts: WhyPart[] = [
    { label: l('Origem', 'Origin'), value: cname(sc.city).pt, note: fmtL(l('{y} · casa fundadora: {v}', '{y} · founding venue: {v}'), { y: sc.y0, v: venueL27(sc.venue) }) },
    { label: l('Calor (gente tocando, casas cheias)', 'Heat (people playing, full venues)'), value: Math.round(sc.heat), tone: sc.heat >= 50 ? 'good' : '' },
    { label: l('Saturação (cidades, imitadores, atos no gênero)', 'Saturation (cities, imitators, acts in the genre)'), value: Math.round(sc.sat), tone: sc.sat >= 50 ? 'bad' : '' },
    { label: l('Cidades', 'Cities'), value: sc.cities.length },
    { label: l('Entrar agora', 'Joining now'), value: entryPreview27(s, sc), fmt: 'mult', tone: entryPreview27(s, sc) >= 1 ? 'good' : 'bad' },
  ];
  for (const w of [...(sc.why ?? [])].sort((a, b) => b.v - a.v).slice(0, 3)) parts.push({ label: w.t, value: Math.round(w.v), tone: 'bad' });
  return { title: sc.name, value: PH27[sc.ph].pt, parts, note: l('Nasce → cresce → auge → satura → declina → morre. Cedo: até ×1,12 enquanto viver; tarde numa cena saturada da sua cidade: até ×0,90.', 'Born → grows → peaks → saturates → fades → dies. Early: up to ×1.12 while it lives; late in a saturated scene in your city: down to ×0.90.') };
});
