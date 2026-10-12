// Rodada 21e (criação, docs/revisao21.md §4): (1) mixagem/masterização como decisão por era (master21) alimentando
// quality18 (dimensões), a crítica (registerReviewAdjust) e a estreia (chartUnits); (2) direção de álbum — faixa-título,
// single de trabalho e lado B (campos `dir21` do projeto → lançamento) com efeito nas primeiras semanas; (3) previsão ×
// realizado: o erro do jogador entre previsão (forecastUnits/estimateTour) e resultado, acumulado em s.x4.dir21.err.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerReviewAdjust } from '../media';
import { songProfile } from '../repertoire';
import type { GameState, Release, Song } from '../types';
import { fmtL, staffCount } from '../util';
import { MASTER21, defaultMaster21, masterOptions21, type Master21 } from './master21';
import { registerDimAdj18, type DimAdj18 } from './quality18';

// ------------------------------------------------------------------ estado

export interface ErrRec21 { id: string; k: 'sales' | 'tour'; w: number; fc: number; fa: number }
export interface Dir21State { err: ErrRec21[] }
declare module '../ext4' { interface Ext4 { dir21: Dir21State } }
registerExt4('dir21', () => ({ err: [] }));
export const dir21 = (s: GameState): Dir21State => ((s as unknown as { x4: { dir21?: Dir21State } }).x4.dir21 ??= { err: [] });

const EARLY_WEEKS = 8;
const masterOf = (s: GameState, rel: Release): Master21 => rel.dir21?.master ?? defaultMaster21(rel.year ?? s.year);
const songsOf = (s: GameState, rel: { songs: string[] }): Song[] => rel.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x);
const strength = (so: Song) => songProfile(so).hook * 0.5 + so.q * 0.5;

// ------------------------------------------------------------------ (1) master → dimensões, crítica, estreia

registerDimAdj18('dir21', (s, rel) => {
  const out: DimAdj18[] = [];
  const m = masterOf(s, rel);
  const def = MASTER21[m];
  for (const [d, v] of Object.entries(def.dims)) if (v) out.push({ d: d as DimAdj18['d'], v, why: fmtL(l('Master: {m}', 'Master: {m}'), { m: def.name }) });
  // faixa-título forte dá identidade ao disco (coesão); fraca, confunde
  const so = songsOf(s, rel);
  if (rel.dir21?.title && so.length >= 3) {
    const tt = so.find((x) => x.id === rel.dir21!.title);
    if (tt) {
      const vs = so.map(strength).sort((a, b) => b - a);
      const v = strength(tt) >= vs[Math.min(2, vs.length - 1)] ? 3 : strength(tt) < vs[Math.floor(vs.length / 2)] ? -3 : 0;
      if (v) out.push({ d: 'coh', v, why: v > 0 ? l('Faixa-título forte dá identidade', 'Strong title track gives identity') : l('Faixa-título fraca confunde', 'Weak title track blurs the record') });
    }
  }
  return out;
});

registerReviewAdjust('dir21', (s, rel) => {
  if (rel.reissueOf || rel.hist) return 0;
  return MASTER21[masterOf(s, rel)].critic;
});

/** Efeito do single de trabalho na estreia: single mais forte que a média do disco → mais unidades nas primeiras semanas. */
export function leadMult21(s: GameState, rel: Release): { m: number; lead?: Song } {
  if (rel.type === 'single' || !rel.dir21?.lead) return { m: 1 };
  const so = songsOf(s, rel);
  const lead = so.find((x) => x.id === rel.dir21!.lead);
  if (!lead || so.length < 2) return { m: 1 };
  const avg = so.reduce((t, x) => t + strength(x), 0) / so.length;
  return { m: clamp(1 + ((strength(lead) - avg) / 100) * 0.8, 0.92, 1.1), lead };
}

registerMod('chartUnits', 'dir21', (s, value, c) => {
  const rel = c.release;
  if (!rel || rel.reissueOf || rel.hist || s.week - rel.week > EARLY_WEEKS) return null;
  const def = MASTER21[masterOf(s, rel)];
  const ld = leadMult21(s, rel);
  const m = def.early * ld.m;
  if (Math.abs(m - 1) < 0.005) return null;
  const label = ld.m !== 1 && Math.abs(ld.m - 1) >= Math.abs(def.early - 1)
    ? (ld.m > 1 ? l('single de trabalho forte', 'strong lead single') : l('single de trabalho fraco', 'weak lead single'))
    : fmtL(l('master {m}', 'master {m}'), { m: def.name });
  return { value: value * m, label };
});

// ------------------------------------------------------------------ (3) previsão × realizado

const EXPLAIN_WEEKS = 10; // igual a explain8.EXPLAIN_WEEKS (fa é fixado lá)

registerSimHook('week', 'dir21', (s) => {
  const st = dir21(s);
  const seen = new Set(st.err.map((x) => x.id));
  for (const rel of Object.values(s.releases)) {
    if (rel.fc === undefined || rel.fa === undefined || seen.has(rel.id) || s.week - rel.week < EXPLAIN_WEEKS) continue;
    st.err.push({ id: rel.id, k: 'sales', w: s.week, fc: rel.fc, fa: rel.fa });
  }
  for (const t of s.tours) {
    if (t.status !== 'done' || t.fc21 === undefined || seen.has(t.id)) continue;
    st.err.push({ id: t.id, k: 'tour', w: s.week, fc: t.fc21, fa: t.revenue });
  }
  if (st.err.length > 80) st.err = st.err.slice(-80);
});

export interface Bias21 { n: number; /** erro médio (+ = superestima) */ bias: number; /** faixa de incerteza mostrada (±) */ band: number; staff: L }
/** Viés da previsão nos últimos `weeks` (padrão 12 meses) e a faixa de erro mostrada (analista/A&R/marketing estreitam). */
export function forecastBias21(s: GameState, k: 'sales' | 'tour', weeks = 52): Bias21 {
  const rs = dir21(s).err.filter((x) => x.k === k && s.week - x.w <= weeks && x.fa > 0 && x.fc > 0);
  const n = rs.length;
  const ratios = rs.map((x) => clamp(x.fc / x.fa, 0.2, 5) - 1);
  const bias = n ? ratios.reduce((t, x) => t + x, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(ratios.reduce((t, x) => t + (x - bias) ** 2, 0) / (n - 1)) : 0.5;
  const an = staffCount(s, 'analyst') > 0, ar = staffCount(s, 'anr') > 0 || staffCount(s, 'publicist') > 0;
  const f = an ? 0.5 : ar ? 0.75 : 1;
  return { n, bias: Math.round(bias * 100) / 100, band: Math.round(Math.max(0.05, sd) * f * 100) / 100, staff: an ? l('analista estreita a faixa', 'analyst narrows the band') : ar ? l('A&R/assessoria estreitam um pouco', 'A&R/publicist narrow it a little') : l('sem analista: faixa larga', 'no analyst: wide band') };
}

/** Frase curta para o Cockpit/Finanças ("você superestima vendas em 30 %"), ou null sem histórico. */
export function biasLine21(s: GameState, k: 'sales' | 'tour'): L | null {
  const b = forecastBias21(s, k);
  if (!b.n) return null;
  const what = k === 'sales' ? l('vendas', 'sales') : l('turnês', 'tours');
  const p = Math.round(Math.abs(b.bias) * 100);
  if (p < 5) return fmtL(l('Suas previsões de {w} acertam (±{b}%, {n} casos em 12 meses).', 'Your {w} forecasts are on target (±{b}%, {n} cases in 12 months).'), { w: what, b: Math.round(b.band * 100), n: b.n });
  return fmtL(b.bias > 0 ? l('Você superestima {w} em {p}% (±{b}%, {n} casos em 12 meses).', 'You overestimate {w} by {p}% (±{b}%, {n} cases in 12 months).') : l('Você subestima {w} em {p}% (±{b}%, {n} casos em 12 meses).', 'You underestimate {w} by {p}% (±{b}%, {n} cases in 12 months).'), { w: what, p, b: Math.round(b.band * 100), n: b.n });
}

// ------------------------------------------------------------------ "por quê"

registerExplain('dir21.master', (s, c) => {
  const year = Number(c.year ?? s.year);
  const cur = (c.master as Master21 | undefined) ?? defaultMaster21(year);
  const opts = masterOptions21(year);
  const parts: WhyPart[] = (opts.length ? opts : ['std' as Master21]).map((m) => {
    const d = MASTER21[m];
    const dims = Object.entries(d.dims).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(', ');
    return { label: d.name, value: `${dims || '—'} · ${d.critic >= 0 ? '+' : ''}${d.critic} · ${d.early >= 1 ? '+' : ''}${Math.round((d.early - 1) * 100)}%`, fmt: 'text' as const, tone: m === cur ? 'good' as const : '' as const, note: d.desc };
  });
  return { title: l('Mixagem e master', 'Mix and master'), value: MASTER21[cur].name.pt, fmt: 'text', parts,
    note: l('Cada opção: pontos nas dimensões (quality18) · ajuste da crítica (0–10) · unidades nas 8 primeiras semanas. Padrão da época para quem delega e para os rivais.', 'Each option: dimension points (quality18) · critic adjustment (0–10) · units in the first 8 weeks. Era default for delegates and rivals.') };
});

registerExplain('dir21.lead', (s, c) => {
  const ids = String(c.ids ?? '').split(',').filter(Boolean);
  const so = ids.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  if (!so.length) return null;
  const avg = so.reduce((t, x) => t + strength(x), 0) / so.length;
  const parts: WhyPart[] = so.map((x) => ({ label: x.title, value: clamp(1 + ((strength(x) - avg) / 100) * 0.8, 0.92, 1.1), fmt: 'mult', tone: x.id === c.lead ? 'good' : '' }));
  return { title: l('Single de trabalho', 'Lead single'), value: so.find((x) => x.id === c.lead)?.title ?? '—', fmt: 'text', parts: parts.sort((a, b) => Number(b.value) - Number(a.value)),
    note: l('Gancho e Q do single contra a média do disco: multiplica as unidades das 8 primeiras semanas (0,92–1,10) e define a dimensão "força do single".', 'Lead hook and Q against the record average: multiplies units in the first 8 weeks (0.92–1.10) and sets the "single strength" dimension.') };
});

registerExplain('dir21.fc', (s, c) => {
  const k = (c.k as 'sales' | 'tour') ?? 'sales';
  const b = forecastBias21(s, k);
  const rs = dir21(s).err.filter((x) => x.k === k && s.week - x.w <= 52).slice(-8);
  const parts: WhyPart[] = rs.map((x) => ({ label: k === 'sales' ? (s.releases[x.id]?.title ?? x.id) : (s.tours.find((t) => t.id === x.id)?.name ?? x.id), value: x.fa > 0 ? x.fc / x.fa : 1, fmt: 'mult', tone: x.fc / Math.max(1, x.fa) > 1.12 ? 'bad' : '' }));
  parts.push({ label: l('Faixa mostrada', 'Band shown'), value: b.band, fmt: 'pct', note: b.staff });
  return { title: l('Previsão × realizado', 'Forecast × actual'), value: b.bias, fmt: 'pct', parts, note: l('Previsão de 10 semanas (vendas) ou cachê+merch (turnê) dividido pelo resultado. Analista corta a faixa pela metade; A&R/assessoria em um quarto.', '10-week forecast (sales) or pay+merch (tours) divided by the result. An analyst halves the band; A&R/publicist trim a quarter.') };
});
