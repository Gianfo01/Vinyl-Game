// Rodada 29c (Submundo) — FACÇÕES × ARTISTAS DO MUNDO. Pedido do autor: "ajuste isso — Limitação: por enquanto, só os
// seus artistas recebem esses pedidos das facções". Agora as facções das cenas (aff29: CV ↔ funk proibidão, PCC ↔ funk
// de SP, Sinaloa ↔ narcocorrido, Camorra ↔ neomelódicos, Yamaguchi ↔ enka, Bloods ↔ gangsta rap, Shower Posse ↔
// dancehall, máfia ↔ boates/jukeboxes e as inventadas do STREET29) também abordam os atos NPC — de selos rivais e
// independentes — com os mesmos gatilhos (gênero/cena no território, janela de época).
//
// Ritmo: chance por ato e mês ~1–5% (fama e estigma da cena aumentam; cena lotada dilui), no máximo 1–2 abordagens
// por organização e mês (2 só nas cenas de estigma alto) e 1 ano de intervalo entre a mesma facção e o mesmo ato.
//
// Decisão do NPC (pura: decide29n) — aceitar (tocar no baile / gravar a faixa / pagar o pedágio) ou recusar — pelos
// traços e pela personalidade do líder (rua, rebelde, polêmico, oportunista × disciplinado, reservado, religioso,
// resiliente), pelo tipo de selo (major evita; selo de cena e independente sem selo topam mais), pela época (a era das
// boates), pelo dinheiro do ato (caixa baixo topa) e pela fama (quem tem muito a perder recusa).
//
// Desfechos pelos sistemas de sempre: embalo/fama/caixa do ato; laço de rua (crime17.ties → credibilidade de rua e
// rixas do crimenpc17); escândalo (scandal17 — pânico moral, censura); batida policial (fato 'arrest' e caso contra a
// facção no crime17); selo que dispensa o ato (contracts.endContract + fato 'exit'); rixa com quem aceitou; movimento
// do gênero (movements9) que cresce com estigma; reputação do selo NPC aos olhos dos artistas (labelrep28 ouve o fato
// 'faction_approach'). Violência só fora de cena e sem detalhe (recados, shows cancelados).
//
// Ganchos do jogador (um caminho só, docs/act27.md — menu de ações do ato e card da organização chamam estas funções):
//  • "Denunciar a ligação" (denounce29n): imprensa/polícia; pode não colar e a facção sabe de onde veio;
//  • "Tirar do esquema (oferecer proteção)" (rescue29n): você paga o acerto, o ato sai do laço e fica devendo um favor;
//  • negociação: ato sob pressão de facção (ameaçado, dispensado pelo selo) ou tirado do esquema por você topa mais a
//    sua proposta (registerOfferMod) e, se tem selo, o buyout sai mais barato e o selo vende mais fácil (contracts2).
//
// REGRA DE SEGURANÇA (revista pelo autor na rodada 29c): nos modos livres — inclusive o padrão de nomes reais, em que
// tudo depois do início é história desta partida — qualquer facção aborda qualquer ato da cena. No modo "Vida real
// exata" (history 'strict') a facção não aborda artista real (ato do catálogo ou com integrante real) sem laço
// documentado (ORGS17.ties) entre ela e alguém da formação. A interface não distingue documentado de simulado.
//
// Determinismo: sorteios próprios (Rng.fromSeed com chave 'aff29npc'); nenhum fluxo compartilhado é consumido. O
// estado (x4.aff29n) nasce na primeira abordagem.

import { Rng, clamp } from '../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { endContract } from '../contracts';
import { buyoutAdj29 } from '../contracts2';
import { registerOfferMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { grantHold } from '../holds17';
import { histMode } from '../history15';
import { cashWhy20, freeCash20 } from '../oblig20';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import { actsNow27 } from '../tickcache27';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, post } from '../util';
import { affs29, pickAsk, type Aff29 } from './aff29';
import { a3Of, addHeat, crime17, feedCase, isReal, mIdx, orgById, usd, type Org17 } from './crime17';
import { mob29 } from './mob29';
import { tierOf } from './movements9';
import { docTies29, resolveWho29 } from './orglinks29';

const N = (pt: string, en: string): L => l(pt, en);

// ================================================================ estado (preguiçoso)

export type Ask29n = 'baile' | 'toll' | 'homage';
export type Dec29n = 'play' | 'write' | 'pay' | 'refuse';
/** O que aconteceu depois da decisão (para a ficha, o card e os testes). */
export type Out29n = 'raid' | 'scandal' | 'drop' | 'tie' | 'threat' | 'feud' | 'case' | 'cash' | 'movement';
export interface Ap29n {
  id: string; w: number; y: number;
  /** organização (sem 'o:') e ato */
  o: string; a: string;
  /** selo do ato na hora (ausente = independente) */
  lb?: string;
  k: Ask29n; d: Dec29n; out: Out29n[];
  /** chance que o ato tinha de aceitar (0–1) */
  p: number;
  t: L;
}
export interface Aff29NState {
  seq: number;
  log: Ap29n[];
  /** última abordagem: 'org|ato' → semana */
  last: Record<string, number>;
  /** laço de rua causado por abordagem aceita (ato → organização) — orglinks29 lê */
  tie: Record<string, string>;
  /** ato sob pressão (ameaçado, dispensado) → até a semana */
  pr: Record<string, number>;
  /** denunciado por você → semana */
  den: Record<string, number>;
  /** tirado do esquema por você → até a semana */
  res: Record<string, number>;
  /** rixas de cena abertas por recusa ('a|b' do crime17.feud → semana): esfriam em 1 ano se ninguém as alimentou */
  fd?: Record<string, number>;
}
export const peek29n = (s: GameState): Aff29NState | undefined => (s.x4 as unknown as { aff29n?: Aff29NState }).aff29n;
export function aff29n(s: GameState): Aff29NState {
  const x = s.x4 as unknown as { aff29n?: Aff29NState };
  const st = (x.aff29n ??= { seq: 0, log: [], last: {}, tie: {}, pr: {}, den: {}, res: {} });
  st.log ??= []; st.last ??= {}; st.tie ??= {}; st.pr ??= {}; st.den ??= {}; st.res ??= {};
  return st;
}
/** Desligar (bisecção de balanceamento / testes "mundo sem o módulo"). */
export const OFF29N: { all?: boolean } = {};

// ================================================================ quem pode ser abordado

const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging') && !a.deceased;
const mineA = (a: Act): boolean => a.owner === 'player' || !!a.playerBand;
/** Ato real: do catálogo ou com alguém real na formação. */
export const realAct29n = (s: GameState, a: Act): boolean => !!a.catalogNo || a.members.some((m) => isReal(s, m));
/** Laço documentado (ORGS17.ties, regra de história do orglinks29) entre a organização e alguém da formação. */
export function docTieAct29n(s: GameState, oid: string, a: Act): boolean {
  for (const t of docTies29(s)) {
    if (t.o !== oid) continue;
    const k = resolveWho29(s, t.who);
    if (k && k.startsWith('p:') && a.members.includes(k.slice(2))) return true;
  }
  return false;
}
/** Por que a facção NÃO aborda este ato (null = pode). O mesmo teste do gancho e da interface. */
export function approachBlock29n(s: GameState, o: Org17, a: Act): L | null {
  if (!live(a)) return N('Ato fora de atividade.', 'Act not active.');
  if (mineA(a)) return N('Ato seu: os pedidos chegam pelo Submundo (aff29/mob29).', 'Your act: requests come through the Underworld (aff29/mob29).');
  if (histMode(s) === 'strict' && realAct29n(s, a) && !docTieAct29n(s, o.id, a)) return N('Vida real exata: artista real só aparece com uma facção quando há laço documentado.', 'Exact real life: a real artist only appears with a faction when there is a documented tie.');
  const tied = crime17(s).ties[a.id];
  if (tied && tied !== o.id) return N('Já anda com outra organização.', 'Already runs with another organization.');
  return null;
}

// ================================================================ decisão do NPC (pura)

const lead29n = (s: GameState, a: Act): Person | undefined => (a.leaderId && s.persons[a.leaderId]) || a.members.map((m) => s.persons[m]).find((p) => p?.alive);
const TRAIT_YES: Record<string, number> = { street: 0.2, rebel: 0.12, controversial: 0.12, opportunist: 0.1, party: 0.08, impulsive: 0.06, spendthrift: 0.05, big_ego: 0.04 };
const TRAIT_NO: Record<string, number> = { disciplined: 0.12, reserved: 0.1, spiritual: 0.12, engaged: 0.08, diplomatic: 0.05, frugal: 0.04, shy: 0.06, intellectual: 0.05 };
const LB_NAME: Record<string, L> = { A: N('major', 'major'), B: N('selo de cena', 'scene label'), C: N('selo de sucessos', 'hit label'), D: N('selo de catálogo', 'catalog label') };

/** Chance de o ato aceitar o pedido (tocar / gravar / pagar), com o porquê. Pura. */
export function decide29n(s: GameState, a: Act, o: Org17, af: Pick<Aff29, 'stigma'>, k: Ask29n): { p: number; why: L[] } {
  const why: L[] = [];
  let p = k === 'baile' ? 0.45 : k === 'homage' ? 0.3 : 0.55;
  const add = (v: number, t: L) => { if (!v) return; p += v; why.push(fmtL(N('{t} ({v})', '{t} ({v})'), { t, v: `${v > 0 ? '+' : ''}${Math.round(v * 100)}%` })); };
  const P = lead29n(s, a);
  let tr = 0;
  for (const t of P?.traits ?? []) {
    // pedágio: quem é ansioso paga; quem é resiliente bate o pé
    if (k === 'toll' && t === 'anxious') tr += 0.15;
    else if (k === 'toll' && t === 'resilient') tr -= 0.15;
    else if (k === 'baile' && t === 'rooted') tr += 0.1;
    else tr += (TRAIT_YES[t] ?? 0) - (TRAIT_NO[t] ?? 0);
  }
  add(tr, N('Traços do líder', 'Leader\'s traits'));
  const pe = P?.persona;
  if (pe) add(Math.round(((k === 'baile' ? pe.ambition - 50 : 0) / 250 - (pe.discipline - 50) / 250 + (pe.openness - 50) / 400) * 100) / 100, N('Personalidade', 'Personality'));
  const lb = a.owner && a.owner !== 'player' ? s.labels[a.owner] : undefined;
  if (lb) add(lb.family === 'A' ? -0.25 - (af.stigma - 0.5) * 0.2 : lb.family === 'B' ? 0.08 : 0, fmtL(N('Selo: {t}', 'Label: {t}'), { t: LB_NAME[lb.family] ?? N('selo', 'label') }));
  else add(0.12, N('Sem selo: precisa de palco e dinheiro', 'No label: needs stage and money'));
  if (k === 'baile' && s.year >= 1945 && s.year < 1980 && (o.kind === 'mafia' || o.kind === 'syndicate' || o.kind === 'firm')) add(0.1, N('A era das boates', 'The nightclub era'));
  if (a.cash < money(s, 2000)) add(0.1, N('Caixa baixo', 'Low cash'));
  if (a.fame >= 50) add(-0.12, N('Muito a perder (fama)', 'Too much to lose (fame)'));
  else if (a.fame < 15) add(0.06, N('Começando: qualquer palco serve', 'Starting out: any stage will do'));
  return { p: clamp(p, 0.05, 0.92), why };
}

// ================================================================ a abordagem e os desfechos

const evt = (o: Org17): L => (o.kind === 'mafia' || o.kind === 'syndicate' || o.kind === 'firm' ? N('na boate', 'at the club') : N('no baile', 'at the party'));
function pushLog(s: GameState, x: Omit<Ap29n, 'id' | 'w' | 'y'>): Ap29n {
  const st = aff29n(s);
  const e: Ap29n = { id: `an${++st.seq}`, w: s.week, y: s.year, ...x };
  st.log.push(e);
  if (st.log.length > 160) st.log.splice(0, st.log.length - 160);
  return e;
}
const strictReal = (s: GameState, o: Org17): boolean => histMode(s) === 'strict' && o.real;

/** O selo reage: major dispensa mais; selo de cena quase nunca. Devolve true se dispensou. */
function labelReacts(s: GameState, a: Act, o: Org17, base: number, r: Rng): boolean {
  const lb = a.owner && a.owner !== 'player' ? s.labels[a.owner] : undefined;
  if (!lb) return false;
  const k = lb.family === 'A' ? 1 : lb.family === 'B' ? 0.15 : lb.family === 'C' ? 0.5 : 0.4;
  if (!r.chance(clamp(base * k, 0, 0.9))) return false;
  endContract(s, a, 'terminated');
  emitFact(s, { kind: 'exit', actors: [a.id, lb.id], place: a.city, severity: 30 + a.fame / 4, visibility: 'public', tags: ['label', 'dropped', 'aff29'],
    text: fmtL(N('{b} dispensa {a}: o selo não quer o nome ligado a {o}.', '{b} drops {a}: the label does not want its name tied to {o}.'), { b: lb.name, a: a.name, o: o.name }), src: 'aff29npc' });
  aff29n(s).pr[a.id] = s.week + 26;
  return true;
}

/** Recusou e outro ato da mesma facção aceitou há pouco: rixa de cena (a de sempre do crimenpc17). */
function feudWith(s: GameState, a: Act, o: Org17): boolean {
  const st = aff29n(s);
  const other = st.log.slice().reverse().find((e) => e.o === o.id && e.a !== a.id && (e.d === 'play' || e.d === 'write') && s.week - e.w <= 52 && live(s.acts[e.a]) && familyOf(s.acts[e.a].genre) === familyOf(a.genre));
  if (!other) return false;
  const b = s.acts[other.a];
  const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  const c = crime17(s);
  if ((c.feud[key] ?? 0) > 0) return false;
  c.feud[key] = 15;
  (st.fd ??= {})[key] = s.week;
  emitFact(s, { kind: 'feud', actors: [a.id, b.id], place: a.city, severity: 25, visibility: 'public', tags: ['street', 'feud', 'aff29'],
    text: fmtL(N('Rixa de cena: {a} recusou {o} e cutuca {b}, que topou, numa faixa nova.', 'Scene feud: {a} turned down {o} and takes a shot at {b}, who said yes, in a new track.'), { a: a.name, o: o.name, b: b.name }), src: 'aff29npc' });
  return true;
}

/** Uma abordagem completa: pedido → decisão → desfechos → fato e registro. Exportada para os testes. */
export function approach29n(s: GameState, af: Aff29 & { org: Org17 }, a: Act, r: Rng, force?: Ask29n): Ap29n {
  const o = af.org;
  const k = force ?? (pickAsk(o, af, r) as Ask29n);
  const dec = decide29n(s, a, o, af, k);
  const yes = r.chance(dec.p);
  const d: Dec29n = !yes ? 'refuse' : k === 'baile' ? 'play' : k === 'homage' ? 'write' : 'pay';
  const st = aff29n(s);
  st.last[`${o.id}|${a.id}`] = s.week;
  const lb = a.owner && a.owner !== 'player' && s.labels[a.owner] ? a.owner : undefined;
  const out: Out29n[] = [];
  const a3 = a3Of(s, a.city);
  let t: L;
  let sev = 20;
  let vis: 'public' | 'rumor' = 'rumor';
  if (d === 'play') {
    const fee = money(s, 600 + a.fame * 50);
    a.cash += fee; a.momentum = clamp(a.momentum + 6, 0, 100); a.fame = clamp(a.fame + 0.4, 0, 100);
    a.fans.core += Math.round(a.fans.core * 0.02 + 20);
    out.push('cash');
    addHeat(s, o.key, a3, 2);
    t = fmtL(N('{o} chama {a} para tocar {e}: a casa lota e o nome corre nas mixtapes.', '{o} books {a} to play {e}: the place is packed and the name spreads on mixtapes.'), { o: o.name, a: a.name, e: evt(o) });
    sev = 25; vis = 'public';
    const c = crime17(s);
    if (r.chance(0.1 + (c.heat[a3] ?? 0) / 400 + (c.nh[o.key] ?? 0) / 400)) {
      out.push('raid');
      for (const m of a.members) addStress(s, m, 6, N('Batida policial no show', 'Police raid at the show'));
      a.momentum = clamp(a.momentum - 3, 0, 100);
      emitFact(s, { kind: 'arrest', actors: [o.key, a.id], place: a.city, severity: 40, visibility: 'public', tags: ['crime', 'raid', 'aff29', 'npc'],
        text: fmtL(N('A polícia invade o evento de {o} durante o show de {a}; ninguém do grupo é preso.', 'Police raid {o}\'s event during {a}\'s show; nobody from the act is arrested.'), { o: o.name, a: a.name }), src: 'aff29npc' });
      if (!strictReal(s, o)) { feedCase(s, o.key, o.a3, 6, 30, true); out.push('case'); }
    }
    if (r.chance(0.06 + af.stigma * 0.12)) {
      out.push('scandal');
      scandal(s, a.id, 'crime', 20 + af.stigma * 20, fmtL(N('Pânico moral: {a} tocou num evento ligado a {o}.', 'Moral panic: {a} played an event tied to {o}.'), { a: a.name, o: o.name }), { tags: ['aff29', 'npc'] });
    }
    if ((out.includes('raid') || out.includes('scandal')) && labelReacts(s, a, o, 0.35, r)) out.push('drop');
  } else if (d === 'write') {
    const c = crime17(s);
    c.ties[a.id] = o.id; // o laço de rua de sempre (crimenpc17: credibilidade, rixas)
    st.tie[a.id] = o.id;
    out.push('tie');
    a.momentum = clamp(a.momentum + 4, 0, 100); a.fame = clamp(a.fame + 0.3, 0, 100);
    if (a.image) a.image.publicImage = clamp(a.image.publicImage - 4, 0, 100);
    addHeat(s, o.key, a3, 3);
    t = fmtL(N('{a} grava uma faixa que exalta {o}: a rua aplaude, as rádios torcem o nariz.', '{a} records a track glorifying {o}: the street cheers, radio frowns.'), { a: a.name, o: o.name });
    sev = 35; vis = 'public';
    if (r.chance(0.25 + af.stigma * 0.3)) {
      out.push('scandal');
      scandal(s, a.id, 'crime', 25 + af.stigma * 25, fmtL(N('Censura: rádios e TVs recusam a faixa de {a} sobre {o}.', 'Censorship: radio and TV refuse {a}\'s track about {o}.'), { a: a.name, o: o.name }), { tags: ['aff29', 'npc', 'censorship'] });
    }
    if (labelReacts(s, a, o, 0.55, r)) out.push('drop');
  } else if (d === 'pay') {
    const fee = Math.min(a.cash, money(s, 300 + o.power * 8));
    a.cash -= fee;
    t = fmtL(N('{a} paga o "pedágio" de {o} para tocar no território.', '{a} pays {o}\'s "toll" to play in their turf.'), { a: a.name, o: o.name });
    sev = 15;
  } else if (k === 'toll') {
    out.push('threat');
    a.momentum = clamp(a.momentum - 5, 0, 100);
    for (const m of a.members) addStress(s, m, 6, N('Recados da facção', 'Messages from the faction'));
    st.pr[a.id] = s.week + 26;
    t = fmtL(N('{a} se recusa a pagar o "pedágio" de {o}: a equipe recebe recados e os shows no território são cancelados.', '{a} refuses to pay {o}\'s "toll": the crew gets messages and the shows in their turf are cancelled.'), { a: a.name, o: o.name });
    sev = 22;
  } else {
    t = k === 'homage'
      ? fmtL(N('{a} se recusa a escrever sobre {o}.', '{a} refuses to write about {o}.'), { a: a.name, o: o.name })
      : fmtL(N('{a} recusa o convite de {o} para tocar {e}.', '{a} turns down {o}\'s invitation to play {e}.'), { a: a.name, o: o.name, e: evt(o) });
    if (a.image) a.image.professionalism = clamp(a.image.professionalism + 2, 0, 100);
    if (feudWith(s, a, o)) out.push('feud');
  }
  // movimento do gênero (movements9) com ato que topou: cresce mais rápido, carregando o estigma da facção
  if (d === 'play' || d === 'write') {
    const tv = tierOf(s, a.id);
    if (tv && tv.x.phase !== 'death' && tv.x.phase !== 'canon') { tv.mv.strength = clamp(tv.mv.strength + 0.4, 0, 100); out.push('movement'); }
  }
  const e = pushLog(s, { o: o.id, a: a.id, ...(lb ? { lb } : {}), k, d, out, p: Math.round(dec.p * 100) / 100, t });
  emitFact(s, { kind: 'faction_approach', actors: [a.id, o.key, ...(lb ? [lb] : [])], place: a.city, severity: sev, visibility: vis, tags: ['aff29', 'npc', k, d, ...out],
    text: t, src: 'aff29npc', data: { o: o.id, k, d, ...(lb ? { lb } : {}) } });
  if (s.knowledge[a.id] && !s.config.contentFilters?.includes('crime')) notify(s, t, 'info');
  return e;
}

// ================================================================ gancho mensal

const CANDS = new WeakMap<GameState, number>();
registerSimHook('month', 'aff29npc', (s) => {
  if (OFF29N.all) return;
  const afs = affs29(s);
  if (!afs.length) return;
  const r = Rng.fromSeed(`${s.config.seed}:aff29npc:${mIdx(s)}`);
  // índice da cena: gênero exato e família → afinidades
  const byG = new Map<string, (Aff29 & { org: Org17 })[]>(), byF = new Map<FamilyId, (Aff29 & { org: Org17 })[]>();
  for (const af of afs) {
    for (const g of af.genres) (byG.get(g) ?? byG.set(g, []).get(g)!).push(af);
    for (const f of af.fams ?? []) (byF.get(f) ?? byF.set(f, []).get(f)!).push(af);
  }
  const c = crime17(s);
  const pool = new Map<(Aff29 & { org: Org17 }), Act[]>();
  const a3c = new Map<string, string>();
  for (const a of actsNow27(s)) {
    if (!live(a) || mineA(a) || a.debutYear > s.year) continue;
    const g = byG.get(a.genre), f = byF.get(familyOf(a.genre));
    if (!g && !f) continue;
    const a3 = a3c.get(a.city) ?? a3c.set(a.city, a3Of(s, a.city)).get(a.city)!;
    for (const af of [...(g ?? []), ...(f ?? [])]) if (af.org.a3 === a3 && (c.down[af.org.id] ?? 0) <= s.week) (pool.get(af) ?? pool.set(af, []).get(af)!).push(a);
  }
  const st = peek29n(s);
  const n: Record<string, number> = {};
  let tot = 0;
  for (const af of afs) {
    const acts = pool.get(af);
    if (!acts?.length) continue;
    const o = af.org;
    const cap = af.stigma >= 0.6 ? 2 : 1;
    const dil = Math.max(1, acts.length / 40);
    for (const a of acts) {
      if ((n[o.id] ?? 0) >= cap) break;
      if (st && s.week - (st.last[`${o.id}|${a.id}`] ?? -1e9) < 52) continue;
      const p = clamp((0.012 + af.stigma * 0.02) * clamp(0.4 + a.fame / 40, 0.4, 2.2) / dil, 0, 0.1);
      if (!r.chance(p) || approachBlock29n(s, o, a)) continue;
      approach29n(s, af, a, r);
      n[o.id] = (n[o.id] ?? 0) + 1; tot++;
    }
  }
  CANDS.set(s, tot);
  // limpeza: intervalos velhos e pressões vencidas
  const st2 = peek29n(s);
  if (st2) {
    for (const [k, w] of Object.entries(st2.last)) if (s.week - w > 104) delete st2.last[k];
    for (const [k, w] of Object.entries(st2.pr)) if (w < s.week || !s.acts[k]) delete st2.pr[k];
    for (const [k, w] of Object.entries(st2.res)) if (w < s.week || !s.acts[k]) delete st2.res[k];
    for (const [k, oid] of Object.entries(st2.tie)) if (crime17(s).ties[k] !== oid) delete st2.tie[k]; // laço cortado no crimenpc17
    for (const [k, w] of Object.entries(st2.fd ?? {})) {
      if (s.week - w < 52) continue;
      if ((crime17(s).feud[k] ?? 0) <= 15) delete crime17(s).feud[k]; // ninguém alimentou (só o crimenpc17 sobe rixa de atos ligados)
      delete st2.fd![k];
    }
  }
});

// ================================================================ leitura (ficha, card, selo, testes)

/** Abordagens a um ato (mais recentes primeiro). */
export const actLog29n = (s: GameState, actId: string): Ap29n[] => (peek29n(s)?.log ?? []).filter((e) => e.a === actId).reverse();
/** Atos da cena que a organização abordou (card). */
export const orgLog29n = (s: GameState, oid: string): Ap29n[] => (peek29n(s)?.log ?? []).filter((e) => e.o === oid.replace(/^o:/, '')).reverse();
/** Abordagens a atos de um selo (ficha do selo rival). */
export const labelLog29n = (s: GameState, lbId: string): Ap29n[] => (peek29n(s)?.log ?? []).filter((e) => e.lb === lbId).reverse();
export const DEC29N: Record<Dec29n, L> = { play: N('tocou', 'played'), write: N('gravou a faixa', 'recorded the track'), pay: N('pagou o pedágio', 'paid the toll'), refuse: N('recusou', 'refused') };
export const ASK29N: Record<Ask29n, L> = { baile: N('convite para tocar', 'invitation to play'), toll: N('pedágio', 'toll'), homage: N('faixa sobre eles', 'a track about them') };
export const OUT29N: Record<Out29n, L> = {
  raid: N('batida policial', 'police raid'), scandal: N('escândalo', 'scandal'), drop: N('dispensado(a) pelo selo', 'dropped by the label'), tie: N('passou a andar com eles', 'now runs with them'),
  threat: N('ameaças e shows cancelados', 'threats and cancelled shows'), feud: N('rixa com quem topou', 'feud with those who said yes'), case: N('caso na polícia', 'police case'),
  cash: N('cachê', 'fee'), movement: N('movimento cresce', 'movement grows'),
};
/** Abordagens feitas no último mês (testes/diagnóstico). */
export const lastMonth29n = (s: GameState): number => CANDS.get(s) ?? 0;

// ================================================================ ganchos do jogador (um caminho só)

const lastOf = (s: GameState, actId: string): Ap29n | undefined => actLog29n(s, actId)[0];
const B = {
  none: N('Nenhuma facção abordou este artista nos últimos 2 anos.', 'No faction approached this act in the last 2 years.'),
  mine: N('É um artista seu.', 'This is your act.'),
  strict: N('Vida real exata: não dá para inventar uma acusação contra artista real.', 'Exact real life: you cannot invent an accusation against a real artist.'),
  noTie: N('Ele(a) recusou a facção: não há ligação a denunciar.', 'They turned the faction down: there is no tie to report.'),
  done: N('Você já denunciou essa ligação neste ano.', 'You already reported this tie this year.'),
  free: N('Não está preso(a) ao esquema (nem laço, nem ameaça).', 'Not caught in the scheme (no tie, no threat).'),
  cash: N('Caixa insuficiente.', 'Not enough cash.'),
  noCrime: N('Conteúdo de crime desligado nesta partida.', 'Crime content is turned off in this run.'),
};
/** Por que não dá para denunciar (null = dá). */
export function denounceBlock29n(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a) return N('Inválido.', 'Invalid.');
  if (s.config.contentFilters?.includes('crime')) return B.noCrime;
  if (mineA(a)) return B.mine;
  const e = lastOf(s, actId);
  if (!e || s.week - e.w > 104) return B.none;
  if (e.d !== 'play' && e.d !== 'write' && !peek29n(s)?.tie[actId]) return B.noTie;
  if (histMode(s) === 'strict' && realAct29n(s, a)) return B.strict;
  if (s.week - (peek29n(s)?.den[actId] ?? -1e9) < 52) return B.done;
  return null;
}
export const denounceOdds29n = (s: GameState, actId: string): number => {
  const e = lastOf(s, actId);
  return clamp(0.45 + s.player.reputation.institutional / 200 + (e?.d === 'write' ? 0.15 : 0) + (peek29n(s)?.tie[actId] ? 0.1 : 0), 0.2, 0.9);
};
const mobBump = (s: GameState, oid: string, hos: number): void => {
  const m = (mob29(s).o[oid] ??= { res: 0, fear: 0, hos: 0, esc: 0 });
  m.hos = clamp(m.hos + hos, 0, 100);
  mob29(s).seq++;
};

/** "Denunciar a ligação" (imprensa/polícia): escândalo para o ato e caso contra a facção — com risco. */
export function denounce29n(s: GameState, actId: string): { ok: boolean; text: L } {
  const b = denounceBlock29n(s, actId);
  if (b) return { ok: false, text: b };
  const a = s.acts[actId], e = lastOf(s, actId)!, o = orgById(s, e.o);
  if (!o) return { ok: false, text: N('Inválido.', 'Invalid.') };
  const st = aff29n(s);
  st.den[actId] = s.week; st.seq++;
  const r = Rng.fromSeed(`${s.config.seed}:aff29npc:den:${actId}:${s.week}`);
  const lb = a.owner && a.owner !== 'player' ? a.owner : undefined;
  if (r.chance(denounceOdds29n(s, actId))) {
    scandal(s, a.id, 'crime', 45, fmtL(N('Denúncia: {a} trabalha para {o}, diz a imprensa.', 'Exposé: {a} works for {o}, the press says.'), { a: a.name, o: o.name }), { tags: ['aff29', 'denounce'] });
    if (!strictReal(s, o)) feedCase(s, o.key, o.a3, 15, 40, true);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
    a.trust = clamp(a.trust - (r.chance(0.5) ? 25 : 8), 0, 100);
    if (lb) s.rivalries[lb] = (s.rivalries[lb] ?? 0) + 8;
    mobBump(s, o.id, 20);
    grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 35, months: 24, src: 'aff29', text: fmtL(N('Denunciou a ligação de {a}', 'Reported {a}\'s tie'), { a: a.name }), quiet: true });
    emitFact(s, { kind: 'statement', actors: ['player', o.key, a.id], place: a.city, severity: 40, visibility: 'public', tags: ['crime', 'aff29', 'denounce'],
      text: fmtL(N('{c} leva à imprensa e à polícia a ligação de {a} com {o}.', '{c} takes {a}\'s tie to {o} to the press and the police.'), { c: s.config.companyName, a: a.name, o: o.name }), src: 'aff29npc' });
    return { ok: true, text: fmtL(N('A denúncia cola: escândalo para {a}, caso aberto contra {o}. Eles sabem de onde veio.', 'The exposé sticks: scandal for {a}, a case opened against {o}. They know where it came from.'), { a: a.name, o: o.name }) };
  }
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100);
  a.trust = clamp(a.trust - 10, 0, 100);
  if (lb) s.rivalries[lb] = (s.rivalries[lb] ?? 0) + 4;
  mobBump(s, o.id, 8);
  return { ok: false, text: fmtL(N('A imprensa não compra a história sobre {a}; {o} fica sabendo de onde veio.', 'The press does not buy the story about {a}; {o} learns where it came from.'), { a: a.name, o: o.name }) };
}

/** Custo do acerto para tirar o ato do esquema (pago à facção). */
export const rescueCost29n = (s: GameState, actId: string): number => { const e = lastOf(s, actId); const o = e ? orgById(s, e.o) : undefined; return money(s, 1500 + (o?.power ?? 50) * 30 + (s.acts[actId]?.fame ?? 0) * 40); };
export function rescueBlock29n(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a) return N('Inválido.', 'Invalid.');
  if (s.config.contentFilters?.includes('crime')) return B.noCrime;
  if (mineA(a)) return B.mine;
  const st = peek29n(s);
  const e = lastOf(s, actId);
  if (!e || s.week - e.w > 104) return B.none;
  if (!st?.tie[actId] && !((st?.pr[actId] ?? 0) > s.week)) return B.free;
  if ((st?.res[actId] ?? 0) > s.week) return N('Você já tirou este artista do esquema.', 'You already got this act out of the scheme.');
  const c = rescueCost29n(s, actId);
  if (freeCash20(s) < c) return cashWhy20(s, c, B.cash);
  return null;
}
/** "Tirar do esquema (oferecer proteção)": você paga o acerto; o ato sai do laço, confia em você e fica devendo. */
export function rescue29n(s: GameState, actId: string): { ok: boolean; text: L } {
  const b = rescueBlock29n(s, actId);
  if (b) return { ok: false, text: b };
  const a = s.acts[actId], e = lastOf(s, actId)!, o = orgById(s, e.o);
  if (!o) return { ok: false, text: N('Inválido.', 'Invalid.') };
  const st = aff29n(s);
  const cost = rescueCost29n(s, actId);
  post(s, `aff29free:${actId}:${s.week}`, -cost, 'legal', `Acerto com ${o.name.pt} (${a.name})`);
  if (crime17(s).ties[actId] === o.id) delete crime17(s).ties[actId];
  delete st.tie[actId]; delete st.pr[actId];
  st.res[actId] = s.week + 104; st.seq++;
  a.trust = clamp(a.trust + 15, 0, 100);
  grantHold(s, { holder: 'player', target: a.id, kind: 'favor', strength: 40, months: 48, src: 'aff29', text: fmtL(N('Tirado(a) do esquema de {o}', 'Got out of {o}\'s scheme'), { o: o.name }), quiet: true });
  mobBump(s, o.id, 5);
  emitFact(s, { kind: 'statement', actors: ['player', a.id, o.key], place: a.city, severity: 25, visibility: 'rumor', tags: ['aff29', 'rescue'],
    text: fmtL(N('Dizem que {c} pagou para tirar {a} do esquema de {o}.', 'Word is {c} paid to get {a} out of {o}\'s scheme.'), { c: s.config.companyName, a: a.name, o: o.name }), src: 'aff29npc' });
  return { ok: true, text: fmtL(N('Acerto feito com {o} ({v}): {a} sai do esquema, confia em você e fica devendo um favor. {x}', 'Settled with {o} ({v}): {a} is out of the scheme, trusts you and owes you a favor. {x}'), {
    o: o.name, v: usd(cost), a: a.name, x: a.owner ? N('Com selo: o buyout sai mais barato agora.', 'Signed: the buyout is cheaper now.') : N('Sem selo: a proposta de contrato pesa mais agora.', 'Unsigned: a contract offer weighs more now.'),
  }) };
}

// ================================================================ negociação (proposta e buyout)

/** Ato sob pressão de facção (ameaçado, dispensado, preso ao laço) ou tirado do esquema por você. */
export function pressure29n(s: GameState, actId: string): { k: 'res' | 'pr' | 'tie'; o: string } | null {
  const st = peek29n(s);
  if (!st) return null;
  const e = lastOf(s, actId);
  if (!e) return null;
  if ((st.res[actId] ?? 0) > s.week) return { k: 'res', o: e.o };
  if ((st.pr[actId] ?? 0) > s.week) return { k: 'pr', o: e.o };
  if (st.tie[actId]) return { k: 'tie', o: e.o };
  return null;
}
registerOfferMod('aff29npc', (s, act) => {
  const x = pressure29n(s, act.id);
  if (!x || x.k === 'tie') return null;
  const o = orgById(s, x.o);
  return x.k === 'res'
    ? { delta: 0.15, reason: fmtL(N('Você tirou o artista do esquema de {o} (deve um favor).', 'You got them out of {o}\'s scheme (they owe you).'), { o: o?.name ?? x.o }) }
    : { delta: 0.08, reason: fmtL(N('Sob pressão de {o}: quer mudar de ares.', 'Under pressure from {o}: wants a change of scene.'), { o: o?.name ?? x.o }) };
});
buyoutAdj29().push({
  price: (s, act) => (pressure29n(s, act.id) ? 0.75 : 1),
  willing: (s, act) => (pressure29n(s, act.id) ? 0.2 : 0),
});
