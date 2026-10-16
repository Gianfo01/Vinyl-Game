// R31 · onda 4 (I) — a FICHA mostra os dois lados de quem trabalha num lugar da cidade ("Vendedor(a) na loja de
// discos · toca em X"). Leitura pura do registro de empregos (sim/sys/gente31).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { jobOf31 } from '../../sim/sys/gente31';
import { fmtL } from '../../sim/util';
import { h } from '../dom';
import { PERSON_HEAD_EXTRAS } from '../pages';

PERSON_HEAD_EXTRAS.push((s, p) => {
  const j = jobOf31(s, p.id);
  if (!j) return null;
  return h('div', { class: 'small', 'data-job31': j.slot }, j.bico ? '♪ ' : '', t(j.line), ' ', h('small', { class: 'muted' }, t(fmtL(l('(desde {y})', '(since {y})'), { y: s.year - Math.floor((s.week - j.since) / 52) }))));
});
