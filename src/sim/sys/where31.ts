// R31 · onda 4 (I) — ONDE A PESSOA ESTÁ (agenda real), leitura pura e leve: a presença nos lugares da cidade segue a
// vida da pessoa — quem morreu some; quem está preso está na cela da delegacia; artista em turnê não aparece na cidade
// (está na cidade da data); quem grava está no estúdio. Sem sistemas importados (lê o estado direto, sem ganchos), para
// que place27 e as cenas possam usar sem mudar a ordem de carregamento.

import { cityById, l, type L } from '../../data/world';
import type { Act, GameState } from '../types';
import { fmtL } from '../util';
import { actsVersion17 } from '../actidx17';

export type Where31K = 'here' | 'gone' | 'jail' | 'tour' | 'studio';
export interface Where31 { k: Where31K; why: L; city?: string; until?: number }

const memo = new WeakMap<GameState, { w: number; n: number; v: number; m: Map<string, Act> }>();
/** Ato atual de cada pessoa (ativo primeiro), refeito por semana. */
export function actOfPid31(s: GameState, pid: string): Act | undefined {
  // R31 (DBTAM, desempenho): contar s.acts a cada consulta custava ~12% do mês com base grande; a contagem só é refeita
  // quando a versão de s.acts muda (actsTouched17 em toda entrada/saída de ato) — mesma regra de antes (semana + nº de atos)
  let c = memo.get(s);
  const v = actsVersion17(s);
  const n = c && c.v === v ? c.n : Object.keys(s.acts).length;
  if (c) c.v = v;
  if (!c || c.w !== s.week || c.n !== n) {
    const m = new Map<string, Act>();
    for (const a of Object.values(s.acts)) for (const p of a.members) {
      const old = m.get(p);
      if (!old || ((old.status === 'retired' || old.status === 'split') && a.status !== 'retired' && a.status !== 'split')) m.set(p, a);
    }
    c = { w: s.week, n, v, m };
    memo.set(s, c);
  }
  return c.m.get(pid);
}

/** Semana até quando a pessoa está presa (crime17), sem importar o sistema. */
export function jailUntil31(s: GameState, pid: string): number | undefined {
  const j = (s.x4 as unknown as { crime17?: { jail?: Record<string, { u: number }> } }).crime17?.jail?.[pid];
  return j && j.u > s.week ? j.u : undefined;
}

/** A turnê em andamento do ato e a cidade em que ele está nesta semana. */
export function tourCity31(s: GameState, actId: string): string | undefined {
  for (const t of s.tours ?? []) {
    if (t.actId !== actId || t.status !== 'running') continue;
    const next = t.stops.find((x) => x.status === 'scheduled' && x.day >= s.day);
    const last = [...t.stops].reverse().find((x) => x.status === 'played');
    return (next && (!last || next.day - s.day <= 7) ? next : last ?? next)?.cityId;
  }
  return undefined;
}

/** Onde a pessoa está nesta semana. `city` = a cidade do lugar que se olha (padrão: a sede). */
export function where31(s: GameState, pid: string, city = s.config.homeCity): Where31 {
  const p = s.persons[pid];
  if (!p || !p.alive) return { k: 'gone', why: l('Não está mais entre nós.', 'No longer with us.') };
  const u = jailUntil31(s, pid);
  if (u !== undefined) return { k: 'jail', why: fmtL(l('Preso(a) por mais {n} semana(s).', 'In prison for {n} more week(s).'), { n: u - s.week }), until: u };
  const a = actOfPid31(s, pid);
  if (a && a.status !== 'retired' && a.status !== 'split') {
    const tc = tourCity31(s, a.id);
    if (tc && tc !== city) return { k: 'tour', why: fmtL(l('Em turnê com {a} ({c}).', 'On tour with {a} ({c}).'), { a: a.name, c: cityById[tc]?.name ?? tc }), city: tc };
    if ((s.sessions ?? []).some((x) => !x.done && x.actId === a.id)) return { k: 'studio', why: fmtL(l('Gravando com {a}.', 'Recording with {a}.'), { a: a.name }) };
  }
  return { k: 'here', why: l('Na cidade.', 'In town.') };
}

/** Está na cidade e livre para aparecer num lugar (nem morta, nem presa, nem em turnê fora). */
export const inTown31 = (s: GameState, pid: string, city = s.config.homeCity): boolean => { const w = where31(s, pid, city).k; return w === 'here' || w === 'studio'; };

/** Atos (de qualquer dono) com data na cidade nesta semana — quem toca na semana. */
export function playingThisWeek31(s: GameState, city = s.config.homeCity): { actId: string; day: number }[] {
  const out: { actId: string; day: number }[] = [];
  for (const t of s.tours ?? []) {
    if (t.status !== 'running' && t.status !== 'planned') continue;
    for (const st of t.stops) if (st.cityId === city && st.status === 'scheduled' && st.day >= s.day && st.day - s.day < 7) out.push({ actId: t.actId, day: st.day });
  }
  return out.sort((a, b) => a.day - b.day || (a.actId < b.actId ? -1 : 1));
}
