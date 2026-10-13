// Exemplos para aprovação do padrão visual (profundidade e acabamento) antes de produzir em escala.

import { C } from '../../../src/ui/pixel/px';
import { GLOW, KX, KY, M, P, type Kit, type Pt } from '../kit';
import type { PropDef } from '../types';

export const AMOSTRA: PropDef[] = [
  {
    n: 102,
    id: 'amplificador_valvulado',
    jogo: 36,
    nome: 'Amplificador valvulado',
    name: 'Tube amp',
    cat: 'palco',
    era: [1955, 2040],
    draw(k: Kit) {
      const x = 34, y = 226, w = 150, h = 136, d = 58;
      // gabinete com cantos arredondados e couro (tolex)
      k.rbox(x, y, w, h, d, 7, 'black', { front: { mat: 'black', l: 0.5, grad: -0.14, tex: 'leather' }, wall: { tex: 'leather' } });
      // cantoneiras de latão
      k.corner(x, y - h, 11, 'tl');
      k.corner(x + w, y - h, 11, 'tr');
      k.corner(x, y, 11, 'bl');
      k.corner(x + w, y, 11, 'br');
      // pés de borracha
      for (const fx of [x + 10, x + w - 22]) k.rbox(fx, y + 5, 12, 5, 8, 2, 'rubber', { cast: 0 });
      // painel de controle (recuado, vinho) com moldura dourada
      k.rbox(x + 8, y - h + 38, w - 16, 26, 3, 2, 'gold', { front: { mat: 'gold', l: 0.62 } });
      k.rect(x + 10, y - h + 14, w - 20, 22, { mat: 'velvet', l: 0.42, grad: -0.2 }, { cast: 0 });
      for (let i = 0; i < 6; i++) k.disc(x + 34 + i * 18, y - h + 25, 5, 4.5, 3, 'black', { front: { mat: 'black', l: 0.6, shade: 'sphere' } });
      for (let i = 0; i < 6; i++) k.line(x + 34 + i * 18, y - h + 25, x + 32 + i * 18, y - h + 22, M.cream[6]);
      k.led(x + 20, y - h + 25, GLOW.red, 1, 5);
      // tela do alto-falante recuada com friso
      k.rbox(x + 9, y - 9, w - 18, h - 56, 2, 3, 'gold', { front: { mat: 'gold', l: 0.6 } });
      k.rect(x + 12, y - h + 50, w - 24, h - 62, { mat: 'woodLight', l: 0.5, tex: 'mesh', fn: (u, v, _s, t) => 0.55 - t * 0.18 + (Math.floor(u) % 3 === 0 || Math.floor(v) % 3 === 0 ? -0.16 : 0.03) }, { cast: 0 });
      // logotipo
      k.rbox(x + w / 2 - 16, y - 18, 32, 7, 2, 2, 'chrome', { front: { mat: 'chrome', l: 0.7 } });
      // alça de couro
      k.tube([[x + 52, y - h - 1], [x + 58, y - h - 12], [x + 92, y - h - 12], [x + 98, y - h - 1]], 6, 'leather', { l: 0.6 });
      for (const hx of [x + 50, x + 96]) k.rbox(hx, y - h + 1, 8, 4, 10, 1, 'chrome');
    },
  },
  {
    n: 103,
    id: 'telefone_disco_1950',
    jogo: 18,
    nome: 'Telefone de disco',
    name: 'Rotary phone',
    cat: 'escritorio',
    era: [1935, 1985],
    draw(k: Kit) {
      // base baixa e larga
      k.rbox(34, 226, 164, 18, 74, 6, 'black', { front: { mat: 'black', l: 0.42, grad: -0.2 } });
      // corpo em 3D: rampa frontal (onde fica o disco), platô de trás e lateral direita
      const q = (x: number, yy: number, z: number) => P(44, 208, x, yy, z);
      const W = 144;
      k.group(() => {
        // lateral direita (perfil: rampa, platô, parede de trás)
        k.poly([q(W, 0, 0), q(W, 52, 34), q(W, 52, 56), q(W, 0, 56)], { mat: 'black', l: 0.24, grad: 0.08 });
        // rampa frontal
        k.poly([q(0, 0, 0), q(W, 0, 0), q(W, 52, 34), q(0, 52, 34)], { mat: 'black', l: 0.6, grad: -0.14, gradX: -0.08 });
        // platô
        k.poly([q(0, 52, 34), q(W, 52, 34), q(W, 52, 56), q(0, 52, 56)], { mat: 'black', l: 0.86 });
        // brilho na quina rampa/platô
        const [ax, ay] = q(0, 52, 34);
        for (let i = 1; i < W - 1; i++) k.px(ax + i, ay, M.black[7]);
      });
      // disco cromado sobre a face inclinada
      const cx = 124;
      const cy = 178;
      k.disc(cx, cy, 40, 24, 4, 'chrome', { front: { mat: 'chrome', l: 0.62, shade: 'disc' } });
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * (0.05 + i * 0.165);
        const hx = cx + Math.cos(a) * 28;
        const hy = cy + Math.sin(a) * 16.5;
        k.ellipse(hx, hy, 4.4, 3.2, { mat: 'black', l: 0.1 }, { outline: false, bevel: false });
        k.px(hx - 2, hy - 2, M.chrome[2]);
        k.px(hx + 2, hy + 2, M.chrome[6]);
      }
      k.disc(cx, cy, 13, 8, 2, 'cream', { front: { mat: 'cream', l: 0.84 } });
      k.scribble(cx - 7, cy - 2, 14, 2, M.cream[2], 3);
      k.tube([[cx + 30, cy + 8], [cx + 38, cy + 15]], 3, 'chrome', { l: 0.7 });
      // garfos do gancho no platô
      for (const gx of [80, 170]) k.rbox(gx, 150, 9, 14, 8, 3, 'black', { front: { mat: 'black', l: 0.62 } });
      // monofone com espessura apoiado nos garfos
      k.group(() => {
        k.extrude([[66, 132], [84, 112], [162, 112], [180, 132], [168, 140], [152, 126], [94, 126], [78, 140]], 16, 'black', { front: { mat: 'black', l: 0.6, grad: -0.25 } });
        k.disc(72, 140, 20, 11, 14, 'black', { front: { mat: 'black', l: 0.55, shade: 'sphere' } });
        k.disc(174, 140, 20, 11, 14, 'black', { front: { mat: 'black', l: 0.55, shade: 'sphere' } });
      });
      for (const ex of [72, 174]) for (let i = 0; i < 5; i++) k.px(ex - 7 + i * 3, 142, M.black[0]);
      // fio espiralado saindo da lateral
      const coil: Pt[] = [];
      for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        coil.push([200 + t * 34 + Math.sin(t * Math.PI * 11) * 3, 214 + t * 20 + Math.cos(t * Math.PI * 11) * 3]);
      }
      k.tube(coil, 3, 'black', { l: 0.65 });
    },
  },
  {
    n: 104,
    id: 'violino',
    jogo: 40,
    nome: 'Violino',
    name: 'Violin',
    cat: 'instrumento',
    size: [200, 270],
    draw(k: Kit) {
      const cx = 96;
      // meia-largura do corpo ao longo da altura (bojo superior, cintura em C, bojo inferior)
      const W: [number, number][] = [
        [108, 0], [110, 12], [114, 22], [121, 28], [131, 31], [141, 30], [148, 26], [153, 21], [160, 18], [168, 18], [175, 20],
        [180, 26], [187, 33], [198, 37], [211, 38], [223, 35], [232, 29], [239, 20], [243, 10], [245, 0],
      ];
      const body: Pt[] = [];
      for (const [y, w] of W) body.push([cx + w, y]);
      for (const [y, w] of [...W].reverse()) body.push([cx - w, y]);
      k.extrude(body, 16, 'wood', {
        front: { mat: 'wood', tex: 'woodV', fn: (_u, _v, s, t) => 0.74 - Math.abs(s - 0.4) * 0.55 - t * 0.06 + (Math.abs(s - 0.3) < 0.05 && t > 0.15 && t < 0.85 ? 0.12 : 0) },
        wall: { mat: 'wood', l: -0.05, tex: 'wood' },
      });
      // filete (purfling) a 3 px da borda
      k.group(() => {
        for (const [y, w] of W) {
          if (w < 6) continue;
          k.px(cx + w - 3, y + (y < 176 ? 1 : -1), M.woodDark[1]);
          k.px(cx - w + 3, y + (y < 176 ? 1 : -1), M.woodDark[1]);
        }
      }, { outline: false, bevel: false, cast: 0 });
      // efes
      for (const s of [-1, 1]) {
        k.tube([[cx + s * 16, 164], [cx + s * 15, 176], [cx + s * 17, 188], [cx + s * 20, 198]], 2, 'woodDark', { l: 0 });
        k.ellipse(cx + s * 16, 163, 2, 2, { mat: 'black', l: 0.1 }, { outline: false });
        k.ellipse(cx + s * 20, 199, 2, 2, { mat: 'black', l: 0.1 }, { outline: false });
      }
      // estandarte e queixeira
      k.extrude([[cx - 8, 206], [cx + 8, 206], [cx + 12, 238], [cx - 12, 238]], 5, 'black', { front: { mat: 'black', l: 0.5 } });
      k.disc(cx - 22, 236, 14, 8, 5, 'black', { front: { mat: 'black', l: 0.5 } });
      for (let i = 0; i < 4; i++) k.disc(cx - 5 + i * 3.4, 211, 1.4, 1.4, 1, 'gold', { front: { mat: 'gold', l: 0.85 }, cast: 0 });
      // espelho (ébano)
      k.extrude([[cx - 6, 52], [cx + 6, 52], [cx + 9, 176], [cx - 9, 176]], 7, 'black', { front: { mat: 'black', l: 0.45, gradX: -0.25 } });
      // cavalete
      k.extrude([[cx - 15, 188], [cx + 15, 188], [cx + 12, 195], [cx - 12, 195]], 3, 'woodLight', { front: { mat: 'woodLight', l: 0.82 } });
      // cravelhal e voluta
      k.extrude([[cx - 7, 28], [cx + 7, 28], [cx + 6, 56], [cx - 6, 56]], 9, 'wood', { front: { mat: 'wood', l: 0.5 } });
      k.disc(cx, 20, 10, 11, 9, 'wood', { front: { mat: 'wood', l: 0.62, shade: 'sphere' } });
      k.ring(cx + 1, 20, 6, 6.5, 2, { mat: 'woodDark', l: 0.2 });
      for (const s of [-1, 1])
        for (const yy of [36, 48]) {
          k.tube([[cx + s * 7, yy], [cx + s * 13, yy - 1]], 3, 'black');
          k.disc(cx + s * 16, yy - 1, 4, 3, 2, 'black', { front: { mat: 'black', l: 0.6, shade: 'sphere' } });
        }
      // cordas
      for (let i = 0; i < 4; i++) {
        const xa = cx - 3 + i * 2;
        k.line(xa, 32, xa, 188, i < 2 ? M.cream[6] : M.gold[6]);
        k.line(xa, 191, cx - 4 + i * 2.6, 212, i < 2 ? M.cream[5] : M.gold[5]);
      }
    },
  },
  {
    n: 105,
    id: 'maquina_escrever',
    jogo: 26,
    nome: 'Máquina de escrever',
    name: 'Typewriter',
    cat: 'escritorio',
    era: [1895, 1990],
    draw(k: Kit) {
      // corpo em degraus (vista de cima), preto laqueado com frisos dourados
      k.rbox(40, 214, 176, 34, 80, 6, 'black', { front: { mat: 'black', l: 0.5, grad: -0.2 } });
      // teclado em degraus: 4 fileiras de teclas redondas com aro cromado
      for (let r = 0; r < 4; r++) {
        const ry = 204 - r * 9;
        const rx = 58 + r * 5;
        for (let i = 0; i < 11 - (r === 0 ? 2 : 0); i++) {
          const kx = rx + i * 13 + (r === 0 ? 13 : 0);
          k.disc(kx, ry - 30, 5, 3.6, 4, 'chrome', { front: { mat: 'cream', l: 0.82 }, wall: { mat: 'chrome' } });
          k.px(kx - 1, ry - 31, M.black[2]);
        }
      }
      k.rbox(96, 196, 60, 5, 6, 2, 'chrome', { front: { mat: 'chrome', l: 0.7 } });
      // corpo traseiro alto
      k.rbox(52, 152, 152, 40, 50, 10, 'black', { front: { mat: 'black', l: 0.55, grad: -0.25 } });
      k.fill(64, 128, 128, 1, M.gold[5]);
      // cesta de tipos (leque)
      k.ellipse(128, 132, 34, 12, { mat: 'black', l: 0.15 }, { cast: 0 });
      for (let i = 0; i < 17; i++) {
        const a = Math.PI * (1.05 + i * 0.054);
        k.line(128 + Math.cos(a) * 32, 134 + Math.sin(a) * 10, 128, 140, M.steel[5]);
      }
      // rolo (carro) cilíndrico com botões nas pontas
      k.cylH(34, 214, 98, 9, 'rubber', { l: 0.55, cap: false });
      k.rbox(40, 112, 176, 6, 20, 2, 'chrome', { front: { mat: 'chrome', l: 0.6 } });
      for (const bx of [28, 220]) k.disc(bx, 98, 7, 10, 6, 'black', { front: { mat: 'black', l: 0.55, shade: 'sphere' } });
      // papel
      k.extrude([[86, 92], [170, 92], [176, 30], [92, 30]], 1, 'paper', { front: { mat: 'paper', l: 0.85, grad: 0.08 } });
      k.scribble(100, 44, 62, 9, M.paper[1], 4, 3);
      // alavanca de retorno
      k.tube([[30, 92], [16, 80], [10, 82]], 4, 'chrome', { l: 0.65 });
      // marca
      k.fill(112, 168, 32, 1, M.gold[6]);
      k.fill(116, 170, 24, 1, M.gold[4]);
    },
  },
  {
    n: 106,
    id: 'disco_platina',
    jogo: 34,
    nome: 'Disco de platina emoldurado',
    name: 'Framed platinum record',
    cat: 'premio',
    era: [1976, 2040],
    draw(k: Kit) {
      const x = 46, y = 238, w = 160, h = 206, d = 16;
      // moldura de madeira escura com espessura
      k.rbox(x, y, w, h, d, 3, 'woodDark', { front: { mat: 'woodDark', l: 0.55, tex: 'wood' } });
      // fundo de veludo azul-marinho recuado
      k.rect(x + 12, y - h + 12, w - 24, h - 24, { mat: 'navy', l: 0.45, grad: -0.2, tex: 'fabric' }, { cast: 3 });
      // disco (platina = cromo) com sulcos
      const cx = x + w / 2;
      const cy = y - h + 84;
      k.disc(cx, cy, 52, 52, 3, 'chrome', {
        front: {
          mat: 'chrome',
          fn: (_u, _v, s, t) => {
            const nx = s * 2 - 1;
            const ny = t * 2 - 1;
            const r = Math.hypot(nx, ny);
            const a = Math.atan2(ny, nx);
            return 0.5 + Math.cos(2 * a + 0.9) * 0.22 * r + (Math.floor(r * 26) % 2 ? 0.04 : -0.04);
          },
        },
      });
      k.disc(cx, cy, 16, 16, 1, 'blue', { front: { mat: 'blue', l: 0.6, grad: -0.2 } });
      k.ellipse(cx, cy, 2, 2, { mat: 'black', l: 0.1 }, { outline: false });
      k.scribble(cx - 8, cy - 7, 16, 2, M.blue[7], 3);
      // reflexo no vidro
      k.group(() => {
        for (let i = 0; i < 40; i++) k.px(x + 22 + i, y - h + 70 - i, C('#ffffff', 90));
        for (let i = 0; i < 26; i++) k.px(x + 30 + i, y - h + 80 - i, C('#ffffff', 60));
      }, { outline: false, bevel: false, cast: 0 });
      // placa gravada
      k.rbox(x + 34, y - 22, w - 68, 26, 2, 2, 'gold', { front: { mat: 'gold', l: 0.62, grad: -0.2 } });
      k.scribble(x + 44, y - 41, w - 88, 3, M.gold[1], 5, 5);
    },
  },
  {
    n: 107,
    id: 'vitrola_maleta_1960',
    jogo: 34,
    nome: 'Vitrola de maleta',
    name: 'Suitcase record player',
    cat: 'midia',
    era: [1955, 1985],
    size: [280, 256],
    draw(k: Kit) {
      const x = 30, y = 236, w = 196, h = 46, d = 120;
      const dx = d * KX, dy = d * KY;
      // tampa aberta, em pé atrás (forro creme com alto-falante)
      k.rbox(x + dx - 4, y - h - dy + 6, w, 118, 14, 8, 'teal', { front: { mat: 'teal', l: 0.5 } });
      k.rect(x + dx + 6, y - h - dy - 104, w - 20, 102, { mat: 'cream', l: 0.72, grad: -0.2, tex: 'fabric' }, { cast: 3 });
      k.speaker(x + dx + w / 2 - 4, y - h - dy - 54, 30, 'iron');
      k.ring(x + dx + w / 2 - 4, y - h - dy - 54, 30, 30, 3, { mat: 'gold', l: 0.7 });
      // caixa de baixo
      k.rbox(x, y, w, h, d, 8, 'teal', {
        front: { mat: 'teal', l: 0.52, grad: -0.2, tex: 'leather' },
        wall: { tex: 'leather' },
      });
      // tampo (prato de toca-discos) creme recuado sobre a face de cima
      const T: Pt = [x + 10, y - h - 4];
      k.quad(T, [w - 20, 0], [dx - 10, -dy + 8], { mat: 'cream', l: 0.8, grad: 0.06 }, { cast: 0 });
      // prato e disco
      const pcx = x + 88, pcy = y - h - 30;
      k.disc(pcx, pcy, 54, 22, 5, 'steel', { front: { mat: 'steel', l: 0.6 } });
      k.ellipse(pcx, pcy - 2, 50, 20, {
        mat: 'black',
        fn: (_u, _v, s, t) => {
          const nx = s * 2 - 1;
          const ny = t * 2 - 1;
          const r = Math.hypot(nx, ny);
          return 0.32 + Math.cos(2 * Math.atan2(ny, nx) + 0.7) * 0.16 * r + (Math.floor(r * 18) % 2 ? 0.03 : -0.03);
        },
      });
      k.ellipse(pcx, pcy - 2, 16, 6.5, { mat: 'red', l: 0.62, grad: -0.2 });
      k.ellipse(pcx, pcy - 2, 2, 1, { mat: 'chrome', l: 0.8 }, { outline: false });
      // braço do toca-discos
      k.disc(x + 168, y - h - 40, 9, 5, 6, 'chrome', { front: { mat: 'chrome', l: 0.7, shade: 'sphere' } });
      k.tube([[x + 168, y - h - 44], [x + 160, y - h - 20], [x + 132, y - h - 14]], 3, 'chrome', { l: 0.7 });
      k.rbox(x + 124, y - h - 10, 12, 5, 4, 1, 'black');
      // botões no tampo
      for (let i = 0; i < 3; i++) k.disc(x + 150 + i * 14, y - h - 12, 4, 2.5, 3, 'cream', { front: { mat: 'cream', l: 0.85 } });
      // fechos e alça na frente
      for (const fx of [x + 24, x + w - 36]) k.rbox(fx, y - h + 16, 12, 10, 3, 2, 'chrome', { front: { mat: 'chrome', l: 0.66 } });
      k.tube([[x + 76, y - 12], [x + 80, y - 4], [x + 116, y - 4], [x + 120, y - 12]], 5, 'cream', { l: 0.65 });
      for (const fx of [x + 72, x + 116]) k.rbox(fx, y - 10, 8, 6, 4, 1, 'chrome');
      // friso
      k.fill(x + 4, y - h + 30, w - 8, 1, M.cream[5]);
    },
  },
];
