// r27 (M1) — tela da gravação jogável: estúdio em pixel art (sala + técnica, luz de REC), barras ao vivo de
// cansaço/clima/estresse (o estado real da banda), takes da faixa da vez e as decisões (aceitar, insistir, músico
// de sessão, arranjo novo, deixar brigar, pausa). "Tomada mágica" chama a cena opcional do Agente K. No fim,
// mixagem/master: mais rádio / mais crua / mais moderna, com a prévia de Q de cada faixa.
// Motor puro em src/sim/sys/record27.ts; a sessão é a mesma do Estúdio (startSession), então o que não for jogado
// segue no modo de sempre quando a semana avança.

import './act27.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { startSession } from '../../sim/studio';
import { bars27, explainRecord27, MIX27, MOVES27, mixCost27, mixPreview27, mixRecord27, moveRecord27, recordBlock27, startRecord27, takeBase27, type Mix27, type Rec27, type RecMove27, type RecTake27 } from '../../sim/sys/record27';
import type { GameState } from '../../sim/types';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { ic } from '../vis';
import { drawScene27, paintStudio27, type Who27 } from './scene27';
import { cutscene27, showPlay27 } from './prefs27';

/** "Jogar" ao lado de "Entrar em estúdio": marca a sessão (mesmo custo) e abre o jogo. */
export function playStudioBtn27(s: GameState, actId: string, songIds: string[], tier: number, approach: string, producerId?: string): HTMLElement | null {
  if (!showPlay27(true)) return null;
  return h('button', { class: 'btn a27-play', disabled: !songIds.length, title: t(l('Gravação jogável: cada dia é um take com decisões', 'Playable recording: each day is a take with decisions')),
    onclick: () => {
      const res = startSession(s, actId, songIds, tier, approach, producerId);
      if ('pt' in res) { toast(t(res), 'bad'); return; }
      rerender();
      openRecord27(s, res.id);
    } }, ic('mic'), ' ', t(l('Jogar a sessão', 'Play the session')));
}

/** "Jogar os takes" numa sessão em andamento (Central / Estúdio). */
export function playTakesBtn27(s: GameState, sessId: string): HTMLElement | null {
  if (!showPlay27(true) || recordBlock27(s, sessId)) return null;
  return h('button', { class: 'btn small a27-play', onclick: () => openRecord27(s, sessId) }, ic('mic'), ' ', t(l('Jogar os takes', 'Play the takes')));
}

export function openRecord27(s: GameState, sessId: string): void {
  const r0 = startRecord27(s, sessId);
  if ('pt' in r0) { toast(t(r0), 'bad'); return; }
  const rc: Rec27 = r0;
  const a = s.acts[rc.actId];
  let err: L | null = null;
  let flash = false;
  const root = h('div', { class: 'a27 a27-record' });
  const put = (...xs: (Node | null)[]) => root.replaceChildren(...xs.filter((x): x is Node => !!x));
  const close = modal(t(l('Estúdio', 'Studio')) + ` — ${a.name}`, root, { wide: true, onClose: () => { document.removeEventListener('keydown', onKey); rerender(); } });

  const scene = (): HTMLElement => {
    const cv = h('canvas', { class: `a27-scene ${flash ? 'a27-flash' : ''}`, role: 'img', 'aria-label': t(l('Sala de gravação', 'Live room')) }) as HTMLCanvasElement;
    const ms = a.members.map((id) => s.persons[id]).filter(Boolean).slice(0, 5);
    const spots: [number, number][] = [[40, 74], [72, 76], [18, 82], [100, 82], [56, 88]];
    const who: Who27[] = ms.map((p, i) => ({ p, x: spots[i][0], y: spots[i][1], pose: p.role === 'vocal' || p.role === 'mc' ? 'stand' : 'play', dir: 'SE' }));
    drawScene27(cv, paintStudio27(s.year, rc.phase === 'takes'), s.year, who);
    return cv;
  };

  const bar = (label: L, v: number, bad: boolean, icon: string) => h('div', { class: `a27-bar ${bad ? 'bad' : ''}` },
    h('span', { class: 'a27-meter-l' }, ic(icon), ' ', t(label)),
    h('span', { class: 'a27-bar-track', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': v, 'aria-label': t(label) }, h('i', { style: `--w:${Math.max(0, Math.min(100, v))}%` })),
    h('b', null, String(v)));

  const bars = () => {
    const b = bars27(s, rc.actId);
    return h('div', { class: 'a27-bars' },
      bar(l('Cansaço', 'Fatigue'), b.fatigue, b.fatigue > 55, 'sleep'),
      bar(l('Clima', 'Mood'), b.mood, b.mood < 40, 'heart'),
      bar(l('Estresse', 'Stress'), b.stress, b.stress > 60, 'stress'),
      h('div', { class: 'a27-days small' }, ic('calendar'), ' ', t(l('Dia', 'Day')), ` ${rc.day} / ${rc.planned}`,
        rc.extraDays ? h('span', { class: 'bad' }, ` · +${rc.extraDays} ${t(l('dia(s) extra', 'extra day(s)'))} (${$(rc.extraCost)})`) : rc.extraCost ? h('span', { class: 'warn' }, ` · ${t(l('extras', 'extras'))} ${$(rc.extraCost)}`) : null));
  };

  const takeChip = (x: RecTake27, best: number) => h('li', { class: `a27-take ${x.q === best ? 'best' : ''} ${x.magic ? 'magic' : ''} ${x.fail ? 'fail' : ''}` },
    h('b', null, String(x.q)), h('span', { class: 'small' }, `${t(l('take', 'take'))} ${x.n}: ${t(x.note)}`));

  const takesView = () => {
    const song = s.songs[rc.songIds[rc.idx]];
    const best = rc.takes.length ? Math.max(...rc.takes.map((x) => x.q)) : 0;
    const base = Math.round(takeBase27(s, rc));
    const move = (m: RecMove27, disabled = false) => h('button', { class: `btn a27-move ${m === 'keep' ? 'primary' : ''}`, disabled, title: t(MOVES27[m].desc), onclick: () => doMove(m) },
      h('b', null, t(MOVES27[m].name)), h('span', { class: 'small' }, t(MOVES27[m].desc)));
    put(
      scene(), bars(),
      h('div', { class: 'a27-song' },
        h('h3', null, `${t(l('Faixa', 'Track'))} ${rc.idx + 1}/${rc.songIds.length}: "${song?.title ?? ''}"`),
        h('p', { class: 'small muted' }, t(l('Base de um take agora', 'Base for a take right now')), `: ~${base} · `, t(l('melhor até aqui', 'best so far')), `: ${best}`),
        h('ul', { class: 'a27-takes', 'aria-live': 'polite' }, rc.takes.map((x) => takeChip(x, best)))),
      err ? h('p', { class: 'bad small', role: 'alert' }, t(err)) : null,
      h('div', { class: 'a27-moves' },
        move('keep', !rc.takes.length), move('another'), move('relax'), move('arrange', rc.arranged), move('musician', rc.musician), move('fight')),
      rc.log.length ? h('p', { class: 'small muted' }, t(rc.log[rc.log.length - 1])) : null,
      h('div', { class: 'a27-actions' },
        h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Deixar o resto com o produtor', 'Leave the rest to the producer'))),
        h('span', { class: 'small muted' }, t(l('O que não for jogado segue no automático quando a semana avançar.', 'Anything not played continues automatically when the week advances.')))));
  };

  const mixView = () => {
    const opt = (m: Mix27) => {
      const pv = mixPreview27(s, rc, m);
      const cost = mixCost27(s, rc, m);
      return h('button', { class: `a27-mix m-${m}`, onclick: () => { const e = mixRecord27(s, rc, m); if (e) { err = e; } draw(); } },
        h('b', null, t(MIX27[m].name)), h('span', { class: 'small' }, t(MIX27[m].desc)),
        h('span', { class: 'a27-fx' },
          ...(['perf', 'prod', 'or'] as const).filter((k) => MIX27[m].fx[k]).map((k) => h('em', { class: MIX27[m].fx[k] > 0 ? 'pos' : 'neg' }, `${MIX27[m].fx[k] > 0 ? '+' : ''}${MIX27[m].fx[k]} ${t(k === 'perf' ? l('perf', 'perf') : k === 'prod' ? l('prod', 'prod') : l('orig', 'orig'))}`)),
          cost ? h('em', { class: 'neg' }, $(cost)) : null),
        h('span', { class: 'small muted' }, pv.map((x) => `Q ${x.q}`).join(' · ')));
    };
    put(
      scene(),
      h('div', { class: 'a27-song' }, h('h3', null, t(l('Mixagem e master', 'Mix and master'))),
        h('p', { class: 'small' }, t(l('Escolha a versão final. Rádio e playlists leem o polimento e a voz; a crítica lê originalidade e performance.', 'Pick the final version. Radio and playlists read polish and vocals; critics read originality and performance.'))),
        h('ul', { class: 'a27-takes' }, rc.results.map((x) => h('li', { class: `a27-take ${x.magic ? 'magic' : ''}` }, h('b', null, `Q ${x.q}`), h('span', { class: 'small' }, `"${x.title}"`))))),
      h('div', { class: 'a27-mixes' }, (['radio', 'raw', 'modern'] as Mix27[]).map(opt)),
      err ? h('p', { class: 'bad small', role: 'alert' }, t(err)) : null);
  };

  const doneView = () => {
    put(
      scene(), bars(),
      h('div', { class: 'a27-result' },
        h('h3', null, t(l('Sessão gravada', 'Session recorded'))),
        h('ul', { class: 'a27-takes' }, rc.results.map((x) => h('li', { class: `a27-take ${x.magic ? 'magic' : ''}` }, h('b', null, `Q ${x.q}`), h('span', { class: 'small' }, `"${x.title}" · ${t(l('performance', 'performance'))} ${x.perf}${x.timbre ? ` · ${t(l('timbre novo', 'new sound'))}` : ''}`)))),
        h('ul', { class: 'a27-why' }, explainRecord27(s, rc).map((x, i) => h('li', { class: i === 0 ? 'lead' : '' }, t(x))))),
      h('div', { class: 'a27-actions' }, h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close')))));
  };

  function doMove(m: RecMove27): void {
    err = null;
    const res = moveRecord27(s, rc, m);
    if (res && 'pt' in res) err = res;
    const last = rc.takes[rc.takes.length - 1];
    flash = !!(res && !('pt' in res) && (res.magic || res.accident));
    if (res && !('pt' in res) && res.magic) cutscene27('magic_take', { actId: rc.actId, songId: rc.songIds[rc.idx], q: last?.q });
    draw();
  }

  function draw(): void {
    if (rc.phase === 'takes') takesView();
    else if (rc.phase === 'mix') mixView();
    else doneView();
    (root.querySelector('.a27-move.primary:not([disabled]), .a27-mix, .btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  function onKey(e: KeyboardEvent): void {
    if (!root.isConnected || rc.phase !== 'takes' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    const keys: Record<string, RecMove27> = { k: 'keep', a: 'another', p: 'relax', r: 'arrange', m: 'musician', b: 'fight' };
    const m = keys[e.key.toLowerCase()];
    if (m) { e.preventDefault(); doMove(m); }
  }
  document.addEventListener('keydown', onKey);
  if (rc.takes.some((x) => x.magic)) cutscene27('magic_take', { actId: rc.actId });
  draw();
}
