// Rodada 17 — CRIME (núcleo). Organizações reais/fictícias por era, ações de todos contra todos com chance e
// risco de exposição VISÍVEIS (com o porquê), custo, calor policial por país/época (FBI, Scotland Yard, Polícia
// Federal…), casos que viram indiciamento → delação/julgamento/suborno/fuga, prisão de artistas (com carreira
// atrás das grades), conluio entre gravadoras (risco dividido, traição, informantes), roubo de relíquias e
// mercado negro (receptadores, compradores, autenticidade, apreensão). Tudo publica Fatos (secreto → boato →
// público), cria obrigações (testemunhas, medo, chantagem), estresse, escândalo e mexe em relações.
// Regras de história: assassinato nunca envolve pessoa real (viva ou não); no modo "Vida real exata" pessoas e
// selos reais não cometem crimes inventados (só a crônica documentada em DOC17).

import { clamp, Rng, seedState } from '../../core/rng';
import { formatMoney } from '../../core/money';
import { countryName, countryOfCity } from '../../data/geo';
import { DOC17, ORGS17, type OrgDef17, type Racket17 } from '../../data/orgs17';
import { cityById, l, type L } from '../../data/world';
import { personDies } from '../dynasty';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, type Fact } from '../facts17';
import { grantHold, holdsBetween } from '../holds17';
import { histMode } from '../history15';
import { RELICS17, relic9Of17 } from '../relics17';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState, Label, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { legal15 } from './dispute15';
import { leaderOf } from './leaders10';
import { playerPerson } from './life';
import { per13, registerPer13 } from './persona13';
import { addRelic, relics, type Relic } from './relics9';
import { allReleases17 } from '../relidx17';

// ================================================================ estado

export interface CrimeLog17 { w: number; y: number; m: number; actor: string; target: string; c: string; ok: boolean; ex: boolean; text: L; mine: boolean }
export interface Case17 {
  id: string; who: string; a3: string; ev: number; stage: 'open' | 'charged' | 'closed'; w: number;
  /** prazo (semana) para o jogador decidir após o indiciamento */
  dl?: number; n: number; org: number; inf: string[]; out?: L; rico?: 1; sev: number;
}
export interface Warn17 { id: string; actor: string; c: string; target: string; method?: string; w: number; dl: number; partners: string[]; org?: string }
export interface Offer17 { id: string; rl: string; fence: number; price: number; auth: number; until: number; seller: string }
export interface Crime17State {
  heat: Record<string, number>; nh: Record<string, number>; cases: Case17[]; log: CrimeLog17[];
  org: Record<string, number>; laund: Record<string, number>; stash: string[]; hot: Record<string, string>; rcity: Record<string, string>;
  seeded: Record<string, 1>; sec: number; jail: Record<string, { u: number; a3: string; why: L; album?: 1 }>; rig: Record<string, number>; rigBad: Record<string, number>;
  boot: Record<string, number>; pizzo: Record<string, number>; exile: Record<string, 1>; doc: Record<string, 1>; parole: number; seq: number;
  market: Offer17[]; warn: Warn17[]; ties: Record<string, string>; feud: Record<string, number>; vend: Record<string, number>; npcN: number; fake: Record<string, 1>;
  /** organização desmantelada (semana até quando) */
  down: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { crime17: Crime17State } }
const fresh = (): Crime17State => ({ heat: {}, nh: {}, cases: [], log: [], org: {}, laund: {}, stash: [], hot: {}, rcity: {}, seeded: {}, sec: 0, jail: {}, rig: {}, rigBad: {}, boot: {}, pizzo: {}, exile: {}, doc: {}, parole: 0, seq: 0, market: [], warn: [], ties: {}, feud: {}, vend: {}, npcN: 0, fake: {}, down: {} });
registerExt4('crime17', fresh);
const FILLED = new WeakSet<object>();
export function crime17(s: GameState): Crime17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.crime17 ??= fresh()) as Crime17State;
  if (FILLED.has(st)) return st; // completa campos de saves antigos uma vez por objeto (sem alocar a cada leitura)
  const f = fresh();
  for (const k of Object.keys(f) as (keyof Crime17State)[]) if (st[k] === undefined) (st as unknown as Record<string, unknown>)[k] = f[k];
  FILLED.add(st);
  return st;
}
/** Dinheiro (centavos) como texto bilíngue. */
export const usd = (c: number): L => l(formatMoney(Math.round(c), 'pt-BR'), formatMoney(Math.round(c), 'en-US'));
const nid = (s: GameState, p: string): string => `${p}${++crime17(s).seq}`;
export const mIdx = (s: GameState): number => s.year * 12 + s.month;
/** RNG próprio e determinístico (não consome o do jogo). */
export const crng = (s: GameState, tag: string): Rng => new Rng(seedState(`crime17|${s.config.seed}|${tag}|${s.week}|${crime17(s).seq}`));

// ================================================================ organizações

export interface Org17 extends OrgDef17 { key: string; a3: string }
export function orgs17(s: GameState, all = false): Org17[] {
  const home = s.config.homeCity;
  return ORGS17.filter((o) => all || (o.from <= s.year && s.year <= o.to)).map((o) => {
    const city = o.city || home;
    return { ...o, city, key: `o:${o.id}`, a3: countryOfCity(city) ?? 'USA' };
  });
}
export const orgById = (s: GameState, id: string): Org17 | undefined => orgs17(s, true).find((o) => o.id === id || o.key === id);
export const hasRacket = (o: OrgDef17, r: Racket17): boolean => o.rackets.includes(r);
const BOSS_FICT = ['"Tio" Vicente', 'Dona Lurdes', 'Big Moe', 'Sr. Kowalski', 'Nico "Faca"'];
export const bossName = (o: OrgDef17): L => o.boss ? l(o.boss) : o.real ? fmtL(l('a cúpula de {o}', 'the leadership of {o}'), { o: o.name }) : l(BOSS_FICT[o.id.length % BOSS_FICT.length]);

registerPer13('o', (s, id) => {
  const o = orgById(s, id);
  if (!o) return null;
  return { kind: 'npc', name: `${bossName(o).pt} (${o.name.pt})`, city: o.city || s.config.homeCity, job: 'boss', attrs: { ear: 30, neg: 60 + o.power / 4, cha: 55, mgmt: 50 + o.power / 3, img: 30 }, facets: o.f ?? {} };
});

// ================================================================ quem é real (regras de história)

let realMemo: { s: GameState; m: number; set: Set<string> } | null = null;
function realPersons(s: GameState): Set<string> {
  if (realMemo && realMemo.s === s && realMemo.m === mIdx(s)) return realMemo.set;
  const set = new Set<string>();
  for (const a of Object.values(s.acts)) if (a.catalogNo) for (const m of a.members) set.add(m);
  realMemo = { s, m: mIdx(s), set };
  return set;
}
/** Pessoa/ato/selo/org real (ou executivo/empresário/produtor real). */
export function isReal(s: GameState, id: string): boolean {
  if (!id || id === 'player') return false;
  if (id.startsWith('e:') || id.startsWith('pd:')) return true;
  if (id.startsWith('o:')) return !!orgById(s, id)?.real;
  const k = id.startsWith('p:') ? id.slice(2) : id;
  if (s.persons[k]) return realPersons(s).has(k);
  if (s.acts[k]) return !!s.acts[k].catalogNo;
  const lb = s.labels[k];
  if (lb) return k.startsWith('x_') || !!leaderOf(s, k)?.real;
  return false;
}

// ================================================================ nomes e lugares

export function nameOf17(s: GameState, id: string): string {
  if (id === 'player') return s.config.companyName;
  const o = id.startsWith('o:') ? orgById(s, id) : undefined;
  if (o) return o.name.pt === o.name.en ? o.name.pt : `${o.name.pt}`;
  const rl = relics(s).list.find((x) => x.id === id);
  if (rl) return rl.n.pt;
  return s.persons[id]?.name ?? s.acts[id]?.name ?? s.labels[id]?.name ?? id;
}
const actOfPerson = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid) && a.status !== 'split' && a.status !== 'retired') ?? Object.values(s.acts).find((a) => a.members.includes(pid));
/** Cidade onde o crime acontece (alvo). */
export function placeOf(s: GameState, id: string): string {
  if (id === 'player') return s.config.homeCity;
  if (s.persons[id]) return actOfPerson(s, id)?.city ?? s.config.homeCity;
  if (s.acts[id]) return s.acts[id].city;
  if (s.labels[id]) return s.labels[id].city;
  if (id.startsWith('o:')) return orgById(s, id)?.city ?? s.config.homeCity;
  return crime17(s).rcity[id] ?? s.config.homeCity;
}
export const a3Of = (s: GameState, city: string): string => countryOfCity(city) ?? countryOfCity(s.config.homeCity) ?? 'USA';
/** Quem responde pelo alvo: dono do ato/selo ('player' quando é seu). */
export function ownerOfTarget(s: GameState, id: string): string | undefined {
  if (id === 'player') return 'player';
  const a = s.persons[id] ? actOfPerson(s, id) : s.acts[id];
  if (a) return a.owner === 'player' || a.playerBand ? 'player' : a.owner || undefined;
  if (s.labels[id]) return id;
  const rl = relics(s).list.find((x) => x.id === id);
  if (rl) return rl.st === 'player' ? 'player' : undefined;
  return undefined;
}
const isMine = (s: GameState, id: string): boolean => ownerOfTarget(s, id) === 'player';

// ================================================================ polícia por país/época

export function agency(s: GameState, a3: string): L {
  const y = s.year;
  switch (a3) {
    case 'USA': return y < 1935 ? l('Bureau of Investigation', 'Bureau of Investigation') : l('FBI', 'FBI');
    case 'BRA': return y >= 1964 && y <= 1985 ? l('DOPS / Polícia Federal', 'DOPS / Federal Police') : l('Polícia Federal', 'Federal Police');
    case 'GBR': return l('Scotland Yard', 'Scotland Yard');
    case 'JPN': return l('Polícia Nacional do Japão', 'National Police Agency');
    case 'MEX': return y >= 2019 ? l('Fiscalía General (FGR)', 'Attorney General (FGR)') : l('Procuradoria (PGR)', 'Attorney General (PGR)');
    case 'ITA': return y >= 1991 ? l('Direção Antimáfia (DIA)', 'Anti-Mafia Directorate (DIA)') : l('Carabinieri', 'Carabinieri');
    case 'COL': return y < 2011 ? l('DAS', 'DAS') : l('Fiscalía', 'Attorney General');
    case 'FRA': return l('Police judiciaire', 'Police judiciaire');
    case 'DEU': return l('BKA', 'BKA');
    default: return fmtL(l('Polícia de {c}', '{c} police'), { c: countryName(a3) });
  }
}
/** Lei de crime organizado da época/país (vira "RICO" no caso). */
export function ricoName(s: GameState, a3: string): L | null {
  if (a3 === 'USA') return s.year >= 1970 ? l('RICO', 'RICO') : null;
  if (a3 === 'ITA') return s.year >= 1982 ? l('Art. 416-bis', 'Art. 416-bis') : null;
  if (a3 === 'BRA') return l('Associação criminosa', 'Criminal association');
  return s.year >= 1990 ? l('Lei de crime organizado', 'Organized-crime law') : null;
}
/** Perícia da época: quanto mais moderna, mais rastro. */
export function forensic(y: number): { v: number; why: L } {
  if (y < 1970) return { v: 0, why: l('Perícia rudimentar (antes de 1970)', 'Rudimentary forensics (pre-1970)') };
  if (y < 1990) return { v: 0.04, why: l('Perícia moderna (+4%)', 'Modern forensics (+4%)') };
  if (y < 2005) return { v: 0.08, why: l('Exame de DNA (+8%)', 'DNA testing (+8%)') };
  return { v: 0.12, why: l('Câmeras, celulares e DNA (+12%)', 'CCTV, phones and DNA (+12%)') };
}
/** Corrupção percebida (0..1): suborno funciona mais. */
export function corruption(s: GameState, a3: string): number {
  const base: Record<string, number> = { BRA: 0.5, MEX: 0.6, COL: 0.6, ITA: 0.4, RUS: 0.6, NGA: 0.6, JPN: 0.25, USA: 0.2, GBR: 0.15, FRA: 0.2, DEU: 0.12, SWE: 0.08 };
  return clamp((base[a3] ?? 0.35) - (s.year > 2000 ? 0.08 : 0), 0.05, 0.8);
}
export const heatIn = (s: GameState, a3: string): number => Math.round(crime17(s).heat[a3] ?? 0);
export function addHeat(s: GameState, who: string, a3: string, d: number): void {
  const st = crime17(s);
  if (who === 'player') st.heat[a3] = clamp((st.heat[a3] ?? 0) + d * (st.parole > s.week ? 1.3 : 1), 0, 100);
  else st.nh[who] = clamp((st.nh[who] ?? 0) + d, 0, 100);
}

// ================================================================ segurança (guarda-costas)

export const SEC17: { name: L; cost: number; def: number; desc: L }[] = [
  { name: l('Nenhuma', 'None'), cost: 0, def: 0, desc: l('Portas abertas.', 'Doors wide open.') },
  { name: l('Guarda-costas', 'Bodyguard'), cost: 2500, def: 0.1, desc: l('Um segurança acompanha os astros.', 'A bodyguard follows the stars.') },
  { name: l('Equipe de segurança', 'Security team'), cost: 7000, def: 0.2, desc: l('Equipe 24h, cofre para o acervo, varredura de escutas.', '24h team, vault for the collection, bug sweeps.') },
  { name: l('Firma privada (ex-policiais)', 'Private firm (ex-cops)'), cost: 18000, def: 0.32, desc: l('Ex-policiais que também sabem quem está tramando.', 'Ex-cops who also know who is plotting.') },
];
export function setSecurity(s: GameState, tier: number): L | null {
  const st = crime17(s);
  if (tier < 0 || tier >= SEC17.length) return l('Inválido.', 'Invalid.');
  st.sec = tier;
  return null;
}

// ================================================================ ações

export type TK = 'person' | 'act' | 'label' | 'relic' | 'own_act' | 'case';
export interface Method17 { id: string; name: L; desc: L; dp?: number; dq?: number; sev?: number; cost?: number; ok?: (s: GameState, target: string) => L | null }
export interface CrimeDef17 {
  id: string; name: L; desc: L; tk: TK; p: number; q: number; sev: number; cost: number; heat: number;
  violent?: 1; methods?: Method17[]; extra?: 1;
  /** efeito; devolve o texto da consequência */
  fx: (s: GameState, c: Ctx17, ok: boolean, r: Rng) => L;
}
export interface Ctx17 { actor: string; target: string; method?: string; org?: string; partners: string[]; /** ajuste extra de chance (ex.: alvo avisado) */ dp?: number; dpWhy?: L }
export interface Odds17 { p: number; q: number; cost: number; heat: number; sev: number; why: L[]; block: L | null; a3: string; place: string }

const pct = (x: number): string => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
const P13F = (s: GameState, key: string, f: string): number => ((per13(s, key)?.facets as Record<string, number> | undefined)?.[f] ?? 50);
const keyOf = (s: GameState, id: string): string => (id === 'player' ? 'player' : s.persons[id] ? `p:${id}` : s.labels[id] ? (s.labels[id].leaderId ? `l:${s.labels[id].leaderId}` : '') : id);
export const famOf = (s: GameState, id: string): number => (s.persons[id] ? actOfPerson(s, id)?.fame ?? 0 : s.acts[id]?.fame ?? (s.labels[id] ? s.labels[id].reputation : 0));

function causeOf(m?: string): L {
  return m === 'drugs' ? l('overdose de droga adulterada', 'overdose of tainted drugs') : m === 'plane' ? l('queda do avião particular', 'private plane crash') : l('acidente de carro', 'car crash');
}
const liveRelic = (rl?: Relic): boolean => !!rl && (rl.st === 'kept' || rl.st === 'museum' || rl.st === 'auction');

/** Dinheiro do selo/ato: tira de quem é dono do alvo. */
function takeFrom(s: GameState, ownerId: string | undefined, amt: number, memo: string): number {
  if (!ownerId || amt <= 0) return 0;
  if (ownerId === 'player') { post(s, `c17loss:${nid(s, '')}`, -amt, 'legal', memo); return amt; }
  const lb = s.labels[ownerId];
  if (lb) { const a = Math.min(amt, Math.max(0, lb.cash) * 0.5 + amt * 0.3); lb.cash -= a; return Math.round(a); }
  return Math.round(amt * 0.6);
}
function giveTo(s: GameState, actor: string, amt: number, memo: string): void {
  if (amt <= 0) return;
  if (actor === 'player' || isMine(s, actor)) post(s, `c17gain:${nid(s, '')}`, amt, 'other', memo);
  else if (s.labels[actor]) s.labels[actor].cash += amt;
}

export const CRIMES17: CrimeDef17[] = [
  { id: 'murder', name: l('Encomendar morte', 'Order a death'), tk: 'person', p: 0.45, q: 0.35, sev: 95, cost: 40000, heat: 40, violent: 1,
    desc: l('Disfarçado de fatalidade. Só contra personagens fictícios; matador de aluguel ou uma organização.', 'Disguised as a tragedy. Fictional characters only; a hitman or an organization.'),
    methods: [
      { id: 'accident', name: l('Acidente de carro', 'Car accident'), desc: l('Freios cortados numa estrada escura.', 'Cut brakes on a dark road.') },
      { id: 'drugs', name: l('Droga adulterada', 'Tainted drugs'), desc: l('Mais fácil com quem já usa; parece overdose.', 'Easier with users; looks like an overdose.'), dq: -0.05 },
      { id: 'plane', name: l('Sabotar o avião', 'Tamper with the plane'), desc: l('Só astros que voam em turnê (fama 30+); difícil e espetacular.', 'Only stars flying on tour (fame 30+); hard and spectacular.'), dp: -0.1, dq: 0.05, cost: 30000,
        ok: (s, t) => s.year < 1950 ? l('Ainda não há aviões particulares de turnê.', 'No private tour planes yet.') : famOf(s, t) < 30 ? l('O alvo não voa em turnê (fama < 30).', 'The target doesn\'t fly on tour (fame < 30).') : null },
    ],
    fx: (s, c, ok, r) => {
      const p = s.persons[c.target];
      if (!p) return l('Alvo sumiu.', 'Target gone.');
      if (!ok) { addStress(s, p.id, 30, l('Sobreviveu a um "acidente"', 'Survived an "accident"')); return fmtL(l('{p} sobrevive ao "acidente" — e começa a desconfiar.', '{p} survives the "accident" — and grows suspicious.'), { p: p.name }); }
      const drug = c.method === 'drugs' && (p.health === 'addiction' || p.traits.includes('party'));
      personDies(s, p, causeOf(c.method));
      // boato: a morte "suspeita" circula sem acusado
      if (famOf(s, c.target) > 25 || r.chance(0.5)) emitFact(s, { kind: 'rumor', actors: [p.id], place: placeOf(s, p.id), severity: 40, visibility: 'rumor', tags: ['crime', 'rumor'], text: fmtL(l('Boato: a morte de {p} não teria sido acidente.', 'Rumor: {p}\'s death may not have been an accident.'), { p: p.name }), src: 'crime17' });
      return fmtL(l('{p} morre: {c}{d}.', '{p} dies: {c}{d}.'), { p: p.name, c: causeOf(c.method), d: drug ? l(' (ninguém estranhou)', ' (nobody was surprised)') : '' });
    } },
  { id: 'assault', name: l('Intimidar / dar um susto', 'Intimidate / rough up'), tk: 'person', p: 0.65, q: 0.3, sev: 50, cost: 4000, heat: 12, violent: 1,
    desc: l('Capangas na porta do camarim. Gera medo (obrigação a seu favor) e estresse; ninguém morre.', 'Goons at the dressing-room door. Creates fear (an obligation in your favor) and stress; nobody dies.'),
    fx: (s, c, ok) => {
      const p = s.persons[c.target];
      if (!p) return l('Alvo sumiu.', 'Target gone.');
      if (!ok) { p.rel[c.actor] = clamp((p.rel[c.actor] ?? 0) - 15, -100, 100); return fmtL(l('{p} reagiu e chamou seguranças.', '{p} fought back and called security.'), { p: p.name }); }
      addStress(s, p.id, 22, l('Foi intimidado(a)', 'Was intimidated'));
      const a = actOfPerson(s, p.id);
      if (a) a.momentum = clamp(a.momentum - 8, 0, 100);
      grantHold(s, { holder: c.actor, target: p.id, kind: 'favor', strength: 50, months: 36, src: 'crime17', text: l('Medo: cede numa negociação', 'Fear: gives in at a negotiation'), quiet: true });
      return fmtL(l('{p} levou o recado: medo vira vantagem na próxima conversa.', '{p} got the message: fear becomes leverage in the next talk.'), { p: p.name });
    } },
  { id: 'blackmail', name: l('Chantagear', 'Blackmail'), tk: 'person', p: 0.5, q: 0.25, sev: 45, cost: 2500, heat: 8,
    desc: l('Um segredo do alvo vale dinheiro. Com segredo guardado (obrigação) a chance sobe muito.', 'A secret of the target is worth money. With a stored secret (obligation) odds soar.'),
    fx: (s, c, ok) => {
      const fam = famOf(s, c.target);
      if (!ok) { const p = s.persons[c.target]; if (p) p.rel[c.actor] = clamp((p.rel[c.actor] ?? 0) - 25, -100, 100); return fmtL(l('{p} pagou para ver — e não pagou.', '{p} called the bluff — and paid nothing.'), { p: nameOf17(s, c.target) }); }
      const amt = money(s, 4000 + fam * 450);
      const got = takeFrom(s, ownerOfTarget(s, c.target) ?? c.target, amt, `Chantagem: ${nameOf17(s, c.actor)}`);
      giveTo(s, c.actor, got || amt, `"Consultoria": ${nameOf17(s, c.target)}`);
      grantHold(s, { holder: c.actor, target: c.target, kind: 'blackmail', strength: 55, months: 48, src: 'crime17', proof: 2, text: l('Paga para o segredo não sair', 'Pays to keep the secret in'), quiet: true });
      addStress(s, c.target, 15, l('Vítima de chantagem', 'Being blackmailed'));
      return fmtL(l('{p} pagou {v} pelo silêncio.', '{p} paid {v} for silence.'), { p: nameOf17(s, c.target), v: usd(Math.round(got || amt)) });
    } },
  { id: 'sabotage', name: l('Sabotar', 'Sabotage'), tk: 'act', p: 0.6, q: 0.25, sev: 40, cost: 5000, heat: 10,
    desc: l('Atrasar a fábrica, vazar o disco, cancelar a turnê ou queimar o estúdio do rival.', 'Delay the plant, leak the record, wreck the tour or burn the rival\'s studio.'),
    methods: [
      { id: 'release', name: l('Vazar/atrasar o disco', 'Leak/delay the record'), desc: l('Lançamentos recentes perdem força.', 'Recent releases lose steam.') },
      { id: 'tour', name: l('Melar a turnê', 'Wreck the tour'), desc: l('Shows cancelados por "problemas técnicos".', 'Shows cancelled for "technical problems".'), sev: 45 },
      { id: 'fire', name: l('Incêndio no estúdio', 'Studio fire'), desc: l('Prejuízo grande ao selo dono; crime grave.', 'Big loss to the owning label; a serious crime.'), dp: -0.1, dq: 0.1, sev: 75, cost: 9000 },
    ],
    fx: (s, c, ok, r) => {
      const a = s.acts[c.target];
      if (!a) return l('Alvo sumiu.', 'Target gone.');
      if (!ok) return fmtL(l('A sabotagem contra {a} falhou; a equipe deles notou algo estranho.', 'The sabotage against {a} failed; their crew noticed something odd.'), { a: a.name });
      if (c.method === 'fire') {
        const loss = takeFrom(s, ownerOfTarget(s, a.id), money(s, 30000 + a.fame * 400), `Incêndio no estúdio (${a.name})`);
        a.momentum = clamp(a.momentum - 15, 0, 100);
        for (const m of a.members) addStress(s, m, 12, l('Estúdio incendiado', 'Studio burned down'));
        emitFact(s, { kind: 'disaster', actors: [a.id], place: a.city, severity: 55, visibility: 'public', tags: ['bad', 'fire'], text: fmtL(l('Incêndio destrói o estúdio onde {a} gravava.', 'A fire destroys the studio where {a} recorded.'), { a: a.name }), src: 'crime17' });
        return fmtL(l('Estúdio de {a} em chamas: prejuízo de {v}.', '{a}\'s studio in flames: {v} loss.'), { a: a.name, v: usd(loss) });
      }
      if (c.method === 'tour') {
        a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 4);
        a.momentum = clamp(a.momentum - 10, 0, 100);
        emitFact(s, { kind: 'tour_cancel', actors: [a.id], place: a.city, severity: 35, visibility: 'public', tags: ['bad'], text: fmtL(l('{a} cancela shows por "falhas técnicas".', '{a} cancels shows over "technical failures".'), { a: a.name }), src: 'crime17' });
        return fmtL(l('A turnê de {a} parou por um mês.', '{a}\'s tour stalled for a month.'), { a: a.name });
      }
      let n = 0;
      for (const id of a.releases.slice(-3)) { const rel = s.releases[id]; if (rel && s.week - rel.week < 26) { rel.appeal *= r.float(0.8, 0.9); n++; } }
      a.momentum = clamp(a.momentum - 12, 0, 100);
      return fmtL(l('{a} perde embalo ({n} lançamento(s) atingido(s)).', '{a} loses momentum ({n} release(s) hit).'), { a: a.name, n });
    } },
  { id: 'wiretap', name: l('Grampear', 'Wiretap'), tk: 'label', p: 0.6, q: 0.22, sev: 30, cost: 5000, heat: 8,
    desc: l('Escuta no escritório do selo: vira um segredo provado (obrigação) para chantagem ou exposição.', 'A bug in the label office: becomes a proven secret (obligation) for blackmail or exposure.'),
    fx: (s, c, ok) => {
      const lb = s.labels[c.target];
      if (!lb) return l('Alvo sumiu.', 'Target gone.');
      if (!ok) return fmtL(l('A escuta em {b} foi achada numa varredura.', 'The bug at {b} was found in a sweep.'), { b: lb.name });
      grantHold(s, { holder: c.actor, target: lb.id, kind: 'secret', strength: 62, proof: 2, months: 60, src: 'crime17', text: l('Conversas gravadas da diretoria', 'Recorded boardroom conversations'), quiet: true });
      (s.flags as Record<string, number>)[`intel:${lb.id}`] = s.week;
      return fmtL(l('Fitas de {b}: caixa {c}, planos e podres — guardados como segredo provado.', '{b} tapes: cash {c}, plans and dirt — kept as a proven secret.'), { b: lb.name, c: usd(Math.round(lb.cash)) });
    } },
  { id: 'bribe', name: l('Subornar', 'Bribe'), tk: 'case', p: 0.55, q: 0.3, sev: 40, cost: 10000, heat: 6,
    desc: l('Polícia esfria o país; juiz ou testemunha enfraquecem um caso. Funciona mais onde há corrupção.', 'Police cool the country; a judge or witness weakens a case. Works better where corruption runs deep.'),
    methods: [
      { id: 'police', name: l('Delegado/investigador', 'Detective'), desc: l('−35 de calor no país.', '−35 heat in the country.') },
      { id: 'witness', name: l('Testemunha', 'Witness'), desc: l('−25 de provas no caso.', '−25 evidence in the case.'), cost: 6000 },
      { id: 'judge', name: l('Juiz', 'Judge'), desc: l('Só com indiciamento: −45 de provas.', 'Only once charged: −45 evidence.'), dp: -0.1, dq: 0.1, cost: 25000, sev: 60 },
    ],
    fx: (s, c, ok) => {
      const st = crime17(s);
      const cs = st.cases.find((x) => x.id === c.target);
      const a3 = cs?.a3 ?? c.target;
      if (!ok) { if (cs) cs.ev = clamp(cs.ev + 15, 0, 100); return l('O suborno foi recusado — e anotado nos autos.', 'The bribe was refused — and put on record.'); }
      if (c.method === 'police' || !cs) { st.heat[a3] = clamp((st.heat[a3] ?? 0) - 35, 0, 100); if (cs) cs.ev = clamp(cs.ev - 8, 0, 100); return fmtL(l('A investigação em {c} esfria.', 'The investigation in {c} cools down.'), { c: countryName(a3) }); }
      cs.ev = clamp(cs.ev - (c.method === 'judge' ? 45 : 25), 0, 100);
      return c.method === 'judge' ? l('O juiz passa a ver "fragilidade nas provas".', 'The judge now sees "weak evidence".') : l('A testemunha-chave muda o depoimento.', 'The key witness changes testimony.');
    } },
  { id: 'steal_relic', name: l('Roubar relíquia', 'Steal a relic'), tk: 'relic', p: 0.5, q: 0.3, sev: 45, cost: 6000, heat: 14,
    desc: l('Do museu, do colecionador ou do leilão. Depois, só o mercado negro compra.', 'From a museum, a collector or an auction. Afterwards, only the black market buys.'),
    fx: (s, c, ok) => {
      const st = crime17(s);
      const rl = relics(s).list.find((x) => x.id === c.target);
      if (!rl) return l('Peça sumiu.', 'Piece gone.');
      if (!ok) return fmtL(l('Alarme! O roubo de {n} falhou.', 'Alarm! The theft of {n} failed.'), { n: rl.n });
      const prev = rl.st;
      rl.st = 'stolen'; rl.au = undefined;
      st.hot[rl.id] = c.actor;
      if (c.actor === 'player' || isMine(s, c.actor)) st.stash.push(rl.id);
      emitFact(s, { kind: 'theft', actors: rl.a ? [rl.a] : [], place: placeOf(s, rl.id), severity: 45, visibility: 'public', tags: ['crime', 'relic'], text: fmtL(l('Roubo! Some {n} ({w}).', 'Theft! {n} vanishes ({w}).'), { n: rl.n, w: prev === 'museum' ? l('do museu', 'from the museum') : l('do acervo', 'from the collection') }), src: 'crime17' });
      return c.actor === 'player' || isMine(s, c.actor) ? fmtL(l('{n} está no seu esconderijo. Venda no mercado negro — ou devolva por recompensa.', '{n} is in your hideout. Sell it on the black market — or return it for a reward.'), { n: rl.n })
        : fmtL(l('{n} sumiu; logo deve aparecer no mercado negro.', '{n} is gone; it should surface on the black market soon.'), { n: rl.n });
    } },
  { id: 'bootleg', name: l('Pirataria (bootleg)', 'Bootlegging'), tk: 'act', p: 0.7, q: 0.18, sev: 25, cost: 3000, heat: 6, extra: 1,
    desc: l('Prensar e vender cópias piratas dos sucessos de outro selo: lucro rápido, rival perde vendas.', 'Press and sell bootlegs of another label\'s hits: quick profit, the rival loses sales.'),
    fx: (s, c, ok) => {
      const a = s.acts[c.target];
      if (!a) return l('Alvo sumiu.', 'Target gone.');
      const fmt = bootFmt(s.year);
      if (!ok) return fmtL(l('A carga de {f} piratas de {a} foi apreendida.', 'The load of bootleg {f} of {a} was seized.'), { a: a.name, f: fmt });
      const v = money(s, 2500 + a.fame * 160);
      takeFrom(s, ownerOfTarget(s, a.id), Math.round(v * 0.7), `Pirataria: ${a.name}`);
      giveTo(s, c.actor, v, `Bootleg: ${a.name}`);
      return fmtL(l('{f} piratas de {a} rendem {v}.', 'Bootleg {f} of {a} earn {v}.'), { f: fmt, a: a.name, v: usd(v) });
    } },
  { id: 'chart_rig', name: l('Fraudar as paradas', 'Rig the charts'), tk: 'own_act', p: 0.75, q: 0.22, sev: 35, cost: 6000, heat: 8, extra: 1,
    desc: l('Compras em massa/robôs pelo seu ato: +35% nas paradas por 8 semanas. Exposto: escândalo e −40% por 6 meses.', 'Bulk buys/bots for your act: +35% chart units for 8 weeks. Exposed: scandal and −40% for 6 months.'),
    fx: (s, c, ok) => {
      const st = crime17(s);
      const a = s.acts[c.target];
      if (!a) return l('Alvo sumiu.', 'Target gone.');
      if (!ok) return l('As lojas/plataformas filtraram as compras suspeitas.', 'Shops/platforms filtered the suspicious buys.');
      st.rig[a.id] = s.week + 8;
      return fmtL(l('{a} sobe nas paradas com {m}.', '{a} climbs the charts with {m}.'), { a: a.name, m: rigFmt(s.year) });
    } },
  { id: 'royalty_skim', name: l('Desviar royalties', 'Skim royalties'), tk: 'own_act', p: 0.85, q: 0.2, sev: 35, cost: 0, heat: 6, extra: 1,
    desc: l('Contabilidade criativa sobre o seu próprio artista. Exposto: mágoa de todo o ato, processo e escândalo.', 'Creative accounting on your own artist. Exposed: grievance from the whole act, lawsuit and scandal.'),
    fx: (s, c, ok) => {
      const a = s.acts[c.target];
      if (!a) return l('Alvo sumiu.', 'Target gone.');
      if (!ok) return l('O contador se recusou a assinar.', 'The accountant refused to sign.');
      const v = money(s, 3000 + a.fame * 260);
      post(s, `c17skim:${a.id}:${nid(s, '')}`, v, 'other', `Ajuste contábil (${a.name})`);
      grantHold(s, { holder: 'c17:acct', target: 'player', kind: 'secret', strength: 40, proof: 2, months: 120, src: 'crime17', text: fmtL(l('O contador sabe dos royalties de {a}', 'The accountant knows about {a}\'s royalties'), { a: a.name }), quiet: true });
      return fmtL(l('{v} saíram dos royalties de {a} para o caixa.', '{v} moved from {a}\'s royalties into the till.'), { v: usd(v), a: a.name });
    } },
];
export const crimeById = (id: string): CrimeDef17 | undefined => CRIMES17.find((c) => c.id === id);
export const bootFmt = (y: number): L => y < 1975 ? l('vinis', 'vinyls') : y < 1988 ? l('fitas cassete', 'cassettes') : y < 2003 ? l('CDs', 'CDs') : l('arquivos vazados', 'leaked files');
export const rigFmt = (y: number): L => y < 1991 ? l('compras plantadas nas lojas-termômetro', 'planted buys at reporting stores') : y < 2012 ? l('compras em lote (SoundScan)', 'bulk buys (SoundScan)') : l('fazendas de streams', 'stream farms');

/** Alvos possíveis para uma ação (jogador). */
export function targetsFor(s: GameState, c: CrimeDef17, max = 40): { id: string; name: L }[] {
  const mine = new Set(playerActs(s));
  const live = (a: Act) => a.status !== 'retired' && a.status !== 'split';
  const acts = Object.values(s.acts).filter(live);
  switch (c.tk) {
    case 'person': return acts.filter((a) => !mine.has(a.id)).sort((a, b) => b.fame - a.fame).slice(0, max).flatMap((a) => a.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer).slice(0, 2).map((m) => ({ id: m, name: l(`${s.persons[m].name} (${a.name})${isReal(s, m) ? ' ★' : ''}`) })));
    case 'act': return acts.filter((a) => !mine.has(a.id) && a.fame > 5).sort((a, b) => b.fame - a.fame).slice(0, max).map((a) => ({ id: a.id, name: l(`${a.name}${a.catalogNo ? ' ★' : ''}`) }));
    case 'own_act': return acts.filter((a) => mine.has(a.id)).map((a) => ({ id: a.id, name: l(a.name) }));
    case 'label': return Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.reputation - a.reputation).slice(0, max).map((x) => ({ id: x.id, name: l(x.name) }));
    case 'relic': return relics(s).list.filter(liveRelic).sort((a, b) => b.v - a.v).slice(0, max).map((x) => ({ id: x.id, name: fmtL(l('{n} · {o}', '{n} · {o}'), { n: x.n, o: x.own.at(-1)?.[0] ?? '?' }) }));
    case 'case': {
      const st = crime17(s);
      const cs = st.cases.filter((x) => x.who === 'player' && x.stage !== 'closed');
      const open = cs.map((x) => ({ id: x.id, name: fmtL(l('Caso: {g} · {c} (provas {e})', 'Case: {g} · {c} (evidence {e})'), { g: agency(s, x.a3), c: countryName(x.a3), e: Math.round(x.ev) }) }));
      const hot = Object.keys(st.heat).filter((k) => (st.heat[k] ?? 0) > 5 && !cs.some((c0) => c0.a3 === k)).map((k) => ({ id: k, name: fmtL(l('Calor: {c} ({h})', 'Heat: {c} ({h})'), { c: countryName(k), h: heatIn(s, k) }) }));
      return [...open, ...hot];
    }
  }
}

// ================================================================ chances (visíveis, com o porquê)

export function crimeOdds(s: GameState, c: Ctx17, cid: string): Odds17 {
  const d = crimeById(cid)!;
  const st = crime17(s);
  const m = d.methods?.find((x) => x.id === c.method) ?? d.methods?.[0];
  const place = c.target.startsWith('c') && st.cases.find((x) => x.id === c.target) ? s.config.homeCity : placeOf(s, c.target);
  const caseT = st.cases.find((x) => x.id === c.target);
  const a3 = caseT?.a3 ?? (d.tk === 'case' && !caseT ? c.target : a3Of(s, place));
  const why: L[] = [];
  let p = d.p + (m?.dp ?? 0), q = d.q + (m?.dq ?? 0);
  let cost = money(s, d.cost + (m?.cost ?? 0));
  const sev = m?.sev ?? d.sev;
  let block: L | null = null;
  // regras de história e sanidade
  if (d.id === 'murder' && (isReal(s, c.target) || isReal(s, c.actor))) block = l('Pessoa real: o jogo não encena assassinato de gente real. Tente intimidação, chantagem ou sabotagem.', 'Real person: the game does not stage murders of real people. Try intimidation, blackmail or sabotage.');
  if (d.id === 'murder' && s.persons[c.target]?.isPlayer) block = l('Alvo inválido.', 'Invalid target.');
  if (histMode(s) === 'strict' && c.actor !== 'player' && isReal(s, c.actor)) block = l('Vida real exata: pessoas reais só fazem o que está documentado.', 'Exact real life: real people only do what is documented.');
  if (m?.ok) block = m.ok(s, c.target) ?? block;
  if (d.tk === 'relic' && !liveRelic(relics(s).list.find((x) => x.id === c.target))) block = l('A peça não está ao alcance.', 'The piece is out of reach.');
  if (d.id === 'bribe' && c.method === 'judge' && caseT?.stage !== 'charged') block = l('Juiz só entra depois do indiciamento.', 'A judge only matters once charged.');
  if (d.id === 'bribe' && c.method === 'witness' && !caseT) block = l('Escolha um caso aberto.', 'Pick an open case.');
  if (c.actor === 'player' && st.exile[a3]) block = fmtL(l('Você fugiu de {c}: não pode agir lá.', 'You fled {c}: you cannot act there.'), { c: countryName(a3) });
  if (c.actor === 'player') { const pp = playerPerson(s); if (pp && (st.jail[pp.id]?.u ?? 0) > s.week) block = l('Você está preso: o selo segue com a equipe, sem crimes.', 'You are in prison: the label runs on its staff, no crimes.'); }
  // executor: traços
  const key = keyOf(s, c.actor);
  if (key) {
    const cor = P13F(s, key, 'coragem'), imp = P13F(s, key, 'impulsividade'), dis = P13F(s, key, 'disciplina');
    if (cor > 65 && d.violent) { p += 0.06; why.push(l('Sangue-frio (coragem alta) +6%', 'Cold blood (high courage) +6%')); }
    if (imp > 65) { q += 0.08; why.push(l('Impulsivo deixa rastros: exposição +8%', 'Impulsive, leaves traces: exposure +8%')); }
    if (dis > 65) { q -= 0.06; why.push(l('Metódico: exposição −6%', 'Methodical: exposure −6%')); }
  }
  if (s.persons[c.actor]) { const f = famOf(s, c.actor); if (f > 30) { q += f / 400; why.push(fmtL(l('Rosto conhecido: exposição {x}', 'Famous face: exposure {x}'), { x: pct(f / 400) })); } }
  // organização
  const o = c.org ? orgById(s, c.org) : undefined;
  if (o) {
    const rel = c.actor === 'player' ? st.org[o.id] ?? 0 : 0;
    const fit = d.violent ? hasRacket(o, 'violence') || hasRacket(o, 'protection') : d.id === 'bootleg' ? hasRacket(o, 'bootleg') : d.id === 'chart_rig' ? hasRacket(o, 'payola') || hasRacket(o, 'laundering') : true;
    const bonus = (o.power / 400) * (fit ? 1 : 0.5) + rel / 1000;
    p += bonus; q -= 0.08;
    cost += money(s, 3000 + o.power * 120 + (d.violent ? 8000 : 0));
    why.push(fmtL(l('{o} executa: chance {x}, cobertura −8%', '{o} does the job: odds {x}, cover −8%'), { o: o.name, x: pct(bonus) }));
    if (!fit) why.push(l('Fora da especialidade da organização (metade do bônus)', 'Outside the organization\'s racket (half bonus)'));
    if (rel < -20) block = l('A organização não trabalha para você (relação ruim).', 'The organization won\'t work for you (bad relations).');
  } else if (d.id === 'murder') { p -= 0.1; why.push(l('Matador de aluguel sem organização −10%', 'Hired gun without an organization −10%')); }
  // conluio
  if (c.partners.length) {
    p += 0.06 * c.partners.length; q += 0.05 * c.partners.length; cost = Math.round(cost / (1 + c.partners.length));
    why.push(fmtL(l('{n} sócio(s): chance +{a}%, exposição +{b}% (mais bocas), custo dividido', '{n} partner(s): odds +{a}%, exposure +{b}% (more mouths), cost split'), { n: c.partners.length, a: 6 * c.partners.length, b: 5 * c.partners.length }));
  }
  // alvo
  if ((d.tk === 'person' || d.tk === 'act') && d.id !== 'bootleg') {
    const f = famOf(s, c.target);
    if (d.id === 'blackmail') { if (f > 20) { p += f / 600; why.push(fmtL(l('Alvo famoso tem mais a perder: {x}', 'Famous target has more to lose: {x}'), { x: pct(f / 600) })); } }
    else if (f > 20) { p -= f / 300; why.push(fmtL(l('Alvo famoso, cercado de gente: {x}', 'Famous target, always surrounded: {x}'), { x: pct(-f / 300) })); }
  }
  if (isMine(s, c.target) && c.actor !== 'player' && st.sec) { p -= SEC17[st.sec].def; why.push(fmtL(l('Sua segurança ({s}): {x}', 'Your security ({s}): {x}'), { s: SEC17[st.sec].name, x: pct(-SEC17[st.sec].def) })); }
  if (d.id === 'blackmail' && holdsBetween(s, c.actor, c.target).some((h) => h.kind === 'secret' || h.kind === 'blackmail')) { p += 0.25; why.push(l('Você já guarda um segredo dele(a): +25%', 'You already hold a secret on them: +25%')); }
  if (d.id === 'murder' && c.method === 'drugs' && s.persons[c.target]?.health === 'addiction') { p += 0.15; why.push(l('O alvo já usa drogas: +15%', 'The target already uses drugs: +15%')); }
  if (d.id === 'bribe') { const k = corruption(s, a3); p += k * 0.4 - 0.1; why.push(fmtL(l('Corrupção em {c} na época: {x}', 'Corruption in {c} at the time: {x}'), { c: countryName(a3), x: pct(k * 0.4 - 0.1) })); }
  if (c.dp) { p += c.dp; why.push(c.dpWhy ?? fmtL(l('Ajuste {x}', 'Adjustment {x}'), { x: pct(c.dp) })); }
  // polícia e época
  const heat = c.actor === 'player' ? heatIn(s, a3) : st.nh[c.actor] ?? 0;
  if (heat > 0) { q += heat / 250; why.push(fmtL(l('{g} já de olho (calor {h}): exposição {x}', '{g} already watching (heat {h}): exposure {x}'), { g: agency(s, a3), h: Math.round(heat), x: pct(heat / 250) })); }
  const fz = forensic(s.year);
  q += fz.v; if (fz.v) why.push(fz.why);
  if (c.actor === 'player' && st.parole > s.week) { q += 0.1; why.push(l('Em liberdade condicional: exposição +10%', 'On parole: exposure +10%')); }
  if (d.tk === 'relic') { const rl = relics(s).list.find((x) => x.id === c.target); if (rl?.st === 'museum') { p -= 0.12; why.push(l('Museu tem alarme e guardas: −12%', 'Museums have alarms and guards: −12%')); } }
  if (c.actor === 'player' && s.player.cash < cost) block ??= l('Caixa insuficiente.', 'Not enough cash.');
  return { p: clamp(p, 0.05, 0.95), q: clamp(q, 0.03, 0.9), cost, heat: d.heat, sev, why, block, a3, place };
}

/** Chance de uma gravadora topar o conluio (e risco de traição). */
export function partnerOdds(s: GameState, lbId: string, c: Ctx17): { p: number; betray: number; why: L[] } {
  const lb = s.labels[lbId];
  const why: L[] = [];
  if (!lb) return { p: 0, betray: 1, why };
  const L0 = leaderOf(s, lbId);
  const key = L0 ? `l:${L0.id}` : '';
  const rel = c.actor === 'player' ? L0?.rel.player ?? -(s.rivalries[lbId] ?? 0) / 2 : 0;
  const tOwner = ownerOfTarget(s, c.target);
  const hate = tOwner === 'player' ? s.rivalries[lbId] ?? 0 : tOwner && s.labels[tOwner] && L0 ? -((leaderOf(s, tOwner) && L0.rel[leaderOf(s, tOwner)!.id]) ?? 0) : 0;
  let p = 0.15 + rel / 200 + hate / 150;
  why.push(fmtL(l('Relação com você {r}', 'Relationship with you {r}'), { r: Math.round(rel) }));
  if (hate > 10) why.push(fmtL(l('Também detesta o alvo (+{x}%)', 'Also hates the target (+{x}%)'), { x: Math.round(hate / 1.5) }));
  const amb = key ? P13F(s, key, 'ambicao') : 50, emp = key ? P13F(s, key, 'empatia') : 50, loy = key ? P13F(s, key, 'lealdade') : 50;
  p += (amb - 50) / 300 - (emp - 50) / 250;
  if (isReal(s, lbId) && histMode(s) === 'strict') { p = 0; why.push(l('Selo real no modo exato: não entra em crimes inventados.', 'Real label in exact mode: does not join invented crimes.')); }
  const betray = clamp((100 - loy) / 250 + (rel < 0 ? 0.1 : 0), 0.03, 0.6);
  why.push(fmtL(l('Risco de traição {b}% (lealdade {l})', 'Betrayal risk {b}% (loyalty {l})'), { b: Math.round(betray * 100), l: Math.round(loy) }));
  return { p: clamp(p, 0, 0.9), betray, why };
}

// ================================================================ executar

export interface CrimeOut { ok: boolean; ex: boolean; text: L; fact?: Fact; joined: string[]; betrayed: string[] }

function logCrime(s: GameState, e: Omit<CrimeLog17, 'w' | 'y' | 'm'>): void {
  const st = crime17(s);
  st.log.push({ ...e, w: s.week, y: s.year, m: s.month });
  if (st.log.length > 160) st.log.splice(0, st.log.length - 160);
}

/** Executa um crime (jogador ou NPC). `r` opcional (NPC passa o do mês). */
export function commitCrime(s: GameState, cid: string, c: Ctx17, r: Rng = crng(s, `do:${cid}:${c.target}`)): CrimeOut | L {
  const d = crimeById(cid);
  if (!d) return l('Ação inválida.', 'Invalid action.');
  const st = crime17(s);
  const mineAct = c.actor === 'player' || isMine(s, c.actor);
  // sócios: cada um decide (e pode trair)
  const joined: string[] = [], betrayed: string[] = [];
  for (const pid of c.partners) {
    const po = partnerOdds(s, pid, c);
    if (r.chance(po.p)) { joined.push(pid); if (r.chance(po.betray)) betrayed.push(pid); }
  }
  const ctx: Ctx17 = { ...c, partners: joined };
  const o = crimeOdds(s, ctx, cid);
  if (o.block) return o.block;
  if (mineAct) { if (o.cost) post(s, `c17:${cid}:${nid(s, '')}`, -o.cost, 'legal', `Serviço "discreto" (${d.name.pt})`); }
  else if (s.labels[c.actor]) s.labels[c.actor].cash -= o.cost;
  for (const pid of joined) if (s.labels[pid]) s.labels[pid].cash -= o.cost;
  const ok = r.chance(o.p);
  const q = o.q + (ok ? 0 : 0.15) + betrayed.length * 0.25;
  const ex = r.chance(clamp(q, 0, 0.95));
  const txt = d.fx(s, ctx, ok, r);
  // fato (secreto → boato → público)
  const realish = c.actor !== 'player' && isReal(s, c.actor);
  const vis = !ex ? 'secret' : realish ? 'rumor' : o.sev >= 50 ? 'public' : 'rumor';
  const head = fmtL(ex ? (realish ? l('Boato: {a} estaria por trás de "{c}" contra {t}. {x}', 'Rumor: {a} allegedly behind "{c}" against {t}. {x}') : l('{a} é apontado(a) por "{c}" contra {t}. {x}', '{a} is named for "{c}" against {t}. {x}')) : l('{a}: "{c}" contra {t}. {x}', '{a}: "{c}" against {t}. {x}'), { a: nameOf17(s, c.actor), c: d.name, t: nameOf17(s, c.target), x: txt });
  const fact = emitFact(s, { kind: 'crime', actors: [c.actor, c.target, ...joined, ...(c.org ? [`o:${c.org.replace(/^o:/, '')}`] : [])], place: o.place, severity: o.sev, visibility: vis, tags: ['crime', 'bad', cid, ...(ok ? ['ok'] : ['fail'])], text: head, src: 'crime17', data: { c: cid, ok: ok ? 1 : 0, ex: ex ? 1 : 0 } });
  // calor e caso
  // responde quem executou (seu artista responde por si; o selo leva metade do calor e paga a conta)
  const resp = c.actor;
  const boss = mineAct ? 'player' : resp;
  addHeat(s, resp, o.a3, o.heat * (ex ? 2 : 1));
  if (boss === 'player' && resp !== 'player') addHeat(s, 'player', o.a3, o.heat * (ex ? 1 : 0.5));
  for (const pid of joined) addHeat(s, pid, o.a3, o.heat * (ex ? 1.5 : 0.7));
  if (ex) feedCase(s, resp, o.a3, 20 + o.sev / 3, o.sev, !!c.org, betrayed);
  // testemunhas: sócios e org guardam o segredo (obrigação contra o executor)
  for (const w of [...joined, ...(c.org ? [`o:${c.org.replace(/^o:/, '')}`] : [])].filter((x) => x !== resp)) grantHold(s, { holder: w, target: resp, kind: 'secret', strength: clamp(o.sev / 1.3, 20, 80), proof: 1, months: 120, src: 'crime17', factId: fact.id, text: fmtL(l('Sabe do "{c}" contra {t}', 'Knows about the "{c}" against {t}'), { c: d.name, t: nameOf17(s, c.target) }), quiet: true });
  if (c.org) { const oid = c.org.replace(/^o:/, ''); if (mineAct) st.org[oid] = clamp((st.org[oid] ?? 0) + 6, -100, 100); grantHold(s, { holder: `o:${oid}`, target: resp, kind: 'favor', strength: 55, months: 60, src: 'crime17', text: l('Serviço prestado: um dia eles cobram', 'Service rendered: one day they collect'), quiet: true }); }
  // relações e estresse
  const tOwner = ownerOfTarget(s, c.target);
  if (ex || !ok) {
    if (s.persons[c.target]) s.persons[c.target].rel[resp] = clamp((s.persons[c.target].rel[resp] ?? 0) - (ex ? 40 : 15), -100, 100);
    if (ex && s.persons[c.target]?.alive) grantHold(s, { holder: c.target, target: resp, kind: 'grievance', strength: clamp(o.sev, 30, 90), months: 240, src: 'crime17', text: fmtL(l('Vítima de "{c}"', 'Victim of "{c}"'), { c: d.name }), quiet: true });
    if (boss === 'player' && tOwner && s.labels[tOwner]) s.rivalries[tOwner] = (s.rivalries[tOwner] ?? 0) + (ex ? 25 : 8);
    if (tOwner === 'player' && s.labels[resp] && ex) s.rivalries[resp] = (s.rivalries[resp] ?? 0) + 30;
    const La = s.labels[resp] ? leaderOf(s, resp) : undefined, Lb = tOwner && s.labels[tOwner] ? leaderOf(s, tOwner) : undefined;
    if (La && Lb && ex) { Lb.rel[La.id] = clamp((Lb.rel[La.id] ?? 0) - 35, -100, 100); }
  }
  if (s.persons[c.actor]) addStress(s, c.actor, o.sev / 8, fmtL(l('Cometeu "{c}"', 'Committed "{c}"'), { c: d.name }));
  // exposição pública: escândalo (com reação regional) ou reputação
  if (ex) {
    if (s.persons[resp] || s.acts[resp]) scandal(s, resp, 'crime', o.sev, head, { place: o.place, cause: [fact.id], tags: ['crime'] });
    if (boss === 'player') { s.player.reputation.institutional = clamp(s.player.reputation.institutional - Math.round(o.sev / (resp === 'player' ? 7 : 14)), 0, 100); notify(s, head, 'bad'); }
    else if (s.labels[resp]) s.labels[resp].reputation = clamp(s.labels[resp].reputation - o.sev / 8, 0, 100);
    if (cid === 'chart_rig') { st.rig[c.target] = 0; st.rigBad[c.target] = s.week + 26; scandal(s, c.target, 'money', 45, fmtL(l('Fraude nas paradas: {a} perde posições.', 'Chart fraud: {a} is stripped of positions.'), { a: nameOf17(s, c.target) })); }
    if (cid === 'royalty_skim') { const a = s.acts[c.target]; if (a) for (const m of a.members) { const pm = s.persons[m]; if (!pm?.alive || pm.isPlayer) continue; pm.resentment = clamp(pm.resentment + 25, 0, 100); grantHold(s, { holder: m, target: 'player', kind: 'grievance', strength: 70, months: 240, src: 'crime17', text: l('Roubou meus royalties', 'Stole my royalties'), quiet: true }); } }
  }
  if (tOwner === 'player' && !mineAct) notify(s, ex ? head : fmtL(l('Algo aconteceu com {t}: {x}', 'Something happened to {t}: {x}'), { t: nameOf17(s, c.target), x: txt }), ok ? 'bad' : 'info');
  for (const b of betrayed) emitFact(s, { kind: 'betrayal', actors: [b, resp], place: o.place, severity: 40, visibility: 'rumor', tags: ['crime', 'informant'], text: fmtL(l('{b} entregou {a} à polícia.', '{b} gave {a} up to the police.'), { b: nameOf17(s, b), a: nameOf17(s, resp) }), src: 'crime17' });
  logCrime(s, { actor: resp, target: c.target, c: cid, ok, ex, text: head, mine: mineAct || tOwner === 'player' || ex });
  if (boss !== 'player') st.npcN++;
  return { ok, ex, text: txt, fact, joined, betrayed };
}

// ================================================================ casos, indiciamento e julgamento

export function feedCase(s: GameState, who: string, a3: string, ev: number, sev: number, org: boolean, inf: string[] = []): Case17 {
  const st = crime17(s);
  let cs = st.cases.find((x) => x.who === who && x.a3 === a3 && x.stage !== 'closed');
  if (!cs) { cs = { id: nid(s, 'cs'), who, a3, ev: 0, stage: 'open', w: s.week, n: 0, org: 0, inf: [], sev: 0 }; st.cases.push(cs); if (who === 'player') notify(s, fmtL(l('{g} abre investigação sobre {c} em {p}.', '{g} opens an investigation into {c} in {p}.'), { g: agency(s, a3), c: s.config.companyName, p: countryName(a3) }), 'bad'); }
  cs.ev = clamp(cs.ev + ev, 0, 100); cs.n++; cs.sev = Math.max(cs.sev, sev);
  if (org) cs.org++;
  for (const i of inf) if (!cs.inf.includes(i)) cs.inf.push(i);
  if (cs.org >= 2 && ricoName(s, a3)) cs.rico = 1;
  if (st.cases.length > 60) st.cases.splice(0, st.cases.findIndex((x) => x.stage === 'closed') + 1 || 1);
  return cs;
}
export const myCases = (s: GameState): Case17[] => crime17(s).cases.filter((x) => x.who === 'player' && x.stage !== 'closed');

/** Chance de absolvição no julgamento (visível). */
export function trialOdds(s: GameState, cs: Case17): { p: number; why: L[] } {
  const why: L[] = [];
  let p = 0.8 - cs.ev / 110;
  why.push(fmtL(l('Provas {e}/100', 'Evidence {e}/100'), { e: Math.round(cs.ev) }));
  const lg = cs.who === 'player' || isMine(s, cs.who) ? legal15(s) : 0.3;
  if (lg) { p += lg * 0.35; why.push(fmtL(l('Advogados (Jurídico) +{x}%', 'Lawyers (Legal) +{x}%'), { x: Math.round(lg * 35) })); }
  if (cs.rico) { p -= 0.15; why.push(fmtL(l('{r}: crime organizado −15%', '{r}: organized crime −15%'), { r: ricoName(s, cs.a3) ?? l('RICO') })); }
  if (cs.inf.length) { p -= 0.1 * cs.inf.length; why.push(fmtL(l('{n} informante(s) −{x}%', '{n} informant(s) −{x}%'), { n: cs.inf.length, x: cs.inf.length * 10 })); }
  return { p: clamp(p, 0.05, 0.9), why };
}
export type Plea = 'plea' | 'trial' | 'bribe' | 'flee';
export const PLEA17: Record<Plea, { name: L; hint: L }> = {
  plea: { name: l('Delação premiada', 'Plea deal'), hint: l('Multa de 40%, sem prisão; entrega sócios e organizações (eles viram inimigos e ganham casos).', '40% fine, no prison; gives up partners and organizations (they become enemies and get cases).') },
  trial: { name: l('Ir a julgamento', 'Go to trial'), hint: l('Absolvição limpa ou condenação cheia (multa, reputação, prisão/condicional).', 'Clean acquittal or full conviction (fine, reputation, prison/parole).') },
  bribe: { name: l('Comprar o juiz', 'Buy the judge'), hint: l('Caro; funciona mais onde há corrupção; se falhar, novas acusações.', 'Expensive; works better where corruption runs deep; if it fails, new charges.') },
  flee: { name: l('Fugir do país', 'Flee the country'), hint: l('O caso fecha, mas você nunca mais pisa nem faz turnê lá.', 'The case closes, but you never set foot or tour there again.') },
};
export const fineOf = (s: GameState, cs: Case17): number => money(s, (15000 + cs.sev * 600) * (cs.rico ? 2 : 1));

function convict(s: GameState, cs: Case17, mult = 1): L {
  const st = crime17(s);
  const fine = Math.round(fineOf(s, cs) * mult);
  let text: L;
  if (cs.who === 'player') {
    post(s, `c17fine:${cs.id}`, -fine, 'legal', `Condenação (${agency(s, cs.a3).pt})`);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - Math.round(8 * mult + cs.sev / 10), 0, 100);
    const pp = playerPerson(s);
    if (mult >= 1 && cs.sev >= 70 && pp) { st.jail[pp.id] = { u: s.week + Math.round(cs.sev / 2), a3: cs.a3, why: l('Condenado', 'Convicted') }; }
    st.parole = s.week + 104;
    text = fmtL(l('Condenado(a) em {c}: multa de {v}{j}; 2 anos de condicional.', 'Convicted in {c}: {v} fine{j}; 2 years of parole.'), { c: countryName(cs.a3), v: usd(fine), j: pp && st.jail[pp.id]?.u > s.week ? l(' e prisão', ' and prison') : '' });
  } else if (s.persons[cs.who]) {
    const months = Math.round(6 + cs.sev / 4);
    jailPerson(s, cs.who, cs.a3, months, l('Condenado', 'Convicted'));
    text = fmtL(l('{p} é condenado(a) a {m} meses de prisão.', '{p} is sentenced to {m} months in prison.'), { p: nameOf17(s, cs.who), m: months });
  } else if (cs.who.startsWith('o:')) {
    st.down[cs.who.slice(2)] = s.week + 104;
    text = fmtL(l('Operação policial desmonta a cúpula de {o}: dois anos de calmaria.', 'A police operation dismantles {o}\'s leadership: two quiet years.'), { o: nameOf17(s, cs.who) });
  } else {
    const lb = s.labels[cs.who];
    if (lb) { lb.cash -= fine; lb.reputation = clamp(lb.reputation - 10, 0, 100); }
    text = fmtL(l('{b} é condenada: multa de {v}.', '{b} is convicted: {v} fine.'), { b: nameOf17(s, cs.who), v: usd(fine) });
  }
  return text;
}
export function jailPerson(s: GameState, pid: string, a3: string, months: number, why: L): void {
  const st = crime17(s);
  if (!s.persons[pid]?.alive) return;
  st.jail[pid] = { u: s.week + Math.round(months * 4.33), a3, why };
  addStress(s, pid, 25, l('Preso(a)', 'Imprisoned'));
  const a = actOfPerson(s, pid);
  emitFact(s, { kind: 'arrest', actors: [pid, ...(a ? [a.id] : [])], place: a?.city ?? s.config.homeCity, severity: 60, visibility: 'public', tags: ['crime', 'bad', 'jail'], text: fmtL(l('{p} vai para a prisão ({m} meses).', '{p} goes to prison ({m} months).'), { p: s.persons[pid].name, m: months }), src: 'crime17', data: { months } });
}
export const jailedIn = (s: GameState, a: Act): Person[] => a.members.map((m) => s.persons[m]).filter((p): p is Person => !!p && (crime17(s).jail[p.id]?.u ?? 0) > s.week);

/** Resolve um caso indiciado do jogador. */
export function resolveCase(s: GameState, csId: string, how: Plea, r: Rng = crng(s, `case:${csId}`)): L {
  const st = crime17(s);
  const cs = st.cases.find((x) => x.id === csId);
  if (!cs || cs.stage === 'closed') return l('Caso encerrado.', 'Case closed.');
  let out: L;
  if (how === 'plea') {
    out = convict(s, cs, 0.4);
    const named = new Set<string>();
    // quem sabia (testemunhas/sócios/orgs) é entregue
    for (const f of Object.values(s.labels)) if (holdsBetween(s, f.id, cs.who).some((h) => h.src === 'crime17')) named.add(f.id);
    for (const o of orgs17(s)) if (holdsBetween(s, o.key, cs.who).some((h) => h.src === 'crime17')) named.add(o.key);
    for (const n of named) {
      if (s.labels[n]) { feedCase(s, n, cs.a3, 45, cs.sev, false); s.rivalries[n] = (s.rivalries[n] ?? 0) + 40; }
      else { const oid = n.slice(2); st.org[oid] = clamp((st.org[oid] ?? 0) - 60, -100, 100); st.vend[oid] = s.week + 104; }
      grantHold(s, { holder: n, target: cs.who, kind: 'grievance', strength: 75, months: 240, src: 'crime17', text: l('Delatou a gente', 'Ratted us out'), quiet: true });
    }
    out = fmtL(l('{o} Delação: {n} entregue(s) — e agora querem vingança.', '{o} Plea: {n} given up — and now they want revenge.'), { o: out, n: [...named].map((x) => nameOf17(s, x)).join(', ') || l('ninguém', 'nobody') });
  } else if (how === 'bribe') {
    const cost = money(s, 20000 + cs.sev * 400);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `c17judge:${cs.id}`, -cost, 'legal', 'Honorários "especiais"');
    if (r.chance(corruption(s, cs.a3) * 0.9)) out = l('Absolvido(a) por "falta de provas". Ninguém acredita, mas vale.', 'Acquitted for "lack of evidence". Nobody believes it, but it counts.');
    else { cs.sev = Math.min(100, cs.sev + 15); out = fmtL(l('O juiz denunciou a propina! {x}', 'The judge reported the bribe! {x}'), { x: convict(s, cs, 1.4) }); }
  } else if (how === 'flee') {
    st.exile[cs.a3] = 1; st.heat[cs.a3] = 100;
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100);
    out = fmtL(l('Você fugiu de {c}. O caso fica aberto para sempre: nada de shows lá.', 'You fled {c}. The case stays open forever: no shows there.'), { c: countryName(cs.a3) });
  } else {
    const tr = trialOdds(s, cs);
    if (r.chance(tr.p)) { out = l('Absolvido(a)! A imprensa fala em vitória dos advogados.', 'Acquitted! The press calls it a lawyers\' win.'); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100); }
    else out = convict(s, cs, 1);
  }
  cs.stage = 'closed'; cs.out = out;
  st.heat[cs.a3] = how === 'flee' ? 100 : clamp((st.heat[cs.a3] ?? 0) * 0.4, 0, 100);
  emitFact(s, { kind: 'case_ruling', actors: [cs.who], place: s.config.homeCity, severity: 50 + cs.sev / 3, visibility: 'public', tags: ['crime', how], text: out, src: 'crime17' });
  notify(s, out, 'event');
  return out;
}

function caseMonth(s: GameState, r: Rng): void {
  const st = crime17(s);
  for (const cs of st.cases) {
    if (cs.stage === 'closed') continue;
    const heat = cs.who === 'player' ? heatIn(s, cs.a3) : st.nh[cs.who] ?? 0;
    const lg = cs.who === 'player' ? legal15(s) : 0.2;
    cs.ev = clamp(cs.ev + 1.5 + heat / 18 + cs.inf.length * 4 + (cs.who === 'player' ? Object.keys(st.laund).length * 2 : 0) - lg * 4 - (s.week - cs.w > 156 ? 3 : 0), 0, 100);
    if (cs.stage === 'open' && cs.ev >= 70) {
      cs.stage = 'charged';
      cs.dl = s.week + 9;
      const text = fmtL(l('{g} indicia {w}{r}.', '{g} charges {w}{r}.'), { g: agency(s, cs.a3), w: nameOf17(s, cs.who), r: cs.rico ? fmtL(l(' com base na lei {x}', ' under {x}'), { x: ricoName(s, cs.a3) ?? l('RICO') }) : '' });
      emitFact(s, { kind: 'arrest', actors: [cs.who], place: cs.who === 'player' ? s.config.homeCity : placeOf(s, cs.who), severity: 55 + cs.sev / 4, visibility: 'public', tags: ['crime', 'bad', 'charged'], text, src: 'crime17' });
      if (cs.who === 'player') notify(s, fmtL(l('{t} Decida em Crime → Investigações (delação, julgamento, suborno ou fuga).', '{t} Decide in Crime → Investigations (plea, trial, bribe or flight).'), { t: text }), 'event');
    } else if (cs.stage === 'open' && cs.ev <= 0 && s.week - cs.w > 52) { cs.stage = 'closed'; cs.out = l('Arquivado por falta de provas.', 'Shelved for lack of evidence.'); }
    else if (cs.stage === 'charged' && (cs.who !== 'player' || (cs.dl ?? 0) <= s.week)) {
      if (cs.who === 'player') resolveCase(s, cs.id, 'trial', r);
      else {
        const tr = trialOdds(s, cs);
        const out = r.chance(tr.p) ? fmtL(l('{w} é absolvido(a).', '{w} is acquitted.'), { w: nameOf17(s, cs.who) }) : convict(s, cs, 1);
        cs.stage = 'closed'; cs.out = out;
        emitFact(s, { kind: 'case_ruling', actors: [cs.who], place: placeOf(s, cs.who), severity: 45, visibility: 'public', tags: ['crime'], text: out, src: 'crime17' });
      }
    }
  }
}

// ================================================================ mercado negro (relíquias)

export const FENCES17: { name: L; cut: number; risk: number; from: number; desc: L }[] = [
  { name: l('Antiquário do porto', 'Harbor antique dealer'), cut: 0.55, risk: 0.06, from: 1900, desc: l('Paga pouco, pergunta menos.', 'Pays little, asks less.') },
  { name: l('Colecionador sem perguntas', 'No-questions collector'), cut: 0.35, risk: 0.12, from: 1950, desc: l('Paga bem por peça autêntica; quer prova de procedência.', 'Pays well for authentic pieces; wants provenance.') },
  { name: l('Leiloeiro clandestino', 'Clandestine auctioneer'), cut: 0.3, risk: 0.2, from: 1970, desc: l('Leilão fechado para milionários; muita gente vê a peça.', 'A closed auction for millionaires; many eyes on the piece.') },
  { name: l('Fórum na dark web', 'Dark-web forum'), cut: 0.25, risk: 0.18, from: 2011, desc: l('Bitcoin e anonimato — e agentes infiltrados.', 'Bitcoin and anonymity — and undercover agents.') },
];
export const fences = (s: GameState) => FENCES17.map((f, i) => ({ ...f, i })).filter((f) => f.from <= s.year);
/** Autenticidade percebida (0..1): peça roubada famosa tem procedência "suja"; falsificação baixa. */
export const authOf = (s: GameState, id: string): number => (crime17(s).fake[id] ? 0.25 : 0.9);
export function fenceQuote(s: GameState, rlId: string, fi: number): { price: number; risk: number; why: L[] } {
  const st = crime17(s);
  const rl = relics(s).list.find((x) => x.id === rlId);
  const f = FENCES17[fi];
  if (!rl || !f) return { price: 0, risk: 0, why: [] };
  const why: L[] = [];
  const hotW = s.week - (st.log.slice().reverse().find((x) => x.target === rlId && x.c === 'steal_relic')?.w ?? s.week - 200);
  const hotK = hotW < 52 ? 0.6 : 1;
  if (hotK < 1) why.push(l('Peça "quente" (roubada há menos de 1 ano): −40%', '"Hot" piece (stolen < 1 year ago): −40%'));
  const au = authOf(s, rlId);
  why.push(fmtL(l('Autenticidade percebida {a}%', 'Perceived authenticity {a}%'), { a: Math.round(au * 100) }));
  why.push(fmtL(l('Corte do receptador {c}%', 'Fence cut {c}%'), { c: Math.round(f.cut * 100) }));
  const price = Math.round(money(s, rl.v) * (1 - f.cut) * hotK * au);
  const risk = clamp(f.risk + heatIn(s, a3Of(s, s.config.homeCity)) / 300 + forensic(s.year).v / 2, 0.02, 0.8);
  why.push(fmtL(l('Risco de flagrante {r}%', 'Sting risk {r}%'), { r: Math.round(risk * 100) }));
  return { price, risk, why };
}
export function sellHot(s: GameState, rlId: string, fi: number, r: Rng = crng(s, `fence:${rlId}`)): L {
  const st = crime17(s);
  const rl = relics(s).list.find((x) => x.id === rlId);
  if (!rl || !st.stash.includes(rlId)) return l('Não está no seu esconderijo.', 'Not in your hideout.');
  const qd = fenceQuote(s, rlId, fi);
  st.stash = st.stash.filter((x) => x !== rlId);
  const a3 = a3Of(s, s.config.homeCity);
  if (r.chance(qd.risk)) {
    rl.st = 'kept'; delete st.hot[rlId];
    feedCase(s, 'player', a3, 35, 50, false);
    addHeat(s, 'player', a3, 20);
    emitFact(s, { kind: 'arrest', actors: ['player', ...(rl.a ? [rl.a] : [])], place: s.config.homeCity, severity: 55, visibility: 'public', tags: ['crime', 'relic', 'sting'], text: fmtL(l('Flagrante: {n} é apreendida numa venda armada pela polícia; {c} é investigada por receptação.', 'Sting: {n} is seized in a police-arranged sale; {c} is investigated for handling stolen goods.'), { n: rl.n, c: s.config.companyName }), src: 'crime17' });
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100);
    return l('Era uma armadilha! A peça foi apreendida e abriram caso.', 'It was a sting! The piece was seized and a case opened.');
  }
  post(s, `c17fence:${rlId}`, qd.price, 'asset_sales', `Venda discreta: ${rl.n.pt}`);
  rl.own.push([crime17(s).fake[rlId] ? 'comprador enganado' : 'comprador anônimo', s.year, 'mercado negro']);
  addHeat(s, 'player', a3, 6);
  return fmtL(l('Vendido por {v} a {f}.', 'Sold for {v} through {f}.'), { v: usd(qd.price), f: FENCES17[fi].name });
}
/** Devolver anonimamente e cobrar a recompensa (10%): reputação sobe, calor cai. */
export function returnHot(s: GameState, rlId: string): L {
  const st = crime17(s);
  const rl = relics(s).list.find((x) => x.id === rlId);
  if (!rl || !st.stash.includes(rlId)) return l('Não está no seu esconderijo.', 'Not in your hideout.');
  st.stash = st.stash.filter((x) => x !== rlId);
  rl.st = 'kept'; delete st.hot[rlId];
  const v = Math.round(money(s, rl.v) * 0.1);
  post(s, `c17reward:${rlId}`, v, 'other', `Recompensa: ${rl.n.pt}`);
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
  emitFact(s, { kind: 'relic', actors: ['player', ...(rl.a ? [rl.a] : [])], place: s.config.homeCity, severity: 35, visibility: 'public', tags: ['good', 'relic'], text: fmtL(l('{c} "encontra" {n} e devolve ao dono.', '{c} "finds" {n} and returns it to its owner.'), { c: s.config.companyName, n: rl.n }), src: 'crime17' });
  return fmtL(l('Devolvida. Recompensa de {v} e boa imprensa.', 'Returned. {v} reward and good press.'), { v: usd(v) });
}
/** Falsificar uma réplica de peça famosa (o comprador pode descobrir). */
export const forgeCost = (s: GameState, v: number): number => money(s, 3000 + v * 0.02);
export function forgeRelic(s: GameState, rlId: string): L {
  const st = crime17(s);
  const src = relics(s).list.find((x) => x.id === rlId);
  if (!src) return l('Peça inválida.', 'Invalid piece.');
  const cost = forgeCost(s, src.v);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `c17forge:${rlId}`, -cost, 'production', `Réplica: ${src.n.pt}`);
  const copy = addRelic(s, src.k, fmtL(l('{n} (procedência "nova")', '{n} ("new" provenance)'), { n: src.n }), src.a, src.p, src.v, src.y);
  copy.st = 'stolen';
  st.fake[copy.id] = 1; st.stash.push(copy.id); st.hot[copy.id] = 'player'; st.rcity[copy.id] = s.config.homeCity;
  return fmtL(l('Réplica pronta. Vale bem menos se o comprador desconfiar (autenticidade {a}%).', 'Replica ready. Worth far less if the buyer suspects (authenticity {a}%).'), { a: Math.round(authOf(s, copy.id) * 100) });
}
export function buyOffer(s: GameState, oid: string, r: Rng = crng(s, `buy:${oid}`)): L {
  const st = crime17(s);
  const of = st.market.find((x) => x.id === oid);
  if (!of) return l('Oferta expirou.', 'Offer expired.');
  if (s.player.cash < of.price) return l('Caixa insuficiente.', 'Not enough cash.');
  const rl = relics(s).list.find((x) => x.id === of.rl);
  if (!rl) return l('Peça sumiu.', 'Piece gone.');
  post(s, `c17buy:${of.id}`, -of.price, 'acquisitions', `Compra discreta: ${rl.n.pt}`);
  st.market = st.market.filter((x) => x !== of);
  st.stash.push(rl.id); st.hot[rl.id] = 'player';
  if (!r.chance(of.auth)) { st.fake[rl.id] = 1; return fmtL(l('Era falsa! {n} não passa de uma boa réplica.', 'It was fake! {n} is just a good replica.'), { n: rl.n }); }
  addHeat(s, 'player', a3Of(s, s.config.homeCity), 5);
  return fmtL(l('{n} agora está no seu esconderijo (receptação: guarde bem).', '{n} is now in your hideout (handling stolen goods: keep it hidden).'), { n: rl.n });
}

function marketMonth(s: GameState, r: Rng): void {
  const st = crime17(s);
  st.market = st.market.filter((x) => x.until > s.week && relics(s).list.some((rl) => rl.id === x.rl && rl.st === 'stolen' && !st.stash.includes(rl.id)));
  const pool = relics(s).list.filter((rl) => rl.st === 'stolen' && !st.stash.includes(rl.id) && !st.market.some((x) => x.rl === rl.id));
  if (pool.length && st.market.length < 4 && r.chance(0.5)) {
    const rl = r.pick(pool);
    const f = r.pick(fences(s));
    const auth = r.chance(0.25) ? r.float(0.3, 0.6) : r.float(0.75, 0.97);
    st.market.push({ id: nid(s, 'bm'), rl: rl.id, fence: f.i, price: Math.round(money(s, rl.v) * r.float(0.3, 0.55)), auth, until: s.week + 12, seller: st.hot[rl.id] ?? '' });
  }
  // polícia recupera peças do seu esconderijo
  const a3 = a3Of(s, s.config.homeCity);
  for (const id of st.stash.slice()) {
    const rl = relics(s).list.find((x) => x.id === id);
    if (!rl) { st.stash = st.stash.filter((x) => x !== id); continue; }
    if (r.chance(0.015 + heatIn(s, a3) / 500 + forensic(s.year).v / 4)) {
      st.stash = st.stash.filter((x) => x !== id);
      rl.st = st.fake[id] ? 'lost' : 'kept'; delete st.hot[id];
      feedCase(s, 'player', a3, 30, 45, false);
      emitFact(s, { kind: 'arrest', actors: ['player'], place: s.config.homeCity, severity: 50, visibility: 'public', tags: ['crime', 'relic'], text: fmtL(l('Busca e apreensão: {g} acha {n} num depósito ligado a {c}.', 'Search warrant: {g} finds {n} in a warehouse linked to {c}.'), { g: agency(s, a3), n: rl.n, c: s.config.companyName }), src: 'crime17' });
      notify(s, fmtL(l('A polícia achou {n} no seu esconderijo.', 'Police found {n} in your hideout.'), { n: rl.n }), 'bad');
    }
  }
}

/** Relíquias reais (relics17, semeadas pelo próprio catálogo no ano certo): marca a cidade onde ficam p/ roubos e polícia. */
const RCITY: [RegExp, string][] = [[/seattle/i, 'seattle'], [/london|londres/i, 'london'], [/memphis/i, 'memphis'], [/rio/i, 'rio'], [/los angeles|hollywood/i, 'los_angeles'], [/new york|nova york|cleveland/i, 'new_york'], [/nashville/i, 'nashville'], [/liverpool/i, 'liverpool'], [/paris/i, 'paris'], [/tokyo|tóquio/i, 'tokyo']];
export function seedRelics17(s: GameState): void {
  const st = crime17(s);
  for (const d of RELICS17) {
    if (st.seeded[d.id]) continue;
    const rl = relic9Of17(s, d.id);
    if (!rl) continue;
    st.seeded[d.id] = 1;
    const c = RCITY.find(([re]) => re.test(d.location.en) || re.test(d.location.pt))?.[1];
    st.rcity[rl.id] = c && cityById[c] ? c : s.config.homeCity;
  }
}

// ================================================================ extras mensais (lavagem, pirataria, pizzo, crônica real)

export const launderFee = (s: GameState, o: OrgDef17): number => money(s, 1500 + o.power * 60);
export function toggleLaunder(s: GameState, oid: string): L {
  const st = crime17(s);
  const o = orgById(s, oid);
  if (!o) return l('Inválido.', 'Invalid.');
  if (st.laund[o.id]) {
    delete st.laund[o.id];
    st.org[o.id] = clamp((st.org[o.id] ?? 0) - 25, -100, 100);
    grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 45, months: 60, src: 'crime17', text: l('Fechou a lavanderia na nossa cara', 'Shut the laundry in our face'), quiet: true });
    return fmtL(l('Você parou de lavar para {o}. Eles não gostaram.', 'You stopped laundering for {o}. They did not like it.'), { o: o.name });
  }
  if ((st.org[o.id] ?? 0) < -20) return l('Eles não confiam em você.', 'They don\'t trust you.');
  st.laund[o.id] = s.week;
  grantHold(s, { holder: o.key, target: 'player', kind: 'secret', strength: 65, proof: 2, months: 240, src: 'crime17', text: l('Sabe que seu selo lava dinheiro', 'Knows your label launders money'), quiet: true });
  return fmtL(l('Seu selo agora lava dinheiro de {o}: {v}/mês, calor +3/mês, e eles passam a ter algo contra você.', 'Your label now launders for {o}: {v}/month, heat +3/month, and they now hold something on you.'), { o: o.name, v: usd(launderFee(s, o)) });
}
export function approachOrg(s: GameState, oid: string): L {
  const st = crime17(s);
  const o = orgById(s, oid);
  if (!o) return l('Inválido.', 'Invalid.');
  const cost = money(s, 2000 + o.power * 50);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `c17tribute:${o.id}`, -cost, 'legal', `Presente a ${o.name.pt}`);
  st.org[o.id] = clamp((st.org[o.id] ?? 0) + 15, -100, 100);
  addHeat(s, 'player', o.a3, 3);
  return fmtL(l('Jantar com {b}: relação +15 (agora {r}).', 'Dinner with {b}: relationship +15 (now {r}).'), { b: bossName(o), r: Math.round(st.org[o.id]) });
}
export function reportOrg(s: GameState, oid: string): L {
  const st = crime17(s);
  const o = orgById(s, oid);
  if (!o) return l('Inválido.', 'Invalid.');
  feedCase(s, o.key, o.a3, 35, 60, true);
  st.org[o.id] = clamp((st.org[o.id] ?? 0) - 50, -100, 100);
  st.vend[o.id] = s.week + 78;
  delete st.laund[o.id]; delete st.pizzo[o.id];
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100);
  st.heat[o.a3] = clamp((st.heat[o.a3] ?? 0) - 15, 0, 100);
  emitFact(s, { kind: 'statement', actors: ['player', o.key], place: o.city, severity: 45, visibility: 'rumor', tags: ['crime', 'informant'], text: fmtL(l('Dizem que {c} virou informante contra {o}.', 'Word is {c} turned informant against {o}.'), { c: s.config.companyName, o: o.name }), src: 'crime17' });
  return fmtL(l('Você entregou {o} à polícia: investigação aberta, sua ficha limpa um pouco — e eles juram vingança.', 'You gave {o} to the police: investigation opened, your record cleans up a bit — and they swear revenge.'), { o: o.name });
}
export const raidCost = (s: GameState): number => money(s, 7000);
export function raidBootleggers(s: GameState, oid: string, r: Rng = crng(s, `raid:${oid}`)): L {
  const st = crime17(s);
  const o = orgById(s, oid);
  if (!o) return l('Inválido.', 'Invalid.');
  const cost = raidCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `c17raid:${o.id}`, -cost, 'legal', `Batida antipirataria (${o.name.pt})`);
  if (r.chance(0.55 + legal15(s) * 0.3)) {
    st.boot[o.id] = s.week + 52;
    st.org[o.id] = clamp((st.org[o.id] ?? 0) - 20, -100, 100);
    return fmtL(l('Batida da polícia fecha a fábrica de {o} por um ano.', 'A police raid shuts {o}\'s plant for a year.'), { o: o.name });
  }
  return l('A fábrica mudou de endereço antes da batida.', 'The plant moved before the raid.');
}

function extrasMonth(s: GameState, r: Rng): void {
  const st = crime17(s);
  const home = a3Of(s, s.config.homeCity);
  // lavagem
  for (const oid of Object.keys(st.laund)) {
    const o = orgById(s, oid);
    if (!o || o.to < s.year) { delete st.laund[oid]; continue; }
    post(s, `c17laund:${oid}`, launderFee(s, o), 'other', `Consultoria (${o.name.pt})`);
    addHeat(s, 'player', home, 3);
    st.org[oid] = clamp((st.org[oid] ?? 0) + 2, -100, 100);
    if (heatIn(s, home) > 40 && r.chance(0.15)) feedCase(s, 'player', home, 15, 55, true);
  }
  // pirataria contra seus lançamentos
  const mine = new Set(playerActs(s));
  const hits = allReleases17(s).filter((x) => x.owner === 'player' && s.week - x.week < 26 && mine.has(x.actId));
  for (const o of orgs17(s).filter((x) => hasRacket(x, 'bootleg') && (st.boot[x.id] ?? 0) < s.week)) {
    if (!hits.length || !r.chance(o.real ? 0.06 : 0.12)) continue;
    const rel = r.pick(hits);
    const a = s.acts[rel.actId];
    if (!a) continue;
    const loss = money(s, 800 + a.fame * 90);
    post(s, `c17pir:${o.id}`, -loss, 'legal', `Vendas perdidas para pirataria (${o.name.pt})`);
    emitFact(s, { kind: 'piracy', actors: [a.id, o.key], place: o.city, severity: 25, visibility: 'rumor', tags: ['crime', 'bad'], text: fmtL(l('{f} piratas de {a} inundam {c} ({o}): −{v}.', 'Bootleg {f} of {a} flood {c} ({o}): −{v}.'), { f: bootFmt(s.year), a: a.name, c: countryName(o.a3), o: o.name, v: usd(loss) }), src: 'crime17' });
  }
  // pizzo recusado: risco de "acidente" num show
  for (const [oid, since] of Object.entries(st.pizzo)) {
    const o = orgById(s, oid);
    if (!o) { delete st.pizzo[oid]; continue; }
    if (since > 0) { post(s, `c17pizzo:${oid}`, -pizzoFee(s, o), 'legal', `"Segurança" (${o.name.pt})`); st.org[oid] = clamp((st.org[oid] ?? 0) + 1, -100, 100); continue; }
    if (-since + 26 < s.week) { delete st.pizzo[oid]; continue; }
    if (r.chance(0.3 - SEC17[st.sec].def * 0.6)) {
      const a = s.acts[r.pick([...mine].length ? [...mine] : [''])];
      const loss = money(s, 6000 + (a?.fame ?? 0) * 150);
      post(s, `c17pzhit:${oid}`, -loss, 'legal', `Show depredado (${o.name.pt})`);
      if (a) { for (const m of a.members) addStress(s, m, 10, l('Show depredado', 'Show trashed')); }
      emitFact(s, { kind: 'crime', actors: [o.key, a?.id ?? 'player'], place: o.city, severity: 45, visibility: 'public', tags: ['crime', 'bad', 'pizzo'], text: fmtL(l('Briga e depredação num show de {a} em {c}; ninguém viu nada.', 'Brawl and wreckage at a {a} show in {c}; nobody saw a thing.'), { a: a?.name ?? s.config.companyName, c: o.city }), src: 'crime17' });
    }
  }
  // crônica real documentada (fatos públicos, nunca inventados)
  if (histMode(s) !== 'free') for (let i = 0; i < DOC17.length; i++) {
    const d = DOC17[i];
    if (st.doc[i] || d.y > s.year || (d.y === s.year && d.m > s.month) || s.year - d.y > 1) continue;
    if (d.dead) { const a = Object.values(s.acts).find((x) => x.name === d.dead); if (!a || a.members.some((m) => s.persons[m]?.alive)) continue; }
    st.doc[i] = 1;
    emitFact(s, { kind: 'crime_doc', actors: d.org ? [`o:${d.org}`] : [], place: d.a3 === 'USA' ? 'new_york' : d.a3 === 'GBR' ? 'london' : d.a3 === 'BRA' ? 'rio' : d.a3 === 'MEX' ? 'mexico_city' : s.config.homeCity, severity: 50, visibility: 'public', tags: ['crime', 'history'], text: d.text, src: 'crime17doc' });
  }
}
export const pizzoFee = (s: GameState, o: OrgDef17): number => money(s, 600 + o.power * 25);

// ================================================================ ganchos

registerSimHook('month', 'crime17', (s) => {
  const r = new Rng(seedState(`crime17|${s.config.seed}|${mIdx(s)}`));
  const st = crime17(s);
  seedRelics17(s);
  for (const k of Object.keys(st.heat)) { st.heat[k] = Math.max(0, st.heat[k] - (myCases(s).some((c) => c.a3 === k) ? 1.5 : 3)); if (!st.heat[k] && !st.exile[k]) delete st.heat[k]; }
  for (const k of Object.keys(st.nh)) { st.nh[k] = Math.max(0, st.nh[k] - 3); if (!st.nh[k]) delete st.nh[k]; }
  for (const [pid, j] of Object.entries(st.jail)) if (j.u <= s.week) { delete st.jail[pid]; const p = s.persons[pid]; if (p?.alive) emitFact(s, { kind: 'release_jail', actors: [pid], place: s.config.homeCity, severity: 35, visibility: 'public', tags: ['crime'], text: fmtL(l('{p} sai da prisão.', '{p} walks out of prison.'), { p: p.name }), src: 'crime17' }); }
  // segurança cobra todo mês
  if (st.sec) post(s, 'c17sec', -money(s, SEC17[st.sec].cost), 'admin', `Segurança: ${SEC17[st.sec].name.pt}`);
  // calor alto abre investigação
  for (const [a3, h] of Object.entries(st.heat)) if (h >= 60 && !st.exile[a3] && !myCases(s).some((c) => c.a3 === a3)) feedCase(s, 'player', a3, 20, 40, false);
  // payola do world4 conta como calor nos EUA/país-base e vira caso quando exposta (audit #24)
  const w4p = (s.x4 as unknown as { world4?: { payola?: { heat: number } } }).world4?.payola;
  if (w4p && w4p.heat > 30) addHeat(s, 'player', a3Of(s, s.config.homeCity), w4p.heat / 30);
  caseMonth(s, r);
  marketMonth(s, r);
  extrasMonth(s, r);
  st.npcN = 0;
});

// mods: fraude nas paradas, presos não fazem show, calor/fuga aumentam risco de turnê, disco do cárcere
registerMod('chartUnits', 'crime17', (s, v, { release }) => {
  if (!release) return null;
  const st = crime17(s);
  if ((st.rig[release.actId] ?? 0) > s.week) return { value: v * 1.35, label: l('Compras infladas', 'Inflated buys') };
  if ((st.rigBad[release.actId] ?? 0) > s.week) return { value: v * 0.6, label: l('Punição por fraude nas paradas', 'Chart-fraud penalty') };
  return null;
});
registerMod('showRevenue', 'crime17', (s, v, { act }) => (act && jailedIn(s, act).length ? { value: v * 0.35, label: l('Integrante preso', 'Member in prison') } : null));
registerMod('tourRisk', 'crime17', (s, v, { cityId, act }) => {
  if (!cityId) return null;
  const st = crime17(s);
  const a3 = countryOfCity(cityId);
  if (!a3) return null;
  if (st.exile[a3] && act && (act.owner === 'player' || act.playerBand)) return { value: v + 0.6, label: l('Foragido no país', 'Fugitive in this country') };
  const h = act && (act.owner === 'player' || act.playerBand) ? heatIn(s, a3) : 0;
  return h >= 50 ? { value: v + h / 4000, label: l('Polícia de olho', 'Police watching') } : null;
});
registerMod('appeal', 'crime17', (s, v, { release, act }) => {
  const a = act ?? (release ? s.acts[release.actId] : undefined);
  if (!a || !release || s.week - release.week > 2) return null;
  const jailed = jailedIn(s, a);
  if (!jailed.length) return null;
  const rebel = /hip|rap|punk|funk|metal|corrido/i.test(a.genre);
  return { value: v * (rebel ? 1.18 : 0.92), label: rebel ? l('Disco do cárcere (aura de rua)', 'Prison record (street aura)') : l('Artista preso não divulga', 'Jailed artist cannot promote') };
});

export const _crime17 = { realPersons, caseMonth, marketMonth, extrasMonth };
export type { Label };
