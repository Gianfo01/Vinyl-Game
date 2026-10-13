// Exporta os artistas reais (pessoas) com papel, gênero, estreia, nascimento e fama — insumo da skill de sprites.
import { REAL_ALL } from '../src/sim/sys/realworld';
import { writeFileSync } from 'node:fs';
import { GENRES } from '../src/data/world';
const FAM = new Map(GENRES.map((g) => [g.id, g.family as string]));

type P = { name: string; role?: string; genre: string; family?: string; debut: number; birth?: number; death?: number; tier: number; country: string; acts: string[] };
const out = new Map<string, P>();
for (const a of REAL_ALL) {
  const add = (name: string, role: string | undefined, birth?: number, death?: number) => {
    const p = out.get(name);
    if (p) { p.acts.push(a.n); p.debut = Math.min(p.debut, a.d); p.tier = Math.min(p.tier, a.t); if (!p.role && role) p.role = role; return; }
    out.set(name, { name, role, genre: a.g, family: FAM.get(a.g), debut: a.d, birth, death, tier: a.t, country: a.cn, acts: [a.n] });
  };
  const anyA = a as unknown as { m?: [string, string?, number?, number?][]; r?: string; b?: number; x?: number };
  if (anyA.m) for (const m of anyA.m) add(m[0], m[1], m[2], m[3]);
  else add(a.n, anyA.r, anyA.b, anyA.x);
}
writeFileSync(process.argv[2] ?? 'people.json', JSON.stringify([...out.values()], null, 0));
console.log(out.size, 'pessoas');
