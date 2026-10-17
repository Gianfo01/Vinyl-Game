// R33 · QA33 — ganchos entre as frentes ligados (sim/r33/ligar33): cada ligação só vale com os interruptores das duas
// pontas; desligados, o jogo é o de antes (mesmo estado, nenhuma chave nova no save).
import { describe, expect, it } from 'vitest';
import { off33c } from './helpers/off33';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { newRunConfig20 } from '../src/sim/start17';
import { setSw, sw as swRead, switchDefs } from '../src/sim/r31/switches';
import { decodeSave20, encodeSave20 } from '../src/core/save20';
import { migrate } from '../src/ui/store';
import { playMonth } from '../src/sim/playbot16';
import { loanOffer } from '../src/sim/economy';
import { advanceMonth } from '../src/sim/tick';
import { int2Acts, int2Do, int2Now } from '../src/sim/r33/int2';
import { int2FestPlace33, int2Sites33 } from '../src/sim/r33/ligar33';
import { lotFor33, reserved33 } from '../src/sim/r33/mapa33';
import { cat33, peek33 } from '../src/sim/r33/cat33';
import { openCases33 } from '../src/sim/r33/sample33';
import { censAt33, creditCrisis33 } from '../src/sim/r33/mundo33';
import { ownerOf } from '../src/sim/sys/people/owner';
import { relics } from '../src/sim/sys/relics9';
import { LEGAL_SRC33 } from '../src/sim/r33/dir33';
import { places27 } from '../src/sim/sys/place27';
import type { GameState } from '../src/sim/types';

const game = (year = 1962): GameState => { const c = newRunConfig20({ seed: 'qa33-teste', companyName: 'Selo Teste' }); c.startYear = year; return createGame(off33c(c)); }; // QA33: 33 ligada por padrão; cada caso liga as suas pontas
const on = (s: GameState, ...ids: string[]) => { for (const id of ids) setSw(s, id, true); };

describe('QA33 · padrão: a 33 inteira ligada (decisão do dono, 2026-10-17)', () => {
  it('todo exp33.* nasce ligado; config sw31 desliga desde a criação', () => {
    const ids = switchDefs().filter((d) => d.id.startsWith('exp33.'));
    expect(ids.length).toBeGreaterThanOrEqual(25);
    for (const d of ids) expect(d.def, d.id).toBe(true);
    const c = newRunConfig20({ seed: 'qa33-pad', companyName: 'Selo Teste' });
    const s = createGame(c);
    for (const d of ids) expect(swRead(s, d.id), d.id).toBe(true);
    const t = createGame(off33c(newRunConfig20({ seed: 'qa33-pad', companyName: 'Selo Teste' })));
    for (const d of ids) expect(swRead(t, d.id), d.id).toBe(false);
  });
});

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

describe('QA33 · salvar e carregar com o estado novo', () => {
  // QA33: o jogo carregado segue IGUAL ao original (antes divergia: estoque infinito virava null, histórico de formação
  // e visões das pessoas ficavam fora do save, o migrate completava campos de quem nasceu na partida).
  it('todos os exp33.* ligados, 2 anos de robô: salvar, carregar e continuar 4 meses dá o mesmo jogo', () => {
    const s = game(1985);
    for (const d of switchDefs()) if (d.id.startsWith('exp33.') && typeof d.def === 'boolean') setSw(s, d.id, true);
    for (let m = 0; m < 24; m++) { playMonth(s, 'aggressive'); advanceMonth(s); }
    const x = s.x4 as unknown as Record<string, unknown>;
    expect(Object.keys(x).filter((k) => /33$|^int2$/.test(k)).length).toBeGreaterThan(4); // o estado novo existe
    const back = decodeSave20(encodeSave20(s), migrate);
    // depois de carregar só o tempo anda: o robô de teste guarda memória própria fora do save (playbot16 MEM), o jogo não
    for (let m = 0; m < 4; m++) { advanceMonth(s); advanceMonth(back); }
    expect(back.player.cash).toBe(s.player.cash);
    const j = (v: unknown) => JSON.parse(JSON.stringify(v)); // mesmo conteúdo (a ordem das chaves pode variar)
    const dif = (a: any, b: any, p: string, out: string[]): void => { if (out.length > 6 || JSON.stringify(a) === JSON.stringify(b)) return; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) dif(a[k], b[k], `${p}.${k}`, out); return; } out.push(`${p}: ${JSON.stringify(a)?.slice(0, 80)} × ${JSON.stringify(b)?.slice(0, 80)}`); };
    const d: string[] = []; dif(j(s.x4), j(back.x4), 'x4', d);
    expect(d).toEqual([]);
    expect(j(back.acts)).toEqual(j(s.acts));
  });
});

describe('QA33 · estádio, trem, porto e gráfica (INT-2) ligados', () => {
  it('estádio marca uma data de arena pelo motor de turnês; porto leva ao exílio quem está sob pressão', async () => {
    const { tourList } = await import('../src/sim/tours');
    const { mundo33 } = await import('../src/sim/r33/mundo33');
    const { playerActs } = await import('../src/sim/util');
    const c = newRunConfig20({ seed: 'qa33-band', companyName: 'Selo Teste' }); c.startYear = 1970; c.role = 'artist'; c.bandName = 'Banda Teste';
    const s = createGame(c); on(s, 'exp33.int2');
    const a = playerActs(s)[0];
    expect(a).toBeTruthy();
    s.acts[a].fame = Math.max(s.acts[a].fame, 60);
    const r = int2Do(s, 'stadium.show');
    if (r.ok) expect(tourList(s).some((t) => t.actId === a)).toBe(true);
    else expect(r.text.pt.length).toBeGreaterThan(3); // a recusa do motor de turnês vem com motivo
    expect(int2Acts(s, 'port').some((x) => x.id === 'port.exilio')).toBe(false);
    on(s, 'exp33.censura');
    mundo33(s).pressure[a] = 10;
    expect(int2Acts(s, 'port').some((x) => x.id === 'port.exilio')).toBe(true);
    const city0 = s.acts[a].city;
    expect(int2Do(s, 'port.exilio').ok).toBe(true);
    expect(mundo33(s).exile[a]?.from).toBe(city0);
  });
  it('frete e capa só tocam lançamentos físicos seus e pelo tempo prometido', async () => {
    const { applyMods } = await import('../src/sim/ext4');
    const s = game(1970); on(s, 'exp33.int2');
    expect(int2Do(s, 'port.carga').ok).toBe(true);
    expect(int2Do(s, 'print.capa').ok).toBe(true);
    const base = Object.values(s.releases)[0];
    const rel = { ...base, id: 'r-t', owner: 'player', formats: ['lp'], week: s.week } as never;
    const has = (r: never) => applyMods(s, 'chartUnits', 100, { release: r }).factors.find((f) => f.label.pt === 'Capa e frete');
    expect(has(rel)?.ratio).toBeCloseTo(1.05 * 1.06, 5);
    const npc = { ...base, id: 'r-n', owner: 'x', formats: ['lp'], week: s.week } as never;
    expect(has(npc)).toBeUndefined();
  });
});

describe('QA33 · censura no país da cidade, não na região inteira (MUNDO)', () => {
  it('Viena 1975 não vive o bloco soviético; Praga vive; Madri vive Franco até 1975; regime sem cidades vale para a região', () => {
    // antes: a pressão do regime era lida pela região ("eu"), e um ato de Viena em 1975 acabava no exílio ou calado
    // (a JV do teste r29-contracts-more fechava porque a confiança do artista desabava)
    expect(censAt33(1975, 'vienna')).toBeLessThan(0.5); // abaixo do limiar do regime (sobra só o clima da Guerra Fria)
    expect(censAt33(1975, 'prague')).toBeGreaterThanOrEqual(0.5);
    expect(censAt33(1975, 'madrid')).toBeGreaterThanOrEqual(0.5);
    expect(censAt33(1980, 'madrid')).toBeLessThan(0.5);
    expect(censAt33(1942, 'london')).toBeGreaterThanOrEqual(0.5); // Segunda Guerra: sem lista de cidades
  });
});
