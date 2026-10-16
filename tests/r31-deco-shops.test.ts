// R31 · DECO-L — lojas de decoração, compra a distância, época/vintage e os seus estabelecimentos (sobre o catálogo e o
// motor da DECO-M). Confere: estoque determinístico pela semente (sem gastar fluxo do jogo), item fora de linha só
// usado (antiquário/leilão), entrega no prazo, mover entre lugares mantém a instância, roubo pelo submundo que já
// existe, explorar não muda o mundo e o interruptor desligado = jogo de hoje (nada no estado, nada no mapa, mesma
// economia).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { rngSnapshot19, STREAMS19 } from '../src/sim/rng19';
import { obj31 } from '../src/sim/r31/object';
import { CO31, ME31 } from '../src/sim/r31/relic31';
import { ownerOf } from '../src/sim/sys/people/owner';
import { CAMPUS_EXTRA28 } from '../src/sim/sys/campus18';
import { places27 } from '../src/sim/sys/place27';
import { underOrgs31 } from '../src/sim/sys/under31';
import { DECO31 } from '../src/data/deco31';
import { decoPlaces31, placeDeco31, whereIs31 } from '../src/sim/r31/deco31';
import {
  DECOL, DECO_SHOPS31, SW_DECO_SHOPS31, buyShop31, checkSets31, decoIn31, decoMine31, decol31, deliverDeco31, inLine31, orderDeco31, outOfLine31,
  peekDecol31, placePub31, rare31, remoteCat31, remoteOpen31, setProgress31, shopRows31, theftDeco31, venueOcc31, vintage31, type DecoShopK31,
} from '../src/sim/r31/decoshop31';

const game = (seed: string, year = 1975, on = true): GameState => {
  const s = createGame(defaultConfig(seed, { startYear: year, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
  if (!on) setSw(s, SW_DECO_SHOPS31, false);
  return s;
};
const rich = (s: GameState): GameState => { ownerOf(s).wealth += 1e9; s.player.cash += 1e9; return s; };
const LOTS = Array.from({ length: 14 }, (_, i) => 40 + i);
const sig = (s: GameState, k: DecoShopK31) => shopRows31(s, k).map((r) => `${r.def.id}@${r.x.made}/${r.x.cond}=${r.price}`).join(',');
/** Primeiro lugar livre de um tipo num lugar decorável. */
const spot = (s: GameState, place: string, slot: string): string => {
  const p = decoPlaces31(s).find((x) => x.key === place)!;
  for (const r of p.rooms) for (const sp of r.spots) if (sp.slot === slot) return `${place}|${r.id}|${sp.id}`;
  throw new Error(`sem ${slot} em ${place}`);
};

describe('r31 DECO-L: estoque do mês pelo motor da vitrine', () => {
  it('determinístico pela semente; troca na virada; não gasta nenhum fluxo do jogo', () => {
    const run = (seed: string) => { const s = game(seed); advanceMonth(s); return s; };
    const a = run('decol-a'), b = run('decol-a'), c = run('decol-c');
    for (const k of DECO_SHOPS31) {
      expect(shopRows31(a, k).length).toBeGreaterThan(0);
      expect(shopRows31(a, k).length).toBeLessThanOrEqual(DECOL.stock);
      expect(sig(a, k)).toBe(sig(b, k));
    }
    expect(DECO_SHOPS31.map((k) => sig(a, k)).join('|')).not.toBe(DECO_SHOPS31.map((k) => sig(c, k)).join('|'));
    expect(Object.keys(STREAMS19).some((x) => x.includes('deco'))).toBe(false);
    // virada: o estoque inteiro troca (o que sobrou volta ao fornecedor e sai do registro)
    const before = shopRows31(a, 'furniture').map((r) => r.obj);
    advanceMonth(a);
    const after = shopRows31(a, 'furniture').map((r) => r.obj);
    expect(after.some((id) => before.includes(id))).toBe(false);
    for (const id of before) expect(obj31(a).objs[id]).toBeUndefined();
  });
  it('cada peça é objeto único com história; a oferta aponta para a instância', () => {
    const s = game('decol-obj'); advanceMonth(s);
    const rows = DECO_SHOPS31.flatMap((k) => shopRows31(s, k));
    expect(new Set(rows.map((r) => r.obj)).size).toBe(rows.length);
    for (const r of rows) {
      expect(obj31(s).objs[r.obj].modelId).toBe(`deco:${r.def.id}`);
      expect(obj31(s).offers[r.offer].objId).toBe(r.obj);
    }
    expect(shopRows31(s, 'antique').every((r) => r.x.prev.length > 0 && r.x.made < s.year)).toBe(true);
  });
});

describe('r31 DECO-L: época — fora de linha só usado', () => {
  it('lojas de novos só vendem o que está em linha; o antiquário vende usado; fora de linha nunca no catálogo', () => {
    for (const y of [1925, 1975, 2015]) {
      const s = game(`decol-era-${y}`, y); advanceMonth(s);
      for (const k of ['furniture', 'hifi', 'gallery'] as const) for (const r of shopRows31(s, k)) { expect(inLine31(r.def, s.year)).toBe(true); expect(r.x.made).toBe(s.year); }
      const ant = shopRows31(s, 'antique');
      expect(ant.length).toBeGreaterThan(0);
      expect(ant.every((r) => r.x.made < s.year && r.x.cond >= 1)).toBe(true);
      expect(ant.some((r) => outOfLine31(r.def, s.year))).toBe(true);
      expect(ant.some((r) => rare31(r.def, s.year))).toBe(false); // peça rara só no leilão
      for (const via of ['mail', 'net'] as const) for (const d of remoteCat31(s, via)) expect(inLine31(d, s.year)).toBe(true);
      const out = DECO31.find((d) => outOfLine31(d, s.year));
      if (out) expect(orderDeco31(rich(s), out.id, 'mail', 'me').ok).toBe(false);
    }
  });
  it('preço vintage sobe a cada ano depois que sai de linha', () => {
    const d = DECO31.find((x) => x.to !== undefined)!;
    expect(vintage31(d, d.to! + 30, d.from)).toBeGreaterThan(vintage31(d, d.to! + 5, d.from));
    expect(vintage31(d, d.to! + 5, d.from)).toBeGreaterThan(1);
    expect(vintage31(d, d.to! - 1, d.from)).toBeLessThan(1);
  });
  it('correio a partir de 1900, internet a partir de 2000', () => {
    expect(remoteOpen31(game('decol-r1', 1895), 'mail')).toBe(false);
    expect(remoteOpen31(game('decol-r2', 1925), 'mail')).toBe(true);
    expect(remoteOpen31(game('decol-r3', 1995), 'net')).toBe(false);
    expect(remoteOpen31(game('decol-r4', 2015), 'net')).toBe(true);
  });
});

describe('r31 DECO-L: compra e entrega', () => {
  it('compra para você (dinheiro pessoal → casa); para a empresa (caixa → sede); acontece uma vez', () => {
    const s = rich(game('decol-buy')); advanceMonth(s);
    const [a, b] = shopRows31(s, 'furniture');
    const w0 = ownerOf(s).wealth, c0 = s.player.cash;
    expect(buyShop31(s, a.offer, 'me').ok).toBe(true);
    expect(ownerOf(s).wealth).toBe(w0 - a.price);
    expect(obj31(s).objs[a.obj].owner).toBe(ME31);
    const wa = whereIs31(s, a.obj);
    if (wa) expect(wa.startsWith('home|')).toBe(true);
    expect(buyShop31(s, b.offer, 'co').ok).toBe(true);
    expect(s.player.cash).toBe(c0 - b.price);
    expect(obj31(s).objs[b.obj].owner).toBe(CO31);
    const wb = whereIs31(s, b.obj);
    if (wb) expect(wb.startsWith('sede|')).toBe(true);
    expect(buyShop31(s, a.offer, 'me').ok).toBe(false);
  });
  it('a entrega chega no prazo: internet na semana seguinte, correio em 3 a 6 semanas', () => {
    const s = rich(game('decol-ord', 2015));
    advanceWeek(s);
    const d = remoteCat31(s, 'net')[0];
    expect(orderDeco31(s, d.id, 'net', 'me').ok).toBe(true);
    expect(orderDeco31(s, d.id, 'mail', 'co').ok).toBe(true);
    const [net, mail] = decol31(s).ord;
    expect(net.due).toBe(s.week + 1);
    expect(mail.due - s.week).toBeGreaterThanOrEqual(DECOL.mail[0]);
    expect(mail.due - s.week).toBeLessThanOrEqual(DECOL.mail[1]);
    const n0 = decoMine31(s).length;
    while (s.week < mail.due) {
      expect(decoMine31(s).length).toBe(n0 + (s.week >= net.due ? 1 : 0));
      advanceWeek(s);
    }
    const mine = decoMine31(s);
    expect(mine.length).toBe(n0 + 2);
    expect(mine.find((m) => m.o.origin === 'net')?.o.owner).toBe(ME31);
    expect(mine.find((m) => m.o.origin === 'mail')?.o.owner).toBe(CO31);
    expect(decol31(s).ord.length).toBe(0);
    expect(deliverDeco31(s)).toBe(0);
  });
});

describe('r31 DECO-L: estabelecimentos, efeito e roubo', () => {
  // uma casa de shows comprada e uma loja do selo de mentira (registro de prédios extras do campus)
  CAMPUS_EXTRA28.push((s) => (s.config.seed.startsWith('decol-pub') ? [
    { id: 've:test_hall', kind: 'venue', name: 'Salão Teste', city: s.config.homeCity, lvl: 2, goto: { area: 'hq' }, kpi: [] },
    { id: 'shop:test', kind: 'store', name: 'Loja do Selo', city: s.config.homeCity, lvl: 1, goto: { area: 'hq' }, kpi: [] },
  ] : []));
  const venueItem = (s: GameState, slot = 'floor') => shopRows31(s, 'furniture').concat(shopRows31(s, 'hifi'), shopRows31(s, 'gallery')).find((r) => r.def.places.includes('venue') && r.def.slots.includes(slot as never))!;
  it('os seus estabelecimentos são lugares do motor da DECO-M; mover mantém a instância', () => {
    const s = rich(game('decol-pub-move')); advanceMonth(s);
    const keys = decoPlaces31(s).map((p) => p.key);
    expect(keys).toContain('venue:b:ve:test_hall');
    expect(keys).toContain('venue:b:shop:test');
    expect(placePub31(s, 'venue:b:ve:test_hall')).toBe(true);
    const r = venueItem(s);
    expect(buyShop31(s, r.offer, 'co').ok).toBe(true);
    const slot = r.def.slots[0];
    expect(placeDeco31(s, r.obj, spot(s, 'venue:b:ve:test_hall', slot)).ok).toBe(true);
    expect(decoIn31(s, 'venue:b:ve:test_hall').map((m) => m.o.id)).toEqual([r.obj]);
    expect(placeDeco31(s, r.obj, spot(s, 'venue:b:shop:test', slot)).ok).toBe(true);
    expect(decoIn31(s, 'venue:b:ve:test_hall').length).toBe(0);
    expect(decoIn31(s, 'venue:b:shop:test').map((m) => m.o.id)).toEqual([r.obj]);
    expect(Object.values(obj31(s).objs).filter((o) => o.id === r.obj).length).toBe(1);
    expect(obj31(s).objs[r.obj].owner).toBe(CO31);
  });
  it('peça em lugar público dá efeito pequeno com teto (público da casa de shows comprada)', () => {
    const s = rich(game('decol-pub-eff', 1985)); advanceMonth(s);
    const crowd = DECO31.find((d) => d.fx?.k === 'crowd' && d.places.includes('venue') && inLine31(d, s.year))!;
    expect(crowd).toBeTruthy();
    expect(orderDeco31(s, crowd.id, 'mail', 'co').ok).toBe(true);
    decol31(s).ord[0].due = s.week; deliverDeco31(s);
    const m = decoMine31(s).find((x) => x.def.id === crowd.id)!;
    expect(venueOcc31(s, 'test_hall')).toBe(0);
    expect(placeDeco31(s, m.o.id, spot(s, 'venue:b:ve:test_hall', crowd.slots[0])).ok).toBe(true);
    expect(venueOcc31(s, 'test_hall')).toBeGreaterThan(0);
    expect(venueOcc31(s, 'test_hall')).toBeLessThanOrEqual(0.05);
  });
  it('roubo usa o submundo que já existe: muda quem está com a peça (facção da cidade), nunca o dono', () => {
    const s = rich(game('decol-pub-theft')); advanceMonth(s);
    const orgs = underOrgs31(s).here;
    expect(orgs.length).toBeGreaterThan(0);
    const r = venueItem(s, 'wall') ?? venueItem(s);
    buyShop31(s, r.offer, 'co');
    placeDeco31(s, r.obj, spot(s, 'venue:b:shop:test', r.def.slots[0]));
    const keep = DECOL.theft; DECOL.theft = 1;
    try { expect(theftDeco31(s)).toEqual([r.obj]); } finally { DECOL.theft = keep; }
    const o = obj31(s).objs[r.obj];
    expect(o.owner).toBe(CO31);
    expect(orgs.some((x) => o.holder === `org:${x.id}`)).toBe(true);
    expect(whereIs31(s, r.obj)).toBeUndefined();
    expect(placeDeco31(s, r.obj, spot(s, 'venue:b:shop:test', r.def.slots[0])).ok).toBe(false);
    // em casa (lugar fechado) não há roubo
    const r2 = shopRows31(s, 'furniture').find((x) => x.def.places.includes('home') && x.offer !== r.offer)!;
    buyShop31(s, r2.offer, 'me');
    if (!whereIs31(s, r2.obj)) placeDeco31(s, r2.obj, spot(s, 'home', r2.def.slots[0]));
    DECOL.theft = 1;
    try { expect(theftDeco31(s)).toEqual([]); } finally { DECOL.theft = keep; }
  });
  it('conjunto completo de uma época vira conquista (uma vez)', () => {
    const s = rich(game('decol-set', 1985));
    for (const d of DECO31.filter((x) => x.style === 'eighties')) {
      const id = `fake-${d.id}`;
      obj31(s).objs[id] = { id, modelId: `deco:${d.id}`, origin: 'test', owner: ME31, holder: ME31, history: [] };
    }
    expect(checkSets31(s)).toEqual(['eighties']);
    expect(checkSets31(s)).toEqual([]);
    expect(setProgress31(s).find((p) => p.style === 'eighties')?.done).toBe(true);
  });
});

describe('r31 DECO-L: explorar não muda o mundo; desligado = igual a hoje', () => {
  it('ler lojas, catálogo, lugares e o mapa não mexe no estado', () => {
    const s = game('decol-look', 2015); advanceMonth(s);
    const before = JSON.stringify(s);
    for (const k of DECO_SHOPS31) shopRows31(s, k);
    remoteCat31(s, 'mail'); remoteCat31(s, 'net'); decoPlaces31(s); decoMine31(s); setProgress31(s);
    const ps = places27(s, LOTS);
    expect(ps.filter((p) => p.deco31).length).toBeGreaterThan(0);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('desligado: sem estoque, sem lojas no mapa, sem lugares extras, compra recusada', () => {
    const s = game('decol-off', 1975, false); advanceMonth(s); advanceMonth(s);
    expect(Object.keys(peekDecol31(s)?.stock ?? {}).length).toBe(0);
    expect(Object.values(obj31(s).objs).some((o) => o.modelId.startsWith('deco:'))).toBe(false);
    expect(places27(s, LOTS).some((p) => p.deco31)).toBe(false);
    expect(decoPlaces31(s).some((p) => p.key.startsWith('venue:b:') || p.key.startsWith('venue:lot:'))).toBe(false);
    expect(DECO_SHOPS31.every((k) => shopRows31(s, k).length === 0)).toBe(true);
    expect(remoteCat31(s, 'mail').length).toBe(0);
    expect(orderDeco31(rich(s), DECO31[0].id, 'mail', 'me').ok).toBe(false);
  });
  it('robôs não compram decoração: ligado e desligado dão a mesma economia (caixa, atos, sorteios)', () => {
    const run = (on: boolean) => {
      const s = createGame(defaultConfig('decol-bot', { startYear: 1975, realNames: true }));
      if (!on) setSw(s, SW_DECO_SHOPS31, false);
      for (let m = 0; m < 4 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
      return { s, k: JSON.stringify({ cash: s.player.cash, acts: Object.keys(s.acts).length, fame: Object.values(s.acts).map((a) => a.fame), rng: rngSnapshot19(s) }) };
    };
    const a = run(true), b = run(false);
    expect(a.k).toBe(b.k);
    expect(decoMine31(a.s).length).toBe(0);
  });
});
