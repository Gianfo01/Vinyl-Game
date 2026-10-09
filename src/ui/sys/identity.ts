// Área "Identidade" (rodada 8): o perfil estratégico do selo (o que constrói, progresso, efeitos e
// oportunidades exclusivas) e a liderança do dono (trajetória profissional e estilo consolidado).
// Fica separada da área Você de propósito: aqui é reputação profissional, não vida pessoal.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  LEADS, PROFILES, PROFILE_ACTIONS, PROFILE_FULL, PROFILE_MIN, PROFILE_MONTHS, LEAD_FULL, LEAD_MONTHS,
  actionBlock, ident, leadById, leadK, leadProgress, originById, originOf, profileById, profileK, profileProgress, runProfileAction,
  type ProfileId,
} from '../../sim/sys/identity';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { registerArea, registerSection } from '../registry';
import { store } from '../store';
import { ic, tabs } from '../vis';

const say = (e: L | null) => { if (e) toast(t(e), 'bad'); rerender(); };
const list = (items: L[], cls = '') => h('ul', { class: `small ${cls}` }, items.map((x) => h('li', null, t(x))));

function effectsGrid(p: ProfileId): HTMLElement {
  const d = profileById[p];
  return h('div', { class: 'card-grid' },
    h('div', null, h('b', null, ic('star'), ' ', t(l('Oportunidades', 'Opportunities'))), list(d.opps, 'good')),
    h('div', null, h('b', null, ic('money'), ' ', t(l('Custos e riscos', 'Costs and risks'))), list(d.costs, 'bad')),
    h('div', null, h('b', null, ic('fans'), ' ', t(l('Reações', 'Reactions'))), list(d.reactions)),
  );
}

function identityTab(s: GameState): HTMLElement {
  const st = ident(s);
  const prog = profileProgress(s);
  const cur = st.cur ? profileById[st.cur] : null;
  const lean = st.lean ? profileById[st.lean] : null;
  const k = st.cur ? profileK(s, st.cur) : 0;
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Perfil do selo', 'Label profile')),
        cur
          ? h('div', null,
            h('h4', null, t(cur.name), ' ', pill(`${t(l('força', 'strength'))} ${Math.round(k * 100)}%`, 'good'), ' ', h('small', { class: 'muted' }, t(l('desde {y}', 'since {y}'), { y: st.since }))),
            h('p', { class: 'muted small' }, t(cur.desc)),
            effectsGrid(cur.id))
          : h('p', { class: 'muted' }, t(l('O selo ainda não tem identidade. Ela nasce das decisões que você repete: uma tendência mantida por {m} meses vira perfil.', 'The label has no identity yet. It is born from the decisions you repeat: a trend held for {m} months becomes a profile.'), { m: PROFILE_MONTHS })),
        lean && lean.id !== st.cur
          ? h('p', { class: 'small' }, ic('chart-up'), ' ', t(l('Tendência: {p} há {n} mês(es)', 'Trend: {p} for {n} month(s)'), { p: lean.name, n: st.leanMonths }), ' ',
            bar(Math.min(st.leanMonths, PROFILE_MONTHS + 2), cur ? PROFILE_MONTHS + 2 : PROFILE_MONTHS))
          : null,
      ),
      section(t(l('Como cada perfil se constrói', 'How each profile is built')),
        h('p', { class: 'muted small' }, t(l('Os pontos decaem um pouco a cada mês: identidade é o que você faz agora. {n} pontos consolidam um perfil; trocar de perfil exige superar o atual em 25%.', 'Points decay a bit each month: identity is what you do now. {n} points consolidate a profile; switching requires beating the current one by 25%.'), { n: PROFILE_MIN })),
        h('table', { class: 'tbl compact' },
          h('tbody', null, prog.map((x) => {
            const d = profileById[x.id];
            return h('tr', { class: st.cur === x.id ? 'on' : '' },
              h('td', null, h('b', null, t(d.name)), h('div', { class: 'muted small' }, t(d.builds))),
              h('td', { style: 'min-width:120px' }, bar(x.acc, PROFILE_FULL, st.cur === x.id ? 'good' : ''), h('small', { class: 'muted' }, ` ${Math.round(x.acc)}`)));
          }))),
      ),
      cur ? null : section(t(l('O que cada perfil muda', 'What each profile changes')),
        ...PROFILES.map((p) => h('details', null, h('summary', null, t(p.name)), effectsGrid(p.id)))),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('Oportunidades do perfil', 'Profile opportunities')),
        h('p', { class: 'muted small' }, t(l('Cada perfil abre uma ação que os outros não têm.', 'Each profile unlocks an action the others lack.'))),
        ...PROFILE_ACTIONS.map((a) => {
          const block = actionBlock(s, a.id);
          const mine = st.cur === a.profile;
          return h('div', { class: `idt-action ${mine ? '' : 'muted'}`, style: 'margin-bottom:0.6rem' },
            h('b', null, t(a.name)), ' ', h('small', { class: 'muted' }, `(${t(profileById[a.profile].name)})`),
            h('div', { class: 'small' }, t(a.desc)),
            h('button', { class: `btn small ${mine ? 'primary' : 'ghost'}`, disabled: !!block, title: block ? t(block) : '', onclick: () => say(runProfileAction(s, rngOf(s), a.id)) },
              a.cost ? `${t(l('Fazer', 'Do it'))} (${$(money(s, a.cost))})` : t(l('Fazer', 'Do it'))),
            block && mine ? h('div', { class: 'muted small' }, t(block)) : null);
        }),
      ),
      st.hist.length ? section(t(l('História da identidade', 'Identity history')), h('ul', { class: 'small' }, st.hist.map((x) => h('li', null, h('span', { class: 'muted' }, `${x.year} · `), t(x.text))))) : null,
    ),
  );
}

function leadershipTab(s: GameState): HTMLElement {
  const st = ident(s);
  const o = originById[originOf(s)];
  const lp = leadProgress(s);
  const cur = st.lead ? leadById[st.lead] : null;
  const def = originById[o.id];
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(`${t(l('Trajetória', 'Background'))}: ${t(o.name)}`,
        h('p', { class: 'muted small' }, t(o.desc)),
        h('p', { class: 'small' }, h('b', null, t(l('Contatos: ', 'Contacts: '))), t(o.contacts)),
        h('p', { class: 'small good' }, h('b', null, t(l('Vantagem: ', 'Advantage: '))), t(o.advantages)),
        h('p', { class: 'small bad' }, h('b', null, t(l('Preço: ', 'Price: '))), t(o.drawbacks)),
        def.debt && st.debtLeft > 0 ? h('p', { class: 'small' }, ic('bank'), ' ', t(l('Dívida: faltam {n} parcelas de ~{v}.', 'Debt: {n} instalments of ~{v} left.'), { n: st.debtLeft, v: $(money(s, def.debt.real)) })) : null,
        st.burned.length ? h('p', { class: 'small' }, t(l('Artistas que guardam mágoa da sua crítica: ', 'Artists still hurt by your reviews: ')), st.burned.map((id) => s.acts[id]?.name).filter(Boolean).join(', ')) : null,
        st.exEmployer && s.labels[st.exEmployer] ? h('p', { class: 'small' }, t(l('Antigo empregador (rival): ', 'Former employer (rival): ')), s.labels[st.exEmployer].name) : null,
      ),
      section(t(l('Estilo de liderança', 'Leadership style')),
        cur
          ? h('div', null,
            h('h4', null, t(cur.name), ' ', pill(`${t(l('força', 'strength'))} ${Math.round(leadK(s, cur.id) * 100)}%`, 'good')),
            h('p', { class: 'muted small' }, t(cur.desc)),
            h('div', { class: 'card-grid' },
              h('div', null, h('b', null, t(l('Confiança', 'Trust'))), h('p', { class: 'small' }, t(cur.trust))),
              h('div', null, h('b', null, t(l('Negociação', 'Negotiation'))), h('p', { class: 'small' }, t(cur.negotiation))),
              h('div', null, h('b', null, t(l('Retenção', 'Retention'))), h('p', { class: 'small' }, t(cur.retention))),
              h('div', null, h('b', null, t(l('Seu estresse', 'Your stress'))), h('p', { class: 'small' }, t(cur.stress)))))
          : h('p', { class: 'muted' }, t(l('Ainda sem estilo definido. A indústria observa seus contratos, crises e o quanto você delega; um padrão mantido por {m} meses vira reputação.', 'No style yet. The industry watches your deals, crises and how much you delegate; a pattern held for {m} months becomes your reputation.'), { m: LEAD_MONTHS })),
        h('table', { class: 'tbl compact' }, h('tbody', null, lp.map((x) => {
          const d = leadById[x.id];
          return h('tr', null,
            h('td', null, h('b', null, t(d.name)), h('div', { class: 'muted small' }, t(d.builds))),
            h('td', { style: 'min-width:120px' }, bar(x.acc, LEAD_FULL, st.lead === x.id ? 'good' : ''), h('small', { class: 'muted' }, ` ${Math.round(x.acc)}`)));
        }))),
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('O que pesou', 'What counted')),
        st.llog.length ? h('ul', { class: 'small' }, st.llog.map((x) => h('li', null, t(x.text)))) : h('p', { class: 'muted small' }, t(l('Nada ainda.', 'Nothing yet.')))),
      section(t(l('Todos os estilos', 'All styles')), ...LEADS.map((d) => h('details', null, h('summary', null, t(d.name)),
        h('p', { class: 'small' }, t(d.trust), ' ', t(d.negotiation), ' ', t(d.retention), ' ', t(d.stress))))),
    ),
  );
}

function identityArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub identity' }, tabs('identity', [
    { id: 'label', label: t(l('Identidade do selo', 'Label identity')), icon: 'flag', render: () => identityTab(s) },
    { id: 'lead', label: t(l('Liderança', 'Leadership')), icon: 'star', render: () => leadershipTab(s) },
  ], rerender));
}

registerArea({ id: 'identity', label: l('Identidade', 'Identity'), icon: 'flag', key: 'l', render: identityArea });

// resumo na área Empresa
registerSection('company', {
  id: 'identity', order: 5, render: (s) => {
    const st = ident(s);
    return section(t(l('Identidade do selo', 'Label identity')),
      h('p', { class: 'small' },
        h('b', null, st.cur ? t(profileById[st.cur].name) : t(l('Sem perfil definido', 'No profile yet'))),
        st.lean && st.lean !== st.cur ? h('span', { class: 'muted' }, ` · ${t(l('tendência', 'trend'))}: ${t(profileById[st.lean].name)}`) : null,
        ' · ', t(l('Liderança', 'Leadership')), ': ', st.lead ? t(leadById[st.lead].name) : '—',
        ' · ', t(originById[originOf(s)].name)),
      h('button', { class: 'btn small', onclick: () => { store.area = 'identity'; rerender(); } }, t(l('Ver identidade e liderança', 'See identity and leadership'))));
  },
});
