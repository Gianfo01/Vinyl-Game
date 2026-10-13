// R29 (contratos+) — registro na ficha do ato: "Propor empresariamento" quando o ato tem selo rival (o botão "Fazer
// proposta" de sempre só aparece para quem está sem contrato). Abre a MESMA proposta (formulário/mesa r27) já no modelo
// Empresariamento — nenhum caminho de contrato novo. Arquivo separado para não criar ciclo pages ↔ ficha.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { offerEligible29 } from '../../sim/contracts';
import { mgmtOf29 } from '../../sim/terms29';
import { h } from '../dom';
import { openOffer } from '../ficha';
import { ACT_HEAD_EXTRAS } from '../pages';

ACT_HEAD_EXTRAS.push((s, a, close) => {
  if (!a.owner || a.owner === 'player' || a.playerBand || a.status === 'retired' || a.status === 'split' || mgmtOf29(s, a.id)) return null;
  const el = offerEligible29(s, a, 'management');
  return h('button', { class: 'btn small', 'data-c29': 'management', disabled: !el.ok, title: el.ok ? t(l('O ato continua no selo dele; você vira o empresário (comissão).', 'The act stays on its label; you become its manager (commission).')) : t(el.why ?? l('Indisponível.', 'Unavailable.')),
    onclick: () => { close(); openOffer(a.id, false, 'management'); } }, t(l('Propor empresariamento', 'Offer to manage')));
});
