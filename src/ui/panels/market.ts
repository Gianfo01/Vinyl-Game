// Mercado: scouting em graus, pipeline, rivais e profissionais (GDD §10, §19).

import { STAFF_ROLES } from '../../data/rules';
import { FAMILIES, MARKETS, cityById, l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { hireStaff } from '../../sim/economy';
import { DEGREES, STAGES, canScout, dropSignal, estimate, requestScout, scoutActionsPerMonth, scoutAct, scoutCost, scoutRequestCost, setStage, sourceName, syncPipeline } from '../../sim/scouting';
import { acceptCounter, withdrawOffer } from '../../sim/contracts';
import type { GameState, Knowledge } from '../../sim/types';
import { $, actLink, cityName, genreName, labelLink, logo, pill, rerender, section, toast } from '../common';
import { h, rangeBar, select } from '../dom';
import { openOffer } from '../ficha';
import { openDossier } from '../dossierView';
import { store } from '../store';
import { hqCaps } from '../../sim/branches';
import { crewProfileCell } from '../sys/crew8';

export function marketPanel(s: GameState): HTMLElement {
  const tabs: [typeof store.marketTab, string][] = [
    ['scouting', t(S.scouting)],
    ['pipeline', t(S.pipeline)],
    ['rivals', t(S.rivals)],
    ['professionals', t(S.professionals)],
  ];
  const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', { role: 'tab', 'aria-selected': store.marketTab === id ? 'true' : 'false', class: store.marketTab === id ? 'on' : '', onclick: () => { store.marketTab = id; rerender(); } }, label)));
  let body: HTMLElement;
  if (s.config.role === 'artist' && (store.marketTab === 'scouting' || store.marketTab === 'pipeline')) store.marketTab = 'rivals';
  if (store.marketTab === 'scouting') body = scouting(s);
  else if (store.marketTab === 'pipeline') body = pipeline(s);
  else if (store.marketTab === 'rivals') body = rivals(s);
  else body = professionals(s);
  return h('div', { class: 'panel market' }, tabBar, body);
}

function signalCard(s: GameState, k: Knowledge): HTMLElement {
  const a = s.acts[k.actId];
  const pot = estimate(s, a.id, 'potential');
  const tal = estimate(s, a.id, 'talent');
  const fame = estimate(s, a.id, 'fame');
  const chk = canScout(s, a.id);
  const age = Math.round((s.week - k.updatedWeek) / 4.35);
  return h('article', { class: 'signal' },
    h('header', null, logo(a, 36), h('div', null, actLink(s, a.id), h('div', { class: 'muted small' }, `${genreName(a.genre)} · ${cityName(a.city)} · ${a.members.length > 1 ? t(S.band) : t(S.solo)}`)),
      a.owner ? pill(t(l('contratado', 'signed')), 'bad') : null),
    h('div', { class: 'small' }, t(S.degree), ': ', pill(`${k.degree}/5 ${t(DEGREES[k.degree - 1])}`), ' ', h('span', { class: 'muted' }, `${t(S.source)}: ${t(sourceName(k.source))} · ${age} ${t(l('meses', 'months'))}`)),
    h('div', { class: 'est' },
      h('div', null, t(S.fame), ': ', fame ? `${fame.lo}–${fame.hi}` : '?'),
      h('div', null, t(S.talent), ': ', tal ? h('span', null, `${tal.lo}–${tal.hi} `, rangeBar(tal.lo, tal.hi)) : h('span', { class: 'muted' }, t(S.hidden))),
      h('div', null, t(S.potential), ': ', pot ? h('span', null, `${pot.lo}–${pot.hi} `, rangeBar(pot.lo, pot.hi, 'pot')) : h('span', { class: 'muted' }, t(S.hidden))),
    ),
    h('div', { class: 'actions' },
      h('button', { class: 'btn small', disabled: !chk.ok, title: chk.reason ? t(chk.reason) : '', onclick: () => { scoutAct(s, a.id); rerender(); } }, `${t(S.deepen)} (${$(scoutCost(s, k.degree))})`),
      h('button', { class: 'btn small', onclick: () => openDossier(a.id) }, t(l('Dossiê', 'Dossier'))),
      !a.owner ? h('button', { class: 'btn small primary', onclick: () => openOffer(a.id) }, t(S.makeOffer)) : null,
      h('button', { class: 'btn small ghost', onclick: () => { dropSignal(s, a.id); rerender(); } }, t(S.drop)),
    ),
  );
}

let scoutFilter = { q: '', sort: 'degree' as 'degree' | 'potential' | 'fame' | 'recent', hideSigned: true };

function sortedKnowledge(s: GameState): Knowledge[] {
  const q = scoutFilter.q.trim().toLowerCase();
  const pot = (k: Knowledge) => estimate(s, k.actId, 'potential')?.mid ?? -1;
  return Object.values(s.knowledge).filter((k) => {
    const a = s.acts[k.actId];
    if (!a || a.owner === 'player') return false;
    if (scoutFilter.hideSigned && a.owner) return false;
    return !q || a.name.toLowerCase().includes(q) || genreName(a.genre).toLowerCase().includes(q) || cityName(a.city).toLowerCase().includes(q);
  }).sort((a, b) => scoutFilter.sort === 'potential' ? pot(b) - pot(a)
    : scoutFilter.sort === 'fame' ? s.acts[b.actId].fame - s.acts[a.actId].fame
    : scoutFilter.sort === 'recent' ? b.updatedWeek - a.updatedWeek
    : b.degree - a.degree || b.updatedWeek - a.updatedWeek);
}

function filterBar(): HTMLElement {
  return h('div', { class: 'row wrap scout-filter' },
    h('input', { type: 'search', placeholder: t(l('Filtrar por nome, gênero ou cidade…', 'Filter by name, genre or city…')), value: scoutFilter.q, oninput: (e: Event) => { scoutFilter.q = (e.target as HTMLInputElement).value; rerender(); } }),
    select(scoutFilter.sort, [
      { value: 'degree', label: t(l('Ordenar: grau', 'Sort: degree')) },
      { value: 'potential', label: t(l('Ordenar: potencial estimado', 'Sort: estimated potential')) },
      { value: 'fame', label: t(l('Ordenar: alcance', 'Sort: reach')) },
      { value: 'recent', label: t(l('Ordenar: mais recentes', 'Sort: most recent')) },
    ] as { value: typeof scoutFilter.sort; label: string }[], (v) => { scoutFilter.sort = v; rerender(); }),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: scoutFilter.hideSigned, onchange: (e: Event) => { scoutFilter.hideSigned = (e.target as HTMLInputElement).checked; rerender(); } }), t(l('Esconder quem já assinou com rivais', 'Hide acts signed to rivals'))),
  );
}

function scouting(s: GameState): HTMLElement {
  syncPipeline(s);
  const ks = sortedKnowledge(s);
  const req = { genreFamily: 'any', market: 'any', level: 'promising', role: 'any' };
  const used = s.scoutActionsUsed;
  const max = scoutActionsPerMonth(s);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(`${t(S.scouting)} — ${t(S.scoutActions)}: ${max - used}/${max}`,
        h('p', { class: 'muted small' }, t(l('Rumor → observação → acompanhamento → audição → convivência. Cada grau estreita o intervalo e revela campos. Relatórios envelhecem e podem discordar. Ações por mês: 3 + A&R + olheiros + bônus da sede/carta.', 'Rumor → observation → follow-up → audition → close contact. Each degree narrows the range and reveals fields. Reports age and may disagree. Actions per month: 3 + A&R + scouts + HQ/card bonus.'))),
        filterBar(),
        ks.length ? h('div', { class: 'signals' }, ks.map((k) => signalCard(s, k))) : h('p', { class: 'muted' }, t(l('Nenhum sinal ainda. Novos sinais chegam todo mês; contrate A&R, envie um pedido de scout ou siga artistas na aba Todos os artistas.', 'No signals yet. New signals arrive monthly; hire A&R, send a scout request or follow acts in the All artists tab.'))),
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.scoutRequest),
        h('p', { class: 'muted small' }, t(l('Formulário estruturado. Resultado no fim do mês. Usa 1 ação.', 'Structured form. Results at month end. Uses 1 action.'))),
        h('label', null, t(S.family), select('any', [{ value: 'any', label: t(S.any) }, ...FAMILIES.map((f) => ({ value: f.id, label: t(f.name) })).sort((a, b) => a.label.localeCompare(b.label))], (v) => (req.genreFamily = v))),
        h('label', null, t(S.region), select('any', [{ value: 'any', label: t(S.any) }, ...MARKETS.map((m) => ({ value: m.id, label: t(m.name) }))], (v) => (req.market = v))),
        h('label', null, t(S.level), select('promising', [{ value: 'beginner', label: t(S.beginner) }, { value: 'promising', label: t(S.promising) }, { value: 'established', label: t(S.established) }], (v) => (req.level = v))),
        h('label', null, t(S.format), select('any', [{ value: 'any', label: t(S.any) }, { value: 'band', label: t(S.band) }, { value: 'solo', label: t(S.solo) }], (v) => (req.role = v))),
        h('button', { class: 'btn', disabled: used >= max, onclick: () => { if (!requestScout(s, req)) toast(t(l('Sem ações ou caixa.', 'No actions or cash.')), 'bad'); else toast(t(l('Pedido enviado: os nomes chegam no fechamento do mês.', 'Request sent: names arrive at month end.')), 'good'); rerender(); } }, `${t(S.send)} (${$(scoutRequestCost(s))})`),
        s.scoutRequests.length ? h('p', { class: 'small' }, t(l('Pedidos em andamento: {n}', 'Requests in progress: {n}'), { n: s.scoutRequests.length })) : null,
      ),
    ),
  );
}

const STAGE_ORDER: Knowledge['stage'][] = ['signal', 'monitoring', 'investigating', 'offer', 'negotiation'];

function pipeCard(s: GameState, k: Knowledge): HTMLElement {
  const a = s.acts[k.actId];
  const i = STAGE_ORDER.indexOf(k.stage);
  const manual = i <= 2;
  const pot = estimate(s, a.id, 'potential');
  const tal = estimate(s, a.id, 'talent');
  const chk = canScout(s, a.id);
  const offer = s.offers.find((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'));
  return h('div', { class: `kcard ${a.owner ? 'signed' : ''}` },
    h('div', { class: 'row' }, logo(a, 24), actLink(s, a.id), h('small', { class: 'muted' }, ` ${k.degree}/5`)),
    h('small', { class: 'muted' }, `${genreName(a.genre)} · ${cityName(a.city)} · ★${Math.round(a.fame)}`),
    h('small', null, `${t(S.talent)} ${tal ? `${tal.lo}–${tal.hi}` : '?'} · ${t(S.potential)} ${pot ? `${pot.lo}–${pot.hi}` : '?'}`),
    a.owner ? pill(t(l('assinou com rival', 'signed to a rival')), 'bad') : null,
    offer ? h('small', null, offer.status === 'counter' ? pill(t(l('contraproposta', 'counter-offer')), 'warn') : pill(t(l('aguardando resposta', 'awaiting answer'))), ` ${$(offer.advance)}`) : null,
    h('div', { class: 'row wrap kact' },
      manual && i > 0 ? h('button', { class: 'btn small ghost', title: t(l('Coluna anterior', 'Previous column')), onclick: () => { setStage(s, a.id, STAGE_ORDER[i - 1]); rerender(); } }, '←') : null,
      manual && i < 2 ? h('button', { class: 'btn small ghost', title: t(l('Próxima coluna', 'Next column')), onclick: () => { setStage(s, a.id, STAGE_ORDER[i + 1]); rerender(); } }, '→') : null,
      !a.owner && k.degree < 5 ? h('button', { class: 'btn small', disabled: !chk.ok, title: chk.reason ? t(chk.reason) : '', onclick: () => { scoutAct(s, a.id); rerender(); } }, `${t(S.deepen)} ${$(scoutCost(s, k.degree))}`) : null,
      offer?.status === 'counter' ? h('button', { class: 'btn small primary', onclick: () => { if (!acceptCounter(s, offer.id)) toast(t(l('Não foi possível aceitar (caixa?).', 'Could not accept (cash?).')), 'bad'); syncPipeline(s); rerender(); } }, t(S.acceptCounter)) : null,
      offer ? h('button', { class: 'btn small ghost', onclick: () => { withdrawOffer(s, offer.id); s.offers = s.offers.filter((x) => x !== offer); syncPipeline(s); rerender(); } }, t(S.withdraw)) : null,
      !offer && !a.owner ? h('button', { class: 'btn small primary', onclick: () => openOffer(a.id) }, t(S.makeOffer)) : null,
      h('button', { class: 'btn small ghost', title: t(l('Dossiê de A&R', 'A&R dossier')), onclick: () => openDossier(a.id) }, '🔍'),
      !offer ? h('button', { class: 'btn small ghost', title: t(S.drop), onclick: () => { dropSignal(s, a.id); rerender(); } }, '✕') : null,
    ),
  );
}

function pipeline(s: GameState): HTMLElement {
  syncPipeline(s);
  const ks = sortedKnowledge(s);
  const max = scoutActionsPerMonth(s);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Mova os nomes entre Sinais, Monitorando e Investigando com as setas. Oferta e Negociação acompanham as ofertas de verdade: faça uma oferta e o card anda sozinho; uma contraproposta leva a Negociação. Ações de scouting restantes: {n}/{m}.', 'Move names between Signals, Monitoring and Investigating with the arrows. Offer and Negotiation follow real offers: make an offer and the card moves; a counter-offer moves it to Negotiation. Scouting actions left: {n}/{m}.'), { n: max - s.scoutActionsUsed, m: max })),
    filterBar(),
    h('div', { class: 'kanban' }, STAGE_ORDER.map((st) => {
      const col = ks.filter((k) => k.stage === st);
      return h('div', { class: 'kcol' }, h('h4', null, t(STAGES[st]), ` (${col.length})`),
        col.length ? col.slice(0, 40).map((k) => pipeCard(s, k)) : h('p', { class: 'muted small' }, '—'),
        col.length > 40 ? h('small', { class: 'muted' }, `+${col.length - 40}`) : null);
    })),
  );
}

function rivals(s: GameState): HTMLElement {
  const labels = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.revenueLastYear - a.revenueLastYear);
  const famName: Record<string, string> = { A: t(l('Estrelas e escala', 'Stars & scale')), B: t(l('Descoberta e cenas', 'Discovery & scenes')), C: t(l('Hits e comunicação', 'Hits & publicity')), D: t(l('Patrimônio e catálogo', 'Heritage & catalog')) };
  return section(t(S.rivals),
    h('p', { class: 'muted small' }, t(l('A IA dos rivais segue regras e observa só informação pública. Receita mostrada é a do último ano fechado.', 'Rival AI follows rules and only sees public information. Revenue shown is for the last closed year.'))),
    h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, t(l('Selo', 'Label'))), h('th', null, t(l('Família', 'Family'))), h('th', null, t(S.city)), h('th', null, t(S.roster)), h('th', null, t(S.revenue)), h('th', null, t(S.territories)), h('th', null, t(l('Última decisão', 'Last decision'))))),
      h('tbody', null, labels.map((lb) => h('tr', null,
        h('td', null, labelLink(s, lb.id)),
        h('td', null, `${lb.family} · ${famName[lb.family]}`),
        h('td', null, cityById[lb.city] ? cityName(lb.city) : lb.city),
        h('td', null, lb.roster.length),
        h('td', null, $(lb.revenueLastYear)),
        h('td', null, lb.territories.length),
        h('td', { class: 'muted small' }, t(lb.lastDecision) || '—'),
      ))),
    ),
  );
}

function professionals(s: GameState): HTMLElement {
  const cap = hqCaps(s).staff;
  return section(`${t(S.professionals)} — ${t(S.staff)} ${s.player.staff.length}/${cap}`,
    h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, t(l('Nome', 'Name'))), h('th', null, t(l('Função', 'Role'))), h('th', null, t(l('Habilidade', 'Skill'))), h('th', null, t(l('Salário/mês', 'Salary/mo'))), h('th', null, ''))),
      h('tbody', null, s.professionals.map((p) => {
        const role = STAFF_ROLES.find((r) => r.id === p.role);
        return h('tr', null,
          h('td', null, p.name),
          h('td', { title: t(role?.desc) }, t(role?.name), h('div', null, crewProfileCell(s, p))),
          h('td', null, p.skill),
          h('td', null, $(p.salary)),
          h('td', null, h('button', { class: 'btn small', disabled: s.player.staff.length >= cap, onclick: () => { const e = hireStaff(s, p.id); if (e) toast(t(e), 'bad'); rerender(); } }, t(S.hire))),
        );
      })),
    ),
    h('p', { class: 'muted small' }, t(l('A lista muda a cada trimestre.', 'The list changes every quarter.'))),
  );
}
