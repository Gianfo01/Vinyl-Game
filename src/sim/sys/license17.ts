// Rodada 17 (F) — Licenciamento e distribuição entre regiões. ENTRADA: um selo sem operação num mercado onde
// você opera pede para você prensar e vender os discos dele ali (você paga um adiantamento e fica com uma
// fatia das vendas deles nesse mercado — mas ajuda um concorrente a crescer). SAÍDA: um selo que opera onde
// você não está licencia o seu catálogo lá (ele adianta, paga royalty, e seus discos ganham alcance no
// mercado; o licenciado fica com o resto da receita). Exclusividade: abrir o mercado por conta própria rompe
// o acordo (multa). Gerador próprio por mês; propostas expiram.

import { Rng, clamp } from '../../core/rng';
import { MARKETS, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { GameState, Label } from '../types';
import { fmtL, money, notify, post } from '../util';
import { allReleases17 } from '../relidx17';

export type Dir = 'in' | 'out';
export interface Lic17 { id: string; dir: Dir; lb: string; market: MarketId; adv: number; share: number; until: number; since: number; earned: number; status: 'offer' | 'active' | 'ended'; expires: number; why?: L }
export interface LicState { list: Lic17[]; log: { y: number; m: number; t: L }[] }
declare module '../ext4' { interface Ext4 { lic17: LicState } }
registerExt4('lic17', () => ({ list: [], log: [] }));
export const lic17 = (s: GameState): LicState => { const x = s.x4 as unknown as { lic17?: LicState }; return (x.lic17 ??= { list: [], log: [] }); };
const log = (s: GameState, t: L) => { const st = lic17(s); st.log.unshift({ y: s.year, m: s.month, t }); if (st.log.length > 30) st.log.pop(); };
export const mkName = (m: MarketId): L => MARKETS.find((x) => x.id === m)?.name ?? l(m);
const mkSize = (s: GameState, m: MarketId) => MARKETS.find((x) => x.id === m)?.size(s.year) ?? 0.2;

/** Receita mensal (centavos) que um selo faz com lançamentos recentes — base das contas de licença. */
export function labelMonthGross(s: GameState, lb: Label): number {
  return allReleases17(s).filter((r) => r.owner === lb.id && s.week - r.week < 52).reduce((t, r) => t + r.weekly.slice(-4).reduce((a, x) => a + x, 0) * (r.revenue / Math.max(1, r.totalUnits)), 0);
}
/** Peso do mercado M dentro da operação (tamanho relativo). */
const weightIn = (s: GameState, terr: MarketId[], m: MarketId) => mkSize(s, m) / Math.max(0.1, terr.reduce((t, x) => t + mkSize(s, x), 0) + mkSize(s, m));

export function estIn(s: GameState, d: Lic17): number { const lb = s.labels[d.lb]; return lb ? Math.round(labelMonthGross(s, lb) * weightIn(s, lb.territories, d.market) * d.share) : 0; }
export function estOut(s: GameState, d: Lic17): number {
  const sales = Math.max(0, s.lastMonthLedger?.sales ?? 0);
  return Math.round(sales * weightIn(s, s.player.territories, d.market) * 0.7 * d.share);
}

export function acceptLic(s: GameState, id: string): L | null {
  const d = lic17(s).list.find((x) => x.id === id && x.status === 'offer');
  if (!d || d.expires < s.week) return l('Proposta expirada.', 'Offer expired.');
  const lb = s.labels[d.lb];
  if (!lb?.active) return l('O selo fechou.', 'The label closed.');
  if (d.dir === 'in') {
    if (s.player.cash < d.adv) return l('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.');
    post(s, `lic17:${d.id}`, -d.adv, 'distribution', `Licença de ${lb.name} (${d.market})`);
  } else {
    if (s.player.territories.includes(d.market)) return l('Você já opera nesse mercado.', 'You already operate in that market.');
    post(s, `lic17:${d.id}`, d.adv, 'distribution', `Adiantamento de ${lb.name} (${d.market})`);
  }
  d.status = 'active'; d.since = s.week;
  const t = fmtL(d.dir === 'in' ? l('Você passa a distribuir {lb} em {m} ({p}% das vendas deles lá).', 'You now distribute {lb} in {m} ({p}% of their sales there).') : l('{lb} licencia seu catálogo em {m} (royalty de {p}%).', '{lb} licenses your catalog in {m} ({p}% royalty).'), { lb: lb.name, m: mkName(d.market), p: Math.round(d.share * 100) });
  log(s, t);
  emitFact(s, { kind: 'deal', actors: ['player', lb.id], severity: d.adv >= money(s, 30000) ? 55 : 40, visibility: 'public', tags: ['deal', 'distribution'], text: t, src: 'license17', data: { market: d.market } });
  return null;
}
export function declineLic(s: GameState, id: string): void { const d = lic17(s).list.find((x) => x.id === id); if (d && d.status === 'offer') d.status = 'ended'; }

/** Você propõe licenciar seu catálogo a um selo que opera onde você não está. */
export function pitchOut(s: GameState, lbId: string, m: MarketId): L | null {
  const lb = s.labels[lbId];
  if (!lb?.active || !lb.territories.includes(m)) return l('Esse selo não opera lá.', 'That label does not operate there.');
  if (s.player.territories.includes(m)) return l('Você já opera nesse mercado.', 'You already operate there.');
  const st = lic17(s);
  if (st.list.some((x) => x.dir === 'out' && x.market === m && x.status !== 'ended')) return l('Já há acordo ou proposta para esse mercado.', 'There is already a deal or offer for that market.');
  const r = Rng.fromSeed(`${s.config.seed}:lic17p:${lbId}:${m}:${s.year}:${s.month}`);
  const rep = (s.player.reputation.commercial + s.player.reputation.artistic) / 2;
  const p = clamp(0.25 + rep / 150 - ((s.rivalries?.[lbId] ?? 0) > 30 ? 0.3 : 0), 0.05, 0.85);
  if (!r.chance(p)) { log(s, fmtL(l('{lb} recusou licenciar seu catálogo em {m} (chance era {p}%).', '{lb} declined to license your catalog in {m} (odds were {p}%).'), { lb: lb.name, m: mkName(m), p: Math.round(p * 100) })); return null; }
  st.list.push(mkOut(s, r, lb, m));
  return null;
}
function mkOut(s: GameState, r: Rng, lb: Label, m: MarketId): Lic17 {
  const est = Math.max(money(s, 500), Math.round((s.lastMonthLedger?.sales ?? 0) * weightIn(s, s.player.territories, m) * 0.7));
  const share = Math.round(r.float(0.16, 0.26) * 100) / 100;
  return { id: `li17:${s.week}:${lb.id}:${m}`, dir: 'out', lb: lb.id, market: m, adv: Math.round(est * share * r.float(6, 12)), share, until: s.week + 52 * r.int(2, 4), since: 0, earned: 0, status: 'offer', expires: s.week + 8 };
}
export const pitchTargets = (s: GameState): { lb: Label; m: MarketId }[] => {
  const out: { lb: Label; m: MarketId }[] = [];
  for (const m of MARKETS.map((x) => x.id)) {
    if (s.player.territories.includes(m)) continue;
    const lb = Object.values(s.labels).filter((x) => x.active && x.territories.includes(m)).sort((a, b) => b.reputation - a.reputation)[0];
    if (lb) out.push({ lb, m });
  }
  return out;
};

// seu alcance cresce onde há licenciado (o resto da receita fica com ele: ver o mês)
export const outMult = (s: GameState): number => {
  let m = 1;
  for (const d of lic17(s).list) if (d.dir === 'out' && d.status === 'active') { const lb = s.labels[d.lb]; m += weightIn(s, s.player.territories, d.market) * 0.7 * (0.6 + (lb?.reputation ?? 40) / 250); }
  return m;
};
registerMod('chartUnits', 'license17', (s, v, c) => {
  const rel = c.release;
  if (!rel) return null;
  if (rel.owner === 'player') { const m = outMult(s); return m > 1 ? { value: v * m, label: l('Licenciados no exterior', 'Licensees abroad') } : null; }
  // os discos do selo que você distribui ganham o seu mercado
  const d = lic17(s).list.find((x) => x.dir === 'in' && x.status === 'active' && x.lb === rel.owner);
  return d ? { value: v * (1 + weightIn(s, s.labels[rel.owner]?.territories ?? [], d.market) * 0.8) } : null;
});

registerSimHook('month', 'license17', (s) => {
  const st = lic17(s);
  const r = Rng.fromSeed(`${s.config.seed}:lic17:${s.year}:${s.month}`);
  const sales = Math.max(0, s.lastMonthLedger?.sales ?? 0);
  const mult = outMult(s);
  for (const d of st.list) {
    if (d.status === 'offer' && d.expires < s.week) d.status = 'ended';
    if (d.status !== 'active') continue;
    const lb = s.labels[d.lb];
    if (!lb?.active || d.until < s.week) { d.status = 'ended'; log(s, fmtL(l('Acordo com {lb} em {m} terminou.', 'Deal with {lb} in {m} ended.'), { lb: lb?.name ?? '?', m: mkName(d.market) })); continue; }
    if (d.dir === 'in') {
      const v = estIn(s, d);
      if (v > 0) { post(s, `lic17in:${d.id}:${s.month}`, v, 'sales', `Distribuição ${lb.name} (${d.market})`); d.earned += v; lb.cash -= v; }
      // rival cresce com você: reputação deles sobe
      lb.reputation = clamp(lb.reputation + 0.2, 0, 100);
    } else {
      if (s.player.territories.includes(d.market)) {
        const fine = Math.round(d.adv * 0.5);
        post(s, `lic17x:${d.id}`, -fine, 'legal', `Quebra de exclusividade com ${lb.name}`);
        d.status = 'ended';
        const t = fmtL(l('Você abriu {m} por conta própria e rompeu a exclusividade de {lb}: multa de {v}.', 'You opened {m} yourself and broke {lb}\'s exclusivity: {v} penalty.'), { m: mkName(d.market), lb: lb.name, v: `$${Math.round(fine / 100).toLocaleString('en-US')}` });
        log(s, t); notify(s, t, 'bad');
        s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 10;
        continue;
      }
      // royalty: dos discos vendidos lá, você recebe só a fatia; o resto (já creditado nas vendas) vai ao licenciado
      const extra = sales * weightIn(s, s.player.territories, d.market) * 0.7 * (0.6 + lb.reputation / 250) / mult;
      const theirs = Math.round(extra * (1 - d.share));
      if (theirs > 0) { post(s, `lic17out:${d.id}:${s.month}`, -theirs, 'distribution', `Parte do licenciado ${lb.name}`); lb.cash += theirs; }
      d.earned += Math.round(extra - theirs);
    }
  }
  st.list = st.list.filter((d) => d.status !== 'ended' || s.week - d.since < 104).slice(-30);
  // novas propostas (no máx. 2 abertas)
  if (st.list.filter((d) => d.status === 'offer').length >= 2 || !r.chance(0.25)) return;
  if (r.chance(0.55) && s.player.territories.length) {
    const m = r.pick(s.player.territories);
    const cands = Object.values(s.labels).filter((x) => x.active && !x.territories.includes(m) && labelMonthGross(s, x) > 0 && !st.list.some((d) => d.dir === 'in' && d.lb === x.id && d.status !== 'ended'));
    if (!cands.length) return;
    const lb = cands.sort((a, b) => labelMonthGross(s, b) - labelMonthGross(s, a))[r.int(0, Math.min(2, cands.length - 1))];
    const share = Math.round(r.float(0.22, 0.35) * 100) / 100;
    const est = labelMonthGross(s, lb) * weightIn(s, lb.territories, m) * share;
    st.list.push({ id: `li17:${s.week}:${lb.id}:${m}`, dir: 'in', lb: lb.id, market: m, adv: Math.max(money(s, 1000), Math.round(est * r.float(4, 8))), share, until: s.week + 52 * r.int(2, 3), since: 0, earned: 0, status: 'offer', expires: s.week + 8,
      why: fmtL(l('{lb} não tem operação em {m} e quer que você prense e venda os discos dela lá.', '{lb} has no operation in {m} and wants you to press and sell its records there.'), { lb: lb.name, m: mkName(m) }) });
  } else {
    const t = pitchTargets(s);
    if (!t.length || s.player.revenueByYear[s.year - 1] === undefined) return;
    const x = r.pick(t);
    if (st.list.some((d) => d.dir === 'out' && d.market === x.m && d.status !== 'ended')) return;
    const d = mkOut(s, r, x.lb, x.m);
    d.why = fmtL(l('{lb} opera em {m}, onde você não está, e quer licenciar o seu catálogo.', '{lb} operates in {m}, where you are absent, and wants to license your catalog.'), { lb: x.lb.name, m: mkName(x.m) });
    st.list.push(d);
  }
});
