// Rodada 18 (ability18) — HABILIDADE ATUAL e POTENCIAL (estilo Football Manager: CA/PA) para todo mundo.
// CA (0–200) é a soma ponderada, pela função, dos atributos que já existem: artistas = habilidades (voz, palco,
// instrumento, composição, letra, produção, negócios); produtores/empresários/equipe/chefes/críticos/você = atributos
// persona13 (ouvido, negociação, carisma, gestão + ofício). PA (1–200) é o teto oculto: sai do potencial da pessoa
// (jovens nascem numa FAIXA −1..−10, resolvida na geração), dos artistas reais (teto alto coerente com a história)
// e de raros prodígios. Cada atributo cresce dentro do teto: idade (curva por atributo — voz cedo, composição tarde,
// gestão até tarde), estrada e estúdio (por função), aulas pagas, mentor (colega melhor, produtor), e a
// personalidade (profissionalismo, ambição, determinação, temperamento) decide quanto do teto é alcançado. Doença,
// vício, burnout e estresse travam e fazem regredir. O jogador nunca vê o PA: vê uma faixa de estrelas cuja largura
// depende do conhecimento (fame15) e do olho de quem avalia (CA do A&R ou o seu ouvido).
// Desempenho: só artistas em atos ativos evoluem; atos de NPC são processados em rodízio a cada 3 meses (dt=3);
// quem não é artista evolui por fórmula fechada (idade + experiência guardada), sem varredura. Determinístico.

import { clamp, hashString } from '../../core/rng';
import { toReal } from '../../core/money';
import type { SkillId } from '../../data/people';
import { l, type L } from '../../data/world';
import { actsOfPerson17 } from '../actidx17';
import { expectedAdvance } from '../contracts';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { registerPersonAction } from '../personact18';
import { stress17 } from '../stress17';
import { PRODUCERS } from '../studio';
import type { Act, GameState, Person, StaffMember } from '../types';
import { fmtL, playerActs } from '../util';
import { knownLevel } from './fame15';
import { playerPerson } from './life';
import { POST13, per13, type P13 } from './persona13';
import { registerDimAdj18 } from './quality18';
import { realDataOf } from './realworld';
import { soul } from './soul9';
import type { Facet } from './soul9';

// ------------------------------------------------------------------ estado

export interface AbRec { pa: number; /** faixa juvenil 1..10 (exibida como −n) */ b?: number; lb?: 1; wk?: 1; t?: number }
export interface Ab18State {
  p: Record<string, AbRec>;
  /** histórico anual [ano, CA, ano, CA…] (elenco, equipe, você, atos famosos) */
  h: Record<string, number[]>;
  /** causas da variação de CA no ano (pontos de CA) e no ano anterior — só seu elenco */
  d: Record<string, Record<string, number>>;
  dp: Record<string, Record<string, number>>;
  /** experiência pendente por pessoa: [shows, gravações, composições, CA do produtor] */
  e: Record<string, number[]>;
  /** experiência acumulada (pontos de CA) de quem não é artista */
  x: Record<string, number>;
  /** aulas até a semana */
  tr: Record<string, number>;
  /** mentor: [pessoa, até a semana] */
  mt: Record<string, [string, number]>;
  pl?: number;
  seen: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { ability18: Ab18State } }
const fresh = (): Ab18State => ({ p: {}, h: {}, d: {}, dp: {}, e: {}, x: {}, tr: {}, mt: {}, seen: {} });
registerExt4('ability18', fresh);
export function ab18(s: GameState): Ab18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.ability18 ??= fresh()) as Ab18State;
  st.p ??= {}; st.h ??= {}; st.d ??= {}; st.dp ??= {}; st.e ??= {}; st.x ??= {}; st.tr ??= {}; st.mt ??= {}; st.seen ??= {};
  return st;
}
const peek = (s: GameState): Ab18State | undefined => (s as unknown as { x4?: { ability18?: Ab18State } }).x4?.ability18;
const hu = (s: GameState, id: string, k: string): number => hashString(`${s.config.seed}|ab18|${id}|${k}`) / 4294967296;

// ------------------------------------------------------------------ pesos por função (artistas)

const SK: SkillId[] = ['comp', 'lyr', 'voice', 'instr', 'prod', 'stage', 'biz'];
export const SKILL18: Record<SkillId, L> = {
  comp: l('Composição', 'Songwriting'), lyr: l('Letra', 'Lyrics'), voice: l('Voz', 'Voice'), instr: l('Instrumento', 'Instrument'),
  prod: l('Produção', 'Production'), stage: l('Palco', 'Stage'), biz: l('Negócios', 'Business'),
};
type W = Record<SkillId, number>;
const PLAYERW: W = { instr: 0.4, comp: 0.2, stage: 0.15, prod: 0.1, lyr: 0.05, voice: 0.05, biz: 0.05 };
const WROLE: Record<string, W> = {
  vocal: { voice: 0.35, stage: 0.2, lyr: 0.15, comp: 0.15, instr: 0.05, prod: 0.05, biz: 0.05 },
  mc: { lyr: 0.3, voice: 0.2, stage: 0.2, comp: 0.15, prod: 0.1, biz: 0.05, instr: 0 },
  producer: { prod: 0.4, comp: 0.25, instr: 0.15, stage: 0.05, lyr: 0.05, voice: 0, biz: 0.1 },
  dj: { prod: 0.35, comp: 0.2, instr: 0.1, stage: 0.2, lyr: 0.05, voice: 0, biz: 0.1 },
  synthetic: { prod: 0.4, comp: 0.25, instr: 0.15, stage: 0.05, lyr: 0.05, voice: 0.05, biz: 0.05 },
};
export const weights18 = (role: string): W => WROLE[role] ?? PLAYERW;
/** CA do artista: soma ponderada das habilidades pela função (0–200). */
export function caOf18(p: Person): number {
  const w = weights18(p.role);
  let t = 0;
  for (const k of SK) t += (p.skills[k] ?? 0) * w[k];
  return clamp(t * 2, 1, 200);
}

/** Curvas por atributo: até que idade cresce, quando começa a cair e quanto (pontos/ano aos 10 anos de queda). */
const AGE: Record<SkillId, [number, number, number]> = {
  voice: [27, 36, 1.4], stage: [30, 44, 1.1], instr: [33, 54, 0.9], prod: [40, 63, 0.7], comp: [42, 62, 0.7], lyr: [45, 66, 0.6], biz: [55, 72, 0.6],
};

// ------------------------------------------------------------------ personalidade

export interface Drive18 { v: number; prof: number; amb: number; det: number; temp: number }
/** Profissionalismo, ambição, determinação e temperamento (facetas persona13/soul9) → 0,55..1,45. */
export function driveOf(f: Partial<Record<Facet, number>>): Drive18 {
  const g = (k: Facet) => f[k] ?? 50;
  const prof = (g('disciplina') + g('perfeccionismo') + 100 - g('impulsividade')) / 3;
  const amb = g('ambicao');
  const det = (g('coragem') + g('paciencia') + g('teimosia')) / 3;
  const temp = (200 - g('ansiedade') - g('ego')) / 2;
  const d = (0.35 * prof + 0.3 * amb + 0.2 * det + 0.15 * temp) / 100;
  return { v: clamp(0.55 + (d - 0.3) * 2.25, 0.55, 1.45), prof, amb, det, temp };
}
export const drive18 = (s: GameState, p: Person): Drive18 => driveOf(soul(s, p).f);
/** Quanto do teto a personalidade alcança (0,8..1). */
const reachOf = (dv: number): number => 0.8 + 0.2 * clamp((dv - 0.55) / 0.8, 0, 1);

// ------------------------------------------------------------------ geração do potencial

const REAL_FLOOR = [0, 168, 146, 124];
const actOf = (s: GameState, pid: string): Act | undefined => actsOfPerson17(s, pid)[0];
const realOf = (s: GameState, p: Person): { t: number } | undefined => {
  const a = actOf(s, p.id);
  const rd = a ? realDataOf(a) : undefined;
  return rd ? { t: (rd as { t?: number }).t ?? 2 } : undefined;
};

/** PA de nascença (puro: o mesmo valor que o gancho guardaria). */
export function genPA18(s: GameState, p: Person): AbRec {
  const u1 = hu(s, p.id, 'pa'), u2 = hu(s, p.id, 'b'), u3 = hu(s, p.id, 'lb'), u4 = hu(s, p.id, 'wk');
  const age = s.year - p.born;
  const ca = caOf18(p);
  let pa = (p.potential ?? 50) * 2 + (u1 - 0.5) * 30;
  const real = realOf(s, p);
  if (real) pa = Math.max(pa, REAL_FLOOR[clamp(real.t, 1, 3)] + u1 * 28);
  const out: AbRec = { pa: 0 };
  if (!real && age <= 21) {
    if (u4 < 0.025) pa = 160 + u1 * 38; // prodígio raro
    // faixa juvenil (−1..−10): o mundo só "sabe" a faixa; o valor resolve aqui, uma vez
    const b = clamp(Math.ceil(pa / 20), 1, 10);
    out.b = b;
    pa = b * 20 - 24 + u2 * 24;
  }
  if (!real && age < 27 && u3 < 0.09) out.lb = 1;
  out.pa = Math.round(clamp(Math.max(pa, ca + 3), 1, 200));
  if (age <= 21 && out.pa >= 158) out.wk = 1;
  return out;
}
const recOf = (s: GameState, p: Person): AbRec => peek(s)?.p[p.id] ?? genPA18(s, p);
function ensureRec(s: GameState, p: Person): AbRec {
  const st = ab18(s);
  return (st.p[p.id] ??= genPA18(s, p));
}

// ------------------------------------------------------------------ quem não é artista (fórmula fechada)

type NpGroup = 'ear' | 'biz' | 'soc';
const NPG: Record<NpGroup, [number, number, number]> = { ear: [44, 66, 0.8], biz: [52, 72, 0.7], soc: [45, 64, 0.9] };
const groupOfJob = (job?: string, kind?: string): NpGroup =>
  job === 'producer' || job === 'engineer' || job === 'anr' || job === 'critic' || job === 'designer' ? 'ear'
    : job === 'publicist' || job === 'booking' || job === 'booking_agent' || job === 'promoter' || job === 'tour_manager' || kind === 'media' ? 'soc' : 'biz';
export interface NpDelta { delta: number; margin: number; reach: number; ramp: number; youth: number; decl: number; xp: number; age: number; drive: Drive18; group: NpGroup }
export function npDelta18(s: GameState, key: string, born: number | undefined, facets: Partial<Record<Facet, number>>, job?: string, kind?: string): NpDelta {
  const u0 = hu(s, key, 'born'), u1 = hu(s, key, 'margin'), u2 = hu(s, key, 'rare');
  const b = born ?? s.config.startYear - 22 - Math.floor(u0 * 24);
  const age = s.year - b;
  const group = groupOfJob(job, kind);
  const [end, dec, rate] = NPG[group];
  const margin = 6 + u1 * 44 + (u2 < 0.04 ? 30 : 0);
  const drive = driveOf(facets);
  const reach = 0.55 + 0.45 * clamp((drive.v - 0.55) / 0.8, 0, 1);
  const ramp = clamp((age - 18) / (end - 18), 0, 1);
  const youth = Math.max(0, 26 - age) * 1.8;
  const over = Math.max(0, age - dec);
  const decl = over * rate * (1 + over / 15);
  const xp = Math.min(peek(s)?.x[key] ?? 0, margin * (1 - reach * ramp) + 8);
  return { delta: margin * reach * ramp + xp - youth - decl, margin, reach, ramp, youth, decl, xp, age, drive, group };
}
const adjOf = (d: number): number => clamp(d / 2, -12, 18);
POST13.fn = (s, key, x) => {
  const n = npDelta18(s, key, x.born, x.facets, x.job, x.kind);
  const a = adjOf(n.delta);
  if (Math.abs(a) < 0.5) return;
  for (const k of ['ear', 'neg', 'cha', 'mgmt'] as const) x.attrs[k] += a;
  if (x.job && x.prof[x.job] !== undefined) x.prof[x.job] += a;
};
POST13.sig = (s, key) => { const v = peek(s)?.x[key]; return v ? String(Math.round(v)) : ''; };

/** CA de quem não é artista, pelos atributos persona13 (já com o ajuste de idade/experiência). */
function caNP(P: P13): number {
  const a = P.attrs, pr = P.prof;
  const job = P.job ?? '';
  const pj = pr[job] ?? 30;
  let v: number;
  if (P.kind === 'player') v = a.ear * 0.25 + a.neg * 0.25 + a.cha * 0.2 + a.mgmt * 0.2 + (pr.exec ?? 40) * 0.1;
  else if (P.key.startsWith('pd:') || job === 'producer') v = (pr.producer ?? pj) * 0.45 + a.ear * 0.3 + a.mgmt * 0.1 + a.cha * 0.15;
  else if (P.key.startsWith('e:') || job === 'manager') v = a.neg * 0.3 + a.cha * 0.2 + a.mgmt * 0.3 + a.ear * 0.2;
  else if (P.kind === 'leader') v = (pr.exec ?? 50) * 0.25 + a.ear * 0.2 + a.neg * 0.2 + a.mgmt * 0.2 + a.cha * 0.15;
  else if (P.kind === 'critic' || P.kind === 'media') v = pj * 0.5 + a.ear * 0.3 + a.cha * 0.2;
  else if (P.kind === 'staff') v = pj * 0.5 + (a.ear + a.neg + a.cha + a.mgmt) / 4 * 0.5;
  else v = (a.ear + a.neg + a.cha + a.mgmt) / 4;
  return clamp(v * 2, 1, 200);
}

// ------------------------------------------------------------------ leitura unificada

export interface Ability18 {
  key: string;
  kind: 'artist' | 'pro' | 'player';
  ca: number;
  pa: number;
  age?: number;
  drive: Drive18;
  /** faixa juvenil (−n), prodígio, desabrochar tardio */
  band?: number; wk?: boolean; lb?: boolean;
  /** artista: teto efetivo (o que a personalidade alcança) */
  eff?: number;
  np?: NpDelta;
}
const canonKey = (s: GameState, key: string): string => {
  if (key === 'player') { const pp = playerPerson(s); return pp ? `p:${pp.id}` : 'player'; }
  return key;
};
const isArtistPerson = (s: GameState, p: Person): boolean => !p.isPlayer || actsOfPerson17(s, p.id).some((a) => a.playerBand || a.members.includes(p.id) && a.status !== 'retired' && a.status !== 'split');

/** CA/PA verdadeiros (o jogador vê `est18`). */
export function ability18(s: GameState, key0: string): Ability18 | null {
  const key = canonKey(s, key0);
  const p = key.startsWith('p:') ? s.persons[key.slice(2)] : undefined;
  if (p && isArtistPerson(s, p)) {
    const rec = recOf(s, p);
    const dv = drive18(s, p);
    const ca = caOf18(p);
    return { key, kind: 'artist', ca, pa: Math.max(rec.pa, Math.round(ca)), age: s.year - p.born, drive: dv, band: rec.b, wk: !!rec.wk, lb: !!rec.lb, eff: Math.round(rec.pa * reachOf(dv.v)) };
  }
  const P = per13(s, key);
  if (!P) return null;
  const ca = caNP(P);
  if (P.kind === 'player') {
    const pa = Math.max(Math.round(ca), peek(s)?.pl ?? Math.round(clamp(ca + 25 + hu(s, 'player', 'pa') * 45, 1, 200)));
    return { key, kind: 'player', ca, pa, age: P.born ? s.year - P.born : undefined, drive: driveOf(P.facets) };
  }
  const np = npDelta18(s, key, P.born, P.facets, P.job, P.kind);
  const pa = Math.round(clamp(ca - adjOf(np.delta) * 2 + np.margin, Math.round(ca), 200));
  return { key, kind: 'pro', ca, pa, age: np.age, drive: np.drive, np };
}
/** Profissional do mercado (ainda não contratado): pela habilidade. */
export function abilityStaff18(s: GameState, st: StaffMember): { ca: number; pa: number } {
  const np = npDelta18(s, `s:${st.id}`, undefined, {}, st.role, 'staff');
  const ca = clamp(st.skill * 2, 1, 200);
  return { ca, pa: Math.round(clamp(ca - adjOf(np.delta) * 2 + np.margin, ca, 200)) };
}

// ------------------------------------------------------------------ visibilidade (scouting)

export interface Est18 { ca: number; caLo: number; caHi: number; paLo: number; paHi: number; mine: boolean; know: number; judge: number; why: L[]; report: L[] }
export const stars18 = (v: number): number => clamp(Math.round(v / 40 * 2) / 2, 0.5, 5);
/** O "olho" de quem avalia: o melhor A&R da equipe ou o seu próprio ouvido (0..1). */
export function judge18(s: GameState): { v: number; who: string } {
  let best = (per13(s, 'player')?.attrs.ear ?? 40) * 2, who = 'player';
  for (const st of s.player.staff) {
    if (st.role !== 'anr') continue;
    const a = ability18(s, `s:${st.id}`);
    if (a && a.ca > best) { best = a.ca; who = `s:${st.id}`; }
  }
  return { v: clamp(best / 200, 0, 1), who };
}
const mineKey = (s: GameState, key: string): boolean => {
  if (key === 'player' || key.startsWith('s:')) return true;
  if (!key.startsWith('p:')) return false;
  const p = s.persons[key.slice(2)];
  return !!p && (p.isPlayer || actsOfPerson17(s, p.id).some((a) => a.owner === 'player' || a.playerBand));
};

/** O que o jogador acha: faixas de CA e PA com incerteza (conhecimento × olho), mais o relatório. */
export function est18(s: GameState, key0: string): Est18 | null {
  const key = canonKey(s, key0);
  const A = ability18(s, key);
  if (!A) return null;
  const mine = mineKey(s, key);
  const J = judge18(s);
  const why: L[] = [];
  let caK: number, paK: number;
  if (mine) { caK = 1; paK = 0.75; why.push(l('Gente sua: você convive e mede de perto.', 'Your own people: you see them up close.')); }
  else if (key.startsWith('p:')) {
    const k = knownLevel(s, key.slice(2));
    caK = Math.max(k.priv, k.pub * 0.75) / 5; paK = k.priv / 5;
    why.push(fmtL(l('Conhecimento: grau {d}/5 (olheiros/relação), exposição pública {e}/5.', 'Knowledge: degree {d}/5 (scouts/relationship), public exposure {e}/5.'), { d: k.priv, e: k.exp }));
  } else { caK = 0.6; paK = 0.3; why.push(l('Figura do meio: o trabalho é público, o teto não.', 'Industry figure: the work is public, the ceiling is not.')); }
  const age = A.age ?? 35;
  const proven = age >= 40 ? 0.3 : age >= 30 ? 0.55 : 1;
  if (proven < 1) why.push(l('Carreira longa: o teto já se mostrou.', 'Long career: the ceiling has shown itself.'));
  const errCA = mine ? 0 : Math.max(2, (1 - caK) * 40 * (1.25 - J.v * 0.6));
  const errPA = Math.max(3, (mine ? (1 - J.v) * 26 + 4 : (1 - paK * 0.85) * 52 * (1.3 - J.v * 0.7)) * proven);
  why.push(fmtL(l('Olho de quem avalia: {v}/200 ({w}).', 'Evaluator\'s eye: {v}/200 ({w}).'), { v: Math.round(J.v * 200), w: J.who === 'player' ? l('você', 'you') : per13(s, J.who)?.name ?? '' }));
  const bucket = `${Math.round(caK * 4)}${Math.round(paK * 4)}${Math.round(J.v * 5)}`;
  const bCA = (hu(s, key, 'ec' + bucket) - 0.5) * errCA;
  const bPA = (hu(s, key, 'ep' + bucket) - 0.5) * errPA;
  const ca = clamp(A.ca + bCA, 1, 200);
  const caLo = clamp(ca - errCA / 2, 1, 200), caHi = clamp(ca + errCA / 2, 1, 200);
  const pm = clamp(A.pa + bPA, ca, 200);
  const paLo = clamp(pm - errPA / 2, caLo, 200), paHi = clamp(Math.max(pm + errPA / 2, paLo + 2), 1, 200);
  const e: Est18 = { ca: Math.round(ca), caLo: Math.round(caLo), caHi: Math.round(caHi), paLo: Math.round(paLo), paHi: Math.round(paHi), mine, know: (caK + paK) / 2, judge: J.v, why, report: [] };
  e.report = report18(s, A, e, paK);
  return e;
}

/** Relatório de olheiro em frases (só usa o que o jogador sabe). */
function report18(s: GameState, A: Ability18, e: Est18, paK: number): L[] {
  const out: L[] = [];
  const age = A.age ?? 35;
  const mid = (e.paLo + e.paHi) / 2;
  const room = mid - e.ca;
  const wide = e.paHi - e.paLo > 40;
  if (A.kind === 'artist' && A.wk && paK >= 0.5) out.push(l('Prodígio: pode virar uma estrela.', 'Wonderkid: could become a star.'));
  else if (mid >= 150 && room >= 30 && age < 26) out.push(l('Pode virar uma estrela.', 'Could become a star.'));
  else if (room >= 30 && age < 25) out.push(l('Cru, mas com muito espaço para crescer.', 'Raw, but plenty of room to grow.'));
  else if (room <= 10 && age >= 26) out.push(l('Já está no limite do que pode render.', 'Already at their limit.'));
  else if (room >= 12) out.push(l('Ainda tem margem para evoluir.', 'Still has room to improve.'));
  else out.push(l('Perto do auge.', 'Close to their peak.'));
  if (A.kind === 'artist' && A.lb && paK >= 0.75) out.push(l('Desabrochar tardio: o melhor deve vir depois dos 25.', 'Late bloomer: the best should come after 25.'));
  if (paK >= 0.6 || e.mine) {
    if (A.drive.v >= 1.2) out.push(l('Profissional e ambicioso: vai atrás do próprio teto.', 'Professional and ambitious: will chase their ceiling.'));
    else if (A.drive.v <= 0.8) out.push(l('O talento é maior que a disciplina: pode não render tudo.', 'Talent outruns discipline: may never deliver it all.'));
  }
  if (A.kind === 'artist' && age >= 40) out.push(l('Passou do auge físico: voz e palco tendem a cair; a escrita aguenta.', 'Past the physical peak: voice and stage tend to fade; writing holds.'));
  if (A.band && !e.mine && paK < 0.5) out.push(fmtL(l('Jovem: os olheiros só arriscam a faixa −{b}.', 'Young: scouts only dare the −{b} band.'), { b: A.band }));
  if (wide) out.push(l('Avaliação incerta: mande olheiros ou convide para uma conversa.', 'Uncertain read: send scouts or invite them for a talk.'));
  return out;
}

/** Ato: média dos integrantes (CA e faixa de PA estimadas), com o destaque. */
export function actEst18(s: GameState, a: Act): { ca: number; paLo: number; paHi: number; best?: string; n: number } | null {
  let ca = 0, lo = 0, hi = 0, n = 0, bv = -1, best: string | undefined;
  for (const id of a.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    const e = est18(s, `p:${id}`);
    if (!e) continue;
    ca += e.ca; lo += e.paLo; hi += e.paHi; n++;
    if (e.paHi > bv) { bv = e.paHi; best = id; }
  }
  return n ? { ca: ca / n, paLo: lo / n, paHi: hi / n, best, n } : null;
}
/** Pontos de "promessa" do ato para quem decide (bot/rivais): espaço estimado × juventude. */
export function prospect18(s: GameState, a: Act): number {
  const e = actEst18(s, a);
  if (!e) return 0;
  const ages = a.members.map((id) => s.year - (s.persons[id]?.born ?? s.year - 30));
  const young = ages.length ? clamp((30 - Math.min(...ages)) / 10, 0, 1) : 0;
  return clamp(((e.paLo + e.paHi) / 2 - e.ca) * young / 4, 0, 15) + clamp((e.ca - 100) / 10, -4, 6);
}

// ------------------------------------------------------------------ passo mensal (artistas)

const SICK = new Set(['burnout', 'addiction', 'ill']);
const realCurve = (cy: number): number => cy < 0 ? Math.max(0.55, 0.72 + 0.04 * (cy + 5)) : cy <= 4 ? 0.78 + 0.055 * cy : cy <= 10 ? 1 : Math.max(0.72, 1 - 0.012 * (cy - 10));
const focus = (w: W, k: SkillId): number => (w[k] >= 0.2 ? 7 : w[k] >= 0.1 ? 2 : -5);

function stepPerson(s: GameState, p: Person, a: Act, dt: number, my: boolean, best: Partial<Record<SkillId, number>>): void {
  const st = ab18(s);
  const mi = s.year * 12 + s.month;
  const rec = ensureRec(s, p);
  if (rec.t === mi) return;
  rec.t = mi;
  const age = s.year - p.born + s.month / 12;
  const dv = drive18(s, p).v;
  const ev = st.e[p.id];
  if (ev) delete st.e[p.id];
  // experiência real: no seu selo pelos ganchos (shows/gravações/composições); NPC pela atividade do ato
  const showF = my ? Math.min(1.5, (ev?.[0] ?? 0) / (3 * dt)) : a.status === 'active' ? 0.5 : 0.15;
  const recF = my ? Math.min(1.5, ((ev?.[1] ?? 0) + (ev?.[2] ?? 0) * 0.5) / (2 * dt)) : s.week - a.lastRelease < 30 ? 0.5 : 0.1;
  const prodCA = ev?.[3] ?? 0;
  const key = `p:${p.id}`;
  const train = (st.tr[key] ?? 0) > s.week;
  const mt = st.mt[p.id];
  const mentor = mt && mt[1] > s.week ? s.persons[mt[0]] : undefined;
  if (mt && !mentor) delete st.mt[p.id];
  const sick = SICK.has(p.health);
  const long = stress17(s).l[p.id] ?? 0;
  const stressF = p.stress > 75 || long > 45 ? 0.35 : 1;
  const w = weights18(p.role);
  const eff = rec.pa * reachOf(dv) + (mentor ? 6 : 0) + (train ? 4 : 0);
  const C: Record<string, number> = {};
  const add = (c: string, k: SkillId, v: number) => { if (v) C[c] = (C[c] ?? 0) + v * w[k] * 2; };
  const ca0 = caOf18(p);
  for (const k of SK) {
    const [end0, dec, rate] = AGE[k];
    const end = end0 + (rec.lb ? 6 : 0);
    const cap = clamp(eff / 2 + focus(w, k), 5, 99);
    const cur = p.skills[k];
    const youth = age < end ? 1 + (end - age) / 12 : Math.max(0.1, 1 - (age - end) / 15);
    const lbF = rec.lb ? (age >= 24 && age <= 35 ? 1.5 : age < 22 ? 0.6 : 1) : 1;
    const base = 0.12 * youth * lbF * dv * Math.max(0, cap - cur) / Math.max(10, cap) * dt * (sick ? 0 : stressF);
    const live = k === 'stage' || k === 'voice' || k === 'instr' ? showF : 0;
    const studio = k === 'comp' || k === 'lyr' || k === 'prod' || k === 'instr' || k === 'voice' ? recF * (k === 'instr' || k === 'voice' ? 0.5 : 1) : 0;
    const tr = train && w[k] >= 0.1 ? 1.1 : 0;
    const colleague = (best[k] ?? 0) >= cur + 15 ? 0.3 : 0;
    const prodM = prodCA >= cur * 2 + 30 && (k === 'prod' || k === 'comp') ? 0.4 : 0;
    const mentM = mentor && mentor.skills[k] >= cur + 10 ? 0.6 : 0;
    const parts: [string, number][] = [['nat', base], ['show', base * live * 1.2], ['rec', base * studio * 1.2], ['train', base * tr], ['mentor', base * (colleague + prodM + mentM)]];
    let gain = parts.reduce((t, x) => t + x[1], 0);
    const room = Math.max(0, cap - cur);
    const scale = gain > room ? room / gain : 1;
    gain *= scale;
    let loss = 0;
    const over = age - dec;
    if (over > 0) { const d = rate / 12 * (1 + over / 10) * dt * (1.15 - dv * 0.25) * (train ? 0.7 : 1); loss += d; add('age', k, -d); }
    if (sick && (k === 'stage' || k === 'voice' || k === 'instr')) { loss += 0.08 * dt; add('health', k, -0.08 * dt); }
    if (p.health === 'voice_strain' && k === 'voice') { loss += 0.15 * dt; add('health', k, -0.15 * dt); }
    if (long > 65 && (k === 'comp' || k === 'lyr' || k === 'stage')) { loss += 0.05 * dt; add('stress', k, -0.05 * dt); }
    for (const [c, v] of parts) add(c, k, v * scale);
    p.skills[k] = clamp(cur + gain - loss, 3, 99);
  }
  // modo Vida real exata: o auge do artista real segue a época real da carreira (estreia + 4..10 anos)
  if (histMode(s) === 'strict' && realOf(s, p)) {
    const tgt = rec.pa * realCurve(s.year - a.debutYear);
    const ca = caOf18(p);
    if (Math.abs(tgt - ca) > 3) {
      const f = clamp(1 + (tgt - ca) / ca * Math.min(1, 0.15 * dt), 0.85, 1.15);
      for (const k of SK) p.skills[k] = clamp(p.skills[k] * f, 3, 99);
      C.hist = (C.hist ?? 0) + caOf18(p) - ca;
    }
  }
  const ca = caOf18(p);
  if (ca > rec.pa) rec.pa = Math.round(ca);
  p.potential = Math.round(clamp(eff / 2, 5, 100));
  if (my) {
    const d = (st.d[key] ??= {});
    for (const [c, v] of Object.entries(C)) d[c] = Math.round(((d[c] ?? 0) + v) * 100) / 100;
    milestones(s, p, rec, ca0, ca);
  }
}

/** Marcos do seu elenco viram fatos e mensagens (uma vez cada). */
function milestones(s: GameState, p: Person, rec: AbRec, ca0: number, ca: number): void {
  const st = ab18(s);
  for (const th of [120, 150, 175]) {
    if (ca0 < th && ca >= th && !st.seen[`${p.id}|${th}`]) {
      st.seen[`${p.id}|${th}`] = s.year;
      const txt = fmtL(th >= 175 ? l('{n} chegou a um nível de lenda ({v}/200).', '{n} reached a legend\'s level ({v}/200).') : th >= 150 ? l('{n} virou um(a) artista de primeira linha ({v}/200).', '{n} became a top-tier artist ({v}/200).') : l('{n} amadureceu como artista ({v}/200).', '{n} matured as an artist ({v}/200).'), { n: p.name, v: Math.round(ca) });
      emitFact(s, { kind: 'memory', actors: [p.id], severity: th >= 150 ? 35 : 15, visibility: th >= 150 ? 'public' : 'rumor', tags: ['ability', 'good'], text: txt, src: 'ability18' });
      if (th >= 150) pushInbox18(s, 'ability18', { from: l('Desenvolvimento', 'Development').pt, subject: txt, body: l('A evolução vem de idade, estrada, estúdio, aulas e mentores — veja a aba Desenvolvimento.', 'Growth comes from age, the road, the studio, lessons and mentors — see the Development tab.'), ref: { key: `p:${p.id}` }, tone: 'good' });
    }
  }
  if (rec.wk && !st.seen[`${p.id}|wk`]) {
    st.seen[`${p.id}|wk`] = s.year;
    pushInbox18(s, 'ability18', { from: 'A&R', subject: fmtL(l('Seu A&R acha que {n} pode virar uma estrela.', 'Your A&R thinks {n} could become a star.'), { n: p.name }), body: l('Jovem, teto altíssimo. Estrada, estúdio, aulas e um bom mentor aceleram; estresse e vícios travam.', 'Young, sky-high ceiling. The road, the studio, lessons and a good mentor speed it up; stress and vices stall it.'), ref: { key: `p:${p.id}` }, tone: 'good' });
  }
}

function stepAct(s: GameState, a: Act, dt: number, my: boolean): void {
  const ms: Person[] = [];
  for (const id of a.members) { const p = s.persons[id]; if (p?.alive) ms.push(p); }
  if (!ms.length) return;
  const best: Partial<Record<SkillId, number>> = {};
  if (ms.length > 1) for (const p of ms) for (const k of SK) best[k] = Math.max(best[k] ?? 0, p.skills[k]);
  for (const p of ms) stepPerson(s, p, a, dt, my, best);
}

registerSimHook('newgame', 'ability18', (s) => {
  const st = ab18(s);
  for (const p of Object.values(s.persons)) if (p.alive && !st.p[p.id]) st.p[p.id] = genPA18(s, p);
});

registerSimHook('month', 'ability18', (s) => {
  const st = ab18(s);
  const mi = s.year * 12 + s.month;
  for (const a of Object.values(s.acts)) {
    if (a.status === 'retired' || a.status === 'split' || a.deceased) continue;
    const my = a.owner === 'player' || !!a.playerBand;
    if (!my && (hashString(a.id) + mi) % 3) continue;
    stepAct(s, a, my ? 1 : 3, my);
  }
  // equipe: o trabalho ensina (mais com curso pago)
  for (const sm of s.player.staff) {
    const k = `s:${sm.id}`;
    st.x[k] = Math.round(Math.min(70, (st.x[k] ?? 0) + 0.15 + ((st.tr[k] ?? 0) > s.week ? 0.5 : 0)) * 100) / 100;
  }
  if (st.pl === undefined) { const A = ability18(s, 'player'); if (A?.kind === 'player') st.pl = A.pa; }
  for (const [k, w] of Object.entries(st.tr)) if (w <= s.week) delete st.tr[k];
});

registerSimHook('year', 'ability18', (s) => {
  const st = ab18(s);
  const keys = new Set<string>(['player']);
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) keys.add(`p:${pid}`);
  for (const sm of s.player.staff) keys.add(`s:${sm.id}`);
  for (const a of Object.values(s.acts)) if (a.fame >= 40 && a.status !== 'retired' && a.status !== 'split') for (const pid of a.members) keys.add(`p:${pid}`);
  for (const k of keys) {
    const A = ability18(s, k);
    if (!A) continue;
    const h = (st.h[k] ??= []);
    if (h[h.length - 2] === s.year) continue;
    h.push(s.year, Math.round(A.ca));
    if (h.length > 120) h.splice(0, h.length - 120);
  }
  // relatório anual do seu elenco
  const rows: [string, number][] = [];
  for (const [k, d] of Object.entries(st.d)) rows.push([k, Object.values(d).reduce((t, v) => t + v, 0)]);
  st.dp = st.d; st.d = {};
  const mine = rows.filter(([k]) => mineKey(s, k)).sort((x, y) => y[1] - x[1]);
  if (mine.length) {
    const nm = (k: string) => s.persons[k.slice(2)]?.name ?? k;
    const up = mine.filter((x) => x[1] >= 1).slice(0, 3).map(([k, v]) => `${nm(k)} +${Math.round(v)}`);
    const dn = mine.filter((x) => x[1] <= -1).slice(-3).map(([k, v]) => `${nm(k)} ${Math.round(v)}`);
    if (up.length || dn.length) pushInbox18(s, 'ability18', {
      from: l('Desenvolvimento', 'Development').pt, subject: fmtL(l('Evolução do elenco em {y}', 'Roster development in {y}'), { y: s.year - 1 }),
      body: fmtL(l('Subiram: {u}. Caíram: {d}. (pontos de habilidade atual, 0–200)', 'Rose: {u}. Fell: {d}. (current ability points, 0–200)'), { u: up.join(', ') || '—', d: dn.join(', ') || '—' }), tone: up.length >= dn.length ? 'good' : 'bad',
    });
  }
});

// ------------------------------------------------------------------ experiência pelos ganchos (seu selo)

const evOf = (s: GameState, pid: string): number[] => (ab18(s).e[pid] ??= [0, 0, 0, 0]);
registerSimHook('show', 'ability18', (s, _r, a) => {
  const act = a.show && s.acts[a.show.actId];
  if (!act) return;
  for (const pid of act.members) if (s.persons[pid]?.alive) evOf(s, pid)[0] += 1;
});
registerSimHook('record', 'ability18', (s, _r, a) => {
  const so = a.song;
  const act = so && s.acts[so.actId];
  if (!so || !act) return;
  const pr = so.producerId ? PRODUCERS.find((x) => x.id === so.producerId) : undefined;
  const pca = pr ? (pr.real ? ability18(s, `pd:${pr.real}`)?.ca ?? pr.skill * 2 : pr.skill * 2) : 0;
  for (const pid of act.members) { if (!s.persons[pid]?.alive) continue; const e = evOf(s, pid); e[1] += 1; e[3] = Math.max(e[3], pca); }
  if (pr?.real) ab18(s).x[`pd:${pr.real}`] = Math.min(40, (ab18(s).x[`pd:${pr.real}`] ?? 0) + 0.2);
});
registerSimHook('compose', 'ability18', (s, _r, a) => {
  const so = a.song;
  if (!so) return;
  const ws = so.splits?.map((x) => x.personId) ?? so.writers ?? [];
  for (const pid of ws) if (s.persons[pid]?.alive) evOf(s, pid)[2] += 1;
});

// ------------------------------------------------------------------ consumidores

// qualidade em dimensões: a técnica do disco reflete o nível de quem toca
registerDimAdj18('ability18', (s, _rel, act) => {
  const xs = act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive);
  if (!xs.length) return [];
  const avg = xs.reduce((t, p) => t + caOf18(p), 0) / xs.length;
  const v = Math.round(clamp((avg - 110) / 12, -4, 4));
  return v ? [{ d: 'tech', v, why: fmtL(l('Nível dos músicos ({v}/200)', 'Musicians\' level ({v}/200)'), { v: Math.round(avg) }) }] : [];
});
// palco: bilheteria acompanha o nível de quem sobe no palco
registerMod('showRevenue', 'ability18', (s, v, c) => {
  const a = c.act;
  if (!a) return null;
  let t = 0, n = 0;
  for (const id of a.members) { const p = s.persons[id]; if (p?.alive) { t += p.skills.stage * 0.6 + caOf18(p) / 2 * 0.4; n++; } }
  if (!n) return null;
  const m = clamp(1 + (t / n - 55) / 800, 0.96, 1.05);
  return Math.abs(m - 1) < 0.005 ? null : { value: v * m, label: m > 1 ? l('nível de palco', 'stage ability') : l('palco ainda cru', 'still-raw stage act') };
});
// propostas: quem tem muito potencial custa mais para compradores informados (o mercado também tem olheiros)
registerOfferMod('ability18', (s, act, o) => {
  if (act.owner === 'player') return null;
  const e = actEst18(s, act);
  if (!e) return null;
  const ages = act.members.map((id) => s.year - (s.persons[id]?.born ?? s.year - 30));
  const young = clamp((29 - Math.min(...ages)) / 8, 0, 1);
  const room = ((e.paLo + e.paHi) / 2 - e.ca) / 200;
  const aware = clamp(0.35 + act.fame / 50 + (s.knowledge[act.id]?.degree ?? 0) * 0.08, 0, 1);
  const prem = clamp(room * young * aware * 1.6, 0, 0.45);
  if (prem < 0.04) return null;
  const advU = toReal(o.advance, s.year) / Math.max(1, expectedAdvance(s, act));
  const short = Math.max(0, 1 + prem - advU);
  const delta = -Math.min(prem, short) * 0.3;
  return delta > -0.01 ? null : { delta, reason: fmtL(l('Promessa: muito potencial — esperam {p}% acima do adiantamento usual.', 'Prospect: high potential — they expect {p}% above the usual advance.'), { p: Math.round(prem * 100) }) };
});

// ------------------------------------------------------------------ ações (aulas, mentor)

const pOf = (s: GameState, key: string): Person | undefined => (key.startsWith('p:') ? s.persons[key.slice(2)] : undefined);
const myArtist = (s: GameState, key: string): boolean => { const p = pOf(s, key); return !!p && !p.isPlayer && p.alive && actsOfPerson17(s, p.id).some((a) => a.owner === 'player'); };
const myStaff = (s: GameState, key: string): boolean => key.startsWith('s:') && s.player.staff.some((x) => `s:${x.id}` === key);

registerPersonAction({
  id: 'train18', label: l('Pagar aulas e preparação (6 meses)', 'Pay for lessons and coaching (6 months)'), group: 'career', icon: 'bulb', cooldown: 26,
  desc: l('Professor, preparador vocal ou curso: acelera os atributos principais da função e segura o declínio.', 'Teacher, vocal coach or course: speeds up the role\'s main attributes and slows decline.'),
  cost: (s, key) => ({ usd: myStaff(s, key) ? 900 : 1500 }),
  visible: (s, key) => myArtist(s, key) || myStaff(s, key),
  available: (s, key) => ((ab18(s).tr[key] ?? 0) > s.week ? l('Já está em aulas.', 'Already in lessons.') : null),
  run: (s, key) => {
    const st = ab18(s);
    st.tr[key] = s.week + 26;
    if (key.startsWith('s:')) st.x[key] = Math.min(70, (st.x[key] ?? 0) + 4);
    return { ok: true, text: l('Aulas marcadas: seis meses de treino.', 'Lessons booked: six months of training.') };
  },
});

/** Melhor mentor possível no seu elenco: mesma função (ou parecida), bem melhor e mais velho. */
export function mentorFor18(s: GameState, p: Person): Person | undefined {
  const ca = caOf18(p);
  let best: Person | undefined, bv = ca + 19;
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) {
    const m = s.persons[pid];
    if (!m?.alive || m.id === p.id || m.born > p.born) continue;
    const v = caOf18(m) + (m.role === p.role ? 10 : 0);
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}
registerPersonAction({
  id: 'mentor18', label: l('Pedir a um veterano do selo para ser mentor', 'Ask a label veteran to mentor them'), group: 'career', icon: 'handshake', cooldown: 26,
  desc: l('Um ano de convivência com alguém bem melhor: cresce mais rápido e alcança mais do próprio teto.', 'A year alongside someone much better: grows faster and reaches more of their ceiling.'),
  visible: (s, key) => myArtist(s, key) && s.year - (pOf(s, key)?.born ?? 0) < 32,
  available: (s, key) => (!mentorFor18(s, pOf(s, key)!) ? l('Ninguém no elenco é bem melhor e mais experiente.', 'No one on the roster is much better and more experienced.') : (ab18(s).mt[key.slice(2)]?.[1] ?? 0) > s.week ? l('Já tem mentor.', 'Already has a mentor.') : null),
  chance: (s, key) => {
    const m = mentorFor18(s, pOf(s, key)!);
    if (!m) return null;
    const f = soul(s, m).f;
    const p = clamp(0.62 + (f.empatia - 50) / 220 + (f.generosidade - 50) / 260 - (f.ego - 50) / 200, 0.2, 0.92);
    return { p, why: [fmtL(l('{m}: empatia {e}, generosidade {g}, ego {o}', '{m}: empathy {e}, generosity {g}, ego {o}'), { m: m.name, e: f.empatia, g: f.generosidade, o: f.ego })] };
  },
  run: (s, key, _r, ok) => {
    const p = pOf(s, key)!;
    const m = mentorFor18(s, p)!;
    if (!ok) { m.rel[p.id] = clamp((m.rel[p.id] ?? 0) - 3, -100, 100); return { ok, text: fmtL(l('{m} não quis: "não sou babá".', '{m} declined: "I\'m not a babysitter."'), { m: m.name }) }; }
    ab18(s).mt[p.id] = [m.id, s.week + 52];
    m.rel[p.id] = clamp((m.rel[p.id] ?? 0) + 6, -100, 100);
    p.rel[m.id] = clamp((p.rel[m.id] ?? 0) + 8, -100, 100);
    return { ok, text: fmtL(l('{m} topou ser mentor de {p} por um ano.', '{m} agreed to mentor {p} for a year.'), { m: m.name, p: p.name }) };
  },
});

// ------------------------------------------------------------------ caixa, conselheiro, por quês

registerInboxKind('ability18', { label: l('Desenvolvimento', 'Development'), cat: 'people', icon: 'star', prio: 1, goto: (_s, m) => (m.ref?.key ? { person: String(m.ref.key) } : { area: 'artists' }) });

registerAdvisorTip('ability18', (s) => {
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  const st = ab18(s);
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) {
    const p = s.persons[pid];
    if (!p?.alive || p.isPlayer) continue;
    const A = ability18(s, `p:${pid}`);
    if (!A || (A.age ?? 30) > 25 || A.pa - A.ca < 35 || (st.tr[`p:${pid}`] ?? 0) > s.week || st.mt[pid]) continue;
    out.push({
      id: `ab18-${pid}`, level: 'info', cat: 'people', score: 40 + Math.min(20, (A.pa - A.ca) / 4),
      text: fmtL(l('{n} é jovem e tem muito espaço para crescer.', '{n} is young with lots of room to grow.'), { n: p.name }),
      why: [l('Aulas e um mentor aceleram a evolução; estrada e estúdio também contam.', 'Lessons and a mentor speed growth; the road and the studio count too.')],
      effect: l('Aulas: ~+1 ponto/mês nos atributos principais por 6 meses.', 'Lessons: ~+1 point/month on main attributes for 6 months.'),
      goto: { person: `p:${pid}` },
    });
    if (out.length >= 2) return out;
  }
  return out;
});

export const CAUSE18: Record<string, L> = {
  nat: l('Idade e talento (crescimento natural)', 'Age and talent (natural growth)'), show: l('Estrada (shows)', 'The road (shows)'), rec: l('Estúdio (gravar e compor)', 'Studio (recording and writing)'),
  train: l('Aulas e preparação', 'Lessons and coaching'), mentor: l('Mentores (colegas, produtor, veterano)', 'Mentors (bandmates, producer, veteran)'), age: l('Declínio da idade', 'Age decline'),
  health: l('Saúde (doença, vício, voz)', 'Health (illness, addiction, voice)'), stress: l('Desgaste e estresse', 'Burnout and stress'), hist: l('História real (auge na época real)', 'Real history (peak in its real era)'),
};
registerExplain('ability.ca', (s, c) => {
  const key = String(c.key ?? '');
  const A = ability18(s, key);
  if (!A) return null;
  const st = ab18(s);
  const k = canonKey(s, key);
  const parts: WhyPart[] = [];
  const d = st.d[k], dp = st.dp[k];
  if (d) for (const [cz, v] of Object.entries(d)) if (Math.abs(v) >= 0.05) parts.push({ label: CAUSE18[cz] ?? cz, value: Math.round(v * 10) / 10, fmt: 'signed', tone: v > 0 ? 'good' : 'bad' });
  if (dp) parts.push({ label: l('Ano passado (total)', 'Last year (total)'), value: Math.round(Object.values(dp).reduce((t, v) => t + v, 0) * 10) / 10, fmt: 'signed' });
  if (A.np) {
    parts.push({ label: l('Experiência acumulada', 'Accumulated experience'), value: Math.round(A.np.xp), fmt: 'signed', tone: 'good' });
    if (A.np.youth) parts.push({ label: l('Juventude (ainda aprendendo)', 'Youth (still learning)'), value: -Math.round(A.np.youth), fmt: 'signed', tone: 'bad' });
    if (A.np.decl) parts.push({ label: l('Idade', 'Age'), value: -Math.round(A.np.decl), fmt: 'signed', tone: 'bad' });
  }
  parts.push({ label: l('Personalidade (profissionalismo, ambição, determinação, temperamento)', 'Personality (professionalism, ambition, determination, temperament)'), value: Math.round(A.drive.v * 100) / 100, fmt: 'mult' });
  return { title: l('Habilidade atual', 'Current ability'), value: Math.round(A.ca), fmt: 'num', parts, note: l('Soma ponderada dos atributos pela função (0–200). Cresce até o teto oculto; idade, saúde e estresse puxam para baixo.', 'Role-weighted sum of attributes (0–200). Grows toward the hidden ceiling; age, health and stress pull it down.') };
});
registerExplain('ability.pa', (s, c) => {
  const e = est18(s, String(c.key ?? ''));
  if (!e) return null;
  return {
    title: l('Potencial (estimado)', 'Potential (estimated)'), value: `${e.paLo}–${e.paHi}`, fmt: 'text',
    parts: e.why.map((w) => ({ label: w })),
    note: l('O teto verdadeiro é oculto. A faixa estreita com olheiros, convivência e um A&R melhor.', 'The true ceiling is hidden. The range narrows with scouts, time together and a better A&R.'),
  };
});

export const _ab18 = { caNP, stepPerson, realCurve, reachOf };
