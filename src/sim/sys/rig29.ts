// Rodada 29 (Submundo) — VOTAÇÃO DE PRÊMIO COMPRADA. "Manipular a votação de um prêmio" vira ação de verdade: ação
// direta do Submundo (crime17 'award_rig': subornar jurado, lobby na academia, encher as urnas do voto popular,
// fazenda de robôs no voto online), serviço de "Contratar {família} para…" (mob29) e o pedido "vote como a gente
// quer" da família (mob29, com efeito real no resultado se você tem voto na academia; senão, lobby).
//
// Liga nos prêmios que existem, pelos ganchos de cada um (vazios = nada muda):
//  • Gramófonos (ceremonies8.GRAMO_ADJ — indicação e noite)      • Prêmios do Ofício (awards28.CRAFT_ADJ28)
//  • Prêmio da Crítica (awards2.CRITIC_ADJ29)                       • prêmios nacionais de júri local (awards15.juryMemHook)
//  • Hall da Fama (rockhall9.HALL_ADJ9)
// Ganhou com voto comprado → sorteio de exposição (método + calor). Exposto: prêmio CASSADO (fato 'award_revoked' de
// sempre: fama, manchete, estresse), escândalo (facções de fãs e imprensa via scandal17), reputação institucional e caso
// na polícia. Não ganhou: a compra vence com o ano (pequena chance de vazar mesmo assim).
// Determinismo: estado preguiçoso (x4.rig29) e Rng.fromSeed('rig29'); sem manipulação, todos os ganchos devolvem 0.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { CRITIC_ADJ29 } from '../awards2';
import { calOf19 } from '../awardcal19';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { scandal } from '../scandal17';
import type { GameState } from '../types';
import { fmtL, notify } from '../util';
import { juryMemHook } from './awards15';
import { CRAFT_ADJ28, CRAFT_START28 } from './awards28';
import { GRAMO_ADJ, GRAMO_START } from './ceremonies8';
import { RIG17, a3Of, addHeat, feedCase, heatIn, mIdx, orgById, type Ctx17 } from './crime17';
import { HALL_ADJ9, hall, hallExists, hallName } from './rockhall9';

const N = (pt: string, en: string): L => l(pt, en);

export type AwCat29 = 'gramo' | 'craft' | 'critics' | 'national' | 'hall';
export type RigM29 = 'jury' | 'lobby' | 'ballot' | 'bots' | 'vote';
export interface Rig29 {
  id: string; act: string; cat: AwCat29; m: RigM29;
  /** força (pontos na escala de cada prêmio) */
  pow: number;
  /** chance base de vir à tona */
  q: number;
  /** quem comprou: o jogador, a família contratada (por você) ou o seu voto a pedido da família */
  by: 'player' | 'family' | 'vote';
  o?: string; w: number; until: number; y0: number;
  /** prêmios do ato que já existiam (não contam como ganhos com o voto comprado) */
  pre: string[];
  done?: 'won' | 'lost' | 'exposed';
  /** prêmio ganho (nome) */
  aw?: string;
}
export interface Rig29State { r: Rig29[]; seq: number }
export const peekRig29 = (s: GameState): Rig29State | undefined => (s.x4 as unknown as { rig29?: Rig29State }).rig29;
export function rig29(s: GameState): Rig29State {
  const x = s.x4 as unknown as { rig29?: Rig29State };
  const st = (x.rig29 ??= { r: [], seq: 0 });
  st.r ??= [];
  return st;
}

export const AWCAT29: { id: AwCat29; name: (s: GameState) => L; on: (s: GameState) => boolean }[] = [
  { id: 'gramo', name: () => N('Gramófonos de Ouro', 'Golden Gramophones'), on: (s) => s.year >= GRAMO_START },
  { id: 'craft', name: () => N('Prêmios do Ofício', 'Craft Awards'), on: (s) => s.year >= CRAFT_START28 },
  { id: 'critics', name: () => N('Prêmio da Crítica', 'Critics\' Prize'), on: (s) => s.year >= calOf19('critics').start },
  { id: 'national', name: () => N('Prêmio nacional (júri local)', 'National award (local jury)'), on: () => true },
  { id: 'hall', name: (s) => hallName(s), on: (s) => hallExists(s) },
];
export const awCatsOn29 = (s: GameState): AwCat29[] => AWCAT29.filter((c) => c.on(s)).map((c) => c.id);

/** Métodos por época: força e chance de vazar. */
export const RIGM29: Record<RigM29, { name: L; pow: number; q: number; ok: (s: GameState) => L | null }> = {
  jury: { name: N('Subornar um jurado', 'Bribe a jury member'), pow: 6, q: 0.22, ok: () => null },
  lobby: { name: N('Lobby na academia', 'Academy lobbying'), pow: 4, q: 0.12, ok: () => null },
  ballot: { name: N('Encher as urnas do voto popular', 'Stuff the popular-vote ballots'), pow: 5, q: 0.28, ok: (s) => (s.year < 1950 ? N('Ainda não há voto popular por cupom (1950+).', 'No coupon popular vote yet (1950+).') : s.year >= 2000 ? N('O voto popular já é online: use robôs.', 'The popular vote is online now: use bots.') : null) },
  bots: { name: N('Fazenda de robôs no voto online', 'Bot farm for the online vote'), pow: 7, q: 0.3, ok: (s) => (s.year < 2005 ? N('Ainda não há voto popular online (2005+).', 'No online popular vote yet (2005+).') : null) },
  vote: { name: N('Seu voto na academia', 'Your academy vote'), pow: 4, q: 0.08, ok: () => null },
};
/** O jogador tem voto na academia? (reputação institucional 50+ ou 3+ prêmios do selo) */
export const hasVote29 = (s: GameState): boolean => s.player.reputation.institutional >= 50 || s.player.stats.awards >= 3;

const GRAMO_CATS29 = new Set(['record', 'album', 'newcomer', 'performance']);
const matchCat = (cat: AwCat29, c: string): boolean => (cat === 'gramo' ? GRAMO_CATS29.has(c) : cat === 'craft' ? c.startsWith('craft_') : cat === 'critics' ? c === 'critics' : cat === 'national' ? c.startsWith('nat_') : false);
const key = (e: { year: number; category: string }): string => `${e.year}|${e.category}`;

/** Registra a compra (o mesmo caminho do crime direto, da família contratada e do voto a pedido). */
export function rigAward29(s: GameState, x: { act: string; cat: AwCat29; m: RigM29; by: Rig29['by']; o?: string; pow?: number; q?: number }): Rig29 {
  const st = rig29(s);
  const M = RIGM29[x.m];
  const pre = s.awards.filter((e) => e.actId === x.act && matchCat(x.cat, e.category)).map(key);
  if (x.cat === 'hall') for (const e of hall(s).inducted) if (e.actId === x.act) pre.push(`${e.year}|hall`);
  const r: Rig29 = { id: `rg${++st.seq}`, act: x.act, cat: x.cat, m: x.m, pow: x.pow ?? M.pow, q: x.q ?? M.q, by: x.by, ...(x.o ? { o: x.o } : {}), w: s.week, until: s.week + 60, y0: s.year, pre };
  st.r.push(r);
  if (st.r.length > 40) st.r = st.r.filter((y) => !y.done).concat(st.r.filter((y) => y.done).slice(-10));
  return r;
}
/** Força ativa sobre um ato numa categoria. */
export function rigPow29(s: GameState, actId: string, cat: AwCat29): number {
  const st = peekRig29(s);
  if (!st) return 0;
  let t = 0;
  for (const r of st.r) if (!r.done && r.act === actId && r.cat === cat && r.until >= s.week) t += r.pow;
  return t;
}

// ---------------------------------------------------------------- ganchos nos prêmios (0 sem compra)

GRAMO_ADJ.push((s, relId) => { const rel = s.releases[relId]; return rel ? rigPow29(s, rel.actId, 'gramo') : 0; });
CRAFT_ADJ28.push((s, rel) => rigPow29(s, rel.actId, 'craft'));
CRITIC_ADJ29.push((s, _relId, actId) => rigPow29(s, actId, 'critics') / 6);
HALL_ADJ9.push((s, a) => rigPow29(s, a.id, 'hall') * 2);
{
  const prev = juryMemHook.f;
  juryMemHook.f = (s, actId, a3) => {
    const k = prev ? prev(s, actId, a3) : 1;
    const p = rigPow29(s, actId, 'national');
    return p ? k * (1 + p / 12) : k;
  };
}

// ---------------------------------------------------------------- crime 'award_rig' (crime17 chama por RIG17)

RIG17.ok = (s, m, t) => {
  const M = RIGM29[m as RigM29];
  const e = M?.ok(s);
  if (e) return e;
  if (!awCatsOn29(s).length) return N('Nenhum prêmio existe nesta época.', 'No award exists in this era.');
  void t;
  return null;
};
RIG17.f = (s, c: Ctx17, ok) => {
  const cat = (awCatsOn29(s).includes(c.cat as AwCat29) ? c.cat : awCatsOn29(s)[0]) as AwCat29 | undefined;
  const a = s.acts[c.target];
  if (!cat || !a) return N('Nada a manipular agora.', 'Nothing to rig right now.');
  const name = AWCAT29.find((x) => x.id === cat)!.name(s);
  if (!ok) return fmtL(N('O esquema para {a} no {p} não pegou: o votante recusou — e lembra do seu nome.', 'The scheme for {a} at the {p} fell through: the voter refused — and remembers your name.'), { a: a.name, p: name });
  const m = (c.method ?? 'jury') as RigM29;
  const o = c.actor.startsWith('o:') ? c.actor.slice(2) : undefined;
  rigAward29(s, { act: a.id, cat, m, by: o ? 'family' : 'player', o });
  return fmtL(N('{p}: {a} tem votos comprados ({m}). Se ganhar e vazar, o prêmio é cassado.', '{p}: {a} has bought votes ({m}). If it wins and it leaks, the award is revoked.'), { p: name, a: a.name, m: RIGM29[m].name });
};

// ---------------------------------------------------------------- acerto de contas (mês)

/** Cassa o prêmio ganho com voto comprado e aplica as consequências. */
function expose29(s: GameState, r: Rig29, won: { year: number; category: string; name: string; byPlayer: boolean } | null): void {
  const a = s.acts[r.act];
  const home = a3Of(s, s.config.homeCity);
  const mineDeal = true; // toda compra registrada aqui foi do jogador (direto, família contratada ou voto)
  r.done = 'exposed';
  const name = AWCAT29.find((x) => x.id === r.cat)!.name(s);
  if (won) {
    if (r.cat === 'hall') { const st = hall(s); st.inducted = st.inducted.filter((e) => !(e.actId === r.act && e.year === won.year)); }
    else {
      const i = s.awards.findIndex((e) => e.actId === r.act && e.year === won.year && e.category === won.category);
      if (i >= 0) { s.awards.splice(i, 1); if (a) a.awards = Math.max(0, a.awards - 1); if (won.byPlayer) s.player.stats.awards = Math.max(0, s.player.stats.awards - 1); }
    }
    if (a) emitFact(s, { kind: 'award_revoked', actors: [a.id], place: a.city, severity: 50, visibility: 'public', tags: ['awards', 'rig29', 'crime'], src: 'rig29', data: { n: 1 },
      text: fmtL(N('{p} cassa o prêmio de {a}: votos comprados ({m}).', 'The {p} revokes {a}\'s award: bought votes ({m}).'), { p: name, a: a.name, m: RIGM29[r.m].name }) });
  }
  const text = fmtL(won ? N('Escândalo: o prêmio de {a} no {p} foi comprado.', 'Scandal: {a}\'s {p} award was bought.') : N('Vaza a tentativa de comprar votos para {a} no {p}.', 'The attempt to buy votes for {a} at the {p} leaks.'), { a: a?.name ?? '?', p: name });
  if (a) scandal(s, a.id, 'money', won ? 50 : 30, text, { tags: ['awards', 'rig29'] });
  if (mineDeal) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - (r.by === 'vote' ? 3 : won ? 8 : 4), 0, 100);
    addHeat(s, 'player', home, won ? 8 : 4);
    if (r.by !== 'vote') feedCase(s, 'player', home, won ? 20 : 10, 45, r.by === 'family');
  }
  notify(s, text, 'bad');
}

registerSimHook('month', 'rig29', (s) => {
  const st = peekRig29(s);
  if (!st?.r.some((r) => !r.done)) return;
  const home = a3Of(s, s.config.homeCity);
  for (const r of st.r) {
    if (r.done) continue;
    const rr = Rng.fromSeed(`${s.config.seed}:rig29:${r.id}:${mIdx(s)}`);
    const q = clamp(r.q + heatIn(s, home) / 300 + (r.m === 'bots' ? (s.year - 2005) * 0.005 : 0), 0.02, 0.9);
    let won: { year: number; category: string; name: string; byPlayer: boolean } | null = null;
    if (r.cat === 'hall') { const e = hall(s).inducted.find((x) => x.actId === r.act && !r.pre.includes(`${x.year}|hall`)); if (e) won = { year: e.year, category: 'hall', name: e.name, byPlayer: false }; }
    else { const e = s.awards.find((x) => x.actId === r.act && matchCat(r.cat, x.category) && !r.pre.includes(key(x))); if (e) won = { year: e.year, category: e.category, name: e.name, byPlayer: e.byPlayer }; }
    if (won) {
      r.aw = won.name;
      if (rr.chance(q)) expose29(s, r, won);
      else r.done = 'won';
      continue;
    }
    if (r.until < s.week) {
      if (rr.chance(q / 3)) expose29(s, r, null);
      else r.done = 'lost';
    }
  }
});

/** Para testes e interface. */
export const _rig29 = { expose29, matchCat };
void orgById;
