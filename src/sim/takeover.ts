// Assumir uma gravadora existente no começo da partida (rodada 9). Só os termos ficam aqui (puro, sem
// worldgen); a transferência em si roda em worldgen.ts logo depois do setup do jogador.

import { nominal } from '../core/money';
import { clamp } from '../core/rng';
import { familyOf, genreById, l, type L } from '../data/world';
import type { GameState, Label } from './types';

export interface TakeoverTerms {
  /** 1 = pequena (sem dívida), 2 = média, 3 = grande (dívida pesada) */
  tier: 1 | 2 | 3;
  /** caixa que vem junto (centavos, já com a dificuldade) */
  cash: number;
  /** dívida da aquisição (centavos) e parcela mensal */
  debt: number;
  monthly: number;
  hq: number;
  staff: number;
  /** queda de confiança dos artistas com o dono novo */
  trustHit: number;
  roster: number;
  genres: string[];
  reputation: number;
  notes: L[];
}

const RATE = 0.09;
const MONTHS = 120;

export function takeoverTerms(s: GameState, lb: Label): TakeoverTerms {
  const year = s.config.startYear;
  const roster = lb.roster.filter((id) => s.acts[id]).length;
  const tier: 1 | 2 | 3 = lb.family === 'A' || roster >= 12 ? 3 : roster >= 5 || lb.cash > nominal(2_500_000, year) ? 2 : 1;
  const diff = s.config.difficulty === 'easy' ? 1.3 : s.config.difficulty === 'hard' ? 0.75 : 1;
  const cash = Math.round(Math.min(Math.max(0, lb.cash), nominal([0, 90_000, 250_000, 700_000][tier], year)) * diff);
  const debt = Math.round(nominal([0, 0, 220_000, 1_400_000][tier], year) * (0.8 + lb.reputation / 100) / diff) + Math.max(0, lb.debt ?? 0);
  const i = RATE / 12;
  const monthly = debt ? Math.round((debt * i) / (1 - Math.pow(1 + i, -MONTHS))) : 0;
  const count: Record<string, number> = {};
  for (const id of lb.roster) { const a = s.acts[id]; if (a) count[a.genre] = (count[a.genre] ?? 0) + 1; }
  const genres = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g).filter((g) => genreById[g]);
  if (!genres.length) for (const f of lb.focus.slice(0, 3)) { const g = Object.keys(genreById).find((x) => familyOf(x) === f); if (g) genres.push(g); }
  const notes: L[] = [];
  if (tier === 1) notes.push(l('Selo pequeno: sem dívidas, pouco caixa.', 'Small label: no debt, little cash.'));
  if (tier >= 2) notes.push(l('Dívida da compra paga em 120 parcelas; a equipe vem junto (salários).', 'Purchase debt paid over 120 instalments; the staff comes along (salaries).'));
  if (tier === 3) notes.push(l('Gigante: credores e artistas desconfiados do dono novo (confiança −16).', 'Giant: creditors and artists wary of the new owner (trust −16).'));
  if ((lb.debt ?? 0) > 0) notes.push(l('Herda dívidas antigas do selo.', 'Inherits the label\'s old debts.'));
  return { tier, cash, debt, monthly, hq: tier === 1 ? 1 : 2, staff: [0, 0, 2, 4][tier], trustHit: [0, 0, 8, 16][tier], roster, genres, reputation: clamp(lb.reputation, 0, 100), notes };
}
