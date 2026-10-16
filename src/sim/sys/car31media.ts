// R31 · onda 3 (CAR) — RÁDIO, TV E REVISTA PRÓPRIAS COMO MERCADO DE VERDADE (interruptor car31.media).
//
// A sua rádio entra no mercado do radio18, numa cidade e com um formato da época (rede ao vivo, Top 40, adulto,
// rock de álbum, urbana, country, universitária, latina, rítmica). A decisão-assinatura é a GRADE DA SEMANA: quais
// FAIXAS (de qualquer selo) tocam e em que rotação — pesada, média, leve ou "aposta" —, com poucas vagas por formato.
//   • audiência: participação disputada na cidade contra as rádios rivais (as estações do radio18), pelo encaixe da
//     grade com o gosto do país, o sucesso das faixas, o cansaço da rotação pesada, a credibilidade e o tamanho;
//   • ibope por trimestre (posição entre as rivais); a receita de anúncio segue a audiência;
//   • execuções = audiência × alcance × rotação × peso do rádio na época → função única (car31.ts): paradas do país e
//     fama local;
//   • tensões: sucesso segura audiência mas não dá prestígio; aposta custa audiência agora e, se a faixa estourar no
//     país, dá fama de "ouvido de ouro"; pesada demais cansa; quem lidera é copiado pelas rivais; jabá por faixa com
//     risco legal por país e época; tocar o seu selo custa audiência (e vale menos: conflito de interesse);
//   • diretor de programação: a responsabilidade 'radio' da delegação única (deleg31) monta a grade pela diretriz.
// TV (programa e, de 1981, rotação de clipes) e revista (capa + resenhas, pela tiragem) usam o mesmo esqueleto.
// Determinismo: sorte só por Rng.fromSeed('semente|car31|…'); a interface só lê (power31/share alvo são puros).

import { Rng, clamp } from '../../core/rng';
import { countryInfoByA3, countryTaste } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { familyOf, l, type L } from '../../data/world';
import { nextMonthWeek19, registerDeadline, type Deadline19 } from '../calendar19';
import { dirOf31, logAuto31, modeOf31, staffFor31 } from '../deleg31';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import { allReleases17 } from '../relidx17';
import type { Act, GameState, Release } from '../types';
import { fmtL, hasTech, money } from '../util';
import { car31On, careerSw31, exec31, registerExec31, touch31 } from './car31';
import { board } from './charts7';
import { FMT18, fmtsNow18, radioWeight18, stationReach18, type Fmt18, type Radio18State, type Station18 } from './radio18';
import { tvHeavy18, type Media18State } from './media18';
import { MEDIA, MEDIA9X, isConglomerate, ventures, vpay, type Venture } from './ventures9';

// ---------------------------------------------------------------- dados

export type Rot31 = 'heavy' | 'mid' | 'light' | 'bet';
export const ROTS31: Rot31[] = ['heavy', 'mid', 'light', 'bet'];
export const ROT_W31: Record<Rot31, number> = { heavy: 1, mid: 0.6, light: 0.3, bet: 0.4 };
export type MKind31 = 'radio' | 'tv' | 'magazine' | 'web';
export type Fmt31 = Fmt18 | 'tv' | 'mag' | 'web';
const ROT_NAME: Record<MKind31, Record<Rot31, L>> = {
  radio: { heavy: l('Rotação pesada', 'Heavy rotation'), mid: l('Rotação média', 'Medium rotation'), light: l('Rotação leve', 'Light rotation'), bet: l('Aposta', 'Bet') },
  tv: { heavy: l('Atração principal / clipe em destaque', 'Headline spot / featured video'), mid: l('Clipe na grade', 'Video on the grid'), light: l('Nota rápida', 'Quick mention'), bet: l('Aposta (estreia)', 'Bet (debut)') },
  magazine: { heavy: l('Capa', 'Cover'), mid: l('Matéria', 'Feature'), light: l('Resenha', 'Review'), bet: l('Aposta (revelação)', 'Bet (breakout)') },
  web: { heavy: l('Destaque', 'Feature'), mid: l('Na lista', 'On the list'), light: l('Menção', 'Mention'), bet: l('Aposta', 'Bet') },
};
export const rotName31 = (k: MKind31, r: Rot31): L => ROT_NAME[k][r];
export const SLOTS31: Record<Fmt31, Record<Rot31, number>> = {
  network: { heavy: 3, mid: 4, light: 0, bet: 1 }, top40: { heavy: 6, mid: 8, light: 6, bet: 2 }, adult: { heavy: 4, mid: 8, light: 6, bet: 1 },
  aor: { heavy: 3, mid: 6, light: 10, bet: 2 }, urban: { heavy: 5, mid: 7, light: 6, bet: 3 }, country: { heavy: 4, mid: 7, light: 6, bet: 2 },
  college: { heavy: 0, mid: 4, light: 14, bet: 6 }, latin: { heavy: 5, mid: 7, light: 6, bet: 2 }, dance: { heavy: 5, mid: 7, light: 6, bet: 3 },
  tv: { heavy: 3, mid: 5, light: 0, bet: 1 }, mag: { heavy: 1, mid: 2, light: 6, bet: 1 }, web: { heavy: 2, mid: 4, light: 6, bet: 3 },
};
export const FMT_NAME31: Record<Fmt31, L> = {
  ...(Object.fromEntries(Object.entries(FMT18).map(([k, d]) => [k, d.name])) as Record<Fmt18, L>),
  tv: l('Programa e clipes', 'Shows and videos'), mag: l('Capa e resenhas', 'Cover and reviews'), web: l('Destaques e listas', 'Features and lists'),
};
/** aposta só vale para artista novo (fama abaixo disto quando entra) */
export const BET_FAME31 = 35;
/** semanas em rotação pesada antes de cansar */
export const BURN_W31 = 8;

// ---------------------------------------------------------------- rodada 2 do CAR: clipes e cidades (interruptores)

careerSw31('clips', l('TV: a rotação de clipes da sua TV usa o clipe do jogo (qualidade conta, banido não entra, destaque vira rotação pesada).', 'TV: your TV\'s video rotation uses the game\'s music video (quality counts, banned ones stay off, featured means heavy rotation).'));
careerSw31('cities', l('Rádio: as rádios rivais têm cidade; a audiência é disputada cidade a cidade e quem perde ouvintes perde alcance.', 'Radio: rival stations have a city; listeners are fought over city by city and whoever loses them loses reach.'));

const vidsRo = (s: GameState): Media18State['vids'] => (s as unknown as { x4?: { media18?: Media18State } }).x4?.media18?.vids ?? {};
/** Peso do clipe na TV (car31.clips): o clipe que o jogo guarda (media18) — qualidade, banido = fora; disco seu sem clipe
 *  rende pouco na era dos clipes; faixas dos outros selos têm o clipe do mundo (médio). */
export function clipK31(s: GameState, v: Venture, rel: Release): number {
  if (kindOf31(v) !== 'tv' || !car31On(s, 'clips') || !hasTech(s, 'tv_music')) return 1;
  const vid = vidsRo(s)[rel.id];
  if (vid?.banned) return 0;
  if (vid) return 0.7 + vid.v / 100;
  return mine(s.acts[rel.actId]) ? (hasTech(s, 'clipnet') ? 0.6 : 0.85) : 1;
}
const stations = (s: GameState): Station18[] => (s as unknown as { x4?: { radio18?: Radio18State } }).x4?.radio18?.st ?? [];
/** força de uma estação NPC no formato (a mesma conta de antes) */
const npcP = (x: Station18, fmt: Fmt31, k: number): number => x.reach * (FMT18[x.fmt]?.reach ?? 1) * (x.fmt === fmt ? 1 : 0.3) * 0.3 * k;
/** outras rádios pequenas da cidade (sempre há alguma concorrência) */
export const LOCAL_R31 = 0.45;
/** Quadro da audiência de uma cidade (car31.cities): as estações NPC de lá e as suas, com a fatia de cada uma. Puro. */
export function cityBoard31(s: GameState, city: string): { name: string; fmt: Fmt31; share: number; mine: boolean; id: string }[] {
  const mineV = mediaVentures31(s).filter((v) => kindOf31(v) === 'radio' && v.city === city);
  const rows = [
    ...stations(s).filter((x) => x.city === city).map((x) => ({ name: x.call, fmt: x.fmt as Fmt31, p: x.reach * (FMT18[x.fmt]?.reach ?? 1) * 0.3, mine: false, id: x.id })),
    ...mineV.map((v) => { const st = stRo31(s, v); return { name: v.name, fmt: st.fmt, p: power31(s, v, st).P, mine: true, id: v.id }; }),
  ];
  const tot = rows.reduce((t0, x) => t0 + x.p, 0) + LOCAL_R31;
  return rows.map((x) => ({ name: x.name, fmt: x.fmt, share: x.p / tot, mine: x.mine, id: x.id })).sort((a, b) => b.share - a.share || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------- estado

export interface Slot31 { rel: string; rot: Rot31; w: number; jab?: 1 }
export interface Ib31 { y: number; q: number; share: number; rank: number; n: number }
export interface Jaba31 { id: string; rel: string; lab: string; amt: number; u: number }
export interface Bet31 { rel: string; w: number; f0: number; hit?: 1 }
export interface St31 { fmt: Fmt31; grid: Slot31[]; share: number; hist: number[]; ib: Ib31[]; ear: number; heat: number; copy: number; top: number; offers: Jaba31[]; bets: Bet31[]; seq: number; log: { w: number; t: L }[] }
export interface Media31State { st: Record<string, St31> }
declare module '../ext4' { interface Ext4 { car31m: Media31State } }
registerExt4('car31m', () => ({ st: {} }));
const ro = (s: GameState): Media31State | undefined => (s as unknown as { x4?: { car31m?: Media31State } }).x4?.car31m;
function m31(s: GameState): Media31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.car31m ??= { st: {} }) as Media31State;
  st.st ??= {};
  return st;
}
const vlist = (s: GameState): Venture[] => (s as unknown as { x4?: { ventures9?: { list?: Venture[] } } }).x4?.ventures9?.list ?? [];
export const mediaVentures31 = (s: GameState): Venture[] => vlist(s).filter((v) => v.kind === 'media');
export const kindOf31 = (v: Venture): MKind31 => (v.media === 'radio' ? 'radio' : v.media === 'tv' ? 'tv' : v.media === 'magazine' ? 'magazine' : 'web');

export function fmtsFor31(s: GameState, v: Venture): Fmt31[] {
  const k = kindOf31(v);
  if (k === 'radio') { const f = fmtsNow18(s); return f.length ? f : ['network']; }
  return [k === 'tv' ? 'tv' : k === 'magazine' ? 'mag' : 'web'];
}
const defFmt = (s: GameState, v: Venture): Fmt31 => { const f = fmtsFor31(s, v); return f.includes('top40') ? 'top40' : f[0]; };
/** Estado da estação (só leitura: devolve o padrão sem gravar quando ainda não existe). */
export function stRo31(s: GameState, v: Venture): St31 {
  return ro(s)?.st[v.id] ?? { fmt: defFmt(s, v), grid: [], share: 0.04, hist: [], ib: [], ear: 0, heat: 0, copy: 0, top: 0, offers: [], bets: [], seq: 0, log: [] };
}
function stOf(s: GameState, v: Venture): St31 {
  const m = m31(s);
  const st = (m.st[v.id] ??= stRo31(s, v));
  st.grid ??= []; st.hist ??= []; st.ib ??= []; st.offers ??= []; st.bets ??= []; st.log ??= [];
  return st;
}
const note = (st: St31, w: number, t: L) => { st.log.unshift({ w, t }); if (st.log.length > 12) st.log.length = 12; };
export const slotsOf31 = (st: St31): Record<Rot31, number> => SLOTS31[st.fmt] ?? SLOTS31.top40;
export const used31 = (st: St31, r: Rot31): number => st.grid.filter((x) => x.rot === r).length;

// ---------------------------------------------------------------- contas puras (interface e mês usam as mesmas)

const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const a3Of = (v: Venture): string => countryOfCity(v.city) ?? 'USA';
/** peso do veículo na época (rádio cai com internet/streaming/vídeo curto; TV com streaming; revista depois de 2000) */
export function eraW31(s: GameState, v: Venture): number {
  const k = kindOf31(v);
  if (k === 'radio') return Math.max(0.3, radioWeight18(s) || 0.7) * (s.year < 1925 ? 0.7 : 1);
  if (k === 'tv') return hasTech(s, 'short_video') ? 0.5 : hasTech(s, 'streaming') ? 0.7 : 1;
  if (k === 'magazine') return s.year > 2000 ? Math.max(0.3, 1 - (s.year - 2000) * 0.035) : 1;
  return 1;
}
/** fração do país que o veículo alcança (cidade → rede → nacional, pelo nível) */
export function coverage31(v: Venture): number {
  const n = Math.max(1, v.level);
  const k = kindOf31(v);
  const c = k === 'radio' ? 0.12 + 0.07 * (n - 1) + (n >= 3 ? 0.08 : 0) : k === 'tv' ? 0.2 + 0.1 * (n - 1) : k === 'magazine' ? 0.12 + 0.07 * (n - 1) : 0.05 + 0.05 * (n - 1);
  return Math.min(0.7, c);
}
const fitOf = (fmt: Fmt31, a: Act): number => (fmt in FMT18 ? (FMT18[fmt as Fmt18].fam.includes(familyOf(a.genre)) ? 1 : 0.5) : 1);
const tasteOf = (s: GameState, a3: string, a: Act): number => { const c = countryInfoByA3[a3]; return c ? Math.min(1.5, countryTaste(c, familyOf(a.genre), s.year)) : 1; };
/** o quanto a faixa já cheira a sucesso (segura audiência) */
export function hit31(rel: Release, a: Act): number {
  return 0.25 + 0.75 * Math.min(1, a.fame / 80) + (rel.peak > 0 && rel.peak <= 10 ? 0.35 : rel.peak > 0 && rel.peak <= 40 ? 0.15 : 0);
}
export const burn31 = (s: GameState, x: Slot31): number => (x.rot === 'heavy' && s.week - x.w > BURN_W31 ? Math.max(0.45, 1 - 0.06 * (s.week - x.w - BURN_W31)) : 1);

export interface Power31 { P: number; R: number; target: number; grid: number; own: number; bets: number; burned: number; fit: number }
/** força da grade contra as rivais: participação-alvo da audiência na cidade. */
export function power31(s: GameState, v: Venture, st = stRo31(s, v)): Power31 {
  const a3 = a3Of(v), slots = slotsOf31(st);
  let cap = 0;
  for (const r of ROTS31) cap += slots[r] * ROT_W31[r];
  let sum = 0, own = 0, bets = 0, burned = 0, fit = 0, n = 0;
  for (const x of st.grid) {
    const rel = s.releases[x.rel], a = rel ? s.acts[rel.actId] : undefined;
    if (!rel || !a) continue;
    const f = fitOf(st.fmt, a);
    let p = ROT_W31[x.rot] * f * tasteOf(s, a3, a) * (x.rot === 'bet' ? 0.55 : hit31(rel, a)) * burn31(s, x) * clipK31(s, v, rel);
    if (mine(a)) { p *= 0.85; own++; }
    if (x.jab && rel.q < 55) p *= 0.6;
    if (x.rot === 'bet') bets++;
    if (burn31(s, x) < 1) burned++;
    fit += f; n++;
    sum += p;
  }
  const grid = cap > 0 ? sum / cap : 0;
  const P = (0.25 + grid) * (0.7 + v.level * 0.12) * (0.6 + v.rep / 125) * (1 + v.staff * 0.03) * eraW31(s, v);
  const R = rivals31(s, v, st);
  return { P, R, target: P / (P + R), grid, own, bets, burned, fit: n ? fit / n : 1 };
}
/** força somada das rivais (estações do radio18 no formato; quem é copiado enfrenta mais gente) */
export function rivals31(s: GameState, v: Venture, st = stRo31(s, v)): number {
  const k = kindOf31(v);
  let R = k === 'tv' ? (s.year > 1980 ? 1.6 : 1.2) : k === 'magazine' ? 1 : k === 'web' ? 1.5 : 0;
  if (k === 'radio' && car31On(s, 'cities')) {
    // só as estações da mesma cidade disputam os ouvintes (mais as pequenas locais)
    R = LOCAL_R31;
    for (const x of stations(s)) if (x.city === v.city) R += npcP(x, st.fmt, 1);
  } else if (k === 'radio') {
    const list = (s as unknown as { x4?: { radio18?: Radio18State } }).x4?.radio18?.st ?? [];
    for (const x of list) R += x.reach * (FMT18[x.fmt]?.reach ?? 1) * (x.fmt === st.fmt ? 1 : 0.3) * 0.3;
    if (R <= 0) R = 0.9;
  }
  return R * (1 + 0.2 * st.copy);
}
/** força de cada rival (para o ibope e a tela) */
export function rivalList31(s: GameState, v: Venture, st = stRo31(s, v)): { name: string; p: number }[] {
  if (kindOf31(v) !== 'radio') return [{ name: '—', p: rivals31(s, v, st) }];
  const k = 1 + 0.2 * st.copy;
  const list = car31On(s, 'cities') ? stations(s).filter((x) => x.city === v.city) : stations(s);
  return list.map((x) => ({ name: x.call, p: npcP(x, st.fmt, k) }));
}

/** o peso da execução de uma vaga (antes do conflito de interesse) */
export function slotW31(s: GameState, v: Venture, st: St31, x: Slot31): number {
  const rel = s.releases[x.rel], a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !a) return 0;
  return 9 * st.share * coverage31(v) * ROT_W31[x.rot] * eraW31(s, v) * fitOf(st.fmt, a) * burn31(s, x) * clipK31(s, v, rel);
}
const SRC_OF: Record<MKind31, 'radio' | 'tv' | 'magazine' | 'web'> = { radio: 'radio', tv: 'tv', magazine: 'magazine', web: 'web' };
registerExec31('media', (s, out) => {
  if (!car31On(s, 'media')) return;
  for (const v of mediaVentures31(s)) {
    const st = ro(s)?.st[v.id];
    if (!st) continue;
    const a3 = a3Of(v), src = SRC_OF[kindOf31(v)];
    for (const x of st.grid) { const rel = s.releases[x.rel]; if (rel) exec31(s, out, { rel: rel.id, act: rel.actId, a3, w: slotW31(s, v, st, x), src, by: v.id }); }
  }
});

/** Faixas que podem entrar na grade: lançamentos vivos das últimas 40 semanas, melhor encaixe primeiro. */
export function cands31(s: GameState, v: Venture, n = 60): Release[] {
  const st = stRo31(s, v), a3 = a3Of(v);
  const inGrid = new Set(st.grid.map((x) => x.rel));
  const sc = (r: Release) => { const a = s.acts[r.actId]!; return fitOf(st.fmt, a) * tasteOf(s, a3, a) * hit31(r, a); };
  return allReleases17(s).filter((r) => r.live && !inGrid.has(r.id) && s.week - r.week <= 40 && s.week >= r.week && !!s.acts[r.actId] && s.acts[r.actId].status !== 'retired' && s.acts[r.actId].status !== 'split')
    .map((r) => [r, sc(r)] as const).sort((x, y) => y[1] - x[1] || (x[0].id < y[0].id ? -1 : 1)).slice(0, n).map((x) => x[0]);
}

// ---------------------------------------------------------------- decisões do jogador

const byId = (s: GameState, vid: string): Venture | undefined => mediaVentures31(s).find((v) => v.id === vid);
const E = (pt: string, en: string): L => l(pt, en);

export function setFmt31(s: GameState, vid: string, fmt: Fmt31): L | null {
  const v = byId(s, vid);
  if (!v) return E('Veículo inválido.', 'Invalid outlet.');
  if (!fmtsFor31(s, v).includes(fmt)) return E('Esse formato não existe nesta época.', 'That format does not exist in this era.');
  const st = stOf(s, v);
  if (st.fmt === fmt) return null;
  st.fmt = fmt;
  st.share = Math.round(st.share * 0.85 * 10000) / 10000; // ouvintes estranham a troca
  v.rep = clamp(v.rep - 4, 0, 100);
  const sl = slotsOf31(st);
  for (const r of ROTS31) { const xs = st.grid.filter((x) => x.rot === r); for (const x of xs.slice(sl[r])) st.grid.splice(st.grid.indexOf(x), 1); }
  note(st, s.week, fmtL(l('Formato trocado para {f}.', 'Format changed to {f}.'), { f: FMT_NAME31[fmt] }));
  touch31(s);
  return null;
}

export function addGrid31(s: GameState, vid: string, relId: string, rot: Rot31): L | null {
  const v = byId(s, vid);
  const rel = s.releases[relId];
  if (!v) return E('Veículo inválido.', 'Invalid outlet.');
  if (!rel?.live || !s.acts[rel.actId]) return E('Esse lançamento não está mais em circulação.', 'That release is no longer in circulation.');
  const st = stOf(s, v);
  if (st.grid.some((x) => x.rel === relId)) return setRot31(s, vid, relId, rot);
  if (used31(st, rot) >= slotsOf31(st)[rot]) return fmtL(l('Sem vaga em {r} neste formato: tire uma faixa antes.', 'No {r} slot left in this format: drop a track first.'), { r: rotName31(kindOf31(v), rot) });
  const a = s.acts[rel.actId];
  if (rot === 'bet' && a.fame >= BET_FAME31) return E('Aposta é só para artista novo (ainda pouco conhecido).', 'A bet is only for a new act (still little known).');
  if (clipK31(s, v, rel) <= 0) return E('O clipe dessa faixa foi banido da TV: não pode entrar na grade.', 'That track\'s video was banned from TV: it cannot go on the grid.');
  st.grid.push({ rel: relId, rot, w: s.week });
  if (rot === 'bet' && !st.bets.some((b) => b.rel === relId)) st.bets.push({ rel: relId, w: s.week, f0: Math.round(a.fame) });
  touch31(s);
  return null;
}
export function setRot31(s: GameState, vid: string, relId: string, rot: Rot31): L | null {
  const v = byId(s, vid);
  if (!v) return E('Veículo inválido.', 'Invalid outlet.');
  const st = stOf(s, v);
  const x = st.grid.find((y) => y.rel === relId);
  if (!x) return addGrid31(s, vid, relId, rot);
  if (x.rot === rot) return null;
  if (used31(st, rot) >= slotsOf31(st)[rot]) return fmtL(l('Sem vaga em {r} neste formato.', 'No {r} slot left in this format.'), { r: rotName31(kindOf31(v), rot) });
  const a = s.acts[s.releases[relId]?.actId ?? ''];
  if (rot === 'bet' && (!a || a.fame >= BET_FAME31)) return E('Aposta é só para artista novo.', 'A bet is only for a new act.');
  x.rot = rot;
  x.w = s.week; // a rotação nova começa a contar o cansaço de novo
  touch31(s);
  return null;
}
export function dropGrid31(s: GameState, vid: string, relId: string): void {
  const v = byId(s, vid);
  if (!v) return;
  const st = stOf(s, v);
  st.grid = st.grid.filter((x) => x.rel !== relId);
  touch31(s);
}

/** Risco legal do jabá por país e época (0..1): EUA depois do escândalo de 1959–60; Brasil tolera ("jabá"). */
export function lawRisk31(a3: string, year: number): number {
  const base = a3 === 'USA' ? (year < 1959 ? 0.25 : 1) : a3 === 'BRA' ? (year < 2008 ? 0.2 : 0.45) : a3 === 'GBR' ? 0.7 : a3 === 'JPN' ? 0.5 : a3 === 'FRA' || a3 === 'DEU' ? 0.6 : 0.45;
  return base * (year >= 2005 ? 0.8 : 1);
}
export function answerJaba31(s: GameState, vid: string, offerId: string, yes: boolean): L | null {
  const v = byId(s, vid);
  if (!v) return E('Veículo inválido.', 'Invalid outlet.');
  const st = stOf(s, v);
  const o = st.offers.find((x) => x.id === offerId);
  if (!o) return E('A proposta já venceu.', 'The offer has expired.');
  const lb = s.labels[o.lab];
  st.offers = st.offers.filter((x) => x.id !== offerId);
  if (!yes) {
    if (lb?.leaderId) opine(s, `l:${lb.leaderId}`, -2, l('recusou o nosso "apoio cultural" na rádio', 'turned down our radio "cultural support"'));
    v.rep = clamp(v.rep + 0.5, 0, 100);
    touch31(s);
    return null;
  }
  const rel = s.releases[o.rel];
  if (!rel?.live) { touch31(s); return E('A faixa saiu de circulação.', 'The track left circulation.'); }
  const x = st.grid.find((y) => y.rel === o.rel);
  if (x) { x.rot = 'heavy'; x.jab = 1; x.w = s.week; }
  else if (used31(st, 'heavy') >= slotsOf31(st).heavy) return E('Sem vaga em rotação pesada: tire uma faixa antes de aceitar.', 'No heavy-rotation slot: drop a track before accepting.');
  else st.grid.push({ rel: o.rel, rot: 'heavy', w: s.week, jab: 1 });
  vpay(s, v.owner, o.amt, `jaba31:${v.id}:${o.id}`, `"Apoio cultural" ${lb?.name ?? ''}`, v);
  st.heat = Math.round(clamp(st.heat + 0.35 * lawRisk31(a3Of(v), s.year), 0, 2) * 1000) / 1000;
  emitFact(s, { kind: 'payola_taken', actors: ['player', rel.actId, o.lab], place: v.city, severity: 30, visibility: 'secret', tags: ['car31', 'payola'], src: 'car31', text: fmtL(l('{n} aceita dinheiro de {b} para tocar "{t}" sem parar.', '{n} takes money from {b} to play "{t}" nonstop.'), { n: v.name, b: lb?.name ?? '?', t: rel.title }) });
  touch31(s);
  return null;
}

// ---------------------------------------------------------------- diretor de programação (delegação única)

/** Monta a grade pela diretriz (fração de apostas, nota mínima): troca o que cansou e enche vagas vazias. */
export function autoGrid31(s: GameState, v: Venture, who: string): number {
  const st = stOf(s, v);
  const d = dirOf31(s, 'radio');
  const frac = clamp(Number(d.frac ?? 0.2), 0, 1), minQ = Number(d.minQ ?? 0);
  let n = 0;
  // sai quem cansou demais (pesada há muito tempo) ou já saiu das paradas há tempo
  for (const x of [...st.grid]) if (!x.jab && x.rot === 'heavy' && s.week - x.w > BURN_W31 + 6) { st.grid.splice(st.grid.indexOf(x), 1); n++; }
  const sl = slotsOf31(st);
  const pool = cands31(s, v, 80).filter((r) => r.q >= minQ);
  const newOnes = pool.filter((r) => (s.acts[r.actId]?.fame ?? 99) < BET_FAME31);
  const hits = pool.filter((r) => (s.acts[r.actId]?.fame ?? 0) >= BET_FAME31);
  const take = (arr: Release[], rot: Rot31) => { while (used31(st, rot) < sl[rot]) { const r = arr.shift(); if (!r) break; if (st.grid.some((x) => x.rel === r.id)) continue; if (!addGrid31(s, v.id, r.id, rot)) n++; } };
  const betSlots = Math.min(sl.bet, Math.round((sl.bet + sl.light) * frac));
  const betArr = [...newOnes];
  while (used31(st, 'bet') < betSlots) { const r = betArr.shift(); if (!r) break; if (!addGrid31(s, v.id, r.id, 'bet')) n++; }
  const rest = [...hits, ...newOnes.filter((r) => !st.grid.some((x) => x.rel === r.id))];
  take(rest, 'heavy'); take(rest, 'mid'); take(rest, 'light');
  if (n) logAuto31(s, { r: 'radio', who, t: fmtL(l('Grade de {n}: {k} troca(s) pela diretriz.', '{n} grid: {k} change(s) by directive.'), { n: v.name, k: n }) });
  return n;
}

// ---------------------------------------------------------------- mês

const mi = (s: GameState) => s.year * 12 + s.month;
function payolaOffer(s: GameState, v: Venture, st: St31): void {
  const r = Rng.fromSeed(`${s.config.seed}|car31|jaba|${v.id}|${mi(s)}`);
  if (st.offers.length >= 2 || !r.chance(0.4)) return;
  const labs = Object.values(s.labels).filter((x) => x.active && x.roster.length).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!labs.length) return;
  const lb = r.pick(labs);
  const rel = allReleases17(s).filter((x) => x.live && x.owner === lb.id && s.week - x.week <= 20 && !st.grid.some((g) => g.rel === x.id)).sort((a, b) => b.appeal - a.appeal || (a.id < b.id ? -1 : 1))[0];
  if (!rel) return;
  const amt = money(s, 800 * Math.max(1, v.level) * MEDIA[v.media ?? 'radio'].mult * (st.share * 8 + 0.3));
  st.offers.push({ id: `j${++st.seq}`, rel: rel.id, lab: lb.id, amt, u: s.week + 4 });
}
function ibope(s: GameState, v: Venture, st: St31, pw: Power31): void {
  const rv = rivalList31(s, v, st);
  const rank = 1 + rv.filter((x) => x.p > pw.P).length;
  const q = ((Math.floor(s.month / 3) + 3) % 4) + 1; // o trimestre que acabou
  const y = q === 4 ? s.year - 1 : s.year;
  st.ib.push({ y, q, share: Math.round(st.share * 1000) / 1000, rank, n: rv.length + 1 });
  if (st.ib.length > 12) st.ib.shift();
  const pc = Math.round(st.share * 1000) / 10;
  const pct = l(String(pc).replace('.', ','), String(pc));
  emitFact(s, { kind: 'ibope', actors: ['player'], place: v.city, severity: rank === 1 ? 40 : 20, tags: ['car31', 'media'], src: 'car31',
    text: fmtL(l('Pesquisa de audiência ({q}º trimestre de {y}): {n} tem {p}% dos ouvintes e fica em {r}º entre {k}.', 'Ratings (Q{q} {y}): {n} holds {p}% of listeners and ranks No. {r} of {k}.'), { q, y, n: v.name, p: pct, r: rank, k: rv.length + 1 }),
    notify: { kind: rank === 1 ? 'good' : 'info', cat: 'business' }, ...(rank === 1 ? { diary: true as const } : {}) });
  if (rank === 1) {
    st.top++;
    if (st.top >= 3 && st.copy < 3) { // três trimestres seguidos na liderança: as rivais copiam o formato
      st.copy++;
      st.top = 0;
      emitFact(s, { kind: 'format_copied', actors: ['player'], place: v.city, severity: 30, tags: ['car31', 'media'], src: 'car31',
        text: fmtL(l('As rádios rivais copiam o formato de {n}: a briga pela audiência fica mais dura.', 'Rival stations copy {n}\'s format: the fight for listeners gets harder.'), { n: v.name }), notify: { kind: 'bad', cat: 'business' }, diary: true });
    }
  } else st.top = 0;
}
function earCheck(s: GameState, v: Venture, st: St31): void {
  const a3 = a3Of(v);
  const top = new Set([...board(s, a3, 'songs').slice(0, 10), ...board(s, a3, 'albums').slice(0, 10)].map((x) => x.relId));
  for (const b of st.bets) {
    if (b.hit || !top.has(b.rel)) continue;
    b.hit = 1;
    st.ear++;
    v.rep = clamp(v.rep + 4, 0, 100);
    const rel = s.releases[b.rel], a = rel ? s.acts[rel.actId] : undefined;
    opine(s, 'w:artists', 2, l('a sua rádio lança gente nova', 'your station breaks new acts'));
    emitFact(s, { kind: 'golden_ear', actors: ['player', rel?.actId ?? ''], place: v.city, severity: 45, tags: ['car31', 'media', 'good'], src: 'car31',
      text: fmtL(l('Ouvido de ouro: {n} apostou em {a} quando ninguém conhecia, e a faixa chegou ao top 10 do país.', 'Golden ear: {n} bet on {a} when nobody knew them, and the track reached the national top 10.'), { n: v.name, a: a?.name ?? '?' }),
      notify: { kind: 'good', cat: 'business' }, diary: { important: true } });
  }
  st.bets = st.bets.filter((b) => s.week - b.w <= 26 || b.hit).slice(-30);
}
function heatCheck(s: GameState, v: Venture, st: St31): void {
  st.heat = Math.max(0, Math.round((st.heat - 0.05) * 1000) / 1000);
  if (st.heat <= 0.05) return;
  const r = Rng.fromSeed(`${s.config.seed}|car31|heat|${v.id}|${mi(s)}`);
  if (!r.chance(st.heat * 0.12)) return;
  const fine = money(s, 5000 * Math.max(1, v.level) * MEDIA[v.media ?? 'radio'].mult);
  vpay(s, v.owner, -fine, `jabafine31:${v.id}:${mi(s)}`, `Multa por jabá ${v.name}`, v);
  v.rep = clamp(v.rep - 18, 0, 100);
  st.heat = 0;
  for (const x of st.grid) delete x.jab;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
  emitFact(s, { kind: 'payola', actors: ['player'], place: v.city, severity: 65, tags: ['car31', 'media', 'scandal'], src: 'car31',
    text: fmtL(l('Escândalo do jabá: {n} é pega cobrando para tocar músicas. Multa e credibilidade no chão.', 'Payola scandal: {n} is caught taking money to play songs. A fine and credibility on the floor.'), { n: v.name }),
    notify: { kind: 'bad', cat: 'business', prio: 2 }, diary: { important: true } });
}

/** A briga da cidade (car31.cities): a estação NPC do mesmo formato perde alcance quando você tem mais ouvintes que ela
 *  na cidade; quem está por cima de você ganha. As estações de outras cidades não sentem nada. */
function cityFight(s: GameState, v: Venture, st: St31): void {
  const b = cityBoard31(s, v.city);
  const me = b.find((x) => x.id === v.id);
  if (!me) return;
  for (const x of b) {
    if (x.mine || x.fmt !== st.fmt) continue;
    stationReach18(s, x.id, me.share > x.share ? -0.03 : 0.01);
  }
}

function monthOne(s: GameState, v: Venture): void {
  const st = stOf(s, v);
  // formato que a época enterrou (rede ao vivo depois de 1956, AOR depois de 2006): adapta sozinho, com custo
  if (!fmtsFor31(s, v).includes(st.fmt)) {
    const old = st.fmt;
    st.fmt = defFmt(s, v);
    st.share = Math.round(st.share * 0.8 * 10000) / 10000;
    emitFact(s, { kind: 'format_dead', actors: ['player'], place: v.city, severity: 25, tags: ['car31', 'media'], src: 'car31',
      text: fmtL(l('O formato {a} acabou: {n} passa para {b} e perde parte do público.', 'The {a} format is over: {n} switches to {b} and loses part of its audience.'), { a: FMT_NAME31[old], n: v.name, b: FMT_NAME31[st.fmt] }), notify: { kind: 'bad', cat: 'business' }, diary: true });
  }
  st.grid = st.grid.filter((x) => s.releases[x.rel]?.live && s.acts[s.releases[x.rel].actId]);
  // diretor de programação (delegação)
  const mode = modeOf31(s, 'radio');
  if (mode !== 'me') { const who = mode === 'staff' ? staffFor31(s, 'radio')?.id ?? 'rule' : 'rule'; autoGrid31(s, v, who); }
  const pw = power31(s, v, st);
  st.share = Math.round(clamp(st.share + (pw.target - st.share) * 0.4, 0.002, 0.9) * 10000) / 10000;
  st.hist.push(st.share);
  if (st.hist.length > 24) st.hist.shift();
  // anúncio pela audiência (substitui a fórmula fixa do ventures9 enquanto este interruptor está ligado)
  const ads = money(s, MEDIA[v.media ?? 'radio'].ad) * (st.share / 0.12) * (0.6 + v.level * 0.4) * eraW31(s, v) * (isConglomerate(s) ? 1.25 : 1);
  vpay(s, v.owner, ads, `ads31:${v.id}`, `Publicidade (audiência) ${v.name}`, v);
  // credibilidade: aposta dá prestígio; só sucesso não dá; o próprio selo tira
  const n = Math.max(1, st.grid.length);
  v.rep = clamp(v.rep + 1.2 * (pw.bets / n) - 1.5 * (pw.own / n) - 0.6 * (pw.burned / n), 0, 100);
  if (kindOf31(v) === 'tv' && car31On(s, 'clips') && hasTech(s, 'clipnet')) for (const x of st.grid) if (x.rot === 'heavy') tvHeavy18(s, x.rel, s.week + 5);
  if (kindOf31(v) === 'radio' && car31On(s, 'cities')) cityFight(s, v, st);
  earCheck(s, v, st);
  st.offers = st.offers.filter((o) => o.u >= s.week);
  if (kindOf31(v) !== 'web') payolaOffer(s, v, st);
  heatCheck(s, v, st);
  if (s.month % 3 === 0) ibope(s, v, st, pw); // começo do trimestre: resultado do trimestre que acabou
}

MEDIA9X.ads = (s) => car31On(s, 'media');
registerSimHook('month', 'car31media', (s) => {
  if (!car31On(s, 'media')) return;
  const vs = ventures(s).list.filter((v) => v.kind === 'media');
  for (const v of vs) monthOne(s, v);
  // estações que fecharam/foram vendidas
  const m = ro(s);
  if (m) for (const id of Object.keys(m.st)) if (!vs.some((v) => v.id === id)) delete m.st[id];
  touch31(s);
});

// ---------------------------------------------------------------- calendário (ibope e propostas de jabá)

registerDeadline('car31media', (s, from, to) => {
  const out: Deadline19[] = [];
  const ib = Math.min(...[0, 3, 6, 9].map((m) => nextMonthWeek19(s, m)));
  for (const v of mediaVentures31(s)) {
    const st = ro(s)?.st[v.id];
    if (!st) continue;
    for (const o of st.offers) if (o.u >= from && o.u <= to) out.push({ id: `car31j:${v.id}:${o.id}`, w: o.u, kind: 'decision', act: true, tone: 'bad', t: fmtL(l('{n}: proposta de jabá vence', '{n}: payola offer expires'), { n: v.name }), goto: { area: 'car31' } });
    if (ib >= from && ib <= to) out.push({ id: `car31i:${v.id}:${ib}`, w: ib, kind: 'other', tone: 'info', t: fmtL(l('{n}: pesquisa de audiência do trimestre', '{n}: quarterly ratings'), { n: v.name }), goto: { area: 'car31' } });
  }
  return out;
});

// ---------------------------------------------------------------- editor

registerEditable({
  id: 'car31.media.share', area: 'careers', target: undefined, label: l('Audiência da sua primeira rádio/TV/revista (0–90%)', 'Audience of your first radio/TV/magazine (0–90%)'), kind: 'number', min: 0, max: 90, step: 1, raw: true,
  get: (s) => { const v = mediaVentures31(s)[0]; return v ? Math.round(stRo31(s, v).share * 100) : 0; },
  set: (s, val) => { const v = mediaVentures31(s)[0]; if (!v) return l('Sem veículo de mídia.', 'No media outlet.'); stOf(s, v).share = clamp(Number(val) / 100, 0.002, 0.9); touch31(s); },
});
registerRunnable({
  id: 'car31.media.auto', area: 'careers', label: l('Montar a grade da sua rádio pela diretriz agora', 'Build your station\'s grid by directive now'),
  run: (s) => { const v = mediaVentures31(s)[0]; if (!v) return l('Sem veículo de mídia.', 'No media outlet.'); const n = autoGrid31(s, v, 'player'); return fmtL(l('{n} troca(s) na grade.', '{n} grid change(s).'), { n }); },
});
