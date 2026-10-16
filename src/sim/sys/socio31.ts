// R31 · onda 3 (SOC) — SÓCIOS E COMPRAS. Festivais, casas de shows, rádios e estúdios que JÁ EXISTEM no mundo
// (festivais do catálogo, casas reais de venues17, emissoras de radio18, estúdios reais de more19) podem ser comprados
// inteiros ou em parte; também dá para criar um negócio novo junto com um parceiro (selo rival, prefeitura, marca ou
// casa de shows) com um acordo escrito e renegociável. Você pode vender sua parte para o sócio ou para o mercado.
//
//   preço        o mesmo modelo de valor da bolsa (value31): o que rende × múltiplo, prestígio e público, histórico,
//                dívidas — conta por parte (fato / cálculo / hipótese) que soma o total; a fatia paga o prêmio de
//                controle de `dealPremium31` (o mesmo de `dealValue31`).
//   quem vende   o dono (líder do selo rival ou proprietário independente) decide pela opinião sobre você
//                (opinion.ts), pela intimidade e pelos amigos em comum (grafo social31), pela rivalidade e pela
//                necessidade de dinheiro. Lendários só vendem parte (até 49%); os maiores nunca. Sem sorteio: a
//                resposta é a mesma conta mostrada antes do clique.
//   sociedade    votos pela participação (pontos-base, somam 10.000). Decisões: preço, programação (line-up),
//                data (festival) e investimento. O acordo diz quem decide cada uma (voto, você ou o sócio).
//                Discordar conta na relação (opine). Resultado do mês dividido na mesma proporção no fechamento:
//                lucro vira dividendo, prejuízo vira aporte; o resto do arredondamento vai para a maior parte (a
//                soma das partes é exatamente o resultado).
//   sócio NPC    no mês: propõe decisão (você vota pela pendência), pede para sair (você compra a parte dele ou ele
//                vende a um terceiro), briga quando a tensão passa do limite (fato público, opinião cai, o mês rende
//                menos). Sorte do mês: fluxo rng19 'socio31', só consumido quando você tem participação.
//   dinheiro     selo: `post` (compra = investimento; dividendo e prejuízo = não operacional) com o projeto
//                `soc:<id>` — entra nos resultados por projeto (results31); pessoal: `purse` (dividend/business/invest).
//
// Estado em `x4.socio31`. Interruptor `soc31` (desligado: nada compra, cria ou fecha mês). Explorar (listar, cotar,
// ver quem aceita) só lê.

import { Rng, clamp, hashString } from '../../core/rng';
import { formatMoney } from '../../core/money';
import { FESTIVALS } from '../../data/catalog';
import { STUDIOS19 } from '../../data/more19/index';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine, opinionOf } from '../opinion';
import { rng19 } from '../rng19';
import { intimacy31, meNode31, neighbors31 } from '../social31';
import type { GameState } from '../types';
import { fmtL, money, post } from '../util';
import { freeCash20 } from '../oblig20';
import { registerEditable, registerRunnable } from '../r31/editor';
import { registerPendingSource } from '../r31/pending';
import { purse } from '../r31/purse31';
import { projName31 } from '../r31/results31';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { withTxn } from '../r31/txn';
import { dealPremium31, registerStakes31, type Basis31 } from '../r31/value31';
import { ownerOf } from './people/owner';
import { radio18, radioWeight18 } from './radio18';
import { venueBlock17, VENUES17, venueOpen } from './venues17';
import { realVenues } from './venuestore27';
import type { Holder } from './ventures9';

// ---------------------------------------------------------------- interruptor e tipos

export const SW_SOC31 = 'soc31';
registerSwitch({
  id: SW_SOC31, def: true, scope: 'game',
  desc: l('Sócios e compras: comprar festivais, casas, rádios e estúdios existentes (inteiros ou parte), criar com sócio, votar e dividir o resultado; desligado, nada se compra e as sociedades não fecham o mês.',
    'Partners and buyouts: buy existing festivals, venues, radio stations and studios (whole or part), found with a partner, vote and split results; off, nothing can be bought and partnerships do not close the month.'),
});
export const soc31On = (s: GameState): boolean => sw<boolean>(s, SW_SOC31);

export type SKind31 = 'fest' | 'venue' | 'radio' | 'studio';
export type Topic31 = 'price' | 'prog' | 'date' | 'invest';
/** quem decide um assunto: voto pela participação, você, ou o sócio principal */
export type Who31 = 'vote' | 'me' | 'p';
/** saída: livre (vende a quem quiser), preferência (o sócio tem a primeira chance), travada (só para o sócio) */
export type Exit31 = 'free' | 'first' | 'locked';
export type PartnerK31 = 'label' | 'indep' | 'city' | 'brand' | 'venue';

export const TOTAL31 = 10000; // pontos-base
export interface Partner31 {
  /** chave de opinião e nó do grafo social: 'l:<líder>' (selo rival) ou 'e:soc:<…>' (independente/instituição) */
  k: string;
  n: string;
  sh: number;
  pk: PartnerK31;
  /** selo rival (quando é um) */
  lb?: string;
}
export interface Set31 { price: number; prog: number; month: number; pr: number }
export interface Month31 { y: number; m: number; rev: number; cost: number; res: number; mine: number }
export interface Ask31 { k: 'vote' | 'exit'; due: number; from: string; topic?: Topic31; v?: number; price?: number; sh?: number }
export interface Biz31 {
  id: string; kind: SKind31; name: string; city: string;
  /** criado em conjunto (não existia antes) */
  jv?: 1;
  h: Holder;
  me: number;
  p: Partner31[];
  rules: Record<Topic31, Who31>;
  exit: Exit31;
  set: Set31;
  /** dívida do negócio (fixada na compra) */
  debt: number;
  since: number;
  /** quanto você pagou/recebeu pela participação (líquido) e o resultado acumulado que coube a você */
  paid: number; got: number;
  /** tensão entre os sócios 0..100 */
  ten: number;
  /** mês da última proposta por assunto (uma por mês) */
  lastVote: Partial<Record<Topic31, number>>;
  months: Month31[];
  ask?: Ask31;
  log: { w: number; t: L }[];
}
export interface Socio31State { b: Record<string, Biz31>; seq: number; done: { id: string; name: string; y: number; got: number; paid: number }[]; n: { buys: number; sells: number; votes: number; fights: number; exits: number } }
const fresh = (): Socio31State => ({ b: {}, seq: 0, done: [], n: { buys: 0, sells: 0, votes: 0, fights: 0, exits: 0 } });
declare module '../ext4' { interface Ext4 { socio31: Socio31State } }
registerExt4('socio31', fresh);
export function socio31(s: GameState): Socio31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.socio31 ??= fresh()) as Socio31State;
}

// ---------------------------------------------------------------- dados

export const SKIND31: Record<SKind31, { name: L; plural: L; icon: string; found: number; topics: Topic31[]; noise: number }> = {
  fest: { name: l('Festival', 'Festival'), plural: l('Festivais', 'Festivals'), icon: 'fans', found: 120000, topics: ['price', 'prog', 'date', 'invest'], noise: 0.12 },
  venue: { name: l('Casa de shows', 'Venue'), plural: l('Casas de shows', 'Venues'), icon: 'house', found: 90000, topics: ['price', 'prog', 'invest'], noise: 0.08 },
  radio: { name: l('Rádio', 'Radio station'), plural: l('Rádios', 'Radio stations'), icon: 'radio', found: 70000, topics: ['price', 'prog', 'invest'], noise: 0.06 },
  studio: { name: l('Estúdio', 'Studio'), plural: l('Estúdios', 'Studios'), icon: 'mic', found: 60000, topics: ['price', 'prog', 'invest'], noise: 0.07 },
};
export const TOPIC31: Record<Topic31, { name: L; opts: L[] }> = {
  price: { name: l('Preço (ingresso, anúncio, diária)', 'Price (tickets, ads, day rate)'), opts: [l('Barato', 'Cheap'), l('Normal', 'Normal'), l('Caro', 'Pricey')] },
  prog: { name: l('Line-up e programação', 'Line-up and programming'), opts: [l('Seguro (nomes conhecidos)', 'Safe (known names)'), l('Equilibrado', 'Balanced'), l('Ousado (descobertas)', 'Bold (discoveries)')] },
  date: { name: l('Data da edição', 'Edition date'), opts: [] },
  invest: { name: l('Investir na estrutura', 'Invest in the facilities'), opts: [l('Não investir', 'Do not invest'), l('Investir (um mês de receita)', 'Invest (one month of revenue)')] },
};
export const WHO31: Record<Who31, L> = { vote: l('voto pela participação', 'vote by stake'), me: l('você decide', 'you decide'), p: l('o sócio decide', 'the partner decides') };
export const EXIT31: Record<Exit31, { name: L; desc: L }> = {
  free: { name: l('Saída livre', 'Free exit'), desc: l('Cada sócio vende a sua parte a quem quiser.', 'Each partner sells their stake to whoever they like.') },
  first: { name: l('Preferência do sócio', 'Partner\'s right of first refusal'), desc: l('Quem sai oferece primeiro ao sócio, pelo preço do momento.', 'Whoever leaves offers to the partner first, at the current price.') },
  locked: { name: l('Só entre os sócios', 'Partners only'), desc: l('A parte só pode ser vendida ao outro sócio.', 'A stake can only be sold to the other partner.') },
};
export const PARTNERK31: Record<Exclude<PartnerK31, 'label' | 'indep'>, { name: L; topic: Topic31; brings: L }> = {
  city: { name: l('Prefeitura da cidade', 'City hall'), topic: 'date', brings: l('Terreno e licenças; quer data boa para a cidade.', 'Land and permits; wants a date that suits the city.') },
  brand: { name: l('Marca patrocinadora', 'Sponsoring brand'), topic: 'price', brings: l('Dinheiro e divulgação; quer público grande.', 'Money and promotion; wants big crowds.') },
  venue: { name: l('Casa de shows parceira', 'Partner venue'), topic: 'prog', brings: l('Produção e equipe; quer cuidar da programação.', 'Production and crew; wants to run the programming.') },
};
const KIND_FOR_JV: SKind31[] = ['fest', 'venue', 'radio', 'studio'];

const NAMES_A = ['Arlindo', 'Beatriz', 'Carmen', 'Dario', 'Elvira', 'Fausto', 'Gilda', 'Horácio', 'Irene', 'Jonas', 'Lídia', 'Marcel', 'Nora', 'Otávio', 'Paula', 'Raul', 'Selma', 'Teodoro', 'Úrsula', 'Vitor'];
const NAMES_B = ['Albuquerque', 'Bertoni', 'Caldas', 'Delacroix', 'Esteves', 'Falcão', 'Gomes', 'Halloran', 'Ibáñez', 'Junqueira', 'Krauss', 'Lemos', 'Moretti', 'Nakamura', 'Okoye', 'Prado', 'Quintela', 'Rossi', 'Sampaio', 'Valente'];
const CO = ['& Filhos', 'Entretenimento', 'Produções', 'Participações', 'Grupo'];

const mL = (c: number): L => l(formatMoney(Math.round(c), 'pt-BR'), formatMoney(Math.round(c), 'en-US'));
const pctL = (bp: number): string => `${Math.round(bp / 10) / 10}%`.replace('.', ',');
export const pct31 = (bp: number): L => l(pctL(bp), `${Math.round(bp / 10) / 10}%`);
const mIdx = (s: GameState): number => s.year * 12 + s.month;

// ---------------------------------------------------------------- alvos: o que existe para comprar

export interface Target31 {
  id: string; kind: SKind31; name: string; city: string; prestige: number;
  /** escala de público (pessoas por edição/noite; alcance da rádio ×100) */
  cap: number;
  since: number;
  /** lendário: só vende parte (até 49%) */
  legend: boolean;
  /** nunca vende */
  never: boolean;
  owner: Partner31;
  /** mês da edição (festival) */
  month: number;
  /** extras do modelo (rádio: alcance e relação) */
  reach?: number;
}

const slug = (n: string): string => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const h31 = (s: GameState, k: string): number => hashString(`${s.config.seed}|socio31|${k}`);

/** Dono "de fábrica" de um negócio que você ainda não tocou: um selo rival ativo (pela chave) ou um independente. */
function ownerOf31(s: GameState, tid: string): Partner31 {
  const h = h31(s, `own|${tid}`);
  const labs = Object.values(s.labels).filter((lb) => lb.active && lb.leaderId).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (labs.length && h % 3 === 0) {
    const lb = labs[(h >>> 3) % labs.length];
    return { k: `l:${lb.leaderId}`, n: lb.name, sh: TOTAL31, pk: 'label', lb: lb.id };
  }
  const n = `${NAMES_A[(h >>> 4) % NAMES_A.length]} ${NAMES_B[(h >>> 9) % NAMES_B.length]}`;
  return { k: `e:soc:${tid}`, n: (h >>> 14) % 3 === 0 ? `${NAMES_B[(h >>> 9) % NAMES_B.length]} ${CO[(h >>> 17) % CO.length]}` : n, sh: TOTAL31, pk: 'indep' };
}

/** Tudo o que existe agora e pode ter dono (só leitura; o que você já tem fica de fora — está em `socio31`). */
export function targets31(s: GameState, withMine = false): Target31[] {
  const out: Target31[] = [];
  const mine = withMine ? {} : socio31(s).b;
  const push = (t: Omit<Target31, 'owner' | 'never' | 'legend'> & { legend?: boolean; never?: boolean }) => {
    if (mine[t.id]) return;
    out.push({ ...t, legend: t.legend ?? t.prestige >= 88, never: t.never ?? t.prestige >= 94, owner: ownerOf31(s, t.id) });
  };
  for (const f of FESTIVALS) {
    if (f.start > s.year || (f.end && f.end < s.year) || !cityById[f.city]) continue;
    push({ id: `fe:${slug(f.name)}`, kind: 'fest', name: f.name, city: f.city, prestige: f.prestige, cap: f.capacity ?? Math.round(8000 + f.prestige * f.prestige * 6), since: f.start, month: f.month ?? h31(s, f.name) % 12 });
  }
  const held17 = new Set(realVenues(s).map((o) => o.id));
  for (const d of VENUES17) {
    if (d.buyable === false || held17.has(d.id) || !venueOpen(s, d) || !cityById[d.city]) continue;
    push({ id: `ve:${d.id}`, kind: 'venue', name: d.name, city: d.city, prestige: d.prestige, cap: d.cap, since: d.from, month: 0 });
  }
  for (const st of radio18(s).st) {
    const pr = clamp(Math.round(30 + st.reach * 25 + st.rel / 3), 20, 85);
    push({ id: `ra:${st.id}`, kind: 'radio', name: st.call, city: s.config.homeCity, prestige: pr, cap: Math.round(st.reach * 100), since: s.year - 3 - (hashString(st.id) % 20), month: 0, reach: st.reach, legend: false, never: false });
  }
  for (const x of STUDIOS19) {
    if (x.from > s.year || (x.to && x.to < s.year) || (!s.config.realNames && x.exact === false) || !cityById[x.city]) continue;
    push({ id: `st:${x.id}`, kind: 'studio', name: x.name, city: x.city, prestige: x.prestige, cap: 0, since: x.from, month: 0 });
  }
  return out;
}
export const target31 = (s: GameState, tid: string, withMine = false): Target31 | undefined => targets31(s, withMine).find((t) => t.id === tid);

// ---------------------------------------------------------------- economia de um negócio (média do mês, sem sorte)

export interface Flow31 { rev: number; cost: number; why: L[] }
interface Model31 { kind: SKind31; prestige: number; cap: number; month: number; reach?: number; set: Set31 }

/** Receita e custo esperados deste mês (centavos), sem a sorte. Festival: a receita cai toda no mês da edição. */
export function flow31(s: GameState, x: Model31, month = s.month): Flow31 {
  const why: L[] = [];
  const pr = clamp(x.set.pr, 5, 100);
  let annual: number; let ratio: number;
  switch (x.kind) {
    case 'fest': annual = 900 * x.cap * (0.35 + pr / 100); ratio = 0.9; why.push(l('Festival: a receita vem toda no mês da edição; o resto do ano só tem custo.', 'Festival: revenue all comes in the edition month; the rest of the year only has costs.')); break;
    case 'venue': annual = 14 * x.cap * 12 * (0.35 + pr / 90); ratio = 0.88; break;
    case 'radio': annual = 380000 * (x.reach ?? 1) * (0.5 + pr / 100) * Math.max(0.2, radioWeight18(s)); ratio = 0.86; if (radioWeight18(s) < 1) why.push(l('Rádio pesa menos nesta época.', 'Radio counts for less in this era.')); break;
    default: annual = 230000 * Math.pow(pr / 60, 1.5); ratio = 0.84;
  }
  // decisões: preço muda a receita e a margem; programação ousada custa mais e (ver mês) faz prestígio
  const pf = [0.93, 1, 1.07][x.set.price] ?? 1;
  const cf = [0.97, 1, 1.05][x.set.prog] ?? 1;
  annual *= pf;
  ratio *= cf * (x.set.price === 2 ? 0.98 : x.set.price === 0 ? 1.03 : 1);
  const A = money(s, annual);
  let rev: number; let cost: number;
  if (x.kind === 'fest') {
    const ed = month === x.month;
    rev = ed ? A : 0;
    cost = Math.round(A * ratio * (ed ? 0.78 : 0.22 / 11));
  } else { rev = Math.round(A / 12); cost = Math.round((A / 12) * ratio); }
  return { rev: Math.round(rev), cost, why };
}

/** Resultado esperado de 12 meses. */
export function annual31(s: GameState, x: Model31): number {
  let t = 0;
  for (let m = 0; m < 12; m++) { const f = flow31(s, x, m); t += f.rev - f.cost; }
  return t;
}

const modelOfT = (t: Target31): Model31 => ({ kind: t.kind, prestige: t.prestige, cap: t.cap, month: t.month, reach: t.reach, set: { price: 1, prog: 1, month: t.month, pr: t.prestige } });
const modelOfB = (s: GameState, b: Biz31): Model31 => {
  const t = baseOf(s, b);
  return { kind: b.kind, prestige: b.set.pr, cap: t.cap, month: b.set.month, reach: t.reach, set: b.set };
};
/** Dados de base de um negócio seu (o alvo original, ou o novo criado em conjunto). */
function baseOf(s: GameState, b: Biz31): { cap: number; reach?: number; since: number; legend: boolean; never: boolean } {
  if (b.jv) return { cap: b.kind === 'fest' ? 6000 : b.kind === 'venue' ? 600 : b.kind === 'radio' ? 80 : 0, reach: b.kind === 'radio' ? 0.8 : undefined, since: Math.floor(b.since / 52) + 1889, legend: false, never: false };
  const T = rawTarget(s, b.id);
  return { cap: T?.cap ?? 500, reach: T?.reach, since: T?.since ?? s.year, legend: !!T?.legend, never: !!T?.never };
}
/** O alvo original mesmo quando já é seu (para capacidade, ano de fundação e status de lendário). */
const rawTarget = (s: GameState, id: string): Target31 | undefined => target31(s, id, true);

// ---------------------------------------------------------------- valor (mesmo modelo da bolsa: partes que somam o total)

export interface VPart31 { k: 'earn' | 'brand' | 'history' | 'debt' | 'floor'; v: number; basis: Basis31; name: L; why: L }
export interface BizValue31 { total: number; parts: VPart31[]; annual: number }

function valueOfModel(s: GameState, x: Model31, since: number, debt: number, actual?: number): BizValue31 {
  const P: VPart31[] = [];
  const add = (k: VPart31['k'], v: number, basis: Basis31, name: L, why: L) => { P.push({ k, v: Math.round(v), basis, name, why }); };
  const ann = actual ?? annual31(s, x);
  const mult = 5 + x.set.pr / 20;
  add('earn', Math.max(0, ann) * mult, actual !== undefined ? 'fact' : 'calc', l('O que rende', 'What it earns'),
    fmtL(l('Resultado de 12 meses {r} × {m} anos.', '12-month result {r} × {m} years.'), { r: mL(ann), m: Math.round(mult * 10) / 10 }));
  if (ann < 0) add('earn', ann * 2, 'calc', l('Prejuízo', 'Losses'), l('Dá prejuízo: quem compra desconta dois anos de perdas.', 'It loses money: a buyer discounts two years of losses.'));
  const brandK = x.kind === 'fest' ? 60 : x.kind === 'venue' ? 30 : x.kind === 'radio' ? 25 : 35;
  add('brand', money(s, x.set.pr * x.set.pr * brandK * (x.kind === 'radio' ? 1 : 1 + x.cap / 20000)), 'hyp', l('Prestígio e público', 'Prestige and audience'),
    fmtL(l('Nome conhecido e público fiel (prestígio {p}).', 'Known name and loyal audience (prestige {p}).'), { p: Math.round(x.set.pr) }));
  const yrs = clamp(s.year - since, 0, 40);
  add('history', money(s, yrs * 450 * (x.set.pr / 50)), 'calc', l('Histórico', 'History'), fmtL(l('{n} anos de estrada.', '{n} years running.'), { n: yrs }));
  add('debt', -debt, 'fact', l('Dívidas', 'Debts'), l('Empréstimos e fornecedores a pagar.', 'Loans and suppliers to pay.'));
  let sum = P.reduce((t, p) => t + p.v, 0);
  const floor = money(s, 15000);
  if (sum < floor) { add('floor', floor - sum, 'hyp', l('Piso', 'Floor'), l('Abaixo disto ninguém vende: marca, contatos e equipamento.', 'Nobody sells below this: brand, contacts and gear.')); sum = floor; }
  return { total: sum, parts: P, annual: ann };
}
const debt0 = (s: GameState, t: Target31): number => Math.round(Math.max(0, annual31(s, modelOfT(t)) + money(s, 20000)) * ((h31(s, `debt|${t.id}`) % 35) / 100));

/** Valor de um negócio (alvo ou seu). */
export function bizValue31(s: GameState, id: string): BizValue31 | undefined {
  const b = socio31(s).b[id];
  if (b) {
    const last = b.months.slice(-12);
    const actual = last.length >= 12 ? last.reduce((t, m) => t + m.res, 0) : undefined;
    return valueOfModel(s, modelOfB(s, b), baseOf(s, b).since, b.debt, actual);
  }
  const t = target31(s, id);
  return t ? valueOfModel(s, modelOfT(t), t.since, debt0(s, t)) : undefined;
}

/** Preço de uma fatia (pontos-base) pelo valor, com o prêmio de controle da bolsa (`dealPremium31`). */
export function quote31(s: GameState, id: string, bp: number, held = 0): number {
  const v = bizValue31(s, id);
  if (!v || bp <= 0) return 0;
  return Math.round(v.total * (bp / TOTAL31) * dealPremium31((held + bp) / TOTAL31));
}

// ---------------------------------------------------------------- quem aceita negociar (sem sorteio)

export interface Accept31 { ok: boolean; score: number; why: L[]; maxBp: number }

/** O dono `o` aceita vender `bp` (pontos-base) de `id` a você? A conta é a mesma mostrada antes do clique. */
export function accept31(s: GameState, id: string, o: Partner31, bp: number, held = 0, ctx: { legend?: boolean; never?: boolean } = {}): Accept31 {
  const why: L[] = [];
  if (ctx.never) return { ok: false, score: -100, why: [l('É uma instituição: o dono não vende nenhuma parte.', 'It is an institution: the owner will not sell any part.')], maxBp: 0 };
  const maxBp = ctx.legend ? Math.min(o.sh, Math.max(0, 4900 - held)) : o.sh;
  if (bp > maxBp) return { ok: false, score: -100, why: [maxBp > 0 ? fmtL(l('Lendário: o dono só vende até {p} a você.', 'Legendary: the owner sells you at most {p}.'), { p: pct31(maxBp) }) : l('Lendário: você já tem tudo o que o dono aceita vender.', 'Legendary: you already hold all the owner will sell.')], maxBp };
  let sc = 10;
  const op = opinionOf(s, o.k);
  sc += op / 2;
  why.push(fmtL(l('Opinião do dono sobre você: {v}.', 'Owner\'s opinion of you: {v}.'), { v: op }));
  const me = meNode31(s);
  const node = o.k;
  const i = intimacy31(s, me, node);
  if (i) { sc += i / 4; why.push(fmtL(l('Vocês se conhecem (intimidade {i}).', 'You know each other (intimacy {i}).'), { i: Math.round(i) })); }
  const mine = new Set(neighbors31(s, me));
  const common = mine.size ? neighbors31(s, node).filter((x) => mine.has(x)).length : 0;
  if (common) { sc += Math.min(15, common * 5); why.push(fmtL(l('{n} conhecido(s) em comum falam por você.', '{n} mutual acquaintance(s) vouch for you.'), { n: common })); }
  const after = held + bp;
  if (after > 5000) { sc -= after >= TOTAL31 ? 25 : 15; why.push(after >= TOTAL31 ? l('Vender tudo pesa: o dono perde o que construiu.', 'Selling everything hurts: the owner gives up what they built.') : l('Passar o controle pesa para o dono.', 'Handing over control weighs on the owner.')); }
  if (ctx.legend) { sc -= 20; why.push(l('Lendário: o dono tem orgulho e pouca pressa.', 'Legendary: the owner is proud and in no hurry.')); }
  if (o.lb) {
    const lb = s.labels[o.lb];
    const feud = Math.round(s.rivalries?.[o.lb] ?? 0);
    if (feud > 0) { sc -= feud / 3; why.push(fmtL(l('Rivalidade com o selo dele ({v}).', 'Rivalry with their label ({v}).'), { v: feud })); }
    if (lb && lb.cash < 0) { sc += 20; why.push(l('O selo dono está sem caixa e precisa vender.', 'The owning label is out of cash and needs to sell.')); }
  } else {
    const need = h31(s, `need|${id}|${s.year}`) % 21;
    if (need >= 12) { sc += need; why.push(l('O dono anda precisando de dinheiro este ano.', 'The owner needs money this year.')); }
  }
  sc = Math.round(sc);
  why.push(sc >= 0 ? l('Resultado: aceita negociar.', 'Result: willing to deal.') : l('Resultado: não quer vender agora.', 'Result: not willing to sell now.'));
  return { ok: sc >= 0, score: sc, why, maxBp };
}

// ---------------------------------------------------------------- travas (motivo antes do clique)

const funds31 = (s: GameState, h: Holder): number => (h === 'label' ? freeCash20(s) : ownerOf(s).wealth);
export interface Lock31Lite { why: L; unlock: L }
const lk = (why: L, unlock: L): Lock31Lite => ({ why, unlock });
const OFF = (): Lock31Lite => lk(l('Sócios e compras está desligado nesta partida.', 'Partners and buyouts is switched off in this game.'), l('Ligue o interruptor "Sócios e compras" no editor.', 'Turn on the "Partners and buyouts" switch in the editor.'));
const cashLk = (s: GameState, h: Holder, cost: number): Lock31Lite | null => {
  const f = funds31(s, h);
  if (f >= cost) return null;
  return lk(fmtL(h === 'label' ? l('Caixa livre do selo {f}; precisa de {c}.', 'Label free cash {f}; needs {c}.') : l('Seu dinheiro pessoal {f}; precisa de {c}.', 'Your personal money {f}; needs {c}.'), { f: mL(Math.max(0, f)), c: mL(cost) }),
    h === 'label' ? l('Junte caixa (receitas, venda, empréstimo) ou compre com o dinheiro pessoal.', 'Raise cash (income, a sale, a loan) or buy with personal money.') : l('Junte dinheiro pessoal ou compre pelo caixa do selo.', 'Raise personal money or buy with label cash.'));
};

/** R31 onda 4 (W): travas extras de compra (antitruste em r31/w31.ts) — valem no formulário e na cena. */
export const BUY_GATE31: ((s: GameState, id: string, bp: number, h: Holder) => Lock31Lite | null)[] = [];

/** Trava de compra (null = pode). */
export function buyLock31(s: GameState, id: string, bp: number, h: Holder): Lock31Lite | null {
  if (!soc31On(s)) return OFF();
  if (bp <= 0 || bp > TOTAL31) return lk(l('Escolha uma fatia entre 1% e 100%.', 'Pick a slice between 1% and 100%.'), l('Ajuste a fatia.', 'Adjust the slice.'));
  const b = socio31(s).b[id];
  const t = b ? undefined : target31(s, id);
  if (!b && !t) return lk(l('Esse negócio não existe agora.', 'That business does not exist now.'), l('Escolha outro da lista.', 'Pick another from the list.'));
  if (b && b.h !== h) return lk(fmtL(l('Sua parte está no {h}.', 'Your stake is held by {h}.'), { h: b.h === 'label' ? l('selo', 'label') : l('seu nome', 'your name') }), l('Compre pelo mesmo bolso da parte que você já tem.', 'Buy with the same purse as your current stake.'));
  if (b?.ask?.k === 'exit') return lk(l('O sócio quer sair: responda o pedido primeiro.', 'The partner wants out: answer the request first.'), l('Responda o pedido de saída do sócio.', 'Answer the partner\'s exit request.'));
  const o = b ? mainPartner(b) : t!.owner;
  if (!o) return lk(l('Você já tem 100%.', 'You already own 100%.'), l('Nada a comprar.', 'Nothing to buy.'));
  const base = b ? baseOf(s, b) : { legend: t!.legend, never: t!.never };
  for (const g of BUY_GATE31) { const no = g(s, id, bp, h); if (no) return no; }
  const a = accept31(s, id, o, bp, b?.me ?? 0, base);
  if (!a.ok) return lk(a.why[0].pt.startsWith('Resultado') ? a.why[a.why.length - 1] : a.why[0], l('Melhore a relação com o dono (favores, conhecidos em comum) ou tente uma fatia menor.', 'Improve your relationship with the owner (favours, mutual acquaintances) or try a smaller slice.'));
  return cashLk(s, h, quote31(s, id, bp, b?.me ?? 0));
}

// ---------------------------------------------------------------- ações do jogador

const mainPartner = (b: Biz31): Partner31 | undefined => [...b.p].sort((x, y) => y.sh - x.sh || (x.k < y.k ? -1 : 1))[0];
function log(b: Biz31, s: GameState, t: L): void { b.log.push({ w: s.week, t }); if (b.log.length > 12) b.log.splice(0, b.log.length - 12); }

/** Dinheiro da participação: selo pelo livro (com o projeto `soc:<id>`); pessoal pelo bolso. */
function payMine(s: GameState, b: Biz31, amt: number, what: 'buy' | 'sell' | 'div' | 'loss' | 'found', memo: string): void {
  amt = Math.round(amt);
  if (!amt) return;
  const key = `soc31:${what}:${b.id}:${mIdx(s)}:${socio31(s).seq++}`;
  if (b.h === 'label') {
    const cat = what === 'buy' || what === 'found' ? 'acquisitions' : what === 'sell' ? 'asset_sales' : what === 'div' ? 'dividends' : 'other';
    withTxn({ project: `soc:${b.id}`, payer: amt > 0 ? 'ext' : 'player', beneficiary: amt > 0 ? 'player' : 'ext' }, () => post(s, key, amt, cat, memo));
  } else {
    const cat = what === 'div' ? 'dividend' : what === 'loss' ? 'business' : 'invest';
    purse(s, amt, cat, key, { memo: l(memo, memo) });
  }
}

function fact(s: GameState, b: Biz31, text: L, tags: string[], sev = 40, tone: 'good' | 'bad' | 'info' = 'info', actors: string[] = []): void {
  emitFact(s, { kind: 'deal', actors: ['player', ...actors], place: b.city, severity: sev, visibility: 'public', tags: ['soc31', ...tags], text, src: 'socio31', diary: true, notify: tone });
}

const RULES0 = (): Record<Topic31, Who31> => ({ price: 'vote', prog: 'vote', date: 'vote', invest: 'vote' });

/** Compra `bp` pontos-base (1% = 100) de um negócio existente (ou mais do que você já tem). Devolve erro ou null. */
export function buy31(s: GameState, id: string, bp: number, h: Holder = 'label'): L | null {
  bp = Math.round(bp);
  const lock = buyLock31(s, id, bp, h);
  if (lock) return lock.why;
  const st = socio31(s);
  let b = st.b[id];
  const price = quote31(s, id, bp, b?.me ?? 0);
  if (!b) {
    const t = target31(s, id)!;
    b = st.b[id] = {
      id, kind: t.kind, name: t.name, city: t.city, h, me: 0, p: [{ ...t.owner }], rules: RULES0(), exit: 'free',
      set: { price: 1, prog: 1, month: t.month, pr: t.prestige }, debt: debt0(s, t), since: s.week, paid: 0, got: 0, ten: 10, lastVote: {}, months: [], log: [],
    };
  }
  const o = mainPartner(b)!;
  o.sh -= bp;
  b.me += bp;
  b.p = b.p.filter((x) => x.sh > 0);
  b.paid += price;
  payMine(s, b, -price, 'buy', `Compra de ${pctL(bp)} de ${b.name}`);
  opine(s, o.k, 2, l('Fechamos negócio.', 'We closed a deal.'));
  st.n.buys++;
  const txt = fmtL(b.me >= TOTAL31 ? l('Você comprou {n} inteiro, por {v}.', 'You bought {n} outright, for {v}.') : l('Você comprou {p} de {n} ({d}), por {v}.', 'You bought {p} of {n} (from {d}), for {v}.'), { n: b.name, p: pct31(bp), d: o.n, v: mL(price) });
  log(b, s, txt);
  fact(s, b, txt, ['buy'], 45, 'good');
  return null;
}

/** Trava de venda. */
export function sellLock31(s: GameState, id: string, bp: number, to: 'partner' | 'market'): Lock31Lite | null {
  if (!soc31On(s)) return OFF();
  const b = socio31(s).b[id];
  if (!b || b.me <= 0) return lk(l('Você não tem parte neste negócio.', 'You hold no stake in this business.'), l('Compre uma parte primeiro.', 'Buy a stake first.'));
  if (bp <= 0 || bp > b.me) return lk(fmtL(l('Você tem {p}.', 'You hold {p}.'), { p: pct31(b.me) }), l('Escolha uma fatia que você tenha.', 'Pick a slice you own.'));
  const o = mainPartner(b);
  if (to === 'partner') {
    if (!o) return lk(l('Não há sócio para comprar: você tem 100%.', 'No partner to buy: you own 100%.'), l('Venda ao mercado.', 'Sell to the market.'));
    if (opinionOf(s, o.k) < -40) return lk(fmtL(l('{n} está brigado com você e não quer comprar.', '{n} is at odds with you and won\'t buy.'), { n: o.n }), l('Venda ao mercado ou faça as pazes.', 'Sell to the market or make peace.'));
  } else {
    if (b.exit === 'locked' && o) return lk(l('O acordo só deixa vender ao sócio.', 'The agreement only allows selling to the partner.'), l('Venda ao sócio ou renegocie a cláusula de saída.', 'Sell to the partner or renegotiate the exit clause.'));
    if (b.exit === 'first' && o && opinionOf(s, o.k) >= -40) return lk(l('O sócio tem preferência: ofereça a ele primeiro.', 'The partner has first refusal: offer it to them first.'), l('Ofereça ao sócio (se ele recusar, a venda ao mercado libera).', 'Offer it to the partner (if they decline, the market sale opens up).'));
  }
  return null;
}

/** Vende `bp` da sua parte ao sócio (preço cheio) ou ao mercado (10% de desconto; entra um sócio novo). */
export function sell31(s: GameState, id: string, bp: number, to: 'partner' | 'market' = 'partner'): L | null {
  bp = Math.round(bp);
  const lock = sellLock31(s, id, bp, to);
  if (lock) return lock.why;
  const st = socio31(s);
  const b = st.b[id];
  const others = TOTAL31 - b.me;
  const price = Math.round(quote31(s, id, bp, others) * (to === 'market' ? 0.9 : 1));
  let buyer: Partner31;
  if (to === 'partner') buyer = mainPartner(b)!;
  else {
    const h = h31(s, `buyer|${id}|${s.week}`);
    buyer = { k: `e:soc:${id}:${st.seq}`, n: `${NAMES_A[h % NAMES_A.length]} ${NAMES_B[(h >>> 5) % NAMES_B.length]}`, sh: 0, pk: 'indep' };
    b.p.push(buyer);
  }
  buyer.sh += bp;
  b.me -= bp;
  b.paid -= price;
  payMine(s, b, price, 'sell', `Venda de ${pctL(bp)} de ${b.name}`);
  st.n.sells++;
  const txt = fmtL(l('Você vendeu {p} de {n} a {b}, por {v}.', 'You sold {p} of {n} to {b}, for {v}.'), { p: pct31(bp), n: b.name, b: buyer.n, v: mL(price) });
  log(b, s, txt);
  fact(s, b, txt, ['sell'], 35, 'info');
  if (b.me <= 0) { st.done.push({ id, name: b.name, y: s.year, got: b.got, paid: b.paid }); if (st.done.length > 30) st.done.shift(); delete st.b[id]; }
  return null;
}

// ---------------------------------------------------------------- criar em conjunto

export interface JvOpts31 { kind: SKind31; name: string; city?: string; pk: PartnerK31; lb?: string; me: number; h?: Holder; rules?: Partial<Record<Topic31, Who31>>; exit?: Exit31 }
export const foundCost31 = (s: GameState, kind: SKind31): number => money(s, SKIND31[kind].found);

function jvPartner(s: GameState, o: JvOpts31, city: string): Partner31 | null {
  if (o.pk === 'label') {
    const lb = o.lb ? s.labels[o.lb] : undefined;
    if (!lb?.active || !lb.leaderId) return null;
    return { k: `l:${lb.leaderId}`, n: lb.name, sh: 0, pk: 'label', lb: lb.id };
  }
  if (o.pk === 'indep') return null;
  const nm = PARTNERK31[o.pk].name;
  return { k: `e:soc:${o.pk}:${city}`, n: o.pk === 'city' ? `${nm.pt} · ${cityById[city]?.name.pt ?? ''}` : o.pk === 'brand' ? `${NAMES_B[h31(s, `brand|${city}`) % NAMES_B.length]} ${CO[1]}` : `${NAMES_B[h31(s, `ven|${city}`) % NAMES_B.length]} ${l('Casa', 'Hall').pt}`, sh: 0, pk: o.pk };
}

/** Quanto o parceiro aceita: a mesma conta de quem vende, com o peso do que ele quer decidir. */
export function jvAccept31(s: GameState, o: JvOpts31): Accept31 {
  const city = o.city && cityById[o.city] ? o.city : s.config.homeCity;
  const p = jvPartner(s, o, city);
  if (!p) return { ok: false, score: -100, why: [l('Escolha um parceiro que exista agora.', 'Pick a partner that exists now.')], maxBp: 0 };
  const why: L[] = [];
  let sc = 15 + opinionOf(s, p.k) / 2;
  why.push(fmtL(l('Opinião do parceiro sobre você: {v}.', 'Partner\'s opinion of you: {v}.'), { v: opinionOf(s, p.k) }));
  if (o.me > 6000) { sc -= (o.me - 6000) / 100; why.push(l('Você quer a maior parte: o parceiro entra com pouco.', 'You want the lion\'s share: the partner gets little.')); }
  const rules = { ...RULES0(), ...(o.rules ?? {}) };
  const wants = p.pk === 'label' ? 'prog' : PARTNERK31[p.pk as Exclude<PartnerK31, 'label' | 'indep'>].topic;
  if (rules[wants] === 'me') { sc -= 15; why.push(fmtL(l('Ele queria decidir "{t}".', 'They wanted to decide "{t}".'), { t: TOPIC31[wants].name })); }
  if (rules[wants] === 'p') { sc += 10; why.push(fmtL(l('Você deixa com ele "{t}": gostou.', 'You leave "{t}" to them: they like it.'), { t: TOPIC31[wants].name })); }
  const mine = Object.values(rules).filter((x) => x === 'me').length;
  if (mine >= 3) { sc -= 10; why.push(l('Você quer decidir quase tudo.', 'You want to decide almost everything.')); }
  if (o.exit === 'locked') { sc -= 5; why.push(l('Saída travada assusta.', 'A locked exit is off-putting.')); }
  if (p.lb && (s.rivalries?.[p.lb] ?? 0) > 0) { sc -= (s.rivalries![p.lb] ?? 0) / 3; why.push(l('Rivalidade entre os selos.', 'Rivalry between the labels.')); }
  sc = Math.round(sc);
  why.push(sc >= 0 ? l('Resultado: topa o acordo.', 'Result: accepts the deal.') : l('Resultado: recusa este acordo.', 'Result: turns down this deal.'));
  return { ok: sc >= 0, score: sc, why, maxBp: 9000 };
}

export function jvLock31(s: GameState, o: JvOpts31): Lock31Lite | null {
  if (!soc31On(s)) return OFF();
  if (!KIND_FOR_JV.includes(o.kind)) return lk(l('Tipo de negócio desconhecido.', 'Unknown business type.'), l('Escolha festival, casa, rádio ou estúdio.', 'Pick festival, venue, radio or studio.'));
  if (o.kind === 'radio' && radioWeight18(s) <= 0) return lk(l('Ainda não existe rádio nesta época.', 'There is no radio in this era yet.'), l('Espere a chegada do rádio.', 'Wait for radio to arrive.'));
  if (o.me < 1000 || o.me > 9000) return lk(l('Cada sócio fica com pelo menos 10%.', 'Each partner keeps at least 10%.'), l('Escolha entre 10% e 90%.', 'Pick between 10% and 90%.'));
  if (!o.name.trim()) return lk(l('O negócio precisa de nome.', 'The business needs a name.'), l('Dê um nome.', 'Give it a name.'));
  const a = jvAccept31(s, o);
  if (!a.ok) return lk(a.why[a.why.length - 1], l('Mude o acordo (sua parte, quem decide o quê, saída) ou escolha outro parceiro.', 'Change the agreement (your share, who decides what, exit) or pick another partner.'));
  return cashLk(s, o.h ?? 'label', Math.round(foundCost31(s, o.kind) * o.me / TOTAL31));
}

/** Funda um negócio novo com um parceiro: cada um paga a sua parte do custo de abertura. */
export function createJoint31(s: GameState, o: JvOpts31): L | string {
  const lock = jvLock31(s, o);
  if (lock) return lock.why;
  const st = socio31(s);
  const city = o.city && cityById[o.city] ? o.city : s.config.homeCity;
  const p = jvPartner(s, o, city)!;
  p.sh = TOTAL31 - o.me;
  const id = `jv:${++st.seq}`;
  const b: Biz31 = {
    id, kind: o.kind, name: o.name.trim().slice(0, 40), city, jv: 1, h: o.h ?? 'label', me: o.me, p: [p], rules: { ...RULES0(), ...(o.rules ?? {}) }, exit: o.exit ?? 'free',
    set: { price: 1, prog: 1, month: o.kind === 'fest' ? (s.month + 6) % 12 : 0, pr: 30 }, debt: 0, since: s.week, paid: 0, got: 0, ten: 5, lastVote: {}, months: [], log: [],
  };
  st.b[id] = b;
  const cost = Math.round(foundCost31(s, o.kind) * o.me / TOTAL31);
  b.paid += cost;
  payMine(s, b, -cost, 'found', `Abertura de ${b.name} (sua parte)`);
  opine(s, p.k, 3, l('Criamos um negócio juntos.', 'We started a business together.'));
  const txt = fmtL(l('{n} nasce: você e {p} ({a} / {b}).', '{n} is born: you and {p} ({a} / {b}).'), { n: b.name, p: p.n, a: pct31(o.me), b: pct31(p.sh) });
  log(b, s, txt);
  fact(s, b, txt, ['found'], 40, 'good');
  return id;
}

/** Renegocia o acordo (quem decide o quê, saída). O sócio aceita pela mesma conta da criação; recusar aumenta a tensão. */
export function renegotiate31(s: GameState, id: string, rules: Partial<Record<Topic31, Who31>>, exit?: Exit31): { ok: boolean; text: L; why: L[] } {
  const b = socio31(s).b[id];
  if (!soc31On(s)) return { ok: false, text: OFF().why, why: [] };
  const o = b && mainPartner(b);
  if (!b || !o) return { ok: false, text: l('Sem sócio para renegociar.', 'No partner to renegotiate with.'), why: [] };
  const next = { ...b.rules, ...rules };
  const a = jvAccept31(s, { kind: b.kind, name: b.name, city: b.city, pk: o.pk === 'indep' ? 'brand' : o.pk, lb: o.lb, me: Math.min(9000, Math.max(1000, b.me)), rules: next, exit: exit ?? b.exit });
  // quem já é sócio pesa a relação atual e a tensão
  const sc = a.score - b.ten / 4 + 5;
  if (sc < 0) {
    b.ten = clamp(b.ten + 8, 0, 100);
    opine(s, o.k, -2, l('Quis mudar o nosso acordo.', 'Wanted to change our agreement.'));
    const t = fmtL(l('{n} recusou o novo acordo.', '{n} turned down the new agreement.'), { n: o.n });
    log(b, s, t);
    return { ok: false, text: t, why: a.why };
  }
  b.rules = next;
  if (exit) b.exit = exit;
  const t = fmtL(l('Acordo renegociado com {n}.', 'Agreement renegotiated with {n}.'), { n: o.n });
  log(b, s, t);
  return { ok: true, text: t, why: a.why };
}

// ---------------------------------------------------------------- decisões e voto

export interface Vote31 { name: string; sh: number; yes: boolean; me?: boolean }
export interface VoteRes31 { ok: boolean; passed: boolean; votes: Vote31[]; text: L }

const topicVal = (b: Biz31, t: Topic31): number => (t === 'price' ? b.set.price : t === 'prog' ? b.set.prog : t === 'date' ? b.set.month : 0);
/** Postura do sócio sobre um assunto: sorte pura por chave (o mesmo sócio pensa o mesmo no mesmo ano) + opinião + tensão. */
export function stance31(s: GameState, b: Biz31, p: Partner31, topic: Topic31, v: number): number {
  const r = Rng.fromSeed(`${s.config.seed}|socio31|stance|${b.id}|${p.k}|${topic}|${v}|${s.year}`);
  let x = r.next() * 2 - 1;
  if (topic === 'invest' && v === 1) x += (b.months.slice(-6).reduce((t, m) => t + m.res, 0) > 0 ? 0.25 : -0.4);
  if (topic === 'price' && p.pk === 'brand') x += v === 0 ? 0.5 : -0.3;
  if (topic === 'prog' && p.pk === 'venue') x += v === 1 ? 0.3 : -0.2;
  if (topic === 'date' && p.pk === 'city') x += [5, 6, 7].includes(v) ? 0.4 : -0.2;
  return x + opinionOf(s, p.k) / 100 - b.ten / 200;
}

export function voteLock31(s: GameState, id: string, topic: Topic31, v: number): Lock31Lite | null {
  if (!soc31On(s)) return OFF();
  const b = socio31(s).b[id];
  if (!b) return lk(l('Você não tem parte neste negócio.', 'You hold no stake in this business.'), l('Compre uma parte primeiro.', 'Buy a stake first.'));
  if (!SKIND31[b.kind].topics.includes(topic)) return lk(l('Esse assunto não existe para este negócio.', 'That topic does not apply to this business.'), l('Escolha outro assunto.', 'Pick another topic.'));
  if (topicVal(b, topic) === v && topic !== 'invest') return lk(l('Já é assim.', 'It is already like that.'), l('Escolha uma opção diferente da atual.', 'Pick an option different from the current one.'));
  if (topic === 'invest' && v !== 1) return lk(l('Nada a votar.', 'Nothing to vote on.'), l('Proponha investir.', 'Propose investing.'));
  if (b.lastVote[topic] === mIdx(s)) return lk(l('Esse assunto já foi votado neste mês.', 'That topic was already voted on this month.'), l('Espere o próximo mês.', 'Wait for next month.'));
  if (b.rules[topic] === 'p' && b.p.length) return lk(fmtL(l('Pelo acordo, "{t}" é decisão do sócio.', 'Under the agreement, "{t}" is the partner\'s call.'), { t: TOPIC31[topic].name }), l('Renegocie o acordo para votar ou decidir este assunto.', 'Renegotiate the agreement to vote on or decide this topic.'));
  if (b.ask?.k === 'vote') return lk(l('Há uma votação do sócio esperando a sua resposta.', 'A partner\'s vote is waiting for your answer.'), l('Responda a votação pendente.', 'Answer the pending vote.'));
  return null;
}

function apply(s: GameState, b: Biz31, topic: Topic31, v: number): void {
  if (topic === 'price') b.set.price = clamp(v, 0, 2);
  else if (topic === 'prog') b.set.prog = clamp(v, 0, 2);
  else if (topic === 'date') b.set.month = clamp(v, 0, 11);
  else if (topic === 'invest') {
    const f = flow31(s, modelOfB(s, b), b.kind === 'fest' ? b.set.month : s.month);
    const c = Math.max(money(s, 3000), f.rev || Math.round(annual31(s, modelOfB(s, b)) / 12));
    b.set.pr = clamp(b.set.pr + 4, 5, 100);
    (b as Biz31 & { inv?: number }).inv = ((b as Biz31 & { inv?: number }).inv ?? 0) + c; // custo entra no resultado do mês (dividido)
  }
}

/** Conta os votos (você vota sim se `me` é true; ausente quando undefined). */
function tally(s: GameState, b: Biz31, topic: Topic31, v: number, me: boolean | undefined): VoteRes31 {
  const votes: Vote31[] = [];
  if (me !== undefined) votes.push({ name: 'me', sh: b.me, yes: me, me: true });
  for (const p of b.p) votes.push({ name: p.n, sh: p.sh, yes: stance31(s, b, p, topic, v) > 0 });
  const yes = votes.filter((x) => x.yes).reduce((t, x) => t + x.sh, 0);
  const present = votes.reduce((t, x) => t + x.sh, 0);
  const passed = yes * 2 > present;
  return { ok: true, passed, votes, text: l('', '') };
}

/** Você propõe uma decisão. Conforme o acordo: você decide sozinho, ou vai a voto pela participação. */
export function propose31(s: GameState, id: string, topic: Topic31, v: number): VoteRes31 {
  const lock = voteLock31(s, id, topic, v);
  if (lock) return { ok: false, passed: false, votes: [], text: lock.why };
  const b = socio31(s).b[id];
  b.lastVote[topic] = mIdx(s);
  socio31(s).n.votes++;
  const optL = topic === 'date' ? monthL(v) : TOPIC31[topic].opts[v];
  if (b.rules[topic] === 'me' || !b.p.length) {
    apply(s, b, topic, v);
    for (const p of b.p) if (stance31(s, b, p, topic, v) <= 0) { opine(s, p.k, -1, l('Decidiu sozinho, contra o que eu queria.', 'Decided alone, against my wishes.')); b.ten = clamp(b.ten + 3, 0, 100); }
    const text = fmtL(l('{t}: {o} (decisão sua, pelo acordo).', '{t}: {o} (your call, under the agreement).'), { t: TOPIC31[topic].name, o: optL });
    log(b, s, text);
    return { ok: true, passed: true, votes: [{ name: 'me', sh: b.me, yes: true, me: true }], text };
  }
  const r = tally(s, b, topic, v, true);
  if (r.passed) apply(s, b, topic, v);
  for (const x of r.votes) {
    if (x.me) continue;
    const p = b.p.find((y) => y.n === x.name)!;
    if (x.yes) opine(s, p.k, 1, l('Concordamos numa decisão da sociedade.', 'We agreed on a partnership decision.'));
    else { opine(s, p.k, r.passed ? -3 : -1, r.passed ? l('Fui vencido numa votação da sociedade.', 'I was outvoted in the partnership.') : l('Discordamos numa votação da sociedade.', 'We disagreed in a partnership vote.')); b.ten = clamp(b.ten + (r.passed ? 6 : 3), 0, 100); }
  }
  r.text = fmtL(r.passed ? l('{t}: {o} — aprovado ({y} a favor).', '{t}: {o} — approved ({y} in favour).') : l('{t}: {o} — recusado ({y} a favor).', '{t}: {o} — rejected ({y} in favour).'),
    { t: TOPIC31[topic].name, o: optL, y: pct31(r.votes.filter((x) => x.yes).reduce((t, x) => t + x.sh, 0)) });
  log(b, s, r.text);
  return r;
}

export const monthL = (m: number): L => {
  const pt = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return l(pt[m % 12], en[m % 12]);
};

/** Resposta a um pedido do sócio: votação (sim/não) ou saída (comprar a parte dele / recusar). */
export function answer31(s: GameState, id: string, yes: boolean): L | null {
  const st = socio31(s);
  const b = st.b[id];
  const a = b?.ask;
  if (!b || !a) return l('Nada para responder.', 'Nothing to answer.');
  const p = b.p.find((x) => x.k === a.from);
  delete b.ask;
  if (!p) return null;
  if (a.k === 'vote') {
    const r = tally(s, b, a.topic!, a.v!, yes);
    if (r.passed) apply(s, b, a.topic!, a.v!);
    b.lastVote[a.topic!] = mIdx(s);
    if (!yes) { opine(s, p.k, r.passed ? -1 : -3, l('Votou contra a minha proposta.', 'Voted against my proposal.')); b.ten = clamp(b.ten + (r.passed ? 2 : 5), 0, 100); }
    else opine(s, p.k, 1, l('Apoiou a minha proposta.', 'Backed my proposal.'));
    const t = fmtL(r.passed ? l('Proposta de {n} aprovada: {t}.', '{n}\'s proposal approved: {t}.') : l('Proposta de {n} recusada: {t}.', '{n}\'s proposal rejected: {t}.'), { n: p.n, t: TOPIC31[a.topic!].name });
    log(b, s, t);
    return null;
  }
  // saída
  if (yes) {
    const price = a.price ?? quote31(s, id, p.sh, b.me);
    const c = cashLk(s, b.h, price);
    if (c) { b.ask = a; return c.why; }
    b.me += p.sh;
    b.paid += price;
    b.p = b.p.filter((x) => x !== p);
    payMine(s, b, -price, 'buy', `Compra da parte de ${p.n} em ${b.name}`);
    opine(s, p.k, 4, l('Comprou a minha parte quando precisei sair.', 'Bought me out when I needed to leave.'));
    b.ten = Math.max(0, b.ten - 20);
    st.n.exits++;
    const t = fmtL(l('Você comprou a parte de {n} em {b}.', 'You bought out {n} in {b}.'), { n: p.n, b: b.name });
    log(b, s, t);
    fact(s, b, t, ['exit'], 35, 'good');
    return null;
  }
  // recusa: ele vende a um terceiro
  const h = h31(s, `third|${id}|${s.week}`);
  const nw: Partner31 = { k: `e:soc:${id}:${++st.seq}`, n: `${NAMES_A[(h >>> 2) % NAMES_A.length]} ${NAMES_B[(h >>> 7) % NAMES_B.length]}`, sh: p.sh, pk: 'indep' };
  b.p = b.p.filter((x) => x !== p).concat(nw);
  opine(s, p.k, -4, l('Não quis comprar a minha parte; vendi a um estranho.', 'Would not buy my stake; I sold to a stranger.'));
  b.ten = 15;
  st.n.exits++;
  const t = fmtL(l('{n} saiu de {b} e vendeu a parte a {x}.', '{n} left {b} and sold the stake to {x}.'), { n: p.n, b: b.name, x: nw.n });
  log(b, s, t);
  fact(s, b, t, ['exit'], 30, 'info');
  return null;
}

// ---------------------------------------------------------------- fechamento do mês: resultado, divisão, sócio age

/** Divide `res` (centavos) pelas partes: cada um recebe o piso; o resto vai para a maior parte (você primeiro no empate). */
export function split31(res: number, parts: { k: string; sh: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!parts.length) return out;
  let left = res;
  let big = parts[0];
  for (const p of parts) {
    const v = Math.trunc((res * p.sh) / TOTAL31);
    out[p.k] = v;
    left -= v;
    if (p.sh > big.sh) big = p;
  }
  out[big.k] += left;
  return out;
}

/** Um mês de um negócio seu: resultado com a sorte do mês, divisão exata, dinheiro, e o que o sócio faz. */
function monthBiz(s: GameState, b: Biz31, r: Rng, m: number, y: number): void {
  const M = modelOfB(s, b);
  const f = flow31(s, M, m);
  const noise = r.normal(0, SKIND31[b.kind].noise * (b.set.prog === 2 ? 1.6 : b.set.prog === 0 ? 0.6 : 1));
  const fight = (b as Biz31 & { fight?: number }).fight ? 0.94 : 1;
  delete (b as Biz31 & { fight?: number }).fight;
  const rev = Math.round(f.rev * (1 + noise) * fight);
  const inv = (b as Biz31 & { inv?: number }).inv ?? 0;
  delete (b as Biz31 & { inv?: number }).inv;
  const cost = f.cost + inv;
  const res = rev - cost;
  const parts = split31(res, [{ k: 'me', sh: b.me }, ...b.p.map((p) => ({ k: p.k, sh: p.sh }))]);
  const mine = parts.me ?? 0;
  b.months.push({ y, m, rev, cost, res, mine });
  if (b.months.length > 24) b.months.shift();
  b.got += mine;
  if (mine) payMine(s, b, mine, mine > 0 ? 'div' : 'loss', mine > 0 ? `Dividendos de ${b.name}` : `Prejuízo de ${b.name} (sua parte)`);
  // prestígio anda com a programação e o preço
  b.set.pr = clamp(b.set.pr + (b.set.prog === 2 ? 0.4 : b.set.prog === 0 ? -0.15 : 0) + (b.set.price === 2 ? -0.2 : b.set.price === 0 ? 0.1 : 0), 5, 100);
  // tensão: prejuízo aumenta, lucro acalma, o tempo esfria
  b.ten = clamp(b.ten + (res < 0 && b.kind !== 'fest' ? 3 : res > 0 ? -2 : 0) - 1, 0, 100);
  if (!b.p.length || b.me >= TOTAL31) return;
  // o sócio age (um pedido por vez)
  const p = mainPartner(b)!;
  if (b.ask && b.ask.due < s.week) expire(s, b);
  if (b.ask) return;
  const op = opinionOf(s, p.k);
  const x = r.next();
  if (b.ten >= 75 && x < 0.5) {
    (b as Biz31 & { fight?: number }).fight = 1;
    b.ten = clamp(b.ten - 25, 0, 100);
    opine(s, p.k, -5, l('Brigamos feio pela sociedade.', 'We had a bad fight over the partnership.'));
    socio31(s).n.fights++;
    const t = fmtL(l('Briga entre os sócios de {b}: {n} e você se desentendem em público; o próximo mês rende menos.', 'Partners\' fight at {b}: {n} and you clash in public; next month earns less.'), { b: b.name, n: p.n });
    log(b, s, t);
    fact(s, b, t, ['fight'], 50, 'bad');
    return;
  }
  const losing = b.months.slice(-3).length === 3 && b.months.slice(-3).every((q) => q.res < 0) && b.kind !== 'fest';
  if ((b.ten >= 55 || op <= -30 || losing) && x < 0.35) {
    const price = Math.round(quote31(s, b.id, p.sh, b.me) * 0.95);
    b.ask = { k: 'exit', due: s.week + 4, from: p.k, price, sh: p.sh };
    const t = fmtL(l('{n} quer sair de {b} e oferece a parte ({p}) a você por {v}.', '{n} wants out of {b} and offers you the stake ({p}) for {v}.'), { n: p.n, b: b.name, p: pct31(p.sh), v: mL(price) });
    log(b, s, t);
    emitFact(s, { kind: 'deal', actors: ['player'], place: b.city, severity: 30, visibility: 'rumor', tags: ['soc31', 'ask'], text: t, src: 'socio31', notify: { kind: 'event', pendId: `soc31:${b.id}`, dest: { area: 'business', tab: 'soc31' } } });
    return;
  }
  if (x < 0.22) {
    const topics = SKIND31[b.kind].topics.filter((tp) => b.rules[tp] !== 'me' && tp !== 'invest');
    if (!topics.length) return;
    const tp = topics[Math.floor(r.next() * topics.length)];
    let v = tp === 'date' ? (b.set.month + 1 + Math.floor(r.next() * 10)) % 12 : (topicVal(b, tp) + 1 + Math.floor(r.next() * 2)) % 3;
    if (stance31(s, b, p, tp, v) <= 0) v = topicVal(b, tp) === 1 || tp === 'date' ? v : 1;
    if (v === topicVal(b, tp)) return;
    if (b.rules[tp] === 'p') {
      apply(s, b, tp, v);
      log(b, s, fmtL(l('{n} decidiu (pelo acordo) — {t}: {o}.', '{n} decided (under the agreement) — {t}: {o}.'), { n: p.n, t: TOPIC31[tp].name, o: tp === 'date' ? monthL(v) : TOPIC31[tp].opts[v] }));
      return;
    }
    b.ask = { k: 'vote', due: s.week + 3, from: p.k, topic: tp, v };
    const t = fmtL(l('{n} propõe em {b} — {t}: {o}. Seu voto?', '{n} proposes at {b} — {t}: {o}. Your vote?'), { n: p.n, b: b.name, t: TOPIC31[tp].name, o: tp === 'date' ? monthL(v) : TOPIC31[tp].opts[v] });
    log(b, s, t);
    emitFact(s, { kind: 'deal', actors: ['player'], place: b.city, severity: 20, visibility: 'secret', tags: ['soc31', 'ask'], text: t, src: 'socio31', notify: { kind: 'info', pendId: `soc31:${b.id}`, dest: { area: 'business', tab: 'soc31' } } });
  }
}

/** Prazo do pedido acabou sem resposta: votação conta sem você; saída vira venda a terceiro. */
function expire(s: GameState, b: Biz31): void {
  const a = b.ask!;
  if (a.k === 'vote') {
    const r = tally(s, b, a.topic!, a.v!, undefined);
    delete b.ask;
    if (r.passed) apply(s, b, a.topic!, a.v!);
    log(b, s, fmtL(l('Votação sem o seu voto — {t}: {r}.', 'Vote without you — {t}: {r}.'), { t: TOPIC31[a.topic!].name, r: r.passed ? l('aprovada', 'approved') : l('recusada', 'rejected') }));
    return;
  }
  answer31(s, b.id, false);
}

/** Fecha o mês que acabou para todas as suas sociedades (chamado pelo motor na virada). */
export function socMonth31(s: GameState): void {
  if (!soc31On(s)) return;
  const st = socio31(s);
  const ids = Object.keys(st.b).sort();
  if (!ids.length) return; // sem participação: não consome sorte (mundo igual ao de antes)
  const r = rng19(s, 'socio31');
  const m = (s.month + 11) % 12;
  const y = s.month === 0 ? s.year - 1 : s.year;
  for (const id of ids) { const b = st.b[id]; if (b) monthBiz(s, b, r, m, y); }
}
registerSimHook('month', 'socio31', (s) => socMonth31(s));

// ---------------------------------------------------------------- leitura para telas, valor da empresa, resultados

export interface Holding31 { b: Biz31; value: number; mine: number; last12: number }
export function holdings31(s: GameState): Holding31[] {
  return Object.values(socio31(s).b).sort((a, b) => (a.id < b.id ? -1 : 1)).map((b) => {
    const v = bizValue31(s, b.id)?.total ?? 0;
    return { b, value: v, mine: Math.round(v * b.me / TOTAL31), last12: b.months.slice(-12).reduce((t, m) => t + m.mine, 0) };
  });
}
/** Participações do selo (entram no valor da empresa); as pessoais entram no seu patrimônio. */
export const stakesValue31 = (s: GameState, h: Holder = 'label'): number => holdings31(s).filter((x) => x.b.h === h).reduce((t, x) => t + x.mine, 0);
registerStakes31((s) => (soc31On(s) ? stakesValue31(s, 'label') : 0));
projName31().push((s, id) => (id.startsWith('soc:') ? (socio31(s).b[id.slice(4)]?.name ?? socio31(s).done.find((d) => d.id === id.slice(4))?.name) : undefined));

/** Negócios (alvos) que um selo rival tem. */
export const ownedBy31 = (s: GameState, lbId: string): Target31[] => targets31(s).filter((t) => t.owner.lb === lbId);

registerPendingSource('soc31', (s: GameState) =>
  Object.values(socio31(s).b).filter((b) => b.ask).map((b) => ({
    id: `soc31:${b.id}`, kind: `soc31:${b.ask!.k}`,
    title: fmtL(b.ask!.k === 'exit' ? l('Sócio quer sair de {b}', 'Partner wants out of {b}') : l('Votação na sociedade de {b}', 'Partnership vote at {b}'), { b: b.name }),
    owner: { area: 'business', tab: 'business-business/soc31', intent: 'answer' }, due: b.ask!.due, shortcuts: [{ area: 'finance' }], prio: b.ask!.k === 'exit' ? 2 : 1,
  })));

// casa real comprada pela sociedade não pode ser comprada de novo por venues17 (e vice-versa: targets31 já tira as suas)
venueBlock17.f = (s, id) => {
  const b = socio31(s).b[`ve:${id}`];
  return b ? fmtL(l('Você já é sócio de {n}: compre o resto pela sociedade.', 'You are already a partner in {n}: buy the rest through the partnership.'), { n: b.name }) : null;
};

// ---------------------------------------------------------------- editor (regra 10)

const targetOpts = (s: GameState) => targets31(s).slice(0, 200).map((t) => ({ value: t.id, label: l(`${t.name} (${SKIND31[t.kind].name.pt})`, `${t.name} (${SKIND31[t.kind].name.en})`) }));
const heldOpts = (s: GameState) => Object.values(socio31(s).b).map((b) => ({ value: b.id, label: l(b.name, b.name) }));
registerRunnable({
  id: 'soc31.grant', area: 'companies', raw: true, label: l('Dar 25% de um negócio existente (sem pagar)', 'Grant 25% of an existing business (free)'),
  arg: { kind: 'select', label: l('Negócio', 'Business'), options: targetOpts },
  run: (s, _t, arg) => {
    const t = target31(s, String(arg ?? ''));
    if (!t) return l('Escolha um negócio.', 'Pick a business.');
    const st = socio31(s);
    st.b[t.id] = { id: t.id, kind: t.kind, name: t.name, city: t.city, h: 'label', me: 2500, p: [{ ...t.owner, sh: 7500 }], rules: RULES0(), exit: 'free', set: { price: 1, prog: 1, month: t.month, pr: t.prestige }, debt: debt0(s, t), since: s.week, paid: 0, got: 0, ten: 10, lastVote: {}, months: [], log: [] };
    return fmtL(l('Você agora tem 25% de {n}.', 'You now hold 25% of {n}.'), { n: t.name });
  },
});
registerRunnable({
  id: 'soc31.month', area: 'companies', label: l('Fechar o mês das sociedades agora', 'Close the partnerships\' month now'),
  run: (s) => { socMonth31(s); return l('Mês das sociedades fechado (resultado, divisão e o que os sócios fazem).', 'Partnerships\' month closed (result, split and partner moves).'); },
});
registerEditable({
  id: 'soc31.tension', area: 'companies', kind: 'select', raw: true, label: l('Tensão com os sócios (todas as sociedades)', 'Tension with partners (all partnerships)'),
  options: () => [0, 25, 50, 80].map((v) => ({ value: String(v), label: l(String(v), String(v)) })),
  get: (s) => String(Math.round(Object.values(socio31(s).b)[0]?.ten ?? 0)),
  set: (s, v) => { for (const b of Object.values(socio31(s).b)) b.ten = clamp(Number(v) || 0, 0, 100); },
  when: (s) => Object.keys(socio31(s).b).length > 0,
});
registerEditable({
  id: 'soc31.on', area: 'companies', kind: 'bool', label: l('Sócios e compras ligado', 'Partners and buyouts on'),
  get: (s) => soc31On(s),
  set: (s, v) => { setSw(s, SW_SOC31, !!v); },
});
registerRunnable({
  id: 'soc31.drop', area: 'companies', raw: true, label: l('Tirar uma participação sua (sem receber)', 'Remove one of your stakes (no payment)'),
  arg: { kind: 'select', label: l('Negócio', 'Business'), options: heldOpts },
  run: (s, _t, arg) => {
    const st = socio31(s);
    const b = st.b[String(arg ?? '')];
    if (!b) return l('Escolha uma participação sua.', 'Pick one of your stakes.');
    delete st.b[b.id];
    return fmtL(l('Participação em {n} removida.', 'Stake in {n} removed.'), { n: b.name });
  },
});
