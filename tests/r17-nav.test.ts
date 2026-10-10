// Rodada 17 — reforma de todo o menu: grupos por função, página exclusiva por carreira em Você, sem duplicatas,
// ícones e teclas únicos, popups por categoria e experiência que alivia a agenda.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { careers, timeLoad } from '../src/sim/sys/careers12';
import '../src/sim/sys/exp17';
import { expRelief17 } from '../src/sim/sys/exp17';
import { ALIAS17, CAREER_PAGE17, ICON17, KEY17, NAV17, ORDER17, areaOfKey17, groupOf17, navGroups17, pushRecent17, resolve17, sectionOf17, togglePin17 } from '../src/ui/nav17';
import { CATS17, catOf17, groupTabs17 } from '../src/ui/popcat17';
import { ICON_NAMES } from '../src/ui/pixel/icons';
import { ICON17_NAMES } from '../src/ui/pixel/icons17';

const TREE = NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas));
const ABS = ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs);
const PAGES = ORDER17.map((id) => CAREER_PAGE17[id].area);
const ALL = [...TREE, ...ABS, ...PAGES];
const menu = (active: string[], pages = active, extra: Partial<Parameters<typeof navGroups17>[0]> = {}) =>
  navGroups17({ active, pages, has: (a) => ALL.includes(a) || (extra.all ?? []).includes(a), all: ALL, ...extra });

function combos(): string[][] {
  const ids = ORDER17, out: string[][] = [ids];
  for (let a = 0; a < ids.length; a++) { out.push([ids[a]]); for (let b = a + 1; b < ids.length; b++) out.push([ids[a], ids[b]]); }
  return out;
}

describe('menu r17', () => {
  it('toda combinação de carreiras: nada some, nada duplica, carreiras em Você, telas absorvidas viram abas', () => {
    for (const act of combos()) {
      const gs = menu(act);
      const flat = gs.flatMap((g) => g.areas);
      expect(flat.length).toBe(new Set(flat).size); // sem duplicatas
      const absorbedNow = act.flatMap((id) => CAREER_PAGE17[id].absorbs);
      for (const a of ALL) {
        if (absorbedNow.includes(a)) { expect(flat).not.toContain(a); expect(resolve17(a, gs).area).toBe(CAREER_PAGE17[act.find((id) => CAREER_PAGE17[id].absorbs.includes(a))!].area); }
        else if (PAGES.includes(a)) expect(flat.includes(a)).toBe(act.some((id) => CAREER_PAGE17[id].area === a));
        else expect(flat).toContain(a); // alcançável (no grupo dele ou em Mais)
      }
      const you = gs.find((g) => g.id === 'you')!;
      for (const id of act) expect(groupOf17(gs, CAREER_PAGE17[id].area).id).toBe('you');
      expect(you.areas).toContain('careers');
      expect(gs.flatMap((g) => g.areas)).not.toContain('desk');
      // no máximo 2 níveis; seções curtas
      for (const g of gs) if (g.sections) { expect(g.sections.flatMap((s) => s.areas)).toEqual(g.areas); if (!g.other) for (const s of g.sections) expect(s.areas.length).toBeLessThanOrEqual(act.length > 5 && s.label.pt === 'Suas carreiras' ? 10 : 5); }
    }
  });
  it('Empreendimentos e Carreiras moram só em Você (sem a duplicata Início × Empreendimentos)', () => {
    const gs = menu(['label']);
    expect(groupOf17(gs, 'careers').id).toBe('you');
    expect(groupOf17(gs, 'ventures').id).toBe('you');
    expect(gs.find((g) => g.id === 'home')!.areas).toEqual(['cockpit', 'plan', 'goals', 'diary']);
    expect(groupOf17(gs, 'festivals').id).toBe('events');
    expect(groupOf17(gs, 'crime').id).toBe('crime');
    expect(sectionOf17(gs.find((g) => g.id === 'music')!, 'shows')?.en).toBe('Stage');
  });
  it('sem selo nem banda, telas de selo descem para Mais; páginas de carreira inativa também', () => {
    const gs = menu(['manager']);
    const more = gs.find((g) => g.id === 'more')!;
    expect(more.areas).toContain('market');
    expect(more.areas).toContain('releases');
    expect(more.areas).toContain('tour12'); // agente/promotor sem página: alcançável em Mais
    expect(groupOf17(gs, 'cp17-manager').id).toBe('you');
    expect(resolve17('management', gs)).toEqual({ area: 'cp17-manager', tab: ['cp17-manager', 'management'] });
    expect(resolve17('tour12', gs)).toEqual({ area: 'tour12' });
  });
  it('páginas novas de outras frentes entram no grupo sugerido (ou em Mais), nunca no Início', () => {
    const gs = menu(['label'], ['label'], { all: [...ALL, 'novo17', 'solto17'], hint: { novo17: 'music' } });
    expect(groupOf17(gs, 'novo17').id).toBe('music');
    expect(groupOf17(gs, 'solto17').id).toBe('more');
  });
  it('ícones únicos e existentes; teclas únicas (; = Submundo)', () => {
    const groupIcons = NAV17.map((g) => g.icon);
    const areaIcons = Object.values(ICON17);
    const allIcons = [...groupIcons, ...areaIcons, 'key'];
    expect(new Set(allIcons).size).toBe(allIcons.length);
    const known = new Set<string>([...ICON_NAMES, ...ICON17_NAMES]);
    for (const x of allIcons) expect(known.has(x)).toBe(true);
    for (const a of ALL) expect(ICON17[a]).toBeTruthy();
    const keys = Object.values(KEY17);
    expect(new Set(keys).size).toBe(keys.length);
    expect(areaOfKey17(';')).toBe('crime');
    expect(areaOfKey17('G')).toBe('cp17-manager');
    for (const a of Object.keys(ALIAS17)) expect(KEY17[a]).toBeUndefined();
  });
  it('fixados e recentes', () => {
    expect(togglePin17(['a'], 'b')).toEqual(['b', 'a']);
    expect(togglePin17(['a', 'b'], 'a')).toEqual(['b']);
    expect(togglePin17(['1', '2', '3'], '4', 3)).toEqual(['4', '1', '2']);
    expect(pushRecent17(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });
  it('popups: abas em categorias, nenhuma some', () => {
    const tabs = ['overview', 'pan17', 'members', 'disco', 'facts17', 'x-world17', 'contract', 'mood', 'qualquer'].map((id) => ({ id }));
    const g = groupTabs17(tabs);
    expect(g.flatMap((x) => x.items.map((i) => i.id)).sort()).toEqual(tabs.map((x) => x.id).sort());
    expect(g[0].cat.id).toBe('sum');
    expect(catOf17('x-world17')).toBe('world');
    expect(catOf17('qualquer')).toBe('more');
    expect(CATS17.at(-1)!.id).toBe('more');
  });
  it('experiência no ofício alivia a agenda da carreira', () => {
    const s = createGame(defaultConfig('r17-nav', { startYear: 1975, careers: { main: ['label', 'manager'], origin: 'musician', ambition: 'legacy' } }));
    expect(careers(s).active).toContain('manager');
    const x = s.x4 as unknown as { noto14: { v: Record<string, number> } };
    x.noto14.v.manager = 0;
    const l0 = timeLoad(s);
    x.noto14.v.manager = 40; // Nacional
    expect(expRelief17(s, 'manager')).toBeGreaterThan(0);
    expect(timeLoad(s)).toBeLessThan(l0);
    x.noto14.v.manager = 90; // Lenda
    expect(timeLoad(s)).toBeLessThan(l0 - expRelief17(s, 'manager') + 0.2);
  });
});
