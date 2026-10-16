// Masters 31 (onda 0, W0-KN) — o que se sabe de alguém, em FONTE ÚNICA.
//
// `know(s, alvo, observador)` junta o grau de olheiro (s.knowledge), a intimidade com o seu personagem e a
// exposição pública (fama vista do país do jogador) e devolve:
//   deg  — grau de olheiro 0..5 (scouting)        pub  — o que é público (0..5)
//   priv — o que é privado (0..5)                 width(campo) — largura da faixa mostrada (99 = oculto, 0 = exato)
// Todas as larguras saem da tabela KNOW_WIDTHS (a única). `band()` monta a faixa e NUNCA a centra no valor
// real: há um desvio determinístico por (semente, observador, alvo, campo), estável no tempo, que encolhe junto
// com a faixa à medida que se conhece melhor. `estimate()` (scouting), `knownLevel/canSee/fameText` (fame15),
// o "quanto se sabe" de knownacts27 (KNOW27) e as faixas da ficha unificada (persona13) leem daqui.

import { clamp, hashString } from '../core/rng';
import { actsOfPerson17 } from './actidx17';
import { fameAt } from './famehook16';
import { perk } from './perks';
import type { Act, GameState, Person } from './types';
import { staffSkill } from './util';
import { rel0 } from './opinion';

export type KnowField = 'fame' | 'talent' | 'skill' | 'potential' | 'attrs';
export type KnowAxis = 'pub' | 'priv';

/** Valor de largura que quer dizer "oculto". */
export const KNOW_HIDDEN = 99;

export interface KnowRow {
  /** qual eixo revela o campo: público (fama ajuda) ou privado (olheiros/intimidade) */
  axis: KnowAxis;
  /** largura TOTAL da faixa por grau 0..5 no eixo (99 = oculto, 0 = exato) */
  byDeg: readonly [number, number, number, number, number, number];
  /** largura para o que é seu (elenco, banda, equipe) */
  mine: number;
  /** a equipe de A&R e os bônus de olheiro estreitam a faixa */
  scouted: boolean;
}

/** A tabela única de larguras de faixa. */
export const KNOW_WIDTHS: Record<KnowField, KnowRow> = {
  fame: { axis: 'pub', byDeg: [99, 24, 0, 0, 0, 0], mine: 0, scouted: false },
  talent: { axis: 'priv', byDeg: [99, 99, 26, 15, 8, 3], mine: 0, scouted: true },
  skill: { axis: 'priv', byDeg: [99, 99, 26, 15, 8, 3], mine: 0, scouted: true },
  // o potencial é oculto até para o dono: sempre faixa
  potential: { axis: 'priv', byDeg: [99, 99, 99, 20, 11, 5], mine: 5, scouted: true },
  // atributos da ficha unificada (persona13)
  attrs: { axis: 'priv', byDeg: [99, 30, 18, 10, 4, 0], mine: 0, scouted: false },
};
/** Pessoas da indústria (líderes, críticos, mídia…) sem grau de olheiro: estranho / já houve contato. */
export const KNOW_INDUSTRY = { stranger: 24, acquainted: 6 } as const;

export interface Know {
  id: string;
  obs: string;
  /** é seu (elenco, banda, você mesmo): sabe tudo */
  mine: boolean;
  /** grau de olheiro 0..5 */
  deg: number;
  /** intimidade com o seu personagem 0..4 */
  rel: number;
  /** exposição pública 0..5 (fama vista do país do observador) */
  exp: number;
  priv: number;
  pub: number;
  /** degrau de fama (global) */
  tier: number;
  /** largura da faixa do campo (99 = oculto, 0 = exato) */
  width: (f: KnowField) => number;
}

/** R31 (EDT): "revelar tudo" do editor dentro da partida (ui/sim r31/editor.ts preenche; sem editor, nunca revela). */
export const KNOW_REVEAL31: { f?: (s: GameState) => boolean } = {};

const mineAct = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);

/**
 * Degrau de fama e fama de pessoa vêm de sys/fame15, que os registra ao carregar. know.ts NÃO importa fame15 (nem
 * outro sistema com ganchos): importar muda a ordem de avaliação dos módulos, e com ela a ordem dos ganchos
 * registrados — o que muda o mundo. Função içada de propósito (fame15 chama durante o carregamento).
 */
export interface KnowFame { tier: (fame: number) => number; person: (s: GameState, pid: string) => number }
export function registerKnowFame(f: KnowFame): void { (registerKnowFame as unknown as { f?: KnowFame }).f = f; }
const FF = (): KnowFame => (registerKnowFame as unknown as { f?: KnowFame }).f ?? { tier: () => 0, person: () => 0 };
const fameTier = (v: number): number => FF().tier(v);
const exposure = (fame: number): number => fameTier(fame);

/** Intimidade (0–4) do jogador com a pessoa, pela relação nos dois sentidos. */
const ME = new WeakMap<GameState, { w: number; p?: Person }>();
function relDeg(s: GameState, pid: string): number {
  let c = ME.get(s);
  if (!c || c.w !== s.week) { c = { w: s.week, p: Object.values(s.persons).find((x) => x.isPlayer && x.alive) }; ME.set(s, c); }
  const me = c.p;
  const p = s.persons[pid];
  const v = Math.max(Math.abs(me && p ? rel0(s, pid, me.id) : 0), Math.abs(me ? me.rel[pid] ?? 0 : 0));
  return v >= 60 ? 4 : v >= 35 ? 3 : v >= 15 ? 2 : 0;
}

function widthOf(s: GameState, k: Omit<Know, 'width'>, f: KnowField): number {
  const row = KNOW_WIDTHS[f];
  let w = k.mine ? row.mine : row.byDeg[clamp(Math.floor(k[row.axis]), 0, 5)];
  if (row.scouted && w > 0 && w < KNOW_HIDDEN && k.obs === 'player') {
    w *= 1 - staffSkill(s, 'anr') / 300;
    w *= clamp(1 - perk(s, 'scoutAccuracy'), 0.4, 1.6);
  }
  return w;
}

function raw(s: GameState, id: string, obs: string): Omit<Know, 'width'> {
  const full = (tier: number) => ({ id, obs, mine: true, deg: 5, rel: 5, exp: 5, priv: 5, pub: 5, tier });
  const none = (tier: number, exp: number) => ({ id, obs, mine: false, deg: 0, rel: 0, exp, priv: 0, pub: exp, tier });
  if (obs === 'player' && KNOW_REVEAL31.f?.(s)) { const a0 = s.acts[id]; return full(fameTier(a0 ? a0.fame : s.persons[id] ? FF().person(s, id) : 0)); }
  const a = s.acts[id];
  if (a) {
    const tier = fameTier(a.fame);
    if (obs !== 'player') return none(tier, exposure(a.fame));
    if (mineAct(a)) return full(tier);
    const deg = s.knowledge[id]?.degree ?? 0;
    const rel = a.members.reduce((m, pid) => Math.max(m, relDeg(s, pid)), 0);
    const exp = exposure(fameAt(s, a, '@me')); // exposição vista do país do jogador
    return { id, obs, mine: false, deg, rel, exp, priv: Math.max(deg, rel), pub: Math.max(deg, rel, exp), tier };
  }
  const p = s.persons[id];
  if (!p) return none(0, 0);
  const acts = actsOfPerson17(s, id);
  const pf = FF().person(s, id);
  const tier = fameTier(pf);
  if (obs !== 'player') return none(tier, exposure(pf));
  if (p.isPlayer || acts.some(mineAct)) return full(tier);
  const deg = acts.reduce((m, x) => Math.max(m, s.knowledge[x.id]?.degree ?? 0), 0);
  const rel = relDeg(s, id);
  const ma = acts.slice().sort((x, y) => y.fame - x.fame)[0];
  const exp = exposure(ma && ma.fame > 0 ? pf * Math.min(1.25, fameAt(s, ma, '@me') / ma.fame) : pf);
  return { id, obs, mine: false, deg, rel, exp, priv: Math.max(deg, rel), pub: Math.max(deg, rel, exp), tier };
}

/** O que `obs` (padrão: o jogador) sabe do ato ou pessoa `id`. */
export function know(s: GameState, id: string, obs = 'player'): Know {
  const k = raw(s, id, obs);
  return { ...k, width: (f: KnowField) => widthOf(s, k, f) };
}

/** "O quanto se sabe" em 4 níveis (0 só o nome · 1 de ouvir falar · 2 conhece bem · 3 a fundo); `tie` = laço direto. */
export function know3(k: Know, tie = false): 0 | 1 | 2 | 3 {
  const v: 0 | 1 | 2 | 3 = k.mine ? 3 : k.priv >= 3 ? 3 : k.priv >= 2 || k.pub >= 3 ? 2 : k.pub >= 1 ? 1 : 0;
  return v < 1 && tie ? 1 : v;
}

// ---------------------------------------------------------------- faixas

/**
 * Desvio determinístico (nunca zero) da faixa de um campo. O SINAL é fixo por (semente, observador, alvo, campo) —
 * ou o do viés do olheiro, quando há um —; a MAGNITUDE é uma fração de 20–45% da largura sorteada de novo para cada
 * largura (hash estável): duas leituras com larguras diferentes não se alinham numa reta, então não dá para
 * extrapolar o valor real comparando-as (com fração fixa, `v = (c1·w2 − c2·w1)/(w2 − w1)` entregava o número).
 */
export function knowSkew(s: GameState, id: string, field: string, w: number, obs = 'player', bias = 0): number {
  if (w <= 0 || w >= KNOW_HIDDEN) return 0;
  const h = hashString(`${s.config.seed}|know31|${obs}|${id}|${field}`);
  const sign = Math.abs(bias) >= 0.5 ? Math.sign(bias) : (h >>> 20) & 1 ? 1 : -1;
  const hw = hashString(`${s.config.seed}|know31w|${obs}|${id}|${field}|${Math.round(w * 4)}`);
  const u = (hw % 10007) / 10007;
  return sign * Math.max(1, w * (0.2 + 0.25 * u));
}

export interface Band { lo: number; hi: number; mid: number; exact: boolean }

/**
 * Faixa mostrada de um valor real `v` (0..100) com largura `w`: null quando oculto, exata quando w = 0. Nem o meio
 * da faixa nem o palpite (`mid`) são o valor real: o palpite é `v` deslocado por `knowSkew` (o viés do olheiro, se
 * houver, só escolhe o lado), e a janela inteira cabe em 0..100. Perto das bordas o desvio vira para dentro; se
 * mesmo assim o centro ficar a menos de max(1, 15% de w) do valor real, usa o lado que se afasta mais.
 */
export function band(s: GameState, id: string, field: string, v: number, w: number, o: { obs?: string; bias?: number } = {}): Band | null {
  if (w >= KNOW_HIDDEN) return null;
  if (w <= 0) { const r = Math.round(v); return { lo: r, hi: r, mid: r, exact: true }; }
  const off = knowSkew(s, id, field, w, o.obs, o.bias ?? 0);
  // o palpite (mid) é o valor real deslocado; perto da borda o deslocamento vira para dentro
  let m = v + off;
  if (m < 0 || m > 100) m = v - off;
  m = clamp(m, 0, 100);
  // a janela inteira cabe em 0..100 (cortar a borda recentralizaria a faixa no valor real)
  const half = Math.min(w, 100) / 2;
  const minD = Math.max(1, 0.15 * w);
  let c = clamp(m, half, 100 - half);
  if (Math.abs(c - v) < minD) {
    const alt = clamp(v - (m - v), half, 100 - half);
    if (Math.abs(alt - v) > Math.abs(c - v)) c = alt;
  }
  return { lo: Math.round(c - half), hi: Math.round(c + half), mid: Math.round(m), exact: false };
}

/** Texto curto de uma faixa: "?" (oculto), "42" (exato) ou "35–49". */
export const bandText = (b: Band | null): string => (!b ? '?' : b.exact ? String(b.mid) : `${b.lo}–${b.hi}`);

/**
 * Largura das faixas da ficha unificada (persona13) para qualquer chave de pessoa: você, sua equipe e o que é
 * seu = exato; pessoas (p:) pelo grau privado; gente da indústria sem olheiro = estranho ou já houve contato
 * (`met`: opinião marcante ou algum gesto registrado — ver opinion.ts).
 */
export function attrWidth(s: GameState, key: string, kind: string, met: boolean): number {
  if (kind === 'player' || kind === 'staff') return 0;
  if (key.startsWith('p:')) return know(s, key.slice(2)).width('attrs');
  return met ? KNOW_INDUSTRY.acquainted : KNOW_INDUSTRY.stranger;
}
