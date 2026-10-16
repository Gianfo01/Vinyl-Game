// r27 (P2B) — SALA DE CRISE (interface). Relógio de N semanas, K ações por semana, medidor de ameaça com as faixas
// do desfecho (≤30 contornada, ≤65 pela metade, >65 a crise vence), cartas de ação com custo, chance e efeito,
// aviso de política (policy18) e de seguro, quem da equipe age se você não agir, e o diário da crise.
// Motor: src/sim/sys/crisis27.ts (puro). Avançar a semana é o botão de sempre (▷ Semana).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  CFG27, CRISIS_NAME27, OUT_NAME27, actCrisis27, crisisActs27, crisisById27, crisisCands27, delegatePick27, evAct27, openCrisis27, openCrises27, outcomeOf27,
  type Crisis27,
} from '../../sim/sys/crisis27';
import { staffRoleById } from '../../data/rules';
import type { GameState } from '../../sim/types';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { card27, kpiRow27, statusChip27 } from '../ps/ui27';
import { store } from '../store';
import { occMark27 } from './flow27';
import { cutscene27, reduced27 } from './mode27';
import { paintCrisis27, put27 } from './px27b';
import { drawScene27, type Who27 } from './scene27';
import './act27.css';
import './p2b27.css';
import { withCast31 } from '../r31/cast31'; // R31 onda 4 (W): pessoas reais com humor e "Pular cena"

function warRoom(s: GameState, threat: () => number): HTMLCanvasElement {
  const cv = h('canvas', { class: 'a27-scene', role: 'img', 'aria-label': t(l('Sala de crise', 'Crisis room')) }) as HTMLCanvasElement;
  const staff = s.player.staff.slice(0, 3);
  let f = 0;
  const paint = () => drawScene27(cv, paintCrisis27(s.year, threat(), f), s.year, staff.map((m, i): Who27 => ({ p: { id: m.id, role: 'producer', born: s.year - 35 }, x: 60 + i * 40, y: 74, pose: 'stand', dir: i % 2 ? 'SW' : 'SE' })));
  paint();
  if (!reduced27()) { const tick = () => { if (!cv.isConnected && f > 2) return; f += 1; if (f % 6 === 0) paint(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  return cv;
}

function bar(threat: number): HTMLElement {
  const o = outcomeOf27(threat);
  return h('div', { class: 'p2b-threat', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(threat)), 'aria-label': t(l('Ameaça', 'Threat')) },
    h('i', { class: `t-${o}`, style: `width:${Math.round(threat)}%` }), h('u', { style: 'left:30%' }), h('u', { style: 'left:65%' }),
    h('span', null, t(l('Ameaça {v} — {o}', 'Threat {v} — {o}'), { v: Math.round(threat), o: OUT_NAME27[o] })));
}

/** Abre (se preciso) e mostra a sala de crise. */
export function openCrisisRoom27(id: string, onDone?: (played: boolean) => void): void {
  const s = store.game;
  if (!s) { onDone?.(false); return; }
  let c = crisisById27(s, id);
  if (!c) {
    const r = openCrisis27(s, id);
    if (!('k' in r)) { toast(t(r), 'bad'); onDone?.(false); return; }
    c = r;
    cutscene27('crisis_open', { kind: c.k, id: c.id });
  }
  const cc = c;
  const root = h('div', { class: 'a27 p2b-crisis' });
  const view = (flash?: { t: L; tone: string }) => {
    const acts = crisisActs27(s, cc);
    const left = cc.wk === s.week ? cc.per - cc.used : cc.per;
    const pick = delegatePick27(s, cc);
    const pickV = pick ? acts.find((x) => x.a.id === pick) : undefined;
    const who = s.player.staff.find((m) => CFG27[cc.k].roles.includes(m.role));
    put27(root, 
      warRoom(s, () => cc.threat),
      h('div', { class: 'a27-head' }, h('b', null, t(cc.title)), ' · ', h('span', { class: 'muted' }, t(cc.text))),
      kpiRow27([
        { label: l('Semanas restantes', 'Weeks left'), value: `${Math.max(0, cc.left)}/${cc.weeks}`, tone: cc.left <= 1 ? 'bad' : 'neutral' },
        { label: l('Ações nesta semana', 'Actions this week'), value: cc.done ? '—' : `${left}/${cc.per}` },
        { label: l('Pressão por semana', 'Pressure per week'), value: `+${CFG27[cc.k].push}`, tone: 'warn' },
        { label: l('Caixa', 'Cash'), value: $(s.player.cash), tone: s.player.cash < 0 ? 'bad' : 'neutral' },
      ]),
      bar(cc.threat),
      flash ? h('p', { class: `a27-event ${flash.tone}`, role: 'status' }, t(flash.t)) : null,
      cc.done
        ? card27({ title: OUT_NAME27[cc.done.o], tone: cc.done.o === 'won' ? 'good' : cc.done.o === 'lost' ? 'bad' : 'warn', variant: 'hero' },
            h('ul', { class: 'small a27-why' }, cc.done.why.map((w) => h('li', null, t(w)))))
        : h('div', { class: 'p2b-opts' }, acts.map((v) => {
            const dis = !!v.block || left <= 0;
            return h('button', { class: `p2b-opt ${v.a.harsh ? 'bold' : v.p >= 0.99 ? 'safe' : ''}`, disabled: dis, title: v.block ? t(v.block) : undefined, onclick: () => {
              const r = actCrisis27(s, cc.id, v.a.id);
              if (!('ok' in r)) { toast(t(r), 'bad'); return; }
              if (cc.done) cutscene27(cc.done.o === 'won' ? 'crisis_won' : 'crisis_lost', { kind: cc.k, id: cc.id });
              view({ t: r.t, tone: r.ok ? 'good' : 'bad' });
            } },
            h('b', null, t(v.a.label)), h('small', null, t(v.a.hint)),
            h('span', { class: 'p2b-tags' },
              v.cost ? statusChip27($(v.cost), s.player.cash < v.cost ? 'bad' : 'neutral') : statusChip27(t(l('grátis', 'free')), 'neutral'),
              v.a.id === 'settle' ? statusChip27(t(l('encerra já', 'ends now')), 'info') : statusChip27(v.p >= 0.99 ? t(l('certo · −{d}', 'certain · −{d}'), { d: v.a.d }) : t(l('{p}% · −{d}{f}', '{p}% · −{d}{f}'), { p: Math.round(v.p * 100), d: v.a.d, f: v.a.fail ? ` / +${v.a.fail}` : '' }), v.p >= 0.7 ? 'good' : v.p < 0.45 ? 'bad' : 'warn'),
              v.a.harsh ? statusChip27(t(l('dura', 'harsh')), 'bad') : null,
              v.policy ? statusChip27(t(l('fora da política', 'outside policy')), 'warn', t(v.policy)) : null,
              v.block ? statusChip27(t(v.block), 'neutral') : null,
              pick === v.a.id ? statusChip27(t(l('a equipe faria', 'staff would do')), 'neutral') : null,
              h('small', { class: 'muted' }, t(l('valor {e}', 'value {e}'), { e: Math.round(evAct27(v, cc)) }))));
          })),
      cc.done ? null : h('p', { class: 'small muted' }, who
        ? t(l('Se você não agir numa semana, {n} ({r}) age sozinho(a){x}.', 'If you skip a week, {n} ({r}) acts alone{x}.'), { n: who.name, r: t(staffRoleById[who.role]?.name ?? l(who.role, who.role)), x: pickV ? t(l(': {a}', ': {a}'), { a: t(pickV.a.label) }) : t(l(', mas nada cabe na política de gasto', ', but nothing fits the spending policy')) })
        : t(l('Ninguém da equipe cuida desta área: semana sem ação = crise correndo solta.', 'Nobody on staff covers this area: a week without action = the crisis runs free.'))),
      h('h4', null, t(l('Diário da crise', 'Crisis log'))),
      h('ul', { class: 'small a27-feed' }, cc.log.slice(0, 10).map((x) => h('li', { class: x.tone }, t(x.t)))),
      h('div', { class: 'row a27-actions' }, h('button', { class: 'btn primary', onclick: () => close() }, t(cc.done ? l('Fechar', 'Close') : l('Fechar (avance a semana para o relógio andar)', 'Close (advance the week to move the clock)')))),
    );
    (root.querySelector('.p2b-opt:not([disabled])') as HTMLElement | null)?.focus();
  };
  view();
  const close = modal(t(l('Sala de crise — {k}', 'Crisis room — {k}'), { k: t(CRISIS_NAME27[cc.k]) }), withCast31(s, [cc.ref.pid, cc.ref.act], root, () => close()), { wide: true, onClose: () => { onDone?.(true); rerender(); } });
}

/** Seção com as crises na mesa e as abertas (Cockpit / Políticas). */
export function crisesSection27(s: GameState): HTMLElement | null {
  const cands = crisisCands27(s);
  const open = openCrises27(s);
  if (!cands.length && !open.length) return null;
  return card27({ title: l('Crises', 'Crises'), icon: 'warning', tone: 'bad' },
    h('ul', { class: 'p2b-list' },
      // r27 (FLOW2): uma entrada só — a sala de crise chega como cartão no Avançar (Jogar / Resolver rápido); aqui, o estado e o marcador
      open.map((c: Crisis27) => h('li', null, h('b', null, t(c.title)), ' ', statusChip27(t(l('{w} sem. · ameaça {v}', '{w} wk · threat {v}'), { w: c.left, v: Math.round(c.threat) }), c.threat > 65 ? 'bad' : c.threat > 30 ? 'warn' : 'good'), ' ',
        c.used ? h('small', { class: 'muted' }, t(l('ações da semana feitas', 'this week\'s moves done'))) : occMark27(s, { src: 'crisis', key: `crw:${c.id}:${s.week}`, data: { crisis: c.id, k: c.k } }))),
      cands.map((c) => h('li', null, h('b', null, t(CRISIS_NAME27[c.k])), ' ', h('small', { class: 'muted' }, t(c.text)), ' ',
        occMark27(s, { src: 'crisis', key: `cr:${c.id}`, data: { cand: c.id, k: c.k } }) ?? h('small', { class: 'muted' }, t(l('corre sozinha (sempre rápido)', 'runs on its own (always quick)')))))));
}
