// R31 · W0-RN — REGISTRO ÚNICO DE NOMES DE TERCEIROS (interruptor "Nomes e obras reais", plano-pagina.md).
// Cada coisa com nome real (artista, integrante, obra, gravadora, marca, festival, casa, prêmio, parada, veículo,
// plataforma, facção, ficção de terceiros, modo de jogo…) entra aqui pelo IDENTIFICADOR, com o nome real e a homenagem
// que o substitui quando o interruptor está desligado. A troca é feita pelo id, não por substituição de texto (evita
// trocar homônimos); o mesmo nome real vira sempre a mesma homenagem. Regra do briefing (item 9): nome real novo só
// entra com registro aqui. Trocar nomes não é garantia jurídica: distribuição pública exige revisão de direitos.
//
// Formato do id: `<espaço>:<chave>` — o espaço diz onde o id existe nos dados (tests/r31-realnames.test.ts confere se
// todo id registrado existe e se não há ids repetidos no arquivo).
// Onda 0: registro vazio. O modo antigo (src/data/realnames.ts, rodada 6) continua valendo até a onda 4 (X) migrar.

export type RealKind31 = 'artist' | 'member' | 'work' | 'label' | 'company' | 'brand' | 'festival' | 'venue' | 'award' | 'chart' | 'media'
  | 'platform' | 'faction' | 'fiction' | 'quote' | 'logo' | 'mode';

export interface RealName31 {
  /** nome real (mostrado com o interruptor ligado) */
  real: string;
  /** homenagem (mostrada com o interruptor desligado) */
  substituto: string;
  tipo: RealKind31;
}

/** espaços de id aceitos (cada um tem um conferidor no teste de varredura; espaço novo = conferidor novo) */
export const REALNAME_SPACES31 = ['act', 'festival', 'media', 'platform', 'award', 'city'] as const;
export type RealSpace31 = (typeof REALNAME_SPACES31)[number];

export const REALNAMES31: Record<string, RealName31> = {};

/** Nome a mostrar para um id registrado (undefined = não registrado: quem chama usa o nome de sempre). */
export function realName31(id: string, realOn: boolean): string | undefined {
  const r = REALNAMES31[id];
  return r ? (realOn ? r.real : r.substituto) : undefined;
}
