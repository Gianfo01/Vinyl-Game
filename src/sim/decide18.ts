// Rodada 18 (decide18) — CONSEQUÊNCIAS: "agora" × "depois". Qualquer escolha (cartão de decisão, resposta na
// Caixa, ação sobre pessoa) pode ter efeito imediato, ECOS atrasados (semanas/meses depois, com chance e condição
// no momento do disparo: promessa cumprida ou não, investimento que rende, mentira que vem à tona) ou os dois.
// Registro puro (sem DOM); o estado, o gancho mensal e o conteúdo ficam em sys/decide18.ts e sys/echoes18.ts.
//
//   registerConseq18('ev:payola_offer:pay', { later: [{ in: [6, 18], p: 0.35, tone: 'bad',
//     hint: l('Alguém pode falar.', 'Someone may talk.'), fx: (f) => { f.follow('payola_exposed'); return l('…', '…'); } }] });
//   chaves: 'ev:<evento>:<opção>' (cartões), 'ib:<tipo k18>:<resposta>' (Caixa), 'pa:<ação>:ok|fail' (pessoa)
// Também: odds visíveis (aposta), portões (traço/habilidade/relação/desbloqueio) e prazos curtos (ctx.dl18).

import type { Rng } from '../core/rng';
import { clamp } from '../core/rng';
import { formatMoney } from '../core/money';
import { l, type L } from '../data/world';
import type { Act, GameState, Person } from './types';
import { fmtL, money, playerActs, post } from './util';

export type Ctx18 = Record<string, string | number>;
export type Tone18 = 'good' | 'bad' | 'mixed';

/** Aplicador de efeitos de um eco (cada efeito vira uma linha legível). */
export class Fx18 {
  lines: L[] = [];
  private n = 0;
  constructor(public s: GameState, public c: Ctx18, public r: Rng, public tag = 'echo18') {}
  get act(): Act | undefined {
    const a = this.c.act ? this.s.acts[String(this.c.act)] : undefined;
    if (a) return a;
    const p = this.person;
    return p ? Object.values(this.s.acts).find((x) => x.members.includes(p.id)) : undefined;
  }
  get person(): Person | undefined { return this.c.person ? this.s.persons[String(this.c.person)] : undefined; }
  get mine(): Act[] { return playerActs(this.s).map((id) => this.s.acts[id]).filter(Boolean); }
  private ppl(): Person[] {
    const p = this.person;
    if (p && p.alive) return [p];
    const a = this.act;
    return a ? a.members.map((id) => this.s.persons[id]).filter((x) => x && x.alive) : [];
  }
  /** dinheiro em dólar real da época (convertido); positivo entra, negativo sai */
  cash(real: number, memo: string, cat = real >= 0 ? 'other_income' : 'misc'): this {
    if (!real) return this;
    const c = money(this.s, real);
    post(this.s, `${this.tag}:${memo}:${this.c.e18 ?? ''}:${++this.n}`, c, cat, memo);
    const v = l(formatMoney(Math.abs(c), 'pt-BR'), formatMoney(Math.abs(c), 'en-US'));
    this.lines.push(fmtL(real >= 0 ? l('+{v} em caixa', '+{v} cash') : l('−{v} do caixa', '−{v} cash'), { v }));
    return this;
  }
  mood(k: 'morale' | 'stress' | 'inspiration' | 'fatigue' | 'resentment', v: number): this {
    const ps = this.ppl();
    if (!ps.length || !v) return this;
    for (const p of ps) p[k] = clamp(p[k] + v, 0, 100);
    const name: Record<string, L> = { morale: l('Moral', 'Morale'), stress: l('Estresse', 'Stress'), inspiration: l('Inspiração', 'Inspiration'), fatigue: l('Cansaço', 'Fatigue'), resentment: l('Mágoa', 'Resentment') };
    this.lines.push(fmtL(l('{k} {v}', '{k} {v}'), { k: name[k], v: v > 0 ? `+${v}` : v }));
    return this;
  }
  trust(v: number): this {
    const a = this.act;
    if (!a || !v) return this;
    a.trust = clamp(a.trust + v, 0, 100);
    this.lines.push(fmtL(l('Confiança de {a} {v}', '{a} trust {v}'), { a: a.name, v: v > 0 ? `+${v}` : v }));
    return this;
  }
  fame(v: number): this {
    const a = this.act;
    if (!a || !v) return this;
    a.fame = clamp(a.fame + v, 0, 100);
    this.lines.push(fmtL(l('Fama de {a} {v}', '{a} fame {v}'), { a: a.name, v: v > 0 ? `+${v}` : v }));
    return this;
  }
  momentum(v: number): this {
    const a = this.act;
    if (!a || !v) return this;
    a.momentum = clamp(a.momentum + v, -100, 100);
    this.lines.push(fmtL(l('Embalo {v}', 'Momentum {v}'), { v: v > 0 ? `+${v}` : v }));
    return this;
  }
  /** fãs em % (aplicado aos três círculos) */
  fans(pct: number): this {
    const a = this.act;
    if (!a || !pct) return this;
    const f = 1 + pct / 100;
    a.fans.casual = Math.max(0, Math.round(a.fans.casual * f));
    a.fans.active = Math.max(0, Math.round(a.fans.active * f));
    a.fans.core = Math.max(0, Math.round(a.fans.core * (1 + pct / 200)));
    this.lines.push(fmtL(l('Fãs {v}%', 'Fans {v}%'), { v: pct > 0 ? `+${pct}` : pct }));
    return this;
  }
  rep(k: keyof GameState['player']['reputation'], v: number): this {
    if (!v) return this;
    const R = this.s.player.reputation;
    R[k] = clamp(R[k] + v, 0, 100);
    const name: Record<string, L> = { artistic: l('Reputação artística', 'Artistic reputation'), commercial: l('Reputação comercial', 'Commercial reputation'), artists: l('Reputação entre artistas', 'Reputation with artists'), institutional: l('Reputação institucional', 'Institutional reputation') };
    this.lines.push(fmtL(l('{k} {v}', '{k} {v}'), { k: name[k], v: v > 0 ? `+${v}` : v }));
    return this;
  }
  note(t: L): this { this.lines.push(t); return this; }
}

export interface EchoSpec18 {
  /** janela em meses [mín, máx] */
  in: [number, number];
  /** chance de voltar (0..1) — pode depender do estado no momento da escolha */
  p: number | ((s: GameState, c: Ctx18) => number);
  tone: Tone18;
  /** o que pode voltar, SEM spoiler ("pode voltar a te morder") */
  hint: L;
  /** condição no disparo (promessa cumprida? ainda está no elenco?) — falsa → miss */
  when?: (s: GameState, c: Ctx18) => boolean;
  /** desfecho; devolve a manchete */
  fx: (f: Fx18) => L;
  /** desfecho alternativo quando a condição falha (opcional; sem ele, o eco some em silêncio) */
  miss?: (f: Fx18) => L | void;
}
export interface Conseq18 {
  /** prévia do efeito imediato (senão, a dica da própria opção) */
  now?: L;
  later?: EchoSpec18[];
  /** aposta com chance visível */
  odds?: (s: GameState, c: Ctx18) => { p: number; why: L[] };
  /** portão: devolve o motivo do bloqueio (traço, habilidade, relação, desbloqueio) ou null */
  gate?: (s: GameState, c: Ctx18) => L | null;
  /** destrava uma marca ao escolher (abre opções em decisões futuras) */
  unlock?: string;
}
const REG: Record<string, Conseq18> = {};
export function registerConseq18(key: string, c: Conseq18): void { REG[key] = c; }
export const conseq18 = (key: string): Conseq18 | undefined => REG[key];
export const conseqKeys18 = (): string[] => Object.keys(REG);
export const evKey18 = (eventId: string, opt: string): string => `ev:${eventId}:${opt}`;

/** Chance de um eco (já resolvida para o estado atual). */
export function echoP18(s: GameState, e: EchoSpec18, c: Ctx18): number {
  try { return clamp(typeof e.p === 'number' ? e.p : e.p(s, c), 0, 1); } catch { return 0; }
}
/** Incerteza em palavras (sem número: o futuro é nebuloso). */
export function fuzzy18(p: number): L {
  return p >= 0.75 ? l('quase certo', 'almost certain') : p >= 0.5 ? l('provável', 'likely') : p >= 0.3 ? l('pode acontecer', 'may happen') : l('improvável, mas possível', 'unlikely, but possible');
}
export const TONE18_TXT: Record<Tone18, L> = {
  good: l('pode render frutos', 'may pay off'), bad: l('pode voltar a te morder', 'may come back to bite you'), mixed: l('pode ir para qualquer lado', 'could go either way'),
};

/** Estado mínimo do desbloqueio (lido pelos portões; o estado completo está em sys/decide18). */
export function unlocked18(s: GameState, flag: string): boolean {
  const x = (s.x4 as unknown as { dec18?: { unl?: Record<string, number> } }).dec18;
  return !!x?.unl?.[flag];
}
