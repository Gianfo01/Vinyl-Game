// Estado do sistema "people" (rodada 4): humor em pilha de pensamentos, colapsos, saúde do músico,
// conversas e promessas, panelinhas, segredos, dono do selo, carreira da equipe, romances, fortuna
// pessoal, caixa de entrada por era e feed social. Tudo em s.x4.people, com listas limitadas.

import { l, type L } from '../../../data/world';
import { registerExt4 } from '../../ext4';
import type { Act, GameState, Person } from '../../types';
import { nextId, playerActs } from '../../util';

// ---------------------------------------------------------------- tipos

/** Pensamento: valor somado ao humor até `until` (dia absoluto). */
export interface Thought {
  k: string; // chave em THOUGHTS
  v: number;
  until: number;
  /** parâmetro do texto (nome de cidade, disco, pessoa) */
  p?: string;
}

export interface Health {
  /** desgaste vocal 0..100 (calos acima de 70) */
  voice: number;
  nodes?: boolean;
  /** dano auditivo acumulado 0..100 (zumbido acima de 55) — não regride */
  hearing: number;
  /** lesão por esforço: semanas restantes */
  injuryWeeks: number;
  /** contador de esforço para lesões (shows/ensaios) */
  strain: number;
  /** dependência 0..100 (problema acima de 60) */
  dependency: number;
  /** já passou por dependência (recaídas possíveis) */
  history?: boolean;
  /** tratamento em curso */
  treatment?: { kind: 'rest' | 'surgery' | 'rehab'; untilWeek: number; planId?: string };
  inEars?: boolean;
}

export interface PromiseRec {
  id: string;
  personId: string;
  actId: string;
  kind: 'single' | 'tour' | 'raise' | 'solo' | 'album';
  madeWeek: number;
  dueWeek: number;
  status: 'open' | 'kept' | 'broken';
  /** royalty no momento da promessa (para 'raise') */
  base?: number;
}

export interface Secret {
  id: string;
  /** pessoa (id) ou selo rival (`label:<id>`, segredo do CEO) ou 'owner' */
  owner: string;
  kind: 'affair' | 'debt' | 'plagiarism' | 'child' | 'tax' | 'fake_bio' | 'payola' | 'addiction';
  severity: number; // 1..3
  known: boolean; // o jogador sabe
  /** quem mais sabe: 'press', labelIds */
  knownBy: string[];
  leaked: boolean;
  used: number;
}

export interface Owner {
  name: string;
  born: number;
  attrs: { ear: number; negotiation: number; charisma: number; management: number };
  xp: { ear: number; negotiation: number; charisma: number; management: number };
  stress: number;
  health: number;
  /** patrimônio pessoal (centavos), separado do caixa da empresa */
  wealth: number;
  /** retirada mensal (centavos) */
  salary: number;
  house: number; // índice em HOUSES (−1 = aluguel)
  spouse?: string;
  kids: { name: string; born: number; aptitude: number }[];
  heir?: string; // 'kid:<i>' | 'staff:<id>'
  generation: number;
  since?: number;
  vacationUntil?: number;
  retired?: { name: string; years: string }[];
}

export interface StaffCareer {
  xp: number;
  level: number; // 0 júnior, 1 pleno, 2 sênior, 3 diretor
  loyalty: number;
  trainingUntil?: number;
  raiseAsk?: number; // semana do pedido aberto
  lastRaise?: number;
}

export interface Romance {
  id: string;
  a: string;
  b: string;
  actId: string;
  since: number;
  status: 'together' | 'over';
  endWeek?: number;
}

export interface InboxMsg {
  id: string;
  week: number;
  year: number;
  from: string;
  subject: L;
  body: L;
  kind: 'request' | 'complaint' | 'promise' | 'health' | 'staff' | 'owner' | 'secret' | 'info' | 'fan';
  actions?: { id: string; label: L }[];
  /** dados para a resposta */
  ref?: Record<string, string | number>;
  read?: boolean;
  resolved?: string; // id da resposta escolhida
  expires?: number; // semana
  tone?: 'good' | 'bad' | 'info';
}

export interface FeedPost {
  id: string;
  week: number;
  year: number;
  author: string;
  role: 'fan' | 'hater' | 'journalist' | 'artist' | 'gossip' | 'letter';
  text: L;
  sentiment: number; // −1..1
  actId?: string;
  likes: number;
}

export interface Breakdown {
  week: number;
  year: number;
  personId: string;
  actId: string;
  kind: string;
  text: L;
}

export interface MedStaff {
  id: string;
  name: string;
  role: 'doctor' | 'voice_coach' | 'therapist';
  skill: number;
  salary: number;
  hiredWeek: number;
}

export interface NegSession {
  actId: string;
  mode: 'sign' | 'renew';
  round: number;
  maxRounds: number;
  patience: number;
  ask: { advance: number; royalty: number; months: number };
  offer: { advance: number; royalty: number; months: number };
  floor: { advance: number; royalty: number };
  usedCards: string[];
  log: L[];
  done?: 'deal' | 'walk';
}

export interface PeopleState {
  thoughts: Record<string, Thought[]>;
  health: Record<string, Health>;
  promises: PromiseRec[];
  lastTalk: Record<string, number>; // pessoa -> semana
  talkCount: Record<string, number>; // pessoa:tipo -> vezes (retorno decrescente)
  secrets: Secret[];
  secretsSeeded: Record<string, 1>;
  owner: Owner | null;
  career: Record<string, StaffCareer>;
  romances: Romance[];
  wealth: Record<string, number>;
  lastRoyalty: Record<string, number>;
  inbox: InboxMsg[];
  /** notificações/decisões vistas até esta semana */
  readUntil: number;
  feed: FeedPost[];
  breakdowns: Breakdown[];
  /** afinidade entre atos do elenco (a|b ordenados) −100..100 */
  bonds: Record<string, number>;
  /** elenco no mês anterior (para detectar contratação/dispensa) */
  roster: string[];
  medics: MedStaff[];
  neg: NegSession | null;
  negCooldown: Record<string, number>;
  /** paridade semanal de eventos do feed */
  seenCrises: Record<string, 1>;
}

declare module '../../ext4' {
  interface Ext4 {
    people: PeopleState;
  }
}

registerExt4('people', () => ({
  thoughts: {}, health: {}, promises: [], lastTalk: {}, talkCount: {}, secrets: [], secretsSeeded: {}, owner: null, career: {},
  romances: [], wealth: {}, lastRoyalty: {}, inbox: [], readUntil: 0, feed: [], breakdowns: [], bonds: {}, roster: [], medics: [], neg: null,
  negCooldown: {}, seenCrises: {},
}));

export function P(s: GameState): PeopleState {
  const st = s as unknown as { x4: { people?: PeopleState } };
  st.x4 ??= {} as never;
  if (!st.x4.people) {
    st.x4.people = {
      thoughts: {}, health: {}, promises: [], lastTalk: {}, talkCount: {}, secrets: [], secretsSeeded: {}, owner: null, career: {},
      romances: [], wealth: {}, lastRoyalty: {}, inbox: [], readUntil: 0, feed: [], breakdowns: [], bonds: {}, roster: [], medics: [], neg: null,
      negCooldown: {}, seenCrises: {},
    };
  }
  return st.x4.people;
}

// ---------------------------------------------------------------- helpers

export const today = (s: GameState): number => s.day + (s.clock?.dayInMonth ?? 0);

/** Pessoas acompanhadas de perto: integrantes vivos dos atos do jogador. */
export function trackedPersons(s: GameState): Person[] {
  const out: Person[] = [];
  const seen = new Set<string>();
  for (const id of playerActs(s)) {
    for (const pid of s.acts[id].members) {
      const p = s.persons[pid];
      if (p?.alive && !seen.has(pid)) {
        seen.add(pid);
        out.push(p);
      }
    }
  }
  return out;
}

/** Ato principal (do jogador, se houver) de uma pessoa. */
export function actOf(s: GameState, pid: string): Act | undefined {
  let best: Act | undefined;
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (a.members.includes(pid) && (!best || a.members.length > best.members.length)) best = a;
  }
  return best;
}

export function ageOf(s: GameState, p: Person): number {
  return s.year - p.born;
}

export function healthOf(s: GameState, pid: string): Health {
  const st = P(s);
  return (st.health[pid] ??= { voice: 10, hearing: 0, injuryWeeks: 0, strain: 0, dependency: 0 });
}

// ---------------------------------------------------------------- meio de comunicação por era

export type Medium = 'letter' | 'telegram' | 'phone' | 'fax' | 'email' | 'message';

export function mediumFor(year: number, urgent = false): Medium {
  if (year < 1950) return urgent ? 'telegram' : 'letter';
  if (year < 1980) return urgent ? 'phone' : year < 1965 ? 'letter' : 'phone';
  if (year < 1995) return urgent ? 'phone' : 'fax';
  if (year < 2010) return 'email';
  return 'message';
}

export const MEDIUM_NAME: Record<Medium, L> = {
  letter: l('Carta', 'Letter'),
  telegram: l('Telegrama', 'Telegram'),
  phone: l('Telefonema', 'Phone call'),
  fax: l('Fax', 'Fax'),
  email: l('E-mail', 'E-mail'),
  message: l('Mensagem', 'Message'),
};

export function addMsg(s: GameState, m: Omit<InboxMsg, 'id' | 'week' | 'year'>): InboxMsg {
  const st = P(s);
  const msg: InboxMsg = { id: nextId(s, 'ib'), week: s.week, year: s.year, ...m };
  st.inbox.push(msg);
  if (st.inbox.length > 60) {
    // descarta primeiro o que já foi resolvido
    const drop = st.inbox.findIndex((x) => x.resolved || !x.actions?.length);
    st.inbox.splice(drop >= 0 ? drop : 0, 1);
  }
  return msg;
}

export function socialEra(year: number): boolean {
  return year >= 2004;
}

export function addPost(s: GameState, p: Omit<FeedPost, 'id' | 'week' | 'year'>): FeedPost {
  const st = P(s);
  const post: FeedPost = { id: nextId(s, 'fp'), week: s.week, year: s.year, ...p };
  st.feed.push(post);
  if (st.feed.length > 80) st.feed.splice(0, st.feed.length - 80);
  return post;
}

export const clamp01 = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
