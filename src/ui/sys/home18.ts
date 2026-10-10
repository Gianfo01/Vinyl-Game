// Rodada 18 (decide18) — Cockpit VIVO: letreiro (fatos, boatos e paradas se movendo), linha do tempo das próximas
// semanas, cartões de grandes momentos, humor do elenco, atalhos, minigráficos com variação, holofote que gira
// (um ato seu, um rival, uma lenda), selos de urgência e o resumo do mês ao avançar (toast com deltas).
// Tudo lê o estado (sem RNG); o pulso do mês vem de sim/sys/decide18 (séries curtas).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { estimateMonthlyBurn } from '../../sim/events';
import { recentFacts } from '../../sim/facts17';
import { dec18, pending18 } from '../../sim/sys/decide18';
import { P } from '../../sim/sys/people/state';
import type { Act, GameState } from '../../sim/types';
import { dateOfDay, fmtL, playerActs } from '../../sim/util';
import { $, inspect, monthName, rerender, toast } from '../common';
import { h } from '../dom';
import { AFTER_ADVANCE } from '../registry';
import { store } from '../store';
import { ic } from '../vis';
import './home18.css';

const go = (area: string) => { store.area = area as typeof store.area; rerender(); };
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
const ui = { spot: 0 };

/** Minigráfico com mínimo e máximo próprios (aceita negativos). */
export function spark18(vals: number[], w = 90, hh = 24): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(w)); svg.setAttribute('height', String(hh)); svg.setAttribute('class', 'hm18-spark');
  if (vals.length < 2) return svg as unknown as HTMLElement;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(hh - 2 - ((v - lo) / span) * (hh - 4)).toFixed(1)}`).join(' ');
  const up = vals[vals.length - 1] >= vals[0];
  svg.innerHTML = `<polyline fill="none" stroke="${up ? 'var(--good)' : 'var(--bad)'}" stroke-width="1.6" points="${pts}"/><circle r="2.2" fill="currentColor" cx="${w}" cy="${pts.split(' ').pop()!.split(',')[1]}"/>`;
  return svg as unknown as HTMLElement;
}
const delta = (v: number, fmt: (n: number) => string = (n) => Math.round(n).toLocaleString()): HTMLElement =>
  h('small', { class: v > 0 ? 'good' : v < 0 ? 'bad' : 'muted' }, v > 0 ? `▲${fmt(v)}` : v < 0 ? `▼${fmt(-v)}` : '=');

// ---------------------------------------------------------------- letreiro
function ticker(s: GameState): HTMLElement | null {
  const items: { tx: string; cls: string }[] = [];
  for (const e of s.charts.singles.slice(0, 5)) {
    const r = s.releases[e.releaseId];
    if (!r) continue;
    const mv = e.last ? (e.last > e.pos ? `▲${e.last - e.pos}` : e.last < e.pos ? `▼${e.pos - e.last}` : '=') : t(l('NOVA', 'NEW'));
    items.push({ tx: `#${e.pos} ${s.acts[r.actId]?.name ?? ''} — "${r.title}" ${mv}`, cls: r.owner === 'player' || s.acts[r.actId]?.owner === 'player' ? 'mine' : 'chart' });
  }
  for (const f of recentFacts(s, { months: 2, notSecret: true, limit: 10 })) items.push({ tx: `${f.visibility === 'rumor' ? t(l('Boato: ', 'Rumor: ')) : ''}${t(f.text)}`, cls: f.visibility === 'rumor' ? 'rumor' : 'news' });
  if (!items.length) return null;
  const row = () => items.map((x) => h('span', { class: `hm18-tk ${x.cls}` }, x.tx));
  return h('div', { class: 'hm18-ticker', role: 'marquee', 'aria-label': t(l('Notícias e paradas', 'News and charts')) },
    h('b', { class: 'hm18-live' }, t(l('AO VIVO', 'LIVE'))),
    h('div', { class: 'hm18-track', style: `animation-duration:${Math.max(25, items.length * 6)}s` }, ...row(), ...row()));
}

// ---------------------------------------------------------------- linha do tempo (próximas 6 semanas)
function timeline(s: GameState): HTMLElement {
  const ev: { w: number; tx: string; cls: string; run?: () => void }[] = [];
  for (const p of s.pendingReleases) if (s.acts[p.actId]?.owner === 'player' && p.week >= s.week && p.week - s.week <= 6) ev.push({ w: p.week, tx: `💿 "${p.title}"`, cls: 'rel', run: () => go('releases') });
  for (const d of s.decisions) if (d.ctx.dl18) ev.push({ w: Number(d.ctx.dl18), tx: `⏱ ${t(d.title)}`, cls: 'dl', run: () => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' }) });
  for (const m of P(s).inbox) if (m.expires && !m.resolved && m.actions?.length && m.expires - s.week <= 6) ev.push({ w: m.expires, tx: `✉ ${t(m.subject)}`, cls: 'msg', run: () => go('inbox') });
  for (const x of pending18(s)) if (x.from - s.week <= 6) ev.push({ w: x.from, tx: `${x.tone === 'bad' ? '⚠' : x.tone === 'good' ? '✦' : '◆'} ${t(x.t)} — ${t(x.hint)}`, cls: `echo ${x.tone}` });
  ev.sort((a, b) => a.w - b.w);
  const cols = Array.from({ length: 6 }, (_, i) => s.week + i);
  return h('section', { class: 'card hm18-tl' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('calendar'), ' ', t(l('Próximas semanas', 'Coming weeks')))),
    h('div', { class: 'hm18-weeks' }, cols.map((w, i) => {
      const d = dateOfDay(s.config.startYear, w * 7);
      const here = ev.filter((e) => (i === 5 ? e.w >= w : e.w === w) || (i === 0 && e.w < w));
      return h('div', { class: `hm18-wk ${i === 0 ? 'now' : ''}`, style: `animation-delay:${i * 60}ms` },
        h('small', null, i === 0 ? t(l('agora', 'now')) : `${d.dom} ${monthName(d.month).slice(0, 3)}`),
        here.slice(0, 3).map((e) => h('button', { class: `hm18-ev ${e.cls}`, title: e.tx, onclick: e.run ?? null }, e.tx)),
        here.length > 3 ? h('small', { class: 'muted' }, `+${here.length - 3}`) : null);
    })),
    ev.length ? null : h('p', { class: 'muted small' }, t(l('Agenda livre: um bom momento para gravar ou lançar algo.', 'Clear schedule: a good time to record or release something.'))));
}

// ---------------------------------------------------------------- grandes momentos
function highlights(s: GameState): HTMLElement | null {
  const ids = new Set(mine(s).map((a) => a.id));
  const big = recentFacts(s, { months: 2, notSecret: true, minSev: 45, limit: 30 })
    .filter((f) => f.actors.some((a) => a === 'player' || ids.has(a) || ids.has(a.replace(/^a:/, ''))) && f.kind !== 'echo').slice(0, 3);
  const echoes = dec18(s).done.filter(([w]) => s.week - w <= 6).slice(0, 2);
  if (!big.length && !echoes.length) return null;
  const KIND_IC: Record<string, string> = { chart: '🏆', award: '🏅', release: '💿', scandal: '📰', death: '🕯', signing: '✍', split: '💔', show: '🎤' };
  return h('div', { class: 'hm18-hi' },
    big.map((f) => h('article', { class: `hm18-card k-${f.kind}` }, h('span', { class: 'hm18-big' }, KIND_IC[f.kind] ?? '✦'), h('p', null, t(f.text)))),
    echoes.map(([, ti, tx, tone]) => h('article', { class: `hm18-card echo ${tone}` }, h('span', { class: 'hm18-big' }, tone === 'bad' ? '↩' : '✦'), h('p', null, h('small', null, t(l('Consequência de: ', 'Consequence of: ')), t(ti)), h('br'), t(tx)))));
}

// ---------------------------------------------------------------- humor do elenco
const face = (v: number): string => (v >= 70 ? '😄' : v >= 50 ? '🙂' : v >= 30 ? '😐' : v >= 15 ? '😟' : '😫');
function roster(s: GameState): HTMLElement | null {
  const acts = mine(s).slice(0, 8);
  if (!acts.length) return null;
  return h('section', { class: 'card hm18-mood' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('fans'), ' ', t(l('Humor do elenco', 'Roster mood')))),
    h('div', { class: 'hm18-faces' }, acts.map((a) => {
      const ps = a.members.map((id) => s.persons[id]).filter((p) => p?.alive);
      const v = ps.length ? Math.round(ps.reduce((x, p) => x + p.morale - p.stress * 0.5 + 25, 0) / ps.length) : 50;
      const hot = ps.some((p) => p.stress > 70 || p.resentment > 50);
      return h('button', { class: `hm18-face ${hot ? 'hot' : ''}`, title: `${a.name}: ${t(l('moral − estresse/2', 'morale − stress/2'))} = ${v}`, onclick: () => inspect.act(a.id) },
        h('span', { class: 'hm18-emo' }, face(v)), h('small', null, a.name), h('i', { class: 'hm18-bar' }, h('i', { style: `width:${Math.max(4, Math.min(100, v))}%` })));
    })));
}

// ---------------------------------------------------------------- minigráficos
function pulse(s: GameState): HTMLElement {
  const pl = dec18(s).pl, L0 = pl.last;
  const cell = (lb: L, vals: number[], now: string, d: number, fmt?: (n: number) => string) =>
    h('div', { class: 'hm18-kpi' }, h('small', null, t(lb)), h('b', null, now), spark18(vals), L0 ? delta(d, fmt) : null);
  const fans = pl.fans.at(-1) ?? 0;
  return h('div', { class: 'hm18-kpis' },
    cell(l('Caixa', 'Cash'), pl.cash, $(s.player.cash), L0?.cash ?? 0, (n) => $(n)),
    cell(l('Fãs', 'Fans'), pl.fans, fans >= 1e6 ? `${(fans / 1e6).toFixed(1)}M` : fans >= 1e3 ? `${Math.round(fans / 1e3)}k` : String(fans), L0?.fans ?? 0),
    cell(l('Humor', 'Mood'), pl.mood, String(pl.mood.at(-1) ?? '—'), L0?.mood ?? 0),
    cell(l('Nas paradas', 'Charting'), pl.hits, `${pl.hits.at(-1) ?? 0}${L0?.best ? ` · #${L0.best}` : ''}`, L0?.hits ?? 0));
}

// ---------------------------------------------------------------- holofote (gira por semana; "próximo")
function spotlight(s: GameState): HTMLElement | null {
  const c: { k: L; name: string; tx: L; run: () => void }[] = [];
  const top = mine(s).sort((a, b) => b.momentum - a.momentum)[0];
  if (top) c.push({ k: l('Seu destaque', 'Your standout'), name: top.name, tx: fmtL(l('Embalo {m} · fama {f} · {n} hits', 'Momentum {m} · fame {f} · {n} hits'), { m: Math.round(top.momentum), f: Math.round(top.fame), n: top.hits }), run: () => inspect.act(top.id) });
  const rivals = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.momentum - a.momentum);
  if (rivals[0]) c.push({ k: l('Rival em alta', 'Rising rival'), name: rivals[0].name, tx: fmtL(l('{l} · embalo {m}', '{l} · momentum {m}'), { l: s.labels[String(rivals[0].owner)]?.name ?? '—', m: Math.round(rivals[0].momentum) }), run: () => inspect.act(rivals[0].id) });
  const legend = Object.values(s.acts).filter((a) => a.legend).sort((a, b) => b.fame - a.fame)[(s.week >> 2) % 5];
  if (legend) c.push({ k: l('Lenda', 'Legend'), name: legend.name, tx: fmtL(l('{h} hits · {w} prêmios · desde {y}', '{h} hits · {w} awards · since {y}'), { h: legend.hits, w: legend.awards, y: legend.debutYear }), run: () => inspect.act(legend.id) });
  const free = Object.values(s.acts).filter((a) => !a.owner && a.status !== 'retired' && a.status !== 'split' && a.members.length).sort((a, b) => b.momentum - a.momentum)[0];
  if (free) c.push({ k: l('Livre no mercado', 'Unsigned'), name: free.name, tx: fmtL(l('Sem selo · embalo {m} — alguém vai assinar.', 'No label · momentum {m} — someone will sign them.'), { m: Math.round(free.momentum) }), run: () => inspect.act(free.id) });
  if (!c.length) return null;
  const x = c[(s.week + ui.spot) % c.length];
  return h('section', { class: 'card hm18-spot' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('sparkle'), ' ', t(x.k)), h('button', { class: 'btn small ghost', 'aria-label': t(l('Próximo destaque', 'Next spotlight')), onclick: () => { ui.spot++; rerender(); } }, '›')),
    h('button', { class: 'hm18-spotname link', onclick: x.run }, x.name), h('p', { class: 'small' }, t(x.tx)),
    h('div', { class: 'hm18-dots' }, c.map((_, i) => h('i', { class: i === (s.week + ui.spot) % c.length ? 'on' : '' }))));
}

// ---------------------------------------------------------------- urgência e atalhos
function urgency(s: GameState): HTMLElement {
  const exp = P(s).inbox.filter((m) => m.expires && !m.resolved && m.actions?.length && m.expires - s.week <= 2).length;
  const bad = pending18(s).filter((x) => x.tone === 'bad' && x.from - s.week <= 4).length;
  const burn = estimateMonthlyBurn(s), run = burn > 0 ? s.player.cash / burn : 99;
  const tl = s.decisions.filter((d) => d.ctx.dl18).length;
  const b = (on: boolean, cls: string, tx: string, fn: () => void) => (on ? h('button', { class: `hm18-badge ${cls}`, onclick: fn }, tx) : null);
  return h('div', { class: 'hm18-urg' },
    b(s.decisions.length > 0, 'warn', `${s.decisions.length} ${t(l('decisões', 'decisions'))}`, () => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' })),
    b(tl > 0, 'bad', `⏱ ${tl} ${t(l('com prazo', 'timed'))}`, () => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' })),
    b(exp > 0, 'bad', `✉ ${exp} ${t(l('vencendo', 'expiring'))}`, () => go('inbox')),
    b(bad > 0, 'warn', `↩ ${bad} ${t(l('podem voltar', 'may return'))}`, () => go('inbox')),
    b(run < 3, 'bad', `💸 ${t(l('fôlego de {n} meses', '{n} months of runway'), { n: Math.max(0, Math.round(run * 10) / 10) })}`, () => go('finance')));
}
function quick(): HTMLElement {
  const q: [string, string, L][] = [['market', 'fans', l('Contratar', 'Sign')], ['studio', 'note', l('Gravar', 'Record')], ['releases', 'disc', l('Lançar', 'Release')], ['shows', 'mic', l('Shows', 'Shows')], ['finance', 'money', l('Finanças', 'Finances')], ['charts', 'chart-up', l('Paradas', 'Charts')]];
  return h('div', { class: 'hm18-quick', role: 'toolbar', 'aria-label': t(l('Atalhos', 'Quick actions')) }, q.map(([a, i, lb]) => h('button', { class: 'btn small ghost', onclick: () => go(a) }, ic(i), ' ', t(lb))));
}

/** Faixa viva no topo do Cockpit. */
export function home18(s: GameState): HTMLElement {
  return h('div', { class: 'hm18' },
    ticker(s),
    h('div', { class: 'hm18-row' }, urgency(s), quick()),
    pulse(s),
    highlights(s),
    h('div', { class: 'hm18-grid' }, timeline(s), h('div', { class: 'hm18-side' }, spotlight(s), roster(s))));
}

/** Resumo ao avançar o mês (toast com deltas do pulso). */
let lastW = -1;
export function monthToast18(s: GameState): void {
  const pl = dec18(s).pl;
  if (!pl.last || pl.w === lastW) { lastW = pl.w; return; }
  lastW = pl.w;
  const L0 = pl.last;
  const sg = (n: number, f: (x: number) => string = (x) => Math.round(x).toLocaleString()) => (n > 0 ? `+${f(n)}` : n < 0 ? `−${f(-n)}` : '±0');
  const parts = [`${t(l('caixa', 'cash'))} ${sg(L0.cash, (x) => $(x))}`, `${t(l('fãs', 'fans'))} ${sg(L0.fans)}`, `${t(l('humor', 'mood'))} ${sg(L0.mood)}`];
  if (L0.best) parts.push(`${t(l('melhor posição', 'best spot'))} #${L0.best}`);
  if (L0.fired) parts.push(t(l('{n} consequência(s) voltaram', '{n} consequence(s) came back'), { n: L0.fired }));
  const d = dateOfDay(s.config.startYear, s.week * 7);
  toast(`📅 ${monthName((d.month + 11) % 12)} ${t(l('fechado', 'closed'))}: ${parts.join(' · ')}`, L0.cash >= 0 ? 'good' : 'bad');
}

AFTER_ADVANCE.push((s) => monthToast18(s));
