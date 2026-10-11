// Rodada 20 (G6, Protótipo B) — Revisão da fase no projeto musical EXISTENTE: a decisão relevante da etapa (não todos
// os campos), opções comparadas com custo, prazo, público e incerteza, revisão de gasto realizado × compromisso futuro ×
// caixa livre e, no Balanço, meta × previsão × realizado. Os botões chamam as MESMAS funções da tela completa
// (planWriting, recordNow, planRecording, scheduleProject, rolloutProject): nenhum projeto paralelo, nenhum sorteio
// revelado antes da hora (a previsão só aparece depois do lançamento, quando o motor já a fixou).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { EXPLAIN_WEEKS, expectedFor } from '../../sim/sys/explain8';
import { GOALS, STAGE_NAMES, needSongs, planRecording, planWriting, projectCosts, projectResult, projectSession, recordNow, rolloutProject, scheduleProject, type MusicProject, type ProjStage } from '../../sim/sys/project8';
import { planOf12, weeksNeeded } from '../../sim/sys/project12';
import { AUDIENCES } from '../../sim/sys/recipe12';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import { $, N, rerender, toast } from '../common';
import { h } from '../dom';
import { review20 } from '../ux20';
import { goToProjects } from './project8';
import { status20 } from './ui20';

interface Opt20 { name: L; cost: number; weeks: number | null; aud?: L; risk: L; run: () => L | null; ok: L; primary?: boolean; blocked?: L | null }
const say = (x: L | null, ok: L) => { toast(t(x ?? ok), x ? 'bad' : 'good'); rerender(); };

/** Opções da etapa atual (mesmos comandos da tela completa). */
export function phaseOptions20(s: GameState, p: MusicProject, st: ProjStage): Opt20[] {
  const c = projectCosts(s, p);
  const unrec = p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const missing = Math.max(0, needSongs(p.type) - p.songIds.length);
  const aud = planOf12(s, p)?.aud;
  const audL = aud ? AUDIENCES[aud].name : undefined;
  const out: Opt20[] = [];
  if ((st === 'concept' || st === 'writing') && (missing || !unrec)) out.push({ name: l('Compor pela agenda', 'Write via the agenda'), cost: 0, weeks: missing * 2, aud: audL, risk: l('Qualidade das músicas só se conhece ao escrever.', 'Song quality is only known once written.'), run: () => planWriting(s, p), ok: l('"Compor" entrou na agenda do mês.', '"Write" added to this month\'s agenda.'), primary: missing > 0 });
  if (unrec && (st === 'writing' || st === 'recording') && !projectSession(s, p)) {
    out.push({ name: l('Gravar agora', 'Record now'), cost: c.recording, weeks: Math.ceil(unrec * 0.6) + 1, aud: audL, risk: l('A qualidade final sai da sessão (voz, energia, estúdio e produtor).', 'Final quality comes from the session (voice, energy, studio and producer).'), run: () => recordNow(s, p), ok: l('Sessão de estúdio marcada.', 'Studio session booked.'), primary: !missing, blocked: c.recording > s.player.cash ? l('Caixa insuficiente para a sessão.', 'Not enough cash for the session.') : null });
    out.push({ name: l('Ensaiar e gravar pela agenda', 'Rehearse and record via the agenda'), cost: c.recording, weeks: Math.ceil(unrec * 0.6) + 4, aud: audL, risk: l('Mais lento; divide o mês com outras tarefas do artista.', 'Slower; shares the month with the act\'s other tasks.'), run: () => planRecording(s, p), ok: l('"Gravar" entrou na agenda do mês.', '"Record" added to this month\'s agenda.') });
  }
  if (st === 'finishing') {
    const pre = c.marketing + c.pressing + c.cover;
    out.push({ name: l('Programar lançamento', 'Schedule release'), cost: pre, weeks: Math.max(1, p.weeksAhead), aud: audL, risk: l('Vendas dependem do mercado e da concorrência na semana.', 'Sales depend on the market and competition that week.'), run: () => scheduleProject(s, rngOf(s), p), ok: l('Lançamento programado.', 'Release scheduled.'), primary: true });
    if (p.type === 'lp') out.push({ name: l('Lançar com rollout', 'Release with a rollout'), cost: pre, weeks: null, aud: audL, risk: l('Singles antes do álbum: mais tempo de exposição, mais custo de campanha.', 'Singles before the album: more exposure time, more campaign cost.'), run: () => rolloutProject(s, p), ok: l('Rollout planejado.', 'Rollout planned.') });
  }
  return out;
}

/** Meta × previsão × realizado (só depois do lançamento). */
export function balance20(s: GameState, p: MusicProject): { goal: L; met: boolean | null; forecast: number | null; actual: number; weeks: number } | null {
  const res = projectResult(s, p);
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  if (!res || !rel) return null;
  const weeks = Math.max(0, Math.min(EXPLAIN_WEEKS, s.week - rel.week));
  return { goal: GOALS[p.goal].name, met: res.goalMet, forecast: weeks > 0 ? expectedFor(rel, weeks) : null, actual: weeks >= EXPLAIN_WEEKS ? rel.fa ?? rel.totalUnits : rel.totalUnits, weeks };
}

export function phaseReview20(s: GameState, p: MusicProject, st: ProjStage): HTMLElement {
  const c = projectCosts(s, p);
  const rv = review20(s, { actId: '', model: 'classic', advance: 0, royalty: 0, termMonths: 0, releasesOwed: 0, creativeControl: false, publishing: false, share360: 0, promises: [] });
  const opts = phaseOptions20(s, p, st);
  const bal = st === 'released' || st === 'followup' ? balance20(s, p) : null;
  const goal = GOALS[p.goal];
  return h('section', { class: 'card p20', 'aria-labelledby': `p20-${p.id}` },
    h('h3', { id: `p20-${p.id}` }, t(l('Revisão da fase: {f}', 'Phase review: {f}'), { f: STAGE_NAMES[st] }), ' ', h('small', { class: 'muted' }, t(l('meta: {g}', 'goal: {g}'), { g: goal.name }))),
    opts.length ? h('div', null,
      h('p', { class: 'small' }, t(l('A decisão desta etapa:', 'This stage\'s decision:'))),
      h('div', { class: 'p20-opts' }, opts.map((o) => h('div', { class: 'p20-opt' },
        h('b', null, t(o.name)),
        h('p', { class: 'small num20' }, `${t(l('Custo', 'Cost'))}: ${$(o.cost)} · ${t(l('Prazo', 'Time'))}: ${o.weeks === null ? t(l('várias semanas', 'several weeks')) : `~${o.weeks} ${t(l('sem.', 'wk'))}`}`),
        o.aud ? h('p', { class: 'small' }, t(l('Público-alvo: ', 'Target audience: ')), t(o.aud)) : null,
        h('p', { class: 'small muted' }, t(l('Incerteza: ', 'Uncertainty: ')), t(o.risk)),
        o.blocked ? status20('blocked', t(o.blocked)) : h('button', { class: `btn small ${o.primary ? 'primary' : ''}`, onclick: () => say(o.run(), o.ok) }, t(o.name))))))
      : !bal ? h('p', { class: 'small muted' }, st === 'scheduled' ? t(l('Programado: nada a decidir até o lançamento (veja o hype abaixo).', 'Scheduled: nothing to decide until release (see hype below).')) : t(l('Sem decisão nesta etapa agora.', 'No decision at this stage right now.'))) : null,
    h('table', { class: 'tbl compact rv20' }, h('tbody', null,
      h('tr', null, h('th', { scope: 'row' }, t(l('Gasto realizado', 'Spent so far'))), h('td', null, $(p.spent))),
      h('tr', null, h('th', { scope: 'row' }, t(l('Compromisso futuro', 'Future commitment'))), h('td', null, $(c.remaining))),
      h('tr', null, h('th', { scope: 'row' }, t(l('Caixa livre', 'Free cash'))), h('td', { class: rv.free < c.remaining ? 'bad' : 'good' }, $(rv.free))),
      p.budget ? h('tr', null, h('th', { scope: 'row' }, t(l('Orçamento', 'Budget'))), h('td', { class: c.committed > p.budget ? 'bad' : '' }, `${$(c.committed)} / ${$(p.budget)}`)) : null)),
    bal ? h('div', null,
      h('h4', null, t(l('Balanço: meta × previsão × realizado', 'Balance: goal vs forecast vs actual'))),
      h('table', { class: 'tbl compact rv20' }, h('tbody', null,
        h('tr', null, h('th', { scope: 'row' }, t(l('Meta', 'Goal'))), h('td', null, t(bal.goal), ' ', bal.met === null ? status20('pending') : bal.met ? status20('done') : status20('expired'))),
        h('tr', null, h('th', { scope: 'row' }, t(l('Previsão ({w} sem.)', 'Forecast ({w} wk)'), { w: bal.weeks })), h('td', null, bal.forecast === null ? '—' : N(bal.forecast))),
        h('tr', null, h('th', { scope: 'row' }, t(l('Realizado', 'Actual'))), h('td', null, N(bal.actual))))),
      h('p', { class: 'muted small' }, t(l('Gráficos, críticas e o razão completo continuam abaixo e na ficha do lançamento.', 'Charts, reviews and the full ledger remain below and on the release sheet.')))) : null,
    h('button', { class: 'btn small ghost', onclick: () => goToProjects(p.actId, p.id) }, t(l('Abrir todos os campos (faixas, capa, verba)', 'Open every field (tracks, cover, budget)')), ' →'),
    h('small', { class: 'muted' }, ' ', t(l('Faltam ~{n} sem. de trabalho.', '~{n} wk of work left.'), { n: weeksNeeded(s, p) })));
}
