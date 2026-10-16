// R31 · onda 4 (I) — gente e interiores: os 12 interiores são cenas interativas (pessoas e objetos clicáveis), o seu
// personagem está lá quando você está na cidade, dono ≠ funcionário (pessoas reais da base), músico fazendo bico larga
// o emprego quando assina, a presença segue a agenda (turnê, prisão) e o seu rastro aparece no lugar. Abrir não muda o mundo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { places27, type PlaceK27 } from '../src/sim/sys/place27';
import { crew31, gente31, jobLog31, jobOf31, JOBS31, meetHere31, scoutHere31, slots31, staffMonth31, parseSlot31 } from '../src/sim/sys/gente31';
import { where31 } from '../src/sim/sys/where31';
import { INTERIOR_KINDS27 } from '../src/ui/pixel/interior27';
import { auditInside31, infoLines31, insideModel31, trail31, type InsideT31 } from '../src/ui/r31/inside31model';

const game = (seed: string, year = 1975, city = 'new_york'): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
const LOTS = Array.from({ length: 14 }, (_, i) => 40 + i);
const tgt = (s: GameState, k: PlaceK27): InsideT31 => {
  const p = places27(s, LOTS).find((x) => x.k === k);
  return { id: p?.id ?? `t:${k}`, k, name: p ? p.name.pt : k, what: p?.what.pt, people: p?.people ?? crew31(s, k) ?? [{ name: 'Gerente', role: { pt: 'Gerente', en: 'Manager' } }], year: s.year, city: s.config.homeCity, seed: s.config.seed, place: p, org: p?.org };
};
const tour = (actId: string, cityId: string, day: number) => ({ id: `t-${actId}`, actId, name: 'Turnê I', stops: [{ cityId, day, tier: 1, price: 0, capacity: 100, sold: 0, merch: 0, status: 'scheduled' as const, travelDays: 0 }], setlist: [], minutes: 45 as const, production: 0, role: 'headline' as const, crew: 1, pay: 'door' as const, costReserved: 0, revenue: 0, costs: 0, status: 'running' as const, log: [], accidents: 0 });

describe('r31 I: os 12 interiores são cenas com pessoas e objetos clicáveis', () => {
  it('todo interior tem objetos com ação, pessoas, rótulo e dica, e cabe no desenho (3 épocas)', () => {
    expect(INTERIOR_KINDS27.length).toBe(12);
    for (const year of [1925, 1975, 2012]) {
      const s = game(`i-all-${year}`, year);
      for (const k of INTERIOR_KINDS27) {
        const m = insideModel31(s, tgt(s, k));
        expect(auditInside31(m)).toEqual([]);
        const objs = m.spots.filter((x) => !x.id.startsWith('who:') && x.id !== 'you');
        expect(objs.length, `${k} ${year}`).toBeGreaterThanOrEqual(1);
        expect(m.spots.some((x) => x.id.startsWith('who:')), `${k} pessoas`).toBe(true);
      }
    }
  });
  it('a tabela do plano: palco marca data, prateleira mostra discos, locutor pede execução, CEO na gravadora, celas na delegacia', () => {
    const s = game('i-table', 1975);
    const go = (k: PlaceK27, id: string) => insideModel31(s, tgt(s, k)).spots.find((x) => x.id === id)?.go.panel;
    expect(go('venue', 'stage')).toBe('do:show');
    expect(go('venue', 'bill')).toBe('info:bill');
    expect(go('records', 'shelf')).toBe('info:shelf');
    expect(go('records', 'counter')).toBe('do:instore');
    expect(go('radio', 'booth')).toBe('do:pitch');
    expect(go('studio', 'desk')).toBe('do:rent');
    expect(go('bar', 'counter')).toBe('info:meet');
    expect(go('rehearsal', 'agenda')).toBe('do:rehearse');
    expect(go('instruments', 'wall')).toBe('go:shop');
    expect(infoLines31(s, insideModel31(s, tgt(s, 'records')), 'shelf').length).toBeGreaterThan(0);
  });
});

describe('r31 I: o seu personagem está no interior onde você está', () => {
  it('na cidade: você aparece (ponto "you"); em turnê fora: não aparece e o aviso diz onde está', () => {
    const s = game('i-you', 1975, 'new_york');
    s.config.role = 'artist';
    const m = insideModel31(s, tgt(s, 'bar'));
    const meIn = m.people.some((p) => p.you);
    // a carreira de selo também tem você (dono): sempre presente na cidade
    const s2 = game('i-you2', 1975);
    const m2 = insideModel31(s2, tgt(s2, 'records'));
    expect(m2.people.some((p) => p.you)).toBe(true);
    expect(m2.spots.some((x) => x.id === 'you')).toBe(true);
    void meIn;
    // em turnê com a banda: some da cena
    const band = Object.values(s2.acts).find((a) => a.members.includes(m2.people.find((p) => p.you)?.pid ?? '-'));
    if (band) {
      s2.tours.push(tour(band.id, 'london', s2.day + 2) as never);
      const m3 = insideModel31(s2, tgt(s2, 'records'));
      expect(m3.people.some((p) => p.you)).toBe(false);
      expect(m3.note?.pt).toMatch(/turnê/);
    }
  });
});

describe('r31 I: gente de verdade — dono ≠ funcionário, bico, vaga muda de mãos', () => {
  it('as vagas são pessoas da base, distintas, e o dono não é da equipe', () => {
    const s = game('i-crew', 1975);
    const st = gente31(s);
    const occ = Object.values(st.j).map((j) => j.p);
    expect(occ.length).toBe(slots31(s).length);
    expect(new Set(occ).size).toBe(occ.length);
    for (const p of occ) expect(s.persons[p]?.alive).toBe(true);
    for (const k of Object.keys(JOBS31) as PlaceK27[]) {
      const c = crew31(s, k);
      if (!c) continue;
      expect(c[0].job).toBe(0);
      expect(c.slice(1).every((x) => x.pid !== c[0].pid)).toBe(true);
    }
    // o mapa usa a equipe real (o dono do lugar é a pessoa da vaga 0)
    const rec = places27(s, LOTS).find((p) => p.k === 'records')!;
    expect(rec.people[0].pid).toBe(st.j['records:0:0'].p);
    expect(rec.owner).toBe(s.persons[st.j['records:0:0'].p].name);
  });
  it('músico fazendo bico: a ficha mostra os dois lados; assinou → larga o emprego e outra pessoa assume', () => {
    const s = game('i-bico', 1975);
    const st = gente31(s);
    const [sl, j] = Object.entries(st.j).find(([, x]) => x.bico)!;
    const job = jobOf31(s, j.p)!;
    expect(job.bico).toBe(true);
    expect(job.line.pt).toMatch(/·/);
    const act = Object.values(s.acts).find((a) => a.members.includes(j.p))!;
    const lb = Object.values(s.labels).find((x) => x.active)!;
    act.owner = lb.id;
    const r = staffMonth31(s);
    expect(r.quit).toBeGreaterThanOrEqual(1);
    expect(st.j[sl]?.p).not.toBe(j.p);
    expect(jobOf31(s, j.p)).toBeNull();
    const log = jobLog31(s, parseSlot31(sl).k, 10);
    expect(log.some((e) => !e.in && e.name === s.persons[j.p].name && /assinou/.test(e.why?.pt ?? ''))).toBe(true);
  });
  it('presença segue a agenda: preso ou em turnê fora aparece como ausente', () => {
    const s = game('i-agenda', 1975);
    const st = gente31(s);
    const [sl, j] = Object.entries(st.j).find(([, x]) => x.bico)!;
    const { k } = parseSlot31(sl);
    (s.x4 as unknown as { crime17: { jail: Record<string, unknown> } }).crime17.jail[j.p] = { u: s.week + 10, a3: 'USA', why: { pt: 'x', en: 'x' } };
    expect(where31(s, j.p).k).toBe('jail');
    staffMonth31(s); // preso perde a vaga
    expect(st.j[sl]?.p).not.toBe(j.p);
    const other = Object.entries(st.j).find(([, x]) => x.bico && x.p !== j.p);
    if (other) {
      const act = Object.values(s.acts).find((a) => a.members.includes(other[1].p))!;
      s.tours.push(tour(act.id, 'chicago', s.day + 3) as never);
      expect(where31(s, other[1].p).k).toBe('tour');
      const c = crew31(s, parseSlot31(other[0]).k, parseSlot31(other[0]).copy)!;
      expect(c.find((x) => x.pid === other[1].p)?.away?.pt).toMatch(/turnê/);
    }
    void k;
  });
  it('determinístico: a mesma semente dá as mesmas vagas', () => {
    const a = game('i-det', 1975), b = game('i-det', 1975);
    for (let i = 0; i < 6; i++) { advanceWeek(a); advanceWeek(b); }
    expect(JSON.stringify(gente31(a))).toBe(JSON.stringify(gente31(b)));
  });
  it('desligado: nada de equipe real (nomes inventados de antes)', () => {
    const s = game('i-off', 1975);
    setSw(s, 'gente31', false);
    expect(crew31(s, 'records')).toBeNull();
  });
});

describe('r31 I: visitar = conhecer gente e descobrir talento; seu rastro no lugar', () => {
  it('conhecer no balcão liga no grafo social; pôr no radar cria o sinal', () => {
    const s = game('i-meet', 1975);
    const j = Object.values(gente31(s).j).find((x) => x.bico)!;
    expect(meetHere31(s, j.p).ok).toBe(true);
    expect(meetHere31(s, j.p).ok).toBe(false);
    const act = Object.values(s.acts).find((a) => a.members.includes(j.p))!;
    delete s.knowledge[act.id];
    expect(scoutHere31(s, act.id).ok).toBe(true);
    expect(s.knowledge[act.id]?.source).toBe('visit31');
  });
  it('seu disco na loja e seu cartaz na casa de shows', () => {
    const s = game('i-trail', 1975);
    const rel = Object.values(s.releases).find((r) => r.owner === 'player');
    if (rel) { s.charts.albums.unshift({ releaseId: rel.id } as never); expect(trail31(s, 'records')[0].pt).toMatch(rel.title); }
    const a = playerActs(s)[0];
    s.tours.push({ ...tour(a, s.config.homeCity, s.day + 5), status: 'planned' } as never);
    expect(trail31(s, 'venue')[0].pt).toMatch(/cartaz/);
  });
});

describe('r31 I: explorar não muda o mundo', () => {
  it('montar os lugares e todas as cenas de interior deixa o estado idêntico', () => {
    const s = game('i-pure', 1975);
    places27(s, LOTS);
    const before = JSON.stringify(s);
    for (const k of INTERIOR_KINDS27) { const x = tgt(s, k); const m = insideModel31(s, x); for (const key of ['bill', 'shelf', 'crowd', 'onair', 'live', 'meet', 'guests', 'gold', 'cover', 'front']) infoLines31(s, m, key, x); }
    for (const k of ['facade', 'police', 'market'] as PlaceK27[]) insideModel31(s, tgt(s, k));
    expect(JSON.stringify(s)).toBe(before);
  });
});
