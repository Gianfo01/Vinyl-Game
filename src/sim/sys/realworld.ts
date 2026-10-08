// Artistas reais em massa (rodada 7): ~640 nomes dos EUA, Reino Unido, Itália, Brasil e do mundo, além
// dos 100 do catálogo, surgindo perto do ano real de estreia, com integrantes reais (entradas e saídas),
// discografia anterior ao início da run, fim de carreira, voltas e, opcionalmente, mortes nos anos reais.
//
// - Nomes reais ligados (RunConfig.realNames): nomes, integrantes e títulos reais.
// - Nomes ficcionais: os mesmos arquétipos entram com nomes gerados e discos com títulos inventados.
// - Modo histórico segue as datas reais; Livre e Caos embaralham alguns anos.
//
// Também gera a discografia simulada dos atos procedurais que já existiam no início (item 12).

import { clamp, type Rng } from '../../core/rng';
import { CATALOG_ACTS } from '../../data/catalog';
import { REAL_CLASSIC, type ClassicExtra } from '../../data/realacts_classic';
import { REAL_EU } from '../../data/realacts_eu';
import { REAL_US } from '../../data/realacts_us';
import { REAL_WORLD } from '../../data/realacts_world';
import { REAL_ACTS } from '../../data/realnames';
import type { RealArtist, RealMember, RealRelease } from '../../data/realtypes';
import { CITIES, cityById, familyOf, l } from '../../data/world';
import { personDies } from '../dynasty';
import { computeAppeal } from '../market';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, makeAct, makePerson, songTitle } from '../people';
import type { Act, GameState, Person, Release } from '../types';
import { fmtL, nextId, remember } from '../util';
import { addSignal, signToBestRival } from '../worldgen';

export const REAL_ALL: RealArtist[] = [...REAL_US, ...REAL_EU, ...REAL_WORLD];
/** catalogNo dos novos artistas reais: 1000 + índice em REAL_ALL. */
export const REAL_BASE = 1000;

type Sched = { year: number; kind: 'join' | 'leave' | 'reunion' | 'fate' | 'release'; actId: string; personId?: string; m?: RealMember; until?: number; rel?: RealRelease };

export interface RwState {
  upcoming: number[];
  sched: Sched[];
  done: Record<string, 1>;
  /** ex-integrantes por ato (para a página e a aba de inativos) */
  former: Record<string, { personId: string; year: number; reason: 'left' | 'died' | 'retired' | 'fired' }[]>;
}

declare module '../ext4' { interface Ext4 { rw: RwState } }
registerExt4('rw', () => ({ upcoming: [], sched: [], done: {}, former: {} }));
export const rw = (s: GameState): RwState => (s as unknown as { x4: { rw: RwState } }).x4.rw;

/** Dados reais de um ato (lista nova ou catálogo clássico). */
export function realDataOf(act: Act): (RealArtist | (ClassicExtra & { n: string; t: 1 | 2 | 3 })) | undefined {
  const no = act.catalogNo;
  if (!no) return undefined;
  if (no >= REAL_BASE) return REAL_ALL[no - REAL_BASE];
  const ex = REAL_CLASSIC[no];
  return ex ? { ...ex, n: REAL_ACTS[no]?.name ?? act.name, t: 1 } : undefined;
}

const jitter = (s: GameState, r: Rng, n: number) => (s.config.mode === 'historic' ? 0 : s.config.mode === 'free' ? r.int(-n, n) : r.int(-n * 3, n * 3));
const WEEKS = 52.18;
const weekOfYear = (s: GameState, year: number, r: Rng) => Math.round((year - s.config.startYear) * WEEKS) + r.int(0, 44);

// ---------------------------------------------------------------- discografia

/** Unidades aproximadas de um disco antigo conforme o porte do artista e a era. */
function histUnits(r: Rng, tier: number, year: number, type: Release['type']): number {
  const era = year < 1950 ? 0.25 : year < 1960 ? 0.5 : year < 1990 ? 1 : year < 2005 ? 1.2 : 0.8;
  const base = tier === 1 ? r.float(1.5e6, 9e6) : tier === 2 ? r.float(2e5, 1.6e6) : r.float(2e4, 2.5e5);
  return Math.round(base * era * (type === 'single' ? 0.6 : 1));
}

function histPeak(r: Rng, tier: number): number {
  return tier === 1 ? r.int(1, 8) : tier === 2 ? r.int(1, 30) : r.int(6, 60);
}

/** Cria um lançamento anterior à run (sem mercado ativo; entra no catálogo e na história). */
export function seedRelease(s: GameState, r: Rng, act: Act, o: { title: string; year: number; type: Release['type']; tier: number; owner?: string; live?: boolean }): Release {
  const units = o.live ? 0 : histUnits(r, o.tier, o.year, o.type);
  const peak = o.live ? 999 : histPeak(r, o.tier);
  const q = clamp(r.normal(o.tier === 1 ? 74 : o.tier === 2 ? 64 : 55, 7), 30, 97);
  // discos antigos guardam só os números (save leve); lançamentos ao vivo ganham a faixa principal
  let songId = '';
  if (o.live) {
    songId = nextId(s, 'so');
    s.songs[songId] = {
      id: songId, actId: act.id, title: o.title, genre: act.genre, writers: act.members.slice(0, 2),
      melody: q + r.normal(0, 6), lyrics: q + r.normal(0, 6), performance: q + r.normal(0, 5), production: q + r.normal(0, 6), originality: q + r.normal(0, 8), q,
      recorded: true, createdWeek: s.week - 8,
    };
  }
  const rel: Release = {
    id: nextId(s, 'r'), actId: act.id, owner: o.owner ?? act.owner ?? 'indie', type: o.type, title: o.title, songs: songId ? [songId] : [],
    week: weekOfYear(s, o.year, r), year: o.year, q, appeal: 0, formats: [], stock: Infinity, pressed: 0, marketing: [], marketingE: 0,
    territories: [cityById[act.city]?.market ?? 'na'], weekly: [], totalUnits: units, revenue: 0, peak, weeksOnChart: Math.round(peak < 10 ? r.int(10, 40) : r.int(2, 14)),
    lastPos: 0, coverSeed: r.int(1, 2 ** 30), shortage: 0, live: !!o.live, hist: !o.live,
  };
  if (o.live) rel.week = s.week;
  if (songId) s.songs[songId].releaseId = rel.id;
  if (units >= 10e6) rel.certified = 'diamond';
  else if (units >= 1e6) rel.certified = 'platinum';
  else if (units >= 5e5) rel.certified = 'gold';
  s.releases[rel.id] = rel;
  act.releases.push(rel.id);
  if (songId) act.songs.push(songId);
  act.lastRelease = Math.max(act.lastRelease, rel.week);
  if (o.live) return rel;
  if (peak <= 10) act.hits += 1;
  if (peak === 1) act.number1s += 1;
  act.peakChart = Math.min(act.peakChart, peak);
  return rel;
}

/** Discografia simulada para quem já tinha carreira (atos gerados e o jogador). */
export function simulateDiscography(s: GameState, r: Rng, act: Act, fromYear: number, toYear: number, tier: number): void {
  const lang = langForCity(act.city, r);
  let y = fromYear;
  while (y < toYear) {
    const type: Release['type'] = y < 1958 ? 'single' : r.chance(0.55) ? 'lp' : r.chance(0.5) ? 'ep' : 'single';
    seedRelease(s, r, act, { title: songTitle(r, lang), year: y, type, tier });
    y += r.int(1, 3);
  }
}

// ---------------------------------------------------------------- criação

function makeRealPerson(s: GameState, r: Rng, act: Act, m: { name: string; role: Person['role']; born?: number; died?: number }, potential: number, real: boolean): Person {
  const lang = langForCity(act.city, r);
  const p = makePerson(s, r, { lang, role: m.role, potential, born: m.born ?? act.formed - r.int(18, 26), startFrac: 0.66, name: real ? m.name : undefined });
  s.persons[p.id] = p;
  if (m.died !== undefined && m.died <= s.year) p.alive = false;
  return p;
}

const potentialFor = (r: Rng, tier: number) => (tier === 1 ? r.int(90, 99) : tier === 2 ? r.int(80, 93) : r.int(68, 84));

/** Aplica os dados reais a um ato já criado (integrantes, nascimento, fim, voltas, discografia). */
function decorate(s: GameState, r: Rng, act: Act, d: { n: string; t: number; d?: number; e?: number; rj?: [number, number?][]; b?: number; x?: number; r?: Person['role']; m?: RealMember[]; al?: RealRelease[] }): void {
  const st = rw(s);
  if (st.done[act.id]) return;
  st.done[act.id] = 1;
  const real = !!s.config.realNames;
  const fates = !!s.config.realFates && s.config.mode === 'historic';
  const debut = act.debutYear;
  const shift = d.d !== undefined ? debut - d.d : 0; // deslocamento (modos livre/caos)
  if (real) act.name = d.n;
  // integrantes
  if (d.m?.length) {
    const now: string[] = [];
    const old = act.members.map((id) => s.persons[id]).filter(Boolean);
    d.m.forEach((m, i) => {
      const [name, role, born, died, joined, left] = m;
      const join = joined !== undefined ? joined + shift : undefined;
      const leave = left !== undefined ? left + shift : undefined;
      const reuse = old[i] && (join === undefined || join <= debut) ? old[i] : undefined;
      let p: Person;
      if (reuse) {
        p = reuse;
        if (real) p.name = name;
        p.role = role;
        if (born) p.born = born;
      } else if (join !== undefined && join > s.year) {
        st.sched.push({ year: join, kind: 'join', actId: act.id, m });
        return;
      } else {
        p = makeRealPerson(s, r, act, { name, role, born, died }, act.potential, real);
      }
      if (died !== undefined && died <= s.year) p.alive = false;
      else if (died !== undefined && fates) st.sched.push({ year: died, kind: 'fate', actId: act.id, personId: p.id });
      if (leave !== undefined && leave <= s.year) {
        (st.former[act.id] ??= []).push({ personId: p.id, year: leave, reason: 'left' });
      } else {
        now.push(p.id);
        if (leave !== undefined && s.config.mode !== 'chaos') st.sched.push({ year: leave, kind: 'leave', actId: act.id, personId: p.id });
      }
    });
    // integrantes gerados que sobraram saem do ato
    for (const p of old) if (!now.includes(p.id) && !(st.former[act.id] ?? []).some((x) => x.personId === p.id)) delete s.persons[p.id];
    if (now.length) act.members = now;
    act.leaderId = act.members[0];
  } else {
    const p = s.persons[act.members[0]];
    if (p) {
      if (real) p.name = d.n;
      if (d.b) p.born = d.b;
      if (d.r) p.role = d.r;
      if (d.x !== undefined && d.x <= s.year) p.alive = false;
      else if (d.x !== undefined && fates) st.sched.push({ year: d.x, kind: 'fate', actId: act.id, personId: p.id });
    }
  }
  // fim de carreira e voltas
  if (d.e !== undefined) act.careerEnd = d.e + shift + (s.config.mode === 'historic' ? 0 : jitter(s, r, 2));
  else act.careerEnd = Math.max(act.careerEnd, 2026 + r.int(0, 14));
  for (const [a, b] of d.rj ?? []) st.sched.push({ year: a + shift, kind: 'reunion', actId: act.id, until: b !== undefined ? b + shift : undefined });
  // discografia: o que já saiu vira catálogo; o resto sai no ano certo (se o ato não for do jogador)
  for (const rel of d.al ?? []) {
    const year = rel[1] + shift;
    const title = real ? rel[0] : songTitle(r, langForCity(act.city, r));
    if (year < s.year || (year === s.year && s.month > 0)) seedRelease(s, r, act, { title, year, type: rel[2] ?? 'lp', tier: d.t });
    else st.sched.push({ year, kind: 'release', actId: act.id, rel: [title, year, rel[2]] });
  }
  // todo mundo morto antes da run: o ato é parte da história
  if (act.members.length && act.members.every((id) => !s.persons[id]?.alive)) {
    act.status = 'retired';
    act.deceased = true;
  }
}

function membersAtDebut(a: RealArtist): number {
  if (!a.m?.length) return 1;
  return Math.max(1, a.m.filter((m) => m[4] === undefined || m[4] <= a.d).length);
}

function spawnReal(s: GameState, r: Rng, idx: number, startOfRun: boolean): Act | undefined {
  const a = REAL_ALL[idx];
  if (!a || !cityById[a.c]) return undefined;
  const debut = a.d;
  void startOfRun;
  const pot = potentialFor(r, a.t);
  const act = makeAct(s, r, {
    name: s.config.realNames ? a.n : undefined, genre: a.g, city: a.c, members: membersAtDebut(a), potential: pot,
    formed: debut - 1, debutYear: debut, catalogNo: REAL_BASE + idx, fame: r.float(0.5, 3), startFrac: r.float(0.58, 0.7),
  });
  return act;
}

function activeYearsFame(r: Rng, tier: number, years: number): number {
  const top = tier === 1 ? r.float(55, 88) : tier === 2 ? r.float(32, 62) : r.float(14, 38);
  return clamp(top * Math.min(1, 0.35 + years / 10), 4, 92);
}

function setFans(act: Act): void {
  const f = Math.pow(10, 2 + act.fame / 22);
  act.fans = { casual: Math.round(f), active: Math.round(f * 0.2), core: Math.round(f * 0.04) };
}

function newgame(s: GameState, r: Rng): void {
  const st = rw(s);
  const y0 = s.config.startYear;
  const mode = s.config.mode;
  // catálogo clássico: decora os que existem; quem já terminou antes da run vira história (modo real)
  const byNo = new Map(Object.values(s.acts).filter((a) => a.catalogNo && a.catalogNo < REAL_BASE).map((a) => [a.catalogNo!, a]));
  const upcomingNos = new Set(s.upcoming.map((u) => u.no));
  for (const [noStr, ex] of Object.entries(REAL_CLASSIC)) {
    const no = Number(noStr);
    const act = byNo.get(no);
    const d = { ...ex, n: REAL_ACTS[no]?.name ?? '', t: 1 };
    if (act) {
      if (s.config.realNames) decorate(s, r, act, d);
      continue;
    }
    if (upcomingNos.has(no) || !s.config.realNames || ex.d === undefined || ex.d > y0) continue;
    // terminou antes do início: entra aposentado/separado, com catálogo
    const real = REAL_ACTS[no];
    const memberCount = Math.max(1, (ex.m ?? []).filter((m) => m[4] === undefined || m[4] <= ex.d!).length);
    const ca = makeAct(s, r, { name: real?.name, genre: 'pop', city: s.config.homeCity, members: memberCount, potential: potentialFor(r, 1), formed: ex.d - 1, debutYear: ex.d, catalogNo: no, fame: 0 });
    fixClassicGenre(s, ca, no);
    decorate(s, r, ca, d);
    ca.status = ca.deceased ? 'retired' : (ex.m?.length ?? 0) > 1 ? 'split' : 'retired';
    ca.fame = clamp(45 + r.float(0, 30) - (y0 - (ex.e ?? y0)) / 3, 15, 85);
    setFans(ca);
    ca.legend = true;
  }
  // artistas reais novos
  for (let i = 0; i < REAL_ALL.length; i++) {
    const a = REAL_ALL[i];
    if (mode === 'chaos' && r.chance(0.25)) continue;
    if (mode === 'free' && r.chance(0.08)) continue;
    const debut = a.d + jitter(s, r, 2);
    if (debut > y0) { st.upcoming.push(i); continue; }
    const end = a.e;
    const reunionNow = (a.rj ?? []).some(([x, y]) => x <= y0 && (y === undefined || y >= y0));
    const act = spawnReal(s, r, i, true);
    if (!act) continue;
    act.debutYear = debut;
    act.formed = debut - 1;
    decorate(s, r, act, a);
    const years = y0 - debut;
    if (end !== undefined && end < y0 && !reunionNow) {
      // já encerrou: catálogo e lenda (fica na aba de inativos)
      if (!act.deceased) act.status = (a.m?.length ?? 0) > 1 ? 'split' : 'retired';
      act.fame = clamp(activeYearsFame(r, a.t, end - debut) - (y0 - end) / 2, 5, 80);
      setFans(act);
      if (a.t === 1) act.legend = true;
      continue;
    }
    if (act.status === 'retired') continue;
    act.status = 'active';
    act.fame = activeYearsFame(r, a.t, years);
    act.momentum = r.float(35, 75);
    act.positioning = r.float(35, 85);
    setFans(act);
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p) continue;
      for (const k of Object.keys(p.skills) as (keyof typeof p.skills)[]) p.skills[k] = Math.min(p.potential, p.skills[k] + Math.min(20, years * 2));
    }
    if (!(a.al ?? []).length && years >= 1) simulateDiscography(s, r, act, debut, y0, a.t);
    if (act.fame > 12 || r.chance(0.5)) signToBestRival(s, r, act);
  }
  // atos gerados ativos no início ganham discografia simulada
  for (const act of Object.values(s.acts)) {
    if (act.catalogNo || act.owner === 'player' || act.playerBand || act.releases.length) continue;
    const years = y0 - act.formed;
    if (years < 2 || act.fame < 6) continue;
    simulateDiscography(s, r, act, Math.max(act.formed + 1, y0 - 12), y0, act.fame > 40 ? 2 : 3);
  }
  // catálogo clássico ativo também ganha os discos que faltam (modo ficcional)
  for (const act of Object.values(s.acts)) {
    if (!act.catalogNo || act.catalogNo >= REAL_BASE || act.releases.length || act.status !== 'active') continue;
    simulateDiscography(s, r, act, act.debutYear, y0, 1);
  }
}

/** Gênero e cidade do catálogo clássico (para quem foi criado fora do caminho normal). */
function fixClassicGenre(s: GameState, act: Act, no: number): void {
  void s;
  const def = CATALOG_LOOKUP()[no];
  if (def) {
    act.genre = def.genre;
    act.city = def.city;
  }
}

let catalogCache: Record<number, { genre: string; city: string }> | null = null;
function CATALOG_LOOKUP(): Record<number, { genre: string; city: string }> {
  if (!catalogCache) {
    catalogCache = {};
    for (const c of CATALOG_ACTS) catalogCache[c.no] = { genre: c.genre, city: c.city };
  }
  return catalogCache;
}

// ---------------------------------------------------------------- mês a mês

function monthly(s: GameState, r: Rng): void {
  const st = rw(s);
  // surgem os artistas reais do ano (um ano antes da estreia, como promessa de cena)
  if (st.upcoming.length) {
    const keep: number[] = [];
    for (const i of st.upcoming) {
      const a = REAL_ALL[i];
      if (!a || s.year < a.d - 1 || (s.year === a.d - 1 && s.month < 6)) { keep.push(i); continue; }
      const act = spawnReal(s, r, i, false);
      if (!act) continue;
      decorate(s, r, act, a);
      if (s.config.role !== 'artist' && (s.player.territories.includes(CITIES.find((c) => c.id === a.c)?.market ?? 'na') || r.chance(a.t === 1 ? 0.6 : 0.25))) addSignal(s, r, act.id, 'scene');
    }
    st.upcoming = keep;
  }
  // catálogo clássico que acabou de surgir
  if (s.config.realNames) {
    for (const act of Object.values(s.acts)) {
      if (!act.catalogNo || act.catalogNo >= REAL_BASE || st.done[act.id]) continue;
      const ex = REAL_CLASSIC[act.catalogNo];
      if (ex) decorate(s, r, act, { ...ex, n: REAL_ACTS[act.catalogNo]?.name ?? act.name, t: 1 });
      else st.done[act.id] = 1;
    }
  }
  // agenda histórica
  if (!st.sched.length) return;
  const due = st.sched.filter((x) => x.year <= s.year);
  if (!due.length) return;
  st.sched = st.sched.filter((x) => x.year > s.year);
  for (const ev of due) {
    const act = s.acts[ev.actId];
    if (!act) continue;
    if (ev.kind === 'join' && ev.m && act.status !== 'retired' && act.status !== 'split' && act.owner !== 'player') {
      const [name, role, born, died] = ev.m;
      const p = makeRealPerson(s, r, act, { name, role, born, died }, act.potential, !!s.config.realNames);
      act.members.push(p.id);
      remember(s, 'lineup', fmtL(l('{p} entra em {a}.', '{p} joins {a}.'), { p: p.name, a: act.name }), { actId: act.id, important: act.fame > 30 });
    } else if (ev.kind === 'leave' && ev.personId && act.owner !== 'player' && act.members.includes(ev.personId) && act.members.length > 1) {
      act.members = act.members.filter((x) => x !== ev.personId);
      (st.former[act.id] ??= []).push({ personId: ev.personId, year: s.year, reason: 'left' });
      const p = s.persons[ev.personId];
      remember(s, 'lineup', fmtL(l('{p} deixa {a}.', '{p} leaves {a}.'), { p: p?.name ?? '?', a: act.name }), { actId: act.id, important: act.fame > 30 });
    } else if (ev.kind === 'reunion' && (act.status === 'retired' || act.status === 'split') && !act.deceased && act.owner !== 'player') {
      const alive = act.members.filter((id) => s.persons[id]?.alive);
      if (!alive.length) continue;
      act.status = 'active';
      act.momentum = clamp(act.momentum + 40, 0, 100);
      act.careerEnd = ev.until ?? s.year + r.int(2, 6);
      remember(s, 'reunion', fmtL(l('{a} se reúne para uma volta histórica.', '{a} reunites for a historic comeback.'), { a: act.name }), { actId: act.id, important: true });
    } else if (ev.kind === 'fate' && ev.personId) {
      const p = s.persons[ev.personId];
      if (p?.alive && r.chance(0.85)) {
        if (Object.values(s.acts).some((a) => a.members.includes(p.id))) personDies(s, p, l('no mesmo ano da vida real', 'in the same year as in real life'));
        else {
          p.alive = false;
          remember(s, 'death', fmtL(l('Morre {p}, ex-integrante de {a}, aos {age} anos.', '{p}, former member of {a}, dies at {age}.'), { p: p.name, a: act.name, age: s.year - p.born }), { actId: act.id, important: act.fame > 30 });
        }
      }
      else if (p?.alive) st.sched.push({ ...ev, year: s.year + 1 });
    } else if (ev.kind === 'release' && ev.rel && act.owner !== 'player' && !act.playerBand && (act.status === 'active' || act.status === 'emerging')) {
      // disco real no ano real: entra no mercado como lançamento de terceiros
      const rel = seedRelease(s, r, act, { title: ev.rel[0], year: s.year, type: ev.rel[2] ?? 'lp', tier: realDataOf(act)?.t ?? 2, live: true });
      rel.weeksOnChart = 0;
      rel.territories = act.owner && s.labels[act.owner] ? s.labels[act.owner].territories : rel.territories;
      rel.appeal = computeAppeal(s, r, rel, act).appeal;
      act.lastRelease = s.week;
      act.momentum = clamp(act.momentum + 12, 0, 100);
    }
  }
}

registerSimHook('newgame', 'realworld', (s, r) => newgame(s, r));
registerSimHook('month', 'realworld', (s, r) => monthly(s, r));

/** Família do gênero (exposta para a interface). */
export const realFamily = (a: RealArtist) => familyOf(a.g);
