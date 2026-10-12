// Rodada 25 — Pixel Studio: 6 seções (Sede, Pessoas, Projetos, Ao vivo, Mundo, Gestão), até 5 páginas
// "principais" por seção e o resto agrupado por tema; nada some em nenhuma combinação de carreiras.
// r27: o menu virou árvore (tudo visível); `top`/`more25` seguem como ordem de prioridade — ver r27-nav.test.ts.
import { describe, expect, it } from 'vitest';
import { ALIAS17, CAREER_PAGE17, NAV17, ORDER17, groupOf17, resolve17 } from '../src/ui/nav17';
import { CAREER_SECTION25, KNOWN25, SECTIONS25, SEDE25, TOP25, home25, more25, navGroups25, sectionIdOf25 } from '../src/ui/ps/nav25';
import { rank15 } from '../src/ui/navcore15';

const TREE17 = NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas));
const ABS = ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs);
const PAGES = ORDER17.map((id) => CAREER_PAGE17[id].area);
const OLD = ['identity', 'biz17', 'management', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16', 'shared18', 'artist18', 'tut18', 'agenda17'];
const ALL = [...new Set([...TREE17, ...ABS, ...PAGES, ...OLD])];
const menu = (active: string[], pages = active, extra: { all?: string[]; hint?: Record<string, string>; sede?: boolean } = {}) =>
  navGroups25({ active, pages, has: (a) => ALL.includes(a) || (extra.all ?? []).includes(a), all: [...ALL, ...(extra.all ?? [])], hint: extra.hint, sede: extra.sede });

function combos(): string[][] {
  const ids = ORDER17, out: string[][] = [ids, []];
  for (let a = 0; a < ids.length; a++) { out.push([ids[a]]); for (let b = a + 1; b < ids.length; b++) out.push([ids[a], ids[b]]); }
  return out;
}

describe('menu r25 (Pixel Studio)', () => {
  it('as 6 seções, na ordem, com rótulos pt/en', () => {
    expect(SECTIONS25.map((s) => s.label.pt)).toEqual(['Sede', 'Pessoas', 'Projetos', 'Ao vivo', 'Mundo', 'Gestão']);
    expect(menu(['label']).map((g) => g.id)).toEqual(['sede', 'people', 'projects', 'live', 'world', 'admin']);
  });
  it('toda combinação de carreiras: nada some, nada duplica, ≤5 principais, o resto por tema (r27: tudo na árvore)', () => {
    for (const act of combos()) {
      const gs = menu(act);
      expect(gs.length).toBe(6);
      const flat = gs.flatMap((g) => g.areas);
      expect(flat.length).toBe(new Set(flat).size);
      const absorbedNow = act.flatMap((id) => CAREER_PAGE17[id].absorbs);
      for (const a of ALL) {
        if (absorbedNow.includes(a)) { expect(flat).not.toContain(a); expect(resolve17(a, gs).area).toBe(CAREER_PAGE17[act.find((id) => CAREER_PAGE17[id].absorbs.includes(a))!].area); }
        else if (PAGES.includes(a)) expect(flat.includes(a)).toBe(act.some((id) => CAREER_PAGE17[id].area === a));
        else expect(flat).toContain(a);
      }
      for (const g of gs) {
        expect(g.top.length).toBeLessThanOrEqual(TOP25);
        expect(g.top.length).toBe(Math.min(TOP25, g.areas.length));
        const m = more25(g).flatMap((x) => x.areas);
        expect([...g.top, ...m].sort()).toEqual([...g.areas].sort());
        expect(g.sections!.flatMap((s) => s.areas)).toEqual(g.areas);
      }
      // a página de cada carreira ativa mora na seção certa e fica entre as visíveis
      for (const id of act) {
        const g = groupOf17(gs, CAREER_PAGE17[id].area);
        expect(g.id).toBe(CAREER_SECTION25[id]);
        expect((g as (typeof gs)[number]).top).toContain(CAREER_PAGE17[id].area);
      }
      expect(flat).not.toContain('desk');
    }
  });
  it('casas e lugares: Cockpit na Sede, Finanças em Gestão, Shows em Ao vivo, Paradas em Mundo', () => {
    const gs = menu(['label']);
    expect(home25(gs[0])).toBe('cockpit');
    expect(groupOf17(gs, 'finance').id).toBe('admin');
    expect(groupOf17(gs, 'shows').id).toBe('live');
    expect(groupOf17(gs, 'charts').id).toBe('world');
    expect(groupOf17(gs, 'artists').id).toBe('people');
    expect(groupOf17(gs, 'releases').id).toBe('projects');
    expect(sectionIdOf25('crime')).toBe('world');
    for (const a of TREE17) expect(KNOWN25.has(a)).toBe(true);
  });
  it('Sede com tela própria (slot25) abre nela; sem ela, Cockpit', () => {
    expect(menu(['label'], ['label'], { sede: true })[0].top[0]).toBe(SEDE25);
    expect(menu(['label'])[0].areas).not.toContain(SEDE25);
  });
  it('páginas novas de outras frentes entram na seção sugerida ou em Gestão', () => {
    const gs = menu(['label'], ['label'], { all: ['zz1', 'zz2'], hint: { zz1: 'music' } });
    expect(groupOf17(gs, 'zz1').id).toBe('projects');
    expect(groupOf17(gs, 'zz2').id).toBe('admin');
  });
  it('carreira sem selo: telas de selo continuam alcançáveis (no fim da própria seção)', () => {
    const gs = menu(['manager']);
    expect(groupOf17(gs, 'market').id).toBe('people');
    expect(gs.find((g) => g.id === 'people')!.top[0]).toBe('cp17-manager');
    expect(Object.keys(ALIAS17).length).toBeGreaterThan(0);
  });
  it('busca casa nome no outro idioma (alt)', () => {
    const r = rank15([{ label: 'Finanças', alt: 'Finance', kind: 'area' }, { label: 'Paradas', alt: 'Charts', kind: 'area' }], 'charts');
    expect(r.map((x) => x.label)).toEqual(['Paradas']);
  });
});
