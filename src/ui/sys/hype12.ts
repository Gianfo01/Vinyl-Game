// Rodada 12 — interface do hype: medidor 0–100 com tendência e "por quê" (artista, lançamento, projeto,
// relíquia, festival), alavancas do jogador na ficha do artista, ranking "Hype" nas paradas e notícias.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { hy, hypeOf, levers, needQ, pendingExpect, ranking, useLever, type Lever } from '../../sim/sys/hype12';
import { relics } from '../../sim/sys/relics9';
import { liveOf } from '../../sim/sys/live/state';
import type { GameState, Release } from '../../sim/types';
import { $, actLink, cityName, genreName, pill, rerender, toast } from '../common';
import { h } from '../dom';
import { registerPageTab, registerTab } from '../registry';
import { ic } from '../vis';

const arrow = (tr: number) => tr >= 2 ? h('span', { class: 'good', title: t(l('subindo', 'rising')) }, `▲${tr}`) : tr <= -2 ? h('span', { class: 'bad', title: t(l('caindo', 'falling')) }, `▼${-tr}`) : h('span', { class: 'muted', title: t(l('estável', 'steady')) }, '▶');
const band = (v: number): [L, string] => v >= 75 ? [l('febre', 'frenzy'), 'bad'] : v >= 50 ? [l('quente', 'hot'), 'gold'] : v >= 25 ? [l('morno', 'warm'), ''] : [l('frio', 'cold'), 'muted'];

/** Medidor de hype com seta de tendência e a lista de motivos. */
export function hypeMeter(s: GameState, key: string, title: L = l('Hype', 'Hype')): HTMLElement {
  const m = hypeOf(s, key);
  const [bn, bc] = band(m.v);
  return h('div', { class: 'hy12' },
    h('div', { class: 'row wrap', style: 'align-items:center;gap:.4rem' }, ic('fire'), h('b', null, t(title)),
      h('span', { class: 'meter-bar mid', style: 'flex:1;min-width:6rem;max-width:14rem' }, h('span', { style: `width:${m.v}%` })),
      h('b', null, String(m.v)), arrow(m.tr), pill(t(bn), bc)),
    m.parts.length ? h('details', { class: 'small' }, h('summary', { class: 'muted' }, t(l('Por quê?', 'Why?'))),
      h('ul', null, m.parts.slice(0, 8).map((p) => h('li', null, h('b', { class: p.v < 0 ? 'bad' : '' }, `${p.v >= 0 ? '+' : ''}${Math.round(p.v)}`), ' ', t(p.t)))),
      h('p', { class: 'muted' }, t(l('Hype é atenção de curto prazo: cai toda semana se ninguém alimentar. Fama é o que fica.', 'Hype is short-term attention: it drops every week unless fed. Fame is what stays.')))) : null);
}

/** Expectativa do próximo lançamento x qualidade do material. */
function expectBox(s: GameState, actId: string): HTMLElement | null {
  const e = pendingExpect(s, actId);
  if (!e) return null;
  const risk = e.exp >= 40 && e.q < e.need - 6, sleeper = e.exp < 22 && e.q >= 80;
  return h('div', { class: `eval ${risk ? 'bad' : sleeper ? 'good' : ''}` },
    hypeMeter(s, `n:${actId}`, l('Expectativa pelo próximo lançamento', 'Anticipation for the next release')),
    h('p', { class: 'small' }, t(l('O público vai esperar qualidade ~{n}; o material está em {q}.', 'The public will expect quality ~{n}; the material is at {q}.'), { n: e.need, q: e.q }), ' ',
      risk ? pill(t(l('risco de reação (bolha)', 'backlash risk (bubble)')), 'bad') : sleeper ? pill(t(l('candidato a sucesso tardio', 'sleeper-hit candidate')), 'good') : pill(t(l('expectativa à altura', 'expectation in line')), 'good')),
    risk ? h('p', { class: 'small muted' }, t(l('Hype maior que o disco: a 1ª semana vende, depois a crítica pesa a mão, as vendas despencam e o artista perde fama e confiança. Embargo segura a 1ª semana; audição revela antes.', 'Hype above the record: week one sells, then critics hit hard, sales dive and the act loses fame and trust. An embargo protects week one; a listening party reveals it early.'))) : null,
    sleeper ? h('p', { class: 'small muted' }, t(l('Disco ótimo sem barulho: vende pouco na estreia, mas cresce no boca a boca por semanas.', 'Great record without noise: small debut, but it grows by word of mouth for weeks.'))) : null);
}

function leverRow(s: GameState, actId: string): HTMLElement | null {
  const ls = levers(s, actId);
  if (!ls.length) return null;
  return h('div', null, h('h4', null, t(l('Alavancas de hype', 'Hype levers'))),
    h('div', { class: 'grid2' }, ls.map((x) => h('div', { class: 'eval' },
      h('div', null, h('b', null, t(x.name)), x.cost ? ' ' : null, x.cost ? pill($(x.cost)) : pill(t(l('grátis', 'free')), 'good')),
      h('p', { class: 'small muted' }, t(x.fx)),
      h('button', { class: 'btn small', disabled: !x.ok, title: x.why ? t(x.why) : '', onclick: () => { toast(t(useLever(s, actId, x.id as Lever)), 'info'); rerender(); } }, x.ok ? t(l('Fazer', 'Do it')) : t(x.why ?? l('Indisponível', 'Unavailable')))))));
}

function newsList(s: GameState, filter?: (k: string) => boolean): HTMLElement | null {
  const log = hy(s).log.filter((x) => !filter || filter(x.k)).slice(0, 10);
  return log.length ? h('ul', { class: 'small' }, log.map((x) => h('li', null, h('span', { class: x.up ? 'good' : 'bad' }, x.up ? '▲ ' : '▼ '), t(x.t), h('small', { class: 'muted' }, ` · ${t(l('sem.', 'wk'))} ${x.w}`)))) : null;
}

registerPageTab('act', {
  id: 'hype12', label: l('Hype', 'Hype'), icon: 'fire', order: 45,
  when: (s, id) => !!s.acts[id],
  render: (s, id) => h('div', null,
    hypeMeter(s, `a:${id}`, l('Hype do artista', 'Artist hype')),
    h('p', { class: 'small muted' }, t(l('Hype sobe com nº 1, prêmios, escândalos, mortes, rixas, capas e campanhas; vira vendas na estreia, ingressos e preço de relíquias. Fama {f} (longo prazo) é outra coisa.', 'Hype rises with number ones, awards, scandals, deaths, feuds, covers and campaigns; it turns into debut sales, tickets and relic prices. Fame {f} (long-term) is something else.'), { f: Math.round(s.acts[id]?.fame ?? 0) })),
    expectBox(s, id), leverRow(s, id), newsList(s, (k) => k.endsWith(id))),
});

/** Ficha do disco: expectativa na estreia e o que ela causou. */
export function relHype12(s: GameState, r: Release): HTMLElement | null {
  const rh = hy(s).rel[r.id];
  if (!rh) return null;
  const out = rh.bl ? pill(t(l('reação ao hype', 'hype backlash')), 'bad') : rh.sl ? pill(t(l('sucesso tardio', 'sleeper hit')), 'good') : pill(t(l('expectativa cumprida', 'met expectations')), '');
  const why = rh.bl ? l('Expectativa {e} pedia qualidade ~{n}; o disco tem {q}. A estreia vendeu, depois a crítica e as vendas caíram rápido.', 'Anticipation {e} called for quality ~{n}; the record is {q}. The debut sold, then critics and sales fell fast.')
    : rh.sl ? l('Saiu com expectativa {e}, mas a qualidade {q} faz o boca a boca crescer por semanas.', 'Came out with anticipation {e}, but quality {q} drives weeks of word of mouth.')
    : l('Expectativa {e} (pedia ~{n}) e qualidade {q}: a estreia converteu o hype em vendas e depois esfriou.', 'Anticipation {e} (called for ~{n}) and quality {q}: the debut turned hype into sales, then cooled.');
  return h('div', { class: 'eval' }, h('div', null, ic('fire'), ' ', h('b', null, t(l('Hype na estreia: {e}', 'Hype at release: {e}'), { e: rh.exp })), ' ', out,
    rh.emb ? pill(t(l('embargo', 'embargo'))) : null, rh.leak ? pill(t(l('vazou', 'leaked'))) : null, rh.party ? pill(t(l('audição', 'listening party'))) : null),
    h('p', { class: 'small muted' }, t(why, { e: rh.exp, n: rh.need || needQ(rh.exp), q: rh.q })));
}

/** Projeto musical: medidor da expectativa do lançamento agendado. */
export const projHype12 = (s: GameState, actId: string): HTMLElement | null => expectBox(s, actId);
export const relicHype12 = (s: GameState, id: string): HTMLElement => hypeMeter(s, `o:${id}`, l('Hype da peça (mexe no preço)', 'Item hype (moves the price)'));
export const festHype12 = (s: GameState, id: string): HTMLElement => hypeMeter(s, `f:${id}`, l('Hype do festival', 'Festival hype'));

// ------------------------------------------------------------------ ranking nas paradas

const CATS: [string, L][] = [['*', l('Tudo', 'All')], ['a', l('Artistas', 'Artists')], ['n', l('Próximos lançamentos', 'Upcoming releases')], ['r', l('Lançamentos', 'Releases')], ['o', l('Relíquias', 'Relics')], ['f', l('Festivais', 'Festivals')], ['t', l('Turnês', 'Tours')], ['l', l('Selos', 'Labels')], ['s', l('Cenas', 'Scenes')]];
let cat = '*';
function label(s: GameState, key: string): HTMLElement | string {
  const [k, id, id2] = key.split(':');
  if (k === 'a') return actLink(s, id);
  if (k === 'n') { const p = s.pendingReleases.find((x) => x.actId === id); return h('span', null, p ? `"${p.title}" · ` : '', actLink(s, id)); }
  if (k === 'r') return h('span', null, `"${s.releases[id]?.title ?? '?'}" · `, actLink(s, s.releases[id]?.actId));
  if (k === 'o') { const rl = relics(s).list.find((x) => x.id === id); return rl ? t(rl.n) : '?'; }
  if (k === 'f') return liveOf(s).fests.find((x) => x.id === id)?.name ?? '?';
  if (k === 't') { const tr = s.tours.find((x) => x.id === id); return h('span', null, `${tr?.name ?? '?'} · `, actLink(s, tr?.actId)); }
  if (k === 'l') return id === 'player' ? s.config.companyName : s.labels[id]?.name ?? '?';
  if (k === 's') return `${genreName(id2)} · ${cityName(id)}`;
  return key;
}
function hypeTab(s: GameState): HTMLElement {
  const rows = ranking(s).filter((x) => cat === '*' || x.cat === cat).slice(0, 25);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Quem está na boca do povo agora. Hype é atenção de curto prazo (diferente de fama e de qualidade): sobe com fatos e campanhas e cai toda semana.', 'Who everyone is talking about right now. Hype is short-term attention (unlike fame and quality): it rises with events and campaigns and falls every week.'))),
    h('div', { class: 'row wrap' }, CATS.map(([k, n]) => h('button', { class: `btn small ${cat === k ? 'primary' : 'ghost'}`, onclick: () => { cat = k; rerender(); } }, t(n)))),
    rows.length ? h('table', { class: 'tbl' }, h('tbody', null, rows.map((x, i) => h('tr', null,
      h('td', null, `${i + 1}`), h('td', null, pill(t(CATS.find((c) => c[0] === x.cat)?.[1] ?? l('?', '?')))), h('td', null, label(s, x.key)),
      h('td', null, h('b', null, String(x.m.v)), ' ', arrow(x.m.tr)), h('td', { class: 'small muted' }, x.m.parts[0] ? t(x.m.parts[0].t) : ''))))) : h('p', { class: 'muted' }, t(l('Ninguém em alta nesta categoria.', 'Nobody hot in this category.'))),
    h('h4', null, t(l('Virais e bolhas', 'Viral moments and bubbles'))), newsList(s) ?? h('p', { class: 'muted small' }, '—'));
}
registerTab('chartsHub', { id: 'hype12', label: l('Hype', 'Hype'), icon: 'fire', order: 56, render: hypeTab });
