// Rodada 19 (Frente 8, onda 4 — pedido do usuário): UMA chave "Sem tutoriais (já sei jogar)" que desliga de uma vez
// tudo o que é tutorial: cartão de onboarding (tutorial.ts), tours de página e dicas de 1ª vez (tutorial18), avisos de
// objetivo das trilhas (tracks18), cartão de abertura e avisos de área nova (ux19) e a divulgação progressiva do menu.
// Fica nas preferências (vale para todas as partidas). Nada de cena, resumo do mês ou jogo é afetado; a virada de
// era/década vira um aviso de uma linha. Puro (sem DOM): testável.
import { l, type L } from '../data/world';

/** O que pode ser desligado. `card` onboarding · `tour` tour de página · `tip` dica de 1ª vez · `track` aviso de trilha ·
 *  `opening` cartão de metas de abertura · `nav` menu progressivo e avisos de área nova · `turn` cartão grande de virada. */
export type TutKind19 = 'card' | 'tour' | 'tip' | 'track' | 'opening' | 'nav' | 'turn';
export interface TutPrefs19 { noTut19?: boolean; tut18?: { noTours?: boolean; noTips?: boolean } }

/** Pode mostrar? Com a chave ligada nada de tutorial aparece; sem ela valem as escolhas finas antigas (tours/dicas). */
export function tutAllowed19(p: TutPrefs19, k: TutKind19): boolean {
  if (p.noTut19) return false;
  if (k === 'tour') return !p.tut18?.noTours;
  if (k === 'tip') return !p.tut18?.noTips;
  return true;
}
export const tutorialsOff19 = (p: TutPrefs19): boolean => !!p.noTut19;

/** Liga/desliga tudo de uma vez (mantém as escolhas finas coerentes). */
export function setTutorials19(p: TutPrefs19, on: boolean): void {
  p.noTut19 = !on;
  const t = (p.tut18 ??= {});
  t.noTours = !on;
  t.noTips = !on;
}

export const TUTOFF_LABEL19: L = l('Sem tutoriais (já sei jogar)', 'No tutorials (I know how to play)');
export const TUTOFF_HINT19: L = l('Desliga de uma vez o passo a passo, os tours de página, as dicas de "primeira vez", os avisos de objetivos e o menu que abre aos poucos. Religue em Configurações.',
  'Turns off the walkthrough, page tours, "first time" tips, goal toasts and the gradually opening menu all at once. Turn back on in Settings.');
