// Interface da rodada 7: paradas por país/região/formato (aba em Paradas), prêmios nacionais e a ficha
// de cada país (aba em Mundo) com população, poder de compra, gosto por época e quem lidera agora.

import { COUNTRY_INFO, countryBuy, countryInfoByA3, countryMarketSize, countryPop, countryTaste, type CountryInfo } from '../../data/countries';
import { countryName, countryOfCity } from '../../data/geo';
import { localPref, softPower } from '../../data/relevance';
import { FAMILIES, MARKETS, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { AWARD_CATS, CHART_KINDS, KIND_NAMES, awardName, board, ch7, chartLabel, countryLeader, kindAvailable, kindUnit, type ChartKind } from '../../sim/sys/charts7';
import { physicalShare } from '../../sim/production';
import type { GameState } from '../../sim/types';
import { hasTech } from '../../sim/util';
import { N, actLink, labelLink, pill, releaseLink, rerender, section } from '../common';
import { bar, h, select } from '../dom';
import { registerTab } from '../registry';
import { sparkline } from '../common';

const ui = { key: '', kind: 'songs' as ChartKind, country: '', awardCountry: '' };

const homeCountry = (s: GameState) => countryOfCity(s.config.homeCity) ?? 'USA';

function keyOptions(s: GameState): { value: string; label: string }[] {
  const out = [{ value: 'world', label: `🌍 ${t(l('Mundo (soma dos países)', 'World (all countries)'))}` }];
  for (const m of MARKETS) out.push({ value: `r:${m.id}`, label: `🗺 ${t(m.name)}` });
  for (const c of [...COUNTRY_INFO].sort((a, b) => t(countryName(a.a3)).localeCompare(t(countryName(b.a3))))) out.push({ value: c.a3, label: `${t(countryName(c.a3))} — ${s.config.realNames ? c.chart[1] : c.chart[0]}` });
  return out;
}

function chartTable(s: GameState, key: string, kind: ChartKind): HTMLElement {
  const rows = board(s, key, kind);
  if (!rows.length) return h('p', { class: 'muted small' }, t(l('Sem dados nesta semana ainda (avance uma semana).', 'No data this week yet (advance a week).')));
  const unit = t(kindUnit(s, kind));
  return h('table', { class: 'tbl chart' },
    h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, t(l('Antes', 'Last'))), h('th', null, t(l('Título', 'Title'))), h('th', null, t(l('Ato', 'Act'))), h('th', null, t(l('Selo', 'Label'))), h('th', null, t(l('Sem.', 'Wks'))), h('th', null, unit))),
    h('tbody', null, rows.map((e) => {
      const r = s.releases[e.relId];
      if (!r) return null;
      const mine = r.owner === 'player' || !!s.acts[r.actId]?.playerBand;
      const move = !e.last ? 'NEW' : e.last > e.pos ? '▲' : e.last < e.pos ? '▼' : '=';
      return h('tr', { class: mine ? 'mine' : '' },
        h('td', null, h('b', null, e.pos)),
        h('td', { class: move === '▲' || move === 'NEW' ? 'good' : move === '▼' ? 'bad' : 'muted' }, `${move} ${e.last || ''}`),
        h('td', null, releaseLink(s, r.id)),
        h('td', null, actLink(s, r.actId)),
        h('td', null, labelLink(s, r.owner === 'indie' ? null : r.owner)),
        h('td', null, e.wk),
        h('td', null, N(e.u)),
      );
    })),
  );
}

export function countryChartsTab(s: GameState): HTMLElement {
  if (!ui.key) ui.key = homeCountry(s);
  if (!kindAvailable(s, ui.kind)) ui.kind = 'songs';
  const kinds = CHART_KINDS.filter((k) => kindAvailable(s, k));
  const c = countryInfoByA3[ui.key];
  const no1 = c ? (ch7(s).no1[c.a3] ?? []).slice(-10).reverse() : [];
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Paradas por país, região e formato', 'Charts by country, region and format')),
        h('p', { class: 'muted small' }, t(l('Cada país tem seu gosto, seu tamanho e seus formatos: um sertanejo pode liderar no Brasil sem aparecer nos EUA, e o Japão ainda compra CD quando o resto do mundo só faz streaming.', 'Each country has its own taste, size and formats: a sertanejo hit can top Brazil without showing up in the US, and Japan still buys CDs when the rest of the world only streams.'))),
        h('div', { class: 'row wrap' },
          select(ui.key, keyOptions(s), (v) => { ui.key = v; rerender(); }, { 'aria-label': t(l('País ou região', 'Country or region')) }),
          ...kinds.map((k) => h('button', { class: `btn small ${ui.kind === k ? 'primary' : 'ghost'}`, onclick: () => { ui.kind = k; rerender(); } }, t(KIND_NAMES[k]))),
        ),
        h('h4', null, ui.key === 'world' ? `${t(l('Mundo', 'World'))} — ${t(KIND_NAMES[ui.kind])}` : ui.key.startsWith('r:') ? `${t(MARKETS.find((m) => `r:${m.id}` === ui.key)?.name)} — ${t(KIND_NAMES[ui.kind])}` : chartLabel(s, ui.key, ui.kind)),
        chartTable(s, ui.key, ui.kind),
      ),
    ),
    h('aside', { class: 'col-side' },
      c ? countryCard(s, c, true) : null,
      no1.length ? section(t(l('Últimos #1 aqui', 'Recent #1s here')), h('ul', { class: 'small' }, no1.map((n) => h('li', null, `${n.title} — ${n.act}`)))) : null,
    ),
  );
}

export function nationalAwardsTab(s: GameState): HTMLElement {
  const st = ch7(s);
  if (!ui.awardCountry) ui.awardCountry = homeCountry(s);
  const list = st.awards.filter((a) => ui.awardCountry === 'all' ? a.byPlayer : a.a3 === ui.awardCountry).slice(-60).reverse();
  const c = countryInfoByA3[ui.awardCountry];
  return section(t(l('Prêmios nacionais', 'National awards')),
    h('p', { class: 'muted small' }, t(l('No fim de cada ano, cada país premia artista, música, álbum e revelação do ano pelo consumo local. Os prêmios só existem a partir do ano em que foram criados.', 'At the end of each year, every country awards artist, song, album and newcomer of the year based on local consumption. Awards only exist from the year they were created.'))),
    h('div', { class: 'row wrap' },
      select(ui.awardCountry, [{ value: 'all', label: t(l('Só os meus prêmios (todos os países)', 'Only my awards (all countries)')) }, ...COUNTRY_INFO.filter((x) => x.award).map((x) => ({ value: x.a3, label: `${t(countryName(x.a3))} — ${awardName(s, x)} (${x.award![2]})` }))], (v) => { ui.awardCountry = v; rerender(); }),
    ),
    c?.award && c.award[2] > s.year ? h('p', { class: 'muted small' }, t(l('{a} só será criado em {y}.', '{a} will only be created in {y}.'), { a: awardName(s, c), y: c.award[2] })) : null,
    list.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), h('th', null, t(l('País', 'Country'))), h('th', null, t(l('Categoria', 'Category'))), h('th', null, t(l('Vencedor', 'Winner'))))),
      h('tbody', null, list.map((a) => h('tr', { class: a.byPlayer ? 'mine' : '' }, h('td', null, a.year), h('td', null, t(countryName(a.a3))), h('td', null, t(AWARD_CATS[a.cat])), h('td', null, a.actId ? actLink(s, a.actId, a.relId ? ` — ${s.releases[a.relId]?.title ?? a.winner.split(' — ')[1] ?? ''}` : '') : a.winner))))) : h('p', { class: 'muted small' }, t(l('Nenhum prêmio ainda.', 'No awards yet.'))),
  );
}

// ---------------------------------------------------------------- ficha de país (item 16)

function topFamilies(c: CountryInfo, year: number, n = 4): { id: string; v: number }[] {
  return FAMILIES.map((f) => ({ id: f.id, v: countryTaste(c, f.id, year) })).sort((a, b) => b.v - a.v).slice(0, n);
}

const famName = (id: string) => t(FAMILIES.find((f) => f.id === id)?.name);
const fmtPop = (m: number) => (m >= 100 ? `${Math.round(m)} mi` : `${m.toFixed(1)} mi`);

export function countryCard(s: GameState, c: CountryInfo, compact = false): HTMLElement {
  const y = s.year;
  const phys = Math.min(0.97, physicalShare(s) * (c.physical ?? 1));
  const stream = hasTech(s, 'streaming') ? (1 - phys) * 0.9 : 0;
  const note = (c.notes ?? []).filter((n) => n[0] <= y).pop();
  const lead = countryLeader(s, c.a3);
  const leadRel = lead ? s.releases[lead.relId] : undefined;
  const locals = Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging') && countryOfCity(a.city) === c.a3).length;
  const popSeries = [1920, 1940, 1960, 1980, 2000, 2020, 2040].filter((x) => x <= Math.max(1930, y)).map((x) => countryPop(c, x));
  return section(t(countryName(c.a3)),
    h('div', { class: 'kv-grid small' },
      h('div', null, t(l('População', 'Population')), ': ', h('b', null, fmtPop(countryPop(c, y))), ' ', sparkline(popSeries, 70, 18)),
      h('div', null, t(l('Poder de compra (EUA = 100)', 'Buying power (US = 100)')), ': ', h('b', null, Math.round(countryBuy(c, y) * 100))),
      h('div', null, t(l('Tamanho do mercado', 'Market size')), ': ', bar(countryMarketSize(c, y), 120)),
      h('div', null, t(l('Região do jogo', 'Game region')), ': ', t(MARKETS.find((m) => m.id === c.market)?.name)),
      h('div', null, t(l('Formatos', 'Formats')), ': ', `${Math.round(phys * 100)}% ${t(l('físico', 'physical'))}`, stream ? ` · ${Math.round(stream * 100)}% streaming` : ''),
      h('div', null, t(l('Artistas ativos daqui', 'Active local artists')), ': ', h('b', null, locals)),
      h('div', { title: t(l('Quanto a música deste país viaja para fora (EUA = 100).', 'How far this country\'s music travels abroad (US = 100).')) }, t(l('Peso mundial', 'Global weight')), ': ', bar(softPower(c.a3, y) * 100, 100), ` ${Math.round(softPower(c.a3, y) * 100)}`),
      h('div', { title: t(l('Quanto o público daqui prefere artistas da casa.', 'How much the audience here prefers home acts.')) }, t(l('Preferência por artistas locais', 'Preference for local acts')), ': ', h('b', null, localPref(c.a3) >= 2.3 ? t(l('muito alta', 'very high')) : localPref(c.a3) >= 1.8 ? t(l('alta', 'high')) : localPref(c.a3) >= 1.45 ? t(l('média', 'medium')) : t(l('baixa', 'low')))),
    ),
    h('div', { class: 'small' }, h('b', null, t(l('Gêneros favoritos agora', 'Favourite genres now'))), ' ', ...topFamilies(c, y).map((f) => pill(`${famName(f.id)} ${Math.round(f.v * 50)}`))),
    !compact ? h('div', { class: 'small' }, h('b', null, t(l('Há 20 anos', '20 years ago'))), ' ', ...topFamilies(c, y - 20, 3).map((f) => pill(famName(f.id)))) : null,
    note ? h('p', { class: 'small' }, `${note[0]}: `, t(l(note[1], note[2]))) : null,
    leadRel ? h('p', { class: 'small' }, t(l('Lidera agora: ', 'Topping now: ')), releaseLink(s, leadRel.id), ' — ', actLink(s, leadRel.actId)) : null,
    c.award ? h('small', { class: 'muted' }, `${t(l('Parada', 'Chart'))}: ${s.config.realNames ? c.chart[1] : c.chart[0]} · ${t(l('Prêmio', 'Award'))}: ${awardName(s, c)} (${c.award[2]})`) : null,
  );
}

export function countriesTab(s: GameState): HTMLElement {
  if (!ui.country) ui.country = homeCountry(s);
  const y = s.year;
  const rows = [...COUNTRY_INFO].sort((a, b) => countryMarketSize(b, y) - countryMarketSize(a, y));
  const sel = countryInfoByA3[ui.country] ?? rows[0];
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Países e mercados em {y}', 'Countries and markets in {y}'), { y }),
        h('p', { class: 'muted small' }, t(l('População, poder de compra e gosto mudam com o tempo. Ordenado pelo tamanho do mercado musical. Clique num país para ver a ficha.', 'Population, buying power and taste change over time. Sorted by music market size. Click a country for its profile.'))),
        h('table', { class: 'tbl compact' },
          h('thead', null, h('tr', null, h('th', null, t(l('País', 'Country'))), h('th', null, t(l('População', 'Population'))), h('th', null, t(l('Mercado', 'Market'))), h('th', null, t(l('Gostos', 'Tastes'))), h('th', null, t(l('Líder', 'Leader'))))),
          h('tbody', null, rows.map((c) => {
            const lead = countryLeader(s, c.a3);
            const rel = lead ? s.releases[lead.relId] : undefined;
            return h('tr', { class: c.a3 === sel.a3 ? 'mine' : '' },
              h('td', null, h('button', { class: 'link', onclick: () => { ui.country = c.a3; rerender(); } }, t(countryName(c.a3)))),
              h('td', null, fmtPop(countryPop(c, y))),
              h('td', null, bar(countryMarketSize(c, y), 120)),
              h('td', { class: 'small' }, topFamilies(c, y, 2).map((f) => famName(f.id)).join(', ')),
              h('td', { class: 'small' }, rel ? `${rel.title} — ${s.acts[rel.actId]?.name ?? ''}` : '—'),
            );
          })),
        ),
      ),
    ),
    h('aside', { class: 'col-side' }, countryCard(s, sel)),
  );
}

registerTab('chartsHub', { id: 'countries', label: l('Por país e formato', 'By country and format'), icon: 'globe', order: 55, render: countryChartsTab });
registerTab('worldHub', { id: 'countries', label: l('Países', 'Countries'), icon: 'flag', order: 55, render: countriesTab });
