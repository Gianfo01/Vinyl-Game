// R29 (CONNECT): as chaves de perk fracionárias 'appeal', 'chartUnits', 'showRevenue' e 'pressingCost' eram escritas por
// ramos da sede (hq6), cartas (cards6), cenários (scenarios17/23), agenda17, social8, era1889… e mostradas na interface
// ("+10% apelo"), mas nenhum código da simulação as lia: bônus prometido que não existia. Aqui viram modificadores
// registrados (aparecem na autópsia) e valem só para os atos do jogador, que é de quem os perks são.
// Retornos decrescentes: a soma positiva já passa por PERK_CAP18 em perk() e a pilha de modificadores por MOD_CAP18.
import { l } from '../../data/world';
import { registerMod } from '../ext4';
import { perk } from '../perks';
import type { Act, GameState } from '../types';

const LABEL = l('Bônus do selo (sede, cartas, origem)', 'Label bonuses (HQ, cards, background)');
const mine = (a: Act | undefined): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
/** Botão de equilíbrio: fração do bônus prometido que vale (1 = o valor anunciado). Ligar estes perks sobe o patrimônio
 *  mediano do bot equilibrado (balance19 --quick, 12 sementes: 1,42 → 2,37 mi); docs/connect29.md §6. */
export const PERKS29_SCALE = { k: 1 };
const scaled = (v: number, f: number) => ({ value: v * Math.max(0.5, 1 + f * PERKS29_SCALE.k), label: LABEL });

registerMod('appeal', 'perks29', (s: GameState, v, ctx) => { const a = ctx.act ?? (ctx.release ? s.acts[ctx.release.actId] : undefined); if (!mine(a)) return null; const f = perk(s, 'appeal', a); return f ? scaled(v, f) : null; });
registerMod('chartUnits', 'perks29', (s, v, ctx) => { const a = ctx.release ? s.acts[ctx.release.actId] : ctx.act; if (!mine(a) || ctx.release?.owner !== 'player') return null; const f = perk(s, 'chartUnits', a); return f ? scaled(v, f) : null; });
registerMod('showRevenue', 'perks29', (s, v, ctx) => { if (!mine(ctx.act)) return null; const f = perk(s, 'showRevenue', ctx.act); return f ? scaled(v, f) : null; });
registerMod('pressingCost', 'perks29', (s, v) => { const f = perk(s, 'pressingCost'); return f ? scaled(v, f) : null; });
