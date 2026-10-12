// Rodada 27 (E2) — RIVAIS COM PERSONALIDADE E MEMÓRIA PESSOAL. Complementa rivalmind18 (memória ESTRATÉGICA) com
// mágoa contra VOCÊ, com nome e data:
//  • temperamento do selo (pelo estilo do líder em leaders10, ou pelo arquétipo do rivals2): vingativo, frio,
//    imitador ou orgulhoso — decide como a mágoa sai;
//  • mágoa nasce quando você vence um leilão em que ele deu lance, ou assina um artista que era dele (contrato com o
//    selo terminado há menos de um ano ou rompido) — cada caso vira lembrança ("Você levou X no leilão de 1977");
//  • reações (sempre no noticiário/fatos): vingativo tenta aliciar seu elenco (cartão poach_attempt do rivals2) ou
//    jura vingança em público (agressividade em leilões por 12 meses); orgulhoso solta nota; frio só abre o cofre;
//  • IMITADOR: quando você emplaca um top 10, um selo copia o estilo — contrata um ato do mesmo som (procedural) e o
//    mercado se divide (apelo ×0,95 no gênero por um ano; a cena satura mais rápido). Cartão: processar por plágio,
//    responder em público ou ignorar.
// Gerador próprio por mês (semente), sem tocar no RNG do jogo.

import { Rng, clamp } from '../../core/rng';
import { cityById, genreById, l, type L } from '../../data/world';
import { signWithRival } from '../contracts';
import { emitEvent } from '../events';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { archetypeOf } from '../rivals2';
import type { GameState, Label, Release } from '../types';
import { addHeat, fmtL, money, post } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { headline19 } from './factlink19';
import { leaders, type LeaderStyle } from './leaders10';
import { COPIES27 } from './scenes27';

export type Temper27 = 'vengeful' | 'cold' | 'copycat' | 'proud';
export const TEMPER27: Record<Temper27, [L, L]> = {
  vengeful: [l('Vingativo', 'Vengeful'), l('Não esquece: devolve na mesma moeda, de preferência em público.', 'Never forgets: pays back in kind, preferably in public.')],
  cold: [l('Frio', 'Cold'), l('Negócios são negócios: a mágoa vira lance mais alto, não manchete.', 'Business is business: a grudge becomes a higher bid, not a headline.')],
  copycat: [l('Imitador', 'Copycat'), l('Copia o que dá certo — principalmente o que deu certo para você.', 'Copies whatever works — especially what worked for you.')],
  proud: [l('Orgulhoso', 'Proud'), l('Finge que não liga, solta notas na imprensa e guarda a lista.', 'Pretends not to care, issues press statements and keeps a list.')],
};
const BY_STYLE: Record<LeaderStyle, Temper27> = { autocrat: 'vengeful', showman: 'vengeful', numbers: 'cold', dealmaker: 'copycat', visionary: 'proud', mentor: 'proud', consensus: 'cold' };
const BY_ARCH: Record<NonNullable<Label['archetype']>, Temper27> = { empire: 'vengeful', hitmaker: 'copycat', catalog: 'cold', scene_hunter: 'proud', boutique: 'proud' };
const DECAY: Record<Temper27, number> = { vengeful: 0.985, proud: 0.975, copycat: 0.97, cold: 0.93 };

export function temper27(s: GameState, lb: Label): Temper27 {
  const L0 = lb.leaderId ? leaders(s)?.L[lb.leaderId] : undefined;
  if (L0 && L0.st === 'active') return BY_STYLE[L0.style] ?? 'cold';
  return BY_ARCH[archetypeOf(lb)] ?? 'cold';
}

export interface Mem27 { w: number; y: number; t: L; d: number }
export interface Riv27 { g: number; mem: Mem27[]; last: number; agg0?: number; aggUntil?: number }
export interface Copy27 { id: string; lb: string; src: string; clone: string; rel: string; g: string; w: number; until: number; st: 'open' | 'answered' | 'ignored' | 'won' | 'lost' }
export interface Rv27State { L: Record<string, Riv27>; au: Record<string, 1>; k: Record<string, 1>; hit: Record<string, 1>; copies: Copy27[]; seq: number }
declare module '../ext4' { interface Ext4 { rv27: Rv27State } }
const init = (): Rv27State => ({ L: {}, au: {}, k: {}, hit: {}, copies: [], seq: 0 });
registerExt4('rv27', init);
export function rv27(s: GameState): Rv27State {
  const x = s.x4 as unknown as { rv27?: Rv27State };
  const st = (x.rv27 ??= init());
  st.L ??= {}; st.au ??= {}; st.k ??= {}; st.hit ??= {}; st.copies ??= []; st.seq ??= 0;
  return st;
}
export const OFF_RV27: { on?: boolean } = {};
const riv = (s: GameState, id: string): Riv27 => (rv27(s).L[id] ??= { g: 0, mem: [], last: -999 });

/** Mágoa nova com lembrança datada (fato `rival_grudge`, rumor). */
export function grudge27(s: GameState, lbId: string, d: number, t: L): void {
  const lb = s.labels[lbId];
  if (!lb?.active || !d) return;
  const x = riv(s, lbId);
  x.g = clamp(x.g + d, 0, 100);
  x.mem.unshift({ w: s.week, y: s.year, t, d: Math.round(d) });
  if (x.mem.length > 8) x.mem.length = 8;
  emitFact(s, { kind: 'rival_grudge', actors: [lbId, 'player'], severity: clamp(15 + d, 15, 60), visibility: 'rumor', tags: ['rivals27', 'memory', temper27(s, lb)], src: 'rivals27',
    text: fmtL(l('{b} não esquece: {t}', '{b} won\'t forget: {t}'), { b: lb.name, t }), data: { d: Math.round(d) } });
}

// ---------------------------------------------------------------- de onde vem a mágoa

function sources(s: GameState): void {
  const st = rv27(s);
  // leilões que você venceu contra eles
  for (const au of s.auctions) {
    if (au.status !== 'won' || st.au[au.id]) continue;
    st.au[au.id] = 1;
    const a = s.acts[au.actId];
    const mineTop = Math.max(0, ...au.bids.filter((b) => b.party === 'player').map((b) => b.advance));
    for (const p of [...new Set(au.bids.map((b) => b.party))]) {
      if (p === 'player' || !s.labels[p]) continue;
      const theirs = Math.max(0, ...au.bids.filter((b) => b.party === p).map((b) => b.advance));
      const close = mineTop > 0 ? clamp(theirs / mineTop, 0, 1) : 0.5;
      grudge27(s, p, 12 + close * 10, fmtL(l('você levou {a} no leilão de {y}, por cima do nosso lance.', 'you took {a} in the {y} auction, over our bid.'), { a: a?.name ?? '?', y: s.year }));
    }
  }
  // artista que era deles e assinou com você
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || s.week - c.startWeek > 6 || st.k[c.id]) continue;
    st.k[c.id] = 1;
    const prev = Object.values(s.contracts).filter((o) => o.actId === c.actId && o.id !== c.id && o.party !== 'player' && s.labels[o.party] && o.startWeek < c.startWeek && o.endWeek >= c.startWeek - 52)
      .sort((a, b) => b.startWeek - a.startWeek)[0];
    if (!prev) continue;
    const a = s.acts[c.actId];
    const broke = prev.endWeek > c.startWeek;
    grudge27(s, prev.party, broke ? 30 : 20 + Math.min(10, (a?.fame ?? 0) / 5), fmtL(broke ? l('você tirou {a} de nós no meio do contrato.', 'you took {a} from us mid-contract.') : l('{a} saiu daqui e foi direto para você.', '{a} left us and went straight to you.'), { a: a?.name ?? '?' }));
  }
}

// ---------------------------------------------------------------- reações

function bumpAgg(s: GameState, lb: Label, x: Riv27, d: number): void {
  if (x.agg0 === undefined) x.agg0 = lb.aggression;
  lb.aggression = clamp(x.agg0 + d, 0, 1);
  x.aggUntil = s.week + 52;
}

function react(s: GameState, r: Rng): void {
  const st = rv27(s);
  const mine = Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split');
  for (const [id, x] of Object.entries(st.L)) {
    const lb = s.labels[id];
    if (!lb?.active) { delete st.L[id]; continue; }
    const tp = temper27(s, lb);
    x.g = Math.round(x.g * DECAY[tp] * 10) / 10;
    if (x.aggUntil !== undefined && x.aggUntil <= s.week) { if (x.agg0 !== undefined) lb.aggression = x.agg0; delete x.agg0; delete x.aggUntil; }
    if (x.g < 40 || s.week - x.last < 13 || !r.chance(tp === 'cold' ? 0.3 : tp === 'proud' ? 0.25 : 0.35)) continue;
    x.last = s.week;
    const why = x.mem[0]?.t ?? l('velhas contas.', 'old scores.');
    if (tp === 'vengeful') {
      const target = mine.filter((a) => a.fame > 15 && (a.trust < 55 || (a.contractId && (s.contracts[a.contractId]?.endWeek ?? 0) - s.week < 40))).sort((a, b) => b.fame - a.fame)[0];
      if (target && !s.decisions.some((d) => d.eventId === 'poach_attempt')) {
        emitEvent(s, r, 'poach_attempt', { act: target.id, label: lb.id });
        say(s, lb, x, 'poach', fmtL(l('{b} vai atrás de {a} para se vingar ({w})', '{b} goes after {a} for revenge ({w})'), { b: lb.name, a: target.name, w: why }), 45, target.id);
      } else {
        bumpAgg(s, lb, x, 0.1);
        say(s, lb, x, 'threat', fmtL(l('O chefe de {b} jura vingança contra {c} na imprensa: "{w}" Vai cobrir todo lance seu por um ano.', '{b}\'s boss vows revenge on {c} in the press: "{w}" Will outbid you for a year.'), { b: lb.name, c: s.config.companyName, w: why }), 40);
      }
      x.g -= 15;
    } else if (tp === 'proud') {
      say(s, lb, x, 'statement', fmtL(l('{b} solta nota: "Não precisamos de ninguém que {c} queira." ({w})', '{b} issues a statement: "We need nobody {c} wants." ({w})'), { b: lb.name, c: s.config.companyName, w: why }), 30);
      x.g -= 12;
    } else {
      bumpAgg(s, lb, x, 0.08);
      say(s, lb, x, 'quiet', fmtL(l('{b} reforça o caixa de contratações: negócios são negócios ({w})', '{b} tops up its signing budget: business is business ({w})'), { b: lb.name, w: why }), 20, undefined, 'rumor');
      x.g -= 10;
    }
  }
}
function say(s: GameState, lb: Label, x: Riv27, tag: string, t: L, sev: number, act?: string, vis: 'public' | 'rumor' = 'public'): void {
  x.mem.unshift({ w: s.week, y: s.year, t, d: 0 });
  if (x.mem.length > 8) x.mem.length = 8;
  emitFact(s, { kind: 'rival_grudge', actors: [lb.id, 'player', ...(act ? [act] : [])], severity: sev, visibility: vis, tags: ['rivals27', tag, temper27(s, lb)], src: 'rivals27', text: t });
}

// ---------------------------------------------------------------- imitador

export const copyMult27 = (c: Copy27): number => (c.st === 'won' ? 1 : c.st === 'answered' ? 0.975 : 0.95);
const liveCopy = (s: GameState, c: Copy27) => c.until > s.week && c.st !== 'won';
COPIES27.f = (s, g) => rv27(s).copies.filter((c) => c.g === g && liveCopy(s, c)).length;

function copycats(s: GameState, r: Rng): void {
  const st = rv27(s);
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || rel.peak > 10 || s.week - rel.week > 10 || st.hit[rel.id]) continue;
    st.hit[rel.id] = 1;
    const a = s.acts[rel.actId];
    if (!a || !genreById[a.genre] || st.copies.some((c) => c.src === a.id && liveCopy(s, c))) continue;
    const cand = Object.values(s.labels).filter((lb) => lb.active && !lb.parentLabel && lb.cash > money(s, 30000) && lb.roster.length < 60);
    const lb = r.weighted(cand, (x) => { const tp = temper27(s, x); return (tp === 'copycat' ? 3 : tp === 'vengeful' ? 1 : 0.3) * (1 + (st.L[x.id]?.g ?? 0) / 50); });
    if (!lb || !r.chance(temper27(s, lb) === 'copycat' ? 0.55 : 0.25)) continue;
    makeCopy27(s, r, rel, lb);
  }
}

/** Um selo copia o estilo de um hit seu: contrata um ato do mesmo som e abre o cartão de resposta. */
export function makeCopy27(s: GameState, r: Rng, rel: Release, lb: Label): Copy27 | null {
  const st = rv27(s);
  const a = s.acts[rel.actId];
  if (!a) return null;
  const city = cityById[lb.city] ? lb.city : a.city;
  const clone = spawnProceduralAct(s, r, { city, genre: a.genre, potential: 45, fame: 6 });
  signWithRival(s, clone, lb.id, r, true);
  const c: Copy27 = { id: `cp27_${++st.seq}`, lb: lb.id, src: a.id, clone: clone.id, rel: rel.id, g: a.genre, w: s.week, until: s.week + 52, st: 'open' };
  st.copies.push(c);
  if (st.copies.length > 30) st.copies.splice(0, st.copies.length - 30);
  const t = fmtL(l('{b} copia o estilo de {a}: contrata {c}, mesmo som de "{t}". O público vai se dividir.', '{b} copies {a}\'s style: signs {c}, the same sound as "{t}". The audience will split.'), { b: lb.name, a: a.name, c: clone.name, t: rel.title });
  emitFact(s, { kind: 'copycat', actors: [clone.id, lb.id, a.id, 'player'], place: city, severity: 35, visibility: 'public', tags: ['rivals27', 'copy', a.genre], src: 'rivals27', text: t, data: { cp: c.id } });
  pushInbox18(s, 'rv27_copy', { from: lb.name, subject: fmtL(l('{b} lançou uma cópia de {a}', '{b} launched a copy of {a}'), { b: lb.name, a: a.name }), tone: 'bad', ref: { cp: c.id, act: a.id },
    body: fmtL(l('{t} Processar por plágio ({p}% de ganhar; custa advogados), responder em público (embalo para {a}, rixa esquenta) ou ignorar (o original é o original; o apelo do gênero cai ~5% por um ano).', '{t} Sue for plagiarism ({p}% to win; costs lawyers), answer publicly (momentum for {a}, the feud heats up) or ignore (the original is the original; the genre\'s appeal drops ~5% for a year).'), { t, a: a.name, p: Math.round(sueOdds27(s) * 100) }),
    actions: [{ id: 'sue', label: l('Processar por plágio', 'Sue for plagiarism') }, { id: 'mock', label: l('Responder em público', 'Answer publicly') }, { id: 'ignore', label: l('Ignorar', 'Ignore') }], weeks: 6 });
  return c;
}

export const sueOdds27 = (s: GameState) => clamp(0.35 + s.player.reputation.artistic / 250 + s.player.reputation.institutional / 400, 0.3, 0.75);
export function copyAnswer27(s: GameState, cpId: string, how: string): L {
  const c = rv27(s).copies.find((x) => x.id === cpId);
  const a = c && s.acts[c.src];
  const lb = c && s.labels[c.lb];
  if (!c || !a || c.st !== 'open') return l('O momento passou.', 'The moment passed.');
  if (how === 'sue') {
    post(s, `rv27sue:${c.id}`, -money(s, 3000), 'legal', `Processo de plágio contra ${lb?.name ?? '?'}`);
    const win = Rng.fromSeed(`${s.config.seed}|rv27sue|${c.id}`).chance(sueOdds27(s));
    if (win) {
      c.st = 'won';
      post(s, `rv27dmg:${c.id}`, money(s, 6000), 'other_income', 'Indenização por plágio');
      if (lb) grudge27(s, lb.id, 12, fmtL(l('você nos arrastou ao tribunal por causa de {a}.', 'you dragged us to court over {a}.'), { a: a.name }));
      emitFact(s, { kind: 'copycat', actors: [c.clone, c.lb, a.id, 'player'], severity: 40, visibility: 'public', tags: ['rivals27', 'won', 'plagiarism'], src: 'rivals27', text: fmtL(l('A Justiça dá razão a {a}: a cópia de {b} sai das lojas e paga indenização.', 'The court sides with {a}: {b}\'s copy is pulled and pays damages.'), { a: a.name, b: lb?.name ?? '?' }) });
      return l('Ganhou: a cópia sai de cena e paga indenização.', 'Won: the copy is pulled and pays damages.');
    }
    c.st = 'lost';
    s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100);
    return l('Perdeu: o juiz achou "influência", não plágio. Advogados pagos, cópia segue.', 'Lost: the judge saw "influence", not plagiarism. Lawyers paid, the copy stays.');
  }
  if (how === 'mock') {
    c.st = 'answered';
    a.momentum = clamp(a.momentum + 8, -100, 100);
    if (lb) { addHeat(s, lb.id, 10); grudge27(s, lb.id, 10, fmtL(l('{a} nos ridicularizou em público.', '{a} mocked us in public.'), { a: a.name })); }
    return fmtL(l('{a} responde em público: os fãs escolhem o original (embalo +8), a rixa esquenta.', '{a} answers publicly: fans pick the original (momentum +8), the feud heats up.'), { a: a.name });
  }
  c.st = 'ignored';
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
  return l('Ignorado: elegante, mas a cópia divide o público por um ano.', 'Ignored: classy, but the copy splits the audience for a year.');
}
registerInboxKind('rv27_copy', { label: l('Rival', 'Rival'), cat: 'decision', icon: 'alert', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a) => copyAnswer27(s, String(m.ref?.cp), a) });

registerMod('appeal', 'rivals27copy', (s, v, c) => {
  const a = c.act, rel = c.release;
  if (!a || !rel || !(rel.owner === 'player' || a.playerBand)) return null;
  const cp = rv27(s).copies.filter((x) => x.g === a.genre && liveCopy(s, x) && x.clone !== a.id).sort((x, y) => copyMult27(x) - copyMult27(y))[0];
  if (!cp) return null;
  return { value: v * copyMult27(cp), label: fmtL(l('Imitação de {b} divide o público', '{b}\'s imitation splits the audience'), { b: s.labels[cp.lb]?.name ?? '?' }) };
});

// ---------------------------------------------------------------- mês e ouvintes

export function rivals27Month(s: GameState): void {
  if (OFF_RV27.on) return;
  const r = Rng.fromSeed(`${s.config.seed}|rv27|${s.year}|${s.month}`);
  sources(s);
  react(s, r);
  copycats(s, r);
  // poda das marcas vistas (os ids não voltam)
  const st = rv27(s);
  for (const m of [st.au, st.k, st.hit]) { const ks = Object.keys(m); if (ks.length > 400) for (const k of ks.slice(0, ks.length - 400)) delete m[k]; }
}
registerSimHook('month', 'rivals27', (s) => rivals27Month(s));

// mágoa pública vira manchete e calor de rivalidade; cópia vira manchete
onFact('rival_grudge', (s, f) => {
  const lb = f.actors[0];
  if (s.labels[lb]) addHeat(s, lb, f.visibility === 'public' ? 4 : 1);
  if (f.visibility === 'public' && f.severity >= 30) headline19(s, f.text, 3);
}, 'rivals27:grudge');
onFact('copycat', (s, f) => { headline19(s, f.text, 3); }, 'rivals27:copy');

// ---------------------------------------------------------------- leitura (interface)

export function rivalMemory27(s: GameState, lbId: string): { temper: Temper27; g: number; mem: Mem27[]; copies: Copy27[] } | null {
  const lb = s.labels[lbId];
  if (!lb) return null;
  const x = rv27(s).L[lbId];
  return { temper: temper27(s, lb), g: Math.round(x?.g ?? 0), mem: x?.mem ?? [], copies: rv27(s).copies.filter((c) => c.lb === lbId) };
}
registerExplain('rival27', (s, c) => {
  const m = rivalMemory27(s, String(c.id ?? ''));
  const lb = s.labels[String(c.id ?? '')];
  if (!m || !lb) return null;
  const parts: WhyPart[] = [{ label: l('Temperamento', 'Temperament'), value: TEMPER27[m.temper][0].pt, note: TEMPER27[m.temper][1] }];
  for (const x of m.mem.slice(0, 5)) parts.push({ label: x.t, value: x.y, tone: x.d > 0 ? 'bad' : '' });
  return { title: fmtL(l('{b} e você', '{b} and you'), { b: lb.name }), value: m.g, parts, note: l('Mágoa 0–100: sobe quando você vence leilões contra eles ou leva artistas deles; acima de 40 eles reagem, cada um do seu jeito.', 'Grudge 0–100: rises when you beat them in auctions or take their artists; above 40 they react, each in their own way.') };
});

