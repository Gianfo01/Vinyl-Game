// Artistas: elenco, carreira em 3 eixos, estados, agenda de 4 slots, contrato (GDD §9, §11).
// r20 (G4, uiux §2.1): área de trabalho — elenco filtrável com seleção fixa, cabeçalho com estado/projeto/riscos e
// `Ações ▾` (registro único ui/actions20.ts), subabas Visão geral / Agenda e projetos / Carreira e contrato /
// Público e mídia / Integrantes e relações, e a "Ficha completa" (modo especialista) com tudo empilhado.

import { actQuick18, emptyState18 } from '../quick18';
import { abilityCell18 } from '../ab18stars';
import { AGENDA_ACTIONS, agendaById } from '../../data/people';
import { APPROACHES, CONTRACT_MODELS, STUDIO_TIERS, VENUE_TIERS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { defaultAgenda, slotCost, slotsFor, usedSlots } from '../../sim/agenda';
import { maxVenueTier } from '../../sim/live';
import { actState } from '../../sim/people';
import type { Act, AgendaSlot, GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, N, actLink, genreName, cityName, kv, logo, pill, promiseName, rerender, section, statusName } from '../common';
import { h, select } from '../dom';
import { openAct } from '../ficha';
import { personCard } from '../pages';
import { store } from '../store';
import { EXTRA_ACTIONS } from '../../data/actions';
import { agendaLoad, slotLoad } from '../../sim/capacity';
import { slotWeek } from '../../sim/agenda';
import { PRESETS, ag7, applyTemplate, crowdedWeeks, deleteTemplate, plannedCombos, releaseWeek, saveTemplate } from '../../sim/sys/agenda7';
import { freeCapacity } from '../../sim/agenda';
import { getTab, ic, loadBar, meter, setTab, stat, tabs } from '../vis';
import { contractExtra, fandomSection, membersSection, reunionSection } from './people';
import { forecastRenewal } from '../../sim/sys/explain12';
import { forecastBox } from '../sys/explain12';
import { pledgeLine } from '../sys/offers12';
import { hideSection, sectionsOf } from '../registry';
import { FILTER0_20, SUB20, SUBTAB_KEY20, actionRow20, alerts20, filterRoster20, nextCommitment20, project20, type Filter20, type Sub20 } from '../actions20';
import { actionsButton20, applyNav20, bindContext20, chooseAction20, quickPins20 } from '../sys/actmenu20';
import { actStatus } from '../../sim/sys/hq8';

/** Seções registradas por outros sistemas que agora moram numa subaba (e não mais soltas no fim da página). */
const PLACED20: Record<string, Sub20> = { feats8: 'agenda', 'people-negotiate': 'career', 'scenes-actions': 'audience', w4clubs: 'audience' };
hideSection((host, id) => host === 'artists' && id in PLACED20);
const placed = (s: GameState, sub: Sub20): HTMLElement[] => sectionsOf('artists', Object.keys(PLACED20).filter((k) => PLACED20[k] === sub), s);

/** Filtros do elenco (estado da interface nesta sessão). */
const filt: Filter20 = { ...FILTER0_20 };

export function artistsPanel(s: GameState): HTMLElement {
  const ids = playerActs(s);
  if (!ids.length) return h('div', { class: 'panel' }, section(t(S.roster), emptyState18(S.noActs, l('Artistas chegam por scouting (Mercado → Descobrir), indicações ou leilões. Faça uma oferta e eles aparecem aqui.', 'Acts come from scouting (Market → Discover), referrals or auctions. Make an offer and they show up here.'), { label: l('Ir ao Mercado', 'Go to the Market'), run: () => { store.area = 'market'; rerender(); } })));
  if (!store.selectedAct || !ids.includes(store.selectedAct)) store.selectedAct = ids[0];
  const a = s.acts[store.selectedAct];
  const sub = (getTab(SUBTAB_KEY20) as Sub20 | undefined) ?? 'overview';
  return h('div', { class: 'panel artists artists20' },
    h('aside', { class: 'col-side' }, rosterList20(s, ids, a.id), reunionWrap(s)),
    h('div', { class: 'col-main' },
      header20(s, a),
      tabs(SUBTAB_KEY20, SUB20.map((x) => ({ id: x.id, label: t(x.label), icon: x.icon, render: () => subPanel20(s, a, x.id) })), rerender),
      sub === 'full' ? null : h('p', { class: 'muted small' }, t(l('Trocar de artista mantém a subaba. Clique direito (ou Shift+F10) num artista do elenco abre o mesmo menu de ações.', 'Switching acts keeps the subtab. Right-click (or Shift+F10) on a roster act opens the same actions menu.'))),
    ),
  );
}

function reunionWrap(s: GameState): HTMLElement | null {
  const r = reunionSection(s);
  return r ? h('details', { class: 'card small' }, h('summary', null, t(l('Oportunidades: reuniões de bandas', 'Opportunities: band reunions'))), r) : null;
}

function rosterList20(s: GameState, ids: string[], sel: string): HTMLElement {
  const { shown, hiddenCritical } = filterRoster20(s, ids, filt);
  const list = shown.includes(sel) ? shown : [sel, ...shown];
  const fsel = <K extends keyof Filter20>(k: K, opts: { value: Filter20[K]; label: L }[], name: L) =>
    select(filt[k], opts.map((o) => ({ value: o.value, label: t(o.label) })), (v) => { filt[k] = v; rerender(); }, { 'aria-label': t(name) });
  const filters = h('div', { class: 'ar20-filters', role: 'group', 'aria-label': t(l('Filtros do elenco', 'Roster filters')) },
    fsel('role', [{ value: 'all', label: l('Papel: todos', 'Role: all') }, { value: 'band', label: l('Bandas', 'Bands') }, { value: 'solo', label: l('Solo', 'Solo') }, { value: 'own', label: l('Sua banda', 'Your band') }], l('Papel', 'Role')),
    fsel('state', [{ value: 'all', label: l('Estado: todos', 'State: all') }, { value: 'active', label: l('Ativos', 'Active') }, { value: 'hiatus', label: l('Em pausa', 'On hiatus') }, { value: 'tired', label: l('Cansados/estressados', 'Tired/stressed') }], l('Estado', 'State')),
    fsel('urgency', [{ value: 'all', label: l('Urgência: todas', 'Urgency: all') }, { value: 'critical', label: l('Só com alerta crítico', 'Critical alerts only') }], l('Urgência', 'Urgency')),
    fsel('project', [{ value: 'all', label: l('Projeto: todos', 'Project: all') }, { value: 'with', label: l('Com disco em andamento', 'With a record in progress') }, { value: 'without', label: l('Sem disco', 'No record') }], l('Projeto', 'Project')),
  );
  const items = list.map((id) => {
    const x = s.acts[id];
    const al = alerts20(s, x);
    const nx = nextCommitment20(s, x);
    const off = !shown.includes(id);
    const li = h('li', { class: id === sel ? 'sel' : '', tabindex: '0', 'aria-current': id === sel ? 'true' : null,
      onclick: () => { store.selectedAct = id; rerender(); },
      onkeydown: (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); store.selectedAct = id; rerender(); } } },
      logo(x, 32), h('div', null, h('b', null, x.name, off ? h('small', { class: 'muted' }, ` (${t(l('fora do filtro', 'outside the filter'))})`) : null),
        h('span', { class: 'ar20-meta' }, `${genreName(x.genre)} · ${cityName(x.city)} · ${statusName(x.status)}`),
        nx ? h('span', { class: 'ar20-meta' }, '→ ', t(nx.text), ` · ${t(l('sem.', 'wk'))} ${Math.max(0, nx.w - s.week)}`) : null),
      x.status === 'hiatus' ? pill('⏸') : null,
      actQuick18(s, x),
      abilityCell18(s, x),
      al.length ? h('span', { class: 'ar20-al' }, al.slice(0, 3).map((z) => pill(t(z.text), z.critical ? 'bad' : z.tone === 'warn' ? 'warn' : ''))) : null,
    );
    return bindContext20(s, li, id);
  });
  return section(`${t(S.roster)} (${ids.length})`, filters,
    h('ul', { class: 'roster ar20', 'aria-label': t(S.roster) }, items),
    hiddenCritical.length ? h('p', { class: 'ar20-hidden', role: 'note' }, '⚠ ', t(l('{n} artista(s) com alerta crítico fora do filtro: ', '{n} act(s) with a critical alert outside the filter: ')).replace('{n}', String(hiddenCritical.length)),
      hiddenCritical.map((id) => h('button', { class: 'link', onclick: () => { store.selectedAct = id; rerender(); } }, s.acts[id].name, ' ')),
      h('button', { class: 'btn small ghost', onclick: () => { Object.assign(filt, FILTER0_20); rerender(); } }, t(l('Limpar filtros', 'Clear filters')))) : null,
  );
}

/** Cabeçalho: identidade, estado, saúde/pressão, projeto, próximo compromisso, alertas críticos, Ações ▾ e fixados. */
function header20(s: GameState, a: Act): HTMLElement {
  const st = actState(s, a);
  const crit = alerts20(s, a).filter((x) => x.critical);
  const pj = project20(s, a);
  const nx = nextCommitment20(s, a);
  // r21 (Heritage): emblema grande, nome serifado, selos de estado e medidores à direita; Inspecionar + Ações ▾
  const tile = (icon: string, label: L, v: number, bad = false) => h('div', { class: `ar21-tile ${bad && v >= 60 ? 'bad' : ''}`, title: t(label) },
    ic(icon, 2), h('span', null, h('small', null, t(label)), h('b', null, String(Math.round(v)))));
  return h('section', { class: 'card ar20-card ar21-card' },
    h('div', { class: 'ar21-head' }, h('div', { class: 'ar21-logo' }, logo(a, 96)),
      h('div', { class: 'ar21-id' },
        h('h2', null, a.name),
        h('div', { class: 'ar21-sub' }, `${a.members.length > 1 ? t(l('Grupo', 'Group')) : t(l('Solo', 'Solo'))} · ${genreName(a.genre)} · ${cityName(a.city)}`),
        h('div', { class: 'ar21-pills' }, pill(statusName(a.status), a.status === 'active' ? 'good' : ''), s.delegated[a.id] !== false ? pill(t(l('Agenda delegada', 'Delegated agenda'))) : null,
          pj ? pill(`${pj.title} · ${t(pj.stage)}`) : null, nx ? h('small', { class: 'muted' }, '→ ', t(nx.text), ` (${t(l('sem.', 'wk'))} ${Math.max(0, nx.w - s.week)})`) : null)),
      h('div', { class: 'ar21-right' },
        h('div', { class: 'ar21-tiles' }, tile('star', S.fame, a.fame), tile('heart', S.morale, st.morale), tile('sleep', S.fatigue, st.fatigue, true), tile('stress', S.stress, st.stress, true)),
        h('div', { class: 'ar20-actions ar21-actions' }, quickPins20(s, a.id),
          h('button', { class: 'btn', onclick: () => openAct(a.id) }, '🔍 ', t(S.inspect)), actionsButton20(s, a.id, 'btn primary')))),
    crit.length ? h('ul', { class: 'ar20-crit', 'aria-label': t(l('Alertas críticos', 'Critical alerts')) }, crit.map((x) => h('li', { class: x.tone },
      x.nav ? h('button', { class: 'link', onclick: () => applyNav20(s, { act: a.id, ...x.nav }) }, '⚠ ', t(x.text), ' ›') : h('span', null, '⚠ ', t(x.text))))) : null,
  );
}

function subPanel20(s: GameState, a: Act, sub: Sub20): HTMLElement {
  const label = SUB20.find((x) => x.id === sub)!.label;
  const body: (HTMLElement | null)[] = sub === 'overview' ? overview20(s, a)
    : sub === 'agenda' ? [agendaSection(s, a), recordLine(s, a), ...placed(s, 'agenda')]
    : sub === 'career' ? contractBlock(s, a)
    : sub === 'audience' ? [fandomSection(s, a), ...placed(s, 'audience')]
    : sub === 'members' ? membersBlock(s, a)
    // ficha completa (especialista): tudo empilhado, como antes
    : [overviewMeters(s, a), agendaSection(s, a), recordLine(s, a), ...contractBlock(s, a), ...membersBlock(s, a), fandomSection(s, a), ...placed(s, 'agenda'), ...placed(s, 'audience'), h('p', null, actLink(s, a.id))];
  return h('div', { class: 'col-main' }, h('h3', { class: 'sr-only', tabindex: '-1', 'data-focus20': '' }, `${a.name} · ${t(label)}`), ...body.filter((x): x is HTMLElement => !!x));
}

/** Visão geral: próxima decisão, riscos e tarefas — sem repetir todos os atributos. */
function overview20(s: GameState, a: Act): HTMLElement[] {
  const st = actStatus(s, a);
  const al = alerts20(s, a);
  const go: Record<string, (el: HTMLElement) => void> = {
    decision: () => applyNav20(s, { area: 'cockpit' }), crisis: () => applyNav20(s, { area: 'cockpit' }), take: () => applyNav20(s, { area: 'studio' }),
    contract: () => applyNav20(s, { act: a.id, sub: 'career' }), release: () => applyNav20(s, { area: 'project', act: a.id }),
    studio: (el) => chooseAction20(s, 'record.prepare', a.id, el), rest: (el) => chooseAction20(s, 'rest.add', a.id, el), agenda: () => applyNav20(s, { act: a.id, sub: 'agenda' }),
  };
  const ast = actState(s, a);
  const unrec = a.songs.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const ready = a.songs.filter((id) => s.songs[id]?.recorded && !s.songs[id].releaseId).length;
  const pj = project20(s, a);
  const tot = Math.max(1, a.fans.casual + a.fans.active + a.fans.core);
  const fanRow = (label: L, v: number) => h('div', { class: 'ar21-fan' }, h('span', null, t(label)), h('i', { class: 'ar21-bar' }, h('i', { style: `width:${Math.max(2, Math.round((v / tot) * 100))}%` })), h('b', null, N(v)));
  const hd = (icon: string, title: L) => h('div', { class: 'h21' }, h('h3', null, h('span', { class: 'ic21' }, ic(icon, 2)), ' ', t(title)));
  return [
    // próxima decisão em destaque
    h('section', { class: 'card ar21-next' }, h('span', { class: 'ar21-next-ic', 'aria-hidden': 'true' }, ic('contract', 3)),
      h('div', null, h('h3', null, t(l('Próxima decisão', 'Next decision')), ': ', t(st.next.label))),
      h('button', { class: 'btn primary', onclick: (e: Event) => (go[st.next.kind] ?? go.agenda)(e.currentTarget as HTMLElement) }, t(l('Resolver', 'Handle it')))),
    h('div', { class: 'ar21-grid3' },
      h('section', { class: 'card' }, hd('heart', l('Estado', 'State')),
        meter('fire', S.momentum, a.momentum), meter('globe', S.positioning, a.positioning), meter('sparkle', S.inspiration, ast.inspiration),
        a.playerBand ? null : meter('handshake', S.trust, a.trust), h('div', { class: 'ar21-ab' }, abilityCell18(s, a))),
      h('section', { class: 'card' }, hd('fans', l('Público', 'Audience')),
        fanRow(l('Casuais', 'Casual'), a.fans.casual), fanRow(l('Ativos', 'Active'), a.fans.active), fanRow(l('Núcleo', 'Core'), a.fans.core)),
      h('section', { class: 'card' }, hd('note', l('Repertório', 'Repertoire')),
        h('dl', { class: 'ar21-dl' }, h('dt', null, t(l('Escritas', 'Written'))), h('dd', null, String(unrec)), h('dt', null, t(l('Gravadas inéditas', 'Recorded unreleased'))), h('dd', null, String(ready)),
          h('dt', null, t(l('Lançamentos', 'Releases'))), h('dd', null, String(a.releases.length))),
        h('div', { class: 'ar21-btns' },
          h('button', { class: 'btn small', onclick: () => { store.selectedAct = a.id; setTab('creation-write', 'repertoire'); store.area = 'creation'; rerender(); } }, ic('note'), ' ', t(l('Abrir repertório', 'Open repertoire'))),
          h('button', { class: 'btn small', onclick: (e: Event) => chooseAction20(s, 'record.prepare', a.id, e.currentTarget as HTMLElement) }, ic('mic'), ' ', t(l('Preparar gravação', 'Prepare a recording'))),
          h('button', { class: 'btn small primary', onclick: () => applyNav20(s, { area: 'project', act: a.id }) }, ic('disc'), ' ', pj ? `${pj.title} · ${t(pj.stage)}` : t(l('Começar um disco', 'Start a record')))))),
    h('div', { class: 'ar21-grid2' },
      h('section', { class: 'card' }, hd('guitar', l('Integrantes', 'Members')), h('div', { class: 'pcard-grid' }, a.members.map((id) => s.persons[id] ? personCard(s, s.persons[id], { compact: true }) : null))),
      h('section', { class: 'card' }, hd('warning', l('Riscos e tarefas', 'Risks and tasks')),
        al.length ? h('ul', { class: 'ar20-crit ar21-risks' }, al.map((x) => h('li', { class: x.critical ? '' : x.tone }, x.nav ? h('button', { class: 'link', onclick: () => applyNav20(s, { act: a.id, ...x.nav }) }, t(x.text), ' ›') : t(x.text))))
          : h('p', { class: 'small good' }, t(l('Nada pedindo atenção.', 'Nothing needs attention.'))))),
  ];
}

function overviewMeters(s: GameState, a: Act): HTMLElement {
  const st = actState(s, a);
  const unrec = a.songs.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const ready = a.songs.filter((id) => s.songs[id]?.recorded && !s.songs[id].releaseId).length;
  return section(t(l('Estado', 'State')),
    h('div', { class: 'pcard-grid' }, a.members.map((id) => s.persons[id] ? personCard(s, s.persons[id], { compact: true }) : null)),
    h('div', { class: 'grid3' },
      meter('fame', S.fame, a.fame),
      meter('fire', S.momentum, a.momentum),
      meter('globe', S.positioning, a.positioning),
      meter('heart', S.morale, st.morale),
      meter('sleep', S.fatigue, st.fatigue, 100, true),
      meter('stress', S.stress, st.stress, 100, true),
      meter('sparkle', S.inspiration, st.inspiration),
      a.playerBand ? null : meter('handshake', S.trust, a.trust),
      stat('fans', `${N(a.fans.casual)} / ${N(a.fans.active)} / ${N(a.fans.core)}`, S.fans),
    ),
    h('p', { class: 'small muted' }, t(l('Músicas escritas: {u} · gravadas inéditas: {r} · lançamentos: {n}', 'Written songs: {u} · recorded unreleased: {r} · releases: {n}'), { u: unrec, r: ready, n: a.releases.length }), ' ',
      h('button', { class: 'btn small', onclick: () => { store.selectedAct = a.id; setTab('creation-write', 'repertoire'); store.area = 'creation'; rerender(); } }, ic('note'), ' ', t(l('Abrir repertório', 'Open repertoire')))),
  );
}

function recordLine(s: GameState, a: Act): HTMLElement {
  const pj = project20(s, a);
  return h('div', { class: 'row wrap' },
    h('button', { class: 'btn small', onclick: (e: Event) => chooseAction20(s, 'record.prepare', a.id, e.currentTarget as HTMLElement) }, ic('mic'), ' ', t(l('Preparar gravação', 'Prepare a recording'))),
    h('button', { class: 'btn small ghost', onclick: () => applyNav20(s, { area: 'project', act: a.id }) }, ic('disc'), ' ', pj ? `${pj.title} · ${t(pj.stage)}` : t(l('Começar um disco', 'Start a record'))));
}

function membersBlock(s: GameState, a: Act): HTMLElement[] {
  return [
    section(t(l('Formação', 'Line-up')), h('div', { class: 'pcard-grid' }, a.members.map((id) => s.persons[id] ? personCard(s, s.persons[id], { compact: true }) : null)),
      h('div', { class: 'row wrap' },
        a.members.length >= 2 ? h('button', { class: 'btn small ghost', onclick: () => chooseAction20(s, 'band.dyn', a.id) }, ic('network'), ' ', t(l('Dinâmica da banda', 'Band dynamics'))) : null,
        actionRow20(s, 'person.more', { act: a.id }) ? h('button', { class: 'btn small ghost', onclick: (e: Event) => chooseAction20(s, 'person.more', a.id, e.currentTarget as HTMLElement) }, ic('handshake'), ' ', t(l('Ações com o líder', 'Actions with the leader'))) : null)),
    membersSection(s, a),
  ];
}

function contractBlock(s: GameState, a: Act): HTMLElement[] {
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  return [
    c ? section(t(S.contract),
      kv(t(S.model), c.party === 'player' ? t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name) : `${t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name)} — ${s.labels[c.party]?.name ?? ''}`),
      kv(t(S.royalty), `${Math.round(c.royalty * 100)}%`),
      kv(t(S.recoup), $(c.recoupBalance)),
      kv(t(S.ends), `${Math.max(0, Math.round((c.endWeek - s.week) / 4.35))} ${t(l('meses', 'months'))}`),
      kv(t(S.releasesOwed), `${c.releasesDone}/${c.releasesOwed}`),
      c.promises.length ? kv(t(S.promises), h('span', null, c.promises.map((p) => pill(`${promiseName(p.kind)}${p.kept === undefined ? '' : p.kept ? ' ✓' : ' ✗'}`, p.kept === false ? 'bad' : '')))) : null,
      c.party === 'player' && !a.playerBand ? h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: (e: Event) => chooseAction20(s, 'contract.renew', a.id, e.currentTarget as HTMLElement) }, `${t(S.renew)} (36m, ${$(money(s, 1500 + a.fame * a.fame * 15))}) …`),
        h('button', { class: 'btn ghost', onclick: (e: Event) => chooseAction20(s, 'contract.royalty', a.id, e.currentTarget as HTMLElement) }, t(S.raiseRoyalty), ' …'),
      ) : null,
    ) : a.playerBand ? section(t(S.contract), h('p', { class: 'muted' }, s.config.role === 'hybrid' ? t(l('Sua banda lança pelo seu próprio selo.', 'Your band releases on your own label.')) : t(l('Independente: distribuição por agregador (taxa) e só nos seus territórios. Selos podem fazer propostas quando o alcance crescer.', 'Independent: aggregator distribution (fee) and only in your territories. Labels may approach you as your reach grows.')))) : null,
    c?.party === 'player' && !a.playerBand ? h('div', null, pledgeLine(s, a), forecastBox(forecastRenewal(s, a, money(s, 1500 + a.fame * a.fame * 15)))) : null,
    contractExtra(s, a),
    ...placed(s, 'career'),
  ].filter((x): x is HTMLElement => !!x);
}

/** Agenda do mês (editor semanal, capacidade, combinações e modelos). */
function agendaSection(s: GameState, a: Act): HTMLElement {
  const delegated = s.delegated[a.id] !== false;
  const slots: AgendaSlot[] = delegated ? defaultAgenda(s, a) : [...(s.agenda[a.id] ?? [])];
  const max = slotsFor(a);
  const commit = (next: AgendaSlot[]) => {
    s.agenda[a.id] = next;
    s.delegated[a.id] = false;
    rerender();
  };
  const combos = plannedCombos(slots);
  const crowded = crowdedWeeks(slots);
  const relWeek = releaseWeek(s, a.id);
  const slotEditor = (slot: AgendaSlot, idx: number) => {
    const params: HTMLElement[] = [];
    if (slot.action === 'gigs') {
      const mt = maxVenueTier(s, a);
      params.push(select(Number(slot.params?.tier ?? 0), VENUE_TIERS.map((v) => ({ value: v.id, label: t(v.name), disabled: v.id > mt })), (v) => { slot.params = { ...slot.params, tier: v }; commit(slots); }));
      params.push(select(Number(slot.params?.dates ?? 4), [1, 2, 4, 6, 8, 12].map((d) => ({ value: d, label: `${d} ${t(S.dates).toLowerCase()}` })), (v) => { slot.params = { ...slot.params, dates: v }; commit(slots); }));
    }
    if (slot.action === 'record') {
      params.push(select(Number(slot.params?.tier ?? 0), STUDIO_TIERS.map((x) => ({ value: x.id, label: `${t(x.name)}${x.cost ? ' · ' + $(money(s, x.cost)) : ''}` })), (v) => { slot.params = { ...slot.params, tier: v }; commit(slots); }));
      params.push(select(String(slot.params?.approach ?? 'balanced'), APPROACHES.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { slot.params = { ...slot.params, approach: v }; commit(slots); }));
    }
    if (slot.action === 'reposition') {
      params.push(select(String(slot.params?.target ?? 'crossover'), [{ value: 'crossover', label: t(S.crossover) }, { value: 'underground', label: t(S.underground) }], (v) => { slot.params = { ...slot.params, target: v }; commit(slots); }));
    }
    params.push(select(slotWeek(slot, idx), [1, 2, 3, 4].map((w) => ({ value: w, label: `${t(l('Semana', 'Week'))} ${w}` })), (v) => { slot.params = { ...slot.params, week: v }; commit(slots); }, { 'aria-label': t(l('Semana', 'Week')) }));
    const def = agendaById[slot.action] ?? EXTRA_ACTIONS.find((x) => x.id === slot.action);
    const combo = combos.filter((c) => c.after === idx);
    return h('li', { class: `slot ${combo.length ? 'combo' : ''}` },
      h('b', null, t(def?.name)), slotCost(slot.action) > 1 ? pill(`×${slotCost(slot.action)}`) : null,
      def?.cost ? h('span', { class: 'muted small' }, ` ${$(money(s, def.cost))}`) : null,
      ...params,
      h('small', { class: 'muted' }, t(def?.desc)),
      ...combo.map((c) => pill(`✦ ${t(c.combo.name)}`, 'good')),
      h('button', { class: 'icon', 'aria-label': t(l('remover', 'remove')), onclick: () => commit(slots.filter((_, i) => i !== idx)) }, '✕'),
    );
  };
  const free = max - usedSlots(slots);
  const capLeft = freeCapacity(s, a) - agendaLoad(slots);
  const addSel = select('', [{ value: '', label: `+ ${t(S.addAction)}` }, ...[...AGENDA_ACTIONS, ...EXTRA_ACTIONS].filter((x) => slotLoad({ action: x.id }) <= capLeft && (slotCost(x.id) <= free || EXTRA_ACTIONS.includes(x as never))).map((x) => ({ value: x.id, label: `${t(x.name)} · ${slotLoad({ action: x.id })}%` })).sort((a, b) => a.label.localeCompare(b.label))], (v) => {
    if (!v) return;
    const p: AgendaSlot = { action: v };
    if (v === 'gigs') p.params = { tier: Math.min(maxVenueTier(s, a), 2), dates: 4 };
    if (v === 'record') p.params = { tier: s.player.hq >= 1 ? 0 : 1, approach: 'balanced' };
    if (EXTRA_ACTIONS.find((x) => x.id === v)?.scope === 'person') p.params = { person: a.members[0] };
    commit([...slots, p]);
  }, { disabled: capLeft <= 0, 'aria-label': t(S.addAction) });
  return section(`${t(S.agenda)} — ${t(l('capacidade', 'capacity'))} ${agendaLoad(slots)}%`,
    loadBar(slots.map((x) => ({ label: t(agendaById[x.action]?.name ?? EXTRA_ACTIONS.find((e) => e.id === x.action)?.name), load: slotLoad(x) }))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: delegated, onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; s.delegated[a.id] = on ? true : false; if (!on) s.agenda[a.id] = defaultAgenda(s, a); rerender(); } }), t(S.delegate)),
    h('div', { class: 'agenda-cal' }, [1, 2, 3, 4].map((w) => h('div', { class: `agenda-week ${crowded.includes(w) ? 'crowded' : ''} ${relWeek === w ? 'release' : ''}` },
      h('header', null, `${t(l('Semana', 'Week'))} ${w}`, relWeek === w ? pill(t(l('lançamento', 'release')), 'gold') : null, crowded.includes(w) ? pill(t(l('cheia', 'busy')), 'warn') : null),
      h('ul', { class: 'slots' }, slots.map((x, i) => ({ x, i })).filter(({ x, i }) => slotWeek(x, i) === w).map(({ x, i }) => delegated ? h('li', { class: 'slot muted' }, t(agendaById[x.action]?.name ?? EXTRA_ACTIONS.find((e) => e.id === x.action)?.name)) : slotEditor(x, i))),
    ))),
    delegated ? null : addSel,
    combos.length ? h('p', { class: 'small good' }, '✦ ', combos.map((c) => `${t(c.combo.name)}: ${t(c.combo.desc)}`).join(' · ')) : h('p', { class: 'muted small' }, t(l('Dica: combinações dão bônus — ensaiar antes dos shows, compor antes de gravar, treinar antes de gravar, descansar depois da estrada, dar entrevista na semana do lançamento.', 'Tip: combos give bonuses — rehearse before gigs, write before recording, train before recording, rest after the road, do interviews in release week.'))),
    crowded.length ? h('p', { class: 'small warn' }, t(l('Semana cheia (3+ ações, ou shows e gravação juntos): o grupo cansa mais.', 'Busy week (3+ actions, or gigs and recording together): the group tires more.'))) : null,
    templatesRow(s, a.id, slots),
    h('p', { class: 'muted small' }, t(l('Ações repetidas no mês rendem menos (retorno decrescente). Artistas com controle criativo podem trocar uma ação.', 'Repeated actions in a month yield less (diminishing returns). Artists with creative control may swap an action.'))),
  );
}

/** Modelos de agenda (rodada 7): prontos e salvos por você. r20: o escopo (este artista ou todos) é escolhido à
 *  vista, não mais por um Shift escondido (uiux §3.3 — ação em lote com escopo explícito). */
let tplScope20: 'one' | 'all' = 'one';
function templatesRow(s: GameState, actId: string, slots: AgendaSlot[]): HTMLElement {
  const st = ag7(s);
  const n = playerActs(s).length;
  const targets = () => (tplScope20 === 'all' && n > 1 ? playerActs(s) : [actId]);
  const apply = (tplSlots: AgendaSlot[]) => {
    for (const id of targets()) { s.agenda[id] = tplSlots.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } })); s.delegated[id] = false; }
    rerender();
  };
  return h('div', { class: 'agenda-tpl' },
    h('small', { class: 'muted' }, t(l('Modelos:', 'Templates:'))),
    n > 1 ? select(tplScope20, [{ value: 'one' as const, label: t(l('Aplicar a: este artista', 'Apply to: this act')) }, { value: 'all' as const, label: t(l('Aplicar a: todos ({n})', 'Apply to: all ({n})')).replace('{n}', String(n)) }], (v) => { tplScope20 = v; rerender(); }, { 'aria-label': t(l('Escopo do modelo', 'Template scope')) }) : null,
    ...PRESETS.map((p) => h('button', { class: 'btn small ghost', title: tplScope20 === 'all' && n > 1 ? t(l('Aplica a todo o elenco', 'Applies to the whole roster')) : t(l('Aplica a este artista', 'Applies to this act')), onclick: () => apply(p.slots) }, t(p.name))),
    ...st.templates.map((tp) => h('span', { class: 'row', style: 'gap:2px' },
      h('button', { class: 'btn small ghost', onclick: () => { applyTemplate(s, tp.id, targets()); rerender(); } }, tp.name),
      h('button', { class: 'icon', 'aria-label': t(l('apagar', 'delete')), onclick: () => { deleteTemplate(s, tp.id); rerender(); } }, '✕'))),
    slots.length ? h('button', { class: 'btn small', onclick: () => { const nm = prompt(t(l('Nome do modelo', 'Template name')), t(l('Minha agenda', 'My schedule'))); if (nm) { saveTemplate(s, nm, slots); rerender(); } } }, '💾 ', t(l('Salvar como modelo', 'Save as template'))) : null,
    n > 1 ? h('button', { class: 'btn small ghost', onclick: () => { for (const id of playerActs(s)) { s.agenda[id] = slots.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } })); s.delegated[id] = false; } rerender(); } }, t(l('Copiar esta agenda para todos ({n})', 'Copy this agenda to all ({n})')).replace('{n}', String(n))) : null,
  );
}
