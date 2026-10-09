// Interface da rodada 8: visão geral de direitos do catálogo (negócios) e dossiês de A&R (mercado).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { CONTRACT_MODELS } from '../../data/rules';
import { MASTER_NAME, catalogValue, revertWeek, rightsOf, rst } from '../../sim/rights';
import type { GameState } from '../../sim/types';
import { yearOfWeek } from '../../sim/util';
import { $, actLink, modal, pill, releaseLink, rerender, section } from '../common';
import { h } from '../dom';
import { dossierTab } from '../dossierView';
import { registerTab } from '../registry';
import { rightsSheet } from '../rightsView';
import '../rights8.css';

function openSheet(s: GameState, contractId: string): void {
  const c = s.contracts[contractId];
  if (!c) return;
  const wrap = h('div');
  const draw = () => { wrap.replaceChildren(rightsSheet(s, c, () => { draw(); rerender(); })); };
  draw();
  modal(`${t(l('Direitos', 'Rights'))}: ${s.acts[c.actId]?.name ?? ''}`, wrap, { wide: true });
}

function rightsOverview(s: GameState): HTMLElement {
  const cv = catalogValue(s);
  const deals = Object.values(s.contracts).filter((c) => c.party === 'player' && s.acts[c.actId] && !s.acts[c.actId].playerBand).sort((a, b) => b.startWeek - a.startWeek);
  const demands = rst(s).demands;
  return h('div', null,
    section(t(l('Valor do catálogo', 'Catalog value')),
      h('p', null, t(l('Estimativa: {v} — {p} em masters perpétuos e {r} em masters que um dia voltam aos artistas.', 'Estimate: {v} — {p} in perpetual masters and {r} in masters that will one day revert.'), { v: $(cv.value), p: $(cv.perpetual), r: $(cv.reverting) })),
      h('p', { class: 'muted small' }, t(l('Receita anual × anos de direito restantes (até 8×). Masters revertidos saem do cálculo; co-propriedade conta pela metade.', 'Annual revenue × remaining years of rights (up to 8×). Reverted masters drop out; co-ownership counts half.'))),
      cv.rows.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Disco', 'Record'))), h('th', null, t(l('Ato', 'Act'))), h('th', null, t(l('Receita/ano', 'Revenue/yr'))), h('th', null, t(l('Direito', 'Rights'))), h('th', null, t(l('Valor', 'Value'))))),
        h('tbody', null, cv.rows.slice(0, 15).map((x) => h('tr', null, h('td', null, releaseLink(s, x.rel.id)), h('td', null, actLink(s, x.rel.actId)), h('td', null, $(x.annual)),
          h('td', null, x.years === Infinity ? t(l('perpétuo', 'perpetual')) : `${Math.round(x.years)} ${t(l('anos', 'yrs'))}`), h('td', null, $(x.value)))))) : null,
    ),
    demands.length ? section(t(l('Pedidos de renegociação', 'Renegotiation requests')), h('div', { class: 'row wrap' }, demands.map((d) => h('button', { class: 'btn small primary', onclick: () => openSheet(s, d.contractId) }, s.acts[d.actId]?.name ?? '?', ' — ', t(l('responder', 'respond')))))) : null,
    section(t(l('Acordos e direitos', 'Deals and rights')),
      deals.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Ato', 'Act'))), h('th', null, t(l('Modelo', 'Model'))), h('th', null, t(l('Master', 'Master'))), h('th', null, t(l('Reversão', 'Reversion'))), h('th', null, t(l('Não recuperado', 'Unrecouped'))), h('th', null, ''), h('th', null, ''))),
        h('tbody', null, deals.slice(0, 40).map((c) => {
          const rw = revertWeek(c);
          const active = c.endWeek > s.week && s.acts[c.actId]?.contractId === c.id;
          return h('tr', null, h('td', null, actLink(s, c.actId)), h('td', null, t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name)), h('td', null, t(MASTER_NAME[rightsOf(c).master])),
            h('td', null, c.reverted ? t(l('revertido', 'reverted')) : rw === Infinity ? '—' : String(yearOfWeek(s, rw))),
            h('td', { class: c.recoupBalance > 0 ? 'bad' : '' }, $(c.recoupBalance)),
            h('td', null, c.reverted ? pill(t(l('do artista', 'artist\'s')), 'bad') : active ? pill(t(l('ativo', 'active')), 'good') : pill(t(l('encerrado', 'ended')))),
            h('td', null, h('button', { class: 'btn small ghost', onclick: () => openSheet(s, c.id) }, t(l('Ficha', 'Sheet')))));
        }))) : h('p', { class: 'muted small' }, t(l('Nenhum acordo ainda.', 'No deals yet.'))),
    ),
    rst(s).reversions.length ? section(t(l('Reversões recentes', 'Recent reversions')), h('ul', { class: 'small' }, rst(s).reversions.slice().reverse().map((x) => h('li', null, `${yearOfWeek(s, x.week)} · `, actLink(s, x.actId), ` · ${x.n} master(s)`)))) : null,
  );
}

registerTab('business', { id: 'rights8', label: l('Direitos', 'Rights'), icon: 'contract', render: rightsOverview, badge: (s) => rst(s).demands.length || undefined });
registerTab('marketHub', { id: 'dossier8', label: l('Dossiês e faro de A&R', 'Dossiers and A&R instinct'), icon: 'fans', render: dossierTab });
