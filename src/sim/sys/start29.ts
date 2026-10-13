// Rodada 29 — aplica a SITUAÇÃO INICIAL escolhida na Nova run (dados em src/sim/start29data.ts) no gancho 'newgame'.
// O worldgen já montou o começo pelo `scenario` base (from_zero / emerging / established); aqui entra só o que a escada
// pede além disso, do mesmo jeito para as 12 carreiras:
//  • caixa: múltiplo do começo "emergente" da carreira (quem é de negócio já recebeu o do scenario base; artista e
//    híbrido, que o worldgen não escalava, recebem a escada inteira) — dificuldade e ajuste fino continuam valendo;
//  • reputação artística × comercial (o hipster troca alcance por prestígio), sede, equipe, mercados;
//  • elenco (carreiras de negócio) ou fama da própria banda (artista);
//  • top 5 / líder: mágoa inicial dos maiores rivais; em crise: dívida bancária herdada (empréstimo de verdade).
// RNG próprio (`start29:` + semente): não mexe no sorteio da partida. Sem `config.start29` nada muda (valores-ouro).

import { Rng } from '../../core/rng';
import { MARKETS, l, type MarketId } from '../../data/world';
import { registerSimHook } from '../ext4';
import { sit29ById, sitOfScenario29, type SitDef29 } from '../start29data';
import type { GameState } from '../types';
import { fmtL, remember } from '../util';
import { genStaff } from '../worldgen';
import { grudge27 } from './rivals27';
import { adjustCash, signAct } from './live';

export { SITS29, sit29ById, statusLabel29, start28Fits29 } from '../start29data';

const clamp100 = (x: number): number => Math.max(0, Math.min(100, x));
const STAFF29 = ['anr', 'producer', 'publicist', 'admin', 'engineer', 'analyst', 'rights'];

/** Aplica a situação ao estado novo (só no gancho 'newgame'). Devolve o que fez (testes). */
export function applyStart29(s: GameState, d: SitDef29): { cash: number; acts: number; staff: number; debt: number } {
  const cfg = s.config;
  const p = s.player;
  const r = Rng.fromSeed(`start29:${cfg.seed}`);
  const biz = cfg.role === 'label'; // o worldgen já aplicou o scenario base ao caixa e à sede
  const band = p.bandActId ? s.acts[p.bandActId] : undefined;
  const out = { cash: 0, acts: 0, staff: 0, debt: 0 };
  // caixa
  if (cfg.custom?.cash === undefined && cfg.labels?.start !== 'equal') {
    const base = sit29ById(sitOfScenario29(d.base))!;
    const f = biz ? d.cash / base.cash : d.cash;
    if (Math.abs(f - 1) > 1e-9) adjustCash(s, f);
  }
  out.cash = p.cash;
  // reputação
  const rep = p.reputation as unknown as Record<string, number>;
  if (cfg.custom?.reputation === undefined) for (const [k, v] of Object.entries(d.rep)) if (typeof rep[k] === 'number') rep[k] = clamp100(rep[k] + (v ?? 0));
  // sede (artista tem um nível a menos: a sala de ensaio)
  if (cfg.custom?.hq === undefined) p.hq = Math.max(p.hq, Math.max(0, d.hq - (cfg.role === 'artist' ? 1 : 0)));
  // elenco (negócio) ou banda (artista/híbrido)
  if (!cfg.takeover && cfg.custom?.roster === undefined && cfg.role !== 'artist') {
    const mine = Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand);
    for (const a of mine) if (d.pot) a.potential = Math.min(95, a.potential + d.pot);
    const genres = [cfg.bandGenre, ...mine.map((a) => a.genre)].filter((g): g is string => !!g);
    for (let i = mine.length; i < d.roster; i++) {
      const a = signAct(s, r, genres.length ? r.pick(genres) : 'rnr', cfg.homeCity, Math.max(1, Math.round(d.fame * (0.7 + r.next() * 0.6))));
      if (d.pot) a.potential = Math.min(95, a.potential + d.pot);
      s.knowledge[a.id] = { actId: a.id, degree: 4, stage: 'negotiation', bias: 0, updatedWeek: 0, source: 'roster' };
      out.acts++;
    }
  }
  if (band) {
    if (band.fame < d.fame) {
      band.fame = d.fame;
      const f = Math.pow(10, 2 + d.fame / 25);
      band.fans = { casual: Math.round(f), active: Math.round(f * 0.15), core: Math.round(f * 0.03) };
    }
    if (d.pot) band.potential = Math.min(95, band.potential + d.pot);
  }
  // equipe
  if (cfg.custom?.staff === undefined) for (let i = p.staff.length; i < d.staff; i++) { p.staff.push(genStaff(s, r, STAFF29[i % STAFF29.length], r.int(45, 70))); out.staff++; }
  // mercados (a casa primeiro, depois os maiores)
  if (cfg.custom?.markets === undefined && d.markets > p.territories.length) {
    const order = [...p.territories, ...MARKETS.map((m) => m.id).filter((m) => !p.territories.includes(m))] as MarketId[];
    p.territories = order.slice(0, Math.min(MARKETS.length, d.markets));
  }
  // atenção dos rivais (os maiores primeiro)
  if (d.rivals[0] > 0) {
    const big = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.reputation - a.reputation).slice(0, d.rivals[1]);
    for (const lb of big) grudge27(s, lb.id, d.rivals[0], l('chegou ao topo — e o topo é nosso.', 'made it to the top — and the top is ours.'));
  }
  // dívida herdada (gigante caído): um empréstimo de verdade, cobrado todo mês
  if (d.debt > 0 && cfg.custom?.cash === undefined) {
    const principal = Math.round(Math.max(0, p.cash) * d.debt);
    const rate = 0.14, months = 60;
    const monthly = Math.round((principal * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -months)));
    p.loans.push({ id: `ln29-${cfg.seed}`, principal, balance: principal, rate, monthly, startWeek: s.week });
    out.debt = principal;
  }
  remember(s, 'start29', fmtL(l('Situação inicial: {n}. {t}', 'Starting situation: {n}. {t}'), { n: d.name, t: d.fx }), { important: true });
  return out;
}

registerSimHook('newgame', 'start29', (s) => {
  const d = sit29ById(s.config.start29);
  if (!d || s.config.scenario17 || s.config.takeover) return; // cenário histórico e "assumir gravadora" têm o próprio começo
  applyStart29(s, d);
});
