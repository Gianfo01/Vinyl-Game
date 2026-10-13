// Rodada 29 — o rascunho do formulário "Montar um plano" (Submundo › Planos) num módulo próprio, para que o menu de
// ações (clique direito num nome, ps/ctx27.ts) abra o MESMO formulário já com o crime e o alvo escolhidos, sem importar a
// tela do Submundo inteira. A tela (crime17.ts) continua dona do formulário: valida o alvo e o método ao desenhar.
// r29 (alvos): qualquer pessoa, ato ou selo vale como alvo — o menu passa a chave da entidade clicada ('p:…', 'pd:…',
// 'e:…', 'l:…', 'c:…', 's:…', id do ato ou do selo) e presetCrimeFor29 a converte no id de alvo do Submundo.

import { CRIMES17, targetId17 } from '../../sim/sys/crime17';
import type { GameState } from '../../sim/types';

export interface CrimeForm17 {
  c: string; actor: string; target: string; method: string; org: string; partners: string[];
  /** r29: texto da busca do seletor de alvo (some ao escolher) */
  q?: string;
  /** r29: prêmio da votação comprada (award_rig) */
  cat?: string;
}
export const crimeForm17: CrimeForm17 = { c: 'blackmail', actor: 'player', target: '', method: '', org: '', partners: [], q: '' };

/** Pré-escolhe o crime e o alvo (o método volta ao primeiro; executor, organização e sócios ficam como estavam). */
export function presetCrime17(c: string, target: string): void {
  crimeForm17.c = c;
  crimeForm17.target = target;
  crimeForm17.method = '';
  crimeForm17.q = '';
}

/** Crime padrão do menu para o tipo de entidade (a primeira ação daquele tipo de alvo). */
export const defaultCrime29 = (tk: 'person' | 'act' | 'label' | 'own_act'): string => CRIMES17.find((c) => c.tk === tk)?.id ?? 'blackmail';

/** r29: pré-escolha a partir do menu de ações — qualquer pessoa/ato/selo; a chave de pessoa vira o id de alvo. */
export function presetCrimeFor29(s: GameState, c: string, entityId: string): void {
  presetCrime17(c, targetId17(s, entityId));
}

/** r29 (Submundo): o planejador com a família como executora ("Contratar a família"): o alvo se escolhe no seletor. */
export function presetHire29(oid: string, c: string, method?: string): void {
  crimeForm17.c = c;
  crimeForm17.actor = `hire:${oid.replace(/^o:/, '')}`;
  crimeForm17.method = method ?? '';
  crimeForm17.q = '';
  crimeForm17.org = '';
}
