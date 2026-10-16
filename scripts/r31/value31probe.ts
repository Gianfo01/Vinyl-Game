// R31 (E · Bolsa) — sonda do modelo de valor: joga N meses com o robô e imprime a conta por parte do seu selo e dos
// rivais listados, mais o preço contra o valor por ação. Uso: npx tsx scripts/r31/value31probe.ts [semente] [ano] [meses] [off]
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { actEarning31, companyValue31, masterYield31, money12, SW_VALUE31 } from '../../src/sim/r31/value31';
import { setSw } from '../../src/sim/r31/switches';
import { bolsa, sharesOf } from '../../src/sim/sys/bolsa10';
import { labelValue } from '../../src/sim/sys/stakes8';
import { toReal } from '../../src/core/money';

const [seed = 'v31probe', y0 = '1975', months = '24', off] = process.argv.slice(2);
const s = createGame(defaultConfig(seed, { startYear: Number(y0) }));
if (off === 'off') setSw(s, SW_VALUE31, false);
const R = (c: number): number => Math.round(toReal(c, s.year));
for (let i = 0; i < Number(months); i++) { playMonth(s); advanceMonth(s); }
const v = companyValue31(s, 'player');
console.log(`== ${s.year}/${s.month + 1} player total $${R(v.total)} (real 2020 $)`);
for (const p of v.parts) console.log(`  ${p.k.padEnd(9)} ${String(R(p.v)).padStart(12)}  ${p.basis}  ${p.why.pt}`);
for (const k of Object.keys(bolsa(s).lbl)) {
  const lb = s.labels[k];
  const q = bolsa(s).q[`lb:${k}`];
  if (!lb || !q || q.dead) continue;
  const w = companyValue31(s, k);
  console.log(`-- ${lb.name}: v31 $${R(w.total)} · labelValue $${R(labelValue(s, lb).value)} · price ${(q.p / 100).toFixed(2)} vs ${(w.total / sharesOf(s, `lb:${k}`) / 100).toFixed(2)} · note ${q.note?.pt ?? ''}`);
  console.log('   ' + w.parts.map((p) => `${p.k}:${R(p.v)}`).join(' '));
}
// calibração: receita de 12 meses × ritmo dos masters × ganho anual esperado do elenco (dólares reais)
for (const id of ['player', ...Object.keys(bolsa(s).lbl)]) {
  const rels = Object.values(s.releases).filter((r) => r.owner === id);
  const rate = rels.reduce((t, r) => t + masterYield31(s, r).rate, 0);
  const young = rels.filter((r) => s.week - r.week < 52).reduce((t, r) => t + masterYield31(s, r).rate, 0);
  const ids = id === 'player' ? Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => a.id) : s.labels[id]?.roster ?? [];
  const e = ids.reduce((t, a) => t + (s.acts[a] ? actEarning31(s, s.acts[a], id).e : 0), 0);
  console.log(`calib ${id}: rev12 ${R(money12(s, id).rev)} · masters/ano ${R(rate)} (novos ${R(young)}) · elenco/ano ${R(e)} · atos ${ids.length} · rels ${rels.length}`);
}
