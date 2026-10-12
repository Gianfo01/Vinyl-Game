// Rodada 19 (Frente 8, onda 4: P3, P4, P8, P10, P12, 11.13, 11.14) — interface da EXPERIÊNCIA DA PARTIDA.
//  • Cartão de virada de década/era (pixel art da época): o que mudou, sua década, rivais, metas da era nova.
//  • Metas de abertura (inclusive 1889) e oferta de herança da partida anterior (opcional) no 1º mês.
//  • Recibo de decisão: clique numa opção → o que escolheu, o que mudou agora, ecos pendentes (link).
//  • "Por que perdi?" (quase-falência no Cockpit e tela de fim) e epitáfio com medalhas, cadeias e herança.
//  • Retrospectiva da década (Diário): gráfico ano a ano + melhores discos (review18/saga18).
//  • Divulgação progressiva no menu (nav17) com "mostrar tudo"; acessibilidade (setas nas abas, foco, rótulos).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { pending18 } from '../../sim/sys/decide18';
import { rv18 } from '../../sim/sys/review18';
import { sg18 } from '../../sim/sys/saga18';
import { pathDef18, type PathId } from '../../sim/sys/paths18';
import {
  activeGoals19, applyHeir19, epitaph19, goalNow19, goalText19, lockedAreas19, lossCauses19, monthsPlayed19, nearLoss19, receiptEchoes19,
  rivalMoves19, unlocked19, ux19, type Goal19, type Rc19, type Turn19,
} from '../../sim/sys/ux19';
import { CHAINS19, HEIRS19, eraBand19 } from '../../sim/sys/ux19data';
import { fanTotal } from '../../sim/fandom';
import { fin18, mIdx18, sumP18 } from '../../sim/ledger18';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { $, N, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { UX19UI } from '../hooks19';
import { C, Px, upscale, type Col } from '../pixel/px';
import { AFTER_ADVANCE, EXTRA_AREAS, registerSection } from '../registry';
import { help18 } from '../help18';
import { store } from '../store';
import { why18 } from '../explain18';
import { LABEL_LEGACY20, PATH_LEGACY20 } from '../../sim/oblig20';
import { legacyTotal } from '../../sim/legacy';
import { pendingView18 } from './decide18';
import { tutAllowed19 } from '../tutoff19';
import './ux19.css';

// ---------------------------------------------------------------- perfil local (meta-progresso entre partidas)
interface RunRec19 { sig: string; co: string; y0: number; y1: number; legacy: number; path?: string; medal: 0 | 1 | 2 | 3; chains: string[]; lost: boolean }
interface Profile19 { runs: RunRec19[]; ach: Record<string, number>; next?: string | null; all?: boolean }
const PKEY = 'vtn19.profile';
function profile(): Profile19 {
  try { const p = JSON.parse(localStorage.getItem(PKEY) ?? '{}') as Partial<Profile19>; return { runs: p.runs ?? [], ach: p.ach ?? {}, next: p.next ?? null, all: p.all }; }
  catch { return { runs: [], ach: {}, next: null }; }
}
function saveProfile(p: Profile19): void { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* sem armazenamento */ } }
const finished = (p: Profile19) => p.runs.length;
const heirOpen = (p: Profile19, id: string): boolean => {
  const H = HEIRS19.find((x) => x.id === id);
  return !!H && finished(p) >= H.need && (!H.chain || Object.keys(p.ach).filter((k) => k.startsWith('chain:')).length >= H.chain);
};
/** Grava a partida no perfil (uma vez por assinatura). Devolve as conquistas novas. */
function recordRun(g: GameState): string[] {
  const p = profile();
  if (p.runs.some((r) => r.sig === g.signature)) return [];
  const E = epitaph19(g);
  // medalha só para partidas de 5+ anos (o legado já nasce com pontos de caminho)
  const medal = (E.y1 - E.y0 < 5 ? 0 : E.legacy >= 70 ? 3 : E.legacy >= 50 ? 2 : E.legacy >= 30 ? 1 : 0) as RunRec19['medal'];
  const chains = E.chains.filter((c) => c.n >= 3 && c.me).map((c) => c.id);
  p.runs.push({ sig: g.signature, co: g.config.companyName, y0: E.y0, y1: E.y1, legacy: E.legacy, path: E.path, medal, chains, lost: g.ended?.reason === 'insolvency' });
  if (p.runs.length > 40) p.runs.splice(0, p.runs.length - 40);
  const fresh: string[] = [];
  const got = (k: string) => { if (p.ach[k] === undefined) { p.ach[k] = E.y1; fresh.push(k); } };
  for (const c of chains) got(`chain:${c}`);
  for (const c of E.chains.filter((x) => x.all && x.me)) got(`chainall:${c.id}`);
  if (E.y1 - E.y0 >= 3) for (const m of E.medals) got(`path:${m.id}:${m.tier}`);
  if (medal) got(`medal:${medal}`);
  got(`start:${Math.floor(E.y0 / 10) * 10}`);
  saveProfile(p);
  return fresh;
}
const achName = (k: string): L => {
  const [a, b, c] = k.split(':');
  if (a === 'chain' || a === 'chainall') { const ch = CHAINS19.find((x) => x.id === b); return fmtL(a === 'chain' ? l('Cadeia: {n}', 'Chain: {n}') : l('Cadeia completa: {n}', 'Full chain: {n}'), { n: ch?.name ?? b }); }
  if (a === 'path') return fmtL(l('Caminho {p} — nível {t}', 'Path {p} — tier {t}'), { p: pathDef18(b as PathId)?.name ?? b, t: c });
  if (a === 'medal') return fmtL(l('Medalha de partida: {m}', 'Run medal: {m}'), { m: [l('—', '—'), l('bronze', 'bronze'), l('prata', 'silver'), l('ouro', 'gold')][Number(b)] });
  if (a === 'start') return fmtL(l('Começou nos anos {d}', 'Started in the {d}s'), { d: b });
  return l(k, k);
};

// ---------------------------------------------------------------- pixel art da época
const P = { ink: C('#1a1214'), cream: C('#f4e4b8'), gold: C('#f0c040'), dgold: C('#b07c1c'), brown: C('#9a6034'), dbrown: C('#5e3a1e'), black: C('#2a2628'), grey: C('#a8a4a0'), dgrey: C('#5c5856'), red: C('#e04848'), blue: C('#4a8ae0'), teal: C('#2ec8c0'), purple: C('#8a5ad0'), white: C('#f8f4ec'), green: C('#48b85c') };
function eraArt(y: number, alt = ''): HTMLElement {
  const W = 96, H = 40, p = new Px(W, H);
  const sky: Col = y < 1925 ? C('#3a2a1e') : y < 1955 ? C('#2a2238') : y < 1981 ? C('#3a1e3a') : y < 1999 ? C('#1e2240') : y < 2008 ? C('#1e2e2e') : C('#141a2a');
  p.rect(0, 0, W, H, sky);
  for (let i = 0; i < 12; i++) p.put((i * 37) % W, (i * 13) % 18, P.cream);
  p.rect(0, 32, W, 8, P.dbrown); p.hline(0, W - 1, 32, P.brown);
  const cx = 48;
  if (y < 1925) { p.rect(cx - 10, 24, 20, 8, P.brown); p.rect(cx - 6, 20, 12, 4, P.black); p.poly([[cx + 2, 20], [cx + 20, 4], [cx + 26, 12], [cx + 6, 22]], P.gold); p.line(cx + 20, 4, cx + 26, 12, P.dgold); }
  else if (y < 1948) { p.rect(cx - 1, 12, 3, 20, P.grey); p.ellipse(cx, 9, 5, 6, P.dgrey); for (let k = 5; k < 14; k += 2) p.hline(cx - 4, cx + 4, k, P.grey); p.rect(cx - 6, 30, 13, 2, P.dgrey); }
  else if (y < 1955) { p.disc(cx, 20, 11, P.black); p.ring(cx, 20, 8, P.dgrey); p.ring(cx, 20, 5, P.dgrey); p.disc(cx, 20, 3, P.red); p.put(cx, 20, P.ink); }
  else if (y < 1981) { p.ellipse(cx - 4, 24, 8, 6, P.red); p.ellipse(cx - 4, 24, 3, 2, P.black); p.poly([[cx + 2, 22], [cx + 26, 10], [cx + 27, 12], [cx + 3, 25]], P.brown); p.rect(cx + 24, 7, 5, 4, P.dbrown); }
  else if (y < 1999) { p.rect(cx - 14, 8, 28, 22, P.dgrey); p.rect(cx - 11, 11, 22, 15, P.purple); p.rect(cx - 6, 14, 3, 3, P.gold); p.rect(cx + 2, 18, 4, 3, P.teal); p.hline(cx - 9, cx + 9, 28, P.grey); }
  else if (y < 2008) { p.disc(cx - 8, 20, 9, P.grey); p.ring(cx - 8, 20, 6, P.white); p.disc(cx - 8, 20, 2, P.dgrey); p.rect(cx + 4, 12, 16, 12, P.dgrey); p.rect(cx + 6, 14, 12, 8, P.blue); p.rect(cx + 2, 24, 20, 2, P.grey); }
  else { p.rect(cx - 7, 6, 14, 25, P.black); p.rect(cx - 5, 9, 10, 18, P.teal); p.poly([[cx - 2, 14], [cx + 3, 17], [cx - 2, 20]], P.white); p.put(cx, 29, P.grey); }
  p.outline(P.ink);
  const cv = upscale(p.canvas(), W * 3, H * 3);
  cv.className = 'ux19-art px';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', alt || String(y));
  return cv as unknown as HTMLElement;
}
function tombArt(name: string): HTMLElement {
  const W = 64, H = 40, p = new Px(W, H);
  p.rect(0, 0, W, H, C('#1e2030')); p.rect(0, 33, W, 7, C('#2c4a2c'));
  p.rect(18, 8, 28, 26, P.grey); p.ellipse(32, 9, 14, 6, P.grey); p.rect(20, 10, 24, 22, C('#c4c0bc'));
  p.disc(32, 16, 5, P.black); p.disc(32, 16, 1.4, P.gold); p.hline(24, 40, 25, P.dgrey); p.hline(26, 38, 28, P.dgrey);
  for (const x of [10, 52]) { p.vline(x, 26, 33, P.green); p.disc(x, 25, 1.6, P.red); }
  p.outline(P.ink);
  const cv = upscale(p.canvas(), W * 3, H * 3);
  cv.className = 'ux19-art px';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', name);
  return cv as unknown as HTMLElement;
}

// ---------------------------------------------------------------- utilidades
const BUSY19 = '.overlay, .scene-overlay, .tour18, aside.tutorial';
const busy = (): boolean => typeof document === 'undefined' || !!document.querySelector(BUSY19);
const whenFree = (fn: () => void, n = 0): void => {
  if (typeof document === 'undefined') return;
  if (busy() && n < 60) { setTimeout(() => whenFree(fn, n + 1), 500); return; }
  fn();
};
const goArea = (a: string) => { document.querySelector('.overlay')?.remove(); store.area = a as typeof store.area; rerender(); };
const CH_IC: Record<string, string> = { tech: '⚙', genre: '♪', law: '§', market: '$', era: '★' };
const CH_T: Record<string, L> = { tech: l('Tecnologia', 'Technology'), genre: l('Gêneros', 'Genres'), law: l('Leis', 'Laws'), market: l('Mercado', 'Market'), era: l('Era de negócio', 'Business era') };

/** Barras SVG simples (receita × resultado por ano), com rótulos para leitores de tela. */
function yearBars(rows: { y: number; a: number; b: number }[], la: L, lb: L): HTMLElement {
  if (!rows.length) return h('p', { class: 'muted small' }, t(l('Sem anos fechados ainda.', 'No closed years yet.')));
  const max = Math.max(1, ...rows.map((r) => Math.max(Math.abs(r.a), Math.abs(r.b))));
  const W = Math.max(150, 30 * rows.length), H = 80, mid = 50;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 12}`);
  svg.setAttribute('class', 'ux19-bars');
  svg.setAttribute('width', String(W * 2));
  svg.setAttribute('height', String((H + 12) * 2));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', rows.map((r) => `${r.y}: ${t(la)} ${$(r.a)}, ${t(lb)} ${$(r.b)}`).join('; '));
  rows.forEach((r, i) => {
    const x = i * 30 + 4;
    const ha = (Math.abs(r.a) / max) * 46, hb = (Math.abs(r.b) / max) * 46;
    const ra = document.createElementNS(ns, 'rect'); ra.setAttribute('x', String(x)); ra.setAttribute('width', '10'); ra.setAttribute('y', String(r.a >= 0 ? mid - ha : mid)); ra.setAttribute('height', String(Math.max(1, ha))); ra.setAttribute('class', 'a'); svg.appendChild(ra);
    const rb = document.createElementNS(ns, 'rect'); rb.setAttribute('x', String(x + 11)); rb.setAttribute('width', '10'); rb.setAttribute('y', String(r.b >= 0 ? mid - hb : mid)); rb.setAttribute('height', String(Math.max(1, hb))); rb.setAttribute('class', r.b >= 0 ? 'b' : 'b neg'); svg.appendChild(rb);
    const tx = document.createElementNS(ns, 'text'); tx.setAttribute('x', String(x + 10)); tx.setAttribute('y', String(H + 10)); tx.setAttribute('text-anchor', 'middle'); tx.textContent = `'${String(r.y).slice(2)}`; svg.appendChild(tx);
  });
  const base = document.createElementNS(ns, 'line'); base.setAttribute('x1', '0'); base.setAttribute('x2', String(W)); base.setAttribute('y1', String(mid)); base.setAttribute('y2', String(mid)); base.setAttribute('class', 'base'); svg.appendChild(base);
  return h('figure', { class: 'ux19-fig' }, svg as unknown as HTMLElement,
    h('figcaption', { class: 'small muted' }, h('span', { class: 'ux19-key a' }, '■ '), t(la), '  ', h('span', { class: 'ux19-key b' }, '■ '), t(lb)));
}

function goalRow(s: GameState, g: Goal19): HTMLElement {
  const v = goalNow19(s, g), n = g.spec.n, pct = Math.min(100, Math.round((v / Math.max(1, n)) * 100));
  const st = g.done ? 'good' : g.fail ? 'bad' : '';
  return h('li', { class: `ux19-goal ${st}` },
    h('span', { class: 'ux19-gi', 'aria-hidden': 'true' }, g.done ? '✓' : g.fail ? '✗' : '◯'),
    h('span', { class: 'ux19-gt' }, why18(s, 'ux19.goal', { g: g.id }, t(goalText19(g))),
      h('span', { class: 'ux19-prog', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(n), 'aria-valuenow': String(Math.min(v, n)), 'aria-label': t(goalText19(g)) }, h('i', { style: `width:${pct}%` })),
      h('small', { class: 'muted' }, g.done ? t(l('cumprida', 'met')) : g.fail ? t(l('prazo passou', 'deadline passed')) : `${N(Math.min(v, n))}/${N(n)}`)));
}

// ---------------------------------------------------------------- cartão de virada
function turnCard(s: GameState, T: Turn19): HTMLElement {
  const groups = (['era', 'tech', 'genre', 'law', 'market'] as const).map((k) => [k, T.changes.filter((c) => c.k === k)] as const).filter(([, xs]) => xs.length);
  const rivals = s.year === T.y && T.era ? rivalMoves19(s, T.era) : T.rivals;
  const goals = T.goals.map((id) => ux19(s).goals.find((g) => g.id === id)).filter((g): g is Goal19 => !!g);
  const sm = T.sum;
  const ys = sg18(s).years.filter((x) => x.y >= sm.y0 && x.y <= sm.y1);
  return h('div', { class: 'ux19-turn' },
    h('div', { class: 'ux19-hero' }, eraArt(T.y, t(T.name)), h('div', null, h('p', { class: 'ux19-kicker' }, String(T.y), ' · ', t(eraBand19(T.y).name)), h('h3', null, t(T.name)))),
    h('div', { class: 'ux19-grid' },
      h('section', { class: 'card ux19-sec', 'aria-labelledby': 'ux19-h1' }, h('h4', { id: 'ux19-h1' }, t(l('O que mudou', 'What changed'))),
        groups.length ? groups.map(([k, xs]) => h('div', { class: 'ux19-ch' }, h('b', null, h('span', { 'aria-hidden': 'true' }, CH_IC[k], ' '), t(CH_T[k])),
          h('ul', null, xs.map((c) => h('li', null, t(c.t), c.x ? h('small', { class: 'muted' }, ' — ', t(c.x)) : null)))))
          : h('p', { class: 'muted small' }, t(l('Nenhuma ruptura: a década muda pelo acúmulo. Veja os marcos em Mundo › Marcos da história.', 'No rupture: the decade changes by accumulation. See Milestones in World › History.')))),
      h('section', { class: 'card ux19-sec', 'aria-labelledby': 'ux19-h2' }, h('h4', { id: 'ux19-h2' }, t(fmtL(l('Sua década ({a}–{b})', 'Your decade ({a}–{b})'), { a: sm.y0, b: sm.y1 }))),
        h('div', { class: 'ux19-kpis' },
          h('div', null, h('small', null, t(l('Caixa', 'Cash'))), h('b', null, `${$(sm.cash0)} → ${$(sm.cash1)}`)),
          h('div', null, h('small', null, t(l('Resultado operacional', 'Operating result'))), h('b', { class: sm.prof >= 0 ? 'good' : 'bad' }, $(sm.prof))),
          h('div', null, h('small', null, t(l('Lançamentos / nº 1', 'Releases / #1s'))), h('b', null, `${sm.rels} / ${sm.n1}`)),
          h('div', null, h('small', null, t(l('Contratou / saíram', 'Signed / left'))), h('b', null, `${sm.signed} / ${sm.left}`))),
        yearBars(ys.map((x) => ({ y: x.y, a: x.rev, b: x.prof })), l('Receita', 'Revenue'), l('Resultado', 'Result')),
        sm.best.length ? h('p', { class: 'small' }, t(l('Destaques: ', 'Highlights: ')), sm.best.join(' · ')) : null),
      h('section', { class: 'card ux19-sec', 'aria-labelledby': 'ux19-h3' }, h('h4', { id: 'ux19-h3' }, t(l('Jogadas dos rivais', 'Rival moves'))),
        rivals.length ? h('ul', null, rivals.map((r) => h('li', null, t(r)))) : h('p', { class: 'muted small' }, t(l('Nenhum rival ativo.', 'No active rivals.')))),
      h('section', { class: 'card ux19-sec', 'aria-labelledby': 'ux19-h4' }, h('h4', { id: 'ux19-h4' }, t(l('Metas sugeridas para a nova era', 'Suggested goals for the new era'))),
        goals.length ? h('ul', { class: 'ux19-goals' }, goals.map((g) => goalRow(s, g))) : h('p', { class: 'muted small' }, t(l('Sem metas novas.', 'No new goals.'))),
        h('p', { class: 'small muted' }, t(l('Cumprir dá +1 de reputação e moral ao elenco. Prazos no Calendário.', 'Meeting one gives +1 reputation and roster morale. Deadlines in the Calendar.'))))),
  );
}
export function openTurn19(s: GameState, T: Turn19): void {
  T.seen = 1;
  let close = () => {};
  const body = h('div', null, turnCard(s, T),
    h('div', { class: 'row wrap ux19-actions' },
      h('button', { class: 'btn', onclick: () => { close(); goArea('diary'); setTimeout(() => document.getElementById('ux19-dec')?.scrollIntoView({ block: 'start' }), 80); } }, t(l('Retrospectiva da década', 'Decade retrospective'))),
      h('button', { class: 'btn', onclick: () => { close(); goArea('goals'); } }, t(l('Ver metas', 'See goals'))),
      h('button', { class: 'btn primary', onclick: () => close() }, t(l('Seguir para a nova era', 'On to the new era')))));
  close = modal(`${T.y} — ${t(T.name)}`, body, { wide: true });
}

// ---------------------------------------------------------------- abertura (metas + herança)
function openingCard(s: GameState): void {
  const U = ux19(s);
  if (U.os) return;
  U.os = 1;
  const pr = profile();
  const goals = activeGoals19(s).filter((g) => g.src === 'open');
  const heirs = HEIRS19.filter((x) => heirOpen(pr, x.id));
  const last = pr.runs[pr.runs.length - 1];
  let close = () => {};
  const pick = (id: string) => { const err = applyHeir19(s, id, last?.co); toast(t(err ?? l('Herança aceita.', 'Legacy taken.')), err ? 'bad' : 'good'); close(); rerender(); };
  const body = h('div', { class: 'ux19-open' },
    h('div', { class: 'ux19-hero' }, eraArt(s.year, t(eraBand19(s.year).name)), h('div', null, h('p', { class: 'ux19-kicker' }, String(s.year)), h('h3', null, t(eraBand19(s.year).name)))),
    h('p', null, t(l('Três metas para começar (opcionais). Elas mostram o que conta nesta época; ao virar a década ou a era aparecem outras.', 'Three goals to start (optional). They show what matters in this era; new ones appear when the decade or the era turns.'))),
    h('ul', { class: 'ux19-goals' }, goals.map((g) => goalRow(s, g))),
    heirs.length && last ? h('section', { class: 'card ux19-sec' }, h('h4', null, t(fmtL(l('Herança de {c} ({a}–{b})', 'Legacy from {c} ({a}–{b})'), { c: last.co, a: last.y0, b: last.y1 }))),
      h('p', { class: 'small muted' }, t(l('Opcional: escolha uma (ou nenhuma). Pode ser só cosmética.', 'Optional: pick one (or none). It can be cosmetic only.'))),
      h('div', { class: 'row wrap' }, heirs.map((x) => h('button', { class: `btn small ${pr.next === x.id ? 'primary' : ''}`, title: t(x.desc), onclick: () => pick(x.id) }, t(x.name))),
        h('button', { class: 'btn small ghost', onclick: () => close() }, t(l('Sem herança', 'No legacy'))))) : null,
    h('div', { class: 'row wrap ux19-actions' }, h('button', { class: 'btn primary', onclick: () => close() }, t(l('Começar', 'Start')))));
  close = modal(t(l('Metas de abertura', 'Opening goals')), body, { wide: true });
}

// ---------------------------------------------------------------- recibo de decisão (P3)
interface Snap19 { cash: number; fans: number; rep: number; rc?: string; w: number; day: number }
let snap: Snap19 | null = null;
const snapNow = (s: GameState): Snap19 => ({ cash: s.player.cash, fans: playerActs(s).reduce((a, id) => a + (s.acts[id] ? fanTotal(s.acts[id]) : 0), 0), rep: Object.values(s.player.reputation).reduce((a, b) => a + b, 0) / 4, rc: ux19(s).rc[0]?.id, w: s.week, day: s.day });
function receiptEl(s: GameState, r: Rc19): HTMLElement {
  const e = receiptEchoes19(s, r), d = r.d ?? {};
  const dl = (k: string, v: number, f: (x: number) => string) => v ? h('span', { class: `pill ${v > 0 ? 'good' : 'bad'}` }, `${t(({ cash: l('Caixa', 'Cash'), fans: l('Fãs', 'Fans'), rep: l('Reputação', 'Reputation') } as Record<string, L>)[k])} ${v > 0 ? '+' : '−'}${f(Math.abs(v))}`) : null;
  return h('div', { class: 'ux19-rc' },
    h('b', null, '🧾 ', t(r.t), ' → ', t(r.o)),
    h('div', { class: 'ux19-rc-now' }, h('small', { class: 'muted' }, t(l('Agora: ', 'Now: '))),
      ...(Object.values(d).some((v) => v) ? [dl('cash', d.cash ?? 0, $), dl('fans', d.fans ?? 0, N), dl('rep', d.rep ?? 0, (x) => x.toFixed(1))] : [h('small', null, t(l('sem efeito imediato visível', 'no visible immediate effect')))])),
    h('div', null, h('small', { class: 'muted' }, t(l('Depois: ', 'Later: '))), h('small', null, e.pend ? t(fmtL(l('{n} eco(s) pendente(s)', '{n} pending echo(es)'), { n: e.pend })) : t(l('nenhum eco agendado', 'no echo scheduled'))),
      e.back.length ? h('small', null, ' · ', t(fmtL(l('{n} já voltou', '{n} came back'), { n: e.back.length }))) : null,
      ' ', h('button', { class: 'link', onclick: () => openPending(s) }, t(l('Consequências pendentes', 'Pending consequences')), ' →')));
}
function openPending(s: GameState): void {
  document.querySelector('.ux19-rcbox')?.remove();
  modal(t(l('Consequências pendentes', 'Pending consequences')), pendingView18(s, 30));
}
function showReceipt(s: GameState, r: Rc19): void {
  document.querySelector('.ux19-rcbox')?.remove();
  const box = h('div', { class: 'ux19-rcbox', role: 'status', 'aria-live': 'polite' }, receiptEl(s, r),
    h('button', { class: 'icon ux19-x', 'aria-label': t(l('Fechar recibo', 'Close receipt')), title: t(l('Fechar recibo', 'Close receipt')), onclick: () => box.remove() }, '✕'));
  (document.getElementById('toasts') ?? document.body).appendChild(box); // r19 smoke: empilha com os avisos (não se sobrepõem)
  setTimeout(() => box.classList.add('out'), 9000);
  setTimeout(() => box.remove(), 9600);
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const s = store.game;
    if (!s || !(e.target as HTMLElement)?.closest?.('button')) return;
    snap = snapNow(s);
    setTimeout(() => {
      const g = store.game, r = g ? ux19(g).rc[0] : undefined;
      // só a escolha feita no clique (avançar o tempo resolve cartões vencidos pelo padrão: sem recibo flutuante)
      if (!g || !r || !snap || r.id === snap.rc || r.seen || g.week !== snap.w || g.day !== snap.day) { snap = null; return; }
      const now = snapNow(g);
      r.d = { cash: now.cash - snap.cash, fans: now.fans - snap.fans, rep: Math.round((now.rep - snap.rep) * 10) / 10 };
      r.seen = 1;
      snap = null;
      showReceipt(g, r);
    }, 0);
  }, true);
}

// ---------------------------------------------------------------- por que perdi? (P12)
function lossView(s: GameState): HTMLElement {
  const C0 = lossCauses19(s);
  const F = fin18(s), m = mIdx18(s);
  const rows = Array.from({ length: 12 }, (_, i) => { const o = F.m[m - 12 + i] ?? {}; return { y: 0, a: sumP18(o, 'rev:'), b: sumP18(o, 'rev:') + sumP18(o, 'cost:') }; });
  return h('div', { class: 'ux19-loss' },
    C0.length ? h('ol', { class: 'ux19-causes' }, C0.map((c) => h('li', null,
      h('b', null, t(c.t)), ' ', h('span', { class: 'pill bad' }, String(c.v)),
      c.chain && c.chain.length > 1 ? h('div', { class: 'small muted' }, t(l('Cadeia: ', 'Chain: ')), c.chain.map((x) => t(x)).join(' → ')) : null,
      h('div', { class: 'small' }, h('b', null, t(l('Teria ajudado: ', 'Would have helped: '))), t(c.help)))))
      : h('p', { class: 'muted' }, t(l('Nenhuma causa forte nos últimos 24 meses: o caixa caiu aos poucos.', 'No strong cause in the last 24 months: cash fell little by little.'))),
    h('h4', null, t(l('Últimos 12 meses', 'Last 12 months'))),
    yearBars(rows.map((r, i) => ({ ...r, y: 2000 + ((m - 12 + i) % 12) + 1 })), l('Receita', 'Revenue'), l('Receita − custos', 'Revenue − costs')),
    h('p', { class: 'small muted' }, why18(s, 'ux19.loss', {}, t(l('Como o peso é calculado', 'How the weight is computed'))), ' · ', why18(s, 'cash.month', {}, t(l('Caixa do mês', 'Cash this month')))));
}
export function openLoss19(s: GameState): void { modal(t(l('Por que perdi?', 'Why did I lose?')), lossView(s), { wide: true }); }

// ---------------------------------------------------------------- epitáfio e fim (11.14)
function endBlock(g: GameState): HTMLElement {
  const fresh = recordRun(g);
  const E = epitaph19(g), pr = profile();
  const lost = g.ended?.reason === 'insolvency';
  const heirs = HEIRS19.filter((x) => heirOpen(pr, x.id));
  const setNext = (id: string | null) => { const p = profile(); p.next = id; saveProfile(p); toast(t(id ? l('Herança guardada para a próxima partida.', 'Legacy saved for the next run.') : l('Sem herança na próxima partida.', 'No legacy next run.')), 'info'); };
  return h('div', { class: 'ux19-end' },
    h('div', { class: 'ux19-epi' }, tombArt(E.name),
      h('div', null, h('p', { class: 'ux19-kicker' }, `${E.y0}–${E.y1}`), h('h3', null, E.name),
        E.ending ? h('p', { class: 'small' }, t(E.ending)) : null,
        // r20 (B21): dois legados, dois nomes — cada um com a própria composição (ⓘ)
        h('div', { class: 'ux19-kpis' }, h('div', null, h('small', null, t(PATH_LEGACY20)), h('b', null, why18(g, 'legacy.path20', {}, String(E.legacy)))),
          h('div', null, h('small', null, t(LABEL_LEGACY20)), h('b', null, why18(g, 'legacy.label20', {}, String(legacyTotal(g))))),
          ...E.stats.map((x) => h('div', null, h('small', null, t(x.k)), h('b', null, N(x.v))))))),
    h('ul', { class: 'ux19-epi-list' },
      E.best ? h('li', null, h('b', null, t(l('Melhor disco: ', 'Best record: '))), `${E.best.title} — ${E.best.act}`, E.best.peak < 999 ? ` (#${E.best.peak})` : '') : null,
      E.scandal ? h('li', null, h('b', null, t(l('Maior escândalo: ', 'Biggest scandal: '))), t(E.scandal)) : null,
      E.pathName ? h('li', null, h('b', null, t(l('Caminho: ', 'Path: '))), t(E.pathName)) : null,
      h('li', null, h('b', null, t(l('Cadeias de história: ', 'Story chains: '))), E.chains.filter((c) => c.n).map((c) => `${t(CHAINS19.find((x) => x.id === c.id)!.name)} ${c.n}/${CHAINS19.find((x) => x.id === c.id)!.steps.length}`).join(' · ') || '—')),
    lost ? h('details', { class: 'card ux19-sec', open: true }, h('summary', null, h('b', null, t(l('Por que perdi?', 'Why did I lose?')))), lossView(g)) : null,
    h('section', { class: 'card ux19-sec' }, h('h4', null, t(fmtL(l('Perfil: {n} partida(s), {a} conquista(s)', 'Profile: {n} run(s), {a} achievement(s)'), { n: pr.runs.length, a: Object.keys(pr.ach).length }))),
      fresh.length ? h('ul', { class: 'ux19-ach' }, fresh.map((k) => h('li', { class: 'good' }, '🏅 ', t(achName(k))))) : h('p', { class: 'small muted' }, t(l('Nenhuma conquista nova nesta partida.', 'No new achievement this run.'))),
      heirs.length ? h('div', null, h('p', { class: 'small' }, t(l('Herança para a próxima partida (opcional, oferecida no 1º mês):', 'Legacy for the next run (optional, offered in month 1):'))),
        h('div', { class: 'row wrap' }, heirs.map((x) => h('button', { class: `btn small ${pr.next === x.id ? 'primary' : ''}`, 'aria-pressed': pr.next === x.id ? 'true' : 'false', title: t(x.desc), onclick: (e: Event) => { setNext(x.id); (e.target as HTMLElement).closest('.row')?.querySelectorAll('button').forEach((b) => { b.classList.remove('primary'); b.setAttribute('aria-pressed', 'false'); }); (e.currentTarget as HTMLElement).classList.add('primary'); (e.currentTarget as HTMLElement).setAttribute('aria-pressed', 'true'); } }, t(x.name))),
          h('button', { class: 'btn small ghost', onclick: () => setNext(null) }, t(l('Nenhuma', 'None'))))) : null));
}
UX19UI.end = (g) => { try { return endBlock(g); } catch { return null; } };

// ---------------------------------------------------------------- Cockpit: metas, quase-falência, menu
registerSection('desk', { id: 'ux19-goals', title: l('Metas da era', 'Era goals'), weight: (s) => (monthsPlayed19(s) < 6 || activeGoals19(s).some((g) => g.due - s.week < 13) ? 52 : 24), when: (s) => activeGoals19(s).length > 0,
  render: (s) => h('section', { class: 'card ux19-sec' }, h('h3', null, '🎯 ', t(l('Metas da era', 'Era goals')), ' ', h('small', { class: 'muted' }, t(eraBand19(s.year).name))),
    h('ul', { class: 'ux19-goals' }, activeGoals19(s).slice(0, 5).map((g) => goalRow(s, g)))) });
registerSection('desk', { id: 'ux19-loss', title: l('Por que o caixa afunda?', 'Why is cash sinking?'), weight: (s) => (nearLoss19(s) ? 88 : 0), when: (s) => nearLoss19(s) && monthsPlayed19(s) >= 3,
  render: (s) => { const C0 = lossCauses19(s); return h('section', { class: 'card ux19-sec ux19-warn' }, h('h3', null, '⚠ ', t(l('Quase falência: as causas', 'Near bankruptcy: the causes'))),
    C0.length ? h('ol', null, C0.map((c) => h('li', null, t(c.t), h('br'), h('small', null, t(l('Ajuda: ', 'Helps: ')), t(c.help))))) : h('p', { class: 'small muted' }, t(l('Sem causa forte: corte custos fixos.', 'No strong cause: cut fixed costs.'))),
    h('button', { class: 'btn small', onclick: () => openLoss19(s) }, t(l('Por que perdi? (detalhes)', 'Why did I lose? (details)')))); } });
registerSection('desk', { id: 'ux19-menu', title: l('Menu e áreas novas', 'Menu and new areas'), weight: 6, when: (s) => lockedAreas19(s).length > 0 && tutAllowed19(store.prefs, 'nav'),
  render: (s) => h('section', { class: 'card ux19-sec' }, h('h3', null, t(l('Menu simples', 'Simple menu'))),
    h('p', { class: 'small' }, t(fmtL(l('{n} áreas avançadas aparecem no menu quando passam a importar (ou com o tempo).', '{n} advanced areas show up in the menu when they start to matter (or with time).'), { n: lockedAreas19(s).length }))),
    navToggle()) });

// ---------------------------------------------------------------- Diário: retrospectiva da década e recibos
const decSel = { d: 0 };
registerSection('diary', { id: 'ux19-dec', order: 55, render: (s) => {
  const ys = sg18(s).years;
  if (!ys.length) return h('section', { class: 'card ux19-sec', id: 'ux19-dec' }, h('h3', null, t(l('Retrospectiva da década', 'Decade retrospective'))), h('p', { class: 'muted small' }, t(l('A primeira retrospectiva sai quando o primeiro ano fechar (dezembro).', 'The first retrospective comes when the first year closes (December).'))));
  const decs = [...new Set(ys.map((x) => Math.floor(x.y / 10) * 10))];
  const d = decs.includes(decSel.d) ? decSel.d : decs[decs.length - 1];
  const yy = ys.filter((x) => Math.floor(x.y / 10) * 10 === d);
  const pm = rv18(s).pm.filter((x) => Math.floor(x.y / 10) * 10 === d);
  const rels = Object.values(s.releases).filter((r) => r.owner === 'player' && Math.floor(r.year / 10) * 10 === d).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const sel = h('select', { 'aria-label': t(l('Década', 'Decade')), onchange: (e: Event) => { decSel.d = Number((e.target as HTMLSelectElement).value); rerender(); } }, decs.map((x) => h('option', { value: String(x), selected: x === d || undefined }, `${x}s`)));
  return h('section', { class: 'card ux19-sec', id: 'ux19-dec' },
    h('div', { class: 'ux19-head' }, h('h3', null, t(l('Retrospectiva da década', 'Decade retrospective'))), sel),
    yearBars(yy.map((x) => ({ y: x.y, a: x.rev, b: x.prof })), l('Receita', 'Revenue'), l('Resultado', 'Result')),
    h('div', { class: 'ux19-kpis' },
      h('div', null, h('small', null, t(l('Lançamentos', 'Releases'))), h('b', null, String(yy.reduce((a, x) => a + x.rels, 0)))),
      h('div', null, h('small', null, t(l('Nº 1', '#1s'))), h('b', null, String(yy.reduce((a, x) => a + x.n1, 0)))),
      h('div', null, h('small', null, t(l('Pós-venda bom / ruim', 'Post-mortems good / bad'))), h('b', null, `${pm.filter((x) => x.tone === 'good').length} / ${pm.filter((x) => x.tone === 'bad').length}`))),
    rels.length ? h('div', null, h('h4', null, t(l('Discos da década', 'Records of the decade'))),
      h('ol', { class: 'ux19-top' }, rels.map((r) => h('li', null, h('b', null, r.title), ` — ${s.acts[r.actId]?.name ?? ''} (${r.year})`, r.peak < 999 ? h('span', { class: 'pill' }, `#${r.peak}`) : null, ' ', h('small', { class: 'muted' }, $(r.revenue))))))
      : h('p', { class: 'muted small' }, t(l('Nenhum disco seu nesta década.', 'None of your records this decade.'))),
    ux19(s).turns.filter((x) => Math.floor(x.y / 10) * 10 === d + 10 || x.y === d).slice(-1).map((T) => h('button', { class: 'btn small', onclick: () => openTurn19(s, T) }, t(l('Rever o cartão da virada', 'Review the turning-point card')), ` (${T.y})`)));
} });
registerSection('diary', { id: 'ux19-rc', order: 56, render: (s) => {
  const R = ux19(s).rc.slice(0, 8);
  return h('section', { class: 'card ux19-sec' }, h('h3', null, '🧾 ', t(l('Recibos de decisão', 'Decision receipts')), ' ', h('small', { class: 'muted' }, `(${pending18(s).length} ${t(l('ecos pendentes', 'pending echoes'))})`)),
    R.length ? h('ul', { class: 'ux19-rcl' }, R.map((r) => h('li', null, receiptEl(s, r)))) : h('p', { class: 'muted small' }, t(l('Suas escolhas nos cartões aparecem aqui, com o que mudaram e o que ainda pode voltar.', 'Your card choices show up here, with what they changed and what may still come back.'))));
} });

// ---------------------------------------------------------------- divulgação progressiva (menu)
const showAll = (): boolean => { if (!tutAllowed19(store.prefs, 'nav')) return true; const p = profile(); return p.all ?? finished(p) >= 1; }; // "Sem tutoriais" = menu completo
function navToggle(): HTMLElement {
  const on = showAll();
  return h('button', { class: 'btn small ghost ux19-navall', 'aria-pressed': on ? 'true' : 'false', onclick: () => { const p = profile(); p.all = !on; saveProfile(p); rerender(); } },
    on ? t(l('Menu simples', 'Simple menu')) : t(l('Mostrar tudo', 'Show everything')));
}
UX19UI.has = (g, a) => showAll() || unlocked19(g, a);
UX19UI.navFoot = (g) => (lockedAreas19(g).length && tutAllowed19(store.prefs, 'nav') ? h('div', { class: 'ux19-navfoot' }, navToggle(), showAll() ? null : h('small', { class: 'muted' }, t(fmtL(l('{n} áreas abrem com o tempo', '{n} areas open over time'), { n: lockedAreas19(g).length })))) : null);

// ---------------------------------------------------------------- após o avanço: viradas, abertura, áreas novas
const seenUn = new WeakMap<GameState, number>();
AFTER_ADVANCE.push((s) => {
  const U = ux19(s);
  const last = seenUn.get(s) ?? s.week - 5;
  const fresh = Object.entries(U.un).filter(([a, w]) => w > last && !showAll() && a).map(([a]) => a);
  seenUn.set(s, s.week);
  if (fresh.length) toast(t(fmtL(l('Nova área no menu: {a}', 'New area in the menu: {a}'), { a: fresh.map((a) => t(EXTRA_AREAS.find((x) => x.id === a)?.label ?? help18(a)?.title ?? l(a, a))).join(', ') })), 'info');
  const T = U.turns.find((x) => !x.seen && x.y <= s.year);
  if (T && !tutAllowed19(store.prefs, 'turn')) { T.seen = 1; toast(`${T.y} — ${t(T.name)}`, 'info'); } // sem tutoriais: virada em uma linha
  else if (T && store.prefs.interrupt23 === 'decisions') { T.seen = 1; toast(`${T.y} — ${t(T.name)}`, 'info'); } // r23: marco sem interromper
  else if (T && store.prefs.cutscenes !== false) setTimeout(() => whenFree(() => { if (!T.seen) openTurn19(s, T); }), 700); // depois do resumo e das cenas do mês
  else if (T) T.seen = 1;
});
// 1º mês: metas de abertura (e herança, se houver) — também ao carregar um jogo novo sem avançar
const openTried = new WeakSet<GameState>();
function tryOpening(): void {
  const s = store.game;
  if (!s || openTried.has(s) || s.ended) return;
  if (ux19(s).os || monthsPlayed19(s) > 3 || (!tutAllowed19(store.prefs, 'opening') && !HEIRS19.some((x) => heirOpen(profile(), x.id)))) { openTried.add(s); return; } // sem tutoriais: só aparece se houver herança a oferecer
  if (busy()) return; // tutorial ou outra janela aberta: tenta de novo depois
  openTried.add(s);
  openingCard(s);
}
AFTER_ADVANCE.push(() => tryOpening());
if (typeof window !== 'undefined') setInterval(() => { if (store.game && !openTried.has(store.game)) tryOpening(); }, 1500);

// ---------------------------------------------------------------- acessibilidade (P10)
if (typeof document !== 'undefined') {
  // setas/Home/End nas abas (role=tab): move e ativa; o foco volta para a aba ativa depois do redesenho
  document.addEventListener('keydown', (e) => {
    const tb = (e.target as HTMLElement)?.closest?.('[role=tab]') as HTMLElement | null;
    if (!tb || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const list = [...(tb.parentElement?.querySelectorAll<HTMLElement>(':scope > [role=tab]') ?? [])];
    const i = list.indexOf(tb);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    const key = tb.closest('[data-tabs]')?.getAttribute('data-tabs');
    const scope = tb.parentElement?.classList[0] ?? 'tabs';
    e.preventDefault();
    list[j]?.click();
    const want = list[j]?.textContent;
    const refocus = (n: number) => {
      const el = [...document.querySelectorAll<HTMLElement>(key ? `[data-tabs="${key}"] [role=tab]` : `.${scope} > [role=tab]`)].find((x) => x.textContent === want);
      if (el && document.activeElement !== el) el.focus();
      if (n < 6) setTimeout(() => refocus(n + 1), 60);
    };
    setTimeout(() => refocus(0), 20);
  });
  // botões só com ícone ganham rótulo acessível (title → aria-label); abas ganham roving tabindex
  let queued = false;
  const fix = () => {
    queued = false;
    for (const b of document.querySelectorAll<HTMLElement>('button:not([aria-label])')) {
      const txt = (b.textContent ?? '').trim();
      if (txt.length <= 2 || !/[\p{L}\p{N}]{2}/u.test(txt)) { const ti = b.getAttribute('title'); if (ti) b.setAttribute('aria-label', ti); }
    }
    for (const tl of document.querySelectorAll<HTMLElement>('[role=tablist]')) {
      const tbs = [...tl.querySelectorAll<HTMLElement>(':scope > [role=tab]')];
      if (tbs.some((x) => x.getAttribute('aria-selected') === 'true')) for (const tb of tbs) tb.tabIndex = tb.getAttribute('aria-selected') === 'true' ? 0 : -1;
    }
  };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(fix); } }).observe(document.documentElement, { childList: true, subtree: true });
}

// verificação no navegador (só com ?debug19 na URL): acesso ao estado para forçar fim de partida/quase falência
if (typeof location !== 'undefined' && location.search.includes('debug19')) (window as unknown as { __vtn19: unknown }).__vtn19 = { store, openLoss19, openTurn19 };
