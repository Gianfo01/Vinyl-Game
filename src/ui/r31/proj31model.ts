// R31 · onda 2 (J) — PROJETO MUSICAL em cena: a rua do lançamento, modelo PURO.
//   compor → estúdio → fábrica → rádio → loja, pelo plano REAL do projeto (sim/sys/project8 e project12):
//   etapa feita = ✓, etapa atual acesa com barra, futuras apagadas com o mês (≈ quando é estimativa);
//   lançamento digital não tem fábrica; divulgação, clipe e turnê aparecem como bandeiras (marcos) na calçada,
//   também em paralelo; a van para na frente da etapa em que o projeto está.
// As ações da rua são AS MESMAS funções dos botões do projeto (planWriting, recordNow, scheduleProject…): a cena só
// leva até elas (PROJ_ACTS31; o teste confere). Montar o modelo só lê.

import { tourList } from '../../sim/tours';
import { CHANNELS, FORMATS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { availableFormats } from '../../sim/production';
import { lock31, UNLOCK31, type Lock31 } from '../../sim/r31/lock';
import { rng19 } from '../../sim/rng19';
import {
  needSongs, planRecording, planWriting, projectSession, projectStage, recordNow, rolloutProject, scheduleProject, unscheduleProject,
  type MusicProject, type ProjStage,
} from '../../sim/sys/project8';
import { weeksNeeded } from '../../sim/sys/project12';
import type { GameState } from '../../sim/types';
import { dateOfDay, fmtL } from '../../sim/util';
import { releaseLock31 } from './quick31core';
import { MON31, type Spot31 } from './scene31model';

export const PROJ_W31 = 320;
export const PROJ_H31 = 164;
/** Topo das fachadas, calçada e pista. */
export const ST_TOP31 = 34, WALK_Y31 = 120, ROAD_Y31 = 128;

export type StageId31 = 'compose' | 'studio' | 'factory' | 'radio' | 'store';
export type StageState31 = 'done' | 'now' | 'next';
export type ProjActId31 = 'write' | 'recordNow' | 'planRecord' | 'schedule' | 'rollout' | 'unschedule';

/** As ações da rua = as funções dos botões do projeto (mesmo resultado do formulário). */
export const PROJ_ACTS31: Record<ProjActId31, { label: L; run: (s: GameState, p: MusicProject) => L | null; ok: L }> = {
  write: { label: l('Compor (põe na agenda do mês)', 'Write (adds it to this month\'s agenda)'), run: planWriting, ok: l('Composição na agenda.', 'Writing on the agenda.') },
  recordNow: { label: l('Gravar já as faixas do projeto', 'Record the project\'s tracks now'), run: recordNow, ok: l('Sessão de estúdio marcada.', 'Studio session booked.') },
  planRecord: { label: l('Gravar na agenda do mês', 'Record on this month\'s agenda'), run: planRecording, ok: l('Gravação na agenda.', 'Recording on the agenda.') },
  schedule: { label: l('Programar lançamento', 'Schedule release'), run: (s, p) => scheduleProject(s, rng19(s, 'act'), p), ok: l('Lançamento programado.', 'Release scheduled.') },
  rollout: { label: l('Lançar com rollout', 'Release with a rollout'), run: rolloutProject, ok: l('Rollout planejado.', 'Rollout planned.') },
  unschedule: { label: l('Cancelar lançamento', 'Cancel release'), run: (s, p) => { unscheduleProject(s, p); return null; }, ok: l('Lançamento cancelado; fabricação e divulgação devolvidas.', 'Release cancelled; manufacturing and promotion refunded.') },
};

export interface ProjAct31 { id: ProjActId31; lock: Lock31 | null }
export interface Stage31 {
  id: StageId31; name: L; state: StageState31;
  /** barra da etapa atual (feito/total) */
  bar?: { a: number; b: number; label: L };
  /** mês (≈ quando é estimativa) ou ✓ */
  when: L;
  tip: L;
  acts: ProjAct31[];
  x: number; w: number;
}
export type FlagKind31 = 'promo' | 'media' | 'video' | 'tour' | 'teaser';
export interface Flag31 { id: string; kind: FlagKind31; stage: StageId31; name: L; done: boolean; when?: L; x: number }
export interface Proj31 {
  W: number; H: number; year: number; pid: string; actId: string; title: string; digital: boolean; ps: ProjStage;
  stages: Stage31[]; flags: Flag31[]; van: { x: number; stage: StageId31 }; me: { x: number; personAct: string };
  spots: Spot31[];
}

const NAMES: Record<StageId31, L> = {
  compose: l('Compor', 'Write'), studio: l('Estúdio', 'Studio'), factory: l('Fábrica', 'Pressing'), radio: l('Rádio', 'Radio'), store: l('Loja', 'Store'),
};
const MEDIA_CH = new Set(['press', 'tv_show', 'music_video']);
const monthOf = (s: GameState, w: number): L => MON31[dateOfDay(s.config.startYear, Math.max(0, w) * 7).month];

/** O lançamento é só digital (sem fábrica)? Vale o que foi programado; antes disso, os formatos da época. */
export function digital31(s: GameState, p: MusicProject): boolean {
  const pr = s.pendingReleases.find((x) => x.id === p.pendingId);
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  const fm = pr?.formats ?? rel?.formats ?? availableFormats(s);
  return !fm.some((f) => FORMATS.find((x) => x.id === f)?.physical);
}

export function proj31(s: GameState, p: MusicProject): Proj31 {
  const ps = projectStage(s, p);
  const digital = digital31(s, p);
  const ids: StageId31[] = digital ? ['compose', 'studio', 'radio', 'store'] : ['compose', 'studio', 'factory', 'radio', 'store'];
  const need = needSongs(p.type);
  const tracks = p.songIds.filter((id) => !!s.songs[id]);
  const rec = tracks.filter((id) => s.songs[id].recorded).length;
  const sess = projectSession(s, p);
  const pr = s.pendingReleases.find((x) => x.id === p.pendingId);
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  const ro = p.rolloutId ? s.rollouts.find((x) => x.id === p.rolloutId) : undefined;
  // etapa atual pelo estágio do motor
  const cur: StageId31 = ps === 'concept' || ps === 'writing' ? 'compose' : ps === 'recording' ? 'studio'
    : ps === 'finishing' ? (digital ? 'radio' : 'factory') : ps === 'scheduled' ? 'radio' : 'store';
  const ci = ids.indexOf(cur);
  // datas: lançamento marcado (fato) ou estimado pelo trabalho que falta (≈)
  let relW: number | undefined = pr?.week ?? rel?.week ?? ro?.phases.find((x) => x.kind === 'album')?.week;
  let est = false;
  if (relW === undefined) { try { relW = s.week + weeksNeeded(s, p); est = true; } catch { relW = undefined; } }
  const whenOf = (id: StageId31, i: number): L => {
    if (i < ci || (id === 'store' && ps === 'followup')) return l('✓', '✓');
    if (relW === undefined) return l('—', '—');
    const w = id === 'store' ? relW : id === 'radio' ? relW - Math.max(1, p.weeksAhead) : id === 'factory' ? relW - Math.max(1, p.weeksAhead) - 1 : relW - Math.max(1, p.weeksAhead) - 2;
    const m = monthOf(s, Math.max(s.week, w));
    return est ? fmtL(l('≈ {m}', '≈ {m}'), { m }) : m;
  };
  const relLock = (() => { try { return releaseLock31(s, p.actId, p.id); } catch { return null; } })();
  const unrecLock = tracks.length > rec ? null : lock31(l('Não há faixas do projeto para gravar.', 'No project tracks left to record.'), UNLOCK31.songs);
  const sessLock = sess ? lock31(l('Já há uma sessão de estúdio em andamento para este disco.', 'A studio session for this record is already under way.'), UNLOCK31.wait) : null;
  const locked = !!(p.pendingId || p.rolloutId || p.releaseId);
  const W = PROJ_W31 - 16, bw = Math.floor(W / ids.length);
  const stages: Stage31[] = ids.map((id, i) => {
    const state: StageState31 = id === 'store' && ps === 'followup' ? 'done' : i < ci ? 'done' : i === ci ? 'now' : 'next';
    const acts: ProjAct31[] = [];
    let bar: Stage31['bar'];
    let tip: L;
    if (id === 'compose') {
      bar = { a: Math.min(tracks.length, need), b: need, label: fmtL(l('{a}/{b} faixas', '{a}/{b} tracks'), { a: Math.min(tracks.length, need), b: need }) };
      tip = state === 'done' ? fmtL(l('Composição feita: {n} faixas no disco.', 'Writing done: {n} tracks on the record.'), { n: tracks.length }) : fmtL(l('Compondo: {a} de {b} faixas. Músicas novas entram sozinhas no projeto.', 'Writing: {a} of {b} tracks. New songs join the project by themselves.'), { a: tracks.length, b: need });
      if (!locked && state !== 'done') acts.push({ id: 'write', lock: null });
    } else if (id === 'studio') {
      bar = sess ? { a: sess.dayDone, b: sess.days, label: fmtL(l('{a}/{b} dias de estúdio', '{a}/{b} studio days'), { a: sess.dayDone, b: sess.days }) } : { a: rec, b: Math.max(1, tracks.length), label: fmtL(l('{a}/{b} faixas gravadas', '{a}/{b} tracks recorded'), { a: rec, b: tracks.length }) };
      tip = state === 'done' ? l('Gravação feita: todas as faixas gravadas.', 'Recording done: every track recorded.') : sess ? fmtL(l('Gravando: dia {a} de {b}.', 'Recording: day {a} of {b}.'), { a: sess.dayDone, b: sess.days }) : fmtL(l('Estúdio: {a} de {b} faixas gravadas.', 'Studio: {a} of {b} tracks recorded.'), { a: rec, b: tracks.length });
      if (!locked && state !== 'done') { acts.push({ id: 'recordNow', lock: sessLock ?? unrecLock }); acts.push({ id: 'planRecord', lock: unrecLock }); }
    } else if (id === 'factory') {
      tip = state === 'done' ? l('Tiragem e prensagem definidas no lançamento.', 'Run and pressing set with the release.') : state === 'now' ? l('Tudo gravado: escolha a data — a tiragem e a prensagem saem com o lançamento.', 'Everything recorded: pick the date — the run and pressing go with the release.') : l('Tiragem e prensagem (depois da gravação).', 'Run and pressing (after recording).');
      if (ps === 'finishing') { acts.push({ id: 'schedule', lock: relLock }); if (p.type === 'lp') acts.push({ id: 'rollout', lock: relLock }); }
    } else if (id === 'radio') {
      const ch = (pr?.marketing ?? p.marketing).filter((m) => m.budget > 0).length;
      tip = state === 'done' ? l('Divulgação feita: o disco saiu.', 'Promotion done: the record is out.') : state === 'now' && ps === 'scheduled' ? fmtL(l('Divulgação em curso: {n} canais até o lançamento.', 'Promotion under way: {n} channels until release.'), { n: ch }) : fmtL(l('Divulgação e jabá: {n} canais planejados.', 'Promotion and plugging: {n} channels planned.'), { n: ch });
      if (ps === 'finishing' && digital) { acts.push({ id: 'schedule', lock: relLock }); if (p.type === 'lp') acts.push({ id: 'rollout', lock: relLock }); }
      if (ps === 'scheduled' && pr) acts.push({ id: 'unschedule', lock: null });
      if (ps === 'scheduled' && relW !== undefined) bar = { a: Math.max(0, Math.max(1, p.weeksAhead) - Math.max(0, relW - s.week)), b: Math.max(1, p.weeksAhead), label: fmtL(l('sai em {n} sem.', 'out in {n} wk'), { n: Math.max(0, relW - s.week) }) };
    } else {
      const units = rel ? rel.weekly.reduce((t, x) => t + x, 0) : 0;
      tip = rel ? fmtL(l('Nas lojas desde {m}: {u} unidades, melhor posição {p}.', 'In stores since {m}: {u} units, peak {p}.'), { m: monthOf(s, rel.week), u: units, p: rel.peak && rel.peak < 999 ? `#${rel.peak}` : '—' }) : l('Lançamento e vendas.', 'Release and sales.');
      if (rel) bar = { a: Math.min(8, s.week - rel.week), b: 8, label: fmtL(l('{n} sem. nas lojas', '{n} wk in stores'), { n: Math.max(0, s.week - rel.week) }) };
    }
    return { id, name: NAMES[id], state, bar: state === 'now' ? bar : undefined, when: whenOf(id, i), tip, acts, x: 8 + i * bw, w: bw };
  });
  const sx = (id: StageId31): Stage31 | undefined => stages.find((x) => x.id === id);

  // bandeiras: divulgação (laranja) no rádio, mídia (azul) na loja, rollout por fase, turnê em paralelo
  const flags: Flag31[] = [];
  const mk = (pr?.marketing ?? p.marketing).filter((m) => m.budget > 0);
  const promo = mk.filter((m) => !MEDIA_CH.has(m.channel)), media = mk.filter((m) => MEDIA_CH.has(m.channel));
  const chName = (xs: typeof mk): L => ({ pt: xs.map((m) => CHANNELS.find((c) => c.id === m.channel)?.name.pt ?? '—').join(', '), en: xs.map((m) => CHANNELS.find((c) => c.id === m.channel)?.name.en ?? '—').join(', ') });
  const doneMk = ps === 'released' || ps === 'followup';
  if (promo.length) flags.push({ id: 'promo', kind: 'promo', stage: 'radio', name: fmtL(l('Campanha de divulgação: {c}', 'Promotion campaign: {c}'), { c: chName(promo) }), done: doneMk, x: 0 });
  if (media.length) flags.push({ id: 'media', kind: 'media', stage: 'store', name: fmtL(l('TV e imprensa: {c}', 'TV and press: {c}'), { c: chName(media) }), done: doneMk, x: 0 });
  for (const ph of ro?.phases ?? []) {
    if (ph.kind !== 'teaser' && ph.kind !== 'video' && ph.kind !== 'single' && ph.kind !== 'presave') continue;
    const kind: FlagKind31 = ph.kind === 'video' ? 'video' : 'teaser';
    const nm: L = ph.kind === 'video' ? l('Clipe', 'Music video') : ph.kind === 'single' ? l('Single de trabalho', 'Lead single') : ph.kind === 'presave' ? l('Pré-save', 'Pre-save') : l('Teaser', 'Teaser');
    flags.push({ id: `ro:${ph.kind}:${ph.week}`, kind, stage: ph.week <= (relW ?? ph.week) ? 'radio' : 'store', name: nm, done: ph.done, when: monthOf(s, ph.week), x: 0 });
  }
  const tr = tourList(s).find((x) => x.actId === p.actId && (x.status === 'planned' || x.status === 'running'));
  if (tr) flags.push({ id: 'tour', kind: 'tour', stage: 'store', name: fmtL(l('Turnê em paralelo: {t}', 'Tour in parallel: {t}'), { t: tr.name }), done: false, x: 0 });
  // posição na calçada: à direita da etapa, empilhando para a esquerda
  const used = new Map<StageId31, number>();
  for (const f of flags) {
    const st = sx(f.stage) ?? stages[stages.length - 1];
    const k = used.get(st.id) ?? 0; used.set(st.id, k + 1);
    f.x = st.x + st.w - 8 - k * 10;
  }
  const cs = sx(cur) ?? stages[0];
  const van = { x: cs.x + Math.round(cs.w / 2), stage: cur };
  const me = { x: cs.x + 10, personAct: p.actId };

  const spots: Spot31[] = [];
  for (const st of stages) {
    const stTxt = st.state === 'done' ? l('feito', 'done') : st.state === 'now' ? l('agora', 'now') : l('depois', 'later');
    spots.push({ id: `stage:${st.id}`, x: st.x + 1, y: ST_TOP31 - 14, w: st.w - 2, h: WALK_Y31 - ST_TOP31 + 14,
      label: st.name, tip: fmtL(l('{n} ({s}): {t}', '{n} ({s}): {t}'), { n: st.name, s: stTxt, t: st.tip }),
      badge: { text: st.state === 'now' && st.bar ? st.bar.label : st.when, level: st.state === 'now' ? 'normal' : 'info', sym: st.state === 'now' ? '▶' : undefined }, go: { panel: `stage:${st.id}` }, quiet: true });
  }
  for (const f of flags) spots.push({ id: `flag:${f.id}`, x: f.x - 5, y: WALK_Y31 - 26, w: 10, h: 28, label: f.name, tip: fmtL(l('Marco: {n}{w}{d}. Abre marketing e rollout.', 'Milestone: {n}{w}{d}. Opens marketing and rollout.'), { n: f.name, w: f.when ? fmtL(l(' ({m})', ' ({m})'), { m: f.when }) : l('', ''), d: f.done ? l(' — feito', ' — done') : l('', '') }),
    badge: f.done ? { text: '✓', level: 'info' } : undefined, quiet: true, go: f.kind === 'tour' ? { area: 'shows', tab: ['showsHub', 'tours'] } : { area: 'releases', tab: ['creation-release', p.type === 'lp' ? 'rollout' : 'launch'] } });
  spots.push({ id: 'van', x: van.x - 24, y: ROAD_Y31 - 2, w: 48, h: 24, label: l('Van do projeto', 'Project van'), tip: fmtL(l('O projeto está em: {s}. Ações rápidas do projeto.', 'The project is at: {s}. Project quick actions.'), { s: cs.name }), go: { quick: { kind: 'project', id: p.id } }, quick: { kind: 'project', id: p.id } });
  spots.push({ id: 'me', x: me.x - 7, y: WALK_Y31 - 32, w: 14, h: 32, label: l('Você', 'You'), tip: l('Você, acompanhando o disco. Abre o seu painel.', 'You, following the record. Opens your panel.'), go: { area: 'you' } });

  const a = s.acts[p.actId];
  return { W: PROJ_W31, H: PROJ_H31, year: s.year, pid: p.id, actId: p.actId, title: `${a?.name ?? '—'}: ${p.title || p.type.toUpperCase()}`, digital, ps, stages, flags, van, me, spots };
}
