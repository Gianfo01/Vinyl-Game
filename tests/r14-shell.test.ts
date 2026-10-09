// Rodada 14 — casca do app: cockpit (mesa + caixa + sede) e um grupo de menu por carreira.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { CAREER_NAV, type NavGroup } from '../src/ui/careernav13';
import { alias14, groupOf14, navGroups14 } from '../src/ui/careernav14';

const BASE: NavGroup[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['cockpit', 'plan', 'goals', 'diary'] },
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth'] },
];
const uniq = (gs: NavGroup[]) => [...new Set(gs.flatMap((g) => g.areas))].sort();
const ALL = uniq(BASE);

describe('casca r14', () => {
  it('mesa e caixa de entrada abrem o cockpit', () => {
    expect(alias14('desk')).toBe('cockpit');
    expect(alias14('inbox')).toBe('cockpit');
    expect(alias14('hq')).toBe('hq');
    expect(navGroups14(['label'], BASE)[0].areas[0]).toBe('cockpit');
  });
  it('toda carreira ativa vira grupo de topo; nada some; inativas em "Outras atividades"', () => {
    for (const id of Object.keys(CAREER_NAV)) {
      const gs = navGroups14([id], BASE);
      expect(uniq(gs)).toEqual(ALL);
      const flat = gs.flatMap((g) => g.areas);
      expect(flat.filter((a) => a !== 'ventures').length).toBe(new Set(flat.filter((a) => a !== 'ventures')).size);
      expect(gs[0].id).toBe('home');
      expect(gs[1].career).toBe(id);
      expect(gs.at(-1)!.id).toBe('you');
      const other = gs.find((g) => g.id === 'other14');
      if (id !== 'label') expect(other!.sections!.some((s) => s.label.pt === 'Selo')).toBe(true);
    }
  });
  it('várias carreiras: cada uma com seu grupo, Empreendimentos com a aba certa', () => {
    const gs = navGroups14(['label', 'booking', 'festival', 'publisher'], BASE);
    const ids = gs.map((g) => g.id);
    expect(ids.slice(0, 4)).toEqual(['home', 'label', 'artists', 'music']);
    expect(ids).toContain('c14-booking');
    const fest = gs.find((g) => g.id === 'c14-festival')!, pub = gs.find((g) => g.id === 'c14-publisher')!;
    expect(fest.areas[0]).toBe('ventures');
    expect(pub.areas).toContain('ventures');
    expect(gs.find((g) => g.id === 'c14-booking')!.areas[0]).toBe('tour12');
    expect(groupOf14(gs, 'ventures', () => 'publisher').id).toBe('c14-publisher');
    expect(groupOf14(gs, 'ventures', () => 'festival').id).toBe('c14-festival');
    expect(groupOf14(gs, 'desk').id).toBe('home');
    // o painel de carreiras fica no início, acessível em qualquer combinação
    expect(gs[0].areas).toContain('careers');
  });
});
