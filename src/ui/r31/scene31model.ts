// R31 · onda 2 (J) — CENAS INTERATIVAS: núcleo comum, sem DOM.
// Cada cena (Mesa do chefe, Turnê, Projeto musical) monta um modelo PURO a partir do estado: as áreas clicáveis
// (objetos da cena), o que cada uma mostra (número + símbolo + texto, nunca só cor) e para onde leva. A pintura e os
// botões leem só este modelo — a lista acessível de pontos sai do mesmo registro que desenha a cena.
// Explorar não muda o mundo: montar o modelo só lê (os testes conferem estado e sorteio antes/depois).

import { l, type L } from '../../data/world';
import { fmtL } from '../../sim/util';
import type { QuickTarget31 } from './lock31';

/** Quatro níveis de alerta que não brigam entre si; só o crítico pulsa. */
export type Alert31 = 'crit' | 'soon' | 'normal' | 'info';
export const ALERT31: Record<Alert31, { sym: string; name: L; rank: number }> = {
  crit: { sym: '‼', name: l('bloqueio crítico', 'critical block'), rank: 3 },
  soon: { sym: '⏱', name: l('prazo próximo', 'deadline soon'), rank: 2 },
  normal: { sym: '●', name: l('decisão', 'decision'), rank: 1 },
  info: { sym: 'i', name: l('informação', 'information'), rank: 0 },
};
export const maxAlert31 = (xs: Alert31[]): Alert31 | undefined => xs.reduce<Alert31 | undefined>((a, x) => (!a || ALERT31[x].rank > ALERT31[a].rank ? x : a), undefined);
/** Nível de uma pendência: vence nesta semana ou urgente = crítico; até 2 semanas = prazo próximo. */
export function alertOf31(due: number | undefined, week: number, prio = 0): Alert31 {
  if (prio >= 3 || (due !== undefined && due - week <= 0)) return 'crit';
  if (due !== undefined && due - week <= 2) return 'soon';
  return 'normal';
}

/** Para onde um ponto leva. `panel` = painel curto DENTRO da cena (a ação se resolve ali). */
export interface Go31s {
  area?: string;
  tab?: [string, string];
  act?: string;
  hub?: { actId: string; pid: string };
  panel?: string;
  quick?: QuickTarget31;
  /** foco da ação no painel rápido */
  focus?: string;
}
export interface Badge31 { text: string | L; level: Alert31; /** símbolo próprio (senão o do nível; informação não leva símbolo) */ sym?: string }
/** Uma área clicável da cena (coordenadas em pixels lógicos do desenho). */
export interface Spot31 {
  id: string;
  x: number; y: number; w: number; h: number;
  /** rótulo curto (aparece sobre o objeto quando "rótulos" está ligado) */
  label: L;
  /** dica curta: o estado e o que o clique faz */
  tip: L;
  badge?: Badge31;
  go: Go31s;
  /** alvo do painel rápido (clique direito / tecla de menu) */
  quick?: QuickTarget31;
  /** sem rótulo por cima (o nome já está desenhado ou o ponto é miúdo) */
  quiet?: boolean;
}

/** Rótulos curtos: sempre no primeiro ano da partida, opcionais depois. */
export const LABELS_WEEKS31 = 52;
export const labelsDefault31 = (s: { week: number }): boolean => s.week < LABELS_WEEKS31;

export const MON31: L[] = [
  l('JAN', 'JAN'), l('FEV', 'FEB'), l('MAR', 'MAR'), l('ABR', 'APR'), l('MAI', 'MAY'), l('JUN', 'JUN'),
  l('JUL', 'JUL'), l('AGO', 'AUG'), l('SET', 'SEP'), l('OUT', 'OCT'), l('NOV', 'NOV'), l('DEZ', 'DEC'),
];

/** Símbolo mostrado no selo. */
export const badgeSym31 = (b: Badge31): string => b.sym ?? (b.level === 'info' ? '' : ALERT31[b.level].sym);

export const plural31 = (n: number, one: L, many: L): L => fmtL(n === 1 ? one : many, { n });

/** Toda área tem destino (área, aba, painel na cena, painel rápido ou projeto) e cabe no desenho. */
export function spotOk31(sp: Spot31, W: number, H: number): boolean {
  const g = sp.go;
  const dest = !!(g.area || g.tab || g.panel || g.quick || g.hub || g.act);
  return dest && sp.w > 0 && sp.h > 0 && sp.x >= -4 && sp.y >= -4 && sp.x + sp.w <= W + 4 && sp.y + sp.h <= H + 4 && !!sp.label.pt && !!sp.tip.pt;
}

// ---------------------------------------------------------------- R31 (POL) — densidade dos rótulos
/** Um rótulo já posicionado (pixels lógicos da cena). `text` pode vir abreviado; `full` é o nome inteiro. */
export interface Label31 { id: string; x: number; y: number; w: number; h: number; text: string; full: string }
/** Medida da fonte dos rótulos (0,64rem mono ≈ 6,2 px por letra e 12,5 px de linha, já com folga) na escala da tela. */
export const LABEL_CH31 = 6.2, LABEL_LH31 = 12.5;
const SMALLW31 = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'of', 'the', 'and', 'y', 'la', 'el', 'di']);
/** Versões cada vez mais curtas do nome, sem cortar palavra no meio (abreviação sempre com ponto). */
export function shortNames31(s: string): string[] {
  const out = [s];
  let ws = s.split(/\s+/).filter(Boolean);
  const add = (t: string) => { if (t && !out.includes(t)) out.push(t); };
  if (ws.length > 1) { ws = ws.filter((w, i) => i === 0 || !SMALLW31.has(w.toLowerCase())); add(ws.join(' ')); }
  for (let n = ws.length - 1; n >= 1; n--) { // abrevia do fim para o começo; depois tira as palavras do fim
    const a = ws.map((w, i) => (i >= n && w.length > 4 ? `${w.slice(0, 3)}.` : w)); add(a.join(' '));
  }
  while (ws.length > 1) { ws = ws.slice(0, -1); add(ws.join(' ')); }
  if (ws[0] && ws[0].length > 6) add(`${ws[0].slice(0, 5)}.`);
  return out;
}
/**
 * Posiciona os rótulos sem um cobrir o outro nem tapar outro objeto clicável: tenta embaixo do objeto, dentro da base,
 * em cima e dentro do topo; se não couber, usa um nome mais curto; se nada couber, o rótulo some (o nome continua no
 * passar do mouse, no foco e na lista de pontos). Ordem de prioridade: com selo, depois objetos grandes, depois pessoas.
 * `scale` = pixels de tela por pixel lógico.
 */
export function placeLabels31(spots: Spot31[], W: number, H: number, scale: number, text: (sp: Spot31) => string): Label31[] {
  const ch = LABEL_CH31 / scale, lh = LABEL_LH31 / scale;
  const hit = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
  const area = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const vis = spots.filter((sp) => !sp.quiet);
  const order = [...vis].sort((a, b) => Number(!!b.badge) - Number(!!a.badge) || b.w * b.h - a.w * a.h);
  const placed: Label31[] = [];
  const badges = vis.filter((sp) => sp.badge).map((sp) => ({ x: sp.x + sp.w / 2 - 3 * ch, y: sp.y - 3 - lh, w: 6 * ch, h: lh })); // selos ficam acima do objeto
  for (const sp of order) {
    const full = text(sp);
    let done = false;
    for (const t of shortNames31(full)) {
      const w = t.length * ch + 4 / scale, h = lh;
      if (w > Math.max(sp.w + 30, W * 0.45)) continue;
      const cx = sp.x + sp.w / 2;
      const ys = [sp.y + sp.h + 1, sp.y + sp.h - h - 1, sp.y - h - 1, sp.y + 1];
      for (const y of ys) {
        const x = Math.min(W - w, Math.max(0, cx - w / 2));
        if (y < 0 || y + h > H) continue;
        const r = { x, y, w, h };
        if (placed.some((o) => hit(o, r, 0.5)) || badges.some((o) => hit(o, r))) continue;
        // não tapa outro objeto clicável (até 25% do rótulo pode encostar)
        if (vis.some((o) => o !== sp && area(o, r) > w * h * 0.25 && !(o.x <= sp.x && o.y <= sp.y && o.x + o.w >= sp.x + sp.w && o.y + o.h >= sp.y + sp.h))) continue;
        placed.push({ id: sp.id, x, y, w, h, text: t, full });
        done = true; break;
      }
      if (done) break;
    }
  }
  return placed;
}
