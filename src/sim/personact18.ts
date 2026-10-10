// Rodada 18 (item 11) — menu de AÇÕES sobre qualquer pessoa (artista, integrante, empresário, produtor, chefe de
// selo, jornalista, crítico, equipe, família…). Registro único e puro: cada ação diz o custo (dinheiro, bolinhas
// de tempo pessoal), se está disponível (e por quê não), a chance com o porquê e o que acontece. A interface
// (src/ui/sys/personact18.ts) mostra o mesmo menu em toda página/popup de pessoa.
//
//   registerPersonAction({ id: 'call', label: l('Telefonar', 'Call'), group: 'social',
//     cost: () => ({}), available: (s, k) => true, chance: (s, k) => ({ p: 0.8, why: [l('…', '…')] }),
//     run: (s, k, r, ok) => ({ ok, text: l('…', '…') }) });
//   personActions18(s, 'l:abc')            // linhas do menu (com bloqueio, chance e custo)
//   doPersonAction18(s, 'call', 'l:abc')   // paga, sorteia (Rng próprio, semeado) e executa

import { Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { registerExt4 } from './ext4';
import { explain18, registerExplain } from './explain18';
import type { GameState } from './types';
import { fmtL, money, post } from './util';
import { spendEnergy, energyLeft } from './sys/life';

export type PAGroup = 'social' | 'career' | 'press' | 'care' | 'love' | 'dark';
export const PA_GROUP: Record<PAGroup, L> = {
  social: l('Relação', 'Relationship'), career: l('Carreira e negócios', 'Career and business'), press: l('Público e imprensa', 'Public and press'),
  care: l('Cuidado', 'Care'), love: l('Romance', 'Romance'), dark: l('Jogo sujo', 'Dirty play'),
};
export interface PACost { /** dólares reais (convertidos pela época) */ usd?: number; /** valor já em centavos da época (tem precedência) */ cents?: number; /** bolinhas de tempo pessoal */ balls?: number; /** só mostra o custo (a própria ação cobra) */ shown?: boolean }
export interface PAChance { p: number; why: L[] }
export interface PAOut { ok: boolean; text: L; /** a interface deve abrir algo (ex.: 'offer' abre a proposta de contrato) */ ui?: string; uiArg?: string }
export interface PersonAction18 {
  id: string;
  label: L;
  group: PAGroup;
  icon?: string;
  desc?: L;
  /** semanas até poder repetir com a mesma pessoa */
  cooldown?: number;
  cost?: (s: GameState, key: string) => PACost;
  /** some do menu quando falso (ex.: visitar no hospital só se doente) */
  visible?: (s: GameState, key: string) => boolean;
  /** null = pode; L = por que não */
  available?: (s: GameState, key: string) => L | null;
  /** chance de dar certo (sem chance = sempre) */
  chance?: (s: GameState, key: string) => PAChance | null;
  /** a própria ação sorteia (ex.: crime17, media17, bonds9): a chance só é mostrada */
  selfRoll?: boolean;
  /** efeito; `ok` já sorteado pela chance */
  run: (s: GameState, key: string, r: Rng, ok: boolean) => PAOut;
}
const REG: PersonAction18[] = [];
export function registerPersonAction(a: PersonAction18): void {
  const i = REG.findIndex((x) => x.id === a.id);
  if (i >= 0) REG[i] = a; else REG.push(a);
}
export const personActionDefs18 = (): readonly PersonAction18[] => REG;

// ---------------------------------------------------------------- estado

export interface PA18State { cd: Record<string, number>; log: { w: number; y: number; id: string; key: string; ok: boolean; t: L }[]; n: number }
declare module './ext4' { interface Ext4 { pa18: PA18State } }
const fresh = (): PA18State => ({ cd: {}, log: [], n: 0 });
registerExt4('pa18', fresh);
export function pa18(s: GameState): PA18State {
  const x = s.x4 as unknown as { pa18?: PA18State };
  const st = (x.pa18 ??= fresh());
  st.cd ??= {}; st.log ??= [];
  return st;
}
export const paLog18 = (s: GameState, key?: string) => pa18(s).log.filter((x) => !key || x.key === key);

// ---------------------------------------------------------------- leitura

export interface PARow { def: PersonAction18; block: L | null; chance: PAChance | null; cost: PACost }
export const costMoney18 = (s: GameState, c: PACost): number => (c.cents ?? (c.usd ? money(s, c.usd) : 0));

export function paBlock18(s: GameState, def: PersonAction18, key: string): L | null {
  const cd = pa18(s).cd[`${def.id}|${key}`];
  if (cd !== undefined && cd > s.week) return fmtL(l('Espere mais {n} semana(s) para repetir com esta pessoa.', 'Wait {n} more week(s) before repeating with this person.'), { n: cd - s.week });
  const c = def.cost?.(s, key) ?? {};
  if (c.usd && s.player.cash < costMoney18(s, c)) return l('Caixa insuficiente.', 'Not enough cash.');
  if (c.balls && energyLeft(s) < c.balls) return l('Sem tempo livre este mês.', 'No free time left this month.');
  return def.available?.(s, key) ?? null;
}

/** Linhas do menu para uma pessoa (só as visíveis), na ordem de registro. */
export function personActions18(s: GameState, key: string): PARow[] {
  const out: PARow[] = [];
  for (const def of REG) {
    try {
      if (def.visible && !def.visible(s, key)) continue;
      const block = paBlock18(s, def, key);
      out.push({ def, block, chance: def.chance ? def.chance(s, key) : null, cost: def.cost?.(s, key) ?? {} });
    } catch { /* ação com erro some do menu */ }
  }
  return out;
}

/** Executa: confere, paga, sorteia com Rng próprio e registra. */
export function doPersonAction18(s: GameState, id: string, key: string, r?: Rng): PAOut {
  const def = REG.find((x) => x.id === id);
  if (!def || (def.visible && !def.visible(s, key))) return { ok: false, text: l('Ação indisponível.', 'Action unavailable.') };
  const block = paBlock18(s, def, key);
  if (block) return { ok: false, text: block };
  const c = def.cost?.(s, key) ?? {};
  if (c.balls) { const e = spendEnergy(s, c.balls); if (e) return { ok: false, text: e }; }
  const amt = c.shown ? 0 : costMoney18(s, c);
  const st = pa18(s);
  st.n++;
  if (amt) post(s, `pa18:${id}:${key}:${s.week}:${st.n}`, -amt, def.group === 'dark' ? 'legal' : 'marketing', `Ação: ${def.label.pt}`);
  const rr = r ?? Rng.fromSeed(`pa18|${s.config.seed}|${id}|${key}|${s.week}|${st.n}`);
  const ch = def.chance?.(s, key);
  const ok = ch && !def.selfRoll ? rr.chance(Math.max(0, Math.min(1, ch.p))) : true;
  const out = def.run(s, key, rr, ok);
  if (def.cooldown) st.cd[`${id}|${key}`] = s.week + def.cooldown;
  st.log.unshift({ w: s.week, y: s.year, id, key, ok: out.ok, t: out.text });
  if (st.log.length > 60) st.log.length = 60;
  const ks = Object.keys(st.cd);
  if (ks.length > 600) for (const k of ks) if (st.cd[k] <= s.week) delete st.cd[k];
  return out;
}

// a chance de cada ação também é explicável (tooltip encadeado)
registerExplain('pa.chance', (s, c) => {
  const def = REG.find((x) => x.id === c.id);
  const key = String(c.key ?? '');
  if (!def?.chance) return null;
  const ch = def.chance(s, key);
  if (!ch) return null;
  return { title: def.label, value: Math.round(ch.p * 100), fmt: 'pct', parts: ch.why.map((w) => ({ label: w })), note: def.desc };
});
export const _pa18 = { explain18 };
