// Rodada 20 (B14) — PÚBLICO AO VIVO POR ANO, congelado show a show. O prêmio "Ato ao Vivo do Ano" lia só turnês
// já concluídas ('done') e somava TODAS as paradas da turnê, inclusive as de outro ano: uma turnê em curso não
// concorria e uma que cruzou o réveillon contava datas fora do período. Agora cada show jogado grava um
// snapshot imutável (ano civil do show × ato × público) no momento em que acontece; a apuração lê só o ano
// homenageado, sem depender do status administrativo da turnê. Saves antigos sem snapshot: recalcula pelas
// paradas jogadas naquele ano (qualquer status de turnê).
import { tourList } from './tours';
import { registerExt4, registerSimHook } from './ext4';
import type { GameState } from './types';
import { dateOfDay } from './util';

export interface LiveSnap20 { y: Record<string, Record<string, number>> }
declare module './ext4' { interface Ext4 { live20: LiveSnap20 } }
registerExt4('live20', () => ({ y: {} }));

const st = (s: GameState): LiveSnap20 => {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const v = (x.live20 ??= { y: {} }) as LiveSnap20;
  v.y ??= {};
  return v;
};

registerSimHook('show', 'live20:snap', (s, _r, arg) => {
  const sh = arg.show;
  if (!sh || sh.sold <= 0) return;
  const v = st(s);
  const k = String(s.year);
  // primeiro show do ano neste save: semeia pelas paradas já jogadas no ano (inclui este show, já 'played')
  if (!v.y[k]) v.y[k] = fromStops(s, s.year);
  else v.y[k][sh.actId] = (v.y[k][sh.actId] ?? 0) + sh.sold;
  for (const k of Object.keys(v.y)) if (Number(k) < s.year - 3) delete v.y[k];
});

/** Público ao vivo por ato no ano civil `year` (snapshot; recálculo pelas paradas em save antigo). */
export function livePublic20(s: GameState, year: number): Record<string, number> {
  return st(s).y[String(year)] ?? fromStops(s, year);
}
function fromStops(s: GameState, year: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of tourList(s)) for (const p of t.stops) {
    if (p.status !== 'played' || dateOfDay(s.config.startYear, p.day).year !== year) continue;
    out[t.actId] = (out[t.actId] ?? 0) + p.sold;
  }
  return out;
}
