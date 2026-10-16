// Rodada 19 (onda 5, B.4 — auditoria 8 §4): atalhos do Cockpit e bloco de "humor" guiados pelas carreiras ativas.
// O empresário vê Clientes/Prospectar/Crises; o festival, Line-up/Ingressos/Fluxo de caixa; o selo, os atalhos clássicos.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { careers } from '../../sim/sys/careers12';
import { f12 } from '../../sim/sys/fest12';
import { liveOf } from '../../sim/sys/live';
import { c12 } from '../../sim/sys/manager12';
import { mainCareer19 } from '../../sim/sys/prof19';
import { ventures } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { CAREER_NAV } from '../careernav13';
import { inspect, rerender } from '../common';
import { h } from '../dom';
import { CAREER_PAGE17 } from '../nav17';
import { EXTRA_AREAS } from '../registry';
import { store } from '../store';
import { ic, setTab } from '../vis';
import { ent27 } from '../ps/ent27';

type Q = [area: string, icon: string, label: L, tab?: [string, string]];
const LABEL: Q[] = [['market', 'fans', l('Contratar', 'Sign')], ['studio', 'note', l('Gravar', 'Record')], ['releases', 'disc', l('Lançar', 'Release')], ['shows', 'mic', l('Shows', 'Shows')], ['charts', 'chart-up', l('Paradas', 'Charts')]];
/** Atalhos por carreira (a primeira carreira ativa vem primeiro; "Finanças" sempre fica). */
export const QUICK19: Record<string, Q[]> = {
  label: LABEL,
  manager: [['management', 'fans', l('Clientes', 'Clients'), ['management9', 'roster']], ['management', 'handshake', l('Prospectar', 'Prospect'), ['management9', 'prospect']], ['management', 'warning', l('Crises e relatórios', 'Crises and reports'), ['management9', 'reports']], ['managers14', 'tie', l('Rivais', 'Rivals')]],
  festival: [['festivals', 'star', l('Line-up', 'Line-up'), ['festivals16', 'mine']], ['festivals', 'ticket', l('Ingressos', 'Tickets'), ['festivals16', 'mine']], ['cal17', 'calendar', l('Agenda', 'Calendar')]],
  booking: [['tour12', 'tour-bus', l('Rotas e clientes', 'Routes and clients')], ['cal17', 'calendar', l('Agenda', 'Calendar')], ['festivals', 'star', l('Festivais', 'Festivals')]],
  venue: [[CAREER_PAGE17.venue.area, 'stage', l('Programação', 'Programming'), [CAREER_PAGE17.venue.area, 'house']], ['cal17', 'calendar', l('Agenda', 'Calendar')]],
  studio: [['studio12', 'mixer', l('Sessões', 'Sessions')], ['producers15', 'note', l('Produtores', 'Producers')]],
  publisher: [['publishing16', 'note', l('Catálogo e pedidos', 'Catalog and requests')], ['catalog', 'disc', l('Obras', 'Works')]],
  media: [['outlets16', 'radio', l('Programação', 'Programming')], ['critics', 'typewriter', l('Críticos', 'Critics')], ['charts', 'chart-up', l('Paradas', 'Charts')]],
  platform: [['platform16', 'globe', l('Plataforma', 'Platform')], ['charts', 'chart-up', l('Paradas', 'Charts')]],
  musician: [[CAREER_PAGE17.musician.area, 'guitar', l('Sua banda', 'Your band'), [CAREER_PAGE17.musician.area, 'band']], ['artist18', 'contract', l('Propostas', 'Offers')], ['shows', 'mic', l('Shows', 'Shows')]],
};
const hidden = (s: GameState, area: string) => { const a = EXTRA_AREAS.find((x) => x.id === area); return !!a?.visible && !a.visible(s); };

/** Lista de atalhos para as carreiras ativas (testável sem DOM). */
export function quickList19(s: GameState): Q[] {
  const act = careers(s).active;
  const out: Q[] = [], seen = new Set<string>();
  for (const id of act.length ? act : ['label']) {
    const qs = QUICK19[id] ?? (CAREER_NAV[id] ? [[CAREER_NAV[id].home.area, CAREER_NAV[id].icon, CAREER_NAV[id].label, CAREER_NAV[id].home.tab] as Q] : CAREER_PAGE17[id] ? [[CAREER_PAGE17[id].area, CAREER_PAGE17[id].icon, CAREER_PAGE17[id].label] as Q] : []);
    for (const q of qs) { const k = `${q[0]}|${q[3]?.join(':') ?? ''}|${q[2].pt}`; if (!seen.has(k) && !hidden(s, q[0])) { seen.add(k); out.push(q); } }
  }
  return [...out.slice(0, 6), ['finance', 'money', l('Finanças', 'Finances')]];
}
const go = (q: Q) => { if (q[3]) setTab(q[3][0], q[3][1]); store.area = q[0] as typeof store.area; rerender(); };
export function quick19(s: GameState): HTMLElement {
  return h('div', { class: 'hm18-quick', role: 'toolbar', 'aria-label': t(l('Atalhos', 'Quick actions')) }, quickList19(s).map((q) => h('button', { class: 'btn small ghost', onclick: () => go(q) }, ic(q[1]), ' ', t(q[2]))));
}

const face = (v: number) => (v >= 70 ? '😄' : v >= 50 ? '🙂' : v >= 30 ? '😐' : '😟');
/** Bloco de humor pela carreira principal: clientes (empresário), último público (festival); null = usar o do elenco. */
export function moodBlock19(s: GameState): { title: L; el: HTMLElement; hot: boolean } | null {
  const main = mainCareer19(s);
  if (main === 'manager') {
    const cl = ventures(s).mg.clients.slice(0, 8);
    if (!cl.length) return null;
    const vs = cl.map((c) => ({ c, v: Math.round(c12(s, c.actId).trust) }));
    return { title: l('Humor dos clientes', 'Client mood'), hot: vs.some((x) => x.v < 35 || !!x.c.crisis), el: h('section', { class: 'card hm18-mood' },
      h('div', { class: 'ck14-head' }, h('h3', null, ic('fans'), ' ', t(l('Humor dos clientes', 'Client mood')))),
      h('div', { class: 'hm18-faces' }, vs.map(({ c, v }) => h('button', { ...ent27('act', c.actId), class: `hm18-face ${v < 35 || c.crisis ? 'hot' : ''}`, title: `${s.acts[c.actId]?.name ?? ''}: ${t(l('(satisfação + confiança)/2', '(satisfaction + trust)/2'))} = ${v}`, onclick: () => inspect.act(c.actId) },
        h('span', { class: 'hm18-emo' }, face(v)), h('small', null, s.acts[c.actId]?.name ?? '?'), h('i', { class: 'hm18-bar' }, h('i', { style: `width:${Math.max(4, Math.min(100, v))}%` })))))) };
  }
  if (main === 'festival') {
    const fs = liveOf(s).fests;
    if (!fs.length) return null;
    const rows = fs.map((f) => { const x = f12(s, f), last = x.hist[x.hist.length - 1]; return { f, last, sold: Math.round(x.cyc.sold + x.cyc.early) }; });
    return { title: l('Último público', 'Last crowd'), hot: rows.some((r) => r.last && r.last.crowd < r.last.cap * 0.5), el: h('section', { class: 'card hm18-mood' },
      h('div', { class: 'ck14-head' }, h('h3', null, ic('fans'), ' ', t(l('Último público', 'Last crowd')))),
      h('ul', { class: 'small' }, rows.map((r) => h('li', null, h('b', null, r.f.name), ': ', r.last
        ? t(l('{y}: {c} de {k} lugares ({p}%), nota {n} — {tag}', '{y}: {c} of {k} places ({p}%), rating {n} — {tag}'), { y: r.last.y, c: r.last.crowd, k: r.last.cap, p: Math.round(r.last.crowd / Math.max(1, r.last.cap) * 100), n: Math.round(r.last.rating), tag: t(r.last.tag) })
        : t(l('primeira edição ainda por vir; {v} ingressos vendidos', 'first edition still ahead; {v} tickets sold'), { v: r.sold }))))) };
  }
  return null;
}
