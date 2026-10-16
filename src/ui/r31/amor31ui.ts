// R31 · onda 4 (AMOR) — interface do coração (DOM).
//  · askBox31: o pedido "Chamar para sair" de qualquer pessoa, com a chance e cada fator ANTES do clique e o motivo do
//    bloqueio (lockBtn31). Aparece no painel das cenas (interiores, praça), no painel rápido (⚡/clique direito) e na ficha.
//  · amorHeart31: bloco da aba Você › Coração — par e caso com a chave de quem é, laço de mercado, risco do mês por parte,
//    quem sabe, cuidar da discrição, pedido de ajuda do par, encontro em cena, cena da descoberta e "chamar alguém".
//  · cenas: o ENCONTRO (lugar da época) e a DESCOBERTA, no corte em pixel art dos interiores, com você presente.
// Explorar só lê: o motor (sim/sys/amor31) faz tudo na ação.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { rng19 } from '../../sim/rng19';
import type { GameState } from '../../sim/types';
import { fmtL, money } from '../../sim/util';
import { knownPeople31 } from '../../sim/r31/items31';
import { lock31, UNLOCK31, type Lock31 } from '../../sim/r31/lock';
import { energyLeft, goOnDate, life } from '../../sim/sys/life';
import { love17 } from '../../sim/sys/love17';
import { ownerOf } from '../../sim/sys/people/owner';
import {
  TIE31, affairOn31, lastNo31, answerHelp31, askForgive31, askLock31, askMode31, askOdds31, askOn31, askOut31, careLock31, endWith31, forgiveOdds31, heart31, helpLock31, marketOn31, nameOf31,
  romanceLock31, takeCare31, type AskRes31,
} from '../../sim/sys/amor31';
import { $, inspect, modal, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { drawInterior27, geom27, type IDrawOpts27 } from '../pixel/interior27';
import { lookOf } from '../pixel/avatar';
import { C } from '../pixel/px';
import { prim27 } from '../ps/hqpx27';
import { meter } from '../vis';
import { basisTag31, lockBtn31, lockNote31 } from './lock31';
import { registerQuick31, targetExists31 } from './quick31core';
import { sceneView31 } from './scene31';
import { DATE_PLACES31, dateModel31, datePlaces31, foundModel31, type AmorM31, type DatePlace31 } from './amor31model';
import './inside31.css';
import './amor31.css';

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const sg = (v: number): string => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}%`;
const tier = (p: number): L => (p >= 0.6 ? l('alta', 'high') : p >= 0.35 ? l('média', 'medium') : p >= 0.15 ? l('baixa', 'low') : l('quase nenhuma', 'next to none'));
const say = (r: AskRes31 | { ok: boolean; text: L }): void => { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); };
const MODE31: Record<'date' | 'affair' | 'lover', L> = {
  date: l('namoro', 'dating'), affair: l('caso secreto (você é comprometido/a)', 'secret affair (you are taken)'), lover: l('você seria o(a) amante (a pessoa é casada)', 'you would be the lover (they are married)'),
};

// ---------------------------------------------------------------- o pedido

/** Pedido "Chamar para sair" de uma pessoa (chave 'p:<id>', 'l:…', 'c:…', 'e:…'), com a chance e o porquê. */
export function askBox31(s: GameState, key: string, after?: () => void): HTMLElement | null {
  if (!askOn31(s) && !romanceLock31(s, key)) return null;
  const lk = askLock31(s, key);
  const fos = romanceLock31(s, key);
  const o = fos ? null : askOdds31(s, key);
  const label = h('span', null, '♥ ', t(l('Chamar para sair', 'Ask out')), ' ', h('small', null, `⏱ · ${$(money(s, 100))}`));
  const no = lastNo31(s, key);
  return h('div', { class: 'am31-ask' },
    no ? h('p', { class: 'small bad' }, t(fmtL(l('Última resposta: não. Motivo: {w}.', 'Last answer: no. Reason: {w}.'), { w: no }))) : null,
    o ? h('p', { class: 'small' }, pill(t(MODE31[askMode31(s, key)]), askMode31(s, key) === 'date' ? '' : 'warn'), ' ',
      t(fmtL(l('Chance: {p} ({t})', 'Odds: {p} ({t})'), { p: pct(o.p), t: tier(o.p) })), ' ', basisTag31('calc', true)) : null,
    o ? h('details', { class: 'small am31-why' }, h('summary', null, t(l('Por quê (cada fator)', 'Why (each factor)'))),
      h('ul', null, [...o.why].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 9).map(([w, v]) => h('li', { class: v >= 0 ? 'good' : 'bad' }, `${sg(v)} `, t(w))))) : null,
    lockBtn31(label, lk, () => { say(askOut31(s, key)); after?.(); }, { cls: 'btn small primary' }));
}

/** Janela curta com o pedido (painel rápido, cenas sem painel próprio). */
export function openAsk31(s: GameState, key: string): void {
  const box = h('div', { class: 'am31-modal' });
  let close: () => void = () => {};
  const draw = () => box.replaceChildren(h('p', null, h('b', null, nameOf31(s, key))), askBox31(s, key, () => { draw(); }) ?? h('p', { class: 'small muted' }, t(l('Indisponível.', 'Unavailable.'))));
  draw();
  close = modal(t(fmtL(l('Chamar {n} para sair', 'Ask {n} out'), { n: nameOf31(s, key) })), box);
  void close;
}

registerQuick31({
  id: 'q.amor', verb: 'more', icon: 'heart', kinds: ['person'], label: l('Chamar para sair', 'Ask out'),
  applies: (s, tg) => askOn31(s) && targetExists31(s, tg) && !s.persons[tg.id]?.isPlayer && !romanceLock31(s, `p:${tg.id}`),
  lock: (s, tg) => askLock31(s, `p:${tg.id}`),
  dest: () => ({ area: 'personal', tab: 'life-personal/heart17' }),
  run: (s, tg) => openAsk31(s, `p:${tg.id}`),
});

// ---------------------------------------------------------------- pintura das cenas

function seatCol(g: Parameters<NonNullable<IDrawOpts27['extra']>>[0]) { return g.pl.year < 1970 ? [g.pal.wood, g.pal.woodDark] as const : [g.pal.fabric, C('#5a5a62')] as const; }
function paintAmor31(m: AmorM31): NonNullable<IDrawOpts27['extra']> {
  return (g) => {
    const { p, pal } = g;
    const { X, fy, y0 } = geom27(m.W);
    const [c1, c2] = seatCol(g);
    if (m.screen) {
      // tela (luz do projetor) e fileiras de poltronas
      const sx = X(0.26), sw = X(0.76) - sx;
      prim27.blk(p, sx - 2, y0 + 6, sw + 4, 40, C('#3a2a2a'));
      // o filme: céu, sol se pondo, horizonte e um casal em silhueta (preto e branco antes de 1950)
      const bw = m.year < 1950;
      p.rect(sx, y0 + 8, sw, 36, bw ? C('#c8c4b8') : C('#f0b878'));
      p.rect(sx, y0 + 8, sw, 12, bw ? C('#d8d4c8') : C('#f8d8a0'));
      p.ellipse(sx + Math.round(sw * 0.62), y0 + 30, 7, 7, bw ? C('#f0ece0') : C('#fff0c0'));
      p.rect(sx, y0 + 32, sw, 12, bw ? C('#6a665e') : C('#4a6a8a'));
      for (let i = 0; i < sw; i += 6) p.rect(sx + i, y0 + 34 + ((i / 6) % 2), 3, 1, bw ? C('#8a867c') : C('#8ab0d0'));
      const cx = sx + Math.round(sw * 0.36), dk = C('#1a1418');
      p.rect(cx, y0 + 22, 3, 10, dk); p.rect(cx - 0, y0 + 19, 3, 3, dk); p.rect(cx + 4, y0 + 23, 3, 9, dk); p.rect(cx + 4, y0 + 20, 3, 3, dk); p.rect(cx + 2, y0 + 21, 3, 2, dk);
      for (const f of [0.22, 0.3, 0.38, 0.64, 0.72, 0.8, 0.88]) { const x = X(f); prim27.blk(p, x - 4, fy - 9, 9, 3, C('#8a2a2a')); prim27.blk(p, x - 4, fy - 16, 9, 7, C('#a83a3a')); p.vline(x, fy - 6, fy - 1, C('#3a2a2a')); }
    }
    if (m.table !== undefined) {
      const x = X(m.table);
      prim27.blk(p, x - 8, fy - 13, 16, 2, pal.wood); p.vline(x, fy - 11, fy - 1, pal.woodDark); p.hline(x - 3, x + 3, fy - 1, pal.woodDark);
      p.rect(x - 1, fy - 18, 2, 5, C('#f0e8d0')); p.rect(x - 1, fy - 19, 2, 1, C('#ffc040')); // vela
      p.rect(x - 6, fy - 15, 2, 2, C('#c8e0f0')); p.rect(x + 4, fy - 15, 2, 2, C('#c8e0f0')); // taças
    }
    for (const s0 of m.seats) {
      const x = X(s0.x);
      // assento sob o quadril e encosto atrás das costas (fica visível ao lado do corpo)
      const back = s0.dir === 'SE' ? x - 8 : x + 6;
      prim27.blk(p, s0.dir === 'SE' ? x - 8 : x - 2, fy - 8, 10, 2, c1);
      prim27.blk(p, back, fy - 19, 3, 12, c1);
      p.vline(s0.dir === 'SE' ? x - 7 : x - 1, fy - 6, fy - 1, c2); p.vline(s0.dir === 'SE' ? x + 1 : x + 7, fy - 6, fy - 1, c2);
    }
    if (m.letter !== undefined) {
      const x = X(m.letter);
      prim27.blk(p, x - 6, fy - 11, 12, 2, pal.wood); p.vline(x - 4, fy - 9, fy - 1, pal.woodDark); p.vline(x + 4, fy - 9, fy - 1, pal.woodDark);
      p.rect(x - 3, fy - 14, 6, 3, C('#f4f0e4')); p.rect(x - 3, fy - 14, 6, 1, C('#d8d0c0')); p.rect(x, fy - 13, 1, 1, C('#c03030'));
    }
  };
}

function paint(s: GameState, m: AmorM31) {
  return (cv: HTMLCanvasElement) => {
    drawInterior27(cv, m.room, m.people, { minW: m.W, city: s.config.homeCity, name: t(m.title), seed: m.id,
      look: (p) => lookOf((p.pid ? s.persons[p.pid] : undefined) ?? { id: p.pid ?? p.key ?? `npc:${m.id}:${p.name}` }),
      role: (p) => (p.pid ? s.persons[p.pid]?.role : null) ?? null, extra: paintAmor31(m) });
  };
}

// ---------------------------------------------------------------- cena do encontro

const ui31: { place: DatePlace31 } = { place: 'restaurant' };
function dateLock31(s: GameState, place: DatePlace31): Lock31 | null {
  const pt = life(s).partner;
  if (!pt) return lock31(l('Você não está num relacionamento.', 'You are not in a relationship.'), l('Chame alguém para sair primeiro.', 'Ask someone out first.'));
  const d = DATE_PLACES31[place];
  if (energyLeft(s) < d.balls) return lock31(l('Sem tempo livre este mês.', 'No free time left this month.'), UNLOCK31.time);
  if (d.cost && ownerOf(s).wealth < money(s, d.cost)) return lock31(l('Patrimônio pessoal insuficiente (sai do seu bolso).', 'Not enough personal wealth (it comes out of your pocket).'), UNLOCK31.cash);
  return null;
}
function doDate(s: GameState, place: DatePlace31): void {
  const d = DATE_PLACES31[place];
  const r = goOnDate(s, rng19(s, 'act'), d.kind);
  say(r ? { ok: false, text: r } : { ok: true, text: fmtL(l('{l}: noite boa. Afinidade com {p} sobe.', '{l}: a good night. Affinity with {p} goes up.'), { l: d.name(s.year), p: life(s).partner?.name ?? '' }) });
}

function scenePane(s: GameState, m: AmorM31, body: (k: string, arg: string) => HTMLElement | null) {
  const pane = h('div', { class: 'in31-pane', 'aria-live': 'polite' });
  const show = (panel?: string) => {
    if (!panel) { pane.replaceChildren(h('p', { class: 'small muted' }, t(l('Clique numa pessoa ou num objeto.', 'Click a person or an object.')))); return; }
    const [k, arg = ''] = panel.split(':');
    const el = body(k, arg);
    const head = k === 'who' ? m.people[+arg]?.name ?? '' : k === 'you' ? t(l('Você', 'You')) : t(m.spots.find((x) => x.id === 'obj')?.label ?? l('', ''));
    if (el) pane.replaceChildren(h('div', { class: 'row in31-ph' }, h('b', { class: 'small' }, head), h('button', { type: 'button', class: 'icon', 'aria-label': t(l('Fechar', 'Close')), onclick: () => show() }, '✕')), el);
    else show();
  };
  const panels: Record<string, (arg?: string) => void> = {};
  for (const k of ['who', 'you', 'obj']) panels[k] = (arg?: string) => show(arg === undefined ? k : `${k}:${arg}`);
  return { pane, show, panels };
}

/** O encontro em cena (lugar da época), com você e o par. */
export function dateView31(s: GameState, redraw: () => void): HTMLElement {
  const places = datePlaces31(s.year);
  if (!places.includes(ui31.place)) ui31.place = places[0];
  const m = dateModel31(s, ui31.place);
  const d = DATE_PLACES31[ui31.place];
  const pt = life(s).partner;
  const go = () => h('div', { class: 'row wrap' }, lockBtn31(t(fmtL(l('Ter o encontro aqui ({c})', 'Have the date here ({c})'), { c: d.cost ? $(money(s, d.cost)) : t(l('grátis', 'free')) })), dateLock31(s, ui31.place), () => { doDate(s, ui31.place); redraw(); }, { cls: 'btn small primary' }));
  const { pane, show, panels } = scenePane(s, m, (k, arg) => {
    if (k === 'obj') return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(d.tip)), go());
    if (k === 'you') return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(pt ? fmtL(l('Você e {p} em: {l}.', 'You and {p} at: {l}.'), { p: pt.name, l: d.name(s.year) }) : l('Você, sozinho(a).', 'You, alone.'))));
    const p = m.people[+arg];
    if (!p) return null;
    if (!p.you && pt && p.name === pt.name) return h('div', { class: 'in31-pn' }, meter('heart', l('Afinidade', 'Affinity'), pt.affinity), h('p', { class: 'small muted' }, t(p.role)), go(),
      p.pid ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => inspect.person(p.pid!) }, t(l('Ver a ficha', 'See the card'))) : null);
    return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(p.role)), p.pid ? askBox31(s, `p:${p.pid}`, redraw) : null);
  });
  const tools = h('div', { class: 'row wrap sc31-seg am31-places', role: 'group', 'aria-label': t(l('Lugar do encontro', 'Date place')) },
    places.map((k) => h('button', { type: 'button', class: 'btn small ghost', 'aria-pressed': k === ui31.place ? 'true' : 'false', onclick: () => { ui31.place = k; redraw(); } }, t(DATE_PLACES31[k].name(s.year)))));
  const scene = sceneView31(s, {
    id: 'amor31-date', title: m.title, W: m.W, H: m.H, spots: m.spots, panels, paint: paint(s, m), tools,
    list: () => h('ul', { class: 'in31-list' }, m.spots.map((sp) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => show(sp.go.panel) }, t(sp.label)), ' ', h('small', { class: 'muted' }, t(sp.tip))))),
    intro: l('Escolha o lugar (os da época) e clique no par ou na mesa para ter o encontro. Cada pessoa gosta de um tipo de programa.', 'Pick the place (those of the era) and click your partner or the table to have the date. Each person likes a kind of outing.'),
    legend: h('p', { class: 'small in31-trail' }, t(m.what)),
  });
  show(pt ? `who:1` : undefined);
  return h('div', { class: 'c2-in in31 in31-inline am31' }, h('div', { class: 'in31-body' }, scene, pane));
}

/** A descoberta em cena: o par, a prova e o que fazer. */
export function foundView31(s: GameState, redraw: () => void): HTMLElement | null {
  const H = heart31(s);
  if (!H.last) return null;
  const m = foundModel31(s, H.last.who);
  const pt = life(s).partner;
  const { pane, show, panels } = scenePane(s, m, (k) => {
    if (k === 'obj') return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(fmtL(l('A prova do caso com {c}. A imprensa da época: {p}.', 'Proof of the affair with {c}. The era\'s press: {p}.'), { c: H.last!.who, p: H.press }))));
    if (k === 'you') return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(l('Não adianta negar: está tudo em cima da mesa.', 'No point denying it: it is all on the table.'))));
    if (!pt) return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(l('Seu par já foi embora.', 'Your partner has already left.'))));
    const f = forgiveOdds31(s);
    return h('div', { class: 'in31-pn' }, meter('heart', l('Afinidade', 'Affinity'), pt.affinity),
      h('p', { class: 'small' }, t(fmtL(l('Chance de perdão: {p} ({t})', 'Chance of forgiveness: {p} ({t})'), { p: pct(f.p), t: tier(f.p) })), ' ', basisTag31('calc', true)),
      h('ul', { class: 'small' }, f.why.map(([w, v]) => h('li', { class: v >= 0 ? 'good' : 'bad' }, `${sg(v)} `, t(w)))),
      h('div', { class: 'row wrap' }, lockBtn31(t(l('Pedir perdão', 'Ask for forgiveness')), energyLeft(s) < 1 ? lock31(l('Sem tempo livre este mês.', 'No free time left this month.'), UNLOCK31.time) : null, () => { say(askForgive31(s)); redraw(); }, { cls: 'btn small primary' })),
      pt.stage === 'married' ? h('p', { class: 'small muted' }, t(l('Se não houver volta: divórcio (amigável ou na justiça) logo abaixo, com a partilha do seu bolso.', 'If there is no way back: divorce (amicable or in court) just below, with the split of your pocket.'))) : null);
  });
  const scene = sceneView31(s, {
    id: 'amor31-found', title: m.title, W: m.W, H: m.H, spots: m.spots, panels, paint: paint(s, m),
    list: () => h('ul', { class: 'in31-list' }, m.spots.map((sp) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => show(sp.go.panel) }, t(sp.label)), ' ', h('small', { class: 'muted' }, t(sp.tip))))),
    intro: l('Seu par descobriu. Clique nele para pedir perdão (a chance aparece antes) ou na prova para ver o que vazou.', 'Your partner found out. Click them to ask for forgiveness (the odds show first) or the evidence to see what leaked.'),
    legend: h('p', { class: 'small in31-trail' }, t(m.what)),
  });
  show('who:1');
  return h('div', { class: 'c2-in in31 in31-inline am31' }, h('div', { class: 'in31-body' }, scene, pane));
}

// ---------------------------------------------------------------- ficha Coração

let showDate = false;
/** Bloco "Amor no mundo" da aba Você › Coração. */
export function amorHeart31(s: GameState): HTMLElement | null {
  if (!askOn31(s) && !affairOn31(s) && !marketOn31(s)) return null;
  const H = heart31(s);
  const L0 = life(s), L7 = love17(s);
  const pt = L0.partner, a = L7.affair;
  const who = (key: string | undefined, name: string) => (key?.startsWith('p:') ? h('button', { type: 'button', class: 'link', onclick: () => inspect.person(key.slice(2)) }, name) : h('b', null, name));
  const box = h('div', { class: 'am31-heart' });
  const draw = () => box.replaceChildren(...blocks().filter((x): x is HTMLElement => !!x));
  const redraw = () => { draw(); rerender(); };
  const blocks = (): (HTMLElement | null)[] => [
    section(t(l('Amor no mundo', 'Love in the world')),
      h('p', { class: 'small muted' }, t(l('Dá para chamar para sair qualquer pessoa adulta: pela ficha dela, pelo menu ⚡ (clique direito) ou clicando nela numa cena. A resposta é a conta mostrada antes do clique; recusa diz o motivo.', 'You can ask any adult out: from their card, the ⚡ menu (right click) or by clicking them in a scene. The answer is the odds shown before the click; a refusal says why.'))),
      pt ? h('div', { class: 'am31-row' },
        h('p', null, t(l('Par: ', 'Partner: ')), who(H.pk, pt.name), ' ', H.ptie ? pill(t(TIE31[H.ptie]), 'warn') : null, L7.pm ? pill(t(l('casado(a) com outra pessoa — você é o(a) amante', 'married to someone else — you are the lover')), 'warn') : null),
        H.ptie ? h('p', { class: 'small' }, t(l('Romance com gente do mercado: abre informação (um segredo do outro lado vira trunfo seu), mas sócios, banda e imprensa desconfiam; término ruim vira rixa.', 'Romance with market people: opens information (a secret from the other side becomes your leverage), but partners, band and press grow suspicious; a bad breakup becomes a feud.'))) : null,
        H.req && s.acts[H.req.act] ? h('div', { class: 'am31-req' },
          h('p', { class: 'small' }, '★ ', t(fmtL(l('{p} pede uma força para a carreira de {a}: apresentar a quem importa e pagar a divulgação.', '{p} asks for a hand with {a}\'s career: introductions and paid promotion.'), { p: pt.name, a: s.acts[H.req.act].name }))),
          h('div', { class: 'row wrap' }, lockBtn31(t(fmtL(l('Ajudar ({v})', 'Help ({v})'), { v: $(money(s, 2000)) })), helpLock31(s), () => { say(answerHelp31(s, true)); }, { cls: 'btn small primary' }),
            h('button', { type: 'button', class: 'btn small', onclick: () => say(answerHelp31(s, false)) }, t(l('Agora não dá', 'Not now'))))) : null,
        h('div', { class: 'row wrap' },
          h('button', { type: 'button', class: 'btn small', 'aria-expanded': showDate ? 'true' : 'false', onclick: () => { showDate = !showDate; redraw(); } }, '♥ ', t(showDate ? l('Fechar a cena do encontro', 'Close the date scene') : l('Encontro em cena', 'Date scene'))),
          pt.stage !== 'married' ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => say(endWith31(s, 'partner')) }, t(l('Terminar', 'Break up'))) : null),
        showDate ? dateView31(s, redraw) : null)
        : h('p', { class: 'small' }, t(l('Sem par agora.', 'No partner right now.'))),
      a ? h('div', { class: 'am31-row' },
        h('p', null, t(l('Caso: ', 'Affair: ')), who(H.ak, a.name), ' ', H.atie ? pill(t(TIE31[H.atie]), 'warn') : null, ' ',
          pill(t(fmtL(l('risco {r}/mês', 'risk {r}/mo'), { r: pct(H.risk) })), H.risk > 0.08 ? 'bad' : 'warn'), ' ', basisTag31('calc')),
        H.parts.length ? h('ul', { class: 'small' }, H.parts.map(([w, v]) => h('li', { class: v > 0 ? 'bad' : 'good' }, `${sg(v)} `, t(w)))) : null,
        h('p', { class: 'small' }, h('b', null, t(l('Quem sabe: ', 'Who knows: '))), H.knows.length ? H.knows.map((k, i) => h('span', null, i ? ', ' : '', k.name, k.gossip ? ` (${t(l('fofoqueiro/a', 'gossip'))})` : '')) : t(l('só vocês dois (por enquanto).', 'only the two of you (for now).'))),
        h('div', { class: 'row wrap' }, lockBtn31(t(fmtL(l('Cuidar da discrição ({v}, 3 meses)', 'Take care of discretion ({v}, 3 months)'), { v: $(money(s, 800)) })), careLock31(s), () => say(takeCare31(s))),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => say(endWith31(s, 'affair')) }, t(l('Terminar o caso', 'End the affair'))))) : null,
      H.last ? h('div', { class: 'am31-row' }, h('p', { class: 'small bad' }, t(fmtL(l('{p} descobriu o caso com {c}.', '{p} found out about the affair with {c}.'), { p: H.last.partner, c: H.last.who }))), foundView31(s, redraw)) : null),
    askOn31(s) ? section(t(l('Chamar alguém para sair', 'Ask someone out')), pickList(s, redraw)) : null,
    H.log.length ? h('details', { class: 'small' }, h('summary', null, t(l('Histórico do amor no mundo', 'Love-in-the-world history'))), h('ul', null, H.log.slice(0, 10).map(([y, x]) => h('li', null, h('span', { class: 'muted' }, `${y} · `), t(x))))) : null,
  ];
  draw();
  return box;
}

/** Conhecidos (ordem por nome), com a chance e o pedido em uma linha. */
function pickList(s: GameState, redraw: () => void): HTMLElement {
  const H = heart31(s);
  const ids = knownPeople31(s, 40).filter((id) => !romanceLock31(s, `p:${id}`) && s.year - (s.persons[id]?.born ?? s.year) >= 18 && `p:${id}` !== H.pk && `p:${id}` !== H.ak).slice(0, 10);
  if (!ids.length) return h('p', { class: 'small muted' }, t(l('Você ainda não conhece ninguém de perto: vá a uma festa, a um bar ou a uma casa de shows (Mundo › cidade) e converse.', 'You don\'t know anyone closely yet: go to a party, a bar or a venue (World › city) and talk.')));
  // quando todos travam pelo mesmo motivo (sem tempo, já tem um caso…), o motivo aparece uma vez em cima
  const locks = ids.map((id) => askLock31(s, `p:${id}`));
  const same = locks.length && locks.every((x) => x && x.why.pt === locks[0]!.why.pt) ? locks[0] : null;
  return h('div', null, same ? lockNote31(same) : null, h('ul', { class: 'am31-pick' }, ids.map((id) => {
    const key = `p:${id}`;
    const o = askOdds31(s, key);
    return h('li', null, h('button', { type: 'button', class: 'link', onclick: () => inspect.person(id) }, s.persons[id].name), ' ',
      h('small', { class: 'muted' }, `${s.year - s.persons[id].born} ${t(l('anos', 'yrs'))} · ${t(fmtL(l('chance {p}', 'odds {p}'), { p: pct(o.p) }))}`), ' ',
      lockBtn31(t(l('♥ Chamar', '♥ Ask')), askLock31(s, key), () => { say(askOut31(s, key)); redraw(); }, { compact: true }));
  })));
}
