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
import { boost31, car31On, exec31, registerExec31, touch31 } from './car31';
import { FEST31 } from './fest12';

import { venueKind } from './live/venue';
import type { Night, V12 } from './venue12';

export interface Stage31State { open: Record<string, string>; pres: number; legends: number; reveals: number; log: { w: number; t: L }[] }
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
const v12ro = (s: GameState): V12 | null => (s as unknown as { x4?: { venue12?: { v: V12 | null } } }).x4?.venue12?.v ?? null;
/** a casa e a programação (só leitura) */
export function venueNow31(s: GameState): { cityId: string; a3: string; cap: number; kind: string; name: string; x: V12 } | null {
  const v = (s as unknown as { x4?: { live?: { venue?: { cityId: string; kind: 'club' | 'theater' | 'arena'; name: string } | null } } }).x4?.live?.venue;
  const x = v12ro(s);
  if (!v || !x) return null;
  return { cityId: v.cityId, a3: countryOfCity(v.cityId) ?? 'USA', cap: venueKind(v.kind).cap, kind: v.kind, name: v.name, x };
}
const NIGHT_W: Record<string, number> = { original: 1, residency: 1.2, party: 0.3, private: 0, rental: 0.6 };
const KIND_F: Record<string, number> = { club: 0.7, theater: 1, arena: 1.3 };
export const NEW_FAME31 = 30;

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
  if (!a || a.status === 'retired' || a.status === 'split') return l('Artista indisponível.', 'Act unavailable.');
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
    emitFact(s, { kind: 'festival_breakout', actors: ['player', rev.a.id], place: f.cityId, severity: 45, tags: ['car31', 'festival', 'good'], src: 'car31',
      text: fmtL(l('{a} é a revelação do {f}: todo mundo saiu falando desse nome.', '{a} is the breakout of {f}: everyone left talking about that name.'), { a: rev.a.name, f: f.name }),
      notify: { kind: 'good', cat: 'shows' }, diary: { important: true } });
  }
  touch31(s);
};

registerSimHook('month', 'car31stage', (s) => { if (car31On(s, 'stage')) venueMonth(s); });

registerEditable({
  id: 'car31.stage.pres', area: 'careers', label: l('Prestígio da sua casa de shows (0–100)', 'Your venue\'s prestige (0–100)'), kind: 'number', min: 0, max: 100, step: 1, raw: true,
  get: (s) => stageRo31(s).pres, set: (s, v) => { st31(s).pres = clamp(Number(v), 0, 100); touch31(s); },
});

