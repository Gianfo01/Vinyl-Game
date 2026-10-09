// Carreira de dono de festival (rodada 12). Unifica o festival de Empreendimentos (ventures9) com o
// festival de terreno (live): os dois são o MESMO festival — um negócio (dono, P&L, equipe) ligado a
// um terreno (palcos, banheiros, segurança). O ciclo de cada edição: conceito (identidade) ->
// financiamento (patrocínios, fornecedores, adiantamentos com datas) -> contratação (palco e horário,
// negociação de posição, duração, exclusividade e rider técnico) -> venda em lotes (early bird antes do
// anúncio, lotes, passes de dia, pacotes) -> operação no dia (decisões pausadas: chuva, atraso,
// equipamento, fluxo de público) -> edição -> memória do público (quem vem pelo festival, não pela
// atração) -> próxima edição. Toda aleatoriedade usa um gerador próprio (semente + festival + mês).

import { Rng, clamp, hashString } from '../../core/rng';
import { cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { deferEvents, queueCutscene, registerExt4, registerSimHook } from '../ext4';
import { emitEvent, resolveDecision, type EventDef } from '../events';
import { climateInfo } from '../travelAdapter';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, remember } from '../util';
import { monthIndex } from '../capacity';
import { countTiles, festModel, guestAccepts, guestFee } from './live/festival';
import { bump, isMine, liveOf, type FestEdition, type FestThought, type FestTile, type OwnFestival } from './live/state';
import { foundVenture, ventures, vpay9, type Holder, type Venture, type Verdict } from './ventures9';

// ---------------------------------------------------------------- tipos

export type Ident = 'discovery' | 'genre' | 'family' | 'premium' | 'mega';
export type OpK = 'storm' | 'rain' | 'delay' | 'gear' | 'crowd';
export type SpK = 'beer' | 'bank' | 'kids' | 'luxury' | 'indie' | 'tech';
export interface Deal { actId: string; stage: number; time: number; len: number; excl: boolean; tech: number; adv: number }
export interface Commit { id: string; due: number; amt: number; what: L; kind: 'sponsor' | 'supplier' | 'advance' | 'loan' | 'refund'; done?: boolean; min?: number }
export interface Sponsor { id: string; k: SpK; name: string; total: number; min: number }
export interface Mods { ex: number; co: number; sa: number; dem: number; loyal: number; risk: number }
export interface Cycle {
  year: number; phase: 'plan' | 'early' | 'onsale'; lot: number; sold: number; early: number; cash: number; passes: boolean; packages: boolean;
  offers: Sponsor[]; sponsors: Sponsor[]; supplied: boolean; loan: boolean; ops: { k: OpK; c?: string }[]; opsOn: boolean; cancelRolled: boolean;
  mods: Mods; notes: L[]; late?: boolean; hype: number;
}
export interface Hist { y: number; crowd: number; cap: number; loyal: number; early: number; rating: number; profit: number; head: string; ident: Ident; tag: L; why: L[] }
export interface F12 { ident: Ident; fam: FamilyId; deals: Record<string, Deal>; cyc: Cycle; loyal: number; hist: Hist[]; commits: Commit[] }
export interface Fest12State { f: Record<string, F12>; snap: Record<string, { m: number; c: string }> }

declare module '../ext4' { interface Ext4 { fest12: Fest12State } }
registerExt4('fest12', () => ({ f: {}, snap: {} }));
export const fest12 = (s: GameState): Fest12State => {
  const x = s.x4 as unknown as { fest12?: Fest12State };
  x.fest12 ??= { f: {}, snap: {} };
  return x.fest12;
};

// ---------------------------------------------------------------- dados

export const TIMES: L[] = [l('Tarde', 'Afternoon'), l('Pôr do sol', 'Sunset'), l('Noite', 'Evening'), l('Headliner', 'Headliner')];
export const LENS = [30, 45, 60, 90];
const LEN_F: Record<number, number> = { 30: 0.75, 45: 0.88, 60: 1, 90: 1.3 };
export const TECH: L[] = [l('Rider simples', 'Simple rider'), l('Rider padrão', 'Standard rider'), l('Produção pesada', 'Heavy production')];
export const IDENTS: Record<Ident, { name: L; desc: L; feeF: number; demF: number; loyalF: number }> = {
  discovery: { name: l('Curadoria de descobertas', 'Discovery curation'), desc: l('Público vem pela curadoria: nomes pequenos rendem mais, cachês menores, reputação artística. Headliner pesa pouco.', 'People come for the curation: small names pay off, lower fees, artistic reputation. Headliners matter less.'), feeF: 0.85, demF: 0.8, loyalF: 1.4 },
  genre: { name: l('Gênero único', 'Single genre'), desc: l('Um nicho fiel: atrações do gênero rendem mais; fora dele, o público torce o nariz.', 'A loyal niche: on-genre acts draw more; off-genre acts get frowns.'), feeF: 1, demF: 0.9, loyalF: 1.3 },
  family: { name: l('Família', 'Family'), desc: l('Conforto e segurança contam dobrado; patrocínio familiar; cerveja e som pesado afastam.', 'Comfort and safety count double; family sponsors; beer brands and heavy sounds put people off.'), feeF: 1, demF: 0.85, loyalF: 1.15 },
  premium: { name: l('Premium', 'Premium'), desc: l('Menos gente, ingresso caro, luxo: o público tolera preço, mas não fila.', 'Fewer people, pricey tickets, luxury: the crowd tolerates price, not queues.'), feeF: 1.15, demF: 0.6, loyalF: 1 },
  mega: { name: l('Mega popular', 'Popular mega'), desc: l('Tudo depende dos headliners: público enorme, cachês e patrocínios altos, memória fraca.', 'It all hinges on headliners: huge crowds, big fees and sponsors, weak memory.'), feeF: 1.1, demF: 1.15, loyalF: 0.6 },
};
export const SPONS: Record<SpK, { name: L; base: number; from: number; fit: Partial<Record<Ident, number>>; clash?: Ident[]; names: string[] }> = {
  beer: { name: l('Cervejaria', 'Brewery'), base: 9000, from: 1950, fit: { mega: 1.3, genre: 1.1, discovery: 0.8, family: 0.4, premium: 0.7 }, clash: ['family'], names: ['Cervejaria Aurora', 'Lúpulo Norte', 'Barril Dourado'] },
  bank: { name: l('Banco', 'Bank'), base: 11000, from: 1950, fit: { premium: 1.3, mega: 1.2, family: 1, genre: 0.7, discovery: 0.6 }, names: ['Banco Meridiano', 'Crédito Atlas', 'Banco Horizonte'] },
  kids: { name: l('Marca familiar', 'Family brand'), base: 6000, from: 1950, fit: { family: 1.6, mega: 0.8, premium: 0.5, genre: 0.4, discovery: 0.5 }, names: ['Sucos Pomar', 'Brinquedos Ciranda', 'Biscoitos Lua'] },
  luxury: { name: l('Luxo', 'Luxury'), base: 15000, from: 1960, fit: { premium: 1.6, mega: 0.6, family: 0.5, genre: 0.4, discovery: 0.3 }, clash: ['discovery'], names: ['Maison Verlaine', 'Relógios Kessler', 'Vinhos Altamira'] },
  indie: { name: l('Instituto cultural', 'Cultural institute'), base: 3000, from: 1950, fit: { discovery: 1.6, genre: 1.3, family: 0.9, premium: 0.5, mega: 0.4 }, names: ['Instituto Farol', 'Fundação Vitrola', 'Discos da Esquina'] },
  tech: { name: l('Tecnologia', 'Tech'), base: 14000, from: 1995, fit: { mega: 1.3, discovery: 1.1, premium: 1, genre: 0.7, family: 0.8 }, names: ['Nébula Telecom', 'Pixelar', 'Onda Digital'] },
};

const fresh = (year: number): Cycle => ({
  year, phase: 'plan', lot: 0, sold: 0, early: 0, cash: 0, passes: false, packages: false, offers: [], sponsors: [], supplied: false, loan: false, ops: [], opsOn: false, cancelRolled: false,
  mods: { ex: 0, co: 0, sa: 0, dem: 1, loyal: 1, risk: 0 }, notes: [], hype: 1,
});
const own = (s: GameState, k: string) => Rng.fromSeed(`${s.config.seed}:fest12:${k}:${monthIndex(s)}`);
export const festOf = (s: GameState, fid: string) => liveOf(s).fests.find((x) => x.id === fid);
export const ventureOf = (s: GameState, fid: string) => ventures(s).list.find((v) => v.fx === fid);
export function f12(s: GameState, f: OwnFestival): F12 {
  const st = fest12(s);
  return (st.f[f.id] ??= { ident: 'mega', fam: 'rock' as FamilyId, deals: {}, cyc: fresh(f.nextYear), loyal: 0, hist: [], commits: [] });
}
const holder = (s: GameState, fid: string): Holder => ventureOf(s, fid)?.owner ?? 'label';
function pay(s: GameState, f: OwnFestival, amt: number, key: string, memo: string): void {
  vpay9(s, holder(s, f.id), Math.round(amt), `f12:${f.id}:${key}`, memo, ventureOf(s, f.id));
}
export const muOf = (s: GameState, f: OwnFestival) => f.nextYear * 12 + f.month - monthIndex(s);
const actsOf = (s: GameState, f: OwnFestival) => f.lineup.map((x) => s.acts[x.actId]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split');
export const techOf = (a: Act) => (a.fame >= 55 || hashString(a.id) % 5 === 0 ? 2 : a.fame >= 30 || hashString(a.id) % 3 === 0 ? 1 : 0);
export const wantTime = (a: Act) => (a.fame >= 60 ? 3 : a.fame >= 40 ? 2 : a.fame >= 20 ? 1 : 0);

// ---------------------------------------------------------------- unificação (Empreendimentos <-> terreno)

function mkFest(s: GameState, v: Venture): OwnFestival {
  const w = 12, h = 8;
  const grid: FestTile[] = new Array(w * h).fill('');
  grid[5] = 'stage';
  grid[(h - 1) * w + 5] = 'gate';
  grid[(h - 1) * w] = 'toilet';
  grid[(h - 1) * w + 1] = 'toilet';
  grid[(h - 1) * w + 11] = 'food';
  grid[(h - 1) * w + 2] = 'toilet';
  grid[(h - 1) * w + 3] = 'security';
  grid[(h - 1) * w + 4] = 'security';
  grid[(h - 1) * w + 7] = 'medic';
  grid[(h - 1) * w + 8] = 'bar';
  const month = v.month ?? 6;
  const price = clamp(Math.round((25 * (v.price ?? money(s, 25))) / Math.max(1, money(s, 25))), 5, 400);
  return { id: nextId(s, 'fx'), name: v.name, cityId: v.city, month, days: 1, price, w, h, grid, lineup: [], rep: v.rep, founded: v.founded, nextYear: month >= s.month ? s.year : s.year + 1, editions: [] };
}

/** Liga cada festival de Empreendimentos a um terreno e cada terreno a um negócio: um só festival. */
export function sync12(s: GameState): void {
  const st = fest12(s);
  const lv = liveOf(s);
  const vs = ventures(s);
  for (const v of vs.list) {
    if (v.kind !== 'festival') continue;
    let f = v.fx ? lv.fests.find((x) => x.id === v.fx) : undefined;
    if (!f) {
      f = mkFest(s, v);
      lv.fests.push(f);
      v.fx = f.id;
      st.snap[v.id] = { m: f.month, c: f.cityId };
      const x = f12(s, f);
      for (const e of v.editions ?? []) x.hist.push({ y: e.y, crowd: e.crowd, cap: 0, loyal: 0, early: 0, rating: 0, profit: e.profit, head: e.head, ident: x.ident, tag: VERD[e.verdict], why: [] });
    }
    const sn = (st.snap[v.id] ??= { m: f.month, c: f.cityId });
    if (v.month !== undefined && v.month !== sn.m) setCal12(s, f.id, { month: v.month });
    if (v.city !== sn.c && cityById[v.city]) f.cityId = v.city;
    v.month = sn.m = f.month;
    v.city = sn.c = f.cityId;
    v.name = f.name;
    v.rep = f.rep;
    v.price = money(s, f.price);
    for (const x of v.lineup ?? []) {
      const a = s.acts[x.actId];
      if (a && !f.lineup.some((y) => y.actId === a.id)) {
        const slot = freeSlot(s, f, wantTime(a));
        if (slot) place(s, f, a, { ...slot, len: 60, excl: false, fee: isMine(s, a.id) ? 0 : guestFee(s, a) }, false);
      }
    }
    if (v.lineup) v.lineup = [];
  }
  for (const f of lv.fests) {
    // atrações postas pelo editor de terreno ganham palco e horário
    const x = f12(s, f);
    for (const y of f.lineup) { const a = s.acts[y.actId]; const sl = a && !x.deals[a.id] ? freeSlot(s, f, wantTime(a)) : null; if (a && sl) x.deals[a.id] = { actId: a.id, ...sl, len: 60, excl: false, tech: techOf(a), adv: 0 }; }
    if (vs.list.some((v) => v.fx === f.id)) continue;
    const v: Venture = { id: nextId(s, 'vn'), kind: 'festival', owner: 'label', city: f.cityId, level: 1, rep: f.rep, staff: 1, founded: f.founded, cost: money(s, 12000), pl: [], total: 0, name: f.name, month: f.month, price: money(s, f.price), lineup: [], editions: [], fx: f.id };
    vs.list.push(v);
    st.snap[v.id] = { m: f.month, c: f.cityId };
  }
}

/** Funda pelo caminho único (mesmo custo nas duas telas). */
export function found12(s: GameState, owner: Holder, o: { name?: string; city?: string; month: number; ident: Ident; fam?: FamilyId }): L | OwnFestival {
  const before = ventures(s).list.length;
  const e = foundVenture(s, 'festival', owner, { name: o.name, city: o.city });
  if (e) return e;
  const v = ventures(s).list[before];
  v.month = clamp(Math.round(o.month), 0, 11);
  sync12(s);
  const f = festOf(s, v.fx!)!;
  if (muOf(s, f) < 4) f.nextYear += 1;
  const x = f12(s, f);
  x.ident = o.ident;
  if (o.fam) x.fam = o.fam;
  x.cyc = fresh(f.nextYear);
  return f;
}

export function setCal12(s: GameState, fid: string, o: { month?: number; days?: number; price?: number; name?: string }): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Festival inválido.', 'Invalid festival.');
  const x = f12(s, f);
  if (o.month !== undefined && o.month !== f.month) {
    if (x.cyc.sold > 0) return l('Com ingressos vendidos, a data não muda.', 'Tickets are sold: the date is locked.');
    f.month = clamp(Math.round(o.month), 0, 11);
    f.nextYear = Math.max(x.hist.some((h) => h.y === s.year) ? s.year + 1 : s.year, f.month > s.month ? s.year : s.year + 1);
    x.cyc.year = f.nextYear;
  }
  if (o.days !== undefined) { if (x.cyc.sold > 0) return l('Com ingressos vendidos, os dias não mudam.', 'Tickets are sold: the days are locked.'); f.days = clamp(Math.round(o.days), 1, 3); }
  if (o.price !== undefined) f.price = clamp(Math.round(o.price), 5, 400);
  if (o.name !== undefined && o.name.trim()) f.name = o.name.trim();
  return null;
}

export function setIdent12(s: GameState, fid: string, ident: Ident, fam?: FamilyId): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Festival inválido.', 'Invalid festival.');
  const x = f12(s, f);
  if (x.cyc.phase === 'onsale') return l('Depois do anúncio, a identidade não muda nesta edição.', 'After the announcement the identity is locked for this edition.');
  if ((ident !== x.ident || (ident === 'genre' && fam && fam !== x.fam)) && x.hist.length) {
    x.loyal = Math.round(x.loyal * 0.6);
    x.cyc.notes.push(l('Mudança de identidade: 40% do público fiel não se reconhece mais no festival.', 'Identity change: 40% of the loyal crowd no longer recognises the festival.'));
  }
  x.ident = ident;
  if (fam) x.fam = fam;
  return null;
}

// ---------------------------------------------------------------- palco, horário e negociação

export function stagesOf(f: OwnFestival): number { return countTiles(f).stage; }
function freeSlot(s: GameState, f: OwnFestival, want: number): { stage: number; time: number } | null {
  const x = f12(s, f);
  const used = new Set(Object.values(x.deals).map((d) => `${d.stage}:${d.time}`));
  const n = stagesOf(f);
  for (let t = want; t >= 0; t--) for (let st = 0; st < n; st++) if (!used.has(`${st}:${t}`)) return { stage: st, time: t };
  for (let t = want + 1; t < 4; t++) for (let st = 0; st < n; st++) if (!used.has(`${st}:${t}`)) return { stage: st, time: t };
  return null;
}

export interface Ask { fee: number; time: number; tech: number; why: L[]; refuse?: L }
/** O que o artista pede (cachê em dólares reais) para a posição e as condições oferecidas. */
export function ask12(s: GameState, f: OwnFestival, a: Act, o: { time: number; len: number; excl: boolean }): Ask {
  const x = f12(s, f);
  const why: L[] = [];
  const id = IDENTS[x.ident];
  let fee = guestFee(s, a) * LEN_F[o.len] * (x.ident === 'discovery' && a.fame >= 50 ? 1.1 : id.feeF);
  if (id.feeF !== 1) why.push(fmtL(l('Identidade {i}: cachê ×{f}.', '{i} identity: fee ×{f}.'), { i: id.name, f: id.feeF }));
  if (o.len !== 60) why.push(fmtL(l('Set de {n} min: cachê ×{f}.', '{n}-min set: fee ×{f}.'), { n: o.len, f: LEN_F[o.len] }));
  const want = wantTime(a);
  if (o.time < want) { fee *= 1 + 0.25 * (want - o.time); why.push(fmtL(l('Quer tocar em "{w}"; posição abaixo custa +{p}%.', 'Wants the "{w}" slot; a lower billing costs +{p}%.'), { w: TIMES[want], p: 25 * (want - o.time) })); }
  if (o.excl) { fee *= 1.35; why.push(l('Exclusividade regional: +35% (não toca em outro festival da região).', 'Regional exclusivity: +35% (no other festival in the region).')); }
  const tech = techOf(a);
  if (tech === 2) why.push(l('Produção pesada: custo extra de palco e mais risco de pane.', 'Heavy production: extra stage cost and higher failure risk.'));
  let refuse: L | undefined;
  if (isMine(s, a.id)) return { fee: 0, time: want, tech, why: [l('Artista do seu selo: sem cachê.', 'Your own act: no fee.')] };
  if (!guestAccepts(f, a)) refuse = l('O festival ainda não tem prestígio para esse nome (mais palcos e reputação ajudam).', 'The festival lacks the prestige for this name (more stages and reputation help).');
  else if (o.excl && a.fame >= 70 && f.rep < 50) refuse = l('Não dá exclusividade a um festival pequeno.', 'Won\'t grant exclusivity to a small festival.');
  if (x.ident === 'genre' && familyOf(a.genre) !== x.fam) why.push(l('Fora do gênero do festival: o público de nicho torce o nariz.', 'Off the festival\'s genre: the niche crowd frowns.'));
  return { fee: Math.round(fee), time: want, tech, why, refuse };
}

export interface OfferRes { res: 'yes' | 'counter' | 'no'; text: L; counter?: number }
/** Proposta ao artista: aceita (>= pedido), contraproposta (>= 80%) ou recusa. Fee em dólares reais. */
export function offer12(s: GameState, fid: string, actId: string, o: { stage: number; time: number; len: number; excl: boolean; fee: number }): OfferRes {
  const f = festOf(s, fid);
  const a = s.acts[actId];
  if (!f || !a || a.status === 'retired' || a.status === 'split') return { res: 'no', text: l('Inválido.', 'Invalid.') };
  const x = f12(s, f);
  if (x.deals[actId] || f.lineup.some((y) => y.actId === actId)) return { res: 'no', text: l('Já está no line-up.', 'Already on the bill.') };
  if (o.stage >= stagesOf(f)) return { res: 'no', text: l('Esse palco não existe no terreno.', 'That stage does not exist on the grounds.') };
  if (Object.values(x.deals).some((d) => d.stage === o.stage && d.time === o.time)) return { res: 'no', text: l('Esse horário já está ocupado nesse palco.', 'That slot is taken on that stage.') };
  const k = ask12(s, f, a, o);
  if (k.refuse) return { res: 'no', text: fmtL(l('{a} recusou: {w}', '{a} declined: {w}'), { a: a.name, w: k.refuse }) };
  const fee = isMine(s, actId) ? 0 : Math.round(o.fee);
  if (fee < k.fee * 0.8) return { res: 'no', text: fmtL(l('{a} achou a proposta ofensiva ({p}% do pedido).', '{a} found the offer insulting ({p}% of the ask).'), { a: a.name, p: Math.round((fee / Math.max(1, k.fee)) * 100) }) };
  if (fee < k.fee) return { res: 'counter', counter: k.fee, text: fmtL(l('{a} pede {f} (dólares de hoje) por essas condições.', '{a} asks {f} (today\'s dollars) for these terms.'), { a: a.name, f: Math.round(money(s, k.fee) / 100) }) };
  place(s, f, a, { stage: o.stage, time: o.time, len: o.len, excl: o.excl, fee }, true);
  return { res: 'yes', text: fmtL(l('{a} confirmado: {t}, palco {p}.', '{a} confirmed: {t}, stage {p}.'), { a: a.name, t: TIMES[o.time], p: o.stage + 1 }) };
}

function place(s: GameState, f: OwnFestival, a: Act, o: { stage: number; time: number; len: number; excl: boolean; fee: number }, advance: boolean): void {
  const x = f12(s, f);
  f.lineup.push({ actId: a.id, fee: o.fee });
  const adv = advance && o.fee ? Math.round(money(s, o.fee) * 0.3) : 0;
  x.deals[a.id] = { actId: a.id, stage: o.stage, time: o.time, len: o.len, excl: o.excl, tech: techOf(a), adv };
  if (adv) {
    pay(s, f, -adv, `adv:${a.id}`, `Adiantamento ${a.name} (${f.name})`);
    x.commits.push({ id: nextId(s, 'cm'), due: monthIndex(s), amt: -adv, what: fmtL(l('Adiantamento de 30%: {a}', '30% advance: {a}'), { a: a.name }), kind: 'advance', done: true });
  }
}

export function drop12(s: GameState, fid: string, actId: string): void {
  const f = festOf(s, fid);
  if (!f) return;
  const x = f12(s, f);
  f.lineup = f.lineup.filter((y) => y.actId !== actId);
  delete x.deals[actId];
  if (x.cyc.phase === 'onsale') { x.cyc.hype *= 0.95; x.cyc.notes.push(l('Atração anunciada saiu do line-up: parte do público se irrita.', 'An announced act left the bill: part of the crowd is annoyed.')); }
}

export function move12(s: GameState, fid: string, actId: string, stage: number, time: number): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Inválido.', 'Invalid.');
  const x = f12(s, f);
  const d = x.deals[actId];
  if (!d) return l('Inválido.', 'Invalid.');
  if (stage >= stagesOf(f)) return l('Esse palco não existe.', 'That stage does not exist.');
  const other = Object.values(x.deals).find((y) => y.stage === stage && y.time === time && y !== d);
  if (other) { other.stage = d.stage; other.time = d.time; }
  d.stage = stage;
  d.time = time;
  return null;
}

/** Choques de horário: públicos parecidos ao mesmo tempo dividem a plateia; dois grandes juntos frustram. */
export function clashes12(s: GameState, f: OwnFestival): { ex: number; co: number; dem: number; why: L[] } {
  const x = f12(s, f);
  const out = { ex: 0, co: 0, dem: 1, why: [] as L[] };
  for (let t = 0; t < 4; t++) {
    const at = Object.values(x.deals).filter((d) => d.time === t).map((d) => s.acts[d.actId]).filter((a): a is Act => !!a);
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
      const a = at[i], b = at[j];
      if (a.fame >= 60 && b.fame >= 60) { out.ex -= 6; out.co -= 3; out.why.push(fmtL(l('{a} e {b} no mesmo horário: o público teve de escolher e se frustrou.', '{a} and {b} at the same time: the crowd had to choose and got frustrated.'), { a: a.name, b: b.name })); }
      else if (familyOf(a.genre) === familyOf(b.genre)) { out.dem *= 0.96; out.ex -= 2; out.why.push(fmtL(l('{a} e {b} dividem o mesmo público no mesmo horário.', '{a} and {b} split the same crowd in the same slot.'), { a: a.name, b: b.name })); }
    }
  }
  if (Object.keys(x.deals).length && !Object.values(x.deals).some((d) => d.time === 3)) { out.ex -= 5; out.why.push(l('Ninguém no horário de headliner: a noite termina murcha.', 'Nobody in the headliner slot: the night fizzles out.')); }
  return out;
}

// ---------------------------------------------------------------- demanda, ingressos e caixa

/** Rodada 12 (hype12): hype do line-up e fatos somam à procura. */
export const festHypeHook: { f: (s: GameState, f: OwnFestival) => { k: number; why?: L } | null } = { f: () => null };
export interface Proj { demand: number; cap: number; fair: number; early: number; why: L[]; avg: number }
export function proj12(s: GameState, f: OwnFestival): Proj {
  const x = f12(s, f);
  const m = festModel(s, f);
  const id = IDENTS[x.ident];
  const acts = actsOf(s, f);
  const top = acts.reduce((t, a) => Math.max(t, a.fame), 0);
  const why: L[] = [];
  let dem = m.demand * id.demF;
  if (x.ident === 'mega') { dem *= 0.6 + top / 100; why.push(fmtL(l('Mega: o headliner (fama {t}) decide o público.', 'Mega: the headliner (fame {t}) drives the crowd.'), { t: top })); }
  if (x.ident === 'discovery') { const small = acts.filter((a) => a.fame < 35).length; dem *= 1 + Math.min(0.3, small * 0.05); if (small) why.push(fmtL(l('{n} descobertas no line-up atraem quem confia na curadoria.', '{n} discoveries on the bill draw people who trust the curation.'), { n: small })); }
  if (x.ident === 'genre') { const on = acts.length ? acts.filter((a) => familyOf(a.genre) === x.fam).length / acts.length : 1; dem *= 0.75 + on * 0.45; if (on < 1) why.push(fmtL(l('{p}% do line-up fora do gênero.', '{p}% of the bill is off-genre.'), { p: Math.round((1 - on) * 100) })); }
  if (x.ident === 'family') { dem *= 0.7 + m.comfort / 200 + m.safety / 400; why.push(l('Família: conforto e segurança pesam na decisão de compra.', 'Family: comfort and safety weigh on the buying decision.')); }
  const fair = 25 + top * 0.5;
  if (x.ident === 'premium') { dem *= Math.pow(Math.max(0.3, f.price / fair), 0.9); why.push(l('Premium: preço alto não espanta; parece exclusivo.', 'Premium: a high price does not scare; it feels exclusive.')); }
  const cl = clashes12(s, f);
  dem *= cl.dem;
  const ex = Object.values(x.deals).filter((d) => d.excl && (s.acts[d.actId]?.fame ?? 0) >= 40).length;
  if (ex) { dem *= 1 + ex * 0.06; why.push(fmtL(l('{n} exclusividade(s) regional(is): +{p}% de procura.', '{n} regional exclusive(s): +{p}% demand.'), { n: ex, p: ex * 6 })); }
  if (x.cyc.phase !== 'onsale') { dem *= 0.35; why.push(l('Line-up ainda não anunciado: só o público fiel e os curiosos compram.', 'Line-up not announced yet: only the loyal crowd and the curious buy.')); }
  if (x.cyc.late) why.push(l('Anúncio tardio: pouca gente teve tempo de se planejar (−15%).', 'Late announcement: few people had time to plan (−15%).'));
  if (f.days > 1 && x.cyc.passes) { dem *= 1.15; why.push(l('Passes de um dia: mais gente casual entra (+15%), ticket médio menor.', 'Day passes: more casual buyers (+15%), lower average ticket.')); }
  const hh = festHypeHook.f(s, f);
  if (hh) { dem *= hh.k; if (hh.why) why.push(hh.why); }
  dem = dem * x.cyc.hype * x.cyc.mods.dem * (x.cyc.late ? 0.85 : 1) + x.loyal * id.loyalF;
  if (x.loyal) why.push(fmtL(l('{n} fiéis compram pelo festival, não pela atração.', '{n} loyalists buy for the festival, not the act.'), { n: Math.round(x.loyal) }));
  const trust = clamp((f.rep + x.hist.length * 6) / 90, 0.08, 1);
  const early = Math.round(x.loyal * id.loyalF + f.rep * 40 * trust);
  const avg = f.price * f.days * (f.days > 1 && x.cyc.passes ? 0.8 : 1) * (x.cyc.packages ? 1.08 : 1);
  return { demand: Math.round(dem), cap: m.capacity, fair, early, why, avg };
}

export function openEarly12(s: GameState, fid: string): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Inválido.', 'Invalid.');
  const x = f12(s, f);
  if (x.cyc.phase !== 'plan') return l('As vendas já começaram.', 'Sales already started.');
  if (muOf(s, f) < 3) return l('Tarde demais para early bird: anuncie o line-up.', 'Too late for early bird: announce the line-up.');
  x.cyc.phase = 'early';
  return null;
}
export function announce12(s: GameState, fid: string): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Inválido.', 'Invalid.');
  const x = f12(s, f);
  if (x.cyc.phase === 'onsale') return l('Já anunciado.', 'Already announced.');
  if (!f.lineup.length) return l('Anuncie com ao menos uma atração confirmada.', 'Announce with at least one confirmed act.');
  x.cyc.phase = 'onsale';
  x.cyc.lot = 1;
  if (muOf(s, f) >= 4) { x.cyc.hype *= 1.06; x.cyc.notes.push(l('Anúncio com antecedência: +6% de expectativa.', 'Early announcement: +6% buzz.')); }
  return null;
}
export function setSales12(s: GameState, fid: string, o: { passes?: boolean; packages?: boolean }): void {
  const f = festOf(s, fid);
  if (!f) return;
  const x = f12(s, f);
  if (o.passes !== undefined) x.cyc.passes = o.passes && f.days > 1;
  if (o.packages !== undefined) x.cyc.packages = o.packages;
}
export const lotPrice = (x: F12) => (x.cyc.phase === 'early' ? 0.6 : x.cyc.lot >= 2 ? 1.25 : 1);

function salesMonth(s: GameState, f: OwnFestival, x: F12): void {
  const p = proj12(s, f);
  const left = Math.max(0, p.cap - x.cyc.sold);
  if (!left) return;
  let n = 0;
  if (x.cyc.phase === 'early') n = Math.min(left, Math.max(0, p.early - x.cyc.early) * 0.35);
  else if (x.cyc.phase === 'onsale') n = Math.min(left, Math.max(0, p.demand - x.cyc.sold) * (muOf(s, f) <= 1 ? 0.45 : 0.25) * (x.cyc.lot >= 2 ? 0.8 : 1));
  n = Math.round(n);
  if (n <= 0) return;
  const rev = n * money(s, p.avg) * lotPrice(x);
  x.cyc.sold += n;
  if (x.cyc.phase === 'early') x.cyc.early += n;
  x.cyc.cash += Math.round(rev);
  pay(s, f, rev, `tix:${monthIndex(s)}`, `Ingressos ${f.name} (${x.cyc.phase === 'early' ? 'early bird' : `lote ${x.cyc.lot}`})`);
  if (x.cyc.phase === 'onsale' && x.cyc.lot === 1 && (x.cyc.sold > p.cap * 0.5 || muOf(s, f) <= 1)) x.cyc.lot = 2;
}

/** Custos previstos da estrutura (aluguel do terreno + produção, rider pesado incluído). */
export function structCost(s: GameState, f: OwnFestival): number {
  const m = festModel(s, f);
  const heavy = Object.values(f12(s, f).deals).filter((d) => d.tech === 2).length;
  return m.costs.tiles + m.costs.production + money(s, 4000) * heavy;
}

export function sponsorOffer(s: GameState, r: Rng, f: OwnFestival, x: F12): Sponsor | null {
  const ks = (Object.keys(SPONS) as SpK[]).filter((k) => s.year >= SPONS[k].from && !x.cyc.offers.concat(x.cyc.sponsors).some((o) => o.k === k));
  if (!ks.length) return null;
  ks.sort((a, b) => (SPONS[b].fit[x.ident] ?? 1) - (SPONS[a].fit[x.ident] ?? 1));
  const k = r.chance(0.6) ? ks[0] : r.pick(ks);
  const sp = SPONS[k];
  const p = proj12(s, f);
  const total = money(s, sp.base * (0.4 + f.rep / 80) * (sp.fit[x.ident] ?? 1) * (0.6 + Math.min(2, p.cap / 15000)));
  return { id: nextId(s, 'sp'), k, name: r.pick(sp.names), total: Math.round(total), min: Math.round(Math.min(p.cap, Math.max(p.demand, p.early)) * 0.7) };
}

export function takeSponsor12(s: GameState, fid: string, sid: string, yes: boolean): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Inválido.', 'Invalid.');
  const x = f12(s, f);
  const o = x.cyc.offers.find((y) => y.id === sid);
  if (!o) return l('Oferta expirou.', 'Offer expired.');
  x.cyc.offers = x.cyc.offers.filter((y) => y !== o);
  if (!yes) return null;
  x.cyc.sponsors.push(o);
  const up = Math.round(o.total * 0.4);
  pay(s, f, up, `sp:${o.id}`, `Patrocínio ${o.name} (${f.name})`);
  x.commits.push({ id: nextId(s, 'cm'), due: monthIndex(s), amt: up, what: fmtL(l('{n}: 40% na assinatura', '{n}: 40% on signing'), { n: o.name }), kind: 'sponsor', done: true });
  x.commits.push({ id: nextId(s, 'cm'), due: f.nextYear * 12 + f.month + 1, amt: o.total - up, what: fmtL(l('{n}: 60% após o festival (meta {m} pessoas)', '{n}: 60% after the festival (target {m} people)'), { n: o.name, m: o.min }), kind: 'sponsor', min: o.min });
  if (SPONS[o.k].clash?.includes(x.ident)) x.cyc.notes.push(fmtL(l('{n} destoa da identidade {i}: o público fiel vai reparar.', '{n} clashes with the {i} identity: the loyal crowd will notice.'), { n: o.name, i: IDENTS[x.ident].name }));
  return null;
}

/** Adiantamento da bilheteria: dinheiro agora, devolve 120% na data do festival. */
export function loan12(s: GameState, fid: string): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Inválido.', 'Invalid.');
  const x = f12(s, f);
  if (x.cyc.loan) return l('Já usou o adiantamento desta edição.', 'Advance already used this edition.');
  if (x.cyc.phase === 'plan') return l('A tiqueteira só adianta com vendas abertas.', 'The ticketing company only advances once sales are open.');
  const amt = loanSize(s, f);
  if (amt <= 0) return l('Nada a adiantar.', 'Nothing to advance.');
  x.cyc.loan = true;
  pay(s, f, amt, 'loan', `Adiantamento da tiqueteira (${f.name})`);
  x.commits.push({ id: nextId(s, 'cm'), due: f.nextYear * 12 + f.month, amt: -Math.round(amt * 1.2), what: l('Devolução do adiantamento da tiqueteira (+20%)', 'Ticketing advance repayment (+20%)'), kind: 'loan' });
  return null;
}
export function loanSize(s: GameState, f: OwnFestival): number {
  const p = proj12(s, f);
  const x = f12(s, f);
  return Math.round(Math.max(0, Math.min(p.cap, p.demand) - x.cyc.sold) * money(s, p.avg) * 0.4);
}

function payCommits(s: GameState, f: OwnFestival, x: F12): void {
  const now = monthIndex(s);
  for (const c of x.commits) {
    if (c.done || c.due > now) continue;
    c.done = true;
    pay(s, f, c.amt, `cm:${c.id}`, `${f.name}: ${c.what.pt}`);
  }
  x.commits = x.commits.filter((c) => !c.done || c.due > now - 14);
}

function supplyDeals(s: GameState, f: OwnFestival, x: F12): void {
  if (x.cyc.supplied || !f.lineup.length) return;
  x.cyc.supplied = true;
  const c = structCost(s, f);
  const half = Math.round(c / 2);
  const e = f.nextYear * 12 + f.month;
  x.commits.push({ id: nextId(s, 'cm'), due: Math.min(e - 1, monthIndex(s) + 1), amt: -half, what: l('Fornecedores: sinal de 50% (palcos, som, tendas)', 'Suppliers: 50% deposit (stages, sound, tents)'), kind: 'supplier' });
  x.commits.push({ id: nextId(s, 'cm'), due: e, amt: -(c - half), what: l('Fornecedores: saldo na data', 'Suppliers: balance on the day'), kind: 'supplier' });
  notify(s, fmtL(l('{f}: contratos de estrutura fechados — o sinal vence antes de a bilheteria entrar.', '{f}: structure contracts signed — the deposit falls due before ticket money comes in.'), { f: f.name }), 'info');
}

/** Fluxo de caixa mês a mês até depois do festival: compromissos datados + vendas previstas. */
export function flow12(s: GameState, f: OwnFestival): { m: number; inn: number; out: number; acc: number }[] {
  const x = f12(s, f);
  const now = monthIndex(s);
  const e = f.nextYear * 12 + f.month;
  const p = proj12(s, f);
  const rows: { m: number; inn: number; out: number; acc: number }[] = [];
  let acc = 0;
  let sold = x.cyc.sold;
  const unsupplied = !x.cyc.supplied && f.lineup.length ? structCost(s, f) : 0;
  for (let m = now + 1; m <= e + 1; m++) {
    let inn = 0, out = 0;
    for (const c of x.commits) if (!c.done && c.due === m) { if (c.amt > 0) inn += c.amt; else out -= c.amt; }
    if (m === e - 2 && unsupplied) out += unsupplied / 2;
    if (m === e && unsupplied) out += unsupplied / 2;
    if (m < e && x.cyc.phase !== 'plan') { const n = Math.max(0, Math.min(p.cap, p.demand) - sold) * 0.3; sold += n; inn += n * money(s, p.avg) * lotPrice(x); }
    if (m === e) {
      const fees = f.lineup.reduce((t, y) => t + money(s, y.fee) - (x.deals[y.actId]?.adv ?? 0), 0);
      out += fees;
      const door = Math.max(0, Math.min(p.cap, p.demand) - sold) * 0.55;
      inn += door * money(s, p.avg) * 1.15 + Math.min(p.cap, sold + door) * money(s, 6) * f.days;
    }
    acc += inn - out;
    rows.push({ m, inn: Math.round(inn), out: Math.round(out), acc: Math.round(acc) });
  }
  return rows;
}

// ---------------------------------------------------------------- operação no dia (decisões)

interface OpOpt { id: string; label: L; hint: L; m: Partial<Mods>; cost?: number; why: L }
export const OPS: Record<OpK, { title: L; text: L; opts: OpOpt[] }> = {
  storm: {
    title: l('{fest}: tempestade chegando', '{fest}: storm incoming'),
    text: l('O radar mostra raios a 20 km. O palco principal tem estrutura metálica e 40 minutos de set pela frente.', 'Radar shows lightning 20 km away. The main stage is a steel structure with a 40-minute set to go.'),
    opts: [
      { id: 'evac', label: l('Pausar tudo e abrigar o público', 'Pause everything and shelter the crowd'), hint: l('Segurança alta; empolgação cai.', 'Safety up; excitement down.'), m: { sa: 15, ex: -10, risk: -0.5 }, cost: 3000, why: l('Você pausou o festival na tempestade: ninguém se feriu, mas o clima esfriou.', 'You paused the festival in the storm: nobody got hurt, but the mood cooled.') },
      { id: 'cut', label: l('Encurtar o set e liberar a saída aos poucos', 'Cut the set short and release the crowd gradually'), hint: l('Meio-termo.', 'Middle ground.'), m: { sa: 6, ex: -5, co: -4 }, why: l('Set encurtado na tempestade: o público entendeu, metade reclamou.', 'Set cut short in the storm: the crowd understood, half complained.') },
      { id: 'go', label: l('O show não pode parar', 'The show must go on'), hint: l('Arriscado: se o raio cair perto, é desastre.', 'Risky: if lightning hits close, it\'s a disaster.'), m: { sa: -18, ex: 4, risk: 0.35 }, why: l('Você manteve o show na tempestade e apostou na sorte.', 'You kept the show going in the storm and gambled.') },
    ],
  },
  rain: {
    title: l('{fest}: chuva forte', '{fest}: heavy rain'),
    text: l('Chove desde o meio-dia. A pista virou lama e a fila do banheiro está alagada.', 'It\'s been raining since noon. The field is mud and the toilet queue is flooded.'),
    opts: [
      { id: 'cover', label: l('Capas, palha e pranchas na pista', 'Ponchos, straw and boards on the field'), hint: l('Custa, salva o conforto.', 'Costs money, saves comfort.'), m: { co: 10, loyal: 1.03 }, cost: 2500, why: l('Capas e pranchas na chuva: o público lembrou do cuidado.', 'Ponchos and boards in the rain: people remembered the care.') },
      { id: 'shift', label: l('Trocar a ordem: atrações calmas sob a tenda', 'Reshuffle: calmer acts under the tent'), hint: l('Conforto melhor, empolgação um pouco menor.', 'Better comfort, slightly less excitement.'), m: { co: 5, ex: -3 }, why: l('Você reorganizou a grade por causa da chuva.', 'You reshuffled the schedule because of the rain.') },
      { id: 'none', label: l('Seguir como está', 'Carry on as is'), hint: l('Lamaçal provável.', 'Mudbath likely.'), m: { co: -10 }, why: l('Nada foi feito contra a chuva: virou lamaçal.', 'Nothing was done about the rain: it became a mudbath.') },
    ],
  },
  delay: {
    title: l('{fest}: headliner atrasado', '{fest}: headliner running late'),
    text: l('O avião do headliner atrasou. Ele chega em 50 minutos — se o trânsito ajudar.', 'The headliner\'s flight is late. Arrival in 50 minutes — if traffic helps.'),
    opts: [
      { id: 'extend', label: l('Pagar para o artista anterior estender o set', 'Pay the previous act to extend their set'), hint: l('Custa; ninguém percebe o buraco.', 'Costs money; nobody notices the gap.'), m: { ex: 2 }, cost: 2000, why: l('O set estendido cobriu o atraso: virou o momento da noite para a atração anterior.', 'The extended set covered the delay: it became the previous act\'s moment.') },
      { id: 'screen', label: l('Avisar no telão e soltar um DJ', 'Announce it on the screen and put on a DJ'), hint: l('Honesto; a espera cansa.', 'Honest; the wait is tiring.'), m: { co: -3, ex: -2, loyal: 1.01 }, why: l('Você avisou o atraso com transparência: o público esperou de má vontade, mas confiou.', 'You announced the delay openly: people waited grudgingly but trusted you.') },
      { id: 'wait', label: l('Silêncio e palco vazio', 'Silence and an empty stage'), hint: l('Vaias.', 'Boos.'), m: { ex: -8, co: -4 }, why: l('Palco vazio sem explicação: vaias e garrafas.', 'An empty stage with no explanation: boos and bottles.') },
    ],
  },
  gear: {
    title: l('{fest}: pane no PA', '{fest}: PA failure'),
    text: l('O sistema de som do palco principal caiu no meio do set. A equipe técnica pede uma decisão.', 'The main stage sound system died mid-set. The tech crew needs a call.'),
    opts: [
      { id: 'rent', label: l('Gerador e PA de emergência', 'Emergency generator and PA'), hint: l('Caro, resolve em 20 minutos.', 'Expensive, fixed in 20 minutes.'), m: { ex: -2 }, cost: 5000, why: l('PA de emergência alugado na hora: quase ninguém notou.', 'Emergency PA rented on the spot: hardly anyone noticed.') },
      { id: 'acoustic', label: l('Show acústico improvisado na beira do palco', 'Improvised acoustic set at the stage edge'), hint: l('Pode virar lenda — ou fiasco.', 'Could become legend — or a fiasco.'), m: { ex: -4, loyal: 1.06 }, why: l('O acústico improvisado virou história contada por quem estava lá.', 'The improvised acoustic set became a story told by those who were there.') },
      { id: 'cancel', label: l('Cancelar o set', 'Cancel the set'), hint: l('Barato e frustrante.', 'Cheap and frustrating.'), m: { ex: -10 }, why: l('Set cancelado por pane: a noite perdeu o ponto alto.', 'Set cancelled by a failure: the night lost its peak.') },
    ],
  },
  crowd: {
    title: l('{fest}: gargalo na entrada', '{fest}: bottleneck at the gates'),
    text: l('Milhares na fila, empurra-empurra na grade e o headliner sobe em uma hora.', 'Thousands queuing, shoving at the barriers and the headliner is on in an hour.'),
    opts: [
      { id: 'gates', label: l('Abrir portões extras com mais seguranças', 'Open extra gates with more security'), hint: l('Custa; fluxo seguro.', 'Costs money; safe flow.'), m: { sa: 10, co: 4, risk: -0.4 }, cost: 3500, why: l('Portões extras abertos a tempo: o fluxo andou.', 'Extra gates opened in time: the flow moved.') },
      { id: 'hold', label: l('Segurar a entrada e atrasar o headliner', 'Hold the entry and delay the headliner'), hint: l('Seguro, irritante.', 'Safe, annoying.'), m: { sa: 6, co: -6, ex: -3 }, why: l('Entrada segurada: ninguém se machucou, todo mundo reclamou.', 'Entry held: nobody got hurt, everybody complained.') },
      { id: 'flow', label: l('Deixar fluir', 'Let it flow'), hint: l('Risco real de esmagamento.', 'Real risk of a crush.'), m: { sa: -15, risk: 0.45 }, why: l('Você deixou a multidão fluir sem controle.', 'You let the crowd flow uncontrolled.') },
    ],
  },
};

const OP_EVENTS: EventDef[] = (Object.keys(OPS) as OpK[]).map((k) => ({
  id: `f12_op_${k}`, cat: 'stage', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true, title: OPS[k].title, text: OPS[k].text,
  options: OPS[k].opts.map((o) => ({ id: o.id, label: o.label, hint: o.hint, apply: (s: GameState, _r: Rng, c: Record<string, string | number>) => chooseOp(s, String(c.fx), k, o.id) })),
}));

export function chooseOp(s: GameState, fid: string, k: OpK, oid: string): void {
  const f = festOf(s, fid);
  if (!f) return;
  const x = f12(s, f);
  const op = x.cyc.ops.find((o) => o.k === k && !o.c);
  const o = OPS[k].opts.find((y) => y.id === oid);
  if (!op || !o) return;
  op.c = oid;
  const md = x.cyc.mods;
  md.ex += o.m.ex ?? 0; md.co += o.m.co ?? 0; md.sa += o.m.sa ?? 0; md.risk += o.m.risk ?? 0; md.loyal *= o.m.loyal ?? 1;
  if (o.cost) pay(s, f, -money(s, o.cost), `op:${k}`, `${f.name}: ${o.label.pt}`);
  x.cyc.notes.push(o.why);
  if (x.cyc.ops.every((y) => y.c)) runEdition12(s, f);
}

function startOps(s: GameState, f: OwnFestival, x: F12): void {
  if (x.cyc.opsOn) return;
  x.cyc.opsOn = true;
  const r = own(s, `ops:${f.id}`);
  const clim = climateInfo(s, f.cityId, f.month);
  const cands: OpK[] = [];
  const staff = ventureOf(s, f.id)?.staff ?? 1;
  if (r.chance(clamp(clim.cancelRisk * 4 + 0.02, 0, 0.4))) cands.push('storm');
  else if (r.chance(clamp(0.15 + (1 - clim.outdoorFactor) * 0.6, 0, 0.7))) cands.push('rain');
  const heavy = Object.values(x.deals).filter((d) => d.tech === 2).length;
  const rest: OpK[] = [];
  if (r.chance(clamp(0.1 + heavy * 0.08 - staff * 0.02, 0.03, 0.45))) rest.push('gear');
  if (f.lineup.length >= 4 && r.chance(0.18)) rest.push('delay');
  const p = proj12(s, f);
  const gates = countTiles(f).gate * 7000;
  if (r.chance(Math.min(p.cap, x.cyc.sold + p.demand * 0.5) > gates * 0.8 || clashes12(s, f).co < 0 ? 0.5 : 0.08)) rest.push('crowd');
  while (cands.length < 2 && rest.length) cands.push(rest.splice(r.int(0, rest.length - 1), 1)[0]);
  x.cyc.ops = cands.map((k) => ({ k }));
  if (!cands.length) { runEdition12(s, f); return; }
  for (const k of cands) emitEvent(s, r, `f12_op_${k}`, { fx: f.id, fest: f.name });
}

// ---------------------------------------------------------------- cancelamento do headliner

const CANCEL: EventDef = {
  id: 'f12_cancel', cat: 'business', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
  title: l('{fest}: {who} cancelou', '{fest}: {who} cancelled'),
  text: l('A duas semanas do festival, {who} cancela (problema de saúde, dizem). {sold} ingressos vendidos. Dá para trazer {star} às pressas por um cachê salgado, ou promover {next} a headliner e compensar quem comprou.', 'Two weeks before the festival, {who} cancels (health, they say). {sold} tickets sold. You can rush in {star} for a steep fee, or promote {next} to headliner and compensate ticket holders.'),
  options: [
    { id: 'star', label: l('Trazer {star} ({feeTxt})', 'Bring in {star} ({feeTxt})'), hint: l('Mantém a procura; caro e sem negociação.', 'Keeps demand; expensive, no bargaining.'), apply: (s, _r, c) => cancelChoice(s, String(c.fx), String(c.wid), 'star', String(c.sid)) },
    { id: 'promote', label: l('Promover {next} e compensar o público', 'Promote {next} and compensate ticket holders'), hint: l('Barato; quem é fiel valoriza a honestidade.', 'Cheap; the loyal crowd values honesty.'), apply: (s, _r, c) => cancelChoice(s, String(c.fx), String(c.wid), 'promote', '') },
    { id: 'silent', label: l('Não dizer nada e torcer', 'Say nothing and hope'), hint: l('Reembolsos, imprensa ruim, memória ferida.', 'Refunds, bad press, a bruised memory.'), apply: (s, _r, c) => cancelChoice(s, String(c.fx), String(c.wid), 'silent', '') },
  ],
};

function rollCancel(s: GameState, f: OwnFestival, x: F12): void {
  x.cyc.cancelRolled = true;
  const guests = Object.values(x.deals).filter((d) => !isMine(s, d.actId)).sort((a, b) => b.time - a.time || (s.acts[b.actId]?.fame ?? 0) - (s.acts[a.actId]?.fame ?? 0));
  if (guests.length < 3 || f.lineup.length < 3) return;
  const r = own(s, `cancel:${f.id}`);
  const top = s.acts[guests[0].actId];
  if (!top || !r.chance(0.1 + (top.fame >= 60 ? 0.05 : 0))) return;
  const next = s.acts[guests[1].actId];
  const star = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && !isMine(s, a.id) && !f.lineup.some((y) => y.actId === a.id) && Math.abs(a.fame - top.fame) <= 15 && a.fame <= f.rep + 45).sort((a, b) => b.fame - a.fame)[0];
  emitEvent(s, r, CANCEL.id, { fx: f.id, fest: f.name, who: top.name, wid: top.id, next: next?.name ?? '—', star: star?.name ?? next?.name ?? '—', sid: star?.id ?? '', fee: star ? Math.round(guestFee(s, star) * 1.6) : 0, sold: x.cyc.sold });
}

export function cancelChoice(s: GameState, fid: string, wid: string, how: 'star' | 'promote' | 'silent', sid: string): void {
  const f = festOf(s, fid);
  if (!f) return;
  const x = f12(s, f);
  const d = x.deals[wid];
  if (!d) return;
  const who = s.acts[wid]?.name ?? '?';
  if (d.adv) pay(s, f, d.adv, `cxl:${wid}`, `${f.name}: adiantamento devolvido por ${who}`);
  f.lineup = f.lineup.filter((y) => y.actId !== wid);
  delete x.deals[wid];
  const star = sid ? s.acts[sid] : undefined;
  const nonLoyal = Math.max(0, x.cyc.sold - x.loyal);
  const tk = money(s, proj12(s, f).avg);
  const refund = (n: number, why: L) => { n = Math.min(x.cyc.sold, Math.round(n)); if (n <= 0) return; x.cyc.sold -= n; pay(s, f, -n * tk, `rf:${how}`, `${f.name}: reembolsos`); x.cyc.notes.push(fmtL(why, { n })); };
  if (how === 'star' && star) {
    const fee = Math.round(guestFee(s, star) * 1.6);
    f.lineup.push({ actId: star.id, fee });
    const adv = Math.round(money(s, fee) * 0.5);
    x.deals[star.id] = { actId: star.id, stage: d.stage, time: d.time, len: d.len, excl: false, tech: techOf(star), adv };
    pay(s, f, -adv, `star:${star.id}`, `${f.name}: ${star.name} às pressas (50% adiantado)`);
    x.cyc.notes.push(fmtL(l('{w} cancelou; {a} entrou às pressas por cachê 60% acima do normal. A procura se manteve.', '{w} cancelled; {a} stepped in for a fee 60% above normal. Demand held.'), { w: who, a: star.name }));
  } else if (how === 'promote' || how === 'star') {
    const next = Object.values(x.deals).sort((a, b) => b.time - a.time || (s.acts[b.actId]?.fame ?? 0) - (s.acts[a.actId]?.fame ?? 0))[0];
    if (next) { const o = Object.values(x.deals).find((y) => y.stage === d.stage && y.time === d.time); if (!o) { next.stage = d.stage; next.time = d.time; } }
    pay(s, f, -Math.round(x.cyc.sold * tk * 0.12), 'comp', `${f.name}: compensação (desconto na próxima edição e bebida)`);
    x.cyc.hype *= 0.88;
    x.loyal = Math.round(x.loyal * 1.05);
    refund(nonLoyal * 0.1, l('{n} pediram reembolso mesmo com a compensação.', '{n} asked for refunds even with the compensation.'));
    x.cyc.notes.push(fmtL(l('{w} cancelou; você promoveu {n} e compensou o público. Os fiéis gostaram da honestidade (procura −12%).', '{w} cancelled; you promoted {n} and compensated buyers. Loyalists liked the honesty (demand −12%).'), { w: who, n: next ? s.acts[next.actId]?.name ?? '—' : '—' }));
  } else {
    x.cyc.hype *= 0.8;
    x.loyal = Math.round(x.loyal * 0.85);
    f.rep = clamp(f.rep - 6, 0, 100);
    refund(nonLoyal * 0.25, l('Silêncio sobre o cancelamento: {n} reembolsos e imprensa ruim.', 'Silence about the cancellation: {n} refunds and bad press.'));
  }
  remember(s, 'festival12', fmtL(l('{f}: {w} cancela às vésperas.', '{f}: {w} cancels on the eve.'), { f: f.name, w: who }), { important: true });
}

// ---------------------------------------------------------------- a edição

const VERD: Record<Verdict, L> = { legend: l('Lendário', 'Legendary'), ok: l('Bom', 'Solid'), flop: l('Fracasso', 'Flop'), disaster: l('Desastre', 'Disaster') };

function grow(f: OwnFestival): void {
  const nw = Math.min(24, f.w + 2), nh = Math.min(12, f.h + 1);
  if (nw === f.w && nh === f.h) return;
  const g: FestTile[] = new Array(nw * nh).fill('');
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) g[y * nw + x] = f.grid[y * f.w + x];
  Object.assign(f, { grid: g, w: nw, h: nh });
}

function reset(s: GameState, f: OwnFestival, x: F12): void {
  f.nextYear = x.cyc.year + 1;
  f.lineup = f.lineup.filter((y) => isMine(s, y.actId));
  for (const k of Object.keys(x.deals)) if (!f.lineup.some((y) => y.actId === k)) delete x.deals[k];
  x.cyc = fresh(f.nextYear);
}

export function runEdition12(s: GameState, f: OwnFestival): Hist | null {
  const x = f12(s, f);
  const v = ventureOf(s, f.id);
  const c = countTiles(f);
  const m = festModel(s, f);
  const acts = actsOf(s, f);
  if (!m.stages || !c.gate || !acts.length) {
    if (x.cyc.sold) pay(s, f, -x.cyc.cash, 'refund-all', `${f.name}: edição cancelada, reembolso total`);
    f.rep = clamp(f.rep - 5, 0, 100);
    x.loyal = Math.round(x.loyal * 0.7);
    notify(s, fmtL(l('{f}: edição cancelada — falta palco, acesso ou line-up.', '{f}: edition cancelled — missing stage, gate or line-up.'), { f: f.name }), 'bad');
    reset(s, f, x);
    return null;
  }
  const r = own(s, `ed:${f.id}`);
  const p = proj12(s, f);
  const why: L[] = [...x.cyc.notes];
  const door = Math.round(Math.max(0, Math.min(p.cap - x.cyc.sold, (p.demand - x.cyc.sold) * 0.55)));
  const att = Math.max(0, Math.min(p.cap, x.cyc.sold + door));
  if (x.cyc.early) why.push(fmtL(l('{n} compraram no early bird, antes de saber o line-up.', '{n} bought early bird before knowing the line-up.'), { n: x.cyc.early }));
  if (door) why.push(fmtL(l('{n} compraram na porta.', '{n} bought at the door.'), { n: door }));
  const A = Math.max(1, att);
  const rt = { toilet: Math.min(1, (c.toilet * 800) / A), food: Math.min(1, (c.food * 1500 + c.bar * 500) / A), camp: f.days > 1 ? Math.min(1, (c.camp * 1500) / (A * 0.6)) : 1, sec: Math.min(1, (c.security * 2500) / A), med: Math.min(1, (c.medic * 10000) / A), gate: att / Math.max(1, c.gate * 7000) };
  const top = acts.reduce((t, a) => Math.max(t, a.fame), 0);
  const avg = acts.reduce((t, a) => t + a.fame, 0) / acts.length;
  const cl = clashes12(s, f);
  why.push(...cl.why);
  const md = x.cyc.mods;
  let ex = 15 + top * 0.45 + avg * 0.2 + c.stage * 5 + Math.min(10, acts.length * 1.5) + cl.ex + md.ex;
  if (x.ident === 'discovery' && acts.filter((a) => a.fame < 35).length >= 3) { ex += 5; why.push(l('Descobertas no line-up: o público saiu falando de nomes novos.', 'Discoveries on the bill: people left talking about new names.')); }
  if (x.ident === 'genre') { const off = acts.filter((a) => familyOf(a.genre) !== x.fam).length; ex -= off * 3; if (off) why.push(fmtL(l('{n} atração(ões) fora do gênero: os puristas reclamaram.', '{n} off-genre act(s): purists complained.'), { n: off })); }
  let co = 100 * (rt.toilet * 0.35 + rt.food * 0.35 + rt.camp * 0.3) - (rt.gate > 0.9 ? 8 : 0) + cl.co + md.co;
  if (x.cyc.packages && co < 60) { co -= 5; why.push(l('Pacotes VIP vendidos sem conforto à altura: reclamação dos pagantes.', 'VIP packages sold without matching comfort: paying guests complained.')); }
  let sa = 100 * (rt.sec * 0.7 + rt.med * 0.3) + md.sa;
  let disaster: L | undefined;
  let fine = 0;
  if (sa < 55 && r.chance(clamp(0.15 + md.risk + (rt.gate > 0.95 ? 0.15 : 0), 0, 0.85))) {
    disaster = l('Superlotação: grades derrubadas e feridos na frente do palco.', 'Overcrowding: barriers down and people injured in front of the stage.');
    fine = money(s, 15000) + Math.round(att * money(s, 0.5));
    sa -= 20;
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
  }
  ex = Math.round(clamp(ex, 0, 100)); co = Math.round(clamp(co, 0, 100)); sa = Math.round(clamp(sa, 0, 100));
  const w = x.ident === 'family' ? [0.3, 0.3, 0.4] : x.ident === 'premium' ? [0.35, 0.4, 0.25] : [0.45, 0.25, 0.3];
  const rating = Math.round(ex * w[0] + co * w[1] + sa * w[2]);
  // dinheiro do dia
  const d = f.days;
  const extras = (Math.min(att, c.food * 1500) * money(s, 9) + Math.min(att, c.bar * 1500) * money(s, 7) * 0.6) * d + Math.min(att, c.merch * 4000) * money(s, 4) * (0.3 + 0.7 * acts.filter((a) => isMine(s, a.id)).length / acts.length);
  const doorRev = door * money(s, p.avg) * 1.15;
  const fees = f.lineup.reduce((t, y) => t + money(s, y.fee) - (x.deals[y.actId]?.adv ?? 0), 0);
  const struct = x.cyc.supplied ? 0 : structCost(s, f);
  pay(s, f, doorRev + extras, `ed:${x.cyc.year}:rev`, `${f.name} ${x.cyc.year}: porta, bar e comida`);
  pay(s, f, -(fees + struct + fine), `ed:${x.cyc.year}:cost`, `${f.name} ${x.cyc.year}: cachês e produção`);
  for (const sp of x.cyc.sponsors) {
    const cm = x.commits.find((y) => !y.done && y.kind === 'sponsor' && y.min && y.what.pt.startsWith(sp.name));
    if (cm && att < sp.min) { cm.amt = Math.round(cm.amt * 0.5); why.push(fmtL(l('{n} cortou metade da 2ª parcela: público abaixo da meta ({m}).', '{n} cut the 2nd instalment in half: crowd below target ({m}).'), { n: sp.name, m: sp.min })); }
    if (SPONS[sp.k].clash?.includes(x.ident)) { x.loyal *= 0.92; why.push(fmtL(l('A marca {n} destoou da identidade: fiéis −8%.', 'The {n} brand clashed with the identity: loyalists −8%.'), { n: sp.name })); }
  }
  const spon = x.cyc.sponsors.reduce((t, sp) => t + sp.total, 0);
  const tiles = m.costs.tiles + m.costs.production;
  const profit = Math.round(x.cyc.cash + doorRev + extras + spon - f.lineup.reduce((t, y) => t + money(s, y.fee), 0) - tiles - fine);
  // artistas
  for (const a of acts) {
    const e = f.lineup.find((y) => y.actId === a.id);
    if (!isMine(s, a.id)) { a.cash += money(s, e?.fee ?? 0); a.fans.casual += Math.round(att * 0.02); continue; }
    const boost = x.ident === 'discovery' && a.fame < 35 ? 2 : 1;
    a.fans.casual += Math.round(att * 0.08 * (ex / 70) * boost);
    a.fans.active += Math.round(att * 0.015 * (ex / 70) * boost);
    a.fame = clamp(a.fame + 1 + ex / 100, 0, 100);
    a.momentum = clamp(a.momentum + 3, 0, 100);
    s.player.stats.festivals += 1;
  }
  // memória do público: quem volta pelo festival
  const share = clamp((rating - 45) / 150, -0.15, 0.25) * IDENTS[x.ident].loyalF;
  x.loyal = Math.round(clamp((x.loyal * 0.85 + att * share) * md.loyal * (disaster ? 0.7 : 1), 0, p.cap));
  const loyalShare = att ? Math.min(1, x.loyal / att) : 0;
  why.push(fmtL(l('Memória: {n} pessoas já vêm pelo festival ({p}% do público).', 'Memory: {n} people now come for the festival ({p}% of the crowd).'), { n: x.loyal, p: Math.round(loyalShare * 100) }));
  // identidade -> reputação
  const rep = s.player.reputation;
  if (x.ident === 'discovery') rep.artistic = clamp(rep.artistic + (rating - 50) / 20, 0, 100);
  if (x.ident === 'family') rep.institutional = clamp(rep.institutional + (sa - 50) / 30, 0, 100);
  if (x.ident === 'premium' || x.ident === 'mega') rep.commercial = clamp(rep.commercial + (rating - 50) / 20, 0, 100);
  if (x.ident === 'genre') { const k = `${f.cityId}:${acts.find((a) => familyOf(a.genre) === x.fam)?.genre ?? ''}`; if (s.scenes[k] !== undefined) s.scenes[k] = Math.min(100, s.scenes[k] + rating / 25); }
  const fill = att / Math.max(1, p.cap);
  const verdict: Verdict = disaster ? 'disaster' : rating >= 78 && fill >= 0.85 ? 'legend' : rating < 45 || fill < 0.35 ? 'flop' : 'ok';
  const cult = !disaster && profit > 0 && rating >= 65 && loyalShare >= 0.4 && p.cap <= 25000;
  const tag = cult && verdict !== 'legend' ? l('Pequeno e respeitado', 'Small and respected') : VERD[verdict];
  if (cult) { rep.artistic = clamp(rep.artistic + 1.5, 0, 100); why.push(l('Pequeno, lucrativo e com público fiel: isso também é sucesso.', 'Small, profitable and with a loyal crowd: that is success too.')); }
  f.rep = Math.round(clamp(f.rep + (rating - 55) / 3 - (disaster ? 15 : 0) + (cult ? 3 : 0), 0, 100));
  if (rating >= 60 && !disaster) grow(f);
  // registro (mesmo festival nas duas telas)
  const head = acts.slice().sort((a, b) => (x.deals[b.id]?.time ?? 0) - (x.deals[a.id]?.time ?? 0) || b.fame - a.fame)[0];
  const th: { text: L; tone: FestThought['tone'] }[] = [];
  if (rt.toilet < 0.7) th.push({ text: l('Fila do banheiro enorme!', 'The toilet queue is huge!'), tone: 'bad' });
  if (cl.why.length) th.push({ text: l('Tive que escolher entre dois shows…', 'I had to choose between two shows…'), tone: 'bad' });
  if (x.cyc.early) th.push({ text: l('Comprei no escuro e não me arrependi.', 'Bought blind and no regrets.'), tone: rating >= 55 ? 'good' : 'neutral' });
  if (loyalShare > 0.4) th.push({ text: l('Venho todo ano, nem olho o line-up.', 'I come every year, I don\'t even check the line-up.'), tone: 'good' });
  for (const o of x.cyc.ops) if (o.c) th.push({ text: OPS[o.k].opts.find((y) => y.id === o.c)!.why, tone: o.c === OPS[o.k].opts.at(-1)!.id ? 'bad' : 'neutral' });
  if (ex >= 70) th.push({ text: l('Melhor show da vida!', 'Best show of my life!'), tone: 'good' });
  if (head) th.push({ text: fmtL(l('{a} fechando a noite foi surreal!', '{a} closing the night was unreal!'), { a: head.name }), tone: ex >= 50 ? 'good' : 'neutral' });
  if (disaster) th.push({ text: l('Socorro, a grade caiu!', 'Help, the barrier fell!'), tone: 'bad' });
  const free: { x: number; y: number }[] = [];
  f.grid.forEach((t, i) => { if (!t) free.push({ x: i % f.w, y: Math.floor(i / f.w) }); });
  const thoughts: FestThought[] = th.slice(0, 10).map((t0, i) => ({ ...t0, ...(free[(i * 7) % Math.max(1, free.length)] ?? { x: 0, y: 0 }) }));
  const weather = x.cyc.ops.some((o) => o.k === 'storm') ? 'storm' : x.cyc.ops.some((o) => o.k === 'rain') ? 'rain' : 'sun';
  const ed: FestEdition = { year: x.cyc.year, attendance: att, capacity: p.cap, demand: p.demand, excitement: ex, safety: sa, comfort: co, rating, queueMin: Math.round(5 + Math.max(0, A / Math.max(1, c.toilet * 800) - 1) * 20), revenue: Math.round(x.cyc.cash + doorRev + extras + spon), costs: Math.round(x.cyc.cash + doorRev + extras + spon - profit), weather, disaster, thoughts, lineup: acts.map((a) => a.name), grew: rating >= 60 && !disaster };
  f.editions.push(ed);
  if (f.editions.length > 12) f.editions.splice(0, f.editions.length - 12);
  const h: Hist = { y: x.cyc.year, crowd: att, cap: p.cap, loyal: x.loyal, early: x.cyc.early, rating, profit, head: head?.name ?? '—', ident: x.ident, tag, why };
  x.hist.push(h);
  if (x.hist.length > 30) x.hist.shift();
  if (v) { v.editions!.push({ y: x.cyc.year, crowd: att, profit, verdict, head: h.head }); if (v.editions!.length > 30) v.editions!.shift(); v.rep = f.rep; v.lineup = []; }
  bump(s, 'festEditions');
  if (rating >= 60 && !disaster) bump(s, 'festGood');
  if (disaster) bump(s, 'festDisasters');
  bump(s, 'festPeople', att);
  const text = fmtL(l('{f} {y}: {n} pessoas, nota {r} — {t}.', '{f} {y}: {n} people, rating {r} — {t}.'), { f: f.name, y: x.cyc.year, n: att, r: rating, t: tag });
  remember(s, 'own_festival', text, { important: !!disaster || verdict === 'legend' || cult || x.hist.length === 1 });
  notify(s, text, disaster || verdict === 'flop' ? 'bad' : 'good');
  queueCutscene(s, 'festivalDay', { title: fmtL(l('{f} {y}', '{f} {y}'), { f: f.name, y: x.cyc.year }), festId: f.id, year: x.cyc.year });
  reset(s, f, x);
  return h;
}

// ---------------------------------------------------------------- ganchos

function festMonth(s: GameState): void {
  sync12(s);
  for (const f of liveOf(s).fests.slice()) {
    const x = f12(s, f);
    if (x.cyc.year !== f.nextYear) x.cyc.year = f.nextYear;
    payCommits(s, f, x);
    const mu = muOf(s, f);
    if (mu <= 0) {
      if (!x.cyc.opsOn) startOps(s, f, x);
      // o mês do festival terminou sem resposta: as decisões seguem o padrão
      if (f12(s, f).cyc === x.cyc && x.cyc.opsOn) for (const d of s.decisions.filter((y) => y.eventId.startsWith('f12_op_') && y.ctx.fx === f.id)) resolveDecision(s, d.id, d.defaultOption);
      if (f12(s, f).cyc === x.cyc && x.cyc.opsOn) { for (const o of x.cyc.ops) if (!o.c) chooseOp(s, f.id, o.k, OPS[o.k].opts.at(-1)!.id); if (f12(s, f).cyc === x.cyc) runEdition12(s, f); }
      continue;
    }
    const r = own(s, `m:${f.id}`);
    if (mu <= 10 && mu >= 2 && x.cyc.offers.length < 2 && r.chance(0.45)) { const o = sponsorOffer(s, r, f, x); if (o) { x.cyc.offers.push(o); notify(s, fmtL(l('{f}: {n} quer patrocinar ({k}).', '{f}: {n} wants to sponsor ({k}).'), { f: f.name, n: o.name, k: SPONS[o.k].name }), 'info'); } }
    if (mu === 1) x.cyc.offers = [];
    if (mu <= 3) supplyDeals(s, f, x);
    if (mu <= 2 && x.cyc.phase !== 'onsale' && f.lineup.length) { x.cyc.phase = 'onsale'; x.cyc.lot = 1; x.cyc.late = true; }
    salesMonth(s, f, x);
    if (mu === 1 && !x.cyc.cancelRolled) rollCancel(s, f, x);
  }
}

// o festival da semana do evento: decisões de operação aparecem com o festival em andamento
registerSimHook('week', 'fest12-week', (s) => {
  if (s.week - s.clock.monthStartWeek < 1) return;
  for (const f of liveOf(s).fests) { const x = f12(s, f); if (muOf(s, f) === 0 && !x.cyc.opsOn) startOps(s, f, x); }
});
// substitui o gancho antigo do festival de terreno (mesma posição na ordem dos ganchos)
registerSimHook('month', 'live-festival', (s) => festMonth(s));
deferEvents([...OP_EVENTS, CANCEL]);

