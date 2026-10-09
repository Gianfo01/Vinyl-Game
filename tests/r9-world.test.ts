// Rodada 9 — mundo vivo: crônica (Lendas), alma das pessoas, sonhos, relíquias, boatos/jornal,
// história prévia e mundo persistente.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { resolveDecision } from '../src/sim/events';
import { advanceMonth } from '../src/sim/tick';
import { remember, rngOf } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { biography, chron, chronQuery, chronState, genealogy } from '../src/sim/sys/chron9';
import { describeSoul, dreamOf, FACETS, formAct, freeMusicians, soul, soulState, trance } from '../src/sim/sys/soul9';
import { addRelic, buyRelic, relics } from '../src/sim/sys/relics9';
import { press, rumorText } from '../src/sim/sys/press9';
import { bookText, exportWorld } from '../src/sim/sys/world9';
import type { GameState } from '../src/sim/types';
import { l } from '../src/data/world';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, extra: Record<string, unknown> = {}) => createGame({ ...defaultConfig(seed, { startYear: 1970 }), ...extra });

describe('rodada 9 — mundo vivo', () => {
  it('crônica: o diário alimenta a crônica e os detectores rodam com o tempo', () => {
    const s = mk('r9-chron');
    const n0 = chronState(s).ev.length;
    const a = Object.values(s.acts).find((x) => x.status === 'active')!;
    remember(s, 'death', l('Morre alguém.', 'Someone dies.'), { actId: a.id, important: true });
    remember(s, 'release', l('rotina do selo', 'label routine'));
    expect(chronState(s).ev.length).toBe(n0 + 1);
    expect(chronQuery(s, { who: a.id }).length).toBeGreaterThan(0);
    for (let i = 0; i < 24; i++) advanceMonth(s);
    const c = chronState(s);
    expect(c.ev.length).toBeGreaterThan(n0 + 5);
    expect(Object.keys(c.mem).length).toBeGreaterThan(5);
    expect(press(s).hl.length).toBeGreaterThan(10);
    const someone = Object.keys(c.mem)[0];
    expect(Array.isArray(biography(s, someone))).toBe(true);
    expect(genealogy(s, c.mem[someone][0].split(':')[0]).length).toBeGreaterThan(0);
    expect(JSON.stringify(s.x4).length).toBeLessThan(5_000_000);
    invariant(s);
  });

  it('personalidade determinística, com extremos raros, e frases', () => {
    const s = mk('r9-soul');
    const ps = Object.values(s.persons).slice(0, 300);
    const p = ps[0];
    const a = soul(s, p);
    expect(Object.keys(a.f)).toHaveLength(FACETS.length);
    const s2 = mk('r9-soul');
    expect(soul(s2, s2.persons[p.id]).f).toEqual(a.f);
    const vals = ps.flatMap((x) => Object.values(soul(s, x).f));
    const mid = vals.filter((v) => v >= 30 && v <= 70).length / vals.length;
    const ext = vals.filter((v) => v <= 10 || v >= 90).length / vals.length;
    expect(mid).toBeGreaterThan(0.6);
    expect(ext).toBeLessThan(0.1);
    expect(describeSoul(s, p).length).toBeGreaterThan(0);
    expect(dreamOf(s, p)).toBeTruthy();
    expect(Object.keys(s.x4.soul9.p).length).toBeLessThan(40); // só notáveis com memórias
  });

  it('surto criativo de NPC atendido vira obra-prima e relíquia; do jogador vira decisão', () => {
    const s = mk('r9-trance');
    const r = rngOf(s);
    const a = Object.values(s.acts).find((x) => x.status === 'active' && x.owner !== 'player' && x.members.length)!;
    const p = s.persons[a.members[0]];
    trance(s, r, a, p, true);
    expect(chronState(s).ev.some((e) => e.k === 'masterpiece')).toBe(true);
    expect(relics(s).list.some((x) => x.k === 'lyrics')).toBe(true);
    expect(soulState(s).p[p.id].m.length).toBeGreaterThan(0);
    const mine = Object.values(s.acts).find((x) => x.owner === 'player' && x.members.length);
    if (mine) {
      trance(s, r, mine, s.persons[mine.members[0]]);
      const d = s.decisions.find((x) => x.eventId === 'trance9')!;
      expect(d).toBeTruthy();
      resolveDecision(s, d.id, 'fund');
      invariant(s);
    }
  });

  it('relíquias: leilão e compra pelo jogador', () => {
    const s = mk('r9-relic');
    const a = Object.values(s.acts)[0];
    const rl = addRelic(s, 'guitar', l('Guitarra teste', 'Test guitar'), a.id, a.members[0], 1000);
    expect(buyRelic(s, rl.id)).not.toBeNull();
    rl.st = 'auction';
    s.player.cash += 0;
    expect(buyRelic(s, rl.id)).toBeNull();
    expect(rl.st).toBe('player');
    expect(rl.own.length).toBe(2);
    invariant(s);
  });

  it('boatos se espalham e distorcem', () => {
    const s = mk('r9-rumor');
    const a = Object.values(s.acts).find((x) => x.status === 'active')!;
    chron(s, { k: 'scandal', i: 5, a: [a.id], t: l('Escândalo enorme.', 'Huge scandal.') });
    for (let i = 0; i < 12; i++) advanceMonth(s);
    const ru = press(s).rum.find((x) => x.t.pt === 'Escândalo enorme.')!;
    expect(ru.cs.length).toBeGreaterThan(1);
    expect(rumorText(ru).pt.length).toBeGreaterThan(5);
  });

  it('músicos livres formam bandas novas com pessoas reais', () => {
    const s = mk('r9-band');
    const r = rngOf(s);
    const ids = Object.values(s.acts).filter((x) => x.members.length).slice(0, 2).map((x) => x.members[0]);
    const n = Object.keys(s.persons).length;
    const a = formAct(s, r, ids, 'rnr', 'london');
    expect(a.members).toEqual(ids);
    expect(Object.keys(s.persons).length).toBe(n);
    expect(Array.isArray(freeMusicians(s))).toBe(true);
  });

  it('história prévia de 20 anos é rápida e o mundo começa com passado', () => {
    const t0 = Date.now();
    const s = mk('r9-pre', { prehist: 20 });
    const ms = Date.now() - t0;
    expect(ms).toBeLessThan(3000);
    const before = chronState(s).ev.filter((e) => e.y < 1970);
    expect(before.length).toBeGreaterThan(15);
    expect(Object.values(s.acts).some((a) => a.formed < 1960)).toBe(true);
  });

  it('mundo persistente: exporta, importa N anos depois e escreve o livro', () => {
    const s = mk('r9-persist');
    for (let i = 0; i < 24; i++) advanceMonth(s);
    const pa = Object.values(s.acts).find((a) => a.owner === 'player');
    if (pa) { pa.hits = 3; pa.number1s = 1; pa.releases.push('x'); }
    const w = JSON.parse(JSON.stringify(exportWorld(s)));
    expect(w.acts.length).toBeGreaterThan(0);
    const s2 = createGame({ ...defaultConfig('r9-next', { startYear: s.year + 10 }), world9: w });
    expect(s2.config.world9).toBeUndefined();
    const c2 = chronState(s2);
    expect(c2.ev.some((e) => e.k === 'new_world')).toBe(true);
    if (pa) expect(c2.ev.some((e) => e.k === 'legend' || e.k === 'forgotten')).toBe(true);
    const book = bookText(s, 'pt');
    expect(book).toContain('CRÔNICA DO MUNDO');
    expect(book).toContain('PARTE III');
  });
});
