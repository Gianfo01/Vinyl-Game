// Rodada 17 — etiqueta de estilo (gênero da música) com a cor da família. Módulo-folha (sem ciclos).
import { FAMILIES, genreById, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { genreName, pill } from '../common';

export function stylePill17(g: string | undefined): HTMLElement | null {
  if (!g || !genreById[g]) return null;
  const fam = FAMILIES.find((f) => f.id === genreById[g].family);
  const el = pill(genreName(g), 'style17');
  // r27 (J): só o matiz da família; clareza e saturação vêm do tema (ui27.css) — antes 1,9:1 no escuro
  if (fam) el.setAttribute('style', `--fam-h:${fam.hue}`);
  el.title = t(l('Estilo da música', 'Song style'));
  return el;
}
