// Rodada 19 (onda 4) — o playbot (selo) responde às mensagens da R19 que pedem decisão e divide a autoria das canções
// novas, como um dono sensato do perfil. Sem isso as cadeias que passam por writers19 (canção de fora, ghostwriter,
// divisão de créditos — cadeia 3 do plano19 §9) nunca aconteciam nas partidas de bot.
import type { Profile } from './playbot16';
import type { GameState } from './types';
import { money } from './util';
import { answerMsg } from './sys/people/inbox';
import { P } from './sys/people/state';
import { negotiateSplit19, splittable19 } from './sys/writers19';

const PICK19: Record<string, (s: GameState, p: Profile) => string> = {
  wr19_offer: (s, p) => (p === 'aggressive' ? 'cut' : p === 'cautious' && s.player.cash < money(s, 40000) ? 'no' : 'take'),
  wr19_ghost: (_s, p) => (p === 'aggressive' ? 'pay' : 'credit'),
};
export function botR19(s: GameState, prof: Profile): void {
  for (const m of [...P(s).inbox]) {
    if (m.resolved || !m.actions?.length) continue;
    const f = PICK19[String(m.ref?.k18 ?? '')];
    const a = f?.(s, prof);
    if (a && m.actions.some((x) => x.id === a)) answerMsg(s, m.id, a);
  }
  const so = splittable19(s).find((x) => !x.splits?.length);
  if (so) negotiateSplit19(s, so.id, prof === 'cautious' ? 'band' : prof === 'aggressive' ? 'lead' : 'writers');
}
