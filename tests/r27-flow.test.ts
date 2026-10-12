// Rodada 27 (FLOW): um caminho só por atividade — registro, limite por mês, modo rápido intacto e a "Compor" da
// agenda virando atividade oferecida no avanço (modo jogável) ou resolvida sozinha (modo rápido).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playerActs } from '../src/sim/util';
import { l } from '../src/data/world';
import type { GameState } from '../src/sim/types';
import {
  MONTH_CAP27, activities27, activity27, agendaOf27, occPlayable27, planFlow27, registerActivity27, registerOccasions27,
  screenOffered27, slotPlayable27, summary27, window27, type Occ27,
} from '../src/ui/act27/flow27model';

const game = (seed = 'flow', year = 1975): GameState => {
  const cfg = defaultConfig(`${seed}-${year}`, { scenario: 'established', startYear: year });
  (cfg as { dbSize?: string }).dbSize = 'small';
  const g = createGame(cfg);
  advanceMonth(g);
  return g;
};
/** Ato do jogador com uma "Compor" na agenda manual. */
function withCompose(g: GameState): string {
  const id = playerActs(g).find((x) => g.acts[x].members.length)!;
  g.delegated[id] = false;
  g.agenda[id] = [{ action: 'compose', params: { week: 1 } }, { action: 'rest', params: { week: 4 } }];
  return id;
}
const noop = () => {};

describe('r27 FLOW — registro', () => {
  it('as atividades de sempre estão registradas, cada uma com um tipo', () => {
    const ids = activities27().map((a) => a.id);
    for (const id of ['compose', 'record', 'show', 'nego', 'reneg', 'heist']) expect(ids).toContain(id);
    expect(activity27('compose')!.kind).toBe('agenda');
    expect(activity27('record')!.kind).toBe('studio');
    expect(activity27('show')!.kind).toBe('show');
    expect(activity27('heist')!.kind).toBe('screen');
  });
  it('registrar de novo com o mesmo id substitui (não duplica)', () => {
    const n = activities27().length;
    registerActivity27({ id: 'zz-test', kind: 'zz', label: l('a', 'a'), when: () => true, important: () => false, play: (_s, _o, d) => d({ played: true }), quick: noop });
    registerActivity27({ id: 'zz-test', kind: 'zz', label: l('b', 'b'), when: () => true, important: () => true, play: (_s, _o, d) => d({ played: true }), quick: noop });
    expect(activities27().length).toBe(n + 1);
    expect(activity27('zz-test')!.label.pt).toBe('b');
  });
});

describe('r27 FLOW — a Compor da agenda', () => {
  it('modo jogável: a composição é oferecida no avanço do mês', () => {
    const g = game();
    expect(g.clock.opened).toBe(false); // a próxima virada abre o mês e roda a agenda
    const id = withCompose(g);
    const p = planFlow27(g, 'month', 'play');
    const it = p.offer.find((x) => x.id === 'compose' && x.occ.actId === id);
    expect(it).toBeTruthy();
    expect(it!.title.pt).toContain(g.acts[id].name);
    expect(it!.preview.pt.length).toBeGreaterThan(10);
    expect(slotPlayable27(g, id, g.agenda[id][0], 0, 'play')?.id).toBe('compose');
    expect(slotPlayable27(g, id, g.agenda[id][1], 1, 'play')).toBeNull(); // descanso não é jogável
  });
  it('modo rápido: nada é oferecido — a composição fica com o motor', () => {
    const g = game();
    const id = withCompose(g);
    const p = planFlow27(g, 'month', 'quick');
    expect(p.offer).toHaveLength(0);
    expect(p.quick.find((x) => x.id === 'compose' && x.occ.actId === id)?.why).toBe('mode');
    expect(slotPlayable27(g, id, g.agenda[id][0], 0, 'quick')).toBeNull();
  });
  it('"só importantes": composição de ato contratado vai no rápido; avanço longo resolve tudo no rápido', () => {
    const g = game();
    const id = withCompose(g);
    if (!g.acts[id].playerBand) expect(planFlow27(g, 'month', 'key').offer.some((x) => x.id === 'compose')).toBe(false);
    const q = planFlow27(g, 'quarter', 'play');
    expect(q.offer).toHaveLength(0);
    expect(q.quick.every((x) => x.why === 'long')).toBe(true);
  });
  it('agenda delegada também conta (a agenda padrão que vai rodar)', () => {
    const g = game('flowd');
    const id = playerActs(g).find((x) => g.acts[x].members.length)!;
    g.delegated[id] = true;
    const has = agendaOf27(g, id).some((x) => x.action === 'compose');
    expect(planFlow27(g, 'month', 'play').offer.some((x) => x.id === 'compose' && x.occ.actId === id)).toBe(has);
  });
  it('mês já aberto (avanço de semana): a agenda já rodou, nada de composição', () => {
    const g = game();
    withCompose(g);
    g.clock.opened = true;
    expect(window27(g, 'week').opensMonth).toBe(false);
    expect(planFlow27(g, 'week', 'play').offer.some((x) => x.id === 'compose')).toBe(false);
  });
  it('composição já jogada (played27) não é oferecida de novo', () => {
    const g = game();
    const id = withCompose(g);
    g.agenda[id][0].params = { ...g.agenda[id][0].params, played27: 1 };
    expect(planFlow27(g, 'month', 'play').offer.some((x) => x.id === 'compose' && x.occ.actId === id)).toBe(false);
  });
  it('uma composição por ato, mesmo com duas "Compor" na agenda', () => {
    const g = game();
    const id = withCompose(g);
    g.agenda[id].push({ action: 'compose', params: { week: 2 } });
    expect(planFlow27(g, 'month', 'play').offer.filter((x) => x.id === 'compose' && x.occ.actId === id)).toHaveLength(1);
  });
});

describe('r27 FLOW — limite por mês, ordem e pureza', () => {
  it(`no máximo ${MONTH_CAP27} por mês; o resto vai no rápido com nota; importantes primeiro`, () => {
    const g = game();
    registerOccasions27('zzcap', (_s, w) => Array.from({ length: 6 }, (_, i) => ({ src: 'zzcap', key: `zz${i}`, day: w.from + 6 - i, data: { imp: i === 5 } })));
    registerActivity27({ id: 'zz-cap', kind: 'zzcap', label: l('Teste', 'Test'), when: () => true, important: (_s, o) => !!o.data?.imp, play: (_s, _o, d) => d({ played: true }), quick: noop });
    try {
      const p = planFlow27(g, 'month', 'play');
      const mine = (xs: typeof p.offer) => xs.filter((x) => x.id === 'zz-cap');
      expect(p.offer.length).toBeLessThanOrEqual(MONTH_CAP27);
      expect(p.offer[0].important).toBe(true);
      expect(mine(p.quick).some((x) => x.why === 'cap')).toBe(true);
      expect(mine(p.offer).length + mine(p.quick).length).toBe(6);
      // limite já gasto no mês (avanços por semana): nada mais é oferecido
      expect(planFlow27(g, 'month', 'play', 0).offer).toHaveLength(0);
      // ocasiões já decididas não voltam
      expect(planFlow27(g, 'month', 'play', 3, new Set(['zz0', 'zz1', 'zz2', 'zz3', 'zz4', 'zz5'])).offer.some((x) => x.id === 'zz-cap')).toBe(false);
      const log = { week: g.week, played: ['A'], quick: ['B', 'C'], capped: 2 };
      expect(summary27(log)!.pt).toMatch(/jogadas: A.*no rápido: B, C.*limite de 3/);
      expect(summary27({ week: 0, played: [], quick: [], capped: 0 })).toBeNull();
    } finally {
      registerOccasions27('zzcap', () => []);
    }
  });
  it('planejar não mexe no jogo (modo rápido intacto) e é determinístico', () => {
    const a = game('pure');
    withCompose(a);
    const b = structuredClone(a);
    const p1 = planFlow27(a, 'month', 'play');
    const p2 = planFlow27(a, 'month', 'play');
    expect(p1.offer.map((x) => x.occ.key)).toEqual(p2.offer.map((x) => x.occ.key)); // determinístico
    planFlow27(a, 'week', 'key');
    slotPlayable27(a, playerActs(a)[0], { action: 'compose' }, 0, 'play');
    // nada mudou no estado: o motor (e quem joga no rápido, bots e testes) vê exatamente o mesmo jogo
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('telas: a mesa/o plano só abre quando o modo pede; senão a tela de sempre segue', () => {
    const g = game();
    const occ: Occ27 = { src: 'screen', key: 'h', data: { cid: 'bootleg' } };
    expect(screenOffered27(g, 'heist', occ, 'play')).toBe(true);
    expect(screenOffered27(g, 'heist', occ, 'quick')).toBe(false);
    expect(screenOffered27(g, 'heist', { ...occ, data: { cid: 'nao-existe' } }, 'play')).toBe(false);
    const signed = playerActs(g)[0];
    expect(screenOffered27(g, 'nego', { src: 'screen', key: 'n', actId: signed }, 'play')).toBe(false); // já é seu: formulário de sempre
    expect(occPlayable27(g, { src: 'studio', key: 'st:x', sessId: 'nao-existe' }, 'play')).toBeNull();
  });
});
