// Rodada 19 (Frente 10, WP-C e WP-D1) — artistas do Oriente Médio, Ásia, Leste Europeu e nórdicos entram em REAL_ALL
// sem duplicar, em quantidade esperada, e exemplos de cada região aparecem no jogo (nomes reais) no ano real.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { PACK as C } from '../src/data/more19/wp_c';
import { PACK as D1 } from '../src/data/more19/wp_d1';
import { norm19 } from '../src/data/more19';
import { REAL_ALL, rw } from '../src/sim/sys/realworld';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';

const all = [...(C.artists ?? []), ...(D1.artists ?? [])];
const byName = (s: GameState, n: string) => Object.values(s.acts).find((a) => a.name === n);

describe('r19 WP-C e WP-D1: artistas', () => {
  it('quantidades e ausência de duplicatas contra a base existente', () => {
    expect(C.artists!.length).toBeGreaterThanOrEqual(85);
    expect(D1.artists!.length).toBeGreaterThanOrEqual(100);
    const names = new Set<string>();
    for (const a of all) { const k = norm19(a.n); expect(names.has(k), a.n).toBe(false); names.add(k); }
    // cada artista do pacote é o próprio registro de REAL_ALL (nenhum foi descartado por já existir)
    for (const a of all) expect(REAL_ALL.find((x) => norm19(x.n) === norm19(a.n)), a.n).toBe(a);
  });
  it('exemplos aparecem no jogo: já ativos no começo e estreando depois', () => {
    const s = createGame(defaultConfig('r19cd', { startYear: 1996, realNames: true, mode: 'historic', history: 'strict', dbSize: 'huge' }));
    const idx = (n: string) => REAL_ALL.findIndex((a) => a.n === n);
    // quem já estreou entra como ato; quem estreia depois fica na fila (estreia real ±2 anos)
    expect(byName(s, 'Omega')?.name).toBe('Omega');
    expect(byName(s, 'Chrisye')?.name).toBe('Chrisye');
    expect(rw(s).upcoming).toContain(idx('Kalush Orchestra'));
    expect(rw(s).upcoming).not.toContain(idx('Omega'));
    expect(byName(s, 'The Hives') || rw(s).upcoming.includes(idx('The Hives'))).toBeTruthy();
  });
});
