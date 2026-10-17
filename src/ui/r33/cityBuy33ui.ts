// R33 · BUGS33 (item 4) — bloco "Negócios aqui" da cidade: comprar imóvel, abrir filial, diretor da filial e as ações
// do imóvel que você já tem lá. Modelo e travas em sim/r33/cityBuy33.ts; aqui só botão + motivo visível.

import { cityBuyActs33, runCityBuy33, type CityBuy33, type CityBuyId33 } from '../../sim/r33/cityBuy33';
import type { GameState } from '../../sim/types';
import { t } from '../../i18n/strings';
import { l } from '../../data/world';
import { $, rerender, toast } from '../common';
import { h } from '../dom';
import { ic } from '../vis';

const $$ = (v: number) => $(Math.abs(v));

/** Um botão da ação; travado, fica desabilitado e com o motivo escrito embaixo (não só no título). */
export function cityBuyBtn33(s: GameState, city: string, a: CityBuy33, o: { cls?: string; after?: () => void } = {}): HTMLElement {
  const run = () => { const r = runCityBuy33(s, city, a.id as CityBuyId33); toast(t(r.text), r.ok ? 'good' : 'bad'); (o.after ?? rerender)(); };
  const btn = h('button', { type: 'button', class: `${o.cls ?? 'btn small'}${a.dis ? ' lk31-off' : ''}`, 'data-cb33': a.id, disabled: !!a.dis, 'aria-disabled': a.dis ? 'true' : undefined, title: t(a.dis ?? a.desc), onclick: run },
    t(a.label), a.cost ? h('small', null, ` ${$$(a.cost)}`) : null);
  return a.dis ? h('span', { class: 'cb33-lk' }, btn, h('small', { class: 'cb33-why', role: 'note' }, ic('lock'), ' ', t(a.dis))) : btn;
}

/** Bloco da ficha da cidade (mapa-múndi e cidade visitada). */
export function cityBuyBlock33(s: GameState, city: string, after?: () => void): HTMLElement {
  const acts = cityBuyActs33(s, city);
  return h('div', { class: 'sheet27-blk cb33', 'data-cb33': city },
    h('h4', null, ic('building'), ' ', t(l('Negócios aqui', 'Business here'))),
    h('div', { class: 'cb33-list' }, acts.map((a) => h('div', { class: 'cb33-row' }, cityBuyBtn33(s, city, a, { after }), h('small', { class: 'muted' }, t(a.desc))))));
}
