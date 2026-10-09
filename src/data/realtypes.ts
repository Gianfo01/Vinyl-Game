// Formato compacto dos artistas reais (rodada 7). Cada lista (realacts_*.ts) usa este formato; o
// carregador em sim/sys/realworld.ts transforma cada entrada em um ato que surge no ano real de estreia,
// com integrantes, discografia inicial, separação, mortes e voltas.
//
// No modo ficcional, os mesmos arquétipos entram com nomes gerados (como o catálogo original).

export type RealRole = 'vocal' | 'guitar' | 'bass' | 'drums' | 'keys' | 'horns' | 'dj' | 'producer' | 'mc' | 'strings';

/** [nome, papel, ano de nascimento?, ano de morte?, ano em que entrou?, ano em que saiu?] */
export type RealMember = [string, RealRole, number?, number?, number?, number?];

/** [título, ano, tipo?] — tipo: 'lp' (padrão) | 'ep' | 'single' */
export type RealRelease = [string, number, ('lp' | 'ep' | 'single')?];

export interface RealArtist {
  /** nome artístico */
  n: string;
  /** id de gênero (src/data/world.ts GENRES) */
  g: string;
  /** id de cidade (src/data/world.ts CITIES) */
  c: string;
  /** ano da estreia (primeiro lançamento) */
  d: number;
  /** ano em que parou (separação/aposentadoria/morte); ausente = ainda ativo */
  e?: number;
  /** anos de volta: [início, fim?] */
  rj?: [number, number?][];
  /** 1 = estrela global, 2 = grande nome, 3 = nome regional/cult */
  t: 1 | 2 | 3;
  /** país ISO alfa-3 (USA, GBR, ITA, BRA…) */
  cn: string;
  /** solo: ano de nascimento, morte e papel principal */
  b?: number;
  x?: number;
  r?: RealRole;
  /** rodada 14: nível da base de dados em que entra (ausente = base original; 1 médio, 2 grande, 3 enorme) */
  z?: 1 | 2 | 3;
  /** banda/dupla: integrantes */
  m?: RealMember[];
  /** discos e singles marcantes */
  al?: RealRelease[];
}
