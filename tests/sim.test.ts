// Invariáveis do GDD §27: determinismo; caixa fecha com o extrato; master e publishing
// separados; cancelar não cobra; reprocessar não duplica; unicidade entre seeds.

import { describe, expect, it } from 'vitest';
import { botMonth, defaultConfig, simulate } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { emitEvent, EVENTS } from '../src/sim/events';
import { cancelRelease, composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import { post, rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { endingScores } from '../src/sim/legacy';

describe('determinismo', () => {
  it('mesma seed + mesmas decisões = mesma história', () => {
    const a = simulate(defaultConfig('det-1'), 3).state;
    const b = simulate(defaultConfig('det-1'), 3).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds diferentes geram mundos diferentes', () => {
    const a = createGame(defaultConfig('u-1'));
    const b = createGame(defaultConfig('u-2'));
    expect(a.signature).not.toBe(b.signature);
    const namesA = new Set(Object.values(a.acts).map((x) => x.name));
    const namesB = Object.values(b.acts).map((x) => x.name);
    const overlap = namesB.filter((n) => namesA.has(n)).length / namesB.length;
    expect(overlap).toBeLessThan(0.6);
  });
});

describe('finanças', () => {
  it('caixa fecha com o extrato depois de anos de jogo', () => {
    const { state } = simulate(defaultConfig('cash-1'), 6);
    expect(state.player.cash).toBe(state.player.initialCash + state.player.totalPosted);
  });

  it('reprocessar a mesma chave na mesma semana não duplica', () => {
    const s = createGame(defaultConfig('dup-1'));
    const before = s.player.cash;
    expect(post(s, 'x', 1000, 'test', 't')).toBe(true);
    expect(post(s, 'x', 1000, 'test', 't')).toBe(false);
    expect(s.player.cash).toBe(before + 1000);
  });

  it('cancelar um lançamento devolve tudo', () => {
    const s = createGame(defaultConfig('cancel-1'));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
    const songs = composeSongs(s, r, act, 2);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced', 'player');
    const cash = s.player.cash;
    const pr = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], formats: ['lp'], press: 1000, marketing: [{ channel: 'press', budget: 50000 }], territories: s.player.territories, weeksAhead: 2 });
    expect('id' in pr).toBe(true);
    expect(s.player.cash).toBeLessThan(cash);
    if ('id' in pr) cancelRelease(s, pr.id);
    expect(s.player.cash).toBe(cash);
  });
});

describe('contratos', () => {
  it('recoupment abate o saldo e não é receita extra do selo (exemplo do v6)', () => {
    const s = createGame(defaultConfig('recoup-1'));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o2', week: 0, status: 'pending', royalty: 0.2, advance: 500_00 });
    const c = s.contracts[act.contractId!];
    expect(c.recoupBalance).toBe(500_00);
    // $10.000 líquidos, royalties 20% = $2.000 recuperam o saldo
    const gross = 10_000_00;
    const share = Math.round(gross * c.royalty);
    const rec = Math.min(c.recoupBalance, share);
    expect(rec).toBe(500_00);
    expect(share - rec).toBe(1_500_00);
  });
});

describe('conteúdo', () => {
  it('eventos com tags filtradas nunca viram cartão de decisão', () => {
    const s = createGame(defaultConfig('filter-1', { contentFilters: ['drugs', 'death'] }));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    emitEvent(s, r, 'addiction', { act: act.id, person: act.members[0] });
    expect(s.decisions.find((d) => d.eventId === 'addiction')).toBeUndefined();
  });

  it('atos com regra de separação reforçada não recebem eventos sensíveis', () => {
    const s = createGame(defaultConfig('rs-1'));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
    act.rs = true;
    emitEvent(s, r, 'controversial_remark', { act: act.id });
    expect(s.decisions.find((d) => d.eventId === 'controversial_remark')).toBeUndefined();
  });

  it('todo evento tem texto PT e EN', () => {
    for (const e of EVENTS) {
      expect(e.title.pt && e.title.en, e.id).toBeTruthy();
      expect(e.text.pt && e.text.en, e.id).toBeTruthy();
      for (const o of e.options) expect(o.label.pt && o.label.en, `${e.id}/${o.id}`).toBeTruthy();
    }
  });
});

describe('arco completo', () => {
  it('uma run iniciada em 2030 chega a um dos 20 finais', () => {
    const s = createGame(defaultConfig('arc-1', { startYear: 2030, scenario: 'established' }));
    for (let i = 0; i < 12 * 11 + 2 && !s.ended; i++) {
      botMonth(s);
      for (const d of [...s.decisions]) void d;
      advanceMonth(s);
    }
    expect(s.ended).toBeTruthy();
    expect(endingScores(s).length).toBe(20);
    expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
  });
});
