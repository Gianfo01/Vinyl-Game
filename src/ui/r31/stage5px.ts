// R31 · onda 5 (INI, EXP-10) — CENA DO PALCO da tela inicial e da prévia da nova run, feita só com a arte do jogo:
// céu e horizonte da cidade na época (`renderSky27`), palco à noite com bateria, amplificadores e caixas
// (`stage31px`), plateia de costas (`crowd31`), bonecos tocando (`avatarSprite`), fachos de luz, lua de vinil e o
// letreiro na fonte do jogo (RÁDIO → AO VIVO → STREAM). A época troca o equipamento:
//   antes de 1930  gramofone, piano de armário, violino e sopros (bateria só depois de 1915);
//   1930–2004      amplificadores, bateria e caixas de PA (a partir de 1955);
//   2005 em diante telões de LED nas laterais e DJ na cabine.
// A carreira põe o jogador na cena: artista canta no centro; estúdio fica na mesa de som da plateia; festival e
// agência enfeitam o palco com bandeirolas e mais gente; mídia leva uma câmera; os outros assistem da coxia.
// Montagem em duas partes: `scene5` (puro, só Px e sprites — testável no node) e `paintScene5` (canvas, por quadro).
// Nada aqui lê ou muda a partida: é desenho.

import { C, INK, Px, discV, inked, lv, mix, noise, withAlpha, type Col } from '../pixel/px';
import { renderSky27, type SkyEnv27 } from '../pixel/skyline27';
import { climate27, cityLook27 } from '../pixel/city27';
import { amp31, crowd31, drumKit31, speaker31 } from '../pixel/stage31px';
import { avatarSprite, randomLook, type Dir, type Pose } from '../pixel/avatar';
import { drawTextOutlined, textWidth } from '../pixel/font';
import { cityById } from '../../data/world';
import type { Appearance } from '../../sim/types';

export interface StageOpts5 {
  year: number;
  city: string;
  /** carreira principal (põe o jogador na cena) */
  career?: string;
  /** aparência do jogador (ausente = só a banda) */
  player?: Appearance;
  /** língua do letreiro */
  lang?: 'pt' | 'en';
  W?: number;
  H?: number;
}

export interface Actor5 { look: Appearance; role: string | null; pose: Pose; dir: Dir; x: number; y: number; player?: boolean; front?: boolean; /** holograma (2030+): desenhado em ciano translúcido, com linhas e tremido */ holo?: boolean }
export interface Scene5 {
  W: number; H: number; fy: number; year: number;
  /** céu, horizonte, palco, equipamento, letreiro e lua */
  base: Px;
  /** plateia em duas fileiras (balançam em quadros alternados) */
  crowd: [Px, Px];
  /** o que fica na frente da plateia (mesa de som, câmera) */
  front: Px;
  actors: Actor5[];
  beams: number[];
  /** bicos de gás da ribalta (1889–1899): chamas que tremulam */
  lamps: [number, number][];
  /** telões de LED (x, y, w, h) — animados no canvas */
  screens: [number, number, number, number][];
  sign: string;
}

/** Letreiro da época (fonte do jogo, sem acento). */
export const sign5 = (year: number, lang: 'pt' | 'en' = 'pt'): string => year < 1900 ? (lang === 'en' ? 'PHONOGRAPH' : 'FONOGRAFO') : year < 1930 ? (lang === 'en' ? 'RADIO' : 'RÁDIO') : year < 2005 ? (lang === 'en' ? 'LIVE' : 'AO VIVO') : year < HOLO5 ? 'STREAM' : 'HOLO';
const signCol5 = (year: number): string => year < 1900 ? '#e8c890' : year < 1930 ? '#f0d890' : year < 2005 ? '#ff4fa0' : year < HOLO5 ? '#4ff0ff' : '#b88cff';
/** A partir deste ano a vocalista do palco é um holograma (com projetor no chão). */
export const HOLO5 = 2030;
const labelCol5 = (year: number): string => year < 1975 ? '#c0392b' : year < 2005 ? '#f0c040' : '#2ec8c0';

/** Banda da época: [semente, papel, posição relativa, direção]. */
function band5(year: number): [string, string, number, Dir][] {
  if (year < 1930) return [['s1', 'strings', 0.3, 'SE'], ['v1', 'vocal', 0.42, 'SE'], ['h1', 'horns', 0.62, 'SW']];
  if (year < 2005) return [['g1', 'guitar', 0.3, 'SE'], ['v1', 'vocal', 0.4, 'SE'], ['b1', 'bass', 0.62, 'SW'], ['k1', 'keys', 0.7, 'SW']];
  return [['v1', 'vocal', 0.36, 'SE'], ['g1', 'guitar', 0.27, 'SE'], ['b1', 'bass', 0.6, 'SW'], ['d1', 'dj', 0.71, 'SW']];
}

const put = (p: Px, x: number, y: number, c: Col) => p.put(x, y, c);

/** Gramofone numa mesinha (antes do amplificador): caixa de madeira, prato, braço e a corneta de latão. */
/** Fonógrafo de cilindro (Edison, 1889): caixa de madeira, cilindro de cera e corneta de lata. */
function phonograph5(p: Px, x: number, fy: number): void {
  const wood = C('#6a3e22'), wax = C('#b88a4a'), tin = C('#9aa0a8');
  p.rect(x + 1, fy - 9, 1, 9, lv(wood, 2)); p.rect(x + 12, fy - 9, 1, 9, lv(wood, 2)); // mesinha
  p.rect(x, fy - 10, 14, 2, lv(wood, 4));
  for (let yy = fy - 15; yy < fy - 10; yy++) for (let xx = x + 1; xx < x + 13; xx++) put(p, xx, yy, yy === fy - 15 ? lv(wood, 4.4) : xx === x + 1 ? lv(wood, 3.6) : xx === x + 12 ? lv(wood, 2) : wood);
  for (let xx = x + 3; xx < x + 11; xx++) { put(p, xx, fy - 18, lv(wax, 4)); put(p, xx, fy - 17, wax); put(p, xx, fy - 16, lv(wax, 2)); } // cilindro
  p.vline(x + 2, fy - 19, fy - 16, lv(tin, 2)); p.vline(x + 11, fy - 19, fy - 16, lv(tin, 2)); // suportes
  // corneta de lata subindo para o alto, boca virada para a plateia
  for (let i = 0; i < 11; i++) {
    const cx = x + 9 - i, top = fy - 19 - Math.round(i * 1.1), r = Math.round(i * 0.4);
    for (let k = -r; k <= r; k++) put(p, cx, top + k, k < 0 ? lv(tin, 4) : k === r && r ? lv(tin, 2) : tin);
  }
  for (let k = -5; k <= 5; k++) put(p, x - 2, fy - 31 + k, lv(tin, k < 0 ? 1.6 : 1.2));
}

function gramophone5(p: Px, x: number, fy: number): void {
  const wood = C('#7a4a2a'), brass = C('#d8b048');
  p.rect(x + 1, fy - 9, 1, 9, lv(wood, 2)); p.rect(x + 12, fy - 9, 1, 9, lv(wood, 2)); // pernas
  p.rect(x, fy - 10, 14, 2, lv(wood, 4));
  for (let yy = fy - 16; yy < fy - 10; yy++) for (let xx = x + 2; xx < x + 12; xx++) put(p, xx, yy, yy === fy - 16 ? lv(wood, 4.4) : xx === x + 2 ? lv(wood, 3.6) : xx === x + 11 ? lv(wood, 2) : wood);
  p.hline(x + 3, x + 11, fy - 17, C('#1c1a20')); put(p, x + 7, fy - 17, C('#c03a2a'));
  p.line(x + 10, fy - 17, x + 10, fy - 21, lv(brass, 2.6));
  // corneta abrindo para a plateia
  for (let i = 0; i < 12; i++) {
    const cx = x + 10 - i, top = fy - 21 - Math.round(i * 0.9), r = Math.round(1 + i * 0.45);
    for (let k = -r; k <= r; k++) put(p, cx, top + k, k < 0 ? lv(brass, 4) : k > r - 1 ? lv(brass, 2) : brass);
  }
  for (let k = -6; k <= 6; k++) put(p, x - 2, fy - 31 + k, lv(brass, k < 0 ? 1.6 : 1.2)); // boca da corneta (sombra dentro)
}

/** Piano de armário de perfil 3/4 (madeira escura, teclado claro, castiçais). */
function piano5(p: Px, x: number, fy: number, year: number): void {
  const wood = C(year < 1920 ? '#4a2618' : '#2a1a14');
  const w = 26, h = 22, y = fy - h;
  for (let yy = y; yy < fy; yy++) for (let xx = x; xx < x + w; xx++) {
    let c = wood;
    if (yy === y) c = lv(wood, 4.4); else if (xx === x) c = lv(wood, 3.8); else if (xx === x + w - 1) c = lv(wood, 2); else if (yy >= fy - 2) c = lv(wood, 1.6);
    if (yy > y + 3 && yy < y + 10 && xx > x + 3 && xx < x + w - 4) c = lv(wood, 2.6); // painel
    put(p, xx, yy, c);
  }
  // teclado saliente
  p.rect(x - 1, y + 11, w + 2, 2, lv(wood, 3.6));
  for (let xx = x; xx < x + w; xx++) put(p, xx, y + 13, xx % 3 === 0 ? C('#1a1a1a') : C('#f4f0e4'));
  p.hline(x, x + w - 1, y + 14, C('#d8d0bc'));
  // castiçais com vela
  for (const cx of [x + 3, x + w - 4]) { put(p, cx, y - 1, C('#d8b048')); put(p, cx, y - 2, C('#f0ece0')); put(p, cx, y - 3, C('#ffd860')); }
}

/** Cabine do DJ: mesa com toca-discos/controlador e frente de LED. */
function djBooth5(p: Px, x: number, fy: number): void {
  const body = C('#22222c');
  for (let yy = fy - 12; yy < fy; yy++) for (let xx = x; xx < x + 28; xx++) put(p, xx, yy, yy === fy - 12 ? lv(body, 4.4) : xx === x ? lv(body, 3.8) : xx === x + 27 ? lv(body, 2) : body);
  for (let xx = x + 2; xx < x + 26; xx++) put(p, xx, fy - 7, (xx >> 1) % 3 === 0 ? C('#4ff0ff') : (xx >> 1) % 3 === 1 ? C('#ff4fa0') : C('#7a5af0'));
  p.rect(x + 3, fy - 14, 8, 2, C('#3a3a46')); p.rect(x + 17, fy - 14, 8, 2, C('#3a3a46'));
  put(p, x + 7, fy - 14, C('#c8ccd4')); put(p, x + 21, fy - 14, C('#c8ccd4'));
}

/** Mesa de som da plateia (estúdio/produtor): tampo inclinado com faders e medidores. */
function foh5(p: Px, x: number, fy: number, year: number): void {
  const body = C(year < 1975 ? '#5a5a62' : '#2c2c34');
  for (let yy = fy - 9; yy < fy; yy++) for (let xx = x; xx < x + 26; xx++) put(p, xx, yy, yy === fy - 9 ? lv(body, 4.4) : xx === x ? lv(body, 3.8) : xx === x + 25 ? lv(body, 2) : body);
  for (let xx = x + 2; xx < x + 24; xx += 2) { p.vline(xx, fy - 7, fy - 4, C('#141418')); put(p, xx, fy - 5 - ((xx * 7) % 3), C('#e8e4dc')); }
  for (let xx = x + 3; xx < x + 23; xx += 4) put(p, xx, fy - 8, xx % 8 < 4 ? C('#5ae070') : C('#f0c040'));
  p.rect(x + 2, fy, 2, 3, lv(body, 1.6)); p.rect(x + 22, fy, 2, 3, lv(body, 1.6));
}

/** Câmera de TV num tripé (ou caixote de foto antes da TV), virada para o palco. */
function camera5(p: Px, x: number, fy: number, year: number): void {
  const metal = C('#3a3a44');
  p.line(x + 5, fy - 10, x + 1, fy, lv(metal, 3)); p.line(x + 5, fy - 10, x + 9, fy, lv(metal, 2.4)); p.vline(x + 5, fy - 10, fy - 1, lv(metal, 3.6));
  const body = C(year < 1950 ? '#5a3a24' : year < 1990 ? '#8a8e98' : '#1e1e26');
  for (let yy = fy - 17; yy < fy - 10; yy++) for (let xx = x; xx < x + 11; xx++) put(p, xx, yy, yy === fy - 17 ? lv(body, 4.4) : xx === x ? lv(body, 3.8) : xx === x + 10 ? lv(body, 2) : body);
  p.rect(x + 11, fy - 15, 3, 3, C('#141418')); put(p, x + 12, fy - 14, C('#5a7ab0'));
  if (year >= 1950) put(p, x + 2, fy - 16, C('#e83a3a')); // luz de gravando
}

/** Bandeirolas de festival atravessando o palco. */
function bunting5(p: Px, L: number, R: number, y: number): void {
  const cols = ['#e84a4a', '#f0c040', '#4ab0e8', '#5ae070', '#c86af0'].map((h) => C(h));
  for (let x = L; x <= R; x++) put(p, x, y + Math.round(Math.sin(((x - L) / (R - L)) * Math.PI) * 6), C('#2a2a30'));
  for (let i = 0, x = L + 4; x < R - 4; x += 9, i++) {
    const yy = y + Math.round(Math.sin(((x - L) / (R - L)) * Math.PI) * 6) + 1, c = cols[i % cols.length];
    for (let k = 0; k < 5; k++) p.hline(x + Math.ceil(k / 2), x + 5 - Math.ceil(k / 2), yy + k, k === 0 ? lv(c, 4) : c);
  }
}

/** Telão de LED (moldura); o conteúdo pulsa no canvas. */
function screenFrame5(p: Px, x: number, y: number, w: number, h: number): void {
  const fr = C('#2a2a34');
  for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (yy === y - 1 || yy === y + h || xx === x - 1 || xx === x + w) put(p, xx, yy, yy === y - 1 ? lv(fr, 4.4) : fr);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(p, xx, yy, C('#0a0c18'));
  p.vline(x + (w >> 1), y + h + 1, y + h + 10, lv(fr, 2.6)); // suporte
}

/** Cena montada (puro: só Px e sprites). Mesmas entradas, mesma cena. */
export function scene5(o: StageOpts5): Scene5 {
  const W = o.W ?? 320, H = o.H ?? 180, year = o.year;
  const cityId = cityById[o.city] ? o.city : 'london';
  const city = cityById[cityId];
  const lat = city?.lat ?? 45;
  const look = cityLook27(cityId, lat, year);
  const env: SkyEnv27 = { year, month: 9, city: cityId, lat, climate: climate27(cityId, lat), season: 'autumn', snow: false, rain: false };
  const skyH = Math.round(H * 0.72);
  const sky = renderSky27({ W, H: skyH, env, look: { sea: look.sea, hillAmp: look.hillAmp, favela: look.favela, wall: look.wall }, seed: 7 });
  const P = new Px(W, H);
  P.blit(sky.p, 0, 0);
  // noite: o céu do dia vira azul-noite (mesmo filtro do rascunho aprovado), as janelas acesas ficam por cima
  for (let i = 0; i < P.d.length; i++) {
    const c = P.d[i];
    if (!(c >>> 24)) continue;
    const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    P.d[i] = ((0xff << 24) | (Math.round(b * 0.42 + 26) << 16) | (Math.round(g * 0.28 + 8) << 8) | Math.round(r * 0.3 + 12)) >>> 0;
  }
  P.blit(sky.g, 0, 0);
  // estrelas (fixas por posição)
  for (let i = 0; i < 90; i++) { const x = (i * 97) % W, y = (i * 53) % Math.round(H * 0.35); if (!(P.get(x, y) >>> 24) || noise(x, y, 3) > 0.15) P.put(x, y, C(i % 5 ? '#9aa8d8' : '#ffffff')); }
  // Paris 1889+: a Torre Eiffel (inaugurada na Exposição de 1889, onde o fonógrafo de Edison fez fila) ao fundo
  if (cityId === 'paris' && year >= 1889) {
    const tx = Math.round(W * 0.6), base = Math.round(H * 0.72), th = 58, col = C('#3a3050'), hi = C('#5a4a70');
    for (let i = 0; i < th; i++) {
      const y = base - i, f = i / th, half = Math.max(0, Math.round(16 * Math.pow(1 - f, 2.2)));
      if (i < 12) { const arch = Math.round(Math.sqrt(Math.max(0, 1 - (i / 12) ** 2)) * (half - 3)); for (let x = tx - half; x <= tx + half; x++) if (Math.abs(x - tx) >= arch) P.put(x, y, (x + y) % 3 ? col : hi); }
      else { P.put(tx - half, y, hi); P.put(tx + half, y, col); for (let x = tx - half + 1; x < tx + half; x++) if ((x + y) % 2 === 0) P.put(x, y, col); }
      if (i === 12 || i === 30) P.hline(tx - half - 1, tx + half + 1, y, hi);
    }
    P.vline(tx, base - th - 6, base - th, hi);
  }
  // lua de vinil: sulcos, rótulo da cor da época, furo
  const cx = Math.round(W * 0.8), cy = Math.round(H * 0.2), rr = Math.round(H * 0.13);
  discV(P, cx, cy, rr, C('#1c1a24'));
  for (let r = 4; r < rr; r += 3) for (let a = 0; a < 360; a += 2) { const x = cx + Math.round(Math.cos((a * Math.PI) / 180) * r), y = cy + Math.round(Math.sin((a * Math.PI) / 180) * r); if (r > rr * 0.4) P.put(x, y, C('#2a2834')); }
  for (let a = 200; a < 250; a += 3) P.put(cx + Math.round(Math.cos((a * Math.PI) / 180) * (rr - 3)), cy + Math.round(Math.sin((a * Math.PI) / 180) * (rr - 3)), C('#5a5870')); // brilho
  discV(P, cx, cy, Math.round(rr * 0.35), C(labelCol5(year)));
  P.put(cx, cy, C('#0a0a10'));
  // palco: chão, tablado de madeira com borda iluminada
  const fy = Math.round(H * 0.74);
  for (let y = fy; y < H; y++) for (let x = 0; x < W; x++) P.put(x, y, C('#1c1424'));
  const L = Math.round(W * 0.12), R = Math.round(W * 0.88);
  for (let x = L; x < R; x++) { P.put(x, fy, C('#a8743c')); for (let y = fy + 1; y < fy + 7; y++) P.put(x, y, C(y < fy + 3 ? '#7a4e2a' : '#4a2e18')); if ((x - L) % 24 === 0) P.vline(x, fy + 1, fy + 6, C('#3a2212')); }
  const career = o.career ?? 'label';
  const fest = career === 'festival' || career === 'booking';
  if (fest) inked(P, (q) => bunting5(q, L - 6, R + 6, Math.round(H * 0.06)));
  // equipamento da época (contornado com INK, como o resto do jogo)
  const screens: [number, number, number, number][] = [];
  inked(P, (q) => {
    if (year < 1930) {
      if (year < 1900) phonograph5(q, L + 6, fy); else gramophone5(q, L + 6, fy);
      piano5(q, Math.round(W * 0.74), fy, year);
      const bx = Math.round(W * 0.74) + 8, wood = C('#5a3420'); // banquinho do pianista
      q.rect(bx, fy - 6, 11, 2, lv(wood, 4)); q.vline(bx + 1, fy - 4, fy - 1, lv(wood, 2.4)); q.vline(bx + 9, fy - 4, fy - 1, lv(wood, 2));
      if (year >= 1915) drumKit31(q, Math.round(W * 0.47), fy, year, C('#c0392b'));
    } else {
      amp31(q, L + 4, fy, year, true); amp31(q, R - 30, fy, year, true);
      if (year >= 1955) { speaker31(q, L - 18, fy, 16, 40); speaker31(q, R + 2, fy, 16, 40); }
      drumKit31(q, Math.round(W * 0.47), fy, year, C(year < 1990 ? '#c0392b' : '#3a6ad0'));
      if (year >= 2005) {
        djBooth5(q, Math.round(W * 0.7) - 14, fy);
        const sw = 22, sh = 30;
        for (const sx of [L - 20, R - 2]) { screenFrame5(q, sx, fy - 78, sw, sh); screens.push([sx, fy - 78, sw, sh]); }
      }
    }
  });
  // letreiro (moldura neon, texto na fonte do jogo)
  const sign = sign5(year, o.lang);
  const sc = C(signCol5(year));
  const tw = textWidth(sign);
  const bw = Math.max(60, tw + 16), sx = Math.round(W * 0.5 - bw / 2), sy = fy - 78;
  for (let y = sy; y < sy + 14; y++) for (let x = sx; x < sx + bw; x++) P.put(x, y, y === sy || y === sy + 13 || x === sx || x === sx + bw - 1 ? sc : C('#0a0a14'));
  for (const hx of [sx + 6, sx + bw - 7]) P.vline(hx, sy - 10, sy - 1, C('#3a3a44')); // cabos do letreiro
  drawTextOutlined(P, sign, Math.round(W * 0.5 - tw / 2), sy + 4, sc, withAlpha(mix(sc, INK, 0.7), 255), 1);
  // plateia em duas fileiras (camadas próprias para balançar)
  const rows = fest ? 3 : 2;
  const crowdA = new Px(W, H), crowdB = new Px(W, H);
  inked(crowdA, (q) => { if (rows > 2) crowd31(q, -8, W + 16, Math.round(W / 5), fy + 24, year, 37); crowd31(q, 0, W, Math.round(W / 6), fy + 34, year, 11); });
  inked(crowdB, (q) => crowd31(q, 0, W, Math.round(W / 6), fy + 46, year, 23));
  if (career === 'platform' && year >= 2007) for (let i = 0; i < 9; i++) { const x = Math.round(((i + 0.5) * W) / 9 + noise(i, 1, 5) * 10), y = fy + 8 + Math.round(noise(i, 2, 5) * 6); crowdB.rect(x, y, 3, 4, C('#141418')); crowdB.rect(x, y, 3, 3, C('#9af0ff')); }
  // banda
  const actors: Actor5[] = band5(year).map(([s, role, fx, dir]) => ({ look: randomLook(`home${s}${year}`), role, pose: 'play' as Pose, dir, x: Math.round(W * fx), y: fy }));
  // 1889–1899: ribalta a gás (bicos com chama) na beira do palco
  const lamps: [number, number][] = [];
  if (year < 1900) for (let x = L + 10; x < R - 4; x += 22) { inked(P, (q) => { q.rect(x - 1, fy - 2, 3, 2, C('#6a5a3a')); q.put(x, fy - 3, C('#3a3020')); }); lamps.push([x, fy - 4]); }
  // hologramas (2030+): a vocal e o guitarrista viram projeções, cada um com o projetor no chão
  if (year >= HOLO5) for (const a of actors) if (a.role === 'vocal' || a.role === 'guitar') {
    a.holo = true;
    inked(P, (q) => { q.rect(a.x - 6, fy - 3, 12, 3, C('#2a2a38')); q.rect(a.x - 3, fy - 4, 6, 1, C('#7af0ff')); });
  }
  // pianista de costas para a plateia, sentado ao teclado do piano de armário
  if (year < 1930) actors.push({ look: randomLook(`homek1${year}`), role: 'keys', pose: 'sitplay', dir: 'NE', x: Math.round(W * 0.74) + 13, y: fy + 1 });
  // jogador
  const front = new Px(W, H);
  if (o.player) {
    if (career === 'musician') { const v = actors.find((a) => a.role === 'vocal')!; v.look = o.player; v.player = true; v.holo = false; }
    else if (career === 'studio' || career === 'producer') { inked(front, (q) => foh5(q, Math.round(W * 0.56), fy + 40, year)); actors.push({ look: o.player, role: null, pose: 'stand', dir: 'NW', x: Math.round(W * 0.56) + 13, y: fy + 34, player: true, front: true }); }
    else if (career === 'media') { inked(front, (q) => camera5(q, Math.round(W * 0.2), fy + 40, year)); actors.push({ look: o.player, role: null, pose: 'stand', dir: 'NE', x: Math.round(W * 0.2) - 4, y: fy + 42, player: true, front: true }); }
    else actors.push({ look: o.player, role: null, pose: 'stand', dir: 'SE', x: L + 32, y: fy, player: true });
  }
  return { W, H, fy, year, base: P, crowd: [crowdA, crowdB], front, actors, beams: [0.3, 0.5, 0.7], screens, lamps, sign };
}

/** Desenho de um quadro (t = número do quadro; 0 = parado). */
/** Holograma: cone de luz do projetor, figura tingida de ciano/violeta, linhas de varredura que correm, brilho que
 *  pulsa e, de vez em quando, um tremido de 1–2 px numa faixa. `t` = 0 desenha parado (movimento reduzido). */
const holoTint5 = new Map<CanvasImageSource, HTMLCanvasElement>();
function holo5(ctx: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, x: number, y: number, fx: number, fy: number, t: number): void {
  let tint = holoTint5.get(src);
  if (!tint) {
    tint = document.createElement('canvas'); tint.width = src.width; tint.height = src.height;
    const g = tint.getContext('2d')!;
    g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
    // recolore pela luz de cada pixel (mantém contorno e detalhes): escuro = azul fundo, claro = ciano quase branco;
    // a metade de cima puxa para o violeta
    const im = g.getImageData(0, 0, tint.width, tint.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const v = Math.min(1, (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255 * 1.25 + 0.08), top = (i / 4 / tint.width) < tint.height * 0.45 ? 1 : 0;
      d[i] = Math.round(10 + v * (top ? 190 : 170)); d[i + 1] = Math.round(40 + v * (top ? 180 : 215)); d[i + 2] = Math.round(90 + v * 165);
    }
    g.putImageData(im, 0, 0);
    if (holoTint5.size > 64) holoTint5.clear();
    holoTint5.set(src, tint);
  }
  ctx.save();
  // cone do projetor
  ctx.globalAlpha = t ? 0.1 + 0.05 * Math.sin(t * 0.7) : 0.12;
  ctx.fillStyle = '#7af0ff';
  const cx = x + src.width / 2; ctx.beginPath(); ctx.moveTo(fx - 3, fy - 3); ctx.lineTo(cx - 8, y + 2); ctx.lineTo(cx + 8, y + 2); ctx.lineTo(fx + 3, fy - 3); ctx.closePath(); ctx.fill();
  // figura inteira em ciano, brilho que pulsa, linha de varredura que sobe e, de vez em quando, um tremido de 2 px
  ctx.globalAlpha = t ? 0.8 + 0.15 * Math.abs(Math.sin(t * 0.45)) : 0.9;
  const jump = t && t % 23 < 2 ? (t % 2 ? 2 : -2) : 0;
  ctx.drawImage(tint, x + jump, y);
  if (t) {
    const r = src.height - 1 - ((t * 2) % (src.height + 6));
    if (r >= 0) { ctx.globalAlpha = 0.9; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tint, 0, r, src.width, 1, x + jump, y + r, src.width, 1); }
  }
  ctx.restore();
}

export function paintScene5(ctx: CanvasRenderingContext2D, sc: Scene5, t = 0, cache?: Map<Px, CanvasImageSource>): void {
  const img = (p: Px): CanvasImageSource => { const hit = cache?.get(p); if (hit) return hit; const c = p.canvas(); cache?.set(p, c); return c; };
  const { W, fy } = sc;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, sc.H);
  ctx.drawImage(img(sc.base), 0, 0);
  // telões: barras de equalizador em pixel
  for (const [x, y, w, h] of sc.screens) for (let i = 0; i < w; i += 2) {
    const v = Math.round((0.35 + 0.65 * Math.abs(Math.sin(i * 0.7 + t * 0.9))) * (h - 2));
    ctx.fillStyle = i % 6 === 0 ? '#ff4fa0' : i % 6 === 2 ? '#4ff0ff' : '#7a5af0';
    ctx.fillRect(x + i, y + h - v, 1, v);
  }
  // chamas da ribalta a gás: tremulam e mudam de tom
  sc.lamps.forEach(([x, y], i) => {
    const k = (t + i * 3) % 5, hgt = k === 0 ? 3 : 2;
    ctx.fillStyle = k % 2 ? '#ffd27a' : '#ffb040'; ctx.fillRect(x, y - hgt + 1, 1, hgt);
    ctx.fillStyle = '#fff4c0'; ctx.fillRect(x, y, 1, 1);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffc060'; ctx.fillRect(x - 3, y - 4, 7, 6); ctx.restore();
  });
  // fachos de luz (balançam devagar)
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#fff0c0';
  sc.beams.forEach((lx, i) => {
    const sway = t ? Math.round(Math.sin(t * 0.18 + i * 1.7) * 14) : 0;
    ctx.beginPath(); ctx.moveTo(W * lx, 0); ctx.lineTo(W * lx - 26 + sway, fy); ctx.lineTo(W * lx + 26 + sway, fy); ctx.closePath(); ctx.fill();
  });
  ctx.restore();
  const frame = t ? Math.floor(t / 2) % 4 : 1;
  const draw = (a: Actor5) => {
    const sp = avatarSprite(a.look, { year: sc.year, role: a.role as never, pose: a.pose, dir: a.dir, frame: a.pose === 'play' ? frame : 0 });
    if (a.holo) return holo5(ctx, sp.c, a.x - sp.ax, a.y - sp.ay, a.x, a.y, t);
    ctx.drawImage(sp.c, a.x - sp.ax, a.y - sp.ay);
  };
  for (const a of sc.actors) if (!a.front) draw(a);
  // plateia: as fileiras sobem 1 px em quadros alternados (pulando no ritmo)
  ctx.drawImage(img(sc.crowd[0]), 0, t && (t >> 1) % 2 ? -1 : 0);
  ctx.drawImage(img(sc.crowd[1]), 0, t && ((t >> 1) + 1) % 2 ? -1 : 0);
  ctx.drawImage(img(sc.front), 0, 0);
  for (const a of sc.actors) if (a.front) draw(a);
}
