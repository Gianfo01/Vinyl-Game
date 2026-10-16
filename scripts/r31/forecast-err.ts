// R31 (onda 3 · D) — erro da previsão de vendas: para cada lançamento do jogador com previsão guardada (rel.fc, as 10
// primeiras semanas previstas no lançamento), compara com as 10 primeiras semanas vendidas. Robô realista (playbot16).
// Uso: npx tsx scripts/r31/forecast-err.ts [--seeds 3] [--start 2008] [--months 36] [--sw id=v,...]

async function one(seed: string, start: number, months: number, sw: Record<string, boolean | number>): Promise<number[]> {
  const { defaultConfig } = await import('../../src/sim/bot');
  const { createGame } = await import('../../src/sim/worldgen');
  const { playMonth } = await import('../../src/sim/playbot16');
  const { advanceMonth } = await import('../../src/sim/tick');
  const { setSw } = await import('../../src/sim/r31/switches');
  (globalThis as any).__dbg ??= [];
  const s = createGame(defaultConfig(seed, { startYear: start, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
  for (const [k, v] of Object.entries(sw)) setSw(s, k, v);
  for (let m = 0; m < months && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const out: number[] = [];
  let n0 = 0;
  for (const r of Object.values(s.releases)) {
    if (!(r.owner === 'player' || s.acts[r.actId]?.playerBand)) continue;
    n0++;
    if (!r.fc || r.fc < 20 || r.dem10 === undefined || s.week - r.week < 11) continue;
    out.push(r.dem10 / r.fc);
  }
  if (process.env.DBG) { const d = (globalThis as any).__dbg as number[][]; const g = (k: number) => Math.exp(d.reduce((t, x) => t + Math.log(x[k]), 0) / d.length); console.log("hooks", g(0).toFixed(2), "luck", g(1).toFixed(2), d.length); }
  if (process.env.DBG) for (const [k, v] of Object.entries((globalThis as any).__dbgF ?? {}) as [string, number[]][]) console.log(k, v.length, (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2));
  console.log(`${seed}: ${n0} lançamentos do jogador, ${out.length} medidos`);
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const sw: Record<string, boolean | number> = {};
  for (const kv of arg('sw', '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); sw[k] = v === 'true' ? true : v === 'false' ? false : Number(v); }
  const all: number[] = [];
  for (let i = 0; i < Number(arg('seeds', '3')); i++) all.push(...(await one(`r31-fc-${i}`, Number(arg('start', '2008')), Number(arg('months', '36')), sw)));
  all.sort((a, b) => a - b);
  const med = all.length ? all[Math.floor(all.length / 2)] : NaN;
  const gm = Math.exp(all.reduce((t, x) => t + Math.log(Math.max(1e-3, x)), 0) / Math.max(1, all.length));
  console.log(`lançamentos ${all.length} · real/previsto: mediana ${med.toFixed(2)} · média geométrica ${gm.toFixed(2)} · quartis ${all[Math.floor(all.length / 4)]?.toFixed(2)}–${all[Math.floor((3 * all.length) / 4)]?.toFixed(2)} · ${JSON.stringify(sw)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
