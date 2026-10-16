// R31 (W0-BASE) — medição de referência reproduzível, sem interface. Joga partidas com o robô realista
// (playbot16.playMonth + tick.advanceMonth, igual ao lote do balance19) para sementes e eras fixas e mede:
//   desempenho  tempo de criar a partida, tempo por mês virado (média, mediana, p90, máx.), custo de serializar
//   save        tamanho do save pelo MESMO caminho do jogo (core/save20.encodeSave20 = o JSON que ui/store.saveGame grava,
//               e o gzip dele, como o CompressionStream('gzip') do navegador), nº de chaves em s.x4 e as maiores
//   balanço     caixa (nominal e US$ 2020), patrimônio (balance19.worth19), fama, reputação, nº de atos do jogador,
//               receita anual (player.revenueByYear e DRE r18), nº 1, fim de jogo — por ano jogado
//
// Uso:  npx tsx scripts/r31/measure.ts [--seeds 4] [--starts 1900,1955,1990,2012,2030] [--months 36]
//                                      [--jobs N] [--out docs/r31/base30] [--label "versão 30"] [--compare antigo.json]
//   Grava <out>.json (tudo) e <out>.md (tabelas). Os números de JOGO (bloco `game` e `save`) são determinísticos;
//   só o bloco `perf` varia entre execuções. --compare confere os números de jogo contra outro JSON (sai com erro se
//   diferirem). Cada partida roda inteira num processo filho (fila; --jobs 1 = sem concorrência, tempos mais limpos).
//   O resumo da UI (scripts/r31/measure-ui.mjs) é anexado ao .md por aquele script, entre marcadores próprios.

import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

type Num = number;
export interface Job { seed: string; start: number; months: number }
export interface Year30 { year: number; cash: Num; cashReal: Num; acts: Num; fame: Num; revenue: Num; revenueReal: Num; finRev: Num; finNet: Num }
export interface Res30 {
  seed: string; start: number; months: number;
  game: {
    endYear: Num; endMonth: Num; monthsPlayed: Num; ended: string | null;
    cash: Num; cashReal: Num; worthReal: Num; liquidReal: Num; debt: Num;
    fame: Num; repArtistic: Num; repCommercial: Num; acts: Num; songs: Num; releases: Num; number1s: Num;
    revenueLastYear: Num; revenueLastYearReal: Num;
    persons: Num; worldActs: Num; labels: Num; ledger: Num;
    years: Year30[];
  };
  save: { jsonBytes: Num; gzipBytes: Num; x4Keys: Num; x4Top: [string, Num][] };
  /** ms de relógio (performance.now) e ms de CPU do processo (process.cpuUsage: user+system; menos sensível a máquina carregada) */
  perf: { createMs: Num; monthMs: { mean: Num; median: Num; p90: Num; max: Num }; cpuMonthMs: { mean: Num; median: Num }; perMonth: Num[]; cpuPerMonth: Num[]; stringifyMs: Num; gzipMs: Num };
}

const here = dirname0(fileURLToPath(import.meta.url));
function dirname0(p: string): string { return p.slice(0, p.lastIndexOf('/')); }
const ROOT = `${here}/../..`;

// ---------------------------------------------------------------- uma partida (no filho)

async function runOne(j: Job): Promise<Res30> {
  const { defaultConfig } = await import('../../src/sim/bot');
  const { createGame } = await import('../../src/sim/worldgen');
  const { playMonth } = await import('../../src/sim/playbot16');
  const { advanceMonth } = await import('../../src/sim/tick');
  const { encodeSave20 } = await import('../../src/core/save20');
  const { toReal } = await import('../../src/core/money');
  const { playerActs } = await import('../../src/sim/util');
  const { playerFame } = await import('../../src/sim/sys/love17');
  const { worth19 } = await import('../../src/sim/balance19');
  const { ownerOf } = await import('../../src/sim/sys/people/owner');
  const { fin18, sumP18, netProfit18 } = await import('../../src/sim/ledger18');

  const t0 = performance.now();
  // mesma configuração do lote balance19 (selo, rock, base padrão do jogo)
  const s = createGame(defaultConfig(j.seed, { startYear: j.start, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
  const createMs = performance.now() - t0;
  // R31 onda 3: interruptores pela variável R31_SW ("id=valor,id2=valor") para medir regra ligada/desligada
  if (process.env.R31_SW) {
    const { setSw, switchDef } = await import('../../src/sim/r31/switches');
    for (const kv of process.env.R31_SW.split(',')) {
      const [id, raw] = kv.split('=');
      const d = switchDef(id);
      if (!d) throw new Error(`R31_SW: interruptor desconhecido ${id}`);
      setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
    }
  }
  const w0 = ownerOf(s).wealth;
  const per: number[] = [], cpu: number[] = [];
  const years: Year30[] = [];
  const r0 = (x: number) => Math.round(x);
  const snap = (): Year30 => {
    const y = s.year - (s.month === 0 ? 1 : 0); // ano que acabou de fechar (após 12 meses o relógio está em janeiro)
    const f = fin18(s).y[y];
    const rev = s.player.revenueByYear?.[y] ?? 0;
    return { year: y, cash: r0(s.player.cash), cashReal: r0(toReal(s.player.cash, s.year)), acts: playerActs(s).length, fame: r0(playerFame(s)),
      revenue: r0(rev), revenueReal: r0(toReal(rev, y)), finRev: r0(sumP18(f, 'rev:')), finNet: r0(netProfit18(f)) };
  };
  let m = 0;
  for (; m < j.months && !s.ended; m++) {
    const t = performance.now(), c = process.cpuUsage();
    playMonth(s, 'balanced');
    advanceMonth(s);
    per.push(performance.now() - t);
    const dc = process.cpuUsage(c);
    cpu.push((dc.user + dc.system) / 1000);
    if ((m + 1) % 12 === 0) years.push(snap());
  }
  // save: o mesmo texto que ui/store.saveGame grava (encodeSave20) e o gzip dele
  const ts = performance.now();
  const json = encodeSave20(s);
  const stringifyMs = performance.now() - ts;
  const tg = performance.now();
  const gz = gzipSync(Buffer.from(json, 'utf8'));
  const gzipMs = performance.now() - tg;
  const x4 = ((s as unknown as { x4?: Record<string, unknown> }).x4) ?? {};
  const x4Top = Object.entries(x4).map(([k, v]) => [k, Buffer.byteLength(JSON.stringify(v ?? null) ?? '', 'utf8')] as [string, number])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12);
  const sorted = [...per].sort((a, b) => a - b);
  const q = (p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p + 0.5))] : 0;
  const debt = s.player.loans.reduce((t, x) => t + x.balance, 0);
  const lastY = s.year - 1;
  const revLY = s.player.revenueByYear?.[lastY] ?? 0;
  const acts = playerActs(s);
  const songs = acts.reduce((t, id) => t + (s.acts[id]?.songs?.length ?? 0), 0);
  const rel = (s as unknown as { releases?: Record<string, { actId?: string }> | { actId?: string }[] }).releases;
  const relList = Array.isArray(rel) ? rel : Object.values(rel ?? {});
  return {
    seed: j.seed, start: j.start, months: j.months,
    game: {
      endYear: s.year, endMonth: s.month, monthsPlayed: m, ended: s.ended?.ending ?? null,
      cash: r0(s.player.cash), cashReal: r0(toReal(s.player.cash, s.year)), worthReal: worth19(s, w0), liquidReal: worth19(s, w0, true), debt: r0(debt),
      fame: r0(playerFame(s)), repArtistic: r0(s.player.reputation.artistic), repCommercial: r0(s.player.reputation.commercial),
      acts: acts.length, songs, releases: relList.filter((r) => r && acts.includes(r.actId ?? '')).length, number1s: s.player.stats.number1s,
      revenueLastYear: r0(revLY), revenueLastYearReal: r0(toReal(revLY, lastY)),
      persons: Object.keys(s.persons ?? {}).length, worldActs: Object.keys(s.acts).length, labels: Object.keys(s.labels ?? {}).length, ledger: s.player.ledger?.length ?? 0,
      years,
    },
    save: { jsonBytes: Buffer.byteLength(json, 'utf8'), gzipBytes: gz.length, x4Keys: Object.keys(x4).length, x4Top },
    perf: {
      createMs: Math.round(createMs),
      monthMs: { mean: Math.round(per.reduce((a, b) => a + b, 0) / Math.max(1, per.length)), median: Math.round(q(0.5)), p90: Math.round(q(0.9)), max: Math.round(sorted.at(-1) ?? 0) },
      cpuMonthMs: { mean: Math.round(cpu.reduce((a, b) => a + b, 0) / Math.max(1, cpu.length)), median: med(cpu) },
      perMonth: per.map((x) => Math.round(x)), cpuPerMonth: cpu.map((x) => Math.round(x)), stringifyMs: Math.round(stringifyMs), gzipMs: Math.round(gzipMs),
    },
  };
}

if (process.argv.includes('--worker')) {
  process.on('message', (j: Job) => {
    runOne(j).then((r) => process.send!({ ok: r }), (e) => process.send!({ err: String((e as Error)?.stack ?? e).slice(0, 800), job: j }));
  });
} else main().catch((e) => { console.error(e); process.exit(1); });

// ---------------------------------------------------------------- pai: fila, resumo, arquivos

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const nSeeds = Number(arg('seeds', '4'));
  const starts = arg('starts', '1900,1955,1990,2012,2030').split(',').map(Number);
  const months = Number(arg('months', '36'));
  const jobs = Math.max(1, Number(arg('jobs', String(Math.max(1, cpus().length)))));
  const out = arg('out', `${ROOT}/docs/r31/base30`);
  const label = arg('label', 'versão 30');
  const cmp = arg('compare', '');
  const seeds = Array.from({ length: nSeeds }, (_, i) => `r31-base-${i}`);
  // partidas mais lentas (eras tardias) primeiro
  const queue: Job[] = starts.flatMap((start) => seeds.map((seed) => ({ seed, start, months }))).sort((a, b) => b.start - a.start);
  const total = queue.length;
  console.log(`measure r31: ${total} partidas (${nSeeds} sementes × ${starts.length} eras), ${months} meses, ${jobs} processos`);
  const t0 = Date.now();
  const res: Res30[] = [];
  const errs: string[] = [];
  const self = fileURLToPath(import.meta.url);
  await new Promise<void>((done) => {
    let live = 0;
    const spawn = () => {
      const w = fork(self, ['--worker'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], execArgv: [...process.execArgv, '--max-old-space-size=4096'] });
      live++;
      let cur: Job | undefined;
      const next = () => { cur = queue.shift(); if (cur) w.send(cur); else w.kill(); };
      w.on('message', (msg: { ok?: Res30; err?: string; job?: Job }) => {
        if (msg.ok) { res.push(msg.ok); console.log(`  [${res.length}/${total}] ${msg.ok.start} ${msg.ok.seed}: ${msg.ok.perf.monthMs.mean} ms/mês, save ${(msg.ok.save.jsonBytes / 1e6).toFixed(2)} MB`); }
        else { errs.push(`${msg.job?.start} ${msg.job?.seed}: ${msg.err}`); console.log(`  ERRO ${errs.at(-1)}`); }
        cur = undefined;
        next();
      });
      w.on('exit', (code) => {
        live--;
        if (cur) { errs.push(`${cur.start} ${cur.seed}: filho saiu (${code})`); console.log(`  ERRO ${errs.at(-1)}`); }
        if (live === 0) done();
      });
      next();
    };
    for (let k = 0; k < Math.min(jobs, total); k++) spawn();
  });
  res.sort((a, b) => a.start - b.start || (a.seed < b.seed ? -1 : 1));
  const meta = { label, generatedBy: 'scripts/r31/measure.ts', seeds, starts, months, jobs, cpus: cpus().length, cpu: cpus()[0]?.model ?? '', node: process.version, wallSec: Math.round((Date.now() - t0) / 1000), errors: errs };
  const doc = { meta, byEra: summarize(res, [...starts].sort((a, b) => a - b)), runs: res };
  writeFileSync(`${out}.json`, JSON.stringify(doc, null, 1) + '\n');
  writeMd(`${out}.md`, doc);
  console.log(`gravado ${out}.json e ${out}.md (${meta.wallSec}s)`);
  if (cmp) {
    const old = JSON.parse(readFileSync(cmp, 'utf8')) as { runs: Res30[] };
    const key = (r: Res30) => `${r.start}|${r.seed}`;
    const om = new Map(old.runs.map((r) => [key(r), JSON.stringify({ g: r.game, s: r.save })]));
    let diff = 0;
    for (const r of res) { const o = om.get(key(r)); if (o !== JSON.stringify({ g: r.game, s: r.save })) { diff++; console.log(`  DIFERENTE: ${key(r)}`); } }
    console.log(diff ? `Reprodutibilidade: ${diff} partida(s) diferente(s) de ${cmp}` : `Reprodutibilidade: OK — números de jogo e save idênticos a ${cmp} (${res.length} partidas)`);
    if (diff) process.exitCode = 2;
  }
  if (errs.length) process.exitCode = 1;
}

const med = (xs: number[]): number => { if (!xs.length) return 0; const a = [...xs].sort((x, y) => x - y); const i = (a.length - 1) / 2; return Math.round((a[Math.floor(i)] + a[Math.ceil(i)]) / 2); };
const mean = (xs: number[]): number => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));

function summarize(res: Res30[], starts: number[]) {
  return starts.map((start) => {
    const rs = res.filter((r) => r.start === start);
    const all = rs.flatMap((r) => r.perf.perMonth);
    return {
      start, n: rs.length,
      msPerMonthMean: mean(all), msPerMonthMedian: med(all), cpuMsPerMonthMean: mean(rs.flatMap((r) => r.perf.cpuPerMonth)), createMsMean: mean(rs.map((r) => r.perf.createMs)),
      saveJsonBytesMedian: med(rs.map((r) => r.save.jsonBytes)), saveGzipBytesMedian: med(rs.map((r) => r.save.gzipBytes)),
      stringifyMsMean: mean(rs.map((r) => r.perf.stringifyMs)), x4Keys: med(rs.map((r) => r.save.x4Keys)),
      cashRealMedian: med(rs.map((r) => r.game.cashReal)), worthRealMedian: med(rs.map((r) => r.game.worthReal)),
      fameMedian: med(rs.map((r) => r.game.fame)), actsMedian: med(rs.map((r) => r.game.acts)),
      revenueLastYearRealMedian: med(rs.map((r) => r.game.revenueLastYearReal)), ended: rs.filter((r) => r.game.ended).length,
    };
  });
}

const fmtN = (x: number): string => Math.round(x).toLocaleString('pt-BR');
const fmtUS = (x: number): string => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(2).replace('.', ',')} mi` : `${fmtN(Math.round(x / 1000))} mil`);
const fmtMB = (b: number): string => `${(b / 1e6).toFixed(2).replace('.', ',')} MB`;

export const UI_MARK_A = '<!-- measure-ui:início -->';
export const UI_MARK_B = '<!-- measure-ui:fim -->';

function writeMd(path: string, doc: { meta: Record<string, unknown> & { seeds: string[]; starts: number[]; months: number; jobs: number; wallSec: number; cpu: string; cpus: number; node: string; errors: string[]; label: string }; byEra: ReturnType<typeof summarize>; runs: Res30[] }): void {
  const { meta, byEra, runs } = doc;
  const L: string[] = [];
  L.push(`# Medição de referência — ${meta.label} (W0-BASE)`, '');
  L.push(`Gerado por \`npx tsx scripts/r31/measure.ts\` (${meta.seeds.length} sementes × ${meta.starts.length} eras, ${meta.months} meses cada, robô \`playbot16\` perfil equilibrado, selo, rock, base padrão).`);
  L.push(`Sementes: ${meta.seeds.map((x) => `\`${x}\``).join(', ')}. Eras de início: ${meta.starts.join(', ')} (antes do rádio, LP, 1990, streaming, futuro).`);
  L.push(`Máquina: ${meta.cpu} (${meta.cpus} núcleos), Node ${meta.node}, ${meta.jobs} partidas em paralelo; tempo total ${meta.wallSec} s.`, '');
  L.push('Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado',
    '(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),',
    '"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).', '');
  if (meta.errors.length) L.push(`**Erros:** ${meta.errors.join('; ')}`, '');
  L.push('## Desempenho e save por era (medianas das sementes; tempos = média)', '');
  L.push('| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const e of byEra) L.push(`| ${e.start} | ${e.n} | ${fmtN(e.createMsMean)} | ${fmtN(e.msPerMonthMean)} | ${fmtN(e.msPerMonthMedian)} | ${fmtN(e.cpuMsPerMonthMean)} | ${fmtMB(e.saveJsonBytesMedian)} | ${fmtMB(e.saveGzipBytesMedian)} | ${fmtN(e.stringifyMsMean)} | ${e.x4Keys} |`);
  L.push('', '## Balanço por era (medianas das sementes, US$ de 2020)', '');
  L.push('| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const e of byEra) L.push(`| ${e.start} | ${fmtUS(e.cashRealMedian)} | ${fmtUS(e.worthRealMedian)} | ${e.fameMedian} | ${e.actsMedian} | ${fmtUS(e.revenueLastYearRealMedian)} | ${e.ended} |`);
  L.push('', '## Todas as partidas', '');
  L.push('| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |');
  L.push('|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|');
  for (const r of runs) {
    const g = r.game, p = r.perf.monthMs;
    const rev = g.years.map((y) => `${y.year}: ${fmtUS(y.revenueReal)}`).join(' · ') || '—';
    L.push(`| ${r.start} | \`${r.seed}\` | ${String(g.endMonth + 1).padStart(2, '0')}/${g.endYear} | ${p.mean}/${p.p90}/${p.max} | ${fmtMB(r.save.jsonBytes)} | ${fmtMB(r.save.gzipBytes)} | ${r.save.x4Keys} | ${fmtUS(g.cashReal)} | ${fmtUS(g.worthReal)} | ${g.fame} | ${g.repArtistic}/${g.repCommercial} | ${g.acts} | ${g.releases} | ${g.number1s} | ${rev} | ${g.ended ?? 'não'} |`);
  }
  // maiores chaves do x4 (agregado: mediana do tamanho por chave nas partidas da era mais tardia)
  const last = runs.filter((r) => r.start === Math.max(...meta.starts));
  const agg = new Map<string, number[]>();
  for (const r of last) for (const [k, v] of r.save.x4Top) (agg.get(k) ?? agg.set(k, []).get(k)!).push(v);
  if (agg.size) {
    L.push('', `## Maiores blocos de \`x4\` no save (era ${Math.max(...meta.starts)}, mediana em bytes)`, '');
    L.push('| Chave | Bytes |', '|---|---:|');
    for (const [k, v] of [...agg.entries()].map(([k, v]) => [k, med(v)] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 12)) L.push(`| \`${k}\` | ${fmtN(v)} |`);
  }
  L.push('', '## Como medir de novo', '',
    '```sh',
    'npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída',
    'npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade',
    'node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)',
    '```', '');
  // preserva a seção da interface (escrita pelo measure-ui.mjs)
  let ui = '';
  if (existsSync(path)) { const old = readFileSync(path, 'utf8'); const a = old.indexOf(UI_MARK_A), b = old.indexOf(UI_MARK_B); if (a >= 0 && b > a) ui = old.slice(a, b + UI_MARK_B.length); }
  writeFileSync(path, L.join('\n') + (ui ? `\n${ui}\n` : ''));
}
