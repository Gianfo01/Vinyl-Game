// Rodada 18 (campus18) — "NOSSO MUNDO": tudo o que o jogador possui ou opera vira um PRÉDIO num mapa de
// quarteirões da cidade-sede (+ uma faixa "pelo mundo" para filiais, casas e escritórios fora da cidade).
// Módulo de SIMULAÇÃO, sem DOM: (1) buildings18(s) deriva os prédios do estado REAL dos outros sistemas
// (sede/hq6/branches, ventures9, venues17, casa de shows e festivais de live, escola, ala-museu, fábricas,
// escritórios de regions18, banda da casa, imprints/JVs, subselos, casa do dono) — nada é duplicado;
// (2) estilo arquitetônico pela época em que cada prédio foi erguido ou reformado (tijolo vitoriano 1889 →
// galpão → art déco → modernista → brutalista → pós-moderno → vidro → eco-futurista);
// (3) OBRAS próprias do campus (loja do selo, letreiro, casa dos artistas, praça dos fãs, reforma):
// lote, empreiteiro (barato/padrão/premium), meses, atrasos e estouros como eventos → inbox18/facts17,
// pagamentos como investimento (capex) no ledger18; (4) estados: planejado → andaime → aberto → em reforma
// → danificado (incêndio do crime17/desastre) → fechado/vendido; (5) retrato ANUAL compacto para a linha
// do tempo (máx. 170 anos).

import { clamp, Rng } from '../../core/rng';
import { HQ_LEVELS, BRANCH_LEVELS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, recentFacts } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type Goto18 } from '../inbox18';
import { addStress } from '../stress17';
import type { GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { hq6 } from './hq6';
import { hq8 } from './hq8';
import { liveOf } from './live/state';
import { ownerOf, HOUSES } from './people/owner';
import { rel18, WING18 } from './relics18';
import { reg18, subName18 } from './regions18';
import { OWN18, school18 } from './school18';
import { sess18 } from './session18';
import { deals18 } from './deals18';
import { ventures, type VKind } from './ventures9';
import { v17, vdef } from './venues17';

// ---------------------------------------------------------------- tipos

export type BKind = 'hq' | 'branch' | 'studio' | 'venue' | 'fest' | 'school' | 'museum' | 'publisher' | 'plant' | 'office' | 'media' | 'platform'
  | 'booking' | 'rehearsal' | 'imprint' | 'sublabel' | 'home' | 'store' | 'sign' | 'dorm' | 'park';
export type BState = 'planned' | 'building' | 'open' | 'renovating' | 'damaged' | 'closed' | 'sold';
export type Style18 = 'victorian' | 'brick' | 'deco' | 'midcentury' | 'brutal' | 'postmod' | 'glass' | 'eco';
export type Vehicle18 = 'cart' | 'modelT' | 'round' | 'fin' | 'boxy' | 'suv' | 'pod';

export interface Bld18 {
  id: string; kind: BKind; name: string; city: string;
  /** 'campus' = quarteirões da cidade-sede; 'world' = faixa de fora */
  zone: 'campus' | 'world';
  /** tamanho 1..6 */
  lvl: number;
  st: BState;
  /** ano em que passou a existir / em que o estilo foi definido (construção ou reforma) */
  since: number; sy: number;
  /** progresso da obra (0..1) */
  prog?: number;
  lot?: number;
  goto?: Goto18;
  kpi?: [L, string][];
  staff?: number;
  now?: L;
  note?: L;
  /** prédio em mau estado (conservação baixa) */
  worn?: boolean;
}

export type PKind = 'store' | 'sign' | 'dorm' | 'park' | 'reno';
export interface Proj18 { id: string; kind: PKind; target?: string; lot: number; q: number; start: number; months: number; left: number; cost: number; paid: number; over: number; delays: number; asked?: number }
export interface Built18 { lot: number; y: number; q: number }
export interface Gone18 { id: string; kind: BKind; name: string; city: string; lvl: number; sy: number; lot?: number; y: number; how: 'sold' | 'closed' }
export interface Campus18 {
  born: Record<string, number>;
  lvl: Record<string, number>;
  ren: Record<string, number>;
  lot: Record<string, number>;
  dmg: Record<string, { w: number; sev: number; why: L }>;
  gone: Gone18[];
  built: Partial<Record<Exclude<PKind, 'reno'>, Built18>>;
  proj: Proj18[];
  snaps: { y: number; b: string }[];
  /** último nome/cidade/tipo visto de cada prédio (para placas de "vendido") */
  nm: Record<string, [string, string, BKind]>;
  log: { y: number; m: number; t: L }[];
  seq: number;
}
declare module '../ext4' { interface Ext4 { campus18: Campus18 } }
const fresh = (): Campus18 => ({ born: {}, lvl: {}, ren: {}, lot: {}, dmg: {}, gone: [], built: {}, proj: [], snaps: [], nm: {}, log: [], seq: 0 });
registerExt4('campus18', fresh);
export function campus18(s: GameState): Campus18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.campus18 ??= fresh()) as Campus18;
  st.born ??= {}; st.lvl ??= {}; st.ren ??= {}; st.lot ??= {}; st.dmg ??= {}; st.gone ??= []; st.built ??= {}; st.proj ??= []; st.snaps ??= []; st.nm ??= {}; st.log ??= []; st.seq ??= 0;
  return st;
}
const mIdx = (s: GameState) => s.year * 12 + s.month;
const log = (s: GameState, t: L) => { const st = campus18(s); st.log.push({ y: s.year, m: s.month, t }); if (st.log.length > 40) st.log.splice(0, st.log.length - 40); };

// ---------------------------------------------------------------- época: arquitetura e veículos

export const STYLES18: { id: Style18; from: number; name: L; desc: L }[] = [
  { id: 'victorian', from: 0, name: l('Tijolo vitoriano', 'Victorian brick'), desc: l('Cornijas, chaminés, lampiões a gás.', 'Cornices, chimneys, gas lamps.') },
  { id: 'brick', from: 1905, name: l('Galpão industrial', 'Industrial brick'), desc: l('Tijolo aparente, janelas em arco, caixa d\'água no telhado.', 'Exposed brick, arched windows, a rooftop water tank.') },
  { id: 'deco', from: 1925, name: l('Art déco', 'Art deco'), desc: l('Fachada creme escalonada, frisos dourados, letreiro em neon.', 'Stepped cream façade, gold trim, neon sign.') },
  { id: 'midcentury', from: 1946, name: l('Modernista', 'Mid-century modern'), desc: l('Caixa branca, janelas em fita, laje plana.', 'White box, ribbon windows, flat slab.') },
  { id: 'brutal', from: 1968, name: l('Brutalista', 'Brutalist'), desc: l('Concreto aparente, janelas fundas.', 'Raw concrete, deep-set windows.') },
  { id: 'postmod', from: 1982, name: l('Pós-moderno', 'Postmodern'), desc: l('Cores pastel, frontão, vidro espelhado.', 'Pastel colors, a pediment, mirrored glass.') },
  { id: 'glass', from: 1996, name: l('Torre de vidro', 'Glass tower'), desc: l('Pele de vidro azul, antenas, heliponto.', 'Blue curtain wall, antennas, a helipad.') },
  { id: 'eco', from: 2024, name: l('Eco-futurista', 'Eco-futurist'), desc: l('Telhado verde, painéis solares, madeira e hologramas.', 'Green roof, solar panels, timber and holograms.') },
];
export const styleOf18 = (y: number): Style18 => { let r: Style18 = 'victorian'; for (const x of STYLES18) if (y >= x.from) r = x.id; return r; };
export const styleName18 = (id: Style18): L => STYLES18.find((x) => x.id === id)!.name;
export const vehicleOf18 = (y: number): Vehicle18 => (y < 1910 ? 'cart' : y < 1935 ? 'modelT' : y < 1958 ? 'round' : y < 1975 ? 'fin' : y < 1996 ? 'boxy' : y < 2025 ? 'suv' : 'pod');

export const KIND18: Record<BKind, { name: L; icon: string }> = {
  hq: { name: l('Sede', 'Headquarters'), icon: 'building' }, branch: { name: l('Filial', 'Branch'), icon: 'building' },
  studio: { name: l('Estúdio', 'Studio'), icon: 'mic' }, venue: { name: l('Casa de shows', 'Venue'), icon: 'stage' },
  fest: { name: l('Festival', 'Festival'), icon: 'ticket' }, school: { name: l('Escola', 'School'), icon: 'book' },
  museum: { name: l('Museu', 'Museum'), icon: 'vault' }, publisher: { name: l('Editora', 'Publisher'), icon: 'note' },
  plant: { name: l('Fábrica de discos', 'Pressing plant'), icon: 'disc' }, office: { name: l('Escritório no exterior', 'Office abroad'), icon: 'globe' },
  media: { name: l('Mídia', 'Media outlet'), icon: 'radio' }, platform: { name: l('Plataforma', 'Platform'), icon: 'stream' },
  booking: { name: l('Agência', 'Agency'), icon: 'tour-bus' }, rehearsal: { name: l('Sala de ensaio', 'Rehearsal room'), icon: 'drums' },
  imprint: { name: l('Imprints e JVs', 'Imprints & JVs'), icon: 'flag' }, sublabel: { name: l('Subselo', 'Sub-label'), icon: 'platinum-disc' },
  home: { name: l('Sua casa', 'Your home'), icon: 'house' }, store: { name: l('Loja do selo', 'Label store'), icon: 'cd' },
  sign: { name: l('Letreiro', 'Rooftop sign'), icon: 'star' }, dorm: { name: l('Casa dos artistas', 'Artists\' house'), icon: 'sleep' },
  park: { name: l('Praça dos fãs', 'Fan plaza'), icon: 'fans' },
};
export const STATE18: Record<BState, L> = {
  planned: l('Planejado', 'Planned'), building: l('Em obras', 'Under construction'), open: l('Aberto', 'Open'), renovating: l('Em reforma', 'Renovating'),
  damaged: l('Danificado', 'Damaged'), closed: l('Fechado', 'Closed'), sold: l('Vendido', 'Sold'),
};

// ---------------------------------------------------------------- lotes do campus (grade isométrica 20×16)

export interface Lot18 { gx: number; gy: number; w: number; d: number; name: L; pm: number; vis: number }
/** Lote 0 = sede; 11 = residencial (sua casa). Ruas: avenida em gy 7–8, rua em gx 9–10. */
export const LOTS18: Lot18[] = [
  { gx: 11, gy: 1, w: 6, d: 6, name: l('Esquina principal', 'Main corner'), pm: 1.5, vis: 1.5 },
  { gx: 17, gy: 3, w: 3, d: 4, name: l('Lote leste da avenida', 'East avenue lot'), pm: 1.1, vis: 1.1 },
  { gx: 4, gy: 2, w: 5, d: 5, name: l('Esquina noroeste', 'Northwest corner'), pm: 1.3, vis: 1.3 },
  { gx: 0, gy: 3, w: 4, d: 4, name: l('Fundos a oeste', 'West back lot'), pm: 0.8, vis: 0.8 },
  { gx: 11, gy: 9, w: 5, d: 4, name: l('Esquina sudeste', 'Southeast corner'), pm: 1.3, vis: 1.3 },
  { gx: 16, gy: 9, w: 4, d: 4, name: l('Lote da avenida sul', 'South avenue lot'), pm: 1.1, vis: 1.1 },
  { gx: 4, gy: 9, w: 5, d: 4, name: l('Esquina sudoeste', 'Southwest corner'), pm: 1.3, vis: 1.3 },
  { gx: 0, gy: 9, w: 4, d: 4, name: l('Lote oeste', 'West lot'), pm: 0.9, vis: 0.9 },
  { gx: 16, gy: 13, w: 4, d: 3, name: l('Fundos sudeste', 'Southeast back lot'), pm: 0.75, vis: 0.7 },
  { gx: 11, gy: 13, w: 5, d: 3, name: l('Rua de trás', 'Back street'), pm: 0.8, vis: 0.8 },
  { gx: 4, gy: 13, w: 5, d: 3, name: l('Travessa', 'Side alley'), pm: 0.75, vis: 0.7 },
  { gx: 0, gy: 13, w: 4, d: 3, name: l('Bairro residencial', 'Residential corner'), pm: 0.9, vis: 0.6 },
  { gx: 17, gy: 0, w: 3, d: 3, name: l('Beco norte', 'North alley'), pm: 0.7, vis: 0.6 },
  { gx: 0, gy: 0, w: 4, d: 3, name: l('Terreno do rio', 'Riverside plot'), pm: 0.85, vis: 0.8 },
];
export const HOME_LOT18 = 11;

// ---------------------------------------------------------------- prédios derivados do estado

const sizeByCap = (cap: number) => (cap < 400 ? 1 : cap < 1500 ? 2 : cap < 4000 ? 3 : cap < 12000 ? 4 : 5);
const isHome = (s: GameState, city: string) => !city || city === s.config.homeCity;
const cname = (id: string): string => cityById[id]?.name.pt ?? id;
const VK: Record<VKind, BKind> = { festival: 'fest', publisher: 'publisher', studio: 'studio', booking: 'booking', media: 'media', platform: 'platform' };
const VAREA: Record<VKind, Goto18> = {
  festival: { area: 'festivals' }, publisher: { area: 'publishing16' }, studio: { area: 'studio12' }, booking: { area: 'tour12' }, media: { area: 'outlets16' }, platform: { area: 'platform16' },
};
const $k = (s: GameState, c: number) => { const v = c / 100; return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`; };

/** Ano em que a sede chegou ao nível atual (retratos do hq8 ajudam em saves antigos). */
function hqSince(s: GameState): number {
  const st = campus18(s);
  if (st.lvl.hq === s.player.hq + 1 && st.ren.hq) return st.ren.hq;
  const h = hq8(s).hist;
  let y = s.year;
  for (let i = h.length - 1; i >= 0 && h[i].hq === s.player.hq; i--) y = h[i].y;
  return Math.min(y, s.year);
}

/** Todos os prédios do jogador agora (sem mudar o estado). */
export function buildings18(s: GameState): Bld18[] {
  const st = campus18(s);
  const out: Bld18[] = [];
  const add = (b: Omit<Bld18, 'zone' | 'since' | 'sy' | 'st'> & Partial<Pick<Bld18, 'since' | 'sy' | 'st' | 'zone'>>) => {
    const since = b.since ?? st.born[b.id] ?? s.year;
    out.push({ zone: isHome(s, b.city) ? 'campus' : 'world', st: 'open', ...b, since, sy: b.sy ?? st.ren[b.id] ?? since });
  };
  // sede
  const hqY = hqSince(s);
  const sl = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  const rec = s.sessions.filter((x) => !x.done && sl.some((a) => a.id === x.actId));
  const depts = Object.values(hq6(s).depts).filter((v) => (v ?? 0) > 0).length;
  add({
    id: 'hq', kind: 'hq', name: `${s.config.companyName} — ${HQ_LEVELS[s.player.hq].name.pt}`, city: s.config.homeCity, lvl: s.player.hq + 1, since: st.born.hq ?? hqY, sy: hqY,
    staff: s.player.staff.length, goto: { area: 'hq' },
    kpi: [[l('Nível', 'Level'), HQ_LEVELS[s.player.hq].name.pt], [l('Equipe', 'Staff'), String(s.player.staff.length)], [l('Departamentos', 'Departments'), String(depts)],
      [l('Prédio', 'Building'), hq6(s).ownBuilding ? 'próprio / owned' : `aluguel / rent ${$k(s, money(s, HQ_LEVELS[s.player.hq].rent))}`], [l('Elenco', 'Roster'), String(sl.length)]],
    now: rec.length ? fmtL(l('Gravando: {a}', 'Recording: {a}'), { a: rec.map((x) => s.acts[x.actId]?.name ?? '?').slice(0, 3).join(', ') }) : l('Escritórios abertos; estúdio livre.', 'Offices open; studio free.'),
  });
  // filiais
  for (const b of s.branches ?? []) add({ id: `br:${b.id}`, kind: 'branch', name: b.name, city: b.city, lvl: b.level + 1, since: st.born[`br:${b.id}`] ?? s.year, goto: { area: 'hq' },
    kpi: [[l('Nível', 'Level'), BRANCH_LEVELS[b.level]?.name.pt ?? '?'], [l('Cidade', 'City'), cname(b.city)], [l('Aluguel', 'Rent'), $k(s, money(s, BRANCH_LEVELS[b.level]?.rent ?? 0))]], staff: BRANCH_LEVELS[b.level]?.staff });
  // empreendimentos (ventures9)
  for (const v of ventures(s).list) {
    const k = VK[v.kind];
    const last = v.pl[v.pl.length - 1];
    add({ id: `v:${v.id}`, kind: k, name: v.name, city: v.city, lvl: clamp(v.level, 1, 5), since: st.born[`v:${v.id}`] ?? v.founded, staff: v.staff, goto: VAREA[v.kind],
      kpi: [[l('Nível', 'Level'), String(v.level)], [l('Reputação', 'Reputation'), String(Math.round(v.rep))], [l('Resultado do mês', 'Month result'), last ? $k(s, last.rev - last.cost) : '—']],
      now: v.kind === 'studio' && v.booked?.length ? fmtL(l('{n} reservas de clientes', '{n} client bookings'), { n: v.booked.length }) : v.kind === 'festival' && v.month === s.month ? l('Edição deste mês: palco montado!', 'This month\'s edition: stage is up!') : undefined });
  }
  // casas de shows compradas (venues17)
  for (const o of v17(s).own) {
    const d = vdef(o.id);
    if (!d) continue;
    add({ id: `ve:${o.id}`, kind: 'venue', name: d.name, city: d.city, lvl: sizeByCap(d.cap), since: o.y, sy: st.ren[`ve:${o.id}`] ?? Math.min(o.y, Math.max(d.from, 1889)), worn: o.cond < 40, goto: { area: 'cp17-label', tab: ['cp17-label', 'venues'] },
      kpi: [[l('Capacidade', 'Capacity'), String(d.cap)], [l('Conservação', 'Condition'), `${Math.round(o.cond)}%`], [l('Prestígio', 'Prestige'), String(Math.round(o.rep))]],
      now: o.last ? fmtL(l('Último mês: {n} noites, {a} pessoas', 'Last month: {n} nights, {a} people'), { n: o.last.nights, a: o.last.att }) : undefined, note: o.cond < 40 ? l('Conservação baixa: reboco caindo.', 'Poor condition: plaster falling.') : undefined });
  }
  // casa de shows da carreira (live) e festivais próprios
  const lv = liveOf(s);
  if (lv.venue) {
    const vv = lv.venue;
    const h = vv.history[vv.history.length - 1];
    add({ id: 'lv:venue', kind: 'venue', name: vv.name, city: vv.cityId, lvl: vv.kind === 'club' ? 1 : vv.kind === 'theater' ? 3 : 5, since: vv.boughtYear, goto: { area: 'cp17-venue' },
      kpi: [[l('Tipo', 'Type'), vv.kind], [l('Acústica', 'Acoustics'), String(Math.round(vv.acoustics))], [l('Ocupação', 'Occupancy'), h ? `${Math.round(h.occupancy * 100)}%` : '—']],
      now: h ? fmtL(l('Último mês: receita {r}', 'Last month: revenue {r}'), { r: $k(s, h.revenue) }) : undefined });
  }
  const vfx = new Set(ventures(s).list.map((v) => v.fx).filter(Boolean));
  for (const f of lv.fests) {
    if (vfx.has(f.id)) continue;
    const e = f.editions[f.editions.length - 1] as { crowd?: number } | undefined;
    add({ id: `fe:${f.id}`, kind: 'fest', name: f.name, city: f.cityId, lvl: clamp(1 + Math.floor((f.w * f.h) / 60), 1, 5), since: f.founded, goto: { area: 'festivals' },
      kpi: [[l('Edições', 'Editions'), String(f.editions.length)], [l('Reputação', 'Reputation'), String(Math.round(f.rep))], [l('Público', 'Crowd'), e?.crowd ? String(e.crowd) : '—']],
      now: f.month === s.month ? l('Edição deste mês!', 'Edition this month!') : undefined });
  }
  // escola, museu
  const so = school18(s).own;
  if (so) add({ id: 'school', kind: 'school', name: OWN18[so.lv].name.pt, city: s.config.homeCity, lvl: so.lv + 1, since: so.since, goto: { area: 'talent18', tab: ['talent18', 'school'] },
    kpi: [[l('Alunos', 'Students'), String(so.students)], [l('Prestígio', 'Prestige'), String(Math.round(so.prest))]], now: so.teacher ? fmtL(l('Aula com {p}', 'Class with {p}'), { p: s.persons[so.teacher]?.name ?? '?' }) : undefined });
  const rw = rel18(s);
  if (rw.wing > 0) add({ id: 'museum', kind: 'museum', name: WING18[rw.wing]?.name.pt ?? 'Museu', city: s.config.homeCity, lvl: rw.wing + 1, goto: { area: 'lendas', tab: ['lendas9', 'relics18'] },
    kpi: [[l('Visitantes/ano', 'Visitors/yr'), String(Math.round(rw.vis))], [l('Receita', 'Income'), $k(s, rw.inc)]] });
  // fábricas
  for (const p of s.x4.industry?.plants ?? []) add({ id: `pl:${p.id}`, kind: 'plant', name: `Fábrica ${cname(p.city)}`, city: p.city, lvl: clamp(p.level + 1, 1, 4), goto: { area: 'industry' },
    kpi: [[l('Capacidade/semana', 'Capacity/week'), String(p.capacity)], [l('Terceiros', 'Contract units'), String(p.contractUnits)]],
    now: (s.x4.industry?.orders ?? []).some((o) => o.ready > s.week) ? fmtL(l('Prensando: {n} pedidos na fila', 'Pressing: {n} orders queued'), { n: (s.x4.industry?.orders ?? []).filter((o) => o.ready > s.week).length }) : undefined });
  // escritórios próprios no exterior (regions18)
  for (const [sub, lc] of Object.entries(reg18(s).loc)) if (lc.mode === 'own') add({ id: `of:${sub}`, kind: 'office', name: subName18(sub).pt, city: `@${sub}`, zone: 'world', lvl: 2, since: lc.since, goto: { area: 'regions18' }, kpi: [[l('Região', 'Region'), subName18(sub).pt], [l('Desde', 'Since'), String(lc.since)]] });
  // banda da casa (sala de ensaio)
  const hb = sess18(s).hb;
  if (hb) add({ id: 'hb', kind: 'rehearsal', name: hb.name, city: s.config.homeCity, lvl: 1, since: hb.since, goto: { area: 'talent18', tab: ['talent18', 'band'] }, staff: hb.players.length,
    kpi: [[l('Sessões', 'Sessions'), String(hb.sess)], [l('Hits', 'Hits'), String(hb.hits)]], now: hb.strike ? l('Em greve!', 'On strike!') : l('Ensaiando', 'Rehearsing') });
  // imprints e JVs (um anexo só)
  const dl = deals18(s), ni = Object.keys(dl.imp).length + dl.jv.length;
  if (ni) add({ id: 'imp', kind: 'imprint', name: l('Imprints e joint ventures', 'Imprints & joint ventures').pt, city: s.config.homeCity, lvl: clamp(ni, 1, 3), goto: { area: 'supply18', tab: ['supply18', 'deals'] },
    kpi: [[l('Imprints', 'Imprints'), String(Object.keys(dl.imp).length)], [l('JVs', 'JVs'), String(dl.jv.length)]] });
  // subselos
  for (const sb of s.subLabels ?? []) if (sb.status !== 'closed') add({ id: `sb:${sb.id}`, kind: 'sublabel', name: sb.name, city: s.config.homeCity, lvl: clamp(1 + Math.floor(sb.roster.length / 3), 1, 3), goto: { area: 'business', tab: ['business-business', 'subs'] },
    kpi: [[l('Elenco', 'Roster'), String(sb.roster.length)], [l('Caixa', 'Cash'), $k(s, sb.cash)], [l('Situação', 'Status'), sb.status]], note: sb.status === 'distress' ? l('Em crise financeira.', 'In financial distress.') : undefined });
  // casa do dono
  const ow = ownerOf(s);
  if (ow.house >= 0 && HOUSES[ow.house]) {
    const hs = HOUSES[ow.house];
    add({ id: 'home', kind: 'home', name: hs.name.pt, city: s.config.homeCity, lvl: clamp(Math.ceil(hs.prestige / 2), 1, 4), sy: st.born.home ?? Math.max(hs.from, s.year - 1), goto: { area: 'wealth' },
      kpi: [[l('Prestígio', 'Prestige'), String(hs.prestige)], [l('Alívio de estresse', 'Stress relief'), String(hs.relief)]] });
  }
  // obras próprias prontas
  for (const k of ['store', 'sign', 'dorm', 'park'] as const) {
    const b = st.built[k];
    if (b) add({ id: `c:${k}`, kind: k, name: KIND18[k].name.pt, city: s.config.homeCity, lvl: 1 + b.q, since: b.y, lot: b.lot, goto: { area: 'campus18' }, kpi: effectKpi(s, k) });
  }
  // dano, reforma, obras em andamento
  for (const b of out) {
    if (st.dmg[b.id]) { b.st = 'damaged'; b.note = st.dmg[b.id].why; }
    const rp = st.proj.find((p) => p.kind === 'reno' && p.target === b.id);
    if (rp) { b.st = 'renovating'; b.prog = 1 - rp.left / Math.max(1, rp.months); }
  }
  for (const p of st.proj) if (p.kind !== 'reno') {
    const prog = 1 - p.left / Math.max(1, p.months);
    out.push({ id: `c:${p.kind}`, kind: p.kind, name: KIND18[p.kind].name.pt, city: s.config.homeCity, zone: 'campus', lvl: 1 + p.q, st: mIdx(s) - p.start < 1 ? 'planned' : 'building', since: Math.floor(p.start / 12), sy: s.year, prog, lot: p.lot,
      goto: { area: 'campus18' }, kpi: [[l('Obra', 'Works'), `${Math.round(prog * 100)}%`], [l('Faltam', 'Left'), `${p.left} m`], [l('Atrasos', 'Delays'), String(p.delays)]] });
  }
  // vendidos/fechados há pouco (ficam visíveis por 2 anos com placa)
  for (const g of st.gone) if (s.year - g.y <= 1 && !out.some((b) => b.id === g.id))
    out.push({ id: g.id, kind: g.kind, name: g.name, city: g.city, zone: isHome(s, g.city) ? 'campus' : 'world', lvl: g.lvl, st: g.how, since: g.sy, sy: g.sy, lot: g.lot, note: fmtL(l('{h} em {y}.', '{h} in {y}.'), { h: g.how === 'sold' ? l('Vendido', 'Sold') : l('Fechado', 'Closed'), y: g.y }) });
  return out;
}

/** Lotes: fixos já atribuídos + preenchimento determinístico (não muda o estado). */
export function layout18(s: GameState, bs: Bld18[]): Map<string, number> {
  const st = campus18(s);
  const m = new Map<string, number>();
  const used = new Set<number>();
  const fix = (id: string, n: number) => { m.set(id, n); used.add(n); };
  for (const b of bs) if (b.zone === 'campus') {
    if (b.kind === 'hq') fix(b.id, 0);
    else if (b.kind === 'home') fix(b.id, HOME_LOT18);
    else if (b.lot !== undefined) fix(b.id, b.lot);
    else if (st.lot[b.id] !== undefined && !used.has(st.lot[b.id])) fix(b.id, st.lot[b.id]);
  }
  for (const p of st.proj) used.add(p.lot);
  const order = bs.filter((b) => b.zone === 'campus' && !m.has(b.id)).sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
  for (const b of order) {
    const n = LOTS18.findIndex((_, i) => !used.has(i) && i !== HOME_LOT18);
    if (n < 0) break;
    fix(b.id, n);
  }
  return m;
}
/** Lotes livres para uma obra nova. */
export function freeLots18(s: GameState): number[] {
  const m = layout18(s, buildings18(s));
  const used = new Set(m.values());
  return LOTS18.map((_, i) => i).filter((i) => i !== 0 && !used.has(i) && !(i === HOME_LOT18 && ownerOf(s).house >= 0));
}

// ---------------------------------------------------------------- obras

export const CONTRACTORS18: { name: L; cost: number; delay: number; over: number; eff: number; desc: L }[] = [
  { name: l('Empreiteiro barato', 'Cheap contractor'), cost: 0.8, delay: 0.3, over: 0.25, eff: 0.85, desc: l('Preço baixo; atrasa e estoura o orçamento com frequência; acabamento fraco.', 'Low price; often late and over budget; weak finish.') },
  { name: l('Construtora padrão', 'Standard builder'), cost: 1, delay: 0.14, over: 0.12, eff: 1, desc: l('Prazo e custo razoáveis.', 'Reasonable time and cost.') },
  { name: l('Construtora premium', 'Premium builder'), cost: 1.35, delay: 0.05, over: 0.04, eff: 1.15, desc: l('Cara, pontual; prédio caprichado rende mais.', 'Expensive, punctual; a polished building yields more.') },
];
export interface PDef18 { name: L; desc: L; effect: L; cost: number; months: number; from: number }
export const PROJ18: Record<Exclude<PKind, 'reno'>, PDef18> = {
  store: { name: l('Loja do selo', 'Label store'), desc: l('Discos, partituras (antes de 1950), pôsteres e camisetas na porta da sede.', 'Records, sheet music (pre-1950), posters and T-shirts at the HQ door.'),
    effect: l('Receita mensal pela fama do elenco × visibilidade do lote.', 'Monthly income from roster fame × lot visibility.'), cost: 18000, months: 4, from: 0 },
  sign: { name: l('Letreiro no telhado', 'Rooftop sign'), desc: l('Pintado, depois neon (1925), luminoso (1960), LED (1995), holográfico (2030).', 'Painted, then neon (1925), backlit (1960), LED (1995), holographic (2030).'),
    effect: l('+reputação comercial por ano (mais em lote visível).', '+commercial reputation per year (more on a visible lot).'), cost: 9000, months: 2, from: 0 },
  dorm: { name: l('Casa dos artistas', 'Artists\' house'), desc: l('Quartos e cozinha para o elenco que mora na cidade.', 'Rooms and a kitchen for roster members living in town.'),
    effect: l('Todo mês alivia o estresse de até 12 integrantes do elenco da cidade.', 'Every month relieves stress for up to 12 local roster members.'), cost: 60000, months: 8, from: 0 },
  park: { name: l('Praça dos fãs', 'Fan plaza'), desc: l('Mural, bancos e o palco de rua onde os fãs se juntam depois de um hit.', 'A mural, benches and a street stage where fans gather after a hit.'),
    effect: l('+reputação com artistas por ano; multidões maiores depois de um hit.', '+reputation with artists per year; bigger crowds after a hit.'), cost: 25000, months: 4, from: 0 },
};
export const renoCost18 = (s: GameState, b: Bld18): number => money(s, (b.kind === 'hq' ? HQ_LEVELS[s.player.hq].upgradeCost * 0.25 + 6000 : 8000 + b.lvl * 9000) * (campus18(s).dmg[b.id] ? 1.3 : 1));
export const renoMonths18 = (b: Bld18): number => clamp(2 + b.lvl, 3, 8);
export const lotMult18 = (n: number): number => LOTS18[n]?.pm ?? 1;
export function projCost18(s: GameState, k: PKind, lot: number, q: number, target?: Bld18): number {
  const base = k === 'reno' ? (target ? renoCost18(s, target) : 0) : money(s, PROJ18[k].cost) * lotMult18(lot);
  return Math.round(base * CONTRACTORS18[q].cost);
}

/** Começa uma obra: 30% de entrada (capex), o resto em parcelas mensais. */
export function startProj18(s: GameState, k: PKind, lot: number, q: number, targetId?: string): L | null {
  const st = campus18(s);
  if (!CONTRACTORS18[q]) return l('Escolha um empreiteiro.', 'Pick a contractor.');
  let target: Bld18 | undefined;
  let months: number;
  if (k === 'reno') {
    target = buildings18(s).find((b) => b.id === targetId);
    if (!target || target.st === 'sold' || target.st === 'closed' || target.st === 'building' || target.st === 'planned') return l('Esse prédio não pode ser reformado agora.', 'That building can\'t be renovated now.');
    if (st.proj.some((p) => p.target === targetId)) return l('Já está em reforma.', 'Already being renovated.');
    months = renoMonths18(target);
    lot = -1;
  } else {
    if (st.built[k] || st.proj.some((p) => p.kind === k)) return l('Você já tem (ou está construindo) isso.', 'You already have (or are building) that.');
    if (!freeLots18(s).includes(lot)) return l('Lote ocupado.', 'Lot taken.');
    months = PROJ18[k].months;
  }
  if (q === 0) months = Math.max(1, months - 1);
  const cost = projCost18(s, k, lot, q, target);
  const first = Math.round(cost * 0.3);
  if (s.player.cash < first) return l('Caixa insuficiente para a entrada (30%).', 'Not enough cash for the 30% down payment.');
  const id = `cp${++st.seq}`;
  post(s, `campus18:${id}:0`, -first, 'capex', `Obra (entrada): ${k === 'reno' ? 'reforma ' + target!.name : PROJ18[k as Exclude<PKind, 'reno'>].name.pt}`);
  st.proj.push({ id, kind: k, target: targetId, lot, q, start: mIdx(s), months, left: months, cost, paid: first, over: 0, delays: 0 });
  const what = k === 'reno' ? fmtL(l('reforma de {b}', 'renovation of {b}'), { b: target!.name }) : PROJ18[k as Exclude<PKind, 'reno'>].name;
  log(s, fmtL(l('Obra iniciada: {w} ({c}, {m} meses).', 'Works started: {w} ({c}, {m} months).'), { w: what, c: CONTRACTORS18[q].name, m: months }));
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 10, visibility: 'public', tags: ['campus', 'construction'], src: 'campus18', text: fmtL(l('{c} começa obra: {w}.', '{c} breaks ground: {w}.'), { c: s.config.companyName, w: what }) });
  return null;
}
/** Cancela: o que foi pago fica com o empreiteiro. */
export function cancelProj18(s: GameState, id: string): L | null {
  const st = campus18(s);
  const p = st.proj.find((x) => x.id === id);
  if (!p) return l('Obra não encontrada.', 'Works not found.');
  st.proj = st.proj.filter((x) => x !== p);
  log(s, fmtL(l('Obra cancelada; {v} já pagos não voltam.', 'Works cancelled; {v} already paid is lost.'), { v: $k(s, p.paid) }));
  return null;
}
/** Hora extra: paga 12% do contrato para recuperar um mês. */
export function rushProj18(s: GameState, id: string): L | null {
  const p = campus18(s).proj.find((x) => x.id === id);
  if (!p || p.left <= 1) return l('Nada a acelerar.', 'Nothing to speed up.');
  const c = Math.round(p.cost * 0.12);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `campus18:${p.id}:rush:${p.left}`, -c, 'capex', 'Obra: hora extra');
  p.paid += c; p.left -= 1;
  return null;
}

function finish(s: GameState, p: Proj18): void {
  const st = campus18(s);
  st.proj = st.proj.filter((x) => x !== p);
  let what: L;
  if (p.kind === 'reno') {
    st.ren[p.target!] = s.year;
    delete st.dmg[p.target!];
    what = fmtL(l('Reforma concluída: o prédio agora tem cara de {y}.', 'Renovation done: the building now looks like {y}.'), { y: styleName18(styleOf18(s.year)) });
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
  } else {
    st.built[p.kind] = { lot: p.lot, y: s.year, q: p.q };
    st.born[`c:${p.kind}`] = s.year;
    st.lot[`c:${p.kind}`] = p.lot;
    what = fmtL(l('Inaugurado: {n} ({l}).', 'Opened: {n} ({l}).'), { n: PROJ18[p.kind].name, l: LOTS18[p.lot].name });
  }
  log(s, what);
  remember(s, 'hq', fmtL(l('{c}: {w}', '{c}: {w}'), { c: s.config.companyName, w: what }), { important: p.kind !== 'sign' });
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 18, visibility: 'public', tags: ['good', 'campus', 'opening'], src: 'campus18', text: fmtL(l('{c} — {w}', '{c} — {w}'), { c: s.config.companyName, w: what }) });
  pushInbox18(s, 'campus18', { from: CONTRACTORS18[p.q].name.pt, subject: l('Obra entregue', 'Works handed over'), body: fmtL(l('{w} Atrasos: {d}. Estouro: {o}.', '{w} Delays: {d}. Overrun: {o}.'), { w: what, d: p.delays, o: $k(s, p.over) }), tone: 'good', ref: { proj: p.id } });
}

/** Mês da obra: parcela, chance de atraso/estouro (com aviso e escolha), entrega. */
export function monthProj18(s: GameState): void {
  const st = campus18(s);
  for (const p of [...st.proj]) {
    const c = CONTRACTORS18[p.q];
    const r = Rng.fromSeed(`${s.config.seed}|campus18|${p.id}|${mIdx(s)}`);
    if (mIdx(s) <= p.start) continue;
    const inst = Math.round(Math.max(0, p.cost + p.over - p.paid) / Math.max(1, p.left));
    if (inst > 0) { post(s, `campus18:${p.id}:m${mIdx(s)}`, -inst, 'capex', 'Obra: parcela do mês'); p.paid += inst; }
    // inverno e chuva atrasam mais; empreiteiro barato atrasa muito mais
    const wet = [5, 6, 0, 1].includes(s.month) ? 1.25 : 1;
    if (p.left > 1 && r.chance((c.delay * wet) / Math.max(2, p.months / 2))) {
      const d = r.int(1, 2);
      p.left += d; p.delays += d;
      const why = r.pick([l('falta de material', 'material shortage'), l('chuva', 'rain'), l('greve dos operários', 'a workers\' strike'), l('a fiscalização da prefeitura', 'city inspectors'), l('fundação mais funda que o previsto', 'foundations deeper than planned')]);
      log(s, fmtL(l('Atraso de {d} mês(es): {w}.', '{d}-month delay: {w}.'), { d, w: why }));
      if (p.asked !== mIdx(s)) {
        p.asked = mIdx(s);
        pushInbox18(s, 'campus18', { from: c.name.pt, subject: l('Obra atrasada', 'Works delayed'), body: fmtL(l('{w}. Faltam {m} meses. Hora extra recupera 1 mês por {v}.', '{w}. {m} months left. Overtime recovers 1 month for {v}.'), { w: why, m: p.left, v: $k(s, Math.round(p.cost * 0.12)) }),
          tone: 'bad', actions: [{ id: 'rush', label: l('Pagar hora extra', 'Pay overtime') }, { id: 'wait', label: l('Esperar', 'Wait') }], weeks: 4, ref: { proj: p.id } });
      }
    }
    if (r.chance(c.over / Math.max(2, p.months))) {
      const o = Math.round(p.cost * r.float(0.06, 0.18));
      p.over += o;
      log(s, fmtL(l('Estouro de orçamento: +{v}.', 'Budget overrun: +{v}.'), { v: $k(s, o) }));
      notify(s, fmtL(l('Obra estoura o orçamento em {v}.', 'Works go {v} over budget.'), { v: $k(s, o) }), 'bad');
    }
    p.left -= 1;
    if (p.left <= 0) {
      const rest = p.cost + p.over - p.paid;
      if (rest > 0) { post(s, `campus18:${p.id}:end`, -rest, 'capex', 'Obra: acerto final'); p.paid += rest; }
      finish(s, p);
    }
  }
}

// ---------------------------------------------------------------- efeitos das obras prontas

export function storeIncome18(s: GameState): number {
  const b = campus18(s).built.store;
  if (!b) return 0;
  const fame = playerActs(s).reduce((t, id) => t + (s.acts[id]?.fame ?? 0), 0);
  return Math.round(money(s, 250 + Math.min(fame, 400) * 9) * (LOTS18[b.lot]?.vis ?? 1) * CONTRACTORS18[b.q].eff);
}
export const storeUpkeep18 = (s: GameState): number => (campus18(s).built.store ? money(s, 450) : 0);
export const signRep18 = (s: GameState): number => { const b = campus18(s).built.sign; return b ? Math.round(15 * (LOTS18[b.lot]?.vis ?? 1) * CONTRACTORS18[b.q].eff) / 10 : 0; };
export const parkRep18 = (s: GameState): number => { const b = campus18(s).built.park; return b ? Math.round(10 * CONTRACTORS18[b.q].eff) / 10 : 0; };
function dormPeople(s: GameState): string[] {
  const b = campus18(s).built.dorm;
  if (!b) return [];
  return playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.city === s.config.homeCity).flatMap((a) => a.members).slice(0, 12);
}
function effectKpi(s: GameState, k: Exclude<PKind, 'reno'>): [L, string][] {
  if (k === 'store') return [[l('Receita/mês', 'Income/mo'), $k(s, storeIncome18(s))], [l('Custo/mês', 'Cost/mo'), $k(s, storeUpkeep18(s))]];
  if (k === 'sign') return [[l('Reputação comercial/ano', 'Commercial rep/yr'), `+${signRep18(s)}`]];
  if (k === 'park') return [[l('Reputação com artistas/ano', 'Artist rep/yr'), `+${parkRep18(s)}`]];
  return [[l('Moradores', 'Residents'), String(dormPeople(s).length)], [l('Estresse/mês', 'Stress/mo'), '−3']];
}

// ---------------------------------------------------------------- vida em volta (derivada de fatos recentes)

export type Amb18 = 'fans' | 'protest' | 'police' | 'press' | 'show' | 'smoke';
/** O que está acontecendo em volta dos prédios agora (sem estado próprio). */
export function ambient18(s: GameState): { k: Amb18; at: string; why: L }[] {
  const mine = new Set([...playerActs(s), 'player']);
  const out: { k: Amb18; at: string; why: L }[] = [];
  const top = s.charts.singles.slice(0, 5).find((e) => s.releases[e.releaseId]?.owner === 'player');
  if (top) out.push({ k: 'fans', at: 'hq', why: fmtL(l('{t} está no top 5: fãs na porta da sede.', '{t} is in the top 5: fans at the HQ door.'), { t: s.releases[top.releaseId].title }) });
  const rf = (kind: string, months = 2) => recentFacts(s, { kind, months, limit: 20 }).filter((f) => f.visibility !== 'secret' && f.actors.some((a) => mine.has(a)));
  const sc = rf('scandal');
  if (sc.length) out.push({ k: 'protest', at: 'hq', why: sc[sc.length - 1].text });
  const ar = rf('arrest', 1);
  if (ar.length) out.push({ k: 'police', at: 'hq', why: ar[ar.length - 1].text });
  const aw = rf('award', 2);
  if (aw.length || sc.length) out.push({ k: 'press', at: 'hq', why: (aw[aw.length - 1] ?? sc[sc.length - 1]).text });
  for (const o of v17(s).own) if (o.last?.nights) out.push({ k: 'show', at: `ve:${o.id}`, why: l('Noite de show: fila na porta.', 'Show night: a queue at the door.') });
  if (liveOf(s).venue) out.push({ k: 'show', at: 'lv:venue', why: l('Noite de show: fila na porta.', 'Show night: a queue at the door.') });
  for (const id of Object.keys(campus18(s).dmg)) out.push({ k: 'smoke', at: id, why: campus18(s).dmg[id].why });
  return out;
}

// ---------------------------------------------------------------- retrato anual (compacto)

const KC = Object.keys(KIND18) as BKind[];
const SC: BState[] = ['planned', 'building', 'open', 'renovating', 'damaged', 'closed', 'sold'];
/** Codifica: kind.lvl.state.sy.lot.prog|zone|city|name ; separados por ';' */
export function encode18(s: GameState, bs: Bld18[]): string {
  const lots = layout18(s, bs);
  return bs.map((b) => [KC.indexOf(b.kind), b.lvl, SC.indexOf(b.st), b.sy, lots.get(b.id) ?? -1, Math.round((b.prog ?? 1) * 9), b.zone === 'world' ? 1 : 0, b.city, b.name.replace(/[;|]/g, ' ').slice(0, 40), b.id].join('|')).join(';');
}
export function decode18(str: string): Bld18[] {
  if (!str) return [];
  return str.split(';').map((x) => {
    const [k, lvl, st, sy, lot, pr, z, city, name, id] = x.split('|');
    return { id: id ?? name, kind: KC[+k] ?? 'hq', lvl: +lvl, st: SC[+st] ?? 'open', since: +sy, sy: +sy, lot: +lot >= 0 ? +lot : undefined, prog: +pr / 9, zone: z === '1' ? 'world' : 'campus', city, name };
  });
}
export function snapshot18(s: GameState): void {
  const st = campus18(s);
  const b = encode18(s, buildings18(s));
  const last = st.snaps[st.snaps.length - 1];
  if (last && last.y === s.year) last.b = b; else st.snaps.push({ y: s.year, b });
  if (st.snaps.length > 170) st.snaps.splice(0, st.snaps.length - 170);
}

// ---------------------------------------------------------------- sincronização mensal

/** Grava nascimento/nível/lote de cada prédio, detecta vendas/fechamentos e aplica efeitos. */
export function sync18(s: GameState): void {
  const st = campus18(s);
  const bs = buildings18(s);
  const ids = new Set(bs.map((b) => b.id));
  for (const b of bs) {
    if (b.st === 'sold' || b.st === 'closed' || b.st === 'building' || b.st === 'planned') continue;
    st.born[b.id] ??= b.since;
    st.nm[b.id] = [b.name, b.city, b.kind];
    if (st.lvl[b.id] !== undefined && st.lvl[b.id] !== b.lvl && b.kind !== 'venue') { st.ren[b.id] = s.year; log(s, fmtL(l('{n} muda de tamanho (nível {a} → {b}).', '{n} changes size (level {a} → {b}).'), { n: b.name, a: st.lvl[b.id], b: b.lvl })); }
    st.lvl[b.id] = b.lvl;
  }
  if (st.lvl.hq !== undefined && !st.ren.hq) st.ren.hq = st.born.hq ?? s.year;
  // sumiu: vendido (casas de shows, selo, filiais) ou fechado
  for (const id of Object.keys(st.lvl)) if (!ids.has(id) && !id.startsWith('c:')) {
    const lot = st.lot[id];
    const [name, city, k] = st.nm[id] ?? [id, s.config.homeCity, 'hq' as BKind];
    const how = id.startsWith('ve:') || id === 'home' || id.startsWith('v:') || id === 'lv:venue' ? 'sold' : 'closed';
    st.gone.push({ id, kind: k, name, city, lvl: st.lvl[id], sy: st.ren[id] ?? st.born[id] ?? s.year, lot, y: s.year, how });
    log(s, fmtL(l('{n} deixou de ser seu ({h}).', '{n} is no longer yours ({h}).'), { n: name, h: how === 'sold' ? l('vendido', 'sold') : l('fechado', 'closed') }));
    emitFact(s, { kind: 'deal', actors: ['player'], place: city, severity: 12, visibility: 'public', tags: ['campus', how], src: 'campus18', text: fmtL(l('{c} se desfaz de {n}.', '{c} lets go of {n}.'), { c: s.config.companyName, n: name }) });
    delete st.lvl[id]; delete st.lot[id]; delete st.nm[id];
  }
  st.gone = st.gone.filter((g) => s.year - g.y <= 1);
  // fixa os lotes atribuídos
  const m = layout18(s, bs);
  for (const [id, n] of m) if (!id.startsWith('c:') || st.built[id.slice(2) as 'store']) st.lot[id] = n;
  for (const id of Object.keys(st.dmg)) if (!ids.has(id)) delete st.dmg[id];
}

registerSimHook('month', 'campus18', (s) => {
  const st = campus18(s);
  sync18(s);
  monthProj18(s);
  // efeitos
  const inc = storeIncome18(s);
  if (inc) post(s, `campus18:store:${mIdx(s)}`, inc - storeUpkeep18(s), 'merch', 'Loja do selo');
  for (const pid of dormPeople(s)) addStress(s, pid, -3, l('Casa dos artistas', 'Artists\' house'));
  // dano sem reforma: aluguel provisório
  const d = Object.keys(st.dmg);
  if (d.length) post(s, `campus18:dmg:${mIdx(s)}`, -money(s, 900 * d.length), 'hq', 'Espaço provisório (prédio danificado)');
});
registerSimHook('year', 'campus18y', (s) => {
  const sr = signRep18(s), pr = parkRep18(s);
  if (sr) s.player.reputation.commercial = clamp(s.player.reputation.commercial + sr, 0, 100);
  if (pr) s.player.reputation.artists = clamp(s.player.reputation.artists + pr, 0, 100);
  snapshot18(s);
});

// incêndio (crime17) num ato seu, ou desastre grave na cidade-sede → dano
onFact('disaster', (s, f) => {
  const st = campus18(s);
  const mine = f.actors.some((a) => a === 'player' || playerActs(s).includes(a));
  const home = f.place === s.config.homeCity;
  if (!mine && !(home && f.severity >= 60)) return;
  const target = mine ? (ventures(s).list.find((v) => v.kind === 'studio' && isHome(s, v.city)) ? `v:${ventures(s).list.find((v) => v.kind === 'studio' && isHome(s, v.city))!.id}` : 'hq') : 'hq';
  st.dmg[target] = { w: s.week, sev: f.severity, why: f.text };
  log(s, fmtL(l('Dano: {t}', 'Damage: {t}'), { t: f.text }));
  pushInbox18(s, 'campus18', { from: 'Seguradora', subject: l('Prédio danificado', 'Building damaged'), body: fmtL(l('{t} Até a reforma, você paga um espaço provisório todo mês. Reforme em "Nosso mundo".', '{t} Until it is renovated you pay for temporary space every month. Renovate in "Our world".'), { t: f.text }), tone: 'bad', ref: { b: target } });
}, 'campus18-dmg');

registerInboxKind('campus18', {
  label: l('Obras', 'Construction'), cat: 'money', icon: 'building', prio: 1,
  goto: () => ({ area: 'campus18', label: l('Ver no mapa', 'See on the map') }),
  handle: (s, m, action) => {
    const id = String(m.ref?.proj ?? '');
    if (action === 'rush') return rushProj18(s, id) ?? l('Hora extra paga: um mês a menos.', 'Overtime paid: one month less.');
    return l('A obra segue no ritmo do empreiteiro.', 'The works go on at the contractor\'s pace.');
  },
});
registerAdvisorTip('campus18', (s) => {
  const st = campus18(s);
  const tips = [];
  if (Object.keys(st.dmg).length) tips.push({ id: 'campus-dmg', level: 'warn' as const, text: l('Prédio danificado custa aluguel provisório todo mês.', 'A damaged building costs temporary rent every month.'), why: [l('Reforme em Nosso mundo para parar o custo.', 'Renovate in Our world to stop the cost.')], goto: { area: 'campus18' } });
  return tips;
});
