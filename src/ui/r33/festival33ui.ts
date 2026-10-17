// R33 · POL33-A item 2 — o festival ao ar livre na página de shows: o campo (festival33px) com o clima do mês, a descrição da
// época e as ações do lugar (INT-2, atrás de `exp33.int2`) no cartão de ações. Não mexe em regra: só mostra e chama o que existe.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { ownFests } from '../../sim/sys/feststore';
import { int2Acts, int2Do, int2On, int2What } from '../../sim/r33/int2';
import type { GameState } from '../../sim/types';
import { rerender, toast } from '../common';
import { h } from '../dom';
import { registerSection } from '../registry';
import { lockBtn31 } from '../r31/lock31';
import { merchOn } from '../../sim/r33/merch33';
import { openMerch33 } from './merch33ui';
import { clima33, drawFestival33, estacao33, type Clima33 } from './festival33px';

const CLIMA: Record<Clima33, ReturnType<typeof l>> = {
  sol: l('céu aberto', 'clear sky'), nublado: l('nublado', 'overcast'), chuva: l('chuva', 'rain'), noite: l('show à noite', 'night show'),
};
const SEASON = { inverno: l('inverno', 'winter'), primavera: l('primavera', 'spring'), verao: l('verão', 'summer'), outono: l('outono', 'autumn') };

/** O campo do festival (ano e mês do seu festival, ou o de hoje). */
export function festivalField33(s: GameState): HTMLElement {
  const own = ownFests(s)[0], month = own?.month ?? s.month;
  const cv = h('canvas', { class: 'px fest33-cv', role: 'img', 'aria-label': t(l('Festival ao ar livre', 'Open-air festival')) }) as HTMLCanvasElement;
  cv.style.cssText = 'width:100%;max-width:1080px;image-rendering:pixelated;display:block;border:2px solid #14142a';
  const { clima } = drawFestival33(cv, { year: s.year, month, seed: own?.id ?? s.config.seed, acts: own?.lineup.map((x) => x.actId) });
  const acts = int2On(s) ? int2Acts(s, 'festival') : [];
  return h('div', { class: 'fest33' }, cv,
    h('p', { class: 'small muted' }, t(int2What('festival', s.year)), ' · ', t(SEASON[estacao33(month)]), ' · ', t(CLIMA[clima])),
    merchOn(s) ? h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'btn small', onclick: (e: Event) => openMerch33((e.currentTarget as HTMLElement).getBoundingClientRect(), 'shop:festival') }, t(l('Barraca de merch', 'Merch stall')), ' ▸'), h('button', { type: 'button', class: 'btn small ghost', onclick: (e: Event) => openMerch33((e.currentTarget as HTMLElement).getBoundingClientRect()) }, t(l('Merch e colecionáveis', 'Merch and collectibles')), ' ▸')) : null,
    acts.length ? h('div', { class: 'row wrap' }, acts.map((a) => lockBtn31(t(a.label), a.dis ?? null, () => { const r = int2Do(s, a.id); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); }, { cls: 'btn small' }))) : null);
}

registerSection('shows', {
  id: 'fest33-open', order: 39,
  render: (s) => (!ownFests(s).length && !int2On(s) && !merchOn(s) ? null : h('section', { class: 'card wide' }, h('h3', null, t(l('Festival ao ar livre', 'Open-air festival'))), festivalField33(s))),
});
void clima33;
