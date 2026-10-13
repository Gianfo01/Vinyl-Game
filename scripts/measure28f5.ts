// Rodada 28 (fase 5) — mede a contratação: taxa de assinatura, adiantamento médio e vitórias de rival.
// Não muda nada no jogo. Uso: npx tsx scripts/measure28f5.ts [anos=3] [sementes=4] [saida.json]
// Mesmo script roda antes/depois (git worktree do commit base) para comparar.
import { writeFileSync } from 'node:fs';
import { toReal } from '../src/core/money';
import { defaultConfig } from '../src/sim/bot';
import { playLog, playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { acceptOffer, defaultOffer, makeOffer, offerNow, resolveOffers } from '../src/sim/contracts';
import { scoutEligible20 } from '../src/sim/scout20';
import { rngOf } from '../src/sim/util';

// Sonda: no mês 9, para cada ato livre com fama > 10 (até 8), oferta padrão numa CÓPIA do estado —
// ao vivo (offerNow) e pelo fechamento do mês (makeOffer → resolveOffers). Conta quem fica com o ato.
type Probe = { live: Record<string, number>; live15: Record<string, number>; month: Record<string, number>; advLive: number[]; prom: { n: number; kept: number; broken: number; open: number; penaltyReal: number; owedReal: number; budgetReal: number } };
const probe: Probe = { live: {}, live15: {}, month: {}, advLive: [], prom: { n: 0, kept: 0, broken: 0, open: 0, penaltyReal: 0, owedReal: 0, budgetReal: 0 } };
function runProbe(s: GameState): void {
  const cands = Object.values(s.acts).filter((a) => !a.owner && a.fame > 10 && scoutEligible20(s, a).ok).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 8);
  for (const a of cands) {
    for (const mode of ['live', 'live15', 'month'] as const) {
      const c: GameState = structuredClone(s);
      const o = defaultOffer(c, c.acts[a.id]);
      if (mode === 'live15') o.advance = Math.round(o.advance * 1.5 / 100) * 100;
      c.player.cash = Math.max(c.player.cash, o.advance * 4);
      let res: string;
      if (mode !== 'month') {
        const x = offerNow(c, rngOf(c), o);
        res = x.result;
        if (res === 'accepted' && mode === 'live') probe.advLive.push(toReal(o.advance, c.year));
      } else {
        const off = makeOffer(c, o);
        if (!off) res = 'invalid';
        else { resolveOffers(c, rngOf(c)); res = off.status; }
      }
      const b = probe[mode];
      b[res] = (b[res] ?? 0) + 1;
    }
  }
}
// Sonda de promessas: assina (cópia) o ato livre mais famoso com fama ≤ 10 prometendo turnê + prioridade e segue
// 14 meses com o bot; conta cumpridas, quebradas e multas.
function promProbe(s: GameState): void {
  const a0 = Object.values(s.acts).filter((a) => !a.owner && a.fame <= 10 && a.fame > 2 && scoutEligible20(s, a).ok).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
  if (!a0) return;
  const c: GameState = structuredClone(s);
  const a = c.acts[a0.id];
  const o = { ...defaultOffer(c, a), promises: ['tour', 'priority'] as ('tour' | 'priority')[], id: 'o-prom', week: c.week, status: 'pending' as const };
  c.player.cash = Math.max(c.player.cash, o.advance * 3);
  acceptOffer(c, a, o);
  for (let m = 0; m < 14 && !c.ended; m++) { playMonth(c, 'balanced'); advanceMonth(c); }
  const k = c.contracts[a.contractId ?? ''];
  for (const p of k?.promises ?? []) {
    probe.prom.n++;
    if (p.kept === true) probe.prom.kept++; else if (p.kept === false) probe.prom.broken++; else probe.prom.open++;
    probe.prom.budgetReal += Math.round(toReal(p.budget ?? 0, c.year));
    probe.prom.penaltyReal += Math.round(toReal(p.paidPenalty ?? 0, c.year));
    probe.prom.owedReal += Math.round(toReal(p.owed28 ?? 0, c.year));
  }
}

// Sonda "promete e não cumpre": mesma assinatura (cópia), mas o jogador some — 14 meses só com o mundo andando,
// sem shows nem disco do ato. Mede quebras, multas pagas ao artista e o efeito na confiança e na reputação.
const broke = { n: 0, broken: 0, penaltyReal: 0, owedReal: 0, trust: 0, rep: 0, acts: 0 };
function breakProbe(s: GameState): void {
  const a0 = Object.values(s.acts).filter((a) => !a.owner && a.fame <= 10 && a.fame > 2 && scoutEligible20(s, a).ok).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
  if (!a0) return;
  const c: GameState = structuredClone(s);
  const a = c.acts[a0.id];
  const o = { ...defaultOffer(c, a), promises: ['tour', 'priority'] as ('tour' | 'priority')[], id: 'o-brk', week: c.week, status: 'pending' as const };
  c.player.cash = Math.max(c.player.cash, o.advance * 3);
  acceptOffer(c, a, o);
  const t0 = a.trust, r0 = c.player.reputation.artists;
  for (let m = 0; m < 14 && !c.ended; m++) advanceMonth(c);
  const k = c.contracts[a.contractId ?? ''];
  broke.acts++;
  for (const p of k?.promises ?? []) {
    broke.n++;
    if (p.kept === false) broke.broken++;
    broke.penaltyReal += Math.round(toReal(p.paidPenalty ?? 0, c.year));
    broke.owedReal += Math.round(toReal(p.owed28 ?? 0, c.year));
  }
  broke.trust += Math.round(c.acts[a.id].trust - t0);
  broke.rep += Math.round((c.player.reputation.artists - r0) * 10) / 10;
}

const YEARS = Number(process.argv[2] ?? 3);
const SEEDS = Number(process.argv[3] ?? 4);
const OUT = process.argv[4];
const PROF = (process.argv[5] ?? 'balanced') as 'cautious' | 'balanced' | 'aggressive';
type Row = { seed: string; year0: number; offers: number; signs: number; contracts: number; advReal: number; sniped: number; rivalLive: number; promises: number; kept: number; broken: number; penaltyReal: number; ms: number };
const rows: Row[] = [];
for (let i = 0; i < SEEDS; i++) {
  const t = Date.now();
  const year = [1975, 1990, 1962, 2005, 1985, 1998][i % 6];
  const s: GameState = createGame(defaultConfig(`m28f5-${i}`, { difficulty: 'normal', scenario: 'emerging', startYear: year }));
  const sniped = new Set<string>();
  for (let m = 0; m < YEARS * 12 && !s.ended; m++) {
    if (m === 9) { runProbe(s); promProbe(s); breakProbe(s); }
    playMonth(s, PROF);
    for (const o of s.offers) if (o.status === 'sniped') sniped.add(o.id);
    advanceMonth(s);
    for (const o of s.offers) if (o.status === 'sniped') sniped.add(o.id);
  }
  const L = playLog(s) as unknown as { offers: number; signs: number };
  const mine = Object.values(s.contracts).filter((c) => c.party === 'player' && !s.acts[c.actId]?.playerBand && c.startWeek > 0);
  const adv = mine.reduce((a, c) => a + toReal(c.advance, s.year), 0) / Math.max(1, mine.length);
  const ps = mine.flatMap((c) => c.promises);
  const x4 = s.x4 as unknown as { prom28?: { penalties?: number }; rs28?: { live?: number } };
  rows.push({ seed: `m28f5-${i}`, year0: year, offers: L.offers, signs: L.signs, contracts: mine.length, advReal: Math.round(adv), sniped: sniped.size,
    rivalLive: x4.rs28?.live ?? 0, promises: ps.length, kept: ps.filter((p) => p.kept === true).length, broken: ps.filter((p) => p.kept === false).length,
    penaltyReal: Math.round(toReal(x4.prom28?.penalties ?? 0, s.year)), ms: Date.now() - t });
  const r = rows[rows.length - 1];
  console.log(JSON.stringify(r));
}
const sum = (k: keyof Row) => rows.reduce((a, r) => a + (r[k] as number), 0);
console.log(`TOTAL ofertas ${sum('offers')} | assinaturas ${sum('signs')} (${Math.round(sum('signs') / Math.max(1, sum('offers')) * 100)}%) | contratos ${sum('contracts')} | adiantamento médio (real) $${Math.round(rows.reduce((a, r) => a + r.advReal * r.contracts, 0) / Math.max(1, sum('contracts')))} | rival levou ${sum('sniped')} | promessas ${sum('promises')} (cumpridas ${sum('kept')}, quebradas ${sum('broken')}, multas $${sum('penaltyReal')})`);
console.log('SONDA não cumpre', JSON.stringify(broke));
console.log('SONDA ao vivo', JSON.stringify(probe.live), '| ao vivo ×1,5', JSON.stringify(probe.live15), '| mês', JSON.stringify(probe.month), '| promessas', JSON.stringify(probe.prom));
if (OUT) writeFileSync(OUT, JSON.stringify({ years: YEARS, seeds: SEEDS, rows, probe, broke }, null, 1));
