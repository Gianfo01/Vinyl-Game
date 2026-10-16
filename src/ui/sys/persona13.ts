// Rodada 13 — ficha unificada (interface): o mesmo bloco de atributos para qualquer pessoa — artistas, você,
// líderes rivais, equipe, críticos e mídia — com opinião sobre você (e por quê), barreiras históricas da
// época e ações (presente, favor, elogio, crítica pública, declaração política).

import { attrWidth, band, bandText, seen } from '../../sim/know';
import { meNode31, node31, tie31 } from '../../sim/social31';
import { askIntro31, howMet31, introVia31, knowsMe31, nodeName31, tieLabel31 } from '../../sim/sys/social31sys';
import { opinionWhy } from '../../sim/opinion';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { viewsLabel } from '../../sim/beliefs';
import {
  ATTR13, ATTR13_IDS, GIFT_COST, JOBS13, SEX13, SKIN13, askFavor, barriers13, facetName, favorBlock, giftBlock, imageWeight, labelNeg, negotiatorOf,
  opinionOf, ownerBarrier, per13, politicalStatement, publicStatement, sendGift, staffAdj13, type Barrier13,
} from '../../sim/sys/persona13';
import type { Act, GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, modal, pill, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { store } from '../store';
import { HINT15, canSee, knownLevel } from '../../sim/sys/fame15';
import { personRoute16 } from '../route16';
import { openFavors27 } from '../act27/favors27';
import { favorAct27 } from '../act27/flow27p2'; // r27 FLOW2: presente e pedir favor abrem a conversa de favor (rápido dentro)
import { actMode27 } from '../act27/prefs27';
import { lookBlock31 } from '../r31/look31ui'; // R31 · AP: aparência guardada (forma, estilo, marcas, segredos) e cuidados

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
  const led = { w: opinionWhy(s, P.key) };
  const say = (msg: L) => { toast(t(msg), 'info'); redraw?.(); rerender(); };
  const jobs = JOBS13.map((j) => ({ ...j, v: P.prof[j.id] ?? 0 })).sort((a, b) => b.v - a.v);
  const staff = P.kind === 'staff' ? s.player.staff.find((x) => `s:${x.id}` === P.key) : undefined;
  const adj = staff ? staffAdj13(s, staff) : null;
  const act: Act | undefined = P.kind === 'person' || P.kind === 'player' ? Object.values(s.acts).find((a) => a.members.includes(P.key.slice(2))) : undefined;
  const iw = imageWeight(s.year);
  const ob = self ? ownerBarrier(s) : null;
  // rodada 15: atributos e personalidade são privados — olheiros/relação (pessoas) ou convivência (indústria)
  const pid = P.kind === 'person' ? P.key.slice(2) : '';
  const kl = pid ? knownLevel(s, pid) : null;
  // r31 (W0-KN): largura e faixa vêm do sim (know.ts); a faixa nunca é centrada no valor real
  const w13 = kl?.mine ? 0 : attrWidth(s, P.key, P.kind, Math.abs(op ?? 0) >= 15 || led.w.length > 0);
  const sh = (v: number, f: string): string => bandText(band(s, P.key, `attrs.${f}`, v, w13));
  const seeTraits = !pid || !!kl?.mine || canSee(s, pid, 'traits') || (!kl && w13 <= 6);
  const seeViews = !pid || seen(s, pid, 'beliefs'); // r31 F #13: a mesma regra da ficha e dos integrantes
  const knows = self ? 'met' : knowsMe31(s, P.key); // r31 F #24: quem nunca te viu não tem número
  return h('div', { class: 'p13' },
    h('div', { class: 'grid2' },
      h('div', null,
        h('h4', null, t(l('Atributos', 'Attributes'))),
        h('ul', { class: 'attr-list' }, ATTR13_IDS.map((k) => h('li', { title: t(ATTR13[k][1]) }, h('span', null, t(ATTR13[k][0])), w13 ? null : bar(P.attrs[k], 100, tone(P.attrs[k])), h('b', null, sh(P.attrs[k], k))))),
        w13 ? h('p', { class: 'small muted' }, t(w13 >= 99 ? HINT15 : l('Faixas = o que você estima; olheiros, reuniões e relação próxima estreitam.', 'Ranges = your estimate; scouts, meetings and a close relationship narrow them.'))) : null,
        self ? h('p', { class: 'small muted' }, t(l('Negociação efetiva do selo (com jurídico/empresário): {v}.', 'Label\'s effective negotiation (with legal/manager): {v}.'), { v: labelNeg(s) })) : null,
        h('h4', null, t(l('Personalidade', 'Personality'))),
        !seeTraits ? h('p', { class: 'muted small' }, t(HINT15)) : P.native.length ? h('p', null, P.native.map((x) => pill(t(x), 'trait'))) : null,
        !seeTraits ? null : P.traits.length ? h('ul', { class: 'small' }, P.traits.map((x) => h('li', null, t(facetName(x.k, x.hi))))) : h('p', { class: 'muted small' }, t(l('Equilibrado, difícil de decifrar.', 'Balanced, hard to read.'))),
        h('p', { class: 'small' }, h('b', null, t(l('Política e fé: ', 'Politics and faith: '))), seeViews ? `${t(viewsLabel(P.views))} · ${t(l('engajamento', 'engagement'))} ${Math.round(P.views.eng)}` : '?'),
      ),
      h('div', null,
        h('h4', null, t(l('Aptidão para cargos', 'Role proficiency'))),
        h('ul', { class: 'attr-list' }, jobs.slice(0, 5).map((j) => h('li', null, h('span', null, t(j.name), j.id === P.job ? ' ★' : ''), w13 ? null : bar(j.v, 100, tone(j.v)), h('b', null, sh(j.v, `job.${j.id}`))))),
        h('details', null, h('summary', { class: 'small muted' }, t(l('Todos os cargos', 'All roles'))),
          h('ul', { class: 'attr-list small' }, jobs.slice(5).map((j) => h('li', null, h('span', null, t(j.name), j.id === P.job ? ' ★' : ''), w13 ? null : bar(j.v, 100), h('b', null, sh(j.v, `job.${j.id}`)))))),
        adj ? h('p', { class: 'small' }, t(l('Desempenho efetivo no cargo: {b} {d} = {v}', 'Effective performance in role: {b} {d} = {v}'), { b: staff!.skill, d: signed(adj.v), v: staff!.skill + adj.v }),
          adj.why.length ? h('span', { class: 'muted' }, ` (${adj.why.map((x) => t(x)).join('; ')})`) : null) : null,
        h('h4', null, t(l('Aparência e época', 'Looks and era'))),
        h('p', { class: 'small' }, `${t(SEX13[P.sex])} · ${t(SKIN13[P.skin] ?? SKIN13[0])} · ${t(l('imagem', 'image'))} ${w13 ? sh(P.attrs.img, 'img') : P.attrs.img}`), // r31 F #24: imagem também em faixa
        h('p', { class: 'small muted' }, t(l('Na {e}, o visual vale {w}% do alcance para cada 10 pontos de imagem acima ou abaixo de 50.', 'In the {e}, looks are worth {w}% of reach per 10 image points above or below 50.'), { e: t(iw.era), w: Math.round(iw.w * 20 * 10) / 10 })),
        act ? barrierList(barriers13(s, act)) : null,
        ob ? barrierList([ob]) : null,
        lookBlock31(s, P.key, redraw),
        act || ob ? h('p', { class: 'small muted' }, t(l('Barreiras são da época e do país, não da pessoa: diminuem com as décadas, e você pode enfrentá-las quando surgirem (eventos).', 'Barriers belong to the era and country, not the person: they ease over the decades, and you can fight them when they come up (events).'))) : null,
      ),
    ),
    self ? null : relation31(s, P.key, redraw),
    op === null ? null : section(t(l('O que pensa de você', 'What they think of you')),
      knows === 'none' ? h('p', null, pill(t(l('Não te conhece', 'Does not know you')), ''), ' ', h('span', { class: 'small muted' }, t(l('Nunca cruzou com você nem ouviu falar o bastante para ter opinião.', 'Has never met you nor heard enough to have an opinion.'))))
        : knows === 'name' ? h('p', null, pill(t(l('Conhece de nome', 'Knows you by name')), ''), ' ', pill(t(op >= 15 ? l('impressão boa', 'good impression') : op <= -15 ? l('impressão ruim', 'bad impression') : l('sem opinião formada', 'no opinion yet')), op >= 15 ? 'good' : op <= -15 ? 'bad' : ''), ' ', h('span', { class: 'small muted' }, t(l('(pelo que saiu nas notícias; ainda não houve contato)', '(from the news; no contact yet)'))))
        : h('p', null, pill(signed(op), op >= 15 ? 'good' : op <= -15 ? 'bad' : ''), ' ', h('span', { class: 'small muted' }, t(l('(−100 a +100; a personalidade amplia ou suaviza cada gesto)', '(−100 to +100; personality amplifies or softens each gesture)')))),
      led?.w.length ? h('ul', { class: 'small' }, [...led.w].reverse().map(([y, m, d, w]) => h('li', { class: d >= 0 ? 'good' : 'bad' }, knows === 'met' ? `${signed(d)} · ${m + 1}/${y} — ` : `${m + 1}/${y} — `, t(w)))) : knows === 'none' ? null : h('p', { class: 'muted small' }, t(l('Nada marcante entre vocês ainda.', 'Nothing notable between you yet.'))),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', disabled: !!giftBlock(s, P.key), title: t(giftBlock(s, P.key) ?? l('Agrada mais quem é vaidoso ou mão-fechada.', 'Pleases the vain and the stingy most.')), onclick: () => favorAct27(s, P.key, 'gift', () => say(sendGift(s, P.key))) }, `${t(l('Presente', 'Gift'))} · ${$(money(s, GIFT_COST))}`),
        h('button', { class: 'btn small', disabled: !!favorBlock(s, P.key), title: t(favorBlock(s, P.key) ?? l('Gasta boa vontade por um ganho imediato.', 'Spends goodwill for an immediate gain.')), onclick: () => favorAct27(s, P.key, 'ask', () => say(askFavor(s, P.key))) }, t(l('Pedir favor', 'Ask a favor'))),
        h('button', { class: 'btn small ghost', onclick: () => say(publicStatement(s, P.key, true)) }, t(l('Elogiar em público', 'Praise publicly'))),
        h('button', { class: 'btn small ghost', onclick: () => say(publicStatement(s, P.key, false)) }, t(l('Criticar em público', 'Criticize publicly'))),
      ),
      h('p', { class: 'small muted' }, t(l('Também mexem na opinião: dispensar ou contratar ex-artistas de rivais, aliciar, processar, atrasar salários, quebrar promessas, vender masters, ganhar prêmios em cima deles e suas posições políticas.', 'Opinion also moves with: dropping acts or signing rivals\' ex-acts, poaching, lawsuits, late salaries, broken promises, selling masters, beating them at awards and your political stances.'))),
    ),
    self ? h('div', { class: 'row wrap' }, actMode27() !== 'quick' ? h('button', { class: 'btn small ghost', title: t(l('Quem deve a quem e quem sabe o quê: cobrar, retribuir, queimar.', 'Who owes whom and who knows what: call in, repay, burn.')), onclick: () => openFavors27() }, t(l('Livro de favores', 'Favor ledger'))) : null, h('button', { class: 'btn small', title: t(l('Quem pensa como você se aproxima; quem discorda se afasta (pesa mais em quem é engajado).', 'Like-minded people come closer; those who disagree drift away (more so for the engaged).')), onclick: () => say(politicalStatement(s)) }, t(l('Fazer declaração política', 'Make a political statement')))) : null,
  );
}

export function openFicha13(key: string, title?: string): void {
  if (personRoute16.f?.(key)) return;
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
    t(l('Quem negocia: {n} (negociação {v}) · você: {m}', 'Negotiator: {n} (negotiation {v}) · you: {m}'), { n: ng.p.name, v: bandText(band(s, `p:${ng.p.id}`, 'attrs.neg', ng.neg, attrWidth(s, `p:${ng.p.id}`, 'person', false))), m: labelNeg(s) }), ' ', ficha13Btn(`p:${ng.p.id}`), // r31 F #24: sem névoa antes
    bs.length ? barrierList(bs) : null);
}

// ---------------------------------------------------------------- r31 F: a relação (5 dimensões) e "como se conheceram"

const dimTone = (v: number) => (v >= 20 ? 'good' : v <= -20 ? 'bad' : '');
const dimTxt = (v: number): string => (v >= 50 ? t(l('alto', 'high')) : v >= 20 ? t(l('bom', 'good')) : v <= -50 ? t(l('péssimo', 'terrible')) : v <= -20 ? t(l('baixo', 'low')) : t(l('neutro', 'neutral')));

/** Bloco "Relação com você": conhecimento/intimidade, afeto, respeito, confiança, rivalidade e como se conheceram. */
export function relation31(s: GameState, key: string, redraw?: () => void): HTMLElement | null {
  const me = meNode31(s);
  const n = node31(s, key);
  if (n === me) return null;
  const tie = tie31(s, me, n);
  const op = opinionOf(s, key);
  if (!tie) {
    const via = introVia31(s, n);
    return section(t(l('Relação com você', 'Relationship with you')),
      h('p', { class: 'small' }, pill(t(l('Nunca se viram', 'Never met')), ''), ' ', h('span', { class: 'muted' }, t(l('Contratar, gravar ou tocar junto, festivais, premiações, visitar o lugar onde a pessoa está ou um amigo em comum fazem vocês se conhecerem.', 'Hiring, recording or playing together, festivals, awards, visiting where they hang out or a mutual friend make you meet.')))),
      via ? h('button', { class: 'btn small', title: t(l('{f} conhece os dois.', '{f} knows you both.'), { f: nodeName31(s, via) }), onclick: () => { const e = askIntro31(s, n); toast(t(e ?? l('Apresentados por {f}.', 'Introduced by {f}.'), { f: nodeName31(s, via) }), e ? 'warn' : 'good'); redraw?.(); rerender(); } }, t(l('Pedir apresentação a {f}', 'Ask {f} for an introduction'), { f: nodeName31(s, via) })) : null);
  }
  const row = (lab: L, v: string, tn = '') => h('li', null, h('span', null, t(lab)), h('b', { class: tn }, v));
  return section(t(l('Relação com você', 'Relationship with you')),
    h('p', { class: 'small' }, pill(t(tieLabel31(s, me, n)), tie.v >= 30 ? 'bad' : 'good'), ' ', h('span', { class: 'muted' }, t(l('Como se conheceram: ', 'How you met: ')), t(howMet31(s, tie)))),
    h('ul', { class: 'attr-list small' },
      row(l('Intimidade', 'Closeness'), `${Math.round(tie.i)}/100 · ${t(tie.k === 3 ? l('trabalharam juntos', 'worked together') : l('já se viram', 'have met'))}`),
      row(l('Afeto (opinião)', 'Affection (opinion)'), signed(op), dimTone(op)),
      row(l('Respeito por você', 'Respect for you'), dimTxt(tie.rBack), dimTone(tie.rBack)),
      row(l('Confiança em você', 'Trust in you'), dimTxt(tie.tBack), dimTone(tie.tBack)),
      row(l('Rivalidade', 'Rivalry'), tie.v >= 60 ? t(l('inimigos', 'enemies')) : tie.v >= 30 ? t(l('rivais', 'rivals')) : tie.v > 0 ? t(l('alguma', 'some')) : t(l('nenhuma', 'none')), tie.v >= 30 ? 'bad' : '')),
    h('p', { class: 'small muted' }, t(l('A intimidade esfria devagar sem contato; presentes, favores e trabalho bem-sucedido aproximam; calote, traição e escândalo afastam.', 'Closeness cools slowly without contact; gifts, favors and successful work bring you closer; defaults, betrayal and scandal push you apart.'))));
}
