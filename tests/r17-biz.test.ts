// Rodada 17 (F) — negócios: venda do selo (e o jogo continua), canais de lançamento por época, casas de show,
// licenças entre regiões, agenda com concorrência, direitos de imagem (chance inversa à fama + proteções),
// merch por época e determinismo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { careers } from '../src/sim/sys/careers12';
import { ownerOf } from '../src/sim/sys/people/owner';
import { hasLabel, makeBids, refound, sellLabel, valuation17, eraMultiple } from '../src/sim/sys/sale17';
import { outletsNow, toggleOutlet, out17 } from '../src/sim/sys/outlets17';
import { buyVenue17, v17 } from '../src/sim/sys/venues17';
import { cal17, clashOf } from '../src/sim/sys/clash17';
import { imgChance, askImage } from '../src/sim/sys/image17';
import { skusNow } from '../src/sim/sys/merch17';
import { lic17, acceptLic } from '../src/sim/sys/license17';
import type { Act, GameState } from '../src/sim/types';

const npc = (s: GameState) => Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.members.length && (a.status === 'active' || a.status === 'emerging'));

describe('r17 negócios', () => {
  it('vender o selo: preço, comprador assume elenco/catálogo, o jogo segue e dá para recomeçar', () => {
    const s = createGame(defaultConfig('r17biz-1', { startYear: 1990 }));
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(eraMultiple(s).m).toBeGreaterThan(eraMultiple(s, 2005).m);
    const v = valuation17(s);
    expect(v.total).toBeGreaterThan(0);
    const bids = makeBids(s);
    expect(bids.length).toBeGreaterThan(0);
    const w0 = ownerOf(s).wealth;
    expect(sellLabel(s, bids[0].id)).toBeNull();
    expect(hasLabel(s)).toBe(false);
    expect(careers(s).active).not.toContain('label');
    expect(Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand).length).toBe(0);
    expect(ownerOf(s).wealth).toBeGreaterThan(w0);
    expect(recentFacts(s, { kind: 'label_sold' }).length).toBe(1);
    for (let i = 0; i < 2; i++) advanceMonth(s);
    expect(s.ended).toBeUndefined();
    ownerOf(s).wealth += 10_000_000;
    // não-concorrência: mesma região bloqueada sem pagar a multa
    expect(refound(s, 'Second Act', s.config.homeCity, 2_000_000)).not.toBeNull();
    expect(refound(s, 'Second Act', s.config.homeCity, 2_000_000, true)).toBeNull();
    expect(hasLabel(s)).toBe(true);
  }, 120000);

  it('canais por época, imagem com chance inversa à fama e proteções, concorrência na agenda, casas', () => {
    const s = createGame(defaultConfig('r17biz-2', { startYear: 1970 }));
    advanceMonth(s);
    const ids = outletsNow(s).map((o) => o.id);
    expect(ids).toContain('eight_track');
    expect(ids).not.toContain('streaming');
    const rel = Object.values(s.releases).find((r) => r.owner === 'player');
    if (rel) { rel.week = s.week; const c0 = s.player.cash; expect(toggleOutlet(s, rel.id, 'eight_track')).toBeNull(); expect(s.player.cash).toBeLessThan(c0); expect(out17(s).rel[rel.id]).toContain('eight_track'); }
    const acts = npc(s).sort((a, b) => a.fame - b.fame);
    const lo: Act = { ...acts[0], fame: 10 }, hi: Act = { ...acts[0], fame: 90 };
    const T = { scopes: ['merch' as const], share: 0.2, years: 3, upfront: 0 };
    expect(imgChance(s, lo, T).p).toBeGreaterThan(imgChance(s, hi, T).p);
    expect(imgChance(s, lo, { ...T, share: 0.02 }).block).toBeTruthy();
    expect(imgChance(s, lo, { ...T, years: 0 }).block).toBeTruthy();
    expect(askImage(s, acts[0].id, { ...T, share: 0.01 }).ok).toBe(false);
    // concorrência: um NPC forte do mesmo gênero na mesma cidade/semana
    const me = npc(s)[1]; me.owner = 'player'; me.fame = 30;
    const rival = npc(s).find((a) => a.id !== me.id)!;
    rival.genre = me.genre; rival.fame = 80;
    cal17(s).npc.push({ a: rival.id, c: me.city, w: s.week + 3, cap: 5000 });
    const k = clashOf(s, me, me.city, s.week + 3);
    expect(k.mult).toBeLessThan(0.9);
    expect(k.why.length).toBeGreaterThan(0);
    expect(clashOf(s, me, me.city, s.week + 9).mult).toBe(1);
    // casas: estádio não se vende; clube histórico sim
    expect(buyVenue17(s, 'wembley')).not.toBeNull();
    s.player.cash += 50_000_000;
    expect(buyVenue17(s, 'troubadour')).toBeNull();
    advanceMonth(s);
    expect(v17(s).own[0].last).toBeTruthy();
    expect(skusNow(s)).toContain('tee');
    expect(skusNow(s)).not.toContain('nft');
  }, 120000);

  it('licença de entrada paga adiantamento e é determinística por semente', () => {
    const run = () => {
      const s = createGame(defaultConfig('r17biz-3', { startYear: 1985 }));
      for (let i = 0; i < 8; i++) advanceMonth(s);
      const o = lic17(s).list.find((x) => x.status === 'offer');
      if (o) { s.player.cash += o.adv; acceptLic(s, o.id); }
      for (let i = 0; i < 2; i++) advanceMonth(s);
      return { cash: s.player.cash, n: lic17(s).list.length, npc: cal17(s).npc.length };
    };
    const a = run(), b = run();
    expect(a).toEqual(b);
    expect(a.npc).toBeGreaterThan(0);
  }, 120000);
});
