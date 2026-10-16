// R31 · O (RN-04) — MOTIVO DO BLOQUEIO ANTES DO CLIQUE. Toda ação travada carrega dois textos: o motivo (por que não dá
// agora) e a condição para liberar (o que precisa mudar). A interface (ui/r31/o31.ts → lockBtn31) mostra os dois junto do
// botão, antes do clique; o clique numa ação travada não faz nada além de repetir o motivo.
//
// Puro (sem DOM, só leitura do estado): testes rodam em Node.
//
//   lock31(motivo, condição)          // trava com os dois textos
//   lockOf31(motivo)                  // completa a condição pelo tipo do motivo (caixa, agenda, contrato…)
//   cashLock31(s, custo)              // trava de caixa livre (null quando o caixa livre cobre)

import { formatMoney } from '../../core/money';
import { l, type L } from '../../data/world';
import { cashWhy20, freeCash20, otherReserves20, reservedAdvances20 } from '../oblig20';
import type { GameState } from '../types';

export interface Lock31 {
  /** por que não dá agora */
  why: L;
  /** o que precisa mudar para liberar */
  unlock: L;
}

export const lock31 = (why: L, unlock: L): Lock31 => ({ why, unlock });

/** Dinheiro pelo formatador do jogo (`formatMoney`), no idioma de cada lado do texto. */
const usd = (c: number, lang: 'pt' | 'en' = 'en'): string => formatMoney(Math.max(0, c), lang === 'pt' ? 'pt-BR' : 'en-US');
const fold = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Condições comuns (uma frase curta cada). */
export const UNLOCK31 = {
  generic: l('Libera sozinho quando o motivo acima deixar de valer.', 'Unlocks by itself once the reason above no longer applies.'),
  cash: l('Junte caixa livre: receitas do mês, venda de algo, empréstimo ou retire ofertas pendentes.', 'Raise free cash: this month\'s income, a sale, a loan, or withdraw pending offers.'),
  reserved: l('Retire uma oferta pendente ou espere a resposta: o adiantamento reservado volta ao caixa livre.', 'Withdraw a pending offer or wait for the answer: the reserved advance returns to free cash.'),
  agenda: l('Abra espaço na agenda (tire um item) ou espere o próximo mês.', 'Free a slot on the agenda (remove an item) or wait for next month.'),
  songs: l('Componha: ponha "Compor" na agenda do artista.', 'Write songs: put "Write" on the act\'s agenda.'),
  record: l('Grave todas as faixas do projeto.', 'Record every track of the project.'),
  health: l('Espere a recuperação ou dê descanso na agenda.', 'Wait for recovery or schedule rest on the agenda.'),
  hiatus: l('Tire o artista da pausa (ou espere o fim dela).', 'Bring the act back from hiatus (or wait for it to end).'),
  roster: l('Só vale para artistas do seu elenco: contrate primeiro.', 'Only for acts on your roster: sign them first.'),
  signed: l('Espere o contrato atual dele acabar ou pague a cláusula de saída no Mercado de contratos.', 'Wait for their current contract to end or pay the exit clause in the Contract market.'),
  ended: l('Não volta: a carreira acabou.', 'Does not come back: the career is over.'),
  tour: l('Espere a turnê atual terminar (ou cancele-a em Shows › Turnês).', 'Wait for the current tour to end (or cancel it in Shows › Tours).'),
  offer: l('Espere a resposta da oferta em aberto ou retire-a.', 'Wait for the answer to the open offer or withdraw it.'),
  project: l('Crie um projeto em Criação › Projetos.', 'Create a project in Creation › Projects.'),
  scheduled: l('Já está a caminho: acompanhe no calendário.', 'Already on its way: follow it on the calendar.'),
  time: l('Espere o próximo mês: o tempo livre volta na virada.', 'Wait for next month: free time comes back at the turn.'),
  year: l('Ainda não existe nesta época: espere os anos passarem.', 'Does not exist yet in this era: wait for the years to pass.'),
  cap: l('Já está no máximo: venda ou feche um para abrir espaço.', 'Already at the maximum: sell or close one to make room.'),
  owned: l('Já é seu: nada a fazer aqui.', 'Already yours: nothing to do here.'),
  wait: l('Espere o intervalo passar: volta sozinho nas próximas semanas.', 'Wait for the interval to pass: it comes back by itself in a few weeks.'),
  fame: l('Ganhe fama: lance discos, faça shows e apareça na mídia.', 'Gain fame: release records, play shows and get media coverage.'),
  release: l('Lance um disco: vale enquanto ele estiver nas lojas.', 'Release a record: it counts while it is in stores.'),
  date: l('Espere a data: libera sozinho quando ela chegar.', 'Wait for the date: it unlocks by itself when it comes.'),
} satisfies Record<string, L>;

/** Regras de leitura do motivo → condição (primeira que casar). */
const RULES: [RegExp, keyof typeof UNLOCK31][] = [
  [/a cada \d+ semana|every \d+ week|ha pouco|recently|espere umas/, 'wait'],
  [/fama \d|fame \d|desconhecid|unknown act/, 'fame'],
  [/lancamento recente|recent release/, 'release'],
  [/inativo|inactive/, 'ended'],
  [/reservad|reserved/, 'reserved'],
  [/caixa|cash|dinheiro|money|patrimon|wealth/, 'cash'],
  [/compon|escrit|written|write first|nenhuma musica|no written/, 'songs'],
  [/faixa|track/, 'record'],
  // R31 (POL): motivo com data marcada ("abre na estreia, em março de 2027") pede esperar a data — não a dica de agenda
  [/\b(abre|abrem|libera|opens?|unlocks?) (na|no|em|a partir|in|on|at|from)\b|\bestreia\b|\bpremiere\b|\b(em|in) (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|january|february|march|april|may|june|july|august|september|october|november|december)\b/, 'date'],
  [/agenda|capacidade|capacity|sem espac|espaco livre|no room|free slot|agenda slot/, 'agenda'],
  [/pausa|hiato|hiatus/, 'hiatus'],
  [/condic|saude|doente|fit\b|health|sick|recuper/, 'health'],
  [/elenco|roster|nao e seu|not your/, 'roster'],
  [/encerrou|aposent|ended|retired|career is over/, 'ended'],
  [/turne|tour/, 'tour'],
  [/oferta|offer/, 'offer'],
  [/contrato|contract|selo|label/, 'signed'],
  [/ja programad|already scheduled/, 'scheduled'],
  [/tempo livre|free time|este mes|this month/, 'time'],
  [/ainda nao existe|ainda nao ha|don't exist yet|nao existem|no radio yet|not yet/, 'year'],
  [/maximo|as many as|teto|cap\b/, 'cap'],
  [/ja e sua|ja e seu|already yours|already own/, 'owned'],
];

/** Condição para liberar deduzida do motivo (quando quem trava não disse). */
export function unlockFor31(why: L): L {
  const x = fold(`${why.pt} ${why.en}`);
  for (const [re, k] of RULES) if (re.test(x)) return UNLOCK31[k];
  return UNLOCK31.generic;
}

/** Motivo (ou nada) → trava completa. `unlock` explícito vence a dedução. */
export function lockOf31(why: L | null | undefined, unlock?: L | null): Lock31 | null {
  if (!why) return null;
  return { why, unlock: unlock ?? unlockFor31(why) };
}

/** Trava de caixa livre: diz quanto falta e, se a culpa for a reserva de ofertas, diz isso. */
export function cashLock31(s: GameState, cost: number, base?: L): Lock31 | null {
  const free = freeCash20(s);
  if (cost <= 0 || free >= cost) return null;
  const short = cost - Math.max(0, free);
  const reservedBlocks = s.player.cash >= cost && reservedAdvances20(s) + otherReserves20(s) > 0;
  const why = base ? cashWhy20(s, cost, base) : l(`Caixa livre ${usd(free, 'pt')}; precisa de ${usd(cost, 'pt')}.`, `Free cash ${usd(free)}; needs ${usd(cost)}.`);
  const unlock = reservedBlocks ? UNLOCK31.reserved : l(`Faltam ${usd(short, 'pt')}. ${UNLOCK31.cash.pt}`, `${usd(short)} short. ${UNLOCK31.cash.en}`);
  return { why, unlock };
}

/** Uma linha: "motivo — Para liberar: condição". */
export function lockLine31(k: Lock31): L {
  return l(`${k.why.pt} — Para liberar: ${k.unlock.pt}`, `${k.why.en} — To unlock: ${k.unlock.en}`);
}
