// Interface do sistema "music": ▶ para ouvir cada música (Repertório e ficha do lançamento),
// aba Estúdio em Criação (foco por etapa e equipamentos) e a rádio do jogo nas Paradas.
// O som só toca depois de um clique.

import './music.css';
import { buildSongSpec } from '../../audio/spec';
import { l } from '../../data/world';
import { registerSection, registerTab } from '../registry';
import { REP_SONG_EXTRAS } from '../panels/repertoire';
import { RELEASE_SONG_EXTRAS } from '../ficha';
import { playBtn } from './music/common';
import { radioSection } from './music/extras';
import { studioTab } from './music/room';

registerTab('creation', { id: 'studio-gear', label: l('Estúdio', 'Studio'), icon: 'mic', order: 55, render: (s) => studioTab(s) });
registerSection('charts', { id: 'music-radio', order: 10, render: (s) => radioSection(s) });

REP_SONG_EXTRAS.push((s, so) => playBtn(() => buildSongSpec(s, so)));
RELEASE_SONG_EXTRAS.push((s, so) => playBtn(() => buildSongSpec(s, so)));
