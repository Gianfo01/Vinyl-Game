// R29 "arte consistente" — folhas de contato de TUDO o que é pixel art fora das folhas do artsheet29/cutsheet29:
// a sede em corte (6 cascas × 6 épocas), recortes ampliados da garagem (casa da família, van, calhambeque),
// o mapa da cidade (dia e noite, 3 épocas), interiores dos lugares, lugares animados (places), cenas14 e as
// ilustrações das páginas (art27). Dev: `npx vite --port 5299` na raiz e abra /tools/arte29c/?part=…
// As PNG de docs/shots29arte/{antes,depois} saem daqui (scripts/shots29arte.mjs).
import { upscale, type Px } from '../../src/ui/pixel/px';

const root = document.getElementById('root')!;
const q = new URLSearchParams(location.search);
const part = q.get('part') ?? 'hq-garage';
const title = (t: string) => { const e = document.createElement('h1'); e.textContent = t; root.append(e); };
const sec = (t: string) => { const e = document.createElement('h2'); e.textContent = t; root.append(e); const r = document.createElement('div'); r.className = 'row'; root.append(r); return r; };
const cell = (el: HTMLElement, label: string) => { const d = document.createElement('div'); d.className = 'cell'; const s = document.createElement('span'); s.textContent = label; d.append(el, s); return d; };
const cvPx = (p: Px, sc: number) => upscale(p.canvas(), p.w * sc, p.h * sc);
const scaled = (c: HTMLCanvasElement, sc: number) => upscale(c, c.width * sc, c.height * sc);
const crop = (c: HTMLCanvasElement, x: number, y: number, w: number, h: number, sc: number) => {
  const o = document.createElement('canvas'); o.width = w * sc; o.height = h * sc;
  const g = o.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(c, x, y, w, h, 0, 0, w * sc, h * sc); return o;
};
const YEARS = [1905, 1950, 1970, 1990, 2010, 2030];

async function game(startYear: number, scenario = 'established', city = 'london') {
  const { defaultConfig } = await import('../../src/sim/bot');
  const { createGame } = await import('../../src/sim/worldgen');
  const cfg = defaultConfig('arte29c', { scenario, startYear, homeCity: city, companyName: 'Selo Agulha' } as Parameters<typeof defaultConfig>[1]);
  (cfg as { dbSize?: string }).dbSize = 'small';
  return createGame(cfg);
}

if (part.startsWith('hq-')) {
  const shell = part.slice(3);
  const HQ = ['garage', 'shop', 'loft', 'building', 'tower', 'campus'].indexOf(shell);
  const { drawHqCutaway27 } = await import('../../src/ui/ps/hqpx27');
  const { drawJalopy } = await import('../../src/ui/sys/eggs27');
  const sc = HQ === 0 ? 2 : 1;
  title(`Sede em corte — ${shell} (×${sc}) em 6 épocas, com bonecos${HQ === 0 ? ' e o calhambeque (ovo)' : ''}`);
  const r = sec(shell);
  for (const y of YEARS) {
    const cv = document.createElement('canvas');
    const rooms = (['studio', 'lounge', 'office', 'anr', 'stage', 'lobby'] as const).map((id, i) => ({ id, more: 0, sprites: [{ id: `p${i}a${y}`, kind: 'artist' as const, name: 'A', room: id, note: { pt: '', en: '' } }, { id: `p${i}b${y}`, kind: 'staff' as const, name: 'B', room: id, note: { pt: '', en: '' } }] }));
    drawHqCutaway27(cv, { hq: HQ, year: y, rooms: rooms as never, city: 'london', brand: 'SELO AGULHA', seedKey: `arte29c|${shell}` }, { minW: HQ === 0 ? 0 : 0, props: HQ === 0 && y >= 1965 ? [{ slot: 'garage', w: 26, h: 16, draw: drawJalopy }] : [] });
    r.append(cell(scaled(cv, sc), String(y)));
  }
}

if (part === 'hqzoom') {
  const { drawHqCutaway27, plan27 } = await import('../../src/ui/ps/hqpx27');
  title('Garagem ampliada (×3): casa da família, porta de enrolar com a van, rua e vizinhos');
  const r = sec('garage — recorte');
  for (const y of YEARS) {
    const cv = document.createElement('canvas');
    drawHqCutaway27(cv, { hq: 0, year: y, rooms: [], city: 'london', brand: 'SELO AGULHA', seedKey: 'arte29c|garage' }, {});
    const pl = plan27({ hq: 0, year: y, city: 'london' });
    const lob = pl.cells.find((c) => c.kind === 'lobby')!;
    const { drawJalopy } = await import('../../src/ui/sys/eggs27');
    if (y >= 1965) { const at = [lob.x + Math.max(6, (lob.w - 26) >> 1), lob.y + lob.h - 3 - 16]; drawJalopy(cv.getContext('2d')!, at[0], at[1], 0); }
    r.append(cell(crop(cv, Math.max(0, pl.bx - 96), pl.gy - 92, 104, 108, 3), `${y} casa`));
    r.append(cell(crop(cv, lob.x - 30, pl.gy - 92, lob.w + 36, 108, 3), `${y} van`));
  }
  const r2 = sec('outras cascas — rua, vizinho e esquina (×3)');
  for (const [hq, y] of [[1, 1950], [2, 1975], [3, 1995], [4, 2015]] as const) {
    const cv = document.createElement('canvas');
    drawHqCutaway27(cv, { hq, year: y, rooms: [], city: 'london', brand: 'SELO AGULHA', seedKey: 'arte29c|z' }, {});
    const pl = plan27({ hq, year: y, city: 'london' });
    r2.append(cell(crop(cv, Math.max(0, pl.bx - 60), pl.gy - 70, 130, 86, 3), `${hq} ${y}`));
  }
}

if (part === 'city') {
  await game(1950); // carrega a simulação inteira antes (ordem de import do campus18)
  const { buildScene18, drawFrame18, env18 } = await import('../../src/ui/pixel/campus18px');
  const { buildings18, layout18 } = await import('../../src/sim/sys/campus18');
  const { mapLms27 } = await import('../../src/ui/pixel/city27');
  title('Mapa da cidade (bairro da sede) — dia e noite, 3 épocas (×1) + recorte ×3');
  for (const [y, city] of [[1950, 'london'], [1985, 'rio'], [2025, 'tokyo']] as const) {
    const s = await game(y, 'established', city);
    const bs = buildings18(s);
    const sc = buildScene18(bs, layout18(s, bs), env18(s.year, 6, 40, city), [], 77, 'SA', [], mapLms27(city, s.year));
    const r = sec(`${city} ${y}`);
    for (const night of [0, 1]) {
      const c = document.createElement('canvas'); c.width = sc.geo.mw; c.height = sc.geo.mh;
      drawFrame18(c.getContext('2d')!, sc, 2.5, night);
      r.append(cell(c, night ? 'noite' : 'dia'));
      if (!night) r.append(cell(crop(c, Math.floor(c.width * 0.3), Math.floor(c.height * 0.35), 120, 80, 3), 'dia ×3'));
    }
  }
}

if (part === 'interiors') {
  const { INTERIOR_KINDS27, interior27, drawInterior27 } = await import('../../src/ui/pixel/interior27');
  title('Interiores dos lugares da cidade (interior27) — 12 tipos × 3 épocas (×1)');
  for (const k of INTERIOR_KINDS27) {
    const r = sec(k);
    for (const y of [1935, 1975, 2020]) {
      const cv = document.createElement('canvas');
      drawInterior27(cv, interior27(k, y, 4), [{ name: 'Ana', role: { pt: 'x', en: 'x' } }, { name: 'Bob', role: { pt: 'x', en: 'x' } }, { name: 'Cid', role: { pt: 'x', en: 'x' } }], { minW: 300, city: 'london', name: 'Blue Note', seed: `${k}${y}` });
      r.append(cell(cv, String(y)));
    }
  }
}

if (part === 'places') {
  const { placeView, buildPlace } = await import('../../src/ui/pixel/places');
  const { ALL_PLACES } = await import('../../src/sim/sys/scenes/state');
  void buildPlace;
  title('Lugares animados (places/placeView) — todos os lugares em 1965 e 2015 (×1)');
  for (const k of ALL_PLACES) {
    const r = sec(k);
    for (const y of [1965, 2015]) r.append(cell(placeView(k, { year: y, alt: k, energy: 0.7 }), String(y)));
  }
}

if (part === 'scenes14') {
  const { scene14 } = await import('../../src/ui/pixel/scenes14');
  const K = ['studio_control', 'studio_live', 'venue', 'media', 'store', 'pressing', 'home', 'garage', 'city', 'awards', 'press'] as const;
  title('Cenas ilustradas (scenes14) — 11 cenas × 3 épocas');
  for (const k of K) {
    const r = sec(k);
    for (const y of [1955, 1985, 2020]) r.append(cell(scene14(k, { year: y, size: 'card', spots: false, cityId: 'london', attendance: 120, capacity: 200 }), String(y)));
  }
}

if (part === 'art27') {
  const { ART_KINDS27, artModel27, paintArt27, drawFigs27 } = await import('../../src/ui/ps/art27');
  const s = await game(1990);
  title('Ilustrações das páginas (art27) — 18 cenas × 3 épocas (×2)');
  for (const k of [...ART_KINDS27, 'signing', 'door', 'memorial', 'leave', 'era'] as const) {
    const r = sec(k);
    for (const y of [1950, 1985, 2025]) {
      const m = artModel27(k, s, { year: y, kind: k as never })!;
      const c = document.createElement('canvas'); c.width = m.W; c.height = m.H;
      const ctx = c.getContext('2d')!;
      const px = paintArt27(m, 1.2);
      const img = ctx.createImageData(m.W, m.H); new Uint32Array(img.data.buffer).set(px.d); ctx.putImageData(img, 0, 0);
      drawFigs27(ctx, s, m, 1.2, true);
      r.append(cell(scaled(c, 2), String(y)));
    }
  }
}

if (part === 'scene27') {
  const { paintTable27, paintStudio27 } = await import('../../src/ui/act27/scene27');
  title('Cenas de criação (act27/scene27: mesa de composição e estúdio) — 4 épocas (×3)');
  const r = sec('mesa / estúdio');
  for (const y of [1935, 1968, 1990, 2020]) {
    r.append(cell(cvPx(paintTable27(y, ['hook', 'verse', 'chorus', 'bridge'], 3), 3), `mesa ${y}`));
    r.append(cell(cvPx(paintStudio27(y, true), 3), `estúdio ${y}`));
  }
}

if (part === 'campusbld') {
  const { stylePreview19 } = await import('../../src/ui/pixel/campus18px');
  const { STYLES18 } = await import('../../src/sim/sys/campus18') as unknown as { STYLES18?: { id: string }[] };
  title('Estilos de prédio (stylePreview19) ×3');
  const ids = (STYLES18 ?? []).map((x) => x.id);
  for (const y of [1950, 1990, 2030]) { const r = sec(String(y)); for (const id of ids) r.append(cell(scaled(stylePreview19(id as never, y), 3), id)); }
}

void cvPx;
(window as unknown as { __done: boolean }).__done = true;
