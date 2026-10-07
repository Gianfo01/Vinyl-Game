// Simulador sem interface: roda N campanhas e mede falência, unicidade e finais (GDD §5.7, §26).
// Uso: npm run headless -- --runs 20 --years 30 --start 1960 --mode free

import { formatMoney } from '../src/core/money';
import { defaultConfig, simulate } from '../src/sim/bot';
import type { Mode } from '../src/sim/types';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const runs = Number(arg('runs', '10'));
const years = Number(arg('years', '20'));
const start = Number(arg('start', '1960'));
const mode = arg('mode', 'free') as Mode;
const role = arg('role', 'label') as 'label' | 'artist' | 'hybrid';

const results = [];
const t0 = Date.now();
for (let i = 0; i < runs; i++) {
  const t = Date.now();
  const { state, summary } = simulate(defaultConfig(`hl-${i}`, { startYear: start, mode, role, bandGenre: 'rnr', bandName: 'Banda Teste' }), years);
  results.push(summary);
  const acts = Object.keys(state.acts).length;
  const size = JSON.stringify(state).length;
  console.log(
    `#${i} ${summary.seed}: até ${summary.endYear} caixa ${formatMoney(summary.cash)} #1=${summary.number1s} lanç=${summary.releases} legado=${summary.legacy} ${summary.ended ?? ''} | atos=${acts} save=${(size / 1024).toFixed(0)}KB ${(Date.now() - t) / 1000}s`,
  );
}
const bankrupt = results.filter((r) => r.ended && r.ended !== 'arc').length;
console.log(`\nFalências: ${bankrupt}/${runs}`);
// unicidade: sobreposição de atos no top 100 por década entre runs
const decades = Object.keys(results[0]?.topActsByDecade ?? {}).map(Number);
for (const d of decades) {
  let overlapSum = 0;
  let pairs = 0;
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = new Set(results[i].topActsByDecade[d] ?? []);
      const b = results[j].topActsByDecade[d] ?? [];
      if (!a.size || !b.length) continue;
      const inter = b.filter((x) => a.has(x)).length;
      overlapSum += inter / Math.max(a.size, b.length);
      pairs++;
    }
  }
  if (pairs) console.log(`Década ${d}: sobreposição média do top 100 entre runs = ${((overlapSum / pairs) * 100).toFixed(1)}% (meta: ≤ 40%)`);
}
console.log(`Tempo total ${(Date.now() - t0) / 1000}s`);
