// R31 · onda 3 (E · Bolsa) — modelo único de valor (src/sim/r31/value31.ts): sobe com hit e contrato longo de
// estrela, cai com escândalo e dívida, sem dupla contagem, sem vazar potencial, determinístico, sem escorregão de janeiro.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { emitFact } from '../src/sim/facts17';
import { rngSnapshot19, STREAMS19 } from '../src/sim/rng19';
import { companyValue31, dealValue31, money12, stepPrice31, SW_VALUE31, value31On, type Value31 } from '../src/sim/r31/value31';
import { setSw } from '../src/sim/r31/switches';
import { bolsa } from '../src/sim/sys/bolsa10';
import { fairStakePrice } from '../src/sim/sys/stakes8';
import type { GameState, Label } from '../src/sim/types';

const part = (v: Value31, k: string): number => v.parts.filter((p) => p.k === k).reduce((t, p) => t + p.v, 0);
const clone = (s: GameState): GameState => structuredClone(s);

function world(seed = 'r31-bolsa', year = 1975): { s: GameState; lb: Label } {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  const lb = Object.values(s.labels).filter((x) => x.active && x.roster.some((id) => s.acts[id]?.contractId && s.contracts[s.acts[id].contractId!]?.party === x.id))
    .sort((a, b) => b.roster.length - a.roster.length)[0];
  return { s, lb };
}
const contracted = (s: GameState, lb: Label) => lb.roster.map((id) => s.acts[id]).filter((a) => a && a.contractId && s.contracts[a.contractId]?.party === lb.id);

describe('r31 E · valor por empresa', () => {
  it('interruptor ligado por padrão e chave de sorteio registrada', () => {
    const { s } = world();
    expect(value31On(s)).toBe(true);
    expect(STREAMS19.bolsa31?.length ?? 0).toBeGreaterThan(10);
  });

  it('sem dupla contagem: partes únicas somam o total; catálogo/empresa no balanço não somam de novo; dívida tira exatamente o que é', () => {
    const { s, lb } = world();
    for (const id of ['player', lb.id]) {
      const v = companyValue31(s, id);
      const keys = v.parts.map((p) => p.k);
      expect(new Set(keys).size).toBe(keys.length);
      expect(v.parts.reduce((t, p) => t + p.v, 0)).toBe(v.total);
    }
    // um catálogo comprado (ativo 'catalog') ou empresa ('company') entram pelo que rendem, não pelo valor contábil
    const a = clone(s);
    const v0 = companyValue31(a, 'player').total;
    a.assets.push({ id: 'x1', kind: 'catalog', name: 'c', cost: 9e8, bookValue: 9e8, lifeMonths: 120, boughtMonth: 0 });
    a.assets.push({ id: 'x2', kind: 'company', name: 'c', cost: 9e8, bookValue: 9e8, lifeMonths: 120, boughtMonth: 0 });
    expect(companyValue31(a, 'player').total).toBe(v0);
    // um equipamento entra só em "Bens", uma vez
    a.assets.push({ id: 'x3', kind: 'equipment', name: 'e', cost: 5e6, bookValue: 5e6, lifeMonths: 120, boughtMonth: 0 });
    const v1 = companyValue31(a, 'player');
    expect(v1.total - v0).toBe(5e6);
    // dívida do rival: o valor cai exatamente a dívida (nada mais reage a ela)
    const b = clone(s);
    const w0 = companyValue31(b, lb.id);
    b.labels[lb.id].debt = (b.labels[lb.id].debt ?? 0) + 3e8;
    const w1 = companyValue31(b, lb.id);
    expect(w0.total - w1.total).toBe(3e8);
    expect(part(w0, 'debt') - part(w1, 'debt')).toBe(3e8);
  });

  it('sobe com hit e com contrato longo de estrela', () => {
    const { s, lb } = world();
    // hit: um master do selo vendendo muito agora, pico nº 1
    const a = clone(s);
    const act = contracted(a, a.labels[lb.id])[0];
    const v0 = companyValue31(a, lb.id).total;
    const rel = Object.values(a.releases).find((r) => r.owner === lb.id && r.totalUnits > 0) ?? Object.values(a.releases).find((r) => r.owner === lb.id)!;
    rel.live = true; rel.week = a.week - 10; rel.peak = 1; rel.totalUnits = Math.max(1, rel.totalUnits) + 400_000; rel.revenue += 4e8;
    rel.weekly = [...rel.weekly, ...Array(13).fill(30_000)];
    expect(companyValue31(a, lb.id).total).toBeGreaterThan(v0);
    // estrela com contrato longo vale mais que com contrato acabando
    const b = clone(s);
    const st = contracted(b, b.labels[lb.id])[0];
    st.fame = 85;
    const c = b.contracts[st.contractId!];
    c.endWeek = b.week + 4;
    const short = companyValue31(b, lb.id);
    c.endWeek = b.week + 52 * 5;
    const long = companyValue31(b, lb.id);
    expect(part(long, 'roster')).toBeGreaterThan(part(short, 'roster'));
    expect(long.total).toBeGreaterThan(short.total);
    expect(act).toBeTruthy();
  });

  it('cai com escândalo (cada fato uma vez) e com dívida', () => {
    const { s, lb } = world();
    const a = clone(s);
    const act = contracted(a, a.labels[lb.id])[0];
    const v0 = companyValue31(a, lb.id);
    emitFact(a, { kind: 'scandal', actors: [act.id], severity: 80, visibility: 'public', text: { pt: 'escândalo de teste', en: 'test scandal' } });
    const v1 = companyValue31(a, lb.id);
    expect(part(v1, 'events')).toBeLessThan(part(v0, 'events'));
    expect(v1.total).toBeLessThan(v0.total);
    // ler de novo não conta o mesmo fato outra vez
    expect(companyValue31(a, lb.id).total).toBe(v1.total);
    // segredo não é visto pelo mercado
    const b = clone(s);
    emitFact(b, { kind: 'scandal', actors: [contracted(b, b.labels[lb.id])[0].id], severity: 80, visibility: 'secret', text: { pt: 'segredo', en: 'secret' } });
    expect(part(companyValue31(b, lb.id), 'events')).toBe(part(v0, 'events'));
    // dívida do seu selo
    const c = clone(s);
    const p0 = companyValue31(c, 'player').total;
    c.player.loans.push({ id: 'ln', principal: 5e7, balance: 5e7, rate: 0.1, monthly: 1e6, startWeek: c.week });
    expect(companyValue31(c, 'player').total).toBeLessThan(p0);
  });

  it('não vaza potencial nem talento: o mercado só vê o que é público', () => {
    const { s, lb } = world();
    const a = clone(s);
    const acts = contracted(a, a.labels[lb.id]);
    for (const x of acts) x.potential = 0;
    for (const x of Object.values(a.songs)) x.q = 1;
    const lo = companyValue31(a, lb.id).total;
    for (const x of acts) x.potential = 100;
    for (const x of Object.values(a.songs)) x.q = 100;
    expect(companyValue31(a, lb.id).total).toBe(lo);
  });

  it('explorar não sorteia; o mesmo valor serve para participação e aquisição', () => {
    const { s, lb } = world();
    const r0 = rngSnapshot19(s);
    companyValue31(s, lb.id); companyValue31(s, 'player'); dealValue31(s, lb.id, 0.3);
    expect(rngSnapshot19(s)).toBe(r0);
    const v = companyValue31(s, lb.id).total;
    expect(dealValue31(s, lb.id, 0.1)).toBe(Math.round(v * 0.1));
    expect(dealValue31(s, lb.id, 0.6)).toBe(Math.round(v * 0.6 * 1.3));
    if (!bolsa(s).q[`lb:${lb.id}`]) expect(fairStakePrice(s, lb.id, 0.1)).toBe(Math.round(v * 0.1));
  });

  it('determinismo: duas partidas iguais dão os mesmos preços e valores', () => {
    const run = () => {
      const s = createGame(defaultConfig('r31-bolsa-det', { startYear: 1980 }));
      s.listing.listed = true; s.listing.floatShare = 0.25; s.listing.price = 4000; s.listing.history = [4000];
      for (let i = 0; i < 3; i++) advanceMonth(s);
      return JSON.stringify([s.listing.price, Object.entries(bolsa(s).q).map(([k, q]) => [k, q.p]), companyValue31(s, 'player').total]);
    };
    expect(run()).toBe(run());
  });

  it('sem escorregão na virada do ano: 12 meses fechados iguais dão o mesmo valor em dezembro e em janeiro', () => {
    const { s } = world('r31-bolsa-jan', 1965);
    const m: Record<number, Record<string, number>> = {};
    const Y = 1966;
    for (let k = (Y - 2) * 12; k < (Y + 2) * 12; k++) m[k] = { 'rev:rec': 3e6, 'rev:pub': 5e5, 'cost:ovh': -2e6 };
    (s.player as unknown as { fin18: unknown }).fin18 = { y: {}, m, ar: [], ap: [], auto: true, delayRoy: false, lost: [], late: {}, lostPerYear: 0 };
    s.player.revenueByYear = {};
    s.player.profitByYear = {};
    const dec = clone(s); dec.year = Y; dec.month = 11;
    const jan = clone(s); jan.year = Y + 1; jan.month = 0;
    expect(money12(dec, 'player').rev).toBe(money12(jan, 'player').rev);
    expect(money12(jan, 'player').op).toBe(money12(dec, 'player').op);
    // o valor (e o preço-alvo) não cai em janeiro só porque o ano novo começou vazio
    const vd = companyValue31(dec, 'player').total;
    const vj = companyValue31(jan, 'player').total;
    expect(Math.abs(vj / vd - 1)).toBeLessThan(0.01);
    // e o passo de preço com o valor parado fica perto do valor (só o humor pequeno)
    for (const x of [dec, jan]) {
      x.listing.listed = true;
      const per = companyValue31(x, 'player').total / x.listing.shares;
      const st = stepPrice31(x, 'player', Math.round(per), x.listing.shares);
      expect(Math.abs(st.p / per - 1)).toBeLessThan(0.06);
    }
  });

  it('motivo da queda nas notícias: a parte que mais mudou (dívida)', () => {
    const { s, lb } = world();
    const sh = 100_000;
    const p0 = Math.round(companyValue31(s, lb.id).total / sh);
    stepPrice31(s, lb.id, p0, sh);
    s.labels[lb.id].debt = (s.labels[lb.id].debt ?? 0) + Math.round(companyValue31(s, lb.id).total * 0.5);
    const st = stepPrice31(s, lb.id, p0, sh);
    expect(st.chg).toBeLessThan(-0.02);
    expect(st.why?.pt).toMatch(/caiu .*dívida maior/);
    expect(st.why?.en).toMatch(/fell .*higher debt/);
  });

  it('desligado volta ao modelo antigo (o valor não é usado no IPO)', () => {
    const { s } = world();
    setSw(s, SW_VALUE31, false);
    expect(value31On(s)).toBe(false);
  });
});
