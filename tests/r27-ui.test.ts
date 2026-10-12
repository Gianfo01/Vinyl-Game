// Rodada 27 (J) — sistema visual compartilhado: tons, contraste AA dos chips nos dois temas, números alinhados
// (detecção de colunas numéricas), propósito das páginas e KPIs do cabeçalho (só leitura, nunca lançam).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PURPOSE27, KPI_OF27, TONES27, contrast27, deltaTone27, kpis27, mix27, toneOf27 } from '../src/ui/ps/ui27model';
import { isBlankCell27, isNumCell27, numColumns27 } from '../src/ui/ps/num27';
import { SECTIONS25 } from '../src/ui/ps/nav25';
import { createGame } from '../src/sim/worldgen';
import { defaultConfig } from '../src/sim/bot';
import { advanceWeek } from '../src/sim/tick';

const css = readFileSync(new URL('../src/ui/ps/ui27.css', import.meta.url), 'utf8');
const theme = readFileSync(new URL('../src/ui/ps/theme25.css', import.meta.url), 'utf8');
/** valores das variáveis num bloco `:root[data-theme='x'] { … }` (o primeiro bloco que define a variável). */
function vars(src: string, th: 'dark' | 'light'): Record<string, string> {
  const out: Record<string, string> = {};
  const re = new RegExp(`:root\\[data-theme='${th}'\\]\\s*\\{([^}]*)\\}`, 'g');
  for (const m of src.matchAll(re)) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/g)) out[d[1]] ??= d[2];
  return out;
}

describe('r27 ui: tons e contraste', () => {
  it('contraste WCAG: preto/branco = 21, mesma cor = 1, mistura no meio', () => {
    expect(contrast27('#000', '#fff')).toBeCloseTo(21, 0);
    expect(contrast27('#336699', '#336699')).toBeCloseTo(1, 5);
    expect(mix27('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
  it('toneOf27 e deltaTone27 seguem as faixas', () => {
    expect(toneOf27(80, { good: 60, bad: 20 })).toBe('good');
    expect(toneOf27(10, { good: 60, bad: 20 })).toBe('bad');
    expect(toneOf27(40, { good: 60, bad: 20 })).toBe('warn');
    expect(toneOf27(10, { good: 20, bad: 70, low: true })).toBe('good');
    expect(toneOf27(NaN, { good: 1, bad: 0 })).toBe('neutral');
    expect(deltaTone27(5)).toBe('good');
    expect(deltaTone27(-5)).toBe('bad');
    expect(deltaTone27(-5, true)).toBe('good');
    expect(deltaTone27(0)).toBe('neutral');
  });
  for (const th of ['dark', 'light'] as const) {
    it(`chips de estado passam AA (≥4,5:1) no tema ${th}, sobre o fundo do chip e sobre o painel`, () => {
      const v = vars(css, th), tv = vars(theme, th);
      for (const tone of TONES27) {
        const fg = v[`--t-${tone}-fg`], bg = v[`--t-${tone}-bg`];
        expect(fg, tone).toMatch(/^#/);
        expect(contrast27(fg, bg), `${th} ${tone} chip`).toBeGreaterThanOrEqual(4.5);
        expect(contrast27(fg, tv['--panel']), `${th} ${tone} sobre painel`).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`texto sobre preenchimento de estado (--on-tone) passa AA no tema ${th}`, () => {
      const v = vars(css, th), tv = vars(theme, th);
      for (const k of ['--good', '--bad']) expect(contrast27(v['--on-tone'], tv[k]), `${th} ${k}`).toBeGreaterThanOrEqual(4.5);
      // aviso (âmbar) no escuro: tinta escura; no claro o âmbar escuro com branco
      expect(contrast27(v['--on-tone'], tv['--warn'])).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('chip de gênero (style17): todas as famílias legíveis nos dois temas', async () => {
    const { FAMILIES } = await import('../src/data/world');
    const hsl = (hh: number, s: number, l: number): string => {
      s /= 100; l /= 100; const k = (n: number) => (n + hh / 30) % 12; const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
    };
    for (const [th, L, S, panel] of [['dark', 74, 70, '#172b3c'], ['light', 26, 62, '#fff9ef']] as const) {
      for (const f of FAMILIES) {
        const fg = hsl(f.hue, S, L);
        const bg = mix27(fg, panel, 0.1);
        expect(contrast27(fg, bg), `${th} ${f.id}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(css).toMatch(/--fam-l: 74%/);
    expect(css).toMatch(/--fam-l: 26%/);
  });
});

describe('r27 ui: números alinhados à direita', () => {
  it('reconhece dinheiro, contagens, porcentagens e variações; recusa texto e faixas', () => {
    for (const x of ['$1.491', '−$7,2 mil', '$155,6 mil', '54%', '+20', '~175', '4.739', '#3', '12k', '2,3 mi', '1978', '-3', '$0', '$1.125 $$$$$', '1956–'])
      expect(isNumCell27(x), x).toBe(true);
    for (const x of ['Bar ou clube pequeno', '50–300', 'Jun 1978', '3 semanas', 'Os Trovadores', '', 'R$ muito'])
      expect(isNumCell27(x), x).toBe(false);
    expect(isBlankCell27('—')).toBe(true);
    expect(isBlankCell27(' ')).toBe(true);
  });
  it('marca a coluna pela maioria, ignorando travessões', () => {
    const rows = [['Caixa', '$155,6 mil', '$155,9 mil'], ['A receber', '$20,4 mil', '—'], ['Dívida', '$0', '$0'], ['Nota', 'ver abaixo', '$1']];
    expect(numColumns27(rows)).toEqual([1, 2]);
    expect(numColumns27([['Casa', 'Teatro'], ['Arena', 'Estádio']])).toEqual([]);
    expect(numColumns27([['Só', '42']])).toEqual([1]);
  });
});

describe('r27 ui: cabeçalho das páginas', () => {
  it('as páginas principais de cada seção têm propósito (subtítulo) em pt e en', () => {
    const must = ['cockpit', 'artists', 'catalog', 'shows', 'festivals', 'business', 'finance', 'company', 'team', 'you'];
    for (const a of must) { expect(PURPOSE27[a]?.pt.length, a).toBeGreaterThan(10); expect(PURPOSE27[a]?.en.length, a).toBeGreaterThan(10); }
    // toda página com propósito existe na árvore de seções (nada de chave órfã)
    const known = new Set(SECTIONS25.flatMap((s) => s.themes.flatMap((x) => x.areas)));
    for (const a of Object.keys(PURPOSE27)) expect(known.has(a), a).toBe(true);
  });
  it('KPIs: só leitura, rótulos bilíngues, valores formatados, sem mexer no estado nem no RNG', () => {
    const cfg = defaultConfig('r27-ui', { scenario: 'established', startYear: 1978 });
    cfg.dbSize = 'small';
    const g = createGame(cfg);
    for (let i = 0; i < 4; i++) advanceWeek(g);
    const before = JSON.stringify(g);
    for (const area of Object.keys(KPI_OF27)) {
      const ks = kpis27(area, g);
      expect(ks.length, area).toBeGreaterThanOrEqual(3);
      for (const k of ks) { expect(k.label.pt && k.label.en, area).toBeTruthy(); expect(typeof k.value).toBe('string'); expect(k.value.length).toBeGreaterThan(0); }
    }
    expect(kpis27('cockpit', g, 'en-US')[0].value).toMatch(/^−?\$/);
    expect(JSON.stringify(g)).toBe(before);
    // página sem KPIs e estado quebrado: lista vazia, sem exceção
    expect(kpis27('charts', g)).toEqual([]);
    expect(kpis27('artists', {} as never)).toEqual([]);
  });
});
