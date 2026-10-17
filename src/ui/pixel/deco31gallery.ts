// R31 · DECO-A — GALERIA para o dono aprovar a arte da decoração (não entra no jogo): cada item do catálogo DECO31 no
// seu estilo (e, nos "sem época", em cada época em que existe), novo / usado / aceso; padrões em área ladrilhada;
// conjuntos por estilo; upgrades por nível; cômodos de exemplo. Aberta por docs/r31/mocks/deco/galeria-deco.html (vite).

import { Px, upscale } from './px';
import { avatarSprite, randomLook } from './avatar';
import { cityView31 } from './window31';
import { DECO31, REQ31, STYLE31_L, upgsOf31, type DecoCat31 } from '../../data/deco31';
import { DPAD, DSTY, DSTY_YEAR, DWIN, decoEras, decoFillPx, decoFloor, decoHasLight, decoIsTile, decoPx, decoStyleOf, decoWall, upgPx } from './deco31px';
import { obj5Px, type Obj5 } from './exp5px';

export type GalD = 'moveis' | 'quadros' | 'plantas' | 'luzes' | 'som' | 'colecao' | 'padroes' | 'janelas' | 'letreiros' | 'estilos' | 'upgrades' | 'comodos';
export const GALD: GalD[] = ['moveis', 'quadros', 'plantas', 'luzes', 'som', 'colecao', 'padroes', 'janelas', 'letreiros', 'estilos', 'upgrades', 'comodos'];
type CatG = Exclude<GalD, 'estilos' | 'upgrades' | 'comodos'>;
const CATS: Record<CatG, { t: string; cats: DecoCat31[] }> = {
  moveis: { t: 'Móveis', cats: ['furniture'] }, quadros: { t: 'Quadros, pôsteres e parede', cats: ['art'] }, plantas: { t: 'Plantas', cats: ['plant'] },
  luzes: { t: 'Luminárias e luzes de teto', cats: ['lamp', 'light'] }, som: { t: 'Som e aparelhos', cats: ['hifi'] }, colecao: { t: 'Coleção e enfeites', cats: ['collect'] },
  padroes: { t: 'Papéis de parede, pisos e tapetes', cats: ['paper', 'ground'] }, janelas: { t: 'Cortinas e molduras (o vão fica livre: a cidade aparece)', cats: ['window'] },
  letreiros: { t: 'Letreiros e logos (com o nome do selo)', cats: ['sign'] },
};
const LABEL = 'Disco Voador';

const el = (tag: string, st = '', txt = ''): HTMLElement => { const e = document.createElement(tag); if (st) e.style.cssText = st; if (txt) e.textContent = txt; return e; };
const cv = (p: Px, s: number): HTMLCanvasElement => { const c = upscale(p.canvas(), p.w * s, p.h * s); c.style.imageRendering = 'pixelated'; c.style.display = 'block'; return c; };
/** Item sobre a parede do estilo, com faixa de chão (objetos de chão pisam nela; de teto encostam no alto). */
function onWall(id: string, year: number, st: 'new' | 'used' | 'lit'): Px {
  const def = DECO31.find((d) => d.id === id)!, e = decoStyleOf(id, year);
  if (decoIsTile(id)) { const f = decoFillPx(id, year, 48, 32, st === 'used' ? 'used' : 'new'); return f; }
  const p = decoPx(id, year, { cond: st === 'used' ? 'used' : 'new', lit: st === 'lit', name: LABEL });
  const floor = def.slots[0] === 'floor' || def.slots[0] === 'ground';
  const q = new Px(p.w + 4, p.h + 4 + (floor ? 2 : 0));
  q.rect(0, 0, q.w, q.h, decoWall(e));
  if (floor) { q.rect(0, q.h - 4, q.w, 4, decoFloor(e)); q.blit(p, 2, q.h - 4 - p.h + DPAD + 1); }
  else if (def.slots[0] === 'ceiling') { q.rect(0, 0, q.w, 2, decoFloor(e)); q.blit(p, 2, 2 - DPAD); }
  else q.blit(p, 2, 2);
  return q;
}
function block(id: string): HTMLElement {
  const def = DECO31.find((d) => d.id === id)!;
  const eras = def.style === 'any' ? decoEras(id) : [decoStyleOf(id, def.from)];
  const lit = decoHasLight(id);
  const rows: ('new' | 'used' | 'lit')[] = lit ? ['new', 'used', 'lit'] : ['new', 'used'];
  const b = el('div', 'display:inline-block;vertical-align:top;margin:0 14px 14px 0;padding:8px;background:#1a1e2a;border:2px solid #2b3550;border-radius:4px');
  const size = decoIsTile(id) ? 'padrão 16×16' : `${def.w || 36}×${def.h || 40} px`;
  b.append(el('div', 'font:600 12px sans-serif;margin-bottom:2px', def.name.pt), el('div', 'font:11px sans-serif;color:#9aa8c0;margin-bottom:6px', `${id} · ${size} · ${STYLE31_L[def.style].pt} · ${def.from}${def.to ? '–' + def.to : '+'}`));
  const grid = el('div', `display:grid;grid-template-columns:auto repeat(${eras.length},auto);gap:4px 6px;align-items:end`);
  grid.append(el('div'));
  for (const e of eras) grid.append(el('div', 'font:10px sans-serif;color:#9aa8c0;text-align:center', def.style === 'any' ? STYLE31_L[DSTY[e]].pt : ''));
  const big = Math.max(def.w, def.h) > 40 ? 2 : 3;
  for (const st of rows) {
    grid.append(el('div', 'font:10px sans-serif;color:#9aa8c0;align-self:center', st === 'new' ? 'novo' : st === 'used' ? 'usado' : 'aceso'));
    for (const e of eras) grid.append(cv(onWall(id, Math.max(def.from, DSTY_YEAR[e]), st), big));
  }
  b.append(grid);
  return b;
}
function byCat(g: CatG): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', CATS[g].t));
  for (const d of DECO31) if (CATS[g].cats.includes(d.cat)) box.append(block(d.id));
  return box;
}
/** Um estilo: todas as peças dele (e as "sem época" na versão da época) lado a lado. */
function styles(): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', 'Conjuntos por estilo de época'));
  DSTY.forEach((st, e) => {
    const row = el('div', 'margin-bottom:12px;padding:8px;background:#1a1e2a;border:2px solid #2b3550;border-radius:4px');
    row.append(el('div', 'font:600 13px sans-serif;margin-bottom:6px', `${STYLE31_L[st].pt} · ${DSTY_YEAR[e]}`));
    const wrap = el('div', `display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end;background:#${decoWall(e).toString(16).slice(2).match(/../g)!.reverse().join('')};padding:6px`);
    for (const d of DECO31) if (d.style === st && !decoIsTile(d.id)) wrap.append(cv(decoPx(d.id, DSTY_YEAR[e], { name: LABEL }), 2));
    row.append(wrap);
    box.append(row);
  });
  return box;
}
/** Item obrigatório do jogo (exp5px) que é o "nível 0" de cada obrigatório, quando existe. */
const REQ_OBJ5: Record<string, Obj5> = { telefone: 'phone', arquivoaco: 'filing', cofre: 'safe', livrocaixa: 'ledger', fichario: 'rolodex', mesames: 'monthdesk', radiotv: 'radiotv', mesareuniao: 'meeting', cama: 'bed' };
function upgrades(): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', 'Upgrades dos itens obrigatórios (nível 0 = o objeto de hoje; cada nível visivelmente melhor)'));
  for (const r of REQ31) {
    const ups = upgsOf31(r.id).slice().sort((a, b) => a.lv - b.lv || a.from - b.from);
    const b = el('div', 'display:inline-block;vertical-align:top;margin:0 14px 14px 0;padding:8px;background:#1a1e2a;border:2px solid #2b3550;border-radius:4px');
    b.append(el('div', 'font:600 13px sans-serif;margin-bottom:6px', r.name.pt));
    const grid = el('div', 'display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap');
    const cell = (lbl: string, sub: string, ps: Px[]) => { const c = el('div', 'display:flex;flex-direction:column;align-items:center;gap:3px'); for (const q of ps) c.append(cv(q, 3)); c.append(el('div', 'font:600 10px sans-serif;color:#f0c060', lbl), el('div', 'font:10px sans-serif;color:#9aa8c0;max-width:150px;text-align:center', sub)); grid.append(c); };
    const o5 = REQ_OBJ5[r.id];
    if (o5) cell('nível 0', 'o de hoje (exp5)', [obj5Px(o5, 1960)]);
    for (const u of ups) { const y = Math.max(u.from, 1905); cell(`nível ${u.lv}`, `${u.name.pt} · ${u.from}${u.to ? '–' + u.to : '+'}`, [upgPx(u.id, y), upgPx(u.id, y, { lit: true }), upgPx(u.id, y, { cond: 'used' })]); }
    b.append(grid, el('div', 'font:10px sans-serif;color:#9aa8c0;margin-top:4px', 'em cada coluna: novo · aceso · usado'));
    box.append(b);
  }
  return box;
}

interface RoomItem { id: string; x: number; up?: boolean; lit?: boolean; used?: boolean; y?: number }
interface RoomSpec { t: string; year: number; city: string; paper: string; ground: string; win: string; winX: number; items: RoomItem[]; sign?: string }
const RW = 240, RH = 130, FLOOR = 100;
/** Monta um cômodo: papel de parede + piso ladrilhados, janela com a cidade real e a cortina/moldura, itens nos lugares. */
function room(r: RoomSpec): HTMLCanvasElement {
  const p = new Px(RW, RH);
  p.blit(decoFillPx(r.paper, r.year, RW, FLOOR), 0, 0);
  p.blit(decoFillPx(r.ground, r.year, RW, RH - FLOOR), 0, FLOOR);
  p.hline(0, RW - 1, FLOOR, 0xff302020); p.hline(0, RW - 1, FLOOR - 1, 0xff504040);
  const wy = 14;
  p.blit(cityView31(r.city, r.year, 6, DWIN.w, DWIN.h), r.winX + DWIN.x, wy + DWIN.y);
  for (const it of r.items) {
    const q = it.up ? upgPx(it.id, r.year, { lit: it.lit }) : decoPx(it.id, r.year, { lit: it.lit, cond: it.used ? 'used' : 'new', name: 'Disco Voador' });
    const def = DECO31.find((d) => d.id === it.id);
    const slot = it.up ? (['telefone', 'livrocaixa', 'fichario'].some((k) => it.id.startsWith(`u_${k}`)) ? 'desk' : 'floor') : def!.slots[0];
    let y: number;
    if (it.y !== undefined) y = it.y - q.h + DPAD;
    else if (slot === 'ceiling') y = -DPAD;
    else if (slot === 'wall') y = 22;
    else if (slot === 'window') y = wy - DPAD;
    else if (slot === 'ground') y = FLOOR + 4;
    else y = FLOOR + 8 - q.h + DPAD; // pisa no chão (um pouco para dentro do piso)
    p.blit(q, it.x - DPAD, y);
  }
  const c = cv(p, 3);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const av = avatarSprite(randomLook('dono-deco'), { year: r.year });
  g.drawImage(av.c, (RW - 40 - av.ax) * 3, (FLOOR + 14 - av.ay) * 3, av.c.width * 3, av.c.height * 3);
  return c;
}
const ROOMS: RoomSpec[] = [
  { t: 'Casa · sala de estar · 1962 (anos 50)', year: 1962, city: 'rio', paper: 'w_atomic', ground: 'g_parquet', win: 'k_barkcloth', winX: 92, items: [
    { id: 'k_barkcloth', x: 92 }, { id: 't_sputnik', x: 40 }, { id: 'a_abstract_fifties', x: 6 }, { id: 'a_starburst_clock', x: 150 },
    { id: 'd_credenza_fifties', x: 132 }, { id: 'p_cactus', x: 140, y: FLOOR - 13 }, { id: 'h_hifi_tube', x: 4, lit: true }, { id: 'l_atomic', x: 72, lit: true },
    { id: 'g_persian', x: 40 }, { id: 'd_sofa_fifties', x: 38 }, { id: 'd_boomerang_table', x: 92 }, { id: 'h_tv_fifties', x: 196, lit: true },
  ] },
  { t: 'Sede · sua sala · 1985 (anos 80)', year: 1985, city: 'nyc', paper: 'w_grey_sponge', ground: 'g_grey_carpet', win: 'k_vertical', winX: 60, items: [
    { id: 'k_vertical', x: 60 }, { id: 't_track', x: 110, lit: true }, { id: 'a_platinum', x: 10 }, { id: 'a_gold_lp', x: 34 }, { id: 'a_neon_art', x: 104, lit: true },
    { id: 'd_memphis_shelf', x: 6 }, { id: 'p_ficus', x: 42 }, { id: 'u_cofre_2_1940', x: 210, up: true }, { id: 'd_glass_desk', x: 100 },
    { id: 'u_telefone_2_1985', x: 104, up: true, y: FLOOR - 5 }, { id: 'u_livrocaixa_2_1982', x: 116, up: true, y: FLOOR - 5 }, { id: 'l_halogen', x: 146, lit: true }, { id: 'd_sofa_eighties', x: 160 },
  ] },
  { t: 'Bar do selo · 2015 (casa inteligente, com jukebox vintage)', year: 2015, city: 'london', paper: 'w_brick', ground: 'g_polished_concrete', win: 'k_linen', winX: 4, items: [
    { id: 'k_linen', x: 4 }, { id: 't_industrial', x: 120, lit: true }, { id: 'l_neon_sign', x: 60, lit: true }, { id: 'a_grunge_flyer', x: 150 }, { id: 'a_led_wall', x: 190, lit: true },
    { id: 'h_pa_speaker', x: 46 }, { id: 'd_bar_counter', x: 92 }, { id: 'h_jukebox', x: 160, lit: true, used: true }, { id: 'd_record_bin', x: 186 }, { id: 'p_monstera', x: 214 },
  ] },
];
function rooms(): HTMLElement {
  const box = el('div');
  box.append(el('h2', 'margin:4px 0 10px;font:600 18px sans-serif;color:#f0c060', 'Cômodos de exemplo (papel, piso, janela com a cidade real, itens nos lugares, boneco para escala)'));
  for (const r of ROOMS) { const b = el('div', 'margin-bottom:14px'); b.append(el('div', 'font:600 13px sans-serif;margin-bottom:4px', r.t), room(r)); box.append(b); }
  return box;
}

export function decoGallery(sec: GalD): HTMLElement {
  const root = el('div', 'background:#12141c;color:#e8e0c8;padding:14px;font-family:sans-serif;width:max-content;max-width:1600px');
  root.append(sec === 'estilos' ? styles() : sec === 'upgrades' ? upgrades() : sec === 'comodos' ? rooms() : byCat(sec));
  return root;
}
