// Rodada 28 (Fase 8, I18) — PRÊMIOS PELAS DIMENSÕES DE QUALIDADE. Antes os prêmios liam só `q` e vendas
// (ceremonies8 / legacy.yearlyAwards) e o resultado parecia arbitrário. Agora:
//  • Gramófonos: cada categoria pesa as dimensões do quality18 que fazem sentido para ela (gravação = single + técnica +
//    imediatismo; álbum = coesão + sequência + durabilidade + originalidade; revelação = originalidade + emoção;
//    performance = emoção + química). Entra pelo GRAMO_ADJ (indicação E noite da cerimônia, via campaignBonus), de −6 a +6.
//  • Prêmios do Ofício (dezembro, desde 1959): um troféu por dimensão — Produção (técnica), Originalidade, Emoção e
//    Álbum Coeso (coesão) — para o lançamento do ano com a maior nota naquela dimensão (entre os 80 que mais venderam),
//    com o número na citação ("técnica 87"). Ganhar dá reputação artística ao selo. Sorteio de desempate semeado.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import type { GameState, Release } from '../types';
import { fmtL, notify, recordAward, remember } from '../util';
import { releasesNow27 } from '../tickcache27';
import { GRAMO_ADJ } from './ceremonies8';
import { DIM18, dims18, type Dim18 } from './quality18';

/** Pesos por categoria dos Gramófonos (somam 1). */
export const GRAMO_DIMS28: Record<string, Partial<Record<Dim18, number>>> = {
  record: { sgl: 0.45, tech: 0.3, imm: 0.25 },
  album: { coh: 0.3, seq: 0.2, dur: 0.25, orig: 0.25 },
  newcomer: { orig: 0.55, emo: 0.45 },
  performance: { emo: 0.6, chem: 0.4 },
};
export const OFF_AW28: { gramo?: boolean; craft?: boolean } = {};

/** Nota ponderada 0..100 das dimensões de um lançamento numa categoria (null sem dimensões). */
export function dimScore28(s: GameState, rel: Release, cat: string): number | null {
  const w = GRAMO_DIMS28[cat];
  if (!w) return null;
  const d = dims18(s, rel);
  if (!d) return null;
  let t = 0, n = 0;
  for (const [k, v] of Object.entries(w) as [Dim18, number][]) { const x = d[k]; if (x >= 0) { t += x * v; n += v; } }
  return n ? t / n : null;
}
GRAMO_ADJ.push((s, relId, cat) => {
  if (OFF_AW28.gramo) return 0;
  const rel = s.releases[relId];
  const v = rel ? dimScore28(s, rel, cat) : null;
  return v === null ? 0 : clamp((v - 50) * 0.12, -6, 6);
});

// ---------------------------------------------------------------- Prêmios do Ofício

export const CRAFT_START28 = 1959;
export const CRAFT_MONTH28 = 11; // dezembro (meses 0..11)
export const CRAFT28: { id: string; dim: Dim18; name: L; lp?: boolean }[] = [
  { id: 'craft_tech', dim: 'tech', name: l('Prêmio do Ofício — Produção', 'Craft Award — Production') },
  { id: 'craft_orig', dim: 'orig', name: l('Prêmio do Ofício — Originalidade', 'Craft Award — Originality') },
  { id: 'craft_emo', dim: 'emo', name: l('Prêmio do Ofício — Emoção', 'Craft Award — Emotion') },
  { id: 'craft_coh', dim: 'coh', name: l('Prêmio do Ofício — Álbum Coeso', 'Craft Award — Cohesive Album'), lp: true },
];
export interface CraftWin28 { cat: string; rel: Release; v: number }

/** Vencedores do ano (puro dado o sorteio de desempate). */
export function craftWinners28(s: GameState, year: number, r: Rng): CraftWin28[] {
  const pool = releasesNow27(s).filter((x) => x.year === year && x.totalUnits > 0 && !x.hist).sort((a, b) => b.totalUnits - a.totalUnits || (a.id < b.id ? -1 : 1)).slice(0, 80);
  const dm = new Map(pool.map((x) => [x.id, dims18(s, x)]));
  const out: CraftWin28[] = [];
  for (const c of CRAFT28) {
    let best: CraftWin28 | null = null, bv = -1;
    for (const x of pool) {
      if (c.lp && x.type !== 'lp') continue;
      const v = dm.get(x.id)?.[c.dim] ?? -1;
      if (v < 0) continue;
      const k = v + r.float(0, 1.5);
      if (k > bv) { bv = k; best = { cat: c.id, rel: x, v: Math.round(v) }; }
    }
    if (best) out.push(best);
  }
  return out;
}

export function craftAwards28(s: GameState): CraftWin28[] {
  if (OFF_AW28.craft || s.month !== CRAFT_MONTH28 || s.year < CRAFT_START28) return [];
  if (s.awards.some((a) => a.year === s.year && a.category.startsWith('craft_'))) return [];
  const r = Rng.fromSeed(`${s.config.seed}|aw28|${s.year}`);
  const ws = craftWinners28(s, s.year, r);
  for (const w of ws) {
    const c = CRAFT28.find((x) => x.id === w.cat)!;
    const act = s.acts[w.rel.actId];
    const byPlayer = w.rel.owner === 'player' || !!act?.playerBand;
    const who = `${act?.name ?? '?'} — ${w.rel.title}`;
    recordAward(s, { year: s.year, category: c.id, releaseId: w.rel.id, actId: act?.id, name: `${c.name.pt} / ${c.name.en}: ${who} (${DIM18[c.dim].name.pt.toLowerCase()} ${w.v})`, byPlayer });
    remember(s, 'award2', fmtL(l('{y} — {c}: {n} ({d} {v}).', '{y} — {c}: {n} ({d} {v}).'), { y: s.year, c: c.name, n: who, d: DIM18[c.dim].name, v: w.v }), { actId: act?.id, important: byPlayer });
    if (byPlayer) {
      notify(s, fmtL(l('{c}: {n}!', '{c}: {n}!'), { c: c.name, n: who }), 'good');
      s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1.5, 0, 100);
    }
  }
  return ws;
}
registerSimHook('month', 'aw28', (s) => { craftAwards28(s); });
