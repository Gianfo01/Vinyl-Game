// Rodada 21 (J, dados) — o que a revisão cruzada de dados (docs/revisao21/J-dados.md) pegou e os testes antigos não:
// pai de gênero mais novo que o filho, gênero fora de qualquer cena, ato real com gênero nascido depois do fim,
// integrante entrando criança, país com ficha sem nome na UI. Rode: npx vitest run tests/r21-j.test.ts

import { describe, expect, it } from 'vitest';
import { COUNTRY_INFO, countryInfoByA3 } from '../src/data/countries';
import { countryName, countryOfCity, marketOfCountry } from '../src/data/geo';
import { H19 } from '../src/data/hist19';
import { FAMILIES, CITIES, GENRES, cityById, genreById } from '../src/data/world';
import { REAL_ALL } from '../src/sim/sys/realworld';

const fams = new Set<string>(FAMILIES.map((f) => f.id));

describe('r21 J — gêneros', () => {
  it('nenhum gênero tem pai mais novo que ele', () => {
    const bad: string[] = [];
    for (const g of GENRES) for (const p of g.parents) { const pg = genreById[p]; if (!pg) bad.push(`${g.id}: pai ${p} inexistente`); else if (pg.born > g.born) bad.push(`${g.id} (${g.born}) <- ${p} (${pg.born})`); }
    expect(bad).toEqual([]);
  });
  it('todo gênero está na cena de pelo menos uma cidade (atos procedurais podem nascer nele)', () => {
    const inScene = new Set<string>();
    for (const c of CITIES) for (const g of c.scenes) inScene.add(g);
    expect(GENRES.filter((g) => !inScene.has(g.id)).map((g) => g.id)).toEqual([]);
    for (const c of CITIES) for (const g of c.scenes) expect(genreById[g], `${c.id}: cena ${g}`).toBeTruthy();
  });
  it('fatos de hist19 só empurram genrePop de gêneros já nascidos; a janela de apelo alcança o nascimento', () => {
    // o empurrão (`pop`) acontece no disparo (ano `y`); o apelo (`ap`) vigora até `until`, então basta o gênero nascer dentro da janela
    const bad: string[] = [];
    for (const h of H19) for (const g of h.g ?? []) { if (fams.has(g)) continue; const d = genreById[g]; if (!d) bad.push(`${h.id}: ${g} inexistente`); else if ((h.pop && d.born > h.y) || d.born > (h.until ?? h.y)) bad.push(`${h.id} (${h.y}–${h.until ?? h.y}): ${g} nasce em ${d.born}`); }
    expect(bad).toEqual([]);
  });
});

describe('r21 J — atos reais', () => {
  it('nenhum ato real vive inteiro com um gênero que nasce depois do fim dele', () => {
    const bad: string[] = [];
    for (const a of REAL_ALL) { const end = a.e ?? a.x; const g = genreById[a.g]; if (end && g && g.born > end) bad.push(`${a.n}: ${a.g} nasce em ${g.born}, ato termina em ${end}`); }
    expect(bad).toEqual([]);
  });
  it('integrante entra no grupo com pelo menos 12 anos (grupos infantis documentados: pelo menos 6)', () => {
    const CHILD = new Set(['The Jackson 5', "Destiny's Child", 'Sandy & Junior', 'Los Tigres del Norte', 'Babymetal', 'Menudo']);
    const bad: string[] = [];
    for (const a of REAL_ALL) for (const m of a.m ?? []) {
      const born = m[2];
      if (born === undefined) continue;
      const joined = m[4] ?? a.d;
      const age = joined - born;
      if (age < (CHILD.has(a.n) ? 6 : 12)) bad.push(`${a.n}: ${m[0]} nasce em ${born} e entra em ${joined} (${age} anos)`);
    }
    expect(bad).toEqual([]);
  });
  it('disco nunca sai antes da estreia (sem contar relançamentos póstumos)', () => {
    const bad: string[] = [];
    for (const a of REAL_ALL) for (const al of a.al ?? []) if (al[1] < a.d) bad.push(`${a.n}: "${al[0]}" ${al[1]} antes da estreia ${a.d}`);
    expect(bad).toEqual([]);
  });
});

describe('r21 J — países', () => {
  it('countryName nunca devolve o código para país com ficha', () => {
    expect(COUNTRY_INFO.filter((c) => countryName(c.a3).en === c.a3 || countryName(c.a3).pt === c.a3).map((c) => c.a3)).toEqual([]);
  });
  it('mercado da função bate com o da ficha (PRI é latam)', () => {
    expect(COUNTRY_INFO.filter((c) => marketOfCountry(c.a3) !== c.market).map((c) => `${c.a3}: ${marketOfCountry(c.a3)} × ${c.market}`)).toEqual([]);
  });
  it('Singapura, Hong Kong e Guadalupe têm país explícito (fora do atlas 1:110m) com ficha', () => {
    expect(countryOfCity('singapore')).toBe('SGP');
    expect(countryOfCity('hong_kong')).toBe('HKG');
    expect(countryOfCity('pointe_a_pitre')).toBe('GLP');
    for (const id of ['singapore', 'hong_kong', 'pointe_a_pitre']) expect(countryInfoByA3[cityById[id].a3!]).toBeTruthy();
  });
});
