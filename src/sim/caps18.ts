// Rodada 18 (econ18, ponto 15): retornos decrescentes para bônus pequenos empilhados.
// Regra (documentada também em docs/econ18.md):
//  • Modificadores em cadeia (applyMods): os BÔNUS de uma categoria se multiplicam (B = Π r>1) e o total efetivo é
//    1 + teto·tanh((B−1)/teto). Pequenos bônus quase não mudam (+10% vira +9,9%); pilhas grandes encostam no teto.
//    Penalidades continuam inteiras. Para custo e risco (menor é melhor) a mesma regra vale para as reduções.
//  • Vantagens somadas (perk): a parte positiva de cada chave passa pelo mesmo teto suave; a negativa fica inteira.
// Sem imports de runtime (ext4/perks importam este módulo).
import type { L } from '../data/world';

/** teto do bônus total por categoria de modificador (fração: 0,6 = no máximo ~+60%) */
export const MOD_CAP18: Record<string, { cap: number; lower?: boolean }> = {
  appeal: { cap: 0.8 }, chartUnits: { cap: 0.6 }, cityDemand: { cap: 0.7 }, showRevenue: { cap: 0.7 }, songQ: { cap: 0.3 },
  pressingCost: { cap: 0.45, lower: true }, tourRisk: { cap: 0.6, lower: true },
};
/** teto suave da soma positiva por chave de vantagem (na unidade da chave) */
export const PERK_CAP18: Record<string, number> = {
  offer: 0.25, critics: 6, songQ: 8, trust: 12, morale: 12, appeal: 0.4, showRevenue: 0.4, chartUnits: 0.4, pressingCost: 0.35,
  advance: 0.4, valuation: 0.5, reputation: 10, xp: 0.6, staffCost: 0.4, scoutAccuracy: 0.4, signals: 1.2, demos: 3, scoutActions: 3, energy: 1.5, wealth: 0.5, scheme: 0.4, stress: 0.4,
};

/** chaves de vantagem em que menor é melhor (o bônus é a soma negativa) */
export const LOWER_PERK18 = new Set(['staffCost', 'pressingCost', 'stress']);

export const soft18 = (x: number, cap: number): number => (x <= 0 ? x : cap * Math.tanh(x / cap));

/** fator de ajuste para a pilha de bônus B (produto dos multiplicadores favoráveis) */
export function modAdj18(name: string, boost: number): number {
  const c = MOD_CAP18[name];
  if (!c || boost <= 1.0001) return 1;
  const eff = 1 + soft18(boost - 1, c.cap);
  return c.lower ? boost / eff : eff / boost;
}
export const DIMINISH18: L = { pt: 'Retornos decrescentes (bônus empilhados)', en: 'Diminishing returns (stacked bonuses)' };

/** estatística opcional (balanço): globalThis.__caps18 = {} liga a coleta */
export function capStat18(key: string, raw: number, eff: number): void {
  const g = (globalThis as { __caps18?: Record<string, { n: number; raw: number; max: number; cut: number }> }).__caps18;
  if (!g) return;
  const x = (g[key] ??= { n: 0, raw: 0, max: 0, cut: 0 });
  x.n++; x.raw += raw; x.max = Math.max(x.max, raw); x.cut += raw - eff;
}
