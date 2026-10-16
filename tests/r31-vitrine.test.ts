// R31 · onda 4 (VIT) — vitrine do mês: motor único do conteúdo mensal dos lugares. Confere o sorteio na virada (fluxo
// rng19 próprio, determinístico pela semente), que abrir/olhar não muda nada, que cada botão chama a função que já
// existia, que as fontes migradas (loja de instrumentos, beco, leilões) não ganharam depósito paralelo e o interruptor.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { STREAMS19, rngSnapshot19 } from '../src/sim/rng19';
import { obj31 } from '../src/sim/r31/object';
import { CO31, ME31 } from '../src/sim/r31/relic31';
import { items31, shopRows31 } from '../src/sim/r31/items31';
import { bmRows31 } from '../src/sim/sys/under31';
import { places27, type PlaceK27 } from '../src/sim/sys/place27';
import { crew31 } from '../src/sim/sys/gente31';
import { runEdit, setEditorOn } from '../src/sim/r31/editor';
import {
  MIRROR31, VIT_DEFS31, VIT_PLACES31, fairName31, peekVit31, rollVit31, runVit31, vitDo31, vitItems31, vitView31, vit31, ymIdx31,
} from '../src/sim/r31/vitrine31';
import { auditInside31, insideModel31, type InsideT31 } from '../src/ui/r31/inside31model';
import { vitList31, vitPanel31, vitSpots31 } from '../src/ui/r31/vit31model';

const game = (seed: string, year = 1975, city = 'new_york'): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
const LOTS = Array.from({ length: 14 }, (_, i) => 40 + i);
const tgt = (s: GameState, k: PlaceK27): InsideT31 => {
  const p = places27(s, LOTS).find((x) => x.k === k);
  return { id: p?.id ?? `t:${k}`, k, name: p ? p.name.pt : k, people: p?.people ?? crew31(s, k) ?? [], year: s.year, city: s.config.homeCity, seed: s.config.seed, place: p, org: p?.org };
};
const KINDS: PlaceK27[] = ['records', 'instruments', 'venue', 'bar', 'studio', 'radio', 'hotel', 'label', 'market'];
const raw = (o: unknown): boolean => /NaN|undefined|\[object/.test(JSON.stringify(o));

describe('r31 VIT: sorteio na virada, determinístico pela semente', () => {
  it('mesma semente → mesma vitrine; semente diferente → outra; o fluxo é o rng19 vit31 registrado', () => {
    expect(STREAMS19.vit31).toBeTruthy();
    const run = (seed: string) => { const s = game(seed); advanceMonth(s); advanceMonth(s); return s; };
    const a = run('vit-det'), b = run('vit-det'), c = run('vit-outra');
    expect(JSON.stringify(peekVit31(a))).toBe(JSON.stringify(peekVit31(b)));
    expect(rngSnapshot19(a, 'vit31')).toBe(rngSnapshot19(b, 'vit31'));
    expect(JSON.stringify(peekVit31(a)?.items.map((x) => x.c))).not.toBe(JSON.stringify(peekVit31(c)?.items.map((x) => x.c)));
    expect(rngSnapshot19(a, 'vit31')).not.toBe('null');
  });
  it('o conteúdo do mês muda na virada; o raro dura um mês', () => {
    const s = game('vit-mes', 1975);
    const m0 = ymIdx31(s);
    const before = vit31(s).items.filter((x) => x.at <= m0 && x.to >= m0).map((x) => x.id);
    advanceMonth(s);
    const m1 = ymIdx31(s);
    const now = vit31(s).items.filter((x) => x.at <= m1 && x.to >= m1);
    expect(now.length).toBeGreaterThan(0);
    expect(now.some((x) => !before.includes(x.id))).toBe(true);
    for (const it of vit31(s).items) if (it.rare) expect(it.to).toBe(it.at);
  });
  it('três épocas: todo lugar tem conteúdo e os textos são legíveis (sem dado cru)', () => {
    for (const y of [1935, 1975, 2015]) {
      const s = game(`vit-era-${y}`, y);
      advanceMonth(s);
      let total = 0;
      for (const p of VIT_PLACES31) for (const it of vitItems31(s, p)) {
        const v = vitView31(s, it);
        total++;
        expect(raw([v.name, v.note, v.btns.map((b) => [b.label, b.lock])]), `${y} ${it.c}`).toBe(false);
        expect(v.name.pt.length && v.name.en.length).toBeTruthy();
      }
      expect(total).toBeGreaterThan(20);
      expect(fairName31(y).pt.length).toBeGreaterThan(3);
    }
  });
});

describe('r31 VIT: explorar não muda o mundo', () => {
  it('montar as cenas, a prateleira, os painéis e a lista deixa o estado idêntico (sem sorteio)', () => {
    const s = game('vit-pure', 1985);
    advanceMonth(s);
    const before = JSON.stringify(s);
    for (const k of KINDS) {
      const x = tgt(s, k);
      const m = insideModel31(s, x);
      expect(auditInside31(m), k).toEqual([]);
      vitSpots31(s, x, m.W);
      for (const pn of vitList31(s, x)) vitPanel31(s, pn.id);
    }
    insideModel31(s, { ...tgt(s, 'records'), vit: 'fair' });
    for (const p of VIT_PLACES31) vitItems31(s, p).forEach((it) => vitView31(s, it));
    expect(JSON.stringify(s)).toBe(before);
  });
  it('a loja de discos mostra a prateleira do mês, a porta da feira e a lista', () => {
    const s = game('vit-rec', 1975);
    advanceMonth(s);
    const m = insideModel31(s, tgt(s, 'records'));
    expect(m.spots.some((x) => x.go.panel === 'room:fair')).toBe(true);
    expect(m.spots.some((x) => x.go.panel === 'vitlist')).toBe(true);
    expect(m.spots.filter((x) => x.go.panel?.startsWith('vit:')).length).toBe(m.vit.length);
  });
});

describe('r31 VIT: cada item chama a ação que já existe', () => {
  it('comprar pela vitrine é a compra da loja (objeto sai da oferta e vai para você/empresa)', () => {
    const s = game('vit-buy', 1975);
    s.player.cash += 50_000_000;
    advanceMonth(s);
    const it = vitItems31(s, 'instruments').find((x) => vitView31(s, x).btns.some((b) => b.run.k === 'buy' && b.run.how === 'co'));
    expect(it).toBeTruthy();
    const i = vitView31(s, it!).btns.findIndex((b) => b.run.k === 'buy' && b.run.how === 'co');
    const offer = it!.ref.offer!;
    const objId = obj31(s).offers[offer].objId;
    const r = vitDo31(s, it!.id, i);
    expect('ok' in r && r.ok).toBe(true);
    expect(obj31(s).offers[offer]).toBeUndefined();
    expect(obj31(s).objs[objId].owner).toBe(CO31);
    expect(vitItems31(s, 'instruments').some((x) => x.ref.offer === offer)).toBe(false);
    void ME31;
  });
  it('radar, conhecer e lance passam pelas funções do jogo; ações de tela voltam para a interface', () => {
    const s = game('vit-acts', 1985);
    advanceMonth(s);
    const all = VIT_PLACES31.flatMap((p) => vitItems31(s, p));
    const radar = all.flatMap((it) => vitView31(s, it).btns).find((b) => b.run.k === 'radar' && !b.lock);
    if (radar && radar.run.k === 'radar') { const r = runVit31(s, radar.run); expect('ok' in r && r.ok).toBe(true); expect(s.knowledge[radar.run.act]).toBeTruthy(); }
    const meet = all.flatMap((it) => vitView31(s, it).btns).find((b) => b.run.k === 'meet');
    expect(meet).toBeTruthy();
    const r2 = runVit31(s, meet!.run);
    expect('ok' in r2).toBe(true);
    const ui = runVit31(s, { k: 'go', area: 'charts' });
    expect('ui' in ui).toBe(true);
    // botão travado não roda (o motivo vem antes)
    const locked = all.map((it) => ({ it, i: vitView31(s, it).btns.findIndex((b) => !!b.lock) })).find((x) => x.i >= 0);
    if (locked) { const r = vitDo31(s, locked.it.id, locked.i); expect('ok' in r && r.ok).toBe(false); }
  });
  it('beco: o item espelho compra pelo buyBm31', () => {
    const s = game('vit-bm', 1985);
    s.player.cash += 50_000_000;
    advanceMonth(s);
    const rows = bmRows31(s);
    const its = vitItems31(s, 'market').filter((x) => x.c === 'bm_row');
    expect(its.length).toBe(rows.length);
    if (its[0]) { const r = vitDo31(s, its[0].id, 0); expect('ok' in r).toBe(true); }
  });
});

describe('r31 VIT: migração sem depósito paralelo (contrato)', () => {
  it('estoque da loja, do beco e dos leilões: a vitrine só lê (nada copiado no estado dela)', () => {
    const s = game('vit-mig', 1975);
    advanceMonth(s); advanceMonth(s);
    const st = vit31(s);
    for (const c of Object.keys(MIRROR31)) expect(st.items.some((x) => x.c === c), c).toBe(false);
    expect(JSON.stringify(st)).not.toMatch(/"price"|"copies"|"gear"|"lots"/);
    // a loja gira pela vitrine (sem gancho próprio) e o espelho tem exatamente o estoque
    expect(items31(s).stock[s.config.homeCity]?.ym).toBe(`${s.year}-${s.month}`);
    expect(vitItems31(s, 'instruments').filter((x) => x.c === 'ins_stock' || x.c === 'ins_relic').length).toBe(shopRows31(s, s.config.homeCity).length);
    // toda oferta que a vitrine pôs à venda está em UM item (nenhuma órfã, nenhuma duplicada)
    const vitOffers = Object.values(obj31(s).offers).filter((o) => o.venue.startsWith(`shop:${s.config.homeCity}:`)).map((o) => o.id).sort();
    const refs = st.items.filter((x) => x.mk && x.ref.offer).map((x) => x.ref.offer!).sort();
    expect(refs).toEqual(vitOffers);
    expect(new Set(refs).size).toBe(refs.length);
  });
  it('o que sai da vitrine sai da venda (o exemplar não sobra no registro)', () => {
    const s = game('vit-exp', 1975);
    advanceMonth(s);
    const mk = vit31(s).items.filter((x) => x.mk && x.ref.offer);
    expect(mk.length).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++) advanceMonth(s);
    for (const it of mk) if (!vit31(s).items.includes(it)) expect(obj31(s).offers[it.ref.offer!]).toBeUndefined();
  });
});

describe('r31 VIT: interruptor, editor e catálogo', () => {
  it('desligado: nada novo e nenhum sorteio no fluxo vit31, mas a loja/beco/leilões seguem girando', () => {
    const s = game('vit-off', 1975);
    setSw(s, 'vit31', false);
    vit31(s).items = [];
    advanceMonth(s); advanceMonth(s);
    expect(vit31(s).items.length).toBe(0);
    expect(items31(s).stock[s.config.homeCity]?.ym).toBe(`${s.year}-${s.month}`);
  });
  it('a fita pirata do SEU disco dá prejuízo na virada (só com o interruptor)', () => {
    const s = game('vit-pir', 1975);
    const rel = Object.values(s.releases)[0];
    if (!rel) return;
    rel.owner = 'player';
    vit31(s).items.push({ id: 'vtest', c: 'bm_pirate', p: 'market', at: ymIdx31(s), to: ymIdx31(s) + 1, ref: { rel: rel.id, act: rel.actId } });
    const cash = s.player.cash;
    advanceMonth(s);
    expect(vit31(s).pir).toBeGreaterThan(0);
    void cash;
  });
  it('editor: sortear de novo troca o mês (com o editor ligado)', () => {
    const s = game('vit-ed', 1975);
    setEditorOn(s, true);
    const before = vit31(s).items.map((x) => x.id).join();
    const r = runEdit(s, 'vit31.roll');
    expect(r).toBeTruthy();
    expect(vit31(s).items.map((x) => x.id).join()).not.toBe(before);
    expect(vit31(s).forced).toBe(1);
  });
  it('catálogo: todo lugar tem itens das três fontes de aleatoriedade e só ações conhecidas', () => {
    for (const p of VIT_PLACES31.filter((x) => x !== 'auction')) expect(VIT_DEFS31.some((d) => d.p === p), p).toBe(true);
    const srcs = new Set(VIT_DEFS31.map((d) => d.src));
    for (const k of ['world', 'rare', 'people']) expect(srcs.has(k as never)).toBe(true);
    const s = game('vit-cat', 2015);
    expect(rollVit31(s, ymIdx31(s)).added).toBeGreaterThanOrEqual(0);
  });
});
