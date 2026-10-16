// R31 · onda 4 (LOTE) — interface dos lotes da cidade: comprar o terreno (preço e motivo de bloqueio antes do clique),
// os seus terrenos, as casas de quem mora na cidade e quem se mudou; painel rápido da cidade ("Comprar terreno").
// Só lê o motor (sys/lots31); comprar passa por `buyLot31` (transação atribuída). Abrir não muda nada.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { LOTS18 } from '../../sim/sys/campus18';
import { buyLot31, homeLog31, lotLock31, lotPrice31, lotsOn31, ownsLot31, peekLots31, TIER31 } from '../../sim/sys/lots31';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { cityLots31, FN31, type CityLots31, type LotFn31 } from '../pixel/lots31map';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import './lots31.css';

const lockOf = (why: L | null) => (why ? { why, unlock: why.pt.startsWith('Caixa') ? l('Junte caixa livre ou venda um bem.', 'Build up free cash or sell an asset.') : l('Escolha outro terreno.', 'Pick another plot.') } : null);

/** Bloco "Comprar o terreno" do painel do lote (preço, motivo de bloqueio antes do clique). */
export function buyLotBlock31(s: GameState, lot: number, after?: () => void): HTMLElement | null {
  if (!lotsOn31(s) || !LOTS18[lot]) return null;
  if (ownsLot31(s, lot)) return h('p', { class: 'small good lt31-own' }, '✔ ', t(l('Este terreno é seu: escolha a obra abaixo (sem pagar o terreno de novo).', 'This plot is yours: pick the works below (without paying for the land again).')));
  const price = lotPrice31(s, lot);
  return h('div', { class: 'lt31-buy' },
    h('p', { class: 'small' }, t(fmtL(l('Só o terreno: {p} (área, lote e bairro nesta época). Comprado, ele fica seu e aparece no mapa com a placa "SEU".', 'The plot alone: {p} (area, lot and district in this era). Once bought, it is yours and shows on the map with a "YOURS" sign.'), { p: $(price) }))),
    lockBtn31(`${t(l('Comprar o terreno', 'Buy the plot'))} · ${$(price)}`, lockOf(lotLock31(s, lot)), () => {
      const r = buyLot31(s, lot);
      toast(t(r.text), r.ok ? 'good' : 'bad');
      after?.();
      rerender();
    }, { cls: 'btn small primary' }));
}

const COL31: Record<LotFn31, string> = { hq: '#3a7a9a', mine: '#2a7a3a', business: '#8a5ab0', sale: '#c8302c', own: '#2a9a5a', home: '#b07a2a', none: '#8a8490' };
/** Linha de cobertura: quantos prédios têm função (com a contagem por tipo). */
export function coverLine31(c: CityLots31): HTMLElement {
  const n: Partial<Record<LotFn31, number>> = {};
  for (const x of c.cells) n[x.fn] = (n[x.fn] ?? 0) + 1;
  return h('p', { class: 'small lt31-cover' }, h('b', null, t(fmtL(l('Prédios com função: {p}%', 'Buildings with a purpose: {p}%'), { p: Math.round(c.cover * 100) }))), ' · ',
    (Object.keys(n) as LotFn31[]).map((k) => h('span', { class: 'lt31-k', style: `--k:${COL31[k]}` }, `${t(FN31[k])} ${n[k]}`)));
}
export const fnCol31 = (k: LotFn31): string => COL31[k];

/** Painel da cidade: terrenos à venda (comprar), os seus, casas e mudanças recentes. */
export function lotsCityView31(s: GameState): HTMLElement {
  const c = cityLots31(s);
  const sale = c.sale.filter((x) => !x.own && x.opt === 'lot31');
  const own = Object.keys(peekLots31(s)?.own ?? {}).map(Number);
  const homes = c.places.filter((p) => p.k === 'home');
  const log = homeLog31(s, 5);
  const box = h('div', { class: 'lt31-city' },
    coverLine31(c),
    h('h4', null, t(l('Terrenos à venda', 'Plots for sale'))),
    sale.length ? h('ul', { class: 'lt31-list' }, sale.map((x) => h('li', null, h('b', null, t(LOTS18[x.lot].name)), ' · ', $(x.price), ' ', buyLotBlock31(s, x.lot, () => box.replaceWith(lotsCityView31(s))))))
      : h('p', { class: 'small muted' }, t(l('Nenhum terreno vago agora: os prédios da cidade estão todos ocupados.', 'No vacant plots now: every building in town is in use.'))),
    own.length ? [h('h4', null, t(l('Seus terrenos', 'Your plots'))), h('ul', { class: 'lt31-list' }, own.map((lot) => h('li', null, t(LOTS18[lot]?.name ?? l('?', '?')))))] : null,
    homes.length ? [h('h4', null, t(l('Quem mora na cidade', 'Who lives in town'))), h('ul', { class: 'lt31-list' }, homes.map((p) => h('li', null, h('b', null, t(p.name)), h('small', { class: 'muted' }, ` · ${t(TIER31[p.lot31?.tier ?? 1])} · ${t(p.now)}`))))] : null,
    log.length ? h('details', { class: 'small' }, h('summary', null, t(l('Casas que mudaram de dono', 'Homes that changed hands'))),
      h('ul', null, log.map((e) => h('li', null, t(fmtL(e.in ? l('{n} se mudou para cá.', '{n} moved in.') : l('{n} deixou a casa ({w}).', '{n} left the home ({w}).'), { n: e.name, w: e.why ?? l('', '') })))))) : null);
  return box;
}

registerQuick31({
  id: 'q.lot31', verb: 'buy', icon: 'building', kinds: ['city'], label: l('Comprar terreno na cidade', 'Buy a plot in town'),
  applies: (s, tg) => tg.id === s.config.homeCity && !!cityById[tg.id],
  lock: (s) => {
    if (!lotsOn31(s)) return { why: l('Compra de terreno desligada nesta partida.', 'Plot buying is off in this game.'), unlock: l('Ligue o interruptor no editor.', 'Turn the switch on in the editor.') };
    const c = cityLots31(s).sale.filter((x) => !x.own && x.opt === 'lot31');
    if (!c.length) return { why: l('Nenhum terreno vago agora.', 'No vacant plot right now.'), unlock: l('Volte na virada do mês (casas mudam de dono).', 'Come back at the month turn (homes change hands).') };
    const cheap = c.reduce((a, b) => (b.price < a.price ? b : a));
    return lockOf(lotLock31(s, cheap.lot));
  },
  cost: (s) => { const c = cityLots31(s).sale.filter((x) => !x.own && x.opt === 'lot31'); return c.length ? Math.min(...c.map((x) => x.price)) : 0; },
  dest: () => ({ area: 'campus18' }),
  run: (s) => modal(t(l('Lotes da cidade', 'City lots')), lotsCityView31(s)),
});
