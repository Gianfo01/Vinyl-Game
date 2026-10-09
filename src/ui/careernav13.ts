// Rodada 13 — o menu se adapta às carreiras ativas (sem DOM: testável). O dono de gravadora vê o menu
// clássico; quem não tem selo como atividade principal vê primeiro os grupos da própria carreira (rótulo
// próprio), e as telas típicas de selo descem para "Outras atividades". Nada some: só muda a ordem,
// o destaque e o agrupamento. Trocar de carreira no meio da partida muda o menu no próximo desenho.

import { l, type L } from '../data/world';

export interface NavGroup { id: string; label: L; icon: string; areas: string[]; career?: string }
export interface CareerHome { area: string; tab?: [string, string] }

export const CAREER_NAV: Record<string, { label: L; icon: string; areas: string[]; home: CareerHome }> = {
  label: { label: l('Selo', 'Label'), icon: 'building', areas: ['hq', 'artists', 'market', 'releases'], home: { area: 'desk' } },
  manager: { label: l('Gestão de artistas', 'Artist management'), icon: 'handshake', areas: ['management', 'directory', 'people', 'market', 'tour12'], home: { area: 'management' } },
  booking: { label: l('Turnês e agenciamento', 'Tours & booking'), icon: 'tour-bus', areas: ['tour12', 'shows', 'festivals', 'directory'], home: { area: 'tour12' } },
  festival: { label: l('Seu festival', 'Your festival'), icon: 'star', areas: ['ventures', 'shows', 'festivals', 'directory'], home: { area: 'ventures', tab: ['ventures9', 'festival'] } },
  venue: { label: l('Sua casa de shows', 'Your venue'), icon: 'mic', areas: ['shows', 'tour12', 'directory'], home: { area: 'shows' } },
  studio: { label: l('Estúdio e produção', 'Studio & production'), icon: 'cd', areas: ['studio12', 'studio', 'project', 'creation'], home: { area: 'studio12' } },
  publisher: { label: l('Editora e catálogo', 'Publishing & catalog'), icon: 'note', areas: ['ventures', 'catalog', 'creation', 'directory'], home: { area: 'ventures', tab: ['ventures9', 'publisher'] } },
  media: { label: l('Seus veículos', 'Your outlets'), icon: 'radio', areas: ['ventures', 'media', 'charts', 'critics'], home: { area: 'ventures', tab: ['ventures9', 'media'] } },
  platform: { label: l('Sua plataforma', 'Your platform'), icon: 'globe', areas: ['ventures', 'charts', 'catalog', 'industry'], home: { area: 'ventures', tab: ['ventures9', 'platform'] } },
  musician: { label: l('Sua banda', 'Your band'), icon: 'guitar', areas: ['artists', 'project', 'creation', 'studio', 'releases', 'shows', 'people'], home: { area: 'artists' } },
};

/** Grupos que continuam iguais em qualquer carreira (mundo, prêmios, você). */
const GENERIC = new Set(['world', 'fame', 'you']);

/** Menu para as carreiras ativas (na ordem em que foram escolhidas). `base` = menu clássico de selo. */
export function navGroups(active: string[], base: NavGroup[]): NavGroup[] {
  const others = active.filter((id) => id !== 'label' && CAREER_NAV[id]);
  if (active.includes('label') || !others.length) {
    // dono de selo: menu clássico; as outras carreiras ativas sobem dentro do grupo e ganham destaque
    const hot = new Set(others.flatMap((id) => [CAREER_NAV[id].home.area, ...CAREER_NAV[id].areas.slice(0, 1)]));
    return base.map((g) => {
      const mine = g.areas.filter((a) => hot.has(a));
      if (!mine.length || g.id === 'home') return g;
      return { ...g, areas: [...mine, ...g.areas.filter((a) => !hot.has(a))], career: others.find((id) => g.areas.includes(CAREER_NAV[id].home.area)) ?? g.career };
    });
  }
  const home = base.find((g) => g.id === 'home') ?? { id: 'home', label: l('Início', 'Home'), icon: 'calendar', areas: [] };
  const used = new Set(home.areas);
  const out: NavGroup[] = [home];
  for (const id of others) {
    const d = CAREER_NAV[id];
    const areas = d.areas.filter((a) => !used.has(a));
    areas.forEach((a) => used.add(a));
    if (areas.length) out.push({ id: `c13-${id}`, label: d.label, icon: d.icon, areas, career: id });
  }
  if (out.length > 1 && !used.has('careers')) { out[1] = { ...out[1], areas: [...out[1].areas, 'careers'] }; used.add('careers'); }
  const generic = base.filter((g) => GENERIC.has(g.id)).map((g) => ({ ...g, areas: g.areas.filter((a) => !used.has(a)) }));
  generic.forEach((g) => g.areas.forEach((a) => used.add(a)));
  const rest = base.filter((g) => g.id !== 'home' && !GENERIC.has(g.id)).flatMap((g) => g.areas).filter((a) => !used.has(a));
  const you = generic.find((g) => g.id === 'you');
  return [...out, ...generic.filter((g) => g !== you && g.areas.length),
    ...(rest.length ? [{ id: 'other13', label: l('Outras atividades', 'Other activities'), icon: 'bank', areas: rest }] : []),
    ...(you ? [you] : [])];
}

/** Tela inicial ao abrir a partida: a mesa para o selo; a casa da carreira principal para os demais. */
export function defaultHome(active: string[]): CareerHome {
  if (!active.length || active.includes('label')) return { area: 'desk' };
  return CAREER_NAV[active[0]]?.home ?? { area: 'desk' };
}
