// R31 · onda 3 (U) — facções por país: cobertura por país e época, presença só no país da sede, intermediário (custo,
// prazo, falha, traição), expansão anual determinística, conhecimento (know.ts), opinião (opinion.ts), editor e
// "explorar não muda o mundo".
import { beforeAll, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { ORGS17 } from '../src/data/orgs17';
import { CYBER29, STREET29 } from '../src/data/cyber29';
import { ORGS19 } from '../src/data/media19b';
import { FAC31, allFac31, citiesByCountry31, facGen31 } from '../src/data/fac31';
import { REALNAMES31 } from '../src/data/realnames31';
import { cityById } from '../src/data/world';
import { crime17, orgById, orgs17 } from '../src/sim/sys/crime17';
import { OPEN31, coverage31, expandYear31, fac31, facOpKey31, foreignOrgs31, home31, localOrgs31, neighbors31, present31, pull31 } from '../src/sim/sys/fac31';
import { BROKER_KEY31, brokerHire31, brokerList31, brokerQuote31, deals31, broker31 } from '../src/sim/sys/broker31';
import { _mob29, hireOdds29, present29 } from '../src/sim/sys/mob29';
import { orgKnow31, orgPowerBand31, orgSees31 } from '../src/sim/know';
import { opinionRaw, putOpinion } from '../src/sim/opinion';
import { setSw, switchDef } from '../src/sim/r31/switches';
import { STREAMS19, rngSnapshot19 } from '../src/sim/rng19';
import { calendar19, deadlineProviders19 } from '../src/sim/calendar19';
import { editableById, runnableById } from '../src/sim/r31/editor';
import { recentFacts } from '../src/sim/facts17';
import { l } from '../src/data/world';

const clone = (s: GameState): GameState => structuredClone(s);
let G75: GameState; // Londres, 1975
let G00: GameState; // 2000 (crime digital sem fronteira)
const labelTarget = (s: GameState): string => Object.values(s.labels).find((x) => x.id !== 'player' && !x.id.startsWith('player'))!.id;

beforeAll(() => {
  G75 = createGame(defaultConfig('u31t', { startYear: 1975 }));
  G00 = createGame(defaultConfig('u31t2', { startYear: 2000 }));
  for (const s of [G75, G00]) s.player.cash += 50_000_000;
});

describe('U · dados: facções por país e época', () => {
  it('todo país com cidade no jogo tem facção em cada época (1889–2040)', () => {
    const by = citiesByCountry31();
    const all = [...ORGS17, ...ORGS19, ...STREET29, ...allFac31()].filter((o) => o.city);
    for (const a3 of Object.keys(by)) for (const y of [1889, 1905, 1925, 1945, 1960, 1975, 1990, 2005, 2020, 2040]) {
      const n = all.filter((o) => o.from <= y && y <= o.to && (cityById[o.city] ? by[a3].includes(o.city) : false)).length;
      expect(n, `${a3} ${y}`).toBeGreaterThan(0);
    }
  });
  it('as novas são inventadas, com cidade válida, época, textos bilíngues e ids únicos (nada no registro de nomes reais)', () => {
    const ids = [...ORGS17, ...ORGS19.filter((x) => !ORGS17.includes(x)), ...CYBER29, ...STREET29, ...allFac31()].map((o) => o.id); // media19 junta ORGS19 em ORGS17
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of allFac31()) {
      expect(o.real, o.id).toBe(false);
      expect(cityById[o.city], o.id).toBeTruthy();
      expect(o.from).toBeLessThan(o.to);
      for (const t of [o.name, o.desc]) { expect(t.pt.length).toBeGreaterThan(3); expect(t.en.length).toBeGreaterThan(3); expect(t.pt + t.en).not.toMatch(/\{|undefined|NaN/); }
      expect(o.rackets.length).toBeGreaterThan(0);
    }
    expect(FAC31.length).toBeGreaterThanOrEqual(50);
    expect(facGen31().length).toBeGreaterThan(50);
    expect(Object.keys(REALNAMES31).some((k) => k.split(':')[0].includes('fac') || REALNAMES31[k].tipo === 'faction')).toBe(false); // espaço do registro (lugares reais como "Factory" não contam)
  });
  it('não vão para o mapa nem para os NPCs: a lista padrão continua a de sempre', () => {
    const ids = new Set(allFac31().map((o) => o.id));
    expect(orgs17(G75).some((o) => ids.has(o.id))).toBe(false);
    const s = clone(G75); setSw(s, 'u31', false);
    expect(orgs17(s, false, true).some((o) => ids.has(o.id))).toBe(false);
    expect(orgs17(G75, false, true).some((o) => ids.has(o.id))).toBe(true);
    expect(orgById(G75, 'fmilieu')?.a3).toBe('FRA');
  });
  it('vizinhos: estáticos, simétricos o bastante e sem o próprio país', () => {
    expect(neighbors31('FRA')).toEqual(expect.arrayContaining(['BEL']));
    for (const a3 of Object.keys(citiesByCountry31())) { const nb = neighbors31(a3); expect(nb.length).toBeGreaterThan(0); expect(nb).not.toContain(a3); }
  });
});

describe('U · presença no país da sede', () => {
  it('interruptor registrado (padrão ligado)', () => {
    expect(switchDef('u31')?.def).toBe(true);
    expect(STREAMS19.fac31).toBeTruthy();
    expect(STREAMS19.broker31).toBeTruthy();
  });
  it('só as facções do seu país agem direto; as de fora ficam bloqueadas (motivo) e vão ao intermediário', () => {
    const s = G75;
    const home = home31(s);
    const local = localOrgs31(s);
    expect(local.length).toBeGreaterThan(0);
    expect(local.every((o) => present31(s, o, home))).toBe(true);
    const yak = orgById(s, 'yamaguchi')!;
    expect(present29(yak, home, s)).toBe(false);
    expect(hireOdds29(s, 'yamaguchi', 'wiretap', labelTarget(s)).block?.pt).toBe(_mob29.B.far.pt);
    expect(foreignOrgs31(s).some((o) => o.id === 'yamaguchi')).toBe(true);
    // desligado: a regra antiga (poder ≥ 85 = alcance internacional)
    const off = clone(s); setSw(off, 'u31', false);
    expect(present29(orgById(off, 'yamaguchi')!, home, off)).toBe(true);
  });
  it('crime digital: sem fronteira depois da internet', () => {
    const fs = orgById(G00, 'fstream')!;
    expect(present31(G00, fs, home31(G00))).toBe(true);
    expect(brokerList31(G00).some((g) => g.a3 === '*')).toBe(false); // presente: não precisa do intermediário
  });
});

describe('U · intermediário', () => {
  it('cotação: mais cara que o serviço direto, com as partes, prazo e risco de traição; não muda o mundo', () => {
    const s = clone(G75);
    const t = labelTarget(s);
    const snap = rngSnapshot19(s), x4 = JSON.stringify(s.x4);
    const q = brokerQuote31(s, 'yamaguchi', 'wiretap', t);
    brokerList31(s); localOrgs31(s); foreignOrgs31(s);
    expect(rngSnapshot19(s)).toBe(snap);
    expect(JSON.stringify(s.x4)).toBe(x4);
    expect(q.block).toBeNull();
    expect(q.fee).toBeGreaterThan(0);
    expect(q.country).toBeGreaterThan(0);
    expect(q.cost).toBe(q.fam + q.fee + q.country);
    // mesma família, se estivesse no país (interruptor desligado): o intermediário custa mais e tem menos chance
    const off = clone(G75); setSw(off, 'u31', false);
    const d = hireOdds29(off, 'yamaguchi', 'wiretap', t);
    expect(d.block).toBeNull();
    expect(q.cost).toBeGreaterThan(d.cost);
    expect(q.p).toBeLessThan(d.p);
    expect(q.betray).toBeGreaterThan(0);
    expect(q.wHi).toBeGreaterThan(q.wLo);
    // mais calor = mais traição; intermediário amigo = menos
    const hot = clone(s); crime17(hot).heat[home31(hot)] = 60;
    expect(brokerQuote31(hot, 'yamaguchi', 'wiretap', t).betray).toBeGreaterThan(q.betray);
    const friend = clone(s); putOpinion(friend, BROKER_KEY31, 80);
    expect(brokerQuote31(friend, 'yamaguchi', 'wiretap', t).betray).toBeLessThan(q.betray);
    // facção do país: trate direto
    expect(brokerQuote31(s, localOrgs31(s)[0].id, 'assault', t).block).not.toBeNull();
  });
  it('crime digital depois da internet age direto: não passa pelo intermediário (nem paga taxa de país)', () => {
    const q00 = brokerQuote31(G00, 'fleak', 'cy:hack', labelTarget(G00));
    // fleak (1999+) já não tem fronteira em 2000: age direto, não vai ao intermediário
    expect(q00.block).not.toBeNull();
  });
  it('contratar: paga agora, entra no calendário, sai no prazo (determinístico), revela a facção e puxa a operação', () => {
    const s = clone(G75);
    const t = labelTarget(s);
    expect(orgKnow31(s, 'yamaguchi', { local: false, real: false })).toBe(0);
    const cash = s.player.cash;
    const q = brokerQuote31(s, 'yamaguchi', 'wiretap', t);
    const r = brokerHire31(s, 'yamaguchi', 'wiretap', t);
    expect(r.ok).toBe(true);
    expect(s.player.cash).toBe(cash - q.cost);
    expect(deals31(s).length).toBe(1);
    expect(brokerQuote31(s, 'yamaguchi', 'wiretap', t).block).not.toBeNull(); // um contrato por vez com a mesma facção
    expect(deadlineProviders19()).toContain('broker31');
    expect(calendar19(s, { weeks: 12 }).some((d) => d.id.startsWith('broker31:'))).toBe(true);
    expect(orgKnow31(s, 'yamaguchi')).toBe(2);
    expect(fac31(s).use.yamaguchi?.[home31(s)]).toBe(1);
    const a = clone(s), b = clone(s);
    for (let i = 0; i < 8; i++) { advanceWeek(a); advanceWeek(b); }
    expect(deals31(a).length).toBe(0);
    expect(JSON.stringify(broker31(a))).toBe(JSON.stringify(broker31(b)));
    expect(broker31(a).log.length).toBe(2);
  });
  it('traição acontece (com calor alto) e vira caso/fato secreto e opinião ruim do intermediário', () => {
    let betrayed = 0, delivered = 0;
    for (let k = 0; k < 12; k++) {
      const s = createGame(defaultConfig(`u31b${k}`, { startYear: 1975 }));
      s.player.cash += 50_000_000;
      crime17(s).heat[home31(s)] = 60;
      const t = labelTarget(s);
      const fo = foreignOrgs31(s).filter((o) => o.kind !== 'cyber' && !brokerQuote31(s, o.id, 'wiretap', t).block).slice(0, 3);
      for (const o of fo) brokerHire31(s, o.id, 'wiretap', t);
      for (let i = 0; i < 12; i++) advanceWeek(s);
      const f = recentFacts(s).filter((x) => x.kind === 'broker_betrayal');
      betrayed += f.length;
      if (f.length) expect(opinionRaw(s, BROKER_KEY31)).toBeLessThan(0);
      delivered += Object.values(broker31(s).done).reduce((x, y) => x + y, 0);
    }
    expect(betrayed).toBeGreaterThan(0);
    expect(delivered).toBeGreaterThan(0);
  });
});

describe('U · expansão', () => {
  it('determinística, só com o interruptor, e as fortes chegam com operação nos vizinhos', () => {
    const a = clone(G75), b = clone(G75);
    for (const s of [a, b]) for (let y = 0; y < 6; y++) { s.year++; expandYear31(s); }
    expect(JSON.stringify(fac31(a))).toBe(JSON.stringify(fac31(b)));
    expect(Object.keys(fac31(a).ops).length).toBeGreaterThan(0);
    expect(Object.values(fac31(a).g).some((v) => v > 0)).toBe(true);
    expect(Object.values(fac31(a).g).some((v) => v < 0)).toBe(true);
    // gancho do ano: desligado não roda
    const off = clone(G75); setSw(off, 'u31', false);
    for (let i = 0; i < 60; i++) advanceWeek(off);
    expect(fac31(off).y).toBe(0);
  });
  it('usar muito uma facção de fora a traz para o seu país: abre operação, as locais se irritam', () => {
    const s = clone(G75);
    const home = home31(s);
    const o = orgById(s, 'fmilieu')!;
    expect(present31(s, o, home)).toBe(false);
    const locals = localOrgs31(s).filter((x) => x.a3 === home);
    let opened = false;
    for (let y = 0; y < 6 && !opened; y++) { pull31(s, o.id, home, 4); s.year++; expandYear31(s); opened = present31(s, o, home); }
    expect(opened).toBe(true);
    expect(fac31(s).ops.fmilieu[home]).toBeGreaterThanOrEqual(OPEN31);
    expect(recentFacts(s).some((f) => f.kind === 'faction_expand' && f.actors.includes('o:fmilieu'))).toBe(true);
    expect(locals.some((x) => opinionRaw(s, facOpKey31(x.id)) < 0)).toBe(true);
    expect(localOrgs31(s).some((x) => x.id === 'fmilieu')).toBe(true);
  });
  it('cobertura: em 1975 todo país tem facção da época', () => {
    expect(Object.entries(coverage31(G75)).filter(([, v]) => !v)).toEqual([]);
  });
});

describe('U · conhecimento e editor', () => {
  it('você só vê o que sabe: de fora e sem contato, só nome e país', () => {
    const s = G75;
    expect(orgKnow31(s, 'fbund')).toBe(0);
    expect(orgSees31(0, 'name')).toBe(true);
    expect(orgSees31(0, 'rackets')).toBe(false);
    expect(orgSees31(1, 'rackets')).toBe(true);
    expect(orgPowerBand31(s, 'fbund', 60, 1)).toBeNull();
    const b = orgPowerBand31(s, 'fbund', 60, 2)!;
    expect(b.lo).toBeLessThanOrEqual(60); expect(b.hi).toBeGreaterThanOrEqual(60); expect(b.exact).toBe(false);
    expect(orgPowerBand31(s, 'fbund', 60, 3)!.exact).toBe(true);
    expect(orgKnow31(s, localOrgs31(s)[0].id, { local: true })).toBeGreaterThanOrEqual(1);
  });
  it('registro no editor', () => {
    for (const id of ['u31.brokerK', 'u31.brokerOp']) expect(editableById(id)).toBeTruthy();
    for (const id of ['u31.expand', 'u31.open', 'u31.resolve']) expect(runnableById(id)).toBeTruthy();
    const s = clone(G75);
    const r = runnableById('u31.open')!.run(s, undefined, 'fmilieu');
    expect(r && 'ok' in (r as object) ? (r as { ok: boolean }).ok : true).toBe(true);
    expect(present31(s, orgById(s, 'fmilieu')!, home31(s))).toBe(true);
    editableById('u31.brokerK')!.set(s, 2);
    const q1 = brokerQuote31(G75, 'yamaguchi', 'wiretap', labelTarget(G75)), q2 = brokerQuote31(s, 'yamaguchi', 'wiretap', labelTarget(s));
    expect(q2.fee).toBeGreaterThan(q1.fee);
    void l;
  });
});
