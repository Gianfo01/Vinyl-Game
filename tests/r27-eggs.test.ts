// Rodada 27 — ovos de Páscoa: cada gatilho dispara no estado montado (e só nele), determinismo, raridade numa
// partida normal do bot, cobertura do catálogo e os ovos de interface (busca, Konami, desfazer 1959).
import { worldRec } from '../src/sim/sys/feststore';
import { addOwnFest } from '../src/sim/sys/feststore';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { EGGS27, FEATS27 } from '../src/data/eggs27';
import { FESTIVALS } from '../src/data/catalog';
import { defaultConfig } from '../src/sim/bot';
import { emitFact, recentFacts } from '../src/sim/facts17';
import { makeAct } from '../src/sim/people';
import { simulatePlayer } from '../src/sim/playbot16';
import { P } from '../src/sim/sys/people/state';
import { RULES27, eg27, eggMonth27, eggRun27, eggTest27, found27, streetBusker27, type Show27 } from '../src/sim/sys/eggs27';
import { disc18 } from '../src/sim/sys/discover18';
import { fk19 } from '../src/sim/sys/fakes19';
import { soc18 } from '../src/sim/sys/society18';
import { ACHIEVEMENTS } from '../src/sim/sys/live/achievements';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { Act, GameState, Release, Song } from '../src/sim/types';
import { eggCmds27, konamiKey27, undoEgg27 } from '../src/ui/sys/eggs27';

const BASE = (() => {
  const s = createGame(defaultConfig('r27-eggs', { homeCity: 'reykjavik', startYear: 1960 }));
  for (const a of Object.values(s.acts)) if (a.owner === 'player') a.owner = null;
  return JSON.stringify(s);
})();
const fresh = (): GameState => JSON.parse(BASE) as GameState;
let n = 0;
function act(s: GameState, o: { genre: string; city: string; fame?: number; members?: number; owner?: string | null; potential?: number }): Act {
  const a = makeAct(s, Rng.fromSeed(`t27|${n++}`), { genre: o.genre, city: o.city, members: o.members ?? 3, potential: o.potential ?? 60, formed: s.year - 3, debutYear: s.year - 2, fame: o.fame ?? 10 });
  a.owner = o.owner === undefined ? 'player' : o.owner;
  a.status = 'active';
  return a;
}
const when = (s: GameState, y: number, m = 0) => { s.year = y; s.month = m; };
function rel(s: GameState, a: Act, o: Partial<Release>): Release {
  const id = `rx${n++}`;
  const r = { id, actId: a.id, owner: 'player', type: 'lp', title: `Disco ${id}`, songs: [], week: 0, year: s.year, formats: ['lp'], totalUnits: 1000, weekly: [], ...o } as unknown as Release;
  s.releases[id] = r; a.releases.push(id);
  return r;
}
function song(s: GameState, a: Act, o: Partial<Song>): Song {
  const id = `sx${n++}`;
  const so = { id, actId: a.id, title: `Faixa ${id}`, genre: a.genre, q: 50, ...o } as unknown as Song;
  s.songs[id] = so; a.songs.push(id);
  return so;
}
const show = (a: Act, o: Partial<Show27> = {}): Show27 => ({ actId: a.id, cityId: a.city, sold: 100, capacity: 200, revenue: 0, tourId: 't', ...o });

/** Montagem de cada ovo da simulação: devolve o show (para os ovos de palco). */
const SETUP: Record<string, (s: GameState) => Show27 | void> = {
  memphis_1953: (s) => { when(s, 1953); s.config.homeCity = 'memphis'; },
  decca_1962: (s) => { when(s, 1962); const a = act(s, { genre: 'beat', city: 'liverpool', members: 4, owner: null }); disc18(s).passed[a.id] = s.week; },
  decca_audition: (s) => { when(s, 1962); s.config.homeCity = 'london'; },
  rooftop_1969: (s) => { when(s, 1969, 0); act(s, { genre: 'pop_rock', city: 'london', members: 4 }); },
  dawn_set: (s) => { when(s, 1969, 8); const a = act(s, { genre: 'hard_rock', city: 'seattle' }); (() => { const fi = FESTIVALS.findIndex((f) => f.name === 'Timberfield Rock'); worldRec(s, fi).ed = { fi, year: 1969, month: 7, lineup: [{ actId: a.id, tier: 'headline', fee: 0 }], done: true }; })(); },
  lipsync_skip: (s) => { when(s, 1990); const a = act(s, { genre: 'dance_pop', city: 'berlin', members: 2, fame: 50 }); fk19(s).lip.push({ act: a.id, since: s.week, risk: 30, by: 'player', mimes: 0 }); },
  amp11: (s) => { when(s, 1985); act(s, { genre: 'heavy_metal', city: 'birmingham' }); },
  stonehenge: (s) => { when(s, 1985); const a = act(s, { genre: 'heavy_metal', city: 'birmingham' }); eg27(s).amp[a.id] = 1; return show(a); },
  drummer_curse: (s) => { const a = act(s, { genre: 'heavy_metal', city: 'london' }); eg27(s).drums[a.id] = ['d1', 'd2', 'd3']; },
  brown_mms: (s) => { when(s, 1982); return show(act(s, { genre: 'hard_rock', city: 'los_angeles', fame: 40 })); },
  mystery_tape_offer: (s) => { when(s, 1970); },
  mystery_tape: (s) => { const a = act(s, { genre: 'folk', city: 'detroit', members: 1 }); a.releases.push('old'); eg27(s).tape = { act: a.id, y: 1970 }; when(s, 2005); },
  fifth_member: (s) => { const a = act(s, { genre: 'pop_rock', city: 'london', fame: 80 }); for (let i = 0; i < 4; i++) song(s, a, { producerId: 'prodX' }); },
  lost_letter: (s) => { const a = act(s, { genre: 'soul', city: 'detroit' }); const p = s.persons[a.members[0]]; p.alive = false; p.died = 1970; when(s, 1985); },
  one_album_legend: (s) => { const a = act(s, { genre: 'post_punk', city: 'manchester' }); a.legend = true; rel(s, a, { type: 'lp' }); },
  noise_cult: (s) => { when(s, 1990); const a = act(s, { genre: 'art_rock', city: 'new_york' }); const ss = [0, 1].map(() => song(s, a, { minutes: 32, sound: { v: [50, 50, 50, 10, 20, 95] } })); rel(s, a, { type: 'lp', year: 1975, totalUnits: 900, songs: ss.map((x) => x.id) }); },
  full_circle: (s) => { const a = act(s, { genre: 'pop_rock', city: 'london' }); s.persons[a.members[0]].parentId = 'pParent'; eg27(s).alum.pParent = 1; },
  jovem_guarda: (s) => { when(s, 1966); act(s, { genre: 'jovem_guarda', city: 'sao_paulo' }); },
  tropicalia_exile: (s) => { when(s, 1970); const a = act(s, { genre: 'tropicalia', city: 'london' }); soc18(s).exile[a.id] = { from: 'salvador', to: 'london', since: 1969, reg: 'br' }; },
  sai_do_chao: (s) => { when(s, 1995); return show(act(s, { genre: 'axe', city: 'salvador' }), { cityId: 'salvador', sold: 5000, capacity: 5000 }); },
  edison_lamb: (s) => { s.config.startYear = 1889; when(s, 1889); },
  edison_tone31: (s) => { when(s, 1920); return show(act(s, { genre: 'nola_jazz', city: 'new_orleans' })); }, // R31 (N): Tone Test 1915–25
  edison_cyl31: (s) => { when(s, 1925); }, // R31 (N): o último freguês dos cilindros (antes de 1931)
  caruso_hotel: (s) => { when(s, 1903); act(s, { genre: 'opera', city: 'milan', members: 1 }); },
  bristol_1927: (s) => { when(s, 1927); act(s, { genre: 'country', city: 'nashville' }); },
  crossroads: (s) => { when(s, 1936); const a = act(s, { genre: 'delta_blues', city: 'memphis', members: 1 }); s.persons[a.members[0]].role = 'guitar'; },
  sinatra_riot: (s) => { when(s, 1944, 9); act(s, { genre: 'trad_pop', city: 'new_york', fame: 45, members: 1 }); },
  crosby_tape: (s) => { when(s, 1947); act(s, { genre: 'trad_pop', city: 'los_angeles', fame: 45, members: 1 }); },
  million_quartet: (s) => { when(s, 1956, 11); s.config.homeCity = 'memphis'; act(s, { genre: 'rnr', city: 'memphis' }); act(s, { genre: 'country', city: 'memphis' }); },
  chega_de_saudade: (s) => { when(s, 1958); act(s, { genre: 'bossa', city: 'rio' }); },
  sullivan_1964: (s) => { when(s, 1964, 1); act(s, { genre: 'beat', city: 'liverpool', fame: 35 }); },
  scrambled_eggs: (s) => { when(s, 1966); const a = act(s, { genre: 'pop_rock', city: 'london' }); s.persons[a.members[0]].skills.comp = 80; },
  newport_1965: (s) => { when(s, 1965, 6); act(s, { genre: 'folk', city: 'new_york', fame: 30, members: 1 }); },
  chacrinha: (s) => { when(s, 1970); act(s, { genre: 'samba', city: 'rio', fame: 30 }); },
  glastonbury_milk: (s) => { when(s, 1971); addOwnFest(s, { id: 'fz', name: 'Fest', cityId: 'bristol', editions: [{ year: 1970 }] } as never); },
  clube_esquina: (s) => { when(s, 1972); act(s, { genre: 'mpb', city: 'bh' }); },
  ziggy_1973: (s) => { when(s, 1973); act(s, { genre: 'glam', city: 'london' }); },
  bronx_1973: (s) => { when(s, 1973, 7); act(s, { genre: 'funk', city: 'new_york' }); },
  waterloo_1974: (s) => { when(s, 1974, 3); act(s, { genre: 'nordic_pop', city: 'stockholm', members: 4 }); },
  grandola_1974: (s) => { when(s, 1974, 3); act(s, { genre: 'fado', city: 'lisbon', members: 1 }); },
  bowery_punk: (s) => { when(s, 1976); act(s, { genre: 'punk', city: 'new_york' }); },
  racional: (s) => { when(s, 1975); act(s, { genre: 'soul_br', city: 'rio', members: 1 }); },
  racional_bloom: (s) => { const a = act(s, { genre: 'soul_br', city: 'rio', members: 1 }); eg27(s).rac = { act: a.id, y: 1975 }; when(s, 2006); },
  grundy_1976: (s) => { when(s, 1977); act(s, { genre: 'punk', city: 'london', members: 4 }); },
  peace_1978: (s) => { when(s, 1978, 3); act(s, { genre: 'reggae', city: 'kingston', fame: 40 }); },
  robots: (s) => { when(s, 1980); act(s, { genre: 'synthpop', city: 'berlin', members: 4 }); },
  disco_demolition: (s) => { when(s, 1979, 6); act(s, { genre: 'disco', city: 'new_york' }); },
  walkman: (s) => { when(s, 1980); rel(s, act(s, { genre: 'new_wave', city: 'tokyo' }), { formats: ['cassette'] as never, year: 1979 }); },
  home_taping: (s) => { when(s, 1982); rel(s, act(s, { genre: 'new_wave', city: 'london' }), { formats: ['cassette'] as never }); },
  mtv_1981: (s) => { when(s, 1981, 7); act(s, { genre: 'new_wave', city: 'london' }); },
  first_cd: (s) => { when(s, 1982, 8); rel(s, act(s, { genre: 'pop_rock', city: 'tokyo' }), { formats: ['cd'] as never }); },
  rock_in_rio_mud: (s) => { when(s, 1985, 0); act(s, { genre: 'hard_rock', city: 'los_angeles', fame: 50 }); },
  live_aid: (s) => { when(s, 1985, 6); act(s, { genre: 'pop_rock', city: 'london', fame: 60 }); },
  graceland: (s) => { when(s, 1986); act(s, { genre: 'mbaqanga', city: 'johannesburg' }); },
  wall_1989: (s) => { when(s, 1989, 10); act(s, { genre: 'techno', city: 'berlin' }); },
  mangue_1991: (s) => { when(s, 1992); act(s, { genre: 'rock_br', city: 'recife' }); },
  grunge_1992: (s) => { when(s, 1992); act(s, { genre: 'grunge', city: 'seattle' }); },
  slave_cheek: (s) => { when(s, 1993); const a = act(s, { genre: 'funk', city: 'minneapolis', fame: 70, members: 1 }); a.trust = 10; },
  klf_burn: (s) => { when(s, 1995); const a = act(s, { genre: 'techno', city: 'london', members: 2 }); a.cash = 1e12; },
  buena_vista: (s) => { when(s, 1997); const a = act(s, { genre: 'son', city: 'havana' }); for (const m of a.members) s.persons[m].born = 1925; },
  helmets: (s) => { when(s, 1998); act(s, { genre: 'french_house', city: 'paris', members: 2 }); },
  napster_leak: (s) => { when(s, 2000); const a = act(s, { genre: 'heavy_metal', city: 'los_angeles' }); s.pendingReleases.push({ id: 'pr', actId: a.id, title: 'Novo' } as never); },
  kpop_vote: (s) => { when(s, 2012); const a = act(s, { genre: 'kpop', city: 'seoul', members: 5 }); a.fans.core = 50000; },
  pwyw_2007: (s) => { when(s, 2008); act(s, { genre: 'alt_rock', city: 'bristol', fame: 60 }); },
  rickroll: (s) => { when(s, 2008); rel(s, act(s, { genre: 'dance_pop', city: 'london', members: 1 }), { type: 'single', year: 1987 }); },
  needle_drop: (s) => { when(s, 2017); rel(s, act(s, { genre: 'synthpop', city: 'london' }), { year: 1985 }); },
  city_pop_revival: (s) => { when(s, 2018); rel(s, act(s, { genre: 'city_pop', city: 'tokyo', members: 1 }), { year: 1984 }); },
  fex_hunt: (s) => { when(s, 2010); const a = act(s, { genre: 'new_wave', city: 'hamburg', owner: null }); a.debutYear = 1984; a.status = 'split'; song(s, a, { title: 'Subways' }); },
};

describe('r27 ovos de Páscoa — gatilhos', () => {
  it('todo ovo da simulação tem montagem de teste e todo ovo do catálogo tem caminho', () => {
    expect(RULES27.map((r) => r.id).filter((id) => !SETUP[id])).toEqual([]);
    const sim = new Set(RULES27.map((r) => r.id));
    const event = new Set(['guitar_smash', 'street_3am']); // fato do concurso / clique no mapa
    const orphan = EGGS27.filter((e) => (e.kind === 'sim' || e.kind === 'feat') && !sim.has(e.id) && !event.has(e.id)).map((e) => e.id);
    expect(orphan).toEqual([]);
    expect(EGGS27.length).toBeGreaterThanOrEqual(55);
    expect(new Set(EGGS27.map((e) => e.id)).size).toBe(EGGS27.length);
    for (const f of FEATS27) expect(ACHIEVEMENTS.some((a) => a.id === `egg27:${f.id}` && a.hidden)).toBe(true);
  });
  for (const x of RULES27) {
    it(`${x.id}: dispara no estado montado e só nele`, () => {
      // estado comum (sem a montagem) não dispara, nem com um show qualquer
      const sh0 = SETUP[x.id](fresh()) ?? undefined;
      const plain = fresh();
      if (x.id === 'mystery_tape_offer') when(plain, 1940); // ovo sem data (só a era do disco): fora da era não dispara
      expect(eggTest27(plain, x.id, sh0 ? { ...sh0, actId: 'nobody' } : undefined)).toBe(false);
      const s = fresh();
      const sh = SETUP[x.id](s) ?? undefined;
      expect(eggTest27(s, x.id, sh)).toBe(true);
      const facts0 = recentFacts(s, { months: 9999 }).length, inbox0 = P(s).inbox.length;
      expect(eggRun27(s, x.id, sh)).toBe(true);
      expect(eg27(s).seen[x.id]).toBeDefined();
      // efeito visível: fato `easter_egg` ou mensagem na caixa
      expect(recentFacts(s, { months: 9999 }).length + P(s).inbox.length).toBeGreaterThan(facts0 + inbox0);
    });
  }
  it('respostas da caixa: aceitar dispara o ovo com fato; o padrão (último botão) é seguro', async () => {
    const { answerMsg } = await import('../src/sim/sys/people/inbox');
    const s = fresh(); SETUP.rooftop_1969(s); eggRun27(s, 'rooftop_1969');
    const m = P(s).inbox.find((x) => x.ref?.egg === 'rooftop_1969')!;
    const f0 = recentFacts(s, { months: 99 }).filter((f) => f.kind === 'easter_egg').length;
    answerMsg(s, m.id, 'play');
    expect(recentFacts(s, { months: 99 }).filter((f) => f.kind === 'easter_egg').length).toBe(f0 + 1);
    // Decca: passar a audição libera a conquista secreta
    const d = fresh(); SETUP.decca_audition(d); eggRun27(d, 'decca_audition');
    const md = P(d).inbox.find((x) => x.ref?.egg === 'decca_audition')!;
    expect(md.actions!.at(-1)!.id).toBe('pass');
    answerMsg(d, md.id, 'pass');
    expect(eg27(d).feats.decca27).toBeDefined();
    expect(eg27(d).seen.decca_1962).toBeDefined();
  });
  it('caça à gravação perdida (FEX): ajudar identifica, gera revival e conquista', async () => {
    const { answerMsg } = await import('../src/sim/sys/people/inbox');
    const s = fresh(); SETUP.fex_hunt(s); eggRun27(s, 'fex_hunt');
    const h = eg27(s).hunt!;
    const a = s.acts[h.act], fame0 = a.fame;
    const m = P(s).inbox.find((x) => x.ref?.egg === 'fex_hunt')!;
    answerMsg(s, m.id, 'members');
    // segunda rodada de ajuda: arquivo (não é do jogador) e fitas master; força o fechamento
    h.clues = Math.max(h.clues, 2); h.next = s.week;
    eggMonth27(s);
    expect(eg27(s).hunt!.done).toBeDefined();
    expect(s.acts[h.act].fame).toBeGreaterThan(fame0);
    expect(eg27(s).feats.lostmedia27).toBeDefined();
    // sem ajuda, a comunidade resolve sozinha depois de ~17 anos (sem conquista)
    const t = fresh(); SETUP.fex_hunt(t); eggRun27(t, 'fex_hunt');
    const ht = eg27(t).hunt!; ht.next = t.week; t.year = ht.y0 + 17;
    eggMonth27(t);
    expect(eg27(t).hunt!.done).toBeDefined();
    expect(eg27(t).feats.lostmedia27).toBeUndefined();
  });
  it('festival da canção: vaia num ato seu abre a opção de quebrar o violão', () => {
    const s = fresh(); when(s, 1967, 9);
    const a = act(s, { genre: 'mpb', city: 'sao_paulo' });
    emitFact(s, { kind: 'contest_final', actors: ['npcWinner', a.id], severity: 40, tags: ['contests19', 'song', 'booed'], text: { pt: 'x', en: 'x' }, data: { ct: 'mpb' } });
    expect(P(s).inbox.some((m) => m.ref?.egg === 'guitar_smash')).toBe(true);
    const t = fresh(); when(t, 1985, 9); const b = act(t, { genre: 'mpb', city: 'sao_paulo' });
    emitFact(t, { kind: 'contest_final', actors: ['npcWinner', b.id], severity: 40, tags: ['contests19', 'song', 'booed'], text: { pt: 'x', en: 'x' }, data: { ct: 'mpb' } });
    expect(P(t).inbox.some((m) => m.ref?.egg === 'guitar_smash')).toBe(false);
  });
  it('músico das 3 da manhã: uma vez por partida', () => {
    const s = fresh();
    expect(streetBusker27(s)).not.toBeNull();
    expect(streetBusker27(s)).toBeNull();
    expect(found27(s)).toContain('street_3am');
  });
});

describe('r27 ovos — determinismo e raridade', () => {
  it('mesma semente → mesmos ovos (o telhado de 1969 numa partida de verdade)', () => {
    const run = () => {
      n = 5000;
      const s = createGame(defaultConfig('r27-det', { startYear: 1969, homeCity: 'london' }));
      act(s, { genre: 'pop_rock', city: 'london', members: 4, fame: 30 });
      for (let i = 0; i < 2 && !s.ended; i++) advanceMonth(s);
      return { seen: eg27(s).seen, id: s.idSeq, cash: s.player.cash, inbox: P(s).inbox.filter((m) => m.ref?.egg).map((m) => m.ref!.egg) };
    };
    const a = run(), b = run();
    expect(a).toEqual(b);
    expect(a.seen.rooftop_1969).toBeDefined();
  });
  it('partida normal do bot (2 anos): no máximo um punhado de ovos', () => {
    const { state } = simulatePlayer(defaultConfig('r27-bot', { startYear: 1975, realNames: true }), 2, 'balanced');
    const seen = Object.keys(eg27(state).seen);
    console.log('r27 ovos no bot (2 anos):', seen);
    expect(seen.length).toBeLessThanOrEqual(5);
  });
});

describe('r27 ovos — interface', () => {
  it('códigos da busca só com o texto exato', () => {
    const s = fresh();
    expect(eggCmds27(s, 'payola').length).toBe(1);
    expect(eggCmds27(s, 'Hall da Fama').length).toBe(1);
    expect(eggCmds27(s, 'jabá').length).toBe(1);
    expect(eggCmds27(s, '1889').length).toBe(1);
    expect(eggCmds27(s, 'pay').length).toBe(0);
    expect(eggCmds27(s, 'beatles').length).toBe(0);
  });
  it('Konami fecha só na sequência certa', () => {
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b'];
    for (const k of seq) expect(konamiKey27(k)).toBe(false);
    expect(konamiKey27('a')).toBe(true);
    for (const k of seq) konamiKey27(k);
    expect(konamiKey27('x')).toBe(false);
  });
  it('desfazer fevereiro de 1959: mensagem respeitosa uma vez; outros meses, nada', () => {
    const s = fresh(); when(s, 1959, 2);
    expect(undoEgg27(s)).toMatch(/1959/);
    expect(undoEgg27(s)).toBeNull();
    const t = fresh(); when(t, 1960, 2);
    expect(undoEgg27(t)).toBeNull();
  });
});
