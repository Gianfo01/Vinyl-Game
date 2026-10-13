// r28 F8 — mede as cadeias de história (ux19.ch) em partidas reais com o bot equilibrado.
//   npx tsx tools/chains28.ts --seeds 4 --years 15 --start 1975 [--off] [--db small]
// --off desliga o Mestre das cadeias (chains28) para comparar com o "natural".
import { defaultConfig, simulate } from '../src/sim/bot';
import { CHAINS19 } from '../src/sim/sys/ux19data';
import { ux19 } from '../src/sim/sys/ux19';
import { OFF_CH28, ch28 } from '../src/sim/sys/chains28';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = +arg('seeds', '4'), years = +arg('years', '15'), start = +arg('start', '1975'), db = arg('db', 'small'), from = +arg('from', '0');
OFF_CH28.on = process.argv.includes('--off');
const rows: Record<string, number[]>[] = [];
for (let i = from; i < from + seeds; i++) {
  const c = defaultConfig(`ch28-${i}`, { startYear: start, scenario: 'established' } as Parameters<typeof defaultConfig>[1]);
  (c as { dbSize?: string }).dbSize = db;
  const t0 = Date.now();
  const { state: s } = simulate(c, years);
  const ch = ux19(s).ch;
  rows.push(ch as Record<string, number[]>);
  console.log(JSON.stringify({ seed: i, y: s.year, secs: Math.round((Date.now() - t0) / 1000), ch, nudges: ch28(s).nudges, log: ch28(s).log.slice(0, 12) }));
}
for (const c of CHAINS19) {
  const per = c.steps.map((_, k) => rows.filter((r) => (r[c.id] ?? []).includes(k)).length);
  const all = rows.filter((r) => (r[c.id] ?? []).length >= c.steps.length).length;
  console.log(`${c.id}: passos ${per.join(' · ')} | inteira ${all}/${rows.length}`);
}
