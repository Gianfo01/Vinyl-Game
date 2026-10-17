// R33 (GESTÃO) — aprendizados que ensinam (exp33.learn), diretores de imprensa/jurídico/RH (exp33.dir) e o robô nas
// regras novas (exp33.bots). Poucos casos, sem jogo longo:
//   • desligados no código: previsão igual, linhas da delegação travadas, robô sem estado novo;
//   • calibração: amostras parecidas puxam a previsão no sentido certo, limitada, sem eco (razão crua com o k guardado);
//   • diretores: com o cargo e "Delegar", respondem cartões de escândalo, disputa e aumento e casos de outras frentes;
//   • robô: com o interruptor, usa leilão/terreno/casa/vitrine pelas funções de sempre.
import { describe, expect, it } from 'vitest';
import { off33c } from './helpers/off33';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { familyOf } from '../src/data/world';
import { forecastUnits } from '../src/sim/market';
import { autoLog31, lockWhy31, modeOf31, respView31, setDir31, setMode31 } from '../src/sim/deleg31';
import { learn31, type Samp31 } from '../src/sim/r31/learn31';
import { setSw, sw } from '../src/sim/r31/switches';
import { LEARN33, SW_LEARN33, anrBias33, calib33, fmtPick33 } from '../src/sim/r33/learn33';
import { SW_DIR33, dirWeek33, legalPick33, pressPick33, registerLegalCase33 } from '../src/sim/r33/dir33';
import { SW_BOTS33, botMonth33 } from '../src/sim/r33/bots33';
import { playerActs } from '../src/sim/util';
import type { Decision, GameState, StaffMember } from '../src/sim/types';

const game = (seed = 'r33g', y = 1975): GameState => {
  const s = createGame(off33c(defaultConfig(seed, { startYear: y, scenario: 'established' }))); // QA33: 33 ligada por padrão
  s.player.cash = 50_000_000_00;
  return s;
};
const hire = (s: GameState, role: string, skill = 80): StaffMember => {
  s.player.staff = s.player.staff.filter((x) => x.role !== role);
  const st: StaffMember = { id: `st-${role}`, name: `Teste ${role}`, role, skill, salary: 100_000, hiredWeek: s.week - 200 };
  s.player.staff.push(st);
  return st;
};
/** amostras sintéticas: `n` lançamentos do gênero/tipo que venderam `r` × a previsão */
const seed = (s: GameState, g: string, t: Samp31['t'], r: number, n: number, k?: number): void => {
  const st = learn31(s);
  for (let i = 0; i < n; i++) st.s.push({ id: `x${g}${t}${i}`, n: `X${i}`, a: 'a', an: 'A', y: s.year, m: 3, g, t, u: Math.round(1000 * r), e: 1000, pk: 20, cr: 0, fa: 40, cash: 0, f: [], ...(k ? { k } : {}) });
};
const dec = (s: GameState, eventId: string, cat: string, opts: string[], ctx: Decision['ctx'] = {}): Decision => {
  const d: Decision = { id: `d33-${eventId}`, eventId, cat, title: { pt: eventId, en: eventId }, text: { pt: '', en: '' }, options: opts.map((id) => ({ id, label: { pt: id, en: id } })), ctx, week: s.week, defaultOption: opts[opts.length - 1], tags: [] };
  s.decisions.push(d);
  return d;
};

describe('R33 GESTÃO', () => {
  const s = game();
  const act = s.acts[playerActs(s).find((id) => !s.acts[id].playerBand)!];
  const fam = familyOf(act.genre);

  it('interruptores desligados no código: nada muda', () => {
    for (const id of [SW_LEARN33, SW_DIR33, SW_BOTS33]) expect(sw<boolean>(s, id)).toBe(false);
    const before = forecastUnits(s, act, 'lp', 60, [], s.player.territories).mid;
    seed(s, fam, 'lp', 2, 10);
    expect(forecastUnits(s, act, 'lp', 60, [], s.player.territories).mid).toBe(before);
    expect(respView31(s, 'press').locked).toBeTruthy();
    hire(s, 'publicist');
    expect(lockWhy31(s, 'press', 'staff')).not.toBeNull();
    botMonth33(s, 'aggressive');
    expect((s.x4 as unknown as { bots33?: unknown }).bots33).toBeUndefined();
    learn31(s).s = [];
  });

  it('aprendizados: a previsão segue o que lançamentos parecidos venderam, com limite e sem eco', () => {
    setSw(s, SW_LEARN33, true);
    expect(calib33(s, fam, 'lp', []).k).toBe(1); // sem amostra: sem correção
    const base = forecastUnits(s, act, 'lp', 60, [], s.player.territories).mid;
    seed(s, fam, 'lp', 1.6, 8);
    const c = calib33(s, fam, 'lp', []);
    expect(c.k).toBeGreaterThan(1.2);
    expect(c.k).toBeLessThanOrEqual(Math.exp(LEARN33.cap) + 1e-9);
    expect(forecastUnits(s, act, 'lp', 60, [], s.player.territories).mid).toBeGreaterThan(base);
    // amostra que já vinha calibrada (k 1,6) e bateu a previsão: a razão crua continua 1,6 (não desfaz a correção)
    learn31(s).s = [];
    seed(s, fam, 'lp', 1, 8, 1.6);
    expect(calib33(s, fam, 'lp', []).k).toBeCloseTo(c.k, 5);
    // outro gênero pesa pouco
    learn31(s).s = [];
    seed(s, fam === 'rock' ? 'pop' : 'rock', 'lp', 0.5, 8);
    expect(calib33(s, fam, 'lp', []).k).toBeGreaterThan(0.85);
    learn31(s).s = [];
  });

  it('aprendizados ensinam os diretores: A&R pelo gênero, produtor troca LP por single', () => {
    seed(s, fam, 'lp', 0.5, 6);
    seed(s, fam, 'single', 1.5, 6);
    expect(anrBias33(s, act)).toBeLessThan(0);
    expect(anrBias33(s, act)).toBeGreaterThanOrEqual(-LEARN33.anr);
    expect(fmtPick33(s, act, 'lp')).toBe('single');
    setSw(s, SW_LEARN33, false);
    expect(anrBias33(s, act)).toBe(0);
    expect(fmtPick33(s, act, 'lp')).toBe('lp');
    learn31(s).s = [];
  });

  it('diretores: imprensa, jurídico e RH respondem no seu lugar e anotam no registro', () => {
    setSw(s, SW_DIR33, true);
    const pub = hire(s, 'publicist'), law = hire(s, 'legal'), adm = hire(s, 'admin');
    for (const r of ['press', 'legal', 'people'] as const) { expect(lockWhy31(s, r, 'staff')).toBeNull(); expect(setMode31(s, r, 'staff')).toBeNull(); expect(modeOf31(s, r)).toBe('staff'); }
    const good: StaffMember = { ...pub, id: 'st-good', skill: 90, salary: 200_000, role: 'producer', name: 'Boa' };
    s.player.staff.push(good);
    const salary = good.salary;
    dec(s, 'r11_staff_raise', 'business', ['raise', 'partial', 'let_go'], { staffId: good.id, staff: good.name });
    const sc = dec(s, 'zz_scandal', 'scandal', ['sue', 'apologize', 'deny']);
    expect(pressPick33(sc, 0.8)).toBe('apologize');
    expect(pressPick33(sc, 0.2)).toBe('deny'); // assessoria fraca: só o padrão
    s.decisions = s.decisions.filter((d) => d !== sc); // evento de mentira não é resolvido (não existe no catálogo)
    const law1 = dec(s, 'plagiarism_suit', 'contract', ['musicologist', 'credit', 'settle'], {});
    expect(legalPick33(law1, 0.9)).toBe('musicologist');
    expect(legalPick33(law1, 0.3)).toBe('settle');
    let decided = '';
    registerLegalCase33({ id: 'teste', list: () => (decided ? [] : [{ id: 'c1', t: { pt: 'Caso', en: 'Case' }, settle: 1_000_00, win: 0.2 }]), decide: (_s, id, how) => { decided = `${id}:${how}`; return null; } });
    dirWeek33(s);
    expect(s.player.staff.find((x) => x.id === good.id)?.salary).toBe(Math.round(salary * 1.3));
    expect(s.decisions.some((d) => d.eventId === 'r11_staff_raise' || d.eventId === 'plagiarism_suit')).toBe(false);
    expect(decided).toBe('c1:settle');
    expect(autoLog31(s, { who: adm.id }).length).toBeGreaterThan(0);
    expect(autoLog31(s, { who: law.id }).length).toBeGreaterThanOrEqual(2);
    // teto anual de aumento abaixo do custo: saída barata
    setDir31(s, 'people', { cap: 10 });
    const d2 = dec(s, 'r11_staff_raise', 'business', ['raise', 'partial', 'let_go'], { staffId: good.id });
    dirWeek33(s);
    expect(s.decisions.includes(d2)).toBe(false);
    expect(autoLog31(s, { who: adm.id, n: 1 })[0].t.pt).toContain('partial');
    setSw(s, SW_DIR33, false);
    expect(respView31(s, 'legal').locked).toBeTruthy();
  });

  it('robô: com exp33.bots usa leilão, terreno, casa e vitrine pelas funções de sempre', () => {
    setSw(s, SW_BOTS33, true);
    const g = () => (s.x4 as unknown as { bots33?: Record<string, number> }).bots33!;
    botMonth33(s, 'aggressive');
    const L = g();
    expect(L).toBeDefined();
    expect(L.lots + L.bids + L.house + L.homes + L.vit + L.jaba).toBeGreaterThan(0);
    const lots = L.lots;
    botMonth33(s, 'aggressive');
    expect(g().lots).toBe(lots); // no máximo um terreno por ano
    setSw(s, SW_BOTS33, false);
  });
});
