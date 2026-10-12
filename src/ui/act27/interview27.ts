// r27 (P2A) — ENTREVISTA / COLETIVA (interface): cena de diálogo em pixel art (sala de imprensa ou talk show da
// época, microfones, repórteres, flashes; o calor avermelha a sala), a pergunta num balão e quatro posturas —
// Polêmico, Charmoso, Misterioso, Esquivo (teclas 1–4) — com a chance de colar e o humor do repórter à vista.
// No fim, o resultado já aplicado nos sistemas de sempre (motor: src/sim/sys/press27.ts).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  STANCES27, STANCE_HINT27, STANCE_NAME27, answer27, curQ27, ivGate27, land27, opps27, startIv27, type Iv27, type Opp27, type Stance27,
} from '../../sim/sys/press27';
import type { GameState } from '../../sim/types';
import { modal, rerender, toast } from '../common';
import { h } from '../dom';
import { meter } from '../vis';
import { store } from '../store';
import { cutscene27, playBtn27, reduced27 } from './mode27';
import { drawScene27, type Who27 } from './scene27';
import { paintPress27, paintPressFront27 } from './p2apx27';
import './p2a27.css';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const pc = (x: number) => `${Math.round(x * 100)}%`;

/** Botão "▶ Entrevista/Coletiva" para a oportunidade que casa com o filtro (ou nada). */
export function ivBtn27(s: GameState, f: (o: Opp27) => boolean, label?: L): HTMLElement | null {
  const o = opps27(s).find(f);
  if (!o || ivGate27(s, o)) return null;
  const lb = label ?? (o.ctx === 'story' ? l('Coletiva', 'Press conference') : o.ctx === 'scandal' ? l('Coletiva de crise', 'Crisis presser') : l('Entrevista (jogar)', 'Interview (play)'));
  return playBtn27(lb, () => openInterview27(o), o.ctx !== 'press', l('Você escolhe a postura de cada resposta: polêmica, charmosa, misteriosa ou esquiva.', 'You pick the stance of each answer: controversial, charming, mysterious or deflecting.'));
}

export function openInterview27(o: Opp27): void {
  const s = store.game;
  if (!s) return;
  const st = startIv27(s, o);
  if (!('id' in st)) { toast(t(st), 'bad'); return; }
  const iv: Iv27 = st;
  const act = iv.actId ? s.acts[iv.actId] : undefined;
  const lead = act ? s.persons[act.leaderId ?? act.members[0]] : undefined;
  const root = h('div', { class: 'p2a iv27' });
  let close = () => {};
  let flash = false;
  const onKey = (e: KeyboardEvent) => {
    if (iv.status !== 'open') return;
    const i = Number(e.key) - 1;
    if (i >= 0 && i < STANCES27.length && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); pick(STANCES27[i]); }
  };
  const pick = (stc: Stance27) => {
    const r = answer27(s, iv, stc);
    if (!('st' in r)) return;
    flash = stc === 'controversial' || (stc === 'mysterious' && r.land);
    if (iv.status === 'done' && iv.res?.scandal) cutscene27('press27:scandal', { actId: iv.actId ?? 'player' });
    else if (iv.status === 'done' && iv.res?.reveal) cutscene27('press27:reveal', { actId: iv.actId ?? 'player' });
    draw();
    if (flash && !reduced27()) setTimeout(() => { flash = false; paint(); }, 450);
  };
  let cv: HTMLCanvasElement | null = null;
  const paint = () => {
    if (!cv) return;
    const who: Who27[] = lead ? [{ p: lead, x: 100, y: 54, pose: 'sit' }] : [];
    try {
      drawScene27(cv, paintPress27(s.year, iv.ctx, flash && !reduced27(), iv.heat), s.year, who);
      if (lead) cv.getContext('2d')?.drawImage(paintPressFront27(s.year, iv.ctx).canvas(), 0, 0); // quem fala fica atrás da mesa
    } catch { /* sem canvas */ }
  };
  const draw = () => {
    const q = curQ27(iv);
    cv = h('canvas', { class: 'p2a-scene', role: 'img', 'aria-label': t(l('Sala de imprensa', 'Press room')) }) as HTMLCanvasElement;
    paint();
    const status = h('div', { class: 'p2a-chips' },
      h('span', { class: 'p2a-chip' }, `${T(iv.outlet)} · ${act?.name ?? s.config.companyName}`),
      h('span', { class: 'p2a-chip' }, t(l('Pergunta {i} de {n}', 'Question {i} of {n}'), { i: Math.min(iv.ans.length + 1, iv.nq), n: iv.nq })),
      h('span', { class: 'p2a-chip', title: t(l('Desenvoltura de quem fala (mídia do líder / carisma do dono).', 'Speaker poise (leader media skill / owner charisma).')) }, `${t(l('Desenvoltura', 'Poise'))} ${Math.round(iv.skill)}`));
    const meters = h('div', { class: 'row wrap' },
      meter('heart', l('Humor do repórter', 'Reporter mood'), iv.mood),
      meter('fire', l('Calor de escândalo', 'Scandal heat'), iv.heat, 100, true));
    const transcript = h('ol', { class: 'iv27-tr', 'aria-live': 'polite' }, iv.ans.map((a, i) => h('li', { class: a.land ? 'land' : 'miss' },
      h('small', { class: 'muted' }, T(iv.qs[i].text)), h('span', null, h('b', null, `${T(STANCE_NAME27[a.st])}: `), T(a.line)), h('small', null, T(a.react)))));
    if (iv.status === 'open' && q) {
      root.replaceChildren(cv, status,
        h('div', { class: `iv27-bubble ${q.hot ? 'hot' : ''}` }, q.hot ? h('b', { class: 'bad' }, t(l('Pergunta quente: ', 'Hot question: '))) : null, T(q.text)),
        h('div', { class: 'iv27-stances', role: 'group', 'aria-label': t(l('Postura da resposta', 'Answer stance')) }, STANCES27.map((x, i) => h('button', { type: 'button', class: `iv27-st ${x}`, onclick: () => pick(x) },
          h('kbd', null, String(i + 1)), h('b', null, T(STANCE_NAME27[x])), h('small', null, T(STANCE_HINT27[x])), h('small', null, t(l('Chance de colar: {p}', 'Chance it lands: {p}'), { p: pc(land27(iv, x)) }))))),
        meters, transcript);
      (root.querySelector('.iv27-st') as HTMLElement | null)?.focus();
    } else {
      const r = iv.res!;
      root.replaceChildren(cv, status,
        h('div', { class: `cp27-ev ${r.scandal ? 'bad' : r.grade >= 55 ? 'good' : 'warn'}` },
          h('b', null, t(l('Nota da entrevista: {g}/100', 'Interview grade: {g}/100'), { g: r.grade })),
          h('ul', { class: 'small' }, r.lines.map((x) => h('li', null, T(x))))),
        transcript,
        h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close'))));
      (root.querySelector('.btn.primary') as HTMLElement | null)?.focus();
    }
  };
  draw();
  document.addEventListener('keydown', onKey);
  close = modal(o.ctx === 'press' ? t(l('Entrevista — {a}', 'Interview — {a}'), { a: act?.name ?? s.config.companyName }) : T(o.title), root, { wide: true, onClose: () => { document.removeEventListener('keydown', onKey); while (iv.status === 'open') answer27(s, iv, 'deflect'); rerender(); } }); // sair no meio = "sem comentários" até o fim
}
