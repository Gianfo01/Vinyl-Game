// Rodada 27 (F) — validador de consistência dos dados históricos (usado por tests/r27-consistency.test.ts). Puro: lê as
// listas já montadas (REAL_ALL, catálogo clássico, produtores, empresários, executivos, laços) e devolve os problemas.
// Categorias: pessoa com nascimento/morte diferentes entre cópias; passagens contraditórias; morte antes da estreia;
// ciclos e idades impossíveis na família; trabalho de bastidor depois da morte; linhas repetidas; cópia de nomes do
// catálogo diferente da formação de estreia; gênero/cidade inexistentes.
import { KIN15, type KinRow } from './kin15';
import { KIN25 } from './kin25';
import { KIN27 } from './kin27';
import { HOMONYMS27, isKinMeta27, MERGED27, norm27, ALIASES27 } from './model27';
import { KINR27 } from './research27';
import { inLineupAt, periodsOf, type RealMember } from './realtypes';
import type { RealProd } from './producers15';
import type { RealMgr } from './managers14';
import type { RealExec } from './labels10';

export interface Issue27 { cat: string; msg: string }
export interface Db27 {
  acts: { n: string; d?: number; f?: number; e?: number; b?: number; x?: number; rj?: [number, number?][]; m?: RealMember[]; g?: string; c?: string; classic?: boolean; exact?: false }[];
  prods: RealProd[]; mgrs: RealMgr[]; execs: RealExec[];
  catalogNames: { n: string; members: string[]; debutLineup: string[] }[];
  genres: Set<string>; cities: Set<string>;
  aliases: Record<string, string>;
}


const key = (n: string, al: Record<string, string>) => { const k = norm27(n); return al[k] ?? ALIASES27[k] ?? k; };

export function check27(db: Db27): Issue27[] {
  const out: Issue27[] = [];
  const add = (cat: string, msg: string) => out.push({ cat, msg });
  // ---- 0) linhas repetidas que precisaram ser fundidas (os dados devem usar o 7º campo)
  for (const x of MERGED27) add('dup_rows', x);
  // ---- 1) a mesma pessoa com nascimento/morte diferentes entre cópias
  const seen = new Map<string, { b?: number; x?: number; where: string }[]>();
  const put = (n: string, b: number | undefined, x: number | undefined, where: string) => {
    const k = key(n, db.aliases);
    if (!k.includes(' ') || HOMONYMS27.has(k)) return; // nomes de uma palavra (apelidos de banda) são ambíguos demais
    (seen.get(k) ?? seen.set(k, []).get(k)!).push({ b, x, where });
  };
  for (const a of db.acts) {
    if (!a.m?.length) put(a.n, a.b, a.x, a.n);
    for (const m of a.m ?? []) put(m[0], m[2], m[3], a.n);
  }
  for (const p of db.prods) put(p.name, p.born, p.died, `produtor ${p.id}`);
  for (const m of db.mgrs) put(m.name, m.born, m.died, `empresário ${m.id}`);
  for (const e of db.execs) put(e.name, e.born, e.died, `executivo ${e.rid}`);
  for (const [k, xs] of seen) {
    const bs = [...new Set(xs.map((x) => x.b).filter((v): v is number => v !== undefined))];
    const ds = [...new Set(xs.map((x) => x.x).filter((v): v is number => v !== undefined))];
    if (bs.length > 1 && Math.max(...bs) - Math.min(...bs) > 1) add('person_born', `${k}: ${xs.filter((x) => x.b !== undefined).map((x) => `${x.where}=${x.b}`).join(', ')}`);
    if (ds.length > 1) add('person_died', `${k}: ${xs.filter((x) => x.x !== undefined).map((x) => `${x.where}=${x.x}`).join(', ')}`);
    // morto numa cópia e vivo noutra só vale quando a outra não tem morte e o ato acabou antes (não dá para saber) — fica de fora
  }
  // ---- 2) passagens e datas de cada ato
  for (const a of db.acts) {
    if (a.g && !db.genres.has(a.g)) add('genre', `${a.n}: gênero ${a.g}`);
    if (a.c && !db.cities.has(a.c)) add('city', `${a.n}: cidade ${a.c}`);
    if (a.d !== undefined && a.e !== undefined && a.e < a.d) add('act_dates', `${a.n}: fim ${a.e} antes da estreia ${a.d}`);
    if (a.d !== undefined && a.f !== undefined && a.f > a.d) add('act_dates', `${a.n}: formação ${a.f} depois da estreia ${a.d}`);
    for (const [x] of a.rj ?? []) if (a.d !== undefined && x < a.d) add('act_dates', `${a.n}: volta ${x} antes da estreia`);
    // solo morto antes da estreia (lançamento póstumo pode existir, estreia não)
    if (!a.m?.length && a.x !== undefined && a.d !== undefined && a.x < a.d) add('death_before_debut', `${a.n}: morte ${a.x}, estreia ${a.d}`);
    if (!a.m?.length && a.b !== undefined && a.d !== undefined && a.d < a.b + 5) add('too_young', `${a.n}: nasceu ${a.b}, estreia ${a.d}`);
    const names = new Map<string, number>();
    for (const m of a.m ?? []) {
      const k = norm27(m[0]);
      names.set(k, (names.get(k) ?? 0) + 1);
      const ps = periodsOf(m);
      for (let i = 0; i < ps.length; i++) {
        const [s0, e0] = ps[i];
        if (s0 !== undefined && e0 !== undefined && e0 < s0) add('lineup', `${a.n} › ${m[0]}: saiu ${e0} antes de entrar ${s0}`);
        const nx = ps[i + 1];
        if (nx && (e0 === undefined || (nx[0] !== undefined && nx[0] < e0))) add('lineup', `${a.n} › ${m[0]}: passagens sobrepostas`);
        if (m[3] !== undefined && s0 !== undefined && s0 > m[3]) add('lineup', `${a.n} › ${m[0]}: entrou ${s0} depois de morrer ${m[3]}`);
        if (m[2] !== undefined && s0 !== undefined && s0 < m[2] + 6) add('lineup', `${a.n} › ${m[0]}: entrou ${s0} com menos de 6 anos (nasc. ${m[2]})`);
      }
      const last = ps[ps.length - 1];
      if (m[2] !== undefined && ps[0][0] === undefined && a.d !== undefined && a.d < m[2] + 6) add('too_young', `${a.n} › ${m[0]}: fundador(a) nascido(a) ${m[2]}, estreia ${a.d}`);
      if (m[3] !== undefined && last[1] !== undefined && last[1] > m[3] + 1) add('lineup', `${a.n} › ${m[0]}: saiu ${last[1]} depois de morrer ${m[3]}`);
      // fundador (sem entrada) que morreu antes da estreia e não saiu
      if (m[3] !== undefined && a.d !== undefined && m[3] < a.d && ps[0][0] === undefined && (last[1] === undefined || last[1] > m[3] + 1)) add('death_before_debut', `${a.n} › ${m[0]}: morreu ${m[3]}, estreia ${a.d}`);
    }
    for (const [k, c] of names) if (c > 1) add('dup_rows', `${a.n} › ${k} (${c} linhas)`);
    // a formação de estreia não pode ser vazia quando há integrantes
    if (a.m?.length && a.d !== undefined && !a.m.some((m) => inLineupAt(m, a.d!))) add('lineup', `${a.n}: ninguém na formação de estreia (${a.d})`);
  }
  // ---- 3) cópia de nomes do catálogo × formação de estreia documentada
  for (const c of db.catalogNames) {
    const A = c.members.map(norm27).sort().join('|'), B = c.debutLineup.map(norm27).sort().join('|');
    if (c.debutLineup.length && A !== B) add('catalog_copy', `${c.n}: [${c.members.join(', ')}] × estreia [${c.debutLineup.join(', ')}]`);
  }
  // ---- 4) bastidores: nada de trabalho novo depois da morte (póstumo até o ano seguinte vale)
  for (const p of db.prods) {
    if (p.died && p.to > p.died) add('after_death', `produtor ${p.id}: até ${p.to}, morreu ${p.died}`);
    for (const w of p.w) if (p.died && w[2] > p.died + 1) add('after_death', `produtor ${p.id}: obra "${w[0]}" (${w[2]}) depois da morte ${p.died}`);
    if (p.born && p.from < p.born + 12) add('too_young', `produtor ${p.id}: começa ${p.from}, nasc. ${p.born}`);
    if (p.from > p.to) add('act_dates', `produtor ${p.id}: de ${p.from} até ${p.to}`);
  }
  for (const m of db.mgrs) if (m.died && m.to > m.died) add('after_death', `empresário ${m.id}: até ${m.to}, morreu ${m.died}`);
  for (const e of db.execs) if (e.died && e.y > e.died) add('after_death', `executivo ${e.rid}: assume ${e.y}, morreu ${e.died}`);
  // ---- 5) família: ciclos, idades, casamento com período invertido, irmão "inteiro" com pais declarados diferentes
  const born = new Map<string, number>();
  for (const [k, xs] of seen) { const b = xs.find((x) => x.b !== undefined)?.b; if (b !== undefined) born.set(k, b); }
  for (const a of db.acts) if (!a.m?.length && a.b !== undefined) born.set(key(a.n, db.aliases), a.b);
  const parents = new Map<string, Set<string>>();
  const fullSibs: [string, string, string][] = [];
  const rows: KinRow[] = [...KIN15, ...KIN27, ...KINR27];
  for (const row of rows) {
    const last = row[row.length - 1];
    const meta = isKinMeta27(last) ? last : undefined;
    const ns = (row.slice(1, meta ? -1 : undefined) as string[]).map((n) => key(n, db.aliases));
    if (meta?.from !== undefined && meta.to !== undefined && meta.to < meta.from) add('kin', `${ns.join(' × ')}: casamento ${meta.from}–${meta.to}`);
    if (row[0] === 'P' && (!meta?.sub || meta.sub === 'biological')) for (const k of ns.slice(1)) (parents.get(k) ?? parents.set(k, new Set()).get(k)!).add(ns[0]);
    if (row[0] === 'S' && !meta?.sub) for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) fullSibs.push([ns[i], ns[j], ns.join(', ')]);
  }
  for (const [a, r, b, meta] of KIN25 as [string, string, string, { sub?: string }?][]) {
    if (meta?.sub && meta.sub !== 'biological') continue;
    if (r === 'parent') (parents.get(key(b, db.aliases)) ?? parents.set(key(b, db.aliases), new Set()).get(key(b, db.aliases))!).add(key(a, db.aliases));
    if (r === 'sibling' && !meta?.sub) fullSibs.push([key(a, db.aliases), key(b, db.aliases), `${a}, ${b}`]);
  }
  for (const [kid, ps] of parents) {
    if (ps.has(kid)) add('kin', `${kid}: pai/mãe de si mesmo(a)`);
    const bk = born.get(kid);
    for (const p of ps) {
      const bp = born.get(p);
      if (bk !== undefined && bp !== undefined && bk < bp + 13) add('kin', `${p} (${bp}) pai/mãe de ${kid} (${bk})`);
    }
  }
  // ciclo de ascendência (A ancestral de B ancestral de A)
  const anc = (k: string, path: Set<string>): string | undefined => {
    for (const p of parents.get(k) ?? []) { if (path.has(p)) return p; path.add(p); const c = anc(p, path); if (c) return c; path.delete(p); }
    return undefined;
  };
  for (const k of parents.keys()) { const c = anc(k, new Set([k])); if (c) add('kin_cycle', `${k} ↔ ${c}`); }
  for (const [a, b, row] of fullSibs) {
    const pa = parents.get(a), pb = parents.get(b);
    if (!pa?.size || !pb?.size) continue;
    const shared = [...pa].filter((x) => pb.has(x));
    const oa = [...pa].filter((x) => !pb.has(x)), ob = [...pb].filter((x) => !pa.has(x));
    if (!shared.length) add('kin', `${a} × ${b}: irmãos sem pai/mãe em comum (${row})`);
    else if (oa.length && ob.length) add('kin', `${a} × ${b}: irmãos inteiros com pais diferentes — meio-irmãos? (${row})`);
  }
  return out;
}
