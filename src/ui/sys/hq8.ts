// Sede como interface (rodada 8): balões de estado sobre cada carreira (gravando, compondo, ensaiando,
// descansando, à toa, precisa de atenção), etiquetas nas salas (estúdio livre, gravando ou com fila;
// equipe sem braço), clique no estúdio abre a sessão em andamento, clique no artista mostra a próxima
// decisão importante, lista lateral para acesso direto e linha do tempo do crescimento da empresa.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { recordingSessionsAvailable } from '../../sim/production';
import { PRODUCERS, resolveTake } from '../../sim/studio';
import { actStatus, hq8, hqChanges, studioLoad, type ActStatus, type Attention, type HqKind } from '../../sim/sys/hq8';
import { overCapacity } from '../../sim/sys/pacing8';
import type { GameState } from '../../sim/types';
import { playerActs, rngOf } from '../../sim/util';
import { $, actLink, inspect, logo, modal, pill, rerender, section } from '../common';
import { h } from '../dom';
import { hqHooks, type BubbleKind, type RoomTag } from '../hq';
import { registerSection } from '../registry';
import { store } from '../store';
import { ic, setTab } from '../vis';
import './round8.css';

const KIND: Record<HqKind, { name: L; icon: string; cls: string }> = {
  record: { name: l('Gravando', 'Recording'), icon: 'mic', cls: 'bad' },
  write: { name: l('Compondo', 'Writing'), icon: 'pen', cls: 'info' },
  tour: { name: l('Na estrada', 'On tour'), icon: 'tour-bus', cls: 'good' },
  rehearse: { name: l('Ensaiando', 'Rehearsing'), icon: 'guitar', cls: 'info' },
  rest: { name: l('Descansando', 'Resting'), icon: 'sleep', cls: '' },
  idle: { name: l('À toa', 'Idle'), icon: 'clock', cls: 'warn' },
  hiatus: { name: l('Em pausa', 'On hiatus'), icon: 'sleep', cls: '' },
};

const ATT: Record<Attention, { name: L; icon: string }> = {
  decision: { name: l('decisão na mesa', 'decision on the desk'), icon: 'calendar' },
  take: { name: l('take esperando escolha', 'take waiting for a choice'), icon: 'mic' },
  crisis: { name: l('crise aberta', 'open crisis'), icon: 'fire' },
  tired: { name: l('exausto', 'exhausted'), icon: 'stress' },
  trust: { name: l('confiança baixa', 'low trust'), icon: 'broken-heart' },
  contract: { name: l('contrato acabando', 'contract ending'), icon: 'contract' },
  empty: { name: l('agenda vazia', 'empty agenda'), icon: 'calendar' },
  queue: { name: l('músicas na fila do estúdio', 'songs queued for the studio'), icon: 'note' },
};

// cache curto: a sede consulta várias vezes por segundo
let cacheKey = '';
let cache = new Map<string, ActStatus>();
function status(s: GameState, actId: string): ActStatus | null {
  const key = `${s.week}|${s.clock.dayInMonth}|${s.decisions.length}|${s.sessions.length}|${s.crises.length}|${s.pendingReleases.length}|${Object.keys(s.agenda).length}`;
  if (key !== cacheKey) { cacheKey = key; cache = new Map(); }
  const act = s.acts[actId];
  if (!act) return null;
  let st = cache.get(actId);
  if (!st) { st = actStatus(s, act); cache.set(actId, st); }
  return st;
}

const urgent = (st: ActStatus) => st.attention.some((a) => a !== 'queue' && a !== 'empty');

function bubble(s: GameState, actId: string): BubbleKind | null {
  const st = status(s, actId);
  if (!st) return null;
  if (urgent(st)) return 'attention';
  if (st.kind === 'tour' || st.kind === 'hiatus') return null;
  return st.kind;
}

function roomTags(s: GameState): RoomTag[] {
  const ids = playerActs(s);
  const sts = ids.map((id) => status(s, id)).filter((x): x is ActStatus => !!x);
  const out: RoomTag[] = [];
  const load = studioLoad(s);
  const recording = sts.filter((x) => x.kind === 'record').length;
  if (recording) out.push({ room: 'booth', text: t(l('Gravando {n}', 'Recording {n}'), { n: recording }), tone: 'bad' });
  else if (load.waiting.length) out.push({ room: 'booth', text: t(l('Fila {n}', 'Queue {n}'), { n: load.waiting.length }), tone: 'warn' });
  else out.push({ room: 'booth', text: t(l('Livre', 'Free')), tone: 'good' });
  const n = (k: HqKind) => sts.filter((x) => x.kind === k).length;
  if (n('write')) out.push({ room: 'writing', text: t(l('Compondo {n}', 'Writing {n}'), { n: n('write') }), tone: 'info' });
  if (n('rehearse')) out.push({ room: 'rehearsal', text: t(l('Ensaio {n}', 'Rehearsal {n}'), { n: n('rehearse') }), tone: 'info' });
  if (n('rest')) out.push({ room: 'lounge', text: t(l('Pausa {n}', 'Rest {n}'), { n: n('rest') }), tone: 'info' });
  const over = overCapacity(s).size;
  if (over) out.push({ room: 'office', text: t(l('Sem braco {n}', 'Overload {n}'), { n: over }), tone: 'bad' });
  else if (n('idle')) out.push({ room: 'office', text: t(l('Ociosos {n}', 'Idle {n}'), { n: n('idle') }), tone: 'warn' });
  return out;
}

// ---------------------------------------------------------------- ações

function goArea(area: string, tab?: [string, string], actId?: string): void {
  document.querySelector('.overlay')?.remove();
  if (tab) setTab(tab[0], tab[1]);
  if (actId) store.selectedAct = actId;
  store.area = area;
  rerender();
}

/** Sessões em andamento (o estúdio da sede). */
export function openSessions(s: GameState): void {
  const r = rngOf(s);
  let close = () => {};
  const sessions = s.sessions.filter((x) => !x.done);
  const load = studioLoad(s);
  const draw = (): HTMLElement => h('div', { class: 'hq8-sessions' },
    h('p', { class: 'small muted' }, t(l('Sessões em andamento: {b} · vagas de sessão própria por mês: {c} · músicas esperando gravação: {q}', 'Sessions in progress: {b} · own-studio session slots per month: {c} · songs waiting to be recorded: {q}'), { b: load.busy, c: recordingSessionsAvailable(s), q: load.queue })),
    sessions.length ? sessions.map((ss) => {
      const act = s.acts[ss.actId];
      const pr = PRODUCERS.find((x) => x.id === ss.producerId);
      return h('div', { class: 'session' },
        h('header', null, act ? logo(act, 28) : null, h('b', null, act?.name ?? ''), pr ? pill(pr.name) : null, h('span', { class: 'muted small' }, ` ${ss.dayDone}/${ss.days} ${t(l('dias', 'days'))}`),
          h('span', { class: 'meter-bar' }, h('span', { style: `width:${Math.round((ss.dayDone / Math.max(1, ss.days)) * 100)}%` }))),
        h('ul', { class: 'takes' }, ss.songIds.map((sid) => {
          const song = s.songs[sid];
          const takes = ss.takes[sid] ?? [];
          return h('li', null, ic(song?.recorded ? 'disc' : 'mic'), ' ', h('b', null, song?.title ?? ''), ' ',
            h('span', { class: 'take-dots' }, takes.map((tk) => h('span', { class: `take ${tk.quality > 70 ? 'good' : tk.quality < 40 ? 'bad' : ''}`, title: `${t(l('Take', 'Take'))} ${tk.n}: ${tk.quality} — ${t(tk.note)}` }, String(tk.quality)))),
            song?.recorded ? pill(`Q ${Math.round(song.q)}`, 'good') : null);
        })),
        ss.decision ? h('div', { class: 'row wrap' },
          h('span', { class: 'small' }, t(l('Decisão do take:', 'Take decision:'))),
          ...ss.decision.options.map((o) => h('button', { class: `btn small ${o === 'keep' ? 'primary' : ''}`, onclick: () => { resolveTake(s, r, ss.id, o); close(); rerender(); openSessions(s); } },
            t(o === 'keep' ? l('Manter o melhor', 'Keep the best') : o === 'another' ? l('Mais um take', 'One more take') : l('Montar dos melhores', 'Comp the best'))))) : null,
      );
    }) : h('p', null, t(l('O estúdio está livre.', 'The studio is free.'))),
    load.waiting.length ? h('p', { class: 'small' }, t(l('Esperando estúdio: ', 'Waiting for the studio: ')), ...load.waiting.map((id) => h('span', null, actLink(s, id), ' '))) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => goArea('creation', ['creation', 'session'], load.waiting[0] ?? sessions[0]?.actId) }, ic('mic'), ' ', t(l('Marcar uma sessão', 'Book a session')))),
  );
  close = modal(t(l('Estúdio — sessões em andamento', 'Studio — sessions in progress')), draw(), { wide: true });
}

function doNext(s: GameState, actId: string, st: ActStatus): void {
  switch (st.next.kind) {
    case 'decision': return goArea('desk');
    case 'take': document.querySelector('.overlay')?.remove(); return openSessions(s);
    case 'crisis': return goArea('plan');
    case 'contract': document.querySelector('.overlay')?.remove(); return inspect.act(actId);
    case 'release': return goArea('creation', ['creation', 'launch'], actId);
    case 'studio': return goArea('creation', ['creation', 'session'], actId);
    default: return goArea('artists', undefined, actId);
  }
}

/** Cartão rápido da carreira: estado, atenção, projeto e a próxima decisão importante. */
export function openActCard(s: GameState, actId: string): void {
  const act = s.acts[actId];
  const st = status(s, actId);
  if (!act || !st) return inspect.act(actId);
  const k = KIND[st.kind];
  const body = h('div', { class: 'hq8-card' },
    h('div', { class: 'row' }, logo(act, 48), h('div', null, h('h3', null, act.name), pill(t(k.name), k.cls), s.delegated[actId] !== false ? pill(t(l('delegada', 'delegated'))) : null)),
    st.attention.length ? h('ul', { class: 'small attention' }, st.attention.map((a) => h('li', null, ic(ATT[a].icon), ' ', t(ATT[a].name)))) : h('p', { class: 'small good' }, t(l('Nada pedindo atenção.', 'Nothing needs attention.'))),
    st.project ? h('div', { class: 'small' }, h('b', null, t(l('Projeto: ', 'Project: '))), t(st.project.label), ' ', h('span', { class: 'meter-bar' }, h('span', { style: `width:${Math.round(st.project.pct * 100)}%` }))) : null,
    h('div', { class: 'next-step' }, h('h4', null, t(l('Próxima decisão importante', 'Next important decision'))), h('p', null, t(st.next.label)),
      h('button', { class: 'btn primary', onclick: () => doNext(s, actId, st) }, t(l('Resolver agora', 'Handle it now')))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small ghost', onclick: () => { document.querySelector('.overlay')?.remove(); inspect.act(actId); } }, t(l('Ficha completa', 'Full record'))),
      h('button', { class: 'btn small ghost', onclick: () => goArea('team') }, t(l('Delegação', 'Delegation'))),
    ),
  );
  modal(act.name, body);
}

function tip(s: GameState, actId: string): string[] {
  const st = status(s, actId);
  if (!st) return [];
  const out: string[] = [];
  if (st.attention.length) out.push(`⚠ ${st.attention.map((a) => t(ATT[a].name)).join(', ')}`);
  if (st.project) out.push(`◔ ${t(st.project.label)}`);
  out.push(`→ ${t(st.next.label)}`);
  return out;
}

/** Lista lateral: tudo o que a sede mostra, em texto, para quem prefere rapidez. */
function side(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const load = studioLoad(s);
  const sorted = [...ids].sort((a, b) => Number(urgent(status(s, b)!)) - Number(urgent(status(s, a)!)) || (s.acts[b].fame - s.acts[a].fame));
  return section(t(l('Painel da sede', 'HQ board')),
    h('p', { class: 'small' }, ic('mic'), ' ', t(l('Estúdio: {b} sessão(ões), {w} carreira(s) na fila', 'Studio: {b} session(s), {w} career(s) queued'), { b: load.busy, w: load.waiting.length }), ' ',
      h('button', { class: 'link', onclick: () => openSessions(s) }, t(l('abrir', 'open')))),
    ids.length ? h('ul', { class: 'hq8-list' }, sorted.map((id) => {
      const st = status(s, id)!;
      const k = KIND[st.kind];
      return h('li', { class: urgent(st) ? 'urgent' : '' },
        h('div', { class: 'row' }, logo(s.acts[id], 22), ' ', actLink(s, id), ' ', pill(t(k.name), k.cls), ...st.attention.map((a) => ic(ATT[a].icon, 1, t(ATT[a].name)))),
        st.project ? h('div', { class: 'small muted' }, t(st.project.label), ' ', h('span', { class: 'meter-bar sm' }, h('span', { style: `width:${Math.round(st.project.pct * 100)}%` }))) : null,
        h('button', { class: 'link small', onclick: () => openActCard(s, id) }, '→ ', t(st.next.label)),
      );
    })) : h('p', { class: 'muted small' }, t(l('Sem carreiras no elenco.', 'No careers on the roster.'))),
    h('button', { class: 'btn small ghost', onclick: () => openTimeline(s) }, ic('building'), ' ', t(l('Como a empresa cresceu', 'How the company grew'))),
  );
}

// ---------------------------------------------------------------- linha do tempo

function timeline(s: GameState): HTMLElement {
  const hist = hq8(s).hist;
  const rows = hist.map((x, i) => ({ x, ch: hqChanges(hist[i - 1], x) })).filter((r) => r.ch.length || r.x.m === 11);
  return h('div', { class: 'hq8-timeline' },
    h('div', { class: 'row wrap small' },
      h('span', null, t(l('Carreiras', 'Careers')), ' '), spark(hist.map((x) => x.ac)),
      h('span', null, ' ', t(l('Equipe', 'Staff')), ' '), spark(hist.map((x) => x.st)),
      h('span', null, ' ', t(l('Faturamento do ano', 'Revenue this year')), ' '), spark(hist.map((x) => x.rev))),
    h('ol', { class: 'hq-growth' }, [...rows].reverse().slice(0, 40).map(({ x, ch }) => h('li', null,
      h('b', null, `${x.y}${x.m === 11 && !ch.length ? '' : `/${String(x.m + 1).padStart(2, '0')}`}`), ' ',
      ch.length ? ch.map((c) => t(c)).join(' · ') : t(l('Fechamento do ano', 'Year end')),
      h('span', { class: 'muted small' }, ` — ${t(l('sede nv. {h}, {a} carreiras, {st} na equipe, {b} filiais, faturou {r}', 'HQ lv {h}, {a} careers, {st} staff, {b} branches, revenue {r}'), { h: x.hq, a: x.ac, st: x.st, b: x.br, r: $(x.rev * 100) })}`),
    ))),
  );
}

function spark(vals: number[]): HTMLElement {
  const v = vals.slice(-40);
  const max = Math.max(1, ...v);
  return h('span', { class: 'hq8-spark', 'aria-hidden': 'true' }, v.map((x) => h('i', { style: `height:${Math.max(2, Math.round((x / max) * 18))}px` })));
}

export function openTimeline(s: GameState): void {
  modal(t(l('Crescimento da empresa', 'Company growth')), timeline(s), { wide: true });
}

hqHooks.bubble = bubble;
hqHooks.roomTags = roomTags;
hqHooks.tip = tip;
hqHooks.side = side;
hqHooks.onAct = (id) => { const s = store.game; if (s) openActCard(s, id); };
hqHooks.onRoom = (kind) => {
  const s = store.game;
  if (!s) return;
  if (kind === 'booth' || kind === 'control') openSessions(s);
  else if (kind === 'office') goArea('team');
  else if (kind === 'meeting') goArea('desk');
  else if (kind === 'trophy') openTimeline(s);
  else {
    const want: HqKind = kind === 'writing' ? 'write' : kind === 'rehearsal' ? 'rehearse' : 'rest';
    const ids = playerActs(s).filter((id) => status(s, id)?.kind === want);
    modal(t(KIND[want].name), h('ul', null, ids.length ? ids.map((id) => h('li', null, actLink(s, id), ' ', h('button', { class: 'link small', onclick: () => openActCard(s, id) }, '→ ', t(status(s, id)!.next.label)))) : h('li', { class: 'muted' }, t(l('Ninguém aqui agora.', 'Nobody here right now.')))));
  }
};

registerSection('hq', { id: 'hq8-growth', order: 5, render: (s) => section(t(l('Crescimento da empresa', 'Company growth')), timeline(s)) });
