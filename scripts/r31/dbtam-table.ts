// R31 (DBTAM): tabelas da base por tamanho (docs/r31/dbtam.md) — atos reais × país e × década, por tamanho e por base.
import { DB_SIZES, realAllowed, realCountry31 } from '../../src/sim/dbsize14';
import { BASE31_FROM, BASE31BR_FROM, BASE31BR_TO, BASE31IT_FROM, BASE31IT_TO, BASE31H_FROM, BASE31H_TO, REAL_ALL } from '../../src/sim/sys/realworld';
const group = (i: number) => (i >= BASE31H_FROM && i < BASE31H_TO ? 'HITS' : i >= BASE31IT_FROM && i < BASE31IT_TO ? 'IT' : i >= BASE31BR_FROM && i < BASE31BR_TO ? 'BR' : i >= BASE31_FROM ? 'Z' : 'originais');
const S = DB_SIZES;
const fmt = (n: number) => n.toLocaleString('pt-BR');
const L: string[] = [];
L.push('| Base | ' + S.map((d) => d.pt).join(' | ') + ' |', '|---|' + S.map(() => '---:').join('|') + '|');
for (const g of ['originais', 'Z', 'BR', 'IT', 'HITS']) L.push(`| ${g} | ` + S.map((d) => fmt(REAL_ALL.filter((a, i) => group(i) === g && realAllowed({ dbSize: d.id }, a)).length)).join(' | ') + ' |');
L.push('| **total** | ' + S.map((d) => `**${fmt(REAL_ALL.filter((a) => realAllowed({ dbSize: d.id }, a)).length)}**`).join(' | ') + ' |', '');
const cn = new Map<string, number>(); for (const a of REAL_ALL) { const k = realCountry31(a); cn.set(k, (cn.get(k) ?? 0) + 1); }
const top = [...cn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map((x) => x[0]);
L.push('| País | ' + S.map((d) => d.pt).join(' | ') + ' | % na Média |', '|---|' + S.map(() => '---:').join('|') + '|---:|');
const tot = S.map((d) => REAL_ALL.filter((a) => realAllowed({ dbSize: d.id }, a)).length);
for (const k of top) { const v = S.map((d) => REAL_ALL.filter((a) => realCountry31(a) === k && realAllowed({ dbSize: d.id }, a)).length); L.push(`| ${k} | ${v.map(fmt).join(' | ')} | ${(v[1] / tot[1] * 100).toFixed(1)}% |`); }
L.push('');
const decs = [1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
L.push('| Década de estreia | ' + S.map((d) => d.pt).join(' | ') + ' |', '|---|' + S.map(() => '---:').join('|') + '|');
for (const dc of decs) L.push(`| ${dc === 1890 ? 'até 1899' : dc + 's'} | ` + S.map((d) => fmt(REAL_ALL.filter((a) => (dc === 1890 ? a.d < 1900 : Math.floor(a.d / 10) * 10 === dc) && realAllowed({ dbSize: d.id }, a)).length)).join(' | ') + ' |');
console.log(L.join('\n'));
