// R31 · onda 3 (CAR) — CASA DE SHOWS E FESTIVAL: A PROGRAMAÇÃO É A DECISÃO (interruptor car31.stage).
//
// Antes, noite na sua casa não contava como "show feito lá" na fama por país, atos de terceiros só ganhavam uns fãs
// casuais e a posição no cartaz do festival não mudava nada. Agora:
//   • Casa: cada noite com artista marca o show na cidade (fama por país, como turnê) e expõe quem fecha e quem
//     ABRE a noite (decisão nova: a abertura do mês), pelo tamanho da casa, pela cena e pela lotação, escalado pelo
//     PRESTÍGIO da casa. Abrir com artista novo custa cachê e esvazia o bar, mas dá prestígio; noites comerciais com
//     estrelas desgastam o prestígio. Noite lendária (sorte por semente) empurra o disco do artista nas paradas do país.
//   • Festival: depois da edição, cada atração ganha fama no país pela posição no cartaz (tarde → headliner) e pela
//     nota da edição, por meio ano; a REVELAÇÃO (artista pequeno bem escalado) ganha um empurrão curto nas paradas.
// Tudo passa pela função única (car31.ts); artistas que não são seus só com car31.others.

import { Rng, clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { registerEditable } from '../r31/editor';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, post } from '../util';
import { boost31, car31On, careerSw31, exec31, registerExec31, touch31 } from './car31';
import { EXCL31, FEST31, exclDeal12, festOf, f12, muOf, type Deal } from './fest12';
import { scoutRace18 } from './discover18';
import { exclPrem19, npcMonth19 } from '../ctx19';
import { cityDistanceKm } from '../travel';
import { shows12 } from './tour12';
import { builtVenue } from './venuestore27';
import { ventures } from './ventures9';
import { registerDeadline, type Deadline19 } from '../calendar19';

import { venueKind } from './live/venue';
import type { Night, V12 } from './venue12';

/** olheiros de um rival atrás da revelação (car31.scouts) */
export interface Scout31 { lb: string; w: number; from: 'venue' | 'festival' }
/** cláusula de exclusividade de festival (car31.excl): raio em km, prazo em semanas antes e depois da edição */
export interface Excl31 { f: string; a: string; km: number; wk: number; paid: number; w0: number; broke?: 1 }
export interface Stage31State {
  open: Record<string, string>; pres: number; legends: number; reveals: number; log: { w: number; t: L }[];
  sc?: Record<string, Scout31>; stolen?: number; kept?: number; ex?: Record<string, Excl31>; breaks?: number;
}
declare module '../ext4' { interface Ext4 { car31s: Stage31State } }
const fresh = (): Stage31State => ({ open: {}, pres: 30, legends: 0, reveals: 0, log: [] });
registerExt4('car31s', fresh);
export const stageRo31 = (s: GameState): Stage31State => (s as unknown as { x4?: { car31s?: Stage31State } }).x4?.car31s ?? fresh();
function st31(s: GameState): Stage31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.car31s ??= fresh()) as Stage31State;
  st.open ??= {}; st.log ??= [];
  return st;
}
const note = (st: Stage31State, w: number, t: L) => { st.log.unshift({ w, t }); if (st.log.length > 12) st.log.length = 12; };
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const v12ro = (s: GameState): V12 | null => (s as unknown as { x4?: { venues27?: { v?: Record<string, { prog?: V12 }> } } }).x4?.venues27?.v?.['lv:venue']?.prog ?? null; // UNI-4: programação na própria casa
/** a casa e a programação (só leitura) */
export function venueNow31(s: GameState): { cityId: string; a3: string; cap: number; kind: string; name: string; x: V12 } | null {
  const v = (s as unknown as { x4?: { venues27?: { v?: Record<string, { built?: { cityId: string; kind: 'club' | 'theater' | 'arena'; name: string } }> } } }).x4?.venues27?.v?.['lv:venue']?.built; // UNI-4: registro único das casas
  const x = v12ro(s);
  if (!v || !x) return null;
  return { cityId: v.cityId, a3: countryOfCity(v.cityId) ?? 'USA', cap: venueKind(v.kind).cap, kind: v.kind, name: v.name, x };
}
const NIGHT_W: Record<string, number> = { original: 1, residency: 1.2, party: 0.3, private: 0, rental: 0.6 };
const KIND_F: Record<string, number> = { club: 0.7, theater: 1, arena: 1.3 };
export const NEW_FAME31 = 30;
careerSw31('scouts', l('Casa e festival: olheiros de selos rivais veem a revelação e podem assiná-la antes de você.', 'Venue and festival: rival labels\' scouts see the breakout act and may sign it before you.'));
careerSw31('excl', l('Festival: exclusividade com raio e prazo — custa mais quanto maior, bloqueia festivais rivais, pode ser quebrada (multa).', 'Festival: exclusivity with radius and term — costs more the wider, blocks rival festivals, can be broken (penalty).'));

/** peso de exposição de uma noite (quem fecha; quem abre vale metade) */
export function nightW31(s: GameState, n: Night, opener = false): number {
  const vn = venueNow31(s);
  if (!vn) return 0;
  const occ = clamp((n.last?.att ?? 0) / Math.max(1, vn.cap), 0, 1);
  const w = 0.25 * (NIGHT_W[n.k] ?? 0.5) * (0.5 + vn.x.scene / 100) * (KIND_F[vn.kind] ?? 1) * (0.4 + occ) * (0.6 + stageRo31(s).pres / 100);
  return opener ? w * 0.5 : w;
}
registerExec31('venue', (s, out) => {
  if (!car31On(s, 'stage')) return;
  const vn = venueNow31(s);
  if (!vn) return;
  const op = stageRo31(s).open;
  for (const n of vn.x.prog) {
    if (n.actId) exec31(s, out, { act: n.actId, a3: vn.a3, w: nightW31(s, n), src: 'venue', by: 'venue' });
    const o = op[n.id];
    if (o && o !== n.actId) exec31(s, out, { act: o, a3: vn.a3, w: nightW31(s, n, true), src: 'venue', by: 'venue' });
  }
});

// ---------------------------------------------------------------- decisões

export function setOpener31(s: GameState, nightId: string, actId?: string): L | null {
  const vn = venueNow31(s);
  if (!vn) return l('Você não tem casa de shows.', 'You have no venue.');
  const n = vn.x.prog.find((x) => x.id === nightId);
  if (!n) return l('Essa noite não está mais na programação.', 'That night is no longer on the programme.');
  const st = st31(s);
  if (!actId) { delete st.open[nightId]; touch31(s); return null; }
  const a = s.acts[actId];
  if (!a || a.status === 'retired' || a.status === 'split' || (a.debutYear > s.year && !mine(a))) return l('Artista indisponível.', 'Act unavailable.');
  if (actId === n.actId) return l('Quem fecha a noite não pode abrir também.', 'The headliner cannot open too.');
  if (n.k === 'private') return l('Evento privado não tem abertura.', 'A private event has no opener.');
  st.open[nightId] = actId;
  touch31(s);
  return null;
}
/** cachê mensal de uma abertura (4 noites) */
export const openerFee31 = (s: GameState, a: Act): number => money(s, 60 * Math.pow(1 + a.fame / 10, 1.3) * 4);
/** bar que se perde quando o artista novo abre (por mês) */
export const barLoss31 = (s: GameState, a: Act): number => (a.fame < NEW_FAME31 ? money(s, 120 * ((NEW_FAME31 - a.fame) / NEW_FAME31) * 4) : 0);

// ---------------------------------------------------------------- mês: casa

const latestLive = (s: GameState, actId: string): Release | undefined => {
  const a = s.acts[actId];
  for (let i = (a?.releases.length ?? 0) - 1; i >= 0; i--) { const r = s.releases[a!.releases[i]]; if (r?.live) return r; }
  return undefined;
};
const played = (s: GameState, actId: string, city: string) => {
  const a = s.acts[actId];
  if (!a || (!mine(a) && !car31On(s, 'others'))) return;
  s.flags[`played:${actId}:${city}`] = s.week;
};

function venueMonth(s: GameState): void {
  const vn = venueNow31(s);
  const st = st31(s);
  if (car31On(s, 'scouts')) scoutCheck(s, st);
  if (!vn) { if (Object.keys(st.open).length) { st.open = {}; touch31(s); } return; }
  const live = new Set(vn.x.prog.map((n) => n.id));
  for (const id of Object.keys(st.open)) if (!live.has(id) || !s.acts[st.open[id]]) delete st.open[id];
  let fee = 0, bar = 0, dp = 0;
  const mi = s.year * 12 + s.month;
  for (const n of vn.x.prog) {
    const head = n.actId ? s.acts[n.actId] : undefined;
    const op = st.open[n.id] ? s.acts[st.open[n.id]] : undefined;
    if (head) { played(s, head.id, vn.cityId); if (head.fame >= 70) dp -= 0.3; if (n.k === 'original' && head.fame < NEW_FAME31) dp += 0.3; }
    if (op) {
      played(s, op.id, vn.cityId);
      if (!mine(op)) fee += openerFee31(s, op);
      bar += barLoss31(s, op);
      if (op.fame < NEW_FAME31) dp += 0.8;
    }
    // noite lendária: quem estoura no palco ganha empurrão nas paradas do país
    const who = op && op.fame < NEW_FAME31 && Rng.fromSeed(`${s.config.seed}|car31|vwho|${mi}|${n.id}`).chance(0.4) ? op : head;
    if (!who) continue;
    const occ = clamp((n.last?.att ?? 0) / Math.max(1, vn.cap), 0, 1);
    if (!Rng.fromSeed(`${s.config.seed}|car31|venue|${mi}|${n.id}`).chance(0.03 + occ * 0.05 + st.pres / 1500)) continue;
    if (!mine(who) && !car31On(s, 'others')) continue;
    const rel = latestLive(s, who.id);
    boost31(s, { rel: rel?.id, act: who.id, a3: vn.a3, w: 0.35, u: s.week + 4, src: 'venue', by: 'venue' });
    st.legends++;
    if (who.fame < NEW_FAME31) scout(s, who, 'venue', vn.cityId, fmtL(l('Viram a noite lendária na {v}.', 'They saw the legendary night at {v}.'), { v: vn.name }));
    emitFact(s, { kind: 'own_bill', actors: ['player', who.id], place: vn.cityId, severity: 40, tags: ['car31', 'venue', 'good'], src: 'car31',
      text: fmtL(l('Noite lendária na {v}: {a} incendeia a casa e a cidade inteira fala disso.', 'Legendary night at {v}: {a} sets the room on fire and the whole city talks about it.'), { v: vn.name, a: who.name }),
      notify: { kind: 'good', cat: 'shows' }, diary: true });
  }
  if (fee) post(s, `car31:open:${mi}`, -fee, 'live_costs', `Cachês de abertura ${vn.name}`);
  if (bar) post(s, `car31:bar:${mi}`, -bar, 'live_costs', `Bar vazio nas aberturas ${vn.name}`);
  st.pres = Math.round(clamp(st.pres + dp - (st.pres - 30) * 0.02, 0, 100) * 10) / 10;
  touch31(s);
}

// ---------------------------------------------------------------- festival

const SLOT_W = [0.25, 0.4, 0.6, 1];
FEST31.after = (s, f, o) => {
  if (!car31On(s, 'stage')) return;
  const a3 = countryOfCity(f.cityId) ?? 'USA';
  const fill = clamp(o.att / Math.max(1, o.cap), 0, 1), note10 = clamp(o.rating / 70, 0.2, 1.4) * (o.disaster ? 0.4 : 1);
  let rev: { a: Act; k: number } | null = null;
  for (const id of o.acts) {
    const a = s.acts[id];
    if (!a || (!mine(a) && !car31On(s, 'others'))) continue;
    const sw = SLOT_W[clamp(Math.round(o.time[id] ?? 0), 0, 3)];
    played(s, id, f.cityId);
    boost31(s, { act: id, a3, w: 0.5 * sw * (0.3 + fill) * note10, u: s.week + 26, src: 'festival', by: f.id });
    if (a.fame < 40) { const k = sw * (40 - a.fame); if (!rev || k > rev.k || (k === rev.k && a.id < rev.a.id)) rev = { a, k }; }
  }
  if (rev && !o.disaster && o.rating >= 50) {
    const rel = latestLive(s, rev.a.id);
    boost31(s, { rel: rel?.id, act: rev.a.id, a3, w: 0.45 * note10, u: s.week + 6, src: 'festival', by: f.id });
    const st = st31(s);
    st.reveals++;
    note(st, s.week, fmtL(l('{a} foi a revelação do {f}.', '{a} was the breakout act of {f}.'), { a: rev.a.name, f: f.name }));
    scout(s, rev.a, 'festival', f.cityId, fmtL(l('Viram {a} roubar a cena no {f}.', 'They saw {a} steal the show at {f}.'), { a: rev.a.name, f: f.name }));
    emitFact(s, { kind: 'festival_breakout', actors: ['player', rev.a.id], place: f.cityId, severity: 45, tags: ['car31', 'festival', 'good'], src: 'car31',
      text: fmtL(l('{a} é a revelação do {f}: todo mundo saiu falando desse nome.', '{a} is the breakout of {f}: everyone left talking about that name.'), { a: rev.a.name, f: f.name }),
      notify: { kind: 'good', cat: 'shows' }, diary: { important: true } });
  }
  touch31(s);
};

// ---------------------------------------------------------------- olheiros rivais (car31.scouts)

/** A revelação sem selo chama a atenção dos olheiros de um rival: entra na disputa da descoberta (discover18). */
function scout(s: GameState, a: Act, from: Scout31['from'], city: string, why: L): void {
  if (!car31On(s, 'scouts') || a.owner || a.playerBand || a.status === 'retired' || a.status === 'split') return;
  const st = st31(s);
  if (st.sc?.[a.id]) return;
  const r = Rng.fromSeed(`${s.config.seed}|car31|scout|${a.id}|${s.week}`);
  const labs = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 20000)).sort((x, y) => (x.id < y.id ? -1 : 1));
  if (!labs.length) return;
  const lb = r.weighted(labs, (x) => 0.3 + x.aggression + (countryOfCity(x.city) === countryOfCity(city) ? 0.5 : 0))!;
  const n = scoutRace18(s, a, lb.id, 3 + r.int(0, 3), why);
  if (!n) return;
  (st.sc ??= {})[a.id] = { lb: lb.id, w: s.week, from };
  emitFact(s, { kind: 'scout_circling', actors: ['player', a.id, lb.id], place: city, severity: 35, tags: ['car31', 'scout'], src: 'car31',
    text: fmtL(l('Olheiros de {l} estão atrás de {a}, a revelação da sua {k}. Faça proposta antes deles.', '{l} scouts are after {a}, the breakout of your {k}. Make an offer before they do.'), { l: n, a: a.name, k: from === 'venue' ? l('casa', 'venue') : l('festival', 'festival') }),
    notify: { kind: 'bad', cat: 'deals', prio: 2 } });
}
/** Resultado da disputa: o rival levou (sai da sua abertura) ou você assinou antes. */
function scoutCheck(s: GameState, st: Stage31State): void {
  for (const [id, x] of Object.entries(st.sc ?? {})) {
    const a = s.acts[id];
    if (!a) { delete st.sc![id]; continue; }
    if (a.owner === x.lb) {
      st.stolen = (st.stolen ?? 0) + 1;
      for (const n of Object.keys(st.open)) if (st.open[n] === id) delete st.open[n];
      delete st.sc![id];
      touch31(s);
      emitFact(s, { kind: 'reveal_stolen', actors: ['player', id, x.lb], severity: 40, tags: ['car31', 'scout', 'bad'], src: 'car31',
        text: fmtL(l('{l} assinou com {a}: a revelação da sua {k} agora é deles.', '{l} signed {a}: your {k}\'s breakout act is theirs now.'), { l: s.labels[x.lb]?.name ?? '?', a: a.name, k: x.from === 'venue' ? l('casa', 'venue') : l('festival', 'festival') }),
        notify: { kind: 'bad', cat: 'deals' }, diary: true });
    } else if (a.owner === 'player' || a.playerBand) {
      st.kept = (st.kept ?? 0) + 1;
      delete st.sc![id];
      note(st, s.week, fmtL(l('Você chegou antes dos olheiros e assinou {a}.', 'You beat the scouts and signed {a}.'), { a: a.name }));
    } else if (a.owner || s.week - x.w > 16) delete st.sc![id];
  }
}

// ---------------------------------------------------------------- exclusividade com raio e prazo (car31.excl)

export const EXCL_KM31 = [300, 800, 2000];
export const EXCL_WK31 = [8, 16, 26];
const exKey = (fid: string, actId: string) => `${fid}:${actId}`;
/** semana da próxima edição do festival */
const festWeek = (s: GameState, fid: string): number => { const f = festOf(s, fid); return f ? s.week + Math.round(muOf(s, f) * 4.345) : s.week; };
/** festivais rivais (NPC) que a cláusula bloqueia: dentro do raio e com edição dentro do prazo */
export function exBlocked31(s: GameState, fid: string, km: number, wk: number): string[] {
  const f = festOf(s, fid);
  if (!f) return [];
  const months = wk / 4.345;
  return ventures(s).npc.filter((n) => n.kind === 'festival' && (n.city === f.cityId || cityDistanceKm(n.city, f.cityId) <= km))
    .filter((n) => { const dm = Math.min(Math.abs(npcMonth19(n) - f.month), 12 - Math.abs(npcMonth19(n) - f.month)); return dm <= months; }).map((n) => n.name).sort();
}
/** preço da cláusula (dinheiro do jogo): cachê do artista × prêmio de exclusividade × tamanho (raio e prazo) */
export function exclQuote31(s: GameState, fid: string, actId: string, km: number, wk: number): { cost: number; blocked: string[]; refuse?: L } {
  const f = festOf(s, fid), a = s.acts[actId], fee = f?.lineup.find((y) => y.actId === actId)?.fee ?? 0;
  if (!f || !a || !f12(s, f).deals[actId]) return { cost: 0, blocked: [], refuse: l('Esse artista não está no line-up.', 'That act is not on the bill.') };
  const prem = exclPrem19(s, ventures(s).npc, f.cityId, f.month, a.fame).v * Math.sqrt(km / 800) * Math.pow(wk / 16, 0.6);
  const mineA = a.owner === 'player' || !!a.playerBand;
  const refuse = !mineA && a.fame >= 60 && km >= 2000 && wk >= 26 && f.rep < 60 ? l('Não aceita uma cláusula tão larga e longa de um festival desse porte.', 'Won\'t accept such a wide and long clause from a festival this size.') : undefined;
  return { cost: mineA ? 0 : Math.round(money(s, fee * prem)), blocked: exBlocked31(s, fid, km, wk), refuse };
}
export const exclOf31 = (s: GameState, fid: string, actId: string): Excl31 | undefined => stageRo31(s).ex?.[exKey(fid, actId)];
/** Fecha (ou amplia) a cláusula: paga a diferença do que já foi pago. km/wk = 0 desfaz (sem reembolso). */
export function setExcl31(s: GameState, fid: string, actId: string, km: number, wk: number): L | null {
  if (!car31On(s, 'excl')) return l('Desligado nas regras desta partida.', 'Turned off in this game\'s rules.');
  const st = st31(s), k = exKey(fid, actId), old = st.ex?.[k];
  if (!km || !wk) {
    if (old) delete st.ex![k];
    exclDeal12(s, fid, actId, false, 0, '', '');
    return null;
  }
  if (!EXCL_KM31.includes(km) || !EXCL_WK31.includes(wk)) return l('Raio ou prazo inválido.', 'Invalid radius or term.');
  const q = exclQuote31(s, fid, actId, km, wk);
  if (q.refuse) return q.refuse;
  if (old?.broke) return l('Essa exclusividade já foi quebrada nesta edição.', 'That exclusivity was already broken this edition.');
  const due = Math.max(0, q.cost - (old?.paid ?? 0));
  const a = s.acts[actId]!;
  if (!exclDeal12(s, fid, actId, true, -due, `ex31:${actId}:${km}:${wk}:${s.week}`, `Cláusula de exclusividade: ${a.name}`)) return l('Esse artista não está no line-up.', 'That act is not on the bill.');
  (st.ex ??= {})[k] = { f: fid, a: actId, km, wk, paid: Math.max(old?.paid ?? 0, q.cost), w0: old?.w0 ?? s.week };
  return null;
}
/** procura a mais por cláusula: cresce com o raio e o prazo (800 km × 16 semanas ≈ os 6% da regra antiga) e com cada
 *  festival rival bloqueado; teto de 15% */
export const exclK31 = (km: number, wk: number, blocked: number): number => Math.min(0.15, 0.06 * Math.sqrt(km / 800) * Math.sqrt(wk / 16) + 0.03 * blocked);
EXCL31.dem = (s, f, deals) => {
  if (!car31On(s, 'excl')) return null;
  const st = stageRo31(s);
  if (!deals.some((d) => st.ex?.[exKey(f.id, d.actId)])) return null;
  let k = 0;
  for (const d of deals) {
    const c = st.ex?.[exKey(f.id, d.actId)];
    if (!c) { k += 0.06; continue; }
    if (c.broke) continue;
    k += exclK31(c.km, c.wk, exBlocked31(s, f.id, c.km, c.wk).length);
  }
  return k;
};
/** Bônus de procura das exclusividades do festival (o mesmo número que entra na projeção). Puro. */
export function exclDemand31(s: GameState, fid: string): number {
  const f = festOf(s, fid);
  if (!f) return 0;
  const exs = Object.values(f12(s, f).deals).filter((d) => d.excl && (s.acts[d.actId]?.fame ?? 0) >= 40);
  return exs.length ? EXCL31.dem?.(s, f, exs) ?? exs.length * 0.06 : 0;
}
/** Mês: a cláusula é quebrada quando o artista toca dentro do raio e do prazo (por você ou por um festival rival). */
function exclMonth(s: GameState): void {
  const st = st31(s);
  for (const [k, c] of Object.entries(st.ex ?? {})) {
    const f = festOf(s, c.f), a = s.acts[c.a];
    const d: Deal | undefined = f ? f12(s, f).deals[c.a] : undefined;
    if (!f || !a || !d) { delete st.ex![k]; continue; }
    const W = festWeek(s, c.f);
    if (c.broke && W - s.week > c.wk) { delete st.ex![k]; continue; } // a próxima edição começa sem cláusula
    if (c.broke || Math.abs(W - s.week) > c.wk) continue;
    // 1) o próprio jogador furou: show marcado pela sua agência/promotora, ou noite na sua casa, dentro do raio
    let mineCity: string | undefined;
    for (const sh of shows12(s)) if (sh.actId === a.id && sh.week > c.w0 && Math.abs(sh.week - W) <= c.wk && sh.status !== 'cancelled' && sh.city !== f.cityId && cityDistanceKm(sh.city, f.cityId) <= c.km) { mineCity = sh.city; break; }
    const vn = builtVenue(s); // UNI-4: casa construída no registro único
    if (!mineCity && vn && vn.cityId !== f.cityId && cityDistanceKm(vn.cityId, f.cityId) <= c.km && (venueNow31(s)?.x.prog.some((n) => n.actId === a.id) || Object.values(st.open).includes(a.id))) mineCity = vn.cityId;
    // 2) um festival rival dentro do raio oferece mais e o artista fura
    let rival: string | undefined;
    if (!mineCity && !(a.owner === 'player' || a.playerBand)) {
      const bl = exBlocked31(s, c.f, c.km, c.wk);
      const r = Rng.fromSeed(`${s.config.seed}|car31|exbreak|${k}|${s.year * 12 + s.month}`);
      if (bl.length && r.chance(Math.min(0.25, 0.03 * bl.length * (0.5 + a.fame / 60)))) rival = r.pick(bl);
    }
    if (!mineCity && !rival) continue;
    c.broke = 1;
    st.breaks = (st.breaks ?? 0) + 1;
    if (mineCity) {
      exclDeal12(s, c.f, c.a, false, 0, '', '');
      f.rep = clamp(f.rep - 3, 0, 100);
      emitFact(s, { kind: 'excl_broken', actors: ['player', a.id], place: f.cityId, severity: 35, tags: ['car31', 'festival', 'bad'], src: 'car31',
        text: fmtL(l('Você mesmo furou a exclusividade de {a} no {f}: o show perto demais tira o atrativo da edição.', 'You broke {a}\'s exclusivity at {f} yourself: the show too close by takes away the edition\'s draw.'), { a: a.name, f: f.name }),
        notify: { kind: 'bad', cat: 'shows' }, diary: true });
    } else {
      const fine = c.paid * 2;
      exclDeal12(s, c.f, c.a, false, fine, `exfine31:${k}:${s.week}`, `Multa por quebra de exclusividade: ${a.name}`);
      emitFact(s, { kind: 'excl_broken', actors: ['player', a.id], place: f.cityId, severity: 40, tags: ['car31', 'festival', 'bad'], src: 'car31',
        text: fmtL(l('{a} quebra a exclusividade e toca no {r}. O {f} recebe a multa, mas perde o trunfo da edição.', '{a} breaks the exclusivity and plays {r}. {f} gets the penalty but loses the edition\'s trump card.'), { a: a.name, r: rival!, f: f.name }),
        notify: { kind: 'bad', cat: 'shows' }, diary: true });
    }
  }
}

registerDeadline('car31stage', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const c of Object.values(stageRo31(s).ex ?? {})) {
    if (c.broke) continue;
    const W = festWeek(s, c.f), end = W + c.wk, a = s.acts[c.a];
    if (end >= from && end <= to) out.push({ id: `car31x:${c.f}:${c.a}:${end}`, w: end, kind: 'other', tone: 'info', t: fmtL(l('Fim da exclusividade de {a}', 'End of {a}\'s exclusivity'), { a: a?.name ?? '?' }), goto: { area: 'car31' } });
  }
  return out;
});

registerSimHook('month', 'car31stage', (s) => { if (car31On(s, 'stage')) venueMonth(s); if (car31On(s, 'excl')) exclMonth(s); });

registerEditable({
  id: 'car31.stage.pres', area: 'careers', label: l('Prestígio da sua casa de shows (0–100)', 'Your venue\'s prestige (0–100)'), kind: 'number', min: 0, max: 100, step: 1, raw: true,
  get: (s) => stageRo31(s).pres, set: (s, v) => { st31(s).pres = clamp(Number(v), 0, 100); touch31(s); },
});

