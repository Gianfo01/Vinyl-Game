// Rodada 29 (WIKI) — tipos dos artigos da wiki do jogo. Sem DOM, sem estado gravado: tudo é derivado do código e das
// tabelas de dados que já existem (nada novo entra no save).
// Texto dos artigos aceita links internos no formato [[id]] ou [[id|rótulo]] — o id é o de outro artigo
// ("mech:contracts", "mundo:genre:rock", "glossario:apelo"…). tests/r29-wiki.test.ts confere que todo link resolve.
import type { L } from '../../data/world';
import type { GameState } from '../../sim/types';

/** Artigo de mecânica (um por sistema, em termos de jogador). */
export interface MechArt29 {
  /** id curto, sem prefixo (o endereço é #/wiki/mech/<id>) */
  id: string;
  title: L;
  /** nome de ícone pixel (vis.ic: ICON_NAMES/ICON17_NAMES) */
  icon: string;
  /** uma ou duas frases (aparece na lista e na busca) */
  summary: L;
  /** o que faz (parágrafos) */
  what: L[];
  /** o que afeta este sistema (entradas) */
  inputs: L[];
  /** o que este sistema afeta (saídas) */
  outputs: L[];
  /** fórmulas e regras em palavras simples, com as constantes reais */
  rules: L[];
  tips: L[];
  /** ids de página (route29model/ALL_AREAS29) que controlam o sistema */
  pages: string[];
  /** artigos relacionados (ids completos: "mech:x", "mundo:...", "glossario:...") */
  see: string[];
  /** constantes lidas do código em tempo de execução (a wiki não envelhece quando o número muda) */
  nums?: (s: GameState | null) => [L, string][];
  /** documentos de projeto de onde o artigo saiu (docs/*.md) */
  docs?: string[];
}

/** Verbete do glossário / pergunta frequente. */
export interface Term29 { id: string; term: L; def: L; see?: string[] }
export interface Faq29 { id: string; q: L; a: L; see?: string[] }

// ---------------------------------------------------------------- documento de uma página (puro, sem DOM)
// Os construtores devolvem blocos; a interface (wiki29.ts) só os desenha. Assim os testes "renderizam" cada seção em
// várias eras sem navegador.

/** Arte procedural pedida pela página (a interface escolhe a função de pixel art que já existe). */
export type Art29W =
  | { k: 'portrait'; id: string; look?: import('../../sim/types').Appearance; born?: number; role?: string; year: number }
  | { k: 'staff'; id: string; role: string; year: number; born?: number }
  | { k: 'band'; ids: { id: string; look?: import('../../sim/types').Appearance; born?: number }[]; year: number; seed: number }
  | { k: 'logo'; seed: number; name: string; genre: string; year: number }
  | { k: 'crest'; city: string }
  | { k: 'skyline'; city: string; year: number }
  | { k: 'flag'; a3: string }
  | { k: 'genre'; id: string }
  | { k: 'movement'; id: string; genre: string; year: number }
  | { k: 'relic'; kind: string; name: string; year: number; seed: string }
  | { k: 'gear'; id: string; name: string }
  | { k: 'merch'; sku: string; seed: number; act: string; genre: string; year: number }
  | { k: 'vehicle'; move: 'van' | 'bus' | 'fly'; year: number }
  | { k: 'emblem'; id: string; kind: string; a3?: string; name?: string }
  | { k: 'venue'; id: string; name: string; cap: number; year: number; city: string }
  | { k: 'outlet'; id: string; name: string; kind: string; year: number; city?: string }
  | { k: 'award'; id: string; name: string; year: number }
  | { k: 'icon'; name: string };

/** Trecho de texto: puro ou link para outro artigo. */
export type Inline29 = string | { link: string; text: string };

export type Block29 =
  | { k: 'h'; t: string }
  | { k: 'p'; x: Inline29[] }
  | { k: 'ul'; items: Inline29[][] }
  | { k: 'kv'; rows: [string, Inline29[]][] }
  | { k: 'arts'; items: { art: Art29W; cap: string; link?: string }[] }
  /** "Na sua partida": valores vivos da partida carregada */
  | { k: 'live'; rows: [string, Inline29[]][] }
  | { k: 'note'; hue: 'info' | 'warn' | 'good' | 'muted'; t: string; x: Inline29[] }
  /** lista longa de artigos (virtualizada na interface) */
  | { k: 'list'; ids: string[]; group?: string }
  /** botões para as páginas do jogo que controlam o sistema */
  | { k: 'pages'; ids: string[] }
  /** fatos da história real escondidos (spoiler) — a interface mostra o botão "Revelar história real" */
  | { k: 'spoiler'; n: number }
  /** diagrama de conexões entre sistemas */
  | { k: 'diagram' };

export interface Page29 {
  id: string;
  title: string;
  /** tipo (pessoa, artista, cidade…) */
  kind: string;
  art?: Art29W;
  crumbs: { id: string; label: string }[];
  blocks: Block29[];
}
