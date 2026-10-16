// Rodada 23 (A) — cenas que NÃO interromperam: um aviso na caixa de entrada por avanço e a lista "Rever cena" no
// Álbum de cenas (dá para abrir, e decidir quando a cena tem escolha ainda em aberto).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Cutscene } from '../../sim/ext4';
import { pushInbox18, registerInboxKind } from '../../sim/inbox18';
import { interruptOf23 } from '../../sim/interrupt23';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { sceneAlbum } from '../../sim/attention';
import { rerender, section } from '../common';
import { h } from '../dom';
import { ON_QUIET23, hasCutscene, openCutscene } from '../registry';
import { ALBUM17_X } from './scene17';

const T = (x: unknown): string => (typeof x === 'string' ? x : x && typeof x === 'object' && 'pt' in x ? t(x as L) : '');

registerInboxKind('scn23_quiet', { label: l('Cenas', 'Scenes'), cat: 'press', icon: 'camera', prio: 0, goto: () => ({ area: 'scenes17', label: l('Rever no Álbum de cenas', 'Replay in the Scene album') }) });

ON_QUIET23.push((s, list) => {
  const names = list.map((c) => T(c.data.title)).filter(Boolean);
  if (!names.length) return;
  pushInbox18(s, 'scn23_quiet', {
    from: t(l('Assessoria', 'Office')),
    subject: list.length === 1 ? fmtL(l('Cena registrada: {n}', 'Scene logged: {n}'), { n: names[0] }) : fmtL(l('{k} cenas registradas sem interromper', '{k} scenes logged without interrupting'), { k: list.length }),
    body: fmtL(l('Rotina não interrompe o jogo (Configurações › Interrupções). Para rever: Álbum de cenas › Rever cena. — {n}', 'Routine does not interrupt play (Settings › Interruptions). To replay: Scene album › Replay scene. — {n}'), { n: names.slice(0, 6).join(' · ') }),
    tone: 'info',
  });
});

/** Cenas guardadas em silêncio (mais recentes primeiro). r31 (UNI-1): o álbum é uma vista da fila única de atenção. */
export function quietScenes23(s: GameState): Cutscene[] {
  return sceneAlbum(s).filter((c) => hasCutscene(c.kind));
}

ALBUM17_X.push((s) => {
  const list = quietScenes23(s).slice(0, 20);
  if (!list.length) return null;
  const tag = (c: Cutscene): L => { const k = interruptOf23(c); return k === 'never' ? l('rotina', 'routine') : k === 'milestone' ? l('marco', 'milestone') : l('decisão', 'decision'); };
  return section(t(l('Rever cena', 'Replay scene')),
    h('p', { class: 'muted small' }, t(l('Cenas que foram para a caixa de entrada em vez de interromper. Escolhas ainda abertas podem ser feitas aqui.', 'Scenes that went to the inbox instead of interrupting. Choices still open can be made here.'))),
    h('ul', { class: 'small' }, list.map((c) => h('li', null,
      h('b', null, T(c.data.title) || c.kind), ` · ${t(tag(c))} · `,
      h('button', { class: 'link small', onclick: () => openCutscene(s, c, rerender) }, t(l('rever cena', 'replay scene')))))));
});
