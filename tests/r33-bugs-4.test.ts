// R33 · BUGS33 item 4 — cidade → ações de compra (imóvel) e filial, cada uma com a trava certa e o motivo.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen';
import { defaultConfig } from '../src/sim/bot';
import { ownerOf } from '../src/sim/sys/people/owner';
import { setSw } from '../src/sim/r31/switches';
import { homes31 } from '../src/sim/r31/city31';
import { cityBuyActs33, homeLock33, runCityBuy33 } from '../src/sim/r33/cityBuy33';
import { SW_GENTE33 } from '../src/sim/r33/gente33';
import '../src/sim/r33/index';
import type { GameState } from '../src/sim/types';

const mk = (seed: string): GameState => createGame(defaultConfig(seed, { startYear: 1962, homeCity: 'london' }));
const act = (s: GameState, city: string, id: string) => cityBuyActs33(s, city).find((a) => a.id === id);
const rich = (s: GameState) => { s.player.cash += 5_000_000_00; ownerOf(s).wealth += 5_000_000_00; s.player.hq = Math.max(2, s.player.hq); };

describe('BUGS33 item 4 · negócios ao entrar na cidade', () => {
  it('cidade de fora: sempre mostra imóvel e filial; começo da run trava a filial (precisa do Loft)', () => {
    const s = mk('b4-a');
    const xs = cityBuyActs33(s, 'paris').map((a) => a.id);
    expect(xs).toContain('home');
    expect(xs).toContain('branch');
    expect(act(s, 'paris', 'branch')!.dis?.pt).toMatch(/Loft/);
  });

  it('sem dinheiro: a trava diz o motivo e a ação não muda nada', () => {
    const s = mk('b4-b');
    ownerOf(s).wealth = 0;
    s.player.cash = 0;
    expect(homeLock33(s, 'paris')?.pt).toMatch(/Patrimônio pessoal insuficiente/);
    const r = runCityBuy33(s, 'paris', 'home');
    expect(r.ok).toBe(false);
    expect(homes31(s).length).toBe(0);
    expect(runCityBuy33(s, 'paris', 'branch').ok).toBe(false);
    expect(s.branches.length).toBe(0);
  });

  it('com dinheiro e Loft: compra o imóvel e abre a filial; depois as duas aparecem travadas como "já tem"', () => {
    const s = mk('b4-c');
    rich(s);
    expect(act(s, 'paris', 'home')!.dis).toBeUndefined();
    expect(act(s, 'paris', 'branch')!.dis).toBeUndefined();
    expect(runCityBuy33(s, 'paris', 'home').ok).toBe(true);
    expect(runCityBuy33(s, 'paris', 'branch').ok).toBe(true);
    expect(homes31(s).some((h) => h.city === 'paris')).toBe(true);
    expect(s.branches.some((b) => b.city === 'paris')).toBe(true);
    expect(act(s, 'paris', 'home')!.dis?.pt).toMatch(/já tem um imóvel/);
    expect(act(s, 'paris', 'branch')!.dis?.pt).toMatch(/Já existe uma filial/);
    expect(runCityBuy33(s, 'paris', 'branch').ok).toBe(false);
  });

  it('cidade-sede: sem filial (é a matriz) e sem "imóvel fora", com motivo', () => {
    const s = mk('b4-d');
    rich(s);
    expect(act(s, 'london', 'branch')!.dis?.pt).toMatch(/matriz/);
    expect(act(s, 'london', 'home')!.dis?.pt).toMatch(/sua cidade/);
  });

  it('diretor da filial só aparece com o GENTE33 ligado e depois de abrir a filial', () => {
    const s = mk('b4-e');
    rich(s);
    expect(act(s, 'paris', 'dir')).toBeUndefined();
    runCityBuy33(s, 'paris', 'branch');
    setSw(s, SW_GENTE33, false);
    expect(act(s, 'paris', 'dir')).toBeUndefined();
    setSw(s, SW_GENTE33, true);
    expect(act(s, 'paris', 'dir')).toBeDefined();
    expect(act(s, 'rome', 'dir')).toBeUndefined();
  });
});
