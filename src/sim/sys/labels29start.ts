// Rodada 29 — GRAVADORAS NO INÍCIO e SELOS NOVOS DURANTE A RUN (escolhas em config.labels29; dados em
// src/sim/labels29data.ts; ganchos-folha em src/sim/labels29gate.ts). Sem `labels29` nada aqui roda.
//  • prep (antes do mundo): escolhe QUAIS e QUANTAS gravadoras reais existem no começo — as que existiam na data, pelo
//    porte (majors e catálogos primeiro, ou indies primeiro na distribuição "muitas indies") e pela região escolhida;
//    incluídas à força primeiro, excluídas nunca. Grava em cfg.labels (ids + count) e o setupLabels do worldgen monta.
//    Se faltar gente real na data (ou a % de reais for menor), o resto é INVENTADO no estilo da época (gen).
//  • newgame (antes do nível dos rivais): distribuição de porte (indies pequenas × majors grandes). O nível dos rivais
//    (rivals29) escala o conjunto depois: o nível decide o porte, o número decide quantas.
//  • mês: selos NOVOS sorteados por ano (`labels29:semente:ano`, nunca o sorteio da partida), com ondas da época e anos
//    de seca; o selo independente de sempre do lifecycle sai de cena (é ele que a frequência substitui). As gravadoras
//    reais fundadas depois do início continuam chegando nas datas reais (menos na frequência "nenhuma").
//  • fechamentos/fusões desligados: falência vira socorro e as fusões (rivals, npc17) não acontecem.

import { Rng, clamp } from '../../core/rng';
import { REAL_LABELS, realFounded } from '../../data/realnames';
import { labelAliveAt33 } from '../../data/labelhist33'; // R33 (DADOS): extinta antes do início não começa
import { CITIES, MARKETS, cityById, familyOf, l, type MarketId } from '../../data/world';
import { registerSimHook } from '../ext4';
import { LB29, labelsOn29 } from '../labels29gate';
import { count29, yearPlan29 } from '../labels29data';
import type { GameState, Label, RunConfig } from '../types';
import { fmtL, money, nextId, notify, remember } from '../util';
import { DEFAULT_LABEL_IDS, aliveGenres, labelPool, suggestLabels22, type PoolLabel } from '../worldgen';

export { count29, ven29, setLabels29, statusAll29, yearPlan29 } from '../labels29data';

export interface Labels29State {
  /** gravadoras ativas logo depois do mundo montado */
  n0: number;
  /** selos novos sorteados: ano, id */
  born: [number, string][];
  /** falências socorridas (fechamentos desligados) */
  saved: number;
}
export const labels29St = (s: GameState): Labels29State | undefined => (s.x4 as unknown as { labels29?: Labels29State }).labels29;
const st29 = (s: GameState): Labels29State => ((s.x4 as unknown as { labels29?: Labels29State }).labels29 ??= { n0: 0, born: [], saved: 0 });

const fy = (d: PoolLabel, cfg: RunConfig): number => (cfg.realNames ? realFounded(d.id, d.founded) : d.founded);
const homeMk = (cfg: RunConfig): MarketId => (cityById[cfg.homeCity]?.market ?? 'na') as MarketId;
const inSpread = (cfg: RunConfig, mk: string | undefined, sp = cfg.labels29?.spread ?? 'world'): boolean =>
  sp === 'world' || mk === homeMk(cfg) || (sp === 'region' && (mk === 'na' || mk === 'eu'));

// ---------------------------------------------------------------- quais reais, quantas

const FAM_W: Record<string, Record<Label['family'], number>> = {
  majors: { A: 4, D: 3, C: 2, B: 1 }, indies: { B: 4, C: 3, D: 2, A: 1 }, mixed: { A: 4, D: 3, C: 2.5, B: 2 },
};
/** Ordem de preferência das reais que existem na data: incluídas, região escolhida, porte, idade. */
export function rankReal29(cfg: RunConfig): PoolLabel[] {
  const x = cfg.labels29 ?? {};
  const exc = new Set(x.exc ?? []), inc = new Set(x.inc ?? []);
  const fw = FAM_W[x.size ?? 'mixed'];
  const sp = x.spread ?? 'world';
  const core = new Set(DEFAULT_LABEL_IDS()); // núcleo histórico curado (as que fizeram a história) pesa como "fama"
  const score = (d: PoolLabel): number => (inc.has(d.id) ? 100 : 0) + fw[d.family] + (core.has(d.id) ? 1.5 : 0) + (sp !== 'world' && inSpread(cfg, cityById[d.city]?.market) ? 6 : 0)
    + (cityById[d.city]?.market === homeMk(cfg) ? 0.5 : 0) + Math.min(1, (cfg.startYear - fy(d, cfg)) / 200);
  const seen = new Set<string>(); // o mesmo nome real em duas entradas do catálogo conta uma vez
  return labelPool().filter((d) => fy(d, cfg) <= cfg.startYear && labelAliveAt33(d.id, cfg.startYear) && !exc.has(d.id)).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
    .filter((d) => { const n = cfg.realNames ? d.real ?? REAL_LABELS[d.id] ?? d.name : d.name; if (seen.has(n)) return false; seen.add(n); return true; });
}

LB29.prep = (cfg) => {
  if (!labelsOn29(cfg)) return;
  const x = cfg.labels29!;
  const sug = suggestLabels22(cfg).ids;
  const pool = labelPool();
  const byId = new Map(pool.map((d) => [d.id, d]));
  const exists = (id: string) => { const d = byId.get(id); return !!d && fy(d, cfg) <= cfg.startYear && labelAliveAt33(id, cfg.startYear); };
  const n = count29(cfg) ?? sug.filter(exists).length;
  const ranked = rankReal29(cfg);
  const nReal = Math.min(ranked.length, Math.round(n * clamp(x.real ?? 100, 0, 100) / 100));
  const now = ranked.slice(0, nReal).map((d) => d.id);
  const exc = new Set(x.exc ?? []);
  const later = sug.filter((id) => !exists(id) && byId.has(id) && fy(byId.get(id)!, cfg) > cfg.startYear && !exc.has(id)); // as reais do futuro seguem chegando nas datas
  cfg.labels = { ...(cfg.labels ?? {}), ids: [...now, ...later], count: n };
  if (x.freq === 'none') cfg.labels.future = 'none';
};

// ---------------------------------------------------------------- inventadas, no estilo da época

const WORDS: [number, string[], ((w: string, sur: string) => string)[]][] = [
  [1920, ['Crescent', 'Monarch', 'Pioneer', 'Excelsior', 'Lyric', 'Gilded', 'Laurel', 'Meridian', 'Sterling', 'Beacon', 'Regal', 'Aurora'],
    [(w) => `${w} Phonograph Co.`, (w) => `${w} Talking Machine Co.`, (_w, s) => `${s} Disc Company`, (w) => `${w} Gramophone`]],
  [1950, ['Starlight', 'Bayou', 'Moonglow', 'Boulevard', 'Riverboat', 'Ambassador', 'Carousel', 'Parlor', 'Swingtime', 'Cotton Club', 'Tuxedo', 'Lantern'],
    [(w) => `${w} Records`, (_w, s) => `${s} Recording Co.`, (w) => `${w} Disc`]],
  [1970, ['Jet', 'Rocket', 'Satellite', 'Hi-Fi', 'Spinner', 'Groove', 'Jukebox', 'Comet', 'Twister', 'Shindig', 'Rebel', 'Atomic'],
    [(w) => `${w} Records`, (w) => `${w}-Tone`, (_w, s) => `${s} Sound`]],
  [1990, ['Neon', 'Static', 'Concrete', 'Basement', 'Fanzine', 'Safety Pin', 'Cassette', 'Electric Eel', 'Warehouse', 'Polaroid', 'Xerox', 'Riot'],
    [(w) => `${w} Records`, (w) => `${w} Music`, (w) => `${w} Productions`]],
  [2005, ['Dial-Up', 'Subterranea', 'Tape Deck', 'Pager', 'Blacklight', 'Bassline', 'Mixtape', 'Cyberia', 'Halfpipe', 'Lo-Fi', 'Flannel', 'Rave'],
    [(w) => `${w} Recordings`, (w) => `${w} Music Group`, (w) => `${w} Entertainment`]],
  [9999, ['Cloudburst', 'Bandwave', 'Pixel', 'Bedroom', 'Algorithm', 'Loop', 'Glitch', 'Neon Pulse', 'Afterhours', 'Moodboard', 'Softcore', 'Vapor'],
    [(w) => `${w} Collective`, (w) => `${w} Audio`, (w) => `${w} Records`]],
];
const SUR = ['Hartley', 'Moreau', 'Kessler', 'Delgado', 'Okafor', 'Sato', 'Lindqvist', 'Barros', 'Novak', 'Fitzgerald', 'Albuquerque', 'Castellano'];

/** Nome de selo inventado na moda da época (e da praça: "Discos X" no Brasil e na América Latina). */
export function eraName29(r: Rng, year: number, city: string, taken: (n: string) => boolean): string {
  const [, ws, pats] = WORDS.find(([y]) => year < y)!;
  const mk = cityById[city]?.market;
  for (let k = 0; k < 12; k++) {
    const w = r.pick(ws), s = r.pick(SUR);
    let n = (mk === 'br' || mk === 'latam') && r.chance(0.5) ? `Discos ${w}` : r.pick(pats)(w, s);
    if (k > 5) n = `${n} ${['II', 'Co.', 'Group', 'Int.'][k % 4]}`;
    if (!taken(n)) return n;
  }
  return `${r.pick(ws)} ${r.int(2, 99)}`;
}
/** Cidade de um selo novo pela região escolhida (pesada pelo tamanho do mercado na época). */
export function cityFor29(r: Rng, cfg: RunConfig, year: number): string {
  const cs = CITIES.filter((c) => inSpread(cfg, c.market) && (MARKETS.find((m) => m.id === c.market)?.size(year) ?? 0) > 0.02);
  return (r.weighted(cs.length ? cs : CITIES, (c) => (MARKETS.find((m) => m.id === c.market)?.size(year) ?? 0.1) * (c.w ?? 1)) ?? CITIES[0]).id;
}
const famFor = (r: Rng, size: string | undefined): Label['family'] =>
  size === 'indies' ? (r.chance(0.8) ? 'B' : 'C') : size === 'majors' ? r.pick(['A', 'A', 'C', 'D'] as const) : r.pick(['A', 'B', 'B', 'B', 'C', 'C', 'D'] as const);

LB29.gen = (s, cfg, i) => {
  if (!labelsOn29(cfg)) return undefined;
  const r = Rng.fromSeed(`labels29:${cfg.seed}:gen:${i}`);
  const city = cityFor29(r, cfg, cfg.startYear);
  const founded = Math.max(1880, cfg.startYear - r.int(0, 12));
  return { name: eraName29(r, founded, city, (n) => Object.values(s.labels).some((x) => x.name === n)), city, family: famFor(r, cfg.labels29?.size), founded };
};

// ---------------------------------------------------------------- porte no começo

registerSimHook('newgame', 'labels29', (s) => {
  const cfg = s.config;
  if (!labelsOn29(cfg)) return;
  const st = st29(s);
  const act = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash || a.id.localeCompare(b.id));
  const size = cfg.labels29!.size;
  if (size === 'indies') act.forEach((lb, i) => { if (i > 0 && lb.family === 'A') { lb.family = 'C'; lb.cash = Math.round(lb.cash * 0.5); lb.territories = lb.territories.slice(0, 3); } });
  if (size === 'majors') act.forEach((lb, i) => {
    if (i < 3) { lb.family = 'A'; lb.territories = MARKETS.map((m) => m.id) as MarketId[]; }
    else if (lb.family === 'B') { lb.family = 'C'; lb.cash = Math.round(lb.cash * 1.6); }
  });
  st.n0 = act.length;
});

// ---------------------------------------------------------------- selos novos durante a run

/** Abre um selo novo (sorteio próprio): nome da época, praça pela região, foco num gênero vivo. */
export function bornLabel29(s: GameState, r: Rng): Label {
  const cfg = s.config;
  const city = cityFor29(r, cfg, s.year);
  const alive = aliveGenres(s);
  const id = nextId(s, 'lb');
  const fam: Label['family'] = cfg.labels29?.size === 'majors' && r.chance(0.3) ? 'C' : 'B';
  const lb: Label = {
    id, name: eraName29(r, s.year, city, (n) => Object.values(s.labels).some((x) => x.name === n)), family: fam, city, founded: s.year,
    focus: alive.length ? [familyOf(r.pick(alive))] : [], cash: money(s, r.int(120000, 600000)), reputation: r.int(20, 35), roster: [], active: true,
    aggression: r.float(0.3, 0.7), strategy: r.pick(['niche', 'develop'] as const), territories: [(cityById[city]?.market ?? 'na') as MarketId],
    revenueYear: 0, revenueLastYear: 0, procedural: true,
  };
  s.labels[id] = lb;
  st29(s).born.push([s.year, id]);
  remember(s, 'label_new', fmtL(l('Novo selo: {n} ({c}).', 'New label: {n} ({c}).'), { n: lb.name, c: cityById[city]?.name ?? city }));
  notify(s, fmtL(l('Novo rival: {n}.', 'New rival: {n}.'), { n: lb.name }), 'info');
  return lb;
}

/** O mês do sorteio: abre os selos marcados para este mês (teto de 90 gravadoras ativas). */
export function labels29Month(s: GameState): number {
  const cfg = s.config;
  if (!labelsOn29(cfg)) return 0;
  const plan = yearPlan29(cfg.seed, s.year, cfg.labels29!.freq ?? 'normal');
  let made = 0;
  plan.months.forEach((m, k) => {
    if (m !== s.month || Object.values(s.labels).filter((x) => x.active).length >= 90) return;
    bornLabel29(s, Rng.fromSeed(`labels29:${cfg.seed}:${s.year}:${s.month}:${k}`));
    made++;
  });
  return made;
}
registerSimHook('month', 'labels29', (s) => { labels29Month(s); });

// ---------------------------------------------------------------- portas do fluxo de sempre

LB29.newRival = (s) => labelsOn29(s.config);
LB29.noFound = (s) => labelsOn29(s.config) && s.config.labels29?.freq === 'none';
LB29.noClose = (s) => {
  const off = labelsOn29(s.config) && s.config.labels29?.life === 'off';
  if (off) st29(s).saved++;
  return off;
};
