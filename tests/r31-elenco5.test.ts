// R31 · onda 5 (ELENCO) — papéis do elenco (src/ui/r31/elenco5.ts + elenco5model.ts), atrás de exp5.nav (DESLIGADO):
//  1. tudo que as telas de artistas fazem hoje é alcançável (cada página/aba antiga tem um papel/marcador ou caminho);
//  2. desligado = igual a hoje (a navegação segue para a página antiga, nenhum papel abre, nenhuma tecla nova);
//  3. explorar não muda o estado (modelos e abrir/fechar papéis só leem: estado e sorteios iguais).
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { SW_NAV5 } from '../src/sim/r31/exp5';
import { rngSnapshot19 } from '../src/sim/rng19';
import { monthIndex, reservePlan } from '../src/sim/capacity';
import { playerActs } from '../src/sim/util';
import { actionRows20, actions20 } from '../src/ui/actions20';
import { object5 } from '../src/ui/r31/objects5';
import {
  FICH5_0, MURAL_TABS5, PAPERS5, REACH5, SUB_IDS5, agenda5, board5, compare5, fichario5, hire5, mural5, type Fich5Filter,
} from '../src/ui/r31/elenco5model';

type El5 = typeof import('../src/ui/r31/elenco5');
type Nav5 = typeof import('../src/ui/r31/nav5');
let E: El5, N: Nav5, store: typeof import('../src/ui/store').store;
let PEOPLE_TABS: string[] = [];
let AGENDA_TABS: string[] = [];

beforeAll(async () => {
  const g = globalThis as Record<string, unknown>;
  const el = () => ({ style: {}, dataset: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } });
  g.window ??= { setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  g.document ??= { addEventListener() {}, createElement: el, querySelector: () => null, querySelectorAll: () => [], documentElement: el(), body: el(), getElementById: () => null };
  g.MutationObserver ??= class { observe() {} disconnect() {} };
  g.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  g.navigator ??= { language: 'pt' };
  await import('../src/ui/app');
  E = await import('../src/ui/r31/elenco5');
  N = await import('../src/ui/r31/nav5');
  store = (await import('../src/ui/store')).store;
  // abas de hoje lidas do código-fonte (as funções das abas são internas): Pessoas e Agenda e contratações
  const { readFileSync } = await import('node:fs');
  const tabIds = (file: string, key: string) => {
    const src = readFileSync(file, 'utf8');
    const i = src.indexOf(`tabs('${key}', [`);
    const block = src.slice(i, src.indexOf('], rerender', i));
    return [...block.matchAll(/\{ id: '([a-z0-9]+)'/g)].map((m) => m[1]);
  };
  PEOPLE_TABS = tabIds('src/ui/sys/people/area.ts', 'people');
  AGENDA_TABS = tabIds('src/ui/sys/agenda17.ts', 'agenda17');
}, 180000);

const played = (y: number, months = 6): GameState => {
  const s = createGame(defaultConfig(`el5-${y}`, { startYear: y }));
  for (let i = 0; i < months; i++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const mine = playerActs(s);
  if (mine[0]) reservePlan(s, mine[0], 'record', monthIndex(s) + 2, { months: 2 });
  return s;
};

describe('ELENCO 5 · tudo das telas de artistas é alcançável', () => {
  it('cada papel cobre exatamente as páginas do objeto dono (objects5) e tem "página de hoje"', () => {
    for (const [id, p] of Object.entries(PAPERS5)) {
      expect(E.papers5(), id).toContain(id);
      const o = object5(p.obj);
      if (!o) { expect(p.areas, `${id}: papel sem objeto (contratação) não é dono de página`).toHaveLength(0); continue; }
      expect(o.opens.map((x) => x.area).sort(), id).toEqual([...p.areas].sort());
      expect(E.paperOfObj5(p.obj), id).toBe(id);
    }
  });
  it('as 6 abas de Pessoas viram marcadores do mural; as 5 de Agenda e contratações têm lugar', () => {
    expect(PEOPLE_TABS.length).toBe(6);
    expect(MURAL_TABS5.map((x) => x.id)).toEqual(PEOPLE_TABS);
    expect(AGENDA_TABS.length).toBe(5);
    for (const t of PEOPLE_TABS) expect(REACH5[`people/${t}`], `people/${t}`).toBeTruthy();
    for (const t of AGENDA_TABS) expect(REACH5[`agenda17/${t}`], `agenda17/${t}`).toBeTruthy();
    for (const t of SUB_IDS5) expect(REACH5[`artists20/${t}`], `artists20/${t}`).toBeTruthy();
    for (const [k, r] of Object.entries(REACH5)) expect(E.papers5(), k).toContain(r.paper);
  });
  it('todo artista do elenco tem polaroid, e o menu dela é o menu de hoje (todas as ações registradas)', () => {
    const s = played(1962);
    const ps = mural5(s);
    const roster = playerActs(s).filter((id) => s.acts[id].status !== 'retired' && s.acts[id].status !== 'split');
    expect(ps.map((p) => p.id).sort()).toEqual([...roster].sort());
    expect(roster.length).toBeGreaterThan(0);
    // cada ação registrada aparece no menu (actionRows20) de algum artista: o mural usa o mesmo menu
    const seen = new Set<string>();
    for (const id of roster) for (const r of actionRows20(s, { act: id })) seen.add(r.def.id);
    const always = actions20().filter((a) => !a.visible).map((a) => a.id);
    for (const id of always) expect(seen.has(id), id).toBe(true);
  });
  it('quadro: planos reservados aparecem e são arrastáveis (movePlan); agenda do mês vira 1 cartão por mês e semanas na vista por semana', () => {
    const s = played(1987);
    const b = board5(s, 'months');
    const plan = b.cards.find((c) => c.src === 'plan');
    expect(plan?.movable).toBe(true);
    expect(plan?.c0).toBe(2);
    for (const r of b.rows) expect(b.cards.filter((c) => c.act === r.id && c.src === 'slot').length).toBeLessThanOrEqual(1);
    const w = board5(s, 'weeks');
    expect(w.cols).toHaveLength(12);
    expect(w.cards.filter((c) => c.src === 'slot').length).toBeGreaterThan(0);
  });
  it('agenda: bolinhas, semanas do mês e "ir até lá" para cada compromisso do calendário único', () => {
    const s = played(2016);
    const a = agenda5(s);
    expect(a.office.length + a.personal.length).toBeGreaterThan(0);
    expect(a.weeks.length).toBeGreaterThanOrEqual(4);
    for (const w of a.weeks) for (const it of w) expect(N.resolveGoto5(s, it.deadline), it.id).toBeTruthy();
    expect(a.careers.length).toBeGreaterThan(0);
  });
  it('fichário: todos os conhecidos, gavetas por letra/gênero/país, busca, páginas e comparar', () => {
    const s = played(1962, 3);
    const f = fichario5(s);
    expect(f.total).toBeGreaterThan(20);
    const byLetter = f.drawers.reduce((n, d) => n + d.n, 0);
    expect(byLetter).toBe(f.total);
    for (const d of ['genre', 'country'] as Fich5Filter['drawer'][]) expect(fichario5(s, { ...FICH5_0, drawer: d }).drawers.reduce((n, x) => n + x.n, 0)).toBe(f.total);
    const one = f.cards[0];
    expect(fichario5(s, { ...FICH5_0, q: one.name.slice(0, 5) }).cards.some((c) => c.id === one.id)).toBe(true);
    expect(compare5(s, f.cards.slice(0, 3).map((c) => c.id)).names).toHaveLength(3);
    expect(hire5(s).staff).toBeGreaterThan(0);
  });
});

describe('ELENCO 5 · desligado = igual a hoje', () => {
  it('exp5.nav desligado: o objeto leva à página antiga e nenhum papel abre; ligado: abre o papel', () => {
    const s = played(1962, 2);
    store.game = s;
    const went: { area: string; tab?: [string, string] }[] = [];
    N.NAV5.go = (t) => { went.push(t); };
    for (const [id, p] of Object.entries(PAPERS5)) {
      if (!object5(p.obj)) continue;
      N.open5(p.obj);
      expect(E.paperOpen5(), id).toBeUndefined();
    }
    expect(went.map((x) => x.area)).toEqual(['artists', 'plan', 'agenda17', 'directory', 'deleg31']);
    expect(N.keyNav5(s, { key: '4' })).toBe(false);
    setSw(s, SW_NAV5, true);
    went.length = 0;
    for (const [id, p] of Object.entries(PAPERS5)) {
      if (!object5(p.obj)) continue;
      N.open5(p.obj);
      expect(E.paperOpen5(), id).toBe(id);
    }
    expect(went).toHaveLength(0);
    // a página antiga continua a um clique ("página de hoje ▸"), e viajar fecha o papel
    E.goOld5({ area: 'artists' });
    expect(went.map((x) => x.area)).toEqual(['artists']);
    expect(E.paperOpen5()).toBeUndefined();
    store.game = null;
  });
});

describe('ELENCO 5 · explorar não muda o estado', () => {
  for (const y of [1962, 1987, 2016]) it(`modelos e papéis só leem (${y})`, () => {
    const s = played(y);
    store.game = s;
    setSw(s, SW_NAV5, true);
    const all = () => {
      mural5(s); board5(s, 'months'); board5(s, 'weeks'); board5(s, 'months', true); agenda5(s); hire5(s);
      const f = fichario5(s);
      for (const d of ['letter', 'genre', 'country'] as Fich5Filter['drawer'][]) fichario5(s, { ...FICH5_0, drawer: d, sort: 'name', noLabel: true, page: 1 });
      compare5(s, f.cards.slice(0, 4).map((c) => c.id));
      for (const id of E.papers5()) { E.openPaper5(id); E.closePaper5(); }
    };
    all(); // 1ª leitura cria as gavetas vazias de sempre (ag17 etc.), como a página de hoje
    const before = JSON.stringify(s), rng = JSON.stringify(rngSnapshot19(s));
    all();
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.stringify(rngSnapshot19(s))).toBe(rng);
    store.game = null;
  });
});
