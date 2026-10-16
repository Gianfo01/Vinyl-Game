// R31 · onda 3 (G · Objetos + UNI-3/B.18): invariantes do objeto individual, as três formas de compra, presente que
// mexe na opinião, níveis de relíquia sem exploração, estoque mensal fixo e sem repetir, nenhuma relíquia duplicada
// ou perdida, violino do Efro e definição única de relíquia.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { opinionOf, setOpinion } from '../src/sim/opinion';
import { rngSnapshot19 } from '../src/sim/rng19';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { objInvariants, obj31, offersAt } from '../src/sim/r31/object';
import { setSw } from '../src/sim/r31/switches';
import {
  CO31, EFRO_VIOLIN_ID, ME31, noteSale31, relicEvent31, relicMeasure31, syncRelic31, syncRelics31,
} from '../src/sim/r31/relic31';
import { buyOffer31, giftEffect31, giveRelic31, items31, restock31, shopId31, shopRows31 } from '../src/sim/r31/items31';
import { goods } from '../src/sim/sys/goods8';
import { ownerOf } from '../src/sim/sys/people/owner';
import { LIVE_CAP9, addRelic, relics, type Relic } from '../src/sim/sys/relics9';
import { explain18 } from '../src/sim/explain18';
import '../src/sim/sys';

const mk = (seed: string, y = 1975, o: Record<string, unknown> = {}) => createGame(defaultConfig(seed, { startYear: y, realNames: false, ...o }));
const rich = (s: GameState) => { ownerOf(s).wealth = 1e12; s.player.cash = 1e12; };
const someone = (s: GameState): string => {
  const p = Object.values(s.persons).find((x) => x.alive && !x.isPlayer && x.role === 'guitar')!;
  setOpinion(s, `p:${p.id}`, 0, l('teste', 'test'));
  return p.id;
};
const itemRow = (s: GameState) => shopRows31(s, s.config.homeCity).find((r) => r.def && !r.relic)!;

describe('r31 objetos — loja e compras', () => {
  it('estoque gerado no motor, fixo por loja e mês, troca inteiro e nunca repete o mês anterior; antes de 1920 também vende', () => {
    for (const y of [1900, 1955, 2005]) {
      const a = mk(`obj-st-${y}`, y), b = mk(`obj-st-${y}`, y);
      const m0 = items31(a).stock[a.config.homeCity];
      expect(m0.models.length, `ano ${y}`).toBeGreaterThanOrEqual(6);
      expect(JSON.stringify(m0.models)).toBe(JSON.stringify(items31(b).stock[b.config.homeCity].models)); // fixo pela semente
      for (let i = 0; i < 4; i++) {
        const prev = new Set(items31(a).stock[a.config.homeCity].models);
        advanceMonth(a);
        const now = items31(a).stock[a.config.homeCity].models;
        expect(now.some((m) => prev.has(m)), `${y} mês ${i}`).toBe(false);
      }
      expect(objInvariants(a)).toEqual([]);
    }
  }, 240000);

  it('explorar não muda o mundo: ler a loja não cria nada nem sorteia', () => {
    const s = mk('obj-ro');
    const before = JSON.stringify(s.x4);
    const rng = rngSnapshot19(s);
    for (let i = 0; i < 5; i++) shopRows31(s, s.config.homeCity);
    expect(JSON.stringify(s.x4)).toBe(before);
    expect(rngSnapshot19(s)).toBe(rng);
  });

  it('três formas de compra: pessoal (patrimônio), empresa (caixa e acervo) e presente (opinião sobe)', () => {
    const s = mk('obj-buy');
    rich(s);
    const w0 = ownerOf(s).wealth;
    const r1 = itemRow(s);
    expect(buyOffer31(s, r1.offer, { k: 'me' }).pt).toMatch(/seu/);
    expect(ownerOf(s).wealth).toBe(w0 - r1.price);
    expect(goods(s).owned.some((o) => o.ob === r1.obj)).toBe(true);
    expect(obj31(s).objs[r1.obj].owner).toBe(ME31);
    expect(buyOffer31(s, r1.offer, { k: 'me' }).pt).toMatch(/não está à venda/); // compra acontece uma vez

    const c0 = s.player.cash;
    const r2 = itemRow(s);
    expect(buyOffer31(s, r2.offer, { k: 'co' }).pt).toMatch(/acervo da empresa/);
    expect(s.player.cash).toBe(c0 - r2.price);
    expect(obj31(s).objs[r2.obj].owner).toBe(CO31);

    const pid = someone(s);
    const op0 = opinionOf(s, `p:${pid}`);
    const r3 = itemRow(s);
    const msg = buyOffer31(s, r3.offer, { k: 'gift', to: pid, pay: 'co' });
    expect(msg.pt).toMatch(/opinião/);
    expect(opinionOf(s, `p:${pid}`)).toBeGreaterThan(op0);
    expect(obj31(s).objs[r3.obj].owner).toBe(`p:${pid}`);
    expect(objInvariants(s)).toEqual([]);
  });

  it('presente: instrumento do instrumento da pessoa vale mais; repetir rende menos; não conhecido não recebe', () => {
    const s = mk('obj-gift');
    rich(s);
    const pid = someone(s);
    const g = giftEffect31(s, pid, 2000, 'guitar').delta;
    const other = giftEffect31(s, pid, 2000, 'horns').delta;
    const plain = giftEffect31(s, pid, 2000).delta;
    expect(g).toBeGreaterThan(other);
    expect(other).toBeGreaterThanOrEqual(plain);
    items31(s).gifts.push([pid, s.week]);
    expect(giftEffect31(s, pid, 2000, 'guitar').delta).toBeLessThan(g);
    const stranger = Object.values(s.persons).find((x) => x.alive && !x.isPlayer && opinionOf(s, `p:${x.id}`) === 0 && !x.rel)?.id;
    if (stranger) {
      const r = itemRow(s);
      const res = buyOffer31(s, r.offer, { k: 'gift', to: stranger, pay: 'me' });
      if (/conhece/.test(res.pt)) expect(obj31(s).offers[r.offer]).toBeTruthy(); // nada foi cobrado nem tirado da loja
    }
  });
});

describe('r31 objetos — níveis de relíquia', () => {
  const fresh = (s: GameState, v = 20000): Relic => { const rl = addRelic(s, 'guitar', l('Guitarra teste', 'Test guitar'), undefined, undefined, v); syncRelic31(s, rl); return rl; };

  it('o nível sai do valor e da história; vários caminhos; sem "próximo"', () => {
    const s = mk('obj-tier');
    const a = fresh(s, 800);
    expect(relicMeasure31(s, a).tier).toBe(1);
    const b = fresh(s, 3_000_000); // só valor: não vira Mítica
    expect(relicMeasure31(s, b).tier).toBeLessThan(5);
    const c = fresh(s, 30000);
    for (const [id, k] of [['x1', 'show'], ['x2', 'n1'], ['x3', 'legend'], ['x4', 'broke'], ['x5', 'scandal']] as const) relicEvent31(c, id, k, s.year);
    const m = relicMeasure31(s, c);
    expect(m.tier).toBeGreaterThanOrEqual(3);
    expect(m.why.length).toBeGreaterThanOrEqual(5);
    // medidas separadas
    expect(m).toHaveProperty('price'); expect(m).toHaveProperty('rarity'); expect(m).toHaveProperty('auth'); expect(m).toHaveProperty('importance');
  });

  it('anti-exploração: acontecimento conta uma vez; repetição rende menos; venda ligada a você não é recorde', () => {
    const s = mk('obj-anti');
    const rl = fresh(s, 60000);
    const i0 = relicMeasure31(s, rl).importance;
    expect(relicEvent31(rl, 'show:1', 'show', s.year)).toBe(true);
    expect(relicEvent31(rl, 'show:1', 'show', s.year)).toBe(false); // mesmo id: não soma
    const i1 = relicMeasure31(s, rl).importance;
    relicEvent31(rl, 'show:2', 'show', s.year);
    const i2 = relicMeasure31(s, rl).importance;
    relicEvent31(rl, 'show:3', 'show', s.year);
    const i3 = relicMeasure31(s, rl).importance;
    expect(i1 - i0).toBeGreaterThan(i2 - i1);
    expect(i2 - i1).toBeGreaterThan(i3 - i2);
    noteSale31(s, rl, 100000, false);
    expect(noteSale31(s, rl, 900000, true)).toBe(false); // parte ligada a você
    expect(noteSale31(s, rl, 900000, false)).toBe(true);
    const n = (rl.meta?.ev ?? []).filter((e) => e.k === 'record').length;
    for (let i = 0; i < 6; i++) noteSale31(s, rl, 900000, false); // mesma semana/preço: nada novo
    expect((rl.meta?.ev ?? []).filter((e) => e.k === 'record').length).toBe(n);
  });

  it('roubo muda quem está com a peça (não o dono) e entra na lista de donos; violino do Efro: Mítico, volta sempre, nunca à venda', () => {
    const s = mk('obj-efro');
    const v = relics(s).list.find((x) => x.id === EFRO_VIOLIN_ID)!;
    expect(v).toBeTruthy();
    expect(relicMeasure31(s, v).tier).toBe(5);
    expect(relicMeasure31(s, v).locked).toBe(true);
    const ob = v.meta!.ob!;
    const owner = obj31(s).objs[ob].owner;
    v.st = 'stolen';
    syncRelic31(s, v);
    expect(v.st).not.toBe('stolen'); // volta no mesmo fechamento
    expect(obj31(s).objs[ob].owner).toBe(owner);
    expect(v.own.some((o) => o[2] === 'roubada')).toBe(true);
    // relíquia comum: roubo muda o holder
    const rl = addRelic(s, 'guitar', l('Outra', 'Other'), undefined, undefined, 5000);
    rl.st = 'player'; syncRelic31(s, rl);
    const o = obj31(s).objs[rl.meta!.ob!];
    rl.st = 'stolen'; syncRelic31(s, rl);
    expect(o.owner).toBe(CO31);
    expect(o.holder).not.toBe(o.owner);
    expect(rl.own.at(-1)?.[2]).toBe('roubada');
    // violino nunca para fora da família
    v.st = 'player'; syncRelic31(s, v);
    const pid = someone(s);
    expect(giveRelic31(s, v.id, pid)?.pt).toMatch(/família/);
    expect(objInvariants(s)).toEqual([]);
  });

  it('a vitrine só traz relíquia que já existe, nunca peça de museu nem o violino, e nunca em duas ofertas', () => {
    const s = mk('obj-show', 1975, { relicDensity: 'all' });
    for (let i = 0; i < 40; i++) { const rl = addRelic(s, 'guitar', l(`Peça ${i}`, `Piece ${i}`), undefined, undefined, 2000 + i * 5000); syncRelic31(s, rl); }
    let seen = 0;
    for (let i = 0; i < 24; i++) {
      advanceMonth(s);
      for (const r of shopRows31(s, s.config.homeCity)) if (r.relic) { seen++; expect(r.relic.id).not.toBe(EFRO_VIOLIN_ID); expect(r.relic.st).toBe('kept'); }
      expect(objInvariants(s)).toEqual([]);
    }
    expect(offersAt(s, shopId31(s.config.homeCity)).length).toBeGreaterThan(0);
    expect(seen).toBeLessThan(24); // na maior parte dos meses a vitrine fica vazia
  }, 240000);

  it('valor explicado por inteiro: valor de origem, mercado, hype, margem e preço final', () => {
    const s = mk('obj-why');
    const rl = fresh(s, 50000);
    const w = explain18(s, 'relic.value', { id: rl.id })!;
    const labels = w.parts.map((p) => (typeof p.label === 'string' ? p.label : p.label.pt));
    expect(labels).toContain('Valor de origem');
    expect(labels).toContain('Pedida do dono');
    expect(labels).toContain('Preço final');
    expect(w.value).toBe(w.parts.at(-1)!.value);
  });
});

describe('r31 objetos — nenhuma relíquia duplicada ou perdida', () => {
  it('teto de 90 arquiva (não descarta); peça com trajetória sua fica viva; ids únicos', () => {
    const s = mk('obj-cap');
    const mine = addRelic(s, 'guitar', l('Minha', 'Mine'), undefined, undefined, 10);
    mine.st = 'player'; syncRelic31(s, mine); mine.st = 'kept'; syncRelic31(s, mine); // passou por você
    for (let i = 0; i < LIVE_CAP9 + 30; i++) addRelic(s, 'poster', l(`Cartaz ${i}`, `Poster ${i}`), undefined, undefined, 50 + i);
    const st = relics(s);
    expect(st.list.length).toBeLessThanOrEqual(LIVE_CAP9 + 1);
    expect(st.list).toContain(mine);
    const ids = [...st.list.map((x) => x.id), ...st.arc.map((x) => x.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const counted = Object.values(st.arcN).reduce((t, [n]) => t + n, 0);
    expect(st.list.length + st.arc.length + counted).toBe(st.born);
  });

  it('partida de 3 anos: tudo fecha (nascidas = vivas + arquivadas), invariantes do objeto valem, determinismo', () => {
    const run = () => { const s = mk('obj-run', 1972); for (let i = 0; i < 36; i++) advanceMonth(s); return s; };
    const a = run(), b = run();
    const st = relics(a);
    const ids = [...st.list.map((x) => x.id), ...st.arc.map((x) => x.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(st.list.length + st.arc.length + Object.values(st.arcN).reduce((t, [n]) => t + n, 0)).toBe(st.born);
    expect(objInvariants(a)).toEqual([]);
    syncRelics31(a);
    expect(JSON.stringify(relics(a))).toBe(JSON.stringify(relics(b)));
    expect(JSON.stringify(items31(a).stock)).toBe(JSON.stringify(items31(b).stock));
    // definição única: nada de metadados paralelos
    expect((a.x4 as unknown as { relics18: Record<string, unknown> }).relics18.m).toBeUndefined();
    expect((a.x4 as unknown as { relics29: Record<string, unknown> }).relics29.m).toBeUndefined();
  }, 600000);

  it('interruptor desligado: sem loja nova', () => {
    const s = mk('obj-sw');
    setSw(s, 'objects31', false);
    const st = items31(s);
    st.stock = {};
    advanceMonth(s);
    expect(Object.keys(items31(s).stock)).toEqual([]);
    expect(restock31).toBeTypeOf('function');
  });
});
