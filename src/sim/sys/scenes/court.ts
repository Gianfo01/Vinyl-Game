// Tribunal: processos existentes (business.ts) ganham audiência quando chegam ao julgamento.
// Escolhas mudam o resultado: acordo (encerra), perito musical (+chance), testemunha surpresa
// (aposta). Depois de uma derrota, o recurso pode reverter parte da condenação.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { settleLawsuit } from '../../business';
import type { GameState } from '../../types';
import type { Lawsuit } from '../../xtypes';
import { fmtL, money, post, remember } from '../../util';
import { clampN, findScene, markSeen, patchScene, queueScene, sc, wasSeen } from './state';

export type CourtChoice = 'settle' | 'expert' | 'witness' | 'trust';

export const KIND_NAMES: Record<Lawsuit['kind'], L> = {
  plagiarism: l('Plágio', 'Plagiarism'),
  sample: l('Sample sem liberação', 'Uncleared sample'),
  audit: l('Auditoria de royalties', 'Royalty audit'),
  contract: l('Quebra de contrato', 'Breach of contract'),
  image: l('Direito de imagem', 'Image rights'),
};

const involvesPlayer = (x: Lawsuit) => x.defendant === 'player' || x.plaintiff === 'player';

/** Gancho semanal: audiência para processos em julgamento; recurso para derrotas. */
export function courtWeek(s: GameState): void {
  for (const suit of s.lawsuits) {
    if (!involvesPlayer(suit)) continue;
    if (suit.stage === 'trial' && !wasSeen(s, `court:${suit.id}`)) {
      markSeen(s, `court:${suit.id}`);
      queueScene(s, 'court', 'court', {
        title: fmtL(l('Audiência: {k}', 'Hearing: {k}'), { k: KIND_NAMES[suit.kind] }),
        suitId: suit.id,
        text: suit.text,
        kindName: KIND_NAMES[suit.kind],
        plaintiff: suit.plaintiff === 'player' ? s.config.companyName : suit.plaintiff,
        defendant: suit.defendant === 'player' ? s.config.companyName : s.labels[suit.defendant]?.name ?? suit.defendant,
        songId: suit.songId ?? null,
        odds: suit.odds,
      });
    }
    if (suit.stage === 'lost' && suit.defendant === 'player' && !wasSeen(s, `appeal:${suit.id}`)) {
      markSeen(s, `appeal:${suit.id}`);
      queueScene(s, 'appeal', 'court', {
        title: fmtL(l('Sentença: {k}', 'Verdict: {k}'), { k: KIND_NAMES[suit.kind] }),
        suitId: suit.id,
        text: suit.text,
        claim: suit.claim,
        fee: appealFee(s, suit),
      });
    }
  }
}

export function appealFee(s: GameState, suit: Lawsuit): number {
  return Math.round(money(s, 5000) + suit.claim * 0.05);
}

export function expertFee(s: GameState): number {
  return money(s, 3000);
}

/** Escolha da audiência (uma única vez). */
export function courtChoice(s: GameState, r: Rng, csId: string, choice: CourtChoice): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'court') return l('Audiência não encontrada.', 'Hearing not found.');
  if (cs.data.done) return cs.data.result as L;
  const suit = s.lawsuits.find((x) => x.id === cs.data.suitId);
  if (!suit || suit.stage !== 'trial') {
    const res = l('O caso já foi decidido.', 'The case has already been decided.');
    patchScene(s, csId, { done: true, result: res });
    return res;
  }
  const before = suit.odds;
  let result: L;
  if (choice === 'settle') {
    const err = settleLawsuit(s, suit.id);
    if (err) return err;
    result = l('As partes assinam um acordo no corredor do fórum. Caso encerrado.', 'The parties sign a settlement in the courthouse hallway. Case closed.');
  } else if (choice === 'expert') {
    const fee = expertFee(s);
    if (s.player.cash < fee) return l('Caixa insuficiente para o perito.', 'Not enough cash for the expert.');
    post(s, `expert:${suit.id}`, -fee, 'legal', 'Perito musical');
    suit.odds = clampN(suit.odds + 0.12, 0.05, 0.95);
    result = l('O perito toca os dois trechos ao piano: as notas parecem, mas a harmonia e o ritmo divergem. O juiz anota.', 'The expert plays both passages on the piano: the notes look alike, but harmony and rhythm diverge. The judge takes notes.');
  } else if (choice === 'witness') {
    const fee = money(s, 1000);
    post(s, `witness:${suit.id}`, -fee, 'legal', 'Testemunha');
    if (r.chance(0.5)) {
      suit.odds = clampN(suit.odds + 0.25, 0.05, 0.95);
      result = l('A testemunha surpresa mostra uma fita antiga com a música datada. A sala murmura: virada!', 'The surprise witness produces an old dated tape of the song. The room murmurs: a twist!');
    } else {
      suit.odds = clampN(suit.odds - 0.12, 0.05, 0.95);
      result = l('A testemunha se contradiz no interrogatório. O advogado do outro lado sorri.', 'The witness contradicts themselves under cross-examination. Opposing counsel smiles.');
    }
  } else {
    result = l('Você confia na defesa preparada e não muda nada.', 'You trust the prepared defense and change nothing.');
  }
  sc(s).stats.hearings += 1;
  patchScene(s, csId, { done: true, choice, result, odds: suit.odds, oddsBefore: before });
  remember(s, 'hearing', fmtL(l('Audiência — {t}: {r}', 'Hearing — {t}: {r}'), { t: suit.text, r: result }), { actId: suit.actId });
  return result;
}

/** Recurso depois da derrota: paga a taxa e tenta reverter 60% da condenação. */
export function appealVerdict(s: GameState, r: Rng, csId: string, go: boolean): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'appeal') return l('Sentença não encontrada.', 'Verdict not found.');
  if (cs.data.done) return cs.data.result as L;
  const suit = s.lawsuits.find((x) => x.id === cs.data.suitId);
  let result: L;
  if (!go || !suit) {
    result = l('Você aceita a sentença e vira a página.', 'You accept the verdict and move on.');
  } else {
    const fee = Number(cs.data.fee) || appealFee(s, suit);
    if (s.player.cash < fee) return l('Caixa insuficiente para recorrer.', 'Not enough cash to appeal.');
    post(s, `appealfee:${suit.id}`, -fee, 'legal', 'Recurso judicial');
    if (r.chance(clampN(0.25 + suit.odds * 0.3, 0.1, 0.55))) {
      const back = Math.round(suit.claim * 0.6);
      post(s, `appealwin:${suit.id}`, back, 'legal', 'Recurso aceito (devolução)');
      result = l('O tribunal superior reduz a condenação: 60% do valor volta ao caixa.', 'The higher court cuts the award: 60% of the amount comes back.');
    } else {
      result = l('Recurso negado. A sentença fica como está.', 'Appeal denied. The verdict stands.');
    }
  }
  patchScene(s, csId, { done: true, result, appealed: go });
  return result;
}
