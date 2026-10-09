// Rodada 14 (polimento) — helpers puros de texto: locativo com artigo ("no bar da esquina", não
// "em Bar da esquina") e nomes legíveis para etiquetas de censura/famílias de gênero (nada de ids crus).

import { FAMILIES, GENRES, l, type L } from '../../data/world';

const FEM14 = new Set(['boate', 'discoteca', 'igreja', 'academia', 'jam', 'praça', 'lan', 'casa']);
const low = (x: string) => (x.length > 1 && x[1] === x[1].toLowerCase() ? x[0].toLowerCase() + x.slice(1) : x);

/** "Bar da esquina" → "no bar da esquina" / "at the corner bar"; "Em casa" → "em casa" / "at home". */
export function atPlace14(name: L): L {
  if (/^em /i.test(name.pt)) return l(low(name.pt), low(name.en));
  const first = name.pt.split(/[\s,/]/)[0].toLowerCase();
  return l(`${FEM14.has(first) ? 'na' : 'no'} ${low(name.pt)}`, /^at /i.test(name.en) ? low(name.en) : `at the ${low(name.en)}`);
}

const CENSOR14: Record<string, L> = {
  political: l('política', 'politics'), sexual: l('sexo', 'sex'), drugs: l('drogas', 'drugs'), religious: l('religião', 'religion'),
  foreign: l('música estrangeira', 'foreign music'), protest: l('canção de protesto', 'protest songs'), violence: l('violência', 'violence'),
  western: l('influência ocidental', 'Western influence'), decadent: l('"decadência"', '"decadence"'), regional_language: l('línguas regionais', 'regional languages'),
};

/** Nome legível de uma etiqueta de censura, família ou gênero; nunca devolve o id com sublinhado. */
export function tagName14(id: string): L {
  return CENSOR14[id] ?? FAMILIES.find((f) => f.id === id)?.name ?? GENRES.find((x) => x.id === id)?.name ?? l(id.replace(/_/g, ' '));
}
