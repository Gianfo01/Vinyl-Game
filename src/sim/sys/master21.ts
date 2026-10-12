// Rodada 21e (criação) — mixagem e masterização como decisão: catálogo puro (sem importar estado) das opções por era.
// mono × estéreo (1958–68), guerra do volume (1995–2010: "loud" × dinâmico), imersivo/Atmos (2019+). Fora dessas
// janelas só existe o master padrão. Quem delega (e os rivais) recebe `defaultMaster21(year)` no lançamento.

import { l, type L } from '../../data/world';

export type Master21 = 'std' | 'mono' | 'stereo' | 'loud' | 'dyn' | 'atmos';
export type MasterDim21 = 'tech' | 'emo' | 'orig' | 'acc' | 'imm' | 'dur' | 'coh';

export interface MasterDef21 {
  name: L;
  desc: L;
  /** pontos somados às dimensões do quality18 */
  dims: Partial<Record<MasterDim21, number>>;
  /** ajuste da crítica (escala 0–10) */
  critic: number;
  /** multiplicador de unidades nas 8 primeiras semanas (rádio/plataformas) */
  early: number;
}

export const MASTER21: Record<Master21, MasterDef21> = {
  std: { name: l('Master padrão', 'Standard master'), desc: l('O master da casa, sem decisão de época.', 'The house master, no era-specific call.'), dims: {}, critic: 0, early: 1 },
  mono: { name: l('Mono', 'Mono'), desc: l('Rádio AM e jukebox tocam mono: soa cheio hoje, envelhece pior.', 'AM radio and jukeboxes play mono: sounds full today, ages worse.'), dims: { acc: 3, tech: -2, dur: -3 }, critic: 0, early: 1.03 },
  stereo: { name: l('Estéreo', 'Stereo'), desc: l('Poucos têm o aparelho; a crítica e o tempo agradecem.', 'Few own the gear; critics and time are grateful.'), dims: { tech: 4, dur: 4, acc: -1 }, critic: 0.1, early: 0.98 },
  loud: { name: l('Alto (guerra do volume)', 'Loud (loudness war)'), desc: l('Mais alto salta no rádio e vende na estreia; ouvinte atento e crítica cansam.', 'Louder jumps out on radio and sells at launch; attentive listeners and critics tire.'), dims: { imm: 6, acc: 3, tech: -5, dur: -6 }, critic: -0.3, early: 1.05 },
  dyn: { name: l('Dinâmico', 'Dynamic'), desc: l('Respira: perde no rádio, ganha na crítica e na cauda.', 'Breathes: loses on radio, wins with critics and in the tail.'), dims: { tech: 4, dur: 4, imm: -2 }, critic: 0.2, early: 0.98 },
  atmos: { name: l('Imersivo (Atmos)', 'Immersive (Atmos)'), desc: l('Mix espacial: as plataformas destacam e a crítica nota o cuidado.', 'Spatial mix: platforms feature it and critics notice the care.'), dims: { tech: 5, orig: 2 }, critic: 0.15, early: 1.03 },
};

/** Opções disponíveis no ano (vazio = sem decisão: só o padrão). */
export function masterOptions21(year: number): Master21[] {
  if (year >= 1958 && year <= 1968) return ['mono', 'stereo'];
  if (year >= 1995 && year <= 2010) return ['loud', 'dyn'];
  if (year >= 2019) return ['std', 'atmos'];
  return [];
}

/** Opção padrão sensata (quem delega, rivais, saves antigos). */
export function defaultMaster21(year: number): Master21 {
  if (year >= 1958 && year <= 1968) return year <= 1963 ? 'mono' : 'stereo';
  if (year >= 1995 && year <= 2010) return 'loud';
  return 'std';
}

/** Janela da decisão, para a interface explicar o porquê. */
export function masterEra21(year: number): L | null {
  if (year >= 1958 && year <= 1968) return l('1958–68: o mercado migra do mono para o estéreo.', '1958–68: the market moves from mono to stereo.');
  if (year >= 1995 && year <= 2010) return l('1995–2010: guerra do volume — mais alto vende no rádio e perde na crítica.', '1995–2010: loudness war — louder sells on radio and loses with critics.');
  if (year >= 2019) return l('2019+: mix imersivo (Atmos) como diferencial nas plataformas.', '2019+: immersive mix (Atmos) as a platform differentiator.');
  return null;
}
