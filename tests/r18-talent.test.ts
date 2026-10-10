// Rodada 18 (talent18) — relíquias criadas no jogo e por modo de história, canais de descoberta, camps/pitching,
// banda da casa, escolas e TV de talentos.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { perkEntries } from '../src/sim/perks';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { chron } from '../src/sim/sys/chron9';
import { camps18, holdCamp18, pitchSong18 } from '../src/sim/sys/camps18';
import { dig18, disc18 } from '../src/sim/sys/discover18';
import { rel18 } from '../src/sim/sys/relics18';
import { relics } from '../src/sim/sys/relics9';
import { foundSchool18, school18 } from '../src/sim/sys/school18';
import { foundHB18, hbBonus18 } from '../src/sim/sys/session18';
import { becomePartner18, tv18 } from '../src/sim/sys/tv18';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';

const realIds = (s: GameState) => relics(s).list.map((x) => x.rr ?? rel18(s).m[x.id]?.alt).filter(Boolean) as string[];

describe('r18 talent18', () => {
  it('relíquias reais: exato segue a história; outros modos só o que é anterior ao início; fictício não tem nenhuma', () => {
    const strict = createGame(defaultConfig('r18-tal1', { startYear: 1990, mode: 'historic', realNames: true, history: 'strict' }));
    const loose = createGame(defaultConfig('r18-tal1', { startYear: 1990, mode: 'historic', realNames: true, history: 'loose' }));
    const fic = createGame(defaultConfig('r18-tal1', { startYear: 1990, realNames: false }));
    for (let i = 0; i < 20; i++) { advanceMonth(strict); advanceMonth(loose); advanceMonth(fic); }
    expect(realIds(strict)).toContain('thriller_jacket');
    expect(realIds(strict)).toContain('teen_spirit_mustang'); // ago/1991, depois do início: nasce no exato
    expect(relics(strict).list.some((x) => x.rr === 'teen_spirit_mustang')).toBe(true);
    expect(realIds(loose)).toContain('thriller_jacket');
    expect(realIds(loose)).not.toContain('teen_spirit_mustang');
    expect(relics(loose).list.filter((x) => x.rr).every((x) => rel18(loose).m[x.id]?.alt)).toBe(true); // história alternativa
    expect(realIds(fic)).toEqual([]);
  }, 240000);

  it('relíquia nasce de um fato (show lendário) e o valor acompanha o legado', () => {
    const s = createGame(defaultConfig('r18-tal2', { startYear: 1975, realNames: false }));
    const a = Object.values(s.acts).sort((x, y) => y.fame - x.fame)[0];
    a.fame = Math.max(a.fame, 50);
    chron(s, { k: 'legendary_show', i: 4, a: [a.id], t: l('Show histórico', 'Historic show') });
    const rl = relics(s).list.find((x) => rel18(s).m[x.id]?.o === 'show');
    expect(rl).toBeTruthy();
    const v0 = rl!.v;
    a.legend = true; a.fame = 95; a.number1s = 8;
    for (let i = 0; i < 12; i++) advanceMonth(s);
    if (rl!.st !== 'lost') expect(rl!.v).toBeGreaterThan(v0);
  }, 120000);

  it('descoberta, camp e pitching, banda da casa, escola', () => {
    const s = createGame(defaultConfig('r18-tal3', { startYear: 1995 }));
    s.player.cash += 5e8;
    const r = dig18(s, 'openmic');
    expect(r.ok).toBe(true);
    expect(r.found.length).toBeGreaterThan(0);
    expect(s.knowledge[r.found[0]].degree).toBeGreaterThanOrEqual(2);
    expect(dig18(s, 'openmic').ok).toBe(false); // uma vez por mês
    expect(dig18(s, 'tiktok').ok).toBe(false); // fora da época
    const host = playerActs(s)[0] ?? (() => { const a = Object.values(s.acts).find((x) => !x.owner)!; a.owner = 'player'; return a.id; })();
    expect(holdCamp18(s, host, 2, 2)).toBeNull();
    expect(foundHB18(s, 'pop', false)).toBeNull();
    expect(foundSchool18(s)).toBeNull();
    for (let i = 0; i < 13; i++) advanceMonth(s);
    const c = camps18(s).camps[0];
    expect(c.songs?.length).toBe(6);
    expect(hbBonus18(s, host)).toBeGreaterThan(0);
    expect(perkEntries(s).some((e) => /banda da casa|house band/i.test(e.label.pt + e.label.en))).toBe(true);
    expect(disc18(s).leads.some((x) => x.ch === 'school')).toBe(true);
    expect(school18(s).own?.students).toBeGreaterThan(0);
    // pitch manual
    const star = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player' && a.status === 'active')!;
    camps18(s).pitches.push({ id: 'ptx', a: star.id, g: star.genre, minQ: 10, until: s.week + 8, fee: 100000, cut: 0.3 });
    const song = c.songs!.find((id) => s.songs[id] && !s.songs[id].releaseId)!;
    const out = pitchSong18(s, 'ptx', song, true);
    expect(out.pt.length).toBeGreaterThan(5);
  }, 240000);

  it('TV de talentos: temporada anual, parceiro leva o vencedor', () => {
    const s = createGame(defaultConfig('r18-tal4', { startYear: 2005 }));
    s.player.cash += 5e8;
    while (s.month < 2) advanceMonth(s);
    expect(tv18(s).cur?.y).toBe(2005);
    expect(becomePartner18(s)).toBeNull();
    while (s.month !== 7) advanceMonth(s);
    const se = tv18(s).past.at(-1)!;
    expect(se.top?.length).toBe(3);
    const w = s.acts[se.top![0]];
    expect(w.owner).toBe('player');
    expect(w.fame).toBeGreaterThan(25);
  }, 240000);
});
