// Rodada 16 — formações vivas. Quem sai de uma banda não some: segue solo, monta banda nova com outros músicos
// livres (supergrupo quando os dois vêm de nomes grandes), entra em outra banda ou volta para a antiga.
// - Motivos de saída (NPC e elenco do jogador): diferenças criativas (relação ruim com o líder, ressentimento),
//   ambição solo (a pessoa ficou maior que a banda), rixa entre parentes (kin15) e dependência.
// - No seu elenco a saída vira decisão: convencer a ficar, manter sob contrato em carreira solo ou liberar.
// - Histórico de formação: um diff mensal das formações de TODOS os sistemas (dados reais, lifecycle7, kin15,
//   colapsos…) alimenta a linha do tempo da página do ato e a "trajetória" da pessoa.
// - Modos de história (history15): "exata" não inventa nada para atos reais intocados nem para pessoas reais;
//   "com variações" só diminui a chance; "aleatória" deixa a simulação livre.
// - Renomes reais (The Jackson 5 → The Jacksons, 1975) e a fama que acompanha a pessoa no solo novo.

import { clamp, Rng, seedState } from '../../core/rng';
import { RENAMES16 } from '../../data/lineups16';
import { REAL_CLASSIC } from '../../data/realacts_classic';
import { REAL_ACTS } from '../../data/realnames';
import { familyOf, l, type L } from '../../data/world';
import { startSoloCareer } from '../dynasty';
import { deferEvents, registerExt4, registerSimHook } from '../ext4';
import { histLocked, histMode } from '../history15';
import { bandName, langForCity, makeAct } from '../people';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { personFame } from './fame15';
import { feudOf15 } from './kin15';
import { replaceMember } from './lifecycle7';
import { canonKey, REAL_ALL, REAL_BASE, realDataOf, rw } from './realworld';
import { actsTouched17 } from '../actidx17';

export type Why16 = 'creative' | 'solo' | 'feud' | 'addiction' | 'left';
type Ev16 = [number, string, string, 'j' | 'l'];
export interface L16 {
  /** [mês absoluto, ato, pessoa, j=entrou | l=saiu] */
  ev: Ev16[];
  /** nomes anteriores por ato: [ano da troca, nome antigo] */
  names: Record<string, [number, string][]>;
  /** músicos livres depois de sair: pessoa → [mês, ato de origem, motivo] */
  free: Record<string, [number, string, Why16]>;
  /** atos já checados para a fama herdada */
  boost: Record<string, 1>;
}
declare module '../ext4' { interface Ext4 { l16: L16 } }
registerExt4('l16', () => ({ ev: [], names: {}, free: {}, boost: {} }));
export const l16 = (s: GameState): L16 => {
  const st = (s as unknown as { x4: { l16: L16 } }).x4.l16;
  st.ev ??= []; st.names ??= {}; st.free ??= {}; st.boost ??= {};
  return st;
};

const mIdx = (s: GameState) => s.year * 12 + s.month;
const live = (a: Act) => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';
const mineAct = (a: Act) => a.owner === 'player' || !!a.playerBand;
const front = (a: Act, p: Person) => a.leaderId === p.id || p.role === 'vocal' || p.role === 'mc';
// índice pessoa → atos ativos (refeito por semana ou quando este sistema muda uma formação)
let BUMP = 0;
const ACTIVE = new WeakMap<GameState, { k: string; m: Map<string, string[]> }>();
function activeIdx(s: GameState): Map<string, string[]> {
  const k = `${s.week}|${BUMP}`;
  let c = ACTIVE.get(s);
  if (!c || c.k !== k) {
    const m = new Map<string, string[]>();
    for (const a of Object.values(s.acts)) if (live(a)) for (const id of a.members) { const xs = m.get(id); if (xs) xs.push(a.id); else m.set(id, [a.id]); }
    c = { k, m }; ACTIVE.set(s, c);
  }
  return c.m;
}
const inActive = (s: GameState, pid: string, except?: string) => (activeIdx(s).get(pid) ?? []).some((id) => id !== except && s.acts[id]?.members.includes(pid));

export const WHY16: Record<Why16, L> = {
  creative: l('diferenças criativas', 'creative differences'),
  solo: l('ambição solo', 'solo ambition'),
  feud: l('briga de família', 'family feud'),
  addiction: l('dependência', 'addiction'),
  left: l('saída', 'departure'),
};

function formerPush(s: GameState, actId: string, pid: string, reason: 'left' | 'fired'): void {
  const f = (rw(s).former[actId] ??= []);
  if (!f.some((x) => x.personId === pid && x.year === s.year)) f.push({ personId: pid, year: s.year, reason });
}

// ---------------------------------------------------------------- pessoas reais (não inventar no modo exato)

let REALK: Map<string, number> | null = null;
/** nome real canônico → estreia mais tardia de um ato real com essa pessoa (solo ou banda). */
function realKeys(): Map<string, number> {
  if (REALK) return REALK;
  const m = new Map<string, number>();
  const put = (n: string, d: number) => { const k = canonKey(n); m.set(k, Math.max(m.get(k) ?? 0, d)); };
  for (const a of REAL_ALL) { if (!a.m?.length) put(a.n, a.d); for (const x of a.m ?? []) put(x[0], x[4] ?? a.d); }
  for (const [no, ex] of Object.entries(REAL_CLASSIC)) { const n = REAL_ACTS[+no]?.name; if (n && !ex.m?.length) put(n, ex.d ?? 0); for (const x of ex.m ?? []) put(x[0], x[4] ?? ex.d ?? 0); }
  return (REALK = m);
}
/** O roteiro real ainda reserva algo para esta pessoa (não inventar carreira por cima). */
function scripted(s: GameState, p: Person): boolean {
  if (!s.config.realNames) return false;
  const d = realKeys().get(canonKey(p.name));
  if (d === undefined) return false;
  return histMode(s) === 'strict' || (d >= s.year && !s.config.snap17); // r18: sem estreias reais futuras no modo "real até o início"
}
/** Pessoa real fora do modo aleatório: pode sair e seguir solo, mas não entra em bandas inventadas (nem leva estranhos para bandas reais). */
const realBound = (s: GameState, p: Person) => !!s.config.realNames && histMode(s) === 'strict' && realKeys().has(canonKey(p.name)); // r18: fora do exato, história alternativa

// ---------------------------------------------------------------- renomes reais

function renames(s: GameState): void {
  if (!s.config.realNames) return;
  const st = l16(s);
  for (const a of Object.values(s.acts)) {
    if (!a.catalogNo || a.catalogNo < REAL_BASE || a.owner === 'player') continue;
    const d = realDataOf(a);
    if (!d) continue;
    const shift = d.d !== undefined ? a.debutYear - d.d : 0;
    for (const [from, y, to] of RENAMES16) {
      if (d.n !== from || a.name !== from || s.year < y + shift || (histMode(s) !== 'strict' && y + shift >= s.config.startYear)) continue;
      (st.names[a.id] ??= []).push([y + shift, from]);
      a.name = to;
      if (s.week > 0) remember(s, 'lineup', fmtL(l('{a} passa a se chamar {b}.', '{a} is now called {b}.'), { a: from, b: to }), { actId: a.id, important: a.fame > 30 });
    }
  }
}

// ---------------------------------------------------------------- motivos de saída

/** Pressão para sair de cada integrante (0 = nenhuma) e o motivo principal. */
export function pressure16(s: GameState, a: Act, p: Person): { w: number; why: Why16 } {
  const ws: [Why16, number][] = [];
  const lead = s.persons[a.leaderId ?? ''];
  if (lead && lead.id !== p.id && (p.rel[lead.id] ?? 0) < -25) ws.push(['creative', 1]);
  if (p.resentment > 60) ws.push(['creative', 0.8]);
  if (front(a, p) && (p.goal === 'solo' || p.ambition === 'fame') && a.fame > 35) ws.push(['solo', 0.6 + (personFame(s, p.id).v - a.fame > 5 ? 1 : 0)]);
  if (a.members.some((o) => o !== p.id && feudOf15(s, p.id, o) !== undefined)) ws.push(['feud', 1.5]);
  if (p.health === 'addiction') ws.push(['addiction', 1.2]);
  if (!ws.length) return { w: 0, why: 'left' };
  ws.sort((x, y) => y[1] - x[1]);
  return { w: ws.reduce((t, x) => t + x[1], 0), why: ws[0][0] };
}

const WHY_TXT: Record<Why16, L> = {
  creative: l('{p} deixa {a} por diferenças criativas.', '{p} leaves {a} over creative differences.'),
  solo: l('{p} deixa {a}: a fama pessoal ficou maior que a da banda.', '{p} leaves {a}: their own fame outgrew the band.'),
  feud: l('{p} deixa {a} depois da briga em família.', '{p} leaves {a} after the family feud.'),
  addiction: l('{p} é afastado(a) de {a} por causa da dependência.', '{p} is pushed out of {a} over addiction.'),
  left: l('{p} deixa {a}.', '{p} leaves {a}.'),
};

/** Tira a pessoa da banda (sem decidir o destino dela). */
export function leaveBand16(s: GameState, a: Act, p: Person, why: Why16): void {
  if (!a.members.includes(p.id)) return;
  BUMP++;
  a.members = a.members.filter((x) => x !== p.id);
  if (a.leaderId === p.id) a.leaderId = a.members[0];
  formerPush(s, a.id, p.id, why === 'addiction' ? 'fired' : 'left');
  for (const id of a.members) { const q = s.persons[id]; if (q) q.rel[p.id] = clamp((q.rel[p.id] ?? 0) - 8, -100, 100); }
  remember(s, 'member_quits', fmtL(WHY_TXT[why], { p: p.name, a: a.name }), { actId: a.id, important: a.fame > 30 || mineAct(a) });
  if (!a.members.length) { a.status = 'split'; a.careerEnd = s.year; }
}

/** Saída completa de NPC: a banda reage (substituto do mercado, segue menor ou acaba) e a pessoa fica livre. */
export function departNpc16(s: GameState, r: Rng, a: Act, p: Person, why: Why16): void {
  const core = front(a, p);
  leaveBand16(s, a, p, why);
  if (!a.members.length) { freeUp(s, p, a, why); return; }
  const alive = a.members.filter((id) => s.persons[id]?.alive);
  if (core && alive.length <= 1 && r.chance(0.5)) {
    a.status = 'split';
    a.careerEnd = s.year;
    remember(s, 'split', fmtL(l('Sem {p}, {a} chega ao fim.', 'Without {p}, {a} comes to an end.'), { p: p.name, a: a.name }), { actId: a.id, important: a.fame > 30 });
  } else if (r.chance(0.6)) {
    const pick = freePool(s, a.genre, a.id).find((q) => q.role === p.role) ?? undefined;
    if (pick) joinBand(s, pick, a, l('{p} ({o}) assume o lugar de {q} em {a}.', '{p} ({o}) takes over from {q} in {a}.'), p.name);
    else replaceMember(s, r, a, p.id);
  }
  freeUp(s, p, a, why);
}

function freeUp(s: GameState, p: Person, from: Act, why: Why16): void {
  if (p.alive && !p.isPlayer && !inActive(s, p.id)) l16(s).free[p.id] = [mIdx(s), from.id, why];
}

/** Músicos livres (saíram de bandas há pouco, vivos, sem banda ativa) do mesmo universo musical. */
function freePool(s: GameState, genre: string, except: string): Person[] {
  const fam = familyOf(genre);
  return Object.entries(l16(s).free).filter(([pid, f]) => f[1] !== except && s.acts[f[1]] && familyOf(s.acts[f[1]].genre) === fam && s.persons[pid]?.alive && !inActive(s, pid) && s.year - s.persons[pid].born < 66 && !scripted(s, s.persons[pid]) && !realBound(s, s.persons[pid]))
    .map(([pid]) => s.persons[pid]);
}

function joinBand(s: GameState, p: Person, a: Act, txt: L, q = ''): void {
  if (a.members.includes(p.id)) return;
  BUMP++;
  a.members.push(p.id); actsTouched17(s); // r17: índice pessoa→atos
  for (const id of a.members) { const o = s.persons[id]; if (o && o.id !== p.id) { o.rel[p.id] ??= 10; p.rel[o.id] ??= 10; } }
  const from = s.acts[l16(s).free[p.id]?.[1] ?? ''];
  delete l16(s).free[p.id];
  remember(s, 'lineup', fmtL(txt, { p: p.name, o: from?.name ?? '—', q, a: a.name }), { actId: a.id, important: a.fame > 30 || (from?.fame ?? 0) > 40 || mineAct(a) });
}

// ---------------------------------------------------------------- destinos de quem saiu

/** Fama de origem: o melhor ato (atual ou antigo) da pessoa. */
function srcFame(s: GameState, pid: string, except?: string): { fame: number; act?: Act } {
  let best: { fame: number; act?: Act } = { fame: 0 };
  const f = rw(s).former;
  for (const a of Object.values(s.acts)) if (a.id !== except && (a.members.includes(pid) || f[a.id]?.some((x) => x.personId === pid)) && a.fame > best.fame) best = { fame: a.fame, act: a };
  return best;
}

/** Carreira solo de NPC para quem saiu (a fama e parte dos fãs vêm junto). */
export function goSolo16(s: GameState, r: Rng, p: Person, from: Act): Act {
  const src = srcFame(s, p.id);
  const solo = makeAct(s, r, { name: p.name, genre: from.genre, city: from.city, members: 1, potential: p.potential, formed: s.year, debutYear: s.year, fame: src.fame * (front(from, p) ? 0.5 : 0.3) });
  for (const id of solo.members) delete s.persons[id];
  solo.members = [p.id];
  solo.leaderId = p.id;
  solo.status = 'active';
  BUMP++;
  const sh = front(from, p) ? 0.2 : 0.08;
  solo.fans = { casual: Math.round(from.fans.casual * sh), active: Math.round(from.fans.active * sh * 0.8), core: Math.round(from.fans.core * sh * 0.5) };
  l16(s).boost[solo.id] = 1;
  delete l16(s).free[p.id];
  remember(s, 'solo', fmtL(l('{p} (ex-{a}) estreia em carreira solo.', '{p} (ex-{a}) debuts a solo career.'), { p: p.name, a: from.name }), { actId: solo.id, important: from.fame > 35 });
  return solo;
}

/** Banda nova com outros músicos livres; supergrupo se dois vierem de nomes grandes. */
export function newBand16(s: GameState, r: Rng, p: Person, from: Act, partners: Person[]): Act {
  const crew = [p, ...partners.slice(0, 3)];
  const n = Math.max(3, crew.length);
  const fames = crew.map((q) => srcFame(s, q.id).fame);
  const big = fames.filter((f) => f > 40).length >= 2;
  const fame = (fames.reduce((t, x) => t + x, 0) / crew.length) * (big ? 0.55 : 0.3);
  const b = makeAct(s, r, { genre: from.genre, city: from.city, members: n, potential: Math.max(...crew.map((q) => q.potential)), formed: s.year, debutYear: s.year, fame });
  const gen = b.members.slice(0, crew.length);
  for (const id of gen) delete s.persons[id];
  b.members = [...crew.map((q) => q.id), ...b.members.slice(crew.length)]; actsTouched17(s); // r17: índice pessoa→atos
  b.leaderId = p.id;
  b.status = 'active';
  BUMP++;
  b.name = bandName(r, langForCity(from.city, r), familyOf(from.genre), n);
  for (const a of crew) for (const c of crew) if (a !== c) a.rel[c.id] = Math.max(a.rel[c.id] ?? 0, 15);
  const srcs = crew.map((q) => s.acts[l16(s).free[q.id]?.[1] ?? '']).filter((x): x is Act => !!x);
  b.fans = { casual: Math.round(srcs.reduce((t, x) => t + x.fans.casual, 0) * 0.08), active: Math.round(srcs.reduce((t, x) => t + x.fans.active, 0) * 0.06), core: Math.round(srcs.reduce((t, x) => t + x.fans.core, 0) * 0.04) };
  l16(s).boost[b.id] = 1;
  for (const q of crew) delete l16(s).free[q.id];
  const who = crew.map((q, i) => `${q.name}${srcs[i] ? ` (ex-${srcs[i].name})` : ''}`).join(', ');
  const one = crew.length === 1;
  remember(s, big ? 'supergroup' : 'lineup', fmtL(big ? l('Supergrupo: {w} formam {b}.', 'Supergroup: {w} form {b}.') : one ? l('{w} monta uma banda nova, {b}.', '{w} starts a new band, {b}.') : l('{w} formam a banda {b}.', '{w} form a new band, {b}.'), { w: who, b: b.name }), { actId: b.id, important: big || from.fame > 40 });
  return b;
}

/** Um passo do músico livre: solo, banda nova, entrar em outra banda ou esperar (força = sempre age). */
export function freeStep16(s: GameState, r: Rng, pid: string, force = false): Act | undefined {
  const st = l16(s), f = st.free[pid], p = s.persons[pid];
  if (!f || !p) { delete st.free[pid]; return undefined; }
  const from = s.acts[f[1]];
  if (!p.alive || !from || inActive(s, pid) || p.isPlayer) { delete st.free[pid]; return undefined; }
  if (!force && (mIdx(s) - f[0] > 48 || s.year - p.born > 72)) { delete st.free[pid]; return undefined; }
  if (!force && (scripted(s, p) || !r.chance(0.07))) return undefined;
  const src = srcFame(s, pid).fame;
  const fam = familyOf(from.genre);
  const homes = Object.values(s.acts).filter((a) => a.id !== from.id && (a.status === 'active' || a.status === 'emerging') && !mineAct(a) && !histLocked(s, a) && !(a.catalogNo && histMode(s) === 'strict') && a.members.length >= 2 && a.members.length < 5 && familyOf(a.genre) === fam && !a.members.some((id) => s.persons[id]?.role === p.role));
  const partners = freePool(s, from.genre, from.id).filter((q) => q.id !== pid);
  const wSolo = (front(from, p) || f[2] === 'solo') && src > 20 ? 2 + (f[2] === 'solo' ? 3 : 0) : 0.3;
  const bound = realBound(s, p);
  const wBand = bound ? 0 : partners.length ? 1.6 : 0.6;
  const wJoin = homes.length && !bound ? 1.2 : 0;
  if (bound && wSolo < 1) return undefined;
  const x = r.next() * (wSolo + wBand + wJoin);
  if (x < wSolo) return goSolo16(s, r, p, from);
  if (x < wSolo + wBand) return newBand16(s, r, p, from, r.shuffle(partners.slice()).slice(0, r.int(1, 2)));
  const home = homes.sort((a, b) => b.fame - a.fame)[r.int(0, Math.min(2, homes.length - 1))];
  joinBand(s, p, home, l('{p} (ex-{o}) entra em {a}.', '{p} (ex-{o}) joins {a}.'));
  return home;
}

// ---------------------------------------------------------------- mês

function npcDepartures(s: GameState, r: Rng): void {
  const hm = histMode(s);
  for (const a of Object.values(s.acts)) {
    if ((a.status !== 'active' && a.status !== 'emerging') || a.members.length < 2 || mineAct(a) || histLocked(s, a)) continue;
    if (a.fame < 8 && !a.catalogNo) continue;
    if (!r.chance(0.25)) continue; // amostra (x4 na chance)
    const k = a.catalogNo ? (hm !== 'strict' ? 1 : 0.5) : 1;
    for (const id of a.members) {
      const p = s.persons[id];
      if (!p?.alive || p.isPlayer || scripted(s, p)) continue;
      const pr = pressure16(s, a, p);
      if (!pr.w || !r.chance(pr.w * 0.0012 * 4 * k)) continue;
      departNpc16(s, r, a, p, pr.why);
      if (pr.why === 'solo') freeStep16(s, r, p.id, true);
      break;
    }
  }
}

function returns(s: GameState, r: Rng): void {
  const st = l16(s);
  for (const [pid, f] of Object.entries(st.free)) {
    const a = s.acts[f[1]], p = s.persons[pid];
    if (!a || !p?.alive || !live(a) || mineAct(a) || histLocked(s, a) || (a.catalogNo && histMode(s) === 'strict') || a.members.length >= 6 || inActive(s, pid)) continue;
    if (mIdx(s) - f[0] < 18 || f[2] === 'addiction' && p.health === 'addiction') continue;
    const lead = s.persons[a.leaderId ?? ''];
    if (lead && (lead.rel[pid] ?? 0) < -15) continue;
    if (!r.chance(0.006)) continue;
    joinBand(s, p, a, l('{p} volta para {a}.', '{p} returns to {a}.'));
  }
}

function playerDepartures(s: GameState, r: Rng): void {
  const f = s.flags as Record<string, number>;
  if (s.decisions.some((d) => d.eventId === 'l16_depart')) return;
  for (const a of Object.values(s.acts)) {
    if (a.owner !== 'player' || a.playerBand || a.members.length < 2 || (a.status !== 'active' && a.status !== 'emerging')) continue;
    for (const id of a.members) {
      const p = s.persons[id];
      if (!p?.alive || p.isPlayer || mIdx(s) - (f[`l16dec:${p.id}`] ?? -999) < 18) continue;
      const pr = pressure16(s, a, p);
      if (!pr.w || !r.chance(pr.w * 0.004)) continue;
      f[`l16dec:${p.id}`] = mIdx(s);
      emitDepart(s, a, p, pr.why);
      return;
    }
  }
}

/** Chance de convencer a ficar (explicada na carta). */
export function stayOdds16(s: GameState, a: Act, p: Person, why: Why16): number {
  const lead = s.persons[a.leaderId ?? ''];
  const relL = lead && lead.id !== p.id ? (p.rel[lead.id] ?? 0) : 20;
  return clamp(0.4 + a.trust / 250 + relL / 300 - (why === 'solo' ? 0.2 : why === 'feud' ? 0.12 : 0) + (why === 'addiction' ? 0.1 : 0), 0.1, 0.9);
}
const stayCost = (s: GameState, a: Act, why: Why16) => money(s, (why === 'addiction' ? 4000 : 1500) + a.fame * 60);

function emitDepart(s: GameState, a: Act, p: Person, why: Why16): void {
  const odds = Math.round(stayOdds16(s, a, p, why) * 100);
  const cost = stayCost(s, a, why);
  const pf = Math.round(personFame(s, p.id).v);
  s.decisions.push({
    id: `l16:${a.id}:${p.id}:${s.week}`, eventId: 'l16_depart', cat: 'band', week: s.week, tags: [], defaultOption: 'go',
    title: fmtL(l('{p} quer sair de {a}', '{p} wants to leave {a}'), { p: p.name, a: a.name }),
    text: fmtL(l('Motivo: {w}. Fama pessoal {f} × banda {b}. Se sair sem acordo, a pessoa fica livre: pode seguir solo, montar outra banda (até com rivais) ou entrar em outro grupo.', 'Reason: {w}. Personal fame {f} vs band {b}. If they leave without a deal they become a free agent: solo, a new band (even with rivals) or another group.'), { w: WHY16[why], f: pf, b: Math.round(a.fame) }),
    options: [
      { id: 'stay', label: fmtL(why === 'addiction' ? l('Pagar reabilitação e manter ({c})', 'Pay for rehab and keep them ({c})') : l('Convencer a ficar ({c})', 'Talk them into staying ({c})'), { c: `$${Math.round(cost).toLocaleString('en-US')}` }), hint: fmtL(l('Chance ~{o}% (confiança no selo, relação com o líder, motivo). Se falhar, sai magoado(a).', 'About {o}% (trust in the label, bond with the leader, reason). If it fails they leave bitter.'), { o: odds }) },
      { id: 'solo', label: l('Manter sob contrato em carreira solo', 'Keep them under contract as a solo act'), hint: l('Sai da banda, mas o selo fica com os dois atos; o solo leva parte dos fãs e a banda perde um pouco do núcleo.', 'They leave the band but you keep both acts; the solo act takes some fans and the band loses a bit of its core.') },
      { id: 'replace', label: fmtL(l('Liberar e contratar substituto ({c})', 'Release them and hire a replacement ({c})'), { c: `$${Math.round(money(s, 4000)).toLocaleString('en-US')}` }), hint: l('A banda segue completa; fãs antigos podem estranhar.', 'The band stays complete; old fans may balk.') },
      { id: 'go', label: l('Liberar e seguir menor', 'Release them and carry on smaller'), hint: l('Sem custo; a pessoa vira concorrente livre no mercado.', 'No cost; they become a free competitor.') },
    ],
    ctx: { act: a.id, person: p.id, why },
  });
}

type Ctx = Record<string, string | number>;
const A = (s: GameState, c: Ctx) => s.acts[String(c.act)];
const P = (s: GameState, c: Ctx) => s.persons[String(c.person)];

function releaseTo(s: GameState, r: Rng, a: Act, p: Person, why: Why16): void {
  leaveBand16(s, a, p, why);
  freeUp(s, p, a, why);
  a.trust = clamp(a.trust + 2, 0, 100);
  notify(s, fmtL(l('{p} deixou {a}. Livre, pode seguir solo, formar outra banda ou entrar num grupo rival nos próximos meses.', '{p} left {a}. As a free agent they may go solo, form a band or join a rival group in the coming months.'), { p: p.name, a: a.name }), 'event');
  void r;
}

deferEvents([{
  id: 'l16_depart', cat: 'band', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
  title: l('{person} quer sair', '{person} wants out'),
  text: l('Um integrante quer deixar a banda.', 'A member wants to leave the band.'),
  options: [
    { id: 'stay', label: l('Convencer a ficar', 'Talk them into staying'), apply: (s: GameState, r: Rng, c: Ctx) => {
      const a = A(s, c), p = P(s, c), why = String(c.why) as Why16;
      if (!a || !p || !a.members.includes(p.id)) return;
      post(s, `l16stay:${p.id}:${s.week}`, -stayCost(s, a, why), 'artist_dev', why === 'addiction' ? `Reabilitação ${p.name}` : `Acordo ${p.name}`);
      const odds = stayOdds16(s, a, p, why);
      if (r.chance(odds)) {
        p.morale = clamp(p.morale + 15, 0, 100);
        p.resentment = clamp(p.resentment - 25, 0, 100);
        if (why === 'addiction') p.health = 'recovering';
        a.trust = clamp(a.trust + 3, 0, 100);
        remember(s, 'lineup', fmtL(l('{p} decide ficar em {a}.', '{p} decides to stay in {a}.'), { p: p.name, a: a.name }), { actId: a.id, important: true });
        notify(s, fmtL(l('Deu certo ({o}% de chance): {p} fica. O motivo ({w}) diminuiu, mas pode voltar se nada mudar.', 'It worked ({o}% odds): {p} stays. The reason ({w}) eased, but it can return if nothing changes.'), { o: Math.round(odds * 100), p: p.name, w: WHY16[why] }), 'good');
      } else {
        a.trust = clamp(a.trust - 5, 0, 100);
        releaseTo(s, r, a, p, why);
        notify(s, fmtL(l('Não deu ({o}% de chance): {p} sai magoado(a) e a confiança da banda cai.', 'It failed ({o}% odds): {p} leaves bitter and band trust drops.'), { o: Math.round(odds * 100), p: p.name }), 'bad');
      }
    } },
    { id: 'solo', label: l('Carreira solo sob contrato', 'Solo act under contract'), apply: (s: GameState, r: Rng, c: Ctx) => {
      const a = A(s, c), p = P(s, c), why = String(c.why) as Why16;
      if (!a || !p || !a.members.includes(p.id)) return;
      const err = startSoloCareer(s, r, a.id, p.id);
      if (err) { releaseTo(s, r, a, p, why); notify(s, fmtL(l('Não foi possível manter o solo ({e}); {p} saiu livre.', 'Could not keep the solo act ({e}); {p} left as a free agent.'), { e: err, p: p.name }), 'bad'); return; }
      const solo = Object.values(s.acts).find((x) => x.owner === 'player' && x.members.length === 1 && x.members[0] === p.id && x.debutYear >= s.year - 1) ?? Object.values(s.acts).find((x) => x.members.length === 1 && x.members[0] === p.id);
      leaveBand16(s, a, p, why);
      if (solo) {
        solo.fame = Math.max(solo.fame, a.fame * (front(a, p) ? 0.45 : 0.25));
        solo.fans.casual += Math.round(a.fans.casual * 0.12);
        solo.fans.core += Math.round(a.fans.core * 0.06);
        l16(s).boost[solo.id] = 1;
      }
      a.fans.core = Math.round(a.fans.core * 0.94);
      notify(s, fmtL(l('{p} sai de {a}, mas segue no selo como artista solo (fama inicial vem da banda). A banda perde ~6% do núcleo de fãs.', '{p} leaves {a} but stays on the label as a solo artist (starting fame comes from the band). The band loses ~6% of its core fans.'), { p: p.name, a: a.name }), 'event');
    } },
    { id: 'replace', label: l('Liberar com substituto', 'Release with a replacement'), apply: (s: GameState, r: Rng, c: Ctx) => {
      const a = A(s, c), p = P(s, c), why = String(c.why) as Why16;
      if (!a || !p || !a.members.includes(p.id)) return;
      post(s, `l16sub:${a.id}:${s.week}`, -money(s, 4000), 'artist_dev', 'Substituto');
      releaseTo(s, r, a, p, why);
      replaceMember(s, r, a, p.id);
      a.fans.core = Math.round(a.fans.core * 0.95);
    } },
    { id: 'go', label: l('Liberar', 'Release'), apply: (s: GameState, r: Rng, c: Ctx) => {
      const a = A(s, c), p = P(s, c), why = String(c.why) as Why16;
      if (!a || !p || !a.members.includes(p.id)) return;
      releaseTo(s, r, a, p, why);
    } },
  ],
}] as never[]);

// ---------------------------------------------------------------- fama que acompanha a pessoa

function carryFame(s: GameState): void {
  const st = l16(s);
  for (const a of Object.values(s.acts)) {
    if (st.boost[a.id] || a.debutYear < s.year - 1) continue;
    st.boost[a.id] = 1;
    if (s.week <= 0) continue;
    let best = 0, from: Act | undefined;
    for (const pid of a.members) { const x = srcFame(s, pid, a.id); if (x.fame > best) { best = x.fame; from = x.act; } }
    const solo = a.members.length === 1;
    const want = best * (solo ? 0.45 : 0.3);
    if (!from || want <= a.fame + 2) continue;
    a.fame = want;
    a.fans.casual = Math.max(a.fans.casual, Math.round(from.fans.casual * (solo ? 0.15 : 0.08)));
    a.fans.core = Math.max(a.fans.core, Math.round(from.fans.core * (solo ? 0.08 : 0.04)));
  }
}

// ---------------------------------------------------------------- histórico de formação (diff mensal)

const SNAP = new WeakMap<GameState, Map<string, string>>();
function diff(s: GameState): void {
  const st = l16(s), m = mIdx(s);
  let snap = SNAP.get(s);
  const first = !snap;
  if (!snap) { snap = new Map(); SNAP.set(s, snap); }
  for (const a of Object.values(s.acts)) {
    const cur = a.members.join(',');
    const old = snap.get(a.id);
    snap.set(a.id, cur);
    if (first || old === undefined || old === cur) continue;
    const was = old ? old.split(',') : [];
    for (const id of a.members) if (!was.includes(id)) st.ev.push([m, a.id, id, 'j']);
    for (const id of was) if (!a.members.includes(id)) {
      st.ev.push([m, a.id, id, 'l']);
      const p = s.persons[id];
      // saídas de outros sistemas (rixas, colapsos, roteiro…) também entram no mercado de músicos livres
      if (p?.alive && !p.isPlayer && !st.free[id] && !inActive(s, id)) st.free[id] = [m, a.id, 'left'];
    }
  }
  if (st.ev.length > 8000) st.ev.splice(0, st.ev.length - 8000);
}

function month(s: GameState): void {
  const r = new Rng(seedState(`lineup16|${s.config.seed}|${mIdx(s)}`));
  renames(s);
  npcDepartures(s, r);
  playerDepartures(s, r);
  for (const pid of Object.keys(l16(s).free)) freeStep16(s, r, pid);
  returns(s, r);
  carryFame(s);
  diff(s);
}

registerSimHook('newgame', 'lineup16', (s) => { renames(s); for (const a of Object.values(s.acts)) l16(s).boost[a.id] = 1; });
registerSimHook('month', 'lineup16', (s) => month(s));

// ---------------------------------------------------------------- consultas (interface e testes)

export interface Stint16 { pid: string; segs: { from: number; to?: number }[] }

/** Passagens de cada pessoa pelo ato (dados reais + mudanças da partida), só até o ano atual. */
export function stints16(s: GameState, a: Act): Stint16[] {
  const st = l16(s), f = rw(s).former[a.id] ?? [];
  const evs = st.ev.filter((e) => e[1] === a.id);
  const ids = [...new Set([...a.members, ...f.map((x) => x.personId), ...evs.map((e) => e[2])])].filter((id) => s.persons[id]);
  const d = s.config.realNames ? realDataOf(a) : undefined;
  const shift = d?.d !== undefined ? a.debutYear - d.d : 0;
  const base = a.debutYear;
  return ids.map((pid) => {
    const p = s.persons[pid];
    const segs: { from: number; to?: number }[] = [];
    for (const m of d?.m ?? []) {
      if (canonKey(m[0]) !== canonKey(p.name)) continue;
      const from = (m[4] ?? d!.d ?? base) + (m[4] !== undefined ? shift : 0);
      if (from > s.year) continue;
      const to = m[5] !== undefined && m[5] + shift <= s.year ? m[5] + shift : undefined;
      segs.push({ from: Math.max(base, from), to });
    }
    for (const e of evs.filter((x) => x[2] === pid)) {
      const y = Math.floor(e[0] / 12), open = segs.find((x) => x.to === undefined);
      if (e[3] === 'j') { if (!open && !segs.some((x) => Math.abs(x.from - y) <= 1)) segs.push({ from: y }); }
      else if (open) open.to = y;
      else if (!segs.some((x) => x.to !== undefined && Math.abs(x.to - y) <= 1)) segs.push({ from: base, to: y });
    }
    if (!segs.length) segs.push({ from: base });
    segs.sort((x, y) => x.from - y.from);
    const last = segs[segs.length - 1];
    const member = a.members.includes(pid);
    if (member && last.to !== undefined) last.to = undefined;
    if (!member && last.to === undefined) last.to = [...f].reverse().find((x) => x.personId === pid)?.year ?? (live(a) ? s.year : a.careerEnd);
    return { pid, segs };
  });
}

export const segTxt = (segs: { from: number; to?: number }[]) => segs.map((x) => `${x.from}–${x.to ?? ''}`).join(', ');

export interface Path16 { act: Act; segs: { from: number; to?: number }[]; solo: boolean; current: boolean }
/** Trajetória da pessoa: bandas (atuais e antigas) e carreiras solo, em ordem. */
export function path16(s: GameState, pid: string): Path16[] {
  const st = l16(s), f = rw(s).former;
  const acts = Object.values(s.acts).filter((a) => a.members.includes(pid) || f[a.id]?.some((x) => x.personId === pid) || st.ev.some((e) => e[1] === a.id && e[2] === pid));
  return acts.map((a) => {
    const all = stints16(s, a);
    const me = all.find((x) => x.pid === pid);
    const solo = all.length === 1 && !(realDataOf(a)?.m?.length ?? 0);
    return { act: a, segs: me?.segs ?? [{ from: a.debutYear }], solo, current: a.members.includes(pid) && live(a) };
  }).sort((x, y) => x.segs[0].from - y.segs[0].from);
}

/** Nomes anteriores do ato (renomes). */
export const formerNames16 = (s: GameState, a: Act): [number, string][] => l16(s).names[a.id] ?? [];
/** Eventos de formação do ato na partida (mais recentes primeiro). */
export const lineupLog16 = (s: GameState, a: Act): Ev16[] => l16(s).ev.filter((e) => e[1] === a.id).slice(-30).reverse();
