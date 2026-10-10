// Rodada 17 — uma página EXCLUSIVA por carreira, dentro de Você › Carreiras. Cada página junta as mecânicas
// que antes estavam espalhadas (Gestão de artistas, Agente e promotor, Estúdio e produtor, Editora, Veículos,
// Plataforma, Negócios & direitos, Identidade, casa de shows e festival próprio) em abas, com um cabeçalho
// comum: tempo de carreira, peso na agenda (e o alívio da experiência), notoriedade, indicadores, próximos
// passos e atalhos para páginas relacionadas — sempre marcados ↗ (links, não cópias).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { careerDef, careers, dropCareer, startCareer, timeLoad } from '../../sim/sys/careers12';
import { expRelief17 } from '../../sim/sys/exp17';
import { liveOf } from '../../sim/sys/live/state';
import { TIERS, notoTier, notoriety } from '../../sim/sys/notoriety14';
import { prod, studios } from '../../sim/sys/studio12';
import { c12, hasAgency } from '../../sim/sys/tour12';
import { v17 } from '../../sim/sys/venues17';
import { ventures } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { ADVISOR_EXTRA } from '../advisor';
import { CAREER_NAV } from '../careernav13';
import { pill, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { CAREER_PAGE17, ICON17, KEY17, ORDER17 } from '../nav17';
import { EXTRA_AREAS, hideSection, registerArea, sectionsOf } from '../registry';
import { store } from '../store';
import { ic, setTab, tabs } from '../vis';
import { bizTabs17 } from './biz17';
import { careerKpis13 } from './careerui13';
import { fest17 } from './ventures16';
import { openActPage } from '../pages';

export type Tab = { id: string; label: string; icon?: string; badge?: number; render: () => HTMLElement };

const areaOf = (id: string) => EXTRA_AREAS.find((a) => a.id === id);
const owns = (s: GameState, k: string) => ventures(s).list.some((v) => v.kind === k);

/** A página da carreira aparece quando a carreira está ativa OU você já tem o negócio (e o ano permite). */
export function pageVisible17(s: GameState, id: string): boolean {
  const d = careerDef(id);
  if (!d || !CAREER_PAGE17[id]) return false;
  if (careers(s).active.includes(id)) return true;
  if (d.from > s.year) return false;
  switch (id) {
    case 'manager': return ventures(s).mg.clients.length > 0;
    case 'booking': return !!hasAgency(s) || !!c12(s).promoter?.on;
    case 'festival': return owns(s, 'festival') || liveOf(s).fests.length > 0;
    case 'venue': return !!liveOf(s).venue || v17(s).own.length > 0;
    case 'studio': return studios(s).length > 0 || !!prod(s).on;
    case 'publisher': case 'media': case 'platform': return owns(s, id);
    case 'musician': return Object.values(s.acts).some((a) => a.playerBand && a.status !== 'retired' && a.status !== 'split');
    default: return CP_VIS18[id]?.(s) ?? false;
  }
}
/** Rodada 18: carreiras novas (trilhas, jornalismo) registram visibilidade e abas da página. */
export const CP_VIS18: Record<string, (s: GameState) => boolean> = {};
export const CP_TABS18: Record<string, (s: GameState) => Tab[]> = {};
export const careerPages17 = (s: GameState): string[] => ORDER17.filter((id) => pageVisible17(s, id));

const go = (area: string, tab?: [string, string]) => { if (tab) setTab(tab[0], tab[1]); store.area = area; rerender(); };
const areaTab = (s: GameState, area: string, label: L, icon?: string): Tab | null => {
  const a = areaOf(area);
  if (!a || (a.visible && !a.visible(s))) return null;
  return { id: area, label: t(label), icon: icon ?? ICON17[area] ?? a.icon, badge: a.badge?.(s), render: () => a.render(s) };
};

/** Abas de cada carreira (as telas absorvidas mantêm o id: rotas antigas caem na aba certa). */
function careerTabs(s: GameState, id: string): Tab[] {
  const B = bizTabs17;
  const venuePage = pageVisible17(s, 'venue');
  const out: (Tab | null)[] = (() => {
    switch (id) {
      case 'label': return [
        areaTab(s, 'identity', l('Identidade', 'Identity')),
        { id: 'biz17', label: t(l('Venda & catálogo', 'Sale & catalog')), icon: 'bank', render: () => B.saleTab(s) },
        { id: 'trade', label: t(l('Canais, licenças e merch', 'Channels, licensing and merch')), icon: 'disc', render: () => h('div', null, B.outletsTab(s), B.licTab(s), B.merchTab(s)) },
        { id: 'image', label: t(l('Imagem & voz', 'Image & voice')), icon: 'star', render: () => B.imageTab(s) },
        { id: 'circuit', label: t(l('Circuito, vaquinhas e reencontros', 'Circuit, crowdfunding and reunions')), icon: 'trophy', render: () => B.circuitTab(s) },
        venuePage ? null : { id: 'venues', label: t(l('Casas de show', 'Venues')), icon: 'mic', render: () => B.venuesTab(s) },
      ];
      case 'manager': return [areaTab(s, 'management', l('Agenciados e prospecção', 'Clients and prospecting'))];
      case 'booking': return [areaTab(s, 'tour12', l('Rotas, propostas e clientes', 'Routes, offers and clients'))];
      case 'festival': return [
        { id: 'mine', label: t(l('Seus festivais', 'Your festivals')), icon: 'flag', render: () => fest17.mine(s) },
        { id: 'rivals', label: t(l('Festivais rivais', 'Rival festivals')), icon: 'building', render: () => fest17.rivals(s) },
      ];
      case 'venue': return [
        { id: 'house', label: t(l('Sua casa e programação', 'Your venue and programming')), icon: 'stage', render: () => { const xs = sectionsOf('shows', ['live-venue', 'live-venue12'], s); return h('div', null, ...(xs.length ? xs : [h('p', { class: 'muted' }, t(l('Nenhuma casa ainda.', 'No venue yet.')))])); } },
        { id: 'venues', label: t(l('Comprar e vender casas', 'Buy and sell venues')), icon: 'mic', render: () => B.venuesTab(s) },
      ];
      case 'studio': return [areaTab(s, 'studio12', l('Estúdio e produção', 'Studio and production'))];
      case 'publisher': return [areaTab(s, 'publishing16', l('Compositores e catálogo', 'Songwriters and catalog'))];
      case 'media': return [areaTab(s, 'outlets16', l('Seus veículos', 'Your outlets'))];
      case 'platform': return [areaTab(s, 'platform16', l('Sua plataforma', 'Your platform'))];
      case 'musician': return [{ id: 'band', label: t(l('Sua banda', 'Your band')), icon: 'guitar', render: () => bandTab(s) }, areaTab(s, 'artist18', l('Contratos do artista', 'Artist deals')), areaTab(s, 'shared18', l('Sociedades', 'Partnerships'))]; // r18 artist18
      default: return CP_TABS18[id]?.(s) ?? [];
    }
  })();
  return out.filter((x): x is Tab => !!x);
}

function bandTab(s: GameState): HTMLElement {
  const bands = Object.values(s.acts).filter((a) => a.playerBand);
  if (!bands.length) return h('p', { class: 'muted' }, t(l('Você ainda não tem banda própria. Monte uma em Artistas (seu elenco) ou entre como músico de apoio.', 'You have no band of your own yet. Form one in Artists (your roster) or join as a session player.')));
  return h('div', null, bands.map((a) => section(a.name,
    h('div', { class: 'row wrap small' }, pill(t(l('fama', 'fame')) + ` ${Math.round(a.fame)}`), ' ', pill(`${a.members.length} ${t(l('integrante(s)', 'member(s)'))}`), ' ', pill(String(a.status))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => openActPage(a.id) }, ic('guitar'), ' ', t(l('Página da banda', 'Band page'))),
      link('project', l('Projeto musical', 'Music project')), link('studio', l('Gravação', 'Recording')), link('shows', l('Shows', 'Shows')), link('you', l('Carreira musical (Você)', 'Music career (You)'), ['life-you', 'music'])))));
}

const link = (area: string, label: L, tab?: [string, string]) => h('button', { class: 'link cp17-link', title: t(l('Atalho para outra página do menu', 'Shortcut to another menu page')), onclick: () => go(area, tab) }, `↗ ${t(label)}`);

const RELATED: Record<string, [string, L][]> = {
  label: [['artists', l('Elenco', 'Roster')], ['market', l('Mercado', 'Market')], ['finance', l('Finanças', 'Finance')], ['labels', l('Gravadoras rivais', 'Rival labels')]],
  manager: [['managers14', l('Empresários rivais', 'Rival managers')], ['directory', l('Todos os artistas', 'All artists')], ['people', l('Pessoas', 'People')]],
  booking: [['cal17', l('Agenda de shows', 'Show calendar')], ['shows', l('Shows', 'Shows')], ['festivals', l('Festivais', 'Festivals')]],
  festival: [['festivals', l('Circuito de festivais', 'Festival circuit')], ['cal17', l('Agenda de shows', 'Show calendar')], ['directory', l('Todos os artistas', 'All artists')]],
  venue: [['shows', l('Shows', 'Shows')], ['cal17', l('Agenda de shows', 'Show calendar')], ['world', l('Mapa', 'Map')]],
  studio: [['producers15', l('Produtores', 'Producers')], ['studio', l('Gravação', 'Recording')], ['project', l('Projeto musical', 'Music project')]],
  publisher: [['catalog', l('Catálogo', 'Catalog')], ['creation', l('Composição', 'Writing')], ['directory', l('Todos os artistas', 'All artists')]],
  media: [['news17', l('Notícias e boatos', 'News & rumors')], ['media', l('Imprensa', 'Press')], ['critics', l('Críticos', 'Critics')]],
  platform: [['charts', l('Paradas', 'Charts')], ['industry', l('Indústria', 'Industry')], ['catalog', l('Catálogo', 'Catalog')]],
  musician: [['artists', l('Elenco', 'Roster')], ['shows', l('Shows', 'Shows')], ['personal', l('Vida pessoal', 'Personal life')]],
};

/** Cabeçalho comum: quem, desde quando, agenda (com alívio da experiência), notoriedade, números, próximos passos. */
function banner(s: GameState, id: string): HTMLElement {
  const d = careerDef(id)!, st = careers(s), on = st.active.includes(id);
  const tier = notoTier(s, id), nv = notoriety(s, id), nx = TIERS[tier + 1];
  const relief = expRelief17(s, id);
  const area = CAREER_PAGE17[id].area;
  const rel = new Set([area, ...CAREER_PAGE17[id].absorbs, ...(CAREER_NAV[id]?.areas ?? []), CAREER_NAV[id]?.home.area ?? '']);
  const tips = ADVISOR_EXTRA.flatMap((f) => f(s)).filter((x) => rel.has(x.area)).slice(0, 3);
  const kp = careerKpis13(s, id);
  return h('div', { class: 'card cp17-head' },
    h('div', { class: 'row wrap between' },
      h('div', { class: 'row wrap' }, ic(CAREER_PAGE17[id].icon, 2), ' ', h('h3', null, t(CAREER_PAGE17[id].label)), ' ',
        on ? pill(`${t(l('desde', 'since'))} ${st.started[id] ?? s.year}`, 'good') : pill(t(l('não é sua carreira — só o negócio', 'not your career — business only')), 'warn'), ' ',
        pill(t(TIERS[tier].name), tier >= 3 ? 'gold' : '')),
      on ? (id === 'label' ? link('cp17-label', l('Vender o selo: aba Venda & catálogo', 'Sell the label: Sale & catalog tab'), [area, 'biz17'])
        : h('button', { class: 'btn tiny ghost', title: t(l('Larga a carreira: libera agenda; negócios continuam seus (vendê-los é na própria aba).', 'Drops the career: frees schedule; businesses stay yours (sell them in their own tab).')), onclick: () => { const r = dropCareer(s, id); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, t(l('Largar carreira', 'Drop career'))))
        : h('button', { class: 'btn tiny primary', onclick: () => { const r = startCareer(s, id); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, t(l('Assumir como carreira', 'Take it up as a career')))),
    h('p', { class: 'small muted' }, t(d.desc)),
    kp.length ? h('div', { class: 'kpi13 cp17-kpi' }, kp.map(([k, v, c]) => h('div', { class: 'kv13' }, h('span', { class: 'muted' }, t(k)), h('b', { class: c ?? '' }, v)))) : null,
    h('div', { class: 'row wrap small' },
      t(l('Agenda', 'Schedule')), ': ', h('b', null, `${Math.round((d.load - (on ? relief : 0)) * 100)}%`),
      relief > 0 ? h('span', { class: 'good' }, ` (${t(l('experiência: −{p} pts', 'experience: −{p} pts'), { p: Math.round(relief * 100) })})`) : null,
      ` · ${t(l('total', 'total'))} ${Math.round(timeLoad(s) * 100)}% · ${t(l('notoriedade', 'notoriety'))} ${nv} `, bar(Math.min(100, nv)),
      nx ? h('span', { class: 'muted' }, ` ${t(l('próximo degrau ({n}) em {v}: a carreira pesará ainda menos na agenda', 'next step ({n}) at {v}: the career will weigh even less on your schedule'), { n: t(nx.name), v: nx.min })}`) : null),
    tips.length ? h('ul', { class: 'small cp17-tips' }, tips.map((x) => h('li', { class: x.level === 'bad' ? 'bad' : x.level === 'warn' ? 'warn' : '' }, ic(x.icon), ' ', t(x.text)))) : null,
    RELATED[id]?.length ? h('div', { class: 'row wrap small cp17-rel' }, h('span', { class: 'muted' }, t(l('Atalhos:', 'Shortcuts:'))), ...RELATED[id].map(([a, lb]) => link(a, lb))) : null);
}

export function careerPage17(s: GameState, id: string): HTMLElement {
  const items = careerTabs(s, id);
  const area = CAREER_PAGE17[id].area;
  return h('div', { class: `hub cp17 cp17-${id}` }, banner(s, id),
    items.length > 1 ? tabs(area, items, rerender) : items[0] ? h('div', { 'data-tabs': area, 'data-cur': items[0].id }, items[0].render()) : null);
}

for (const id of ORDER17) {
  const p = CAREER_PAGE17[id];
  registerArea({ id: p.area, label: p.label, icon: p.icon, key: KEY17[p.area] ?? '', render: (s) => careerPage17(s, id), visible: (s) => pageVisible17(s, id),
    badge: (s) => p.absorbs.reduce((n, a) => n + (areaOf(a)?.badge?.(s) ?? 0), 0) || undefined });
}

// casa de shows e festival próprio saem de Shows quando a página da carreira existe (um lugar só)
hideSection((host, sid, s) => host === 'shows' && ((sid === 'live-venue' || sid === 'live-venue12') ? pageVisible17(s, 'venue') : sid === 'live-festival' ? pageVisible17(s, 'festival') : false));
