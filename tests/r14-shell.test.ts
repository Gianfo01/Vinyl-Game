// Rodada 14 — casca do app: cockpit (mesa + caixa + sede) e um grupo de menu por carreira.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { CAREER_NAV, type NavGroup } from '../src/ui/careernav13';
import { alias14 } from '../src/ui/careernav14';
import { CAREER_PAGE17, NAV17, ORDER17, groupOf17, navGroups17, resolve17 } from '../src/ui/nav17';
const ALL17 = [...NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas)), ...ORDER17.flatMap((id) => [CAREER_PAGE17[id].area, ...CAREER_PAGE17[id].absorbs])];
/** Rodada 17: o menu do jogo é navGroups17 (os navGroups antigos ficam só para saves/compatibilidade). */
const menu17 = (active: string[]) => navGroups17({ active, pages: active, has: (a) => ALL17.includes(a), all: ALL17 });

import { groupOf16 as groupOf14, navGroups16 as navGroups14 } from '../src/ui/careernav16'; // rodada 16: menu revisado

const BASE: NavGroup[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['cockpit', 'plan', 'goals', 'diary'] },
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth'] },
];
const uniq = (gs: NavGroup[]) => [...new Set(gs.flatMap((g) => g.areas))].sort();
const ALL = uniq(BASE);

describe('casca r14 (menu r17)', () => {
  it('mesa e caixa de entrada abrem o cockpit', () => {
    expect(alias14('desk')).toBe('cockpit');
    expect(alias14('inbox')).toBe('cockpit');
    expect(alias14('hq')).toBe('hq');
    expect(menu17(['label'])[0].areas[0]).toBe('cockpit');
    void navGroups14; void groupOf14; void BASE; void uniq; void ALL; void CAREER_NAV;
  });
  it('toda carreira ativa ganha a SUA página em Você › Carreiras; nada duplica; telas de selo fora da carreira em Mais', () => {
    for (const id of ORDER17) {
      const gs = menu17([id]);
      const flat = gs.flatMap((g) => g.areas);
      expect(flat.length).toBe(new Set(flat).size);
      expect(gs[0].id).toBe('home');
      expect(groupOf17(gs, CAREER_PAGE17[id].area).id).toBe('you');
      if (id !== 'label' && id !== 'musician') expect(gs.find((g) => g.id === 'more')!.areas).toContain('releases');
    }
  });
  it('várias carreiras: cada uma com sua página exclusiva (telas antigas viram abas dela)', () => {
    const gs = menu17(['label', 'booking', 'festival', 'publisher']);
    expect(gs.map((g) => g.id).slice(0, 4)).toEqual(['home', 'company', 'artists', 'music']);
    const you = gs.find((g) => g.id === 'you')!;
    for (const id of ['label', 'booking', 'festival', 'publisher']) expect(you.areas).toContain(CAREER_PAGE17[id].area);
    expect(resolve17('publishing16', gs).area).toBe('cp17-publisher');
    expect(resolve17('tour12', gs).area).toBe('cp17-booking');
    expect(groupOf17(gs, 'festivals').id).toBe('events');
    expect(groupOf17(gs, 'ventures').id).toBe('you');
    expect(groupOf17(gs, 'careers').id).toBe('you');
  });
});
