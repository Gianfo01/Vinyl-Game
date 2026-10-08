// Conquistas (inspiração: CD Market): vendas, turnês, prêmios, formatos, processos, lojas, digital,
// palco e festivais; algumas escondidas até serem desbloqueadas.

import { l, type L } from '../../../data/world';
import { registerSimHook } from '../../ext4';
import type { GameState } from '../../types';
import { fmtL, notify, remember } from '../../util';
import { liveOf } from './state';

export interface AchievementDef {
  id: string;
  cat: 'sales' | 'tours' | 'awards' | 'formats' | 'legal' | 'stores' | 'digital' | 'live' | 'company';
  name: L;
  desc: L;
  hidden?: boolean;
  icon: string;
  check: (s: GameState) => boolean;
}

const mine = (s: GameState) => Object.values(s.releases).filter((r) => r.owner === 'player' || s.acts[r.actId]?.playerBand);
const cnt = (s: GameState, k: string) => liveOf(s).counters[k] ?? 0;
const hasFormatSale = (s: GameState, f: string) => mine(s).some((r) => r.formats.includes(f as never) && r.totalUnits > 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_release', cat: 'sales', icon: 'disc', name: l('Primeiro sulco', 'First groove'), desc: l('Lance o primeiro disco.', 'Release your first record.'), check: (s) => s.player.stats.releases >= 1 },
  { id: 'units_100k', cat: 'sales', icon: 'chart-up', name: l('Cem mil cópias', 'A hundred thousand'), desc: l('Um lançamento passa de 100 mil unidades.', 'A release tops 100,000 units.'), check: (s) => mine(s).some((r) => r.totalUnits >= 100000) },
  { id: 'units_1m', cat: 'sales', icon: 'platinum-disc', name: l('Milhão', 'The million'), desc: l('Um lançamento passa de 1 milhão.', 'A release tops 1 million.'), check: (s) => mine(s).some((r) => r.totalUnits >= 1000000) },
  { id: 'top10', cat: 'sales', icon: 'chart-up', name: l('Top 10', 'Top 10'), desc: l('Entre no top 10.', 'Reach the top 10.'), check: (s) => s.player.stats.top10s >= 1 },
  { id: 'number1', cat: 'sales', icon: 'star', name: l('Número 1', 'Number 1'), desc: l('Chegue ao topo da parada.', 'Top the chart.'), check: (s) => s.player.stats.number1s >= 1 },
  { id: 'number1_x5', cat: 'sales', icon: 'star', name: l('Fábrica de sucessos', 'Hit factory'), desc: l('Cinco números 1.', 'Five number 1s.'), check: (s) => s.player.stats.number1s >= 5 },
  { id: 'gold', cat: 'sales', icon: 'gold-disc', name: l('Disco de ouro', 'Gold record'), desc: l('Primeira certificação de ouro.', 'First gold certification.'), check: (s) => s.player.stats.gold >= 1 },
  { id: 'platinum', cat: 'sales', icon: 'platinum-disc', name: l('Platina', 'Platinum'), desc: l('Primeira platina.', 'First platinum.'), check: (s) => s.player.stats.platinum >= 1 },
  { id: 'award', cat: 'awards', icon: 'trophy', name: l('Gramofone na estante', 'Gramophone on the shelf'), desc: l('Ganhe um prêmio.', 'Win an award.'), check: (s) => s.player.stats.awards >= 1 },
  { id: 'award_x10', cat: 'awards', icon: 'trophy', name: l('Galeria de troféus', 'Trophy cabinet'), desc: l('Dez prêmios.', 'Ten awards.'), check: (s) => s.player.stats.awards >= 10 },
  { id: 'hall', cat: 'awards', icon: 'trophy', name: l('Hall dos Ecos', 'Hall of Echoes'), desc: l('Um artista seu entra no Hall dos Ecos.', 'One of your acts enters the Hall of Echoes.'), check: (s) => (s.hallOfFame ?? []).some((h) => s.acts[h.actId]?.owner === 'player') },
  { id: 'fmt_shellac', cat: 'formats', icon: 'disc', name: l('Era da goma-laca', 'Shellac era'), desc: l('Venda em 78 rpm.', 'Sell on 78 rpm.'), check: (s) => hasFormatSale(s, 'shellac') },
  { id: 'fmt_lp', cat: 'formats', icon: 'disc', name: l('Long play', 'Long play'), desc: l('Venda um LP.', 'Sell an LP.'), check: (s) => hasFormatSale(s, 'lp') },
  { id: 'fmt_cassette', cat: 'formats', icon: 'cassette', name: l('Fita no bolso', 'Tape in the pocket'), desc: l('Venda em cassete.', 'Sell on cassette.'), check: (s) => hasFormatSale(s, 'cassette') },
  { id: 'fmt_cd', cat: 'formats', icon: 'cd', name: l('Disco a laser', 'Laser disc'), desc: l('Venda em CD.', 'Sell on CD.'), check: (s) => hasFormatSale(s, 'cd') },
  { id: 'fmt_all', cat: 'formats', icon: 'sparkle', name: l('Colecionador de formatos', 'Format collector'), desc: l('Venda em cinco formatos diferentes.', 'Sell on five different formats.'), hidden: true, check: (s) => new Set(mine(s).filter((r) => r.totalUnits > 0).flatMap((r) => r.formats)).size >= 5 },
  { id: 'digital_dl', cat: 'digital', icon: 'stream', name: l('Baixe aqui', 'Download here'), desc: l('Venda em download.', 'Sell downloads.'), check: (s) => hasFormatSale(s, 'download') },
  { id: 'digital_stream', cat: 'digital', icon: 'stream', name: l('Na nuvem', 'In the cloud'), desc: l('Tenha música no streaming.', 'Have music on streaming.'), check: (s) => hasFormatSale(s, 'streaming') },
  { id: 'legal_first', cat: 'legal', icon: 'gavel', name: l('Nos tribunais', 'In court'), desc: l('Enfrente seu primeiro processo.', 'Face your first lawsuit.'), check: (s) => (s.lawsuits ?? []).length >= 1 },
  { id: 'legal_won', cat: 'legal', icon: 'gavel', name: l('Veredito favorável', 'Favorable verdict'), desc: l('Vença um processo.', 'Win a lawsuit.'), hidden: true, check: (s) => (s.lawsuits ?? []).some((x) => x.stage === 'won') },
  { id: 'store_merch', cat: 'stores', icon: 'shirt', name: l('Banca de camisetas', 'Shirt stand'), desc: l('Tenha uma linha de merch.', 'Have a merch line.'), check: (s) => Object.keys(s.merch ?? {}).length >= 1 },
  { id: 'store_branch', cat: 'stores', icon: 'building', name: l('Filial aberta', 'Branch office'), desc: l('Abra uma filial em outra cidade.', 'Open a branch in another city.'), check: (s) => (s.branches ?? []).length >= 1 },
  { id: 'tour_first', cat: 'tours', icon: 'tour-bus', name: l('Pé na estrada', 'On the road'), desc: l('Complete uma turnê.', 'Finish a tour.'), check: (s) => s.tours.some((t) => t.status === 'done' && (s.acts[t.actId]?.owner === 'player' || s.acts[t.actId]?.playerBand)) || cnt(s, 'shows') >= 5 },
  { id: 'shows_50', cat: 'tours', icon: 'tour-bus', name: l('Cinquenta noites', 'Fifty nights'), desc: l('Toque 50 shows de turnê.', 'Play 50 tour shows.'), check: (s) => cnt(s, 'shows') >= 50 },
  { id: 'people_1m', cat: 'tours', icon: 'fans', name: l('Um milhão de ingressos', 'A million tickets'), desc: l('Um milhão de pessoas nos seus shows.', 'A million people at your shows.'), check: (s) => cnt(s, 'showPeople') >= 1000000 },
  { id: 'sellout', cat: 'live', icon: 'fire', name: l('Esgotado em minutos', 'Sold out in minutes'), desc: l('Esgote um show em minutos.', 'Sell out a show in minutes.'), check: (s) => cnt(s, 'sellouts') >= 1 },
  { id: 'legendary', cat: 'live', icon: 'sparkle', name: l('Noite lendária', 'Legendary night'), desc: l('Faça um show ao vivo com energia 85+.', 'Play a live show with 85+ energy.'), hidden: true, check: (s) => cnt(s, 'legendaryShows') >= 1 },
  { id: 'great_10', cat: 'live', icon: 'star', name: l('Empolgação garantida', 'Guaranteed thrills'), desc: l('Dez shows com empolgação 75+.', 'Ten shows with 75+ excitement.'), check: (s) => cnt(s, 'greatShows') >= 10 },
  { id: 'fest_first', cat: 'live', icon: 'flag', name: l('Meu festival', 'My festival'), desc: l('Realize a primeira edição do seu festival.', 'Hold your festival\'s first edition.'), check: (s) => cnt(s, 'festEditions') >= 1 },
  { id: 'fest_100k', cat: 'live', icon: 'fans', name: l('Cidade de barracas', 'Tent city'), desc: l('Cem mil pessoas nos seus festivais.', 'A hundred thousand people at your festivals.'), check: (s) => cnt(s, 'festPeople') >= 100000 },
  { id: 'fest_disaster', cat: 'live', icon: 'skull', name: l('Lama, choro e manchete', 'Mud, tears and headlines'), desc: l('Sobreviva a um desastre no seu festival.', 'Survive a disaster at your festival.'), hidden: true, check: (s) => cnt(s, 'festDisasters') >= 1 },
  { id: 'venue', cat: 'company', icon: 'house', name: l('Casa própria', 'A house of our own'), desc: l('Compre uma casa de shows.', 'Buy a venue.'), check: (s) => cnt(s, 'venues') >= 1 },
  { id: 'residency', cat: 'live', icon: 'clock', name: l('Temporada no cassino', 'Casino season'), desc: l('Cumpra seis meses de residência.', 'Complete six months of residency.'), check: (s) => cnt(s, 'residencyMonths') >= 6 },
  { id: 'mega', cat: 'live', icon: 'globe', name: l('Para o mundo inteiro', 'For the whole world'), desc: l('Toque num megaevento beneficente.', 'Play a global benefit mega-event.'), check: (s) => cnt(s, 'megaEvents') >= 1 },
  { id: 'medal_gold', cat: 'company', icon: 'trophy', name: l('Ouro no cenário', 'Scenario gold'), desc: l('Conquiste ouro num cenário histórico.', 'Win gold in a historical scenario.'), hidden: true, check: (s) => liveOf(s).scenario?.done?.medal === 'gold' },
  { id: 'decades', cat: 'company', icon: 'calendar', name: l('Três décadas', 'Three decades'), desc: l('Mantenha o selo aberto por 30 anos.', 'Keep the label open for 30 years.'), check: (s) => s.year - s.config.startYear >= 30 },
];
export const achById = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x])) as Record<string, AchievementDef>;

/** Verifica conquistas; devolve as novas. */
export function checkAchievements(s: GameState): string[] {
  const lv = liveOf(s);
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (lv.ach[a.id] !== undefined) continue;
    let ok = false;
    try {
      ok = a.check(s);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    lv.ach[a.id] = s.week;
    out.push(a.id);
    notify(s, fmtL(l('Conquista: {n}!', 'Achievement: {n}!'), { n: a.name }), 'good');
    remember(s, 'achievement', fmtL(l('Conquista desbloqueada: {n}.', 'Achievement unlocked: {n}.'), { n: a.name }));
  }
  if (out.length) {
    lv.achNew.push(...out);
    if (lv.achNew.length > 20) lv.achNew.splice(0, lv.achNew.length - 20);
  }
  return out;
}

registerSimHook('month', 'live-achievements', (s) => {
  checkAchievements(s);
});
