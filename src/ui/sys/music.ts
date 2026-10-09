// Interface do sistema "music": aba Estúdio em Criação (foco por etapa e equipamentos).
// Rodada 7: a reprodução de áudio (ouvir músicas e rádio do jogo) foi removida a pedido do criador.

import './music.css';
import { l } from '../../data/world';
import { registerTab } from '../registry';
import { studioTab } from './music/room';

registerTab('creation', { id: 'studio-gear', label: l('Equipamento', 'Gear'), icon: 'mic', order: 55, render: (s) => studioTab(s) });

