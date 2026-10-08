// Sistema "music" (rodada 4, enxugado na rodada 5): trecho tocável de cada música, foco por etapa
// e equipamentos lendários aplicados na gravação. Os mini-jogos de composição foram retirados.

import { registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { gearOffersMonth, onRecorded } from './music/games';
import { isPlayerSong, ms, pruneSongs } from './music/state';

export * from './music/state';
export * from './music/games';
export * from './music/data';

registerSimHook('record', 'music', (s, _r, arg) => {
  if (arg.song && isPlayerSong(s, arg.song)) onRecorded(s, arg.song);
});

/** Sessões de estúdio fecham faixas dia a dia; aplica foco/equipamento nelas. */
function sweepSessions(s: GameState): void {
  for (const sess of s.sessions) {
    if (s.day - sess.startDay > 120) continue;
    for (const id of sess.songIds) {
      const so = s.songs[id];
      if (!so?.recorded || !isPlayerSong(s, so)) continue;
      const rec = ms(s).songs[id];
      if (rec?.recSeen) continue;
      onRecorded(s, so);
    }
  }
}

registerSimHook('day', 'music', (s) => sweepSessions(s));
registerSimHook('week', 'music', (s) => sweepSessions(s));
registerSimHook('month', 'music', (s, r) => gearOffersMonth(s, r));
registerSimHook('year', 'music', (s) => pruneSongs(s));
