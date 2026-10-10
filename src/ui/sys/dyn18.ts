// Rodada 18 (U1) — painel "Dinâmica" (Football Manager): pirâmide de influência, porta-voz, grupos, quem apoia
// quem, humor, estresse e promessas — do elenco, da equipe e de cada banda (aba no artista, categoria Integrantes).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { STRESS_LEVEL } from '../../sim/stress17';
import { dynBand, dynRoster, dynStaff, TIER18, type Dyn18, type DynNode } from '../../sim/sys/dyn18';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { canSee } from '../../sim/sys/fame15';
import { inspect, pill, section } from '../common';
import { h } from '../dom';
import { ACT_TABS } from '../pages';
import { registerArea } from '../registry';
import { personRoute16 } from '../route16';
import { tabs, ic } from '../vis';
import { rerender } from '../common';
import './core18.css';

const open = (key: string) => (key.startsWith('a:') ? inspect.act(key.slice(2)) : personRoute16.f?.(key));
const moodCls = (m: number) => (m >= 65 ? 'happy' : m < 40 ? 'unhappy' : '');
const nameOf = (d: Dyn18, key: string) => d.nodes.find((n) => n.key === key)?.name ?? '?';

function chip(n: DynNode, spokes?: string): HTMLElement {
  return h('button', { class: `dyn18-p ${moodCls(n.mood)}`, title: `${t(n.role)} · ${t(l('influência', 'influence'))} ${n.infl} · ${t(l('humor', 'mood'))} ${n.mood}`, onclick: () => open(n.key) },
    n.key === spokes ? '📣 ' : '', n.name, n.promises ? ` ✋${n.promises}` : '');
}

export function dynView(s: GameState, d: Dyn18, empty: L): HTMLElement {
  if (!d.nodes.length) return h('p', { class: 'empty18' }, t(empty));
  const tiers = [0, 1, 2, 3].map((tr) => d.nodes.filter((n) => n.tier === tr)).map((ns, i) => (ns.length ? h('div', { class: 'dyn18-tier' }, h('h5', null, t(TIER18[i])), ns.map((n) => chip(n, d.spokes))) : null));
  return h('div', null,
    h('div', { class: 'dyn18-grid' },
      section(t(l('Hierarquia', 'Hierarchy')), h('div', { class: 'dyn18-pyr' }, tiers),
        h('p', { class: 'muted small' }, '📣 ', t(l('porta-voz', 'spokesperson')), d.spokes ? `: ${nameOf(d, d.spokes)}` : '', ' · ✋ ', t(l('promessas abertas', 'open promises')), ' · ', t(l('borda verde = feliz, vermelha = infeliz', 'green border = happy, red = unhappy')))),
      section(t(l('Clima', 'Atmosphere')),
        h('p', null, t(l('Tensão', 'Tension')), ' ', pill(String(d.tension), d.tension >= 50 ? 'bad' : d.tension >= 25 ? 'warn' : 'good')),
        d.notes.length ? h('ul', { class: 'small' }, d.notes.map((x) => h('li', null, t(x)))) : h('p', { class: 'muted small' }, t(l('Nada fora do normal.', 'Nothing out of the ordinary.'))),
        d.groups.length ? h('div', null, h('h4', null, t(l('Grupos', 'Groups'))), h('ul', { class: 'small' }, d.groups.map((g) => h('li', null, h('b', null, t(g.name)), g.leader ? ` (${t(l('puxado por', 'led by'))} ${nameOf(d, g.leader)})` : '', ': ', g.members.map((m) => nameOf(d, m)).join(', '))))) : null)),
    section(t(l('Pessoas', 'People')),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl compact dyn18-tbl' },
        h('thead', null, h('tr', null, ...[l('Nome', 'Name'), l('Papel', 'Role'), l('Influência', 'Influence'), l('Humor', 'Mood'), l('Estresse', 'Stress'), l('Apoia / atrita', 'Backs / clashes'), l('Notas', 'Notes')].map((x) => h('th', null, t(x))))),
        h('tbody', null, d.nodes.map((n) => h('tr', null,
          h('td', null, h('button', { class: 'link', onclick: () => open(n.key) }, n.name)),
          h('td', null, t(n.role), ' ', h('small', { class: 'muted' }, t(TIER18[n.tier]))),
          h('td', null, n.infl),
          h('td', { class: n.mood >= 65 ? 'good' : n.mood < 40 ? 'bad' : '' }, `${n.mood} `, h('small', { class: 'muted' }, t(n.moodWhy))),
          h('td', null, n.stress ? pill(t(STRESS_LEVEL[n.stress]), n.stress === 'breaking' ? 'bad' : n.stress === 'strained' ? 'warn' : '') : '—'),
          h('td', { class: 'small' }, n.friends.length ? h('span', { class: 'good' }, '+ ', n.friends.map((k) => nameOf(d, k)).join(', ')) : null, n.foes.length ? h('span', { class: 'bad' }, ' − ', n.foes.map((k) => nameOf(d, k)).join(', ')) : null),
          h('td', { class: 'small' }, n.tags.map((x) => t(x)).join(' · '))))))),
      h('p', { class: 'muted small' }, t(l('Clique num nome para abrir a página (com o menu de ações: conversar, almoçar, pedir desculpas…). Influência = liderança, talento, carisma, ego e o quanto os outros gostam da pessoa.', 'Click a name to open the page (with the actions menu: talk, lunch, apologize…). Influence = leadership, talent, charisma, ego and how much the others like them.')))));
}

let band = '';
function area(s: GameState): HTMLElement {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.members.length >= 2 && a.status !== 'retired' && a.status !== 'split');
  if (!mine.some((a) => a.id === band)) band = mine[0]?.id ?? '';
  return h('div', { class: 'hub' },
    h('p', { class: 'muted small' }, t(l('Como no vestiário de um time: quem manda, quem segue quem, quem está feliz e o que foi prometido. Irritar um líder irrita o grupo dele.', 'Like a team\'s dressing room: who leads, who follows whom, who is happy and what was promised. Upset a leader and their group follows.'))),
    tabs('dyn18', [
      { id: 'roster', label: t(l('Elenco', 'Roster')), icon: 'fans', render: () => dynView(s, dynRoster(s), l('Sem artistas no elenco ainda. Contrate no Mercado: a dinâmica aparece com 2+ atos.', 'No acts on the roster yet. Sign some in the Market: dynamics appear with 2+ acts.')) },
      { id: 'band', label: t(l('Bandas', 'Bands')), icon: 'guitar', render: () => mine.length ? h('div', null,
        h('div', { class: 'row wrap' }, mine.map((a) => h('button', { class: `btn small ${a.id === band ? 'primary' : 'ghost'}`, 'aria-pressed': String(a.id === band), onclick: () => { band = a.id; rerender(); } }, a.name))),
        dynView(s, dynBand(s, s.acts[band]), l('—', '—'))) : h('p', { class: 'empty18' }, t(l('Nenhuma banda (2+ integrantes) no elenco. Artistas solo não têm vestiário.', 'No bands (2+ members) on the roster. Solo acts have no dressing room.'))) },
      { id: 'staff', label: t(l('Equipe', 'Staff')), icon: 'handshake', render: () => dynView(s, dynStaff(s), l('Sem equipe contratada. Contrate em Selo → Equipe.', 'No staff hired. Hire in Label → Team.')) },
    ], rerender));
}

export function installDyn18(): void {
  registerArea({ id: 'dyn18', label: l('Dinâmica', 'Dynamics'), icon: 'fans', key: '', render: area, visible: (s) => playerActs(s).length > 0 || s.player.staff.length > 0 });
  ACT_TABS.push((s, a) => {
    const mine = a.owner === 'player' || !!a.playerBand;
    if (a.members.length < 2 || (!mine && !canSee(s, a.id, 'rels'))) return null;
    return { id: 'dyn18', label: l('Dinâmica', 'Dynamics'), icon: 'fans', render: () => dynView(s, dynBand(s, a), l('—', '—')) };
  });
}
export const _dyn18 = { ic };
