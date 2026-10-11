// Rodada 19 — lote de equilíbrio rápido e paralelo com o bot realista (playbot16) + bots adversários (caça a exploits).
// Uso: npm run balance -- [--seeds 6] [--years 5] [--starts 1889,1955,1975,2005] [--bots balanced,cautious,aggressive,artist]
//                         [--adv all|none|spam,loans,...] [--grid] [--jobs N] [--json out.json]
// Por padrão cada semente usa um início (rodízio pelos --starts): 6 sementes = 1889,1955,1975,2005,1889,1955 — todos os
// perfis jogam exatamente as mesmas (semente, início), então a comparação adversário × equilibrado é pareada.
// --grid cruza todas as sementes com todos os inícios (N × 4 partidas por perfil; bem mais lento).
// Um processo filho por núcleo (fila de partidas); cada partida roda inteira dentro de um filho.

import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ADV19, BASE19, START19, exploit19, runBot19, summarize19, type Bot19, type Row19, type Sum19 } from '../src/sim/balance19';

interface Job { bot: Bot19; start: number; seed: string; years: number }

if (process.argv.includes('--worker')) {
  process.on('message', (j: Job) => {
    let row: Row19 | { err: string; job: Job };
    try { row = runBot19(j); } catch (e) { row = { err: String((e as Error)?.stack ?? e).slice(0, 600), job: j }; }
    process.send!(row);
  });
} else main();

function main(): void {
  const args = process.argv.slice(2);
  const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const seeds = Number(arg('seeds', '6')), years = Number(arg('years', '5'));
  const starts = arg('starts', START19.join(',')).split(',').map(Number);
  const bots = arg('bots', BASE19.join(',')).split(',') as Bot19[];
  const advA = arg('adv', 'all');
  const adv = advA === 'none' ? [] : advA === 'all' ? ADV19.map((a) => a.id) : (advA.split(',') as Bot19[]);
  const grid = args.includes('--grid');
  const nJobs = Number(arg('jobs', String(Math.max(1, cpus().length))));
  const all: Bot19[] = [...new Set([...bots, ...(adv.length ? ['balanced' as Bot19] : []), ...adv])];
  const pairs: { seed: string; start: number }[] = [];
  for (let i = 0; i < seeds; i++) {
    if (grid) for (const st of starts) pairs.push({ seed: `b19-${i}`, start: st });
    else pairs.push({ seed: `b19-${i}`, start: starts[i % starts.length] });
  }
  // partidas mais lentas (inícios tardios) primeiro: a fila termina mais junta
  const queue: Job[] = all.flatMap((bot) => pairs.map((p) => ({ bot, years, ...p }))).sort((a, b) => b.start - a.start);
  const total = queue.length;
  const rows: Row19[] = [];
  const t0 = Date.now();
  console.log(`balance19: ${total} partidas (${all.length} bots × ${pairs.length}), ${years} anos, ${nJobs} processos`);
  const self = fileURLToPath(import.meta.url);
  let live = 0, spawned = 0;
  const done = () => report(rows, all, adv, bots, (Date.now() - t0) / 1000, arg('json', ''));
  // um filho que morre (memória, sinal) não derruba o lote: a partida é contada como erro e outro filho assume a fila
  const spawn = (): void => {
    const w = fork(self, ['--worker'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], execArgv: [...process.execArgv, '--max-old-space-size=3072'] });
    live++; spawned++;
    let cur: Job | undefined, over = false;
    const next = () => { cur = queue.shift(); if (cur) w.send(cur); else { over = true; w.kill(); } };
    w.on('message', (r: Row19 | { err: string; job: Job }) => {
      if ('err' in r) console.log(`  ERRO ${r.job.bot} ${r.job.seed} ${r.job.start}: ${r.err}`);
      else { rows.push(r); process.stdout.write(`  [${rows.length}/${total}] ${r.bot} ${r.start} ${r.seed}: ${r.bankrupt ? 'QUEBROU ' + r.endYear : 'ok'} patrimônio ${k$(r.worth)} (${(r.ms / 1000).toFixed(0)}s)\n`); }
      next();
    });
    w.on('exit', (code, sig) => {
      live--;
      if (!over && cur) { console.log(`  ERRO filho morreu (${code ?? sig}) em ${cur.bot} ${cur.seed} ${cur.start}`); if (spawned < nJobs * 4 && queue.length) spawn(); }
      if (live === 0) done();
    });
    next();
  };
  for (let k = 0; k < Math.min(nJobs, total); k++) spawn();
}

const k$ = (v: number): string => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}k`);
const pc = (x: number): string => `${Math.round(x * 100)}%`;

function report(rows: Row19[], all: Bot19[], adv: Bot19[], bots: Bot19[], secs: number, json: string): void {
  const sums: Record<string, Sum19> = {};
  for (const b of all) { const rs = rows.filter((r) => r.bot === b); if (rs.length) sums[b] = summarize19(rs); }
  const head = 'perfil       n  quebra  caixa p25/med/p75 (US$ 2020)   líquido  patrimônio  fama prest  nº1 escând mortes ecos';
  const line = (x: Sum19) => `${x.bot.padEnd(11)} ${String(x.n).padStart(2)}  ${pc(x.bankrupt).padStart(5)}  ${`${k$(x.cash[0])} / ${k$(x.cash[1])} / ${k$(x.cash[2])}`.padEnd(29)} ${k$(x.liquid[1]).padStart(7)}  ${k$(x.worth[1]).padStart(10)}  ${String(x.fame).padStart(4)} ${String(x.prestige).padStart(5)}  ${String(x.no1).padStart(3)} ${String(x.scandals).padStart(6)} ${String(x.deaths).padStart(6)} ${String(x.echoes).padStart(4)}`;
  console.log(`\n=== Perfis (bot realista playbot16) ===\n${head}`);
  for (const b of bots) if (sums[b]) console.log(line(sums[b]));
  const base = sums.balanced;
  const out: { id: string; ratio: number; flag: boolean; cash: boolean; cratio: number }[] = [];
  if (adv.length && base) {
    console.log(`\n=== Adversários (EXPLOIT = patrimônio mediano ≥ 2× equilibrado e +US$ 50k; caixa! = líquido ≥ 2× e +US$ 100k; sem quebrar mais) ===\n${head}  ações  ×patr ×líq`);
    for (const a of adv) {
      const x = sums[a];
      if (!x) continue;
      const e = exploit19(x, base);
      out.push({ id: a, ...e });
      console.log(`${line(x)}  ${String(x.moves).padStart(5)}  ${String(e.ratio).padStart(4)} ${String(e.cratio).padStart(4)}${e.flag ? '  << EXPLOIT' : e.cash ? '  < caixa!' : ''}`);
    }
    const ex = out.filter((x) => x.flag).map((x) => x.id);
    console.log(ex.length ? `\nEXPLOITS: ${ex.join(', ')}` : '\nNenhum exploit acima da margem.');
  }
  console.log(`\nTempo total ${secs.toFixed(0)}s`);
  if (json) writeFileSync(json, JSON.stringify({ rows, sums, exploits: out }, null, 1));
}
