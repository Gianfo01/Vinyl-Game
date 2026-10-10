// Rodada 17 — LIVRO DE OBRIGAÇÕES (estilo CK3): segredos, favores, dívidas, promessas, mágoas e lealdade entre
// quaisquer dois atores (pessoa, ato, selo, 'player', chave persona13). Cada `Hold` tem força (1..100), prova,
// validade e usos. Verbos: chamar o favor, chantagear com o segredo, expor, perdoar. Todo uso publica um Fact.
//
// Os dois tipos antigos de segredo (sys/intrigue.ts e sys/people/state.ts) e as dívidas pessoais entram por
// ADAPTADORES (registerHoldSource em sys/bridge17.ts): continuam guardados onde sempre estiveram e aparecem
// aqui como holds virtuais (id 'x:<fonte>:<id>'). Módulo sem sistemas: importável de qualquer lugar.
//
//   grantHold(s, { holder: 'player', target: actId, kind: 'favor', strength: 40, months: 24, text: l('…','…') });
//   holdsOf(s, id) → { has, owes } · leverage(s, holder, target) · useHold(s, id, 'call' | 'blackmail' | 'expose' | 'forgive')

import { Rng, clamp } from '../core/rng';
import { l, type L } from '../data/world';
import { registerExt4 } from './ext4';
import { emitFact, type Fact } from './facts17';
import type { GameState } from './types';
import { fmtL } from './util';

export type HoldKind = 'secret' | 'favor' | 'debt' | 'promise' | 'grievance' | 'blackmail' | 'loyalty';
export type HoldVerb = 'call' | 'blackmail' | 'expose' | 'forgive';
export interface Hold {
  id: string;
  holder: string;
  target: string;
  kind: HoldKind;
  /** 1..100: ≥60 é forte (reutilizável), <60 fraco (uso único) */
  strength: number;
  /** 0 boato · 1 indício · 2 prova (segredos) */
  proof?: 0 | 1 | 2;
  text: L;
  /** semana de criação / validade (semana) */
  w: number;
  until?: number;
  uses: number;
  lastUse?: number;
  status: 'open' | 'used' | 'void' | 'forgiven';
  factId?: string;
  /** fonte (sistema) e referência externa (adaptadores) */
  src?: string;
  ref?: string;
  data?: Record<string, number | string>;
}
export interface Holds17State { h: Hold[]; seq: number; /** chaves já convertidas (promessas etc.) */ cv: Record<string, 1> }
declare module './ext4' { interface Ext4 { holds17: Holds17State } }
const fresh = (): Holds17State => ({ h: [], seq: 0, cv: {} });
registerExt4('holds17', fresh);
export function holds17(s: GameState): Holds17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.holds17 ??= fresh()) as Holds17State;
  st.h ??= []; st.seq ??= 0; st.cv ??= {};
  return st;
}

export const HOLD_NAME: Record<HoldKind, L> = {
  secret: l('Segredo', 'Secret'), favor: l('Favor', 'Favor'), debt: l('Dívida', 'Debt'), promise: l('Promessa', 'Promise'),
  grievance: l('Mágoa', 'Grievance'), blackmail: l('Chantagem', 'Blackmail'), loyalty: l('Lealdade', 'Loyalty'),
};
export const VERB_NAME: Record<HoldVerb, L> = {
  call: l('Cobrar o favor', 'Call in the favor'), blackmail: l('Chantagear', 'Blackmail'), expose: l('Expor', 'Expose'), forgive: l('Perdoar', 'Forgive'),
};
/** O que cada tipo vale numa negociação (positivo = a favor de quem tem). */
const LEV: Record<HoldKind, number> = { secret: 1, blackmail: 1.2, favor: 0.7, debt: 0.6, promise: 0.4, loyalty: 0.5, grievance: -0.8 };

// ---------------------------------------------------------------- adaptadores (fontes externas)

export interface HoldSource {
  /** holds virtuais derivados do estado de outro sistema (não persistidos aqui) */
  list: (s: GameState) => Hold[];
  /** executa um verbo no sistema de origem; devolve texto do resultado (ou null = use o padrão) */
  use?: (s: GameState, h: Hold, verb: HoldVerb) => L | null;
}
const SOURCES: Record<string, HoldSource> = {};
export function registerHoldSource(id: string, src: HoldSource): void { SOURCES[id] = src; }

// ---------------------------------------------------------------- consulta

const live = (s: GameState, h: Hold): boolean => h.status === 'open' && (h.until === undefined || h.until >= s.week);

/** Todos os holds vigentes (próprios + adaptadores). */
export function allHolds(s: GameState): Hold[] {
  const own = holds17(s).h.filter((h) => live(s, h));
  for (const [id, src] of Object.entries(SOURCES)) {
    try { for (const h of src.list(s)) own.push({ ...h, src: id }); } catch { /* fonte quebrada não derruba o livro */ }
  }
  return own;
}
const norm = (k: string): string => (k.startsWith('p:') ? k.slice(2) : k);
/** O que alguém tem sobre os outros (has) e o que os outros têm sobre ele (owes). */
export function holdsOf(s: GameState, id: string): { has: Hold[]; owes: Hold[] } {
  const k = norm(id);
  const all = allHolds(s);
  return { has: all.filter((h) => h.holder === k), owes: all.filter((h) => h.target === k) };
}
export function holdsBetween(s: GameState, holder: string, target: string): Hold[] {
  const a = norm(holder), b = norm(target);
  return allHolds(s).filter((h) => h.holder === a && h.target === b);
}

/** Pode usar agora? Fracos: uma vez. Fortes: a cada 2 anos. Mágoas não se "usam" (só se perdoam). */
export function canUse(s: GameState, h: Hold, verb: HoldVerb): L | null {
  if (!live(s, h)) return l('Esta obrigação já não vale.', 'This obligation no longer stands.');
  if (verb === 'forgive') return h.kind === 'grievance' || h.kind === 'debt' || h.kind === 'favor' ? null : l('Só mágoas, dívidas e favores se perdoam.', 'Only grievances, debts and favors can be forgiven.');
  if (h.kind === 'grievance') return l('Mágoa não se cobra: ou se repara, ou se perdoa.', 'A grievance cannot be called in: mend it or forgive it.');
  if ((verb === 'blackmail' || verb === 'expose') && h.kind !== 'secret' && h.kind !== 'blackmail') return l('Só segredos servem para chantagem ou exposição.', 'Only secrets work for blackmail or exposure.');
  if (verb === 'call' && (h.kind === 'secret' || h.kind === 'blackmail')) return l('Segredo se usa como chantagem, não como favor.', 'A secret is used as blackmail, not as a favor.');
  if (h.uses > 0 && h.strength < 60) return l('Obrigação fraca: já foi usada.', 'Weak obligation: already used.');
  if (h.lastUse !== undefined && s.week - h.lastUse < 104) return l('Usada há pouco: espere 2 anos.', 'Used recently: wait 2 years.');
  return null;
}

/** Peso líquido de quem tem sobre o alvo (−1..+1), com o motivo mais forte. Usado em negociações. */
export function leverage(s: GameState, holder: string, target: string): { v: number; why?: L } {
  const a = norm(holder), b = norm(target);
  let v = 0, best = 0, why: L | undefined;
  for (const h of allHolds(s)) {
    let x = 0;
    if (h.holder === a && h.target === b) x = LEV[h.kind] * h.strength / 100; // o que eu tenho sobre ele (mágoa minha pesa contra)
    else if (h.holder === b && h.target === a) x = h.kind === 'grievance' ? -0.8 * h.strength / 100 : h.kind === 'favor' || h.kind === 'debt' ? -0.4 * h.strength / 100 : 0; // o que ele tem sobre mim
    v += x;
    if (Math.abs(x) > best) { best = Math.abs(x); why = h.text; }
  }
  return { v: clamp(v, -1, 1), why };
}

// ---------------------------------------------------------------- escrita

export interface HoldIn { holder: string; target: string; kind: HoldKind; strength: number; text: L; months?: number; proof?: 0 | 1 | 2; factId?: string; src?: string; ref?: string; data?: Hold['data']; quiet?: boolean }
/** Cria (ou reforça, se já existe igual entre os dois) uma obrigação. */
export function grantHold(s: GameState, x: HoldIn): Hold {
  const st = holds17(s);
  const holder = norm(x.holder), target = norm(x.target);
  const prev = st.h.find((h) => live(s, h) && h.holder === holder && h.target === target && h.kind === x.kind && (h.ref ?? '') === (x.ref ?? ''));
  if (prev) {
    prev.strength = clamp(Math.max(prev.strength, x.strength) + 5, 1, 100);
    if (x.months) prev.until = Math.max(prev.until ?? 0, s.week + Math.round(x.months * 4.35));
    return prev;
  }
  const h: Hold = {
    id: `h${++st.seq}`, holder, target, kind: x.kind, strength: clamp(Math.round(x.strength), 1, 100), text: x.text, w: s.week,
    until: x.months ? s.week + Math.round(x.months * 4.35) : undefined, uses: 0, status: 'open',
    ...(x.proof !== undefined ? { proof: x.proof } : {}), ...(x.factId ? { factId: x.factId } : {}), ...(x.src ? { src: x.src } : {}), ...(x.ref ? { ref: x.ref } : {}), ...(x.data ? { data: x.data } : {}),
  };
  st.h.push(h);
  if (st.h.length > 300) st.h = st.h.filter((y) => live(s, y) || s.week - (y.lastUse ?? y.w) < 52).slice(-300);
  if (!x.quiet) emitFact(s, { kind: x.kind === 'favor' ? 'favor' : 'hold', actors: [holder, target], severity: Math.min(60, h.strength / 2), visibility: 'secret', tags: ['hold', x.kind], text: x.text, src: 'holds17', data: { hold: h.id } });
  return h;
}

/** Ganchos de efeito padrão para holds nativos (o sistema que criou o hold pode registrar um efeito próprio). */
type UseFx = (s: GameState, h: Hold, verb: HoldVerb, r: Rng) => L | null;
const EFFECTS: Record<string, UseFx> = {};
/** Efeito de uso para holds com `src` = id (ex.: 'crime17' cobra silêncio de testemunha). */
export function registerHoldEffect(src: string, fn: UseFx): void { EFFECTS[src] = fn; }
/** Efeito genérico quando nenhum sistema registra um: opinião/relação, confiança do ato, rivalidade, caixa. */
let defaultFx: UseFx | null = null;
export function setDefaultHoldEffect(fn: UseFx): void { defaultFx = fn; }

/** Usa uma obrigação. Devolve texto do resultado (ou o motivo do bloqueio). */
export function useHold(s: GameState, id: string, verb: HoldVerb): { ok: boolean; text: L; fact?: Fact } {
  const h = allHolds(s).find((x) => x.id === id);
  if (!h) return { ok: false, text: l('Obrigação não encontrada.', 'Obligation not found.') };
  const why = canUse(s, h, verb);
  if (why) return { ok: false, text: why };
  const r = Rng.fromSeed(`${s.config.seed}:holds17:${h.id}:${verb}:${s.week}`);
  let text: L | null = null;
  const ext = h.src ? SOURCES[h.src] : undefined;
  if (ext?.use) text = ext.use(s, h, verb);
  else text = (h.src ? EFFECTS[h.src]?.(s, h, verb, r) : null) ?? defaultFx?.(s, h, verb, r) ?? null;
  // marca o uso (holds próprios)
  const own = holds17(s).h.find((x) => x.id === h.id);
  if (own) {
    own.uses++;
    own.lastUse = s.week;
    if (verb === 'forgive') own.status = 'forgiven';
    else if (verb === 'expose' || own.strength < 60) own.status = 'used';
  }
  const t = text ?? fmtL(l('{v}: {x}', '{v}: {x}'), { v: VERB_NAME[verb], x: h.text });
  const fact = emitFact(s, {
    kind: verb === 'forgive' ? 'forgiven' : verb === 'expose' ? 'secret_exposed' : 'hold_used', actors: [h.holder, h.target],
    severity: verb === 'expose' ? 40 + h.strength / 2 : verb === 'blackmail' ? 35 : 15, visibility: verb === 'expose' ? 'public' : 'secret',
    tags: ['hold', h.kind, verb], text: t, src: 'holds17', cause: h.factId ? [h.factId] : undefined, data: { hold: h.id },
  });
  return { ok: true, text: t, fact };
}

/** Anula obrigações (ex.: pessoa morreu, contrato acabou). */
export function voidHolds(s: GameState, pred: (h: Hold) => boolean): number {
  let n = 0;
  for (const h of holds17(s).h) if (h.status === 'open' && pred(h)) { h.status = 'void'; n++; }
  return n;
}
