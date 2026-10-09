// Rodada 8 — identidade dos artistas (fases, preferências, memória), histórias com continuidade,
// rivais com estratégia reconhecível e público segmentado (viral × fiel, colecionadores, migração,
// redescoberta).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { resolveDecision } from '../src/sim/events';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { composeSongs, recordSongs } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import { cityDemand } from '../src/sim/tours';
import { rngOf } from '../src/sim/util';
import { createGame, grantPlayerContract } from '../src/sim/worldgen';
import { audience, bondOf, collectorsOf, readAudience, startRevival } from '../src/sim/sys/audience8';
import { bondNote, careerPhase, identity, memOf, prefsOf, reactToResult } from '../src/sim/sys/identity8';
import { moveText, playbookOf, rivals8 } from '../src/sim/sys/rivals8';
import { maybeStartCult, stories } from '../src/sim/sys/stories8';
import type { Act, GameState, Release } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, year = 1975) => createGame(defaultConfig(seed, { startYear: year }));

/** Ato sem dono, ativo, com pelo menos `n` integrantes vivos. */
function freeBand(s: GameState, n = 2, skip: string[] = []): Act {
  const a = Object.values(s.acts).find((x) => !x.owner && !x.playerBand && x.status === 'active' && x.members.filter((m) => s.persons[m]?.alive).length >= n && !skip.includes(x.id));
  if (!a) throw new Error('sem banda livre');
  return a;
}

function fakeRelease(s: GameState, a: Act, over: Partial<Release> = {}): Release {
  const id = `rt${Object.keys(s.releases).length}x`;
  const rel: Release = {
    id, actId: a.id, owner: 'player', type: 'lp', title: 'Disco de Teste', songs: [], week: s.week, year: s.year, q: 70, appeal: 1, formats: [], stock: 0, pressed: 0,
    marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 2000, revenue: 0, peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, critic: 82, ...over,
  };
  s.releases[id] = rel;
  a.releases.push(id);
  return rel;
}

describe('identidade: fases da carreira', () => {
  it('descoberta, afirmação, auge, desgaste e reinvenção', () => {
    const s = mk('r8-phase');
    const a = freeBand(s);
    a.debutYear = s.year; a.formed = s.year; a.releases = []; a.fame = 5; a.peakChart = 999; a.number1s = 0;
    expect(careerPhase(s, a)).toBe('discovery');
    a.debutYear = s.year - 4; a.fame = 30; a.releases = ['x1', 'x2', 'x3'];
    expect(careerPhase(s, a)).toBe('affirmation');
    a.fame = 62;
    expect(careerPhase(s, a)).toBe('peak');
    const m = memOf(s, a);
    m.pk = 75; a.fame = 40; a.debutYear = s.year - 9;
    expect(careerPhase(s, a)).toBe('wear');
    m.rv = s.week;
    expect(careerPhase(s, a)).toBe('reinvention');
  });
});

describe('identidade: preferências mudam aceitação e reação', () => {
  it('artista artístico prefere selo artístico e liberdade; o comercial, o contrário', () => {
    const s = mk('r8-prefs');
    const a = freeBand(s);
    const setAll = (amb: 'art' | 'money', traits: string[]) => {
      for (const id of a.members) { const p = s.persons[id]; p.ambition = amb; p.traits = traits; }
    };
    const o = defaultOffer(s, a);
    const artLabel = () => { s.player.reputation.artistic = 90; s.player.reputation.commercial = 10; };
    const popLabel = () => { s.player.reputation.artistic = 10; s.player.reputation.commercial = 90; };
    setAll('art', ['experimental', 'rebel']);
    expect(prefsOf(s, a).art).toBeGreaterThan(62);
    artLabel();
    const artsyAtArt = evaluateOffer(s, a, o);
    expect(artsyAtArt.reasons.some((x) => /cara que procuram/.test(x.pt))).toBe(true);
    popLabel();
    const artsyAtPop = evaluateOffer(s, a, o);
    expect(artsyAtPop.reasons.some((x) => /comercial demais/.test(x.pt))).toBe(true);
    // a mesma reputação de selo agrada um e afasta o outro (descontando o efeito do alcance comercial)
    setAll('money', ['opportunist']);
    expect(prefsOf(s, a).art).toBeLessThan(38);
    artLabel();
    const popAtArt = evaluateOffer(s, a, o);
    popLabel();
    const popAtPop = evaluateOffer(s, a, o);
    expect(artsyAtArt.score - artsyAtPop.score).toBeGreaterThan(popAtArt.score - popAtPop.score + 0.1);
    // liberdade criativa: quem exige recusa mais um contrato sem controle
    setAll('art', ['rebel', 'experimental', 'big_ego']);
    const noCtl = evaluateOffer(s, a, { ...o, creativeControl: false });
    const ctl = evaluateOffer(s, a, { ...o, creativeControl: true });
    expect(ctl.score - noCtl.score).toBeGreaterThan(0.2);
  });

  it('memória: quem saiu magoado lembra da promessa quebrada ao receber nova proposta', () => {
    const s = mk('r8-mem');
    const a = freeBand(s);
    const o = defaultOffer(s, a);
    const before = evaluateOffer(s, a, o).score;
    bondNote(s, a, 'broken', 'turnê');
    bondNote(s, a, 'abandon');
    const after = evaluateOffer(s, a, o);
    expect(after.score).toBeLessThan(before);
    expect(after.reasons.some((x) => /promessa/.test(x.pt))).toBe(true);
  });

  it('mesmo fracasso, reações diferentes conforme a confiança', () => {
    const s = mk('r8-react');
    const a = freeBand(s);
    grantPlayerContract(s, a, 36);
    const flop = fakeRelease(s, a, { critic: 40, peak: 999 });
    a.trust = 80;
    for (const id of a.members) s.persons[id].morale = 70;
    expect(reactToResult(s, a, flop)).toBe('flop_together');
    a.trust = 30;
    const t0 = a.trust;
    expect(reactToResult(s, a, flop)).toBe('flop_blame');
    expect(a.trust).toBeLessThan(t0);
    expect(identity(s).acts[a.id].log.some((x) => x.k === 'blame')).toBe(true);
  });
});

describe('histórias com continuidade: o disco cult', () => {
  it('aclamado e encalhado → rival corteja a voz → escolha → anos depois, redescoberta', () => {
    const s = mk('r8-cult');
    const a = freeBand(s, 3);
    grantPlayerContract(s, a, 60);
    a.fame = 20;
    const rel = fakeRelease(s, a);
    const r = rngOf(s);
    const st = maybeStartCult(s, r, a, rel, true)!;
    expect(st).toBeTruthy();
    expect(st.ch).toEqual(['start_cult']);
    st.next = s.week;
    advanceMonth(s);
    const d = s.decisions.find((x) => x.eventId === 'r8_cult_offer');
    expect(d).toBeTruthy();
    const singer = String(d!.ctx.person);
    resolveDecision(s, d!.id, 'other');
    expect(st.ch).toContain('other');
    expect(a.members).not.toContain(singer);
    const solo = s.acts[st.solo!];
    expect(solo.members).toEqual([singer]);
    expect(solo.owner).toBe(st.lb);
    // anos depois: o disco volta, e a escolha passada decide o cardápio (banda sem a voz → reunião)
    st.next = s.week;
    advanceMonth(s);
    expect(st.ch).toContain('revived');
    expect(audience(s).rev.some((x) => x.rel === rel.id)).toBe(true);
    const d2 = s.decisions.find((x) => x.eventId === 'r8_cult_revival_split');
    expect(d2).toBeTruthy();
    resolveDecision(s, d2!.id, 'reunion');
    expect(st.done).toBe(true);
    expect(['reunion', 'reunion_fail']).toContain(st.ch[st.ch.length - 1]);
    expect(stories(s).list).toContain(st);
    invariant(s);
  });
});

describe('rivais com estratégia reconhecível', () => {
  it('cada selo tem um manual; Abutre/Tecnologia antecipam a data do seu lançamento', () => {
    const s = mk('r8-rivals', 1980);
    const labels = Object.values(s.labels).filter((x) => x.active);
    const kinds = new Set(labels.map((x) => playbookOf(x)));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    const mine = freeBand(s);
    grantPlayerContract(s, mine, 36);
    // um selo agressivo com artista do mesmo gênero e música gravada na gaveta
    const lb = labels.find((x) => playbookOf(x) === 'vulture' || playbookOf(x) === 'tech')!;
    lb.cash = Math.max(lb.cash, 1e10);
    const rivalAct = freeBand(s, 1, [mine.id]);
    rivalAct.genre = mine.genre;
    const r = rngOf(s);
    // atribui o ato ao selo sem custo de contrato
    rivalAct.owner = lb.id;
    lb.roster.push(rivalAct.id);
    const songs = composeSongs(s, r, rivalAct, 2);
    recordSongs(s, r, rivalAct, songs.map((x) => x.id), 1, 'balanced', lb.id);
    for (const o of labels) if (o !== lb) o.cash = Math.min(o.cash, 0);
    let moved = false;
    for (let i = 0; i < 60 && !moved; i++) {
      s.pendingReleases.push({ id: `prt${i}`, actId: mine.id, type: 'single', songs: [], title: `Teste ${i}`, formats: [], press: 0, marketing: [], territories: ['na'], week: s.week + 2 });
      rivals8(s).lastClash = -999;
      runSimHooks('week', s, r);
      moved = (rivals8(s).log[lb.id] ?? []).some((m) => m.k === 'date_move');
      s.pendingReleases = s.pendingReleases.filter((x) => x.id !== `prt${i}`);
    }
    expect(moved).toBe(true);
    const mv = rivals8(s).log[lb.id].find((m) => m.k === 'date_move')!;
    expect(moveText(mv).pt).toMatch(/antecipou o lançamento/);
    expect(s.notifications.some((n) => /antecipou/.test(n.text.pt))).toBe(true);
  });

  it('interesse declarado vira motivo na proposta (contrato mais atraente do rival)', () => {
    const s = mk('r8-interest', 1980);
    const a = freeBand(s);
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const o = defaultOffer(s, a);
    const before = evaluateOffer(s, a, o).score;
    rivals8(s).interest[a.id] = { lb: lb.id, w: s.week };
    const ev = evaluateOffer(s, a, o);
    expect(ev.score).toBeLessThan(before);
    expect(ev.reasons.some((x) => x.pt.includes(lb.name))).toBe(true);
  });
});

describe('público segmentado', () => {
  it('viral lota a parada mas não a casa; banda fiel vende ingresso e edição especial', () => {
    const s = mk('r8-aud', 1985);
    const viral = freeBand(s);
    const loyal = freeBand(s, 1, [viral.id]);
    for (const a of [viral, loyal]) { grantPlayerContract(s, a, 36); a.fame = 30; a.city = s.config.homeCity; }
    viral.fans = { casual: 400000, active: 3000, core: 300 };
    loyal.fans = { casual: 20000, active: 9000, core: 3000 };
    audience(s).a[viral.id] = { h: [], sat: 0, vw: s.week };
    expect(bondOf(loyal)).toBeGreaterThan(bondOf(viral) + 40);
    expect(readAudience(s, viral).viral).toBe(true);
    const raw = (a: Act) => a.fans.core * 0.9 + a.fans.active * 0.35 + a.fans.casual * 0.03;
    const ratio = (a: Act) => cityDemand(s, a, s.config.homeCity) / raw(a);
    expect(ratio(loyal)).toBeGreaterThan(ratio(viral) * 1.3);
    // colecionadores: edição limitada rende mais para quem tem núcleo fiel
    expect(collectorsOf(s, loyal)).toBeGreaterThan(collectorsOf(s, viral));
    const lim = fakeRelease(s, loyal, { kind: 'limited' });
    // rodada 13: imagem/barreiras da época também entram no apelo; aqui conta o fator dos colecionadores
    expect(applyMods(s, 'appeal', 1, { release: lim, act: loyal }).factors.find((f) => f.label.en === 'Collectors')!.ratio).toBeGreaterThan(1.12);
  });

  it('redescoberta multiplica o catálogo antigo; artista parado perde fãs para os parecidos', () => {
    const s = mk('r8-rev', 1985);
    const a = freeBand(s);
    grantPlayerContract(s, a, 36);
    const old = fakeRelease(s, a, { year: s.year - 15, week: s.week - 800 });
    expect(startRevival(s, old, 4, 'generation')).toBe(true);
    expect(applyMods(s, 'chartUnits', 100, { release: old }).value).toBeGreaterThan(400);
    // migração: banda separada com muitos fãs; parecida e ativa recebe parte deles
    const gone = freeBand(s, 1, [a.id]);
    gone.status = 'split';
    gone.fans = { casual: 500000, active: 40000, core: 5000 };
    const heir = Object.values(s.acts).find((x) => x.id !== gone.id && x.genre === gone.genre && (x.status === 'active' || x.status === 'emerging'))
      ?? Object.values(s.acts).find((x) => x.id !== gone.id && x.status === 'active')!;
    heir.genre = gone.genre; heir.status = 'active'; heir.fame = 40; heir.momentum = 95; heir.lastRelease = s.week;
    const before = gone.fans.casual;
    advanceMonth(s);
    expect(gone.fans.casual).toBeLessThan(before);
    invariant(s);
  });
});
