// Interface do sistema "world4": abas em Mídia (jabá e rádio; paradas e metodologia) e Mercado
// (feiras), seções em Mundo (linha do tempo, cenas históricas, leis e sindicatos, pirataria,
// mercados com regras próprias), em Paradas (mais paradas) e em Artistas (fã-clubes oficiais),
// mais a cena da investigação de jabá.

import './world4.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { payolaEra } from '../../sim/sys/world4/charts';
import { FAIRS, fairOpen } from '../../sim/sys/world4/fairs';
import { strikeActive } from '../../sim/sys/world4/common';
import { w4 } from '../../sim/sys/world4/state';
import { $ } from '../common';
import { h } from '../dom';
import { registerCutscene, registerSection, registerTab } from '../registry';
import { ic } from '../vis';
import { marketsSection, scenesSection, timelineSection } from './world4/history';
import { fairsTab, fanClubsSection, lawsSection, methodTab, moreChartsSection, piracySection, radioTab } from './world4/industry';

registerTab('mediaHub', {
  id: 'w4radio', icon: 'radio', order: 60,
  label: l('Jabá e rádio', 'Payola and radio'),
  render: radioTab,
  badge: (s) => (w4(s).payola.heat > 60 && payolaEra(s) !== 'legal' ? 1 : undefined),
});
registerTab('mediaHub', { id: 'w4method', icon: 'chart-up', order: 61, label: l('Paradas e metodologia', 'Charts and methodology'), render: methodTab });
registerTab('marketHub', {
  id: 'w4fairs', icon: 'handshake', order: 60,
  label: l('Feiras', 'Fairs'),
  render: fairsTab,
  badge: (s) => FAIRS.filter((f) => fairOpen(s, f) && f.month === s.month && w4(s).fairs.booked[f.id] !== s.year).length || undefined,
});

registerSection('world', { id: 'w4timeline', order: 60, render: timelineSection });
registerSection('world', { id: 'w4scenes', order: 61, render: scenesSection });
registerSection('world', { id: 'w4laws', order: 62, render: lawsSection });
registerSection('world', { id: 'w4piracy', order: 63, render: piracySection });
registerSection('world', { id: 'w4markets', order: 64, render: marketsSection });
registerSection('charts', { id: 'w4more', order: 60, render: moreChartsSection });
registerSection('artists', { id: 'w4clubs', order: 60, render: fanClubsSection });
registerSection('desk', {
  id: 'w4strike', order: 40,
  render: (s) => {
    const st = strikeActive(s);
    if (!st || w4(s).union) return null;
    return h('div', { class: 'card w4-alert', role: 'status' }, ic('warning'), ' ', t(l('Greve de gravação em curso: sessões sem acordo sindical saem 30% piores. Discos de músicas antigas (do cofre) vendem mais.', 'Recording strike under way: sessions without a union deal come out 30% worse. Records of older songs (from the vault) sell more.')));
  },
});

registerCutscene('w4_probe', (_s, cs, close) => h('div', { class: 'w4-probe' },
  h('div', { class: 'w4-probe-art', 'aria-hidden': 'true' }, ic('gavel', 4), ic('radio', 4), ic('money', 4)),
  h('p', null, t(cs.data.text as L)),
  h('p', null, h('b', null, `${t(l('Multa', 'Fine'))}: ${$(Number(cs.data.fine ?? 0))}`)),
  h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue'))),
));
