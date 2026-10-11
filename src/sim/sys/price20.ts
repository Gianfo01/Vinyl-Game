// Rodada 20c (N2) — moeda e base de tempo dos preços, e vocabulário único das ações de sede/prédio.
// O motor guarda preços em dólares de 2020 ("reais") e mostra o valor NOMINAL do ano da partida (índice de preços
// ao consumidor, src/core/money.ts). Aqui: a explicação "por quê" de qualquer preço (chave 'price20') e os tipos de
// custo — reformar, equipar, alugar, comprar, mudar, construir, ampliar — com a natureza (investimento × recorrente).
import { priceIndex, toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { registerExplain } from '../explain18';
import type { GameState } from '../types';
import { fmtL } from '../util';

export type CostKind20 = 'refit' | 'equip' | 'rent' | 'buy' | 'move' | 'build' | 'expand';
export type Nature20 = 'inv' | 'rec';
export const NATURE20: Record<Nature20, L> = {
  inv: l('Investimento (uma vez)', 'Investment (one-off)'),
  rec: l('Recorrente (por mês)', 'Recurring (per month)'),
};
export const COSTK20: Record<CostKind20, { name: L; nature: Nature20; desc: L }> = {
  refit: { name: l('Reformar', 'Renovate'), nature: 'inv', desc: l('Obra no prédio que você já ocupa (fachada, salas, reconstrução). Paga uma vez; não muda o aluguel.', 'Works on the building you already occupy (façade, rooms, rebuild). Paid once; rent does not change.') },
  equip: { name: l('Equipar', 'Equip'), nature: 'inv', desc: l('Equipamento, móveis e instrumentos. Paga uma vez; alguns pedem engenheiro.', 'Gear, furniture and instruments. Paid once; some need an engineer.') },
  rent: { name: l('Alugar', 'Rent'), nature: 'rec', desc: l('Aluguel e manutenção: sai do caixa todo mês enquanto durar.', 'Rent and upkeep: leaves cash every month while it lasts.') },
  buy: { name: l('Comprar', 'Buy'), nature: 'inv', desc: l('Compra de imóvel ou negócio: ativo do balanço; acaba o aluguel daquele imóvel.', 'Buying property or a business: a balance-sheet asset; ends that property\'s rent.') },
  move: { name: l('Mudar de sede', 'Move HQ'), nature: 'inv', desc: l('Mudar para um espaço maior (ou de lote): custo de mudança uma vez e um aluguel NOVO por mês.', 'Moving to bigger premises (or another lot): a one-off moving cost and a NEW monthly rent.') },
  build: { name: l('Construir', 'Build'), nature: 'inv', desc: l('Obra nova num lote: entrada de 30% e o resto durante a obra.', 'New works on a lot: 30% down and the rest during construction.') },
  expand: { name: l('Ampliar', 'Expand'), nature: 'inv', desc: l('Mais capacidade no que você já tem; costuma subir a manutenção mensal.', 'More capacity in what you already have; usually raises monthly upkeep.') },
};

const usd = (dollars: number): string => `US$ ${Math.round(dollars).toLocaleString('en-US')}`;
/** "US$ de {ano}; ≈ US$ X de 2020" para um valor em centavos nominais do ano corrente. */
export function priceBasis20(s: GameState, cents: number, year = s.year): L {
  return fmtL(l('Valores em US$ de {y}; ≈ {r} de 2020.', 'Amounts in {y} US$; ≈ {r} in 2020 dollars.'), { y: year, r: usd(toReal(cents, year)) });
}

registerExplain('price20', (s, c) => {
  const v = Number(c.v ?? 0), y = Number(c.y ?? s.year);
  if (!Number.isFinite(v)) return null;
  const k = COSTK20[String(c.k ?? '') as CostKind20];
  const rec = c.rec === true || c.rec === 1 || k?.nature === 'rec';
  return {
    title: fmtL(l('Preço em US$ de {y}', 'Price in {y} US$'), { y }),
    value: v, fmt: 'money',
    parts: [
      { label: fmtL(l('Valor nominal (dinheiro de {y})', 'Nominal value ({y} money)'), { y }), value: v, fmt: 'money' },
      { label: fmtL(l('Índice de preços de {y} (2020 = 1,00)', '{y} price index (2020 = 1.00)'), { y }), value: priceIndex(y), fmt: 'mult' },
      { label: l('Equivale a (US$ de 2020)', 'Equivalent (2020 US$)'), value: Math.round(toReal(v, y) * 100), fmt: 'money' },
      ...(k ? [{ label: fmtL(l('Tipo: {k} — {n}', 'Type: {k} — {n}'), { k: k.name, n: NATURE20[k.nature] }), value: '—', fmt: 'text' as const, note: k.desc }] : []),
      ...(rec ? [{ label: l('Por ano (×12)', 'Per year (×12)'), value: v * 12, fmt: 'money' as const }] : []),
    ],
    note: l('O jogo guarda os preços em dólares de 2020 e converte para o dinheiro do ano da partida pelo índice de preços ao consumidor (CPI). Por isso um mesmo item custa "menos" em 1962 do que em 2005: é o mesmo valor real. Saldo, receitas e custos estão todos na mesma moeda nominal do ano.',
      'The game stores prices in 2020 dollars and converts them to the run year\'s money with the consumer price index (CPI). That is why the same item "costs less" in 1962 than in 2005: it is the same real value. Balance, revenue and costs all use the same nominal money of the year.'),
  };
});
