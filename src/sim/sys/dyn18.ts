// Rodada 18 (U1) — "Dinâmica" (Football Manager): o estado social mostrado em vez de escondido. Lê o que já
// existe — relações entre pessoas, líder do ato, laços (bonds9), personalidade (persona13), promessas e
// obrigações (talks/holds17), estresse (stress17), moral e lealdade da equipe — e devolve hierarquia (pirâmide
// de influência), grupos, porta-voz, quem apoia quem e alertas ("se irritar um, irrita o grupo"). Puro.

import { l, type L } from '../../data/world';
import { holdsBetween } from '../holds17';
import { actState } from '../people';
import { stressOf, type StressLevel } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, playerActs } from '../util';
import { bondsOfPerson, BOND_NAME } from './bonds9';
import { openPromises } from './people/talks';
import { careerOf } from './people/staff';
import { cliques, influence } from './people/social';
import { per13 } from './persona13';
import { overall } from './talent/attrs';
import { staffRoleById } from '../../data/rules';

export interface DynNode {
  key: string;
  name: string;
  role: L;
  infl: number;
  /** 0 líder · 1 influente · 2 base · 3 periferia */
  tier: number;
  mood: number;
  moodWhy: L;
  stress?: StressLevel;
  promises: number;
  friends: string[];
  foes: string[];
  tags: L[];
}
export interface DynGroup { name: L; members: string[]; leader?: string }
export interface Dyn18 { nodes: DynNode[]; groups: DynGroup[]; spokes?: string; tension: number; notes: L[] }
export const TIER18: L[] = [l('Líder', 'Leader'), l('Influentes', 'Influential'), l('Base', 'Core'), l('Periferia', 'Fringe')];

const tierOf = (rank: number, n: number): number => (rank === 0 ? 0 : rank < Math.max(2, Math.ceil(n * 0.35)) ? 1 : rank < Math.ceil(n * 0.8) ? 2 : 3);
const ROLE: Record<string, L> = { vocal: l('Voz', 'Vocals'), guitar: l('Guitarra', 'Guitar'), bass: l('Baixo', 'Bass'), drums: l('Bateria', 'Drums'), keys: l('Teclado', 'Keys'), horns: l('Sopros', 'Horns'), dj: l('DJ', 'DJ'), producer: l('Produção', 'Producer'), mc: l('MC', 'MC'), strings: l('Cordas', 'Strings'), synthetic: l('IA', 'AI') };

/** Grupos conectados por relações positivas fortes (> limite). */
function components(ids: string[], rel: (a: string, b: string) => number, lim = 30): string[][] {
  const seen = new Set<string>(), out: string[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const g: string[] = [], q = [id];
    seen.add(id);
    while (q.length) { const x = q.pop()!; g.push(x); for (const y of ids) if (!seen.has(y) && rel(x, y) > lim && rel(y, x) > lim) { seen.add(y); q.push(y); } }
    out.push(g);
  }
  return out;
}

// ---------------------------------------------------------------- banda

export function dynBand(s: GameState, a: Act): Dyn18 {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive);
  const rel = (x: string, y: string) => s.persons[x]?.rel[y] ?? 0;
  const infl = (p: Person): number => {
    const P = per13(s, `p:${p.id}`);
    const avgIn = ms.length > 1 ? ms.filter((o) => o.id !== p.id).reduce((t, o) => t + rel(o.id, p.id), 0) / (ms.length - 1) : 0;
    return (a.leaderId === p.id ? 30 : 0) + overall(s, p) * 0.4 + (P ? (P.facets.ego - 50) * 0.25 + (P.attrs.cha - 50) * 0.3 : 0) + avgIn * 0.3 + (p.role === 'vocal' ? 6 : 0);
  };
  const ranked = ms.map((p) => ({ p, v: infl(p) })).sort((x, y) => y.v - x.v);
  const nodes: DynNode[] = ranked.map(({ p, v }, i) => {
    const st = stressOf(s, p.id);
    const others = ms.filter((o) => o.id !== p.id);
    const tags: L[] = bondsOfPerson(s, p.id).filter((b) => !b.end).map((b) => BOND_NAME[b.k]);
    if (p.goal === 'solo') tags.push(l('sonha com carreira solo', 'dreams of going solo'));
    if (p.resentment > 50) tags.push(l('ressentido(a)', 'resentful'));
    const prom = openPromises(s, p.id).length + holdsBetween(s, p.id, 'player').filter((h) => h.kind === 'promise' && h.status === 'open').length;
    return {
      key: `p:${p.id}`, name: p.name, role: ROLE[p.role] ?? l(p.role, p.role), infl: Math.round(v), tier: tierOf(i, ms.length), mood: Math.round(p.morale),
      moodWhy: p.morale < 35 ? l('moral baixa', 'low morale') : p.morale > 70 ? l('feliz', 'happy') : l('estável', 'steady'),
      stress: st.level, promises: prom,
      friends: others.filter((o) => rel(p.id, o.id) > 30).map((o) => `p:${o.id}`), foes: others.filter((o) => rel(p.id, o.id) < -20).map((o) => `p:${o.id}`), tags,
    };
  });
  const groups = components(ms.map((p) => p.id), rel).filter((g) => g.length >= 2).map((g, i) => {
    const lead = ranked.find((x) => g.includes(x.p.id))?.p;
    return { name: fmtL(l('Grupo {n}', 'Group {n}'), { n: i + 1 }), members: g.map((x) => `p:${x}`), leader: lead ? `p:${lead.id}` : undefined };
  });
  let neg = 0, pairs = 0;
  for (const x of ms) for (const y of ms) if (x !== y) { pairs++; if (rel(x.id, y.id) < 0) neg += -rel(x.id, y.id); }
  const tension = Math.round(Math.min(100, (pairs ? neg / pairs : 0) * 1.5 + ms.reduce((t, p) => t + p.resentment, 0) / Math.max(1, ms.length) * 0.5));
  const notes: L[] = [];
  const top = nodes[0];
  if (top && top.mood < 40) notes.push(fmtL(l('{n} lidera e está insatisfeito(a): o humor dele(a) contamina o grupo.', '{n} leads and is unhappy: their mood spreads to the group.'), { n: top.name }));
  for (const n of nodes) for (const f of n.foes) if (n.key < f) { const o = nodes.find((x) => x.key === f); if (o && o.foes.includes(n.key)) notes.push(fmtL(l('{a} e {b} não se suportam.', '{a} and {b} can\'t stand each other.'), { a: n.name, b: o.name })); }
  if (groups.length >= 2) notes.push(l('A banda está rachada em grupos: decisões dividem o ensaio.', 'The band is split into factions: decisions divide the room.'));
  for (const n of nodes) if (n.stress === 'breaking') notes.push(fmtL(l('{n} está à beira de quebrar.', '{n} is close to breaking.'), { n: n.name }));
  const st = actState(s, a);
  if (st.morale > 70 && tension < 15) notes.push(l('Vestiário unido: rende mais no estúdio e no palco.', 'A united room: better in the studio and on stage.'));
  return { nodes, groups, spokes: a.leaderId && ms.some((p) => p.id === a.leaderId) ? `p:${a.leaderId}` : top?.key, tension, notes };
}

// ---------------------------------------------------------------- elenco (atos do selo)

export function dynRoster(s: GameState): Dyn18 {
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.playerBand);
  const ranked = acts.map((a) => ({ a, v: influence(s, a) })).sort((x, y) => y.v - x.v);
  const nodes: DynNode[] = ranked.map(({ a, v }, i) => {
    const st = actState(s, a);
    const prom = a.members.reduce((t, m) => t + openPromises(s, m).length, 0);
    const tags: L[] = [];
    if (a.trust < 35) tags.push(l('desconfia de você', 'distrusts you'));
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (c && c.endWeek - s.week < 26 && c.endWeek > s.week) tags.push(l('contrato no fim', 'contract ending'));
    if (a.fame >= 60) tags.push(l('estrela da casa', 'house star'));
    return { key: `a:${a.id}`, name: a.name, role: l(a.genre, a.genre), infl: Math.round(v), tier: tierOf(i, acts.length), mood: Math.round(st.morale), moodWhy: fmtL(l('confiança {t}', 'trust {t}'), { t: Math.round(a.trust) }), promises: prom, friends: [], foes: [], tags };
  });
  const groups = cliques(s, 'genre').filter((c) => c.acts.length >= 2).map((c) => ({ name: c.label, members: c.acts.map((x) => `a:${x}`), leader: c.leader ? `a:${c.leader}` : undefined }));
  const notes: L[] = [];
  const top = nodes[0];
  if (top && nodes.length >= 2) notes.push(top.mood < 40 ? fmtL(l('{n} é a voz do elenco e está infeliz: os outros notam como você o trata.', '{n} is the roster\'s voice and is unhappy: others watch how you treat them.'), { n: top.name }) : fmtL(l('{n} é a voz do elenco: agradá-lo(a) acalma os demais.', '{n} is the roster\'s voice: keeping them happy calms the rest.'), { n: top.name }));
  for (const g of groups) { const ld = nodes.find((n) => n.key === g.leader); if (ld && ld.mood < 40) notes.push(fmtL(l('Se {n} se irritar, o grupo {g} vai junto.', 'If {n} gets upset, the {g} group follows.'), { n: ld.name, g: g.name })); }
  const unhappy = nodes.filter((n) => n.mood < 35).length;
  const tension = Math.round(nodes.length ? (unhappy / nodes.length) * 100 : 0);
  return { nodes, groups, spokes: top?.key, tension, notes };
}

// ---------------------------------------------------------------- equipe

export function dynStaff(s: GameState): Dyn18 {
  const st = s.player.staff;
  const ranked = st.map((m) => ({ m, v: m.skill + Math.min(30, (s.week - m.hiredWeek) / 8) + careerOf(s, m).level * 8 })).sort((x, y) => y.v - x.v);
  const nodes: DynNode[] = ranked.map(({ m, v }, i) => {
    const loy = careerOf(s, m).loyalty;
    const yrs = (s.week - m.hiredWeek) / 52;
    return { key: `s:${m.id}`, name: m.name, role: staffRoleById[m.role]?.name ?? l(m.role, m.role), infl: Math.round(v), tier: tierOf(i, st.length), mood: Math.round(loy), moodWhy: fmtL(l('lealdade {v}', 'loyalty {v}'), { v: Math.round(loy) }), promises: 0, friends: [], foes: [], tags: yrs >= 3 ? [l('veterano(a) da casa', 'house veteran')] : yrs < 0.5 ? [l('recém-chegado(a)', 'newcomer')] : [] };
  });
  const vet = nodes.filter((n) => n.tags.some((t) => t.pt.startsWith('veterano'))).map((n) => n.key);
  const rookies = nodes.filter((n) => n.tags.some((t) => t.pt.startsWith('recém'))).map((n) => n.key);
  const groups: DynGroup[] = [];
  if (vet.length >= 2) groups.push({ name: l('Velha guarda', 'Old guard'), members: vet, leader: vet[0] });
  if (rookies.length >= 2) groups.push({ name: l('Novatos', 'Newcomers'), members: rookies, leader: rookies[0] });
  const notes: L[] = [];
  const low = nodes.filter((n) => n.mood < 40);
  if (low.length) notes.push(fmtL(l('{n} pode pedir as contas (lealdade baixa): salário em dia, aumento ou elogio ajudam.', '{n} may quit (low loyalty): paying on time, a raise or praise helps.'), { n: low.map((x) => x.name).join(', ') }));
  if (nodes[0] && nodes[0].mood < 40) notes.push(fmtL(l('{n} é a referência da equipe: se sair, leva gente junto.', '{n} is the team\'s anchor: if they leave, others follow.'), { n: nodes[0].name }));
  return { nodes, groups, spokes: nodes[0]?.key, tension: Math.round(nodes.length ? (low.length / nodes.length) * 100 : 0), notes };
}
