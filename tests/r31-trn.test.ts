// R31 · onda 5 (TRN, EXP-11) — transições entre telas: desligado = nenhuma transição; pular funciona (a troca de tela
// roda uma vez só); o estado do jogo é idêntico com e sem transição; cada época escolhe o material certo.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { pendingList } from '../src/sim/r31/pending';
import { travelQuote, ownerCity } from '../src/sim/sys/mapx8';
import { cityById } from '../src/data/world';
import { setSw, switchDef, sw, swUi, setSwUi } from '../src/sim/r31/switches';
import { editables } from '../src/sim/r31/editor';
import { trnMode31, trnOn31, type TrnMode31 } from '../src/sim/r31/exp5trn';
import '../src/sim/r31/exp5trn';
import { TrnCtl31, type TrnEnv31, type TrnRun31, type TrnView31 } from '../src/ui/r31/trn31core';
import {
  calendarOf31, cardInfo31, curtainOf31, monthInfo31, phaseAt31, swapMs31, ticketInfo31, ticketLine31, totalMs31, trnPlan31, vehicleOf31,
  type TrnInfo31, type TrnKind31, type TrnPend31,
} from '../src/ui/r31/trn31model';
import { MAT31, U31, calBox31, cardBox31, paintCalendar31, paintCard31, paintCurtain31, paintRoute31, paintTicket31, placeIcon31, ticketBox31 } from '../src/ui/r31/trn31px';
import { C, Px } from '../src/ui/pixel/px';

const game = (seed: string, year = 1962, city = 'london'): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));

/** Ambiente de mentira: relógio manual, quadros na fila. */
function fakeEnv(o: { on?: boolean; mode?: TrnMode31; reduced?: boolean } = {}) {
  let now = 0;
  const frames: (() => void)[] = [];
  const env: TrnEnv31 = {
    on: () => o.on ?? true, mode: () => o.mode ?? 'full', reduced: () => !!o.reduced, live: () => true,
    now: () => now, frame: (cb) => { frames.push(cb); }, later: () => { /* vigia não precisa no teste */ },
  };
  const step = (ms: number) => { now += ms; const f = frames.splice(0); for (const x of f) x(); };
  return { env, step };
}
/** Tela que pinta tudo num buffer Px (exercita a pintura de verdade) e conta as chamadas. */
function pxView() {
  const log = { begin: 0, frames: 0, end: 0, skipped: 0 };
  const px = new Px(480, 300);
  const view: TrnView31 = {
    begin: () => { log.begin++; },
    frame: (r: TrnRun31, ph, p, ms) => {
      log.frames++;
      px.d.fill(0);
      const mat = curtainOf31(r.info.year);
      if (r.info.card) { paintCurtain31(px, mat, ph === 'open' ? p : 0, ms); paintCard31(px, cardBox31(px.w, px.h), mat, placeIcon31(r.info.card.place)); }
      if (r.info.ticket) { paintRoute31(px, [80, 160], [400, 120], p, r.info.ticket.vehicle); paintTicket31(px, ticketBox31(px.w, px.h), r.info.ticket.vehicle, 'EMBARQUE'); }
      if (r.info.month) {
        const cal = calendarOf31(r.info.year);
        paintCalendar31(px, cal, calBox31(cal, px.w, px.h), { mon: 'SET', year: '1962' }, { mon: 'OUT', year: '1962' }, ph === 'fall' ? p : 1);
      }
    },
    end: (_r, skipped) => { log.end++; if (skipped) log.skipped++; },
  };
  return { view, log, px };
}

const PLACES = ['sede', 'casa', 'cidade', 'mundo'] as const;
function pend(s: GameState): TrnPend31[] {
  return pendingList(s).map((p, i) => ({ title: p.title, prio: p.prio, due: p.due, place: PLACES[i % 4] }));
}
/** As informações de todas as transições, lidas do jogo (o que a tela mostraria). */
function infos(s: GameState): [TrnKind31, TrnInfo31][] {
  const to = Object.keys(cityById).find((c) => c !== s.config.homeCity && cityById[c]) ?? 'paris';
  const q = travelQuote(s, to);
  const from = ownerCity(s);
  return [
    ['travel', { year: s.year, card: cardInfo31({ to: 'cidade', city: cityById[from].name.pt, month: s.month, year: s.year, pend: pend(s) }) }],
    ['open', { year: s.year, rect: { x: 10, y: 10, w: 40, h: 40 } }],
    ['close', { year: s.year }],
    ['trip', { year: s.year, ticket: ticketInfo31({ from: cityById[from].name.pt, to: cityById[to].name.pt, fromId: from, toId: to, month: s.month, year: s.year, mode: q.mode, days: q.days, cost: String(q.cost) }) }],
    ['month', { year: s.year, month: monthInfo31({ old: [s.month, s.year], now: [(s.month + 1) % 12, s.year], pend: pend(s) }) }],
  ];
}

describe('R31 TRN · interruptor e opção', () => {
  it('exp5.trn ligado por padrão, modo "completas", registrados no editor; vale no navegador (fora do save)', () => {
    const s = game('trn-sw');
    expect(switchDef('exp5.trn')?.def).toBe(true);
    expect(sw<boolean>(s, 'exp5.trn')).toBe(true);
    expect(trnOn31()).toBe(true);
    expect(trnMode31()).toBe('full');
    const ids = editables().map((e) => e.id);
    expect(ids).toContain('sw.exp5.trn');
    expect(ids).toContain('sw.exp5.trn.mode');
    const before = JSON.stringify(s);
    setSw(s, 'exp5.trn.mode', 'fast');
    expect(trnMode31()).toBe('fast');
    expect(swUi('exp5.trn.mode')).toBe('fast');
    setSw(s, 'exp5.trn', false);
    expect(trnOn31()).toBe(false);
    expect(JSON.stringify(s)).toBe(before); // nada no estado do jogo
    setSwUi('exp5.trn', true); setSwUi('exp5.trn.mode', 'full');
  });
});

describe('R31 TRN · desligado = nenhuma transição', () => {
  for (const [why, o] of [['interruptor desligado', { on: false }], ['modo "desligadas"', { mode: 'off' as const }], ['movimento reduzido (corte simples)', { reduced: true }]] as const) {
    it(why, () => {
      const { env, step } = fakeEnv(o);
      const { view, log } = pxView();
      const ctl = new TrnCtl31(env, view);
      let swaps = 0;
      for (const k of ['travel', 'open', 'close', 'trip', 'month'] as const) expect(ctl.start(k, { year: 1962 }, () => { swaps++; })).toBe(false);
      step(1000);
      expect(log.begin).toBe(0);
      expect(log.frames).toBe(0);
      expect(swaps).toBe(0); // quem chamou desenha direto
      expect(ctl.busy()).toBe(false);
    });
  }
  it('plano: off/reduzido não anima; rápidas = metade do tempo', () => {
    expect(trnPlan31({ on: false, mode: 'full', reduced: false }).anim).toBe(false);
    expect(trnPlan31({ on: true, mode: 'off', reduced: false }).anim).toBe(false);
    expect(trnPlan31({ on: true, mode: 'full', reduced: true })).toMatchObject({ anim: false, why: 'reduced' });
    expect(trnPlan31({ on: true, mode: 'fast', reduced: false }).scale).toBe(0.5);
    expect(totalMs31('travel')).toBe(500); // 0,5 s no total
    expect(totalMs31('open')).toBe(300);   // zoom + papel sobe: 0,3 s
    expect(totalMs31('close')).toBe(150);  // papel desce: 0,15 s
    expect(totalMs31('travel', 0.5)).toBe(250);
  });
});

describe('R31 TRN · pular funciona', () => {
  it('a troca de tela espera a cortina fechar e roda uma vez só', () => {
    const { env, step } = fakeEnv();
    const { view, log } = pxView();
    const ctl = new TrnCtl31(env, view);
    let swaps = 0;
    expect(ctl.start('travel', infos(game('trn-a'))[0][1], () => { swaps++; })).toBe(true);
    expect(ctl.pending()).toBe(true);
    step(swapMs31('travel') - 20);
    expect(swaps).toBe(0);
    step(40);
    expect(swaps).toBe(1);
    expect(ctl.pending()).toBe(false);
    for (let i = 0; i < 40; i++) step(16);
    expect(ctl.busy()).toBe(false);
    expect(swaps).toBe(1);
    expect(log.end).toBe(1);
    expect(log.skipped).toBe(0);
  });
  it('qualquer tecla/clique (skip) troca na hora e tira a transição', () => {
    const s = game('trn-b');
    for (const [k, info] of infos(s)) {
      const { env, step } = fakeEnv();
      const { view, log } = pxView();
      const ctl = new TrnCtl31(env, view);
      let swaps = 0;
      expect(ctl.start(k, info, () => { swaps++; })).toBe(true);
      step(16);
      ctl.skip();
      expect(swaps, k).toBe(1);
      expect(ctl.busy(), k).toBe(false);
      expect(log.skipped, k).toBe(1);
      step(2000); // quadros atrasados não fazem nada
      expect(swaps, k).toBe(1);
      expect(log.end, k).toBe(1);
    }
  });
  it('uma transição nova pula a anterior (sem perder a troca)', () => {
    const { env, step } = fakeEnv();
    const ctl = new TrnCtl31(env, pxView().view);
    let a = 0, b = 0;
    ctl.start('travel', { year: 1990 }, () => { a++; });
    step(16);
    ctl.start('month', { year: 1990, month: { old: [0, 1990], now: [1, 1990], items: [] } }, () => { b++; });
    expect(a).toBe(1);
    ctl.skip();
    expect(b).toBe(1);
  });
  it('fases na ordem do mock (fecha → cartão → abre; zoom → papel; rota → fecha → passagem → abre)', () => {
    expect(phaseAt31('travel', 50).phase).toBe('close');
    expect(phaseAt31('travel', 250).phase).toBe('card');
    expect(phaseAt31('travel', 450).phase).toBe('open');
    expect(phaseAt31('travel', 600).done).toBe(true);
    expect(phaseAt31('open', 100).phase).toBe('zoom');
    expect(phaseAt31('open', 200).phase).toBe('rise');
    expect(phaseAt31('trip', 100).phase).toBe('route');
    expect(phaseAt31('trip', 700).phase).toBe('ticket');
    expect(phaseAt31('month', 100).phase).toBe('fall');
  });
});

describe('R31 TRN · estado do jogo idêntico com e sem transição', () => {
  it('ler as informações e pintar todas as transições não mexe no jogo', () => {
    for (const year of [1925, 1962, 1990, 2025]) {
      const s = game(`trn-st-${year}`, year);
      const before = JSON.stringify(s);
      for (const on of [true, false]) {
        const { env, step } = fakeEnv({ on });
        const { view } = pxView();
        const ctl = new TrnCtl31(env, view);
        for (const [k, info] of infos(s)) { ctl.start(k, info, () => {}); for (let i = 0; i < 30; i++) step(50); }
      }
      expect(JSON.stringify(s), String(year)).toBe(before);
    }
  });
  it('dois jogos iguais avançando 3 meses, um com transições e outro sem, terminam idênticos', () => {
    const a = game('trn-eq'), b = game('trn-eq');
    const { env, step } = fakeEnv();
    const ctl = new TrnCtl31(env, pxView().view);
    for (let m = 0; m < 3; m++) {
      const m0: [number, number] = [a.month, a.year];
      advanceMonth(a);
      ctl.start('month', { year: a.year, month: monthInfo31({ old: m0, now: [a.month, a.year], pend: pend(a) }) });
      ctl.start('travel', infos(a)[0][1]);
      for (let i = 0; i < 40; i++) step(40);
      advanceMonth(b);
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('cartão, passagem e virada mostram dados reais do jogo', () => {
    const s = game('trn-real');
    const xs: TrnPend31[] = [{ title: { pt: 'Responder o empresário', en: 'Answer the manager' }, prio: 1, place: 'sede' }, { title: { pt: 'Contrato vence', en: 'Contract expires' }, prio: 3, place: 'sede' }, { title: { pt: 'Show sábado', en: 'Show Saturday' }, prio: 2, place: 'cidade' }];
    const c = cardInfo31({ to: 'sede', city: 'Londres', month: 8, year: 1962, pend: xs });
    expect(c.where.pt).toBe('Londres · Set 1962');
    expect(c.line.pt).toBe('2 pendências · Contrato vence');
    expect(cardInfo31({ to: 'cidade', city: 'Londres', month: 8, year: 1962, pend: xs }).line.pt).toBe('Show sábado');
    expect(cardInfo31({ to: 'casa', city: 'Londres', month: 8, year: 1962, pend: xs }).line.pt).toMatch(/Nada/);
    const m = monthInfo31({ old: [8, 1962], now: [9, 1962], pend: [...xs, ...xs] });
    expect(m.items.length).toBe(3); // só 1–3
    expect(m.items[0].pt).toBe('Contrato vence');
    const to = 'paris';
    const q = travelQuote(s, to);
    const k = ticketInfo31({ from: 'Londres', to: 'Paris', fromId: ownerCity(s), toId: to, month: s.month, year: s.year, mode: q.mode, days: q.days, cost: `£ ${q.cost}` });
    expect(ticketLine31(k).pt).toContain(`£ ${q.cost}`);
    expect(k.vehicle).toBe(vehicleOf31(s.year, q.mode));
  });
});

describe('R31 TRN · cada época escolhe o material certo', () => {
  it('cortina, calendário e transporte por época', () => {
    expect([1889, 1949, 1950, 1979, 1980, 2009, 2010, 2040].map(curtainOf31)).toEqual(['velvet', 'velvet', 'wine', 'wine', 'lamina', 'lamina', 'led', 'led']);
    expect([1889, 1969, 1970, 2009, 2010, 2040].map(calendarOf31)).toEqual(['wall', 'wall', 'flip', 'flip', 'phone', 'phone']);
    expect(vehicleOf31(1920)).toBe('ship');
    expect(vehicleOf31(1949)).toBe('ship');
    expect(vehicleOf31(1950)).toBe('plane');
    expect(vehicleOf31(1930, 'train')).toBe('train');
    expect(vehicleOf31(1990, 'jet')).toBe('plane');
  });
  it('a cortina pintada usa a paleta da época (fechada, sem buracos)', () => {
    const fold = (U31 * 3) + 1; // coluna de dobra (fase 3 do ciclo)
    for (const [year, mat] of [[1905, 'velvet'], [1962, 'wine'], [1985, 'lamina']] as const) {
      const p = new Px(480, 300);
      paintCurtain31(p, curtainOf31(year), 0);
      expect(p.get(fold, 150), String(year)).toBe(MAT31[mat].f[3]);
      let holes = 0;
      for (let y = 0; y < p.h; y += 7) for (let x = 0; x < p.w; x += 7) if (!p.get(x, y)) holes++;
      expect(holes, String(year)).toBe(0);
    }
    const led = new Px(480, 300);
    paintCurtain31(led, curtainOf31(2025), 0);
    const cols = new Set<number>();
    for (let x = 0; x < 200; x++) for (const y of [148, 152, 200]) cols.add(led.get(x, y));
    expect(cols.has(C('#070b14'))).toBe(true); // fundo do painel de LED
    expect(cols.has(C('#4ff0ff')) || cols.has(C('#2a7ab0'))).toBe(true);
    // aberta: o meio da tela fica livre
    const open = new Px(480, 300);
    paintCurtain31(open, 'velvet', 1);
    expect(open.get(240, 200)).toBe(0);
  });
  it('os três calendários desenham coisas diferentes', () => {
    const sig = (year: number) => {
      const cal = calendarOf31(year);
      const p = new Px(480, 300);
      const b = calBox31(cal, p.w, p.h);
      paintCalendar31(p, cal, b, { mon: 'SET', year: String(year) }, { mon: 'OUT', year: String(year) }, 0.4);
      let n = 0;
      for (const c of p.d) if (c) n++;
      return [cal, b.w, b.h, n > 2000] as const;
    };
    expect(sig(1955)).toEqual(['wall', 128, 148, true]);
    expect(sig(1985)).toEqual(['flip', 156, 92, true]);
    expect(sig(2025)).toEqual(['phone', 84, 150, true]);
  });
});
