// R31 · DECO-M — motor da decoração: obrigatórios nunca somem; mover mantém a mesma instância; efeitos respeitam o teto;
// desligado = igual a hoje; explorar não muda o mundo; save/carregar mantém a decoração.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { DECO31, DECO_CAP31, DECO_TOTAL_CAP31, REQ31, UPG31, SLOT31 } from '../src/data/deco31';
import {
  buyDeco31, decoFx31, decoOn31, decoPlaces31, decoSane31, deco31, drawer31, placeDeco31, reqKey31, reqLevel31, setReq31, spotKey31, takeDeco31, whereIs31,
} from '../src/sim/r31/deco31';
import { createObj, obj31, steal } from '../src/sim/r31/object';
import { ME31 } from '../src/sim/r31/relic31';
import { setSw } from '../src/sim/r31/switches';
import { hqCaps } from '../src/sim/branches';
import { perk } from '../src/sim/perks';
import { decodeSave20, encodeSave20 } from '../src/core/save20';
import { migrate } from '../src/ui/store';

const game = (y = 1962, seed = 'deco31'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const give = (s: GameState, id: string) => { const r = createObj(s, { modelId: id, origin: 'gift', owner: ME31 }); if (!r.ok) throw new Error(r.why); return r.v.id; };

describe('catálogo', () => {
  it('ids únicos, ~150 decorativos, tamanhos e anos coerentes, 2–4 níveis por obrigatório', () => {
    expect(new Set(DECO31.map((d) => d.id)).size).toBe(DECO31.length);
    expect(DECO31.filter((d) => ['furniture', 'art', 'plant', 'lamp', 'hifi', 'collect'].includes(d.cat)).length).toBeGreaterThanOrEqual(140);
    for (const d of DECO31) {
      expect(d.slots.every((x) => SLOT31.includes(x)), d.id).toBe(true);
      expect(d.to === undefined || d.to > d.from, d.id).toBe(true);
      if (d.fx) expect(d.fx.v).toBeLessThanOrEqual(0.03);
    }
    for (const r of REQ31) { const n = new Set(UPG31.filter((u) => u.req === r.id).map((u) => u.lv)).size; expect(n, r.id).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(4); }
  });
});

describe('motor', () => {
  it('lugares para casa, sede e todos os cômodos; parede/chão/mesa/teto/papel/piso/janela', () => {
    const s = game();
    const ps = decoPlaces31(s);
    expect(ps.some((p) => p.kind === 'home')).toBe(true);
    const sede = ps.find((p) => p.key === 'sede')!;
    expect(sede.rooms.find((r) => r.id === 'office')!.req).toContain('telefone');
    const slots = new Set(ps.flatMap((p) => p.rooms.flatMap((r) => r.spots.map((x) => x.slot))));
    for (const k of ['wall', 'floor', 'desk', 'ceiling', 'paper', 'ground', 'window']) expect(slots.has(k as never), k).toBe(true);
  });

  it('mover mantém a MESMA instância; troca devolve a outra para o lugar de origem', () => {
    const s = game();
    const a = give(s, 'deco:a_gold_lp');
    const b = give(s, 'deco:a_photo_bw');
    const k1 = spotKey31('sede', 'office', 'w1');
    const k2 = spotKey31('sede', 'office', 'w2');
    expect(placeDeco31(s, a, k1).ok).toBe(true);
    expect(placeDeco31(s, b, k2).ok).toBe(true);
    const r = placeDeco31(s, a, k2);
    expect(r).toMatchObject({ ok: true, moved: k1, swapped: b });
    expect(deco31(s).at[k2]).toBe(a);
    expect(deco31(s).at[k1]).toBe(b);
    expect(obj31(s).objs[a].id).toBe(a);
    // para outro lugar (casa): mesma peça
    expect(placeDeco31(s, a, spotKey31('home', 'sala', 'w1')).ok).toBe(true);
    expect(whereIs31(s, a)).toBe(spotKey31('home', 'sala', 'w1'));
    expect(Object.values(obj31(s).objs).filter((o) => o.modelId === 'deco:a_gold_lp').length).toBe(1);
    expect(placeDeco31(s, a, spotKey31('sede', 'office', 'f1'))).toMatchObject({ ok: false, why: 'wrong_slot' });
  });

  it('obrigatórios nunca somem: não saem, só trocam de nível; o nível anterior volta para a gaveta', () => {
    const s = game(1980);
    const k = reqKey31('sede', 'studio', 'mesasom');
    expect(takeDeco31(s, k).ok).toBe(false);
    const u1 = give(s, `upg:${UPG31.find((u) => u.req === 'mesasom' && u.lv === 2)!.id}`);
    const u2 = give(s, `upg:${UPG31.find((u) => u.req === 'mesasom' && u.lv === 3)!.id}`);
    expect(setReq31(s, k, u1).ok).toBe(true);
    expect(reqLevel31(s, k).lv).toBe(2);
    expect(takeDeco31(s, k)).toMatchObject({ ok: false, why: 'req' });
    expect(setReq31(s, k, u2)).toMatchObject({ ok: true, swapped: u1 });
    expect(reqLevel31(s, k).lv).toBe(3);
    expect(drawer31(s).map((o) => o.id)).toContain(u1);
    const tel = give(s, `upg:${UPG31.find((u) => u.req === 'telefone')!.id}`);
    expect(setReq31(s, k, tel)).toMatchObject({ ok: false, why: 'wrong_req' });
    expect(setReq31(s, k, '').ok).toBe(true);
    expect(reqLevel31(s, k).lv).toBe(0);
  });

  it('efeitos respeitam o teto por cômodo e o teto geral, e chegam às funções existentes', () => {
    const s = game(1980);
    const base = { caps: hqCaps(s), stress: perk(s, 'stress'), offer: perk(s, 'offer') };
    const rest = DECO31.filter((d) => d.fx?.k === 'rest' && d.places.includes('home'));
    let i = 0;
    for (const room of ['sala', 'quarto']) for (const sp of decoPlaces31(s)[0].rooms.find((r) => r.id === room)!.spots) {
      const d = rest.find((x, j) => j >= i && x.slots.includes(sp.slot));
      if (!d) continue;
      i = rest.indexOf(d) + 1;
      placeDeco31(s, give(s, `deco:${d.id}`), spotKey31('home', room, sp.id));
    }
    const v = decoFx31(s, 'rest', 'home');
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(2 * DECO_CAP31.rest + 1e-9);
    expect(v).toBeLessThanOrEqual(DECO_TOTAL_CAP31.rest + 1e-9);
    // capacidade na sede: arquivo de nível 3
    const up = give(s, `upg:${UPG31.find((u) => u.req === 'arquivoaco' && u.lv === 3)!.id}`);
    expect(setReq31(s, reqKey31('sede', 'office', 'arquivoaco'), up).ok).toBe(true);
    expect(hqCaps(s).sessions).toBe(base.caps.sessions + 1);
    // prestígio pelo telefone/cofre
    const ph = give(s, `upg:${UPG31.find((u) => u.req === 'mesames' && u.lv === 2)!.id}`);
    setReq31(s, reqKey31('sede', 'office', 'mesames'), ph);
    s.week += 1; // perks em cache por semana
    expect(perk(s, 'stress')).toBeLessThan(base.stress);
    expect(perk(s, 'offer')).toBeGreaterThan(base.offer);
  });

  it('desligado = igual a hoje: sem lugares, sem efeitos; sem peças = efeitos 0', () => {
    const s = game();
    for (const k of ['rest', 'prestige', 'crowd', 'opinion', 'cap', 'rec'] as const) expect(decoFx31(s, k, 'sede') + decoFx31(s, k, 'home') + decoFx31(s, k, 'venue')).toBe(0);
    const a = give(s, 'deco:p_bonsai');
    placeDeco31(s, a, spotKey31('sede', 'office', 'd1'));
    expect(decoFx31(s, 'prestige', 'sede')).toBeGreaterThan(0);
    setSw(s, 'deco31', false);
    expect(decoOn31(s)).toBe(false);
    expect(decoPlaces31(s)).toEqual([]);
    expect(decoFx31(s, 'prestige', 'sede')).toBe(0);
    expect(placeDeco31(s, a, spotKey31('sede', 'office', 'd2'))).toMatchObject({ ok: false, why: 'off' });
  });

  it('explorar não muda o mundo (lugares, gaveta, efeitos são leitura)', () => {
    const s = game();
    const before = JSON.stringify(s);
    decoPlaces31(s); drawer31(s); decoFx31(s, 'rest', 'home'); whereIs31(s, 'ob1'); reqLevel31(s, reqKey31('sede', 'office', 'telefone'));
    expect(JSON.stringify(s)).toBe(before);
  });

  it('peça roubada sai do lugar; compra cobra e cria a peça', () => {
    const s = game(1990);
    const a = give(s, 'deco:h_boombox');
    placeDeco31(s, a, spotKey31('home', 'sala', 'f1'));
    steal(s, a, 'p:ladrao');
    decoSane31(s);
    expect(whereIs31(s, a)).toBeUndefined();
    const w = s.player.cash;
    const r = buyDeco31(s, 'deco:h_cd_micro', 'co');
    expect(r.ok).toBe(true);
    expect(s.player.cash).toBeLessThan(w);
  });

  it('save/carregar mantém a decoração', () => {
    const s = game();
    const a = give(s, 'deco:a_jazz_poster');
    const k = spotKey31('sede', 'office', 'w1');
    placeDeco31(s, a, k);
    const u = give(s, `upg:${UPG31.find((x) => x.req === 'telefone' && x.lv === 2)!.id}`);
    setReq31(s, reqKey31('sede', 'office', 'telefone'), u);
    const t = decodeSave20(encodeSave20(s), migrate);
    expect(deco31(t).at[k]).toBe(a);
    expect(obj31(t).objs[a].modelId).toBe('deco:a_jazz_poster');
    expect(reqLevel31(t, reqKey31('sede', 'office', 'telefone')).lv).toBe(2);
  });
});
