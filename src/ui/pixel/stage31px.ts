// R31 · onda 4 (ART) — EQUIPAMENTO DE PALCO numa fonte única, no pixel art padrão do jogo (vista lateral com um
// toque de 3/4, luz de cima à esquerda, rampa de 6 tons de `lv`, contorno INK pela camada de quem chama).
// Antes a bateria e o amplificador do palco/estúdio vinham do atlas do "pacote de equipamentos" (gear21.png:
// arte em alta resolução reduzida, com antialiasing e paleta própria) e destoavam dos bonecos e da mobília;
// as ilustrações das páginas (art27kit) tinham OUTRA bateria, menor que os bonecos. Agora:
//   drumKit31  — bateria (bumbo com pele, caixa, tons, surdo, chimbal e prato de condução), casco pela época;
//   amp31      — amplificador (tweed antes de 1965, tolex depois), alça, painel com botões, tela de pano;
//   speaker31  — caixa de som (PA / paredão do baile) com cones sombreados;
//   crowd31    — plateia de costas (cabelo, ombros na luz do palco, braços para cima);
//   bars31     — grade de cela (barra com fio de luz e lado na sombra), na frente de quem está preso.
// Tudo com coordenadas inteiras e nenhuma aleatoriedade nova (variação por `noise`/semente).

import { C, INK, Px, lv, mix, noise, type Col } from './px';

/** Mapeia um hex para a cor da época (as ilustrações tonalizam em sépia nos anos 20); padrão: a cor pura. */
export type Hex31 = (hex: string) => Col;

/** Cilindro em vista lateral (tambor): aro cromado em cima e embaixo, casco em rampa, fio de luz e canoplas. */
function drum(p: Px, x: number, y: number, w: number, h: number, shell: Col, chrome: Col, head: Col): void {
  p.hline(x, x + w - 1, y, lv(head, 4)); // pele vista de leve (3/4)
  p.hline(x, x + w - 1, y + 1, lv(chrome, 4));
  for (let yy = y + 2; yy < y + h - 1; yy++) {
    p.put(x, yy, lv(shell, 3.6));
    p.put(x + 1, yy, lv(shell, 4.4)); // reflexo do casco
    for (let xx = x + 2; xx < x + w - 1; xx++) p.put(xx, yy, lv(shell, 3));
    p.put(x + w - 1, yy, lv(shell, 2));
  }
  p.hline(x, x + w - 1, y + h - 1, lv(chrome, 2));
  if (h >= 5) for (let xx = x + 2; xx < x + w - 1; xx += 3) p.put(xx, y + 2 + ((h - 3) >> 1), lv(chrome, 4)); // canoplas
}

/** Prato (latão): linha de luz em cima, sombra embaixo e a cúpula. */
function cymbal(p: Px, x0: number, y0: number, x1: number, y1: number, brass: Col): void {
  p.line(x0, y0, x1, y1, lv(brass, 4.4));
  p.line(x0, y0 + 1, x1, y1 + 1, lv(brass, 2.4));
  const mx = Math.round((x0 + x1) / 2), my = Math.round((y0 + y1) / 2);
  p.put(mx, my - 1, lv(brass, 3.4));
}

/** Estante: haste em 2 tons e tripé. */
function stand(p: Px, x: number, top: number, fy: number, metal: Col): void {
  p.vline(x, top, fy - 1, lv(metal, 3.4));
  p.line(x, fy - 3, x - 3, fy - 1, lv(metal, 2.4)); p.line(x, fy - 3, x + 3, fy - 1, lv(metal, 2.4));
}

/**
 * Bateria com o canto esquerdo em x e o chão em fy (ocupa x-4…x+31, fy-25…fy-1; do tamanho de um boneco sentado).
 * Casco: perolado antes de 1960, cor de destaque da época até 1990, preto depois.
 */
export function drumKit31(p: Px, x: number, fy: number, year: number, accent: Col, c: Hex31 = C): void {
  const shell = year < 1960 ? c('#e8e0d0') : year < 1990 ? accent : c('#2a2a38');
  const head = c('#f0ece4'), chrome = c('#b8bcc4'), brass = c('#d8b048'), metal = c('#8a8e98');
  // chimbal (esquerda) e prato de condução (direita), atrás
  stand(p, x, fy - 21, fy, metal);
  cymbal(p, x - 4, fy - 22, x + 4, fy - 22, brass); p.hline(x - 4, x + 4, fy - 20, lv(brass, 3));
  stand(p, x + 28, fy - 24, fy, metal);
  cymbal(p, x + 23, fy - 26, x + 32, fy - 23, brass);
  // surdo (direita, no chão, pés)
  drum(p, x + 20, fy - 14, 7, 11, shell, chrome, head);
  p.vline(x + 20, fy - 3, fy - 1, lv(metal, 2.4)); p.vline(x + 26, fy - 3, fy - 1, lv(metal, 2.4));
  // bumbo de frente: aro, pele com luz em cima/esquerda, faixa com a marca da casa, esporas
  const cx = x + 13, cy = fy - 8;
  p.disc(cx, cy, 7.5, (xx, yy) => (xx + yy < cx + cy - 6 ? lv(shell, 4) : xx + yy > cx + cy + 5 ? lv(shell, 2) : lv(shell, 3)));
  p.disc(cx, cy, 6, (xx, yy) => (xx + yy < cx + cy - 5 ? lv(head, 5) : xx + yy > cx + cy + 4 ? lv(head, 2.6) : head));
  for (let a = 0; a < 8; a++) p.put(Math.round(cx - 0.5 + Math.cos((a * Math.PI) / 4) * 7), Math.round(cy - 0.5 + Math.sin((a * Math.PI) / 4) * 7), lv(chrome, 4)); // garras do aro
  if (year >= 1950) { p.rect(cx - 4, cy - 1, 8, 3, lv(year < 1960 ? c('#8a1c24') : accent, 2.4)); p.hline(cx - 3, cx + 2, cy, lv(head, 4)); } // marca
  p.line(x + 6, fy - 3, x + 4, fy - 1, lv(metal, 2.4)); p.line(x + 20, fy - 3, x + 22, fy - 1, lv(metal, 2.4));
  // tons no bumbo
  drum(p, x + 6, fy - 21, 6, 6, shell, chrome, head);
  drum(p, x + 14, fy - 22, 7, 6, shell, chrome, head);
  p.vline(x + 13, fy - 16, fy - 15, lv(metal, 3.4));
  // caixa (esquerda, na estante)
  drum(p, x + 1, fy - 14, 7, 5, shell === head ? c('#c8ccd0') : lv(shell, 3.4), chrome, head);
  stand(p, x + 4, fy - 9, fy, metal);
}

/** Amplificador com o canto esquerdo em x e o chão em fy. Grande: 16×18 (com alça); pequeno: 11×12. */
export function amp31(p: Px, x: number, fy: number, year: number, big: boolean, c: Hex31 = C): void {
  const w = big ? 16 : 11, h = big ? 18 : 12, y = fy - h;
  const tweed = year < 1965;
  const body = tweed ? c('#c8a46a') : c('#2a2830');
  const grill = tweed ? c('#7a5a3a') : c('#5a5862');
  const plate = tweed ? c('#d8c8a0') : c('#c8a24a');
  // caixa: tweed listrado na diagonal / tolex liso; luz em cima e à esquerda, sombra embaixo e à direita
  for (let yy = y; yy < fy; yy++) for (let xx = x; xx < x + w; xx++) {
    let col = tweed && (xx + yy) % 3 === 0 ? lv(body, 2.6) : body;
    if (yy === y) col = lv(body, 4.4); else if (xx === x) col = lv(body, 3.8); else if (xx === x + w - 1) col = lv(body, 2); else if (yy === fy - 1) col = lv(body, 1.2);
    p.put(xx, yy, col);
  }
  // painel de controle com botões
  p.hline(x + 1, x + w - 2, y + 2, lv(plate, 4)); p.hline(x + 1, x + w - 2, y + 3, lv(plate, 2.6));
  for (let xx = x + 3; xx < x + w - 2; xx += 2) p.put(xx, y + 3, INK);
  // tela de pano: trama em xadrez fino, cone do falante adivinhado atrás
  const gx = x + 2, gy = y + 5, gw = w - 4, gh = h - 7;
  const ccx = gx + gw / 2, ccy = gy + gh / 2, rr = Math.min(gw, gh) / 2 - 0.5;
  for (let yy = gy; yy < gy + gh; yy++) for (let xx = gx; xx < gx + gw; xx++) {
    const d = Math.hypot(xx + 0.5 - ccx, yy + 0.5 - ccy);
    let col = (xx + yy) % 2 ? grill : lv(grill, 2.6);
    if (d < rr && d > rr - 1.2) col = lv(grill, 1.8);
    if (yy === gy) col = lv(grill, 1.4); // sombra da moldura em cima
    p.put(xx, yy, col);
  }
  p.rect(gx + 1, gy + 1, 3, 1, lv(plate, 4.4)); // plaquinha da marca
  if (big) {
    p.hline(x + 5, x + w - 6, y - 2, lv(c('#1a1a1e'), 3)); p.put(x + 4, y - 1, lv(c('#1a1a1e'), 2)); p.put(x + w - 5, y - 1, lv(c('#1a1a1e'), 2)); // alça
    for (const [cx0, cy0] of [[x, y], [x + w - 1, y], [x, fy - 1], [x + w - 1, fy - 1]] as const) p.put(cx0, cy0, lv(c('#b8bcc4'), 4)); // cantoneiras
  }
}

/** Caixa de som (PA / paredão): gabinete, cones com cúpula e luz em cima à esquerda, corneta em cima se couber. */
export function speaker31(p: Px, x: number, fy: number, w: number, h: number, c: Hex31 = C): void {
  const y = fy - h, body = c('#1e1c22'), cone = c('#3a3842');
  for (let yy = y; yy < fy; yy++) for (let xx = x; xx < x + w; xx++)
    p.put(xx, yy, yy === y ? lv(body, 4.4) : xx === x ? lv(body, 3.8) : xx === x + w - 1 ? lv(body, 2) : yy === fy - 1 ? lv(body, 1.2) : body);
  const r = Math.max(2, Math.min(5, Math.floor(w / 2) - 1));
  const n = Math.max(1, Math.floor((h - 4) / (2 * r + 3)));
  const top = h - n * (2 * r + 3) >= 7 ? 6 : 1;
  if (top === 6) { p.rect(x + 2, y + 2, w - 4, 3, lv(cone, 1.6)); p.hline(x + 3, x + w - 4, y + 3, lv(cone, 3.6)); } // corneta
  for (let i = 0; i < n; i++) {
    const cx = x + w / 2, cy = y + top + 1 + r + i * (2 * r + 3);
    p.disc(cx, cy, r + 0.5, lv(cone, 1.4)); // borda de espuma
    p.disc(cx, cy, r - 0.5, (xx, yy) => (xx + yy < cx + cy - r ? lv(cone, 4) : xx + yy > cx + cy + r - 1 ? lv(cone, 2) : cone));
    p.disc(cx, cy, Math.max(1, r / 2.5), lv(cone, 4.6)); // cúpula
  }
}

/**
 * Plateia de costas com a luz do palco nos ombros e cabelos (desenha em `p`; quem chama contorna com INK).
 * Gente de pé em duas fileiras, alguns braços para cima; roupas pela época.
 */
export function crowd31(p: Px, x0: number, w: number, n: number, fy: number, year: number, seed: number): void {
  const cloth = (year < 1946 ? ['#4a3a30', '#5a4a3a', '#3a3a44', '#6a5640'] : year < 1968 ? ['#3a4a76', '#7a3434', '#3a3a44', '#5a5a44'] : year < 1990 ? ['#3a3a48', '#5a3a6a', '#2e3e5a', '#6a3a3a'] : ['#30343e', '#3a4460', '#5a3a5a', '#2e3a30']).map((h) => C(h));
  const hairs = ['#1e1814', '#3d2616', '#6e4426', '#cfc9bf', '#dcb862', '#1e1814'].map((h) => C(h));
  const skins = ['#f6d3b3', '#e0aa7e', '#a8714a', '#6e4528'].map((h) => C(h));
  const warm = C('#ffd8a0');
  for (let i = 0; i < n; i++) {
    const row = i % 2;
    const cx = x0 + Math.round((w * (i + 0.5)) / n) + (row ? 3 : 0), by = fy + 2 - row * 2;
    const hh = 10 + Math.floor(noise(i, row, seed) * 3); // baixos o bastante para a banda no palco aparecer acima
    const col = cloth[Math.floor(noise(i, 3, seed) * cloth.length)], hair = hairs[Math.floor(noise(i, 5, seed) * hairs.length)], skin = skins[Math.floor(noise(i, 7, seed) * skins.length)];
    const top = by - hh;
    // tronco com ombros arredondados (largura de um boneco): borda esquerda na luz, direita na sombra, ombros na luz do palco
    for (let yy = top; yy < by; yy++) for (let xx = cx - 5; xx <= cx + 5; xx++) {
      if (yy === top && (xx <= cx - 4 || xx >= cx + 4)) continue;
      if (yy === top + 1 && (xx === cx - 5 || xx === cx + 5)) continue;
      let cc = xx <= cx - 4 ? lv(col, 3.6) : xx >= cx + 4 ? lv(col, 2) : yy > by - 4 ? lv(col, 2.4) : col;
      if (yy <= top + 1) cc = mix(lv(col, 4), warm, 0.3);
      p.put(xx, yy, cc);
    }
    p.vline(cx, top + 3, by - 2, lv(col, 2.2)); // vinco das costas
    // nuca e cabeça de trás (8×8, como a dos bonecos): cabelo com brilho em cima, orelhas
    p.rect(cx - 1, top - 1, 3, 1, lv(skin, 2.6));
    p.rect(cx - 4, top - 8, 8, 7, hair);
    p.hline(cx - 3, cx + 2, top - 9, lv(hair, 3.4));
    p.hline(cx - 3, cx + 1, top - 8, mix(lv(hair, 4.4), warm, 0.25)); p.put(cx - 4, top - 7, lv(hair, 4));
    p.vline(cx + 3, top - 7, top - 2, lv(hair, 1.6));
    p.put(cx - 5, top - 4, skin); p.put(cx - 5, top - 5, skin); p.put(cx + 4, top - 4, lv(skin, 2.4)); p.put(cx + 4, top - 5, lv(skin, 2.4));
    // braço para cima (um em cada ~cinco)
    if (noise(i, 11, seed) < 0.22) { p.rect(cx + 5, top - 10, 2, 11, col); p.put(cx + 5, top - 10, lv(col, 3.8)); p.rect(cx + 5, top - 13, 2, 3, skin); p.put(cx + 5, top - 13, lv(skin, 4)); }
  }
}

/**
 * Grade de uma cela (x…x+w-1, y…fy-1): barras de ferro a cada 5 px com fio de luz à esquerda e lado na sombra,
 * travessa e trilhos com relevo. Fica NA FRENTE de quem está preso (entre as barras se vê a pessoa).
 */
export function bars31(p: Px, x: number, y: number, w: number, fy: number, c: Hex31 = C): void {
  const iron = c('#6a6e78');
  for (let bx = x + 3; bx < x + w - 3; bx += 5) { p.vline(bx, y + 2, fy - 2, lv(iron, 4.2)); p.vline(bx + 1, y + 2, fy - 2, lv(iron, 1.6)); }
  for (const ry of [y, Math.round(y + (fy - y) * 0.3), fy - 2]) {
    p.hline(x + 1, x + w - 2, ry, lv(iron, 4.4)); p.hline(x + 1, x + w - 2, ry + 1, lv(iron, 2.2));
  }
  p.rect(x + w - 6, Math.round(y + (fy - y) * 0.55), 3, 4, lv(iron, 3)); p.put(x + w - 5, Math.round(y + (fy - y) * 0.55) + 1, INK); // fechadura
}
