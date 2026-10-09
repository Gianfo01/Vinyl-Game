// Rodada 13: dossiê completo do selo (um só popup, usado em todo lugar onde se clica num selo — inclusive
// o seu e o ranking de Prestígio) e abas novas na ficha do artista e da pessoa: marcos e recordes,
// "definiu uma época", fracassos, contratos e selos, relíquias e vida pessoal (com campos genéricos).

import { CONTRACT_MODELS } from '../../data/rules';
import { l, marketById, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { bolsa, change12, holders } from '../../sim/sys/bolsa10';
import { ch7 } from '../../sim/sys/charts7';
import {
  actContracts, actLabelHistory, actMilestones, actRelics, isPlayerLabel, labelAlumni, labelAwards, labelName13, labelRoster13, labelScenes,
  labelShareHistory, labelStats13, labelTopReleases, personExtraFacts, personLife, type Award13, type Fact13,
} from '../../sim/sys/dossier13';
import { actHype } from '../../sim/sys/hype12';
import { leaderOf, leaders } from '../../sim/sys/leaders10';
import { RELIC_KIND, RELIC_ST, ownerName as relicOwner } from '../../sim/sys/relics9';
import { moveText, rivals8, sceneName } from '../../sim/sys/rivals8';
import { dealWith, rivals12 } from '../../sim/sys/rivals12';
import { STAND_KEYS, STAND_NAME, standingOf, standingRanking } from '../../sim/sys/standing9';
import type { Act, GameState, Person } from '../../sim/types';
import { $, N, actLink, cityName, genreName, kv, modal, pill, releaseLink, sparkline, strategyName } from '../common';
import { bar, h } from '../dom';
import { LABEL_EXTRAS, labelOpener } from '../ficha';
import { ACT_TABS, PERSON_TABS, openPersonPage } from '../pages';
import { pageTabs } from '../registry';
import { store } from '../store';
import { chips, ic, lineChart, stat } from '../vis';
import { hypeMeter } from './hype12';
import { openLabelStory } from './story12';
import './map13.css';

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const why = (x: L) => h('p', { class: 'dos13-why' }, t(x));
const empty = (x: L) => h('p', { class: 'muted small' }, t(x));
const ARCH: Record<string, L> = { empire: l('Império', 'Empire'), scene_hunter: l('Caçador de cenas', 'Scene hunter'), hitmaker: l('Fábrica de hits', 'Hitmaker'), catalog: l('Catálogo', 'Catalog'), boutique: l('Butique', 'Boutique') };
const FAM: Record<string, L> = { A: l('Estrelas e escala', 'Stars & scale'), B: l('Descoberta e cenas', 'Discovery & scenes'), C: l('Hits e comunicação', 'Hits & publicity'), D: l('Patrimônio e catálogo', 'Heritage & catalog') };
const labelBtn = (s: GameState, id: string) => h('button', { class: 'link', onclick: (e: Event) => { e.stopPropagation(); openLabelDossier(id); } }, labelName13(s, id));

/** Abas locais (mesmo visual das fichas de artista). */
function tabbed(items: { id: string; label: L; icon: string; render: () => HTMLElement | null }[], initial?: string): HTMLElement {
  const body = h('div', { class: 'pg-tab-body' });
  const bar0 = h('div', { class: 'tabs', role: 'tablist' });
  let cur = items.find((i) => i.id === initial)?.id ?? items[0]?.id;
  const draw = () => {
    bar0.replaceChildren(...items.map((i) => h('button', { role: 'tab', 'aria-selected': i.id === cur ? 'true' : 'false', class: i.id === cur ? 'on' : '', onclick: () => { cur = i.id; draw(); } }, ic(i.icon), ' ', t(i.label))));
    body.replaceChildren(items.find((i) => i.id === cur)?.render() ?? h('span'));
  };
  draw();
  return h('div', { class: 'tabs-wrap pg-tabs' }, bar0, body);
}

function awardsList(s: GameState, xs: Award13[]): HTMLElement {
  return xs.length ? h('ul', { class: 'dos13-list small' }, xs.slice(0, 30).map((a) => h('li', null, ic('trophy'), ` ${a.y} · ${t(a.name)} — `, a.relId && s.releases[a.relId] ? releaseLink(s, a.relId) : a.actId && s.acts[a.actId] ? actLink(s, a.actId) : a.who)))
    : empty(l('Nenhum prêmio ainda.', 'No awards yet.'));
}

// ================================================================== dossiê do selo

export function openLabelDossier(id: string, tab?: string): void {
  const s = store.game;
  if (!s || (!isPlayerLabel(id) && !s.labels[id])) return;
  let close = () => {};
  const body = labelDossier(s, id, () => close(), tab);
  close = modal(labelName13(s, id), body, { wide: true });
}

export function labelDossier(s: GameState, id: string, close: () => void, tab?: string): HTMLElement {
  const me = isPlayerLabel(id);
  const lb = s.labels[id];
  const st = standingOf(s, id);
  const rank = standingRanking(s).findIndex((x) => x.id === id) + 1;
  const roster = labelRoster13(s, id);
  const stats = labelStats13(s, id);
  const hype = (() => { try { return hypeMeter(s, `l:${id}`, l('Hype do selo', 'Label hype')); } catch { return null; } })();
  const ld = me ? undefined : leaderOf(s, id);
  const revLast = me ? s.player.revenueByYear[s.year - 1] ?? 0 : lb.revenueLastYear;
  const head = h('div', { class: 'dos13-head' },
    h('div', null,
      h('h3', null, labelName13(s, id), ' ', me ? pill(t(l('você', 'you')), 'gold') : null, lb && !lb.active ? pill(t(l('fechado', 'closed')) + (lb.closedYear ? ` ${lb.closedYear}` : ''), 'bad') : null,
        lb?.archetype ? pill(t(ARCH[lb.archetype])) : null, lb?.parentLabel ? pill(`${t(l('subselo de', 'sub-label of'))} ${labelName13(s, lb.parentLabel)}`) : null),
      h('div', { class: 'muted small' }, `${cityName(me ? s.config.homeCity : lb.city)} · ${t(l('desde', 'since'))} ${me ? s.config.startYear : lb.founded}${ld ? ` · ${t(l('líder', 'leader'))}: ${ld.name}` : lb?.ceo ? ` · CEO ${lb.ceo}` : ''}`),
      chips(
        stat('star', rank ? `#${rank}` : '—', l('no ranking de prestígio', 'in the standing ranking')),
        stat('fans', roster.length, l('artistas no elenco', 'acts on the roster')),
        stat('money', $(revLast), l('receita do último ano', 'last year revenue')),
        stat('trophy', stats.no1, l('números 1', 'number ones')),
        stat('fire', Math.round(st.pop), l('popularidade', 'popularity')),
      )),
  );
  const extras = pageTabs('label', s, id).map((x) => ({ id: `x-${x.id}`, label: x.label, icon: x.icon, render: () => x.render(s, id) }));
  return h('div', { class: 'ficha pg dossier13' }, head, tabbed([
    { id: 'overview', label: l('Visão geral', 'Overview'), icon: 'building', render: () => overviewTab(s, id) },
    { id: 'standing', label: l('Prestígio e hype', 'Standing and hype'), icon: 'star', render: () => h('div', null,
      why(l('Reconhecimento = peso histórico (prêmios, hits, catálogo). Popularidade = quanto o público ouve agora. Momento = tendência do ano. Crítica = notas das resenhas. Confiança = como artistas veem o selo (pesa em contratações).', 'Recognition = historical weight (awards, hits, catalog). Popularity = how much the public listens now. Momentum = this year\'s trend. Critics = review scores. Trust = how artists see the label (matters for signings).')),
      ...STAND_KEYS.map((k) => h('div', { class: 'row small' }, h('span', { style: 'min-width:11em' }, t(STAND_NAME[k])), bar(st[k]), ` ${Math.round(st[k])}`)),
      st.hist.length > 1 ? h('div', null, h('small', { class: 'muted' }, t(l('Nota de prestígio ao longo do tempo', 'Standing score over time'))), sparkline(st.hist, 260, 40)) : null,
      lb ? kv(t(l('Reputação pública', 'Public reputation')), h('span', null, bar(lb.reputation), ` ${Math.round(lb.reputation)}`)) : kv(t(l('Reputação (artística/comercial)', 'Reputation (artistic/commercial)')), `${Math.round(s.player.reputation.artistic)} / ${Math.round(s.player.reputation.commercial)}`),
      hype) },
    { id: 'market', label: l('Mercado', 'Market'), icon: 'chart-up', render: () => marketTab(s, id) },
    { id: 'roster', label: l('Elenco', 'Roster'), icon: 'fans', render: () => rosterTab(s, id) },
    { id: 'releases', label: l('Discos', 'Releases'), icon: 'disc', render: () => releasesTab(s, id) },
    { id: 'awards', label: l('Prêmios', 'Awards'), icon: 'trophy', render: () => awardsList(s, labelAwards(s, id)) },
    { id: 'money', label: l('Finanças e ações', 'Finances and stock'), icon: 'money', render: () => financeTab(s, id, close) },
    me ? null : { id: 'you', label: l('Relação com você', 'Relationship with you'), icon: 'handshake', render: () => relationTab(s, id) },
    { id: 'scenes', label: l('Cenas', 'Scenes'), icon: 'fire', render: () => scenesTab(s, id) },
    { id: 'history', label: l('História', 'History'), icon: 'book', render: () => historyTab(s, id, close) },
    ...extras,
  ].filter((x): x is NonNullable<typeof x> => !!x), tab));
}

function overviewTab(s: GameState, id: string): HTMLElement {
  const me = isPlayerLabel(id);
  const lb = s.labels[id];
  const stats = labelStats13(s, id);
  return h('div', { class: 'grid2' },
    h('div', null,
      lb ? kv(t(l('Família', 'Family')), `${lb.family} · ${t(FAM[lb.family])}`) : null,
      lb ? kv(t(l('Estratégia', 'Strategy')), strategyName(lb.strategy)) : null,
      lb?.focus?.length ? kv(t(l('Foco em gêneros', 'Genre focus')), lb.focus.map(genreName).join(', ')) : null,
      kv(t(l('Mercados onde atua', 'Markets served')), (me ? s.player.territories : lb.territories).map((m) => t(marketById[m]?.name ?? l(m))).join(', ') || '—'),
      lb ? kv(t(l('Agressividade', 'Aggression')), h('span', null, bar(lb.aggression * 100), ` ${Math.round(lb.aggression * 100)}`)) : null,
      lb?.lastDecision ? kv(t(l('Última decisão', 'Last decision')), t(lb.lastDecision)) : null,
    ),
    h('div', null,
      chips(stat('disc', stats.releases, l('lançamentos', 'releases')), stat('chart-up', stats.top10, l('no top 10', 'top 10')),
        stat('gold-disc', stats.gold, l('discos de ouro', 'gold records')), stat('platinum-disc', stats.plat, l('platina+', 'platinum+')), stat('fans', N(stats.units), l('unidades vendidas', 'units sold'))),
      why(l('Contagem a partir dos lançamentos guardados no mundo (inclui os de antes da sua run).', 'Counted from the releases stored in the world (includes those before your run).')),
    ));
}

function marketTab(s: GameState, id: string): HTMLElement {
  const hist = labelShareHistory(s, id);
  const by: { a3: string; u: number; tot: number }[] = [];
  for (const [a3, rec] of Object.entries(ch7(s)?.yearUnits ?? {})) {
    let u = 0, tot = 0;
    for (const [rid, x] of Object.entries(rec)) { tot += x; if (s.releases[rid]?.owner === id) u += x; }
    if (u > 0) by.push({ a3, u, tot });
  }
  by.sort((a, b) => b.u - a.u);
  return h('div', null,
    why(l('Fatia = unidades dos lançamentos do selo daquele ano ÷ unidades de todos os lançamentos do ano (vendas acumuladas).', 'Share = units of the label\'s releases that year ÷ units of all releases that year (lifetime sales).')),
    hist.length > 1 ? lineChart(hist.map((x) => Math.round(x.share * 1000) / 10), 420, 90) : null,
    hist.length ? h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), h('th', null, t(l('Fatia', 'Share'))), h('th', null, t(l('Unidades', 'Units'))))),
      h('tbody', null, hist.slice(-12).reverse().map((x) => h('tr', null, h('td', null, x.y), h('td', null, pct(x.share, 1)), h('td', null, N(x.units)))))) : empty(l('Sem lançamentos registrados.', 'No releases recorded.')),
    by.length ? h('div', null, h('h4', null, t(l('Onde vende neste ano', 'Where it sells this year'))),
      h('ul', { class: 'dos13-list small' }, by.slice(0, 10).map((x) => h('li', null, `${x.a3} · ${N(x.u)} ${t(l('unidades', 'units'))} · ${pct(x.u / Math.max(1, x.tot))} ${t(l('do país', 'of the country'))}`)))) : null,
  );
}

function rosterTab(s: GameState, id: string): HTMLElement {
  const roster = labelRoster13(s, id);
  const alumni = labelAlumni(s, id);
  return h('div', null,
    roster.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Artista', 'Act'), l('Gênero', 'Genre'), l('Fama', 'Fame'), l('Hype', 'Hype'), l('Nº 1', 'No. 1'), l('Status', 'Status')].map((x) => h('th', null, t(x))))),
      h('tbody', null, roster.slice(0, 60).map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, genreName(a.genre)), h('td', null, Math.round(a.fame)), h('td', null, Math.round(actHype(s, a.id))), h('td', null, a.number1s), h('td', null, a.status)))))
      : empty(l('Elenco vazio.', 'Empty roster.')),
    alumni.length ? h('div', null, h('h4', null, t(l('Já passaram por aqui', 'Former acts'))),
      h('div', { class: 'chips' }, alumni.slice(0, 30).map((x) => h('span', null, actLink(s, x.act.id), h('small', { class: 'muted' }, ` (${x.n}, ${t(l('até', 'until'))} ${x.last}) `))))) : null);
}

function releasesTab(s: GameState, id: string): HTMLElement {
  const rs = labelTopReleases(s, id, 15);
  return rs.length ? h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, ...[l('Disco', 'Release'), l('Artista', 'Act'), l('Ano', 'Year'), l('Pico', 'Peak'), l('Unidades', 'Units'), l('Selo', 'Cert.')].map((x) => h('th', null, t(x))))),
    h('tbody', null, rs.map((r) => h('tr', null, h('td', null, releaseLink(s, r.id)), h('td', null, actLink(s, r.actId)), h('td', null, r.year), h('td', null, r.peak < 999 ? `#${r.peak}` : '—'), h('td', null, N(r.totalUnits)), h('td', null, r.certified ? pill(r.certified, 'gold') : '')))))
    : empty(l('Nenhum lançamento ainda.', 'No releases yet.'));
}

function financeTab(s: GameState, id: string, close: () => void): HTMLElement {
  const me = isPlayerLabel(id);
  const lb = s.labels[id];
  const q = bolsa(s).q[`lb:${id}`];
  const ipo = bolsa(s).lbl[id];
  const yrs = Object.keys(s.player.revenueByYear).map(Number).sort((a, b) => a - b).slice(-8);
  const body = h('div', null,
    me ? h('div', null,
      kv(t(l('Caixa', 'Cash')), $(s.player.cash)),
      yrs.length ? h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), h('th', null, t(l('Receita', 'Revenue'))), h('th', null, t(l('Lucro', 'Profit'))))),
        h('tbody', null, yrs.reverse().map((y) => h('tr', null, h('td', null, y), h('td', null, $(s.player.revenueByYear[y] ?? 0)), h('td', { class: (s.player.profitByYear[y] ?? 0) < 0 ? 'bad' : 'good' }, $(s.player.profitByYear[y] ?? 0)))))) : null,
      s.listing?.listed ? kv(t(l('Na bolsa', 'Listed')), `${N(s.listing.shares)} ${t(l('ações', 'shares'))}`) : null)
      : h('div', null,
        kv(t(l('Receita do último ano (pública)', 'Last year revenue (public)')), $(lb.revenueLastYear)),
        kv(t(l('Receita do ano até agora', 'Revenue so far this year')), $(lb.revenueYear)),
        lb.debt ? kv(t(l('Dívida', 'Debt')), $(lb.debt)) : null,
        why(l('Caixa e contas internas só aparecem com participação acionária (assento no conselho).', 'Cash and internal accounts only show with an equity stake (board seat).'))),
    q && !me ? h('div', null, h('h4', null, t(l('Ações', 'Stock'))),
      q.dead ? pill(`${t(q.dead.text)} (${q.dead.y})`, 'bad') : chips(stat('money', `$${q.p.toFixed(2)}`, l('cotação', 'price')), stat(change12(q) >= 0 ? 'chart-up' : 'chart-down', `${change12(q) >= 0 ? '+' : ''}${Math.round(change12(q) * 100)}%`, l('em 12 meses', 'over 12 months')), ipo ? stat('calendar', ipo, l('abriu capital', 'went public')) : null),
      q.hist.length > 1 ? sparkline(q.hist.slice(-48), 260, 40) : null,
      h('ul', { class: 'dos13-list small' }, holders(s, `lb:${id}`).map((x) => h('li', null, `${t(x.name)} · ${pct(x.frac, 1)}`)))) : !me ? empty(l('Capital fechado: sem ações em bolsa.', 'Privately held: not on the exchange.')) : null,
  );
  if (!me) for (const f of LABEL_EXTRAS) { const el = f(s, id, close); if (el) body.appendChild(el); }
  return body;
}

function relationTab(s: GameState, id: string): HTMLElement {
  const ld = leaderOf(s, id);
  const d = dealWith(s, id);
  const feud = Math.round(s.rivalries?.[id] ?? 0);
  const fights = rivals12(s).c.filter((c) => c.lb === id);
  const moves = (rivals8(s)?.log?.[id] ?? []).slice(-12).reverse();
  const poach = Object.values(s.acts).filter((a) => a.owner === 'player' && rivals8(s)?.interest?.[a.id]?.lb === id);
  return h('div', null,
    chips(stat('fire', feud, l('rixa com você (0–100)', 'feud with you (0–100)')),
      ld ? stat('handshake', Math.round(ld.rel.player ?? 0), l('líder com você (−100 a 100)', 'leader toward you (−100 to 100)')) : null,
      stat('flag', fights.length, l('disputas registradas', 'recorded fights'))),
    why(l('Rixa sobe quando vocês disputam artistas, datas e vagas; acima de 50 eles atacam seus lançamentos e elenco. Acordos de distribuição baixam a rixa, mas criam tensão.', 'Feud rises when you fight over acts, dates and slots; above 50 they attack your releases and roster. Distribution deals lower the feud but add tension.')),
    d ? h('p', null, pill(`${t(l('distribui você em', 'distributes you in'))} ${t(marketById[d.m].name)} · ${t(l('tensão', 'tension'))} ${Math.round(d.ten)}`, d.ten > 70 ? 'bad' : 'good')) : null,
    poach.length ? h('p', { class: 'bad small' }, t(l('De olho no seu elenco: ', 'Eyeing your roster: ')), ...poach.map((a) => actLink(s, a.id))) : null,
    h('h4', null, t(l('Últimos movimentos', 'Latest moves'))),
    moves.length ? h('ul', { class: 'dos13-list small' }, moves.map((m) => h('li', null, t(moveText(m))))) : empty(l('Nada registrado.', 'Nothing recorded.')),
    fights.length ? h('ul', { class: 'dos13-list small' }, fights.slice(-8).reverse().map((c) => h('li', null, ic('flag'), ' ', t(c.t)))) : null);
}

function scenesTab(s: GameState, id: string): HTMLElement {
  const sc = labelScenes(s, id);
  const owned = Object.entries(rivals8(s)?.scene ?? {}).filter(([, lb]) => lb === id).map(([k]) => k);
  return h('div', null,
    why(l('Cenas onde o elenco nasceu (cidade e gênero) e a força atual de cada uma (0–10). Cena forte rende talento e público fiel.', 'Scenes the roster comes from (city and genre) and each one\'s current strength (0–10). A strong scene yields talent and a loyal audience.')),
    sc.length ? h('ul', { class: 'dos13-list small' }, sc.slice(0, 12).map((x) => { const [c, g] = x.key.split(':'); return h('li', null, ic('fire'), ` ${genreName(g)} · ${cityName(c)} — ${x.acts} ${t(l('artista(s)', 'act(s)'))} · ${t(l('força', 'strength'))} ${x.v.toFixed(1)}`); })) : empty(l('Sem cenas.', 'No scenes.')),
    owned.length ? h('p', { class: 'small' }, h('b', null, t(l('Domina: ', 'Dominates: '))), owned.map((k) => sceneName(k)).join(', ')) : null);
}

function historyTab(s: GameState, id: string, close: () => void): HTMLElement {
  const me = isPlayerLabel(id);
  const lb = s.labels[id];
  const L0 = leaders(s);
  const jobs = L0 ? Object.values(L0.L).flatMap((x) => x.jobs.filter((j) => j.lb === id).map((j) => ({ who: x.name, ...j }))).filter((j) => j.from <= s.year).sort((a, b) => a.from - b.from) : [];
  const news = bolsa(s).news.filter((n) => n.id === `lb:${id}` && n.y <= s.year).slice(0, 10);
  const firsts = labelTopReleases(s, id, 200).filter((r) => r.peak === 1).sort((a, b) => a.year - b.year).slice(0, 3);
  const items: { y: number; txt: string | HTMLElement }[] = [
    { y: me ? s.config.startYear : lb.founded, txt: t(l('Fundação', 'Founded')) + ` (${cityName(me ? s.config.homeCity : lb.city)})` },
    ...jobs.map((j) => ({ y: j.from, txt: `${j.who} ${t(l('assume a direção', 'takes charge'))}${j.to ? ` (${t(l('até', 'until'))} ${j.to})` : ''}` })),
    ...firsts.map((r) => ({ y: r.year, txt: h('span', null, t(l('Nº 1: ', 'No. 1: ')), releaseLink(s, r.id)) })),
    ...(bolsa(s).lbl[id] ? [{ y: bolsa(s).lbl[id], txt: t(l('Abre capital na bolsa', 'Goes public')) }] : []),
    ...(lb?.closedYear ? [{ y: lb.closedYear, txt: t(l('Fecha as portas', 'Closes its doors')) }] : []),
  ].sort((a, b) => a.y - b.y);
  return h('div', null,
    h('ul', { class: 'memory timeline' }, items.map((x) => h('li', null, h('span', { class: 'muted' }, `${x.y} · `), x.txt))),
    news.length ? h('div', null, h('h4', null, t(l('Manchetes', 'Headlines'))), h('ul', { class: 'dos13-list small' }, news.map((n) => h('li', null, `${n.y} · `, t(n.t))))) : null,
    me ? h('button', { class: 'btn small', onclick: () => { close(); openLabelStory(s); } }, ic('book'), ' ', t(l('História do selo (completa)', 'Label story (full)'))) : null);
}

// ================================================================== ficha do artista: abas novas

const know = (s: GameState, a: Act): number => (a.owner === 'player' || a.playerBand ? 5 : s.knowledge[a.id]?.degree ?? 0);

ACT_TABS.push((s, a) => ({
  id: 'records13', label: l('Marcos e recordes', 'Milestones and records'), icon: 'trophy',
  render: () => {
    const m = actMilestones(s, a);
    return h('div', null,
      chips(stat('trophy', m.no1, l('números 1', 'number ones')), stat('chart-up', m.top10, l('no top 10', 'top 10s')), stat('star', m.peak < 999 ? `#${m.peak}` : '—', l('melhor posição', 'best position')),
        stat('gold-disc', m.certs.length, l('certificações', 'certifications')), stat('trophy', m.awards.length, l('prêmios', 'awards')), stat('fire', Math.round(actHype(s, a.id)), l('hype agora', 'hype now'))),
      h('h4', null, t(l('Definiu uma época?', 'Did they define an era?'))),
      m.defined.length ? h('ul', { class: 'dos13-list small' }, m.defined.map((d) => h('li', null, ic('star'), ` ${t(d.what)} (${d.y0}–${d.y1}) · #${d.rank} ${t(l('entre as figuras que definiram o período', 'among the figures who defined the period'))}`)))
        : empty(l('Ainda não: entre as 3 figuras mais marcantes de uma era ou década (pela crônica do mundo) o artista "define a época".', 'Not yet: being among the 3 most notable figures of an era or decade (by the world chronicle) means "defining the era".')),
      m.best.length ? h('div', null, h('h4', null, t(l('Maiores momentos', 'Biggest moments'))), h('ul', { class: 'dos13-list small' }, m.best.map((r) => h('li', null, releaseLink(s, r.id), ` · ${r.year} · ${r.peak < 999 ? `#${r.peak}` : t(l('fora das paradas', 'uncharted'))} · ${N(r.totalUnits)}`, r.certified ? [' ', pill(r.certified, 'gold')] : null)))) : null,
      h('h4', null, t(l('Prêmios', 'Awards'))), awardsList(s, m.awards),
      h('h4', null, t(l('Fracassos', 'Flops'))),
      m.flops.length ? h('div', null, why(l('Fracasso = ficou fora do top 40 e vendeu menos de 20 mil unidades depois de um ano.', 'Flop = stayed outside the top 40 and sold under 20k units after a year.')),
        h('ul', { class: 'dos13-list small' }, m.flops.slice(-8).reverse().map((r) => h('li', { class: 'bad' }, releaseLink(s, r.id), ` · ${r.year} · ${N(r.totalUnits)}`))))
        : empty(l('Nenhum fracasso registrado.', 'No flops on record.')),
    );
  },
}));

ACT_TABS.push((s, a) => (know(s, a) < 2 && a.fame < 30 ? null : {
  id: 'labels13', label: l('Contratos e selos', 'Contracts and labels'), icon: 'contract',
  render: () => {
    const hist = actLabelHistory(s, a);
    const cs = actContracts(s, a);
    const own = (o: string) => (o === 'player' ? h('b', null, s.config.companyName) : s.labels[o] ? labelBtn(s, o) : h('span', null, t(l('independente', 'independent'))));
    return h('div', null,
      h('h4', null, t(l('Selos por onde passou', 'Labels over the years'))),
      hist.length ? h('ul', { class: 'memory timeline' }, hist.map((x) => h('li', null, h('span', { class: 'muted' }, `${x.from}${x.to !== x.from ? `–${x.to}` : ''} · `), own(x.owner), x.n ? ` · ${x.n} ${t(l('lançamento(s)', 'release(s)'))}` : ` · ${t(l('atual', 'current'))}`)))
        : empty(l('Sem lançamentos ainda.', 'No releases yet.')),
      h('h4', null, t(l('Contratos conhecidos', 'Known contracts'))),
      cs.length ? h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ...[l('Com', 'With'), l('Modelo', 'Model'), l('Royalty', 'Royalty'), l('Início', 'Start'), l('Lançamentos', 'Releases'), l('Situação', 'Status')].map((x) => h('th', null, t(x))))),
        h('tbody', null, cs.map((c) => h('tr', null, h('td', null, own(c.party)), h('td', null, t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name ?? l(c.model))),
          h('td', null, know(s, a) >= 3 ? pct(c.royalty) : '?'), h('td', null, String(s.config.startYear + Math.floor(c.startWeek / 52))),
          h('td', null, `${c.releasesDone}/${c.releasesOwed}`), h('td', null, a.contractId === c.id ? pill(t(l('vigente', 'active')), 'good') : pill(t(l('encerrado', 'ended'))))))))
        : empty(l('Nenhum contrato guardado (contratos antigos de rivais somem depois de um ano).', 'No stored contracts (old rival contracts vanish after a year).')),
    );
  },
}));

ACT_TABS.push((s, a) => {
  const rl = actRelics(s, a);
  return rl.length ? {
    id: 'relics13', label: l('Relíquias', 'Relics'), icon: 'vault',
    render: () => h('div', null, why(l('Objetos ligados ao artista ou aos integrantes. O valor sobe com hype, prêmios e morte; leilões e museus aparecem em Lendas.', 'Items tied to the act or its members. Value rises with hype, awards and death; auctions and museums live in Legends.')),
      h('ul', { class: 'dos13-list small' }, rl.map((r) => h('li', null, ic('vault'), ` ${t(r.n)} · ${t(RELIC_KIND[r.k])} · ${r.y} · `, pill(t(RELIC_ST[r.st]), r.st === 'player' ? 'good' : r.st === 'stolen' || r.st === 'lost' ? 'bad' : ''), ` · ${t(l('dono', 'owner'))}: ${relicOwner(r)}`)))),
  } : null;
});

/** Blocos extras da vida pessoal (rodada 14: lazer, encontros e linha do tempo). */
export const LIFE_EXTRAS13: ((s: GameState, p: Person) => HTMLElement | null)[] = [];

function lifeBlock(s: GameState, p: Person, open: boolean): HTMLElement {
  const lf = personLife(s, p);
  const facts = personExtraFacts(s, p);
  const groups = new Map<string, Fact13[]>();
  for (const f of facts) { const g = groups.get(f.group) ?? []; g.push(f); groups.set(f.group, g); }
  const healthName: Record<string, L> = { ok: l('bem', 'fine'), voice_strain: l('voz desgastada', 'voice strain'), burnout: l('esgotamento', 'burnout'), addiction: l('dependência', 'addiction'), recovering: l('em recuperação', 'recovering'), ill: l('doente', 'ill') };
  return h('div', { class: 'dos13-person' },
    h('div', { class: 'row wrap' }, open ? h('button', { class: 'link', onclick: () => openPersonPage(p.id) }, h('b', null, p.name)) : h('b', null, p.name),
      ` · ${p.alive ? `${s.year - p.born} ${t(l('anos', 'yrs'))}` : `${t(l('morreu em', 'died'))} ${p.died ?? '?'}`}`),
    h('ul', { class: 'dos13-list small' },
      h('li', null, ic('heart'), ' ', lf.together ? `${t(l('Em relacionamento com', 'In a relationship with'))} ${lf.partner}` : lf.separated ? t(l('Separado(a)', 'Separated')) : t(l('Solteiro(a)', 'Single')),
        lf.exes.length ? h('small', { class: 'muted' }, ` · ${t(l('ex', 'exes'))}: ${lf.exes.slice(0, 4).join(', ')}`) : null),
      h('li', null, ic('fans'), ' ', lf.kids.length ? `${t(l('Filhos', 'Children'))}: ${lf.kids.map((k) => `${k.name} (${s.year - k.born})`).join(', ')}` : t(l('Sem filhos conhecidos', 'No known children'))),
      h('li', { class: p.health === 'ok' ? '' : 'bad' }, ic('heart'), ` ${t(l('Saúde', 'Health'))}: ${t(healthName[p.health] ?? l(p.health))}`,
        lf.voice !== undefined ? ` · ${t(l('voz', 'voice'))} ${Math.round(lf.voice)}` : '', lf.hearing !== undefined ? ` · ${t(l('audição', 'hearing'))} ${Math.round(lf.hearing)}` : ''),
      lf.dependency !== undefined && lf.dependency > 5 ? h('li', { class: lf.dependency > 60 ? 'bad' : '' }, ic('skull'), ` ${t(l('Vícios / dependência', 'Vices / dependency'))}: ${Math.round(lf.dependency)}/100`) : null,
    ),
    ...LIFE_EXTRAS13.map((f) => f(s, p)),
    ...[...groups].map(([g, xs]) => h('details', null, h('summary', { class: 'small muted' }, `${t(l('Mais dados', 'More data'))} · ${g}`),
      h('ul', { class: 'dos13-list small' }, xs.slice(0, 25).map((f) => h('li', null, h('span', { class: 'muted' }, `${t(f.label)}: `), typeof f.v === 'string' ? f.v : t(f.v)))))));
}

ACT_TABS.push((s, a) => ({
  id: 'life13', label: l('Vida pessoal', 'Personal life'), icon: 'heart',
  render: () => {
    const ok = know(s, a) >= 3 || a.fame >= 40;
    const ms = a.members.map((x) => s.persons[x]).filter((p): p is Person => !!p);
    return ok ? h('div', null, why(l('O que se sabe da vida dos integrantes: relacionamentos, filhos, saúde e vícios. Isso pesa no humor, na disponibilidade e em escândalos.', 'What is known about the members\' lives: relationships, children, health and vices. It weighs on mood, availability and scandals.')), ...ms.map((p) => lifeBlock(s, p, true)))
      : empty(l('Pouco se sabe da vida pessoal — aprofunde o conhecimento (olheiros, reuniões) ou espere a fama trazer a imprensa.', 'Little is known about their private life — dig deeper (scouts, meetings) or wait for fame to bring the press.'));
  },
}));

PERSON_TABS.push((s, p) => ({
  id: 'life13p', label: l('Vida e fatos', 'Life and facts'), icon: 'heart',
  render: () => lifeBlock(s, p, false),
}));

// todos os links de selo (ficha.openLabel / inspect.label) abrem o dossiê
labelOpener.f = (id: string) => openLabelDossier(id);
