// Rodada 29 (WIKI) — wiki do jogo (docs/wiki29.md). Contratos:
//  - todo sistema registrado em src/sim/sys/index.ts tem artigo de mecânica (e os 18 temas pedidos existem);
//  - todo link de artigo resolve; toda página de jogo citada existe no catálogo único (route29model);
//  - páginas de pessoa concordam com a fonte canônica connect29 (a mesma da ficha);
//  - com "Revelar história real" desligado, nenhum fato real depois do ano da partida aparece;
//  - a busca ignora acentos, tem teto e agrupa; toda seção monta (modelo puro) em várias eras sem erro.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../src/sim/tick';
import '../src/sim/sys/index';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { careerActs29, exMembers29 } from '../src/sim/sys/connect29';
import type { GameState } from '../src/sim/types';
import { ORGS17 } from '../src/data/orgs17';
import { ALL_AREAS29 } from '../src/ui/ps/route29model';
import { ctxMenu27, menuSections27 } from '../src/ui/ps/ctx27model';
import { MECH29, MECH_ORDER29, SEC_LISTS29, exists29, listIds29, page29, search29, staticLinks29, title29 } from '../src/ui/wiki29/wiki29model';
import { SYS_OF_MECH29 } from '../src/ui/wiki29/wiki29sys';
import { hashOf29, idOfHash29, type W29 } from '../src/ui/wiki29/wiki29core';
import { wikiIdOfEnt29 } from '../src/ui/wiki29/wiki29open';
import type { Block29, Inline29, Page29 } from '../src/ui/wiki29/wiki29types';

const SYS = readFileSync('src/sim/sys/index.ts', 'utf8').split('\n').map((x) => /^import '\.\/([^']+)';/.exec(x)?.[1]).filter((x): x is string => !!x);
const game = (seed: string, year: number, realNames = true): GameState => createGame(defaultConfig(seed, { startYear: year, realNames }));
const G1965 = game('r29w-1', 1965);

/** Todo texto e todo link de uma página (para checar spoilers e links). */
function walk(p: Page29): { text: string; links: string[] } {
  const parts: string[] = [p.title];
  const links: string[] = p.crumbs.map((x) => x.id);
  const inl = (xs: Inline29[]) => { for (const x of xs) { if (typeof x === 'string') parts.push(x); else { parts.push(x.text); links.push(x.link); } } };
  for (const b of p.blocks as Block29[]) {
    if (b.k === 'h') parts.push(b.t);
    else if (b.k === 'p') inl(b.x);
    else if (b.k === 'ul') b.items.forEach(inl);
    else if (b.k === 'kv' || b.k === 'live') b.rows.forEach(([k, v]) => { parts.push(k); inl(v); });
    else if (b.k === 'note') { parts.push(b.t); inl(b.x); }
    else if (b.k === 'arts') b.items.forEach((x) => { parts.push(x.cap); if (x.link) links.push(x.link); });
    else if (b.k === 'list') links.push(...b.ids.slice(0, 50));
  }
  return { text: parts.join(' \n '), links };
}

describe('r29 wiki: cobertura dos sistemas', () => {
  it('os 18 temas pedidos têm artigo completo (o quê, entradas, saídas, regras, dicas, páginas)', () => {
    expect(MECH29.map((m) => m.id)).toEqual(MECH_ORDER29);
    for (const m of MECH29) {
      expect(m.what.length, m.id).toBeGreaterThan(0);
      expect(m.inputs.length, m.id).toBeGreaterThan(2);
      expect(m.outputs.length, m.id).toBeGreaterThan(2);
      expect(m.rules.length, m.id).toBeGreaterThan(2);
      expect(m.tips.length, m.id).toBeGreaterThan(1);
      expect(m.pages.length, m.id).toBeGreaterThan(0);
      for (const x of [m.title, m.summary, ...m.what]) { expect(x.pt.length, m.id).toBeGreaterThan(3); expect(x.en.length, m.id).toBeGreaterThan(3); }
    }
  });
  it('todo sistema registrado em src/sim/sys/index.ts tem um artigo de mecânica', () => {
    expect(SYS.length).toBeGreaterThan(250);
    const covered = new Set(Object.values(SYS_OF_MECH29).flat());
    const missing = SYS.filter((m) => !covered.has(m));
    expect(missing).toEqual([]);
    for (const k of Object.keys(SYS_OF_MECH29)) expect(MECH_ORDER29, k).toContain(k);
  });
  it('os números lidos do código existem com e sem partida', () => {
    for (const m of MECH29) {
      expect(() => m.nums?.(null), m.id).not.toThrow();
      const rows = m.nums?.(G1965) ?? [];
      for (const [k, v] of rows) { expect(k.pt, m.id).toBeTruthy(); expect(typeof v, m.id).toBe('string'); }
    }
  });
});

describe('r29 wiki: links', () => {
  it('todo link dos artigos fixos (mecânicas, glossário, perguntas) resolve', () => {
    const c: W29 = { s: null, reveal: false };
    const bad = staticLinks29().filter((x) => !exists29(c, x.to));
    expect(bad).toEqual([]);
  });
  it('toda página do jogo citada por um artigo existe no catálogo único', () => {
    for (const m of MECH29) for (const p of m.pages) expect(ALL_AREAS29, `${m.id} → ${p}`).toContain(p);
  });
  it('links das páginas geradas resolvem (amostra de cada lista, com e sem partida)', () => {
    for (const c of [{ s: null, reveal: false }, { s: G1965, reveal: false }] as W29[]) {
      for (const lists of Object.values(SEC_LISTS29)) for (const li of lists) for (const id of listIds29(c, li).slice(0, 25)) {
        const p = page29(c, id);
        expect(p, id).toBeTruthy();
        for (const to of walk(p!).links) expect(exists29(c, to), `${id} → ${to}`).toBe(true);
      }
    }
  });
  it('endereços #/wiki/<tipo>/<id> vão e voltam', () => {
    for (const id of ['home', 'mech:money', 'city:rio', 'person:p12', 'ract:the-beatles', 'idx:mundo', 'idx:acts']) expect(idOfHash29(hashOf29(id))).toBe(id);
    expect(idOfHash29('#/wiki')).toBe('home');
    expect(idOfHash29('#/wiki/mech')).toBe('idx:mech');
    expect(idOfHash29('#/cockpit')).toBeNull();
  });
});

describe('r29 wiki: personagens concordam com connect29', () => {
  it('bandas da pessoa = careerActs29; ex-integrantes do ato = exMembers29', () => {
    const s = G1965;
    const c: W29 = { s, reveal: true };
    const pids = Object.keys(s.persons).filter((id) => careerActs29(s, id).length > 1).slice(0, 40);
    expect(pids.length).toBeGreaterThan(0);
    for (const pid of pids) {
      const p = page29(c, `person:${pid}`)!;
      const links = new Set(walk(p).links.filter((x) => x.startsWith('act:')));
      for (const x of careerActs29(s, pid)) expect(links.has(`act:${x.act.id}`), `${s.persons[pid].name} → ${x.act.name}`).toBe(true);
    }
    const acts = Object.values(s.acts).filter((a) => exMembers29(s, a).length).slice(0, 40);
    for (const a of acts) {
      const links = new Set(walk(page29(c, `act:${a.id}`)!).links);
      for (const x of exMembers29(s, a)) expect(links.has(`person:${x.pid}`), `${a.name} ex ${x.pid}`).toBe(true);
    }
  });
  it('não mostra talento, potencial nem fim de carreira previsto', () => {
    const s = G1965;
    const a = Object.values(s.acts).find((x) => x.members.length > 2 && x.debutYear <= s.year)!;
    const txt = walk(page29({ s, reveal: false }, `act:${a.id}`)!).text + walk(page29({ s, reveal: false }, `person:${a.members[0]}`)!).text;
    expect(txt).not.toMatch(/potencial|potential|talento oculto|hidden talent/i);
    expect(txt).not.toContain(String(a.careerEnd) + ' (');
  });
  it('"Ver na wiki" está na seção Atalhos do menu de pessoa, ato, selo, cidade, gênero, relíquia e organização', () => {
    const s = G1965;
    const a = Object.values(s.acts).find((x) => x.debutYear <= s.year)!;
    const lb = Object.keys(s.labels)[0];
    const cases: [Parameters<typeof ctxMenu27>[1], string][] = [['act', a.id], ['person', `p:${a.members[0]}`], ['label', lb], ['city', 'rio'], ['genre', 'rnr'], ['relic', 'carmen_baiana'], ['org', ORGS17.find((o) => o.from <= 1965 && o.to >= 1965)!.id]];
    for (const [ent, id] of cases) {
      const m = ctxMenu27(s, ent, id, {}, 'Nome');
      expect(m, ent).toBeTruthy();
      const more = menuSections27(m!).find((x) => x.sec === 'more');
      expect(more?.items.some((x) => x.id === 'wiki'), ent).toBe(true);
      expect(page29({ s, reveal: false }, wikiIdOfEnt29(ent, id)), ent).toBeTruthy();
    }
  });
});

describe('r29 wiki: spoilers', () => {
  it('com o botão desligado, nenhum ano real depois do ano da partida aparece (pessoas, atos, objetos, mundo)', () => {
    const s = game('r29w-2', 1962);
    const c: W29 = { s, reveal: false };
    const years = (t0: string) => [...t0.matchAll(/\b(19[6-9]\d|20[0-4]\d)\b/g)].map((m) => +m[1]);
    const ids = [
      ...Object.values(s.acts).filter((a) => a.catalogNo && a.debutYear <= s.year).slice(0, 60).map((a) => `act:${a.id}`),
      ...listIds29(c, 'persons').slice(0, 80), ...listIds29(c, 'relics'), ...listIds29(c, 'genres'), ...listIds29(c, 'prods').slice(0, 40), ...listIds29(c, 'mgrs').slice(0, 40),
      'ract:the-beatles', 'ract:pink-floyd', 'rp:john-lennon', 'genre:grunge', 'tech:streaming', 'era:streaming', 'country:BRA',
    ];
    for (const id of ids) {
      const p = page29(c, id);
      if (!p) continue;
      const over = years(walk(p).text).filter((y) => y > s.year);
      expect(over, id).toEqual([]);
    }
    // e, revelando, a história real aparece
    const rev = walk(page29({ s, reveal: true }, 'ract:the-beatles')!).text;
    expect(rev).toMatch(/1970/);
    expect(walk(page29(c, 'ract:the-beatles')!).text).not.toMatch(/1970/);
  });
  it('lista e busca não trazem o que ainda não chegou', () => {
    const s = game('r29w-3', 1958);
    const c: W29 = { s, reveal: false };
    expect(listIds29(c, 'genres')).not.toContain('genre:grunge');
    expect(search29(c, 'grunge').flatMap((g) => g.items.map((x) => x.id))).not.toContain('genre:grunge');
    expect(listIds29({ s, reveal: true }, 'genres')).toContain('genre:grunge');
  });
});

describe('r29 wiki: busca', () => {
  it('ignora acentos, agrupa por tipo e tem teto', () => {
    const c: W29 = { s: null, reveal: false };
    const a = search29(c, 'joao gilberto'), b = search29(c, 'João Gilberto');
    expect(a.flatMap((g) => g.items.map((x) => x.id))).toEqual(b.flatMap((g) => g.items.map((x) => x.id)));
    expect(a.some((g) => g.group === 'persons')).toBe(true);
    const big = search29(c, 'the', 30, 6);
    expect(big.reduce((n, g) => n + g.items.length, 0)).toBeLessThanOrEqual(30);
    for (const g of big) expect(g.items.length).toBeLessThanOrEqual(6);
    expect(search29(c, 'contrato').some((g) => g.group === 'mech' && g.items.some((x) => x.id === 'mech:contracts'))).toBe(true);
    expect(search29(c, 'x')).toEqual([]);
  });
  it('acha pessoas da partida carregada', () => {
    const s = G1965;
    const c: W29 = { s, reveal: false };
    const pid = listIds29(c, 'persons')[3];
    const name = title29(c, pid);
    expect(search29(c, name).flatMap((g) => g.items.map((x) => x.id))).toContain(pid);
  });
});

describe('r29 wiki: toda seção monta em várias eras', () => {
  for (const [y, real] of [[1925, true], [1955, true], [1978, false], [1999, true], [2018, true]] as [number, boolean][]) {
    it(`partida ${y}${real ? '' : ' (nomes gerados)'}: índices e amostras de cada lista`, () => {
      const s = game(`r29w-e${y}`, y, real);
      for (const reveal of [false, true]) {
        const c: W29 = { s, reveal };
        expect(page29(c, 'home')).toBeTruthy();
        for (const [sec, lists] of Object.entries(SEC_LISTS29)) {
          expect(page29(c, `idx:${sec}`), sec).toBeTruthy();
          for (const li of lists) {
            expect(page29(c, `idx:${li}`), li).toBeTruthy();
            const ids = listIds29(c, li);
            for (const id of [...ids.slice(0, 6), ...ids.slice(-3)]) expect(() => page29(c, id), id).not.toThrow();
          }
        }
      }
    });
  }
  it('sem partida (catálogo real): milhares de pessoas e artistas, todas as seções', () => {
    const c: W29 = { s: null, reveal: false };
    expect(listIds29(c, 'persons').length).toBeGreaterThan(3000);
    expect(listIds29(c, 'acts').length).toBeGreaterThan(3000);
    for (const lists of Object.values(SEC_LISTS29)) for (const li of lists) for (const id of listIds29(c, li).slice(0, 5)) expect(page29(c, id), id).toBeTruthy();
    const p = page29(c, 'rp:john-lennon')!;
    expect(p.art?.k).toBe('portrait');
    expect(walk(p).links).toContain('ract:the-beatles');
  });
});
