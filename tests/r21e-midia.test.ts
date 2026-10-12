// Rodada 21e (mercado e mídia): (1) a rotação de rádio é disputada por NPCs e o jogador perde a vaga quando é pior;
// (2) as vagas de playlist conservam o bolo do território; (3) o viral sem campanha só existe a partir de 2016 e é
// determinístico pela semente.
import { describe, expect, it } from 'vitest';
import { Rng, seedState } from '../src/core/rng';
import { cityById, type MarketId } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { applyMods } from '../src/sim/ext4';
import { launchPending } from '../src/sim/market';
import { composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { releasesTouched17 } from '../src/sim/relidx17';
import '../src/sim/sys';
import { airPos21, media21, plAsk21, plAskLeft21, plFactor21, viralChance21, weekMedia21 } from '../src/sim/sys/media21';
import type { GameState, Release } from '../src/sim/types';
import { hasTech, rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

function withSingle(seed: string, startYear: number) {
  const s = createGame(defaultConfig(seed, { startYear }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 5_000_000_00;
  s.player.initialCash += 5_000_000_00;
  const songs = composeSongs(s, r, act, 3);
  recordSongs(s, r, act, songs.map((x) => x.id), 2, 'balanced');
  const res = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'Single', formats: ['lp'], press: 500, marketing: [], territories: [...s.player.territories], weeksAhead: 1 });
  if (!('id' in res)) throw new Error('schedule');
  const rel = launchPending(s, r, res);
  const mk = cityById[s.config.homeCity].market as MarketId;
  return { s, r, act, rel, mk };
}

/** clona o lançamento do jogador como disco de um ato de NPC assinado por um selo rival */
function npcClone(s: GameState, r: Rng, rel: Release, id: string, appeal: number, units = 1000): Release {
  const lb = Object.values(s.labels).find((x) => x.active)!;
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 60 });
  act.owner = lb.id;
  const c: Release = { ...rel, id, actId: act.id, owner: lb.id, appeal, weekly: [units], live: true };
  s.releases[id] = c;
  act.releases.push(id);
  releasesTouched17(s);
  return c;
}

describe('r21e mídia (1) — rotação disputada por NPCs', () => {
  it('um NPC melhor ocupa a rotação e o jogador fica fora quando é pior', () => {
    const { s, r, rel, mk } = withSingle('r21e-air', 1978);
    expect(hasTech(s, 'radio')).toBe(true);
    const big = npcClone(s, r, rel, 'npc-big', 60);
    for (let i = 0; i < 12; i++) npcClone(s, r, rel, `npc-${i}`, 20 + i);
    weekMedia21(s, new Rng(seedState('t1')));
    const st = media21(s);
    const rows = st.air[mk] ?? [];
    const slots = st.slots[mk]!;
    expect(rows.length).toBeGreaterThan(slots);
    expect(rows.slice(0, slots).every((x) => x.in)).toBe(true);
    expect(rows.slice(slots).every((x) => !x.in)).toBe(true);
    const pb = airPos21(s, big.id, mk), pm = airPos21(s, rel.id, mk);
    expect(pb.in).toBe(true);
    expect(pm.in).toBe(false); // ato novo sem fama: NPCs e rivais à frente, perdeu a vaga (pos 0 = além das 40 guardadas)
    expect(pm.pos === 0 || pm.pos > Math.max(slots, pb.pos)).toBe(true);
    if (pm.pos && pm.pos <= slots + 5) expect(st.n.lost).toBeGreaterThan(0); // só conta como "vaga perdida" quem ficou perto
    // o NPC na parada ganha unidades pelo mod; o jogador fora não ganha nada da parada
    const un = applyMods(s, 'chartUnits', 10_000, { release: big });
    expect(un.factors.some((f) => f.label.pt.includes('airplay'))).toBe(true);
    const um = applyMods(s, 'chartUnits', 10_000, { release: rel });
    expect(um.factors.some((f) => f.label.pt.includes('airplay'))).toBe(false);
  });
  it('quando é melhor que o campo, o jogador entra na parada', () => {
    const { s, act, rel, mk } = withSingle('r21e-air2', 1978);
    act.fame = 95; rel.appeal = 40; // astro com disco forte
    weekMedia21(s, new Rng(seedState('t2')));
    expect(airPos21(s, rel.id, mk).in).toBe(true);
  });
});

describe('r21e mídia (2) — vagas de playlist conservam o bolo', () => {
  it('o que as vagas ganham sai dos demais do território', () => {
    const { s, r, rel, mk } = withSingle('r21e-pl', 2014);
    expect(hasTech(s, 'streaming')).toBe(true);
    rel.weekly = [1000];
    const mine: Release[] = [rel];
    for (let i = 0; i < 24; i++) mine.push(npcClone(s, r, rel, `pl-${i}`, 1 + i, 1000));
    weekMedia21(s, new Rng(seedState('t3')));
    const st = media21(s);
    expect((st.pl[mk] ?? []).length).toBe(6);
    // soma ponderada sobre TODOS os lançamentos vivos do território (≤ 52 semanas) antes × depois do fator
    let before = 0, after = 0;
    for (const x of Object.values(s.releases)) {
      if (!x.live || x.hist || !x.territories.includes(mk) || s.week - x.week > 52 || !s.acts[x.actId]) continue;
      const u = x.weekly[x.weekly.length - 1] ?? 0;
      const row = st.pl[mk]!.find((q) => q.rel === x.id);
      const k = row ? row.k : (st.dil[mk] ?? 1);
      before += u; after += u * k;
    }
    expect(before).toBeGreaterThan(0);
    expect(Math.abs(after - before) / before).toBeLessThan(0.01);
    expect(st.dil[mk]!).toBeLessThan(1);
    // o mod de unidades usa os mesmos fatores
    const top = s.releases[st.pl[mk]![0].rel];
    expect(plFactor21(s, top).slot).toBe(true);
    expect(applyMods(s, 'chartUnits', 10_000, { release: top }).factors.some((f) => f.label.pt.includes('playlist'))).toBe(true);
  });
  it('o pitch do jogador custa tempo da equipe, não caixa', () => {
    const { s, rel } = withSingle('r21e-pl2', 2014);
    const cash = s.player.cash;
    const left = plAskLeft21(s);
    expect(plAsk21(s, rel.id).pt).toContain('apresentou');
    expect(plAskLeft21(s)).toBe(left - 1);
    expect(s.player.cash).toBe(cash);
    expect(plAsk21(s, rel.id).pt).toContain('já apresentou');
  });
});

describe('r21e mídia (3) — viral 2016+ determinístico', () => {
  const always = { chance: () => true, normal: () => 0, next: () => 0.5 } as unknown as Rng;
  it('antes de 2016 não existe viral; depois, qualquer faixa nova pode viralizar', () => {
    const A = withSingle('r21e-v', 2012);
    expect(viralChance21(A.s, A.rel)).toBe(0);
    weekMedia21(A.s, always);
    expect(Object.keys(media21(A.s).viral).length).toBe(0);
    const B = withSingle('r21e-v', 2018);
    for (const x of Object.values(B.s.releases)) if (x.id !== B.rel.id) x.week = B.s.week - 20; // só a faixa nova do jogador é candidata
    expect(viralChance21(B.s, B.rel)).toBeGreaterThan(0);
    const gp0 = B.s.genrePop[B.act.genre] ?? 0.6;
    weekMedia21(B.s, always);
    const v = media21(B.s).viral[B.rel.id];
    expect(v).toBeTruthy();
    expect(v.mine).toBe(true);
    expect(B.s.genrePop[B.act.genre]).toBeGreaterThan(gp0);
    const um = applyMods(B.s, 'chartUnits', 10_000, { release: B.rel });
    expect(um.factors.some((f) => f.label.pt.includes('Viral'))).toBe(true);
    expect(um.value).toBeGreaterThan(15_000);
  });
  it('a mesma semente dá o mesmo resultado semana a semana', () => {
    const run = () => { const { s } = withSingle('r21e-det', 2018); for (let i = 0; i < 6; i++) { s.week++; weekMedia21(s); } const st = media21(s); return JSON.stringify({ v: Object.keys(st.viral), n: st.n, air: Object.fromEntries(Object.entries(st.air).map(([k, v]) => [k, v.slice(0, 5).map((x) => x.rel)])) }); };
    expect(run()).toBe(run());
  });
});
