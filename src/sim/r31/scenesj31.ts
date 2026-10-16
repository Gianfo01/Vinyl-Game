// R31 · onda 2 (J) — o que as cenas da Mesa do chefe, da Turnê e do Projeto musical deixam editar/rodar no editor
// dentro da partida (briefing, regra 10). As cenas só leem; aqui ficam os números que elas mostram e que dá para
// ajustar para testar (sempre pelo editor ligado: applyEdit/runEdit marcam a partida e escrevem no diário).

import { clamp } from '../../core/rng';
import { l } from '../../data/world';
import { openProjects, projectStage, recordNow } from '../sys/project8';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { registerEditable, registerRunnable } from './editor';

const openProj = (s: GameState, actId?: string) => (actId ? openProjects(s, actId).find((p) => !p.pendingId && !p.rolloutId && !p.releaseId) : undefined);
const nextStop = (s: GameState, actId?: string) => {
  const tr = actId ? s.tours.find((x) => x.actId === actId && (x.status === 'planned' || x.status === 'running')) : undefined;
  return tr?.stops.find((x) => x.status === 'scheduled');
};

registerEditable({
  id: 'j31.proj.weeks', area: 'scenes', target: 'act', kind: 'number', min: 1, max: 26, step: 1,
  label: l('Projeto musical: semanas entre programar e sair (projeto aberto)', 'Music project: weeks between scheduling and release (open project)'),
  help: l('O mesmo campo "Sai em (semanas)" do projeto; muda os meses mostrados na rua do lançamento.', 'The project\'s own "Out in (weeks)" field; changes the months shown on the release street.'),
  when: (s, id) => !!openProj(s, id),
  get: (s, id) => openProj(s, id)?.weeksAhead ?? 3,
  set: (s, v, id) => { const p = openProj(s, id); if (!p) return l('Sem projeto aberto.', 'No open project.'); p.weeksAhead = clamp(Math.round(Number(v)), 1, 26); },
});
registerEditable({
  id: 'j31.tour.sold', area: 'scenes', target: 'act', kind: 'number', min: 0, step: 50, raw: true,
  label: l('Turnê: ingressos já vendidos na próxima data', 'Tour: tickets already sold for the next date'),
  help: l('Mexe na lotação mostrada no mapa da turnê (o acerto do show usa o mesmo número).', 'Changes the attendance shown on the tour map (the show settlement uses the same number).'),
  when: (s, id) => !!nextStop(s, id),
  get: (s, id) => nextStop(s, id)?.sold ?? 0,
  set: (s, v, id) => { const st = nextStop(s, id); if (!st) return l('Sem data marcada.', 'No date booked.'); st.sold = clamp(Math.round(Number(v)), 0, st.capacity); },
});
registerRunnable({
  id: 'j31.proj.record', area: 'scenes', target: 'act', label: l('Projeto musical: gravar já as faixas do projeto', 'Music project: record the project\'s tracks now'),
  help: l('A mesma ação do estúdio na rua do lançamento (sessão com o produtor escolhido; paga a sessão).', 'The same action as the studio on the release street (session with the chosen producer; pays for it).'),
  when: (s, id) => { const p = openProj(s, id); return !!p && projectStage(s, p) === 'recording'; },
  run: (s, id) => {
    const p = openProj(s, id);
    if (!p) return { ok: false, text: l('Sem projeto aberto.', 'No open project.') };
    const e = recordNow(s, p);
    return e ? { ok: false, text: e } : fmtL(l('Sessão marcada para {n}.', 'Session booked for {n}.'), { n: s.acts[p.actId]?.name ?? '—' });
  },
});
