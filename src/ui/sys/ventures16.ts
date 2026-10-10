// Rodada 16 — cada negócio com a sua página: Festivais (seus festivais, circuito, rivais, mapa), Editora,
// Veículos de mídia e Plataforma. "Empreendimentos" vira só a carteira: todos os negócios, números do mês,
// melhor/pior e fundar um novo (que leva à página do tipo). Rótulo no menu = título da página = migalha.

import { FESTIVALS } from '../../data/catalog';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { careers } from '../../sim/sys/careers12';
import { festActive, festMonth } from '../../sim/sys/fests8';
import { VKINDS, isConglomerate, kindsAvailable, valuation, ventures, type VKind, type Venture } from '../../sim/sys/ventures9';
import { ownerOf } from '../../sim/sys/people/owner';
import { $, cityName, monthName, pill, rerender, section } from '../common';
import { h, select } from '../dom';
import { registerArea } from '../registry';
import { store } from '../store';
import { chips, setTab, stat, tabs } from '../vis';
import { festivalsTab } from './hubs8';
import { foundForm, kindTab, ventureHead } from './ventures9';
import { PAGE16 } from '../pages16';

export const FEST_FROM = Math.min(1950, ...FESTIVALS.map((f) => f.start));

const owns = (s: GameState, k: VKind) => ventures(s).list.some((v) => v.kind === k);
const y12 = (v: Venture) => v.pl.reduce((a, e) => a + e.rev - e.cost, 0);
const m1 = (v: Venture) => { const e = v.pl.at(-1); return e ? e.rev - e.cost : 0; };
export function openPage16(k: VKind): void {
  const p = PAGE16[k];
  if (p.tab) setTab(p.tab[0], p.tab[1]);
  store.area = p.area;
  rerender();
}
const link = (k: VKind, label: string) => h('button', { class: 'link', onclick: () => openPage16(k) }, label);

/** Faixa de números de um tipo: quantos, mês, 12 meses, valor e concorrência. */
function kpis(s: GameState, kind: VKind | null): HTMLElement {
  const list = ventures(s).list.filter((v) => !kind || v.kind === kind);
  const npc = ventures(s).npc.filter((n) => !kind || n.kind === kind).length;
  const m = list.reduce((a, v) => a + m1(v), 0), y = list.reduce((a, v) => a + y12(v), 0);
  return chips(stat('bank', list.length, l('Negócios', 'Businesses')),
    stat('money', $(m), l('Resultado do mês', 'Month result'), m < 0 ? 'bad' : 'good'),
    stat('chart-up', $(y), l('Últimos 12 meses', 'Last 12 months'), y < 0 ? 'bad' : 'good'),
    stat('star', $(list.reduce((a, v) => a + valuation(s, v), 0)), l('Valor de mercado', 'Market value')),
    stat('building', npc, l('Concorrentes de rivais', 'Rival competitors')));
}

function kindPage(s: GameState, kind: VKind, intro: L): HTMLElement {
  const from = VKINDS[kind].from;
  return h('div', { class: `hub page16 page16-${kind}` },
    h('p', { class: 'muted small' }, t(intro)), kpis(s, kind),
    s.year < from && !owns(s, kind) ? h('p', { class: 'muted' }, t(l('Esse negócio só surge a partir de {y}.', 'This business only appears from {y}.'), { y: from })) : kindTab(s, kind));
}

// ================================================================== Festivais

function rivalsTab(s: GameState): HTMLElement {
  const npc = ventures(s).npc.filter((n) => n.kind === 'festival').sort((a, b) => b.rep - a.rep);
  const mine = ventures(s).list.filter((v) => v.kind === 'festival');
  return h('div', null,
    section(t(l('Festivais de gravadoras rivais', 'Rival labels\' festivals')),
      h('p', { class: 'small muted' }, t(l('Cada festival rival na mesma cidade do seu tira cerca de 12% do público de cada edição (dois tiram ~23%). Mudar de cidade ou de mês é a defesa.', 'Each rival festival in the same city as yours takes about 12% of each edition\'s crowd (two take ~23%). Moving city or month is the defence.'))),
      npc.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, ...[l('Festival', 'Festival'), l('Dono', 'Owner'), l('Cidade', 'City'), l('Reputação', 'Reputation'), l('Desde', 'Since'), l('Contra você', 'Against you')].map((x) => h('th', null, t(x))))),
        h('tbody', null, npc.map((n) => { const hit = mine.filter((v) => v.city === n.city);
          return h('tr', { class: hit.length ? 'mine' : '' }, h('td', null, n.name), h('td', null, s.labels[n.labelId]?.name ?? '—'), h('td', null, cityName(n.city)), h('td', null, String(n.rep)), h('td', null, String(n.y)),
            h('td', null, hit.length ? pill(t(l('mesma cidade: −12% de público', 'same city: −12% crowd')), 'bad') : '—')); }))) : h('p', { class: 'muted' }, t(l('Nenhuma gravadora rival tem festival próprio ainda. Gravadoras ricas abrem negócios de vez em quando.', 'No rival label runs its own festival yet. Rich labels open businesses now and then.')))));
}

function mapTab(s: GameState): HTMLElement {
  type Row = { name: string; m: number; tag: string; cls: string };
  const by = new Map<string, Row[]>();
  const add = (city: string, r: Row) => { const xs = by.get(city) ?? []; xs.push(r); by.set(city, xs); };
  FESTIVALS.forEach((f, fi) => { if (festActive(f, s.year)) add(f.city, { name: f.name, m: festMonth(f, fi), tag: t(l('circuito', 'circuit')), cls: '' }); });
  for (const n of ventures(s).npc) if (n.kind === 'festival') add(n.city, { name: n.name, m: -1, tag: t(l('rival', 'rival')), cls: 'bad' });
  for (const v of ventures(s).list) if (v.kind === 'festival') add(v.city, { name: v.name, m: v.month ?? -1, tag: t(l('seu', 'yours')), cls: 'good' });
  const cities = [...by.entries()].sort((a, b) => b[1].length - a[1].length || cityName(a[0]).localeCompare(cityName(b[0])));
  return section(t(l('Mapa dos festivais de {y}', 'Festival map of {y}'), { y: s.year }),
    h('p', { class: 'small muted' }, t(l('Cidades com mais festivais disputam público e artistas; cidades vazias são espaço livre para o seu.', 'Cities with more festivals fight over crowds and acts; empty cities are open ground for yours.'))),
    cities.length ? h('div', { class: 'cards' }, cities.map(([c, rows]) => h('div', { class: 'card' }, h('h4', null, cityName(c), ' ', pill(String(rows.length))),
      h('ul', { class: 'small' }, rows.sort((a, b) => a.m - b.m).map((r) => h('li', null, r.m >= 0 ? `${monthName(r.m)} · ` : '', r.name, ' ', pill(r.tag, r.cls))))))) : h('p', { class: 'muted' }, t(l('Ainda não há festivais neste ano.', 'No festivals this year yet.'))));
}

function festivalsArea(s: GameState): HTMLElement {
  // r17: esta é a página do MUNDO (circuito, participar, mapa); o seu festival e os rivais moram na página da carreira
  const mine = careers(s).active.includes('festival') || owns(s, 'festival');
  const go = (area: string) => { store.area = area; rerender(); };
  return h('div', { class: 'hub festivals16' },
    h('p', { class: 'small' }, mine ? h('button', { class: 'link', onclick: () => go('cp17-festival') }, `↗ ${t(l('Seu festival e festivais rivais (página da carreira)', 'Your festival and rival festivals (career page)'))}`)
      : s.year >= VKINDS.festival.from ? h('button', { class: 'link', onclick: () => go('ventures') }, `↗ ${t(l('Fundar um festival próprio (Empreendimentos)', 'Found your own festival (Ventures)'))}`) : null),
    tabs('festivals16', [
      { id: 'circuit', label: t(l('Circuito e inscrições', 'Circuit and entries')), icon: 'star', render: () => festivalsTab(s) },
      { id: 'map', label: t(l('Mapa', 'Map')), icon: 'globe', render: () => mapTab(s) },
    ], rerender));
}

/** r17: abas do dono de festival (página da carreira). */
export const fest17 = {
  mine: (s: GameState) => kindPage(s, 'festival', l('Seu festival: data, cidade, line-up por palco, ingressos, finanças e a história das edições (com os porquês de cada resultado).', 'Your festival: date, city, line-up per stage, tickets, finances and the history of editions (with the reasons behind each result).')),
  rivals: rivalsTab,
};

registerArea({ id: 'festivals', label: l('Festivais', 'Festivals'), icon: 'star', key: 'j', render: festivalsArea, visible: (s) => s.year >= FEST_FROM || owns(s, 'festival') });

// ================================================================== Editora, Veículos de mídia, Plataforma

registerArea({ id: 'publishing16', label: l('Editora', 'Publishing'), icon: 'note', key: ';', render: (s) => kindPage(s, 'publisher', l('Editora musical: contrate compositores, coloque canções com artistas de qualquer selo, licencie para trilhas e viva de royalties por décadas.', 'Music publishing: sign songwriters, place songs with any label\'s acts, license to sync and live off royalties for decades.')) });
registerArea({ id: 'outlets16', label: l('Veículos de mídia', 'Media outlets'), icon: 'radio', key: ',', render: (s) => h('div', null, kindPage(s, 'media', l('Seus veículos (revista, rádio, TV, blog, playlist): grade, anunciantes, equipe, poder de execução e o risco do jabá. A área Mídia é a sua relação com a imprensa; aqui você é a imprensa.', 'Your outlets (magazine, radio, TV, blog, playlist): schedule, advertisers, staff, airplay power and payola risk. The Media area is your relationship with the press; here you are the press.')),
  isConglomerate(s) || !owns(s, 'media') ? null : h('p', { class: 'small muted' }, t(l('Três veículos diferentes formam um conglomerado: publicidade +25% e cobertura extra para o selo.', 'Three different outlets make a conglomerate: +25% ad revenue and extra coverage for the label.')))) });
registerArea({ id: 'platform16', label: l('Plataforma', 'Platform'), icon: 'globe', key: '.', visible: (s) => s.year >= VKINDS.platform.from || owns(s, 'platform'), render: (s) => kindPage(s, 'platform', l('Plataforma de streaming: assinantes, curadoria, catálogos licenciados e a briga com as gravadoras pelo repasse.', 'Streaming platform: subscribers, curation, licensed catalogs and the fight with labels over payouts.')) });

// ================================================================== Empreendimentos (carteira)

let found16: VKind | '' = '';
function venturesArea(s: GameState): HTMLElement {
  const st = ventures(s);
  const list = st.list.slice().sort((a, b) => y12(b) - y12(a));
  const avail = kindsAvailable(s);
  const kind = found16 && avail.includes(found16) ? found16 : avail[0];
  const best = list[0], worst = list.at(-1);
  return h('div', { class: 'hub ventures16' },
    h('p', { class: 'muted small' }, t(l('A carteira de todos os seus negócios (do selo ou pessoais). Cada um é administrado na própria página: clique no nome. Para assumir ou largar uma profissão, use Carreiras.', 'The portfolio of all your businesses (label-owned or personal). Each one is run on its own page: click its name. To take up or drop a profession, use Careers.'))),
    kpis(s, null),
    section(t(l('Carteira', 'Portfolio')),
      h('p', { class: 'small' }, t(l('Caixa do selo', 'Label cash')), `: ${$(s.player.cash)} · `, t(l('Patrimônio pessoal', 'Personal wealth')), `: ${$(ownerOf(s).wealth)}`),
      list.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, ...[l('Negócio', 'Business'), l('Tipo', 'Kind'), l('Dono', 'Owner'), l('Nível', 'Level'), l('Reputação', 'Rep.'), l('Mês', 'Month'), l('12 meses', '12 months'), l('Valor', 'Value')].map((x) => h('th', null, t(x))))),
        h('tbody', null, list.map((v) => h('tr', null, h('td', null, link(v.kind, v.name)), h('td', null, t(VKINDS[v.kind].name)), h('td', null, t(v.owner === 'label' ? l('selo', 'label') : l('pessoal', 'personal'))),
          h('td', null, String(v.level)), h('td', null, String(Math.round(v.rep))), h('td', { class: m1(v) < 0 ? 'bad' : '' }, $(m1(v))), h('td', { class: y12(v) < 0 ? 'bad' : 'good' }, $(y12(v))), h('td', null, $(valuation(s, v))))))) : h('p', { class: 'muted' }, t(l('Nenhum negócio ainda. Funde o primeiro abaixo; ele ganha página própria no menu.', 'No businesses yet. Found the first one below; it gets its own page in the menu.'))),
      list.length > 1 && best && worst && y12(worst) < 0 ? h('p', { class: 'small' }, t(l('Melhor: {a} ({x} em 12 meses). Pior: {b} ({y}) — expanda a equipe, mude a estratégia na página dele ou venda.', 'Best: {a} ({x} over 12 months). Worst: {b} ({y}) — add staff, change strategy on its page or sell.'), { a: best.name, x: $(y12(best)), b: worst.name, y: $(y12(worst)) })) : null),
    list.length ? h('details', { class: 'card' }, h('summary', null, t(l('Expandir, equipe, transferir ou vender', 'Expand, staff, transfer or sell'))), ...list.map((v) => h('div', { class: 'card' }, ventureHead(s, v)))) : null,
    kind ? h('div', null,
      h('div', { class: 'row wrap' }, h('b', null, t(l('Fundar negócio', 'Found a business'))), ' ', select<VKind>(kind, avail.map((k) => ({ value: k, label: t(VKINDS[k].name) })), (k) => { found16 = k; rerender(); }), ' ', link(kind, `→ ${t(l('abrir a página', 'open its page'))}`)),
      foundForm(s, kind)) : null,
    st.npc.length ? section(t(l('Concorrência', 'Competition')), h('p', { class: 'small' }, avail.map((k) => { const n = st.npc.filter((x) => x.kind === k).length; return n ? `${t(VKINDS[k].name)}: ${n}` : ''; }).filter(Boolean).join(' · '))) : null,
    st.log.length ? section(t(l('Acontecimentos', 'Happenings')), h('ul', { class: 'small' }, st.log.slice(-8).reverse().map((x) => h('li', null, t(x.t))))) : null);
}

registerArea({ id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', key: 'n', render: venturesArea });
