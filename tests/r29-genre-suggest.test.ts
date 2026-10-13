// Rodada 29 — gênero sugerido para a banda na Nova run (cidade × ano), 🎲 entre as sugestões, rápida == completa e
// configurações com bandGenre próprio (bots, testes, códigos) intactas.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (como nos outros testes)
import { defaultConfig } from '../src/sim/bot';
import { newRunConfig20 } from '../src/sim/start17';
import { roleFromMain } from '../src/sim/sys/careers12';
import { GENRE29_TOP, autoGenre29, placeChanged29, genreScores29, rollGenre29, setBandGenre29, suggestGenres29 } from '../src/sim/genre29data';
import { genreById } from '../src/data/world';
import type { RunConfig } from '../src/sim/types';
import { buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27, type QuickRun27 } from '../src/ui/ps/home27model';
import { artDefaults29, artGenre29, rollArtGenre29 } from '../src/ui/ps/char29model';

const top = (c: string, y: number) => suggestGenres29(c, y, 1)[0];

describe('r29 gênero sugerido pela cidade e pelo ano', () => {
  it('exemplos de cidade × ano', () => {
    expect(['beat', 'rnr', 'skiffle', 'pop_rock']).toContain(top('london', 1962));
    expect(suggestGenres29('london', 1962)).toContain('beat');
    expect(['bossa', 'samba', 'samba_cancao']).toContain(top('rio', 1962));
    expect(['disco', 'punk', 'funk']).toContain(top('new_york', 1975));
    expect(suggestGenres29('new_york', 1975)).toEqual(expect.arrayContaining(['disco', 'punk']));
    expect(top('atlanta', 2010)).toBe('trap');
    expect(top('kingston', 1972)).toBe('reggae');
    expect(top('seattle', 1991)).toBe('grunge');
    expect(top('lagos', 1975)).toBe('afrobeat');
    expect(top('seoul', 2012)).toBe('kpop');
    // nada que ainda não existe; nada de "Adhunik gaan" (o primeiro em ordem alfabética) em Londres
    for (const [c, y] of [['london', 1962], ['rio', 1962], ['new_york', 1975], ['atlanta', 2010]] as [string, number][]) {
      expect(genreScores29(c, y).every((x) => genreById[x.id].born <= y)).toBe(true);
      expect(suggestGenres29(c, y)).toHaveLength(GENRE29_TOP);
    }
    expect(suggestGenres29('london', 1962)).not.toContain('adhunik_gaan');
  });

  it('rascunho novo: automático segue cidade e ano; escolha explícita fica; 🎲 percorre as sugestões', () => {
    const c = draftDefaults27(newRunConfig20({ seed: 'r29g-a', companyName: 'Selo' }));
    expect(c.genre29).toBe(0);
    expect(c.bandGenre).toBe(top('london', 1962));
    c.homeCity = 'rio';
    draftDefaults27(c);
    expect(c.bandGenre).toBe(top('rio', 1962));
    const seen = new Set<string>();
    for (let i = 0; i < GENRE29_TOP; i++) { rollGenre29(c); seen.add(c.bandGenre!); }
    expect([...seen].sort()).toEqual([...suggestGenres29('rio', 1962)].sort());
    expect(c.bandGenre).toBe(top('rio', 1962)); // volta ao começo
    rollGenre29(c);
    c.homeCity = 'atlanta'; c.startYear = 2010; placeChanged29(c); draftDefaults27(c); // novo lugar: recomeça pela melhor
    expect(c.bandGenre).toBe('trap');
    setBandGenre29(c, 'rnr');
    expect(c.genre29).toBeUndefined();
    c.homeCity = 'london'; c.startYear = 1975;
    draftDefaults27(c);
    expect(c.bandGenre).toBe('rnr'); // escolhido fica
    setBandGenre29(c, 'trap'); // ainda não existe em 1975: ignorado
    expect(c.bandGenre).toBe('rnr');
    // a marca é só do rascunho
    expect(buildRun27(c).genre29).toBeUndefined();
  });

  it('rápida == completa (automático, 🎲 e lista)', () => {
    const full = (seed: string, e: Partial<QuickRun27>, act: (c: RunConfig) => void): RunConfig => {
      const c = draftDefaults27(newRunConfig20({ seed, companyName: 'Selo' }));
      if (e.startYear) c.startYear = e.startYear;
      if (e.homeCity) c.homeCity = e.homeCity;
      const m = c.careers!; m.main = ['musician']; c.role = roleFromMain(m.main);
      draftDefaults27(c);
      act(c);
      return draftDefaults27(c);
    };
    const e = { startYear: 1975, homeCity: 'new_york', career: 'musician' };
    const q = (a: Partial<ReturnType<typeof artDefaults29>>): QuickRun27 => ({ ...quickDefaults27('r29g-q', 'Selo'), ...e, art29: { ...artDefaults29(), ...a } });
    // sem mexer: a sugestão principal
    const q0 = q({});
    expect(quickRunConfig27(q0).bandGenre).toBe(top('new_york', 1975));
    expect(quickRunConfig27(q0)).toEqual(full('r29g-q', e, () => undefined));
    // 🎲 duas vezes
    const a = { ...artDefaults29() };
    rollArtGenre29(e, a); rollArtGenre29(e, a);
    expect(artGenre29(e, a)).toBe(suggestGenres29('new_york', 1975)[2]);
    expect(quickRunConfig27(q(a))).toEqual(full('r29g-q', e, (c) => { rollGenre29(c); rollGenre29(c); }));
    expect(quickRunConfig27(q(a)).bandGenre).toBe(artGenre29(e, a));
    // escolha na lista e depois 🎲 (sai da posição da escolhida)
    const pick = suggestGenres29('new_york', 1975)[3];
    expect(quickRunConfig27(q({ genre: 'folk' }))).toEqual(full('r29g-q', e, (c) => setBandGenre29(c, 'folk')));
    const b = { ...artDefaults29(), genre: pick };
    rollArtGenre29(e, b);
    expect(quickRunConfig27(q(b))).toEqual(full('r29g-q', e, (c) => { setBandGenre29(c, pick); rollGenre29(c); }));
    expect(artGenre29(e, b)).toBe(suggestGenres29('new_york', 1975)[4]);
  });

  it('configurações com bandGenre próprio não mudam (bots, testes, códigos de run)', () => {
    const bot = defaultConfig('r29g-bot', { role: 'artist', bandGenre: 'samba' });
    expect(bot.genre29).toBeUndefined();
    const d = draftDefaults27(JSON.parse(JSON.stringify(bot)) as RunConfig);
    expect(d.bandGenre).toBe('samba');
    expect(autoGenre29({ homeCity: 'london', startYear: 1962 })).toBe(top('london', 1962));
    // o motor não lê a marca: o mesmo jogo com ou sem ela
    const c = draftDefaults27(newRunConfig20({ seed: 'r29g-eq', companyName: 'Selo' }));
    const m = c.careers!; m.main = ['musician']; c.role = roleFromMain(m.main);
    const run = buildRun27(c);
    const s = createGame(run);
    expect(s.acts[s.player.bandActId!].genre).toBe(top('london', 1962));
  });
});
