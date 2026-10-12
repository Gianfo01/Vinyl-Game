// Rodada 20c (N1; r22: cartão "Atributos" da etapa Personagem): pontos livres, o que o passado soma (cada bônus uma
// vez, com a origem de cada parte) e a prévia rápida da ficha simulada.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { formatMoney, nominal } from '../core/money';
import { locale } from '../i18n/strings';
import type { RunConfig } from '../sim/types';
import type { PerkKey } from '../sim/perks';
import { SRC20, pastOf20, type Line20, type Part20 } from '../sim/past20';
import { h } from './dom';
import { helpTip } from './newgame13';
import { PERK_NAMES, fmtPerk } from './sys/persona';
import { attrAlloc22 } from './charCreate';
import { charPreview17 } from './newgame17';

const ATTR: Record<string, L> = { ear: l('Ouvido', 'Ear'), negotiation: l('Negociação', 'Negotiation'), charisma: l('Carisma', 'Charisma'), management: l('Gestão', 'Management') };
const REP: Record<string, L> = { institutional: l('Reputação institucional', 'Institutional reputation'), artists: l('Reputação com artistas', 'Reputation with artists') };
/** chaves em que número menor é melhor (mesma regra da tabela de bônus) */
const LOWER_GOOD = new Set<string>(['stress', 'pressingCost', 'staffCost', 'advance']);

const sgn = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v)}`;
const partsText = (ps: Part20[], fmt: (v: number) => string) => ps.length > 1 ? ` (${ps.map((p) => `${t(SRC20[p.src])} ${fmt(p.v)}`).join(' · ')})` : ` (${t(SRC20[ps[0].src])})`;

function lineEl(name: string, x: Line20, fmt: (v: number) => string, lowerGood = false): HTMLElement {
  const good = (x.total > 0) !== lowerGood;
  return h('li', null, h('span', null, name, ' '), h('b', { class: x.total ? (good ? 'good' : 'bad') : 'muted' }, fmt(x.total)), h('small', { class: 'muted' }, partsText(x.parts, fmt)));
}

/** r22: cartão "Atributos" — pontos livres, o que o passado soma (cada bônus uma vez) e a prévia rápida da ficha. */
export function attrsCard22(cfg: RunConfig, watch: HTMLElement): { el: HTMLElement; redraw: () => void } {
  const sum = h('div', { class: 'ng20-past-sum', 'aria-live': 'polite' });
  const draw = () => {
    const P = pastOf20(cfg);
    const yr = cfg.startYear;
    const $ = (real: number) => formatMoney(nominal(real, yr), locale());
    const money$ = (v: number) => `${v < 0 ? '−' : '+'}${$(Math.abs(v))}`;
    const perkFmt = (k: string) => (v: number) => fmtPerk(k as PerkKey, v).replace('-', '−');
    const lists: HTMLElement[] = [];
    const block = (title: L, items: HTMLElement[]) => { if (items.length) lists.push(h('div', null, h('h4', null, t(title)), h('ul', { class: 'ng20-past-ul' }, ...items))); };
    block(l('Atributos de dono', 'Owner attributes'), P.attrs.map((x) => lineEl(t(ATTR[x.key] ?? l(x.key, x.key)), x, sgn)));
    block(l('Habilidades musicais', 'Music skills'), P.skills.map((x) => lineEl(t(x.name ?? l(x.key, x.key)), x, sgn)));
    block(l('Bônus permanentes (a partida toda)', 'Permanent bonuses (whole run)'), [
      ...P.perks.map((x) => lineEl(t(PERK_NAMES[x.key as PerkKey] ?? l(x.key, x.key)), x, perkFmt(x.key), LOWER_GOOD.has(x.key))),
      ...P.conditional.map((cnd) => h('li', null, Object.entries(cnd.values).map(([k, v]) => `${t(PERK_NAMES[k as PerkKey] ?? l(k, k))} ${perkFmt(k)(v as number)}`).join(' · '), h('small', { class: 'muted' }, ` (${t(SRC20[cnd.src])}; ${t(cnd.when)})`))),
    ]);
    block(l('Dinheiro e reputação no começo', 'Money and reputation at the start'), [
      h('li', null, t(l('Patrimônio pessoal: ', 'Personal wealth: ')), h('b', null, $(Math.max(0, P.wealth.base + P.wealth.origin))), h('small', { class: 'muted' }, P.wealth.origin ? ` (${t(SRC20.base)} ${$(P.wealth.base)} · ${t(SRC20.origin)} ${money$(P.wealth.origin)})` : ` (${t(SRC20.base)})`)),
      ...(P.cash.parts.length ? [lineEl(t(l('Caixa da empresa', 'Company cash')), P.cash, money$)] : []),
      ...(P.debt ? [h('li', { class: 'bad' }, t(l('Dívida da trajetória: {n} parcelas de {v}', 'Path debt: {n} instalments of {v}'), { n: P.debt.months, v: $(P.debt.real) }))] : []),
      ...P.rep.map((x) => lineEl(t(REP[x.key]), x, sgn)),
    ]);
    sum.replaceChildren(h('p', { class: 'muted small' }, t(l('Cada bônus aparece uma vez, já somado; entre parênteses, de onde vem. Valores em dinheiro de {y}.', 'Each bonus appears once, already added up; in brackets, where it comes from. Money in {y} dollars.'), { y: yr })),
      h('div', { class: 'ng20-past-grid' }, ...lists));
  };
  const alloc = attrAlloc22(cfg, () => draw());
  const prev = charPreview17(cfg, watch);
  prev.classList.remove('card', 'wide');
  const redraw = () => { alloc.draw(); draw(); };
  draw();
  const el = h('section', { class: 'card wide ng22-attrs', id: 'ng20-past' },
    h('h3', null, t(l('Atributos', 'Attributes')), ' ', helpTip('attrs')),
    h('div', { class: 'ng22-attrs-grid' },
      h('div', null, h('h4', null, t(l('Distribua seus pontos', 'Spend your points'))), alloc.el),
      h('div', null, h('h4', null, t(l('O que o seu passado soma', 'What your past adds up to'))), sum)),
    h('details', { class: 'ng22-prev' }, h('summary', null, h('b', null, t(l('Prévia rápida: a ficha que você vai ter no começo', 'Quick preview: the sheet you will start with'))), ' ', h('small', { class: 'muted' }, t(l('(simulada com as suas escolhas)', '(simulated with your choices)')))), prev));
  return { el, redraw };
}
