// Rodada 20 (B28 + B11) — CICLO DE VIDA DOS ATOS: a abstração decidida e as transições do jogador legíveis.
//
// Decisão de abstração (B28), documentada aqui e na ajuda:
//   1. TODO ato tem um relógio de carreira (act.careerEnd). Ao passar dele, o fechamento mensal decide entre
//      hiato (fênix, raro) e aposentadoria (lifecycle.ts). Atos de fundo são tratados só por esse relógio.
//   2. Pessoas de atos ACOMPANHADOS (do jogador, fama > 25, catálogo real ou lenda) também vivem a camada
//      individual mensal: morte e aposentadoria de integrante (dynasty.ts agingMonth). O fundo não paga esse custo.
//   3. Atos reais no modo exato seguem o roteiro histórico (realSafe/histLocked) — não sorteiam fim nem morte.
// O que faltava era o jogador VER a transição chegando: um ato contratado se aposentava "do nada" no mês em
// que o relógio vencia. Agora, um ano antes, a caixa de entrada avisa (com o motivo e o que fazer); e uma
// varredura mensal garante a regra de liderança de members20 para qualquer saída que fuja do helper comum.
import { l } from '../../data/world';
import { registerSimHook } from '../ext4';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { fixLeader20 } from '../members20';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { actsNow27 } from '../tickcache27';

registerInboxKind('life20', { label: l('Carreira', 'Career'), cat: 'people', icon: 'person', prio: 1, goto: () => ({ area: 'artists', label: l('Abrir artistas', 'Open artists') }) });

/** Atos do jogador cujo relógio de carreira vence no ano que vem (ou neste). */
export function careerEndSoon20(s: GameState): { actId: string; year: number }[] {
  return playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.playerBand && (a.status === 'active' || a.status === 'emerging') && a.careerEnd - s.year <= 1 && a.careerEnd >= s.year)
    .map((a) => ({ actId: a.id, year: a.careerEnd }));
}

registerSimHook('month', 'life20', (s) => {
  for (const a of actsNow27(s)) if (a.leaderId) fixLeader20(s, a);
  for (const { actId, year } of careerEndSoon20(s)) {
    const k = `life20:end:${actId}:${year}`;
    if (s.flags[k]) continue;
    s.flags[k] = s.week;
    const a = s.acts[actId];
    pushInbox18(s, 'life20', {
      from: l('Equipe de A&R', 'A&R team').pt, tone: 'bad',
      subject: fmtL(l('{a} pensa em parar em {y}', '{a} is thinking of stopping in {y}'), { a: a.name, y: year }),
      body: fmtL(l('Cada ato tem um tempo de carreira; o de {a} termina em {y}. A partir daí, no fechamento de cada mês, o ato pode entrar em hiato ou se aposentar — e o contrato acaba junto. Projetos marcados para depois disso correm risco. Uma reunião de banda, um disco de despedida ou uma turnê de adeus aproveitam a fase.', 'Every act has a career span; {a}\'s ends in {y}. From then on, at each month close, the act may go on hiatus or retire — and the contract ends with it. Projects booked after that are at risk. A band meeting, a farewell record or a goodbye tour make the most of this phase.'), { a: a.name, y: year }),
      ref: { act: actId },
    });
  }
});
