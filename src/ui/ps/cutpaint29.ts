// Rodada 29 (cenas) — pintura PURA de um quadro de cena animada (sem DOM): o cenário do art27 ou o cenário próprio do
// cenas29, a camada da cena, o retrato na moldura, os efeitos (paintFx27) e a luz por era e hora. O tocador (cut27.ts)
// e os testes/folha de contato usam a mesma função, então o que se testa é o que se vê. Os bonecos (drawFigs27) são
// desenhados depois, no canvas.
import type { GameState } from '../../sim/types';
import { light29, paintStage29 } from '../pixel/cenas29';
import { C, Px } from '../pixel/px';
import { paintArt27, type ArtModel27 } from './art27';
import { kit27 } from './art27kit';
import { CUT27, paintFx27, type CutData27 } from './cut27model';
import { stageOf29 } from './cut29model';

/** Cenas de interior (a noite não escurece o quadro inteiro). */
const OUTDOOR29 = new Set(['shows', 'festival', 'tour', 'night', 'crime', 'era']);

/** Pinta o quadro da cena no instante `tm` (0 = estático) em `buf`; `pic` = retrato para a moldura. */
export function paintCut29(s: GameState, d: CutData27, m: ArtModel27, tm: number, buf: Px = new Px(m.W, m.H), pic?: Px | null): Px {
  const st = stageOf29(s, d, m);
  if (st.full) buf.d.fill(C('#0e0a14')); else paintArt27(m, tm, buf);
  const k = kit27(buf, m.year, tm, m.seed, m.fy);
  paintStage29(k, st.stage, st);
  if (pic) buf.blit(pic, Math.round(m.W / 2) - 16, d.key === 'heirs' ? 7 : Math.max(6, m.fy - 64) + 2);
  paintFx27(buf, m, CUT27[d.key].fx, tm);
  light29(k, { hour: st.hour, interior: st.full || !OUTDOOR29.has(m.kind) });
  return buf;
}
