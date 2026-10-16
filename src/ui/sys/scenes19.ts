// Rodada 19 (cenas) — liga a surpresa da cerimônia na interface: com a interface ativa, o resultado dos Gramófonos
// (livro, avisos, cartões, notícia) espera a cena; ao fechar (ou pular, com cenas desligadas) a cena, ele é anunciado.

import { t } from '../../i18n/strings';
import { LIVE19, releaseHeld19 } from '../../sim/sys/scenes19';
import { toast } from '../common';
import { attnSeq, notes } from '../../sim/attention';
import { ON_SCENE_DONE } from '../registry';

LIVE19.on = true;
ON_SCENE_DONE.push((s, cs) => {
  if (cs.kind !== 'awards') return;
  const n0 = attnSeq(s);
  if (!releaseHeld19(s, cs.id)) return;
  for (const n of notes(s, { after: n0 })) toast(t(n.text), n.kind);
});
