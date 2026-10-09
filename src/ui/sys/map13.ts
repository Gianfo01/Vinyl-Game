// Rodada 13: mapa do mundo legível — "pintar países por" (tamanho do mercado, crescimento, seus fãs,
// sua fatia, domínio dos rivais, pirataria, formato físico) com legenda em escala e unidade, balões
// com números e explicação por país e cidade, notas de escala das bolhas e uma ficha de país completa
// com ações (abrir filial, pôr na turnê, divulgação dirigida). Tudo respeita a época.

import { CITIES, FAMILIES, l, type L } from '../../data/world';
import { FESTIVALS } from '../../data/catalog';
import { BRANCH_LEVELS } from '../../data/rules';
import { countryInfoByA3 } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { t } from '../../i18n/strings';
import { canOpenBranch, openBranch } from '../../sim/branches';
import { awardName } from '../../sim/sys/charts7';
import { genreHeat, promoBlocker, promoCost, promoTrip, rivalPower } from '../../sim/sys/mapx8';
import { PAINTS, PAINT_INFO, countryStats, paintAll, paintAvailable, type CountryStats, type Paint } from '../../sim/sys/map13';
import { cityDemand } from '../../sim/tours';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, N, actLink, genreName, labelLink, rerender, toast } from '../common';
import { h, select } from '../dom';
import { addTourStop } from '../panels/misc';
import { store } from '../store';
import { chips, ic, stat } from '../vis';
import './map13.css';

let paint: Paint = 'none';
export const paintNow = (): Paint => paint;
export function setPaint(p: Paint): void { paint = p; }

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const sgn = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

function fmtPaint(p: Paint, x: number): string {
  if (p === 'fans') return N(Math.round(x));
  if (p === 'growth') return sgn(x);
  if (p === 'market') return pct(x, 1);
  return pct(x);
}

/** Cor da escala: sequencial por camada; crescimento é divergente (vermelho → cinza → verde). */
const HUE: Record<Paint, number> = { none: 0, market: 210, growth: 120, fans: 25, share: 45, rivaldom: 0, piracy: 280, physical: 30 };
function colorOf(p: Paint, x: number, min: number, max: number): string {
  if (p === 'growth') {
    const m = Math.max(0.01, Math.abs(min), Math.abs(max));
    const k = Math.min(1, Math.abs(x) / m);
    return x >= 0 ? `hsla(130,55%,38%,${(0.15 + 0.75 * k).toFixed(2)})` : `hsla(0,65%,45%,${(0.15 + 0.75 * k).toFixed(2)})`;
  }
  const span = max - min || 1;
  let k = Math.max(0, Math.min(1, (x - min) / span));
  if (p === 'fans' || p === 'market') k = Math.sqrt(k);
  return `hsla(${HUE[p]},70%,42%,${(0.15 + 0.8 * k).toFixed(2)})`;
}

/** Barra de escolha da pintura dos países. */
export function paintBar(s: GameState): HTMLElement {
  const opts = PAINTS.filter((p) => paintAvailable(s, p));
  if (!opts.includes(paint)) paint = 'none';
  return h('label', { class: 'map13-paint' }, ic('globe'), ' ', t(l('Pintar países por', 'Shade countries by')), ' ',
    select<Paint>(paint, opts.map((p) => ({ value: p, label: t(PAINT_INFO[p].name) })), (v) => { paint = v; rerender(); }, { 'aria-label': t(l('Pintar países por', 'Shade countries by')) }));
}

/** Cores por país da pintura ativa (calculado uma vez por desenho). */
export function paintShadeMap(s: GameState): Map<string, { color: string }> {
  const out = new Map<string, { color: string }>();
  if (paint === 'none') return out;
  const { v, min, max } = paintAll(s, paint);
  for (const [a3, x] of v) out.set(a3, { color: colorOf(paint, x, min, max) });
  return out;
}

/** Legenda: barra de escala com mínimo/máximo, unidade e o que significa. */
export function paintLegend(s: GameState): HTMLElement[] {
  if (paint === 'none' || !paintAvailable(s, paint)) return [];
  const { v, min, max } = paintAll(s, paint);
  const info = PAINT_INFO[paint];
  if (!v.size) return [h('span', { class: 'wmap-key map13-key' }, h('b', null, t(info.name)), ': ', t(l('sem dados ainda neste ano (as paradas por país enchem semana a semana).', 'no data yet this year (country charts fill week by week).')))];
  const grad = paint === 'growth'
    ? `linear-gradient(90deg, ${colorOf(paint, min, min, max)}, hsla(0,0%,60%,.2), ${colorOf(paint, max, min, max)})`
    : `linear-gradient(90deg, ${colorOf(paint, min, min, max)}, ${colorOf(paint, (min + max) / 2, min, max)}, ${colorOf(paint, max, min, max)})`;
  return [h('div', { class: 'map13-legend' },
    h('div', { class: 'row' }, h('b', null, t(info.name)), h('small', { class: 'muted' }, ` (${t(info.unit)})`)),
    h('div', { class: 'map13-scale' }, h('small', null, fmtPaint(paint, min)), h('i', { style: `background:${grad}` }), h('small', null, fmtPaint(paint, max))),
    h('small', { class: 'muted' }, t(info.why), ' ', t(l('Países sem cor: sem dados.', 'Uncoloured countries: no data.'))))];
}

const row = (icon: string, text: string, cls = '') => h('div', { class: `wmap-tip-row ${cls}` }, ic(icon), text);

/** Balão do país: números principais e a camada ativa explicada. */
export function countryTip13(s: GameState, a3: string): HTMLElement | null {
  const st = countryStats(s, a3);
  if (!st) return null;
  const info = PAINT_INFO[paint];
  return h('div', { class: 'wmap-tip-extra' },
    row('globe', `${t(l('Mercado', 'Market'))}: ${pct(st.sizePct, 1)} ${t(l('do mundo', 'of world'))} · ${sgn(st.growth)}/10 ${t(l('anos', 'yrs'))}`),
    st.fans ? row('fans', `${N(Math.round(st.fans))} ${t(l('fãs potenciais seus', 'potential fans of yours'))}`) : null,
    st.units ? row('chart-up', `${t(l('Sua fatia', 'Your share'))} ${pct(st.share)}${st.top ? ` · ${t(l('maior rival', 'top rival'))} ${s.labels[st.top.owner]?.name ?? '?'} ${pct(st.top.share)}` : ''}`) : null,
    paintAvailable(s, 'piracy') ? row('lock', `${t(l('Pirataria (est.)', 'Piracy (est.)'))} ${pct(st.piracy)}`) : null,
    row('note', st.genres.slice(0, 3).map((g) => t(g.name)).join(', ')),
    paint !== 'none' ? h('div', { class: 'muted small' }, t(info.why)) : null,
    h('div', { class: 'muted small' }, t(l('Clique para a ficha do país.', 'Click for the country card.'))));
}

function sceneOf(s: GameState, cityId: string): number {
  let v = 0;
  for (const [k, x] of Object.entries(s.scenes)) if (k.startsWith(cityId + ':')) v += x;
  return v;
}

/** Números da cidade nas camadas de bolha ativas. */
export function cityTip13(s: GameState, id: string, layers: Set<string>, fam: string): HTMLElement | null {
  const rows: HTMLElement[] = [];
  if (layers.has('scenes')) rows.push(row('fire', `${t(l('Força das cenas', 'Scene strength'))}: ${sceneOf(s, id).toFixed(1)}`));
  if (layers.has('genre')) rows.push(row('note', `${t(FAMILIES.find((f) => f.id === fam)?.name ?? l(fam))}: ${(genreHeat(s, fam).get(id) ?? 0).toFixed(1)}`));
  if (layers.has('rivalpower')) rows.push(row('flag', `${t(l('Força dos rivais', 'Rival strength'))}: ${(rivalPower(s).get(id) ?? 0).toFixed(1)}`));
  return rows.length ? h('div', { class: 'wmap-tip-extra' }, rows) : null;
}

/** Notas de escala das bolhas: o que o tamanho mede e quanto vale a maior. */
export function bubbleNotes(s: GameState, layers: Set<string>, fam: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const note = (color: string, title: L, unit: L, max: number, why: L) => out.push(h('div', { class: 'map13-legend' },
    h('div', { class: 'row' }, h('i', { class: 'map13-dot', style: `background:${color}` }), h('b', null, t(title))),
    h('small', null, t(l('Tamanho da bolha ∝ {u}. Maior bolha = {m}.', 'Bubble size ∝ {u}. Biggest bubble = {m}.'), { u: t(unit), m: max ? (max >= 100 ? N(Math.round(max)) : max.toFixed(1)) : '—' })),
    h('small', { class: 'muted' }, ' ', t(why))));
  if (layers.has('fans')) {
    const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
    let max = 0;
    for (const c of CITIES) { let v = 0; for (const a of acts) v += cityDemand(s, a, c.id); max = Math.max(max, v); }
    note('var(--accent)', l('Seus fãs (cidades)', 'Your fans (cities)'), l('fãs potenciais na cidade', 'potential fans in the city'), max, l('Só cidades com pelo menos 15% da maior aparecem. Cresce com fama, divulgação local e shows.', 'Only cities with at least 15% of the biggest show. Grows with fame, local promo and shows.'));
  }
  if (layers.has('scenes')) {
    let max = 0;
    for (const c of CITIES) max = Math.max(max, sceneOf(s, c.id));
    note('var(--good)', l('Cenas', 'Scenes'), l('força somada das cenas da cidade (0–10 por gênero)', 'summed strength of the city\'s scenes (0–10 per genre)'), max, l('Cena forte = mais talento para descobrir e público fiel ao gênero.', 'Strong scene = more talent to find and a loyal audience for the genre.'));
  }
  if (layers.has('genre')) {
    const m = genreHeat(s, fam);
    note('#a35bd8', l('Calor do gênero', 'Genre heat'), l('força das cenas desse gênero na cidade', 'strength of that genre\'s scenes in the city'), Math.max(0, ...m.values()), l('Onde o gênero escolhido ferve agora: bom lugar para procurar artistas e lançar.', 'Where the chosen genre is hot right now: a good place to scout and launch.'));
  }
  if (layers.has('rivalpower')) {
    const m = rivalPower(s);
    note('var(--bad)', l('Força dos rivais', 'Rival strength'), l('artistas no elenco + reputação/20 dos selos sediados', 'roster acts + reputation/20 of labels based there'), Math.max(0, ...m.values()), l('Rival forte por perto disputa contratações e datas.', 'A strong rival nearby fights you for signings and dates.'));
  }
  return out;
}

// ---------------------------------------------------------------- ficha do país

let promoAct13 = '';
let branchCity13 = '';

function barRow(label: string, v: number, cls = ''): HTMLElement {
  return h('div', { class: 'bar-row' }, h('span', { class: 'map13-lbl' }, label), h('div', { class: 'bar' }, h('i', { class: cls, style: `width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%` })), h('small', null, pct(v)));
}

export function countryPanel13(s: GameState, a3: string): HTMLElement | null {
  const st: CountryStats | null = countryStats(s, a3);
  const info = countryInfoByA3[a3];
  const cities = CITIES.filter((c) => countryOfCity(c.id) === a3);
  if (!st && !cities.length) return null;
  const cityIds = new Set(cities.map((c) => c.id));
  const scenes = Object.entries(s.scenes).filter(([k, v]) => v > 0.5 && cityIds.has(k.split(':')[0])).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const fests = FESTIVALS.filter((f) => f.start <= s.year && cityIds.has(f.city));
  const clubs = s.clubs.filter((c) => !c.closed && cityIds.has(c.city));
  const based = Object.values(s.labels).filter((lb) => lb.active && cityIds.has(lb.city));
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && (a.status === 'active' || a.status === 'emerging') && !a.deceased);
  if (!acts.some((a) => a.id === promoAct13)) promoAct13 = acts[0]?.id ?? '';
  // cidade alvo: a com mais público seu (senão a primeira)
  const target = cities.map((c) => ({ c, v: acts.reduce((t0, a) => t0 + cityDemand(s, a, c.id), 0) })).sort((a, b) => b.v - a.v)[0]?.c;
  if (!cities.some((c) => c.id === branchCity13)) branchCity13 = target?.id ?? '';
  const brErr = branchCity13 ? canOpenBranch(s, branchCity13) : l('Sem cidades.', 'No cities.');
  const pErr = target && promoAct13 ? promoBlocker(s, target.id, promoAct13) : l('Sem artistas no selo.', 'No acts on the label.');
  const res = (e: unknown, ok: L) => { if (e && typeof e === 'object' && 'pt' in (e as object)) toast(t(e as L), 'bad'); else toast(t(ok), 'good'); rerender(); };
  const award = info?.award && info.award[2] <= s.year ? awardName(s, info) : '';
  return h('div', { class: 'map13-country' },
    st ? chips(
      stat('globe', pct(st.sizePct, 1), l('do consumo mundial', 'of world consumption')),
      stat(st.growth >= 0 ? 'chart-up' : 'chart-down', sgn(st.growth), l('crescimento em 10 anos', 'growth over 10 years')),
      stat('fans', N(Math.round(st.fans)), l('seus fãs potenciais', 'your potential fans')),
      st.units ? stat('disc', pct(st.share), l('sua fatia no ano', 'your share this year')) : null,
    ) : null,
    st ? h('div', { class: 'grid2' },
      h('div', null,
        h('h5', null, t(l('Gostos do país', 'What the country likes'))),
        ...st.genres.map((g) => barRow(t(g.name), Math.min(1, g.v / 1.8))),
        h('small', { class: 'muted' }, t(l('Gosto 0,9 = neutro; acima de 1,2 o gênero vende bem mais aqui.', 'Taste 0.9 = neutral; above 1.2 the genre sells much better here.'))),
      ),
      h('div', null,
        h('h5', null, t(l('Formatos e pirataria', 'Formats and piracy'))),
        barRow(t(st.mix.physName), st.mix.phys),
        st.mix.dl > 0 ? barRow(t(l('Download', 'Download')), st.mix.dl) : null,
        st.mix.stream > 0 ? barRow(t(l('Streaming', 'Streaming')), st.mix.stream) : null,
        paintAvailable(s, 'piracy') ? barRow(t(l('Pirataria (est.)', 'Piracy (est.)')), st.piracy, 'bad') : null,
        h('small', { class: 'muted' }, t(l('Físico alto = tiragem e fábrica decidem; pirataria alta come as vendas — aposte em shows.', 'High physical = pressing and plants decide; high piracy eats sales — lean on shows.'))),
      ),
    ) : h('p', { class: 'muted small' }, t(l('Sem estatísticas de mercado para este país.', 'No market statistics for this country.'))),
    h('h5', null, t(l('Quem manda aqui', 'Who rules here'))),
    st && st.units ? h('div', null,
      barRow(s.config.companyName, st.share, 'good'),
      ...st.owners.map((o) => h('div', { class: 'bar-row' }, h('span', { class: 'map13-lbl' }, labelLink(s, o.owner)), h('div', { class: 'bar' }, h('i', { class: 'bad', style: `width:${Math.round(o.share * 100)}%` })), h('small', null, pct(o.share)))),
      st.top && st.top.share > 0.4 ? h('small', { class: 'bad' }, t(l('Mercado dominado: entrar exige divulgação forte ou um acordo com quem manda.', 'Dominated market: getting in takes heavy promotion or a deal with whoever rules.'))) : null,
    ) : h('p', { class: 'muted small' }, t(l('Ainda sem vendas registradas neste país este ano.', 'No sales recorded in this country this year yet.'))),
    based.length ? h('p', { class: 'small' }, ic('flag'), ' ', t(l('Sediados aqui: ', 'Based here: ')), ...based.flatMap((lb, i) => [i ? ', ' : '', labelLink(s, lb.id)])) : null,
    scenes.length ? h('div', null, h('h5', null, t(l('Cenas', 'Scenes'))), chips(...scenes.map(([k, v]) => stat('fire', v.toFixed(1), `${genreName(k.split(':')[1])} · ${t(cities.find((c) => c.id === k.split(':')[0])?.name ?? l('?'))}`)))) : null,
    fests.length || clubs.length || award ? h('div', null, h('h5', null, t(l('Palcos, festivais e prêmios', 'Venues, festivals and awards'))),
      h('ul', { class: 'small' },
        ...fests.map((f) => h('li', null, ic('star'), ` ${f.name} · ${t(l('prestígio', 'prestige'))} ${f.prestige}`)),
        clubs.length ? h('li', null, ic('house'), ` ${clubs.length} ${t(l('clubes ativos', 'active clubs'))}: ${clubs.slice(0, 4).map((c) => c.name).join(', ')}`) : null,
        award ? h('li', null, ic('trophy'), ` ${award}`) : null)) : null,
    cities.length && s.config.role !== 'artist' ? h('div', { class: 'map-actions' },
      h('h5', null, t(l('Ações no país', 'Actions in this country'))),
      h('div', { class: 'row wrap' },
        cities.length > 1 ? select(branchCity13, cities.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { branchCity13 = v; rerender(); }) : null,
        h('button', { class: 'btn small', disabled: !!brErr, title: brErr ? t(brErr) : t(l('Filial: +público e distribuição na região, olheiros locais.', 'Branch: more audience and distribution in the region, local scouts.')), onclick: () => res(openBranch(s, branchCity13), l('Filial aberta!', 'Branch opened!')) },
          ic('house'), ` ${t(l('Abrir escritório', 'Open an office'))} (${$(money(s, BRANCH_LEVELS[0].cost))})`),
        target && acts.length ? h('button', { class: 'btn small', onclick: () => { addTourStop(target.id); store.area = 'shows'; toast(t(l('Cidade adicionada ao planejador de turnê.', 'City added to the tour planner.')), 'good'); rerender(); } }, ic('tour-bus'), ` ${t(l('Turnê por aqui', 'Tour here'))} (${t(target.name)})`) : null),
      target && acts.length ? h('div', { class: 'row wrap' },
        acts.length > 1 ? select(promoAct13, acts.map((a) => ({ value: a.id, label: a.name })), (v) => { promoAct13 = v; rerender(); }) : actLink(s, promoAct13),
        h('button', { class: 'btn small primary', disabled: !!pErr, title: pErr ? t(pErr) : t(l('Rádio, lojas e imprensa em {c}: fãs agora e +30% de público lá por 3 meses (+6% na região).', 'Radio, shops and press in {c}: fans now and +30% audience there for 3 months (+6% in the region).'), { c: t(target.name) }),
          onclick: () => { const r = promoTrip(s, target.id, promoAct13); res('text' in (r as object) ? null : r, l('Divulgação dirigida feita.', 'Targeted promo done.')); } },
          ic('radio'), ` ${t(l('Marketing dirigido', 'Targeted marketing'))} (${$(promoCost(s, target.id))})`)) : null,
      brErr && branchCity13 ? h('small', { class: 'muted' }, t(brErr)) : null,
    ) : null,
  );
}

