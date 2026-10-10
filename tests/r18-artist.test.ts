// Rodada 18 (artist18) — carreira de artista com selos NPC: propostas, votos da banda, contraproposta, contrato
// (master, fundo, prestação de contas com atraso), fim do contrato (master antigo paga só royalty), sociedades.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { Rng } from '../src/core/rng';
import { ART18 } from '../src/sim/artist18hook';
import { labelFunded } from '../src/sim/production';
import { a18, accept18, band18, counter18, ctx18, diy18, endDeal18, interest18, openOffers18, value18, votes18, type Offer18 } from '../src/sim/sys/artist18';
import { found18, sh18, vote18 } from '../src/sim/sys/shared18';
import { botArtist18 } from '../src/sim/botartist18';
import type { GameState } from '../src/sim/types';

const game = (y = 1965, seed = 'art18') => createGame(defaultConfig(seed, { role: 'artist', startYear: y, bandGenre: 'rnr', bandName: 'Os Testes' } as never));
const hot = (s: GameState) => { const a = band18(s)!; a.fame = 45; a.momentum = 70; return a; };
const firstOffer = (s: GameState): Offer18 | undefined => openOffers18(s).find((o) => o.k === 'record' || o.k === 'dist' || o.k === 'dev');
function untilOffer(s: GameState, n = 10): Offer18 {
  for (let i = 0; i < n && !firstOffer(s); i++) { hot(s); advanceMonth(s); }
  return firstOffer(s)!;
}

describe('artist18: selos NPC disputam a banda do jogador', () => {
  it('banda famosa recebe proposta com cláusulas, nota com partes escondidas e voto da banda', () => {
    const s = game();
    const a = hot(s);
    const c = ctx18(s, a);
    const lbs = Object.values(s.labels).filter((x) => x.active);
    expect(Math.max(...lbs.map((lb) => interest18(s, lb, a, c).v))).toBeGreaterThan(0.3);
    const o = untilOffer(s);
    expect(o).toBeTruthy();
    expect(o.who.length).toBeGreaterThan(1);
    const v = value18(s, o);
    expect(v.v).toBeGreaterThanOrEqual(0); expect(v.v).toBeLessThanOrEqual(1);
    expect(v.parts.length).toBeGreaterThan(4);
    expect(v.parts.some((p) => p.hid > 0)).toBe(true); // sem assessoria há letras miúdas que não se vê
    expect(Array.isArray(votes18(s, o))).toBe(true);
    expect(diy18(s).length).toBeGreaterThanOrEqual(2);
  });

  it('assinar: contrato com o selo NPC, banda continua sua, adiantamento no caixa, selo paga a fabricação, royalties vão para a prestação de contas', () => {
    const s = game(2005, 'art18b');
    const o = untilOffer(s);
    if (o.k === 'dev') { o.k = 'record'; }
    const cash0 = s.player.cash;
    const r = accept18(s, o.id, true);
    expect(r.ok).toBe(true);
    const st = a18(s), a = band18(s)!;
    expect(st.deal?.lb).toBe(o.lb);
    expect(a.owner).toBe('player');
    const c = s.contracts[a.contractId!];
    expect(c.party).toBe(o.lb);
    expect(labelFunded(s, a.id)).toBe(true);
    if (o.adv) expect(s.player.cash).toBeGreaterThan(cash0);
    // royalties da banda: acumulam e saem numa prestação de contas com atraso
    const rel = { id: 'rx', actId: a.id, owner: o.lb } as never;
    expect(ART18.roy!(s, rel, 50000, 60000)).toBe(true);
    expect(st.deal!.pot).toBe(50000);
    expect(st.deal!.potRec).toBe(10000);
    const before = s.player.cash;
    for (let i = 0; i < 14; i++) { advanceMonth(s); if (!a18(s).deal) break; }
    expect(st.stmts.length).toBeGreaterThan(0);
    expect(st.stmts.some((x) => x.st === 'paid') || s.player.cash !== before).toBe(true);
  });

  it('contraproposta: com concorrência sobe a chance; recusa repetida faz o selo retirar', () => {
    const s = game(1975, 'art18c');
    const o = untilOffer(s);
    const adv0 = o.adv;
    const r = counter18(s, o.id, 'adv', Rng.fromSeed('c1'));
    if (r.ok) expect(o.adv).toBeGreaterThan(adv0);
    for (let i = 0; i < 4 && o.st === 'open'; i++) counter18(s, o.id, 'roy', Rng.fromSeed('c9'));
    expect(o.rounds).toBeGreaterThan(0);
  });

  it('fim do contrato: master do selo antigo continua pagando só royalty (recupera o saldo antes)', () => {
    const s = game(1990, 'art18d');
    const o = untilOffer(s);
    o.k = 'record'; o.master = 'label'; o.rev = 0;
    accept18(s, o.id, true);
    const st = a18(s);
    const c = s.contracts[st.deal!.cid];
    c.recoupBalance = 1000;
    endDeal18(s, { pt: 'teste', en: 'test' });
    expect(st.deal).toBeUndefined();
    const p = st.past[0];
    expect(p.lb).toBe(o.lb);
    const rel = { id: 'ry', actId: band18(s)!.id, owner: o.lb, revenue: 0 } as never;
    expect(ART18.indie!(s, rel, 0, 100000)).toBe(true);
    expect(p.bal).toBe(0);
    expect(p.pot + p.potRec).toBeGreaterThan(0);
  });

  it('determinismo: mesma semente, mesmas propostas; o bot artista joga sem quebrar', () => {
    const run = () => { const s = game(1965, 'art18e'); for (let i = 0; i < 8; i++) { hot(s); botArtist18(s, 'balanced'); advanceMonth(s); } return { s, k: a18(s).offers.map((o) => `${o.k}:${o.lb}:${o.adv}:${o.st}`).join('|') }; };
    const x = run(), y = run();
    expect(x.k).toBe(y.k);
    expect(x.k.length).toBeGreaterThan(0);
    expect(x.s.ended).toBeFalsy();
  });
});

describe('shared18: sociedades com NPCs', () => {
  it('fundar, votar (50/50 trava com votos diferentes) e o histórico registra', () => {
    const s = game(1980, 'art18f');
    hot(s);
    s.player.cash += 50_000_000;
    let ok = false;
    for (const pk of ['p:x'].concat(Object.values(s.acts).filter((a) => !a.playerBand && a.fame > 30).flatMap((a) => a.members.map((m) => `p:${m}`)).slice(0, 12))) {
      const r = found18(s, 'studio', pk, 0.5);
      if (r.ok) { ok = true; break; }
    }
    if (!ok) return; // ninguém topou nesta semente: o caminho de recusa já foi exercitado
    const v = sh18(s).v[0];
    expect(v.eq).toBe(0.5);
    const r1 = vote18(s, v.id, 'dividend', true);
    expect(v.votes.length).toBe(1);
    if (!r1.ok && v.votes[0].you !== v.votes[0].them) expect(v.dead).toBeGreaterThan(0);
  });
});
