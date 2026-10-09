// Interface: casa de shows própria, residência em cassino e megaeventos beneficentes.

import { CITIES, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  MEGA_EVENTS, RESIDENCY_MIN_YEARS, VENUE_KINDS, buyVenue, cancelResidency, liveOf, residencyCity, residencyEligible, residencyNight, sellVenue, setVenueAgenda, startResidency,
  upgradeCost, upgradeVenue, venueKind, venueMonthEstimate,
} from '../../../sim/sys/live';
import type { GameState } from '../../../sim/types';
import { money, playerActs } from '../../../sim/util';
import { $, N, actLink, cityName, pill, rerender, section, toast } from '../../common';
import { h, select } from '../../dom';
import { registerSection } from '../../registry';
import { chips, ic, meter, stat } from '../../vis';

const buy = { kind: 'club' as 'club' | 'theater' | 'arena', city: '', name: '' };

function venueSection(s: GameState): HTMLElement {
  const v = liveOf(s).venue;
  if (!v) {
    buy.city ||= s.config.homeCity;
    const k = venueKind(buy.kind);
    const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
    return section(t(l('Casa de shows própria', 'Your own venue')),
      h('p', { class: 'muted small' }, t(l('Compre um clube, teatro ou arena: alugue datas a terceiros, toque com seus artistas, invista em bar e acústica. Renda mensal.', 'Buy a club, theatre or arena: rent dates to others, play your own acts, invest in the bar and acoustics. Monthly income.'))),
      h('div', { class: 'lv-form' },
        h('label', null, t(l('Tipo', 'Type')), select(buy.kind, VENUE_KINDS.filter((x) => s.year >= x.minYear).map((x) => ({ value: x.id, label: `${t(x.name)} · ${N(x.cap)} · ${$(money(s, x.price))}` })), (val) => { buy.kind = val; rerender(); })),
        h('label', null, t(l('Cidade', 'City')), select(buy.city, cities.map((c) => ({ value: c.id, label: cityName(c.id) })), (val) => (buy.city = val))),
        h('label', null, t(l('Nome', 'Name')), h('input', { type: 'text', maxlength: 40, value: buy.name, placeholder: t(l('(automático)', '(automatic)')), oninput: (e: Event) => (buy.name = (e.target as HTMLInputElement).value) })),
        h('button', { class: 'btn primary', disabled: s.player.cash < money(s, k.price), onclick: () => { const r = buyVenue(s, buy.kind, buy.city, buy.name); if ('pt' in r) toast(t(r), 'bad'); else toast(t(l('Casa comprada!', 'Venue bought!')), 'good'); rerender(); } }, ic('house'), ' ', t(l('Comprar ({p})', 'Buy ({p})'), { p: $(money(s, k.price)) })),
      ),
    );
  }
  const k = venueKind(v.kind);
  const e = venueMonthEstimate(s, v);
  const mine = playerActs(s);
  const net = e.rent + e.bar + e.own - e.upkeep;
  return section(t(l('Casa de shows: {n}', 'Venue: {n}'), { n: v.name }),
    h('p', null, pill(t(k.name)), pill(cityName(v.cityId)), pill(t(l('{n} lugares', '{n} seats'), { n: N(k.cap) }))),
    chips(stat('money', $(e.rent), l('Aluguel a terceiros/mês', 'Third-party rentals/month')), stat('money', $(e.bar), l('Bar/mês', 'Bar/month')), stat('money', $(e.own), l('Shows próprios/mês', 'Own shows/month')),
      stat('money', $(-e.upkeep), l('Manutenção/mês', 'Upkeep/month'), 'bad'), stat('sparkle', $(net), l('Resultado previsto/mês', 'Expected result/month'), net >= 0 ? 'good' : 'bad')),
    meter('fans', l('Ocupação das noites alugadas', 'Rented nights occupancy'), Math.round(e.occupancy * 100)),
    h('div', { class: 'lv-form' },
      h('label', null, t(l('Noites alugadas/mês', 'Rented nights/month')), select(v.rentalNights, [0, 4, 8, 12, 16, 20, 24].map((n) => ({ value: n, label: String(n) })), (n) => { setVenueAgenda(s, n, v.ownActId, v.ownNights); rerender(); })),
      h('label', null, t(l('Artista da casa', 'House act')), select(v.ownActId ?? '', [{ value: '', label: '—' }, ...mine.map((id) => ({ value: id, label: s.acts[id].name }))], (id) => { setVenueAgenda(s, v.rentalNights, id || undefined, v.ownNights || 2); rerender(); })),
      v.ownActId ? h('label', null, t(l('Noites do artista/mês', 'Act nights/month')), select(v.ownNights, [0, 1, 2, 4, 6, 8].map((n) => ({ value: n, label: String(n) })), (n) => { setVenueAgenda(s, v.rentalNights, v.ownActId, n); rerender(); })) : null,
    ),
    h('div', { class: 'row' },
      h('button', { class: 'btn small', disabled: v.bar >= 3, onclick: () => { const r = upgradeVenue(s, 'bar'); if (r) toast(t(r), 'bad'); rerender(); } }, `🍺 ${t(l('Bar', 'Bar'))} ${v.bar}/3 · ${$(upgradeCost(s, v, 'bar'))}`),
      h('button', { class: 'btn small', disabled: v.acoustics >= 3, onclick: () => { const r = upgradeVenue(s, 'acoustics'); if (r) toast(t(r), 'bad'); rerender(); } }, `🔊 ${t(l('Acústica', 'Acoustics'))} ${v.acoustics}/3 · ${$(upgradeCost(s, v, 'acoustics'))}`),
      h('button', { class: 'btn small ghost', onclick: () => { if (!confirm(t(l('Vender a casa por 60% do preço?', 'Sell the venue for 60% of the price?')))) return; sellVenue(s); rerender(); } }, t(l('Vender', 'Sell'))),
    ),
    h('p', { class: 'small muted' }, t(l('A acústica também melhora a empolgação e a procura dos seus shows de turnê nesta cidade.', 'Acoustics also boost excitement and demand for your tour shows in this city.'))),
    v.history.length ? h('p', { class: 'small' }, t(l('Últimos meses: {x}', 'Last months: {x}'), { x: v.history.slice(-6).map((x) => $(x.revenue - x.costs)).join(' · ') })) : null,
  );
}

function residencySection(s: GameState): HTMLElement | null {
  const lv = liveOf(s);
  const acts = playerActs(s).map((id) => s.acts[id]);
  const active = lv.residencies.filter((x) => x.status === 'active');
  if (!acts.length && !active.length) return null;
  return section(t(l('Residência em cassino', 'Casino residency')),
    h('p', { class: 'muted small' }, t(l('Temporadas fixas para veteranos ({n}+ anos de carreira): renda estável, sem viagens; ocupa a agenda e cansa a criatividade.', 'Fixed seasons for veterans ({n}+ career years): steady income, no travel; fills the calendar and dulls creativity.'), { n: RESIDENCY_MIN_YEARS })),
    active.map((r) => h('div', { class: 'row' }, ic('clock'), actLink(s, r.actId), ` · ${cityName(r.cityId)} · ${t(l('{m} meses, {n} noites/mês', '{m} months, {n} nights/month'), { m: r.months, n: r.nights })} · ${$(r.earned)}`,
      h('button', { class: 'btn small ghost', onclick: () => { cancelResidency(s, r.id); rerender(); } }, t(l('Encerrar', 'End'))))),
    h('div', { class: 'cards' }, acts.filter((a) => !active.some((r) => r.actId === a.id)).map((a) => {
      const why = residencyEligible(s, a);
      const n = residencyNight(s, a);
      return h('div', { class: 'tile' }, h('div', { class: 'tile-body' },
        h('b', null, a.name),
        h('small', { class: 'muted' }, why ? t(why) : t(l('{c}: ~{p} pessoas/noite, {g} brutos/noite', '{c}: ~{p} people/night, {g} gross/night'), { c: cityName(residencyCity(s, a)), p: N(n.attendance), g: $(n.gross) })),
        h('div', { class: 'row' }, [3, 6, 12].map((m) => h('button', { class: 'btn small', disabled: !!why, onclick: () => { const r = startResidency(s, a.id, m); if ('pt' in r) toast(t(r), 'bad'); else toast(t(l('Residência assinada: começa no mês que vem.', 'Residency signed: starts next month.')), 'good'); rerender(); } }, t(l('{m} meses', '{m} months'), { m })))),
      ));
    })),
  );
}

function megaSection(s: GameState): HTMLElement | null {
  const lv = liveOf(s);
  const next = MEGA_EVENTS.find((x) => x.year === s.year);
  if (!lv.mega.length && !next) return null;
  return section(t(l('Megaeventos beneficentes', 'Benefit mega-events')),
    h('p', { class: 'muted small' }, t(l('Shows globais transmitidos ao vivo: convite para o seu artista mais famoso (fama 35+). Sem cachê; reputação enorme e catálogo vendendo mais por três meses.', 'Live global broadcasts: an invitation for your most famous act (fame 35+). No fee; huge reputation and catalog sales up for three months.'))),
    next ? h('p', { class: 'small' }, ic('globe'), ' ', t(l('Este ano: {n} ({c})', 'This year: {n} ({c})'), { n: next.name, c: cityName(next.city) })) : null,
    lv.mega.length ? h('ul', { class: 'small' }, lv.mega.slice().reverse().map((m) => h('li', null, `${m.year} · ${m.name} · `, actLink(s, m.actId), ' ', m.accepted ? pill(t(l('tocou', 'played')), 'good') : pill(t(l('convite', 'invited'))))) ) : null,
  );
}

registerSection('shows', { id: 'live-venue', order: 45, render: (s) => venueSection(s) });
registerSection('shows', { id: 'live-residency', order: 46, render: (s) => residencySection(s) });
registerSection('shows', { id: 'live-mega', order: 47, render: (s) => megaSection(s) });
