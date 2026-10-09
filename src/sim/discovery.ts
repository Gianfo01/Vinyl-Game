// Descoberta (GDD §6, §42.4): olheiros com região, gênero, viés e custo; concursos de talentos
// e festivais de revelação; mercado de demos; leilão de contratos disputado com rivais.

import { clamp, type Rng } from '../core/rng';
import { CITIES, FAMILIES, MARKETS, cityById, familyOf, l, type L, type MarketId } from '../data/world';
import { acceptOffer, defaultOffer, evaluateOffer, expectedAdvance, signWithRival } from './contracts';
import { personName, langForCity } from './people';
import type { GameState } from './types';
import type { Auction, Scout } from './xtypes';
import { fmtL, hasTech, money, nextId, notify, post, remember } from './util';
import { addSignal, spawnProceduralAct } from './worldgen';

// ---------- Olheiros ----------

export function scoutPool(s: GameState, r: Rng): Scout[] {
  const out: Scout[] = [];
  for (let i = 0; i < 4; i++) {
    const m = r.pick(MARKETS);
    const fam = r.pick(FAMILIES);
    const city = r.pick(CITIES.filter((c) => c.market === m.id));
    const skill = clamp(Math.round(r.normal(50, 15)), 20, 92);
    out.push({ id: nextId(s, 'sc'), name: personName(r, langForCity(city.id, r)), region: m.id, family: fam.id, skill, bias: Math.round(r.normal(0, 7)), salary: money(s, 600 + skill * 18), found: 0 });
  }
  return out;
}

export function hireScout(s: GameState, sc: Scout): L | null {
  if (s.scouts.length >= 2 + s.player.hq * 2) return l('Limite de olheiros para o tamanho da sede.', 'Scout limit for your HQ size.');
  if (s.player.cash < sc.salary) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `scouthire:${sc.id}`, -sc.salary, 'scouting', `Contratação ${sc.name}`);
  s.scouts.push({ ...sc });
  return null;
}

export function fireScout(s: GameState, id: string): void {
  s.scouts = s.scouts.filter((x) => x.id !== id);
}

/** Missão: um mês na especialidade regional, dois fora dela (GDD §42.4). */
export function sendScout(s: GameState, scoutId: string, region: MarketId, family: string): L | null {
  const sc = s.scouts.find((x) => x.id === scoutId);
  if (!sc) return l('Olheiro inválido.', 'Invalid scout.');
  if (sc.mission) return l('Já está em missão.', 'Already on a mission.');
  const weeks = sc.region === region ? 4 : 8;
  const travel = money(s, sc.region === region ? 300 : 1200);
  if (s.player.cash < travel) return l('Caixa insuficiente para a viagem.', 'Not enough cash for travel.');
  post(s, `scouttrip:${sc.id}`, -travel, 'scouting', `Missão ${sc.name}`);
  sc.mission = { region, family, untilWeek: s.week + weeks };
  return null;
}

function scoutsMonth(s: GameState, r: Rng): void {
  for (const sc of s.scouts) {
    post(s, `scoutsal:${sc.id}`, -sc.salary, 'scouting', `Salário ${sc.name}`);
    if (!sc.mission || sc.mission.untilWeek > s.week) continue;
    const { region, family, leads } = sc.mission;
    // rodada 11: missão acompanhada semana a semana — o relatório final consolida as pistas já reveladas
    const known = (leads ?? []).map((id) => s.acts[id]).filter((a) => a && s.knowledge[a.id]);
    if (known.length) {
      for (const a of known) s.knowledge[a.id].degree = Math.max(s.knowledge[a.id].degree, 2);
      sc.found += known.length;
      notify(s, fmtL(l('{n} voltou de missão com {k} nome(s).', '{n} returned from a mission with {k} name(s).'), { n: sc.name, k: known.length }), 'info');
      sc.mission = undefined;
      continue;
    }
    const matches = Object.values(s.acts).filter((a) => !a.owner && a.status !== 'retired' && a.status !== 'split' && cityById[a.city]?.market === region && (family === 'any' || familyOf(a.genre) === family) && !s.knowledge[a.id]);
    r.shuffle(matches);
    const n = 1 + Math.floor(sc.skill / 35);
    let found = matches.slice(0, n);
    if (!found.length) {
      const city = r.pick(CITIES.filter((c) => c.market === region));
      found = [spawnProceduralAct(s, r, { city: city.id })];
    }
    for (const a of found) {
      addSignal(s, r, a.id, 'scout');
      const k = s.knowledge[a.id];
      // viés do profissional e grau maior que um sinal comum
      k.bias = sc.bias + r.normal(0, Math.max(2, 12 - sc.skill / 10));
      k.degree = sc.skill > 70 ? 3 : 2;
    }
    sc.found += found.length;
    notify(s, fmtL(l('{n} voltou de missão com {k} nome(s).', '{n} returned from a mission with {k} name(s).'), { n: sc.name, k: found.length }), 'info');
    sc.mission = undefined;
  }
}

// ---------- Concursos e festivais de revelação ----------

function contestName(s: GameState, city: string): L {
  const c = cityById[city]?.name ?? l(city);
  if (hasTech(s, 'short_video')) return fmtL(l('Desafio Revelação {c}', '{c} Breakthrough Challenge'), { c });
  if (hasTech(s, 'internet')) return fmtL(l('Concurso Online {c}', '{c} Online Contest'), { c });
  if (hasTech(s, 'tv_music')) return fmtL(l('Show de Calouros da TV {c}', '{c} TV Talent Show'), { c });
  if (hasTech(s, 'radio')) return fmtL(l('Hora do Amador — Rádio {c}', '{c} Radio Amateur Hour'), { c });
  return fmtL(l('Concurso de Bandas de {c}', '{c} Battle of the Bands'), { c });
}

function contestsMonth(s: GameState, r: Rng): void {
  // novos concursos (um ou dois por mês no mundo, com chance maior em cidades com cena forte)
  if (r.chance(0.35)) {
    const city = r.weighted(CITIES, (c) => (c.id === s.config.homeCity ? 3 : s.branches.some((b) => b.city === c.id) ? 2.2 : 1) * (s.player.territories.includes(c.market) ? 1.5 : 0.6));
    if (city) {
      const entrants = Object.values(s.acts).filter((a) => a.city === city.id && !a.owner && a.status === 'emerging').slice(0, 6).map((a) => a.id);
      if (entrants.length < 3) entrants.push(spawnProceduralAct(s, r, { city: city.id }).id);
      if (entrants.length < 2) return;
      s.contests.push({ id: nextId(s, 'ct'), name: contestName(s, city.id), city: city.id, week: s.week + r.int(3, 8), entrants, prize: money(s, 1500), kind: r.chance(0.25) ? 'showcase' : 'contest' });
    }
  }
  for (const c of s.contests) {
    if (c.winner || c.week > s.week) continue;
    const acts = c.entrants.map((id) => s.acts[id]).filter(Boolean);
    const scored = acts.map((a) => ({ a, v: a.potential * 0.4 + a.fame + r.normal(0, 12) }));
    scored.sort((x, y) => y.v - x.v);
    const win = scored[0]?.a;
    if (!win) continue;
    c.winner = win.id;
    win.fame = clamp(win.fame + 3, 0, 100);
    win.fans.casual += 1500;
    win.momentum = clamp(win.momentum + 20, 0, 100);
    if (c.attended) {
      for (const a of acts) {
        addSignal(s, r, a.id, 'contest');
        const k = s.knowledge[a.id];
        if (k) k.degree = Math.max(k.degree, a.id === win.id ? 3 : 2);
      }
      notify(s, fmtL(l('{c}: {w} venceu. Você viu todos de perto.', '{c}: {w} won. You saw everyone up close.'), { c: c.name, w: win.name }), 'good');
    }
    // rivais também assistem: chance de assinar o vencedor
    const rival = Object.values(s.labels).filter((lb) => lb.active && lb.cash > money(s, 30000)).sort((a, b) => b.aggression - a.aggression)[0];
    if (rival && !win.owner && r.chance(c.attended ? 0.2 : 0.45)) {
      signWithRival(s, win, rival.id, r);
      remember(s, 'contest_signed', fmtL(l('{b} contrata {w}, vencedor de {c}.', '{b} signs {w}, winner of {c}.'), { b: rival.name, w: win.name, c: c.name }), { actId: win.id });
    }
  }
  s.contests = s.contests.filter((c) => !c.winner || s.week - c.week < 12).slice(-20);
}

export function attendContest(s: GameState, id: string): L | null {
  const c = s.contests.find((x) => x.id === id);
  if (!c || c.winner) return l('Concurso encerrado.', 'Contest closed.');
  if (c.attended) return null;
  const home = cityById[c.city]?.market === cityById[s.config.homeCity]?.market;
  const cost = money(s, home ? 300 : 1500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `contest:${c.id}`, -cost, 'scouting', 'Ida a concurso');
  c.attended = true;
  return null;
}

/** Patrocinar um concurso: o selo ganha visibilidade e prioridade no vencedor. */
export function sponsorContest(s: GameState, id: string): L | null {
  const c = s.contests.find((x) => x.id === id);
  if (!c || c.winner) return l('Concurso encerrado.', 'Contest closed.');
  const cost = money(s, 5000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `contestsp:${c.id}`, -cost, 'marketing', 'Patrocínio de concurso');
  c.attended = true;
  c.prize += cost;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
  s.flags[`contestSponsor:${c.id}`] = 1;
  return null;
}

// ---------- Demos ----------

function demosMonth(s: GameState, r: Rng): void {
  if (s.config.role === 'artist') return;
  const n = 1 + (s.player.reputation.artists > 50 ? 2 : s.player.reputation.artists > 30 ? 1 : 0) + (r.chance(0.4) ? 1 : 0);
  const pool = Object.values(s.acts).filter((a) => !a.owner && a.status === 'emerging' && !s.demos.some((d) => d.actId === a.id));
  for (let i = 0; i < n && pool.length; i++) {
    const a = r.pick(pool);
    pool.splice(pool.indexOf(a), 1);
    const truth = a.potential * 0.6 + 15;
    s.demos.push({ id: nextId(s, 'dm'), actId: a.id, week: s.week, hint: clamp(Math.round(truth + r.normal(0, 14)), 5, 99), expires: s.week + 8 });
  }
  s.demos = s.demos.filter((d) => d.expires > s.week && s.acts[d.actId] && !s.acts[d.actId].owner).slice(-12);
}

export function listenDemo(s: GameState, r: Rng, demoId: string): L | null {
  const d = s.demos.find((x) => x.id === demoId);
  if (!d) return l('Demo indisponível.', 'Demo unavailable.');
  d.heard = true;
  addSignal(s, r, d.actId, 'demo');
  const k = s.knowledge[d.actId];
  if (k) k.degree = Math.max(k.degree, 2);
  return null;
}

// ---------- Leilão ----------

export function startAuction(s: GameState, r: Rng, actId: string, advance: number, royalty: number): Auction | L {
  const act = s.acts[actId];
  if (!act || act.owner) return l('Ato indisponível.', 'Act unavailable.');
  if (s.auctions.some((a) => a.actId === actId && a.status === 'open')) return l('Leilão já em andamento.', 'Auction already running.');
  if (s.player.cash < advance) return l('Caixa insuficiente para o lance.', 'Not enough cash to bid.');
  const au: Auction = { id: nextId(s, 'au'), actId, bids: [{ party: 'player', advance, royalty }], round: 1, endsWeek: s.week + 3, status: 'open' };
  // rivais interessados entram com lances públicos
  const rivals = Object.values(s.labels).filter((lb) => lb.active && lb.cash > money(s, expectedAdvance(s, act)) && (lb.focus.length === 0 || lb.focus.includes(familyOf(act.genre))));
  for (const lb of r.shuffle(rivals).slice(0, 2)) {
    if (r.chance(0.3 + lb.aggression * 0.5)) au.bids.push({ party: lb.id, advance: Math.round(advance * r.float(0.9, 1.2)), royalty: clamp(royalty + r.float(-0.02, 0.03), 0.08, 0.4) });
  }
  s.auctions.push(au);
  remember(s, 'auction', fmtL(l('Leilão por {a}: {n} selo(s) na disputa.', 'Bidding war for {a}: {n} label(s) in.'), { a: act.name, n: new Set(au.bids.map((b) => b.party)).size }), { actId });
  return au;
}

export function raiseBid(s: GameState, auctionId: string, advance: number, royalty: number): L | null {
  const au = s.auctions.find((x) => x.id === auctionId && x.status === 'open');
  if (!au) return l('Leilão encerrado.', 'Auction closed.');
  if (s.player.cash < advance) return l('Caixa insuficiente.', 'Not enough cash.');
  au.bids.push({ party: 'player', advance, royalty });
  au.endsWeek = Math.max(au.endsWeek, s.week + 1);
  return null;
}

export function withdrawAuction(s: GameState, auctionId: string): void {
  const au = s.auctions.find((x) => x.id === auctionId);
  if (au && au.status === 'open') au.status = 'closed';
}

function bestBid(s: GameState, au: Auction, party: string) {
  return au.bids.filter((b) => b.party === party).sort((a, b) => b.advance - a.advance)[0];
}

/** Rodada semanal: rivais cobrem; ao fim o ato escolhe pela utilidade (não só dinheiro). */
export function auctionsWeek(s: GameState, r: Rng): void {
  for (const au of s.auctions) {
    if (au.status !== 'open') continue;
    const act = s.acts[au.actId];
    if (!act || act.owner) {
      au.status = 'lost';
      continue;
    }
    const parties = [...new Set(au.bids.map((b) => b.party))];
    const top = Math.max(...au.bids.map((b) => b.advance));
    for (const p of parties) {
      if (p === 'player') continue;
      const lb = s.labels[p];
      const mine = bestBid(s, au, p);
      if (!lb || !mine) continue;
      if (mine.advance < top && lb.cash > top * 1.3 && r.chance(0.35 + lb.aggression * 0.4)) au.bids.push({ party: p, advance: Math.round(top * r.float(1.05, 1.2)), royalty: mine.royalty });
    }
    au.round += 1;
    if (s.week < au.endsWeek) continue;
    // decisão: utilidade do ato
    const scored = parties.map((p) => {
      const b = bestBid(s, au, p)!;
      const o = { ...defaultOffer(s, act), advance: b.advance, royalty: b.royalty };
      const rep = p === 'player' ? 0 : (s.labels[p]?.reputation ?? 50) / 400;
      return { p, b, v: evaluateOffer(s, act, o).score + rep + r.normal(0, 0.05) };
    });
    scored.sort((a, b) => b.v - a.v);
    const w = scored[0];
    if (w.p === 'player') {
      if (s.player.cash < w.b.advance) {
        au.status = 'lost';
        notify(s, fmtL(l('Você venceu o leilão de {a}, mas não tinha caixa para o adiantamento.', 'You won the auction for {a} but lacked cash for the advance.'), { a: act.name }), 'bad');
        continue;
      }
      acceptOffer(s, act, { ...defaultOffer(s, act), advance: w.b.advance, royalty: w.b.royalty, id: nextId(s, 'o'), week: s.week, status: 'pending' });
      au.status = 'won';
      remember(s, 'auction_won', fmtL(l('Você vence o leilão por {a}.', 'You win the bidding war for {a}.'), { a: act.name }), { actId: act.id, important: true });
    } else {
      signWithRival(s, act, w.p, r);
      s.rivalries[w.p] = (s.rivalries[w.p] ?? 0) + 12;
      au.status = 'lost';
      if (au.bids.some((b) => b.party === 'player')) notify(s, fmtL(l('{b} venceu o leilão por {a}.', '{b} won the bidding war for {a}.'), { b: s.labels[w.p]?.name ?? '', a: act.name }), 'bad');
    }
  }
  s.auctions = s.auctions.filter((a) => a.status === 'open' || s.week - a.endsWeek < 12).slice(-15);
}

export function discoveryMonth(s: GameState, r: Rng): void {
  scoutsMonth(s, r);
  contestsMonth(s, r);
  demosMonth(s, r);
}
