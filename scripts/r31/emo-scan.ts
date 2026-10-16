// R31 onda 4 (EMO): varredura de pictogramas (emoji/símbolos-ícone) em literais de texto do código.
// Só olha strings e templates (comentários não contam). Usada pelo teste r31-emo e pela auditoria.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/** Símbolos tipográficos que ficam como texto (setas, formas geométricas de marcador/tendência, marcas legais). */
export const EMO_KEEP = new Set([...'▶◀↩↪↔↕↗↘↙↖⤴⤵⬅⬆⬇➡©®™‼⁉〰〽♀♂⚲☰▪▫◻◼◽◾']); // igual a EMO31_KEEP (src/ui/pixel/emo31.ts)
/** Símbolos que não são Extended_Pictographic mas funcionam como ícone na interface. */
export const EMO_EXTRA = new Set([...'☆✓✕✗✦ⓘ⌂']);

export function isPicto(ch: string): boolean {
  if (EMO_KEEP.has(ch)) return false;
  return EMO_EXTRA.has(ch) || /\p{Extended_Pictographic}/u.test(ch);
}

export interface EmoHit { file: string; line: number; ch: string; text: string }

function walk(dir: string, out: string[]): void {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f) && !/\.d\.ts$/.test(f)) out.push(p);
  }
}

/** Todos os pictogramas em literais (strings, templates) dos .ts de `roots`. */
export function scanEmo(roots: string[], skip: (file: string) => boolean = () => false): EmoHit[] {
  const files: string[] = [];
  for (const r of roots) walk(r, files);
  const hits: EmoHit[] = [];
  for (const file of files.sort()) {
    if (skip(file)) continue;
    const src = readFileSync(file, 'utf8');
    if (!/[^\x00-῿]/.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const visit = (n: ts.Node): void => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isRegularExpressionLiteral(n) || n.kind === ts.SyntaxKind.JsxText) {
        const txt = n.getText(sf);
        for (const seg of txt.matchAll(/\P{M}\p{M}*/gu)) {
          const ch = [...seg[0]][0];
          if (!isPicto(ch)) continue;
          const pos = n.getStart(sf) + (seg.index ?? 0);
          hits.push({ file, line: sf.getLineAndCharacterOfPosition(pos).line + 1, ch, text: txt.length > 140 ? txt.slice(0, 140) + '…' : txt });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return hits;
}
