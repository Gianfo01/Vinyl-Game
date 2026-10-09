// Rodada 14 — ajudantes compactos para listar artistas reais adicionais.
import type { RealArtist, RealMember, RealRole } from '../realtypes';

const R: Record<string, RealRole> = { v: 'vocal', g: 'guitar', b: 'bass', d: 'drums', k: 'keys', h: 'horns', j: 'dj', p: 'producer', m: 'mc', s: 'strings' };
const al = (a?: string[]): RealArtist['al'] => a?.map((x) => { const [t, y, k] = x.split('|'); return (k ? [t, +y, k === 's' ? 'single' : 'ep'] : [t, +y]) as NonNullable<RealArtist['al']>[number]; });
/** solo: nome, gênero, cidade, país, estreia, fim (0 = ativo), nível de fama t, nível da base z, nascimento, morte (0), papel, discos "Título|ano[|s]" */
export const so = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, z: 1 | 2 | 3, b: number, x: number, r: string, a?: string[]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), t, z, b, ...(x ? { x } : {}), r: R[r], ...(a ? { al: al(a) } : {}) });
/** grupo: integrantes "Nome:papel[:nasc[:morte]]" separados por | */
export const bd = (n: string, g: string, c: string, cn: string, d: number, e: number, t: 1 | 2 | 3, z: 1 | 2 | 3, m: string, a?: string[], rj?: [number, number?][]): RealArtist =>
  ({ n, g, c, cn, d, ...(e ? { e } : {}), ...(rj ? { rj } : {}), t, z, m: m.split('|').map((x) => { const p = x.split(':'); return [p[0], R[p[1]], p[2] ? +p[2] : undefined, p[3] ? +p[3] : undefined] as RealMember; }), ...(a ? { al: al(a) } : {}) });
