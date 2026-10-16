// r23: a jornada do primeiro disco num fio só. O Projeto musical é a espinha: em cada etapa existe UM
// próximo passo recomendado (e as telas especialistas ficam como atalhos opcionais). Aqui só se lê o
// estado — nada muda — para a interface e os testes concordarem sobre "o que fazer agora".

import { agendaById } from '../../data/people';
import { l, type L } from '../../data/world';
import { defaultAgenda, freeCapacity, slotWeek } from '../agenda';
import { agendaLoad } from '../capacity';
import { unrecorded, unreleasedRecorded } from '../production';
import type { Act, AgendaSlot, GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { ag7 } from '../agenda';
import { needSongs, projectSession, projectStage, type MusicProject } from './project8';

/** r23: as sete paradas da jornada (ids estáveis; a interface traduz). */
export type Step23 = 'artist' | 'songs' | 'busy' | 'record' | 'release' | 'promo' | 'debrief';
export const STEPS23: Step23[] = ['artist', 'songs', 'busy', 'record', 'release', 'promo', 'debrief'];

/** r23: trabalho já marcado (composição ou gravação) — semana do mês e se é este mês ou o próximo. */
export interface Booked23 { action: 'compose' | 'record' | 'session'; week: number; next: boolean; day?: number; days?: number }

/** r23: agenda do mês como o jogador a vê (delegada = a sugerida). */
export function agendaNow23(s: GameState, a: Act): AgendaSlot[] {
  return s.delegated[a.id] !== false ? defaultAgenda(s, a) : (s.agenda[a.id] ?? []);
}

/** r23: ocupação da agenda do mês × capacidade livre da formação (em %). */
export function load23(s: GameState, a: Act): { load: number; cap: number } {
  return { load: agendaLoad(agendaNow23(s, a)), cap: freeCapacity(s, a) };
}

/** r23: a ação já está marcada? Fila desta semana em diante primeiro; senão, a agenda — que roda na abertura
 *  deste mês (se ainda não abriu) ou do próximo. */
export function bookedAction23(s: GameState, a: Act, action: 'compose' | 'record'): Booked23 | null {
  const st = ag7(s);
  const q = st.queue.filter((x) => x.actId === a.id && x.slot.action === action).sort((x, y) => x.week - y.week)[0];
  if (q) return { action, week: q.week, next: false };
  const slots = agendaNow23(s, a);
  const i = slots.findIndex((x) => x.action === action);
  if (i < 0) return null;
  return { action, week: slotWeek(slots[i], i), next: !!s.clock?.opened };
}

/** r23: trabalho já em andamento ou marcado para o projeto (sessão > gravação > composição). */
export function booked23(s: GameState, a: Act, p?: MusicProject): Booked23 | null {
  const sess = p ? projectSession(s, p) : s.sessions.find((x) => !x.done && x.actId === a.id);
  if (sess) return { action: 'session', week: 0, next: false, day: sess.dayDone, days: sess.days };
  const missing = p ? p.songIds.length < needSongs(p.type) : !unrecorded(s, a).length && !unreleasedRecorded(s, a).length;
  const unrec = p ? p.songIds.some((id) => s.songs[id] && !s.songs[id].recorded) : unrecorded(s, a).length > 0;
  if (unrec) { const r = bookedAction23(s, a, 'record'); if (r) return r; }
  if (missing) return bookedAction23(s, a, 'compose');
  return null;
}

/**
 * r23: o próximo passo recomendado — função pura do estado.
 * 1 sem artista → artist · 2 sem música → songs · 3 trabalho já marcado → busy · 4 música escrita → record ·
 * 5 gravação pronta → release (capa, verba e data) · 6 lançamento programado → promo · 7 depois → debrief.
 */
export function nextStep23(s: GameState, actId?: string, p?: MusicProject): Step23 {
  const ids = playerActs(s);
  const a = s.acts[p?.actId ?? actId ?? ''] ?? s.acts[ids[0]];
  if (!a || !ids.length) return 'artist';
  if (p) {
    const st = projectStage(s, p);
    if (st === 'released' || st === 'followup') return 'debrief';
    if (st === 'scheduled') return 'promo';
    if (st === 'finishing') return 'release';
    if (booked23(s, a, p)) return 'busy';
    // falta música → compor primeiro; com o mínimo do formato, gravar o que está escrito
    if (st === 'concept' || st === 'writing') return 'songs';
    return 'record';
  }
  if (booked23(s, a)) return 'busy';
  if (unrecorded(s, a).length) return 'record';
  if (unreleasedRecorded(s, a).length) return 'release';
  return 'songs';
}

/** r23: frase "Composição já agendada para a semana N" (com sessão em estúdio e mês seguinte). */
export function bookedText23(b: Booked23): L {
  if (b.action === 'session') return fmtL(l('Gravação em andamento: dia {d} de {n}.', 'Recording in progress: day {d} of {n}.'), { d: b.day ?? 0, n: b.days ?? 0 });
  const name = b.action === 'compose' ? l('Composição', 'Writing') : l('Gravação', 'Recording');
  return b.next
    ? fmtL(l('{a} já agendada para a semana {w} do mês que vem.', '{a} already scheduled for week {w} of next month.'), { a: name, w: b.week })
    : fmtL(l('{a} já agendada para a semana {w}.', '{a} already scheduled for week {w}.'), { a: name, w: b.week });
}

/** r23: nome da ação da agenda (para "o que sairia"). */
export const agendaName23 = (id: string): L => agendaById[id]?.name ?? l(id, id);
