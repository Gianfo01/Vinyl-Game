// r27 (M2) — SHOW JOGÁVEL (interface). Três telas na mesma janela:
//   1. Antes: montar o setlist com o repertório real (sucessos, lados B, inéditas, covers), ordem e duração.
//   2. Durante: corrida comprimida (~30–60 s, pausável) com palco em pixel art, medidor de energia do público e
//      2–3 momentos de decisão (cartas com a chance de dar certo).
//   3. Depois: o show é resolvido pelo caminho de sempre (playShow27 → tours.playStop) e o resultado é explicado.
// Motor: src/sim/sys/show27.ts (puro). Teclado: Tab/Enter nos botões, Espaço pausa, setas reordenam com foco.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  KIND27, autoSet27, chance27, coverTitle27, moments27, planScore27, playShow27, showCtx27, showGate27, show27Log, simulate27, venueName27,
  type Moment27, type Result27, type Show27, type Song27,
} from '../../sim/sys/show27';
import { idealEnergy } from '../../sim/sys/live/notes';
import type { GameState } from '../../sim/types';
import { $, N, cityName, modal, pill, rerender, toast } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { meter } from '../vis';
import { cutscene27, reduced27 } from './mode27';
import { H27, W27, drawStage27, type Member27 } from './stage27';
import './show27.css';

const songTitle = (x: Song27): string => (x.kind === 'cover' ? t(coverTitle27(x.id) ?? l(x.title, x.title)) : x.title);
const MAX27 = 16;

/** Abre o show jogável. Entrada única: a data da turnê oferecida no avanço (flow27.ts). `onEnd(jogou)` ao fechar. */
export function openShow27(key: string, onEnd?: (played: boolean) => void): void {
  const s = store.game;
  if (!s) { onEnd?.(false); return; }
  const gate = showGate27(s, key);
  if (gate) { toast(t(gate), 'bad'); onEnd?.(false); return; }
  const c = showCtx27(s, key)!;
  const act = s.acts[c.actId];
  const members: Member27[] = act.members.map((id) => s.persons[id]).filter((p) => p && p.alive).map((p) => ({ id: p.id, look: p.look, born: p.born, role: p.role }));
  let ids = autoSet27(c);
  const root = h('div', { class: 'a27-show' });
  let close = () => {};
  let stop = () => {};

  // ------------------------------------------------------------ palco (compartilhado pelas telas)
  const cv = h('canvas', { class: 'a27-stage', width: W27, height: H27, role: 'img', 'aria-label': t(l('Palco e plateia', 'Stage and crowd')) }) as HTMLCanvasElement;
  const look = { energy: 45, target: 45, frame: 0, power: false, rain: false };
  const paint = () => drawStage27(cv, { tier: c.tier, year: c.year, energy: look.energy, frame: look.frame, power: look.power, rain: look.rain }, members);
  let raf = 0;
  const loop = () => {
    if (!cv.isConnected && look.frame > 2) return;
    look.frame += 1;
    look.energy += (look.target - look.energy) * 0.08;
    if (look.frame % 3 === 0) paint();
    raf = requestAnimationFrame(loop);
  };
  const startLoop = () => { if (!reduced27() && !raf) raf = requestAnimationFrame(loop); };
  const setEnergy = (v: number) => { look.target = v; if (reduced27()) { look.energy = v; paint(); } };

  const head = h('div', { class: 'a27-head' },
    h('b', null, act.name), ' · ', cityName(c.cityId), ' · ', t(venueName27(c.tier)), ' · ',
    t(l('{n}/{c} esperados', '{n}/{c} expected'), { n: N(c.exp), c: N(c.cap) }),
    c.openAir ? pill(t(c.rainy ? l('céu aberto · chuva provável', 'open air · rain likely') : l('céu aberto', 'open air')), c.rainy ? 'warn' : '') : null,
  );

  // ------------------------------------------------------------ 1. setlist
  const planView = () => {
    stop();
    const p = planScore27(c, ids);
    const pool = h('ul', { class: 'a27-pool', 'aria-label': t(l('Repertório', 'Repertoire')) }, c.pool.map((x) => {
      const inSet = ids.includes(x.id);
      return h('li', { class: inSet ? 'in' : '' },
        pill(t(KIND27[x.kind]), x.kind === 'hit' ? 'good' : x.kind === 'new' ? 'warn' : ''), ' ',
        h('span', { class: 'a27-t' }, songTitle(x)),
        h('small', { class: 'muted' }, t(l('energia {e} · apelo {a}', 'energy {e} · appeal {a}'), { e: x.energy, a: x.appeal })),
        h('button', { class: 'btn tiny', disabled: inSet || ids.length >= MAX27, 'aria-label': t(l('Pôr {m} no setlist', 'Add {m} to the setlist'), { m: songTitle(x) }), onclick: () => { ids = [...ids, x.id]; planView(); } }, '+'));
    }));
    const set = h('ol', { class: 'a27-set', 'aria-label': t(l('Setlist', 'Setlist')) }, ids.map((id, i) => {
      const x = c.pool.find((y) => y.id === id)!;
      const ideal = idealEnergy(i, ids.length);
      return h('li', null,
        h('span', { class: 'a27-bar', title: t(l('energia {e} (ideal {i})', 'energy {e} (ideal {i})'), { e: x.energy, i: Math.round(ideal) }) }, h('i', { style: `width:${x.energy}%` }), h('u', { style: `left:${Math.round(ideal)}%` })),
        h('span', { class: 'a27-t' }, i === 0 ? '▶ ' : i === ids.length - 1 ? '★ ' : '', songTitle(x)), ' ', pill(t(KIND27[x.kind]), x.kind === 'hit' ? 'good' : x.kind === 'new' ? 'warn' : ''),
        h('span', { class: 'a27-ord' },
          h('button', { class: 'btn tiny ghost', disabled: i === 0, 'aria-label': t(l('Subir {m}', 'Move {m} up'), { m: songTitle(x) }), onclick: () => { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; planView(); } }, '▲'),
          h('button', { class: 'btn tiny ghost', disabled: i === ids.length - 1, 'aria-label': t(l('Descer {m}', 'Move {m} down'), { m: songTitle(x) }), onclick: () => { [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; planView(); } }, '▼'),
          h('button', { class: 'btn tiny ghost', 'aria-label': t(l('Tirar {m}', 'Remove {m}'), { m: songTitle(x) }), onclick: () => { ids = ids.filter((y) => y !== id); planView(); } }, '✕')));
    }));
    root.replaceChildren(
      cv, head,
      h('div', { class: 'a27-cols' },
        h('div', null, h('h4', null, t(l('Repertório de {a}', '{a}\'s repertoire'), { a: act.name })), pool),
        h('div', null,
          h('h4', null, t(l('Setlist ({n} de ~{k} músicas)', 'Setlist ({n} of ~{k} songs)'), { n: ids.length, k: c.n })),
          h('p', { class: 'small muted' }, t(l('▶ abre, ★ fecha. A barra mostra a energia de cada música e o traço, a ideal naquele ponto.', '▶ opens, ★ closes. The bar shows each song\'s energy and the tick the ideal at that point.'))),
          set,
          meter('fire', l('Nota do setlist', 'Setlist score'), p.score),
          h('ul', { class: 'small a27-why' }, p.why.map((w) => h('li', null, t(w)))))),
      h('div', { class: 'row a27-actions' },
        h('button', { class: 'btn', onclick: () => { ids = autoSet27(c); planView(); } }, t(l('Montar automático', 'Auto-build'))),
        h('button', { class: 'btn primary', disabled: ids.length < 2, onclick: () => runView() }, t(l('Subir ao palco', 'Take the stage'))),
        onEnd ? h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Resolver rápido (o show acontece na data)', 'Resolve quickly (the show happens on its date)'))) : null),
    );
    setEnergy(30 + p.score * 0.3);
    paint();
  };

  // ------------------------------------------------------------ 2. o show
  const runView = () => {
    const ms: Moment27[] = moments27(s, c, ids);
    const choices: number[] = [];
    let shown = 0;
    let paused = false;
    let timer = 0;
    const per = Math.max(2500, Math.min(5000, Math.round(42000 / ids.length)));
    const now = h('p', { class: 'a27-now', 'aria-live': 'polite' });
    const meterBox = h('div');
    const deck = h('div', { class: 'a27-deck' });
    const feed = h('ul', { class: 'small a27-feed' });
    const pauseBtn = h('button', { class: 'btn small', onclick: () => toggle() }, t(l('Pausar', 'Pause')));
    const nextBtn = h('button', { class: 'btn small ghost', onclick: () => step() }, t(l('Próxima música', 'Next song')));
    const toggle = () => { paused = !paused; pauseBtn.textContent = t(paused ? l('Continuar', 'Resume') : l('Pausar', 'Pause')); if (!paused) schedule(); else clearTimeout(timer); };
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ' && root.isConnected && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); toggle(); } };
    document.addEventListener('keydown', onKey);
    stop = () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); };
    const schedule = () => { clearTimeout(timer); if (!paused) timer = window.setTimeout(step, per); };
    const meterE = (v: number) => meterBox.replaceChildren(meter('fire', l('Energia do público', 'Crowd energy'), v));
    const ask = (m: Moment27, idx: number) => {
      clearTimeout(timer);
      look.power = m.sit === 'power'; look.rain = m.sit === 'rain' || (look.rain && c.openAir);
      paint();
      nextBtn.setAttribute('disabled', '');
      deck.replaceChildren(
        h('p', { class: 'a27-sit' }, '⚠ ', h('b', null, t(m.text))),
        h('div', { class: 'a27-cards' }, m.opts.map((o, i) => {
          const p = chance27(c, o);
          return h('button', { class: 'a27-card', onclick: () => {
            choices[idx] = i;
            const r = simulate27(s, c, ids, choices);
            const lg = r.log[idx];
            feed.prepend(h('li', { class: lg.ok ? 'good' : 'bad' }, `${t(o.label)} → ${lg.ok ? t(l('deu certo', 'it worked')) : t(l('deu errado', 'it went wrong'))} (${lg.d >= 0 ? '+' : ''}${lg.d})`, lg.news ? h('small', null, ' — ', t(lg.news)) : null));
            deck.replaceChildren();
            nextBtn.removeAttribute('disabled');
            look.power = false;
            const e = Math.max(0, Math.min(100, Math.round((r.energy[shown - 1] ?? r.e0) + lg.d)));
            setEnergy(e); meterE(e);
            if (m.sit === 'encore') return finishView(choices);
            schedule();
          } },
          h('b', null, t(o.label)), h('small', null, t(o.hint)),
          h('small', { class: p >= 0.7 ? 'good' : p < 0.45 ? 'bad' : 'muted' }, o.stat === 'safe' ? t(l('Sem risco', 'No risk')) : t(l('Chance: {p}%', 'Chance: {p}%'), { p: Math.round(p * 100) })));
        })),
      );
      (deck.querySelector('button') as HTMLElement | null)?.focus();
    };
    const step = () => {
      clearTimeout(timer);
      if (deck.childElementCount) return;
      const run = simulate27(s, c, ids, choices);
      // momento pendente depois da música já tocada?
      if (run.pending >= 0 && shown - 1 === ms[run.pending].at) return ask(ms[run.pending], run.pending);
      if (shown >= ids.length) {
        const enc = ms.findIndex((m) => m.sit === 'encore');
        if (enc >= 0 && choices[enc] === undefined) return ask(ms[enc], enc);
        return finishView(choices);
      }
      const x = c.pool.find((y) => y.id === ids[shown])!;
      shown += 1;
      const e = run.energy[shown - 1] ?? run.e0;
      now.replaceChildren(t(l('Tocando {i}/{n}: ', 'Playing {i}/{n}: '), { i: shown, n: ids.length }), h('b', null, songTitle(x)), ' ', pill(t(KIND27[x.kind]), x.kind === 'hit' ? 'good' : x.kind === 'new' ? 'warn' : ''));
      setEnergy(e); meterE(e);
      const r2 = simulate27(s, c, ids, choices);
      if (r2.pending >= 0 && ms[r2.pending].at === shown - 1 && ms[r2.pending].sit !== 'encore') { timer = window.setTimeout(() => ask(ms[r2.pending], r2.pending), Math.min(1400, per / 2)); return; }
      schedule();
    };
    root.replaceChildren(cv, head, now, meterBox, deck, h('div', { class: 'row a27-actions' }, pauseBtn, nextBtn), feed);
    const r0 = simulate27(s, c, ids, []);
    setEnergy(r0.e0); meterE(r0.e0);
    startLoop();
    step();
  };

  // ------------------------------------------------------------ 3. depois
  const finishView = (choices: number[]) => {
    stop();
    const run = simulate27(s, c, ids, choices);
    const res = playShow27(s, key, ids, choices);
    if (!('key' in res)) { root.replaceChildren(h('p', { class: 'bad' }, t(res as L)), h('button', { class: 'btn', onclick: () => close() }, t(l('Fechar', 'Close')))); return; }
    const r = res as Result27;
    setEnergy(r.final);
    if (r.soldOut) cutscene27('sold_out', { actId: c.actId, cityId: c.cityId, key, sold: r.sold });
    if (r.disaster) cutscene27('disaster_show', { actId: c.actId, cityId: c.cityId, key });
    const pts = run.energy.map((e, i) => `${Math.round((i / Math.max(1, run.energy.length - 1)) * 200)},${Math.round(40 - e * 0.38)}`).join(' ');
    const title = r.perf >= 0.6 ? l('Noite lendária!', 'A legendary night!') : r.perf >= 0.2 ? l('Grande show!', 'Great show!') : r.perf > -0.3 ? l('Show correto.', 'A solid show.') : l('Noite difícil.', 'A rough night.');
    root.replaceChildren(
      cv, head,
      h('h3', { class: 'a27-title' }, t(title)),
      curve27(pts, t(l('Curva de energia do show', 'Show energy curve'))),
      h('div', { class: 'a27-stats' },
        stat27(l('Público', 'Crowd'), `${N(r.sold)}/${N(r.cap)}`),
        stat27(l('Cachê/bilheteria', 'Fee/box office'), $(r.pay)),
        stat27(l('Merch', 'Merch'), $(r.merch)),
        stat27(l('Fãs novos', 'New fans'), `+${N(r.fans)}`),
        stat27(l('Fama', 'Fame'), `${r.fame >= 0 ? '+' : ''}${r.fame.toFixed(2)}`),
        stat27(l('Crítica', 'Review'), `${r.review}/100`)),
      h('h4', null, t(l('Por que deu nisso', 'Why it turned out this way'))),
      h('ul', { class: 'small a27-why' }, r.why.map((w) => { const x = t(w); return h('li', null, x.charAt(0).toUpperCase() + x.slice(1)); })),
      h('p', { class: 'small muted' }, t(l('O show entrou no jogo como qualquer data da turnê: bilheteria, merch, fãs, fama no país, cansaço e manchetes.', 'The show counts like any tour date: box office, merch, fans, fame in the country, fatigue and headlines.'))),
      h('div', { class: 'row a27-actions' }, h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close')))),
    );
    (root.querySelector('.a27-actions button') as HTMLElement | null)?.focus();
  };

  planView();
  close = modal(t(l('Show ao vivo — jogar', 'Live show — play')), root, { wide: true, onClose: () => { stop(); cancelAnimationFrame(raf); onEnd?.(!!show27Log(s)[key]); rerender(); } });
}

const curve27 = (pts: string, label: string): HTMLElement => { const d = h('div', { class: 'a27-curve', role: 'img', 'aria-label': label }); d.innerHTML = `<svg viewBox="0 0 200 42" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`; return d; };
const stat27 = (k: L, v: string) => h('div', { class: 'a27-stat' }, h('small', null, t(k)), h('b', null, v));

/** Rótulo curto da próxima data jogável (para o botão "Jogar"). */
export const showLabel27 = (s: GameState, key: string): string => { const c = showCtx27(s, key); return c ? `${cityName(c.cityId)} · ${t(venueName27(c.tier))}` : ''; };
export type { Show27 };
