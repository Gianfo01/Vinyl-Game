// Rodada 19 (9.13) — Estúdio › "Equipamento": instrumento de cada integrante (modelo real da época), endossos, modelos-
// assinatura, instrumentos-ícone (relíquias), fabricantes compráveis, o som da era e o equipamento dos estúdios reais.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ENDORSE_FROM19, SIG_FROM19, buyMaker19, endBlock19, endorse19, eraSound19, g19, gearById19, gearName19, iconOf19, mainGear19, makerDiv19, makerName19, makerPrice19, makers19, players19, sellMaker19, sigOdds19, signature19, studioKits19 } from '../../sim/sys/gear19';
import { DIM18 } from '../../sim/sys/quality18';
import { Rng } from '../../core/rng';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerTab } from '../registry';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

function rosterGear(s: GameState): HTMLElement {
  const st = g19(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && players19(s, a).length);
  if (!acts.length) return muted(l('Ninguém no elenco toca um instrumento de fabricante ainda.', 'Nobody on the roster plays a maker instrument yet.'));
  return h('div', null, ...acts.slice(0, 12).map((a) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' },
    row(actLink(s, a.id), why18(s, 'gear19.fee', { act: a.id }, pill(fmtS(l('fama {f}', 'fame {f}'), { f: Math.round(a.fame) })))),
    ...players19(s, a).map((p) => {
      const g = mainGear19(s, p.id), e = st.end[p.id], sg = st.sig[p.id], ic = iconOf19(s, p.id);
      const b = endBlock19(s, a, p.id);
      return row(h('b', null, p.name), h('span', { class: 'small' }, T(gearName19(s, g))),
        e && e.until > s.week ? pill(fmtS(l('endosso {m} até sem. {w}', '{m} endorsement until wk {w}'), { m: makerName19(s, e.maker), w: e.until }), 'good') : null,
        sg ? pill(fmtS(l('modelo-assinatura: {u} vendidos', 'signature model: {u} sold'), { u: sg.units.toLocaleString() }), 'good') : null,
        ic ? pill(fmtS(l('ícone: {n}', 'icon: {n}'), { n: T(ic.n) }), 'warn') : null,
        !b ? btn(l('Procurar endosso', 'Seek an endorsement'), () => say(endorse19(s, p.id))) : null,
        e && !sg && s.year >= SIG_FROM19 ? btn(fmtS(l('Pedir modelo-assinatura ({o}%)', 'Ask for a signature model ({o}%)'), { o: Math.round(sigOdds19(s, a).p * 100) }), () => say(signature19(s, p.id, Rng.fromSeed(`${s.config.seed}|g19ui|${p.id}|${s.week}`)))) : null);
    }))));
}
function makersBlock(s: GameState): HTMLElement {
  const st = g19(s);
  const ms = makers19(s).slice(0, 10);
  return h('div', null, muted(l('Comprar um fabricante dá dividendos todo ano, endossos da casa sem custo e margem cheia nos modelos-assinatura do seu elenco.', 'Buying a maker pays yearly dividends, in-house endorsements at no cost and full margin on your roster\'s signature models.')),
    ...ms.map((m) => row(h('b', null, makerName19(s, m.id)), pill(fmtS(l('{n} modelos', '{n} models'), { n: m.models })), pill($(makerPrice19(s, m))),
      st.mk[m.id] ? h('span', null, pill(fmtS(l('seu desde {y} · dividendo {d}/ano', 'yours since {y} · dividend {d}/yr'), { y: st.mk[m.id], d: $(makerDiv19(s, m.id)) }), 'good'), ' ', btn(l('Vender', 'Sell'), () => say(sellMaker19(s, m.id))))
        : btn(l('Comprar', 'Buy'), () => say(buyMaker19(s, m.id))))));
}
function gearTab(s: GameState): HTMLElement {
  const era = eraSound19(s.year);
  const kits = studioKits19(s).slice(0, 12);
  return h('div', null,
    muted(s.year < ENDORSE_FROM19 ? fmtS(l('Endossos de fabricantes começam por volta de {y}.', 'Maker endorsements start around {y}.'), { y: ENDORSE_FROM19 }) : l('Fabricantes pagam para seus músicos tocarem os instrumentos deles (o selo leva comissão; imagem mais pop). Estrelas ganham modelo-assinatura (1952+). O instrumento de quem faz hits vira ícone — e, na morte, relíquia disputada pelos herdeiros.', 'Makers pay your musicians to play their instruments (the label takes a commission; a more mainstream image). Stars get a signature model (1952+). The hit-maker\'s instrument becomes an icon — and, at death, a relic the heirs fight over.')),
    section(t(l('Seu elenco', 'Your roster')), rosterGear(s)),
    section(t(l('O som da era', 'The sound of the era')), era.length ? h('ul', { class: 'small' }, ...era.map((g) => h('li', null, h('b', null, T(gearName19(s, g))), ` (${g.from})`, g.note ? ` — ${T(g.note)}` : ''))) : muted(l('Nada novo marcando o som agora.', 'Nothing new defining the sound right now.'))),
    section(t(l('Fabricantes', 'Makers')), makersBlock(s)),
    kits.length ? section(t(l('Equipamento dos estúdios da época', 'Studio gear of the era')), h('ul', { class: 'small' }, ...kits.map((k) => h('li', null, h('b', null, k.name), ': ', k.gear.map((g) => T(gearName19(s, gearById19(g.id)))).join(', ') || '—', ' · ', k.dims.map((d) => T(DIM18[d]?.name ?? d)).join(', '))))) : null);
}
registerTab('creation', { id: 'gear19', label: l('Equipamento', 'Gear'), icon: 'guitar', order: 58, render: gearTab });
