// Rodada 17 — motivos de HYPE variados e corretos por ato, disco e época. Antes, todo ato com momento alto
// mostrava o mesmo "Momento recente (lançamentos, shows, imprensa)" com o mesmo valor (+22, teto do momento).
// Agora o momento é decomposto no que de fato está acontecendo (disco recente, posição nas paradas, turnê,
// gênero em alta, notícia recente, cena da cidade) e o valor depende disso (0,6×–1,4× do antigo).
// Módulo puro (sem sistemas): usado por sys/hype12.

import { hashString } from '../core/rng';
import { cityById, genreById, l, type L } from '../data/world';
import { recentFacts } from './facts17';
import type { Act, GameState, Release } from './types';
import { fmtL } from './util';

type Part = { t: L; v: number };
/** desliga a variação de valores (testes A/B de balanço) */
export const HYPE17 = { flat: false };
const pick = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];
const gname = (id: string): L => genreById[id]?.name ?? l(id, id);
const cname = (id: string): L | string => cityById[id]?.name ?? id;

type ChartHit = { rel: Release; pos: number; weeks: number };
// no laço semanal (QUICK) as paradas não mudam: um índice ato → melhor posição evita varrer as listas por ato
let chIx: { s: GameState; w: number; si: unknown; al: unknown; m: Map<string, ChartHit> } | null = null;
function chartOf(s: GameState, a: Act): ChartHit | null {
  if (QUICK) {
    const si = s.charts?.singles, al = s.charts?.albums;
    if (!chIx || chIx.s !== s || chIx.w !== s.week || chIx.si !== si || chIx.al !== al) {
      const m = new Map<string, ChartHit>();
      for (const e of [...(si ?? []), ...(al ?? [])]) {
        const r = s.releases[e.releaseId];
        if (!r) continue;
        const b = m.get(r.actId);
        if (!b || e.pos < b.pos) m.set(r.actId, { rel: r, pos: e.pos, weeks: e.weeks });
      }
      chIx = { s, w: s.week, si, al, m };
    }
    return chIx.m.get(a.id) ?? null;
  }
  let best: { rel: Release; pos: number; weeks: number } | null = null;
  for (const e of [...(s.charts?.singles ?? []), ...(s.charts?.albums ?? [])]) {
    const r = s.releases[e.releaseId];
    if (r?.actId === a.id && (!best || e.pos < best.pos)) best = { rel: r, pos: e.pos, weeks: e.weeks };
  }
  return best;
}

/** Decomposição do "momento" do ato em motivos concretos. `m` = contribuição antiga ((momento−45)·0,4). */
// r17 (desempenho): no laço semanal do hype só o valor importa — os textos ficam para quem abre o painel
let QUICK = false;
const NOTXT: L = { pt: '', en: '' };
const Q = (f: () => L): L => (QUICK ? NOTXT : f());
/** Roda `fn` sem montar os textos das partes (os valores são os mesmos). */
export function quickParts17<T>(fn: () => T): T { const prev = QUICK; QUICK = true; try { return fn(); } finally { QUICK = prev; } }

export function momentumParts17(s: GameState, a: Act, m: number): Part[] {
  const y = s.year;
  if (HYPE17.flat) return [{ t: l('Momento recente', 'Recent momentum'), v: m }];
  const ds: { t: L; w: number }[] = [];
  // 1. disco recente
  const lastId = a.releases[a.releases.length - 1];
  const last = lastId ? s.releases[lastId] : undefined;
  const wk = last ? s.week - last.week : 999;
  if (last && wk >= 0 && wk <= 26) {
    const where = y < 1955 ? l('nas vitrines e nas rádios', 'in shop windows and on the radio') : y < 1985 ? l('nas lojas de discos', 'in record shops') : y < 2005 ? l('nas lojas e na MTV', 'in stores and on MTV') : l('nas playlists', 'on playlists');
    ds.push({ t: Q(() => fmtL(l('"{t}" saiu há {n} sem. e segue {w}', '"{t}" came out {n} wk ago and is still {w}'), { t: last.title, n: wk, w: where })), w: 1.2 * (1 - wk / 30) });
  }
  // 2. paradas
  const ch = chartOf(s, a);
  if (ch) ds.push({ t: Q(() => ch.pos === 1 ? fmtL(l('"{t}" é o nº 1 ({k} sem. na parada)', '"{t}" is number one ({k} wk on chart)'), { t: ch.rel.title, k: ch.weeks }) : fmtL(l('"{t}" em #{p} nas paradas', '"{t}" at #{p} on the charts'), { t: ch.rel.title, p: ch.pos })), w: 1.4 * (41 - Math.min(40, ch.pos)) / 40 });
  // 3. turnê
  const tr = s.tours.find((x) => x.actId === a.id && x.status === 'running');
  if (tr) {
    const played = tr.stops.filter((x) => x.status === 'played');
    const full = played.filter((x) => x.sold >= x.capacity * 0.95).length;
    const lastStop = played[played.length - 1];
    ds.push({ t: Q(() => full >= 2 ? fmtL(l('Turnê "{n}": {k} datas esgotadas', '"{n}" tour: {k} sold-out dates'), { n: tr.name, k: full }) : lastStop ? fmtL(l('Turnê "{n}" passou por {c}', '"{n}" tour just played {c}'), { n: tr.name, c: cname(lastStop.cityId) }) : fmtL(l('Turnê "{n}" na estrada', '"{n}" tour on the road'), { n: tr.name })), w: 0.5 + full * 0.08 });
  }
  // 4. gênero em alta (ou em queda)
  const gp = s.genrePop[a.genre] ?? 0.6;
  if (gp >= 1.15) ds.push({ t: Q(() => fmtL(pick([l('{g} é a febre de {y}', '{g} is the craze of {y}'), l('Onda de {g}: todo mundo quer ouvir', '{g} wave: everyone wants to listen')], a.id + y), { g: gname(a.genre), y })), w: (gp - 1) * 1.2 });
  // 5. notícia recente (fato público ou boato) sobre o ato
  const f = recentFacts(s, { actor: a.id, months: 2, notSecret: true, minSev: 25, limit: 1 })[0];
  if (f) { const tx = f.text; const cut = (x: string) => (x.length > 70 ? `${x.slice(0, 68)}…` : x); ds.push({ t: Q(() => ({ pt: `${f.visibility === 'rumor' ? 'Boato' : 'Na imprensa'}: ${cut(tx.pt)}`, en: `${f.visibility === 'rumor' ? 'Rumor' : 'In the press'}: ${cut(tx.en)}` })), w: 0.3 + f.severity / 100 }); }
  if (!ds.length) {
    // sem nada concreto: o embalo vem do boca a boca local (texto pela era e cidade)
    const t = y < 1950 ? l('Bailes de {c} só pedem {a}', 'Dance halls in {c} keep asking for {a}') : y < 1980 ? l('Jukeboxes de {c} tocam {a} sem parar', 'Jukeboxes in {c} play {a} nonstop') : y < 2005 ? l('{a} é o assunto nas rádios de {c}', '{a} is the talk of {c} radio') : l('{a} circula em vídeos de fãs de {c}', '{a} spreads through fan videos from {c}');
    return [{ t: Q(() => fmtL(t, { c: cname(a.city), a: a.name })), v: m * 0.6 }];
  }
  const W = ds.reduce((t, x) => t + Math.max(0.05, x.w), 0);
  const total = m * (0.6 + 0.8 * Math.min(1, W / 1.8));
  return ds.map((x) => ({ t: x.t, v: (total * Math.max(0.05, x.w)) / W }));
}

/** Texto do hype do rollout pendente, pela era e pelo título. */
export function rolloutText17(s: GameState, title: string): L {
  const y = s.year;
  const t = y < 1950 ? l('Anúncios de "{t}" no rádio e no jornal', 'Radio and newspaper ads for "{t}"') : y < 1981 ? l('Cartazes e single de "{t}" tocando nas rádios', 'Posters and the "{t}" single on the radio') : y < 2006 ? l('Clipe e single de "{t}" na TV e nas rádios', 'Video and single for "{t}" on TV and radio') : l('Teasers e pré-saves de "{t}" nas redes', 'Teasers and pre-saves for "{t}" online');
  return fmtL(t, { t: title });
}

/** Por que o público espera o próximo disco (varia pela fama, pela espera e pela estreia). */
export function fameWaitText17(s: GameState, a: Act): L {
  if (!a.releases.length) return l('Estreia muito comentada antes de sair', 'A debut everyone talks about before it is out');
  const yrs = (s.week - a.lastRelease) / 52;
  if (yrs >= 3) return fmtL(l('{n} anos sem disco: os fãs estão com saudade', '{n} years without a record: fans miss them'), { n: Math.floor(yrs) });
  if (a.fame >= 75) return l('Superestrela: cada disco é um evento', 'Superstar: every record is an event');
  if (a.peakChart > 0 && a.peakChart <= 10) return fmtL(l('Depois de um top {p}, todos querem o próximo', 'After a top {p}, everyone wants the next one'), { p: a.peakChart });
  return l('Fãs fiéis esperando o próximo disco', 'Loyal fans waiting for the next record');
}

/** Expectativa acumulada no lançamento (texto pela era/formato). */
export function launchText17(s: GameState, rel: Release, exp: number): L {
  const y = s.year;
  const big = exp >= 45;
  const t = y < 1955 ? (big ? l('Lojas encomendam "{t}" antes de chegar', 'Stores pre-order "{t}" before it arrives') : l('Rádios anunciam a chegada de "{t}"', 'Radio announces "{t}"'))
    : y < 1985 ? (big ? l('Fila na porta da loja para "{t}"', 'Queue outside the store for "{t}"') : l('"{t}" nas vitrines no dia do lançamento', '"{t}" in shop windows on release day'))
    : y < 2006 ? (big ? l('Pré-venda de "{t}" esgotada', '"{t}" pre-orders sold out') : l('Lançamento de "{t}" com clipe na TV', '"{t}" released with a video on TV'))
    : (big ? l('Contagem regressiva para "{t}" à meia-noite', 'Midnight countdown for "{t}"') : l('"{t}" chega às plataformas', '"{t}" lands on streaming'));
  return fmtL(t, { t: rel.title });
}

/** Hype de um acontecimento: o rótulo genérico ("Prêmio") ganha o fato concreto ("Prêmio: Álbum do Ano…"). */
export function eventText17(base: L, text: L): L {
  const cut = (x: string) => (x.length > 64 ? `${x.slice(0, 62)}…` : x).replace(/\.$/, '');
  return { pt: `${base.pt}: ${cut(text.pt)}`, en: `${base.en}: ${cut(text.en)}` };
}
/** Valor pelo tamanho do ato: o 1º nº 1 de um novato é notícia maior que o 10º de uma superestrela (±25%). */
export const eventValue17 = (v: number, a?: Act): number => HYPE17.flat ? v : Math.round(v * (1.25 - (a?.fame ?? 50) / 200) * 10) / 10;
