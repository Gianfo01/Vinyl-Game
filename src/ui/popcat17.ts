// Rodada 17 — popups (pessoa, artista, selo) com muitas abas ficam em DOIS níveis: categorias (Resumo,
// Carreira, Vida, Negócios, Mundo e imprensa, Mais) e, dentro de cada uma, as abas de sempre. Nada é removido:
// uma aba que ninguém classificou cai em "Mais". Puro (sem DOM): testável.

import { l, type L } from '../data/world';

export const CATS17: { id: string; label: L; icon: string }[] = [
  { id: 'sum', label: l('Resumo', 'Summary'), icon: 'compass' },
  // r18 (item 12): Integrantes e Música saem de "Carreira" e viram categorias próprias
  { id: 'members', label: l('Integrantes', 'Members'), icon: 'fans' },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc' },
  { id: 'career', label: l('Carreira', 'Career'), icon: 'trophy' },
  { id: 'life', label: l('Vida e relações', 'Life and relationships'), icon: 'heart' },
  { id: 'biz', label: l('Negócios e direitos', 'Business and rights'), icon: 'contract' },
  { id: 'world', label: l('Mundo e imprensa', 'World and press'), icon: 'newspaper' },
  { id: 'more', label: l('Mais', 'More'), icon: 'key' },
];

const BY: Record<string, string> = {
  // resumo
  overview: 'sum', pan17: 'sum', attrs: 'sum', profile: 'sum', p13: 'sum', perfil: 'sum', fame15: 'sum', fame15p: 'sum', fame: 'sum', standing: 'sum', hype12: 'sum', why12: 'sum', persona13: 'sum',
  // integrantes (r18): quem está na banda, formação ao longo do tempo, tempo de cada um e a dinâmica do grupo
  members: 'members', lineup16: 'members', dyn18: 'members',
  // música (r18): obra gravada
  disco: 'music', songs: 'music', releases: 'music', era8: 'music', retro: 'music', story12: 'music', records13: 'music',
  // carreira
  history: 'career', career: 'career', inst: 'career', train: 'career', path16: 'career', cap14: 'career', leader10: 'career',
  arc12: 'career', traj18: 'career', labels13: 'career', reach17: 'career', fan15: 'career', identity8: 'career', playbook8: 'career',
  roster: 'career', awards: 'career', market: 'career', r_ceo: 'career', succ16: 'career', org12: 'career',
  // vida
  mood: 'life', rel: 'life', rel8: 'life', circle8: 'life', bonds9: 'life', bonds9p: 'life', fam: 'life', fam16: 'life', life: 'life', life13: 'life', life13p: 'life',
  belief: 'life', belief16: 'life', soul9: 'life', kin15: 'life',
  // negócios
  contract: 'biz', deleg16: 'biz', mgr14: 'biz', rights8: 'biz', sync15: 'biz', dispute15: 'biz', ai8: 'biz', stakes8: 'biz', capital: 'biz', money: 'biz', rivals12: 'biz',
  relics13: 'biz', loans7: 'biz', you: 'biz', dossier8: 'biz',
  // mundo e imprensa
  facts17: 'world', world17: 'world', press17: 'world', lendas9: 'world', scenes: 'world', scene12: 'world', hist15: 'world', news17: 'world', crime17: 'world',
};

export const catOf17 = (tabId: string): string => BY[tabId.replace(/^x-/, '')] ?? 'more';

/** Agrupa abas por categoria na ordem de CATS17 (só categorias com abas). */
export function groupTabs17<T extends { id: string }>(items: T[]): { cat: (typeof CATS17)[number]; items: T[] }[] {
  return CATS17.map((cat) => ({ cat, items: items.filter((x) => catOf17(x.id) === cat.id) })).filter((g) => g.items.length);
}

/** A partir de quantas abas vale usar categorias. */
export const CAT_MIN17 = 8;
