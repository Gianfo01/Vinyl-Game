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
import { CAREER_PAGE17, NAV17, ORDER17, groupOf17, navGroups17, resolve17 } from '../src/ui/nav17';
const ALL17 = [...NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas)), ...ORDER17.flatMap((id) => [CAREER_PAGE17[id].area, ...CAREER_PAGE17[id].absorbs])];
/** Rodada 17: o menu do jogo é navGroups17 (os navGroups antigos ficam só para saves/compatibilidade). */
const menu17 = (active: string[]) => navGroups17({ active, pages: active, has: (a) => ALL17.includes(a), all: ALL17 });


const BASE: NavGroup[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['desk', 'plan', 'inbox', 'goals', 'diary'] },
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth'] },
];
const all = (gs: NavGroup[]) => gs.flatMap((g) => g.areas).sort();

describe('menu por carreira (r13)', () => {
  it('dono de selo vê o menu por função (r17); nada some em nenhuma carreira', () => {
    void navGroups; void BASE; void all; void CAREER_NAV;
    expect(menu17(['label']).map((g) => g.id)).toEqual(['home', 'company', 'artists', 'music', 'press', 'world', 'events', 'crime', 'you', 'more']);
    for (const id of ORDER17) {
      const flat = menu17([id]).flatMap((g) => g.areas);
      expect(new Set(flat).size).toBe(flat.length);
    }
  });
  it('promotor/agente: página exclusiva em Você; telas de selo em "Mais"', () => {
    const gs = menu17(['booking']);
    expect(groupOf17(gs, 'cp17-booking').id).toBe('you');
    const more = gs.find((g) => g.id === 'more')!;
    expect(more.areas).toContain('releases');
    expect(defaultHome(['booking']).area).toBe('tour12'); // a rota antiga cai na aba da página da carreira
    expect(resolve17('tour12', gs).area).toBe('cp17-booking');
  });
  it('empresário: Gestão vira aba da página do Empresário; selo + agente lado a lado em Você', () => {
    const gs = menu17(['manager']);
    expect(resolve17('management', gs)).toEqual({ area: 'cp17-manager', tab: ['cp17-manager', 'management'] });
    const mix = menu17(['label', 'booking']);
    const you = mix.find((g) => g.id === 'you')!;
    expect(you.areas).toContain('cp17-label');
    expect(you.areas).toContain('cp17-booking');
    expect(defaultHome(['label', 'booking']).area).toBe('desk');
  });
  it('trocar de carreira no meio da partida muda o menu na hora', () => {
    const s = createGame(defaultConfig('r13-nav', { startYear: 1975 }));
    expect(menu17(careers(s).active).find((g) => g.id === 'more')!.areas).not.toContain('releases');
    expect(startCareer(s, 'booking').ok).toBe(true);
    expect(dropCareer(s, 'label').ok).toBe(true);
    const gs = menu17(careers(s).active);
    expect(groupOf17(gs, 'cp17-booking').id).toBe('you');
    expect(gs.find((g) => g.id === 'you')!.areas).not.toContain('cp17-label');
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
