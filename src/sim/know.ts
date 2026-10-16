// Masters 31 (onda 0, W0-KN; 31.3 · F) — o que se sabe de alguém, em FONTE ÚNICA, para TODO par observador → alvo.
//
// 31.3 (F): seis eixos, uma tabela de campos (KNOW_FIELDS) e observadores além do jogador:
//   pub   reconhecimento público (fama vista do mercado do observador; a imprensa só dá isto)
//   met   contato pessoal (social31: 0 nunca · 2 já se viram · 3 trabalharam juntos)
//   intim intimidade 0..4 (social31 — separada da opinião: inimigo não é íntimo)
//   op    opinião do observador sobre o alvo (só quando há contato; senão "não conhece")
//   ties  laços estruturais (é seu, família, contrato)
//   scout conhecimento investigado (grau do olheiro; selos rivais têm o próprio grau — rivalDeg31)
// Observadores: 'player' · id de selo (rival) · 'market' (bolsa: só o público) · 'press' · pessoa ou chave 'l:'.
// `see(s, alvo, campo, obs)` diz se o campo aparece; fato PÚBLICO sobre a pessoa promove o campo (vício nas manchetes
// mostra o vício). Rivais e bolsa decidem por `guessPot31` (o que eles sabem), nunca pelo potencial real.
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
import { rel0, relOf } from './opinion';
import { closeness31, tie31, meNode31 } from './social31';
import { factsAbout, type Fact } from './facts17';
import { registerSwitch, sw } from './r31/switches';
import { l } from '../data/world';

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

registerSwitch({
  id: 'know31.intim', def: true, scope: 'game',
  desc: l('Conhecimento pela intimidade (grafo social): ligado, só convivência abre dados privados; desligado, regra antiga (|opinião| contava como intimidade — inimigo "conhecia" você).',
    'Knowledge through intimacy (social graph): on, only closeness opens private data; off, old rule (|opinion| counted as intimacy — an enemy "knew" you).'),
});
registerSwitch({
  id: 'know31.rivals', def: true, scope: 'game',
  desc: l('Rivais decidem pelo que sabem: ligado, selos rivais escolhem artistas pela estimativa dos próprios olheiros (ou pelo burburinho público); desligado, pelo potencial real.',
    'Rivals decide on what they know: on, rival labels pick acts by their own scouts\' estimate (or public buzz); off, by true potential.'),
});

/** Intimidade (0–4) do jogador com a pessoa. 31.3: pelo grafo social (convivência), não pela opinião. */
const ME = new WeakMap<GameState, { w: number; p?: Person }>();
function relDeg(s: GameState, pid: string): number {
  if (sw<boolean>(s, 'know31.intim')) return intimDeg(s, meNode31(s), pid);
  let c = ME.get(s);
  if (!c || c.w !== s.week) { c = { w: s.week, p: Object.values(s.persons).find((x) => x.isPlayer && x.alive) }; ME.set(s, c); }
  const me = c.p;
  const p = s.persons[pid];
  const v = Math.max(Math.abs(me && p ? rel0(s, pid, me.id) : 0), Math.abs(me ? me.rel[pid] ?? 0 : 0));
  return v >= 60 ? 4 : v >= 35 ? 3 : v >= 15 ? 2 : 0;
}
/** Intimidade 0..4 de `a` com `b` pelo grafo social (conhecido 0 · colega 2 · amigo 3 · próximo 4). */
function intimDeg(s: GameState, a: string, b: string): number {
  const t = tie31(s, a, b);
  if (!t) return 0;
  const c = closeness31(t.i);
  return c === 3 ? 4 : c === 2 ? 3 : c === 1 ? 2 : 0;
}

/** Grau de olheiro de um SELO RIVAL sobre um ato (o que os olheiros dele viram): o próprio elenco a fundo; em casa e
 *  com reputação alta, mais perto; longe, só o que a fama mostra. Determinístico, sem estado. */
export function rivalDeg31(s: GameState, lbId: string, a: Act): number {
  if (a.owner === lbId) return 4;
  const lb = s.labels[lbId];
  const exp = exposure(a.fame);
  let d = exp >= 3 ? 2 : exp >= 1 ? 1 : 0;
  if (lb && a.city === lb.city) d += 2;
  if (lb && lb.reputation >= 60) d += 1;
  return clamp(d, 0, 4);
}

/**
 * O potencial que o observador ACHA que o ato tem (para decisões de rivais, curadoria NPC e bolsa): faixa com viés do
 * próprio observador quando ele sabe o bastante; senão, o burburinho público (fama e momento). Nunca o valor real —
 * salvo com o interruptor know31.rivals desligado (medição).
 */
const GUESS = new WeakMap<GameState, { w: number; m: Map<string, number> }>();
export function guessPot31(s: GameState, actId: string, obs: string): number {
  const a = s.acts[actId];
  if (!a) return 0;
  if (!sw<boolean>(s, 'know31.rivals')) return a.potential;
  let c = GUESS.get(s);
  if (!c || c.w !== s.week) { c = { w: s.week, m: new Map() }; GUESS.set(s, c); }
  const ck = `${obs}|${actId}|${a.owner ?? ''}|${Math.round(a.fame)}|${Math.round(a.potential)}`;
  const hit = c.m.get(ck);
  if (hit !== undefined) return hit;
  const v = guessRaw(s, a, obs);
  c.m.set(ck, v);
  return v;
}
function guessRaw(s: GameState, a: Act, obs: string): number {
  const actId = a.id;
  const deg = obs === 'player' ? know(s, actId).priv : s.labels[obs] ? rivalDeg31(s, obs, a) : 0;
  const w = KNOW_WIDTHS.potential.byDeg[clamp(deg, 0, 5)];
  if (w >= KNOW_HIDDEN) return clamp(Math.round(35 + a.fame * 0.5 + a.momentum * 0.15), 0, 100);
  return band(s, actId, 'potential', a.potential, w, { obs })!.mid;
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
    if (obs !== 'player') return other(s, id, obs, tier, exposure(a.fame), a);
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
  if (obs !== 'player') return other(s, id, obs, tier, exposure(pf), acts[0]);
  if (p.isPlayer || acts.some(mineAct)) return full(tier);
  const deg = acts.reduce((m, x) => Math.max(m, s.knowledge[x.id]?.degree ?? 0), 0);
  const rel = relDeg(s, id);
  const ma = acts.slice().sort((x, y) => y.fame - x.fame)[0];
  const exp = exposure(ma && ma.fame > 0 ? pf * Math.min(1.25, fameAt(s, ma, '@me') / ma.fame) : pf);
  return { id, obs, mine: false, deg, rel, exp, priv: Math.max(deg, rel), pub: Math.max(deg, rel, exp), tier };
}

/** Observadores que não são o jogador: selo rival (olheiros dele), mercado (só o público), imprensa, pessoas (grafo). */
function other(s: GameState, id: string, obs: string, tier: number, exp: number, a?: Act): Omit<Know, 'width'> {
  const base = { id, obs, mine: false, tier };
  if (s.labels[obs]) {
    const deg = a ? rivalDeg31(s, obs, a) : 0;
    return { ...base, deg, rel: 0, exp, priv: deg, pub: Math.max(deg, exp) };
  }
  if (obs === 'market') return { ...base, deg: 0, rel: 0, exp, priv: 0, pub: exp };
  if (obs === 'press') { const deg = Math.max(0, exp - 1); return { ...base, deg, rel: 0, exp, priv: deg, pub: Math.min(5, exp + 1) }; }
  // pessoa (ou líder 'l:'): o que a convivência dá
  const rel = s.acts[id] ? Math.max(0, ...s.acts[id].members.map((m) => intimDeg(s, obs, m))) : intimDeg(s, obs, id);
  return { ...base, deg: 0, rel, exp, priv: rel, pub: Math.max(rel, exp) };
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

// ---------------------------------------------------------------- 31.3 (F): os seis eixos e a tabela de campos

export interface Axes6 {
  /** reconhecimento público 0..5 (fama vista do mercado do observador) */
  pub: number;
  /** contato: 0 nunca · 2 já se viram · 3 trabalharam juntos */
  met: 0 | 2 | 3;
  /** intimidade 0..4 (grafo social) */
  intim: number;
  /** opinião do observador sobre o alvo (−100..100), só com contato; null = não conhece */
  op: number | null;
  /** laço estrutural: é seu (elenco/banda/equipe/clientes) ou família/contrato com o observador */
  ties: boolean;
  /** grau investigado 0..5 (olheiros) */
  scout: number;
  mine: boolean;
}

/** Os seis eixos do par observador → alvo (pessoa ou ato). */
export function axes6(s: GameState, id: string, obs = 'player'): Axes6 {
  const k = know(s, id, obs);
  const me = obs === 'player' ? meNode31(s) : obs;
  const A = s.acts[id];
  const pid = A ? (A.leaderId && A.members.includes(A.leaderId) ? A.leaderId : A.members[0]) : id;
  const t = pid ? tie31(s, me, pid) : undefined;
  const op = t && pid ? (relOf(s, me, pid) ?? 0) : null;
  return { pub: k.pub, met: t ? t.k : 0, intim: k.rel, op, ties: k.mine || !!t?.derived, scout: k.deg, mine: k.mine };
}

/** Classes de dado (para a interface explicar por que algo está escondido). */
export type FieldClass = 'public' | 'pro' | 'private' | 'intimate' | 'secret';
/** Uma linha da tabela: com qual nível de cada eixo o campo aparece (basta UM), e quais fatos públicos o revelam. */
export interface FieldRule {
  cls: FieldClass;
  /** reconhecimento público (pub inclui olheiro e intimidade, como na regra antiga) */
  pub?: number;
  /** grau de olheiro */
  scout?: number;
  /** intimidade */
  intim?: number;
  /** contato pessoal (2 já se viram, 3 trabalharam juntos) */
  met?: 2 | 3;
  /** tipos de fato PÚBLICO sobre a pessoa (ou o ato dela) que mostram o campo em rótulo */
  fact?: readonly string[];
  /** nunca aparece para quem não é dono (ex.: o mínimo secreto de uma negociação) */
  never?: boolean;
}

/**
 * A tabela única: que eixo libera cada campo (basta um). Substitui o NEED de fame15 e as regras próprias de found17
 * (estresse), connect29/crimemem23 (crime), people16 (crenças/família), family29 (cabeçalho), nego27 (traços) e why18.
 */
export const KNOW_FIELDS = {
  public: { cls: 'public', pub: 0 },
  bio: { cls: 'public', pub: 1 },
  fame: { cls: 'public', pub: 2 },
  fans: { cls: 'public', pub: 2 },
  image: { cls: 'public', pub: 2 },
  hype: { cls: 'public', pub: 2 },
  members: { cls: 'public', pub: 1 },
  life: { cls: 'private', pub: 3, fact: ['marriage', 'birth', 'breakup', 'romance', 'death'] },
  family: { cls: 'private', pub: 3, scout: 3, intim: 3, fact: ['marriage', 'birth', 'breakup', 'romance'] },
  beliefs: { cls: 'private', pub: 3, scout: 3, intim: 2, fact: ['statement'] },
  rels: { cls: 'private', pub: 4, scout: 4, intim: 3, fact: ['feud', 'romance', 'marriage', 'breakup'] },
  attrs: { cls: 'pro', scout: 2, intim: 2 },
  value: { cls: 'pro', scout: 3, intim: 3 },
  potential: { cls: 'pro', scout: 3, intim: 3 },
  contract: { cls: 'pro', scout: 3, intim: 3 },
  traits: { cls: 'private', scout: 4, intim: 4 },
  ambition: { cls: 'private', scout: 3, intim: 3 },
  mood: { cls: 'intimate', scout: 4, intim: 4 },
  stress: { cls: 'intimate', scout: 4, intim: 4, fact: ['breakdown', 'stress'] },
  health: { cls: 'intimate', scout: 4, intim: 4, fact: ['addiction', 'rehab', 'health', 'breakdown'] },
  wantRoyalty: { cls: 'intimate', scout: 4, intim: 4 },
  songs: { cls: 'pro', scout: 5 },
  opinion: { cls: 'private', met: 2 },
  holds: { cls: 'secret', intim: 4, fact: ['secret_exposed', 'hold_used', 'blackmail'] },
  crime: { cls: 'secret', fact: ['arrest', 'crime', 'case_ruling', 'crime_member'] },
  negMin: { cls: 'secret', never: true },
} as const satisfies Record<string, FieldRule>;
export type SeeField = keyof typeof KNOW_FIELDS;
export type Seen = 'exact' | 'label' | 'hidden';

const PUB_FACTS = new WeakMap<GameState, { w: number; n: number; m: Map<string, Set<string>> }>();
/** Tipos de fato PÚBLICO sobre a pessoa ou o ato (e seus integrantes). Cache por semana e por fato novo. */
export function publicKinds(s: GameState, id: string): Set<string> {
  let c = PUB_FACTS.get(s);
  const n = (s.x4 as unknown as { facts17?: { seq?: number } }).facts17?.seq ?? 0;
  if (!c || c.w !== s.week || c.n !== n) { c = { w: s.week, n, m: new Map() }; PUB_FACTS.set(s, c); }
  let x = c.m.get(id);
  if (!x) {
    x = new Set<string>();
    for (const f of factsAbout(s, id, { limit: 60, withAct: true, withMembers: true, notSecret: true }) as Fact[]) if (f.visibility === 'public') x.add(f.kind);
    c.m.set(id, x);
  }
  return x;
}

/** O campo aparece para o observador? 'exact' (algum eixo basta), 'label' (só o que saiu na imprensa) ou 'hidden'. */
export function see(s: GameState, id: string, f: SeeField, obs = 'player'): Seen {
  const r: FieldRule = KNOW_FIELDS[f];
  const k = know(s, id, obs);
  if (k.mine) return 'exact';
  if (r.never) return 'hidden';
  if (r.pub !== undefined && k.pub >= r.pub) return 'exact';
  if (r.scout !== undefined && k.deg >= r.scout) return 'exact';
  if (r.intim !== undefined && k.rel >= r.intim) return 'exact';
  if (r.met !== undefined && axes6(s, id, obs).met >= r.met) return 'exact';
  if (r.fact?.length) { const ks = publicKinds(s, id); if (r.fact.some((x) => ks.has(x))) return 'label'; }
  return 'hidden';
}
/** Atalho: aparece de algum jeito. */
export const seen = (s: GameState, id: string, f: SeeField, obs = 'player'): boolean => see(s, id, f, obs) !== 'hidden';

/** Limiar ÚNICO de informação interna de uma empresa (antes 5% no pregão e 25% no dossiê): participação a partir daqui. */
export const INSIDE31 = 0.1;
