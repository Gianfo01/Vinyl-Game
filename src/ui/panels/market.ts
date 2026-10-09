// Mercado: scouting em graus, pipeline, rivais e profissionais (GDD §10, §19).

import { STAFF_ROLES } from '../../data/rules';
import { FAMILIES, MARKETS, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { hireStaff } from '../../sim/economy';
import { fameText } from '../../sim/sys/fame15';
import { DEGREES, STAGES, canScout, dropSignal, estimate, requestScout, scoutActionsPerMonth, scoutAct, scoutCost, scoutRequestCost, setStage, sourceName, syncPipeline } from '../../sim/scouting';
import { acceptCounter, defaultOffer, withdrawOffer } from '../../sim/contracts';
import type { GameState, Knowledge } from '../../sim/types';
import { $, actLink, cityName, genreName, labelLink, logo, pill, rerender, section, toast } from '../common';
import { bar, h, rangeBar, select } from '../dom';
import { openOffer } from '../ficha';
import { openDossier } from '../dossierView';
import { store } from '../store';
import { hqCaps } from '../../sim/branches';
import { crewProfileCell } from '../sys/crew8';
import { isWatched, missionProgress, scout11, toggleCompare, toggleWatch } from '../../sim/sys/scout11';

export function marketPanel(s: GameState): HTMLElement {
  const tabs: [typeof store.marketTab, string][] = [
    ['scouting', t(S.scouting)],
    ['pipeline', t(S.pipeline)],
    ['professionals', t(S.professionals)],
  ];
  const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', { role: 'tab', 'aria-selected': store.marketTab === id ? 'true' : 'false', class: store.marketTab === id ? 'on' : '', onclick: () => { store.marketTab = id; rerender(); } }, label)));
  let body: HTMLElement;
  if (s.config.role === 'artist' && (store.marketTab === 'scouting' || store.marketTab === 'pipeline')) store.marketTab = 'professionals';
  if (store.marketTab === 'scouting') body = scouting(s);
  else if (store.marketTab === 'pipeline') body = pipeline(s);
  else body = professionals(s);
  return h('div', { class: 'panel market' }, tabBar, body);
}

const qKey = (s: GameState, actId: string) => { const a = s.acts[actId]; return `${a.name} ${genreName(a.genre)} ${cityName(a.city)}`.toLowerCase(); };

/** Névoa do potencial: quão largo ainda é o intervalo estimado. */
function fog(r: { lo: number; hi: number } | null): HTMLElement {
  if (!r) return pill(t(l('névoa total', 'full fog')), 'bad');
  const w = r.hi - r.lo;
  return w > 25 ? pill(t(l('névoa densa', 'thick fog')), 'warn') : w > 12 ? pill(t(l('névoa leve', 'light fog'))) : pill(t(l('nítido', 'clear')), 'good');
}

const leadOf = (s: GameState, actId: string) => s.scouts.find((sc) => sc.mission?.leads?.includes(actId));

function signalCard(s: GameState, k: Knowledge): HTMLElement {
  const a = s.acts[k.actId];
  const pot = estimate(s, a.id, 'potential');
  const tal = estimate(s, a.id, 'talent');
  const fame = estimate(s, a.id, 'fame');
  const chk = canScout(s, a.id);
  const age = Math.round((s.week - k.updatedWeek) / 4.35);
  const watched = isWatched(s, a.id);
  const cmp = scout11(s).compare.includes(a.id);
  const lead = leadOf(s, a.id);
  return h('article', { class: `signal${watched ? ' watched' : ''}`, 'data-q': qKey(s, a.id) },
    h('header', null, logo(a, 36), h('div', { class: 'grow' }, actLink(s, a.id), h('div', { class: 'muted small' }, `${genreName(a.genre)} · ${cityName(a.city)} · ${a.members.length > 1 ? t(S.band) : t(S.solo)}`)),
      h('button', { class: `btn small ghost star${watched ? ' on' : ''}`, title: t(watched ? l('Tirar da observação', 'Unwatch') : l('Observar (alertas mensais)', 'Watch (monthly alerts)')), 'aria-pressed': watched ? 'true' : 'false', onclick: () => { toggleWatch(s, a.id); rerender(); } }, watched ? '★' : '☆')),
    h('div', { class: 'row wrap small' }, pill(`${k.degree}/5 ${t(DEGREES[k.degree - 1])}`), ' ', fog(pot), ' ', a.owner ? pill(t(l('contratado', 'signed')), 'bad') : null,
      lead ? pill(t(l('{n} investigando', '{n} on it'), { n: lead.name }), 'good') : null),
    h('div', { class: 'est' },
      h('div', null, h('span', { class: 'lbl' }, t(S.fame), ' '), fame ? h('span', null, `${fame.lo}–${fame.hi} `, rangeBar(fame.lo, fame.hi)) : '?'),
      h('div', null, h('span', { class: 'lbl' }, t(S.talent), ' '), tal ? h('span', null, `${tal.lo}–${tal.hi} `, rangeBar(tal.lo, tal.hi)) : h('span', { class: 'muted' }, t(S.hidden))),
      h('div', null, h('span', { class: 'lbl' }, t(S.potential), ' '), pot ? h('span', null, `${pot.lo}–${pot.hi} `, rangeBar(pot.lo, pot.hi, 'pot')) : h('span', { class: 'muted' }, t(S.hidden))),
    ),
    h('div', { class: 'muted small' }, `${t(S.source)}: ${t(sourceName(k.source))} · ${t(l('relatório de {n} mês(es)', '{n} month(s) old report'), { n: age })}`),
    h('div', { class: 'actions' },
      h('button', { class: 'btn small', disabled: !chk.ok, title: chk.reason ? t(chk.reason) : '', onclick: () => { scoutAct(s, a.id); rerender(); } }, `${t(S.deepen)} (${$(scoutCost(s, k.degree))})`),
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: cmp, onchange: () => { toggleCompare(s, a.id); rerender(); } }), t(l('Comparar', 'Compare'))),
      h('button', { class: 'btn small', onclick: () => openDossier(a.id) }, t(l('Dossiê', 'Dossier'))),
      !a.owner ? h('button', { class: 'btn small primary', onclick: () => openOffer(a.id) }, t(S.makeOffer)) : null,
      h('button', { class: 'btn small ghost', onclick: () => { dropSignal(s, a.id); rerender(); } }, t(S.drop)),
    ),
  );
}

function compareSection(s: GameState): HTMLElement | null {
  const ids = scout11(s).compare.filter((id) => s.acts[id] && s.knowledge[id]);
  if (!ids.length) return null;
  const rng = (id: string, f: 'fame' | 'talent' | 'potential') => { const e = estimate(s, id, f); return e ? `${e.lo}–${e.hi}` : '?'; };
  const rows: [L, (id: string) => Node | string][] = [
    [l('Gênero · cidade', 'Genre · city'), (id) => `${genreName(s.acts[id].genre)} · ${cityName(s.acts[id].city)}`],
    [l('Formato', 'Format'), (id) => (s.acts[id].members.length > 1 ? t(S.band) : t(S.solo))],
    [l('Grau', 'Degree'), (id) => `${s.knowledge[id].degree}/5`],
    [S.fame, (id) => rng(id, 'fame')],
    [S.talent, (id) => rng(id, 'talent')],
    [S.potential, (id) => rng(id, 'potential')],
    [l('Névoa', 'Fog'), (id) => fog(estimate(s, id, 'potential'))],
    [l('Situação', 'Status'), (id) => (s.acts[id].owner ? s.labels[s.acts[id].owner!]?.name ?? '?' : t(l('livre', 'free')))],
    [l('Adiantamento esperado', 'Expected advance'), (id) => $(defaultOffer(s, s.acts[id]).advance)],
  ];
  return section(t(l('Comparação', 'Comparison')),
    h('table', { class: 'tbl compact compare11' },
      h('thead', null, h('tr', null, h('th', null, ''), ...ids.map((id) => h('th', null, actLink(s, id), ' ', h('button', { class: 'btn tiny ghost', title: t(l('Remover', 'Remove')), onclick: () => { toggleCompare(s, id); rerender(); } }, '✕'))))),
      h('tbody', null, rows.map(([lab, f]) => h('tr', null, h('th', null, t(lab)), ...ids.map((id) => h('td', null, f(id))))))),
    h('p', { class: 'muted small' }, t(l('Até três nomes. Intervalos largos = pouca informação: aprofunde antes de pagar caro.', 'Up to three names. Wide ranges = little information: dig deeper before paying big.'))),
  );
}

function missionsSide(s: GameState): HTMLElement | null {
  const on = s.scouts.filter((sc) => sc.mission);
  const st = scout11(s);
  if (!on.length && !st.feed.length) return null;
  return section(t(l('Missões em campo', 'Missions in the field')),
    ...on.map((sc) => h('div', { class: 'mission11' },
      h('div', { class: 'small' }, h('b', null, sc.name), ` · ${t(MARKETS.find((m) => m.id === sc.mission!.region)?.name)} · ${t(l('até sem.', 'until wk'))} ${sc.mission!.untilWeek}`),
      bar(missionProgress(s, sc) * 100),
      sc.mission!.leads?.length ? h('ul', { class: 'small' }, sc.mission!.leads.filter((id) => s.acts[id]).map((id) => h('li', null, actLink(s, id), ` — ${t(l('grau', 'degree'))} ${s.knowledge[id]?.degree ?? '?'}/${sc.mission!.depth ?? 2}`))) : h('p', { class: 'muted small' }, t(l('Ainda sem pistas.', 'No leads yet.'))),
    )),
    st.feed.length ? h('ul', { class: 'small muted' }, st.feed.slice(-5).reverse().map((f) => h('li', null, `${t(l('sem.', 'wk'))} ${f.w}: `, t(f.t)))) : null,
  );
}

let scoutFilter = { q: '', sort: 'degree' as 'degree' | 'potential' | 'talent' | 'fame' | 'recent', hideSigned: true, fam: 'any', market: 'any', minDeg: 1, onlyWatch: false };
let qTimer: ReturnType<typeof setTimeout> | undefined;

function sortedKnowledge(s: GameState): Knowledge[] {
  const est = (k: Knowledge, f: 'potential' | 'talent') => estimate(s, k.actId, f)?.mid ?? -1;
  const f = scoutFilter;
  return Object.values(s.knowledge).filter((k) => {
    const a = s.acts[k.actId];
    if (!a || a.owner === 'player') return false;
    if (f.hideSigned && a.owner) return false;
    if (f.fam !== 'any' && familyOf(a.genre) !== f.fam) return false;
    if (f.market !== 'any' && cityById[a.city]?.market !== f.market) return false;
    if (k.degree < f.minDeg) return false;
    return !f.onlyWatch || isWatched(s, a.id);
  }).sort((a, b) => f.sort === 'potential' ? est(b, 'potential') - est(a, 'potential')
    : f.sort === 'talent' ? est(b, 'talent') - est(a, 'talent')
    : f.sort === 'fame' ? s.acts[b.actId].fame - s.acts[a.actId].fame
    : f.sort === 'recent' ? b.updatedWeek - a.updatedWeek
    : b.degree - a.degree || b.updatedWeek - a.updatedWeek);
}

/** Filtra os cards já desenhados sem redesenhar o painel (o campo de busca não perde o foco nem o cursor). */
function applyQuery(root: ParentNode): void {
  const q = scoutFilter.q.trim().toLowerCase();
  let shown = 0;
  root.querySelectorAll<HTMLElement>('[data-q]').forEach((el) => { const ok = !q || (el.dataset.q ?? '').includes(q); el.style.display = ok ? '' : 'none'; if (ok) shown += 1; });
  root.querySelectorAll('.scout-count').forEach((c) => { c.textContent = t(l('{n} visíveis', '{n} shown'), { n: shown }); });
}

function filterBar(): HTMLElement {
  const f = scoutFilter;
  const root = h('div', { class: 'row wrap scout-filter' },
    h('input', { type: 'search', placeholder: t(l('Filtrar por nome, gênero ou cidade…', 'Filter by name, genre or city…')), value: f.q, 'aria-label': t(l('Filtrar', 'Filter')), oninput: (e: Event) => {
      const el = e.target as HTMLInputElement;
      f.q = el.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(() => applyQuery(el.closest('.panel') ?? document), 120);
    } }),
    select(f.sort, [
      { value: 'degree', label: t(l('Ordenar: grau', 'Sort: degree')) },
      { value: 'potential', label: t(l('Ordenar: potencial estimado', 'Sort: estimated potential')) },
      { value: 'talent', label: t(l('Ordenar: talento estimado', 'Sort: estimated talent')) },
      { value: 'fame', label: t(l('Ordenar: alcance', 'Sort: reach')) },
      { value: 'recent', label: t(l('Ordenar: mais recentes', 'Sort: most recent')) },
    ] as { value: typeof f.sort; label: string }[], (v) => { f.sort = v; rerender(); }),
    select<string>(f.fam, [{ value: 'any', label: t(l('Todos os gêneros', 'All genres')) }, ...FAMILIES.map((x) => ({ value: x.id as string, label: t(x.name) }))], (v) => { f.fam = v; rerender(); }),
    select<string>(f.market, [{ value: 'any', label: t(l('Todas as regiões', 'All regions')) }, ...MARKETS.map((x) => ({ value: x.id as MarketId as string, label: t(x.name) }))], (v) => { f.market = v; rerender(); }),
    select<number>(f.minDeg, [1, 2, 3, 4].map((d) => ({ value: d, label: t(l('Grau ≥ {d}', 'Degree ≥ {d}'), { d }) })), (v) => { f.minDeg = v; rerender(); }),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.onlyWatch, onchange: (e: Event) => { f.onlyWatch = (e.target as HTMLInputElement).checked; rerender(); } }), '★ ', t(l('Só observados', 'Watchlist only'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.hideSigned, onchange: (e: Event) => { f.hideSigned = (e.target as HTMLInputElement).checked; rerender(); } }), t(l('Esconder quem já assinou com rivais', 'Hide acts signed to rivals'))),
    h('span', { class: 'muted small scout-count' }),
  );
  // aplica o texto atual assim que o painel entra no DOM
  queueMicrotask(() => applyQuery(root.closest('.panel') ?? root.parentElement ?? root));
  return root;
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
        compareSection(s),
        ks.length ? h('div', { class: 'signals' }, ks.map((k) => signalCard(s, k))) : h('p', { class: 'muted' }, t(l('Nenhum sinal ainda. Novos sinais chegam todo mês; contrate A&R, envie um pedido de scout ou siga artistas na aba Todos os artistas.', 'No signals yet. New signals arrive monthly; hire A&R, send a scout request or follow acts in the All artists tab.'))),
      ),
    ),
    h('aside', { class: 'col-side' },
      missionsSide(s),
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
  return h('div', { class: `kcard ${a.owner ? 'signed' : ''}`, 'data-q': qKey(s, a.id) },
    h('div', { class: 'row' }, logo(a, 24), actLink(s, a.id), h('small', { class: 'muted' }, ` ${k.degree}/5`), isWatched(s, a.id) ? h('span', { class: 'star on' }, ' ★') : null),
    h('small', { class: 'muted' }, `${genreName(a.genre)} · ${cityName(a.city)} · ★${fameText(s, a.id)}`),
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

export function rivals(s: GameState): HTMLElement {
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
