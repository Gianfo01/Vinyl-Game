// Rodada 9 — Crônica do mundo ("Lendas"): registro estruturado de fatos do mundo, independente do
// diário do selo. Lê o diário por um observador (rememberListeners) e acrescenta detectores baratos
// (estreias marcantes, obras-primas, cenas que nascem e morrem, recordes, influências, genealogia).
// Outros sistemas chamam `chron(s, ev)`; quem quer reagir a fatos usa `chronListeners()`.

import { cityById, genreById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState, MemoryEntry } from '../types';
import { fmtL, rememberListeners } from '../util';
import { allReleases17 } from '../relidx17';

export interface ChronEv {
  y: number;
  m: number;
  /** tipo do fato */
  k: string;
  t: L;
  /** importância 1..5 */
  i: number;
  /** atores: ids de atos (a…) e pessoas (p…) */
  a?: string[];
  c?: string;
  g?: string;
}
export interface ChronState {
  ev: ChronEv[];
  /** nomes de quem aparece na crônica (sobrevivem ao prune) */
  names: Record<string, string>;
  /** genealogia: pessoa → ["ato:ano", …] */
  mem: Record<string, string[]>;
  /** influências: ato → atos que o influenciaram */
  inf: Record<string, string[]>;
  /** recordes: chave → { v, id } */
  rec: Record<string, { v: number; id: string }>;
  /** cenas vivas "cidade:gênero" → ano de nascimento */
  sc: Record<string, number>;
  /** atos já anunciados como surgimento */
  seen: Record<string, 1>;
  /** fatos menores resumidos por ano (compactação) */
  old: Record<number, number>;
  /** última semana de lançamentos varrida */
  lw: number;
}

declare module '../ext4' { interface Ext4 { chron9: ChronState } }
const empty = (): ChronState => ({ ev: [], names: {}, mem: {}, inf: {}, rec: {}, sc: {}, seen: {}, old: {}, lw: 0 });
registerExt4('chron9', empty);

export function chronState(s: GameState): ChronState {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const c = (x.chron9 ??= empty()) as ChronState;
  c.ev ??= []; c.names ??= {}; c.mem ??= {}; c.inf ??= {}; c.rec ??= {}; c.sc ??= {}; c.seen ??= {}; c.old ??= {}; c.lw ??= 0;
  return c;
}

/** Ouvintes de fatos da crônica (memórias das pessoas, relíquias, boatos, canções). Função içada. */
export function chronListeners(): ((s: GameState, ev: ChronEv) => void)[] {
  const f = chronListeners as unknown as { l?: ((s: GameState, ev: ChronEv) => void)[] };
  return (f.l ??= []);
}

const MAX_EV = 1000;

/** Registra um fato do mundo. Preenche ano/mês, cidade e gênero (do primeiro ato) e guarda nomes. */
export function chron(s: GameState, ev: Omit<ChronEv, 'y' | 'm'> & { y?: number; m?: number }, quiet = false): ChronEv {
  const c = chronState(s);
  const e: ChronEv = { y: ev.y ?? s.year, m: ev.m ?? s.month, k: ev.k, t: ev.t, i: Math.max(1, Math.min(5, Math.round(ev.i))) };
  if (ev.a?.length) e.a = [...new Set(ev.a.filter(Boolean))];
  const first = e.a?.map((id) => s.acts[id]).find(Boolean);
  const cc = ev.c ?? first?.city;
  const gg = ev.g ?? first?.genre;
  if (cc) e.c = cc;
  if (gg) e.g = gg;
  for (const id of e.a ?? []) {
    const n = s.acts[id]?.name ?? s.persons[id]?.name;
    if (n) c.names[id] = n;
  }
  c.ev.push(e);
  if (c.ev.length > MAX_EV) compact(s, c);
  if (!quiet) for (const fn of chronListeners()) fn(s, e);
  return e;
}

/** Compacta: fatos pequenos antigos viram contagem por ano; o resto fica até o teto. */
function compact(s: GameState, c: ChronState): void {
  for (const [minI, age] of [[1, 8], [2, 20], [3, 45]] as const) {
    if (c.ev.length <= MAX_EV - 200) break;
    c.ev = c.ev.filter((e) => {
      if (e.i > minI || s.year - e.y < age) return true;
      c.old[e.y] = (c.old[e.y] ?? 0) + 1;
      return false;
    });
  }
  if (c.ev.length > MAX_EV) {
    const drop = c.ev.length - MAX_EV + 100;
    for (const e of c.ev.slice(0, drop)) c.old[e.y] = (c.old[e.y] ?? 0) + 1;
    c.ev = c.ev.slice(drop);
  }
  // nomes órfãos
  const used = new Set<string>();
  for (const e of c.ev) for (const id of e.a ?? []) used.add(id);
  for (const id of Object.keys(c.mem)) used.add(id);
  for (const id of Object.keys(c.names)) if (!used.has(id) && !s.acts[id] && !s.persons[id]) delete c.names[id];
}

export const nameOf = (s: GameState, id: string): string => s.acts[id]?.name ?? s.persons[id]?.name ?? chronState(s).names[id] ?? '?';
export const cityL = (id?: string): L => (id && cityById[id] ? cityById[id].name : l('?', '?'));
export const genreL = (id?: string): L => (id && genreById[id] ? genreById[id].name : l('?', '?'));

// ---------------------------------------------------------------- diário → crônica

/** Tipos do diário que viram fatos do mundo (importância base). Os demais são vida interna do selo. */
export const KIND_IMP: Record<string, number> = {
  death: 4, split: 3, supergroup: 4, solo: 3, number1: 2, award: 3, award2: 2, nat_award: 2, hall_of_fame: 4, legend: 4,
  label_founded: 3, label_closed: 3, label_new: 2, genre_born: 4, revival: 3, movement: 4, reunion: 3, comeback: 3,
  lineup: 2, member_quits: 2, breakdown: 3, rehab: 2, retired: 2, social8: 2, tribute: 3, tech: 2, recession: 3, recovery: 2,
  strike: 2, legendary_show: 3, liveaid: 4, mega_event: 4, merger: 3, acquisition: 3, scandal: 2, addiction: 2, posthumous: 3,
  hologram: 2, documentary: 2, festival: 1, festival8: 1, fest_founded: 3, divergence: 3, new_era: 3, genre_shift: 2,
  rediscovery: 2, breakup_song: 2, era_scandal: 2, voice_scandal: 3, ai_award: 3, censored: 2, lawsuit: 2,
  verdict: 2, club_closed: 2, magazine_cover: 1, viral: 1, viral8: 1, feature: 1, cert: 1,
  heir: 2, succession: 3, dynasty_end: 3, ending: 4, start: 3, owner_family: 1, injury: 2, tour_accident: 3, stage_incident: 2,
};

rememberListeners().push((s: GameState, e: MemoryEntry) => {
  const base = KIND_IMP[e.kind];
  if (!base) return;
  const actors: string[] = [];
  if (e.actId) actors.push(e.actId);
  if (e.kind === 'death' && e.actId) {
    const a = s.acts[e.actId];
    for (const pid of a?.members ?? []) {
      const p = s.persons[pid];
      if (p && !p.alive && p.died === s.year) actors.push(pid);
    }
  }
  const a = e.actId ? s.acts[e.actId] : undefined;
  let i = base + (e.important && base >= 3 ? 1 : 0);
  if (a && (a.legend || a.fame > 60) && base >= 2) i += 1;
  if (e.kind === 'number1' && a && a.number1s > 1) i = 2;
  if (a && a.fame < 10 && !a.catalogNo && a.owner !== 'player') i -= 1;
  chron(s, { k: e.kind, t: e.text, i, a: actors });
});

// ---------------------------------------------------------------- detectores

const notable = (a: Act): boolean => a.fame >= 20 || !!a.catalogNo || a.owner === 'player' || !!a.playerBand || a.hits > 0 || a.legend;
const alive = (a: Act) => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';

/** Genealogia: registra a passagem de cada pessoa por atos notáveis. */
function trackMembers(s: GameState, c: ChronState): void {
  for (const a of Object.values(s.acts)) {
    if (!alive(a) || !notable(a)) continue;
    for (const pid of a.members) {
      const list = (c.mem[pid] ??= []);
      const last = list[list.length - 1];
      if (!last || last.split(':')[0] !== a.id) {
        if (list.some((x) => x.split(':')[0] === a.id)) continue;
        list.push(`${a.id}:${s.year}`);
        c.names[pid] = s.persons[pid]?.name ?? c.names[pid];
        c.names[a.id] = a.name;
        if (list.length > 1) {
          const prev = list[list.length - 2].split(':')[0];
          chron(s, { k: 'move', i: a.fame > 40 ? 3 : 2, a: [a.id, pid, prev], t: fmtL(l('{p} (ex-{b}) entra em {a}.', '{p} (formerly of {b}) joins {a}.'), { p: nameOf(s, pid), b: nameOf(s, prev), a: a.name }) });
        }
      }
    }
  }
  // limpa genealogia de anônimos que sumiram
  const ids = Object.keys(c.mem);
  if (ids.length > 2500) for (const id of ids) if (!s.persons[id] && c.mem[id].length < 2) delete c.mem[id];
}

/** Estreias marcantes e influências (quando o ato chega à fama ou ao primeiro hit). */
function debuts(s: GameState, c: ChronState): void {
  for (const a of Object.values(s.acts)) {
    if (c.seen[a.id] || !alive(a)) continue;
    if (a.fame < 28 && a.hits === 0) continue;
    c.seen[a.id] = 1;
    chron(s, { k: 'rise', i: a.fame > 45 ? 3 : 2, a: [a.id], t: fmtL(l('{a} desponta em {c} ({g}), formado em {y}.', '{a} breaks through in {c} ({g}), formed in {y}.'), { a: a.name, c: cityL(a.city), g: genreL(a.genre), y: a.formed }) });
    pickInfluence(s, c, a);
  }
}

function pickInfluence(s: GameState, c: ChronState, a: Act, silent = false): void {
  if (c.inf[a.id]) return;
  const fam = genreById[a.genre]?.family;
  let best: Act | undefined;
  let bestScore = 0;
  for (const b of Object.values(s.acts)) {
    if (b === a || b.formed > a.formed - 4 || (b.genre !== a.genre && genreById[b.genre]?.family !== fam)) continue;
    const sc = b.fame + b.hits * 4 + (b.legend ? 40 : 0) + (b.city === a.city ? 15 : 0) + ((a.id.charCodeAt(a.id.length - 1) * 7 + b.id.length * 13) % 20);
    if (sc > bestScore && (b.legend || b.hits > 0 || b.fame > 35)) { best = b; bestScore = sc; }
  }
  if (!best) return;
  c.inf[a.id] = [best.id];
  c.names[best.id] = best.name;
  if (!silent && a.fame > 40 && best.fame > 40) chron(s, { k: 'influence', i: 2, a: [a.id, best.id], t: fmtL(l('{a} cita {b} como influência.', '{a} names {b} as an influence.'), { a: a.name, b: best.name }) }, true);
}

/** Obras-primas: lançamentos de terceiros (ou seus) com crítica altíssima. */
function landmarkReleases(s: GameState, c: ChronState): void {
  for (const r of allReleases17(s)) {
    if (r.week <= c.lw || r.hist) continue;
    const a = s.acts[r.actId];
    if (!a) continue;
    if ((r.critic ?? 0) >= 88 && r.type !== 'single') chron(s, { k: 'masterwork', i: 3 + ((r.critic ?? 0) >= 94 ? 1 : 0), a: [a.id], t: fmtL(l('"{t}", de {a}, é aclamado como obra-prima (crítica {c}).', '"{t}" by {a} is hailed as a masterpiece (critics {c}).'), { t: r.title, a: a.name, c: Math.round(r.critic ?? 0) }) });
  }
  c.lw = s.week;
}

/** Cenas: nascem quando uma cidade junta artistas de um gênero e público; morrem quando esvaziam. */
function scenesYear(s: GameState, c: ChronState): void {
  const score: Record<string, number> = {};
  for (const a of Object.values(s.acts)) if (alive(a) && a.fame >= 8) score[`${a.city}:${a.genre}`] = (score[`${a.city}:${a.genre}`] ?? 0) + 1 + a.fame / 60;
  for (const [k, v] of Object.entries(s.scenes)) if (v > 0.5) score[k] = (score[k] ?? 0) + v / 6;
  let born = 0;
  for (const [k, v] of Object.entries(score).sort((a, b) => b[1] - a[1])) {
    if (v >= 7 && c.sc[k] === undefined && Object.keys(c.sc).length < 60 && born < 3) {
      born++;
      c.sc[k] = s.year;
      const [city, g] = k.split(':');
      chron(s, { k: 'scene_born', i: 3, c: city, g, t: fmtL(l('Nasce a cena de {g} em {c}.', 'The {g} scene is born in {c}.'), { g: genreL(g), c: cityL(city) }) });
    }
  }
  for (const [k, y] of Object.entries(c.sc)) {
    if ((score[k] ?? 0) < 2.5 && s.year - y >= 3) {
      delete c.sc[k];
      const [city, g] = k.split(':');
      chron(s, { k: 'scene_died', i: 3, c: city, g, t: fmtL(l('A cena de {g} em {c} se apaga, depois de {n} anos.', 'The {g} scene in {c} fades out after {n} years.'), { g: genreL(g), c: cityL(city), n: s.year - y }) });
    }
  }
}

/** Recordes de carreira (números 1, prêmios, hits). */
function records(s: GameState, c: ChronState): void {
  const RECS: { k: string; f: (a: Act) => number; txt: L }[] = [
    { k: 'n1', f: (a) => a.number1s, txt: l('{a} bate o recorde de números 1: {v}.', '{a} breaks the record for number ones: {v}.') },
    { k: 'aw', f: (a) => a.awards, txt: l('{a} se torna o ato mais premiado da história: {v} prêmios.', '{a} becomes the most awarded act ever: {v} awards.') },
    { k: 'hits', f: (a) => a.hits, txt: l('{a} soma {v} hits no top 10, um recorde.', '{a} racks up {v} top-10 hits, a record.') },
  ];
  for (const R of RECS) {
    let top: Act | undefined;
    for (const a of Object.values(s.acts)) if (!top || R.f(a) > R.f(top)) top = a;
    if (!top) continue;
    const v = R.f(top);
    const cur = c.rec[R.k];
    if (v >= 3 && (!cur || v > cur.v)) {
      if (cur && cur.id !== top.id) chron(s, { k: 'record', i: 4, a: [top.id, cur.id], t: fmtL(R.txt, { a: top.name, v }) });
      c.rec[R.k] = { v, id: top.id };
      c.names[top.id] = top.name;
    }
  }
}

// o mundo inicial já existe: quem já é famoso não "desponta" no primeiro mês
registerSimHook('newgame', 'chron9', (s) => {
  const c = chronState(s);
  for (const a of Object.values(s.acts)) if (a.fame >= 28 || a.hits > 0) { c.seen[a.id] = 1; if (!c.inf[a.id]) pickInfluence(s, c, a, true); }
});

registerSimHook('month', 'chron9', (s) => {
  const c = chronState(s);
  trackMembers(s, c);
  debuts(s, c);
  landmarkReleases(s, c);
});
registerSimHook('year', 'chron9', (s) => {
  const c = chronState(s);
  scenesYear(s, c);
  records(s, c);
});

// ---------------------------------------------------------------- consultas

export interface ChronFilter { y0?: number; y1?: number; city?: string; genre?: string; who?: string; minI?: number; kinds?: string[] }

export function chronQuery(s: GameState, f: ChronFilter = {}): ChronEv[] {
  return chronState(s).ev.filter((e) =>
    (f.y0 === undefined || e.y >= f.y0) && (f.y1 === undefined || e.y <= f.y1) && (!f.city || e.c === f.city) && (!f.genre || e.g === f.genre) &&
    (!f.who || e.a?.includes(f.who)) && (!f.minI || e.i >= f.minI) && (!f.kinds || f.kinds.includes(e.k)));
}

/** Biografia: fatos de uma pessoa (e dos atos por onde passou, nos anos em que estava lá). */
export function biography(s: GameState, id: string): ChronEv[] {
  const c = chronState(s);
  if (s.acts[id] || id.startsWith('a')) return chronQuery(s, { who: id });
  const stints = (c.mem[id] ?? []).map((x) => { const [a, y] = x.split(':'); return { a, y: Number(y) }; });
  const out = c.ev.filter((e) => {
    if (e.a?.includes(id)) return true;
    for (let i = 0; i < stints.length; i++) {
      const st = stints[i];
      const end = stints[i + 1]?.y ?? 9999;
      if (e.a?.[0] === st.a && e.y >= st.y && e.y <= end && e.i >= 2) return true;
    }
    return false;
  });
  return out;
}

/** Genealogia de um ato: quem passou por ele e por onde andou antes/depois. */
export function genealogy(s: GameState, actId: string): { pid: string; name: string; path: { a: string; name: string; y: number }[] }[] {
  const c = chronState(s);
  const out: ReturnType<typeof genealogy> = [];
  for (const [pid, list] of Object.entries(c.mem)) {
    if (!list.some((x) => x.split(':')[0] === actId)) continue;
    out.push({ pid, name: nameOf(s, pid), path: list.map((x) => { const [a, y] = x.split(':'); return { a, name: nameOf(s, a), y: Number(y) }; }) });
  }
  const a = s.acts[actId];
  for (const pid of a?.members ?? []) if (!out.some((x) => x.pid === pid)) out.push({ pid, name: nameOf(s, pid), path: [{ a: actId, name: a!.name, y: a!.formed }] });
  return out;
}

/** Influências em duas direções: quem influenciou o ato e quem ele influenciou. */
export function influences(s: GameState, actId: string): { from: string[]; to: string[] } {
  const c = chronState(s);
  const to = Object.entries(c.inf).filter(([, v]) => v.includes(actId)).map(([k]) => k);
  return { from: c.inf[actId] ?? [], to };
}

/** Atos e pessoas que mais aparecem na crônica (peso = importância). */
export function definingFigures(s: GameState, n = 12, y0?: number, y1?: number): { id: string; score: number }[] {
  const sc: Record<string, number> = {};
  for (const e of chronQuery(s, { y0, y1 })) for (const id of e.a ?? []) if (id.startsWith('a') || s.acts[id]) sc[id] = (sc[id] ?? 0) + e.i * e.i;
  return Object.entries(sc).map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score).slice(0, n);
}
