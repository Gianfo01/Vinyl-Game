// Rodada 14: vida fora do trabalho na interface — bloco "Fora do trabalho" na ficha de vida pessoal
// (hobbies, ponto de encontro, forma, musa e linha do tempo) e a área "Noite e encontros", onde o
// jogador frequenta os mesmos lugares que artistas, executivos e equipe para conhecê-los.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { SPOT14, goCost14, goOut14, leisureOf14, lz14, regulars14, spotsHere14, who14, wentThisMonth, type Spot14 } from '../../sim/sys/leisure14';
import { energyLeft } from '../../sim/sys/life';
import type { GameState, Person } from '../../sim/types';
import { $, cityName, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { openPersonPage } from '../pages';
import { registerArea } from '../registry';
import { ic } from '../vis';
import { LIFE_EXTRAS13 } from './dossier13';

const KIND: Record<string, L> = { artist: l('artista', 'artist'), exec: l('executivo(a) rival', 'rival executive'), staff: l('sua equipe', 'your staff') };
const tone = (v: number) => (v > 0 ? 'good' : v < 0 ? 'bad' : '');

function timeline(s: GameState, key: string, n = 12): HTMLElement | null {
  const x = leisureOf14(s, key);
  if (!x) return null;
  const rc = x.rec;
  return h('div', { class: 'lz14' },
    h('ul', { class: 'dos13-list small' },
      h('li', null, ic('sparkle'), ` ${t(l('Fora do trabalho', 'Off the clock'))}: ${x.hobbies.map((y) => t(y)).join(', ')}`),
      h('li', null, ic('globe'), ` ${t(l('Costuma ir a', 'Hangs out at'))}: ${t(x.spot)}`, h('small', { class: 'muted' }, ` · ${t(SPOT14[rc.sp.split('|')[1] as Spot14]?.why ?? l(''))}`)),
      h('li', null, ic('heart'), ` ${t(l('Forma física', 'Fitness'))} ${rc.fit}/100 · ${t(l('humor', 'mood'))} ${rc.mood}/100`,
        x.muse ? h('span', null, ' · ', pill(`${t(l('musa', 'muse'))}: ${t(x.muse)}`, 'good')) : null),
      x.muse ? h('li', { class: 'muted' }, t(l('A musa entra no tema das próximas músicas (e, no seu elenco, deixa a letra mais vivida).', 'The muse shapes the theme of the next songs (and, on your roster, makes lyrics feel lived-in).'))) : null,
    ),
    rc.log.length
      ? h('details', { open: true }, h('summary', { class: 'small muted' }, t(l('Vida pessoal — linha do tempo', 'Personal life — timeline'))),
        h('ul', { class: 'memory small' }, rc.log.slice(0, n).map(([y, m, tx, tn]) => h('li', { class: tone(tn) }, h('span', { class: 'muted' }, `${y}/${String(m + 1).padStart(2, '0')} · `), t(tx)))))
      : h('p', { class: 'muted small' }, t(l('Nada marcante fora do trabalho ainda.', 'Nothing notable off the clock yet.'))),
  );
}

LIFE_EXTRAS13.push((s: GameState, p: Person) => timeline(s, `p:${p.id}`));

function spotCard(s: GameState, k: Spot14): HTMLElement {
  const regs = regulars14(s, k);
  const went = wentThisMonth(s, k);
  const name = SPOT14[k].name(s.year);
  return h('article', { class: 'tile' }, h('div', { class: 'tile-body' },
    h('b', null, t(name)), h('small', { class: 'muted' }, t(SPOT14[k].why)),
    regs.length
      ? h('ul', { class: 'dos13-list small' }, regs.slice(0, 8).map((key) => {
        const w = who14(s, key)!;
        const x = leisureOf14(s, key);
        const op = x?.opinion ?? 0;
        return h('li', null,
          w.p ? h('button', { class: 'link', onclick: () => openPersonPage(w.p!.id) }, w.name) : h('b', null, w.name),
          h('span', { class: 'muted' }, ` · ${t(KIND[w.kind])}${w.act ? ` (${w.act.name})` : ''}`),
          ' ', pill(`${op > 0 ? '+' : ''}${op}`, tone(op)),
          !w.p ? h('details', null, h('summary', { class: 'small muted' }, t(l('vida pessoal', 'personal life'))), timeline(s, key, 6)) : null);
      }), regs.length > 8 ? h('li', { class: 'muted' }, `+${regs.length - 8}`) : null)
      : h('p', { class: 'muted small' }, t(l('Nenhum frequentador conhecido por enquanto.', 'No known regulars for now.'))),
    h('button', {
      class: 'btn small', disabled: went || energyLeft(s) < 1,
      title: t(l('Gasta 1 de tempo livre e dinheiro pessoal; conhece até 2 frequentadores. A opinião deles sobe ou cai conforme afinidade (gostos, fé, política, humor, ego).', 'Uses 1 free time and personal money; meet up to 2 regulars. Their opinion rises or falls with affinity (tastes, faith, politics, humour, ego).')),
      onclick: () => { const res = goOut14(s, k); toast(t(res.text), res.ok ? 'good' : 'info'); rerender(); },
    }, went ? t(l('Já foi este mês', 'Been there this month')) : `${t(l('Ir', 'Go'))} (${$(goCost14(s, k))}) ⏱`),
  ));
}

function nightArea(s: GameState): HTMLElement {
  const st = lz14(s);
  return h('div', { class: 'hub' },
    section(`${t(l('Noite e encontros', 'Going out'))} · ${cityName(s.config.homeCity)}`,
      h('p', { class: 'muted small' }, t(l('O que as pessoas fazem fora do trabalho muda suas vidas: hobbies mexem em moral, inspiração, estresse e saúde; nos mesmos lugares nascem amizades, romances, rixas e parcerias. Frequente os pontos para conhecer quem importa — a afinidade decide se a opinião sobe ou cai.', 'What people do off the clock changes their lives: hobbies move morale, inspiration, stress and health; the same places breed friendships, romances, feuds and collaborations. Go out to meet who matters — affinity decides whether their opinion of you rises or falls.'))),
      h('p', { class: 'small' }, `${t(l('Tempo livre este mês', 'Free time this month'))}: ${energyLeft(s)}`),
      h('div', { class: 'cards' }, spotsHere14(s).map((k) => spotCard(s, k)))),
    st.pl.log.length ? section(t(l('Suas saídas', 'Your nights out')), h('ul', { class: 'memory small' }, st.pl.log.map(([y, m, tx]) => h('li', null, h('span', { class: 'muted' }, `${y}/${String(m + 1).padStart(2, '0')} · `), t(tx))))) : null,
    section(t(l('Fofocas da vida pessoal', 'Personal-life gossip')),
      st.news.length ? h('ul', { class: 'memory small' }, st.news.slice(0, 15).map(([y, m, tx]) => h('li', null, h('span', { class: 'muted' }, `${y}/${String(m + 1).padStart(2, '0')} · `), t(tx))))
        : h('p', { class: 'muted small' }, t(l('Nada ainda — a imprensa só fala de quem é famoso (ou do seu elenco).', 'Nothing yet — the press only covers the famous (or your roster).')))),
  );
}

registerArea({ id: 'night14', label: l('Noite e encontros', 'Going out'), icon: 'sparkle', key: '', render: (s) => nightArea(s) });
