// Rodada 8 — itens 9 e 10: bens pessoais (compra, venda, manutenção, efeitos), investimentos, equipe
// pessoal, cursos, aparições; mapa jogável (viagem, olheiro avulso, divulgação, distribuição local).

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { energyLeft, maxEnergy } from '../src/sim/sys/life';
import {
  COURSES, buyGood, goodById, goodPrice, goodUpkeep, goods, goodsMonth, hirePStaff, invest, redeem, saleValue, sellGood, setRoutine, study, venueNight,
} from '../src/sim/sys/goods8';
import {
  convertTrial, isHere, localDistribution, mapx, promoTrip, scoutCity, travelQuote, travelTo,
} from '../src/sim/sys/mapx8';
import { cityDemand } from '../src/sim/tours';
import { perk } from '../src/sim/perks';
import { CITIES, cityById } from '../src/data/world';
import { money, playerActs, rngOf } from '../src/sim/util';
import type { GameState, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));
const rich = (s: GameState) => { ownerOf(s).wealth = money(s, 6_000_000); };

describe('bens pessoais', () => {
  it('comprar sai do patrimônio pessoal (não do caixa) e dá efeitos; vender devolve o valor de mercado', () => {
    const s = mk('r8-goods', { startYear: 1980 });
    rich(s);
    const cash = s.player.cash;
    const w0 = ownerOf(s).wealth;
    const offer0 = perk(s, 'offer');
    expect(buyGood(s, 'limo')).toBeNull();
    expect(ownerOf(s).wealth).toBe(w0 - goodPrice(s, goodById.limo));
    expect(s.player.cash).toBe(cash);
    expect(perk(s, 'offer')).toBeGreaterThan(offer0);
    // não compra o mesmo carro duas vezes; arte pode repetir
    expect(buyGood(s, 'limo')).not.toBeNull();
    expect(buyGood(s, 'art_prints')).toBeNull();
    expect(buyGood(s, 'art_prints')).toBeNull();
    // época: jatinho só depois de 1965, arte digital só em 2021
    expect(buyGood(s, 'art_digital')).not.toBeNull();
    const it0 = goods(s).owned.find((x) => x.id === 'limo')!;
    it0.value = Math.round(it0.value * 0.8);
    const w1 = ownerOf(s).wealth;
    const sv = saleValue(it0);
    expect(sellGood(s, it0.uid)).toBeNull();
    expect(ownerOf(s).wealth).toBe(w1 + sv);
    expect(perk(s, 'offer')).toBeCloseTo(offer0, 5);
    invariant(s);
  });

  it('manutenção mensal sai do bolso; três meses sem pagar e o bem é tomado', () => {
    const s = mk('r8-upkeep', { startYear: 1990 });
    rich(s);
    setRoutine(s, 'none');
    expect(buyGood(s, 'car_family')).toBeNull();
    const w0 = ownerOf(s).wealth;
    goodsMonth(s, rngOf(s));
    expect(ownerOf(s).wealth).toBe(w0 - goodUpkeep(s, goodById.car_family));
    // valor deprecia com o tempo (média)
    const item = goods(s).owned[0];
    for (let i = 0; i < 24; i++) goodsMonth(s, rngOf(s));
    expect(item.value).toBeLessThan(item.paid);
    // sem dinheiro: atrasa e, no terceiro mês, perde o carro
    ownerOf(s).wealth = 0;
    for (let i = 0; i < 3; i++) goodsMonth(s, rngOf(s));
    expect(goods(s).owned.length).toBe(0);
    expect(ownerOf(s).wealth).toBeGreaterThan(0); // o leilão devolve uma parte
    invariant(s);
  });

  it('bens aliviam o estresse e treinam o personagem; jatinho dá tempo livre', () => {
    const s = mk('r8-effects', { startYear: 1990 });
    rich(s);
    const o = ownerOf(s);
    o.stress = 80;
    buyGood(s, 'chalet');
    buyGood(s, 'sailboat');
    const st0 = o.stress;
    goodsMonth(s, rngOf(s));
    expect(o.stress).toBeLessThan(st0);
    const e0 = maxEnergy(s);
    expect(buyGood(s, 'jet')).toBeNull();
    expect(maxEnergy(s)).toBe(e0 + 1);
  });
});

describe('investimentos, equipe, cursos e aparições', () => {
  it('aplicar e resgatar', () => {
    const s = mk('r8-inv', { startYear: 1995 });
    rich(s);
    const w0 = ownerOf(s).wealth;
    const amt = money(s, 20000);
    expect(invest(s, 'stocks', amt)).toBeNull();
    expect(ownerOf(s).wealth).toBe(w0 - amt);
    expect(invest(s, 'crypto', amt)).not.toBeNull(); // ainda não existe em 1995
    for (let i = 0; i < 12; i++) goodsMonth(s, rngOf(s));
    const v = goods(s).inv.stocks!.value;
    expect(v).toBeGreaterThan(0);
    const w1 = ownerOf(s).wealth;
    expect(redeem(s, 'stocks', 1)).toBeNull();
    expect(ownerOf(s).wealth).toBe(w1 + Math.round(v * 0.99));
    expect(goods(s).inv.stocks).toBeUndefined();
    invariant(s);
  });

  it('assistente pessoal dá +1 de tempo livre e sai do bolso todo mês', () => {
    const s = mk('r8-staff', { startYear: 1990 });
    rich(s);
    const e0 = maxEnergy(s);
    expect(hirePStaff(s, 'assistant')).toBeNull();
    expect(maxEnergy(s)).toBe(e0 + 1);
    ownerOf(s).wealth = 0;
    goodsMonth(s, rngOf(s));
    expect(goods(s).staff.assistant).toBeUndefined(); // sem salário, pediu demissão
  });

  it('curso completo vira diploma com bônus permanente', () => {
    const s = mk('r8-study', { startYear: 1990 });
    rich(s);
    const q0 = perk(s, 'songQ');
    let done = false;
    for (let m = 0; m < 4 && !done; m++) {
      while (energyLeft(s) > 0 && !done) {
        const res = study(s, 'theory');
        if ('done' in res) done = res.done;
      }
      if (!done) advanceMonth(s);
    }
    expect(done).toBe(true);
    expect(goods(s).diplomas).toContain('theory');
    expect(perk(s, 'songQ')).toBeCloseTo(q0 + COURSES.theory.perks.songQ!, 5);
    invariant(s);
  });
});

describe('mapa jogável', () => {
  it('viajar sai do bolso, você fica na cidade e pode frequentar os clubes de lá', () => {
    const s = mk('r8-travel', { startYear: 1985 });
    rich(s);
    const dest = CITIES.find((c) => c.id !== s.config.homeCity && s.clubs.some((k) => k.city === c.id && !k.closed))!;
    const q = travelQuote(s, dest.id);
    const cash = s.player.cash;
    const w0 = ownerOf(s).wealth;
    const res = travelTo(s, rngOf(s), dest.id);
    if ('pt' in res) {
      // visto negado: perdeu metade da viagem
      expect(ownerOf(s).wealth).toBe(w0 - Math.round(q.cost * 0.5));
      return;
    }
    expect(ownerOf(s).wealth).toBe(w0 - q.cost);
    expect(s.player.cash).toBe(cash);
    expect(isHere(s, dest.id)).toBe(true);
    const club = s.clubs.find((k) => k.city === dest.id && !k.closed)!;
    const r2 = venueNight(s, rngOf(s), club.id);
    if (energyLeft(s) >= 0) expect('text' in r2 || 'pt' in r2).toBe(true);
    invariant(s);
  });

  it('olheiro avulso paga do caixa e traz nomes da cidade', () => {
    const s = mk('r8-scout', { startYear: 1985 });
    const city = CITIES.find((c) => c.id !== s.config.homeCity)!;
    const known0 = Object.keys(s.knowledge).length;
    expect(scoutCity(s, city.id)).toBeNull();
    expect(scoutCity(s, city.id)).not.toBeNull(); // já há um olheiro lá
    invariant(s);
    for (let i = 0; i < 4; i++) advanceWeek(s);
    expect(mapx(s).scoutJobs.length).toBe(0);
    const fromCity = Object.values(s.knowledge).filter((k) => s.acts[k.actId]?.city === city.id);
    expect(fromCity.length).toBeGreaterThan(0);
    expect(Object.keys(s.knowledge).length).toBeGreaterThan(known0);
    invariant(s);
  });

  it('divulgação dá fãs e aumenta o público da cidade; distribuição local em teste abre e fecha o mercado', () => {
    const s = mk('r8-promo', { startYear: 1985, role: 'artist' });
    const actId = playerActs(s)[0];
    const act = s.acts[actId];
    const city = CITIES.find((c) => c.id !== s.config.homeCity && c.id !== act.city)!;
    const d0 = cityDemand(s, act, city.id);
    const fans0 = act.fans.casual;
    const res = promoTrip(s, city.id, actId);
    expect('text' in res).toBe(true);
    expect(act.fans.casual).toBeGreaterThan(fans0);
    expect(cityDemand(s, act, city.id)).toBeGreaterThan(d0);
    invariant(s);
    // mercado fechado: teste de um ano
    const closed = CITIES.find((c) => !s.player.territories.includes(c.market))!;
    expect(localDistribution(s, closed.id)).toBeNull();
    expect(s.player.territories).toContain(closed.market);
    invariant(s);
    const until = mapx(s).trials[closed.market]!;
    for (let i = 0; i < 120 && s.week <= until; i++) advanceWeek(s);
    if (!s.branches.some((b) => cityById[b.city]?.market === closed.market)) expect(s.player.territories).not.toContain(closed.market);
    expect(convertTrial(s, closed.market)).not.toBeNull();
    invariant(s);
  });

  it('o mês completo segue com bens e investimentos e mantém o invariante do caixa', () => {
    const s = mk('r8-month', { startYear: 1970 });
    rich(s);
    buyGood(s, 'home_studio');
    buyGood(s, 'yacht');
    hirePStaff(s, 'chef');
    invest(s, 'stocks', money(s, 50000));
    setRoutine(s, 'yoga');
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(goods(s).owned.length).toBeGreaterThan(0);
    invariant(s);
  });
});
