// Gera docs/mapa-ligacoes29.md (para a wiki) a partir de src/sim/connmap29.ts (o mapa MEDIDO pela sonda).
import { writeFileSync } from 'node:fs';
import { CONNMAP29, SYSTEMS29 } from '../../src/sim/connmap29';

const name = (id: string) => SYSTEMS29.find((x) => x.id === id)?.name ?? id;
const dot = { forte: '●●●', media: '●●', fraca: '●' } as const;
const strName = { forte: 'forte', media: 'média', fraca: 'fraca' } as const;
const ids = SYSTEMS29.map((x) => x.id);
const L: string[] = [];
L.push('# Mapa das ligações entre sistemas (R29 — "conectar tudo")', '');
L.push(`Medido pela sonda do jogo (\`src/sim/probe29all.ts\`): cada sistema recebe um "empurrão" (ex.: ficar pobre, ganhar fama, levar um escândalo) e mede-se o efeito em ${ids.length - 1} outros sistemas, na mesma semente. **${CONNMAP29.length} de ${ids.length * (ids.length - 1)} pares** estão ligados.`, '');
L.push('Força: ●●● forte (efeito ≥ 10%), ●● média (≥ 3%), ● fraca (≥ 0,5%). Direção: ↑ o empurrão faz a saída subir, ↓ faz cair.', '');
L.push('Fonte de dados para a wiki: `src/sim/connmap29.ts` (`SYSTEMS29` e `CONNMAP29`). Para regravar: `npx tsx scripts/probe29all.ts --write` e depois `npx tsx scripts/r29/connmap-md.ts`.', '');
L.push('## Sistemas', '');
for (const s of SYSTEMS29) L.push(`- **${s.name}** (\`${s.id}\`)`);
L.push('', '## Matriz (linha influencia coluna)', '');
L.push(`| de \\ para | ${ids.map((i) => i).join(' | ')} |`, `|---|${ids.map(() => ':-:').join('|')}|`);
for (const a of ids) L.push(`| **${a}** | ${ids.map((b) => (a === b ? '·' : (() => { const e = CONNMAP29.find((x) => x.a === a && x.b === b); return e ? dot[e.str] : '—'; })())).join(' | ')} |`);
L.push('', '## Ligações por sistema', '');
for (const a of ids) {
  const out = CONNMAP29.filter((e) => e.a === a);
  const inn = CONNMAP29.filter((e) => e.b === a);
  L.push(`### ${name(a)}`, '');
  L.push(`Influencia ${out.length} sistemas · é influenciado por ${inn.length}.`, '');
  if (out.length) {
    L.push('| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |', '|---|---|:-:|--:|---|');
    for (const e of out.sort((x, y) => Math.abs(y.d) - Math.abs(x.d))) L.push(`| ${name(e.b)} | ${dot[e.str]} ${strName[e.str]} | ${e.d >= 0 ? '↑' : '↓'} | ${(e.d * 100).toFixed(1)}% | \`${e.via}\` |`);
    L.push('');
  }
  const none = ids.filter((b) => b !== a && !out.some((e) => e.b === b));
  if (none.length) L.push(`Sem ligação medida para: ${none.map(name).join(', ')}.`, '');
}
writeFileSync('docs/mapa-ligacoes29.md', L.join('\n') + '\n');
console.log('docs/mapa-ligacoes29.md', CONNMAP29.length, 'arestas');
