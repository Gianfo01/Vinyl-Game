// Rodada 19 — lote de equilíbrio rápido e paralelo com o bot realista (playbot16) + bots adversários (caça a exploits).
// Uso: npm run balance -- [--quick | --full] [--seeds 6] [--years 5] [--starts 1889,1955,1975,2005]
//                         [--bots balanced,cautious,aggressive,artist] [--adv all|none|spam,loans,...]
//                         [--db small|medium|large|huge] [--role label|artist|manager|publisher|studio|hybrid]
//                         [--careers label,manager,festival,...] [--grid] [--jobs N] [--det] [--tsx] [--json out.json]
//   --quick  6 sementes × 3 anos, só o equilibrado, sem adversários, base pequena (checagem de minutos → segundos)
//   --full   o lote completo: 4 perfis + 6 adversários, 6 sementes × 5 anos, base média (= sem flags)
//   --det    joga a 1ª partida duas vezes (em filhos diferentes) e confere se as linhas batem (determinismo)
//   --tsx    filhos carregam o TypeScript pelo tsx em vez do pacote pré-montado (mais lento para começar)
// Flags explícitas valem sobre as do modo (ex.: --quick --years 5 --db medium).
// Por padrão cada semente usa um início (rodízio pelos --starts): 6 sementes = 1889,1955,1975,2005,1889,1955 — todos os
// perfis jogam exatamente as mesmas (semente, início), então a comparação adversário × equilibrado é pareada.
// --grid cruza todas as sementes com todos os inícios (N × 4 partidas por perfil; bem mais lento).
// Um processo filho por núcleo (fila de partidas); cada partida roda inteira dentro de um filho. Os filhos carregam
// um pacote único montado com esbuild na hora (~1 s) em vez de transpilar ~400 módulos cada um pelo tsx (~3–4 s cada).

import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Bot19, Opts19, Row19, Sum19 } from '../src/sim/balance19';

type B19 = typeof import('../src/sim/balance19');

type Job = Opts19 & { dup?: boolean };
type Msg = (Row19 & { dup?: boolean; cpu?: number }) | { err: string; job: Job };
/** ms de CPU do processo desde c0 (o relógio de parede engana quando a máquina está carregada) */
const cpuMs = (c0: NodeJS.CpuUsage): number => { const d = process.cpuUsage(c0); return Math.round((d.user + d.system) / 1000); };

const here = dirname(fileURLToPath(import.meta.url));
let B: B19; // simulação carregada (pacote ou tsx)

if (process.argv.includes('--worker')) {
  void import('../src/sim/balance19').then(({ runBot19 }) => process.on('message', (j: Job) => {
    let row: Msg;
    const c0 = process.cpuUsage();
    try { row = { ...runBot19(j), dup: j.dup, cpu: cpuMs(c0) }; } catch (e) { row = { err: String((e as Error)?.stack ?? e).slice(0, 600), job: j }; }
    process.send!(row);
  }));
} else main().catch((e) => { console.error(e); process.exit(1); });

/** Monta o filho num único .mjs (esbuild). Mesmo código, mesma ordem de módulos; null = sem esbuild (cai no tsx). */
async function bundle(): Promise<string | null> {
  try {
    const esbuild = await import('esbuild');
    const out = resolve(here, '../node_modules/.cache/balance19/worker.mjs');
    mkdirSync(dirname(out), { recursive: true });
    await esbuild.build({
      stdin: {
        contents: `import { runBot19 } from './src/sim/balance19';
export * from './src/sim/balance19';
if (process.send && process.argv.includes('--worker')) process.on('message', (j) => { let row; const c0 = process.cpuUsage(); try { row = { ...runBot19(j), dup: j.dup }; const d = process.cpuUsage(c0); row.cpu = Math.round((d.user + d.system) / 1000); } catch (e) { row = { err: String((e && e.stack) || e).slice(0, 600), job: j }; } process.send(row); });`,
        resolveDir: resolve(here, '..'), loader: 'ts', sourcefile: 'balance19-worker.ts',
      },
      bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: out, logLevel: 'error', sourcemap: false,
    });
    return out;
  } catch (e) {
    console.log(`  (sem pacote esbuild, filhos via tsx: ${String((e as Error)?.message ?? e).slice(0, 120)})`);
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // o pai também usa o pacote (constantes e resumo): evita transpilar a simulação inteira pelo tsx só para isso
  const worker = args.includes('--tsx') ? null : await bundle();
  const { ADV19, BASE19, START19 } = B = (worker ? await import(worker) : await import('../src/sim/balance19')) as B19;
  const quick = args.includes('--quick');
  const has = (k: string) => args.indexOf(`--${k}`) >= 0;
  const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const seeds = Number(arg('seeds', '6')), years = Number(arg('years', quick ? '3' : '5'));
  const starts = arg('starts', START19.join(',')).split(',').map(Number);
  const bots = arg('bots', quick ? 'balanced' : BASE19.join(',')).split(',') as Bot19[];
  const advA = arg('adv', quick ? 'none' : 'all');
  const adv = advA === 'none' ? [] : advA === 'all' ? ADV19.map((a) => a.id) : (advA.split(',') as Bot19[]);
  const db = arg('db', quick ? 'small' : '') as Opts19['db'] | '';
  const role = arg('role', '') as Opts19['role'] | '';
  const careers = has('careers') ? arg('careers', '').split(',').filter(Boolean) : undefined;
  const grid = args.includes('--grid'), det = args.includes('--det');
  const nJobs = Number(arg('jobs', String(Math.max(1, cpus().length))));
  const all: Bot19[] = [...new Set([...bots, ...(adv.length ? ['balanced' as Bot19] : []), ...adv])];
  const pairs: { seed: string; start: number }[] = [];
  for (let i = 0; i < seeds; i++) {
    if (grid) for (const st of starts) pairs.push({ seed: `b19-${i}`, start: st });
    else pairs.push({ seed: `b19-${i}`, start: starts[i % starts.length] });
  }
  const extra: Partial<Opts19> = {};
  if (db) extra.db = db;
  if (role) extra.role = role;
  if (careers) extra.careers = careers;
  // partidas mais lentas (inícios tardios) primeiro: a fila termina mais junta
  const queue: Job[] = all.flatMap((bot) => pairs.map((p) => ({ bot, years, ...p, ...extra }))).sort((a, b) => b.start - a.start);
  if (det && queue.length) queue.splice(Math.min(queue.length, nJobs - 1), 0, { ...queue[0], dup: true });
  const total = queue.length;
  const rows: Row19[] = [];
  let twin: Row19 | undefined;
  const t0 = Date.now();
  const opts = [db && `base ${db}`, role && `papel ${role}`, careers && `carreiras ${careers.join('+')}`].filter(Boolean).join(', ');
  console.log(`balance19${quick ? ' --quick' : ''}: ${total} partidas (${all.length} bots × ${pairs.length}${det ? ' + 1 repetida' : ''}), ${years} anos, ${nJobs} processos${opts ? `, ${opts}` : ''}`);
  const self = fileURLToPath(import.meta.url);
  let live = 0, spawned = 0;
  const done = () => report(rows, all, adv, bots, (Date.now() - t0) / 1000, arg('json', ''), twin);
  // um filho que morre (memória, sinal) não derruba o lote: a partida é contada como erro e outro filho assume a fila
  const spawn = (): void => {
    const heap = '--max-old-space-size=3072';
    const w = worker
      ? fork(worker, ['--worker'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], execArgv: [heap] })
      : fork(self, ['--worker'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], execArgv: [...process.execArgv, heap] });
    live++; spawned++;
    let cur: Job | undefined, over = false;
    const next = () => { cur = queue.shift(); if (cur) w.send(cur); else { over = true; w.kill(); } };
    w.on('message', (r: Msg) => {
      if ('err' in r) console.log(`  ERRO ${r.job.bot} ${r.job.seed} ${r.job.start}: ${r.err}`);
      else if (r.dup) { twin = r; console.log(`  [repetida] ${r.bot} ${r.start} ${r.seed} (${(r.ms / 1000).toFixed(0)}s)`); }
      else { delete r.dup; rows.push(r); process.stdout.write(`  [${rows.length}/${total - (det ? 1 : 0)}] ${r.bot} ${r.start} ${r.seed}: ${r.bankrupt ? 'QUEBROU ' + r.endYear : 'ok'} patrimônio ${k$(r.worth)} (${(r.ms / 1000).toFixed(0)}s${r.cpu ? `, CPU ${(r.cpu / 1000).toFixed(0)}s` : ''})\n`); }
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

function report(rows: Row19[], all: Bot19[], adv: Bot19[], bots: Bot19[], secs: number, json: string, twin?: Row19): void {
  const sums: Record<string, Sum19> = {};
  for (const b of all) { const rs = rows.filter((r) => r.bot === b); if (rs.length) sums[b] = B.summarize19(rs); }
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
      const e = B.exploit19(x, base);
      out.push({ id: a, ...e });
      console.log(`${line(x)}  ${String(x.moves).padStart(5)}  ${String(e.ratio).padStart(4)} ${String(e.cratio).padStart(4)}${e.flag ? '  << EXPLOIT' : e.cash ? '  < caixa!' : ''}`);
    }
    const ex = out.filter((x) => x.flag).map((x) => x.id);
    console.log(ex.length ? `\nEXPLOITS: ${ex.join(', ')}` : '\nNenhum exploit acima da margem.');
  }
  if (twin) {
    const strip = ({ ms: _ms, dup: _d, cpu: _c, ...r }: Row19 & { dup?: boolean; cpu?: number }) => JSON.stringify(r);
    const orig = rows.find((r) => r.bot === twin.bot && r.seed === twin.seed && r.start === twin.start);
    console.log(!orig ? '\nDeterminismo: partida original não terminou.' : strip(orig) === strip(twin) ? '\nDeterminismo: OK (partida repetida idêntica).' : `\nDeterminismo: DIFERENTE!\n  ${strip(orig)}\n  ${strip(twin)}`);
  }
  // tempo por ano de jogo, por início (onde o lote gasta)
  const by: Record<number, { ms: number; cpu: number; y: number }> = {};
  for (const r of rows as (Row19 & { cpu?: number })[]) { const b = (by[r.start] ??= { ms: 0, cpu: 0, y: 0 }); b.ms += r.ms; b.cpu += r.cpu ?? r.ms; b.y += Math.max(1 / 12, Math.min(r.years, r.endYear - r.start) || r.years); }
  const per = (f: (b: { ms: number; cpu: number; y: number }) => number) => Object.entries(by).map(([st, b]) => `${st} ${(f(b) / 1000 / b.y).toFixed(1)}s`).join(' · ');
  console.log(`\nPor ano de jogo — relógio: ${per((b) => b.ms)}\n                  CPU:     ${per((b) => b.cpu)}`);
  console.log(`Tempo total ${secs.toFixed(0)}s (CPU dos filhos ${(rows.reduce((t, r) => t + ((r as { cpu?: number }).cpu ?? 0), 0) / 1000).toFixed(0)}s)`);
  if (json) writeFileSync(json, JSON.stringify({ rows, sums, exploits: out }, null, 1));
}

