// Sistema "scenes" da rodada 4: cenas jogáveis em locais de pixel art (premiação, entrevista,
// rádio, tribunal, conselho, turnê, vida). A simulação decide quando cada cena acontece e aplica
// os efeitos das escolhas; a interface (src/ui/sys/scenes.ts) desenha os locais.

import { registerMod, registerSimHook } from '../ext4';
import { awardsYear, heatOnLaunch } from './scenes/awards';
import { agmYear } from './scenes/board';
import { courtWeek } from './scenes/court';
import { crisisPressers } from './scenes/interview';
import { clubMonth, fairMonth, launchScenes, mansionYear, memoryWatch, shortageWeek, streetMonth } from './scenes/life';
import { radioAppeal, radioCleanup } from './scenes/radio';
import { sc } from './scenes/state';
import { airportDay, vignetteOnShow } from './scenes/tour';

export * from './scenes/state';

registerSimHook('newgame', 'scenes', (s) => {
  // memórias da criação do mundo não viram cenas
  const st = sc(s);
  for (const m of s.memory) st.memCursor = Math.max(st.memCursor, parseInt(m.id.slice(1), 36) || 0);
});

registerSimHook('day', 'scenes', (s, r, arg) => {
  crisisPressers(s, r);
  if ((arg.day ?? 0) % 7 === 0) airportDay(s);
});

registerSimHook('week', 'scenes', (s, r) => {
  memoryWatch(s, r);
  courtWeek(s);
  shortageWeek(s);
});

registerSimHook('month', 'scenes', (s, r) => {
  memoryWatch(s, r);
  streetMonth(s, r);
  fairMonth(s);
  clubMonth(s, r);
  radioCleanup(s);
});

registerSimHook('year', 'scenes', (s, r) => {
  awardsYear(s, r);
  agmYear(s, r);
  mansionYear(s);
});

registerSimHook('launch', 'scenes', (s, r, arg) => {
  if (!arg.release) return;
  heatOnLaunch(s, r, arg.release);
  launchScenes(s, arg.release);
});

registerSimHook('show', 'scenes', (s, r, arg) => {
  if (arg.show) vignetteOnShow(s, r, arg.show);
});

registerMod('appeal', 'scenes-radio', (s, value, ctx) => radioAppeal(s, value, ctx.release?.id));
