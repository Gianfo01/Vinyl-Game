// Rodada 29 (REORG, S04/S05 + M05 da Bíblia de UI/UX) — modelo do INSPETOR lateral de um ato (artista/banda), puro.
// Cinco abas, todas lidas das fontes que já existem (nada é copiado nem recalculado de outro jeito):
//   Formação  → integrantes atuais (s.acts[].members + pessoas: função e saúde); a formação por período fica na ficha
//   Projetos  → project8.openProjects + sessões de estúdio abertas
//   Contratos → contratos vigentes do jogador com o ato + promessas (promises28)
//   Agenda    → agenda do mês (s.agenda) e prazos do calendário que apontam para o ato
//   Saúde     → people.actState (moral, cansaço, estresse, inspiração) + integrantes com problema de saúde
// As AÇÕES vêm do menu de contexto (ctx27model.menuSections27): uma fonte só para o clique direito, a ficha e o inspetor.

import { l, type L } from '../../data/world';
import { calendar19 } from '../../sim/calendar19';
import { actionName } from '../../sim/capacity';
import { actState } from '../../sim/people';
import { STAGE_NAMES, openProjects, projectStage } from '../../sim/sys/project8';
import { PROM28_NAME, promiseRows28 } from '../../sim/sys/promises28';
import { ROLE_NAMES } from '../../sim/sys/talent/attrs';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { isSpecial29, termTxt29 } from '../../sim/terms29';
import type { Hue29 } from './shell29';

export type InspTab29 = 'lineup' | 'projects' | 'contracts' | 'agenda' | 'health';
export const INSP_TABS29: { id: InspTab29; label: L; icon: string }[] = [
  { id: 'lineup', label: l('Formação', 'Lineup'), icon: 'people' },
  { id: 'projects', label: l('Projetos', 'Projects'), icon: 'cassette' },
  { id: 'contracts', label: l('Contratos', 'Contracts'), icon: 'contract' },
  { id: 'agenda', label: l('Agenda', 'Schedule'), icon: 'calendar' },
  { id: 'health', label: l('Saúde', 'Health'), icon: 'heart' },
];

export interface InspRow29 { title: L | string; meta?: L | string; pill?: { label: L; hue: Hue29 }; go?: { area: string; tab?: [string, string] }; person?: string }
export interface Insp29 { id: string; name: string; kind: L; status: { label: L; hue: Hue29 }; tabs: Record<InspTab29, InspRow29[]>; empty: Record<InspTab29, L> }

const safe = <T>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };
const HEALTH: Record<string, { label: L; hue: Hue29 }> = {
  ok: { label: l('bem', 'fine'), hue: 'good' }, voice_strain: { label: l('voz cansada', 'voice strain'), hue: 'warn' }, burnout: { label: l('esgotado', 'burnout'), hue: 'bad' },
  addiction: { label: l('dependência', 'addiction'), hue: 'bad' }, recovering: { label: l('em recuperação', 'recovering'), hue: 'warn' }, ill: { label: l('doente', 'ill'), hue: 'bad' },
};
const STATUS: Record<string, { label: L; hue: Hue29 }> = {
  active: { label: l('Ativo', 'Active'), hue: 'good' }, hiatus: { label: l('Em hiato', 'On hiatus'), hue: 'warn' },
  retired: { label: l('Aposentado', 'Retired'), hue: 'muted' }, split: { label: l('Separado', 'Split'), hue: 'muted' },
};
const meter = (v: number, bad: boolean): Hue29 => (bad ? (v >= 70 ? 'bad' : v >= 45 ? 'warn' : 'good') : v <= 30 ? 'bad' : v <= 55 ? 'warn' : 'good');

/** O inspetor de um ato (ou null se o ato não existe). Só leitura. */
export function insp29(s: GameState, actId: string): Insp29 | null {
  const a = s.acts[actId];
  if (!a) return null;
  const members = a.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
  const lineup: InspRow29[] = members.map((p) => ({ title: p.name, meta: ROLE_NAMES[p.role] ?? l(p.role, p.role), pill: HEALTH[p.health] ?? HEALTH.ok, person: p.id }));
  const projects: InspRow29[] = [
    ...safe(() => openProjects(s).filter((p) => p.actId === actId), [] as ReturnType<typeof openProjects>).map((p) => ({ title: p.title || p.type.toUpperCase(), meta: STAGE_NAMES[projectStage(s, p)], pill: { label: l('em andamento', 'in progress'), hue: 'accent' as Hue29 }, go: { area: 'project' } })),
    ...(s.sessions ?? []).filter((x) => x.actId === actId && !x.done).map((x) => ({ title: l('Sessão de estúdio', 'Studio session'), meta: fmtL(l('dia {d} de {n}', 'day {d} of {n}'), { d: x.dayDone, n: x.days }), pill: { label: l('gravando', 'recording'), hue: 'info' as Hue29 }, go: { area: 'studio' } })),
  ];
  const contracts: InspRow29[] = [
    ...Object.values(s.contracts).filter((c) => c.actId === actId && c.party === 'player' && c.endWeek >= s.week).map((c) => ({
      title: c.model === 'management' ? l('Você é o empresário', 'You are the manager') : c.model === 'production' ? l('Contrato de produção', 'Production deal') : c.model === 'jv' ? l('Joint venture', 'Joint venture') : l('Contrato com o selo', 'Contract with the label'), // R29 (contratos+)
      meta: isSpecial29(c.model) ? fmtL(l('{x} · termina em {w} sem.', '{x} · ends in {w} wk'), { x: termTxt29(c), w: c.endWeek - s.week }) : fmtL(l('royalty {r}% · termina em {w} sem.', 'royalty {r}% · ends in {w} wk'), { r: Math.round(c.royalty * 100), w: c.endWeek - s.week }),
      pill: { label: l('vigente', 'active'), hue: 'good' as Hue29 }, go: { area: 'contracts19' } })),
    ...safe(() => promiseRows28(s, actId).filter((r) => r.state === 'open'), [] as ReturnType<typeof promiseRows28>).map((r) => ({
      title: fmtL(l('Promessa: {k}', 'Promise: {k}'), { k: PROM28_NAME[r.kind] }),
      meta: r.kind === 'freedom' ? l('vale o contrato todo', 'whole contract') : fmtL(l('vence em {n} sem.', 'due in {n} wk'), { n: Math.max(0, r.weeksLeft) }),
      pill: r.met ? { label: l('atendida', 'met'), hue: 'good' as Hue29 } : { label: l('aberta', 'open'), hue: (r.weeksLeft < 8 ? 'warn' : 'info') as Hue29 }, go: { area: 'contracts19' } })),
  ];
  const agenda: InspRow29[] = [
    ...(s.agenda?.[actId] ?? []).map((x) => ({ title: actionName(x.action), meta: l('neste mês', 'this month'), pill: { label: s.delegated?.[actId] !== false ? l('delegada', 'delegated') : l('manual', 'manual'), hue: 'muted' as Hue29 } })),
    ...safe(() => calendar19(s, { weeks: 8 }).filter((d) => d.goto?.act === actId), [] as ReturnType<typeof calendar19>).map((d) => ({
      title: d.t, meta: d.w <= s.week ? l('esta semana', 'this week') : fmtL(l('em {n} sem.', 'in {n} wk'), { n: d.w - s.week }),
      pill: d.act ? { label: l('pede ação', 'needs action'), hue: 'warn' as Hue29 } : undefined, go: { area: 'calendar19' } })),
  ];
  const st = safe(() => actState(s, a), null);
  const health: InspRow29[] = st ? [
    { title: l('Moral', 'Morale'), meta: String(Math.round(st.morale)), pill: { label: l('0–100', '0–100'), hue: meter(st.morale, false) } },
    { title: l('Cansaço', 'Fatigue'), meta: String(Math.round(st.fatigue)), pill: { label: l('0–100', '0–100'), hue: meter(st.fatigue, true) } },
    { title: l('Estresse', 'Stress'), meta: String(Math.round(st.stress)), pill: { label: l('0–100', '0–100'), hue: meter(st.stress, true) } },
    { title: l('Inspiração', 'Inspiration'), meta: String(Math.round(st.inspiration)), pill: { label: l('0–100', '0–100'), hue: meter(st.inspiration, false) } },
    ...members.filter((p) => p.health !== 'ok').map((p) => ({ title: p.name, meta: ROLE_NAMES[p.role] ?? l(p.role, p.role), pill: HEALTH[p.health] ?? HEALTH.ok, person: p.id })),
  ] : [];
  return {
    id: actId, name: a.name, kind: a.members.length > 1 ? l('Banda', 'Band') : l('Artista solo', 'Solo artist'), status: STATUS[a.status] ?? STATUS.active,
    tabs: { lineup, projects, contracts, agenda, health },
    empty: {
      lineup: l('Sem integrantes ativos registrados.', 'No active members recorded.'),
      projects: l('Nenhum projeto em andamento.', 'No project in progress.'),
      contracts: l('Sem contrato vigente com o seu selo.', 'No active contract with your label.'),
      agenda: l('Nada agendado nas próximas 8 semanas.', 'Nothing scheduled in the next 8 weeks.'),
      health: l('Estado ainda não registrado.', 'State not recorded yet.'),
    },
  };
}
