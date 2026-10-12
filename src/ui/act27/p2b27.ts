// r27 (P2B) — pontos de entrada das mecânicas da fase 2, sem mexer nas telas dos outros:
//   • Cockpit (HOME_EXTRA19): bloco "Crises" (com "▶ Enfrentar"), "Reunião de diretoria" no começo do mês e
//     "Na estrada" (diário das turnês planejadas no mapa com eventos pela frente).
//   • Rumo do selo › Políticas (POLICY19): reunião de diretoria (ligar/sentar à mesa) e crises.
//   • Depois de avançar (AFTER_ADVANCE): aviso de crise nova e de evento de estrada a decidir.
// Tudo some no modo "sempre rápido" (os botões "Jogar" saem; o jogo segue como antes).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { crisisCands27 } from '../../sim/sys/crisis27';
import { pendingRoad27 } from '../../sim/sys/road27';
import type { GameState } from '../../sim/types';
import { toast } from '../common';
import { h } from '../dom';
import { AFTER_ADVANCE } from '../registry';
import { HOME_EXTRA19 } from '../sys/home18';
import { POLICY19 } from '../sys/long18';
import { card27 } from '../ps/ui27';
import { boardPending27, boardSection27 } from './board27';
import { crisesSection27 } from './crisis27';
import { actMode27, playBtn27 } from './mode27';
import { openRoad27, roadTours27 } from './road27';

function roadSection27(s: GameState): HTMLElement | null {
  const pend = pendingRoad27(s, 21);
  const tours = roadTours27(s);
  if (!tours.length) return null;
  return card27({ title: l('Na estrada', 'On the road'), icon: 'tour-bus' },
    h('ul', { class: 'p2b-list' }, tours.map((x) => {
      const n = pend.filter((p) => p.t.id === x.id).length;
      return h('li', null, h('b', null, x.name), ' ', n ? h('small', { class: 'warn' }, t(l('{n} evento(s) para decidir', '{n} event(s) to decide'), { n })) : h('small', { class: 'muted' }, t(l('nada pela frente', 'nothing ahead'))), ' ',
        playBtn27(l('Diário de estrada', 'Road journal'), () => openRoad27(x.id), true) ?? '');
    })));
}

HOME_EXTRA19.push((s) => {
  if (actMode27() === 'quick') return [];
  const out = [];
  const cr = crisesSection27(s);
  if (cr) out.push({ id: 'home:crisis27', title: l('Crises', 'Crises'), weight: 78, el: cr, host: 'home' as const });
  const rd = roadSection27(s);
  if (rd) out.push({ id: 'home:road27', title: l('Na estrada', 'On the road'), weight: pendingRoad27(s, 21).length ? 64 : 30, el: rd, host: 'home' as const });
  if (boardPending27(s) && s.clock.dayInMonth < 14) { const b = boardSection27(s); if (b) out.push({ id: 'home:board27', title: l('Reunião de diretoria', 'Board meeting'), weight: 46, el: b, host: 'home' as const }); }
  return out;
});

POLICY19.push((s) => {
  const b = boardSection27(s);
  const c = actMode27() === 'quick' ? null : crisesSection27(s);
  return b || c ? h('div', { class: 'p2b-pol' }, b, c) : null;
});

let seen27 = new Set<string>();
AFTER_ADVANCE.push((s) => {
  if (actMode27() === 'quick') return;
  try {
    const cands = crisisCands27(s).filter((c) => !seen27.has(c.id));
    for (const c of cands) seen27.add(c.id);
    if (cands.length) toast(t(l('Crise na mesa: {t}. Veja no Cockpit (▶ Enfrentar).', 'Crisis on the table: {t}. See the Cockpit (▶ Face it).'), { t: t(cands[0].text) }), 'bad');
    const rd = pendingRoad27(s, 10);
    if (rd.length) toast(t(l('Estrada: {n} evento(s) nas próximas datas — abra o Diário de estrada.', 'Road: {n} event(s) on the next dates — open the Road journal.'), { n: rd.length }), 'warn');
    if (seen27.size > 200) seen27 = new Set([...seen27].slice(-100));
  } catch (e) { console.warn('p2b27', e); }
});
