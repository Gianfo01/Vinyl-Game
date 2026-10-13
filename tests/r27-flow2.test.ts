// Rodada 27 (FLOW2): as atividades da fase 2 no caminho único — campanha, entrevista/coletiva, crise, reunião de
// diretoria e estrada chegam pelo Avançar (um cartão, Jogar / Resolver rápido); favores, turnê no mapa e renovação
// são a própria tela da ação. Modo rápido não oferece nada; o planejamento não mexe na simulação; padrão "só importantes".
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playerActs } from '../src/sim/util';
import type { GameState, PendingRelease } from '../src/sim/types';
import { crisisCands27 } from '../src/sim/sys/crisis27';
import { agenda27 } from '../src/sim/sys/board27';
import { opps27 } from '../src/sim/sys/press27';
import { activities27, activity27, planFlow27, screenOffered27, type FlowMode27, type Occ27 } from '../src/ui/act27/flow27model';
import { CAMP_LEAD27, boardDue27, campKey27, campReady27, declined27, ivOccs27 } from '../src/ui/act27/flow27p2model';
import { ACT_DEFAULT27, actMode27 } from '../src/ui/act27/prefs27';
import { store } from '../src/ui/store';

const game = (seed = 'flow2', year = 1975): GameState => {
  const cfg = defaultConfig(`${seed}-${year}`, { scenario: 'established', startYear: year });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceMonth(g);
  return g;
};
/** Lançamento programado (só o que a campanha lê). */
function schedule(g: GameState, weeksAhead: number, fame?: number): PendingRelease {
  const actId = playerActs(g).find((id) => !g.acts[id].playerBand)!;
  if (fame !== undefined) g.acts[actId].fame = fame;
  const p = { id: `prT${weeksAhead}`, actId, type: 'single', songs: [], title: `Teste ${weeksAhead}`, formats: [], press: 0, marketing: [], territories: [], week: g.week + weeksAhead } as unknown as PendingRelease;
  g.pendingReleases.push(p);
  return p;
}
const offered = (g: GameState, mode: FlowMode27, id: string) => planFlow27(g, 'month', mode, 99).offer.filter((x) => x.id === id);
const quicked = (g: GameState, mode: FlowMode27, id: string) => planFlow27(g, 'month', mode, 99).quick.filter((x) => x.id === id);

describe('r27 FLOW2 — registro da fase 2', () => {
  it('cada atividade da fase 2 tem um tipo (fonte do avanço ou tela)', () => {
    const kinds: Record<string, string> = { campaign: 'release', campEvent: 'release', interview: 'press', crisis: 'crisis', board: 'board', road: 'road', favors: 'screen', route: 'screen', renew: 'screen' };
    const ids = activities27().map((a) => a.id);
    for (const [id, k] of Object.entries(kinds)) { expect(ids).toContain(id); expect(activity27(id)!.kind).toBe(k); }
  });
});

describe('r27 FLOW2 — campanha de lançamento pelo avanço', () => {
  it('estreia perto → cartão "Campanha"; longe → nada (o quadro dura no máximo 8 semanas)', () => {
    const g = game();
    const near = schedule(g, 4, 50);
    const far = schedule(g, CAMP_LEAD27 + 6, 50);
    expect(campReady27(g, near.id)).toBe(true);
    expect(campReady27(g, far.id)).toBe(false);
    const it = offered(g, 'play', 'campaign');
    expect(it.map((x) => x.occ.key)).toEqual([campKey27(near.id)]);
    expect(it[0].title.pt).toContain(near.title);
    expect(it[0].preview.pt).toMatch(/Rápido/);
  });
  it('só importantes: artista pequeno vai no rápido; famoso (≥ 40) é oferecido', () => {
    const g = game('flow2-k');
    schedule(g, 3, 10);
    expect(offered(g, 'key', 'campaign')).toHaveLength(0);
    expect(quicked(g, 'key', 'campaign')[0]?.why).toBe('mode');
    const g2 = game('flow2-k');
    schedule(g2, 3, 55);
    expect(offered(g2, 'key', 'campaign')).toHaveLength(1);
  });
  it('"Resolver rápido" não pergunta de novo; sempre rápido não oferece nada', () => {
    const g = game('flow2-q');
    const p = schedule(g, 4, 50);
    expect(offered(g, 'quick', 'campaign')).toHaveLength(0);
    const it = offered(g, 'play', 'campaign')[0];
    activity27('campaign')!.quick(g, it.occ);
    expect(declined27(g, campKey27(p.id))).toBe(true);
    expect(offered(g, 'play', 'campaign')).toHaveLength(0);
  });
  it('a tela de programar (scheduling) usa a mesma atividade: oferecida só quando o avanço a ofereceria', () => {
    const g = game('flow2-s');
    const p = schedule(g, 2, 50);
    const occ: Occ27 = { src: 'screen', key: campKey27(p.id), actId: p.actId, data: { prId: p.id } };
    expect(screenOffered27(g, 'campaign', occ, 'play')).toBe(true);
    expect(screenOffered27(g, 'campaign', occ, 'quick')).toBe(false);
  });
});

describe('r27 FLOW2 — entrevista e coletiva', () => {
  it('pedido de imprensa: no máximo um por mês (o mais famoso), só na virada do mês; coletivas são importantes', () => {
    const g = game('flow2-iv', 1985);
    const occ = ivOccs27(g, true);
    const press = occ.filter((o) => (o.data!.opp as { ctx: string }).ctx === 'press');
    expect(press.length).toBeLessThanOrEqual(1);
    if (press.length && press[0].actId) {
      const fames = opps27(g).filter((o) => o.ctx === 'press' && o.who === 'act').map((o) => g.acts[o.actId!].fame);
      expect(g.acts[press[0].actId].fame).toBe(Math.max(...fames));
    }
    expect(ivOccs27(g, false).some((o) => (o.data!.opp as { ctx: string }).ctx === 'press')).toBe(false);
    for (const o of occ) expect(activity27('interview')!.important(g, o)).toBe((o.data!.opp as { ctx: string }).ctx !== 'press');
    expect(ivOccs27(g, true).map((o) => o.key)).toEqual(occ.map((o) => o.key)); // determinístico
  });
});

describe('r27 FLOW2 — crise e reunião pelo avanço (importantes)', () => {
  it('crise na mesa → cartão no modo "só importantes"; Resolver rápido = deixar correr', () => {
    const g = game('flow2-cr');
    g.player.cash = -5_000_00;
    g.player.insolvencyMonths = 1;
    const cand = crisisCands27(g).find((c) => c.k === 'bankrupt');
    expect(cand).toBeTruthy();
    const it = offered(g, 'key', 'crisis').find((x) => x.occ.data?.cand === cand!.id);
    expect(it?.important).toBe(true);
    expect(it!.title.pt).toMatch(/Crise/);
    activity27('crisis')!.quick(g, it!.occ);
    expect(crisisCands27(g).some((c) => c.id === cand!.id)).toBe(false);
    expect(offered(g, 'key', 'crisis').some((x) => x.occ.data?.cand === cand!.id)).toBe(false);
  });
  it('reunião de diretoria: oferecida no começo do mês quando há pauta; desligada e recusada não volta', () => {
    const g = game('flow2-bd', 1990);
    if (!agenda27(g).length) return; // sem diretores nesta semente: nada a testar
    g.clock.dayInMonth = 0;
    expect(boardDue27(g, true)).toBeGreaterThan(0);
    const it = offered(g, 'key', 'board')[0];
    expect(it?.important).toBe(true);
    activity27('board')!.quick(g, it.occ);
    expect(boardDue27(g, true)).toBe(0);
    expect(offered(g, 'play', 'board')).toHaveLength(0);
  });
  it('avanço longo (trimestre) resolve tudo no rápido', () => {
    const g = game('flow2-long');
    g.player.cash = -5_000_00;
    g.player.insolvencyMonths = 1;
    schedule(g, 3, 60);
    const p = planFlow27(g, 'quarter', 'play', 99);
    expect(p.offer).toHaveLength(0);
    expect(p.quick.some((x) => x.id === 'crisis' && x.why === 'long')).toBe(true);
  });
});

describe('r27 FLOW2 — telas (a atividade É a tela da ação)', () => {
  it('turnê: "Confirmar turnê" vira o mapa só com rota; só importantes = 3+ cidades ou fama ≥ 30', () => {
    const g = game('flow2-rt');
    const id = playerActs(g)[0];
    g.acts[id].fame = 10;
    const o = (cities: string[]): Occ27 => ({ src: 'screen', key: 'route', actId: id, data: { cities } });
    expect(screenOffered27(g, 'route', o([]), 'play')).toBe(false);
    expect(screenOffered27(g, 'route', o(['a']), 'play')).toBe(true);
    expect(screenOffered27(g, 'route', o(['a']), 'key')).toBe(false);
    expect(screenOffered27(g, 'route', o(['a', 'b', 'c']), 'key')).toBe(true);
    expect(screenOffered27(g, 'route', o(['a', 'b', 'c']), 'quick')).toBe(false);
  });
  it('renovação: a mesa só para contratos do seu selo', () => {
    const g = game('flow2-rn');
    const mine = playerActs(g).find((id) => g.acts[id].contractId && !g.acts[id].playerBand);
    const other = Object.keys(g.acts).find((id) => g.acts[id].owner && g.acts[id].owner !== 'player');
    if (mine) expect(screenOffered27(g, 'renew', { src: 'screen', key: 'r', actId: mine }, 'play')).toBe(true);
    if (other) expect(screenOffered27(g, 'renew', { src: 'screen', key: 'r', actId: other }, 'play')).toBe(false);
  });
  it('favores: sem contato válido não abre a conversa (a ação de sempre segue)', () => {
    const g = game('flow2-fv');
    expect(screenOffered27(g, 'favors', { src: 'screen', key: 'f', data: { key: 'p:nobody', gesture: 'gift' } }, 'play')).toBe(false);
  });
});

describe('r27 FLOW2 — modo e simulação', () => {
  it('padrão das atividades = "só as importantes"; a escolha explícita vale', () => {
    const prev = store.prefs.activities27;
    delete store.prefs.activities27;
    expect(ACT_DEFAULT27).toBe('key');
    expect(actMode27()).toBe('key');
    store.prefs.activities27 = 'play';
    expect(actMode27()).toBe('play');
    store.prefs.activities27 = 'quick';
    expect(actMode27()).toBe('quick');
    if (prev === undefined) delete store.prefs.activities27; else store.prefs.activities27 = prev;
  });
  it('planejar o avanço não muda a simulação (bots e testes seguem iguais)', () => {
    const a = game('flow2-det'), b = game('flow2-det');
    schedule(a, 3, 60); schedule(b, 3, 60);
    a.player.insolvencyMonths = 0; b.player.insolvencyMonths = 0;
    for (const m of ['play', 'key', 'quick'] as FlowMode27[]) { planFlow27(a, 'month', m); planFlow27(a, 'week', m); }
    advanceMonth(a); advanceMonth(b);
    advanceMonth(a); advanceMonth(b);
    expect(a.player.cash).toBe(b.player.cash);
    expect(a.week).toBe(b.week);
    const fans = (g: GameState) => playerActs(g).map((id) => g.acts[id].fans.casual + g.acts[id].fans.active + g.acts[id].fans.core);
    expect(fans(a)).toEqual(fans(b));
    expect(Object.keys(a.releases).length).toBe(Object.keys(b.releases).length);
  });
  it('nenhuma ocasião produz texto vazio ou NaN', () => {
    const g = game('flow2-nan', 1990);
    g.player.cash = -1_000_00; g.player.insolvencyMonths = 1;
    schedule(g, 2, 70);
    g.clock.dayInMonth = 0;
    const p = planFlow27(g, 'month', 'play', 99);
    for (const it of [...p.offer, ...p.quick]) {
      expect(it.title.pt.length).toBeGreaterThan(3);
      expect(it.title.pt).not.toMatch(/NaN|undefined/);
      expect(it.preview.pt).not.toMatch(/NaN|undefined/);
    }
  });
});
