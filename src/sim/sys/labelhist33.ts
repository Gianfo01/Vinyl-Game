// R33 (DADOS33) — gravadora histórica dos atos reais no começo da partida (dados em src/data/labelhist33.ts).
// Antes o dono do contrato inicial era sorteado entre todas as gravadoras do mundo (Luiz Gonzaga em 1962 saía na
// Columbia, na K-tel ou na Victor Talking Machine). O contrato do começo é um fato anterior ao início: vale em TODOS os
// modos de história. Só muda quem tem selo documentado para o ano de início E esse selo está no mundo; o resto segue o
// sorteio de sempre. Sorteio próprio (`semente|hist33`): o resto do mundo não muda de sequência.
import { Rng } from '../../core/rng';
import { histLabelAt33 } from '../../data/labelhist33';
import { actsNow27 } from '../tickcache27';
import type { GameState } from '../types';
import { signTo } from '../worldgen';

export function histOwners33(s: GameState): void {
  const cfg = s.config;
  if (!cfg.realNames || cfg.labels?.start === 'equal' || cfg.labels?.start === 'startups') return;
  const y = cfg.startYear;
  const r = Rng.fromSeed(`${cfg.seed}|hist33`);
  for (const act of actsNow27(s)) {
    if (!act.catalogNo || act.owner === 'player' || act.playerBand) continue;
    if (act.status !== 'active' && act.status !== 'emerging' && act.status !== 'hiatus') continue;
    const h = histLabelAt33(act.name, y);
    if (!h) continue;
    const lb = Object.values(s.labels).find((x) => x.name === h && x.active && x.founded <= y && x.id !== cfg.takeover);
    if (!lb || act.owner === lb.id) continue;
    const old = act.owner ? s.labels[act.owner] : undefined;
    if (old) old.roster = old.roster.filter((id) => id !== act.id);
    const k = act.contractId ? s.contracts[act.contractId] : undefined;
    if (k && k.party === act.owner) {
      k.party = lb.id;
      k.publishing = lb.family === 'D';
      act.owner = lb.id;
      lb.roster.push(act.id);
    } else signTo(s, r, act, lb);
  }
}
