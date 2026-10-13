// R29 (contratos+) — interface dos três modelos novos (empresariamento, produção, joint venture). Nada de caminho novo
// de contrato: a proposta continua sendo o formulário (ficha.openOffer) e a mesa r27 (negotiate27); aqui ficam só
//  • os campos do modelo dentro dessas duas telas (comissão, participação e meta) — x29Fields;
//  • a aba "Acordos especiais" no Mercado de contratos (Pessoas › Contratos, a S07 da REORG): fluxos de dinheiro e as
//    saídas de cada acordo (deixar a gestão, entregar/vender masters, liberar o artista, comprar a parte, dissolver).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { COMMISSION29, HOW29, SHARE29, TARGET29, commissionOf29, shareOf29, targetOf29, type OfferX29 } from '../../sim/terms29';
import type { Contract, GameState, Offer } from '../../sim/types';
import {
  buyoutJV29, buyoutPrice29, deliverMasters29, deliveryLabels29, deliveryQuote29, dissolveJV29, jvPenalty29, jvTargetMet29, quitManagement29, releaseProduction29, specialDeals29,
} from '../../sim/sys/contracts29';
import { unreleasedRecorded } from '../../sim/production';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { CONTRACT_MODELS } from '../../data/rules';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'bad' : 'good'); rerender(); };

/** Campos do modelo na proposta (formulário e mesa): comissão do empresário; participação e meta da JV. */
export function x29Fields(_s: GameState, o: Pick<Offer, 'model' | 'termMonths'> & { x29?: OfferX29 }, onChange: () => void): HTMLElement {
  const num = (label: L, value: number, min: number, max: number, step: number, set: (v: number) => void) =>
    h('label', null, T(label), h('input', { type: 'number', value, min, max, step, oninput: (e: Event) => { set(Number((e.target as HTMLInputElement).value)); onChange(); } }));
  if (o.model === 'management') {
    return h('div', { class: 'x29-fields', style: 'display:contents' },
      num(l('Comissão do empresário (%)', 'Manager commission (%)'), Math.round(commissionOf29(o) * 100), COMMISSION29.min * 100, COMMISSION29.max * 100, 1, (v) => { o.x29 = { ...o.x29, commission: v / 100 }; }),
      h('small', { class: 'muted' }, T(l('10–25%. Abaixo de 15% agrada; acima de 20% pesa contra.', '10–25%. Below 15% pleases; above 20% counts against.'))));
  }
  if (o.model === 'jv') {
    return h('div', { class: 'x29-fields', style: 'display:contents' },
      num(l('Participação do artista no selo (%)', 'Artist stake in the label (%)'), Math.round(shareOf29(o) * 100), SHARE29.min * 100, SHARE29.max * 100, 1, (v) => { o.x29 = { ...o.x29, artistShare: v / 100 }; }),
      num(l('Meta de lançamentos no prazo', 'Release target over the term'), targetOf29(o), TARGET29.min, TARGET29.max, 1, (v) => { o.x29 = { ...o.x29, target: v }; }),
      h('small', { class: 'muted' }, T(l('O adiantamento vira o capital do selo. Meta acima de 1 lançamento a cada 9 meses assusta.', 'The advance becomes the label\'s capital. A target above 1 release every 9 months scares them.'))));
  }
  if (o.model === 'production') return h('small', { class: 'muted' }, T(l('Royalty = a parte do artista em tudo o que a produtora receber (padrão ~45%).', 'Royalty = the act\'s share of everything the company receives (default ~45%).')));
  return h('span');
}

const modelName = (c: Contract) => T(CONTRACT_MODELS.find((m) => m.id === c.model)?.name ?? l(c.model));

function actions(s: GameState, c: Contract): HTMLElement | null {
  const act = s.acts[c.actId];
  if (!act || c.x29?.ended) return null;
  const btn = (label: L | string, fn: () => void, dis = false, title?: L) => h('button', { class: 'btn small', disabled: dis, title: title ? T(title) : undefined, onclick: fn }, T(label));
  if (c.model === 'management') return h('div', { class: 'row wrap' },
    btn(l('Deixar a gestão', 'Step down'), () => say(quitManagement29(s, c.id)), false, l('Antes do prazo: confiança −8 e reputação de empresário −2.', 'Before the term: trust −8 and manager reputation −2.')),
    h('small', { class: 'muted' }, T(l('Turnê, negociar com o selo, crises e plano: Gestão de artistas (carreira Empresário).', 'Tours, negotiating with the label, crises and plan: Artist management (Manager career).'))));
  if (c.model === 'production') {
    if (act.contractId !== c.id) return null;
    const ready = unreleasedRecorded(s, act).length;
    const lbs = deliveryLabels29(s, c.id);
    return h('div', null,
      h('p', { class: 'small muted' }, T(ready ? l(`${ready} master(s) gravado(s) esperando. Lançar pelo seu selo é o lançamento de sempre (royalty = parte do artista).`, `${ready} recorded master(s) waiting. Releasing on your label is the usual release (royalty = the act's share).`) : l('Nada gravado esperando: grave antes de entregar.', 'Nothing recorded waiting: record before delivering.'))),
      ready && lbs.length ? h('div', { class: 'row wrap' }, ...lbs.slice(0, 4).flatMap((x) => {
        const sale = deliveryQuote29(s, c.id, x.id, 'sale');
        return [
          btn(l(`Licenciar a ${x.name} (${$(x.adv)})`, `License to ${x.name} (${$(x.adv)})`), () => say(deliverMasters29(s, c.id, x.id, 'license'))),
          sale && (s.labels[x.id]?.cash ?? 0) >= sale.adv ? btn(l(`Vender a ${x.name} (${$(sale.adv)})`, `Sell to ${x.name} (${$(sale.adv)})`), () => say(deliverMasters29(s, c.id, x.id, 'sale'))) : null,
        ];
      })) : null,
      btn(l('Liberar o artista', 'Release the act'), () => say(releaseProduction29(s, c.id)), false, l('Encerra o contrato antes do prazo; as entregas feitas seguem pagando pontos.', 'Ends the deal early; past deliveries keep paying points.')));
  }
  if (c.x29?.bought !== undefined) return h('div', { class: 'row wrap' }, btn(l('Dissolver a JV', 'Dissolve the JV'), () => say(dissolveJV29(s, c.id))));
  const met = jvTargetMet29(s, c);
  return h('div', { class: 'row wrap' },
    btn(l(`Comprar a parte do artista (${$(buyoutPrice29(s, c))})`, `Buy out the act (${$(buyoutPrice29(s, c))})`), () => say(buyoutJV29(s, c.id))),
    btn(l('Dissolver a JV', 'Dissolve the JV'), () => say(dissolveJV29(s, c.id)), false, met ? l('Meta cumprida: dissolve sem multa (o ato deixa o selo).', 'Target met: dissolves with no penalty (the act leaves the label).') : l(`Meta não cumprida: multa de ${$(jvPenalty29(s, c))} ao artista (o ato deixa o selo).`, `Target not met: ${$(jvPenalty29(s, c))} penalty to the act (the act leaves the label).`)));
}

/** Aba do Mercado de contratos: os acordos especiais, o dinheiro que andou e as saídas. */
export function deals29Tab(s: GameState): HTMLElement {
  const rows = specialDeals29(s);
  const how = (['management', 'production', 'jv'] as const).map((m) => h('li', null, h('b', null, T(CONTRACT_MODELS.find((x) => x.id === m)!.name)), ': ', T(HOW29[m]!)));
  return h('div', { class: 'deals29' },
    h('p', { class: 'muted small' }, T(l('Empresariamento, produção e joint venture: proponha pela ficha do artista (Fazer proposta → Modelo) ou pela mesa de negociação. Aqui ficam o dinheiro de cada acordo e as saídas.', 'Management, production and joint venture: propose from the act page (Make an offer → Model) or at the negotiation table. Here you find each deal\'s money and its exits.'))),
    rows.length ? h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Modelo', 'Model'), l('Termos', 'Terms'), l('Dinheiro', 'Money'), l('Situação', 'Status'), ''].map((x) => h('th', null, T(x)))),
      ...rows.map((r) => h('tr', { 'data-c29': r.c.model },
        h('td', null, actLink(s, r.c.actId)), h('td', null, modelName(r.c)), h('td', null, T(r.terms)), h('td', null, T(r.flows)),
        h('td', null, pill(T(r.status), r.active ? 'good' : '')), h('td', null, r.active ? actions(s, r.c) : null))))
      : h('p', { class: 'muted small' }, T(l('Nenhum acordo especial ainda.', 'No special deals yet.'))),
    section(T(l('Como funcionam', 'How they work')), h('ul', { class: 'small' }, ...how)));
}
