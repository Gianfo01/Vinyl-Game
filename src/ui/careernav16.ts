// Rodada 16 — revisão da árvore de menus. Cada carreira aponta para a SUA página (Festivais, Editora,
// Veículos de mídia, Plataforma), sem a antiga página compartilhada de Empreendimentos com abas por carreira.
// Regras: no máximo 2 níveis (grupo → área); cada área em exatamente um grupo (sem duplicatas); a casa de
// cada carreira ativa é reservada antes das outras (duas carreiras não brigam pela mesma página); o rótulo
// no menu é o título da área (= migalha); Carreiras e Empreendimentos (a carteira) ficam no Início, iguais em
// qualquer combinação. Áreas que a época esconde (visible) somem do menu e seções vazias não aparecem.

import { l } from '../data/world';
import { CAREER_NAV, type NavGroup } from './careernav13';
import { alias14, type NavGroup14, type NavSection14 } from './careernav14';

const LABEL_GROUPS = ['label', 'artists', 'music'];
const GENERIC = ['world', 'fame'];
export const ORDER16 = ['label', 'musician', 'manager', 'booking', 'festival', 'venue', 'studio', 'publisher', 'media', 'platform'];
/** Sempre no Início, depois das áreas do grupo: o painel de carreiras e a carteira de negócios. */
export const HOME_EXTRA16 = ['careers', 'ventures'];

export function navGroups16(active0: string[], base: NavGroup[]): NavGroup14[] {
  const active = active0.filter((id) => CAREER_NAV[id]);
  if (!active.length) active.push('label');
  const used = new Set<string>();
  const take = (areas: string[]) => { const out = areas.map(alias14).filter((a, i, xs) => !used.has(a) && xs.indexOf(a) === i); out.forEach((a) => used.add(a)); return out; };
  const by = (id: string) => base.find((g) => g.id === id);
  const home0 = by('home') ?? { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['cockpit'] };
  const home: NavGroup14 = { ...home0, areas: take([...home0.areas, ...HOME_EXTRA16]) };
  // casas das carreiras ativas primeiro (ex.: Festivais para o dono de festival mesmo se o agente também quer)
  const homes = new Map(active.filter((id) => id !== 'label').map((id) => [id, take([CAREER_NAV[id].home.area])]));
  const out: NavGroup14[] = [home];
  for (const id of active) {
    if (id === 'label') {
      for (const gid of LABEL_GROUPS) { const g = by(gid); const areas = g ? take(g.areas) : []; if (g && areas.length) out.push({ ...g, areas, career: 'label' }); }
      continue;
    }
    const d = CAREER_NAV[id];
    const areas = [...homes.get(id)!, ...take(d.areas)];
    if (areas.length) out.push({ id: `c14-${id}`, label: d.label, icon: d.icon, areas, career: id, home: { area: d.home.area } });
  }
  const generic = GENERIC.map(by).filter((g): g is NavGroup => !!g).map((g) => ({ ...g, areas: take(g.areas) })).filter((g) => g.areas.length);
  const youG = by('you');
  const you = youG ? { ...youG, areas: take(youG.areas) } : null;
  const inactive = ORDER16.filter((x) => !active.includes(x));
  const ihomes = inactive.map((id) => (id === 'label' ? [] : take([CAREER_NAV[id].home.area])));
  const sections: NavSection14[] = [];
  inactive.forEach((id, i) => {
    // selo inativo: um título por grupo clássico (Selo, Artistas, Música), não um bloco único com tudo
    if (id === 'label') for (const gid of LABEL_GROUPS) { const g = by(gid); const areas = g ? take(g.areas) : []; if (g && areas.length) sections.push({ label: g.label, areas }); }
    else { const areas = [...ihomes[i], ...take(CAREER_NAV[id].areas)]; if (areas.length) sections.push({ label: CAREER_NAV[id].label, areas }); }
  });
  const rest = take(base.flatMap((g) => g.areas));
  if (rest.length) sections.push({ label: l('Mais', 'More'), areas: rest });
  const other: NavGroup14[] = sections.length ? [{ id: 'other14', label: l('Outras atividades', 'Other activities'), icon: 'bank', areas: sections.flatMap((x) => x.areas), sections, other: true }] : [];
  return [...out, ...generic, ...other, ...(you && you.areas.length ? [you] : [])];
}

/** Grupo da área atual (cada área mora em um só grupo). */
export function groupOf16(gs: NavGroup14[], area: string): NavGroup14 {
  const a = alias14(area);
  return gs.find((g) => g.areas.includes(a)) ?? gs[0];
}
