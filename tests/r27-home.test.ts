// Rodada 27 — tela inicial e Nova run rápida.
// (1) a Nova run rápida produz a MESMA RunConfig que a configuração completa produz com as mesmas escolhas;
// (2) essa configuração gera um jogo válido pelo mesmo preparo (buildRun27);
// (3) apagar save e apagar perfil (movendo ou apagando os saves) funcionam sem tocar nos saves dos outros perfis.
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (como nos outros testes)
import { newRunConfig20 } from '../src/sim/start17';
import { roleFromMain } from '../src/sim/sys/careers12';
import type { RunConfig } from '../src/sim/types';
import { applyQuick27, buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27, type QuickRun27 } from '../src/ui/ps/home27model';

/** O que a configuração completa faz com o rascunho: nasce da fábrica, os cartões aplicam seus padrões ao serem
 *  desenhados e cada controle muda o seu campo (como os handlers de newgame.ts / careers12 / newgame17). */
function fullFlow(seed: string, name: string, edits: Partial<QuickRun27>): RunConfig {
  const cfg = draftDefaults27(newRunConfig20({ seed, companyName: name }));
  if (edits.companyName !== undefined) cfg.companyName = edits.companyName || 'Selo';
  if (edits.startYear !== undefined) cfg.startYear = edits.startYear; // campo de ano exato
  if (edits.homeCity !== undefined) cfg.homeCity = edits.homeCity; // lista de cidades
  if (edits.career !== undefined && edits.career !== 'label') {
    // marcar a atividade e desmarcar "Gravadora" no cartão de atividades
    const c = cfg.careers!;
    c.main = [...c.main, edits.career];
    c.main = c.main.filter((x) => x !== 'label');
    cfg.role = roleFromMain(c.main);
  }
  if (edits.scenario !== undefined) cfg.scenario = edits.scenario; // cartão "Ponto de partida"
  if (edits.difficulty !== undefined) cfg.difficulty = edits.difficulty; // cartões de dificuldade
  return draftDefaults27(cfg); // o bloco da banda e os cartões se redesenham depois de cada mudança
}

describe('r27 Nova run rápida', () => {
  it('sem mexer em nada: igual ao rascunho padrão da configuração completa', () => {
    const q = quickDefaults27('r27-a', 'Selo Agulha');
    expect(quickRunConfig27(q)).toEqual(fullFlow('r27-a', 'Selo Agulha', {}));
    expect(q.career).toBe('label');
  });

  it('com escolhas: mesma RunConfig da configuração completa para as mesmas escolhas', () => {
    const cases: Partial<QuickRun27>[] = [
      { companyName: 'Selo Aguha', startYear: 2004, homeCity: 'sao_paulo', career: 'musician', scenario: 'established', difficulty: 'hard' },
      { startYear: 1975, homeCity: 'rio', career: 'manager', scenario: 'emerging', difficulty: 'easy' },
      { startYear: 2012, career: 'platform' },
      { startYear: 1930, career: 'studio' },
    ];
    for (const e of cases) {
      const q = { ...quickDefaults27('r27-b', 'Selo'), ...e };
      expect(quickRunConfig27(q)).toEqual(fullFlow('r27-b', 'Selo', e));
    }
  });

  it('atividade fora da época volta para Gravadora; ano fora da faixa é limitado', () => {
    const q = { ...quickDefaults27('r27-c', 'X'), startYear: 1962, career: 'platform' };
    const c = quickRunConfig27(q);
    expect(c.careers!.main).toEqual(['label']);
    expect(c.role).toBe('label');
    expect(quickRunConfig27({ ...q, startYear: 99999 }).startYear).toBeLessThanOrEqual(2100);
  });

  it('aplicar de novo é idempotente e "Configuração completa" recebe o rascunho pronto', () => {
    const q = { ...quickDefaults27('r27-d', 'Selo'), startYear: 1990, career: 'musician' };
    const a = quickRunConfig27(q);
    const b = applyQuick27(JSON.parse(JSON.stringify(a)) as RunConfig, q);
    expect(b).toEqual(a);
    expect(draftDefaults27(JSON.parse(JSON.stringify(a)) as RunConfig)).toEqual(a);
  });

  it('gera um jogo válido pelo mesmo preparo da configuração completa', () => {
    const q: QuickRun27 = { ...quickDefaults27('r27-e', 'Selo Aguha'), startYear: 2004, homeCity: 'sao_paulo', career: 'musician', scenario: 'emerging', difficulty: 'normal' };
    const run = buildRun27(quickRunConfig27(q));
    expect(run.labels?.ids?.length).toBeGreaterThan(0); // sugestão de gravadoras materializada
    const s = createGame(run);
    expect(s.year).toBe(2004);
    expect(s.config.homeCity).toBe('sao_paulo');
    expect(s.config.role).toBe('artist');
    expect(s.config.companyName).toBe('Selo Aguha');
    expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
  });
});

// ---------------------------------------------------------------- saves e perfis (IndexedDB e localStorage falsos)

type Req = { result?: unknown; error?: unknown; onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void };
function fakeIdb(): { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  const later = (f: () => void) => setTimeout(f, 0);
  const tx = () => {
    const t: { oncomplete?: () => void; onerror?: () => void; onabort?: () => void; objectStore: () => unknown } = {
      objectStore: () => {
        const op = (f: () => unknown): Req => { const r: Req = {}; later(() => { r.result = f(); r.onsuccess?.(); }); return r; };
        return {
          get: (k: string) => op(() => structuredClone(data.get(k))),
          put: (v: unknown, k: string) => op(() => { data.set(k, structuredClone(v)); }),
          delete: (k: string) => op(() => { data.delete(k); }),
          getAll: () => op(() => [...data.values()].map((v) => structuredClone(v))),
        };
      },
    };
    later(() => later(() => t.oncomplete?.()));
    return t;
  };
  const db = { transaction: tx, createObjectStore: () => ({}) };
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = { open: () => { const r: Req = { result: db }; later(() => { r.onupgradeneeded?.(); r.onsuccess?.(); }); return r; } };
  return { data };
}
function fakeLocalStorage(): void {
  const m = new Map<string, string>();
  (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() };
}
const meta = (slot: string, profile: string) => ({ meta: { slot, signature: `sig-${slot}`, company: `C-${slot}`, year: 1970, month: 0, role: 'label', savedAt: Date.now(), version: 1, profile, kind: 'manual' }, payload: 'x' });

describe('r27 apagar save e perfil', () => {
  let idb: { data: Map<string, unknown> };
  beforeEach(() => { idb = fakeIdb(); fakeLocalStorage(); });

  it('apagar save tira só aquele slot', async () => {
    const { deleteSave, listSaves } = await import('../src/ui/store');
    idb.data.set('a', meta('a', 'default'));
    idb.data.set('b', meta('b', 'default'));
    await deleteSave('a');
    expect((await listSaves()).map((m) => m.slot)).toEqual(['b']);
  });

  it('apagar perfil move os saves para o padrão (ou apaga junto) e não mexe nos outros perfis', async () => {
    const s17 = await import('../src/ui/saves17');
    const { listSaves, profileId17 } = await import('../src/ui/store');
    const ana = s17.addProfile17('Ana');
    const bia = s17.addProfile17('Bia');
    localStorage.setItem('vtn:profile17', ana.id);
    idb.data.set('a1', meta('a1', ana.id));
    idb.data.set('a2', meta('a2', ana.id));
    idb.data.set('b1', meta('b1', bia.id));
    idb.data.set('d1', meta('d1', 'default'));

    expect((await s17.deleteProfile17('default')).ok).toBe(false); // o padrão não sai
    const r = await s17.deleteProfile17(ana.id);
    expect(r).toEqual({ ok: true, saves: 2 });
    expect(s17.profiles17().map((p) => p.id)).toEqual(['default', bia.id]);
    expect(profileId17()).toBe('default'); // era o perfil atual: volta ao padrão
    const after = await listSaves();
    expect(after.map((m) => m.slot).sort()).toEqual(['a1', 'a2', 'b1', 'd1']);
    expect(after.filter((m) => m.profile === 'default').map((m) => m.slot).sort()).toEqual(['a1', 'a2', 'd1']);

    const r2 = await s17.deleteProfile17(bia.id, true);
    expect(r2).toEqual({ ok: true, saves: 1 });
    expect((await listSaves()).map((m) => m.slot).sort()).toEqual(['a1', 'a2', 'd1']);
    expect(s17.profiles17().map((p) => p.id)).toEqual(['default']);
  });

  it('renomear perfil', async () => {
    const s17 = await import('../src/ui/saves17');
    s17.renameProfile17('default', 'Gian');
    expect(s17.profiles17()[0].name).toBe('Gian');
  });
});
