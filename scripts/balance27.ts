// Rodada 27 (AUD1) — balance23 reduzido com os DOIS bots: o simples (bot.ts, o do balance23) e o jogador de
// verdade (playbot16 'balanced', que agora também usa casas, festivais, estúdio, editora e salas da sede).
// Não muda nada no jogo. Uso: npx tsx scripts/balance27.ts [anos=3] [sementes=2] [saida.json]
import { writeFileSync } from 'node:fs';
import { toReal } from '../src/core/money';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { playLog, playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import type { GameState, RunConfig } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';

const YEARS = Number(process.argv[2] ?? 3);
const SEEDS = Number(process.argv[3] ?? 2);
const OUT = process.argv[4];
type Row = { bot: string; seed: string; diff: string; start: string; year0: number; survived: boolean; months: number; cashReal0: number; cashReal: number; low: number; debtReal: number; releases: number; staff: number; staffY1: number; log?: Record<string, unknown>; ms: number };

function run(bot: 'simple' | 'play16', cfg: RunConfig): Row {
  const t = Date.now();
  const s: GameState = createGame(cfg);
  const cash0 = toReal(s.player.cash, s.year);
  let m = 0, low = Infinity, staffY1 = 0;
  for (; m < YEARS * 12 && !s.ended; m++) {
    if (bot === 'simple') botMonth(s); else playMonth(s, 'balanced');
    advanceMonth(s);
    low = Math.min(low, toReal(s.player.cash, s.year));
    if (m === 11) staffY1 = s.player.staff.length;
  }
  const debt = s.player.loans.reduce((x, l) => x + l.balance, 0);
  const L = bot === 'play16' ? (playLog(s) as unknown as Record<string, unknown>) : undefined;
  return { bot, seed: cfg.seed, diff: cfg.difficulty, start: cfg.scenario, year0: cfg.startYear, survived: !s.ended && s.player.cash > -debt, months: m,
    cashReal0: Math.round(cash0 / 100), cashReal: Math.round(toReal(s.player.cash, s.year) / 100), low: Math.round(low / 100), debtReal: Math.round(toReal(debt, s.year) / 100),
    releases: s.player.stats.releases, staff: s.player.staff.length, staffY1, log: L ? { ...L, r17: undefined, ...(L.r17 as object) } : undefined, ms: Date.now() - t };
}

const BOTS = (process.env.BOTS ?? 'simple,play16').split(',') as ('simple' | 'play16')[];
const rows: Row[] = [];
for (const bot of BOTS) for (const diff of ['easy', 'normal', 'hard'] as const) for (const start of ['from_zero', 'emerging'] as const) for (let i = 0; i < SEEDS; i++) {
  const year = [1975, 1990, 1962, 2010][i % 4];
  const r = run(bot, defaultConfig(`bal23-${diff}-${start}-${i}`, { difficulty: diff, scenario: start, startYear: year }));
  rows.push(r);
  console.log([r.bot, r.diff, r.start, r.year0, r.survived ? 'vivo' : 'QUEBROU', `caixa ${r.cashReal0}→${r.cashReal}`, `mín ${r.low}`, `dívida ${r.debtReal}`, `lanç ${r.releases}`, `equipe a1 ${r.staffY1} fim ${r.staff}`, `${(r.ms / 1000).toFixed(0)}s`].join(' | '));
}
if (OUT) writeFileSync(OUT, JSON.stringify({ years: YEARS, seeds: SEEDS, rows }, null, 1));
for (const bot of BOTS) for (const k of ['easy', 'normal', 'hard']) {
  const xs = rows.filter((r) => r.bot === bot && r.diff === k);
  if (!xs.length) continue;
  console.log(bot, k, 'sobrevivência', `${xs.filter((r) => r.survived).length}/${xs.length}`, 'caixa real médio', Math.round(xs.reduce((a, r) => a + r.cashReal, 0) / xs.length), 'equipe no 1º ano', (xs.reduce((a, r) => a + r.staffY1, 0) / xs.length).toFixed(1));
}
