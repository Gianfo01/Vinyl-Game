// Jabá (DJs, programadores, promotores independentes e curadores de playlist), metodologia das
// paradas por era, manipulação de paradas com risco e paradas extras (rádio, vendas, vídeo,
// latina, country, dance, fim de ano e todos os tempos).

import { clamp, type Rng } from '../../../core/rng';
import { familyOf, l, type L } from '../../../data/world';
import { queueCutscene, registerMod } from '../../ext4';
import { physicalShare } from '../../production';
import type { GameState, Release } from '../../types';
import { fmtL, hasTech, money, notify, post, remember } from '../../util';
import { mineRel, rep } from './common';
import { DISCO, milestoneById } from './milestones';
import { w4 } from './state';

// ======================================================================= jabá

export type PayolaEra = 'legal' | 'illegal' | 'indie' | 'curator';

export function payolaEra(s: GameState): PayolaEra {
  if (hasTech(s, 'streaming') && s.year >= 2012) return 'curator';
  if (s.year < 1960) return 'legal';
  if (s.year >= 1980 && s.year < 2005) return 'indie';
  return 'illegal';
}

export const PAYOLA_ERA_INFO: Record<PayolaEra, { name: L; desc: L; cost: number; heat: number }> = {
  legal: { name: l('Jabá tolerado', 'Tolerated payola'), desc: l('Presentes e envelopes para DJs são comuns e pouco fiscalizados.', 'Gifts and envelopes for DJs are common and barely policed.'), cost: 1, heat: 0.5 },
  illegal: { name: l('Jabá ilegal', 'Illegal payola'), desc: l('Depois das audiências, pagar para tocar é crime. Funciona — e o risco cresce a cada envelope.', 'After the hearings, pay-for-play is a crime. It works — and the risk grows with every envelope.'), cost: 1, heat: 1.6 },
  indie: { name: l('Promotores independentes', 'Independent promoters'), desc: l('O dinheiro passa por "consultores" que cuidam das rádios. Mais caro, menos rastreável.', 'Money goes through "consultants" who handle the stations. Pricier, harder to trace.'), cost: 1.6, heat: 0.7 },
  curator: { name: l('Curadores de playlist', 'Playlist curators'), desc: l('Os novos DJs são curadores de playlists. Pagar por inclusão viola as regras das plataformas.', 'The new DJs are playlist curators. Paying for placement breaks platform rules.'), cost: 1.2, heat: 1.2 },
};

export const PAYOLA_TIERS: { real: number; level: number; heat: number; name: L }[] = [
  { real: 1500, level: 0.06, heat: 4, name: l('Discos e jantares', 'Records and dinners') },
  { real: 5000, level: 0.14, heat: 10, name: l('Envelope no estúdio', 'Envelope at the station') },
  { real: 15000, level: 0.28, heat: 22, name: l('Pacote nacional', 'Nationwide package') },
];

export function payolaCost(s: GameState, tier: number): number {
  return money(s, PAYOLA_TIERS[tier].real * PAYOLA_ERA_INFO[payolaEra(s)].cost);
}

/** Pagar DJs/programadores/curadores. Uma vez por semana. */
export function payDJs(s: GameState, tier: number): L | null {
  const w = w4(s);
  const t = PAYOLA_TIERS[tier];
  if (!t) return l('Inválido.', 'Invalid.');
  if (!hasTech(s, 'radio')) return l('Ainda não há rádio.', 'There is no radio yet.');
  if (w.payola.lastWeek === s.week) return l('Já houve pagamento nesta semana.', 'Already paid this week.');
  const cost = payolaCost(s, tier);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4payola:${tier}`, -cost, 'w4_payola', 'Divulgação (?)');
  const era = payolaEra(s);
  w.payola.level = clamp(w.payola.level + t.level, 0, 0.45);
  w.payola.heat = clamp(w.payola.heat + t.heat * PAYOLA_ERA_INFO[era].heat, 0, 100);
  if (era === 'curator') w.payola.curator = clamp(w.payola.curator + 4 + tier * 3, 0, 100);
  else w.payola.dj = clamp(w.payola.dj + 4 + tier * 3, 0, 100);
  w.payola.spent += cost;
  w.payola.lastWeek = s.week;
  return null;
}

/** Relação legítima: visitas, cópias promocionais, apresentação de repertório. */
export function pitchLegit(s: GameState): L | null {
  const w = w4(s);
  if (w.payola.pitchWeek === s.week) return l('Você já visitou as rádios nesta semana.', 'You already visited the stations this week.');
  const cost = money(s, 500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'w4pitch', -cost, 'marketing', 'Visita a rádios e curadores');
  if (payolaEra(s) === 'curator') w.payola.curator = clamp(w.payola.curator + 5, 0, 100);
  else w.payola.dj = clamp(w.payola.dj + 5, 0, 100);
  w.payola.pitchWeek = s.week;
  return null;
}

function investigation(s: GameState, grand: boolean): void {
  const w = w4(s);
  const heat = Math.max(w.payola.heat, grand ? 20 : 0);
  const fine = money(s, 2000 + heat * 260);
  post(s, `w4payolafine:${grand ? 'g' : 'n'}`, -fine, 'w4_legal', 'Multa por jabá');
  rep(s, 'institutional', -Math.round(4 + heat / 5));
  rep(s, 'commercial', -2);
  w.payola.level = 0;
  w.payola.dj = Math.max(0, w.payola.dj - 25);
  w.payola.curator = Math.max(0, w.payola.curator - 15);
  w.payola.heat = Math.round(heat * 0.3);
  w.payola.caught += 1;
  const text = grand
    ? l('A grande investigação do jabá chega ao selo: DJs depõem e a multa sai pesada.', 'The great payola investigation reaches the label: DJs testify and the fine is heavy.')
    : l('Investigação de jabá: um programador denunciou os pagamentos do selo.', 'Payola probe: a programmer exposed the label\'s payments.');
  remember(s, 'payola', text, { important: true });
  notify(s, text, 'bad');
  queueCutscene(s, 'w4_probe', { title: l('Investigação de jabá', 'Payola investigation'), text, fine });
}

milestoneById.payola59.onFire = (s) => {
  const w = w4(s);
  if (w.payola.spent > 0 && w.payola.heat > 2) investigation(s, true);
  for (const lb of Object.values(s.labels)) if (lb.active && lb.family === 'A') lb.reputation = clamp(lb.reputation - 5, 0, 100);
};

export function payolaMonth(s: GameState, r: Rng): void {
  const w = w4(s);
  const p = w.payola;
  p.level *= 0.6;
  if (p.level < 0.01) p.level = 0;
  p.heat = Math.max(0, p.heat - 1.5);
  p.dj += (15 - p.dj) * 0.03;
  p.curator += (10 - p.curator) * 0.03;
  const era = payolaEra(s);
  const chance = era === 'legal' ? p.heat / 900 : p.heat / 260;
  if (p.heat > 5 && r.chance(chance)) investigation(s, false);
}

const hasChannel = (rel: Release, ch: string) => rel.marketing.some((m) => m.channel === ch);

// relação com rádios/curadores entra no apelo de estreia
registerMod('appeal', 'w4relation', (s, value, ctx) => {
  if (!ctx.release || !mineRel(s, ctx.release) || !hasTech(s, 'radio')) return null;
  const p = w4(s).payola;
  const curator = payolaEra(s) === 'curator';
  const rel = curator ? p.curator : p.dj;
  const k = clamp(1 + rel / 600 + (hasChannel(ctx.release, curator ? 'playlists' : 'radio_plug') ? rel / 400 : 0), 1, 1.35);
  return { value: value * k, label: curator ? l('Relação com curadores', 'Curator relationships') : l('Relação com DJs e programadores', 'DJ and programmer relationships') };
});

// jabá ativo empurra os lançamentos recentes do jogador nas paradas
registerMod('chartUnits', 'w4payola', (s, value, ctx) => {
  const rel = ctx.release;
  const lv = w4(s).payola.level;
  if (!rel || lv <= 0 || !mineRel(s, rel) || s.week - rel.week > 16) return null;
  return { value: value * (1 + lv), label: l('Jabá', 'Payola') };
});

// ======================================================================= metodologia

export type ChartMethod = 'shops' | 'scan' | 'stream' | 'video';

export function chartMethod(s: GameState): ChartMethod {
  const ms = w4(s).ms;
  if (ms.viral !== undefined) return 'video';
  if (ms.streamcount !== undefined) return 'stream';
  if (ms.soundscan !== undefined) return 'scan';
  return 'shops';
}

export const METHOD_INFO: Record<ChartMethod, { name: L; desc: L; w: Record<string, number> }> = {
  shops: { name: l('Lojas informando', 'Store reports'), desc: l('Lojistas dizem por telefone o que vendeu. Favorece o que as lojas querem empurrar (rock e pop) e é manipulável.', 'Retailers phone in what sold. It favors what stores want to push (rock and pop) and can be rigged.'), w: { rock: 1.06, pop: 1.06, hiphop: 0.85, country_folk: 0.88, rnb: 0.94 } },
  scan: { name: l('Medição real de vendas', 'Real sales measurement'), desc: l('Código de barras no caixa. Rap e country, antes subestimados, aparecem no topo.', 'Barcodes at the register. Rap and country, once undercounted, show up at the top.'), w: { hiphop: 1.08, country_folk: 1.08 } },
  stream: { name: l('Streams contam', 'Streams count'), desc: l('Audições viram unidades. Quem é ouvido todo dia (rap, latina) sobe; o rock de catálogo cai.', 'Plays become units. What is played daily (rap, Latin) rises; catalog rock falls.'), w: { hiphop: 1.15, latin: 1.1, caribbean: 1.08, rock: 0.9, country_folk: 0.95, electronic: 1.05 } },
  video: { name: l('Vídeos contam', 'Videos count'), desc: l('Visualizações e trechos virais entram na conta. Pop, rap, latina, afro e k-pop ganham.', 'Views and viral snippets enter the count. Pop, rap, Latin, Afro and K-pop gain.'), w: { hiphop: 1.12, pop: 1.1, latin: 1.15, caribbean: 1.1, africa: 1.12, asia_me: 1.06, rock: 0.88, country_folk: 0.92 } },
};

registerMod('chartUnits', 'w4method', (s, value, ctx) => {
  const act = ctx.release ? s.acts[ctx.release.actId] : undefined;
  if (!act) return null;
  const k = METHOD_INFO[chartMethod(s)].w[familyOf(act.genre)] ?? 1;
  return k === 1 ? null : { value: value * k, label: METHOD_INFO[chartMethod(s)].name };
});

// ======================================================================= manipulação

export const MANIP: Record<string, { name: L; desc: L; mult: number; weeks: number; real: number; heat: number; methods: ChartMethod[] }> = {
  shops: { name: l('Lojas amigas', 'Friendly stores'), desc: l('Lojistas "arredondam" as vendas para cima.', 'Retailers "round up" your sales.'), mult: 1.35, weeks: 3, real: 1500, heat: 7, methods: ['shops'] },
  bulk: { name: l('Compra em massa', 'Bulk buying'), desc: l('O selo compra os próprios discos nas lojas que reportam.', 'The label buys its own records at reporting stores.'), mult: 1.5, weeks: 2, real: 3000, heat: 12, methods: ['shops', 'scan', 'stream', 'video'] },
  farm: { name: l('Fazenda de streams', 'Stream farm'), desc: l('Milhares de celulares tocando a faixa em loop.', 'Thousands of phones playing the track on loop.'), mult: 1.7, weeks: 2, real: 2500, heat: 18, methods: ['stream', 'video'] },
};

export function manipulate(s: GameState, relId: string, kind: string): L | null {
  const m = MANIP[kind];
  const rel = s.releases[relId];
  const w = w4(s);
  if (!m || !rel || !rel.live || !mineRel(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!m.methods.includes(chartMethod(s))) return l('Não funciona com a metodologia atual.', 'Does not work with the current methodology.');
  if (w.manip.boosts[relId] && w.manip.boosts[relId].until >= s.week) return l('Já está sendo inflado.', 'Already being inflated.');
  const cost = money(s, m.real);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4manip:${relId}:${kind}`, -cost, 'w4_payola', `Promoção de parada ${rel.title}`);
  w.manip.boosts[relId] = { until: s.week + m.weeks, mult: m.mult, kind };
  w.manip.lastRev[relId] = rel.revenue;
  w.manip.heat = clamp(w.manip.heat + m.heat, 0, 100);
  return null;
}

registerMod('chartUnits', 'w4manip', (s, value, ctx) => {
  const b = ctx.release ? w4(s).manip.boosts[ctx.release.id] : undefined;
  if (!b || b.until < s.week) return null;
  return { value: value * b.mult, label: l('Unidades infladas', 'Inflated units') };
});

function manipWeek(s: GameState, r: Rng): void {
  const w = w4(s);
  const method = chartMethod(s);
  for (const [id, b] of Object.entries(w.manip.boosts)) {
    const rel = s.releases[id];
    if (!rel) { delete w.manip.boosts[id]; delete w.manip.lastRev[id]; continue; }
    // unidades compradas não viram receita: estorna a parte inflada
    const delta = rel.revenue - (w.manip.lastRev[id] ?? rel.revenue);
    if (delta > 0 && b.until >= s.week) post(s, `w4manipadj:${id}`, -Math.round(delta * (1 - 1 / b.mult)), 'w4_payola', `Ajuste de unidades infladas ${rel.title}`);
    w.manip.lastRev[id] = rel.revenue;
    if (b.until < s.week) { delete w.manip.boosts[id]; delete w.manip.lastRev[id]; continue; }
    // detecção
    const k = method === 'shops' ? 0.5 : method === 'scan' ? 1.2 : 1.4;
    if (r.chance((w.manip.heat / 420) * k)) {
      post(s, `w4manipfine:${id}`, -money(s, 5000 + w.manip.heat * 200), 'w4_legal', 'Multa por manipulação de parada');
      rel.appeal *= 0.7;
      rep(s, 'commercial', -6);
      rep(s, 'institutional', -4);
      w.manip.heat = 0;
      w.manip.caught += 1;
      delete w.manip.boosts[id];
      delete w.manip.lastRev[id];
      const text = fmtL(l('Pego inflando a parada: "{t}" é punido e a imprensa cai em cima.', 'Caught rigging the chart: "{t}" is penalized and the press piles on.'), { t: rel.title });
      remember(s, 'chart_rig', text, { actId: rel.actId, important: true });
      notify(s, text, 'bad');
      continue;
    }
    if (b.until === s.week) { delete w.manip.boosts[id]; delete w.manip.lastRev[id]; }
  }
}

// ======================================================================= paradas extras

export interface ExtraChartRow { relId: string; score: number }

const RADIO_FAM: Record<string, number> = { pop: 1.25, rock: 1.1, country_folk: 1.15, rnb: 1.05, latin: 1.05, hiphop: 0.75, electronic: 0.7 };

function allEntries(s: GameState): { rel: Release; units: number }[] {
  const out: { rel: Release; units: number }[] = [];
  for (const e of [...s.charts.singles, ...s.charts.albums]) {
    const rel = s.releases[e.releaseId];
    if (rel) out.push({ rel, units: e.units });
  }
  return out;
}

function top(rows: ExtraChartRow[], n = 15): ExtraChartRow[] {
  return rows.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}

export interface ExtraChart { id: string; name: L; from?: string; desc: L; rows: (s: GameState) => ExtraChartRow[] }

export const EXTRA_CHARTS: ExtraChart[] = [
  {
    id: 'radio', name: l('Parada de rádio', 'Radio chart'), from: 'radio', desc: l('Execuções: divulgação em rádio, gêneros "radiofônicos" e a relação com programadores.', 'Airplay: radio promotion, radio-friendly genres and programmer relationships.'),
    rows: (s) => top(s.charts.singles.map((e) => {
      const rel = s.releases[e.releaseId];
      const act = rel ? s.acts[rel.actId] : undefined;
      if (!rel || !act) return { relId: e.releaseId, score: 0 };
      let k = (RADIO_FAM[familyOf(act.genre)] ?? 1) * (hasChannel(rel, 'radio_plug') ? 1.6 : 1);
      if (mineRel(s, rel)) k *= 1 + w4(s).payola.dj / 200 + w4(s).payola.level;
      if (w4(s).advisory[rel.id] === 'clean' || w4(s).advisory[rel.id] === 'both') k *= 1.15;
      else if (w4(s).advisory[rel.id] === 'sticker') k *= 0.7;
      return { relId: rel.id, score: e.units * k };
    })),
  },
  {
    id: 'sales', name: l('Parada de vendas', 'Sales chart'), desc: l('Só cópias compradas (físico e download), sem execuções.', 'Only purchased copies (physical and download), no plays.'),
    rows: (s) => { const ph = physicalShare(s); const dl = hasTech(s, 'streaming') ? 0.15 : 1 - ph; return top(allEntries(s).map(({ rel, units }) => ({ relId: rel.id, score: units * (ph + dl * (rel.type === 'single' ? 1 : 0.6)) }))); },
  },
  {
    id: 'video', name: l('Parada de vídeo', 'Video chart'), from: 'clipnet', desc: l('Clipes na TV e, depois, visualizações e vídeos curtos.', 'Clips on TV and, later, views and short videos.'),
    rows: (s) => top(allEntries(s).map(({ rel, units }) => ({ relId: rel.id, score: units * ((hasChannel(rel, 'music_video') ? 1.8 : 0.4) + (hasChannel(rel, 'short_clips') ? 1.6 : 0) + (hasChannel(rel, 'tv_show') ? 0.6 : 0)) }))),
  },
  { id: 'latin', name: l('Parada latina', 'Latin chart'), desc: l('Latina, caribenha e brasileira.', 'Latin, Caribbean and Brazilian.'), rows: (s) => famChart(s, ['latin', 'caribbean', 'brazil']) },
  { id: 'country', name: l('Parada country', 'Country chart'), desc: l('Country, folk e derivados.', 'Country, folk and offshoots.'), rows: (s) => famChart(s, ['country_folk']) },
  { id: 'dance', name: l('Parada dance', 'Dance chart'), desc: l('Eletrônica e disco nas pistas.', 'Electronic and disco on the dancefloor.'), rows: (s) => top(allEntries(s).filter(({ rel }) => { const a = s.acts[rel.actId]; return !!a && (familyOf(a.genre) === 'electronic' || DISCO.includes(a.genre) || a.genre === 'house'); }).map(({ rel, units }) => ({ relId: rel.id, score: units }))) },
];

function famChart(s: GameState, fams: string[]): ExtraChartRow[] {
  return top(allEntries(s).filter(({ rel }) => { const a = s.acts[rel.actId]; return !!a && fams.includes(familyOf(a.genre)); }).map(({ rel, units }) => ({ relId: rel.id, score: units })));
}

function trackYear(s: GameState): void {
  const w = w4(s);
  for (const { rel, units } of allEntries(s)) w.yearUnits[rel.id] = (w.yearUnits[rel.id] ?? 0) + units;
}

export function chartsYear(s: GameState): void {
  const w = w4(s);
  const rows = Object.entries(w.yearUnits).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topList = rows.map(([id, units]) => { const rel = s.releases[id]; return { id, title: rel?.title ?? '?', act: s.acts[rel?.actId ?? '']?.name ?? '?', units: Math.round(units) }; });
  if (topList.length) {
    w.yearEnd.push({ year: s.year, top: topList });
    if (w.yearEnd.length > 40) w.yearEnd.splice(0, w.yearEnd.length - 40);
    const first = topList[0];
    const rel0 = s.releases[first.id];
    if (rel0 && mineRel(s, rel0)) notify(s, fmtL(l('"{t}" é o disco do ano na parada de fim de ano!', '"{t}" is the record of the year on the year-end chart!'), { t: first.title }), 'good');
  }
  // todos os tempos: mantém os 20 maiores já vistos (sobrevive à limpeza de lançamentos)
  const map = new Map(w.allTime.map((x) => [x.id, x]));
  for (const rel of Object.values(s.releases)) {
    if (rel.totalUnits < 50000) continue;
    map.set(rel.id, { id: rel.id, title: rel.title, act: s.acts[rel.actId]?.name ?? map.get(rel.id)?.act ?? '?', units: rel.totalUnits, year: rel.year });
  }
  w.allTime = [...map.values()].sort((a, b) => b.units - a.units).slice(0, 20);
  w.yearUnits = {};
}

export function chartsWeekW4(s: GameState, r: Rng): void {
  trackYear(s);
  manipWeek(s, r);
}
