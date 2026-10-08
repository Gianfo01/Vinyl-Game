// Interface do sistema "music" da rodada 4: Sala de composição (aba em Criação), botões ▶ e
// "Compor com mini-jogos" no Repertório, ▶ na ficha do lançamento, audição às cegas (Mercado),
// rádio do jogo (Paradas) e o take no tempo na Central. O som só toca depois de um clique.

import './music.css';
import { buildSongSpec } from '../../audio/spec';
import { l } from '../../data/world';
import { registerSection, registerTab } from '../registry';
import { REP_SONG_EXTRAS } from '../panels/repertoire';
import { RELEASE_SONG_EXTRAS } from '../ficha';
import { blindReady } from '../../sim/sys/music';
import { playBtn } from './music/common';
import { blindTab, radioSection, takeSection } from './music/extras';
import { composeBtn, roomTab } from './music/room';

registerTab('creation', { id: 'writingroom', label: l('Sala de composição', 'Writing room'), icon: 'pen', order: 55, render: (s) => roomTab(s) });
registerTab('marketHub', { id: 'blind', label: l('Audição às cegas', 'Blind audition'), icon: 'note', order: 70, badge: (s) => (blindReady(s) ? 1 : undefined), render: (s) => blindTab(s) });
registerSection('charts', { id: 'music-radio', order: 10, render: (s) => radioSection(s) });
registerSection('plan', { id: 'music-take', order: 10, render: (s) => takeSection(s) });

REP_SONG_EXTRAS.push((s, so) => playBtn(() => buildSongSpec(s, so)));
REP_SONG_EXTRAS.push((s, so) => composeBtn(s, so));
RELEASE_SONG_EXTRAS.push((s, so) => playBtn(() => buildSongSpec(s, so)));
