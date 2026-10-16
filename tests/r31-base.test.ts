// R31 · onda 3 (Z) — base nova com curadoria: cada ficha completa, sem duplicata, nomes reais registrados, artistas
// novos de fato no mundo, relíquias novas no catálogo real (formato da frente G), museu nacional fora do comércio.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { CUR31, slug31 } from '../src/data/cur31';
import { BASE31_ACTS } from '../src/data/base31acts';
import { FICTION31 } from '../src/data/fiction31';
import { RELICS31, RELIC_NOSALE31, RELIC_TIER31 } from '../src/data/relics31';
import { REALNAMES31 } from '../src/data/realnames31';
import { REAL_ACTS } from '../src/data/realnames';
import { CITIES, GENRES } from '../src/data/world';
import { BASE31_FROM, REAL_ALL, dedupKey27 } from '../src/sim/sys/realworld';
import { RELICS17 } from '../src/sim/relics17';
import { relics, negotiateRelic } from '../src/sim/sys/relics9';
import '../src/sim/sys/fossati31';

const city = new Set(CITIES.map((c) => c.id));
const genre = new Set(GENRES.map((g) => g.id));

describe('curadoria completa', () => {
  it('toda ficha tem nome, tipo, anos, cidade, língua, fontes e campos a confirmar', () => {
    for (const c of CUR31) {
      expect(c.nome.trim(), c.id).not.toBe('');
      expect(['pessoa', 'banda', 'personagem', 'referencia'], c.id).toContain(c.tipo);
      expect(['artista', 'tv', 'reliquia', 'ficcao', 'familia', 'marca'], c.id).toContain(c.area);
      expect(Number.isInteger(c.anos[0]), c.id).toBe(true);
      if (c.anos[1] !== undefined) expect(c.anos[1], c.id).toBeGreaterThanOrEqual(c.anos[0]);
      expect(c.cidade.trim(), c.id).not.toBe('');
      expect(c.lingua, c.id).toMatch(/^[a-z]{2}$/);
      expect(c.fontes.length, c.id).toBeGreaterThan(0);
      expect(Array.isArray(c.confirmar), c.id).toBe(true);
      expect(Array.isArray(c.apelidos), c.id).toBe(true);
      expect(c.ref, c.id).toMatch(/:/);
    }
  });
  it('cobre a lista pedida: artistas, TV, relíquias, ficção, marcas e a família', () => {
    const ids = new Set(CUR31.map((c) => c.id));
    for (const id of ['eliana', 'angelica', 'turma_do_balao_magico', 'milton_guedes', 'chacrinha', 'silvio_santos', 'gugu', 'messiah_strad', 'lady_blunt',
      'beethoven_broadwood', 'mozart_walter', 'lennon_help_framus', 'garcia_wolf', 'marilyn_dress', 'elvis_pink_cadillac', 'elvis_lisa_marie', 'jobim_piano',
      'raul_violao', 'pixinguinha_sax', 'radio_89fm', 'radio_gazeta', 'fam_efro', 'fam_lucia', 'fam_sonia', 'fam_antonella']) expect(ids.has(id), id).toBe(true);
    expect(CUR31.filter((c) => c.area === 'reliquia').length).toBeGreaterThanOrEqual(25);
    // apresentadores são pessoas da TV; Gugu não tem discografia (não vira ato)
    for (const id of ['chacrinha', 'silvio_santos', 'gugu']) expect(CUR31.find((c) => c.id === id)!.area).toBe('tv');
    expect(BASE31_ACTS.some((a) => a.n.startsWith('Gugu'))).toBe(false);
  });
  it('artistas e ficção usam cidade e gênero que existem', () => {
    for (const a of BASE31_ACTS) { expect(city.has(a.c), a.n).toBe(true); expect(genre.has(a.g), a.n).toBe(true); }
    for (const f of FICTION31) { expect(city.has(f.c), f.n).toBe(true); expect(genre.has(f.g), f.n).toBe(true); expect(f.ano).toBeLessThanOrEqual(Math.max(f.ano, f.obraAno)); }
  });
});

describe('sem duplicata', () => {
  it('ids de ficha únicos; nomes novos não repetem a base anterior nem entre si', () => {
    const ids = CUR31.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const before = new Set([...REAL_ALL.slice(0, BASE31_FROM).map((a) => dedupKey27(a.n)), ...Object.values(REAL_ACTS).map((a) => dedupKey27(a.name))]);
    const mine = BASE31_ACTS.map((a) => dedupKey27(a.n));
    expect(new Set(mine).size).toBe(mine.length);
    expect(BASE31_ACTS.filter((a) => before.has(dedupKey27(a.n))).map((a) => a.n)).toEqual([]);
    // todos entraram de fato na base do mundo, no fim (números de catálogo antigos estáveis)
    expect(REAL_ALL.slice(BASE31_FROM, BASE31_FROM + BASE31_ACTS.length).every((a, i) => a === BASE31_ACTS[i])).toBe(true); // lotes da onda 4 (BR, IT, HITS) vêm depois
    // ficção que já existe como ato real fica marcada (a onda 4 liga, não cria outro)
    for (const f of FICTION31) expect(before.has(dedupKey27(f.n)), f.n).toBe(!!f.naBase);
    // relíquias novas: ids únicos e fora do catálogo antigo
    const rid = RELICS31.map((r) => r.id);
    expect(new Set(rid).size).toBe(rid.length);
    expect(RELICS17.filter((d) => rid.includes(d.id))).toHaveLength(rid.length);
    // o violino de "Help!" não duplica o J-160E perdido que já existia
    expect(rid).not.toContain('lennon_j160e');
  });
});

describe('nomes reais registrados', () => {
  it('toda ficha de terceiros tem registro "cur:<id>"; a família não (nome real sempre)', () => {
    for (const c of CUR31) {
      const r = REALNAMES31[`cur:${c.id}`];
      if (c.area === 'familia') { expect(r, c.id).toBeUndefined(); continue; }
      expect(r, c.id).toBeDefined();
      expect(r.real).toBe(c.nome);
      expect(r.substituto).not.toBe(r.real);
    }
    expect(slug31('Barış Manço')).toBe('baris_manco');
  });
});

describe('relíquias novas em jogo', () => {
  it('nascem no catálogo real com id próprio; museu nacional nunca está à venda; nível sugerido', () => {
    const s = createGame(defaultConfig('r31base-rl', { startYear: 1990, realNames: true, history: 'strict' }));
    advanceMonth(s); // o catálogo real nasce no fechamento do mês
    const ms = relics(s).list.find((x) => x.rr === 'messiah_strad');
    expect(ms).toBeDefined();
    expect(ms!.id).toBe('rr_messiah_strad');
    expect(ms!.st).toBe('museum');
    const bh = relics(s).list.find((x) => x.rr === 'beethoven_broadwood')!;
    bh.st = 'kept'; // mesmo fora do museu, não se vende
    expect((negotiateRelic(s, bh.id, 2.5) as { r?: string }).r).toBeUndefined();
    for (const id of RELIC_NOSALE31) expect(RELIC_TIER31[id], id).toBe('mitica');
    for (const r of RELICS31) expect(RELIC_TIER31[r.id], r.id).toBeDefined();
    // correções nas peças antigas
    expect(RELICS17.find((d) => d.id === 'tg12345_desk')!.story.pt).toContain('Abbey Road');
    expect(RELICS17.find((d) => d.id === 'prince_cloud')!.name.pt).toContain('branca');
  });
});
