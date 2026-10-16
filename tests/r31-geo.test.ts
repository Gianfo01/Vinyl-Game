// R31 · onda 4 (GEO): geografia real da cidade no mapa (src/data/geo31.ts + chão/marcos de ui/pixel/campus18px.ts).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { CITIES } from '../src/data/world';
import { DIST18, LOTS18 } from '../src/sim/sys/campus18';
import { GEO31, ISLANDS31, SIDES31, geo31, isIsland31, terrainAt31 } from '../src/data/geo31';
import { BAY27, BRICK27, STONE27, TOWERS27, cityLook27, mapLms27 } from '../src/ui/pixel/city27';
import { LM_WET31, geo18, lmPlace31, outerLots31, useGeo18 } from '../src/ui/pixel/campus18px';

void defaultConfig; void createGame; // mesma ordem de import dos outros testes de UI (evita ciclo de inicialização)

const base = CITIES.filter((c) => !c.w).map((c) => c.id);
const GEOS = [...DIST18.map((d) => [d.gw, d.gh] as [number, number]), [44, 32] as [number, number]];

describe('R31 GEO: tabela de geografia', () => {
  it('toda cidade de baía, torres, tijolo, pedra e jogável do mundo está na tabela', () => {
    for (const c of [...BAY27, ...TOWERS27, ...BRICK27, ...STONE27, ...base]) expect(GEO31[c], c).toBeDefined();
    const sets = new Set([...BAY27, ...TOWERS27, ...BRICK27, ...STONE27]);
    for (const c of Object.keys(GEO31)) expect(CITIES.some((x) => x.id === c) || sets.has(c), `cidade ${c} existe`).toBe(true);
  });
  it('nenhuma cidade é ilha (água nos quatro lados) salvo as marcadas como ilha', () => {
    for (const g of Object.values(GEO31)) expect(isIsland31(g), g.city).toBe(ISLANDS31.has(g.city));
    for (const c of ['rio', 'salvador', 'lisbon', 'barcelona', 'miami', 'sydney', 'istanbul']) expect(isIsland31(geo31(c)), c).toBe(false);
  });
  it('exemplos do dono: Rio (praia ao sul, baía, morro com favela), SP sem mar, Londres/Paris com rio, NY com rio dos dois lados', () => {
    const rio = geo31('rio');
    expect(rio.water.find((w) => w.side === 's')?.shore).toBe('beach');
    expect(rio.water.some((w) => w.k === 'bay')).toBe(true);
    expect(rio.hills.some((h) => h.favela)).toBe(true);
    expect(geo31('sao_paulo').water).toHaveLength(0);
    expect(geo31('london').water[0].k).toBe('river');
    expect(geo31('paris').water[0].k).toBe('river');
    expect(geo31('new_york').water.filter((w) => w.k === 'river').map((w) => w.side).sort()).toEqual(['e', 'w']);
    expect(geo31('madrid').water).toHaveLength(0);
  });
  it('cidade fora da tabela cai em terra em volta', () => {
    const g = geo31('cidade_inventada');
    for (const sd of SIDES31) expect(g.water.some((w) => w.side === sd)).toBe(false);
    expect(terrainAt31(g, -3, 5, 20, 16).t).toBe('land');
  });
});

describe('R31 GEO: nada em cima da água', () => {
  it('nenhum lote (em nenhum tamanho de mapa) cai em água, praia, cais ou outra margem', () => {
    for (const g of Object.values(GEO31)) for (const [gw, gh] of GEOS) for (const lot of LOTS18) {
      if (lot.gx + lot.w > gw || lot.gy + lot.d > gh) continue;
      for (let y = lot.gy; y < lot.gy + lot.d; y += 1) for (let x = lot.gx; x < lot.gx + lot.w; x += 1)
        expect(terrainAt31(g, x + 0.25, y + 0.25, gw, gh).t, `${g.city} ${gw}x${gh} lote ${lot.gx},${lot.gy}`).toBe('land');
    }
  });
  it('a água fica do lado certo: Rio tem mar ao sul e terra ao norte-oeste; SP não tem água em lado nenhum', () => {
    const rio = geo31('rio');
    expect(terrainAt31(rio, 10, 16 + 4, 20, 16).t).toBe('water');
    expect(terrainAt31(rio, 2, -3, 20, 16).t).not.toBe('water');
    for (const [x, y] of [[-4, 5], [5, -4], [24, 5], [5, 20]]) expect(terrainAt31(geo31('sao_paulo'), x, y, 20, 16).t, `${x},${y}`).not.toBe('water');
  });
  it('prédios de fora da grade (outra margem, subúrbio) nunca caem na água; marcos de terra não ficam na água', () => {
    for (const c of Object.keys(GEO31)) for (const y of [1930, 2030]) for (const d of [0, DIST18.length - 1]) {
      const x = DIST18[d];
      useGeo18(geo18(x.gw, x.gh));
      const look = cityLook27(c, CITIES.find((q) => q.id === c)?.lat ?? 0, y);
      const lms = lmPlace31(mapLms27(c, y), look.geo, y);
      for (const o of outerLots31(look, y, 7, lms))
        for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) {
          const t = terrainAt31(look.geo, o.lot.gx + a * o.lot.w, o.lot.gy + b * o.lot.d, x.gw, x.gh).t;
          expect(['water', 'sand', 'quay', 'rock', 'prom'].includes(t), `${c} ${y} ${o.id} ${t}`).toBe(false);
        }
      // só marcos "de água" (pontes, porto, ópera, estátua do porto, bondinho do Pão de Açúcar) ficam na água
      for (const q of lms) if (q.wet) expect(LM_WET31.has(q.lm.id) || ['bridge', 'tbridge'].includes(q.lm.sh), `${c} ${y} ${q.lm.id}`).toBe(true);
    }
  });
  it('marcos no lugar certo: Cristo no morro e Pão de Açúcar na água (Rio 2030)', () => {
    useGeo18(geo18(44, 32));
    const rio = cityLook27('rio', -22.9, 2030);
    const at = lmPlace31(mapLms27('rio', 2030), rio.geo, 2030);
    const ch = at.find((q) => q.lm.id === 'rio_christ')!, cab = at.find((q) => q.lm.id === 'rio_cable')!;
    expect(terrainAt31(rio.geo, ch.gx, ch.gy, 44, 32).t).toBe('hill');
    expect(cab.wet).toBe(true);
  });
});
