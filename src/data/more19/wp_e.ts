// WP-E — pessoas (produtores, empresários, executivos) e selos (docs/db19.md §5). Edite só este arquivo (ou os vizinhos wp_e_*.ts, concatenados aqui).
// Formato e regras: docs/db19.md "## Formato more19" e ./types.ts (import de valor só de '../world').
import type { Pack19 } from './types';
import { PRODS_E } from './wp_e_prod';
import { EXECS_E, MGRS_E } from './wp_e_mgr';
import { LABELS_E } from './wp_e_labels';

export const PACK: Pack19 = { id: 'wp_e', producers: PRODS_E, managers: MGRS_E, execs: EXECS_E, labels: LABELS_E };
