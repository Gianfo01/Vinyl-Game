// Sistema "world4" da rodada 4: história da indústria como regras datadas, jabá e curadores,
// feiras e hype, metodologia e manipulação das paradas, paradas extras, fã-clubes oficiais,
// sindicatos, sociedades de direitos, leis do setor, selo de aviso, pirataria, mercados com regras
// próprias e cenas históricas com arco. Os módulos ficam em ./world4/.

import { registerSimHook } from '../ext4';
import { emitEvent } from '../events';
import './world4/state';
import { milestonesMonth } from './world4/milestones';
import { chartsWeekW4, chartsYear, payolaMonth } from './world4/charts';
import { fairsMonth, fanClubsMonth } from './world4/fairs';
import { lawsAndIndustryMonth } from './world4/laws';
import { scenesAndMarketsMonth } from './world4/scenes';

registerSimHook('week', 'world4', (s, r) => {
  chartsWeekW4(s, r);
});

registerSimHook('month', 'world4', (s, r) => {
  milestonesMonth(s, r);
  payolaMonth(s, r);
  fairsMonth(s, r);
  fanClubsMonth(s);
  lawsAndIndustryMonth(s, r, (id) => emitEvent(s, r, id, {}));
  scenesAndMarketsMonth(s, r);
});

registerSimHook('year', 'world4', (s) => {
  chartsYear(s);
});
