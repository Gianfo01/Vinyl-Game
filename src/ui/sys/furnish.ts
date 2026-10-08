// Seção "Mobília e instrumentos" na Sede (rodada 7): comprar e vender itens que aparecem no desenho da
// sede e dão efeitos pequenos (instrumentos → músicas; conforto → moral e estresse; escritório → reputação).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { effectiveRooms } from '../../sim/sys/industry/hqedit';
import { FURNITURE, buyFurniture, furn, furnBlocker, furnEffects, sellFurniture } from '../../sim/sys/furnish';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerSection } from '../registry';

const GROUPS: { name: L; ids: string[] }[] = [
  { name: l('Instrumentos e som', 'Instruments and sound'), ids: ['drums', 'amp', 'keys', 'pa', 'mic'] },
  { name: l('Conforto', 'Comfort'), ids: ['sofa', 'armchair', 'coffee_table', 'tv', 'arcade', 'coffee', 'vending', 'plant', 'lamp'] },
  { name: l('Trabalho', 'Work'), ids: ['table', 'chair', 'shelf', 'desk', 'filing', 'water', 'meeting_table', 'bench'] },
];

function furnishSection(s: GameState): HTMLElement | null {
  const st = furn(s);
  if (st.legacy) return null;
  const rooms = effectiveRooms(s).map((r) => r.kind as string);
  const fx = furnEffects(s);
  const say = (e: L | null, ok: L) => { if (e) toast(t(e), 'bad'); else toast(t(ok), 'good'); rerender(); };
  return section(t(l('Mobília e instrumentos', 'Furniture and instruments')),
    h('p', { class: 'muted small' }, t(l('A sede começa quase vazia: o que você compra aparece no desenho acima e tem efeito no jogo. Efeitos atuais: composição +{c}, gravação +{r}, moral +{m}/mês, estresse −{x}/mês.', 'The HQ starts almost empty: what you buy shows up in the drawing above and has an in-game effect. Current effects: writing +{c}, recording +{r}, morale +{m}/mo, stress −{x}/mo.'), { c: fx.compose.toFixed(1), r: fx.record.toFixed(1), m: fx.morale.toFixed(1), x: fx.stress.toFixed(1) })),
    ...GROUPS.map((g) => h('div', null,
      h('h4', null, t(g.name)),
      h('div', { class: 'mg-depts' }, g.ids.map((id) => {
        const def = FURNITURE.find((x) => x.id === id);
        if (!def) return null;
        const have = st.items[id] ?? 0;
        const blk = furnBlocker(s, id, rooms);
        return h('div', { class: `mg-dept ${have ? 'on' : ''}` },
          h('b', null, t(def.name)), ' ', pill(`${have}/${def.max}`, have ? 'good' : ''),
          h('small', { class: 'muted' }, t(def.desc)),
          h('div', { class: 'row wrap' },
            have < def.max ? h('button', { class: 'btn small', disabled: !!blk, title: blk ? t(blk) : '', onclick: () => say(buyFurniture(s, id, rooms), l('Comprado! Já está na sede.', 'Bought! It is already at the HQ.')) }, `${t(l('Comprar', 'Buy'))} ${$(money(s, def.cost))}`) : null,
            have ? h('button', { class: 'btn small ghost', onclick: () => say(sellFurniture(s, id), l('Vendido.', 'Sold.')) }, t(l('Vender', 'Sell'))) : null,
          ),
          blk && have < def.max && blk.pt.startsWith('A sede') ? h('small', { class: 'muted' }, t(blk)) : null,
        );
      })),
    )),
  );
}

registerSection('hq', { id: 'furnish', order: 2, render: furnishSection });
