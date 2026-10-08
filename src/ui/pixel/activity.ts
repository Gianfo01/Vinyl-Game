// Atividade visível de cada pessoa na sede, derivada só do estado (GDD "aquário gerencial"):
// a agenda do mês decide se a banda grava, compõe, descansa, ensaia, está fora ou à toa.

import { agendaById } from '../../data/people';
import { staffRoleById } from '../../data/rules';
import { l, type L } from '../../data/world';
import type { Act, GameState } from '../../sim/types';
import type { IconName } from './icons';

export type ActivityKind = 'away' | 'hiatus' | 'record' | 'write' | 'rest' | 'rehearse' | 'idle' | 'work';

export interface Activity {
  kind: ActivityKind;
  actId?: string;
  /** ação de agenda que originou a atividade */
  action?: string;
  label: L;
  icon: IconName;
}

const has = (actions: string[], ...ids: string[]) => ids.some((x) => actions.includes(x));

/** Atividade de um ato do jogador neste mês. */
export function actActivity(s: GameState, act: Act): Activity {
  const actId = act.id;
  if (act.status === 'hiatus' || (act.hiatusUntil !== undefined && act.hiatusUntil > s.week))
    return { kind: 'hiatus', actId, label: l('Em pausa, longe da sede', 'On hiatus, away from HQ'), icon: 'sleep' };
  const actions = (s.agenda[actId] ?? []).map((x) => x.action);
  if (has(actions, 'gigs', 'tour')) return { kind: 'away', actId, action: 'gigs', label: l('Na estrada: shows do mês', 'On the road: this month\'s gigs'), icon: 'tour-bus' };
  if (has(actions, 'record')) return { kind: 'record', actId, action: 'record', label: l('Gravando no estúdio', 'Recording in the studio'), icon: 'mic' };
  if (has(actions, 'compose')) return { kind: 'write', actId, action: 'compose', label: l('Compondo músicas', 'Writing songs'), icon: 'sparkle' };
  if (has(actions, 'workshop')) return { kind: 'write', actId, action: 'workshop', label: l('Oficina de composição', 'Songwriting workshop'), icon: 'sparkle' };
  if (has(actions, 'rest')) return { kind: 'rest', actId, action: 'rest', label: l('Descansando', 'Resting'), icon: 'sleep' };
  if (has(actions, 'residency_art')) return { kind: 'rest', actId, action: 'residency_art', label: l('Residência artística', 'Art residency'), icon: 'sparkle' };
  if (has(actions, 'rehearse')) return { kind: 'rehearse', actId, action: 'rehearse', label: l('Ensaiando', 'Rehearsing'), icon: 'guitar' };
  if (has(actions, 'train')) return { kind: 'rehearse', actId, action: 'train', label: l('Treinando', 'Practicing'), icon: 'drums' };
  const first = actions.find((a) => agendaById[a]);
  if (first) {
    const n = agendaById[first].name;
    return { kind: 'idle', actId, action: first, label: l(`Pela sede · ${n.pt}`, `Around HQ · ${n.en}`), icon: 'clock' };
  }
  return { kind: 'idle', actId, label: l('Pela sede', 'Around HQ'), icon: 'clock' };
}

/** Ato (preferindo os do jogador) de que a pessoa faz parte. */
export function actOfPerson(s: GameState, personId: string): Act | undefined {
  let found: Act | undefined;
  for (const a of Object.values(s.acts)) {
    if (!a.members.includes(personId)) continue;
    if (a.owner === 'player' && a.status !== 'retired' && a.status !== 'split') return a;
    found ??= a;
  }
  return found;
}

/**
 * Atividade de uma pessoa. 'away' e 'hiatus' significam que ela não aparece na sede.
 * Pessoas fora do elenco do jogador ficam 'idle'.
 */
export function personActivity(s: GameState, personId: string): Activity {
  const p = s.persons[personId];
  if (p && !p.alive) return { kind: 'away', label: l('Ausente', 'Absent'), icon: 'skull' };
  const act = actOfPerson(s, personId);
  if (!act) return { kind: 'idle', label: l('Pela sede', 'Around HQ'), icon: 'clock' };
  if (act.owner !== 'player') return { kind: 'away', actId: act.id, label: l('Fora da sede', 'Away from HQ'), icon: 'globe' };
  return actActivity(s, act);
}

/** Equipe sempre trabalha na sua mesa (ou na técnica, para produtor e engenheiro). */
export function staffActivity(s: GameState, staffId: string): Activity {
  const st = s.player.staff.find((x) => x.id === staffId);
  const role = st ? staffRoleById[st.role] : undefined;
  const name = role?.name ?? l('Equipe', 'Staff');
  return { kind: 'work', label: l(`${name.pt} · trabalhando`, `${name.en} · working`), icon: 'contract' };
}

/** Pessoas aparecem na sede? */
export function isPresent(a: Activity): boolean {
  return a.kind !== 'away' && a.kind !== 'hiatus';
}
