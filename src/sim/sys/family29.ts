// R29 (FAMÍLIA) — vida familiar para TODO personagem e estrelas mirins. Pedido do autor: "coloque um agente nisso e
// conecte com todo o resto".
//
// 1. Artistas NPC (não só os seus): namoro, casamento, separação/divórcio, filhos, dinheiro da casa, herança — em
//    rodízio com teto (CAP29 pessoas por mês, como o CAP16 do people16; quem fica muito tempo sem vez recupera os meses
//    de uma vez pela chance acumulada). Casais de celebridades: duas pessoas do mundo casam entre si (laço no grafo do
//    kin15), gravam juntas (feat do featp29), fazem turnê do casal; divórcio dentro da mesma banda vira rixa (lineup16
//    lê a rixa como pressão de saída) e pode rachar a banda; com filhos e fama, disputa de guarda na imprensa.
// 2. Filhos: registro LEVE (tupla) até virarem pessoa. Os musicais estreiam pelo caminho único do kin15 (debutKid15,
//    com fama/fãs herdados) — sozinhos ou na banda do pai/mãe (banda de família). O kin15 deixou de fazer nascer filhos
//    (KIN15X.births = false): a família de todo artista nasce aqui, sem duplicar.
// 3. Filhos de gente da indústria (people16: empresário, produtor, líder de selo, equipe, crítico) crescem e escolhem:
//    artista, produtor(a), empresário(a), candidato(a) a equipe/A&R, crítico(a) ou executivo(a) — seguindo o ramo do
//    pai/mãe com alguma chance e pela própria aptidão. Viram PESSOAS do mundo (ficha, busca, árvore), com nepotismo:
//    porta aberta (proposta, contratação, sucessão), comparação na imprensa, contatos e reputação herdados.
// 4. Estrelas mirins (a partir de ~12 anos, pela época): crianças-prodígio, grupos de irmãos (anos 60–2000), programas
//    infantis e concursos de calouros, trainees de idol (K-pop/J-pop, a partir dos anos 90). Menor de idade tem
//    responsável (a família), fundo Coogan (EUA desde 1939; outros países pelas leis da época), escola e limite de horas
//    (carga extra na agenda — capacity.PERSON_LOAD29), risco de exploração (escândalo, multa), esgotamento, a "maldição
//    da estrela mirim" depois dos 18 e pai/mãe-empresário (conflito, desvio do fundo).
// 5. Pessoas reais: no modo exato só a família documentada (nada inventado). Nos mundos alternativos, depois do início,
//    casamentos e filhos simulados valem como história alternativa (marcados "simulado") — nunca contra o documentado.
// Aleatoriedade própria (Rng.fromSeed com chaves `fam29|…`): não mexe no fluxo compartilhado.

import { Rng, clamp, hashString } from '../../core/rng';
import { KIN15 } from '../../data/kin15';
import { KIN25 } from '../../data/kin25';
import { KIN27 } from '../../data/kin27';
import { KINR27 } from '../../data/research27';
import { isKinMeta27 } from '../../data/model27';
import { countryOfCity } from '../../data/geo';
import { CITIES, cityById, familyOf, genreById, l, type FamilyId, type L } from '../../data/world';
import type { RealProd } from '../../data/producers15';
import { mgrById, type MgrStyle, type RealMgr } from '../../data/managers14';
import { PERSON_LOAD29, monthIndex, tourDaysInMonth } from '../capacity';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { histLocked, histMode } from '../history15';
import { signWithRival } from '../contracts';
import { langForCity, makePerson, personName } from '../people';
import { registerPersonAction } from '../personact18';
import { actsNow27 } from '../tickcache27';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { genStaff, spawnProceduralAct } from '../worldgen';
import { actsOfPerson17 } from '../actidx17';
import { scandal } from '../scandal17';
import { grantHold } from '../holds17';
import { attachNpcFeat29 } from './featp29';
import { hasFeat29 } from './feats8';
import { headline19 } from './factlink19';
import { KIN15X, REL15, debutKid15, kin15, kinOf15, type Debut15 } from './kin15';
import { SUCC10, leaders, newLeader } from './leaders10';
import { genMgrs16 } from './people16';
import { ensureFamily } from '../dynasty';
import { departNpc16 } from './lineup16';
import { npc17, career17 } from './npc17';
import { opine, opinionOf, per13 } from './persona13';
import { EST_HEIRS29 } from './post18';
import { canonKey } from './realworld';
import { addProd18, w18 } from './world18';
import { DEFS17, def17, mineOf17, queue17, ctx17 } from './scene17';
import { relAdd, relTouch } from '../opinion';

// ---------------------------------------------------------------- estado (compacto)

/** Família de um artista NPC: [nome do par, id do par se for pessoa do mundo, ano do casamento (0), estado, casa ($ reais)].
 *  estado: 0 solteiro(a) · 1 namorando · 2 casado(a) · 3 separado(a)/divorciado(a). casa = −1: herança já repartida. */
export type F29 = [string, string, number, number, number];
/** Filho(a) leve: [id, pai/mãe (id de pessoa ou chave da indústria), outro pai/mãe (id ou ''), nome, nascimento, musicalidade,
 *  pessoa (id, quando vira pessoa do mundo, ou ''), ano previsto da estreia (0 = não segue música)]. */
export type Kid29 = [string, string, string, string, number, number, string, number];
export type Src29 = 'family' | 'kidgroup' | 'tv' | 'contest' | 'trainee' | 'school' | 'prodigy' | 'real' | 'gen';
export type Path29 = 'music' | 'producer' | 'manager' | 'staff' | 'critic' | 'exec' | 'other';
export interface Minor29 {
  /** responsável (nome) e, quando é pessoa do mundo, o id */
  g: string; gk?: string;
  /** pai/mãe-empresário(a) */
  pm?: 1;
  /** fundo (centavos da época) — Coogan ou equivalente */
  tr: number;
  /** meses seguidos de sobrecarga */
  ov: number;
  src: Src29;
  y0: number;
  /** escândalos de exploração */
  sc?: number;
}
export interface Fam29St {
  cur: number;
  f: Record<string, F29>;
  k: Kid29[];
  min: Record<string, Minor29>;
  /** ex-estrela mirim → ano em que fez 18 (maldição até os 30) */
  ex: Record<string, number>;
  /** pessoa (filho de gente da indústria) → chave do pai/mãe */
  ip: Record<string, string>;
  /** filho(a) da indústria (id leve de s.families) → caminho escolhido */
  dec: Record<string, Path29>;
  /** pessoas reais com família simulada (mundo alternativo) */
  sim: string[];
  /** profissional (equipe/A&R) → pessoa */
  pr: Record<string, string>;
  /** atos do Hall da Fama já examinados para dinastia */
  hof: string[];
  /** década → [casamentos, filhos, estreias da família, divórcios, estrelas mirins, casais célebres, carreiras da indústria, escândalos de exploração] */
  n: Record<string, number[]>;
  log: [number, number, L][];
  /** o mundo inicial já ganhou as famílias de quem começa mais velho */
  seed?: 1;
}
declare module '../ext4' { interface Ext4 { family29: Fam29St } }
const fresh = (): Fam29St => ({ cur: 0, f: {}, k: [], min: {}, ex: {}, ip: {}, dec: {}, sim: [], pr: {}, hof: [], n: {}, log: [] });
registerExt4('family29', fresh);
export function fam29(s: GameState): Fam29St {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.family29 ??= fresh()) as Fam29St;
  st.f ??= {}; st.k ??= []; st.min ??= {}; st.ex ??= {}; st.ip ??= {}; st.dec ??= {}; st.sim ??= []; st.pr ??= {}; st.hof ??= []; st.n ??= {}; st.log ??= [];
  return st;
}
/** Pessoas por mês no rodízio dos artistas NPC (o banco "enorme" tem milhares). */
export const CAP29 = 60;
/** Idade mínima de uma estrela mirim (a época decide quem aparece antes). */
export const CHILD_MIN29 = 12;
export const ADULT29 = 18;
export const RNG29 = 'fam29';
const rng = (s: GameState, tag: string) => Rng.fromSeed(`${s.config.seed}|${RNG29}|${tag}`);
const mIdx = (s: GameState) => s.year * 12 + s.month;
const dec = (y: number) => `${Math.floor(y / 10) * 10}`;
/** contadores por década: 0 casamentos, 1 filhos, 2 estreias da família, 3 divórcios, 4 mirins, 5 casais célebres, 6 carreiras da indústria, 7 exploração */
function count(s: GameState, i: number, n = 1): void { const c = (fam29(s).n[dec(s.year)] ??= [0, 0, 0, 0, 0, 0, 0, 0]); while (c.length < 8) c.push(0); c[i] += n; }
function say(s: GameState, t: L): void { const st = fam29(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; }
const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus');
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const T = fmtL;

// ---------------------------------------------------------------- épocas: natalidade e leis do trabalho infantil

/** Natalidade por época (multiplica a chance de filho): baby boom do pós-guerra, queda depois dos anos 80. */
export const birthRate29 = (y: number): number => (y < 1946 ? 0.95 : y < 1965 ? 1.35 : y < 1980 ? 1.05 : y < 2000 ? 0.85 : 0.72);
export interface Law29 { y: number; cc: string; trust: number; hours: number; name: L }
/** Leis de proteção ao artista menor (por país; '*' = convenção geral). trust = parte dos ganhos que vai para o fundo;
 *  hours = fração da carga de trabalho que conta em dobro (limite de horas e de turnê). */
export const LAWS29: Law29[] = [
  { cc: 'USA', y: 1939, trust: 0.15, hours: 0.5, name: l('Lei Coogan (Califórnia, 1939): 15% dos ganhos do menor ficam num fundo até os 18', 'Coogan Law (California, 1939): 15% of a minor\'s earnings held in trust until 18') },
  { cc: 'GBR', y: 1963, trust: 0.1, hours: 0.5, name: l('Children and Young Persons Act (1963): licença para o menor subir ao palco, com horário limitado', 'Children and Young Persons Act (1963): a licence for minors on stage, with limited hours') },
  { cc: 'BRA', y: 1990, trust: 0.1, hours: 0.5, name: l('ECA (1990): alvará judicial para o trabalho artístico de menores', 'ECA (1990): a court permit for minors\' artistic work') },
  { cc: 'KOR', y: 2014, trust: 0.1, hours: 0.6, name: l('Lei de proteção a artistas menores (2014): limite de horas, escola e descanso', 'Minor entertainers protection act (2014): hour limits, school and rest') },
  { cc: 'JPN', y: 2000, trust: 0.05, hours: 0.4, name: l('Normas trabalhistas para menores no entretenimento (proibido à noite)', 'Labor rules for minors in entertainment (no night work)') },
  { cc: '*', y: 1989, trust: 0.08, hours: 0.4, name: l('Convenção dos Direitos da Criança (ONU, 1989): escola e limite de trabalho', 'UN Convention on the Rights of the Child (1989): schooling and work limits') },
];
/** Lei que vale para uma cidade num ano (a do país; senão a convenção geral; antes de tudo, nenhuma). */
export function law29(cityId: string, y: number): Law29 | undefined {
  const cc = countryOfCity(cityId) ?? '';
  return LAWS29.find((x) => x.cc === cc && y >= x.y) ?? LAWS29.find((x) => x.cc === '*' && y >= x.y);
}

// ---------------------------------------------------------------- pessoas reais: família documentada

let DOC29: { sp: Set<string>; kid: Set<string>; par: Map<string, string[]> } | null = null;
/** Nomes (canônicos) com casamento/ex ou filhos DOCUMENTADOS nos dados de parentesco (kin15/25/27/pesquisa) e os pais
 *  documentados de cada um (nome original — o responsável de uma estrela mirim real é o pai/mãe dos dados). */
function doc29(): { sp: Set<string>; kid: Set<string>; par: Map<string, string[]> } {
  if (DOC29) return DOC29;
  const sp = new Set<string>(), kid = new Set<string>(), par = new Map<string, string[]>();
  const putP = (child: string, parent: string) => { const k = canonKey(child); const xs = par.get(k) ?? []; if (!xs.includes(parent)) xs.push(parent); par.set(k, xs); };
  for (const row of [...KIN15, ...KIN27, ...KINR27]) {
    const last = row[row.length - 1];
    const ns = row.slice(1, isKinMeta27(last) ? -1 : undefined) as string[];
    if (row[0] === 'M' || row[0] === 'X') for (const n of ns) sp.add(canonKey(n));
    if (row[0] === 'P' && ns[0]) { kid.add(canonKey(ns[0])); for (const c of ns.slice(1)) putP(c, ns[0]); }
  }
  for (const [a, r, b] of KIN25) {
    if (r === 'spouse' || r === 'ex') { sp.add(canonKey(a)); sp.add(canonKey(b)); }
    if (r === 'parent') { kid.add(canonKey(a)); putP(b, a); }
    if (r === 'child') { kid.add(canonKey(b)); putP(a, b); }
  }
  return (DOC29 = { sp, kid, par });
}
/** Pais documentados de uma pessoa real (por nome). */
export const docParents29 = (name: string): string[] => doc29().par.get(canonKey(name)) ?? [];
/** Pessoa da história real (catálogo ou dado real27). */
export function isReal29(s: GameState, p: Person, a?: Act): boolean {
  return !!p.real27 || !!a?.catalogNo || actsOfPerson17(s, p.id).some((x) => !!x.catalogNo);
}
/** O que a simulação pode inventar para esta pessoa: romance e filhos. Modo exato: nada para gente real. */
export function canInvent29(s: GameState, p: Person, a?: Act): { love: boolean; kids: boolean; sim: boolean } {
  if (!isReal29(s, p, a)) return { love: true, kids: true, sim: false };
  if (histMode(s) === 'strict' || s.year < s.config.startYear) return { love: false, kids: false, sim: true };
  const k = canonKey(p.name), d = doc29();
  return { love: !d.sp.has(k), kids: !d.kid.has(k), sim: true };
}
const markSim = (s: GameState, pid: string) => { const st = fam29(s); if (!st.sim.includes(pid)) st.sim.push(pid); };
export const isSim29 = (s: GameState, pid: string): boolean => fam29(s).sim.includes(pid);

// ---------------------------------------------------------------- leitura (interface, testes)

export interface FamView29 {
  partner?: { name: string; pid?: string; married?: number; sim?: boolean };
  status: 0 | 1 | 2 | 3;
  exes: { name: string; pid?: string }[];
  kids: { id: string; name: string; born: number; pid?: string; other?: string; music: boolean; debut?: number }[];
  /** pai/mãe na indústria (chave persona13) — filhos de empresário, produtor, CEO, equipe, crítico */
  ipar?: string;
  house: number;
  minor?: Minor29 & { law?: Law29 };
  exChild?: number;
  sim: boolean;
}
/** Família de uma pessoa do mundo (artista NPC, filho da indústria, estrela mirim). */
export function famOf29(s: GameState, pid: string): FamView29 {
  const st = fam29(s), f = st.f[pid];
  const p = s.persons[pid];
  const exes: { name: string; pid?: string }[] = [];
  for (const c of kinOf15(s, pid)) if (c.rel === 'ex') exes.push({ name: c.p.name, pid: c.id });
  if (f && f[3] === 3 && f[0] && !exes.some((x) => x.name === f[0])) exes.push({ name: f[0], pid: f[1] || undefined });
  const kids = st.k.filter((k) => k[1] === pid || k[2] === pid).map((k) => ({ id: k[0], name: k[6] && s.persons[k[6]] ? s.persons[k[6]].name : k[3], born: k[4], pid: k[6] || undefined, other: (k[1] === pid ? k[2] : k[1]) || undefined, music: k[7] > 0, debut: k[7] || undefined }));
  const m = st.min[pid];
  const a = p ? actsOfPerson17(s, pid)[0] : undefined;
  return {
    partner: f && (f[3] === 1 || f[3] === 2) && f[0] ? { name: f[0], pid: f[1] || undefined, married: f[3] === 2 ? f[2] || undefined : undefined, sim: st.sim.includes(pid) } : undefined,
    status: (f?.[3] ?? 0) as 0 | 1 | 2 | 3,
    exes, kids, ipar: st.ip[pid], house: f && f[4] > 0 ? f[4] : 0,
    minor: m ? { ...m, law: law29(a?.city ?? s.config.homeCity, s.year) } : undefined,
    exChild: st.ex[pid], sim: st.sim.includes(pid),
  };
}
export const minorOf29 = (s: GameState, pid: string): Minor29 | undefined => fam29(s).min[pid];
/** Filhos (registro de s.families) de uma pessoa da indústria, com o caminho escolhido e a pessoa em que viraram. */
export function industryKids29(s: GameState, key: string): { id: string; name: string; born: number; pid?: string; path?: Path29 }[] {
  const st = fam29(s);
  return (s.families[key]?.kids ?? []).map((k) => ({ id: k.id, name: k.personId && s.persons[k.personId] ? s.persons[k.personId].name : k.name, born: k.born, pid: k.personId, path: st.dec[k.id] }));
}
/** Filhos ainda leves (não viraram pessoa) que casam com a busca — para o Ctrl+K. */
export function searchKids29(s: GameState, q: string, max = 12): { name: string; born: number; parent: string; parentName: string }[] {
  const out: { name: string; born: number; parent: string; parentName: string }[] = [];
  if (q.length < 2) return out;
  for (const k of fam29(s).k) {
    if (out.length >= max) break;
    if (k[6] || k[4] > s.year || !k[3].toLowerCase().includes(q)) continue;
    const par = s.persons[k[1]];
    out.push({ name: k[3], born: k[4], parent: `p:${k[1]}`, parentName: par?.name ?? k[1] });
  }
  for (const [key, F] of Object.entries(s.families)) {
    if (out.length >= max || !key.includes(':')) continue;
    for (const k of F.kids) if (!k.personId && k.born <= s.year && k.name.toLowerCase().includes(q)) out.push({ name: k.name, born: k.born, parent: key, parentName: per13(s, key)?.name ?? key });
  }
  return out.slice(0, max);
}
export type Tag29 = 'married' | 'couple' | 'parent' | 'nepo' | 'minor' | 'exchild' | 'dynasty' | 'sim';
export const TAG29: Record<Tag29, L> = {
  married: l('Casados', 'Married'), couple: l('Casais célebres', 'Celebrity couples'), parent: l('Com filhos', 'With children'), nepo: l('Filhos de famosos / da indústria', 'Children of the famous / industry'),
  minor: l('Menores (estrelas mirins)', 'Minors (child stars)'), exchild: l('Ex-estrelas mirins', 'Former child stars'), dynasty: l('Parentes no meio musical', 'Relatives in music'), sim: l('Família simulada', 'Simulated family'),
};
/** Etiquetas de família de uma pessoa (filtros "Família" do diretório). */
export function kinTags29(s: GameState, pid: string): Set<Tag29> {
  const st = fam29(s), out = new Set<Tag29>();
  const ks = kinOf15(s, pid), F = st.f[pid];
  const sp = ks.find((k) => k.rel === 'spouse');
  if (sp || F?.[3] === 2) out.add('married');
  if ((sp && actsOfPerson17(s, sp.id).length) || (F?.[3] === 2 && F[1])) out.add('couple');
  if (ks.some((k) => k.rel === 'child') || st.k.some((k) => k[1] === pid || k[2] === pid)) out.add('parent');
  if (st.ip[pid] || ks.some((k) => k.rel === 'parent' && actsOfPerson17(s, k.id).some((a) => a.fame >= 30))) out.add('nepo');
  if (st.min[pid]) out.add('minor');
  if (st.ex[pid] !== undefined) out.add('exchild');
  if (ks.some((k) => k.rel !== 'ex' && actsOfPerson17(s, k.id).length)) out.add('dynasty');
  if (st.sim.includes(pid)) out.add('sim');
  return out;
}

/** Parte do público jovem de um ato (estrela mirim / boy band / idol puxam público jovem) — para a demografia (demo29). */
export function youthSkew29(s: GameState, actId: string): number {
  const a = s.acts[actId];
  if (!a) return 0;
  const st = fam29(s);
  const kids = a.members.filter((id) => st.min[id] || (st.ex[id] !== undefined && s.year - st.ex[id] <= 3)).length;
  return a.members.length ? clamp(kids / a.members.length, 0, 1) : 0;
}

// ---------------------------------------------------------------- 1. vida familiar dos artistas NPC (rodízio)

/** Quem entra no rodízio: integrantes vivos de atos NPC ativos/emergentes/em hiato (os seus vivem pela dynasty.ts). */
function pool29(s: GameState): { pid: string; a: Act }[] {
  const out: { pid: string; a: Act }[] = [];
  const seen = new Set<string>();
  for (const a of actsNow27(s)) {
    if (!live(a) || mine(a) || a.deceased || a.debutYear > s.year) continue;
    for (const id of a.members) {
      if (seen.has(id)) continue;
      const p = s.persons[id];
      if (!p || !p.alive || p.isPlayer) continue;
      seen.add(id);
      out.push({ pid: id, a });
    }
  }
  return out;
}
/** chance acumulada de k meses (quem ficou k meses sem vez no rodízio) */
const acc = (p: number, k: number) => 1 - Math.pow(1 - clamp(p, 0, 1), k);
const fameOf = (a?: Act) => a?.fame ?? 0;
const actOfP = (s: GameState, pid: string): Act | undefined => { const xs = actsOfPerson17(s, pid); return xs.find((x) => live(x)) ?? xs[0]; };

function setF(s: GameState, pid: string): F29 { return (fam29(s).f[pid] ??= ['', '', 0, 0, 0]); }

/** Par para um artista: às vezes outra pessoa do mundo (casal célebre), senão alguém de fora da música. */
function findMate(s: GameState, r: Rng, p: Person, a: Act, pool: { pid: string; a: Act }[]): { pid: string; a: Act } | undefined {
  const st = fam29(s), age = s.year - p.born;
  if (!r.chance(0.05 + a.fame / 400)) return undefined;
  let best: { pid: string; a: Act; v: number } | undefined;
  const n = Math.min(36, pool.length);
  for (let i = 0; i < n; i++) {
    const c = pool[r.int(0, pool.length - 1)];
    if (c.pid === p.id) continue;
    const q = s.persons[c.pid];
    if (!q || Math.abs((s.year - q.born) - age) > 9 || s.year - q.born < ADULT29) continue;
    const g = st.f[c.pid];
    if (g && (g[3] === 1 || g[3] === 2)) continue;
    if (!canInvent29(s, q, c.a).love || kinOf15(s, p.id).some((k) => k.id === c.pid)) continue;
    const v = -Math.abs(c.a.fame - a.fame) / 20 + (c.a.id === a.id ? 1.4 : 0) + (c.a.city === a.city ? 0.8 : 0) + (familyOf(c.a.genre) === familyOf(a.genre) ? 0.6 : 0) + r.next() * 0.5;
    if (!best || v > best.v) best = { pid: c.pid, a: c.a, v };
  }
  return best && best.v > -1.2 ? best : undefined;
}

function lifeOf(s: GameState, r: Rng, p: Person, a: Act, pool: { pid: string; a: Act }[], k: number): void {
  const st = fam29(s);
  const age = s.year - p.born;
  if (age < ADULT29) return;
  const inv = canInvent29(s, p, a);
  if (!inv.love && !inv.kids) return;
  const f = st.f[p.id];
  const stt = f?.[3] ?? 0;
  // dinheiro da casa: parte do que o ato rende menos o custo da casa e dos filhos
  if (f && f[4] >= 0) {
    const kids = st.k.reduce((n, x) => n + (x[1] === p.id && s.year - x[4] < 18 ? 1 : 0), 0);
    f[4] = Math.max(0, Math.round(f[4] + k * (200 + a.fame * 25 + (stt === 1 || stt === 2 ? (f[1] ? 0 : 350) : 0) - 550 - kids * 160)));
  }
  // namoro
  if (stt === 0 || stt === 3) {
    if (!inv.love || age > 68 || !r.chance(acc(0.011, k))) return;
    const mate = findMate(s, r, p, a, pool);
    const F = setF(s, p.id);
    if (mate) {
      const q = s.persons[mate.pid];
      const G = setF(s, q.id);
      F[0] = q.name; F[1] = q.id; F[2] = 0; F[3] = 1;
      G[0] = p.name; G[1] = p.id; G[2] = 0; G[3] = 1;
      relAdd(s, p.id, q.id, 30); relAdd(s, q.id, p.id, 30);
      if (inv.sim) markSim(s, p.id);
      if (canInvent29(s, q, mate.a).sim) markSim(s, q.id);
      const big = a.fame + mate.a.fame >= 70;
      const t = T(l('{p} ({a}) e {q} ({b}) estão juntos — o casal é a nova capa das revistas.', '{p} ({a}) and {q} ({b}) are together — the couple is the new magazine cover.'), { p: p.name, a: a.name, q: q.name, b: mate.a.name });
      if (big) say(s, t);
      emitFact(s, { kind: 'romance', actors: [p.id, q.id, a.id, mate.a.id], place: a.city, severity: clamp(15 + (a.fame + mate.a.fame) / 4, 10, 60), visibility: big ? 'public' : 'rumor', tags: ['family29', 'couple', 'romance'], text: t, src: 'family29' });
    } else {
      F[0] = personName(r, langForCity(a.city, r)); F[1] = ''; F[2] = 0; F[3] = 1;
      if (inv.sim) markSim(s, p.id);
    }
    return;
  }
  const F = f!;
  const q = F[1] ? s.persons[F[1]] : undefined;
  if (F[1] && (!q || !q.alive)) { F[3] = 3; return; } // par morreu (luto vem do kin15) ou sumiu
  // separação (vício, estresse, estrada; casal célebre sob holofote)
  const away = s.tours.some((t) => t.actId === a.id && t.status === 'running') ? 0.002 : 0;
  const sep = 0.0035 + (p.health === 'addiction' ? 0.008 : 0) + (p.stress > 70 ? 0.004 : 0) + away + (q ? 0.0015 : 0);
  if (r.chance(acc(sep, k))) { separate(s, r, p, a, F, q); return; }
  if (stt === 1) {
    if (inv.love && r.chance(acc(0.007, k))) marry(s, p, a, F, q);
    else if (inv.kids && age <= 44 && r.chance(acc(0.0018 * birthRate29(s.year), k))) birth(s, r, p, a, F, q);
    return;
  }
  // casado(a): filhos e, para o casal célebre, projetos juntos
  const nk = st.k.reduce((n, x) => n + (x[1] === p.id || x[2] === p.id ? 1 : 0), 0);
  if (inv.kids && age >= 21 && age <= 45 && nk < 4 && r.chance(acc(0.0095 * birthRate29(s.year), k))) birth(s, r, p, a, F, q);
  else if (q && a.fame >= 25 && r.chance(acc(0.0025 * (1 + a.fame / 60), k)) && !inv.sim) affair(s, p, a);
}

function marry(s: GameState, p: Person, a: Act, F: F29, q?: Person): void {
  F[2] = s.year; F[3] = 2;
  const qa = q ? actOfP(s, q.id) : undefined;
  if (q) {
    const G = setF(s, q.id);
    G[0] = p.name; G[1] = p.id; G[2] = s.year; G[3] = 2;
    const st = kin15(s);
    st.g = st.g.filter((x) => !((x[0] === p.id && x[1] === q.id) || (x[0] === q.id && x[1] === p.id)));
    st.g.push([p.id, q.id, 'spouse']);
    count(s, 5);
    // holofote: os dois atos ganham fama e trocam um pouco de público
    for (const [x, y] of [[a, qa], [qa, a]] as [Act | undefined, Act | undefined][]) if (x && y && !x.catalogNo) { x.fame = clamp(x.fame + 1, 0, 100); x.fans.casual += Math.round(y.fans.casual * 0.01); }
  }
  count(s, 0);
  const t = q
    ? T(l('{p} ({a}) e {q} ({b}) se casam: festa de estrelas, fotos vendidas a peso de ouro.', '{p} ({a}) and {q} ({b}) marry: a star-studded party, photos sold for a fortune.'), { p: p.name, a: a.name, q: q.name, b: qa?.name ?? '—' })
    : T(l('{p} ({a}) se casa com {q}.', '{p} ({a}) marries {q}.'), { p: p.name, a: a.name, q: F[0] });
  say(s, t);
  const sev = clamp(10 + (a.fame + (qa?.fame ?? 0)) / 3, 8, 70);
  emitFact(s, { kind: 'marriage', actors: [p.id, ...(q ? [q.id] : []), a.id, ...(qa ? [qa.id] : [])], place: a.city, severity: sev, visibility: a.fame >= 20 || q ? 'public' : 'rumor', tags: ['good', 'romance', 'family29', ...(q ? ['couple'] : [])], text: t, src: 'family29' });
  loud(s, t, [a, qa], 'good');
}

function separate(s: GameState, r: Rng, p: Person, a: Act, F: F29, q?: Person): void {
  const st = fam29(s);
  const married = F[3] === 2;
  const qa = q ? actOfP(s, q.id) : undefined;
  F[3] = 3; F[2] = 0;
  p.stress = clamp(p.stress + (married ? 18 : 8), 0, 100); p.morale = clamp(p.morale - (married ? 12 : 5), 0, 100);
  if (F[4] > 0) F[4] = Math.round(F[4] * (married ? 0.55 : 0.85)); // divisão de bens
  if (q) {
    const G = setF(s, q.id);
    G[3] = 3; G[2] = 0;
    q.stress = clamp(q.stress + (married ? 18 : 8), 0, 100); q.morale = clamp(q.morale - (married ? 12 : 5), 0, 100);
    relAdd(s, p.id, q.id, -35); relAdd(s, q.id, p.id, -35);
    if (married) { const kg = kin15(s); for (const x of kg.g) if ((x[0] === p.id && x[1] === q.id) || (x[0] === q.id && x[1] === p.id)) x[2] = 'ex'; }
  }
  if (married) count(s, 3);
  const kids = st.k.filter((x) => (x[1] === p.id || x[2] === p.id) && s.year - x[4] < 18);
  const t = married
    ? T(q ? l('{p} e {q} se divorciam — o fim do casal mais fotografado da cena.', '{p} and {q} divorce — the end of the scene\'s most photographed couple.') : l('{p} ({a}) e {q} se divorciam.', '{p} ({a}) and {q} divorce.'), { p: p.name, a: a.name, q: q?.name ?? F[0] })
    : T(l('{p} ({a}) e {q} terminam o namoro.', '{p} ({a}) and {q} break up.'), { p: p.name, a: a.name, q: q?.name ?? F[0] });
  say(s, t);
  emitFact(s, { kind: 'breakup', actors: [p.id, ...(q ? [q.id] : []), a.id], place: a.city, severity: clamp(8 + a.fame / 3 + (q ? 10 : 0), 5, 70), visibility: a.fame >= 25 || q ? 'public' : 'rumor', tags: ['bad', 'romance', 'family29', ...(married ? ['divorce'] : [])], text: t, src: 'family29' });
  if (married) loud(s, t, [a, qa], 'bad');
  // divórcio dentro da mesma banda: rixa (o lineup16 lê como pressão de saída) e, às vezes, a banda racha na hora
  if (q && married && a.members.includes(q.id)) {
    const kf = kin15(s), key = p.id < q.id ? `${p.id}|${q.id}` : `${q.id}|${p.id}`;
    kf.feud[key] = mIdx(s);
    const t2 = T(l('O divórcio de {p} e {q} contamina {a}: os dois mal se olham no ensaio.', '{p} and {q}\'s divorce poisons {a}: they barely look at each other in rehearsal.'), { p: p.name, q: q.name, a: a.name });
    say(s, t2);
    emitFact(s, { kind: 'feud', actors: [p.id, q.id, a.id], place: a.city, severity: clamp(20 + a.fame / 3, 15, 70), visibility: 'public', tags: ['bad', 'family29', 'divorce', 'band'], text: t2, src: 'family29' });
    if (!mine(a) && !histLocked(s, a) && r.chance(0.5)) {
      const out = p.stress + p.resentment > q.stress + q.resentment ? p : q;
      departNpc16(s, r, a, out, 'feud');
    } else if (mine(a)) notify(s, t2, 'bad');
  }
  // guarda dos filhos: com fama, vira briga pública
  if (married && kids.length && a.fame + (qa?.fame ?? 0) >= 30) {
    const t3 = T(l('Guarda dos filhos de {p} e {q} vai parar no tribunal (e nas manchetes).', 'Custody of {p} and {q}\'s children ends up in court (and in the headlines).'), { p: p.name, q: q?.name ?? F[0] });
    if (F[4] > 0) F[4] = Math.round(F[4] * 0.8); // advogados
    emitFact(s, { kind: 'custody', actors: [p.id, ...(q ? [q.id] : []), a.id], place: a.city, severity: clamp(20 + a.fame / 2, 20, 75), visibility: 'public', tags: ['bad', 'family29', 'law'], text: t3, src: 'family29' });
    say(s, t3);
  }
}

function birth(s: GameState, r: Rng, p: Person, a: Act, F: F29, q?: Person): void {
  const st = fam29(s);
  // musicalidade herdada do potencial dos pais (o de fora da música puxa para baixo) + o acaso
  const mus = (x?: Person) => (x ? x.potential : 35);
  const musical = Math.round(clamp((mus(p) + (q ? mus(q) : r.int(25, 60))) / 2 + r.normal(8, 15), 3, 99)); // cresceu entre instrumentos: +8
  const sur = p.name.split(' ').slice(1).join(' ');
  const first = personName(r, langForCity(a.city, r)).split(' ')[0];
  const name = sur ? `${first} ${sur}` : `${first} ${p.name}`;
  // seguir música: musicalidade e o exemplo de casa; criança-prodígio estreia cedo quando a época deixa
  let debut = 0;
  if (musical >= 55 && r.chance(0.55 + (musical - 55) / 90 + a.fame / 400)) {
    const early = musical >= 72 && r.chance(childEra29(s.year + 13) * 0.6);
    debut = s.year + (early ? r.int(CHILD_MIN29, 16) : r.int(17, 24));
  }
  const kid: Kid29 = [`f29k${hashString(`${s.config.seed}|${p.id}|${s.week}|${st.k.length}`).toString(36)}`, p.id, q?.id ?? '', name, s.year, musical, '', debut];
  st.k.push(kid);
  count(s, 1);
  if (canInvent29(s, p, a).sim) markSim(s, p.id);
  if (F[4] > 0) F[4] = Math.max(0, F[4] - 2000);
  p.stress = clamp(p.stress - 4, 0, 100);
  const t = T(l('Nasce {k}, filho(a) de {p}{q} ({a}).', '{k} is born to {p}{q} ({a}).'), { k: name, p: p.name, q: q ? T(l(' e {n}', ' and {n}'), { n: q.name }) : '', a: a.name });
  say(s, t);
  emitFact(s, { kind: 'birth', actors: [p.id, ...(q ? [q.id] : []), a.id], place: a.city, severity: clamp(6 + a.fame / 4, 5, 50), visibility: a.fame >= 30 ? 'public' : 'rumor', tags: ['good', 'family', 'family29'], text: t, src: 'family29' });
  loud(s, t, [a, q ? actOfP(s, q.id) : undefined], 'info');
}

function affair(s: GameState, p: Person, a: Act): void {
  const t = T(l('Fotos de {p} ({a}) com outra pessoa: o casamento balança.', 'Photos of {p} ({a}) with someone else: the marriage wobbles.'), { p: p.name, a: a.name });
  p.stress = clamp(p.stress + 10, 0, 100);
  const F = fam29(s).f[p.id];
  const q = F?.[1] ? s.persons[F[1]] : undefined;
  if (q) relAdd(s, q.id, p.id, -30);
  say(s, t);
  const vis = a.fame >= 45 ? 'public' : 'rumor';
  emitFact(s, { kind: 'affair', actors: [p.id, ...(q ? [q.id] : []), a.id], place: a.city, severity: clamp(15 + a.fame / 2, 15, 70), visibility: vis, tags: ['bad', 'romance', 'family29'], text: t, src: 'family29' });
  // Submundo (sem sequestro: só o que o sistema já tem): o boato chega à sua assessoria e vira segredo guardado — a
  // chantagem/exposição do crime17 usa (+25% de chance com segredo), e o livro de favores mostra
  if (vis === 'rumor' && !mine(a) && s.player.staff.some((x) => x.role === 'publicist')) {
    grantHold(s, { holder: 'player', target: p.id, kind: 'secret', strength: 30, months: 36, src: 'family29', text: T(l('Sua assessoria sabe do caso extraconjugal de {p}', 'Your publicist knows about {p}\'s affair'), { p: p.name }), quiet: true });
  }
}

/** Avisos: gente sua (elenco) e estrelas (fama ≥ 60) vão para a caixa de avisos e a memória. */
function loud(s: GameState, t: L, acts: (Act | undefined)[], tone: 'good' | 'bad' | 'info' | 'event'): void {
  const xs = acts.filter((x): x is Act => !!x);
  const my = xs.some(mine), star = xs.some((x) => x.fame >= 60);
  if (my || star) remember(s, 'family29', t, { actId: xs.find(mine)?.id ?? xs[0]?.id, important: my || xs.some((x) => x.fame >= 75) });
  if (my || star) notify(s, t, my ? (tone === 'info' ? 'event' : tone) : 'info');
}

/** Casal célebre: dueto (feat) e turnê do casal, uma vez por ano no máximo. */
function couples(s: GameState, r: Rng): void {
  const st = fam29(s);
  const seen = new Set<string>();
  for (const [pid, F] of Object.entries(st.f)) {
    if (F[3] !== 2 || !F[1] || seen.has(pid)) continue;
    seen.add(F[1]);
    const p = s.persons[pid], q = s.persons[F[1]];
    if (!p?.alive || !q?.alive) continue;
    const a = actOfP(s, pid), b = actOfP(s, q.id);
    if (!a || !b || a.id === b.id || !live(a) || !live(b)) continue;
    // dueto: o anfitrião NPC credita o par numa faixa ainda não lançada
    if (r.chance(0.22)) {
      const host = !mine(a) ? a : !mine(b) ? b : undefined;
      const guest = host === a ? q : p;
      const so = host?.songs.map((id) => s.songs[id]).find((x) => x && !x.releaseId && !hasFeat29(s, x.id));
      if (host && so && attachNpcFeat29(s, host, so.id, [guest.id])) {
        const t = T(l('Dueto do casal: {q} canta em "{t}", de {a}.', 'The couple\'s duet: {q} sings on "{t}" by {a}.'), { q: guest.name, t: so.title.replace(/ \(feat\. [^)]*\)/, ''), a: host.name });
        say(s, t);
        loud(s, t, [a, b], 'info');
      }
    }
    // turnê do casal: embalo para os dois e público cruzado
    if (a.fame >= 20 && b.fame >= 20 && r.chance(0.15)) {
      for (const [x, y] of [[a, b], [b, a]] as [Act, Act][]) { x.momentum = clamp(x.momentum + 6, 0, 100); x.fans.casual += Math.round(y.fans.casual * 0.02); }
      const t = T(l('{p} e {q} saem em turnê juntos ({a} + {b}): ingressos esgotam nas capitais.', '{p} and {q} tour together ({a} + {b}): tickets sell out in the big cities.'), { p: p.name, q: q.name, a: a.name, b: b.name });
      say(s, t);
      emitFact(s, { kind: 'couple_tour', actors: [p.id, q.id, a.id, b.id], place: a.city, severity: clamp(15 + (a.fame + b.fame) / 4, 15, 65), visibility: 'public', tags: ['good', 'family29', 'live'], text: t, src: 'family29' });
      loud(s, t, [a, b], 'good');
    }
  }
}

/** Herança: quem morreu deixa a casa para o cônjuge (pessoa), os filhos que viraram pessoa ou o ato (espólio). */
function inheritance(s: GameState): void {
  const st = fam29(s);
  for (const [pid, F] of Object.entries(st.f)) {
    const p = s.persons[pid];
    if (!p || p.alive || F[4] < 0) continue;
    const pot = F[4];
    F[4] = -1;
    if (pot <= 0) continue;
    const heirs: Person[] = [];
    if (F[3] === 2 && F[1] && s.persons[F[1]]?.alive) heirs.push(s.persons[F[1]]);
    for (const k of st.k) if ((k[1] === pid || k[2] === pid) && k[6] && s.persons[k[6]]?.alive) heirs.push(s.persons[k[6]]);
    const share = Math.round(pot / Math.max(1, heirs.length));
    for (const h of heirs) {
      const G = st.f[h.id];
      if (G && G[4] >= 0) G[4] += share;
      else { const ha = actOfP(s, h.id); if (ha) ha.cash += money(s, share); }
    }
    if (!heirs.length) { const a = actOfP(s, pid); if (a) a.cash += money(s, pot); }
    if (pot >= 20000) say(s, T(l('Herança de {p}: US$ {v} para {h}.', '{p}\'s inheritance: US$ {v} to {h}.'), { p: p.name, v: Math.round(pot).toLocaleString('en-US'), h: heirs.map((x) => x.name).join(', ') || l('o espólio', 'the estate') }));
  }
}
/** Herdeiros fora do mundo (cônjuge de fora e filhos leves adultos) para o espólio do post18. */
function estHeirs29(s: GameState, pid: string): { name: string; rel: 'child' | 'spouse' }[] {
  const st = fam29(s), F = st.f[pid];
  const out: { name: string; rel: 'child' | 'spouse' }[] = [];
  if (F && F[3] === 2 && F[0] && !F[1]) out.push({ name: F[0], rel: 'spouse' });
  for (const k of st.k) if ((k[1] === pid || k[2] === pid) && !k[6] && s.year - k[4] >= ADULT29) out.push({ name: k[3], rel: 'child' });
  return out;
}

// ---------------------------------------------------------------- 2. filhos que estreiam (caminho único do kin15)

/** Época de crianças no palco (0..1): crianças-prodígio do rádio/cinema, grupos de irmãos 1960–2005, idols e calouros depois. */
export const childEra29 = (y: number): number => (y < 1930 ? 0.4 : y < 1960 ? 0.55 : y < 2006 ? 0.9 : 0.75);

function debuts(s: GameState, r: Rng): void {
  const st = fam29(s);
  for (const k of st.k) {
    if (!k[7] || k[6] || s.year < k[7] || r.next() > 0.25) continue;
    const par = s.persons[k[1]];
    if (!par) { k[7] = 0; continue; }
    const pa = actOfP(s, par.id);
    const age = s.year - k[4];
    if (age > 34) { k[7] = 0; continue; }
    // banda de família: a banda do pai/mãe ainda na ativa recebe o filho (às vezes)
    const band = pa && live(pa) && pa.members.includes(par.id) && pa.members.length < 6 && !histLocked(s, pa) && !mine(pa) && r.chance(0.2) ? pa : undefined;
    const o: Debut15 = { par, pa, name: k[3], born: k[4], band };
    PENDING = k;
    const kid = debutKid15(s, r, o);
    PENDING = null;
    if (!kid) { k[7] = 0; continue; }
    k[6] = kid.id; // também pelo gancho; aqui garante que ninguém estreia duas vezes
  }
}
let PENDING: Kid29 | null = null;
/** Liga os ganchos nos outros sistemas (kin15, post18, leaders10, capacity, scene17, personact18). Preguiçoso e por
 *  partes: a ordem dos imports (worldgen → sys/index → …) pode avaliar este módulo antes de algum deles terminar — o que
 *  ainda não existe fica para a próxima chamada (fim do módulo, 'newgame' e cada mês). */
const WIRED29 = new Set<string>();
function hooks29(): void {
  // ESM nativo: ler um import ainda não avaliado lança (TDZ); no vitest vem undefined — os dois casos ficam para depois
  const once = (k: string, ok: () => boolean, f: () => void) => {
    if (WIRED29.has(k)) return;
    try { if (!ok()) return; f(); WIRED29.add(k); } catch { /* ainda carregando: tenta na próxima */ }
  };
  once('kin15', () => !!KIN15X, () => { KIN15X.births = false; KIN15X.debut = onDebut; });
  once('post18', () => !!EST_HEIRS29, () => { EST_HEIRS29.f = estHeirs29; });
  try { if (SUCC10) wireSucc29(); } catch { /* ainda carregando */ } // sempre confere: o people16 pode ter trocado o pick depois
  once('load', () => Array.isArray(PERSON_LOAD29), () => { PERSON_LOAD29.push(load29); });
  once('scenes', () => typeof def17 === 'function', () => wireScenes29());
  once('actions', () => typeof registerPersonAction === 'function', () => wireActions29());
}
registerSimHook('newgame', 'family29', () => hooks29());
function onDebut(s: GameState, kid: Person, act: Act, o: Debut15): void {
  const st = fam29(s);
  const k = PENDING;
  if (k) {
    k[6] = kid.id;
    if (k[2] && s.persons[k[2]]) kin15(s).g.push([k[2], kid.id, 'child']);
  }
  count(s, 2);
  // contatos herdados: as melhores relações do pai/mãe viram portas para o filho
  const par = o.par;
  if (par) for (const [id, v] of Object.entries(par.rel).filter(([, v]) => v > 30).sort((x, y) => y[1] - x[1]).slice(0, 6)) if (id !== kid.id) relTouch(s, kid.id, id, Math.round(v / 2));
  if (kid.potential < 70 && (par || o.boost)) kid.potential = Math.min(95, kid.potential + 4);
  const age = s.year - kid.born;
  if (age < ADULT29) addMinor(s, kid, act, 'family', par);
  const pf = Math.max(par ? fameOf(o.pa) : 0, (o.boost ?? 0) * 6);
  const t = par
    ? T(l('{k} estreia: filho(a) de {p}. "Não sou só o sobrenome", diz.', '{k} debuts: child of {p}. "I am not just the surname," they say.'), { k: kid.name, p: par.name })
    : T(l('{k} estreia{n}.', '{k} debuts{n}.'), { k: kid.name, n: o.note ?? '' });
  emitFact(s, { kind: 'family_debut', actors: [kid.id, act.id, ...(par ? [par.id] : [])], place: act.city, severity: clamp(10 + pf / 2, 8, 60), visibility: pf >= 30 ? 'public' : 'rumor', tags: ['family29', 'debut', ...(age < ADULT29 ? ['child_star'] : [])], text: t, src: 'family29', data: { pf: Math.round(pf) } });
  void st;
}

// ---------------------------------------------------------------- 3. filhos de gente da indústria escolhem carreira

const PFX = ['e:', 'pd:', 'l:', 's:', 'c:'];
const fieldOf = (key: string): Path29 => (key.startsWith('pd:') ? 'producer' : key.startsWith('e:') ? 'manager' : key.startsWith('l:') ? 'exec' : key.startsWith('c:') ? 'critic' : key.startsWith('s:') ? 'staff' : 'other');
const ROLE_OF: Record<string, string> = { 'e:': 'booking', 'pd:': 'engineer', 'l:': 'anr', 'c:': 'publicist' };
export const PATH29: Record<Path29, L> = {
  music: l('artista', 'artist'), producer: l('produtor(a)', 'producer'), manager: l('empresário(a)', 'manager'), staff: l('equipe / A&R (candidato[a])', 'staff / A&R (candidate)'),
  critic: l('crítico(a)', 'critic'), exec: l('executivo(a) de gravadora', 'label executive'), other: l('outra profissão', 'another profession'),
};

/** Escolhe o caminho de um filho da indústria (pela aptidão e pelo ramo do pai/mãe). */
export function pathFor29(s: GameState, key: string, kid: { id: string; musical: number }): Path29 {
  const r = rng(s, `path|${kid.id}`);
  const field = fieldOf(key);
  const apt = r.int(25, 92);
  const w: [Path29, number][] = [
    ['music', kid.musical >= 55 ? ((kid.musical - 45) / 25) ** 2 * 0.5 : 0.02],
    [field, field === 'other' ? 0 : 0.55 * (apt / 60)],
    ['producer', kid.musical >= 45 ? 0.08 : 0.02], ['manager', 0.08], ['staff', 0.12], ['critic', 0.05], ['exec', key.startsWith('l:') ? 0.15 : 0.03],
    ['other', 1.1],
  ];
  return r.weighted(w, (x) => x[1])![0];
}

function industryKids(s: GameState): void {
  const st = fam29(s);
  for (const [key, F] of Object.entries(s.families)) {
    if (!PFX.some((x) => key.startsWith(x))) continue;
    for (const k of F.kids) {
      const age = s.year - k.born;
      if (age < ADULT29 || age > 30 || st.dec[k.id] || k.personId) continue;
      const path = pathFor29(s, key, k);
      st.dec[k.id] = path;
      if (path === 'other' || (path === 'exec' && key.startsWith('l:'))) continue; // herdeiro de selo: fica na fila da sucessão (people16)
      careerOf(s, key, k, path);
    }
  }
}

/** O filho vira pessoa do mundo e entra no ramo (com o nepotismo de sempre: contatos, reputação e portas). */
export function careerOf(s: GameState, key: string, k: { id: string; name: string; born: number; musical: number; personId?: string }, path: Path29): Person | undefined {
  hooks29();
  const st = fam29(s);
  st.dec[k.id] ??= path;
  const r = rng(s, `car|${k.id}`);
  const P = per13(s, key);
  const city = P?.city && cityById[P.city] ? P.city : s.config.homeCity;
  const parentName = P?.name ?? key;
  const fam = (cityById[city]?.scenes.map((g) => familyOf(g))[0] ?? 'pop') as FamilyId;
  const genre = cityById[city]?.scenes.find((g) => genreById[g] && genreById[g].born <= s.year);
  const note = T(l(', filho(a) de {p} ({r})', ', child of {p} ({r})'), { p: parentName, r: PATH29[fieldOf(key)] });
  if (path === 'music') {
    const boost = key.startsWith('l:') || key.startsWith('pd:') ? 6 : 4;
    const kid = debutKid15(s, r, { name: k.name, born: k.born, city, genre, boost, note, members: 1 });
    if (!kid) return undefined;
    k.personId = kid.id; st.ip[kid.id] = key;
    inheritContacts(s, key, kid);
    // nepotismo: o selo do pai/mãe (líder) chama o filho para o elenco
    const L0 = key.startsWith('l:') ? leaders(s).L[key.slice(2)] : undefined;
    const lb = L0?.label ? s.labels[L0.label] : undefined;
    const act = actOfP(s, kid.id);
    if (lb?.active && act && !act.owner) { signWithRival(s, act, lb.id, r, true); say(s, T(l('{k} assina com {b}, o selo de {p}: "nada a ver com o sobrenome", jura a assessoria.', '{k} signs with {b}, {p}\'s label: "nothing to do with the surname," the press office swears.'), { k: kid.name, b: lb.name, p: parentName })); }
    count(s, 6);
    return kid;
  }
  const role: Person['role'] = path === 'producer' ? 'producer' : 'vocal';
  const kid = makePerson(s, r, { lang: langForCity(city, r), role, potential: clamp(45 + k.musical / 3 + r.int(-6, 10), 30, 92), born: k.born, startFrac: 0.55, name: k.name });
  kid.origin = 'family';
  if (path === 'manager' || path === 'exec' || path === 'staff') kid.skills.biz = clamp(kid.skills.biz + 18, 0, 99);
  s.persons[kid.id] = kid;
  k.personId = kid.id; st.ip[kid.id] = key;
  inheritContacts(s, key, kid);
  const why = T(l('cresceu nos bastidores com {p}', 'grew up backstage with {p}'), { p: parentName });
  const car = (dk: 'producer' | 'manager' | 'anr' | 'critic', lb?: string) => { w18(s).car[kid.id] = { k: dk, y: s.year, act: '', city, fam, lb, until: s.year + r.int(15, 30), why }; career17(s, `p:${kid.id}`, 'family', dk, why); };
  let text: L;
  if (path === 'producer') {
    const pt = key.startsWith('pd:') ? 3 : 2; // filho de produtor já começa um degrau acima (a agenda do pai/mãe)
    const pr: RealProd = {
      id: `x18_${kid.id}`, name: kid.name, born: kid.born, city, studio: `${kid.name.split(' ').slice(-1)[0]} Studio`, from: s.year, to: s.year + r.int(15, 30),
      sig: (['glossy', 'dry', 'organic', 'maximalist', 'trap808', 'dub', 'swing'] as RealProd['sig'][])[r.int(0, 6)], snd: T(l('O som que aprendeu com {p}', 'The sound learned from {p}'), { p: parentName }), fx: [r.int(1, 7), r.int(0, 6), r.int(1, 7)], fam: [fam],
      tier: pt as RealProd['tier'], skill: clamp(Math.round(kid.skills.prod * 0.6 + 30 + (key.startsWith('pd:') ? 8 : 0)), 45, 92), ego: r.int(20, 80),
      a: [r.int(50, 88), r.int(35, 80), r.int(35, 80), r.int(35, 80), r.int(30, 80)],
      bio: T(l('Filho(a) de {p}: cresceu dentro do estúdio e herdou a agenda de contatos.', 'Child of {p}: grew up inside the studio and inherited the contact book.'), { p: parentName }), w: [],
    };
    addProd18(s, pr);
    car('producer');
    text = T(l('{k}, filho(a) de {p}, abre o próprio estúdio como produtor(a).', '{k}, child of {p}, opens their own studio as a producer.'), { k: kid.name, p: parentName });
  } else if (path === 'manager') {
    const pm = key.startsWith('e:') ? mgrById[key.slice(2)] : undefined;
    const m: RealMgr = {
      id: `n17_${kid.id}`, name: kid.name, born: kid.born, city, from: s.year, to: s.year + r.int(15, 30), style: (pm?.style ?? (['guardian', 'shark', 'impresario', 'svengali', 'muscle'] as MgrStyle[])[r.int(0, 4)]),
      fam: pm?.fam?.length ? [...pm.fam] : [fam], a: pm ? pm.a.map((v) => Math.round(v * 0.7 + 15)) as RealMgr['a'] : [r.int(35, 75), r.int(40, 80), r.int(40, 80), r.int(35, 75), r.int(30, 70)],
      sex: r.chance(0.4) ? 'f' : 'm', rate: 0.15, cl: [], bio: T(l('Filho(a) de {p}: cresceu nas mesas de negociação e herdou contatos (e desafetos).', 'Child of {p}: grew up at negotiating tables and inherited contacts (and grudges).'), { p: parentName }),
    };
    const n7 = npc17(s);
    if (!n7.mg.some((x) => x.id === m.id)) n7.mg.push(m);
    mgrById[m.id] = m;
    car('manager');
    text = T(l('{k}, filho(a) de {p}, vira empresário(a) — e já começa com a agenda do pai/mãe.', '{k}, child of {p}, becomes a manager — starting with the parent\'s contact book.'), { k: kid.name, p: parentName });
  } else if (path === 'critic') {
    car('critic');
    text = T(l('{k}, filho(a) de {p}, estreia como crítico(a) de música.', '{k}, child of {p}, debuts as a music critic.'), { k: kid.name, p: parentName });
  } else if (path === 'exec') {
    const mk = cityById[city]?.market;
    const lb = Object.values(s.labels).filter((x) => x.active && (x.territories as string[]).includes(mk ?? '')).sort((a, b) => b.reputation - a.reputation)[r.int(0, 2)];
    car('anr', lb?.id);
    text = T(l('{k}, filho(a) de {p}, entra como executivo(a){b}.', '{k}, child of {p}, joins as an executive{b}.'), { k: kid.name, p: parentName, b: lb ? T(l(' na {n}', ' at {n}'), { n: lb.name }) : '' });
  } else {
    // equipe / A&R: candidato no mercado de profissionais (com a indicação do pai/mãe)
    const roleId = key.startsWith('s:') ? (s.player.staff.find((x) => `s:${x.id}` === key)?.role ?? 'anr') : ROLE_OF[key.slice(0, key.indexOf(':') + 1)] ?? 'anr';
    const pro = genStaff(s, r, roleId, clamp(Math.round(r.normal(52, 12)) + 6, 25, 90));
    pro.name = kid.name;
    s.professionals.push(pro);
    st.pr[pro.id] = kid.id;
    text = T(l('{k}, filho(a) de {p}, procura vaga como {r} — com carta de recomendação de casa.', '{k}, child of {p}, is looking for a job as {r} — with a family reference letter.'), { k: kid.name, p: parentName, r: roleId });
  }
  count(s, 6);
  say(s, text);
  emitFact(s, { kind: 'nepo', actors: [kid.id, key], place: city, severity: 18, visibility: 'rumor', tags: ['family29', 'career', `path:${path}`], text, src: 'family29' });
  return kid;
}

/** Contatos e reputação herdados: a opinião sobre você e as melhores relações do pai/mãe passam (pela metade) ao filho. */
function inheritContacts(s: GameState, key: string, kid: Person): void {
  const op = opinionOf(s, key);
  if (Math.abs(op) >= 6) opine(s, `p:${kid.id}`, Math.round(op / 2), l('o que ouviu de casa sobre você', 'what they heard about you at home'));
  if (key.startsWith('p:')) { const par = s.persons[key.slice(2)]; if (par) for (const [id, v] of Object.entries(par.rel).filter(([, v]) => v > 30).slice(0, 6)) relTouch(s, kid.id, id, Math.round(v / 2)); }
}

// nepotismo na sucessão de selo: quando ninguém da família do líder herda, um "executivo da casa" pode ser filho de gente da indústria
let SUCC_MINE29: typeof SUCC10.pick;
function wireSucc29(): void {
  if (SUCC10.pick && SUCC10.pick === SUCC_MINE29) return;
  const prev = SUCC10.pick;
  SUCC10.pick = SUCC_MINE29 = (s, lb, why) => {
    const out = prev?.(s, lb, why);
    if (out) return out;
    const st = fam29(s);
    const r = rng(s, `succ|${lb.id}|${s.week}`);
    const mk = cityById[lb.city]?.market;
    const c = Object.entries(st.ip).map(([pid, key]) => ({ p: s.persons[pid], key })).filter((x) => x.p?.alive && s.year - x.p.born >= 28 && cityById[w18(s).car[x.p.id]?.city ?? '']?.market === mk && w18(s).car[x.p.id]?.k === 'anr')[0];
    if (!c || !r.chance(0.3)) return undefined;
    const L0 = newLeader(s, r, lb, { name: c.p.name, born: c.p.born });
    L0.bg = 'heir';
    L0.note = T(l('Filho(a) de {p}: chegou ao comando pela porta que a família abriu.', 'Child of {p}: reached the top through the door the family opened.'), { p: per13(s, c.key)?.name ?? c.key });
    return { L: L0, how: 'internal' };
  };
}

// ---------------------------------------------------------------- 4. estrelas mirins

/** Registra um menor de idade com responsável (a família) e o fundo da época. */
export function addMinor(s: GameState, p: Person, a: Act | undefined, src: Src29, par?: Person, guardian?: string): Minor29 {
  const st = fam29(s);
  const ex = st.min[p.id];
  if (ex) return ex;
  const r = rng(s, `min|${p.id}`);
  const sur = p.name.split(' ').slice(1).join(' ') || p.name;
  const kinPar = par ?? kinOf15(s, p.id).find((k) => k.rel === 'parent' && k.p.alive)?.p;
  // pessoa real: o responsável é o pai/mãe documentado (mesmo fora do mundo do jogo) ou "a família" — nunca um nome inventado
  const doc = src === 'real' ? docParents29(p.name)[0] : undefined;
  const g = guardian ?? kinPar?.name ?? doc ?? (src === 'real' ? l('a família', 'the family').pt
    : T(l('{f} {s} (mãe/pai)', '{f} {s} (parent)'), { f: personName(r, langForCity(a?.city ?? s.config.homeCity, r)).split(' ')[0], s: sur }).pt);
  // pai/mãe-empresário(a): sorteado só para quem não é da história real no modo exato (lá vale o documentado)
  const pmOk = src !== 'real'; // criança real: nada de pai/mãe-empresário inventado (nem desvio de fundo) em nenhum modo
  const m: Minor29 = { g, ...(kinPar ? { gk: kinPar.id } : {}), tr: 0, ov: 0, src, y0: s.year, ...(pmOk && r.chance(src === 'kidgroup' || src === 'family' ? 0.45 : 0.25) ? { pm: 1 as const } : {}) };
  st.min[p.id] = m;
  if (src !== 'real' && src !== 'gen') count(s, 4); // estrelas mirins de fato (não o estreante de 17 anos comum)
  return m;
}

/** Fontes de estrelas mirins geradas por época: [fonte, peso por ano]. */
export function childSources29(y: number): [Src29, number][] {
  const out: [Src29, number][] = [];
  if (y >= 1920 && y < 1966) out.push(['prodigy', 0.35]);
  if (y >= 1930) out.push(['contest', y >= 1980 ? 0.3 : 0.2]);
  if (y >= 1950) out.push(['tv', y >= 1980 ? 0.45 : 0.25]);
  if (y >= 1960 && y <= 2005) out.push(['kidgroup', 0.55]);
  if (y >= 1992) out.push(['trainee', 0.6]);
  if (y >= 1970) out.push(['school', 0.15]);
  return out;
}
export const SRC29: Record<Src29, L> = {
  family: l('filho(a) de artista', 'artist\'s child'), kidgroup: l('grupo infantil/de irmãos', 'kid/sibling group'), tv: l('programa infantil de TV', 'kids\' TV show'),
  contest: l('concurso de calouros', 'talent contest'), trainee: l('trainee de agência de idols', 'idol agency trainee'), school: l('aluno(a) de escola de música', 'music school student'),
  prodigy: l('criança-prodígio', 'child prodigy'), real: l('estrela mirim real', 'real child star'), gen: l('menor de idade', 'minor'),
};

/** Nasce (no mundo) uma estrela mirim gerada, pela época — grupo de irmãos, boy band, idol, prodígio, calouro. */
export function spawnChildStar29(s: GameState, r: Rng, src: Src29): Act | undefined {
  const fams: FamilyId[] = src === 'trainee' ? ['asia_me'] : src === 'kidgroup' ? ['pop', 'rnb', 'latin'] : src === 'prodigy' ? ['pop', 'blues_jazz', 'country_folk', 'sacred'] : ['pop', 'rnb', 'latin', 'country_folk', 'brazil', 'europe'];
  const ok = (g: string) => !!genreById[g] && genreById[g].born <= s.year && fams.includes(familyOf(g) as FamilyId);
  const cities = CITIES.filter((c) => c.scenes.some(ok) && (src !== 'trainee' || c.id === 'seoul' || c.id === 'tokyo'));
  if (!cities.length) return undefined;
  const c = cities[r.int(0, cities.length - 1)];
  const genre = r.pick(c.scenes.filter(ok));
  const members = src === 'kidgroup' ? r.int(3, 5) : src === 'trainee' ? r.int(4, 6) : 1;
  const a = spawnProceduralAct(s, r, { city: c.id, genre, members, potential: r.int(62, 94), formedYear: s.year, fame: r.float(1, 6) });
  const sib = src === 'kidgroup' && r.chance(0.6);
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p);
  const sur = ms[0]?.name.split(' ').slice(1).join(' ');
  const g0 = T(l('{f} {s} (mãe/pai)', '{f} {s} (parent)'), { f: personName(r, langForCity(c.id, r)).split(' ')[0], s: sur || '' }).pt;
  const firsts = new Set<string>();
  ms.forEach((p, i) => {
    p.born = s.year - r.int(CHILD_MIN29, src === 'trainee' ? 16 : 15);
    p.potential = clamp(p.potential + r.int(4, 12), 30, 99); // prodígio: potencial alto, cresce rápido
    let first = p.name.split(' ')[0];
    for (let t = 0; t < 6 && firsts.has(first); t++) first = personName(r, langForCity(c.id, r)).split(' ')[0]; // irmãos não repetem o nome
    firsts.add(first);
    if (sib && sur && i > 0) p.name = `${first} ${sur}`;
    if (sib) p.origin = 'family';
    addMinor(s, p, a, src, undefined, sib ? g0 : undefined);
  });
  if (sib) { const kg = kin15(s); for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) kg.g.push([ms[i].id, ms[j].id, 'sibling']); }
  const t = T(src === 'kidgroup' ? (sib ? l('Grupo de irmãos mirins estreia em {c}: {a}.', 'A sibling kid group debuts in {c}: {a}.') : l('Boy/girl band mirim montada em {c}: {a}.', 'A kid boy/girl band is put together in {c}: {a}.'))
    : src === 'trainee' ? l('Agência de idols em {c} lança {a}: trainees de 12 a 16 anos.', 'An idol agency in {c} launches {a}: trainees aged 12 to 16.')
    : src === 'tv' ? l('Programa infantil de TV revela {a} em {c}.', 'A kids\' TV show discovers {a} in {c}.')
    : src === 'contest' ? l('Concurso de calouros em {c}: {a}, ainda criança, leva o troféu.', 'Talent contest in {c}: {a}, still a child, takes the trophy.')
    : src === 'school' ? l('Escola de música de {c} forma {a}, de 13 anos.', 'A music school in {c} turns out {a}, aged 13.')
    : l('Criança-prodígio em {c}: {a} lota teatros antes da adolescência.', 'Child prodigy in {c}: {a} fills theaters before their teens.'), { c: c.name, a: a.name });
  say(s, t);
  emitFact(s, { kind: 'child_star', actors: [a.id, ...a.members], place: c.id, severity: 22, visibility: 'public', tags: ['family29', `src:${src}`], text: t, src: 'family29' });
  return a;
}

function childStars(s: GameState, r: Rng): void {
  for (const [src, w] of childSources29(s.year)) if (r.chance(w / 12)) spawnChildStar29(s, r, src);
}

/** Registro anual: menores reais/gerados que já estão em atos ganham responsável; quem fez 18 recebe o fundo. */
function minorsYear(s: GameState, r: Rng): void {
  const st = fam29(s);
  for (const a of actsNow27(s)) {
    if (!live(a)) continue;
    for (const id of a.members) {
      const p = s.persons[id];
      if (!p?.alive || st.min[id] || s.year - p.born >= ADULT29) continue;
      addMinor(s, p, a, isReal29(s, p, a) ? 'real' : 'gen');
    }
  }
  for (const [pid, m] of Object.entries(st.min)) {
    const p = s.persons[pid];
    if (!p || !p.alive) { delete st.min[pid]; continue; }
    const age = s.year - p.born;
    const a = actOfP(s, pid);
    // prodígio: cresce rápido (até o potencial)
    if (age < ADULT29) for (const k of ['voice', 'instr', 'comp', 'stage', 'lyr'] as const) p.skills[k] = Math.min(p.potential, p.skills[k] + r.int(1, 4));
    // pai/mãe-empresário(a): conflito e, às vezes, desvio do fundo
    if (m.pm && age < ADULT29 && m.tr > 0 && r.chance(0.05)) {
      const v = m.tr;
      m.tr = 0;
      const g = m.gk ? s.persons[m.gk] : undefined;
      if (g) { relAdd(s, p.id, g.id, -45); }
      const t = T(l('{g}, responsável e empresário(a) de {p}, some com o fundo do menor ({v}).', '{g}, guardian and manager of {p}, vanishes with the minor\'s trust fund ({v}).'), { g: m.g, p: p.name, v: `$${Math.round(v / 100).toLocaleString('en-US')}` });
      say(s, t);
      emitFact(s, { kind: 'scandal', actors: [pid, ...(a ? [a.id] : [])], place: a?.city, severity: clamp(25 + (a?.fame ?? 0) / 2, 25, 75), visibility: 'public', tags: ['bad', 'money', 'family29', 'guardian'], text: t, src: 'family29' });
      if (a && mine(a)) notify(s, t, 'bad');
    } else if (m.pm && age < ADULT29 && r.chance(0.12)) {
      p.stress = clamp(p.stress + 8, 0, 100);
      if (m.gk) relAdd(s, p.id, m.gk, -10);
    }
    // NPC: selo que explora o menor (agenda pesada) — escândalo e reputação do selo
    // (só gente inventada: denúncia contra criança real e selo real seria afirmar um fato que não existe)
    if (a && !mine(a) && a.owner && s.labels[a.owner] && age < ADULT29 && m.src !== 'real' && !isReal29(s, p, a) && r.chance(0.035 * (s.year >= 1980 ? 1.3 : 0.7))) exploit(s, p, a, a.owner);
    // maioridade: recebe o fundo e passa a ex-estrela mirim
    if (age >= ADULT29) {
      if (m.tr > 0) {
        const t = T(l('{p} faz 18 anos e recebe o fundo de menor: {v}.', '{p} turns 18 and receives the minor\'s trust: {v}.'), { p: p.name, v: `$${Math.round(m.tr / 100).toLocaleString('en-US')}` });
        if (a) a.cash += m.tr;
        say(s, t);
        if (a && mine(a)) notify(s, t, 'good');
      }
      if (m.src !== 'real') st.ex[pid] = s.year;
      delete st.min[pid];
    }
  }
  // a maldição da estrela mirim (18–30): vício e colapso pesam mais em quem cresceu no palco
  for (const [pid, y] of Object.entries(st.ex)) {
    const p = s.persons[pid];
    if (!p?.alive || s.year - p.born > 30) { delete st.ex[pid]; continue; }
    const a = actOfP(s, pid);
    if (a && histLocked(s, a)) continue;
    if (p.health === 'ok' && r.chance(0.035 + (a?.fame ?? 0) / 2500 + p.stress / 3000)) {
      p.health = 'addiction'; p.stress = clamp(p.stress + 15, 0, 100);
      const t = T(l('A maldição da estrela mirim: {p}, que começou criança, afunda no vício.', 'The child-star curse: {p}, who started as a child, sinks into addiction.'), { p: p.name });
      say(s, t);
      emitFact(s, { kind: 'addiction', actors: [pid, ...(a ? [a.id] : [])], place: a?.city, severity: clamp(20 + (a?.fame ?? 0) / 2, 20, 70), visibility: (a?.fame ?? 0) >= 35 ? 'public' : 'rumor', tags: ['bad', 'family29', 'child_star'], text: t, src: 'family29' });
      if (a && mine(a)) notify(s, t, 'bad');
    }
    void y;
  }
}

/** Exploração de menor: escândalo, multa/reputação para quem explora (você ou um selo rival). */
function exploit(s: GameState, p: Person, a: Act, by: string): void {
  const st = fam29(s), m = st.min[p.id];
  if (m) { m.sc = (m.sc ?? 0) + 1; m.ov = 0; }
  count(s, 7);
  const lw = law29(a.city, s.year);
  const t = by === 'player'
    ? T(l('Denúncia: {p}, de {a}, só {g} anos, trabalha além do limite no seu selo{l}.', 'Exposé: {p} of {a}, only {g}, is overworked at your label{l}.'), { p: p.name, a: a.name, g: s.year - p.born, l: lw ? T(l(' — {n}', ' — {n}'), { n: lw.name }) : '' })
    : T(l('Denúncia: {b} explora {p} ({a}), de {g} anos — agenda de adulto para uma criança.', 'Exposé: {b} exploits {p} ({a}), aged {g} — an adult schedule for a child.'), { b: s.labels[by]?.name ?? by, p: p.name, a: a.name, g: s.year - p.born });
  say(s, t);
  p.stress = clamp(p.stress + 12, 0, 100);
  if (p.stress > 85 && p.health === 'ok') p.health = 'burnout';
  if (by === 'player') {
    s.player.reputation.artists = clamp(s.player.reputation.artists - 4, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    if (lw) post(s, `fam29:fine:${p.id}:${s.year}`, -money(s, 4000 + a.fame * 150), 'legal', `Multa por trabalho de menor (${p.name})`);
    scandal(s, a.id, 'conduct', clamp(30 + a.fame / 3, 30, 80), t, { person: p.id, place: a.city, tags: ['family29', 'child_exploit'] });
    notify(s, t, 'bad');
  } else {
    const lb = s.labels[by];
    if (lb) lb.reputation = Math.max(0, lb.reputation - 3);
    a.momentum = clamp(a.momentum - 5, 0, 100);
  }
  emitFact(s, { kind: 'child_exploit', actors: [p.id, a.id, by], place: a.city, severity: clamp(30 + a.fame / 2, 30, 85), visibility: 'public', tags: ['bad', 'family29', 'law'], text: t, src: 'family29' });
}

/** Mês dos menores do SEU elenco: fundo (Coogan), escola na estrada, sobrecarga → exploração. */
function minorsMonth(s: GameState): void {
  const st = fam29(s);
  const idx = monthIndex(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || !live(a)) continue;
    for (const pid of a.members) {
      const m = st.min[pid], p = s.persons[pid];
      if (!m || !p?.alive) continue;
      const lw = law29(a.city, s.year);
      // fundo (Coogan): a parte da lei sai dos ganhos do PRÓPRIO menor (não é custo do selo) e fica guardada até os 18
      if (lw && lw.trust > 0) m.tr += money(s, Math.round((40 + a.fame * 8) * lw.trust / 0.15));
      const td = tourDaysInMonth(s, a.id, idx);
      if (td > 0) post(s, `fam29:tutor:${pid}`, -money(s, 300), 'artist_dev', `Tutor na estrada (${p.name})`);
      const load = (s.loadNow[a.id] ?? 0) + Math.round(((td + 4) / 28) * 100 * (td ? 1 : 0));
      const teen = s.year - p.born >= 16;
      const over = load > (lw ? (teen ? 85 : 70) : 90) || td > (lw ? (teen ? 16 : 10) : 18);
      m.ov = over ? m.ov + 1 : Math.max(0, m.ov - 1);
      if (over) { p.stress = clamp(p.stress + 5, 0, 100); p.fatigue = clamp(p.fatigue + 6, 0, 100); }
      if (m.ov >= 3 && rng(s, `ex|${pid}|${s.week}`).chance(s.year >= 1975 ? 0.6 : 0.35)) exploit(s, p, a, 'player');
    }
  }
}

// carga extra do menor na agenda: escola e limite de horas (o dobro das horas de trabalho conta, pela lei da época)
function load29(s: GameState, pid: string, idx: number, parts: { label: L; load: number }[]): { label: L; load: number } | null {
  const m = (s.x4 as unknown as { family29?: Fam29St }).family29?.min[pid];
  if (!m) return null;
  const p = s.persons[pid];
  if (!p || s.year - p.born >= ADULT29) return null;
  const a = actsOfPerson17(s, pid)[0];
  const lw = law29(a?.city ?? s.config.homeCity, s.year);
  const work = parts.reduce((t, x) => t + x.load, 0);
  // 16–17 anos: ensino médio e regras mais frouxas (meio período, sem o teto de horas inteiro)
  const teen = s.year - p.born >= 16;
  const school = teen ? (lw ? 10 : 5) : lw ? 25 : 15;
  const extra = lw ? Math.round(work * lw.hours * (teen ? 0.3 : 1)) : 0;
  void idx;
  return { label: lw ? T(l('Escola e limite de horas (menor de idade · {n})', 'School and hour limit (minor · {n})'), { n: lw.name }) : l('Escola (menor de idade)', 'School (minor)'), load: school + extra };
}

// ---------------------------------------------------------------- 5. nepotismo e menores nas propostas; apelo

registerOfferMod('family29', (s, act) => {
  const st = (s.x4 as unknown as { family29?: Fam29St }).family29;
  // antes do 1º mês (mundo ainda sendo montado) não consulta o grafo do kin15: o cache dele é por mês e ficaria velho
  if (!st?.seed) return null;
  let d = 0;
  const why: L[] = [];
  const minors = act.members.filter((id) => st.min[id]);
  if (minors.length) {
    const g = st.min[minors[0]];
    const kid = minors.some((id) => s.year - (s.persons[id]?.born ?? 0) < 16);
    d -= kid ? 0.04 : 0.02; why.push(T(l('menor de idade: o responsável ({g}) exige escola, fundo e limite de turnê', 'a minor: the guardian ({g}) demands schooling, a trust and tour limits'), { g: g.g }));
    if (minors.some((id) => st.min[id].pm)) { d -= 0.03; why.push(l('pai/mãe-empresário(a) quer a parte dele(a)', 'the parent-manager wants their cut')); }
  }
  // nepotismo: pai/mãe no seu elenco (ou que gosta de você) abre a porta; sobrenome famoso de fora encarece
  for (const id of act.members) {
    const kp = kinOf15(s, id).filter((k) => k.rel === 'parent');
    const mineP = kp.some((k) => actsOfPerson17(s, k.id).some((x) => mine(x)));
    const ip = st.ip[id];
    if (mineP || (ip && opinionOf(s, ip) >= 20)) { d += 0.05; why.push(l('a família conhece você: porta aberta', 'the family knows you: an open door')); break; }
    const famous = kp.some((k) => actsOfPerson17(s, k.id).some((x) => x.fame >= 55));
    if (famous) { d -= 0.02; why.push(l('sobrenome famoso: sabem o próprio valor', 'a famous surname: they know their worth')); break; }
  }
  if (!d) return null;
  return { delta: d, reason: l(`Família: ${why.map((x) => x.pt).join('; ')}`, `Family: ${why.map((x) => x.en).join('; ')}`) };
});

const AP29 = new WeakMap<GameState, { k: number; m: Map<string, number> }>();
/** Fator de apelo da família de um ato: sobrenome famoso abre portas no começo; depois, a comparação pesa. */
export function nepoFactor29(s: GameState, a: Act): number {
  let c = AP29.get(s);
  if (!c || c.k !== mIdx(s)) AP29.set(s, (c = { k: mIdx(s), m: new Map() }));
  const hit = c.m.get(a.id);
  if (hit !== undefined) return hit;
  let f = 1;
  const st = fam29(s);
  for (const id of a.members) {
    const pf = Math.max(0, ...kinOf15(s, id).filter((k) => k.rel === 'parent').map((k) => Math.max(0, ...actsOfPerson17(s, k.id).map((x) => x.fame))));
    const ind = st.ip[id] ? 35 : 0;
    const par = Math.max(pf, ind);
    if (par < 30) continue;
    const yrs = s.year - a.debutYear;
    f = yrs <= 3 ? 1.04 : a.fame < par * 0.4 ? 0.97 : 1;
    break;
  }
  c.m.set(a.id, f);
  return f;
}
registerMod('appeal', 'family29', (s, v, ctx) => {
  const a = ctx.act ?? (ctx.release ? s.acts[ctx.release.actId] : undefined);
  if (!a || !(s.x4 as unknown as { family29?: Fam29St }).family29?.seed) return null; // mundo montado (ver offer mod)
  const f = nepoFactor29(s, a);
  if (f === 1) return null;
  return { value: v * f, label: f > 1 ? l('Sobrenome famoso abre portas', 'A famous surname opens doors') : l('Comparação com o pai/mãe famoso(a)', 'Compared with the famous parent') };
});

// ---------------------------------------------------------------- 6. fatos → consumidores (imprensa, cenas, efeitos)

const nm = (s: GameState, id: string) => s.persons[id]?.name ?? s.acts[id]?.name ?? id;
onFact('custody', (s, f) => {
  headline19(s, f.text, 2);
  for (const id of f.actors) { const p = s.persons[id]; if (p) p.stress = clamp(p.stress + 6, 0, 100); }
  sceneFor(s, f, 'divorce29');
}, 'family29:custody');
onFact('child_star', (s, f) => {
  if (f.severity >= 20) headline19(s, f.text, 1);
  // a novidade chega ao radar de quem procura talento na cidade (sinal fraco)
  const a = s.acts[f.actors[0]];
  if (a && f.place === s.config.homeCity && !s.knowledge[a.id]) s.knowledge[a.id] = { actId: a.id, degree: 1, stage: 'signal', bias: 0, updatedWeek: s.week, source: 'family' };
}, 'family29:child_star');
onFact('child_exploit', (s, f) => {
  headline19(s, f.text, 3);
  const a = f.actors.map((x) => s.acts[x]).find(Boolean);
  if (a) a.fans.casual = Math.max(0, Math.round(a.fans.casual * 0.97));
}, 'family29:exploit');
onFact('nepo', (s, f) => {
  // carreira de filho da indústria: a coluna social comenta; quem é seu contato conta para você
  if (f.actors[1] && opinionOf(s, f.actors[1]) >= 25) notify(s, f.text, 'info');
}, 'family29:nepo');
onFact('couple_tour', (s, f) => { headline19(s, f.text, 2); sceneFor(s, f, 'wedding29'); }, 'family29:tour');
onFact('family_debut', (s, f) => {
  const pf = Number(f.data?.pf ?? 0);
  if (pf >= 40) headline19(s, f.text, 2);
  // backlash do "filho de famoso": parte do público torce o nariz
  const a = s.acts[f.actors[1]];
  if (a && pf >= 50 && rng(s, `nb|${a.id}`).chance(0.4)) {
    a.fans.casual = Math.max(0, Math.round(a.fans.casual * 0.9));
    const t = T(l('"Nepo baby": {a} estreia sob vaias nas redes — o sobrenome pesa contra.', '"Nepo baby": {a} debuts to jeers online — the surname cuts both ways.'), { a: a.name });
    headline19(s, t, 2);
    say(s, t);
  }
  sceneFor(s, f, 'debut29');
}, 'family29:debut');
onFact('marriage', (s, f) => { if (f.src === 'family29') sceneFor(s, f, 'wedding29'); }, 'family29:marriage');
onFact('birth', (s, f) => { if (f.src === 'family29') sceneFor(s, f, 'birth29'); }, 'family29:birth');
onFact('breakup', (s, f) => { if (f.src === 'family29' && f.tags.includes('divorce')) sceneFor(s, f, 'divorce29'); }, 'family29:breakup');

/** Cena interativa (scene17) quando é gente do SEU elenco. */
function sceneFor(s: GameState, f: Fact, def: string): void {
  if (!DEFS17[def]) return;
  const m = mineOf17(s, f.actors.filter((x) => x !== 'player'));
  if (!m || (m.pid && s.persons[m.pid]?.isPlayer)) return;
  const pid = f.actors.find((x) => s.persons[x] && actsOfPerson17(s, x).some((a) => a.id === m.act)) ?? m.pid;
  const other = f.actors.find((x) => s.persons[x] && x !== pid);
  queue17(s, def, ctx17(s, { act: m.act, pid, who: other ? nm(s, other) : fam29(s).f[pid ?? '']?.[0] || undefined, city: f.place, fact: f.id }));
}

/** Cenas interativas da família no seu elenco (o motor do scene17: casamento, bebê, divórcio, estreia de família). */
function wireScenes29(): void {
def17({ id: 'wedding29', name: l('Casamento no elenco', 'A wedding on the roster'), icon: 'heart', major: false, cool: 3,
  place: () => 'country_house',
  title: (s, c) => T(l('{p} se casa', '{p} gets married'), { p: c.pid ? nm(s, c.pid) : '?' }),
  text: (s, c) => T(l('O convite chega com o nome do selo escrito à mão. {w} sorri nas fotos de prova.', 'The invitation arrives with the label\'s name handwritten. {w} smiles in the test shots.'), { w: c.who ?? '' }),
  stages: [{ q: l('Como o selo participa', 'How the label takes part'), opts: [
    { id: 'gift', label: l('Ir e mandar um presente', 'Attend and send a gift'), hint: l('Confiança e moral; custa o presente.', 'Trust and morale; costs the gift.'),
      fx: (s, c, _ok, e) => { e.cash(-1500, 'wedding gift').trust(6).morale(4); if (c.pid) opine(s, `p:${c.pid}`, 6, l('foi ao meu casamento', 'came to my wedding')); return l('Você dança uma música, entrega o presente e sai antes do bolo. Ninguém esquece.', 'You dance one song, hand over the gift and leave before the cake. Nobody forgets.'); } },
    { id: 'exclusive', label: l('Fechar a exclusiva com uma revista', 'Sell the exclusive to a magazine'), hint: l('Fama e caixa; o casal pode achar invasivo.', 'Fame and cash; the couple may find it invasive.'),
      odds: (s, c) => ({ p: clamp(0.4 + c.ft * 0.08, 0.1, 0.9), why: [l('Casais famosos toleram mais os flashes.', 'Famous couples tolerate flashes better.')] }),
      fx: (s, c, ok, e) => { e.cash(2500 + c.ft * 2500, 'wedding exclusive').fame(1); if (!ok) { e.trust(-6); return l('A capa vende, mas o casal se sente vendido.', 'The cover sells, but the couple feels sold.'); } e.trust(2); return l('Capa dupla, aprovada pelo casal.', 'A double cover, approved by the couple.'); } },
    { id: 'quiet', label: l('Pedir discrição à imprensa', 'Ask the press for discretion'), hint: l('Paz; nada de holofote.', 'Peace; no spotlight.'),
      fx: (s, c, _ok, e) => { e.stress(-6, l('casamento em paz', 'a peaceful wedding')).rep('artists', 1); return l('Nenhuma foto vaza. O casal agradece em bilhete.', 'No photo leaks. The couple thanks you in a note.'); } },
  ] }] });

def17({ id: 'birth29', name: l('Bebê no elenco', 'A baby on the roster'), icon: 'heart', major: false, cool: 3,
  place: () => 'clinic',
  title: (s, c) => T(l('Nasce o filho de {p}', '{p}\'s baby is born'), { p: c.pid ? nm(s, c.pid) : '?' }),
  text: () => l('A agenda de lançamentos encontra a agenda de fraldas.', 'The release calendar meets the diaper calendar.'),
  stages: [{ q: l('O que o selo faz', 'What the label does'), opts: [
    { id: 'leave', label: l('Licença de dois meses', 'Two months of leave'), hint: l('Menos estresse; o ato perde um pouco de embalo.', 'Less stress; the act loses a little momentum.'),
      fx: (s, c, _ok, e) => { e.stress(-12, l('licença parental', 'parental leave'), c.pid ?? 'act').mom(-4).trust(5); return l('O telefone fica mudo por dois meses. Volta descansado(a).', 'The phone goes quiet for two months. They come back rested.'); } },
    { id: 'lullaby', label: l('Propor um disco de canções de ninar', 'Pitch a lullaby record'), hint: l('Inspiração; parte do público acha fofo, parte acha oportunismo.', 'Inspiration; some fans find it sweet, some opportunistic.'),
      fx: (s, c, _ok, e) => { e.insp(10).fans(60, 300); return l('A primeira demo é gravada com o bebê dormindo no estúdio.', 'The first demo is cut with the baby asleep in the studio.'); } },
    { id: 'tour', label: l('Manter a turnê marcada', 'Keep the booked tour'), hint: l('Caixa e embalo; o vínculo com o bebê sofre.', 'Cash and momentum; the bond with the baby suffers.'),
      fx: (s, c, _ok, e) => { e.mom(4).stress(8, l('longe do bebê', 'away from the baby'), c.pid ?? 'act'); return l('Vídeo-chamada do hotel às 3h da manhã. A turnê segue.', 'A video call from the hotel at 3am. The tour goes on.'); } },
  ] }] });

def17({ id: 'divorce29', name: l('Divórcio no elenco', 'A divorce on the roster'), icon: 'broken-heart', major: false, cool: 3,
  place: () => 'court',
  title: (s, c) => T(l('O divórcio de {p}', '{p}\'s divorce'), { p: c.pid ? nm(s, c.pid) : '?' }),
  text: (s, c) => T(l('Advogados dos dois lados, e {w} dando entrevista sem avisar.', 'Lawyers on both sides, and {w} giving interviews without warning.'), { w: c.who ?? '' }),
  stages: [{ q: l('Como lidar', 'How to handle it'), opts: [
    { id: 'shield', label: l('Blindar o artista (assessoria e advogado)', 'Shield the artist (PR and a lawyer)'), hint: l('Custa; menos estresse e manchetes.', 'Costs; less stress and fewer headlines.'),
      fx: (s, c, _ok, e) => { e.cash(-3000, 'divorce lawyer').stress(-8, l('blindado(a) pelo selo', 'shielded by the label'), c.pid ?? 'act').trust(5); return l('A nota oficial é curta. O resto é silêncio.', 'The official statement is short. The rest is silence.'); } },
    { id: 'album', label: l('Transformar a dor em disco', 'Turn the pain into a record'), hint: l('Inspiração enorme; expõe a vida privada.', 'Huge inspiration; exposes private life.'),
      fx: (s, c, _ok, e) => { e.insp(16).fame(0.8); e.news(T(l('{p} vai gravar o "disco do divórcio".', '{p} will record the "divorce album".'), { p: c.pid ? nm(s, c.pid) : '?' }), 35, ['family29']); return l('As letras saem em uma semana. Algumas são cruéis.', 'The lyrics come out in a week. Some are cruel.'); } },
    { id: 'pause', label: l('Dar uma pausa ao ato', 'Give the act a break'), hint: l('Moral volta; embalo cai.', 'Morale recovers; momentum drops.'),
      fx: (s, c, _ok, e) => { e.morale(6).mom(-6); return l('Três meses sem compromisso. A banda respira.', 'Three months with no commitments. The band breathes.'); } },
  ] }] });

def17({ id: 'debut29', name: l('Estreia de família', 'A family debut'), icon: 'star', major: false, cool: 4,
  place: () => 'street',
  title: (s, c) => T(l('A estreia de {p}', '{p}\'s debut'), { p: c.pid ? nm(s, c.pid) : '?' }),
  text: () => l('Na coletiva, a primeira pergunta é sobre o pai/mãe. A segunda também.', 'At the press conference, the first question is about the parent. So is the second.'),
  stages: [{ q: l('Como apresentar', 'How to present them'), opts: [
    { id: 'surname', label: l('Usar o sobrenome no marketing', 'Lean on the surname in marketing'), hint: l('Fama rápida; risco de "nepo baby".', 'Quick fame; "nepo baby" risk.'),
      odds: () => ({ p: 0.55, why: [l('Metade do público adora uma dinastia; a outra metade odeia.', 'Half the audience loves a dynasty; the other half hates it.')] }),
      fx: (s, c, ok, e) => { e.fame(1.2); if (!ok) { e.haters(600); return l('Os memes de "nepo baby" chegam antes das resenhas.', 'The "nepo baby" memes arrive before the reviews.'); } e.fans(80, 600); return l('O sobrenome vira manchete — e o disco, assunto.', 'The surname makes headlines — and the record, conversation.'); } },
    { id: 'own', label: l('Apresentar só pelo próprio nome', 'Present them on their own name only'), hint: l('Respeito artístico; começo mais lento.', 'Artistic respect; slower start.'),
      fx: (s, c, _ok, e) => { e.rep('artistic', 1).insp(6).trust(4); return l('"Me julguem pelo som", diz na primeira entrevista. Os críticos anotam.', '"Judge me by the sound," they say in the first interview. The critics take note.'); } },
  ] }] });
}

// ---------------------------------------------------------------- 7. ações sobre a pessoa (menu de contexto e ficha)

const pidOfKey = (key: string) => (key.startsWith('p:') ? key.slice(2) : '');
function wireActions29(): void {
registerPersonAction({
  id: 'family29.view', label: l('Ver família', 'View family'), group: 'social', icon: 'fans',
  desc: l('Abre a aba Família da ficha: par, filhos, pais, irmãos e a árvore.', 'Opens the Family tab: partner, kids, parents, siblings and the tree.'),
  run: (s, key) => ({ ok: true, text: l('Família', 'Family'), ui: 'family', uiArg: key }),
});
registerPersonAction({
  id: 'family29.gift', label: l('Presente de casamento', 'Wedding gift'), group: 'social', icon: 'heart', cooldown: 52,
  desc: l('Casou há pouco: um presente da casa aproxima (e fica no livro de favores).', 'Recently married: a gift from the house brings you closer (and goes in the favor book).'),
  cost: () => ({ usd: 600 }),
  visible: (s, key) => { const id = pidOfKey(key); const F = id ? fam29(s).f[id] : undefined; const F0 = s.families[key]; return (!!F && F[3] === 2 && s.year - F[2] <= 1) || (!!F0?.partner && !F0.separated && (((s.x4 as unknown as { people16?: { L: Record<string, { mar?: number }> } }).people16?.L[key]?.mar ?? -9) >= s.year - 1)); },
  run: (s, key) => {
    opine(s, key, 8, l('mandou presente de casamento', 'sent a wedding gift'));
    grantHold(s, { holder: 'player', target: key, kind: 'favor', strength: 25, months: 24, src: 'family29', ref: 'family29', quiet: true, text: l('Lembra do presente de casamento', 'Remembers the wedding gift') });
    return { ok: true, text: l('O presente chega com um cartão do selo. Agradecem com uma foto do casal (e ficam te devendo uma gentileza).', 'The gift arrives with a card from the label. They reply with a photo of the couple (and owe you a kindness).') };
  },
});
registerPersonAction({
  id: 'family29.condole', label: l('Mandar condolências', 'Send condolences'), group: 'care', icon: 'broken-heart', cooldown: 52,
  desc: l('Perdeu alguém próximo neste ano: flores e uma carta.', 'Lost someone close this year: flowers and a letter.'),
  cost: () => ({ usd: 150 }),
  visible: (s, key) => { const id = pidOfKey(key); return !!id && kinOf15(s, id).some((k) => !k.p.alive && (k.p.died ?? 0) >= s.year - 1 && ['parent', 'child', 'spouse', 'sibling'].includes(k.rel)); },
  run: (s, key) => { opine(s, key, 6, l('mandou condolências no luto', 'sent condolences in mourning')); const p = s.persons[pidOfKey(key)]; if (p) p.morale = clamp(p.morale + 3, 0, 100); return { ok: true, text: l('Flores e uma carta à mão. A resposta chega semanas depois, curta e sincera.', 'Flowers and a handwritten letter. The reply arrives weeks later, short and sincere.') }; },
});
}

// ---------------------------------------------------------------- 8. Hall da Fama: dinastias

function dynastiesHof(s: GameState): void {
  const st = fam29(s);
  for (const h of s.hallOfFame) {
    if (st.hof.includes(h.actId)) continue;
    st.hof.push(h.actId);
    const a = s.acts[h.actId];
    if (!a) continue;
    for (const id of a.members) for (const k of kinOf15(s, id)) {
      if (!['parent', 'child', 'sibling', 'spouse'].includes(k.rel)) continue;
      const other = s.hallOfFame.find((x) => x.actId !== a.id && s.acts[x.actId]?.members.includes(k.id));
      if (!other) continue;
      // k.rel = o que o outro é desta pessoa (pai/mãe, filho, irmão, cônjuge)
      const t = T(l('Dinastia no Hall dos Ecos: {p} ({a}) entra onde {q} ({b}), {r}, já está.', 'A dynasty in the Hall of Echoes: {p} ({a}) joins {q} ({b}), {r}, already inducted.'), { p: s.persons[id].name, a: a.name, q: k.p.name, b: other.name, r: REL15[k.rel] });
      remember(s, 'dynasty', t, { actId: a.id, important: true });
      say(s, t);
      a.momentum = clamp(a.momentum + 5, 0, 100);
      if (mine(a) || mine(s.acts[other.actId])) s.player.legacy.cultural = (s.player.legacy.cultural ?? 0) + 2;
      return;
    }
  }
}

// ---------------------------------------------------------------- API de eventos (testes, cenas e ferramentas)

/** Casa a pessoa com outra do mundo (`qid`: casal célebre) ou com o par de fora que já tem. */
export function marry29(s: GameState, pid: string, qid?: string): boolean {
  const p = s.persons[pid], a = actOfP(s, pid), q = qid ? s.persons[qid] : undefined;
  if (!p || !a || (qid && !q)) return false;
  const F = setF(s, pid);
  if (q) { const G = setF(s, q.id); F[0] = q.name; F[1] = q.id; G[0] = p.name; G[1] = p.id; G[3] = 1; }
  else if (!F[0]) { F[0] = personName(rng(s, `mate|${pid}`), langForCity(a.city, rng(s, `mate|${pid}`))); F[1] = ''; }
  F[3] = 1;
  marry(s, p, a, F, q);
  return true;
}
/** Separa/divorcia a pessoa do par atual (com os efeitos de sempre: banda, guarda, bens). */
export function divorce29(s: GameState, pid: string): boolean {
  const p = s.persons[pid], a = actOfP(s, pid), F = fam29(s).f[pid];
  if (!p || !a || !F || (F[3] !== 1 && F[3] !== 2)) return false;
  separate(s, rng(s, `div|${pid}|${s.week}`), p, a, F, F[1] ? s.persons[F[1]] : undefined);
  return true;
}
/** Nasce um filho da pessoa (com o par atual). */
export function birth29(s: GameState, pid: string): Kid29 | undefined {
  const p = s.persons[pid], a = actOfP(s, pid);
  if (!p || !a) return undefined;
  const F = setF(s, pid);
  birth(s, rng(s, `kid|${pid}|${s.week}|${fam29(s).k.length}`), p, a, F, F[1] ? s.persons[F[1]] : undefined);
  return fam29(s).k[fam29(s).k.length - 1];
}
/** Estreia agora um filho leve (sem esperar o sorteio do mês). */
export function debutNow29(s: GameState, kidId: string, band = false): Person | undefined {
  const k = fam29(s).k.find((x) => x[0] === kidId);
  const par = k ? s.persons[k[1]] : undefined;
  if (!k || !par || k[6]) return undefined;
  hooks29();
  const pa = actOfP(s, par.id);
  PENDING = k;
  const kid = debutKid15(s, rng(s, `deb|${kidId}`), { par, pa, name: k[3], born: k[4], band: band && pa && pa.members.includes(par.id) ? pa : undefined });
  PENDING = null;
  return kid;
}
/** Um passo de vida (k meses acumulados) para uma pessoa — testes. */
export function lifeTick29(s: GameState, pid: string, k = 12, seedTag = 'tick'): void {
  const p = s.persons[pid], a = actOfP(s, pid);
  if (!p || !a) return;
  lifeOf(s, rng(s, `${seedTag}|${pid}|${s.week}`), p, a, pool29(s), k);
}
export const minorsMonth29 = (s: GameState): void => minorsMonth(s);
export const minorsYear29 = (s: GameState): void => minorsYear(s, rng(s, `y|${s.year}`));
export const exploit29 = (s: GameState, pid: string, by: string): void => { const p = s.persons[pid], a = actOfP(s, pid); if (p && a) exploit(s, p, a, by); };

// ---------------------------------------------------------------- semeadura (o mundo já começa com famílias)

/** Uma vez por partida: artistas NPC GERADOS mais velhos já têm casamento e filhos (alguns na idade de estrear) e gente
 *  GERADA da indústria (empresários da praça, líderes de selo não reais) já tem filhos crescidos. Pessoas reais não
 *  ganham família antes do início — em nenhum modo (só a documentada). */
function seed29(s: GameState): void {
  const st = fam29(s);
  st.seed = 1;
  const r = rng(s, 'seed');
  const y0 = s.year;
  for (const { pid, a } of pool29(s)) {
    const p = s.persons[pid];
    const age = y0 - p.born;
    if (age < 34 || isReal29(s, p, a) || st.f[pid] || !r.chance(0.42)) continue;
    const F = setF(s, pid);
    F[0] = personName(r, langForCity(a.city, r)); F[1] = ''; F[2] = y0 - r.int(1, Math.max(2, age - 24)); F[3] = 2; F[4] = r.int(2000, 20000 + a.fame * 900);
    const n = r.int(0, 3);
    for (let i = 0; i < n; i++) {
      const born = Math.min(y0 - 1, p.born + r.int(22, 40));
      if (born <= p.born + 18) continue;
      const musical = Math.round(clamp((p.potential + r.int(25, 60)) / 2 + r.normal(8, 15), 3, 99));
      const kage = y0 - born;
      let debut = 0;
      if (musical >= 55 && kage <= 24 && r.chance(0.5 + (musical - 55) / 90)) debut = Math.max(y0 + r.int(0, 2), born + (musical >= 72 && r.chance(childEra29(born + 13) * 0.5) ? r.int(CHILD_MIN29, 16) : r.int(17, 24)));
      const sur = p.name.split(' ').slice(1).join(' ');
      const first = personName(r, langForCity(a.city, r)).split(' ')[0];
      st.k.push([`f29s${hashString(`${s.config.seed}|${pid}|${i}`).toString(36)}`, pid, '', sur ? `${first} ${sur}` : first, born, musical, '', debut]);
    }
  }
  // gente gerada da indústria: filhos crescidos (os reais seguem só o documentado)
  const keys: [string, number][] = [];
  for (const m of genMgrs16(s)) if (m.from <= y0 && m.to >= y0 && m.born) keys.push([`e:${m.id}`, m.born]);
  for (const L0 of Object.values(leaders(s)?.L ?? {})) if (L0.st === 'active' && !L0.real) keys.push([`l:${L0.id}`, L0.born]);
  for (const [key, born] of keys) {
    const age = y0 - born;
    if (age < 42 || !r.chance(0.35)) continue;
    const F0 = ensureFamily(s, key);
    if (F0.kids.length) continue;
    const P = per13(s, key);
    const city = P?.city ?? s.config.homeCity;
    const sur = (P?.name ?? '').split(' ').slice(1).join(' '); // o filho leva o sobrenome do pai/mãe
    const n = r.int(1, 2);
    for (let i = 0; i < n; i++) {
      const kb = Math.min(y0 - 14, born + r.int(24, 38));
      if (kb <= born + 18) continue;
      const nm0 = personName(r, langForCity(city, r));
      F0.kids.push({ id: `f29i${hashString(`${s.config.seed}|${key}|${i}`).toString(36)}`, name: sur ? `${nm0.split(' ')[0]} ${sur}` : nm0, born: kb, bond: 60, musical: r.int(10, 90) });
    }
  }
}

// ---------------------------------------------------------------- tick

export function familyMonth29(s: GameState): void {
  hooks29();
  const st = fam29(s);
  if (!st.seed) seed29(s);
  const r = rng(s, `m|${s.year}|${s.month}`);
  const pool = pool29(s);
  if (pool.length) {
    const k = Math.max(1, Math.min(48, Math.ceil(pool.length / CAP29)));
    st.cur %= pool.length;
    for (let i = 0; i < Math.min(CAP29, pool.length); i++) {
      const x = pool[(st.cur + i) % pool.length];
      const p = s.persons[x.pid];
      if (p) lifeOf(s, r, p, x.a, pool, k);
    }
    st.cur = (st.cur + CAP29) % pool.length;
  }
  debuts(s, r);
  inheritance(s);
  minorsMonth(s);
  childStars(s, r);
  if (s.month === 6) couples(s, r);
  if (s.hallOfFame.length !== st.hof.length) dynastiesHof(s);
}
export function familyYear29(s: GameState): void {
  const r = rng(s, `y|${s.year}`);
  industryKids(s);
  minorsYear(s, r);
}
registerSimHook('month', 'family29', (s) => familyMonth29(s));
registerSimHook('year', 'family29', (s) => familyYear29(s));
hooks29(); // ordem normal (sys/index): tudo já carregado; num ciclo de imports o resto liga no 'newgame' / no mês
