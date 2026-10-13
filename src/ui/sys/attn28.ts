// Rodada 28 (F3, C5) — ORÇAMENTO ÚNICO DE ATENÇÃO na interface. A regra mora em sim/sys/story28 (pura, testável); aqui
// só se liga aos pontos que abrem algo na tela:
//  - cenas (registry.showPendingCutscene): no máximo 2 por avanço e 3 por mês; decisões ('always') sempre passam;
//    as que sobram vão para o álbum e entram no aviso "cenas que não interromperam" (quiet23);
//  - dicas de 1ª vez (tutorial18 via queue27): nunca no avanço em que uma cena abriu e no máximo 3 por mês.
// Metas de abertura e o cartão do tutorial são o caminho guiado (já em fila, uma janela por vez) e não gastam.
import { attnScenes28, attnTip28, spendTip28 } from '../../sim/sys/story28';
import { ATTN27 } from '../ps/queue27';
import { SCENE_GATE28 } from '../registry';

SCENE_GATE28.f = (s, list) => attnScenes28(s, list);
ATTN27.ok = (kind, g) => (kind === 'tip' ? attnTip28(g) : true);
ATTN27.spent = (kind, g) => { if (kind === 'tip') spendTip28(g); };
