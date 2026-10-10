// Rodada 17 (F) — Comprar e operar casas de shows reais (clubes e teatros; estádios e arenas públicas não estão
// à venda). Cada casa tem lotação, prestígio e "alma" (gênero). Você escolhe a linha de programação
// (curadoria, comercial, aluguel ou residência de um artista seu) e o preço do ingresso; a casa enche pela
// reputação, pela cena local (s.scenes) e por quem toca. Receita = porta + bar (rebate de A&B) − cachês −
// manutenção. Curadoria constrói reputação e às vezes revela alguém (noite lendária: o ato vira observado e
// confia em você); comercial dá caixa e desgasta a reputação; atrasar a manutenção dá fiscalização (multa).
// Se a casa real fechou na história e é sua, ela sobrevive — e isso vira legado. Gerador próprio por mês.

import { Rng, clamp } from '../../core/rng';
import { FAMILIES, cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post, remember } from '../util';

export interface VDef { id: string; name: string; city: string; cap: number; from: number; to?: number; prestige: number; price: number; fam: string; buyable?: false; note?: L }
export const VENUES17: VDef[] = [
  { id: 'vanguard', name: 'Village Vanguard', city: 'new_york', cap: 125, from: 1935, prestige: 85, price: 90000, fam: 'blues_jazz' },
  { id: 'apollo', name: 'Apollo Theater', city: 'new_york', cap: 1500, from: 1934, prestige: 90, price: 900000, fam: 'rnb' },
  { id: 'ryman', name: 'Ryman Auditorium', city: 'nashville', cap: 2300, from: 1943, prestige: 88, price: 1100000, fam: 'country_folk' },
  { id: 'olympia', name: "L'Olympia", city: 'paris', cap: 2000, from: 1920, prestige: 88, price: 1000000, fam: 'pop' },
  { id: 'troubadour', name: 'The Troubadour', city: 'los_angeles', cap: 500, from: 1957, prestige: 70, price: 160000, fam: 'country_folk' },
  { id: 'cavern', name: 'The Cavern Club', city: 'liverpool', cap: 350, from: 1957, to: 1973, prestige: 75, price: 70000, fam: 'rock' },
  { id: 'marquee', name: 'The Marquee', city: 'london', cap: 700, from: 1958, to: 2008, prestige: 78, price: 220000, fam: 'rock' },
  { id: 'preservation', name: 'Preservation Hall', city: 'new_orleans', cap: 100, from: 1961, prestige: 80, price: 60000, fam: 'blues_jazz' },
  { id: 'whisky', name: 'Whisky a Go Go', city: 'los_angeles', cap: 500, from: 1964, prestige: 75, price: 200000, fam: 'rock' },
  { id: 'fillmore', name: 'The Fillmore', city: 'san_francisco', cap: 1300, from: 1965, prestige: 82, price: 450000, fam: 'rock' },
  { id: 'canecao', name: 'Canecão', city: 'rio', cap: 3000, from: 1967, to: 2010, prestige: 80, price: 600000, fam: 'brazil' },
  { id: 'paradiso', name: 'Paradiso', city: 'amsterdam', cap: 1500, from: 1968, prestige: 78, price: 500000, fam: 'rock' },
  { id: 'first_ave', name: 'First Avenue', city: 'minneapolis', cap: 1500, from: 1970, prestige: 72, price: 400000, fam: 'rock' },
  { id: 'cbgb', name: 'CBGB', city: 'new_york', cap: 350, from: 1973, to: 2006, prestige: 80, price: 120000, fam: 'rock' },
  { id: 'loft', name: 'Shinjuku Loft', city: 'tokyo', cap: 500, from: 1976, prestige: 65, price: 250000, fam: 'rock' },
  { id: 'studio54', name: 'Studio 54', city: 'new_york', cap: 2000, from: 1977, to: 1986, prestige: 82, price: 800000, fam: 'electronic' },
  { id: 'shrine', name: 'Afrika Shrine', city: 'lagos', cap: 2000, from: 1977, prestige: 76, price: 120000, fam: 'africa' },
  { id: 'nine30', name: '9:30 Club', city: 'washington', cap: 1200, from: 1980, prestige: 70, price: 350000, fam: 'rock' },
  { id: 'bluenote', name: 'Blue Note', city: 'new_york', cap: 200, from: 1981, prestige: 82, price: 300000, fam: 'blues_jazz' },
  { id: 'circo', name: 'Circo Voador', city: 'rio', cap: 2500, from: 1982, prestige: 74, price: 300000, fam: 'brazil' },
  { id: 'hacienda', name: 'The Haçienda', city: 'manchester', cap: 1500, from: 1982, to: 1997, prestige: 80, price: 350000, fam: 'electronic' },
  { id: 'aeroanta', name: 'Aeroanta', city: 'sao_paulo', cap: 1000, from: 1985, to: 1995, prestige: 65, price: 150000, fam: 'rock' },
  { id: 'corner', name: 'Corner Hotel', city: 'melbourne', cap: 800, from: 1995, prestige: 62, price: 300000, fam: 'rock' },
  { id: 'berghain', name: 'Berghain', city: 'berlin', cap: 1500, from: 2004, prestige: 85, price: 900000, fam: 'electronic' },
  // não estão à venda (estádios/arenas, patrimônio público)
  { id: 'msg', name: 'Madison Square Garden', city: 'new_york', cap: 20000, from: 1925, prestige: 95, price: 0, fam: 'pop', buyable: false, note: l('arena de uma corporação esportiva: não se vende', 'a sports corporation arena: not for sale') },
  { id: 'maracana', name: 'Maracanã', city: 'rio', cap: 150000, from: 1950, prestige: 95, price: 0, fam: 'pop', buyable: false, note: l('estádio público', 'public stadium') },
  { id: 'wembley', name: 'Wembley', city: 'london', cap: 80000, from: 1923, prestige: 95, price: 0, fam: 'pop', buyable: false, note: l('estádio nacional', 'national stadium') },
  { id: 'budokan', name: 'Nippon Budokan', city: 'tokyo', cap: 14000, from: 1964, prestige: 92, price: 0, fam: 'pop', buyable: false, note: l('arena de artes marciais, patrimônio', 'martial-arts hall, heritage site') },
];
export const vdef = (id: string) => VENUES17.find((x) => x.id === id);

export type Policy = 'curated' | 'commercial' | 'rental' | 'residency';
export type PriceK = 'low' | 'mid' | 'high';
export const POLICY: Record<Policy, { name: L; desc: L; nights: number; rep: number; fee: number }> = {
  curated: { name: l('Curadoria', 'Curated'), desc: l('Você escolhe quem toca: artistas da cena, apostas. Constrói reputação; às vezes revela alguém.', 'You pick who plays: scene acts, bets. Builds reputation; sometimes reveals someone.'), nights: 14, rep: 0.8, fee: 1 },
  commercial: { name: l('Comercial', 'Commercial'), desc: l('Covers, festas e nomes certos: casa cheia, reputação cai.', 'Tribute nights, parties and safe names: full house, reputation drops.'), nights: 20, rep: -0.6, fee: 0.8 },
  rental: { name: l('Aluguel', 'Rental'), desc: l('Promotores alugam as datas: renda fixa, pouca alma.', 'Promoters rent the dates: fixed income, little soul.'), nights: 16, rep: -0.2, fee: 0 },
  residency: { name: l('Residência de um artista seu', 'Residency for one of your acts'), desc: l('Um ato seu toca toda semana: fama local, fãs fiéis, cansaço baixo.', 'One of your acts plays every week: local fame, loyal fans, low fatigue.'), nights: 8, rep: 0.3, fee: 0 },
};
export const PRICE: Record<PriceK, { name: L; mult: number; occ: number }> = { low: { name: l('Barato', 'Cheap'), mult: 0.7, occ: 1.15 }, mid: { name: l('Normal', 'Normal'), mult: 1, occ: 1 }, high: { name: l('Caro', 'Pricey'), mult: 1.45, occ: 0.78 } };

export interface Own17 { id: string; rep: number; policy: Policy; price: PriceK; actId?: string; cond: number; maint: boolean; y: number; paid: number; booked: string[]; last?: { att: number; net: number; nights: number; why: L[] }; total: number; saved?: 1 }
export interface V17 { own: Own17[]; log: { y: number; m: number; t: L }[] }
declare module '../ext4' { interface Ext4 { venues17: V17 } }
registerExt4('venues17', () => ({ own: [], log: [] }));
export const v17 = (s: GameState): V17 => { const x = s.x4 as unknown as { venues17?: V17 }; return (x.venues17 ??= { own: [], log: [] }); };
const log = (s: GameState, t: L) => { const st = v17(s); st.log.unshift({ y: s.year, m: s.month, t }); if (st.log.length > 30) st.log.pop(); };

export const venueOpen = (s: GameState, d: VDef) => s.year >= d.from && (!d.to || s.year <= d.to || v17(s).own.some((o) => o.id === d.id));
/** Força da cena da 'alma' da casa na cidade (maior gênero da família). */
export function sceneFam(s: GameState, city: string, fam: string): number {
  let m = 0;
  for (const [k, v] of Object.entries(s.scenes)) { const i = k.indexOf(':'); if (k.slice(0, i) === city && familyOf(k.slice(i + 1)) === fam && v > m) m = v; }
  return m;
}
export function venuePrice(s: GameState, d: VDef): number { return money(s, d.price * (0.8 + Math.min(30, sceneFam(s, d.city, d.fam)) / 60)); }
export const marketVenues = (s: GameState): VDef[] => VENUES17.filter((d) => venueOpen(s, d));

export function buyVenue17(s: GameState, id: string): L | null {
  const d = vdef(id);
  if (!d || !venueOpen(s, d)) return l('Casa indisponível.', 'Venue unavailable.');
  if (d.buyable === false) return fmtL(l('Não está à venda: {w}.', 'Not for sale: {w}.'), { w: d.note ?? '' });
  const st = v17(s);
  if (st.own.some((o) => o.id === id)) return l('Já é sua.', 'Already yours.');
  if (st.own.length >= 4) return l('Quatro casas é o máximo que dá para administrar.', 'Four venues is as many as you can run.');
  const p = venuePrice(s, d);
  if (s.player.cash < p) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `v17buy:${id}`, -p, 'investments', `Compra: ${d.name}`);
  st.own.push({ id, rep: d.prestige * 0.7, policy: 'curated', price: 'mid', cond: 80, maint: true, y: s.year, paid: p, booked: [], total: 0 });
  const t = fmtL(l('{c} compra {v} ({city}).', '{c} buys {v} ({city}).'), { c: s.config.companyName, v: d.name, city: cityById[d.city]?.name ?? d.city });
  log(s, t);
  remember(s, 'venue17', t, { important: true });
  emitFact(s, { kind: 'venue_event', actors: ['player'], place: d.city, severity: 50, visibility: 'public', tags: ['deal', 'venue'], text: t, src: 'venues17' });
  return null;
}
export const sellValue = (s: GameState, o: Own17): number => { const d = vdef(o.id)!; return Math.round(venuePrice(s, d) * (0.6 + o.rep / 200) * (o.cond / 100 * 0.4 + 0.6)); };
export function sellVenue17(s: GameState, id: string): L | null {
  const st = v17(s), o = st.own.find((x) => x.id === id);
  if (!o) return l('Inválido.', 'Invalid.');
  const v = sellValue(s, o);
  post(s, `v17sell:${id}`, v, 'asset_sales', `Venda: ${vdef(id)!.name}`);
  st.own = st.own.filter((x) => x !== o);
  log(s, fmtL(l('{v} vendida por {p}.', '{v} sold for {p}.'), { v: vdef(id)!.name, p: `$${Math.round(v / 100).toLocaleString('en-US')}` }));
  return null;
}
export function setVenue17(s: GameState, id: string, p: Partial<Pick<Own17, 'policy' | 'price' | 'actId' | 'maint'>>): void {
  const o = v17(s).own.find((x) => x.id === id);
  if (!o) return;
  Object.assign(o, p);
  if (o.policy !== 'residency') o.actId = undefined;
}

/** Quem tocaria aqui: atos locais (ou do gênero da casa) por fama e potencial; seus primeiro na residência. */
function bookable(s: GameState, d: VDef): Act[] {
  return Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging') && a.members.length && (a.city === d.city || familyOf(a.genre) === d.fam) && a.fame < Math.max(40, d.cap / 40 + 30))
    .sort((a, b) => (b.city === d.city ? 10 : 0) + b.potential * 0.3 + b.fame - ((a.city === d.city ? 10 : 0) + a.potential * 0.3 + a.fame)).slice(0, 12);
}

/** Estimativa do mês (a mesma conta do fechamento, sem sorteio). */
export function monthEst17(s: GameState, o: Own17): { att: number; net: number; nights: number; door: number; bar: number; fees: number; upkeep: number; why: L[] } {
  const d = vdef(o.id)!;
  const P = POLICY[o.policy], pr = PRICE[o.price];
  const scene = sceneFam(s, d.city, d.fam);
  const res = o.actId ? s.acts[o.actId] : undefined;
  const pull = o.policy === 'residency' && res ? clamp(0.35 + res.fame / 120, 0.3, 1.1) : o.policy === 'commercial' ? 0.6 : o.policy === 'rental' ? 0.7 : 0.5 + o.rep / 140;
  const occ = clamp(pull * pr.occ * (0.75 + Math.min(0.35, scene / 40)) * (0.7 + o.cond / 330) * (0.85 + d.prestige / 500), 0.08, 1);
  const nights = P.nights;
  const att = Math.round(d.cap * occ * nights);
  const ticket = money(s, 4 + d.prestige / 12) * pr.mult;
  const door = o.policy === 'rental' ? money(s, d.cap * 1.4) * nights : Math.round(att * ticket);
  const bar = Math.round(att * money(s, 1.2) * (o.policy === 'commercial' ? 1.3 : 1));
  const fees = o.policy === 'rental' || o.policy === 'residency' ? 0 : Math.round(door * 0.7 * P.fee);
  const upkeep = Math.round((money(s, d.cap * 12 + 3000) + nights * money(s, d.cap * 1.2) * (o.policy === 'rental' ? 0.5 : 1)) * (o.maint ? 1 : 0.6));
  const why: L[] = [
    fmtL(l('Ocupação {p}% ({pol}, ingresso {pr})', 'Occupancy {p}% ({pol}, {pr} tickets)'), { p: Math.round(occ * 100), pol: P.name, pr: pr.name }),
    fmtL(l('Cena de {f} na cidade: {sc}', '{f} scene in town: {sc}'), { f: FAMILIES.find((x) => x.id === d.fam)?.name ?? d.fam, sc: Math.round(scene) }),
  ];
  if (o.cond < 50) why.push(l('Casa malconservada afasta o público', 'A run-down room keeps people away'));
  return { att, net: door + bar - fees - upkeep, nights, door, bar, fees, upkeep, why };
}

registerSimHook('month', 'venues17', (s) => {
  const st = v17(s);
  for (const o of st.own) {
    const d = vdef(o.id);
    if (!d) continue;
    const r = Rng.fromSeed(`${s.config.seed}:v17:${o.id}:${s.year}:${s.month}`);
    const e = monthEst17(s, o);
    const net = Math.round(e.net * r.float(0.88, 1.1));
    post(s, `v17m:${o.id}:${s.month}`, net, 'live', `Casa ${d.name}`);
    o.total += net;
    o.last = { att: e.att, net, nights: e.nights, why: e.why };
    o.rep = clamp(o.rep + POLICY[o.policy].rep + (o.cond < 40 ? -0.8 : 0), 5, 100);
    o.cond = clamp(o.cond + (o.maint ? 0.5 : -2.5), 0, 100);
    const cands = bookable(s, d);
    o.booked = o.policy === 'curated' || o.policy === 'commercial' ? cands.slice(0, 4).map((a) => a.id) : o.actId ? [o.actId] : [];
    // residência: o ato ganha cena local e fãs fiéis
    if (o.policy === 'residency' && o.actId && s.acts[o.actId]) { const a = s.acts[o.actId]; a.fans.core += Math.round(e.att * 0.01); s.scenes[`${d.city}:${a.genre}`] = (s.scenes[`${d.city}:${a.genre}`] ?? 0) + 0.15; }
    // noite lendária: uma aposta da curadoria explode
    if (o.policy === 'curated' && cands.length && r.chance(0.03 + o.rep / 1500)) {
      const a = cands.filter((x) => x.owner !== 'player').sort((p, q) => q.potential - p.potential)[0];
      if (a) {
        a.fame = clamp(a.fame + 4, 0, 100); a.trust = clamp(a.trust + 10, 0, 100);
        s.knowledge[a.id] ??= { actId: a.id, degree: 2, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'venue' };
        o.rep = clamp(o.rep + 3, 0, 100);
        const t = fmtL(l('Noite lendária no {v}: {a} incendeia a casa. Todo mundo quer saber quem é — e eles confiam em você.', 'Legendary night at {v}: {a} sets the room on fire. Everyone wants to know who they are — and they trust you.'), { v: d.name, a: a.name });
        log(s, t);
        emitFact(s, { kind: 'venue_event', actors: [a.id, 'player'], place: d.city, severity: 50, visibility: 'public', tags: ['good', 'venue'], text: t, src: 'venues17' });
      }
    }
    // fiscalização quando a manutenção atrasa
    if (o.cond < 35 && r.chance(0.2)) {
      const fine = money(s, 2000 + d.cap * 4);
      post(s, `v17fine:${o.id}:${s.month}`, -fine, 'legal', `Multa: ${d.name}`);
      o.rep = clamp(o.rep - 4, 0, 100);
      const t = fmtL(l('Fiscalização interdita {v} por uma semana: saídas de emergência, fiação. Multa de {p}.', 'Inspectors shut {v} for a week: fire exits, wiring. {p} fine.'), { v: d.name, p: `$${Math.round(fine / 100).toLocaleString('en-US')}` });
      log(s, t);
      notify(s, t, 'bad');
      emitFact(s, { kind: 'venue_event', actors: ['player'], place: d.city, severity: 40, visibility: 'rumor', tags: ['bad', 'venue', 'law'], text: t, src: 'venues17' });
    }
    // sobreviveu ao fechamento histórico
    if (d.to && s.year > d.to && !o.saved) {
      o.saved = 1;
      s.player.legacy.cultural = (s.player.legacy.cultural ?? 0) + 4;
      const t = fmtL(l('{v} deveria ter fechado em {y}. Com você, segue aberta — a cena agradece.', '{v} should have closed in {y}. With you, it stays open — the scene is grateful.'), { v: d.name, y: d.to });
      log(s, t);
      emitFact(s, { kind: 'venue_event', actors: ['player'], place: d.city, severity: 55, visibility: 'public', tags: ['good', 'venue', 'legacy'], text: t, src: 'venues17' });
    }
  }
});

/** Shows de atos seus numa casa sua (para a agenda de shows). */
export const venueNights = (s: GameState) => v17(s).own.map((o) => ({ o, d: vdef(o.id)! })).filter((x) => x.d);
