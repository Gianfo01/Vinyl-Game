// Artistas reais em massa (rodada 7): ~640 nomes dos EUA, Reino Unido, Itália, Brasil e do mundo, além
// dos 100 do catálogo, surgindo perto do ano real de estreia, com integrantes reais (entradas e saídas),
// discografia anterior ao início da run, fim de carreira, voltas e, opcionalmente, mortes nos anos reais.
//
// - Nomes reais ligados (RunConfig.realNames): nomes, integrantes e títulos reais.
// - Nomes ficcionais: os mesmos arquétipos entram com nomes gerados e discos com títulos inventados.
// - Modo histórico segue as datas reais; Livre e Caos embaralham alguns anos.
//
// Também gera a discografia simulada dos atos procedurais que já existiam no início (item 12).

import { clamp, Rng } from '../../core/rng';
import { exitMember20 } from '../members20';
import { CATALOG_ACTS } from '../../data/catalog';
import { REAL_CLASSIC, type ClassicExtra } from '../../data/realacts_classic';
import { REAL_EU } from '../../data/realacts_eu';
import { REAL_US } from '../../data/realacts_us';
import { REAL_WORLD } from '../../data/realacts_world';
import { REAL_MORE } from '../../data/realacts_more14';
import { ALIASES16, REAL_L16 } from '../../data/lineups16';
import { applyLineups25 } from '../../data/lineups25';
import { applyMembers25 } from '../../data/members25';
import { REAL_17 } from '../../data/more17';
import { REAL_1889 } from '../../data/era1889';
import { ARTISTS19 } from '../../data/more19';
import { ACERVO21 } from '../../data/acervo21';
import { LIKES22_ARTISTS, SONGS22 } from '../../data/songs22';
import { ARTISTS27, FILL27 } from '../../data/audit27_artists';
import { SONGS27 } from '../../data/audit27_songs';
import { applyAudit27, applyFix27, applySongs27, type AnyArtist27 } from '../../data/audit27';
import { NEW27_C1 } from '../../data/new27c1';
import { BASE31_ACTS } from '../../data/base31acts';
import { BASE31BR_ACTS } from '../../data/base31br';
import { frontmanSings27, lineupMonth27, realRoles27 } from '../../data/lineup27';
import { FIXR27, FIXV27, NEW27_F } from '../../data/research27';
import { ALIASES27, HOMONYMS27, MERGED27, mergePeriods27, memberProv27, SONGADD27, songList27, takeOf27, workOf27, WORKS27, WRITERS27 } from '../../data/model27';
const ACERVO22 = [...ACERVO21, ...LIKES22_ARTISTS];
import { realAllowed } from '../dbsize14';
import { REAL_ACTS } from '../../data/realnames';
import { atDebut27, firstJoin, inLineupAt, periodsOf, type Prov27, type RealArtist, type RealMember, type RealPeriod, type RealRelease } from '../../data/realtypes';
import { CITIES, cityById, familyOf, l } from '../../data/world';
import { personDies } from '../dynasty';
import { registerSwitch, sw } from '../r31/switches';
import { computeAppeal } from '../market';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, makeAct, makePerson, songTitle } from '../people';
import type { Act, GameState, Person, Release } from '../types';
import { fmtL, nextId, remember } from '../util';
import { addSignal, signToBestRival } from '../worldgen';
import { histAltered, histDiverged, histMode, histRoll } from '../history15';
import { noteRelease17 } from '../relidx17';
import { actsTouched17 } from '../actidx17';
import { roll20, simCareer20, simDeath20, simStart20 } from '../worldpolicy20';
import { actsNow27 } from '../tickcache27';
import { RW_AFTER_NEWGAME } from './after29';
import { lineup29Of, type Lineup29 } from '../lineup29';
import { relPut, relTouch } from '../opinion';

const norm16 = (n: string) => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
/** r27: chave de deduplicação — "The X" = "X" e "&" = "and" (Carpenters, Four Tops, Smashing Pumpkins apareciam 2×) */
const DEDUP27: Record<string, string> = { gruporevelacao: 'revelacao' }; // r27 (F): o mesmo grupo com e sem "Grupo"
export const dedupKey27 = (n: string) => { const k = norm16(n.replace(/^the\s+/i, '').replace(/&/g, ' and ')); return DEDUP27[k] ?? k; };
const BASE_ALL: RealArtist[] = [...REAL_US, ...REAL_EU, ...REAL_WORLD, ...REAL_MORE];
const taken16 = new Set([...BASE_ALL.map((a) => dedupKey27(a.n)), ...Object.values(REAL_ACTS).map((a) => dedupKey27(a.name))]);
/** rodada 16: formações (solos e bandas novas de quem saiu) entram no fim — catalogNo estável. */
const L16F = REAL_L16.filter((a) => !taken16.has(dedupKey27(a.n)));
const taken17 = new Set([...taken16, ...L16F.map((a) => dedupKey27(a.n))]);
/** rodada 17: lote E (one-hit wonders, covers/samples, cenas locais, nomes que faltavam) também no fim. */
export const REAL_ALL: RealArtist[] = [...BASE_ALL, ...L16F, ...REAL_17.filter((a) => { const k = dedupKey27(a.n); if (taken17.has(k)) return false; taken17.add(k); return true; }), ...REAL_1889.filter((a) => { const k = dedupKey27(a.n); if (taken17.has(k)) return false; taken17.add(k); return true; }), ...ARTISTS19.filter((a) => { const k = dedupKey27(a.n); if (taken17.has(k)) return false; taken17.add(k); return true; }), ...ACERVO22.filter((a) => { const k = dedupKey27(a.n); if (taken17.has(k)) return false; taken17.add(k); return true; })]; // r18 era1889 no fim; r19 more19 (onda 2) depois; r21 acervo + perfis pesquisados
/** r21: o acervo é o último lote de REAL_ALL; usa gerador próprio para não deslocar os sorteios do resto do mundo. */
export const ACERVO21_FROM = REAL_ALL.length - ACERVO22.filter((a) => REAL_ALL.includes(a)).length;
/** r27: artistas que faltavam (auditoria Masters_25) entram depois do acervo — mesmo gerador próprio, sem deslocar o acervo. */
export const ARTISTS27_FROM = REAL_ALL.length;
REAL_ALL.push(...ARTISTS27.filter((a) => { const k = dedupKey27(a.n); if (taken17.has(k)) return false; taken17.add(k); return true; }));
const FILL27N = new Map(Object.entries(FILL27).map(([k, v]) => [norm16(k), v]));
for (const a of REAL_ALL) { const f = FILL27N.get(norm16(a.n)); if (f && !a.m?.length) { if (a.b === undefined && f.b !== undefined) a.b = f.b; if (a.x === undefined && f.x !== undefined) a.x = f.x; } } // r27: só preenche lacunas
applyMembers25(REAL_ALL); // r25: formações pesquisadas para quem não tinha integrantes
applyLineups25(REAL_ALL); // r25: formações reais que estavam incompletas (banda de 5 aparecia com 2–3)
// r27: atos novos da auditoria (3T) no fim, no sorteio do acervo; depois as correções auditadas (mortes, saídas, voltas…)
for (const a of [...NEW27_C1, ...NEW27_F]) { const k = dedupKey27(a.n); if (!taken17.has(k)) { taken17.add(k); REAL_ALL.push(a); } } // r27 (F): + artistas da pesquisa
/** R31 (Z): base nova (data/base31acts) no FIM — os números de catálogo de quem já existia não mudam; usa o sorteio do acervo. */
export const BASE31_FROM = REAL_ALL.length;
for (const a of BASE31_ACTS) { const k = dedupKey27(a.n); if (!taken17.has(k)) { taken17.add(k); REAL_ALL.push(a); } }
/** R31 (BASE-BR): artistas brasileiros (data/base31br) no FIM, depois do lote Z — interruptor 'base31.br' (desligado: não estreiam). */
export const BASE31BR_FROM = REAL_ALL.length;
for (const a of BASE31BR_ACTS) { const k = dedupKey27(a.n); if (!taken17.has(k)) { taken17.add(k); REAL_ALL.push(a); } }
export const BASE31BR_TO = REAL_ALL.length;
registerSwitch({
  id: 'base31.br', def: true, scope: 'game',
  desc: l('Base brasileira ampliada (R31): centenas de atos brasileiros reais a mais, de 1889 a hoje, com fontes. Desligado: os atos novos não estreiam.',
    'Expanded Brazilian database (R31): hundreds more real Brazilian acts, 1889 to today, with sources. Off: the new acts never debut.'),
  // mora na configuração da partida (decide a composição do mundo já na criação; pode ser preparado antes de createGame)
  read: (s) => s.config.base31br !== false,
  write: (s, v) => { if (v) delete s.config.base31br; else s.config.base31br = false; },
});
/** R31 (BASE-BR): índice de REAL_ALL do lote brasileiro com o interruptor desligado nesta partida. */
export const brOff31 = (s: GameState, i: number): boolean => i >= BASE31BR_FROM && i < BASE31BR_TO && !sw<boolean>(s, 'base31.br');
applyAudit27(REAL_ALL, { extra: REAL_CLASSIC, names: REAL_ACTS });
// r27 (F): pesquisa da fila (research27) e normalização das passagens (uma linha por pessoa, com o 7º campo)
{
  const byName = new Map<string, AnyArtist27>(REAL_ALL.map((a) => [a.n, a as unknown as AnyArtist27]));
  for (const [no, ex] of Object.entries(REAL_CLASSIC)) { const n = REAL_ACTS[+no]?.name; if (n) byName.set(n, Object.assign(ex as unknown as AnyArtist27, { n })); }
  for (const fixes of [FIXR27, FIXV27]) for (const [n, fx] of Object.entries(fixes)) { const a = byName.get(n); if (a) applyFix27(a, fx); }
  for (const a of REAL_ALL) a.m = mergePeriods27(a.m, a.n);
  for (const [no, ex] of Object.entries(REAL_CLASSIC)) {
    const n = REAL_ACTS[+no]?.name ?? '';
    delete (ex as { n?: string }).n;
    ex.m = mergePeriods27(ex.m, n);
    // a "cópia" de nomes do catálogo (realnames) acompanha a formação de estreia documentada (BTS 7, Girls' Generation 9…)
    const ra = REAL_ACTS[+no];
    if (ra && ex.m?.length && ex.d !== undefined) { const deb = ex.m.filter((m) => atDebut27(m, ex.d!)).map((m) => m[0]); if (deb.length) ra.members = deb; }
  }
}
void MERGED27;
applySongs27(SONGS22);
/** r27 (F): a mesma pessoa real em várias cópias (banda, solo, supergrupo) recebe o nascimento/morte que faltava numa delas.
 *  Só nomes de 2+ palavras (os de uma palavra são ambíguos) e fora dos homônimos conhecidos. */
export const HARMONIZED27: string[] = [];
function harmonize27(): void {
  type Ref = { b?: number; x?: number; d?: number; setB: (v: number) => void; setX: (v: number) => void; where: string; recv?: boolean };
  const refs = new Map<string, Ref[]>();
  let put = (n: string, r: Ref) => { const k = canonKey(n); if (!k.includes(' ') || HOMONYMS27.has(k)) return; (refs.get(k) ?? refs.set(k, []).get(k)!).push(r); };
  const scan = (a: { n: string; d?: number; m?: RealMember[]; b?: number; x?: number; e?: number }) => {
    if (!a.m?.length) put(a.n, { b: a.b, x: a.x, d: a.d, setB: (v) => { a.b = v; }, setX: (v) => { a.x = v; if (a.e === undefined || a.e > v) a.e = v; }, where: a.n });
    for (const m of a.m ?? []) put(m[0], { b: m[2], x: m[3], d: m[4] ?? a.d, setB: (v) => { m[2] = v; }, setX: (v) => { m[3] = v; }, where: a.n });
  };
  // R31 (BASE-BR): o lote BR só RECEBE (Pixinguinha nos Oito Batutas ganha a morte de 1973); nunca muda os dados de quem já existia
  let recv = false;
  const put0 = put;
  put = (n, r) => put0(n, recv ? { ...r, recv: true } : r);
  REAL_ALL.forEach((a, i) => { recv = i >= BASE31BR_FROM && i < BASE31BR_TO; scan(a); });
  recv = false;
  for (const [no, ex] of Object.entries(REAL_CLASSIC)) { const n = REAL_ACTS[+no]?.name; if (n) scan({ get n() { return n; }, get d() { return ex.d; }, get m() { return ex.m; }, get b() { return ex.b; }, set b(v) { ex.b = v; }, get x() { return ex.x; }, set x(v) { ex.x = v; }, get e() { return ex.e; }, set e(v) { ex.e = v; } }); }
  for (const [k, xs] of refs) {
    if (xs.length < 2) continue;
    const b = xs.find((r) => r.b !== undefined && !r.recv)?.b, x = xs.find((r) => r.x !== undefined && !r.recv)?.x;
    for (const r of xs) {
      if (r.b === undefined && b !== undefined && (r.d === undefined || r.d >= b + 8)) { r.setB(b); HARMONIZED27.push(`${k} @ ${r.where}: nasc. ${b}`); }
      if (r.x === undefined && x !== undefined && (r.d === undefined || r.d <= x + 1)) { r.setX(x); HARMONIZED27.push(`${k} @ ${r.where}: morte ${x}`); }
    }
  }
}

const acRng = (s: GameState, k: string) => Rng.fromSeed(`${s.config.seed}|acervo21|${k}`);
/** catalogNo dos novos artistas reais: 1000 + índice em REAL_ALL. */
export const REAL_BASE = 1000;

type Sched = { year: number; kind: 'join' | 'leave' | 'reunion' | 'fate' | 'release'; actId: string; personId?: string; m?: RealMember; until?: number; rel?: RealRelease; mo?: number;
  /** r27 (LIN): troca de formação de identidade agendada fora do modo exato (sobrevive à limpeza de saves antigos) */
  lin?: 1 };

export interface RwState {
  upcoming: number[];
  sched: Sched[];
  done: Record<string, 1>;
  /** ex-integrantes por ato (para a página e a aba de inativos) */
  former: Record<string, { personId: string; year: number; reason: 'left' | 'died' | 'retired' | 'fired' }[]>;
  /** rodada 10: identidade única — nome real canônico → id da pessoa (a mesma pessoa em banda, solo e supergrupo) */
  pid?: Record<string, string>;
  /** R29 (formação): pessoas reais criadas LIVRES (fora da formação inicial escolhida) → ato da história real de onde vêm.
   *  Só referência (testes e "história real"): nunca vira ex-integrante. */
  free29?: Record<string, string>;
  /** R29 (formação): pessoas reais livres ainda jovens demais no início — [ato, índice do integrante] (criadas aos 15 anos) */
  pend29?: [string, number][];
}

declare module '../ext4' { interface Ext4 { rw: RwState } }
registerExt4('rw', () => ({ upcoming: [], sched: [], done: {}, former: {} }));
export const rw = (s: GameState): RwState => (s as unknown as { x4: { rw: RwState } }).x4.rw;

/** Dados reais de um ato (lista nova ou catálogo clássico). */
const SONG22_KEYS = new Map(Object.entries(SONGS22).map(([k, v]) => [dedupKey27(k), v]));
const SONG22_NAME = new Map(Object.keys(SONGS22).map((k) => [dedupKey27(k), k]));
for (const [k, v] of Object.entries(SONGS27)) { // r27: músicas da auditoria entram depois das curtidas, sem repetir título
  const key = dedupKey27(k), cur = SONG22_KEYS.get(key) ?? [], seen = new Set(cur.map(([t]) => norm16(t)));
  SONG22_KEYS.set(key, [...cur, ...v.filter(([t]) => !seen.has(norm16(t)) && (seen.add(norm16(t)), true))]);
  if (!SONG22_NAME.has(key)) SONG22_NAME.set(key, k);
}
// r27 (F): composição × gravação — ano da gravação original (não o da coletânea/relançamento), sem repetir a mesma obra
for (const [key, v] of [...SONG22_KEYS]) SONG22_KEYS.set(key, songList27(SONG22_NAME.get(key) ?? '', v));
for (const k of Object.keys(SONGADD27)) if (!SONG22_KEYS.has(dedupKey27(k))) SONG22_KEYS.set(dedupKey27(k), songList27(k, []));
/** r22: músicas marcantes (título, ano) de um ato real — das curtidas do Spotify do jogador. */
export function realSongs22(act: Act): [string, number][] {
  const d = realDataOf(act);
  return d ? SONG22_KEYS.get(dedupKey27(d.n)) ?? [] : [];
}
/** r22: próximo título real ainda não usado pelo ato, de uma música já lançada na vida real até `year` (+1). Sem RNG. */
export function realSongTitle22(s: GameState, act: Act, year = s.year): string | undefined {
  if (!s.config.realNames) return undefined;
  const xs = realSongs22(act);
  if (!xs.length) return undefined;
  const used = new Set(act.songs.map((id) => s.songs[id]?.title).concat(act.releases.map((id) => s.releases[id]?.title)));
  for (const a of realDataOf(act)?.al ?? []) used.add(a[0]); // r23: título de lançamento real fica para o mundo real (G8: random não restaura lançamentos)
  const strict = histMode(s) === 'strict', an = realDataOf(act)?.n ?? '';
  return xs.find(([t, y]) => y <= year + 1 && !used.has(t) && !(strict && takeOf27(an, t)?.src === 'u'))?.[0]; // r27 (F): não conferido some do modo exato
}

export function realDataOf(act: Act): (RealArtist | (ClassicExtra & { n: string; t: 1 | 2 | 3 })) | undefined {
  const no = act.catalogNo;
  if (!no) return undefined;
  if (no >= REAL_BASE) return REAL_ALL[no - REAL_BASE];
  const ex = REAL_CLASSIC[no];
  return ex ? { ...ex, n: REAL_ACTS[no]?.name ?? act.name, t: 1 } : undefined;
}

const jitter = (s: GameState, r: Rng, n: number) => (s.config.mode === 'historic' ? 0 : s.config.mode === 'free' ? r.int(-n, n) : r.int(-n * 3, n * 3));
const WEEKS = 52.18;
const weekOfYear = (s: GameState, year: number, r: Rng) => Math.round((year - s.config.startYear) * WEEKS) + r.int(0, 44);

// ---------------------------------------------------------------- discografia

/** Unidades aproximadas de um disco antigo conforme o porte do artista e a era. */
function histUnits(r: Rng, tier: number, year: number, type: Release['type']): number {
  const era = year < 1950 ? 0.25 : year < 1960 ? 0.5 : year < 1990 ? 1 : year < 2005 ? 1.2 : 0.8;
  const base = tier === 1 ? r.float(1.5e6, 9e6) : tier === 2 ? r.float(2e5, 1.6e6) : r.float(2e4, 2.5e5);
  return Math.round(base * era * (type === 'single' ? 0.6 : 1));
}

function histPeak(r: Rng, tier: number): number {
  return tier === 1 ? r.int(1, 8) : tier === 2 ? r.int(1, 30) : r.int(6, 60);
}

/** Cria um lançamento anterior à run (sem mercado ativo; entra no catálogo e na história). */
export function seedRelease(s: GameState, r: Rng, act: Act, o: { title: string; year: number; type: Release['type']; tier: number; owner?: string; live?: boolean; doc?: boolean; kind?: RealRelease[3] }): Release {
  const units = o.live ? 0 : histUnits(r, o.tier, o.year, o.type);
  const peak = o.live ? 999 : histPeak(r, o.tier);
  const q = clamp(r.normal(o.tier === 1 ? 74 : o.tier === 2 ? 64 : 55, 7), 30, 97);
  // discos antigos guardam só os números (save leve); lançamentos ao vivo ganham a faixa principal
  let songId = '';
  if (o.live) {
    songId = nextId(s, 'so');
    s.songs[songId] = {
      id: songId, actId: act.id, title: o.title, genre: act.genre, writers: act.members.slice(0, 2),
      melody: q + r.normal(0, 6), lyrics: q + r.normal(0, 6), performance: q + r.normal(0, 5), production: q + r.normal(0, 6), originality: q + r.normal(0, 8), q,
      recorded: true, createdWeek: s.week - 8,
    };
  }
  const rel: Release = {
    id: nextId(s, 'r'), actId: act.id, owner: o.owner ?? act.owner ?? 'indie', type: o.type, title: o.title, songs: songId ? [songId] : [],
    week: weekOfYear(s, o.year, r), year: o.year, q, appeal: 0, formats: [], stock: Infinity, pressed: 0, marketing: [], marketingE: 0,
    territories: [cityById[act.city]?.market ?? 'na'], weekly: [], totalUnits: units, revenue: 0, peak, weeksOnChart: Math.round(peak < 10 ? r.int(10, 40) : r.int(2, 14)),
    lastPos: 0, coverSeed: r.int(1, 2 ** 30), shortage: 0, live: !!o.live, hist: !o.live, prov: o.doc ? 'doc' : 'sim',
  };
  if (o.live) rel.week = s.week;
  if (o.kind === 'compilation' || o.kind === 'live') rel.kind = o.kind; // r27 (F): coletânea / ao vivo documentados
  if (songId) s.songs[songId].releaseId = rel.id;
  if (units >= 10e6) rel.certified = 'diamond';
  else if (units >= 1e6) rel.certified = 'platinum';
  else if (units >= 5e5) rel.certified = 'gold';
  s.releases[rel.id] = rel;
  noteRelease17(s, rel);
  act.releases.push(rel.id);
  if (songId) act.songs.push(songId);
  act.lastRelease = Math.max(act.lastRelease, rel.week);
  if (o.live) return rel;
  if (peak <= 10) act.hits += 1;
  if (peak === 1) act.number1s += 1;
  act.peakChart = Math.min(act.peakChart, peak);
  return rel;
}

/** Discografia simulada para quem já tinha carreira (atos gerados e o jogador). */
export function simulateDiscography(s: GameState, r: Rng, act: Act, fromYear: number, toYear: number, tier: number): void {
  const lang = langForCity(act.city, r);
  // R28: o título gerado pode coincidir por acaso com um lançamento real do ato (Peggy Lee sorteou "Fever") — no
  // mundo aleatório isso "restaura" a discografia real; troca por uma variação sem novo sorteio (o Rng não desloca)
  const realAl = new Set((realDataOf(act)?.al ?? []).map((a) => a[0].toLowerCase()));
  let y = fromYear;
  while (y < toYear) {
    const type: Release['type'] = y < 1958 ? 'single' : r.chance(0.55) ? 'lp' : r.chance(0.5) ? 'ep' : 'single';
    const gen0 = songTitle(r, lang);
    const gen = realAl.has(gen0.toLowerCase()) ? `${gen0} (${y})` : gen0;
    seedRelease(s, r, act, { title: (type === 'single' ? realSongTitle22(s, act, y) : undefined) ?? gen, year: y, type, tier });
    y += r.int(1, 3);
  }
}

// ---------------------------------------------------------------- criação

function makeRealPerson(s: GameState, r: Rng, act: Act, m: { name: string; role: Person['role']; born?: number; died?: number }, potential: number, real: boolean): Person {
  const lang = langForCity(act.city, r);
  const p = makePerson(s, r, { lang, role: m.role, potential, born: m.born ?? act.formed - r.int(18, 26), startFrac: 0.66, name: real ? m.name : undefined });
  s.persons[p.id] = p;
  if (m.born === undefined) p.real27 = { ...p.real27, bornEst: 1 }; // r27 (F): nascimento gerado → "idade aproximada"
  if (m.died !== undefined && m.died <= s.year) { p.alive = false; p.died = m.died; }
  return p;
}

// ---------------------------------------------------------------- identidade única (rodada 10)

/** Apelidos: grafias diferentes da mesma pessoa real nas listas. */
const ALIASES: Record<string, string> = {
  'beyonce knowles': 'beyonce',
  'beyonce knowlescarter': 'beyonce',
  'ozzy osbourne': 'ozzy',
  'john ozzy osbourne': 'ozzy',
  'roberto frejat': 'frejat',
  'agenor de miranda araujo neto': 'cazuza',
  'renato manfredini junior': 'renato russo',
  'gordon sumner': 'sting',
  'georgios panayiotou': 'george michael',
  'robert nesta marley': 'bob marley',
  'ney de souza pereira': 'ney matogrosso',
  'rita lee jones': 'rita lee',
  ...ALIASES16,
  ...ALIASES27, // r27 (F): tabela de apelidos (model27) — Mel B = Melanie Brown, Phil = Philip Selway, Jay Dee = J Dilla…
};

/** Chave canônica de um nome real (sem acentos, pontuação e caixa; apelidos unificados). */
/** r19 (T8, desempenho): memo puro texto → chave (não guarda estado de partida; kin15.graph recalcula milhares por mês). */
const CANON19 = new Map<string, string>();
export function canonKey(name: string): string {
  const m = CANON19.get(name);
  if (m !== undefined) return m;
  const k0 = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const k = ALIASES[k0] ?? k0;
  if (CANON19.size > 60000) CANON19.clear();
  CANON19.set(name, k);
  return k;
}
harmonize27(); // r27 (F): depois de canonKey existir (apelidos); antes de qualquer partida

/** Índice nome canônico → pessoa (saves antigos: reconstruído a partir dos atos reais, modo nomes reais). */
function pidIndex(s: GameState): Record<string, string> {
  const st = rw(s);
  if (st.pid) return st.pid;
  const idx: Record<string, string> = {};
  if (s.config.realNames) {
    for (const a of actsNow27(s)) {
      if (!a.catalogNo) continue;
      for (const id of [...a.members, ...(st.former[a.id] ?? []).map((x) => x.personId)]) {
        const p = s.persons[id];
        if (p) idx[canonKey(p.name)] ??= p.id;
      }
    }
  }
  st.pid = idx;
  return idx;
}

/** A pessoa real canônica para `p` (mesmo nome real e nascimento compatível); registra `p` se for a primeira. */
function canonical(s: GameState, p: Person, realName: string, born: number | undefined, exclude: string[]): Person {
  const idx = pidIndex(s);
  const key = canonKey(realName);
  if (!key) return p;
  let ex = idx[key] ? s.persons[idx[key]] : undefined;
  // R29 (CONNECT): o índice guarda nome → id, mas a Pessoa pode ter sido renomeada depois (integrante gerado reaproveitado
  // pela posição em decorate, sobrenome de família…). Sem esta checagem "jeremy spencer" apontava para quem virou
  // Mick Fleetwood, e a vaga de um real ia para OUTRA pessoa real (o caso Roger Waters como ex-Led Zeppelin).
  if (ex && canonKey(ex.name) !== key) { delete idx[key]; ex = undefined; }
  if (ex && ex !== p && !exclude.includes(ex.id) && !ex.isPlayer && (born === undefined || Math.abs(ex.born - born) <= 1)) {
    if (born !== undefined) ex.born = born;
    return ex;
  }
  if (!ex) idx[key] = p.id;
  return p;
}

/** Atos (fora `except`) dos quais a pessoa faz ou fez parte. */
function otherActsOf(s: GameState, personId: string, except: string): Act[] {
  const st = rw(s);
  return actsNow27(s).filter((a) => a.id !== except && (a.members.includes(personId) || (st.former[a.id] ?? []).some((x) => x.personId === personId)));
}

const potentialFor = (r: Rng, tier: number) => (tier === 1 ? r.int(90, 99) : tier === 2 ? r.int(80, 93) : r.int(68, 84));

/** r27 (F): procedência da pessoa real (a mais certa entre as cópias) e "idade aproximada" quando o nascimento foi gerado. */
const PROV_RANK: Record<Prov27, number> = { c: 0, a: 1, u: 2 };
function prov27(p: Person, pv: Prov27, born: number | undefined): void {
  const x = (p.real27 ??= {});
  if (!x.prov || PROV_RANK[pv] < PROV_RANK[x.prov]) x.prov = pv;
  if (born !== undefined) delete x.bornEst;
}

/** r27 (F): autores das obras de um ato (WORKS27, pelo nome do ato) */
const WB27 = new Map<string, string[]>();
function writersOf27(actName: string): string[] {
  let x = WB27.get(actName);
  if (!x) { x = [...new Set(WORKS27.filter((w) => w.by && canonKey(w.by) === canonKey(actName)).flatMap((w) => w.w))]; WB27.set(actName, x); }
  return x;
}
/** r27 (F): compositores reais das obras do ato que não são integrantes viram UMA Pessoa (gerador próprio, sem mexer no sorteio). */
function writers27(s: GameState, act: Act, actName: string, fates: boolean): void {
  const idx = pidIndex(s);
  const mine = new Set(act.members.map((id) => canonKey(s.persons[id]?.name ?? '')));
  for (const n of writersOf27(actName)) {
    const k = canonKey(n);
    const wd = WRITERS27[n];
    if (!wd || mine.has(k) || idx[k]) continue;
    const [born, died] = wd;
    if (born > s.year) continue;
    const r = Rng.fromSeed(`${s.config.seed}|w27|${k}`);
    const p = makePerson(s, r, { lang: langForCity(act.city, r), role: 'vocal', potential: 70, born, startFrac: 0.66, name: n });
    s.persons[p.id] = p;
    p.real27 = { prov: 'c', writer: 1 };
    idx[k] = p.id;
    if (died !== undefined && died <= s.year) { p.alive = false; p.died = died; }
    else if (died !== undefined && fates) rw(s).sched.push({ year: died, kind: 'fate', actId: act.id, personId: p.id });
    const lead = s.persons[act.members[0]];
    if (lead) { relPut(s, p.id, lead.id, 40); relPut(s, lead.id, p.id, 40); }
  }
}
/** r27 (F): compositores reais de uma obra (Pessoas que existem no jogo), para os créditos da música. */
export function realWriters27(s: GameState, act: Act, title: string): string[] {
  if (!s.config.realNames) return [];
  const w = workOf27(title, realDataOf(act)?.n);
  if (!w) return [];
  const idx = pidIndex(s);
  return w.w.map((n) => idx[canonKey(n)]).filter((id): id is string => !!id && !!s.persons[id]);
}

/** Aplica os dados reais a um ato já criado (integrantes, nascimento, fim, voltas, discografia). */
function decorate(s: GameState, r: Rng, act: Act, d: { n: string; t: number; d?: number; e?: number; rj?: [number, number?][]; b?: number; x?: number; r?: Person['role']; m?: RealMember[]; al?: RealRelease[]; exact?: false; ap?: RealArtist['ap'] }): void {
  const st = rw(s);
  if (st.done[act.id]) return;
  st.done[act.id] = 1;
  const real = !!s.config.realNames;
  const hm = histMode(s);
  // r18 (world18): só o modo exato agenda fatos reais futuros; nos outros (história alternativa) o futuro é da simulação
  const fates = hm === 'strict';
  const keep = (k: string, pr: number) => { void k; void pr; return hm === 'strict'; };
  const sched = { push: (e: Sched) => st.sched.push(e.mo !== undefined ? e : hm === 'strict' ? { ...e, mo: Math.floor(histRoll(s, `${e.kind}:${act.id}:${e.personId ?? e.rel?.[0] ?? e.m?.[0] ?? e.year}`) * 12) } : e) };
  const debut = act.debutYear;
  const shift = d.d !== undefined ? debut - d.d : 0; // deslocamento (modos livre/caos)
  // r20 (G8): mundo aleatório v2 — identidade real (nome, papel, nascimento, formação de estreia), mas nada da cronologia
  // documentada anterior ao início (entradas/saídas, mortes, fim, voltas, discos) vira fato da partida.
  const sim = simStart20(s);
  const simDead = (key: string, born: number | undefined) => (sim && s.week === 0 ? simDeath20(s, `${act.id}:${key}`, born, s.year, debut + 1) : undefined);
  if (real) act.name = d.n;
  // integrantes
  if (d.m?.length) {
    const now: string[] = [];
    const old = act.members.map((id) => s.persons[id]).filter(Boolean);
    // r27 (LIN): a formação na data atual (ano E mês) — quem saiu antes vira ex-integrante, quem entra depois é agendado.
    // Antes, no mundo aleatório (G8) todo mundo que entrou até a estreia ficava como atual (Beatles com Stuart, Pete e
    // Ringo juntos em jan/1962), e fora do modo exato a "formação clássica" entrava já no início.
    // Trocas agendadas: no modo exato, todas; nos outros, só as da formação de identidade (até a estreia ou, se a banda
    // cresceu depois, até a formação clássica) — depois disso o futuro é da simulação.
    // R28: a janela de identidade tem teto de 10 anos depois da estreia — o "maior elenco até 2030" pegava reuniões
    // tardias (Rush + Anika Nilles em 2026, volta de Jermaine aos Jacksons em 1983) e agendava fatos reais décadas depois
    // do início na história alternativa. Formações clássicas da 1ª década (Nickelback + Daniel Adair, 9 anos) seguem.
    const debY27 = d.d ?? debut - shift;
    const identY = fates ? Infinity : Math.min(identityYear27(d.m, debY27), debY27 + IDENT_CAP27) + shift;
    const canSched = (y: number) => (fates ? s.config.mode !== 'chaos' : y <= identY);
    const lin = fates ? {} : { lin: 1 as const };
    const shifted = (m: RealMember) => periodsOf(m).map(([a, b]) => [a !== undefined ? a + shift : undefined, b !== undefined ? b + shift : undefined] as RealPeriod);
    const begun = (name: string, a: number | undefined, relax: boolean) => a === undefined || a < s.year || (a === s.year && (relax || lineupMo27(s, act, name, 'j', a) <= s.month));
    const over = (name: string, b: number | undefined) => b !== undefined && (b < s.year || (b === s.year && lineupMo27(s, act, name, 'l', b) <= s.month));
    const skip = (m: RealMember) => hm === 'strict' && memberProv27(d.n, m[0]) === 'u'; // r27 (F): integrante não conferido some do modo exato
    // ninguém dentro pelo mês (todos entram no próprio ano): vale o ano, para o ato não ficar com integrantes gerados
    const relax = !d.m.some((m) => !skip(m) && shifted(m).some(([a, b]) => begun(m[0], a, false) && !over(m[0], b)));
    // R29 (formação): formação inicial escolhida (mais famosa/original) sem trocas agendadas; os outros ficam livres
    const l29 = lineup29Of(s.config);
    if (l29) members29(s, act, d as RealDec29, old, now, l29, { sim, real, shift, simDead });
    (l29 ? [] : d.m).forEach((m, i) => {
      const [name, role, born, died0] = m;
      const mp = memberProv27(d.n, name);
      if (skip(m)) return;
      // r27 (F): passagens (saiu e voltou) — deslocadas nos modos livre/caos
      const ps = shifted(m);
      const join = ps[0][0];
      const started = ps.filter(([a]) => begun(name, a, relax));
      const cur = started.find(([, b]) => !over(name, b));
      const future = ps.filter(([a]) => !begun(name, a, relax) && canSched(a!));
      const died = sim ? simDead(name, born) : died0;
      // agenda as entradas futuras (1ª passagem de quem ainda não entrou; voltas) no mês documentado ou sorteado
      const pushJoins = (pid?: string) => { for (const [a, b] of future) sched.push({ year: a!, mo: lineupMo27(s, act, name, 'j', a!), kind: 'join', actId: act.id, m, until: b !== undefined && canSched(b) ? b : undefined, personId: pid, ...lin }); };
      if (!started.length) {
        pushJoins(); // ainda não entrou: entra no ano/mês real (fora da janela de identidade, nem entra)
        return;
      }
      const reuse = old[i] && (join === undefined || join <= debut) ? old[i] : undefined;
      let p: Person;
      if (reuse) {
        p = reuse;
        if (real && p.name !== name) { const idx = pidIndex(s), k0 = canonKey(p.name); if (idx[k0] === p.id) delete idx[k0]; p.name = name; } // R29: índice segue o nome
        p.role = role;
        if (born) p.born = born;
      } else {
        p = makeRealPerson(s, r, act, { name, role, born, died }, act.potential, real);
      }
      // a mesma pessoa real já existe em outro ato (banda → solo, supergrupo): reaproveita
      const c = canonical(s, p, name, born, now);
      if (c !== p) {
        if (p !== reuse) delete s.persons[p.id];
        p = c;
      }
      prov27(p, mp ?? (d.exact === false ? 'u' : d.ap?.includes('m') ? 'a' : 'c'), born);
      roles27(p, name, i === 0 && frontmanSings27(act.genre, d.m!) === name);
      if (died !== undefined && died <= s.year) { p.alive = false; p.died = died; }
      else if (died !== undefined && fates) sched.push({ year: died, kind: 'fate', actId: act.id, personId: p.id });
      if (!cur) {
        const lastOut = Math.max(...started.map(([, b]) => b ?? s.year));
        (st.former[act.id] ??= []).push({ personId: p.id, year: lastOut, reason: 'left' });
      } else {
        now.push(p.id);
        const leave = cur[1];
        if (leave !== undefined && canSched(leave)) sched.push({ year: leave, mo: lineupMo27(s, act, name, 'l', leave), kind: 'leave', actId: act.id, personId: p.id, ...lin });
      }
      pushJoins(p.id);
    });
    // r27 (LIN): ato que já acabou com todo mundo fora (Menudo em 2005): a última formação continua como a do ato
    if (!l29 && !now.length && st.former[act.id]?.length) {
      const xs = st.former[act.id], last = Math.max(...xs.map((x) => x.year));
      for (const x of xs.filter((f) => f.year === last)) now.push(x.personId);
      st.former[act.id] = xs.filter((f) => f.year !== last);
    }
    // integrantes gerados que sobraram saem do ato
    for (const p of old) if (!now.includes(p.id) && !(st.former[act.id] ?? []).some((x) => x.personId === p.id)) delete s.persons[p.id];
    // R29 (CONNECT): músicas já criadas com os integrantes gerados nos créditos passam para quem ocupou a vaga (mesma
    // posição) ou para o(a) líder — antes ficavam com ids de pessoas apagadas ("compositor inexistente" na ficha da música)
    // As músicas que já existem aqui foram compostas pela formação provisória (antes de decorar): crédito de quem não
    // está na formação atual (ex-integrante que só entrou pela posição, como Syd Barrett em "Breathe" de 1975) também
    // passa para a formação atual. Compositores reais de fora (real27.writer, WORKS27) ficam.
    const heir = (id: string, i: number) => (s.persons[id] && (now.includes(id) || s.persons[id].real27?.writer) ? id : (now[i] ?? now[0]));
    for (const sid of act.songs) {
      const so = s.songs[sid];
      if (so?.writers.some((w) => !s.persons[w] || !(now.includes(w) || s.persons[w].real27?.writer))) so.writers = [...new Set(so.writers.map((w) => heir(w, old.findIndex((o) => o.id === w))).filter((w): w is string => !!w && !!s.persons[w]))];
      const ws = so && real ? realWriters27(s, act, so.title) : [];
      if (so && ws.length) so.writers = ws; // obra real conhecida: os compositores de verdade
    }
    if (now.length) act.members = now; actsTouched17(s); // r17: índice pessoa→atos
    act.leaderId = act.members[0];
    // relações entre os integrantes (pessoas reaproveitadas de outros atos)
    for (const a of act.members) for (const b of act.members) if (a !== b && s.persons[a]) relTouch(s, a, b, 20);
  } else {
    let p = s.persons[act.members[0]];
    // carreira solo de quem já está (ou esteve) numa banda: a mesma pessoa, não um sósia
    if (p && act.members.length === 1) {
      const c = canonical(s, p, d.n, d.b, []);
      if (c !== p) {
        delete s.persons[p.id];
        act.members = [c.id]; actsTouched17(s); // r17: índice pessoa→atos
        act.leaderId = c.id;
        if (!real) act.name = c.name;
        p = c;
        const from = otherActsOf(s, c.id, act.id)[0];
        if (from && s.week > 0) remember(s, 'solo', fmtL(l('{p} ({a}) estreia em carreira solo.', '{p} ({a}) debuts a solo career.'), { p: c.name, a: from.name }), { actId: act.id, important: act.fame > 30 || from.fame > 45 });
      }
    }
    if (p) {
      if (real) p.name = d.n;
      if (d.b) p.born = d.b;
      if (d.r) p.role = d.r;
      roles27(p, d.n, false);
      prov27(p, d.exact === false ? 'u' : d.ap?.some((x) => x === 'b' || x === 'd' || x === 'x') ? 'a' : 'c', d.b);
      const x = sim ? simDead(d.n, d.b) : d.x;
      if (x !== undefined && x <= s.year) { p.alive = false; p.died = x; }
      else if (x !== undefined && fates) sched.push({ year: x, kind: 'fate', actId: act.id, personId: p.id });
    }
  }
  // fim de carreira e voltas
  if (sim) act.careerEnd = Math.max(s.year, act.debutYear) + 2 + Math.floor(histRoll(s, `${act.id}:e18`) * 24); // r20: fim sorteado, não o real
  else if (d.e !== undefined && hm !== 'strict' && d.e + shift >= s.year) act.careerEnd = Math.max(s.year, act.debutYear) + 2 + Math.floor(histRoll(s, `${act.id}:e18`) * 24); // r18: fim de carreira futuro sorteado
  else if (d.e !== undefined) act.careerEnd = d.e + shift + (s.config.mode === 'historic' ? 0 : jitter(s, r, 2));
  else act.careerEnd = Math.max(act.careerEnd, 2026 + r.int(0, 14));
  for (const [a, b] of sim ? [] : d.rj ?? []) if (a + shift < s.config.startYear || keep(`r${a}`, 0.4)) sched.push({ year: a + shift, kind: 'reunion', actId: act.id, until: b !== undefined ? b + shift : undefined });
  // discografia: o que já saiu vira catálogo; o resto sai no ano certo (se o ato não for do jogador)
  for (const rel of sim ? [] : d.al ?? []) { // r20: no mundo aleatório v2 o repertório anterior é simulado (newgame)
    const year = rel[1] + shift;
    const title = real ? rel[0] : songTitle(r, langForCity(act.city, r));
    if (year < s.year || (year === s.year && s.month > 0)) seedRelease(s, r, act, { title, year, type: rel[2] ?? 'lp', tier: d.t, doc: real, kind: rel[3] });
    else if (keep(`a${rel[0]}`, 0.5)) sched.push({ year, kind: 'release', actId: act.id, rel: [title, year, rel[2], rel[3]] });
  }
  // r27 (F): parceiros de composição reais (não integrantes) viram Pessoa — Zé Dantas e Humberto Teixeira com Gonzaga
  if (real && !sim) writers27(s, act, d.n, fates);
  // todo mundo morto antes da run: o ato é parte da história
  if (act.members.length && act.members.every((id) => !s.persons[id]?.alive)) {
    act.status = 'retired';
    act.deceased = true;
  }
}

/** r25: formação clássica = integrantes do primeiro ano com a maior formação simultânea documentada. Só existe quando
 *  ela é maior que a de estreia (ex.: Earth, Wind & Fire estreou com 2 e chegou a 5; Yes, Genesis e Deep Purple com 3 → 5).
 *  Fora do modo exato as entradas posteriores não são agendadas; sem isto a banda ficava para sempre com a formação de estreia. */
export function classicLineup25(m: RealMember[], debut: number): Set<number> | undefined {
  const deb = m.filter((x) => inLineupAt(x, debut)).length; // r27 (F): quem já tinha saído antes da estreia não conta
  let best: number[] = [];
  for (let y = debut; y <= 2030; y++) {
    const xs: number[] = [];
    m.forEach((x, i) => { if (inLineupAt(x, y)) xs.push(i); }); // r27 (F): por passagens
    if (xs.length > best.length) best = xs;
  }
  return best.length > deb ? new Set(best) : undefined;
}

/** r27 (LIN): último ano das trocas de formação roteirizadas fora do modo exato — a estreia ou, quando a banda cresceu
 *  depois (classicLineup25), o primeiro ano da formação clássica. */
/** Anos depois da estreia em que a formação de identidade ainda se agenda fora do modo exato (R28). */
export const IDENT_CAP27 = 10;

export function identityYear27(m: RealMember[], debut: number): number {
  const deb = m.filter((x) => inLineupAt(x, debut)).length;
  let best = 0, at = debut;
  for (let y = debut; y <= 2030; y++) { const n = m.filter((x) => inLineupAt(x, y)).length; if (n > best) { best = n; at = y; } }
  return best > deb ? at : debut;
}

// ---------------------------------------------------------------- R29 (formação): formação inicial escolhida

/** Dados reais que decorate recebe (subconjunto usado pela formação inicial). */
type RealDec29 = { n: string; t: number; d?: number; m?: RealMember[]; exact?: false; ap?: RealArtist['ap'] };
/** Idade mínima para alguém da história real existir no mundo (como integrante ou pessoa livre). R29 (família): com as
 *  regras de estrela mirim (responsável, fundo, escola e limite de horas — sys/family29), 12 anos em vez de 15: Michael
 *  Jackson entra no Jackson 5 com 12 num mundo de 1970 (no modo exato vale a idade real, pelo roteiro). */
const AGE29 = 12;

/** R29 (formação): índices (em `m`) da formação inicial escolhida.
 *  - 'famous': a formação clássica (classicLineup25) ou, sem ela, a da estreia (inLineupAt no ano da estreia);
 *  - 'original': quem estava na banda no COMEÇO do ano de estreia — entrada no próprio ano só conta sem mês documentado
 *    (ou em janeiro) e saída no próprio ano só conta como "ainda dentro" com mês documentado (MONTHS27). Beatles 1962 =
 *    John, Paul, George e Pete Best (Ringo entrou em agosto). Sem ninguém assim, vale a da estreia. */
export function lineupPick29(m0: RealMember[], debut: number, kind: Lineup29, actName: string): Set<number> {
  // a morte documentada fecha a passagem (Keith Moon não tem saída, só a morte em 1978: sem isto o "maior elenco" do
  // The Who era Moon + Kenney Jones juntos, dois bateristas)
  const m = m0.map((x): RealMember => {
    const died = x[3];
    if (died === undefined) return x;
    const ps = periodsOf(x).map(([a, b]) => [a, b === undefined || b > died ? died : b] as RealPeriod);
    return [x[0], x[1], x[2], x[3], ps[0][0], ps[0][1], ps.length > 1 ? ps : undefined];
  });
  const at = (f: (x: RealMember) => boolean) => new Set(m.flatMap((x, i) => (f(x) ? [i] : [])));
  const deb = (): Set<number> => {
    for (const xs of [at((x) => inLineupAt(x, debut)), at((x) => atDebut27(x, debut))]) if (xs.size) return xs;
    const first = Math.min(...m.map((x) => firstJoin(x) ?? -Infinity)); // ninguém na estreia: os primeiros que entraram
    return at((x) => (firstJoin(x) ?? -Infinity) === first);
  };
  if (kind === 'famous') return classicLineup25(m, debut) ?? deb();
  const xs = at((x) => periodsOf(x).some(([a, b]) => {
    const jm = lineupMonth27(actName, x[0], 'j'), lm = lineupMonth27(actName, x[0], 'l');
    return (a === undefined || a < debut || (a === debut && !jm)) && (b === undefined || b > debut || (b === debut && !!lm));
  }));
  return xs.size ? xs : deb();
}

/** Nascimento de um integrante real (documentado ou estimado pela 1ª entrada, deslocada como a estreia). */
const born29 = (x: RealMember, shift: number, debut: number): number => x[2] ?? (firstJoin(x) ?? debut) + shift - 21;

/** R29 (formação): integrantes do ato pela formação escolhida — sem nenhuma troca agendada (o futuro é da simulação).
 *  Pessoas reais reaproveitam os integrantes gerados pela posição e passam pelo índice canônico (rw.pid), como antes.
 *  Gerador próprio (semente|lin29|ato): não consome o fluxo compartilhado, então 'famous' e 'original' geram o mesmo
 *  resto de mundo. Quem está fora da formação vira pessoa livre (free29) — nunca ex-integrante. */
function members29(s: GameState, act: Act, d: RealDec29, old: Person[], now: string[], kind: Lineup29, o: { sim: boolean; real: boolean; shift: number; simDead: (key: string, born: number | undefined) => number | undefined }): void {
  const st = rw(s);
  const m = d.m ?? [];
  const debY = d.d ?? act.debutYear - o.shift;
  const pick = lineupPick29(m, debY, kind, d.n);
  const rr = Rng.fromSeed(`${s.config.seed}|lin29|${act.id}`);
  const fate = (x: RealMember) => (o.sim ? o.simDead(x[0], x[2]) : x[3]);
  const gone = (x: RealMember) => { const y = fate(x); return y !== undefined && y <= s.year; };
  const young = (x: RealMember) => born29(x, o.shift, debY) > s.year - AGE29;
  // quem da formação escolhida pode estar nela agora: vivo e com idade (se ninguém puder, vale a escolha inteira)
  const ok = [...pick].filter((i) => !gone(m[i]) && !young(m[i]));
  const keep = new Set(ok.length ? ok : pick);
  // os integrantes gerados (nomeados pela lista do catálogo) saem do índice: quem for reaproveitado volta pelo canonical;
  // os que sobram seriam apagados e não podem "ocupar" o nome de quem fica livre (Ringo na formação original)
  const idx0 = pidIndex(s);
  for (const p of old) { const k0 = canonKey(p.name); if (idx0[k0] === p.id) delete idx0[k0]; }
  let k = 0;
  // primeiro a formação escolhida (reaproveita as vagas), depois quem fica de fora
  const order = [...m.keys()].sort((a, b) => Number(!keep.has(a)) - Number(!keep.has(b)) || a - b);
  for (const i of order) {
    const x = m[i];
    const [name, role, born] = x;
    const died = fate(x);
    const pv = memberProv27(d.n, name) ?? (d.exact === false ? 'u' : d.ap?.includes('m') ? 'a' : 'c');
    if (!keep.has(i)) {
      // da formação escolhida, mas morto antes do início: tocou na banda até morrer (se a banda já existia) — ex-integrante
      // por morte; morto antes da estreia, nunca passou por ela. Fora da formação: pessoa livre, nunca ex-integrante.
      if (pick.has(i) && died !== undefined && died <= s.year && died >= act.debutYear) {
        const p0 = makeRealPerson(s, rr, act, { name, role, born, died }, act.potential, o.real);
        const p = canonical(s, p0, name, born, now);
        if (p !== p0) { delete s.persons[p0.id]; if (p.alive) continue; } // a mesma pessoa vive em outro ato: não morreu aqui
        prov27(p, pv, born);
        roles27(p, name, false);
        (st.former[act.id] ??= []).push({ personId: p.id, year: p.died ?? died, reason: 'died' });
      } else free29(s, act, d, i, o.shift, died);
      continue;
    }
    const reuse = old[k++];
    let p: Person;
    if (reuse) {
      p = reuse;
      if (o.real && p.name !== name) { const idx = pidIndex(s), k0 = canonKey(p.name); if (idx[k0] === p.id) delete idx[k0]; p.name = name; } // índice segue o nome
      p.role = role;
      if (born) p.born = born;
    } else p = makeRealPerson(s, rr, act, { name, role, born, died }, act.potential, o.real);
    const c = canonical(s, p, name, born, now);
    if (c !== p) {
      if (p !== reuse) delete s.persons[p.id];
      p = c;
    }
    prov27(p, pv, born);
    roles27(p, name, i === 0 && frontmanSings27(act.genre, m) === name);
    if (died !== undefined && died <= s.year) { p.alive = false; p.died = died; } // só quando a formação inteira já morreu
    now.push(p.id);
  }
}

/** R29 (formação): pessoa real fora da formação inicial — existe no mundo SEM banda (pode ser achada, contratada,
 *  chamada para banda, feat ou sessão), pelo mesmo índice canônico. Não entra em former (não passou pela banda nesta
 *  partida). Já existe (outra banda, solo, compositor) ou morreu antes: nada a fazer. Jovem demais: espera (pend29). */
function free29(s: GameState, act: Act, d: RealDec29, i: number, shift: number, died?: number): void {
  const x = d.m?.[i];
  if (!x) return;
  const [name, role, born] = x;
  const key = canonKey(name);
  if (!key) return;
  const st = rw(s), idx = pidIndex(s);
  const ex = idx[key] ? s.persons[idx[key]] : undefined;
  if (ex && canonKey(ex.name) === key) return;
  if (died !== undefined && died <= s.year) return; // morreu antes do início: fica só na história real
  const b = born29(x, shift, d.d ?? act.debutYear - shift);
  if (b > s.year - AGE29) { if (!(st.pend29 ??= []).some(([a, j]) => a === act.id && j === i)) st.pend29.push([act.id, i]); return; }
  const r = Rng.fromSeed(`${s.config.seed}|free29|${key}`);
  const p = makePerson(s, r, { lang: langForCity(act.city, r), role, potential: potentialFor(r, d.t), born: b, startFrac: 0.66, name });
  s.persons[p.id] = p;
  if (born === undefined) p.real27 = { ...p.real27, bornEst: 1 };
  prov27(p, memberProv27(d.n, name) ?? (d.exact === false ? 'u' : 'c'), born);
  roles27(p, name, false);
  idx[key] = p.id;
  (st.free29 ??= {})[p.id] = act.id;
}

/** R29 (formação): pessoas livres que eram jovens demais no início surgem aos 12 anos (AGE29; sem banda). */
function pending29(s: GameState): void {
  const st = rw(s);
  if (!st.pend29?.length || !lineup29Of(s.config)) return;
  const due: [Act, RealDec29, number, number][] = [];
  st.pend29 = st.pend29.filter(([aid, i]) => {
    const a = s.acts[aid], d = a ? realDataOf(a) : undefined, x = d?.m?.[i];
    if (!a || !d || !x) return false;
    const shift = d.d !== undefined ? a.debutYear - d.d : 0;
    if (born29(x, shift, d.d ?? a.debutYear) > s.year - AGE29) return true;
    due.push([a, d, i, shift]);
    return false;
  });
  for (const [a, d, i, shift] of due) free29(s, a, d, i, shift);
}

/** r27 (LIN): mês (0–11) de uma entrada/saída: o documentado (MONTHS27) ou um sorteio fixo pela semente. */
export function lineupMo27(s: GameState, act: Act, name: string, k: 'j' | 'l', y: number): number {
  return lineupMonth27(realDataOf(act)?.n ?? act.name, name, k) ?? Math.floor(histRoll(s, `${k}27:${act.id}:${name}:${y}`) * 12);
}

/** r27 (LIN): funções extras da pessoa real (ROLES27) ou, pela heurística, o frontman que canta. Só exibição. */
function roles27(p: Person, name: string, sings: boolean): void {
  const xs = realRoles27(name) ?? (sings ? ['vocal' as const] : undefined);
  if (xs?.length) p.roles27 = xs.map((x) => (Array.isArray(x) ? [x[0], x[1]] as [string, number] : x));
}

function membersAtDebut(a: RealArtist): number {
  if (!a.m?.length) return 1;
  return Math.max(1, a.m.filter((m) => inLineupAt(m, a.d)).length);
}

function spawnReal(s: GameState, r: Rng, idx: number, startOfRun: boolean): Act | undefined {
  const a = REAL_ALL[idx];
  if (!a || !cityById[a.c]) return undefined;
  const debut = a.d;
  void startOfRun;
  const pot = potentialFor(r, a.t);
  const act = makeAct(s, r, {
    name: s.config.realNames ? a.n : undefined, genre: a.g, city: a.c, members: membersAtDebut(a), potential: pot,
    formed: a.f !== undefined ? Math.min(a.f, debut) : debut - 1, debutYear: debut, catalogNo: REAL_BASE + idx, fame: r.float(0.5, 3), startFrac: r.float(0.58, 0.7),
  });
  return act;
}

function activeYearsFame(r: Rng, tier: number, years: number): number {
  const top = tier === 1 ? r.float(55, 88) : tier === 2 ? r.float(32, 62) : r.float(14, 38);
  return clamp(top * Math.min(1, 0.35 + years / 10), 4, 92);
}

function setFans(act: Act): void {
  const f = Math.pow(10, 2 + act.fame / 22);
  act.fans = { casual: Math.round(f), active: Math.round(f * 0.2), core: Math.round(f * 0.04) };
}

function newgame(s: GameState, r: Rng): void {
  const st = rw(s);
  const y0 = s.config.startYear;
  const mode = s.config.mode;
  const sim = simStart20(s); // r20 (G8): estado inicial simulado (status, fim, fama e catálogo não vêm das datas reais)
  // catálogo clássico: decora os que existem; quem já terminou antes da run vira história (modo real)
  const byNo = new Map(actsNow27(s).filter((a) => a.catalogNo && a.catalogNo < REAL_BASE).map((a) => [a.catalogNo!, a]));
  const upcomingNos = new Set(s.upcoming.map((u) => u.no));
  for (const [noStr, ex] of Object.entries(REAL_CLASSIC)) {
    const no = Number(noStr);
    const act = byNo.get(no);
    const d = { ...ex, n: REAL_ACTS[no]?.name ?? '', t: 1 };
    if (act) {
      if (s.config.realNames) decorate(s, r, act, d);
      continue;
    }
    // r27 (LIN): quem estreia no próprio ano inicial não pode ter "terminado antes do início" (Beatles separados em jan/1962)
    if (upcomingNos.has(no) || !s.config.realNames || ex.d === undefined || ex.d >= y0) continue;
    // terminou antes do início: entra aposentado/separado, com catálogo
    const real = REAL_ACTS[no];
    const memberCount = Math.max(1, (ex.m ?? []).filter((m) => inLineupAt(m, ex.d!)).length);
    const ca = makeAct(s, r, { name: real?.name, genre: 'pop', city: s.config.homeCity, members: memberCount, potential: potentialFor(r, 1), formed: ex.d - 1, debutYear: ex.d, catalogNo: no, fame: 0 });
    fixClassicGenre(s, ca, no);
    decorate(s, r, ca, d);
    ca.status = ca.deceased ? 'retired' : (ex.m?.length ?? 0) > 1 ? 'split' : 'retired';
    const endY = sim ? Math.min(y0 - 1, ex.d + simCareer20(s, `cl:${no}`)) : ex.e ?? y0;
    ca.fame = clamp(45 + r.float(0, 30) - (y0 - endY) / 3, 15, 85);
    if (sim) { ca.careerEnd = endY; if (endY > ex.d) simulateDiscography(s, r, ca, ex.d, endY, 1); }
    setFans(ca);
    ca.legend = true;
  }
  // artistas reais novos
  const rMain = r, rAc = acRng(s, 'start');
  for (let i = 0; i < REAL_ALL.length; i++) {
    const r = i >= ACERVO21_FROM ? rAc : rMain;
    const a = REAL_ALL[i];
    if (!realAllowed(s.config, a) || brOff31(s, i)) continue;
    if (mode === 'chaos' && r.chance(0.25)) continue;
    if (mode === 'free' && r.chance(0.08)) continue;
    const debut = a.d + jitter(s, r, 2);
    if (debut > y0) { st.upcoming.push(i); continue; }
    const end = sim ? debut + simCareer20(s, `rw:${i}`) : a.e;
    const reunionNow = !sim && (a.rj ?? []).some(([x, y]) => x <= y0 && (y === undefined || y >= y0));
    // r20: fama histórica não garante liderança atual no mundo aleatório v2 (porte sorteado em torno do real)
    const tr = roll20(s, `tier:${i}`);
    const tier = sim ? (Math.max(1, Math.min(3, a.t + (tr < 0.3 ? 1 : tr > 0.85 ? -1 : 0))) as 1 | 2 | 3) : a.t;
    const act = spawnReal(s, r, i, true);
    if (!act) continue;
    act.debutYear = debut;
    act.formed = a.f !== undefined ? Math.min(a.f, debut) : debut - 1; // r27: formação real quando bem antes da estreia
    decorate(s, r, act, a);
    const years = y0 - debut;
    if (end !== undefined && end < y0 && !reunionNow) {
      // já encerrou: catálogo e lenda (fica na aba de inativos)
      if (!act.deceased) act.status = (a.m?.length ?? 0) > 1 ? 'split' : 'retired';
      act.fame = clamp(activeYearsFame(r, tier, end - debut) - (y0 - end) / 2, 5, 80);
      if (sim) { act.careerEnd = end; if (end > debut) simulateDiscography(s, r, act, debut, end, tier); }
      setFans(act);
      if (a.t === 1) act.legend = true;
      continue;
    }
    if (act.status === 'retired') continue;
    act.status = 'active';
    act.fame = activeYearsFame(r, tier, years);
    act.momentum = r.float(35, 75);
    act.positioning = r.float(35, 85);
    setFans(act);
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p) continue;
      for (const k of Object.keys(p.skills) as (keyof typeof p.skills)[]) p.skills[k] = Math.min(p.potential, p.skills[k] + Math.min(20, years * 2));
    }
    if ((sim || !(a.al ?? []).length) && years >= 1) simulateDiscography(s, r, act, debut, y0, tier);
    if (act.fame > 12 || r.chance(0.5)) signToBestRival(s, r, act);
  }
  // atos gerados ativos no início ganham discografia simulada
  for (const act of actsNow27(s)) {
    if (act.catalogNo || act.owner === 'player' || act.playerBand || act.releases.length) continue;
    const years = y0 - act.formed;
    if (years < 2 || act.fame < 6) continue;
    simulateDiscography(s, r, act, Math.max(act.formed + 1, y0 - 12), y0, act.fame > 40 ? 2 : 3);
  }
  // catálogo clássico ativo também ganha os discos que faltam (modo ficcional)
  for (const act of actsNow27(s)) {
    if (!act.catalogNo || act.catalogNo >= REAL_BASE || act.releases.length || act.status !== 'active') continue;
    simulateDiscography(s, r, act, act.debutYear, y0, 1);
  }
}

/** Gênero e cidade do catálogo clássico (para quem foi criado fora do caminho normal). */
function fixClassicGenre(s: GameState, act: Act, no: number): void {
  void s;
  const def = CATALOG_LOOKUP()[no];
  if (def) {
    act.genre = def.genre;
    act.city = def.city;
  }
}

let catalogCache: Record<number, { genre: string; city: string }> | null = null;
function CATALOG_LOOKUP(): Record<number, { genre: string; city: string }> {
  if (!catalogCache) {
    catalogCache = {};
    for (const c of CATALOG_ACTS) catalogCache[c.no] = { genre: c.genre, city: c.city };
  }
  return catalogCache;
}

// ---------------------------------------------------------------- mês a mês

function monthly(s: GameState, r: Rng): void {
  const st = rw(s);
  pending29(s); // R29 (formação): pessoas reais livres que só agora têm idade
  // surgem os artistas reais do ano (um ano antes da estreia, como promessa de cena)
  if (st.upcoming.length) {
    const keep: number[] = [];
    const rMain = r, rAc = acRng(s, `m${s.year * 12 + s.month}`);
    for (const i of st.upcoming) {
      const r = i >= ACERVO21_FROM ? rAc : rMain;
      const a = REAL_ALL[i];
      if (brOff31(s, i)) continue; // R31 (BASE-BR): desligado no meio da partida — sai da fila
      if (!a || s.year < a.d - 1 || (s.year === a.d - 1 && s.month < 6)) { keep.push(i); continue; }
      const act = spawnReal(s, r, i, false);
      if (!act) continue;
      decorate(s, r, act, a);
      if (s.config.role !== 'artist' && (s.player.territories.includes(CITIES.find((c) => c.id === a.c)?.market ?? 'na') || r.chance(a.t === 1 ? 0.6 : 0.25))) addSignal(s, r, act.id, 'scene');
    }
    st.upcoming = keep;
  }
  // catálogo clássico que acabou de surgir
  if (s.config.realNames) {
    for (const act of actsNow27(s)) {
      if (!act.catalogNo || act.catalogNo >= REAL_BASE || st.done[act.id]) continue;
      const ex = REAL_CLASSIC[act.catalogNo];
      if (ex) decorate(s, r, act, { ...ex, n: REAL_ACTS[act.catalogNo]?.name ?? act.name, t: 1 });
      else st.done[act.id] = 1;
    }
  }
  // agenda histórica
  if (!st.sched.length) return;
  if (histMode(s) !== 'strict' && st.sched.some((x) => x.year >= s.config.startYear && !x.lin)) st.sched = st.sched.filter((x) => x.year < s.config.startYear || x.lin); // r18: saves antigos (r27 LIN: menos a formação de identidade)
  const isDue = (x: Sched) => x.year < s.year || (x.year === s.year && (x.mo ?? 0) <= s.month);
  const due = st.sched.filter(isDue);
  if (!due.length) return;
  st.sched = st.sched.filter((x) => !isDue(x));
  const hm = histMode(s);
  for (const ev of due) {
    const act = s.acts[ev.actId];
    if (!act) continue;
    if (ev.kind === 'join' && (act.status === 'retired' || act.status === 'split') && st.sched.some((x) => x.kind === 'reunion' && x.actId === act.id && x.year <= s.year)) {
      st.sched.push({ ...ev, mo: Math.min(12, s.month + 1) }); // rodada 16: volta na reunião do mesmo ano
    } else if (ev.kind === 'join' && ev.m && act.status !== 'retired' && act.status !== 'split' && !histDiverged(s, act)) {
      const [name, role, born, died] = ev.m;
      // r27 (F): quem volta (2ª passagem) é a mesma Pessoa; quem estreia na banda é criado agora
      const back = ev.personId ? s.persons[ev.personId] : undefined;
      let p = back ?? makeRealPerson(s, r, act, { name, role, born, died }, act.potential, !!s.config.realNames);
      if (!back) { const c = canonical(s, p, name, born, act.members); if (c !== p) { delete s.persons[p.id]; p = c; } }
      if (act.members.includes(p.id) || !p.alive) continue;
      prov27(p, memberProv27(realDataOf(act)?.n ?? '', name) ?? 'c', born);
      act.members.push(p.id); actsTouched17(s); // r17: índice pessoa→atos
      const until = ev.until; // fim desta passagem
      roles27(p, name, false);
      if (until !== undefined && until >= s.year) st.sched.push({ year: until, mo: until === s.year ? Math.max(s.month + 1, lineupMo27(s, act, name, 'l', until)) : lineupMo27(s, act, name, 'l', until), kind: 'leave', actId: act.id, personId: p.id, lin: ev.lin }); // rodada 16: segunda passagem também sai (r27 LIN: no mês)
      remember(s, 'lineup', fmtL(l('{p} entra em {a}.', '{p} joins {a}.'), { p: p.name, a: act.name }), { actId: act.id, pid: p.id, important: act.fame > 30 });
    } else if (ev.kind === 'leave' && ev.personId && !histDiverged(s, act) && act.members.includes(ev.personId) && act.members.length > 1) {
      exitMember20(s, act, ev.personId);
      (st.former[act.id] ??= []).push({ personId: ev.personId, year: s.year, reason: 'left' });
      const p = s.persons[ev.personId];
      remember(s, 'lineup', fmtL(l('{p} deixa {a}.', '{p} leaves {a}.'), { p: p?.name ?? '?', a: act.name }), { actId: act.id, pid: ev.personId, important: act.fame > 30 });
    } else if (ev.kind === 'reunion' && (act.status === 'retired' || act.status === 'split') && !act.deceased && !histDiverged(s, act)) {
      const alive = act.members.filter((id) => s.persons[id]?.alive);
      if (!alive.length) continue;
      act.status = 'active';
      act.momentum = clamp(act.momentum + 40, 0, 100);
      act.careerEnd = ev.until ?? Math.max(s.year + r.int(2, 6), hm === 'strict' ? 2026 : 0);
      remember(s, 'reunion', fmtL(l('{a} se reúne para uma volta histórica.', '{a} reunites for a historic comeback.'), { a: act.name }), { actId: act.id, important: true });
    } else if (ev.kind === 'fate' && ev.personId) {
      const p = s.persons[ev.personId];
      if (p?.alive && (r.chance(0.85) || (hm === 'strict' && !histAltered(s, act)))) { // exata: 100% (salvo se você mudou a história do ato)
        if (actsNow27(s).some((a) => a.members.includes(p.id))) personDies(s, p, l('no mesmo ano da vida real', 'in the same year as in real life'));
        else {
          p.alive = false;
          p.died = s.year;
          remember(s, 'death', fmtL(l('Morre {p}, ex-integrante de {a}, aos {age} anos.', '{p}, former member of {a}, dies at {age}.'), { p: p.name, a: act.name, age: s.year - p.born }), { actId: act.id, important: act.fame > 30 });
        }
      }
      else if (p?.alive) st.sched.push({ ...ev, year: s.year + 1 });
    } else if (ev.kind === 'release' && ev.rel && !histDiverged(s, act) && !act.playerBand && (act.status === 'active' || act.status === 'emerging')) {
      // disco real no ano real: entra no mercado como lançamento de terceiros
      const rel = seedRelease(s, r, act, { title: ev.rel[0], year: s.year, type: ev.rel[2] ?? 'lp', tier: realDataOf(act)?.t ?? 2, live: true, doc: !!s.config.realNames, kind: ev.rel[3] });
      rel.weeksOnChart = 0;
      rel.territories = act.owner && s.labels[act.owner] ? s.labels[act.owner].territories : rel.territories;
      rel.appeal = computeAppeal(s, r, rel, act).appeal;
      act.lastRelease = s.week;
      act.momentum = clamp(act.momentum + 12, 0, 100);
    }
  }
}

// R29 (CONNECT): RW_AFTER_NEWGAME (after29.ts) roda no fim do newgame real — renomes do lineup16 etc. A ordem dos ganchos
// 'newgame' dependia da ordem dos imports (ciclo realworld ↔ lineup16): com os imports de um teste o gancho do lineup16
// rodava antes e "The Jackson 5" nunca virava "The Jacksons".
registerSimHook('newgame', 'realworld', (s, r) => { newgame(s, r); for (const f of RW_AFTER_NEWGAME) f(s); });
// r27 (F): música com título de obra real leva os compositores reais nos créditos (Gonzaga + Zé Dantas), sem sorteio
registerSimHook('compose', 'realworld:writers27', (s, _r, a) => {
  const song = a.song;
  const act = song ? s.acts[song.actId] : undefined;
  if (!song || !act?.catalogNo) return;
  const ws = realWriters27(s, act, song.title);
  if (ws.length) song.writers = ws;
});
registerSimHook('month', 'realworld', (s, r) => monthly(s, r));

/** Família do gênero (exposta para a interface). */
export const realFamily = (a: RealArtist) => familyOf(a.g);
