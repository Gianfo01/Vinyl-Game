// R31 · W0-RN — registro de nomes de terceiros (src/data/realnames31.ts): estrutura e varredura.
// Todo id registrado precisa existir nos dados (pelo espaço do id); ids não se repetem no arquivo; cada nome real tem
// sempre a mesma homenagem; homenagem diferente do nome real.
import { readFileSync } from 'node:fs';
import '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (cenários)
import { describe, expect, it } from 'vitest';
import { REALNAMES31, REALNAME_SPACES31, realName31, type RealSpace31 } from '../src/data/realnames31';
import { FESTIVALS, MEDIA } from '../src/data/catalog';
import { AWARDS, PLATFORMS } from '../src/data/content';
import { REAL_ACTS } from '../src/data/realnames';
import { CITIES } from '../src/data/world';
import { CUR31 } from '../src/data/cur31';
import { PLACES31 } from '../src/data/places31';
import { SCENARIOS17 } from '../src/sim/sys/scenarios17';
import { SCENARIOS23 } from '../src/sim/sys/scenarios23';
import { SCENARIOS } from '../src/sim/sys/live/scenarios';

const EXISTS: Record<RealSpace31, (key: string) => boolean> = {
  act: (k) => REAL_ACTS[Number(k)] !== undefined,
  festival: (k) => FESTIVALS.some((f) => f.name === k),
  media: (k) => MEDIA.some((m) => m.name === k),
  platform: (k) => PLATFORMS.some((p) => p.id === k),
  award: (k) => AWARDS.some((a) => a.id === k),
  city: (k) => CITIES.some((c) => c.id === k),
  cur: (k) => CUR31.some((c) => c.id === k), // R31 (Z): base nova com curadoria
  place: (k) => PLACES31.some((p) => p.id === k), // R31 (H): lugares reais da música
  mode: (k) => [...SCENARIOS17, ...SCENARIOS23, ...SCENARIOS].some((c) => c.id === k), // R31 (X): modos e cenários
};

describe('registro de nomes reais (W0-RN)', () => {
  it('cada espaço tem conferidor', () => {
    for (const sp of REALNAME_SPACES31) expect(typeof EXISTS[sp]).toBe('function');
  });
  it('todo id registrado existe nos dados', () => {
    const missing: string[] = [];
    for (const id of Object.keys(REALNAMES31)) {
      const i = id.indexOf(':');
      const sp = id.slice(0, i) as RealSpace31;
      const key = id.slice(i + 1);
      if (i <= 0 || !EXISTS[sp] || !key || !EXISTS[sp](key)) missing.push(id);
    }
    expect(missing).toEqual([]);
  });
  it('ids únicos no arquivo-fonte (chave repetida em objeto literal sobrescreve em silêncio)', () => {
    const src = readFileSync(new URL('../src/data/realnames31.ts', import.meta.url), 'utf8');
    const body = src.slice(src.indexOf('REALNAMES31: Record<string, RealName31> = {'));
    const keys = [...body.matchAll(/^\s*['"]([a-z0-9_]+:[^'"]+)['"]\s*:/gm)].map((m) => m[1]);
    expect(keys.length).toBe(Object.keys(REALNAMES31).length);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('estrutura: campos preenchidos, homenagem ≠ real, mesmo real → mesma homenagem', () => {
    const subOf = new Map<string, string>();
    for (const [id, r] of Object.entries(REALNAMES31)) {
      expect(r.real.trim(), id).not.toBe('');
      expect(r.substituto.trim(), id).not.toBe('');
      expect(r.substituto, id).not.toBe(r.real);
      const prev = subOf.get(r.real);
      if (prev !== undefined) expect(r.substituto, id).toBe(prev);
      subOf.set(r.real, r.substituto);
    }
    expect(realName31('act:nao-registrado', true)).toBeUndefined();
  });
});
