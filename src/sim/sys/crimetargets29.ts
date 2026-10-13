// Rodada 29 — índice de alvos do Submundo para o seletor com busca (Submundo › Planos). "Deve ter opção para todos os
// personagens": todas as pessoas (integrantes, artistas solo, produtores, empresários, líderes de selo, críticos, a sua
// equipe), todos os atos e todos os selos que já existem no ano — nada do futuro (future.ts). O tipo errado para a ação
// (pessoa numa ação contra ato…) e quem está fora (morto, você, seu elenco) aparecem com o motivo (targetBlock17).
// Puro e sem registros: não mexe na simulação nem na ordem de carga dos sistemas. O índice é refeito por semana e por
// tipo de ação; a busca percorre só strings já normalizadas e devolve no máximo `max` resultados (sem milhares de
// <option> na tela).

import { REAL_MGRS } from '../../data/managers14';
import { REAL_PRODS } from '../../data/producers15';
import { l, type L } from '../../data/world';
import { visibleAct } from '../future';
import { activeCritics } from '../media';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { actsNow27 } from '../tickcache27';
import { isKey17, nameOf17, targetBlock17, targetsFor, type CrimeDef17 } from './crime17';
import { leaders } from './leaders10';
import { mgrKey, mgrName } from './managers14';
import { ROLE16, canon16, genMgrs16 } from './people16';
import { prodKey, prodName } from './producers15';
import { KEY16 } from './gone16';

export type TGrp29 = 'person' | 'industry' | 'act' | 'label' | 'other';
export interface TCand29 {
  /** id de alvo (pessoa do banco: id puro; indústria: chave 'pd:'/'e:'/'l:'/'c:'/'s:'; ato; selo) */
  id: string;
  name: string;
  /** detalhe curto: ato, cargo, dono */
  hint: L;
  grp: TGrp29;
  /** fama/reputação (ordem) */
  fame: number;
  /** nome + detalhe normalizados (busca sem acento) */
  k: string;
  /** só o nome, normalizado (ordem: quem começa com o termo) */
  n: string;
  /** já morreu (vai para o fim da busca; o motivo aparece) */
  dead?: 1;
}
export interface TRes29 extends TCand29 { block: L | null }

export const TGRP29: Record<TGrp29, L> = {
  person: l('Pessoas — artistas', 'People — artists'),
  industry: l('Pessoas — indústria (produção, empresários, selos, crítica, equipe)', 'People — industry (production, managers, labels, critics, staff)'),
  act: l('Artistas (atos)', 'Acts'),
  label: l('Selos', 'Labels'),
  other: l('Alvos', 'Targets'),
};

/** Ordem dos grupos na busca (cada grupo fica contínuo, com um cabeçalho só). */
const ORD29: Record<TGrp29, number> = { person: 0, industry: 1, act: 2, label: 3, other: 4 };

/** Minúsculas e sem acento (busca tolerante: "joao" acha "João"). */
export const norm29 = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Grupo "certo" para o tipo de ação (os outros aparecem, mas com o motivo). */
const want29 = (tk: string): TGrp29[] => (tk === 'person' ? ['person', 'industry'] : tk === 'act' ? ['act'] : tk === 'label' ? ['label'] : ['other']);
const kindOf29 = (tk: string): 'world' | 'own' => (tk === 'person' || tk === 'act' || tk === 'label' ? 'world' : 'own');

const CACHE = new WeakMap<GameState, { key: string; list: TCand29[] }>();

function build29(s: GameState): TCand29[] {
  const out: TCand29[] = [];
  const add = (id: string, name: string, hint: L, grp: TGrp29, fame: number, dead = false) => out.push({ id, name, hint, grp, fame, k: norm29(`${name} ${hint.pt} ${hint.en}`), n: norm29(name), ...(dead ? { dead: 1 as const } : {}) });
  const mine = new Set(playerActs(s));
  // atos (só os que já estrearam ou que você já conhece) e o ato de cada pessoa
  const actOf = new Map<string, { name: string; fame: number; live: boolean }>();
  for (const a of actsNow27(s)) {
    if (!visibleAct(s, a)) continue;
    const live = a.status !== 'retired' && a.status !== 'split';
    for (const m of a.members) { const o = actOf.get(m); if (!o || (live && !o.live) || (live === o.live && a.fame > o.fame)) actOf.set(m, { name: a.name, fame: a.fame, live }); }
    const owner = mine.has(a.id) || a.owner === 'player' ? l('seu elenco', 'your roster') : a.owner && s.labels[a.owner] ? l(s.labels[a.owner].name) : l('independente', 'independent');
    add(a.id, a.name, live ? owner : fmtL(l('{o} · encerrado', '{o} · ended'), { o: owner }), 'act', a.fame);
  }
  // pessoas do banco: quem está num ato visível, ou sem ato nenhum e já nascido (parentes, ex-integrantes)
  const inAnyAct = new Set<string>();
  for (const a of actsNow27(s)) for (const m of a.members) inAnyAct.add(m);
  for (const p of Object.values(s.persons)) {
    if (p.isPlayer) continue;
    const a = actOf.get(p.id);
    if (!a && (inAnyAct.has(p.id) || (p.born ?? 0) > s.year)) continue;
    add(p.id, p.name, !a ? l('sem banda agora', 'no act right now') : a.name === p.name ? l('artista solo', 'solo artist') : l(a.name), 'person', a?.fame ?? 0, !p.alive);
  }
  // gente da indústria (sem repetir quem também é artista: a chave canônica dessa pessoa é 'p:')
  const seen = new Set<string>();
  const ind = (key: string, name: string, hint: L, fame: number) => {
    if (seen.has(key)) return;
    seen.add(key);
    const c = canon16(s, key);
    if (c.startsWith('p:') && s.persons[c.slice(2)]) return;
    add(key, name, hint, 'industry', fame, KEY16.st(s, key) === 'dead');
  };
  for (const m of [...REAL_MGRS, ...genMgrs16(s)]) if (s.year >= m.from) ind(mgrKey(m.id), mgrName(s, m), ROLE16.manager, 40);
  for (const p of REAL_PRODS) if (s.year >= p.from) ind(prodKey(p.id), prodName(s, p), ROLE16.producer, 40);
  for (const L0 of Object.values(leaders(s)?.L ?? {})) {
    const lb = L0.label ? s.labels[L0.label] : undefined;
    ind(`l:${L0.id}`, L0.name, lb && L0.st === 'active' ? fmtL(l('{r} · {b}', '{r} · {b}'), { r: ROLE16.ceo, b: lb.name }) : ROLE16.ceo, lb?.reputation ?? 20);
  }
  for (const c of activeCritics(s)) ind(`c:${c.name}`, c.name, fmtL(l('{r} · {o}', '{r} · {o}'), { r: ROLE16.critic, o: c.outlet }), 35);
  for (const st of s.player.staff) ind(`s:${st.id}`, st.name, l('sua equipe', 'your staff'), 5);
  // selos
  for (const lb of Object.values(s.labels)) add(lb.id, lb.name, lb.active ? l('selo', 'label') : l('selo fechado', 'closed label'), 'label', lb.reputation);
  return out;
}

/** Todos os candidatos para o tipo de ação (cache por semana; pessoas, indústria, atos e selos — ou a lista própria). */
export function candidates29(s: GameState, c: CrimeDef17): TCand29[] {
  if (kindOf29(c.tk) === 'own') return targetsFor(s, c, 1e6).map((x) => ({ id: x.id, name: x.name.pt, hint: x.name, grp: 'other' as const, fame: 0, k: norm29(`${x.name.pt} ${x.name.en}`), n: norm29(x.name.pt) }));
  const key = `${s.year}|${s.week}|${Object.keys(s.persons).length}|${Object.keys(s.acts).length}`;
  const hit = CACHE.get(s);
  if (hit && hit.key === key) return hit.list;
  const list = build29(s);
  CACHE.set(s, { key, list });
  return list;
}

/**
 * Busca: todas as palavras precisam aparecer (nome ou detalhe, sem acento). Ordem: o grupo certo para a ação primeiro
 * (cada grupo contínuo), vivos antes de mortos, depois quem começa com o termo, depois fama. Sem termo: as sugestões de sempre (targetsFor, os mais famosos).
 * Devolve no máximo `max` resultados, cada um com o motivo quando não vale, e o total encontrado.
 */
export function search29(s: GameState, c: CrimeDef17, q: string, max = 30, actor = 'player'): { list: TRes29[]; total: number } {
  const all = candidates29(s, c);
  const words = norm29(q).split(/\s+/).filter(Boolean);
  const want = new Set(want29(c.tk));
  let hits: TCand29[];
  if (!words.length) {
    const byId = new Map(all.map((x) => [x.id, x]));
    hits = targetsFor(s, c).map((x) => byId.get(x.id)).filter((x): x is TCand29 => !!x);
  } else {
    const first = words[0];
    hits = all.filter((x) => words.every((w) => x.k.includes(w)));
    hits.sort((a, b) => (want.has(b.grp) ? 1 : 0) - (want.has(a.grp) ? 1 : 0) || ORD29[a.grp] - ORD29[b.grp] || (a.dead ?? 0) - (b.dead ?? 0) || (b.n.startsWith(first) ? 1 : 0) - (a.n.startsWith(first) ? 1 : 0) || b.fame - a.fame || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
  }
  const total = hits.length;
  return { list: hits.slice(0, max).map((x) => ({ ...x, block: targetBlock17(s, c, x.id, actor) })), total };
}

/** Um candidato pelo id (para mostrar o alvo escolhido com nome e detalhe). */
export function cand29(s: GameState, c: CrimeDef17, id: string): TRes29 | null {
  const x = candidates29(s, c).find((y) => y.id === id) ?? (kindOf29(c.tk) === 'world' ? build29Any(s, id) : null);
  return x ? { ...x, block: targetBlock17(s, c, x.id) } : null;
}
/** Alvo fora do índice (ex.: preset do menu de alguém que o índice não lista): nome cru. */
function build29Any(s: GameState, id: string): TCand29 | null {
  const key = isKey17(id);
  const n = key ? nameOf17(s, id) : s.persons[id]?.name ?? s.acts[id]?.name ?? s.labels[id]?.name;
  if (!n || n === id) return null;
  const grp: TGrp29 = key ? 'industry' : s.persons[id] ? 'person' : s.acts[id] ? 'act' : 'label';
  return { id, name: n, hint: l(''), grp, fame: 0, k: norm29(n), n: norm29(n) };
}
