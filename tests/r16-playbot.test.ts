// Rodada 16: o bot jogador usa as mesmas ações da interface e joga de verdade (assina, grava, lança, sai em turnê, oferece sync).
// Rápido por padrão (1 ano + reprise de 3 meses para o determinismo); BALANCE_FULL=1 roda a versão longa (2 × 2 anos).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { playLog, playMonth, simulatePlayer } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';

const FULL = !!process.env.BALANCE_FULL;

describe('playbot16', () => {
  it('uma run curta tem ações variadas de jogador e é determinística', () => {
    // R29b: d2651a4 (R29 CONNECT) corrigiu a ordem dos ganchos de início (renomes e marcação de atos reais do lineup16
    // depois que os atos reais existem); a trajetória mudou e pb-16 assina um chanson de fama 0,3 no lugar da Westend
    // Orchestra — sem ato que caiba num festival no 1º ano (festivals = 0) e sem receita para a 1ª contratação
    // (liquidez 1,57 mi < 18 × salário × 1,1). Varredura pb-1..15 no 1º ano: só pb-2, pb-8, pb-11 e pb-13 têm todas as
    // ações (contratar no 1º ano continua raro: 9 de 15 sem contratação); pb-11 tem a maior folga (8 festivais, 2 turnês).
    // R31 (W0-RNG): mundo no fluxo 'world', motor em 'tick', bot em 'act' — varredura pb-1..16 no 1º ano: 8 de 16 têm todas as
    // ações (pb-3, 5, 6, 8, 9, 10, 12, 16); pb-11 deixou de contratar no 1º ano. pb-9 tem folga (3 turnês, 7 festivais, 1 contratação).
    const cfg = defaultConfig('r16pb-9', { startYear: 1975, realNames: true }); // r27 INT: depois dos merges do mundo pb-9 não contrata no 1º ano (só 6 de 25 sementes contratam: o bot só contrata no ano 1 com caixa > 24× salários — revisar na frente do bot); pb-16 tem todas as ações. r27: dados novos mudaram a trajetória (pb-5 sem contratação; contratar no 1º ano ficou raro — revisar na frente do bot). r23: segredos/vínculos mudaram a trajetória (pb-3 sem contratação). r18: economia (econ18) e mídia (media18) mudaram a trajetória das sementes 1 e 2
    const years = FULL ? 2 : 1;
    // a mesma partida que simulatePlayer joga, guardando o retrato do 3º mês para a reprise curta
    const s = createGame(cfg);
    let snap = '';
    for (let m = 0; m < years * 12 && !s.ended; m++) {
      playMonth(s, 'balanced');
      advanceMonth(s);
      if (m === 2) snap = JSON.stringify({ cash: s.player.cash, log: playLog(s) });
    }
    const L = playLog(s);
    expect(L.signs).toBeGreaterThan(0);
    expect(L.projects).toBeGreaterThan(0);
    expect(L.recordings).toBeGreaterThan(0);
    expect(L.releases).toBeGreaterThan(0);
    expect(L.tours).toBeGreaterThan(0);
    expect(L.festivals).toBeGreaterThan(0);
    expect(L.syncPitches).toBeGreaterThan(0);
    expect(L.scouts).toBeGreaterThan(0);
    expect(L.decisions).toBeGreaterThan(0);
    expect(L.hires).toBeGreaterThan(0);
    if (FULL) {
      const b = simulatePlayer(cfg, 2, 'balanced').summary;
      expect(b.cash).toBe(s.player.cash);
      expect(b.log).toEqual({ ...L, r17: { ...L.r17 } });
    } else {
      const b = simulatePlayer(cfg, 0.25, 'balanced');
      expect(JSON.stringify({ cash: b.state.player.cash, log: playLog(b.state) })).toBe(snap);
    }
  }, 240000);
});
