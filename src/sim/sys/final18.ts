// Rodada 18 (integração final) — ajustes de balanço que não pertencem a uma frente só.
// Reputação artística: memória curta da crítica — sem discos aclamados recentes, volta devagar para o meio (1%/mês
// da distância até 50). Junto com o retorno decrescente de artDelta18 (util.ts), o 100 deixa de ser permanente.
import { registerSimHook } from '../ext4';

registerSimHook('month', 'final18', (s) => {
  const r = s.player.reputation;
  r.artistic = Math.round((r.artistic - (r.artistic - 50) * 0.01) * 100) / 100;
});
