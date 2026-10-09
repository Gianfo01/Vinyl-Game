// Rodada 9 — o mundo antes e depois da run: história prévia gerada (0/10/20/40 anos de bandas, hits,
// lendas, separações, mortes, selos e cenas antes do ano inicial, numa passada leve só de NPCs),
// mundo persistente (exportar o mundo no fim da run e começar outra nele N anos depois, com os seus
// artistas virando lendas ou esquecidos) e o livro "história da partida" em texto.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { actLang, makeAct, songTitle } from '../people';
import type { Act, GameState } from '../types';
import { fmtL } from '../util';
import { aliveGenres, spawnProceduralAct } from '../worldgen';
import { chron, chronQuery, chronState, cityL, definingFigures, genreL, nameOf, type ChronEv } from './chron9';
import { addRelic, relics, type Relic } from './relics9';

export interface WorldAct { id: string; n: string; g: string; c: string; f: number; y0: number; y1: number; n1: number; aw: number; hits: number; leg: boolean; pl?: 1; m: string[] }
export interface WorldFile { v: 1; seed: string; year: number; company: string; ev: ChronEv[]; names: Record<string, string>; acts: WorldAct[]; relics: Relic[]; inf: Record<string, string[]> }

declare module '../types' {
  interface RunConfig {
    /** rodada 9: anos de história prévia gerada (0/10/20/40) */
    prehist?: number;
    /** rodada 9: mundo salvo de outra run (consumido no início) */
    world9?: WorldFile;
  }
}

// ---------------------------------------------------------------- história prévia

const LABEL_WORDS = ['Crown', 'Silverline', 'Harbor', 'Blue Comet', 'Gramercy', 'Northstar', 'Velvet', 'Ironside', 'Paloma', 'Saturn', 'Cedar', 'Monarch'];

/** Passada leve só de NPCs: cria a geração anterior e escreve a crônica desses anos. */
export function generatePrehistory(s: GameState, r: Rng, years: number): void {
  const Y = s.year;
  const c = chronState(s);
  const made: Act[] = [];
  const ev = (y: number, k: string, i: number, t: L, a: string[] = [], extra: Partial<ChronEv> = {}) => chron(s, { y, m: r.int(0, 11), k, i, t, a, ...extra }, true);
  for (let y = Y - years; y < Y; y++) {
    if (r.chance(0.22)) ev(y, 'label_founded', 2, fmtL(l('{n} é fundada.', '{n} is founded.'), { n: `${r.pick(LABEL_WORDS)} Records` }));
    const n = aliveGenres(s, y).length ? r.int(1, 3) : 0;
    for (let k = 0; k < n; k++) {
      const a = spawnProceduralAct(s, r, { formedYear: y, fame: 0 });
      a.debutYear = y;
      a.formed = y - r.int(0, 1);
      const peak = clamp(r.normal(a.potential - 12, 18), 0, 96);
      const end = y + r.int(3, 26);
      c.seen[a.id] = 1;
      if (peak >= 40) ev(y + 1, 'rise', peak > 65 ? 3 : 2, fmtL(l('{a} desponta em {c} ({g}).', '{a} breaks through in {c} ({g}).'), { a: a.name, c: cityL(a.city), g: genreL(a.genre) }), [a.id]);
      const inf = made.filter((b) => (b.genre === a.genre && b.legend) || (b.hits > 2 && b.city === a.city));
      if (inf.length && peak >= 40) { const b = r.pick(inf); c.inf[a.id] = [b.id]; ev(y + 1, 'influence', 2, fmtL(l('{a} cita {b} como influência.', '{a} names {b} as an influence.'), { a: a.name, b: b.name }), [a.id, b.id]); }
      if (peak > 55) {
        a.hits = r.int(1, Math.max(1, Math.round(peak / 12)));
        a.peakChart = peak > 70 ? 1 : r.int(2, 10);
        if (peak > 70) {
          a.number1s = r.int(1, 3);
          for (let i = 0; i < a.number1s; i++) ev(Math.min(Y - 1, y + r.int(1, 5)), 'number1', 3, fmtL(l('"{t}" de {a} chega ao #1.', '"{t}" by {a} hits #1.'), { t: songTitle(r, actLang(a)), a: a.name }), [a.id]);
        }
        if (peak > 76) { a.awards = r.int(1, 3); ev(Math.min(Y - 1, y + r.int(2, 6)), 'award', 3, fmtL(l('{a} leva o Gramófono de Ouro.', '{a} wins the Golden Gramophone.'), { a: a.name }), [a.id]); }
      }
      if (end < Y) {
        a.status = r.chance(0.5) && a.members.length > 1 ? 'split' : 'retired';
        a.careerEnd = end;
        a.fame = clamp(peak * 0.5, 0, 100);
        if (peak > 82 && end < Y - 3) {
          a.legend = true;
          ev(end, 'legend', 4, fmtL(l('{a} vira lenda.', '{a} becomes a legend.'), { a: a.name }), [a.id]);
          addRelic(s, 'guitar', fmtL(l('A guitarra de {p}', '{p}\'s guitar'), { p: nameOf(s, a.members[0]) }), a.id, a.members[0], 40000 + peak * 2500, end);
        }
        if (peak >= 40) ev(end, a.status === 'split' ? 'split' : 'retired', peak > 60 ? 3 : 2, a.status === 'split' ? fmtL(l('{a} se separa.', '{a} splits up.'), { a: a.name }) : fmtL(l('{a} se aposenta.', '{a} retires.'), { a: a.name }), [a.id]);
        if (a.members.length > 1 && peak > 60 && r.chance(0.35)) ev(end, 'solo', 2, fmtL(l('{p} deixa {a} e segue solo.', '{p} leaves {a} and goes solo.'), { p: nameOf(s, a.members[0]), a: a.name }), [a.id, a.members[0]]);
      } else {
        a.status = 'active';
        a.fame = clamp(peak * 0.8, 0, 100);
        a.momentum = r.float(25, 60);
        const f = Math.pow(10, 2 + a.fame / 22);
        a.fans = { casual: Math.round(f), active: Math.round(f * 0.2), core: Math.round(f * 0.04) };
      }
      // mortes da geração antiga
      for (const pid of a.members) {
        const p = s.persons[pid];
        if (!p || Y - p.born < 45 || !r.chance(0.12 + (Y - p.born - 45) * 0.01)) continue;
        const dy = Math.max(y + 2, Y - r.int(1, years));
        if (dy >= Y) continue;
        p.alive = false;
        p.died = dy;
        if (peak >= 45) ev(dy, 'death', peak > 70 ? 4 : 3, fmtL(l('Morre {p} ({a}), aos {n} anos.', '{p} ({a}) dies at {n}.'), { p: p.name, a: a.name, n: dy - p.born }), [a.id, pid]);
      }
      // genealogia
      for (const pid of a.members) (c.mem[pid] ??= []).push(`${a.id}:${a.formed}`);
      if (peak < 35 && a.status !== 'active') {
        for (const pid of a.members) { delete s.persons[pid]; delete c.mem[pid]; }
        delete s.acts[a.id];
        continue;
      }
      for (const pid of a.members) c.names[pid] = nameOf(s, pid);
      c.names[a.id] = a.name;
      made.push(a);
    }
    if (y % 10 === 0 && made.length) {
      const top = made.slice().sort((a, b) => b.fame - a.fame)[0];
      const k = `${top.city}:${top.genre}`;
      if (c.sc[k] === undefined) { c.sc[k] = y; ev(y, 'scene_born', 3, fmtL(l('Nasce a cena de {g} em {c}.', 'The {g} scene is born in {c}.'), { g: genreL(top.genre), c: cityL(top.city) }), [], { c: top.city, g: top.genre }); }
    }
  }
  c.ev.sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m));
  chron(s, { k: 'prehistory', i: 2, t: fmtL(l('A crônica guarda {n} anos de história antes de {y}.', 'The chronicle holds {n} years of history before {y}.'), { n: years, y: Y }) }, true);
}

// ---------------------------------------------------------------- mundo persistente

export function exportWorld(s: GameState): WorldFile {
  const c = chronState(s);
  const score = (a: Act) => a.fame + a.hits * 5 + a.number1s * 10 + a.awards * 8 + (a.legend ? 40 : 0);
  const acts = Object.values(s.acts)
    .filter((a) => a.legend || a.hits >= 2 || a.number1s > 0 || a.awards > 0 || ((a.owner === 'player' || a.playerBand) && a.releases.length > 0))
    .sort((a, b) => score(b) - score(a)).slice(0, 80)
    .map((a): WorldAct => ({ id: a.id, n: a.name, g: a.genre, c: a.city, f: Math.round(a.fame), y0: a.formed, y1: a.status === 'active' || a.status === 'emerging' ? s.year : a.careerEnd, n1: a.number1s, aw: a.awards, hits: a.hits, leg: a.legend, pl: a.owner === 'player' || a.playerBand ? 1 : undefined, m: a.members.map((id) => nameOf(s, id)) }));
  const ev = c.ev.filter((e) => e.i >= 3).slice(-600);
  const names: Record<string, string> = {};
  for (const e of ev) for (const id of e.a ?? []) names[id] = nameOf(s, id);
  return { v: 1, seed: s.config.seed, year: s.year, company: s.config.companyName, ev, names, acts, relics: relics(s).list.filter((x) => x.st !== 'lost'), inf: c.inf };
}

/** Importa um mundo salvo no começo de uma run nova. */
export function importWorld(s: GameState, r: Rng, w: WorldFile): void {
  if (!w || w.v !== 1) return;
  const c = chronState(s);
  const map: Record<string, string> = {};
  for (const wa of w.acts) {
    const a = makeAct(s, r, { genre: wa.g, city: wa.c, members: Math.max(1, Math.min(6, wa.m.length || 1)), potential: 60, formed: wa.y0, debutYear: wa.y0, fame: wa.f });
    a.name = wa.n;
    a.members.forEach((pid, i) => {
      const p = s.persons[pid];
      if (wa.m[i]) p.name = wa.m[i];
      p.born = wa.y0 - r.int(18, 26);
      if (s.year - p.born > 78) { p.alive = false; p.died = Math.min(s.year - 1, p.born + r.int(60, 85)); }
      c.names[pid] = p.name;
      (c.mem[pid] ??= []).push(`${a.id}:${wa.y0}`);
    });
    a.status = 'retired';
    a.careerEnd = Math.min(wa.y1, s.year - 1);
    a.hits = wa.hits; a.number1s = wa.n1; a.awards = wa.aw;
    a.peakChart = wa.n1 ? 1 : wa.hits ? 5 : 40;
    const gap = s.year - wa.y1;
    if (wa.pl) {
      const remembered = wa.f > 40 || wa.n1 > 0 || wa.aw > 0;
      a.legend = remembered;
      a.fame = clamp(remembered ? wa.f * 0.8 : wa.f * 0.25, 0, 100);
      chron(s, { y: s.year, m: 0, k: remembered ? 'legend' : 'forgotten', i: remembered ? 4 : 2, a: [a.id], t: remembered ? fmtL(l('{n} anos depois, {a} ({c}) é lembrado como lenda.', '{n} years on, {a} ({c}) is remembered as a legend.'), { n: gap, a: a.name, c: w.company }) : fmtL(l('{n} anos depois, quase ninguém se lembra de {a}.', '{n} years on, hardly anyone remembers {a}.'), { n: gap, a: a.name }) }, true);
    } else {
      a.legend = wa.leg;
      a.fame = clamp(wa.f * 0.7, 0, 100);
    }
    c.seen[a.id] = 1;
    c.names[a.id] = a.name;
    map[wa.id] = a.id;
  }
  const remap = (id: string) => map[id] ?? `w${id}`;
  for (const [id, n] of Object.entries(w.names)) c.names[remap(id)] = n;
  const old = w.ev.map((e) => ({ ...e, a: e.a?.map(remap) }));
  c.ev = [...old, ...c.ev].sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m));
  for (const [k, v] of Object.entries(w.inf ?? {})) if (map[k]) c.inf[map[k]] = v.map(remap);
  for (const rl of w.relics ?? []) relics(s).list.push({ ...rl, a: rl.a ? remap(rl.a) : undefined, p: undefined, st: rl.st === 'player' ? 'kept' : rl.st, own: rl.st === 'player' ? [...rl.own, [`${w.company} (acervo)`, w.year, 'herança']] : rl.own });
  chron(s, { k: 'new_world', i: 5, t: fmtL(l('Uma nova história começa no mundo de {c}, {n} anos depois.', 'A new story begins in {c}\'s world, {n} years later.'), { c: w.company, n: s.year - w.year }) }, true);
}

registerSimHook('newgame', 'world9', (s, r) => {
  const w = s.config.world9;
  if (w) { importWorld(s, r, w); delete s.config.world9; }
  const n = s.config.prehist ?? 0;
  if (n > 0) generatePrehistory(s, r, Math.min(60, n));
});

// ---------------------------------------------------------------- livro da partida

const KIND_TRAGEDY = new Set(['death', 'breakdown', 'split', 'tour_accident', 'addiction', 'trance_denied', 'scene_died', 'label_closed']);

export function bookText(s: GameState, lang: 'pt' | 'en' = 'pt'): string {
  const T = (x: L) => x[lang];
  const c = chronState(s);
  const ev = c.ev;
  const y0 = ev[0]?.y ?? s.config.startYear;
  const out: string[] = [];
  const H = (x: string) => { out.push('', x.toUpperCase(), '='.repeat(Math.min(60, x.length))); };
  out.push(T(fmtL(l('CRÔNICA DO MUNDO — {a} a {b}', 'CHRONICLE OF THE WORLD — {a} to {b}'), { a: y0, b: s.year })));
  out.push(T(fmtL(l('Uma história de {c}, semente {s}.', 'A story of {c}, seed {s}.'), { c: s.config.companyName, s: s.config.seed })));
  H(T(l('Parte I — As eras', 'Part I — The eras')));
  for (let d = Math.floor(y0 / 10) * 10; d <= s.year; d += 10) {
    const list = chronQuery(s, { y0: d, y1: d + 9, minI: 3 }).sort((a, b) => b.i - a.i).slice(0, 8).sort((a, b) => a.y - b.y);
    if (!list.length) continue;
    out.push('', T(fmtL(l('Anos {d}', 'The {d}s'), { d })));
    for (const e of list) out.push(`  ${e.y} — ${T(e.t)}`);
  }
  H(T(l('Parte II — Artistas que definiram a época', 'Part II — Artists who defined the age')));
  for (const f of definingFigures(s, 10)) {
    const a = s.acts[f.id];
    out.push('', `* ${nameOf(s, f.id)}${a ? ` (${T(genreL(a.genre))}, ${T(cityL(a.city))}, ${a.formed})` : ''}`);
    if (a) out.push(`  ${T(fmtL(l('{n} números 1, {h} hits, {w} prêmios{lg}.', '{n} number ones, {h} hits, {w} awards{lg}.'), { n: a.number1s, h: a.hits, w: a.awards, lg: a.legend ? l(' — lenda', ' — legend') : '' }))}`);
    for (const e of chronQuery(s, { who: f.id, minI: 3 }).slice(-4)) out.push(`  ${e.y}: ${T(e.t)}`);
  }
  H(T(l('Parte III — Tragédias', 'Part III — Tragedies')));
  for (const e of ev.filter((x) => KIND_TRAGEDY.has(x.k) && x.i >= 3).slice(-25)) out.push(`  ${e.y} — ${T(e.t)}`);
  H(T(l('Parte IV — Cenas e cidades', 'Part IV — Scenes and cities')));
  for (const e of ev.filter((x) => x.k === 'scene_born' || x.k === 'scene_died' || x.k === 'movement').slice(-25)) out.push(`  ${e.y} — ${T(e.t)}`);
  H(T(l('Parte V — Recordes, canções e relíquias', 'Part V — Records, songs and relics')));
  for (const e of ev.filter((x) => x.k === 'record' || x.k.startsWith('song_')).slice(-15)) out.push(`  ${e.y} — ${T(e.t)}`);
  for (const rl of relics(s).list.slice(-15)) out.push(`  ${T(rl.n)} — ${rl.own.map((o) => `${o[0]} (${o[1]})`).join(' → ')}`);
  const old = Object.values(c.old).reduce((t, x) => t + x, 0);
  out.push('', T(fmtL(l('— Fim. ({n} fatos registrados, {o} fatos menores resumidos.)', '— The end. ({n} recorded facts, {o} minor facts summarized.)'), { n: ev.length, o: old })));
  return out.join('\n');
}
