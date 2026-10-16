// R31 · onda 3 (G · Objetos) — tela da loja da cidade: estoque do mês (gerado no motor; a tela só lê), cada exemplar com
// a sua história (ano, estado, donos anteriores, acontecimentos), vitrine de relíquia rara e as três formas de compra:
// ficar com você (dinheiro pessoal), para a empresa (caixa do selo) ou dar de presente a quem você conhece.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  COND31, buyErr31, buyOffer31, giftEffect31, itemsOf31, knownPeople31, shopCities31, shopRows31, weeksToRestock31, type BuyHow31, type ShopRow31,
} from '../../sim/r31/items31';
import { vitItems31, vitView31 } from '../../sim/r31/vitrine31';
import { offerRow31 } from '../../sim/r31/items31';
import { CO31, ME31, TIER_NAME31, relicMeasure31, tierStars31 } from '../../sim/r31/relic31';
import type { GameState } from '../../sim/types';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';

const UI = { city: '', to: '', pay: 'me' as 'me' | 'co' };
const CAT: Record<string, L> = { instr: l('Instrumento', 'Instrument'), gift: l('Presente', 'Gift'), garage: l('Garagem', 'Garage') };

function card(s: GameState, r: ShopRow31, ppl: string[]): HTMLElement {
  const buy = (how: BuyHow31) => { const res = buyOffer31(s, r.offer, how); toast(t(res), buyErr31(res) ? 'bad' : 'good'); rerender(); };
  const to = ppl.includes(UI.to) ? UI.to : ppl[0];
  let head: HTMLElement;
  let body: (HTMLElement | null)[];
  if (r.relic) {
    const m = relicMeasure31(s, r.relic);
    head = h('div', null, h('b', null, t(r.relic.n)), ' ', pill(`${tierStars31(m.tier)} ${t(TIER_NAME31[m.tier - 1])}`, m.tier >= 4 ? 'gold' : 'good'));
    body = [h('p', { class: 'small muted' }, t(l('Na vitrine por consignação de um colecionador. Ano {y}.', 'In the showcase on consignment from a collector. Year {y}.'), { y: r.relic.y })),
      h('ol', { class: 'small' }, r.relic.own.slice(-4).map((o) => h('li', null, `${o[0]} · ${o[1]}`)))];
  } else {
    const d = r.def!, x = r.x!;
    head = h('div', null, h('b', null, t(d.name)), ' ', pill(t(CAT[d.cat])), ' ', pill(x.made === s.year ? t(l('novo', 'new')) : `${x.made}`), ' ', pill(t(COND31[x.cond])));
    body = [h('p', { class: 'small muted' }, t(d.desc)),
      x.prev.length ? h('div', { class: 'small' }, t(l('Donos anteriores:', 'Previous owners:')), h('ol', null, x.prev.map(([n, a, b]) => h('li', null, `${n} · ${a}–${b}`)))) : h('p', { class: 'small' }, t(l('Primeiro dono: você ou quem você escolher.', 'First owner: you or whoever you choose.'))),
      x.ev.length ? h('ul', { class: 'small muted' }, x.ev.map(([y, e]) => h('li', null, `${y} · ${t(e)}`))) : null,
      d.cat !== 'gift' ? h('p', { class: 'small' }, '★ ', t(l('Pode virar relíquia com a história que viver.', 'It can become a relic with the history it lives.'))) : null];
  }
  const ef = to ? giftEffect31(s, to, r.relic ? r.relic.v : r.def!.price, r.def?.fam, !!r.relic) : null;
  return h('div', { class: 'card' }, head, h('div', null, h('b', null, $(r.price))), ...body,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small primary', onclick: () => buy({ k: 'me' }) }, t(l('Ficar comigo (pessoal)', 'Keep it (personal)'))),
      h('button', { class: 'btn small', onclick: () => buy({ k: 'co' }) }, t(l('Para a empresa', 'For the company')))),
    to ? h('div', { class: 'row wrap' },
      select(to, ppl.map((id) => ({ value: id, label: s.persons[id].name })), (v) => { UI.to = v; rerender(); }),
      select(UI.pay, [{ value: 'me' as const, label: t(l('paga você', 'you pay')) }, { value: 'co' as const, label: t(l('paga a empresa', 'the company pays')) }], (v) => { UI.pay = v; }),
      h('button', { class: 'btn small', title: ef ? ef.why.map((w) => t(w)).join(' · ') : '', onclick: () => buy({ k: 'gift', to, pay: UI.pay }) }, '🎁 ', t(l('Dar de presente', 'Give as a gift'))),
      ef ? pill(t(l('opinião +{d}', 'opinion +{d}'), { d: ef.delta }), 'good') : null) : h('p', { class: 'small muted' }, t(l('Presente: só para quem você conhece.', 'Gifts: only for people you know.'))));
}

/** r31 (VIT): o que a vitrine do mês pôs à venda na loja (instrumento "era de fulano", consignado, novidade, massa
 *  falida) — as mesmas ofertas e a mesma compra; aqui também se dá de presente. */
function vitSec(s: GameState, ppl: string[]): HTMLElement | null {
  const xs = vitItems31(s, 'instruments').filter((it) => it.mk && it.ref.offer).map((it) => ({ it, row: offerRow31(s, it.ref.offer!) })).filter((x) => !!x.row);
  if (!xs.length) return null;
  return section(t(l('Vitrine do mês', 'Showcase of the month')), h('div', { class: 'cards' }, xs.map(({ it, row }) => h('div', null, h('p', { class: 'small' }, '✦ ', h('b', null, t(vitView31(s, it).name))), card(s, row!, ppl)))));
}

/** Aba "Loja da cidade". */
export function shop31Tab(s: GameState): HTMLElement {
  const cities = shopCities31(s);
  const city = cities.includes(UI.city) ? UI.city : cities[0];
  const rows = shopRows31(s, city);
  const ppl = knownPeople31(s, 40);
  const items = rows.filter((r) => !r.relic), show = rows.filter((r) => r.relic);
  const mine = [...itemsOf31(s, ME31), ...itemsOf31(s, CO31)];
  return h('div', null,
    h('div', { class: 'row wrap' },
      cities.length > 1 ? select(city, cities.map((c) => ({ value: c, label: t(cityById[c]?.name ?? l(c, c)) })), (v) => { UI.city = v; rerender(); }) : h('b', null, t(cityById[city]?.name ?? l(city, city))),
      pill(t(l('Novidades: o estoque inteiro troca em {n} semana(s)', 'New stock: everything changes in {n} week(s)'), { n: weeksToRestock31(s) }), 'gold')),
    section(t(l('Vitrine', 'Showcase')), show.length ? h('div', { class: 'cards' }, show.map((r) => card(s, r, ppl)))
      : h('p', { class: 'muted small' }, t(l('Vitrine vazia este mês. Relíquias raras aparecem de vez em quando — sempre peças que já existem.', 'Empty showcase this month. Rare relics turn up now and then — always pieces that already exist.')))),
    vitSec(s, ppl),
    section(t(l('À venda', 'For sale')), items.length ? h('div', { class: 'cards' }, items.map((r) => card(s, r, ppl))) : h('p', { class: 'muted small' }, t(l('Tudo vendido. Volte no mês que vem.', 'Sold out. Come back next month.')))),
    mine.length ? section(t(l('Seus itens com história', 'Your items with history')), h('ul', { class: 'attr-list' }, mine.map(({ o, x, def }) =>
      h('li', null, h('b', null, t(def.name)), ` · ${x.made} · `, t(o.owner === ME31 ? l('seu', 'yours') : l('da empresa', 'the company\'s')), x.prev.length ? h('small', { class: 'muted' }, ` · ${t(l('{n} dono(s) antes', '{n} owner(s) before'), { n: x.prev.length })}`) : null)))) : null,
    h('p', { class: 'small muted' }, t(l('Pessoal sai do seu bolso e entra no seu patrimônio; empresa sai do caixa e entra no acervo do selo; presente pode sair de qualquer um dos dois.', 'Personal comes out of your pocket into your wealth; company comes out of the label\'s cash into its collection; a gift can come from either.'))));
}
