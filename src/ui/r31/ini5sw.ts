// R31 · onda 5 (INI) — interruptores de interface da onda 5 guardados no navegador (valem antes da partida) e a
// lembrança da última partida salva (época, cidade e carreira) para a cena da tela inicial.
import { setSwUiStore, swUi, type SwVal } from '../../sim/r31/switches';
import { afterSave17, profileId17 } from '../store';
import type { GameState } from '../../sim/types';

const KEY = 'vtn:sw31ui';
let load: Record<string, SwVal> | undefined;
try { load = JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? undefined; } catch { load = undefined; }
setSwUiStore(load, (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* sem armazenamento */ } });

/** Tela inicial e nova run da onda 5 ligadas? (interruptor `exp5.ini`, padrão ligado) */
export const ini5On = (): boolean => swUi<boolean>('exp5.ini');

export interface Last5 { year: number; city: string; career: string }
const lastKey = () => `vtn:ini5last:${profileId17()}`;
/** Época, cidade e carreira da última partida salva neste perfil (para a cena da tela inicial). */
export function last5(): Last5 | null {
  try { const v = JSON.parse(localStorage.getItem(lastKey()) ?? 'null') as Last5 | null; return v && typeof v.year === 'number' && typeof v.city === 'string' ? v : null; } catch { return null; }
}
afterSave17.push((g: GameState) => {
  try { localStorage.setItem(lastKey(), JSON.stringify({ year: g.year, city: g.config.homeCity, career: g.config.careers?.main?.[0] ?? 'label' } satisfies Last5)); } catch { /* sem armazenamento */ }
});
