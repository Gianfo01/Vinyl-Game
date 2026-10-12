// Rodada 27 (M3) — OPERAÇÃO JOGÁVEL do Submundo: quadro de planejamento em pixel art (cortiça, fotos presas com
// barbante vermelho, luminária), cartões da equipe (lealdade, habilidade, calor), alvo, medidor de risco e a linha do
// tempo das 3 etapas — Preparar, Executar (2–3 complicações com escolhas) e Encobrir. A lógica é pura em
// src/sim/sys/heist27.ts; aqui só a tela. "Executar" (modo rápido) segue igual ao lado do botão "Jogar".
// Cenas: batida policial e traição chamam playCutscene27?.('raid' | 'betrayal') se existir (agente K).

import './heist27.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { crimeById, nameOf17, targetsFor, usd, type Ctx17 } from '../../sim/sys/crime17';
import {
  COVER27, RISK27, UP27, abortHeist27, coverUp27, crewPool27, heistEvents27, planOdds27, playable27, roleName27, runHeist27, upOptions27,
  type Cover27, type Crew27, type Ev27, type Plan27, type Res27, type Risk27, type Sig27, type Up27,
} from '../../sim/sys/heist27';
import type { GameState } from '../../sim/types';
import { modal, rerender, toast } from '../common';
import { h, select } from '../dom';
import { avatarSprite, lookOf, portraitCanvas } from '../pixel/avatar';
import { C, Px, dith, mix, shade, withAlpha, type Col } from '../pixel/px';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const P = (x: number): string => `${Math.round(x * 100)}%`;

// ---------------------------------------------------------------- modo (Opções: jogáveis / só importantes / sempre rápido)

export type ActMode27 = 'play' | 'important' | 'quick';
/** Preferência global de atividades. Usa a de Opções se outro módulo a expuser; senão o armazenamento local. */
export function actMode27(): ActMode27 {
  try {
    const g = (globalThis as { actMode27?: () => ActMode27 }).actMode27;
    if (typeof g === 'function') return g();
    const v = globalThis.localStorage?.getItem('vinyl.act27');
    if (v === 'quick' || v === 'important' || v === 'play') return v;
  } catch { /* sem armazenamento */ }
  return 'play';
}
/** O botão "Jogar" aparece? (operações do submundo contam como "importantes") */
export const heistOn27 = (cid: string): boolean => playable27(cid) && actMode27() !== 'quick';

function cutscene(id: 'raid' | 'betrayal', ctx: unknown): void {
  try { (globalThis as { playCutscene27?: (id: string, ctx?: unknown) => void }).playCutscene27?.(id, ctx); } catch { /* opcional */ }
}

// ---------------------------------------------------------------- estado da janela

type Stage = 'prep' | 'exec' | 'cover' | 'done';
interface UI27 { s: GameState; plan: Plan27; stage: Stage; picks: Partial<Record<Ev27, string>>; res?: Res27; up?: Up27; upSig: Sig27[]; root: HTMLElement; close?: () => void; closed?: boolean }

/** Abre a operação jogável a partir do formulário do Submundo (crime, executor, alvo, método, organização, sócios). */
export function openHeist27(s: GameState, cid: string, ctx: Ctx17): void {
  if (!playable27(cid)) return;
  const ui: UI27 = { s, plan: { cid, ctx: { ...ctx, partners: [...ctx.partners] }, crew: [], risk: 'mid', cover: 'none' }, stage: 'prep', picks: {}, upSig: [], root: h('div', { class: 'hz27' }) };
  draw(ui);
  ui.close = modal(`${T(l('Operação', 'Operation'))}: ${T(crimeById(cid)!.name)}`, ui.root, { wide: true, onClose: () => onClose(ui) });
}

function onClose(ui: UI27): void {
  if (ui.closed) return;
  ui.closed = true;
  if (ui.stage === 'exec') toast(T(abortHeist27(ui.s, ui.plan)), 'info');
  if (ui.stage === 'cover' && ui.res) toast(T(l('Sem encobrimento: fica como está.', 'No cover-up: things stay as they are.')), 'info');
  rerender();
}

function draw(ui: UI27): void {
  const { s, plan } = ui;
  const pool = crewPool27(s, plan);
  const evs = ui.stage === 'prep' ? [] : heistEvents27(s, plan, pool);
  const od = planOdds27(s, plan, ui.picks);
  ui.root.replaceChildren(
    boardEl(ui, pool, od.p, od.q),
    timelineEl(ui, evs.length),
    ui.stage === 'prep' ? prepEl(ui, pool, od) : ui.stage === 'exec' ? execEl(ui, pool, evs, od) : resultEl(ui),
  );
  const f = ui.root.querySelector<HTMLElement>('[data-focus]');
  f?.focus?.();
}

// ---------------------------------------------------------------- quadro em pixel art

const PAL = { wall: C('#1a2134'), wall2: C('#222b44'), cork: C('#8a5a32'), cork2: C('#a06c3e'), frame: C('#5a3a20'), paper: C('#efe6cf'), pin: C('#d03a2c'), str: C('#c8302a'), lamp: C('#e8c45a'), floor: C('#141a29'), ink: C('#2a2a30') };

/** Pura: pinta o quadro (sem DOM). `n` cartões presos, `tk` tipo do alvo, `risk` 0..1 (luz da luminária). */
export function boardPx27(tk: string, n: number, risk: number, stage: number): Px {
  const W = 192, H = 72;
  const p = new Px(W, H);
  p.fill((x, y) => (dith(x, y, 0.5) && y % 6 < 3 ? PAL.wall2 : PAL.wall));
  p.rect(0, 60, W, 12, PAL.floor);
  // cortiça
  p.rect(10, 6, 118, 50, PAL.frame);
  p.fill((x, y) => ((x * 7 + y * 13) % 11 < 2 ? PAL.cork2 : PAL.cork), 12, 8, 114, 46);
  // foto do alvo
  const tx = 56, ty = 14;
  p.rect(tx, ty, 26, 30, PAL.paper);
  p.rect(tx + 2, ty + 2, 22, 20, C('#3a4660'));
  targetIcon(p, tk, tx + 13, ty + 12);
  p.disc(tx + 13, ty, 1, PAL.pin);
  // cartões da equipe + barbante
  const spots: [number, number][] = [[20, 12], [98, 12], [20, 36], [98, 36]];
  for (let i = 0; i < Math.min(n, 3); i++) {
    const [x, y] = spots[i];
    p.line(x + 7, y + 1, tx + 13, ty, PAL.str);
    p.rect(x, y, 14, 12, PAL.paper);
    p.rect(x + 3, y + 2, 8, 5, C('#c9b48e'));
    p.hline(x + 2, x + 11, y + 9, C('#9a8e76'));
    p.disc(x + 7, y + 1, 1, PAL.pin);
  }
  // etapas (3 bilhetes) no canto
  for (let i = 0; i < 3; i++) { const x = 20 + i * 12, y = 50; p.rect(x, y, 9, 4, i < stage ? C('#7fc27a') : i === stage ? PAL.lamp : C('#6a6050')); }
  // luminária e cone de luz (mais forte com mais risco)
  p.rect(150, 0, 2, 14, C('#555a66'));
  p.poly([[143, 14], [159, 14], [155, 9], [147, 9]], C('#3b4252'));
  const a = Math.round(40 + risk * 90);
  p.poly([[145, 15], [157, 15], [178, 60], [124, 60]], (x, y) => (dith(x, y, 0.5) ? withAlpha(mix(PAL.lamp, C('#d0402c'), risk), a) : withAlpha(PAL.lamp, Math.round(a / 2))));
  // mesa
  p.rect(132, 52, 54, 4, C('#4a3324'));
  p.rect(136, 56, 3, 6, shade(C('#4a3324'), 0.7));
  p.rect(178, 56, 3, 6, shade(C('#4a3324'), 0.7));
  p.rect(150, 48, 10, 4, PAL.paper); // planta do lugar
  p.rect(165, 47, 6, 5, C('#2e3a54')); // telefone
  return p;
}
function targetIcon(p: Px, tk: string, cx: number, cy: number): void {
  const g = C('#d8b040'), w = C('#e8e2d0'), k: Col = C('#14161c');
  if (tk === 'act') { p.disc(cx, cy, 8, k); p.ring(cx, cy, 6, C('#2a2c34')); p.disc(cx, cy, 2, C('#c0302a')); return; } // disco
  if (tk === 'own_act') { p.line(cx - 8, cy + 6, cx - 2, cy, g); p.line(cx - 2, cy, cx + 2, cy + 3, g); p.line(cx + 2, cy + 3, cx + 8, cy - 6, g); p.rect(cx + 6, cy - 7, 3, 3, g); return; } // parada
  if (tk === 'label') { p.rect(cx - 7, cy - 7, 14, 16, C('#6a7690')); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) p.rect(cx - 5 + i * 4, cy - 5 + j * 4, 2, 2, w); return; } // prédio
  if (tk === 'relic') { p.ellipse(cx, cy + 4, 5, 4, C('#a0522d')); p.rect(cx - 1, cy - 9, 2, 10, C('#5a3a20')); p.rect(cx - 2, cy - 10, 4, 2, g); return; } // guitarra
  if (tk === 'case') { p.rect(cx - 6, cy - 7, 12, 15, w); for (let j = 0; j < 4; j++) p.hline(cx - 4, cx + 3, cy - 4 + j * 3, C('#8a8a90')); return; } // dossiê
  p.disc(cx, cy - 3, 4, C('#2a2c34')); p.ellipse(cx, cy + 7, 7, 4, C('#2a2c34')); // pessoa
}

function boardEl(ui: UI27, pool: Crew27[], pp: number, q: number): HTMLElement {
  const d = crimeById(ui.plan.cid)!;
  const stg = ui.stage === 'prep' ? 0 : ui.stage === 'exec' ? 1 : 2 + (ui.stage === 'done' ? 1 : 0);
  const px = boardPx27(d.tk, ui.plan.crew.length, q, stg);
  const cv = document.createElement('canvas');
  cv.width = px.w; cv.height = px.h;
  const g = cv.getContext('2d');
  if (g) {
    g.imageSmoothingEnabled = false;
    g.drawImage(px.canvas(), 0, 0);
    // a equipe de pé na frente do quadro (bonecos reais)
    const crew = ui.plan.crew.map((k) => pool.find((x) => x.key === k)).filter((c): c is Crew27 => !!c);
    const people = [ui.plan.ctx.actor === 'player' ? null : ui.plan.ctx.actor, ...crew.map((c) => c.key)];
    people.forEach((k, i) => {
      const id = k === null ? `player:${ui.s.config.seed}` : k.startsWith('p:') ? k.slice(2) : k;
      const pr = k && k.startsWith('p:') ? ui.s.persons[k.slice(2)] : k && ui.s.persons[k] ? ui.s.persons[k] : undefined;
      const sp = avatarSprite(lookOf(pr ?? { id }), { year: ui.s.year, pose: 'stand', dir: i % 2 ? 'SW' : 'SE' });
      g.drawImage(sp.c, 134 + i * 14 - sp.ax, 68 - sp.ay);
    });
  }
  return h('figure', { class: 'hz27-board', 'aria-hidden': 'true' }, cv, meterEl(pp, q));
}

/** Medidor de risco: chance e exposição em 10 casas cada. */
function meterEl(p: number, q: number): HTMLElement {
  const cells = (v: number, cls: string) => h('span', { class: `hz27-cells ${cls}` }, ...Array.from({ length: 10 }, (_, i) => h('i', { class: i < Math.round(v * 10) ? 'on' : '' })));
  return h('figcaption', { class: 'hz27-meter' },
    h('span', null, h('b', null, T(l('Chance', 'Odds'))), cells(p, 'good'), h('em', null, P(p))),
    h('span', null, h('b', null, T(l('Exposição', 'Exposure'))), cells(q, 'bad'), h('em', null, P(q))));
}

// ---------------------------------------------------------------- linha do tempo

function timelineEl(ui: UI27, nEv: number): HTMLElement {
  const st: [Stage, L, 1 | 2 | 3][] = [['prep', l('Preparar', 'Prepare'), 1], ['exec', l('Executar', 'Execute'), 2], ['cover', l('Encobrir', 'Cover up'), 3]];
  const order: Stage[] = ['prep', 'exec', 'cover', 'done'];
  const cur = order.indexOf(ui.stage);
  const sigs = [...(ui.res?.sig ?? []), ...ui.upSig];
  return h('ol', { class: 'hz27-time', 'aria-label': T(l('Etapas da operação', 'Operation stages')) }, st.map(([id, name, n], i) => h('li', { class: i < cur ? 'done' : i === cur ? 'cur' : '', 'aria-current': i === cur ? 'step' : undefined },
    h('span', { class: 'hz27-node' }, String(n)), h('b', null, T(name)),
    id === 'exec' && nEv ? h('small', { class: 'muted' }, ` · ${nEv} ${T(l('decisões', 'decisions'))}`) : null,
    h('ul', { class: 'hz27-sig' }, sigs.filter((x) => x.st === n).map((x) => h('li', { class: x.tone }, `${SIGI[x.k]} ${T(x.t)}`))))));
}
const SIGI: Record<Sig27['k'], string> = { heat: '🔥', rumor: '🗣', case: '⚖', grudge: '✖', scandal: '📰', secret: '🔒', money: '$', loyal: '♥' };

// ---------------------------------------------------------------- 1. preparar

function prepEl(ui: UI27, pool: Crew27[], od: ReturnType<typeof planOdds27>): HTMLElement {
  const { s, plan } = ui;
  const d = crimeById(plan.cid)!;
  const tg = targetsFor(s, d);
  const set = (f: () => void) => () => { f(); draw(ui); };
  const crewCard = (c: Crew27) => {
    const on = plan.crew.includes(c.key);
    const full = !on && plan.crew.length >= 3;
    const pr = c.key.startsWith('p:') ? s.persons[c.key.slice(2)] : undefined;
    const pic = portraitCanvas(pr ?? { id: c.key }, s, 2);
    pic.classList.add('hz27-pic');
    return h('button', { class: `hz27-crew${on ? ' on' : ''}${c.fit ? ' fit' : ''}`, 'aria-pressed': on ? 'true' : 'false', disabled: full, title: c.why.map(T).join(' · '),
      onclick: set(() => { plan.crew = on ? plan.crew.filter((k) => k !== c.key) : [...plan.crew, c.key]; }) },
      pic,
      h('span', { class: 'hz27-cn' }, h('b', null, c.name), h('small', null, `${T(KIND[c.kind])} · ${T(roleName27(c.role))}${c.fit ? ' ★' : ''}`)),
      stat3(l('Lealdade', 'Loyalty'), c.loy, c.loy < 40 ? 'bad' : 'good'),
      stat3(l('Habilidade', 'Skill'), c.skill, 'info'),
      stat3(l('Calor', 'Heat'), c.heat, c.heat >= 40 ? 'bad' : 'warn'),
      h('small', { class: 'hz27-fee' }, T(usd(c.fee))));
  };
  const books = plan.cover === 'books' && !['bootleg', 'blackmail', 'royalty_skim', 'chart_rig'].includes(plan.cid);
  return h('div', { class: 'hz27-stage' },
    h('p', { class: 'small' }, T(d.desc)),
    h('div', { class: 'hz27-row' },
      h('label', null, h('span', null, T(l('Alvo', 'Target'))), tg.length ? select<string>(plan.ctx.target, tg.map((x) => ({ value: x.id, label: T(x.name) })), (v) => { plan.ctx.target = v; ui.picks = {}; draw(ui); }) : h('em', null, T(l('Sem alvos possíveis.', 'No possible targets.')))),
      d.methods ? h('label', null, h('span', null, T(l('Método', 'Method'))), select<string>(plan.ctx.method ?? d.methods[0].id, d.methods.map((m) => ({ value: m.id, label: T(m.name) })), (v) => { plan.ctx.method = v; draw(ui); })) : null),
    h('fieldset', { class: 'hz27-seg' }, h('legend', null, T(l('Nível de risco', 'Risk level'))),
      ...(Object.keys(RISK27) as Risk27[]).map((k) => h('button', { class: `btn small${plan.risk === k ? ' primary' : ''}`, 'aria-pressed': plan.risk === k ? 'true' : 'false', title: T(RISK27[k].hint), onclick: set(() => { plan.risk = k; }) }, T(RISK27[k].name))),
      h('small', { class: 'muted' }, T(RISK27[plan.risk].hint))),
    h('fieldset', { class: 'hz27-seg' }, h('legend', null, T(l('História de cobertura (opcional)', 'Cover story (optional)'))),
      ...(Object.keys(COVER27) as Cover27[]).map((k) => {
        const dis = k === 'books' && !['bootleg', 'blackmail', 'royalty_skim', 'chart_rig'].includes(plan.cid);
        return h('button', { class: `btn small${plan.cover === k ? ' primary' : ''}`, 'aria-pressed': plan.cover === k ? 'true' : 'false', disabled: dis, title: T(COVER27[k].hint), onclick: set(() => { plan.cover = k; }) }, T(COVER27[k].name));
      }),
      h('small', { class: 'muted' }, T(COVER27[plan.cover].hint)), books ? h('small', { class: 'bad' }, T(l('Não vale para este serviço.', 'Not valid for this job.'))) : null),
    h('h4', null, T(l('Equipe (até 3)', 'Crew (up to 3)')), ' ', h('small', { class: 'muted' }, T(l('★ função certa. Cada um ajuda na chance, mas é mais uma boca: exposição e segredo guardado.', '★ right role. Each helps the odds but is one more mouth: exposure and a held secret.')))),
    pool.length ? h('div', { class: 'hz27-crewgrid' }, pool.map(crewCard)) : h('p', { class: 'muted small' }, T(l('Ninguém disponível: contrate equipe, assine artistas ou aproxime-se de uma organização para ter contatos.', 'Nobody available: hire staff, sign artists or approach an organization to get contacts.'))),
    oddsEl(od),
    h('div', { class: 'hz27-actions' },
      od.block ? h('p', { class: 'small bad' }, T(od.block)) : h('button', { class: 'btn primary', 'data-focus': '', disabled: !plan.ctx.target, onclick: set(() => { ui.stage = 'exec'; ui.picks = {}; }) }, T(l('Começar a operação', 'Start the operation'))),
      h('button', { class: 'btn ghost', onclick: () => ui.close?.() }, T(l('Desistir', 'Back out')))),
  );
}
const KIND: Record<Crew27['kind'], L> = { artist: l('artista', 'artist'), staff: l('equipe', 'staff'), contact: l('contato', 'contact') };
function stat3(name: L, v: number, tone: string): HTMLElement {
  return h('span', { class: `hz27-st ${tone}` }, h('small', null, T(name)), h('span', { class: 'hz27-bar', role: 'img', 'aria-label': `${T(name)} ${v}` }, h('i', { style: `width:${Math.max(0, Math.min(100, v))}%` })), h('em', null, String(v)));
}
function oddsEl(od: ReturnType<typeof planOdds27>): HTMLElement {
  return h('div', { class: 'hz27-odds' },
    h('div', { class: 'hz27-kpis' },
      kpi(l('Chance', 'Odds'), P(od.p), 'good'), kpi(l('Exposição', 'Exposure'), P(od.q), 'bad'), kpi(l('Custo total', 'Total cost'), T(usd(od.cost)), ''), kpi(l('Calor', 'Heat'), `+${od.heat + od.m.heat}`, 'warn'), kpi(l('Ganho', 'Take'), `×${od.m.loot.toFixed(2)}`, '')),
    h('details', { class: 'small' }, h('summary', null, T(l('Por quê', 'Why'))), h('ul', null, od.why.map((w) => h('li', null, T(w))))));
}
const kpi = (n: L, v: string, tone: string) => h('span', { class: `hz27-kpi ${tone}` }, h('small', null, T(n)), h('b', null, v));

// ---------------------------------------------------------------- 2. executar

function execEl(ui: UI27, pool: Crew27[], evs: ReturnType<typeof heistEvents27>, od: ReturnType<typeof planOdds27>): HTMLElement {
  const { s, plan } = ui;
  const i = evs.findIndex((e) => !ui.picks[e.id]);
  const e = i >= 0 ? evs[i] : undefined;
  const who = e?.who ? pool.find((c) => c.key === e.who) : undefined;
  return h('div', { class: 'hz27-stage' },
    h('ol', { class: 'hz27-done' }, evs.filter((x) => ui.picks[x.id]).map((x) => h('li', null, h('b', null, T(x.title)), ': ', T(x.choices.find((c) => c.id === ui.picks[x.id])!.name)))),
    e ? h('section', { class: `hz27-ev ev-${e.id}`, 'aria-live': 'polite' },
      h('h4', null, `${i + 1}/${evs.length} · ${T(e.title)}`),
      who ? h('div', { class: 'hz27-who' }, portraitCanvas(who.key.startsWith('p:') ? s.persons[who.key.slice(2)] ?? { id: who.key } : { id: who.key }, s, 2), h('span', null, h('b', null, who.name), h('br'), h('small', null, `${T(l('Lealdade', 'Loyalty'))} ${who.loy} · ${T(l('Calor', 'Heat'))} ${who.heat}`))) : null,
      h('p', null, T(e.text)),
      h('div', { class: 'hz27-choices' }, e.choices.map((c, j) => h('button', { class: 'btn hz27-ch', disabled: !!c.block, 'data-focus': j === 0 ? '' : undefined, title: c.block ? T(c.block) : '',
        onclick: () => {
          ui.picks = { ...ui.picks, [e.id]: c.id };
          if (e.id === 'betray' && c.id === 'threaten') cutscene('betrayal', { stage: 'threat', who: who?.name });
          draw(ui);
        } }, h('b', null, T(c.name)), h('small', null, T(c.block ?? c.hint)))))) :
      h('section', { class: 'hz27-ev ready' }, h('h4', null, T(l('Tudo pronto', 'All set'))), h('p', { class: 'small' }, T(l('As escolhas já estão no medidor. Agora é a hora.', 'Your choices are in the meter. Now is the time.')))),
    oddsEl(od),
    h('div', { class: 'hz27-actions' },
      !e ? h('button', { class: 'btn primary', 'data-focus': '', disabled: !!od.block, onclick: () => go(ui) }, T(l('Executar agora', 'Go now'))) : null,
      h('button', { class: 'btn ghost', onclick: () => { toast(T(abortHeist27(s, plan)), 'info'); ui.stage = 'done'; ui.closed = true; ui.close?.(); } }, T(l('Abortar', 'Abort')))),
    od.block ? h('p', { class: 'small bad' }, T(od.block)) : null,
  );
}

function go(ui: UI27): void {
  const r = runHeist27(ui.s, ui.plan, ui.picks);
  if (!('out' in r)) { toast(T(r), 'bad'); return; }
  ui.res = r;
  ui.stage = 'cover';
  if (r.betrayed.length) cutscene('betrayal', { who: r.betrayed.map((k) => r.info.find((c) => c.key === k)?.name ?? k) });
  if (r.raid || r.out.ex) cutscene('raid', { ok: r.out.ok, ex: r.out.ex, crime: ui.plan.cid });
  draw(ui);
}

// ---------------------------------------------------------------- 3. encobrir + resultado

function resultEl(ui: UI27): HTMLElement {
  const { s } = ui;
  const r = ui.res!;
  const tone = r.out.ok && !r.out.ex ? 'good' : r.out.ok ? 'warn' : 'bad';
  const head = r.out.ok ? (r.out.ex ? l('Deu certo — mas vazou', 'It worked — but it leaked') : l('Limpo: deu certo e ninguém soube', 'Clean: it worked and nobody knew')) : r.out.ex ? l('Deu errado e vazou', 'It failed and leaked') : l('Deu errado, mas ficou em segredo', 'It failed, but stayed secret');
  return h('div', { class: 'hz27-stage' },
    h('section', { class: `hz27-res ${tone}`, 'aria-live': 'polite' },
      h('h4', null, T(head)),
      h('p', null, T(r.out.text)),
      r.loot ? h('p', { class: 'small' }, `${T(l('Ganho final (risco e cortes da equipe incluídos)', 'Final take (risk and crew cuts included)'))}: ${T(usd(r.loot))}`) : null,
      h('p', { class: 'small' }, h('b', null, T(r.out.ok && !r.out.ex ? l('Por quê: ', 'Why: ') : l('Saiu assim porque ', 'It went this way because '))), r.because.map(T).join('; '), '.'),
      r.out.ex ? h('p', { class: 'small muted' }, T(l('Exposto vira boato/manchete, escândalo, caso policial e mágoa da vítima (Submundo › Polícia).', 'Exposed means rumor/headline, scandal, police case and the victim\'s grudge (Underworld › Police).'))) : null),
    ui.stage === 'cover' ? h('div', null,
      h('h4', null, T(l('Encobrir', 'Cover up'))),
      h('div', { class: 'hz27-choices' }, upOptions27(s, r).map((o, j) => h('button', { class: 'btn hz27-ch', disabled: !!o.block, 'data-focus': j === 0 ? '' : undefined,
        onclick: () => {
          const x = coverUp27(s, r, o.id);
          if (!Array.isArray(x)) { toast(T(x), 'bad'); return; }
          ui.upSig = x; ui.up = o.id; ui.stage = 'done'; draw(ui);
        } }, h('b', null, `${T(UP27[o.id].name)}${o.cost ? ` · ${T(usd(o.cost))}` : ''}`), h('small', null, T(o.block ?? UP27[o.id].hint)))))) :
      h('div', null,
        h('p', { class: 'small' }, `${T(l('Encobrimento', 'Cover-up'))}: ${T(UP27[ui.up ?? 'none'].name)}. ${T(l('Os sinais de cada etapa estão na linha do tempo acima.', 'Each stage\'s signals are in the timeline above.'))}`),
        h('div', { class: 'hz27-actions' }, h('button', { class: 'btn primary', 'data-focus': '', onclick: () => ui.close?.() }, T(l('Fechar', 'Close'))))),
    h('p', { class: 'small muted' }, `${T(l('Executor', 'Carried out by'))}: ${nameOf17(s, r.resp)}`),
  );
}
