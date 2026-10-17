// Rodada 20 (G5) — Shows, Sede e Mundo por intenção (uiux §4.1, §4.2; analise B33).
// Nada some: cada hub reparte as seções que já existiam por tarefa e mantém o painel antigo inteiro
// como "Tudo (especialista)". As vistas usam as mesmas funções e IDs do motor (mapa e lista selecionam
// as mesmas cidades; canvas e lista da sede abrem a mesma ficha).
//
//   Shows: Agenda (próximas datas, conflitos duros/brandos, sala de controle da próxima data) ·
//          Turnês (etapas rota → datas → logística → ingressos/merch → revisão, painel vivo de custo/receita/risco,
//          lista acessível de cidades com busca; depois de marcar, operação da turnê) ·
//          Políticas e operação · Negócios ao vivo · Tudo.
//   Sede:  Operação (canvas ou lista equivalente) · Estrutura (investimento × custo recorrente) ·
//          Equipe e departamentos · Equipamentos e conforto · Expansão · História · Tudo.

import { CITIES, MARKETS, cityById, l, type L } from '../../data/world';
import { HQ_LEVELS } from '../../data/rules';
import { t } from '../../i18n/strings';
import { cityDemand, cancelTour, tourList } from '../../sim/tours';
import { playerShows, type PShow } from '../../sim/sys/clash17';
import { hardConflictCount20, showConflict20 } from '../../sim/sys/shows20';
import { DEPTS, buildingPrice, hq6 } from '../../sim/sys/hq6';
import { availableEquipment, upgradeCost, managementLoad } from '../../sim/economy';
import { buildings18, renoCost18 } from '../../sim/sys/campus18';
import { priceBasis20, type CostKind20 } from '../../sim/sys/price20';
import { costKindPill20, price20 } from '../price20';
import { hqCapacityText } from '../../sim/legacy';
import { KIT0 } from '../../sim/tourhook18';
import { KIT_TXT18 } from '../../sim/sys/live18';
import { activeMembers } from '../../sim/capacity';
import type { GameState } from '../../sim/types';
import type { Tour } from '../../sim/xtypes';
import { fmtL, money, playerActs } from '../../sim/util';
import { $, N, actLink, cityLink, inspect, kv, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { chips, ic, stat, tabs, setTab } from '../vis';
import { extraSections, registerAreaView20, sectionList, type SectionHost } from '../registry';
import { store } from '../store';
import { hqHooks, type HqAt } from '../hq';
import type { RoomKind } from '../pixel/sprites';
import { equipmentSection20, festivalsAside20, gigsSection20, hqPanel, setTourStops20, showsPanel, stopHq, toggleTourStop20, tourMapSection20, tourStops20 } from '../panels/misc';
import { tourView31 } from '../r31/tour31'; // R31 onda 2 (J): turnê em cena
import { TOUR_STEPS20, activeToursSection, copyTourPolicy20, merchSection, onTourBooked20, tourDraftEstimate20, tourLivePanel20, tourPlannerSection } from '../panels/tours';
import { setKitDraft18 } from './live18';
import { showKey20, showLinks20 } from '../../sim/sys/showops20';
import { branchBlock, deptBlock, hqBlock, marketsBlock } from './hq6';
import { actionsButton20, chooseAction20, openActionMenu20, openRoomMenu20 } from './actmenu20'; // r20 G4: registro único de ações
import { ROOM_ACTIONS20, actionRow20 } from '../actions20';
import './hubs20.css';

const T = (x: L) => t(x);

// ---------------------------------------------------------------- utilidades

/** Seções registradas de um host, por id, respeitando as que se mudaram para outra página (hideSection). */
function secs(host: SectionHost, s: GameState, ids: string[]): HTMLElement[] {
  const list = sectionList(host, s).filter((x) => ids.includes(x.id));
  return list.map((x) => x.render(s)).filter((x): x is HTMLElement => !!x);
}
/** Seções do host que nenhuma subárea reivindicou (sistemas futuros não somem). */
function leftovers(host: SectionHost, s: GameState, claimed: string[]): HTMLElement[] {
  return sectionList(host, s).filter((x) => !claimed.includes(x.id)).map((x) => x.render(s)).filter((x): x is HTMLElement => !!x);
}
const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const intro = (txt: L) => h('p', { class: 'muted small hub20-intro' }, T(txt));

// ================================================================ SHOWS

/** Mapeamento das seções registradas em 'shows' por subárea. */
export const SHOWS_TABS20: Record<'tours' | 'ops' | 'biz', string[]> = {
  tours: ['route8'],
  ops: ['live18-pm', 'live18-pol', 'live-notes', 'live-tickets'],
  biz: ['fest33-open', 'live-festival', 'live18-fest', 'live-venue', 'live-venue12', 'live-residency', 'live-mega'],
};
const CLAIMED_SHOWS = Object.values(SHOWS_TABS20).flat();

const KIND_SHOW: Record<PShow['kind'], L> = { tour: l('turnê', 'tour'), booking: l('data avulsa', 'one-off date'), festival: l('festival', 'festival') };

function upcomingSection(s: GameState): HTMLElement {
  const all = playerShows(s);
  const next = all.filter((x) => x.w >= s.week).slice(0, 14);
  if (!next.length) return section(T(l('Próximas datas', 'Upcoming dates')), h('p', { class: 'muted small' }, T(l('Nada marcado. Planeje uma turnê em "Turnês" ou agende datas avulsas abaixo.', 'Nothing booked. Plan a tour under "Tours" or book one-off dates below.'))));
  return section(T(l('Próximas datas', 'Upcoming dates')),
    h('div', { class: 'tbl-scroll20' }, h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, T(l('Quando', 'When'))), h('th', null, T(l('Artista', 'Act'))), h('th', null, T(l('Cidade', 'City'))), h('th', null, T(l('Tipo', 'Kind'))), h('th', null, T(l('Conflito', 'Conflict'))))),
      h('tbody', null, next.map((x) => {
        const c = showConflict20(s, x, all);
        const dw = x.w - s.week;
        return h('tr', { class: c.hard ? 'bad' : '' },
          h('td', { class: 'nowrap' }, dw <= 0 ? T(l('esta semana', 'this week')) : t(l('em {n} sem.', 'in {n} wk'), { n: dw })),
          h('td', null, actLink(s, x.actId)),
          h('td', null, cityLink(x.city)),
          h('td', null, T(KIND_SHOW[x.kind]), x.label ? h('small', { class: 'muted' }, ` · ${x.label}`) : null),
          h('td', { title: c.why.map(T).join(' · ') },
            c.hard ? pill(T(l('duro: duas cidades', 'hard: two cities')), 'bad') : null,
            c.soft >= 0.01 ? pill(`${T(l('brando', 'soft'))} −${Math.round(c.soft * 100)}%`, 'warn') : null,
            !c.hard && c.soft < 0.01 ? h('span', { class: 'muted' }, '—') : null));
      })))),
    h('p', { class: 'muted small' }, T(l('Duro: o artista não pode estar em dois lugares na mesma semana. Brando: outro show disputa o mesmo público — a mesma conta reduz a receita no acerto.', 'Hard: the act cannot be in two places the same week. Soft: another show competes for the same audience — the same math cuts revenue at settlement.'))));
}

/** Turnê dona de uma data (para a sala de controle). */
function tourOf(s: GameState, x: PShow): Tour | undefined {
  if (x.kind !== 'tour') return undefined;
  return tourList(s).find((tr) => tr.actId === x.actId && tr.name === x.label && (tr.status === 'planned' || tr.status === 'running'));
}

/** r20b (Z1): incidentes do show (ao vivo e de público) e as notícias ligadas pelo mesmo id de show. */
export function showNewsBlock20(s: GameState, key: string): HTMLElement | null {
  const x = showLinks20(s, key);
  if (!x.live.length && !x.facts.length) return null;
  const bad = x.live.filter((y) => !y.ok).length;
  return h('div', { class: 'cr20-news', 'data-show': key },
    x.live.length ? h('p', { class: 'small' }, ic('warning'), ' ', t(l('Ao vivo: {n} imprevisto(s), {b} mal resolvido(s).', 'Live: {n} mishap(s), {b} badly handled.'), { n: x.live.length, b: bad })) : null,
    h('ul', { class: 'small', 'aria-label': T(l('Fatos e notícias deste show', 'Facts and news about this show')) },
      x.facts.map((f) => {
        const st = x.stories.find((y) => y.fact === f.id);
        return h('li', null, pill(st ? T(l('notícia', 'news')) : T(l('fato', 'fact')), st ? '' : 'muted'), ' ', T(st ? st.t : f.text),
          st ? h('button', { class: 'btn small ghost', onclick: () => { store.area = 'news17'; rerender(); } }, T(l('Ver nas notícias', 'See in the news'))) : null);
      })));
}

/** Protótipo C — sala de controle da próxima apresentação. */
export function controlRoom20(s: GameState): HTMLElement | null {
  const all = playerShows(s);
  const x = all.find((y) => y.w >= s.week);
  const lastTour = [...tourList(s)].filter((tr) => tr.stops.some((st) => st.status === 'played')).sort((a, b) => (b.stops.filter((st) => st.status === 'played').at(-1)?.day ?? 0) - (a.stops.filter((st) => st.status === 'played').at(-1)?.day ?? 0))[0];
  const lastStop = lastTour?.stops.filter((st) => st.status === 'played').at(-1);
  if (!x && !lastStop) return null;
  const body: (HTMLElement | null)[] = [];
  if (x) {
    const a = s.acts[x.actId];
    const tr = tourOf(s, x);
    const st = tr?.stops.find((y) => y.status === 'scheduled' && y.cityId === x.city);
    const dem = a ? cityDemand(s, a, x.city) : 0;
    const occ = st && st.capacity ? Math.min(1, dem / st.capacity) : null;
    const kit = tr?.kit18 ?? KIT0;
    const c = showConflict20(s, x, all);
    const mem = a ? activeMembers(s, a).map((id) => s.persons[id]).filter(Boolean) : [];
    const tired = mem.filter((p) => p.fatigue >= 70).length;
    const sick = mem.filter((p) => p.health !== 'ok').length;
    body.push(
      h('div', { class: 'row wrap' }, h('b', null, ic('calendar'), ' ', cityLink(x.city)), ' · ', actLink(s, x.actId), ' · ', T(KIND_SHOW[x.kind]), x.label ? ` · ${x.label}` : '',
        ' ', pill(x.w - s.week <= 0 ? T(l('esta semana', 'this week')) : t(l('em {n} sem.', 'in {n} wk'), { n: x.w - s.week }))),
      chips(
        occ !== null ? stat('fans', `${Math.round(occ * 100)}%`, l('Ocupação prevista (estimativa: procura da cidade ÷ lotação)', 'Expected occupancy (estimate: city demand ÷ capacity)'), occ < 0.5 ? 'warn' : 'good') : stat('fans', N(dem), l('Procura estimada na cidade', 'Estimated city demand')),
        st ? stat('house', N(st.capacity), l('Lotação', 'Capacity')) : null,
        tr ? stat('tour-bus', T(KIT_TXT18.move[kit.move]), l('Transporte efetivo da turnê', 'Tour effective transport')) : null,
        tr ? stat('handshake', String(tr.crew), l('Equipe técnica', 'Road crew')) : null,
        tr ? stat('lock', T(KIT_TXT18.sec[kit.sec]), l('Segurança de público', 'Crowd security')) : null,
        tr ? stat('key', T(KIT_TXT18.ins[kit.ins]), l('Seguro', 'Insurance')) : null,
        stat('warning', c.hard ? T(l('duro', 'hard')) : c.soft >= 0.01 ? `−${Math.round(c.soft * 100)}%` : '—', l('Concorrência na semana', 'Competition that week'), c.hard ? 'bad' : c.soft >= 0.01 ? 'warn' : 'good'),
        stat('heart', tired || sick ? `${tired}/${sick}` : 'ok', l('Artista: cansados / com saúde abalada', 'Act: tired / health issues'), tired || sick ? 'warn' : 'good'),
      ),
      c.why.length ? h('ul', { class: 'small' }, c.why.map((w) => h('li', null, ic('fans'), ' ', T(w)))) : null,
      h('p', { class: 'muted small' }, T(l('O que cada fator move: segurança de público pesa nos incidentes com a plateia (não conserta falha técnica — isso é equipamento e ensaio); transporte e hospedagem pesam no cansaço; concorrência e preço pesam na bilheteria.', 'What each factor moves: crowd security weighs on audience incidents (it does not fix technical failures — that is gear and rehearsal); transport and lodging weigh on fatigue; competition and price weigh on the box office.'))),
      h('div', { class: 'row wrap' },
        h('button', { ...ent27('act', x.actId), class: 'btn small', onclick: () => (hqHooks.onAct ? hqHooks.onAct(x.actId) : inspect.act(x.actId)) }, ic('guitar'), ' ', T(l('Abrir artista', 'Open act'))),
        playerActs(s).includes(x.actId) ? actionsButton20(s, x.actId, 'btn small') : null,
        tr ? h('button', { class: 'btn small', onclick: () => { copyTourPolicy20(tr); setKitDraft18(tr.kit18 ?? KIT0); setTab('showsHub', 'tours'); toast(T(l('Política copiada para o próximo planejamento (a rota não).', 'Policy copied to the next plan (not the route).')), 'good'); rerender(); } }, ic('pen'), ' ', T(l('Copiar política', 'Copy policy'))) : null,
        tr ? h('button', { class: 'btn small ghost', onclick: async () => { if (!await askConfirm(T(l('Cancelar a turnê inteira? Pelas regras atuais, metade da logística volta.', 'Cancel the whole tour? Under current rules, half the logistics is refunded.')))) return; const e = cancelTour(s, tr.id); if (e) toast(T(e), 'bad'); rerender(); } }, T(l('Cancelar turnê (devolve metade)', 'Cancel tour (half refunded)'))) : null),
    );
  }
  if (lastStop && lastTour) {
    body.push(h('div', { class: 'cr20-last' }, h('small', { class: 'muted' }, T(l('Última data: plano × real', 'Last date: plan × actual'))),
      chips(stat('fans', `${N(lastStop.sold)}/${N(lastStop.capacity)}`, l('Vendidos / lotação', 'Sold / capacity'), lastStop.sold < lastStop.capacity * 0.5 ? 'warn' : 'good'),
        stat('money', $(lastTour.revenue), l('Receita da turnê até aqui', 'Tour revenue so far')), stat('bank', $(lastTour.costs || lastTour.costReserved), l('Custos da turnê', 'Tour costs')),
        lastTour.accidents ? stat('warning', lastTour.accidents, l('Incidentes', 'Incidents'), 'bad') : null),
      h('small', null, cityLink(lastStop.cityId), ' · ', actLink(s, lastTour.actId), lastStop.note ? ` · ${T(lastStop.note)}` : ''),
      showNewsBlock20(s, showKey20(lastTour.id, lastStop.day))));
  }
  return h('section', { class: 'card cr20' }, h('h3', null, ic('mic'), ' ', T(l('Sala de controle — próxima apresentação', 'Control room — next show'))), ...body);
}

let step20 = 0;
let expert20 = lsGet('vtn20-tour-expert') === '1';
let booked20 = false;
onTourBooked20(() => { step20 = 0; booked20 = true; });

function stepper(): HTMLElement {
  return h('ol', { class: 'steps20', 'aria-label': T(l('Etapas do planejamento', 'Planning steps')) }, TOUR_STEPS20.map((lb, i) =>
    h('li', null, h('button', { class: `chip-btn ${i === step20 ? 'on' : ''}`, 'aria-current': i === step20 ? 'step' : undefined, onclick: () => { step20 = i; rerender(); } }, `${i + 1}. ${T(lb)}`))));
}

/** Lista acessível de cidades (mesmos IDs do mapa) com busca; filtrar não redesenha a página. */
export function cityDrawer20(s: GameState): HTMLElement {
  const stops = tourStops20();
  const { actId } = tourDraftEstimate20(s, stops);
  const act = actId ? s.acts[actId] : null;
  const rows = CITIES.filter((c) => c.id !== s.config.homeCity).map((c) => ({ c, d: act ? cityDemand(s, act, c.id) : 0, open: s.player.territories.includes(c.market) })).sort((a, b) => b.d - a.d);
  const list = h('ul', { class: 'drawer20-list' }, rows.map(({ c, d, open }) => {
    const i = stops.indexOf(c.id);
    return h('li', { 'data-q': `${T(c.name)} ${T(MARKETS.find((m) => m.id === c.market)?.name ?? l('', ''))}`.toLowerCase() },
      h('button', { type: 'button', class: `chip-btn ${i >= 0 ? 'on' : ''}`, 'aria-pressed': i >= 0 ? 'true' : 'false', onclick: () => { toggleTourStop20(s, c.id); rerender(); } },
        i >= 0 ? h('b', null, `${i + 1}. `) : null, T(c.name)),
      h('small', { class: 'muted' }, ` ${N(d)} ${T(l('fãs est.', 'est. fans'))}`, open ? '' : ` · ${T(l('sem distribuição', 'no distribution'))}`));
  }));
  const search = h('input', { type: 'search', class: 'input', placeholder: T(l('Buscar cidade ou mercado…', 'Search city or market…')), 'aria-label': T(l('Buscar cidade', 'Search city')) }) as HTMLInputElement;
  search.oninput = () => { const q = search.value.trim().toLowerCase(); for (const li of Array.from(list.children) as HTMLElement[]) li.hidden = !!q && !(li.dataset.q ?? '').includes(q); };
  return h('details', { class: 'drawer20', open: lsGet('vtn20-drawer') === '1' ? true : undefined, ontoggle: (e: Event) => lsSet('vtn20-drawer', (e.currentTarget as HTMLDetailsElement).open ? '1' : '0') },
    h('summary', null, ic('globe'), ' ', T(l('Lista de cidades', 'City list')), ` (${stops.length} ${T(l('na rota', 'on route'))})`),
    search,
    stops.length ? h('div', { class: 'row wrap' }, h('button', { class: 'btn small ghost', onclick: () => { setTourStops20(s, []); rerender(); } }, T(l('Limpar rota', 'Clear route')))) : null,
    list);
}

function toursTab(s: GameState): HTMLElement {
  const stops = tourStops20();
  const set = (ids: string[]) => { setTourStops20(s, ids); rerender(); };
  const { est, actId } = tourDraftEstimate20(s, stops);
  const toggle = h('label', { class: 'small row' }, h('input', { type: 'checkbox', checked: expert20 ? true : undefined, onchange: (e: Event) => { expert20 = (e.target as HTMLInputElement).checked; lsSet('vtn20-tour-expert', expert20 ? '1' : '0'); rerender(); } }), ' ', T(l('Formulário completo (especialista)', 'Full form (expert)')));
  const ops = h('div', null,
    booked20 ? h('p', { class: 'good small', role: 'status' }, ic('tour-bus'), ' ', T(l('Turnê marcada. A operação dela está aqui embaixo.', 'Tour booked. Its operation is right below.'))) : null,
    activeToursSection(s), ...secs('shows', s, SHOWS_TABS20.tours));
  booked20 = false;
  // R31 onda 2 (J): a turnê em cena (mapa + calendário) no topo; a tabela detalhada continua logo abaixo
  const scene31 = tourView31(s, () => h('p', { class: 'muted small' }, T(l('Cena oculta: a operação da turnê e a tabela de datas estão logo abaixo.', 'Scene hidden: the tour operation and the date table are right below.'))));
  if (expert20) return h('div', null, scene31, toggle, tourMapSection20(s), cityDrawer20(s), tourPlannerSection(s, stops, set), ops);
  const nav = h('div', { class: 'row between steps20-nav' },
    h('button', { class: 'btn small', disabled: step20 === 0 ? true : undefined, onclick: () => { step20 = Math.max(0, step20 - 1); rerender(); } }, '← ', T(l('Voltar', 'Back'))),
    step20 < TOUR_STEPS20.length - 1 ? h('button', { class: 'btn small primary', onclick: () => { step20 += 1; rerender(); } }, T(l('Próxima etapa', 'Next step')), ' →') : null);
  return h('div', null,
    intro(l('Comece pelo artista e pela rota; cada etapa guarda as escolhas (voltar não apaga nada). O painel de custo, receita e risco acompanha todas as etapas.', 'Start with the act and the route; each step keeps your choices (going back erases nothing). The cost, revenue and risk panel follows every step.')),
    scene31, toggle, stepper(),
    h('div', { class: 'live20-wrap' }, tourLivePanel20(s, est, actId ?? '')),
    step20 === 0 ? tourMapSection20(s) : null,
    step20 === 0 ? cityDrawer20(s) : null,
    tourPlannerSection(s, stops, set, step20),
    step20 === 3 ? merchSection(s) : null,
    nav,
    ops);
}

function showsHub20(s: GameState): HTMLElement {
  const hard = hardConflictCount20(s);
  return h('div', { class: 'hub hub20 shows20' }, tabs('showsHub', [
    { id: 'agenda', label: T(l('Agenda', 'Agenda')), icon: 'calendar', badge: hard || undefined, render: () => h('div', { class: 'stack27' },
      intro(l('Próximas datas, conflitos e operações em curso. Para reservar datas avulsas, use a tabela por artista.', 'Upcoming dates, conflicts and ongoing operations. To book one-off dates, use the per-act table.')),
      // r27 (J): uma coluna — conflitos, depois próximas datas e turnês lado a lado, e as tabelas largas por artista embaixo
      // (antes a grade de 2 colunas jogava a tabela de um artista na coluna estreita e cortava as colunas)
      controlRoom20(s), h('div', { class: 'split27' }, upcomingSection(s), activeToursSection(s)), gigsSection20(s)) },
    { id: 'tours', label: T(l('Turnês', 'Tours')), icon: 'tour-bus', badge: tourList(s).filter((x) => x.status === 'running').length || undefined, render: () => toursTab(s) },
    { id: 'ops', label: T(l('Políticas e operação', 'Policies and operation')), icon: 'handshake', render: () => h('div', null,
      intro(l('Regras que valem para todas as datas (cada data pode sobrescrever), notas de palco, ingressos e merch.', 'Rules for every date (each date can override), stage notes, tickets and merch.')),
      ...secs('shows', s, SHOWS_TABS20.ops), merchSection(s), ...leftovers('shows', s, CLAIMED_SHOWS)) },
    { id: 'biz', label: T(l('Negócios ao vivo', 'Live business')), icon: 'house', render: () => h('div', null,
      intro(l('Casas, festivais e residências próprios: resultado, capacidade e investimentos. Convites de festivais alheios ficam abaixo.', 'Your own venues, festivals and residencies: results, capacity and investments. Invitations to other festivals are below.')),
      ...secs('shows', s, SHOWS_TABS20.biz), ...festivalsAside20(s)) },
    { id: 'all', label: T(l('Tudo (especialista)', 'Everything (expert)')), icon: 'star', render: () => h('div', null, showsPanel(s), extraSections('shows', s)) },
  ], rerender));
}
registerAreaView20('shows', showsHub20);

// ================================================================ SEDE

export const HQ_TABS20: Record<'ops' | 'structure' | 'team' | 'gear' | 'expand' | 'history', string[]> = {
  ops: ['careers13', 'riv12-deals'],
  structure: ['industry-rooms'],
  team: [],
  gear: ['furnish'],
  expand: ['standing9'],
  history: ['hq8-growth', 'noto14'],
};
/** 'management' é repartida em blocos (sede, departamentos, filiais, mercados) entre as subáreas. */
const CLAIMED_HQ = [...Object.values(HQ_TABS20).flat(), 'management'];

const ROOM20: Record<RoomKind, L> = {
  booth: l('Estúdio (cabine)', 'Studio (booth)'), control: l('Técnica', 'Control room'), rehearsal: l('Sala de ensaio', 'Rehearsal room'), writing: l('Sala de composição', 'Writing room'),
  lounge: l('Descanso', 'Lounge'), office: l('Escritório', 'Office'), trophy: l('Troféus e história', 'Trophies and history'), meeting: l('Reunião', 'Meeting room'), hall: l('Hall', 'Hall'),
};

// r20b: clique (ou Enter) num artista/sala na planta abre o MESMO menu do registro único (ui/actions20.ts) que o modo
// lista e o cartão do artista usam — ancorado no ponto do clique. O caminho antigo (cartão/abrir sala) virou item do menu.
const baseRoom20 = hqHooks.onRoom;
const baseAct20 = hqHooks.onAct;
/** Menu do artista na sede: ações do registro + "Na sede" (próxima decisão do cartão; ficha do integrante clicado). */
export function hqActMenu20(s: GameState, actId: string, anchor: HTMLElement, at?: { x: number; y: number }, person?: string): void {
  const items: { id: string; label: L; icon?: string; run: () => void }[] = [];
  if (baseAct20) items.push({ id: 'hq.next', label: l('Próxima decisão (cartão da sede)', 'Next decision (HQ card)'), icon: 'star', run: () => baseAct20(actId) });
  const p = person ? s.persons[person] : undefined;
  if (p) items.push({ id: 'hq.person', label: l(`Ficha de ${p.name}`, `${p.name}'s record`), icon: 'people', run: () => inspect.person(p.id) });
  openActionMenu20(s, actId, anchor, at, { label: l('Na sede', 'At HQ'), items });
}
/** Sala: com ação de um clique e artistas → menu (abrir sala + ação por artista); senão abre direto (um clique). */
export function hqRoom20(s: GameState, k: RoomKind, at?: HqAt): void {
  const act = ROOM_ACTIONS20[k];
  if (!at || !act || !playerActs(s).length) { baseRoom20?.(k); return; }
  openRoomMenu20(s, k, ROOM20[k], at.anchor, at, baseRoom20 ? () => baseRoom20(k) : undefined, act);
}
hqHooks.onAct = (id, at) => { const s = store.game; if (!s) return; if (!at) { baseAct20?.(id); return; } hqActMenu20(s, id, at.anchor, at, at.person); };
hqHooks.onRoom = (k, at) => { const s = store.game; if (s) hqRoom20(s, k, at); };
const atOf20 = (el: HTMLElement): HqAt => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.bottom, anchor: el }; };

let hqMode20: 'canvas' | 'list' = lsGet('vtn20-hq-mode') === 'list' ? 'list' : 'canvas';

/** Modo lista: mesma informação do canvas sem coordenadas (artistas, salas, equipe), tudo por teclado. */
export function hqList20(s: GameState): HTMLElement {
  const tags = hqHooks.roomTags?.(s) ?? [];
  const rooms = (Object.keys(ROOM20) as RoomKind[]);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      hqHooks.side ? hqHooks.side(s) : section(T(l('Artistas', 'Acts')), h('ul', null, playerActs(s).map((id) => h('li', null, actLink(s, id))))),
      playerActs(s).length ? section(T(l('Ações por artista', 'Actions per act')), h('ul', { class: 'hq20-acts' }, playerActs(s).map((id) => h('li', null, actLink(s, id), ' ', hqActButton20(s, id))))) : null,
      section(T(l('Salas', 'Rooms')), h('ul', { class: 'hq20-rooms' }, rooms.map((k) => {
        const tg = tags.filter((x) => x.room === k);
        const tip = hqHooks.roomTip?.(s, k) ?? [];
        const sel = store.selectedAct && playerActs(s).includes(store.selectedAct) ? store.selectedAct : playerActs(s)[0];
        const ra = sel && ROOM_ACTIONS20[k] ? actionRow20(s, ROOM_ACTIONS20[k], { act: sel }) : undefined;
        return h('li', null, h('button', { type: 'button', class: 'btn small', 'aria-haspopup': ROOM_ACTIONS20[k] && sel ? 'menu' : null, 'aria-expanded': ROOM_ACTIONS20[k] && sel ? 'false' : null, onclick: (e: Event) => { e.stopPropagation(); const b = e.currentTarget as HTMLElement; hqRoom20(s, k, atOf20(b)); } }, T(ROOM20[k])), ' ',
          ra && sel ? h('button', { type: 'button', class: 'btn small ghost', 'aria-disabled': ra.block ? 'true' : null, title: ra.block ? T(ra.block) : '', onclick: (e: Event) => chooseAction20(s, ra.def.id, sel, e.currentTarget as HTMLElement) }, `${T(ra.def.label)} · ${s.acts[sel].name}`) : null, ' ',
          ...tg.map((x) => pill(x.text, x.tone === 'info' ? '' : x.tone)), tip.length ? h('small', { class: 'muted' }, ` ${tip.join(' · ')}`) : null);
      })))),
    h('aside', { class: 'col-side' }, capacityCard(s)));
}

/** Botão `Ações ▾` do modo lista: o mesmo menu (e os mesmos itens "Na sede") que o clique no artista da planta. */
function hqActButton20(s: GameState, actId: string): HTMLElement {
  const a = s.acts[actId];
  const b: HTMLElement = h('button', { type: 'button', class: 'btn small am20-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-actmenu20': actId, 'aria-label': T(l('Ações para {a}', 'Actions for {a}')).replace('{a}', a?.name ?? ''),
    onclick: (e: Event) => { e.stopPropagation(); hqActMenu20(s, actId, b); } }, T(l('Ações', 'Actions')), ' ▾');
  return b;
}

function capacityCard(s: GameState): HTMLElement {
  const load = managementLoad(s);
  return section(T(l('Capacidade', 'Capacity')), h('p', { class: 'small' }, T(hqCapacityText(s))), kv(T(l('Carga de gestão', 'Management load')), `${(load * 100).toFixed(0)}%`),
    load > 1 ? h('p', { class: 'small bad' }, ic('warning'), ' ', T(l('Acima da capacidade: decisões atrasam e a equipe se desgasta.', 'Over capacity: decisions slip and staff wear down.'))) : null);
}

/** Investimento (uma vez) × custo recorrente (por mês), separados — r20c (N2): cada linha é UMA ação com tipo
 *  explícito (alugar, mudar de sede, comprar, reformar, equipar, ampliar) e cada preço explica moeda e base de tempo. */
export function costSplit20(s: GameState): HTMLElement {
  const st = hq6(s);
  const cur = HQ_LEVELS[s.player.hq];
  const next = HQ_LEVELS[s.player.hq + 1];
  const up = upgradeCost(s);
  const rentNow = st.ownBuilding ? 0 : money(s, cur.rent);
  type Row = { k: CostKind20; what: L; inv: number | null; rec: number | null; note?: L; go?: () => void };
  const rows: Row[] = [];
  rows.push({ k: 'rent', what: fmtL(l('Sede atual: {n}', 'Current HQ: {n}'), { n: cur.name }), inv: null, rec: rentNow, note: st.ownBuilding ? l('prédio próprio: sem aluguel', 'own building: no rent') : undefined });
  if (next && up !== null) rows.push({ k: 'move', what: fmtL(l('Mudar para {n} (sede maior)', 'Move to {n} (bigger HQ)'), { n: next.name }), inv: up, rec: money(s, next.rent), note: l('o aluguel novo substitui o atual', 'the new rent replaces the current one') });
  if (!st.ownBuilding) rows.push({ k: 'buy', what: l('Comprar o prédio da sede', 'Buy the HQ building'), inv: buildingPrice(s), rec: 0, note: l('acaba o aluguel até a próxima mudança', 'ends rent until the next move') });
  const hqB = buildings18(s).find((b) => b.kind === 'hq');
  if (hqB) rows.push({ k: 'refit', what: l('Reformar a sede (fachada e salas, estilo da época)', 'Renovate the HQ (façade and rooms, period style)'), inv: renoCost18(s, hqB), rec: null, note: l('em Nosso mundo; não muda aluguel nem capacidade', 'in Our world; changes neither rent nor capacity'),
    go: () => { store.area = 'campus18'; rerender(); } });
  const eq = availableEquipment(s).filter((e) => !s.player.equipment.includes(e.id));
  if (eq.length) {
    const cs = eq.map((e) => money(s, e.cost));
    rows.push({ k: 'equip', what: fmtL(l('Equipar: {n} item(ns) disponível(is) na loja', 'Equip: {n} item(s) available in the shop'), { n: eq.length }), inv: Math.min(...cs), rec: null, note: fmtL(l('a partir de; o mais caro custa {v}', 'from; the priciest costs {v}'), { v: $(Math.max(...cs)) }),
      go: () => { setTab('hqHub', 'gear'); rerender(); } });
  }
  for (const d of DEPTS) {
    const lv = st.depts[d.id] ?? 0;
    if (lv) rows.push({ k: 'rent', what: fmtL(l('Manter: {n}', 'Keep: {n}'), { n: d.name }), inv: null, rec: money(s, d.upkeep * lv), note: l(`nível ${lv}/3`, `level ${lv}/3`) });
    if (lv < 3) rows.push({ k: 'expand', what: l(`${lv ? 'Ampliar' : 'Criar'}: ${d.name.pt}`, `${lv ? 'Upgrade' : 'Create'}: ${d.name.en}`), inv: money(s, d.cost[lv]), rec: money(s, d.upkeep), note: l('+ manutenção por nível', '+ upkeep per level') });
  }
  const cell = (v: number | null, k: CostKind20, rec: boolean) => h('td', { class: 'num' }, v === null ? '—' : v === 0 ? $(0) : price20(s, v, k, rec));
  return section(T(l('Ações da sede e custos', 'HQ actions and costs')),
    h('p', { class: 'muted small' }, T(l('Cada linha é uma ação diferente: alugar (todo mês), mudar de sede, comprar o prédio, reformar, equipar e ampliar departamentos. ', 'Each row is a different action: rent (every month), move HQ, buy the building, renovate, equip and expand departments. ')), T(priceBasis20(s, money(s, 1000))), ' ',
      T(l('Toque num valor para ver o porquê.', 'Tap a value to see why.'))),
    h('div', { class: 'tbl-scroll20' }, h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, T(l('Ação', 'Action'))), h('th', null, T(l('Tipo', 'Type'))), h('th', null, T(l('Investimento (uma vez)', 'Investment (one-off)'))), h('th', null, T(l('Recorrente / mês', 'Recurring / month'))))),
      h('tbody', null, rows.map((r) => h('tr', null,
        h('td', null, r.go ? h('button', { type: 'button', class: 'btn tiny ghost', onclick: r.go }, T(r.what), ' ↗') : T(r.what), r.note ? h('small', { class: 'muted' }, ` · ${T(r.note)}`) : null),
        h('td', null, costKindPill20(r.k)), cell(r.inv, r.k, false), cell(r.rec, 'rent', true)))))),
    h('p', { class: 'muted small' }, T(l('Investimento sai do caixa uma vez (e respeita o caixa reservado para ofertas pendentes); o recorrente entra todo mês em Finanças (aluguel, manutenção).', 'Investment leaves cash once (and respects cash reserved for pending offers); recurring hits Finance every month (rent, upkeep).'))));
}

function hqHub20(s: GameState): HTMLElement {
  const canvasOn = () => hqMode20 === 'canvas';
  const nonCanvas = (fn: () => HTMLElement) => () => { stopHq(); return fn(); };
  const modeBar = h('div', { class: 'row wrap', role: 'group', 'aria-label': T(l('Modo de visualização', 'View mode')) },
    (['canvas', 'list'] as const).map((m) => h('button', { type: 'button', class: `chip-btn ${hqMode20 === m ? 'on' : ''}`, 'aria-pressed': hqMode20 === m ? 'true' : 'false', onclick: () => { hqMode20 = m; lsSet('vtn20-hq-mode', m); rerender(); } },
      ic(m === 'canvas' ? 'house' : 'note'), ' ', T(m === 'canvas' ? l('Sede em corte', 'Cutaway') : l('Lista', 'List')))));
  return h('div', { class: 'hub hub20 hq20' }, tabs('hqHub', [
    { id: 'ops', label: T(l('Operação', 'Operation')), icon: 'house', render: () => h('div', null,
      intro(l('Quem faz o quê agora, fila do estúdio e alertas de capacidade. A sede em corte e a lista mostram as mesmas pessoas e salas.', 'Who is doing what now, the studio queue and capacity alerts. The cutaway and the list show the same people and rooms.')),
      modeBar, canvasOn() ? hqPanel(s) : (stopHq(), hqList20(s)), ...secs('hq', s, HQ_TABS20.ops)) },
    { id: 'structure', label: T(l('Estrutura', 'Structure')), icon: 'building', render: nonCanvas(() => h('div', null,
      intro(l('Salas, funções, capacidade e reforma. Veja a capacidade antes e depois e o custo separado em investimento e recorrente.', 'Rooms, roles, capacity and refits. See capacity before and after, with cost split into investment and recurring.')),
      section(T(l('Sede', 'HQ')), hqBlock(s)), costSplit20(s), capacityCard(s), ...secs('hq', s, HQ_TABS20.structure))) },
    { id: 'team', label: T(l('Equipe e departamentos', 'Staff and departments')), icon: 'handshake', render: nonCanvas(() => h('div', null,
      section(T(l('Departamentos', 'Departments')), deptBlock(s)),
      section(T(l('Equipe', 'Staff')), h('p', { class: 'small' }, t(l('{n} pessoa(s) na equipe · carga de gestão {p}%', '{n} staff · management load {p}%'), { n: s.player.staff.length, p: Math.round(managementLoad(s) * 100) })),
        h('button', { class: 'btn small', onclick: () => { store.area = 'company'; store.companyTab = 'staff'; rerender(); } }, ic('handshake'), ' ', T(l('Contratar e gerir a equipe', 'Hire and manage staff')))),
      ...secs('hq', s, HQ_TABS20.team))) },
    { id: 'gear', label: T(l('Equipamentos e conforto', 'Gear and comfort')), icon: 'mic', render: nonCanvas(() => h('div', null,
      intro(l('Inventário e loja: cada bônus diz onde entra no cálculo.', 'Inventory and shop: each bonus says where it enters the math.')),
      ...secs('hq', s, HQ_TABS20.gear), equipmentSection20(s))) },
    { id: 'expand', label: T(l('Expansão', 'Expansion')), icon: 'globe', render: nonCanvas(() => h('div', null,
      intro(l('Prédio, filiais e mercados — compromissos recorrentes, não compras de mobília.', 'Building, branches and markets — recurring commitments, not furniture purchases.')),
      section(T(l('Filiais', 'Branches')), branchBlock(s)), section(T(l('Mercados', 'Markets')), marketsBlock(s)), ...secs('hq', s, HQ_TABS20.expand))) },
    { id: 'history', label: T(l('História', 'History')), icon: 'trophy', render: nonCanvas(() => h('div', null, ...secs('hq', s, HQ_TABS20.history), ...leftovers('hq', s, CLAIMED_HQ))) },
    { id: 'all', label: T(l('Tudo (especialista)', 'Everything (expert)')), icon: 'star', render: () => h('div', null, hqPanel(s), extraSections('hq', s)) },
  ], rerender));
}
registerAreaView20('hq', hqHub20);

void cityById;

import { ent27 } from '../ps/ent27';
import { askConfirm } from '../ask31';