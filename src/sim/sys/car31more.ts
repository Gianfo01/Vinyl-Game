// R31 · onda 3 (CAR) — AS OUTRAS CARREIRAS LIGADAS AO MUNDO (cada uma com interruptor próprio).
//
//   car31.studio  ESTÚDIO: a sessão vendida a um selo vira a qualidade real do próximo disco dele (nota e apelo no
//                 lançamento, com o crédito "Gravado no seu estúdio" na explicação das vendas).
//                 EDITORA: a canção colocada com um artista entra no próximo disco dele (apelo no lançamento) e a
//                 editora recebe a edição pelas vendas reais desse disco durante um ano.
//   car31.route   AGENCIAMENTO: cada cliente tem um mercado-alvo; a turnê roteirizada passa por cidades desse país
//                 (marca os shows: fama no país pela regra da turnê). Abrir mercado onde o artista é desconhecido dá
//                 prejuízo.
//   car31.manager EMPRESÁRIO (por último): o plano vira pedidos reais — à rádio, a um festival, ao selo do cliente
//                 (divulgação) — que podem recusar conforme fama, satisfação do cliente e a relação com o líder do selo.
//   car31.press   CRÍTICO: resenha boa pesa no país do veículo (três meses); em dezembro, a lista do ano empurra o
//                 catálogo em janeiro e fevereiro. TRILHAS: a música do filme vende na proporção da bilheteria.
// Tudo o que vira parada ou fama passa pela função única (car31.ts).

import { Rng, clamp } from '../../core/rng';
import { CITIES, l, type L } from '../../data/world';
import { countryName, countryOfCity } from '../../data/geo';
import { COUNTRY_INFO, countryInfoByA3, countryMarketSize } from '../../data/countries';
import { outletsIn, pickOutlet } from '../outlets17';
import { hasTech } from '../util';
import { pushTrend17, styleOfRel17 } from './trends17';
import { baseDraw, bookRoute, clientsOf, defaultStop, validate, type Stop } from './tour12';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine, opinionOf } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import type { Act, GameState, Release } from '../types';
import { fmtL, money } from '../util';
import { boost31, car31On, careerSw31, exec31, registerExec31, touch31 } from './car31';
import { fameIn } from './fame16';
import { SCREEN31 } from './screen18';
import { ROUTE31, vpay, type Venture } from './ventures9';

export interface Pledge31 { act: string; vid: string; t: string; u: number; k: number }
export interface More31State {
  /** estúdio: selo → sessões vendidas e a qualidade da casa (vale 13 semanas) */
  sb: Record<string, { n: number; q: number; u: number; vid: string }>;
  /** editora: canções colocadas à espera do próximo disco do artista; obras já processadas */
  pl: Pledge31[]; seen: Record<string, 1>;
  /** editora: discos com canção da casa → editora e prazo do pagamento */
  pr: Record<string, { vid: string; u: number; paid: number }>;
  /** agência: mercado-alvo por cliente */
  tgt: Record<string, string>;
  /** empresário: último pedido por cliente e tipo (semana) */
  rq: Record<string, number>;
  /** crítico: lista do ano escolhida (vazia = automática) */
  yl: string[];
  /** car31.trend: discos com a assinatura do estúdio (gênero) e quanto a moda já foi empurrada no ano */
  ss?: { rel: string; g: string; w: number }[]; tl?: Record<string, { y: number; v: number; told?: 1 }>;
  /** car31.outlets: países escolhidos para a sindicação das resenhas (vazio = automático) */
  syn?: string[];
  log: { w: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { car31x: More31State } }
const fresh = (): More31State => ({ sb: {}, pl: [], seen: {}, pr: {}, tgt: {}, rq: {}, yl: [], log: [] });
registerExt4('car31x', fresh);
export const moreRo31 = (s: GameState): More31State => (s as unknown as { x4?: { car31x?: More31State } }).x4?.car31x ?? fresh();
function mx(s: GameState): More31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.car31x ??= fresh()) as More31State;
  const f = fresh();
  for (const k of Object.keys(f) as (keyof More31State)[]) (st as unknown as Record<string, unknown>)[k] ??= f[k];
  return st;
}
const note = (st: More31State, w: number, t: L) => { st.log.unshift({ w, t }); if (st.log.length > 16) st.log.length = 16; };
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const vlist = (s: GameState): Venture[] => (s as unknown as { x4?: { ventures9?: { list?: Venture[] } } }).x4?.ventures9?.list ?? [];
const latestLive = (s: GameState, actId: string): Release | undefined => {
  const a = s.acts[actId];
  for (let i = (a?.releases.length ?? 0) - 1; i >= 0; i--) { const r = s.releases[a!.releases[i]]; if (r?.live) return r; }
  return undefined;
};
const home = (s: GameState): string => countryOfCity(s.config.homeCity) ?? 'USA';

careerSw31('trend', l('Estúdio: discos com a assinatura do seu estúdio que fazem sucesso empurram a moda do gênero (com teto por ano).', 'Studio: hit records with your studio\'s signature push the genre\'s trend (capped per year).'));
careerSw31('agency', l('Agência: a turnê do cliente vira datas reais no motor de rotas, nas cidades do mercado-alvo (casa, público, cachê, cansaço).', 'Agency: the client\'s tour becomes real dates in the routing engine, in the target market\'s cities (venue, crowd, fee, fatigue).'));
careerSw31('asks', l('Empresário: mais pedidos — TV, revista, playlist, casa de shows, trilha e agência — cada um com motivo de recusa.', 'Manager: more requests — TV, magazine, playlist, venue, film song and agency — each with its reason for refusal.'));
careerSw31('outlets', l('Crítica: a resenha pesa no país de cada veículo que a publica (casa e sindicação pelo alcance), não só na sede.', 'Criticism: a review weighs in the country of each outlet that runs it (home and syndication by reach), not only at home.'));

// ---------------------------------------------------------------- estúdio e editora: o lançamento de verdade

/** qualidade da casa do estúdio (a mesma conta do "som da casa") */
export const studioQ31 = (v: Venture): number => (v.sound ?? 0) * (0.6 + v.level * 0.08);
/** bônus do disco gravado no seu estúdio (q 0..100 da casa): nota +0..5, apelo +0..12% */
export const studioBonus31 = (q: number): { dq: number; k: number } => ({ dq: clamp((q - 40) / 10, 0, 5), k: clamp((q - 40) / 400, 0, 0.12) });

registerSimHook('launch', 'car31more', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || !car31On(s, 'studio')) return;
  const st = moreRo31(s);
  const a = s.acts[rel.actId];
  // estúdio: o selo que gravou com você nas últimas 13 semanas
  const b = st.sb[rel.owner];
  if (b && b.u >= s.week && b.n > 0 && rel.owner !== 'player') {
    const x = mx(s).sb[rel.owner];
    const { dq, k } = studioBonus31(x.q);
    if (k > 0) {
      rel.q = Math.round(clamp(rel.q + dq, 0, 100));
      rel.appeal *= 1 + k;
      (rel.autopsy ??= []).push({ key: 'car31studio', label: l('Gravado no seu estúdio', 'Recorded at your studio'), value: 1 + k, confidence: 'medium' });
      x.n -= 1;
      if (x.n <= 0) delete mx(s).sb[rel.owner];
      if (car31On(s, 'trend')) sigRec(s, rel);
    }
  }
  // o seu próprio selo gravando no seu estúdio também leva a assinatura
  if (car31On(s, 'trend') && mine(a) && vlist(s).some((v) => v.kind === 'studio')) sigRec(s, rel);
  // editora: canção colocada com o artista entra neste disco
  const pi = st.pl.findIndex((p) => p.act === rel.actId && p.u >= s.week);
  if (pi >= 0 && a) {
    const p = mx(s).pl.splice(pi, 1)[0];
    rel.appeal *= 1 + p.k;
    (rel.autopsy ??= []).push({ key: 'car31pub', label: fmtL(l('Canção da sua editora: "{t}"', 'Your publisher\'s song: "{t}"'), { t: p.t }), value: 1 + p.k, confidence: 'medium' });
    mx(s).pr[rel.id] = { vid: p.vid, u: s.week + 52, paid: 0 };
    emitFact(s, { kind: 'cover_recorded', actors: ['player', a.id], place: a.city, severity: 25, tags: ['car31', 'publisher'], src: 'car31',
      text: fmtL(l('{a} grava "{t}", da sua editora, no disco "{r}".', '{a} records "{t}", from your publisher, on "{r}".'), { a: a.name, t: p.t, r: rel.title }), diary: true });
  }
});

function studioPubMonth(s: GameState): void {
  const st = mx(s);
  for (const v of vlist(s)) {
    if (v.kind === 'studio') for (const b of v.booked ?? []) {
      if (s.labels[b.lab]?.active) st.sb[b.lab] = { n: (st.sb[b.lab]?.u ?? 0) >= s.week ? Math.min(6, st.sb[b.lab].n + b.n) : b.n, q: studioQ31(v), u: s.week + 13, vid: v.id };
    }
    if (v.kind === 'publisher') for (const c of v.cat ?? []) {
      const key = `${v.id}:${c.title}:${c.actId}:${c.y}`;
      if (st.seen[key] || c.y < s.year - 1 || !s.acts[c.actId]) continue;
      st.seen[key] = 1;
      st.pl.push({ act: c.actId, vid: v.id, t: c.title, u: s.week + 39, k: clamp(0.06 + (c.v ?? 0) / 4000, 0.06, 0.15) });
    }
  }
  for (const k of Object.keys(st.sb)) if (st.sb[k].u < s.week) delete st.sb[k];
  st.pl = st.pl.filter((p) => p.u >= s.week).slice(-40);
  const keys = Object.keys(st.seen);
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete st.seen[k];
  // edição pelas vendas reais do disco com a canção da casa
  for (const [relId, p] of Object.entries(st.pr)) {
    const rel = s.releases[relId], v = vlist(s).find((x) => x.id === p.vid);
    if (!rel || !v || p.u < s.week) { delete st.pr[relId]; continue; }
    const u = rel.weekly.slice(-4).reduce((t, x) => t + x, 0);
    const amt = Math.round(u * money(s, 0.03));
    if (amt > 0) { vpay(s, v.owner, amt, `pub31:${relId}:${s.year}:${s.month}`, `Edição de "${rel.title}"`, v); p.paid += amt; }
  }
}

// ---------------------------------------------------------------- assinatura do estúdio → moda do gênero (car31.trend)

/** teto do empurrão por estilo: por mês e por ano */
export const TREND_M31 = 0.04, TREND_Y31 = 0.25;
function sigRec(s: GameState, rel: Release): void {
  const g = styleOfRel17(s, rel.id);
  if (!g) return;
  const st = mx(s);
  (st.ss ??= []).push({ rel: rel.id, g, w: s.week });
  if (st.ss.length > 60) st.ss.splice(0, st.ss.length - 60);
}
/** Quanto os discos da assinatura empurram cada estilo neste mês (pela posição nas paradas; com os tetos). Puro. */
export function trendPush31(s: GameState): Record<string, number> {
  const st = moreRo31(s), out: Record<string, number> = {};
  const recent = new Map((st.ss ?? []).filter((x) => s.week - x.w <= 26).map((x) => [x.rel, x.g]));
  if (!recent.size) return out;
  for (const e of s.charts.singles.slice(0, 40).concat(s.charts.albums.slice(0, 40))) {
    const g = recent.get(e.releaseId);
    if (g) out[g] = (out[g] ?? 0) + 0.012 * ((41 - Math.min(40, e.pos)) / 40);
  }
  for (const g of Object.keys(out)) {
    const used = st.tl?.[g]?.y === s.year ? st.tl[g].v : 0;
    out[g] = Math.max(0, Math.min(TREND_M31, out[g], TREND_Y31 - used));
    if (!out[g]) delete out[g];
  }
  return out;
}
function trendMonth(s: GameState): void {
  const st = mx(s);
  st.ss = (st.ss ?? []).filter((x) => s.week - x.w <= 26 && s.releases[x.rel]);
  for (const [g, d] of Object.entries(trendPush31(s))) {
    const got = pushTrend17(s, g, d);
    const tl = ((st.tl ??= {})[g] = st.tl[g]?.y === s.year ? st.tl[g] : { y: s.year, v: 0 });
    tl.v = Math.round((tl.v + got) * 1000) / 1000;
    if (tl.v >= 0.1 && !tl.told) {
      tl.told = 1;
      emitFact(s, { kind: 'studio_trend', actors: ['player'], severity: 35, tags: ['car31', 'studio', 'trend', g], src: 'car31',
        text: fmtL(l('O som do seu estúdio vira moda: os discos gravados lá puxam o {g} nas paradas.', 'Your studio\'s sound becomes the fashion: records cut there pull {g} up the charts.'), { g: g.replace(/_/g, ' ') }),
        notify: { kind: 'good', cat: 'business' }, diary: true });
    }
  }
}

// ---------------------------------------------------------------- agenciamento: mercado-alvo

export function setTarget31(s: GameState, actId: string, a3: string | undefined): L | null {
  const ok = vlist(s).some((v) => v.kind === 'booking' && (v.clients ?? []).some((c) => c.actId === actId));
  if (!ok) return l('Esse artista não é cliente da sua agência.', 'That act is not your agency\'s client.');
  const st = mx(s);
  if (!a3) delete st.tgt[actId]; else st.tgt[actId] = a3;
  return null;
}
export const targetOf31 = (s: GameState, a: Act): string => moreRo31(s).tgt[a.id] ?? countryOfCity(a.city) ?? home(s);
ROUTE31.f = (s, v, a) => {
  if (!car31On(s, 'route')) return;
  if (!mine(a) && !car31On(s, 'others')) return;
  const a3 = targetOf31(s, a);
  const cities = CITIES.filter((c) => countryOfCity(c.id) === a3).map((c) => c.id).sort();
  if (!cities.length) return;
  const r = Rng.fromSeed(`${s.config.seed}|car31|route|${a.id}|${s.week}`);
  const n = Math.min(cities.length, 2 + Math.min(3, v.level));
  const pick: string[] = [];
  const pool = [...cities];
  while (pick.length < n && pool.length) pick.push(pool.splice(r.int(0, pool.length - 1), 1)[0]);
  for (const c of pick) s.flags[`played:${a.id}:${c}`] = s.week;
  const local = fameIn(s, a, a3);
  if (local < 20) vpay(s, v.owner, -money(s, 1500 * pick.length), `route31:${a.id}:${s.week}`, `Abrir mercado: turnê de ${a.name}`, v);
  note(mx(s), s.week, fmtL(l('Turnê de {a} por {n} cidade(s) do mercado-alvo.', '{a}\'s tour through {n} target-market city(ies).'), { a: a.name, n: pick.length }));
};

/** car31.agency: a turnê agenciada vira datas no motor de rotas (tour12) — as cidades do mercado-alvo com mais público,
 *  em semanas seguidas, casa livre e porte pela força local; o motor paga comissão, lota ou esvazia e marca o show. */
export function agencyStops31(s: GameState, v: Venture, a: Act): Stop[] {
  const a3 = targetOf31(s, a);
  const ranked = CITIES.filter((c) => countryOfCity(c.id) === a3).map((c) => [c.id, baseDraw(s, a, c.id)] as const).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const n = Math.min(ranked.length, 2 + Math.min(3, v.level));
  const stops: Stop[] = [];
  let w = s.week + 3;
  for (const [city] of ranked) {
    if (stops.length >= n) break;
    for (let k = 0; k < 3; k++) {
      const st = defaultStop(s, a, city, w + k);
      if (!validate(s, 'agent', a.id, [...stops, st]).reasons.flat().length) { stops.push(st); w = st.week + 1; break; }
    }
  }
  return stops;
}
ROUTE31.book = (s, v, a) => {
  if (!car31On(s, 'agency')) return null;
  if (!mine(a) && !car31On(s, 'others')) return null;
  if (!clientsOf(s).some((x) => x.id === a.id)) return null; // só a primeira agência fala com o motor de rotas
  const stops = agencyStops31(s, v, a);
  if (!stops.length) return { ok: false, text: fmtL(l('Nenhuma casa livre para {a} no mercado-alvo nas próximas semanas.', 'No free venue for {a} in the target market in the coming weeks.'), { a: a.name }) };
  const r = bookRoute(s, Rng.fromSeed(`${s.config.seed}|car31|agency|${a.id}|${s.week}`), 'agent', a.id, stops);
  if (!r.ok) return { ok: false, text: r.text[0] ?? l('Rota recusada.', 'Route refused.') };
  note(mx(s), s.week, fmtL(l('Turnê de {a}: {n} data(s) marcadas no mercado-alvo.', '{a}\'s tour: {n} date(s) booked in the target market.'), { a: a.name, n: stops.length }));
  return { ok: true, text: fmtL(l('Turnê de {a} marcada: {n} datas em {c}. O resultado sai show a show.', '{a}\'s tour booked: {n} dates in {c}. Results come show by show.'), { a: a.name, n: stops.length, c: countryName(targetOf31(s, a)) }) };
};

// ---------------------------------------------------------------- empresário: pedidos reais

export type Ask31k = 'radio' | 'festival' | 'push' | 'tv' | 'mag' | 'playlist' | 'venue' | 'sync' | 'agency';
/** os três primeiros vêm da primeira rodada (car31.manager); os outros são de car31.asks */
export const ASKS_BASE31: Ask31k[] = ['radio', 'festival', 'push'];
export const ASKS_MORE31: Ask31k[] = ['tv', 'mag', 'playlist', 'venue', 'sync', 'agency'];
export const ASK31: Record<Ask31k, { name: L; desc: L }> = {
  radio: { name: l('Pedir execução nas rádios', 'Ask radio for airplay'), desc: l('As rádios do país do cliente aceitam ou não tocar o disco atual (8 semanas).', 'Stations in the client\'s country accept or not to play the current record (8 weeks).') },
  festival: { name: l('Pedir vaga num festival', 'Ask for a festival slot'), desc: l('Um festival grande do país aceita ou não escalar o cliente (fama no país por meio ano).', 'A big festival in the country accepts or not to book the client (fame there for half a year).') },
  push: { name: l('Cobrar divulgação do selo', 'Press the label to promote'), desc: l('O selo do cliente aceita ou não divulgar o disco atual; cobrar demais queima a relação.', 'The client\'s label accepts or not to promote the current record; pushing too hard burns the relationship.') },
  tv: { name: l('Pedir espaço na TV', 'Ask for a TV spot'), desc: l('Um programa do país apresenta o cliente (seis semanas). Na era dos clipes, sem clipe é difícil.', 'A show in the country features the client (six weeks). In the video era, no video makes it hard.') },
  mag: { name: l('Pedir matéria a revista ou crítico', 'Ask a magazine or critic for a feature'), desc: l('A redação só topa se o disco for bom (oito semanas no país).', 'The newsroom only agrees if the record is good (eight weeks in the country).') },
  playlist: { name: l('Pedir vaga em playlist de plataforma', 'Ask for a platform playlist slot'), desc: l('O curador da plataforma põe ou não a faixa numa lista grande (seis semanas).', 'The platform curator puts the track on a big list or not (six weeks).') },
  venue: { name: l('Pedir data numa casa de shows', 'Ask a venue for a date'), desc: l('Uma casa grande da maior cidade do país marca o cliente (fama na cidade por três meses).', 'A big venue in the country\'s largest city books the client (fame there for three months).') },
  sync: { name: l('Pedir canção em trilha (editora)', 'Ask for a song in a film (publisher)'), desc: l('A editora oferece a canção a um filme ou série; o supervisor musical escolhe (oito semanas).', 'The publisher pitches the song to a film or series; the music supervisor decides (eight weeks).') },
  agency: { name: l('Pedir turnê a uma agência', 'Ask an agency for a tour'), desc: l('Uma agência marca datas em duas cidades do país (fama no país por três meses).', 'An agency books dates in two cities of the country (fame there for three months).') },
};
export const ASK_COOL31 = 13;
const mgSat = (s: GameState, id: string): number => ((s as unknown as { x4?: { ventures9?: { mg?: { clients?: { actId: string; sat: number }[] } } } }).x4?.ventures9?.mg?.clients ?? []).find((x) => x.actId === id)?.sat ?? 50;
const hasVid = (s: GameState, relId?: string): boolean => !!relId && !!(s as unknown as { x4?: { media18?: { vids?: Record<string, { banned?: number }> } } }).x4?.media18?.vids?.[relId] && !(s as unknown as { x4: { media18: { vids: Record<string, { banned?: number }> } } }).x4.media18.vids[relId].banned;
export function askOdds31(s: GameState, a: Act, k: Ask31k): number {
  const sat = mgSat(s, a.id);
  const lb = s.labels[a.owner ?? ''];
  const rel = lb?.leaderId ? opinionOf(s, `l:${lb.leaderId}`) : 0;
  const r = latestLive(s, a.id), q = r?.q ?? 50;
  if (k === 'radio') return clamp(0.25 + a.fame / 200 + sat / 300, 0.05, 0.9);
  if (k === 'festival') return clamp(0.2 + a.fame / 150, 0.05, 0.9);
  if (k === 'push') return clamp(0.3 + sat / 250 + rel / 400, 0.05, 0.9);
  if (k === 'tv') return clamp(0.15 + a.fame / 180 + (q - 50) / 300 + (hasTech(s, 'clipnet') ? (hasVid(s, r?.id) ? 0.2 : -0.1) : 0), 0.05, 0.85);
  if (k === 'mag') return clamp(0.15 + (q - 40) / 120 + a.fame / 400, 0.05, 0.85);
  if (k === 'playlist') return clamp(0.2 + (q - 50) / 200 + a.fame / 250 + (lb && (lb.family === 'A' || lb.roster.length >= 8) ? 0.1 : 0), 0.05, 0.85);
  if (k === 'venue') return clamp(0.35 + a.fame / 200 + sat / 400, 0.05, 0.9);
  if (k === 'sync') return clamp(0.12 + (q - 50) / 250 + a.fame / 300, 0.05, 0.75);
  return clamp(0.2 + a.fame / 150 + sat / 400, 0.05, 0.85);
}
/** O motivo da recusa: o fator mais fraco do pedido (não é sorteio). */
export function askWhy31(s: GameState, a: Act, k: Ask31k): L {
  const r = latestLive(s, a.id), q = r?.q ?? 50, lb = s.labels[a.owner ?? ''];
  switch (k) {
    case 'radio': return l('As rádios recusam: "não é para o nosso público agora".', 'Stations refuse: "not for our audience right now".');
    case 'festival': return l('O festival recusa: line-up fechado.', 'The festival refuses: the line-up is closed.');
    case 'push': return fmtL(l('{b} recusa: "a agenda do selo é outra".', '{b} refuses: "the label has other plans".'), { b: lb?.name ?? '?' });
    case 'tv': return hasTech(s, 'clipnet') && !hasVid(s, r?.id) ? l('A TV recusa: sem clipe, não entra na grade.', 'TV refuses: no video, no slot.') : a.fame < 30 ? fmtL(l('A produção do programa não conhece {a}.', 'The show\'s producers have never heard of {a}.'), { a: a.name }) : l('O programa recusa: a pauta já está fechada.', 'The show refuses: the rundown is already set.');
    case 'mag': return q < 55 ? l('A redação ouviu e não gostou do disco.', 'The newsroom listened and did not like the record.') : l('A revista recusa: a capa do mês já tem dono.', 'The magazine refuses: this month\'s cover is taken.');
    case 'playlist': return a.fame < 30 ? l('O curador nunca ouviu falar do artista.', 'The curator has never heard of the act.') : l('Os números de escuta não convenceram o algoritmo.', 'The listening numbers did not convince the algorithm.');
    case 'venue': return a.fame < 15 ? l('A casa não arrisca um nome sem público.', 'The venue won\'t risk a name with no crowd.') : l('A casa recusa: agenda cheia.', 'The venue refuses: the calendar is full.');
    case 'sync': return q < 50 ? l('O supervisor musical achou a canção fraca para a cena.', 'The music supervisor found the song too weak for the scene.') : l('O supervisor musical escolheu outra canção.', 'The music supervisor picked another song.');
    default: return a.fame < 20 ? l('A agência não vê público para uma turnê.', 'The agency sees no crowd for a tour.') : l('A agência recusa: o elenco está cheio.', 'The agency refuses: its roster is full.');
  }
}
export function askLock31(s: GameState, actId: string, k: Ask31k): L | null {
  if (!car31On(s, 'manager')) return l('Desligado nas regras desta partida.', 'Turned off in this game\'s rules.');
  if (ASKS_MORE31.includes(k) && !car31On(s, 'asks')) return l('Desligado nas regras desta partida.', 'Turned off in this game\'s rules.');
  const isClient = ((s as unknown as { x4?: { ventures9?: { mg?: { clients?: { actId: string }[] } } } }).x4?.ventures9?.mg?.clients ?? []).some((x) => x.actId === actId);
  if (!isClient) return l('Só para clientes do seu empresariamento.', 'Only for your management clients.');
  const w = moreRo31(s).rq[`${actId}:${k}`];
  if (w !== undefined && s.week - w < ASK_COOL31) return fmtL(l('Pedido feito há pouco: espere {n} semana(s).', 'Asked recently: wait {n} week(s).'), { n: ASK_COOL31 - (s.week - w) });
  if (k !== 'festival' && k !== 'venue' && k !== 'agency' && !latestLive(s, actId)) return l('O cliente não tem disco em circulação.', 'The client has no record in circulation.');
  if (k === 'push' && !s.labels[s.acts[actId]?.owner ?? '']) return l('O cliente não tem selo.', 'The client has no label.');
  if (k === 'tv' && !hasTech(s, 'tv_music')) return l('Ainda não há TV musical.', 'There is no music TV yet.');
  if (k === 'playlist' && !hasTech(s, 'streaming')) return l('Ainda não há plataformas de streaming.', 'There are no streaming platforms yet.');
  if (k === 'sync' && s.year < 1930) return l('O cinema ainda não tem trilha sonora gravada.', 'Films have no recorded soundtracks yet.');
  return null;
}
const citiesIn = (a3: string): string[] => CITIES.filter((c) => countryOfCity(c.id) === a3).map((c) => c.id);
export function askFor31(s: GameState, actId: string, k: Ask31k): { ok: boolean; text: L } {
  const lock = askLock31(s, actId, k);
  const a = s.acts[actId];
  if (lock || !a) return { ok: false, text: lock ?? l('Inválido.', 'Invalid.') };
  mx(s).rq[`${actId}:${k}`] = s.week;
  const r = Rng.fromSeed(`${s.config.seed}|car31|ask|${actId}|${k}|${s.week}`);
  const yes = r.chance(askOdds31(s, a, k));
  const a3 = countryOfCity(a.city) ?? home(s);
  const lb = s.labels[a.owner ?? ''];
  const rel = latestLive(s, actId);
  let text: L;
  if (yes) {
    if (k === 'radio') { boost31(s, { rel: rel!.id, act: actId, a3, w: 0.3, u: s.week + 8, src: 'manager', by: 'mg' }); text = fmtL(l('As rádios topam: "{t}" entra na programação por dois meses.', 'Stations agree: "{t}" goes on air for two months.'), { t: rel!.title }); }
    else if (k === 'festival') {
      const city = citiesIn(a3).sort()[0] ?? a.city;
      s.flags[`played:${actId}:${city}`] = s.week;
      boost31(s, { act: actId, a3, w: 0.4, u: s.week + 26, src: 'manager', by: 'mg' });
      text = fmtL(l('Um festival do país escala {a}.', 'A festival in the country books {a}.'), { a: a.name });
    } else if (k === 'push') {
      boost31(s, { rel: rel!.id, act: actId, a3, w: 0.25, u: s.week + 6, src: 'manager', by: 'mg' });
      if (lb?.leaderId) opine(s, `l:${lb.leaderId}`, -1, l('o empresário cobrou divulgação', 'the manager pushed for promotion'));
      text = fmtL(l('{b} aceita divulgar "{t}".', '{b} agrees to promote "{t}".'), { b: lb?.name ?? '?', t: rel!.title });
    } else if (k === 'tv') {
      boost31(s, { rel: rel!.id, act: actId, a3, w: 0.35, u: s.week + 6, src: 'tv', by: 'mg' });
      text = fmtL(l('Um programa de TV apresenta {a} com "{t}".', 'A TV show features {a} with "{t}".'), { a: a.name, t: rel!.title });
    } else if (k === 'mag') {
      boost31(s, { rel: rel!.id, act: actId, a3, w: 0.2, u: s.week + 8, src: 'magazine', by: 'mg' });
      text = fmtL(l('Uma revista publica matéria sobre "{t}".', 'A magazine runs a feature on "{t}".'), { t: rel!.title });
    } else if (k === 'playlist') {
      boost31(s, { rel: rel!.id, act: actId, a3, w: 0.3, u: s.week + 6, src: 'platform', by: 'mg' });
      text = fmtL(l('"{t}" entra numa playlist grande de plataforma.', '"{t}" lands on a big platform playlist.'), { t: rel!.title });
    } else if (k === 'venue') {
      const city = citiesIn(a3)[0] ?? a.city;
      s.flags[`played:${actId}:${city}`] = s.week;
      boost31(s, { act: actId, a3, w: 0.25, u: s.week + 13, src: 'venue', by: 'mg' });
      text = fmtL(l('Uma casa grande marca {a}.', 'A big venue books {a}.'), { a: a.name });
    } else if (k === 'sync') {
      for (const c of new Set(['USA', a3])) boost31(s, { rel: rel!.id, act: actId, a3: c, w: 0.3, u: s.week + 8, src: 'screen', by: 'mg' });
      text = fmtL(l('"{t}" entra na trilha de uma série.', '"{t}" makes it onto a series soundtrack.'), { t: rel!.title });
    } else {
      for (const c of citiesIn(a3).slice(0, 2)) s.flags[`played:${actId}:${c}`] = s.week;
      boost31(s, { act: actId, a3, w: 0.3, u: s.week + 13, src: 'route', by: 'mg' });
      text = fmtL(l('Uma agência leva {a} para a estrada.', 'An agency takes {a} on the road.'), { a: a.name });
    }
  } else {
    if (k === 'push' && lb?.leaderId) opine(s, `l:${lb.leaderId}`, -3, l('o empresário cobrou demais', 'the manager pushed too hard'));
    text = askWhy31(s, a, k);
  }
  emitFact(s, { kind: yes ? 'manager_ask_ok' : 'manager_ask_no', actors: ['player', actId], place: a.city, severity: 20, tags: ['car31', 'manager', k], src: 'car31', text: fmtL(l('{a}: {t}', '{a}: {t}'), { a: a.name, t: text }), diary: true });
  touch31(s);
  return { ok: yes, text };
}

// ---------------------------------------------------------------- crítico e trilhas

interface Rev { rel: string; sc: number; w: number; y: number }
const pressRo = (s: GameState): { cred: number; reach: number; revs: Rev[] } | undefined => (s as unknown as { x4?: { press18?: { cred: number; reach: number; revs: Rev[] } } }).x4?.press18;
const criticOn = (s: GameState): boolean => ((s as unknown as { x4?: { careers12?: { active?: string[] } } }).x4?.careers12?.active ?? []).includes('critic');
/** peso de uma resenha sua no país do veículo (nota 0–100; só a partir de 60 empurra) */
export const reviewW31 = (cred: number, sc: number): number => (sc > 60 ? 0.15 * (cred / 100) * ((sc - 60) / 40) : 0);
/** Um veículo onde a sua resenha sai: país, nome e quanto pesa lá (1 = casa). */
export interface Veh31 { a3: string; name: string; k: number; home?: 1 }
/** quantos países estrangeiros publicam você (sindicação), pelo alcance */
export const synSlots31 = (reach: number): number => (reach >= 80 ? 3 : reach >= 55 ? 2 : reach >= 30 ? 1 : 0);
const langOf = (a3: string): string[] => countryInfoByA3[a3]?.lang ?? [];
/** Países candidatos à sindicação: mesma língua da sede primeiro, depois os maiores mercados. Puro. */
export function synCands31(s: GameState): string[] {
  const h = home(s), hl = langOf(h);
  return COUNTRY_INFO.filter((c) => c.a3 !== h).map((c) => ({ a3: c.a3, k: countryMarketSize(c, s.year) * (c.lang?.some((x) => hl.includes(x)) ? 3 : 1) }))
    .sort((a, b) => b.k - a.k || (a.a3 < b.a3 ? -1 : 1)).map((x) => x.a3);
}
const vehName = (s: GameState, a3: string): string => {
  const o = pickOutlet(outletsIn(s.year), `${s.config.seed}|car31|veh|${a3}`, ['serious', 'underground', 'mainstream'], countryInfoByA3[a3]?.market);
  return o?.name ?? a3;
};
/** Os veículos da sua crítica (car31.outlets): a casa (sede ou veículo próprio) e a sindicação pelo alcance — você pode
 *  escolher os países; sem escolha, os de mesma língua e maiores mercados. Puro (a interface lê o mesmo). */
export function vehicles31(s: GameState): Veh31[] {
  const p = pressRo(s), h = home(s);
  const out: Veh31[] = [{ a3: h, name: (p as { out?: { name: string } } | undefined)?.out?.name ?? vehName(s, h), k: 1, home: 1 }];
  if (!p || !car31On(s, 'outlets')) return out;
  const n = synSlots31(p.reach);
  const pick = (moreRo31(s).syn ?? []).filter((x) => x !== h && countryInfoByA3[x]);
  const list = [...pick, ...synCands31(s).filter((x) => !pick.includes(x))].slice(0, n);
  for (const a3 of list) out.push({ a3, name: vehName(s, a3), k: Math.round(0.5 * (0.6 + p.reach / 250) * 1000) / 1000 });
  return out;
}
export function setSyn31(s: GameState, a3s: string[]): L | null {
  const ok = a3s.filter((x) => countryInfoByA3[x] && x !== home(s));
  if (ok.length !== a3s.length) return l('País inválido para sindicação.', 'Invalid country for syndication.');
  mx(s).syn = [...new Set(ok)].slice(0, 3);
  touch31(s);
  return null;
}
registerExec31('critic', (s, out) => {
  if (!car31On(s, 'press') || !criticOn(s)) return;
  const p = pressRo(s);
  if (!p) return;
  const vs = vehicles31(s);
  for (const r of p.revs) {
    if (s.week - r.w > 12) continue;
    const rel = s.releases[r.rel];
    if (rel) for (const v of vs) exec31(s, out, { rel: rel.id, act: rel.actId, a3: v.a3, w: reviewW31(p.cred, r.sc) * v.k, src: 'critic', by: 'critic' });
  }
});
export function setYearList31(s: GameState, relIds: string[]): void { mx(s).yl = relIds.filter((id) => s.releases[id]).slice(0, 10); }
export function yearList31(s: GameState): string[] {
  const st = moreRo31(s);
  if (st.yl.length) return st.yl.filter((id) => s.releases[id]);
  const p = pressRo(s);
  return (p?.revs ?? []).filter((r) => r.y === s.year).sort((a, b) => b.sc - a.sc || (a.rel < b.rel ? -1 : 1)).slice(0, 10).map((r) => r.rel);
}
function criticMonth(s: GameState): void {
  if (s.month !== 11 || !criticOn(s)) return;
  const p = pressRo(s);
  const list = yearList31(s);
  if (!p || !list.length) return;
  const vs = vehicles31(s);
  for (const id of list) { const rel = s.releases[id]; if (rel) for (const v of vs) boost31(s, { rel: rel.id, act: rel.actId, a3: v.a3, w: 0.2 * (p.cred / 100) * v.k, u: s.week + 9, src: 'critic', by: 'yl' }); }
  mx(s).yl = [];
  emitFact(s, { kind: 'critic_list', actors: ['player'], severity: 30, tags: ['car31', 'critic'], src: 'car31',
    text: fmtL(l('Sua lista dos melhores do ano sai: {n} discos voltam a ser procurados em janeiro.', 'Your best-of-the-year list is out: {n} records are in demand again in January.'), { n: list.length }), diary: true });
}
SCREEN31.prem = (s, c, act) => {
  if (!car31On(s, 'press') || !act || !(c.box && c.box > 0.1)) return;
  if (!mine(act) && !car31On(s, 'others')) return;
  const rel = latestLive(s, act.id);
  for (const a3 of new Set(['USA', home(s)])) boost31(s, { rel: rel?.id, act: act.id, a3, w: 0.35 * Math.min(1.5, c.box), u: s.week + 8, src: 'screen', by: c.id });
};

registerSimHook('month', 'car31more', (s) => {
  if (car31On(s, 'studio')) studioPubMonth(s);
  if (car31On(s, 'trend')) trendMonth(s);
  if (car31On(s, 'press')) criticMonth(s);
});

registerEditable({
  id: 'car31.more.target', area: 'careers', target: 'act', label: l('Mercado-alvo do cliente da agência (código do país)', 'Agency client\'s target market (country code)'), kind: 'text', raw: true,
  get: (s, id) => (id ? moreRo31(s).tgt[id] ?? '' : ''),
  set: (s, v, id) => { if (!id) return l('Escolha o artista.', 'Pick the act.'); const e = setTarget31(s, id, String(v || '') || undefined); if (e) return e; },
});
registerEditable({
  id: 'car31.more.syn', area: 'careers', label: l('Países da sindicação das suas resenhas (códigos separados por vírgula)', 'Countries syndicating your reviews (codes separated by commas)'), kind: 'text', raw: true,
  get: (s) => (moreRo31(s).syn ?? []).join(','),
  set: (s, v) => { const e = setSyn31(s, String(v || '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)); if (e) return e; },
});
registerRunnable({
  id: 'car31.more.trend', area: 'careers', label: l('Ver quanto a assinatura do estúdio empurra a moda neste mês (sem efeito)', 'See how much the studio signature pushes the trend this month (no effect)'),
  run: (s) => { const xs = Object.entries(trendPush31(s)); return xs.length ? l(xs.map(([g, d]) => `${g.replace(/_/g, ' ')} +${Math.round(d * 1000) / 10}`).join(' · '), xs.map(([g, d]) => `${g.replace(/_/g, ' ')} +${Math.round(d * 1000) / 10}`).join(' · ')) : l('Nenhum disco da assinatura nas paradas.', 'No signature record on the charts.'); },
});
registerRunnable({
  id: 'car31.more.list', area: 'careers', label: l('Ver a lista do ano do crítico (sem efeito)', 'See the critic\'s year list (no effect)'),
  run: (s) => { const xs = yearList31(s).map((id) => s.releases[id]?.title ?? '?'); return xs.length ? l(xs.join(' · '), xs.join(' · ')) : l('Nenhuma resenha neste ano.', 'No reviews this year.'); },
});

