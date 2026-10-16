// R31 · UNI-4 (B.5) — DEPÓSITO ÚNICO DE SEGREDOS (estado do secrets23), separado da camada (secrets23.ts) para que os
// donos (dossiês people/secrets, Intriga, livro de obrigações) gravem aqui sem puxar a camada inteira (ciclo de carga).
// secrets23.ts reexporta tudo; quem só lê/escreve segredos importa daqui.

import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import type { ScandalKind } from '../scandal17';
import type { GameState } from '../types';

// ================================================================ tipos

export type Lvl23 = 0 | 1 | 2 | 3 | 4;
export type Kind23 =
  // assumidos / públicos
  | 'orient' | 'faith' | 'politics' | 'excon'
  // sujeitos a boato
  | 'payola' | 'affair' | 'drugs' | 'ghostwriter' | 'lipsync' | 'plagiarism' | 'tax' | 'child' | 'crime' | 'debt' | 'fake_bio'
  // escondidos
  | 'closet' | 'informant' | 'regime' | 'front' | 'shark' | 'illness' | 'bots'
  // UNI-4 (B.5): os da Intriga (r6) e o trunfo genérico guardado no livro de obrigações
  | 'side_deal' | 'fake_sales' | 'royalties' | 'dirt';
export type Chan23 = 'investigation' | 'press' | 'leak' | 'informant' | 'proximity' | 'rival' | 'own' | 'self';
export type Do23 = 'ignore' | 'protect' | 'blackmail' | 'leak' | 'negotiate';
/** Um vínculo/segredo. `subject`: 'p:<pessoa>' | 'a:<ato>' | 'lb:<selo>' | 's:<funcionário>' | 'player'. */
export interface Sec23 {
  id: string; kind: Kind23; subject: string; since: number; sev: number; ev: number;
  /** pessoa/selo real (regras de história) */ real?: boolean;
  /** documentado (crônica real): pode passar de boato */ doc?: boolean;
  /** adaptador de origem */ src: string;
  data?: Record<string, string | number>;
  /** o adaptador já sabe o nível de cada observador (ex.: segredo do próprio elenco) */
  base?: { p?: Lvl23; pr?: Lvl23; r?: Record<string, Lvl23> };
  end?: number;
}
export interface How23 { o: string; lv: Lvl23; ch: Chan23; w: number; t?: L }
export interface Know23 { p: Lvl23; pr: Lvl23; r: Record<string, Lvl23>; how: How23[]; done?: Do23; card?: 1; prot?: number }
export interface Inv23 { subj: string; due: number; cost: number }
/** UNI-4 (B.5): `own` é o ÚNICO depósito de segredos guardados (nativos, dossiês 'people', Intriga 'intrigue', trunfos 'holds');
 *  `sd` marca quem já foi sorteado (dossiês e Intriga), para não sortear de novo. */
export interface Secrets23State { k: Record<string, Know23>; own: Sec23[]; inv: Inv23[]; seq: number; lastCard?: number; sd: Record<string, 1>; n: { found: number; leaked: number; protect: number; blackmail: number } }
declare module '../ext4' { interface Ext4 { secrets23: Secrets23State } }
const fresh = (): Secrets23State => ({ k: {}, own: [], inv: [], seq: 0, sd: {}, n: { found: 0, leaked: 0, protect: 0, blackmail: 0 } });
registerExt4('secrets23', fresh);
export function sec23(s: GameState): Secrets23State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.secrets23 ??= fresh()) as Secrets23State;
  st.k ??= {}; st.own ??= []; st.inv ??= []; st.seq ??= 0; st.sd ??= {}; st.n ??= { found: 0, leaked: 0, protect: 0, blackmail: 0 };
  return st;
}

export const KIND23: Record<Kind23, { n: L; vis: 'assumed' | 'rumor' | 'hidden'; sc: ScandalKind }> = {
  orient: { n: l('orientação assumida', 'openly LGBT'), vis: 'assumed', sc: 'sex' },
  faith: { n: l('religião declarada', 'declared faith'), vis: 'assumed', sc: 'blasphemy' },
  politics: { n: l('militância política', 'political activism'), vis: 'assumed', sc: 'politics' },
  excon: { n: l('ex-presidiário(a)', 'ex-convict'), vis: 'assumed', sc: 'crime' },
  payola: { n: l('jabá pago a rádios', 'radio payola'), vis: 'rumor', sc: 'money' },
  affair: { n: l('caso extraconjugal', 'an affair'), vis: 'rumor', sc: 'sex' },
  drugs: { n: l('drogas / dependência', 'drugs / addiction'), vis: 'rumor', sc: 'drugs' },
  ghostwriter: { n: l('ghostwriter (não escreve as próprias músicas)', 'ghostwriter (does not write own songs)'), vis: 'rumor', sc: 'conduct' },
  lipsync: { n: l('dublagem / voz de outro', 'lip-sync / someone else\'s voice'), vis: 'rumor', sc: 'conduct' },
  plagiarism: { n: l('plágio', 'plagiarism'), vis: 'rumor', sc: 'conduct' },
  tax: { n: l('sonegação', 'tax evasion'), vis: 'rumor', sc: 'money' },
  child: { n: l('filho fora do casamento', 'a child out of wedlock'), vis: 'rumor', sc: 'sex' },
  crime: { n: l('ligação com o crime organizado', 'organized-crime ties'), vis: 'rumor', sc: 'crime' },
  debt: { n: l('dívidas escondidas', 'hidden debts'), vis: 'rumor', sc: 'money' },
  fake_bio: { n: l('biografia inventada', 'made-up biography'), vis: 'rumor', sc: 'conduct' },
  closet: { n: l('no armário', 'in the closet'), vis: 'hidden', sc: 'sex' },
  informant: { n: l('informante da polícia', 'police informant'), vis: 'hidden', sc: 'crime' },
  regime: { n: l('colaborou com o regime / a censura', 'collaborated with the regime / censors'), vis: 'hidden', sc: 'politics' },
  front: { n: l('sócio oculto / selo-fachada', 'hidden partner / front label'), vis: 'hidden', sc: 'crime' },
  shark: { n: l('dívida com agiota', 'loan-shark debt'), vis: 'hidden', sc: 'money' },
  illness: { n: l('doença escondida', 'hidden illness'), vis: 'hidden', sc: 'conduct' },
  bots: { n: l('streams falsos (fazenda de bots)', 'fake streams (bot farm)'), vis: 'hidden', sc: 'money' },
  side_deal: { n: l('negociação secreta com outro selo', 'secret talks with another label'), vis: 'rumor', sc: 'conduct' },
  fake_sales: { n: l('vendas infladas nas paradas', 'inflated chart sales'), vis: 'hidden', sc: 'money' },
  royalties: { n: l('royalties retidos de artistas', 'withheld artist royalties'), vis: 'hidden', sc: 'money' },
  dirt: { n: l('algo comprometedor', 'something compromising'), vis: 'rumor', sc: 'conduct' },
};
export const LVL23: L[] = [l('desconhecido', 'unknown'), l('suspeita', 'suspicion'), l('boato', 'rumor'), l('confirmado', 'confirmed'), l('público', 'public')];
export const CHAN23: Record<Chan23, L> = {
  investigation: l('investigação', 'investigation'), press: l('imprensa', 'press'), leak: l('vazamento', 'leak'), informant: l('informante', 'informant'),
  proximity: l('proximidade', 'proximity'), rival: l('rival', 'rival'), own: l('é do seu círculo', 'your own circle'), self: l('assumido', 'declared'),
};

// ================================================================ cache (a camada guarda por semana; mudanças invalidam)

let ver = 0;
export const bust23 = (): void => { ver++; };
export const ver23 = (): number => ver;
const bust = bust23;

/** Teto de conhecimento: gente real sem documentação para no boato. */
export const cap23 = (sec: Sec23): Lvl23 => (sec.real && !sec.doc ? 2 : 4);

export function know23(s: GameState, sec: Sec23): Know23 {
  const st = sec23(s);
  let k = st.k[sec.id];
  const as = KIND23[sec.kind].vis === 'assumed';
  if (!k) k = { p: 0, pr: 0, r: {}, how: [] };
  const b = sec.base ?? {};
  const cp = cap23(sec);
  const mx = (a: Lvl23, x?: Lvl23): Lvl23 => Math.min(cp, Math.max(a, x ?? 0, as ? 4 : 0)) as Lvl23;
  const out: Know23 = { ...k, p: mx(k.p, b.p), pr: mx(k.pr, b.pr), r: { ...k.r } };
  for (const [lb, v] of Object.entries(b.r ?? {})) out.r[lb] = mx(out.r[lb] ?? 0, v);
  return out;
}
export const knowW = (s: GameState, sec: Sec23): Know23 => (sec23(s).k[sec.id] ??= { p: 0, pr: 0, r: {}, how: [] });

// ================================================================ escrita no depósito

/** Pessoa/selo real? (registrado pela camada: crime17.isReal) */
let realOf: (s: GameState, subj: string) => boolean = () => false;
export function setRealOf23(fn: (s: GameState, subj: string) => boolean): void { realOf = fn; }

/** Cria um segredo nativo (também usado pelas ligações r23: filhos do dono etc.). */
export function addSecret23(s: GameState, x: Omit<Sec23, 'id' | 'src' | 'since'>, src = 'native'): Sec23 {
  const st = sec23(s);
  const sec: Sec23 = { ...x, real: x.real ?? realOf(s, x.subject), id: `n${++st.seq}|${x.subject}`, src, since: s.week };
  st.own.push(sec); bust();
  return sec;
}
/** Segredos guardados de uma origem ('native' | 'people' | 'intrigue' | 'holds'), vivos. */
export const ownOf23 = (s: GameState, src: string): Sec23[] => sec23(s).own.filter((x) => x.src === src && !x.end);
/** Grava o que um observador sabe SEM fato nem cartão (uso interno dos donos: dossiê pronto, imprensa abafada). Pode baixar. */
export function setKnow23(s: GameState, sec: Sec23, obs: string, lv: Lvl23): void {
  const k = knowW(s, sec);
  const v = Math.min(cap23(sec), lv) as Lvl23;
  if (obs === 'player') k.p = v; else if (obs === 'press') k.pr = v; else if (v) k.r[obs] = v; else delete k.r[obs];
  bust();
}
/** Encerra (apaga do depósito) segredos que já não importam. */
export function dropSecrets23(s: GameState, pred: (x: Sec23) => boolean): void {
  const st = sec23(s);
  const drop = st.own.filter(pred);
  if (!drop.length) return;
  st.own = st.own.filter((x) => !drop.includes(x));
  for (const x of drop) delete st.k[x.id];
  bust();
}
