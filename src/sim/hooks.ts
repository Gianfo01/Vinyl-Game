// Ponto único onde os sistemas da expansão entram no tick (dia, semana, mês, ano).

import type { Rng } from '../core/rng';
import type { GameState } from './types';
import { startPlans as startPlansImpl } from './capacity';
import { sessionDay, studioCleanup } from './studio';
import { tourDay, toursCleanup } from './tours';
import { crisisDay, mediaMonth } from './media';
import { rolloutsWeek } from './rollout';
import { auctionsWeek, discoveryMonth } from './discovery';
import { chartsWeek } from './charts2';
import { financeMonth } from './finance';
import { fandomMonth } from './fandom';
import { dynastyMonth, dynastyYear } from './dynasty';
import { subLabelsMonth } from './sublabels';
import { brandsMonth } from './brands';
import { businessMonth } from './business';
import { neuralMonth } from './neural';
import { cultureMonth, registerMovementGenres } from './culture';
import { rivals2Month } from './rivals2';
import { contracts2Month } from './contracts2';
import { directorMonth as directorImpl } from './director';
import { yearlyAwards2 } from './awards2';
import './contentBridge';

export function startPlans(s: GameState, r: Rng): void {
  startPlansImpl(s, r);
}

export function dailyStep(s: GameState, r: Rng, day: number): void {
  sessionDay(s, r, day);
  tourDay(s, r, day);
  crisisDay(s, r, day);
}

export function weeklyExt(s: GameState, r: Rng): void {
  rolloutsWeek(s, r);
  auctionsWeek(s, r);
  chartsWeek(s);
}

export function monthlyExt(s: GameState, r: Rng): void {
  registerMovementGenres(s);
  financeMonth(s, r);
  fandomMonth(s, r);
  dynastyMonth(s, r);
  subLabelsMonth(s, r);
  discoveryMonth(s, r);
  mediaMonth(s, r);
  brandsMonth(s, r);
  businessMonth(s, r);
  neuralMonth(s, r);
  cultureMonth(s, r);
  rivals2Month(s, r);
  contracts2Month(s, r);
  studioCleanup(s);
  toursCleanup(s);
  s.loadNow = {};
  if (s.daily.length > 160) s.daily.splice(0, s.daily.length - 160);
}

export function yearlyExt(s: GameState, r: Rng): void {
  dynastyYear(s);
  yearlyAwards2(s, r);
}

export function directorMonth(s: GameState, r: Rng): void {
  directorImpl(s, r);
}
