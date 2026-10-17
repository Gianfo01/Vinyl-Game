// R33 · QA33 — robô jogando 1889→2040 com TODOS os exp33.* ligados, em várias carreiras. Procura erro, NaN e dinheiro
// absurdo; partida que acaba (falência) recomeça no ano em que parou (mesma carreira, semente nova) até 2040.
// Uso: npx tsx scripts/r33/qa33-bot.ts <carreira> [ano0=1889] [ano1=2040] [db=small]
//   carreira: label | artist | manager | festival | studio | booking | venue
// Saída: uma linha por ano (caixa e patrimônio em US$ de 2020, contadores das regras da 33) e o resumo no fim.
import { defaultConfig } from '../../src/sim/bot';
import { playMonth, type Profile } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw, switchDefs } from '../../src/sim/r31/switches';
import { toReal } from '../../src/core/money';
import { ownerOf } from '../../src/sim/sys/people/owner';
import type { GameState, RunConfig } from '../../src/sim/types';

const car = process.argv[2] ?? 'label';
const y0 = Number(process.argv[3] ?? 1889), y1 = Number(process.argv[4] ?? 2040);
const db = (process.argv[5] ?? 'small') as RunConfig['dbSize'];
const prof = (process.env.PROF ?? 'balanced') as Profile;
const SW = switchDefs().filter((d) => d.id.startsWith('exp33.') && typeof d.def === 'boolean').map((d) => d.id);

function game(seed: string, year: number): GameState {
  const over: Partial<RunConfig> = { startYear: year, realNames: true, dbSize: db };
  if (car === 'artist') Object.assign(over, { role: 'artist', bandGenre: 'rnr', bandName: 'Banda Teste' });
  else if (car !== 'label') over.careers = { main: [car] };
  const s = createGame(defaultConfig(seed, over));
  if (!process.env.QA33_OFF) for (const id of SW) setSw(s, id, true);
  return s;
}
const bad: string[] = [];
const fin = (s: GameState, what: string, v: unknown): void => { if (typeof v !== 'number' || !Number.isFinite(v)) bad.push(`${s.year}-${s.month} ${what}=${String(v)}`); };
function check(s: GameState): void {
  fin(s, 'cash', s.player.cash); const o = ownerOf(s); fin(s, 'wealth', o.wealth); fin(s, 'stress', o.stress); fin(s, 'health', o.health);
  for (const k of ['artistic', 'commercial', 'artists', 'institutional'] as const) fin(s, `rep.${k}`, s.player.reputation[k]);
  for (const ln of s.player.loans) { fin(s, `loan.${ln.id}`, ln.balance); fin(s, `loanrate.${ln.id}`, ln.rate); }
  for (const a of Object.values(s.acts)) if (a.owner === 'player') { fin(s, `fame.${a.id}`, a.fame); fin(s, `mom.${a.id}`, a.momentum); fin(s, `fans.${a.id}`, a.fans.casual); }
  for (const r of Object.values(s.releases)) if (r.owner === 'player' && s.week - r.week < 60) { fin(s, `units.${r.id}`, r.totalUnits); fin(s, `rev.${r.id}`, r.revenue); }
  const cr = toReal(s.player.cash, s.year), wr = toReal(o.wealth, s.year);
  if (Math.abs(cr) > 5e9) bad.push(`${s.year}-${s.month} caixa absurdo US$ ${Math.round(cr)}`);
  if (Math.abs(wr) > 5e9) bad.push(`${s.year}-${s.month} patrimônio absurdo US$ ${Math.round(wr)}`);
}
const x4 = (s: GameState) => s.x4 as unknown as Record<string, any>;
function counters(s: GameState): string {
  const x = x4(s), c = x.cat33, b = x.bots33, i2 = x.int2, p = x.pes33;
  const used = i2 ? Object.values(i2.used as Record<string, number>).reduce((t, n) => t + n, 0) : 0;
  return [`reqs ${c?.req?.length ?? 0}`, `proc ${c?.cases?.length ?? 0}`, `rs ${c?.rs?.length ?? 0}`, `penhor ${c ? Object.keys(c.pledge).length : 0}`,
    `bots ${b ? `${b.jaba}/${b.bids}/${b.lots}/${b.house}/${b.homes}/${b.vit}+${JSON.stringify(b.x)}` : '-'}`, `int2 ${used}`, `quim ${p ? Object.keys(p.chem ?? {}).length : 0}`,
    `emp ${s.player.loans.length}`].join(' · ');
}

let seg = 0, s = game(`qa33-${car}-${seg}`, y0), errs = 0, months = 0, lastY = s.year;
const t0 = Date.now(), restarts: string[] = [];
let minCash = Infinity, maxCash = -Infinity;
while (s.year < y1 || (s.year === y1 && s.month < 12)) {
  try { playMonth(s, prof); advanceMonth(s); months++; }
  catch (e) { errs++; bad.push(`${s.year}-${s.month} ERRO ${(e as Error).stack?.split('\n').slice(0, 4).join(' | ')}`); if (errs > 5) break; s = game(`qa33-${car}-${++seg}`, s.year + 1); continue; }
  check(s);
  const cr = toReal(s.player.cash, s.year); minCash = Math.min(minCash, cr); maxCash = Math.max(maxCash, cr);
  if (s.year !== lastY) {
    lastY = s.year;
    console.log(`${car} ${s.year}\tcaixa ${Math.round(cr / 1000)}k\tpessoal ${Math.round(toReal(ownerOf(s).wealth, s.year) / 1000)}k\t${counters(s)}\t${Math.round((Date.now() - t0) / 1000)}s`);
  }
  if (s.ended) { restarts.push(`${s.year} (${(s.ended as { ending?: string }).ending ?? '?'})`); s = game(`qa33-${car}-${++seg}`, Math.min(y1, s.year + 1)); }
}
console.log(`FIM ${car}: ${months} meses, ${restarts.length} recomeço(s) [${restarts.join(', ')}], caixa min ${Math.round(minCash / 1000)}k max ${Math.round(maxCash / 1000)}k, ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(bad.length ? `PROBLEMAS ${bad.length}:\n${[...new Set(bad)].slice(0, 40).join('\n')}` : 'SEM PROBLEMAS');
