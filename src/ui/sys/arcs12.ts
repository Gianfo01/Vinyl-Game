// Rodada 12: aba "Arco" na página do artista — capítulos da história com o selo, o peso de cada um na
// memória do artista e onde esse peso aparece (renovação, propostas, aliciamento, brigas).

import './story12.css';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { arcReason, arcs, arcTitle, arcWeight } from '../../sim/sys/arcs12';
import type { GameState } from '../../sim/types';
import { pill, section } from '../common';
import { h } from '../dom';
import { registerPageTab } from '../registry';

function arcTab(s: GameState, id: string): HTMLElement | null {
  const act = s.acts[id];
  if (!act) return null;
  const list = arcs(s).log[id] ?? [];
  const w = arcWeight(s, act);
  const pct = Math.round((w.v + 1) * 50);
  const mood = w.v > 0.25 ? l('Gratidão: tende a ficar, recusar rivais e ouvir você.', 'Gratitude: inclined to stay, turn down rivals and listen to you.')
    : w.v < -0.25 ? l('Mágoa: renova mal, cede a rivais e não aceita mediação.', 'Grudge: hard to renew, open to rivals, rejects mediation.')
    : l('Neutro: o histórico ainda não pesa muito.', 'Neutral: the history does not weigh much yet.');
  return h('div', { class: 'arc12' },
    section(t(arcTitle(s, act)),
      h('div', { class: 'arc-meter' }, h('small', null, t(l('mágoa', 'grudge'))), h('div', { class: 'track' }, h('span', { class: 'dot', style: `left:${pct}%` })), h('small', null, t(l('gratidão', 'gratitude')))),
      h('p', { class: 'small' }, t(mood)),
      w.best ? h('p', { class: 'small good' }, '＋ ', t(arcReason(s, act, w.best))) : null,
      w.worst ? h('p', { class: 'small bad' }, '－ ', t(arcReason(s, act, w.worst))) : null,
      h('p', { class: 'muted small' }, t(l('A memória pesa em renovações, propostas de contrato, tentativas de aliciamento e brigas públicas — sempre com o motivo à vista. O que é antigo pesa menos; mágoa dura mais que gratidão; um novo dono herda metade da gratidão e quase toda a mágoa. Lealdade e teimosia do líder ampliam o efeito.', 'Memory weighs on renewals, contract offers, poaching attempts and public feuds — always with the reason shown. Old chapters weigh less; grudges outlast gratitude; a new owner inherits half the gratitude and nearly all the grudges. The leader\'s loyalty and stubbornness amplify it.')))),
    section(t(l('Capítulos', 'Chapters')),
      list.length ? h('ol', null, list.slice().reverse().map((e) => h('li', { class: e.w > 0.04 ? 'pos' : e.w < -0.04 ? 'neg' : '' },
        h('b', null, String(e.y)), h('span', null, t(e.t)),
        e.w ? pill(`${e.w > 0 ? '+' : ''}${Math.round(e.w * 100)}${e.used ? ' ½' : ''}`, e.w > 0 ? 'good' : 'bad') : h('span')))) : h('p', { class: 'muted small' }, t(l('Nada marcante ainda. Discos que você banca, promessas, aliciamentos e brigas viram capítulos aqui.', 'Nothing remarkable yet. Records you back, promises, poaching and feuds become chapters here.')))),
  );
}

registerPageTab('act', { id: 'arc12', label: l('Arco', 'Arc'), icon: 'book', order: 12,
  when: (s, id) => !!s.acts[id] && (s.acts[id].owner === 'player' || !!arcs(s).log[id]?.length), render: arcTab });
