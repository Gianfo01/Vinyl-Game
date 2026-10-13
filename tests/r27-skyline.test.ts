// Rodada 27 (I2b): céu, horizonte e marcos por cidade e época (ui/pixel/skyline27.ts, lmdata27.ts, lmiso27.ts).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { CITIES } from '../src/data/world';
import { LANDMARKS19 } from '../src/data/landmarks19';
import { LMX27, cityLook27, env27, mapLms27 } from '../src/ui/pixel/city27';
import { LMX27B, LMW27B } from '../src/ui/pixel/lmdata27';
import { GLASS_MATS27, GLASS_YEAR27, allSigs27, renderSky27, sigX27, sigs27, skyPlan27 } from '../src/ui/pixel/skyline27';
import { drawLmIso27, hasBespoke27 } from '../src/ui/pixel/lmiso27';
import { Px } from '../src/ui/pixel/px';

void defaultConfig; void createGame; // mesma ordem de import dos outros testes de UI (evita ciclo de inicialização)

const lookOf = (c: string, y: number) => cityLook27(c, CITIES.find((x) => x.id === c)?.lat ?? 40, y);
const envOf = (c: string, y: number, m = 6) => env27(y, m, CITIES.find((x) => x.id === c)?.lat ?? 40, c);

describe('r27 (I2b) marcos novos: ano de construção', () => {
  it('nenhum marco do mapa aparece antes do ano em que foi erguido (nem depois de demolido)', () => {
    for (const lm of [...LANDMARKS19, ...LMX27]) {
      if (lm.from > -9000) expect(mapLms27(lm.city, lm.from - 1).some((x) => x.id === lm.id), `${lm.id} antes de ${lm.from}`).toBe(false);
      if (lm.to) expect(mapLms27(lm.city, lm.to).some((x) => x.id === lm.id), `${lm.id} depois de ${lm.to}`).toBe(false);
    }
  });
  it('os novos entram no mapa com ano real e desenho próprio', () => {
    expect(LMX27B.length).toBeGreaterThanOrEqual(12);
    for (const lm of LMX27B) {
      expect(LMX27.some((x) => x.id === lm.id), lm.id).toBe(true);
      expect(hasBespoke27(lm.id), lm.id).toBe(true);
      expect(LMW27B[lm.id], lm.id).toBeGreaterThan(0);
    }
    const ids = (c: string, y: number) => mapLms27(c, y).map((x) => x.id);
    expect(ids('los_angeles', 1955)).not.toContain('la_capitol');
    expect(ids('los_angeles', 1960)).toContain('la_capitol');
    expect(ids('paris', 1913)).not.toContain('par_sacre');
    expect(ids('paris', 1920)).toEqual(expect.arrayContaining(['par_eiffel', 'par_sacre']));
    expect(ids('detroit', 1976)).not.toContain('det_rencen');
    expect(ids('detroit', 1980)).toEqual(expect.arrayContaining(['det_rencen', 'det_hitsville']));
    expect(ids('lagos', 1975)).not.toContain('lag_theatre');
    expect(ids('lagos', 1980)).toContain('lag_theatre');
    expect(ids('kingston', 1974)).not.toContain('kgn_marley');
    expect(ids('kingston', 1980)).toContain('kgn_marley');
    expect(ids('memphis', 1990)).not.toContain('mem_stax'); // demolido em 1989
    expect(ids('sydney', 1980)).not.toContain('syd_tower');
  });
  it('ids dos marcos que já existiam continuam estáveis (e com desenho)', () => {
    for (const id of ['lon_bigben', 'lon_tbridge', 'par_eiffel', 'ny_empire', 'ny_liberty', 'rio_christ', 'rio_cable', 'sp_masp', 'tok_tower', 'tok_sky', 'tok_budokan', 'ber_tv', 'syd_opera', 'la_sign', 'la_bowl', 'mem_sun', 'nash_ryman', 'chi_sears', 'det_ambassador'])
      expect(hasBespoke27(id), id).toBe(true);
    expect(hasBespoke27('la_griffith') && hasBespoke27('det_hitsville')).toBe(true);
  });
});

describe('r27 (I2b) horizonte por cidade e época', () => {
  it('assinaturas do horizonte respeitam construção e demolição', () => {
    for (const [c, s] of allSigs27()) {
      expect(sigs27(c, s.from - 1).some((x) => x.id === s.id), `${s.id} antes de ${s.from}`).toBe(false);
      expect(sigs27(c, s.from).some((x) => x.id === s.id), s.id).toBe(true);
      if (s.to) expect(sigs27(c, s.to).some((x) => x.id === s.id)).toBe(false);
    }
    expect(sigs27('london', 2011).map((x) => x.id)).not.toContain('lon_shard');
    expect(sigs27('london', 2013).map((x) => x.id)).toContain('lon_shard');
  });
  it('sem pele de vidro antes de 1968 em nenhuma cidade; depois, as metrópoles têm vidro', () => {
    for (const c of CITIES) for (const y of [1889, 1925, 1950, 1967]) {
      const p = skyPlan27(c.id, y, 300, 7, lookOf(c.id, y), c.lat);
      expect(p.blds.every((b) => !GLASS_MATS27.has(b.mat)), `${c.id} ${y}`).toBe(true);
    }
    expect(GLASS_YEAR27).toBe(1968);
    for (const c of ['new_york', 'tokyo', 'sao_paulo', 'chicago']) expect(skyPlan27(c, 1995, 300, 7, lookOf(c, 1995)).blds.some((b) => GLASS_MATS27.has(b.mat)), c).toBe(true);
  });
  it('o horizonte cresce com as décadas (Nova York 1900 < 1975)', () => {
    expect(skyPlan27('new_york', 1975, 300, 7).hmax).toBeGreaterThan(skyPlan27('new_york', 1900, 300, 7).hmax);
    expect(skyPlan27('los_angeles', 1950, 300, 7).hmax).toBeLessThan(skyPlan27('los_angeles', 1990, 300, 7).hmax); // limite de altura até 1957
  });
  it('toda cidade tem horizonte em qualquer largura (sem buracos nas pontas), determinístico', () => {
    for (const c of CITIES) for (const W of [300, 436]) {
      const y = 1960 + (c.id.length % 5) * 12;
      const env = envOf(c.id, y), look = lookOf(c.id, y);
      const { p } = renderSky27({ W, H: 74, env, look, seed: 7 });
      const plan = skyPlan27(c.id, y, W, 7, look, c.lat);
      expect(plan.blds.length, c.id).toBeGreaterThan(0);
      // prédios cobrem a largura toda (do primeiro ao último pixel)
      const xs = plan.blds.filter((b) => b.layer === 0);
      expect(Math.min(...xs.map((b) => b.x)), c.id).toBeLessThanOrEqual(0);
      expect(Math.max(...xs.map((b) => b.x + b.w)), c.id).toBeGreaterThanOrEqual(W);
      expect(p.d.every((v) => v >>> 24 === 255), `${c.id}: faixa opaca`).toBe(true);
    }
    const a = renderSky27({ W: 300, H: 74, env: envOf('rio', 1980), look: lookOf('rio', 1980), seed: 3 });
    const b = renderSky27({ W: 300, H: 74, env: envOf('rio', 1980), look: lookOf('rio', 1980), seed: 3 });
    expect(Buffer.from(a.p.d.buffer).equals(Buffer.from(b.p.d.buffer))).toBe(true);
  });
  it('chuva e neve: céu fechado, sem estrelas na camada de luz', () => {
    const env = { ...envOf('london', 1970), rain: true, snow: false };
    const { g } = renderSky27({ W: 300, H: 74, env, look: lookOf('london', 1970), seed: 1 });
    let top = 0;
    for (let i = 0; i < 300 * 10; i++) if (g.d[i]) top++;
    expect(top).toBe(0);
  });
  it('assinaturas desviam dos marcos altos da frente', () => {
    expect(Math.abs(sigX27(0.5, 300, [150]) - 150)).toBeGreaterThanOrEqual(16);
    expect(sigX27(0.5, 300, [])).toBe(150);
  });
});

describe('r27 (I2b) desenho de todos os marcos', () => {
  it('qualquer marco de qualquer cidade desenha nos 2 tamanhos de mapa sem erro e com caixa clicável', () => {
    for (const lm of [...LANDMARKS19, ...LMX27]) for (const [W, H] of [[300, 226], [436, 294]]) {
      const y = Math.max(1889, lm.from), p = new Px(W, H), gl = new Px(W, H);
      const box = drawLmIso27(p, gl, lm.id, lm.sh, Math.round(W * 0.4), 84, y, false, 7, lm.city);
      expect(box[2] - box[0], lm.id).toBeGreaterThan(4);
      expect(box[3] - box[1], lm.id).toBeGreaterThan(4);
    }
  });
});
