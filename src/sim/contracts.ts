// Contratos, negociação, recoupment e promessas (GDD §11).

import { scoutEligible20 } from './scout20';
import { clamp, type Rng } from '../core/rng';
import { toReal } from '../core/money';
import { l, type L } from '../data/world';
import { mainAmbition } from './people';
import type { Act, Contract, GameState, Offer } from './types';
import { fmtL, hasMutator, money, nextId, notify, playerActs, post, remember, staffCount } from './util';
import { CONTRACT_MODELS } from '../data/rules';
import { hqCaps } from './branches';
import { perk } from './perks';
import { offerMods } from './ext4';
import { cashWhy20, freeCash20 } from './oblig20';
import { armPromises28, promiseMet28, PROM28_NAME, settlePromise28 } from './sys/promises28';
import { rivalContest28, usd28 } from './sys/rivalsense28';
export { registerOfferMod } from './ext4';
import { rivalSignOk, useMeeting } from './sys/gate14';

// Ganchos de negociação (rodada 8): sistemas como a identidade do selo e o estilo de liderança mexem na
// avaliação das ofertas (com motivo visível) e na chance de renovação, sem editar este arquivo.
export interface ContractHook {
  offer?: (s: GameState, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>) => { score: number; reason?: L } | null;
  renew?: (s: GameState, act: Act) => number;
}
// lista guardada numa função (hoisted): sistemas carregados antes deste módulo terminar já podem registrar
/** R29 (CONNECT): soma dos ganchos de renovação (arcs12, identity, explain12…) — a previsão usa a mesma conta da rolagem. */
export const renewHooks29 = (s: GameState, act: Act): number => contractHooks().reduce((t, x) => t + (x.h.renew?.(s, act) ?? 0), 0);
function contractHooks(): { id: string; h: ContractHook }[] { const f = contractHooks as unknown as { l?: { id: string; h: ContractHook }[] }; return (f.l ??= []); }
export function registerContractHook(id: string, h: ContractHook): void {
  const i = contractHooks().findIndex((x) => x.id === id);
  if (i >= 0) contractHooks()[i] = { id, h };
  else contractHooks().push({ id, h });
}
import { renewalAdj, rightsScore, scopeTerritories, signingTrust } from './rights';
import { advFactor29, isSide29, royTerms29 } from './terms29';
import type { ContractModel } from '../data/rules';
import { rng19 } from './rng19';
import { joinDelegated31 } from './deleg31';

/** R29 (contratos+): ganchos dos modelos novos (empresariamento, produção, joint venture) — sys/contracts29 registra.
 *  `accept` assume o aceite inteiro (empresariamento: o ato não muda de selo); `signed` completa um contrato normal
 *  (produção/JV); `eligible` dá a regra de quem pode receber a proposta do modelo; `reach` troca o "alcance do selo". */
export interface Special29 {
  accept?: (s: GameState, act: Act, o: Offer) => boolean;
  signed?: (s: GameState, act: Act, o: Offer, c: Contract) => void;
  eligible?: (s: GameState, act: Act, model: ContractModel) => { ok: boolean; why?: L } | null;
  reach?: (s: GameState, act: Act, model: ContractModel) => number | null;
  /** NPC assinou (signWithRival): pode virar JV (sorteio próprio ou `model` pedido pela disputa) e compra a produção */
  npcSigned?: (s: GameState, act: Act, lb: import('./types').Label, c: Contract, model?: ContractModel) => void;
}
// guardado numa função (hoisted), como contractHooks: o módulo que registra pode carregar antes deste terminar (ciclo de imports)
export function special29(): Special29 { const f = special29 as unknown as { o?: Special29 }; return (f.o ??= {}); }

/** Quem pode receber uma proposta deste modelo (a regra única do radar, da ficha, da mesa e do aceite).
 *  Modelos de selo: scoutEligible20 (sem contrato). Empresariamento: o ato pode ter selo (rival), não pode ser seu. */
export function offerEligible29(s: GameState, act: Act | undefined, model: ContractModel = 'classic'): { ok: boolean; why?: L; comeback?: boolean } {
  const base = !act || !isSide29({ model }) ? scoutEligible20(s, act) : { ok: true };
  if (!act || !base.ok) return base;
  return special29().eligible?.(s, act, model) ?? base;
}
/** O ato está "tomado" para este modelo? (resolveOne/acceptCounter: assinou com outro no meio do caminho) */
const taken29 = (act: Act, model: ContractModel): boolean => (isSide29({ model }) ? act.owner === 'player' && !act.playerBand : !!act.owner);

/** R29 (integrante B): atos em negociação que ainda não existem no mundo (a banda montada pela oferta, sys/member29) —
 *  sem disputa de rival (ninguém disputa uma banda que não existe) e com resposta na hora (sem "pensar"). */
// lista guardada numa função (hoisted), como contractHooks: sistemas carregados antes deste módulo terminar já registram
function pendingList29(): ((s: GameState, act: Act) => boolean)[] { const f = pendingList29 as unknown as { l?: ((s: GameState, act: Act) => boolean)[] }; return (f.l ??= []); }
export function registerPending29(f: (s: GameState, act: Act) => boolean): void { pendingList29().push(f); }
export function pending29(s: GameState, act: Act): boolean { return pendingList29().some((f) => f(s, act)); }

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
  /** r18: contribuição de cada termo ao placar (antes da curva logística; meio = 0.58) */
  parts?: { t: L; v: number }[];
}

/** Avaliação do ato. A faixa mostrada ao jogador nunca é porcentagem exata (Pesquisa, regra 3). */
export function evaluateOffer(s: GameState, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>): OfferEval {
  const amb = mainAmbition(s, act);
  const reasons: L[] = [];
  const advReal = toReal(o.advance, s.year);
  const exp = expectedAdvance(s, act) * (1 + perk(s, 'advance')) * advFactor29(o.model); // R29: empresário/produção/JV esperam menos luvas
  const advU = clamp(advReal / exp, 0, 2.5);
  const { roy, exp: expRoy } = royTerms29(o, act.fame); // R29 (terms29): mesma conta de sempre nos modelos antigos
  const royU = clamp(roy / expRoy, 0, 2);
  const w = {
    adv: amb === 'money' || amb === 'security' ? 0.38 : 0.26,
    roy: amb === 'money' ? 0.25 : 0.18,
    control: amb === 'art' || amb === 'freedom' || amb === 'critics' ? 0.22 : 0.08,
    reach: amb === 'fame' || amb === 'status' ? 0.25 : 0.14,
  };
  // r18 (explain18): cada termo vira uma parte do "por quê" da chance
  const parts: { t: L; v: number }[] = [];
  let score = 0;
  const add = (t: L, v: number) => { if (!Number.isFinite(v) || !v) return; score += v; parts.push({ t, v }); };
  add(l('Adiantamento vs. expectativa', 'Advance vs. expectation'), advU * w.adv);
  add(l('Royalty vs. expectativa', 'Royalty vs. expectation'), royU * w.roy);
  add(l('Controle criativo', 'Creative control'), (o.creativeControl ? 1 : 0.35) * w.control);
  const reach29 = special29().reach?.(s, act, o.model) ?? null; // R29: empresariamento pesa a sua reputação de empresário
  const reach = reach29 ?? s.player.territories.length / 4 + hqCaps(s).careers / 24 + s.player.reputation.commercial / 160;
  add(reach29 !== null ? l('Sua reputação e alcance como empresário', 'Your reputation and reach as a manager') : l('Alcance do selo (territórios, sede, reputação comercial)', 'Label reach (territories, HQ, commercial rep)'), clamp(reach, 0.2, 1.6) * w.reach);
  add(l('Reputação com artistas', 'Reputation with artists'), (s.player.reputation.artists - 40) / 250);
  add(l('Confiança do ato em você', 'Act\'s trust in you'), (act.trust - 50) / 300);
  let mv = 0;
  if (o.model === 'licensing') mv += amb === 'freedom' || amb === 'art' ? 0.12 : 0.04;
  if (o.model === '360') {
    mv -= amb === 'freedom' || amb === 'art' ? 0.18 : 0.05;
    mv -= o.share360 * 0.4;
    if (amb === 'security') mv += 0.08;
  }
  if (o.model === 'distribution') mv += amb === 'freedom' ? 0.15 : act.fame > 20 ? 0.05 : -0.08;
  if (o.model === 'publishing') mv -= 0.05;
  if (o.publishing && o.model !== 'publishing') mv -= 0.07;
  // R29 (contratos+): carreiristas gostam de empresário; independentes, de JV; quem vive no estúdio, de produção
  if (o.model === 'management') mv += amb === 'fame' || amb === 'status' || amb === 'money' ? 0.12 : amb === 'freedom' ? 0.06 : amb === 'security' ? -0.04 : 0.02;
  if (o.model === 'production') mv += amb === 'art' || amb === 'critics' ? 0.1 : amb === 'fame' || amb === 'status' ? -0.06 : 0;
  if (o.model === 'jv') mv += (amb === 'freedom' || amb === 'legacy' || amb === 'art' ? 0.15 : amb === 'security' ? -0.1 : 0) + (act.fame < 10 ? -0.06 : 0);
  add(l('Modelo de contrato × ambição', 'Contract model × ambition'), mv);
  const termYears = o.termMonths / 12;
  add(l('Prazo', 'Term'), amb === 'security' ? (termYears - 3) * 0.03 : -(termYears - 3) * 0.035);
  add(l('Promessas', 'Promises'), o.promises.length * 0.06);
  // concorrência: atos visíveis valem mais
  const rivalHeat = act.fame > 12 ? (act.fame - 12) / 120 : 0;
  add(l('Interesse de rivais (fama do ato)', 'Rival interest (act fame)'), -rivalHeat);
  let cv = 0;
  if (act.catalogNo && act.fame < 5) cv += 0.05;
  cv += perk(s, 'offer', act);
  add(l('Cartas, vantagens e catálogo', 'Cards, perks and catalog'), cv);
  const hookReasons: L[] = [];
  for (const { h: hk } of contractHooks()) {
    const res = hk.offer?.(s, act, o);
    if (!res || !Number.isFinite(res.score)) continue;
    add(res.reason ?? l('Outros sistemas', 'Other systems'), res.score);
    if (res.reason && Math.abs(res.score) >= 0.02) hookReasons.push(res.reason);
  }
  const modReasons: L[] = [];
  for (const m of offerMods()) {
    const res = m.fn(s, act, o);
    if (!res || !Number.isFinite(res.delta)) continue;
    add(res.reason ?? l('Ajustes', 'Adjustments'), res.delta);
    if (res.reason) modReasons.push(res.reason);
  }
  // ficha de direitos (rodada 8): só o que difere do padrão do modelo pesa
  const rs = rightsScore(o.rights, o.model, amb, o.publishing);
  add(l('Ficha de direitos', 'Rights sheet'), rs.delta);

  if (advU < 0.6) reasons.push(l('Adiantamento abaixo do que esperam.', 'Advance below expectations.'));
  if (advU > 1.4) reasons.push(l('Adiantamento generoso.', 'Generous advance.'));
  if (w.control > 0.15 && !o.creativeControl) reasons.push(l('Valorizam controle criativo.', 'They value creative control.'));
  if (rivalHeat > 0.05) reasons.push(l('Há interesse de rivais.', 'Rivals are interested.'));
  if (reach < 0.5 && w.reach > 0.2) reasons.push(l('Querem alcance que sua sede ainda não tem.', 'They want reach your HQ lacks.'));
  if (o.promises.length) reasons.push(l('Promessas pesam a favor (e viram obrigação).', 'Promises help (and become obligations).'));
  reasons.push(...hookReasons, ...modReasons, ...rs.reasons);

  const p = 1 / (1 + Math.exp(-(score - 0.58) * 8));
  // analista estreita a leitura; sem analista, a faixa é mais grosseira
  const fuzz = staffCount(s, 'analyst') ? 0.05 : 0.12;
  const shown = p + (((act.logoSeed % 100) / 100 - 0.5) * fuzz);
  const band = shown > 0.66 ? 'likely' : shown > 0.36 ? 'uncertain' : 'unlikely';
  return { score, p, band, reasons, parts };
}

export function careerSlotsUsed(s: GameState): number {
  return playerActs(s).length;
}

export function makeOffer(s: GameState, o: Omit<Offer, 'id' | 'week' | 'status'>): Offer | null {
  const act = s.acts[o.actId];
  if (!act || act.owner === 'player') return null;
  if (!offerEligible29(s, act, o.model).ok) return null; // r20 (B9): proposta só para quem é contratável (R29: regra do modelo)
  if (s.offers.some((x) => x.actId === o.actId && x.status === 'pending')) return null;
  // r20 (B4): o adiantamento fica reservado enquanto a oferta pende — não dá para prometer o mesmo caixa duas vezes
  if (o.advance > 0 && freeCash20(s) < o.advance) return null;
  if (useMeeting(s)) return null; // rodada 14: cada oferta é uma reunião (cota da equipe, depois seu tempo)
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
  if (!act || taken29(act, o.model)) {
    o.status = 'sniped';
    o.note = act?.owner ? s.labels[act.owner]?.name : undefined;
    return 'sniped';
  }
  const el29 = offerEligible29(s, act, o.model);
  if (!el29.ok) { o.status = 'rejected'; o.thinkUntil = undefined; o.note = el29.why?.pt; return 'rejected'; } // r20 (B9): aposentou/acabou no meio da negociação
  const ev = evaluateOffer(s, act, o);
  // rival disputa atos públicos. r28 (C7): também na oferta ao vivo de ato com fama > 10; o rival tem reserva
  // própria (fama percebida, não o seu lance) e pode cobrir a sua proposta num sorteio (sys/rivalsense28)
  // R29: no empresariamento não há selo rival disputando (o ato fica no selo dele)
  const rivalBid = !isSide29(o) && !pending29(s, act) && (!live || act.fame > 10) && (act.fame > 10 || (act.catalogNo && s.year >= act.debutYear));
  if (rivalBid) {
    const won = rivalContest28(s, r, act, o, ev.score, live);
    if (won) {
      const rival = won.lb;
      o.status = 'sniped';
      o.note = rival.name;
      s.rivalries[rival.id] = (s.rivalries[rival.id] ?? 0) + 15;
      notify(s, fmtL(won.jv ? l('{label} roubou {act} com uma joint venture: selo próprio para a estrela ({v} de capital).', '{label} stole {act} with a joint venture: an own imprint for the star ({v} of capital).') : won.countered ? l('{label} cobriu a sua proposta e assinou com {act} ({v} de adiantamento).', '{label} topped your offer and signed {act} ({v} advance).') : l('{label} assinou com {act} antes da sua resposta ({v} de adiantamento).', '{label} signed {act} before your answer ({v} advance).'), { label: rival.name, act: act.name, v: usd28(won.bid) }), 'bad'); // R29: JV de disputa
      remember(s, 'sniped', fmtL(l('{label} levou {act} numa disputa com você.', '{label} took {act} from you in a bidding war.'), { label: rival.name, act: act.name }), { actId: act.id });
      return 'sniped';
    }
  }
  // na hora: quem está em dúvida pede alguns dias para pensar (uma vez)
  if (live && o.thinkUntil === undefined && !pending29(s, act) && ev.p > 0.3 && ev.p < 0.72 && r.chance(0.45)) {
    o.thinkUntil = s.week + r.int(1, 2);
    o.note = 'thinking';
    const kn = s.knowledge[act.id];
    if (kn) kn.stage = 'negotiation';
    return 'thinking';
  }
  if (r.chance(ev.p)) {
    // r20 (B4): revalida o caixa na hora da assinatura (pensou, foi pressionado ou fechamento do mês)
    if (o.advance > 0 && s.player.cash < o.advance) {
      o.status = 'rejected';
      o.thinkUntil = undefined;
      o.note = l('Aceitariam, mas o caixa não cobre o adiantamento: a oferta caducou.', 'They would accept, but cash does not cover the advance: the offer lapsed.').pt;
      const kn = s.knowledge[act.id];
      if (kn) kn.stage = 'investigating';
      notify(s, fmtL(l('{act} aceitaria, mas o caixa não cobre o adiantamento de {v}: oferta caducou sem custo.', '{act} would accept, but cash does not cover the {v} advance: the offer lapsed at no cost.'), { act: act.name, v: `$${Math.round(o.advance / 100).toLocaleString('en-US')}` }), 'bad');
      return 'rejected';
    }
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

/** Por que a contraproposta não pode ser aceita agora (null = pode). Só leitura — o mesmo filtro de `acceptCounter`. */
export function counterWhy(s: GameState, offerId: string): L | null {
  const o = s.offers.find((x) => x.id === offerId && x.status === 'counter');
  if (!o) return l('A contraproposta não está mais de pé.', 'The counter-offer is no longer on the table.');
  const act = s.acts[o.actId];
  if (!act || taken29(act, o.model)) return l('Tarde demais: outro selo fechou antes.', 'Too late: another label closed first.');
  const el = offerEligible29(s, act, o.model);
  if (!el.ok) return el.why ?? l('O artista não pode assinar agora.', 'The act cannot sign right now.');
  if (freeCash20(s) < o.advance) return cashWhy20(s, o.advance, l('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.'));
  return null;
}

export function acceptCounter(s: GameState, offerId: string): boolean {
  const o = s.offers.find((x) => x.id === offerId && x.status === 'counter');
  if (!o) return false;
  const act = s.acts[o.actId];
  if (!act || taken29(act, o.model)) {
    o.status = 'sniped';
    return false;
  }
  if (!offerEligible29(s, act, o.model).ok) return false; // r20 (B9)
  if (freeCash20(s) < o.advance) return false; // r20 (B4): respeita o caixa reservado por outras ofertas
  return acceptOffer(s, act, o);
}

export function acceptOffer(s: GameState, act: Act, o: Offer): boolean {
  if (o.status === 'accepted') return false; // r20 (B4): idempotente — repetir não debita duas vezes
  if (special29().accept?.(s, act, o)) return true; // R29: empresariamento — o ato fica no selo dele (sys/contracts29)
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
    fameAtSign: Math.round(act.fame * 10) / 10,
  };
  if (o.rights) {
    // rodada 8: a ficha negociada vira cláusulas do contrato
    c.rights = { ...o.rights };
    c.publishing = o.rights.pubShare > 0;
    c.options = o.rights.options;
    c.territories = scopeTerritories(s, o.rights.scope);
    act.trust = clamp(act.trust + signingTrust(o.rights, o.model, mainAmbition(s, act)), 0, 100);
  }
  if (o.clauses18) c.clauses18 = { ...o.clauses18 };
  if (o.x29) c.x29 = { ...o.x29 }; // R29 (contratos+)
  s.contracts[id] = c;
  armPromises28(s, c); // r28 (C7): verba, multa e prazo da promessa
  act.owner = 'player';
  act.contractId = id;
  act.trust = clamp(act.trust + 10 + perk(s, 'trust', act), 0, 100);
  act.cash += o.advance;
  if (act.status === 'emerging' && act.fame > 5) act.status = 'active';
  if (act.status === 'hiatus') { act.status = 'active'; act.hiatusUntil = undefined; notify(s, fmtL(l('{act} sai do hiato para assinar com você.', '{act} ends their hiatus to sign with you.'), { act: act.name }), 'good'); } // r20 (B9): volta explícita
  post(s, `advance:${act.id}`, -o.advance, 'advances', `Adiantamento ${act.name}`);
  const k = s.knowledge[act.id];
  if (k) k.stage = 'negotiation';
  s.delegated[act.id] = s.delegated[act.id] ?? joinDelegated31(s, act); // W2-REV: "Agenda do elenco: Eu decido" vale para quem assina depois
  special29().signed?.(s, act, o, c); // R29: produção e joint venture completam o contrato normal (sys/contracts29)
  s.player.stats.signed += 1;
  notify(s, fmtL(l('{act} assinou com você!', '{act} signed with you!'), { act: act.name }), 'good');
  remember(s, 'signed', fmtL(l('{act} assinou contrato ({model}) com {company}.', '{act} signed a {model} deal with {company}.'), { act: act.name, model: CONTRACT_MODELS.find((m) => m.id === o.model)?.name ?? o.model, company: s.config.companyName }), { actId: act.id, important: true });
  return true;
}

export function signWithRival(s: GameState, act: Act, labelId: string, r: Rng, force = false, model29?: ContractModel): void {
  if (!force && !rivalSignOk(s, labelId, act)) return; // rodada 14: A&R do rival tem limite por mês
  const lb = s.labels[labelId];
  const id = nextId(s, 'k');
  const def = lb.family === 'A' && r.chance(0.3) ? '360' : 'classic';
  s.contracts[id] = {
    id, actId: act.id, party: labelId, model: def,
    advance: money(s, expectedAdvance(s, act)), royalty: r.float(0.12, 0.2), termMonths: 48,
    startWeek: s.week, endWeek: s.week + 208, releasesOwed: 4, releasesDone: 0, creativeControl: r.chance(0.3),
    publishing: lb.family === 'D', share360: 0, recoupBalance: money(s, expectedAdvance(s, act)), promises: [],
  };
  lb.cash -= money(s, expectedAdvance(s, act));
  special29().npcSigned?.(s, act, lb, s.contracts[id], model29); // R29 (contratos+): JV/selo-vaidade de estrela, compra do contrato de produção
  act.owner = labelId;
  act.contractId = id;
  lb.roster.push(act.id);
  if (act.status === 'emerging') act.status = 'active';
  const k = s.knowledge[act.id];
  if (k && k.stage !== 'signal') k.stage = 'monitoring';
}

/** Libera o ato do contrato (vencimento, rescisão ou saída negociada). `quiet`: quem chama escreve o próprio aviso e a
 *  entrada do diário (W2-REV: a rescisão do jogador gerava duas entradas). */
export function endContract(s: GameState, act: Act, reason: 'expired' | 'terminated' | 'left', o: { quiet?: boolean } = {}): void {
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
    if (!o.quiet) {
      notify(s, fmtL(l('{act} deixou o selo ({reason}).', '{act} left the label ({reason}).'), { act: act.name, reason: why }), reason === 'expired' ? 'info' : 'bad');
      remember(s, 'left', fmtL(l('{act} saiu do selo: {reason}.', '{act} left the label: {reason}.'), { act: act.name, reason: why }), { actId: act.id, important: true });
    }
    if (reason === 'left') s.player.stats.leftUnhappy += 1;
  }
}

/** Renovação: oferece mais um termo ao ato próprio. */
export function renewContract(s: GameState, actId: string, months: number, bonus: number): boolean {
  const act = s.acts[actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  if (!act || !c || c.party !== 'player') return false;
  if (s.player.cash < bonus) return false;
  const r = rng19(s, 'contracts');
  const extra = contractHooks().reduce((t, x) => t + (x.h.renew?.(s, act) ?? 0), 0);
  const p = clamp(0.25 + act.trust / 100 + toReal(bonus, s.year) / expectedAdvance(s, act) * 0.3 + extra + renewalAdj(s, c), 0, 0.97);
  if (!r.chance(p)) {
    act.trust -= 4;
    notify(s, fmtL(l('{act} não quis renovar agora.', '{act} did not want to renew now.'), { act: act.name }), 'bad');
    return false;
  }
  c.endWeek = Math.max(c.endWeek, s.week) + Math.round(months * 4.35);
  c.termMonths += months;
  c.releasesOwed += Math.ceil(months / 14);
  c.recoupBalance += bonus;
  c.fameAtSign = Math.round(act.fame * 10) / 10; // renovação zera o poder de barganha acumulado
  c.lastRenegWeek = s.week;
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
      // r28 (C7): verba prometida sai no cumprimento; descumprir (ou faltar caixa para a verba) paga multa
      const kept = settlePromise28(s, c, act, p, promiseMet28(s, c, act, p));
      p.kept = kept;
      if (!kept) {
        act.trust = clamp(act.trust - 18, 0, 100);
        s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
        remember(s, 'broken_promise', fmtL(l('Promessa quebrada com {act} ({kind}).', 'Broken promise to {act} ({kind}).'), { act: act.name, kind: PROM28_NAME[p.kind] }), { actId: act.id, important: true });
        notify(s, p.owed28 ? fmtL(l('Você descumpriu uma promessa a {act}: multa de {v}; sem caixa, {o} ficam devidos e saem aos poucos.', 'You broke a promise to {act}: {v} penalty; short on cash, {o} is owed and paid over time.'), { act: act.name, v: `$${Math.round((p.penalty ?? 0) / 100).toLocaleString('en-US')}`, o: `$${Math.round(p.owed28 / 100).toLocaleString('en-US')}` })
          : p.paidPenalty ? fmtL(l('Você descumpriu uma promessa a {act}: multa de {v}.', 'You broke a promise to {act}: {v} penalty.'), { act: act.name, v: `$${Math.round(p.paidPenalty / 100).toLocaleString('en-US')}` }) : fmtL(l('Você descumpriu uma promessa a {act}.', 'You broke a promise to {act}.'), { act: act.name }), 'bad');
      } else {
        act.trust = clamp(act.trust + 6, 0, 100);
      }
    }
  }
}
