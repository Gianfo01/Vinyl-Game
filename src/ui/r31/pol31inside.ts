// R31 · onda 4 (POL) — exemplos dos INTERIORES (I+S: lugares da cidade, submundo, delegacia; ART2: objetos novos)
// para a checagem automática: a pintura pura do interior (paintInterior27) com gente no palco, no balcão e no salão.
import { l } from '../../data/world';
import type { Person27 } from '../../sim/sys/place27';
import { INTERIOR_KINDS27, geom27, interior27, paintInterior27, type IKind27 } from '../pixel/interior27';
import { drawProps31, type ArtItem31 } from '../pixel/props31';
import { registerPol31 } from './pol31';

const P = (name: string, x: Partial<Person27> = {}): Person27 => ({ name, role: l('-', '-'), ...x });
const KINDS: [IKind27, string?][] = [...INTERIOR_KINDS27.map((k) => [k] as [IKind27]), ['facade', 'restaurant'], ['facade', 'club'], ['facade', 'warehouse'], ['backroom'], ['baile'], ['police'], ['market']];
const ART: ArtItem31[] = [{ t: 'jukebox', x: 0.5 }, { t: 'charts', x: 0.62 }, { t: 'phone', x: 0.92 }];
registerPol31('inside31', () => KINDS.flatMap(([k, v]) => [1935, 1978, 2022].map((year, yi) => {
  const people = [P('Você', { you: true }), P('Heitor Lacerda', { staff: true, job: 0 }), P('Moacir Quintela', { staff: true, job: 1 }), P('Banda Um', { actId: 'a1' }), P('Banda Dois', { actId: 'a1' }), P('Tereza Valente'), P('Ivo Peixoto', k === 'police' ? { cell: true } : {})];
  const m = interior27(k, year, people.length, v);
  const G = geom27(600);
  const d = paintInterior27(m, people, { minW: 600, city: 'rio', name: 'Lugar', seed: `pol${yi}`, extra: yi === 1 ? (g, seed) => drawProps31(g, ART, G, seed) : undefined });
  return { id: `inside31:${k}${v ? `-${v}` : ''}:${year}`, W: d.W, H: d.H, back: d.px, front: d.front, floors: [d.fy], surfaces: d.stages, texts: [],
    people: d.placed.map((x) => ({ x: x.x, y: x.y, behind: x.behind })),
    spots: d.placed.map((x, i) => ({ id: `p${i}`, x: x.x - 7, y: x.y - 31, w: 14, h: 32, label: l(x.who.name, x.who.name), tip: l('-', '-'), go: { panel: 'x' } })) };
})));
