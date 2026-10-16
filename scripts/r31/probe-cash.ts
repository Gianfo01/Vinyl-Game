// R31 onda 3 (bal): para onde vai o caixa do robô. Uso: R31_SW="id=v,..." npx tsx scripts/r31/probe-cash.ts <semente> [ano] [meses] [perfil]
// Imprime caixa mês a mês e, por ano, as categorias de lançamento (cat|prefixo da chave) com maior saída/entrada,
// e o resíduo (variação de caixa que não passou pelo livro).
import { defaultConfig } from '../../src/sim/bot';
import { playMonth, type Profile } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { postObs18 } from '../../src/sim/ledger18';
import { setSw, switchDef } from '../../src/sim/r31/switches';
import { toReal } from '../../src/core/money';

const seed = process.argv[2] ?? 'r29rel-bot';
const start = Number(process.argv[3] ?? 1970);
const months = Number(process.argv[4] ?? 240);
const prof = (process.argv[5] ?? 'balanced') as Profile;
// MEAS=1: a mesma configuração do measure.ts (selo, rock, base padrão, sem nomes reais)
const s = createGame(defaultConfig(seed, process.env.MEAS ? { startYear: start, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' } : { startYear: start, realNames: true }));
if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
  const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
  setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
}
const agg: Record<string, number> = {};
let posted = 0;
postObs18().push((_s, key, amount, cat, _sect, cash) => {
  if (!cash) return;
  posted += amount;
  const k = `${cat}|${key.replace(/[:#].*$/, '').replace(/\d+/g, '')}`;
  agg[k] = (agg[k] ?? 0) + amount;
});
const V = !!process.env.V;
let m = 0, resid = 0;
const dump = (y: number) => {
  const e = Object.entries(agg).sort((a, b) => a[1] - b[1]);
  if (process.env.ALL) for (const [k, v] of e) console.log(`cat ${y} ${k} ${Math.round(toReal(v, y))}`);
  console.log(`== ${y} saídas:`, e.slice(0, 14).map(([k, v]) => `${k}=${Math.round(toReal(v, y) / 1000)}k`).join('  '));
  console.log(`== ${y} entradas:`, e.reverse().slice(0, 8).map(([k, v]) => `${k}=${Math.round(toReal(v, y) / 1000)}k`).join('  '));
  console.log(`== ${y} resíduo fora do livro: ${Math.round(toReal(resid, y) / 1000)}k`);
  for (const k of Object.keys(agg)) delete agg[k];
  resid = 0;
};
for (; m < months && !s.ended; m++) {
  const c0 = s.player.cash; posted = 0;
  playMonth(s, prof); advanceMonth(s);
  resid += s.player.cash - c0 - posted;
  if (V || m % 6 === 5) console.log(m, s.year, s.month, 'caixa(2020)', Math.round(toReal(s.player.cash, s.year)), 'dív', s.player.loans.length, 'atos', Object.values(s.acts).filter((a) => a.owner === 'player').length);
  if (s.month === 0 || (process.env.MON && m >= Number(process.env.MON))) dump(s.year - (s.month === 0 ? 1 : 0));
}
dump(s.year);
if (process.env.R) for (const r of Object.values(s.releases).filter((x) => x.owner === 'player' && !x.hist)) {
  console.log('rel', r.year, r.type, r.title.slice(0, 24), 'q', Math.round(r.q), 'ap', Math.round(r.appeal), 'terr', r.territories.join('/'), 'fmt', r.formats.join('/'),
    'pressed', r.pressed, 'stock', r.stock, 'units', r.totalUnits, 'short', r.shortage, 'rev(2020)', Math.round(toReal(r.revenue, r.year)), 'mkt', Math.round(toReal(r.marketing.reduce((t, x) => t + x.budget, 0), r.year)), 'peak', r.peak, 'fc', Math.round(r.fc ?? -1), 'dem10', r.dem10 ?? -1, 'phys%', Math.round(100 * (r.totalUnits ? 1 : 0)));
}
console.log('fim', m, s.year, s.ended, JSON.stringify((s as unknown as { endReason?: unknown }).endReason ?? null));
