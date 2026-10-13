// Tipos do catálogo de props de Masters (originais e gerados).

import type { Kit } from './kit';

/** Categorias do catálogo (iguais às usadas no manifesto). */
export type Categoria =
  | 'gravacao' // estúdio, captação, mixagem
  | 'instrumento'
  | 'palco' // shows, luz, som ao vivo, estrutura
  | 'fabrica' // prensagem, duplicação, estoque, distribuição
  | 'midia' // formatos e players
  | 'escritorio' // sede, contratos, dinheiro
  | 'imprensa' // rádio, TV, revistas, câmeras
  | 'premio' // troféus, discos de ouro, legado
  | 'turne' // transporte e viagem
  | 'ambiente' // camarim, lounge, decoração, conveniência
  | 'neural'; // era sintética (2030+)

export interface PropDef {
  /** número no catálogo (continua a numeração dos originais: 001–101) */
  n: number;
  /** slug do arquivo, sem número: "violino", "telefone_1930" */
  id: string;
  nome: string;
  name: string;
  cat: Categoria;
  /** anos em que o objeto faz sentido no jogo (inclusive); omitido = atemporal */
  era?: [number, number];
  tags?: string[];
  /**
   * Altura em pixels na escala de jogo (mesma densidade dos personagens de corpo inteiro, ~78 px em pé).
   * Objetos pequenos podem ser exagerados para continuarem legíveis.
   */
  jogo: number;
  /** tamanho da prancheta nativa (padrão 256×256); o resultado é recortado no conteúdo */
  size?: [number, number];
  draw(k: Kit): void;
}
