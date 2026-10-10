// Rodada 17 — efeitos das opções novas do Novo Jogo na simulação:
// - "Real até o início": tira as estreias reais futuras (catálogo clássico e lote real); só artistas novos inventados surgem.
// - Dificuldade detalhada: perks com rótulo (aparecem nos "por quê") + agressividade das rivais.
// - Prazo da partida: no último dezembro, pontuação final (mesma conta do desafio da semana), patente e cena de resultado.

import { l } from '../../data/world';
import { queueCutscene, registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { registerPerkSource } from '../perks';
import { diffPerks17, rank17, rivalAggr17 } from '../start17';
import type { GameState } from '../types';
import { fmtL, remember } from '../util';
import { challengeScore } from './live';
import { rw } from './realworld';

export interface Start17State { done?: { score: number; year: number; years: number } }
declare module '../ext4' { interface Ext4 { start17: Start17State } }
registerExt4('start17', () => ({}));
const st = (s: GameState): Start17State => ((s as unknown as { x4: { start17?: Start17State } }).x4.start17 ??= {});

registerSimHook('newgame', 'start17', (s) => {
  const c = s.config;
  if (c.snap17) {
    const before = s.upcoming.length + (rw(s)?.upcoming.length ?? 0);
    s.upcoming = s.upcoming.filter((u) => u.synthetic);
    if (rw(s)) rw(s).upcoming = [];
    remember(s, 'start17', fmtL(l('Mundo "real até o início": {n} estreias reais futuras não vão acontecer — o futuro da música está em aberto.', '"Real until the start" world: {n} future real debuts will not happen — the future of music is open.'), { n: before }), { important: true });
  }
  const k = rivalAggr17(c.diff17);
  if (k !== 1) for (const lb of Object.values(s.labels)) lb.aggression = Math.max(0.05, Math.min(1, lb.aggression * k));
});

registerPerkSource('diff17', (s) => {
  const v = diffPerks17(s.config.diff17);
  return Object.keys(v).length ? [{ label: l('Dificuldade detalhada (Novo Jogo)', 'Detailed difficulty (New Game)'), values: v }] : [];
});

/** Ano final da partida com prazo (inclusive), ou null. */
export const runEnd17 = (s: GameState): number | null => (s.config.runYears17 ? s.config.startYear + s.config.runYears17 - 1 : null);

registerSimHook('month', 'start17', (s) => {
  const end = runEnd17(s);
  const S = st(s);
  if (end === null || S.done) return;
  if (!(s.ended || s.year > end || (s.year === end && s.month === 11))) return;
  const years = s.config.runYears17!;
  const score = challengeScore(s);
  S.done = { score, year: s.year, years };
  const rank = rank17(score, years);
  const text = fmtL(l('Fim do prazo de {n} anos: {p} pontos — {r}.', 'End of the {n}-year run: {p} points — {r}.'), { n: years, p: score, r: rank });
  remember(s, 'run17', text, { important: true });
  emitFact(s, { kind: 'run_end', actors: ['player'], place: s.config.homeCity, severity: 50, visibility: 'public', tags: ['good'], text, src: 'start17', data: { score, years } });
  queueCutscene(s, 'run17Result', { score, years, year: s.year });
});

export const runDone17 = (s: GameState): Start17State['done'] => st(s).done;
