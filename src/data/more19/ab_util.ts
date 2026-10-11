// Rodada 19 (WP-A/WP-B) — leitor compacto de linhas de artistas reais (sem imports de valor: evita ciclo/TDZ).
// Linha: nome|gênero|cidade|país|estreia|nível|nasc|morte|papel|fim|integrantes|obras
//   integrantes: "Nome:papel[:nasc[:morte]];…"   obras: "Título:ano[:s|e];…"   papel: v g b d k h s m(c)=mc j=dj p=producer
import type { RealArtist, RealMember, RealRelease, RealRole } from '../realtypes';

const R: Record<string, RealRole> = { v: 'vocal', g: 'guitar', b: 'bass', d: 'drums', k: 'keys', h: 'horns', s: 'strings', m: 'mc', j: 'dj', p: 'producer' };
const num = (x?: string): number | undefined => (x ? +x : undefined);

export function rows(txt: string): RealArtist[] {
  return txt.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#')).map((line) => {
    const [n, g, c, cn, d, t, b, x, r, e, m, al] = line.split('|');
    const a: RealArtist = { n, g, c, cn, d: +d, t: +t as 1 | 2 | 3, z: (4 - +t) as 1 | 2 | 3 };
    if (e) a.e = +e;
    if (m) {
      a.m = m.split(';').map((p) => { const [nm, role, bo, de] = p.split(':'); return [nm, R[role] ?? 'vocal', num(bo), num(de)] as RealMember; });
    } else {
      if (b) a.b = +b;
      if (x) a.x = +x;
      a.r = R[r || 'v'];
    }
    if (al) a.al = al.split(';').map((p) => { const [ti, y, k] = p.split(':'); return (k ? [ti, +y, k === 's' ? 'single' : 'ep'] : [ti, +y]) as RealRelease; });
    return a;
  });
}
