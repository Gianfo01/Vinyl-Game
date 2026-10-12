// Rodada 23 — medição de balanceamento (não muda nada no jogo). Joga o bot por várias sementes, dificuldades e
// estratégias e mede: mês do 1º contrato, mês do 1º lançamento, sobrevivência, caixa em valor real, dívida,
// retorno do 1º ano e o maior compositor (para achar "atos fora da curva", ex.: 78 músicas em 4 anos).
// Uso: npx tsx scripts/balance23.ts [anos=5] [sementes=4]  → imprime tabela e grava docs/balance23.json
import { writeFileSync } from 'node:fs';
import { toReal } from '../src/core/money';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import type { GameState, RunConfig } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';

const YEARS = Number(process.argv[2] ?? 5);
const SEEDS = Number(process.argv[3] ?? 4);
type Row = { seed: string; diff: string; start: string; year0: number; firstSign: number | null; firstRelease: number | null; survived: boolean; months: number; cashReal0: number; cashReal: number; debtReal: number; releases: number; top10: number; maxSongs: number; maxSongsAct: string; ms: number };

function run(cfg: RunConfig): Row {
  const t = Date.now();
  const s: GameState = createGame(cfg);
  const cash0 = toReal(s.player.cash, s.year);
  let firstSign: number | null = null, firstRelease: number | null = null, m = 0;
  const signed0 = Object.values(s.acts).filter((a) => a.owner === 'player').length;
  for (; m < YEARS * 12 && !s.ended; m++) {
    botMonth(s);
    advanceMonth(s);
    if (firstSign === null && Object.values(s.acts).filter((a) => a.owner === 'player').length > signed0) firstSign = m + 1;
    if (firstRelease === null && s.player.stats.releases > 0) firstRelease = m + 1;
  }
  const debt = s.player.loans.reduce((x, l) => x + l.balance, 0);
  const top = Object.values(s.acts).sort((a, b) => b.songs.length - a.songs.length)[0];
  return { seed: cfg.seed, diff: cfg.difficulty, start: cfg.scenario, year0: cfg.startYear, firstSign, firstRelease, survived: !s.ended && s.player.cash > -debt, months: m,
    cashReal0: Math.round(cash0 / 100), cashReal: Math.round(toReal(s.player.cash, s.year) / 100), debtReal: Math.round(toReal(debt, s.year) / 100),
    releases: s.player.stats.releases, top10: s.player.stats.top10s, maxSongs: top?.songs.length ?? 0, maxSongsAct: `${top?.name} (${top?.owner ?? 'livre'})`, ms: Date.now() - t };
}

const rows: Row[] = [];
for (const diff of ['easy', 'normal', 'hard'] as const) for (const start of ['from_zero', 'emerging'] as const) for (let i = 0; i < SEEDS; i++) {
  const year = [1960, 1975, 1990, 2010][i % 4];
  const r = run(defaultConfig(`bal23-${diff}-${start}-${i}`, { difficulty: diff, scenario: start, startYear: year }));
  rows.push(r);
  console.log([r.diff, r.start, r.year0, `sign:${r.firstSign ?? '—'}`, `rel:${r.firstRelease ?? '—'}`, r.survived ? 'vivo' : 'QUEBROU', `caixa ${r.cashReal0}→${r.cashReal}`, `dívida ${r.debtReal}`, `lanç ${r.releases}`, `top10 ${r.top10}`, `maxSongs ${r.maxSongs} ${r.maxSongsAct}`, `${(r.ms / 1000).toFixed(1)}s`].join(' | '));
}
writeFileSync('docs/balance23.json', JSON.stringify({ years: YEARS, seeds: SEEDS, rows }, null, 1));
const by = (k: string) => rows.filter((r) => r.diff === k);
for (const k of ['easy', 'normal', 'hard']) { const xs = by(k); console.log(k, 'sobrevivência', `${xs.filter((r) => r.survived).length}/${xs.length}`, 'caixa real médio', Math.round(xs.reduce((a, r) => a + r.cashReal, 0) / xs.length)); }
