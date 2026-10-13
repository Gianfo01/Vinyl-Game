// Rodada 29 — o rascunho do formulário "Montar um plano" (Submundo › Planos) num módulo próprio, para que o menu de
// ações (clique direito num nome, ps/ctx27.ts) abra o MESMO formulário já com o crime e o alvo escolhidos, sem importar a
// tela do Submundo inteira. A tela (crime17.ts) continua dona do formulário: valida o alvo e o método ao desenhar.

export interface CrimeForm17 { c: string; actor: string; target: string; method: string; org: string; partners: string[] }
export const crimeForm17: CrimeForm17 = { c: 'blackmail', actor: 'player', target: '', method: '', org: '', partners: [] };

/** Pré-escolhe o crime e o alvo (o método volta ao primeiro; executor, organização e sócios ficam como estavam). */
export function presetCrime17(c: string, target: string): void {
  crimeForm17.c = c;
  crimeForm17.target = target;
  crimeForm17.method = '';
}
