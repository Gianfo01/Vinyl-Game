// Rodada 8 (parte 2): projeto musical, leitura do resultado e retrospectiva da run.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { runSimHooks } from '../src/sim/ext4';
import { composeSongs, recordSongs } from '../src/sim/production';
import { createProject, projectStage, projectCosts, projectResult, scheduleProject, proj8, needSongs, unscheduleProject, type MusicProject } from '../src/sim/sys/project8';
import { explainRelease, expectedFor } from '../src/sim/sys/explain8';
import { retrospective } from '../src/sim/sys/retro8';
import { money, playerActs, rngOf } from '../src/sim/util';
import { l } from '../src/data/world';
import type { GameState, Release, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, { scenario: 'emerging', ...over }));

function setup(seed: string) {
  const s = mk(seed);
  const actId = playerActs(s)[0];
  expect(actId).toBeTruthy();
  const act = s.acts[actId];
  // começa com o artista sem músicas inéditas, para ver o projeto atravessar todas as etapas
  for (const id of act.songs) if (!s.songs[id].releaseId) s.songs[id].vault = true;
  return { s, act, r: rngOf(s) };
}

describe('projeto musical', () => {
  it('atravessa conceito → composição → gravação → mixagem/capa → programado → lançado → balanço', () => {
    const { s, act, r } = setup('r8-proj');
    const p = createProject(s, act.id, { type: 'ep', concept: 'radio' }) as MusicProject;
    expect('pt' in p).toBe(false);
    expect(p.goal).toBe('hit');
    expect(p.cover).toBeTruthy();
    expect(projectStage(s, p)).toBe('concept');
    // compor: o projeto se completa sozinho com as músicas novas
    composeSongs(s, r, act, 1);
    runSimHooks('week', s, r);
    expect(projectStage(s, p)).toBe('writing');
    composeSongs(s, r, act, needSongs('ep') + 1);
    runSimHooks('week', s, r);
    expect(p.songIds.length).toBe(needSongs('ep'));
    expect(projectStage(s, p)).toBe('recording');
    // orçamento: gravação pendente entra no comprometido
    const c0 = projectCosts(s, p);
    expect(c0.recording).toBeGreaterThan(0);
    expect(c0.committed).toBe(p.spent + c0.remaining);
    recordSongs(s, r, act, p.songIds, 1, 'balanced', 'player');
    expect(projectStage(s, p)).toBe('finishing');
    const err = scheduleProject(s, r, p);
    expect(err).toBeNull();
    expect(p.spent).toBeGreaterThan(0);
    expect(projectStage(s, p)).toBe('scheduled');
    invariant(s);
    for (let i = 0; i < p.weeksAhead + 6 && !p.releaseId; i++) advanceWeek(s);
    expect(p.releaseId).toBeTruthy();
    expect(projectStage(s, p)).toBe('released');
    const rel = s.releases[p.releaseId!];
    expect(rel.fc).toBeGreaterThan(0);
    expect(rel.coverChoice).toBe(p.cover!.style);
    for (let i = 0; i < 16 && s.week - rel.week < 8; i++) advanceWeek(s);
    expect(projectStage(s, p)).toBe('followup');
    const res = projectResult(s, p)!;
    expect(res.units).toBe(rel.totalUnits);
    expect(res.spent).toBe(p.spent);
    // a leitura chegou como notificação algumas semanas depois
    expect(rel.expl).toBe(true);
    expect(s.notifications.some((n) => n.text.pt.startsWith('Leitura:') && n.text.pt.includes(rel.title))).toBe(true);
    invariant(s);
  });

  it('cancelar o lançamento devolve o dinheiro e volta para a etapa de acabamento', () => {
    const { s, act, r } = setup('r8-cancel');
    const p = createProject(s, act.id, { type: 'single' }) as MusicProject;
    const [so] = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [so.id], 1, 'balanced', 'player');
    p.songIds = [so.id];
    const cash0 = s.player.cash;
    expect(scheduleProject(s, r, p)).toBeNull();
    expect(s.player.cash).toBeLessThan(cash0);
    unscheduleProject(s, p);
    expect(projectStage(s, p)).toBe('finishing');
    expect(proj8(s).list).toContain(p);
    invariant(s);
  });
});

describe('leitura do resultado', () => {
  const fake = (s: GameState, actId: string): Release => ({
    id: 'rx', actId, owner: 'player', type: 'lp', title: 'Teste', songs: [], week: s.week - 12, year: s.year, q: 60, appeal: 1, formats: ['lp'], stock: 0, pressed: 0,
    marketing: [{ channel: 'press', budget: money(s, 1000) }], marketingE: 0.4, territories: ['eu'], weekly: [100, 120, 110, 90, 80, 70, 60, 50, 40, 30], totalUnits: 750, revenue: 0,
    peak: 12, weeksOnChart: 5, lastPos: 0, coverSeed: 1, shortage: 0, live: true, fc: 400, fa: 750,
    autopsy: [
      { key: 'quality', label: l('Q'), value: 1.6, confidence: 'high' },
      { key: 'fame', label: l('F'), value: 1.3, confidence: 'high' },
      { key: 'genre', label: l('G'), value: 1.2, confidence: 'medium' },
      { key: 'coverage', label: l('C'), value: 0.5, confidence: 'medium' },
      { key: 'luck', label: l('L'), value: 0.8, confidence: 'low' },
      { key: 'era', label: l('E'), value: 0.95, confidence: 'medium' },
      { key: 'marketing', label: l('M'), value: 2, confidence: 'high' },
    ],
  });

  it('três fatores que ajudaram, dois que atrapalharam, contra a expectativa e uma oportunidade', () => {
    const s = mk('r8-expl');
    const actId = playerActs(s)[0];
    const rel = fake(s, actId);
    const ex = explainRelease(s, rel)!;
    expect(ex.helped.map((f) => f.key)).toEqual(['quality', 'fame', 'genre']);
    expect(ex.hurt.map((f) => f.key)).toEqual(['coverage', 'luck']);
    expect(ex.expected).toBe(400);
    expect(ex.actual).toBe(750);
    expect(ex.verdict).toBe('smash');
    expect(ex.summary.pt).toContain('porque as músicas eram fortes');
    expect(ex.summary.en).toContain('because the songs were strong');
    expect(ex.summary.pt).toContain('a distribuição cobriu poucos mercados');
    // a oportunidade ataca o fator que mais atrapalhou
    expect(ex.opportunity.pt).toMatch(/territórios/);
    // previsão proporcional às semanas decorridas
    expect(expectedFor(rel, 3)!).toBeLessThan(400 * 0.45);
    expect(expectedFor({ ...rel, fc: undefined }, 3)).toBeNull();
  });

  it('fracasso explicado: marketing fraco vira a oportunidade', () => {
    const s = mk('r8-flop');
    const rel = fake(s, playerActs(s)[0]);
    rel.fa = 100;
    rel.autopsy = [{ key: 'quality', label: l('Q'), value: 1.2, confidence: 'high' }, { key: 'marketing', label: l('M'), value: 1, confidence: 'low' }, { key: 'luck', label: l('L'), value: 0.9, confidence: 'low' }];
    const ex = explainRelease(s, rel)!;
    expect(ex.verdict).toBe('flop');
    expect(ex.hurt[0].key).toBe('marketing');
    expect(ex.opportunity.en).toMatch(/promotion/i);
    expect(ex.summary.pt).toContain('decepcionou');
  });
});

describe('retrospectiva', () => {
  it('organiza discos por era, marcos, artistas e gêneros', () => {
    const { s, act, r } = setup('r8-retro');
    const p = createProject(s, act.id, { type: 'single' }) as MusicProject;
    const [so] = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [so.id], 1, 'balanced', 'player');
    p.songIds = [so.id];
    expect(scheduleProject(s, r, p)).toBeNull();
    for (let i = 0; i < 8; i++) advanceWeek(s);
    const rt = retrospective(s);
    expect(rt.totals.releases).toBeGreaterThan(0);
    expect(rt.eras.length).toBeGreaterThan(0);
    expect(rt.eras[0].name.pt).toMatch(/^Anos /);
    expect(rt.eras.flatMap((e) => e.releases).some((x) => x.id === p.releaseId)).toBe(true);
    expect(rt.milestones[0].kind).toBe('first');
    expect(rt.alumni.some((a) => a.actId === act.id && a.current)).toBe(true);
    expect(rt.genres[0].share).toBeGreaterThan(0);
    // rompimentos e reencontros vêm da memória da run
    s.memory.push({ id: 'mx', week: s.week, year: s.year, month: s.month, kind: 'split', text: l('Fim da banda', 'Band ends'), actId: act.id });
    expect(retrospective(s).stories[0].kind).toBe('broken');
  });
});
