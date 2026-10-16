// Masters 31 (onda 0, W0-CAL): regra "nada tem data sem estar no calendário". Todo sistema que guarda datas futuras
// visíveis ao jogador registra um provedor em calendar19 (registerDeadline). Os que ainda não registram ficam numa
// lista de PENDENTES explícita que só pode diminuir (a onda 31.1, UNI-1, zera). Fonte: docs/r31/unificacao.md B.9.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { calendar19, deadlineProviders19 } from '../src/sim/calendar19';

/** sistema → [arquivo da simulação, provedor(es) de calendário que cobrem as datas dele] */
const SYSTEMS: Record<string, [string, string[]]> = {
  // já cobertos
  decide18: ['src/sim/sys/decide18.ts', ['decide18']],
  contracts18: ['src/sim/sys/contracts18.ts', ['contracts']],
  supply18: ['src/sim/sys/supply18.ts', ['release']],
  campus18: ['src/sim/sys/campus18.ts', ['campus18']],
  crime17: ['src/sim/sys/crime17.ts', ['court']],
  ceremonies8: ['src/sim/sys/ceremonies8.ts', ['awards']],
  awardcal19: ['src/sim/awardcal19.ts', ['awards', 'awardcal19']], // r31: Crítica, Indústria, Ao Vivo, Hall dos Ecos
  fest12: ['src/sim/sys/fest12.ts', ['live', 'fest12']], // r31: data via 'live'; compromissos de dinheiro via 'fest12'
  // faltam no calendário (B.9)
  tour12: ['src/sim/sys/tour12.ts', ['tour12']], // shows do agente/promotor (c12.shows)
  route8: ['src/sim/sys/route8.ts', ['route8']],
  road27: ['src/sim/sys/road27.ts', ['road27']],
  fests8: ['src/sim/sys/fests8.ts', ['fests8']], // line-ups dos festivais do mundo
  clash17: ['src/sim/sys/clash17.ts', ['clash17']], // agenda de concorrência (cal17)
  rollout: ['src/sim/rollout.ts', ['rollout']], // passos do plano de lançamento
  agenda17: ['src/sim/sys/agenda17.ts', ['agenda17']], // bolinhas do mês do dono
};

/** PENDENTES: só pode diminuir. Ao registrar o provedor de um destes, tire-o daqui (o teste avisa). */
const PENDING = ['tour12', 'route8', 'road27', 'fests8', 'clash17', 'rollout', 'agenda17'];
/** Teto histórico da lista (onda 0). Nunca aumente este número. */
const PENDING_MAX = 7;

describe('r31 W0-CAL · nada tem data sem estar no calendário', () => {
  createGame(defaultConfig('r31cal', { startYear: 1975 })); // carrega todos os sistemas
  const provs = new Set(deadlineProviders19());

  it('a lista de pendentes só diminui', () => {
    expect(PENDING.length).toBeLessThanOrEqual(PENDING_MAX);
    for (const id of PENDING) expect(Object.keys(SYSTEMS)).toContain(id);
  });

  it('cada sistema com data tem provedor (ou está na lista de pendentes)', () => {
    const missing: string[] = [];
    for (const [sys, [file, ids]] of Object.entries(SYSTEMS)) {
      expect(existsSync(file), `${sys}: arquivo ${file} sumiu — atualize a lista`).toBe(true);
      const ok = ids.every((id) => provs.has(id));
      if (PENDING.includes(sys)) expect(ok, `${sys} já tem provedor: tire-o de PENDING`).toBe(false);
      else if (!ok) missing.push(sys);
    }
    expect(missing, 'sistemas com data e sem provedor no calendário').toEqual([]);
  });

  it('o calendário não quebra com os provedores novos', () => {
    const s = createGame(defaultConfig('r31cal2', { startYear: 1990 }));
    expect(() => calendar19(s, { weeks: 52 })).not.toThrow();
  });
});
