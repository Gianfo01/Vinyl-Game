// R29 (CONNECT): arestas de mecanismo que a sonda (scripts/probe29mech.ts) mediu como mortas ou fracas e que o jogo
// promete em texto. Mínimas e aditivas; aparecem na autópsia/no "por quê" como qualquer modificador.
//  - escândalo → próximo disco: só havia −5% por 6 semanas nas vendas (e só com efeito ≥ 60). Um disco lançado até
//    26 semanas depois de um escândalo pesado (efeito ≥ 40) fora do gênero rebelde estreia com apelo menor (até −15%).
//    Vale para todos os atos (NPC também). No gênero rebelde segue o efeito Streisand de sempre (bridge17).
//  - prêmios → ofertas: prêmios do selo não mexiam em nada na chance de aceite. Viram prestígio (perk 'offer', a mesma
//    chave que evaluateOffer já lê e que passa pelo teto PERK_CAP18): +0,012 por prêmio nos últimos 5 anos, até +0,06.
import { l } from '../../data/world';
import { registerMod } from '../ext4';
import { registerPerkSource } from '../perks';
import { lastScandal } from '../scandal17';
import type { GameState } from '../types';

registerMod('appeal', 'scandal29', (s: GameState, v, { release, act }) => {
  const id = release?.actId ?? act?.id;
  const sc = id ? lastScandal(s, id) : undefined;
  if (!sc || sc.rebel || sc.eff < 40 || s.week - sc.w > 26) return null;
  const k = 1 - Math.min(0.15, sc.eff / 600);
  return { value: v * k, label: l('Escândalo recente pesa na estreia', 'Recent scandal weighs on the launch') };
});

registerPerkSource('awards29', (s) => {
  const n = (s.awards ?? []).filter((a) => a.byPlayer && s.year - a.year <= 5).length;
  return n ? [{ label: l('Prestígio: prêmios do selo nos últimos 5 anos', 'Prestige: label awards in the last 5 years'), values: { offer: Math.min(0.06, n * 0.012) } }] : [];
});
