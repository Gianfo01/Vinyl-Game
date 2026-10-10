// Rodada 16 — menus revistos (cada negócio com a sua página, sem duplicatas, 2 níveis) e 3 habilidades iniciais.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { l } from '../src/data/world';
import { CAREER_NAV, type NavGroup } from '../src/ui/careernav13';
import { HOME_EXTRA16, ORDER16, groupOf16, navGroups16 } from '../src/ui/careernav16';
import { careerDef } from '../src/sim/sys/careers12';
import { PAGE16 } from '../src/ui/pages16';
import { CAREER_PAGE17, NAV17, ORDER17, ALIAS17, groupOf17, navGroups17, resolve17 } from '../src/ui/nav17';
const ALL17 = [...NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas)), ...ORDER17.flatMap((id) => [CAREER_PAGE17[id].area, ...CAREER_PAGE17[id].absorbs])];
/** Rodada 17: o menu do jogo é navGroups17 (os navGroups antigos ficam só para saves/compatibilidade). */
const menu17 = (active: string[]) => navGroups17({ active, pages: active, has: (a) => ALL17.includes(a), all: ALL17 });

import { START_SKILL_POINTS, skills, validStartSkills } from '../src/sim/sys/persona';

const BASE: NavGroup[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['cockpit', 'plan', 'goals', 'diary'] },
  { id: 'label', label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'company', 'finance', 'business', 'identity', 'team', 'industry'] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', areas: ['artists', 'market', 'directory', 'people', 'management', 'managers14', 'producers15'] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', areas: ['project', 'creation', 'studio', 'releases', 'catalog', 'shows', 'media'] },
  { id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', areas: ['ventures', 'careers', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16'] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', areas: ['world', 'charts', 'labels', 'movements', 'lendas'] },
  { id: 'fame', label: l('Prêmios e eventos', 'Awards and events'), icon: 'trophy', areas: ['festivals', 'awards', 'rockhall', 'critics'] },
  { id: 'you', label: l('Você', 'You'), icon: 'star', areas: ['you', 'personal', 'wealth', 'night14'] },
];
const ALL = [...new Set(BASE.flatMap((g) => g.areas))].sort();

/** Todas as combinações de até 3 carreiras + todas juntas. */
function combos(): string[][] {
  const ids = ORDER16, out: string[][] = [ids];
  for (let a = 0; a < ids.length; a++) { out.push([ids[a]]); for (let b = a + 1; b < ids.length; b++) { out.push([ids[a], ids[b]]); for (let c = b + 1; c < ids.length; c++) out.push([ids[c], ids[a], ids[b]]); } }
  return out;
}

describe('menus r16', () => {
  it('(legado navGroups16, mantido para compatibilidade) cada combinação: nada some, nada duplica, 2 níveis', () => {
    for (const act of combos()) {
      const gs = navGroups16(act, BASE);
      const flat = gs.flatMap((g) => g.areas);
      expect([...flat].sort()).toEqual(ALL);
      expect(flat.length).toBe(new Set(flat).size);
      expect(gs[0].id).toBe('home');
      expect(gs.at(-1)!.id).toBe('you');
      for (const x of HOME_EXTRA16) expect(gs[0].areas).toContain(x);
      for (const g of gs) {
        expect(g.areas.length).toBeGreaterThan(0);
        if (g.sections) expect(g.sections.flatMap((s) => s.areas)).toEqual(g.areas); // seções = só títulos, sem 3º nível
        if (g.sections) for (const s of g.sections) expect(s.areas.length).toBeGreaterThan(0);
      }
      for (const id of act) if (id !== 'label') {
        const own = gs.find((g) => g.career === id)!;
        expect(own.areas[0]).toBe(CAREER_NAV[id].home.area);
        expect(groupOf16(gs, CAREER_NAV[id].home.area).id).toBe(own.id);
        expect(own.home?.tab).toBeUndefined(); // rótulo do menu = título da página
      }
    }
  });
  it('r17: cada negócio abre a página exclusiva da carreira; Festivais é a página do mundo; Empreendimentos é a carteira', () => {
    expect(Object.values(CAREER_NAV).some((d) => d.home.area === 'ventures' || d.areas.includes('ventures'))).toBe(false);
    expect(PAGE16.festival.area).toBe('cp17-festival');
    for (const [id, area] of [['publisher', 'publishing16'], ['media', 'outlets16'], ['platform', 'platform16']]) {
      expect(careerDef(id)!.area).toBe(area);
      expect(PAGE16[id as 'publisher'].area).toBe(area);
      expect(ALIAS17[area][0]).toBe(CAREER_PAGE17[id].area); // a rota antiga abre a aba da página da carreira
    }
    const gs = menu17(['label']);
    expect(groupOf17(gs, 'festivals').id).toBe('events');
    expect(gs.find((g) => g.id === 'more')!.sections!.find((s) => s.label.pt === 'Editora musical')!.areas).toEqual(['publishing16']);
    const both = menu17(['booking', 'festival']);
    expect(groupOf17(both, 'cp17-festival').id).toBe('you');
    expect(groupOf17(both, 'festivals').id).toBe('events');
    void resolve17;
  });
  it('3 habilidades no começo do jogo', () => {
    expect(START_SKILL_POINTS).toBe(3);
    expect(validStartSkills(['cr_ear', 'cr_hook', 'cr_arr', 'net_door', 'cr_polish'])).toHaveLength(3);
    const s = createGame(defaultConfig('r16-sk', { character: { name: 'A', age: 30, background: 'producer', career: 'producer', role: 'producer', traits: [], points: {}, skills: ['cr_ear', 'cr_hook', 'cr_arr', 'cr_polish', 'cr_radio'] } }));
    expect(skills(s).owned).toHaveLength(3);
    expect(skills(s).points).toBe(0);
    expect(skills(s).earned).toBe(3);
  });
});
