// Exporta os artistas reais (pessoas) com papel, gênero, estreia, nascimento e fama — insumo da skill de sprites.
import { REAL_ALL } from '../src/sim/sys/realworld';
import { writeFileSync } from 'node:fs';
import { CITIES, GENRES } from '../src/data/world';
import { CATALOG_ACTS } from '../src/data/catalog';
import { REAL_ACTS } from '../src/data/realnames';
import { REAL_CLASSIC } from '../src/data/realacts_classic';
const FAM = new Map(GENRES.map((g) => [g.id, g.family as string]));

type P = { name: string; role?: string; genre: string; family?: string; debut: number; birth?: number; death?: number; tier: number; country: string; acts: string[] };
const out = new Map<string, P>();
// os 100 atos-arquétipo do catálogo (nomes reais em realnames.ts, dados extras em realacts_classic.ts) vêm primeiro
for (const ca of CATALOG_ACTS) {
  const real = REAL_ACTS[ca.no];
  if (!real) continue;
  const ex = REAL_CLASSIC[ca.no] ?? {};
  const city = CITIES.find((x) => x.id === ca.city);
  const base = { genre: ca.genre, family: FAM.get(ca.genre), debut: ex.d ?? ca.debut, tier: 1, country: city ? `mercado:${city.market}` : '', acts: [real.name] };
  const people: [string, string | undefined, number | undefined, number | undefined][] = ex.m
    ? ex.m.map((m) => [m[0], m[1], m[2], m[3]])
    : real.members && real.members.length > 1 ? real.members.map((n) => [n, undefined, undefined, undefined])
    : [[real.members?.[0] ?? real.name, ex.r, ex.b, ex.x]];
  for (const [name, role, birth, death] of people) {
    const p = out.get(name);
    if (p) { p.acts.push(real.name); continue; }
    out.set(name, { name, role, birth, death, ...base, acts: [real.name] });
  }
}
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
