// Rodada 13 — árvore de habilidades com 8 ramos e pontos por conquistas (sem pagar duas vezes).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { BRANCHES, SKILL_TREE, START_SKILL_POINTS, YEARLY_SKILL_POINTS, branchPoints, skills } from '../src/sim/sys/persona';
import { ACH_KINDS, awardSkillPoints } from '../src/sim/sys/skillpts13';

describe('árvore de 8 ramos', () => {
  it('cada ramo tem 6 habilidades e o total fica numa faixa jogável', () => {
    expect(BRANCHES).toHaveLength(8);
    for (const b of BRANCHES) expect(SKILL_TREE.filter((x) => x.branch === b.id)).toHaveLength(6);
    for (const d of SKILL_TREE) for (const r of d.req) expect(SKILL_TREE.find((x) => x.id === r)!.branch).toBe(d.branch);
    const total = SKILL_TREE.reduce((t, d) => t + d.cost, 0);
    const typical = START_SKILL_POINTS + 8 * YEARLY_SKILL_POINTS + 6 + 10; // criação + 8 anos + marcos + conquistas
    expect(typical / total).toBeGreaterThan(0.4);
    expect(typical / total).toBeLessThan(0.6);
    expect(Object.keys(branchPoints(['mg_notes', 'dg_meta']))).toHaveLength(8);
  });
});

describe('pontos por conquistas', () => {
  it('paga cada conquista uma vez, com aviso e diário, respeitando o teto', () => {
    const s = createGame(defaultConfig('r13-skills', { startYear: 1990 }));
    const S0 = skills(s);
    awardSkillPoints(s); // semeia o histórico sem pagar
    const p0 = S0.points;
    for (let i = 0; i < 3; i++) s.awards.push({ year: 1990 + i, category: 'x' + i, name: 'Prêmio ' + i, byPlayer: true });
    s.week = 30;
    awardSkillPoints(s);
    expect(S0.points).toBe(p0 + 6);
    expect(S0.achLog!.length).toBe(3);
    expect(s.notifications.some((n) => /ponto\(s\) de habilidade/.test(n.text.pt))).toBe(true);
    awardSkillPoints(s);
    expect(S0.points).toBe(p0 + 6); // sem pagamento duplo
    for (let i = 0; i < 10; i++) s.awards.push({ year: 2000 + i, category: 'y' + i, name: 'P' + i, byPlayer: true });
    awardSkillPoints(s);
    expect(S0.achPts!.award).toBe(ACH_KINDS.find((k) => k.id === 'award')!.cap);
    expect(S0.earned).toBeGreaterThanOrEqual(S0.points);
  });

  it('save antigo sem ach carrega e a simulação segue', () => {
    const s = createGame(defaultConfig('r13-skills2', { startYear: 1990 }));
    const S0 = skills(s);
    delete S0.ach; delete S0.achPts; delete S0.achLog;
    for (let i = 0; i < 14; i++) advanceMonth(s);
    expect(S0.points).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(S0.ach)).toBe(true);
  });
});
