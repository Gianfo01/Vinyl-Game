// R31 · onda 4 (POL) — cenas que dependem do estado do jogo, para a checagem automática: casa da família Fossati e a
// praça (FOS) e as salas da sede com os objetos interativos (salas31 + ART2).
import { l } from '../../data/world';
import { paintFosHome31, paintFosSquare31 } from '../pixel/fos31px';
import { Px } from '../pixel/px';
import { homeModel31, squareModel31 } from './fos31model';
import { registerPol31, type PolScene31 } from './pol31';
import { SALAS31, salaModel31 } from './salas31model';
import { layout31, paintSala31 } from './salas31px';
import type { Spot31 } from './scene31model';

registerPol31('fos31', (s) => {
  const out: PolScene31[] = [];
  for (const [id, m, paint] of [['fos31:casa', homeModel31(s), paintFosHome31], ['fos31:praca', squareModel31(s), paintFosSquare31]] as const) {
    const d = paint(m);
    out.push({ id, W: m.W, H: m.H, back: d.px, floors: [d.fy], people: m.people.map((w) => ({ x: d.X(w.x), y: d.fy })), spots: m.spots, texts: [] });
  }
  return out;
});
registerPol31('salas31', (s) => SALAS31.flatMap((id) => {
  let m;
  try { m = salaModel31(s, id); } catch { return []; }
  const L = layout31(m);
  const px = paintSala31(m, L);
  const spots: Spot31[] = m.hots.filter((h) => L.hits[h.id]).map((h) => ({ id: h.id, ...L.hits[h.id], label: h.label, tip: h.tip, go: { panel: 'x' }, quiet: h.kind === 'person' }));
  const people = m.hots.filter((h) => h.fig).map((h) => { const r = L.hits[h.id], floor = m.id === 'team' ? h.pp?.n ?? 0 : 0; return { x: r.x + (r.w >> 1), y: L.fy(floor) - (h.fig!.lift ?? 0) }; });
  const floors = L.rooms.map((r) => L.fy(r.floor));
  const surfaces = m.hots.filter((h) => h.fig?.lift).map((h) => { const r = L.hits[h.id], floor = m.id === 'team' ? h.pp?.n ?? 0 : 0; return { x: r.x, w: r.w, y: L.fy(floor) - (h.fig!.lift ?? 0) }; });
  return [{ id: `salas31:${id}`, W: L.W, H: L.H, back: px, front: new Px(L.W, L.H), floors, surfaces, people, spots, texts: [] } as PolScene31];
}));
void l;
