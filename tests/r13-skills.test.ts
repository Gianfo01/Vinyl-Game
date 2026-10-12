// Rodada 13 — árvore de habilidades com 8 ramos e pontos por conquistas (sem pagar duas vezes).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { BRANCHES, SKILL_TREE, SKILLS_OFF22, START_SKILL_POINTS, YEARLY_SKILL_POINTS, branchPoints, skills } from '../src/sim/sys/persona';
import { awardSkillPoints } from '../src/sim/sys/skillpts13';
import { perkEntries } from '../src/sim/perks';

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

// r22: a árvore de Habilidades saiu do jogo — nada é pago, comprado ou aplicado; saves antigos seguem rodando
describe('habilidades removidas (r22)', () => {
  it('conquistas não pagam pontos e não há aviso', () => {
    const s = createGame(defaultConfig('r13-skills', { startYear: 1990 }));
    const S0 = skills(s);
    expect(SKILLS_OFF22).toBe(true);
    expect(S0.owned).toEqual([]);
    for (let i = 0; i < 3; i++) s.awards.push({ year: 1990 + i, category: 'x' + i, name: 'Prêmio ' + i, byPlayer: true });
    s.week = 30;
    awardSkillPoints(s);
    expect(S0.points).toBe(0);
    expect(s.notifications.some((n) => /ponto\(s\) de habilidade/.test(n.text.pt))).toBe(false);
  });

  it('save antigo com habilidades compradas carrega, a simulação segue e elas não dão bônus', () => {
    const s = createGame(defaultConfig('r13-skills2', { startYear: 1990 }));
    const S0 = skills(s);
    S0.owned = ['cr_ear', 'cr_hook'];
    for (let i = 0; i < 14; i++) advanceMonth(s);
    expect(S0.points).toBe(0);
    expect(perkEntries(s).some((e) => /Habilidade|Ability/.test(e.label.pt))).toBe(false);
  });
});
