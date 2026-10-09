// Rodada 8 — direção sonora (§3.2): eixos por faixa puxados por produtor, integrantes e momento de
// vida de quem compõe; direção pretendida; descrição curta bilíngue; assinatura do artista e do
// selo; e efeitos no jogo (canais, palco, crítica, capa).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { runSimHooks } from '../src/sim/ext4';
import { activeCritics } from '../src/sim/media';
import { PRODUCERS } from '../src/sim/studio';
import { composeSongs, recordSongs } from '../src/sim/production';
import {
  applyRecord, bestWorst, clearSoundCache, composerPull, coverFit, criticTaste, describeRelease, describeSong, dist, fitVerdict, instrumentPull, labelSignature,
  liveFactor, naturalSound, outletFit, setActAim, snd, soundAppeal, soundOf, soundPhrases,
} from '../src/sim/sys/sound';
import { instrumentsOf } from '../src/sim/sys/instruments';
import type { GameState, Release, Song } from '../src/sim/types';
import { remember, rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

function withAct(seed: string, year = 1990) {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 30 });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

function fakeRelease(s: GameState, id: string, actId: string, songs: string[], extra: Partial<Release> = {}): Release {
  const rel = { id, actId, owner: 'player', type: songs.length > 1 ? 'lp' : 'single', title: id, songs, week: s.week, year: s.year, q: 60, appeal: 1, peak: 999, weekly: [], territories: ['na'], marketing: [], formats: [], ...extra } as unknown as Release;
  s.releases[id] = rel;
  s.acts[actId].releases.push(id);
  return rel;
}

function fixedSong(s: GameState, actId: string, id: string, v: number[]): Song {
  const so = { id, actId, title: id, genre: s.acts[actId].genre, writers: [], melody: 60, lyrics: 60, performance: 60, production: 60, originality: 50, q: 60, recorded: true, createdWeek: s.week, sound: { v, f: 1, r: 1 } } as unknown as Song;
  s.songs[id] = so;
  return so;
}

describe('eixos puxados por quem está envolvido', () => {
  it('composição grava os seis eixos; produtor seco e produtor polido levam a mesma faixa para lados opostos', () => {
    const { s, r, act } = withAct('snd-prod');
    const [so] = composeSongs(s, r, act, 1);
    expect(so.sound?.v).toHaveLength(9);
    expect(so.sound!.v.every((x) => x >= 0 && x <= 100)).toBe(true);
    const dry = { ...so, sound: { v: [...so.sound!.v] }, recorded: true, producerId: PRODUCERS.find((p) => p.signature === 'dry' || p.signature === 'lofi')!.id, studioTier: 2, approach: 'balanced' } as Song;
    const gloss = { ...so, sound: { v: [...so.sound!.v] }, recorded: true, producerId: PRODUCERS.find((p) => p.signature === 'glossy' || p.signature === 'neural')!.id, studioTier: 2, approach: 'balanced' } as Song;
    applyRecord(s, dry);
    applyRecord(s, gloss);
    expect(gloss.sound!.v[4] - dry.sound!.v[4]).toBeGreaterThanOrEqual(20); // polimento
    expect(gloss.sound!.v[1]).toBeGreaterThan(dry.sound!.v[1] - 1); // seco é menos denso
    expect(dry.sound!.r).toBe(1);
    // gravação pela agenda também aplica a camada (abordagem espontânea deixa mais cru)
    const songs = composeSongs(s, r, act, 2);
    const before = songs.map((x) => x.sound!.v[4]);
    recordSongs(s, r, act, songs.map((x) => x.id), 0, 'spontaneous');
    expect(songs.every((x) => x.sound?.r === 1)).toBe(true);
    expect(songs[0].sound!.v[4]).toBeLessThan(before[0]);
    invariant(s);
  });

  it('instrumentos dos integrantes: sintetizador e computador puxam para o eletrônico, violão para o acústico', () => {
    const { s, act } = withAct('snd-inst', 1995);
    const inst = (s as unknown as { x4: { inst: { people: Record<string, { list: { id: string; lvl: number }[] }> } } }).x4.inst;
    for (const id of act.members) inst.people[id] = { list: [{ id: 'synth', lvl: 90 }, { id: 'daw', lvl: 85 }] };
    const el = instrumentPull(s, act).d[2];
    for (const id of act.members) inst.people[id] = { list: [{ id: 'acoustic', lvl: 90 }, { id: 'harmonica', lvl: 70 }] };
    const ac = instrumentPull(s, act).d[2];
    expect(el).toBeGreaterThan(8);
    expect(ac).toBeLessThan(-5);
    expect(instrumentsOf(s, s.persons[act.members[0]])[0].id).toBe('acoustic');
  });

  it('momento de vida de quem compõe: luto baixa a energia e aproxima a voz; vício aumenta a experimentação', () => {
    const { s, act } = withAct('snd-life');
    for (const id of act.members) { const p = s.persons[id]; p.stress = 30; p.fatigue = 10; p.morale = 60; p.inspiration = 50; p.health = 'ok'; p.born = s.year - 32; }
    clearSoundCache();
    const calm = naturalSound(s, act).v;
    remember(s, 'death', { pt: 'Morre alguém', en: 'Someone dies' }, { actId: act.id });
    clearSoundCache();
    const grief = composerPull(s, act);
    expect(grief.moments.some((m) => m.code === 'gr')).toBe(true);
    const gv = naturalSound(s, act).v;
    expect(gv[0]).toBeLessThan(calm[0] - 8); // energia
    expect(gv[3]).toBeGreaterThan(calm[3] + 5); // voz na frente
    // vício de quem compõe
    s.memory = s.memory.filter((m) => m.kind !== 'death');
    for (const id of act.members) s.persons[id].health = 'addiction';
    clearSoundCache();
    const ad = naturalSound(s, act);
    expect(ad.moments.some((m) => m.code === 'ad')).toBe(true);
    expect(ad.v[5]).toBeGreaterThan(calm[5] + 10);
    expect(ad.v[4]).toBeLessThan(calm[4] - 8);
    // idade também conta: veteranos soam mais maduros
    for (const id of act.members) { s.persons[id].health = 'ok'; s.persons[id].born = s.year - 60; }
    clearSoundCache();
    const old = naturalSound(s, act);
    expect(old.moments.some((m) => m.code === 'ol')).toBe(true);
    expect(old.v[0]).toBeLessThan(calm[0]);
  });

  it('o momento de vida também muda o tema e fica registrado na faixa', () => {
    const { s, r, act } = withAct('snd-theme');
    remember(s, 'death', { pt: 'Morre alguém', en: 'Someone dies' }, { actId: act.id });
    clearSoundCache();
    const songs = composeSongs(s, r, act, 6);
    expect(songs.every((x) => x.sound?.m?.includes('gr'))).toBe(true);
    const themes = songs.map((x) => (s.x4.creation.songs[x.id] as { theme?: string }).theme);
    expect(themes.some((t) => t === 'longing' || t === 'heartbreak' || t === 'faith')).toBe(true);
    expect(describeSong(s, songs[0]).pt).toContain('luto');
  });

  it('direção pretendida: a faixa chega mais perto do que o jogador pediu, mas não exatamente', () => {
    const { s, r, act } = withAct('snd-aim');
    const aim = [90, -1, -1, 85, 20, -1];
    const free = composeSongs(s, r, act, 4).map((x) => x.sound!.v);
    setActAim(s, act.id, aim);
    const aimed = composeSongs(s, r, act, 4);
    const dFree = free.reduce((t, v) => t + dist(v, aim), 0) / free.length;
    const dAim = aimed.reduce((t, x) => t + dist(x.sound!.v, aim), 0) / aimed.length;
    expect(dAim).toBeLessThan(dFree - 5);
    expect(dAim).toBeGreaterThan(1);
    expect(aimed[0].sound?.a).toEqual(aim);
  });
});

describe('descrição curta e específica', () => {
  it('frases concordam em português e o veredito aponta onde o som funciona', () => {
    const { s } = withAct('snd-desc', 1992);
    const raw = [80, 50, 15, 80, 28, 50];
    const ph = soundPhrases(s, raw, { inst: 'guitar', hook: 70 }).map((x) => x.pt);
    expect(ph).toContain('guitarras secas');
    expect(ph).toContain('voz próxima');
    expect(ph).toContain('refrão aberto');
    const en = soundPhrases(s, raw, { inst: 'guitar', hook: 70 }).map((x) => x.en);
    expect(en).toContain('dry guitars');
    const v = fitVerdict(s, raw);
    expect(v.pt).toMatch(/forte para clubes pequenos/);
    expect(v.en).toMatch(/strong for small clubs/);
    expect(v.pt).toMatch(/menos compatível com (rádio adulta|playlists|a crítica)/);
  });

  it('cada faixa e cada disco ganham descrição bilíngue', () => {
    const { s, r, act } = withAct('snd-desc2');
    const songs = composeSongs(s, r, act, 4);
    recordSongs(s, r, act, songs.map((x) => x.id), 2, 'balanced');
    for (const so of songs) {
      const d = describeSong(s, so);
      expect(d.pt.length).toBeGreaterThan(30);
      expect(d.en.length).toBeGreaterThan(30);
      expect(d.pt).toContain(';');
    }
    const rel = fakeRelease(s, 'rdesc', act.id, songs.map((x) => x.id));
    const d = describeRelease(s, rel)!;
    expect(d.pt).toMatch(/sequência|faixas/);
    expect(d.en).toMatch(/running order|tracks/);
  });
});

describe('assinatura sonora que evolui', () => {
  it('artista e selo acumulam os lançamentos e mudam de direção com o tempo', () => {
    const { s, r, act } = withAct('snd-sig');
    const a = fixedSong(s, act.id, 'sa', [85, 70, 20, 50, 25, 60]);
    const b = fixedSong(s, act.id, 'sb', [30, 30, 80, 80, 85, 20]);
    const r1 = fakeRelease(s, 'r1', act.id, [a.id]);
    runSimHooks('launch', s, r, { release: r1 });
    const lb = labelSignature(s);
    expect(lb.n).toBe(1);
    expect(lb.v.slice(0, 6)).toEqual(a.sound!.v.slice(0, 6));
    const first = [...snd(s).sig[act.id].v];
    for (let i = 0; i < 3; i++) {
      const so = fixedSong(s, act.id, `sb${i}`, b.sound!.v);
      const rel = fakeRelease(s, `r2${i}`, act.id, [so.id]);
      runSimHooks('launch', s, r, { release: rel });
    }
    const now = snd(s).sig[act.id];
    expect(now.n).toBe(4);
    expect(dist(now.v, b.sound!.v)).toBeLessThan(dist(first, b.sound!.v));
    expect(labelSignature(s).v[2]).toBeGreaterThan(20); // selo ficou mais eletrônico
    // a virada de ano guarda a história do selo
    runSimHooks('year', s, r);
    expect(snd(s).label.hist.length).toBe(1);
  });
});

describe('o som importa no jogo', () => {
  it('rádio prefere som polido e vocal; clubes, som cru e enérgico — e o apelo acompanha o canal', () => {
    const { s, act } = withAct('snd-fit', 1990);
    const radio = [52, 50, 30, 82, 80, 15];
    const club = [85, 55, 20, 50, 25, 60];
    expect(outletFit(s, radio, 'radio')).toBeGreaterThan(outletFit(s, club, 'radio') + 25);
    expect(outletFit(s, club, 'clubs')).toBeGreaterThan(outletFit(s, radio, 'clubs') + 25);
    expect(bestWorst(s, club).best.id).toBe('clubs');
    const sr = fixedSong(s, act.id, 'fr', radio);
    const sc = fixedSong(s, act.id, 'fc', club);
    const onRadio = (so: Song) => fakeRelease(s, `rr-${so.id}`, act.id, [so.id], { marketing: [{ channel: 'radio_plug', budget: 500000 }] });
    const onClubs = (so: Song) => fakeRelease(s, `rc-${so.id}`, act.id, [so.id], { marketing: [{ channel: 'street_team', budget: 500000 }] });
    const m = (rel: Release) => soundAppeal(s, rel, act).m;
    expect(m(onRadio(sr))).toBeGreaterThan(m(onRadio(sc)) + 0.04);
    expect(m(onClubs(sc))).toBeGreaterThan(m(onClubs(sr)) + 0.02);
    // efeito limitado: o som ajuda, mas não compra hit
    for (const so of [sr, sc]) for (const f of [onRadio, onClubs]) { const x = m(f(so)); expect(x).toBeGreaterThan(0.85); expect(x).toBeLessThan(1.16); }
  });

  it('capa coerente, gosto dos críticos e palco reagem ao som', () => {
    const { s, act } = withAct('snd-cover', 2000);
    const exp = [60, 65, 50, 40, 45, 85];
    const glossy = [55, 50, 40, 85, 85, 10];
    expect(coverFit('concept', exp)).toBeGreaterThan(coverFit('concept', glossy));
    expect(coverFit('portrait', glossy)).toBeGreaterThan(0.3);
    expect(coverFit('diy', glossy)).toBeLessThan(0);
    // crítico underground (Pitchfolk) premia o risco; o mainstream prefere o polido
    const cs = [...activeCritics(s)].sort((x, y) => x.mainstream - y.mainstream);
    const under = cs[0];
    const main = cs[cs.length - 1];
    expect(under.mainstream).toBeLessThan(0);
    expect(criticTaste(s, under.name, exp)).toBeGreaterThan(criticTaste(s, under.name, glossy));
    expect(criticTaste(s, main.name, glossy)).toBeGreaterThanOrEqual(criticTaste(s, main.name, exp));
    // palco: som cru e enérgico cresce ao vivo; estúdio polido e eletrônico sem quem toque eletrônicos perde
    snd(s).sig[act.id] = { v: [85, 60, 20, 60, 30, 50], n: 3 };
    const raw = liveFactor(s, act).m;
    const inst = (s as unknown as { x4: { inst: { people: Record<string, { list: { id: string; lvl: number }[] }> } } }).x4.inst;
    for (const id of act.members) inst.people[id] = { list: [{ id: 'guitar', lvl: 60 }] };
    snd(s).sig[act.id] = { v: [45, 70, 85, 60, 90, 40], n: 3 };
    const studio = liveFactor(s, act).m;
    expect(raw).toBeGreaterThan(1.02);
    expect(studio).toBeLessThan(0.97);
  });

  it('jogo curto: tudo tem som, o caixa fecha e faixas antigas sem registro ainda têm perfil', () => {
    const { s, r, act } = withAct('snd-run');
    const songs = composeSongs(s, r, act, 3);
    delete songs[0].sound;
    const v = soundOf(s, songs[0]);
    expect(v).toHaveLength(9);
    expect(soundOf(s, songs[0])).toEqual(v); // determinístico
    invariant(s);
  });
});
