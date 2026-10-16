// R31 · onda 1 (A) — a fila única de avisos (src/sim/attention.ts) entra na pendência única como mais um provedor.
// Itens da fila com `pendId` (e não resolvidos) SÃO pendências: o menu e o Hoje contam por `pendingList`, então um
// assunto que chega pela fila e por outro sistema com o mesmo id conta uma vez. Só leitura.

import { attn } from '../attention';
import type { GameState } from '../types';
import { registerPendingSource, type Pending } from './pending';

registerPendingSource('attn', (s: GameState): Pending[] => {
  const seen = new Set<string>();
  const out: Pending[] = [];
  for (const x of attn(s).q) {
    if (!x.pendId || x.done || seen.has(x.pendId)) continue;
    // carta com resposta: a dona é a caixa (provedor 'inbox', mesmo id `msg:<id>`, com prazo e estado de resposta)
    if (x.pendId.startsWith('msg:')) continue;
    seen.add(x.pendId);
    out.push({
      // o pendId já é o id da pendência (ex.: 'dec:d12' vindo de um fato), então o mesmo assunto não duplica
      id: x.pendId, kind: `attn:${x.cat}`, title: x.title,
      owner: x.dest ? { area: x.dest.area, ...(x.dest.tab ? { tab: x.dest.tab } : {}) } : { area: 'inbox', intent: 'answer' },
      shortcuts: [], prio: x.prio,
    });
  }
  return out;
});
