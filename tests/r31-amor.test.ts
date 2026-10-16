// R31 · onda 4 (AMOR) — chamar qualquer pessoa para sair, ser amante e romance com o mercado.
// Determinismo (mesma partida → mesma resposta), recusa sempre com motivo, trava da família Fossati (os quatro e o
// Gianluca, por qualquer porta), descoberta vira trunfo + fato (e notícia), explorar não muda o mundo e interruptores
// desligados = comportamento antigo.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { FAMILY31 } from '../src/data/fossati31';
import { rngSnapshot19 } from '../src/sim/rng19';
import { setSw } from '../src/sim/r31/switches';
import { holds17 } from '../src/sim/holds17';
import { recentFacts } from '../src/sim/facts17';
import { putOpinion } from '../src/sim/opinion';
import { personActions18 } from '../src/sim/personact18';
import { life } from '../src/sim/sys/life';
import { AMOR17, affairRisk17, discoverAffair17, love17 } from '../src/sim/sys/love17';
import { ownerOf } from '../src/sim/sys/people/owner';
import {
  SW_AFFAIR31, SW_ASK31, SW_MARKET31, affairKey31, askLock31, askOdds31, askOut31, askRoll31, heart31, partnerKey31, riskParts31, romanceLock31, tieOf31, whoKnows31,
} from '../src/sim/sys/amor31';
import { advanceMonth } from '../src/sim/tick';

const game = (y = 1985, seed = 'r31amor'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const snap = (s: GameState) => JSON.stringify({ x4: s.x4, persons: s.persons, acts: s.acts, cash: s.player.cash, w: ownerOf(s).wealth, rng: rngSnapshot19(s) });
/** Adultos vivos do mundo que não são o jogador nem do seu elenco (em ordem estável). */
const adults = (s: GameState) => Object.values(s.persons).filter((p) => p.alive && !p.isPlayer && s.year - p.born >= 18 && s.year - p.born <= 60).sort((a, b) => (a.id < b.id ? -1 : 1));
/** Garante tempo livre e dinheiro pessoal para pedir (o teste não mede a agenda). */
const ready = (s: GameState) => { life(s).used = -20; ownerOf(s).wealth = Math.max(ownerOf(s).wealth, 5_000_000); };

describe('r31 AMOR: chamar para sair', () => {
  it('a resposta é determinística: mesma partida, mesma pessoa, mesmo mês → mesma chance, mesmo sorteio e mesmo resultado', () => {
    const a = game(), b = game();
    ready(a); ready(b);
    const ids = adults(a).slice(0, 12).map((p) => `p:${p.id}`);
    for (const k of ids) {
      expect(askOdds31(a, k).p).toBe(askOdds31(b, k).p);
      expect(askRoll31(a, k)).toBe(askRoll31(b, k));
    }
    const ra = ids.map((k) => askOut31(a, k)).map((r) => [r.ok, r.text.pt]);
    const rb = ids.map((k) => askOut31(b, k)).map((r) => [r.ok, r.text.pt]);
    expect(ra).toEqual(rb);
  });

  it('a recusa sempre diz o motivo (o fator que mais pesou contra)', () => {
    const s = game(1972);
    ready(s);
    let refused = 0;
    for (const p of adults(s).slice(0, 40)) {
      const k = `p:${p.id}`;
      putOpinion(s, k, -80);
      if (askLock31(s, k)) continue;
      const r = askOut31(s, k);
      if (r.ok) continue;
      refused++;
      expect(r.why, k).toBeTruthy();
      expect(r.text.pt).toMatch(/Motivo: .+/);
      expect(r.text.en).toMatch(/Reason: .+/);
      expect(r.text.pt).not.toMatch(/undefined|NaN|\[object/);
      // depois da recusa, a trava diz por quê e quando dá para tentar de novo
      const lk = askLock31(s, k);
      expect(lk?.why.pt).toMatch(/disse não/);
      expect(lk?.unlock.pt).toMatch(/semana/);
      if (refused >= 3) break;
    }
    expect(refused).toBeGreaterThan(0);
  });

  it('aceitar começa um namoro com a pessoa do mundo (par oficial com a chave dela)', () => {
    const s = game(1995);
    ready(s);
    let got: string | undefined;
    for (const p of adults(s)) {
      const k = `p:${p.id}`;
      if (askLock31(s, k) || askRoll31(s, k) >= askOdds31(s, k).p) continue;
      const r = askOut31(s, k);
      expect(r.ok).toBe(true);
      got = k;
      break;
    }
    expect(got).toBeTruthy();
    expect(partnerKey31(s)).toBe(got);
    expect(life(s).partner?.personId).toBe(got!.slice(2));
  });
});

describe('r31 AMOR: família Fossati nunca', () => {
  it('a trava única vale para os quatro e o Gianluca, por qualquer chave, e fecha o pedido e o menu', () => {
    const s = game(1990);
    ready(s);
    expect(FAMILY31.map((m) => m.id).sort()).toEqual(['antonella', 'efro', 'gianluca', 'lucia', 'sonia']);
    for (const m of FAMILY31) {
      for (const k of [`fam:${m.id}`, m.id]) {
        const lk = romanceLock31(s, k);
        expect(lk, k).toBeTruthy();
        expect(lk!.why.pt).toContain('Fossati');
        expect(askLock31(s, k)?.why.pt).toContain('Fossati');
      }
    }
    // uma pessoa do mundo com o nome da família também fica de fora (nenhuma porta escapa)
    const p = adults(s)[0];
    const old = p.name;
    p.name = 'Lucia Fossati';
    expect(romanceLock31(s, `p:${p.id}`)).toBeTruthy();
    expect(askOut31(s, `p:${p.id}`).ok).toBe(false);
    expect(personActions18(s, `p:${p.id}`).some((r) => r.def.id === 'amor31.ask' || r.def.id === 'flirt')).toBe(false);
    p.name = old;
    expect(romanceLock31(s, `p:${p.id}`)).toBeNull();
  });
});

/** Começa um caso com alguém do mundo (você já tem par). */
function withAffair(s: GameState): string {
  ready(s);
  const L0 = life(s);
  L0.partner = { name: 'Par Teste', born: s.year - 34, job: { pt: 'ar', en: 'ar' }, trait: 'zen', affinity: 60, since: s.week - 60, stage: 'married', lastDate: s.week, personId: undefined };
  for (const p of adults(s)) {
    const k = `p:${p.id}`;
    if (askLock31(s, k) || askRoll31(s, k) >= askOdds31(s, k).p) continue;
    expect(askOut31(s, k).ok).toBe(true);
    return k;
  }
  throw new Error('ninguém topou');
}

describe('r31 AMOR: casos e descoberta', () => {
  it('comprometido(a), o sim vira caso secreto com a pessoa do mundo, com risco e quem sabe na ficha', () => {
    const s = game(1988);
    const k = withAffair(s);
    expect(love17(s).affair?.pid).toBe(k.slice(2));
    expect(affairKey31(s)).toBe(k);
    expect(affairRisk17(s)).toBeGreaterThan(0);
    const h = heart31(s);
    expect(h.ak).toBe(k);
    expect(Array.isArray(h.knows)).toBe(true);
  });

  it('a descoberta gera trunfo (hold) e fato; famoso(a), o boato vira notícia pública', () => {
    const s = game(1988);
    withAffair(s);
    life(s).fame = 60; // famoso: a imprensa pega
    const nH = holds17(s).h.filter((h) => h.src === 'amor31').length;
    expect(discoverAffair17(s, { pt: 'Uma foto.', en: 'A photo.' })).toBe(true);
    const f = recentFacts(s, { months: 1 }).find((x) => x.kind === 'affair' && x.tags.includes('exposed'));
    expect(f).toBeTruthy();
    expect(holds17(s).h.filter((h) => h.src === 'amor31').length).toBeGreaterThan(nH);
    expect(holds17(s).h.some((h) => h.src === 'amor31' && h.holder === 'press' && h.target === 'player')).toBe(true);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(recentFacts(s, { months: 4 }).some((x) => x.kind === 'affair' && x.visibility === 'public' && x.src === 'amor31')).toBe(true);
  });
});

describe('r31 AMOR: explorar não muda o mundo', () => {
  it('chance, trava, ficha, quem sabe, risco e o menu de pessoa só leem', () => {
    const s = game(1979);
    ready(s);
    const ks = adults(s).slice(0, 25).map((p) => `p:${p.id}`);
    // aquece caches de leitura antes do retrato
    for (const k of ks) { askOdds31(s, k); askLock31(s, k); personActions18(s, k); tieOf31(s, k); }
    const before = snap(s);
    for (let i = 0; i < 2; i++) for (const k of ks) { askOdds31(s, k); askLock31(s, k); askRoll31(s, k); personActions18(s, k); tieOf31(s, k); romanceLock31(s, k); }
    heart31(s); whoKnows31(s); riskParts31(s);
    expect(snap(s)).toBe(before);
  });
});

describe('r31 AMOR: interruptores desligados = comportamento antigo', () => {
  it('sem "chamar": pedido travado com o motivo, o flertar antigo volta ao menu, ganchos do love17 neutros', () => {
    const s = game(1990);
    ready(s);
    for (const id of [SW_ASK31, SW_AFFAIR31, SW_MARKET31]) setSw(s, id, false);
    const k = `p:${adults(s)[3].id}`;
    const lk = askLock31(s, k);
    expect(lk?.why.pt).toMatch(/desligado/);
    expect(lk?.unlock.pt).toMatch(/Editor/);
    const rows = personActions18(s, k).map((r) => r.def.id);
    expect(rows).toContain('flirt');
    expect(rows).not.toContain('amor31.ask');
    expect(AMOR17.pm?.(s, { personId: k.slice(2), name: 'x', since: 0 })).toBeUndefined();
    expect(AMOR17.risk?.(s, { name: 'x', since: s.week, sx: 'f', disc: 50 })).toBe(0);
    // ligado: o menu troca o flertar pelo pedido novo
    setSw(s, SW_ASK31, true);
    const on = personActions18(s, k).map((r) => r.def.id);
    expect(on).toContain('amor31.ask');
    expect(on).not.toContain('flirt');
  });

  it('casos desligados: comprometido(a), o pedido fica travado com o motivo', () => {
    const s = game(1990);
    ready(s);
    setSw(s, SW_AFFAIR31, false);
    life(s).partner = { name: 'Par Teste', born: s.year - 30, job: { pt: 'ar', en: 'ar' }, trait: 'zen', affinity: 60, since: s.week - 30, stage: 'dating', lastDate: s.week };
    const k = `p:${adults(s)[5].id}`;
    expect(askLock31(s, k)?.why.pt).toMatch(/casos estão desligados/);
  });
});
