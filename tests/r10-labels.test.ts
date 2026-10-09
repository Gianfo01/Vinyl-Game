// Rodada 10: escolha de gravadoras no Novo Jogo, começo "todos iguais", estratégias novas e líderes.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame, labelPool, takeoverCandidates, EQUAL_START_REAL } from '../src/sim/worldgen';
import { CATALOG_LABELS } from '../src/data/catalog';
import { EXTRA_LABELS, REAL_EXECS } from '../src/data/labels10';
import { cityById } from '../src/data/world';
import { nominal } from '../src/core/money';
import { leaderOf, leaders } from '../src/sim/sys/leaders10';
import { PLAYBOOKS, playbookOf, rivals8 } from '../src/sim/sys/rivals8';
import { runSimHooks } from '../src/sim/ext4';
import { rngOf } from '../src/sim/util';
import type { RunConfig } from '../src/sim/types';

const cfg = (seed: string, over: Partial<RunConfig> = {}) => defaultConfig(seed, over) as RunConfig;

describe('gravadoras escolhidas', () => {
  it('as definições extras são válidas e os manuais existem', () => {
    const ids = new Set<string>();
    for (const d of labelPool()) {
      expect(ids.has(d.id), d.id).toBe(false);
      ids.add(d.id);
      expect(cityById[d.city], d.id).toBeDefined();
    }
    for (const d of EXTRA_LABELS) expect(PLAYBOOKS[d.playbook as keyof typeof PLAYBOOKS], d.id).toBeDefined();
    for (const e of REAL_EXECS) expect(ids.has(e.label), e.rid).toBe(true);
    expect(Object.keys(PLAYBOOKS).length).toBeGreaterThanOrEqual(21);
  });

  it('sem configuração, o conjunto de sempre; todo selo ativo tem líder', () => {
    const s = createGame(cfg('r10-def'));
    const ids = Object.keys(s.labels);
    for (const id of ids) expect(CATALOG_LABELS.some((d) => d.id === id) || id.startsWith('old')).toBe(true);
    for (const lb of Object.values(s.labels).filter((x) => x.active)) {
      const L0 = leaderOf(s, lb.id);
      expect(L0, lb.name).toBeDefined();
      expect(lb.ceo).toBe(L0!.name);
      expect(L0!.born).toBeLessThan(s.year - 20);
    }
  });

  it('escolhe quais e quantos; as do futuro só nascem no ano delas, com fundador e notícia', () => {
    const ids = ['x_decca', 'x_capitol', 'x_atlantic', 'x_sun', 'x_island', 'x_virgin', 'imperial'];
    const s = createGame(cfg('r10-pick', { startYear: 1955, mode: 'historic', labels: { ids, future: 'default' } }));
    const active = Object.values(s.labels).filter((x) => x.active).map((x) => x.id).sort();
    expect(active).toEqual(['imperial', 'x_atlantic', 'x_capitol', 'x_decca', 'x_sun']);
    expect(s.labels.x_island.active).toBe(false);
    expect(s.labels.x_virgin.active).toBe(false);
    s.player.cash += 1e12;
    for (let i = 0; i < 64 && s.year < 1960; i++) advanceMonth(s);
    expect(s.year).toBeGreaterThanOrEqual(1960);
    expect(s.labels.x_island.active).toBe(true);
    expect(leaderOf(s, 'x_island')).toBeDefined();
    expect(s.memory.some((m) => m.kind === 'leader10' && m.text.pt.includes(`funda ${s.labels.x_island.name}`))).toBe(true);
    expect(s.labels.x_virgin.active).toBe(false);
  });

  it('número de rivais: corta, completa e aceita zero', () => {
    const a = createGame(cfg('r10-n', { startYear: 1990, labels: { count: 6, future: 'none' } }));
    expect(Object.values(a.labels).length).toBe(6);
    const b = createGame(cfg('r10-n', { startYear: 1990, labels: { count: 40, future: 'none' } }));
    expect(Object.values(b.labels).filter((x) => x.active).length).toBe(40);
    const z = createGame(cfg('r10-z', { labels: { count: 0, future: 'none' } }));
    expect(Object.keys(z.labels).length).toBe(0);
    for (let i = 0; i < 6; i++) advanceMonth(z);
    expect(z.year).toBeGreaterThanOrEqual(1960);
  });

  it('do zero, todos iguais: mesmo caixa, reputação e nenhum elenco (inclusive o jogador)', () => {
    const s = createGame(cfg('r10-eq', { startYear: 1975, scenario: 'established', labels: { start: 'equal' } }));
    const eq = nominal(EQUAL_START_REAL, 1975);
    const act = Object.values(s.labels).filter((x) => x.active);
    expect(act.length).toBeGreaterThan(5);
    for (const lb of act) { expect(lb.cash).toBe(eq); expect(lb.roster.length).toBe(0); expect(lb.reputation).toBe(40); }
    expect(s.player.initialCash).toBe(eq);
    expect(Object.values(s.acts).filter((a) => a.owner === 'player').length).toBe(0);
    // assumir uma gravadora continua funcionando no conjunto escolhido
    const c = cfg('r10-eq', { startYear: 1975, labels: { start: 'equal', ids: ['x_virgin', 'x_sire', 'imperial'] } });
    const cands = takeoverCandidates(c);
    expect(cands.filter((x) => !x.extra).map((x) => x.label.id).sort()).toEqual(['imperial', 'x_sire', 'x_virgin']);
    const t = createGame({ ...c, takeover: 'x_sire' });
    expect(t.labels.x_sire).toBeUndefined();
    expect(t.config.companyName).toBe(cands.find((x) => x.label.id === 'x_sire')!.label.name);
  });
});

describe('estratégias novas', () => {
  it('os oito manuais novos deixam jogadas visíveis', () => {
    const ids = ['x_avex', 'x_xl', 'x_atlantic', 'x_stax', 'x_hipgnosis', 'x_sony', 'x_rca', 'x_capitol', 'x_trojan', 'x_sire', 'x_creation', 'x_epic', 'x_ktel', 'x_peerless', 'x_distrokid', 'imperial', 'heritage'];
    const s = createGame(cfg('r10-pb', { startYear: 2019, labels: { ids, future: 'none' } }));
    const pbs = new Set(Object.values(s.labels).map((lb) => playbookOf(lb)));
    for (const p of ['viral', 'school', 'royalty', 'conglomerate', 'importer', 'agitator', 'copycat', 'budget']) expect(pbs.has(p as never), p).toBe(true);
    for (let i = 0; i < 30; i++) advanceMonth(s);
    const kinds = new Set(Object.values(rivals8(s).log).flat().map((m) => m.k));
    const fresh = ['viral_grab', 'viral_drop', 'school_class', 'school_grad', 'royalty_buy', 'royalty_yield', 'media_push', 'media_absorb', 'import_hit', 'import_license',
      'scene_night', 'agitator_sign', 'major_attack', 'copy_clone', 'copy_sign', 'budget_comp', 'budget_sign'];
    expect(fresh.filter((k) => kinds.has(k as never)).length).toBeGreaterThanOrEqual(6);
  }, 60000);
});

describe('líderes', () => {
  it('envelhecem, se aposentam e têm sucessores registrados na crônica', () => {
    const s = createGame(cfg('r10-lead', { startYear: 1970 }));
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const L0 = leaderOf(s, lb.id)!;
    L0.retireAge = s.year - L0.born; // aposenta no próximo fechamento de ano
    runSimHooks('year', s, rngOf(s));
    expect(L0.st).toBe('retired');
    const next = leaderOf(s, lb.id)!;
    expect(next).toBeDefined();
    expect(next.id).not.toBe(L0.id);
    expect(lb.ceo).toBe(next.name);
    expect(L0.jobs[L0.jobs.length - 1].end).toBe('retired');
    expect(s.memory.some((m) => m.kind === 'leader10' && m.text.pt.includes(next.name))).toBe(true);
  });

  it('anos ruins derrubam o líder; a carreira guarda os selos que comandou', () => {
    const s = createGame(cfg('r10-fire', { startYear: 1980 }));
    let fired = 0;
    for (let k = 0; k < 6; k++) {
      for (const lb of Object.values(s.labels).filter((x) => x.active)) {
        const L0 = leaderOf(s, lb.id);
        if (!L0) continue;
        L0.founder = false; L0.bad = 3; lb.cash = -1;
      }
      runSimHooks('year', s, rngOf(s));
      fired += Object.values(leaders(s).L).filter((x) => x.jobs.some((j) => j.end === 'fired')).length;
    }
    expect(fired).toBeGreaterThan(0);
  });

  it('nomes reais: executivos famosos só quando o selo existe', () => {
    const s = createGame(cfg('r10-real', { startYear: 1962, mode: 'historic', realNames: true, labels: { ids: ['harbor', 'x_atlantic', 'x_sun', 'cipher_street', 'x_virgin'] } }));
    expect(leaderOf(s, 'harbor')?.name).toBe('Berry Gordy');
    expect(leaderOf(s, 'x_atlantic')?.name).toBe('Ahmet Ertegun');
    expect(leaderOf(s, 'x_sun')?.name).toBe('Sam Phillips');
    expect(Object.values(leaders(s).L).some((x) => x.name === 'Rick Rubin' || x.name === 'Richard Branson')).toBe(false);
  });

  it('semana a semana = mês a mês com líderes e conjunto escolhido', () => {
    const c = cfg('r10-det', { startYear: 1985, labels: { ids: ['x_xl', 'x_subpop', 'x_epic', 'imperial', 'x_universal'], future: 'all' } });
    const a = createGame(c);
    const b = createGame(structuredClone(c));
    for (let i = 0; i < 14; i++) advanceMonth(a);
    let months = 0;
    while (months < 14) if (advanceWeek(b)) months++;
    expect(JSON.stringify(leaders(a))).toBe(JSON.stringify(leaders(b)));
    expect(a.player.cash).toBe(b.player.cash);
  }, 60000);
});
