// Rodada 27 (ACH) — conquistas escondidas e conquistas do perfil.
// (1) o modelo de tela não expõe nada de uma conquista bloqueada (nem nome, nem descrição, nem ícone); secretas só no total;
// (2) desbloquear numa partida grava no perfil (data, partida, ano do jogo); (3) perfis isolados; (4) apagar perfil apaga
// as conquistas dele (apagar save não); (5) determinismo: sincronizar com o perfil não muda a simulação.
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { ACHIEVEMENTS } from '../src/sim/sys/live/achievements';
import { liveOf } from '../src/sim/sys/live/state';
import type { GameState } from '../src/sim/types';
import { achView27, profAch27, profView27, runView27, syncRunAch27 } from '../src/ui/ach27model';

function fakeLocalStorage(): Map<string, string> {
  const m = new Map<string, string>();
  (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() };
  return m;
}
type Req = { result?: unknown; onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void };
function fakeIdb(): Map<string, unknown> {
  const data = new Map<string, unknown>();
  const later = (f: () => void) => setTimeout(f, 0);
  const tx = () => {
    const t: { oncomplete?: () => void; objectStore: () => unknown } = {
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
  return data;
}

/** Estado mínimo com conquistas da partida (semana absoluta de cada uma). */
const fake = (sig: string, ach: Record<string, number>, co = 'Selo Teste'): GameState =>
  ({ signature: sig, year: 1975, config: { companyName: co, startYear: 1970, seed: `seed-${sig}` }, x4: { live: { ach } } }) as unknown as GameState;

const secret = ACHIEVEMENTS.filter((a) => a.hidden);
const plain = ACHIEVEMENTS.filter((a) => !a.hidden);

describe('r27 conquistas escondidas', () => {
  it('R31 (N): bloqueadas comuns aparecem com nome e como ganhar; secretas bloqueadas só como "???"', () => {
    const got = plain[0];
    const v = achView27({ [got.id]: { gy: 1971 } });
    expect(v.items.map((x) => x.id)).toEqual([got.id]);
    expect(v.got).toBe(1);
    expect(v.total).toBe(ACHIEVEMENTS.length);
    expect(v.secretLeft).toBe(secret.length);
    const lockedIds = v.cats.flatMap((c) => c.lockedItems.map((x) => x.id));
    expect(lockedIds.length).toBe(plain.length - 1);
    const dump = JSON.stringify(v);
    for (const a of secret) {
      expect(dump).not.toContain(`"${a.id}"`);
      expect(dump).not.toContain(a.desc.pt);
    }
    // por categoria: bloqueadas comuns + secretas contadas à parte
    expect(v.cats.reduce((n, c) => n + c.locked, 0)).toBe(plain.length - 1);
    expect(v.cats.reduce((n, c) => n + c.secretLocked, 0)).toBe(secret.length);
    expect(secret.length).toBeGreaterThan(0);
  });

  it('secreta desbloqueada aparece (marcada) e sai do total de secretas', () => {
    const sc = secret[0];
    const v = achView27({ [sc.id]: { gy: 1980 } });
    expect(v.items[0]).toMatchObject({ id: sc.id, secret: true });
    expect(v.secretLeft).toBe(secret.length - 1);
  });
});

describe('r27 conquistas do perfil', () => {
  beforeEach(() => { fakeLocalStorage(); fakeIdb(); });

  it('desbloquear grava no perfil com data, partida e ano do jogo', () => {
    const s = fake('run-a', { first_release: 60, top10: 120 });
    const fresh = syncRunAch27(s, 'pA');
    expect(fresh.sort()).toEqual(['first_release', 'top10']);
    const r = profAch27('pA').ach.first_release;
    expect(r.run).toEqual({ co: 'Selo Teste', y0: 1970, seed: 'seed-run-a', sig: 'run-a' });
    expect(r.gy).toBe(1971); // semana 60 de uma partida que começou em 1970
    expect(r.at).toBeGreaterThan(0);
    expect(runView27(s).got).toBe(2);
    // outra partida com a mesma conquista: não duplica, conta a partida
    syncRunAch27(fake('run-b', { first_release: 5 }, 'Outro Selo'), 'pA');
    const r2 = profAch27('pA').ach.first_release;
    expect(r2.run.sig).toBe('run-a'); // o primeiro desbloqueio fica
    expect(r2.sigs).toEqual(['run-a', 'run-b']);
    expect(profView27('pA').got).toBe(2);
  });

  it('perfis isolados: o que um destrava não aparece no outro; o perfil atual decide', async () => {
    const s17 = await import('../src/ui/saves17');
    const ana = s17.addProfile17('Ana'), bia = s17.addProfile17('Bia');
    localStorage.setItem('vtn:profile17', ana.id);
    syncRunAch27(fake('run-ana', { first_release: 10 }));
    localStorage.setItem('vtn:profile17', bia.id);
    expect(profView27().got).toBe(0);
    syncRunAch27(fake('run-bia', { top10: 10, number1: 20 }));
    expect(profView27(bia.id).items.map((x) => x.id).sort()).toEqual(['number1', 'top10']);
    expect(profView27(ana.id).items.map((x) => x.id)).toEqual(['first_release']);
  });

  it('apagar perfil apaga as conquistas dele; apagar save não', async () => {
    const s17 = await import('../src/ui/saves17');
    const { deleteSave } = await import('../src/ui/store');
    const ana = s17.addProfile17('Ana');
    localStorage.setItem('vtn:profile17', ana.id);
    localStorage.setItem(`vtn19.profile:${ana.id}`, JSON.stringify({ runs: [], ach: { 'start:1970': 1975 } }));
    const g = fake('run-x', { first_release: 10 });
    syncRunAch27(g);
    syncRunAch27(fake('run-d', { gold: 10 }), 'default');
    await deleteSave('qualquer-slot');
    expect(profView27(ana.id).got).toBe(1);
    expect((await s17.deleteProfile17(ana.id)).ok).toBe(true);
    expect(profView27(ana.id).got).toBe(0);
    expect(localStorage.getItem(`vtn19.profile:${ana.id}`)).toBeNull();
    expect(profView27('default').got).toBe(1); // o outro perfil fica intacto
    // a mesma partida sincronizada de novo volta a gravar (o cache recomeça)
    expect(syncRunAch27(g, ana.id)).toEqual(['first_release']);
  });
});

describe('r27 conquistas — determinismo', () => {
  beforeEach(() => { fakeLocalStorage(); });
  it('sincronizar com o perfil a cada mês não muda a simulação', () => {
    const run = (sync: boolean) => {
      const s = createGame(defaultConfig('r27-ach-det', { startYear: 1972 }));
      for (let i = 0; i < 4 && !s.ended; i++) {
        advanceMonth(s);
        if (sync) { syncRunAch27(s, 'pDet'); runView27(s); profView27('pDet'); }
      }
      return JSON.stringify(s);
    };
    const a = run(false), b = run(true);
    expect(b).toBe(a);
  });
  it('ler conquistas antes do primeiro mês não cria estado na partida', () => {
    const s = createGame(defaultConfig('r27-ach-ro', { startYear: 1972 }));
    const had = !!(s as unknown as { x4?: { live?: unknown } }).x4?.live;
    const before = JSON.stringify(s);
    syncRunAch27(s, 'pRO'); runView27(s);
    expect(JSON.stringify(s)).toBe(before);
    if (had) expect(Object.keys(liveOf(s).ach)).toBeDefined();
  });
});
