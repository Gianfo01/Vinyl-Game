// Bancada visual das cenas (cinemáticas, campus, marcos e mapa) para comparar antes/depois do passe de estilo.
// Uso: `npx vite` e abrir /tools/arte-cenas/index.html?year=1975&theme=dark&still=1
import '../../src/styles.css';
import '../../src/ui/app'; // mesma ordem de carga do jogo (evita ciclo de import)
import { drawFrame18 } from '../../src/ui/pixel/cine18';
import { buildScene18, drawFrame18 as drawCampus, env18, MW, MH } from '../../src/ui/pixel/campus18px';
import { LANDMARKS19, type LmShape } from '../../src/data/landmarks19';
import { drawLandmark19 } from '../../src/ui/pixel/landmarks19px';
import { Px, C, mix, shade } from '../../src/ui/pixel/px';
import { WorldMap } from '../../src/ui/map';
import { H, W } from '../../src/ui/pixel/places/kit';
import type { Frame18 } from '../../src/sim/sys/cine18';
import type { Bld18 } from '../../src/sim/sys/campus18';
import type { GameState } from '../../src/sim/types';

const q = new URLSearchParams(location.search);
const year = Number(q.get('year') ?? 1975);
const T = q.get('t') ? Number(q.get('t')) : 1.3;
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;
if (q.get('still')) document.documentElement.classList.add('reduced-motion');
const only = q.get('view');
const s = { persons: {} } as unknown as GameState;
const root = document.getElementById('root')!;
const sec = (title: string) => { const d = document.createElement('section'); const h = document.createElement('h3'); h.textContent = `${title} — ${year}`; d.append(h); root.append(d); return d; };
const cv = (w: number, h: number, scale = 3) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.style.width = `${w * scale}px`; c.style.imageRendering = 'pixelated'; return c; };

const L = (pt: string) => ({ pt, en: pt }) as unknown as Frame18['caption'];
const fr = (o: Partial<Frame18>): Frame18 => ({ id: 'x', place: 'awards', year, actors: [], props: [], fx: [], crowd: { n: 0.8, mood: 'cheer' }, caption: L(''), ms: 4000, ...o });
const FRAMES: [string, Frame18][] = [
  ['tapete', fr({ place: 'awards', props: ['carpet', 'rope', 'cameras'], fx: ['flash'], actors: [{ x: 128, y: 120, seed: 'a', mark: true, mood: 'joy' } as never], crowd: { n: 0.6, mood: 'cheer' } })],
  ['palco', fr({ place: 'awards', props: ['podium', 'trophy', 'mic', 'screen'], fx: ['spot', 'envelope', 'confetti'], env: { cat: L('Disco do ano'), name: 'Banda X', win: true }, actors: [{ x: 128, y: 96, seed: 'b', mark: true } as never] })],
  ['estádio', fr({ place: year < 1965 ? 'venue_theatre' : 'venue_stadium', props: ['lightsticks', 'barrier'], fx: ['lights', 'pyro', 'smoke'], crowd: { n: 1, mood: 'wild', signs: ['TE AMO', 'BIS!'] }, actors: [{ x: 110, y: 82, seed: 'c', pose: 'play' } as never, { x: 146, y: 82, seed: 'd', pose: 'play' } as never] })],
  ['funeral', fr({ place: 'funeral', props: ['casket', 'flowers', 'candles', 'umbrellas'], fx: ['rain'], crowd: { n: 0.7, mood: 'grief' }, actors: [{ x: 128, y: 80, seed: 'e', ghost: 1 } as never] })],
  ['tribunal', fr({ place: 'court', props: ['gavel', 'table', 'chart', 'protest'], fx: ['snow'], crowd: { n: 0.6, mood: 'boo', signs: ['FORA', 'JUSTIÇA'] } })],
  ['assinatura', fr({ place: 'boardroom', props: ['pen', 'glass'], fx: ['flicker'], actors: [{ x: 110, y: 100, seed: 'f' } as never, { x: 150, y: 100, seed: 'g', ghost: 2 } as never] })],
];

if (!only || only === 'cine') {
  const d = sec('Cenas');
  for (const [n, f] of FRAMES) {
    const c = cv(W, H, 2); c.title = n;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    try { drawFrame18(ctx, s, f, T); } catch (e) { console.error(n, e); }
    d.append(c);
  }
}

if (!only || only === 'campus') {
  const d = sec('Campus');
  const b = (id: string, kind: Bld18['kind'], lot: number, lvl: number, st: Bld18['st'] = 'open', extra: Partial<Bld18> = {}): Bld18 => ({ id, kind, name: id, city: 'rio', zone: 'campus', lvl, st, since: year, sy: year, lot, ...extra });
  const bs = [b('hq', 'hq', 0, 4), b('st', 'studio', 2, 3), b('v', 'venue', 4, 3), b('pl', 'plant', 6, 2), b('sg', 'sign', 1, 1), b('md', 'media', 5, 2, 'building', { prog: 0.6 }), b('sc', 'school', 3, 2, 'renovating'), b('pk', 'store', 7, 2, 'damaged')];
  const lots = new Map(bs.map((x) => [x.id, x.lot!] as [string, number]));
  const lms = LANDMARKS19.filter((l) => l.city === 'rio' || l.city === 'new_york').filter((l) => l.from <= year && (!l.to || l.to > year)).slice(0, 4);
  const sc = buildScene18(bs, lots, env18(year, 6, -22, 'rio'), [{ k: 'fans', at: 'v' }, { k: 'press', at: 'hq' }, { k: 'smoke', at: 'pk' }], 7, 'REC', [], lms);
  for (const night of [0, 0.9]) { const c = cv(MW, MH, 2); const ctx = c.getContext('2d')!; drawCampus(ctx, sc, T, night); d.append(c); }
  const shapes: LmShape[] = ['statue', 'cable', 'bridge', 'tbridge', 'arch', 'spire', 'twin', 'clock', 'lattice', 'needle', 'shell', 'stadium', 'dome', 'hall', 'cathedral', 'wall', 'pyramid', 'minaret', 'pagoda', 'sign', 'gate', 'colosseum', 'castle', 'wheel', 'obelisk', 'temple', 'studio'];
  const p = new Px(shapes.length * 60, 70);
  const sky = C('#a4c2dc'); const far = mix(sky, C('#46385a'), 0.55);
  p.rect(0, 0, p.w, p.h, sky);
  shapes.forEach((sh, i) => drawLandmark19(p, sh, 30 + i * 60, 64, { body: far, hi: mix(far, C('#e8ecf0'), 0.35), dark: shade(far, -0.25), lamp: C('#ff6a50') }));
  const lc = p.canvas(); lc.style.width = `${p.w * 2}px`; lc.style.imageRendering = 'pixelated'; d.append(lc);
}

if (!only || only === 'map') {
  const d = sec('Mapa');
  const box = document.createElement('div'); box.style.width = '1100px'; d.append(box);
  const m = new WorldMap({
    getYear: () => year, getMonth: () => 6, mode: 'tour', selected: ['rio'], route: ['rio', 'new_york', 'london', 'tokyo'],
    cities: () => [{ id: 'rio' }, { id: 'new_york', badge: '12k' }, { id: 'london' }, { id: 'tokyo' }, { id: 'paris', locked: true }, { id: 'lagos', color: 'var(--accent)' }],
    onCityClick: () => {},
    overlays: () => [{ kind: 'bubble', city: 'london', value: 0.6, color: 'var(--accent)' }, { kind: 'arc', from: 'paris', to: 'lagos', color: 'var(--good)', dashed: true }, { kind: 'icon', city: 'paris', icon: 'hq' }, { kind: 'icon', city: 'lagos', icon: 'festival' }],
  });
  box.append(m.element);
}
