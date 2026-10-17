// R33 · POL33-A item 3 — o cartão de ações do outdoor (ACOES5/EXP-13): clicar no outdoor do mapa abre o cartão ao lado
// com o aluguel, o alcance no bairro e as ações (alugar 1/3/6 meses, trocar o que anunciar, comprar, alugar a terceiros,
// vender, encerrar), cada uma com o motivo do bloqueio no botão. Também põe "Anúncio na rádio/TV" no cartão do rádio e TV.
// Só chama as funções de sim/r33/outdoor33.ts (fonte única); montar o cartão só lê.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  airCost33, airLock33, airName33, buyAir33, buyLock33, buySite33, buyPrice33, endRent33, incomeNow33, monthName33, nextTarget33, outOn, peek33o, reach33, rentCost33,
  rentLock33, rentOf33, rentSite33, sellPrice33, sellSite33, site33, slot33, style33, target33, tenantUntil33, toggleOut33, type Site33,
} from '../../sim/r33/outdoor33';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { usd } from '../../sim/sys/crime17';
import { rerender } from '../common';
import { CARDS5 } from '../r31/acoes5data';
import { ACTS_CAT5 } from '../r31/acoes5cat';
import { showAdhoc5 } from '../r31/acoes5';
import type { ActDef5, Card5, CardAct5 } from '../r31/acoes5model';
import { store } from '../store';

const $ = (c: number): string => t(usd(c));
const STYLE: Record<ReturnType<typeof style33>, L> = {
  paste: l('lambe-lambe colado no tapume', 'pasted posters on a fence'), painted: l('cartaz pintado à mão', 'hand-painted sign'), lit: l('painel iluminado', 'lit panel'),
  neon: l('luminoso de neon', 'neon sign'), led: l('telão de LED', 'LED screen'), holo: l('holograma', 'hologram'),
};

function run(s: GameState, label: L, err: L | null, ok: L): { text: L; bad?: boolean } { void s; void label; return err ? { text: err, bad: true } : { text: ok }; }

/** Monta o cartão de um ponto (PURO sobre o estado). */
export function outdoorCard33(s: GameState, site: Site33): Card5 {
  const sl = slot33(s, site), own = peek33o(s)?.own[site.id], tg = target33(s);
  const estado: L = sl.who === 'player' ? fmtL(l('seu anúncio até {m}', 'your ad until {m}'), { m: monthName33(sl.rent.start + sl.rent.months) })
    : sl.who === 'third' ? fmtL(l('{b} até {m}', '{b} until {m}'), { b: sl.brand.name, m: monthName33(tenantUntil33(s.year * 12 + s.month)) }) : l('livre para alugar', 'free to rent');
  const nums = [
    { label: l('Aluguel por mês', 'Rent per month'), value: $(rentCost33(s, site, 1)) },
    { label: l('Alcance no bairro', 'Neighbourhood reach'), value: `${Math.round(reach33(s, site) * 100)}%`, bar: reach33(s, site) },
    { label: l('Agora', 'Now'), value: t(estado) },
  ];
  if (own) nums.push({ label: l('Renda alugando', 'Rental income'), value: own.out ? `${$(incomeNow33(s, site))}/${t(l('mês ocupado', 'occupied month'))}` : t(l('livre para você', 'kept for you')) });
  const lines: L[] = [fmtL(l('{w} · {a}', '{w} · {a}'), { w: site.where, a: STYLE[style33(s.year)] }), tg ? fmtL(l('Anunciar: {x}', 'Advertise: {x}'), { x: tg.title }) : l('Nada para anunciar ainda.', 'Nothing to advertise yet.')];
  const A = (id: string, label: L, lock: L | null, fn: () => L | null, ok: L): CardAct5 => ({ id, label, kind: 'do', lock, run: (g) => run(g, label, fn(), ok) });
  const acts: CardAct5[] = [];
  for (const m of [1, 3, 6] as const) acts.push(A(`ob33.r${m}`, fmtL(l('Alugar {m} {u} · {c}', 'Rent {m} {u} · {c}'), { m, u: m === 1 ? l('mês', 'month') : l('meses', 'months'), c: $(rentCost33(s, site, m)) }), rentLock33(s, site.id, m), () => rentSite33(s, site.id, m), l('Outdoor alugado: o anúncio já está no mapa.', 'Billboard rented: your ad is on the map.')));
  acts.push(A('ob33.alvo', l('Trocar o que anunciar', 'Change what to advertise'), null, () => nextTarget33(s), l('Alvo trocado.', 'Target changed.')));
  if (sl.who === 'player') acts.push(A('ob33.fim', l('Encerrar a campanha', 'End the campaign'), null, () => endRent33(s, site.id), l('Campanha encerrada.', 'Campaign ended.')));
  if (!own) acts.push(A('ob33.comprar', fmtL(l('Comprar o ponto · {c}', 'Buy the spot · {c}'), { c: $(buyPrice33(s, site)) }), buyLock33(s, site.id), () => buySite33(s, site.id), l('Ponto comprado: terceiros vão alugar.', 'Spot bought: others will rent it.')));
  else {
    acts.push(A('ob33.alugarFora', own.out ? l('Guardar o ponto para você', 'Keep the spot for yourself') : l('Alugar a terceiros', 'Rent to others'), null, () => toggleOut33(s, site.id), l('Ponto atualizado.', 'Spot updated.')));
    acts.push(A('ob33.vender', fmtL(l('Vender o ponto · {c}', 'Sell the spot · {c}'), { c: $(sellPrice33(s, site)) }), rentOf33(s, site.id) ? l('Há uma campanha sua no ar.', 'One of your campaigns is running.') : null, () => sellSite33(s, site.id), l('Ponto vendido.', 'Spot sold.')));
  }
  return { id: `ob33:${site.id}`, title: site.name, nums: nums.slice(0, 4), lines, acts };
}

/** Abre o cartão do ponto ao lado do outdoor. */
export function openOutdoor33(siteId: string, at?: DOMRect): void {
  const s = store.game, site = site33(siteId);
  if (!s || !site || !outOn(s)) return;
  const build = (g: GameState): Card5 => outdoorCard33(g, site);
  showAdhoc5(s, build(s), at, () => { const g = store.game; if (!g) return undefined; rerender(); return build(g); });
}

// ---------------------------------------------------------------- rádio e TV nos cartões de objeto

const air = (k: 'radio' | 'tv'): ActDef5 => ({
  label: k === 'radio' ? l('Intervalo pago na rádio (4 semanas)', 'Paid radio slot (4 weeks)') : l('Intervalo pago na TV (4 semanas)', 'Paid TV slot (4 weeks)'), kind: 'do', src: ['sim/r33/outdoor33', 'buyAir33'], fn: buyAir33, home: 'radiotv',
  when: (s) => outOn(s) && s.year >= (k === 'radio' ? 1922 : 1950),
  lock: (s) => airLock33(s, k),
  same: (s) => { buyAir33(s, k); },
  run: (s) => { const e = buyAir33(s, k); return e ? { text: e, bad: true } : { text: fmtL(l('{n}: no ar por 4 semanas.', '{n}: on air for 4 weeks.'), { n: airName33(k, s.year) }) }; },
});
ACTS_CAT5['ob33.radio'] = air('radio');
ACTS_CAT5['ob33.tv'] = air('tv');
for (const a of ['ob33.radio', 'ob33.tv']) if (CARDS5.radiotv && !CARDS5.radiotv.acts.includes(a)) CARDS5.radiotv.acts.push(a);
void airCost33;
