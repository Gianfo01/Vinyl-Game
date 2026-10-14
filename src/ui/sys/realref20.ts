// r20 (novarun §9.2): página do artista separa "Referência real" (identidade documentada, só artistas reais e só
// fatos até o ano corrente) de "Nesta partida" (catálogo, gravadora, contrato e trajetória simulados).
// No mundo aleatório ("Reais em mundo aleatório") a referência é só informativa: nada real anterior ao início virou fato.

import { countryName } from '../../data/geo';
import { l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { realRef20, thisRun20 } from '../../sim/prov20';
import type { Act, GameState } from '../../sim/types';
import { N, cityName, kv, pill, section, statusName } from '../common';
import { h } from '../dom';
import { openRelease } from '../ficha';
import { provBadge20 } from '../provbadge20';
import { ent27 } from '../ps/ent27';

const TYPE20: Record<string, string> = { lp: 'LP', ep: 'EP', single: 'Single' };

export function realRefPanel20(s: GameState, a: Act): HTMLElement {
  const ref = realRef20(s, a);
  const run = thisRun20(s, a);
  const refBox = ref
    ? section(t(l('Referência real', 'Real reference')),
      h('p', { class: 'muted small' }, t(ref.infoOnly
        ? l('Só para consulta: nesta partida ("Reais em mundo aleatório") nada da cronologia real anterior ao início foi restaurado — identidade real, carreira simulada.', 'Reference only: in this run ("Real acts in a random world") nothing from the real pre-start chronology was restored — real identity, simulated career.')
        : l('Fatos documentados até o ano corrente (nada do futuro). Não muda a simulação: as vendas e a carreira desta partida estão ao lado.', 'Documented facts up to the current year (nothing from the future). It does not drive the simulation: this run\'s sales and career are alongside.'))),
      kv(t(l('Nome', 'Name')), ref.name),
      ref.city || ref.country ? kv(t(l('Origem', 'Origin')), [ref.city ? cityName(ref.city) : '', ref.country ? t(countryName(ref.country)) : ''].filter(Boolean).join(' · ')) : null,
      ref.born !== undefined ? kv(t(l('Nascimento', 'Born')), String(ref.born)) : null,
      ref.died !== undefined ? kv(t(l('Morte', 'Died')), String(ref.died)) : null,
      ref.debut !== undefined ? kv(t(l('Estreia (era)', 'Debut (era)')), `${ref.debut} · ${t(l('anos {d}', 'the {d}s'), { d: Math.floor(ref.debut / 10) * 10 })}`) : null,
      ref.ended !== undefined ? kv(t(l('Encerrou', 'Ended')), String(ref.ended)) : null,
      ref.members.length ? kv(t(l('Formação documentada', 'Documented line-up')), ref.members.map((m) => `${m.name}${m.periods ? ` (${m.periods.map(([a, b]) => `${a ?? ''}–${b ?? ''}`).join(', ')})` : m.left !== undefined ? ` (${t(l('até', 'until'))} ${m.left})` : ''}`).join(', ')) : null,
      h('h5', null, t(l('Discos e sucessos reais (referência)', 'Real records and hits (reference)'))),
      ref.hits.length
        ? h('ul', { class: 'small ref20-hits' }, ref.hits.map((x) => h('li', null, `${x.year} · ${x.title} · ${TYPE20[x.type]}`)))
        : h('p', { class: 'muted small' }, t(l('Nenhum disco documentado até este ano.', 'No documented record up to this year.'))),
      h('p', { class: 'muted small' }, t(l('Gravadoras reais não constam da base; a gravadora desta partida está em "Nesta partida".', 'Real labels are not in the database; this run\'s label is under "In this run".'))))
    : section(t(l('Referência real', 'Real reference')), h('p', { class: 'muted small' }, t(a.catalogNo && !s.config.realNames
      ? l('Nomes reais desligados nesta partida: o ato é ficcional e não tem referência real exibida.', 'Real names are off in this run: the act is fictional and shows no real reference.')
      : l('Ato gerado: sem referência real. Tudo aqui é desta partida.', 'Generated act: no real reference. Everything here is from this run.'))));
  const runBox = section(t(l('Nesta partida', 'In this run')),
    kv(t(l('Situação', 'Status')), statusName(run.status)),
    kv(t(l('Estreia na partida', 'Debut in the run')), String(run.debut)),
    kv(t(S.owner), run.label || t(l('independente', 'independent'))),
    run.contract ? kv(t(S.contract), `${Math.round(run.contract.royalty * 100)}% · ${Math.max(0, Math.round((run.contract.endWeek - s.week) / 4.35))} ${t(l('meses restantes', 'months left'))}`) : null,
    kv(t(l('Catálogo', 'Catalog')), h('span', null, `${run.doc + run.sim} · `, pill(`${run.sim} ${t(l('simulados', 'simulated'))}`), ' ', run.doc ? pill(`${run.doc} ${t(l('documentados', 'documented'))}`, 'gold') : null)),
    kv(t(l('Trajetória', 'Trajectory')), `${t(l('fama', 'fame'))} ${Math.round(run.fame)} · ${run.hits} hits · ${run.number1s}× #1 · ${t(l('melhor posição', 'best peak'))} ${run.peak < 999 ? `#${run.peak}` : '—'}`),
    run.careerEnd !== undefined ? kv(t(l('Fim de carreira', 'Career end')), String(run.careerEnd)) : null,
    run.latest.length
      ? h('ul', { class: 'small ref20-rels' }, run.latest.map((r) => h('li', null, h('button', { ...ent27('release', r.id), class: 'link', onclick: () => openRelease(r.id) }, `${r.year} · ${r.title}`), ' ', provBadge20(s, r), ' ', h('span', { class: 'muted' }, N(r.totalUnits)))))
      : h('p', { class: 'muted small' }, t(l('Ainda sem lançamentos nesta partida.', 'No releases in this run yet.'))),
    run.doc ? h('p', { class: 'muted small' }, t(l('"Documentado" = disco real posto pelo roteiro documentado; os números de venda são sempre da simulação.', '"Documented" = real record placed by the documented script; sales figures always come from the simulation.'))) : null,
  );
  return h('div', { class: 'grid2 ref20' }, refBox, runBox);
}


// r21: a aba "Real × partida" saiu da ficha (pedido do jogador); o painel fica disponível para quem quiser reusá-lo.
