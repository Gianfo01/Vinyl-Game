// R33 · INT-2 — galeria (não entra no jogo): desenha os interiores pelo caminho do jogo (`drawInterior27`, com os bonecos) e o
// prédio no mapa isométrico (`buildingSprite18` com a arte `mapArt` do registro), para conferir o padrão e tirar os prints.
import '../../sim/worldgen'; // ordem de carga dos sistemas
import { buildingSprite18 } from '../pixel/campus18px';
import { ARTK31, type Art31 } from '../pixel/pred31';
import type { Bld18 } from '../../sim/sys/campus18';
import type { Person27 } from '../../sim/sys/place27';
import { l } from '../../data/world';
import { INT2, int2Exists } from '../../sim/r33/int2';
import { BIZ31 } from '../../sim/r31/city31';
import { INT2_H, INT2_W, SHOP2_IDS, drawInt2, int2Scene, int2ShopScene, type Int2Scene } from './int2px';

const person = (n: string, role: string, extra: Partial<Person27> = {}): Person27 => ({ name: n, role: l(role, role), ...extra });
const crew = (year: number): Person27[] => [person('Ana Souza', 'Gerente', { staff: true, job: 0 }), person('Beto Lima', 'Equipe', { staff: true, job: 1 }), person('Caio Reis', 'Visitante'), person('Dora Alves', 'Visitante'), person('Edu Pires', 'Artista', { actId: `a${year}` })];
const h2 = (root: HTMLElement, t: string): void => { const h = document.createElement('h2'); h.textContent = t; root.append(h); };
function room(root: HTMLElement, s: Int2Scene, year: number, scale = 3): void {
  const c = document.createElement('canvas');
  drawInt2(c, s, crew(year), { city: 'london', seed: s.id });
  c.style.width = `${INT2_W * scale}px`; c.style.height = `${INT2_H * scale}px`; root.append(c);
}
/** O prédio no mapa isométrico, com a arte do tipo de `mapArt` (sem arte própria ainda no PRED). */
function iso(root: HTMLElement, id: string, year: number, scale = 3): void {
  const t = INT2.find((x) => x.id === id)!, art = t.mapArt as Art31;
  const b: Bld18 = { id: `int2:${id}`, kind: ARTK31[art], name: t.name.pt, city: 'london', zone: 'campus', lvl: 3, st: 'open', since: year, sy: year };
  const sp = buildingSprite18(b, { gx: 0, gy: 0, w: t.lot.w, d: t.lot.d }, year, 7, t.tag, { art });
  const c = document.createElement('canvas'); c.width = sp.c.width; c.height = sp.c.height;
  const g = c.getContext('2d')!; g.drawImage(sp.c, 0, 0); g.drawImage(sp.lc, 0, 0);
  c.style.cssText = `width:${c.width * scale}px;image-rendering:pixelated;background:#2a2e3a;margin:2px 10px`; root.append(c);
}
const SHOP_YEAR: Record<string, number> = { sheet: 1905, piano: 1925, telegraph: 1910, gramophone: 1930, tailor: 1950, instruments: 1962, cinema: 1950, radio_tv: 1962, records: 1962, diner: 1962, jukebox_bar: 1962, hifi: 1980, arcade: 1985, video: 1990, cd_mega: 1995, pager: 1998, lan: 2005, phones: 2025, games: 2025, vinyl: 2025, cowork: 2025, holo: 2035, bakery: 1962 };
export async function gallery(root: HTMLElement, s: string, id: string, year: number): Promise<void> {
  if (s === 'place') { h2(root, `${id} ${year}`); iso(root, id, year); room(root, int2Scene(id as never, year), year); }
  if (s === 'shop') { h2(root, `${id} ${year}`); room(root, int2ShopScene(id, year), year); }
  if (s === 'shops') for (const b of SHOP2_IDS) { const d = BIZ31.find((x) => x.id === b); const y = Math.min(Math.max(year, d?.from ?? 1900), (d?.to ?? 2040) - 1); h2(root, `${b} ${y}`); room(root, int2ShopScene(b, y), y, 2); }
  if (s === 'sheet') { const t = INT2.find((x) => x.id === id)!; for (const y of [1889, 1962, 2025, 2035]) if (int2Exists(t, t.cities?.[0] ?? 'london', y)) { h2(root, `${t.name.pt} ${y}`); iso(root, id, y, 2); room(root, int2Scene(t.id, y), y, 3); } }
  if (s === 'lojas') for (const b of SHOP2_IDS) { const y = SHOP_YEAR[b] ?? 1962; h2(root, `${b} ${y}`); room(root, int2ShopScene(b, y), y, 2); }
  if (s === 'all') for (const t of INT2) if (int2Exists(t, t.cities?.[0] ?? 'london', year)) { h2(root, `${t.id} ${year}`); room(root, int2Scene(t.id, year), year, 2); }
}
