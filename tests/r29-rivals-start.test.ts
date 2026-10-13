// Rodada 29 — NÍVEL DOS RIVAIS na Nova run (src/sim/rivals29data.ts + src/sim/sys/rivals29start.ts).
// Escada monotônica (caixa, fama e fatia dos rivais), hipster com prestígio artístico ≫ alcance comercial, líder
// dominante, eras (1889 não tem cinco majors), padrão idêntico a "sem campo", rápida == completa, 12 carreiras e
// determinismo.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { toReal } from '../src/core/money';
import { newRunConfig20 } from '../src/sim/start17';
import { CAREERS29, setStart29, type Sit29 } from '../src/sim/start29data';
import { RIVS29, rivOf29, riv29ById, setRivals29, statusLine29, statusLineOf29, type Riv29 } from '../src/sim/rivals29data';
import { applyRivals29, eraBig29, eraWorld29, rivalRep29, rivals29St } from '../src/sim/sys/rivals29start';
import { roleFromMain } from '../src/sim/sys/careers12';
import { VKINDS, ventures } from '../src/sim/sys/ventures9';
import type { GameState, RunConfig } from '../src/sim/types';
import { buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27 } from '../src/ui/ps/home27model';

const pt = (x: { pt: string }) => x.pt;
const ERAS = [1889, 1962, 1990, 2020];
const CHAIN: Riv29[] = ['zero', 'emerging', 'mid', 'established', 'giants'];

const cfgOf = (seed: string, year: number, riv?: Riv29, career = 'label', over: Partial<RunConfig> = {}): RunConfig => {
  const main = [career];
  return defaultConfig(seed, { startYear: year, scenario: 'emerging', careers: { main, origin: 'none', ambition: 'legacy' }, role: roleFromMain(main), ...(riv ? { rivals29: riv } : {}), ...over });
};
const game = (seed: string, year: number, riv?: Riv29, career = 'label', over: Partial<RunConfig> = {}) => createGame(cfgOf(seed, year, riv, career, over));

interface M { cash: number; fame: number; share: number; ratio: number; top: number; topRoster: number; big: number }
function measure(s: GameState): M {
  const ls = Object.values(s.labels).filter((x) => x.active);
  const cash = ls.reduce((t, x) => t + toReal(x.cash, s.year), 0);
  const fame = ls.reduce((t, x) => t + x.roster.reduce((u, id) => u + (s.acts[id]?.fame ?? 0), 0), 0);
  const live = Object.values(s.acts).filter((a) => a.status === 'active' || a.status === 'emerging');
  const share = live.filter((a) => a.owner && a.owner !== 'player' && s.labels[a.owner]?.active).length / live.length;
  const art = ls.reduce((t, x) => t + rivalRep29(s, x.id).art, 0), com = ls.reduce((t, x) => t + rivalRep29(s, x.id).com, 0);
  return { cash, fame, share, ratio: art / Math.max(1, com), top: Math.max(...ls.map((x) => toReal(x.cash, s.year))) / cash, topRoster: Math.max(...ls.map((x) => x.roster.length)), big: rivals29St(s)?.big.length ?? 0 };
}

/** O mundo de pé: elencos, contratos e donos batem; números válidos. */
function sane(s: GameState): void {
  for (const lb of Object.values(s.labels)) {
    expect(Number.isFinite(lb.cash) && lb.cash >= 0).toBe(true);
    expect(lb.reputation).toBeGreaterThanOrEqual(0);
    expect(lb.reputation).toBeLessThanOrEqual(100);
    expect(lb.aggression).toBeGreaterThan(0);
    expect(lb.aggression).toBeLessThanOrEqual(1);
    expect(lb.territories.length).toBeGreaterThan(0);
    for (const id of lb.roster) {
      const a = s.acts[id];
      expect(a?.owner).toBe(lb.id);
      if (a.contractId) expect(s.contracts[a.contractId]?.party).toBe(lb.id);
    }
  }
  for (const a of Object.values(s.acts)) if (a.owner && a.owner !== 'player') expect(s.labels[a.owner]?.roster).toContain(a.id);
  for (const n of ventures(s).npc) { expect(s.year).toBeGreaterThanOrEqual(VKINDS[n.kind].from); expect(n.rep).toBeGreaterThanOrEqual(0); expect(n.rep).toBeLessThanOrEqual(100); }
}

describe('r29 — nível dos rivais: dados e escolha', () => {
  it('a escada tem as 8 opções na ordem da situação inicial, com nome e status', () => {
    expect(RIVS29.map((x) => x.id)).toEqual(['zero', 'emerging', 'mid', 'hipster', 'established', 'giants', 'leader', 'mix']);
    expect(pt(riv29ById('hipster')!.name)).toBe('Hipsters / indie de prestígio');
    expect(pt(statusLine29('label', 'emerging', 'giants'))).toBe('Selo emergente · rivais gigantes');
    expect(pt(statusLine29('musician', 'zero', 'leader'))).toBe('Artista iniciante · um rival dominante');
    expect(statusLine29('studio', 'top5', 'hipster').en).toBe('Top-5 producer · hipster rivals');
    expect(pt(statusLine29('label', 'emerging', undefined))).toBe('Selo emergente · rivais em mistura realista');
    for (const d of RIVS29) { expect(pt(d.fx).length).toBeGreaterThan(20); expect(d.fx.en.length).toBeGreaterThan(20); }
  });

  it('"mistura realista" apaga o campo; um nível explícito desliga o "Como começam" que o contradiria', () => {
    const c = draftDefaults27(newRunConfig20({ seed: 'r29r-set', companyName: 'X' }));
    const before = JSON.stringify(c);
    setRivals29(c, 'mix');
    expect(JSON.stringify(c)).toBe(before);
    expect(rivOf29(c)).toBe('mix');
    c.labels = { ...(c.labels ?? {}), start: 'giants' };
    setRivals29(c, 'zero');
    expect(c.rivals29).toBe('zero');
    expect(c.labels.start).toBeUndefined();
    setRivals29(c, 'mix');
    expect('rivals29' in c).toBe(false);
  });

  it('a Nova run rápida e a completa dão a mesma RunConfig (mesmo setter) e o status mostra os rivais', () => {
    const cases: [string, Sit29, Riv29][] = [['label', 'emerging', 'giants'], ['musician', 'zero', 'hipster'], ['studio', 'top5', 'leader'], ['festival', 'mid', 'zero'], ['manager', 'established', 'mix'], ['label', 'leader', 'emerging']];
    for (const [career, sit, riv] of cases) {
      const quick = quickRunConfig27({ ...quickDefaults27('r29r-q', 'Selo'), career, start29: sit, rivals29: riv === 'mix' ? undefined : riv });
      const full = draftDefaults27(newRunConfig20({ seed: 'r29r-q', companyName: 'Selo' }));
      if (career !== 'label') { full.careers!.main = [career]; full.role = roleFromMain(full.careers!.main); }
      setStart29(full, sit);
      setRivals29(full, riv);
      expect(quick).toEqual(draftDefaults27(full));
      expect(rivOf29(quick)).toBe(riv);
      expect(pt(statusLineOf29(quick))).toBe(pt(statusLine29(career, sit, riv)));
    }
    // a escolha "mistura realista" pela rápida é a mesma config de quem nunca mexeu
    expect(quickRunConfig27({ ...quickDefaults27('r29r-m', 'Selo'), rivals29: 'mix' })).toEqual(quickRunConfig27(quickDefaults27('r29r-m', 'Selo')));
    // cenário histórico tem os próprios rivais (como no start29)
    const sc = quickRunConfig27({ ...quickDefaults27('r29r-s', 'Selo'), rivals29: 'giants' });
    sc.scenario17 = 'soul_1972';
    expect(buildRun27(sc).rivals29).toBeUndefined();
    expect(buildRun27(quickRunConfig27({ ...quickDefaults27('r29r-s', 'Selo'), rivals29: 'giants' })).rivals29).toBe('giants');
  });
});

describe('r29 — nível dos rivais: o mundo gerado', () => {
  it('padrão (sem campo ou "mix") é idêntico ao mundo de sempre', () => {
    const a = game('r29r-def', 1975);
    const b = game('r29r-def', 1975, 'mix');
    const strip = (s: GameState) => JSON.stringify({ ...s, config: { ...s.config, rivals29: undefined } });
    expect(strip(b)).toBe(strip(a));
    expect(rivals29St(a)).toBeUndefined();
    expect('rivals29' in (a.x4 as object)).toBe(false);
  });

  it('determinismo: mesma semente + mesmo nível = mesmo mundo; o sorteio principal não muda', () => {
    const x = game('r29r-det', 1990, 'giants'), y = game('r29r-det', 1990, 'giants');
    expect(JSON.stringify(y)).toBe(JSON.stringify(x));
    const z = game('r29r-det', 1990, 'leader');
    expect(rivals29St(z)!.big).toHaveLength(1);
    expect(JSON.stringify(z.labels)).not.toBe(JSON.stringify(x.labels));
    // gerador próprio: o estado do sorteio principal é o mesmo do mundo padrão
    expect(x.rng).toEqual(game('r29r-det', 1990).rng);
  });

  for (const year of ERAS) {
    it(`escada monotônica em ${year}: caixa, fama e fatia dos rivais; hipster artístico; um líder dominante`, () => {
      const G = Object.fromEntries(RIVS29.map((d) => [d.id, game(`r29r-${year}`, year, d.id)])) as Record<Riv29, GameState>;
      const m = Object.fromEntries(RIVS29.map((d) => [d.id, measure(G[d.id])])) as Record<Riv29, M>;
      for (const d of RIVS29) sane(G[d.id]);
      for (let i = 1; i < CHAIN.length; i++) {
        const [a, b] = [m[CHAIN[i - 1]], m[CHAIN[i]]];
        expect(b.cash, `caixa ${CHAIN[i - 1]} < ${CHAIN[i]}`).toBeGreaterThan(a.cash);
        expect(b.fame, `fama ${CHAIN[i - 1]} < ${CHAIN[i]}`).toBeGreaterThan(a.fame);
        expect(b.share, `fatia ${CHAIN[i - 1]} < ${CHAIN[i]}`).toBeGreaterThan(a.share);
      }
      // a mistura realista fica entre os médios e os estabelecidos
      expect(m.mix.cash).toBeGreaterThan(m.mid.cash);
      expect(m.mix.cash).toBeLessThan(m.established.cash);
      // hipster: prestígio artístico muito acima do alcance comercial (e mais que qualquer outro nível)
      expect(m.hipster.ratio).toBeGreaterThan(2.5);
      for (const d of RIVS29) if (d.id !== 'hipster') expect(m.hipster.ratio).toBeGreaterThan(m[d.id].ratio);
      expect(m.hipster.cash).toBeLessThan(m.mix.cash);
      // um líder dominante: um gigante com a maior parte do caixa e o maior elenco; os outros, pequenos
      expect(m.leader.big).toBe(1);
      expect(m.leader.top).toBeGreaterThan(0.5);
      expect(m.leader.top).toBeGreaterThan(m.giants.top);
      expect(m.leader.topRoster).toBeGreaterThan(m.mix.topRoster);
      const L = G.leader, big = L.labels[rivals29St(L)!.big[0]];
      for (const lb of Object.values(L.labels)) if (lb.active && lb.id !== big.id) expect(lb.roster.length).toBeLessThanOrEqual(4);
      // gigantes: até 5 (menos nas eras antigas), majors com os mercados que a era alcança
      expect(m.giants.big).toBe(Math.min(eraBig29(year, 5), Object.values(G.giants.labels).filter((x) => x.active).length));
      for (const id of rivals29St(G.giants)!.big) {
        const lb = G.giants.labels[id];
        expect(lb.family).toBe('A');
        expect(rivalRep29(G.giants, id).com).toBeGreaterThanOrEqual(80);
        for (const t of lb.territories) expect(eraWorld29(year, lb.territories[0]).includes(t)).toBe(true);
      }
      // do zero: ninguém com mais de um artista, todos independentes pequenos e só na praça de casa
      for (const lb of Object.values(G.zero.labels)) if (lb.active) { expect(lb.roster.length).toBeLessThanOrEqual(1); expect(lb.family).toBe('B'); expect(lb.territories).toHaveLength(1); }
      // agressividade sobe com o porte
      const agg = (s: GameState) => { const ls = Object.values(s.labels).filter((x) => x.active); return ls.reduce((t, x) => t + x.aggression, 0) / ls.length; };
      expect(agg(G.zero)).toBeLessThan(agg(G.mix));
      expect(agg(G.giants)).toBeGreaterThan(agg(G.mix));
      // memória da partida explica o nível
      expect(G.giants.memory.some((x) => x.kind === 'rivals29')).toBe(true);
      expect(G.mix.memory.some((x) => x.kind === 'rivals29')).toBe(false);
    });
  }

  it('escala com a economia da era: 1889 não ganha cofres nem cinco majors de 1990', () => {
    expect(eraBig29(1889, 5)).toBe(2);
    expect(eraBig29(1935, 5)).toBe(3);
    expect(eraBig29(1990, 5)).toBe(5);
    expect(eraWorld29(1889, 'eu')).toEqual(['eu', 'na']);
    const old = measure(game('r29r-era', 1889, 'giants')), mod = measure(game('r29r-era', 1990, 'giants'));
    expect(old.big).toBeLessThanOrEqual(2);
    expect(old.cash).toBeLessThan(mod.cash / 5);
  });

  it('as 8 opções funcionam nas 12 carreiras e em 4 eras (negócios rivais da carreira quando existem)', () => {
    expect(CAREERS29).toHaveLength(12);
    const ids = RIVS29.map((d) => d.id).filter((x) => x !== 'mix');
    let k = 0;
    for (const year of ERAS) for (const career of CAREERS29) {
      const riv = ids[k++ % ids.length];
      const s = game(`r29r-c-${career}`, year, riv, career);
      sane(s);
      const st = rivals29St(s)!;
      expect(st.lv).toBe(riv);
      expect(Object.keys(st.rep).length).toBeGreaterThan(0);
      // negócio rival da carreira (estúdio, festival, agência, editora, mídia, plataforma) só quando a era tem esse negócio
      const vk = ({ festival: 'festival', publisher: 'publisher', studio: 'studio', booking: 'booking', media: 'media', platform: 'platform' } as Record<string, keyof typeof VKINDS>)[career];
      const want = riv29ById(riv)!.ven.n + (riv29ById(riv)!.ven.top?.[0] ?? 0);
      if (vk && year >= VKINDS[vk].from && want > 0) expect(ventures(s).npc.filter((n) => n.kind === vk).length).toBeGreaterThan(0);
      if (vk && year < VKINDS[vk].from) expect(ventures(s).npc.filter((n) => n.kind === vk)).toHaveLength(0);
    }
  });

  it('todas as opções sobre o mesmo mundo, para cada carreira (gancho aplicado a cópias)', () => {
    for (const career of CAREERS29) {
      const base = game(`r29r-x-${career}`, 1990, undefined, career);
      for (const d of RIVS29) {
        if (d.id === 'mix') continue;
        const s = JSON.parse(JSON.stringify(base)) as GameState;
        const st = applyRivals29(s, d);
        sane(s);
        expect(st.lv).toBe(d.id);
        if (d.all?.cap !== undefined) for (const lb of Object.values(s.labels)) if (lb.active && !st.big.includes(lb.id)) expect(lb.roster.length).toBeLessThanOrEqual(d.all.cap);
      }
    }
  });

  it('cenário histórico, "assumir gravadora" e um "Como começam" explícito têm precedência', () => {
    const plain = game('r29r-ov', 1962);
    const lb = Object.values(plain.labels).find((x) => x.active)!;
    const tk = game('r29r-ov', 1962, 'giants', 'label', { takeover: lb.id });
    expect(rivals29St(tk)).toBeUndefined();
    const ls = game('r29r-ov', 1962, 'zero', 'label', { labels: { start: 'startups' } });
    expect(rivals29St(ls)).toBeUndefined();
    const sc = game('r29r-ov', 1962, 'leader', 'label', { scenario17: 'soul_1972' });
    expect(rivals29St(sc)).toBeUndefined();
  });
});
