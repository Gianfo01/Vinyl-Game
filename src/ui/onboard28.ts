// Rodada 28 (F4) — orquestrador de onboarding de UMA camada.
// O passo a passo (tutorial.ts) deixa de ser "leia e aperte Próximo": cada passo diz o que FAZER e se conclui sozinho
// quando você faz (visitar a página certa, contratar, lançar, avançar o tempo) — o mesmo critério das trilhas (tracks18).
// Uma camada por vez: enquanto há passo do tutorial na tela, os avisos de objetivo das trilhas ficam calados (são marcados
// como feitos, sem toast) e as dicas de 1ª vez esperam (fila queue27). O "Próximo" vira "Pular passo".
// A regra de conclusão é pura (testável); só lê o estado — nada muda a simulação.

import { l, type L } from '../data/world';
import type { GameState } from '../sim/types';

/** Contexto da interface no momento do desenho. */
export interface ObCtx28 {
  /** página aberta agora */
  area: string;
  /** o passo já foi mostrado antes (num desenho anterior) — evita concluir no mesmo instante em que aparece */
  armed: boolean;
  /** semana em que o passo apareceu pela 1ª vez */
  week0: number;
}

const mineActs = (s: GameState): number => Object.values(s.acts).filter((a) => a.owner === 'player' || (a as { playerBand?: boolean }).playerBand).length;

/** O que fazer em cada passo (pela página do passo; undefined = avançar o tempo). */
export const DO28: Record<string, L> = {
  cockpit: l('Faça: abra o Mercado (radar de talentos).', 'Do: open the Market (talent radar).'),
  market: l('Faça: contrate um artista (ou já tenha um).', 'Do: sign an act (or already have one).'),
  artists: l('Faça: abra a página Artistas.', 'Do: open the Artists page.'),
  creation: l('Faça: abra Criação ou lance um disco.', 'Do: open Creation or release a record.'),
  plan: l('Faça: abra a Central de decisões.', 'Do: open the Decision hub.'),
  hq: l('Faça: visite a sua sede.', 'Do: visit your HQ.'),
  world: l('Faça: abra o Mundo.', 'Do: open the World.'),
  '': l('Faça: avance o tempo (▶ Semana ou ▶ Mês).', 'Do: advance time (▶ Week or ▶ Month).'),
};
export const doHint28 = (area?: string): L => DO28[area ?? ''] ?? DO28[''];

/** Puro: o passo (identificado pela página) foi concluído fazendo? */
export function doneByDoing28(area: string | undefined, s: GameState, c: ObCtx28): boolean {
  if (!c.armed) return false;
  switch (area ?? '') {
    case 'cockpit': return c.area === 'market' || s.player.stats.signed >= 1 || mineActs(s) > 0 && c.area !== 'cockpit';
    case 'market': return s.player.stats.signed >= 1 || mineActs(s) > 0;
    case 'creation': return c.area === 'creation' || s.player.stats.releases >= 1;
    case '': return s.week > c.week0;
    default: return c.area === area;
  }
}

// ---------------------------------------------------------------- estado de interface (memória da sessão)

let armedKey = '';
let armedWeek = 0;

/** Chamado depois de cada desenho com o passo atual: conclui se foi feito. Devolve true se avançou. */
export function tick28(s: GameState, stepArea: string | undefined, stepIdx: number, area: string, advance: () => void): boolean {
  const key = `${s.signature}:${stepIdx}`;
  const armed = armedKey === key;
  if (doneByDoing28(stepArea, s, { area, armed, week0: armedWeek })) { armedKey = ''; advance(); return true; }
  if (!armed) { armedKey = key; armedWeek = s.week; }
  return false;
}

/** Uma camada por vez: avisos de objetivo das trilhas só depois do passo a passo. */
export const trackToastOk28 = (s: GameState): boolean => !!s.tutorial?.done;
