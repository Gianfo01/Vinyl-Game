// r27 (P2A) — CAMPANHA DE LANÇAMENTO (interface): o quadro de semanas de um lançamento. Sala de guerra em pixel art
// (calendário, termômetro de expectativa, aparelhos da época acesos pelos canais com verba), verba semanal por canal
// (0–3), jabá na era do jabá, o imprevisto da semana com escolhas, as jogadas avulsas de sempre como cartas e o
// pós-morte. O motor é src/sim/sys/camp27.ts; a semana anda com o relógio do jogo (o quadro pode ficar aberto
// ou ser reaberto pelo botão "▶ Campanha").

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  campMeter27, campOf27, channels27, choose27, doMove27, endCamp27, moves27, openEv27, payolaEra27, setPayola27, setPlan27, startCamp27, targets27, weekCost27,
  type Lvl27, type Target27,
} from '../../sim/sys/camp27';
import type { GameState } from '../../sim/types';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { cutscene27, playBtn27 } from './mode27';
import { openInterview27 } from './interview27';
import { drawScene27 } from './scene27';
import { paintWarRoom27 } from './p2apx27';
import { store } from '../store';
import './p2a27.css';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));

/** Botão "▶ Campanha" para um ato (próximo lançamento) ou para um lançamento já na rua. Null se não há alvo. */
export function campBtn27(s: GameState, key: { actId?: string; relId?: string; prId?: string }): HTMLElement | null {
  const tg = targets27(s).find((x) => (key.prId && x.prId === key.prId) || (key.relId && x.relId === key.relId) || (key.actId && !key.prId && !key.relId && x.actId === key.actId));
  if (!tg) return null;
  const live = campOf27(s, tg);
  return playBtn27(live ? l('Campanha (em andamento)', 'Campaign (running)') : l('Campanha de lançamento', 'Release campaign'), () => openCampaign27(tg), true,
    l('Quadro de semanas: verba por canal da época, imprevistos com escolhas, jogadas e pós-morte.', 'Week board: budget per era channel, surprises with choices, moves and post-mortem.'));
}

export function openCampaign27(tg: Target27): void {
  const s = store.game;
  if (!s) return;
  let c = campOf27(s, tg);
  if (!c) {
    const r = startCamp27(s, tg);
    if (!('id' in r)) { toast(t(r), 'bad'); return; }
    c = r;
  }
  const cp = c;
  const root = h('div', { class: 'p2a cp27' });
  let close = () => {};
  let launchedSeen = !!cp.relId;
  const draw = () => {
    const live = cp.status === 'live';
    const act = s.acts[cp.actId];
    const total = Math.max(1, cp.wEnd - cp.w0);
    const nowI = Math.min(total, s.week - cp.w0);
    const meter = campMeter27(s, cp);
    // sala de guerra
    const cv = h('canvas', { class: 'p2a-scene', role: 'img', 'aria-label': t(l('Sala de guerra da campanha', 'Campaign war room')) }) as HTMLCanvasElement;
    try { drawScene27(cv, paintWarRoom27(s.year, Object.keys(cp.plan), nowI, total, cp.launchW - cp.w0, meter.hype), s.year, []); } catch { /* sem canvas */ }
    if (cp.relId && !launchedSeen) { launchedSeen = true; cutscene27('camp27:launch', { title: cp.title, actId: cp.actId }); }
    // linha do tempo
    const weeks = h('div', { class: 'cp27-weeks', role: 'list', 'aria-label': t(l('Semanas da campanha', 'Campaign weeks')) },
      Array.from({ length: total + 1 }, (_, i) => {
        const w = cp.w0 + i;
        const ev = cp.ev.find((e) => e.w === w);
        return h('div', { role: 'listitem', class: `cp27-wk ${w < s.week ? 'past' : ''} ${w === s.week ? 'now' : ''} ${w === cp.launchW ? 'launch' : ''} ${ev ? 'ev' : ''}`, title: ev ? T(ev.t) : '' },
          h('small', null, `${t(l('sem.', 'wk'))} ${i + 1}`), w === cp.launchW ? h('b', null, '★') : null);
      }));
    // medidor de expectativa × régua do disco
    const need = meter.need, q = meter.q;
    const hyp = h('div', { class: 'cp27-meter' },
      h('span', null, t(l('Expectativa', 'Anticipation'))),
      h('span', { class: 'cp27-bar', role: 'img', 'aria-label': `${meter.hype}/100` }, h('i', { style: `width:${meter.hype}%` }), q !== null ? h('b', { style: `left:${Math.min(99, q)}%`, title: t(l('Qualidade do disco', 'Record quality')) }) : null),
      h('b', null, String(meter.hype)));
    const warn = q !== null && meter.hype >= 40 && q < need - 6
      ? h('p', { class: 'small bad' }, t(l('Cuidado: essa expectativa pede um disco nota {n}; o seu é {q}. Hype demais vira reação.', 'Careful: this anticipation calls for a {n} record; yours is {q}. Too much hype turns into backlash.'), { n: need, q }))
      : q !== null ? h('p', { class: 'small muted' }, t(l('A expectativa {h} pede um disco nota {n}; o seu é {q}.', 'Anticipation {h} calls for a {n} record; yours is {q}.'), { h: meter.hype, n: need, q })) : null;
    // canais
    const chs = channels27(s);
    const chBox = h('div', { class: 'cp27-ch' },
      chs.map((ch) => {
        const lv = (cp.plan[ch.id] ?? 0) as Lvl27;
        return h('div', { class: 'cp27-row' },
          h('div', null, h('b', null, T(ch.name)), ' ', h('span', { class: 'muted' }, `${T(ch.group)} · ${$(ch.unit)}/${t(l('nível', 'level'))}`)),
          h('div', { class: 'cp27-lv', role: 'radiogroup', 'aria-label': T(ch.name) }, [0, 1, 2, 3].map((v) => h('button', {
            type: 'button', class: v === lv ? 'on' : '', role: 'radio', 'aria-checked': v === lv ? 'true' : 'false', disabled: !live, title: v ? `${$(v * ch.unit)} ${t(l('por semana', 'per week'))}` : t(l('sem verba', 'no budget')),
            onclick: () => { setPlan27(s, cp, ch.id, v as Lvl27); draw(); },
          }, v ? String(v) : '–'))),
          h('span', { class: 'small' }, lv ? $(lv * ch.unit) : ''));
      }),
      payolaEra27(s) && chs.some((x) => x.payola) ? h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: cp.payola, disabled: !live, onchange: (e: Event) => { setPayola27(s, cp, (e.target as HTMLInputElement).checked); draw(); } }),
        ' ', t(l('Jabá no rádio (era do jabá): +40% de alcance por dólar, mas fica registrado — exposição a escândalo e investigações.', 'Radio payola (payola era): +40% reach per dollar, but it is on record — scandal exposure and investigations.'))) : null,
      h('p', { class: 'small' }, t(l('Próxima semana: {c} · já gasto: {g}', 'Next week: {c} · spent so far: {g}'), { c: $(weekCost27(s, cp)), g: $(cp.spent) })));
    // imprevisto
    const ev = openEv27(cp);
    const evBox = ev && live ? h('div', { class: `cp27-ev ${ev.tone}`, role: 'group', 'aria-label': t(l('Imprevisto da semana', 'This week\'s surprise')) },
      h('b', null, T(ev.t)),
      h('div', { class: 'cp27-opts' }, ev.opts.map((o, i) => h('button', {
        type: 'button', class: 'cp27-opt',
        onclick: () => {
          const r = choose27(s, cp, ev.w, o.id);
          toast(t(r), 'info');
          if (ev.k === 'press' && o.id === 'play') openInterview27({ ctx: 'camp', who: 'act', actId: cp.actId, campId: cp.id, title: l('Entrevista', 'Interview'), why: l('Campanha', 'Campaign') });
          if (ev.k === 'viral' || ev.k === 'ban' || ev.k === 'probe') cutscene27(`camp27:${ev.k}`, { actId: cp.actId, pick: o.id });
          draw();
        },
      }, h('span', null, `${i + 1}. `, h('b', null, T(o.t)), o.cost ? ` · ${$(o.cost)}` : ''), h('small', null, T(o.hint)), i === 0 ? h('small', null, t(l('(vale esta se ninguém responder)', '(applies if nobody answers)'))) : null))),
    ) : null;
    // jogadas
    const mv = moves27(s, cp);
    const mvBox = mv.length ? h('div', { class: 'cp27-moves' }, mv.map((m) => h('div', { class: `cp27-move ${m.risk ? 'risk' : ''}` },
      h('b', null, T(m.name)), h('small', { class: 'muted' }, T(m.fx)),
      h('button', { class: `btn small ${m.risk ? 'danger' : ''}`, disabled: !m.ok, title: m.why ? T(m.why) : '', onclick: () => { toast(t(doMove27(s, cp, m.id)), m.risk ? 'warn' : 'info'); draw(); } },
        m.ok ? `${t(l('Fazer', 'Do it'))}${m.cost ? ` · ${$(m.cost)}` : ''}` : T(m.why ?? l('Indisponível', 'Unavailable')))))) : h('p', { class: 'small muted' }, t(l('Sem jogadas avulsas agora.', 'No extra moves right now.')));
    const sum = cp.sum ? h('div', { class: 'cp27-ev good' }, h('b', null, t(l('Pós-morte da campanha', 'Campaign post-mortem'))), h('ul', { class: 'small' }, cp.sum.map((x) => h('li', null, T(x))))) : null;
    root.replaceChildren(
      cv,
      h('div', { class: 'p2a-chips' },
        h('span', { class: 'p2a-chip' }, `${act?.name ?? '?'} — "${cp.title}"`),
        h('span', { class: `p2a-chip ${cp.relId ? 'good' : ''}` }, cp.relId ? t(l('na rua', 'out now')) : t(l('estreia na semana {w}', 'launches in week {w}'), { w: cp.launchW - cp.w0 + 1 })),
        h('span', { class: `p2a-chip ${cp.exp >= 50 ? 'bad' : cp.exp >= 25 ? 'warn' : ''}`, title: t(l('Jabá, streams comprados e rixas armadas acumulam exposição: acima de 25 aparecem investigações.', 'Payola, bought streams and staged feuds build exposure: above 25, investigations show up.')) }, `${t(l('Exposição', 'Exposure'))} ${Math.round(cp.exp)}/100`),
        h('span', { class: 'p2a-chip' }, cp.status === 'live' ? t(l('{n} semana(s) restantes', '{n} week(s) left'), { n: Math.max(0, cp.wEnd - s.week) }) : t(l('encerrada', 'closed')))),
      weeks, hyp, ...(warn ? [warn] : []),
      h('div', { class: 'p2a-cols' },
        h('div', null, evBox, sum, h('h4', null, t(l('Verba semanal por canal', 'Weekly budget per channel'))), chBox),
        h('div', null,
          h('h4', null, t(l('Jogadas (as ações rápidas de sempre)', 'Moves (the usual quick actions)'))), mvBox,
          h('h4', null, t(l('Diário da campanha', 'Campaign log'))),
          h('ol', { class: 'p2a-log', 'aria-live': 'polite' }, [...cp.log].reverse().slice(0, 30).map((x) => h('li', { class: x.tone ?? '' }, h('small', null, `${t(l('sem.', 'wk'))} ${x.w - cp.w0 + 1}`), T(x.t)))),
          live ? h('div', { class: 'row wrap' },
            h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar (a campanha segue com as semanas)', 'Close (the campaign runs with the weeks)'))),
            h('button', { class: 'btn ghost', onclick: () => { endCamp27(s, cp); draw(); } }, t(l('Encerrar campanha', 'End campaign')))) : h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close'))),
          h('p', { class: 'small muted' }, t(l('A verba entra no marketing do lançamento semana a semana (o mesmo alcance de sempre, com saturação). Sem resposta a um imprevisto, vale a primeira opção.', 'Budget flows into the release marketing week by week (the usual reach, with saturation). If a surprise goes unanswered, the first option applies.'))))),
    );
  };
  draw();
  close = modal(t(l('Campanha de lançamento — "{t}"', 'Release campaign — "{t}"'), { t: cp.title }), root, { wide: true, onClose: () => rerender() });
}
