// R31 onda 3 (bal): sonda R29 completa por semente (para escolher o trio do tests/r29-connect-all). Uso: npx tsx scripts/r31/probe-r29seeds.ts <saída.json> semente...
import '../../src/sim/sys/index';
import { writeFileSync } from 'node:fs';
import { base29, run29 } from '../../src/sim/probe29all';

const [out, ...seeds] = process.argv.slice(2);
const res: Record<string, unknown> = {};
for (const sd of seeds) { res[sd] = run29(base29(sd)); writeFileSync(out, JSON.stringify(res)); }
