// R31 · onda 4 (R) — RESULTADOS E APRENDIZADOS (RN-13): amostras duráveis dos seus lançamentos, coortes e a biblioteca
// de aprendizados. Depende da RN-07 (results31: resultado por projeto) e das autópsias (market/explain8).
//
// • Amostra: quando a leitura de 10 semanas de um lançamento SEU fica pronta (`rel.fa`), o gancho semanal guarda um
//   resumo que não some quando a autópsia é limpa ou o disco sai do índice: ano, mês, gênero, tipo, fama do artista e
//   caixa no momento, unidades × previsão (a régua que já desconta o tamanho do artista), pico, crítica e os traços da
//   decisão (canais de divulgação, rollout, expectativa, capa, verba alta, espaçamento, estúdio próprio, editora).
// • Coorte: amostras (e projetos do results31) agrupadas por ano, década, tipo ou gênero.
// • Aprendizado: para cada traço, a média de "vendeu × previsão" COM o traço contra SEM ele, com o tamanho de cada
//   amostra e o contexto (anos, gêneros, tipos) — SEMPRE rotulado como correlação: não prova causa (outros fatores
//   andam juntos). Amostra pequena é dita como tal; abaixo do mínimo, não vira aprendizado.
// Só lê o jogo (sem sorteio, sem mexer em valores). Estado em `x4.learn31`.

import { l, type L } from '../../data/world';
import { CHANNELS } from '../../data/rules';
import { registerExt4, registerSimHook } from '../ext4';
import { EXPLAIN_WEEKS, expectedFor } from '../sys/explain8';
import type { GameState, Release } from '../types';
import { familyOf, FAMILIES } from '../../data/world';
import { dateOfDay, fmtL, playerActs } from '../util';
import { registerEditable, registerRunnable } from './editor';
import { projectResult31 } from './results31';

// ---------------------------------------------------------------- estado

/** Amostra compacta de um lançamento (gravada uma vez). */
export interface Samp31 {
  id: string; n: string; a: string; an: string;
  y: number; m: number; g: string; t: Release['type'];
  /** unidades nas 10 primeiras semanas e previsão para o mesmo período */
  u: number; e: number;
  /** pico nas paradas (99 = não entrou), nota da crítica (0 = sem) */
  pk: number; cr: number;
  /** contexto no momento da leitura: fama do artista e caixa da empresa */
  fa: number; cash: number;
  /** traços da decisão */
  f: string[];
  /** R33 (exp33.learn): fator de calibração que a previsão deste lançamento já trazia (ausente = 1) */
  k?: number;
}
export interface Learn31St { s: Samp31[]; seen: Record<string, 1> }
declare module '../ext4' { interface Ext4 { learn31: Learn31St } }
registerExt4('learn31', () => ({ s: [], seen: {} }));
export const SAMP_CAP31 = 400;
export function learn31(s: GameState): Learn31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.learn31 ??= { s: [], seen: {} }) as Learn31St;
  st.s ??= []; st.seen ??= {};
  return st;
}
const ro = (s: GameState): Learn31St | undefined => (s as unknown as { x4?: { learn31?: Learn31St } }).x4?.learn31;

/** mínimo de amostras de CADA lado para um traço virar aprendizado (editável) */
export const LEARN_MIN31 = { n: 3 };

// ---------------------------------------------------------------- traços

const CH_NAME = Object.fromEntries(CHANNELS.map((c) => [c.id, c.name])) as Record<string, L>;
const FACTOR = (rel: Release, key: string): number | undefined => rel.autopsy?.find((x) => x.key === key)?.value;

/** Traços de decisão de um lançamento (só leitura). */
export function traitsOf31(s: GameState, rel: Release): string[] {
  const f = new Set<string>();
  for (const m of rel.marketing ?? []) if (m.budget > 0) f.add(`ch:${m.channel}`);
  if (!(rel.marketing ?? []).some((m) => m.budget > 0)) f.add('nomkt');
  if ((rel.marketingE ?? 0) >= 0.4) f.add('mkthi');
  if (rel.rolloutId) f.add('rollout');
  if ((FACTOR(rel, 'hype12') ?? 1) > 1.02 || (rel.hypeBoost ?? 0) > 0) f.add('hype');
  if (rel.coverChoice) f.add(`cover:${rel.coverChoice}`);
  if ((FACTOR(rel, 'overexposure') ?? 1) < 0.98) f.add('close');
  if (FACTOR(rel, 'car31studio')) f.add('ownstudio');
  if (FACTOR(rel, 'car31pub')) f.add('ownpub');
  const m = monthOf(s, rel);
  if (m >= 9) f.add('q4');
  if (rel.shortage > 0 && rel.totalUnits > 0 && rel.shortage / (rel.totalUnits + rel.shortage) > 0.05) f.add('short');
  return [...f].sort();
}
const monthOf = (s: GameState, rel: Release): number => dateOfDay(s.config.startYear, rel.week * 7).month;

/** Nome do traço para a tela. */
export function traitName31(k: string): L {
  if (k.startsWith('ch:')) return fmtL(l('Divulgação: {c}', 'Promotion: {c}'), { c: CH_NAME[k.slice(3)] ?? l(k.slice(3)) });
  if (k.startsWith('cover:')) return fmtL(l('Capa no estilo "{c}"', 'Cover in the "{c}" style'), { c: k.slice(6) });
  const T: Record<string, L> = {
    nomkt: l('Sem verba de divulgação', 'No promotion budget'),
    mkthi: l('Divulgação forte (alcance alto)', 'Strong promotion (high reach)'),
    rollout: l('Lançado com rollout (teaser, singles, clipe)', 'Released with a rollout (teaser, singles, video)'),
    hype: l('Expectativa criada antes (teasers, audição, imprensa)', 'Anticipation built beforehand (teasers, listening party, press)'),
    close: l('Pouco espaço desde o disco anterior', 'Little gap since the previous record'),
    ownstudio: l('Gravado no seu estúdio', 'Recorded at your studio'),
    ownpub: l('Canção da sua editora', 'Your publisher\'s song'),
    q4: l('Saiu no fim do ano (out–dez)', 'Released at year end (Oct–Dec)'),
    short: l('Faltou disco nas lojas', 'Stock ran out in stores'),
  };
  return T[k] ?? l(k, k);
}

// ---------------------------------------------------------------- coleta (gancho semanal; só lê o lançamento)

/** R33 (GESTÃO): quem calibra a previsão diz quanto da previsão deste lançamento já era calibração (sim/r33/learn33). */
export const SAMP31X: { k?: (s: GameState, rel: Release) => number | undefined } = {};

export function sampleOf31(s: GameState, rel: Release): Samp31 | null {
  if (rel.fa === undefined || rel.fc === undefined) return null;
  const e = expectedFor(rel, EXPLAIN_WEEKS);
  if (e === null || e <= 0) return null;
  const a = s.acts[rel.actId];
  const x: Samp31 = {
    id: rel.id, n: rel.title, a: rel.actId, an: a?.name ?? '', y: rel.year, m: monthOf(s, rel), g: a ? familyOf(a.genre) : '', t: rel.type,
    u: rel.fa, e, pk: rel.peak || 99, cr: rel.criticN ? Math.round(rel.critic ?? 0) : 0,
    fa: Math.round(a?.fame ?? 0), cash: Math.round(s.player.cash), f: traitsOf31(s, rel),
  };
  const k = SAMP31X.k?.(s, rel);
  if (k !== undefined && k !== 1) x.k = k;
  return x;
}

export function collect31(s: GameState): number {
  const st = learn31(s);
  let n = 0;
  for (const actId of playerActs(s)) {
    const act = s.acts[actId];
    if (!act) continue;
    for (const id of act.releases.slice(-10)) {
      if (st.seen[id]) continue;
      const rel = s.releases[id];
      if (!rel || (rel.owner !== 'player' && !act.playerBand)) continue;
      const x = sampleOf31(s, rel);
      if (!x) continue;
      st.seen[id] = 1;
      st.s.push(x);
      n++;
    }
  }
  if (st.s.length > SAMP_CAP31) {
    for (const x of st.s.splice(0, st.s.length - SAMP_CAP31)) delete st.seen[x.id];
  }
  return n;
}
registerSimHook('week', 'learn31', (s) => { collect31(s); });

// ---------------------------------------------------------------- leituras (puras)

export const samples31 = (s: GameState): Samp31[] => ro(s)?.s ?? [];
/** vendeu × previsão (1 = bateu a previsão) */
export const ratio31 = (x: Samp31): number => x.u / Math.max(1, x.e);

export type CohortBy31 = 'year' | 'decade' | 'type' | 'genre';
export interface Cohort31 { key: string; label: L; n: number; ratio: number; hits: number; top10: number; units: number; margin?: number; mN: number }
const famName = (g: string): L => FAMILIES.find((f) => f.id === g)?.name ?? l(g || '—', g || '—');
const TYPE_NAME: Record<string, L> = { single: l('Singles', 'Singles'), ep: l('EPs', 'EPs'), lp: l('Álbuns', 'Albums') };

/** Coortes: média de vendeu × previsão, quantos passaram da previsão, top 10 e a margem atual (results31) quando há. */
export function cohorts31(s: GameState, by: CohortBy31): Cohort31[] {
  const g = new Map<string, Samp31[]>();
  for (const x of samples31(s)) {
    const k = by === 'year' ? String(x.y) : by === 'decade' ? `${Math.floor(x.y / 10) * 10}` : by === 'type' ? x.t : x.g;
    (g.get(k) ?? g.set(k, []).get(k)!).push(x);
  }
  const out: Cohort31[] = [];
  for (const [k, xs] of g) {
    let mSum = 0, mN = 0;
    for (const x of xs) { const r = projectResult31(s, x.id); if (r) { mSum += r.margin; mN++; } }
    out.push({
      key: k, n: xs.length,
      label: by === 'decade' ? l(`Anos ${k}`, `${k}s`) : by === 'type' ? TYPE_NAME[k] ?? l(k, k) : by === 'genre' ? famName(k) : l(k, k),
      ratio: xs.reduce((t, x) => t + ratio31(x), 0) / xs.length,
      hits: xs.filter((x) => ratio31(x) >= 1).length,
      top10: xs.filter((x) => x.pk <= 10).length,
      units: xs.reduce((t, x) => t + x.u, 0),
      margin: mN ? mSum : undefined, mN,
    });
  }
  return out.sort((a, b) => (by === 'year' || by === 'decade' ? Number(b.key) - Number(a.key) : b.n - a.n || (a.key < b.key ? -1 : 1)));
}

export interface Lesson31 {
  trait: string; name: L;
  nWith: number; nWithout: number;
  /** média de vendeu × previsão com e sem o traço */
  withR: number; withoutR: number;
  /** diferença relativa (com ÷ sem − 1) */
  diff: number;
  /** amostra pequena (menos de 8 de algum lado) */
  small: boolean;
  /** contexto das amostras COM o traço */
  years: [number, number]; genres: string[]; types: string[];
  /** exemplos (títulos) para o jogador conferir */
  ex: string[];
}

/** Biblioteca: um aprendizado por traço com amostra suficiente dos dois lados (ordem: maior efeito primeiro). */
export function lessons31(s: GameState, f: { genre?: string; type?: string } = {}): Lesson31[] {
  const xs = samples31(s).filter((x) => (!f.genre || x.g === f.genre) && (!f.type || x.t === f.type));
  const traits = new Set(xs.flatMap((x) => x.f));
  const out: Lesson31[] = [];
  for (const k of traits) {
    const w = xs.filter((x) => x.f.includes(k)), wo = xs.filter((x) => !x.f.includes(k));
    if (w.length < LEARN_MIN31.n || wo.length < LEARN_MIN31.n) continue;
    const avg = (ys: Samp31[]) => ys.reduce((t, x) => t + ratio31(x), 0) / ys.length;
    const a = avg(w), b = avg(wo);
    const ys = w.map((x) => x.y);
    out.push({
      trait: k, name: traitName31(k), nWith: w.length, nWithout: wo.length, withR: a, withoutR: b, diff: b > 0 ? a / b - 1 : 0,
      small: Math.min(w.length, wo.length) < 8,
      years: [Math.min(...ys), Math.max(...ys)], genres: [...new Set(w.map((x) => x.g))].sort(), types: [...new Set(w.map((x) => x.t))].sort(),
      ex: [...w].sort((p, q) => ratio31(q) - ratio31(p) || (p.id < q.id ? -1 : 1)).slice(0, 3).map((x) => x.n),
    });
  }
  return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || (a.trait < b.trait ? -1 : 1));
}

export const genreName31 = famName;

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({
  id: 'learn31.min', area: 'tools', kind: 'number', min: 2, max: 20, step: 1, raw: true,
  label: l('Aprendizados: mínimo de lançamentos de cada lado', 'Learnings: minimum releases on each side'),
  help: l('Abaixo disso um traço não vira aprendizado (com e sem o traço precisam desse tanto de amostras).', 'Below this a trait does not become a learning (with and without the trait both need this many samples).'),
  get: () => LEARN_MIN31.n,
  set: (_s, v) => { LEARN_MIN31.n = Math.max(2, Math.min(20, Math.round(Number(v)))); },
});
registerRunnable({
  id: 'learn31.collect', area: 'tools', label: l('Aprendizados: recolher amostras agora', 'Learnings: collect samples now'),
  help: l('Lê os lançamentos que já têm a leitura de 10 semanas e ainda não estão na biblioteca (o mesmo que a virada da semana faz).', 'Reads releases that already have the 10-week reading and are not yet in the library (the same as the week turn does).'),
  run: (s) => fmtL(l('{n} amostra(s) nova(s).', '{n} new sample(s).'), { n: collect31(s) }),
});
