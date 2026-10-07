// Sede isométrica habitada (GDD §1, §21): uma unidade por banda, salas de gravação,
// mesas da equipe, equipamento e pessoas andando. Canvas 2D, independente da simulação.

import { Rng } from '../core/rng';
import { FAMILIES, familyOf } from '../data/world';
import { EQUIPMENT, HQ_LEVELS } from '../data/rules';
import type { GameState } from '../sim/types';
import { playerActs } from '../sim/util';
import { logoUrl } from './art';

const TW = 64;
const TH = 32;
const SIZES = [
  [5, 4],
  [7, 5],
  [9, 6],
  [11, 8],
];

interface Walker {
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  home: [number, number];
  speed: number;
  pause: number;
  label: string;
}

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  actId?: string;
  label: string;
}

export class HqView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  raf = 0;
  walkers: Walker[] = [];
  hits: Hit[] = [];
  hover: Hit | null = null;
  images = new Map<string, HTMLImageElement>();
  lastKey = '';
  onSelect: (actId: string) => void = () => {};
  reduced = false;
  scale = 1;

  constructor(private getState: () => GameState | null) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hq-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Sede isométrica');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('mousemove', (e) => {
      const p = this.toLocal(e);
      this.hover = this.hits.find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) ?? null;
      this.canvas.style.cursor = this.hover?.actId ? 'pointer' : 'default';
    });
    this.canvas.addEventListener('click', () => {
      if (this.hover?.actId) this.onSelect(this.hover.actId);
    });
  }

  private toLocal(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * this.canvas.width / devicePixelRatio / this.scale, y: ((e.clientY - rect.top) / rect.height) * this.canvas.height / devicePixelRatio / this.scale };
  }

  start(): void {
    this.reduced = document.documentElement.classList.contains('reduced-motion');
    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.draw();
      if (!this.reduced) this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private resize(): { w: number; h: number } {
    const parent = this.canvas.parentElement;
    const w = Math.max(320, parent?.clientWidth ?? 800);
    const h = Math.round(Math.min(560, Math.max(300, w * 0.55)));
    const dpr = devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  private iso(gx: number, gy: number, ox: number, oy: number, z = 0): [number, number] {
    return [ox + (gx - gy) * (TW / 2), oy + (gx + gy) * (TH / 2) - z];
  }

  private img(url: string): HTMLImageElement {
    let im = this.images.get(url);
    if (!im) {
      im = new Image();
      im.src = url;
      this.images.set(url, im);
    }
    return im;
  }

  private setupWalkers(s: GameState, cols: number, rows: number): void {
    const key = `${s.player.hq}|${playerActs(s).join(',')}|${s.player.staff.length}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.walkers = [];
    const r = Rng.fromSeed(key);
    const acts = playerActs(s).map((id) => s.acts[id]);
    acts.forEach((a, i) => {
      const [hx, hy] = this.padPos(i, cols, rows);
      const hue = FAMILIES.find((f) => f.id === familyOf(a.genre))?.hue ?? 200;
      for (const pid of a.members.slice(0, 3)) {
        this.walkers.push({ x: hx + r.float(0, 1.5), y: hy + r.float(0, 1), tx: hx, ty: hy, color: `hsl(${hue} 60% 55%)`, home: [hx, hy], speed: r.float(0.01, 0.025), pause: r.int(0, 120), label: s.persons[pid]?.name ?? '' });
      }
    });
    s.player.staff.forEach((st, i) => {
      const hx = cols - 1.5 - (i % 3) * 1.2;
      const hy = 0.6 + Math.floor(i / 3) * 1.2;
      this.walkers.push({ x: hx, y: hy, tx: hx, ty: hy, color: '#d9c48c', home: [hx, hy], speed: r.float(0.008, 0.02), pause: r.int(0, 200), label: st.name });
    });
  }

  private padPos(i: number, cols: number, rows: number): [number, number] {
    const perRow = Math.max(1, Math.floor((cols - 1) / 2.2));
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    return [0.6 + col * 2.2, Math.min(rows - 1.6, 1.6 + row * 1.9)];
  }

  draw(): void {
    const s = this.getState();
    const { w, h } = this.resize();
    const ctx = this.ctx;
    const css = getComputedStyle(document.documentElement);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = css.getPropertyValue('--hq-bg').trim() || '#1b1520';
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.6);
    glow.addColorStop(0, 'rgba(232,137,61,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    if (!s) return;
    const [cols, rows] = SIZES[Math.max(0, Math.min(3, s.player.hq))];
    // zoom para preencher o quadro
    const needW = ((cols + rows) * TW) / 2 + 60;
    const needH = ((cols + rows) * TH) / 2 + 150;
    const scale = Math.max(0.6, Math.min(2.2, Math.min(w / needW, h / needH)));
    const dpr = devicePixelRatio || 1;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    this.scale = scale;
    const vw = w / scale;
    const vh = h / scale;
    const ox = vw / 2 + ((rows - cols) * TW) / 4;
    const oy = Math.max(90, (vh - (cols + rows) * (TH / 2)) / 2 + 40);
    this.hits = [];
    this.setupWalkers(s, cols, rows);
    const era = s.year;
    // piso
    const floorA = era < 1960 ? '#6b4a32' : era < 1990 ? '#5a4d6b' : era < 2030 ? '#3d4a55' : '#24324a';
    const floorB = era < 1960 ? '#5d3f2a' : era < 1990 ? '#4f4360' : era < 2030 ? '#35414b' : '#1e2a40';
    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        const [x, y] = this.iso(gx, gy, ox, oy);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + TW / 2, y + TH / 2);
        ctx.lineTo(x, y + TH);
        ctx.lineTo(x - TW / 2, y + TH / 2);
        ctx.closePath();
        ctx.fillStyle = (gx + gy) % 2 ? floorA : floorB;
        ctx.fill();
      }
    }
    // paredes do fundo
    const wallH = 70;
    const [lx0, ly0] = this.iso(0, 0, ox, oy);
    const [lx1, ly1] = this.iso(0, rows, ox, oy);
    const [rx1, ry1] = this.iso(cols, 0, ox, oy);
    ctx.fillStyle = era < 1960 ? '#8a6d4e' : era < 1990 ? '#7a5d7f' : era < 2030 ? '#56636e' : '#2c3c5c';
    ctx.beginPath();
    ctx.moveTo(lx0, ly0);
    ctx.lineTo(lx1, ly1);
    ctx.lineTo(lx1, ly1 - wallH);
    ctx.lineTo(lx0, ly0 - wallH);
    ctx.fill();
    ctx.fillStyle = era < 1960 ? '#a0805d' : era < 1990 ? '#8d6e92' : era < 2030 ? '#67747f' : '#34466a';
    ctx.beginPath();
    ctx.moveTo(lx0, ly0);
    ctx.lineTo(rx1, ry1);
    ctx.lineTo(rx1, ry1 - wallH);
    ctx.lineTo(lx0, ly0 - wallH);
    ctx.fill();
    // janela e cartaz de era na parede esquerda
    {
      const [wx, wy] = this.iso(0, rows * 0.55, ox, oy, 52);
      ctx.fillStyle = era < 2030 ? 'rgba(160,200,240,0.35)' : 'rgba(120,110,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx - TW * 0.7, wy - TH * 0.7);
      ctx.lineTo(wx - TW * 0.7, wy - TH * 0.7 + 30);
      ctx.lineTo(wx, wy + 30);
      ctx.closePath();
      ctx.fill();
      const [px, py] = this.iso(0, rows * 0.2, ox, oy, 50);
      ctx.fillStyle = era < 1945 ? '#c9a15b' : era < 1975 ? '#d0508a' : era < 1990 ? '#30d5c8' : era < 2030 ? '#e8e2d0' : '#7d74ff';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 18, py - 9);
      ctx.lineTo(px - 18, py + 15);
      ctx.lineTo(px, py + 24);
      ctx.closePath();
      ctx.fill();
    }
    // objeto da era: rádio, jukebox, TV, computador, holograma
    {
      const [x, y] = this.iso(0.5, rows - 0.6, ox, oy);
      if (era < 1950) { ctx.fillStyle = '#7a4b25'; ctx.beginPath(); ctx.roundRect(x - 12, y - 26, 24, 26, 8); ctx.fill(); ctx.fillStyle = '#e6c27a'; ctx.beginPath(); ctx.arc(x, y - 15, 6, 0, 7); ctx.fill(); }
      else if (era < 1970) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(x - 13, y - 40, 26, 40, [12, 12, 2, 2]); ctx.fill(); ctx.fillStyle = '#f9e79f'; ctx.fillRect(x - 8, y - 30, 16, 10); }
      else if (era < 1995) { ctx.fillStyle = '#333'; ctx.fillRect(x - 14, y - 26, 28, 22); ctx.fillStyle = '#5dade2'; ctx.fillRect(x - 11, y - 23, 22, 15); ctx.fillStyle = '#555'; ctx.fillRect(x - 4, y - 4, 8, 4); }
      else if (era < 2030) { ctx.fillStyle = '#ddd'; ctx.fillRect(x - 14, y - 22, 28, 16); ctx.fillStyle = '#222'; ctx.fillRect(x - 12, y - 20, 24, 12); ctx.fillStyle = '#bbb'; ctx.fillRect(x - 3, y - 6, 6, 6); }
      else { ctx.fillStyle = 'rgba(125,116,255,0.5)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 12, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(160,150,255,0.35)'; ctx.fillRect(x - 6, y - 36, 12, 34); }
    }
    // estante de discos e planta
    {
      const [x, y] = this.iso(1.6, 0.15, ox, oy);
      ctx.fillStyle = '#5b3a24';
      ctx.fillRect(x - 18, y - 34, 36, 34);
      const n = Math.min(14, 2 + Object.values(s.releases).filter((r) => r.owner === 'player').length);
      for (let i = 0; i < n; i++) { ctx.fillStyle = `hsl(${(i * 47) % 360} 50% 50%)`; ctx.fillRect(x - 16 + (i % 7) * 4.6, y - 32 + Math.floor(i / 7) * 16, 3.5, 14); }
      const [qx, qy] = this.iso(cols - 0.4, rows - 0.4, ox, oy);
      ctx.fillStyle = '#6b4b2e';
      ctx.fillRect(qx - 6, qy - 10, 12, 10);
      ctx.fillStyle = '#3f8f4f';
      ctx.beginPath(); ctx.arc(qx, qy - 18, 10, 0, 7); ctx.fill();
    }
    // pôsteres de era e discos de ouro na parede
    const golds = Math.min(8, s.player.stats.gold + s.player.stats.platinum);
    for (let i = 0; i < golds; i++) {
      const [px, py] = this.iso(1 + i * 0.8, 0, ox, oy, 45);
      ctx.fillStyle = i < s.player.stats.platinum ? '#dfe6ee' : '#e8c454';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // salas de gravação
    const sessions = HQ_LEVELS[s.player.hq].sessions;
    for (let i = 0; i < sessions && s.config.role !== 'artist'; i++) {
      const gx = cols - 2.2;
      const gy = rows - 2 - i * 0.0;
      const [x, y] = this.iso(gx - i * 2.2 + (i ? 0 : 0), gy, ox, oy);
      ctx.fillStyle = 'rgba(120,200,255,0.18)';
      ctx.strokeStyle = 'rgba(160,220,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(x, y - 40);
      ctx.lineTo(x + TW, y - 40 + TH);
      ctx.lineTo(x + TW, y + TH);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c33';
      ctx.beginPath();
      ctx.arc(x + 10, y - 30, 3, 0, 7);
      ctx.fill();
      this.hits.push({ x: x - 4, y: y - 44, w: TW + 8, h: 50, label: `Estúdio ${i + 1}` });
    }
    // equipamento ao longo da parede
    s.player.equipment.forEach((id, i) => {
      const def = EQUIPMENT.find((e) => e.id === id);
      const [x, y] = this.iso(cols - 0.6, 0.3 + i * 0.6, ox, oy);
      ctx.fillStyle = def?.branch === 'audio' ? '#444b5e' : def?.branch === 'manufacturing' ? '#6b5137' : def?.branch === 'marketing' ? '#3f6650' : '#5c4d63';
      ctx.fillRect(x - 10, y - 18, 20, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x - 10, y - 18, 20, 4);
      this.hits.push({ x: x - 10, y: y - 18, w: 20, h: 18, label: def?.name.pt ?? id });
    });
    // mesas da equipe
    s.player.staff.forEach((st, i) => {
      const gx = cols - 1.5 - (i % 3) * 1.2;
      const gy = 0.6 + Math.floor(i / 3) * 1.2;
      const [x, y] = this.iso(gx, gy, ox, oy);
      ctx.fillStyle = '#8b6a43';
      ctx.fillRect(x - 14, y - 8, 28, 8);
      ctx.fillStyle = era < 1985 ? '#333' : '#9ad';
      ctx.fillRect(x - 5, y - 16, 10, 7);
      this.hits.push({ x: x - 14, y: y - 16, w: 28, h: 16, label: `${st.name} — ${st.role}` });
    });
    // unidades por banda (logo, representante, atividade)
    const acts = playerActs(s).map((id) => s.acts[id]);
    acts.forEach((a, i) => {
      const [gx, gy] = this.padPos(i, cols, rows);
      const [x, y] = this.iso(gx, gy, ox, oy);
      const hue = FAMILIES.find((f) => f.id === familyOf(a.genre))?.hue ?? 200;
      ctx.fillStyle = `hsla(${hue} 50% 45% / 0.55)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + TW * 0.9, y + TH * 0.45);
      ctx.lineTo(x, y + TH * 0.9);
      ctx.lineTo(x - TW * 0.9, y + TH * 0.45);
      ctx.closePath();
      ctx.fill();
      // amplificador e bateria
      ctx.fillStyle = '#222';
      ctx.fillRect(x - 22, y + 2, 10, 10);
      ctx.fillStyle = '#ccc';
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 10, 8, 4, 0, 0, 7);
      ctx.fill();
      const im = this.img(logoUrl(a.logoSeed, a.name, a.genre, a.formed, 64));
      if (im.complete) ctx.drawImage(im, x - 16, y - 46, 32, 32);
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(a.name, x, y - 50);
      ctx.fillText(a.name, x, y - 50);
      const busy = a.status === 'hiatus' ? '⏸' : s.agenda[a.id]?.[0]?.action === 'gigs' ? '🎤' : s.agenda[a.id]?.some((x) => x.action === 'record') ? '⏺' : '♪';
      ctx.fillText(busy, x + 22, y - 30);
      this.hits.push({ x: x - 40, y: y - 60, w: 80, h: 80, actId: a.id, label: a.name });
    });
    // vagas livres
    const cap = HQ_LEVELS[s.player.hq].careers;
    for (let i = acts.length; i < cap && i < 12; i++) {
      const [gx, gy] = this.padPos(i, cols, rows);
      const [x, y] = this.iso(gx, gy, ox, oy);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + TW * 0.9, y + TH * 0.45);
      ctx.lineTo(x, y + TH * 0.9);
      ctx.lineTo(x - TW * 0.9, y + TH * 0.45);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // pessoas
    const sorted = [...this.walkers].sort((a, b) => a.x + a.y - (b.x + b.y));
    for (const wk of sorted) {
      if (!this.reduced) {
        if (wk.pause > 0) wk.pause--;
        else {
          const dx = wk.tx - wk.x;
          const dy = wk.ty - wk.y;
          const d = Math.hypot(dx, dy);
          if (d < 0.05) {
            wk.pause = 60 + Math.floor(Math.random() * 200);
            wk.tx = Math.max(0.3, Math.min(cols - 0.3, wk.home[0] + (Math.random() - 0.5) * 2.2));
            wk.ty = Math.max(0.3, Math.min(rows - 0.3, wk.home[1] + (Math.random() - 0.5) * 1.6));
          } else {
            wk.x += (dx / d) * wk.speed;
            wk.y += (dy / d) * wk.speed;
          }
        }
      }
      const [x, y] = this.iso(wk.x, wk.y, ox, oy);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 6, 3, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = wk.color;
      ctx.fillRect(x - 4, y - 16, 8, 16);
      ctx.fillStyle = '#f1d1b5';
      ctx.beginPath();
      ctx.arc(x, y - 20, 4.5, 0, 7);
      ctx.fill();
    }
    // tooltip
    if (this.hover) {
      ctx.font = '12px system-ui, sans-serif';
      const tw = ctx.measureText(this.hover.label).width + 12;
      ctx.fillStyle = 'rgba(10,8,14,0.85)';
      ctx.fillRect(this.hover.x, this.hover.y - 22, tw, 18);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(this.hover.label, this.hover.x + 6, this.hover.y - 9);
    }
  }
}
