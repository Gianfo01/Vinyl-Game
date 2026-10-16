// Rodada 27 (UX) — vista Essencial × Completa (sem dependências: vis.ts, o menu e o app leem daqui).
// Essencial (padrão): menu por hubs (ps/hub27model.ts) e faixas de abas compactas (5 + "+N").
// Completa: a árvore r27 inteira e todas as abas à mostra. Conveniência deste navegador, nunca estado do jogo.

export type View27 = 'simple' | 'full';
const VKEY = 'vtn27.view';
let view: View27 | null = null;
export function view27(): View27 {
  if (view) return view;
  try { view = localStorage.getItem(VKEY) === 'full' ? 'full' : 'simple'; } catch { view = 'simple'; }
  return view;
}
export function setView27(v: View27): void { view = v; try { localStorage.setItem(VKEY, v); } catch { /* sem armazenamento */ } }

/** Quantas abas ficam à mostra numa faixa na vista Essencial antes do "+N". */
export const TABS_SHOWN27 = 5;
/** Quais abas aparecem de cara (índices): as primeiras `max` e sempre a aberta. Faixa curta (até max+1): todas. */
export function shownTabs27(n: number, cur: number, max = TABS_SHOWN27): number[] {
  if (n <= max + 1) return [...Array(n).keys()];
  const xs = [...Array(max).keys()];
  if (cur >= max) xs.push(cur);
  return xs;
}

/** R31 (A): teto de abas visíveis numa faixa antes do "Mais ▾" (plano-telas §5.3), em qualquer vista. */
export const TABS_MAX31 = 6;
/** Quais abas aparecem de cara: até 6; numa faixa maior, as 5 primeiras + a aberta (o resto vai para "Mais ▾"). */
export function shownTabs31(n: number, cur: number, max = TABS_MAX31): number[] {
  if (n <= max) return [...Array(n).keys()];
  const xs = [...Array(max - 1).keys()];
  if (cur >= max - 1) xs.push(cur);
  return xs;
}
