// Masters 31 (31.3 · F) — o grafo social ligado ao mundo: como as pessoas se conhecem, o que muda os laços, o mês social
// (apresentações por amigo em comum, fofoca/tomar partido, festivais, esfriar e limpar) e as leituras da interface
// ("como se conheceram", lista de conhecidos, "não te conhece"). O núcleo (estado e dimensões) mora em sim/social31.ts.
//
// Como se conhece alguém: contratar (assinatura, equipe, sessão), gravar ou tocar junto (créditos, abertura de show),
// festival (o mesmo palco no mês), premiação, apresentação por um amigo em comum, visitar o lugar onde a pessoa está
// (lazer, em leisure14). A imprensa só dá reconhecimento (know.ts), não intimidade.
// NPC↔NPC vale igual: artistas que tocaram juntos se conhecem, o CEO rival conhece quem assinou com ele, amigos
// apresentam amigos, e quem é próximo de um dos lados de uma rivalidade toma partido (fofoca).
//
// Sorte: só Rng.fromSeed com chave (semente|soc31|ano|mês) — nada do fluxo do motor. O mês social não mexe em nada
// fora do próprio grafo (os sistemas que leem intimidade e respeito leem daqui).

import { editions8 } from './feststore';
import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { onFact, type Fact } from '../facts17';
import { actsOfPerson17 } from '../actidx17';
import { hasOpinion, onOpinion, opinionOf } from '../opinion';
import {
  HOW31, SOC31, SOC31_PERF, closeness31, coolMonth31, edgeCount31, meNode31, meet31, neighbors31, node31, registerTieDeriver, shiftTie31, soc31, storedTie31, tie31,
  type How31, type Tie31,
} from '../social31';
import type { Act, GameState } from '../types';
import { fmtL } from '../util';
import { kinOf15 } from './kin15';
import { leaders } from './leaders10';
import { registerEditable, registerRunnable } from '../r31/editor';

// ---------------------------------------------------------------- laços estruturais (derivados, não guardados)

const liveAct = (a: Act): boolean => a.status !== 'retired' && a.status !== 'split';

registerTieDeriver((s, a, b) => {
  // mesma banda: trabalham juntos
  if (s.persons[a] && s.persons[b]) {
    const ab = actsOfPerson17(s, a).find((x) => liveAct(x) && x.members.includes(b));
    if (ab) return { how: 'band', i: 50, k: 3, since: undefined };
  }
  return undefined;
});
registerTieDeriver((s, a, b) => {
  // seu elenco e sua equipe conhecem você
  const me = meNode31(s);
  const other = a === me ? b : b === me ? a : '';
  if (!other) return undefined;
  if (other.startsWith('s:')) return s.player.staff.some((x) => `s:${x.id}` === other) ? { how: 'hire', i: 30, k: 3 } : undefined;
  if (s.persons[other] && actsOfPerson17(s, other).some((x) => liveAct(x) && (x.owner === 'player' || x.playerBand))) return { how: 'hire', i: 28, k: 3 };
  return undefined;
});
registerTieDeriver((s, a, b) => {
  if (!s.persons[a] || !s.persons[b]) return undefined;
  const k = kinOf15(s, a).find((x) => x.id === b);
  if (!k) return undefined;
  const close = k.rel === 'spouse' || k.rel === 'parent' || k.rel === 'child' || k.rel === 'sibling';
  return { how: 'family', i: k.rel === 'ex' ? 20 : close ? 65 : 35, k: k.rel === 'spouse' ? 3 : 2 };
});

// ---------------------------------------------------------------- quem é quem num fato

/** Nós de pessoas por trás de um ator de fato: pessoa → ela; ato → integrantes vivos (até 4); selo → líder; 'player' → você. */
function nodesOf(s: GameState, actor: string): string[] {
  if (!actor) return [];
  if (actor === 'player') return [meNode31(s)];
  if (s.persons[actor]) return s.persons[actor].alive ? [actor] : [];
  const a = s.acts[actor];
  if (a) return a.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer).slice(0, 4);
  const lb = s.labels[actor];
  if (lb) return lb.leaderId && leaders(s)?.L[lb.leaderId] ? [`l:${lb.leaderId}`] : [];
  if (/^(l|s|c|e|pd):/.test(actor)) return [actor];
  if (actor.startsWith('p:')) return nodesOf(s, actor.slice(2));
  return [];
}
/** Cabeça de cada ator (líder do ato, o próprio, o líder do selo) — para encontros entre grupos. */
function headOf(s: GameState, actor: string): string | undefined {
  const a = s.acts[actor];
  if (a) { const id = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members.find((m) => s.persons[m]?.alive); return id && !s.persons[id]?.isPlayer ? id : id ? meNode31(s) : undefined; }
  return nodesOf(s, actor)[0];
}

function pairwise(s: GameState, ns: string[], how: How31, worked = false, max = 5): void {
  const xs = [...new Set(ns)].slice(0, max);
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) meet31(s, xs[i], xs[j], how, { worked });
}
function cross(s: GameState, as: string[], bs: string[], how: How31, worked = false): void {
  for (const a of as) for (const b of bs) if (a !== b) meet31(s, a, b, how, { worked });
}

/** Quem conhece o protagonista (os laços guardados mais fortes) reage a um fato sobre ele. */
function reactAround(s: GameState, who: string, d: { r?: number; t?: number }, n = 12): void {
  const ns = neighbors31(s, who).map((b) => [b, storedTie31(s, b, who)?.i ?? 0] as const).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, n);
  for (const [b] of ns) shiftTie31(s, b, who, { r: d.r, t: d.t });
}

/** Listas de tipos de fato que fazem gente se conhecer ou mudam laços. */
const RECORD = new Set(['session_credit', 'cowrite_split', 'charity_single', 'feat', 'collab', 'tie']);

onFact('*', (s: GameState, f: Fact) => {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  factMeet(s, f);
  if (t0) SOC31_PERF.factMs += performance.now() - t0;
}, 'social31');

function factMeet(s: GameState, f: Fact): void {
  const k = f.kind;
  const A = f.actors;
  if (!A.length) return;
  switch (k) {
    case 'signing': {
      const act = A.find((x) => s.acts[x]);
      if (!act) return;
      const ms = nodesOf(s, act);
      const others = A.filter((x) => x !== act).flatMap((x) => nodesOf(s, x));
      cross(s, ms, others, A.includes('player') ? 'hire' : 'label', A.includes('player'));
      return;
    }
    case 'hire': case 'score_hired': {
      if (!A.includes('player')) return;
      const me = meNode31(s);
      cross(s, [me], A.filter((x) => x !== 'player').flatMap((x) => nodesOf(s, x)), 'hire', true);
      return;
    }
    case 'show': {
      const acts = A.filter((x) => s.acts[x] || x === 'player');
      if (acts.length < 2) return;
      const heads = acts.map((x) => (x === 'player' ? meNode31(s) : headOf(s, x))).filter((x): x is string => !!x);
      pairwise(s, heads, 'stage', true);
      return;
    }
    case 'award': {
      const ns = A.map((x) => headOf(s, x)).filter((x): x is string => !!x);
      pairwise(s, ns, 'award', false, 4);
      if (f.tags.includes('win') || f.tags.includes('winner') || f.severity >= 40) for (const n of ns.slice(0, 1)) reactAround(s, n, { r: 3 });
      return;
    }
    case 'feud': case 'rival_grudge': case 'diss': {
      const [a, b] = A.map((x) => headOf(s, x)).filter((x): x is string => !!x);
      if (a && b) shiftTie31(s, a, b, { v: 20, t: -8, tBack: -8, r: -3, rBack: -3 }, 'rival');
      return;
    }
    case 'poach': case 'betrayal': {
      const [a, b] = A.map((x) => headOf(s, x)).filter((x): x is string => !!x);
      if (a && b) shiftTie31(s, b, a, { t: -15, v: 10 }, 'rival');
      return;
    }
    case 'romance': case 'marriage': case 'affair': {
      const ps = A.filter((x) => s.persons[x]);
      if (ps.length >= 2) { meet31(s, ps[0], ps[1], 'romance'); shiftTie31(s, ps[0], ps[1], { i: 15, t: 5, tBack: 5 }, 'romance'); }
      return;
    }
    case 'breakup': {
      const ps = A.filter((x) => s.persons[x]);
      if (ps.length >= 2 && storedTie31(s, ps[0], ps[1])) shiftTie31(s, ps[0], ps[1], { i: -10, t: -10, tBack: -10 });
      return;
    }
    case 'favor': case 'forgiven': {
      const [a, b] = A.flatMap((x) => nodesOf(s, x));
      if (a && b) shiftTie31(s, b, a, { t: 8, i: 2 });
      return;
    }
    case 'scandal': case 'arrest': case 'payola': case 'stream_fraud': {
      const who = headOf(s, A[0]);
      if (who && f.severity >= 25) reactAround(s, who, { r: -Math.round(f.severity / 15), t: -1 });
      return;
    }
    case 'deal': {
      if (!A.includes('player')) return;
      const ns = A.filter((x) => x !== 'player' && (s.labels[x] || /^l:/.test(x))).flatMap((x) => nodesOf(s, x));
      cross(s, [meNode31(s)], ns, 'deal');
      return;
    }
    default:
      if (RECORD.has(k)) {
        const ns = A.flatMap((x) => (s.acts[x] ? [headOf(s, x)].filter((y): y is string => !!y) : nodesOf(s, x)));
        pairwise(s, ns, 'record', true);
      }
  }
}

// Gestos pessoais (presente, elogio, favor, crítica pública…) mexem na intimidade de quem já se conhece: aproximam
// devagar quando bons; os ruins pesam na confiança. Notícia sobre você não cria intimidade (só opinião).
onOpinion((s, key, d, gesture) => {
  if (!gesture || !(key.startsWith('p:') || key.startsWith('l:'))) return;
  const me = meNode31(s), n = node31(s, key);
  if (!storedTie31(s, me, n)) return;
  shiftTie31(s, me, n, d > 0 ? { i: Math.min(3, d / 4) } : { tBack: Math.max(-4, d / 4) });
});

// Rescindir o contrato de um ato (rescind31): a banda perde confiança em você e esfria — e quem soube do vazamento também.
onFact('contract_rescind', (s, f) => {
  const act = f.actors.find((x) => s.acts[x]);
  if (!act) return;
  const me = meNode31(s);
  for (const m of nodesOf(s, act)) shiftTie31(s, me, m, { i: -5, tBack: f.tags.includes('leak') ? -20 : -12 }, 'hire');
}, 'social31:rescind');

// Presente (objetos G, items31): quem recebe passa a conhecer você (se ainda não conhecia) e se aproxima.
onFact('gift', (s, f) => {
  const to = f.actors.find((x) => x !== 'player');
  if (!to || !f.actors.includes('player')) return;
  const me = meNode31(s);
  meet31(s, me, node31(s, to), 'other', { i: 12 });
  shiftTie31(s, me, node31(s, to), { i: 3, tBack: 2 });
}, 'social31:gift');

// ---------------------------------------------------------------- o mês social

const gone = (s: GameState) => (id: string): boolean => {
  if (id.startsWith('l:')) { const L0 = leaders(s)?.L[id.slice(2)]; return !L0 || L0.st === 'retired' || !!L0.died; }
  if (id.startsWith('s:')) return !s.player.staff.some((x) => `s:${x.id}` === id);
  if (id.includes(':')) return false;
  const p = s.persons[id];
  if (!p || !p.alive) return true;
  return !actsOfPerson17(s, id).some(liveAct);
};

/** Festivais do mês: quem divide o palco se conhece (cabeças do topo do cartaz e os atos do jogador). */
function festivalMonth(s: GameState): number {
  let n = 0;
  for (const ed of editions8(s)) {
    if (ed.year !== s.year || ed.month !== s.month) continue;
    const top = ed.lineup.slice(0, 4).map((x) => x.actId);
    const mine = ed.lineup.filter((x) => s.acts[x.actId]?.owner === 'player').map((x) => x.actId);
    const heads = [...new Set([...top, ...mine])].map((x) => headOf(s, x)).filter((x): x is string => !!x);
    pairwise(s, heads, 'festival', false, 6);
    n += heads.length;
  }
  return n;
}

/** Apresentações por amigo em comum (NPC↔NPC e, às vezes, para você) e fofoca (quem é próximo toma partido). */
function introMonth(s: GameState): { intro: number; sides: number } {
  const r = Rng.fromSeed(`${s.config.seed}|soc31|${s.year}|${s.month}`);
  const st = soc31(s);
  const keys = Object.keys(st.e);
  let intro = 0, sides = 0;
  if (!keys.length) return { intro, sides };
  const me = meNode31(s);
  const tries = Math.min(30, Math.ceil(keys.length / 20));
  for (let n = 0; n < tries; n++) {
    const key = keys[r.int(0, keys.length - 1)];
    const e = st.e[key];
    if (!e) continue;
    const [a, b] = key.split('|');
    const i = e[1] as number, v = e[6] as number;
    // apresentação: amigo (b) apresenta a a um amigo dele (c)
    if (i >= 45) {
      const [x, y] = r.chance(0.5) ? [a, b] : [b, a];
      const cs = neighbors31(s, y).filter((c) => c !== x && c !== me && (storedTie31(s, y, c)?.i ?? 0) >= 35 && !tie31(s, x, c));
      if (cs.length && x !== me) { meet31(s, x, cs[r.int(0, cs.length - 1)], 'intro', { by: y }); intro++; }
    }
    // fofoca: quem é próximo de um rival toma partido contra o outro
    if (v >= 40) {
      for (const [side, other] of [[a, b], [b, a]] as const) {
        const fr = neighbors31(s, side).filter((c) => c !== other && c !== me && (storedTie31(s, side, c)?.i ?? 0) >= 60).slice(0, 3);
        for (const c of fr) { if (tie31(s, c, other)) { shiftTie31(s, c, other, { r: -1, t: -1 }); sides++; } }
      }
    }
  }
  // para você: de vez em quando um amigo próximo apresenta alguém do círculo dele
  if (me !== 'player' && r.chance(0.25)) {
    const fr = neighbors31(s, me).filter((f) => (storedTie31(s, me, f)?.i ?? 0) >= 45 && s.persons[f]?.alive);
    if (fr.length) {
      const f = fr[r.int(0, fr.length - 1)];
      const cs = neighbors31(s, f).filter((c) => c !== me && !tie31(s, me, c) && s.persons[c]?.alive);
      if (cs.length) { meet31(s, me, cs[r.int(0, cs.length - 1)], 'intro', { by: f }); intro++; }
    }
  }
  return { intro, sides };
}

export function socialMonth31(s: GameState): void {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  festivalMonth(s);
  introMonth(s);
  coolMonth31(s, gone(s));
  const dt = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  SOC31_PERF.ms += dt; SOC31_PERF.months++; SOC31_PERF.max = Math.max(SOC31_PERF.max, dt);
}
registerSimHook('month', 'social31', (s) => socialMonth31(s));

// ---------------------------------------------------------------- leituras para a interface

export const HOW31_TXT: Record<How31, L> = {
  other: l('cruzaram-se por aí', 'crossed paths'),
  band: l('tocam na mesma banda', 'play in the same band'),
  label: l('negociaram um contrato', 'negotiated a contract'),
  hire: l('contrato de trabalho', 'work contract'),
  record: l('gravaram juntos', 'recorded together'),
  stage: l('dividiram o palco', 'shared a stage'),
  festival: l('no mesmo festival', 'at the same festival'),
  award: l('numa premiação', 'at an awards night'),
  intro: l('apresentados por um amigo em comum', 'introduced by a mutual friend'),
  visit: l('encontro num lugar da cidade', 'met somewhere in town'),
  family: l('família', 'family'),
  deal: l('fecharam negócio', 'closed a deal'),
  rival: l('na rivalidade', 'through a rivalry'),
  romance: l('romance', 'romance'),
  press: l('pela imprensa', 'through the press'),
};
export const CLOSE31_TXT: L[] = [l('conhecido', 'acquaintance'), l('colega', 'colleague'), l('amigo', 'friend'), l('próximo', 'close')];

/** Nome legível de um nó. */
export function nodeName31(s: GameState, n: string): string {
  if (s.persons[n]) return s.persons[n].name;
  if (n.startsWith('l:')) return leaders(s)?.L[n.slice(2)]?.name ?? '?';
  if (n.startsWith('s:')) return s.player.staff.find((x) => `s:${x.id}` === n)?.name ?? '?';
  if (n.startsWith('c:')) return n.slice(2);
  return n === 'player' ? s.config.companyName : '?';
}

/** "Como se conheceram": quando, como e por quem. */
export function howMet31(s: GameState, t: Tie31): L {
  const base = HOW31_TXT[t.how] ?? HOW31_TXT.other;
  const by = t.by ? fmtL(l(' (por {b})', ' (via {b})'), { b: nodeName31(s, t.by) }) : l('', '');
  if (t.derived || !t.since) return fmtL(l('{h}{b}', '{h}{b}'), { h: base, b: by });
  const y = s.config.startYear + Math.floor(t.since / 52);
  return fmtL(l('{h}{b}, em {y}', '{h}{b}, in {y}'), { h: base, b: by, y });
}

/** Rótulo da relação (o que a interface mostra ao lado do nome). */
export function tieLabel31(s: GameState, a: string, b: string): L {
  const t = tie31(s, a, b);
  if (!t) return l('não se conhecem', 'have never met');
  if (t.v >= 60) return l('inimigos', 'enemies');
  if (t.v >= 30) return l('rivais', 'rivals');
  return CLOSE31_TXT[closeness31(t.i)];
}

/** A pessoa (chave de per13) te conhece? 'met' · 'name' (sabe quem você é / tem opinião por notícias) · 'none'. */
export function knowsMe31(s: GameState, key: string): 'met' | 'name' | 'none' {
  const me = meNode31(s);
  const n = node31(s, key);
  if (n === me) return 'met';
  if (tie31(s, me, n)) return 'met';
  if (key.startsWith('s:') || key.startsWith('ag:')) return 'met';
  if (hasOpinion(s, key)) return 'name';
  // gente da indústria (líderes de selo, críticos, imprensa) sabe quem é o dono de um selo com nome no mercado
  if (/^(l|c|m|e|pd):/.test(key) && (s.player.reputation.commercial + s.player.reputation.artistic) / 2 >= 30) return 'name';
  return 'none';
}

export interface Known31 { id: string; name: string; t: Tie31; op: number | null; kind: 'person' | 'leader' | 'staff' | 'critic' | 'other' }
/** Seus conhecidos (guardados + elenco/equipe), do mais próximo ao mais distante. */
export function myKnown31(s: GameState): Known31[] {
  const me = meNode31(s);
  const ids = new Set(neighbors31(s, me));
  for (const st of s.player.staff) ids.add(`s:${st.id}`);
  for (const a of Object.values(s.acts)) if (liveAct(a) && (a.owner === 'player' || a.playerBand)) for (const m of a.members) if (m !== me && s.persons[m]?.alive) ids.add(m);
  const out: Known31[] = [];
  for (const id of ids) {
    const t = tie31(s, me, id);
    if (!t) continue;
    const key = s.persons[id] ? `p:${id}` : id;
    const kind: Known31['kind'] = s.persons[id] ? 'person' : id.startsWith('l:') ? 'leader' : id.startsWith('s:') ? 'staff' : id.startsWith('c:') ? 'critic' : 'other';
    out.push({ id, name: nodeName31(s, id), t, op: hasOpinion(s, key) ? opinionOf(s, key) : null, kind });
  }
  return out.sort((a, b) => b.t.i - a.t.i || b.t.v - a.t.v || (a.name < b.name ? -1 : 1));
}

/** Amigo em comum que pode apresentar você a alguém (o mais próximo dos dois lados). */
export function introVia31(s: GameState, target: string): string | undefined {
  const me = meNode31(s);
  if (tie31(s, me, target)) return undefined;
  const fr = neighbors31(s, target).filter((f) => f !== me && (tie31(s, me, f)?.i ?? 0) >= 40 && (storedTie31(s, f, target)?.i ?? 0) >= 30);
  return fr.sort((a, b) => (tie31(s, me, b)?.i ?? 0) - (tie31(s, me, a)?.i ?? 0) || (a < b ? -1 : 1))[0];
}
/** Ação do jogador: pedir para o amigo em comum apresentar (só com o clique; não sorteia). */
export function askIntro31(s: GameState, target: string): L | null {
  const by = introVia31(s, target);
  if (!by) return l('Ninguém próximo de você conhece essa pessoa.', 'Nobody close to you knows this person.');
  meet31(s, meNode31(s), target, 'intro', { by });
  return null;
}

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({ id: 'soc31.cap', area: 'people', label: l('Grafo social: laços guardados por pessoa', 'Social graph: stored ties per person'), kind: 'number', raw: true, get: () => SOC31.cap, set: (_s, v) => { SOC31.cap = Math.max(5, Math.round(Number(v))); } });
registerEditable({ id: 'soc31.coolAfter', area: 'people', label: l('Grafo social: meses sem contato até esfriar', 'Social graph: months without contact before cooling'), kind: 'number', raw: true, get: () => SOC31.coolAfter, set: (_s, v) => { SOC31.coolAfter = Math.max(1, Math.round(Number(v))); } });
registerRunnable({ id: 'soc31.month', label: l('Rodar o mês social agora (apresentações, fofoca, esfriar)', 'Run the social month now (introductions, gossip, cooling)'), run: (s) => { socialMonth31(s); return fmtL(l('Laços guardados: {n}.', 'Stored ties: {n}.'), { n: edgeCount31(s) }); } });

export { HOW31 };
