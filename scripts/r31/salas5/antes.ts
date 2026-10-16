// R31 · onda 5 (SALAS) — harness das cenas ANTIGAS (r27) para as capturas "antes".
// Rodou no commit anterior às salas novas (as pinturas antigas saíram depois); fica como registro do "antes".
import '../../../src/sim/worldgen';
import { drawScene27, paintTable27, paintStudio27, type Who27 } from '../../../src/ui/act27/scene27';
import { paintWarRoom27, paintPress27, paintPressFront27 } from '../../../src/ui/act27/p2apx27';
import { paintCrisis27, paintRoad27 } from '../../../src/ui/act27/px27b';
import { boardPx27 } from '../../../src/ui/act27/heist27';
const P = (id: string, role = 'vocal', born = 1950) => ({ id, role, born }) as Who27['p'];
const out: Record<string, (y: number) => HTMLCanvasElement> = {
  composicao: (y) => { const cv = document.createElement('canvas'); const sp: [number, number, 'SE' | 'SW'][] = [[62, 64, 'SE'], [138, 64, 'SW'], [100, 56, 'SE']];
    drawScene27(cv, paintTable27(y, ['hook', 'lyric', 'harmony', 'rhythm'], 3), y, sp.map((s, i) => ({ p: P('w' + i, 'vocal', y - 25), x: s[0], y: s[1], pose: 'sit', dir: s[2] }))); return cv; },
  estudio: (y) => { const cv = document.createElement('canvas'); const sp = [[40, 74], [72, 76], [18, 82], [100, 82]]; const roles = ['vocal', 'guitar', 'bass', 'drums'];
    drawScene27(cv, paintStudio27(y, true), y, sp.map((s, i) => ({ p: P('m' + i, roles[i], y - 24), x: s[0], y: s[1], pose: i ? 'play' : 'stand', dir: 'SE' }))); return cv; },
  guerra: (y) => { const cv = document.createElement('canvas'); drawScene27(cv, paintWarRoom27(y, ['radio_plug', 'tv_show', 'music_video', 'web_forums', 'short_clips', 'press', 'street_team'], 3, 8, 6, 55), y, []); return cv; },
  crise: (y) => { const cv = document.createElement('canvas'); drawScene27(cv, paintCrisis27(y, 70, 10), y, [0, 1, 2].map((i) => ({ p: P('s' + i, 'producer', y - 35), x: 60 + i * 40, y: 74, pose: 'stand', dir: i % 2 ? 'SW' : 'SE' }))); return cv; },
  coletiva: (y) => { const cv = document.createElement('canvas'); drawScene27(cv, paintPress27(y, 'press', true, 40), y, [{ p: P('lead', 'vocal', y - 28), x: 100, y: 54, pose: 'sit' }]); cv.getContext('2d')!.drawImage(paintPressFront27(y, 'press').canvas(), 0, 0); return cv; },
  escandalo: (y) => { const cv = document.createElement('canvas'); drawScene27(cv, paintPress27(y, 'scandal', false, 80), y, [{ p: P('lead', 'vocal', y - 28), x: 100, y: 54, pose: 'sit' }]); cv.getContext('2d')!.drawImage(paintPressFront27(y, 'scandal').canvas(), 0, 0); return cv; },
  estrada: (y) => { const cv = document.createElement('canvas'); drawScene27(cv, paintRoad27(y, { sky: 'dusk', broken: true }), y, []); return cv; },
  golpe: () => { const cv = document.createElement('canvas'); const px = boardPx27('relic', 3, 40, 1); cv.width = px.w; cv.height = px.h; cv.getContext('2d')!.drawImage(px.canvas(), 0, 0); return cv; },
};
(window as unknown as { salas5: unknown }).salas5 = out;
