// R29 (FORMAÇÃO) — formação inicial das bandas reais nos mundos alternativos com nomes reais. Pedido do autor:
// "faça o modo padrão ser utilizando nomes reais e formações iniciais reais, mas todo o resto inventado (ainda mais no
// modo rápido)"; "na verdade deixe escolher entre formação original e mais famosa"; "isso só na completa; na Nova run
// rápida faça começar com a formação mais famosa"; "e os outros artistas ficam sem banda (e se não participaram da banda
// no save não devem aparecer como ex-integrantes)".
//
// - 'famous'  (mais famosa): a formação clássica (classicLineup25, o maior elenco simultâneo) ou, sem ela, a da estreia.
// - 'original' (da estreia): quem estava na banda no começo do ano de estreia (o mês documentado em MONTHS27 decide:
//   Beatles = John, Paul, George e Pete Best; Ringo só entrou em agosto de 1962).
// Nos dois casos NENHUMA troca de formação é agendada: depois da criação, toda troca é da simulação. Quem não está na
// formação escolhida existe no mundo como pessoa livre (sem banda, sem "ex-integrante de").
// Só vale com nomes reais fora do modo exato (history 'free' — random, snap, caos — e 'loose' — real). Configuração sem
// o campo (saves antigos, testes, bot) = comportamento de antes. Puro (sem DOM, sem RNG).

import { l, type L } from '../data/world';
import type { RunConfig } from './types';

export type Lineup29 = 'famous' | 'original';
/** Opções da configuração completa (a rápida usa sempre 'famous'), na ordem mostrada. */
export const LINEUPS29: { id: Lineup29; name: L; fx: L }[] = [
  { id: 'famous', name: l('Mais famosa (padrão)', 'Most famous (default)'),
    fx: l('Cada banda real começa com a formação clássica (a de maior elenco) ou, sem ela, a da estreia. Ex.: Beatles com Ringo.', 'Each real band starts with its classic lineup (the largest one) or, without one, its debut lineup. E.g. the Beatles with Ringo.') },
  { id: 'original', name: l('Original (da estreia)', 'Original (at debut)'),
    fx: l('Cada banda real começa com quem estava nela na estreia. Ex.: Beatles com Pete Best.', 'Each real band starts with whoever was in it at debut. E.g. the Beatles with Pete Best.') },
];
/** Padrão da Nova run (rápida e completa). */
export const LINEUP29_DEFAULT: Lineup29 = 'famous';

/** O campo faz sentido nesta configuração (nomes reais e mundo não exato)? */
export const lineupApplies29 = (c: Pick<RunConfig, 'realNames' | 'history'>): boolean => !!c.realNames && c.history !== 'strict';

/** Escolha efetiva da formação inicial (undefined = geração de antes: períodos documentados e trocas de identidade). */
export function lineup29Of(c: Pick<RunConfig, 'realNames' | 'history' | 'lineup29'>): Lineup29 | undefined {
  return lineupApplies29(c) && (c.lineup29 === 'famous' || c.lineup29 === 'original') ? c.lineup29 : undefined;
}
