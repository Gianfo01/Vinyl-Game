// Rodada 3: repertório, sedes e filiais, caderno de ideias e geopolítica sem data de fim.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { canOpenBranch, hqBlocker, hqCaps, openBranch, upgradeBranch } from '../src/sim/branches';
import { upgradeHq } from '../src/sim/economy';
import { HQ_LEVELS } from '../src/data/rules';
import { CITIES } from '../src/data/world';
import {
  addIdea, discardSong, releaseCompilation, releaseDemo, releaseSingle, reviseSong, songProfile, songStatus, songUses, toggleVault,
} from '../src/sim/repertoire';
import { GEO_EVENTS, geoEffects } from '../src/sim/culture';
import type { GameState } from '../src/sim/types';

function withAct(seed: string, over = {}) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('repertório', () => {
  it('mostra status e em quais discos cada música entrou', () => {
    const { s, r, act } = withAct('rep-1');
    const songs = composeSongs(s, r, act, 3);
    expect(songStatus(s, songs[0])).toBe('written');
    recordSongs(s, r, act, [songs[0].id], 1, 'balanced');
    expect(songStatus(s, songs[0])).toBe('recorded');
    expect(releaseSingle(s, r, songs[0].id)).toBeNull();
    expect(songStatus(s, songs[0])).toBe('scheduled');
    expect(songUses(s, songs[0].id)).toHaveLength(1);
    for (let i = 0; i < 2; i++) advanceMonth(s);
    expect(songStatus(s, songs[0])).toBe('released');
    expect(songUses(s, songs[0].id)[0].pending).toBe(false);
    invariant(s);
  });

  it('revisão melhora a composição, custa mais a cada vez e tem limite', () => {
    const { s, r, act } = withAct('rep-2');
    const [so] = composeSongs(s, r, act, 1);
    const before = so.lyrics;
    for (let i = 0; i < 4; i++) expect(reviseSong(s, r, so.id, 'story')).toBeNull();
    expect(so.revisions).toBe(4);
    expect(so.lyrics).toBeGreaterThanOrEqual(before);
    expect(reviseSong(s, r, so.id, 'story')).not.toBeNull();
    invariant(s);
  });

  it('cofre e descarte tiram a música do caminho, mas não o que já foi lançado', () => {
    const { s, r, act } = withAct('rep-3');
    const [a, b] = composeSongs(s, r, act, 2);
    expect(toggleVault(s, a.id)).toBeNull();
    expect(songStatus(s, a)).toBe('vault');
    expect(discardSong(s, b.id)).toBeNull();
    expect(songStatus(s, b)).toBe('discarded');
  });

  it('demo grava cru e lança; coletânea reaproveita músicas lançadas sem perder o disco original', () => {
    const { s, r, act } = withAct('rep-4');
    const [d] = composeSongs(s, r, act, 1);
    expect(releaseDemo(s, r, d.id)).toBeNull();
    expect(d.recorded).toBe(true);
    const songs = composeSongs(s, r, act, 7);
    recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
    for (const so of songs) expect(releaseSingle(s, r, so.id)).toBeNull();
    for (let i = 0; i < 2; i++) advanceMonth(s);
    const firstRel = songs[0].releaseId;
    expect(releaseCompilation(s, r, act.id, songs.map((x) => x.id))).toBeNull();
    expect(songs[0].releaseId).toBe(firstRel);
    expect(songUses(s, songs[0].id).length).toBe(2);
    invariant(s);
  });

  it('perfil comercial é determinístico e limitado a 0..100', () => {
    const { s, r, act } = withAct('rep-5');
    const [so] = composeSongs(s, r, act, 1);
    const p = songProfile(so);
    expect(songProfile(so)).toEqual(p);
    for (const v of Object.values(p)) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
  });

  it('ideias do caderno viram tema da próxima composição', () => {
    const { s, r, act } = withAct('rep-6');
    addIdea(s, r, act.id, 'tour', 9);
    const [so] = composeSongs(s, r, act, 1);
    expect(so.theme).toBeDefined();
    expect(s.ideas[act.id]).toHaveLength(0);
  });
});

describe('sedes e filiais', () => {
  it('torre e campus têm requisitos de era', () => {
    expect(HQ_LEVELS.length).toBe(6);
    const s = createGame(defaultConfig('hq-1', { startYear: 1960 }));
    s.player.hq = 3;
    expect(hqBlocker(s)).not.toBeNull();
    s.player.cash += 1e12;
    s.player.initialCash += 1e12;
    expect(upgradeHq(s)).not.toBeNull();
    expect(s.player.hq).toBe(3);
  });

  it('filiais somam capacidade e exigem o loft', () => {
    const { s } = withAct('hq-2');
    const city = CITIES.find((c) => c.id !== s.config.homeCity)!;
    expect(canOpenBranch(s, city.id)).not.toBeNull();
    s.player.hq = 2;
    const before = hqCaps(s);
    expect(openBranch(s, city.id)).toBeNull();
    const after = hqCaps(s);
    expect(after.careers).toBeGreaterThan(before.careers);
    expect(s.player.territories).toContain(city.market);
    expect(upgradeBranch(s, s.branches[0].id)).toBeNull();
    expect(hqCaps(s).sessions).toBeGreaterThan(after.sessions);
    advanceMonth(s);
    invariant(s);
  });
});

describe('geopolítica', () => {
  it('efeitos descrevem o impacto sem mencionar quando termina', () => {
    for (const g of GEO_EVENTS) {
      const txt = geoEffects(g).map((e) => e.pt).join(' ');
      expect(txt).not.toContain(String(g.to));
    }
  });
});
