// R33 · VIDA — o dono como pessoa: saúde e estresse pesam, paparazzi na mansão, rotina leve, reputação pessoal
// separada da empresa e filhos que herdam talento/interesse. Cada regra atrás do seu interruptor `exp33.*`
// (padrão DESLIGADO). Estado em `s.x4.vida33` (só aparece depois de usado). Docs: docs/r33/vida.md.
// Família Fossati fica fora: tudo aqui só olha o dono (P(s).owner) e os filhos dele (owner.kids).

import type { Rng } from '../../core/rng';
import { CITIES, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { purse } from '../r31/purse31';
import { registerSwitch, sw } from '../r31/switches';
import { P, clamp01, type Owner } from '../sys/people/state';
import type { GameState } from '../types';
import { fmtL, money, remember } from '../util';

export const SW33 = {
  saude: 'exp33.saude', paparazzi: 'exp33.paparazzi', rotina: 'exp33.rotina', rep: 'exp33.reppessoal', herdeiros: 'exp33.herdeiros',
} as const;
registerSwitch({ id: SW33.saude, def: false, scope: 'game',
  desc: l('R33 · VIDA: estresse alto do dono tira 1 de tempo livre; saúde baixa piora gravação e negociação. Desligado: como antes.',
    'R33 · LIFE: high owner stress costs 1 free time; low health hurts recording and negotiation. Off: as before.') });
registerSwitch({ id: SW33.paparazzi, def: false, scope: 'game',
  desc: l('R33 · VIDA: paparazzi na mansão do dono; muro e segurança reduzem. Desligado: sem paparazzi em casa.',
    'R33 · LIFE: paparazzi at the owner\'s mansion; a wall and security cut it. Off: none at home.') });
registerSwitch({ id: SW33.rotina, def: false, scope: 'game',
  desc: l('R33 · VIDA: rotina leve do dono (sono, viagens, hobby) com efeito pequeno no estresse. Desligado: sem rotina.',
    'R33 · LIFE: light owner routine (sleep, trips, hobby) with a small stress effect. Off: no routine.') });
registerSwitch({ id: SW33.rep, def: false, scope: 'game',
  desc: l('R33 · VIDA: reputação pessoal do dono separada da empresa (escândalo × caridade/fundação). Desligado: não existe.',
    'R33 · LIFE: the owner\'s personal reputation apart from the company (scandal vs charity/foundation). Off: absent.') });
registerSwitch({ id: SW33.herdeiros, def: false, scope: 'game',
  desc: l('R33 · VIDA: filhos do dono herdam talento e interesse dele. Desligado: aptidão sorteada como antes.',
    'R33 · LIFE: the owner\'s kids inherit talent and interest. Off: aptitude drawn as before.') });

export type Routine33 = 'sleep' | 'travel' | 'hobby';
export interface Vida33 {
  /** reputação pessoal −100..100 (0 = neutra), separada de s.player.reputation */
  rep: number;
  wall?: boolean;
  /** 0 nenhuma, 1 básica, 2 completa */
  guard: number;
  routine?: Routine33;
  /** semana do último incidente de paparazzi */
  papWeek?: number;
  foundation?: boolean;
  /** interesse (atributo) e marcação de herança por filho (índice em owner.kids) */
  kids: Record<number, { interest: 'ear' | 'negotiation' | 'charisma' | 'management' }>;
  /** semana em que o último tratamento foi feito */
  treated?: number;
}
declare module '../ext4' { interface Ext4 { vida33: Vida33 } }
registerExt4('vida33', () => ({ rep: 0, guard: 0, kids: {} }));
export function vida33(s: GameState): Vida33 {
  const x = s.x4 as unknown as { vida33?: Vida33 };
  return (x.vida33 ??= { rep: 0, guard: 0, kids: {} });
}
const on = (s: GameState, id: string): boolean => !!sw<boolean>(s, id);
const ownerP = (s: GameState): Owner | undefined => P(s).owner ?? undefined;

// ---------------------------------------------------------------- (1) saúde e estresse pesam

/** Tempo livre a menos por estresse alto (0 ou 1). Usado por `maxEnergy` (sys/life). */
export function stressDot33(s: GameState): number {
  const o = ownerP(s);
  return o && on(s, SW33.saude) && o.stress >= 75 ? 1 : 0;
}
/** Fator 0..1 de quanto a saúde baixa atrapalha (0 acima de 60; 1 em saúde 0). */
export function frail33(s: GameState): number {
  const o = ownerP(s);
  return o && on(s, SW33.saude) ? clamp01((60 - o.health) / 60, 0, 1) : 0;
}
/** Desconto no bônus de negociação do dono (soma a `ownerBonus(s,'negotiation')`). */
export const negPenalty33 = (s: GameState): number => frail33(s) * 0.6;

registerMod('songQ', 'vida33', (s, v, { act }) => {
  const f = frail33(s);
  if (!f || !act || act.owner !== 'player') return null;
  return { value: v * (1 - 0.06 * f), label: l('Saúde do dono', 'Owner health') };
});

/**
 * GANCHO para INT-2 (hospital/reabilitação): trata saúde/estresse do dono. Cobra do bolso pessoal.
 * 'checkup' (+8 saúde, −8 estresse), 'rehab' (+20 saúde, −30 estresse, 2 meses de afastamento = férias).
 */
export function treatOwner33(s: GameState, kind: 'checkup' | 'rehab', paid = false): L | null {
  const o = ownerP(s);
  if (!o) return l('Sem dono.', 'No owner.');
  const cost = money(s, kind === 'rehab' ? 6000 : 700);
  // QA33: `paid` = quem chama já cobrou (hospital da INT-2 cobra do caixa do lugar) — sem cobrança dupla
  if (!paid && o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  if (!paid) purse(s, -cost, 'leisure', kind === 'rehab' ? 'rehab33' : 'checkup33', { who: o });
  if (kind === 'rehab') { o.health = clamp01(o.health + 20); o.stress = clamp01(o.stress - 30); o.vacationUntil = s.week + 8; }
  else { o.health = clamp01(o.health + 8); o.stress = clamp01(o.stress - 8); }
  vida33(s).treated = s.week;
  return null;
}

// ---------------------------------------------------------------- (9) paparazzi, rotina, reputação pessoal

export function buildWall33(s: GameState): L | null {
  const o = ownerP(s); const v = vida33(s);
  if (!o || o.house < 0) return l('Só quem tem casa própria.', 'Only with a home of your own.');
  if (v.wall) return l('Já há muro.', 'There is already a wall.');
  const cost = money(s, 12000);
  if (o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  purse(s, -cost, 'home', 'wall33', { who: o });
  v.wall = true;
  return null;
}
export function setGuard33(s: GameState, lv: number): void { vida33(s).guard = Math.max(0, Math.min(2, Math.round(lv))); }
export function setRoutine33(s: GameState, r: Routine33 | undefined): void { vida33(s).routine = r; }

/** Chance mensal de paparazzi na casa: só mansão (prestígio ≥ 4), cortada por muro (−50%) e segurança. */
export function papChance33(s: GameState, prestige: number): number {
  const v = vida33(s);
  if (prestige < 4) return 0;
  return Math.max(0, (0.1 + prestige * 0.02) * (v.wall ? 0.5 : 1) * [1, 0.6, 0.25][v.guard]);
}
const GUARD_COST = [0, 600, 1800];
const ROUTINE: Record<Routine33, { relief: number; health: number; cost: number }> = {
  sleep: { relief: 2, health: 0.6, cost: 0 }, travel: { relief: 4, health: 0, cost: 900 }, hobby: { relief: 3, health: 0.2, cost: 200 },
};

export const repLevel33 = (s: GameState): number => (on(s, SW33.rep) ? vida33(s).rep : 0);
export function addRep33(s: GameState, d: number): void { const v = vida33(s); v.rep = Math.max(-100, Math.min(100, v.rep + d)); }
/** Caridade pontual: paga do bolso, sobe a reputação pessoal. */
export function donate33(s: GameState, realDollars: number): L | null {
  const o = ownerP(s);
  if (!o) return l('Sem dono.', 'No owner.');
  const cost = money(s, Math.max(100, realDollars));
  if (o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  purse(s, -cost, 'leisure', 'charity33', { who: o });
  addRep33(s, Math.min(6, 1 + realDollars / 2000));
  return null;
}
/** Fundação: mensalidade fixa, sobe devagar a reputação e amortece escândalo. */
export function foundFoundation33(s: GameState): L | null {
  const o = ownerP(s); const v = vida33(s);
  if (!o) return l('Sem dono.', 'No owner.');
  if (v.foundation) return l('A fundação já existe.', 'The foundation already exists.');
  const cost = money(s, 20000);
  if (o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  purse(s, -cost, 'leisure', 'foundation33', { who: o });
  v.foundation = true;
  return null;
}
/** Escândalo pessoal (chamado pelos eventos de vida; a fundação amortece). */
export function scandal33(s: GameState, severity: number): void {
  if (!on(s, SW33.rep)) return;
  const v = vida33(s);
  addRep33(s, -severity * (v.foundation ? 0.6 : 1));
}

registerMod('appeal', 'vida33', (s, v, ctx) => {
  if (!on(s, SW33.rep) || !ctx.release || ctx.release.owner !== 'player') return null;
  const rp = vida33(s).rep;
  if (Math.abs(rp) < 15) return null;
  return { value: v * (1 + rp * 0.0004), label: rp > 0 ? l('Imagem pessoal do dono', 'Owner\'s public image') : l('Escândalo do dono', 'Owner\'s scandal') };
});

// ---------------------------------------------------------------- (heranças) filhos

const ATTRS = ['ear', 'negotiation', 'charisma', 'management'] as const;
function inheritKids(s: GameState, o: Owner): void {
  const v = vida33(s);
  o.kids.forEach((k, i) => {
    if (v.kids[i]) return;
    const best = [...ATTRS].sort((a, b) => o.attrs[b] - o.attrs[a])[0];
    const mean = (o.attrs.ear + o.attrs.negotiation + o.attrs.charisma + o.attrs.management) / 4;
    k.aptitude = Math.round(Math.max(10, Math.min(95, k.aptitude * 0.6 + mean * 0.4)));
    v.kids[i] = { interest: best };
  });
}
/** Interesse herdado do filho `i` (para a interface); undefined sem herança. */
export const kidInterest33 = (s: GameState, i: number): Owner['attrs'] extends infer A ? keyof A | undefined : never =>
  on(s, SW33.herdeiros) ? vida33(s).kids[i]?.interest : undefined;

// ---------------------------------------------------------------- mês

export function vidaMonth33(s: GameState, r: Rng): void {
  const o = ownerP(s);
  if (!o) return;
  const v = vida33(s);
  const house = o.house >= 0 ? o.house : -1;
  if (on(s, SW33.paparazzi) && house >= 0) {
    // prestígio da casa vem de HOUSES (owner.ts); aqui só o que precisa: lê pelo preço guardado em purse? usa o índice
    const pr = housePrestige33(s, house);
    if (v.guard) purse(s, -money(s, GUARD_COST[v.guard]), 'living', 'guard33', { who: o });
    if (r.chance(papChance33(s, pr))) {
      v.papWeek = s.week;
      o.stress = clamp01(o.stress + 4);
      scandal33(s, 2);
      remember(s, 'paparazzi33', fmtL(l('Paparazzi na porta de {o}.', 'Paparazzi at {o}\'s door.'), { o: o.name }));
    }
  }
  if (on(s, SW33.rotina) && v.routine) {
    const d = ROUTINE[v.routine];
    if (d.cost) purse(s, -money(s, d.cost), 'leisure', `routine33:${v.routine}`, { who: o });
    o.stress = clamp01(o.stress - d.relief);
    o.health = clamp01(o.health + d.health);
  }
  if (on(s, SW33.rep)) {
    if (v.foundation) { purse(s, -money(s, 400), 'leisure', 'foundation33:m', { who: o }); addRep33(s, 0.8); }
    v.rep -= Math.sign(v.rep) * Math.min(Math.abs(v.rep), 0.4); // a memória pública esmaece devagar
  }
  if (on(s, SW33.herdeiros)) inheritKids(s, o);
}

let housePrestige33: (s: GameState, idx: number) => number = () => 0;
/** owner.ts informa a tabela de casas (evita ciclo de import). */
export function setHousePrestige33(f: (s: GameState, idx: number) => number): void { housePrestige33 = f; }

registerSimHook('month', 'vida33', (s, r) => { if (ownerP(s)) vidaMonth33(s, r); });

/** Bônus de atributo ao herdar o selo: o interesse do filho ganha +6 (chamado por `succession`). */
export function inheritedBump33(s: GameState, kidIdx: number): { attr: (typeof ATTRS)[number]; bonus: number } | null {
  const k = on(s, SW33.herdeiros) ? vida33(s).kids[kidIdx] : undefined;
  return k ? { attr: k.interest, bonus: 6 } : null;
}

// ---------------------------------------------------------------- viagem de lazer (destino no mapa)

export interface Trip33 { city: string; week: number }
const R_EARTH = 6371;
function km33(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(x)));
}
export interface TripOpt33 { city: string; name: L; km: number; cost: number; relief: number }
/** Até 4 destinos de lazer do mês (determinísticos por semente+mês), com custo e alívio pela distância e pela época. */
export function tripOptions33(s: GameState): TripOpt33[] {
  const home = CITIES.find((c) => c.id === s.config.homeCity);
  if (!home) return [];
  const slow = s.year < 1930 ? 1.8 : s.year < 1960 ? 1.3 : 1; // navio e trem custam mais
  const rest = CITIES.filter((c) => c.id !== home.id).map((c) => ({ c, km: km33(home, c) }));
  let h = 0;
  for (const ch of `${s.config.seed}:trip33:${s.year}:${s.month}`) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  rest.sort((a, b) => ((Math.imul(a.c.id.length + a.km | 0, 2654435761) ^ h) >>> 0) - ((Math.imul(b.c.id.length + b.km | 0, 2654435761) ^ h) >>> 0));
  return rest.slice(0, 4).sort((a, b) => a.km - b.km).map(({ c, km }) => ({
    city: c.id, name: c.name, km: Math.round(km),
    cost: money(s, Math.round((900 + km * 0.35) * slow)), relief: Math.min(30, Math.round(12 + km / 700)),
  }));
}
export const tripNow33 = (s: GameState): Trip33 | undefined => (vida33(s) as Vida33 & { trip?: Trip33 }).trip;
/** Viagem de lazer a um destino do mapa: paga do bolso, 3 semanas de férias, alivia o estresse pela distância. */
export function takeTrip33(s: GameState, cityId: string): L | null {
  if (!on(s, SW33.rotina)) return l('Viagens de lazer estão desligadas.', 'Leisure trips are switched off.');
  const o = ownerP(s);
  if (!o) return l('Sem dono.', 'No owner.');
  if (o.vacationUntil && o.vacationUntil > s.week) return l('Já está de férias.', 'Already on vacation.');
  const opt = tripOptions33(s).find((x) => x.city === cityId);
  if (!opt) return l('Destino indisponível este mês.', 'Destination not available this month.');
  if (o.wealth < opt.cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  purse(s, -opt.cost, 'leisure', 'trip33', { who: o });
  o.vacationUntil = s.week + 3;
  o.stress = clamp01(o.stress - opt.relief);
  o.health = clamp01(o.health + 2);
  (vida33(s) as Vida33 & { trip?: Trip33 }).trip = { city: cityId, week: s.week };
  remember(s, 'trip33', fmtL(l('{o} viaja para {c}.', '{o} travels to {c}.'), { o: o.name, c: opt.name }));
  return null;
}
