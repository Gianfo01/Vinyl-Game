// Rodada 12 — HYPE unificado: expectativa/atenção de curto prazo (≠ fama, que é de longo prazo, e ≠ qualidade).
// Junta o que já existia (hype do rollout/agenda/feiras nos lançamentos pendentes, hype do selo das feiras,
// "momento" do artista, expectativa do festival) num medidor 0–100 com motivos, que sobe com fatos (nº 1,
// escândalo, morte, viral, rixa, capas) e cai toda semana. Converte em vendas da 1ª semana, procura por
// ingressos, preço de relíquias e atenção da imprensa. Expectativa alta com disco fraco → reação (backlash);
// disco ótimo sem expectativa → sucesso tardio (sleeper). Alavancas do jogador com custo e risco, por época.

import { Rng, clamp } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, notify, post, rememberListeners } from '../util';
import { chronListeners, chronState } from './chron9';
import { relicHook, relics, type Relic } from './relics9';
import { f12, festHypeHook } from './fest12';
import { liveOf, type OwnFestival } from './live/state';
import { w4 } from './world4/state';
import { eventText17, eventValue17, fameWaitText17, launchText17, momentumParts17, rolloutText17 } from '../hype17';

export interface HSrc { k: string; t: L; v: number }
export interface HEnt { s: HSrc[]; p?: number; v?: number; pk?: number }
export interface RelH { a: string; w: number; exp: number; q: number; need: number; bl?: number; sl?: number; emb?: 1; leak?: 1; party?: 1; cr?: 1; nw?: 1 }
export interface Pend12 { emb?: 1; leak?: 1; party?: 1 }
export interface Hype12 { e: Record<string, HEnt>; rel: Record<string, RelH>; pend: Record<string, Pend12>; cd: Record<string, number>; log: { w: number; t: L; up: boolean; k: string }[]; nb: number; ns: number }
declare module '../ext4' { interface Ext4 { hype12: Hype12 } }
const empty = (): Hype12 => ({ e: {}, rel: {}, pend: {}, cd: {}, log: [], nb: 0, ns: 0 });
registerExt4('hype12', empty);
export function hy(s: GameState): Hype12 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const h = (x.hype12 ??= empty()) as Hype12;
  h.e ??= {}; h.rel ??= {}; h.pend ??= {}; h.cd ??= {}; h.log ??= []; h.nb ??= 0; h.ns ??= 0;
  return h;
}

const DECAY: Record<string, number> = { a: 0.88, n: 0.96, r: 0.8, o: 0.9, f: 0.93, l: 0.9, s: 0.9, t: 0.9 };
const sum = (e?: HEnt) => (e ? e.s.reduce((t, x) => t + x.v, 0) : 0);

/** Soma pontos de hype numa entidade (chave "a:ato", "n:ato" = próximo lançamento, "r:disco", "o:relíquia", "f:festival", "s:cidade:gênero"). */
export function addHype(s: GameState, key: string, k: string, t: L, v: number): void {
  const e = (hy(s).e[key] ??= { s: [] });
  const x = e.s.find((z) => z.k === k);
  if (x) { x.v = clamp(x.v + v, -40, 60); x.t = t; } else e.s.push({ k, t, v: clamp(v, -40, 60) });
}

// ------------------------------------------------------------------ medidores

export interface Meter { v: number; parts: { t: L; v: number }[]; tr: number }
const stored = (s: GameState, key: string) => (hy(s).e[key]?.s ?? []).map((x) => ({ t: x.t, v: x.v }));
const pendOf = (s: GameState, actId: string) => s.pendingReleases.filter((p) => p.actId === actId).sort((a, b) => a.week - b.week)[0];
const actBase = (s: GameState, a: Act) => sum(hy(s).e[`a:${a.id}`]) + Math.max(0, a.momentum - 45) * 0.4;

// índice cidade:gênero → atos, só durante o laço semanal (cidade/gênero/morte não mudam dentro dele)
let sceneIx: Map<string, Act[]> | null = null;
function parts(s: GameState, key: string): { t: L; v: number }[] {
  const [k, id, id2] = key.split(':');
  const out = stored(s, key);
  if (k === 'a') {
    const a = s.acts[id];
    if (!a) return out;
    const m = Math.max(0, a.momentum - 45) * 0.4;
    if (m >= 1) out.push(...momentumParts17(s, a, m));
    const pr = pendOf(s, id);
    const n = sum(hy(s).e[`n:${id}`]) + (pr?.hype ?? 0) * 80;
    if (pr && n >= 2) out.push({ t: fmtL(l('Expectativa por "{t}"', 'Anticipation for "{t}"'), { t: pr.title }), v: n * 0.3 });
  } else if (k === 'n') {
    const a = s.acts[id], pr = pendOf(s, id);
    if (pr?.hype) out.push({ t: rolloutText17(s, pr.title), v: pr.hype * 80 });
    if (a) { const b = actBase(s, a) * 0.4; if (b >= 1) out.push({ t: fmtL(l('Hype de {a}', '{a} hype'), { a: a.name }), v: b }); }
    if (a && a.fame >= 4) out.push({ t: fameWaitText17(s, a), v: a.fame * 0.25 });
    if (a?.owner === 'player' && w4(s).hype >= 10) out.push({ t: l('Hype do selo', 'Label hype'), v: w4(s).hype * 0.1 });
  } else if (k === 'o') {
    const rl = relics(s).list.find((x) => x.id === id), a = rl?.a ? s.acts[rl.a] : undefined;
    if (a) out.push({ t: fmtL(l('Fama de {a}', '{a}\'s fame'), { a: a.name }), v: a.fame * 0.2 });
    if (rl?.st === 'auction') out.push({ t: l('Leilão em andamento: colecionadores de olho', 'Auction under way: collectors are watching'), v: 12 });
  } else if (k === 'f') {
    const f = liveOf(s).fests.find((x) => x.id === id);
    if (f) {
      const x = f12(s, f);
      const ann = (x.cyc.hype - 1) * 150;
      if (Math.abs(ann) >= 1) out.push({ t: l('Anúncio e mudanças no line-up', 'Announcement and line-up changes'), v: ann });
      const lu = lineupHype(s, f);
      if (lu >= 1) out.push({ t: l('Atrações em alta no line-up', 'Hot acts on the bill'), v: lu });
      out.push({ t: l('Reputação do festival', 'Festival reputation'), v: f.rep * 0.15 });
    }
  } else if (k === 'l') {
    const roster = id === 'player' ? Object.values(s.acts).filter((a) => a.owner === 'player') : (s.labels[id]?.roster ?? []).map((r) => s.acts[r]).filter(Boolean);
    const top = roster.map((a) => actBase(s, a)).sort((a, b) => b - a).slice(0, 3);
    if (top.length) out.push({ t: l('Artistas do elenco em alta', 'Hot acts on the roster'), v: (top.reduce((t, x) => t + x, 0) / top.length) * 0.6 });
    if (id === 'player' && w4(s).hype >= 1) out.push({ t: l('Feiras e números 1 (hype do selo)', 'Fairs and number ones (label hype)'), v: w4(s).hype * 0.5 });
  } else if (k === 's') {
    const acts = (sceneIx ? sceneIx.get(`${id}:${id2}`) ?? [] : Object.values(s.acts).filter((a) => a.city === id && a.genre === id2 && !a.deceased)).map((a) => actBase(s, a)).sort((a, b) => b - a).slice(0, 3);
    if (acts.length) out.push({ t: l('Artistas da cena em alta', 'Hot acts in the scene'), v: (acts.reduce((t, x) => t + x, 0) / acts.length) * 0.8 });
  } else if (k === 't') {
    const tr = s.tours.find((x) => x.id === id), a = tr && s.acts[tr.actId];
    if (a) out.push({ t: fmtL(l('Hype de {a}', '{a} hype'), { a: a.name }), v: actBase(s, a) * 0.8 });
    if (tr) { const st = tr.stops.filter((x) => x.status === 'played'); const fill = st.length ? st.reduce((t, x) => t + x.sold / Math.max(1, x.capacity), 0) / st.length : 0; if (fill > 0.9) out.push({ t: l('Datas esgotadas', 'Sold-out dates'), v: 12 }); }
  }
  return out.filter((x) => Math.abs(x.v) >= 0.5).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

/** Medidor 0–100 com tendência (vs. semana anterior) e os motivos. */
export function hypeOf(s: GameState, key: string): Meter {
  const ps = parts(s, key);
  const v = clamp(Math.round(ps.reduce((t, x) => t + x.v, 0)), 0, 100);
  const e = hy(s).e[key];
  return { v, parts: ps, tr: e?.p !== undefined ? v - e.p : 0 };
}
export const actHype = (s: GameState, actId: string) => hypeOf(s, `a:${actId}`).v;

function lineupHype(s: GameState, f: OwnFestival): number {
  const acts = Object.values(f12(s, f).deals).map((d) => s.acts[d.actId]).filter(Boolean).map((a) => actBase(s, a)).sort((a, b) => b - a).slice(0, 3);
  return acts.length ? (acts.reduce((t, x) => t + x, 0) / acts.length) * 0.7 : 0;
}

// ------------------------------------------------------------------ expectativa x qualidade

/** Qualidade que o público espera dado o hype (0–100). */
export const needQ = (exp: number) => Math.round(32 + exp * 0.45);
const upcomingQ = (s: GameState, songs: string[]) => {
  const qs = songs.map((id) => s.songs[id]?.q ?? 0).sort((a, b) => b - a);
  return qs.length ? qs[0] * 0.5 + (qs.reduce((t, x) => t + x, 0) / qs.length) * 0.5 : 0;
};
export function pendingExpect(s: GameState, actId: string): { exp: number; q: number; need: number } | null {
  const pr = pendOf(s, actId);
  if (!pr) return null;
  const exp = hypeOf(s, `n:${actId}`).v;
  return { exp, q: Math.round(upcomingQ(s, pr.songs)), need: needQ(exp) };
}

registerSimHook('launch', 'hype12', (s, _r, { release: rel }) => {
  if (!rel || rel.reissueOf || rel.hist) return;
  const st = hy(s);
  const act = s.acts[rel.actId];
  const n = st.e[`n:${rel.actId}`];
  const extra = sum(n);
  // a parte "rollout" já entrou no apelo pelo market.ts (hypeBoost); aqui só o que é deste sistema
  const derived = Math.max(0, ((rel.hypeBoost ?? 1) - 1) * 80) + (act ? actBase(s, act) * 0.4 + act.fame * 0.25 : 0) + (rel.owner === 'player' && w4(s).hype >= 10 ? w4(s).hype * 0.1 : 0);
  const exp = clamp(Math.round(extra + derived), 0, 100);
  if (extra > 2) {
    const k = 1 + Math.min(0.25, extra / 300);
    rel.appeal *= k;
    (rel.autopsy ??= []).push({ key: 'hype12', label: l('Expectativa (teasers, audição, imprensa)', 'Anticipation (teasers, listening party, press)'), value: k, confidence: 'medium' });
  }
  const p = st.pend[rel.actId] ?? {};
  const rh: RelH = { a: rel.actId, w: rel.week, exp, q: Math.round(rel.q), need: needQ(exp), ...p };
  const gap = rel.q - rh.need;
  if (exp >= 40 && gap < -6) rh.bl = Math.round(clamp((-gap - 6) / 22, 0.15, 1) * (p.party ? 0.7 : 1) * 100) / 100;
  else if (exp < 22 && rel.q >= 80) rh.sl = Math.round(clamp((rel.q - 74) / 20, 0.15, 1) * 100) / 100;
  st.rel[rel.id] = rh;
  if (exp >= 5) st.e[`r:${rel.id}`] = { s: [{ k: 'exp', t: launchText17(s, rel, exp), v: exp }] };
  delete st.e[`n:${rel.actId}`];
  delete st.pend[rel.actId];
});

const wkOf = (s: GameState, rel: Release) => s.week - rel.week;
/** Hype vira vendas da 1ª semana (e queima depois); backlash derruba rápido; sleeper cresce devagar. */
registerMod('chartUnits', 'hype12', (s, v, { release: rel }) => {
  const rh = rel && hy(s).rel[rel.id];
  if (!rel || !rh) return null;
  const wk = wkOf(s, rel);
  let m = 1;
  if (wk <= 1) m *= 1 + rh.exp / 100 * 0.35;
  else if (wk <= 6) m *= 1 - rh.exp / 100 * 0.1;
  if (wk === 0 && rh.leak) m *= s.year >= 1999 ? 0.88 : 0.95;
  if (rh.bl) {
    const start = rh.emb ? 2 : 1;
    if (wk === 0 && !rh.emb) m *= 1 - rh.bl * 0.2;
    if (wk >= start) m *= 1 - rh.bl * 0.5 * Math.min(1, (wk - start + 1) / 3);
  }
  if (rh.sl && wk >= 3) m *= 1 + rh.sl * (rh.emb ? 0.3 : 0.5) * Math.min(1, (wk - 2) / 5) * (wk > 20 ? Math.max(0, 1 - (wk - 20) / 12) : 1);
  if (Math.abs(m - 1) < 0.005) return null;
  return { value: v * m, label: rh.bl && wk >= 1 ? l('Reação ao hype (expectativa maior que o disco)', 'Hype backlash (expectation above the record)') : rh.sl && wk >= 3 ? l('Boca a boca de sucesso tardio', 'Sleeper-hit word of mouth') : l('Hype da estreia', 'Debut hype') };
});

/** Procura por ingressos: hype do artista (e da turnê). */
registerMod('cityDemand', 'hype12', (s, v, { act }) => {
  if (!act) return null;
  const h = actBase(s, act);
  if (h < 20) return null;
  return { value: v * (1 + Math.min(0.3, (h - 20) / 270)), label: l('Hype do artista', 'Artist hype') };
});

/** Relíquias: hype sobe o preço (leilão, pedida e arremate). */
relicHook.f = (s: GameState, rl: Relic) => 1 + hypeOf(s, `o:${rl.id}`).v / 150;
/** Festival próprio: line-up em alta e fatos somam à expectativa do anúncio (já contada no fest12). */
festHypeHook.f = (s: GameState, f: OwnFestival) => {
  const v = lineupHype(s, f) + sum(hy(s).e[`f:${f.id}`]);
  if (v < 3) return null;
  const k = clamp(1 + (v - 10) / 250, 0.95, 1.3);
  return { k, why: fmtL(l('Hype do line-up: {p}% de procura.', 'Line-up hype: {p}% demand.'), { p: `${k >= 1 ? '+' : ''}${Math.round((k - 1) * 100)}` }) };
};

// ------------------------------------------------------------------ fatos que geram hype

const EV: Record<string, [number, L]> = {
  number1: [22, l('Número 1 nas paradas', 'Number one on the charts')], no1_country: [10, l('Número 1 num país', 'Number one in a country')],
  award: [14, l('Prêmio', 'Award')], award2: [14, l('Prêmio', 'Award')], nat_award: [10, l('Prêmio nacional', 'National award')], nominated: [6, l('Indicação a prêmio', 'Award nomination')],
  hall_of_fame: [10, l('Hall da fama', 'Hall of fame')], death: [40, l('Comoção pela morte', 'Grief over a death')], posthumous: [15, l('Lançamento póstumo', 'Posthumous release')],
  scandal: [18, l('Escândalo nos jornais', 'Scandal in the papers')], voice_scandal: [14, l('Escândalo', 'Scandal')], cover_scandal: [12, l('Polêmica', 'Controversy')], era_scandal: [14, l('Polêmica da época', 'Period controversy')],
  blackmail_exposed: [12, l('Segredo exposto', 'Secret exposed')], viral: [30, l('Viralizou', 'Went viral')], viral8: [30, l('Viralizou', 'Went viral')],
  breakthrough_show: [12, l('Show da virada', 'Breakthrough show')], legendary_show: [15, l('Show lendário', 'Legendary show')], comeback: [25, l('Volta por cima', 'Comeback')],
  reunion: [28, l('Reunião da banda', 'Band reunion')], split: [16, l('Fim da banda', 'Band split')], breakup: [10, l('Separação', 'Breakup')], member_quits: [8, l('Integrante sai', 'Member quits')],
  magazine_cover: [10, l('Capa de revista', 'Magazine cover')], tv: [8, l('Na TV', 'On TV')], interview: [5, l('Entrevista', 'Interview')], radio_visit: [5, l('Visita a rádios', 'Radio visit')],
  documentary: [10, l('Documentário', 'Documentary')], collab: [8, l('Parceria', 'Collaboration')], feat: [8, l('Participação especial', 'Feature')], supergroup: [25, l('Supergrupo', 'Supergroup')],
  rehab: [6, l('Reabilitação', 'Rehab')], addiction: [8, l('Vício nos jornais', 'Addiction in the papers')], lawsuit: [6, l('Processo', 'Lawsuit')], festival_tv: [10, l('Festival na TV', 'Festival on TV')],
  mega_event: [12, l('Megaevento', 'Mega event')], liveaid: [15, l('Show beneficente histórico', 'Historic benefit show')], clip: [8, l('Videoclipe', 'Music video')], tribute: [8, l('Tributo', 'Tribute')],
  revival: [15, l('Redescoberta', 'Revival')], rediscovery: [15, l('Redescoberta', 'Rediscovery')], cert: [6, l('Certificado de vendas', 'Sales certification')], sellout: [8, l('Ingressos esgotados', 'Sold out')],
};
const RELIC_EV: Record<string, [number, L]> = {
  death: [35, l('Morte do dono: todo mundo quer um pedaço da lenda', 'The owner died: everyone wants a piece of the legend')],
  scandal: [12, l('Escândalo do dono rende manchetes', 'The owner\'s scandal makes headlines')], reunion: [10, l('Reunião da banda', 'Band reunion')], hall_of_fame: [10, l('Hall da fama', 'Hall of fame')],
};
rememberListeners().push((s, e) => {
  const ev = EV[e.kind];
  if (!ev || !e.actId || !s.acts[e.actId]) return;
  addHype(s, `a:${e.actId}`, e.kind, eventText17(ev[1], e.text), eventValue17(ev[0], s.acts[e.actId]));
  const rv = RELIC_EV[e.kind];
  if (rv) for (const rl of relics(s).list) if (rl.a === e.actId && rl.st !== 'lost') addHype(s, `o:${rl.id}`, e.kind, rv[1], rv[0]);
});
chronListeners().push((s, e) => {
  if ((e.k === 'scene_born' || e.k === 'rise') && e.c && e.g) addHype(s, `s:${e.c}:${e.g}`, e.k, e.k === 'scene_born' ? l('Cena nasce: todo mundo quer ver', 'A scene is born: everyone wants to see it') : l('Um nome surge na cena', 'A name rises in the scene'), e.k === 'scene_born' ? 25 : 10);
});

// ------------------------------------------------------------------ semana: decaimento, notícias, atenção

const viralWord = (s: GameState): L => s.year >= 2006 ? l('viralizou', 'went viral') : s.year >= 1955 ? l('virou febre', 'is all the rage') : l('é o assunto da cidade', 'is the talk of the town');
function logNews(s: GameState, k: string, t: L, up: boolean): void {
  const st = hy(s);
  if (st.log.some((x) => x.k === k && s.week - x.w < 12)) return;
  st.log.unshift({ w: s.week, t, up, k });
  if (st.log.length > 30) st.log.length = 30;
  notify(s, t, up ? 'info' : 'bad');
}
export function nameOfKey(s: GameState, key: string): string {
  const [k, id, id2] = key.split(':');
  if (k === 'a' || k === 'n') return s.acts[id]?.name ?? '?';
  if (k === 'r') return s.releases[id]?.title ?? '?';
  if (k === 'o') return relics(s).list.find((x) => x.id === id)?.n.pt ?? '?';
  if (k === 'f') return liveOf(s).fests.find((x) => x.id === id)?.name ?? '?';
  if (k === 'l') return id === 'player' ? s.config.companyName : s.labels[id]?.name ?? '?';
  if (k === 's') return `${id} · ${id2}`;
  if (k === 't') return s.tours.find((x) => x.id === id)?.name ?? '?';
  return key;
}

/** Entidades acompanhadas (para tendência, ranking e notícias). */
export function tracked(s: GameState): string[] {
  const st = hy(s), keys = new Set(Object.keys(st.e));
  for (const a of Object.values(s.acts)) if (!a.deceased && (a.owner === 'player' || a.momentum >= 60)) keys.add(`a:${a.id}`);
  for (const p of s.pendingReleases) keys.add(`n:${p.actId}`);
  for (const rl of relics(s).list) if (rl.st === 'auction') keys.add(`o:${rl.id}`);
  for (const f of liveOf(s).fests) keys.add(`f:${f.id}`);
  for (const t of s.tours) if (t.status === 'running' || t.status === 'planned') keys.add(`t:${t.id}`);
  keys.add('l:player');
  for (const lb of Object.values(s.labels)) if (lb.active) keys.add(`l:${lb.id}`);
  for (const k of Object.keys(chronState(s).sc)) keys.add(`s:${k}`);
  return [...keys];
}

registerSimHook('week', 'hype12', (s) => {
  const st = hy(s);
  let news = 0;
  sceneIx = new Map();
  for (const a of Object.values(s.acts)) if (!a.deceased) { const k = `${a.city}:${a.genre}`; const xs = sceneIx.get(k); if (xs) xs.push(a); else sceneIx.set(k, [a]); }
  try { for (const key of tracked(s)) {
    const e = (st.e[key] ??= { s: [] });
    const v = hypeOf(s, key).v;
    const mine = key === 'l:player' || key.startsWith('f:') || (key.startsWith('a:') && s.acts[key.slice(2)]?.owner === 'player') || (key.startsWith('o:') && relics(s).list.find((x) => x.id === key.slice(2))?.st === 'player');
    const big = key.startsWith('a:') && (s.acts[key.slice(2)]?.fame ?? 0) >= 55;
    if (e.v !== undefined && e.v < 70 && v >= 70 && (mine || big) && news < 2) { news++; logNews(s, `up:${key}`, fmtL(l('{n} {w}: hype {v}.', '{n} {w}: hype {v}.'), { n: nameOfKey(s, key), w: viralWord(s), v }), true); }
    e.pk = Math.max(e.pk ?? 0, v);
    if ((e.pk ?? 0) >= 65 && v < e.pk! * 0.45) { if (mine && news < 2) { news++; logNews(s, `pop:${key}`, fmtL(l('A bolha de {n} murchou: hype de {a} para {b}.', 'The {n} bubble deflated: hype from {a} to {b}.'), { n: nameOfKey(s, key), a: e.pk!, b: v }), false); } e.pk = v; }
    e.p = e.v ?? v; e.v = v;
    // atenção da imprensa: hype alto vira um pouco de fama de verdade
    if (key.startsWith('a:') && v >= 60) { const a = s.acts[key.slice(2)]; if (a) a.fame = clamp(a.fame + (v - 60) / 400, 0, 100); }
    const d = DECAY[key[0]] ?? 0.9;
    for (const x of e.s) x.v *= d;
    e.s = e.s.filter((x) => Math.abs(x.v) >= 0.5);
    if (!e.s.length && v < 3) delete st.e[key];
  } } finally { sceneIx = null; }
  // reação e sucesso tardio: notícias, crítica mais dura, fama/confiança
  for (const [id, rh] of Object.entries(st.rel)) {
    const rel = s.releases[id], a = s.acts[rh.a];
    if (!rel || s.week - rh.w > 40) { delete st.rel[id]; continue; }
    const wk = s.week - rh.w;
    const mine = rel.owner === 'player' || !!a?.playerBand;
    if (rh.bl && !rh.cr && rel.critic !== undefined && wk >= (rh.emb ? 2 : 1)) { rel.critic = clamp(rel.critic - Math.round(rh.bl * (rh.emb ? 8 : 12)), 0, 100); rh.cr = 1; }
    if (rh.bl && !rh.nw && wk >= (rh.emb ? 2 : 1)) {
      rh.nw = 1; st.nb++;
      if (a) { a.fame = clamp(a.fame - rh.bl * 3, 0, 100); a.trust = clamp(a.trust - (mine ? rh.bl * 5 : 0), 0, 100); addHype(s, `a:${a.id}`, 'backlash', l('Ressaca do hype: o disco não entregou', 'Hype hangover: the record did not deliver'), -rh.bl * 25); }
      if (mine) s.player.reputation.artistic = clamp(s.player.reputation.artistic - rh.bl * 2, 0, 100);
      if (mine || (a?.fame ?? 0) >= 55) logNews(s, `bl:${id}`, fmtL(l('A bolha estourou: "{t}" de {a} prometia (expectativa {e}) e entregou qualidade {q}. Crítica dura, vendas despencam.', 'The bubble burst: "{t}" by {a} promised a lot (anticipation {e}) and delivered quality {q}. Harsh reviews, sales dive.'), { t: rel.title, a: a?.name ?? '?', e: rh.exp, q: rh.q }), false);
    }
    if (rh.sl && !rh.nw && wk >= 6) {
      rh.nw = 1; st.ns++;
      if (a) addHype(s, `a:${a.id}`, 'sleeper', fmtL(l('Sucesso tardio de "{t}"', 'Sleeper hit "{t}"'), { t: rel.title }), 15 * rh.sl + 5);
      if (mine || (a?.fame ?? 0) >= 45) logNews(s, `sl:${id}`, fmtL(l('Sucesso tardio: "{t}" de {a} saiu sem alarde (expectativa {e}) e cresce no boca a boca.', 'Sleeper hit: "{t}" by {a} came out quietly (anticipation {e}) and grows by word of mouth.'), { t: rel.title, a: a?.name ?? '?', e: rh.exp }), true);
    }
  }
  for (const [k, w] of Object.entries(st.cd)) if (s.week - w > 60) delete st.cd[k];
  for (const id of Object.keys(st.pend)) if (!pendOf(s, id)) delete st.pend[id];
});

// ------------------------------------------------------------------ alavancas do jogador

export type Lever = 'teaser' | 'leak' | 'feud' | 'party' | 'embargo';
export interface LeverInfo { id: Lever; name: L; fx: L; cost: number; ok: boolean; why?: L }
const social = (s: GameState) => s.year >= 2006;
const teaserName = (s: GameState): L => s.year < 1950 ? l('Anúncios no rádio e no jornal', 'Radio and newspaper ads') : s.year < 1981 ? l('Cartazes, rádio e TV', 'Posters, radio and TV') : s.year < 1997 ? l('Clipe-teaser na TV musical', 'Teaser clip on music TV') : !social(s) ? l('Site oficial e trailers', 'Official site and trailers') : l('Contagem regressiva nas redes sociais', 'Social media countdown');
const CD: Record<Lever, number> = { teaser: 4, leak: 26, feud: 26, party: 12, embargo: 0 };
const leverCost = (s: GameState, a: Act, id: Lever) => id === 'teaser' ? money(s, (2500 + a.fame * 50) * (social(s) ? 0.6 : 1)) : id === 'feud' ? money(s, 2000) : id === 'party' ? money(s, 4000 + a.fame * 60) : 0;
const feudTarget = (s: GameState, a: Act): Act | undefined => Object.values(s.acts).filter((b) => b.id !== a.id && b.owner !== 'player' && !b.playerBand && !b.deceased && b.status !== 'retired' && b.status !== 'split' && Math.abs(b.fame - a.fame) <= 25)
  .sort((x, y) => (familyOf(y.genre) === familyOf(a.genre) ? 20 : 0) + y.fame - ((familyOf(x.genre) === familyOf(a.genre) ? 20 : 0) + x.fame) || (x.id < y.id ? -1 : 1))[0];

export function levers(s: GameState, actId: string): LeverInfo[] {
  const a = s.acts[actId], st = hy(s);
  if (!a || a.owner !== 'player') return [];
  const pr = pendOf(s, actId), p = st.pend[actId] ?? {};
  const cdOk = (id: Lever) => s.week - (st.cd[`${id}:${actId}`] ?? -999) >= CD[id];
  const need = (id: Lever, cond: boolean, why: L): Pick<LeverInfo, 'ok' | 'why'> => !cond ? { ok: false, why } : !cdOk(id) ? { ok: false, why: l('Cedo demais: o público ainda lembra da última.', 'Too soon: people still remember the last one.') } : s.player.cash < leverCost(s, a, id) ? { ok: false, why: l('Caixa insuficiente.', 'Not enough cash.') } : { ok: true };
  const tg = feudTarget(s, a);
  const out: LeverInfo[] = [
    { id: 'teaser', name: teaserName(s), fx: social(s) ? l('+10 a +32 de hype (as redes são imprevisíveis). Vai para o próximo lançamento, ou para o artista se não houver.', '+10 to +32 hype (social media is unpredictable). Goes to the next release, or the artist if none.') : l('+16 de hype, previsível. Vai para o próximo lançamento, ou para o artista se não houver.', '+16 hype, predictable. Goes to the next release, or the artist if none.'), cost: leverCost(s, a, 'teaser'), ...need('teaser', true, l('', '')) },
    { id: 'party', name: l('Audição exclusiva (imprensa e fãs)', 'Exclusive listening party (press and fans)'), fx: l('Revela a qualidade antes: disco bom → +20 e crítica mais branda se houver reação; disco fraco → a sala sai calada (−10).', 'Reveals quality early: good record → +20 and softer critics if backlash comes; weak record → the room goes quiet (−10).'), cost: leverCost(s, a, 'party'), ...need('party', !!pr && !p.party, pr ? l('Já houve audição para este disco.', 'Already held for this record.') : l('Precisa de um lançamento agendado.', 'Needs a scheduled release.')) },
  ];
  if (s.year >= 1960) out.push({ id: 'embargo', name: p.emb ? l('Retirar embargo de resenhas', 'Lift the review embargo') : l('Embargo de resenhas', 'Review embargo'), fx: l('Sem prévias para a imprensa: −6 de hype agora, mas a 1ª semana vende antes das críticas (reação chega uma semana depois e mais fraca). Um sucesso tardio também cresce menos.', 'No press previews: −6 hype now, but week one sells before the reviews (backlash lands a week later and softer). A sleeper hit also grows less.'), cost: 0, ...need('embargo', !!pr, l('Precisa de um lançamento agendado.', 'Needs a scheduled release.')) });
  if (s.year >= 1965) out.push({ id: 'leak', name: s.year >= 1999 ? l('Vazar na internet "sem querer"', '"Accidentally" leak online') : l('Fita "vazada" para DJs', '"Leaked" tape to DJs'), fx: l('De graça: disco bom → +25; fraco → +8 e o público já sabe. Pirataria tira vendas da estreia; 20% de chance de o artista descobrir (confiança −6).', 'Free: good record → +25; weak → +8 and people already know. Piracy cuts debut sales; 20% chance the artist finds out (trust −6).'), cost: 0, ...need('leak', !!pr && !p.leak, pr ? l('Já vazou.', 'Already leaked.') : l('Precisa de um lançamento agendado.', 'Needs a scheduled release.')) });
  if (s.year >= 1955) out.push({ id: 'feud', name: tg ? fmtL(l('Rixa encenada com {b}', 'Staged feud with {b}'), { b: tg.name }) : l('Rixa encenada', 'Staged feud'), fx: l('+28 de hype para os dois lados. 25% de chance (35% na era das redes) de a armação vazar: confiança −6, reputação institucional −3 e o hype vira vexame.', '+28 hype to both sides. 25% chance (35% in the social era) the setup leaks: trust −6, institutional reputation −3 and the hype turns to embarrassment.'), cost: leverCost(s, a, 'feud'), ...need('feud', !!tg, l('Nenhum rival à altura.', 'No rival of matching stature.')) });
  return out;
}

export function useLever(s: GameState, actId: string, id: Lever): L {
  const info = levers(s, actId).find((x) => x.id === id), a = s.acts[actId], st = hy(s);
  if (!info || !a) return l('Indisponível.', 'Unavailable.');
  if (!info.ok) return info.why ?? l('Indisponível.', 'Unavailable.');
  const r = Rng.fromSeed(`${s.config.seed}:hype12:${id}:${actId}:${s.week}`);
  const pr = pendOf(s, actId), p = (st.pend[actId] ??= {});
  const key = pr ? `n:${actId}` : `a:${actId}`;
  const q = pr ? upcomingQ(s, pr.songs) : 0;
  if (info.cost && !post(s, `hype12:${id}:${actId}`, -info.cost, 'marketing', `Hype: ${id} ${a.name}`)) return l('Já feito nesta semana.', 'Already done this week.');
  st.cd[`${id}:${actId}`] = s.week;
  if (id === 'teaser') {
    const v = social(s) ? Math.round(r.float(10, 32)) : 16;
    addHype(s, key, 'teaser', teaserName(s), v);
    return fmtL(l('Campanha no ar: +{v} de hype.', 'Campaign live: +{v} hype.'), { v });
  }
  if (id === 'party') {
    p.party = 1;
    if (q >= 62) { addHype(s, key, 'party', l('Audição exclusiva elogiada', 'Praised listening party'), 20); return l('A sala aplaudiu de pé: +20 de hype e a crítica chega com boa vontade.', 'The room gave a standing ovation: +20 hype and critics arrive in a good mood.'); }
    if (q >= 50) { addHype(s, key, 'party', l('Audição morna', 'Lukewarm listening party'), 4); return l('Reação morna: +4 de hype. Ninguém saiu falando do disco.', 'Lukewarm reaction: +4 hype. Nobody left talking about the record.'); }
    addHype(s, key, 'party', l('Audição: a imprensa saiu calada', 'Listening party: the press left in silence'), -10);
    return l('A imprensa saiu calada: −10 de hype. Melhor saber agora do que na estreia.', 'The press left in silence: −10 hype. Better to know now than on release day.');
  }
  if (id === 'embargo') {
    if (p.emb) { delete p.emb; addHype(s, key, 'emb', l('Embargo de resenhas', 'Review embargo'), 6); return l('Embargo retirado.', 'Embargo lifted.'); }
    p.emb = 1; addHype(s, key, 'emb', l('Embargo de resenhas: menos prévias', 'Review embargo: fewer previews'), -6);
    return l('Embargo valendo: as resenhas só saem depois da estreia.', 'Embargo on: reviews only after release.');
  }
  if (id === 'leak') {
    p.leak = 1;
    const good = q >= 60;
    addHype(s, key, 'leak', s.year >= 1999 ? l('Vazamento na internet', 'Online leak') : l('Fita vazada circula entre DJs', 'Leaked tape circulates among DJs'), good ? 25 : 8);
    let msg = good ? l('O vazamento pegou fogo: +25 de hype.', 'The leak caught fire: +25 hype.') : l('Vazou, e o público achou "ok": +8 de hype.', 'It leaked, and people found it "fine": +8 hype.');
    if (r.chance(0.2)) { a.trust = clamp(a.trust - 6, 0, 100); msg = fmtL(l('{m} Mas {a} descobriu que foi o selo (confiança −6).', '{m} But {a} found out it was the label (trust −6).'), { m: msg, a: a.name }); }
    return msg;
  }
  // rixa encenada
  const tg = feudTarget(s, a)!;
  addHype(s, key, 'feud', fmtL(l('Rixa pública com {b}', 'Public feud with {b}'), { b: tg.name }), 28);
  addHype(s, `a:${tg.id}`, 'feud', fmtL(l('Rixa pública com {b}', 'Public feud with {b}'), { b: a.name }), 28);
  if (r.chance(social(s) ? 0.35 : 0.25)) {
    a.trust = clamp(a.trust - 6, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    addHype(s, key, 'feud', l('Rixa armada desmascarada', 'Staged feud exposed'), -38);
    logNews(s, `feud:${actId}`, fmtL(l('Desmascarada: a rixa entre {a} e {b} era jogada do selo. A bolha estourou.', 'Exposed: the {a}–{b} feud was a label stunt. The bubble burst.'), { a: a.name, b: tg.name }), false);
    return l('A armação vazou: a rixa virou piada e o hype despencou.', 'The setup leaked: the feud became a joke and the hype collapsed.');
  }
  logNews(s, `feud:${actId}`, fmtL(l('{a} e {b} trocam farpas em público: todo mundo escolhe um lado.', '{a} and {b} trade barbs in public: everyone is picking a side.'), { a: a.name, b: tg.name }), true);
  return fmtL(l('A rixa com {b} pegou: +28 de hype para os dois.', 'The feud with {b} caught on: +28 hype for both.'), { b: tg.name });
}

/** Ranking de hype por categoria (para a aba Hype nas paradas). */
export function ranking(s: GameState): { cat: string; key: string; name: string; m: Meter }[] {
  return tracked(s).map((key) => ({ cat: key[0], key, name: nameOfKey(s, key), m: hypeOf(s, key) })).filter((x) => x.m.v >= 5 && x.name !== '?').sort((a, b) => b.m.v - a.m.v);
}
