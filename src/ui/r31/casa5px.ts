// R31 · onda 5 (CASA) — A CASA EM PIXEL ART (PURO: só Px). Mesmo corte lateral da sede e da casa da onda 4 (cut27 de
// interior27: céu, vizinhos, rua, lâmpadas, contorno INK), com os OBJETOS da galeria ART5 (exp5px: espelho, cama,
// escrivaninha, instrumento, garagem, quarto das crianças, telefone, porta-retratos, calendário, cofre, chaveiro)
// no tamanho do boneco (24×34): a porta passa uma pessoa, a cama bate no joelho, o telefone cabe na mesinha.
//
// Os cômodos vêm dos objetos (casa5model.casaObjs5): aluguel = quarto e sala num cômodo só; apartamento = sala +
// quarto; casa = sala + quarto (+ crianças) + garagem; mansão = sala + escritório + quarto (+ crianças) + garagem.
// Cada cômodo tem a sua parede (papel listrado no quarto, lambri no escritório, bloco na garagem, poá nas crianças),
// tapete, luz e enfeites (abajur, planta, quadros, cortina), para a cena nunca ficar vazia. Determinístico.

import { cut27, cutEnd27, facadeCol27 } from '../pixel/interior27';
import { PAD5, obj5Def, obj5Px, type Obj5 as Art5 } from '../pixel/exp5px';
import { carSide31 } from '../pixel/props31';
import { C, INK, Px, lv, mix, noise, tint, withAlpha, type Col } from '../pixel/px';
import { window31 } from '../pixel/window31';
import { prim27 } from '../ps/hqpx27';
import type { CasaObj5, Dwell5, Room5 } from './casa5model';

export interface CasaArt5 {
  year: number; month: number; city: string; dwell: Dwell5; seed: number;
  /** objetos da casa (id, desenho, cômodo) */
  items: Pick<CasaObj5, 'id' | 'art' | 'room'>[];
  /** ids com novidade (selo "!") */
  bang?: ReadonlySet<string>;
  cars: number; carYears: number[]; gold: number;
}
export interface CasaSpot5 { id: string; x: number; y: number; w: number; h: number }
export interface CasaPainted5 { px: Px; W: number; H: number; fy: number; /** topo do telhado (corte da cena) */ top: number; spots: CasaSpot5[]; you: { x: number; y: number }; rooms: { id: Room5; x: number; w: number }[] }

const ORDER5: Room5[] = ['sala', 'escritorio', 'quarto', 'criancas', 'garagem'];
const GAP = 7, PADR = 7, WALL = 5;

type Deco = 'coat' | 'lamp' | 'night' | 'chair' | 'crate' | 'tv' | 'table' | 'low' | 'plant' | 'cars' | 'stand';
/** Um lugar no chão (com o que fica em cima e na parede acima dele). */
interface Slot { w: number; draw?: (x: number) => void; art?: Art5; id?: string; top?: { id: string; art: Art5; dx: number }[]; wall?: { id?: string; w: number; h: number; y: number; art?: Art5; kind?: 'discos' }; deco?: Deco }

export function paintCasa5(a: CasaArt5): CasaPainted5 {
  const inRoom = (r: Room5) => a.items.filter((i) => i.room === r).map((i) => i.id);
  const rooms = ORDER5.filter((r) => inRoom(r).length || (r === 'sala'));
  // ---- planejar slots por cômodo (sem desenhar) para saber a largura
  const plan = new Map<Room5, Slot[]>();
  const objW = (art: Art5) => obj5Def(art).w;
  for (const r of rooms) {
    const ids = new Set(inRoom(r));
    const S: Slot[] = [];
    const take = (id: string) => { const ok = ids.has(id); ids.delete(id); return ok; };
    if (r === 'garagem') { take('garagem'); S.push({ w: 56, art: 'garage', id: 'garagem' }); S.push({ w: Math.max(1, Math.min(2, a.cars)) * 48 - 4, deco: 'cars' }); plan.set(r, S); continue; }
    if (take('porta')) S.push({ w: 14, id: 'porta', wall: take('chaveiro') ? { id: 'chaveiro', art: 'keys', w: objW('keys'), h: obj5Def('keys').h, y: 46 } : undefined });
    if (r === 'sala') S.push({ w: 10, deco: 'coat' });
    const win = take('janela');
    const big = take('sofa') ? 'sofa' : r === 'sala' && take('cama') ? 'cama' : undefined;
    if (big) S.push({ w: big === 'sofa' ? 50 : 46, id: big, art: big === 'cama' ? 'bed' : undefined, wall: win ? { id: 'janela', w: 46, h: 30, y: 48 } : undefined });
    else if (win) S.push({ w: 46, deco: 'low', wall: { id: 'janela', w: 46, h: 30, y: 48 } });
    if (big === 'sofa') S.push({ w: 8, deco: 'lamp' });
    const tel = take('telefone'), ret = take('retratos'), cal = take('calendario');
    if (tel || ret) S.push({ w: 30, deco: 'table', top: [...(tel ? [{ id: 'telefone', art: 'phone' as Art5, dx: 2 }] : []), ...(ret ? [{ id: 'retratos', art: 'photo' as Art5, dx: tel ? 17 : 9 }] : [])],
      wall: cal && r !== 'quarto' ? { id: 'calendario', art: 'calendar', w: objW('calendar'), h: obj5Def('calendar').h, y: 52 } : undefined });
    if (r === 'sala') S.push({ w: 20, id: 'voce', deco: 'stand' });
    if (take('instrumento')) S.push({ w: 18, deco: 'crate', wall: { id: 'instrumento', art: 'instrument', w: objW('instrument'), h: obj5Def('instrument').h, y: 62 } });
    if (r === 'sala') { const d = take('discos'); S.push({ w: 24, deco: 'tv', wall: { id: d ? 'discos' : undefined, w: 34, h: 13, y: 50, kind: 'discos' } }); }
    if (r === 'quarto' && take('cama')) S.push({ w: 46, id: 'cama', art: 'bed', wall: { w: 26, h: 18, y: 56 } }, { w: 12, deco: 'night' });
    if (take('espelho')) S.push({ w: 16, id: 'espelho', art: 'mirror' });
    if (take('escrivaninha')) S.push({ w: 32, id: 'escrivaninha', art: 'writedesk', wall: cal && r === 'quarto' || (cal && !(tel || ret)) ? { id: 'calendario', art: 'calendar', w: objW('calendar'), h: obj5Def('calendar').h, y: 52 } : { w: 18, h: 14, y: 56 } }, { w: 9, deco: 'chair' });
    else if (cal && r === 'quarto') S.push({ w: 18, deco: 'crate', wall: { id: 'calendario', art: 'calendar', w: objW('calendar'), h: obj5Def('calendar').h, y: 52 } });
    if (take('escritoriocasa')) S.push({ w: 14, id: 'escritoriocasa', art: 'filing' });
    if (take('cofre')) S.push({ w: 20, id: 'cofre', art: 'safe' });
    if (take('estante')) S.push({ w: 24, id: 'estante' });
    if (take('criancas')) S.push({ w: 44, id: 'criancas', art: 'kidsroom' });
    take('voce'); take('discos');
    S.push({ w: 10, deco: 'plant' });
    plan.set(r, S);
  }
  const roomW = (r: Room5) => PADR * 2 + plan.get(r)!.reduce((t, s) => t + s.w, 0) + GAP * (plan.get(r)!.length - 1);
  const inner = rooms.reduce((t, r) => t + roomW(r), 0) + WALL * (rooms.length - 1);
  const c = cut27(inner + 36, a.year, { floor: 'lounge', dim: false, seed: a.seed, city: a.city });
  const { g, back, layer: p, fy, y0, pal, x0 } = c;
  const year = a.year;
  const spots: CasaSpot5[] = [];
  const objs: { art: Art5; x: number; y: number; id: string }[] = [];
  const out: CasaPainted5['rooms'] = [];
  let you = { x: x0 + 40, y: fy };
  const rug = (x: number, w: number, col: Col) => { back.rect(x, fy - 1, w, 2, col); back.hline(x, x + w - 1, fy - 1, tint(col, 0.2)); for (let xx = x; xx < x + w; xx += 3) back.put(xx, fy, tint(col, -0.25)); };
  let rx = x0;
  rooms.forEach((r, ri) => {
    const w = roomW(r);
    out.push({ id: r, x: rx, w });
    wallpaper(back, r, rx, y0, w, fy, pal, year, a.seed);
    back.hline(rx, rx + w - 1, fy - 2, lv(pal.trim, 1.6)); back.hline(rx, rx + w - 1, fy - 3, pal.trim); // rodapé
    let x = rx + PADR;
    for (const s of plan.get(r)!) {
      const sx = x;
      // paredes primeiro (janela, quadros, calendário…)
      if (s.wall) {
        const wx = sx + Math.round((s.w - s.wall.w) / 2), wy = s.wall.y;
        if (s.wall.id === 'janela') {
          window31(back, wx, wy, 46, 30, a.city, year, a.month);
          const cur = year < 1950 ? C('#8a2a2a') : year < 1980 ? C('#d8902c') : year < 2010 ? C('#6a7a9a') : C('#e8e2d6');
          p.rect(wx - 4, wy - 3, 54, 2, pal.woodDark); // varão
          for (const cx of [wx - 4, wx + 45]) { p.rect(cx, wy - 1, 5, 34, cur); p.vline(cx + 2, wy, wy + 32, tint(cur, -0.2)); }
          p.rect(wx - 1, wy + 30, 48, 2, lv(pal.trim, 2.4)); // peitoril
          spots.push({ id: 'janela', x: wx - 4, y: wy - 3, w: 54, h: 36 });
        } else if (s.wall.art) {
          objs.push({ art: s.wall.art, x: wx, y: wy, id: s.wall.id! });
        } else if (s.wall.kind === 'discos') {
          const n = Math.min(3, a.gold);
          for (let i = 0; i < 3; i++) i < n ? prim27.goldDisc({ ...g, p }, wx + i * 12, wy, i === 2) : prim27.poster({ ...g, p }, wx + i * 12, wy, 10, 13, i + a.seed);
          if (s.wall.id) spots.push({ id: 'discos', x: wx - 1, y: wy - 1, w: 38, h: 15 });
        } else {
          frame(p, wx, wy, s.wall.w, s.wall.h, pal, year, a.seed + sx);
        }
      }
      if (s.art) {
        const d = obj5Def(s.art);
        objs.push({ art: s.art, x: sx + Math.round((s.w - d.w) / 2), y: fy - d.h, id: s.id! });
        if (s.id === 'cama') rug(sx - 3, s.w + 6, mix(pal.fabric2, C('#8a6a5a'), 0.4));
      } else if (s.id === 'porta') {
        prim27.door({ ...g, p }, sx, fy, 14, 34);
        p.rect(sx - 2, fy - 36, 18, 2, lv(pal.trim, 2)); // batente
        back.rect(sx - 2, fy - 1, 18, 2, C('#7a5a3a')); // capacho
        spots.push({ id: 'porta', x: sx - 1, y: fy - 35, w: 16, h: 35 });
      } else if (s.id === 'sofa') {
        rug(sx - 6, s.w + 12, mix(pal.accent, C('#6a3a2a'), 0.5));
        prim27.couch({ ...g, p }, sx + 1, fy, s.w - 2, pal.fabric);
        p.rect(sx + s.w - 16, fy - 12, 6, 3, tint(pal.fabric2, 0.2)); // almofada
        spots.push({ id: 'sofa', x: sx, y: fy - 15, w: s.w, h: 15 });
      } else if (s.id === 'estante') {
        prim27.shelf({ ...g, p }, sx, y0 + 30, 24, fy - y0 - 30, year < 1985 ? 'books' : year < 2008 ? 'cds' : 'records');
        p.rect(sx - 1, y0 + 28, 26, 2, pal.woodDark);
        spots.push({ id: 'estante', x: sx - 1, y: y0 + 28, w: 26, h: fy - y0 - 28 });
      } else if (s.id === 'garagem') {
        // fica no laço de objetos
      } else if (s.id === 'voce') {
        you = { x: sx + 10, y: fy };
      } else if (s.deco) decor(s, sx);
      if (s.top) {
        // mesinha (aparador) com os objetos em cima
        const top = fy - 12;
        prim27.blk(p, sx, top, s.w, 3, pal.wood); p.rect(sx + 2, top + 3, 2, 9, pal.woodDark); p.rect(sx + s.w - 4, top + 3, 2, 9, pal.woodDark);
        prim27.blk(p, sx + 4, top + 5, s.w - 8, 4, tint(pal.wood, -0.15));
        for (const t of s.top) { const d = obj5Def(t.art); objs.push({ art: t.art, x: sx + t.dx, y: top - d.h, id: t.id }); }
      }
      x += s.w + GAP;
    }
    if (r === 'garagem') {
      const gx = rx + PADR + 56 + GAP;
      const nCars = Math.min(2, a.cars);
      for (let i = 0; i < nCars; i++) carSide31({ ...g, p }, gx + i * 48, fy - 14, a.carYears[i] ?? year - i * 6, 'own', i + 1);
      if (!nCars) { const bx = gx + 6, by = fy - 5; for (const dx of [0, 15]) p.ring(bx + dx, by, 4.5, C('#2a2a30')); p.line(bx, by, bx + 6, by - 7, C('#c8302c')); p.line(bx + 6, by - 7, bx + 13, by - 7, C('#c8302c')); p.line(bx + 13, by - 7, bx + 15, by, C('#c8302c')); p.line(bx + 6, by - 7, bx + 8, by, C('#c8302c')); }
      back.ellipse(gx + 20, fy + 1, 14, 1, withAlpha(C('#1a1414'), 80)); // mancha de óleo
    }
    rx += w;
    if (ri < rooms.length - 1) { prim27.blk(back, rx, y0, WALL, fy - y0 + 3, lv(pal.wall, 2)); back.rect(rx, fy - 30, WALL, 30, withAlpha(INK, 60)); rx += WALL; }
  });

  function decor(s: Slot, sx: number): void {
    const k = Math.floor(noise(sx, 3, a.seed) * 3);
    switch (s.deco) {
      case 'coat': // cabideiro com casaco e chapéu
        p.vline(sx + 5, fy - 30, fy - 1, pal.woodDark); p.hline(sx + 2, sx + 8, fy - 1, pal.woodDark);
        p.rect(sx + 2, fy - 28, 7, 12, year < 1960 ? C('#3a3a4a') : C('#8a4a2a')); p.rect(sx + 3, fy - 32, 5, 3, C('#2a2a30'));
        break;
      case 'lamp': // abajur de pé
        p.vline(sx + 4, fy - 26, fy - 1, pal.metalDark); p.hline(sx + 1, sx + 7, fy - 1, pal.metalDark);
        p.poly([[sx, fy - 26], [sx + 8, fy - 26], [sx + 6, fy - 32], [sx + 2, fy - 32]], year < 1960 ? C('#e8d8a8') : year < 1990 ? C('#e8902c') : C('#f0f0e8'));
        back.ellipse(sx + 4, fy - 30, 10, 9, withAlpha(C('#ffe0a0'), 26));
        break;
      case 'night': // criado-mudo com abajur
        prim27.blk(p, sx, fy - 11, 12, 11, pal.wood); p.hline(sx + 2, sx + 9, fy - 6, tint(pal.wood, -0.2)); p.rect(sx + 5, fy - 5, 2, 1, pal.gold);
        p.vline(sx + 6, fy - 16, fy - 12, pal.metalDark); p.poly([[sx + 2, fy - 16], [sx + 10, fy - 16], [sx + 8, fy - 21], [sx + 4, fy - 21]], C('#f0d8a0'));
        break;
      case 'chair': prim27.chair({ ...g, p }, sx, fy); break;
      case 'crate': // caixote de discos
        prim27.blk(p, sx + 1, fy - 9, 16, 9, pal.wood); for (let i = 0; i < 6; i++) p.rect(sx + 3 + i * 2, fy - 12, 1, 4, [pal.accent, pal.accent2, C('#1a1a22')][i % 3]);
        break;
      case 'tv': prim27.tv({ ...g, p }, sx + 3, fy); break;
      case 'low': prim27.blk(p, sx + 4, fy - 10, 38, 10, pal.wood); p.hline(sx + 6, sx + 39, fy - 5, tint(pal.wood, -0.2)); break;
      case 'plant': prim27.plant({ ...g, p }, sx + 5, fy, k !== 1); break;
      default: break; // mesinha (com o que está em cima), lugar do boneco, vaga dos carros
    }
  }

  const px = cutEnd27(c, { dim: false, facade: a.dwell === 'mansao' ? C('#e8e6dc') : a.dwell === 'casa' ? C('#d8c8a8') : facadeCol27(year, 'apartments') });
  for (const o of objs) {
    const op = obj5Px(o.art, year, a.bang?.has(o.id) ? 'new' : 'idle');
    px.blit(op, o.x - PAD5, o.y - PAD5);
    const d = obj5Def(o.art);
    spots.push({ id: o.id, x: o.x - 1, y: o.y - 1, w: d.w + 2, h: d.h + 2 });
  }
  return { px, W: c.W, H: c.H, fy, top: Math.max(0, c.top - 8), spots, you, rooms: out };
}

/** Parede de cada cômodo (por cima da parede da época que o cut27 pintou). */
function wallpaper(p: Px, r: Room5, x: number, y0: number, w: number, fy: number, pal: ReturnType<typeof cut27>['pal'], year: number, seed: number): void {
  const H = fy - y0 - 3;
  if (r === 'quarto') {
    const a = mix(pal.wall, pal.fabric2, 0.18), b = tint(a, -0.06);
    for (let yy = y0; yy < y0 + H; yy++) for (let xx = x; xx < x + w; xx++) p.put(xx, yy, (xx - x) % 6 < 3 ? a : b);
  } else if (r === 'criancas') {
    const a = mix(pal.wall, C('#a8d0f0'), 0.45);
    for (let yy = y0; yy < y0 + H; yy++) for (let xx = x; xx < x + w; xx++) p.put(xx, yy, (xx - x) % 8 === 3 && (yy - y0) % 8 === 3 ? C('#f8e070') : a);
  } else if (r === 'escritorio') {
    const a = mix(pal.wall, C('#2a4a3a'), 0.35);
    for (let yy = y0; yy < y0 + H; yy++) for (let xx = x; xx < x + w; xx++) p.put(xx, yy, yy > fy - 34 ? ((xx - x) % 10 === 0 ? lv(pal.wood, 1.6) : pal.wood) : a);
    p.hline(x, x + w - 1, fy - 35, lv(pal.woodDark, 1.2));
  } else if (r === 'garagem') {
    const block = mix(C('#8a8478'), pal.wall, 0.25);
    for (let yy = y0; yy < fy + 3; yy++) for (let xx = x; xx < x + w; xx++) {
      const ry = (yy - y0) % 6, row = Math.floor((yy - y0) / 6), off = row % 2 ? 6 : 0;
      p.put(xx, yy, yy >= fy ? lv(C('#9a968c'), 2.6) : ry === 5 || (xx - x + off) % 12 === 0 ? lv(block, 1.6) : ry === 0 ? lv(block, 3.6) : block);
    }
  } else if (year >= 1950 && year < 1990 && noise(seed, 1, 2) < 0.5) {
    // sala com meia-parede de lambri nos anos 50–80
    for (let yy = fy - 24; yy < fy - 3; yy++) for (let xx = x; xx < x + w; xx++) p.put(xx, yy, (xx - x) % 7 === 0 ? lv(pal.wood, 1.4) : tint(pal.wood, 0.12));
    p.hline(x, x + w - 1, fy - 25, pal.woodDark);
  }
}

/** Quadro emoldurado (paisagem, foto ou pôster da época). */
function frame(p: Px, x: number, y: number, w: number, h: number, pal: ReturnType<typeof cut27>['pal'], year: number, k: number): void {
  p.rect(x - 1, y - 1, w + 2, h + 2, INK);
  p.rect(x, y, w, h, year < 1950 ? C('#b08a3a') : pal.woodDark);
  const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
  for (let yy = 0; yy < ih; yy++) for (let xx = 0; xx < iw; xx++) {
    const sky = mix(C('#9ac8e8'), C('#f0c890'), yy / ih);
    const hill = yy > ih * 0.55 + Math.sin((xx + k) * 0.4) * 2;
    p.put(ix + xx, iy + yy, hill ? mix(C('#4a7a3a'), C('#2a4a2a'), yy / ih) : sky);
  }
  if (year >= 1990) p.disc(ix + iw - 4, iy + 3, 1.5, C('#fff0b0'));
}
