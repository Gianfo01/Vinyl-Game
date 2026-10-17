// R31 · onda 4 (H) — modelo da camada "cidade de cada época" do mapa (PURO: só lê o estado; sem DOM, sem sorteio).
// Junta o que sim/r31/city31 calcula (lugares reais nos terrenos reservados, lojas da época, festival do mês,
// outdoors das paradas, neon) com o que a cena do mapa já tem (lotes de cidade comum, lugares do bairro).
import { RART31 } from '../pixel/pred31';
import { l, type L } from '../../data/world';
import { LANDMARKS19 } from '../../data/landmarks19';
import {
  BIZ31, RDRAW31, billboards31, bizAt31, boardStyle31, fest31, festLot31, minGw31, neon31, placeName31, realLots31, realPlace27, type Board31Style, type Billboard31,
} from '../../sim/r31/city31';
import { LOTS18, type BKind } from '../../sim/sys/campus18';
import type { Place27 } from '../../sim/sys/place27';
import type { GameState } from '../../sim/types';
import type { Extra31 } from '../pixel/campus18px';
import { boards33, outOn, style33 } from '../../sim/r33/outdoor33'; // R33 (POL33-A): outdoors espalhados, aluguel e compra (exp33.pol.outdoors)

export const FEST_ID31 = 'fx31';

export interface CityX31 {
  extra: Extra31[];
  /** lugares reais como lugares do bairro (painel, ações e interior de place27) */
  places: Place27[];
  /** lotes de cidade comum que sobram (o festival tomou um) */
  filler: number[];
  minGw: number;
  /** ambiente (público) do festival */
  amb: { k: string; at: string }[];
  /** marcos que viraram prédio no mapa (saem do horizonte) */
  lmOut: Set<string>;
  festName?: string;
}
/** O que a cena precisa acrescentar (PURO). `filler` = lotes de cidade comum já calculados pela página. */
export function cityX31(s: GameState, filler: number[], year = s.year): CityX31 {
  const real = realLots31(s, year);
  const extra: Extra31[] = real.map((x) => ({ id: x.p.id, lot: x.lot, kind: RDRAW31[x.p.kind], art: RART31[x.p.kind], lvl: x.p.kind === 'arena' ? 4 : x.p.kind === 'tv' || x.p.u ? 3 : x.p.kind === 'theatre' ? 3 : 2, sign: true }));
  const places = real.map((x) => realPlace27(s, x));
  const lmOut = new Set(real.map((x) => x.p.lm).filter((x): x is string => !!x && LANDMARKS19.some((m) => m.id === x)));
  const f = year === s.year ? fest31(s) : null;
  let fill = filler, festName: string | undefined;
  const amb: { k: string; at: string }[] = [];
  if (f) {
    festName = f.name;
    if (f.at) { const e = extra.find((x) => x.id === f.at); if (e) { e.kind = 'fest'; e.art = 'fest'; e.lvl = 4; amb.push({ k: 'crowd', at: `fl:${e.id}` }); } }
    else {
      const lot = festLot31(filler);
      if (lot !== undefined) { fill = filler.filter((x) => x !== lot); extra.push({ id: FEST_ID31, lot: LOTS18[lot], kind: 'fest', lvl: 3 }); amb.push({ k: 'crowd', at: `fl:${FEST_ID31}` }); }
    }
  }
  return { extra, places, filler: fill, minGw: minGw31(s, year), amb, lmOut, festName };
}

export interface CityOv31 {
  labels: boolean;
  /** R31 (POL): zoom atual do mapa (densidade dos rótulos) */
  zoom?: number;
  /** R31 (POL): caixas dos ícones que a página põe por cima (as etiquetas desviam) */
  avoid?: [number, number, number, number][];
  neon: { k: 'none' | 'neon' | 'led'; f: number };
  neons: { sprite: string; k: number }[];
  boardStyle: Board31Style;
  boards: (Billboard31 & { sprite: string; rank: number; /** POL2: marca curta no painel (N1, NOVO, TURNÊ, HOT) */ tagTxt: string; cover?: HTMLCanvasElement;
    /** R33 (POL33-A): ponto do outdoor (aluguel/compra), ponto livre, cor da marca, ponto seu */ site?: string; vacant?: boolean; col?: string; own?: boolean })[];
  fest?: { sprite: string; name: string; acts: string[] };
  tags: { sprite: string; text: string; real?: boolean; /** POL2: rádio/TV real — letreiro sempre visível, em qualquer zoom */ media?: boolean; mark?: 'open' | 'closed'; markTxt: string }[];
}
const NEON_K: Partial<Record<BKind, true>> = { venue: true, store: true, media: true, fest: true };
const tx = (x: L, pt: boolean) => (pt ? x.pt : x.en);
/** A camada sobre o mapa (PURO, sem as capas — a página põe a capa). `sprites` = ids e tipos desenhados. */
export function cityOv31(s: GameState, x: CityX31, places: Place27[], sprites: { id: string; kind: BKind; top: number }[], pt: boolean, labels = true): CityOv31 {
  const year = s.year, nn = neon31(year);
  const fillPl = new Map(places.filter((p) => p.src === 'fill').map((p) => [p.id.slice(3), p]));
  const tags: CityOv31['tags'] = [];
  const neons: CityOv31['neons'] = [];
  for (const sp of sprites) {
    if (!sp.id.startsWith('fl:')) continue;
    const key = sp.id.slice(3);
    const rl = x.extra.find((e) => e.id === key && key !== FEST_ID31);
    const plc = fillPl.get(key);
    if (NEON_K[sp.kind] && (rl || plc)) neons.push({ sprite: sp.id, k: key.length + (rl ? 3 : 0) });
    if (rl) { const p = x.places.find((q) => q.id === `pl:${key}`); if (p) tags.push({ sprite: sp.id, text: tx(p.name, pt), real: true, ...(sp.kind === 'media' ? { media: true } : {}), markTxt: '' }); continue; }
    const lot = Number(key);
    if (!plc || !Number.isFinite(lot) || plc.name.pt !== plc.what.pt) continue; // só os prédios que são loja da época
    const now = bizAt31(s.config.seed, s.config.homeCity, lot, year), was = bizAt31(s.config.seed, s.config.homeCity, lot, year - 1);
    const t: CityOv31['tags'][number] = { sprite: sp.id, text: tx(now.name, pt), markTxt: '' };
    if (was.id !== now.id) { t.mark = 'open'; t.markTxt = pt ? 'ABRIU' : 'OPENED'; }
    else if (bizAt31(s.config.seed, s.config.homeCity, lot, year + 1).id !== now.id) { t.mark = 'closed'; t.markTxt = pt ? 'VAI FECHAR' : 'CLOSING'; }
    tags.push(t);
  }
  // outdoors: nos prédios mais altos de cidade comum (nunca nos seus)
  const tall = sprites.filter((sp) => sp.id.startsWith('fl:') && sp.kind !== 'fest' && sp.kind !== 'park').sort((a, b) => a.top - b.top || (a.id < b.id ? -1 : 1));
  const bb = billboards31(s);
  const TAG: Record<string, [string, string]> = { chart: ['N1', 'N1'], hot: ['HOT', 'HOT'], release: ['NOVO', 'NEW'], paid: ['NOVO', 'NEW'], tour: ['TOUR', 'TOUR'] };
  let boards: CityOv31['boards'] = bb.slice(0, Math.min(bb.length, tall.length)).map((b, i) => ({ ...b, sprite: tall[i].id, rank: 1, tagTxt: TAG[b.kind ?? 'chart'][pt ? 0 : 1] }));
  if (outOn(s)) boards = boards33(s, new Set(sprites.map((q) => q.id))).map((b, i) => ({ relId: b.relId, title: b.title, act: b.act, label: b.label, mine: b.mine, kind: b.kind === 'brand' ? undefined : b.kind, actId: b.actId, sprite: b.sprite, rank: i, tagTxt: b.tag[pt ? 0 : 1], site: b.site, vacant: b.vacant, col: b.col, own: b.own })); // R33 (POL33-A)
  const fs = x.extra.find((e) => e.kind === 'fest');
  return { labels, neon: nn, neons: nn.f > 0 ? neons : [], boardStyle: outOn(s) ? style33(year) : boardStyle31(year), boards, tags,
    fest: fs && x.festName ? { sprite: `fl:${fs.id}`, name: x.festName, acts: fest31(s)?.acts ?? [] } : undefined };
}
/** Texto curto para leitores de tela e para o painel do festival. */
export const festLine31 = (name: string): L => l(`Festival neste mês: ${name}`, `Festival this month: ${name}`);
export { BIZ31, placeName31 };
