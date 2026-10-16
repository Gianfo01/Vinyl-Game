// Rodada 23 — ligações entre sistemas antes isolados (links23): algumas asserções diretas por ligação.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { emitFact } from '../src/sim/facts17';
import { createGame } from '../src/sim/worldgen';
import '../src/sim/sys/index';
import { a3Of, isReal, jailPerson } from '../src/sim/sys/crime17';
import { RECRUIT23, mem23 } from '../src/sim/sys/crimemem23';
import { cul19 } from '../src/sim/sys/culture19';
import { furn } from '../src/sim/sys/furnish';
import { ins19 } from '../src/sim/sys/insure19';
import { _links23 } from '../src/sim/sys/links23';
import { nm19 } from '../src/sim/sys/naming19';
import { P as people } from '../src/sim/sys/people/state';
import { FIND23 } from '../src/sim/sys/scout23';
import { ERA23, PRESS23, addSecret23, eraK23, know23 } from '../src/sim/sys/secrets23';
import { hotList17 } from '../src/sim/sys/trends17';
import type { GameState } from '../src/sim/types';
import { setStaffLoyalty, staffLoyalty } from '../src/sim/opinion';

const fict = (s: GameState) => Object.values(s.acts).find((a) => !a.catalogNo && a.members.length && a.members.every((m) => !isReal(s, m)) && a.status !== 'retired')!;

describe('r23 ligações', () => {
  it('cultura/lealdade → recrutamento do crime; agiota → recrutamento', () => {
    const s = createGame(defaultConfig('r23-l1', { startYear: 1990 }));
    const m = s.player.staff[0] ?? (s.player.staff.push({ id: 'stx', name: 'X', role: 'admin', skill: 40, salary: 100, hiredWeek: 0 }), s.player.staff[0]);
    people(s).career[m.id] ??= { xp: 0, level: 0 }; setStaffLoyalty(s, m.id, 10);
    const ks = RECRUIT23.map((f) => f(s, `s:${m.id}`)).filter(Boolean);
    expect(ks.some((x) => x!.k > 1 && /lealdade/.test(x!.why.pt))).toBe(true);
    const a = fict(s);
    addSecret23(s, { kind: 'shark', subject: `p:${a.members[0]}`, sev: 35, ev: 40 });
    expect(RECRUIT23.map((f) => f(s, `p:${a.members[0]}`)).some((x) => x && x.k >= 2)).toBe(true);
    cul19(s).c = 'chaos';
    for (const x of s.player.staff) { people(s).career[x.id] ??= { xp: 0, level: 0 }; setStaffLoyalty(s, x.id, 80); }
    const own = s.acts[Object.keys(s.acts).find((id) => s.acts[id].owner === 'player') ?? ''];
    if (own) {
      const sec = addSecret23(s, { kind: 'affair', subject: `a:${own.id}`, sev: 40, ev: 40 });
      expect(PRESS23.map((f) => f(s, sec)).some((x) => x && x.k > 1)).toBe(true);
    }
  });

  it('idol: caso pesa mais pela época/contrato e a imprensa vigia', () => {
    const s = createGame(defaultConfig('r23-l2', { startYear: 2012 }));
    const a = fict(s);
    a.genre = 'kpop';
    const sec = addSecret23(s, { kind: 'affair', subject: `a:${a.id}`, sev: 40, ev: 40 });
    expect(ERA23.some((f) => f(s, sec))).toBe(true);
    expect(eraK23(s, sec).k).toBeGreaterThan(1.5);
    expect(PRESS23.some((f) => (f(s, sec)?.k ?? 1) > 1.5)).toBe(true);
  });

  it('prisão de pessoa segurada: paga 20% ou anula se é do crime', () => {
    const s = createGame(defaultConfig('r23-l3', { startYear: 1990 }));
    const a = fict(s);
    const [p1, p2] = [a.members[0], a.members[1] ?? a.members[0]];
    ins19(s).pol.push({ act: a.id, pid: p1, tier: 1, cover: 100000, prem: 100, since: 0, claims: 0, lastIll: -999, paid: 0 });
    const c0 = s.player.cash;
    jailPerson(s, p1, a3Of(s, a.city), 6, { pt: 'x', en: 'x' });
    expect(s.player.cash).toBe(c0 + 20000);
    if (p2 !== p1) {
      ins19(s).pol.push({ act: a.id, pid: p2, tier: 1, cover: 100000, prem: 100, since: 0, claims: 0, lastIll: -999, paid: 0 });
      mem23(s)[`p:${p2}`] = { o: 'x', rk: 0, ro: 'musico', w: 0, why: [], k: 0, n: 0 };
      jailPerson(s, p2, a3Of(s, a.city), 6, { pt: 'x', en: 'x' });
      expect(ins19(s).pol.some((x) => x.pid === p2)).toBe(false);
    }
  });

  it('seguradora revela doença escondida; segredo do dono exposto tira a marca do nome', () => {
    const s = createGame(defaultConfig('r23-l4', { startYear: 2000 }));
    const a = fict(s);
    const sec = addSecret23(s, { kind: 'illness', subject: `p:${a.members[0]}`, sev: 30, ev: 30 });
    ins19(s).pol.push({ act: a.id, pid: a.members[0], tier: 1, cover: 100000, prem: 100, since: 0, claims: 0, lastIll: -999, paid: 0 });
    _links23.month23(s);
    expect(know23(s, sec).p).toBe(3);
    expect(ins19(s).pol.at(-1)!.prem).toBe(115);
    s.week = Math.max(s.week, 10); // naming19 marca pulled = semana (0 seria falso)
    nm19(s).d.push({ id: 'n1', k: 'v', tgt: 'v1', brand: 'b', bname: 'B', fee: 1, from: 0, until: s.week + 100, paid: 0, next: s.week + 52 } as never);
    emitFact(s, { kind: 'secret_exposed', actors: ['player'], severity: 50, visibility: 'public', tags: [], text: { pt: 'x', en: 'x' } });
    expect(nm19(s).d[0].pulled).toBeTruthy();
  });

  it('gênero em alta pesa no olheiro; sede confortável sobe a lealdade', () => {
    const s = createGame(defaultConfig('r23-l5', { startYear: 1995 }));
    const hot = hotList17(s, 5)[0];
    const a = fict(s);
    if (hot) { a.genre = hot.g; expect(FIND23.reduce((m, f) => m * f(s, a, {} as never), 1)).toBeGreaterThan(1); }
    const m = s.player.staff[0];
    if (m) {
      people(s).career[m.id] ??= { xp: 0, level: 0 }; setStaffLoyalty(s, m.id, 40);
      const F = furn(s); F.legacy = false; F.items = { arcade: 1, tv: 1 };
      _links23.month23(s);
      expect(staffLoyalty(s, m.id)).toBeGreaterThan(40);
    }
  });
});
