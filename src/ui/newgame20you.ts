// Rodada 20c (N1): "Você e seu começo" — bloco único "Passado profissional" (trajetória + origem, bônus somados
// e mostrados uma vez) e a seção recolhida "Personalizar personagem" (aparência, bio, atributos, traços, habilidades).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { formatMoney, nominal } from '../core/money';
import { locale } from '../i18n/strings';
import type { RunConfig } from '../sim/types';
import type { PerkKey } from '../sim/perks';
import { ORIGINS as TRAJS, originById, type OriginId } from '../sim/sys/identity/data';
import { ORIGINS as CAREER_ORIGINS, ORIGIN_CONTACTS, type Origin } from '../sim/sys/careers12';
import { SRC20, defaultCareers20, defaultCharacter20, pastOf20, setTrajectory20, type Line20, type Part20 } from '../sim/past20';
import { careerOfSpec } from '../sim/sys/persona';
import { h, select } from './dom';
import { helpTip } from './newgame13';
import { PERK_NAMES, fmtPerk } from './sys/persona';
import { characterCard } from './charCreate';

const ATTR: Record<string, L> = { ear: l('Ouvido', 'Ear'), negotiation: l('Negociação', 'Negotiation'), charisma: l('Carisma', 'Charisma'), management: l('Gestão', 'Management') };
const REP: Record<string, L> = { institutional: l('Reputação institucional', 'Institutional reputation'), artists: l('Reputação com artistas', 'Reputation with artists') };
const CONTACT: Record<string, L> = { studio: l('estúdios', 'studios'), producer: l('produtores', 'producers'), booking: l('agências', 'booking'), festival: l('festivais', 'festivals'), label: l('gravadoras', 'labels'), media: l('mídia', 'media') };
/** chaves em que número menor é melhor (mesma regra da tabela de bônus) */
const LOWER_GOOD = new Set<string>(['stress', 'pressingCost', 'staffCost', 'advance']);

const sgn = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v)}`;
const partsText = (ps: Part20[], fmt: (v: number) => string) => ps.length > 1 ? ` (${ps.map((p) => `${t(SRC20[p.src])} ${fmt(p.v)}`).join(' · ')})` : ` (${t(SRC20[ps[0].src])})`;

function lineEl(name: string, x: Line20, fmt: (v: number) => string, lowerGood = false): HTMLElement {
  const good = (x.total > 0) !== lowerGood;
  return h('li', null, h('span', null, name, ' '), h('b', { class: x.total ? (good ? 'good' : 'bad') : 'muted' }, fmt(x.total)), h('small', { class: 'muted' }, partsText(x.parts, fmt)));
}

/** Bloco único: trajetória + origem com explicação de cada uma e os bônus somados (cada bônus uma vez). */
export function pastCard20(cfg: RunConfig, onTraj: () => void): HTMLElement {
  const ch = (cfg.character ??= defaultCharacter20());
  const c = (cfg.careers ??= defaultCareers20());
  const sum = h('div', { class: 'ng20-past-sum', 'aria-live': 'polite' });
  const trajInfo = h('div', { class: 'small' });
  const origInfo = h('div', { class: 'small' });
  const draw = () => {
    const P = pastOf20(cfg);
    const T = originById[P.traj];
    trajInfo.replaceChildren(
      h('p', { class: 'muted' }, t(T.desc)),
      h('p', null, h('b', null, t(l('Contatos: ', 'Contacts: '))), t(T.contacts)),
      h('p', null, h('b', null, t(l('Vantagem: ', 'Advantage: '))), t(T.advantages)),
      h('p', { class: 'bad' }, h('b', null, t(l('Preço: ', 'Price: '))), t(T.drawbacks)));
    const ct = Object.entries(ORIGIN_CONTACTS[P.origin] ?? {}).filter(([, v]) => v).map(([k, v]) => `${t(CONTACT[k] ?? l(k, k))} ${v}`).join(' · ');
    origInfo.replaceChildren(h('p', null, h('b', null, t(l('Contatos de saída (0–40): ', 'Starting contacts (0–40): '))), ct || '—'));
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
    sum.replaceChildren(h('h4', { class: 'ng20-past-h' }, t(l('O que o seu passado soma', 'What your past adds up to'))),
      h('p', { class: 'muted small' }, t(l('Cada bônus aparece uma vez, já somado; entre parênteses, de onde vem cada parte. Valores em dinheiro de {y}.', 'Each bonus appears once, already added up; in brackets, where each part comes from. Money in {y} dollars.'), { y: yr })),
      h('div', { class: 'ng20-past-grid' }, ...lists));
  };
  const trajSel = select<string>(careerOfSpec(ch), TRAJS.map((o) => ({ value: o.id, label: t(o.name) })), (id) => { setTrajectory20(ch, id as OriginId); draw(); onTraj(); }, { 'aria-label': t(l('Trajetória', 'Path')) });
  const origSel = select<Origin>(c.origin as Origin, (Object.keys(CAREER_ORIGINS) as Origin[]).map((k) => ({ value: k, label: t(CAREER_ORIGINS[k].name) })), (k) => { c.origin = k; draw(); }, { 'aria-label': t(l('Origem', 'Origin')) });
  draw();
  return h('section', { class: 'card wide ng20-past', id: 'ng20-past' },
    h('h3', null, t(l('Passado profissional', 'Professional past')), ' ', helpTip(l('Duas escolhas, um passado. A trajetória diz como você entrou na indústria (base da ficha, instrumento, patrimônio, dívidas, contatos e o perfil do selo). A origem diz o que você fazia antes de ter um negócio (ajustes de atributos e dinheiro, bônus permanentes e contatos no mercado de serviços). As duas valem; os bônus iguais se somam e aparecem uma vez no resumo.', 'Two choices, one past. The path is how you got into the industry (sheet base, instrument, wealth, debts, contacts and label profile). The origin is what you did before running a business (attribute and money tweaks, permanent bonuses and contacts in the services market). Both apply; matching bonuses add up and appear once in the summary.'))),
    h('div', { class: 'ng20-past-cols' },
      h('div', null,
        h('label', null, h('b', null, t(l('Trajetória — como você entrou na indústria', 'Path — how you got into the industry'))), trajSel),
        trajInfo),
      h('div', null,
        h('label', null, h('b', null, t(l('Origem — o que você fazia antes do negócio', 'Origin — what you did before the business'))), origSel),
        origInfo)),
    sum);
}

/** Seção recolhida com a ficha completa (aparência, bio, atributos, traços, habilidades). Nada sai da ficha. */
export function personalize20(cfg: RunConfig): { el: HTMLElement; redraw: () => void } {
  const body = h('div', { class: 'ng20-perso-body' });
  const redraw = () => body.replaceChildren(characterCard(cfg, { path: false }));
  redraw();
  const el = h('details', { class: 'card wide ng20-perso', id: 'ng20-perso' },
    h('summary', null, h('b', null, t(l('Personalizar personagem', 'Customize character'))), ' ',
      h('small', { class: 'muted' }, t(l('— nome, aparência, vida pessoal, crenças, ajuste de atributos, traços e habilidades (opcional)', '— name, look, personal life, beliefs, attribute tuning, traits and abilities (optional)')))),
    body);
  return { el, redraw };
}
