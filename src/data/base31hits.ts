import type { RealArtist } from './realtypes';
import { hitAct31, type HitSrc31 } from './hits31types';
export const HITS31_SRC: HitSrc31[] = [];
export const BASE31_HITS: RealArtist[] = HITS31_SRC.map(hitAct31);
