// BUGS33 · pedido 8 do dono — o 2º botão do menu de baixo (logo depois da Sede, tecla ⇧2) é a AÇÃO PRINCIPAL da
// carreira escolhida: na gravadora, a gestão de artistas; nas outras, a página que a carreira mais usa. Só dados (sem
// DOM; teste em tests/r33-bugs-8.test.ts). Ícone: o desenho 'artistas' de exp5px (gravadora, músico, empresário) ou
// um ícone pixel 16×16 do jogo (icons.ts / icons17.ts), ampliado ×3 como os de viagem.

import { l, type L } from '../../data/world';

export interface DockCar5 { label: L; area: string; icon: string; why: L }
/** Página de reserva quando a principal não existe nesta build: a página da carreira (CAREER_PAGE17). */
export const DOCK_CAR5: Record<string, DockCar5> = {
  label: { label: l('Artistas', 'Artists'), area: 'artists', icon: 'artistas', why: l('Gestão do elenco', 'Roster management') },
  musician: { label: l('Carreira', 'Career'), area: 'cp17-musician', icon: 'artistas', why: l('Sua banda e a sua carreira', 'Your band and your career') },
  manager: { label: l('Clientes', 'Clients'), area: 'management', icon: 'tie', why: l('Os artistas que você empresaria', 'The acts you manage') },
  booking: { label: l('Turnês', 'Tours'), area: 'tour12', icon: 'plane', why: l('Turnês e datas', 'Tours and dates') },
  festival: { label: l('Line-up', 'Line-up'), area: 'cp17-festival', icon: 'tent', why: l('Line-up e edições do festival', 'Festival line-up and editions') },
  venue: { label: l('Agenda', 'Bookings'), area: 'cp17-venue', icon: 'stage', why: l('Shows da sua casa', 'Shows at your venue') },
  studio: { label: l('Sessões', 'Sessions'), area: 'studio12', icon: 'mixer', why: l('Sessões de gravação', 'Recording sessions') },
  publisher: { label: l('Catálogo', 'Catalog'), area: 'publishing16', icon: 'note', why: l('Canções e compositores', 'Songs and writers') },
  media: { label: l('Programação', 'Programming'), area: 'outlets16', icon: 'tv', why: l('Seus veículos e a programação', 'Your outlets and programming') },
  platform: { label: l('Plataforma', 'Platform'), area: 'platform16', icon: 'stream', why: l('Catálogo e assinantes', 'Catalog and subscribers') },
  screen: { label: l('Projetos', 'Projects'), area: 'cp17-screen', icon: 'clapper', why: l('Trilhas e espetáculos', 'Soundtracks and shows') },
  critic: { label: l('Pauta', 'Assignments'), area: 'cp17-critic', icon: 'typewriter', why: l('Críticas e reportagens', 'Reviews and stories') },
};

/** A ação da carreira principal; `has(area)` diz se a página existe (senão, a página da carreira `fallback`). */
export function dockCar5(main: string, has: (area: string) => boolean, fallback?: string): DockCar5 {
  const d = DOCK_CAR5[main] ?? DOCK_CAR5.label;
  return has(d.area) || !fallback ? d : { ...d, area: fallback };
}
