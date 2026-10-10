// Rodada 18 (econ18, ponto 15): retornos decrescentes para bônus pequenos empilhados.
// Regra (documentada também em docs/econ18.md):
//  • Modificadores em cadeia (applyMods): os BÔNUS de uma categoria se multiplicam (B = Π r>1) e o total efetivo é
//    1 + teto·tanh((B−1)/teto). Pequenos bônus quase não mudam (+10% vira +9,9%); pilhas grandes encostam no teto.
//    Penalidades continuam inteiras. Para custo e risco (menor é melhor) a mesma regra vale para as reduções.
//  • Vantagens somadas (perk): a parte positiva de cada chave passa pelo mesmo teto suave; a negativa fica inteira.
// Sem imports de runtime (ext4/perks importam este módulo).
import type { L } from '../data/world';

/** bônus PEQUENOS empilhados por categoria: até `knee` passa inteiro; acima, cresce no máximo mais `room`
 *  (ex.: appeal — até +30% intacto, depois no máximo ~+90%). Efeitos grandes isolados (r > 1,25) não entram na pilha. */
export const MOD_CAP18: Record<string, { knee: number; room: number; lower?: boolean }> = {
  appeal: { knee: 0.3, room: 0.6 }, chartUnits: { knee: 0.3, room: 0.5 }, cityDemand: { knee: 0.3, room: 0.5 }, showRevenue: { knee: 0.3, room: 0.5 }, songQ: { knee: 0.15, room: 0.2 },
  pressingCost: { knee: 0.25, room: 0.25, lower: true }, tourRisk: { knee: 0.3, room: 0.3, lower: true },
};
/** só multiplicadores pequenos (até +25%) contam como "pilha" */
export const SMALL18 = 1.25;
/** joelho da soma positiva por chave de vantagem (na unidade da chave): até ele passa inteiro; acima, retorno
 *  decrescente que acrescenta no máximo outro tanto */
export const PERK_CAP18: Record<string, number> = {
  offer: 0.25, critics: 6, songQ: 8, trust: 12, morale: 12, appeal: 0.4, showRevenue: 0.4, chartUnits: 0.4, pressingCost: 0.35,
  advance: 0.4, valuation: 0.5, reputation: 10, xp: 0.6, staffCost: 0.4, scoutAccuracy: 0.4, signals: 3, demos: 3, scoutActions: 3, energy: 1.5, wealth: 0.5, scheme: 0.4, stress: 0.4, metadata: 0.4,
};

/** chaves de vantagem em que menor é melhor (o bônus é a soma negativa) */
export const LOWER_PERK18 = new Set(['staffCost', 'pressingCost', 'stress']);

/** joelho suave: até `knee` igual; acima, knee + room·tanh((x−knee)/room) */
export const soft18 = (x: number, knee: number, room = knee): number => (x <= knee ? x : knee + room * Math.tanh((x - knee) / room));

/** fator de ajuste para a pilha de bônus B (produto dos multiplicadores favoráveis) */
export function modAdj18(name: string, boost: number): number {
  const c = MOD_CAP18[name];
  if (!c || boost <= 1.0001) return 1;
  const eff = 1 + soft18(boost - 1, c.knee, c.room);
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
