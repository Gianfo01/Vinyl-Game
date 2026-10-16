// R31 · BASE-BR — gera src/data/base31br.ts a partir da pesquisa com fontes (docs/r31/base-br/*.jsonl).
// Cada linha da pesquisa é uma ficha verificada nas buscas (status "ok") ou um ato que ficou de fora ("skip" + motivo).
// O gerador valida (gênero/cidade existem, regra do ano do gênero, datas coerentes, integrantes vivos), descarta o que
// não passa (com motivo no relatório) e escreve o arquivo de dados + o bloco do registro de nomes (realnames31, 'br31').
// Rode: npx tsx scripts/r31/base31br-gen.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cityById, genreById } from '../../src/data/world';
import { homage31 } from '../../src/data/homage31';
import { REAL_ACTS } from '../../src/data/realnames';
import { FICTION31 } from '../../src/data/fiction31';
import { BASE31BR_FROM, REAL_ALL, dedupKey27 } from '../../src/sim/sys/realworld';

const DIR = 'docs/r31/base-br';
const NOW = 2026, FORE = 6;
const ROLES = new Set(['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'dj', 'producer', 'mc', 'strings']);
type J = Record<string, any>;
const slug = (n: string) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const num = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : undefined);

const taken = new Set([...REAL_ALL.slice(0, BASE31BR_FROM).map((a) => dedupKey27(a.n)), ...Object.values(REAL_ACTS).map((a) => dedupKey27(a.name)), ...FICTION31.map((f) => dedupKey27(f.n))]);
const ok: { a: J; note: J }[] = [], out: string[] = [], fixes: string[] = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(`${DIR}/${f}`, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const j = JSON.parse(line) as J;
    if (j.status !== 'ok') { out.push(`${j.n} — ${j.motivo ?? 'sem motivo'}`); continue; }
    const why: string[] = [];
    const n = String(j.n).trim(), d = num(j.d);
    const g = genreById[j.g];
    if (!g) why.push(`gênero ${j.g}`);
    if (!cityById[j.c]) why.push(`cidade ${j.c}`);
    if (!d || d < 1880 || d > NOW) why.push(`estreia ${j.d}`);
    if (g && d && g.born > d + FORE) why.push(`estreia ${d} antes do gênero ${j.g} (${g.born})`);
    if (!Array.isArray(j.fontes) || !j.fontes.length) why.push('sem fonte');
    const k = dedupKey27(n);
    if (taken.has(k)) why.push('duplicata da base');
    if (why.length) { out.push(`${n} — reprovado no gerador: ${why.join('; ')}`); continue; }
    taken.add(k);
    let e = num(j.e), b = num(j.b), x = num(j.x);
    if (e !== undefined && e < d!) { fixes.push(`${n}: fim ${e} < estreia — removido`); e = undefined; }
    if (b !== undefined && b >= d!) { fixes.push(`${n}: nascimento ${b} ≥ estreia — removido`); b = undefined; }
    if (x !== undefined && (x < d! - 1 || (b !== undefined && x <= b))) { fixes.push(`${n}: morte ${x} incoerente — removida`); x = undefined; }
    if (x !== undefined && (e === undefined || e > x)) e = x; // solo: carreira termina na morte
    const a: J = { n, g: j.g, c: j.c, d };
    const f0 = num(j.f); if (f0 !== undefined && f0 < d! - 1) a.f = f0;
    if (e !== undefined) a.e = e;
    if (Array.isArray(j.rj)) { const rj = j.rj.map((r: unknown[]) => [num(r[0]), num(r[1])]).filter((r: (number | undefined)[]) => r[0] !== undefined && r[0] >= d! && (r[1] === undefined || r[1] >= r[0]!)); if (rj.length) a.rj = rj.map((r: (number | undefined)[]) => (r[1] === undefined ? [r[0]] : r)); }
    a.t = j.t === 2 ? 2 : 3; a.cn = 'BRA';
    const solo = !(Array.isArray(j.m) && j.m.length);
    if (solo) { if (b !== undefined) a.b = b; if (x !== undefined) a.x = x; a.r = ROLES.has(j.r) ? j.r : 'vocal'; }
    else {
      a.m = (j.m as unknown[][]).filter((m) => typeof m[0] === 'string' && m[0].trim()).map((m) => {
        const mn = String(m[0]).trim(); let mb = num(m[2]), mx = num(m[3]); const inn = num(m[4]); let outY = num(m[5]);
        const join = inn ?? d!;
        if (mb !== undefined && mb >= join) { fixes.push(`${n}/${mn}: nascimento ${mb} ≥ entrada ${join} — removido`); mb = undefined; }
        if (mx !== undefined && (mx < join || (mb !== undefined && mx <= mb))) { fixes.push(`${n}/${mn}: morte ${mx} antes da entrada — removida`); mx = undefined; }
        if (outY !== undefined && outY < join) outY = undefined;
        const row: unknown[] = [mn, ROLES.has(String(m[1])) ? m[1] : 'vocal', mb, mx, inn, outY];
        while (row.length > 2 && row[row.length - 1] === undefined) row.pop();
        return row;
      });
      if (!a.m.length) delete a.m;
    }
    const al = (Array.isArray(j.al) ? j.al : []).filter((r: unknown[]) => {
      const y = num(r[1]); const good = typeof r[0] === 'string' && y !== undefined && y >= d! && y <= (e ?? NOW);
      if (!good) fixes.push(`${n}: obra "${r[0]}" (${r[1]}) fora de [estreia, fim] — removida`);
      return good;
    }).slice(0, 4).map((r: unknown[]) => { const t = ['lp', 'ep', 'single'].includes(String(r[2])) ? r[2] : 'lp'; const row: unknown[] = [r[0], r[1]]; if (t !== 'lp' || r[3]) row.push(t); if (['compilation', 'live', 'reissue', 'soundtrack'].includes(String(r[3]))) row.push(r[3]); return row; });
    if (al.length) a.al = al;
    const ap = (Array.isArray(j.ap) ? j.ap : []).filter((v: string) => ['f', 'd', 'b', 'x', 'm'].includes(v));
    if (ap.length) a.ap = [...new Set(ap)];
    if (j.exact === false) a.exact = false;
    ok.push({ a, note: { id: slug(n), f: j.fontes, ap: j.apelidos ?? [], c: j.confirmar ?? [], lugar: j.cityNote } });
  }
}

const lit = (v: unknown): string => {
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`;
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof v === 'object' && v) return `{ ${Object.entries(v).filter(([, x]) => x !== undefined && !(Array.isArray(x) && !x.length && false)).map(([k, x]) => `${k}: ${lit(x)}`).join(', ')} }`;
  return String(v);
};
ok.sort((p, q) => p.a.d - q.a.d || p.a.n.localeCompare(q.a.n, 'pt'));
const ids = new Set<string>();
for (const o of ok) { if (ids.has(o.note.id)) throw new Error(`id repetido ${o.note.id}`); ids.add(o.note.id); }

const head = `// R31 · onda 4 (BASE-BR) — ARTISTAS BRASILEIROS NOVOS, com fonte verificável por ato. ARQUIVO GERADO por
// scripts/r31/base31br-gen.ts a partir da pesquisa em docs/r31/base-br/*.jsonl (não edite à mão: edite a pesquisa e gere de novo).
// Entram no FIM de REAL_ALL (sim/sys/realworld.ts), logo depois do lote Z (BASE31_ACTS), atrás do interruptor 'base31.br'
// (ligado por padrão; desligado, nenhum destes atos estreia e o mundo fica igual ao de antes). Nome já presente na base
// é descartado no carregamento (dedupKey27). Dado incerto: \`ap\` (aproximado) ou omitido — nada chutado.
// A curadoria (fontes, apelidos, campos a confirmar, cidade real quando o jogo não a tem) fica em BR31_NOTES; o nome real
// tem registro em src/data/realnames31.ts no espaço 'br31' (chave = id da ficha).
import type { Cur31 } from './cur31';
import type { RealArtist } from './realtypes';

export const BASE31BR_ACTS: RealArtist[] = [
${ok.map((o) => `  ${lit(o.a)},`).join('\n')}
];

export interface BrNote31 { id: string; f: string[]; ap: string[]; c: string[]; lugar?: string }
/** Curadoria por ato (mesma ordem de BASE31BR_ACTS): fontes, apelidos, dúvidas e o lugar real quando a cidade do jogo é aproximada. */
export const BR31_NOTES: BrNote31[] = [
${ok.map((o) => `  ${lit(o.note)},`).join('\n')}
];

const AP_TXT: Record<string, string> = { d: 'ano de estreia', b: 'ano de nascimento', m: 'formação e datas dos integrantes', f: 'ano de formação', x: 'ano de morte' };
/** Fichas de curadoria no formato da onda 3 (Cur31) — id = chave 'br31:<id>' no registro de nomes reais. */
export const CURBR31: Cur31[] = BASE31BR_ACTS.map((a, i) => {
  const n = BR31_NOTES[i];
  const solo = !a.m?.length;
  return {
    id: n.id, nome: a.n, apelidos: n.ap, tipo: solo ? 'pessoa' : 'banda', area: 'artista', anos: [solo && a.b ? a.b : a.d, a.e],
    cidade: a.c, lingua: 'pt', fontes: n.f, confirmar: [...new Set([...(a.ap ?? []).map((k) => AP_TXT[k]), ...n.c, ...(n.lugar ? [\`cidade do jogo aproximada (real: \${n.lugar})\`] : [])])],
    ref: \`base31br:\${a.n}\`,
  };
});
`;
writeFileSync('src/data/base31br.ts', head);

// registro de nomes reais (espaço 'br31'): bloco entre marcadores em realnames31.ts
const rn = 'src/data/realnames31.ts';
let src = readFileSync(rn, 'utf8');
const A = '  // R31 · BASE-BR (gerado por scripts/r31/base31br-gen.ts) — início\n', B = '  // R31 · BASE-BR — fim\n';
const block = A + ok.map((o) => `  'br31:${o.note.id}': { real: ${lit(o.a.n)}, substituto: ${lit(homage31(o.a.n))}, tipo: 'artist' },\n`).join('') + B;
if (src.includes(A)) src = src.slice(0, src.indexOf(A)) + block + src.slice(src.indexOf(B) + B.length);
else { const end = src.indexOf('\n};', src.indexOf('REALNAMES31: Record<string, RealName31> = {')); src = src.slice(0, end + 1) + block + src.slice(end + 1); }
writeFileSync(rn, src);

writeFileSync(`${DIR}/_gerado.txt`, [`atos aceitos: ${ok.length}`, '', '# fora (skip da pesquisa ou reprovado no gerador)', ...out, '', '# correções automáticas', ...fixes].join('\n') + '\n');
console.log(`aceitos ${ok.length} · fora ${out.length} · correções ${fixes.length}`);
