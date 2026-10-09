// Projeto musical como centro (rodada 12): uma tela conduz o disco inteiro — intenção, compromissos,
// linha do tempo (gravação → promoção → lançamento → resultado), problemas como decisões com
// consequências, leitura do porquê e próximo passo. Estúdio, agenda, marketing e contrato ficam a um
// clique, já no contexto do artista e do projeto.

import './project12.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Stage } from '../../sim/sys/music/data';
import {
  CONCEPTS, GOALS, STAGE_NAMES, conceptById, createProject, needSongs, openProjects, planRecording, planWriting, projectById, projectCosts, projectResult,
  projectSession, projectStage, recordNow, rolloutProject, scheduleProject, unscheduleProject, type MusicProject, type ProjStage,
} from '../../sim/sys/project8';
import {
  BUDGETS, DEADLINES, DIRS, INTENTS, NEXT, PROBLEM_NAME, attentionCount, chooseNext, commitProject, nextStepBlock, planOf12, problemOptions, resolveProblem, slack, weeksNeeded,
  type BudgetLvl, type Deadline, type Dir, type Intent, type NextStep,
} from '../../sim/sys/project12';
import { AUDIENCES, effectName, focusIdeal, recipeFit, stageName, studioContext, type Aud12 } from '../../sim/sys/recipe12';
import type { GameState, ReleaseType } from '../../sim/types';
import { playerActs, rngOf } from '../../sim/util';
import { $, N, kv, logo, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { openRelease } from '../ficha';
import { openActPage } from '../pages';
import { registerArea, registerSection } from '../registry';
import { projHype12 } from './hype12';
import { store } from '../store';
import { chips, ic, setTab } from '../vis';
import { explainBox, goToProjects } from './project8';
import { applyNewBlend, newBlendSelect, p13Panel } from './project13';

const ui = { sel: '', type: 'lp' as ReleaseType, concept: CONCEPTS[0].id, edit: false, draft: null as null | { pid: string; intent: Intent; dir: Dir; aud: Aud12; budget: BudgetLvl; deadline: Deadline } };
const say = (x: L | null, ok: L) => { toast(t(x ?? ok), x ? 'bad' : 'good'); rerender(); };
const area = (id: string) => { store.area = id; rerender(); };

/** Abre o hub no artista/projeto indicado. */
export function goToHub(actId?: string, projectId?: string): void {
  if (actId) store.selectedAct = actId;
  if (projectId) ui.sel = projectId;
  area('project');
}

// ------------------------------------------------------------------ 1–2: intenção e compromissos

function commitPanel(s: GameState, p: MusicProject): HTMLElement {
  const pl = planOf12(s, p);
  if (!ui.draft || ui.draft.pid !== p.id) ui.draft = { pid: p.id, intent: pl?.intent ?? 'career', dir: pl?.dir ?? 'signature', aud: pl?.aud ?? 'core', budget: pl?.budget ?? 'standard', deadline: pl?.deadlineKind ?? 'normal' };
  const d = ui.draft;
  const opt = <K extends string>(rec: Record<K, { name: L }>) => (Object.keys(rec) as K[]).map((k) => ({ value: k, label: t(rec[k].name) }));
  return h('div', { class: 'p12-commit' },
    section(`1. ${t(l('Intenção do disco', 'What the record is for'))}`,
      h('div', { class: 'p12-intents' }, (Object.keys(INTENTS) as Intent[]).map((k) => h('button', { class: `p12-intent ${d.intent === k ? 'on' : ''}`, 'aria-pressed': d.intent === k ? 'true' : 'false', onclick: () => { d.intent = k; d.aud = INTENTS[k].aud; rerender(); } },
        h('b', null, t(INTENTS[k].name)), h('small', null, t(INTENTS[k].desc)), h('small', { class: 'muted' }, t(INTENTS[k].fx)))))),
    section(`2. ${t(l('Compromissos', 'Commitments'))}`,
      h('div', { class: 'p12-grid' },
        h('label', null, t(l('Orçamento', 'Budget')), select(d.budget, opt(BUDGETS), (v) => { d.budget = v; rerender(); }), h('small', { class: 'muted' }, t(BUDGETS[d.budget].fx))),
        h('label', null, t(l('Direção artística', 'Artistic direction')), select(d.dir, opt(DIRS), (v) => { d.dir = v; rerender(); }), h('small', { class: 'muted' }, t(DIRS[d.dir].fx))),
        h('label', null, t(l('Prazo', 'Deadline')), select(d.deadline, opt(DEADLINES), (v) => { d.deadline = v; rerender(); }), h('small', { class: 'muted' }, `${t(DEADLINES[d.deadline].fx)} (${DEADLINES[d.deadline].weeks + (p.type === 'lp' ? 8 : p.type === 'ep' ? 3 : 0)} ${t(l('sem.', 'wk'))})`)),
        h('label', null, t(l('Público-alvo', 'Target audience')), select(d.aud, opt(AUDIENCES), (v) => { d.aud = v; rerender(); }), h('small', { class: 'muted' }, t(AUDIENCES[d.aud].desc), ' ', INTENTS[d.intent].aud === d.aud ? t(l('Casa com a intenção (apelo ×1,03).', 'Matches the intent (appeal ×1.03).')) : t(l('Não é o público natural da intenção (apelo ×0,98).', 'Not the intent\'s natural audience (appeal ×0.98).')))),
      ),
      h('p', { class: 'muted small' }, t(l('A meta do projeto passa a ser: ', 'The project goal becomes: ')), t(GOALS[INTENTS[d.intent].goal].desc), ' ', t(l('O público-alvo também muda o que funciona no estúdio (foco por etapa e receita sonora).', 'The target audience also changes what works in the studio (stage focus and sound recipe).'))),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', onclick: () => { const e = commitProject(s, p, d); ui.edit = false; say(e, l('Compromissos assumidos.', 'Commitments made.')); } }, ic('contract'), ' ', t(pl ? l('Atualizar compromissos', 'Update commitments') : l('Assumir compromissos', 'Make the commitments'))),
        pl ? h('button', { class: 'btn ghost small', onclick: () => { ui.edit = false; rerender(); } }, t(l('Voltar', 'Back'))) : null)),
  );
}

// ------------------------------------------------------------------ 3: linha do tempo

const PHASES: { id: string; name: L; stages: ProjStage[] }[] = [
  { id: 'rec', name: l('Gravação', 'Recording'), stages: ['concept', 'writing', 'recording'] },
  { id: 'promo', name: l('Promoção', 'Promotion'), stages: ['finishing', 'scheduled'] },
  { id: 'out', name: l('Lançamento', 'Release'), stages: ['released'] },
  { id: 'res', name: l('Resultado', 'Results'), stages: ['followup'] },
];

function timeline(s: GameState, p: MusicProject, st: ProjStage): HTMLElement {
  const cur = PHASES.findIndex((x) => x.stages.includes(st));
  const pl = planOf12(s, p);
  const sl = slack(s, p);
  const need = weeksNeeded(s, p);
  const done = st === 'released' || st === 'followup';
  return h('div', { class: 'p12-time' },
    h('ol', { class: 'p12-phases' }, PHASES.map((ph, i) => h('li', { class: i < cur ? 'done' : i === cur ? 'on' : '', 'aria-current': i === cur ? 'step' : undefined },
      h('b', null, t(ph.name)), i === cur ? h('small', null, t(STAGE_NAMES[st])) : null))),
    pl && !done ? h('div', { class: 'row wrap' },
      kv(t(l('Prazo', 'Deadline')), `${t(l('semana', 'week'))} ${pl.deadline} (${t(l('em {n} sem.', 'in {n} wk'), { n: Math.max(0, pl.deadline - s.week) })})`),
      kv(t(l('Trabalho restante', 'Work left')), `~${need} ${t(l('sem.', 'wk'))}`),
      sl !== null ? pill(sl >= 2 ? t(l('no prazo (+{n} sem. de folga)', 'on schedule (+{n} wk slack)'), { n: sl }) : sl >= 0 ? t(l('no limite', 'cutting it close')) : t(l('atrasado {n} sem.', '{n} wk behind'), { n: -sl }), sl >= 2 ? 'good' : sl >= 0 ? 'warn' : 'bad') : null) : null,
    pl && !done ? bar(Math.max(0, need), Math.max(1, pl.deadline - s.week, need), sl !== null && sl < 0 ? 'bad' : 'good') : null);
}

function problemCard(s: GameState, p: MusicProject): HTMLElement | null {
  const pb = planOf12(s, p)?.problem;
  if (!pb) return null;
  return h('div', { class: 'p12-problem', role: 'alert' },
    h('h4', null, ic('warning'), ' ', t(PROBLEM_NAME[pb.kind])),
    h('p', null, t(pb.why)),
    h('div', { class: 'p12-opts' }, problemOptions(s, p).map((o) => h('div', { class: 'p12-opt' },
      h('button', { class: 'btn small', disabled: !!o.disabled, title: o.disabled ? t(o.disabled) : undefined, onclick: () => say(resolveProblem(s, p, o.id), l('Decisão tomada.', 'Decision made.')) }, t(o.name)),
      h('small', { class: o.disabled ? 'muted' : '' }, t(o.disabled ?? o.fx))))),
    h('p', { class: 'muted small' }, t(l('Se você não decidir, o problema continua: atraso custa momento no lançamento; estouro pode travar a gravação.', 'If you do not decide, the problem stays: lateness costs momentum at release; overspending can stall the recording.'))));
}

function nextAction(s: GameState, p: MusicProject, st: ProjStage): HTMLElement {
  const unrec = p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const sess = projectSession(s, p);
  const pr = s.pendingReleases.find((x) => x.id === p.pendingId);
  const body: (HTMLElement | string | null)[] = [];
  if (st === 'concept' || st === 'writing') body.push(
    h('p', null, t(l('Faltam {n} música(s) para o mínimo do formato.', '{n} song(s) missing for the format minimum.'), { n: Math.max(0, needSongs(p.type) - p.songIds.length) })),
    h('button', { class: 'btn primary small', onclick: () => say(planWriting(s, p), l('"Compor" entrou na agenda do mês.', '"Write" added to this month\'s agenda.')) }, ic('note'), ' ', t(l('Compor (agenda)', 'Write (agenda)'))));
  if (unrec && (st === 'writing' || st === 'recording')) body.push(sess ? h('p', null, t(l('Em estúdio: dia {d} de {n}.', 'In the studio: day {d} of {n}.'), { d: sess.dayDone, n: sess.days })) : h('span', { class: 'row wrap' },
    h('button', { class: 'btn primary small', onclick: () => say(recordNow(s, p), l('Sessão de estúdio marcada.', 'Studio session booked.')) }, ic('mic'), ' ', t(l('Gravar agora ({n} faixas)', 'Record now ({n} tracks)'), { n: unrec })),
    h('button', { class: 'btn small', onclick: () => say(planRecording(s, p), l('"Gravar" entrou na agenda do mês.', '"Record" added to this month\'s agenda.')) }, t(l('Gravar pela agenda', 'Record via agenda')))));
  if (st === 'finishing') body.push(h('span', { class: 'row wrap' },
    h('label', { class: 'pj-inline' }, t(l('Sai em (semanas)', 'Out in (weeks)')), h('input', { type: 'number', min: 1, max: 26, value: p.weeksAhead, onchange: (e: Event) => { p.weeksAhead = Math.max(1, Math.min(26, Number((e.target as HTMLInputElement).value) || 1)); rerender(); } })),
    h('button', { class: 'btn primary small', onclick: () => say(scheduleProject(s, rngOf(s), p), l('Lançamento programado.', 'Release scheduled.')) }, ic('cd'), ' ', t(l('Programar lançamento', 'Schedule release'))),
    p.type === 'lp' ? h('button', { class: 'btn small', onclick: () => say(rolloutProject(s, p), l('Rollout planejado.', 'Rollout planned.')) }, ic('calendar'), ' ', t(l('Lançar com rollout', 'Release with a rollout'))) : null));
  if (st === 'scheduled') body.push(h('p', null, pr ? t(l('Chega às lojas na semana {w}. Shows e entrevistas nessa semana somam.', 'Hits stores in week {w}. Shows and interviews that week add up.'), { w: pr.week }) : t(l('Rollout em andamento.', 'Rollout in progress.'))),
    pr ? h('button', { class: 'btn ghost small', onclick: () => { unscheduleProject(s, p); rerender(); } }, t(l('Cancelar lançamento', 'Cancel release'))) : null);
  if (st === 'released') body.push(h('p', { class: 'muted' }, t(l('Nas lojas. A leitura completa sai em algumas semanas; o próximo passo já pode ser escolhido.', 'In stores. The full reading comes in a few weeks; the next step can be chosen now.'))));
  return body.length ? section(t(l('Próxima ação', 'Next action')), ...body) : h('div');
}

function contextLinks(s: GameState, p: MusicProject): HTMLElement {
  const sel = () => { store.selectedAct = p.actId; };
  const act = s.acts[p.actId];
  return h('div', { class: 'p12-links', 'aria-label': t(l('Atalhos no contexto do projeto', 'Shortcuts in the project context')) },
    h('button', { class: 'btn small ghost', onclick: () => goToProjects(p.actId, p.id) }, ic('note'), ' ', t(l('Faixas, capa e verba', 'Tracks, cover and budget'))),
    h('button', { class: 'btn small ghost', onclick: () => { sel(); setTab('creation-studio', 'session'); area('studio'); } }, ic('mic'), ' ', t(l('Estúdio', 'Studio'))),
    h('button', { class: 'btn small ghost', onclick: () => { sel(); setTab('creation-studio', 'studio-gear'); area('studio'); } }, ic('sparkle'), ' ', t(l('Foco do estúdio', 'Studio focus'))),
    h('button', { class: 'btn small ghost', onclick: () => { sel(); setTab('creation-write', 'cr-recipe'); area('creation'); } }, ic('note'), ' ', t(l('Receita sonora', 'Sound recipe'))),
    h('button', { class: 'btn small ghost', onclick: () => { sel(); area('artists'); } }, ic('calendar'), ' ', t(l('Agenda do artista', 'Act agenda'))),
    h('button', { class: 'btn small ghost', onclick: () => { sel(); setTab('creation-release', p.type === 'lp' ? 'rollout' : 'launch'); area('releases'); } }, ic('radio'), ' ', t(l('Marketing e rollout', 'Marketing and rollout'))),
    act?.contractId ? h('button', { class: 'btn small ghost', onclick: () => openActPage(p.actId, 'contract') }, ic('contract'), ' ', t(l('Contrato', 'Contract'))) : null);
}

function studioFit(s: GameState, p: MusicProject): HTMLElement | null {
  const ctx = studioContext(s, p.actId, p.songIds[0], p.producerId);
  if (!ctx) return null;
  const f = focusIdeal(s, ctx);
  const top = (Object.entries(f.ideal) as [Stage, number][]).sort((a, b) => b[1] - a[1]);
  const fit = p.songIds[0] ? recipeFit(s, p.songIds[0]) : null;
  return section(t(l('O que funciona no estúdio deste disco', 'What works in the studio for this record')),
    h('p', { class: 'muted small' }, t(l('Não existe receita fixa por gênero: o foco e a receita sonora certos mudam com o artista, o conceito, o produtor e o público-alvo.', 'There is no fixed recipe per genre: the right focus and sound recipe change with the act, the concept, the producer and the target audience.'))),
    h('ul', { class: 'p12-drivers' }, f.drivers.map((d) => h('li', null, t(d.label), ' → ', h('b', null, t(stageName(d.stage)))))),
    h('p', { class: 'small' }, t(l('Somando tudo, o tempo de estúdio rende mais em ', 'All told, studio time pays off most in ')), h('b', null, t(stageName(top[0][0]))), t(l(' e depois em ', ' and then in ')), t(stageName(top[1][0])), '.'),
    fit ? h('div', null,
      h('p', { class: 'small' }, t(l('Efeitos que o contexto pede: ', 'Effects the context asks for: ')), chips(...fit.wanted.map((e) => pill(t(effectName(e)))))),
      h('ul', { class: 'small' }, fit.notes.map((n) => h('li', { class: n.good ? 'good' : 'bad' }, t(n.text)))),
      pill(`${t(l('Receita da faixa principal', 'Lead track recipe'))}: ${fit.score > 0 ? '+' : ''}${Math.round(fit.score * 7)}% ${t(l('de apelo', 'appeal'))}`, fit.score > 0.05 ? 'good' : fit.score < -0.05 ? 'bad' : '')) : null);
}

function commitSummary(s: GameState, p: MusicProject): HTMLElement | null {
  const pl = planOf12(s, p);
  if (!pl) return null;
  const c = projectCosts(s, p);
  const locked = !!(p.pendingId || p.rolloutId || p.releaseId);
  return section(t(l('Compromissos', 'Commitments')),
    h('div', { class: 'p12-chips' },
      tag(INTENTS[pl.intent].name, INTENTS[pl.intent].fx), tag(BUDGETS[pl.budget].name, BUDGETS[pl.budget].fx), tag(DIRS[pl.dir].name, DIRS[pl.dir].fx),
      tag(DEADLINES[pl.deadlineKind].name, DEADLINES[pl.deadlineKind].fx), tag(AUDIENCES[pl.aud].name, AUDIENCES[pl.aud].desc)),
    h('div', { class: 'row wrap' },
      kv(t(l('Comprometido', 'Committed')), h('b', { class: p.budget && c.committed > p.budget ? 'bad' : '' }, $(c.committed), p.budget ? ` / ${$(p.budget)}` : '')),
      kv(t(l('Caixa', 'Cash')), h('b', { class: c.remaining > s.player.cash ? 'bad' : 'good' }, $(s.player.cash))),
      !locked ? h('button', { class: 'btn ghost small', onclick: () => { ui.edit = true; rerender(); } }, t(l('Rever compromissos', 'Revise commitments'))) : null));
}
const tag = (name: L, fx: L) => h('span', { class: 'pill p12-tag', title: t(fx) }, t(name));

// ------------------------------------------------------------------ 4: resultado e próximo passo

function results(s: GameState, p: MusicProject): HTMLElement | null {
  const res = projectResult(s, p);
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  if (!res || !rel) return null;
  const pl = planOf12(s, p);
  return section(t(l('Resultado: por que deu nisso', 'Results: why it turned out this way')),
    h('div', { class: 'row wrap' },
      kv(t(l('Unidades', 'Units')), N(res.units)), kv(t(l('Melhor posição', 'Peak')), res.peak < 999 ? `#${res.peak}` : '—'),
      kv(t(l('Receita', 'Revenue')), $(res.revenue)), kv(t(l('Gasto', 'Spend')), $(res.spent)),
      kv(t(l('Meta', 'Goal')), h('span', null, t(GOALS[p.goal].name), ' ', res.goalMet === null ? pill(t(l('em aberto', 'open'))) : res.goalMet ? pill(t(l('cumprida', 'met')), 'good') : pill(t(l('não cumprida', 'missed')), 'bad')))),
    h('p', { class: 'muted small' }, t(res.goalText)),
    explainBox(s, rel),
    h('button', { class: 'btn small ghost', onclick: () => openRelease(rel.id) }, ic('disc'), ' ', t(l('Ficha do lançamento', 'Release sheet'))),
    h('h4', null, t(l('Próximo passo', 'Next step'))),
    pl?.next ? h('p', null, pill(t(NEXT[pl.next].name), 'good'), ' ', t(NEXT[pl.next].fx)) :
      h('div', { class: 'p12-next' }, (Object.keys(NEXT) as NextStep[]).map((k) => {
        const blk = nextStepBlock(s, p, k);
        return h('div', { class: 'p12-opt' },
          h('button', { class: 'btn small', disabled: !!blk, onclick: () => { const r = chooseNext(s, p, k); if (r.err) toast(t(r.err), 'bad'); else { toast(t(NEXT[k].name), 'good'); if (r.project) ui.sel = r.project.id; if (k === 'tour') store.area = 'shows'; } rerender(); } }, t(NEXT[k].name)),
          h('small', { class: blk ? 'muted' : '' }, t(blk ?? NEXT[k].fx)));
      })));
}

function diary(s: GameState, p: MusicProject): HTMLElement | null {
  const pl = planOf12(s, p);
  if (!pl?.log.length) return null;
  return h('details', { class: 'p12-log' }, h('summary', null, t(l('Diário do projeto', 'Project diary'))),
    h('ul', null, [...pl.log].reverse().map((x) => h('li', { class: x.good === true ? 'good' : x.good === false ? 'bad' : '' }, h('small', { class: 'muted' }, `${t(l('sem.', 'wk'))} ${x.w} · `), t(x.text)))));
}

// ------------------------------------------------------------------ tela

function projectView(s: GameState, p: MusicProject): HTMLElement {
  const st = projectStage(s, p);
  const act = s.acts[p.actId];
  const pl = planOf12(s, p);
  const c = conceptById[p.concept] ?? CONCEPTS[0];
  const head = h('div', { class: 'p12-head' }, act ? logo(act, 44) : null,
    h('div', null, h('h3', null, p.title || t(l('(sem título)', '(untitled)'))), h('small', { class: 'muted' }, `${act?.name ?? '—'} · ${p.type.toUpperCase()} · ${t(c.name)} · ${p.songIds.length}/${needSongs(p.type)}+ ${t(l('faixas', 'tracks'))}`)),
    pill(t(STAGE_NAMES[st]), st === 'followup' || st === 'released' ? 'good' : st === 'finishing' ? 'gold' : ''));
  const locked13 = !!(p.pendingId || p.rolloutId || p.releaseId);
  if (!pl || ui.edit) return h('div', { class: 'p12-view' }, head, commitPanel(s, p), p13Panel(s, p, locked13), contextLinks(s, p));
  return h('div', { class: 'p12-view' }, head, timeline(s, p, st), problemCard(s, p), results(s, p), st !== 'released' && st !== 'followup' ? projHype12(s, p.actId) : null, nextAction(s, p, st), commitSummary(s, p), p13Panel(s, p, locked13), contextLinks(s, p), st !== 'released' && st !== 'followup' ? studioFit(s, p) : null, diary(s, p));
}

function hub(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const act = s.acts[store.selectedAct ?? ''] && ids.includes(store.selectedAct ?? '') ? s.acts[store.selectedAct!] : s.acts[ids[0]];
  if (!act) return section(t(l('Projeto musical', 'Music project')), h('p', { class: 'muted' }, t(l('Contrate um artista para começar um disco.', 'Sign an act to start a record.'))));
  const all = openProjects(s).sort((a, b) => Number(a.actId !== act.id) - Number(b.actId !== act.id) || b.created - a.created);
  let cur = projectById(s, ui.sel);
  if (!cur || cur.closed) cur = all.find((p) => p.actId === act.id) ?? all[0];
  if (cur) ui.sel = cur.id;
  return h('div', { class: 'p12' },
    h('div', { class: 'p12-top' },
      h('h2', null, ic('disc'), ' ', t(l('Projeto musical', 'Music project'))),
      h('p', { class: 'muted small' }, t(l('Tudo de um disco num lugar só: para que ele serve, quanto custa, quando sai, o que deu errado no caminho e o que fazer depois.', 'Everything about a record in one place: what it is for, what it costs, when it comes out, what went wrong on the way and what to do next.'))),
      h('div', { class: 'row wrap' },
        all.map((p) => { const pb = planOf12(s, p)?.problem; return h('button', { class: `chip-btn ${cur?.id === p.id ? 'on' : ''}`, onclick: () => { ui.sel = p.id; ui.edit = false; store.selectedAct = p.actId; rerender(); } }, `${s.acts[p.actId]?.name ?? '—'}: ${p.title || p.type.toUpperCase()}`, pb ? ' ⚠' : ''); }),
      ),
      h('div', { class: 'row wrap p12-new' },
        select(act.id, ids.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { store.selectedAct = v; rerender(); }, { 'aria-label': t(l('Artista', 'Act')) }),
        select(ui.type, [{ value: 'single' as ReleaseType, label: 'Single' }, { value: 'ep' as ReleaseType, label: 'EP' }, { value: 'lp' as ReleaseType, label: t(l('Álbum', 'Album')) }], (v) => { ui.type = v; }, { 'aria-label': t(l('Formato', 'Format')) }),
        select(ui.concept, CONCEPTS.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { ui.concept = v; rerender(); }, { 'aria-label': t(l('Conceito', 'Concept')) }),
        newBlendSelect(ui.concept),
        h('button', { class: 'btn small', onclick: () => { const r = createProject(s, act.id, { type: ui.type, concept: ui.concept }); if ('pt' in r) toast(t(r), 'bad'); else { applyNewBlend(s, r); ui.sel = r.id; ui.edit = false; } rerender(); } }, '+ ', t(l('Novo disco', 'New record'))))),
    cur ? projectView(s, cur) : h('p', { class: 'muted' }, t(l('Nenhum disco em andamento. Escolha formato e conceito e comece um.', 'No record in progress. Pick a format and concept and start one.'))),
  );
}

registerArea({ id: 'project', label: l('Projeto musical', 'Music project'), icon: 'disc', key: '\\', render: hub, badge: (s) => attentionCount(s) || undefined });

// Início: o disco em andamento sempre à vista
registerSection('desk', {
  id: 'proj12', order: 5, render: (s) => {
    const list = openProjects(s).filter((p) => projectStage(s, p) !== 'followup');
    if (!playerActs(s).length) return null;
    return section(t(l('Seus discos', 'Your records')),
      list.length ? h('div', { class: 'p12-desk' }, list.slice(0, 4).map((p) => {
        const pl = planOf12(s, p);
        const st = projectStage(s, p);
        return h('button', { class: 'p12-card', onclick: () => goToHub(p.actId, p.id) },
          h('b', null, `${s.acts[p.actId]?.name ?? '—'}: ${p.title || p.type.toUpperCase()}`),
          h('small', null, t(STAGE_NAMES[st]), pl ? ` · ${t(INTENTS[pl.intent].name)}` : ` · ${t(l('sem compromissos', 'no commitments'))}`),
          pl?.problem ? h('small', { class: 'bad' }, '⚠ ', t(PROBLEM_NAME[pl.problem.kind])) : null);
      })) : h('p', { class: 'muted small' }, t(l('Nenhum disco em andamento.', 'No record in progress.'))),
      h('button', { class: 'btn small primary', onclick: () => goToHub() }, ic('disc'), ' ', t(l('Abrir projeto musical', 'Open music project'))));
  },
});
