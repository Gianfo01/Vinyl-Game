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

// ---------------------------------------------------------------- R31 (POL) instrumentos e presentes da loja
// Mesma fonte única (vista lateral, luz de cima à esquerda, rampa lv, contorno INK pela camada de quem chama).
// Cada peça tem uma "faixa" onde fica na loja: pendurada na parede, de pé no chão ou em cima da mesa de vitrine.

export type InstBand31 = 'wall' | 'floor' | 'table';
export interface InstSpec31 { band: InstBand31; w: number; h: number }
const SPEC31: Record<string, InstSpec31> = {
  parlor_guitar: { band: 'wall', w: 11, h: 28 }, archtop: { band: 'wall', w: 11, h: 28 }, solid_body: { band: 'wall', w: 11, h: 28 }, electric_bass: { band: 'wall', w: 11, h: 32 },
  ukulele: { band: 'wall', w: 7, h: 18 }, cavaquinho: { band: 'wall', w: 7, h: 19 }, mandolin: { band: 'wall', w: 9, h: 20 }, banjo: { band: 'wall', w: 11, h: 27 }, violin: { band: 'wall', w: 7, h: 21 },
  trumpet: { band: 'wall', w: 17, h: 7 }, cornet: { band: 'wall', w: 14, h: 7 }, clarinet: { band: 'wall', w: 5, h: 23 },
  upright_piano: { band: 'floor', w: 26, h: 26 }, hammond: { band: 'floor', w: 24, h: 24 }, analog_synth: { band: 'floor', w: 26, h: 18 }, drum_kit: { band: 'floor', w: 36, h: 26 },
  snare: { band: 'floor', w: 10, h: 15 }, double_bass: { band: 'floor', w: 13, h: 40 }, sax: { band: 'floor', w: 11, h: 25 }, tube_amp: { band: 'floor', w: 16, h: 20 },
  ribbon_mic: { band: 'floor', w: 9, h: 32 }, condenser_mic: { band: 'floor', w: 9, h: 32 }, dj_decks: { band: 'floor', w: 30, h: 15 },
  accordion: { band: 'table', w: 16, h: 14 }, harmonica: { band: 'table', w: 9, h: 3 }, modular: { band: 'table', w: 16, h: 13 }, midi_ctrl: { band: 'table', w: 15, h: 5 },
  sampler: { band: 'table', w: 12, h: 7 }, drum_machine: { band: 'table', w: 13, h: 6 }, fuzz: { band: 'table', w: 6, h: 5 },
  flowers: { band: 'table', w: 9, h: 14 }, cigars: { band: 'table', w: 12, h: 5 }, wine: { band: 'table', w: 4, h: 13 }, champagne: { band: 'table', w: 4, h: 13 },
  pocket_watch: { band: 'table', w: 8, h: 8 }, wristwatch: { band: 'table', w: 8, h: 6 }, fountain_pen: { band: 'table', w: 11, h: 4 }, silk_scarf: { band: 'table', w: 11, h: 5 },
  perfume: { band: 'table', w: 6, h: 9 }, rare_book: { band: 'table', w: 10, h: 6 }, record_box: { band: 'table', w: 13, h: 9 }, headphones: { band: 'table', w: 10, h: 10 },
};
const FAMSPEC31: Record<string, string> = { guitar: 'solid_body', bass: 'electric_bass', drums: 'snare', keys: 'analog_synth', strings: 'violin', horns: 'trumpet', mic: 'condenser_mic', dj: 'dj_decks', studio: 'sampler', gift: 'cigars' };
/** Qual desenho usar para um item (id do catálogo; sem desenho próprio, o da família). */
export const instKind31 = (id: string, fam = 'guitar'): string => (SPEC31[id] ? id : FAMSPEC31[fam] ?? 'cigars');
export const instSpec31 = (id: string, fam?: string): InstSpec31 => SPEC31[instKind31(id, fam)];

const fillR = (p: Px, x: number, y: number, w: number, h: number, c: Col) => { // retângulo com luz em cima/esquerda e sombra embaixo/direita
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) p.put(xx, yy, yy === y ? lv(c, 4.2) : xx === x ? lv(c, 3.7) : xx === x + w - 1 || yy === y + h - 1 ? lv(c, 2) : c);
};
const bulb = (p: Px, cx: number, cy: number, r: number, c: Col) => p.disc(cx, cy, r, (xx, yy) => (xx + yy < cx + cy - r * 0.6 ? lv(c, 4.2) : xx + yy > cx + cy + r * 0.5 ? lv(c, 2) : c));

/** Desenha o item com o canto de cima à esquerda em (x, y) — o tamanho é o de instSpec31. `k` varia a cor. */
export function inst31(p: Px, id: string, x: number, y: number, year: number, k = 0, c: Hex31 = C): void {
  const kind = SPEC31[id] ? id : 'cigars';
  const { w, h } = SPEC31[kind];
  const wood = [c('#c88a48'), c('#a8622a'), c('#d8a860'), c('#7a4a2a')][k % 4], sun = c('#e0a040'), dark = c('#2a2228'), metal = c('#b8bcc4'), brass = c('#d8b048');
  const cx = x + (w >> 1);
  const neck = (len: number, top: number, col = c('#5a3a22')) => { p.rect(cx, top + 3, 1, len, lv(col, 3.4)); p.rect(cx - 1, top, 3, 3, dark); p.put(cx - 1, top + 1, metal); p.put(cx + 1, top + 1, metal); };
  switch (kind) {
    case 'parlor_guitar': case 'archtop': case 'ukulele': case 'cavaquinho': {
      const small = kind === 'ukulele' || kind === 'cavaquinho', nl = small ? 6 : 10, r1 = small ? 2.5 : 3.6, r2 = small ? 3.2 : 4.8;
      const body = kind === 'archtop' ? sun : wood;
      neck(nl, y);
      const by = y + 3 + nl;
      bulb(p, cx, by + r1, r1, body); bulb(p, cx, by + r1 * 2 + r2 - 1, r2, body);
      if (kind === 'archtop') { p.vline(cx - 2, by + 5, by + 8, dark); p.vline(cx + 2, by + 5, by + 8, dark); p.disc(cx, by + r1 * 2 + r2 - 1, r2 - 1.6, (xx, yy) => ((xx - cx) ** 2 + (yy - by - 12) ** 2 < 4 ? sun : lv(sun, 2.4))); }
      else p.disc(cx, by + Math.round(r1 * 2) - 1, small ? 0.9 : 1.3, dark); // boca
      p.hline(cx - 2, cx + 2, Math.min(y + h - 3, by + Math.round(r1 * 2 + r2 + 1)), lv(dark, 3)); // cavalete
      break;
    }
    case 'solid_body': case 'electric_bass': {
      const bass = kind === 'electric_bass', nl = bass ? 15 : 11;
      const body = [c('#c8302c'), c('#2a5ab0'), c('#e8e0d0'), c('#1e1e24')][k % 4];
      neck(nl, y, c('#c89a5a'));
      const by = y + 3 + nl;
      for (let yy = 0; yy < 13; yy++) { // corpo com dois chifres (cutaway duplo)
        const half = yy < 3 ? (yy % 2 ? 3 : 2) : yy < 5 ? 3 : 5 - (yy > 10 ? yy - 10 : 0);
        for (let xx = -half; xx <= half; xx++) { if (yy < 3 && Math.abs(xx) < 2) continue; p.put(cx + xx, by + yy, xx <= -half + 0 ? lv(body, 4) : xx >= half ? lv(body, 2) : body); }
      }
      p.rect(cx + 1, by + 4, 3, 6, c('#f0ece0')); // escudo
      p.hline(cx - 2, cx + 2, by + 6, metal); p.hline(cx - 2, cx + 2, by + 9, metal); // captadores
      p.put(cx + 3, by + 10, metal);
      break;
    }
    case 'mandolin': { neck(7, y); bulb(p, cx, y + 15, 4, wood); bulb(p, cx, y + 12, 2.6, wood); p.disc(cx, y + 13, 0.9, dark); p.hline(cx - 1, cx + 1, y + 17, dark); break; }
    case 'banjo': { neck(12, y); p.disc(cx, y + 21, 5.5, lv(metal, 2.4)); p.disc(cx, y + 21, 4.5, (xx, yy) => (xx + yy < cx + y + 18 ? c('#fbf6ea') : c('#e0d8c4'))); p.hline(cx - 2, cx + 2, y + 23, wood); break; }
    case 'violin': {
      p.rect(cx - 1, y, 2, 3, lv(wood, 2)); p.put(cx + 1, y, lv(wood, 1.4)); // voluta
      p.rect(cx, y + 3, 1, 6, dark);
      bulb(p, cx, y + 11, 2.6, wood); bulb(p, cx, y + 17, 3.2, wood); p.hline(cx - 1, cx + 1, y + 14, lv(wood, 2.2));
      p.put(cx - 1, y + 15, dark); p.put(cx + 1, y + 15, dark); p.vline(cx, y + 10, y + 19, dark); // efes e espelho
      break;
    }
    case 'trumpet': case 'cornet': {
      const L = w - 1;
      p.hline(x, x + L - 5, y + 3, lv(brass, 4.2)); p.hline(x, x + L - 5, y + 4, lv(brass, 2.6)); // tubo
      p.rect(x + 3, y + 1, L - 10, 2, brass); p.rect(x + 3, y + 5, L - 10, 1, lv(brass, 2.2)); // volta do tubo
      for (let i = 0; i < 3; i++) { p.vline(x + 6 + i * 2, y, y + 2, metal); } // pistos
      p.poly([[x + L - 5, y + 2], [x + L, y], [x + L, y + 7], [x + L - 5, y + 5]], brass); p.vline(x + L, y, y + 6, lv(brass, 4.6)); // campana
      p.put(x, y + 3, metal); // bocal
      break;
    }
    case 'clarinet': { p.rect(cx - 1, y, 2, h - 3, dark); p.vline(cx - 1, y, y + h - 4, lv(dark, 4)); for (let i = 3; i < h - 4; i += 3) p.put(cx, y + i, metal); p.rect(cx - 2, y + h - 3, 4, 3, dark); p.hline(cx - 2, cx + 1, y + h - 3, lv(dark, 4)); break; }
    case 'sax': {
      const fy = y + h;
      p.vline(cx - 3, fy - 6, fy - 1, metal); p.hline(cx - 5, cx, fy - 1, metal); // suporte
      p.rect(cx - 1, y + 1, 2, 4, brass); p.line(cx - 1, y + 1, cx - 4, y, lv(dark, 3)); // tudel e boquilha
      for (let yy = y + 5; yy < fy - 6; yy++) { const ww = 2 + Math.floor((yy - y) / 7); p.hline(cx - 1, cx - 1 + ww, yy, lv(brass, 3)); p.put(cx - 1, yy, lv(brass, 4.2)); }
      p.ellipse(cx + 2, fy - 6, 3.5, 2.5, brass); p.rect(cx + 3, fy - 13, 3, 6, brass); p.hline(cx + 2, cx + 6, fy - 14, lv(brass, 4.6)); // curva e campana
      for (let i = 0; i < 4; i++) p.put(cx + 1, y + 8 + i * 3, lv(metal, 4)); // chaves
      break;
    }
    case 'upright_piano': {
      const pw = c('#4a2a1a'), fy = y + h;
      fillR(p, x, fy - 22, 26, 14, pw);
      p.rect(x + 1, fy - 9, 24, 2, c('#f2ece0')); for (let i = x + 2; i < x + 25; i += 2) p.put(i, fy - 9, INK);
      p.rect(x + 2, fy - 7, 2, 7, pw); p.rect(x + 22, fy - 7, 2, 7, pw);
      p.rect(x + 4, fy - 20, 18, 1, lv(pw, 4)); p.rect(x + 9, fy - 26, 6, 4, c('#f0e8d0'));
      break;
    }
    case 'hammond': {
      const pw = c('#6a3a1e'), fy = y + h;
      fillR(p, x, fy - 24, 24, 12, pw);
      p.rect(x + 2, fy - 21, 20, 2, c('#f2ece0')); p.rect(x + 2, fy - 17, 20, 2, c('#f2ece0'));
      for (let i = x + 3; i < x + 22; i += 2) { p.put(i, fy - 21, INK); p.put(i, fy - 17, INK); }
      for (let i = 0; i < 6; i++) p.vline(x + 5 + i * 2, fy - 24, fy - 23, [c('#7a3a2a'), c('#f0e8d0'), dark][i % 3]); // barras
      p.rect(x + 2, fy - 12, 2, 12, pw); p.rect(x + 20, fy - 12, 2, 12, pw); p.hline(x + 2, x + 21, fy - 2, lv(pw, 2)); // pedaleira
      break;
    }
    case 'analog_synth': {
      const fy = y + h, panel = year < 1990 ? c('#3a2e28') : c('#2a2a30');
      p.line(x + 6, fy - 1, x + 20, fy - 9, metal); p.line(x + 20, fy - 1, x + 6, fy - 9, metal); // estante em X
      fillR(p, x, fy - 18, 26, 9, panel);
      for (let i = 0; i < 6; i++) p.put(x + 3 + i * 4, fy - 16, [c('#e8b048'), c('#f0ece0'), c('#e85a4a')][i % 3]); // botões
      p.rect(x + 1, fy - 13, 24, 3, c('#f2ece0')); for (let i = x + 2; i < x + 25; i += 2) p.put(i, fy - 13, INK);
      if (year < 1985) { p.rect(x - 1, fy - 18, 2, 9, c('#8a5a2a')); p.rect(x + 25, fy - 18, 2, 9, c('#8a5a2a')); } // laterais de madeira
      break;
    }
    case 'drum_kit': drumKit31(p, x + 4, y + h, year, [c('#a02030'), c('#2a5ab0'), c('#e0b040'), c('#3a7a4a')][k % 4], c); break;
    case 'snare': { const fy = y + h; drum(p, x + 1, fy - 15, 8, 6, c('#c8ccd0'), metal, c('#f0ece4')); p.vline(cx, fy - 9, fy - 1, lv(metal, 3)); p.line(cx, fy - 3, cx - 4, fy - 1, lv(metal, 2.4)); p.line(cx, fy - 3, cx + 4, fy - 1, lv(metal, 2.4)); p.line(x + 2, fy - 16, x + 6, fy - 19, lv(wood, 3.6)); p.line(x + 5, fy - 16, x + 9, fy - 18, lv(wood, 3.6)); break; }
    case 'double_bass': {
      const fy = y + h, b = c('#7a3a1a');
      p.rect(cx - 1, y, 3, 3, lv(b, 2)); p.rect(cx, y + 3, 1, 14, dark);
      bulb(p, cx, y + 21, 4.5, b); bulb(p, cx, y + 30, 6, b);
      p.put(cx - 2, y + 26, dark); p.put(cx + 2, y + 26, dark); p.vline(cx, y + 17, y + 30, dark); p.hline(cx - 2, cx + 2, y + 32, lv(b, 4.4));
      p.vline(cx, y + 36, fy - 1, metal); // espigão
      break;
    }
    case 'tube_amp': amp31(p, x, y + h, year, true, c); break;
    case 'ribbon_mic': case 'condenser_mic': {
      const fy = y + h;
      p.vline(cx, y + 8, fy - 2, lv(metal, 3.4)); p.line(cx, fy - 3, cx - 4, fy - 1, lv(metal, 2.4)); p.line(cx, fy - 3, cx + 4, fy - 1, lv(metal, 2.4));
      if (kind === 'ribbon_mic') { fillR(p, cx - 2, y, 5, 8, c('#c8ccd0')); for (let yy = y + 1; yy < y + 7; yy += 2) p.hline(cx - 1, cx + 1, yy, c('#6a6e78')); }
      else { p.rect(cx - 2, y, 4, 8, c('#c8b880')); p.hline(cx - 2, cx + 1, y, lv(c('#c8b880'), 4.4)); p.rect(cx - 1, y + 2, 2, 4, c('#8a8060')); p.ring(cx, y + 4, 3, lv(metal, 2.4)); }
      break;
    }
    case 'dj_decks': {
      const fy = y + h, t = c('#2a2a30');
      fillR(p, x, fy - 15, 30, 4, t); p.rect(x + 2, fy - 11, 2, 11, lv(t, 2.4)); p.rect(x + 26, fy - 11, 2, 11, lv(t, 2.4)); // mesa
      for (const dx of [x + 1, x + 19]) { fillR(p, dx, fy - 18, 10, 3, c('#9a9aa2')); p.ellipse(dx + 5, fy - 18, 4, 1, INK); p.put(dx + 8, fy - 19, metal); }
      fillR(p, x + 12, fy - 18, 6, 3, dark); p.put(x + 14, fy - 17, c('#7af0a0')); p.put(x + 16, fy - 17, c('#e85a4a'));
      break;
    }
    case 'accordion': {
      const red = [c('#b8282c'), c('#2a5a3a'), c('#1e1e24')][k % 3];
      fillR(p, x, y + 2, 4, 12, c('#f2ece0')); for (let yy = y + 3; yy < y + 13; yy += 2) p.hline(x + 1, x + 2, yy, INK); // teclado
      for (let xx = x + 4; xx < x + 12; xx++) { const fold = (xx - x) % 2; p.vline(xx, y + 1 + fold, y + 14 - fold, fold ? lv(red, 2) : lv(red, 3.8)); } // fole com dobras
      fillR(p, x + 12, y + 2, 4, 12, red); for (let yy = y + 4; yy < y + 13; yy += 3) p.put(x + 14, yy, c('#f2ece0')); // botões do baixo
      p.hline(x + 4, x + 11, y, lv(dark, 3)); // alça
      break;
    }
    case 'harmonica': { fillR(p, x, y, 9, 3, metal); for (let i = x + 1; i < x + 8; i += 2) p.put(i, y + 1, INK); break; }
    case 'modular': { fillR(p, x, y, 16, 13, c('#2a2a30')); for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { p.rect(x + 1 + i * 4, y + 1 + r * 6, 3, 5, c('#c8ccd0')); p.put(x + 2 + i * 4, y + 2 + r * 6, INK); } p.line(x + 3, y + 4, x + 10, y + 9, c('#e85a8a')); p.line(x + 6, y + 3, x + 14, y + 8, c('#35e0e0')); break; }
    case 'midi_ctrl': { fillR(p, x, y, 15, 5, c('#2a2a30')); p.rect(x + 1, y + 2, 13, 2, c('#f2ece0')); for (let i = x + 2; i < x + 14; i += 2) p.put(i, y + 2, INK); for (let i = 0; i < 4; i++) p.put(x + 2 + i * 3, y + 1, i % 2 ? c('#ff4fa3') : c('#35e0e0')); break; }
    case 'sampler': case 'drum_machine': { fillR(p, x, y, w, h, kind === 'sampler' ? c('#d8d0bc') : c('#3a3a42')); for (let i = 0; i < 4; i++) p.rect(x + 2 + i * 3, y + h - 3, 2, 2, [c('#e85a4a'), c('#e8b048'), c('#f0ece0'), c('#7ad070')][i]); p.rect(x + 2, y + 1, 5, 2, c('#7af0a0')); break; }
    case 'fuzz': { fillR(p, x, y + 1, 6, 4, [c('#3aa040'), c('#c8302c'), c('#e8b030')][k % 3]); p.put(x + 2, y, metal); p.put(x + 4, y + 2, c('#f0ece0')); break; }
    case 'flowers': { fillR(p, x + 2, y + 8, 5, 6, c('#4a7ab0')); p.vline(x + 4, y + 4, y + 8, c('#3a8a3a')); p.line(x + 4, y + 7, x + 1, y + 4, c('#3a8a3a')); p.line(x + 4, y + 7, x + 7, y + 3, c('#3a8a3a')); for (const [fx, fy0, col] of [[x + 1, y + 3, '#e84a6a'], [x + 4, y + 1, '#f0d040'], [x + 7, y + 2, '#e8e0f0']] as const) bulb(p, fx, fy0, 1.4, c(col)); break; }
    case 'cigars': { fillR(p, x, y, 12, 5, c('#8a4a24')); p.rect(x + 2, y + 1, 8, 2, c('#e8c060')); p.put(x + 5, y + 1, c('#c8302c')); break; }
    case 'wine': case 'champagne': { const b = kind === 'wine' ? c('#3a1a24') : c('#2a4a2a'); p.rect(x + 1, y, 2, 4, kind === 'champagne' ? brass : b); fillR(p, x, y + 4, 4, 9, b); p.rect(x, y + 7, 4, 3, c('#f0e8d0')); break; }
    case 'pocket_watch': case 'wristwatch': { fillR(p, x, y + h - 4, 8, 4, c('#3a2a4a')); bulb(p, x + 4, y + h - 5, 2.5, kind === 'pocket_watch' ? brass : metal); p.put(x + 4, y + h - 5, INK); if (kind === 'pocket_watch') p.vline(x + 4, y, y + 2, brass); break; }
    case 'fountain_pen': { fillR(p, x, y + 1, 11, 3, c('#2a2a40')); p.hline(x + 1, x + 8, y + 2, c('#1a1a1e')); p.put(x + 9, y + 2, brass); break; }
    case 'silk_scarf': { fillR(p, x, y, 11, 5, c('#c84a8a')); for (let i = x + 1; i < x + 10; i += 3) p.vline(i, y + 1, y + 3, c('#f0d040')); break; }
    case 'perfume': { p.rect(x + 2, y, 2, 3, brass); fillR(p, x, y + 3, 6, 6, c('#e8a8c8')); p.put(x + 1, y + 4, c('#ffffff')); break; }
    case 'rare_book': { fillR(p, x, y, 10, 6, c('#6a2a2a')); p.hline(x + 1, x + 8, y + 5, c('#f0e8d0')); p.rect(x + 3, y + 2, 4, 1, brass); break; }
    case 'record_box': { fillR(p, x, y + 2, 13, 7, c('#9a6a3a')); for (let i = x + 1; i < x + 12; i++) p.vline(i, y, y + 3, [c('#2a2228'), c('#c8302c'), c('#e8e0d0'), c('#2a5ab0')][i % 4]); break; }
    case 'headphones': { p.ring(cx, y + 5, 4.5, dark); p.rect(x, y + 4, 3, 6, dark); p.rect(x + w - 3, y + 4, 3, 6, dark); p.put(x + 1, y + 5, lv(dark, 4.4)); p.put(x + w - 2, y + 5, lv(dark, 4.4)); break; }
  }
}
