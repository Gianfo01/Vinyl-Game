// Rodada 14 — mais artistas reais (1920–2023) para o "Tamanho da base de dados". Cada entrada tem `z` (1 médio,
// 2 grande, 3 enorme). A ordem é fixa: catalogNo = 1000 + índice em REAL_ALL, então só se acrescenta ao FIM.
// Entradas com o mesmo nome de artistas das listas originais são descartadas (sem duplicar).
import type { RealArtist } from './realtypes';
import { REAL_US } from './realacts_us';
import { REAL_EU } from './realacts_eu';
import { REAL_WORLD } from './realacts_world';
import { REAL_ACTS } from './realnames';
import { MORE_NA } from './more14/na';
import { MORE_BR, MORE_LA } from './more14/latam';
import { MORE_EU } from './more14/eu';
import { MORE_ASIA } from './more14/world';
import { MORE_X } from './more14/extra';

export const REAL_MORE_RAW: RealArtist[] = [...MORE_NA, ...MORE_BR, ...MORE_LA, ...MORE_EU, ...MORE_ASIA, ...MORE_X];

const norm = (n: string) => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const taken = new Set<string>([...REAL_US, ...REAL_EU, ...REAL_WORLD].map((a) => norm(a.n)));
for (const a of Object.values(REAL_ACTS)) taken.add(norm(a.name));
/** Lista final, sem nomes repetidos com as listas originais nem entre si (ordem estável). */
export const REAL_MORE: RealArtist[] = REAL_MORE_RAW.filter((a) => { const k = norm(a.n); if (taken.has(k)) return false; taken.add(k); return true; }).map((a) => ({ ...a, z: a.t })); // nível da base = fama: 1 estrelas (médio), 2 grandes nomes (grande), 3 cult/regionais (enorme)
