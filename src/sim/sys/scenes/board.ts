// Sala do conselho e pregão: toque do sino no IPO, assembleia anual de acionistas com votos
// visíveis e fundação de subselos.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import type { GameState } from '../../types';
import { fmtL, money, post, remember } from '../../util';
import { clampN, findScene, patchScene, queueScene } from './state';

export type AgmChoice = 'dividend' | 'expand' | 'mission';

export interface Shareholder {
  name: string;
  weight: number;
  mood: number; // -1..1
}

const FUNDS = ['Fundo Harmonia', 'Previdência dos Músicos', 'Banco Austral', 'Família Bastos', 'Capital Aurora', 'Pequenos acionistas'];

export function shareholders(s: GameState, r: Rng): Shareholder[] {
  const h = s.listing.history;
  const perf = h.length > 12 ? h[h.length - 1] / Math.max(1, h[h.length - 13]) - 1 : 0;
  return FUNDS.map((name, i) => ({ name, weight: [22, 18, 16, 14, 12, 18][i], mood: clampN(perf * 2 + r.float(-0.4, 0.4) + (i === 5 ? 0.1 : 0), -1, 1) }));
}

/** IPO feito (memória 'ipo') → cena do pregão com o sino. */
export function ipoScene(s: GameState): void {
  queueScene(s, 'ipo', 'exchange', {
    title: l('Abertura de capital: o sino do pregão', 'IPO: ringing the opening bell'),
    price: s.listing.price,
    history: s.listing.history.slice(-24),
    company: s.config.companyName,
  });
}

/** Assembleia anual (gancho 'year') para empresa listada. */
export function agmYear(s: GameState, r: Rng): void {
  if (!s.listing.listed) return;
  const sh = shareholders(s, r);
  queueScene(s, 'agm', 'boardroom', {
    title: fmtL(l('Assembleia de acionistas {y}', 'Shareholders\' meeting {y}'), { y: s.year }),
    shareholders: sh,
    price: s.listing.price,
    history: s.listing.history.slice(-24),
    profit: s.player.profitByYear[s.year] ?? 0,
  });
}

/** Proposta da diretoria; cada fundo vota (aprovação depende do humor e da proposta). */
export function agmVote(s: GameState, r: Rng, csId: string, choice: AgmChoice): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'agm') return l('Assembleia não encontrada.', 'Meeting not found.');
  if (cs.data.done) return cs.data.result as L;
  const sh = cs.data.shareholders as Shareholder[];
  const bias = { dividend: 0.5, expand: 0.05, mission: -0.25 }[choice];
  const votes = sh.map((x) => ({ name: x.name, weight: x.weight, yes: x.mood + bias + r.float(-0.3, 0.3) > 0 }));
  const yes = votes.filter((v) => v.yes).reduce((t, v) => t + v.weight, 0);
  const total = votes.reduce((t, v) => t + v.weight, 0);
  const approved = yes / total > 0.5;
  const rep = s.player.reputation;
  let result: L;
  if (choice === 'dividend') {
    const profit = Math.max(0, Number(cs.data.profit) || 0);
    const pay = Math.round(Math.max(money(s, 2000), profit * 0.1) * s.listing.floatShare);
    if (approved) {
      post(s, `agmdiv:${s.year}`, -pay, 'dividends', 'Dividendo extra (assembleia)');
      s.listing.price = Math.round(s.listing.price * 1.05);
      rep.institutional = clampN(rep.institutional + 2, 0, 100);
      result = l('Aprovado: dividendo extra pago. As ações sobem 5%.', 'Approved: extra dividend paid. Shares rise 5%.');
    } else result = l('Rejeitado: os fundos preferem caixa para crescer.', 'Rejected: the funds prefer cash for growth.');
  } else if (choice === 'expand') {
    if (approved) {
      s.listing.price = Math.round(s.listing.price * 1.03);
      rep.commercial = clampN(rep.commercial + 2, 0, 100);
      result = l('Aprovado: o plano de expansão anima o mercado (+3% nas ações).', 'Approved: the expansion plan cheers the market (+3% shares).');
    } else {
      s.listing.price = Math.round(s.listing.price * 0.97);
      rep.institutional = clampN(rep.institutional - 3, 0, 100);
      result = l('Rejeitado: derrota pública da diretoria. Ações −3%.', 'Rejected: a public defeat for management. Shares −3%.');
    }
  } else {
    rep.artistic = clampN(rep.artistic + 2, 0, 100);
    s.listing.price = Math.round(s.listing.price * (approved ? 1 : 0.98));
    result = approved
      ? l('Os acionistas aplaudem a defesa da missão artística. Nada muda no preço.', 'Shareholders applaud the defense of the artistic mission. The price holds.')
      : l('O discurso sobre arte não convence os fundos (−2% nas ações), mas os artistas gostam.', 'The art speech does not move the funds (−2% shares), but artists love it.');
  }
  if (s.listing.history.length) s.listing.history[s.listing.history.length - 1] = s.listing.price;
  patchScene(s, csId, { done: true, result, votes, approved, choice });
  remember(s, 'agm', fmtL(l('Assembleia: {r}', 'Shareholders\' meeting: {r}'), { r: result }), {});
  return result;
}

export function subLabelScene(s: GameState, text: L): void {
  const sl = s.subLabels[s.subLabels.length - 1];
  queueScene(s, 'sublabel', 'boardroom', {
    title: l('Nasce um subselo', 'A sub-label is born'),
    text,
    name: sl?.name ?? '',
  }, { minor: true });
}
