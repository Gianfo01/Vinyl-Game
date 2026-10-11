// Rodada 19 (onda 4, equilíbrio da carreira de artista) — DIVISÃO DA BANDA. Na carreira de artista o caixa é o fundo da
// banda; até aqui todo o lucro de shows, discos e edição ficava nele, e uma banda de quatro enriquecia como um selo.
// Agora, no fechamento do mês, o lucro operacional (DRE do ledger18) é dividido em partes iguais: cada integrante (fora o
// dono) leva uma parte e o fundo fica com uma. Prejuízos acumulam e são abatidos antes de qualquer divisão.
// Lê: ledger18 (lucro do mês), artist18 (a banda), life (quem é o dono). Escreve: caixa (salários: parte dos integrantes),
// moral e ressentimento dos integrantes (lineup16 lê o ressentimento para saídas e brigas) e o "por quê" (bandpay19).
// Mês sem divisão por 3+ meses seguidos (tocando de graça) azeda a banda.

import { clamp } from '../../core/rng';
import { l } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { fin18, mIdx18, opProfit18 } from '../ledger18';
import type { GameState } from '../types';
import { fmtL, post } from '../util';
import { band18 } from './artist18';
import { playerPerson } from './life';

export interface BandPay19 { carry: number; dry: number; paid: number; last?: { y: number; m: number; profit: number; cut: number; n: number } }
declare module '../ext4' { interface Ext4 { bandpay19: BandPay19 } }
const fresh = (): BandPay19 => ({ carry: 0, dry: 0, paid: 0 });
registerExt4('bandpay19', fresh);
export function bandpay19(s: GameState): BandPay19 {
  const x = s.x4 as unknown as { bandpay19?: BandPay19 };
  return (x.bandpay19 ??= fresh());
}

/** Integrantes que dividem (vivos, fora o dono). */
export function bandMates19(s: GameState): string[] {
  const a = band18(s);
  if (!a) return [];
  const me = playerPerson(s)?.id;
  return a.members.filter((id) => id !== me && s.persons[id]?.alive);
}
/** Fração do lucro que fica no fundo da banda (o caixa): uma parte entre k+1. */
export const fundShare19 = (k: number): number => 1 / (k + 1);

export function bandMonth19(s: GameState): void {
  if (s.config.role !== 'artist') return;
  const a = band18(s);
  if (!a || a.status === 'split' || a.status === 'retired') return;
  const mates = bandMates19(s);
  const st = bandpay19(s);
  if (!mates.length) { st.carry = 0; st.dry = 0; return; }
  const profit = opProfit18(fin18(s).m[mIdx18(s)]);
  const net = profit + st.carry;
  if (net <= 0) {
    st.carry = Math.min(0, net);
    st.dry++;
    st.last = { y: s.year, m: s.month, profit, cut: 0, n: mates.length };
    if (st.dry >= 3) for (const id of mates) { const p = s.persons[id]; p.resentment = clamp(p.resentment + 2, 0, 100); p.morale = clamp(p.morale - 2, 0, 100); }
    return;
  }
  st.carry = 0; st.dry = 0;
  const cut = Math.round(net * (1 - fundShare19(mates.length)));
  st.paid += cut;
  st.last = { y: s.year, m: s.month, profit, cut, n: mates.length };
  post(s, `bandpay19:${s.year}:${s.month}`, -cut, 'salaries', `Divisão da banda (${mates.length} integrante${mates.length > 1 ? 's' : ''})`);
  for (const id of mates) { const p = s.persons[id]; p.morale = clamp(p.morale + 1, 0, 100); p.resentment = clamp(p.resentment - 1, 0, 100); }
}
registerSimHook('month', 'bandpay19', (s) => bandMonth19(s));

registerExplain('bandpay19', (s) => {
  if (s.config.role !== 'artist') return null;
  const st = bandpay19(s);
  const k = bandMates19(s).length;
  if (!k) return null;
  const last = st.last;
  return {
    title: l('Divisão da banda', 'Band split'), value: Math.round(fundShare19(k) * 100), fmt: 'num',
    parts: [
      { label: fmtL(l('{k} integrante(s) além de você: cada um leva uma parte igual do lucro do mês', '{k} member(s) besides you: each takes an equal share of the month\'s profit'), { k }), value: `${Math.round((1 - fundShare19(k)) * 100)}%` },
      { label: l('O fundo da banda (seu caixa) fica com uma parte', 'The band fund (your cash) keeps one share'), value: `${Math.round(fundShare19(k) * 100)}%` },
      ...(st.carry < 0 ? [{ label: l('Prejuízo a recuperar antes de dividir', 'Losses to recover before any split'), value: Math.round(st.carry / 100), tone: 'bad' as const }] : []),
      ...(last ? [{ label: fmtL(l('Último mês ({m}/{y})', 'Last month ({m}/{y})'), { m: last.m + 1, y: last.y }), value: Math.round(-last.cut / 100) }] : []),
      ...(st.dry >= 3 ? [{ label: l('Meses seguidos sem divisão: a banda se sente tocando de graça (ressentimento sobe)', 'Months in a row without a split: the band feels it plays for free (resentment rises)'), value: st.dry, tone: 'bad' as const }] : []),
    ],
    note: l('Banda é sociedade: shows, discos e edição pagam todos. Menos integrantes = mais para o fundo; brigas e saídas mudam a conta.', 'A band is a partnership: shows, records and publishing pay everyone. Fewer members = more for the fund; fights and departures change the math.'),
  };
});
