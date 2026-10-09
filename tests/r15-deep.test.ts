// Rodada 15 — aprofundamentos: sync por briefing, fandom que pede, disputas de contrato, júri dos prêmios.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { resolveDecision } from '../src/sim/events';
import { applyMods } from '../src/sim/ext4';
import { fandomOf } from '../src/sim/fandom';
import type { GameState } from '../src/sim/types';
import { candidates, fitOf, mediaNow, pitch15, sy15, type Brief15 } from '../src/sim/sys/sync15';
import { fanMonth15, fn15 } from '../src/sim/sys/fan15';
import { courtOdds, disputeMonth15 } from '../src/sim/sys/dispute15';
import { flushTop10, homeOf, homeK, queueTop10 } from '../src/sim/sys/awards15';
import { l } from '../src/data/world';

/** Um ato do mundo com faixas lançadas passa a ser do jogador (com contrato do jogador). */
function adopt(s: GameState) {
  const a = Object.values(s.acts).find((x) => x.status !== 'retired' && x.status !== 'split' && x.members.length && !x.owner)!;
  a.owner = 'player';
  a.playerBand = true;
  const tpl = Object.values(s.releases)[0];
  const base = Object.values(s.songs)[0];
  for (let i = 0; i < 3; i++) {
    const rid = `rT${i}`, sid = `sT${i}`;
    s.releases[rid] = { ...tpl, id: rid, actId: a.id, owner: 'player', songs: [sid], year: s.year - 2, title: `T${i}` };
    s.songs[sid] = { ...base, id: sid, actId: a.id, releaseId: rid, recorded: true, vault: false, q: 60 + i * 10, title: `Song${i}`, coverOf: undefined };
    a.songs.push(sid);
    a.releases.push(rid);
  }
  return a;
}
const brief = (s: GameState, o: Partial<Brief15> = {}): Brief15 => {
  const b: Brief15 = { id: 'sbT', medium: 'film', client: 'Estúdios Aurora', mood: 'joy', old: true, budget: 9000, until: s.week + 6, rival: '', rv: 0.01, status: 'open', week: s.week, ...o };
  sy15(s).briefs.push(b);
  return b;
};

describe('r15 aprofundamentos', () => {
  it('sync: meios por época, encaixe explicado, nostalgia, desgaste, receita e retorno às paradas', () => {
    const s = createGame(defaultConfig('r15-deep-a', { startYear: 1975 }));
    expect(mediaNow(s)).toContain('film');
    expect(mediaNow(s)).not.toContain('game');
    expect(mediaNow(s)).not.toContain('series');
    const a = adopt(s);
    const b = brief(s);
    const cs = candidates(s, b);
    expect(cs.length).toBeGreaterThan(0);
    const top = cs[0];
    expect(top.fit.why.length).toBeGreaterThan(2);
    // nostalgia: a mesma faixa encaixa melhor quando é velha
    const so = top.song;
    const rel = s.releases[so.releaseId!];
    const y0 = rel.year;
    rel.year = s.year - 20;
    const old = fitOf(s, b, so).v;
    rel.year = s.year;
    const fresh = fitOf(s, b, so).v;
    expect(old).toBeGreaterThan(fresh);
    rel.year = y0;
    const cash = s.player.cash;
    const res = pitch15(s, b.id, so.id);
    expect(res.ok).toBe(true);
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(sy15(s).used[so.id]).toEqual([s.year]);
    // desgaste: licenciada de novo, encaixa pior
    const b2 = brief(s, { id: 'sbT2' });
    expect(fitOf(s, b2, so).v).toBeLessThan(fitOf(s, { ...b2 }, so).v + 0.0001);
    expect(fitOf(s, b2, so).why.some(([w]) => w.en.startsWith('Overexposed'))).toBe(true);
    void a;
    // rival forte vence e explica
    const b3 = brief(s, { id: 'sbT3', rv: 0.99, rival: Object.keys(s.labels)[0] });
    const lost = pitch15(s, b3.id, cs[cs.length - 1].song.id);
    expect(lost.ok).toBe(false);
    expect(lost.text.en).toMatch(/fit/);
  });

  it('fandom: petição vira decisão, teto de ingresso reduz bilheteria e é explicado', () => {
    const s = createGame(defaultConfig('r15-deep-b', { startYear: 1980 }));
    const a = adopt(s);
    fandomOf(s, a.id).superfans = 2000;
    const so = s.songs[a.songs[0]];
    const extra = { ...so, id: 'sVault', releaseId: undefined, recorded: true, vault: true, title: 'Cofre' };
    s.songs[extra.id] = extra;
    a.songs.push(extra.id);
    for (let i = 0; i < 60 && !s.decisions.some((d) => d.eventId.startsWith('fan15_')); i++) { s.month = i % 12; s.year = 1980 + Math.floor(i / 12); fanMonth15(s); }
    const d = s.decisions.find((x) => x.eventId.startsWith('fan15_'));
    expect(d).toBeTruthy();
    const m0 = applyMods(s, 'showRevenue', 1000, { act: a }).value;
    fn15(s).cap[a.id] = s.week + 26;
    const m = applyMods(s, 'showRevenue', 1000, { act: a });
    expect(m.value).toBeLessThan(m0);
    expect(m.factors.some((f) => f.label.en.includes('Ticket cap'))).toBe(true);
    resolveDecision(s, d!.id, d!.options[0].id);
    expect(s.decisions.some((x) => x.id === d!.id)).toBe(false);
  });

  it('disputas: confiança baixa gera caso; acordo custa e devolve confiança; jurídico melhora chances', () => {
    const s = createGame(defaultConfig('r15-deep-c', { startYear: 1970 }));
    const a = adopt(s);
    a.playerBand = false;
    const c = Object.values(s.contracts)[0] ?? ({} as never);
    s.contracts[c.id ?? 'cT'] = { ...(c as object), id: c.id ?? 'cT', party: 'player', royalty: 0.1, endWeek: s.week + 500 } as never;
    a.contractId = c.id ?? 'cT';
    a.trust = 5;
    const o0 = courtOdds(s);
    s.player.staff.push({ id: 'stL', name: 'Lawyer', role: 'legal', skill: 90, salary: 1, hiredWeek: 0 });
    expect(courtOdds(s)).toBeGreaterThan(o0);
    for (let i = 0; i < 80 && !s.decisions.some((d) => d.eventId.startsWith('dsp15_')); i++) { s.month = i % 12; s.year = 1970 + Math.floor(i / 12); disputeMonth15(s); }
    const d = s.decisions.find((x) => x.eventId.startsWith('dsp15_'));
    expect(d).toBeTruthy();
    expect(d!.text.en.length).toBeGreaterThan(40);
    const opt = d!.eventId === 'dsp15_audit' ? 'settle' : d!.eventId === 'dsp15_strike' ? 'raise' : 'meet';
    const t0 = a.trust;
    resolveDecision(s, d!.id, opt);
    expect(a.trust).toBeGreaterThan(t0);
  });

  it('prêmios: júri favorece artista da casa; avisos de top 10 agrupados', () => {
    const s = createGame(defaultConfig('r15-deep-d', { startYear: 1990 }));
    const a = Object.values(s.acts).find((x) => homeOf(s, x.id));
    expect(a).toBeTruthy();
    const home = homeOf(s, a!.id)!;
    expect(homeK(s, a!.id, home)).toBeGreaterThan(homeK(s, a!.id, home === 'USA' ? 'GBR' : 'USA'));
    const n0 = s.notifications.length;
    for (const c of ['Brazil', 'Chile', 'Japan', 'Kenya']) queueTop10('Hit', l(c, c), 4);
    queueTop10('Hit', l('Peru', 'Peru'), 1);
    flushTop10(s);
    expect(s.notifications.length - n0).toBe(2);
    expect(s.notifications.some((n) => n.text.en.includes('4 countries'))).toBe(true);
  });
});
