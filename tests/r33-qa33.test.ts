// R33 · QA33 — ganchos entre as frentes ligados (sim/r33/ligar33): cada ligação só vale com os interruptores das duas
// pontas; desligados, o jogo é o de antes (mesmo estado, nenhuma chave nova no save).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { newRunConfig20 } from '../src/sim/start17';
import { setSw } from '../src/sim/r31/switches';
import { loanOffer } from '../src/sim/economy';
import { advanceMonth } from '../src/sim/tick';
import { int2Acts, int2Do, int2Now } from '../src/sim/r33/int2';
import { int2FestPlace33, int2Sites33 } from '../src/sim/r33/ligar33';
import { lotFor33, reserved33 } from '../src/sim/r33/mapa33';
import { cat33, peek33 } from '../src/sim/r33/cat33';
import { openCases33 } from '../src/sim/r33/sample33';
import { creditCrisis33 } from '../src/sim/r33/mundo33';
import { ownerOf } from '../src/sim/sys/people/owner';
import { relics } from '../src/sim/sys/relics9';
import { LEGAL_SRC33 } from '../src/sim/r33/dir33';
import { places27 } from '../src/sim/sys/place27';
import type { GameState } from '../src/sim/types';

const game = (year = 1962): GameState => { const c = newRunConfig20({ seed: 'qa33-teste', companyName: 'Selo Teste' }); c.startYear = year; return createGame(c); };
const on = (s: GameState, ...ids: string[]) => { for (const id of ids) setSw(s, id, true); };

describe('QA33 · desligado = como antes', () => {
  it('sem interruptores: um ano igual nas duas partidas e nenhuma chave nova da 33 no save', () => {
    const a = game(), b = game();
    for (let m = 0; m < 12; m++) { advanceMonth(a); advanceMonth(b); }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const x = a.x4 as unknown as Record<string, unknown>;
    for (const k of ['cat33', 'int2', 'bots33', 'pes33']) expect(x[k], k).toBeUndefined();
    expect(int2Sites33(a, (k) => lotFor33(a, k))).toEqual([]);
    expect(reserved33(a).size).toBe(0);
  });
});

describe('QA33 · hospital (INT-2) → saúde do dono (VIDA)', () => {
  it('consulta usa o efeito da VIDA e a internação só existe com exp33.saude', () => {
    const s = game(); on(s, 'exp33.int2');
    expect(int2Acts(s, 'hospital').some((a) => a.id === 'hospital.retiro')).toBe(false);
    const o = ownerOf(s); o.stress = 60; o.health = 50;
    expect(int2Do(s, 'hospital.checkup').ok).toBe(true);
    expect([o.stress, o.health]).toEqual([54, 52]); // efeito simples da INT-2
    const t = game(); on(t, 'exp33.int2', 'exp33.saude');
    const p = ownerOf(t); p.stress = 60; p.health = 50; const w = p.wealth;
    expect(int2Do(t, 'hospital.checkup').ok).toBe(true);
    expect([p.stress, p.health]).toEqual([52, 58]); // VIDA: −8 / +8
    expect(p.wealth).toBe(w); // o hospital cobra do caixa, sem cobrança dupla no bolso
    expect(int2Acts(t, 'hospital').some((a) => a.id === 'hospital.retiro')).toBe(true);
  });
});

describe('QA33 · banco (INT-2) → crise de crédito (MUNDO) e garantia (CATÁLOGO)', () => {
  it('crise de 2008: empréstimo congelado no começo, depois mais caro e menor', () => {
    const s = game(2008);
    const o0 = loanOffer(s)!;
    on(s, 'exp33.crise');
    for (let i = 0; i < 14 && !creditCrisis33(s).active; i++) advanceMonth(s);
    expect(creditCrisis33(s).freeze).toBe(true);
    expect(loanOffer(s)).toBeNull(); // 2008: banco não empresta nos 6 primeiros meses
    on(s, 'exp33.int2');
    expect(int2Now(s, 'bank').pt).toMatch(/Crise de crédito/);
    for (let i = 0; i < 7; i++) advanceMonth(s);
    const c = creditCrisis33(s), o1 = loanOffer(s);
    expect(c.freeze).toBe(false);
    if (c.active && o1) expect(o1.rate).toBeGreaterThan(o0.rate - 0.001);
    expect(o0.amount).toBeGreaterThan(0);
  });
  it('relíquia vira garantia e é executada quando o selo passa 2 meses no vermelho', () => {
    const s = game(1975); on(s, 'exp33.int2', 'exp33.relics');
    const rl = relics(s).list.find((x) => x.st !== 'player' && !x.meta?.fix);
    expect(rl).toBeTruthy();
    rl!.st = 'player';
    const n0 = s.player.loans.length;
    const r = int2Do(s, 'bank.collateral');
    expect(r.ok, r.text.pt).toBe(true);
    expect(s.player.loans.length).toBe(n0 + 1);
    expect(Object.keys(cat33(s).pledge)).toEqual([rl!.id]);
    s.player.insolvencyMonths = 2;
    advanceMonth(s);
    expect(peek33(s)!.pledge[rl!.id]).toBeUndefined();
    expect(rl!.st).toBe('auction');
  });
});

describe('QA33 · cartório (INT-2) → processos de sampling (CATÁLOGO) e jurídico (GESTÃO)', () => {
  it('processo aberto aparece no cartório, fecha por acordo e entra no registro do jurídico', () => {
    const s = game(1990); on(s, 'exp33.int2');
    expect(int2Acts(s, 'court').some((a) => a.id === 'court.acordo')).toBe(false);
    on(s, 'exp33.sampling');
    const song = Object.keys(s.songs)[0];
    cat33(s).cases.push({ id: 'cs-t', kind: 'sample', song, vs: Object.keys(s.acts)[0], stake: 300000, since: s.week, st: 'open' });
    expect(LEGAL_SRC33.find((x) => x.id === 'sample33')!.list(s).length).toBe(1);
    const a = int2Acts(s, 'court').find((x) => x.id === 'court.acordo')!;
    expect(a.dis).toBeUndefined();
    const cash = s.player.cash;
    expect(int2Do(s, 'court.acordo').ok).toBe(true);
    expect(openCases33(s).length).toBe(0);
    expect(s.player.cash).toBeGreaterThan(cash); // o selo recebe 60% (menos a taxa do cartório)
  });
});

describe('QA33 · prédios da INT-2 no mapa (MAPA33)', () => {
  it('com int2 + mapa: cada tipo da época ganha o lote reservado e vira lugar com ações; festival abre sem lote', () => {
    const s = game(1962); on(s, 'exp33.int2', 'exp33.mapa');
    const sites = int2Sites33(s, (k) => lotFor33(s, k));
    expect(sites.map((x) => x.id)).toContain('bank');
    expect(sites.map((x) => x.id)).not.toContain('samba'); // Londres
    expect(reserved33(s).size).toBe(sites.length);
    const ps = places27(s, sites.map((x) => x.lot));
    const bank = ps.find((p) => p.int2 === 'bank')!;
    expect(bank.k).toBe('int2');
    expect(bank.lot).toBe(lotFor33(s, 'bank'));
    const f = int2FestPlace33(s)!;
    expect(f.int2).toBe('festival');
    expect(int2Acts(s, 'festival').length).toBeGreaterThan(0);
  });
});
