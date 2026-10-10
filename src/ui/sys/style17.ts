// Rodada 17 — etiqueta de estilo (gênero da música) com a cor da família. Módulo-folha (sem ciclos).
import { FAMILIES, genreById, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { genreName, pill } from '../common';

export function stylePill17(g: string | undefined): HTMLElement | null {
  if (!g || !genreById[g]) return null;
  const fam = FAMILIES.find((f) => f.id === genreById[g].family);
  const el = pill(genreName(g), 'style17');
  if (fam) el.setAttribute('style', `border-color:hsl(${fam.hue} 55% 50%);color:hsl(${fam.hue} 60% 42%)`);
  el.title = t(l('Estilo da música', 'Song style'));
  return el;
}
