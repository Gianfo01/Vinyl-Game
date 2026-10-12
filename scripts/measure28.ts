// Medição da fase 0 da R28 (docs/medicao28.md). Só mede — não muda a simulação.
// Uso: npx tsx scripts/measure28.ts long [--seed m28-long] [--start 1962] [--end 2040] [--cap 90] [--out arq.jsonl]
//      npx tsx scripts/measure28.ts legib [--seeds 8] [--years 5] [--starts 1889,1955,1975,2005] [--db medium]
//      npx tsx scripts/measure28.ts echoes   (só 3a, no estado inicial de 1962)
// legib: 3a ecos com rótulo "provável" errado; 3b calibração da faixa da previsão (≥ 300 lançamentos);
//        3c opções sem dica nem "Agora" entre os 120 eventos mais sorteados.
// long: partida headless com o bot equilibrado (playbot16) de 1962 a 2040; a cada 5 anos de jogo grava CPU por mês,
//       tamanho do save (JSON.stringify do estado) e contagens de atos/pessoas/lançamentos/fatos. Se a partida acabar
//       (quebra) liga o sandbox e segue só o mundo, marcado como `ended`.
import { appendFileSync } from 'node:fs';
import { defaultConfig } from '../src/sim/bot';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { facts17 } from '../src/sim/facts17';
import type { GameState } from '../src/sim/types';
import { conseq18, conseqKeys18, echoP18, evKey18, ownConseq18 } from '../src/sim/decide18';
import { EVENTS } from '../src/sim/events';
import { registerSimHook } from '../src/sim/ext4';
import { EXPLAIN_WEEKS } from '../src/sim/sys/explain8';
import { playerActs, staffCount } from '../src/sim/util';

const args = process.argv.slice(2);
const arg = (k: string, d: string): string => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const cpuMs = (c0: NodeJS.CpuUsage): number => { const d = process.cpuUsage(c0); return (d.user + d.system) / 1000; };

function counts(s: GameState): Record<string, number> {
  const f = facts17(s);
  return {
    acts: Object.keys(s.acts).length,
    persons: Object.keys(s.persons).length,
    releases: Object.keys(s.releases).length,
    factsRing: f.f.length,
    factsSeq: f.seq,
  };
}

function long(): void {
  const seed = arg('seed', 'm28-long'), start = Number(arg('start', '1962')), end = Number(arg('end', '2040'));
  const out = arg('out', '');
  const capMin = Number(arg('cap', '90'));
  const s = createGame(defaultConfig(seed, { startYear: start, bandGenre: 'rnr', bandName: 'Banda Teste' }));
  const t0 = Date.now();
  let win = { cpu: 0, months: 0, maxMs: 0 };
  let endedAt: string | undefined;
  const sample = (): void => {
    const json = JSON.stringify(s);
    const row = {
      year: s.year, month: s.month, ...counts(s),
      saveKB: Math.round(Buffer.byteLength(json) / 1024),
      cpuMsPerMonth: win.months ? Math.round(win.cpu / win.months) : 0,
      maxMonthMs: Math.round(win.maxMs),
      cash: Math.round(s.player.cash), ended: endedAt ?? null,
      wallMin: +((Date.now() - t0) / 60000).toFixed(1),
      heapMB: Math.round(process.memoryUsage().heapUsed / 1048576),
    };
    console.log(JSON.stringify(row));
    if (out) appendFileSync(out, JSON.stringify(row) + '\n');
    win = { cpu: 0, months: 0, maxMs: 0 };
  };
  sample();
  let lastSampleYear = s.year;
  while (s.year < end || (s.year === end && s.month < 12)) {
    if ((Date.now() - t0) / 60000 > capMin) { console.log(`CORTE: ${capMin} min atingidos em ${s.year}-${s.month}`); break; }
    const c0 = process.cpuUsage();
    if (!s.ended) playMonth(s, 'balanced');
    else if (!endedAt) { endedAt = `${s.ended.ending}@${s.year}-${s.month}`; s.flags.sandbox = true; console.log(`fim da partida: ${endedAt} — segue em sandbox`); }
    const y0 = s.year, m0 = s.month;
    advanceMonth(s);
    if (s.year === y0 && s.month === m0) { console.log(`relógio parado em ${y0}-${m0}`); break; }
    const ms = cpuMs(c0);
    win.cpu += ms; win.months++; win.maxMs = Math.max(win.maxMs, ms);
    if (s.ended && !endedAt) { endedAt = `${s.ended.ending}@${s.year}-${s.month}`; s.flags.sandbox = true; console.log(`fim da partida: ${endedAt} — segue em sandbox`); }
    if (s.month === 1 && s.year - lastSampleYear >= 5) { sample(); lastSampleYear = s.year; }
  }
  sample();
}

// ---------------------------------------------------------------- legibilidade (3a, 3b, 3c)

/** 3a: ecos cujo rótulo "Depois" (UI: fuzzy18(número ou 0,5)) é mais otimista que a chance real (echoP18). */
function echoes(states: GameState[]): void {
  const rank = (p: number): number => (p >= 0.75 ? 3 : p >= 0.5 ? 2 : p >= 0.3 ? 1 : 0);
  const NAMES = ['improvável', 'pode acontecer', 'provável', 'quase certo'];
  const keys = new Set<string>();
  for (const ev of EVENTS) for (const o of ev.options) keys.add(evKey18(ev.id, o.id));
  for (const k of conseqKeys18()) if (k.startsWith('ev:')) keys.add(k);
  for (const [i, s] of states.entries()) {
    const act = playerActs(s).map((id) => s.acts[id]).find(Boolean);
    const ctx = { act: act?.id ?? '', person: act?.members[0] ?? '' };
    let total = 0, fnP = 0, numP = 0, showLikely = 0, wrongLikely = 0, wrongAny = 0, own = 0, ownWrong = 0, defFn = 0, defWrong = 0, ownFn = 0, ownFnWrong = 0, throws = 0;
    const realOfWrong: Record<string, number> = {};
    for (const k of keys) {
      const c = conseq18(k);
      if (!c?.later?.length) continue;
      const hand = !!ownConseq18(k);
      for (const e of c.later) {
        total++;
        if (hand) own++;
        if (typeof e.p === 'number') numP++; else { fnP++; if (hand) ownFn++; else defFn++; try { e.p(s, ctx); } catch { throws++; } }
        const shown = rank(typeof e.p === 'number' ? e.p : 0.5);
        const real = rank(echoP18(s, e, ctx));
        if (shown === 2) showLikely++;
        if (shown > real) { wrongAny++; if (hand) ownWrong++; }
        if (shown === 2 && real < 2 && typeof e.p !== 'number') { if (hand) ownFnWrong++; else defWrong++; }
        if (shown === 2 && real < 2) { wrongLikely++; realOfWrong[NAMES[real]] = (realOfWrong[NAMES[real]] ?? 0) + 1; }
      }
    }
    console.log(JSON.stringify({ estado: i, ano: s.year, rep: s.player.reputation, keys: keys.size, ecos: total, comChanceFuncao: fnP, comChanceNumero: numP,
      mostraProvavel: showLikely, provavelMasMenos: wrongLikely, realDosErrados: realOfWrong, rotuloOtimistaQualquer: wrongAny, escritosAMao: own, escritosAMaoOtimistas: ownWrong, padraoComFuncao: defFn, padraoErrados: defWrong, maoComFuncao: ownFn, maoComFuncaoErrados: ownFnWrong, pLancouErro: throws }));
  }
}

interface FcRow { id: string; year: number; fc: number; w: number; sold: number; short: number }
interface Drawn { n: number; opts: { id: string; hint: boolean; now: boolean }[] }

/** 3b + 3c: partidas do bot equilibrado; previsão × procura real (10 semanas) e eventos sorteados. */
function botRuns(): { fc: FcRow[]; drawn: Record<string, Drawn>; perRun: Record<string, Drawn>[]; ends: GameState[] } {
  const seeds = Number(arg('seeds', '8')), years = Number(arg('years', '5'));
  const starts = arg('starts', '1889,1955,1975,2005').split(',').map(Number);
  const db = arg('db', 'medium') as 'medium';
  const fc: FcRow[] = [];
  const seen = new Set<string>();
  // gancho só de medição (não altera estado): grava a previsão e a procura real quando o lançamento faz 10 semanas
  registerSimHook('week', 'measure28', (s) => {
    for (const actId of playerActs(s)) {
      const act = s.acts[actId];
      for (const id of act?.releases.slice(-8) ?? []) {
        const rel = s.releases[id];
        if (!rel || rel.fc === undefined || seen.has(rel.id)) continue;
        if (s.week - rel.week < EXPLAIN_WEEKS) continue;
        seen.add(rel.id);
        const w = (staffCount(s, 'analyst') ? 0.35 : 0.6) * (s.config.difficulty === 'hard' ? 1.3 : s.config.difficulty === 'easy' ? 0.8 : 1);
        fc.push({ id: rel.id, year: rel.year, fc: rel.fc, w, sold: rel.fa ?? rel.totalUnits, short: rel.shortage });
      }
    }
  });
  const drawn: Record<string, Drawn> = {};
  const perRun: Record<string, Drawn>[] = [];
  const ends: GameState[] = [];
  for (let i = 0; i < seeds; i++) {
    const start = starts[i % starts.length];
    const s = createGame(defaultConfig(`m28-${i}`, { startYear: start, bandGenre: 'rnr', bandName: 'Banda Teste', dbSize: db }));
    const mine: Record<string, Drawn> = {};
    const dec = new Set<string>();
    const t0 = Date.now();
    for (let m = 0; m < years * 12 && !s.ended; m++) {
      for (const d of s.decisions) {
        if (dec.has(d.id)) continue;
        dec.add(d.id);
        for (const T of [drawn, mine]) {
          const x = (T[d.eventId] ??= { n: 0, opts: d.options.map((o) => { const c = conseq18(evKey18(d.eventId, o.id)); return { id: o.id, hint: !!o.hint, now: !!c?.now }; }) });
          x.n++;
        }
      }
      playMonth(s, 'balanced');
      advanceMonth(s);
    }
    perRun.push(mine);
    ends.push(s);
    console.error(`  partida m28-${i} ${start}: ${s.year} ${s.ended ? 'FIM ' + s.ended.ending : 'ok'} · lançamentos medidos ${fc.length} · eventos ${Object.keys(mine).length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  return { fc, drawn, perRun, ends };
}

function legib(): void {
  const t0 = Date.now();
  const fresh = createGame(defaultConfig('m28-ech', { startYear: 1962, bandGenre: 'rnr', bandName: 'Banda Teste' }));
  const { fc, drawn, perRun, ends } = botRuns();
  console.log('\n=== 3a ecos (estado inicial 1962 e estados finais das partidas) ===');
  echoes([fresh, ...ends]);
  console.log('\n=== 3b calibração da previsão ===');
  const inside = (r: FcRow, v: number) => v >= Math.round(r.fc * (1 - r.w * 0.6)) && v <= Math.round(r.fc * (1 + r.w));
  const n = fc.length;
  const inSold = fc.filter((r) => inside(r, r.sold)).length;
  const inDem = fc.filter((r) => inside(r, r.sold + r.short)).length;
  const below = fc.filter((r) => r.sold + r.short < Math.round(r.fc * (1 - r.w * 0.6))).length;
  const above = fc.filter((r) => r.sold + r.short > Math.round(r.fc * (1 + r.w))).length;
  const ratios = fc.filter((r) => r.fc > 0).map((r) => (r.sold + r.short) / r.fc).sort((a, b) => a - b);
  const q = (p: number) => ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))] ?? 0;
  const short = fc.filter((r) => r.short > 0);
  console.log(JSON.stringify({ lancamentos: n, dentroVendido: inSold, pctVendido: +(inSold / n * 100).toFixed(1), dentroProcura: inDem, pctProcura: +(inDem / n * 100).toFixed(1),
    abaixo: below, acima: above, razaoProcuraPrevisao_p10_p50_p90: [q(0.1), q(0.5), q(0.9)].map((x) => +x.toFixed(2)),
    comFaltaDeEstoque: short.length, faltaMediana: short.length ? short.map((r) => r.short).sort((a, b) => a - b)[Math.floor(short.length / 2)] : 0, faltaMax: Math.max(0, ...fc.map((r) => r.short)) }));
  console.log('\n=== 3c eventos sorteados sem dica nem "Agora" ===');
  const top = (T: Record<string, Drawn>, k: number) => Object.entries(T).sort((a, b) => b[1].n - a[1].n).slice(0, k);
  const share = (rows: [string, Drawn][]) => {
    let o = 0, bare = 0, wo = 0, wbare = 0;
    for (const [, d] of rows) for (const x of d.opts) { o++; wo += d.n; if (!x.hint && !x.now) { bare++; wbare += d.n; } }
    return { eventos: rows.length, opcoes: o, semDicaNemAgora: bare, pct: +(bare / Math.max(1, o) * 100).toFixed(1), pctPonderadoPorSorteio: +(wbare / Math.max(1, wo) * 100).toFixed(1) };
  };
  console.log(JSON.stringify({ todasAsPartidas_top120: share(top(drawn, 120)), distintos: Object.keys(drawn).length, sorteios: Object.values(drawn).reduce((t, d) => t + d.n, 0) }));
  for (const [i, T] of perRun.entries()) console.log(JSON.stringify({ partida: i, top120: share(top(T, 120)) }));
  console.log(`\n(${((Date.now() - t0) / 60000).toFixed(1)} min)`);
}

function main(): void {
  const mode = args[0] ?? 'long';
  if (mode === 'long') return long();
  if (mode === 'legib') return legib();
  if (mode === 'echoes') return echoes([createGame(defaultConfig('m28-ech', { startYear: 1962, bandGenre: 'rnr', bandName: 'Banda Teste' }))]);
  console.log(`modo desconhecido: ${mode}`);
}

main();
