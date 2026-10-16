// R31 onda 4 (EMO): gera docs/r31/emo-auditoria.md — todo pictograma em textos da interface e do motor, onde aparece
// e o ícone em pixel art que o substitui. Uso: npx tsx scripts/r31/emo-audit.ts
import { writeFileSync } from 'node:fs';
import { EMO31 } from '../../src/ui/pixel/emo31';
import { scanEmo } from './emo-scan';

const hits = scanEmo(['src/ui', 'src/sim', 'src/data'], (f) => f.endsWith('pixel/emo31.ts')); // o próprio mapa não conta
const group = (f: string): string =>
  /r31\/(scene31|salas31|sala|quick31|inside31|mech31|cast31|lock31|desk31|fos31|tour31|proj31|under31|shop31|car31|socio31)|sys\/(fossati31|home18)|ps\/(hq|home27)|act27\/(negotiate27|heist27|night27|road27|flow27|show27|compose27|favors27)|pixel\//.test(f) ? 'cenas'
    : f.startsWith('src/sim') || f.startsWith('src/data') ? 'motor' : 'interface';
const by = new Map<string, typeof hits>();
for (const h of hits) by.set(h.ch, [...(by.get(h.ch) ?? []), h]);
const rows = [...by].sort((a, b) => b[1].length - a[1].length);
const files = new Set(hits.map((h) => h.file));
const lines: string[] = [
  '# R31 · onda 4 (EMO) — auditoria de emojis e símbolos-ícone',
  '',
  'Pedido do dono: "hoje as cenas estão com emojis; troque por emojis em pixel art para manter a consistência do jogo".',
  '',
  `Varredura dos literais de texto (strings e templates; comentários não contam) de \`src/ui\`, \`src/sim\` e \`src/data\` — gerada por \`npx tsx scripts/r31/emo-audit.ts\` (o código continua escrevendo o emoji como marcador semântico; é a tela que troca pelo ícone — por isso a lista vale para antes e depois; a tabela de reserva de vis.ts, 50 emojis, foi apagada).`,
  '',
  `**${hits.length} ocorrências · ${rows.length} pictogramas distintos · ${files.size} arquivos.** Por onde passam: cenas ${hits.filter((h) => group(h.file) === 'cenas').length}, motor (fatos, avisos, conquistas, calendário) ${hits.filter((h) => group(h.file) === 'motor').length}, resto da interface ${hits.filter((h) => group(h.file) === 'interface').length}.`,
  '',
  'Como cada um chega à tela e é trocado:',
  '',
  '- **Texto do DOM** montado com `h()` (quase toda a interface e todo texto do motor: fatos, avisos, conquistas, manchetes) → `dom.ts` troca por `<img class="px pxi pxe" alt="…">` (`pxNodes31`).',
  '- **`textContent`/`innerHTML`** fora do `h()` → rede de segurança `installEmo31()` (MutationObserver no documento) faz a mesma troca; `pxText(str)` serve para quem monta HTML.',
  '- **`title`, `aria-label`, `placeholder`, `<option>`, `<textarea>`, SVG** (não aceitam imagem) → `emoPlain31`: o emoji vira a palavra (se estiver sozinho) ou some (se houver texto).',
  '- **Canvas** (`fillText` nas cenas, mapa, campus) → gancho `installCanvasEmo31()` desenha o ícone no lugar; a nota ♪ do campus virou 4×5 px desenhados.',
  '- **CSS** (`content:` com ★ ✓ ✕ 🔒) → `background: var(--pxi-<nome>)` com o mesmo ícone.',
  '',
  'Símbolos que **ficam como texto** (não são ícone): setas de navegação (→ ← ↗ ↩ …), triângulos de abrir/tocar (▶ ◀ ▾ ▲ ▼), marcadores geométricos (● ○ ■ ◆), sinais matemáticos e de moeda, ♀ ♂ ⚲ ☰.',
  '',
  '| Emoji | Código | Ícone | Rótulo (pt / en) | Nº | Onde aparece (arquivo:linha) |',
  '|---|---|---|---|---|---|',
];
for (const [ch, hs] of rows) {
  const e = EMO31.get(ch);
  const where = [...new Set(hs.map((h) => `${h.file.replace(/^src\//, '')}:${h.line}`))];
  const shown = where.slice(0, 12).join(', ') + (where.length > 12 ? ` … (+${where.length - 12})` : '');
  lines.push(`| ${ch} | U+${ch.codePointAt(0)!.toString(16).toUpperCase()} | \`${e?.icon ?? '—'}\` | ${e ? `${e.label.pt} / ${e.label.en}` : '**sem mapa**'} | ${hs.length} | ${shown} |`);
}
lines.push('', '## Por grupo', '');
for (const g of ['cenas', 'motor', 'interface']) {
  const fs = new Map<string, number>();
  for (const h of hits) if (group(h.file) === g) fs.set(h.file, (fs.get(h.file) ?? 0) + 1);
  lines.push(`### ${g === 'cenas' ? 'Cenas (trocadas primeiro)' : g === 'motor' ? 'Textos do motor que aparecem na tela' : 'Resto da interface'} — ${[...fs.values()].reduce((a, b) => a + b, 0)} em ${fs.size} arquivos`, '');
  lines.push([...fs].sort((a, b) => b[1] - a[1]).map(([f, n]) => `\`${f.replace(/^src\//, '')}\` ${n}`).join(' · '), '');
}
writeFileSync('docs/r31/emo-auditoria.md', lines.join('\n') + '\n');
console.log('ok', hits.length, rows.length, files.size);
