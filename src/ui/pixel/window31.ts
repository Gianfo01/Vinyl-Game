// R31 · onda 4 (POL) — JANELA COM A PAISAGEM DA CIDADE E DA ÉPOCA. Antes cada cena desenhava "prédios cinza chapados"
// atrás do vidro; agora a vista vem do mesmo horizonte do mapa (skyline27: morros e mar do Rio, torres de Nova York,
// tijolo de Londres, marcos da cidade no ano). Recorta o miolo de uma faixa larga para os prédios ficarem na escala
// do mapa. PURO (só Px), determinístico e cacheado pelo skyline27.
import { cityById } from '../../data/world';
import { cityLook27, env27 } from './city27';
import { paintSky27 } from './skyline27';
import { Px, lv, mix, withAlpha, C, type Col } from './px';

/** Cidade e mês correntes (a interface atualiza a cada redesenho) — para as cenas antigas que não recebem a cidade. */
export const view31 = { city: 'rio', month: 6 };
const VIEW = new Map<string, Px>();
/** Vista crua (sem moldura) de largura w × altura h; `night` escurece e acende janelas. */
export function cityView31(city: string, year: number, month: number, w: number, h: number, seed = 7): Px {
  const key = `${city}|${year}|${month}|${w}x${h}|${seed}`;
  const hit = VIEW.get(key);
  if (hit) return hit;
  const lat = cityById[city]?.lat ?? 40;
  const SW = Math.max(160, w * 3), SH = Math.max(48, h + 18);
  const strip = new Px(SW, SH), glow = new Px(SW, SH);
  paintSky27(strip, glow, SH, env27(year, month, lat, city), cityLook27(city, lat, year), seed);
  const out = new Px(w, h), x0 = (SW - w) >> 1, y0 = SH - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.d[y * w + x] = strip.d[(y + y0) * SW + x + x0];
  VIEW.set(key, out);
  if (VIEW.size > 24) VIEW.delete(VIEW.keys().next().value!);
  return out;
}

/** Janela pintada na parede: moldura da época (madeira antes de 1960, alumínio depois), caixilho em cruz, vidro com
 *  reflexo e a vista real. (x, y) = canto da moldura; w × h = tamanho total. */
export function window31(p: Px, x: number, y: number, w: number, h: number, city: string, year: number, month: number, frame?: Col, seed = 7): void {
  const fr = frame ?? (year < 1960 ? C('#5a3a22') : year < 1995 ? C('#8a8e98') : C('#2a2a30'));
  p.rect(x, y, w, h, fr);
  p.hline(x, x + w - 1, y, lv(fr, 4.2)); p.vline(x, y, y + h - 1, lv(fr, 3.8)); p.hline(x, x + w - 1, y + h - 1, lv(fr, 1.6));
  const v = cityView31(city, year, month, w - 4, h - 4, seed);
  p.blit(v, x + 2, y + 2);
  p.vline(x + (w >> 1), y + 2, y + h - 3, fr); // caixilho
  if (year < 1960) p.hline(x + 2, x + w - 3, y + (h >> 1), fr);
  p.line(x + 4, y + 3, x + 8, y + h - 4, withAlpha(C('#ffffff'), 60)); // reflexo
  p.rect(x - 2, y + h, w + 4, 2, mix(fr, C('#ffffff'), 0.15)); // peitoril
}
