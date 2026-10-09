// Rodada 13: matéria-prima por formato/época com escolha de fornecedor; projeto com mistura de conceitos,
// local, singles, edição, capa, divisão de verba, polimento e prévia com o porquê.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { runSimHooks } from '../src/sim/ext4';
import { composeSongs, pressingCost } from '../src/sim/production';
import { costFactor, gradeDefect, matAvailable, matTarget, setGrade, sup13 } from '../src/sim/sys/industry/supply13';
import { createProject, type MusicProject } from '../src/sim/sys/project8';
import { commitProject, planOf12 } from '../src/sim/sys/project12';
import { DEFAULT13, blendOf, block13, commit13, factors13, planOf13, preview13 } from '../src/sim/sys/project13';
import { playerActs, rngOf } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import type { FormatId } from '../src/data/rules';

function setup(seed: string) {
  const s = createGame(defaultConfig(seed, { scenario: 'emerging' }));
  const act = s.acts[playerActs(s)[0]];
  composeSongs(s, rngOf(s), act, 3);
  return { s, act };
}

describe('matéria-prima (rodada 13)', () => {
  it('cada material tem curva própria, crises e fornecedor que muda custo e defeitos', () => {
    expect(matTarget('vinyl', 1974)).toBeGreaterThan(matTarget('vinyl', 1970) * 1.5); // choque do petróleo
    expect(matTarget('polycarbonate', 1984)).toBeGreaterThan(matTarget('polycarbonate', 1995) * 2);
    expect(matTarget('tape', 2005)).toBeGreaterThan(matTarget('tape', 1985));
    const { s } = setup('r13-mat');
    s.x4.industry.matPrice.vinyl = 1.6;
    s.x4.industry.matPrice.tape = 0.8;
    expect(costFactor(s, ['lp'])).toBeGreaterThan(costFactor(s, ['cassette']));
    const fm = ['lp'] as FormatId[];
    const std = pressingCost(s, fm, 5000);
    setGrade(s, 'vinyl', 'premium');
    expect(pressingCost(s, fm, 5000)).toBeGreaterThan(std);
    expect(gradeDefect(s, fm)).toBeLessThan(0);
    setGrade(s, 'vinyl', 'budget');
    expect(pressingCost(s, fm, 5000)).toBeLessThan(std);
    expect(gradeDefect(s, fm)).toBeGreaterThan(0);
    // nada do futuro: CD só depois da tecnologia
    const cdYear = s.techDates.cd;
    if (cdYear !== undefined && s.year < cdYear) expect(matAvailable(s, 'polycarbonate')).toBe(false);
    expect(sup13(s).grade.vinyl).toBe('budget');
  });
});

describe('projeto musical (rodada 13)', () => {
  it('mistura de conceitos, opções por época, custo, prazo e prévia explicada', () => {
    const { s, act } = setup('r13-proj');
    const p = createProject(s, act.id, { type: 'lp', concept: 'art' }) as MusicProject;
    expect(blendOf('art', 'radio')!.k).toBe('clash');
    expect(blendOf('roots', 'art')!.k).toBe('syn');
    commitProject(s, p, { intent: 'prestige', dir: 'signature', aud: 'critics', budget: 'standard', deadline: 'normal' });
    const dl = planOf12(s, p)!.deadline;
    // lançamento surpresa não existe antes de 2013
    if (s.year < 2013) expect(block13(s, p, { ...DEFAULT13, single: 'surprise' })).not.toBeNull();
    const clash = factors13(s, p, { ...DEFAULT13, c2: 'radio' }).reduce((t, f) => t * f.v, 1);
    const syn = factors13(s, p, { ...DEFAULT13, c2: 'roots' }).reduce((t, f) => t * f.v, 1);
    expect(syn).toBeGreaterThan(clash);
    const cash = s.player.cash;
    const choice = { ...DEFAULT13, c2: 'roots', loc: s.year >= 1960 ? 'legendary' as const : 'live' as const, polish: 80, split: [60, 30, 10] as [number, number, number] };
    expect(commit13(s, p, choice)).toBeNull();
    const pl = planOf13(s, p)!;
    expect(pl.c2).toBe('roots');
    expect(planOf12(s, p)!.deadline).toBeGreaterThan(dl); // polimento empurra o prazo
    if (choice.loc === 'legendary') expect(s.player.cash).toBeLessThan(cash);
    const pv = preview13(s, p, pl);
    expect(pv.units.hi).toBeGreaterThanOrEqual(pv.units.mid);
    expect(pv.units.mid).toBeGreaterThanOrEqual(pv.units.lo);
    expect(pv.fx.length).toBeGreaterThan(0);
    expect(pv.deltas.d.production ?? 0).toBeGreaterThan(0);
    // recomprometer não duplica o ajuste de prazo
    const dl2 = planOf12(s, p)!.deadline;
    commit13(s, p, pl);
    expect(planOf12(s, p)!.deadline).toBe(dl2);
    runSimHooks('week', s, rngOf(s));
  });
});
