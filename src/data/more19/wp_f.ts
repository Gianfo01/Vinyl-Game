// WP-F — lugares: casas de show, estúdios nomeados, equipamento (docs/db19.md §5). Dados em wp_f_venues / wp_f_studios / wp_f_gear.
// Formato e regras: docs/db19.md "## Formato more19" e ./types.ts (import de valor só de '../world').
import type { Pack19 } from './types';
import { GEAR_F } from './wp_f_gear';
import { STUDIOS_F } from './wp_f_studios';
import { VENUES_F } from './wp_f_venues';

export { GEAR_META19, gearAvailable19 } from './wp_f_gear';
export { STUDIO_KIT19 } from './wp_f_studios';
export type { GearMeta19 } from './wp_f_gear';
export type { RoomKind19, StudioKit19 } from './wp_f_studios';

export const PACK: Pack19 = { id: 'wp_f', venues: VENUES_F, studios: STUDIOS_F, gear: GEAR_F };
