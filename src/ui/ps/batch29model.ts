// Rodada 29 (REORG, M41) — o que dá para desfazer de cada ação em lote (texto mostrado na prévia). Sem DOM.
// O lote em si é o de sempre (actions20: batchPreview20/runBatch20 + o painel openBatch20): aqui só a informação
// de reversibilidade, declarada por ação. Ação sem declaração = "não se desfaz pelo lote" (nunca promete desfazer).

import { l, type L } from '../../data/world';

const AGENDA: L = l('Reversível neste mês: tire da agenda do artista (Agenda) antes de avançar.', 'Reversible this month: remove it from the act\'s agenda before advancing.');
export const UNDO29: Record<string, L> = {
  'agenda.manual': l('Reversível: "Delegar a agenda à equipe" volta como estava.', 'Reversible: "Delegate the agenda to the team" restores it.'),
  'agenda.delegate': l('Reversível: "Assumir a agenda" devolve o controle manual.', 'Reversible: "Take over the agenda" gives manual control back.'),
  'leader.praise': l('Não reversível: o efeito na relação acontece na hora.', 'Not reversible: the effect on the relationship happens at once.'),
};
/** Texto de reversibilidade de uma ação em lote. Slots de agenda (agenda.add.*) são reversíveis no mês. */
export function undo29(id: string): L {
  if (UNDO29[id]) return UNDO29[id];
  if (/^(agenda\.|slot\.|add\.)/.test(id)) return AGENDA;
  return l('Não se desfaz pelo lote: confira a prévia antes de confirmar.', 'Cannot be undone by the batch: check the preview before confirming.');
}
