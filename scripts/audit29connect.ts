// R29 (CONNECT): auditoria pessoa ↔ ato ↔ biografia ↔ formação em várias sementes × anos iniciais × mundos.
// Uso: npx tsx scripts/audit29connect.ts [--seeds 2] [--starts 1950,1962,1975,1990,2005] [--worlds random,exact,real,chaos]
//      [--years 0,6] [--show R1,R2c] [--json saida.json]
// Para cada combinação cria a partida, roda N anos (sandbox se quebrar) e conta os achados de src/sim/audit29.ts.
import { writeFileSync } from 'node:fs';
import { defaultConfig } from '../src/sim/bot';
import { applyWorld17 } from '../src/sim/start17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { audit29, count29, type Finding29 } from '../src/sim/audit29';

const args = process.argv.slice(2);
const arg = (k: string, d: string): string => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seeds = +arg('seeds', '2');
const starts = arg('starts', '1950,1962,1975,1990,2005').split(',').map(Number);
const worlds = arg('worlds', 'random,exact,real,chaos').split(',');
const years = arg('years', '0,6').split(',').map(Number);
const show = arg('show', '').split(',').filter(Boolean);
const total: Record<string, number> = {};
const rows: { seed: string; start: number; world: string; at: number; counts: Record<string, number> }[] = [];
const ex: Record<string, Finding29[]> = {};
for (let i = 0; i < seeds; i++) for (const start of starts) for (const world of worlds) {
  const seed = `r29c-${i}`;
  const cfg = defaultConfig(seed, { startYear: start });
  applyWorld17(cfg, world);
  const s = createGame(cfg);
  let y = 0;
  for (const target of years) {
    while (y < target) { for (let m = 0; m < 12; m++) { if (s.ended) (s.flags as Record<string, number>).sandbox = 1; advanceMonth(s); } y++; }
    const fs = audit29(s);
    const c = count29(fs);
    rows.push({ seed, start, world, at: s.year, counts: c });
    for (const [k, v] of Object.entries(c)) total[k] = (total[k] ?? 0) + v;
    for (const f of fs) if (show.includes(f.code)) (ex[f.code] ??= []).length < 25 && ex[f.code].push(f);
    console.error(`${seed} ${start} ${world} @${s.year}: ${JSON.stringify(c)}`);
  }
}
console.log('TOTAL', JSON.stringify(total));
for (const [k, xs] of Object.entries(ex)) { console.log(`-- ${k}`); for (const f of xs) console.log('  ', f.msg); }
const out = arg('json', '');
if (out) writeFileSync(out, JSON.stringify({ total, rows }, null, 1));
