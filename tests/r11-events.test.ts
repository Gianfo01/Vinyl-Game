// Rodada 11 — mais eventos aleatórios (artistas, selo, indústria por época) e mais eventos de vida pessoal.

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig, simulate } from '../src/sim/bot';
import { EVENTS, eventById } from '../src/sim/events';
import { MORE_EVENTS_11 } from '../src/sim/events_more11';
import { createGame } from '../src/sim/worldgen';
import { EVENTS as LIFE } from '../src/sim/sys/lifeevents10/data';
import { EVENTS11 } from '../src/sim/sys/lifeevents10/data11';
import { defOf } from '../src/sim/sys/lifeevents10';

describe('eventos da rodada 11', () => {
  it('80+ eventos do diretor, ids únicos, bilíngues, com find e 2+ opções', () => {
    expect(MORE_EVENTS_11.length).toBeGreaterThanOrEqual(80);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const e of MORE_EVENTS_11) {
      expect(eventById[e.id], e.id).toBe(e);
      expect(e.title.pt && e.title.en && e.text.pt && e.text.en, e.id).toBeTruthy();
      expect(e.find, e.id).toBeDefined();
      expect(e.cooldown, e.id).toBeGreaterThanOrEqual(12);
      expect(e.options.length, e.id).toBeGreaterThanOrEqual(2);
      expect(new Set(e.options.map((o) => o.id)).size, e.id).toBe(e.options.length);
      for (const o of e.options) expect(o.label.pt && o.label.en, `${e.id}:${o.id}`).toBeTruthy();
    }
  });
  it('25+ eventos de vida novos no mesmo sorteio, com resposta padrão válida', () => {
    expect(EVENTS11.length).toBeGreaterThanOrEqual(25);
    expect(new Set(LIFE.map((d) => d.id)).size).toBe(LIFE.length);
    for (const d of EVENTS11) {
      expect(defOf(d.id), d.id).toBe(d);
      expect(d.name.pt && d.name.en, d.id).toBeTruthy();
      expect(d.ch.some((c) => c.id === d.def), d.id).toBe(true);
      for (const c of d.ch) expect(c.label.pt && c.label.en && c.res.pt && c.res.en, `${d.id}:${c.id}`).toBeTruthy();
    }
  });
  it('nada do futuro: pirataria P2P, redes e streaming não aparecem em 1960', () => {
    const s = createGame(defaultConfig('r11-ev', { startYear: 1960 }));
    const r = Rng.fromSeed('r11-ev-find');
    for (const id of ['r11_sue_fans', 'r11_social_feud', 'r11_viral_cover', 'r11_meme_revival', 'r11_blog_buzz', 'r11_exclusive_window', 'r11_deepfake', 'r11_drm', 'r11_crypto_promo', 'r11_algorithm_change', 'r11_hack_leak']) {
      for (let i = 0; i < 30; i++) expect(eventById[id].find!(s, r), id).toBeNull();
    }
  });
  it('simulação curta no ano 2000 fecha o caixa', () => {
    const { state } = simulate(defaultConfig('r11-sim', { startYear: 2000, storyteller: 'acaso' }), 4);
    expect(state.player.cash).toBe(state.player.initialCash + state.player.totalPosted);
  }, 120000);
});
