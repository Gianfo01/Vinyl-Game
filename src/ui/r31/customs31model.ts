// R31 · onda 4 (T2) — ALFÂNDEGA em cena: modelo PURO (sem DOM). O balcão muda com a época (galpão do porto até 1946,
// salão do aeroporto depois; cão farejador 1946–2000, raio X a partir de 1975, scanner a partir de 2001); as caixas
// paradas são as cargas reais (sim/sys/customs31), o quadro mostra o que está a caminho, o fiscal e o despachante são
// gente da cidade. Montar o modelo nunca muda o estado nem gira sorteio.
import { cityById, l, type L } from '../../data/world';
import {
  cargos31, customsOn31, despName31, ERA_TOOL31, held31, inspectorName31, knownDesp31, seizeP31, transit31, type Cargo31,
} from '../../sim/sys/customs31';
import { dutyRate31 } from '../../sim/sys/auction31';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import type { Spot31 } from './scene31model';

export const CUS_W31 = 320;
export const CUS_H31 = 180;
/** caixas paradas no chão (até 4): x do canto esquerdo e base no piso */
export const CRATE_XS31 = [34, 84, 236, 282];
export const CRATE_BASE31 = 168;
export interface Crate31 { c: Cargo31; x: number; y: number; w: number; h: number }
export interface Cus31 {
  W: number; H: number; year: number; on: boolean;
  /** galpão do porto (até 1946) ou salão do aeroporto */
  port: boolean;
  dog: boolean; xray: boolean; scanner: boolean;
  tool: L;
  crates: Crate31[];
  transit: Cargo31[];
  done: Cargo31[];
  inspector: string;
  desp: string;
  despKnown: boolean;
  /** rigor em palavras (época e país) */
  strict: L;
  duty: number;
  spots: Spot31[];
  title: L;
}
export const cityN31 = (id: string): L => cityById[id]?.name ?? l(id, id);
export function customs31Model(s: GameState): Cus31 {
  const on = customsOn31(s);
  const y = s.year;
  const held = on ? held31(s).slice(0, CRATE_XS31.length) : [];
  const crates: Crate31[] = held.map((c, i) => { const w = c.k === 'relic' ? 30 : 26, h = c.k === 'relic' ? 22 : 18; return { c, x: CRATE_XS31[i], y: CRATE_BASE31 - h, w, h }; });
  const p = seizeP31(s, { law: 'stolen' }, 'self');
  const strict = p >= 0.4 ? l('Fiscalização dura: abrem quase toda caixa.', 'Tough inspection: they open almost every crate.')
    : p >= 0.22 ? l('Fiscalização atenta: abrem uma caixa em cada quatro ou cinco.', 'Watchful inspection: they open one crate in four or five.')
      : l('Fiscalização frouxa: a maioria passa sem abrir.', 'Lax inspection: most crates pass unopened.');
  const port = y < 1946;
  const spots: Spot31[] = [];
  const sp = (x: Omit<Spot31, 'go'> & { panel: string }): void => { const { panel, ...rest } = x; spots.push({ ...rest, go: { panel } }); };
  sp({ id: 'door', x: 2, y: 52, w: 22, h: 46, label: l('Saída', 'Exit'), tip: l('Volta ao aeroporto e ao porto.', 'Back to the airport and port.'), panel: 'door' });
  sp({ id: 'inspector', x: 150, y: 58, w: 24, h: 42, label: l('Fiscal da alfândega', 'Customs inspector'), tip: fmtL(l('{n} — {t}.', '{n} — {t}.'), { n: inspectorName31(s), t: ERA_TOOL31(y) }), panel: 'inspector' });
  sp({ id: 'desp', x: 124, y: 112, w: 24, h: 44, label: l('Despachante', 'Customs broker'), tip: knownDesp31(s) ? l('Já trabalhou com você: cobra menos e erra menos.', 'Has worked with you before: charges less and slips less.') : l('Cobra uma taxa para liberar sem declarar; conhecido, erra menos.', 'Charges a fee to clear undeclared cargo; once you know them, they slip less.'), panel: 'desp' });
  sp({ id: 'board', x: 30, y: 10, w: 74, h: 50, label: port ? l('Quadro de navios', 'Ships board') : l('Painel de cargas', 'Cargo board'), tip: l('O que está a caminho e o que já foi resolvido.', 'What is on its way and what has been settled.'), panel: 'board',
    badge: on && transit31(s).length ? { text: String(transit31(s).length), level: 'info' } : undefined });
  sp({ id: 'tax', x: 234, y: 12, w: 62, h: 40, label: l('Tabela de impostos', 'Duty table'), tip: fmtL(l('Imposto de importação desta época: {d}% do valor declarado.', 'Import duty in this era: {d}% of the declared value.'), { d: Math.round(dutyRate31(y) * 100) }), panel: 'tax' });
  for (const [i, x] of crates.entries()) sp({ id: `crate:${i}`, x: x.x - 2, y: x.y - 6, w: x.w + 4, h: x.h + 8, label: x.c.n, tip: x.c.law === 'legal' ? l('Carga com nota: declarar e pagar o imposto, ou arriscar passar sem.', 'Cargo with an invoice: declare and pay duty, or risk getting it through without.') : l('Carga sem nota (peça roubada): declarar é perder; passar é arriscar.', 'Cargo without an invoice (stolen piece): declaring means losing it; getting it through is a gamble.'), panel: `crate:${i}`,
    badge: { text: x.c.law === 'legal' ? l('retida', 'held') : l('sem nota', 'no invoice'), level: x.c.law === 'legal' ? 'normal' : 'soon', sym: '!' } });
  return { W: CUS_W31, H: CUS_H31, year: y, on, port, dog: y >= 1946 && y < 2001, xray: y >= 1975, scanner: y >= 2001, tool: ERA_TOOL31(y), crates,
    transit: on ? transit31(s) : [], done: (on ? cargos31(s) : []).filter((c) => c.done !== undefined).slice(-8).reverse(),
    inspector: inspectorName31(s), desp: despName31(s), despKnown: knownDesp31(s), strict, duty: dutyRate31(y), spots,
    title: port ? l('Alfândega do porto', 'Port customs') : l('Alfândega do aeroporto', 'Airport customs') };
}
