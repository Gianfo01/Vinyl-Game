// Menus da rodada 9: festivais, gravadoras, premiações, críticos e movimentos saem de abas escondidas
// e viram páginas próprias no grupo Mundo / Prêmios e eventos do menu lateral.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rivalsExtra } from '../panels/discovery';
import { rivals } from '../panels/market';
import { h } from '../dom';
import { registerArea } from '../registry';
import { rerender } from '../common';
import { tabs } from '../vis';
import { relTab } from './bonds9';
import { ceremoniesTab, criticsTab, festivalsTab } from './hubs8';
import { rankingTab } from './ventures9';
import { leadersTab } from './leaders10';

function labelsArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub' }, tabs('labels9', [
    { id: 'rank', label: t(l('Ranking e prestígio', 'Ranking and standing')), icon: 'star', render: () => rankingTab(s) },
    { id: 'list', label: t(l('Selos rivais', 'Rival labels')), icon: 'building', render: () => rivals(s) },
    { id: 'leaders', label: t(l('Estratégias e líderes', 'Strategies and leaders')), icon: 'handshake', render: () => leadersTab(s) },
    { id: 'intel', label: t(l('Inteligência', 'Intel')), icon: 'camera', render: () => rivalsExtra(s) },
  ], rerender));
}

registerArea({ id: 'labels', label: l('Gravadoras', 'Labels'), icon: 'building', key: 'k', render: labelsArea });
registerArea({ id: 'festivals', label: l('Festivais', 'Festivals'), icon: 'star', key: 'j', render: festivalsTab });
registerArea({ id: 'awards', label: l('Premiações', 'Awards'), icon: 'trophy', key: 'o', render: ceremoniesTab });
registerArea({ id: 'critics', label: l('Críticos', 'Critics'), icon: 'newspaper', key: 'q', render: criticsTab });
registerArea({ id: 'movements', label: l('Relações e movimentos', 'Relationships and movements'), icon: 'handshake', key: 'm', render: relTab });
