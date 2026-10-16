// R31 · onda 4 (T) — AEROPORTO em cena: modelo PURO (sem DOM). A construção muda com a época (estação de trem e porto
// até 1919, campo de pouso, terminal, aeroporto de jatos; hangar de jatinhos a partir de 1965) e cada balcão leva a
// uma ação que já existe: partidas (turnês), desembarque (quem vem tocar; seu artista voltando famoso), alfândega
// (importações da casa de leilões), sala VIP (intermediário das facções de fora, executivos estrangeiros), hangar
// (avião fretado), cais (temporadas no mar), estúdio de holograma (2027+) e a banca com as notícias da aviação.
// Só lê o estado (sim/sys/travel31 e auction31).

import { l, type L } from '../../data/world';
import { recentFacts, type Fact } from '../../sim/facts17';
import { auction31 } from '../../sim/sys/auction31';
import {
  AIRPORT_NAME31, HANGAR_FROM31, HOLO_FROM31, airportEvents31, airportOf31, arrivals31, atSea31, cruiseOpen31, crowd31, departures31, vipPlace31,
  type Airport31, type Flight31,
} from '../../sim/sys/travel31';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import type { Spot31 } from './scene31model';

export const AIR_W31 = 320;
export const AIR_H31 = 180;

export interface Air31 {
  W: number; H: number; year: number; era: Airport31; name: L;
  hangar: boolean; holo: boolean;
  dep: Flight31[]; arr: Flight31[];
  /** multidão no portão (0–4): o maior dos seus que voltou */
  crowd: number;
  imports: number;
  atSea: string[];
  news: Fact[];
  events: number;
  spots: Spot31[];
}

export function airport31Model(s: GameState): Air31 {
  const era = airportOf31(s.year);
  const dep = departures31(s), arr = arrivals31(s);
  const mineBack = arr.filter((x) => x.mine);
  const crowd = mineBack.length ? crowd31(Math.max(...mineBack.map((x) => x.fame))) : 0;
  const st = (s.x4 as unknown as { auction31?: unknown }).auction31 ? auction31(s) : undefined;
  const imports = (st?.imports ?? []).filter((x) => x.arrive >= s.week).length;
  const atSea = playerActs(s).filter((id) => atSea31(s, id));
  const news = recentFacts(s, { kind: 'aviation_news', limit: 8 });
  const events = airportEvents31(s).length;
  const hangar = s.year >= HANGAR_FROM31, holo = s.year >= HOLO_FROM31;
  const spots: Spot31[] = [];
  const sp = (x: Omit<Spot31, 'go'> & { panel: string }): void => { const { panel, ...rest } = x; spots.push({ ...rest, go: { panel } }); };
  const rail = era === 'rail';
  sp({ id: 'dep', x: 112, y: 14, w: 96, h: 30, label: rail ? l('Quadro de partidas (trens e navios)', 'Departures board (trains and ships)') : l('Painel de partidas', 'Departures board'),
    tip: l('Para onde seus artistas estão indo; daqui se abre turnê internacional e se manda o olheiro para fora.', 'Where your acts are headed; from here you open an international tour and send the scout abroad.'), panel: 'dep',
    badge: dep.length ? { text: String(dep.length), level: dep.some((x) => x.w <= s.week + 1) ? 'soon' : 'info' } : undefined });
  sp({ id: 'arr', x: 14, y: 96, w: 64, h: 50, label: l('Desembarque', 'Arrivals'),
    tip: crowd ? l('Seu artista voltou famoso: fãs e imprensa no portão.', 'Your act came back famous: fans and press at the gate.') : l('Artistas de fora chegando para tocar na sua cidade: conhecer e convidar.', 'Foreign acts arriving to play your city: meet and invite them.'), panel: 'arr',
    badge: arr.length ? { text: String(arr.length), level: 'info' } : undefined });
  sp({ id: 'customs', x: 92, y: 100, w: 52, h: 40, label: l('Alfândega', 'Customs'), tip: l('Importar peças de leilões de fora (imposto e prazo) e exportar discos (licenciamento).', 'Import pieces from foreign auctions (duty and delay) and export records (licensing).'), panel: 'customs',
    badge: imports ? { text: String(imports), level: 'normal', sym: '📦' } : undefined });
  sp({ id: 'vip', x: 156, y: 100, w: 52, h: 40, label: vipPlace31(s.year), tip: l('O intermediário das facções de fora e executivos estrangeiros com propostas.', 'The broker for foreign factions and foreign executives with proposals.'), panel: 'vip' });
  sp({ id: 'sea', x: 252, y: 118, w: 64, h: 40, label: l('Cais (temporadas no mar)', 'Pier (seasons at sea)'),
    tip: cruiseOpen31(s).length ? l('Orquestra de transatlântico, navio de cruzeiro ou cruzeiro temático, conforme a época.', 'Ocean-liner orchestra, cruise ship or theme cruise, depending on the era.') : l('Nesta época não há temporadas no mar.', 'No seasons at sea in this era.'), panel: 'sea',
    badge: atSea.length ? { text: String(atSea.length), level: 'info', sym: '⚓' } : undefined });
  if (hangar) sp({ id: 'hangar', x: 220, y: 54, w: 60, h: 40, label: l('Hangar de jatinhos', 'Private-jet hangar'), tip: l('Fretar avião para a turnê: poupa tempo e cansaço, custa caro.', 'Charter a plane for the tour: saves time and fatigue, costs a lot.'), panel: 'hangar' });
  if (holo) sp({ id: 'holo', x: 22, y: 30, w: 56, h: 40, label: l('Estúdio de holograma', 'Hologram studio'), tip: l('Um show transmitido para várias cidades ao mesmo tempo (menos receita e fama que o ao vivo).', 'A show broadcast to several cities at once (less revenue and fame than live).'), panel: 'holo' });
  sp({ id: 'news', x: 220, y: 100, w: 24, h: 34, label: l('Banca de jornal', 'Newsstand'), tip: l('As notícias da aviação e do transporte.', 'Aviation and transport news.'), panel: 'news',
    badge: news.some((f) => f.w >= s.week - 8) ? { text: l('nova', 'new'), level: 'info' } : undefined });
  if (events) sp({ id: 'events', x: 84, y: 54, w: 28, h: 30, label: l('Imigração', 'Immigration'), tip: fmtL(l('{n} visto(s) negado(s) nas turnês dos seus artistas.', '{n} visa(s) denied on your acts\' tours.'), { n: events }), panel: 'events', badge: { text: String(events), level: 'normal', sym: '!' } });
  return { W: AIR_W31, H: AIR_H31, year: s.year, era, name: AIRPORT_NAME31[era], hangar, holo, dep, arr, crowd, imports, atSea, news, events, spots };
}
