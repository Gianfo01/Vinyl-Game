// Rodada 17 (F) — Agenda de shows com concorrência. Os atos de outros selos também fazem shows (gerados por
// fama, cidade e mercado), festivais têm semana marcada, e tudo vai para uma agenda comum. Mesmo cidade e
// semana = público dividido: pesa o gênero (mesma família = briga direta) e a força relativa (fama). Quem é
// bem menor que você foge da data ("mudou o show para não bater com o seu"). Festivais impõem cláusula de raio:
// tocar no festival esvazia shows no mesmo país ±6 semanas. Contra-ataque: "blitz" de divulgação corta o
// prejuízo pela metade. Extra: política de ingressos por ato (preço fixo, setorizado, dinâmico, pré-venda de
// fã-clube, ingresso nominal anti-cambista) com receita × reação dos fãs, e cambistas quando a casa esgota.
// Arquivo sem dependência de tour12/tours (eles importam daqui). Gerador próprio por semana/ato.

import { Rng } from '../../core/rng';
import { FESTIVALS } from '../../data/catalog';
import { countryOfCity } from '../../data/geo';
import { CITIES, cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { dateOfDay, fmtL, money, post } from '../util';

export interface NpcShow { a: string; c: string; w: number; cap: number; mv?: 1 }
export type Tix = 'fair' | 'tiered' | 'dynamic' | 'fanclub' | 'paperless';
export interface Cal17 { npc: NpcShow[]; upto: number; blitz: Record<string, 1>; tix: Record<string, Tix>; scalp: Record<string, number>; log: { w: number; t: L }[]; gouge: Record<string, number> }
declare module '../ext4' { interface Ext4 { cal17: Cal17 } }
const fresh = (): Cal17 => ({ npc: [], upto: 0, blitz: {}, tix: {}, scalp: {}, log: [], gouge: {} });
registerExt4('cal17', fresh);
export const cal17 = (s: GameState): Cal17 => { const x = s.x4 as unknown as { cal17?: Cal17 }; return (x.cal17 ??= fresh()); };
const logc = (s: GameState, t: L) => { const c = cal17(s); c.log.unshift({ w: s.week, t }); if (c.log.length > 30) c.log.pop(); };

export const weekOfDay = (d: number) => Math.floor((d + 1) / 7);
export const dateOfWeek = (s: GameState, w: number) => dateOfDay(s.config.startYear, w * 7);
const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging') && a.members.length > 0;
const mine = (s: GameState, a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);

// ---------------------------------------------------------------- shows do jogador e festivais

export interface PShow { actId: string; city: string; w: number; kind: 'tour' | 'booking' | 'festival'; label: string }
export function playerShows(s: GameState): PShow[] {
  const out: PShow[] = [];
  for (const t of s.tours ?? []) {
    if (t.status !== 'planned' && t.status !== 'running') continue;
    if (!mine(s, s.acts[t.actId])) continue;
    for (const st of t.stops) if (st.status === 'scheduled') out.push({ actId: t.actId, city: st.cityId, w: weekOfDay(st.day), kind: 'tour', label: t.name });
  }
  const c12 = (s.x4 as unknown as { tour12?: { shows: { actId: string; city: string; week: number; status: string }[] } }).tour12;
  for (const sh of c12?.shows ?? []) if (sh.status === 'booked' && mine(s, s.acts[sh.actId])) out.push({ actId: sh.actId, city: sh.city, w: sh.week, kind: 'booking', label: '' });
  for (const f of festWeeks(s)) for (const id of f.acts) if (mine(s, s.acts[id])) out.push({ actId: id, city: f.city, w: f.w, kind: 'festival', label: f.name });
  return out.filter((x) => x.w >= s.week - 1).sort((a, b) => a.w - b.w);
}
export interface FWeek { fi: number; name: string; city: string; w: number; acts: string[]; prestige: number }
export function festWeeks(s: GameState): FWeek[] {
  const f8 = (s.x4 as unknown as { fest8?: { editions: { fi: number; year: number; month: number; lineup: { actId: string }[]; done: boolean }[] } }).fest8;
  const out: FWeek[] = [];
  for (const e of f8?.editions ?? []) {
    const f = FESTIVALS[e.fi];
    if (!f || e.done) continue;
    const day = Math.round((Date.UTC(e.year, e.month, 15) - Date.UTC(s.config.startYear, 0, 1)) / 86400000);
    out.push({ fi: e.fi, name: f.name, city: f.city, w: weekOfDay(day), acts: e.lineup.map((x) => x.actId), prestige: f.prestige });
  }
  return out;
}

// ---------------------------------------------------------------- concorrência

export interface Clash { mult: number; why: L[]; rivals: NpcShow[]; radius?: string }
const famOv = (a: Act, b: Act) => (a.genre === b.genre ? 1.1 : familyOf(a.genre) === familyOf(b.genre) ? 1 : 0.3);
export function clashOf(s: GameState, act: Act, city: string, w: number): Clash {
  const c = cal17(s);
  const why: L[] = [];
  let pen = 0;
  const rivals = c.npc.filter((x) => x.c === city && x.w === w && x.a !== act.id);
  for (const x of rivals) {
    const b = s.acts[x.a];
    if (!live(b)) continue;
    const st = Math.pow(b.fame + 5, 1.3) / (Math.pow(b.fame + 5, 1.3) + Math.pow(act.fame + 5, 1.3));
    const p = famOv(act, b) * st * 0.35;
    pen += p;
    if (p >= 0.03) why.push(fmtL(l('{b} toca na mesma semana em {c} (−{p}%)', '{b} plays the same week in {c} (−{p}%)'), { b: b.name, c: cityById[city]?.name ?? city, p: Math.round(p * 100) }));
  }
  let radius: string | undefined;
  for (const f of festWeeks(s)) {
    if (f.city === city && f.w === w && !f.acts.includes(act.id)) { const p = 0.1 + f.prestige / 800; pen += p; why.push(fmtL(l('{f} na cidade na mesma semana (−{p}%)', '{f} in town the same week (−{p}%)'), { f: f.name, p: Math.round(p * 100) })); }
    if (f.acts.includes(act.id) && Math.abs(f.w - w) <= 6 && f.w !== w && countryOfCity(f.city) === countryOfCity(city)) { pen += 0.15; radius = f.name; why.push(fmtL(l('Cláusula de raio de {f}: o público já te viu lá (−15%)', '{f} radius clause: the crowd already saw you there (−15%)'), { f: f.name })); }
  }
  pen = Math.min(0.5, pen);
  if (pen > 0 && c.blitz[`${act.id}:${city}:${w}`]) { pen *= 0.5; why.push(l('Blitz de divulgação: metade do estrago', 'Promo blitz: half the damage')); }
  return { mult: 1 - pen, why, rivals, radius };
}
/** Fator usado pelos dois sistemas de shows (tours e agente/promotor). */
export const clash17 = (s: GameState, act: Act, city: string, w: number): number => (mine(s, act) ? clashOf(s, act, city, w).mult : 1);
export const blitzCost = (s: GameState, act: Act) => money(s, 400 + act.fame * 25);
export function blitz(s: GameState, actId: string, city: string, w: number): L | null {
  const a = s.acts[actId];
  if (!a) return l('Inválido.', 'Invalid.');
  const k = `${actId}:${city}:${w}`;
  if (cal17(s).blitz[k]) return l('Já tem blitz nessa data.', 'Already a blitz on that date.');
  const cost = blitzCost(s, a);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `blitz17:${k}`, -cost, 'marketing', `Blitz ${a.name}`);
  cal17(s).blitz[k] = 1;
  return null;
}

registerMod('showRevenue', 'clash17', (s, v, c) => {
  if (!c.act || !c.cityId || !mine(s, c.act)) return null;
  const k = clashOf(s, c.act, c.cityId, s.week);
  const t = TIX[cal17(s).tix[c.act.id] ?? 'fair'];
  const m = k.mult * (s.year >= t.from ? t.rev : 1);
  return m !== 1 ? { value: v * m, label: k.mult < 1 ? l('Concorrência na agenda', 'Calendar competition') : t.name } : null;
});

// ---------------------------------------------------------------- shows de NPC

function genWeeks(s: GameState, from: number, to: number): void {
  const c = cal17(s);
  const ps = playerShows(s);
  const acts = Object.values(s.acts).filter((a) => live(a) && !mine(s, a) && a.fame >= 30).sort((a, b) => b.fame - a.fame).slice(0, 60);
  for (let w = from; w < to; w++) {
    const r = Rng.fromSeed(`${s.config.seed}:cal17:${w}`);
    for (const a of acts) {
      const per = a.fame >= 70 ? 0.7 : a.fame >= 50 ? 0.45 : 0.25;
      if (!r.chance(per)) continue;
      const home = cityById[a.city];
      const pool = CITIES.filter((x) => x.market === home?.market);
      const city = r.chance(0.3) || !pool.length ? a.city : r.pick(pool).id;
      let ww = w, mv: 1 | undefined;
      const big = ps.find((p) => p.city === city && p.w === w && (s.acts[p.actId]?.fame ?? 0) > a.fame + 15 && familyOf(s.acts[p.actId]!.genre) === familyOf(a.genre));
      if (big) { ww = w + 1; mv = 1; }
      c.npc.push({ a: a.id, c: city, w: ww, cap: Math.round(400 + a.fame * a.fame * 2), mv });
    }
  }
  c.upto = to;
}

registerSimHook('month', 'clash17', (s, _r) => {
  const c = cal17(s);
  if (c.upto < s.week) c.upto = s.week;
  if (c.upto < s.week + 12) genWeeks(s, c.upto, s.week + 12);
  c.npc = c.npc.filter((x) => x.w >= s.week - 4);
  for (const k of Object.keys(c.blitz)) if (Number(k.split(':').pop()) < s.week - 4) delete c.blitz[k];
  // política de ingressos: reação mensal de quem tem shows
  const r = Rng.fromSeed(`${s.config.seed}:tix17:${s.year}:${s.month}`);
  const ps = playerShows(s).filter((p) => p.w < s.week + 5);
  for (const [id, tx] of Object.entries(c.tix)) {
    const a = s.acts[id];
    if (!a || !ps.some((p) => p.actId === id) || s.year < TIX[tx].from) continue;
    a.fans.core = Math.max(0, Math.round(a.fans.core * (1 + TIX[tx].fans)));
    if (tx === 'dynamic' && a.fame >= 55 && (c.gouge[id] ?? 0) < s.year && r.chance(0.35)) {
      c.gouge[id] = s.year;
      const t = fmtL(l('Fãs de {a} revoltados: ingresso "dinâmico" passou de 10× o valor de face.', '{a} fans furious: "dynamic" tickets topped 10× face value.'), { a: a.name });
      logc(s, t);
      if (a.fame >= 70) scandal(s, a.id, 'money', 30, t, { place: a.city });
      else emitFact(s, { kind: 'statement', actors: [a.id, 'player'], place: a.city, severity: 40, visibility: 'public', tags: ['bad', 'money', 'tickets'], text: t, src: 'clash17' });
    }
  }
});

// ---------------------------------------------------------------- ingressos e cambistas (extra)

export const TIX: Record<Tix, { name: L; desc: L; from: number; rev: number; fans: number }> = {
  fair: { name: l('Preço fixo', 'Flat price'), desc: l('Um preço para todos. Se esgota, cambistas ficam com a diferença.', 'One price for all. If it sells out, scalpers pocket the difference.'), from: 1900, rev: 1, fans: 0 },
  tiered: { name: l('Setorizado', 'Tiered'), desc: l('Pista, cadeira, camarote: +8% sem drama.', 'Floor, seats, boxes: +8% without drama.'), from: 1965, rev: 1.08, fans: 0 },
  fanclub: { name: l('Pré-venda do fã-clube', 'Fan-club presale'), desc: l('Os fiéis compram antes: −4% de receita, núcleo de fãs cresce.', 'The faithful buy first: −4% revenue, core fanbase grows.'), from: 1990, rev: 0.96, fans: 0.006 },
  paperless: { name: l('Ingresso nominal', 'Paperless/ID tickets'), desc: l('Sem revenda: cambista some, fila maior (−5%).', 'No resale: scalpers vanish, longer lines (−5%).'), from: 2009, rev: 0.95, fans: 0.002 },
  dynamic: { name: l('Preço dinâmico', 'Dynamic pricing'), desc: l('O algoritmo cobra o que o mercado aguenta: +22%, fãs reclamam e pode virar escândalo.', 'The algorithm charges what the market bears: +22%, fans complain and it may become a scandal.'), from: 2011, rev: 1.22, fans: -0.006 },
};
export function setTix(s: GameState, actId: string, t: Tix): void { cal17(s).tix[actId] = t; }

registerSimHook('show', 'clash17:scalp', (s, _r, arg) => {
  const sh = arg.show;
  if (!sh || !mine(s, s.acts[sh.actId])) return;
  const tx = cal17(s).tix[sh.actId] ?? 'fair';
  if ((tx === 'fair' || tx === 'tiered') && sh.sold >= sh.capacity * 0.97 && sh.capacity > 0) {
    const lost = Math.round(sh.revenue * (tx === 'fair' ? 0.35 : 0.2));
    const c = cal17(s);
    c.scalp[sh.actId] = (c.scalp[sh.actId] ?? 0) + lost;
    if (lost > money(s, 3000)) logc(s, fmtL(l('Esgotou em {c}: cambistas lucraram ~{v} com o show de {a}.', 'Sold out in {c}: scalpers made ~{v} off {a}\'s show.'), { c: cityById[sh.cityId]?.name ?? sh.cityId, v: `$${Math.round(lost / 100).toLocaleString('en-US')}`, a: s.acts[sh.actId]?.name ?? '' }));
  }
});

export const clashLog = (s: GameState) => cal17(s).log;
