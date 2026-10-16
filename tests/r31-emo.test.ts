// R31 onda 4 (EMO): nenhum emoji colorido do sistema na tela — todo pictograma usado em textos da interface e do motor
// está no mapa emoji → ícone em pixel art (src/ui/pixel/emo31.ts), e todo ícone do mapa tem desenho.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMO_KEEP, isPicto, scanEmo } from '../scripts/r31/emo-scan';
import { EMO31, EMO31_ICONS, EMO31_KEEP, emoPlain31, emoSplit31, hasEmo31, hasPxIcon31, pxIconPx31 } from '../src/ui/pixel/emo31';

describe('r31 EMO — emojis viram pixel art', () => {
  it('todo pictograma em textos de src/ui, src/sim e src/data está no mapa', () => {
    const miss = scanEmo(['src/ui', 'src/sim', 'src/data', 'src/core', 'src/i18n']).filter((h) => !EMO31.has(h.ch));
    expect(miss.map((h) => `${h.file}:${h.line} ${h.ch} U+${h.ch.codePointAt(0)!.toString(16).toUpperCase()}`)).toEqual([]);
  });

  it('CSS não pinta emoji/símbolo-ícone em content:', () => {
    const bad: string[] = [];
    const walk = (d: string): void => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.css')) {
          readFileSync(p, 'utf8').split('\n').forEach((ln, i) => {
            for (const m of ln.matchAll(/content:\s*(['"])(.*?)\1/g)) for (const ch of m[2]) if (isPicto(ch)) bad.push(`${p}:${i + 1} ${ch}`);
          });
        }
      }
    };
    walk('src');
    expect(bad).toEqual([]);
  });

  it('todo nome do mapa tem desenho 16×16 com contorno, e desenhos diferentes entre si', () => {
    const seen = new Map<string, string>();
    for (const name of EMO31_ICONS) {
      expect(hasPxIcon31(name), name).toBe(true);
      const p = pxIconPx31(name)!;
      expect(p, name).toBeTruthy();
      expect([p.w, p.h]).toEqual([16, 16]);
      const opaque = [...p.d].filter((c) => c >>> 24 > 0).length;
      expect(opaque, name).toBeGreaterThan(30);
      const key = Array.from(p.d).join(',');
      expect(seen.get(key), `${name} igual a ${seen.get(key)}`).toBeUndefined();
      seen.set(key, name);
    }
  });

  it('rótulos bilíngues (alt/aria-label) em todos os emojis do mapa', () => {
    for (const [ch, e] of EMO31) {
      expect(e.label.pt.trim().length, ch).toBeGreaterThan(1);
      expect((e.label.en ?? '').trim().length, ch).toBeGreaterThan(1);
    }
  });

  it('símbolos mantidos como texto são os mesmos no teste e na tela', () => {
    expect([...EMO_KEEP].sort()).toEqual([...EMO31_KEEP].sort());
  });

  it('pxText/emoSplit trocam emoji com seletor de variação, ZWJ e tom de pele; setas ficam', () => {
    const parts = emoSplit31('⚠️ Atenção 🧑‍💼 e 👍🏽 → ok ✓');
    expect(parts.filter((p) => p.emo).map((p) => p.emo!.icon)).toEqual(['warning', 'person', 'thumbs-up', 'check']);
    expect(parts.filter((p) => p.text).map((p) => p.text).join('')).toBe(' Atenção  e  → ok ');
    expect(hasEmo31('Ir → ▶ ↗')).toBe(false);
    expect(emoPlain31('🔒 Bloqueado')).toBe('Bloqueado');
    expect(emoPlain31('🔒')).toBe('bloqueado');
    expect(emoPlain31('★ Líder')).toBe('★ Líder'); // marca monocromática fica onde não cabe imagem
    expect(emoPlain31('⚠️ Alerta ★')).toBe('Alerta ★');
    // idempotente: o observador só reescreve quando muda (★ fica; reescrever igual reabriria o observador em laço)
    for (const x of ['★ Líder', '🔒', '⚠️ Alerta ★', '✓', 'Nome ♪']) expect(emoPlain31(emoPlain31(x))).toBe(emoPlain31(x));
  });
});
