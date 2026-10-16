// R31 · onda 3 (AP) — APARÊNCIA E SEX APPEAL, fonte única.
//
//  • Ficha de aparência de cada pessoa (artista, NPC e jogador — o mesmo modelo): base física (sorteio fixo pela
//    semente, a mesma que a ficha usava), forma física (muda devagar), estilo (figurino, cabelo, styling: sobe rápido e
//    volta ao próprio padrão sem manutenção), marcas temporárias com prazo (inchaço, lesão, olheiras, cabelo raspado,
//    visual que virou piada) e segredos (procedimento escondido). Só o que MUDOU é guardado (`x4.look31.p[id]`); quem
//    nunca passou por nada é calculado (idade, estresse, saúde, vícios lidos do estado de sempre).
//  • Calculado, nunca guardado: aparência (0–100), estilo atual, sex appeal (= aparência + carisma + estilo, com peso por
//    era, gênero musical e público). O atributo "Imagem e visual" da persona13 passa a ler daqui (`LOOKH31.imgDelta`)
//    e o modificador `persona13img` continua o ÚNICO ponto que entra no apelo (o peso de gênero/público/pressão vem por
//    `LOOKH31.weight`).
//  • Conhecimento: o público vê a aparência percebida (o que aparece, sem saber o que é procedimento); o procedimento
//    escondido é segredo (KNOW_FIELDS.lookSecret), vira boato e a imprensa pode descobrir (fato público via emitFact).
//  • Melhorar: academia, nutricionista, estilista, dentista estético, dermatologista/spa, cirurgião (plástica desde
//    1950, botox 2002, harmonização 2018) e consultor de imagem — pagos do bolso da pessoa, pela empresa (cláusula de
//    imagem) ou como presente seu. O artista pode recusar (vaidade, autenticidade); insistir pesa na opinião.
//  • Piorar: idade (curva; alguns envelhecem bem), vícios, estresse/turnê sem descanso, peso numa pausa ou tristeza,
//    lesão, procedimento mal feito, visual polêmico; cigarro e gritaria gastam a voz.
//  • Doze acontecimentos com escolha (cartões de decisão), sorteados com sorte própria por mês (não deslocam outros
//    sistemas). Tom: pressão estética como crítica histórica; opção "Pressão estética: normal / suave / desligada".
//  • A família Fossati não está em `s.persons` (fossati31): fica fora do envelhecimento por construção.
//
// Interruptor `look31` (padrão ligado): desligado = tudo como antes (imagem recalculada de carisma/vaidade/palco).

import { clamp, hashString, Rng } from '../core/rng';
import { familyOf, l, type FamilyId, type L } from '../data/world';
import { emitEvent, type Ctx, type EventDef } from './events';
import { deferEvents, registerExt4, registerSimHook } from './ext4';
import { emitFact } from './facts17';
import { know, see } from './know';
import { opine, opinionOf } from './opinion';
import { LOOKH31, type LookUse31 } from './r31/lookhook31';
import { drawFor, purse } from './r31/purse31';
import { registerSwitch, setSw, sw } from './r31/switches';
import { withTxn } from './r31/txn';
import { registerEditable, registerRunnable } from './r31/editor';
import { cashWhy20, freeCash20 } from './oblig20';
import { goods } from './sys/goods8';
import { ownerOf } from './sys/people/owner';
import { soul } from './sys/soul9';
import { vices } from './sys/vices';
import type { Act, GameState, Person } from './types';
import { fmtL, money, playerActs, post } from './util';
import { actsOfPerson17 } from './actidx17';

// ---------------------------------------------------------------- interruptores

registerSwitch({
  id: 'look31', def: true, scope: 'game',
  desc: l('Aparência guardada na ficha (forma, estilo, marcas, segredos), sex appeal por era/gênero/público, cuidados e acontecimentos; desligado volta à imagem recalculada de carisma, vaidade e palco.',
    'Appearance kept on the sheet (fitness, style, marks, secrets), sex appeal by era/genre/audience, care and events; off reverts to image recalculated from charisma, vanity and stage.'),
});
export type Pressure31 = 'normal' | 'soft' | 'off';
registerSwitch({
  id: 'look31.pressure', def: 'normal', scope: 'game',
  desc: l('Pressão estética: normal (como foi na história), suave (metade) ou desligada (a aparência física não pesa; estilo e carisma sim).',
    'Beauty pressure: normal (as it was historically), soft (half) or off (physical looks do not weigh; style and charisma do).'),
});
export const lookOn31 = (s: GameState): boolean => sw<boolean>(s, 'look31');
export function pressure31(s: GameState): Pressure31 {
  const v = sw<string>(s, 'look31.pressure');
  return v === 'soft' || v === 'off' ? v : 'normal';
}
/** quanto da aparência física conta (1 normal, 0,5 suave, 0 desligada) */
export const pk31 = (s: GameState): number => ({ normal: 1, soft: 0.5, off: 0 })[pressure31(s)];
export const PRESSURE31: Record<Pressure31, L> = {
  normal: l('Normal (como foi na história)', 'Normal (as it was historically)'),
  soft: l('Suave', 'Soft'),
  off: l('Desligada', 'Off'),
};

// ---------------------------------------------------------------- estado

/** Marca temporária: [tipo, até a semana, pontos de aparência]. */
export type MarkKind31 = 'swell' | 'injury' | 'bags' | 'shaved' | 'meme' | 'trend' | 'tattoo' | 'bruise' | 'glow';
export type Mark31 = [MarkKind31, number, number];
/** Segredo: [semana, pontos, estado 0 escondido · 1 boato · 2 público, procedimento, quem pagou 'label'|'self'|'me']. */
export type Secret31 = [number, number, 0 | 1 | 2, string, string];
export interface LookRec31 {
  /** versão (sobe a cada mudança — cache da ficha) */
  v: number;
  /** forma física acumulada (−30..+20) */
  f?: number;
  /** estilo reforçado (0..100) e mês absoluto do reforço */
  st?: number; stM?: number;
  /** pontos de procedimentos estéticos aparentes (cirurgia, botox, harmonização) */
  sg?: number;
  /** sorriso (dentista) */
  sm?: number;
  /** meses de cuidados de pele (spa/dermatologista): retardam o envelhecimento */
  ag?: number;
  /** peso: + ganho numa pausa ou tristeza, − dieta (afeta a forma, nunca é piada) */
  wt?: number;
  /** desgaste da voz acumulado (cigarro, gritaria); cada ponto inteiro sai da voz */
  vz?: number;
  mk?: Mark31[];
  sec?: Secret31[];
  /** cuidados recusados (para a insistência pesar mais) */
  ref?: number;
  /** procedimentos de risco já feitos (cada um aumenta o risco do próximo) */
  n?: number;
  /** abraçou o grisalho (ícone) */
  icon?: 1;
  /** último cuidado: [semana, serviço] (alguns poucos) */
  h?: [number, string][];
}
export interface Look31St { p: Record<string, LookRec31>; cd: Record<string, number>; n: number }
declare module './ext4' { interface Ext4 { look31: Look31St } }
const fresh = (): Look31St => ({ p: {}, cd: {}, n: 0 });
registerExt4('look31', fresh);
export function look31(s: GameState): Look31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.look31 ??= fresh()) as Look31St;
  st.p ??= {}; st.cd ??= {}; st.n ??= 0;
  return st;
}
export function rec31(s: GameState, pid: string): LookRec31 | undefined { return look31(s).p[pid]; }
function recW(s: GameState, pid: string): LookRec31 {
  const st = look31(s);
  const r = (st.p[pid] ??= { v: 0 });
  r.v++;
  return r;
}

// ---------------------------------------------------------------- cálculo (puro)

/** Mesmo hash da ficha (persona13): a base física é a mesma que a imagem já usava. */
const u = (s: GameState, pid: string, k: string): number => hashString(`${s.config.seed}|p13|p:${pid}|${k}`) / 4294967296;
const mAbs = (s: GameState): number => s.year * 12 + s.month;
const ageOf = (s: GameState, p: Person): number => Math.max(0, s.year - (p.born ?? s.year - 25));
/** Envelhece bem (vira ícone): ~1 em 5, fixo pela semente. */
export const agesWell31 = (s: GameState, pid: string): boolean => u(s, pid, 'agew') < 0.22;
/** Fuma (pessoa do mundo): mais comum antes de 1990, fixo pela semente. */
export function smoker31(s: GameState, p: Person): boolean {
  if (p.isPlayer) return vices(s)?.smoking ?? false;
  const born = p.born ?? 1950;
  const rate = born < 1940 ? 0.55 : born < 1965 ? 0.42 : born < 1985 ? 0.25 : 0.12;
  return u(s, p.id, 'smoke') < rate;
}

/** Base física fixa (0..100): 25 + sorteio × 50 (o mesmo sorteio da imagem antiga). */
export const base31 = (s: GameState, pid: string): number => 25 + u(s, pid, 'img') * 50;
/** Estilo padrão: quanto a pessoa cuida do próprio visual sozinha (a vaidade). */
export const styleDef31 = (s: GameState, p: Person): number => soul(s, p).f.vaidade;

/** Curva da idade: nada até os 35; depois desce (mais devagar para quem envelhece bem e com cuidados de pele). */
export function ageDelta31(s: GameState, p: Person, r = rec31(s, p.id)): number {
  const care = Math.min(6, (r?.ag ?? 0) / 12 * 0.6);
  const age = ageOf(s, p) - care;
  if (age <= 35) return 0;
  const k = agesWell31(s, p.id) ? 0.45 : 1;
  const d = Math.min(age, 55) - 35;
  const e = Math.max(0, age - 55);
  return -(d * 0.55 + e * 0.35) * k;
}

export interface LookPart31 { why: L; v: number }
export interface LookView31 {
  pid: string;
  /** base física fixa */
  base: number;
  /** aparência real (0..100): base + idade + forma + marcas + procedimentos + saúde */
  A: number;
  /** sem os procedimentos (o que a pessoa seria sem eles) */
  natural: number;
  /** aparência que entra no jogo, já com a pressão estética escolhida */
  Aeff: number;
  /** estilo atual e o padrão dela */
  S: number; D: number;
  /** forma física (0..100) */
  form: number;
  marks: Mark31[];
  parts: LookPart31[];
}

export function view31(s: GameState, p: Person): LookView31 {
  const r = rec31(s, p.id);
  const parts: LookPart31[] = [];
  const add = (why: L, v: number) => { if (Math.abs(v) >= 0.5) parts.push({ why, v: Math.round(v) }); };
  const base = base31(s, p.id);
  const age = ageDelta31(s, p, r);
  add(agesWell31(s, p.id) && age < 0 ? l('Idade (envelhece bem)', 'Age (ages well)') : l('Idade', 'Age'), age);
  // forma: acumulada (treino, dieta, pausa) + peso, que só pesa pela forma (nunca vira piada)
  const f = clamp((r?.f ?? 0) - Math.max(0, (r?.wt ?? 0)) * 0.6 + Math.max(0, -(r?.wt ?? 0)) * 0.3, -30, 20);
  add(f >= 0 ? l('Forma física', 'Fitness') : l('Fora de forma', 'Out of shape'), f * 0.5);
  // saúde, estresse, cansaço e vícios (lidos do estado de sempre)
  let hs = 0;
  hs -= Math.max(0, p.stress - 60) / 8 + Math.max(0, p.fatigue - 70) / 10;
  if (p.health === 'burnout') hs -= 4;
  if (p.health === 'ill') hs -= 3;
  if (p.health === 'addiction') hs -= 6;
  if (p.isPlayer) { const v = vices(s); if (v) hs -= (Math.max(0, v.dep.drink - 40) + Math.max(0, v.dep.drugs - 30)) / 12 + (v.smoking ? 1.5 : 0); }
  add(l('Saúde, estresse e vícios', 'Health, stress and vices'), hs);
  let mk = 0;
  const marks = (r?.mk ?? []).filter((m) => m[1] >= s.week);
  for (const m of marks) mk += m[2];
  add(l('Marcas do momento', 'Current marks'), mk);
  const proc = (r?.sg ?? 0) + (r?.sm ?? 0);
  add(l('Procedimentos e sorriso', 'Procedures and smile'), proc);
  const natural = clamp(base + age + f * 0.5 + hs + mk, 1, 99);
  const A = clamp(natural + proc, 1, 99);
  const Aeff = 50 + (A - 50) * pk31(s);
  const D = styleDef31(s, p);
  const S = style31(s, p, r, D);
  const form = clamp(50 + f * 1.6 - Math.max(0, ageOf(s, p) - 45) * 0.4, 1, 99);
  return { pid: p.id, base, A, natural, Aeff, S, D, form, marks, parts };
}

/** Estilo atual: o reforço volta ao padrão da pessoa ~15% por mês sem manutenção. */
export function style31(s: GameState, p: Person, r = rec31(s, p.id), D = styleDef31(s, p)): number {
  if (r?.st === undefined) return D;
  const months = Math.max(0, mAbs(s) - (r.stM ?? mAbs(s)));
  return clamp(D + (r.st - D) * Math.pow(0.85, months), 1, 99);
}

/** Variação da "Imagem e visual" da ficha desde a base: (aparência efetiva − base) × 0,7 + (estilo − padrão) × 0,35. */
export function imgDelta31(s: GameState, p: Person): number {
  const v = view31(s, p);
  return (v.Aeff - v.base) * 0.7 + (v.S - v.D) * 0.35;
}

// ---------------------------------------------------------------- sex appeal (calculado) e peso por gênero/público

export const GENRE_W31: Record<FamilyId, number> = {
  pop: 1.45, latin: 1.35, rnb: 1.25, brazil: 1.2, hiphop: 1.2, electronic: 1.15, asia_me: 1.15, caribbean: 1.1, rock: 1,
  africa: 0.9, country_folk: 0.75, europe: 0.6, blues_jazz: 0.45, sacred: 0.4,
};
/** Gêneros "de raiz": procedimento à mostra custa autenticidade. */
export const ROOTS31: FamilyId[] = ['blues_jazz', 'country_folk', 'sacred', 'africa', 'europe'];
/** Peso da imagem por era (o mesmo da ficha: rádio pouco, MTV e redes muito). */
export function eraW31(y: number): number {
  return y < 1920 ? 0.04 : y < 1950 ? 0.02 : y < 1981 ? 0.06 : y < 2006 ? 0.14 : y < 2013 ? 0.08 : 0.12;
}
const front = (s: GameState, a: Act): Person | undefined => {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  return ms.find((p) => p.role === 'vocal' || p.role === 'mc') ?? ms[0];
};
export const frontOf31 = front;
/** Quanto o público do ato liga para visual: mais casual = mais. */
function audW(a: Act): number {
  const f = a.fans ?? { casual: 0, active: 0, core: 0 };
  const tot = (f.casual ?? 0) + (f.active ?? 0) + (f.core ?? 0);
  return tot > 0 ? 0.85 + 0.3 * ((f.casual ?? 0) / tot) : 1;
}

/** Peso da imagem no apelo além da era: gênero, público e a pressão estética histórica (mais forte sobre mulheres). */
export function weight31(s: GameState, a: Act, female?: boolean): { k: number; why: L } {
  const fam = familyOf(a.genre);
  let k = GENRE_W31[fam] * audW(a);
  let why = fmtL(l('o gênero ({g}) e o público contam', 'genre ({g}) and audience count'), { g: GENRE_W31[fam] >= 1.15 ? l('visual pesa muito', 'looks weigh a lot') : GENRE_W31[fam] <= 0.6 ? l('visual pesa pouco', 'looks weigh little') : l('visual pesa o normal', 'looks weigh as usual') });
  if (female && pressure31(s) === 'normal' && s.year >= 1950 && s.year < 2018) {
    k *= 1.15;
    why = fmtL(l('{w}; e a pressão estética da época é mais dura com as mulheres', '{w}; and the era\'s beauty pressure is harsher on women'), { w: why });
  }
  return { k, why };
}

export interface Appeal31 { v: number; w: number; why: L[] }
/** Sex appeal = aparência + carisma + estilo, com peso por era, gênero e público. Calculado, nunca guardado. */
export function sexAppeal31(s: GameState, pid: string, a?: Act): Appeal31 | null {
  const p = s.persons[pid];
  if (!p) return null;
  const v = view31(s, p);
  const cha = clamp(p.skills.stage * 0.55 + soul(s, p).f.sociabilidade * 0.25 + soul(s, p).f.confianca * 0.15 + 5, 1, 99);
  const val = Math.round(v.Aeff * 0.45 + cha * 0.3 + v.S * 0.25);
  const act = a ?? actsOfPerson17(s, pid)[0];
  const era = eraW31(s.year);
  const gw = act ? weight31(s, act, sexOf31(s, pid) === 'f') : { k: 1, why: l('sem ato', 'no act') };
  const why: L[] = [
    fmtL(l('aparência {a}, carisma {c}, estilo {e}', 'looks {a}, charisma {c}, style {e}'), { a: Math.round(v.Aeff), c: Math.round(cha), e: Math.round(v.S) }),
    gw.why,
  ];
  return { v: val, w: era * gw.k, why };
}
/** sexo pela ficha do avatar (sem importar a persona13 para não criar ciclo) */
function sexOf31(s: GameState, pid: string): 'f' | 'm' | 'x' {
  const p = s.persons[pid];
  return (p?.look?.sx as 'f' | 'm' | undefined) ?? (u(s, pid, 'sex') < (p?.role === 'vocal' ? 0.42 : 0.18) ? 'f' : 'm');
}

/** Imagem média do ato (vocalista pesa mais), 0..100 — a mesma conta da barreira de imagem. */
export function actLook31(s: GameState, a: Act): number {
  const f = front(s, a);
  if (!f) return 50;
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  const sa = (p: Person) => sexAppeal31(s, p.id, a)?.v ?? 50;
  const avg = ms.reduce((t, p) => t + sa(p), 0) / Math.max(1, ms.length);
  return sa(f) * 0.6 + avg * 0.4;
}

/** Fator de um uso fora do apelo (clipe, marca, merch, publicidade, entrevista, valor, capa). */
const USE_W: Record<LookUse31, number> = { video: 1.6, brand: 1.2, merch: 0.8, ads: 1.4, press: 1, value: 0.5, cover: 1 };
const USE_TXT: Record<LookUse31, L> = {
  video: l('clipe e TV', 'video and TV'), brand: l('marcas', 'brands'), merch: l('capa e merch', 'covers and merch'), ads: l('publicidade', 'advertising'),
  press: l('entrevistas', 'interviews'), value: l('valor do elenco', 'roster value'), cover: l('capa', 'cover'),
};
export function actK31(s: GameState, a: Act, use: LookUse31, brandImage?: string): { k: number; why: L } | null {
  if (!lookOn31(s)) return null;
  const lk = actLook31(s, a);
  const fam = familyOf(a.genre);
  let w = eraW31(s.year) * GENRE_W31[fam] * USE_W[use];
  if (brandImage === 'luxury' || brandImage === 'youth') w *= 1.4;
  else if (brandImage === 'family') w *= 0.7;
  const k = clamp(1 + ((lk - 50) / 50) * w * (lk < 50 ? 0.5 : 1), 0.85, 1.2);
  if (Math.abs(k - 1) < 0.005) return null;
  return { k, why: fmtL(k > 1 ? l('Imagem forte ajuda em {u} ({p}%).', 'A strong image helps with {u} ({p}%).') : l('Imagem apagada pesa em {u} ({p}%).', 'A plain image weighs on {u} ({p}%).'), { u: USE_TXT[use], p: `${k > 1 ? '+' : ''}${Math.round((k - 1) * 100)}` }) };
}

// ---------------------------------------------------------------- ligação com os sistemas existentes

LOOKH31.imgDelta = (s, p) => (lookOn31(s) ? imgDelta31(s, p) : 0);
LOOKH31.sig = (s, p) => {
  if (!lookOn31(s)) return '';
  const r = rec31(s, p.id);
  return `${r?.v ?? 0}.${r?.st !== undefined ? mAbs(s) : ''}.${Math.floor(p.stress / 10)}${Math.floor(p.fatigue / 10)}${p.health}.${pressure31(s)}`;
};
LOOKH31.weight = (s, a) => {
  if (!lookOn31(s)) return { k: 1 };
  const f = front(s, a);
  return weight31(s, a, f ? sexOf31(s, f.id) === 'f' : false);
};
LOOKH31.act = (s, a, use, bi) => actK31(s, a, use, bi);
LOOKH31.date = (s) => {
  if (!lookOn31(s)) return 0;
  const me = Object.values(s.persons).find((p) => p.isPlayer && p.alive);
  if (!me) return 0;
  const v = view31(s, me);
  return clamp(((v.Aeff - 50) * 0.5 + (v.S - 50) * 0.5) / 12, -3, 3);
};

// ---------------------------------------------------------------- melhorar: serviços (lugares/ações)

export type Svc31 = 'gym' | 'nutri' | 'style' | 'dentist' | 'derm' | 'surgery' | 'botox' | 'filler' | 'consult';
export interface SvcDef31 {
  id: Svc31; name: L; desc: L; from: number;
  /** preço em dólares reais (pela época) */
  price: (y: number) => number;
  /** chance de dar errado */
  risk: (y: number, n: number) => number;
  riskTxt: L;
  /** precisa de vaidade para aceitar (procedimento): mais difícil de convencer */
  hard?: boolean;
  /** pode ser escondido (segredo) */
  secret?: boolean;
}
export const SVC31: Record<Svc31, SvcDef31> = {
  gym: { id: 'gym', name: l('Academia e personal trainer', 'Gym and personal trainer'), desc: l('Forma sobe devagar; mais fôlego no palco (o boom da aeróbica nos anos 80 rende mais).', 'Fitness rises slowly; more stamina on stage (the 80s aerobics boom pays more).'),
    from: 1950, price: () => 300, risk: () => 0.06, riskTxt: l('lesão por excesso', 'overtraining injury') },
  nutri: { id: 'nutri', name: l('Nutricionista e dieta', 'Nutritionist and diet'), desc: l('Forma e saúde.', 'Fitness and health.'),
    from: 1960, price: () => 250, risk: () => 0.07, riskTxt: l('dieta radical derruba a saúde', 'a crash diet hurts health') },
  style: { id: 'style', name: l('Estilista, figurinista e cabeleireiro', 'Stylist, costume designer and hairdresser'), desc: l('Estilo sobe rápido, mas precisa de manutenção.', 'Style rises fast but needs upkeep.'),
    from: 1889, price: (y) => (y < 1950 ? 150 : y < 1990 ? 400 : 700), risk: () => 0.07, riskTxt: l('o visual vira piada', 'the look becomes a joke') },
  dentist: { id: 'dentist', name: l('Dentista estético', 'Cosmetic dentist'), desc: l('Sorriso: pesa na TV e no vídeo (lentes a partir de 2010).', 'Smile: counts on TV and video (veneers from 2010).'),
    from: 1950, price: (y) => (y >= 2010 ? 6000 : 1500), risk: () => 0, riskTxt: l('sem risco relevante', 'no real risk') },
  derm: { id: 'derm', name: l('Dermatologista e spa', 'Dermatologist and spa'), desc: l('Tira marcas e deixa o envelhecimento mais lento.', 'Clears marks and slows ageing.'),
    from: 1900, price: () => 500, risk: () => 0, riskTxt: l('sem risco relevante', 'no real risk') },
  surgery: { id: 'surgery', name: l('Cirurgia plástica', 'Plastic surgery'), desc: l('Salto grande de aparência; semanas de inchaço.', 'Big jump in looks; weeks of swelling.'),
    from: 1950, price: () => 12000, risk: (y, n) => clamp((y < 1970 ? 0.18 : y < 2000 ? 0.12 : y < 2015 ? 0.08 : 0.05) + n * 0.03, 0.03, 0.4),
    riskTxt: l('dar errado, escândalo, boato e perda de autenticidade nos gêneros de raiz', 'it can go wrong, scandal, rumour and lost authenticity in roots genres'), hard: true, secret: true },
  botox: { id: 'botox', name: l('Botox', 'Botox'), desc: l('Rosto descansado por alguns meses; envelhecimento mais lento.', 'A rested face for a few months; slower ageing.'),
    from: 2002, price: () => 1500, risk: (_y, n) => 0.02 + n * 0.01, riskTxt: l('expressão congelada', 'frozen expression'), hard: true, secret: true },
  filler: { id: 'filler', name: l('Harmonização facial', 'Facial fillers'), desc: l('Ganho visível; risco de exagero e de virar meme.', 'Visible gain; risk of overdoing it and becoming a meme.'),
    from: 2018, price: () => 5000, risk: (_y, n) => 0.07 + n * 0.02, riskTxt: l('exagero que vira meme', 'an overdone look that becomes a meme'), hard: true, secret: true },
  consult: { id: 'consult', name: l('Consultor de imagem e fotógrafo', 'Image consultant and photographer'), desc: l('Estilo e imagem pública.', 'Style and public image.'),
    from: 1950, price: () => 2000, risk: () => 0, riskTxt: l('sem risco relevante', 'no real risk') },
};
export const SVC_IDS31 = Object.keys(SVC31) as Svc31[];
export const svcOpen31 = (s: GameState, id: Svc31): boolean => s.year >= SVC31[id].from;
export const svcCost31 = (s: GameState, id: Svc31): number => money(s, SVC31[id].price(s.year));

/** Quem paga: o bolso da própria pessoa, a empresa (cláusula de imagem) ou você, de presente. */
export type LookPay31 = 'me' | 'co' | 'gift';
export const PAY31: Record<LookPay31, L> = {
  me: l('Do próprio bolso', 'Out of their own pocket'),
  co: l('Pela empresa (cláusula de imagem)', 'Company pays (image clause)'),
  gift: l('De presente (seu dinheiro pessoal)', 'As a gift (your personal money)'),
};
const actOfP = (s: GameState, pid: string): Act | undefined => { const xs = actsOfPerson17(s, pid); const mine = playerActs(s); return xs.find((a) => mine.includes(a.id)) ?? xs[0]; };

/** Pode cuidar desta pessoa? Você mesmo ou alguém do seu elenco (outros: só de presente, se te conhecem). */
export function lookLock31(s: GameState, pid: string, id: Svc31, pay: LookPay31): L | null {
  const p = s.persons[pid];
  if (!lookOn31(s)) return l('Aparência desligada nesta partida.', 'Appearance is off in this game.');
  if (!p?.alive) return l('Pessoa indisponível.', 'Person unavailable.');
  if (!svcOpen31(s, id)) return fmtL(l('Ainda não existe nesta época (a partir de {y}).', 'Does not exist yet in this era (from {y}).'), { y: SVC31[id].from });
  const c = svcCost31(s, id);
  const mineAct = actOfP(s, pid);
  const mine = p.isPlayer || (!!mineAct && playerActs(s).includes(mineAct.id));
  if (p.isPlayer && pay === 'gift') return l('Presente é para os outros.', 'Gifts are for others.');
  if (!mine && pay !== 'gift') return l('Só no seu elenco; para os outros, só de presente.', 'Only for your roster; for others, only as a gift.');
  if (!mine && Math.abs(opinionOf(s, `p:${pid}`)) < 1 && !know(s, pid).mine && know(s, pid).rel < 1) return l('Você não tem intimidade para isso.', 'You are not close enough for that.');
  if (pay === 'me') {
    if (p.isPlayer) { if (ownerOf(s).wealth < c) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.'); }
    else if (!mineAct || (mineAct.cash ?? 0) < c) return l('A pessoa não tem esse dinheiro.', 'They do not have that money.');
  }
  if (pay === 'gift' && ownerOf(s).wealth < c) return l('Patrimônio pessoal insuficiente (sai do seu bolso).', 'Not enough personal wealth (it comes from your pocket).');
  if (pay === 'co' && freeCash20(s) < c) return cashWhy20(s, c, l('Caixa da empresa insuficiente.', 'Not enough company cash.'));
  return null;
}

/** Chance de aceitar (artista): vaidade ajuda; autenticidade (gênero de raiz, valor "arte") e procedimento pesam. */
export function acceptOdds31(s: GameState, pid: string, id: Svc31): { p: number; why: L[] } {
  const p = s.persons[pid];
  if (!p || p.isPlayer) return { p: 1, why: [] };
  const so = soul(s, p);
  const why: L[] = [];
  let x = SVC31[id].hard ? 0.2 : 0.55;
  x += (so.f.vaidade - 50) / 120;
  if (so.f.vaidade <= 40) why.push(l('pouca vaidade', 'little vanity'));
  const a = actOfP(s, pid);
  const roots = a && ROOTS31.includes(familyOf(a.genre));
  if (roots && SVC31[id].hard) { x -= 0.18; why.push(l('gênero de raiz: medo de parecer falso', 'roots genre: fear of looking fake')); }
  x -= (so.v.arte - 50) / 300;
  if (so.v.arte >= 70) why.push(l('quer ser lembrado(a) pela música', 'wants to be remembered for the music'));
  if ((rec31(s, pid)?.ref ?? 0) > 0) { x -= 0.1; why.push(l('já recusou antes', 'refused before')); }
  x += opinionOf(s, `p:${pid}`) / 400;
  return { p: clamp(x, 0.03, 0.97), why };
}

export interface LookRes31 { ok: boolean; refused?: boolean; text: L }

function pay31(s: GameState, pid: string, id: Svc31, pay: LookPay31, c: number): void {
  const p = s.persons[pid];
  const memo = `${SVC31[id].name.pt}: ${p.name}`;
  if (p.isPlayer) {
    if (pay === 'me') purse(s, -c, 'health', `look31:${id}`, { ben: 'me', memo: SVC31[id].name });
    else drawFor(s, `look31:${id}`, c, 'health', 'misc', memo, SVC31[id].name);
    return;
  }
  if (pay === 'me') { const a = actOfP(s, pid); if (a) a.cash = (a.cash ?? 0) - c; return; }
  if (pay === 'gift') { purse(s, -c, 'gift', `look31:${id}`, { ben: `p:${pid}`, memo: SVC31[id].name }); return; }
  withTxn({ payer: 'label', owner: 'label', beneficiary: `p:${pid}` }, () => post(s, `look31:${id}:${pid}`, -c, 'artist_dev', memo));
}

const addMark = (r: LookRec31, k: MarkKind31, until: number, v: number) => { (r.mk ??= []).push([k, until, v]); if (r.mk.length > 8) r.mk.splice(0, r.mk.length - 8); };

/** Faz o cuidado. `insist`: passa por cima da recusa (pesa na opinião). `secret`: procedimento escondido do público. */
export function doLook31(s: GameState, pid: string, id: Svc31, pay: LookPay31, o: { insist?: boolean; secret?: boolean } = {}): LookRes31 {
  const lock = lookLock31(s, pid, id, pay);
  if (lock) return { ok: false, text: lock };
  const p = s.persons[pid];
  const d = SVC31[id];
  const st = look31(s);
  const rr = Rng.fromSeed(`${s.config.seed}|look31|${pid}|${s.week}|${id}|${st.n}`);
  st.n++;
  if (!p.isPlayer && pay !== 'me') {
    const odds = acceptOdds31(s, pid, id);
    if (!rr.chance(odds.p)) {
      if (!o.insist) {
        const r = recW(s, pid);
        r.ref = (r.ref ?? 0) + 1;
        const w: L = odds.why.length ? { pt: odds.why.map((x) => x.pt).join(', '), en: odds.why.map((x) => x.en).join(', ') } : l('não quer', 'does not want to');
        return { ok: false, refused: true, text: fmtL(l('{n} recusa ({w}). Dá para insistir — pesa na relação.', '{n} refuses ({w}). You can insist — it weighs on the relationship.'), { n: p.name, w }) };
      }
      const hit = d.hard ? 14 : 6;
      opine(s, `p:${pid}`, -hit, fmtL(l('Foi pressionado(a) a mudar a aparência: {s}', 'Was pressured to change their looks: {s}'), { s: d.name }));
      const a = actOfP(s, pid);
      if (a) a.trust = clamp(a.trust - (d.hard ? 6 : 2), 0, 100);
      p.morale = clamp(p.morale - (d.hard ? 10 : 4), 0, 100);
      p.stress = clamp(p.stress + (d.hard ? 8 : 3), 0, 100);
    }
  }
  const c = svcCost31(s, id);
  pay31(s, pid, id, pay, c);
  const r = recW(s, pid);
  (r.h ??= []).push([s.week, id]);
  if (r.h.length > 6) r.h.shift();
  if (pay === 'gift') opine(s, `p:${pid}`, 4, fmtL(l('Ganhou de presente: {s}', 'Got as a gift: {s}'), { s: d.name }));
  const bad = rr.chance(d.risk(s.year, r.n ?? 0));
  const y = s.year;
  let text: L;
  switch (id) {
    case 'gym': {
      const k = y >= 1978 && y < 1992 ? 1.25 : 1;
      r.f = clamp((r.f ?? 0) + 4 * k, -30, 20);
      p.fatigue = clamp(p.fatigue - 6, 0, 100);
      if (bad) { addMark(r, 'injury', s.week + 6, -4); p.fatigue = clamp(p.fatigue + 15, 0, 100); text = fmtL(l('{n} treinou demais e se machucou: seis semanas de cuidado.', '{n} overtrained and got hurt: six weeks of care.'), { n: p.name }); }
      else text = fmtL(l('{n} entra em forma: mais fôlego no palco.', '{n} gets in shape: more stamina on stage.'), { n: p.name });
      break;
    }
    case 'nutri': {
      r.f = clamp((r.f ?? 0) + 3, -30, 20);
      r.wt = (r.wt ?? 0) > 0 ? Math.max(0, (r.wt ?? 0) - 4) : r.wt;
      if (bad) { p.health = p.health === 'ok' ? 'ill' : p.health; p.morale = clamp(p.morale - 6, 0, 100); text = fmtL(l('A dieta radical de {n} derrubou a saúde.', '{n}\'s crash diet hurt their health.'), { n: p.name }); }
      else text = fmtL(l('{n} come melhor: forma e saúde em dia.', '{n} eats better: fitness and health on track.'), { n: p.name });
      break;
    }
    case 'style': {
      r.st = clamp(style31(s, p, r) + 18, 1, 99); r.stM = mAbs(s);
      if (bad) { addMark(r, 'meme', s.week + 10, -3); text = fmtL(l('O visual novo de {n} virou piada nas revistas.', '{n}\'s new look became a joke in the magazines.'), { n: p.name }); }
      else text = fmtL(l('{n} estreia um visual novo: estilo em alta (precisa de manutenção).', '{n} debuts a new look: style up (needs upkeep).'), { n: p.name });
      break;
    }
    case 'dentist': r.sm = Math.min(8, (r.sm ?? 0) + (y >= 2010 ? 5 : 2)); text = fmtL(l('{n} de sorriso novo: rende na TV e no vídeo.', '{n} has a new smile: pays off on TV and video.'), { n: p.name }); break;
    case 'derm': r.ag = Math.min(120, (r.ag ?? 0) + 3); if (r.mk) r.mk = r.mk.filter((m) => m[2] > 0 || m[0] === 'tattoo' || m[0] === 'shaved'); text = fmtL(l('{n} cuida da pele: marcas somem e o tempo pesa menos.', '{n} takes care of their skin: marks fade and time weighs less.'), { n: p.name }); break;
    case 'consult': {
      r.st = clamp(style31(s, p, r) + 10, 1, 99); r.stM = mAbs(s);
      const a = actOfP(s, pid);
      if (a && !p.isPlayer) { a.image ??= { artistic: 40, popularity: Math.round(a.fame), professionalism: 50, publicImage: 50 }; a.image.publicImage = clamp(a.image.publicImage + 3, 0, 100); }
      text = fmtL(l('{n} acerta a imagem com um consultor e um bom fotógrafo.', '{n} sharpens their image with a consultant and a good photographer.'), { n: p.name });
      break;
    }
    default: { // surgery / botox / filler
      const gain = id === 'surgery' ? 10 : id === 'botox' ? 3 : 5;
      r.n = (r.n ?? 0) + 1;
      if (id === 'botox') r.ag = Math.min(120, (r.ag ?? 0) + 6);
      addMark(r, 'swell', s.week + (id === 'surgery' ? 6 : 2), id === 'surgery' ? -6 : -2);
      const hidden = !!o.secret && !!d.secret;
      const by = p.isPlayer ? 'me' : pay === 'co' ? 'label' : pay === 'gift' ? 'me' : 'self';
      if (bad) {
        r.sg = (r.sg ?? 0) - (id === 'surgery' ? 8 : 4);
        if (id === 'filler') addMark(r, 'meme', s.week + 16, -4);
        p.morale = clamp(p.morale - 12, 0, 100); p.stress = clamp(p.stress + 12, 0, 100);
        text = fmtL(l('{s} de {n} deu errado.', '{n}\'s {s} went wrong.'), { n: p.name, s: d.name });
        const a = actOfP(s, pid);
        if (a && playerActs(s).includes(a.id)) emitEvent(s, rr, 'look_botched', { act: a.id, person: pid, proc: id, by });
      } else {
        r.sg = Math.min(25, (r.sg ?? 0) + gain);
        text = fmtL(l('{n} passa por {s}: semanas de inchaço, depois a mudança aparece.', '{n} undergoes {s}: weeks of swelling, then the change shows.'), { n: p.name, s: d.name });
      }
      if (hidden) (r.sec ??= []).push([s.week, gain, 0, id, by]);
      else exposeRoots31(s, pid, id);
      break;
    }
  }
  return { ok: true, text };
}

/** Procedimento à mostra num gênero de raiz: perde um pouco de reputação artística. */
function exposeRoots31(s: GameState, pid: string, proc: string): void {
  const a = actOfP(s, pid);
  if (!a || !ROOTS31.includes(familyOf(a.genre))) return;
  a.image ??= { artistic: 40, popularity: Math.round(a.fame), professionalism: 50, publicImage: 50 };
  a.image.artistic = clamp(a.image.artistic - 3, 0, 100);
  void proc;
}

// ---------------------------------------------------------------- o mês: piora, segredos, voz, acontecimentos

const EVENT_IDS31 = ['look_nomakeup', 'look_fitness', 'look_rumor', 'look_botched', 'look_cover', 'look_critic', 'look_haircut', 'look_wine', 'look_vocal', 'look_pressure', 'look_tattoo', 'look_bags'] as const;
export const LOOK_EVENTS31 = EVENT_IDS31;

/** Pessoas acompanhadas mês a mês: você e o seu elenco (o resto do mundo é calculado na hora). */
function tracked(s: GameState): Person[] {
  const out: Person[] = [];
  const me = Object.values(s.persons).find((p) => p.isPlayer && p.alive);
  if (me) out.push(me);
  for (const id of playerActs(s)) for (const m of s.acts[id]?.members ?? []) { const p = s.persons[m]; if (p?.alive && !p.isPlayer) out.push(p); }
  return out;
}

/** Virada do mês (motor): forma, peso, marcas, voz e segredos. Sorte pura por chave (não desloca outros sistemas). */
export function monthLook31(s: GameState): void {
  if (!lookOn31(s)) return;
  const st = look31(s);
  const R = Rng.fromSeed(`${s.config.seed}|look31|m|${s.year}|${s.month}`);
  for (const p of tracked(s)) {
    const r0 = st.p[p.id];
    const a = actOfP(s, p.id);
    const touring = !!a && s.tours.some((t) => t.actId === a.id && t.status === 'running');
    let r = r0;
    const W = () => (r ??= recW(s, p.id), r);
    // forma: rotina do jogador; sem treino, volta devagar ao natural
    if (p.isPlayer) {
      const rt = goods(s).routine;
      const g = rt === 'gym' ? 0.6 : rt === 'sport' ? 0.4 : rt === 'walks' || rt === 'yoga' ? 0.2 : 0;
      if (g) { W().f = clamp((r!.f ?? 0) + g, -30, 20); }
      if (rt === 'spa') { W().ag = Math.min(120, (r!.ag ?? 0) + 1); }
    }
    if (r?.f && !(p.isPlayer && goods(s).routine !== 'none')) { r.f = Math.abs(r.f) < 0.3 ? 0 : r.f * 0.96; r.v++; }
    // peso: pausa longa ou tristeza somam; volta devagar
    const sad = p.morale < 30 || (!!a && a.status === 'hiatus');
    if (sad) W().wt = Math.min(14, (r!.wt ?? 0) + 0.6);
    else if (r?.wt) { r.wt = Math.abs(r.wt) < 0.3 ? 0 : r.wt * 0.94; r.v++; }
    // turnê sem descanso: olheiras
    if (touring && p.fatigue > 70 && !(r?.mk ?? []).some((m) => m[0] === 'bags' && m[1] >= s.week)) addMark(W(), 'bags', s.week + 5, -2);
    // voz: cigarro e gritaria (só quem canta)
    if (p.role === 'vocal' || p.role === 'mc') {
      const fam = a ? familyOf(a.genre) : 'pop';
      const yell = (fam === 'rock' || fam === 'hiphop') && p.fatigue > 60;
      const wear = (smoker31(s, p) ? 0.06 : 0) + (yell ? 0.08 : 0);
      if (wear) {
        W().vz = (r!.vz ?? 0) + wear;
        if (r!.vz! >= 1) { r!.vz! -= 1; p.skills.voice = Math.max(5, p.skills.voice - 1); }
      }
    }
    // marcas vencidas saem
    if (r?.mk?.some((m) => m[1] < s.week)) { r.mk = r.mk.filter((m) => m[1] >= s.week); r.v++; }
    // segredos: boato e descoberta pela imprensa
    for (const x of r?.sec ?? []) {
      if (x[2] === 2) continue;
      const fame = a?.fame ?? 10;
      if (x[2] === 0 && R.chance(0.03 + fame / 1500)) {
        x[2] = 1; r!.v++;
        emitFact(s, { kind: 'look_rumor', actors: [p.id, ...(a ? [a.id] : [])], severity: 20, visibility: 'rumor', tags: ['look', 'rumor'], src: 'look31',
          text: fmtL(l('Corre o boato de que {n} fez um procedimento estético.', 'Rumour has it {n} had cosmetic work done.'), { n: p.name }) });
        if (a && playerActs(s).includes(a.id) && !s.decisions.some((d) => d.eventId === 'look_rumor')) emitEvent(s, R, 'look_rumor', { act: a.id, person: p.id });
      } else if (x[2] === 1 && R.chance(0.05 + fame / 1200)) {
        exposeSecret31(s, p.id, x);
      }
    }
  }
  // acontecimentos do mês (no máximo um; a mesa de decisões não lota)
  if (s.decisions.length >= 4 || !R.chance(0.22)) return;
  const cands: [string, Ctx][] = [];
  for (const id of EVENT_IDS31) {
    if ((st.cd[id] ?? -1) > s.week) continue;
    const c = FIND31[id]?.(s, R);
    if (c) cands.push([id, c]);
  }
  if (!cands.length) return;
  const [id, ctx] = R.pick(cands);
  st.cd[id] = s.week + 52;
  emitEvent(s, R, id, ctx);
}

/** A imprensa descobre o procedimento: vira fato público (o conhecimento passa a mostrar o segredo). */
export function exposeSecret31(s: GameState, pid: string, x: Secret31): void {
  const p = s.persons[pid];
  if (!p) return;
  x[2] = 2;
  const r = recW(s, pid);
  void r;
  const a = actOfP(s, pid);
  emitFact(s, { kind: 'secret_exposed', actors: [pid, ...(a ? [a.id] : [])], severity: 35, visibility: 'public', tags: ['look', 'secret'], src: 'look31',
    text: fmtL(l('A imprensa confirma: {n} fez {s} às escondidas.', 'The press confirms: {n} secretly had {s}.'), { n: p.name, s: SVC31[x[3] as Svc31]?.name ?? l('um procedimento', 'a procedure') }),
    data: { look: 1 }, ...((a ? playerActs(s).includes(a.id) : p.isPlayer) ? { diary: true as const, notify: 'bad' as const } : {}) });
  exposeRoots31(s, pid, x[3]);
  if (x[4] === 'label' && a && playerActs(s).includes(a.id)) opine(s, `p:${pid}`, -6, l('O selo deixou vazar o procedimento', 'The label let the procedure leak'));
}

/** O que o observador sabe da aparência: a percebida sempre (é pública); procedimentos escondidos só por segredo. */
export function seenLook31(s: GameState, pid: string, obs = 'player'): { A: number; known: boolean; secrets: Secret31[] } | null {
  const p = s.persons[pid];
  if (!p) return null;
  const v = view31(s, p);
  const sec = rec31(s, pid)?.sec ?? [];
  const sv = see(s, pid, 'lookSecret', obs);
  const mineKnown = (x: Secret31) => x[2] === 2 || ((x[4] === 'label' || x[4] === 'me') && obs === 'player') || sv === 'exact';
  return { A: Math.round(v.A), known: sv !== 'hidden', secrets: sec.filter(mineKnown) };
}

registerSimHook('month', 'look31', (s) => monthLook31(s));

// ---------------------------------------------------------------- acontecimentos com escolha (12)

const mineMembers = (s: GameState): { a: Act; p: Person }[] => {
  const out: { a: Act; p: Person }[] = [];
  for (const id of playerActs(s)) { const a = s.acts[id]; if (!a) continue; for (const m of a.members) { const p = s.persons[m]; if (p?.alive) out.push({ a, p }); } }
  return out;
};
const P_ = (s: GameState, c: Ctx) => s.persons[String(c.person)];
const A_ = (s: GameState, c: Ctx) => s.acts[String(c.act)];
const hype = (a: Act | undefined, d: number) => { if (a) a.momentum = clamp(a.momentum + d, 0, 100); };
const mood = (p: Person | undefined, morale: number, stress = 0, fatigue = 0) => {
  if (!p) return;
  p.morale = clamp(p.morale + morale, 0, 100); p.stress = clamp(p.stress + stress, 0, 100); p.fatigue = clamp(p.fatigue + fatigue, 0, 100);
};
const img = (a: Act | undefined, k: 'artistic' | 'popularity' | 'publicImage', d: number) => {
  if (!a) return;
  a.image ??= { artistic: 40, popularity: Math.round(a.fame), professionalism: 50, publicImage: 50 };
  a.image[k] = clamp(a.image[k] + d, 0, 100);
};
const mark = (s: GameState, pid: string, k: MarkKind31, weeks: number, v: number) => addMark(recW(s, pid), k, s.week + weeks, v);
const styleUp = (s: GameState, pid: string, d: number) => { const p = s.persons[pid]; if (!p) return; const r = recW(s, pid); r.st = clamp(style31(s, p, r) + d, 1, 99); r.stM = mAbs(s); };
const fact = (s: GameState, c: Ctx, t: L, sev = 20) => emitFact(s, { kind: 'look', actors: [String(c.person), String(c.act)], severity: sev, visibility: 'public', tags: ['look'], src: 'look31', text: t, diary: true });
const vis = (s: GameState): boolean => pressure31(s) !== 'off';

const FIND31: Record<string, (s: GameState, r: Rng) => Ctx | null> = {
  look_nomakeup: (s, r) => { if (s.year < 1950) return null; const xs = mineMembers(s).filter((x) => x.a.fame >= 20); if (!xs.length) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_fitness: (s) => { const x = mineMembers(s).find((m) => (rec31(s, m.p.id)?.f ?? 0) >= 8); return x ? { act: x.a.id, person: x.p.id } : null; },
  look_rumor: (s, r) => { if (!vis(s)) return null; const xs = mineMembers(s).filter((m) => m.a.fame >= 30); if (!xs.length || !r.chance(0.5)) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_botched: () => null, // só depois de um procedimento que deu errado
  look_cover: (s, r) => { if (s.year < 1953) return null; const xs = mineMembers(s).filter((m) => m.a.fame >= 25 && ageOf(s, m.p) >= 21 && view31(s, m.p).A >= 55); if (!xs.length) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_critic: (s, r) => { if (!vis(s)) return null; const xs = mineMembers(s).filter((m) => m.a.fame >= 15); if (!xs.length) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_haircut: (s, r) => { if (s.year < 1955) return null; const xs = mineMembers(s); if (!xs.length) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_wine: (s) => { const x = mineMembers(s).find((m) => ageOf(s, m.p) >= 50 && agesWell31(s, m.p.id) && !rec31(s, m.p.id)?.icon); return x ? { act: x.a.id, person: x.p.id } : null; },
  look_vocal: (s) => { const x = mineMembers(s).find((m) => (m.p.role === 'vocal' || m.p.role === 'mc') && (m.p.health === 'voice_strain' || (rec31(s, m.p.id)?.vz ?? 0) >= 0.6)); return x ? { act: x.a.id, person: x.p.id } : null; },
  look_pressure: (s, r) => { if (!vis(s) || s.year < 1955) return null; const xs = mineMembers(s).filter((m) => view31(s, m.p).A < 45 && m.a.fame >= 10); if (!xs.length) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_tattoo: (s, r) => { if (s.year < 1960) return null; const xs = mineMembers(s).filter((m) => soul(s, m.p).f.rebeldia >= 55); if (!xs.length) return null; const x = r.pick(xs); return { act: x.a.id, person: x.p.id }; },
  look_bags: (s) => { const x = mineMembers(s).find((m) => (rec31(s, m.p.id)?.mk ?? []).some((k) => k[0] === 'bags' && k[1] >= s.week)); return x ? { act: x.a.id, person: x.p.id } : null; },
};

const E = (id: string, cat: EventDef['cat'], tone: EventDef['tone'], title: L, text: L, options: EventDef['options']): EventDef =>
  ({ id, cat, tone, tags: ['look'], cooldown: 12, forcedOnly: true, title, text, options });
const tattooGood = (y: number, fam: FamilyId) => y >= 1995 || fam === 'rock' || fam === 'hiphop';

export const EVENTS31: EventDef[] = [
  E('look_nomakeup', 'culture', 'neutral', l('Foto sem maquiagem: {person}', 'Make-up free photo: {person}'),
    l('Uma foto de {person} ({act}) sem produção nenhuma corre as redações. Negar, assumir ou transformar em campanha?', 'A no-frills photo of {person} ({act}) is making the rounds. Deny it, own it or turn it into a campaign?'), [
      { id: 'campaign', label: l('Virar campanha de autoestima', 'Turn it into a self-esteem campaign'), hint: l('Imagem pública sobe; estresse da exposição.', 'Public image rises; exposure stress.'), apply: (s, _r, c) => { img(A_(s, c), 'publicImage', 4); hype(A_(s, c), 3); mood(P_(s, c), 6, 4); fact(s, c, fmtL(l('{p} transforma a foto sem maquiagem numa campanha de autoestima.', '{p} turns the make-up free photo into a self-esteem campaign.'), { p: P_(s, c).name })); } },
      { id: 'own', label: l('Assumir com bom humor', 'Own it with good humour'), apply: (s, _r, c) => { img(A_(s, c), 'publicImage', 2); mood(P_(s, c), 3); } },
      { id: 'deny', label: l('Negar (foto adulterada)', 'Deny it (doctored photo)'), hint: l('Pode pegar mal se descobrirem.', 'May backfire if found out.'), apply: (s, r, c) => { mood(P_(s, c), -4, 6); if (r.chance(0.4)) img(A_(s, c), 'publicImage', -4); } },
    ]),
  E('look_fitness', 'culture', 'good', l('Transformação: {person}', 'Transformation: {person}'),
    l('A nova forma de {person} ({act}) chamou a atenção. A mídia quer mostrar o antes e depois.', '{person}\'s ({act}) new shape caught attention. The media wants a before-and-after.'), [
      { id: 'embrace', label: l('Aproveitar a atenção', 'Ride the attention'), hint: l('Apelo sobe; a mídia fica em cima.', 'Appeal rises; the media stays on them.'), apply: (s, _r, c) => { hype(A_(s, c), 5); styleUp(s, String(c.person), 6); mood(P_(s, c), 4, 8); fact(s, c, fmtL(l('A transformação de {p} vira capa.', '{p}\'s transformation makes the cover.'), { p: P_(s, c).name })); } },
      { id: 'quiet', label: l('Falar só de música', 'Talk only about music'), apply: (s, _r, c) => { img(A_(s, c), 'artistic', 2); mood(P_(s, c), 2, -2); } },
    ]),
  E('look_rumor', 'scandal', 'bad', l('Boato de plástica: {person}', 'Plastic surgery rumour: {person}'),
    l('Revistas especulam que {person} ({act}) fez procedimentos estéticos. Confirmar, negar ou processar?', 'Magazines speculate that {person} ({act}) had cosmetic work. Confirm, deny or sue?'), [
      { id: 'confirm', label: l('Confirmar com naturalidade', 'Confirm matter-of-factly'), hint: l('Encerra o boato; gêneros de raiz cobram autenticidade.', 'Ends the rumour; roots genres demand authenticity.'), apply: (s, _r, c) => { const r = rec31(s, String(c.person)); for (const x of r?.sec ?? []) if (x[2] < 2) exposeSecret31(s, String(c.person), x); img(A_(s, c), 'publicImage', 1); mood(P_(s, c), 2, -6); } },
      { id: 'sue', label: l('Processar a revista', 'Sue the magazine'), hint: l('Custo; se for verdade, piora.', 'Cost; worse if it is true.'), apply: (s, r, c) => { post(s, `look31:sue:${c.person}`, -money(s, 4000), 'legal', 'Processo contra revista'); const sec = (rec31(s, String(c.person))?.sec ?? []).find((x) => x[2] < 2); if (sec && r.chance(0.5)) { exposeSecret31(s, String(c.person), sec); img(A_(s, c), 'publicImage', -5); } else img(A_(s, c), 'publicImage', 3); mood(P_(s, c), -2, 6); } },
      { id: 'deny', label: l('Negar', 'Deny'), apply: (s, r, c) => { mood(P_(s, c), -2, 5); const sec = (rec31(s, String(c.person))?.sec ?? []).find((x) => x[2] < 2); if (sec && r.chance(0.3)) { exposeSecret31(s, String(c.person), sec); img(A_(s, c), 'publicImage', -4); } } },
    ]),
  E('look_botched', 'health', 'bad', l('Procedimento deu errado: {person}', 'Procedure went wrong: {person}'),
    l('O procedimento de {person} ({act}) não saiu como planejado. A imprensa já está na porta da clínica.', '{person}\'s ({act}) procedure did not go as planned. The press is already at the clinic door.'), [
      { id: 'hiatus', label: l('Pausa para recuperar (2 meses)', 'Break to recover (2 months)'), hint: l('Saúde e humor voltam; perde embalo.', 'Health and mood recover; loses momentum.'), apply: (s, _r, c) => { const a = A_(s, c); a.hiatusUntil = s.week + 8; a.status = 'hiatus'; mood(P_(s, c), 6, -10, -20); hype(a, -6); } },
      { id: 'sue', label: l('Processar o cirurgião', 'Sue the surgeon'), hint: l('Custo agora; pode virar indenização.', 'Cost now; may become damages.'), apply: (s, r, c) => { post(s, `look31:surgeon:${c.person}`, -money(s, 5000), 'legal', 'Processo contra cirurgião'); if (r.chance(0.55)) post(s, `look31:damages:${c.person}`, money(s, 15000), 'other', 'Indenização do cirurgião'); fact(s, c, fmtL(l('{p} processa o cirurgião.', '{p} sues the surgeon.'), { p: P_(s, c).name }), 30); } },
      { id: 'face', label: l('Encarar a imprensa', 'Face the press'), hint: l('Estresse alto; a lealdade cai se o selo pagou.', 'High stress; loyalty drops if the label paid.'), apply: (s, _r, c) => { mood(P_(s, c), -6, 12); if (c.by === 'label') { opine(s, `p:${c.person}`, -10, l('O selo bancou o procedimento que deu errado', 'The label paid for the procedure that went wrong')); A_(s, c).trust = clamp(A_(s, c).trust - 6, 0, 100); } } },
    ]),
  E('look_cover', 'career', 'neutral', l('Ensaio de capa: {person}', 'Cover shoot: {person}'),
    l('Uma revista convida {person} ({act}) para um ensaio sensual de capa. O público quer; a crítica pode torcer o nariz conforme o gênero.', 'A magazine invites {person} ({act}) to a sensual cover shoot. The public wants it; critics may frown depending on the genre.'), [
      { id: 'yes', label: l('Aceitar (se a pessoa quiser)', 'Accept (if they want to)'), hint: l('Apelo sobe; reputação artística pode cair; pode recusar.', 'Appeal rises; artistic reputation may fall; they may refuse.'), apply: (s, r, c) => { const p = P_(s, c), a = A_(s, c); const ok = r.chance(clamp(0.3 + soul(s, p).f.vaidade / 120 - soul(s, p).v.arte / 400, 0.05, 0.95)); if (!ok) { opine(s, `p:${p.id}`, -3, l('Insistiram num ensaio que não queria', 'Was pushed toward a shoot they did not want')); mood(p, -3, 4); return; } hype(a, 6); styleUp(s, p.id, 8); img(a, 'popularity', 3); if (ROOTS31.includes(familyOf(a.genre))) img(a, 'artistic', -4); post(s, `look31:cover:${p.id}`, money(s, 3000), 'other', 'Cachê de capa'); fact(s, c, fmtL(l('{p} estrela um ensaio de capa.', '{p} stars in a cover shoot.'), { p: p.name })); } },
      { id: 'no', label: l('Recusar', 'Decline'), apply: (s, _r, c) => { img(A_(s, c), 'artistic', 1); } },
    ]),
  E('look_critic', 'scandal', 'bad', l('Crítico comenta o corpo de {person}', 'A critic comments on {person}\'s body'),
    l('Um crítico trocou a resenha de {act} por comentários sobre o corpo de {person}. A reação começou.', 'A critic swapped the {act} review for comments on {person}\'s body. The backlash has begun.'), [
      { id: 'defend', label: l('Defender publicamente', 'Defend them publicly'), hint: l('Escândalo vira contra o crítico; lealdade sobe.', 'The scandal turns on the critic; loyalty rises.'), apply: (s, _r, c) => { opine(s, `p:${c.person}`, 6, l('O selo me defendeu em público', 'The label defended me publicly')); mood(P_(s, c), 2, 4); img(A_(s, c), 'publicImage', 2); fact(s, c, fmtL(l('Comentário sobre o corpo de {p} vira escândalo para o crítico.', 'Comment on {p}\'s body becomes a scandal for the critic.'), { p: P_(s, c).name }), 25); } },
      { id: 'ignore', label: l('Deixar passar', 'Let it go'), hint: l('Autoestima do artista cai.', 'The artist\'s self-esteem drops.'), apply: (s, _r, c) => { mood(P_(s, c), -8, 6); } },
    ]),
  E('look_haircut', 'culture', 'neutral', l('Corte radical: {person}', 'Radical haircut: {person}'),
    l('{person} ({act}) apareceu com um corte radical. Pode virar tendência — ou piada.', '{person} ({act}) showed up with a radical cut. It may become a trend — or a joke.'), [
      { id: 'back', label: l('Bancar o visual', 'Back the look'), apply: (s, r, c) => { const pid = String(c.person); if (r.chance(0.55)) { mark(s, pid, 'trend', 16, 4); hype(A_(s, c), 4); fact(s, c, fmtL(l('O corte de {p} vira tendência.', '{p}\'s haircut becomes a trend.'), { p: P_(s, c).name })); } else { mark(s, pid, 'meme', 10, -3); mood(P_(s, c), -4, 4); } mark(s, pid, 'shaved', 20, 0); } },
      { id: 'grow', label: l('Deixar crescer e esquecer', 'Grow it out and move on'), apply: (s, _r, c) => { mark(s, String(c.person), 'shaved', 12, 0); } },
    ]),
  E('look_wine', 'career', 'good', l('Envelheceu como vinho: {person}', 'Aged like wine: {person}'),
    l('Fãs mais velhos (e novos) redescobrem {person} ({act}): o grisalho virou charme.', 'Older (and new) fans rediscover {person} ({act}): the grey hair became charm.'), [
      { id: 'icon', label: l('Abraçar o grisalho', 'Embrace the grey'), hint: l('Vira ícone; apelo com o público mais velho.', 'Becomes an icon; appeal with older audiences.'), apply: (s, _r, c) => { const r = recW(s, String(c.person)); r.icon = 1; styleUp(s, String(c.person), 10); hype(A_(s, c), 4); img(A_(s, c), 'publicImage', 3); mood(P_(s, c), 6); fact(s, c, fmtL(l('{p} vira ícone de estilo depois dos 50.', '{p} becomes a style icon past 50.'), { p: P_(s, c).name })); } },
      { id: 'younger', label: l('Rejuvenescer o visual', 'Go for a younger look'), apply: (s, _r, c) => { styleUp(s, String(c.person), 4); } },
    ]),
  E('look_vocal', 'health', 'bad', l('Cordas vocais: {person}', 'Vocal cords: {person}'),
    l('Cigarro, gritos e estrada cobraram a voz de {person} ({act}). O médico sugere cirurgia nas cordas vocais.', 'Smoking, screaming and the road took a toll on {person}\'s ({act}) voice. The doctor suggests vocal cord surgery.'), [
      { id: 'surgery', label: l('Operar', 'Operate'), hint: l('A voz pode voltar melhor — ou pior.', 'The voice may come back better — or worse.'), apply: (s, r, c) => { const p = P_(s, c), a = A_(s, c); post(s, `look31:vocal:${p.id}`, -money(s, 9000), 'artist_dev', 'Cirurgia nas cordas vocais'); a.hiatusUntil = s.week + 10; a.status = 'hiatus'; p.skills.voice = clamp(p.skills.voice + (r.chance(0.65) ? 4 : -6), 5, 100); const rr = recW(s, p.id); rr.vz = 0; if (p.health === 'voice_strain') p.health = 'recovering'; } },
      { id: 'rest', label: l('Repouso vocal e parar de fumar', 'Vocal rest and quit smoking'), apply: (s, _r, c) => { const p = P_(s, c); mood(p, -2, -4, -15); const rr = recW(s, p.id); rr.vz = Math.max(0, (rr.vz ?? 0) - 0.5); } },
    ]),
  E('look_pressure', 'people', 'bad', l('Pressão estética sobre {person}', 'Beauty pressure on {person}'),
    l('Programadores e diretores de TV cobram "um visual mais vendável" de {person} ({act}). Na época, era assim que o mercado tratava artistas — mais ainda as mulheres.', 'Programmers and TV directors want "a more sellable look" from {person} ({act}). In this era that is how the market treated artists — women even more.'), [
      { id: 'defend', label: l('Defender o artista como é', 'Back the artist as they are'), hint: l('Lealdade sobe; algum espaço na TV se perde.', 'Loyalty rises; some TV space is lost.'), apply: (s, _r, c) => { opine(s, `p:${c.person}`, 8, l('O selo me defendeu da pressão estética', 'The label stood up for me against beauty pressure')); A_(s, c).trust = clamp(A_(s, c).trust + 4, 0, 100); hype(A_(s, c), -2); } },
      { id: 'push', label: l('Pressionar por mudança', 'Push for a change'), hint: l('Lealdade, humor e estresse pioram.', 'Loyalty, mood and stress get worse.'), apply: (s, _r, c) => { opine(s, `p:${c.person}`, -10, l('O selo me pressionou a mudar a aparência', 'The label pressured me to change my looks')); A_(s, c).trust = clamp(A_(s, c).trust - 5, 0, 100); mood(P_(s, c), -8, 10); styleUp(s, String(c.person), 8); } },
    ]),
  E('look_tattoo', 'culture', 'neutral', l('Tatuagem nova: {person}', 'New tattoo: {person}'),
    l('{person} ({act}) apareceu com uma tatuagem enorme e um visual que divide opiniões.', '{person} ({act}) showed up with a huge tattoo and a look that divides opinion.'), [
      { id: 'back', label: l('Apoiar', 'Back it'), hint: l('Bom ou ruim conforme a época e o gênero.', 'Good or bad depending on era and genre.'), apply: (s, _r, c) => { const a = A_(s, c); const good = tattooGood(s.year, familyOf(a.genre)); mark(s, String(c.person), 'tattoo', 520, good ? 2 : -2); img(a, 'publicImage', good ? 2 : -3); opine(s, `p:${c.person}`, 3, l('O selo respeitou meu visual', 'The label respected my look')); } },
      { id: 'cover', label: l('Pedir para cobrir nas fotos', 'Ask to cover it in photos'), apply: (s, _r, c) => { opine(s, `p:${c.person}`, -4, l('Pediram para esconder minha tatuagem', 'They asked me to hide my tattoo')); mood(P_(s, c), -3); } },
    ]),
  E('look_bags', 'health', 'bad', l('Olheiras de estrada: {person}', 'Road-worn: {person}'),
    l('Turnê sem descanso: {person} ({act}) aparece abatido(a) nas fotos e o fôlego no palco caiu.', 'Touring with no rest: {person} ({act}) looks worn out in photos and stage stamina dropped.'), [
      { id: 'rest', label: l('Folga de duas semanas', 'Two weeks off'), hint: l('Fôlego e saúde voltam.', 'Stamina and health return.'), apply: (s, _r, c) => { mood(P_(s, c), 4, -10, -25); const r = recW(s, String(c.person)); r.mk = (r.mk ?? []).filter((m) => m[0] !== 'bags'); } },
      { id: 'makeup', label: l('Maquiagem e seguir', 'Make-up and keep going'), hint: l('Estresse e cansaço sobem.', 'Stress and fatigue rise.'), apply: (s, _r, c) => { mood(P_(s, c), -3, 6, 8); } },
    ]),
];
deferEvents(EVENTS31); // fila até events.ts terminar de carregar (ciclo de imports)

// ---------------------------------------------------------------- avatar: a mudança aparece no sprite (puro)

export interface AvatarTweak31 { body?: number; hair?: number; outfitShift?: number; glow?: boolean }
/** Como a aparência muda o boneco: forma/peso no corpo, cabelo raspado, estilo reforçado na roupa. */
export function avatarTweak31(s: GameState, pid: string): AvatarTweak31 | null {
  if (!lookOn31(s)) return null;
  const p = s.persons[pid];
  const r = rec31(s, pid);
  if (!p || !r) return null;
  const out: AvatarTweak31 = {};
  const wt = r.wt ?? 0, f = r.f ?? 0;
  if (wt >= 6) out.body = 2;
  else if (f >= 8 && wt <= 0) out.body = 0;
  if ((r.mk ?? []).some((m) => m[0] === 'shaved' && m[1] >= s.week)) out.hair = 0;
  if (r.st !== undefined && style31(s, p, r) >= Math.min(95, styleDef31(s, p) + 6)) out.outfitShift = 1 + ((r.h?.length ?? 1) % 3);
  if ((r.sg ?? 0) + (r.sm ?? 0) >= 8) out.glow = true;
  return Object.keys(out).length ? out : null;
}

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({ id: 'look.pressure', area: 'world', label: l('Pressão estética', 'Beauty pressure'), kind: 'select',
  options: () => (['normal', 'soft', 'off'] as Pressure31[]).map((v) => ({ value: v, label: PRESSURE31[v] })),
  get: (s) => pressure31(s), set: (s, v) => { if (v !== 'normal' && v !== 'soft' && v !== 'off') return l('Valor inválido.', 'Invalid value.'); setPressure31(s, v); } });
registerEditable({ id: 'look.form', area: 'people', target: 'person', label: l('Forma física (−30 a +20)', 'Fitness (−30 to +20)'), kind: 'number', min: -30, max: 20, raw: true,
  get: (s, id) => Math.round(rec31(s, id ?? '')?.f ?? 0), set: (s, v, id) => { if (!id || !s.persons[id]) return l('Pessoa não encontrada.', 'Person not found.'); recW(s, id).f = clamp(Number(v), -30, 20); } });
registerEditable({ id: 'look.style', area: 'people', target: 'person', label: l('Estilo (0 a 100)', 'Style (0 to 100)'), kind: 'number', min: 0, max: 100, raw: true,
  get: (s, id) => { const p = s.persons[id ?? '']; return p ? Math.round(style31(s, p)) : 0; },
  set: (s, v, id) => { if (!id || !s.persons[id]) return l('Pessoa não encontrada.', 'Person not found.'); const r = recW(s, id); r.st = clamp(Number(v), 1, 99); r.stM = mAbs(s); } });
registerRunnable({ id: 'look.event', area: 'people', target: 'person', label: l('Disparar um acontecimento de aparência', 'Trigger an appearance event'),
  arg: { kind: 'select', label: l('Acontecimento', 'Event'), options: () => EVENTS31.map((e) => ({ value: e.id, label: e.title })) },
  run: (s, id, arg) => {
    const p = s.persons[id ?? ''];
    const a = p ? actOfP(s, p.id) : undefined;
    if (!p || !a) return l('Escolha alguém de um ato.', 'Pick someone in an act.');
    emitEvent(s, Rng.fromSeed(`${s.config.seed}|look31|ed|${s.week}`), String(arg ?? 'look_haircut'), { act: a.id, person: p.id, by: 'label', proc: 'surgery' });
    return l('Acontecimento criado na mesa de decisões.', 'Event added to the decision desk.');
  } });

/** Opção "Pressão estética" (Opções e editor): grava no interruptor da partida. */
export function setPressure31(s: GameState, v: Pressure31): void { setSw(s, 'look31.pressure', v); }
