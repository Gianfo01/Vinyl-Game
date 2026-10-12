// Rodada 22 — navegador de cenários: abas (Todos, Tipo, Época, Região, Dificuldade) com sub-abas por valor e um
// cartão mais completo por cenário (duração, ponto de partida, dificuldade, meta e medalhas, regras especiais, marcos
// históricos, dica e melhor medalha). Usado na tela "Cenários históricos" e no Novo Jogo (Modo → Ponto de partida).

import { cityById, marketById, l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { SCENARIOS, type Medal, type ScenarioDef } from '../sim/sys/live';
import { scenario17 } from '../sim/sys/scenarios17';
import { cityName } from './common';
import { h } from './dom';
import './scen22.css';

type Kind22 = 'scene' | 'rescue' | 'top' | 'tech';
const KIND22: Record<Kind22, { name: L; desc: L }> = {
  scene: { name: l('Nasce uma cena', 'A scene is born'), desc: l('Estar no lugar certo antes de um gênero explodir.', 'Be in the right place before a genre explodes.') },
  rescue: { name: l('Crise e resgate', 'Crisis and rescue'), desc: l('Salvar ou herdar uma empresa com problemas.', 'Save or inherit a company in trouble.') },
  top: { name: l('Rumo ao topo', 'Road to the top'), desc: l('Fábricas de hits, invasões e conquista do mundo.', 'Hit factories, invasions and conquering the world.') },
  tech: { name: l('Virada tecnológica', 'Tech shift'), desc: l('Uma tecnologia muda as regras no meio do jogo.', 'A technology changes the rules mid-game.') },
};
const DIFF22: L[] = [l('', ''), l('Tranquilo', 'Relaxed'), l('Equilibrado', 'Balanced'), l('Difícil', 'Hard'), l('Brutal', 'Brutal')];
const DIFF22_DESC: L[] = [l('', ''), l('Caixa folgado ou meta generosa: bom para o primeiro cenário.', 'Comfortable cash or a generous goal: good first scenario.'), l('Meta justa com o tempo dado.', 'A fair goal for the time given.'), l('Pouco caixa, pouco tempo ou o mundo contra.', 'Little cash, little time or the world against you.'), l('Começa no buraco. Para veteranos.', 'You start in the hole. For veterans.')];

/** Metadados de leitura (não mudam regras): tipo, dificuldade estimada e uma dica. */
const META22: Record<string, { k: Kind22; d: 1 | 2 | 3 | 4; tip: L }> = {
  columbia_1889: { k: 'tech', d: 3, tip: l('O fonógrafo ainda é máquina de escritório: o dinheiro está nos salões a moeda. Grave bandas e números curtos.', 'The phonograph is still an office machine: the money is in coin-op parlors. Record bands and short numbers.') },
  casa_edison_1902: { k: 'scene', d: 2, tip: l('Choro, lundu e modinha vendem na loja; o disco duplo de 1904 muda tudo. Tenha catálogo pronto.', 'Choro, lundu and modinha sell in the shop; the double-sided disc of 1904 changes everything. Have a catalog ready.') },
  tinpan_1910: { k: 'top', d: 2, tip: l('A canção é o produto: editora e disco andam juntos. Hits de vaudeville viram ouro.', 'The song is the product: publishing and records go together. Vaudeville hits turn to gold.') },
  jazz_1920: { k: 'scene', d: 2, tip: l('Grave muito e barato: na goma-laca, volume vence perfeição. As rádios chegam no meio da década.', 'Record a lot and cheap: in shellac, volume beats polish. Radio arrives mid-decade.') },
  sun_1954: { k: 'scene', d: 3, tip: l('Guarde caixa para 1956: quando o rockabilly explodir, quem já tiver o artista certo leva tudo.', 'Save cash for 1956: when rockabilly explodes, whoever already has the right act takes it all.') },
  bossa_1958: { k: 'scene', d: 2, tip: l('Violão e voz custam pouco. Aposte na crítica e nos festivais de televisão.', 'Guitar and voice are cheap. Bet on critics and TV festivals.') },
  mersey_1962: { k: 'scene', d: 2, tip: l('Contrate cedo e faça muitos shows: o empresário que lota o porão em 1962 enche estádios em 1965.', 'Sign early and play a lot: the manager who packs the cellar in 1962 fills stadiums in 1965.') },
  tropicalia: { k: 'scene', d: 3, tip: l('Só dois anos: lance rápido e fuja de polêmica perto de dezembro de 1968.', 'Only two years: release fast and dodge controversy near December 1968.') },
  punk_1976: { k: 'scene', d: 2, tip: l('Estúdio barato e escândalo controlado vendem; exagere e as lojas boicotam.', 'Cheap studio and controlled scandal sell; overdo it and shops boycott.') },
  bronx_1979: { k: 'scene', d: 2, tip: l('As festas de bairro formam o público; o rádio só chega com um single forte.', 'Block parties build the audience; radio only comes with a strong single.') },
  grunge_1989: { k: 'scene', d: 2, tip: l('Mantenha os custos baixos até 1991. Depois, uma major vai bater na porta: venda caro ou cresça.', 'Keep costs low until 1991. Then a major will knock: sell dear or grow.') },
  soul_1972: { k: 'rescue', d: 2, tip: l('Corte o que dá prejuízo primeiro; um sucesso no rádio paga dois anos de dívida.', 'Cut the money-losers first; one radio hit pays two years of debt.') },
  rescue_1986: { k: 'rescue', d: 4, tip: l('Negocie a dívida antes de contratar. Catálogo antigo bem relançado é o caixa mais rápido.', 'Negotiate the debt before signing. Well reissued back catalog is the fastest cash.') },
  heir_1995: { k: 'rescue', d: 1, tip: l('A empresa já anda sozinha: o desafio é a família. Cuide da sucessão e do estresse.', 'The company already runs itself: the challenge is the family. Mind succession and stress.') },
  motown_1960: { k: 'top', d: 2, tip: l('Linha de montagem: compositores fixos, controle de qualidade e muitos singles curtos.', 'Assembly line: staff writers, quality control and many short singles.') },
  british_1963: { k: 'top', d: 2, tip: l('O mercado americano é o prêmio. Abra os EUA cedo e use a TV.', 'The US market is the prize. Open the US early and use TV.') },
  disco_1977: { k: 'top', d: 1, tip: l('Pistas pagam rápido, mas a onda quebra em 1979: diversifique antes.', 'Dance floors pay fast, but the wave breaks in 1979: diversify before.') },
  festival_king: { k: 'top', d: 1, tip: l('Atos de palco valem mais que discos aqui. Cuide da fadiga do elenco.', 'Stage acts are worth more than records here. Watch roster fatigue.') },
  trainees: { k: 'top', d: 3, tip: l('Anos de treino antes da estreia custam caro: planeje o caixa até 2015.', 'Years of training before debut cost a lot: plan cash until 2015.') },
  latin_2016: { k: 'top', d: 2, tip: l('Parcerias bilíngues abrem o mundo; o streaming paga volume, não picos.', 'Bilingual collabs open the world; streaming pays volume, not peaks.') },
  napster: { k: 'tech', d: 3, tip: l('As vendas físicas vão cair. Shows, licenciamento e o digital legal seguram o caixa.', 'Physical sales will fall. Shows, licensing and legal digital hold the cash.') },
  mtv_1981: { k: 'tech', d: 2, tip: l('Visual vende: invista em clipes cedo, antes que todos façam.', 'Looks sell: invest in videos early, before everyone does.') },
  stream_2015: { k: 'tech', d: 2, tip: l('Playlists valem mais que álbuns. Lance singles com frequência.', 'Playlists are worth more than albums. Release singles often.') },
  human_2040: { k: 'tech', d: 3, tip: l('Vozes sintéticas são baratas e tentadoras; a meta pede o contrário. Proteja o catálogo humano.', 'Synthetic voices are cheap and tempting; the goal asks the opposite. Protect the human catalog.') },
};
const meta22 = (d: ScenarioDef) => META22[d.id] ?? { k: 'top' as Kind22, d: 2 as const, tip: l('', '') };

const ERAS22: { id: string; name: L; from: number; to: number }[] = [
  { id: 'pre50', name: l('Antes de 1950', 'Before 1950'), from: 0, to: 1949 },
  { id: '50s60s', name: l('1950–1969', '1950–1969'), from: 1950, to: 1969 },
  { id: '70s80s', name: l('1970–1989', '1970–1989'), from: 1970, to: 1989 },
  { id: '90s00s', name: l('1990–2009', '1990–2009'), from: 1990, to: 2009 },
  { id: 'now', name: l('2010 em diante', '2010 onward'), from: 2010, to: 9999 },
];
const START22: Record<string, L> = { from_zero: l('Do zero', 'From zero'), emerging: l('Selo emergente', 'Emerging label'), established: l('Empresa estabelecida', 'Established company') };
const MEDAL22: Record<Medal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '' };

type Dim22 = 'all' | 'kind' | 'era' | 'region' | 'diff';
const ui22 = { dim: 'all' as Dim22, sub: '' as string, open: '' as string };

const regionOf = (d: ScenarioDef) => cityById[d.homeCity]?.market ?? 'na';
const groupsOf = (dim: Dim22): { id: string; name: L; test: (d: ScenarioDef) => boolean }[] => {
  if (dim === 'kind') return (Object.keys(KIND22) as Kind22[]).map((k) => ({ id: k, name: KIND22[k].name, test: (d) => meta22(d).k === k }));
  if (dim === 'era') return ERAS22.map((e) => ({ id: e.id, name: e.name, test: (d) => d.startYear >= e.from && d.startYear <= e.to }));
  if (dim === 'region') return [...new Set(SCENARIOS.map(regionOf))].map((m) => ({ id: m, name: marketById[m]?.name ?? l(m, m), test: (d) => regionOf(d) === m }));
  if (dim === 'diff') return [1, 2, 3, 4].map((n) => ({ id: String(n), name: DIFF22[n], test: (d) => meta22(d).d === n }));
  return [{ id: '', name: l('Todos', 'All'), test: () => true }];
};

export interface ScenBrowser22 { pickLabel: L; onPick: (id: string) => void; current?: string; medals?: Record<string, Medal>; redraw: () => void }

/** Navegador com abas e sub-abas. `onPick` recebe o id do cenário escolhido. */
export function scenarioBrowser22(o: ScenBrowser22): HTMLElement {
  const DIMS: [Dim22, L][] = [['all', l('Todos', 'All')], ['kind', l('Por tipo', 'By type')], ['era', l('Por época', 'By era')], ['region', l('Por região', 'By region')], ['diff', l('Por dificuldade', 'By difficulty')]];
  const groups = groupsOf(ui22.dim).filter((g) => SCENARIOS.some(g.test));
  if (!groups.some((g) => g.id === ui22.sub)) ui22.sub = groups[0]?.id ?? '';
  const g = groups.find((x) => x.id === ui22.sub) ?? groups[0];
  const list = SCENARIOS.filter(g.test).sort((a, b) => a.startYear - b.startYear);
  const set = (dim: Dim22, sub = '') => { ui22.dim = dim; ui22.sub = sub; o.redraw(); };
  return h('div', { class: 'sc22' },
    h('div', { class: 'sc22-tabs', role: 'tablist', 'aria-label': t(l('Agrupar cenários', 'Group scenarios')) }, ...DIMS.map(([id, name]) => h('button', { type: 'button', role: 'tab', class: `sc22-tab ${ui22.dim === id ? 'on' : ''}`, 'aria-selected': String(ui22.dim === id), onclick: () => set(id) }, t(name)))),
    ui22.dim === 'all' ? null : h('div', { class: 'sc22-subs', role: 'tablist', 'aria-label': t(l('Sub-grupos', 'Sub-groups')) }, ...groups.map((x) => h('button', { type: 'button', role: 'tab', class: `chip-btn ${ui22.sub === x.id ? 'on' : ''}`, 'aria-selected': String(ui22.sub === x.id), onclick: () => set(ui22.dim, x.id) }, `${t(x.name)} · ${SCENARIOS.filter(x.test).length}`))),
    ui22.dim === 'kind' && KIND22[ui22.sub as Kind22] ? h('p', { class: 'muted small' }, t(KIND22[ui22.sub as Kind22].desc)) : ui22.dim === 'diff' && DIFF22_DESC[Number(ui22.sub)] ? h('p', { class: 'muted small' }, t(DIFF22_DESC[Number(ui22.sub)])) : null,
    h('div', { class: 'sc22-grid' }, ...list.map((d) => scenCard22(d, o))));
}

function scenCard22(d: ScenarioDef, o: ScenBrowser22): HTMLElement {
  const m = meta22(d);
  const x = scenario17(d.id);
  const open = ui22.open === d.id;
  const on = o.current === d.id;
  const medal = o.medals?.[d.id] ?? 'none';
  const years = d.endYear - d.startYear + 1;
  const country = cityById[d.homeCity]?.a3;
  return h('article', { class: `card sc22-card ${on ? 'on' : ''}` },
    h('div', { class: 'sc22-head' },
      h('div', { class: 'sc22-year' }, h('b', null, String(d.startYear)), h('small', null, `→ ${d.endYear}`)),
      h('div', null, h('h3', null, t(d.name), MEDAL22[medal] ? h('span', { class: 'sc22-medal', title: t(l('Sua melhor medalha', 'Your best medal')) }, ` ${MEDAL22[medal]}`) : null),
        h('p', { class: 'sc22-tags' },
          h('span', { class: 'sc22-tag' }, `📍 ${cityName(d.homeCity)}${country ? ` · ${country}` : ''}`),
          h('span', { class: 'sc22-tag' }, `⏱ ${t(l('{n} anos', '{n} years'), { n: years })}`),
          h('span', { class: `sc22-tag sc22-d${m.d}` }, `${'●'.repeat(m.d)}${'○'.repeat(4 - m.d)} ${t(DIFF22[m.d])}`),
          h('span', { class: 'sc22-tag' }, t(KIND22[m.k].name))))),
    h('p', { class: 'small' }, t(d.desc)),
    h('p', { class: 'small sc22-goal' }, h('b', null, t(l('Meta: ', 'Goal: '))), t(d.goal), h('span', { class: 'muted' }, ` · 🥉 ${d.tiers[0]} · 🥈 ${d.tiers[1]} · 🥇 ${d.tiers[2]} ${t(d.unit)}`)),
    open ? h('div', { class: 'sc22-more small' },
      h('dl', { class: 'sc22-dl' },
        h('dt', null, t(l('Começo', 'Start'))), h('dd', null, `${t(START22[d.scenario] ?? l(d.scenario, d.scenario))}${d.role === 'artist' ? ` · ${t(l('você é artista', 'you are an artist'))}` : ''}`),
        h('dt', null, t(l('Mercado', 'Market'))), h('dd', null, t(marketById[regionOf(d)]?.name ?? l('—', '—'))),
        h('dt', null, t(l('Prazo', 'Deadline'))), h('dd', null, t(l('dezembro de {y}', 'December {y}'), { y: d.endYear })),
        h('dt', null, t(l('Dificuldade', 'Difficulty'))), h('dd', null, t(DIFF22_DESC[m.d]))),
      x?.rules17.length ? h('div', null, h('b', null, t(l('Regras especiais', 'Special rules'))), h('ul', null, ...x.rules17.map((r) => h('li', null, t(r))))) : null,
      x?.events17?.length ? h('div', null, h('b', null, t(l('Marcos históricos no caminho', 'Historical milestones on the way'))), h('ul', null, ...x.events17.map((e) => h('li', null, h('b', null, `${e.year}: `), t(e.title))))) : null,
      m.tip.pt ? h('p', { class: 'sc22-tip' }, '💡 ', h('b', null, t(l('Dica: ', 'Tip: '))), t(m.tip)) : null) : null,
    h('div', { class: 'row wrap sc22-acts' },
      h('button', { type: 'button', class: 'btn small ghost', 'aria-expanded': String(open), onclick: () => { ui22.open = open ? '' : d.id; o.redraw(); } }, open ? t(l('Menos detalhes', 'Fewer details')) : t(l('Mais detalhes', 'More details'))),
      h('button', { type: 'button', class: `btn small ${on ? '' : 'primary'}`, disabled: on, onclick: () => o.onPick(d.id) }, on ? `✓ ${t(l('Escolhido', 'Chosen'))}` : t(o.pickLabel))));
}
