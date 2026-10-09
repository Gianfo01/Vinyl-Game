// Rodada 12 — mercado de serviços: empresas tocadas por NPCs (estúdios, produtores, agências de shows,
// festivais, gravadoras, mídia) oferecem serviços com capacidade limitada por mês, contrapropostas e
// cumprimento (ou quebra) do contrato. Assim um empresário leva o artista a uma gravadora, contrata um
// produtor, negocia uma turnê e oferece o artista a um festival sem ser dono de nada disso.
// Outros sistemas registram fornecedores (registerProviders) e efeitos (registerServiceEffect).
// Gerador próprio (semente + ano + mês) no tick mensal.

import { Rng, clamp } from '../../core/rng';
import { CITIES, cityById, l, type L } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import { personName } from '../people';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, post } from '../util';
import { ownerOf } from './people/owner';
import { standingOf } from './standing9';
import { ventures, type Holder } from './ventures9';

export type SvcKind = 'studio' | 'producer' | 'booking' | 'festival' | 'label' | 'media';
export const SVC: Record<SvcKind, { name: L; verb: L; pays: boolean; base: number; from: number }> = {
  studio: { name: l('Estúdio', 'Studio'), verb: l('Reservar sessões', 'Book sessions'), pays: false, base: 3000, from: 1900 },
  producer: { name: l('Produtor', 'Producer'), verb: l('Contratar produtor', 'Hire a producer'), pays: false, base: 5000, from: 1920 },
  booking: { name: l('Agência de shows', 'Booking agency'), verb: l('Negociar turnê', 'Negotiate a tour'), pays: true, base: 6000, from: 1930 },
  festival: { name: l('Festival', 'Festival'), verb: l('Oferecer ao festival', 'Pitch to the festival'), pays: true, base: 4000, from: 1950 },
  label: { name: l('Gravadora', 'Record label'), verb: l('Showcase para o A&R', 'A&R showcase'), pays: false, base: 800, from: 1900 },
  media: { name: l('Mídia', 'Media'), verb: l('Campanha na mídia', 'Media campaign'), pays: false, base: 2500, from: 1900 },
};
/** Fornecedor: q = qualidade 0–100; cap = contratos por mês; owner = id do selo dono (NPC). */
export interface Provider { id: string; kind: SvcKind; name: string; city: string; q: number; cap: number; owner?: string }
export interface SvcContract { id: string; prov: string; pname: string; kind: SvcKind; actId: string; price: number; w: number; due: number; status: 'open' | 'done' | 'broken'; by: string; note?: L }
export interface SvcState { used: Record<string, number>; rel: Record<string, number>; contracts: SvcContract[]; done: number; broken: number }
export interface Ask { status: 'accepted' | 'counter' | 'full' | 'refused'; price: number; text: L }

declare module '../ext4' { interface Ext4 { services12: SvcState } }
const fresh = (): SvcState => ({ used: {}, rel: {}, contracts: [], done: 0, broken: 0 });
registerExt4('services12', fresh);
export const services = (s: GameState): SvcState => {
  const x = s.x4 as unknown as { services12?: SvcState };
  x.services12 ??= fresh();
  return x.services12;
};

// ---------------------------------------------------------------- fornecedores

const SOURCES: { id: string; fn: (s: GameState) => Provider[] }[] = [];
export function registerProviders(id: string, fn: (s: GameState) => Provider[]): void {
  const i = SOURCES.findIndex((x) => x.id === id);
  if (i >= 0) SOURCES[i] = { id, fn }; else SOURCES.push({ id, fn });
}
type Effect = (s: GameState, r: Rng, c: SvcContract, a: Act, p?: Provider) => L;
const EFFECTS: Partial<Record<SvcKind, Effect>> = {};
export function registerServiceEffect(kind: SvcKind, fn: Effect): void { EFFECTS[kind] = fn; }
/** Bônus de contatos do contratante (ex.: empresário) — registrável por quem usa o mercado. */
const BONUS: { id: string; fn: (s: GameState, kind: SvcKind, by: string) => number }[] = [];
export function registerContactBonus(id: string, fn: (s: GameState, kind: SvcKind, by: string) => number): void {
  const i = BONUS.findIndex((x) => x.id === id);
  if (i >= 0) BONUS[i] = { id, fn }; else BONUS.push({ id, fn });
}
const bonusOf = (s: GameState, kind: SvcKind, by: string) => BONUS.reduce((t, b) => t + b.fn(s, kind, by), 0);

const NPC_KIND: Record<string, SvcKind> = { studio: 'studio', booking: 'booking', festival: 'festival', media: 'media' };
const GEN_NAME: Record<SvcKind, string[]> = {
  studio: ['Estúdio {n}', '{n} Sound', 'Sala {n}'], producer: ['{n}'], booking: ['{n} Booking', 'Agência {n}'],
  festival: ['Festival de {c}', '{c} Fest', 'Noites de {c}'], label: [], media: ['Rádio {c}', 'Revista {n}', 'Coluna de {n}'],
};

/** Independentes gerados por década (estáveis pela semente): o mercado nunca fica vazio. */
function generated(s: GameState): Provider[] {
  const dec = Math.floor(s.year / 10) * 10;
  const r = Rng.fromSeed(`${s.config.seed}:services12:gen:${dec}`);
  const out: Provider[] = [];
  for (const kind of ['studio', 'producer', 'booking', 'festival', 'media'] as SvcKind[]) {
    if (s.year < SVC[kind].from) continue;
    for (let i = 0; i < 3; i++) {
      const city = i === 0 && cityById[s.config.homeCity] ? s.config.homeCity : r.pick(CITIES).id;
      const n = personName(r, cityById[city]?.lang ?? 'en').split(' ').pop()!;
      const name = r.pick(GEN_NAME[kind]).replace('{n}', kind === 'producer' ? personName(r, cityById[city]?.lang ?? 'en') : n).replace('{c}', cityById[city]?.name.pt ?? city);
      out.push({ id: `g${dec}:${kind}:${i}`, kind, name, city, q: r.int(30, 85), cap: r.int(1, 3) });
    }
  }
  return out;
}

registerProviders('base', (s) => {
  const out = generated(s);
  for (const n of ventures(s).npc) {
    const k = NPC_KIND[n.kind];
    if (k && s.labels[n.labelId]?.active) out.push({ id: `npc:${n.labelId}:${n.kind}`, kind: k, name: n.name, city: n.city, q: Math.round(n.rep), cap: 2 + Math.floor(n.rep / 30), owner: n.labelId });
  }
  for (const lb of Object.values(s.labels)) if (lb.active) out.push({ id: `lab:${lb.id}`, kind: 'label', name: lb.name, city: lb.city, q: Math.round(clamp(lb.reputation, 0, 100)), cap: 1 + Math.floor(lb.roster.length / 12), owner: lb.id });
  return out;
});

export function providers(s: GameState, kind?: SvcKind): Provider[] {
  const all = SOURCES.flatMap((x) => x.fn(s));
  return kind ? all.filter((p) => p.kind === kind) : all;
}
export const providerById = (s: GameState, id: string) => providers(s).find((p) => p.id === id);
const ym = (s: GameState) => `${s.year}:${s.month}`;
export const usedOf = (s: GameState, p: Provider) => services(s).used[`${p.id}:${ym(s)}`] ?? 0;
export const remaining = (s: GameState, p: Provider) => Math.max(0, p.cap - usedOf(s, p));
export const relOf = (s: GameState, p: Provider) => services(s).rel[p.id] ?? 50;
const country = (city: string) => cityById[city]?.market ?? '';
export const isForeign = (s: GameState, a: Act, p: Provider) => country(p.city) !== country(a.city);

/** Valor justo: o que o fornecedor cobra (ou paga ao artista, nos serviços que pagam). */
export function quote(s: GameState, p: Provider, a: Act): number {
  const k = SVC[p.kind];
  const f = k.pays ? Math.pow(1 + a.fame / 12, 1.5) * (0.6 + p.q / 120) : (0.5 + p.q / 80);
  return Math.max(money(s, 100), Math.round(money(s, k.base) * f / 100) * 100);
}

/** Chance de aceitar o valor proposto (oferta ao pagar, pedido ao receber). */
export function askChance(s: GameState, p: Provider, a: Act, amount: number, by: string): number {
  const q = quote(s, p, a);
  const ratio = amount / q;
  const b = (relOf(s, p) - 50) / 250 + (ownerOf(s).attrs.negotiation - 50) / 300 + bonusOf(s, p.kind, by) + (p.owner ? (standingOf(s, p.owner).trust - 50) / 400 : 0);
  return clamp((SVC[p.kind].pays ? (1.25 - ratio) / 0.4 : (ratio - 0.7) / 0.4) + b, 0, 0.97);
}

/** Pede o serviço. Aceita, contrapropõe (perto do valor justo), recusa ou está lotado este mês. */
export function requestService(s: GameState, r: Rng, provId: string, actId: string, amount: number, by: string): Ask {
  const p = providerById(s, provId);
  const a = s.acts[actId];
  if (!p || !a) return { status: 'refused', price: 0, text: l('Inválido.', 'Invalid.') };
  if (!remaining(s, p)) return { status: 'full', price: 0, text: fmtL(l('{p} está com a agenda cheia este mês. Tente outro ou espere o mês virar.', '{p} is fully booked this month. Try another or wait for next month.'), { p: p.name }) };
  const q = quote(s, p, a);
  if (r.chance(askChance(s, p, a, amount, by))) return { status: 'accepted', price: amount, text: fmtL(l('{p} aceita.', '{p} accepts.'), { p: p.name }) };
  const pays = SVC[p.kind].pays;
  const gap = pays ? amount / q - 1 : 1 - amount / q;
  if (gap < 0.45) {
    const price = Math.round(q * (pays ? 0.95 : 1.05) / 100) * 100;
    return { status: 'counter', price, text: fmtL(l('{p} contrapropõe {v}.', '{p} counters with {v}.'), { p: p.name, v: `$${Math.round(price / 100).toLocaleString()}` }) };
  }
  services(s).rel[p.id] = clamp(relOf(s, p) - 2, 0, 100);
  return { status: 'refused', price: 0, text: fmtL(l('{p} achou a proposta ofensiva e recusou.', '{p} found the offer insulting and refused.'), { p: p.name }) };
}

/** Quem paga: o próprio artista (caixa dele) ou quem contratou (selo ou patrimônio pessoal). */
export type Payer = 'act' | Holder;
export function payFrom(s: GameState, payer: Payer, a: Act, amount: number, key: string, memo: string): boolean {
  amount = Math.round(amount);
  if (payer === 'act') { if (a.cash < amount) return false; a.cash -= amount; return true; }
  if (payer === 'label') { if (s.player.cash < amount) return false; post(s, `s12:${key}`, -amount, 'business', memo); return true; }
  const o = ownerOf(s);
  if (o.wealth < amount) return false;
  o.wealth -= amount;
  return true;
}

/** Fecha o contrato no preço combinado: ocupa capacidade do mês; entrega em 2–6 semanas. */
export function signService(s: GameState, r: Rng, provId: string, actId: string, price: number, by: string, payer: Payer): { ok: boolean; text: L; c?: SvcContract } {
  const p = providerById(s, provId);
  const a = s.acts[actId];
  if (!p || !a || !remaining(s, p)) return { ok: false, text: l('O fornecedor não tem mais vaga.', 'The provider has no slot left.') };
  if (!SVC[p.kind].pays && !payFrom(s, payer, a, price, `${p.id}:${actId}`, `${SVC[p.kind].name.pt}: ${p.name} (${a.name})`)) return { ok: false, text: l('Sem dinheiro para pagar o serviço.', 'Not enough money to pay for the service.') };
  const st = services(s);
  st.used[`${p.id}:${ym(s)}`] = usedOf(s, p) + 1;
  const c: SvcContract = { id: nextId(s, 'svc'), prov: p.id, pname: p.name, kind: p.kind, actId, price, w: s.week, due: s.week + r.int(2, 6), status: 'open', by };
  st.contracts.push(c);
  if (st.contracts.length > 80) st.contracts = st.contracts.filter((x) => x.status === 'open' || s.week - x.w < 104);
  return { ok: true, text: fmtL(l('Contrato com {p} assinado. Entrega prevista na semana {w}.', 'Contract with {p} signed. Due by week {w}.'), { p: p.name, w: c.due }), c };
}

// ---------------------------------------------------------------- efeitos padrão

const momentum = (a: Act, d: number) => (a.momentum = clamp(a.momentum + d, 0, 100));
registerServiceEffect('studio', (s, _r, c, a, p) => { momentum(a, 4 + (p?.q ?? 50) / 20); return fmtL(l('Sessões no {p} renderam material novo para {a}.', 'Sessions at {p} gave {a} fresh material.'), { p: c.pname, a: a.name }); });
registerServiceEffect('producer', (s, _r, c, a, p) => { momentum(a, 6 + (p?.q ?? 50) / 15); a.fame = clamp(a.fame + 1, 0, 100); return fmtL(l('{p} produziu {a}: o som ganhou outro nível.', '{p} produced {a}: the sound went up a level.'), { p: c.pname, a: a.name }); });
registerServiceEffect('booking', (s, _r, c, a) => { a.cash += c.price; a.fame = clamp(a.fame + 2, 0, 100); momentum(a, 6); a.fans.casual += Math.round(c.price / money(s, 15)); return fmtL(l('Turnê de {a} pela {p}: cachê garantido pago.', '{a}\'s tour via {p}: guarantee paid.'), { a: a.name, p: c.pname }); });
registerServiceEffect('festival', (s, _r, c, a, p) => { a.cash += c.price; a.fame = clamp(a.fame + 2 + Math.round((p?.q ?? 50) / 40), 0, 100); momentum(a, 8); a.fans.casual += Math.round(c.price / money(s, 8)); return fmtL(l('{a} tocou no {p}.', '{a} played {p}.'), { a: a.name, p: c.pname }); });
registerServiceEffect('media', (s, _r, c, a, p) => { momentum(a, 8 + (p?.q ?? 50) / 12); return fmtL(l('{p} pôs {a} em evidência.', '{p} put {a} in the spotlight.'), { p: c.pname, a: a.name }); });
registerServiceEffect('label', (s, r, c, a, p) => {
  if (a.owner || !p?.owner || !s.labels[p.owner]?.active) return fmtL(l('O A&R de {p} assistiu, mas não houve proposta.', '{p}\'s A&R watched, but made no offer.'), { p: c.pname });
  if (!r.chance(0.35 + a.fame / 120 + (p.q - 50) / 300)) return fmtL(l('O A&R de {p} não se convenceu com {a}.', '{p}\'s A&R was not convinced by {a}.'), { p: c.pname, a: a.name });
  // a proposta entra na mesa do empresário (rodada 11) quando o artista é seu cliente
  const pitches = (s.x4 as unknown as { manager11?: { pitches: { actId: string; w: number; offers: { party: string; advance: number; royalty: number; term: number }[] }[] } }).manager11?.pitches;
  const offer = { party: p.owner, advance: Math.round(money(s, expectedAdvance(s, a)) * (0.8 + r.next() * 0.5) / 100) * 100, royalty: Math.round((0.12 + r.next() * 0.08) * 100) / 100, term: 36 };
  const cur = pitches?.find((x) => x.actId === a.id);
  if (cur) cur.offers.push(offer); else pitches?.push({ actId: a.id, w: s.week, offers: [offer] });
  return fmtL(l('{p} quer contratar {a}: proposta na mesa (Gestão de artistas).', '{p} wants to sign {a}: offer on the table (Artist management).'), { p: c.pname, a: a.name });
});

/** Ouvintes do desfecho (o empresário usa para comissão, confiança e prestação de contas). */
const OUTCOME: { id: string; fn: (s: GameState, c: SvcContract, ok: boolean, text: L) => void }[] = [];
export function onServiceOutcome(id: string, fn: (s: GameState, c: SvcContract, ok: boolean, text: L) => void): void {
  const i = OUTCOME.findIndex((x) => x.id === id);
  if (i >= 0) OUTCOME[i] = { id, fn }; else OUTCOME.push({ id, fn });
}

function servicesMonth(s: GameState, r: Rng): void {
  const st = services(s);
  for (const k of Object.keys(st.used)) if (!k.endsWith(`:${ym(s)}`)) delete st.used[k];
  for (const c of st.contracts) {
    if (c.status !== 'open' || c.due > s.week) continue;
    const a = s.acts[c.actId];
    const p = providerById(s, c.prov);
    const rel = st.rel[c.prov] ?? 50;
    if (!a || r.chance(clamp(0.2 - (p?.q ?? 40) / 600 - (rel - 50) / 500, 0.03, 0.25))) {
      c.status = 'broken';
      st.broken += 1;
      st.rel[c.prov] = clamp(rel - 6, 0, 100);
      if (a && !SVC[c.kind].pays) a.cash += Math.round(c.price / 2);
      c.note = fmtL(l('{p} não cumpriu o contrato (metade do valor devolvida).', '{p} broke the contract (half the fee refunded).'), { p: c.pname });
      if (a) notify(s, fmtL(l('{p} furou com {a}.', '{p} let {a} down.'), { p: c.pname, a: a.name }), 'bad');
    } else {
      c.status = 'done';
      st.done += 1;
      st.rel[c.prov] = clamp(rel + 3, 0, 100);
      c.note = (EFFECTS[c.kind] ?? (() => l('Serviço entregue.', 'Service delivered.')))(s, r, c, a, p);
    }
    for (const o of OUTCOME) o.fn(s, c, c.status === 'done', c.note!);
  }
}

registerSimHook('month', 'services12', (s) => servicesMonth(s, Rng.fromSeed(`${s.config.seed}:services12:${s.year}:${s.month}`)));
