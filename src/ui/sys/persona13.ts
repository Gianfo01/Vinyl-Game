// Rodada 13 — ficha unificada (interface): o mesmo bloco de atributos para qualquer pessoa — artistas, você,
// líderes rivais, equipe, críticos e mídia — com opinião sobre você (e por quê), barreiras históricas da
// época e ações (presente, favor, elogio, crítica pública, declaração política).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { viewsLabel } from '../../sim/beliefs';
import {
  ATTR13, ATTR13_IDS, GIFT_COST, JOBS13, SEX13, SKIN13, askFavor, barriers13, facetName, favorBlock, giftBlock, imageWeight, labelNeg, negotiatorOf,
  opinionOf, ownerBarrier, p13, per13, politicalStatement, publicStatement, sendGift, staffAdj13, type Barrier13,
} from '../../sim/sys/persona13';
import type { Act, GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, modal, pill, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { store } from '../store';

const tone = (v: number) => (v >= 65 ? 'good' : v <= 35 ? 'bad' : '');
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;

function barrierList(bs: Barrier13[]): HTMLElement | null {
  if (!bs.length) return null;
  return h('ul', { class: 'small' }, bs.map((b) => h('li', null,
    pill(`${b.m >= 1 ? '+' : '−'}${Math.abs(Math.round((b.m - 1) * 1000) / 10)}%`, b.m >= 1 ? 'good' : 'bad'), ' ', t(b.why),
    b.niche ? h('div', { class: 'muted' }, '↳ ', t(b.niche)) : null,
    b.fought ? h('div', { class: 'muted' }, '↳ ', t(b.fought)) : null)));
}

/** Bloco da ficha unificada para qualquer chave de pessoa (ver per13). */
export function ficha13(s: GameState, key: string, redraw?: () => void): HTMLElement {
  const P = per13(s, key);
  if (!P) return h('p', { class: 'muted small' }, '—');
  const self = P.kind === 'player';
  const op = self ? null : opinionOf(s, key === 'player' ? key : P.key);
  const led = p13(s).op[P.key];
  const say = (msg: L) => { toast(t(msg), 'info'); redraw?.(); rerender(); };
  const jobs = JOBS13.map((j) => ({ ...j, v: P.prof[j.id] ?? 0 })).sort((a, b) => b.v - a.v);
  const staff = P.kind === 'staff' ? s.player.staff.find((x) => `s:${x.id}` === P.key) : undefined;
  const adj = staff ? staffAdj13(s, staff) : null;
  const act: Act | undefined = P.kind === 'person' || P.kind === 'player' ? Object.values(s.acts).find((a) => a.members.includes(P.key.slice(2))) : undefined;
  const iw = imageWeight(s.year);
  const ob = self ? ownerBarrier(s) : null;
  return h('div', { class: 'p13' },
    h('div', { class: 'grid2' },
      h('div', null,
        h('h4', null, t(l('Atributos', 'Attributes'))),
        h('ul', { class: 'attr-list' }, ATTR13_IDS.map((k) => h('li', { title: t(ATTR13[k][1]) }, h('span', null, t(ATTR13[k][0])), bar(P.attrs[k], 100, tone(P.attrs[k])), h('b', null, P.attrs[k])))),
        self ? h('p', { class: 'small muted' }, t(l('Negociação efetiva do selo (com jurídico/empresário): {v}.', 'Label\'s effective negotiation (with legal/manager): {v}.'), { v: labelNeg(s) })) : null,
        h('h4', null, t(l('Personalidade', 'Personality'))),
        P.native.length ? h('p', null, P.native.map((x) => pill(t(x), 'trait'))) : null,
        P.traits.length ? h('ul', { class: 'small' }, P.traits.map((x) => h('li', null, t(facetName(x.k, x.hi))))) : h('p', { class: 'muted small' }, t(l('Equilibrado, difícil de decifrar.', 'Balanced, hard to read.'))),
        h('p', { class: 'small' }, h('b', null, t(l('Política e fé: ', 'Politics and faith: '))), t(viewsLabel(P.views)), ` · ${t(l('engajamento', 'engagement'))} ${Math.round(P.views.eng)}`),
      ),
      h('div', null,
        h('h4', null, t(l('Aptidão para cargos', 'Role proficiency'))),
        h('ul', { class: 'attr-list' }, jobs.slice(0, 5).map((j) => h('li', null, h('span', null, t(j.name), j.id === P.job ? ' ★' : ''), bar(j.v, 100, tone(j.v)), h('b', null, j.v)))),
        h('details', null, h('summary', { class: 'small muted' }, t(l('Todos os cargos', 'All roles'))),
          h('ul', { class: 'attr-list small' }, jobs.slice(5).map((j) => h('li', null, h('span', null, t(j.name), j.id === P.job ? ' ★' : ''), bar(j.v, 100), h('b', null, j.v))))),
        adj ? h('p', { class: 'small' }, t(l('Desempenho efetivo no cargo: {b} {d} = {v}', 'Effective performance in role: {b} {d} = {v}'), { b: staff!.skill, d: signed(adj.v), v: staff!.skill + adj.v }),
          adj.why.length ? h('span', { class: 'muted' }, ` (${adj.why.map((x) => t(x)).join('; ')})`) : null) : null,
        h('h4', null, t(l('Aparência e época', 'Looks and era'))),
        h('p', { class: 'small' }, `${t(SEX13[P.sex])} · ${t(SKIN13[P.skin] ?? SKIN13[0])} · ${t(l('imagem', 'image'))} ${P.attrs.img}`),
        h('p', { class: 'small muted' }, t(l('Na {e}, o visual vale {w}% do alcance para cada 10 pontos de imagem acima ou abaixo de 50.', 'In the {e}, looks are worth {w}% of reach per 10 image points above or below 50.'), { e: t(iw.era), w: Math.round(iw.w * 20 * 10) / 10 })),
        act ? barrierList(barriers13(s, act)) : null,
        ob ? barrierList([ob]) : null,
        act || ob ? h('p', { class: 'small muted' }, t(l('Barreiras são da época e do país, não da pessoa: diminuem com as décadas, e você pode enfrentá-las quando surgirem (eventos).', 'Barriers belong to the era and country, not the person: they ease over the decades, and you can fight them when they come up (events).'))) : null,
      ),
    ),
    op === null ? null : section(t(l('O que pensa de você', 'What they think of you')),
      h('p', null, pill(signed(op), op >= 15 ? 'good' : op <= -15 ? 'bad' : ''), ' ', h('span', { class: 'small muted' }, t(l('(−100 a +100; a personalidade amplia ou suaviza cada gesto)', '(−100 to +100; personality amplifies or softens each gesture)')))),
      led?.w.length ? h('ul', { class: 'small' }, [...led.w].reverse().map(([y, m, d, w]) => h('li', { class: d >= 0 ? 'good' : 'bad' }, `${signed(d)} · ${m + 1}/${y} — `, t(w)))) : h('p', { class: 'muted small' }, t(l('Nada marcante entre vocês ainda.', 'Nothing notable between you yet.'))),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', disabled: !!giftBlock(s, P.key), title: t(giftBlock(s, P.key) ?? l('Agrada mais quem é vaidoso ou mão-fechada.', 'Pleases the vain and the stingy most.')), onclick: () => say(sendGift(s, P.key)) }, `${t(l('Presente', 'Gift'))} · ${$(money(s, GIFT_COST))}`),
        h('button', { class: 'btn small', disabled: !!favorBlock(s, P.key), title: t(favorBlock(s, P.key) ?? l('Gasta boa vontade por um ganho imediato.', 'Spends goodwill for an immediate gain.')), onclick: () => say(askFavor(s, P.key)) }, t(l('Pedir favor', 'Ask a favor'))),
        h('button', { class: 'btn small ghost', onclick: () => say(publicStatement(s, P.key, true)) }, t(l('Elogiar em público', 'Praise publicly'))),
        h('button', { class: 'btn small ghost', onclick: () => say(publicStatement(s, P.key, false)) }, t(l('Criticar em público', 'Criticize publicly'))),
      ),
      h('p', { class: 'small muted' }, t(l('Também mexem na opinião: dispensar ou contratar ex-artistas de rivais, aliciar, processar, atrasar salários, quebrar promessas, vender masters, ganhar prêmios em cima deles e suas posições políticas.', 'Opinion also moves with: dropping acts or signing rivals\' ex-acts, poaching, lawsuits, late salaries, broken promises, selling masters, beating them at awards and your political stances.'))),
    ),
    self ? h('div', { class: 'row wrap' }, h('button', { class: 'btn small', title: t(l('Quem pensa como você se aproxima; quem discorda se afasta (pesa mais em quem é engajado).', 'Like-minded people come closer; those who disagree drift away (more so for the engaged).')), onclick: () => say(politicalStatement(s)) }, t(l('Fazer declaração política', 'Make a political statement')))) : null,
  );
}

export function openFicha13(key: string, title?: string): void {
  const s = store.game;
  if (!s) return;
  const P = per13(s, key);
  if (!P) return;
  const box = h('div');
  const draw = () => box.replaceChildren(ficha13(s, key, draw));
  draw();
  modal(title ?? P.name, box, { wide: true });
}

export const ficha13Btn = (key: string, label: L = l('Ficha', 'Profile')): HTMLElement =>
  h('button', { class: 'btn small ghost', onclick: (e: Event) => { e.stopPropagation(); openFicha13(key); } }, t(label));

/** Linha para o dossiê/oferta: quem negocia pelo ato e as barreiras da época. */
export function actNegLine(s: GameState, a: Act): HTMLElement | null {
  const ng = negotiatorOf(s, a);
  if (!ng) return null;
  const bs = barriers13(s, a).filter((b) => b.k !== 'img');
  return h('div', { class: 'small' },
    t(l('Quem negocia: {n} (negociação {v}) · você: {m}', 'Negotiator: {n} (negotiation {v}) · you: {m}'), { n: ng.p.name, v: ng.neg, m: labelNeg(s) }), ' ', ficha13Btn(`p:${ng.p.id}`),
    bs.length ? barrierList(bs) : null);
}
