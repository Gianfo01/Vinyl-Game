// QA33: os interruptores exp33.* nascem ligados (decisão do dono, 2026-10-17). Testes que medem "desligado = como antes"
// desligam explicitamente com esta função (nunca apagados nem pulados).
import '../../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (como nos testes)
import { setSw, switchDefs } from '../../src/sim/r31/switches';
import type { GameState } from '../../src/sim/types';

export const EXP33 = (): string[] => switchDefs().filter((d) => d.id.startsWith('exp33.') && typeof d.def === 'boolean').map((d) => d.id);
/** Desliga todos os exp33.* nesta partida (devolve a própria partida, para encadear em fábricas de jogo). */
export function off33<T extends GameState>(s: T): T { for (const id of EXP33()) setSw(s, id, false); return s; }
/** Mesma coisa já na criação do mundo (config `sw31`): o mundo nasce sem a 33, como antes. */
export function off33c<T extends { sw31?: Record<string, boolean | number | string> }>(cfg: T): T { cfg.sw31 = { ...(cfg.sw31 ?? {}), ...Object.fromEntries(EXP33().map((id) => [id, false])) }; return cfg; }
