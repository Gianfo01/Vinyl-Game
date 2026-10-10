// Rodada 18 (core18) — instalação da interface da onda 0 (último import de ui/sys/index.ts, para substituir a
// caixa de entrada antiga e entrar depois dos ganchos existentes): tooltips encadeados (delegação global),
// Caixa de entrada 2.0, menu de ações por pessoa, painel Dinâmica e leitura rápida no resumo do artista.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { hypeOf } from '../../sim/sys/hype12';
import { worldFame16, myA3, fameIn } from '../../sim/sys/fame16';
import { countryName } from '../../data/geo';
import { h } from '../dom';
import '../explain18';
import { ACT_OVERVIEW_EXTRAS } from '../pages';
import { installDyn18 } from './dyn18';
import { installInbox18 } from './inbox18';
import { installPersonActions18 } from './personact18';
import { stat, chips } from '../vis';
import { canSee } from '../../sim/sys/fame15';
import { localDraw } from '../../sim/sys/tour12';
import './core18.css';

installInbox18();
installPersonActions18();
installDyn18();

// resumo do artista: hype, fama no mundo e no seu país — cada número com o "por quê" encadeado
ACT_OVERVIEW_EXTRAS.push((s, a, deg, mine) => {
  if (!mine && !canSee(s, a.id, 'fame')) return null;
  const hv = hypeOf(s, `a:${a.id}`).v;
  const me = myA3(s);
  const w = (key: string, ctx: Record<string, unknown>, el: HTMLElement) => { el.classList.add('why18'); el.dataset.why = key; el.dataset.whyCtx = JSON.stringify(ctx); el.tabIndex = 0; return el; };
  return h('div', { class: 'small' },
    chips(
      w('act.hype', { act: a.id }, stat('fire', Math.round(hv), l('Hype agora', 'Hype now'))),
      w('act.fame', { act: a.id }, stat('globe', Math.round(worldFame16(s, a)), l('Fama no mundo', 'World fame'))),
      me ? w('fame.region', { act: a.id, a3: me }, stat('house', Math.round(fameIn(s, a, me)), l('Fama no seu país', 'Fame in your country'))) : null,
      mine ? w('show.demand', { act: a.id, city: a.city }, stat('mic', Math.round(localDraw(s, a, a.city)), l('Público na cidade natal', 'Hometown draw'))) : null,
    ),
    h('p', { class: 'muted small' }, t(l('Passe o mouse (ou toque) nos números sublinhados para ver de onde vêm; itens com › abrem o próximo nível.', 'Hover (or tap) underlined numbers to see where they come from; items with › open the next level.')), me ? ` (${t(countryName(me))})` : ''),
  );
});
