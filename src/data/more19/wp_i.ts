// WP-I — mídia, covers, cenas, relíquias (o que couber no Pack19) (docs/db19.md §5). Edite só este arquivo (ou crie vizinhos wp_i_*.ts e concatene-os aqui).
// Formato e regras: docs/db19.md "## Formato more19" e ./types.ts (import de valor só de '../world').
// Artistas: um lado de cada cover do COVERS19 (media19) que não existia no banco — sem eles o coverEvent (heritage17) não dispara.
import type { Pack19 } from './types';
import { rows } from './ab_util';

const COVER_SIDES = `
Jimmy Dorsey|big_band|new_york|USA|1935|2|1904|1957|h|||Bésame Mucho:1944:s
Chubby Checker|rnr|philadelphia|USA|1959|2|1941||v|||The Twist:1960:s
Millie Small|ska|kingston|JAM|1962|2|1946|2020|v|||My Boy Lollipop:1964:s
The Sandpipers|trad_pop|los_angeles|USA|1966|3||||||Guantanamera:1966:s
Harry Nilsson|pop_rock|los_angeles|USA|1967|2|1941|1994|v|||Without You:1971:s
MARRS|house|london|GBR|1987|3||||||Pump Up the Volume:1987:s
`;

export const PACK: Pack19 = { id: 'wp_i', artists: rows(COVER_SIDES) };
