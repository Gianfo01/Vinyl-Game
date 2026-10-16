// R31 (B) — nada de janelas do navegador: alert/confirm/prompt (globais ou window./globalThis./self.) não aparecem em src/.
// Perguntas usam o painel do jogo (src/ui/ask31.ts: ask, askConfirm, askText, tell, askFile).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|js|mjs)$/.test(n) ? [p] : [];
  });
}

/** Tira comentários e o conteúdo dos textos entre aspas (mantém o código dentro de `${...}`). */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  // pilha: aspas abertas (", ', `) ou '{' (código dentro de ${...} num template ou bloco comum)
  const st: string[] = [];
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    const top = st[st.length - 1];
    if (top === '"' || top === "'" || top === '`') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === top) { st.pop(); out += c; i++; continue; }
      if (top === '`' && c === '$' && d === '{') { st.push('{'); out += '${'; i += 2; continue; }
      out += c === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { st.push(c); out += c; i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '{') st.push('{');
    else if (c === '}' && top === '{') st.pop();
    out += c;
    i++;
  }
  return out;
}

const CALL = /(?:^|[^\w$.])(?:(?:window|globalThis|self)\s*\.\s*)?(alert|confirm|prompt)\s*\(/g;

export function dialogCalls(src: string): string[] {
  const code = stripComments(src);
  const hits: string[] = [];
  for (const m of code.matchAll(CALL)) {
    const line = code.slice(0, m.index).split('\n').length;
    hits.push(`${line}: ${m[0].trim()}`);
  }
  return hits;
}

describe('r31 B · sem janelas do navegador', () => {
  it('o detector pega chamadas reais e ignora comentários e nomes parecidos', () => {
    expect(dialogCalls('if (confirm("x")) go();')).toHaveLength(1);
    expect(dialogCalls('const v = window.prompt("pin");')).toHaveLength(1);
    expect(dialogCalls('alert ( 1 )')).toHaveLength(1);
    expect(dialogCalls('globalThis.alert(1)')).toHaveLength(1);
    expect(dialogCalls('// confirm("x")\n/* alert(1) */')).toHaveLength(0);
    expect(dialogCalls('await askConfirm("x"); askText({}); a.confirm(1); myprompt(2); x.alert(3)')).toHaveLength(0);
    expect(dialogCalls('const s = "não use confirm(";')).toHaveLength(0);
    expect(dialogCalls("h('p', { role: 'alert' })")).toHaveLength(0);
  });

  it('src/ não chama alert/confirm/prompt', () => {
    const bad: string[] = [];
    for (const f of files('src')) for (const hit of dialogCalls(readFileSync(f, 'utf8'))) bad.push(`${f}:${hit}`);
    expect(bad).toEqual([]);
  });

  it('o painel do jogo existe com a API combinada', () => {
    const src = readFileSync('src/ui/ask31.ts', 'utf8');
    for (const fn of ['ask', 'askConfirm', 'askText', 'tell', 'askFile']) expect(src).toMatch(new RegExp(`export (async )?function ${fn}\\b`));
    expect(src).toContain("'Escape'");
    expect(src).toContain("'Enter'");
    expect(src).toContain("'Tab'");
  });
});
