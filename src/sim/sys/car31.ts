// R31 · onda 3 (CAR · Carreiras que mudam o mundo) — PEÇA COMUM: a função única de execução.
//
// Antes, quase toda carreira transformava a escolha do jogador num pequeno "embalo" global (momentum), sem país e sem
// parada. Aqui, rádio, TV, revista, plataforma, casa de shows, festival, crítica, trilha e empresário publicam
// EXECUÇÕES: `exec31(out, { rel | act, a3, w, src, by })` = música (ou artista) × lugar (país) × peso. O livro da
// semana (`ledger31`) junta tudo e alimenta, cada uma com interruptor próprio:
//   car31.charts  o lançamento vende mais no país da execução (multiplicador das unidades da semana com teto, e o peso
//                 daquele país na repartição das paradas) — é isso que faz a escolha virar posição de parada do país;
//   car31.fame    o artista ganha fama local naquele país (fonte nova da fama por país, fame16: "mídia e palcos").
// Freios: sua empresa expondo o seu próprio selo vale só uma fração (`car31.conflict`, conflito de interesse; e os
// retornos decrescentes de escala do mercado seguem valendo); teto por país e por lançamento.
// O que mexe em artistas que NÃO são seus fica atrás de `car31.others` (desligado: só os seus atos recebem execução).
//
// Determinismo: o livro é função pura do estado (grades, playlists, programação, impulsos guardados) — nada sorteia,
// nada grava. Fica em cache por semana e por revisão (cada decisão de carreira chama `touch31`). A interface lê a
// mesma conta para mostrar "o que esta grade faz" sem mudar nada.

import { clamp } from '../../core/rng';
import { COUNTRY_INFO, countryMarketSize } from '../../data/countries';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod } from '../ext4';
import { CAR31 } from '../r31/market31';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw, switchDefs } from '../r31/switches';
import type { Act, GameState, Release } from '../types';
import { FAME16X } from './fame16';

// ---------------------------------------------------------------- interruptores

registerSwitch({ id: 'car31.charts', def: true, scope: 'game',
  desc: l('Carreiras: o que você toca, escala e destaca vende mais no país e sobe nas paradas de lá.', 'Careers: what you play, book and feature sells more in that country and climbs its charts.') });
registerSwitch({ id: 'car31.fame', def: true, scope: 'game',
  desc: l('Carreiras: quem toca na sua rádio, playlist, casa ou festival ganha fama no país.', 'Careers: whoever plays on your radio, playlist, venue or festival gains fame in that country.') });
registerSwitch({ id: 'car31.others', def: true, scope: 'game',
  desc: l('Carreiras: suas decisões mexem também em artistas que não são seus (de outros selos ou sem selo).', 'Careers: your decisions also move acts that are not yours (other labels or unsigned).') });
registerSwitch({ id: 'car31.conflict', def: 0.5, scope: 'game',
  desc: l('Conflito de interesse: quanto vale a execução quando sua empresa expõe o seu próprio selo (1 = igual aos outros).', 'Conflict of interest: how much exposure counts when your company features your own label (1 = same as others).') });
registerSwitch({ id: 'car31.media', def: true, scope: 'game',
  desc: l('Rádio, TV e revista próprias: grade semanal com rotação, audiência contra rivais, ibope, jabá e diretor de programação.', 'Own radio, TV and magazine: weekly grid with rotation, audience against rivals, ratings, payola and a programme director.') });
registerSwitch({ id: 'car31.plat', def: true, scope: 'game',
  desc: l('Plataforma própria: playlists com vagas, assinantes por país, exigências das gravadoras e fazendas de streams.', 'Own platform: playlists with slots, subscribers by country, label demands and stream farms.') });
registerSwitch({ id: 'car31.stage', def: true, scope: 'game',
  desc: l('Casa de shows e festival: quem toca ganha fama na cidade pela posição no cartaz; noite lendária empurra nas paradas.', 'Venue and festival: who plays gains fame in the city by billing; a legendary night pushes the charts.') });
registerSwitch({ id: 'car31.studio', def: true, scope: 'game',
  desc: l('Estúdio e editora: a sessão vira qualidade do próximo disco do cliente; a canção colocada vai para o disco do artista.', 'Studio and publisher: the session becomes the client\'s next record quality; the placed song goes on the act\'s record.') });
registerSwitch({ id: 'car31.route', def: true, scope: 'game',
  desc: l('Agenciamento: turnês de clientes passam pelas cidades do mercado-alvo (fama no país).', 'Booking: client tours go through the target market\'s cities (fame in that country).') });
registerSwitch({ id: 'car31.press', def: true, scope: 'game',
  desc: l('Crítica e trilhas: resenha pesa no país do veículo; lista do ano; a música do filme vende pela bilheteria.', 'Critics and scores: reviews weigh in the outlet\'s country; year-end list; the film song sells with the box office.') });
registerSwitch({ id: 'car31.manager', def: true, scope: 'game',
  desc: l('Empresário: o plano de carreira vira pedidos reais a gravadoras, rádios e festivais, que podem recusar.', 'Manager: the career plan becomes real requests to labels, radio and festivals, which may refuse.') });
registerSwitch({ id: 'car31.prog', def: true, scope: 'game',
  desc: l('Carreiras: degraus de progressão, objetivos por degrau e desafio de fim de jogo quando você está grande.', 'Careers: progression steps, goals per step and an endgame challenge once you are big.') });

export const car31On = (s: GameState, id: string): boolean => !!sw<boolean>(s, `car31.${id}`);
export const conflict31 = (s: GameState): number => clamp(Number(sw<number>(s, 'car31.conflict')), 0, 1);

// ---------------------------------------------------------------- estado (impulsos com prazo; medição)

/** Impulso guardado (noite lendária, revelação do festival, pedido aceito, lista do ano…): vale até `u` (semana). */
export interface Boost31 { rel?: string; act: string; a3: string; w: number; u: number; src: Src31; by: string; own: 0 | 1 }
export interface Meter31 { y: number; own: number; oth: number; n: number }
export interface Car31State {
  b: Boost31[];
  /** medição: unidades a mais pelas execuções (ano corrente e anterior) */
  m: Meter31[];
}
declare module '../ext4' { interface Ext4 { car31: Car31State } }
const fresh = (): Car31State => ({ b: [], m: [] });
registerExt4('car31', fresh);
export function car31(s: GameState): Car31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.car31 ??= fresh()) as Car31State;
  st.b ??= []; st.m ??= [];
  return st;
}
/** Leitura sem criar (interface). */
export const car31Ro = (s: GameState): Car31State | undefined => (s as unknown as { x4?: { car31?: Car31State } }).x4?.car31;

// ---------------------------------------------------------------- a função única

export type Src31 = 'radio' | 'tv' | 'magazine' | 'web' | 'platform' | 'venue' | 'festival' | 'critic' | 'screen' | 'manager' | 'route';
export const SRC31: Record<Src31, L> = {
  radio: l('Rádio', 'Radio'), tv: l('TV', 'TV'), magazine: l('Revista', 'Magazine'), web: l('Blog e playlist', 'Blog and playlist'),
  platform: l('Plataforma', 'Platform'), venue: l('Casa de shows', 'Venue'), festival: l('Festival', 'Festival'), critic: l('Crítica', 'Criticism'),
  screen: l('Trilha de filme', 'Film score'), manager: l('Pedido do empresário', 'Manager request'), route: l('Turnê agenciada', 'Booked tour'),
};
/** Uma execução: lançamento (ou só o artista) × país × peso. `by` = quem expôs (id do negócio) para a medição. */
export interface Exec31 { rel?: string; act: string; a3: string; w: number; src: Src31; by: string }
export interface ExecOut31 { push: (e: Exec31) => void }

const IDX: Record<string, number> = Object.fromEntries(COUNTRY_INFO.map((c, i) => [c.a3, i]));
const NC = COUNTRY_INFO.length;
/** teto de peso por lançamento e país; teto do multiplicador mundial das unidades */
export const CAP_W31 = 0.9;
export const CAP_MULT31 = 0.6;
/** fama local: pontos de alvo por unidade de peso e teto */
export const FAME_K31 = 20;
export const FAME_CAP31 = 14;

const mineAct = (a: Act | undefined): boolean => !!a && (a.owner === 'player' || !!a.playerBand);

/**
 * A FUNÇÃO ÚNICA DE EXECUÇÃO. Toda carreira passa por aqui (nenhuma escreve no livro de outra forma):
 * aplica o interruptor de artistas que não são seus, o conflito de interesse (sua empresa expondo o seu selo) e
 * descarta o que não tem lugar ou peso.
 */
export function exec31(s: GameState, out: ExecOut31, e: Exec31): void {
  const a = s.acts[e.act];
  if (!a || !(e.w > 0) || IDX[e.a3] === undefined) return;
  const mine = mineAct(a);
  if (!mine && !car31On(s, 'others')) return;
  const w = mine ? e.w * conflict31(s) : e.w;
  if (w > 0) out.push({ ...e, w });
}

// ---------------------------------------------------------------- fontes (cada carreira registra a sua)

type SrcFn = (s: GameState, out: ExecOut31) => void;
const SOURCES: { id: string; fn: SrcFn }[] = [];
export function registerExec31(id: string, fn: SrcFn): void {
  const i = SOURCES.findIndex((x) => x.id === id);
  if (i >= 0) SOURCES[i] = { id, fn }; else SOURCES.push({ id, fn });
}
export const execSources31 = (): string[] => SOURCES.map((x) => x.id);

// impulsos guardados entram pela mesma função
registerExec31('boosts', (s, out) => {
  const st = car31Ro(s);
  if (!st) return;
  for (const b of st.b) if (b.u >= s.week) exec31(s, out, { rel: b.rel, act: b.act, a3: b.a3, w: b.w, src: b.src, by: b.by });
});

/** Guarda um impulso com prazo (passa pela função única quando o livro é montado). */
export function boost31(s: GameState, b: Omit<Boost31, 'own'>): void {
  const st = car31(s);
  st.b.push({ ...b, own: mineAct(s.acts[b.act]) ? 1 : 0, w: Math.round(b.w * 1000) / 1000 });
  if (st.b.length > 120) st.b.splice(0, st.b.length - 120);
  touch31(s);
}

// ---------------------------------------------------------------- o livro da semana

export interface Ledger31 {
  week: number; rev: number; key: string;
  /** lançamento → peso por país (mesma ordem de COUNTRY_INFO) */
  rel: Map<string, Float64Array>;
  /** ato → país → peso (fama local: tudo o que o expôs, com ou sem lançamento) */
  act: Map<string, Map<string, number>>;
  /** fonte → peso total (medição/interface) */
  src: Map<Src31, number>;
  /** lançamento → fonte principal (rótulo na explicação das vendas) */
  why: Map<string, Src31>;
  list: Exec31[];
}
const REV = new WeakMap<GameState, number>();
const CACHE = new WeakMap<GameState, Ledger31>();
/** Toda decisão de carreira que muda uma grade/lista/escalação chama isto (o livro é refeito na próxima leitura). */
export function touch31(s: GameState): void { REV.set(s, (REV.get(s) ?? 0) + 1); }

const SW_KEYS = ['media', 'plat', 'stage', 'press', 'others', 'conflict'];
export function ledger31(s: GameState): Ledger31 {
  const rev = REV.get(s) ?? 0;
  const key = SW_KEYS.map((k) => String(sw(s, `car31.${k}`))).join('|'); // trocar interruptor refaz o livro
  const hit = CACHE.get(s);
  if (hit && hit.week === s.week && hit.rev === rev && hit.key === key) return hit;
  const L: Ledger31 = { week: s.week, rev, key, rel: new Map(), act: new Map(), src: new Map(), why: new Map(), list: [] };
  const best = new Map<string, number>();
  const out: ExecOut31 = {
    push: (e) => {
      L.list.push(e);
      L.src.set(e.src, (L.src.get(e.src) ?? 0) + e.w);
      const i = IDX[e.a3];
      if (e.rel && s.releases[e.rel]?.live) {
        const v = L.rel.get(e.rel) ?? L.rel.set(e.rel, new Float64Array(NC)).get(e.rel)!;
        v[i] = Math.min(CAP_W31, v[i] + e.w);
        if (e.w > (best.get(e.rel) ?? 0)) { best.set(e.rel, e.w); L.why.set(e.rel, e.src); }
      }
      const m = L.act.get(e.act) ?? L.act.set(e.act, new Map()).get(e.act)!;
      m.set(e.a3, (m.get(e.a3) ?? 0) + e.w);
    },
  };
  for (const x of SOURCES) x.fn(s, out);
  CACHE.set(s, L);
  return L;
}

// ---------------------------------------------------------------- paradas: unidades e repartição por país

let SH: { y: number; v: Float64Array } | null = null;
/** fatia de cada país no mercado mundial do ano */
export function marketShare31(year: number): Float64Array {
  if (SH && SH.y === year) return SH.v;
  const v = new Float64Array(NC);
  let t = 0;
  COUNTRY_INFO.forEach((c, i) => { v[i] = countryMarketSize(c, year); t += v[i]; });
  for (let i = 0; i < NC; i++) v[i] = t > 0 ? v[i] / t : 0;
  SH = { y: year, v };
  return v;
}
/** multiplicador mundial das unidades do lançamento (1 = nada) */
export function unitsMult31(s: GameState, relId: string): number {
  if (!car31On(s, 'charts')) return 1;
  const v = ledger31(s).rel.get(relId);
  if (!v) return 1;
  const sh = marketShare31(s.year);
  let k = 0;
  for (let i = 0; i < NC; i++) if (v[i] > 0) k += v[i] * Math.max(sh[i], 0.004);
  return 1 + Math.min(CAP_MULT31, k);
}
const WHY_OWN = l('Execuções nas suas rádios, playlists e palcos', 'Plays on your stations, playlists and stages');
registerMod('chartUnits', 'car31', (s, value, c) => {
  const rel = c.release;
  if (!rel || rel.id.startsWith('__')) return null;
  const k = unitsMult31(s, rel.id);
  if (k <= 1.0005) return null;
  meter(s, rel, value * (k - 1));
  return { value: value * k, label: WHY_OWN };
});
CAR31.weights = (s, rel, w) => {
  if (!car31On(s, 'charts')) return;
  const v = ledger31(s).rel.get(rel.id);
  if (!v) return;
  for (let i = 0; i < w.length && i < NC; i++) if (v[i] > 0) w[i] *= 1 + v[i] * 1.5;
};

function meter(s: GameState, rel: Release, extra: number): void {
  const st = car31(s);
  let m = st.m.at(-1);
  if (!m || m.y !== s.year) { m = { y: s.year, own: 0, oth: 0, n: 0 }; st.m.push(m); if (st.m.length > 4) st.m.shift(); }
  if (mineAct(s.acts[rel.actId])) m.own += Math.round(extra); else m.oth += Math.round(extra);
  m.n++;
}

// ---------------------------------------------------------------- fama local (fonte nova de fame16)

FAME16X.add = (s, a, add) => {
  if (!car31On(s, 'fame')) return;
  const m = ledger31(s).act.get(a.id);
  if (!m) return;
  for (const [a3, w] of m) add(a3, Math.min(FAME_CAP31, w * FAME_K31));
};
FAME16X.cand = (s) => (car31On(s, 'fame') ? [...ledger31(s).act.keys()] : []);

// ---------------------------------------------------------------- manutenção

/** Poda os impulsos vencidos (chamada pelas carreiras no mês). */
export function tidy31(s: GameState): void {
  const st = car31Ro(s);
  if (!st) return;
  const n = st.b.length;
  st.b = st.b.filter((b) => b.u >= s.week && s.acts[b.act]);
  if (st.b.length !== n) touch31(s);
}

/** Resumo do que o livro faz por fonte e por país (interface e medição). */
export function ledgerSummary31(s: GameState): { src: [Src31, number][]; rels: number; acts: number } {
  const L = ledger31(s);
  return { src: [...L.src].sort((a, b) => b[1] - a[1]), rels: L.rel.size, acts: L.act.size };
}
/** Peso total de um lançamento num país (0 = nenhum). */
export function relW31(s: GameState, relId: string, a3: string): number { const v = ledger31(s).rel.get(relId); return v ? v[IDX[a3]] ?? 0 : 0; }
export const idx31 = (a3: string): number | undefined => IDX[a3];

// ---------------------------------------------------------------- editor (regra 10): os interruptores car31.*

for (const d of switchDefs()) {
  if (!d.id.startsWith('car31.')) continue;
  const num = typeof d.def === 'number';
  registerEditable({
    id: `sw.${d.id}`, area: 'careers', label: d.desc, kind: num ? 'number' : 'bool', min: num ? 0 : undefined, max: num ? 1 : undefined, step: num ? 0.05 : undefined,
    get: (s) => sw(s, d.id), set: (s, v) => { setSw(s, d.id, num ? Number(v) : !!v); touch31(s); },
  });
}
