// R29 (DEMO) — PÚBLICO POR IDADE E REGIÃO na interface (só vistas; nenhuma ação nova, docs/act27.md: um fluxo por ação).
// • Ficha do ato › aba "Público": pirâmide de idade em pixel (estilo antigo: bonequinhos de 3×5 por faixa), quem vira fã
//   agora, gosto de cada geração pelo gênero, onde estão os fãs (mercados + países com bandeira geo29) e o diário.
// • Artistas › Público e mídia: o mesmo resumo, curto, para o ato selecionado.
// • Paradas: idade de quem ouve cada estilo em alta, por região (tendência regional do gênero).
// • Projeto: quem é o público-alvo (faixas) × onde o público do ato está (audLine29, usado em ui/sys/project12).
// • Mapa (Mundo): camada "Fãs por idade" (ver panels/world.ts).
import { CITIES, MARKETS, genreById, l, type L, type MarketId } from '../../data/world';
import { countryName, countryOfCity } from '../../data/geo';
import { t } from '../../i18n/strings';
import {
  AGE29, NB29, POP_START29, REF29, ageFans29, ageMix29, artistAge29, casualMix29, coreMix29, demo29, demog29, fakeYouth29, inflow29, labelAim29, labelFit29, poolFans29, popularBoard29, older29, rTrend29, regionMix29, taste29, youth29,
} from '../../sim/sys/demo29';
import { hotList17 } from '../../sim/sys/trends17';
import type { Act, GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { N, pill, rerender, section } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { K28 as K, OUT28, pxImg28 } from '../pixel/art28kit';
import { drawText } from '../pixel/font';
import { flagImg29 } from '../pixel/geo29';
import { C, Px, shade, type Col } from '../pixel/px';
import { registerPageTab, registerSection } from '../registry';
import { store } from '../store';
import './demo29.css';

const pc = (v: number) => `${Math.round(v * 100)}%`;
const mkName = (m: MarketId) => t(MARKETS.find((x) => x.id === m)!.name);
/** cor de cada faixa (paleta do estilo antigo: do vivo ao sóbrio) */
export const BAND_COL29: string[] = ['#e05a8a', '#f0a030', '#58b048', '#3a8ac8', '#8a6ab0'];

// ---------------------------------------------------------------- pirâmide em pixel

/** Pirâmide de idade 96×50: uma linha por faixa (50+ em cima), bonequinhos 3×5 proporcionais à fatia. */
function agePx29(b: number[]): Px {
  const W = 96, H = 50, p = new Px(W, H);
  p.rect(0, 0, W, H, K.paper);
  for (let i = 0; i < NB29; i++) {
    const row = NB29 - 1 - i, y = 2 + row * 9;
    drawText(p, AGE29[i].name.pt.replace('–', '-'), 2, y + 1, K.ink);
    const n = Math.max(b[i] > 0.004 ? 1 : 0, Math.round(b[i] * 40));
    const col: Col = C(BAND_COL29[i]);
    for (let k = 0; k < Math.min(n, 18); k++) {
      const x = 30 + k * 4;
      p.rect(x + 1, y, 1, 1, shade(col, 1.25)); // cabeça
      p.rect(x, y + 1, 3, 3, col); // corpo
      p.rect(x, y + 4, 1, 1, shade(col, 0.6)); p.rect(x + 2, y + 4, 1, 1, shade(col, 0.6)); // pernas
    }
    if (n > 18) drawText(p, '+', 30 + 18 * 4, y + 1, K.ink);
  }
  p.outline(OUT28);
  return p;
}
export function ageImg29(b: number[], w = 192): HTMLImageElement {
  const key = `age29:${b.map((x) => Math.round(x * 40)).join('.')}`;
  return pxImg28(key, () => agePx29(b), w, (w * 50) / 96, { cls: 'age29-img', title: t(l('Pirâmide de idade do público', 'Audience age pyramid')) });
}

/** barra empilhada por faixa (texto + cor, nunca só cor) */
export function bandBar29(b: number[], label?: string): HTMLElement {
  return h('div', { class: 'd29-bar', role: 'img', 'aria-label': label ?? AGE29.map((x, i) => `${x.name.pt}: ${pc(b[i])}`).join(', ') },
    b.map((x, i) => h('i', { style: `width:${Math.max(0, x * 100).toFixed(1)}%;background:${BAND_COL29[i]}`, title: `${t(AGE29[i].name)} ${pc(x)}` })));
}
const legend29 = (): HTMLElement => h('div', { class: 'd29-leg small' }, AGE29.map((x, i) => h('span', null, h('i', { style: `background:${BAND_COL29[i]}` }), t(x.name))));

// ---------------------------------------------------------------- leitura do público (texto)

function readOut(b: number[]): L {
  if (older29(b) >= 0.55) return l('Público envelhecido: vinil, CD, edição de luxo, relançamento e ingresso caro funcionam; single e vídeo curto rendem menos.', 'Older audience: vinyl, CD, deluxe, reissues and pricey tickets work; singles and short video do less.');
  if (youth29(b) >= 0.55) return l('Público jovem: single, streaming, vídeo curto e rádio pop; vai muito a show, mas sente o preço do ingresso.', 'Young audience: singles, streaming, short video and pop radio; goes to many shows but feels ticket prices.');
  return l('Público misto: álbum e single dividem a atenção; a turnê pede preço médio.', 'Mixed audience: albums and singles share attention; tours call for mid prices.');
}

// ---------------------------------------------------------------- aba do ato

function audienceTab(s: GameState, id: string): HTMLElement | null {
  const a = s.acts[id];
  if (!a) return null;
  const stored = !!demo29(s).a[id];
  const b = ageMix29(s, a), fans = ageFans29(s, a), inf = inflow29(s, a).w;
  const mk = regionMix29(s, a, 8);
  const tasteRow = AGE29.map((x) => taste29(s, x.mid, undefined, a.genre));
  const tMax = Math.max(...tasteRow);
  const log = demo29(s).log.filter(([, , x]) => x.pt.includes(a.name)).slice(0, 5);
  return h('div', { class: 'd29' },
    h('div', { class: 'd29-top' },
      h('figure', { class: 'd29-fig' }, ageImg29(b), h('figcaption', { class: 'small muted' }, t(l('Cada bonequinho ≈ 2,5% do público.', 'Each little figure ≈ 2.5% of the audience.')))),
      h('div', { class: 'd29-read' },
        h('p', null, h('b', null, t(readOut(b)))),
        h('p', { class: 'small' }, t(l('Idade da formação: {n} anos. Quem envelhece segura (e atrai) público da sua idade; parado, a base envelhece junto.', 'Line-up age: {n}. Acts that age keep (and attract) audiences their age; when idle, the base ages with them.'), { n: Math.round(artistAge29(s, a)) })),
        ((fy) => fy.share > 0.005 ? h('p', { class: 'small bad' }, t(l('Streams de robôs: {p} das unidades recentes. Nas plataformas eles aparecem como ouvintes de 13–24 (o painel mostra {y} jovens), mas não viram fã nem royalty.', 'Bot streams: {p} of recent units. Platforms show them as 13–24 listeners (the dashboard shows {y} young), but they become neither fans nor royalties.'), { p: pc(fy.share), y: pc(youth29(fy.seen)) })) : null)(fakeYouth29(s, a)),
        stored ? null : h('p', { class: 'small muted' }, t(l('Estimativa pela carreira (gênero, estreia, cidade e idade da formação): o registro mês a mês começa quando o ato é seu ou vira estrela.', 'Estimate from the career (genre, debut, city and line-up age): the month-by-month record starts when the act is yours or becomes a star.'))),
        why18(s, 'demo29.inflow', { act: id }, t(l('Por que esse público?', 'Why this audience?'))))),
    section(t(l('Idade do público', 'Audience age')),
      bandBar29(b), legend29(),
      ((pf) => h('div', { class: 'd29-pools' },
        h('div', null, h('b', { class: 'small' }, t(l('Núcleo ({n} fãs)', 'Core ({n} fans)'), { n: N(pf.core.reduce((x, y) => x + y, 0)) })), bandBar29(coreMix29(s, a))),
        h('div', null, h('b', { class: 'small' }, t(l('Casuais e ativos ({n})', 'Casual and active ({n})'), { n: N(pf.rest.reduce((x, y) => x + y, 0)) })), bandBar29(casualMix29(s, a))),
        h('p', { class: 'small muted' }, t(l('O núcleo é quem fica anos: mais velho e mais estável. Ele pesa na banca, no vinil e na reação dos puristas a um escândalo; os casuais e ativos pesam no perdão do mainstream.', 'The core is who stays for years: older and steadier. It weighs on merch, vinyl and purists\' reaction to a scandal; casual and active fans weigh on mainstream forgiveness.')))))(poolFans29(s, a)),
      h('div', { style: 'overflow-x:auto' }, h('table', { class: 'tbl compact num' },
        h('thead', null, h('tr', null, [l('Faixa', 'Band'), l('Fatia', 'Share'), l('Fãs', 'Fans'), l('Quem chega agora', 'Who joins now'), l('Gosto pelo gênero', 'Taste for the genre')].map((x) => h('th', null, t(x))))),
        h('tbody', null, AGE29.map((x, i) => h('tr', null, h('td', null, h('i', { class: 'd29-dot', style: `background:${BAND_COL29[i]}` }), ' ', t(x.name)), h('td', null, pc(b[i])), h('td', null, N(fans[i])), h('td', null, pc(inf[i])),
          h('td', null, h('span', { class: 'd29-mini' }, h('i', { style: `width:${Math.round((tasteRow[i] / tMax) * 100)}%` })), ` ×${tasteRow[i].toFixed(2)}`)))))),
      h('p', { class: 'small muted' }, t(l('As fatias somam o total de fãs que você já conhece (casuais + ativos + núcleo) — nada é contado duas vezes. Na virada do ano cada faixa anda: quem tinha 15 em 1965 está em 35–49 nos anos 90.', 'Shares add up to the fan total you already know (casual + active + core) — nothing is counted twice. At each year turn the bands move: a 15-year-old in 1965 is 35–49 in the 1990s.')))),
    section(t(l('Onde estão os fãs', 'Where the fans are')),
      h('div', { class: 'd29-mk' }, MARKETS.map((m) => ({ m: m.id, v: mk.mk[m.id] ?? 0 })).filter((x) => x.v >= 0.01).sort((x, y) => y.v - x.v).map((x) => h('div', { class: 'd29-mkrow' },
        h('span', null, mkName(x.m)), h('span', { class: 'd29-mini wide' }, h('i', { style: `width:${Math.round(x.v * 100)}%` })), h('b', null, pc(x.v))))),
      h('ul', { class: 'd29-cty' }, mk.top.map((c) => h('li', null, flagImg29(c.a3, 24), ' ', t(countryName(c.a3)), ' ', h('b', null, pc(c.v)),
        c.local ? [' ', pill(t(l('herói local', 'local hero')), 'good')] : null))),
      h('p', { class: 'small muted' }, t(l('Mercados: livro regional de fãs (seus atos) ou fama regional (os outros). Países: fama local, diáspora do gênero e shows feitos lá — a conversão do show fica no país onde ele aconteceu.', 'Markets: regional fan ledger (your acts) or regional fame (others). Countries: local fame, the genre\'s diaspora and shows played there — a show\'s conversion stays in the country where it happened.')))),
    ((ls) => ls.length ? section(t(l('Selos que procuram este público', 'Labels looking for this audience')),
      h('ul', { class: 'small' }, ls.map((x) => h('li', null, h('b', null, x.lb.name), ` — ${t(AIM29[labelAim29(x.lb)])} · ${t(l('encaixe', 'fit'))} ×${x.k.toFixed(2)}`))),
      h('p', { class: 'small muted' }, t(l('Cada selo mira uma geração (hitmaker e estrelas: jovens; catálogo: 35+; boutique e caçador de cena: 18–34) e segue o público do elenco que já tem. Pesa em quem ele contrata e na disputa por uma oferta.', 'Each label aims at a generation (hitmakers and star-chasers: young; catalog: 35+; boutiques and scene hunters: 18–34) and follows its current roster\'s audience. It weighs on whom it signs and in bidding wars.'))))
      : null)(Object.values(s.labels).filter((x) => x.active).map((lb) => ({ lb, k: labelFit29(s, lb, a) })).sort((x, y) => y.k - x.k || (x.lb.id < y.lb.id ? -1 : 1)).slice(0, 3)),
    log.length ? section(t(l('Diário do público', 'Audience log')), h('ul', { class: 'small' }, log.map(([y, m, x]) => h('li', null, `${m + 1}/${y} · ${t(x)}`)))) : null);
}

const AIM29: Record<string, L> = { young: l('mira jovens (13–24)', 'aims at youth (13–24)'), old: l('mira 35+', 'aims at 35+'), mid: l('mira 18–34', 'aims at 18–34'), flat: l('sem geração preferida', 'no preferred generation') };

registerPageTab('act', { id: 'demo29', label: l('Público', 'Audience'), icon: 'fans', order: 58, render: audienceTab });

// ---------------------------------------------------------------- Artistas › Público e mídia (resumo)

function rosterSection(s: GameState): HTMLElement | null {
  const ids = playerActs(s);
  const id = store.selectedAct && ids.includes(store.selectedAct) ? store.selectedAct : ids[0];
  const a = id ? s.acts[id] : undefined;
  if (!a) return null;
  const b = ageMix29(s, a), rm = regionMix29(s, a, 3);
  return section(t(l('Idade e região do público', 'Audience age and region')),
    h('div', { class: 'd29-top' }, ageImg29(b, 144),
      h('div', null, bandBar29(b), legend29(), h('p', { class: 'small' }, t(readOut(b))),
        h('p', { class: 'small' }, rm.top.map((c, i) => [i ? ' · ' : '', flagImg29(c.a3, 18), ' ', t(countryName(c.a3)), ` ${pc(c.v)}`])))));
}
registerSection('artists', { id: 'demo29', order: 58, render: rosterSection, title: l('Idade e região do público', 'Audience age and region') });

// ---------------------------------------------------------------- Paradas: idade de quem ouve cada estilo

let REG29: MarketId | 'world' = 'world';
/** Fatia de cada faixa entre os ouvintes de um gênero numa região (demografia × gosto × quem descobre música). */
export function genreAges29(s: GameState, genre: string, mk: MarketId | 'world'): number[] {
  const ms = mk === 'world' ? MARKETS.map((m) => m.id) : [mk];
  const w = [0, 0, 0, 0, 0];
  for (const m of ms) {
    const sz = MARKETS.find((x) => x.id === m)!.size(s.year), dem = demog29(m, s.year);
    AGE29.forEach((x, i) => { w[i] += sz * dem[i] * taste29(s, x.mid, m, genre) * [1.3, 1.5, 1.0, 0.6, 0.35][i]; });
  }
  const tt = w.reduce((x, y) => x + y, 0) || 1;
  return w.map((x) => x / tt);
}
function chartsSection(s: GameState): HTMLElement | null {
  const hot = hotList17(s, 6);
  if (!hot.length) return null;
  const opts = [{ value: 'world', label: t(l('Mundo', 'World')) }, ...MARKETS.map((m) => ({ value: m.id, label: t(m.name) }))];
  return section(t(l('Quem ouve cada estilo (idade)', 'Who listens to each style (age)')),
    h('label', { class: 'small' }, t(l('Região', 'Region')), ' ', select(REG29, opts as { value: MarketId | 'world'; label: string }[], (v) => { REG29 = v; rerender(); })),
    legend29(),
    h('div', { style: 'overflow-x:auto' }, h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Estilo', 'Style'))), h('th', null, t(l('Idade dos ouvintes', 'Listener age'))), h('th', null, t(l('Tendência na região', 'Trend in the region'))))),
      h('tbody', null, hot.map((x) => {
        const g = genreById[x.g], ages = genreAges29(s, x.g, REG29);
        const fam = g?.family ?? 'pop';
        const tr = REG29 === 'world' ? 1 : rTrend29(s, REG29, fam);
        const skew = youth29(ages) - (REF29[0] + REF29[1]);
        return h('tr', null, h('td', null, g ? t(g.name) : x.g), h('td', { style: 'min-width:160px' }, bandBar29(ages), h('small', { class: 'muted' }, skew > 0.05 ? t(l('mais jovem', 'younger')) : skew < -0.12 ? t(l('mais velho', 'older')) : t(l('equilibrado', 'balanced')))),
          h('td', null, REG29 === 'world' ? '—' : pill(`×${tr.toFixed(2)}`, tr > 1.08 ? 'good' : tr < 0.92 ? 'bad' : '')));
      })))),
    h('p', { class: 'small muted' }, t(l('Jovem adota o gênero novo; cada geração guarda a música da sua juventude. A tendência regional sai das paradas de cada mercado (a média mundial continua sendo a popularidade global).', 'Youth adopts new genres; each generation keeps the music of its youth. The regional trend comes from each market\'s charts (the world average remains global popularity).'))));
}
function popularSection(s: GameState): HTMLElement | null {
  if (s.year < POP_START29) return null;
  const board = popularBoard29(s, 8), hist = demo29(s).pv ?? [];
  const tot = board.reduce((x, y) => x + y.votes, 0) || 1;
  const mine = new Set(playerActs(s));
  return section(t(l('Voto do Público (prêmio por voto popular)', 'People\'s Vote (popular-vote award)')),
    h('p', { class: 'small' }, t(l('Os fãs votam todo novembro. Quem tem 13–24 vota muito mais (e mais ainda com TV e internet); 50+ quase não vota. Robôs, urna cheia e voto encomendado (Submundo) e streams de fazenda viram votos falsos — e prêmio ganho assim pode ser cassado.', 'Fans vote every November. 13–24s vote far more (more so with TV and the internet); 50+ barely vote. Bots, ballot stuffing, bought votes (Underworld) and farm streams become fake votes — and a prize won that way can be revoked.'))),
    board.length ? h('div', { style: 'overflow-x:auto' }, h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, [l('Ato', 'Act'), l('Prévia dos votos', 'Vote preview'), l('Quem vota (idade)', 'Who votes (age)')].map((x) => h('th', null, t(x))))),
      h('tbody', null, board.map((x) => h('tr', null, h('td', null, mine.has(x.act.id) ? h('b', null, x.act.name) : x.act.name),
        h('td', null, pc(x.votes / tot), x.fake > 0 ? [' ', pill(t(l('voto falso', 'fake votes')), 'bad')] : null),
        h('td', { style: 'min-width:140px' }, bandBar29(x.byAge.map((v) => v / (x.byAge.reduce((p, q) => p + q, 0) || 1))))))))) : null,
    hist.length ? h('ul', { class: 'small' }, hist.slice(0, 6).map(([y, id, f, rv]) => h('li', null, `${y}: ${s.acts[id]?.name ?? id}`, f > 0 ? ` (${pc(f)} ${t(l('falso', 'fake'))})` : '', rv ? [' ', pill(t(l('cassado', 'revoked')), 'bad')] : null))) : null);
}
registerSection('charts', { id: 'demo29pop', order: 76, render: popularSection, title: l('Voto do Público', 'People\'s Vote') });

registerSection('charts', { id: 'demo29', order: 75, render: chartsSection, title: l('Quem ouve cada estilo (idade)', 'Who listens to each style (age)') });

// ---------------------------------------------------------------- Projeto: quem é o público-alvo

const AUD_BANDS: Record<string, number[]> = { young: [0, 1], adult: [2, 3], critics: [1, 2, 3], core: [] };
/** Linha do projeto: faixas que o público-alvo mira × onde o público do ato está agora. */
export function audLine29(s: GameState, a: Act, aud: string): HTMLElement {
  const b = ageMix29(s, a);
  const bands = AUD_BANDS[aud] ?? [];
  const share = bands.reduce((x, i) => x + b[i], 0);
  const names = bands.map((i) => t(AGE29[i].name)).join(', ');
  return h('div', { class: 'd29-aud small' }, bandBar29(b),
    aud === 'core' || !bands.length
      ? t(l('Fãs fiéis: o disco fala com quem já está aqui (a idade do público não muda).', 'Core fans: the record speaks to those already here (audience age stays).'))
      : t(l('Mira {b}: hoje {p} do público de {a} está nessas faixas. Mirar onde o público está rende agora; mirar fora puxa gente nova dessas idades.', 'Aims at {b}: today {p} of {a}\'s audience is in those bands. Aiming where the audience is pays now; aiming elsewhere pulls new fans of those ages.'), { b: names, p: pc(share), a: a.name }));
}

// ---------------------------------------------------------------- Mapa: fãs por idade (camada do painel Mundo)

/** Por país: faixa dominante dos SEUS fãs ali (idade do ato × demografia do mercado do país) e a força (volume). */
export function ageLayer29(s: GameState): Map<string, { band: number; v: number; mix: number[] }> {
  const acc = new Map<string, number[]>();
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    const b = ageMix29(s, a), n = a.fans.casual + a.fans.active + a.fans.core;
    for (const c of regionMix29(s, a, 24).top) {
      if (c.v <= 0) continue;
      const x = acc.get(c.a3) ?? [0, 0, 0, 0, 0];
      b.forEach((y, i) => (x[i] += y * c.v * n));
      acc.set(c.a3, x);
    }
  }
  const out = new Map<string, { band: number; v: number; mix: number[] }>();
  let max = 1;
  for (const x of acc.values()) max = Math.max(max, x.reduce((p, q) => p + q, 0));
  for (const [a3, x] of acc) {
    const tt = x.reduce((p, q) => p + q, 0);
    if (tt / max < 0.03) continue;
    const mix = x.map((y) => y / tt);
    out.set(a3, { band: mix.indexOf(Math.max(...mix)), v: tt / max, mix });
  }
  return out;
}
export const ageLayerColor29 = (band: number, v: number): string => {
  const c = BAND_COL29[band].slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${(0.3 + 0.65 * Math.sqrt(v)).toFixed(2)})`;
};
export const ageLegend29 = (): HTMLElement[] => AGE29.map((x, i) => h('span', { class: 'wmap-key' }, h('i', { class: 'sw', style: `background-color:${BAND_COL29[i]};opacity:.7` }), `${t(l('País: maioria', 'Country: mostly'))} ${t(x.name)}`));
/** Bolhas na maior praça de cada país (cor = faixa dominante, tamanho = volume): o véu do país é discreto no mapa. */
export function ageBubbles29(s: GameState): { kind: 'bubble'; city: string; value: number; color: string }[] {
  const out: { kind: 'bubble'; city: string; value: number; color: string }[] = [];
  for (const [a3, x] of ageLayer29(s)) {
    const city = CITIES.find((c) => countryOfCity(c.id) === a3);
    if (city) out.push({ kind: 'bubble', city: city.id, value: Math.max(0.15, x.v), color: BAND_COL29[x.band] });
  }
  return out;
}
