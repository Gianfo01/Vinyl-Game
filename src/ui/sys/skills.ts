// Aba "Habilidades" da área Você (rodada 9): árvore por ramos com pré-requisitos, custo, efeitos e botão
// de compra; pontos livres, marcos que dão pontos e o estilo de vida derivado (com os 10 estilos).

import './skills.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { BRANCHES, LIFESTYLES, SKILL_MILESTONES, SKILL_TREE, YEARLY_SKILL_POINTS, branchPoints, buySkill, canBuySkill, lifestyleById, skillById, skills } from '../../sim/sys/persona';
import type { GameState } from '../../sim/types';
import { rerender, section, toast } from '../common';
import { h } from '../dom';
import { ic } from '../vis';
import { fxText } from './persona';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };

export function skillsTab(s: GameState): HTMLElement {
  const S0 = skills(s);
  const bp = branchPoints(S0.owned);
  const ls = S0.lifestyle ? lifestyleById[S0.lifestyle] : undefined;
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(`${t(l('Habilidades', 'Abilities'))} — ${t(l('{n} pontos livres', '{n} free points'), { n: S0.points })}`,
        h('p', { class: 'muted small' }, t(l('Ganhe {y} pontos por ano e +1 em cada marco da carreira. Cada habilidade pede as anteriores do ramo (setas). Custo: 1 nos níveis 1–2, 2 nos níveis 3–4, 3 no topo.', 'Earn {y} points a year and +1 at each career milestone. Each ability needs the earlier ones in its branch (arrows). Cost: 1 at tiers 1–2, 2 at tiers 3–4, 3 at the top.'), { y: YEARLY_SKILL_POINTS })),
        h('div', { class: 'sk-tree' }, BRANCHES.map((b) => h('div', { class: 'sk-branch' },
          h('b', null, ic(b.icon), ' ', t(b.name), h('small', { class: 'muted' }, ` · ${bp[b.id]} ${t(l('pts', 'pts'))}`)),
          h('small', { class: 'muted' }, t(b.desc)),
          ...SKILL_TREE.filter((x) => x.branch === b.id).map((d) => {
            const on = S0.owned.includes(d.id);
            const ok = canBuySkill(S0.owned, S0.points, d.id);
            const reqOk = d.req.every((x) => S0.owned.includes(x));
            return h('div', { class: `sk ${on ? 'on' : ''} ${!on && !reqOk ? 'locked' : ''}` },
              h('span', null, h('b', null, `${d.tier}. ${t(d.name)}`), h('small', { class: 'muted' }, ` (${d.cost})`)),
              h('small', null, fxText(d.values, d.attrs) || t(l('Saúde +0,5/mês', 'Health +0.5/month'))),
              d.req.length ? h('small', { class: 'muted' }, '← ', d.req.map((x) => t(skillById[x]?.name)).join(' + ')) : null,
              on ? h('small', { class: 'good' }, '✔ ', t(l('aprendida', 'learned')))
                : h('button', { class: 'btn small', disabled: !ok, onclick: () => say(buySkill(s, d.id), l('Habilidade aprendida.', 'Ability learned.')) }, t(l('Aprender', 'Learn'))));
          }))),
        ),
      ),
    ),
    h('aside', { class: 'col-side' },
      section(`${t(l('Estilo de vida', 'Lifestyle'))}: ${ls ? t(ls.name) : '—'}`,
        ls ? h('p', { class: 'small' }, t(ls.desc)) : h('p', { class: 'muted small' }, t(l('Invista pontos para definir um estilo.', 'Invest points to define a style.'))),
        h('p', { class: 'muted small' }, t(l('Derivado de onde seus pontos estão. Os 10 estilos:', 'Derived from where your points are. The 10 styles:'))),
        h('ul', { class: 'small' }, LIFESTYLES.map((x) => h('li', { class: x.id === S0.lifestyle ? 'good' : '' }, h('b', null, t(x.name)), ' — ', t(x.desc),
          h('small', { class: 'muted' }, ` [${Object.keys(x.w).map((k) => t(BRANCHES.find((b) => b.id === k)!.name)).join(' + ')}]`)))),
      ),
      section(t(l('Marcos', 'Milestones')),
        h('ul', { class: 'small' }, SKILL_MILESTONES.map((m) => h('li', { class: S0.milestones.includes(m.id) ? 'good' : 'muted' }, S0.milestones.includes(m.id) ? '✔ ' : '○ ', t(m.name)))),
        h('p', { class: 'muted small' }, t(l('Pontos ganhos no total: {n}', 'Points earned in total: {n}'), { n: S0.earned })),
      ),
    ),
  );
}
