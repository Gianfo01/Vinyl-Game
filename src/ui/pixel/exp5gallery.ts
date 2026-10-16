// R31 · onda 5 (ART5) — GALERIA para o dono aprovar a arte nova (não entra no jogo): cada objeto em todas as épocas e
// estados, cada papel com um conteúdo de exemplo por cima, a caixa de entrada nas aparências da época e os ícones de viagem.
// Aberta por docs/r31/mocks/onda5/galeria-art.html (vite) e capturada por scripts/r31/shots-exp5art.mjs.

import { C, Px, upscale } from './px';
import { paletteOf } from './palette';
import { portraitPx } from './avatar';
import { EP5, EP5_LABEL, EP5_YEAR, OBJ5, ST5, TRAVEL5, TRAVEL5_LABEL, PAD5, obj5Px, travel5Px as travelPx, type Obj5, type St5 } from './exp5px';
import {
  INBOX5, INBOX5_LABEL, PAPER5, PAPER5_LABEL, card5Px, inbox5Layout, inbox5Px, inboxItem5Px, paper5Layout, paper5Px, polaroid5Px,
  postit5Px, tab5Px, magnet5, type Cat5, type Rect5,
} from './exp5paper';

export type Gal5 = 'recepcao' | 'sala' | 'reuniao' | 'casa' | 'papeis' | 'caixa' | 'icones';
export const GAL5: Gal5[] = ['recepcao', 'sala', 'reuniao', 'casa', 'papeis', 'caixa', 'icones'];
const GROUPS: Record<'recepcao' | 'sala' | 'reuniao' | 'casa', { t: string; ids: Obj5[] }> = {
  recepcao: { t: 'Sede · recepção, corredor e sua sala (1)', ids: ['door', 'worldmap', 'mail', 'calendar', 'monthdesk', 'keys', 'trophies', 'ledger'] },
  sala: { t: 'Sede · sua sala (2)', ids: ['safe', 'filing', 'rolodex', 'phone', 'paper', 'radiotv', 'goals', 'diary', 'learnbook', 'photo'] },
  reuniao: { t: 'Sede · sala de reunião e A&R', ids: ['whiteboard', 'meeting', 'model', 'cork', 'planning', 'scoutdesk', 'demos'] },
  casa: { t: 'Sua casa', ids: ['mirror', 'bed', 'writedesk', 'instrument', 'garage', 'kidsroom'] },
};
const ST_LABEL: Record<St5, string> = { idle: 'parado', new: 'novidade (!)', lit: 'aceso' };

const el = (tag: string, st = '', txt = ''): HTMLElement => { const e = document.createElement(tag); if (st) e.style.cssText = st; if (txt) e.textContent = txt; return e; };
const cv = (p: Px, s: number): HTMLCanvasElement => { const c = upscale(p.canvas(), p.w * s, p.h * s); c.style.imageRendering = 'pixelated'; c.style.display = 'block'; return c; };
/** Objeto sobre a parede da época, com uma faixa de chão (para ver o contorno e a escala contra o fundo da sede). */
function onWall(p: Px, year: number, floor: boolean): Px {
  const pal = paletteOf(year);
  const q = new Px(p.w + 4, p.h + 4);
  q.rect(0, 0, q.w, q.h, pal.wall);
  if (floor) { q.rect(0, q.h - 4, q.w, 4, pal.floors.office.a); q.hline(0, q.w - 1, q.h - 4, pal.trim); }
  q.blit(p, 2, floor ? PAD5 : 2); // objeto de chão encosta no piso (a margem de baixo cai sobre ele)
  return q;
}

function objects(g: keyof typeof GROUPS): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', GROUPS[g].t));
  for (const id of GROUPS[g].ids) {
    const d = OBJ5.find((o) => o.id === id)!;
    const blk = el('div', 'display:inline-block;vertical-align:top;margin:0 18px 18px 0;padding:8px;background:#1a1e2a;border:2px solid #2b3550;border-radius:4px');
    blk.append(el('div', 'font:600 13px sans-serif;margin-bottom:6px', `${d.pt} · ${d.w}×${d.h} px · ${d.where} · ${d.mount === 'wall' ? 'parede' : d.mount === 'desk' ? 'sobre a mesa' : 'chão'}`));
    const grid = el('div', `display:grid;grid-template-columns:auto repeat(${EP5.length},auto);gap:4px 6px;align-items:end`);
    grid.append(el('div'));
    for (const e of EP5) grid.append(el('div', 'font:11px sans-serif;color:#9aa8c0;text-align:center', EP5_LABEL[e]));
    const s = d.w > 44 ? 2 : 3;
    for (const st of ST5) {
      grid.append(el('div', 'font:11px sans-serif;color:#9aa8c0;align-self:center', ST_LABEL[st]));
      for (const e of EP5) grid.append(cv(onWall(obj5Px(id, EP5_YEAR[e], st), EP5_YEAR[e], d.mount === 'floor'), s));
    }
    blk.append(grid);
    box.append(blk);
  }
  return box;
}

const SAMPLE = ['Maria Bastos', 'Os Lunáticos', 'Silver Avenue', 'Marta Quinn', 'Milo Fenn', 'Duo Riviera'];
/** Texto HTML posicionado sobre uma área (em pixels lógicos × escala). */
function over(host: HTMLElement, r: Rect5, s: number, txt: string, st = ''): HTMLElement {
  const e = el('div', `position:absolute;left:${r.x * s}px;top:${r.y * s}px;width:${r.w * s}px;height:${r.h * s}px;overflow:hidden;${st}`, txt);
  host.append(e);
  return e;
}
function pxAt(host: HTMLElement, p: Px, x: number, y: number, s: number, ps = s): void {
  const c = cv(p, ps); c.style.position = 'absolute'; c.style.left = `${x * s}px`; c.style.top = `${y * s}px`; host.append(c);
}

function papers(): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', 'Papéis (moldura em pixel art; o conteúdo é HTML por cima)'));
  const s = 2, W = 300, H = 170;
  for (const k of PAPER5) {
    const card = el('div', 'display:inline-block;vertical-align:top;margin:0 16px 16px 0');
    card.append(el('div', 'font:600 13px sans-serif;margin-bottom:4px', PAPER5_LABEL[k].pt));
    const host = el('div', `position:relative;width:${W * s}px;height:${H * s}px`);
    host.append(cv(paper5Px(k, W, H), s));
    const L = paper5Layout(k, W, H);
    const dark = k === 'ledger' || k === 'scout' || k === 'agenda' || k === 'cork';
    over(host, L.head, s, PAPER5_LABEL[k].pt.toUpperCase(), `font:700 15px monospace;letter-spacing:1px;color:${k === 'charts' ? '#fff' : dark ? '#f0e6c8' : '#2a2026'};line-height:${L.head.h * s}px`);
    ['Primeira', 'Segunda', 'Terceira'].forEach((t, i) => { pxAt(host, tab5Px(k, 34, i === 0), L.tabs.x + i * 36, L.tabs.y, s); over(host, { x: L.tabs.x + i * 36, y: L.tabs.y, w: 34, h: 11 }, s, t, `font:600 11px sans-serif;text-align:center;line-height:22px;color:${i === 0 && k !== 'scout' && k !== 'form' && k !== 'ledger' ? '#fff' : '#2a2026'}`); });
    const b = L.body[0];
    if (k === 'cork') SAMPLE.slice(0, 4).forEach((n, i) => pxAt(host, polaroid5Px(44, 52, [C('#c83a32'), C('#2a8a4a'), C('#e0c040'), C('#3a6ac8')][i], portraitPx({ id: n }, 1962)), b.x + 8 + i * 56, b.y + 8 + (i % 2) * 6, s));
    else if (k === 'rolodex') SAMPLE.slice(0, 6).forEach((n, i) => { const x = b.x + 6 + (i % 3) * 92, y = b.y + 4 + Math.floor(i / 3) * 52; pxAt(host, card5Px(86, 46, i === 0 ? C('#2a8a4a') : undefined), x, y, s); pxAt(host, portraitPx({ id: n }, 1962), x + 4, y + 10, s, 1); over(host, { x: x + 24, y: y + 9, w: 60, h: 8 }, s, n, 'font:600 12px sans-serif;color:#2a2026'); });
    else if (k === 'whiteboard') [C('#f8e070'), C('#a8d0f8'), C('#a8e098')].forEach((c, i) => { pxAt(host, postit5Px(52, 26, c), b.x + 8 + i * 70, b.y + 10, s); const q = new Px(8, 8); magnet5(q, 4, 3, C('#c83a32')); pxAt(host, q, b.x + 30 + i * 70, b.y + 7, s); });
    else for (const r of L.body) over(host, r, s, 'Conteúdo da página (HTML) — mesmas linhas, cores e teclas de hoje.', `padding:${12 * s}px ${8 * s}px;box-sizing:border-box;font:13px serif;color:${k === 'planning' ? '#3a3030' : '#3a3030'}`);
    card.append(host);
    box.append(card);
  }
  // peças de conteúdo
  const parts = el('div', 'margin-top:6px;display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap');
  parts.append(el('div', 'font:600 13px sans-serif;width:100%', 'Peças: polaroid (sépia e cor), ficha do fichário, post-its'));
  parts.append(cv(polaroid5Px(44, 52, C('#2a8a4a'), portraitPx({ id: 'Lia Moreau' }, 1910), true), 3), cv(polaroid5Px(44, 52, C('#3a6ac8'), portraitPx({ id: 'Sammy Cole' }, 1975)), 3), cv(card5Px(86, 46, C('#c83a32')), 3));
  for (const c of [C('#f8e070'), C('#f0a0b8'), C('#a8e098')]) parts.append(cv(postit5Px(30, 24, c), 3));
  box.append(parts);
  return box;
}

const MAIL: [string, string, Cat5, boolean, boolean][] = [
  ['Guilda dos Músicos', 'A Guilda apresenta pauta: +8% no piso', 'decisao', true, false],
  ['Wes Mercer', 'Mercer está cortejando Silver Avenue', 'resposta', false, true],
  ['Festival', 'Inscrições abertas: line-up e cachês', 'contrato', false, false],
  ['Melody Maker', 'Pedido de entrevista com Maria Bastos', 'imprensa', false, false],
  ['Seu analista', 'Boletim da semana: o que olhar a seguir', 'relatorio', false, false],
  ['Banco', 'Extrato do mês e taxa do empréstimo', 'financas', false, false],
];
function inbox(): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', 'Caixa de entrada · mesma estrutura em todas as épocas'));
  const s = 2, W = 330, H = 200;
  for (const k of INBOX5) {
    const L = inbox5Layout(k, W, H);
    const card = el('div', 'display:inline-block;vertical-align:top;margin:0 16px 16px 0');
    card.append(el('div', 'font:600 13px sans-serif;margin-bottom:4px', `${INBOX5_LABEL[k].years} · ${INBOX5_LABEL[k].pt}`));
    const host = el('div', `position:relative;width:${W * s}px;height:${H * s}px`);
    host.append(cv(inbox5Px(k, W, H), s));
    const onDark = k === 'desk' || k === 'telegram' || k === 'crt' || k === 'flat';
    over(host, L.head, s, 'CAIXA DE ENTRADA', `font:700 13px monospace;color:${onDark ? (k === 'crt' || k === 'flat' ? '#fff' : '#f0e6c8') : '#2a2026'};line-height:${L.head.h * s}px`);
    over(host, L.tabs, s, 'Entrada 29 · Adiadas 4 · Arquivadas 212', `font:600 11px sans-serif;line-height:${L.tabs.h * s}px;color:${k === 'desk' || k === 'telegram' ? '#f0e6c8' : '#2a2026'}`);
    over(host, L.filters, s, '○ não lidas · ● pedem resposta · ● estrela · ● decisões', `font:10px sans-serif;line-height:${L.filters.h * s}px;color:${k === 'desk' || k === 'telegram' ? '#e0d4b4' : '#4a4c56'}`);
    const ih = 22;
    MAIL.slice(0, Math.floor(L.list.h / (ih + 2))).forEach(([who, sub, cat, sel, urg], i) => {
      const y = L.list.y + i * (ih + 2);
      pxAt(host, inboxItem5Px(k, L.list.w - 2, ih, cat, { sel, urgent: urg, unread: i < 4 }), L.list.x, y, s);
      over(host, { x: L.list.x + 18, y: y + 3, w: L.list.w - 22, h: ih - 4 }, s, '', '').innerHTML = `<b style="font:600 11px sans-serif;color:${sel && (k === 'crt' || k === 'flat') ? '#fff' : '#1e1a1e'}">${who}</b><br><span style="font:10px sans-serif;color:${sel && (k === 'crt' || k === 'flat') ? '#dde' : '#4a4c56'}">${sub}</span>`;
    });
    over(host, L.read, s, 'Leitura da mensagem e respostas (aceitar · negociar · recusar · adiar)', `background:${k === 'phone' ? '#fff' : k === 'fax' ? '#fbfaf4' : k === 'crt' ? '#fff' : k === 'flat' ? '#fff' : '#f8f0dc'};padding:8px;box-sizing:border-box;font:11px serif;color:#2a2026;border:1px solid #2a2026`);
    over(host, L.notes, s, 'Pendências', 'background:#fbf2a8;padding:6px;box-sizing:border-box;font:700 10px monospace;color:#2a2026;border:1px solid #2a2026');
    over(host, L.keys, s, 'J/K · Enter · A · S · 1–4 · Esc', 'background:#2a2026;padding:6px;box-sizing:border-box;font:10px sans-serif;color:#e8e0c8');
    card.append(host);
    box.append(card);
  }
  return box;
}

function icons(): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', 'Ícones de viagem 16×16 (parado · aceso = lugar atual · novidade)'));
  const row = el('div', 'display:flex;gap:18px;flex-wrap:wrap');
  for (const scale of [1, 2, 4]) {
    const g = el('div', 'padding:10px;background:#1a1e2a;border:2px solid #2b3550;border-radius:4px');
    g.append(el('div', 'font:11px sans-serif;color:#9aa8c0;margin-bottom:6px', `escala ${scale}×`));
    for (const st of ST5) {
      const r = el('div', 'display:flex;gap:10px;margin-bottom:8px;align-items:center');
      r.append(el('div', 'font:11px sans-serif;color:#9aa8c0;width:84px', ST_LABEL[st]));
      for (const id of TRAVEL5) {
        const b = el('div', `display:flex;flex-direction:column;align-items:center;padding:4px 6px;background:${st === 'lit' ? '#4a3a10' : '#1c3048'};border:2px solid ${st === 'lit' ? '#f0c060' : '#3f5f84'};border-radius:3px`);
        b.append(cv(travelPx(id, st), scale), el('div', `font:700 9px monospace;margin-top:3px;color:${st === 'lit' ? '#f0c060' : '#cfd8e2'}`, TRAVEL5_LABEL[id].pt.toUpperCase()));
        r.append(b);
      }
      g.append(r);
    }
    row.append(g);
  }
  box.append(row);
  return box;
}

/** Monta uma seção da galeria. */
export function exp5Gallery(sec: Gal5): HTMLElement {
  const root = el('div', `background:#12141c;color:#e8e0c8;padding:14px;font-family:sans-serif;width:max-content;max-width:1500px`);
  root.append(sec === 'papeis' ? papers() : sec === 'caixa' ? inbox() : sec === 'icones' ? icons() : objects(sec));
  return root;
}
