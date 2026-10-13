// Rodada 27 (UX) — regras de seleção, sem DOM (testável). Guia: docs/ux27.md §4.
// Quando usar cada controle de escolha:
//  • segmentado  — 1 escolha entre 2–4 opções curtas, sempre à vista (modo, período, ordem, filtro principal);
//  • lista (select) — 1 escolha entre 5+ opções, ou opções de nome longo (artista, país, gênero);
//  • chips       — filtros que somam (0..n marcados) sobre uma lista;
//  • cartões     — escolha com consequência (custo, risco, efeito): cada opção mostra o que acontece;
//  • abas        — trocar de assunto dentro da mesma página (não para filtrar uma lista).

export type PickKind27 = 'segmented' | 'select' | 'chips' | 'cards';
/** Rótulo curto o bastante para caber num segmento (celular, 390px). */
export const SEG_LABEL_MAX27 = 16;
export const SEG_MAX27 = 4;

/** Qual controle usar para uma escolha. */
export function pickKind27(o: { n: number; labels?: string[]; multi?: boolean; consequences?: boolean }): PickKind27 {
  if (o.consequences) return 'cards';
  if (o.multi) return 'chips';
  const short = (o.labels ?? []).every((x) => x.trim().length <= SEG_LABEL_MAX27);
  return o.n >= 2 && o.n <= SEG_MAX27 && short ? 'segmented' : 'select';
}
