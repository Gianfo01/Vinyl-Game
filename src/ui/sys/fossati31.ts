// R31 · onda 3 (Z) — Mundo › Família Fossati: a homenagem (ficção declarada). Os cinco da família com a idade fixa e o
// papel da época, o violino do Efro e as ações pequenas e opcionais (almoço, lasanha, promoção, imprensa ou escola de
// idiomas, Metalmac, voo, tênis). Abrir a aba não muda nada; só os botões agem.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { FAM_ORIGIN31 } from '../../data/fossati31';
import {
  ANTONELLA_SCHOOL31, FLIGHT_FROM31, SCHOOL_LANGS31, actLangs31, antonellaPress31, efroFlight31, fam31, famMet31, famNow31, famRoleLabel31, lasagna31,
  langSchool31, luciaLunch31, metalmac31, soniaPromo31, tennisClub31, violin31, type FamRes31,
} from '../../sim/sys/fossati31';
import { cityById } from '../../data/world';
import { sw } from '../../sim/r31/switches';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { pill, rerender, section } from '../common';
import { h } from '../dom';
import { registerTab } from '../registry';
import { btn, note } from './world4/util';
import { fosHomeView31, fosSquareView31, fosUi31, openFos31 } from '../r31/fos31';

let actSel = '';
let langSel = 'en';
let last: FamRes31 | null = null;

const run = (f: () => FamRes31) => () => { last = f(); rerender(); };

function member(s: GameState, n: ReturnType<typeof famNow31>[number]): HTMLElement {
  const met = famMet31(s).met.includes(n.m.id);
  return h('article', { class: 'card' },
    h('h4', null, n.m.name, ' ', n.m.homage ? pill(t(l('homenagem', 'tribute')), 'gold') : null, met ? pill(t(l('conhecido', 'met')), 'good') : null),
    h('p', { class: 'small muted' }, `${t(n.m.kin)} · ${n.age} ${t(l('anos', 'yrs'))} · ${t(l('de', 'from'))} ${FAM_ORIGIN31}, ${t(l('mora em', 'lives in'))} ${t(cityById[n.city]?.name ?? l(n.city, n.city))}`),
    h('p', { class: 'small' }, t(n.m.bio)),
    h('p', { class: 'small' }, h('b', null, t(l('Hoje', 'Now'))), ': ', t(famRoleLabel31(s, n.m.id))));
}

/** R31 · onda 4 (FOS): a aba é a ficha da família e a porta para o mundo — a casa é um prédio da sua cidade e a praça
 *  fica ao lado da sede ("Ir à casa" / "Ir à praça" abrem o mapa já lá dentro); a lista continua aqui com tudo. */
export function famTab31(s: GameState): HTMLElement {
  if (fosUi31.view === 'home') return fosHomeView31(s);
  if (fosUi31.view === 'square') return fosSquareView31(s);
  return h('div', null,
    h('div', { class: 'fos31-doors' },
      h('button', { type: 'button', class: 'btn small primary', onclick: () => openFos31('home') }, '🏠 ', t(l('Ir à casa (no mapa)', 'Go to the house (on the map)'))),
      h('button', { type: 'button', class: 'btn small primary', onclick: () => openFos31('square') }, '⛲ ', t(l('Ir à praça (no mapa)', 'Go to the square (on the map)'))),
      h('span', { class: 'small muted' }, t(l('A Casa Fossati é um prédio da sua cidade no "Nosso mundo"; a praça fica ao lado da sua sede. A lista abaixo continua com tudo.', 'The Fossati home is a building in your city in "Our world"; the square is next to your HQ. The list below still has everything.')))),
    famList31(s));
}

function famList31(s: GameState): HTMLElement {
  const acts = playerActs(s);
  if (!acts.includes(actSel)) actSel = acts[0] ?? '';
  const on = sw<boolean>(s, 'fam31');
  const v = violin31(s);
  const st = fam31(s);
  const pick = h('select', { 'aria-label': t(l('Artista', 'Artist')), onchange: (e: Event) => { actSel = (e.target as HTMLSelectElement).value; } },
    acts.map((id) => h('option', { value: id, selected: id === actSel ? true : undefined }, s.acts[id]?.name ?? '')));
  const langs = h('select', { 'aria-label': t(l('Língua', 'Language')), onchange: (e: Event) => { langSel = (e.target as HTMLSelectElement).value; } },
    SCHOOL_LANGS31.map((x) => h('option', { value: x.id, selected: x.id === langSel ? true : undefined }, t(x.name))));
  const learned = actSel ? actLangs31(s, actSel).map((id) => t(SCHOOL_LANGS31.find((x) => x.id === id)?.name ?? l(id, id))) : [];
  const A = (label: L, f: () => FamRes31, needAct = false) => btn(t(label), run(f), { disabled: !on || (needAct && !actSel) });
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Para Efro, Lucia, Antonella e Sonia. A família Fossati, de Cantù, está em toda partida, em qualquer época, com o nome real — uma homenagem, ficção declarada. Os efeitos são pequenos e nunca necessários para competir.',
      'For Efro, Lucia, Antonella and Sonia. The Fossati family, from Cantù, is in every game, in any era, under their real names — a tribute, declared fiction. The effects are small and never needed to compete.'))),
    h('div', { class: 'grid2' }, famNow31(s).map((n) => member(s, n))),
    section(t(l('O violino do Efro', 'Efro\'s violin')),
      v ? h('p', { class: 'small' }, t(v.n), ' ', pill(t(l('Mítica', 'Mythic')), 'gold'), ' ', t(v.st === 'stolen' ? l('— sumiu; sempre volta.', '— missing; it always comes back.') : l('— com o Efro. Nunca está à venda.', '— with Efro. Never for sale.')))
        : note(l('O violino aparece no primeiro mês.', 'The violin appears in the first month.'))),
    section(t(l('Com a família', 'With the family')),
      !on ? note(l('Efeitos da família desligados nesta partida (Opções › Interruptores).', 'Family effects are off in this game (Options › Switches).')) : null,
      acts.length ? h('div', { class: 'row' }, t(l('Artista:', 'Artist:')), ' ', pick) : note(l('Contrate um artista para as ações com artista.', 'Sign an artist for the artist actions.')),
      h('div', { class: 'row' },
        A(l('Almoço de domingo na Lucia', 'Sunday lunch at Lucia\'s'), () => luciaLunch31(s)),
        A(l('Lasanha da Lucia para o artista', 'Lucia\'s lasagna for the artist'), () => lasagna31(s, `p:${s.acts[actSel]?.members[0] ?? ''}`), true),
        A(l('Evento com a Sonia', 'Event with Sonia'), () => soniaPromo31(s, actSel), true),
        s.year < ANTONELLA_SCHOOL31 ? A(l('Entrevista e teatro com a Antonella', 'Interview and theatre with Antonella'), () => antonellaPress31(s, actSel), true) : null,
        s.year >= FLIGHT_FROM31 && st.flight === undefined ? A(l('Voo panorâmico com o Efro', 'Scenic flight with Efro'), () => efroFlight31(s, actSel), true) : null,
        A(l('Tênis com o Efro', 'Tennis with Efro'), () => tennisClub31(s)),
        A(l('Contrato com a Metalmac (1 ano)', 'Metalmac contract (1 year)'), () => metalmac31(s))),
      s.year >= ANTONELLA_SCHOOL31 ? h('div', { class: 'row' }, t(l('Escola de idiomas da Antonella:', 'Antonella\'s language school:')), ' ', langs, ' ',
        A(l('Matricular', 'Enrol'), () => langSchool31(s, actSel, langSel), true), learned.length ? h('span', { class: 'small muted' }, ` ${t(l('Já fala', 'Already speaks'))}: ${learned.join(', ')}`) : null) : null,
      last ? h('p', { class: `small ${last.ok ? 'good' : 'bad'}`, role: 'status' }, t(last.text)) : null,
      famMet31(s).famiglia ? h('p', { class: 'small' }, pill('Famiglia', 'gold'), ' ', t(l('Você conheceu os quatro.', 'You met all four.'))) : null),
  );
}

registerTab('worldHub', { id: 'fossati31', label: l('Família Fossati', 'Fossati family'), icon: 'heart', order: 58, render: famTab31 });
