// Rodada 18 (regions18): índice dos submercados (dados separados por região).
import type { MarketId } from '../world';
import { AFEU18 } from './afeu';
import { AMERICAS18 } from './americas';
import { ASIA18 } from './asia';
import type { Ramp18, Sub18 } from './types';
export * from './types';
export { CIRCS18, DIAS18, SHIFTS18 } from './flows';

export const SUBS18: Sub18[] = [...ASIA18, ...AMERICAS18, ...AFEU18];
export const subById18: Record<string, Sub18> = Object.fromEntries(SUBS18.map((x) => [x.id, x]));
export const subsOf18 = (mk: MarketId): Sub18[] => SUBS18.filter((x) => x.mk === mk);
const A3: Record<string, string> = {};
for (const x of SUBS18) for (const a of x.a3) if (!A3[a] || x.share[0][1] > (subById18[A3[a]]?.share[0][1] ?? 0)) A3[a] = x.id;
/** Submercado de um país (o "geral" quando há sobreposição de circuito). */
export const subOfA3_18 = (a3: string | null | undefined): string | undefined => (a3 ? A3[a3] : undefined);
export function ramp18(pts: Ramp18, y: number): number {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, v0] = pts[i - 1], [y1, v1] = pts[i]; return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0); }
  return pts[pts.length - 1][1];
}
