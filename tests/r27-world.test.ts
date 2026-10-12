import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { resolveDecision } from '../src/sim/events';
import { applyMods } from '../src/sim/ext4';
import { emitFact, recentFacts } from '../src/sim/facts17';
import { CATALOG_ADJ } from '../src/sim/rights';
import { scandal } from '../src/sim/scandal17';
import type { Act, GameState, Release } from '../src/sim/types';
import { sc27, scenes27Month, rideMult27, PH27 } from '../src/sim/sys/scenes27';
import { copyAnswer27, makeCopy27, rivalMemory27, rivals27Month, rv27, temper27 } from '../src/sim/sys/rivals27';
import { cityEcon27 } from '../src/sim/sys/cities27';
import { h27, hist27Month, hist27Mult } from '../src/sim/sys/hist27';
import { cq27, legendMult27 } from '../src/sim/sys/conseq27';
import { censorOdds18 } from '../src/sim/sys/society18';
import { MILESTONES } from '../src/sim/sys/world4/milestones';

const own = (s: GameState, f: (a: Act) => boolean = () => true): Act => {
  const a = Object.values(s.acts).filter((x) => x.status !== 'retired' && x.status !== 'split' && x.members.length >= 1 && !x.catalogNo && !x.deceased && f(x)).sort((x, y) => x.id.localeCompare(y.id))[0];
  a.owner = 'player'; a.status = 'active';
  return a;
};
let relSeq = 0;
function rel(s: GameState, a: Act, o: Partial<Release> = {}): Release {
  const r = { id: `r27t_${++relSeq}`, actId: a.id, owner: 'player', title: `Teste ${relSeq}`, type: 'single', week: s.week, territories: ['na', 'eu', 'br'], formats: ['single45'], peak: 999,
    songs: [], weekly: [], revenue: 0, totalUnits: 0, weeksOnChart: 0, marketing: [], q: 60, appeal: 1, ...o } as unknown as Release;
  s.releases[r.id] = r;
  a.releases.push(r.id);
  return r;
}
const labelsOf = (f: { factors: { label: { pt: string } }[] }) => f.factors.map((x) => x.label.pt).join(' | ');
const step = (s: GameState) => { s.week += 4; s.month = (s.month + 1) % 12; if (s.month === 0) s.year++; };

describe('r27 cenas — nascem, crescem, saturam e morrem, com causas', () => {
  it('hit do jogador planta cena (casa fundadora, fundador, fato) e a cena percorre as fases até morrer', () => {
    const s = createGame(defaultConfig('r27-sc', { startYear: 1977 }));
    const a = own(s);
    s.scenes[`${a.city}:${a.genre}`] = 0;
    rel(s, a, { peak: 4 });
    scenes27Month(s);
    const sc = sc27(s).list.find((x) => x.src === 'hit')!;
    expect(sc).toBeTruthy();
    expect(sc.founders).toEqual([a.id]);
    expect(sc.venue.length).toBeGreaterThan(3);
    expect(sc.cities[0].c).toBe(a.city);
    expect(recentFacts(s, { kind: 'scene_life', months: 1 }).some((f) => f.tags.includes('seed'))).toBe(true);
    // nascimento → crescimento → auge → saturação → declínio → morte
    sc.heat = 34.5; step(s); scenes27Month(s); expect(sc.ph).toBe('growing');
    sc.heat = 69.5; step(s); scenes27Month(s); expect(sc.ph).toBe('peak');
    // expansão: no auge, com o tempo chega a outras cidades com motivo escrito
    for (let i = 0; i < 80 && sc.cities.length < 2; i++) { sc.heat = 80; sc.sat = 5; sc.phW = s.week; step(s); scenes27Month(s); }
    expect(sc.cities.length).toBeGreaterThan(1);
    expect(sc.cities[1].why.pt.length).toBeGreaterThan(10);
    expect(s.scenes[`${sc.cities[1].c}:${sc.genre}`] ?? 0).toBeGreaterThan(0);
    sc.sat = 59.9; step(s); scenes27Month(s); expect(sc.ph).toBe('saturated');
    sc.heat = 30.5; step(s); scenes27Month(s); expect(sc.ph).toBe('fading');
    sc.heat = 6.5; step(s); scenes27Month(s); expect(sc.ph).toBe('dead');
    expect(sc.cause?.pt.length).toBeGreaterThan(10);
    expect(sc.log.length).toBeGreaterThan(4);
    expect(PH27[sc.ph].en).toBe('dead');
  });

  it('entrar cedo rende bônus; chegar tarde numa cena saturada da sua cidade custa apelo', () => {
    const s = createGame(defaultConfig('r27-ride', { startYear: 1985 }));
    const a = own(s);
    s.scenes[`${a.city}:${a.genre}`] = 0;
    rel(s, a, { peak: 3 });
    scenes27Month(s);
    const sc = sc27(s).list.find((x) => x.src === 'hit')!;
    expect(rideMult27(s, { ph: 'born', w: 0, y: 0 }, sc, true)).toBeGreaterThan(1.1);
    sc.ph = 'saturated';
    expect(rideMult27(s, { ph: 'saturated', w: 0, y: 0 }, sc, true)).toBeLessThan(1);
    sc.ph = 'growing';
    sc27(s).ride[`${a.id}:${sc.id}`] = { ph: 'born', w: s.week, y: s.year };
    const r2 = rel(s, a);
    expect(labelsOf(applyMods(s, 'appeal', 100, { release: r2, act: a }))).toContain('Chegou cedo');
  });
});

describe('r27 rivais — personalidade, memória e imitadores', () => {
  it('leilão vencido e artista levado do rival viram mágoa com lembrança; mágoa alta vira reação no noticiário', () => {
    const s = createGame(defaultConfig('r27-rv', { startYear: 1980 }));
    const lb = Object.values(s.labels).filter((x) => x.active).sort((x, y) => x.id.localeCompare(y.id))[0];
    const a = own(s);
    s.auctions.push({ id: 'au27', actId: a.id, bids: [{ party: 'player', advance: 1000, royalty: 0.15 }, { party: lb.id, advance: 950, royalty: 0.15 }], round: 3, endsWeek: s.week, status: 'won' });
    rivals27Month(s);
    const m = rivalMemory27(s, lb.id)!;
    expect(m.g).toBeGreaterThan(15);
    expect(m.mem[0].t.pt).toContain(a.name);
    expect(['vengeful', 'cold', 'copycat', 'proud']).toContain(temper27(s, lb));
    const b = own(s, (x) => x.id !== a.id);
    s.contracts.k27old = { id: 'k27old', actId: b.id, party: lb.id, startWeek: s.week - 100, endWeek: s.week + 40 } as never;
    s.contracts.k27new = { id: 'k27new', actId: b.id, party: 'player', startWeek: s.week, endWeek: s.week + 200 } as never;
    rivals27Month(s);
    expect(rivalMemory27(s, lb.id)!.mem[0].t.pt).toContain(b.name);
    expect(recentFacts(s, { kind: 'rival_grudge', months: 2 }).length).toBeGreaterThan(0);
    const x = rv27(s).L[lb.id];
    x.g = 90;
    for (let i = 0; i < 30 && !x.mem.some((y) => y.d === 0); i++) { x.g = 90; step(s); rivals27Month(s); }
    expect(x.mem.some((y) => y.d === 0)).toBe(true);
  });

  it('imitador copia o hit: ato clonado no rival, fato, cartão e apelo dividido; responder em público ajuda', () => {
    const s = createGame(defaultConfig('r27-cp', { startYear: 1990 }));
    const lb = Object.values(s.labels).filter((x) => x.active).sort((x, y) => x.id.localeCompare(y.id))[0];
    const a = own(s);
    const hit = rel(s, a, { peak: 2 });
    const c = makeCopy27(s, Rng.fromSeed('r27cp'), hit, lb)!;
    expect(s.acts[c.clone].owner).toBe(lb.id);
    expect(s.acts[c.clone].genre).toBe(a.genre);
    expect(recentFacts(s, { kind: 'copycat', months: 1 }).length).toBe(1);
    const r2 = rel(s, a);
    expect(labelsOf(applyMods(s, 'appeal', 100, { release: r2, act: a }))).toContain('Imitação');
    const mom = a.momentum;
    copyAnswer27(s, c.id, 'mock');
    expect(a.momentum).toBeGreaterThan(mom);
    expect(c.st).toBe('answered');
  });
});

describe('r27 cidades — economia própria', () => {
  it('poder de compra, ingresso médio, mídia e leis; tocar em casa é neutro', () => {
    const s = createGame(defaultConfig('r27-city', { startYear: 1975, homeCity: 'sao_paulo' }));
    const ny = cityEcon27(s, 'new_york'), lg = cityEcon27(s, 'lagos'), sp = cityEcon27(s, 'sao_paulo');
    expect(sp.price).toBe(1);
    expect(ny.price).toBeGreaterThan(1);
    expect(lg.price).toBeLessThan(1);
    expect(ny.ticket).toBeGreaterThan(lg.ticket);
    expect(ny.media).toBeGreaterThan(0);
    expect(sp.laws.length).toBeGreaterThan(0); // ditadura brasileira em 1975
    const a = own(s);
    expect(labelsOf(applyMods(s, 'showRevenue', 1000, { act: a, cityId: 'new_york' }))).toContain('Poder de compra');
  });
});

describe('r27 história real como cartões de decisão', () => {
  it('1959: audiências do jabá abrem cartão; "abrir os livros" zera o calor e vira história da partida', () => {
    const s = createGame(defaultConfig('r27-pay', { startYear: 1959 }));
    own(s);
    let n = 0;
    while (!s.decisions.some((d) => d.eventId === 'h27_payola') && n++ < 14) { s.player.cash = Math.max(s.player.cash, 5e6); advanceMonth(s); }
    const d = s.decisions.find((x) => x.eventId === 'h27_payola')!;
    expect(d).toBeTruthy();
    resolveDecision(s, d.id, 'books');
    expect(h27(s).st.payola).toBe('books');
    expect(recentFacts(s, { kind: 'real_history', months: 2 }).some((f) => f.tags.includes('h27_payola'))).toBe(true);
  });

  it('marcos ligados: AI-5 só para quem tem pé no Brasil e muda a censura; disco 1979 e streaming 2008 com efeitos que duram', () => {
    const ai5 = MILESTONES.find((m) => m.id === 'h19_tropicalia')!;
    expect(ai5.event).toBe('h27_ai5');
    const s = createGame(defaultConfig('r27-ai5', { startYear: 1969, homeCity: 'sao_paulo' }));
    const a = own(s);
    a.city = 'sao_paulo'; a.genre = 'mpb';
    expect(ai5.ctx!(s)?.act).toBe(a.id);
    const p0 = censorOdds18(s, a)!.p;
    h27(s).st.ai5 = 'submit';
    expect(censorOdds18(s, a)!.p).toBeLessThan(p0);
    const us = createGame(defaultConfig('r27-ai5us', { startYear: 1969, homeCity: 'new_york' }));
    const b = own(us); b.city = 'new_york';
    expect(ai5.ctx!(us)).toBeNull();

    expect(MILESTONES.find((m) => m.id === 'disco_demolition')!.event).toBe('h27_disco');
    a.genre = 'disco';
    h27(s).st.disco = 'rebrand';
    s.year = 1980;
    expect(hist27Mult(s, a, { type: 'single', formats: ['single45'], territories: ['na'] })?.k).toBe(1.12);

    expect(MILESTONES.find((m) => m.id === 'h19_spotify')!.event).toBe('h27_stream');
    h27(s).st.stream = 'equity';
    s.year = 2018; s.month = 4;
    const cash = s.player.cash;
    hist27Month(s);
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(recentFacts(s, { kind: 'real_history', months: 1 }).some((f) => f.tags.includes('ipo'))).toBe(true);
  });

  it('disco 1979 abre cartão para quem tem ato de disco', () => {
    const s = createGame(defaultConfig('r27-disco', { startYear: 1979 }));
    const a = own(s);
    a.genre = 'disco';
    let n = 0;
    while (!s.decisions.some((d) => d.eventId === 'h27_disco') && n++ < 10) { s.player.cash = Math.max(s.player.cash, 5e6); advanceMonth(s); }
    const d = s.decisions.find((x) => x.eventId === 'h27_disco')!;
    expect(d?.ctx.act).toBe(a.id);
    resolveDecision(s, d.id, 'export');
    expect(h27(s).st.disco).toBe('export');
  });
});

describe('r27 consequências que se espalham', () => {
  it('escândalo do jogador derruba vendas mais em uns mercados que em outros; esfria com o tempo', () => {
    const s = createGame(defaultConfig('r27-rip', { startYear: 1975 }));
    const a = own(s);
    a.city = 'sao_paulo';
    s.player.territories = ['na', 'eu', 'br'] as never;
    const r = rel(s, a, { territories: ['na', 'eu', 'br'] as never });
    scandal(s, a.id, 'sex', 70);
    const rip = cq27(s).rip[a.id];
    expect(rip).toBeTruthy();
    const ks = Object.values(rip.m);
    expect(ks.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...ks) - Math.min(...ks)).toBeGreaterThan(0.01);
    expect(recentFacts(s, { kind: 'scandal_ripple', months: 1 }).length).toBe(1);
    expect(labelsOf(applyMods(s, 'chartUnits', 1000, { release: r }))).toContain('Escândalo');
  });

  it('morte do rosto do ato: lenda, catálogo vende mais e vale mais', () => {
    const s = createGame(defaultConfig('r27-leg', { startYear: 1975 }));
    const a = own(s);
    a.fame = 62;
    const old = rel(s, a, { week: s.week - 60 });
    const pid = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0];
    s.persons[pid].alive = false;
    emitFact(s, { kind: 'death', actors: [pid, a.id], severity: 70, text: { pt: 'morte', en: 'death' } });
    const g = cq27(s).leg[a.id];
    expect(g?.legend).toBe(true);
    expect(a.legend).toBe(true);
    expect(legendMult27(s, a.id)).toBeGreaterThan(1.3);
    expect(labelsOf(applyMods(s, 'chartUnits', 1000, { release: old }))).toContain('lenda');
    expect(CATALOG_ADJ.reduce((k, f) => k * f(s, old), 1)).toBeGreaterThan(1.2);
    expect(recentFacts(s, { kind: 'legend', months: 1 }).length).toBe(1);
  });
});

describe('r27 determinismo', () => {
  it('mesma semente → mesmo mundo (estado novo e geradores do jogo)', () => {
    const a = createGame(defaultConfig('r27-det', { startYear: 1975 }));
    const b = createGame(defaultConfig('r27-det', { startYear: 1975 }));
    for (let i = 0; i < 2; i++) { advanceMonth(a); advanceMonth(b); }
    const x = (s: GameState) => (s as unknown as { x4: Record<string, unknown> }).x4;
    expect(JSON.stringify(x(b).sc27)).toBe(JSON.stringify(x(a).sc27));
    expect(JSON.stringify(x(b).rv27)).toBe(JSON.stringify(x(a).rv27));
    expect(JSON.stringify(x(b).rng19)).toBe(JSON.stringify(x(a).rng19));
  });
});
