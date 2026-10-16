// R31 (onda 3 · Y) — "nº 1 da casa nos últimos 40 por país": quantos dos últimos 40 nº 1 de cada parada nacional
// (faixas e álbuns, a lista `ch7.no1` que o jogo guarda) são de artistas do próprio país. Joga partidas com o robô
// realista (playbot16 + advanceMonth, como scripts/r31/measure.ts) e mede no fim.
//
// Uso:  npx tsx scripts/r31/home-no1.ts [--seeds 2] [--start 1985] [--months 48] [--sw id=v,id=v] [--json saida.json]
//   --sw liga/desliga interruptores (src/sim/r31/switches.ts) logo depois de criar a partida (ex.: --sw y31.local=false).
//   Cada semente roda num processo filho (paralelo até --jobs, padrão 2).

import { fork } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const KEY_COUNTRIES = ['USA', 'GBR', 'BRA', 'JPN', 'DEU', 'FRA', 'ITA', 'CAN', 'AUS', 'NLD', 'SWE', 'MEX', 'KOR', 'IND', 'ESP', 'ARG'];
/** Referência histórica aproximada (fatia de nº 1 da casa nas paradas nacionais, anos 1980–2000; ver docs/r31/dy.md). */
export const REAL_HOME: Record<string, number> = { USA: 0.85, GBR: 0.6, BRA: 0.8, JPN: 0.9, DEU: 0.3, FRA: 0.55, ITA: 0.6, CAN: 0.15, AUS: 0.25, NLD: 0.2, SWE: 0.3, MEX: 0.7, KOR: 0.9, IND: 0.95, ESP: 0.45, ARG: 0.55 };

interface Job { seed: string; start: number; months: number; sw: Record<string, boolean | number | string> }
interface Out { seed: string; home: Record<string, [number, number]>; ms: number; playerNo1: number }

async function runOne(j: Job): Promise<Out> {
  const { defaultConfig } = await import('../../src/sim/bot');
  const { createGame } = await import('../../src/sim/worldgen');
  const { playMonth } = await import('../../src/sim/playbot16');
  const { advanceMonth } = await import('../../src/sim/tick');
  const { setSw } = await import('../../src/sim/r31/switches');
  const { ch7 } = await import('../../src/sim/sys/charts7');
  const { countryOfCity } = await import('../../src/data/geo');
  const t0 = performance.now();
  const s = createGame(defaultConfig(j.seed, { startYear: j.start, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
  for (const [k, v] of Object.entries(j.sw)) setSw(s, k, v);
  for (let m = 0; m < j.months && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const home: Record<string, [number, number]> = {};
  const no1 = ch7(s).no1;
  for (const a3 of KEY_COUNTRIES) {
    const list = (no1[a3] ?? []).slice(-40);
    let n = 0;
    for (const x of list) { const rel = s.releases[x.relId]; const act = rel ? s.acts[rel.actId] : undefined; if (act && countryOfCity(act.city) === a3) n++; }
    home[a3] = [n, list.length];
  }
  return { seed: j.seed, home, ms: Math.round(performance.now() - t0), playerNo1: s.player.stats.number1s };
}

function parseSw(x: string): Record<string, boolean | number | string> {
  const out: Record<string, boolean | number | string> = {};
  for (const kv of x.split(',').filter(Boolean)) { const [k, v] = kv.split('='); out[k] = v === 'true' ? true : v === 'false' ? false : Number.isFinite(Number(v)) ? Number(v) : v; }
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const nSeeds = Number(arg('seeds', '2')), start = Number(arg('start', '1985')), months = Number(arg('months', '48'));
  const jobs = Number(arg('jobs', '2')), sw = parseSw(arg('sw', '')), out = arg('json', '');
  const queue: Job[] = Array.from({ length: nSeeds }, (_, i) => ({ seed: `r31-no1-${i}`, start, months, sw }));
  const res: Out[] = [];
  const self = fileURLToPath(import.meta.url);
  let live = 0;
  await new Promise<void>((done) => {
    const spawn = () => {
      const w = fork(self, ['--worker'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], execArgv: [...process.execArgv, '--max-old-space-size=4096'] });
      live++;
      const next = () => { const j = queue.shift(); if (j) w.send(j); else w.kill(); };
      w.on('message', (m: { ok?: Out; err?: string }) => { if (m.ok) res.push(m.ok); else console.log('ERRO', m.err); next(); });
      w.on('exit', () => { if (--live === 0) done(); });
      next();
    };
    for (let k = 0; k < Math.min(jobs, nSeeds); k++) spawn();
  });
  res.sort((a, b) => (a.seed < b.seed ? -1 : 1));
  console.log(`nº 1 da casa nos últimos 40 (início ${start}, ${months} meses, ${res.length} sementes, interruptores ${JSON.stringify(sw)})`);
  console.log(`país | ${res.map((r) => r.seed).join(' | ')} | média | real`);
  const avg: Record<string, number> = {};
  for (const a3 of KEY_COUNTRIES) {
    const cells = res.map((r) => `${r.home[a3][0]}/${r.home[a3][1]}`);
    const fr = res.map((r) => (r.home[a3][1] ? r.home[a3][0] / r.home[a3][1] : 0));
    avg[a3] = fr.reduce((a, b) => a + b, 0) / Math.max(1, fr.length);
    console.log(`${a3} | ${cells.join(' | ')} | ${(avg[a3] * 100).toFixed(0)}% | ${(REAL_HOME[a3] * 100).toFixed(0)}%`);
  }
  const err = KEY_COUNTRIES.reduce((t, a3) => t + Math.abs(avg[a3] - REAL_HOME[a3]), 0) / KEY_COUNTRIES.length;
  console.log(`erro médio absoluto contra o histórico: ${(err * 100).toFixed(1)} pontos; nº 1 do jogador: ${res.map((r) => r.playerNo1).join(', ')}; tempo ${res.map((r) => Math.round(r.ms / 1000)).join('/')} s`);
  if (out) writeFileSync(out, JSON.stringify({ start, months, sw, res, avg, err }, null, 1) + '\n');
}

if (process.argv.includes('--worker')) {
  process.on('message', (j: Job) => { runOne(j).then((r) => process.send!({ ok: r }), (e) => process.send!({ err: String((e as Error)?.stack ?? e).slice(0, 800) })); });
} else main().catch((e) => { console.error(e); process.exit(1); });
