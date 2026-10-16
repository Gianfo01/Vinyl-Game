// R29 (FORMAÇÃO) — formação inicial das bandas reais nos mundos alternativos com nomes reais (config.lineup29).
// Pedidos do autor: nomes reais e formações iniciais reais, o resto inventado; escolher entre a formação original e a mais
// famosa (só na configuração completa; a Nova run rápida começa com a mais famosa); os outros artistas ficam sem banda e,
// se não participaram da banda no save, não aparecem como ex-integrantes. Ver docs/formacao29.md.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (como nos outros testes)
import { audit29, count29 } from '../src/sim/audit29';
import { defaultConfig } from '../src/sim/bot';
import { lineup29Of } from '../src/sim/lineup29';
import { applyWorld17, newRunConfig20, readSetupCode17, setupCode17 } from '../src/sim/start17';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState, RunConfig } from '../src/sim/types';
import { REAL_CLASSIC } from '../src/data/realacts_classic';
import { careerActs29, exMembers29 } from '../src/sim/sys/connect29';
import { l16, stints16 } from '../src/sim/sys/lineup16';
import { canonKey, lineupPick29, realDataOf, rw } from '../src/sim/sys/realworld';
import { buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27 } from '../src/ui/ps/home27model';

const BEATLES = 26;
// r31 (W0-RNG): mundo gerado no fluxo 'world' — 'b4' tem os Beatles no início (antes 'b3') e 'b3' os tem por surgir (antes 'b1')
const cfgOf = (seed: string, year: number, world: string, lineup?: RunConfig['lineup29']): RunConfig => {
  const c = defaultConfig(seed, { startYear: year });
  applyWorld17(c, world);
  if (lineup) c.lineup29 = lineup;
  return c;
};
const game = (seed: string, year: number, world: string, lineup?: RunConfig['lineup29']) => createGame(cfgOf(seed, year, world, lineup));
const beatles = (s: GameState): Act | undefined => Object.values(s.acts).find((a) => a.catalogNo === BEATLES);
const names = (s: GameState, ids: string[]) => ids.map((id) => s.persons[id]?.name).sort();
const person = (s: GameState, n: string) => Object.values(s.persons).find((p) => canonKey(p.name) === canonKey(n));
const BAD = ['R1', 'R2c', 'R2a', 'R2t', 'R3', 'R6', 'R7', 'R8', 'R9'];
/** estado comparável (sem a configuração, que difere pelo próprio campo) */
const snap = (s: GameState) => JSON.stringify({ acts: s.acts, persons: s.persons, rw: rw(s) });

/** "Free" = existe no mundo, sem ato nenhum (nem atual, nem ex) e fora dos ex-integrantes de qualquer ato. */
function expectFree(s: GameState, n: string): void {
  const p = person(s, n);
  expect(p, `${n} existe`).toBeTruthy();
  expect(careerActs29(s, p!.id).map((x) => x.act.name), `${n} sem atos de carreira`).toEqual([]);
  for (const a of Object.values(s.acts)) {
    expect(a.members.includes(p!.id)).toBe(false);
    expect((rw(s).former[a.id] ?? []).some((f) => f.personId === p!.id), `${n} fora de former[${a.name}]`).toBe(false);
    expect(exMembers29(s, a).some((x) => x.pid === p!.id), `${n} não é ex-integrante de ${a.name}`).toBe(false);
  }
}

describe('R29 formação — escolha da formação (puro)', () => {
  const m = REAL_CLASSIC[BEATLES].m!;
  const pick = (k: 'famous' | 'original') => [...lineupPick29(m, 1962, k, 'The Beatles')].map((i) => m[i][0]).sort();
  it('Beatles: mais famosa = John, Paul, George e Ringo; original (começo de 1962) = com Pete Best', () => {
    expect(pick('famous')).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Ringo Starr']);
    expect(pick('original')).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Pete Best']);
  });
  it('só vale com nomes reais fora do modo exato', () => {
    expect(lineup29Of({ realNames: true, history: 'free', lineup29: 'famous' })).toBe('famous');
    expect(lineup29Of({ realNames: true, history: 'loose', lineup29: 'original' })).toBe('original');
    expect(lineup29Of({ realNames: true, history: 'strict', lineup29: 'famous' })).toBeUndefined();
    expect(lineup29Of({ realNames: false, history: 'loose', lineup29: 'famous' })).toBeUndefined();
    expect(lineup29Of({ realNames: true, history: 'free' })).toBeUndefined();
  });
});

describe('R29 formação — Beatles em 1962 (mundo aleatório)', () => {
  it("'famous': 4 com Ringo; Pete Best e Stuart Sutcliffe livres, sem serem ex-integrantes", () => {
    const s = game('b4', 1962, 'random', 'famous');
    const b = beatles(s)!;
    expect(b, 'semente com os Beatles no início').toBeTruthy();
    expect(names(s, b.members)).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Ringo Starr']);
    expect(exMembers29(s, b)).toEqual([]);
    expect(rw(s).former[b.id] ?? []).toEqual([]);
    expectFree(s, 'Pete Best');
    expectFree(s, 'Stuart Sutcliffe');
    // a mesma pessoa pelo índice canônico (rw.pid), e lembrada como vinda da história real dos Beatles (só referência)
    const pete = person(s, 'Pete Best')!;
    expect(rw(s).pid?.[canonKey('Pete Best')]).toBe(pete.id);
    expect(rw(s).free29?.[pete.id]).toBe(b.id);
    for (const id of b.members) expect(careerActs29(s, id).map((x) => x.act.id)).toContain(b.id);
  }, 60_000);

  it("'original': a formação da estreia (com Pete Best); Ringo e Stuart livres", () => {
    const s = game('b4', 1962, 'random', 'original');
    const b = beatles(s)!;
    expect(names(s, b.members)).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Pete Best']);
    expect(exMembers29(s, b)).toEqual([]);
    expectFree(s, 'Ringo Starr');
    expectFree(s, 'Stuart Sutcliffe');
  }, 60_000);

  it('sem o campo: o comportamento de antes (Stuart e Pete ex-integrantes, nenhuma pessoa livre nova)', () => {
    const s = game('b4', 1962, 'random');
    const b = beatles(s)!;
    expect(lineup29Of(s.config)).toBeUndefined();
    expect(names(s, b.members)).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Ringo Starr']);
    expect(names(s, exMembers29(s, b).map((x) => x.pid))).toEqual(['Pete Best', 'Stuart Sutcliffe']);
    expect(rw(s).free29).toBeUndefined();
    expect(rw(s).pend29).toBeUndefined();
  }, 60_000);
});

describe('R29 formação — regras', () => {
  it('banda que surge depois do início também usa a formação escolhida', () => {
    for (const k of ['famous', 'original'] as const) {
      const s = game('b3', 1962, 'random', k);
      expect(beatles(s), 'Beatles ainda por surgir nesta semente').toBeUndefined();
      for (let i = 0; i < 36 && !(beatles(s) && rw(s).done[beatles(s)!.id]); i++) { if (s.ended) (s.flags as Record<string, number>).sandbox = 1; advanceMonth(s); }
      const b = beatles(s)!;
      expect(b, `${k}: Beatles surgiram`).toBeTruthy();
      const want = k === 'famous' ? ['George Harrison', 'John Lennon', 'Paul McCartney', 'Ringo Starr'] : ['George Harrison', 'John Lennon', 'Paul McCartney', 'Pete Best'];
      expect(names(s, b.members), k).toEqual(want);
      expect(exMembers29(s, b), k).toEqual([]);
      expectFree(s, k === 'famous' ? 'Pete Best' : 'Ringo Starr');
      expect(rw(s).sched.filter((x) => x.actId === b.id && (x.kind === 'join' || x.kind === 'leave')), k).toEqual([]);
    }
  }, 240_000);

  it('nenhuma troca de formação agendada (sem "lin") nas duas opções, no mundo aleatório e no real', () => {
    for (const [world, year] of [['random', 1962], ['real', 1981]] as const) for (const k of ['famous', 'original'] as const) {
      const s = game('d1', year, world, k);
      expect(rw(s).sched.filter((x) => x.lin || x.kind === 'join' || x.kind === 'leave'), `${world} ${k}`).toEqual([]);
    }
    // controle: sem o campo, o mundo real agenda as trocas da formação de identidade (r27 LIN)
    expect(rw(game('b4', 1962, 'random')).sched.some((x) => x.lin)).toBe(true);
  }, 180_000);

  it("'famous' tira quem já morreu no início (The Who 1981 sem Keith Moon, que fica ex-integrante por morte)", () => {
    const s = game('d1', 1981, 'real', 'famous');
    const who = Object.values(s.acts).find((a) => realDataOf(a)?.n === 'The Who')!;
    expect(names(s, who.members)).toEqual(['John Entwistle', 'Pete Townshend', 'Roger Daltrey']);
    const ex = exMembers29(s, who);
    expect(ex.map((x) => [s.persons[x.pid].name, x.reason, x.year])).toEqual([['Keith Moon', 'died', 1978]]);
    expect(careerActs29(s, ex[0].pid).map((x) => x.act.id)).toContain(who.id);
    // em nenhum ato real vivo há integrante morto
    for (const a of Object.values(s.acts)) if (realDataOf(a)?.m?.length && !a.deceased) for (const id of a.members) expect(s.persons[id]?.alive, `${s.persons[id]?.name} em ${a.name}`).toBe(true);
  }, 60_000);

  it('vistas do connect29 concordam e a auditoria R29 fica limpa nas duas opções', () => {
    for (const [seed, year, world] of [['b4', 1962, 'random'], ['d1', 1981, 'real'], ['r29c-0', 1990, 'chaos']] as const) for (const k of ['famous', 'original'] as const) {
      const s = game(seed, year, world, k);
      const c = count29(audit29(s));
      for (const code of BAD) expect(c[code] ?? 0, `${seed} ${year} ${world} ${k} ${code}: ${JSON.stringify(c)}`).toBe(0);
      const free = Object.entries(rw(s).free29 ?? {}).filter(([id]) => s.persons[id]);
      expect(free.length, `${world} ${k}: há pessoas reais livres`).toBeGreaterThan(0);
      // a banda da história real de onde a pessoa vem não a lista (nem como ex-integrante) e a ficha dela não cita a banda;
      // ela pode estar em OUTRO ato real (a carreira solo de David Gilmour reaproveita a mesma Pessoa pelo índice canônico)
      for (const [id, from] of free) {
        const a = s.acts[from];
        expect(careerActs29(s, id).some((x) => x.act.id === from), `${s.persons[id].name} × ${a?.name}`).toBe(false);
        if (a) expect(a.members.includes(id) || exMembers29(s, a).some((x) => x.pid === id), `${s.persons[id].name} × ${a.name}`).toBe(false);
      }
    }
  }, 300_000);

  it('saída simulada antes da estreia não vira passagem invertida (auditoria: Macklemore "2009–2008", Compay Segundo)', () => {
    const s = game('b4', 1962, 'random', 'famous');
    const b = beatles(s)!;
    const pid = b.members[3];
    const y = b.debutYear - 1;
    b.formed = y - 1;
    b.members = b.members.filter((x) => x !== pid);
    (rw(s).former[b.id] ??= []).push({ personId: pid, year: y, reason: 'died' });
    l16(s).ev.push([y * 12 + 5, b.id, pid, 'l']);
    const me = stints16(s, b).find((x) => x.pid === pid)!;
    for (const g of me.segs) expect(g.to === undefined || g.to >= g.from, JSON.stringify(me.segs)).toBe(true);
  }, 60_000);

  it('o modo exato não muda com o campo', () => {
    const a = game('b4', 1962, 'exact');
    const b = game('b4', 1962, 'exact', 'famous');
    expect(lineup29Of(b.config)).toBeUndefined();
    expect(snap(b)).toBe(snap(a));
  }, 120_000);

  it('determinismo: mesma configuração = mesmo mundo (nas duas opções)', () => {
    for (const k of ['famous', 'original'] as const) expect(snap(game('b4', 1962, 'random', k)), k).toBe(snap(game('b4', 1962, 'random', k)));
    // as pessoas reais livres saem de gerador próprio (semente|free29|nome): a mesma pessoa nasce igual nas duas opções
    const f = person(game('b4', 1962, 'random', 'famous'), 'Stuart Sutcliffe')!, o = person(game('b4', 1962, 'random', 'original'), 'Stuart Sutcliffe')!;
    expect([o.born, o.role, o.potential, o.skills]).toEqual([f.born, f.role, f.potential, f.skills]);
  }, 180_000);
});

describe('R29 formação — Nova run', () => {
  it('Nova run rápida = mais famosa (e gera os Beatles de 4 com Ringo)', () => {
    let seen = false;
    for (let i = 0; i < 10 && !seen; i++) {
      const q = { ...quickDefaults27(`q29-${i}`, 'Selo'), startYear: 1962 };
      const cfg = quickRunConfig27(q);
      expect(cfg.lineup29).toBe('famous');
      const run = buildRun27(cfg);
      expect(run.lineup29).toBe('famous');
      const s = createGame(run);
      const b = beatles(s);
      if (!b || b.status === 'split' || b.status === 'retired') continue;
      seen = true;
      expect(names(s, b.members)).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Ringo Starr']);
      expectFree(s, 'Pete Best');
    }
    expect(seen, 'alguma semente com os Beatles no início').toBe(true);
  }, 300_000);

  it('configuração completa: padrão "mais famosa", a escolha "original" sobrevive ao redesenho, ao código e ao preparo', () => {
    const full = draftDefaults27(newRunConfig20({ seed: 'r29f', companyName: 'Selo' }));
    expect(full.lineup29).toBe('famous');
    expect(quickRunConfig27(quickDefaults27('r29f', 'Selo'))).toEqual(draftDefaults27(full)); // rápida = completa nas mesmas escolhas
    full.lineup29 = 'original';
    expect(draftDefaults27(full).lineup29).toBe('original');
    expect(readSetupCode17(setupCode17(full))?.lineup29).toBe('original');
    expect(buildRun27(full).lineup29).toBe('original');
    expect(lineup29Of(buildRun27(full))).toBe('original');
  });
});
