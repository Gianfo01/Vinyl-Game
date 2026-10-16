// R31 · onda 4 (POL) — checagem automática do acabamento visual em TODAS as cenas registradas (src/ui/r31/pol31.ts):
// pé no chão (ou numa superfície, ou escondido atrás do balcão/mesa), rótulos sem colisão, nenhum ponto clicável que
// seja um retângulo de uma cor só, e nenhum texto "VAZIO/VAZIA/EMPTY" pintado como desenho.
// Com POL_DUMP=<pasta>, grava também cada cena em .rgba + .json (pré-visualização para as capturas antes/depois).
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../src/sim/worldgen'; // ordem de carga do motor (como os outros testes)
import { EMPTY_RX31, feetOk31, flatShare31, labelHits31, polScenes31 } from '../src/ui/r31/pol31';
import { abbrText } from '../src/ui/pixel/font';
import { placeLabels31, shortNames31 } from '../src/ui/r31/scene31model';
import '../src/ui/r31/pol31reg';

import { createGame } from '../src/sim/worldgen';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';

const cfg = defaultConfig('pol31', { startYear: 1975, homeCity: 'rio' });
(cfg as { dbSize?: string }).dbSize = 'small';
const game = createGame(cfg);
for (let i = 0; i < 3; i++) advanceMonth(game);
const scenes = polScenes31().flatMap((r) => r.build(game));

describe('R31 POL — acabamento das cenas', () => {
  it('há cenas registradas de todas as frentes', () => {
    const ids = new Set(polScenes31().map((r) => r.id));
    for (const id of ['loja31', 'casa31', 'mech31', 'inside31', 'fos31', 'salas31']) { expect(ids.has(id), id).toBe(true); expect(scenes.some((x) => x.id.startsWith(`${id}:`)), `${id} sem exemplos`).toBe(true); }
    expect(scenes.length).toBeGreaterThan(20);
  });
  it('toda pessoa tem o pé no chão, numa superfície ou atrás de um móvel da frente', () => {
    for (const sc of scenes) for (const pp of sc.people) expect(feetOk31(sc, pp), `${sc.id} pé em ${pp.x},${pp.y}`).toBe(true);
  });
  it('rótulos não se sobrepõem (tela grande e pequena)', () => {
    for (const sc of scenes) for (const scale of [4, 2.5]) expect(labelHits31(sc, scale).map(([a, b]) => `${a.text}×${b.text}`), `${sc.id} @${scale}`).toEqual([]);
  });
  it('nenhum ponto clicável é só um retângulo de uma cor (placeholder)', () => {
    for (const sc of scenes) for (const sp of sc.spots) if (sp.w * sp.h >= 60 && !sc.people.some((pp) => pp.x >= sp.x && pp.x <= sp.x + sp.w && pp.y >= sp.y && pp.y <= sp.y + sp.h + 2)) expect(flatShare31(sc, sp), `${sc.id}/${sp.id}`).toBeLessThan(0.7);
  });
  it('nenhum "vazio/vazia/empty" escrito como desenho', () => {
    for (const sc of scenes) for (const tx of sc.texts) expect(EMPTY_RX31.test(tx), `${sc.id}: ${tx}`).toBe(false);
  });
  it('abreviação nunca corta palavra sem ponto', () => {
    expect(abbrText('Loja de instrumentos', 70)).toBe('LOJA INSTRUMENTOS');
    for (const w of [20, 30, 40, 50]) { const t = abbrText('Loja de instrumentos', w); for (const p of t.split(' ')) expect(['LOJA', 'INSTRUMENTOS'].includes(p) || p.endsWith('.'), `${w}: ${t}`).toBe(true); }
    for (const t of shortNames31('Rádio Sociedade da Bahia')) for (const p of t.split(' ')) expect(['Rádio', 'Sociedade', 'da', 'Bahia'].includes(p) || p.endsWith('.'), t).toBe(true);
  });
  it('rótulo que não cabe some (fica no passar do mouse) em vez de cobrir outro', () => {
    const sp = (id: string, x: number) => ({ id, x, y: 10, w: 6, h: 6, label: { pt: 'Nome muito comprido demais', en: 'x' }, tip: { pt: 't', en: 't' }, go: { area: 'x' } });
    const ls = placeLabels31([sp('a', 10), sp('b', 14), sp('c', 18)], 60, 40, 4, (s) => s.label.pt);
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) expect(ls[i].x + ls[i].w <= ls[j].x || ls[j].x + ls[j].w <= ls[i].x || ls[i].y + ls[i].h <= ls[j].y || ls[j].y + ls[j].h <= ls[i].y).toBe(true);
  });
  it('pré-visualização (POL_DUMP)', () => {
    const dir = process.env.POL_DUMP;
    if (!dir) return;
    mkdirSync(dir, { recursive: true });
    for (const sc of scenes) {
      const { W, H } = sc, buf = Buffer.alloc(W * H * 4);
      for (let i = 0; i < W * H; i++) {
        let c = sc.back.d[i];
        const x = i % W, y = (i / W) | 0;
        for (const p of sc.people) if (x >= p.x - 5 && x <= p.x + 5 && y >= p.y - 30 && y <= p.y && (x === p.x - 5 || x === p.x + 5 || y === p.y - 30 || y >= p.y - 1)) c = p.behind ? 0xffff8040 : 0xffff40ff;
        const f = sc.front?.d[i] ?? 0; if ((f >>> 24) > 200) c = f;
        buf.writeUInt32LE(c >>> 0, i * 4);
      }
      const id = sc.id.replace(/[:/]/g, '-');
      writeFileSync(`${dir}/${id}.rgba`, buf);
      writeFileSync(`${dir}/${id}.json`, JSON.stringify({ W, H, spots: sc.spots.map((s) => [s.x, s.y, s.w, s.h, s.label.pt]), labels: placeLabels31(sc.spots, W, H, 3, (s) => s.label.pt).map((b) => [b.x, b.y, b.w, b.h, b.text]) }));
    }
  });
});
