// Rodada 14 — cada profissão tem o seu grupo no topo do menu (sem esconder carreiras em submenus).
// Carreiras ativas aparecem como grupos próprios, na ordem escolhida; o selo usa os grupos clássicos
// (Selo, Artistas, Música). Tudo o que pertence a carreiras inativas desce para "Outras atividades",
// recolhido e com um título por carreira. Nada some: cada área continua em exatamente um grupo
// (exceto a página de Empreendimentos, que aparece em cada carreira que mora nela, com a aba certa).
// "Mesa do mês" e "Caixa de entrada" viraram o Cockpit (sys/cockpit14): os ids antigos redirecionam.

import { l, type L } from '../data/world';
import { CAREER_NAV, type CareerHome, type NavGroup } from './careernav13';

export interface NavSection14 { label: L; areas: string[] }
export interface NavGroup14 extends NavGroup { home?: CareerHome; sections?: NavSection14[]; other?: boolean }

/** Áreas antigas que agora abrem o Cockpit (atalhos 1 e E continuam valendo). */
export const ALIAS14: Record<string, string> = { desk: 'cockpit', inbox: 'cockpit' };
export const alias14 = (area: string): string => ALIAS14[area] ?? area;

/** Grupos clássicos que formam a carreira de selo. */
const LABEL_GROUPS = ['label', 'artists', 'music'];
const GENERIC = ['world', 'fame'];
const ORDER = ['label', 'musician', 'manager', 'booking', 'festival', 'venue', 'studio', 'publisher', 'media', 'platform'];

export function navGroups14(active0: string[], base: NavGroup[]): NavGroup14[] {
  const active = active0.filter((id) => CAREER_NAV[id]);
  if (!active.length) active.push('label');
  const used = new Set<string>();
  const take = (areas: string[]) => { const out = areas.filter((a) => !used.has(a)); out.forEach((a) => used.add(a)); return out; };
  const by = (id: string) => base.find((g) => g.id === id);
  const home0 = by('home') ?? { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: ['cockpit'] };
  const home: NavGroup14 = { ...home0, areas: take([...home0.areas.map(alias14), 'careers']) };
  const careerAreas = (id: string): string[] => (id === 'label' ? LABEL_GROUPS.flatMap((g) => by(g)?.areas ?? []) : CAREER_NAV[id].areas);
  const out: NavGroup14[] = [home];
  for (const id of active) {
    if (id === 'label') {
      for (const gid of LABEL_GROUPS) { const g = by(gid); const areas = g ? take(g.areas) : []; if (g && areas.length) out.push({ ...g, areas, career: 'label' }); }
      continue;
    }
    const d = CAREER_NAV[id];
    const areas = take(d.areas);
    if (d.home.tab && !areas.includes(d.home.area)) areas.unshift(d.home.area); // Empreendimentos com a aba da carreira
    out.push({ id: `c14-${id}`, label: d.label, icon: d.icon, areas, career: id, home: d.home });
  }
  const generic = GENERIC.map(by).filter((g): g is NavGroup => !!g).map((g) => ({ ...g, areas: take(g.areas) })).filter((g) => g.areas.length);
  const youG = by('you');
  const you = youG ? { ...youG, areas: take(youG.areas) } : null;
  // carreiras inativas: um título por carreira dentro de "Outras atividades"
  // primeiro cada carreira inativa garante a própria casa (ex.: Turnês para o agente), depois o resto
  const inactive = ORDER.filter((x) => !active.includes(x));
  const homes = inactive.map((id) => (id === 'label' || CAREER_NAV[id].home.tab ? [] : take([CAREER_NAV[id].home.area])));
  const sections: NavSection14[] = [];
  inactive.forEach((id, i) => {
    const areas = [...homes[i], ...take(careerAreas(id))];
    if (areas.length) sections.push({ label: id === 'label' ? l('Selo', 'Label') : CAREER_NAV[id].label, areas });
  });
  const rest = take(base.flatMap((g) => g.areas).map(alias14));
  if (rest.length) sections.push({ label: l('Mais', 'More'), areas: rest });
  const other: NavGroup14[] = sections.length ? [{ id: 'other14', label: l('Outras atividades', 'Other activities'), icon: 'bank', areas: sections.flatMap((x) => x.areas), sections, other: true }] : [];
  return [...out, ...generic, ...other, ...(you && you.areas.length ? [you] : [])];
}

/** Grupo da área atual; páginas com abas por carreira (Empreendimentos) seguem a aba aberta. */
export function groupOf14(gs: NavGroup14[], area: string, tab?: (key: string) => string | undefined): NavGroup14 {
  const a = alias14(area);
  return gs.find((g) => g.home?.tab && g.home.area === a && tab?.(g.home.tab[0]) === g.home.tab[1])
    ?? gs.find((g) => g.areas.includes(a)) ?? gs[0];
}
