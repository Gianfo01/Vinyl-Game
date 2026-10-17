// R33 · CATÁLOGO — CICLOS DE FORMATO (`exp33.formats`, desligado).
// Cada formato físico tem uma "vida" (0..1) que segue as datas de tecnologia da partida (não anos fixos: numa história
// alternativa o CD pode chegar antes):
//  • VINIL (LP e compacto): cheio até CD+6, morre até CD+14 (sobra o colecionador, 8%), VOLTA a partir do streaming+2 e
//    chega a 60% em streaming+12.
//  • CASSETE: cheio até CD+8, morre até CD+16; um respiro nostálgico (10%) depois de streaming+8.
//  • CD: cheio até streaming+3, morre até streaming+12 (sobra 15%).
// Efeito: na parte física das vendas, o disco vale pela vida do MELHOR formato em que saiu, relativa ao melhor formato
// vivo do momento (`chartUnits`). Quem prensa no formato certo não perde nada; quem insiste no formato morto perde.
// A virada de cada ciclo sai uma vez no jornal (fato público). `formatTrend33` é o gancho para a interface e para os
// robôs (GESTÃO) escolherem formato.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import type { FormatId } from '../../data/rules';
import { formatById } from '../../data/rules';
import { registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { availableFormats, physicalShare } from '../production';
import type { GameState, Release } from '../types';
import { cat33, log33, on33, peek33 } from './cat33';

const ON = 'exp33.formats' as const;

const ramp = (y: number, y0: number, y1: number, a: number, b: number): number => (y <= y0 ? a : y >= y1 ? b : a + ((b - a) * (y - y0)) / (y1 - y0));

/** Vida do formato no ano (1 = no auge; formatos sem ciclo próprio = 1). */
export function formatLife33(s: GameState, f: FormatId, y = s.year): number {
  const cd = s.techDates.cd, st = s.techDates.streaming;
  if (f === 'lp' || f === 'single45') {
    if (cd === undefined) return 1;
    const down = ramp(y, cd + 6, cd + 14, 1, 0.08);
    return st === undefined || y < st + 2 ? down : Math.max(down, ramp(y, st + 2, st + 12, 0.08, 0.6));
  }
  if (f === 'cassette') {
    if (cd === undefined) return 1;
    const down = ramp(y, cd + 8, cd + 16, 1, 0.05);
    return st === undefined || y < st + 8 ? down : Math.max(down, 0.1);
  }
  if (f === 'cd') return st === undefined ? 1 : ramp(y, st + 3, st + 12, 1, 0.15);
  return 1;
}

/** Fator da parte física de um disco (0..1) relativo ao melhor formato físico vivo agora. */
export function formatFit33(s: GameState, rel: Pick<Release, 'formats'>): number {
  const phys = (rel.formats ?? []).filter((f) => formatById[f]?.physical);
  if (!phys.length) return 1;
  const best = Math.max(1e-6, ...availableFormats(s).filter((f) => formatById[f]?.physical).map((f) => formatLife33(s, f)), ...phys.map((f) => formatLife33(s, f)));
  return clamp(Math.max(...phys.map((f) => formatLife33(s, f))) / best, 0, 1);
}

registerMod('chartUnits', 'formats33', (s, v, { release }) => {
  if (!release || !on33(s, ON)) return null;
  const fit = formatFit33(s, release);
  if (fit >= 0.999) return null;
  const ph = physicalShare(s);
  return { value: v * (1 - ph + ph * fit), label: l('Formato fora de moda', 'Out-of-fashion format') };
});

export interface Trend33 { f: FormatId; name: L; life: number; d: -1 | 0 | 1 }
/** Formatos físicos com a vida de agora e a direção (comparada a 2 anos atrás). */
export function formatTrend33(s: GameState): Trend33[] {
  return (['lp', 'single45', 'cassette', 'cd'] as FormatId[]).filter((f) => s.techDates[f === 'single45' ? 'single45' : f] !== undefined && s.techDates[f === 'single45' ? 'single45' : f]! <= s.year)
    .map((f) => { const a = formatLife33(s, f), b = formatLife33(s, f, s.year - 2); return { f, name: formatById[f].name, life: a, d: a > b + 0.02 ? 1 : a < b - 0.02 ? -1 : 0 }; });
}

const NEWS33: { id: string; f: FormatId; test: (now: number, before: number) => boolean; t: L }[] = [
  { id: 'vinyl_dies', f: 'lp', test: (a, b) => a < 0.35 && b >= 0.35, t: l('O vinil morre: as lojas trocam as prateleiras de LP por CD; prensas fecham.', 'Vinyl dies: stores swap LP shelves for CDs; pressing plants close.') },
  { id: 'cassette_dies', f: 'cassette', test: (a, b) => a < 0.35 && b >= 0.35, t: l('O cassete sai de cena: as fábricas de fita param.', 'The cassette bows out: tape factories stop.') },
  { id: 'vinyl_back', f: 'lp', test: (a, b) => a >= 0.25 && b < 0.25, t: l('O vinil volta: os jovens descobrem a vitrola e as prensas têm fila de novo.', 'Vinyl is back: young people discover the turntable and the presses have queues again.') },
  { id: 'cd_dies', f: 'cd', test: (a, b) => a < 0.35 && b >= 0.35, t: l('O CD morre: as lojas de disco fecham as portas uma a uma.', 'The CD dies: record stores close one by one.') },
];

registerSimHook('year', 'formats33', (s) => {
  if (!on33(s, ON)) return;
  for (const n of NEWS33) {
    if (peek33(s)?.fmt[n.id]) continue;
    if (!n.test(formatLife33(s, n.f), formatLife33(s, n.f, s.year - 1))) continue;
    cat33(s).fmt[n.id] = s.year;
    emitFact(s, { kind: 'culture33', actors: ['player'], severity: 30, visibility: 'public', tags: ['formats33', n.id], src: 'formats33', text: n.t, diary: true, notify: 'event' });
    log33(s, n.t);
  }
});
