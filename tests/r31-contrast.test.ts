// R31 (C) + onda 4 (M) — contraste AA dos pares de tokens declarados (ui/skin31model.ts PAIRS31) em todos os modos
// (10 estilos × escuro/claro × daltonismo × alto contraste), resolvendo a cascata real dos blocos :root dos CSS de tema
// e dos estilos; o modo daltônico tem de trocar de fato as cores de estado; o mapa ano → estilo, a preferência e o aviso.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast27, mix27 } from '../src/ui/ps/ui27model';
import { PAIRS31, SKINS31, resolveSkin31, skinBack31, skinNotice31, skinNoticeText31, skinOfYear31, skinPref31, type Ink31, type SkinId31 } from '../src/ui/skin31model';

// ordem de carga real: ux19 (via app) → theme25 → ui27 → tokens31 (main.ts)
const FILES = ['../src/ui/sys/ux19.css', '../src/ui/ps/theme25.css', '../src/ui/ps/ui27.css', '../src/ui/tokens31.css', '../src/ui/skins31.css'];
const read = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');

interface Ctx { theme: 'dark' | 'light'; cb: 'none' | 'deutan' | 'protan' | 'tritan'; contrast: boolean; skin?: SkinId31 }
interface Decl { name: string; value: string; spec: number; order: number; sel: string }

/** Tira comentários e blocos @media (o jogo sempre grava data-theme; os blocos de mídia só valem sem ele). */
function flat(css: string): string {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '', i = 0;
  while (i < css.length) {
    if (css.startsWith('@media', i)) {
      let j = css.indexOf('{', i), depth = 1; j++;
      while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      i = j;
    } else out += css[i++];
  }
  return out;
}
/** Divide por vírgulas no nível de cima (fora de parênteses). */
function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = '';
  for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
/** Casa um seletor composto que só fala do <html> (sem espaço/combinador); devolve a especificidade ou null. */
function matchRoot(sel: string, c: Ctx, top = true): number | null {
  let i = 0, spec = 0, sawRoot = !top;
  const attrs: Record<string, string> = { 'data-theme': c.theme, 'data-cb': c.cb, 'data-era-skin': c.skin ?? 'estudio' };
  while (i < sel.length) {
    const rest = sel.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^:root/))) { sawRoot = true; spec++; i += m[0].length; continue; }
    if ((m = rest.match(/^\[([\w-]+)(?:='([^']*)')?\]/))) { const v = attrs[m[1]]; if (v === undefined || (m[2] !== undefined && v !== m[2])) return null; spec++; i += m[0].length; continue; }
    if ((m = rest.match(/^\.([\w-]+)/))) { if (!(m[1] === 'contrast' && c.contrast)) return null; spec++; i += m[0].length; continue; }
    if ((m = rest.match(/^:(not|is)\(/))) {
      let depth = 1, j = m[0].length; while (depth > 0) { if (rest[j] === '(') depth++; if (rest[j] === ')') depth--; j++; }
      const inner = splitTop(rest.slice(m[0].length, j - 1));
      const specs = inner.map((x) => matchRoot(x, c, false));
      const best = Math.max(...inner.map((x) => matchRoot(x, { ...c, theme: c.theme }, false) ?? sim(x)));
      if (m[1] === 'is') { if (specs.every((x) => x === null)) return null; }
      else if (specs.some((x) => x !== null)) return null;
      spec += best; i += j; continue;
    }
    return null; // espaço, combinador ou outra coisa: não é regra só do <html>
  }
  return sawRoot ? spec : null;
}
/** especificidade de um seletor simples que não casou (para :not/:is). */
const sim = (x: string): number => (x.match(/\[|\.|:root/g) ?? []).length;

function declsFor(c: Ctx): Map<string, string> {
  const all: Decl[] = [];
  let order = 0;
  for (const f of FILES) {
    for (const m of flat(read(f)).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sels = splitTop(m[1].trim());
      const spec = Math.max(-1, ...sels.map((s) => matchRoot(s, c) ?? -1));
      order++;
      if (spec < 0) continue;
      for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) all.push({ name: d[1], value: d[2].trim(), spec, order, sel: m[1].trim() });
    }
  }
  all.sort((a, b) => a.spec - b.spec || a.order - b.order);
  const out = new Map<string, string>();
  for (const d of all) out.set(d.name, d.value);
  return out;
}
function color(v: Map<string, string>, x: Ink31, seen = 0): string {
  if (typeof x !== 'string') return mix27(color(v, x.mix[0]), color(v, x.mix[2]), x.mix[1]);
  if (x.startsWith('#')) return x;
  const raw = v.get(x);
  if (!raw || seen > 8) throw new Error(`token sem cor: ${x}`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (ref) return color(v, ref[1], seen + 1);
  const hex = raw.match(/^#[0-9a-fA-F]{3,6}$/);
  if (!hex) throw new Error(`${x} não é cor sólida: ${raw}`);
  return raw;
}

const CTXS: Ctx[] = (['dark', 'light'] as const).flatMap((theme) => (['none', 'deutan', 'protan', 'tritan'] as const).flatMap((cb) => [false, true].map((contrast) => ({ theme, cb, contrast }))));
const label = (c: Ctx) => `${c.skin ?? 'estudio'}: ${c.theme}${c.cb !== 'none' ? '+' + c.cb : ''}${c.contrast ? '+alto contraste' : ''}`;

describe('r31 contraste: pares de tokens passam AA em todos os estilos e modos', () => {
  for (const sk of SKINS31) for (const c0 of CTXS) {
    const c: Ctx = { ...c0, skin: sk.id };
    it(label(c), () => {
      const v = declsFor(c);
      const fails: string[] = [];
      for (const p of PAIRS31) {
        if (p.only === 'estudio' && sk.id !== 'estudio') continue;
        if (p.only === 'skins' && sk.id === 'estudio') continue;
        const fg = color(v, p.fg), bg = color(v, p.bg);
        const cr = contrast27(fg, bg);
        if (cr < (p.min ?? 4.5)) fails.push(`${p.what}: ${fg} sobre ${bg} = ${cr.toFixed(2)}`);
      }
      expect(fails).toEqual([]);
    });
  }
  it('a cascata simulada bate com o que o navegador mostrou (valores medidos no jogo)', () => {
    expect(color(declsFor({ theme: 'dark', cb: 'none', contrast: false }), '--good')).toBe('#8fd0aa');
    expect(color(declsFor({ theme: 'light', cb: 'none', contrast: false }), '--accent')).toBe('#a4501a'); // ux19 ganha do theme25
  });
});

describe('r31 daltonismo: troca de verdade as cores de estado', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const cb of ['deutan', 'protan', 'tritan'] as const) {
      it(`${theme}+${cb}: cores de estado e chips mudam em relação ao normal`, () => {
        const base = declsFor({ theme, cb: 'none', contrast: false }), x = declsFor({ theme, cb, contrast: false });
        // tritanopia distingue vermelho; lá só o verde e o âmbar (que se confundem com azul/rosa) precisam mudar
        const keys = cb === 'tritan' ? ['--good', '--warn', '--t-good-fg', '--t-warn-fg'] : ['--good', '--bad', '--warn', '--t-good-fg', '--t-bad-fg', '--t-warn-fg'];
        for (const k of keys) expect(color(x, k), k).not.toBe(color(base, k));
      });
    }
  }
  it('bom e ruim ficam bem diferentes em luminância para deutan/protan (não só no matiz)', () => {
    for (const theme of ['dark', 'light'] as const) {
      const v = declsFor({ theme, cb: 'deutan', contrast: false });
      // azul × laranja: distância de matiz que sobrevive à deuteranopia; e o reforço sem cor existe no CSS
      expect(color(v, '--good')).not.toBe(color(v, '--bad'));
    }
    const css = read('../src/ui/tokens31.css');
    for (const mark of ["content: '✓", "content: '✕", "content: '!", 'border-left-style: double', 'repeating-linear-gradient']) expect(css).toContain(mark);
  });
});

describe('r31 estilo da interface por era', () => {
  it('mapa ano → estilo nas fronteiras', () => {
    const cases: [number, string][] = [[1850, 'gazeta'], [1889, 'gazeta'], [1919, 'gazeta'], [1920, 'deco'], [1945, 'deco'], [1946, 'jukebox'], [1964, 'jukebox'], [1965, 'hifi'], [1979, 'hifi'], [1980, 'fosforo'], [1989, 'fosforo'], [1990, 'janelas'], [1999, 'janelas'], [2000, 'portal'], [2007, 'portal'], [2008, 'plano'], [2019, 'plano'], [2020, 'vidro'], [2040, 'vidro'], [2077, 'vidro']];
    for (const [y, id] of cases) expect(skinOfYear31(y), String(y)).toBe(id);
    expect(skinOfYear31(NaN)).toBe('estudio');
  });
  it('preferência: padrão automático; quem desligou o visual da época fica no Estúdio fixo; valor estranho cai no padrão', () => {
    expect(skinPref31({})).toBe('auto');
    expect(skinPref31({ eraSkin: false })).toBe('estudio');
    expect(skinPref31({ skin31: 'auto', eraSkin: false })).toBe('auto');
    expect(skinPref31({ skin31: 'xyz' as never })).toBe('auto');
  });
  it('estilo efetivo: os 9 estilos estão prontos; automático segue a época, fixo vale em qualquer ano', () => {
    expect(SKINS31.filter((s) => s.id !== 'estudio')).toHaveLength(9);
    expect(SKINS31.every((s) => s.ready)).toBe(true);
    const cases: [number, string][] = [[1900, 'gazeta'], [1930, 'deco'], [1960, 'jukebox'], [1970, 'hifi'], [1985, 'fosforo'], [1995, 'janelas'], [2004, 'portal'], [2014, 'plano'], [2030, 'vidro']];
    for (const [y, id] of cases) expect(resolveSkin31('auto', y), String(y)).toBe(id);
    expect(resolveSkin31('estudio', 1960)).toBe('estudio');
    expect(resolveSkin31('fosforo', 1960)).toBe('fosforo');
    expect(resolveSkin31('auto', NaN)).toBe('estudio'); // tela inicial, sem partida: o visual de hoje
  });
  it('aviso de troca: só no automático, ligado, e quando o estilo efetivo muda durante a mesma partida', () => {
    expect(skinNotice31(null, 'fosforo', 'auto', true)).toBe(false);
    expect(skinNotice31('hifi', 'fosforo', 'auto', true)).toBe(true);
    expect(skinNotice31('hifi', 'fosforo', 'auto', false)).toBe(false);
    expect(skinNotice31('hifi', 'fosforo', 'estudio', true)).toBe(false);
    expect(skinNotice31('estudio', 'estudio', 'auto', true)).toBe(false);
    const tx = skinNoticeText31('fosforo');
    expect(tx.pt).toContain('Fósforo (1980–1989)');
    expect(tx.en).toContain('Phosphor');
  });
});

describe('r31 onda 4 (M): os 9 estilos no CSS', () => {
  const css = read('../src/ui/skins31.css').replace(/\/\*[\s\S]*?\*\//g, '');
  it('cada estilo tem paleta clara e escura e forma própria (fontes/cantos)', () => {
    for (const s of SKINS31.filter((x) => x.id !== 'estudio')) {
      for (const th of ['light', 'dark']) expect(css, `${s.id} ${th}`).toContain(`:root[data-era-skin='${s.id}'][data-theme='${th}'][data-cb]`);
      expect(css, `${s.id} forma`).toMatch(new RegExp(`:root\\[data-era-skin='${s.id}'\\] \\{[^}]*--font-head`));
    }
  });
  it('estados: hover, foco, desabilitado, pressionado e bloqueado com motivo valem em todos os estilos', () => {
    const g = ":root:where([data-era-skin]:not([data-era-skin='estudio']))";
    for (const sel of ['.btn:hover:not(:disabled)', ':focus-visible', ':disabled', "[aria-pressed='true']", '.lk31-why', '.lk31-off', '.tabs button:hover', '.nav-head:hover'])
      expect(css.split('\n').some((ln) => ln.startsWith(g) && ln.includes(sel)), sel).toBe(true);
  });
  it('só tokens e escopo: nenhuma regra dos estilos vaza para o Estúdio', () => {
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      const sel = m[1].trim();
      if (!sel || sel.startsWith('@') || /^(from|to|\d+%)$/.test(sel) || sel.startsWith('.skin31') || sel.startsWith(':root.skin31-fade')) continue;
      if (sel === ':root' || sel === ":root[data-theme='light']") continue; // padrões dos tokens novos (o Estúdio não os usa)
      for (const part of splitTop(sel)) expect(part, sel).toMatch(/^:root(\[data-era-skin|:where\(\[data-era-skin)/);
    }
  });
  it('aviso: voltar ao anterior em pt e en', () => {
    expect(skinBack31('hifi').pt).toBe('Voltar ao Hi-Fi');
    expect(skinBack31('janelas').en).toBe('Back to Windows 95');
  });
});
