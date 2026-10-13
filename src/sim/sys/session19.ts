// Rodada 19 (Frente 9.2) — MÚSICOS DE ESTÚDIO COMO MERCADO. Os coletivos do agenda17 (Wrecking Crew, Funk Brothers,
// Nashville A-Team, Swampers, M.G.'s…) agora têm GENTE: cada um traz seus ases (baixo, bateria, teclado…) com habilidade,
// sucessos tocados, créditos e rancor. Fora do modo "Vida real exata" surgem coletivos fictícios por época.
//  • Contratar: o coletivo inteiro pelo agenda17 (bookCrew, "hire17") ou um ás avulso aqui (6 meses, com ou sem crédito na capa).
//  • Cada ás sobe UMA dimensão do disco (quality18: bateria → imediatismo, baixo → durabilidade, cordas → emoção…) e cresce
//    de verdade (vira pessoa: CA do ability18 sobe com as sessões).
//  • Tocou sem crédito em sucessos (seus ou dos rivais) → décadas depois o documentário (cinema/TV, screen18) revela a turma →
//    o rancor (holds17) vira processo por crédito (rights18 openDispute18) → alguns viram artistas (lineup16) ou tributo (tribute19).
// Modo exato: nomes reais com fatos documentados (documentários de 2002/2008/2013/2022), sem processos nem carreiras inventadas.

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, onFact, recentFacts } from '../facts17';
import { histMode } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { growPerson, langForCity, makePerson, personName } from '../people';
import { rng19 } from '../rng19';
import type { Act, GameState, Person, Song } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { CREWS, ag17, crewById, type Crew } from './agenda17';
import { caOf18 } from './ability18';
import { headline19 } from './factlink19';
import { goSolo16 } from './lineup16';
import { registerDimAdj18, type Dim18 } from './quality18';
import { openDispute18, r18 } from './rights18';
import { sc18 } from './screen18';
import { addStress } from '../stress17';
import { sess18 } from './session18';
import { cashWhy20, freeCash20 } from '../oblig20';

export type Inst19 = 'drums' | 'bass' | 'guitar' | 'keys' | 'horns' | 'strings' | 'vocal';
export const INST19: Record<Inst19, { name: L; dim: Dim18 }> = {
  drums: { name: l('bateria', 'drums'), dim: 'imm' },
  bass: { name: l('baixo', 'bass'), dim: 'dur' },
  guitar: { name: l('guitarra', 'guitar'), dim: 'tech' },
  keys: { name: l('teclados', 'keys'), dim: 'acc' },
  horns: { name: l('metais', 'horns'), dim: 'sgl' },
  strings: { name: l('cordas', 'strings'), dim: 'emo' },
  vocal: { name: l('vocal de apoio', 'backing vocals'), dim: 'acc' },
};

// Motown-era: as Andantes (vocal de apoio da Motown, 1959–72, sem crédito na maioria dos sucessos). Entra no catálogo do agenda17.
if (!crewById('andantes')) CREWS.push({ id: 'andantes', name: 'The Andantes', alt: l('Vocal de apoio da casa de Detroit', 'Detroit house backing vocalists'), city: 'detroit', from: 1959, to: 1972, fam: ['rnb', 'pop'], q: 0.84, fee: 4000, kind: 'studio', snd: l('o coro Motown', 'the Motown chorus'), note: l('Cantaram sem crédito atrás das Supremes, Marvin Gaye e Four Tops.', 'Sang uncredited behind the Supremes, Marvin Gaye and the Four Tops.') });

/** Ases reais (fatos documentados: quem tocava no coletivo) e o ano do documentário real. */
const REAL19: Record<string, { doc?: [number, string]; aces: [string, Inst19, number][] }> = {
  wrecking: { doc: [2008, 'The Wrecking Crew'], aces: [['Hal Blaine', 'drums', 1929], ['Carol Kaye', 'bass', 1935], ['Tommy Tedesco', 'guitar', 1930], ['Leon Russell', 'keys', 1942], ['Plas Johnson', 'horns', 1931]] },
  funk: { doc: [2002, 'Standing in the Shadows of Motown'], aces: [['James Jamerson', 'bass', 1936], ['Benny Benjamin', 'drums', 1925], ['Earl Van Dyke', 'keys', 1930], ['Robert White', 'guitar', 1936]] },
  andantes: { aces: [['Marlene Barrow', 'vocal', 1941], ['Jackie Hicks', 'vocal', 1939], ['Louvain Demps', 'vocal', 1938]] },
  ateam: { aces: [['Floyd Cramer', 'keys', 1933], ['Grady Martin', 'guitar', 1929], ['Buddy Harman', 'drums', 1928], ['Bob Moore', 'bass', 1932], ['Boots Randolph', 'horns', 1927]] },
  swampers: { doc: [2013, 'Muscle Shoals'], aces: [['Barry Beckett', 'keys', 1943], ['Roger Hawkins', 'drums', 1945], ['David Hood', 'bass', 1943], ['Jimmy Johnson', 'guitar', 1943]] },
  mgs: { aces: [['Steve Cropper', 'guitar', 1941], ['Donald "Duck" Dunn', 'bass', 1941], ['Al Jackson Jr.', 'drums', 1935], ['Booker T. Jones', 'keys', 1944]] },
  hi: { aces: [['Teenie Hodges', 'guitar', 1945], ['Charles Hodges', 'keys', 1947], ['Leroy Hodges', 'bass', 1946], ['Howard Grimes', 'drums', 1941]] },
  mfsb: { aces: [['Earl Young', 'drums', 1940], ['Ronnie Baker', 'bass', 1947], ['Norman Harris', 'guitar', 1947]] },
  section: { doc: [2022, 'Immediate Family'], aces: [['Russ Kunkel', 'drums', 1948], ['Leland Sklar', 'bass', 1947], ['Danny Kortchmar', 'guitar', 1946], ['Craig Doerge', 'keys', 1947]] },
};
/** Coletivos fictícios (só fora do modo exato). */
export const FICT19: { id: string; name: L; city: string; from: number; to: number; fam: FamilyId[] }[] = [
  { id: 'f_cellar', name: l('Os Gatos do Porão', 'The Cellar Cats'), city: 'new_york', from: 1925, to: 1958, fam: ['blues_jazz', 'pop'] },
  { id: 'f_feras', name: l('Os Feras do Estúdio', 'The Studio Beasts'), city: 'rio_de_janeiro', from: 1958, to: 1990, fam: ['brazil', 'pop', 'latin'] },
  { id: 'f_sunset', name: l('Seção Sunset Strip', 'The Sunset Strip Section'), city: 'los_angeles', from: 1972, to: 1995, fam: ['rock', 'pop'] },
  { id: 'f_grid', name: l('Turma do Grid', 'The Gridline Players'), city: 'london', from: 1985, to: 2012, fam: ['pop', 'electronic', 'rnb'] },
  { id: 'f_laptop', name: l('Orquestra de Laptops', 'The Laptop Orchestra'), city: 'stockholm', from: 2008, to: 9999, fam: ['pop', 'hiphop', 'electronic'] },
];

export interface Ace19 {
  id: string; name: string; crew: string; inst: Inst19; born: number; sk: number; real?: 1;
  pid?: string; hits: number; unc: number; cred: number; grudge: number; fame: number;
  plays: string[]; hire?: { act: string; until: number; credit: boolean }; sued?: number; star?: string;
  /** R29 (integrante): músico de banda contratado avulso (crew = FREE19), com a família do gênero da banda dele */
  fam?: FamilyId;
}
/** R29: "coletivo" dos músicos de banda contratados como avulsos pela oferta a integrante (sys/member29). */
export const FREE19 = 'free';
export interface Ses19State { house?: { name: string; fam: FamilyId; from: number; to?: number; credit: boolean }; aces: Ace19[]; seq: number; docs: Record<string, number>; on: Record<string, string[]>; cr: Record<string, string[]>; hc: Record<string, 1>; seen: Record<string, 1>; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { ses19: Ses19State } }
const fresh = (): Ses19State => ({ aces: [], seq: 0, docs: {}, on: {}, cr: {}, hc: {}, seen: {}, log: [] });
registerExt4('ses19', fresh);
export function ses19(s: GameState): Ses19State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.ses19 ??= fresh()) as Ses19State;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
const log = (s: GameState, t: L) => { const st = ses19(s); st.log.push({ w: s.week, t }); if (st.log.length > 24) st.log.shift(); };
const exact = (s: GameState) => histMode(s) === 'strict';

interface Coll19 { id: string; name: L; city: string; from: number; to: number; fam: FamilyId[]; real: boolean }
/** Todos os coletivos que já existiram até este ano (reais sempre; fictícios fora do modo exato). */
export function collectives19(s: GameState, onlyNow = false): Coll19[] {
  const out: Coll19[] = [];
  for (const c of CREWS) if (REAL19[c.id] && c.from <= s.year && (!onlyNow || s.year <= c.to)) out.push({ id: c.id, name: crewName19(s, c), city: c.city, from: c.from, to: c.to, fam: c.fam, real: true });
  const h = ses19(s).house;
  if (h && h.from <= s.year && (!onlyNow || !h.to)) out.push({ id: 'house', name: l(h.name, h.name), city: s.config.homeCity, from: h.from, to: h.to ?? 9999, fam: [h.fam], real: false });
  if (!exact(s)) for (const f of FICT19) if (f.from <= s.year && (!onlyNow || s.year <= f.to)) out.push({ ...f, real: false });
  return out;
}
const crewName19 = (s: GameState, c: Crew): L => (c.name && s.config.realNames ? l(c.name, c.name) : c.alt);
export const collName19 = (s: GameState, id: string): L => { if (id === FREE19) return l('avulso (de banda)', 'freelance (band member)'); if (id === 'house') { const n = ses19(s).house?.name ?? '?'; return l(n, n); } const c = crewById(id); if (c) return crewName19(s, c); return FICT19.find((f) => f.id === id)?.name ?? l(id, id); };

/** Garante os ases dos coletivos que já chegaram (determinístico por semente). */
function ensureAces(s: GameState): void {
  const st = ses19(s), hb = sess18(s).hb;
  // banda da casa (session18): os músicos dela entram no mercado como coletivo "house"
  if (hb && (!st.house || st.house.to)) { st.house = { name: hb.name, fam: hb.fam, from: s.year, credit: hb.credit }; st.aces = st.aces.filter((a) => a.crew !== 'house'); }
  if (st.house) { if (hb) st.house.credit = hb.credit; else st.house.to ??= s.year; }
  if (hb && !st.aces.some((a) => a.crew === 'house')) {
    const ins: Inst19[] = ['drums', 'bass', 'guitar', 'keys', 'horns'];
    hb.players.forEach((nm, i) => st.aces.push({ id: `ac${++st.seq}`, name: nm, crew: 'house', inst: ins[i % 5], born: s.year - 30, sk: Math.round(40 + hb.q * 50), hits: 0, unc: 0, cred: 0, grudge: 0, fame: 0, plays: [] }));
  }
  for (const c of collectives19(s)) {
    if (st.aces.some((a) => a.crew === c.id)) continue;
    const r = Rng.fromSeed(`${s.config.seed}|ses19|${c.id}`);
    const real = REAL19[c.id];
    const rows: [string, Inst19, number][] = real ? real.aces : (['drums', 'bass', 'guitar', 'keys'] as Inst19[]).map((i) => [personName(r, langForCity(c.city, r)), i, c.from - r.int(20, 32)]);
    for (const [nm, inst, born] of rows) {
      st.aces.push({ id: `ac${++st.seq}`, name: c.real && !s.config.realNames ? personName(r, langForCity(c.city, r)) : nm, crew: c.id, inst, born, sk: Math.round(clamp(62 + r.normal(0, 8) + (c.real ? 12 : 0), 45, 95)), ...(c.real && s.config.realNames ? { real: 1 as const } : {}),
        hits: 0, unc: 0, cred: 0, grudge: 0, fame: 0, plays: [] });
    }
  }
}
const collOf = (s: GameState, a: Ace19) => collectives19(s).find((c) => c.id === a.crew);
/** Disponível para contratar: coletivo na ativa, vivo, sem carreira solo. */
export const hireable19 = (s: GameState, a: Ace19): boolean => { const c = collOf(s, a); return (a.crew === FREE19 || (!!c && s.year <= c.to + 8)) && s.year - a.born < 72 && !a.star && (!a.pid || !!s.persons[a.pid]?.alive); };
export const aceFee19 = (s: GameState, a: Ace19, credit: boolean): number => money(s, (500 + a.sk * 22) * (credit ? 1.25 : 1));
export const market19 = (s: GameState): Ace19[] => { ensureAces(s); return ses19(s).aces.filter((a) => a.crew !== 'house' && a.crew !== FREE19 && hireable19(s, a)); }; // R29: o avulso de banda só pela oferta a integrante (um caminho só)

/** O ás vira pessoa (para crescer pelo ability18, processar e virar artista). */
function personOf(s: GameState, a: Ace19): Person {
  if (a.pid && s.persons[a.pid]) return s.persons[a.pid];
  const c = collOf(s, a);
  const r = Rng.fromSeed(`${s.config.seed}|ses19p|${a.id}`);
  const role: Person['role'] = a.inst === 'vocal' ? 'vocal' : a.inst;
  const p = makePerson(s, r, { lang: langForCity(c?.city ?? s.config.homeCity, r), role, potential: clamp(a.sk + 8, 40, 99), born: a.born, startFrac: 0.6, name: a.name });
  p.skills.instr = Math.max(p.skills.instr, a.sk);
  if (a.inst === 'vocal') p.skills.voice = Math.max(p.skills.voice, a.sk);
  s.persons[p.id] = p;
  a.pid = p.id;
  return p;
}
export const aceCA19 = (s: GameState, a: Ace19): number => Math.round(a.pid && s.persons[a.pid] ? caOf18(s.persons[a.pid]) : a.sk * 1.3);

/** Contrata um ás avulso por 6 meses (o mesmo caminho de custo do agenda17: gravação). */
export function hireAce19(s: GameState, aceId: string, actId: string, credit: boolean): L | null {
  const a = ses19(s).aces.find((x) => x.id === aceId), act = s.acts[actId];
  if (!a || !hireable19(s, a)) return l('Indisponível.', 'Unavailable.');
  if (!act || act.owner !== 'player') return l('Escolha um ato do seu elenco.', 'Pick an act from your roster.');
  if (a.hire && a.hire.until >= s.week) return l('Já está contratado.', 'Already hired.');
  const fee = aceFee19(s, a, credit) * 6;
  if (freeCash20(s) < fee) return cashWhy20(s, fee, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `ses19:${a.id}:${actId}`, -fee, 'recording', `Músico de sessão: ${a.name} · ${act.name}`);
  a.hire = { act: actId, until: s.week + 26, credit };
  const p = personOf(s, a);
  const t = fmtL(l('{n} ({i}, {c}) grava com {a} por 6 meses{k}.', '{n} ({i}, {c}) records with {a} for 6 months{k}.'), { n: a.name, i: INST19[a.inst].name, c: collName19(s, a.crew), a: act.name, k: credit ? l(', com crédito na capa', ', with sleeve credit') : l(', sem crédito', ', uncredited') });
  emitFact(s, { kind: 'hire', actors: ['player', act.id, p.id], severity: a.real ? 25 : 12, visibility: a.real ? 'public' : 'rumor', tags: ['good', 'hire', 'session'], text: t, src: 'session19' });
  if (credit) emitFact(s, { kind: 'session_credit', actors: [p.id, 'player', act.id], severity: 15, visibility: 'public', tags: ['good', 'session', 'credit'], text: fmtL(l('{n} sai na capa dos discos de {a}.', '{n} gets sleeve credit on {a}\'s records.'), { n: a.name, a: act.name }), src: 'session19' });
  log(s, t);
  return null;
}
/** Dar crédito retroativo (capa das reedições + pontos): zera o rancor, custa. */
export const backCreditCost19 = (s: GameState, a: Ace19) => money(s, 1500 + a.hits * 900);
export function backCredit19(s: GameState, aceId: string): L | null {
  const st = ses19(s), a = st.aces.find((x) => x.id === aceId);
  if (!a) return l('Desconhecido.', 'Unknown.');
  const mine = a.plays.filter((sid) => !(st.cr[sid] ?? []).includes(a.id));
  if (!mine.length) return l('Nada a creditar nos seus discos.', 'Nothing to credit on your records.');
  const c = backCreditCost19(s, a);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `ses19bc:${a.id}`, -c, 'royalties', `Crédito retroativo: ${a.name}`);
  for (const sid of mine) (st.cr[sid] ??= []).push(a.id);
  a.cred += mine.length; a.grudge = Math.max(0, a.grudge - 40);
  const p = personOf(s, a);
  emitFact(s, { kind: 'session_credit', actors: [p.id, 'player'], severity: 20 + a.hits * 3, visibility: 'public', tags: ['good', 'session', 'credit', 'retro'], text: fmtL(l('{c} reconhece {n} nos créditos de {k} faixa(s) — décadas de atraso, mas veio.', '{c} credits {n} on {k} track(s) — decades late, but it came.'), { c: s.config.companyName, n: a.name, k: mine.length }), src: 'session19' });
  return null;
}

// ---------------------------------------------------------------- qualidade (quality18)
registerDimAdj18('session19', (s, rel, act) => {
  const st = ses19(s);
  const out: { d: Dim18; v: number; why: L }[] = [];
  const done = new Set<string>();
  let tot = 0;
  for (const sid of rel.songs) for (const id of st.on[sid] ?? []) {
    if (done.has(id) || tot >= 8) continue;
    const a = st.aces.find((x) => x.id === id);
    if (!a) continue;
    done.add(id);
    const fit = a.fam ? a.fam === familyOf(act.genre) : collOf(s, a)?.fam.includes(familyOf(act.genre)) ?? false;
    const v = Math.min(8 - tot, Math.round((1 + a.sk / 25) * (fit ? 1 : 0.5) + ((st.cr[sid] ?? []).includes(id) ? 1 : 0)));
    if (v <= 0) continue;
    tot += v;
    out.push({ d: INST19[a.inst].dim, v, why: fmtL(l('{n} ({i}) nas sessões', '{n} ({i}) on the sessions'), { n: a.name, i: INST19[a.inst].name }) });
  }
  return out;
});

// ---------------------------------------------------------------- mês
const cutoff = (s: GameState) => s.week - 5;
function playMonth(s: GameState): void {
  const st = ses19(s), ag = ag17(s);
  const mk = s.year * 12 + s.month;
  // quem toca neste mês: ases avulsos contratados + o coletivo inteiro reservado pelo agenda17
  const playing: [Ace19, string, boolean][] = [];
  for (const a of st.aces) if (a.hire && a.hire.until >= s.week && s.acts[a.hire.act]) playing.push([a, a.hire.act, a.hire.credit]);
  const hb = sess18(s).hb;
  if (hb && hb.strike <= s.week) for (const a of st.aces) if (a.crew === 'house' && hb.players.includes(a.name)) for (const id of playerActs(s)) if (familyOf(s.acts[id]?.genre ?? '') === hb.fam && !playing.some((p) => p[0] === a)) playing.push([a, id, hb.credit]);
  for (const x of ag.sess) if (x.kind === 'studio' && x.until >= mk && x.start <= mk && s.acts[x.actId]) for (const a of st.aces) if (a.crew === x.crew && hireable19(s, a) && !playing.some((p) => p[0] === a)) playing.push([a, x.actId, false]);
  for (const [a, actId, credit] of playing) {
    const act = s.acts[actId];
    const fresh = (act.songs ?? []).filter((sid) => { const so = s.songs[sid]; return so?.recorded && so.createdWeek > cutoff(s) && !(st.on[sid] ?? []).includes(a.id); });
    for (const sid of fresh.slice(0, 6)) {
      (st.on[sid] ??= []).push(a.id);
      a.plays.push(sid);
      if (credit) { (st.cr[sid] ??= []).push(a.id); a.cred++; } else a.unc++;
    }
    if (a.plays.length > 40) a.plays.splice(0, a.plays.length - 40);
    if (fresh.length) { const p = personOf(s, a); growPerson(p, 'instr', 0.5); a.sk = Math.min(99, Math.max(a.sk, p.skills.instr)); }
  }
  // hits dos seus discos: crédito ou rancor
  for (const a of st.aces) for (const sid of a.plays) {
    if (st.hc[`${a.id}:${sid}`]) continue;
    const so = s.songs[sid], rel = so?.releaseId ? s.releases[so.releaseId] : undefined;
    if (!rel || !rel.peak || rel.peak > 10) continue;
    st.hc[`${a.id}:${sid}`] = 1;
    a.hits++;
    if (!(st.cr[sid] ?? []).includes(a.id)) a.grudge = clamp(a.grudge + 8, 0, 100);
  }
  for (const a of st.aces) if (a.hire && a.hire.until < s.week) { log(s, fmtL(l('Termina o contrato de {n}.', '{n}\'s contract ends.'), { n: a.name })); a.hire = undefined; }
  const so = Object.keys(st.on);
  if (so.length > 400) for (const k of so.slice(0, so.length - 400)) { delete st.on[k]; delete st.cr[k]; }
}

/** Sucessos dos outros: os ases do coletivo do gênero tocaram neles, sem crédito (só enquanto o coletivo existe). */
function npcHits(s: GameState, r: Rng): void {
  const st = ses19(s);
  const now = collectives19(s, true);
  if (!now.length) return;
  for (const f of recentFacts(s, { kind: 'chart', months: 1, limit: 8 })) {
    if (st.seen[f.id]) continue;
    st.seen[f.id] = 1;
    const act = s.acts[f.actors[0]];
    if (!act || act.owner === 'player' || act.playerBand) continue;
    const cs = now.filter((c) => c.fam.includes(familyOf(act.genre)));
    if (!cs.length || !r.chance(0.6)) continue;
    const c = r.pick(cs), aces = st.aces.filter((a) => a.crew === c.id);
    if (!aces.length) continue;
    const a = r.pick(aces);
    a.hits++; a.unc++; a.grudge = clamp(a.grudge + 2, 0, 100);
  }
  const ks = Object.keys(st.seen);
  if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete st.seen[k];
}

/** Documentário: 15+ anos depois do fim do coletivo, a tela revela quem tocou. Modo exato: só os reais, no ano real. */
/** r28 F8: multiplicador da chance do documentário (1 = normal; o chains28 sobe quando a cadeia 1 está parada nele). */
export const DOC_K19: { f?: (s: GameState) => number } = {};
function documentaries(s: GameState, r: Rng): void {
  const st = ses19(s);
  for (const c of collectives19(s)) {
    if (st.docs[c.id]) continue;
    const real = REAL19[c.id];
    const aces = st.aces.filter((a) => a.crew === c.id);
    const unc = aces.reduce((t, a) => t + a.unc, 0);
    let go = false;
    if (exact(s)) go = !!real?.doc && s.year === real.doc[0] && s.month === 5;
    else go = s.year >= 1985 && s.year >= c.to + 15 && unc >= 3 && r.chance((0.006 + unc / 6000) * (DOC_K19.f?.(s) ?? 1)); // r28 F8: chains28 acelera quando a cadeia 1 espera o documentário
    if (!go) continue;
    st.docs[c.id] = s.year;
    const title = real?.doc && (exact(s) || s.config.realNames) ? real.doc[1] : fmtL(l('Nas Sombras de {c}', 'In the Shadows of {c}'), { c: collName19(s, c.id) }).pt;
    for (const a of aces) { a.fame = clamp(a.fame + 20 + a.hits, 0, 100); if (a.unc) a.grudge = clamp(a.grudge + 15, 0, 100); }
    const t = fmtL(l('Documentário "{d}" revela {c}: os músicos sem nome por trás de {h} sucessos.', 'Documentary "{d}" reveals {c}: the nameless players behind {h} hits.'), { d: title, c: collName19(s, c.id), h: Math.max(unc, aces.reduce((x, a) => x + a.hits, 0)) });
    const top = aces.slice().sort((x, y) => y.hits - x.hits)[0];
    if (top) personOf(s, top);
    emitFact(s, { kind: 'session_credit', actors: aces.map((a) => a.pid ?? '').filter(Boolean).slice(0, 4), severity: 45, visibility: 'public', tags: ['session', 'credit', 'doc', 'screen'], text: t, src: 'session19', data: { crew: c.id } });
    headline19(s, t, 3);
    log(s, t);
    // seus discos aparecem no filme: licenciar o material e reconhecer a turma, ou recusar
    const mine = aces.filter((a) => a.plays.some((sid) => !(st.cr[sid] ?? []).includes(a.id)));
    if (mine.length && s.config.role !== 'artist') {
      const fee = docFee19(s);
      pushInbox18(s, 'ses19_doc', { from: title, subject: fmtL(l('"{d}" quer suas fitas', '"{d}" wants your tapes'), { d: title }),
        body: fmtL(l('A produção do documentário quer licenciar gravações em que {n} tocaram sem crédito. Licenciar ({f}) = o filme mostra seu selo reconhecendo a turma (rancor −20). Recusar = eles contam a história sem você (rancor +10).', 'The documentary wants to license recordings where {n} played uncredited. License ({f}) = the film shows your label acknowledging them (grudge −20). Refuse = they tell the story without you (grudge +10).'), { n: mine.map((a) => a.name).join(', '), f: `$${Math.round(fee / 100).toLocaleString('en-US')}` }),
        ref: { crew: c.id }, actions: [{ id: 'lic', label: l('Licenciar e reconhecer', 'License and acknowledge') }, { id: 'no', label: l('Recusar', 'Refuse') }] });
    }
  }
}
/** Valor da licença das fitas: sobe com a reputação do selo em cinema/TV (screen18). */
export const docFee19 = (s: GameState): number => money(s, 3000 * (1 + clamp(sc18(s).rep, 0, 100) / 100));

/** Rancor vira processo; fama do documentário vira carreira. */
function aftermath(s: GameState, r: Rng): void {
  const st = ses19(s);
  for (const a of st.aces) {
    const doc = st.docs[a.crew];
    if (!doc || a.real && exact(s)) continue;
    const alive = !a.pid || s.persons[a.pid]?.alive;
    if (!alive || s.year - a.born > 88) continue;
    if (!a.sued && a.grudge >= 45 && s.year <= doc + 8 && r.chance(0.05 + a.grudge / 1500)) { sue(s, a, r); continue; }
    if (!a.star && a.fame >= 30 && s.year - a.born < 62 && r.chance(0.015 + a.fame / 4000)) becomeStar(s, a, r);
  }
}
function sue(s: GameState, a: Ace19, r: Rng): void {
  const st = ses19(s);
  a.sued = s.year;
  const p = personOf(s, a);
  // alvo: um sucesso seu em que tocou sem crédito; se não houver, o selo do sucesso alheio
  const hit = a.plays.map((sid) => s.songs[sid]).find((so): so is Song => !!so && !(st.cr[so.id] ?? []).includes(a.id) && !!so.releaseId && (s.releases[so.releaseId]?.peak ?? 0) > 0 && s.releases[so.releaseId].peak <= 10);
  if (hit && !r18(s).disp.some((d) => d.song === hit.id && d.st !== 'done')) {
    const share = Math.round((0.05 + r.next() * 0.07) * 100) / 100;
    grantHold(s, { holder: p.id, target: 'player', kind: 'grievance', strength: 30 + Math.round(a.grudge / 3), text: fmtL(l('{n} tocou em "{t}" e nunca teve o nome no disco.', '{n} played on "{t}" and never had their name on the record.'), { n: a.name, t: hit.title }), months: 120, src: 'session19' });
    const t = fmtL(l('Depois do documentário, {n} processa {c} por crédito em "{t}" ({p}% da obra).', 'After the documentary, {n} sues {c} for credit on "{t}" ({p}% of the work).'), { n: a.name, c: s.config.companyName, t: hit.title, p: Math.round(share * 100) });
    emitFact(s, { kind: 'session_lawsuit', actors: [p.id, 'player', hit.actId], severity: 45, visibility: 'public', tags: ['bad', 'session', 'credit', 'court'], text: t, src: 'session19' });
    openDispute18(s, hit, s.releases[hit.releaseId!], `p:${p.id}`, a.name, 'credit', share);
    return;
  }
  const lb = r.pick(Object.values(s.labels).filter((x) => x.active));
  const t = fmtL(l('{n} ({c}) processa {l} por crédito e royalties dos sucessos em que tocou de graça.', '{n} ({c}) sues {l} for credit and royalties on the hits they played for scale.'), { n: a.name, c: collName19(s, a.crew), l: lb?.name ?? '?' });
  emitFact(s, { kind: 'session_lawsuit', actors: [p.id, ...(lb ? [lb.id] : [])], severity: 35, visibility: 'public', tags: ['session', 'credit', 'court'], text: t, src: 'session19' });
}
function becomeStar(s: GameState, a: Ace19, r: Rng): void {
  const p = personOf(s, a);
  const host = a.plays.map((sid) => s.acts[s.songs[sid]?.actId ?? '']).find((x): x is Act => !!x) ?? Object.values(s.acts).find((x) => x.status === 'active' && (collOf(s, a)?.fam ?? []).includes(familyOf(x.genre)));
  if (!host) return;
  const solo = goSolo16(s, r, p, host);
  solo.fame = Math.max(solo.fame, clamp(8 + a.fame / 2, 5, 45));
  a.star = solo.id;
  const t = fmtL(l('Do anonimato ao palco: {n}, de {c}, lança carreira própria.', 'From anonymity to the stage: {n}, of {c}, launches a career of their own.'), { n: a.name, c: collName19(s, a.crew) });
  emitFact(s, { kind: 'session_star', actors: [solo.id, p.id], severity: 30 + a.fame / 3, visibility: 'public', tags: ['good', 'session', 'rise'], text: t, src: 'session19', data: { crew: a.crew, hits: a.hits } });
  log(s, t);
}

registerSimHook('month', 'session19', (s) => {
  if (s.year < 1925) return;
  ensureAces(s);
  const r = rng19(s, 'ses19', () => Rng.fromSeed(`${s.config.seed}|ses19m|${s.week}`));
  playMonth(s);
  npcHits(s, r);
  documentaries(s, r);
  aftermath(s, r);
});

// ---------------------------------------------------------------- ouvintes (fatos)
onFact('session_credit', (s, f) => {
  if (!f.actors.includes('player')) return;
  s.player.reputation.artists = clamp(s.player.reputation.artists + (f.tags.includes('retro') ? 2 : 1), 0, 100);
}, 'session19:rep');
onFact('session_lawsuit', (s, f) => {
  const act = s.acts[f.actors[2] ?? ''];
  if (act) for (const pid of act.members) addStress(s, pid, 4, l('Processo de músico de estúdio', 'Session player lawsuit'));
  headline19(s, f.text, 2);
}, 'session19:suit');
onFact('session_star', (s, f) => { headline19(s, f.text, 2); }, 'session19:star');
onFact('credit_dispute', (s, f) => {
  const a = ses19(s).aces.find((x) => x.pid && x.pid === f.actors[0]);
  if (a) { a.sued ??= s.year; a.grudge = Math.max(0, a.grudge - 10); }
}, 'session19:dispute');

registerInboxKind('ses19_doc', { label: l('Documentário', 'Documentary'), cat: 'deals', icon: 'film', prio: 2, goto: () => ({ area: 'studio', tab: ['creation-studio', 'session19'] }),
  handle: (s, m, act) => {
    const st = ses19(s), crew = String(m.ref?.crew ?? '');
    const aces = st.aces.filter((a) => a.crew === crew);
    if (act === 'lic') {
      post(s, `ses19doc:${crew}`, docFee19(s), 'licensing', 'Licença de fitas para documentário');
      for (const a of aces) a.grudge = Math.max(0, a.grudge - 20);
      emitFact(s, { kind: 'session_credit', actors: ['player'], severity: 25, visibility: 'public', tags: ['good', 'session', 'credit', 'doc'], text: fmtL(l('{c} abre os arquivos e reconhece {n} no filme.', '{c} opens its vaults and acknowledges {n} on screen.'), { c: s.config.companyName, n: collName19(s, crew) }), src: 'session19' });
      return l('O filme mostra seu selo dando nome aos músicos. Rancor −20, licença paga.', 'The film shows your label naming the players. Grudge −20, license paid.');
    }
    for (const a of aces) a.grudge = clamp(a.grudge + 10, 0, 100);
    return l('Contam a história sem você — e você fica como o vilão do filme. Rancor +10.', 'They tell the story without you — and you end up the film\'s villain. Grudge +10.');
  } });

registerExplain('ses19.ace', (s, c) => {
  const a = ses19(s).aces.find((x) => x.id === String(c.ace));
  if (!a) return null;
  return { title: fmtL(l('{n}: rancor', '{n}: grudge'), { n: a.name }), value: Math.round(a.grudge), fmt: 'num', parts: [
    { label: l('Sucessos tocados', 'Hits played on'), value: a.hits, fmt: 'num' },
    { label: l('Faixas sem crédito', 'Uncredited tracks'), value: a.unc, fmt: 'num', tone: a.unc ? 'bad' : '' },
    { label: l('Faixas com crédito', 'Credited tracks'), value: a.cred, fmt: 'num', tone: a.cred ? 'good' : '' },
    { label: l('Fama (documentário)', 'Fame (documentary)'), value: a.fame, fmt: 'num' },
  ], note: l('Hit seu sem crédito +8; hit alheio +2; documentário +15. Com 45+ depois do filme, pode processar por % da obra.', 'Your hit uncredited +8; someone else\'s +2; documentary +15. At 45+ after the film, they may sue for a % of the work.') };
});
registerAdvisorTip('session19', (s) => {
  const st = ses19(s);
  const a = st.aces.filter((x) => x.grudge >= 35 && !x.sued && x.plays.some((sid) => !(st.cr[sid] ?? []).includes(x.id))).sort((x, y) => y.grudge - x.grudge)[0];
  if (!a) return [];
  return [{ id: 'ses19-grudge', level: 'warn', cat: 'people', score: 50, text: fmtL(l('{n} tocou nos seus discos sem crédito (rancor {g}).', '{n} played on your records uncredited (grudge {g}).'), { n: a.name, g: Math.round(a.grudge) }),
    why: [l('Um documentário pode transformar isso em processo.', 'A documentary can turn this into a lawsuit.')], effect: fmtL(l('Crédito retroativo: {v}, rancor −40.', 'Back credit: {v}, grudge −40.'), { v: `$${Math.round(backCreditCost19(s, a) / 100).toLocaleString('en-US')}` }),
    run: { label: l('Dar crédito', 'Give credit'), fn: (s2) => backCredit19(s2, a.id) ?? l('Feito.', 'Done.') } }];
});

/** Para a interface: ases em que vale prestar atenção (os que tocaram com você e os famosos). */
export const myAces19 = (s: GameState): Ace19[] => ses19(s).aces.filter((a) => a.plays.length || a.hire || a.sued || a.star);
export const actsForHire19 = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
/** Para testes: etapas internas do mês. */
export const _ses19 = { playMonth, npcHits, documentaries, aftermath, sue, becomeStar, ensureAces };
