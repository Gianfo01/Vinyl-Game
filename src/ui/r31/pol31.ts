// R31 · onda 4 (POL) — ACABAMENTO DAS CENAS: registro das cenas pintadas (PURO) e as checagens automáticas do básico.
// Cada pintor de cena registra exemplos (fixtures) com o que a tela de fato desenha: o fundo, a camada da frente
// (o que fica na frente das pessoas: balcão, mesa), onde ficam os pés de cada pessoa, os pontos clicáveis e o texto
// pintado. tests/r31-pol.test.ts passa todas as regras em todas as cenas registradas:
//   · pé no chão ou numa superfície (ou escondido atrás de algo da camada da frente — nunca flutuando);
//   · rótulos sem colisão (placeLabels31, na escala comum de tela);
//   · nenhum ponto clicável é um retângulo de uma cor só (placeholder);
//   · nenhum texto "VAZIO/VAZIA/EMPTY" pintado como desenho.
import { Px } from '../pixel/px';
import type { GameState } from '../../sim/types';
import { placeLabels31, type Label31, type Spot31 } from './scene31model';

export interface PolPerson31 { x: number; y: number; /** atrás de um móvel da camada da frente (balcão, mesa) */ behind?: boolean }
export interface PolScene31 {
  id: string; W: number; H: number;
  back: Px; front?: Px;
  /** linhas de chão (y onde um pé pode pousar) */ floors: number[];
  /** tampos onde alguém pode subir (palco, tablado): y do topo e faixa x */ surfaces?: { x: number; w: number; y: number }[];
  people: PolPerson31[];
  spots: Spot31[];
  /** texto pintado no desenho (a pintura registra o que escreve) */ texts: string[];
}
/** `build` recebe um jogo de exemplo (as cenas que dependem do estado usam; as de exemplo fixo ignoram). */
export type PolBuild31 = (s: GameState) => PolScene31[];
const REG: { id: string; build: PolBuild31 }[] = [];
export function registerPol31(id: string, build: PolBuild31): void { if (!REG.some((r) => r.id === id)) REG.push({ id, build }); }
export const polScenes31 = (): { id: string; build: PolBuild31 }[] => REG;

/** Pé apoiado: numa linha de chão, num tampo, ou escondido pela camada da frente. */
export function feetOk31(sc: PolScene31, pp: PolPerson31): boolean {
  if (sc.floors.some((f) => Math.abs(pp.y - f) <= 1)) return true;
  if ((sc.surfaces ?? []).some((s) => Math.abs(pp.y - s.y) <= 1 && pp.x >= s.x && pp.x <= s.x + s.w)) return true;
  if (pp.behind && sc.front) { const a = sc.front.get(Math.round(pp.x), Math.round(pp.y) - 2) >>> 24; return a > 200; }
  return false;
}
/** Rótulos colidindo (escala de tela comum: ~4 px de tela por pixel lógico, e a menor, 2). */
export function labelHits31(sc: PolScene31, scale: number): [Label31, Label31][] {
  const ls = placeLabels31(sc.spots, sc.W, sc.H, scale, (sp) => sp.label.pt);
  const out: [Label31, Label31][] = [];
  for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
    const a = ls[i], b = ls[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push([a, b]);
  }
  return out;
}
/** Fração da maior cor dentro do retângulo do ponto (fundo + frente). Placeholder = uma cor domina tudo. */
export function flatShare31(sc: PolScene31, sp: Spot31): number {
  const m = new Map<number, number>();
  let n = 0;
  for (let y = Math.max(0, Math.floor(sp.y)); y < Math.min(sc.H, sp.y + sp.h); y++) for (let x = Math.max(0, Math.floor(sp.x)); x < Math.min(sc.W, sp.x + sp.w); x++) {
    const f = sc.front ? sc.front.get(x, y) : 0;
    const c = (f >>> 24) > 200 ? f : sc.back.get(x, y);
    m.set(c, (m.get(c) ?? 0) + 1); n++;
  }
  return n ? Math.max(...m.values()) / n : 0;
}
export const EMPTY_RX31 = /\b(VAZI[OA]S?|EMPTY)\b/i;
