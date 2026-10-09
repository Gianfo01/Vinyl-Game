import { describe, expect, it } from 'vitest';
import { buildHash, crumbs15, fold, memo15, pageTitle15, parseHash, rank15, score15, ScrollMemo15, shortcutRows15 } from '../src/ui/navcore15';

describe('r15 navegação: helpers puros', () => {
  it('rota no hash ida e volta (com e sem aba, com caracteres especiais)', () => {
    expect(buildHash({ area: 'market' })).toBe('#/market');
    expect(buildHash({ area: 'market', tab: ['marketHub', 'auctions'] })).toBe('#/market/marketHub=auctions');
    for (const r of [{ area: 'charts' }, { area: 'world', tab: ['worldHub', 'map'] as [string, string] }, { area: 'a b', tab: ['k/1', 'x=y'] as [string, string] }]) expect(parseHash(buildHash(r))).toEqual(r);
    expect(parseHash('')).toBeNull();
    expect(parseHash('#top')).toBeNull();
    expect(parseHash('#/%E0%A4%A')).toBeNull();
  });

  it('busca tolera acentos e prefere prefixo > início de palavra > trecho > subsequência', () => {
    expect(fold('Gravação Ü')).toBe('gravacao u');
    expect(score15('grav', 'Gravadoras')).toBeGreaterThan(score15('grav', 'Estúdio de gravação'));
    expect(score15('gravacao', 'Estúdio de gravação')).toBeGreaterThan(0);
    expect(score15('dora', 'Gravadoras')).toBeGreaterThan(0);
    expect(score15('lm', 'Leilões de masters')).toBeGreaterThan(0);
    expect(score15('leil', 'Glenn Miller')).toBe(0);
    expect(score15('zz', 'Mercado')).toBe(0);
    expect(score15('', 'qualquer')).toBe(1);
  });

  it('rank15 ordena por relevância, usa peso só como desempate e não inclui o que não casa', () => {
    const cmds = [
      { label: 'The Beach Boys', kind: 'act', weight: 2 },
      { label: 'Mercado', kind: 'area', weight: 6 },
      { label: 'The Beatles', kind: 'act', weight: 8 },
      { label: 'Beto Barbosa', kind: 'person', weight: 0 },
    ];
    expect(rank15(cmds, 'the be').map((c) => c.label)).toEqual(['The Beatles', 'The Beach Boys']);
    expect(rank15(cmds, 'merc').map((c) => c.label)).toEqual(['Mercado']);
    expect(rank15(cmds, '', 2).map((c) => c.label)).toEqual(['The Beach Boys', 'Mercado']);
  });

  it('migalhas não repetem rótulos e o título segue o menu', () => {
    expect(crumbs15(['Mundo', 'Mundo', 'Mapa e cenas'])).toEqual(['Mundo', 'Mapa e cenas']);
    expect(crumbs15(['Artistas', null, 'Mercado', undefined, 'Leilões'])).toEqual(['Artistas', 'Mercado', 'Leilões']);
    expect(pageTitle15('Mercado', 'Selo Agulha')).toBe('Mercado · Selo Agulha — Masters');
  });

  it('rolagem lembrada por área com limite', () => {
    const m = new ScrollMemo15(2);
    m.save('charts', 500.4);
    m.save('artists', 30);
    expect(m.get('charts')).toBe(500);
    m.save('diary', 10);
    expect(m.get('charts')).toBe(0);
    expect(m.get('diary')).toBe(10);
    m.save('x', -5);
    expect(m.get('x')).toBe(0);
  });

  it('atalhos: sem duplicar teclas, números primeiro', () => {
    const rows = shortcutRows15([{ key: 'w', label: 'Mundo' }, { key: '1', label: 'Mesa' }, { key: 'w', label: 'Outro' }, { key: '', label: 'Sem' }, { key: '🔑', label: 'x' }]);
    expect(rows).toEqual([{ key: '1', label: 'Mesa' }, { key: 'W', label: 'Mundo' }]);
  });

  it('memo15 recalcula só quando a versão muda', () => {
    let n = 0;
    const f = memo15((k: string) => { n++; return k.length; });
    f('abc', 1); f('abc', 1);
    expect(n).toBe(1);
    f('abc', 2);
    expect(n).toBe(2);
  });
});
