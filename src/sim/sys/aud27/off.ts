// r27 AUD2: chaves para medir (A/B do balance23) — desliga um sistema novo sem mexer no resto.
export const OFF_AUD27: Partial<Record<'shark' | 'kin' | 'culture' | 'burnout' | 'critic' | 'macro' | 'reach', boolean>> = {};
/** por tipo de fato (reach27): desliga a reação a um tipo só */
export const OFF_KIND27: Record<string, boolean> = {};
