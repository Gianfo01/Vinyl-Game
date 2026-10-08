// Mesa de negociação (mini-jogo): rodadas de proposta, barra de paciência, cartas de argumento e
// blefe, para assinar um artista livre ou renovar um contrato próprio. É uma alternativa à oferta
// comum (que espera o fechamento do mês). O resolvedor automático joga com os atributos do dono; o
// jogador que joga bem consegue no máximo ~10% melhor que o automático.

import type { Rng } from '../../../core/rng';
import { toReal } from '../../../core/money';
import { l, type L } from '../../../data/world';
import { acceptOffer, defaultOffer, expectedAdvance } from '../../contracts';
import { mainAmbition } from '../../people';
import type { GameState, Offer } from '../../types';
import { fmtL, money, nextId, post, remember } from '../../util';
import { P, actOf, clamp01, type NegSession } from './state';
import { gainXp, ownerBonus } from './owner';
import { fortuneFactor } from './life';
import { leakSecret, SECRET_NAME } from './secrets';

export type CardId = 'reputation' | 'vision' | 'promise' | 'bluff' | 'secret' | 'time';

export const CARD_INFO: Record<CardId, { name: L; desc: L }> = {
  reputation: { name: l('Nossa reputação', 'Our reputation'), desc: l('Mostra o histórico do selo com artistas.', 'Show the label\'s track record with artists.') },
  vision: { name: l('Plano de carreira', 'Career plan'), desc: l('Funciona com quem quer arte, fama ou crítica.', 'Works on those who want art, fame or critics.') },
  promise: { name: l('Prometer turnê', 'Promise a tour'), desc: l('Baixa o adiantamento pedido; vira obrigação.', 'Lowers the advance asked; becomes an obligation.') },
  bluff: { name: l('Blefe: "temos outro na fila"', 'Bluff: "someone else is waiting"'), desc: l('Pode derrubar o pedido — ou a paciência.', 'Can drop the ask — or their patience.') },
  secret: { name: l('Usar um segredo', 'Use a secret'), desc: l('Funciona quase sempre. Se vazar, o estrago é grande.', 'Almost always works. If it leaks, the damage is big.') },
  time: { name: l('Pedir um café', 'Call a coffee break'), desc: l('Recupera um pouco de paciência.', 'Restores some patience.') },
};

export function negBlocked(s: GameState, actId: string, mode: NegSession['mode']): L | null {
  const act = s.acts[actId];
  if (!act) return l('Ato inválido.', 'Invalid act.');
  if ((P(s).negCooldown[actId] ?? 0) > s.week) return l('Eles não querem sentar à mesa agora.', 'They won\'t sit down right now.');
  if (mode === 'sign') {
    if (act.owner) return l('Só artistas sem contrato.', 'Only unsigned artists.');
    if (act.status === 'retired' || act.status === 'split') return l('Carreira encerrada.', 'Career over.');
  } else {
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    if (!c || c.party !== 'player' || act.playerBand) return l('Só contratos do seu selo.', 'Only your label\'s contracts.');
  }
  return null;
}

function baseTerms(s: GameState, actId: string, mode: NegSession['mode']): { advance: number; royalty: number; months: number } {
  const act = s.acts[actId];
  const d = defaultOffer(s, act);
  if (mode === 'renew') {
    const c = s.contracts[act.contractId!];
    return { advance: Math.round(d.advance * 0.6), royalty: Math.max(c.royalty, d.royalty), months: 24 };
  }
  return { advance: d.advance, royalty: d.royalty, months: 36 };
}

/** Avalia a proposta: 0 = no piso do artista, 1 = tudo o que pediu. */
function satisfaction(n: NegSession, o: NegSession['offer']): { sat: number; below: boolean } {
  const sa = (o.advance - n.floor.advance) / Math.max(1, n.ask.advance - n.floor.advance);
  const sr = (o.royalty - n.floor.royalty) / Math.max(0.001, n.ask.royalty - n.floor.royalty);
  return { sat: Math.min(1.2, 0.55 * sa + 0.45 * sr), below: o.advance < n.floor.advance * 0.98 || o.royalty < n.floor.royalty - 0.002 };
}

function respond(n: NegSession, offer: NegSession['offer'], negB: number, broke: boolean): void {
  n.round += 1;
  n.offer = { ...offer };
  const { sat, below } = satisfaction(n, offer);
  const need = 1 - n.round * 0.07;
  if (!below && sat >= need) {
    n.done = 'deal';
    n.log.push(l('"Fechado." Apertam as mãos.', '"Deal." They shake hands.'));
    return;
  }
  if (below) {
    n.patience -= 22;
    n.log.push(l('"Isso é um insulto."', '"That\'s an insult."'));
  } else {
    n.patience -= 7 + (1 - Math.max(0, sat)) * 12;
    const conc = 0.16 + negB * 0.06 + (broke ? 0.08 : 0);
    n.ask.advance = Math.round(n.ask.advance - (n.ask.advance - Math.max(offer.advance, n.floor.advance)) * conc);
    n.ask.royalty = Math.round((n.ask.royalty - (n.ask.royalty - Math.max(offer.royalty, n.floor.royalty)) * conc) * 1000) / 1000;
    n.log.push(l('Eles cedem um pouco e devolvem uma contraproposta.', 'They give a little and counter.'));
  }
  if (n.patience <= 0 || n.round >= n.maxRounds) {
    n.done = 'walk';
    n.log.push(l('Eles se levantam e vão embora.', 'They get up and leave.'));
  }
}

/** Resolvedor automático (sem sorte): proposta sobe 35% do caminho a cada rodada. */
function autoPlay(n: NegSession, negB: number, broke: boolean): NegSession {
  const sim: NegSession = JSON.parse(JSON.stringify(n));
  let offer = { ...sim.offer };
  while (!sim.done) {
    respond(sim, offer, negB, broke);
    offer = {
      advance: Math.round(offer.advance + (sim.ask.advance - offer.advance) * 0.35),
      royalty: Math.round((offer.royalty + (sim.ask.royalty - offer.royalty) * 0.35) * 1000) / 1000,
      months: offer.months,
    };
  }
  return sim;
}

export function startNegotiation(s: GameState, actId: string, mode: NegSession['mode']): NegSession | L {
  const err = negBlocked(s, actId, mode);
  if (err) return err;
  const act = s.acts[actId];
  const base = baseTerms(s, actId, mode);
  const fort = fortuneFactor(s, actId);
  const negB = ownerBonus(s, 'negotiation');
  const heat = act.fame > 12 ? (act.fame - 12) / 200 : 0;
  const ask = { advance: Math.round(base.advance * (1.3 + heat + fort * 0.25)), royalty: Math.round((base.royalty + 0.03 + fort * 0.02) * 1000) / 1000, months: base.months };
  const floor = { advance: Math.round(base.advance * (0.82 + fort * 0.15 - negB * 0.06)), royalty: Math.round((base.royalty - 0.012 + fort * 0.012) * 1000) / 1000 };
  const n: NegSession = {
    actId, mode, round: 0, maxRounds: 6,
    patience: Math.round(clamp01(55 + act.trust / 4 + negB * 15 + (fort < 0 ? 12 : 0) - (fort > 0.5 ? 10 : 0))),
    ask, offer: { ...base }, floor, usedCards: [], log: [],
  };
  // o jogador consegue no máximo ~10% melhor que o automático
  const auto = autoPlay(n, negB, fort < 0);
  if (auto.done === 'deal') {
    n.floor.advance = Math.max(n.floor.advance, Math.round(auto.offer.advance * 0.9));
    n.floor.royalty = Math.max(n.floor.royalty, Math.round((auto.offer.royalty - 0.01) * 1000) / 1000);
  }
  n.log.push(mode === 'sign'
    ? fmtL(l('{a} senta à mesa. Pedem {v} de adiantamento e {r}% de royalties.', '{a} sits down. They ask {v} advance and {r}% royalties.'), { a: act.name, v: `$${Math.round(toReal(ask.advance, s.year))}`, r: Math.round(ask.royalty * 1000) / 10 })
    : fmtL(l('Renovação com {a}: pedem bônus de {v} e {r}% de royalties.', 'Renewal with {a}: they ask a {v} bonus and {r}% royalties.'), { a: act.name, v: `$${Math.round(toReal(ask.advance, s.year))}`, r: Math.round(ask.royalty * 1000) / 10 }));
  P(s).neg = n;
  return n;
}

export function propose(s: GameState, offer: NegSession['offer']): NegSession | null {
  const n = P(s).neg;
  if (!n || n.done) return n;
  respond(n, offer, ownerBonus(s, 'negotiation'), fortuneFactor(s, n.actId) < 0);
  return n;
}

export function knownSecretFor(s: GameState, actId: string) {
  const act = s.acts[actId];
  return P(s).secrets.find((x) => x.known && !x.leaked && x.used < 2 && act?.members.includes(x.owner));
}

export function cardAvailable(s: GameState, n: NegSession, c: CardId): boolean {
  if (n.usedCards.includes(c) || n.done) return false;
  if (c === 'secret') return !!knownSecretFor(s, n.actId);
  if (c === 'promise') return n.mode === 'sign' || !!actOf(s, s.acts[n.actId]?.members[0] ?? '');
  return true;
}

export function playCard(s: GameState, r: Rng, c: CardId): NegSession | null {
  const n = P(s).neg;
  if (!n || n.done || !cardAvailable(s, n, c)) return n;
  n.usedCards.push(c);
  const act = s.acts[n.actId];
  const lower = (f: number) => {
    n.ask.advance = Math.max(n.floor.advance, Math.round(n.ask.advance * (1 - f)));
  };
  switch (c) {
    case 'reputation': {
      const rep = s.player.reputation.artists;
      lower(Math.max(0, (rep - 35) / 300));
      n.patience += 5;
      n.log.push(rep > 50 ? l('Eles conhecem a fama do selo e baixam o tom.', 'They know the label\'s name and soften.') : l('"Nunca ouvimos falar bem de vocês."', '"We never heard much good about you."'));
      break;
    }
    case 'vision': {
      const amb = mainAmbition(s, act);
      const fits = amb === 'art' || amb === 'fame' || amb === 'critics' || amb === 'legacy';
      n.patience += fits ? 15 : 4;
      if (fits) n.ask.royalty = Math.max(n.floor.royalty, Math.round((n.ask.royalty - 0.01) * 1000) / 1000);
      n.log.push(fits ? l('O plano de carreira acende os olhos deles.', 'The career plan lights up their eyes.') : l('Ouvem educadamente, mas querem números.', 'They listen politely, but want numbers.'));
      break;
    }
    case 'promise':
      lower(0.1);
      n.log.push(l('A promessa de turnê pesa a favor.', 'The tour promise tips the scale.'));
      break;
    case 'bluff': {
      const ok = r.chance(0.45 + ownerBonus(s, 'charisma') * 0.2 + ownerBonus(s, 'negotiation') * 0.1);
      if (ok) {
        lower(0.12);
        n.log.push(l('Funcionou: eles ficam com medo de perder a vaga.', 'It worked: they fear losing the slot.'));
      } else {
        n.patience -= 30;
        act.trust = clamp01(act.trust - 5);
        n.log.push(l('Eles sacaram o blefe. O clima esfriou.', 'They called the bluff. The room went cold.'));
      }
      break;
    }
    case 'secret': {
      const sec = knownSecretFor(s, n.actId)!;
      sec.used += 1;
      n.ask.advance = n.floor.advance;
      n.ask.royalty = n.floor.royalty;
      n.patience += 20;
      n.log.push(fmtL(l('Você menciona, baixinho, {k}. Eles empalidecem.', 'You quietly mention {k}. They go pale.'), { k: SECRET_NAME[sec.kind] }));
      if (r.chance(0.25)) {
        act.trust = clamp01(act.trust - 20);
        s.player.reputation.artists = clamp01(s.player.reputation.artists - 5);
        leakSecret(s, sec, l('O próprio artista, furioso com a chantagem', 'The artist, furious at the blackmail'));
        n.log.push(l('Mas a história vazou — e a culpa caiu no selo.', 'But the story leaked — and the label took the blame.'));
      }
      break;
    }
    case 'time':
      n.patience = Math.min(100, n.patience + 12);
      n.log.push(l('Um café, uma conversa sobre música. Respiram.', 'A coffee, some talk about music. Everyone breathes.'));
      break;
  }
  return n;
}

/** Aplica o resultado da mesa no jogo (assinatura, renovação ou porta fechada). */
export function closeNegotiation(s: GameState): L {
  const st = P(s);
  const n = st.neg;
  if (!n) return l('Sem negociação.', 'No negotiation.');
  st.neg = null;
  const act = s.acts[n.actId];
  if (!act) return l('Ato inválido.', 'Invalid act.');
  gainXp(s, 'negotiation', n.done === 'deal' ? 3 : 1);
  if (n.done !== 'deal') {
    st.negCooldown[n.actId] = s.week + 8;
    act.trust = clamp01(act.trust - 4);
    remember(s, 'negotiation', fmtL(l('Negociação com {a} terminou sem acordo.', 'Negotiation with {a} ended without a deal.'), { a: act.name }), { actId: act.id });
    return l('Sem acordo. Eles não querem conversar por algumas semanas.', 'No deal. They won\'t talk for a few weeks.');
  }
  if (s.player.cash < n.offer.advance) return l('Acordo fechado, mas falta caixa para pagar. Negociação perdida.', 'Deal agreed, but you lack the cash. Negotiation lost.');
  const promised = n.usedCards.includes('promise');
  if (n.mode === 'sign') {
    if (act.owner) return l('Outro selo assinou antes.', 'Another label signed them first.');
    const o: Offer = { ...defaultOffer(s, act), advance: n.offer.advance, royalty: n.offer.royalty, termMonths: n.offer.months, promises: promised ? ['tour'] : [], id: nextId(s, 'o'), week: s.week, status: 'pending', note: 'mesa' };
    s.offers = s.offers.filter((x) => !(x.actId === act.id && x.status === 'pending'));
    acceptOffer(s, act, o);
    return fmtL(l('{a} assinou na mesa!', '{a} signed at the table!'), { a: act.name });
  }
  const c = s.contracts[act.contractId!];
  c.endWeek = Math.max(c.endWeek, s.week) + Math.round(n.offer.months * 4.35);
  c.termMonths += n.offer.months;
  c.releasesOwed += Math.ceil(n.offer.months / 14);
  c.royalty = n.offer.royalty;
  if (n.offer.advance > 0) {
    post(s, `renewtable:${act.id}`, -n.offer.advance, 'advances', `Renovação ${act.name}`);
    c.recoupBalance += n.offer.advance;
    act.cash += n.offer.advance;
  }
  if (promised) c.promises.push({ kind: 'tour', dueWeek: s.week + 26 });
  act.trust = clamp01(act.trust + 5);
  remember(s, 'renewal', fmtL(l('{a} renova por {m} meses na mesa de negociação.', '{a} renews for {m} months at the negotiating table.'), { a: act.name, m: n.offer.months }), { actId: act.id });
  return fmtL(l('{a} renovou!', '{a} renewed!'), { a: act.name });
}

/** Mini-jogo no automático: joga com os atributos e fecha. */
export function autoNegotiate(s: GameState, actId: string, mode: NegSession['mode']): L {
  const n = startNegotiation(s, actId, mode);
  if ('pt' in n) return n;
  const res = autoPlay(n, ownerBonus(s, 'negotiation'), fortuneFactor(s, actId) < 0);
  P(s).neg = res;
  return closeNegotiation(s);
}

export function realAdvance(s: GameState, actId: string): number {
  return expectedAdvance(s, s.acts[actId]);
}

export { money };
