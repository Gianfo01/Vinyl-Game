// Contratos, negociação, recoupment e promessas (GDD §11).

import { clamp, type Rng } from '../core/rng';
import { toReal } from '../core/money';
import { l, type L } from '../data/world';
import { mainAmbition } from './people';
import type { Act, Contract, GameState, Offer } from './types';
import { fmtL, hasCard, hasMutator, money, nextId, notify, playerActs, post, remember, rngOf, staffCount } from './util';
import { CONTRACT_MODELS } from '../data/rules';
import { hqCaps } from './branches';
import { perk } from './perks';

// Ganchos de negociação (rodada 8): sistemas como a identidade do selo e o estilo de liderança mexem na
// avaliação das ofertas (com motivo visível) e na chance de renovação, sem editar este arquivo.
export interface ContractHook {
  offer?: (s: GameState, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>) => { score: number; reason?: L } | null;
  renew?: (s: GameState, act: Act) => number;
}
const CONTRACT_HOOKS: { id: string; h: ContractHook }[] = [];
export function registerContractHook(id: string, h: ContractHook): void {
  const i = CONTRACT_HOOKS.findIndex((x) => x.id === id);
  if (i >= 0) CONTRACT_HOOKS[i] = { id, h };
  else CONTRACT_HOOKS.push({ id, h });
}

export function expectedAdvance(s: GameState, act: Act): number {
  // dólares reais
  let v = 800 + act.fame * act.fame * 30 + act.fame * 150;
  if (hasMutator(s, 'golden_age')) v *= 1.5;
  if (hasMutator(s, 'cruel_industry')) v *= 0.85;
  return v;
}

export function defaultOffer(s: GameState, act: Act): Omit<Offer, 'id' | 'week' | 'status'> {
  return {
    actId: act.id,
    model: 'classic',
    advance: money(s, Math.round(expectedAdvance(s, act) / 100) * 100),
    royalty: Math.round((0.14 + act.fame / 600) * 100) / 100,
    termMonths: 36,
    releasesOwed: 3,
    creativeControl: false,
    publishing: false,
    share360: 0,
    promises: [],
    distributionFee: 0.2,
  };
}

export interface OfferEval {
  score: number;
  p: number;
  band: 'likely' | 'uncertain' | 'unlikely';
  reasons: L[];
}

/** Avaliação do ato. A faixa mostrada ao jogador nunca é porcentagem exata (Pesquisa, regra 3). */
export function evaluateOffer(s: GameState, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>): OfferEval {
  const amb = mainAmbition(s, act);
  const reasons: L[] = [];
  const advReal = toReal(o.advance, s.year);
  const exp = expectedAdvance(s, act) * (1 + perk(s, 'advance'));
  const advU = clamp(advReal / exp, 0, 2.5);
  const roy = o.model === 'distribution' ? 1 - (o.distributionFee ?? 0.2) : o.royalty;
  const expRoy = o.model === 'distribution' ? 0.8 : 0.14 + act.fame / 600;
  const royU = clamp(roy / expRoy, 0, 2);
  const w = {
    adv: amb === 'money' || amb === 'security' ? 0.38 : 0.26,
    roy: amb === 'money' ? 0.25 : 0.18,
    control: amb === 'art' || amb === 'freedom' || amb === 'critics' ? 0.22 : 0.08,
    reach: amb === 'fame' || amb === 'status' ? 0.25 : 0.14,
  };
  let score = advU * w.adv + royU * w.roy;
  score += (o.creativeControl ? 1 : 0.35) * w.control;
  const reach = s.player.territories.length / 4 + hqCaps(s).careers / 24 + s.player.reputation.commercial / 160;
  score += clamp(reach, 0.2, 1.6) * w.reach;
  score += (s.player.reputation.artists - 40) / 250;
  score += (act.trust - 50) / 300;
  if (o.model === 'licensing') score += amb === 'freedom' || amb === 'art' ? 0.12 : 0.04;
  if (o.model === '360') {
    score -= amb === 'freedom' || amb === 'art' ? 0.18 : 0.05;
    score -= o.share360 * 0.4;
    if (amb === 'security') score += 0.08;
  }
  if (o.model === 'distribution') score += amb === 'freedom' ? 0.15 : act.fame > 20 ? 0.05 : -0.08;
  if (o.model === 'publishing') score -= 0.05;
  if (o.publishing && o.model !== 'publishing') score -= 0.07;
  const termYears = o.termMonths / 12;
  score += amb === 'security' ? (termYears - 3) * 0.03 : -(termYears - 3) * 0.035;
  score += o.promises.length * 0.06;
  // concorrência: atos visíveis valem mais
  const rivalHeat = act.fame > 12 ? (act.fame - 12) / 120 : 0;
  score -= rivalHeat;
  if (hasCard(s, 'artists_house')) score += 0.06;
  if (hasCard(s, 'emperor')) score -= 0.04;
  if (act.catalogNo && act.fame < 5) score += 0.05;
  score += perk(s, 'offer', act);
  const hookReasons: L[] = [];
  for (const { h: hk } of CONTRACT_HOOKS) {
    const res = hk.offer?.(s, act, o);
    if (!res || !Number.isFinite(res.score)) continue;
    score += res.score;
    if (res.reason && Math.abs(res.score) >= 0.02) hookReasons.push(res.reason);
  }

  if (advU < 0.6) reasons.push(l('Adiantamento abaixo do que esperam.', 'Advance below expectations.'));
  if (advU > 1.4) reasons.push(l('Adiantamento generoso.', 'Generous advance.'));
  if (w.control > 0.15 && !o.creativeControl) reasons.push(l('Valorizam controle criativo.', 'They value creative control.'));
  if (rivalHeat > 0.05) reasons.push(l('Há interesse de rivais.', 'Rivals are interested.'));
  if (reach < 0.5 && w.reach > 0.2) reasons.push(l('Querem alcance que sua sede ainda não tem.', 'They want reach your HQ lacks.'));
  if (o.promises.length) reasons.push(l('Promessas pesam a favor (e viram obrigação).', 'Promises help (and become obligations).'));
  reasons.push(...hookReasons);

  const p = 1 / (1 + Math.exp(-(score - 0.58) * 8));
  // analista estreita a leitura; sem analista, a faixa é mais grosseira
  const fuzz = staffCount(s, 'analyst') ? 0.05 : 0.12;
  const shown = p + (((act.logoSeed % 100) / 100 - 0.5) * fuzz);
  const band = shown > 0.66 ? 'likely' : shown > 0.36 ? 'uncertain' : 'unlikely';
  return { score, p, band, reasons };
}

export function careerSlotsUsed(s: GameState): number {
  return playerActs(s).length;
}

export function makeOffer(s: GameState, o: Omit<Offer, 'id' | 'week' | 'status'>): Offer | null {
  const act = s.acts[o.actId];
  if (!act || act.owner === 'player') return null;
  if (s.offers.some((x) => x.actId === o.actId && x.status === 'pending')) return null;
  const offer: Offer = { ...o, id: nextId(s, 'o'), week: s.week, status: 'pending' };
  s.offers.push(offer);
  const k = s.knowledge[o.actId];
  if (k) k.stage = 'offer';
  return offer;
}

export function withdrawOffer(s: GameState, offerId: string): void {
  const o = s.offers.find((x) => x.id === offerId);
  if (o && o.status === 'pending') {
    s.offers.splice(s.offers.indexOf(o), 1);
    const k = s.knowledge[o.actId];
    if (k) k.stage = 'investigating';
  }
}

/** Resolve uma oferta. `live` = resposta na hora (rodada 7): o artista pode pedir tempo para pensar. */
export function resolveOne(s: GameState, r: Rng, o: Offer, live = false): Offer['status'] | 'thinking' {
  const act = s.acts[o.actId];
  if (!act || act.owner) {
    o.status = 'sniped';
    o.note = act?.owner ? s.labels[act.owner]?.name : undefined;
    return 'sniped';
  }
  const ev = evaluateOffer(s, act, o);
  // rival disputa atos públicos (na mesa, ele só aparece se o artista pedir tempo)
  const rivalBid = !live && (act.fame > 10 || (act.catalogNo && s.year >= act.debutYear));
  if (rivalBid) {
    const rival = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 50000)).sort((a, b) => b.aggression - a.aggression)[0];
    if (rival && r.chance((0.15 + rival.aggression * 0.35 - ev.score * 0.2) * (o.thinkUntil !== undefined ? 0.6 : 1))) {
      o.status = 'sniped';
      o.note = rival.name;
      signWithRival(s, act, rival.id, r);
      s.rivalries[rival.id] = (s.rivalries[rival.id] ?? 0) + 15;
      notify(s, fmtL(l('{label} assinou com {act} antes da sua resposta.', '{label} signed {act} before your answer.'), { label: rival.name, act: act.name }), 'bad');
      remember(s, 'sniped', fmtL(l('{label} levou {act} numa disputa com você.', '{label} took {act} from you in a bidding war.'), { label: rival.name, act: act.name }), { actId: act.id });
      return 'sniped';
    }
  }
  // na hora: quem está em dúvida pede alguns dias para pensar (uma vez)
  if (live && o.thinkUntil === undefined && ev.p > 0.3 && ev.p < 0.72 && r.chance(0.45)) {
    o.thinkUntil = s.week + r.int(1, 2);
    o.note = 'thinking';
    const kn = s.knowledge[act.id];
    if (kn) kn.stage = 'negotiation';
    return 'thinking';
  }
  if (r.chance(ev.p)) {
    acceptOffer(s, act, o);
    return 'accepted';
  }
  if (ev.p > 0.25 && r.chance(0.6)) {
    o.status = 'counter';
    o.note = 'advance';
    o.thinkUntil = undefined;
    o.advance = Math.round(o.advance * r.float(1.25, 1.6) + money(s, 500));
    const kn = s.knowledge[act.id];
    if (kn) kn.stage = 'negotiation';
    notify(s, fmtL(l('{act} fez contraproposta: adiantamento maior.', '{act} countered: higher advance.'), { act: act.name }), 'event');
    return 'counter';
  }
  o.status = 'rejected';
  o.thinkUntil = undefined;
  o.note = ev.reasons[0]?.pt;
  const k = s.knowledge[act.id];
  if (k) k.stage = 'investigating';
  act.trust = clamp(act.trust - 3, 0, 100);
  notify(s, fmtL(l('{act} recusou a oferta.', '{act} declined the offer.'), { act: act.name }), 'bad');
  return 'rejected';
}

/** Oferta com resposta imediata (rodada 7). Devolve o desfecho para a interface. */
export function offerNow(s: GameState, r: Rng, o: Omit<Offer, 'id' | 'week' | 'status'>): { offer: Offer | null; result: Offer['status'] | 'thinking' | 'invalid' } {
  const offer = makeOffer(s, o);
  if (!offer) return { offer: null, result: 'invalid' };
  return { offer, result: resolveOne(s, r, offer, true) };
}

/** Pressionar quem pediu tempo: responde já, com um pouco menos de boa vontade. */
export function pressForAnswer(s: GameState, r: Rng, offerId: string): Offer['status'] | 'thinking' | 'invalid' {
  const o = s.offers.find((x) => x.id === offerId && x.status === 'pending');
  if (!o) return 'invalid';
  const act = s.acts[o.actId];
  if (act) act.trust = clamp(act.trust - 4, 0, 100);
  o.thinkUntil = -1;
  return resolveOne(s, r, o, false);
}

/** Respostas dos que pediram tempo (chamado toda semana). */
export function resolveThinking(s: GameState, r: Rng): void {
  for (const o of s.offers) if (o.status === 'pending' && o.thinkUntil !== undefined && o.thinkUntil >= 0 && o.thinkUntil <= s.week) {
    const res = resolveOne(s, r, o, false);
    const act = s.acts[o.actId];
    if (res === 'accepted' && act) notify(s, fmtL(l('{act} pensou e aceitou a sua proposta!', '{act} thought it over and accepted your offer!'), { act: act.name }), 'good');
  }
}

/** Resolve ofertas pendentes no fechamento do mês. Rivais podem chegar antes. */
export function resolveOffers(s: GameState, r: Rng): void {
  for (const o of s.offers) {
    if (o.status !== 'pending') continue;
    resolveOne(s, r, o, false);
  }
  // limpa ofertas antigas resolvidas
  s.offers = s.offers.filter((o) => o.status === 'pending' || o.status === 'counter' || s.week - o.week < 10);
}

/** Recusa a contraproposta para mandar uma nova oferta. */
export function withdrawCounter(s: GameState, offerId: string): void {
  s.offers = s.offers.filter((x) => x.id !== offerId);
}

export function acceptCounter(s: GameState, offerId: string): boolean {
  const o = s.offers.find((x) => x.id === offerId && x.status === 'counter');
  if (!o) return false;
  const act = s.acts[o.actId];
  if (!act || act.owner) {
    o.status = 'sniped';
    return false;
  }
  if (s.player.cash < o.advance) return false;
  acceptOffer(s, act, o);
  return true;
}

export function acceptOffer(s: GameState, act: Act, o: Offer): void {
  o.status = 'accepted';
  const id = nextId(s, 'k');
  const termWeeks = Math.round(o.termMonths * 4.35);
  const c: Contract = {
    id,
    actId: act.id,
    party: 'player',
    model: o.model,
    advance: o.advance,
    royalty: o.model === 'distribution' ? 1 - (o.distributionFee ?? 0.2) : o.royalty,
    termMonths: o.termMonths,
    startWeek: s.week,
    endWeek: s.week + termWeeks,
    releasesOwed: o.releasesOwed,
    releasesDone: 0,
    creativeControl: o.creativeControl,
    publishing: o.publishing || o.model === 'publishing' || o.model === '360',
    share360: o.model === '360' ? Math.max(0.1, o.share360) : 0,
    recoupBalance: o.model === 'distribution' ? 0 : o.advance,
    promises: o.promises.map((kind) => ({ kind, dueWeek: s.week + (kind === 'priority' ? 52 : kind === 'tour' ? 26 : termWeeks) })),
    distributionFee: o.distributionFee,
  };
  s.contracts[id] = c;
  act.owner = 'player';
  act.contractId = id;
  act.trust = clamp(act.trust + 10 + perk(s, 'trust', act), 0, 100);
  act.cash += o.advance;
  if (act.status === 'emerging' && act.fame > 5) act.status = 'active';
  post(s, `advance:${act.id}`, -o.advance, 'advances', `Adiantamento ${act.name}`);
  const k = s.knowledge[act.id];
  if (k) k.stage = 'negotiation';
  s.delegated[act.id] = s.delegated[act.id] ?? true;
  s.player.stats.signed += 1;
  notify(s, fmtL(l('{act} assinou com você!', '{act} signed with you!'), { act: act.name }), 'good');
  remember(s, 'signed', fmtL(l('{act} assinou contrato ({model}) com {company}.', '{act} signed a {model} deal with {company}.'), { act: act.name, model: CONTRACT_MODELS.find((m) => m.id === o.model)?.name ?? o.model, company: s.config.companyName }), { actId: act.id, important: true });
}

export function signWithRival(s: GameState, act: Act, labelId: string, r: Rng): void {
  const lb = s.labels[labelId];
  const id = nextId(s, 'k');
  s.contracts[id] = {
    id, actId: act.id, party: labelId, model: lb.family === 'A' && r.chance(0.3) ? '360' : 'classic',
    advance: money(s, expectedAdvance(s, act)), royalty: r.float(0.12, 0.2), termMonths: 48,
    startWeek: s.week, endWeek: s.week + 208, releasesOwed: 4, releasesDone: 0, creativeControl: r.chance(0.3),
    publishing: lb.family === 'D', share360: 0, recoupBalance: money(s, expectedAdvance(s, act)), promises: [],
  };
  lb.cash -= money(s, expectedAdvance(s, act));
  act.owner = labelId;
  act.contractId = id;
  lb.roster.push(act.id);
  if (act.status === 'emerging') act.status = 'active';
  const k = s.knowledge[act.id];
  if (k && k.stage !== 'signal') k.stage = 'monitoring';
}

/** Libera o ato do contrato (vencimento, rescisão ou saída negociada). */
export function endContract(s: GameState, act: Act, reason: 'expired' | 'terminated' | 'left'): void {
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c) c.endWeek = Math.min(c.endWeek, s.week);
  if (act.owner && act.owner !== 'player') {
    const lb = s.labels[act.owner];
    if (lb) lb.roster = lb.roster.filter((x) => x !== act.id);
  }
  const wasPlayer = act.owner === 'player';
  act.owner = act.playerBand ? 'player' : null;
  act.contractId = undefined;
  if (wasPlayer && !act.playerBand) {
    delete s.agenda[act.id];
    const why = { expired: l('fim do contrato', 'contract ended'), terminated: l('rescisão', 'termination'), left: l('saída por insatisfação', 'left unhappy') }[reason];
    notify(s, fmtL(l('{act} deixou o selo ({reason}).', '{act} left the label ({reason}).'), { act: act.name, reason: why }), reason === 'expired' ? 'info' : 'bad');
    remember(s, 'left', fmtL(l('{act} saiu do selo: {reason}.', '{act} left the label: {reason}.'), { act: act.name, reason: why }), { actId: act.id, important: true });
    if (reason === 'left') s.player.stats.leftUnhappy += 1;
  }
}

/** Renovação: oferece mais um termo ao ato próprio. */
export function renewContract(s: GameState, actId: string, months: number, bonus: number): boolean {
  const act = s.acts[actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  if (!act || !c || c.party !== 'player') return false;
  if (s.player.cash < bonus) return false;
  const r = rngOf(s);
  const extra = CONTRACT_HOOKS.reduce((t, x) => t + (x.h.renew?.(s, act) ?? 0), 0);
  const p = clamp(0.25 + act.trust / 100 + toReal(bonus, s.year) / expectedAdvance(s, act) * 0.3 + extra, 0, 0.97);
  if (!r.chance(p)) {
    act.trust -= 4;
    notify(s, fmtL(l('{act} não quis renovar agora.', '{act} did not want to renew now.'), { act: act.name }), 'bad');
    return false;
  }
  c.endWeek = Math.max(c.endWeek, s.week) + Math.round(months * 4.35);
  c.termMonths += months;
  c.releasesOwed += Math.ceil(months / 14);
  c.recoupBalance += bonus;
  act.cash += bonus;
  post(s, `renew:${actId}`, -bonus, 'advances', `Renovação ${act.name}`);
  notify(s, fmtL(l('{act} renovou por {m} meses.', '{act} renewed for {m} months.'), { act: act.name, m: months }), 'good');
  return true;
}

/** Aumentar royalties de um ato próprio: custa margem, ganha confiança. */
export function raiseRoyalty(s: GameState, actId: string, delta: number): boolean {
  const act = s.acts[actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  if (!act || !c || c.party !== 'player') return false;
  c.royalty = clamp(c.royalty + delta, 0, 0.6);
  act.trust = clamp(act.trust + delta * 120, 0, 100);
  remember(s, 'renegotiation', fmtL(l('Royalties de {a} renegociados para {r}%.', '{a} royalties renegotiated to {r}%.'), { a: act.name, r: Math.round(c.royalty * 100) }), { actId });
  return true;
}

/** Promessas geram memória: descumprir reduz confiança (GDD §11). */
export function checkPromises(s: GameState): void {
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.endWeek < s.week) continue;
    const act = s.acts[c.actId];
    if (!act) continue;
    for (const p of c.promises) {
      if (p.kept !== undefined || s.week < p.dueWeek) continue;
      let kept = true;
      if (p.kind === 'priority') kept = act.releases.some((rid) => s.releases[rid] && s.releases[rid].week >= c.startWeek);
      if (p.kind === 'tour') kept = (act.history.length > 0 && s.memory.some((m) => m.actId === act.id && m.kind === 'gigs' && m.week >= c.startWeek));
      if (p.kind === 'freedom') kept = c.creativeControl;
      p.kept = kept;
      if (!kept) {
        act.trust = clamp(act.trust - 18, 0, 100);
        s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
        remember(s, 'broken_promise', fmtL(l('Promessa quebrada com {act} ({kind}).', 'Broken promise to {act} ({kind}).'), { act: act.name, kind: p.kind }), { actId: act.id, important: true });
        notify(s, fmtL(l('Você descumpriu uma promessa a {act}.', 'You broke a promise to {act}.'), { act: act.name }), 'bad');
      } else {
        act.trust = clamp(act.trust + 6, 0, 100);
      }
    }
  }
}
