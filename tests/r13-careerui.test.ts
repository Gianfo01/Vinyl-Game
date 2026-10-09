// Rodada 13 — menu e telas seguem as carreiras escolhidas; agência/estúdio fundáveis da própria página.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { careerDef, careers, dropCareer, startCareer } from '../src/sim/sys/careers12';
import { hasAgency } from '../src/sim/sys/tour12';
import { bookingCandidates, foundCost, foundVenture, funds } from '../src/sim/sys/ventures9';
import { money, post } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { CAREER_NAV, defaultHome, navGroups, type NavGroup } from '../src/ui/careernav13';

const BASE: NavGroup[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['desk', 'plan', 'inbox', 'goals', 'diary'] },
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth'] },
];
const all = (gs: NavGroup[]) => gs.flatMap((g) => g.areas).sort();

describe('menu por carreira (r13)', () => {
  it('dono de selo vê o menu clássico; nada some em nenhuma carreira', () => {
    expect(navGroups(['label'], BASE)).toEqual(BASE);
    for (const id of Object.keys(CAREER_NAV)) {
      const gs = navGroups([id], BASE);
      expect(all(gs)).toEqual(all(BASE));
      expect(new Set(all(gs)).size).toBe(all(BASE).length); // sem duplicatas
      expect(gs[0].id).toBe('home');
    }
  });
  it('promotor/agente: turnês primeiro, telas de selo em "Outras atividades"', () => {
    const gs = navGroups(['booking'], BASE);
    expect(gs[1].career).toBe('booking');
    expect(gs[1].areas[0]).toBe('tour12');
    expect(gs[1].label.pt).toBe('Turnês e agenciamento');
    const other = gs.find((g) => g.id === 'other13')!;
    expect(other.areas).toContain('hq');
    expect(other.areas).toContain('releases');
    expect(gs.at(-1)!.id).toBe('you');
    expect(defaultHome(['booking']).area).toBe('tour12');
  });
  it('empresário puro: gestão primeiro; selo + agente: destaque dentro do grupo', () => {
    const gs = navGroups(['manager'], BASE);
    expect(gs[1].areas[0]).toBe('management');
    expect(defaultHome(['manager']).area).toBe('management');
    const mix = navGroups(['label', 'booking'], BASE);
    const v = mix.find((g) => g.id === 'ventures')!;
    expect(v.areas[0]).toBe('tour12');
    expect(v.career).toBe('booking');
    expect(mix.map((g) => g.id)).toEqual(BASE.map((g) => g.id));
    expect(defaultHome(['label', 'booking']).area).toBe('desk');
  });
  it('trocar de carreira no meio da partida muda o menu na hora', () => {
    const s = createGame(defaultConfig('r13-nav', { startYear: 1975 }));
    expect(navGroups(careers(s).active, BASE)).toEqual(BASE);
    expect(startCareer(s, 'booking').ok).toBe(true);
    expect(dropCareer(s, 'label').ok).toBe(true);
    expect(navGroups(careers(s).active, BASE)[1].career).toBe('booking');
    // o botão "Abrir" da carreira leva à página certa (antes ia para a visão geral de Empreendimentos)
    expect(careerDef('booking')!.area).toBe('tour12');
    expect(careerDef('studio')!.area).toBe('studio12');
    expect(careerDef('venue')!.area).toBe('shows');
    expect(careerDef('venue')!.status!(s)!.pt).toContain('Sem casa');
  });
  it('agente: fundar agência explica o custo e libera clientes', () => {
    const s = createGame(defaultConfig('r13-ag', { startYear: 1975 }));
    const cost = foundCost(s, 'booking');
    s.player.cash = cost - 1;
    expect(foundVenture(s, 'booking', 'label')?.pt).toContain('Sem dinheiro');
    post(s, 'r13', money(s, 100000), 'business', 'teste');
    expect(funds(s, 'label')).toBeGreaterThanOrEqual(cost);
    expect(foundVenture(s, 'booking', 'label')).toBeNull();
    expect(hasAgency(s)).toBeTruthy();
    expect(bookingCandidates(s, hasAgency(s)!.id).length).toBeGreaterThan(0);
  });
});
