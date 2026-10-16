// R31 · onda 5 (SALAS) — harness das salas NOVAS (salas5px) para as capturas "depois": mesmo elenco do "antes".
import '../../../src/sim/worldgen';
import { drawScene27, type Who27 } from '../../../src/ui/act27/scene27';
import { paintCompose5, paintStudio5, paintWar5, paintCrisis5, paintPress5, paintHeist5, type Sala5 } from '../../../src/ui/r31/salas5px';
import { paintRoad27 } from '../../../src/ui/act27/px27b';
const P = (id: string, role = 'vocal', born = 1950) => ({ id, role, born }) as Who27['p'];
const draw = (s: Sala5, y: number, ids: string[], roles: string[] = []) => { const cv = document.createElement('canvas');
  drawScene27(cv, s.back, y, s.spots.map((sp, i) => ({ p: P(ids[i] ?? 'x' + i, roles[i] ?? 'producer', y - 30), x: sp.x, y: sp.y, pose: sp.pose, dir: sp.dir })), s.front); return cv; };
const out: Record<string, (y: number) => HTMLCanvasElement> = {
  composicao: (y) => draw(paintCompose5(y, ['hook', 'lyric', 'harmony', 'rhythm'], 3, { city: 'rio' }), y, ['w0', 'w1', 'w2'], ['vocal', 'vocal', 'vocal']),
  estudio: (y) => draw(paintStudio5(y, true, 4, { city: 'rio', eng: true }), y, ['m0', 'm1', 'm2', 'm3', 'eng'], ['vocal', 'guitar', 'bass', 'drums', 'producer']),
  guerra: (y) => draw(paintWar5(y, { on: ['radio_plug', 'tv_show', 'music_video', 'web_forums', 'short_clips', 'press', 'street_team'], week: 3, weeks: 8, launchAt: 6, hype: 55, n: 3 }, { city: 'rio' }), y, ['s0', 's1', 's2']),
  crise: (y) => draw(paintCrisis5(y, 70, 8, 3, { city: 'rio' }), y, ['s0', 's1', 's2']),
  coletiva: (y) => draw(paintPress5(y, 'press', true, 40, { city: 'rio' }), y, ['lead', 'r1', 'r2', 'r3', 'r4'], ['vocal']),
  escandalo: (y) => draw(paintPress5(y, 'scandal', false, 80, { city: 'rio' }), y, ['lead', 'r1', 'r2', 'r3', 'r4'], ['vocal']),
  estrada: (y) => { const cv = document.createElement('canvas'); drawScene27(cv, paintRoad27(y, { sky: 'dusk', broken: true, city: 'rio' } as never), y, []); return cv; },
  estrada2: (y) => { const yy = y === 1935 ? 1962 : y === 1975 ? 1990 : 2030; const cv = document.createElement('canvas'); drawScene27(cv, paintRoad27(yy, { sky: y === 1975 ? 'night' : 'day', city: y === 1935 ? 'london' : 'new_york' } as never), yy, []); return cv; },
  golpe: (y) => draw(paintHeist5(y, 'relic', 3, 0.4, 1, { city: 'rio' }), y, ['c0', 'c1', 'c2', 'c3']),
};
(window as unknown as { salas5: unknown }).salas5 = out;
