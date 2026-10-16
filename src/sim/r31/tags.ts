// R31 · O — ETIQUETAS DE NÚMERO. Duas famílias, uma tabela cada (a interface só desenha: ui/r31/o31.ts).
//
//  RN-03 · dinheiro: todo valor que ainda não saiu do caixa diz em que pé está —
//    estimado (conta do plano, pode mudar) · reservado (separado do caixa livre, ainda não saiu) ·
//    a pagar (devido, com data ou já vencendo) · pago (já saiu: fato).
//  RN-27/28 · origem do número: fato observado (aconteceu, está no livro) · cálculo (a conta do jogo sobre o que se sabe:
//    previsões, valores, chances) · hipótese (leitura/inferência: pode estar errada). RN-28: um resultado não prova a
//    estratégia — a nota acompanha chances e previsões.
//
// Puro: testes em Node.

import { l, type L } from '../../data/world';
import type { OblKind20 } from '../oblig20';

export type Money31 = 'estimated' | 'reserved' | 'payable' | 'paid';
export const MONEY31: Record<Money31, { label: L; hint: L; icon: string }> = {
  estimated: { label: l('estimado', 'estimated'), icon: '≈', hint: l('Conta do plano: pode mudar até a hora de pagar. Ainda não sai do caixa.', 'Plan math: may change until it is paid. Not out of cash yet.') },
  reserved: { label: l('reservado', 'reserved'), icon: '◐', hint: l('Separado do caixa livre: ainda está na conta, mas já tem destino.', 'Set aside from free cash: still in the bank, but already spoken for.') },
  payable: { label: l('a pagar', 'to pay'), icon: '⏳', hint: l('Devido: sai do caixa no prazo, com ou sem saldo.', 'Owed: leaves cash on the due date, balance or not.') },
  paid: { label: l('pago', 'paid'), icon: '✓', hint: l('Já saiu do caixa: está no livro.', 'Already out of cash: it is on the books.') },
};

/** Tipo de obrigação do registro único (sim/oblig20) → estado do dinheiro. */
export function oblMoney31(kind: OblKind20): Money31 {
  switch (kind) {
    case 'reserve': return 'reserved';
    case 'commitment': return 'estimated';
    default: return 'payable';
  }
}

export type Basis31 = 'fact' | 'calc' | 'guess';
export const BASIS31: Record<Basis31, { label: L; hint: L; icon: string }> = {
  fact: { label: l('fato', 'fact'), icon: '●', hint: l('Fato observado: aconteceu e está registrado.', 'Observed fact: it happened and is on record.') },
  calc: { label: l('cálculo', 'calculation'), icon: '∑', hint: l('Cálculo do jogo sobre o que você sabe hoje: a mesma conta que decide, mas o mundo ainda pode mudar.', 'The game\'s math on what you know today: the same formula that decides, but the world can still change.') },
  guess: { label: l('hipótese', 'hypothesis'), icon: '?', hint: l('Hipótese: leitura sua ou da equipe, com informação parcial. Pode estar errada.', 'Hypothesis: your or the team\'s read, on partial information. It may be wrong.') },
};

/** RN-28: a frase que acompanha chances e previsões. */
export const ONE_RESULT31 = l('Um resultado não prova a estratégia: o acaso também joga.', 'One result does not prove the strategy: chance plays too.');

/** Fator de autópsia: o efeito é calculado; com confiança baixa, é hipótese. */
export const autopsyBasis31 = (conf: 'high' | 'medium' | 'low' | string): Basis31 => (conf === 'low' ? 'guess' : 'calc');

/** Previsão com informação ruim é hipótese; com informação boa é cálculo. (`q` 0–1 = qualidade da informação.) */
export const forecastBasis31 = (q: number): Basis31 => (q < 0.35 ? 'guess' : 'calc');
