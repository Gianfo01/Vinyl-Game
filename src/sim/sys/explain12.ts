// Rodada 12 — resultados explicáveis e menos previsíveis. O "Por que deu nisso?" (explain8, lançamentos)
// estende-se a contratações, renovações, turnês e festivais:
//   ANTES da decisão: faixa provável do resultado, principais riscos e qualidade da informação disponível
//   (depende do quanto você conhece o artista e da equipe: A&R, analista, booking, gerente de turnê...).
//   DEPOIS: o que a sua escolha influenciou, o que aconteceu no mercado e o que surpreendeu a equipe.
// Variação controlada: humor mensal do artista (offers12), "buzz" mensal por cidade/gênero na procura por
// shows e humor na renovação — tudo por hash (sem consumir o Rng do jogo, determinístico por semente).

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { FESTIVALS } from '../../data/catalog';
import { cityById, l, type L } from '../../data/world';
import { evaluateOffer, expectedAdvance, registerContractHook, renewContract } from '../contracts';
import { registerMod, registerSimHook } from '../ext4';
import { renewalAdj } from '../rights';
import { cityDemand, type TourEstimate, type TourPlan } from '../tours';
import type { Act, GameState, Offer } from '../types';
import { fmtL, notify, playerActs, staffCount, staffSkill } from '../util';
import { festCapacity, festFee, festTierFor, editionOf, TIER_NAME, type FestTier } from './fests8';
import { comparePackages, hu, moodOf, packageFromOffer, rivalPackages } from './offers12';

// ---------------------------------------------------------------- tipos

export type DecisionKind = 'signing' | 'renewal' | 'tour' | 'festival';
export interface InfoQuality { q: number; label: L; why: L[] }
export interface Forecast12 {
  kind: DecisionKind;
  /** faixa provável (0..1 para chances; unidades para turnês/festivais) */
  lo: number; hi: number;
  unit: 'chance' | 'tickets' | 'crowd';
  headline: L;
  risks: L[];
  info: InfoQuality;
}
export interface Debrief12 {
  id: string; week: number; year: number; month: number; kind: DecisionKind; actId: string;
  title: L; tone: 'good' | 'bad' | 'info';
  influenced: L[]; market: L[]; surprise: L[];
}
export interface Explain12State { log: Debrief12[]; tourSnap: Record<string, { sold: number; cap: number }>; festSnap: Record<string, { crowd: number; fame: number }>; done: string[] }
declare module '../ext4' {
  interface Ext4 { explain12: Explain12State }
}
export function ex12(s: GameState): Explain12State {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  const st = (x.x4.explain12 ??= { log: [], tourSnap: {}, festSnap: {}, done: [] }) as Explain12State;
  st.log ??= []; st.tourSnap ??= {}; st.festSnap ??= {}; st.done ??= [];
  return st;
}
export function addDebrief(s: GameState, d: Omit<Debrief12, 'id' | 'week' | 'year' | 'month'>, notifyIt = true): Debrief12 {
  const st = ex12(s);
  const full: Debrief12 = { ...d, id: `d12-${s.week}-${st.log.length}-${d.actId}`, week: s.week, year: s.year, month: s.month };
  st.log.unshift(full);
  if (st.log.length > 40) st.log.length = 40;
  if (notifyIt) notify(s, fmtL(l('Por que deu nisso? {t}', 'Why did this happen? {t}'), { t: d.title }), d.tone);
  return full;
}

const monthKey = (s: GameState) => s.year * 12 + s.month;

// ---------------------------------------------------------------- qualidade da informação

const QLABEL = (q: number): L => q < 0.35 ? l('pobre', 'poor') : q < 0.55 ? l('razoável', 'fair') : q < 0.75 ? l('boa', 'good') : l('excelente', 'excellent');

export function infoQuality(s: GameState, kind: DecisionKind, act?: Act): InfoQuality {
  const why: L[] = [];
  const analyst = staffCount(s, 'analyst') > 0;
  let q = analyst ? 0.12 : 0;
  if (!analyst) why.push(l('Sem analista: as faixas ficam largas.', 'No analyst: ranges stay wide.'));
  if (kind === 'signing') {
    const deg = act ? s.knowledge[act.id]?.degree ?? 0 : 0;
    q += deg / 5 * 0.5 + staffSkill(s, 'anr') / 100 * 0.2 + Math.min(0.1, (s.scouts?.length ?? 0) * 0.04);
    if (deg < 3) why.push(l('Pouco scouting deste artista: ambições e rivais são palpite.', 'Little scouting on this act: ambitions and rivals are guesses.'));
    if (!staffCount(s, 'anr')) why.push(l('Um A&R leria melhor o que o artista quer.', 'An A&R would read what the act wants better.'));
  } else if (kind === 'renewal') {
    q += 0.35 + staffSkill(s, 'manager') / 100 * 0.15 + (act && act.trust > 60 ? 0.12 : 0);
    if (act && act.trust <= 60) why.push(l('A confiança é baixa: o artista não abre o jogo.', 'Trust is low: the act keeps its cards close.'));
  } else if (kind === 'tour') {
    q += 0.25 + staffSkill(s, 'tour_manager') / 100 * 0.25 + staffSkill(s, 'booking') / 100 * 0.12;
    if (!staffCount(s, 'tour_manager')) why.push(l('Sem gerente de turnê: custo e público são mais incertos.', 'No tour manager: costs and crowds are less certain.'));
  } else {
    q += 0.3 + staffSkill(s, 'booking') / 100 * 0.25 + staffSkill(s, 'agent') / 100 * 0.1;
    if (!staffCount(s, 'booking')) why.push(l('Sem booking: você não sabe o que a produção paga a outros.', 'No booking agent: you do not know what producers pay others.'));
  }
  q = clamp(q, 0.08, 0.95);
  return { q, label: QLABEL(q), why };
}

/** Faixa em torno do valor real: largura e viés diminuem com a qualidade da informação (viés pode enganar!). */
export function rangeAround(s: GameState, key: string, v: number, q: number, rel = false): [number, number] {
  const w = (0.08 + (1 - q) * 0.4) * (rel ? Math.max(1, v) : 1);
  const bias = (hu(s, `bias:${key}:${monthKey(s)}`) - 0.5) * (1 - q) * 0.3 * (rel ? Math.max(1, v) : 1);
  const c = v + bias;
  return rel ? [Math.max(0, c - w / 2), c + w / 2] : [clamp(c - w / 2, 0.02, 0.98), clamp(c + w / 2, 0.02, 0.98)];
}

// ---------------------------------------------------------------- variação controlada

/** "Buzz" do mês por cidade e gênero: ±10% na procura por shows (a estimativa de hoje não é a do show). */
registerMod('cityDemand', 'buzz12', (s, value, ctx) => {
  if (!ctx.act || !ctx.cityId) return null;
  const b = (hu(s, `buzz:${ctx.cityId}:${ctx.act.genre}:${monthKey(s)}`) - 0.5) * 0.2;
  return { value: value * (1 + b) };
});
/** Humor na hora de renovar (−0,05..+0,05). */
export const renewMood = (s: GameState, act: Act) => (hu(s, `renew:${act.id}:${monthKey(s)}`) - 0.5) * 0.1;
registerContractHook('explain12', { renew: (s, act) => renewMood(s, act) });

// ---------------------------------------------------------------- ANTES: previsões

export function forecastSigning(s: GameState, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>): Forecast12 {
  const info = infoQuality(s, 'signing', act);
  const ev = evaluateOffer(s, act, o);
  const [lo, hi] = rangeAround(s, `sign:${act.id}`, ev.p, info.q);
  const risks: L[] = [];
  const rivals = rivalPackages(s, act);
  if (rivals.length) {
    const cmp = comparePackages(s, act, [packageFromOffer(s, o), ...rivals]);
    risks.push(info.q >= 0.45 ? cmp.verdict : fmtL(l('{n} selo(s) rival(is) rondando — detalhes incertos.', '{n} rival label(s) circling — details uncertain.'), { n: rivals.length }));
  }
  if (s.player.cash - o.advance < 0) risks.push(l('O adiantamento passa do caixa.', 'The advance exceeds your cash.'));
  else if (s.player.cash - o.advance - (o.pk12?.tour ?? 0) - (o.pk12?.mkt ?? 0) < 0) risks.push(l('Verba prometida maior que o caixa: risco de quebrar a promessa.', 'Pledged budget exceeds cash: risk of breaking the promise.'));
  if (o.promises.length) risks.push(l('Promessas viram obrigação com prazo.', 'Promises become obligations with deadlines.'));
  if (toReal(o.advance, s.year) > expectedAdvance(s, act) * 1.6) risks.push(l('Adiantamento alto demais demora a recuperar.', 'An oversized advance takes long to recoup.'));
  if (info.q >= 0.6 && Math.abs(moodOf(s, act)) > 0.035) risks.push(moodOf(s, act) > 0 ? l('A equipe sente o artista animado este mês.', 'The team senses the act is upbeat this month.') : l('A equipe sente o artista desconfiado este mês.', 'The team senses the act is wary this month.'));
  return { kind: 'signing', lo, hi, unit: 'chance', headline: l('Chance de aceite', 'Chance of acceptance'), risks, info };
}

export function renewChance(s: GameState, act: Act, bonus: number): number {
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (!c) return 0;
  return clamp(0.25 + act.trust / 100 + toReal(bonus, s.year) / expectedAdvance(s, act) * 0.3 + renewalAdj(s, c) + renewMood(s, act), 0, 0.97);
}

export function forecastRenewal(s: GameState, act: Act, bonus: number): Forecast12 {
  const info = infoQuality(s, 'renewal', act);
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const [lo, hi] = rangeAround(s, `renew:${act.id}`, renewChance(s, act, bonus), info.q);
  const risks: L[] = [];
  if (c && act.fame > (c.fameAtSign ?? act.fame) + 10) risks.push(l('O artista cresceu desde a assinatura: sabe que vale mais.', 'The act has grown since signing: they know their worth.'));
  if (act.trust < 45) risks.push(l('Confiança baixa: uma recusa custa mais confiança.', 'Low trust: a refusal costs more trust.'));
  if (c?.promises.some((p) => p.kept === false)) risks.push(l('Há promessa quebrada neste contrato.', 'There is a broken promise in this deal.'));
  if (s.player.cash < bonus) risks.push(l('Sem caixa para o bônus.', 'No cash for the bonus.'));
  return { kind: 'renewal', lo, hi, unit: 'chance', headline: l('Chance de renovar', 'Chance to renew'), risks, info };
}

export function forecastTour(s: GameState, plan: TourPlan, est: TourEstimate): Forecast12 {
  const act = s.acts[plan.actId];
  const info = infoQuality(s, 'tour', act);
  const cap = est.stops.reduce((x, st) => x + st.capacity, 0);
  const exp = est.stops.reduce((x, st) => x + Math.min(st.capacity, Math.round(cityDemand(s, act, st.cityId) * (plan.role === 'opening' ? 0.3 : 1) / Math.pow(plan.priceMult, 1.2))), 0);
  const [lo, hi] = rangeAround(s, `tour:${act.id}`, exp, info.q, true);
  const risks: L[] = [...est.warnings.slice(0, 2)];
  const fat = act.members.reduce((x, id) => x + (s.persons[id]?.fatigue ?? 0), 0) / Math.max(1, act.members.length);
  if (fat > 55) risks.push(l('O grupo já está cansado: risco de cancelamentos.', 'The group is already tired: risk of cancellations.'));
  if (plan.priceMult >= 1.5) risks.push(l('Ingresso caro afasta o público casual.', 'Pricey tickets push away casual fans.'));
  if (plan.setlist.length < Math.ceil(plan.minutes / 4)) risks.push(l('Setlist curto: covers diminuem a nota do show.', 'Short setlist: covers lower the show score.'));
  if (est.stops.length > 12 && plan.crew < 4) risks.push(l('Rota longa com equipe pequena: fadiga e acidentes.', 'Long route with a small crew: fatigue and accidents.'));
  risks.push(l('O buzz de cada cidade muda de mês para mês.', 'Each city\'s buzz shifts month to month.'));
  return { kind: 'tour', lo: Math.min(cap, lo), hi: Math.min(cap, hi), unit: 'tickets', headline: fmtL(l('Ingressos prováveis (de {c} lugares)', 'Likely tickets (of {c} seats)'), { c: cap }), risks, info };
}

export function forecastFestival(s: GameState, fi: number, actId: string, tier: FestTier, fee: number): Forecast12 {
  const f = FESTIVALS[fi];
  const act = s.acts[actId];
  const info = infoQuality(s, 'festival', act);
  const can = f && act ? festTierFor(s, f, fi, act) : null;
  const order: FestTier[] = ['headline', 'afternoon', 'opening'];
  let p = 0;
  const risks: L[] = [];
  if (!can) { p = 0.02; risks.push(l('Pelo que se sabe, não está no perfil (som ou tamanho).', 'As far as anyone knows, not a fit (sound or size).')); }
  else if (order.indexOf(tier) < order.indexOf(can)) { p = 0.05; risks.push(fmtL(l('Faixa acima do possível: o provável é contraproposta como "{t}".', 'Slot above reach: likely a counter as "{t}".'), { t: TIER_NAME[can] })); }
  else {
    const ratio = fee / Math.max(1, festFee(s, f, act, tier));
    const b = staffSkill(s, 'booking') / 400;
    p = ratio <= 1.05 + b ? 0.95 : ratio <= 1.3 + b ? 0.5 : ratio <= 2 ? 0.12 : 0.02;
    if (ratio > 1.3 + b) risks.push(l('Cachê acima do que a produção costuma pagar.', 'Fee above what the producers usually pay.'));
    if (ratio < 0.8) risks.push(l('Cachê abaixo do justo: aceito, mas você deixa dinheiro na mesa.', 'Fee below fair: accepted, but you leave money on the table.'));
  }
  const ed = editionOf(s, fi);
  if (ed && ed.month - s.month <= 1) risks.push(l('Edição muito próxima: line-up quase fechado.', 'Edition very close: line-up almost closed.'));
  risks.push(l('O público do dia depende dos headliners e do tempo.', 'The day\'s crowd depends on headliners and weather.'));
  const [lo, hi] = rangeAround(s, `fest:${fi}:${actId}`, p, info.q);
  return { kind: 'festival', lo, hi, unit: 'chance', headline: l('Chance de fechar', 'Chance to close'), risks, info };
}

// ---------------------------------------------------------------- DEPOIS: leituras

/** Renovação com leitura: devolve o resultado e grava o porquê. */
export function renewWithReading(s: GameState, actId: string, months: number, bonus: number): boolean {
  const act = s.acts[actId];
  if (!act) return false;
  const p = renewChance(s, act, bonus);
  const mood = renewMood(s, act);
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const grown = c ? act.fame - (c.fameAtSign ?? act.fame) : 0;
  const ok = renewContract(s, actId, months, bonus);
  if (s.player.cash < bonus && !ok) return false;
  const influenced: L[] = [
    fmtL(l('Bônus oferecido: pesou {x} na decisão.', 'Bonus offered: weighed {x} in the decision.'), { x: toReal(bonus, s.year) / expectedAdvance(s, act) > 0.5 ? l('bastante', 'a lot') : l('pouco', 'little') }),
    fmtL(l('Confiança de {a} no selo: {t}.', '{a}\'s trust in the label: {t}.'), { a: act.name, t: Math.round(act.trust) }),
  ];
  const market: L[] = grown > 8 ? [l('O artista cresceu desde a assinatura e o mercado sabe disso: rivais acenam.', 'The act grew since signing and the market knows it: rivals are waving.')] : [l('Pouco assédio de rivais por enquanto.', 'Little rival courting for now.')];
  const surprise: L[] = [];
  if (ok && p < 0.45) surprise.push(l('A equipe não esperava o sim.', 'The team did not expect the yes.'));
  if (!ok && p > 0.65) surprise.push(l('A equipe dava como certo — o artista estava num mês ruim.', 'The team took it for granted — the act was in a bad month.'));
  if (Math.abs(mood) > 0.035) surprise.push(mood > 0 ? l('O humor do mês ajudou.', 'This month\'s mood helped.') : l('O humor do mês atrapalhou.', 'This month\'s mood got in the way.'));
  addDebrief(s, { kind: 'renewal', actId, tone: ok ? 'good' : 'bad', title: fmtL(ok ? l('{a} renovou.', '{a} renewed.') : l('{a} não renovou.', '{a} did not renew.'), { a: act.name }), influenced, market, surprise }, false);
  return ok;
}

function debriefOffers(s: GameState): void {
  const st = ex12(s);
  for (const o of s.offers) {
    if (o.status === 'pending' || o.status === 'counter' || st.done.includes(o.id)) continue;
    st.done.push(o.id);
    const act = s.acts[o.actId];
    if (!act) continue;
    const influenced: L[] = [];
    const market: L[] = [];
    const surprise: L[] = [];
    const ev = evaluateOffer(s, act, o);
    influenced.push(...ev.reasons.slice(0, 3));
    if (o.pk12) influenced.push(fmtL(l('Pacote: adiantamento {v}, royalty {r}%, prazo {m} meses.', 'Package: advance {v}, royalty {r}%, term {m} months.'), { v: `$${Math.round(o.advance / 100).toLocaleString('pt-BR')}`, r: Math.round(o.royalty * 100), m: o.termMonths }));
    const rivals = o.status === 'accepted' ? [] : rivalPackages(s, act);
    if (o.status === 'sniped') market.push(fmtL(l('{r} chegou antes com outro pacote.', '{r} got there first with another package.'), { r: o.note ?? l('Um rival', 'A rival') }));
    else if (rivals.length) market.push(fmtL(l('{n} rival(is) disputavam o artista.', '{n} rival(s) were courting the act.'), { n: rivals.length }));
    else market.push(l('Ninguém mais estava na mesa.', 'Nobody else was at the table.'));
    if (o.status === 'accepted' && ev.p < 0.4) surprise.push(l('Aceitou mesmo com a leitura apontando contra.', 'Accepted even though the read pointed against.'));
    if (o.status === 'rejected' && ev.p > 0.6) surprise.push(l('Recusou uma proposta que parecia boa — algo pessoal pesou.', 'Turned down an offer that looked good — something personal weighed in.'));
    const m = moodOf(s, act);
    if (Math.abs(m) > 0.04) surprise.push(m > 0 ? l('Estava num mês animado.', 'They were in an upbeat month.') : l('Estava num mês desconfiado.', 'They were in a wary month.'));
    const ok = o.status === 'accepted';
    addDebrief(s, { kind: 'signing', actId: act.id, tone: ok ? 'good' : 'bad', title: fmtL(ok ? l('{a} assinou.', '{a} signed.') : o.status === 'sniped' ? l('{a} foi para um rival.', '{a} went to a rival.') : l('{a} recusou.', '{a} declined.'), { a: act.name }), influenced, market, surprise }, false);
  }
  if (st.done.length > 200) st.done = st.done.slice(-200);
}

function debriefTours(s: GameState): void {
  const st = ex12(s);
  for (const t of s.tours) {
    const act = s.acts[t.actId];
    if (!act || (act.owner !== 'player' && !act.playerBand)) continue;
    if (t.status === 'planned' && !st.tourSnap[t.id]) {
      st.tourSnap[t.id] = { sold: t.stops.reduce((x, p) => x + Math.min(p.capacity, cityDemand(s, act, p.cityId) * (t.role === 'opening' ? 0.3 : 1)), 0), cap: t.stops.reduce((x, p) => x + p.capacity, 0) };
    }
    if (t.status !== 'done' || st.done.includes(t.id)) continue;
    st.done.push(t.id);
    const snap = st.tourSnap[t.id];
    delete st.tourSnap[t.id];
    const played = t.stops.filter((x) => x.status === 'played');
    const sold = played.reduce((x, p) => x + p.sold, 0);
    const cap = played.reduce((x, p) => x + p.capacity, 0);
    const influenced: L[] = [
      fmtL(l('Produção de palco nível {p} e equipe de {c}.', 'Stage production level {p} and a crew of {c}.'), { p: t.production, c: t.crew }),
      t.setlist.length < Math.ceil(t.minutes / 4) ? l('Setlist com covers derrubou a nota dos shows.', 'A setlist padded with covers lowered show scores.') : l('Setlist de gravações próprias segurou a plateia.', 'A setlist of own recordings held the crowd.'),
      fmtL(l('Lotação média: {p}%.', 'Average fill: {p}%.'), { p: cap ? Math.round(sold / cap * 100) : 0 }),
    ];
    const best = played.slice().sort((a, b) => b.sold / b.capacity - a.sold / a.capacity)[0];
    const worst = played.slice().sort((a, b) => a.sold / a.capacity - b.sold / b.capacity)[0];
    const market: L[] = [];
    if (best) market.push(fmtL(l('{c} foi a praça mais quente.', '{c} was the hottest market.'), { c: cityById[best.cityId]?.name ?? best.cityId }));
    if (worst && worst !== best) market.push(fmtL(l('{c} esfriou.', '{c} was cold.'), { c: cityById[worst.cityId]?.name ?? worst.cityId }));
    const gp = s.genrePop[act.genre] ?? 0.6;
    market.push(gp > 1 ? l('O gênero está em alta.', 'The genre is hot.') : gp < 0.5 ? l('O gênero está em baixa.', 'The genre is down.') : l('Gênero estável.', 'Genre steady.'));
    const surprise: L[] = [];
    const cancelled = t.stops.filter((x) => x.status === 'cancelled').length;
    if (cancelled) surprise.push(fmtL(l('{n} data(s) canceladas no caminho (clima, visto, saúde).', '{n} date(s) cancelled along the way (weather, visa, health).'), { n: cancelled }));
    if (t.accidents) surprise.push(fmtL(l('{n} incidente(s) na estrada.', '{n} incident(s) on the road.'), { n: t.accidents }));
    let tone: Debrief12['tone'] = 'info';
    if (snap && snap.sold > 0) {
      const r = sold / snap.sold;
      if (r > 1.15) { surprise.push(fmtL(l('Vendeu {p}% acima do que a equipe previa.', 'Sold {p}% more than the team expected.'), { p: Math.round((r - 1) * 100) })); tone = 'good'; }
      else if (r < 0.85) { surprise.push(fmtL(l('Vendeu {p}% abaixo da previsão.', 'Sold {p}% below forecast.'), { p: Math.round((1 - r) * 100) })); tone = 'bad'; }
    }
    addDebrief(s, { kind: 'tour', actId: act.id, tone, title: fmtL(l('{t}: {n} ingressos.', '{t}: {n} tickets.'), { t: t.name, n: sold.toLocaleString('pt-BR') }), influenced, market, surprise });
  }
}

function debriefFests(s: GameState): void {
  const st = ex12(s);
  const fs = (s as unknown as { x4: Record<string, unknown> }).x4?.fest8 as { editions?: { fi: number; year: number; month: number; lineup: { actId: string; tier: FestTier; fee: number }[]; done: boolean; crowd?: number }[] } | undefined;
  const mine = new Set(playerActs(s));
  for (const ed of fs?.editions ?? []) {
    const f = FESTIVALS[ed.fi];
    if (!f) continue;
    for (const slot of ed.lineup) {
      if (!mine.has(slot.actId)) continue;
      const key = `${ed.fi}:${ed.year}:${slot.actId}`;
      const act = s.acts[slot.actId];
      if (!act) continue;
      if (!ed.done) {
        if (!st.festSnap[key]) {
          const heads = ed.lineup.filter((x) => x.tier === 'headline').map((x) => s.acts[x.actId]).filter(Boolean);
          const pull = heads.reduce((x, a) => x + a.fame, 0) / Math.max(1, heads.length);
          st.festSnap[key] = { crowd: Math.round(clamp(0.45 + pull / 180, 0.2, 1) * 100), fame: act.fame };
        }
        continue;
      }
      if (st.done.includes(key)) continue;
      st.done.push(key);
      const snap = st.festSnap[key];
      delete st.festSnap[key];
      const fair = festFee(s, f, act, slot.tier);
      const influenced: L[] = [
        fmtL(l('Faixa "{t}" no {f} (prestígio {p}).', '"{t}" slot at {f} (prestige {p}).'), { t: TIER_NAME[slot.tier], f: f.name, p: f.prestige }),
        slot.fee > fair * 1.1 ? l('Você arrancou um cachê acima da tabela.', 'You squeezed a fee above the going rate.') : slot.fee < fair * 0.9 ? l('O cachê ficou abaixo do justo.', 'The fee ended below fair.') : l('Cachê dentro da tabela.', 'Fee at the going rate.'),
      ];
      if (snap) influenced.push(fmtL(l('Fama: {a} → {b}.', 'Fame: {a} → {b}.'), { a: Math.round(snap.fame), b: Math.round(act.fame) }));
      const market: L[] = [fmtL(l('Público do dia: {c}.', 'Crowd on the day: {c}.'), { c: (ed.crowd ?? 0).toLocaleString('pt-BR') })];
      const surprise: L[] = [];
      if (snap && ed.crowd) {
        const r = ed.crowd / Math.max(1, festCapacity(f) * snap.crowd / 100);
        if (r > 1.08) surprise.push(l('Veio mais gente do que se esperava: tempo bom e headliners em alta.', 'More people came than expected: good weather and hot headliners.'));
        else if (r < 0.92) surprise.push(l('Veio menos gente do que se esperava: tempo ou headliners decepcionaram.', 'Fewer people came than expected: weather or headliners disappointed.'));
      }
      addDebrief(s, { kind: 'festival', actId: act.id, tone: 'good', title: fmtL(l('{a} no {f}.', '{a} at {f}.'), { a: act.name, f: f.name }), influenced, market, surprise });
    }
  }
}

registerSimHook('month', 'explain12', (s) => {
  debriefOffers(s);
  debriefTours(s);
  debriefFests(s);
});
