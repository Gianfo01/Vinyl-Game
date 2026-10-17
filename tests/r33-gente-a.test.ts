// R33 · GENTE33 parte A — poucos casos, sem jogo longo: nada muda sem o jogador agir; contratado, cada papel mexe no
// que diz (diretor de filial: relatório e ações regionais; riscos com semente; CEO assume a delegação; conselho vota;
// equipe pessoal mexe em segurança/saúde).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { rngSnapshot19 } from '../src/sim/rng19';
import { modeOf31 } from '../src/sim/deleg31';
import { ownerOf } from '../src/sim/sys/people/owner';
import { capital } from '../src/sim/sys/capital';
import { vida33 } from '../src/sim/r33/vida33';
import { card5 } from '../src/ui/r31/acoes5model';
import { attnQueue } from '../src/sim/attention';
import { gente31, staffMonth31 } from '../src/sim/sys/gente31';
import { leaders } from '../src/sim/sys/leaders10';
import { opinionOf } from '../src/sim/opinion';
import { spawnProceduralAct } from '../src/sim/worldgen';
import { rng19 } from '../src/sim/rng19';
import type { GameState } from '../src/sim/types';
import {
  GENTE33, adoptFixed33, defect33, fireBranchDir33, light33, board33, boardMeeting33, branchMonth33, branchRisks33, cands33, ceo33, crew33, dirOf33, fireCeo33, fixed33,
  gente33Month, hireBranchDir33, hireCeo33, hireCrew33, peek33, seatBoard33, setBranchLine33,
} from '../src/sim/r33/gente33';

const mk = (seed: string, year = 1975): GameState => createGame(defaultConfig(seed, { startYear: year }));
/** Selo com filial aberta (sem passar pelas travas de sede/caixa) e dinheiro de sobra. */
function withBranch(seed: string): { s: GameState; br: string; city: string } {
  const s = mk(seed);
  s.player.cash += 50_000_000_00;
  s.player.hq = 3;
  const city = Object.keys((s as unknown as { acts: Record<string, { city: string }> }).acts).map((id) => s.acts[id].city).find((c) => c !== s.config.homeCity)!;
  s.branches.push({ id: 'brT', city, level: 0, name: 'Filial T', opened: s.week });
  // talento na cidade da filial para o garimpo
  for (let i = 0; i < 4; i++) spawnProceduralAct(s, rng19(s, 'act'), { city });
  return { s, br: 'brT', city };
}

describe('R33 GENTE33 parte A', () => {
  it('nada muda sem o jogador agir: sem estado, o mês não sorteia nem grava', () => {
    const a = mk('g33a'), b = mk('g33a');
    expect(peek33(a)).toBeUndefined();
    const snap = rngSnapshot19(a);
    gente33Month(a);
    expect(peek33(a)).toBeUndefined();
    expect(rngSnapshot19(a)).toBe(snap);
    advanceMonth(a); advanceMonth(b);
    expect(peek33(a)).toBeUndefined();
    expect(a.player.cash).toBe(b.player.cash);
    // cartões só leem
    card5(a, 'mesareuniao'); card5(a, 'mapaparede'); card5(a, 'garagem');
    expect(peek33(a)).toBeUndefined();
  });

  it('diretor de filial: pessoa real, relatório mensal e ações regionais (garimpo, shows)', () => {
    const { s, br, city } = withBranch('g33b');
    const cs = cands33(s, { city });
    expect(cs.length).toBeGreaterThan(0);
    for (const c of cs) expect(c.n).not.toMatch(/Fossati/);
    expect(hireBranchDir33(s, br, undefined, { line: 'bold' })).toBeNull();
    const d = dirOf33(s, br)!;
    expect(d.n).toBe(cs[0].n);
    const known = Object.keys(s.knowledge).length;
    const last = branchMonth33(s, br)!;
    expect(last.sc).toBeGreaterThan(0);
    expect(Object.keys(s.knowledge).length).toBeGreaterThan(known);
    expect(Object.values(s.knowledge).some((k) => k.source === 'branch33')).toBe(true);
    // artista do selo na filial ganha show e divulgação
    const a = Object.values(s.acts).find((x) => x.city === city && x.owner === 'player') ?? (() => {
      const x = Object.values(s.acts).find((y) => y.city === city && y.owner === null && !y.catalogNo && y.status !== 'retired' && y.status !== 'split')!;
      x.owner = 'player'; return x;
    })();
    s.branchOf[a.id] = br;
    a.gigSat = 0; for (const m of a.members) if (s.persons[m]) s.persons[m].fatigue = 0;
    const fans = a.fans.casual;
    s.week += 4;
    expect(branchMonth33(s, br)!.sh).toBeGreaterThan(0);
    expect(a.fans.casual).toBeGreaterThan(fans);
    // relatório na caixa pelo mês do motor
    s.week += 4;
    gente33Month(s);
    expect(attnQueue(s, { folded: true, done: true }).some((x) => (x as { k18?: string }).k18 === 'g33_br')).toBe(true);
    expect(setBranchLine33(s, br, 'safe', 1000)).toBeNull();
  });

  it('riscos acontecem com semente (rival rouba, sai com elenco, desvio, briga)', () => {
    const seen = new Set<string>();
    GENTE33.risk = 40;
    try {
      for (let i = 0; i < 12 && seen.size < 2; i++) {
        const { s, br } = withBranch(`g33r${i}`);
        expect(hireBranchDir33(s, br)).toBeNull();
        const d = dirOf33(s, br)!;
        d.amb = 90; d.loy = 20; d.fric = 80; d.line = d.style === 'careful' ? 'bold' : 'safe';
        for (let m = 0; m < 6 && dirOf33(s, br); m++) { s.week += 4; const r = branchRisks33(s, br); if (r) seen.add(r); }
      }
    } finally { GENTE33.risk = 1; }
    expect(seen.size).toBeGreaterThan(1);
    expect([...seen].some((x) => ['poach', 'defect', 'skim', 'caught', 'clash'].includes(x))).toBe(true);
    // mesma semente, mesmo desfecho (sorteio próprio)
    const run = () => { GENTE33.risk = 40; try { const { s, br } = withBranch('g33same'); hireBranchDir33(s, br); const d = dirOf33(s, br)!; d.amb = 90; d.loy = 20; d.fric = 80; s.week += 4; return branchRisks33(s, br); } finally { GENTE33.risk = 1; } };
    expect(run()).toBe(run());
    // sair levando o elenco regional: abre selo e leva os artistas da filial
    const { s, br, city } = withBranch('g33def');
    hireBranchDir33(s, br);
    const a = Object.values(s.acts).find((x) => x.city === city && x.owner === null && !x.catalogNo && x.status !== 'retired' && x.status !== 'split')!;
    a.owner = 'player'; a.trust = 40; s.branchOf[a.id] = br;
    const nLabels = Object.keys(s.labels).length;
    expect(defect33(s, br)).toBeNull();
    expect(dirOf33(s, br)).toBeUndefined();
    expect(Object.keys(s.labels).length).toBe(nLabels + 1);
    expect(a.owner).not.toBe('player');
  });

  it('CEO assume a delegação e devolve ao sair', () => {
    const { s } = withBranch('g33c');
    s.player.staff.push({ id: 'stX', name: 'Executiva X', role: 'admin', skill: 80, salary: 100000, hiredWeek: 0 });
    expect(modeOf31(s, 'anr')).toBe('me');
    const before = modeOf31(s, 'agenda');
    expect(hireCeo33(s)).toBeNull();
    expect(ceo33(s)).toBeTruthy();
    expect(modeOf31(s, 'fest')).toBe('rule');
    expect(modeOf31(s, 'mandates')).toBe('rule');
    expect(modeOf31(s, 'agenda')).not.toBe('me');
    expect(fireCeo33(s)).toBeNull();
    expect(modeOf31(s, 'fest')).toBe('me');
    expect(modeOf31(s, 'agenda')).toBe(before);
  });

  it('conselho vota na reunião anual (sócios privados)', () => {
    const { s } = withBranch('g33d');
    expect(seatBoard33(s)).not.toBeNull(); // sem sócios nem ações: não há conselho
    capital(s).investors.push({ id: 'i1', name: 'Fundo Teste', share: 0.3 } as never);
    expect(seatBoard33(s)).toBeNull();
    const r = boardMeeting33(s)!;
    expect(r.votes.length).toBeGreaterThan(0);
    expect(r.yes + r.no).toBeGreaterThan(0);
    expect(board33(s)!.log.length).toBe(1);
  });

  it('equipe pessoal mexe em segurança e saúde', () => {
    const { s } = withBranch('g33e');
    const o = ownerOf(s);
    o.wealth = 1e12; o.health = 40; o.stress = 70;
    const ok = (['guard', 'doctor', 'trainer', 'driver'] as const).filter((k) => hireCrew33(s, k) === null);
    expect(ok).toContain('guard');
    expect(vida33(s).guard).toBeGreaterThan(0);
    expect(crew33(s, 'guard')).toBeTruthy();
    const h = o.health, st = o.stress;
    s.week += 4;
    gente33Month(s);
    if (ok.includes('doctor') || ok.includes('trainer')) expect(o.health).toBeGreaterThan(h);
    if (ok.includes('driver') || ok.includes('doctor')) expect(o.stress).toBeLessThan(st);
    expect(adoptFixed33(s, 'union') === null ? fixed33(s, 'union') : true).toBeTruthy();
  });

  it('parte B: gente da cidade larga a vaga, não volta enquanto trabalha para você; quem sai vira executivo e fica na camada leve', () => {
    const { s, br } = withBranch('g33pb');
    const c = cands33(s, { srcs: ['city'], n: 1 })[0];
    expect(c).toBeTruthy();
    const pid = c.k.slice(2);
    expect(Object.values(gente31(s).j).some((j) => j.p === pid)).toBe(true);
    expect(hireBranchDir33(s, br, c.k)).toBeNull();
    expect(Object.values(gente31(s).j).some((j) => j.p === pid)).toBe(false); // largou a vaga
    expect(opinionOf(s, c.k)).toBeGreaterThan(0);
    staffMonth31(s);
    expect(Object.values(gente31(s).j).some((j) => j.p === pid)).toBe(false); // a cidade não o recontrata
    expect(light33(s).find((x) => x.k === c.k)?.now).toBe(true);
    // demitido: vira executivo livre no mercado, com a filial no currículo, e a opinião cai
    const op = opinionOf(s, c.k);
    expect(fireBranchDir33(s, br)).toBeNull();
    expect(opinionOf(s, c.k)).toBeLessThan(op);
    const row = light33(s).find((x) => x.k === c.k)!;
    expect(row.now).toBe(false);
    const L0 = leaders(s).L[row.ldr!];
    expect(L0.name).toBe(c.n);
    expect(L0.st).toBe('free');
    expect(L0.jobs[0].lb).toBe('player');
    // e volta a poder ser contratado (como executivo do mercado)
    expect(cands33(s, { srcs: ['exec'], n: 999 }).some((x) => x.k === `l:${L0.id}`)).toBe(true);
  });
});
