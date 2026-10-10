// Laços duradouros (rodada 9): duplas de composição, casais artísticos, supergrupos/coletivos, alianças
// pontuais, cruzamentos de gêneros e padrinho/protegido — entre pessoas de bandas e selos diferentes.
// Cada laço tem força, história e fim (briga, desgaste, morte, prisão, divergência criativa, dinheiro)
// com epílogo (reconciliação, tributo póstumo, processo). NPCs formam laços sozinhos a partir dos laços
// de social8; o jogador propõe para os próprios atos e recebe convites. Admiração: cada pessoa tem
// opinião sobre o trabalho dos outros (qualidade dos discos, afinidade de gênero, laços).
// No modo histórico com nomes reais, os laços famosos entram no ano certo quando os dois existem.

import { clamp, hashString, type Rng } from '../../core/rng';
import { familyOf, genreById, l, type FamilyId, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { compat } from '../beliefs';
import { makeAct } from '../people';
import type { Act, GameState } from '../types';
import { fmtL, nextId, notify, playerActs, post, remember, rngOf } from '../util';
import { scandal } from '../scandal17';
import { fashionOf, registerMovementGenres } from '../culture';
import { MSG_HANDLERS } from './people/inbox';
import { addMsg, P } from './people/state';
import { clearance, crossAudience } from './feats8';
import { actOfPerson, bump, tieOf, tiesOf, type TieKind } from './social8';
import { soul } from './soul9';
import { actsTouched17 } from '../actidx17';

export type BondKind = 'duo' | 'couple' | 'super' | 'ally' | 'cross' | 'patron';
export type BondEnd = 'fight' | 'wear' | 'death' | 'prison' | 'divergence' | 'money' | 'done';
export type BondEpi = 'reconcile' | 'tribute' | 'lawsuit';
export interface Bond {
  id: string;
  k: BondKind;
  /** pessoas (2..8); no padrinho, p[0] é o padrinho */
  p: string[];
  /** atos de origem de cada pessoa */
  a: string[];
  name?: string;
  /** ato criado (supergrupo/coletivo) */
  act?: string;
  y: number;
  /** força 0..100 */
  str: number;
  works: number;
  /** ano em que acaba naturalmente (supergrupo/aliança) */
  term?: number;
  hist: { y: number; t: L }[];
  end?: { y: number; c: BondEnd; ep?: BondEpi; epY?: number };
  real?: 1;
  pl?: 1;
  /** subgênero híbrido criado (cruzamento) */
  hybrid?: string;
}
export interface BondsState { list: Bond[]; seeded: string[]; adm: Record<string, number>; news: { y: number; t: L }[] }

declare module '../ext4' { interface Ext4 { bonds9: BondsState } }
const init = (): BondsState => ({ list: [], seeded: [], adm: {}, news: [] });
registerExt4('bonds9', init);
export const bonds = (s: GameState): BondsState => {
  const x = s.x4 as unknown as { bonds9?: BondsState };
  x.bonds9 ??= init();
  x.bonds9.adm ??= {};
  x.bonds9.seeded ??= [];
  return x.bonds9;
};

const MAX_ACTIVE = 120;
const MAX_ENDED = 80;

export const BOND_NAME: Record<BondKind, L> = {
  duo: l('Dupla de composição', 'Songwriting duo'), couple: l('Casal artístico', 'Power couple'), super: l('Supergrupo/coletivo', 'Supergroup/collective'),
  ally: l('Aliança pontual', 'One-off alliance'), cross: l('Cruzamento de gêneros', 'Genre crossover'), patron: l('Padrinho e protegido', 'Patron and protégé'),
};
export const END_NAME: Record<BondEnd, L> = {
  fight: l('briga', 'fight'), wear: l('desgaste', 'wear and tear'), death: l('morte', 'death'), prison: l('prisão', 'prison'),
  divergence: l('divergência criativa', 'creative divergence'), money: l('disputa por dinheiro', 'money dispute'), done: l('projeto concluído', 'project completed'),
};
export const EPI_NAME: Record<BondEpi, L> = { reconcile: l('reconciliação', 'reconciliation'), tribute: l('tributo póstumo', 'posthumous tribute'), lawsuit: l('processo na justiça', 'lawsuit') };

// ---------------------------------------------------------------- consultas

const live = (a?: Act) => !!a && (a.status === 'active' || a.status === 'emerging') && !a.deceased && a.members.length > 0;
const leadOf = (a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);
const pname = (s: GameState, id: string) => s.persons[id]?.name ?? '?';
export const activeBonds = (s: GameState): Bond[] => bonds(s).list.filter((b) => !b.end);
export const bondsOfPerson = (s: GameState, pid: string): Bond[] => bonds(s).list.filter((b) => b.p.includes(pid));
export function bondsOfAct(s: GameState, act: Act): Bond[] {
  const ms = new Set(act.members);
  return bonds(s).list.filter((b) => b.act === act.id || b.a.includes(act.id) || b.p.some((p) => ms.has(p)));
}
export function bondTitle(s: GameState, b: Bond): string {
  return b.name ?? b.p.map((id) => pname(s, id)).join(b.k === 'couple' ? ' & ' : ' / ');
}
function hist(b: Bond, y: number, t: L): void {
  b.hist.push({ y, t });
  if (b.hist.length > 6) b.hist.splice(1, 1);
}
function news(s: GameState, t: L, actId?: string, important = false): void {
  const st = bonds(s);
  st.news.push({ y: s.year, t });
  if (st.news.length > 30) st.news.shift();
  remember(s, 'bond9', t, { actId, important });
}
const mineAct = (s: GameState, id?: string) => !!id && (s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand);

/** Qualidade média dos últimos discos (0..100; 50 sem discos). */
function workQ(s: GameState, act: Act): number {
  const rs = act.releases.slice(-3).map((id) => s.releases[id]).filter(Boolean);
  return rs.length ? rs.reduce((x, r) => x + r.q, 0) / rs.length : 50;
}

/** Por que alguém pensa o que pensa de um ato: cada fator com seu peso (rodada 10). */
export type AdmWhy = 'quality' | 'success' | 'genre' | 'curious' | 'generation' | 'envy' | 'rebel' | 'commercial' | 'taste' | 'ties' | 'bond' | 'heard' | 'politics';

/** A pessoa faz ou fez parte do ato (banda atual ou antiga, carreira solo, supergrupo)? Ninguém opina sobre si mesmo. */
export function isOwnAct(s: GameState, pid: string, act: Act): boolean {
  if (act.members.includes(pid) || act.leaderId === pid) return true;
  const p = s.persons[pid];
  if (p && act.name === p.name) return true;
  const x = s.x4 as unknown as { rw?: { former?: Record<string, { personId: string }[]> }; chron9?: { mem?: Record<string, string[]> } };
  if (x.rw?.former?.[act.id]?.some((f) => f.personId === pid)) return true;
  if (x.chron9?.mem?.[pid]?.some((m) => m.startsWith(act.id + ':'))) return true;
  return bonds(s).list.some((b) => b.act === act.id && b.p.includes(pid));
}

const FAMS: FamilyId[] = ['blues_jazz', 'country_folk', 'rnb', 'rock', 'pop', 'hiphop', 'electronic', 'caribbean', 'latin', 'brazil', 'africa', 'asia_me', 'europe', 'sacred'];

/**
 * Admiração de uma pessoa pelo trabalho de um ato (−100..100), com os fatores.
 * Rodada 10: depende do gosto de quem opina (personalidade e valores do soul9, gênero preferido, geração em que
 * cresceu, inveja, rebeldia, uma "química" pessoal determinística), não só da qualidade dos discos — antes todo
 * mundo da mesma família de gêneros admirava a mesma lista. Sem sorteios: nada mexe no Rng compartilhado.
 */
export function admirationWhy(s: GameState, pid: string, actId: string): { v: number; parts: { k: AdmWhy; v: number }[] } {
  const p = s.persons[pid];
  const target = s.acts[actId];
  if (!p || !target) return { v: 0, parts: [] };
  const mine = actOfPerson(s, pid);
  if (mine?.id === actId || isOwnAct(s, pid, target)) return { v: 0, parts: [] };
  const so = soul(s, p);
  const f = so.f;
  const val = so.v;
  const parts: { k: AdmWhy; v: number }[] = [];
  const add = (k: AdmWhy, v: number) => { if (Math.abs(v) >= 0.5) parts.push({ k, v }); };
  const seed = s.config.seed;
  // qualidade: perfeccionistas e quem valoriza a arte pesam mais
  add('quality', (workQ(s, target) - 50) * (0.55 + f.perfeccionismo / 150 + val.arte / 300));
  // sucesso: quem ama fama admira quem faz sucesso; quem só quer arte, nem tanto
  add('success', Math.min(15, target.hits * 2 + target.awards * 3) * (0.25 + val.fama / 90));
  // gênero: o próprio, o preferido pessoal e a curiosidade por outros mundos
  const fam = familyOf(target.genre);
  const fav = FAMS[hashString(`${seed}|fav|${pid}`) % FAMS.length];
  if (mine) {
    if (mine.genre === target.genre) add('genre', 6 + val.tradicao / 10);
    else if (familyOf(mine.genre) === fam) add('genre', 3 + val.tradicao / 20);
    else add('curious', (f.curiosidade - 50) / 3 - f.teimosia / 12);
    if (mine.movementId && mine.movementId === target.movementId) add('genre', 10);
  }
  if (fav === fam) add('taste', 9);
  // geração: a música de quando a pessoa tinha uns 18 anos marca para sempre
  const youth = p.born + 18;
  const gap = Math.abs(target.debutYear - youth);
  add('generation', clamp(10 - gap / 2, -10, 10) * (0.4 + val.tradicao / 100));
  // inveja: mesmo universo, muito mais famoso, ego e ambição altos
  if (mine && familyOf(mine.genre) === fam && target.fame > mine.fame + 10) add('envy', -Math.max(0, (f.ego + f.ambicao - 100) / 4) * Math.min(1, (target.fame - mine.fame) / 40));
  // rebeldes desconfiam de quem virou instituição; quem preza a arte torce o nariz para o muito comercial
  if (target.legend || target.fame > 70) add('rebel', -(f.rebeldia - 50) / 4);
  if (target.positioning > 70) add('commercial', -(val.arte - val.fama) / 5);
  // química pessoal: algo no som pega (ou não) — fixa para cada par pessoa/ato
  add('taste', ((hashString(`${seed}|adm|${pid}|${actId}`) % 1000) / 1000 - 0.5) * 30);
  // laços pessoais (quem é sociável pesa mais as amizades), parcerias e o que já ouviu
  let tv = 0;
  for (const m of target.members) { const t = tieOf(s, pid, m); if (t) tv += t.v; }
  add('ties', clamp(tv, -100, 100) * (0.2 + f.sociabilidade / 300));
  for (const b of bondsOfPerson(s, pid)) if (!b.end && b.a.includes(actId)) add('bond', 15);
  add('heard', bonds(s).adm[`${pid}|${actId}`] ?? 0);
  // visão de mundo: quem é engajado se aproxima (ou se afasta) de quem pensa parecido
  const tl = leadOf(target);
  if (tl && tl !== pid && s.persons[tl]) add('politics', clamp(compat(s, pid, tl) * 7, -9, 9));
  const v = parts.reduce((t, x) => t + x.v, 0);
  return { v: clamp(Math.round(v), -100, 100), parts };
}

/** Admiração de uma pessoa pelo trabalho de um ato (−100..100). */
export function admiration(s: GameState, pid: string, actId: string): number {
  return admirationWhy(s, pid, actId).v;
}

// frases: abertura por faixa de sentimento + o motivo mais forte (várias versões, escolhidas por hash do par)
const OPEN: Record<'love' | 'like' | 'meh' | 'dislike' | 'hate', L[]> = {
  love: [l('{a}? Referência absoluta', '{a}? An absolute touchstone'), l('Ouço {a} até hoje', 'I still play {a} all the time'), l('Ninguém faz o que {a} faz', 'Nobody does what {a} does'), l('Tiro o chapéu para {a}', 'Hats off to {a}'), l('{a} mudou a minha cabeça', '{a} changed my mind about music')],
  like: [l('Gosto de {a}', 'I like {a}'), l('{a} tem o seu valor', '{a} has real merit'), l('Respeito o trabalho de {a}', 'I respect what {a} does'), l('{a} me agrada', '{a} works for me')],
  meh: [l('{a}? Tanto faz', '{a}? Whatever'), l('Não tenho muito a dizer sobre {a}', 'I have little to say about {a}'), l('{a} passa por mim', '{a} goes right past me')],
  dislike: [l('{a} não me desce', '{a} does not go down well with me'), l('Não entendo o barulho em torno de {a}', 'I do not get the fuss about {a}'), l('{a} me cansa', '{a} wears me out'), l('Desligo o rádio quando toca {a}', 'I switch the radio off when {a} comes on')],
  hate: [l('{a} é tudo o que há de errado na música', '{a} is everything wrong with music'), l('Prefiro o silêncio a {a}', 'I would rather have silence than {a}'), l('{a}? Nem me pergunte', '{a}? Do not even ask')],
};
const WHY_TXT: Record<AdmWhy, [L[], L[]]> = {
  quality: [[l('os discos são impecáveis', 'the records are flawless'), l('cada faixa é bem cuidada', 'every track is carefully made')], [l('os últimos discos são fracos', 'the latest records are weak'), l('falta capricho', 'it lacks care')]],
  success: [[l('sabem fazer sucesso', 'they know how to land a hit'), l('os números não mentem', 'the numbers do not lie')], [l('sucesso não é tudo', 'success is not everything')]],
  genre: [[l('falamos a mesma língua musical', 'we speak the same musical language'), l('é a minha praia', 'it is right up my street')], [l('nem é o meu mundo', 'not my world at all')]],
  curious: [[l('ousam fora da caixinha', 'they dare outside the box'), l('é bom ouvir outro mundo', 'it is good to hear another world')], [l('nem é o meu mundo', 'not my world at all'), l('não é o meu tipo de som', 'not my kind of sound')]],
  generation: [[l('me lembra a minha juventude', 'it takes me back to my youth'), l('é a trilha da minha geração', 'it is the soundtrack of my generation')], [l('é coisa de outra geração', 'it belongs to another generation'), l('não é do meu tempo', 'it is not from my time')]],
  envy: [[l('merecem cada aplauso', 'they deserve every bit of applause')], [l('fama demais para tão pouco', 'too much fame for so little'), l('o hype é maior que a música', 'the hype is bigger than the music')]],
  rebel: [[l('instituição merecida', 'a deserved institution')], [l('virou parte do sistema', 'they became part of the system'), l('viraram peça de museu', 'they turned into a museum piece')]],
  commercial: [[l('pop bem feito', 'well-made pop')], [l('comercial demais', 'far too commercial'), l('feito para vender, não para sentir', 'made to sell, not to feel')]],
  taste: [[l('tem algo ali que me pega', 'something in it just gets me'), l('o som bate comigo', 'the sound clicks with me')], [l('simplesmente não bate comigo', 'it simply does not click with me'), l('algo no som me irrita', 'something in the sound grates on me')]],
  ties: [[l('e são gente boa', 'and they are good people'), l('e conheço bem quem está lá', 'and I know the people there well')], [l('e conheço bem demais quem está lá', 'and I know the people there too well'), l('e a convivência já foi ruim', 'and things got ugly between us')]],
  bond: [[l('trabalhamos juntos', 'we work together')], [l('trabalhamos juntos, infelizmente', 'we work together, sadly')]],
  heard: [[l('o último disco me conquistou', 'the last record won me over')], [l('o último disco me decepcionou', 'the last record let me down')]],
  politics: [[l('e pensamos parecido sobre o mundo', 'and we see the world the same way'), l('e dizem o que precisa ser dito', 'and they say what needs saying')], [l('e as ideias deles me afastam', 'and their views push me away'), l('e não suporto o discurso deles', 'and I cannot stand what they preach')]],
};
// voz da pessoa: o traço mais forte muda o jeito de falar (prefixo opcional)
const VOICE: Record<'ego' | 'rebeldia' | 'sociabilidade' | 'perfeccionismo' | 'curiosidade', [L, L]> = {
  ego: [l('Não é fácil me impressionar, mas', 'I am hard to impress, but'), l('Sinceramente, eu faço melhor, e', 'Honestly, I do it better, and')],
  rebeldia: [l('Contra tudo e contra todos:', 'Against the grain:'), l('Vou ser direto:', 'I will be blunt:')],
  sociabilidade: [l('Cá entre nós,', 'Between us,'), l('Falo com carinho, mas', 'I say it kindly, but')],
  perfeccionismo: [l('Ouvindo com atenção,', 'Listening closely,'), l('No detalhe,', 'In the details,')],
  curiosidade: [l('Gosto de ouvir de tudo, e', 'I listen to everything, and'), l('Sempre atento ao novo:', 'Always on the lookout:')],
};
// relação pessoal com quem está no ato (amizade, rivalidade, romance…) vira o motivo quando pesa
const TIE_TXT: Partial<Record<TieKind, [L, L]>> = {
  friend: [l('e somos amigos de longa data', 'and we go way back as friends'), l('apesar da amizade', 'despite our friendship')],
  rival: [l('e a rivalidade nos faz crescer', 'and the rivalry keeps us sharp'), l('e a rivalidade é antiga', 'and the rivalry runs deep')],
  romance: [l('e o coração fala alto', 'and my heart speaks loudly'), l('e o fim do namoro ainda dói', 'and the break-up still stings')],
  mentor: [l('e aprendi muito com eles', 'and I learned a lot from them'), l('mesmo tendo aprendido com eles', 'even if I learned from them')],
  feud: [l('apesar da briga', 'despite our feud'), l('e a briga não ajudou', 'and the feud did not help')],
  collab: [l('e gravar juntos foi ótimo', 'and recording together was great'), l('e gravar juntos foi um tormento', 'and recording together was torture')],
};

/**
 * O que a pessoa diz sobre um ato — frase curta, coerente com o motivo mais forte e variada entre pessoas.
 * `used` (opcional) guarda aberturas/motivos já usados por essa pessoa na mesma lista, para não repetir.
 */
export function opinionText(s: GameState, pid: string, actId: string, used?: Set<string>): L {
  const A = s.acts[actId];
  if (!A || isOwnAct(s, pid, A)) return l('', '');
  const w = admirationWhy(s, pid, actId);
  const band = w.v >= 45 ? 'love' : w.v >= 12 ? 'like' : w.v > -6 ? 'meh' : w.v > -30 ? 'dislike' : 'hate';
  const hh = hashString(`${s.config.seed}|op|${pid}|${actId}`);
  const pickFrom = <T extends L>(pool: T[], salt: number, tag: string): T => {
    for (let i = 0; i < pool.length; i++) {
      const x = pool[(salt + i) % pool.length];
      if (!used || !used.has(tag + x.pt)) { used?.add(tag + x.pt); return x; }
    }
    return pool[salt % pool.length];
  };
  let open = fmtL(pickFrom(OPEN[band], hh, 'o:'), { a: A.name });
  // personalidade: o traço mais marcante dá o tom (só para quem tem traço forte, e nem sempre)
  const p = s.persons[pid];
  if (p && (hh >>> 3) % 3 === 0) {
    const f = soul(s, p).f;
    const top = (Object.keys(VOICE) as (keyof typeof VOICE)[]).map((k) => [k, f[k]] as const).sort((x, y) => y[1] - x[1])[0];
    if (top && top[1] >= 70) {
      const vx = VOICE[top[0]][(hh >>> 5) % 2];
      if (!used?.has('v:' + vx.pt)) { used?.add('v:' + vx.pt); open = { pt: `${vx.pt} ${open.pt.charAt(0).toLowerCase()}${open.pt.slice(1)}`, en: `${vx.en} ${open.en.charAt(0).toLowerCase()}${open.en.slice(1)}` }; }
    }
  }
  if (band === 'meh') return open;
  const pos = w.v > 0;
  const lead = w.parts.filter((x) => (x.v > 0) === pos).sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
  if (!lead) return open;
  let why: L | undefined;
  if (lead.k === 'ties') {
    // a relação mais forte com alguém do ato define a frase
    const tie = A.members.map((m) => tieOf(s, pid, m)).filter((x): x is NonNullable<typeof x> => !!x).sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
    const tx = tie && TIE_TXT[tie.k];
    if (tx) why = tx[pos ? 0 : 1];
  }
  why ??= pickFrom(WHY_TXT[lead.k][pos ? 0 : 1], hh >>> 7, 'w:');
  return { pt: `${open.pt} — ${why.pt}.`, en: `${open.en} — ${why.en}.` };
}

export function nudgeAdmiration(s: GameState, pid: string, actId: string, dv: number): void {
  const st = bonds(s);
  const k = `${pid}|${actId}`;
  st.adm[k] = clamp((st.adm[k] ?? 0) + dv, -40, 40);
  const keys = Object.keys(st.adm);
  if (keys.length > 500) for (const x of keys.slice(0, keys.length - 500)) delete st.adm[x];
}
/**
 * Opiniões de uma pessoa notável: quem ela admira e quem ela despreza. Nunca sobre os próprios atos (atuais,
 * antigos ou solo), um ato por vez (sem repetir nome entre "admira" e "torce o nariz"), no máximo `n` de cada.
 */
export function opinionsOf(s: GameState, pid: string, n = 4): { top: { act: Act; v: number }[]; low: { act: Act; v: number }[] } {
  n = Math.max(0, Math.min(n, 6));
  // o personagem do jogador não tem opiniões geradas: as opiniões dele são as suas escolhas
  if (s.persons[pid]?.isPlayer) return { top: [], low: [] };
  const me = actOfPerson(s, pid);
  const pool = Object.values(s.acts).filter((a) => a !== me && (live(a) || a.legend) && a.fame > 15 && !isOwnAct(s, pid, a));
  const scored = pool.map((act) => ({ act, v: admiration(s, pid, act.id) })).sort((x, y) => y.v - x.v || x.act.id.localeCompare(y.act.id));
  const seen = new Set<string>();
  const take = (list: typeof scored, ok: (v: number) => boolean) => {
    const out: typeof scored = [];
    for (const x of list) {
      if (out.length >= n || !ok(x.v)) break;
      const k = x.act.name.toLowerCase();
      if (seen.has(x.act.id) || seen.has(k)) continue;
      seen.add(x.act.id); seen.add(k);
      out.push(x);
    }
    return out;
  };
  const top = take(scored, (v) => v > 10);
  const low = take(scored.slice().reverse(), (v) => v < -5);
  return { top, low };
}
/** Opiniões já com as frases, sem repetir abertura ou motivo dentro da mesma lista. */
export function opinionLines(s: GameState, pid: string, n = 4): { act: Act; v: number; txt: L }[] {
  const op = opinionsOf(s, pid, n);
  const used = new Set<string>();
  return [...op.top, ...op.low].map((x) => ({ ...x, txt: opinionText(s, pid, x.act.id, used) }));
}
/** Admiração média dos integrantes de um ato pelo trabalho de outro. */
export function actAdmiration(s: GameState, from: Act, toId: string): number {
  if (!from.members.length) return 0;
  return from.members.reduce((x, p) => x + admiration(s, p, toId), 0) / from.members.length;
}

// ---------------------------------------------------------------- criação

export function formBond(s: GameState, k: BondKind, persons: string[], o: { name?: string; real?: boolean; pl?: boolean; str?: number; term?: number } = {}): Bond | null {
  const ps = [...new Set(persons)].filter((id) => s.persons[id]?.alive);
  if (ps.length < 2) return null;
  const acts = ps.map((id) => actOfPerson(s, id)?.id ?? '');
  const st = bonds(s);
  if (st.list.some((b) => !b.end && b.k === k && ps.every((p) => b.p.includes(p)))) return null;
  const b: Bond = { id: nextId(s, 'bd'), k, p: ps, a: acts, y: s.year, str: o.str ?? 55, works: 0, hist: [], name: o.name };
  if (o.real) b.real = 1;
  if (o.pl) b.pl = 1;
  if (o.term) b.term = o.term;
  hist(b, s.year, fmtL(l('Começa: {n}.', 'Begins: {n}.'), { n: BOND_NAME[k] }));
  st.list.push(b);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) bump(s, ps[i], ps[j], 12, k === 'couple' ? 'romance' : k === 'patron' ? 'mentor' : 'feat', k === 'couple' ? 'romance' : k === 'patron' ? 'mentor' : 'collab');
  if (k === 'super') makeSuper(s, b);
  if (k === 'ally' || k === 'cross') b.term ??= s.year + 1;
  trim(s);
  const A = s.acts[acts[0]];
  const famous = acts.some((id) => (s.acts[id]?.fame ?? 0) > 45) || acts.some((id) => mineAct(s, id));
  if (famous) news(s, fmtL(l('{k}: {n}.', '{k}: {n}.'), { k: BOND_NAME[k], n: bondTitle(s, b) }), acts.find((id) => mineAct(s, id)) ?? A?.id, b.real === 1 || acts.some((id) => mineAct(s, id)));
  return b;
}

function makeSuper(s: GameState, b: Bond): void {
  const srcs = b.a.map((id) => s.acts[id]).filter((x): x is Act => !!x);
  const base = srcs[0];
  if (!base) return;
  const sg = makeAct(s, rngOf(s), { genre: base.genre, city: base.city, members: 2, potential: Math.max(...b.p.map((p) => s.persons[p].potential)), formed: s.year, debutYear: s.year, fame: srcs.reduce((x, a) => x + a.fame, 0) / srcs.length * 0.6 });
  for (const id of sg.members) delete s.persons[id];
  sg.members = b.p.slice(); actsTouched17(s); // r17: índice pessoa→atos
  sg.leaderId = b.p[0];
  sg.name = b.name ?? srcs.map((a) => a.name.split(/[\s&]/)[0]).slice(0, 3).join('/');
  b.name = sg.name;
  sg.status = 'active';
  sg.owner = null;
  sg.careerEnd = b.term ?? s.year + 4;
  b.term ??= sg.careerEnd;
  const sum = (f: (a: Act) => number) => Math.round(srcs.reduce((x, a) => x + f(a), 0));
  sg.fans = { casual: sum((a) => a.fans.casual * 0.1), active: sum((a) => a.fans.active * 0.08), core: sum((a) => a.fans.core * 0.04) };
  b.act = sg.id;
}

function trim(s: GameState): void {
  const st = bonds(s);
  const act = st.list.filter((b) => !b.end);
  const ended = st.list.filter((b) => b.end);
  if (act.length <= MAX_ACTIVE && ended.length <= MAX_ENDED) return;
  act.sort((x, y) => (y.real ?? 0) * 50 + (y.pl ?? 0) * 80 + y.str - ((x.real ?? 0) * 50 + (x.pl ?? 0) * 80 + x.str));
  ended.sort((x, y) => (y.real ?? 0) * 50 + (y.pl ?? 0) * 80 + y.end!.y - ((x.real ?? 0) * 50 + (x.pl ?? 0) * 80 + x.end!.y));
  st.list = [...act.slice(0, MAX_ACTIVE), ...ended.slice(0, MAX_ENDED)];
}

// ---------------------------------------------------------------- fim e epílogo

export function endBond(s: GameState, r: Rng, b: Bond, c: BondEnd): void {
  if (b.end) return;
  b.end = { y: s.year, c };
  hist(b, s.year, fmtL(l('Fim: {c}.', 'Ends: {c}.'), { c: END_NAME[c] }));
  const acts = b.a.map((id) => s.acts[id]).filter((x): x is Act => !!x);
  if (b.act && s.acts[b.act] && s.acts[b.act].status === 'active') s.acts[b.act].status = c === 'done' || c === 'wear' ? 'hiatus' : 'split';
  if (c === 'fight' || c === 'money') for (let i = 0; i < b.p.length; i++) for (let j = i + 1; j < b.p.length; j++) bump(s, b.p[i], b.p[j], -35, 'feat');
  if (b.k === 'couple' && c !== 'death') for (const A of acts) { A.momentum = clamp(A.momentum - 10, 0, 100); A.fans.casual = Math.round(A.fans.casual * 0.95); scandal(s, A.id, 'sex', 25); }
  if (c === 'death') {
    b.end.ep = 'tribute';
    b.end.epY = s.year;
    for (const A of acts) if (!A.deceased) A.momentum = clamp(A.momentum + 12, 0, 100);
    hist(b, s.year, fmtL(l('Tributo póstumo: {n} homenageado(a) em show e disco.', 'Posthumous tribute: {n} honored in a show and record.'), { n: pname(s, b.p.find((p) => !s.persons[p]?.alive) ?? b.p[0]) }));
  } else if (c === 'money' && b.works > 0) {
    b.end.ep = 'lawsuit';
    b.end.epY = s.year;
    hist(b, s.year, l('Os direitos das obras conjuntas vão parar na justiça.', 'Rights to the joint works end up in court.'));
    for (const A of acts) { A.cash -= Math.min(Math.max(0, A.cash), 20000_00); A.image && (A.image.publicImage = clamp(A.image.publicImage - 4, 0, 100)); }
  }
  const big = acts.some((A) => A.fame > 45) || b.real || acts.some((A) => mineAct(s, A.id));
  if (big) news(s, fmtL(l('Fim de {k}: {n} ({c}).', 'End of {k}: {n} ({c}).'), { k: BOND_NAME[b.k], n: bondTitle(s, b), c: END_NAME[c] }), acts.find((A) => mineAct(s, A.id))?.id ?? acts[0]?.id, !!b.real);
  if (acts.some((A) => mineAct(s, A.id))) notify(s, fmtL(l('{n}: o laço acabou ({c}).', '{n}: the bond ended ({c}).'), { n: bondTitle(s, b), c: END_NAME[c] }), c === 'death' || c === 'done' ? 'info' : 'bad');
  void r;
}

// ---------------------------------------------------------------- mês: vida dos laços

const WEAR: Record<BondKind, number> = { duo: 0.5, couple: 0.45, super: 0.8, ally: 2.5, cross: 2.5, patron: 0.6 };

function life(s: GameState, r: Rng): void {
  for (const b of bonds(s).list) {
    if (b.end) {
      // reconciliação anos depois (briga, divergência, desgaste); supergrupos voltam para reuniões
      if (!b.end.ep && ['fight', 'divergence', 'wear', 'prison'].includes(b.end.c) && s.year - b.end.y >= 3 && b.p.every((p) => s.persons[p]?.alive) && r.chance(b.k === 'super' ? 0.006 : 0.003)) {
        b.end.ep = 'reconcile';
        b.end.epY = s.year;
        hist(b, s.year, b.k === 'super' ? l('Reunião! O coletivo volta para uma turnê.', 'Reunion! The collective returns for a tour.') : l('Reconciliação pública depois de anos.', 'Public reconciliation after years.'));
        for (let i = 0; i < b.p.length; i++) for (let j = i + 1; j < b.p.length; j++) bump(s, b.p[i], b.p[j], 40, 'feat', 'friend');
        if (b.act && s.acts[b.act]) { const sg = s.acts[b.act]; sg.status = 'active'; sg.careerEnd = s.year + 2; sg.momentum = clamp(sg.momentum + 25, 0, 100); }
        news(s, fmtL(l('{n}: {e}.', '{n}: {e}.'), { n: bondTitle(s, b), e: EPI_NAME.reconcile }), b.a.find((id) => mineAct(s, id)) ?? b.a[0], !!b.real);
      }
      continue;
    }
    const ps = b.p.map((id) => s.persons[id]);
    if (ps.some((p) => !p?.alive)) { endBond(s, r, b, 'death'); continue; }
    const acts = b.a.map((id) => s.acts[id]).filter((x): x is Act => !!x);
    const fames = acts.map((A) => A.fame);
    const gap = fames.length > 1 ? Math.max(...fames) - Math.min(...fames) : 0;
    const ego = ps.reduce((x, p) => x + (p.persona?.ambition ?? 50), 0) / ps.length;
    let d = -WEAR[b.k] - (gap > 30 ? gap / 60 : 0) - (ego > 70 ? 0.4 : 0);
    // ties pessoais seguram (ou corroem) o laço
    const t = b.p.length >= 2 ? tieOf(s, b.p[0], b.p[1]) : undefined;
    if (t) d += t.v / 120;
    b.str = clamp(b.str + d + r.normal(0, 0.8), 0, 100);
    // obras e efeitos
    if (r.chance(b.k === 'duo' ? 0.12 : b.k === 'couple' ? 0.04 : b.k === 'patron' ? 0.05 : 0.02)) {
      b.works += 1;
      if (b.k === 'couple' && acts.length >= 2) { crossAudience(s, acts[0], acts[1], 0.6); hist(b, s.year, l('Disco e turnê a dois.', 'Joint album and tour.')); }
      if (b.k === 'patron' && acts.length >= 2) { const [P0, P1] = acts; P1.fame = clamp(P1.fame + Math.min(2, P0.fame / 40), 0, 100); P1.momentum = clamp(P1.momentum + 4, 0, 100); }
      if (b.k === 'duo') for (const A of acts) A.momentum = clamp(A.momentum + 2, 0, 100);
      for (const A of acts) for (const p of b.p) if (!A.members.includes(p)) nudgeAdmiration(s, p, A.id, 2);
    }
    // causas de fim
    if (b.term && s.year >= b.term && (b.k === 'super' || b.k === 'ally' || b.k === 'cross')) { endBond(s, r, b, 'done'); continue; }
    if (r.chance(0.0006)) { endBond(s, r, b, 'prison'); continue; }
    if (b.str < 12) {
      const sameFam = acts.length < 2 || familyOf(acts[0].genre) === familyOf(acts[1].genre);
      const c: BondEnd = b.works >= 4 && r.chance(0.35) ? 'money' : !sameFam && r.chance(0.5) ? 'divergence' : t && t.v < -10 ? 'fight' : 'wear';
      endBond(s, r, b, c);
      continue;
    }
    if (b.k === 'patron' && acts.length >= 2 && acts[1].fame > acts[0].fame + 15 && r.chance(0.05)) { endBond(s, r, b, 'divergence'); continue; }
  }
}

// ---------------------------------------------------------------- NPCs formam laços sozinhos

function notable(s: GameState, pid: string): Act | undefined {
  const A = actOfPerson(s, pid);
  return A && live(A) && A.fame > 18 ? A : undefined;
}
const busy = (s: GameState, pid: string, k: BondKind) => activeBonds(s).some((b) => b.k === k && b.p.includes(pid));

function autonomous(s: GameState, r: Rng): void {
  const ties = (s.x4 as unknown as { social8?: { ties: import('./social8').Tie[] } }).social8?.ties ?? [];
  if (!ties.length || activeBonds(s).length >= MAX_ACTIVE - 5) return;
  for (let i = 0; i < 6; i++) {
    const t = r.pick(ties);
    if (!t || t.v < 40) continue;
    const A = notable(s, t.a);
    const B = notable(s, t.b);
    if (!A || !B || A === B || mineAct(s, A.id) || mineAct(s, B.id)) continue;
    const pa = s.persons[t.a];
    const pb = s.persons[t.b];
    const sameFam = familyOf(A.genre) === familyOf(B.genre);
    if (t.k === 'romance' && !busy(s, t.a, 'couple') && !busy(s, t.b, 'couple') && A.fame + B.fame > 70 && r.chance(0.25)) formBond(s, 'couple', [t.a, t.b]);
    else if (t.k === 'mentor' && t.m && r.chance(0.15)) formBond(s, 'patron', [t.m, t.m === t.a ? t.b : t.a]);
    else if ((t.k === 'friend' || t.k === 'collab') && pa.skills.comp > 55 && pb.skills.comp > 55 && !busy(s, t.a, 'duo') && !busy(s, t.b, 'duo') && r.chance(0.08)) formBond(s, 'duo', [t.a, t.b]);
    else if (t.k === 'collab' && !sameFam && A.fame > 35 && B.fame > 35 && r.chance(0.03)) crossOver(s, r, A, B, [t.a, t.b]);
    else if ((t.k === 'friend' || t.k === 'collab') && A.fame > 40 && B.fame > 40 && r.chance(0.05)) ally(s, r, A, B, [t.a, t.b]);
  }
  // admiração mútua sem laço pessoal também gera alianças entre grandes nomes
  if (r.chance(0.08)) {
    const big = Object.values(s.acts).filter((a) => live(a) && a.fame > 55 && !mineAct(s, a.id));
    if (big.length > 1) {
      const A = r.pick(big);
      const B = r.pick(big);
      const pa = leadOf(A);
      const pb = leadOf(B);
      if (A !== B && pa && pb && admiration(s, pa, B.id) > 25 && admiration(s, pb, A.id) > 15) (familyOf(A.genre) === familyOf(B.genre) || r.chance(0.7) ? ally : crossOver)(s, r, A, B, [pa, pb]);
    }
  }
  // supergrupo/coletivo: 3 a 5 nomes famosos da mesma família, de atos diferentes, que se admiram
  if (r.chance(0.012)) {
    const big = Object.values(s.acts).filter((a) => (live(a) || a.status === 'hiatus' || a.status === 'split') && a.fame > 45 && !mineAct(s, a.id) && a.members.some((p) => s.persons[p]?.alive));
    const A = big.length ? r.pick(big) : undefined;
    if (A) {
      const fam = familyOf(A.genre);
      const others = r.shuffle(big.filter((x) => x !== A && familyOf(x.genre) === fam)).slice(0, r.int(2, 4));
      const ps = [A, ...others].map((x) => x.members.find((p) => s.persons[p]?.alive)).filter((p): p is string => !!p && !busy(s, p, 'super'));
      if (ps.length >= 3) formBond(s, 'super', ps, { term: s.year + r.int(2, 6) });
    }
  }
}

/** Aliança pontual: 1–2 faixas, públicos se aproximam, chance de hit. */
export function ally(s: GameState, r: Rng, A: Act, B: Act, ps: string[], o: { real?: boolean; pl?: boolean } = {}): Bond | null {
  const b = formBond(s, 'ally', ps, { ...o, term: s.year + 1 });
  if (!b) return null;
  b.works = r.int(1, 2);
  crossAudience(s, A, B, 1.5);
  if (r.chance(0.25 + (A.fame + B.fame) / 400)) {
    for (const X of [A, B]) { X.momentum = clamp(X.momentum + 10, 0, 100); X.hits += 1; }
    hist(b, s.year, l('A faixa conjunta vira hit.', 'The joint track becomes a hit.'));
  }
  return b;
}

/** Cruzamento de gêneros: une públicos distantes; risco alto, prêmio alto; pode nascer um subgênero. */
export function crossOver(s: GameState, r: Rng, A: Act, B: Act, ps: string[], o: { real?: boolean; pl?: boolean; force?: boolean } = {}): Bond | null {
  const b = formBond(s, 'cross', ps, { ...o, term: s.year + 1 });
  if (!b) return null;
  b.works = 1;
  const ok = o.force || r.chance(0.45 + (A.fame + B.fame) / 500);
  if (ok) {
    crossAudience(s, A, B, 3);
    for (const X of [A, B]) X.momentum = clamp(X.momentum + 12, 0, 100);
    hist(b, s.year, l('Os públicos se misturam: sucesso de crítica e vendas.', 'The audiences merge: critical and commercial success.'));
    const recent = bonds(s).list.some((x) => x.hybrid && s.year - x.y < 6);
    if (familyOf(A.genre) !== familyOf(B.genre) && (o.force || (!recent && r.chance(0.15)))) hybrid(s, b, A, B);
  } else {
    for (const X of [A, B]) { X.momentum = clamp(X.momentum - 8, 0, 100); X.fans.core = Math.round(X.fans.core * 0.97); }
    b.str = 25;
    hist(b, s.year, l('Os fãs de raiz torcem o nariz: o cruzamento fracassa.', 'Hardcore fans frown: the crossover flops.'));
  }
  return b;
}

function hybrid(s: GameState, b: Bond, A: Act, B: Act): void {
  const ga = genreById[A.genre]?.name ?? l(A.genre);
  const gb = genreById[B.genre]?.name ?? l(B.genre);
  const name = l(`${ga.pt.split(' ')[0]}-${gb.pt.split(' ')[0].toLowerCase()}`, `${ga.en.split(' ')[0]}-${gb.en.split(' ')[0].toLowerCase()}`);
  if (s.movements.some((m) => m.name.en === name.en)) return;
  const id = nextId(s, 'mv');
  s.movements.push({ id, name, city: A.city, parent: A.genre, genreId: `mv_${s.idSeq}`, born: s.year, strength: 12, fashion: fashionOf(s.year, familyOf(A.genre)), acts: [A.id, B.id] });
  registerMovementGenres(s);
  s.genrePop[`mv_${s.idSeq}`] = 0.6;
  b.hybrid = id;
  for (const X of [A, B]) X.movementId ??= id;
  hist(b, s.year, fmtL(l('Nasce um subgênero híbrido: {n}.', 'A hybrid subgenre is born: {n}.'), { n: name }));
}

// ---------------------------------------------------------------- casos reais (modo histórico com nomes reais)

interface Seed { id: string; k: BondKind; y: number; who: string[][]; name?: string; min?: number }
/** cada grupo em `who`: nomes aceitos (pessoa ou ato) para um participante; atos inteiros com '*' */
export const REAL_BONDS: Seed[] = [
  { id: 'jobim_vinicius', k: 'duo', y: 1956, who: [['Tom Jobim'], ['Vinicius de Moraes']] },
  { id: 'gil_caetano', k: 'duo', y: 1967, who: [['Gilberto Gil'], ['Caetano Veloso']] },
  { id: 'roberto_erasmo', k: 'duo', y: 1964, who: [['Roberto Carlos'], ['Erasmo Carlos']] },
  { id: 'queen_bowie', k: 'ally', y: 1981, who: [['Freddie Mercury', 'Queen'], ['David Bowie']] },
  { id: 'rundmc_aerosmith', k: 'cross', y: 1986, who: [['Run-DMC'], ['Aerosmith']] },
  { id: 'jayz_linkin', k: 'cross', y: 2004, who: [['Jay-Z'], ['Linkin Park']] },
  { id: 'beyonce_jayz', k: 'couple', y: 2002, who: [['Beyoncé', 'Beyoncé Knowles'], ['Jay-Z']] },
  { id: 'wilburys', k: 'super', y: 1988, name: 'Traveling Wilburys', min: 3, who: [['Bob Dylan'], ['George Harrison'], ['Roy Orbison'], ['Tom Petty'], ['Jeff Lynne', 'Electric Light Orchestra']] },
  { id: 'amigos', k: 'super', y: 1995, name: 'Amigos', min: 4, who: [['*Chitãozinho & Xororó'], ['*Leandro & Leonardo'], ['*Zezé Di Camargo & Luciano']] },
];

function findPeople(s: GameState, names: string[]): string[] {
  for (const n of names) {
    if (n.startsWith('*')) {
      const A = Object.values(s.acts).find((a) => a.name === n.slice(1) && !a.deceased);
      const ps = A?.members.filter((p) => s.persons[p]?.alive) ?? [];
      if (ps.length) return ps;
      continue;
    }
    const p = Object.values(s.persons).find((x) => x.alive && x.name === n && actOfPerson(s, x.id));
    if (p) return [p.id];
    const A = Object.values(s.acts).find((a) => a.name === n && live(a));
    const ld = A && leadOf(A);
    if (ld && s.persons[ld]?.alive) return [ld];
  }
  return [];
}

export function seedReal(s: GameState, r: Rng): void {
  if (!s.config.realNames) return;
  const st = bonds(s);
  for (const sd of REAL_BONDS) {
    if (st.seeded.includes(sd.id) || s.year < sd.y || s.year > sd.y + 1) continue;
    const groups = sd.who.map((w) => findPeople(s, w));
    const found = groups.filter((g) => g.length);
    if (found.length < Math.min(sd.who.length, sd.min ?? sd.who.length)) continue;
    st.seeded.push(sd.id);
    const ps = found.flat();
    const acts = found.map((g) => actOfPerson(s, g[0])).filter((x): x is Act => !!x);
    if (sd.k === 'ally' && acts.length >= 2) ally(s, r, acts[0], acts[1], ps, { real: true });
    else if (sd.k === 'cross' && acts.length >= 2) crossOver(s, r, acts[0], acts[1], ps, { real: true, force: true });
    else formBond(s, sd.k, ps, { name: sd.name, real: true, str: 75, term: sd.k === 'super' ? s.year + 3 : undefined });
  }
}

// ---------------------------------------------------------------- jogador: propor e aceitar

export const PLAYER_KINDS: BondKind[] = ['duo', 'couple', 'super', 'ally', 'cross', 'patron'];

/** Custo de fechar o laço (centavos): liberação do selo do outro lado e produção conjunta. */
export function bondCost(s: GameState, k: BondKind, otherId: string): { cost: number; blocked: boolean; text: L } {
  const base = k === 'super' ? 30000_00 : k === 'cross' || k === 'ally' ? 12000_00 : k === 'couple' ? 0 : 4000_00;
  const cl = clearance(s, otherId, base);
  return { cost: base + cl.cost, blocked: cl.blocked, text: cl.text };
}

/** Chance (0..1) de o outro lado aceitar. */
export function bondChance(s: GameState, k: BondKind, mineId: string, otherId: string): number {
  const M = s.acts[mineId];
  const O = s.acts[otherId];
  if (!M || !O) return 0;
  const lo = leadOf(O);
  const adm = lo ? admiration(s, lo, M.id) : 0;
  const lm = leadOf(M);
  const tv = lm && lo ? tieOf(s, lm, lo)?.v ?? 0 : 0;
  let x = adm / 60 + tv / 80 + (M.fame - O.fame) / 70 + (s.player.reputation.artists - 50) / 150 + (lm && lo ? compat(s, lm, lo) * 0.5 : 0);
  if (k === 'couple') x = (tieOf(s, lm ?? '', lo ?? '')?.k === 'romance' ? 1.5 : -3) + tv / 60;
  if (k === 'patron') x += M.fame > O.fame ? 0.6 : -0.6;
  if (k === 'cross') x -= familyOf(M.genre) === familyOf(O.genre) ? 2 : 0.2;
  return clamp(1 / (1 + Math.exp(-x * 2.2)), 0.02, 0.95);
}

export function proposeBond(s: GameState, r: Rng, k: BondKind, mineId: string, otherIds: string[]): { ok: boolean; text: L; bond?: Bond } {
  const M = s.acts[mineId];
  const others = otherIds.map((id) => s.acts[id]).filter((x): x is Act => live(x) && x.id !== mineId);
  if (!M || !mineAct(s, M.id) || !M.members.length || !others.length) return { ok: false, text: l('Escolha um ato seu e outro artista.', 'Pick one of your acts and another artist.') };
  if (k !== 'super' && others.length > 1) others.length = 1;
  const O = others[0];
  const costs = others.map((x) => bondCost(s, k, x.id));
  if (costs.some((c) => c.blocked)) return { ok: false, text: costs.find((c) => c.blocked)!.text };
  const cost = costs.reduce((x, c) => x + c.cost, 0);
  if (s.player.cash < cost) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
  const yes = others.filter((x) => r.chance(bondChance(s, k, M.id, x.id)));
  const lm = leadOf(M)!;
  if (k === 'super' ? yes.length < 2 : !yes.length) {
    for (const x of others) { const lo = leadOf(x); if (lo) nudgeAdmiration(s, lo, M.id, -3); }
    return { ok: false, text: fmtL(l('{o} recusou a proposta.', '{o} turned the proposal down.'), { o: others.map((x) => x.name).join(', ') }) };
  }
  if (cost) post(s, `bond9:${M.id}:${O.id}`, -cost, 'recording', `Laço artístico: ${M.name} + ${O.name}`);
  const ps = [lm, ...yes.map((x) => leadOf(x)!)];
  let b: Bond | null;
  if (k === 'ally') b = ally(s, r, M, O, ps, { pl: true });
  else if (k === 'cross') b = crossOver(s, r, M, O, ps, { pl: true });
  else b = formBond(s, k, k === 'patron' && O.fame > M.fame ? ps.slice().reverse() : ps, { pl: true, term: k === 'super' ? s.year + 3 : undefined });
  if (!b) return { ok: false, text: l('Esse laço já existe.', 'That bond already exists.') };
  return { ok: true, bond: b, text: fmtL(l('Fechado: {k} — {n}.', 'Deal: {k} — {n}.'), { k: BOND_NAME[k], n: bondTitle(s, b) }) };
}

/** Encerrar um laço do jogador (desgaste amigável). */
export function leaveBond(s: GameState, r: Rng, id: string): void {
  const b = bonds(s).list.find((x) => x.id === id);
  if (b && !b.end) endBond(s, r, b, b.k === 'super' || b.k === 'ally' || b.k === 'cross' ? 'done' : 'wear');
}

/** Convite de fora para um ato do jogador (caixa de entrada). */
export function bondInvite(s: GameState, r: Rng, mineId?: string, k?: BondKind): boolean {
  const mine = (mineId ? [mineId] : playerActs(s)).map((id) => s.acts[id]).filter((a): a is Act => live(a));
  if (!mine.length || P(s).inbox.some((m) => m.ref?.sys === 'bond9' && !m.resolved)) return false;
  const M = r.pick(mine);
  const cands = Object.values(s.acts).filter((a) => live(a) && !mineAct(s, a.id) && a.fame > 15).map((a) => ({ a, v: leadOf(a) ? admiration(s, leadOf(a)!, M.id) : 0 })).filter((x) => x.v > (mineId ? -100 : 20)).sort((x, y) => y.v - x.v).slice(0, 8);
  if (!cands.length) return false;
  const O = r.pick(cands).a;
  const kind: BondKind = k ?? (familyOf(O.genre) !== familyOf(M.genre) ? 'cross' : O.fame > M.fame + 20 ? 'patron' : r.chance(0.5) ? 'duo' : 'ally');
  addMsg(s, {
    from: O.name, kind: 'deal', tone: 'good', expires: s.week + 8,
    subject: fmtL(l('Proposta: {k}', 'Proposal: {k}'), { k: BOND_NAME[kind] }),
    body: fmtL(l('{o} admira o trabalho de {m} e propõe: {k}.', '{o} admires {m}\'s work and proposes: {k}.'), { o: O.name, m: M.name, k: BOND_NAME[kind] }),
    ref: { sys: 'bond9', mine: M.id, other: O.id, k: kind },
    actions: [{ id: 'accept', label: l('Aceitar', 'Accept') }, { id: 'decline', label: l('Recusar', 'Decline') }],
  });
  return true;
}

MSG_HANDLERS.bond9 = (s, m, action, r) => {
  const ref = m.ref ?? {};
  const M = s.acts[String(ref.mine)];
  const O = s.acts[String(ref.other)];
  const k = String(ref.k) as BondKind;
  if (!M || !O || !live(O) || !M.members.length) return l('A proposta perdeu a validade.', 'The proposal is no longer valid.');
  const lm = leadOf(M)!;
  const lo = leadOf(O)!;
  if (action !== 'accept') { nudgeAdmiration(s, lo, M.id, -4); return fmtL(l('Você recusou a proposta de {o}.', 'You declined {o}\'s proposal.'), { o: O.name }); }
  const ps = k === 'patron' && O.fame > M.fame ? [lo, lm] : [lm, lo];
  const b = k === 'ally' ? ally(s, r, O, M, ps, { pl: true }) : k === 'cross' ? crossOver(s, r, O, M, ps, { pl: true }) : formBond(s, k, ps, { pl: true, term: k === 'super' ? s.year + 3 : undefined });
  return b ? fmtL(l('Fechado: {n}.', 'Deal: {n}.'), { n: bondTitle(s, b) }) : l('Não deu certo.', 'It did not work out.');
};

// ---------------------------------------------------------------- ganchos

registerSimHook('month', 'bonds9', (s, r) => {
  seedReal(s, r);
  life(s, r);
  autonomous(s, r);
  if (r.chance(0.02)) bondInvite(s, r);
});

// lançamento: quem ouviu muda de opinião sobre o trabalho
registerSimHook('launch', 'bonds9', (s, r, arg) => {
  const rel = arg.release;
  const A = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !A || A.fame < 10) return;
  const peers = tiesOf(s, leadOf(A) ?? '').slice(0, 4);
  for (const t of peers) {
    const other = t.a === leadOf(A) ? t.b : t.a;
    if (r.chance(0.5)) nudgeAdmiration(s, other, A.id, (rel.q - 55) / 8);
  }
});

// dupla de composição: as músicas de um ato com parceiro ativo saem melhores (créditos conjuntos)
registerMod('songQ', 'bonds9', (s, v, ctx) => {
  const A = ctx.act ?? (ctx.song ? s.acts[ctx.song.actId] : undefined);
  const st = (s.x4 as unknown as { bonds9?: BondsState }).bonds9;
  if (!A || !st?.list.length) return null;
  const b = st.list.find((x) => !x.end && x.k === 'duo' && x.p.some((p) => A.members.includes(p)));
  return b ? { value: v * (1 + b.str / 1000), label: fmtL(l('Dupla de composição ({n})', 'Songwriting duo ({n})'), { n: bondTitle(s, b) }) } : null;
});

registerSimHook('compose', 'bonds9', (s, _r, arg) => {
  const so = arg.song;
  const A = so ? s.acts[so.actId] : undefined;
  if (!A) return;
  for (const b of activeBonds(s)) if (b.k === 'duo' && b.p.some((p) => A.members.includes(p))) { b.works += 1; b.str = clamp(b.str + 1, 0, 100); }
});

