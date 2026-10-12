// Rodada 21e (mercado e mídia, docs/revisao21.md §4): a mídia disputada por TODOS os atos, não só pelo jogador.
//   (1) PARADA DE AIRPLAY por mercado/semana: rivais e atos de NPC concorrem pelas vagas de rotação por apelo ×
//       fama regional × relação com a estação (o `needle time` de regions19 encolhe as vagas na Europa até 1988).
//       Quem entra ganha unidades (mod `chartUnits`) e peso na parada do país (gancho lido por charts7.countryWeights).
//   (2) PLAYLISTS/ALGORITMO (2008+): N vagas editoriais por mercado/semana (score = apelo × retorno × relação com o
//       curador) com o bolo de streaming CONSERVADO por território: o que as vagas ganham sai de quem ficou fora.
//       O jogador pede pitch gastando tempo da equipe (não caixa), com chance explicada.
//   (3) VIRAL 2016+: faixa nova de qualquer ato pode viralizar sem campanha pelo gancho (`songProfile.hook`), puxando
//       genrePop e a fama no país de origem; notícia (facts17) e autópsia (rótulo do mod) anotam. Determinístico (rng19).
// Rivais pagam pitch de rádio/playlist pelo extrato (rivalledger21.labelPost): o jogador perde vagas de verdade.

import { Rng, clamp, seedState } from '../../core/rng';
import { COUNTRY_INFO, countryMarketSize } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { MARKETS, cityById, l, marketById, type L, type MarketId } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { allReleases17 } from '../relidx17';
import { songProfile } from '../repertoire';
import { labelPost } from '../rivalledger21';
import { rng19 } from '../rng19';
import type { GameState, Release } from '../types';
import { fmtL, hasTech, money, notify, staffCount } from '../util';
import { countryHook21 } from './charts7';
import { fameIn, nudge16 } from './fame16';
import { needle19 } from './regions19';
import { radioWeight18, spins18 } from './radio18';
import { retOf18, st18 } from './stream18';
import { w4 } from './world4/state';

// ------------------------------------------------------------------ estado

export interface AirRow21 { rel: string; sc: number; pos: number; last: number; in: boolean }
export interface PlRow21 { rel: string; sc: number; k: number }
export interface Viral21 { rel: string; act: string; w: number; until: number; a3: string | null; hook: number; mine: boolean; title: string }
export interface Media21State {
  week: number;
  /** ranking de airplay por mercado (as `slots` primeiras estão `in`) */
  air: Partial<Record<MarketId, AirRow21[]>>;
  slots: Partial<Record<MarketId, number>>;
  /** vagas de playlist por mercado e diluição de quem ficou fora */
  pl: Partial<Record<MarketId, PlRow21[]>>;
  dil: Partial<Record<MarketId, number>>;
  cut: Partial<Record<MarketId, number>>;
  /** pedidos de pitch do jogador (tempo da equipe) */
  plAsk: Record<string, { w: number; p: number }>;
  plMonth: { k: string; used: number };
  /** virais ativos por lançamento e histórico curto */
  viral: Record<string, Viral21>;
  log: Viral21[];
  /** rivais que pagaram divulgação (semana) */
  rp: Record<string, number>;
  n: { air: number; lost: number; pl: number; ask: number; viral: number; rival: number };
}
declare module '../ext4' { interface Ext4 { media21: Media21State } }
const fresh = (): Media21State => ({ week: -1, air: {}, slots: {}, pl: {}, dil: {}, cut: {}, plAsk: {}, plMonth: { k: '', used: 0 }, viral: {}, log: [], rp: {}, n: { air: 0, lost: 0, pl: 0, ask: 0, viral: 0, rival: 0 } });
registerExt4('media21', fresh);
/** Acesso com autocura (saves antigos sem o campo). */
export function media21(s: GameState): Media21State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.media21 ??= fresh()) as Media21State;
  const o = st as unknown as Record<string, unknown>;
  if (!o.ok21) { const f = fresh(); for (const k of Object.keys(f) as (keyof Media21State)[]) o[k] ??= f[k]; o.ok21 = 1; }
  return st;
}

export const PL_SLOTS21 = 6;
export const VIRAL_FROM21 = 2016;
const VIRAL_WEEKS = 8;
const AIR_AGE = 30, PL_AGE = 10, POOL_AGE = 52;

const mine = (s: GameState, rel: Release): boolean => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
const homeMarket = (s: GameState): MarketId | undefined => cityById[s.config.homeCity]?.market;
const leadHook = (s: GameState, rel: Release): number => { const so = s.songs[rel.songs[0]]; return so ? songProfile(so).hook : 50; };
/** apelo da faixa para a mídia: apelo do disco × gancho do single */
const appealOf = (s: GameState, rel: Release): number => Math.max(0.05, rel.appeal) * (0.85 + leadHook(s, rel) / 330);
const labelOf = (s: GameState, rel: Release) => (rel.owner !== 'player' ? s.labels[rel.owner] : undefined);
const rng = (s: GameState): Rng => rng19(s, 'media21', () => new Rng(seedState(`media21|${s.config.seed}|${s.week}`)));

/** país representativo do mercado (o maior) para a fama regional */
const REP: Partial<Record<MarketId, string>> = {};
function repA3(mk: MarketId, year: number): string {
  if (REP[mk]) return REP[mk]!;
  let best: string | null = null, bv = -1;
  for (const c of COUNTRY_INFO) if (c.market === mk) { const v = countryMarketSize(c, year); if (v > bv) { bv = v; best = c.a3; } }
  return (REP[mk] = best ?? 'USA');
}

/** Vagas de rotação por mercado: o needle time (BBC) encolhe a Europa até 1988. */
export function airSlots21(s: GameState, mk: MarketId): number {
  if (mk !== 'eu') return 10;
  const nd = needle19(s.year);
  return nd === 2 ? 6 : nd === 1 ? 8 : 10;
}

// ------------------------------------------------------------------ (1) airplay

export interface AirScore21 { sc: number; parts: WhyPart[] }
/** Pontuação de airplay de um lançamento num mercado (sem ruído): apelo × fama regional × relação com as estações. */
export function airScore21(s: GameState, rel: Release, mk: MarketId): AirScore21 {
  const act = s.acts[rel.actId];
  const st = media21(s);
  const ap = appealOf(s, rel);
  const parts: WhyPart[] = [{ label: l('Apelo × gancho do single', 'Appeal × single hook'), value: Math.round(ap * 100) / 100, fmt: 'mult' }];
  const fame = act ? 0.3 + fameIn(s, act, repA3(mk, s.year)) / 100 : 0.3;
  parts.push({ label: fmtL(l('Fama em {m}', 'Fame in {m}'), { m: marketById[mk].name }), value: Math.round(fame * 100) / 100, fmt: 'mult' });
  let rel_ = 0.6;
  if (mine(s, rel)) {
    const sp = mk === homeMarket(s) ? spins18(s, rel.id) : 0;
    rel_ += Math.min(1, sp / 6) * 0.8;
    parts.push({ label: sp ? l('Suas estações em rotação', 'Your stations in rotation') : l('Sem rotação própria neste mercado', 'No rotation of your own in this market'), value: Math.round(rel_ * 100) / 100, fmt: 'mult' });
  } else {
    const lb = labelOf(s, rel);
    rel_ += lb ? (lb.reputation / 100) * 0.5 : -0.1;
    if ((st.rp[rel.id] ?? -99) > s.week - 8) rel_ += 0.3;
    parts.push({ label: lb ? fmtL(l('Relação do selo {n} com as estações', 'Label {n} relationship with stations'), { n: lb.name }) : l('Independente: sem divulgador', 'Independent: no plugger'), value: Math.round(rel_ * 100) / 100, fmt: 'mult' });
  }
  const gp = (0.6 + (s.genrePop[act?.genre ?? ''] ?? 0.6)) / 1.6;
  parts.push({ label: l('Gênero em alta/baixa', 'Genre trend'), value: Math.round(gp * 100) / 100, fmt: 'mult' });
  const last = st.air[mk]?.find((x) => x.rel === rel.id);
  const inertia = last?.in ? 1.1 : 1;
  if (last?.in) parts.push({ label: l('Já estava na parada (inércia da rotação)', 'Already charting (rotation inertia)'), value: 1.1, fmt: 'mult' });
  return { sc: ap * fame * rel_ * gp * inertia, parts };
}

function airCandidates(s: GameState, mk: MarketId): Release[] {
  const out: Release[] = [];
  for (const rel of allReleases17(s)) {
    if (!rel.live || rel.hist || s.week - rel.week > AIR_AGE || !rel.territories.includes(mk) || !s.acts[rel.actId]) continue;
    out.push(rel);
  }
  return out;
}

function weekAir(s: GameState, r: Rng): void {
  const st = media21(s);
  if (!hasTech(s, 'radio')) { st.air = {}; return; }
  const hm = homeMarket(s);
  for (const m of MARKETS) {
    const mk = m.id;
    const slots = airSlots21(s, mk);
    st.slots[mk] = slots;
    const rows: AirRow21[] = airCandidates(s, mk).map((rel) => ({ rel: rel.id, sc: airScore21(s, rel, mk).sc * Math.exp(r.normal(0, 0.15)), pos: 0, last: st.air[mk]?.find((x) => x.rel === rel.id)?.pos ?? 0, in: false }));
    rows.sort((a, b) => b.sc - a.sc);
    rows.forEach((x, i) => { x.pos = i + 1; x.in = i < slots; });
    for (const x of rows) {
      if (!x.in) break;
      st.n.air++;
      const rel = s.releases[x.rel];
      if (rel && !mine(s, rel) && x.last === 0 && x.pos === 1) {
        const act = s.acts[rel.actId];
        if (act) act.momentum = clamp(act.momentum + 1, 0, 100);
      }
    }
    if (mk === hm) for (const x of rows) { const rel = s.releases[x.rel]; if (rel && mine(s, rel) && !x.in && x.pos <= slots + 5) st.n.lost++; }
    st.air[mk] = rows.slice(0, 40);
  }
}

/** Posição de um lançamento na parada de airplay do mercado (0 = fora). */
export const airPos21 = (s: GameState, relId: string, mk: MarketId): { pos: number; in: boolean; slots: number } => {
  const st = media21(s);
  const x = st.air[mk]?.find((k) => k.rel === relId);
  return { pos: x?.pos ?? 0, in: !!x?.in, slots: st.slots[mk] ?? 10 };
};

registerMod('chartUnits', 'media21air', (s, v, c) => {
  const rel = c.release;
  if (!rel || !hasTech(s, 'radio')) return null;
  const st = media21(s);
  let b = 0;
  for (const mk of rel.territories) {
    const x = st.air[mk]?.find((k) => k.rel === rel.id);
    if (!x?.in) continue;
    const slots = st.slots[mk] ?? 10;
    b += 0.05 * (1 - (x.pos - 1) / slots) * marketById[mk].size(s.year);
  }
  if (!b) return null;
  const k = 1 + Math.min(0.35, b) * radioWeight18(s);
  return { value: v * k, label: l('Parada de airplay', 'Airplay chart') };
});

// ------------------------------------------------------------------ (2) playlists

export interface PlScore21 { sc: number; parts: WhyPart[] }
/** Pontuação de vaga editorial: apelo × retorno × relação com o curador (pitch do jogador/rival reforça a relação). */
export function plScore21(s: GameState, rel: Release, mk: MarketId, withAsk = false): PlScore21 {
  const act = s.acts[rel.actId];
  const st = media21(s);
  const ap = appealOf(s, rel) * (rel.type === 'single' ? 1.15 : 1);
  const parts: WhyPart[] = [{ label: l('Apelo × gancho', 'Appeal × hook'), value: Math.round(ap * 100) / 100, fmt: 'mult' }];
  let ret: number;
  if (mine(s, rel)) ret = clamp(retOf18(s, rel) / 0.22, 0.4, 1.8);
  else ret = 0.6 + (act?.momentum ?? 30) / 150;
  parts.push({ label: l('Retorno (ouvinte que volta)', 'Return (listeners who come back)'), value: Math.round(ret * 100) / 100, fmt: 'mult' });
  let cur: number;
  if (mine(s, rel)) {
    cur = 0.5 + w4(s).payola.curator / 100;
    const ask = st.plAsk[rel.id];
    if (withAsk || (ask && ask.w > s.week - 6)) { cur *= 1.6; parts.push({ label: l('Pitch da equipe aos curadores', 'Team pitch to curators'), value: 1.6, fmt: 'mult' }); }
    if ((st18(s).black[rel.actId] ?? 0) > s.week) { cur *= 0.3; parts.push({ label: l('Lista negra dos curadores (fraude)', 'Curator blacklist (fraud)'), value: 0.3, fmt: 'mult' }); }
  } else {
    const lb = labelOf(s, rel);
    cur = lb ? 0.5 + lb.reputation / 150 : 0.45;
    if ((st.rp[rel.id] ?? -99) > s.week - 6) cur *= 1.5;
  }
  parts.push({ label: l('Relação com o curador', 'Curator relationship'), value: Math.round(cur * 100) / 100, fmt: 'mult' });
  const gp = (0.6 + (s.genrePop[act?.genre ?? ''] ?? 0.6)) / 1.6;
  parts.push({ label: l('Gênero em alta/baixa', 'Genre trend'), value: Math.round(gp * 100) / 100, fmt: 'mult' });
  return { sc: ap * ret * cur * gp, parts };
}

const streamingEra = (s: GameState): boolean => hasTech(s, 'streaming');
const lastUnits = (rel: Release): number => Math.max(0, rel.weekly[rel.weekly.length - 1] ?? 0);

/** Bolo conservado por território: vagas ganham `k`, o resto do território é diluído por `dil` para a soma ficar igual. */
export function conserve21(rows: { u: number; k: number }[], others: number): number {
  const A = rows.reduce((t, x) => t + (x.k - 1) * x.u, 0);
  if (A <= 0 || others <= 0) return 1;
  return clamp(1 - A / others, 0.75, 1);
}

function weekPl(s: GameState, r: Rng): void {
  const st = media21(s);
  if (!streamingEra(s)) { st.pl = {}; st.dil = {}; return; }
  const down = st18(s).down;
  for (const m of MARKETS) {
    const mk = m.id;
    const cand: { rel: Release; sc: number }[] = [];
    let others = 0;
    for (const rel of allReleases17(s)) {
      if (!rel.live || rel.hist || !rel.territories.includes(mk) || !s.acts[rel.actId]) continue;
      const age = s.week - rel.week;
      if (age > POOL_AGE) continue;
      if (age <= PL_AGE && !((down[rel.id] ?? 0) > s.week)) cand.push({ rel, sc: plScore21(s, rel, mk).sc * Math.exp(r.normal(0, 0.12)) });
      others += lastUnits(rel);
    }
    cand.sort((a, b) => b.sc - a.sc);
    const win = cand.slice(0, PL_SLOTS21);
    const rows: PlRow21[] = win.map((x, i) => ({ rel: x.rel.id, sc: x.sc, k: 1 + 0.3 * (1 - i / PL_SLOTS21) }));
    const uw = win.map((x, i) => ({ u: lastUnits(x.rel), k: rows[i].k }));
    others -= uw.reduce((t, x) => t + x.u, 0);
    st.pl[mk] = rows;
    st.dil[mk] = conserve21(uw, others);
    st.cut[mk] = cand[PL_SLOTS21 - 1]?.sc ?? cand[cand.length - 1]?.sc ?? 0;
    st.n.pl += rows.length;
  }
}

/** Fator de playlist de um lançamento (vagas × diluição por território, ponderado pelo tamanho dos mercados). */
export function plFactor21(s: GameState, rel: Release): { k: number; slot: boolean } {
  const st = media21(s);
  let num = 0, den = 0, slot = false;
  const age = s.week - rel.week;
  for (const mk of rel.territories) {
    const w = marketById[mk].size(s.year);
    const row = st.pl[mk]?.find((x) => x.rel === rel.id);
    let k = 1;
    if (row) { k = row.k; slot = true; } else if (age <= POOL_AGE) k = st.dil[mk] ?? 1;
    num += w * k; den += w;
  }
  return { k: den ? num / den : 1, slot };
}

registerMod('chartUnits', 'media21pl', (s, v, c) => {
  const rel = c.release;
  if (!rel || !streamingEra(s) || rel.hist) return null;
  const f = plFactor21(s, rel);
  if (Math.abs(f.k - 1) < 0.003) return null;
  return { value: v * f.k, label: f.slot ? l('Vaga de playlist editorial', 'Editorial playlist slot') : l('Bolo diluído pelas playlists', 'Pool diluted by playlists') };
});

/** Tempo da equipe: pedidos de pitch por mês (2 + um por publicitário). */
export const plBudget21 = (s: GameState): number => 2 + staffCount(s, 'publicist');
export function plAskLeft21(s: GameState): number {
  const st = media21(s);
  const k = `${s.year}-${s.month}`;
  if (st.plMonth.k !== k) st.plMonth = { k, used: 0 };
  return Math.max(0, plBudget21(s) - st.plMonth.used);
}

/** Chance (explicada) de o pitch da equipe render uma vaga no mercado. */
export function plOdds21(s: GameState, rel: Release, mk: MarketId): { p: number; why: L[] } {
  const st = media21(s);
  const me = plScore21(s, rel, mk, true);
  const cut = st.cut[mk] ?? 0;
  const p = clamp(me.sc / (me.sc + cut * 1.1), 0.03, 0.95);
  const why: L[] = me.parts.map((x) => fmtL(l('{a}: ×{v}', '{a}: ×{v}'), { a: x.label as L, v: String(x.value ?? '') }));
  why.push(fmtL(l('Corte da última vaga em {m}: {c} (seu score {v})', 'Last slot cutoff in {m}: {c} (your score {v})'), { m: marketById[mk].name, c: Math.round(cut * 100) / 100, v: Math.round(me.sc * 100) / 100 }));
  return { p, why };
}

/** Pede à equipe um pitch aos curadores: custa tempo da equipe (orçamento mensal), não caixa; reforça a relação por 6 semanas. */
export function plAsk21(s: GameState, relId: string): L {
  const rel = s.releases[relId];
  if (!rel || !mine(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!streamingEra(s)) return l('Ainda não existem playlists editoriais.', 'There are no editorial playlists yet.');
  if (s.week - rel.week > PL_AGE) return l('Tarde demais: as vagas olham as novidades das últimas 10 semanas.', 'Too late: slots look at the last 10 weeks\' releases.');
  const st = media21(s);
  if (st.plAsk[relId] && st.plAsk[relId].w > s.week - 6) return l('A equipe já apresentou este disco aos curadores.', 'The team already pitched this record to curators.');
  if (plAskLeft21(s) <= 0) return fmtL(l('A equipe não tem mais tempo este mês ({n} pitches/mês; mais publicitários, mais pitches).', 'The team has no time left this month ({n} pitches/month; more publicists, more pitches).'), { n: plBudget21(s) });
  st.plMonth.used++;
  st.n.ask++;
  const hm = homeMarket(s) ?? 'na';
  const o = plOdds21(s, rel, hm);
  st.plAsk[relId] = { w: s.week, p: o.p };
  return fmtL(l('A equipe apresentou "{t}" aos curadores: relação ×1,6 por 6 semanas; chance de vaga em {m} agora {p}%. As vagas saem na virada da semana.', 'The team pitched "{t}" to curators: relationship ×1.6 for 6 weeks; slot chance in {m} now {p}%. Slots are decided at the week turn.'), { t: rel.title, m: marketById[hm].name, p: Math.round(o.p * 100) });
}

// ------------------------------------------------------------------ rivais pagam divulgação

function weekRivals(s: GameState, r: Rng): void {
  const st = media21(s);
  const radio = hasTech(s, 'radio'), pl = streamingEra(s);
  if (!radio && !pl) return;
  const cost = money(s, radio ? 2500 : 400);
  let n = 0;
  for (const rel of allReleases17(s)) {
    if (!rel.live || rel.hist || s.week - rel.week > 4 || mine(s, rel)) continue;
    const lb = labelOf(s, rel);
    if (!lb || !lb.active || lb.cash < cost * 4 || (st.rp[rel.id] ?? -99) > s.week - 8) continue;
    if (!r.chance(0.2 + lb.aggression / 250)) continue;
    labelPost(s, lb, -cost, 'promo', radio ? `Divulgação em rádio: ${rel.title}` : `Pitch para playlists: ${rel.title}`);
    st.rp[rel.id] = s.week;
    st.n.rival++;
    if (++n >= 12) break;
  }
  for (const k of Object.keys(st.rp)) if (st.rp[k] < s.week - 12) delete st.rp[k];
}

// ------------------------------------------------------------------ (3) viral 2016+

export const viralOpen21 = (s: GameState): boolean => s.year >= VIRAL_FROM21 && hasTech(s, 'internet');
/** Chance semanal de uma faixa nova viralizar sem campanha (pelo gancho). */
export function viralChance21(s: GameState, rel: Release): number {
  if (!viralOpen21(s) || !rel.live || rel.hist || s.week - rel.week > 8) return 0;
  const act = s.acts[rel.actId];
  if (!act) return 0;
  const hook = leadHook(s, rel);
  const gp = 0.5 + (s.genrePop[act.genre] ?? 0.6);
  return clamp(0.003 * Math.pow(hook / 70, 4) * gp * (rel.type === 'single' ? 1.5 : 1), 0, 0.08);
}

function weekViral(s: GameState, r: Rng): void {
  const st = media21(s);
  for (const [rid, v] of Object.entries(st.viral)) if (s.week >= v.until || !s.releases[rid]) delete st.viral[rid];
  if (!viralOpen21(s)) return;
  let n = 0;
  for (const rel of allReleases17(s)) {
    if (st.viral[rel.id] || n >= 2) continue;
    const p = viralChance21(s, rel);
    if (!p || !r.chance(p)) continue;
    const act = s.acts[rel.actId]!;
    const a3 = countryOfCity(act.city);
    const v: Viral21 = { rel: rel.id, act: act.id, w: s.week, until: s.week + VIRAL_WEEKS, a3, hook: leadHook(s, rel), mine: mine(s, rel), title: rel.title };
    st.viral[rel.id] = v;
    st.log.unshift(v); if (st.log.length > 12) st.log.length = 12;
    st.n.viral++; n++;
    s.genrePop[act.genre] = clamp((s.genrePop[act.genre] ?? 0.6) + 0.08, 0.15, 2.2);
    if (a3) nudge16(s, act.id, a3, 6);
    act.fame = clamp(act.fame + 3, 0, 100);
    act.momentum = clamp(act.momentum + 5, 0, 100);
    const text = fmtL(l('"{t}", de {a}, viraliza nos vídeos curtos sem campanha: o refrão virou trend e o gênero sobe junto.', '"{t}" by {a} goes viral on short video with no campaign: the hook became a trend and the genre rises with it.'), { t: rel.title, a: act.name });
    emitFact(s, { kind: 'chart', actors: [act.id], place: act.city, severity: 45, visibility: 'public', tags: ['media', 'viral', 'good'], src: 'media21', text });
    if (v.mine) notify(s, fmtL(l('{x} Unidades ×1,8 caindo por 8 semanas.', '{x} Units ×1.8 fading over 8 weeks.'), { x: text }), 'good');
  }
}

registerMod('chartUnits', 'media21viral', (s, v, c) => {
  const rel = c.release;
  if (!rel) return null;
  const vr = media21(s).viral[rel.id];
  if (!vr || s.week >= vr.until) return null;
  const k = 1 + 0.8 * ((vr.until - s.week) / VIRAL_WEEKS);
  return { value: v * k, label: l('Viral sem campanha (gancho)', 'Viral with no campaign (hook)') };
});

// ------------------------------------------------------------------ semana + gancho da parada por país

/** Roda a semana da mídia (exportado para os testes). */
export function weekMedia21(s: GameState, r: Rng = rng(s)): void {
  const st = media21(s);
  if (st.week === s.week) return;
  st.week = s.week;
  weekRivals(s, r);
  weekAir(s, r);
  weekPl(s, r);
  weekViral(s, r);
}
registerSimHook('week', 'media21', (s) => weekMedia21(s));

/** Parada do país: airplay no mercado e viral no país de origem pesam na distribuição por país. */
const AIRK = new Map<string, Partial<Record<MarketId, number>>>();
let airkWeek = -1;
countryHook21.media = (s, rel, a3, mk) => {
  const st = (s as unknown as { x4?: { media21?: Media21State } }).x4?.media21;
  if (!st) return 1;
  if (airkWeek !== s.week) { AIRK.clear(); airkWeek = s.week; }
  let m = AIRK.get(rel.id);
  if (!m) {
    m = {};
    for (const mm of MARKETS) { const x = st.air[mm.id]?.find((q) => q.rel === rel.id); if (x?.in) m[mm.id] = 1 + 0.15 * (1 - (x.pos - 1) / (st.slots[mm.id] ?? 10)); }
    AIRK.set(rel.id, m);
  }
  let k = m[mk] ?? 1;
  const v = st.viral[rel.id];
  if (v && s.week < v.until && v.a3 === a3) k *= 1.5;
  return k;
};

// ------------------------------------------------------------------ por quê

registerExplain('media21.air', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')];
  const mk = String(c.mk ?? '') as MarketId;
  if (!rel || !marketById[mk]) return null;
  const sc = airScore21(s, rel, mk);
  const p = airPos21(s, rel.id, mk);
  return { title: fmtL(l('{t} na parada de airplay ({m})', '{t} on the airplay chart ({m})'), { t: rel.title, m: marketById[mk].name }), value: p.pos || '—', fmt: 'text', parts: sc.parts, note: fmtL(l('{n} vagas de rotação disputadas por todos os atos (apelo × fama regional × relação com a estação). Score {v}.', '{n} rotation slots contested by every act (appeal × regional fame × station relationship). Score {v}.'), { n: p.slots, v: Math.round(sc.sc * 100) / 100 }) };
});
registerExplain('media21.pl', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')];
  const mk = String(c.mk ?? '') as MarketId;
  if (!rel || !marketById[mk]) return null;
  const o = plOdds21(s, rel, mk);
  return { title: fmtL(l('Chance de vaga de playlist em {m}', 'Playlist slot chance in {m}'), { m: marketById[mk].name }), value: Math.round(o.p * 100), fmt: 'pct', parts: o.why.map((w) => ({ label: w, value: '', fmt: 'text' as const })), note: l('As vagas ganham unidades; o que ganham sai do bolo de quem ficou fora no mesmo território.', 'Slots gain units; what they gain comes out of the pool of those left out in the same territory.') };
});

/** Atos do jogador fora da parada (pos > vagas) no mercado — para a tela dizer quem perdeu a vaga. */
export function myAirRows21(s: GameState, mk: MarketId): AirRow21[] {
  return (media21(s).air[mk] ?? []).filter((x) => { const rel = s.releases[x.rel]; return rel && mine(s, rel); });
}
