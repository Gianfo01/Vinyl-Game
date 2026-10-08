// Mapa-múndi interativo (Canvas 2D, estética pixel art): fronteiras do ano, blocos da Guerra Fria,
// mercados, cidades, rotas de turnê com meio de transporte, vistos e clima do mês.
// Projeção equirretangular do GDD: x = (lon + 180) / 360 × W, y = (85 − lat) / 170 × H.

import {
  countryName, geoData, loadGeo, marketOfCountry, partitionOf, politicalUnitsAt, unitAtPoint, unitOfCity, unitOfCountry,
  countryIndexAt, countryOfCity, type Geo, type PoliticalUnit,
} from '../data/geo';
import { MARKETS, cityById, l, type L, type MarketId } from '../data/world';
import { t } from '../i18n/strings';
import { climateAt, planRoute, type ClimateIcon, type RoutePlan, type TransportMode } from '../sim/travel';
import { h, clear } from './dom';

export type MapMode = 'tour' | 'markets' | 'scenes';
export type MapTint = 'political' | 'blocs' | 'markets';
export type ContinentId = 'nam' | 'sam' | 'eur' | 'afr' | 'asia' | 'oce';

export interface MapCity {
  id: string;
  /** cor do marcador (padrão: verde = tem público) */
  color?: string;
  /** escala do marcador (1 = normal) */
  size?: number;
  /** rótulo alternativo (padrão: nome da cidade) */
  label?: string;
  /** texto curto num selo (ex.: nº de fãs, posição) */
  badge?: string;
  /** sem acesso: marcador cinza */
  locked?: boolean;
}

export type OverlayIcon = 'hq' | 'branch' | 'rival' | 'festival' | 'movement' | 'tour' | 'club' | 'warn';
export type MapOverlay =
  /** círculo proporcional (0..1) — mapa de calor de fãs, tamanho de cena etc. */
  | { kind: 'bubble'; city: string; value: number; color: string }
  /** arco entre duas cidades (turnês em andamento, rivalidades, rotas de filial) */
  | { kind: 'arc'; from: string; to: string; color: string; dashed?: boolean; width?: number }
  /** ícone pixel art ao lado da cidade */
  | { kind: 'icon'; city: string; icon: OverlayIcon; slot?: number };

export interface WorldMapOptions {
  getYear: () => number;
  /** 0 = janeiro */
  getMonth: () => number;
  cities: () => MapCity[];
  selected: string[];
  /** rota ordenada (primeiro = origem) */
  route?: string[];
  crewSize?: number;
  mode: MapMode;
  onCityClick: (id: string) => void;
  onCountryClick?: (a3: string) => void;
  /** camadas extras desenhadas entre a rota e as cidades */
  overlays?: () => MapOverlay[];
  /** sombreamento por país (ex.: censura, guerra, embargo) */
  countryShade?: (a3: string) => { color: string; hatch?: boolean } | undefined;
  /** linhas extras no balão de uma cidade */
  cityTipExtra?: (id: string) => HTMLElement | null;
  /** linhas extras no balão de um país */
  countryTipExtra?: (a3: string) => HTMLElement | null;
  /** itens extras na legenda */
  legendExtra?: () => HTMLElement[];
}

const WORLD_W = 360;
const WORLD_H = 170;

const CONTINENTS: { id: ContinentId; name: L; box: [number, number, number, number] }[] = [
  { id: 'nam', name: l('Am. do Norte', 'N. America'), box: [-128, 7, -55, 62] },
  { id: 'sam', name: l('Am. do Sul', 'S. America'), box: [-88, -56, -30, 15] },
  { id: 'eur', name: l('Europa', 'Europe'), box: [-12, 34, 42, 66] },
  { id: 'afr', name: l('África', 'Africa'), box: [-20, -36, 54, 38] },
  { id: 'asia', name: l('Ásia', 'Asia'), box: [25, -10, 150, 58] },
  { id: 'oce', name: l('Oceania', 'Oceania'), box: [110, -48, 180, 2] },
];

const TINTS: { id: MapTint; name: L }[] = [
  { id: 'political', name: l('Política', 'Political') },
  { id: 'blocs', name: l('Guerra Fria', 'Cold War') },
  { id: 'markets', name: l('Mercados', 'Markets') },
];

const BLOC_NAMES: Record<string, L> = { west: l('Bloco ocidental', 'Western bloc'), east: l('Bloco socialista', 'Eastern bloc'), nonaligned: l('Não alinhado', 'Non-aligned') };
const MODE_NAMES: Record<TransportMode, L> = {
  train: l('trem', 'train'), bus: l('ônibus', 'bus'), ship: l('navio', 'ship'), prop_plane: l('avião a hélice', 'prop plane'), jet: l('jato', 'jet'), hyperloop: l('hyperloop', 'hyperloop'),
};
export const transportName = (m: TransportMode) => t(MODE_NAMES[m]);

// ---------------------------------------------------------------- glifos pixel art

type Glyph = { rows: string[]; colors: Record<string, string> };
const G = (rows: string[], colors: Record<string, string>): Glyph => ({ rows, colors });
const INK = '#2a1f1a';
const TRANSPORT_GLYPHS = new Set<string>(['ship', 'prop_plane', 'jet', 'train', 'bus', 'hyperloop']);
const GLYPHS: Record<TransportMode | ClimateIcon | OverlayIcon | 'visa' | 'visa_bad', Glyph> = {
  ship: G(['....r.....', '....rr....', '....rrr...', '....k.....', 'kkkkkkkkkk', '.kwwwwwwk.', '..kkkkkk..'], { r: '#d8473a', k: INK, w: '#f2efe6' }),
  prop_plane: G(['....k.....', '....kk....', 'kkkkkkkkkk', '.wwwwwwwkk', '....kk....', '....k.....', '..kkk.....'], { k: INK, w: '#7aa0b8' }),
  jet: G(['.....k....', '.....kk...', 'k...kkkk..', 'kkkkkkkkkk', 'k...kkkk..', '.....kk...', '.....k....'], { k: INK }),
  train: G(['.kkkkkkk..', '.kwwkwwk..', '.kkkkkkkk.', '.kkkkkkkkk', '..o..o..o.'], { k: '#7a3b22', w: '#f2d98a', o: INK }),
  bus: G(['kkkkkkkkk.', 'kwwkwwkwwk', 'kkkkkkkkkk', '.o.....o..'], { k: '#d89a28', w: '#cfe6f0', o: INK }),
  hyperloop: G(['.kkkkkkkk.', 'kwwwwwwwwk', '.kkkkkkkk.'], { k: '#5a4fcf', w: '#c9c4ff' }),
  sun: G(['..y..y..', '...yy...', 'y.yyyy.y', '.yyyyyy.', '.yyyyyy.', 'y.yyyy.y', '...yy...', '..y..y..'], { y: '#f0b429' }),
  heat: G(['..r..r..', '...rr...', 'r.oooo.r', '.oooooo.', '.oooooo.', 'r.oooo.r', '...rr...', '..r..r..'], { r: '#d8473a', o: '#f08a24' }),
  cloud: G(['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '.gggggg.'], { w: '#e6e9ee', g: '#9aa3ad' }),
  snow: G(['...w...', '.w.w.w.', '..wbw..', 'wwbbbww', '..wbw..', '.w.w.w.', '...w...'], { w: '#f4fbff', b: '#7fb6e6' }),
  rain: G(['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '.b..b..b', 'b..b..b.'], { w: '#c9d1da', b: '#3f8fd8' }),
  monsoon: G(['...gg...', '..gggg..', '.gggggg.', 'gggggggg', 'b.b.b.b.', '.b.b.b.b', 'b.b.b.b.'], { g: '#6c7a89', b: '#2f78c4' }),
  storm: G(['...gg...', '..gggg..', '.gggggg.', 'gggggggg', '...yy...', '..yy....', '...yy...', '....y...'], { g: '#59616b', y: '#f6d33c' }),
  hq: G(['...k...', '..kyk..', '.kyyyk.', 'kyyyyyk', '.kwkwk.', '.kwkwk.', '.kkkkk.'], { k: INK, y: '#f0b429', w: '#f4ead8' }),
  branch: G(['..k..', '.kyk.', 'kyyyk', 'kwkwk', 'kkkkk'], { k: INK, y: '#c8641e', w: '#f4ead8' }),
  rival: G(['k......', 'krrrr..', 'krrrrr.', 'krrrr..', 'k......', 'k......', 'k......'], { k: INK, r: '#d8473a' }),
  festival: G(['...r...', '...k...', '..kpk..', '.kpwpk.', 'kpwpwpk', 'kpwkwpk', 'kkkkkkk'], { k: INK, p: '#a35bd8', w: '#f4ead8', r: '#3fa860' }),
  movement: G(['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: '#f0b429' }),
  tour: G(['kkkkkkk.', 'kwwwwwkk', 'kwwwwwkk', 'kkkkkkkk', '.o....o.'], { k: '#5a4fcf', w: '#c9c4ff', o: INK }),
  club: G(['.kkkkk.', 'kpppppk', 'kpwpwpk', 'kpppppk', 'kpkkkpk', 'kkkkkkk'], { k: INK, p: '#a35bd8', w: '#f6d33c' }),
  warn: G(['...k...', '..kyk..', '..kyk..', '.kykyk.', '.kyyyk.', 'kyykyyk', 'kkkkkkk'], { k: INK, y: '#f6d33c' }),
  visa: G(['kkkkkkk', 'kyyyyyk', 'kykkkyk', 'kyyyyyk', 'kykkkyk', 'kyyyyyk', 'kkkkkkk'], { k: INK, y: '#f0b429' }),
  visa_bad: G(['kkkkkkk', 'krrrrrk', 'krwrwrk', 'krrwrrk', 'krwrwrk', 'krrrrrk', 'kkkkkkk'], { k: INK, r: '#d8473a', w: '#fff' }),
};

function drawGlyph(ctx: CanvasRenderingContext2D, g: Glyph, cx: number, cy: number, px: number, outline = true, chip = false): void {
  const w = g.rows[0].length;
  const hh = g.rows.length;
  const x0 = Math.round(cx - (w * px) / 2);
  const y0 = Math.round(cy - (hh * px) / 2);
  if (chip) {
    // plaquinha clara com borda escura: legível em tema claro e escuro
    ctx.fillStyle = INK;
    ctx.fillRect(x0 - 2 * px, y0 - 2 * px, (w + 4) * px, (hh + 4) * px);
    ctx.fillStyle = '#f4ead8';
    ctx.fillRect(x0 - px, y0 - px, (w + 2) * px, (hh + 2) * px);
    outline = false;
  }
  if (outline) {
    ctx.fillStyle = 'rgba(20,14,10,0.7)';
    for (let r = 0; r < hh; r++) for (let c = 0; c < w; c++) {
      if (g.rows[r][c] === '.') continue;
      ctx.fillRect(x0 + c * px - px / 2, y0 + r * px - px / 2, px * 2, px * 2);
    }
  }
  for (let r = 0; r < hh; r++) for (let c = 0; c < w; c++) {
    const ch = g.rows[r][c];
    if (ch === '.') continue;
    ctx.fillStyle = g.colors[ch] ?? INK;
    ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
  }
}

/** Desenha um ícone de clima/transporte num <canvas> pequeno (para tabelas e legendas). */
export type GlyphName = keyof typeof GLYPHS;
export function glyphCanvas(name: keyof typeof GLYPHS, px = 2): HTMLCanvasElement {
  const g = GLYPHS[name];
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const chip = TRANSPORT_GLYPHS.has(name);
  const pad = chip ? 5 : 2;
  const w = (g.rows[0].length + pad) * px;
  const hh = (g.rows.length + pad) * px;
  const c = h('canvas', { class: 'glyph', width: w * dpr, height: hh * dpr, style: `width:${w}px;height:${hh}px`, 'aria-hidden': 'true' });
  const ctx = c.getContext('2d');
  if (ctx) drawGlyph(ctx, g, (w * dpr) / 2, (hh * dpr) / 2, px * dpr, false, chip);
  return c;
}

// ---------------------------------------------------------------- cores do tema

interface Theme {
  ocean: string; ocean2: string; land: string; coast: string; label: string; border: string; inner: string; ink: string; halo: string;
  pal: string[]; west: string; east: string; nonaligned: string; markets: Record<MarketId, string>;
  audience: string; selected: string; locked: string; route: string;
}

function readTheme(el: HTMLElement): Theme {
  const cs = getComputedStyle(el);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    ocean: v('--map-ocean', '#b9d2dc'), ocean2: v('--map-ocean-2', '#a7c4d0'), land: v('--map-land', '#e8dcc0'),
    coast: v('--map-coast', '#4b3b2e'), label: v('--map-label', '#4b3b2e'), border: v('--map-border', '#6d5a48'), inner: v('--map-inner', '#8a7a68'),
    ink: v('--ink', '#241c17'), halo: v('--map-halo', '#fffaf2'),
    pal: [1, 2, 3, 4, 5, 6, 7].map((i) => v(`--map-p${i}`, ['#d9c38a', '#a9c47f', '#e0a77a', '#9fb8c9', '#c9a6c4', '#e3cf6f', '#b9b09c'][i - 1])),
    west: v('--map-west', '#7fa6d6'), east: v('--map-east', '#d77a6c'), nonaligned: v('--map-nonaligned', '#d9cf8e'),
    markets: {
      na: v('--map-m-na', '#7fa6d6'), eu: v('--map-m-eu', '#a99be0'), br: v('--map-m-br', '#7cc48c'), latam: v('--map-m-latam', '#e8a26a'),
      asia: v('--map-m-asia', '#e07f8f'), africa: v('--map-m-africa', '#d9c06a'), oceania: v('--map-m-oceania', '#6cc4c0'),
    },
    audience: v('--good', '#2f7d4f'), selected: v('--gold', '#b8901c'), locked: v('--muted', '#7a6d62'), route: v('--accent', '#c8641e'),
  };
}

// ---------------------------------------------------------------- componente

interface YearCache {
  year: number;
  /** unidade de cada país (pela parte "fora" das partições) */
  unitOf: PoliticalUnit[];
  colorOf: Map<string, number>;
  units: PoliticalUnit[];
}

export class WorldMap {
  readonly element: HTMLElement;
  private opts: WorldMapOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stage: HTMLElement;
  private tooltip: HTMLElement;
  private legend: HTMLElement;
  private a11y: HTMLElement;
  private tintBar: HTMLElement;
  private tint: MapTint;
  private geo: Geo | null = null;
  private countryPaths: Path2D[] = [];
  private arcPaths: Path2D[] = [];
  private yc: YearCache | null = null;
  private w = 0;
  private hgt = 0;
  private dpr = 1;
  private k = 1;
  private tx = 0;
  private ty = 0;
  private raf = 0;
  private anim = 0;
  private ro: ResizeObserver | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: { x: number; y: number; tx: number; ty: number; moved: boolean } | null = null;
  private pinch: { d: number; k: number; mx: number; my: number; tx: number; ty: number } | null = null;
  private hoverCity: string | null = null;
  private hoverCountry = -1;
  private focusCity: string | null = null;
  private plan: RoutePlan | null = null;
  private planKey = '';
  private destroyed = false;

  constructor(opts: WorldMapOptions) {
    this.opts = { ...opts };
    this.tint = opts.mode === 'markets' ? 'markets' : 'political';
    this.canvas = h('canvas', { class: 'wmap-canvas', tabindex: '0', role: 'img', 'aria-label': t(l('Mapa-múndi', 'World map')) });
    this.ctx = this.canvas.getContext('2d')!;
    this.tooltip = h('div', { class: 'wmap-tip', role: 'status', 'aria-live': 'polite' });
    this.tooltip.hidden = true;
    const zoomBtn = (label: string, aria: L, fn: () => void) => h('button', { class: 'wmap-btn', type: 'button', 'aria-label': t(aria), title: t(aria), onclick: fn }, label);
    const controls = h('div', { class: 'wmap-zoom' },
      zoomBtn('+', l('Aproximar', 'Zoom in'), () => this.zoomBy(1.6)),
      zoomBtn('−', l('Afastar', 'Zoom out'), () => this.zoomBy(1 / 1.6)),
      zoomBtn('⌂', l('Mapa inteiro', 'Whole map'), () => this.reset()),
    );
    this.stage = h('div', { class: 'wmap-stage' }, this.canvas, controls, this.tooltip);
    this.tintBar = h('div', { class: 'wmap-seg', role: 'group', 'aria-label': t(l('Camada', 'Layer')) });
    const cont = h('div', { class: 'wmap-seg wmap-cont', role: 'group', 'aria-label': t(l('Continentes', 'Continents')) },
      CONTINENTS.map((c) => h('button', { type: 'button', class: 'wmap-btn text', onclick: () => this.focusContinent(c.id) }, t(c.name))));
    this.legend = h('div', { class: 'wmap-legend' });
    this.a11y = h('div', { class: 'sr-only' });
    this.element = h('div', { class: 'wmap' }, h('div', { class: 'wmap-toolbar' }, this.tintBar, cont), this.stage, this.legend, this.a11y);
    this.bind();
    this.renderChrome();
    this.geo = geoData();
    if (this.geo) this.buildPaths();
    else void loadGeo().then((g) => { if (this.destroyed) return; this.geo = g; this.buildPaths(); this.schedule(); });
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.stage);
    }
    requestAnimationFrame(() => this.resize());
  }

  /** Atualiza opções (parcialmente) e redesenha. */
  update(p: Partial<WorldMapOptions>): void {
    const modeChanged = p.mode && p.mode !== this.opts.mode;
    Object.assign(this.opts, p);
    if (modeChanged) this.tint = this.opts.mode === 'markets' ? 'markets' : 'political';
    this.renderChrome();
    this.schedule();
  }

  focusContinent(id: ContinentId): void {
    const c = CONTINENTS.find((x) => x.id === id);
    if (!c) return;
    const [lo0, la0, lo1, la1] = c.box;
    const k = this.clampK(Math.min(this.w / (lo1 - lo0), this.hgt / (la1 - la0)));
    const cx = (lo0 + lo1) / 2 + 180;
    const cy = 85 - (la0 + la1) / 2;
    this.animateTo(k, this.w / 2 - cx * k, this.hgt / 2 - cy * k);
  }

  reset(): void {
    const k = this.kMin();
    this.animateTo(k, (this.w - WORLD_W * k) / 2, (this.hgt - WORLD_H * k) / 2);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.anim);
    this.ro?.disconnect();
    this.element.remove();
  }

  // ------------------------------------------------------------ estrutura

  private buildPaths(): void {
    const geo = this.geo!;
    const P = (ring: Float64Array, path: Path2D) => {
      for (let i = 0; i < ring.length; i += 2) {
        const x = ring[i] + 180;
        const y = 85 - ring[i + 1];
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.closePath();
    };
    this.countryPaths = geo.countries.map((c) => {
      const p = new Path2D();
      for (const poly of c.polys) for (const ring of poly) P(ring, p);
      return p;
    });
    this.arcPaths = geo.arcs.map((a) => {
      const p = new Path2D();
      for (let i = 0; i < a.length; i += 2) {
        const x = a[i] + 180;
        const y = 85 - a[i + 1];
        // saltos no antimeridiano (e a costura da Antártida) não são desenhados
        if (i === 0 || Math.abs(a[i] - a[i - 2]) > 180) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      return p;
    });
    this.yc = null;
  }

  private yearCache(): YearCache | null {
    const geo = this.geo;
    if (!geo) return null;
    const year = this.opts.getYear();
    if (this.yc && this.yc.year === year) return this.yc;
    const unitOf = geo.countries.map((c) => {
      const p = partitionOf(c.a3, year);
      if (p) return { id: p.outside.id, name: p.outside.name, members: [c.a3], bloc: p.outside.bloc, kind: 'partition', sovereign: p.outside.id } as PoliticalUnit;
      return unitOfCountry(c.a3, year);
    });
    // coloração gulosa: unidades vizinhas recebem cores diferentes
    const adj = new Map<string, Set<string>>();
    for (const [a, b] of geo.sides) {
      if (a < 0 || b < 0) continue;
      const ua = unitOf[a].id;
      const ub = unitOf[b].id;
      if (ua === ub) continue;
      if (!adj.has(ua)) adj.set(ua, new Set());
      if (!adj.has(ub)) adj.set(ub, new Set());
      adj.get(ua)!.add(ub);
      adj.get(ub)!.add(ua);
    }
    const units = politicalUnitsAt(year);
    const colorOf = new Map<string, number>();
    const order = [...units].sort((a, b) => (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0) || a.id.localeCompare(b.id));
    for (const u of order) {
      const used = new Set<number>();
      for (const n of adj.get(u.id) ?? []) if (colorOf.has(n)) used.add(colorOf.get(n)!);
      // partições: as duas metades são vizinhas
      const p = u.kind === 'partition' ? partitionOf(u.members[0], year) : null;
      if (p) for (const id of [p.inside.id, p.outside.id]) if (colorOf.has(id)) used.add(colorOf.get(id)!);
      let c = 0;
      const pref = hashStr(u.id) % 6;
      for (let i = 0; i < 6; i++) if (!used.has((pref + i) % 6)) { c = (pref + i) % 6; break; }
      colorOf.set(u.id, c);
    }
    this.yc = { year, unitOf, colorOf, units };
    return this.yc;
  }

  private renderChrome(): void {
    clear(this.tintBar);
    for (const tn of TINTS) {
      this.tintBar.appendChild(h('button', {
        type: 'button', class: `wmap-btn text ${this.tint === tn.id ? 'on' : ''}`, 'aria-pressed': this.tint === tn.id ? 'true' : 'false',
        onclick: () => { this.tint = tn.id; this.renderChrome(); this.schedule(); },
      }, t(tn.name)));
    }
    // legenda
    clear(this.legend);
    const sw = (color: string, label: string, cls = '') => h('span', { class: 'wmap-key' }, h('i', { class: `sw ${cls}`, style: `background-color:${color}` }), label);
    const th = readTheme(this.element);
    const year = this.opts.getYear();
    if (this.tint === 'blocs') {
      if (year >= 1947 && year <= 1991) this.legend.append(sw(th.west, t(BLOC_NAMES.west)), sw(th.east, t(BLOC_NAMES.east)), sw(th.nonaligned, t(BLOC_NAMES.nonaligned)));
      else this.legend.append(h('span', { class: 'muted' }, t(l('Os blocos da Guerra Fria só existem entre 1947 e 1991.', 'Cold War blocs only exist between 1947 and 1991.'))));
    } else if (this.tint === 'markets') {
      for (const m of MARKETS) this.legend.append(sw(th.markets[m.id], t(m.name)));
    } else {
      this.legend.append(sw(th.pal[0], t(l('Colônia (hachurada)', 'Colony (hatched)')), 'hatch'), h('span', { class: 'wmap-key' }, h('i', { class: 'sw dash' }), t(l('Fronteira interna de união', 'Internal union border'))));
    }
    this.legend.append(
      sw(th.audience, t(l('Com público', 'Has audience')), 'dot'), sw(th.selected, t(l('Selecionada', 'Selected')), 'dot'), sw(th.locked, t(l('Sem acesso', 'No access')), 'dot'),
    );
    for (const e of this.opts.legendExtra?.() ?? []) this.legend.append(e);
    // lista acessível de cidades
    clear(this.a11y);
    const list = this.opts.cities();
    this.a11y.appendChild(h('p', null, t(l('Cidades do mapa (Enter ou Espaço alterna a seleção):', 'Map cities (Enter or Space toggles selection):'))));
    const ul = h('ul', null);
    for (const mc of list) {
      const c = cityById[mc.id];
      if (!c) continue;
      const sel = this.opts.selected.includes(mc.id);
      ul.appendChild(h('li', null, h('button', {
        type: 'button', 'aria-pressed': sel ? 'true' : 'false',
        onfocus: () => { this.focusCity = mc.id; this.ensureVisible(mc.id); this.schedule(); },
        onblur: () => { if (this.focusCity === mc.id) this.focusCity = null; this.schedule(); },
        onclick: () => this.opts.onCityClick(mc.id),
      }, `${mc.label ?? t(c.name)}${mc.badge ? ` (${mc.badge})` : ''}${sel ? ` — ${t(l('selecionada', 'selected'))}` : ''}`)));
    }
    this.a11y.appendChild(ul);
  }

  // ------------------------------------------------------------ viewport

  private kMin(): number {
    return Math.max(this.w / WORLD_W, this.hgt / WORLD_H);
  }
  private clampK(k: number): number {
    const m = this.kMin();
    return Math.max(m, Math.min(m * 14, k));
  }
  private clampView(): void {
    this.k = this.clampK(this.k);
    const mw = WORLD_W * this.k;
    const mh = WORLD_H * this.k;
    this.tx = mw <= this.w ? (this.w - mw) / 2 : Math.min(0, Math.max(this.w - mw, this.tx));
    this.ty = mh <= this.hgt ? (this.hgt - mh) / 2 : Math.min(0, Math.max(this.hgt - mh, this.ty));
  }

  private resize(): void {
    if (this.destroyed) return;
    const cw = Math.round(this.stage.clientWidth);
    if (!cw) return;
    const ch = Math.round(Math.max(240, Math.min(cw * (WORLD_H / WORLD_W), window.innerHeight * 0.72)));
    const dpr = window.devicePixelRatio || 1;
    if (cw === this.w && ch === this.hgt && dpr === this.dpr) return;
    const first = this.w === 0;
    // mantém o centro ao redimensionar
    const cx = first ? 0 : (this.w / 2 - this.tx) / this.k;
    const cy = first ? 0 : (this.hgt / 2 - this.ty) / this.k;
    const rel = first ? 1 : this.k / this.kMin();
    this.w = cw;
    this.hgt = ch;
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.height = `${ch}px`;
    if (first) {
      this.k = this.kMin();
      this.tx = (this.w - WORLD_W * this.k) / 2;
      this.ty = (this.hgt - WORLD_H * this.k) / 2;
    } else {
      this.k = this.kMin() * rel;
      this.tx = this.w / 2 - cx * this.k;
      this.ty = this.hgt / 2 - cy * this.k;
    }
    this.clampView();
    this.draw();
  }

  private zoomAt(factor: number, sx: number, sy: number): void {
    const k = this.clampK(this.k * factor);
    const wx = (sx - this.tx) / this.k;
    const wy = (sy - this.ty) / this.k;
    this.k = k;
    this.tx = sx - wx * k;
    this.ty = sy - wy * k;
    this.clampView();
    this.schedule();
  }

  private zoomBy(f: number): void {
    const k = this.clampK(this.k * f);
    const wx = (this.w / 2 - this.tx) / this.k;
    const wy = (this.hgt / 2 - this.ty) / this.k;
    this.animateTo(k, this.w / 2 - wx * k, this.hgt / 2 - wy * k);
  }

  private animateTo(k: number, tx: number, ty: number): void {
    cancelAnimationFrame(this.anim);
    const k0 = this.k, tx0 = this.tx, ty0 = this.ty;
    // destino já limitado
    this.k = k; this.tx = tx; this.ty = ty;
    this.clampView();
    const k1 = this.k, tx1 = this.tx, ty1 = this.ty;
    this.k = k0; this.tx = tx0; this.ty = ty0;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const dur = reduce ? 0 : 280;
    const step = (now: number) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = 1 - (1 - p) ** 3;
      // interpolação geométrica do zoom mantém o movimento natural
      this.k = k0 * (k1 / k0) ** e;
      this.tx = tx0 + (tx1 - tx0) * e;
      this.ty = ty0 + (ty1 - ty0) * e;
      this.draw();
      if (p < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  private ensureVisible(id: string): void {
    const c = cityById[id];
    if (!c) return;
    const [x, y] = this.project(c.lon, c.lat);
    if (x < 20 || y < 20 || x > this.w - 20 || y > this.hgt - 20) {
      this.tx += this.w / 2 - x;
      this.ty += this.hgt / 2 - y;
      this.clampView();
    }
  }

  private project(lon: number, lat: number): [number, number] {
    return [this.tx + (lon + 180) * this.k, this.ty + (85 - lat) * this.k];
  }
  private unproject(x: number, y: number): [number, number] {
    return [(x - this.tx) / this.k - 180, 85 - (y - this.ty) / this.k];
  }

  // ------------------------------------------------------------ eventos

  private bind(): void {
    const cv = this.canvas;
    const pos = (e: PointerEvent | WheelEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    cv.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      cv.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 1) {
        this.drag = { x: p.x, y: p.y, tx: this.tx, ty: this.ty, moved: false };
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: this.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: this.tx, ty: this.ty };
        if (this.drag) this.drag.moved = true;
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
      if (this.pinch && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const k = this.clampK(this.pinch.k * (d / this.pinch.d));
        const wx = (this.pinch.mx - this.pinch.tx) / this.pinch.k;
        const wy = (this.pinch.my - this.pinch.ty) / this.pinch.k;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        this.k = k;
        this.tx = mx - wx * k;
        this.ty = my - wy * k;
        this.clampView();
        this.schedule();
        return;
      }
      if (this.drag && this.pointers.has(e.pointerId)) {
        const dx = p.x - this.drag.x;
        const dy = p.y - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) > 5) this.drag.moved = true;
        if (this.drag.moved) {
          this.tx = this.drag.tx + dx;
          this.ty = this.drag.ty + dy;
          this.clampView();
          this.hideTip();
          this.schedule();
          cv.classList.add('dragging');
        }
        return;
      }
      if (e.pointerType === 'mouse') this.hover(p.x, p.y);
    });
    const end = (e: PointerEvent) => {
      const p = pos(e);
      const wasDrag = this.drag?.moved ?? false;
      const wasPinch = !!this.pinch;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0) {
        cv.classList.remove('dragging');
        if (e.type === 'pointerup' && this.drag && !wasDrag && !wasPinch) this.click(p.x, p.y, e.pointerType !== 'mouse');
        this.drag = null;
      } else if (this.pointers.size === 1) {
        const [only] = [...this.pointers.values()];
        this.drag = { x: only.x, y: only.y, tx: this.tx, ty: this.ty, moved: true };
      }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.drag) { this.hoverCity = null; this.hoverCountry = -1; this.hideTip(); this.schedule(); } });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = pos(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      this.zoomAt(Math.exp(-dy * 0.0018), p.x, p.y);
    }, { passive: false });
    cv.addEventListener('keydown', (e) => {
      const step = 60;
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': this.tx += step; break;
        case 'ArrowRight': this.tx -= step; break;
        case 'ArrowUp': this.ty += step; break;
        case 'ArrowDown': this.ty -= step; break;
        case '+': case '=': this.zoomBy(1.6); return e.preventDefault();
        case '-': case '_': this.zoomBy(1 / 1.6); return e.preventDefault();
        case 'Home': case '0': this.reset(); return e.preventDefault();
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        this.clampView();
        this.schedule();
      }
    });
  }

  private cityAt(x: number, y: number, touch: boolean): string | null {
    const r = touch ? 20 : 12;
    let best: string | null = null;
    let bd = r * r;
    for (const mc of this.opts.cities()) {
      const c = cityById[mc.id];
      if (!c) continue;
      const [cx, cy] = this.project(c.lon, c.lat);
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bd) {
        bd = d;
        best = mc.id;
      }
    }
    return best;
  }

  private click(x: number, y: number, touch: boolean): void {
    const id = this.cityAt(x, y, touch);
    if (id) {
      this.opts.onCityClick(id);
      return;
    }
    if (this.geo && this.opts.onCountryClick) {
      const [lon, lat] = this.unproject(x, y);
      const ci = countryIndexAt(this.geo, lon, lat);
      if (ci >= 0) this.opts.onCountryClick(this.geo.countries[ci].a3);
    }
    if (touch) this.hover(x, y);
  }

  private hover(x: number, y: number): void {
    const id = this.cityAt(x, y, false);
    const [lon, lat] = this.unproject(x, y);
    const ci = !id && this.geo ? countryIndexAt(this.geo, lon, lat) : -1;
    const changed = id !== this.hoverCity || ci !== this.hoverCountry;
    this.hoverCity = id;
    this.hoverCountry = ci;
    this.canvas.style.cursor = id ? 'pointer' : '';
    if (id) this.showTip(this.cityTip(id), x, y);
    else if (ci >= 0 && this.geo) this.showTip(this.countryTip(ci, lon, lat), x, y);
    else this.hideTip();
    if (changed) this.schedule();
  }

  private cityTip(id: string): HTMLElement {
    const c = cityById[id];
    const year = this.opts.getYear();
    const a3 = countryOfCity(id);
    const unit = unitOfCity(id, year);
    const cl = climateAt(id, this.opts.getMonth());
    const country = t(countryName(a3));
    const uname = unit ? t(unit.name) : '';
    return h('div', null,
      h('b', null, t(c.name)),
      h('div', { class: 'muted' }, country + (uname && uname !== country ? ` · ${uname}` : '')),
      unit?.bloc ? h('div', { class: 'muted' }, t(BLOC_NAMES[unit.bloc])) : null,
      h('div', { class: 'wmap-tip-row' }, glyphCanvas(cl.icon, 2), `${t(cl.name)} · ${Math.round(cl.tempC)} °C`),
      this.opts.cityTipExtra?.(id) ?? null,
    );
  }

  private countryTip(ci: number, lon: number, lat: number): HTMLElement {
    const geo = this.geo!;
    const c = geo.countries[ci];
    const year = this.opts.getYear();
    const unit = unitAtPoint(c.a3, lon, lat, year);
    const name = t(c.name);
    const uname = t(unit.name);
    return h('div', null,
      h('b', null, uname),
      uname !== name ? h('div', { class: 'muted' }, t(l('hoje: {n}', 'today: {n}'), { n: name })) : null,
      unit.bloc ? h('div', { class: 'muted' }, t(BLOC_NAMES[unit.bloc])) : null,
      this.tint === 'markets' ? h('div', { class: 'muted' }, t(MARKETS.find((m) => m.id === marketOfCountry(c.a3))?.name)) : null,
      this.opts.countryTipExtra?.(c.a3) ?? null,
    );
  }

  private showTip(content: HTMLElement, x: number, y: number): void {
    clear(this.tooltip);
    this.tooltip.appendChild(content);
    this.tooltip.hidden = false;
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const left = Math.min(this.w - tw - 4, Math.max(4, x + 14));
    const top = y + 16 + th > this.hgt ? Math.max(4, y - th - 10) : y + 16;
    this.tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  private hideTip(): void {
    this.tooltip.hidden = true;
  }

  // ------------------------------------------------------------ desenho

  private schedule(): void {
    if (this.raf || this.destroyed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw(): void {
    if (!this.w || this.destroyed) return;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const th = readTheme(this.element);
    this.colorCache.clear();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // oceano pontilhado (dither 4×4)
    ctx.fillStyle = th.ocean;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.ditherPattern(th);
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // graticule a cada 30°
    ctx.strokeStyle = th.ocean2;
    ctx.lineWidth = Math.max(1, Math.round(dpr));
    ctx.beginPath();
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = Math.round(this.project(lon, 0)[0] * dpr) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = Math.round(this.project(0, lat)[1] * dpr) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
    }
    ctx.stroke();

    const yc = this.yearCache();
    if (!this.geo || !yc) {
      ctx.fillStyle = th.ink;
      ctx.font = `${12 * dpr}px system-ui, sans-serif`;
      ctx.fillText(t(l('Carregando mapa…', 'Loading map…')), 12 * dpr, 24 * dpr);
      return;
    }
    const geo = this.geo;
    const year = yc.year;
    const k = this.k * dpr;
    const world = () => ctx.setTransform(k, 0, 0, k, this.tx * dpr, this.ty * dpr);
    world();

    // países
    const hatch = this.hatchPattern(th, k);
    const fillFor = (u: PoliticalUnit, a3: string): { color: string; hatch: boolean; dim?: boolean } => {
      if (a3 === 'ATA') return { color: th.land, hatch: false };
      if (this.tint === 'markets') return { color: th.markets[marketOfCountry(a3)], hatch: false };
      if (this.tint === 'blocs') {
        if (!u.bloc) return { color: th.land, hatch: !!u.colonialPower, dim: true };
        return { color: u.bloc === 'west' ? th.west : u.bloc === 'east' ? th.east : th.nonaligned, hatch: !!u.colonialPower };
      }
      if (u.colonialPower) {
        const pu = unitOfCountry(u.colonialPower, year);
        return { color: th.pal[yc.colorOf.get(pu.id) ?? 6], hatch: true };
      }
      return { color: th.pal[yc.colorOf.get(u.id) ?? 6], hatch: false };
    };
    for (const c of geo.countries) {
      const path = this.countryPaths[c.idx];
      const u = yc.unitOf[c.idx];
      const f = fillFor(u, c.a3);
      const fillIt = (style: string | CanvasPattern) => {
        ctx.fillStyle = style;
        ctx.fill(path, 'evenodd');
        if (c.wraps) {
          // parte além de 180° reaparece do lado oeste
          ctx.translate(-WORLD_W, 0);
          ctx.fill(path, 'evenodd');
          ctx.translate(WORLD_W, 0);
        }
      };
      fillIt(f.color);
      if (f.hatch && hatch) fillIt(hatch);
      const p = partitionOf(c.a3, year);
      if (p) {
        const inside: PoliticalUnit = { id: p.inside.id, name: p.inside.name, members: [c.a3], bloc: p.inside.bloc, kind: 'partition', sovereign: p.inside.id };
        ctx.save();
        ctx.clip(path, 'evenodd');
        const reg = regionPath(p.region);
        ctx.fillStyle = fillFor(inside, c.a3).color;
        ctx.fill(reg);
        for (const [x, y, r] of p.enclaves ?? []) {
          ctx.fillStyle = f.color;
          const s = Math.max(r, 2.2 / this.k);
          ctx.fillRect(x + 180 - s / 2, 85 - y - s / 2, s, s);
        }
        ctx.strokeStyle = this.tint === 'blocs' ? th.east : th.border;
        ctx.lineWidth = (this.tint === 'blocs' ? 2.2 : 1.2) * dpr / k;
        ctx.stroke(reg);
        ctx.restore();
      }
      const shade = this.opts.countryShade?.(c.a3);
      if (shade) { ctx.globalAlpha = 0.32; fillIt(this.resolveColor(shade.color) ?? shade.color); ctx.globalAlpha = 1; if (shade.hatch && hatch) fillIt(hatch); }
      if (c.idx === this.hoverCountry) fillIt('rgba(255,255,255,0.18)');
    }

    // fronteiras: costa, fronteiras do ano e divisas internas de uniões (tracejadas)
    const px = dpr / k;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const coast: Path2D[] = [];
    const border: Path2D[] = [];
    const inner: Path2D[] = [];
    const iron: Path2D[] = [];
    geo.sides.forEach(([a, b], i) => {
      if (b < 0) return coast.push(this.arcPaths[i]);
      const ua = yc.unitOf[a];
      const ub = yc.unitOf[b];
      if (ua.id === ub.id) inner.push(this.arcPaths[i]);
      else {
        border.push(this.arcPaths[i]);
        if (this.tint === 'blocs' && ua.bloc && ub.bloc && ua.bloc !== ub.bloc && (ua.bloc === 'east' || ub.bloc === 'east') && (ua.bloc === 'west' || ub.bloc === 'west')) iron.push(this.arcPaths[i]);
      }
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = th.coast;
    ctx.lineWidth = 1.6 * px;
    for (const p of coast) ctx.stroke(p);
    ctx.strokeStyle = th.border;
    ctx.lineWidth = 1 * px;
    for (const p of border) ctx.stroke(p);
    if (iron.length) {
      ctx.strokeStyle = th.east;
      ctx.lineWidth = 2.6 * px;
      for (const p of iron) ctx.stroke(p);
    }
    ctx.setLineDash([2.5 * px, 2.5 * px]);
    ctx.strokeStyle = th.inner;
    ctx.lineWidth = 0.8 * px;
    for (const p of inner) ctx.stroke(p);
    ctx.setLineDash([]);

    // rótulos das unidades grandes
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawUnitLabels(th, yc);

    // rota, cidades, clima
    this.drawRoute(th);
    this.drawOverlays(th);
    this.drawCities(th);

    // selo do ano
    const tag = t(l('Fronteiras de {y}', 'Borders of {y}'), { y: year });
    ctx.font = `600 ${11 * dpr}px system-ui, sans-serif`;
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = th.halo;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(8 * dpr, 8 * dpr, tw + 12 * dpr, 18 * dpr);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = th.coast;
    ctx.lineWidth = dpr;
    ctx.strokeRect(8 * dpr + 0.5, 8 * dpr + 0.5, tw + 12 * dpr, 18 * dpr);
    ctx.fillStyle = th.ink;
    ctx.fillText(tag, 14 * dpr, 21 * dpr);
  }

  private ditherCache: { key: string; pat: CanvasPattern } | null = null;
  private ditherPattern(th: Theme): CanvasPattern | string {
    const s = Math.max(1, Math.round(this.dpr * 2));
    const key = `${th.ocean2}|${s}`;
    if (this.ditherCache?.key === key) return this.ditherCache.pat;
    const c = document.createElement('canvas');
    c.width = c.height = 4 * s;
    const x = c.getContext('2d');
    if (!x) return th.ocean;
    x.fillStyle = th.ocean2;
    // pontos de uma matriz de Bayer 4×4 (limiar baixo)
    for (const [i, j] of [[0, 0], [2, 2]]) x.fillRect(i * s, j * s, s, s);
    const pat = this.ctx.createPattern(c, 'repeat');
    if (!pat) return th.ocean;
    this.ditherCache = { key, pat };
    return pat;
  }

  private hatchCanvas: HTMLCanvasElement | null = null;
  private hatchPattern(th: Theme, k: number): CanvasPattern | null {
    if (!this.hatchCanvas) {
      const c = document.createElement('canvas');
      c.width = c.height = 6;
      const x = c.getContext('2d');
      if (!x) return null;
      x.fillStyle = 'rgba(0,0,0,0.22)';
      for (let i = 0; i < 6; i++) x.fillRect(i, 5 - i, 1, 1);
      this.hatchCanvas = c;
    }
    void th;
    const pat = this.ctx.createPattern(this.hatchCanvas, 'repeat');
    if (!pat) return null;
    const s = Math.max(1, Math.round(this.dpr)) / k;
    pat.setTransform?.(new DOMMatrix([s, 0, 0, s, 0, 0]));
    return pat;
  }

  private drawUnitLabels(th: Theme, yc: YearCache): void {
    const geo = this.geo!;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const placed: [number, number, number, number][] = [];
    // centro por unidade: média ponderada por área dos centros dos membros
    const acc = new Map<string, { x: number; y: number; a: number; u: PoliticalUnit }>();
    for (const c of geo.countries) {
      if (c.a3 === 'ATA') continue;
      const u = yc.unitOf[c.idx];
      const p = partitionOf(c.a3, yc.year);
      const list: [PoliticalUnit, number, number, number][] = [[u, c.center[0], c.center[1], c.area]];
      if (p) {
        list.length = 0;
        list.push([{ ...u, id: p.outside.id, name: p.outside.name }, c.center[0] - 1.2, c.center[1] - 0.6, c.area / 2]);
        list.push([{ ...u, id: p.inside.id, name: p.inside.name }, c.center[0] + 1.5, c.center[1] + 0.8, c.area / 2]);
      }
      for (const [uu, x, y, a] of list) {
        const e = acc.get(uu.id) ?? { x: 0, y: 0, a: 0, u: uu };
        e.x += x * a; e.y += y * a; e.a += a;
        acc.set(uu.id, e);
      }
    }
    const items = [...acc.values()].sort((a, b) => b.a - a.a);
    const fontPx = 10;
    ctx.font = `600 ${fontPx * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const it of items) {
      const screenArea = it.a * this.k * this.k;
      if (screenArea < 2600) break;
      const [sx, sy] = this.project(it.x / it.a, it.y / it.a);
      if (sx < 0 || sy < 0 || sx > this.w || sy > this.hgt) continue;
      let name = t(it.u.name);
      if (name.length > 22 && screenArea < 20000) name = name.replace(/\s*\(.*\)$/, '');
      const tw = ctx.measureText(name).width / dpr;
      const box: [number, number, number, number] = [sx - tw / 2 - 3, sy - 7, sx + tw / 2 + 3, sy + 7];
      if (placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      placed.push(box);
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = th.halo;
      ctx.globalAlpha = 0.75;
      ctx.strokeText(name.toUpperCase(), sx * dpr, sy * dpr);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = th.label;
      ctx.fillText(name.toUpperCase(), sx * dpr, sy * dpr);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private colorCache = new Map<string, string>();
  /** aceita cores CSS comuns e `var(--token)` */
  private resolveColor(c: string | undefined): string | undefined {
    if (!c || !c.startsWith('var(')) return c;
    const hit = this.colorCache.get(c);
    if (hit) return hit;
    const name = c.slice(4, -1).trim();
    const v = getComputedStyle(this.element).getPropertyValue(name).trim() || undefined;
    if (v) this.colorCache.set(c, v);
    return v;
  }

  private routePlan(): RoutePlan | null {
    const r = this.opts.route ?? [];
    if (r.length < 2) return null;
    const key = `${r.join(',')}|${this.opts.getYear()}|${this.opts.getMonth()}|${this.opts.crewSize ?? 4}`;
    if (key !== this.planKey) {
      this.planKey = key;
      this.plan = planRoute(r.slice(1), r[0], this.opts.getYear(), this.opts.getMonth(), this.opts.crewSize ?? 4);
    }
    return this.plan;
  }

  private drawRoute(th: Theme): void {
    const plan = this.routePlan();
    if (!plan) return;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const gpx = Math.max(2, Math.round(dpr * 1.5));
    for (const leg of plan.legs) {
      const a = cityById[leg.from];
      const b = cityById[leg.to];
      if (!a || !b) continue;
      const [x0, y0] = this.project(a.lon, a.lat);
      const [x1, y1] = this.project(b.lon, b.lat);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(60, len * 0.18);
      const cx = (x0 + x1) / 2 + (dy / len) * bend * (dx >= 0 ? -1 : 1);
      const cy = (y0 + y1) / 2 - (Math.abs(dx) / len) * bend;
      ctx.lineWidth = 4 * dpr;
      ctx.strokeStyle = th.halo;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x0 * dpr, y0 * dpr);
      ctx.quadraticCurveTo(cx * dpr, cy * dpr, x1 * dpr, y1 * dpr);
      ctx.stroke();
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = leg.visa.denyChance > 0.5 ? th.east : th.route;
      ctx.setLineDash(leg.mode === 'ship' ? [6 * dpr, 4 * dpr] : leg.mode === 'train' || leg.mode === 'bus' ? [2 * dpr, 3 * dpr] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      // glifo no meio da curva (t = 0,5)
      const mx = 0.25 * x0 + 0.5 * cx + 0.25 * x1;
      const my = 0.25 * y0 + 0.5 * cy + 0.25 * y1;
      if (len > 26) drawGlyph(ctx, GLYPHS[leg.mode], mx * dpr, my * dpr, gpx, false, true);
      if (leg.visa.needed && len > 26) drawGlyph(ctx, GLYPHS[leg.visa.denyChance > 0.5 || leg.visa.boycott ? 'visa_bad' : 'visa'], (mx + 18) * dpr, (my - 13) * dpr, Math.max(1, Math.round(dpr * 1.5)));
    }
    // clima de cada parada
    for (const st of plan.stops) {
      const c = cityById[st.cityId];
      if (!c) continue;
      const [x, y] = this.project(c.lon, c.lat);
      drawGlyph(ctx, GLYPHS[st.climate.icon], (x + 11) * dpr, (y - 12) * dpr, Math.max(1, Math.round(dpr * 1.5)));
    }
  }

  private drawOverlays(th: Theme): void {
    const list = this.opts.overlays?.() ?? [];
    if (!list.length) return;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const zoom = Math.max(1, this.k / this.kMin());
    // bolhas primeiro (maiores atrás), depois arcos, depois ícones
    const bubbles = list.filter((o): o is Extract<MapOverlay, { kind: 'bubble' }> => o.kind === 'bubble').sort((a, b) => b.value - a.value);
    for (const b of bubbles) {
      const c = cityById[b.city];
      if (!c) continue;
      const [x, y] = this.project(c.lon, c.lat);
      const r = (5 + 26 * Math.sqrt(Math.max(0, Math.min(1, b.value)))) * Math.min(2.2, Math.sqrt(zoom)) * dpr;
      const col = this.resolveColor(b.color) ?? b.color;
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x * dpr, y * dpr, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const a of list) {
      if (a.kind !== 'arc') continue;
      const ca = cityById[a.from];
      const cb = cityById[a.to];
      if (!ca || !cb) continue;
      const [x0, y0] = this.project(ca.lon, ca.lat);
      const [x1, y1] = this.project(cb.lon, cb.lat);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(50, len * 0.22);
      const cx = (x0 + x1) / 2 + (dy / len) * bend;
      const cy = (y0 + y1) / 2 - (Math.abs(dx) / len) * bend;
      ctx.beginPath();
      ctx.moveTo(x0 * dpr, y0 * dpr);
      ctx.quadraticCurveTo(cx * dpr, cy * dpr, x1 * dpr, y1 * dpr);
      ctx.lineWidth = ((a.width ?? 1.6) + 2) * dpr;
      ctx.strokeStyle = th.halo;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.lineWidth = (a.width ?? 1.6) * dpr;
      ctx.strokeStyle = this.resolveColor(a.color) ?? a.color;
      ctx.setLineDash(a.dashed ? [4 * dpr, 3 * dpr] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const gpx = Math.max(1, Math.round(dpr * 1.5));
    for (const o of list) {
      if (o.kind !== 'icon') continue;
      const c = cityById[o.city];
      if (!c) continue;
      const [x, y] = this.project(c.lon, c.lat);
      const slot = o.slot ?? 0;
      const ox = -12 - (slot % 3) * 13;
      const oy = -10 + Math.floor(slot / 3) * 12;
      drawGlyph(ctx, GLYPHS[o.icon], (x + ox) * dpr, (y + oy) * dpr, gpx);
    }
  }

  private drawCities(th: Theme): void {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const list = this.opts.cities();
    const sel = new Set(this.opts.selected);
    const route = this.opts.route ?? [];
    const zoomedIn = this.k >= this.kMin() * 2.6;
    const labels: { x: number; y: number; text: string; strong: boolean }[] = [];
    const sorted = [...list].sort((a, b) => Number(sel.has(a.id)) - Number(sel.has(b.id)));
    for (const mc of sorted) {
      const c = cityById[mc.id];
      if (!c) continue;
      const [x, y] = this.project(c.lon, c.lat);
      if (x < -20 || y < -20 || x > this.w + 20 || y > this.hgt + 20) continue;
      const isSel = sel.has(mc.id);
      const color = isSel ? th.selected : mc.locked ? th.locked : this.resolveColor(mc.color) ?? th.audience;
      const s = Math.round((isSel ? 8 : 6) * (mc.size ?? 1) * dpr);
      const px = Math.round(x * dpr);
      const py = Math.round(y * dpr);
      // marcador em "diamante" pixelado com contorno
      const o = Math.max(1, Math.round(dpr));
      ctx.fillStyle = INK;
      diamond(ctx, px, py, s / 2 + o * 1.5);
      ctx.fillStyle = color;
      diamond(ctx, px, py, s / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(px - o, py - Math.round(s / 3), o, o);
      if (route[0] === mc.id) {
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = o;
        ctx.strokeRect(px - s - o, py - s - o, (s + o) * 2, (s + o) * 2);
      }
      if (this.focusCity === mc.id || this.hoverCity === mc.id) {
        ctx.strokeStyle = th.route;
        ctx.lineWidth = 2 * o;
        ctx.strokeRect(px - s - 3 * o, py - s - 3 * o, (s + 3 * o) * 2, (s + 3 * o) * 2);
      }
      if (mc.badge) {
        ctx.font = `700 ${9 * dpr}px system-ui, sans-serif`;
        const bw = ctx.measureText(mc.badge).width + 6 * dpr;
        const bx = px + s / 2 + 2 * o;
        const by = py + s / 2;
        ctx.fillStyle = INK;
        ctx.fillRect(bx, by - 6 * dpr, bw, 12 * dpr);
        ctx.fillStyle = '#fff';
        ctx.fillText(mc.badge, bx + 3 * dpr, by + 3 * dpr);
      }
      if (isSel || zoomedIn || route.includes(mc.id) || this.focusCity === mc.id || this.hoverCity === mc.id) {
        labels.push({ x: px, y: py + s + 10 * dpr, text: mc.label ?? t(c.name), strong: isSel || route.includes(mc.id) });
      }
      if (isSel && !route.includes(mc.id)) {
        const cl = climateAt(mc.id, this.opts.getMonth());
        drawGlyph(ctx, GLYPHS[cl.icon], px + 11 * dpr, py - 12 * dpr, Math.max(1, Math.round(dpr * 1.5)));
      }
    }
    // rótulos com halo, evitando sobreposição
    const placed: [number, number, number, number][] = [];
    labels.sort((a, b) => Number(b.strong) - Number(a.strong));
    ctx.textAlign = 'center';
    for (const lb of labels) {
      ctx.font = `${lb.strong ? 700 : 500} ${11 * dpr}px system-ui, sans-serif`;
      const w = ctx.measureText(lb.text).width;
      const box: [number, number, number, number] = [lb.x - w / 2 - 2, lb.y - 10 * dpr, lb.x + w / 2 + 2, lb.y + 3 * dpr];
      if (placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      placed.push(box);
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = th.halo;
      ctx.strokeText(lb.text, lb.x, lb.y);
      ctx.fillStyle = th.ink;
      ctx.fillText(lb.text, lb.x, lb.y);
    }
    ctx.textAlign = 'left';
  }
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  // diamante em degraus (pixel art): linhas horizontais
  const rr = Math.max(1, Math.round(r));
  for (let i = -rr; i <= rr; i++) {
    const half = rr - Math.abs(i);
    ctx.fillRect(cx - half, cy + i, half * 2 + 1, 1);
  }
}

function regionPath(flat: number[]): Path2D {
  const p = new Path2D();
  for (let i = 0; i < flat.length; i += 2) {
    const x = flat[i] + 180;
    const y = 85 - flat[i + 1];
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

function hashStr(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return x >>> 0;
}
