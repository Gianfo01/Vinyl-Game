// Rodada 9 (E) — identidades ampliadas: 18 perfis de selo com efeitos reais (também nos rivais),
// 13 manuais de rival, 9 eixos de som, assinaturas de timbre (e cópias), 40 momentos de vida combináveis
// e subgêneros procedurais do modo livre.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { bumpPerks, perk } from '../src/sim/perks';
import { GENRES, cityById } from '../src/data/world';
import { PROFILES, PROFILE_ACTIONS, actionBlock, ident, identityMonth, pressReaction, profileOfferEffect, runProfileAction, type ProfileId } from '../src/sim/sys/identity';
import { XPROFILES } from '../src/sim/sys/identity/extra';
import { PLAYBOOKS, playbookOf, rivalProfile, rivals8 } from '../src/sim/sys/rivals8';
import {
  AXES, MOMENTS, actTrademarks, clearSoundCache, composerPull, fit9, labelSignature, lifeMoments, snd, soundOf, soundPhrases, subs, timbresOf,
} from '../src/sim/sys/sound';
import { NEW_MOMENTS, markMoment } from '../src/sim/sys/sound/moments';
import { subMonth, subRules } from '../src/sim/sys/sound/subgenre';
import { TIMBRES } from '../src/sim/sys/sound/timbre';
import { composeSongs } from '../src/sim/production';
import type { Act, GameState, Release, Song } from '../src/sim/types';
import { money, post, rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';

const mk = (seed: string, year = 1990) => createGame(defaultConfig(seed, { startYear: year }));
const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

function withAct(seed: string, year = 1990) {
  const s = mk(seed, year);
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 30 });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  return { s, r, act };
}

let relN = 0;
function fakeRel(s: GameState, actId: string, songs: string[] = [], over: Partial<Release> = {}): Release {
  const id = `x9r${relN++}`;
  const rel = {
    id, actId, owner: s.acts[actId].owner === 'player' ? 'player' : (s.acts[actId].owner ?? 'indie'), type: 'single', title: id, songs, week: s.week, year: s.year, q: 60, appeal: 1,
    peak: 999, weekly: [], territories: [cityById[s.config.homeCity].market], marketing: [], formats: [], marketingE: 0.2, totalUnits: 0, revenue: 0, ...over,
  } as unknown as Release;
  s.releases[id] = rel;
  s.acts[actId].releases.push(id);
  return rel;
}

function song(s: GameState, actId: string, id: string, v: number[], timbres?: string[]): Song {
  const so = {
    id, actId, title: id, genre: s.acts[actId].genre, writers: [], melody: 60, lyrics: 60, performance: 60, production: 60, originality: 50, q: 60, recorded: true,
    createdWeek: s.week, sound: { v, r: 1, t: timbres },
  } as unknown as Song;
  s.songs[id] = so;
  return so;
}

function forceProfile(s: GameState, p: ProfileId | null): void {
  const st = ident(s);
  st.cur = p;
  if (p) st.acc[p] = 40;
  bumpPerks();
}

describe('18 perfis de selo', () => {
  it('existem 18 perfis, cada um com oportunidades, custos, reações e ao menos um efeito mecânico real', () => {
    expect(PROFILES.length).toBe(18);
    for (const x of XPROFILES) {
      expect(x.def.opps.length, x.def.id).toBeGreaterThan(0);
      expect(x.def.costs.length, x.def.id).toBeGreaterThan(0);
      expect(x.def.reactions.length, x.def.id).toBeGreaterThan(0);
      expect(!!(x.appeal || x.units || x.show || x.press || x.pressing || x.perks || x.month || x.offer), x.def.id).toBe(true);
      expect(x.action, x.def.id).toBeTruthy();
    }
  });

  it('as ações exclusivas só abrem para o perfil e rodam pelo extrato; saves antigos (sem os acumuladores novos) continuam funcionando', () => {
    const s = mk('r9-act');
    const act = Object.values(s.acts).find((a) => !a.owner && !a.playerBand && (a.status === 'active' || a.status === 'emerging'))!;
    act.owner = 'player';
    post(s, 'test:cash', money(s, 900000), 'test', 'cash');
    const r = rngOf(s);
    for (const x of XPROFILES) {
      forceProfile(s, null);
      expect(actionBlock(s, x.action!.id)?.pt.startsWith('Só para'), x.def.id).toBe(true);
      forceProfile(s, x.def.id);
      const b = actionBlock(s, x.action!.id);
      expect(b?.pt.startsWith('Só para') ?? false, x.def.id).toBe(false);
    }
    expect(PROFILE_ACTIONS.length).toBeGreaterThanOrEqual(18);
    // save antigo: acumuladores novos ausentes
    const st = ident(s);
    for (const x of XPROFILES) delete (st.acc as Record<string, number | undefined>)[x.def.id];
    forceProfile(s, null);
    identityMonth(s, r);
    for (const x of XPROFILES) expect(Number.isFinite(st.acc[x.def.id])).toBe(true);
    // uma ação de verdade (sync não precisa de nada além do elenco): rende ou perde o custo, sempre pelo extrato
    forceProfile(s, 'sync');
    st.cool = {};
    s.acts[act.id].members = s.acts[act.id].members.filter((id) => s.persons[id]);
    expect(runProfileAction(s, r, 'sync_pitch')).toBeNull();
    invariant(s);
  });

  it('efeitos: audiófilo premia a qualidade e pune o descuido; fábrica de ídolos cansa o elenco; gospel favorece o sacro; predatório rende e custa confiança', () => {
    const s = mk('r9-fx');
    const act = Object.values(s.acts).find((a) => !a.owner && !a.playerBand && (a.status === 'active' || a.status === 'emerging') && a.members.length > 0)!;
    act.owner = 'player';
    const hi = fakeRel(s, act.id, [], { q: 82 });
    const lo = fakeRel(s, act.id, [], { q: 45 });
    const ap = (rel: Release) => applyMods(s, 'appeal', 100, { release: rel, act }).value;
    forceProfile(s, null);
    const [bh, bl] = [ap(hi), ap(lo)];
    forceProfile(s, 'hifi');
    expect(ap(hi) / bh).toBeGreaterThan(1.04);
    expect(ap(lo) / bl).toBeLessThan(0.96);
    expect(pressReaction(s, hi)).toBeGreaterThan(pressReaction(s, lo));
    // oferta: arte gosta, fama não
    const setAmb = (amb: string) => { for (const id of act.members) (s.persons[id] as { ambition: string }).ambition = amb; };
    setAmb('art');
    expect(profileOfferEffect(s, act)?.score ?? 0).toBeGreaterThan(0);
    setAmb('fame');
    expect(profileOfferEffect(s, act)?.score ?? 0).toBeLessThan(0);
    // predatório: caixa extra mensal, confiança em queda
    forceProfile(s, 'predator');
    act.trust = 70;
    const cash0 = s.player.cash;
    const r = rngOf(s);
    identityMonth(s, r);
    expect(s.player.cash).toBeGreaterThan(cash0);
    expect(act.trust).toBeLessThan(70);
    expect(perk(s, 'advance')).toBeLessThan(0);
    // ídolos: estresse dos membros sobe todo mês
    forceProfile(s, 'idol');
    const m = s.persons[act.members[0]];
    const st0 = m.stress;
    identityMonth(s, r);
    expect(m.stress).toBeGreaterThan(st0);
    // gospel: o ato sacro rende mais que o secular
    const rel = fakeRel(s, act.id, [], { q: 60 });
    const sacredG = GENRES.find((g) => g.family === 'sacred')!.id;
    const secularG = GENRES.find((g) => g.family === 'rock')!.id;
    const ratioFor = (genre: string) => { act.genre = genre; forceProfile(s, null); const b0 = ap(rel); forceProfile(s, 'gospel'); return ap(rel) / b0; };
    expect(ratioFor(sacredG)).toBeGreaterThan(1.08);
    expect(ratioFor(secularG)).toBeLessThan(0.97);
    invariant(s);
  });
});

describe('13 manuais de rival', () => {
  it('há 13 manuais com líder e perfil; os selos recebem manuais variados e perfis válidos, e os novos lances aparecem no relatório', () => {
    expect(Object.keys(PLAYBOOKS).length).toBe(13);
    for (const pb of Object.values(PLAYBOOKS)) { expect(pb.leader.pt.length).toBeGreaterThan(3); expect(pb.profiles.length).toBeGreaterThan(0); }
    const s = mk('r9-rivals', 1995);
    const labels = Object.values(s.labels).filter((x) => x.active);
    const kinds = new Set(labels.map((x) => playbookOf(x)));
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    for (const lb of labels) expect(PROFILES.some((p) => p.id === rivalProfile(lb))).toBe(true);
    // roda alguns anos com caixa farto: movimentos novos aparecem
    for (const lb of labels) lb.cash = money(s, 5e7);
    const seen = new Set<string>();
    for (let i = 0; i < 260; i++) {
      s.week += 4;
      runSimHooks('month', s, rngOf(s));
      for (const lb of labels) lb.cash = Math.max(lb.cash, money(s, 5e7));
    }
    for (const list of Object.values(rivals8(s).log)) for (const m of list) seen.add(m.k);
    const fresh = ['idol_debut', 'gospel_circuit', 'prestige_award', 'sync_deal', 'regional_tour', 'asset_strip', 'visionary_bet', 'purist_refuse'];
    expect(fresh.filter((k) => seen.has(k)).length).toBeGreaterThanOrEqual(2);
  });
});

describe('9 eixos de som', () => {
  it('as faixas têm 9 eixos; vetores de saves antigos (6 eixos) são completados com o neutro', () => {
    const { s, r, act } = withAct('r9-axes');
    expect(AXES).toHaveLength(9);
    const [so] = composeSongs(s, r, act, 1);
    expect(so.sound!.v).toHaveLength(9);
    expect(so.sound!.v.every((x) => x >= 0 && x <= 100)).toBe(true);
    expect(fit9([10, 20, 30, 40, 50, 60])).toEqual([10, 20, 30, 40, 50, 60, 50, 50, 50]);
    const old = song(s, act.id, 'old1', [50, 50, 50, 50, 50, 50]);
    expect(soundOf(s, old)).toHaveLength(9);
    snd(s).label.v = [40, 40, 40, 40, 40, 40];
    expect(labelSignature(s).v).toHaveLength(9);
  });

  it('melancolia, local/global e ruptura entram nas frases da faixa', () => {
    const { s } = withAct('r9-phr');
    const txt = (v: number[]) => soundPhrases(s, v, {}).map((x) => x.pt).join(' | ');
    expect(txt([50, 50, 30, 60, 50, 40, 10, 50, 50])).toMatch(/melancolia/);
    expect(txt([50, 50, 30, 60, 50, 40, 90, 90, 90])).toMatch(/euforia/);
    expect(txt([50, 50, 30, 60, 50, 40, 50, 90, 50])).toMatch(/ninguém/);
    expect(txt([50, 50, 30, 60, 50, 40, 50, 50, 10])).toMatch(/tradição/);
    expect(soundPhrases(s, [50, 50, 30, 60, 50, 40, 10, 50, 90], {}).every((x) => x.pt && x.en)).toBe(true);
  });
});

describe('40 momentos de vida', () => {
  it('há 40 momentos bilíngues; os novos são marcados por outros sistemas, puxam eixos e se combinam (até 2) nas frases', () => {
    expect(Object.keys(MOMENTS).length).toBe(40);
    for (const m of Object.values(MOMENTS)) { expect(m.name.pt && m.name.en && m.phrase.pt && m.phrase.en).toBeTruthy(); }
    expect(Object.keys(NEW_MOMENTS).length).toBe(26);
    const { s, act } = withAct('r9-mom');
    clearSoundCache();
    const before = composerPull(s, act).d;
    markMoment(s, act.id, 'ex', 80);
    markMoment(s, act.id, 'cn', 80);
    clearSoundCache();
    const ms = lifeMoments(s, act);
    expect(ms.some((m) => m.code === 'ex') && ms.some((m) => m.code === 'cn')).toBe(true);
    const after = composerPull(s, act);
    expect(after.d[6]).toBeLessThan(before[6]); // melancolia puxa o eixo para baixo
    expect(after.d[7]).toBeGreaterThan(before[7]); // exílio puxa para o global
    const p = soundPhrases(s, [50, 50, 30, 60, 50, 40, 50, 50, 50], { moments: ['ex', 'cn', 'dv'] }).map((x) => x.pt).join(' | ');
    expect(p).toContain(MOMENTS.ex.phrase.pt);
    expect(p).toContain(MOMENTS.cn.phrase.pt);
    expect(p).not.toContain(MOMENTS.dv.phrase.pt);
  });

  it('decisões resolvidas e memórias do ato viram momentos (processo, exílio, reconciliação)', () => {
    const { s, act } = withAct('r9-mem');
    const push = (kind: string) => s.memory.push({ id: `m${s.memory.length}`, week: s.week - 2, year: s.year, month: 1, kind, text: { pt: kind, en: kind }, actId: act.id });
    push('lawsuit');
    push('decision:artist_exile');
    push('reunion');
    clearSoundCache();
    const codes = lifeMoments(s, act).map((m) => m.code);
    expect(codes).toEqual(expect.arrayContaining(['pc', 'ex', 'rc']));
  });
});

describe('assinaturas de timbre', () => {
  it('três lançamentos com o mesmo timbre viram marca registrada; outro ato que o usa é visto como cópia e a crítica pune', () => {
    const { s, r, act } = withAct('r9-timbre');
    expect(TIMBRES.length).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < 3; i++) {
      const so = song(s, act.id, `tb${i}`, [50, 50, 30, 60, 50, 40, 50, 50, 50], ['falsetto']);
      expect(timbresOf(s, so)).toContain('falsetto');
      const rel = fakeRel(s, act.id, [so.id]);
      runSimHooks('launch', s, r, { release: rel });
    }
    expect(actTrademarks(s, act.id)).toContain('falsetto');
    // outro ato copia
    const other = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 20 });
    const so2 = song(s, other.id, 'tbc', [50, 50, 30, 60, 50, 40, 50, 50, 50], ['falsetto']);
    const rel2 = fakeRel(s, other.id, [so2.id]);
    s.reviews[rel2.id] = [{ critic: 'x', score: 7 }, { critic: 'y', score: 7 }] as never;
    const appeal0 = rel2.appeal;
    runSimHooks('launch', s, r, { release: rel2 });
    expect(snd(s).copies?.[act.id]).toBeGreaterThanOrEqual(1);
    expect(s.reviews[rel2.id].every((x) => x.score < 7)).toBe(true);
    expect(rel2.appeal).toBeLessThan(appeal0);
    // quem tem o próprio timbre não é cópia
    expect(actTrademarks(s, other.id)).not.toContain('falsetto');
  });
});

describe('modo livre: subgêneros', () => {
  it('uma cena forte gera um subgênero com nome, instrumentação, regras e cidade; ele se espalha entre atos da família', () => {
    const s = mk('r9-sub', 1995);
    const r = rngOf(s);
    const home = s.config.homeCity;
    const ids: Act[] = [];
    for (let i = 0; i < 6; i++) ids.push(spawnProceduralAct(s, r, { city: home, fame: 15 }));
    const genre = ids[0].genre;
    for (const a of ids) a.genre = genre;
    s.scenes[`${home}:${genre}`] = 6;
    const st = subs(s);
    let born = 0;
    for (let i = 0; i < 300 && !born; i++) born = subMonth(s, rngOf(s), st).length;
    expect(st.list.length).toBeGreaterThan(0);
    const sg = st.list[0];
    expect(sg.name.pt && sg.name.en).toBeTruthy();
    expect(sg.city).toBe(home);
    expect(sg.inst.length).toBeGreaterThan(0);
    expect(subRules(sg).pt.length).toBeGreaterThan(5);
    const n0 = sg.acts.length;
    for (let i = 0; i < 400; i++) subMonth(s, rngOf(s), st);
    expect(sg.acts.length).toBeGreaterThanOrEqual(n0);
    expect(sg.spread).toBeGreaterThan(0);
    expect(Object.keys(st.adopt).length).toBe(sg.acts.length);
  });
});
