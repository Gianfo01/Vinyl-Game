// R31 · onda 4 (H) — CAMADA DA CIDADE DE CADA ÉPOCA por cima do mapa "Nosso mundo" (pixel art no estilo antigo do mapa:
// fonte 3×5, contorno escuro quente, cores chapadas da época). Lê só o modelo (city31model) e as caixas dos sprites:
//   · etiquetas das lojas da época (verde = abriu este ano, vermelho = fechou) e letreiro dos lugares reais;
//   · outdoors no alto dos prédios com as capas dos nº 1 (painel pintado → neon → luminoso → LED);
//   · cartaz do festival do mês ao lado do terreno;
//   · neon nas fachadas (começa nos anos 20, auge 1930–60, volta nos 80, depois LED), brilhando mais à noite.
import { drawText, textWidth } from '../pixel/font';
import type { Scene18, Sprite18 } from '../pixel/campus18px';
import type { CityOv31 } from './city31model';

const INK = '#170e12';
const NEON = ['#ff4a8a', '#40e0ff', '#ffe040', '#8aff60', '#ff8a30'];

function tag(ctx: CanvasRenderingContext2D, x: number, y: number, txt: string, bg: string, fg: string): [number, number] {
  const w = textWidth(txt) + 4;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y);
  ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 9);
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, w, 7);
  drawText(ctx, txt, x0 + 2, y0 + 1, fg);
  return [x0, w];
}
const up = (s: string) => s.toUpperCase().slice(0, 18);

/** Desenha a camada; devolve as caixas clicáveis dos outdoors (para a página ligar à ficha da obra). */
export function drawCity31(ctx: CanvasRenderingContext2D, sc: Scene18, ov: CityOv31, t: number, night: number): { relId: string; box: [number, number, number, number] }[] {
  const byId = new Map<string, Sprite18>(sc.sprites.map((s) => [s.id, s]));
  const hits: { relId: string; box: [number, number, number, number] }[] = [];
  ctx.imageSmoothingEnabled = false;
  // neon das fachadas
  if (ov.neon.f > 0) {
    const a = Math.min(1, 0.35 + night * 0.9) * ov.neon.f;
    ctx.save();
    ctx.globalCompositeOperation = night > 0.3 ? 'lighter' : 'source-over';
    for (const n of ov.neons) {
      const sp = byId.get(n.sprite);
      if (!sp) continue;
      const [dx, dy] = sp.door, c = NEON[n.k % NEON.length];
      const on = ov.neon.k === 'led' || Math.floor(t * 3 + n.k) % 7 !== 0; // pisca de vez em quando (neon velho)
      if (!on) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = c;
      if (ov.neon.k === 'led') { ctx.fillRect(Math.round(dx - 5), Math.round(dy - 13), 10, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(dx - 4 + (Math.floor(t * 4) % 8)), Math.round(dy - 12), 1, 1); }
      else { ctx.fillRect(Math.round(dx - 5), Math.round(dy - 12), 10, 1); ctx.fillRect(Math.round(dx - 5), Math.round(dy - 12), 1, 3); ctx.fillRect(Math.round(dx + 4), Math.round(dy - 12), 1, 3); }
      if (night > 0.3) { ctx.globalAlpha = a * 0.35; ctx.fillRect(Math.round(dx - 7), Math.round(dy - 14), 14, 6); }
    }
    ctx.restore();
  }
  // outdoors no alto dos prédios
  ov.boards.forEach((b, i) => {
    const sp = byId.get(b.sprite);
    if (!sp) return;
    const bw = 24, bh = 15, x0 = Math.round(sp.top[0] - bw / 2), y0 = Math.round(Math.min(sp.top[1], sp.box[1] + 4) - bh - 10);
    ctx.fillStyle = '#4a4048'; ctx.fillRect(x0 + 4, y0 + bh, 1, 8); ctx.fillRect(x0 + bw - 5, y0 + bh, 1, 8);
    const st = ov.boardStyle;
    const frame = st === 'painted' ? '#e8dcc0' : st === 'neon' ? '#2a1a2a' : st === 'backlit' ? '#f4f4f8' : '#101418';
    ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y0 - 1, bw + 2, bh + 2);
    ctx.fillStyle = frame; ctx.fillRect(x0, y0, bw, bh);
    if (b.cover) { ctx.drawImage(b.cover, x0 + 1, y0 + 1, 13, 13); }
    else { ctx.fillStyle = b.mine ? '#d0a020' : '#a03040'; ctx.fillRect(x0 + 1, y0 + 1, 13, 13); }
    const fg = st === 'painted' || st === 'backlit' ? INK : '#fff4c0';
    drawText(ctx, `N${b.rank}`, x0 + 15, y0 + 2, b.mine ? '#e0a020' : fg);
    ctx.fillStyle = b.mine ? '#e0a020' : st === 'neon' ? NEON[i % NEON.length] : st === 'led' ? '#40e0ff' : '#a03040';
    ctx.fillRect(x0 + 15, y0 + 9, 8, 2);
    if (st === 'neon' || st === 'led') { // borda acesa
      ctx.globalAlpha = 0.5 + night * 0.5; ctx.fillStyle = st === 'led' ? '#40e0ff' : NEON[(i + 1) % NEON.length];
      ctx.fillRect(x0, y0 - 1, bw, 1); ctx.fillRect(x0, y0 + bh, bw, 1); ctx.globalAlpha = 1;
    }
    hits.push({ relId: b.relId, box: [x0 - 1, y0 - 1, x0 + bw + 1, y0 + bh + 1] });
  });
  // festival: cartaz do line-up ao lado do terreno
  if (ov.fest) {
    const sp = byId.get(ov.fest.sprite);
    if (sp) {
      const [x, y] = [Math.round(sp.top[0] + 6), Math.round(sp.top[1] - 34)];
      const lines = [up(ov.fest.name), ...ov.fest.acts.map(up)].slice(0, 4);
      const w = Math.max(...lines.map((s) => textWidth(s))) + 6, hh = lines.length * 7 + 3;
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 3, y + hh, 1, 8); ctx.fillRect(x + w - 4, y + hh, 1, 8);
      ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, hh + 2);
      ctx.fillStyle = '#f8f0d8'; ctx.fillRect(x, y, w, hh);
      ctx.fillStyle = '#d04040'; ctx.fillRect(x, y, w, 8);
      lines.forEach((s, i) => drawText(ctx, s, x + 3, y + 2 + i * 7, i === 0 ? '#fff8e0' : INK));
    }
  }
  // etiquetas: lojas da época (com abriu/fechou) e letreiros dos lugares reais — sem empilhar: a que não cabe sai
  if (ov.labels) {
    const placed: [number, number, number, number][] = [];
    const free = (x: number, y: number, w: number) => !placed.some(([a, b, c, d]) => x < c && a < x + w && y < d && b < y + 9);
    let plain = 0;
    const order = [...ov.tags].sort((a, b) => Number(!!b.mark) - Number(!!a.mark) || Number(!!b.real) - Number(!!a.real));
    for (const g of order) {
      const sp = byId.get(g.sprite);
      if (!sp) continue;
      if (!g.mark && !g.real && plain >= 10) continue;
      const txt = up(g.text), w = textWidth(txt) + 6;
      let y = Math.round(Math.min(sp.top[1], sp.box[1] + 6)) - 6;
      const x = Math.round(sp.top[0] - w / 2);
      let ok = false;
      for (let k = 0; k < 3 && !ok; k++) { if (free(x, y - (g.mark ? 9 : 0), w)) ok = true; else y -= 9; }
      if (!ok) continue;
      tag(ctx, sp.top[0], y, txt, g.real ? '#203048' : '#fbf6ea', g.real ? '#ffe080' : INK);
      placed.push([x, y, x + w, y + 9]);
      if (g.mark) { const [mx, mw] = tag(ctx, sp.top[0], y - 9, g.markTxt, g.mark === 'open' ? '#2f8a4c' : '#c8302c', '#ffffff'); placed.push([mx, y - 9, mx + mw, y]); }
      if (!g.mark && !g.real) plain++;
    }
  }
  return hits;
}
