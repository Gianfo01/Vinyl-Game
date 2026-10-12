// Rodada 27 — dados novos da auditoria Masters_25: artistas que faltavam, pessoas de bastidores e músicas de lendas.
import { describe, expect, it } from 'vitest';
import { ARTISTS27, FILL27, SKIPPED27 } from '../src/data/audit27_artists';
import { EXECS27, MGRS27, PRODS27 } from '../src/data/audit27_people';
import { SONGS27 } from '../src/data/audit27_songs';
import { EXTRA_LABELS, REAL_EXECS } from '../src/data/labels10';
import { mgrById, REAL_MGRS } from '../src/data/managers14';
import { prodById, REAL_PRODS } from '../src/data/producers15';
import { REAL_ACTS } from '../src/data/realnames';
import { cityById, GENRES } from '../src/data/world';
import { ARTISTS27_FROM, REAL_ALL, REAL_BASE, realDataOf, realSongs22 } from '../src/sim/sys/realworld';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { Act } from '../src/sim/types';

const norm = (n: string) => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const ROLES = new Set(['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'dj', 'producer', 'mc', 'strings']);
const byName = (n: string) => REAL_ALL.findIndex((a) => norm(a.n) === norm(n));
const fakeAct = (n: string) => ({ catalogNo: REAL_BASE + byName(n) }) as unknown as Act;

describe('r27 artistas novos', () => {
  it('entram no fim de REAL_ALL, sem repetir nomes, e quem já existia fica de fora', () => {
    expect(ARTISTS27.length).toBe(84);
    expect(SKIPPED27.length).toBe(34);
    expect(REAL_ALL.length - ARTISTS27_FROM).toBe(ARTISTS27.length);
    for (const a of ARTISTS27) expect(REAL_ALL.indexOf(a), a.n).toBeGreaterThanOrEqual(ARTISTS27_FROM);
    for (const n of SKIPPED27) { const i = byName(n); expect(i, n).toBeGreaterThanOrEqual(0); expect(i, n).toBeLessThan(ARTISTS27_FROM); }
    const keys = REAL_ALL.map((a) => norm(a.n));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gêneros, cidades, papéis, formações e nível de base válidos', () => {
    const gs = new Set(GENRES.map((g) => g.id));
    for (const a of ARTISTS27) {
      expect(gs.has(a.g), a.n).toBe(true);
      expect(cityById[a.c], a.n).toBeTruthy();
      expect(a.z, a.n).toBe(a.t === 1 ? 1 : 2);
      if (a.m) { expect(a.m.length, a.n).toBeGreaterThanOrEqual(1); for (const m of a.m) expect(ROLES.has(m[1]), `${a.n}/${m[0]}`).toBe(true); }
      else expect(ROLES.has(a.r!), a.n).toBe(true);
      for (const [t, y] of a.al ?? []) { expect(t).not.toMatch(/\(single\)/); expect(y).toBeGreaterThanOrEqual(a.d - 1); }
    }
    const tool = REAL_ALL[byName('Tool')];
    expect(tool.t).toBe(1);
    expect(tool.m!.some((m) => m[0] === 'Maynard James Keenan')).toBe(true);
    expect(REAL_ALL[byName('Sonny Rollins')].r).toBe('horns');
  });

  it('Caracas existe e recebe Oscar D\'León', () => {
    expect(cityById.caracas?.name).toBeTruthy();
    const o = REAL_ALL[byName("Oscar D'León")];
    expect(o.c).toBe('caracas');
    expect(o.cn).toBe('VEN');
  });

  it('Jimmy Cliff: já existia; a auditoria só preenche a morte (2025)', () => {
    expect(SKIPPED27).toContain('Jimmy Cliff');
    const j = REAL_ALL[byName('Jimmy Cliff')];
    expect(j.b).toBe(1944);
    expect(j.x).toBe(2025);
    expect(REAL_ALL[byName('Roberta Flack')].x).toBe(2025);
    expect(Object.keys(FILL27).length).toBeGreaterThan(10);
  });
});

describe('r27 bastidores', () => {
  it('produtores, empresários e executivos entram nos registros reais', () => {
    expect(PRODS27.length + MGRS27.length + EXECS27.length).toBe(54);
    expect(prodById.roy_thomas_baker?.died).toBe(2025);
    expect(prodById.john_hammond?.w[0][1]).toBe('Bob Dylan');
    expect(prodById.liminha?.name).toBe('Liminha'); // já existia: não duplica
    expect(REAL_PRODS.filter((p) => p.name === 'Liminha').length).toBe(1);
    expect(mgrById.chas_chandler?.cl.some(([a]) => a.includes('Hendrix'))).toBe(true);
    expect(REAL_MGRS.filter((m) => norm(m.name) === norm('Marcos Lázaro')).length).toBe(1);
    expect(REAL_EXECS.find((x) => x.rid === 'mo_ostin')?.label).toBe('x_warner');
  });

  it('ids únicos, cidades e selos válidos', () => {
    for (const xs of [REAL_PRODS.map((p) => p.id), REAL_MGRS.map((m) => m.id), REAL_EXECS.map((x) => `${x.rid}:${x.label}`)]) expect(new Set(xs).size).toBe(xs.length);
    for (const p of [...PRODS27, ...MGRS27]) { expect(cityById[p.city], p.id).toBeTruthy(); expect(p.from).toBeLessThanOrEqual(p.to); }
    const labels = new Set(EXTRA_LABELS.map((x) => x.id));
    for (const x of EXECS27) expect(labels.has(x.label), x.rid).toBe(true);
  });

  it('clientes dos empresários são atos reais do jogo', () => {
    const acts = new Set([...REAL_ALL.map((a) => norm(a.n)), ...Object.values(REAL_ACTS).map((a) => norm(a.name))]);
    for (const m of MGRS27) for (const [a] of m.cl) expect(acts.has(norm(a)), `${m.id}: ${a}`).toBe(true);
  });
});

describe('r27 músicas das lendas', () => {
  it('341 artistas, títulos limpos e anos plausíveis', () => {
    expect(Object.keys(SONGS27).length).toBe(341);
    let n = 0;
    for (const [a, xs] of Object.entries(SONGS27)) {
      expect(byName(a) >= 0 || Object.values(REAL_ACTS).some((x) => norm(x.name) === norm(a)), a).toBe(true);
      for (const [t, y] of xs) { n++; expect(t).not.toMatch(/\(com |\(composição\)|\(álbum\)/); expect(y).toBeGreaterThanOrEqual(1890); expect(y).toBeLessThanOrEqual(2026); }
    }
    expect(n).toBeGreaterThan(1600);
  });

  it('realSongs22 devolve as músicas novas (e mescla sem repetir título)', () => {
    const sting = realSongs22(fakeAct('Sting'));
    expect(sting.some(([t, y]) => t === 'Fields of Gold' && y === 1993)).toBe(true);
    const ok = realSongs22(fakeAct('Outkast'));
    const ts = ok.map(([t]) => norm(t));
    expect(new Set(ts).size).toBe(ts.length);
    expect(ok.length).toBeGreaterThan(5);
    expect(realSongs22(fakeAct('Ney Matogrosso')).some(([t]) => t.startsWith('Rosa de Hiroshima'))).toBe(false); // é do Secos & Molhados
  });
});

describe('r27 no jogo', () => {
  it('base grande em 1996: Tool surge como banda, com integrantes reais', () => {
    const s = createGame(defaultConfig('r27', { startYear: 1996, homeCity: 'los_angeles', dbSize: 'large', realNames: true, mode: 'historic' }));
    const tool = Object.values(s.acts).find((a) => realDataOf(a)?.n === 'Tool');
    expect(tool).toBeTruthy();
    const names = tool!.members.map((id) => s.persons[id]?.name);
    expect(names).toContain('Maynard James Keenan');
    expect(names).not.toContain('Tool');
  }, 120_000);
});
