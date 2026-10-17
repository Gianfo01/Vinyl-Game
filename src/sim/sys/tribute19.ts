// Rodada 19 (Frente 9.1) — BANDAS COVER E TRIBUTO (`tribute19`). Tributos nascem da fama + fãs leais + ausência do
// original (separação, morte, hiato): banda de baile (1889+), versão orquestral (1920+), paródia (1950+), tributo-
// espetáculo (1964+), imitador e "ex-integrantes de X" (1970+), canal de covers (2006+) e voz de IA (2020+). Cada tributo
// tem gente de verdade (pessoas com CA/PA do ability18); o vocalista é um sósia vocal que pode virar o substituto oficial
// quando o original volta sem a voz (caso Journey/Arnel Pineda) → fãs se dividem → anos depois, documentário.
// LÊ: fama/fãs (fandom19), status do ato, espólio e hologramas (post18), regiões e era, CA (ability18), modo histórico.
// ESCREVE: royalties de licença (ledger: 'licensing' + rights18.inc), catálogo (álbum-tributo no seu selo → valor de venda
// do sale17), fãs (fans18 facções/lealdade, haters do fandom), banda (live18), cenas (cine18), processos (holds17 + tribunal),
// escândalo (scandal17) e manchetes (press9). Fatos: tribute_born, tribute_licensed, tribute_sued, soundalike_hired,
// fake_farewell (nomes reservados no factmatrix19). Decisões por carreira: selo (licenciar/processar/assinar), artista
// (aprovar/ignorar/contratar o sósia), promotor/casa (residência e festival de tributos), músico (tocar covers).

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L, type MarketId } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { factions18, fan18, fandomRec19, fanTotal19, loyalty19 } from '../fandom19';
import { histLocked, histMode } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { langForCity, makePerson } from '../people';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import type { Act, GameState, Person, Release } from '../types';
import { fmtL, money, nextId, post } from '../util';
import { caOf18 } from './ability18';
import { careers } from './careers12';
import { logShot18 } from './cine18';
import { headline19 } from './factlink19';
import { band18 } from './live18';
import { post18 } from './post18';
import { r18 } from './rights18';
import { cashWhy20, freeCash20 } from '../oblig20';
import { noteRelease17 } from '../relidx17';
import { actsNow27 } from '../tickcache27';

// ---------------------------------------------------------------- tipos e dados

export type TK19 = 'dance' | 'orch' | 'parody' | 'show' | 'imperson' | 'exmem' | 'yt' | 'ai';
export interface TKDef19 { name: L; from: number; n: [number, number]; mul: number; odds: number; desc: L }
export const TK19: Record<TK19, TKDef19> = {
  dance: { name: l('Banda de baile/bar', 'Dance/bar band'), from: 1889, n: [4, 5], mul: 0.7, odds: 0.3, desc: l('Toca os sucessos de todo mundo em bailes, bares e formaturas. Não precisa o original sumir.', 'Plays everyone\'s hits at dances, bars and proms. The original need not be gone.') },
  orch: { name: l('Versão orquestral/jazz', 'Orchestral/jazz version'), from: 1920, n: [3, 4], mul: 1.1, odds: 0.25, desc: l('Releitura com orquestra ou combo de jazz; teatros e salas de concerto.', 'Reinterpretation with orchestra or jazz combo; theatres and concert halls.') },
  parody: { name: l('Paródia', 'Parody'), from: 1950, n: [2, 3], mul: 0.55, odds: 0.15, desc: l('Humor com as canções: protegida como paródia na maioria dos tribunais.', 'Comedy on the songs: protected as parody in most courts.') },
  show: { name: l('Tributo-espetáculo', 'Tribute show'), from: 1964, n: [4, 5], mul: 1.5, odds: 0.5, desc: l('Figurino, cenário e repertório idênticos (Beatlemania, 1977).', 'Identical costumes, set and setlist (Beatlemania, 1977).') },
  imperson: { name: l('Imitador', 'Impersonator'), from: 1970, n: [1, 1], mul: 0.9, odds: 0.45, desc: l('Uma pessoa vive o ídolo no palco (imitadores de Elvis em Las Vegas).', 'One person lives the idol on stage (Elvis impersonators in Las Vegas).') },
  exmem: { name: l('"Ex-integrantes de X"', '"Ex-members of X"'), from: 1970, n: [3, 4], mul: 1.9, odds: 0.4, desc: l('Um ou dois integrantes originais com músicos novos usando o nome — briga de marca garantida.', 'One or two original members with new players using the name — a trademark fight waiting to happen.') },
  yt: { name: l('Canal de covers', 'Cover channel'), from: 2006, n: [1, 2], mul: 0.45, odds: 0.55, desc: l('Covers em vídeo; às vezes vira carreira própria.', 'Video covers; sometimes becomes a career of its own.') },
  ai: { name: l('Voz de IA', 'AI voice'), from: 2020, n: [0, 0], mul: 0.35, odds: 0.75, desc: l('Modelo treinado com a voz do original: barato, viral e juridicamente frágil.', 'A model trained on the original\'s voice: cheap, viral and legally fragile.') },
};
export interface Circ19 { id: string; name: L; mk: MarketId[] | null; from: number; mul: number; k: TK19[]; real: L }
export const CIRC19: Circ19[] = [
  { id: 'bailes', name: l('Bailes, bares e formaturas', 'Dances, bars and proms'), mk: ['br', 'latam'], from: 1889, mul: 0.8, k: ['dance', 'parody', 'show', 'imperson', 'exmem'], real: l('Bandas de baile tocam a parada inteira; muitos músicos começam assim.', 'Dance bands play the whole chart; many musicians start that way.') },
  { id: 'pubs', name: l('Pubs e clubes sociais', 'Pubs and working men\'s clubs'), mk: ['eu'], from: 1889, mul: 0.9, k: ['dance', 'parody', 'show', 'imperson', 'exmem', 'orch'], real: l('O circuito de clubes do norte da Inglaterra sustenta tributos há décadas.', 'The northern English club circuit has sustained tributes for decades.') },
  { id: 'theatre', name: l('Teatros e salas de concerto', 'Theatres and concert halls'), mk: null, from: 1920, mul: 1, k: ['orch', 'show'], real: l('Versões sinfônicas lotam teatros com público mais velho.', 'Symphonic versions fill theatres with older crowds.') },
  { id: 'vegas', name: l('Las Vegas', 'Las Vegas'), mk: ['na'], from: 1956, mul: 1.6, k: ['show', 'imperson', 'exmem', 'orch'], real: l('Residências e capelas com Elvis: a capital mundial do imitador.', 'Residencies and Elvis chapels: the world capital of impersonators.') },
  { id: 'casino', name: l('Cassinos e hotéis', 'Casinos and hotels'), mk: ['na', 'oceania'], from: 1960, mul: 1.2, k: ['dance', 'show', 'imperson', 'exmem', 'orch'], real: l('Cachê fixo e público que quer os sucessos, não o disco novo.', 'Fixed fees and a crowd that wants the hits, not the new record.') },
  { id: 'japan', name: l('Circuito japonês', 'Japanese circuit'), mk: ['asia'], from: 1966, mul: 1.4, k: ['show', 'imperson', 'orch'], real: l('O Japão paga bem por tributos fiéis (Cavern Club de Tóquio).', 'Japan pays well for faithful tributes (Tokyo\'s Cavern Club).') },
  { id: 'cruise', name: l('Cruzeiros', 'Cruises'), mk: null, from: 1975, mul: 1.1, k: ['dance', 'show', 'imperson', 'exmem'], real: l('Navios temáticos com o "quase original" a bordo.', 'Themed cruises with the "nearly original" on board.') },
  { id: 'online', name: l('YouTube e redes', 'YouTube and social media'), mk: null, from: 2006, mul: 0.7, k: ['yt', 'ai', 'parody'], real: l('Covers e paródias viram vídeos com milhões de views.', 'Covers and parodies become videos with millions of views.') },
];
export const circ19 = (id: string): Circ19 | undefined => CIRC19.find((c) => c.id === id);
export const kindsNow19 = (y: number): TK19[] => (Object.keys(TK19) as TK19[]).filter((k) => y >= TK19[k].from);

export interface Trib19 {
  id: string; act: string; name: string; k: TK19; c: string; mem: string[];
  /** sósia vocal (pessoa) e semelhança 0..100 */
  sa?: string; sim: number; q: number; y: number; w: number;
  /** licença: 0 sem, 1 licenciado, 2 proibido/processado */
  lic: 0 | 1 | 2; until?: number; pct: number; earn: number; last: number;
  /** ligação com o jogador: álbum assinado / residência na sua casa / aprovado pelo artista */
  sign?: number; rel?: string; res?: 1; ok?: 1;
  end?: number; endWhy?: L; court?: number; odds?: number; by?: string; fake?: number;
}
export interface T19 {
  t: Trib19[]; seq: number;
  /** músico: banda tocando covers desde (semana) */
  cov: Record<string, number>;
  /** faísca (revival) até a semana */
  spark: Record<string, number>;
  /** ato visto separado/aposentado (semana) e reunião (semana) */
  was: Record<string, number>; reu: Record<string, number>;
  /** documentário marcado (semana) e sósia contratado por ato */
  doc: Record<string, number>; hired: Record<string, string>;
  /** fãs divididos por ato: [ano, % puristas] */
  split: Record<string, [number, number]>;
  fest: number; log: [number, number, L][]; n: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { tribute19: T19 } }
const fresh = (): T19 => ({ t: [], seq: 0, cov: {}, spark: {}, was: {}, reu: {}, doc: {}, hired: {}, split: {}, fest: 0, log: [], n: {} });
registerExt4('tribute19', fresh);
export function t19(s: GameState): T19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.tribute19 ??= fresh()) as T19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const cnt = (s: GameState, k: string) => { const n = t19(s).n; n[k] = (n[k] ?? 0) + 1; };
const logT = (s: GameState, t: L) => { const st = t19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
export const live19 = (s: GameState, actId?: string): Trib19[] => t19(s).t.filter((t) => !t.end && (!actId || t.act === actId));
export const trib19 = (s: GameState, id: string): Trib19 | undefined => t19(s).t.find((t) => t.id === id);

// ---------------------------------------------------------------- leituras

const alive = (s: GameState, pid: string) => !!s.persons[pid]?.alive;
const VOX = new Set(['vocal', 'mc']);
/** O jogador é dono do original (selo) ou é a própria banda (artista)? */
export const mineAct19 = (s: GameState, a: Act | undefined): boolean => !!a && (a.owner === 'player' || !!a.playerBand || a.releases.some((id) => s.releases[id]?.owner === 'player'));
/** Por que o original "sumiu" (abre espaço para tributo). */
/** r19 (T8, history19): artista propenso a tributo (flag `T` do RealArtist / lista K do db19) — injetado sem ciclo de import. */
export const TRIB19_T: { f?: (a: Act) => boolean } = {};
export function absent19(s: GameState, a: Act): L | null {
  if (a.deceased || (a.members.length && a.members.every((p) => !alive(s, p)))) return l('o original morreu', 'the original is dead');
  if (a.status === 'split') return l('a banda se separou', 'the band split up');
  if (a.status === 'retired') return l('o artista se aposentou', 'the artist retired');
  if ((a.hiatusUntil ?? 0) > s.week || a.status === 'hiatus') return l('o artista está em hiato', 'the artist is on hiatus');
  if (a.members.some((p) => VOX.has(s.persons[p]?.role ?? '') && !alive(s, p))) return l('a voz original morreu', 'the original voice died');
  return null;
}
const lostVoice = (s: GameState, a: Act): boolean => !a.members.some((p) => alive(s, p) && VOX.has(s.persons[p]?.role ?? ''));
const holo = (s: GameState, a: Act): boolean => post18(s).proj.some((p) => p.act === a.id && (p.k === 'holo_show' || p.k === 'holo_tour' || p.k === 'avatar' || p.k === 'ghost') && s.year - p.y <= 3);
const reunited = (s: GameState, a: Act): boolean => (t19(s).reu[a.id] ?? -1e9) > s.week - 156;

/** Demanda de um tributo (0..~2,5) com as partes do porquê. */
export function demand19(s: GameState, t: Trib19): { v: number; parts: WhyPart[] } {
  const a = s.acts[t.act];
  if (!a) return { v: 0, parts: [] };
  const parts: WhyPart[] = [];
  const fame = a.fame / 100; parts.push({ label: l('Fama do original', 'Original\'s fame'), value: Math.round(a.fame), fmt: 'num' });
  const ab = absent19(s, a);
  const absF = t.k === 'dance' || t.k === 'parody' || t.k === 'orch' ? 1 : ab ? 1 : 0.4;
  parts.push({ label: ab ? fmtL(l('Ausência: {w}', 'Absence: {w}'), { w: ab }) : l('Original na ativa: quem quer o show vai ao verdadeiro', 'Original still active: fans go to the real thing'), value: absF, fmt: 'mult', tone: absF < 1 ? 'bad' : 'good' });
  const loy = 0.8 + loyalty19(s, a.id) / 250; parts.push({ label: l('Lealdade dos fãs', 'Fan loyalty'), value: Math.round(loy * 100) / 100, fmt: 'mult' });
  const c = circ19(t.c); const cm = c?.mul ?? 1; parts.push({ label: fmtL(l('Circuito: {c}', 'Circuit: {c}'), { c: c?.name ?? '?' }), value: cm, fmt: 'mult' });
  const q = 0.5 + t.q / 100 + (t.sa ? t.sim / 400 : 0); parts.push({ label: l('Qualidade (CA dos músicos + semelhança do sósia)', 'Quality (players\' CA + sound-alike likeness)'), value: Math.round(q * 100) / 100, fmt: 'mult' });
  let comp = 1;
  if (holo(s, a)) { comp *= 0.6; parts.push({ label: l('Holograma do original em cartaz', 'Original\'s hologram on stage'), value: 0.6, fmt: 'mult', tone: 'bad' }); }
  if (reunited(s, a)) { comp *= 0.55; parts.push({ label: l('Reunião do original nos últimos 3 anos', 'Original reunited in the last 3 years'), value: 0.55, fmt: 'mult', tone: 'bad' }); }
  if ((t19(s).spark[a.id] ?? 0) > s.week) { comp *= 1.4; parts.push({ label: l('Sucesso tardio do original', 'Original\'s late hit'), value: 1.4, fmt: 'mult', tone: 'good' }); }
  if (t.res) { comp *= 1.15; parts.push({ label: l('Residência fixa na sua casa', 'Residency at your venue'), value: 1.15, fmt: 'mult', tone: 'good' }); }
  if (t.ok) { comp *= 1.2; parts.push({ label: l('Bênção oficial do artista', 'Official blessing from the artist'), value: 1.2, fmt: 'mult', tone: 'good' }); }
  if (t.lic === 2) { comp *= 0.5; parts.push({ label: l('Proibido/processado: só toca escondido', 'Banned/sued: plays under the radar'), value: 0.5, fmt: 'mult', tone: 'bad' }); }
  const v = fame * absF * loy * cm * q * TK19[t.k].mul * comp;
  return { v: Math.round(v * 100) / 100, parts };
}
export const gross19 = (s: GameState, t: Trib19): number => Math.round(money(s, 1400) * demand19(s, t).v);

// ---------------------------------------------------------------- nascimento

const ROLES: Person['role'][] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'strings', 'horns'];
const NAMES19: Record<TK19, [string, string][]> = {
  dance: [['Banda {a} Cover', '{a} Cover Band'], ['Os Sucessos de {a}', 'The {a} Hits Band']],
  orch: [['{a} Sinfônico', '{a} Symphonic'], ['{a} em Jazz', '{a} Goes Jazz']],
  parody: [['{a} da Zoeira', 'Weird {a}'], ['Quase {a}', 'Almost {a}']],
  show: [['{a} Experience', 'The {a} Experience'], ['{a}mania', '{a}mania']],
  imperson: [['O Rei {a}', 'The King of {a}'], ['{a} Vive', '{a} Lives']],
  exmem: [['Ex-integrantes de {a}', 'Former members of {a}'], ['{a} Legacy', '{a} Legacy']],
  yt: [['{a} Covers (canal)', '{a} Covers (channel)'], ['Tocando {a}', 'Playing {a}']],
  ai: [['{a} IA', 'AI {a}'], ['{a}.bot', '{a}.bot']],
};
function pickCirc(s: GameState, r: Rng, a: Act, k: TK19): Circ19 {
  const mk = cityById[a.city]?.market as MarketId | undefined;
  const ok = CIRC19.filter((c) => s.year >= c.from && c.k.includes(k));
  return r.weighted(ok, (c) => (!c.mk ? 1 : mk && c.mk.includes(mk) ? 3 : 0.6)) ?? CIRC19[0];
}
/** Cria um tributo para o ato (usado pelo sorteio do mês e pelos testes). */
export function birth19(s: GameState, r: Rng, a: Act, k0?: TK19): Trib19 | null {
  const st = t19(s);
  const ks = kindsNow19(s.year).filter((k) => k !== 'exmem' || (a.members.some((p) => alive(s, p)) && !histLocked(s, a) && a.status === 'split'));
  const k = k0 ?? r.weighted(ks, (x) => (x === 'dance' ? 2 : x === 'show' || x === 'imperson' ? 1.5 : 1));
  if (!k || s.year < TK19[k].from) return null;
  const c = pickCirc(s, r, a, k);
  const lang = langForCity(a.city, r);
  const mem: string[] = [];
  if (k === 'exmem') for (const pid of a.members.filter((p) => alive(s, p)).slice(0, 2)) mem.push(pid);
  const [n0, n1] = TK19[k].n;
  const n = Math.max(0, r.int(n0, n1) - mem.length);
  for (let i = 0; i < n; i++) {
    const p = makePerson(s, r, { lang, role: i === 0 ? 'vocal' : r.pick(ROLES.slice(1)), potential: r.int(30, 72), born: s.year - r.int(19, 42), startFrac: 0.8 });
    s.persons[p.id] = p;
    mem.push(p.id);
  }
  const sa = k === 'exmem' ? mem.find((p) => !a.members.includes(p) && s.persons[p]?.role === 'vocal') : mem.find((p) => s.persons[p]?.role === 'vocal');
  const ca = mem.length ? mem.reduce((t, p) => t + caOf18(s.persons[p]), 0) / mem.length : 45;
  const nm = r.pick(NAMES19[k]);
  const t: Trib19 = {
    id: `tb${++st.seq}`, act: a.id, name: fmtL(l(nm[0], nm[1]), { a: a.name }).pt, k, c: c.id, mem, ...(sa ? { sa } : {}),
    sim: sa ? r.int(40, 96) : k === 'ai' ? 90 : 0, q: Math.round(clamp(ca, 10, 95)), y: s.year, w: s.week, lic: 0, pct: 0.08, earn: 0, last: 0,
  };
  st.t.push(t);
  cnt(s, 'born');
  const why = absent19(s, a);
  const tx = fmtL(l('Nasce "{t}" ({k}, {c}): tributo a {a}{w}.', '"{t}" is born ({k}, {c}): a tribute to {a}{w}.'), { t: t.name, k: TK19[k].name, c: c.name, a: a.name, w: why ? fmtL(l(' — {w}', ' — {w}'), { w: why }) : '' });
  logT(s, tx);
  emitFact(s, { kind: 'tribute_born', actors: [a.id, ...mem.slice(0, 2).map((p) => `p:${p}`)], severity: Math.round(15 + a.fame / 3), visibility: 'public', tags: ['tribute19', k, c.id], text: tx, src: 'tribute19', data: { trib: t.id } });
  decideBirth(s, r, t, a);
  return t;
}

// ---------------------------------------------------------------- decisões (jogador e NPC)

const fee$ = (s: GameState, t: Trib19) => `$${Math.round((gross19(s, t) * t.pct) / 100).toLocaleString('en-US')}`;
function decideBirth(s: GameState, r: Rng, t: Trib19, a: Act): void {
  if (a.playerBand) {
    pushInbox18(s, 'trib19_art', { from: t.name, subject: fmtL(l('Um tributo à sua banda: {t}', 'A tribute to your band: {t}'), { t: t.name }), tone: 'info',
      body: fmtL(l('{k} no circuito {c}. O sósia vocal tem {p}% de semelhança. Aprovar dá bênção oficial (+20% de público, licença {f}/mês para você); contratar o sósia traz a voz para a sua banda; ignorar deixa rolar.', '{k} on the {c} circuit. The sound-alike is {p}% alike. Approving gives an official blessing (+20% crowd, licence {f}/month to you); hiring the sound-alike brings that voice into your band; ignoring lets it run.'), { k: TK19[t.k].name, c: circ19(t.c)?.name ?? '', p: t.sim, f: fee$(s, t) }),
      ref: { t: t.id }, actions: [{ id: 'approve', label: l('Aprovar (bênção oficial)', 'Approve (official blessing)') }, ...(t.sa ? [{ id: 'hire', label: l('Contratar o sósia', 'Hire the sound-alike') }] : []), { id: 'ignore', label: l('Ignorar', 'Ignore') }], weeks: 6 });
  } else if (mineAct19(s, a)) {
    pushInbox18(s, 'trib19_lab', { from: t.name, subject: fmtL(l('Tributo usando o catálogo de {a}', 'Tribute using {a}\'s catalogue'), { a: a.name }), tone: 'info',
      body: fmtL(l('{k} no circuito {c}. Licenciar rende {p}% do bruto ({f}/mês hoje) e mantém o catálogo vivo; processar custa {c2} (chance {o}%); assinar um álbum-tributo custa {c3} e entra no seu catálogo.', '{k} on the {c} circuit. Licensing earns {p}% of gross ({f}/month now) and keeps the catalogue alive; suing costs {c2} ({o}% odds); signing a tribute album costs {c3} and joins your catalogue.'), { k: TK19[t.k].name, c: circ19(t.c)?.name ?? '', p: Math.round(t.pct * 100), f: fee$(s, t), c2: `$${Math.round(suitCost19(s) / 100).toLocaleString('en-US')}`, o: Math.round(suitOdds19(s, t) * 100), c3: `$${Math.round(signCost19(s) / 100).toLocaleString('en-US')}` }),
      ref: { t: t.id }, actions: [{ id: 'license', label: l('Licenciar', 'License') }, { id: 'sue', label: l('Processar', 'Sue') }, { id: 'sign', label: l('Assinar álbum-tributo', 'Sign a tribute album') }, { id: 'ignore', label: l('Ignorar', 'Ignore') }], weeks: 6 });
  } else {
    // NPC (dono do original): licencia, processa ou ignora pelo perfil; no modo exato os reais não processam ninguém
    const locked = histLocked(s, a);
    const greedy = a.members.some((p) => (s.persons[p]?.traits ?? []).some((x) => /greedy|ego|diva|control/.test(x)));
    const pSue = locked ? 0 : TK19[t.k].odds * (greedy ? 0.5 : 0.25), pLic = 0.45;
    const x = r.next();
    if (x < pSue) fileSuit(s, t, a.owner && a.owner !== 'player' ? `l:${a.owner}` : a.id, false);
    else if (x < pSue + pLic) license19(s, t.id, false);
  }
}
export const suitCost19 = (s: GameState) => money(s, 2500);
export const signCost19 = (s: GameState) => money(s, 3000);
export function suitOdds19(s: GameState, t: Trib19): number {
  return clamp(TK19[t.k].odds + (t.fake ? 0.2 : 0) + (t.lic === 1 ? -0.3 : 0) + (t.k === 'ai' && s.year >= 2024 ? 0.1 : 0) - (t.ok ? 0.4 : 0), 0.05, 0.92);
}
/** Licencia (renova por um ano). `mine` = o jogador é quem licencia. */
export function license19(s: GameState, id: string, mine = true): L | null {
  const t = trib19(s, id); if (!t || t.end) return l('Tributo encerrado.', 'Tribute ended.');
  const a = s.acts[t.act];
  t.lic = 1; t.until = s.week + 52;
  const tx = fmtL(l('{t} licencia o repertório de {a} ({p}% do bruto).', '{t} licenses {a}\'s repertoire ({p}% of gross).'), { t: t.name, a: a?.name ?? '?', p: Math.round(t.pct * 100) });
  logT(s, tx); cnt(s, 'lic');
  emitFact(s, { kind: 'tribute_licensed', actors: [t.act, mine ? 'player' : (a?.owner ?? t.act)], severity: 20, visibility: 'public', tags: ['tribute19', mine ? 'mine' : 'npc'], text: tx, src: 'tribute19', data: { trib: t.id } });
  return null;
}
function fileSuit(s: GameState, t: Trib19, by: string, mine: boolean): void {
  t.lic = 2; t.court = s.week + 20; t.odds = suitOdds19(s, t); t.by = by;
  const a = s.acts[t.act];
  const tx = fmtL(l('{b} processa "{t}" por uso do nome e do repertório de {a}.', '{b} sues "{t}" over the use of {a}\'s name and repertoire.'), { b: mine ? l('Você', 'You') : by.startsWith('l:') ? (s.labels[by.slice(2)]?.name ?? '?') : (a?.name ?? '?'), t: t.name, a: a?.name ?? '?' });
  logT(s, tx); cnt(s, 'sued');
  emitFact(s, { kind: 'tribute_sued', actors: [mine ? 'player' : by, ...(t.mem[0] ? [`p:${t.mem[0]}`] : []), t.act], severity: 35 + (a?.fame ?? 0) / 4, visibility: 'public', tags: ['tribute19', 'court', mine ? 'mine' : 'npc'], text: tx, src: 'tribute19', data: { trib: t.id } });
}
export function sue19(s: GameState, id: string): L | null {
  const t = trib19(s, id); if (!t || t.end) return l('Tributo encerrado.', 'Tribute ended.');
  if (t.court) return l('Já está na justiça.', 'Already in court.');
  post(s, `t19sue:${t.id}`, -suitCost19(s), 'legal', `Processo contra ${t.name}`);
  fileSuit(s, t, 'player', true);
  return null;
}
/** Álbum-tributo no seu selo: entra no catálogo (valor de venda) e vende por 8 meses conforme a demanda. */
export function sign19(s: GameState, id: string): L | null {
  const t = trib19(s, id), a = t && s.acts[t.act];
  if (!t || !a || t.end) return l('Tributo encerrado.', 'Tribute ended.');
  if (t.sign) return l('Já assinado.', 'Already signed.');
  if (freeCash20(s) < signCost19(s)) return cashWhy20(s, signCost19(s), l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `t19sign:${t.id}`, -signCost19(s), 'artist_dev', `Álbum-tributo ${t.name}`);
  const rid = nextId(s, 'r');
  const rel: Release = { id: rid, actId: a.id, owner: 'player', prov: 'sim', type: 'lp', title: fmtL(l('{t} toca {a}', '{t} plays {a}'), { t: t.name, a: a.name }).pt, songs: a.songs.slice(0, 10), week: s.week, year: s.year, q: t.q, appeal: Math.round(demand19(s, t).v * 40),
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: [...s.player.territories], weekly: [], totalUnits: 0, revenue: 0, peak: 0, weeksOnChart: 0, lastPos: 0, coverSeed: t.w * 7919, shortage: 0, live: false, kind: 'tribute' };
  s.releases[rid] = rel;
  noteRelease17(s, rel);
  t.sign = s.week + 35;
  t.rel = rid;
  logT(s, fmtL(l('Seu selo assina o álbum-tributo "{r}".', 'Your label signs the tribute album "{r}".'), { r: rel.title }));
  cnt(s, 'sign');
  return null;
}
/** Artista: bênção oficial. */
export function approve19(s: GameState, id: string): L | null {
  const t = trib19(s, id); if (!t || t.end) return l('Tributo encerrado.', 'Tribute ended.');
  t.ok = 1; license19(s, id, true);
  return null;
}
/** O sósia vira o substituto oficial (artista contrata, ou o original reunido contrata). */
export function soundalike19(s: GameState, id: string): L | null {
  const t = trib19(s, id), a = t && s.acts[t.act];
  if (!t || !a || !t.sa || !alive(s, t.sa)) return l('Sem sósia disponível.', 'No sound-alike available.');
  if (a.members.includes(t.sa)) return l('Já está na banda.', 'Already in the band.');
  // R33 (DADOS): quem contrata é o original — ato encerrado por morte (ou sem ninguém vivo) não volta com o sósia
  // (Enrico Caruso, morto em 1921, "voltava" em 1953 com a sósia como voz oficial)
  if (a.deceased || !a.members.some((x) => alive(s, x))) return l('O artista original já morreu.', 'The original artist has died.');
  const pid = t.sa, p = s.persons[pid];
  a.members.push(pid);
  t.mem = t.mem.filter((x) => x !== pid); t.sa = undefined; t.q = Math.max(10, t.q - 15);
  if (t.k === 'imperson' || !t.mem.length) endT(s, t, l('o sósia foi contratado pelo original', 'the sound-alike was hired by the original'));
  const st = t19(s);
  st.hired[a.id] = pid;
  if (a.status === 'split' || a.status === 'retired' || a.status === 'hiatus') { a.status = 'active'; a.hiatusUntil = undefined; st.reu[a.id] = s.week; delete st.was[a.id]; }
  st.doc[a.id] = s.week + 52 + (t.w % 4) * 13;
  const tx = fmtL(l('{a} contrata {p}, o sósia vocal de "{t}", como voz oficial.', '{a} hires {p}, the sound-alike singer from "{t}", as the official voice.'), { a: a.name, p: p.name, t: t.name });
  logT(s, tx); cnt(s, 'hired');
  emitFact(s, { kind: 'soundalike_hired', actors: [a.id, `p:${pid}`], severity: 40 + a.fame / 3, visibility: 'public', tags: ['tribute19', 'reunion'], text: tx, src: 'tribute19', data: { trib: t.id, pid } });
  return null;
}
function endT(s: GameState, t: Trib19, why: L): void { if (t.end) return; t.end = s.year; t.endWhy = why; t.res = undefined; }
/** Promotor/casa: residência fixa do tributo na sua casa (30% do bruto para você). */
export const promoter19 = (s: GameState): boolean => careers(s).active.some((c) => c === 'venue' || c === 'festival' || c === 'booking');
export function residency19(s: GameState, id: string, on: boolean): L | null {
  const t = trib19(s, id); if (!t || t.end) return l('Tributo encerrado.', 'Tribute ended.');
  if (on && !promoter19(s)) return l('Precisa de uma carreira de casa de shows, festival ou agência.', 'Needs a venue, festival or booking career.');
  if (on && live19(s).filter((x) => x.res).length >= 3) return l('No máximo 3 residências.', 'At most 3 residencies.');
  t.res = on ? 1 : undefined;
  if (on) logT(s, fmtL(l('"{t}" ganha residência fixa na sua casa.', '"{t}" gets a residency at your venue.'), { t: t.name }));
  return null;
}
export const festCost19 = (s: GameState) => money(s, 3000);
/** Festival de tributos (1 por ano, 3+ tributos vivos). */
export function festival19(s: GameState): L | null {
  const st = t19(s), xs = live19(s).filter((t) => t.lic !== 2);
  if (!promoter19(s)) return l('Precisa de uma carreira de casa de shows, festival ou agência.', 'Needs a venue, festival or booking career.');
  if (st.fest >= s.year) return l('Já houve festival de tributos este ano.', 'Already held a tribute festival this year.');
  if (xs.length < 3) return l('Precisa de 3+ tributos em atividade.', 'Needs 3+ active tributes.');
  if (freeCash20(s) < festCost19(s)) return cashWhy20(s, festCost19(s), l('Caixa insuficiente.', 'Not enough cash.'));
  st.fest = s.year;
  const top = [...xs].sort((a, b) => demand19(s, b).v - demand19(s, a).v).slice(0, 6);
  const inc = Math.round(top.reduce((t, x) => t + money(s, 1100) * Math.min(1.6, demand19(s, x).v), 0));
  post(s, `t19fest:${s.year}`, -festCost19(s), 'live_costs', 'Festival de tributos');
  post(s, `t19festin:${s.year}`, inc, 'live', 'Festival de tributos (bilheteria)');
  for (const x of top) { x.q = Math.min(95, x.q + 3); const a = s.acts[x.act]; if (a) a.fame = clamp(a.fame + 0.3, 0, 100); }
  const tx = fmtL(l('Festival de tributos: {n} bandas, bilheteria ${v}.', 'Tribute festival: {n} bands, ${v} at the gate.'), { n: top.length, v: Math.round(inc / 100).toLocaleString('en-US') });
  logT(s, tx); cnt(s, 'fest');
  emitFact(s, { kind: 'show', actors: ['player', ...top.map((x) => x.act)].slice(0, 6), severity: 30, visibility: 'public', tags: ['tribute19', 'festival', 'good'], text: tx, src: 'tribute19' });
  return null;
}
/** Músico: sua banda toca covers (dinheiro rápido × rótulo de banda cover). */
export function covers19(s: GameState, actId: string, on: boolean): L | null {
  const a = s.acts[actId]; if (!a?.playerBand) return l('Só a sua banda.', 'Only your own band.');
  const st = t19(s);
  if (on) { st.cov[actId] = s.week; logT(s, fmtL(l('{a} começa a tocar covers na noite.', '{a} starts playing covers on the circuit.'), { a: a.name })); }
  else delete st.cov[actId];
  return null;
}
export const coverPay19 = (s: GameState, a: Act) => Math.round(money(s, 160) * (1 + Math.min(2, fanTotal19(a) / 20000)));
/** Renovação da licença (prazo no calendário). */
export function renew19(s: GameState, id: string, how: 'renew' | 'raise' | 'lapse', r: Rng): L {
  const t = trib19(s, id); if (!t || t.end) return l('Tributo encerrado.', 'Tribute ended.');
  if (how === 'lapse') { t.lic = 0; t.until = undefined; return l('Licença vencida: o tributo segue sem pagar (você pode processar).', 'Licence lapsed: the tribute plays on without paying (you may sue).'); }
  if (how === 'raise') {
    if (r.chance(0.35)) { t.lic = 0; t.until = undefined; return l('O tributo recusou o aumento e trocou de repertório.', 'The tribute refused the raise and changed repertoire.'); }
    t.pct = Math.min(0.15, t.pct + 0.04);
  }
  license19(s, id, true);
  return fmtL(l('Licença renovada ({p}%).', 'Licence renewed ({p}%).'), { p: Math.round(t.pct * 100) });
}

registerInboxKind('trib19_lab', { label: l('Tributos', 'Tributes'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'tribute19' }),
  handle: (s, m, a) => { const id = String(m.ref?.t); const res = a === 'license' ? license19(s, id) : a === 'sue' ? sue19(s, id) : a === 'sign' ? sign19(s, id) : null; return res ?? (a === 'ignore' ? l('O tributo segue sem licença.', 'The tribute plays on unlicensed.') : l('Feito.', 'Done.')); } });
registerInboxKind('trib19_art', { label: l('Tributos', 'Tributes'), cat: 'people', icon: 'mic', prio: 1, goto: () => ({ area: 'tribute19' }),
  handle: (s, m, a) => { const id = String(m.ref?.t); const res = a === 'approve' ? approve19(s, id) : a === 'hire' ? soundalike19(s, id) : null; return res ?? (a === 'ignore' ? l('Você deixa o tributo em paz.', 'You leave the tribute alone.') : l('Feito.', 'Done.')); } });
registerInboxKind('trib19_renew', { label: l('Licença de tributo', 'Tribute licence'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'tribute19' }),
  handle: (s, m, a, r) => renew19(s, String(m.ref?.t), a as 'renew' | 'raise' | 'lapse', r) });

// ---------------------------------------------------------------- mês

registerSimHook('month', 'tribute19', (s, r0) => {
  const r = rng19(s, 'tribute19');
  void r0;
  const st = t19(s);
  // 1) separações e reuniões (o "antes e depois" que os tributos e o sósia leem)
  for (const a of actsNow27(s)) {
    if (a.fame < 35) continue;
    if (a.status === 'split' || a.status === 'retired') st.was[a.id] ??= s.week;
    else if (st.was[a.id] !== undefined && !a.deceased) { st.reu[a.id] = s.week; delete st.was[a.id]; }
  }
  // 2) nascimentos
  const live = live19(s);
  if (live.length < 16) {
    for (const a of actsNow27(s)) {
      if (a.fame < 40 || a.playerBand && a.fame < 30) continue;
      const n = live.filter((t) => t.act === a.id).length;
      if (n >= 3) continue;
      const ab = absent19(s, a), spark = (st.spark[a.id] ?? 0) > s.week;
      if (!ab && !spark && a.hits < 3) continue;
      const loy = loyalty19(s, a.id);
      const p = 0.0035 * (a.fame / 50) ** 2 * (ab ? 3 : 1) * (spark ? 3 : 1) * (1 + loy / 100) * (a.legend ? 1.5 : 1) * (TRIB19_T.f?.(a) ? 1.6 : 1) / (1 + n); // r19 T8: flag T
      if (r.chance(Math.min(0.12, p)) && birth19(s, r, a)) break; // no máximo um por mês
    }
  }
  const y = s.year;
  for (const t of live19(s)) {
    const a = s.acts[t.act];
    if (!a) { endT(s, t, l('o original sumiu do mapa', 'the original vanished')); continue; }
    const g = gross19(s, t);
    t.last = g; t.earn += g;
    // licença → royalties de execução para o dono do original (ledger + rights18)
    if (t.lic === 1 && mineAct19(s, a)) {
      const fee = Math.round(g * t.pct);
      if (fee > 0 && post(s, `t19lic:${t.id}:${y}-${s.month}`, fee, 'licensing', `Licença de tributo: ${t.name}`)) { const inc = (r18(s).inc[y] ??= {}); inc.tribute19 = (inc.tribute19 ?? 0) + fee; }
    }
    if (t.res) post(s, `t19res:${t.id}:${y}-${s.month}`, Math.round(g * 0.3), 'live', `Residência: ${t.name}`);
    // álbum-tributo assinado: vende enquanto durar
    const rid = t.rel, rel = rid ? s.releases[rid] : undefined;
    if (rel && (t.sign ?? 0) > s.week) {
      const u = Math.round(1500 * demand19(s, t).v * (0.6 + r.next() * 0.4)), v = Math.round(u * money(s, 3.2));
      rel.totalUnits += u; rel.revenue += v;
      post(s, `t19rel:${rid}:${y}-${s.month}`, v, 'sales', `Vendas ${rel.title}`);
    }
    // catálogo do original: o tributo mantém a obra tocando (streaming e venda do catálogo)
    if (mineAct19(s, a) && t.lic !== 2) catalogLift19(s, a, demand19(s, t).v);
    // tribunal
    if (t.court && s.week >= t.court) court19(s, r, t);
    // licença vencida
    if (t.lic === 1 && t.until && s.week >= t.until) {
      if (mineAct19(s, a) && !a.playerBand) { t.until = s.week + 6; pushInbox18(s, 'trib19_renew', { from: t.name, subject: fmtL(l('Renovar a licença de "{t}"?', 'Renew "{t}"\'s licence?'), { t: t.name }), body: fmtL(l('Rendeu ${v} no último ano de licença ({p}%). Aumentar para {p2}% pode fazer o tributo desistir (35%).', 'Earned ${v} under licence last year ({p}%). Raising to {p2}% may make the tribute walk (35%).'), { v: Math.round(t.earn * t.pct / 100).toLocaleString('en-US'), p: Math.round(t.pct * 100), p2: Math.round(Math.min(15, t.pct * 100 + 4)) }), ref: { t: t.id }, actions: [{ id: 'raise', label: l('Renovar com aumento', 'Renew with a raise') }, { id: 'lapse', label: l('Deixar vencer', 'Let it lapse') }, { id: 'renew', label: l('Renovar', 'Renew') }], weeks: 6 }); }
      else if (a.playerBand || r.chance(0.8)) license19(s, t.id, a.playerBand ? true : false); else { t.lic = 0; t.until = undefined; }
    }
    // sósia vira voz oficial quando o original volta sem a voz (NPC; o jogador decide pela Caixa)
    if (t.sa && t.sim >= 65 && lostVoice(s, a) && !a.deceased && reunited(s, a) && !a.playerBand && !histLocked(s, a) && !st.hired[a.id] && r.chance(0.25)) soundalike19(s, t.id);
    // turnê "de despedida" falsa: tributo que passa do limite
    if (!t.fake && t.lic !== 1 && !t.ok && (t.k === 'show' || t.k === 'imperson' || t.k === 'exmem') && demand19(s, t).v < 0.5 && s.year - t.y >= 2 && !(histMode(s) === 'strict' && histLocked(s, a)) && r.chance(0.02)) fakeFarewell19(s, t);
    // fim natural: idade, falta de público
    if (t.mem.length && t.mem.every((p) => !alive(s, p))) endT(s, t, l('os músicos morreram', 'the players died'));
    else if (demand19(s, t).v < 0.08 && s.year - t.y >= 3 && r.chance(0.08)) endT(s, t, l('o público sumiu', 'the crowd dried up'));
  }
  // 3) documentário sobre o sósia (cadeia: separação → tributo → sósia → fãs divididos → documentário)
  for (const [actId, w] of Object.entries(st.doc)) if (s.week >= w) { delete st.doc[actId]; documentary19(s, actId); }
  // 4) músico tocando covers
  for (const [actId, since] of Object.entries(st.cov)) {
    const a = s.acts[actId];
    if (!a?.playerBand) { delete st.cov[actId]; continue; }
    post(s, `t19cov:${actId}:${y}-${s.month}`, coverPay19(s, a), 'live', `Covers na noite: ${a.name}`);
    a.fans.casual += Math.round(20 + a.fame);
    if (a.image) a.image.artistic = Math.max(5, a.image.artistic - 0.6); // rótulo de "banda cover"
    if (s.week - since > 52) a.momentum = Math.max(0, a.momentum - 0.5);
  }
});

/** Tributo mantém o catálogo do original tocando (stream18 ouvintes; vendas de catálogo → valor de venda do sale17). */
export function catalogLift19(s: GameState, a: Act, d: number): number {
  const rels = a.releases.map((id) => s.releases[id]).filter((x): x is Release => !!x && x.owner === 'player' && s.year - x.year >= 2);
  if (!rels.length) return 0;
  const best = rels.reduce((b, x) => (x.totalUnits > b.totalUnits ? x : b));
  const u = Math.round(120 * d), v = Math.round(u * money(s, 2.4));
  if (u <= 0) return 0;
  best.totalUnits += u; best.revenue += v;
  post(s, `t19cat:${best.id}:${s.year}-${s.month}`, v, 'sales', `Catálogo (tributos): ${best.title}`);
  const sa = (s as unknown as { x4: { st18?: { a: Record<string, { L: number }> } } }).x4.st18?.a[a.id];
  if (sa) sa.L += u * 3; // ouvintes novos no streaming (só se o ato já tem estado no stream18)
  return v;
}

function court19(s: GameState, r: Rng, t: Trib19): void {
  const a = s.acts[t.act], mine = t.by === 'player';
  const win = r.chance(t.odds ?? 0.4);
  t.court = undefined;
  if (win) {
    endT(s, t, l('perdeu o processo', 'lost the lawsuit'));
    if (mine) post(s, `t19dmg:${t.id}`, Math.round(money(s, 3500) * (0.5 + Math.min(1.5, t.earn / Math.max(1, money(s, 20000))))), 'legal', `Indenização: ${t.name}`);
    if (a) { const f = fan18(s, a.id, false); if (f) f.loy = clamp(f.loy + 2, 0, 100); }
  } else {
    t.lic = 0;
    if (mine) { post(s, `t19lost:${t.id}`, -money(s, 1500), 'legal', `Custas: ${t.name}`); s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100); }
  }
  const tx = fmtL(win ? l('Justiça proíbe "{t}" de usar o nome de {a}.', 'Court bans "{t}" from using {a}\'s name.') : l('"{t}" vence: tributo é homenagem legítima a {a}.', '"{t}" wins: the tribute is a legitimate homage to {a}.'), { t: t.name, a: a?.name ?? '?' });
  logT(s, tx);
  emitFact(s, { kind: 'case_ruling', actors: [mine ? 'player' : (t.by ?? t.act), t.act], severity: 35, visibility: 'public', tags: ['tribute19', mine === win ? 'good' : 'bad'], text: tx, src: 'tribute19' });
}

export function fakeFarewell19(s: GameState, t: Trib19): void {
  const a = s.acts[t.act];
  t.fake = s.week;
  const tx = fmtL(l('"{t}" anuncia a "turnê de despedida de {a}" — fãs compram ingresso achando que é o original.', '"{t}" bills "{a}\'s farewell tour" — fans buy tickets thinking it is the original.'), { t: t.name, a: a?.name ?? '?' });
  logT(s, tx); cnt(s, 'fake');
  emitFact(s, { kind: 'fake_farewell', actors: [t.act, ...(t.mem[0] ? [`p:${t.mem[0]}`] : []), ...(t.res ? ['player'] : [])], severity: 40 + (a?.fame ?? 0) / 5, visibility: 'public', tags: ['tribute19', 'bad'], text: tx, src: 'tribute19', data: { trib: t.id } });
  if (a && mineAct19(s, a) && !a.playerBand && !t.court) pushInbox18(s, 'trib19_lab', { from: t.name, subject: fmtL(l('Despedida falsa de {a}!', 'Fake farewell of {a}!'), { a: a.name }), tone: 'bad', body: fmtL(l('O tributo vende ingressos como se fosse o original. Processar agora tem chance de {o}%.', 'The tribute is selling tickets as if it were the original. Suing now has {o}% odds.'), { o: Math.round(suitOdds19(s, t) * 100) }), ref: { t: t.id }, actions: [{ id: 'sue', label: l('Processar', 'Sue') }, { id: 'license', label: l('Licenciar mesmo assim', 'License anyway') }, { id: 'ignore', label: l('Ignorar', 'Ignore') }], weeks: 4 });
}

export function documentary19(s: GameState, actId: string): void {
  const a = s.acts[actId], pid = t19(s).hired[actId], p = pid ? s.persons[pid] : undefined;
  if (!a) return;
  a.fame = clamp(a.fame + 2, 0, 100); a.momentum = clamp(a.momentum + 8, 0, 100);
  const tx = fmtL(l('Documentário "Não Pare de Acreditar": como {p} saiu de uma banda-tributo para a voz de {a}.', 'Documentary "Don\'t Stop": how {p} went from a tribute band to the voice of {a}.'), { p: p?.name ?? '?', a: a.name });
  logT(s, tx); cnt(s, 'doc');
  emitFact(s, { kind: 'release', actors: [a.id, ...(pid ? [`p:${pid}`] : [])], severity: 45, visibility: 'public', tags: ['tribute19', 'documentary', 'screen', 'good'], text: tx, src: 'tribute19' });
  headline19(s, tx, 2);
}

// ---------------------------------------------------------------- ouvintes (a malha)

const tribOf = (s: GameState, f: Fact) => trib19(s, String(f.data?.trib ?? ''));
// nascimento → direitos (rights18: registro do uso do catálogo), imprensa, fãs (lealdade de quem sente falta)
onFact('tribute_born', (s, f) => {
  const t = tribOf(s, f), a = t && s.acts[t.act];
  if (a && mineAct19(s, a)) r18(s).log.unshift([s.year, s.month, fmtL(l('Uso do catálogo: {t}', 'Catalogue use: {t}'), { t: f.text })]);
}, 'tribute19:rights');
onFact('tribute_born', (s, f) => { if (f.severity >= 38) headline19(s, f.text, 1); }, 'tribute19:press');
onFact('tribute_born', (s, f) => { const fa = fan18(s, f.actors[0], false); if (fa) fa.loy = clamp(fa.loy + 1, 0, 100); }, 'tribute19:fans');
// licença → ledger/rights18: a receita entra todo mês; aqui fica o registro da obra licenciada
onFact('tribute_licensed', (s, f) => { const t = tribOf(s, f); if (t && f.tags.includes('mine')) r18(s).log.unshift([s.year, s.month, f.text]); }, 'tribute19:lic');
// processo → rancor (holds17), tribunal no calendário (provedor abaixo), manchete
onFact('tribute_sued', (s, f) => {
  const lead = f.actors.find((k) => k.startsWith('p:'));
  if (lead) grantHold(s, { holder: lead, target: f.actors[0], kind: 'grievance', strength: 30, months: 24, text: fmtL(l('Processado: {t}', 'Sued: {t}'), { t: f.text }), src: 'tribute19', quiet: true });
  if (f.severity >= 45) headline19(s, f.text, 2);
}, 'tribute19:court');
// sósia contratado → banda (live18: química recomeça), fãs divididos (fans18 facções + haters), cena (cine18)
onFact('soundalike_hired', (s, f) => { const b = band18(s, f.actors[0]); b.chem = Math.max(-50, b.chem - 10); b.tight = Math.max(0, b.tight - 8); }, 'tribute19:live');
onFact('soundalike_hired', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  const fa = fan18(s, a.id, false);
  let pur = 0.35;
  if (fa) {
    fa.loy = clamp(fa.loy - 8, 0, 100);
    if (fa.fac?.length >= 2) { fa.fac[0] = clamp(fa.fac[0] - 30, -50, 50); fa.fac[1] = clamp(fa.fac[1] + 10, -50, 50); } // puristas furiosos, público geral curioso
    if (fa.m?.length >= 6) pur = factions18(s, a, fa).purist;
  }
  const fd = fandomRec19(s, a.id); fd.haters = Math.round((fd.haters ?? 0) + a.fans.core * 0.08);
  t19(s).split[a.id] = [s.year, Math.round(pur * 100)];
  headline19(s, fmtL(l('Fãs de {a} se dividem: "sem a voz original não é a mesma banda".', '{a} fans split: "without the original voice it is not the same band".'), { a: a.name }), 2);
}, 'tribute19:fans_split');
onFact('soundalike_hired', (s, f) => { logShot18(s, { k: 'tribute', act: f.actors[0], pid: String(f.data?.pid ?? ''), text: f.text, fact: f.id, d: { back: 40, q: 0.7 } }); }, 'tribute19:cine');
// despedida falsa → imprensa, escândalo (quem hospeda), fãs do original desconfiam
onFact('fake_farewell', (s, f) => {
  headline19(s, f.text, 2);
  const fa = fan18(s, f.actors[0], false); if (fa) fa.loy = clamp(fa.loy - 3, 0, 100);
  if (f.actors.includes('player')) { const lead = f.actors.find((k) => k.startsWith('p:')); if (lead) scandal(s, lead.slice(2), 'money', 30, [f.id], { quiet: true }); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100); }
}, 'tribute19:fake');
// sucesso tardio do original (revival19) → faísca: tributos nascem mais e lotam mais por um ano
onFact('revival_hit', (s, f) => { const a = s.acts[f.actors[0]]; if (a) t19(s).spark[a.id] = s.week + 52; }, 'tribute19:spark');

// ---------------------------------------------------------------- calendário, porquê, conselheiro

registerDeadline('tribute19', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const t of live19(s)) {
    const a = s.acts[t.act];
    if (t.lic === 1 && t.until && t.until >= from && t.until <= to && a && mineAct19(s, a) && !a.playerBand) out.push({ id: `tribute19-lic-${t.id}`, w: t.until, kind: 'contract', t: fmtL(l('Licença do tributo "{t}" vence', '"{t}" tribute licence expires'), { t: t.name }), act: true, goto: { area: 'tribute19' } });
    if (t.court && t.court >= from && t.court <= to && t.by === 'player') out.push({ id: `tribute19-court-${t.id}`, w: t.court, kind: 'court', t: fmtL(l('Sentença: você × "{t}"', 'Ruling: you vs "{t}"'), { t: t.name }), tone: 'info', goto: { area: 'tribute19' } });
  }
  return out;
});
registerExplain('trib19.demand', (s, c) => {
  const t = trib19(s, String(c.t ?? '')); if (!t) return null;
  const d = demand19(s, t);
  return { title: fmtL(l('Público de "{t}"', '"{t}" crowd'), { t: t.name }), value: d.v, fmt: 'mult', parts: [...d.parts, { label: l('Tipo', 'Kind'), value: TK19[t.k].mul, fmt: 'mult', note: TK19[t.k].desc }], note: l('Bruto/mês ≈ $1.400 (valor real, corrigido pela época) × público. Licença paga a % ao dono do original.', 'Gross/month ≈ $1,400 (real value, era-adjusted) × crowd. A licence pays the % to the original\'s owner.') };
});
registerExplain('trib19.odds', (s, c) => {
  const t = trib19(s, String(c.t ?? '')); if (!t) return null;
  const parts: WhyPart[] = [{ label: fmtL(l('Base do tipo ({k})', 'Kind base ({k})'), { k: TK19[t.k].name }), value: TK19[t.k].odds, fmt: 'pct' }];
  if (t.fake) parts.push({ label: l('Despedida falsa (engana o público)', 'Fake farewell (misleads the public)'), value: 0.2, fmt: 'pct', tone: 'good' });
  if (t.lic === 1) parts.push({ label: l('Já licenciado', 'Already licensed'), value: -0.3, fmt: 'pct', tone: 'bad' });
  if (t.ok) parts.push({ label: l('Aprovado pelo artista', 'Approved by the artist'), value: -0.4, fmt: 'pct', tone: 'bad' });
  return { title: l('Chance no processo', 'Lawsuit odds'), value: suitOdds19(s, t), fmt: 'pct', parts };
});
registerAdvisorTip('tribute19', (s) => live19(s).filter((t) => t.lic === 0 && !t.court && mineAct19(s, s.acts[t.act]) && demand19(s, t).v >= 0.4).slice(0, 2).map((t) => ({
  id: `trib19-${t.id}`, level: 'info' as const, cat: 'opportunity' as const, score: 40,
  text: fmtL(l('"{t}" toca seu catálogo sem licença.', '"{t}" plays your catalogue unlicensed.'), { t: t.name }),
  why: [fmtL(l('Licença renderia {f}/mês.', 'A licence would earn {f}/month.'), { f: fee$(s, t) })], goto: { area: 'tribute19' },
  run: { label: l('Licenciar', 'License'), fn: (s2: GameState) => license19(s2, t.id) ?? l('Licenciado.', 'Licensed.') },
})));

