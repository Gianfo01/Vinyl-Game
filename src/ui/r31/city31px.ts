// R31 · onda 4 (H) — CAMADA DA CIDADE DE CADA ÉPOCA por cima do mapa "Nosso mundo" (pixel art no estilo antigo do mapa:
// fonte 3×5, contorno escuro quente, cores chapadas da época). Lê só o modelo (city31model) e as caixas dos sprites:
//   · etiquetas das lojas da época (verde = abriu este ano, vermelho = fechou) e letreiro dos lugares reais;
//   · outdoors no alto dos prédios com as capas dos nº 1 (painel pintado → neon → luminoso → LED);
//   · cartaz do festival do mês ao lado do terreno;
//   · neon nas fachadas (começa nos anos 20, auge 1930–60, volta nos 80, depois LED), brilhando mais à noite.
import { abbrText, drawText, textWidth } from '../pixel/font';
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
// R31 (POL): abrevia sem cortar palavra no meio ("LOJA DE INSTRUMENT" → "LOJA INSTR.")
const up = (s: string) => abbrText(s, 70) || abbrText(s, 120);

type Box31 = [number, number, number, number];
export interface TagAt31 { g: CityOv31['tags'][number]; cx: number; y: number; txt: string; mtxt: string }
/** Onde cada etiqueta vai (PURO; `placed` = caixas já ocupadas, recebe as novas). R31 (POL2): os letreiros das rádios e
 *  TVs reais (`media`) entram PRIMEIRO e sem limite pelo zoom — de longe também aparecem; se o lugar natural estiver
 *  ocupado tentam em cima, embaixo e dos lados, depois com o nome abreviado, e por fim ficam no lugar natural (nunca
 *  somem). Os demais seguem a densidade pelo zoom (de longe: 5 notícias, 5 nomes reais, 4 lojas). */
export function planTags31(tags: CityOv31['tags'], byId: Map<string, Pick<Sprite18, 'top' | 'box'>>, placed: Box31[], z: number, tw: (s: string) => number): TagAt31[] {
  const lim = z < 1.5 ? { mark: 5, real: 5, plain: 4 } : z < 2.2 ? { mark: 9, real: 10, plain: 9 } : { mark: 99, real: 99, plain: 99 };
  const free = (x: number, y: number, w: number, hh = 9) => !placed.some(([a, b, c, d]) => x < c + 1 && a < x + w + 1 && y < d && b < y + hh);
  const n = { mark: 0, real: 0, plain: 0 };
  const out: TagAt31[] = [];
  const order = [...tags].sort((a, b) => Number(!!b.media) - Number(!!a.media) || Number(!!b.mark) - Number(!!a.mark) || Number(!!b.real) - Number(!!a.real));
  for (const g of order) {
    const sp = byId.get(g.sprite);
    if (!sp) continue;
    const kind = g.mark ? 'mark' : g.real ? 'real' : 'plain';
    if (!g.media && n[kind] >= lim[kind]) continue;
    const y0 = Math.round(Math.min(sp.top[1], sp.box[1] + 6)) - 6;
    const mtxt = g.mark ? g.markTxt : '', mw = mtxt ? tw(mtxt) + 6 : 0;
    const texts = g.media ? [up(g.text), abbrText(g.text, 40) || up(g.text)] : [up(g.text)];
    let at: TagAt31 | null = null;
    for (const txt of texts) {
      const w = tw(txt) + 6;
      const tries: [number, number][] = g.media ? [[0, 0], [0, -9], [0, -18], [0, 9], [-(w >> 1) - 2, 0], [(w >> 1) + 2, 0], [0, -27], [-(w >> 1) - 2, -9], [(w >> 1) + 2, -9]] : [[0, 0], [0, -9], [0, -18]];
      for (const [dx, dy] of tries) {
        const cx = sp.top[0] + dx, x = Math.round(cx - w / 2), y = y0 + dy, mx = Math.round(cx - mw / 2);
        if (free(x, y, w) && (!mtxt || free(mx, y - 9, mw))) { at = { g, cx, y, txt, mtxt }; break; }
      }
      if (at) break;
    }
    if (!at && g.media) at = { g, cx: sp.top[0], y: y0, txt: texts[1], mtxt: '' }; // nunca some
    if (!at) continue;
    const w = tw(at.txt) + 6, x = Math.round(at.cx - w / 2);
    placed.push([x, at.y, x + w, at.y + 9]);
    if (at.mtxt) { const x2 = Math.round(at.cx - (tw(at.mtxt) + 4) / 2); placed.push([x2 - 1, at.y - 9, x2 + tw(at.mtxt) + 5, at.y]); }
    if (!g.media) n[kind]++;
    out.push(at);
  }
  return out;
}

/** Desenha a camada; devolve as caixas clicáveis dos outdoors (para a página ligar à ficha da obra). */
export function drawCity31(ctx: CanvasRenderingContext2D, sc: Scene18, ov: CityOv31, t: number, night: number): { relId: string; actId?: string; box: [number, number, number, number] }[] {
  const byId = new Map<string, Sprite18>(sc.sprites.map((s) => [s.id, s]));
  const hits: { relId: string; actId?: string; box: [number, number, number, number] }[] = [];
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
    const bw = 16 + Math.max(9, textWidth(b.tagTxt) + 2), bh = 15, x0 = Math.round(sp.top[0] - bw / 2), yb = Math.round(Math.min(sp.top[1], sp.box[1] + 4) - bh - 10);
    // R31 (POL): outdoor não cobre placa À venda; POL2: nem os pinos da página nem outro outdoor — sobe no poste
    const hitsAt = (y: number) => (sc.signs ?? []).some((sg) => x0 < sg.x + sg.c.width + 2 && sg.x - 2 < x0 + bw && y < sg.y + 11 && sg.y - 13 < y + bh + 8)
      || [...(ov.avoid ?? []), ...hits.map((hb) => hb.box)].some(([a, b0, c, d]) => x0 < c && a < x0 + bw && y < d && b0 < y + bh);
    const y0 = [0, 12, 24].map((k) => yb - k).find((y) => !hitsAt(y));
    if (y0 === undefined) return;
    ctx.fillStyle = '#4a4048'; ctx.fillRect(x0 + 4, y0 + bh, 1, yb - y0 + 8); ctx.fillRect(x0 + bw - 5, y0 + bh, 1, yb - y0 + 8);
    const st = ov.boardStyle;
    const frame = st === 'painted' ? '#e8dcc0' : st === 'neon' ? '#2a1a2a' : st === 'backlit' ? '#f4f4f8' : '#101418';
    ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y0 - 1, bw + 2, bh + 2);
    ctx.fillStyle = frame; ctx.fillRect(x0, y0, bw, bh);
    if (b.cover) { ctx.drawImage(b.cover, x0 + 1, y0 + 1, 13, 13); }
    else { ctx.fillStyle = b.mine ? '#d0a020' : '#a03040'; ctx.fillRect(x0 + 1, y0 + 1, 13, 13); }
    const fg = st === 'painted' || st === 'backlit' ? INK : '#fff4c0';
    drawText(ctx, b.tagTxt, x0 + 15, y0 + 2, b.mine ? '#e0a020' : fg);
    ctx.fillStyle = b.mine ? '#e0a020' : st === 'neon' ? NEON[i % NEON.length] : st === 'led' ? '#40e0ff' : '#a03040';
    ctx.fillRect(x0 + 15, y0 + 9, bw - 16, 2);
    if (st === 'neon' || st === 'led') { // borda acesa
      ctx.globalAlpha = 0.5 + night * 0.5; ctx.fillStyle = st === 'led' ? '#40e0ff' : NEON[(i + 1) % NEON.length];
      ctx.fillRect(x0, y0 - 1, bw, 1); ctx.fillRect(x0, y0 + bh, bw, 1); ctx.globalAlpha = 1;
    }
    hits.push({ relId: b.relId, ...(b.actId && (b.kind === 'hot' || b.kind === 'tour') ? { actId: b.actId } : {}), box: [x0 - 1, y0 - 1, x0 + bw + 1, y0 + bh + 1] });
  });
  // etiquetas: lojas da época (com abriu/fechou) e letreiros dos lugares reais — R31 (POL), regras de densidade:
  //   · nada se sobrepõe: nem etiqueta com etiqueta, nem com as placas "À venda" (e o preço em cima delas), outdoors
  //     ou o cartaz do festival; a marca ABRIU/VAI FECHAR conta junto com o nome (as duas caixas são conferidas);
  //   · quantidade pelo zoom: de longe só as notícias (abriu/vai fechar) e poucos nomes; aproximando aparecem mais;
  //     o resto continua no passar do mouse/clique (o ponto clicável de cada prédio tem o nome inteiro);
  //   · nome comprido é abreviado na fronteira da palavra, nunca cortado no meio.
  if (ov.labels) {
    const z = ov.zoom ?? 1;
    const placed: [number, number, number, number][] = [];
    for (const sg of sc.signs ?? []) placed.push([sg.x - 2, sg.y - 13, sg.x + sg.c.width + 2, sg.y + 11]);
    for (const hb of hits) placed.push(hb.box);
    for (const a of ov.avoid ?? []) placed.push(a); // ícones dos pinos (a página põe por cima do mapa)
    if (ov.fest) { const sp = byId.get(ov.fest.sprite); if (sp) placed.push([sp.top[0] + 4, sp.top[1] - 36, sp.top[0] + 70, sp.top[1] + 2]); }
    for (const q of planTags31(ov.tags, byId, placed, z, textWidth)) {
      const real = !!q.g.real;
      tag(ctx, q.cx, q.y, q.txt, real ? '#203048' : '#fbf6ea', real ? '#ffe080' : INK);
      if (q.mtxt) tag(ctx, q.cx, q.y - 9, q.mtxt, q.g.mark === 'open' ? '#2f8a4c' : '#c8302c', '#ffffff');
    }
  }
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
  return hits;
}
