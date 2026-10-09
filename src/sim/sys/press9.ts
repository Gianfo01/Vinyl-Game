// Rodada 9 — boatos e jornal do mundo. Fatos grandes viram boatos que nascem numa cidade e se espalham
// (primeiro pelo mesmo mercado, depois pelo mundo), distorcendo-se no caminho; a fama de um ato numa
// cidade sobe ou desce com o que se diz lá. Todo mês, o jornal do mundo escolhe as manchetes (não só
// as do seu selo), com o ritmo do diretor para não empilhar tudo no mesmo mês.

import { CITIES, cityById, genreById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { chronListeners, chronState, type ChronEv } from './chron9';

export interface Rumor { id: string; t: L; a?: string; c0: string; cs: string[]; d: number; tone: number; y: number; w: number; i: number }
export interface Headline { y: number; m: number; t: L; i: number }
export interface Press9State { rum: Rumor[]; hl: Headline[]; seq: number }
declare module '../ext4' { interface Ext4 { press9: Press9State } }
registerExt4('press9', () => ({ rum: [], hl: [], seq: 0 }));
export function press(s: GameState): Press9State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const p = (x.press9 ??= { rum: [], hl: [], seq: 0 }) as Press9State;
  p.rum ??= []; p.hl ??= []; p.seq ??= 0;
  return p;
}

const GOOD = new Set(['number1', 'award', 'hall_of_fame', 'legend', 'masterwork', 'masterpiece', 'record', 'rise', 'reunion', 'comeback', 'supergroup', 'band_formed']);
const BAD = new Set(['breakdown', 'addiction', 'split', 'scandal', 'trance_denied', 'tour_accident', 'death', 'label_closed']);

const DISTORT: L[] = [
  l('{t}', '{t}'),
  l('Dizem por aí que {t}', 'Word is that {t}'),
  l('Fontes garantem: {t} E tem mais coisa que ninguém conta.', 'Sources swear: {t} And there is more nobody is telling.'),
  l('Lenda urbana: {t} Uns juram que foi o dobro.', 'Urban legend: {t} Some swear it was twice as big.'),
];
export function rumorText(r: Rumor): L {
  const low = { pt: r.t.pt.charAt(0).toLowerCase() + r.t.pt.slice(1), en: r.t.en.charAt(0).toLowerCase() + r.t.en.slice(1) };
  return fmtL(DISTORT[Math.min(3, r.d)], { t: r.d === 0 ? r.t : low });
}

chronListeners().push((s: GameState, e: ChronEv) => {
  const tone = GOOD.has(e.k) ? 1 : BAD.has(e.k) ? -1 : 0;
  if (!e.c || e.i < 3 || (e.i === 3 && !tone)) return;
  const p = press(s);
  const actId = e.a?.find((id) => s.acts[id]);
  p.rum.push({ id: `r${++p.seq}`, t: e.t, a: actId, c0: e.c, cs: [e.c], d: 0, tone, y: s.year, w: s.week, i: e.i });
  if (p.rum.length > 40) {
    let k = 0;
    for (let j = 1; j < p.rum.length; j++) if ((p.rum[j].i ?? 3) < (p.rum[k].i ?? 3)) k = j;
    p.rum.splice(k, 1);
  }
});

/** Boatos que circulam numa cidade. */
export function rumorsIn(s: GameState, cityId: string): Rumor[] {
  return press(s).rum.filter((r) => r.cs.includes(cityId));
}

registerMod('cityDemand', 'press9', (s, v, ctx) => {
  if (!ctx.act || !ctx.cityId) return null;
  let m = 1;
  for (const r of press(s).rum) if (r.a === ctx.act.id && r.tone && r.cs.includes(ctx.cityId) && s.week - r.w < 52) m *= 1 + r.tone * (0.04 + r.d * 0.015);
  return m === 1 ? null : { value: v * m, label: l('Boatos na cidade', 'Rumors in town') };
});

registerSimHook('month', 'press9', (s, r) => {
  const p = press(s);
  // espalhar boatos
  for (const ru of p.rum) {
    if (s.week - ru.w > 40 || ru.cs.length >= 12) continue;
    const mk = cityById[ru.c0]?.market;
    const pool = CITIES.filter((c) => !ru.cs.includes(c.id) && (c.market === mk || ru.cs.length > 3));
    if (!pool.length || !r.chance(0.6)) continue;
    ru.cs.push(r.pick(pool).id);
    if (r.chance(0.22)) ru.d = Math.min(3, ru.d + 1);
  }
  // manchetes do mês: os fatos mais fortes ainda não noticiados
  const evs = chronState(s).ev;
  const fresh: ChronEv[] = [];
  for (let i = evs.length - 1; i >= 0 && fresh.length < 40; i--) {
    const e = evs[i];
    if (e.y < s.year - 1) break;
    if ((e.y === s.year && e.m === s.month) || (e.y * 12 + e.m === s.year * 12 + s.month - 1)) fresh.push(e);
  }
  const done = new Set(p.hl.filter((h) => h.y >= s.year - 1).map((h) => h.t.pt));
  const pick = fresh.filter((e) => !done.has(e.t.pt)).sort((a, b) => b.i - a.i).slice(0, 2);
  if (pick.length) for (const e of pick) p.hl.push({ y: s.year, m: s.month, t: e.t, i: e.i });
  else {
    // mês calmo: manchete de tendência
    const top = Object.entries(s.genrePop).sort((a, b) => b[1] - a[1])[0];
    if (top && genreById[top[0]]) p.hl.push({ y: s.year, m: s.month, i: 1, t: s.economy.recession ? l('Recessão aperta: lojas de discos vazias.', 'Recession bites: record stores empty.') : fmtL(l('{g} domina as rádios do mundo.', '{g} rules the world\'s radio.'), { g: genreById[top[0]].name }) });
  }
  if (p.hl.length > 48) p.hl.splice(0, p.hl.length - 48);
  p.rum = p.rum.filter((x) => s.week - x.w < 104);
});
