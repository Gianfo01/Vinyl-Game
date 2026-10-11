// Sistema "music" (rodada 4, enxugado na rodada 5): trecho tocável de cada música, foco por etapa
// e equipamentos lendários aplicados na gravação. Os mini-jogos de composição foram retirados.

import { registerSimHook } from '../ext4';
import { gearOffersMonth, onRecorded } from './music/games';
import { isPlayerSong, pruneSongs } from './music/state';

export * from './music/state';
export * from './music/games';
export * from './music/data';

registerSimHook('record', 'music', (s, _r, arg) => {
  if (arg.song && isPlayerSong(s, arg.song)) onRecorded(s, arg.song);
});

// r21 (E-1): a sessão de estúdio dispara o gancho 'record' (closeTrack); as varreduras compensatórias saíram.
registerSimHook('month', 'music', (s, r) => gearOffersMonth(s, r));
registerSimHook('year', 'music', (s) => pruneSongs(s));
