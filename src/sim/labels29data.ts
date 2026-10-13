// Rodada 29 — GRAVADORAS NO INÍCIO e SELOS NOVOS DURANTE A RUN (dados puros, seguros de importar pela interface).
// "No começo rápido, permita escolher quantas gravadoras iniciais (e ao longo da run faça ser aleatório quantas aparecem)";
// "no modo completo deve ser possível ter esse nível de escolha também, e até mais".
//  • Atalho da rápida: poucas (3–5) · algumas (6–10) · muitas (11–20) · mercado lotado (21–40) · padrão (como sempre).
//    O número sai da semente (mesmo número na tela e no mundo) e respeita a era (1889 não tem 40 gravadoras).
//  • Completa: número exato, % de reais × inventadas, porte, região, frequência de selos novos, fechamentos/fusões,
//    incluir/excluir gravadoras reais e concorrentes da carreira no início.
//  • Durante a run: quantos selos novos aparecem por ano é sorteado (semente + ano), com ondas da época (boom indie dos
//    anos 50, punk/indie 1977–85, anos 90, digital 2005+) e anos de seca. O gancho é src/sim/sys/labels29start.ts.
// Sem `labels29` na configuração (testes, bot, saves antigos) nada muda.

import { Rng } from '../core/rng';
import { l, type L } from '../data/world';
import type { Labels29 } from './labels29gate';
import type { RunConfig } from './types';
import { careerOf29 } from './start29data';
import { statusLineOf29 } from './rivals29data';

export type { Labels29 } from './labels29gate';
export type N29 = NonNullable<Labels29['n']>;
export type Freq29 = NonNullable<Labels29['freq']>;
export type Vn29 = NonNullable<Labels29['vn']>;

const N = (pt: string, en: string): L => l(pt, en);

/** Atalhos da rápida (e da completa), com a faixa de gravadoras rivais ativas no começo. */
export const NS29: { id: N29; name: L; range: [number, number] }[] = [
  { id: 'few', name: N('Poucas (3–5)', 'Few (3–5)'), range: [3, 5] },
  { id: 'some', name: N('Algumas (6–10)', 'Some (6–10)'), range: [6, 10] },
  { id: 'many', name: N('Muitas (11–20)', 'Many (11–20)'), range: [11, 20] },
  { id: 'crowded', name: N('Mercado lotado (21–40)', 'Crowded market (21–40)'), range: [21, 40] },
];
export const NAME_DEFAULT29: L = N('Padrão (como a história deixou)', 'Default (as history left it)');

/** Quantas gravadoras a indústria da época comporta no começo (atalhos não passam disso). */
export const eraCap29 = (year: number): number => (year < 1900 ? 8 : year < 1920 ? 12 : year < 1946 ? 24 : 40);
/** Faixa efetiva do atalho na era. */
export function range29(n: N29, year: number): [number, number] {
  const [lo, hi] = NS29.find((x) => x.id === n)!.range;
  const cap = eraCap29(year);
  return [Math.min(lo, cap), Math.min(hi, cap)];
}
/** Número de gravadoras rivais no começo (exato > atalho pela semente); undefined = o de sempre (a sugestão). */
export function count29(cfg: Pick<RunConfig, 'labels29' | 'seed' | 'startYear'>): number | undefined {
  const x = cfg.labels29;
  if (x?.count !== undefined) return Math.max(0, Math.min(100, Math.round(x.count)));
  if (!x?.n || !NS29.some((d) => d.id === x.n)) return undefined;
  const [lo, hi] = range29(x.n, cfg.startYear);
  return lo + Math.floor(Rng.fromSeed(`labels29:${cfg.seed}:n:${x.n}`).next() * (hi - lo + 1));
}

/** Concorrentes da carreira no início (estúdios, festivais, agências…). */
export const VNS29: { id: Vn29; name: L; range: [number, number] }[] = [
  { id: 'none', name: N('Nenhum', 'None'), range: [0, 0] },
  { id: 'few', name: N('Poucos (1–2)', 'Few (1–2)'), range: [1, 2] },
  { id: 'some', name: N('Alguns (3–4)', 'Some (3–4)'), range: [3, 4] },
  { id: 'many', name: N('Muitos (5–8)', 'Many (5–8)'), range: [5, 8] },
];
/** Carreira → tipo de negócio rival (ventures9) e o ano em que o tipo existe (espelho de VKINDS.from). */
export const VKIND29: Record<string, { k: string; from: number; pt: [string, string]; en: [string, string] }> = {
  studio: { k: 'studio', from: 1920, pt: ['estúdio', 'estúdios'], en: ['studio', 'studios'] },
  festival: { k: 'festival', from: 1950, pt: ['festival', 'festivais'], en: ['festival', 'festivals'] },
  booking: { k: 'booking', from: 1930, pt: ['agência', 'agências'], en: ['agency', 'agencies'] },
  publisher: { k: 'publisher', from: 1889, pt: ['editora', 'editoras'], en: ['publisher', 'publishers'] },
  media: { k: 'media', from: 1900, pt: ['veículo', 'veículos'], en: ['outlet', 'outlets'] },
  platform: { k: 'platform', from: 2005, pt: ['plataforma', 'plataformas'], en: ['platform', 'platforms'] },
};
/** A carreira tem negócio rival no ano? */
export const venKind29 = (career: string | undefined, year: number): (typeof VKIND29)[string] | undefined => {
  const d = career ? VKIND29[career] : undefined;
  return d && year >= d.from ? d : undefined;
};
export function ven29(cfg: Pick<RunConfig, 'labels29' | 'seed'>): number | undefined {
  const x = cfg.labels29;
  if (x?.ven !== undefined) return Math.max(0, Math.min(12, Math.round(x.ven)));
  if (!x?.vn || !VNS29.some((d) => d.id === x.vn)) return undefined;
  const [lo, hi] = VNS29.find((d) => d.id === x.vn)!.range;
  return lo + Math.floor(Rng.fromSeed(`labels29:${cfg.seed}:ven:${x.vn}`).next() * (hi - lo + 1));
}

// ---------------------------------------------------------------- opções finas (completa)

export const FREQS29: { id: Freq29; name: L; fx: L; mean: number }[] = [
  { id: 'none', name: N('Nenhuma', 'None'), fx: N('Ninguém abre selo: o mercado é o do começo (fora fechamentos).', 'Nobody opens a label: the market is the starting one (closures aside).'), mean: 0 },
  { id: 'rare', name: N('Rara', 'Rare'), fx: N('Um selo novo a cada três anos, em média.', 'One new label every three years, on average.'), mean: 0.3 },
  { id: 'normal', name: N('Normal', 'Normal'), fx: N('Sorteado ano a ano, com ondas da época e anos de seca.', 'Rolled year by year, with era waves and dry years.'), mean: 0.8 },
  { id: 'frequent', name: N('Frequente', 'Frequent'), fx: N('Cena fervendo: vários selos novos por ano.', 'A boiling scene: several new labels a year.'), mean: 2 },
  { id: 'chaotic', name: N('Caótica', 'Chaotic'), fx: N('Anos de explosão e anos de deserto, sem aviso.', 'Boom years and desert years, without warning.'), mean: 1.6 },
];
export const SIZES29: { id: NonNullable<Labels29['size']>; name: L }[] = [
  { id: 'indies', name: N('Muitas indies pequenas', 'Many small indies') },
  { id: 'mixed', name: N('Misto (padrão)', 'Mixed (default)') },
  { id: 'majors', name: N('Poucas majors grandes', 'Few big majors') },
];
export const SPREADS29: { id: NonNullable<Labels29['spread']>; name: L }[] = [
  { id: 'home', name: N('Na sua região', 'In your region') },
  { id: 'region', name: N('Casa + América do Norte + Europa', 'Home + North America + Europe') },
  { id: 'world', name: N('O mundo todo (padrão)', 'Worldwide (default)') },
];

/** Onda da época para selos novos (×): boom indie dos 50, punk/indie 1977–85, anos 90, digital 2005+; depressão e guerra secam. */
export function eraWave29(y: number): number {
  if (y < 1920) return 0.5;
  if (y >= 1929 && y <= 1945) return 0.35;
  if (y >= 1950 && y <= 1962) return 1.9;
  if (y >= 1977 && y <= 1985) return 1.8;
  if (y >= 1990 && y <= 1999) return 1.5;
  if (y >= 2000 && y <= 2004) return 0.8;
  if (y >= 2005) return 1.9;
  return 1;
}
/** Ritmo da run (0,5–1,6×): cada partida tem o seu. */
export const runPace29 = (seed: string): number => 0.5 + Rng.fromSeed(`labels29:${seed}:run`).next() * 1.1;

/** Selos novos no ano (e em que meses): sorteio próprio `labels29:semente:ano` — nunca o sorteio da partida. */
export function yearPlan29(seed: string, year: number, freq: Freq29): { n: number; months: number[]; mood: 'drought' | 'burst' | 'normal' } {
  const d = FREQS29.find((x) => x.id === freq) ?? FREQS29[2];
  if (!d.mean) return { n: 0, months: [], mood: 'drought' };
  const r = Rng.fromSeed(`labels29:${seed}:${year}`);
  const roll = r.next();
  const mood = roll < 0.15 ? 'drought' : roll < 0.27 ? 'burst' : 'normal';
  let lam = d.mean * runPace29(seed) * eraWave29(year) * (mood === 'drought' ? 0.15 : mood === 'burst' ? 2.2 : 0.6 + r.next() * 0.8);
  if (freq === 'chaotic') { const c = r.next(); lam *= c < 0.35 ? 0 : c < 0.6 ? 4 : r.next() * 1.5; } // deserto, explosão ou qualquer coisa
  // Poisson (Knuth), teto de 25 por ano
  let n = 0;
  for (let p = r.next(), L0 = Math.exp(-Math.min(lam, 25)); p > L0 && n < 25; p *= r.next()) n++;
  const months = Array.from({ length: n }, () => r.int(0, 11)).sort((a, b) => a - b);
  return { n, months, mood };
}

// ---------------------------------------------------------------- escolha (o mesmo setter na rápida e na completa)

/** Grava as escolhas (chaves com undefined são apagadas; objeto vazio apaga o campo — fica igual a nunca ter escolhido). */
export function setLabels29(cfg: RunConfig, patch: Partial<Labels29>): RunConfig {
  const x: Record<string, unknown> = { ...(cfg.labels29 ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || (Array.isArray(v) && !v.length)) delete x[k];
    else x[k] = Array.isArray(v) ? [...v] : v;
  }
  if (Object.keys(x).length) cfg.labels29 = x as Labels29; else delete cfg.labels29;
  return cfg;
}

/** "· 8 gravadoras · 3 estúdios" (vazio sem escolha). */
export function labelsTag29(cfg: RunConfig): L {
  const n = cfg.scenario17 ? undefined : count29(cfg);
  const v = cfg.scenario17 ? undefined : ven29(cfg);
  const vk = venKind29(careerOf29(cfg), cfg.startYear);
  const pt: string[] = [], en: string[] = [];
  if (n !== undefined) { pt.push(`${n} gravadora${n === 1 ? '' : 's'}`); en.push(`${n} label${n === 1 ? '' : 's'}`); }
  if (v !== undefined && vk) { const k = v === 1 ? 0 : 1; pt.push(`${v} ${vk.pt[k]} ${v === 1 ? 'rival' : 'rivais'}`); en.push(`${v} rival ${vk.en[k]}`); }
  return l(pt.map((x) => ` · ${x}`).join(''), en.map((x) => ` · ${x}`).join(''));
}
/** Status completo: "Selo emergente · rivais gigantes · 8 gravadoras". */
export const statusAll29 = (cfg: RunConfig): L => { const a = statusLineOf29(cfg), b = labelsTag29(cfg); return l(a.pt + b.pt, a.en + b.en); };
