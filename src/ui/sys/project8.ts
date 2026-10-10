// Interface do projeto musical (rodada 8): aba "Projetos" em Criação, que conduz um disco inteiro de um
// lugar só, e a leitura do resultado ("por que deu nisso?") na ficha de cada lançamento.

import './project8.css';
import { APPROACHES, STUDIO_TIERS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { coverById, coverCost, coverOptions, type CoverStyle } from '../../sim/covers';
import { availableChannels } from '../../sim/market';
import { songProfile } from '../../sim/repertoire';
import { availableProducers, producerFit, sessionCost } from '../../sim/studio';
import { featureCandidates, featureFee } from '../../sim/sys/creation/core';
import { explainRelease } from '../../sim/sys/explain8';
import {
  CONCEPTS, GOALS, STAGES, STAGE_NAMES, candidateSongs, closeProject, conceptById, createProject, featOf, inviteGuest, maxSongs, needSongs, openProjects,
  planRecording, planWriting, projectById, projectCosts, projectForecast, projectResult, projectSession, projectStage, recordNow, rolloutProject,
  scheduleProject, setProjectSongs, stageIndex, unscheduleProject, type MusicProject, type ProjGoal, type ProjStage,
} from '../../sim/sys/project8';
import type { Act, GameState, Release, ReleaseType } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { coverUrl } from '../art';
import { $, N, actLink, cityName, genreName, kv, logo, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { RELEASE_EXTRAS, openRelease } from '../ficha';
import { ACT_HEAD_EXTRAS } from '../pages';
import { registerTab } from '../registry';
import { store } from '../store';
import { ic, setTab } from '../vis';

const ui = { sel: '' as string, type: 'single' as ReleaseType, concept: CONCEPTS[0].id };

const say = (x: L | null, ok: L) => { if (x) toast(t(x), 'bad'); else toast(t(ok), 'good'); rerender(); };

/** Abre a aba de projetos no artista (e no projeto) indicado. */
export function goToProjects(actId: string, projectId?: string): void {
  store.selectedAct = actId;
  if (projectId) ui.sel = projectId;
  setTab('creation-write', 'projects');
  store.area = 'creation';
  rerender();
}

const HINT: Record<ProjStage, L> = {
  concept: l('Escolha as faixas — ou ponha "Compor" na agenda: as músicas novas entram sozinhas no projeto.', 'Pick the tracks — or put "Write" on the agenda: new songs join the project automatically.'),
  writing: l('Faltam músicas. Agende composição ou marque outras faixas do repertório.', 'Songs are missing. Schedule writing or tick other repertoire tracks.'),
  recording: l('Hora de gravar: sessão já com produtor, ou "Gravar" na agenda do mês.', 'Time to record: a session now with a producer, or "Record" on this month\'s agenda.'),
  finishing: l('Tudo gravado. Escolha capa, divulgação e data — e programe o lançamento.', 'Everything is recorded. Pick cover, promotion and date — then schedule the release.'),
  scheduled: l('Programado. Enquanto isso: shows e entrevistas na semana do lançamento combinam bem.', 'Scheduled. Meanwhile: shows and interviews in release week combine well.'),
  released: l('Nas lojas! A leitura completa do resultado chega em algumas semanas.', 'In stores! The full debrief arrives in a few weeks.'),
  followup: l('Balanço feito. Leia o que funcionou e comece o próximo passo.', 'Debrief done. Read what worked and start the next move.'),
};

function stepper(st: ProjStage): HTMLElement {
  const cur = stageIndex(st);
  return h('ol', { class: 'pj-steps', 'aria-label': t(l('Etapas do projeto', 'Project stages')) },
    STAGES.map((x, i) => h('li', { class: i < cur ? 'done' : i === cur ? 'on' : '', 'aria-current': i === cur ? 'step' : undefined }, h('span', null, i + 1), t(STAGE_NAMES[x]))));
}

function projectCard(s: GameState, p: MusicProject): HTMLElement {
  const st = projectStage(s, p);
  const act = s.acts[p.actId];
  return h('button', { class: `pj-card ${ui.sel === p.id ? 'on' : ''}`, onclick: () => { ui.sel = p.id; store.selectedAct = p.actId; rerender(); } },
    act ? logo(act, 28) : null,
    h('span', { class: 'pj-card-main' },
      h('b', null, p.title || t(l('(sem título)', '(untitled)'))),
      h('small', { class: 'muted' }, `${act?.name ?? '—'} · ${p.type.toUpperCase()}`),
      bar(stageIndex(st) + 1, STAGES.length, st === 'followup' ? 'good' : '')),
    pill(t(STAGE_NAMES[st]), st === 'finishing' ? 'gold' : st === 'followup' || st === 'released' ? 'good' : ''));
}

function newProjectForm(s: GameState, act: Act): HTMLElement {
  const c = conceptById[ui.concept] ?? CONCEPTS[0];
  return h('div', { class: 'form pj-new' },
    h('label', null, t(l('Formato', 'Format')), select(ui.type, [{ value: 'single' as ReleaseType, label: 'Single' }, { value: 'ep' as ReleaseType, label: 'EP' }, { value: 'lp' as ReleaseType, label: t(l('Álbum (LP)', 'Album (LP)')) }], (v) => { ui.type = v; rerender(); })),
    h('label', null, t(l('Conceito', 'Concept')), select(ui.concept, CONCEPTS.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { ui.concept = v; rerender(); })),
    h('p', { class: 'muted small' }, t(c.desc), ' ', t(l('Meta sugerida: ', 'Suggested goal: ')), t(GOALS[c.goal].name), '.'),
    h('button', { class: 'btn primary', onclick: () => {
      const res = createProject(s, act.id, { type: ui.type, concept: ui.concept });
      if ('pt' in res) toast(t(res), 'bad');
      else { ui.sel = res.id; toast(t(l('Projeto criado.', 'Project created.')), 'good'); }
      rerender();
    } }, ic('note'), ' ', t(l('Novo projeto para {a}', 'New project for {a}'), { a: act.name })));
}

function conceptSection(s: GameState, p: MusicProject, locked: boolean): HTMLElement {
  const act = s.acts[p.actId];
  const c = conceptById[p.concept] ?? CONCEPTS[0];
  return section(t(l('Artista, conceito e meta', 'Artist, concept and goal')),
    h('div', { class: 'grid2' },
      h('div', { class: 'form' },
        h('label', null, t(l('Título', 'Title')), h('input', { type: 'text', value: p.title, disabled: locked, placeholder: t(l('(automático)', '(automatic)')), onchange: (e: Event) => { p.title = (e.target as HTMLInputElement).value.slice(0, 60); } })),
        h('label', null, t(l('Formato', 'Format')), select(p.type, [{ value: 'single' as ReleaseType, label: 'Single' }, { value: 'ep' as ReleaseType, label: 'EP' }, { value: 'lp' as ReleaseType, label: t(l('Álbum (LP)', 'Album (LP)')) }], (v) => { p.type = v; p.songIds = p.songIds.slice(0, maxSongs(v)); rerender(); }, { disabled: locked })),
        h('label', null, t(l('Conceito', 'Concept')), select(p.concept, CONCEPTS.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { p.concept = v; rerender(); }, { disabled: locked })),
        h('p', { class: 'muted small' }, t(c.desc)),
        h('label', null, t(l('Meta', 'Goal')), select(p.goal, (Object.keys(GOALS) as ProjGoal[]).map((g) => ({ value: g, label: t(GOALS[g].name) })), (v) => { p.goal = v; rerender(); }, { disabled: locked })),
        h('p', { class: 'muted small' }, t(GOALS[p.goal].desc)),
      ),
      act ? h('div', null,
        h('div', { class: 'row' }, logo(act, 48), h('div', null, actLink(s, act.id), h('div', { class: 'muted small' }, `${genreName(act.genre)} · ${cityName(act.city)}`))),
        kv(t(l('Alcance', 'Reach')), h('span', null, Math.round(act.fame), ' ', bar(act.fame))),
        kv(t(l('Momento', 'Momentum')), bar(act.momentum)),
        kv(t(l('Fãs (casuais · ativos · fiéis)', 'Fans (casual · active · core)')), `${N(act.fans.casual)} · ${N(act.fans.active)} · ${N(act.fans.core)}`),
      ) : null,
    ));
}

/** Rodada 18 (art18): extras no fim de "Faixas e produção" (sequência das faixas, produtor certo para o projeto). */
export const PROJ_TRACK_EXTRAS18: ((s: GameState, p: MusicProject, locked: boolean) => HTMLElement | null)[] = [];

function tracksSection(s: GameState, p: MusicProject, locked: boolean): HTMLElement {
  const act = s.acts[p.actId];
  const need = needSongs(p.type);
  const cands = candidateSongs(s, p);
  const sess = projectSession(s, p);
  const unrec = p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const prods = availableProducers(s);
  const lead = s.songs[p.songIds[0]];
  const guests = lead && !locked ? featureCandidates(s, lead) : [];
  const feat = lead ? featOf(s, lead.id) : undefined;
  if (p.guestId && !guests.some((g) => g.id === p.guestId)) p.guestId = undefined;
  return section(`${t(l('Faixas e produção', 'Tracks and production'))} (${p.songIds.length}/${need}+)`,
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: p.auto, disabled: locked, onchange: (e: Event) => { p.auto = (e.target as HTMLInputElement).checked; } }), t(l('Completar sozinho com as músicas novas do artista', 'Auto-fill with the act\'s new songs'))),
    cands.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, ''), h('th', null, t(l('Faixa', 'Track'))), h('th', null, t(l('Etapa', 'Stage'))), h('th', null, 'Q'), h('th', null, t(l('Gancho', 'Hook'))))),
      h('tbody', null, cands.slice(0, 24).map((so) => {
        const on = p.songIds.includes(so.id);
        return h('tr', { class: on ? 'pj-on' : '' },
          h('td', null, h('input', { type: 'checkbox', checked: on, disabled: locked || (!on && p.songIds.length >= maxSongs(p.type)), 'aria-label': so.title, onchange: (e: Event) => { const c = (e.target as HTMLInputElement).checked; setProjectSongs(s, p, c ? [...p.songIds, so.id] : p.songIds.filter((x) => x !== so.id)); rerender(); } })),
          h('td', null, so.title, p.songIds[0] === so.id ? ' ' : '', p.songIds[0] === so.id ? pill(t(l('principal', 'lead'))) : null),
          h('td', null, so.recorded ? pill(t(l('gravada', 'recorded')), 'good') : sess?.songIds.includes(so.id) ? pill(t(l('em estúdio', 'in studio')), 'gold') : pill(t(l('escrita', 'written')))),
          h('td', null, Math.round(so.q)),
          h('td', null, Math.round(songProfile(so).hook)));
      }))) : h('p', { class: 'muted' }, t(l('O artista não tem músicas inéditas livres.', 'The act has no free unreleased songs.'))),
    !locked ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => say(planWriting(s, p), l('"Compor" entrou na agenda do mês (agenda manual).', '"Write" added to this month\'s agenda (manual agenda).')) }, ic('note'), ' ', t(l('Compor (agenda)', 'Write (agenda)'))),
      unrec ? h('button', { class: 'btn small', onclick: () => say(planRecording(s, p), l('"Gravar" entrou na agenda do mês.', '"Record" added to this month\'s agenda.')) }, ic('mic'), ' ', t(l('Gravar pela agenda', 'Record via agenda'))) : null,
    ) : null,
    unrec && !locked ? h('fieldset', null, h('legend', null, t(l('Estúdio, produtor e equipe', 'Studio, producer and team'))),
      h('div', { class: 'row wrap' },
        select(p.tier, STUDIO_TIERS.map((x) => ({ value: x.id, label: t(x.name), disabled: x.id === 0 && s.player.hq < 1 })), (v) => { p.tier = Number(v); rerender(); }),
        select(p.approach, APPROACHES.map((x) => ({ value: x.id as string, label: t(x.name) })), (v) => { p.approach = v; rerender(); }),
        select(p.producerId ?? '', [{ value: '', label: t(l('Sem produtor contratado', 'No hired producer')) }, ...prods.map((x) => ({ value: x.id, label: `${x.name} (${act && producerFit(x, act.genre) >= 1 ? '✓' : '~'} · ${$(money(s, x.fee))}/${t(l('faixa', 'track'))})`, disabled: (s.producerBusy[x.id] ?? 0) > s.week }))], (v) => { p.producerId = v || undefined; rerender(); }),
      ),
      sess ? h('p', null, t(l('Sessão em andamento: dia {d} de {n}.', 'Session in progress: day {d} of {n}.'), { d: sess.dayDone, n: sess.days })) :
        h('button', { class: 'btn small primary', onclick: () => say(recordNow(s, p), l('Sessão de estúdio marcada.', 'Studio session booked.')) }, ic('mic'), ' ', t(l('Gravar agora ({c})', 'Record now ({c})'), { c: $(sessionCost(s, unrec, p.tier, p.approach, p.producerId)) })),
    ) : null,
    lead ? h('fieldset', null, h('legend', null, t(l('Participação especial', 'Guest feature'))),
      feat ? h('p', null, t(l('Faixa principal com participação de ', 'Lead track featuring ')), actLink(s, feat)) :
        locked ? h('p', { class: 'muted small' }, '—') : h('div', { class: 'row wrap' },
          select(p.guestId ?? '', [{ value: '', label: t(l('Sem convidado', 'No guest')) }, ...guests.map((g) => ({ value: g.id, label: `${g.name} (${$(featureFee(s, g))})` }))], (v) => { p.guestId = v || undefined; rerender(); }),
          h('button', { class: 'btn small', disabled: !p.guestId, onclick: () => { toast(t(inviteGuest(s, rngOf(s), p)), 'info'); rerender(); } }, t(l('Convidar', 'Invite'))))) : null,

    ...PROJ_TRACK_EXTRAS18.map((f) => f(s, p, locked)),
  );
}

function coverSection(s: GameState, p: MusicProject, locked: boolean): HTMLElement {
  const act = s.acts[p.actId];
  if (!act) return h('div');
  const opts = coverOptions(s, act.id, p.coverRound);
  const title = p.title || (p.type === 'single' ? s.songs[p.songIds[0]]?.title ?? act.name : act.name);
  const shown = p.cover && !opts.some((o) => o.seed === p.cover!.seed) ? [p.cover as { style: CoverStyle; seed: number }, ...opts] : opts;
  return section(t(l('Capa', 'Cover')),
    h('div', { class: 'cover-pick' },
      shown.map((o) => {
        const def = coverById[o.style as CoverStyle];
        const on = p.cover?.seed === o.seed;
        return h('button', { class: `pick cover-opt ${on ? 'on' : ''}`, disabled: locked && !on, onclick: () => { if (locked) return; p.cover = { ...o }; rerender(); } },
          h('img', { class: 'cover', src: coverUrl(o.seed, title, act.name, act.genre, s.year, 0.6, 160, o.style), width: 96, height: 96, alt: '' }),
          h('b', null, t(def?.name ?? l('?'))), h('small', null, t(def?.effect ?? l(''))), h('small', { class: 'muted' }, def?.cost ? $(coverCost(s, o.style)) : t(l('grátis', 'free'))));
      }),
      !locked ? h('button', { class: 'btn small ghost', onclick: () => { p.coverRound += 1; rerender(); } }, '🎲 ', t(l('Outras propostas', 'Other proposals'))) : null),
  );
}

function budgetSection(s: GameState, p: MusicProject, locked: boolean): HTMLElement {
  const c = projectCosts(s, p);
  const fc = projectForecast(s, p);
  const channels = availableChannels(s);
  const cash = s.player.cash;
  const over = p.budget > 0 && c.committed > p.budget;
  const short = c.remaining > cash;
  return section(t(l('Orçamento e divulgação', 'Budget and promotion')),
    h('div', { class: 'grid2' },
      h('div', null,
        h('label', { class: 'pj-inline' }, t(l('Teto do projeto', 'Project cap')), h('input', { type: 'number', min: 0, step: 500, value: Math.round(p.budget / 100), disabled: locked, onchange: (e: Event) => { p.budget = Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) * 100)); rerender(); } }), h('small', { class: 'muted' }, t(l('0 = sem teto', '0 = no cap')))),
        h('fieldset', null, h('legend', null, t(l('Divulgação no lançamento', 'Launch promotion'))),
          ...p.marketing.map((m, i) => h('div', { class: 'row' },
            select(m.channel, channels.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { m.channel = v; rerender(); }, { disabled: locked }),
            h('input', { type: 'number', min: 0, step: 50, value: Math.round(m.budget / 100), disabled: locked, 'aria-label': t(l('Verba', 'Budget')), onchange: (e: Event) => { m.budget = Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) * 100)); rerender(); } }),
            !locked ? h('button', { class: 'icon', 'aria-label': t(l('Remover', 'Remove')), onclick: () => { p.marketing.splice(i, 1); rerender(); } }, '✕') : null)),
          !locked && channels.length ? h('button', { class: 'btn small ghost', onclick: () => { p.marketing.push({ channel: channels[0].id, budget: money(s, 1000) }); rerender(); } }, '+ ', t(l('Canal', 'Channel'))) : null),
        fc ? kv(t(l('Previsão (10 semanas)', 'Forecast (10 weeks)')), `${N(fc.lo)}–${N(fc.hi)} ${t(l('unid.', 'units'))}`) : null,
      ),
      h('div', { class: 'pj-budget' },
        kv(t(l('Já gasto', 'Already spent')), $(p.spent)),
        c.recording ? kv(t(l('Gravação (a pagar)', 'Recording (to pay)')), $(c.recording)) : null,
        c.feat ? kv(t(l('Participação (a pagar)', 'Feature (to pay)')), $(c.feat)) : null,
        c.cover ? kv(t(l('Capa', 'Cover')), $(c.cover)) : null,
        c.pressing ? kv(t(l('Fabricação', 'Manufacturing')), $(c.pressing)) : null,
        c.marketing ? kv(t(l('Divulgação', 'Promotion')), $(c.marketing)) : null,
        kv(t(l('Comprometido', 'Committed')), h('b', { class: over ? 'bad' : '' }, $(c.committed), p.budget ? ` / ${$(p.budget)}` : '')),
        kv(t(l('Caixa disponível', 'Available cash')), h('b', { class: short ? 'bad' : 'good' }, $(cash))),
        h('div', { class: 'pj-meter', title: t(l('Falta pagar × caixa', 'Still to pay × cash')) }, bar(Math.min(c.remaining, Math.max(1, cash)), Math.max(1, cash), short ? 'bad' : c.remaining > cash * 0.5 ? 'warn' : 'good')),
        short ? h('p', { class: 'bad small' }, t(l('O caixa não cobre o que falta pagar.', 'Cash does not cover what is left to pay.'))) : over ? h('p', { class: 'bad small' }, t(l('O projeto estourou o teto definido.', 'The project is over its cap.'))) : null,
      ),
    ));
}

function calendarSection(s: GameState, p: MusicProject, st: ProjStage): HTMLElement {
  const pr = s.pendingReleases.find((x) => x.id === p.pendingId);
  const ro = p.rolloutId ? s.rollouts.find((x) => x.id === p.rolloutId) : undefined;
  const ready = st === 'finishing';
  return section(t(l('Promoção e calendário', 'Promotion and release calendar')),
    st === 'scheduled' && pr ? h('div', null,
      kv(t(l('Lançamento', 'Release')), t(l('semana {w} (em {n} sem.)', 'week {w} (in {n} wk)'), { w: pr.week, n: Math.max(0, pr.week - s.week) })),
      h('button', { class: 'btn small ghost', onclick: () => { unscheduleProject(s, p); toast(t(l('Lançamento cancelado; fabricação e divulgação devolvidas.', 'Release cancelled; manufacturing and promotion refunded.')), 'info'); rerender(); } }, t(l('Cancelar lançamento', 'Cancel release')))) : null,
    ro ? h('ul', { class: 'pj-phases' }, ro.phases.map((ph) => h('li', { class: ph.done ? 'done' : '' }, `${t(l('sem.', 'wk'))} ${ph.week} · ${ph.kind}`, ph.budget ? ` · ${$(ph.budget)}` : '', ph.done ? ' ✓' : ''))) : null,
    st !== 'scheduled' && st !== 'released' && st !== 'followup' ? h('div', { class: 'form' },
      h('label', { class: 'pj-inline' }, t(l('Lançar daqui a (semanas)', 'Release in (weeks)')), h('input', { type: 'number', min: 1, max: 26, value: p.weeksAhead, onchange: (e: Event) => { p.weeksAhead = Math.max(1, Math.min(26, Number((e.target as HTMLInputElement).value) || 1)); } })),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', disabled: !ready, onclick: () => say(scheduleProject(s, rngOf(s), p), l('Lançamento programado.', 'Release scheduled.')) }, ic('cd'), ' ', t(l('Programar lançamento', 'Schedule release'))),
        p.type === 'lp' ? h('button', { class: 'btn', disabled: !ready, title: t(l('Teaser, pré-save, singles de trabalho, clipe e álbum, fase a fase.', 'Teaser, pre-save, lead singles, video and album, phase by phase.')), onclick: () => say(rolloutProject(s, p), l('Rollout planejado.', 'Rollout planned.')) }, ic('calendar'), ' ', t(l('Lançar com rollout', 'Release with a rollout'))) : null),
      !ready ? h('p', { class: 'muted small' }, t(l('Disponível quando todas as faixas estiverem gravadas.', 'Available once every track is recorded.'))) : null,
    ) : null,
  );
}

function resultSection(s: GameState, p: MusicProject): HTMLElement | null {
  const res = projectResult(s, p);
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  if (!res || !rel) return null;
  const act = s.acts[p.actId];
  return section(t(l('Resultado e próximos passos', 'Results and next moves')),
    h('div', { class: 'row wrap' },
      kv(t(l('Unidades', 'Units')), N(res.units)),
      kv(t(l('Melhor posição', 'Peak')), res.peak < 999 ? `#${res.peak}` : '—'),
      kv(t(l('Receita', 'Revenue')), $(res.revenue)),
      kv(t(l('Gasto do projeto', 'Project spend')), $(res.spent)),
      kv(t(l('Meta', 'Goal')), h('span', null, t(GOALS[p.goal].name), ' ', res.goalMet === null ? pill(t(l('em aberto', 'open'))) : res.goalMet ? pill(t(l('cumprida', 'met')), 'good') : pill(t(l('não cumprida', 'missed')), 'bad'))),
    ),
    h('p', { class: 'muted small' }, t(res.goalText)),
    explainBox(s, rel),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => openRelease(rel.id) }, ic('disc'), ' ', t(l('Ficha do lançamento', 'Release sheet'))),
      act ? h('button', { class: 'btn small primary', onclick: () => { const n = createProject(s, act.id, { type: rel.type === 'single' ? 'ep' : 'single', concept: p.concept }); if ('pt' in n) toast(t(n), 'bad'); else ui.sel = n.id; rerender(); } }, ic('note'), ' ', t(l('Próximo projeto de {a}', 'Next project for {a}'), { a: act.name })) : null,
      h('button', { class: 'btn small', onclick: () => { store.area = 'shows'; rerender(); } }, ic('mic'), ' ', t(l('Marcar shows', 'Book shows'))),
      h('button', { class: 'btn small', onclick: () => { store.area = 'media'; rerender(); } }, ic('newspaper'), ' ', t(l('Mídia e imprensa', 'Media and press'))),
      h('button', { class: 'btn small ghost', onclick: () => { closeProject(s, p); ui.sel = ''; rerender(); } }, t(l('Arquivar projeto', 'Archive project'))),
    ));
}

function projectDetail(s: GameState, p: MusicProject): HTMLElement {
  const st = projectStage(s, p);
  const locked = st === 'scheduled' || st === 'released' || st === 'followup';
  return h('div', { class: 'pj-detail' },
    stepper(st),
    h('p', { class: 'pj-hint' }, ic('sparkle'), ' ', t(HINT[st])),
    resultSection(s, p),
    conceptSection(s, p, locked),
    tracksSection(s, p, locked),
    coverSection(s, p, locked),
    budgetSection(s, p, locked),
    calendarSection(s, p, st),
    !locked ? h('button', { class: 'btn small ghost', onclick: () => { closeProject(s, p); ui.sel = ''; rerender(); } }, t(l('Descartar projeto', 'Discard project'))) : null,
  );
}

function projectsTab(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const act = s.acts[store.selectedAct ?? ''] ?? s.acts[ids[0]];
  if (!act) return h('p', { class: 'muted' }, t(l('Sem artistas no elenco.', 'No acts on the roster.')));
  const all = openProjects(s).sort((a, b) => Number(a.actId !== act.id) - Number(b.actId !== act.id) || b.created - a.created);
  let cur = projectById(s, ui.sel);
  if (!cur || cur.closed) cur = all.find((p) => p.actId === act.id) ?? all[0];
  if (cur) ui.sel = cur.id;
  return h('div', { class: 'pj' },
    h('aside', { class: 'pj-side' },
      h('h4', null, t(l('Projetos em andamento', 'Projects in progress'))),
      all.length ? h('div', { class: 'pj-list' }, all.map((p) => projectCard(s, p))) : h('p', { class: 'muted small' }, t(l('Nenhum ainda. Um projeto junta faixas, gravação, capa, verba, calendário e resultado de um disco.', 'None yet. A project gathers a record\'s tracks, recording, cover, budget, calendar and results.'))),
      newProjectForm(s, act),
    ),
    h('div', { class: 'pj-main' }, cur ? projectDetail(s, cur) : h('p', { class: 'muted' }, t(l('Crie um projeto para conduzir o próximo disco daqui.', 'Create a project to drive the next record from here.')))),
  );
}

// ---------------------------------------------------------------- leitura do resultado

/** "Por que deu nisso?": explicação do lançamento (ficha e projeto). */
export function explainBox(s: GameState, rel: Release): HTMLElement | null {
  const mine = rel.owner === 'player' || s.acts[rel.actId]?.playerBand;
  if (!mine || rel.hist) return null;
  const ex = explainRelease(s, rel);
  if (!ex) return null;
  const capT = (x: L) => { const v = t(x); return v.charAt(0).toUpperCase() + v.slice(1); };
  const pct = ex.ratio !== null ? Math.round(ex.ratio * 100) : null;
  return h('div', { class: 'pj-explain' },
    h('h4', null, t(l('Por que deu nisso?', 'Why did this happen?'))),
    ex.weeks < 2 ? h('p', { class: 'muted small' }, t(l('Recém-lançado: a leitura fica mais confiável depois das primeiras semanas.', 'Just released: the reading gets more reliable after the first weeks.'))) : null,
    h('p', { class: 'pj-reading' }, t(ex.summary)),
    h('div', { class: 'grid2' },
      h('div', null, h('b', { class: 'good' }, t(l('O que mais ajudou', 'What helped most'))),
        ex.helped.length ? h('ol', null, ex.helped.map((f) => h('li', null, capT(f.text), ' ', h('small', { class: 'muted' }, `×${f.value.toFixed(2)}`)))) : h('p', { class: 'muted small' }, '—')),
      h('div', null, h('b', { class: 'bad' }, t(l('O que mais atrapalhou', 'What hurt most'))),
        ex.hurt.length ? h('ol', null, ex.hurt.map((f) => h('li', null, capT(f.text), ' ', h('small', { class: 'muted' }, `×${f.value.toFixed(2)}`)))) : h('p', { class: 'muted small' }, '—')),
    ),
    ex.expected !== null && ex.weeks > 0 ? h('div', { class: 'pj-vs' },
      kv(t(l('Resultado × expectativa', 'Result vs expectation')), h('span', null,
        `${N(ex.actual)} / ${N(ex.expected)} ${t(l('unid. em {w} sem.', 'units in {w} wk'), { w: ex.weeks })} `,
        pill(`${pct}% · ${t(ex.verdictText)}`, ex.verdict === 'smash' || ex.verdict === 'above' ? 'good' : ex.verdict === 'par' ? '' : 'bad'))),
      bar(Math.min(200, pct ?? 0), 200, (pct ?? 0) >= 100 ? 'good' : 'bad'),
    ) : h('p', { class: 'muted small' }, t(l('Sem previsão guardada para comparar (lançamento anterior a esta leitura).', 'No stored forecast to compare (release predates this reading).'))),
    h('p', { class: 'pj-opp' }, ic('sparkle'), ' ', h('b', null, t(l('Oportunidade: ', 'Opportunity: '))), t(ex.opportunity)),
  );
}

RELEASE_EXTRAS.push((s, rel) => explainBox(s, rel));

ACT_HEAD_EXTRAS.push((s, a, close) => {
  if (a.owner !== 'player' && !a.playerBand) return null;
  const n = openProjects(s, a.id).length;
  return h('button', { class: 'btn small', onclick: () => { close(); goToProjects(a.id); } }, ic('note'), ' ', t(l('Projeto musical', 'Music project')), n ? ` (${n})` : '');
});

registerTab('creation', {
  id: 'projects', label: l('Projetos', 'Projects'), icon: 'note', order: 10, render: projectsTab,
  // aviso: projetos com tudo gravado, prontos para programar
  badge: (s) => openProjects(s).filter((p) => projectStage(s, p) === 'finishing').length || undefined,
});
