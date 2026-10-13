// R29 (relíquias) — versões procedurais dos arquétipos do catálogo real (sim/sys/relics29): todo arquétipo gera peça
// com arte e texto pt/en, os gatilhos certos, tetos numa run de bot de 20 anos, valor que anda (pico na morte), falsa
// que precisa de perícia, modo exato sem contradizer o catálogo real e determinismo.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { emitFact, onFact, type Fact } from '../src/sim/facts17';
import { simulatePlayer } from '../src/sim/playbot16';
import { RELICS17 } from '../src/sim/relics17';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { crime17 } from '../src/sim/sys/crime17';
import { realAct17 } from '../src/sim/sys/realidx17';
import { authenticate18, isFake18, rel18 } from '../src/sim/sys/relics18';
import {
  ARCH29, ARCHDEF29, CAPS29, R29, REAL_ARCH29, canBorn29, realArch29, candidates29, flush29, forge29, make29, meta29, realKinds29, rel29, story29, venuePick29, type Arch29,
} from '../src/sim/sys/relics29';
import { RELIC_KIND, relics, type Relic } from '../src/sim/sys/relics9';
import { relicArtOf28 } from '../src/ui/pixel/relic28';
import { relicArtOf29 } from '../src/ui/pixel/relic29';
import '../src/sim/sys';

/** Desenhos aceitos por arquétipo (o tipo da peça + as palavras do nome escolhem o desenho). */
const ART: Record<Arch29, string[]> = {
  named_guitar: ['guitar', 'hollow', 'vguitar', 'acoustic', 'bass'], smashed: ['guitar', 'hollow', 'vguitar', 'acoustic', 'drums', 'micstand', 'synth'],
  stage_outfit: ['jumpsuit', 'dress', 'hat', 'boots', 'jacket', 'glove'], ceremony_outfit: ['jacket', 'dress'], napkin_lyrics: ['contract', 'lyrics'], hit_piano: ['piano'],
  master_tape: ['tape', 'cassette', 'drive', 'record'], session_mic: ['mic', 'micstand'], console: ['mixer'], first_contract: ['contract'], tour_van: ['bus', 'car'],
  statue: ['trophy', 'goldrec'], last_note: ['lyrics'], show_poster: ['poster'], drum_head: ['drums'], signed: ['record', 'cd', 'turntable', 'acoustic'],
  personal: ['glasses', 'hat', 'jacket', 'scarf'], fixture: ['neonsign'], charred: ['guitar', 'hollow', 'vguitar', 'acoustic', 'amp', 'poster'], infamous: ['phone'],
  tour_jacket: ['jacket'], tour_pass: ['pass'], artwork: ['canvas'],
};
const artOf = (k: string, en: string, y: number, seed: string) => { const a = relicArtOf28(k, en, y, seed); return relicArtOf29(k, en, y, seed, a) ?? a; };
const ROLES = ['guitar', 'bass', 'drums', 'vocal', 'keys'] as const;
const bands = (s: GameState) => Object.values(s.acts).filter((a) => a.members.length > 1 && a.members.every((id) => s.persons[id]));
/** Põe uma entrada na fila do mês e faz nascer (o caminho de sempre, sem o sorteio). */
function bornVia(s: GameState, arch: Arch29, a: Act | undefined, pid = a?.members[0] ?? '', title = 'Canção Teste', o = 'show'): Relic | undefined {
  const st = rel29(s);
  st.yc = [s.year, 0];
  st.q.push([ARCH29.indexOf(arch), a?.id ?? '', pid, a?.city ?? s.config.homeCity, 60, o, arch === 'fixture' ? 'Selo Teste' : title, `t:${arch}:${a?.id}`, '']);
  return flush29(s)[0];
}
const fact = (kind: string, actors: string[], tags: string[] = [], severity = 60, src = 'test'): Fact =>
  ({ id: 'fx', y: 1975, m: 0, w: 1, kind, actors, tags, severity, visibility: 'public', text: l('t', 't'), src });

describe('r29 relíquias — arquétipos', () => {
  it('catálogo real inteiro classificado em arquétipos', () => {
    const by: Record<string, number> = {};
    for (const d of RELICS17) { const a = realArch29(d); expect(ARCH29, d.id).toContain(a); by[a] = (by[a] ?? 0) + 1; }
    for (const id of Object.keys(REAL_ARCH29)) expect(RELICS17.some((d) => d.id === id), id).toBe(true); // exemplos à mão existem
    expect(RELICS17.length).toBeGreaterThan(90);
    expect(Object.keys(by).length).toBeGreaterThanOrEqual(15); // o catálogo real cobre a maior parte dos arquétipos
    expect(ARCH29.length).toBeGreaterThanOrEqual(20);
  });

  it('todo arquétipo gera peça com arte certa e texto pt/en (vários papéis e épocas)', () => {
    const s = createGame(defaultConfig('r29rel-a', { startYear: 1975, realNames: false }));
    const a = bands(s)[0];
    for (const arch of ARCH29) for (const y of [1955, 1972, 1988, 2012]) for (const role of ROLES) {
      const p = s.persons[a.members[0]];
      const old = p.role;
      p.role = role;
      const r = Rng.fromSeed(`t|${arch}|${y}|${role}`);
      const m = make29(s, arch, { a, pid: p.id, y, city: a.city, vi: venuePick29(s, a.city, y, r), title: 'Noite Azul', lab: 'Selo Teste' }, r);
      p.role = old;
      expect(RELIC_KIND[m.k], `${arch} ${m.k}`).toBeTruthy();
      expect(m.n.pt.length).toBeGreaterThan(8);
      expect(m.n.en.length).toBeGreaterThan(8);
      expect(m.n.pt).not.toBe(m.n.en);
      expect(`${m.n.pt}${m.n.en}`).not.toMatch(/[{}]|undefined/);
      expect(ART[arch], `${arch} ${y} ${role}: ${m.n.en} → ${artOf(m.k, m.n.en, y, 'x')}`).toContain(artOf(m.k, m.n.en, y, `sd${y}`));
      expect(m.cond).toBeGreaterThanOrEqual(0);
      expect(m.cond).toBeLessThanOrEqual(4);
    }
  });

  it('cada arquétipo nasce pelo caminho de sempre: história pt/en, procedência, valor e fato de nascimento', () => {
    const s = createGame(defaultConfig('r29rel-b', { startYear: 1980, realNames: false }));
    const born: string[] = [];
    onFact('relic', (_s, f) => { if (f.tags.includes('r29') && f.tags.includes('born')) born.push(String(f.data?.relic)); }, 'r29test:born');
    const pool = bands(s);
    ARCH29.forEach((arch, i) => {
      const a = arch === 'fixture' ? undefined : pool[i];
      const rl = bornVia(s, arch, a);
      expect(rl, arch).toBeTruthy();
      const m = meta29(s, rl!.id)!;
      expect(m.arch).toBe(arch);
      const st = story29(s, rl!)!;
      expect(st.pt.length).toBeGreaterThan(20);
      expect(st.en.length).toBeGreaterThan(20);
      expect(`${st.pt}${st.en}`).not.toMatch(/[{}]|undefined/);
      expect(rl!.v).toBeGreaterThan(0);
      expect(rel18(s).m[rl!.id]?.b).toBe(rl!.v);
      expect(born).toContain(rl!.id);
      if (arch === 'signed' || arch === 'fixture') expect(rl!.st).toBe('auction'); // leilão beneficente / do estúdio que fechou
    });
    // a peça que o selo guarda, de um ato SEU, entra direto no seu acervo
    const mineA = pool[30];
    mineA.owner = 'player';
    const c = bornVia(s, 'first_contract', mineA);
    expect(c?.st).toBe('player');
    expect(c?.own[0][0]).toBe(s.config.companyName);
  });
});

describe('r29 relíquias — gatilhos', () => {
  it('cada fato aciona os arquétipos certos (e só os fatos certos)', () => {
    const s = createGame(defaultConfig('r29rel-c', { startYear: 1975, realNames: false }));
    const [a, b2] = bands(s);
    a.fame = 60; b2.fame = 60;
    const pid = a.members[0];
    const C = (f: Fact) => candidates29(s, f)?.arch ?? [];
    expect(C(fact('show', [a.id], ['chron:legendary_show']))).toEqual(expect.arrayContaining(['smashed', 'stage_outfit', 'show_poster']));
    expect(C(fact('show', [a.id], ['chron:stage_incident']))).toEqual(['smashed', 'stage_outfit']);
    expect(C(fact('show', [a.id], ['tour', 'live'], 30, 'show27'))).toEqual([]);
    expect(C(fact('chart', [a.id], ['good', 'chron:number1']))).toContain('napkin_lyrics');
    expect(C(fact('chart', [a.id], ['good', 'mem:no1_country']))).toEqual([]);
    expect(C(fact('masterwork', [a.id], ['chron:masterwork']))).toEqual(['master_tape', 'session_mic', 'console']);
    expect(C(fact('session_star', [a.id, pid]))).toEqual(['session_mic', 'console']);
    expect(C(fact('award', [a.id], ['chron:award'], 80))).toEqual(['ceremony_outfit']);
    s.persons[pid].alive = false;
    expect(C(fact('death', [a.id, pid], ['chron:death'], 80))).toEqual(['personal', 'last_note']);
    s.persons[pid].alive = true;
    expect(C(fact('split', [a.id], [], 60))).toEqual(['drum_head', 'tour_van']);
    expect(C(fact('scandal', [a.id], [], 70))).toEqual(['infamous']);
    expect(C(fact('scandal', [a.id], [], 30))).toEqual([]);
    expect(C(fact('tour_done', [a.id], ['tour'], 50))).toEqual(['tour_jacket', 'tour_pass']);
    expect(C(fact('retired', [a.id], ['chron:retired'], 60))).toEqual(['show_poster', 'stage_outfit']);
    expect(C(fact('crowd_incident', ['player', a.id], ['safety'], 80))).toEqual(['charred']);
    expect(C(fact('disaster', [a.id], ['bad', 'fire'], 55))).toEqual(['charred']);
    expect(C(fact('disaster', [a.id], ['bad', 'flood'], 55))).toEqual([]);
    expect(C(fact('charity_show', ['player', a.id], ['good'], 55))).toEqual(['signed']);
    expect(C(fact('label_sold', ['player', 'lbX'], ['deal'], 75))).toEqual(['fixture']);
    expect(C(fact('catalog_rerelease', [a.id, 'player'], ['revival19'], 30))).toEqual(['artwork']);
    const fresh = Object.values(s.acts).find((x) => !x.releases.length)!;
    fresh.owner = 'player';
    expect(C(fact('signing', [fresh.id, 'player', 'player'], ['deal', 'artist18'], 40))).toEqual(['first_contract']);
    // todo arquétipo tem pelo menos um gatilho
    const seen = new Set<string>();
    for (const k of ['show', 'chart', 'masterwork', 'session_star', 'award', 'death', 'split', 'signing', 'scandal', 'tour_done', 'retired', 'crowd_incident', 'disaster', 'charity_show', 'label_sold', 'catalog_rerelease']) for (const d of Object.values(ARCHDEF29)) if (d.trig.includes(k)) seen.add(k);
    expect(seen.size).toBe(16);
    for (const arch of ARCH29) expect(ARCHDEF29[arch].trig.length, arch).toBeGreaterThan(0);
  });

  it('fato no barramento → fila (sorteio pela semente do fato) → peça no fechamento do mês, com a causa encadeada', () => {
    const s = createGame(defaultConfig('r29rel-d', { startYear: 1975, realNames: false }));
    const a = bands(s)[2];
    a.fame = 70;
    R29.force = true;
    try {
      const f = emitFact(s, { kind: 'show', actors: [a.id], place: a.city, severity: 60, tags: ['show', 'chron:legendary_show'], text: l('Show lendário de teste', 'Test legendary show') });
      expect(rel29(s).q.length).toBe(1);
      const out = flush29(s);
      expect(out.length).toBe(1);
      expect(out[0].a).toBe(a.id);
      expect(['smashed', 'stage_outfit', 'show_poster', 'named_guitar']).toContain(meta29(s, out[0].id)!.arch);
      const bf = [...(s.x4 as unknown as { facts17: { f: Fact[] } }).facts17.f].reverse().find((x) => x.data?.relic === out[0].id)!;
      expect(bf.cause).toEqual([f.id]);
      // 1 por ato por ano: o mesmo fato de novo não faz outra peça do mesmo ato este ano
      emitFact(s, { kind: 'show', actors: [a.id], place: a.city, severity: 60, tags: ['show', 'chron:legendary_show'], text: l('Outro', 'Another') });
      expect(flush29(s).length).toBe(0);
    } finally { R29.force = false; }
  });
});

describe('r29 relíquias — valor, falsificação, modo exato', () => {
  it('pico na morte de quem usou a peça; vai aos herdeiros; volta valoriza; escândalo derruba (menos o objeto do escândalo)', () => {
    const s = createGame(defaultConfig('r29rel-e', { startYear: 1980, realNames: false }));
    const [a, b] = bands(s);
    a.fame = 55;
    const pid = a.members[0];
    const rl = bornVia(s, 'named_guitar', a, pid)!;
    expect(meta29(s, rl.id)!.prov).toBe('a');
    const v0 = rl.v;
    s.persons[pid].alive = false; s.persons[pid].died = s.year;
    emitFact(s, { kind: 'death', actors: [a.id, pid], severity: 80, tags: ['bad'], text: l('Morre X', 'X dies') });
    expect(rl.v).toBeGreaterThanOrEqual(Math.round(v0 * 1.25));
    expect(meta29(s, rl.id)!.prov).toBe('h');
    expect(rl.own.at(-1)![0]).toMatch(/^herdeiros de /);
    const v1 = rl.v;
    emitFact(s, { kind: 'comeback', actors: [a.id], severity: 40, tags: ['good'], text: l('Volta', 'Comeback') });
    expect(rl.v).toBeGreaterThan(v1);
    s.year += 1;
    const inf = bornVia(s, 'infamous', b)!;
    const v2 = inf.v;
    emitFact(s, { kind: 'scandal', actors: [b.id], severity: 30, tags: ['bad'], text: l('Escândalo', 'Scandal') });
    expect(inf.v).toBeGreaterThan(v2);
  });

  it('falsificação vai ao mercado negro igualzinha à original; só a perícia desmascara', () => {
    const s = createGame(defaultConfig('r29rel-f', { startYear: 1985, realNames: false }));
    s.player.cash = 1e9;
    const a = bands(s)[3];
    a.fame = 80;
    const src = bornVia(s, 'named_guitar', a)!;
    const copy = forge29(s, src, Rng.fromSeed('forge'))!;
    expect(copy).toBeTruthy();
    expect(copy.n).toEqual(src.n);
    expect(copy.k).toBe(src.k);
    expect(copy.st).toBe('stolen');
    expect(isFake18(s, copy.id)).toBe(true);
    expect(isFake18(s, src.id)).toBe(false);
    expect(meta29(s, copy.id)!.fake).toBe(true);
    expect(crime17(s).market.some((o) => o.rl === copy.id)).toBe(true); // o mercado negro de sempre (Submundo)
    const r = authenticate18(s, copy.id);
    expect(r.pt).toMatch(/Falsa/);
    expect(copy.st).toBe('lost');
    expect(copy.n.pt).toMatch(/falsificação/);
    const ok = authenticate18(s, src.id);
    expect(ok.pt).toMatch(/Autêntica/);
    expect(rel18(s).m[src.id].auth).toBe(1);
  });

  it('modo exato: ato real intocado só ganha arquétipo genérico; nenhum ato real repete o tipo de uma peça real dele', () => {
    const s = createGame(defaultConfig('r29rel-g', { startYear: 1975, mode: 'historic', realNames: true, history: 'strict' }));
    const pf = realAct17(s, 'Pink Floyd')!;
    expect(pf).toBeTruthy();
    expect(canBorn29(s, 'smashed', pf)).toBe(false);
    expect(canBorn29(s, 'named_guitar', pf)).toBe(false);
    expect(canBorn29(s, 'show_poster', pf, 'poster')).toBe(true);
    R29.force = true;
    try {
      pf.fame = Math.max(pf.fame, 70);
      emitFact(s, { kind: 'show', actors: [pf.id], place: pf.city, severity: 60, tags: ['show', 'chron:legendary_show'], text: l('Show', 'Show') });
      for (const rl of flush29(s)) expect(ARCHDEF29[meta29(s, rl.id)!.arch].generic, rl.n.pt).toBe(1);
    } finally { R29.force = false; }
    // fora do modo exato, com nomes reais: tipo documentado no catálogo real não ganha versão procedural
    const loose = createGame(defaultConfig('r29rel-g', { startYear: 1975, mode: 'historic', realNames: true, history: 'loose' }));
    const pf2 = realAct17(loose, 'Pink Floyd')!;
    expect(realKinds29(loose, pf2).has('guitar')).toBe(true);
    expect(canBorn29(loose, 'named_guitar', pf2, 'guitar')).toBe(false);
    expect(canBorn29(loose, 'tour_van', pf2, 'car')).toBe(true);
    // e no mundo exato andando, peça procedural de ato real intocado é sempre genérica
    for (let i = 0; i < 12; i++) advanceMonth(s);
    for (const rl of relics(s).list) {
      const m = meta29(s, rl.id);
      const act = rl.a ? s.acts[rl.a] : undefined;
      if (m && act?.catalogNo && act.owner !== 'player') expect(ARCHDEF29[m.arch].generic, rl.n.pt).toBe(1);
    }
  }, 300000);

  it('determinismo: mesma semente, mesmas peças', () => {
    const run = () => { const s = createGame(defaultConfig('r29rel-det', { startYear: 1972, realNames: false })); for (let i = 0; i < 30; i++) advanceMonth(s); return s; };
    const a = run(), b = run();
    expect(JSON.stringify(rel29(a))).toBe(JSON.stringify(rel29(b)));
    const r29 = (s: GameState) => relics(s).list.filter((x) => rel29(s).m[x.id]);
    expect(JSON.stringify(r29(a))).toBe(JSON.stringify(r29(b)));
  }, 600000);
});

describe('r29 relíquias — run de bot de 20 anos', () => {
  it('tetos valem (por ano, por ato, total, falsas) e o save cresce pouco', () => {
    const births: { y: number; a: string; arch: string }[] = [];
    onFact('relic', (s, f) => { if (f.tags.includes('r29') && f.tags.includes('born')) births.push({ y: f.y, a: f.actors[0] ?? '', arch: f.tags[3] }); }, 'r29test:bot');
    const { state: s } = simulatePlayer(defaultConfig('r29rel-bot', { startYear: 1970, realNames: true }), 20);
    const byY: Record<number, number> = {}, byAY: Record<string, number> = {};
    for (const b of births) { byY[b.y] = (byY[b.y] ?? 0) + 1; if (b.a) byAY[`${b.a}:${b.y}`] = (byAY[`${b.a}:${b.y}`] ?? 0) + 1; }
    for (const [y, n] of Object.entries(byY)) expect(n, `ano ${y}`).toBeLessThanOrEqual(CAPS29.year);
    for (const [k, n] of Object.entries(byAY)) expect(n, k).toBeLessThanOrEqual(CAPS29.actYear);
    expect(births.length).toBeGreaterThanOrEqual(15); // acontece de verdade
    expect(new Set(births.map((b) => b.arch)).size).toBeGreaterThanOrEqual(6); // e é variado
    const live = relics(s).list.filter((x) => rel29(s).m[x.id] && x.st !== 'lost');
    expect(live.length).toBeLessThanOrEqual(CAPS29.total);
    const byAct: Record<string, number> = {};
    for (const x of live) if (x.a) byAct[x.a] = (byAct[x.a] ?? 0) + 1;
    for (const n of Object.values(byAct)) expect(n).toBeLessThanOrEqual(CAPS29.actLive);
    expect(live.filter((x) => meta29(s, x.id)!.fake).length).toBeLessThanOrEqual(CAPS29.fakes);
    expect(Object.keys(rel29(s).m).every((id) => relics(s).list.some((x) => x.id === id))).toBe(true); // compactado
    const bytes = JSON.stringify(rel29(s)).length + JSON.stringify(relics(s).list.filter((x) => rel29(s).m[x.id])).length;
    console.log(`r29 bot 20 anos: ${births.length} nascidas, ${live.length} vivas, ${bytes} bytes (${Math.round(bytes / 2)} por 10 anos)`, JSON.stringify(rel29(s).n));
    expect(bytes).toBeLessThan(24000);
  }, 1500000);
});
