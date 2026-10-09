// Movimentos completos (rodada 9): camada sobre `s.movements` (culture.ts) com fundadores, núcleo,
// periferia e simpatizantes; manifesto; cidade; gêneros de origem; inimigos (críticos, censura,
// movimento rival); obras marcantes; força e ciclo de vida (nascimento → auge → comercialização ou
// repressão → racha → morte → revival ou cânone). Fins: censura, exílio, morte do líder, diluição no
// mercado, briga dos fundadores. Entrada por convite (relações/admiração) ou pedido com votação do
// núcleo. O jogador pode fundar um movimento com os próprios atos e aliados; NPCs também fundam.
// As cenas históricas de world4/scenes.ts viram movimentos com este modelo quando começam.

import { clamp, type Rng } from '../../core/rng';
import { CRITICS, censorshipIn } from '../../data/content';
import { cityById, familyOf, genreById, l, type L } from '../../data/world';
import { fashionOf, registerMovementGenres } from '../culture';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import type { Movement } from '../xtypes';
import { fmtL, nextId, notify, post, remember } from '../util';
import { MSG_HANDLERS } from './people/inbox';
import { addMsg, P } from './people/state';
import { actAdmiration, admiration, bonds } from './bonds9';
import { actBond, bump } from './social8';
import { HIST_SCENES, actInScene, sceneStage, type HistScene } from './world4/scenes';

export type MvPhase = 'birth' | 'peak' | 'commercial' | 'repression' | 'split' | 'death' | 'revival' | 'canon';
export type MvEnd = 'censorship' | 'exile' | 'leader_death' | 'dilution' | 'fight';
export type MvTier = 'founder' | 'core' | 'peri' | 'symp';
export interface MovX {
  founders: string[];
  core: string[];
  peri: string[];
  symp: string[];
  idea: L;
  parents: string[];
  enemies: { k: 'critic' | 'censor' | 'rival'; n: L }[];
  works: { y: number; t: string; a: string; q: number }[];
  phase: MvPhase;
  ph: number;
  peak: number;
  hist: { y: number; t: L }[];
  end?: { y: number; c: MvEnd };
  pl?: 1;
  scene?: string;
}
export interface Mov9State { m: Record<string, MovX>; scene: Record<string, string>; asked: Record<string, number>; tried?: number }

declare module '../ext4' { interface Ext4 { mov9: Mov9State } }
const init = (): Mov9State => ({ m: {}, scene: {}, asked: {} });
registerExt4('mov9', init);
export const mov9 = (s: GameState): Mov9State => {
  const x = s.x4 as unknown as { mov9?: Mov9State };
  x.mov9 ??= init();
  x.mov9.asked ??= {};
  return x.mov9;
};

export const PHASE_NAME: Record<MvPhase, L> = {
  birth: l('nascimento', 'birth'), peak: l('auge', 'peak'), commercial: l('comercialização', 'commercialization'), repression: l('repressão', 'repression'),
  split: l('racha', 'split'), death: l('morte', 'death'), revival: l('revival', 'revival'), canon: l('cânone', 'canon'),
};
export const MV_END_NAME: Record<MvEnd, L> = {
  censorship: l('censura', 'censorship'), exile: l('exílio', 'exile'), leader_death: l('morte do líder', 'leader\'s death'), dilution: l('diluição no mercado', 'market dilution'), fight: l('briga dos fundadores', 'founders\' fight'),
};
export const TIER_NAME: Record<MvTier, L> = { founder: l('fundador', 'founder'), core: l('núcleo', 'core'), peri: l('membro', 'member'), symp: l('simpatizante', 'sympathizer') };
const ENEMY_NAME = { critic: l('crítico', 'critic'), censor: l('censura', 'censorship'), rival: l('movimento rival', 'rival movement') };
export const enemyKind = (k: keyof typeof ENEMY_NAME): L => ENEMY_NAME[k];

const SCENE_END: Record<string, MvEnd> = { tropicalia: 'censorship', rio_bossa: 'exile', seattle: 'leader_death', kingston: 'leader_death', ny_punk: 'fight', lagos: 'censorship', manchester: 'dilution' };
const IDEAS: [string, string][] = [
  ['Contra a fórmula das rádios: {p} feito do jeito de {c}.', 'Against radio formula: {p} made the {c} way.'],
  ['Misturar o regional e o universal sem pedir licença.', 'Mixing the local and the universal without asking permission.'],
  ['A música como manifesto: cada disco é uma tomada de posição.', 'Music as manifesto: every record takes a stand.'],
  ['Faça você mesmo: selos, shows e fanzines próprios.', 'Do it yourself: our own labels, gigs and zines.'],
  ['Devolver o {p} às ruas de {c}.', 'Give {p} back to the streets of {c}.'],
  ['Antropofagia: engolir o estrangeiro e devolver algo nosso.', 'Cannibalism: swallow the foreign and give back something ours.'],
];

const live = (a?: Act) => !!a && (a.status === 'active' || a.status === 'emerging') && !a.deceased && a.members.length > 0;
const leadOf = (a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);
const mine = (s: GameState, a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const cityName = (id: string) => cityById[id]?.name ?? l(id);
export const mvById = (s: GameState, id?: string): Movement | undefined => (id ? s.movements.find((m) => m.id === id) : undefined);
export const members = (x: MovX) => [...x.founders, ...x.core, ...x.peri, ...x.symp];

function hist(x: MovX, y: number, t: L): void {
  x.hist.push({ y, t });
  if (x.hist.length > 10) x.hist.splice(1, 1);
}

/** Camada estendida de um movimento (cria na hora para saves antigos e movimentos novos). */
export function movX(s: GameState, mv: Movement, r?: Rng): MovX {
  const st = mov9(s);
  let x = st.m[mv.id];
  if (x) return x;
  const acts = mv.acts.map((id) => s.acts[id]).filter((a): a is Act => !!a).sort((a, b) => a.debutYear - b.debutYear || b.fame - a.fame);
  const hyb = bonds(s).list.find((b) => b.hybrid === mv.id);
  const parents = hyb ? [...new Set(hyb.a.map((id) => s.acts[id]?.genre).filter((g): g is string => !!g))] : [mv.parent];
  const pg = genreById[mv.parent]?.name ?? l(mv.parent);
  const c = cityName(mv.city);
  const tpl = IDEAS[(r ? r.int(0, IDEAS.length - 1) : mv.born) % IDEAS.length];
  x = {
    founders: acts.slice(0, 2).map((a) => a.id), core: acts.slice(2).map((a) => a.id), peri: [], symp: [],
    idea: fmtL(l(tpl[0], tpl[1]), { p: pg, c }), parents, enemies: enemiesFor(s, mv), works: [],
    phase: 'birth', ph: s.year, peak: mv.strength, hist: [{ y: mv.born, t: fmtL(l('Nasce em {c}.', 'Born in {c}.'), { c }) }],
  };
  st.m[mv.id] = x;
  return x;
}

function enemiesFor(s: GameState, mv: Movement): MovX['enemies'] {
  const fam = familyOf(mv.parent);
  const out: MovX['enemies'] = [];
  const cr = CRITICS.find((c) => c.start <= s.year && c.end >= s.year && (c.disfavored as string[]).includes(fam));
  if (cr) out.push({ k: 'critic', n: l(cr.name) });
  const mk = cityById[mv.city]?.market;
  if (mk && censorshipIn(s.year, mk).level >= 0.4) out.push({ k: 'censor', n: l('Censura do governo', 'Government censors') });
  const rv = s.movements.find((m) => m.id !== mv.id && s.year - m.born < 12 && (m.city === mv.city || familyOf(m.parent) === fam));
  if (rv) out.push({ k: 'rival', n: rv.name });
  return out;
}

/** Em que movimento (e camada) está um ato. */
let VER = 0;
const dirty = () => { VER++; };
const TIDX = new WeakMap<GameState, { sig: string; map: Map<string, { mv: Movement; x: MovX; tier: MvTier }> }>();
export function tierOf(s: GameState, actId: string): { mv: Movement; x: MovX; tier: MvTier } | undefined {
  const st = mov9(s);
  const sig = `${VER}:${s.movements.length}:${Object.keys(st.m).length}`;
  let c = TIDX.get(s);
  if (!c || c.sig !== sig) {
    const map = new Map<string, { mv: Movement; x: MovX; tier: MvTier }>();
    for (const mv of s.movements) {
      const x = st.m[mv.id];
      if (!x) continue;
      const put = (ids: string[], tier: MvTier) => { for (const id of ids) if (!map.has(id) && !(x.end && tier === 'symp')) map.set(id, { mv, x, tier }); };
      put(x.founders, 'founder'); put(x.core, 'core'); put(x.peri, 'peri'); put(x.symp, 'symp');
    }
    c = { sig, map };
    TIDX.set(s, c);
  }
  return c.map.get(actId);
}

/** Afinidade de um ato com os outros membros do seu movimento. */
export function memberAffinity(s: GameState, actId: string): { act: Act; v: number }[] {
  const t = tierOf(s, actId);
  const A = s.acts[actId];
  if (!t || !A) return [];
  return members(t.x).filter((id) => id !== actId && s.acts[id]).map((id) => ({ act: s.acts[id], v: Math.round((actAdmiration(s, A, id) + actBond(s, A, s.acts[id]).v) / 2) })).sort((a, b) => b.v - a.v);
}

function addMember(s: GameState, mv: Movement, x: MovX, a: Act, tier: MvTier): void {
  dirty();
  if (members(x).includes(a.id)) return;
  const cur = tierOf(s, a.id);
  if (cur && cur.tier !== 'symp') return;
  if (cur) cur.x.symp = cur.x.symp.filter((id) => id !== a.id);
  x[tier === 'founder' ? 'founders' : tier].push(a.id);
  if (tier !== 'symp') { a.movementId = mv.id; if (!mv.acts.includes(a.id)) mv.acts.push(a.id); }
  if (x.symp.length > 12) x.symp.shift();
  if (x.peri.length > 16) x.peri.shift();
  dirty();
}

export function leaveMovement(s: GameState, actId: string): void {
  dirty();
  const t = tierOf(s, actId);
  if (!t) return;
  for (const k of ['founders', 'core', 'peri', 'symp'] as const) t.x[k] = t.x[k].filter((id) => id !== actId);
  t.mv.acts = t.mv.acts.filter((id) => id !== actId);
  const a = s.acts[actId];
  if (a?.movementId === t.mv.id) a.movementId = undefined;
  dirty();
  hist(t.x, s.year, fmtL(l('{a} deixa o movimento.', '{a} leaves the movement.'), { a: a?.name ?? '?' }));
}

// ---------------------------------------------------------------- cenas históricas → movimentos

function mapScenes(s: GameState, r: Rng): void {
  const st = mov9(s);
  for (const sc of HIST_SCENES) {
    if (st.scene[sc.id]) continue;
    const stg = sceneStage(s, sc);
    if (stg === 'future' || stg === 'over') continue;
    const acts = Object.values(s.acts).filter((a) => live(a) && a.city === sc.city && sc.genres.includes(a.genre) && !tierOf(s, a.id));
    if (!acts.length && stg !== 'peak') continue;
    const mv: Movement = { id: nextId(s, 'mv'), name: { ...sc.name }, city: sc.city, parent: sc.genres[0], genreId: sc.genres[0], born: sc.from, strength: 15, fashion: { ...sc.look.label }, acts: [] };
    s.movements.push(mv);
    st.scene[sc.id] = mv.id;
    const x = movX(s, mv, r);
    x.scene = sc.id;
    dirty();
    x.parents = sc.genres.slice(0, 3);
    x.idea = { ...sc.arc[0] };
    x.hist = [{ y: sc.from, t: { ...sc.arc[0] } }];
    acts.sort((a, b) => a.debutYear - b.debutYear || b.fame - a.fame).forEach((a, i) => addMember(s, mv, x, a, i < 2 ? 'founder' : 'core'));
    if (stg !== 'rise') setPhase(s, mv, x, 'peak', { ...sc.arc[1] });
  }
}

function sceneMonth(s: GameState, mv: Movement, x: MovX, sc: HistScene): void {
  const stg = sceneStage(s, sc);
  for (const a of Object.values(s.acts)) if (live(a) && !tierOf(s, a.id) && actInScene(s, a, sc) && x.phase !== 'death') addMember(s, mv, x, a, x.founders.length < 2 ? 'founder' : 'core');
  const want: MvPhase = stg === 'rise' ? 'birth' : stg === 'peak' ? 'peak' : stg === 'decline' ? (SCENE_END[sc.id] === 'censorship' ? 'repression' : SCENE_END[sc.id] === 'fight' ? 'split' : 'commercial') : 'death';
  if (want === x.phase || x.phase === 'canon' || x.phase === 'revival' || (x.phase === 'death' && want !== 'death')) return;
  if (want === 'death') kill(s, mv, x, SCENE_END[sc.id] ?? 'dilution', { ...sc.arc[2] });
  else setPhase(s, mv, x, want, { ...(want === 'peak' ? sc.arc[1] : sc.arc[2]) });
}

// ---------------------------------------------------------------- ciclo de vida

function setPhase(s: GameState, mv: Movement, x: MovX, p: MvPhase, note?: L): void {
  if (x.phase === p) return;
  x.phase = p;
  x.ph = s.year;
  hist(x, s.year, note ?? fmtL(l('Fase: {p}.', 'Phase: {p}.'), { p: PHASE_NAME[p] }));
  const pl = members(x).find((id) => mine(s, s.acts[id]));
  if (pl || mv.strength > 25) remember(s, 'movement9', fmtL(l('{m}: {p}.', '{m}: {p}.'), { m: mv.name, p: PHASE_NAME[p] }), { actId: pl, important: !!pl });
}

function kill(s: GameState, mv: Movement, x: MovX, c: MvEnd, note?: L): void {
  x.end = { y: s.year, c };
  dirty();
  setPhase(s, mv, x, 'death', note ?? fmtL(l('Fim do movimento: {c}.', 'End of the movement: {c}.'), { c: MV_END_NAME[c] }));
  mv.strength *= 0.5;
  if (c === 'exile' || c === 'censorship') for (const id of x.founders) { const a = s.acts[id]; if (a && live(a)) a.momentum = clamp(a.momentum - 15, 0, 100); }
  if (c === 'fight' && x.founders.length >= 2) {
    const [a, b] = x.founders.map((id) => s.acts[id]);
    const pa = a && leadOf(a);
    const pb = b && leadOf(b);
    if (pa && pb) bump(s, pa, pb, -40, 'scene');
  }
  if (members(x).some((id) => mine(s, s.acts[id]))) notify(s, fmtL(l('O movimento {m} acabou ({c}).', 'The {m} movement is over ({c}).'), { m: mv.name, c: MV_END_NAME[c] }), 'bad');
}

function lifecycle(s: GameState, r: Rng, mv: Movement, x: MovX): void {
  const age = s.year - x.ph;
  const fs = x.founders.map((id) => s.acts[id]).filter(Boolean);
  if (x.phase !== 'death' && x.phase !== 'canon' && fs.length && fs.every((a) => a.deceased || a.members.every((p) => !s.persons[p]?.alive))) return kill(s, mv, x, 'leader_death');
  const mk = cityById[mv.city]?.market;
  const cens = mk ? censorshipIn(s.year, mk).level : 0;
  switch (x.phase) {
    case 'birth': if (mv.strength > 22 || (age >= 2 && r.chance(0.08))) setPhase(s, mv, x, 'peak'); break;
    case 'peak':
      for (const id of [...x.founders, ...x.core]) { const a = s.acts[id]; if (a && live(a)) a.momentum = clamp(a.momentum + 0.4, 0, 100); }
      if (cens >= 0.5 && r.chance(0.04)) { setPhase(s, mv, x, 'repression'); if (!x.enemies.some((e) => e.k === 'censor')) x.enemies.push({ k: 'censor', n: l('Censura do governo', 'Government censors') }); }
      else if (age >= 3 && r.chance(0.025)) setPhase(s, mv, x, 'commercial');
      break;
    case 'commercial':
      if (r.chance(0.05)) { const c = Object.values(s.acts).find((a) => live(a) && a.genre === mv.genreId && !tierOf(s, a.id)); if (c) addMember(s, mv, x, c, 'peri'); }
      if (age >= 2 && r.chance(0.03)) setPhase(s, mv, x, 'split', l('Os fundadores discordam sobre os rumos: racha.', 'The founders disagree on direction: split.'));
      else if (age >= 4 && r.chance(0.03)) kill(s, mv, x, 'dilution');
      break;
    case 'repression':
      for (const id of x.founders) { const a = s.acts[id]; if (a && live(a)) a.momentum = clamp(a.momentum - 0.6, 0, 100); }
      if (age >= 1 && r.chance(0.06)) kill(s, mv, x, r.chance(0.5) ? 'exile' : 'censorship');
      break;
    case 'split': if (age >= 1 && r.chance(0.06)) kill(s, mv, x, 'fight'); break;
    case 'revival': if (age >= 4 && r.chance(0.03)) setPhase(s, mv, x, 'canon', l('Depois do revival, o movimento entra para o cânone.', 'After the revival, the movement enters the canon.')); break;
    case 'death':
      if (s.year - (x.end?.y ?? s.year) >= 10) {
        if (x.works.length >= 3 || x.peak > 35) setPhase(s, mv, x, 'canon', l('Críticos e livros consagram o movimento: agora é cânone.', 'Critics and books enshrine the movement: it is now canon.'));
        else if (r.chance(0.004)) { setPhase(s, mv, x, 'revival', l('Uma nova geração redescobre o movimento: revival!', 'A new generation rediscovers the movement: revival!')); mv.strength = Math.max(mv.strength, 18); }
      }
      break;
    case 'canon': break;
  }
}

function membership(s: GameState, r: Rng, mv: Movement, x: MovX): void {
  if (x.phase === 'death' || x.phase === 'canon') return;
  // força: soma da fama do núcleo, periferia e obras
  const f = (ids: string[], k: number) => ids.reduce((v, id) => v + (s.acts[id] && live(s.acts[id]) ? s.acts[id].fame * k : 0), 0);
  const target = f([...x.founders, ...x.core], 0.35) + f(x.peri, 0.12) + f(x.symp, 0.04) + x.works.length * 2;
  mv.strength = clamp(mv.strength + (target - mv.strength) * 0.04, 0, 100);
  x.peak = Math.max(x.peak, mv.strength);
  // limpa quem acabou
  const np = x.peri.length;
  x.peri = x.peri.filter((id) => s.acts[id] && !s.acts[id].deceased);
  if (x.peri.length !== np) dirty();
  // convites: admiração dos membros ou laços com eles
  const voters = [...x.founders, ...x.core].map((id) => s.acts[id]).filter((a): a is Act => live(a));
  if (!voters.length) return;
  const fam = familyOf(mv.parent);
  const pool = Object.values(s.acts).filter((a) => live(a) && a.fame > 5 && !tierOf(s, a.id) && (a.city === mv.city || familyOf(a.genre) === fam));
  for (let i = 0; i < 2 && pool.length; i++) {
    const a = r.pick(pool);
    const v = voters.reduce((t, m) => t + (leadOf(m) ? admiration(s, leadOf(m)!, a.id) : 0) + actBond(s, m, a).v * 0.5, 0) / voters.length;
    if (v < 18 || !r.chance(0.25)) continue;
    const tier: MvTier = a.city === mv.city && x.phase !== 'commercial' ? 'peri' : 'symp';
    if (tier === 'symp' && (a.fame < 25 || x.symp.length >= 8)) continue;
    if (mine(s, a)) invite(s, mv, a, tier);
    else { addMember(s, mv, x, a, tier); if (mv.strength > 20) hist(x, s.year, fmtL(l('{a} entra ({t}).', '{a} joins ({t}).'), { a: a.name, t: TIER_NAME[tier] })); }
  }
  // periferia forte sobe para o núcleo
  const top = x.peri.map((id) => s.acts[id]).filter((a): a is Act => live(a)).sort((a, b) => b.fame - a.fame)[0];
  if (top && top.fame > 30 && r.chance(0.03)) { x.peri = x.peri.filter((id) => id !== top.id); x.core.push(top.id); dirty(); hist(x, s.year, fmtL(l('{a} passa ao núcleo.', '{a} moves into the core.'), { a: top.name })); }
}

function invite(s: GameState, mv: Movement, a: Act, tier: MvTier): void {
  if (P(s).inbox.some((m) => m.ref?.sys === 'mov9' && m.ref?.act === a.id && !m.resolved)) return;
  addMsg(s, {
    from: mv.name.pt, kind: 'deal', tone: 'good', expires: s.week + 8,
    subject: fmtL(l('Convite: movimento {m}', 'Invite: the {m} movement'), { m: mv.name }),
    body: fmtL(l('Os artistas de {m} admiram o trabalho de {a} e o convidam como {t}.', 'The {m} artists admire {a}\'s work and invite them in as {t}.'), { m: mv.name, a: a.name, t: TIER_NAME[tier] }),
    ref: { sys: 'mov9', mv: mv.id, act: a.id, tier },
    actions: [{ id: 'accept', label: l('Entrar', 'Join') }, { id: 'decline', label: l('Recusar', 'Decline') }],
  });
}

MSG_HANDLERS.mov9 = (s, m, action) => {
  const ref = m.ref ?? {};
  const mv = mvById(s, String(ref.mv));
  const a = s.acts[String(ref.act)];
  if (!mv || !a) return l('O convite perdeu a validade.', 'The invite is no longer valid.');
  if (action !== 'accept') return fmtL(l('{a} prefere seguir sem rótulo.', '{a} prefers to stay unlabeled.'), { a: a.name });
  const x = movX(s, mv);
  addMember(s, mv, x, a, (String(ref.tier) as MvTier) || 'peri');
  hist(x, s.year, fmtL(l('{a} aceita o convite.', '{a} accepts the invite.'), { a: a.name }));
  return fmtL(l('{a} agora faz parte de {m}.', '{a} is now part of {m}.'), { a: a.name, m: mv.name });
};

// ---------------------------------------------------------------- pedidos e fundação

/** Um ato pede para entrar; o núcleo vota (admiração + laços). */
export function requestJoin(s: GameState, mvId: string, actId: string): { ok: boolean; text: L; yes?: number; no?: number } {
  const mv = mvById(s, mvId);
  const a = s.acts[actId];
  if (!mv || !a) return { ok: false, text: l('Movimento inválido.', 'Invalid movement.') };
  const x = movX(s, mv);
  const st = mov9(s);
  if (x.phase === 'death' || x.phase === 'canon') return { ok: false, text: l('O movimento já acabou.', 'The movement is over.') };
  const cur = tierOf(s, a.id);
  if (cur && cur.tier !== 'symp') return { ok: false, text: l('Já está num movimento.', 'Already in a movement.') };
  if ((st.asked[a.id] ?? -99) > s.week - 26) return { ok: false, text: l('Pediu há pouco; espere uns meses.', 'Asked recently; wait a few months.') };
  st.asked[a.id] = s.week;
  const voters = [...x.founders, ...x.core].map((id) => s.acts[id]).filter((v): v is Act => live(v));
  let yes = 0;
  for (const v of voters) if ((leadOf(v) ? admiration(s, leadOf(v)!, a.id) : 0) + actBond(s, v, a).v * 0.5 + (v.city === a.city ? 8 : 0) > 4) yes++;
  const no = voters.length - yes;
  if (!voters.length || yes > no) {
    const tier: MvTier = a.city === mv.city ? 'peri' : 'symp';
    addMember(s, mv, x, a, tier);
    hist(x, s.year, fmtL(l('O núcleo aprova {a} ({y}×{n}).', 'The core approves {a} ({y}–{n}).'), { a: a.name, y: yes, n: no }));
    return { ok: true, yes, no, text: fmtL(l('Aprovado por {y}×{n}: {a} entra como {t}.', 'Approved {y}–{n}: {a} joins as {t}.'), { y: yes, n: no, a: a.name, t: TIER_NAME[tier] }) };
  }
  return { ok: false, yes, no, text: fmtL(l('Recusado por {n}×{y}. Lance discos melhores ou aproxime-se dos membros.', 'Rejected {n}–{y}. Release better records or get closer to the members.'), { y: yes, n: no }) };
}

export interface FoundSpec { name: string; idea: string; city: string; genre: string; acts: string[]; allies: string[] }
export const FOUND_COST = 8000_00;

/** Chance (0..1) de um movimento pegar: momento cultural, críticos, cidade, obras fortes e aliados. */
export function foundChance(s: GameState, o: FoundSpec): number {
  const acts = [...o.acts, ...o.allies].map((id) => s.acts[id]).filter((a): a is Act => live(a));
  if (!acts.length) return 0;
  const pop = s.genrePop[o.genre] ?? 0.8;
  const scene = s.scenes[`${o.city}:${o.genre}`] ?? 0;
  const q = acts.map((a) => { const rs = a.releases.slice(-2).map((id) => s.releases[id]).filter(Boolean); return rs.length ? Math.max(...rs.map((x) => x.q)) : 40; });
  const best = Math.max(...q);
  const crit = s.player.reputation.artistic;
  const local = acts.filter((a) => a.city === o.city).length;
  const fame = acts.reduce((v, a) => v + a.fame, 0) / acts.length;
  const x = (pop - 0.9) * 1.2 + scene / 12 + (best - 60) / 20 + (crit - 50) / 60 + (local - 1) * 0.3 + o.allies.length * 0.25 + fame / 80 - 0.8;
  return clamp(1 / (1 + Math.exp(-x * 1.8)), 0.03, 0.92);
}

export function foundMovement(s: GameState, r: Rng, o: FoundSpec, npc = false): { ok: boolean; text: L; id?: string } {
  const st = mov9(s);
  const name = o.name.trim().slice(0, 40);
  if (!name || !o.acts.length) return { ok: false, text: l('Dê um nome e escolha pelo menos um ato.', 'Give it a name and pick at least one act.') };
  if (!cityById[o.city] || !genreById[o.genre]) return { ok: false, text: l('Cidade ou gênero inválido.', 'Invalid city or genre.') };
  if (o.acts.some((id) => { const t = tierOf(s, id); return t && t.tier !== 'symp'; })) return { ok: false, text: l('Um dos atos já está em outro movimento.', 'One of the acts is already in another movement.') };
  if (!npc) {
    if ((st.tried ?? -99) > s.week - 26) return { ok: false, text: l('Você tentou há pouco; espere uns meses.', 'You tried recently; wait a few months.') };
    if (s.player.cash < FOUND_COST) return { ok: false, text: l('Caixa insuficiente para o lançamento do manifesto.', 'Not enough cash to launch the manifesto.') };
    st.tried = s.week;
    post(s, `mov9:found`, -FOUND_COST, 'marketing', `Manifesto: ${name}`);
  }
  // aliados aceitam se admiram o(s) ato(s) fundador(es)
  const allies = o.allies.filter((id) => { const a = s.acts[id]; return live(a) && !tierOf(s, id) && o.acts.some((f) => actAdmiration(s, a, f) + actBond(s, a, s.acts[f]).v * 0.5 > 0); });
  const p = foundChance(s, { ...o, allies });
  if (!r.chance(p)) {
    if (!npc) remember(s, 'movement9', fmtL(l('O manifesto "{n}" não pegou: a imprensa ignorou e o público não entendeu.', 'The "{n}" manifesto did not catch on: the press ignored it and the public did not get it.'), { n: name }), { actId: o.acts[0] });
    return { ok: false, text: fmtL(l('Não pegou ({p}% de chance). Tente com obras mais fortes, mais aliados ou noutro momento.', 'It did not catch on ({p}% chance). Try with stronger works, more allies or at another moment.'), { p: Math.round(p * 100) }) };
  }
  const id = nextId(s, 'mv');
  const mv: Movement = { id, name: l(name), city: o.city, parent: o.genre, genreId: `mv_${s.idSeq}`, born: s.year, strength: 18, fashion: fashionOf(s.year, familyOf(o.genre)), acts: [] };
  s.movements.push(mv);
  registerMovementGenres(s);
  s.genrePop[mv.genreId] = Math.max(0.6, s.genrePop[o.genre] ?? 0.7);
  const x = movX(s, mv, r);
  x.idea = l(o.idea.trim().slice(0, 160) || x.idea.pt, o.idea.trim().slice(0, 160) || x.idea.en);
  x.founders = [];
  x.core = [];
  dirty();
  if (!npc) x.pl = 1;
  for (const a of o.acts) { const A = s.acts[a]; if (A) addMember(s, mv, x, A, 'founder'); }
  for (const a of allies) { const A = s.acts[a]; if (A) addMember(s, mv, x, A, A.city === o.city ? 'core' : 'symp'); }
  for (const a of [...o.acts, ...allies]) { const A = s.acts[a]; if (A) A.momentum = clamp(A.momentum + 10, 0, 100); }
  remember(s, 'movement9', fmtL(l('Nasce o movimento "{n}" em {c}: {i}', 'The "{n}" movement is born in {c}: {i}'), { n: name, c: cityName(o.city), i: x.idea }), { actId: o.acts[0], important: !npc });
  return { ok: true, id, text: fmtL(l('O movimento "{n}" pegou!', 'The "{n}" movement caught on!'), { n: name }) };
}

/** NPCs também fundam movimentos: um ato notável e aliados próximos da mesma cidade. */
function npcFound(s: GameState, r: Rng): void {
  if (!r.chance(0.01)) return;
  const cand = Object.values(s.acts).filter((a) => live(a) && a.fame > 30 && !mine(s, a) && !tierOf(s, a.id));
  if (!cand.length) return;
  const A = r.pick(cand);
  const allies = cand.filter((b) => b !== A && b.city === A.city && familyOf(b.genre) === familyOf(A.genre) && actBond(s, A, b).v + actAdmiration(s, A, b.id) > 20).slice(0, 3).map((b) => b.id);
  if (!allies.length) return;
  const pg = genreById[A.genre]?.name ?? l(A.genre);
  const nm = r.pick(['Nova', 'Novo', 'Neo', 'Pós', 'Movimento']);
  foundMovement(s, r, { name: `${nm} ${pg.pt.split(' ')[0]} ${cityName(A.city).pt.split(' ')[0]}`, idea: '', city: A.city, genre: A.genre, acts: [A.id], allies }, true);
}

// ---------------------------------------------------------------- ganchos

registerSimHook('month', 'mov9', (s, r) => {
  mapScenes(s, r);
  const st = mov9(s);
  for (const mv of s.movements) {
    const x = movX(s, mv, r);
    const sc = x.scene ? HIST_SCENES.find((h) => h.id === x.scene) : undefined;
    if (sc) sceneMonth(s, mv, x, sc);
    else lifecycle(s, r, mv, x);
    membership(s, r, mv, x);
  }
  npcFound(s, r);
  // poda: movimentos mortos há muito sem obras perdem as camadas extras
  for (const [id, x] of Object.entries(st.m)) if (!s.movements.some((m) => m.id === id) || (x.phase === 'death' && x.end && s.year - x.end.y > 40 && !x.works.length)) delete st.m[id];
  const ks = Object.keys(st.asked);
  if (ks.length > 60) for (const k of ks.slice(0, ks.length - 60)) delete st.asked[k];
});

registerSimHook('launch', 'mov9', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || rel.q < 62) return;
  const t = tierOf(s, rel.actId);
  if (!t || t.tier === 'symp') return;
  t.x.works.push({ y: s.year, t: rel.title, a: rel.actId, q: Math.round(rel.q) });
  t.x.works.sort((a, b) => b.q - a.q);
  if (t.x.works.length > 6) t.x.works.length = 6;
});
