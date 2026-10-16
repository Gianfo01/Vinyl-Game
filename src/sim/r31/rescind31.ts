// R31 · onda 2 (V) — RESCINDIR o contrato de um artista do seu elenco, por iniciativa sua.
//
// Antes não havia caminho do jogador para encerrar um contrato clássico antes do prazo (só o artista saía, o rival
// comprava ou a disputa liberava). Esta é a regra ÚNICA: o formulário (menu do artista, "Rescindir contrato") e a cena
// cara a cara (ui/r31/scene31) chamam `rescind31`. A prévia (`rescindQuote31`) só lê o estado.
//
//   multa       = 30% do adiantamento de mercado × fração do prazo que falta  (+ saldo a recuperar perdoado)
//   reação      = sorteio puro por chave (semente | ato | semana), feito SÓ na decisão:
//                 aceita · chora (mágoa) · ameaça processo (custo jurídico) · vaza para a imprensa (reputação)
//   chance      = confiança do ato e opinião do líder sobre você (opinion.ts) — a cena mostra a tendência, não a conta.

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { endContract, expectedAdvance } from '../contracts';
import { emitFact } from '../facts17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { opine, opinionOf } from '../opinion';
import type { Act, Contract, GameState } from '../types';
import { fmtL, money, playerActs, post, remember } from '../util';
import { lock31, lockOf31, UNLOCK31, type Lock31 } from './lock';

export type Reaction31 = 'accept' | 'cry' | 'sue' | 'leak';

export const REACTION31: Record<Reaction31, { icon: string; label: L; tone: 'good' | 'warn' | 'bad' }> = {
  accept: { icon: '🤝', label: l('Aceita e aperta a sua mão', 'Accepts and shakes your hand'), tone: 'good' },
  cry: { icon: '😢', label: l('Chora e sai magoado', 'Cries and leaves hurt'), tone: 'warn' },
  sue: { icon: '⚖️', label: l('Ameaça processo', 'Threatens to sue'), tone: 'bad' },
  leak: { icon: '📰', label: l('Vaza para a imprensa', 'Leaks it to the press'), tone: 'bad' },
};

/** Contrato clássico com você (não a sua própria banda). */
export function myContract31(s: GameState, a: Act | undefined): Contract | undefined {
  const c = a?.contractId ? s.contracts[a.contractId] : undefined;
  return a && c && c.party === 'player' && !a.playerBand && playerActs(s).includes(a.id) ? c : undefined;
}

/** Quem fala pelo ato na mesa (líder vivo; senão o primeiro integrante vivo que não é você). */
export function leaderOf31(s: GameState, a: Act): string | undefined {
  const ok = (id: string | undefined) => !!id && a.members.includes(id) && !!s.persons[id]?.alive && !s.persons[id].isPlayer;
  return ok(a.leaderId) ? a.leaderId : a.members.find((m) => ok(m));
}

export interface RescindQuote31 {
  /** multa (centavos) */
  fee: number;
  monthsLeft: number;
  /** discos ainda devidos */
  owedLeft: number;
  /** saldo a recuperar que você perdoa */
  unrecouped: number;
  /** tendência de reação (o que dá para ler pela relação; nunca o número) */
  lean: 'calm' | 'mixed' | 'hostile';
  lock: Lock31 | null;
}

/** Prévia: multa, o que falta do contrato e a tendência de reação. Só leitura. */
export function rescindQuote31(s: GameState, actId: string): RescindQuote31 {
  const a = s.acts[actId];
  const c = myContract31(s, a);
  if (!a || !c) return { fee: 0, monthsLeft: 0, owedLeft: 0, unrecouped: 0, lean: 'mixed', lock: lock31(l('Só artistas com contrato com você.', 'Only acts under contract with you.'), UNLOCK31.roster) };
  const monthsLeft = Math.max(0, Math.round((c.endWeek - s.week) / 4.35));
  const frac = c.termMonths > 0 ? clamp(monthsLeft / c.termMonths, 0, 1) : 0;
  const fee = Math.round(money(s, expectedAdvance(s, a) * 0.3 * frac) / 100) * 100;
  const sc = score(s, a);
  const lean = sc >= 0.62 ? 'calm' : sc >= 0.4 ? 'mixed' : 'hostile';
  const lock = monthsLeft <= 0 ? lock31(l('O contrato já está acabando.', 'The contract is already ending.'), l('Deixe vencer: sai sem multa na virada.', 'Let it expire: it ends with no fee at the turn.'))
    : fee > 0 && freeCash20(s) < fee ? lockOf31(cashWhy20(s, fee, l('Caixa insuficiente para a multa.', 'Not enough cash for the fee.')), UNLOCK31.cash) : null;
  return { fee, monthsLeft, owedLeft: Math.max(0, c.releasesOwed - c.releasesDone), unrecouped: Math.max(0, c.recoupBalance), lean, lock };
}

/** 0..1: confiança do ato e opinião do líder sobre você. */
function score(s: GameState, a: Act): number {
  const lead = leaderOf31(s, a);
  const op = lead ? opinionOf(s, `p:${lead}`) : 0;
  return clamp((a.trust / 100) * 0.55 + ((op + 100) / 200) * 0.45, 0, 1);
}

export interface RescindOut31 { ok: boolean; text: L; reaction?: Reaction31 }

/** Rescinde. O sorteio da reação acontece aqui (e só aqui). */
export function rescind31(s: GameState, actId: string): RescindOut31 {
  const a = s.acts[actId];
  const q = rescindQuote31(s, actId);
  if (q.lock || !a) return { ok: false, text: q.lock?.why ?? l('Artista indisponível.', 'Act unavailable.') };
  const sc = score(s, a);
  const r = Rng.fromSeed(`${s.config.seed}|rescind31|${actId}|${s.week}`);
  const x = r.next();
  const pAccept = clamp(0.12 + sc * 0.75, 0.1, 0.88);
  const rest = 1 - pAccept;
  const reaction: Reaction31 = x < pAccept ? 'accept' : x < pAccept + rest * 0.4 ? 'cry' : x < pAccept + rest * 0.72 ? 'sue' : 'leak';
  const lead = leaderOf31(s, a);
  const name = a.name;
  if (q.fee > 0) post(s, `rescind31:${actId}`, -q.fee, 'advances', `Rescisão ${name}`);
  endContract(s, a, 'terminated');
  const why = l('Você rescindiu o contrato', 'You terminated the contract');
  if (reaction === 'accept') { if (lead) opine(s, `p:${lead}`, -3, why); }
  else if (reaction === 'cry') { if (lead) opine(s, `p:${lead}`, -12, why); s.player.reputation.artists = clamp(s.player.reputation.artists - 1, 0, 100); }
  else if (reaction === 'sue') {
    if (lead) opine(s, `p:${lead}`, -25, why);
    const legal = Math.round(Math.max(q.fee * 0.5, money(s, 400)) / 100) * 100;
    post(s, `rescind31legal:${actId}`, -legal, 'legal', `Acordo judicial ${name}`);
  } else {
    if (lead) opine(s, `p:${lead}`, -20, why);
    s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
  }
  const R = REACTION31[reaction];
  const text = fmtL(l('{a}: contrato rescindido ({r}).', '{a}: contract terminated ({r}).'), { a: name, r: R.label });
  remember(s, 'rescind31', text, { actId, important: true });
  emitFact(s, { kind: 'contract_rescind', actors: ['player', actId, lead ?? ''], severity: 20 + a.fame / 3 + (reaction === 'leak' ? 15 : 0), visibility: reaction === 'leak' ? 'public' : 'rumor', tags: ['contract', 'rescind', reaction], text, src: 'rescind31' });
  return { ok: true, text, reaction };
}
