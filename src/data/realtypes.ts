// Formato compacto dos artistas reais (rodada 7). Cada lista (realacts_*.ts) usa este formato; o
// carregador em sim/sys/realworld.ts transforma cada entrada em um ato que surge no ano real de estreia,
// com integrantes, discografia inicial, separação, mortes e voltas.
//
// No modo ficcional, os mesmos arquétipos entram com nomes gerados (como o catálogo original).

export type RealRole = 'vocal' | 'guitar' | 'bass' | 'drums' | 'keys' | 'horns' | 'dj' | 'producer' | 'mc' | 'strings';

/** r27 (F): passagem pelo ato [entrou?, saiu?] — `undefined` na entrada = desde o início; na saída = até hoje. */
export type RealPeriod = [number | undefined, (number | undefined)?];

/** [nome, papel, ano de nascimento?, ano de morte?, ano em que entrou?, ano em que saiu?, passagens?]
 *  r27 (F): quem saiu e voltou tem UMA linha com todas as passagens no 7º campo (KISS/Eric Singer, Take That/Robbie
 *  Williams 1990–95 e 2010–12…); entrou/saiu ficam como a 1ª entrada e a última saída (leitores antigos continuam certos). */
export type RealMember = [string, RealRole, number?, number?, number?, number?, RealPeriod[]?];

/** r27 (F): todas as passagens de um integrante (sem o 7º campo: a única [entrou, saiu]). */
export const periodsOf = (m: RealMember): RealPeriod[] => (m[6]?.length ? m[6] : [[m[4], m[5]]]);
/** r27 (F): integrante no ano `y` (com deslocamento opcional dos modos livre/caos). Saída no ano y = já fora em y. */
export const inLineupAt = (m: RealMember, y: number, shift = 0): boolean =>
  periodsOf(m).some(([a, b]) => (a === undefined || a + shift <= y) && (b === undefined || b + shift > y));
/** r27 (F): estava na formação de estreia (inclui quem saiu no próprio ano da estreia, como Vince Clarke em 1981). */
export const atDebut27 = (m: RealMember, d: number): boolean => periodsOf(m).some(([a, b]) => (a === undefined || a <= d) && (b === undefined || b >= d));
/** r27 (F): primeira entrada documentada (undefined = desde o início). */
export const firstJoin = (m: RealMember): number | undefined => periodsOf(m)[0][0];

/** r27 (F): procedência de um dado real — c = confirmado, a = aproximado (datas incertas), u = não conferido. */
export type Prov27 = 'c' | 'a' | 'u';

/** r27 (F): edição que não é disco novo de estúdio (coletânea, ao vivo, relançamento, trilha). */
export type RealRelKind = 'compilation' | 'live' | 'reissue' | 'soundtrack';
/** [título, ano, tipo?, edição?] — tipo: 'lp' (padrão) | 'ep' | 'single'; edição (r27): coletânea/ao vivo/relançamento */
export type RealRelease = [string, number, ('lp' | 'ep' | 'single')?, RealRelKind?];

export interface RealArtist {
  /** nome artístico */
  n: string;
  /** id de gênero (src/data/world.ts GENRES) */
  g: string;
  /** id de cidade (src/data/world.ts CITIES) */
  c: string;
  /** ano da estreia (primeiro lançamento) */
  d: number;
  /** r27: ano de formação, quando bem antes da estreia (ausente = estreia − 1) */
  f?: number;
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
  /** r19 (T8): `false` = dado ainda não conferido (†) — some no modo "Vida real exata" (só fatos documentados) */
  exact?: false;
  /** r27 (F): campos aproximados (o ato continua no modo exato, mas a ficha diz "aproximado"): 'f' formação, 'd' estreia,
   *  'b' nascimento, 'x' morte, 'm' datas de integrantes */
  ap?: ('f' | 'd' | 'b' | 'x' | 'm')[];
  /** r19 (T8): propenso a tributo/cover (db19 §3.1 K) — tribute19 dá bônus de nascimento */
  T?: true;
}
