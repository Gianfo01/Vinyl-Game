// Rodada 19 (onda 5, C — auditoria 8 §2) — REGRAS DE CONTEXTO. Antes, várias regras eram números fixos (rival tira 12%,
// obra satura com 4 vidas, crise de cliente 3% ao mês, renovação = confiança + 0,2…). Agora cada uma é uma função do
// contexto da partida, e devolve as partes do "por quê" (explain18). Módulo-folha: só lê dados passados pelo chamador e
// os ganchos CTX19 (temperamento, ambições), preenchidos por sys/ctxsys19.ts — assim ventures9/fest12/manager12/
// ventures12/press18 chamam daqui sem ciclo de import. Sem sorteio próprio (quem rola é o chamador).

import { clamp, hashString } from '../core/rng';
import { familyOf, l, type FamilyId, type L } from '../data/world';
import type { WhyPart } from './explain18';
import { cityDistanceKm } from './travel';
import type { Act, GameState, Release } from './types';
import { fmtL } from './util';

export interface Ctx19 { v: number; parts: WhyPart[] }
const P = (label: L, value: number, fmt: WhyPart['fmt'] = 'mult', note?: L): WhyPart => ({ label, value: Math.round(value * 1000) / 1000, fmt, note, tone: fmt === 'mult' ? (value > 1.001 ? 'good' : value < 0.999 ? 'bad' : '') : '' });

/** Ganchos preenchidos por sys/ctxsys19 (temperamento 0–100 da pessoa-chave do ato; ambições do artista). */
export const CTX19: { facet: (s: GameState, a: Act, k: string) => number; amb: (s: GameState, id: string) => string[] } = {
  facet: () => 50,
  amb: () => [],
};

// ---------------------------------------------------------------- editora: saturação de obras oferecidas

export type WorkKind19 = 'standard' | 'hit' | 'regular' | 'niche';
export const WORK_KIND19: Record<WorkKind19, { name: L; cap: number }> = {
  standard: { name: l('standard (clássico com 15+ anos)', 'standard (15+ year classic)'), cap: 9 },
  hit: { name: l('sucesso recente', 'recent hit'), cap: 5 },
  regular: { name: l('obra comum', 'regular work'), cap: 4 },
  niche: { name: l('obra de nicho', 'niche work'), cap: 3 },
};
/** Tipo da obra pelo valor relativo no catálogo e pela idade. */
export function workKind19(year: number, cat: { v: number; y: number }[], c: { v: number; y: number }): WorkKind19 {
  const vs = cat.map((x) => x.v).sort((a, b) => a - b);
  const rank = vs.length > 1 ? vs.filter((v) => v < c.v).length / (vs.length - 1) : 0.5;
  if (rank >= 0.7 && year - c.y >= 15) return 'standard';
  if (rank >= 0.8) return 'hit';
  if (rank < 0.4) return 'niche';
  return 'regular';
}
/** Saturação: vidas "frescas" (uso antigo esfria: −1 vida a cada 3 anos sem uso), teto pelo tipo e bônus de redescoberta. */
export function satur19(year: number, cat: { v: number; y: number }[], c: { v: number; y: number }, kind: string, e: { lives?: number; last?: number }): Ctx19 & { lives: number; cap: number; wk: WorkKind19; gap: number } {
  const wk = workKind19(year, cat, c), cap = WORK_KIND19[wk].cap;
  const gap = Math.max(0, year - (e.last ?? c.y));
  const lives = Math.max(1, (e.lives ?? 1) - Math.floor(gap / 3)) + 1;
  const parts: WhyPart[] = [];
  let m: number;
  if (lives > cap) {
    m = gap < 1 ? 0.85 : 0.92;
    parts.push(P(fmtL(l('Saturada: {n} vidas recentes para um teto de {c} ({k})', 'Saturated: {n} recent lives for a cap of {c} ({k})'), { n: lives, c: cap, k: WORK_KIND19[wk].name }), m));
  } else {
    m = kind === 'cover' ? 1.1 : 1.05;
    parts.push(P(fmtL(l('Nova vida ({n}/{c}, {k})', 'New life ({n}/{c}, {k})'), { n: lives, c: cap, k: WORK_KIND19[wk].name }), m));
    if (gap >= 8) { m *= 1.05; parts.push(P(fmtL(l('Redescoberta: {g} anos sem uso', 'Rediscovery: {g} years unused'), { g: gap }), 1.05)); }
  }
  if (gap >= 3 && (e.lives ?? 1) > 1) parts.push(P(fmtL(l('Espaçamento: {g} anos desde o último uso esfriaram {n} vida(s)', 'Spacing: {g} years since last use cooled {n} life/lives'), { g: gap, n: Math.floor(gap / 3) }), 1, 'text'));
  return { v: m, parts, lives, cap, wk, gap };
}

// ---------------------------------------------------------------- crítica: consenso posterior

/** O "veredito da história" de um lançamento: crítica agregada, paradas, vendas, certificado e prêmios — não a qualidade oculta. */
export function verdict19(s: GameState, rel: Release): Ctx19 {
  const crit = rel.critic ?? 60;
  const chart = rel.peak > 0 ? (rel.peak <= 1 ? 95 : rel.peak <= 10 ? 85 : rel.peak <= 40 ? 68 : 55) : clamp(30 + Math.log10(1 + rel.totalUnits) * 6, 30, 60);
  const cert = rel.certified === 'diamond' ? 12 : rel.certified === 'platinum' ? 8 : rel.certified === 'gold' ? 4 : 0;
  const aw = s.awards.filter((a) => a.releaseId === rel.id).length;
  const v = clamp(crit * 0.5 + chart * 0.35 + 9 + cert + aw * 8, 0, 100);
  return { v: Math.round(v), parts: [
    P(l('Crítica agregada (50%)', 'Aggregate critics (50%)'), crit, 'num'),
    P(l('Paradas e vendas (35%)', 'Charts and sales (35%)'), chart, 'num', rel.peak > 0 ? fmtL(l('pico #{p}', 'peak #{p}'), { p: rel.peak }) : l('não entrou na parada', 'never charted')),
    P(l('Certificado', 'Certification'), cert, 'signed'),
    P(l('Prêmios', 'Awards'), aw * 8, 'signed'),
  ] };
}
/** Variação de credibilidade quando a história julga a sua nota (|nota − veredito|) + bônus de quem viu antes. */
export function credDelta19(sc: number, verdict: number, pre: number | undefined): { d: number; ahead: boolean } {
  const diff = Math.abs(sc - verdict);
  let d = diff < 12 ? 1.2 : diff < 22 ? 0.3 : diff > 32 ? -2.5 : -0.8;
  const ahead = pre !== undefined && pre >= 0 && Math.abs(sc - pre) >= 18 && Math.abs(sc - verdict) + 10 < Math.abs(pre - verdict);
  if (ahead) d += 2;
  return { d, ahead };
}

// ---------------------------------------------------------------- festival rival

export interface NpcFest19 { kind: string; labelId: string; name: string; city: string; rep: number; y: number }
/** Mês da edição do festival NPC (temporada maio–setembro, fixo pelo nome). */
export const npcMonth19 = (n: { name: string; labelId: string }): number => 4 + (hashString(`${n.labelId}|${n.name}`) % 5);
export const npcFam19 = (s: GameState, n: { labelId: string }): FamilyId | null => { const g = s.labels[n.labelId]?.focus?.[0]; return g ? familyOf(g) : null; };
/** Quanto os festivais rivais tiram do seu público: cada um pesa por distância, sobreposição de mês, gênero/identidade e porte. */
export function rivalFest19(s: GameState, npc: NpcFest19[], me: { city: string; month: number; fam?: FamilyId | null; ident?: string; rep: number }): Ctx19 & { rows: { n: NpcFest19; loss: number }[] } {
  const rows: { n: NpcFest19; loss: number }[] = [], parts: WhyPart[] = [];
  let keep = 1;
  for (const n of npc) {
    if (n.kind !== 'festival') continue;
    const km = n.city === me.city ? 0 : cityDistanceKm(n.city, me.city);
    const dist = n.city === me.city ? 1 : km < 300 ? 0.6 : km < 800 ? 0.25 : 0;
    if (!dist) continue;
    const dm = Math.min(Math.abs(npcMonth19(n) - me.month), 12 - Math.abs(npcMonth19(n) - me.month));
    const mon = dm === 0 ? 1 : dm === 1 ? 0.5 : dm === 2 ? 0.15 : 0;
    if (!mon) continue;
    const nf = npcFam19(s, n);
    const gen = me.ident === 'mega' ? 1 : nf && me.fam && nf === me.fam ? 1.3 : me.ident === 'discovery' || me.ident === 'premium' ? 0.55 : 0.75;
    const size = clamp(n.rep / Math.max(20, me.rep), 0.4, 1.6);
    const loss = clamp(0.12 * dist * mon * gen * size, 0, 0.3);
    keep *= 1 - loss;
    rows.push({ n, loss });
    parts.push(P(fmtL(l('{n} ({c}, mês {m}): distância ×{d}, mês ×{o}, gênero ×{g}, porte ×{z}', '{n} ({c}, month {m}): distance ×{d}, month ×{o}, genre ×{g}, size ×{z}'), { n: n.name, c: n.city, m: npcMonth19(n) + 1, d: dist, o: mon, g: gen, z: Math.round(size * 100) / 100 }), 1 - loss));
  }
  keep = Math.max(0.6, keep);
  return { v: keep, parts, rows };
}

// ---------------------------------------------------------------- outras regras que eram fixas

const IDENT_DIST: Record<string, number> = { 'discovery>genre': 0.3, 'genre>discovery': 0.3, 'mega>premium': 0.3, 'premium>mega': 0.45, 'family>mega': 0.3, 'mega>family': 0.35, 'genre>genre': 0.45 };
/** Troca de identidade do festival: perda de fiéis pela distância entre identidades e pela tradição já construída. */
export function identLoss19(from: string, to: string, eds: number): Ctx19 {
  const dist = IDENT_DIST[`${from}>${to}`] ?? 0.4;
  const trad = 0.8 + Math.min(10, eds) / 25;
  const v = clamp(dist * trad, 0.12, 0.6);
  return { v, parts: [P(fmtL(l('Distância {a} → {b}', 'Distance {a} → {b}'), { a: from, b: to }), dist, 'pct'), P(fmtL(l('Tradição: {n} edições (público apegado ao que era)', 'Tradition: {n} editions (crowd attached to what it was)'), { n: eds }), trad)] };
}
/** Prêmio de exclusividade regional: mais festivais na região e mais fama = exclusividade mais cara. */
export function exclPrem19(s: GameState, npc: NpcFest19[], city: string, month: number, fame: number): Ctx19 {
  const near = npc.filter((n) => n.kind === 'festival' && (n.city === city || cityDistanceKm(n.city, city) < 800) && Math.min(Math.abs(npcMonth19(n) - month), 12 - Math.abs(npcMonth19(n) - month)) <= 2).length;
  const v = clamp(0.15 + near * 0.08 + fame / 400, 0.15, 0.6);
  return { v, parts: [P(l('Base', 'Base'), 0.15, 'pct'), P(fmtL(l('{n} festival(is) concorrente(s) na região e temporada', '{n} competing festival(s) in the region and season'), { n: near }), near * 0.08, 'pct'), P(fmtL(l('Fama {f}: abrir mão de outras datas custa mais', 'Fame {f}: giving up other dates costs more'), { f: Math.round(fame) }), fame / 400, 'pct')] };
}
const FAVOR_K: Record<string, number> = { magazine: 0.55, radio: 0.4, tv: 0.35, blog: 0.2, playlist: 0.3 };
/** Jabá caseiro (favorecer ato próprio no seu veículo): revista séria perde mais que blog; alcance e fama do ato expõem. */
export function favorCost19(kind: string, reach: number, fame: number): Ctx19 {
  const k = FAVOR_K[kind] ?? 0.4, r = 0.5 + reach / 100, f = 0.7 + fame / 150;
  return { v: k * r * f, parts: [P(fmtL(l('Tipo de veículo ({k})', 'Outlet type ({k})'), { k: kind }), k, 'num'), P(l('Alcance', 'Reach'), r), P(l('Fama do ato favorecido', 'Favored act fame'), f)] };
}
/** Concorrência de estúdios: cada estúdio rival da cidade pesa pela reputação relativa. */
export function studioComp19(rivals: { rep: number; name: string }[], myRep: number): Ctx19 {
  let v = 1; const parts: WhyPart[] = [];
  for (const n of rivals) { const k = 1 - 0.15 * clamp(n.rep / Math.max(20, myRep), 0.3, 1.8); v *= k; parts.push(P(fmtL(l('{n} (rep. {r})', '{n} (rep {r})'), { n: n.name, r: n.rep }), k)); }
  return { v: Math.max(0.35, v), parts };
}
/** Turnê que cai: reputação do empresário, fama do ato (nome pequeno, promotor some), estresse e agência própria. */
export function tourCancelP19(s: GameState, mgRep: number, a: Act, ownBooking: boolean): Ctx19 {
  const base = 0.12 - mgRep / 1000, small = a.fame < 20 ? 0.04 : a.fame >= 60 ? -0.03 : 0;
  const lead = a.members.map((id) => s.persons[id]).find((p) => p?.alive);
  const st = lead && lead.stress > 70 ? 0.03 : 0, era = s.year < 1960 ? 0.02 : 0, bk = ownBooking ? -0.03 : 0;
  const v = clamp(base + small + st + era + bk, 0.03, 0.2);
  return { v, parts: [P(l('Base − reputação de empresário', 'Base − manager reputation'), base, 'pct'), P(l('Porte do nome', 'Size of the name'), small, 'pct'), P(l('Estresse do líder', 'Leader stress'), st, 'pct'), P(l('Estradas da época', 'Roads of the era'), era, 'pct'), P(l('Agência própria roteia', 'Own agency routes it'), bk, 'pct')] };
}
/** Crise de cliente por mês: temperamento (impulsividade, ansiedade, ego), fama, saúde. */
export function crisisP19(s: GameState, a: Act): Ctx19 {
  const imp = CTX19.facet(s, a, 'impulsividade'), anx = CTX19.facet(s, a, 'ansiedade'), ego = CTX19.facet(s, a, 'ego');
  const t = 0.7 + (imp + anx + ego - 150) / 250, fm = a.fame >= 60 ? 1.3 : a.fame < 20 ? 0.8 : 1;
  const sick = a.members.some((id) => { const h = s.persons[id]?.health; return h === 'addiction' || h === 'burnout'; }) ? 1.6 : 1;
  const v = clamp(0.03 * t * fm * sick, 0.008, 0.09);
  return { v, parts: [P(l('Base', 'Base'), 0.03, 'pct'), P(l('Temperamento (impulsividade, ansiedade, ego)', 'Temperament (impulsiveness, anxiety, ego)'), t), P(l('Fama (holofote)', 'Fame (spotlight)'), fm), P(l('Saúde (vício/esgotamento)', 'Health (addiction/burnout)'), sick)] };
}
/** Problema de prestação de contas por mês: carga de clientes por pessoa da agência. */
export function issueP19(clients: number, agents: number): Ctx19 {
  const load = clients / (1 + agents), v = clamp(0.012 + load * 0.006, 0.01, 0.06);
  return { v, parts: [P(fmtL(l('{c} cliente(s) para {p} pessoa(s) na agência', '{c} client(s) for {p} person/people in the agency'), { c: clients, p: 1 + agents }), v, 'pct')] };
}
/** Renovação do mandato: confiança, lealdade do artista, o que você entregou (fama desde o início), tempo junto e quebras. */
export function renewP19(s: GameState, a: Act, x: { trust: number; pressured: number; broken: number; fame0: number; since: number }): Ctx19 {
  const tr = x.trust / 100, loy = (CTX19.facet(s, a, 'lealdade') - 50) / 250, del = clamp((a.fame - x.fame0) / 100, -0.1, 0.15);
  const yrs = Math.min(0.1, Math.max(0, s.week - x.since) / 52 / 20), pr = -x.pressured * 0.08, br = -x.broken * 0.1;
  const v = clamp(tr + 0.1 + loy + del + yrs + pr + br, 0.05, 0.97);
  return { v, parts: [P(l('Confiança', 'Trust'), tr, 'pct'), P(l('Base', 'Base'), 0.1, 'pct'), P(l('Lealdade (temperamento)', 'Loyalty (temperament)'), loy, 'pct'), P(l('Fama conquistada com você', 'Fame gained with you'), del, 'pct'), P(l('Anos juntos', 'Years together'), yrs, 'pct'), P(l('Pressões', 'Pressure'), pr, 'pct'), P(l('Promessas quebradas', 'Broken promises'), br, 'pct')] };
}
/** Peso da comissão na chance de fechar com o cliente: quem ama dinheiro sente mais cada ponto; quem só quer arte, menos. */
export function commW19(s: GameState, a: Act): Ctx19 {
  const am = CTX19.amb(s, a.id);
  const v = am.includes('money') ? 1.6 : am.includes('art') ? 0.5 : am.includes('family') ? 0.8 : 1;
  return { v, parts: [P(am.includes('money') ? l('Ambição: dinheiro', 'Ambition: money') : am.includes('art') ? l('Ambição: arte', 'Ambition: art') : am.includes('family') ? l('Ambição: família', 'Ambition: family') : l('Sem ambição ligada a dinheiro', 'No money-related ambition'), v)] };
}
