// Rodada 20 (G1) — saves e segurança do turno: envelope versionado + recusa de futuro, limites de importação,
// nuvem com gerações imutáveis (falha em cada escrita mantém a anterior), falha local visível e avanço transacional.

import { describe, expect, it } from 'vitest';
import { cloudLoad17, cloudSave17, memDb17, type DbLike } from '../src/core/cloud17';
import { decodeSave20, encodeSave20, FORMAT20, inflate20, SaveError20, tx20 } from '../src/core/save20';
import { RNG_VERSION19 } from '../src/sim/rng19';
import { defaultConfig } from '../src/sim/bot';
import { SAVE_VERSION, createGame } from '../src/sim/worldgen';
import { health20 } from '../src/ui/savehealth20';
import { importSaveText, listSaves, migrate, saveGame, store } from '../src/ui/store';

const code = async (p: Promise<unknown> | (() => unknown)) => { try { await (typeof p === 'function' ? p() : p); return 'ok'; } catch (e) { return e instanceof SaveError20 ? e.code : String(e); } };
const gz = async (b: Uint8Array) => new Uint8Array(await new Response(new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());

describe('envelope e versões (B6) + importação (B5)', () => {
  const g = createGame(defaultConfig('r20-g1', { startYear: 1975 }));
  it('ida e volta, jogo cru antigo aceito, futuro recusado sem dano', async () => {
    const env = encodeSave20(g);
    expect(env.startsWith(`{"$masters":1,"formatVersion":${FORMAT20},"saveVersion":${SAVE_VERSION},`)).toBe(true);
    const back = decodeSave20(env, migrate);
    expect(back.signature).toBe(g.signature);
    expect(JSON.stringify(back)).toBe(JSON.stringify(migrate(JSON.parse(JSON.stringify(g)))));
    expect((await importSaveText(JSON.stringify(g))).year).toBe(g.year); // formato antigo (jogo cru)
    const fut = [env.replace(`"saveVersion":${SAVE_VERSION}`, `"saveVersion":${SAVE_VERSION + 1}`), env.replace(`"formatVersion":${FORMAT20}`, `"formatVersion":${FORMAT20 + 1}`),
      env.replace(/"rngVersion":\d+/, `"rngVersion":${RNG_VERSION19 + 1}`), JSON.stringify({ ...g, version: SAVE_VERSION + 3 })];
    for (const f of fut) { const copy = f.slice(); expect(await code(() => decodeSave20(f, migrate))).toBe('future'); expect(f).toBe(copy); }
    // r31: sorteio de antes da 31 é recusado com motivo próprio (sem ponte para o formato velho)
    expect(RNG_VERSION19).toBe(31);
    const old = env.replace(/"rngVersion":\d+/, '"rngVersion":19').replace(`"rngVersion":${RNG_VERSION19},`, '"rngVersion":19,');
    expect(await code(() => decodeSave20(old, migrate))).toBe('old31');
  });
  it('estrutura, truncado, profundo e bomba de gzip são recusados', async () => {
    expect(await code(importSaveText('{"a":1}'))).toBe('schema');
    expect(await code(importSaveText(JSON.stringify({ ...g, month: 14 })))).toBe('schema');
    expect(await code(importSaveText(encodeSave20(g).slice(0, 5000)))).toBe('malformed');
    expect(await code(importSaveText('{"a":'.repeat(5000) + '1' + '}'.repeat(5000)))).toBe('malformed');
    const bomb = await gz(new Uint8Array(3 * 1024 * 1024));
    expect(bomb.length).toBeLessThan(64 * 1024);
    expect(await code(inflate20(bomb, 1024 * 1024))).toBe('too_big');
    expect(await inflate20(await gz(new TextEncoder().encode('olá ✓')))).toBe('olá ✓');
  });
});

describe('nuvem: gerações imutáveis (B2)', () => {
  it('falha em cada escrita mantém a geração anterior carregável e idêntica', async () => {
    let x = 7;
    const big = JSON.stringify({ a: Array.from({ length: 60000 }, () => (x = (x * 1103515245 + 12345) % 2147483648).toString(36)) });
    const v2 = big.replace('"a"', '"b"');
    const base = memDb17();
    await cloudSave17(base, 'u', 's-x', big, { name: 'v1', year: 1, label: 'L' });
    let done = 0;
    for (let failAt = 0; failAt < 12 && !done; failAt++) {
      let w = 0;
      const db: DbLike = { ...base, doc: (p) => { const d = base.doc(p); return { ...d, set: async (v) => { if (w++ === failAt) throw Object.assign(new Error('boom'), { code: 'unavailable' }); return d.set(v); } }; } };
      const r = await code(cloudSave17(db, 'u', 's-x', v2, { name: 'v2', year: 2, label: 'L' }));
      const now = await cloudLoad17(base, 'u', 's-x');
      if (r === 'ok') { expect(now).toBe(v2); done = 1; } else expect(now).toBe(big);
    }
    expect(done).toBe(1);
    // nada órfão: só os pedaços da geração publicada
    const meta = [...base.store.entries()].find(([k]) => k.includes('/index/'))![1] as { gen: string; chunks: number };
    expect(meta.chunks).toBeGreaterThan(1);
    expect([...base.store.keys()].filter((k) => k.includes('/saves/s-x/')).length).toBe(meta.chunks);
  });
  it('gravação concorrente que publicou no meio é recusada (conflict) sem estragar a outra', async () => {
    const db = memDb17();
    await cloudSave17(db, 'u', 's-c', '{"v":0}', { name: 'a', year: 1, label: 'L' });
    let sneaked = false;
    // outro aparelho publica o ponteiro enquanto esta gravação ainda escreve pedaços
    const evil: DbLike = { ...db, doc: (p) => { const d = db.doc(p); return { ...d, set: async (v) => {
      await d.set(v);
      if (!sneaked && p.includes('/saves/s-c/')) { sneaked = true; await db.doc('data/users/u/saves/index/s-c').set({ slot: 's-c', gen: 'outro', chunks: 0, layout: 2, name: 'b', year: 9, label: 'L', size: 0, ts: 1 }); }
    } }; } };
    expect(await code(cloudSave17(evil, 'u', 's-c', '{"v":3}', { name: 'a', year: 1, label: 'L' }))).toContain('conflict');
    expect(db.store.get('data/users/u/saves/index/s-c')?.gen).toBe('outro');
    expect([...db.store.keys()].filter((k) => k.includes('/saves/s-c/g')).length).toBe(1); // só a geração v0 (órfã do outro aparelho); nada desta
  });
});

describe('falha local visível (B1) e avanço transacional (B27)', () => {
  it('sem IndexedDB: save falha visível, checkpoint não avança, listagem não vira lista vazia', async () => {
    store.game = createGame(defaultConfig('r20-g1b', { startYear: 1980 }));
    const before = health20.local.lastOk;
    expect(await saveGame('auto')).toBe(false);
    expect(['failed', 'unavailable']).toContain(health20.local.st);
    expect(health20.local.lastOk).toBe(before);
    expect(await code(listSaves())).not.toBe('ok');
    store.game = null;
  });
  it('erro no meio do avanço devolve o estado anterior', () => {
    const g = createGame(defaultConfig('r20-g1c', { startYear: 1980 }));
    const snap = JSON.parse(JSON.stringify(g));
    const r = tx20(g, (x) => { x.player.cash += 999999; x.month = (x.month + 1) % 12; throw new Error('gancho quebrado'); }, (s) => migrate(JSON.parse(s)));
    expect(r.ok).toBe(false);
    expect(r.g.player.cash).toBe(snap.player.cash);
    expect(r.g.month).toBe(snap.month);
    const ok = tx20(g, (x) => x.year, (s) => migrate(JSON.parse(s)));
    expect(ok.ok && ok.r).toBe(g.year);
  });
});
