// Interface da rodada 8: identidade e público na página do ato (fase da carreira, preferências,
// memória da relação, público por segmento e tendência, histórias), estratégia reconhecível na
// ficha do selo rival e histórias em andamento na mesa.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { readAudience, audience } from '../../sim/sys/audience8';
import { PHASES, bondBalance, bondText, careerPhase, identity, prefsLines, prefsOf, reactionText } from '../../sim/sys/identity8';
import { PLAYBOOKS, moveText, playbookOf, rivals8, sceneName } from '../../sim/sys/rivals8';
import { STEP_TXT, fundCost, fundExperimental, stories, storyTitle, type Story } from '../../sim/sys/stories8';
import { techById } from '../../data/rules';
import type { Act, GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { registerPageTab, registerSection } from '../registry';
import { chips, stat } from '../vis';

const ago = (s: GameState, w: number): string => {
  const m = Math.max(0, Math.round((s.week - w) / 4.35));
  return m < 1 ? t(l('agora', 'now')) : m < 24 ? `${m} ${t(l('meses', 'mo'))}` : `${Math.round(m / 12)} ${t(l('anos', 'yrs'))}`;
};

const arrow = (v: number | undefined): HTMLElement | null => {
  if (v === undefined || !Number.isFinite(v)) return null;
  const cls = v > 0.03 ? 'good' : v < -0.03 ? 'bad' : '';
  const sym = v > 0.03 ? '↑' : v < -0.03 ? '↓' : '→';
  return h('span', { class: `pill ${cls}`, title: t(l('Variação em 3 meses', '3-month change')) }, `${sym} ${Math.round(v * 100)}%`);
};

function axis(label: L, left: L, right: L, v: number): HTMLElement {
  return h('li', null, h('span', null, t(label)), h('small', { class: 'muted' }, t(left)), bar(v), h('small', { class: 'muted' }, t(right)));
}

function storySteps(st: Story): HTMLElement {
  return h('ol', { class: 'small story-steps' }, st.ch.map((k) => h('li', null, t(STEP_TXT[k] ?? l(k, k)))));
}

function storyCard(s: GameState, st: Story): HTMLElement {
  const canFund = st.k === 'pact' && !st.done && st.st >= 1 && !st.ch.includes('funded');
  return h('article', { class: 'tile story8' },
    h('div', { class: 'tile-body' },
      h('b', null, t(storyTitle(s, st)), ' ', st.done ? pill(t(l('encerrada', 'closed'))) : pill(t(l('em andamento', 'ongoing')), 'good')),
      h('div', { class: 'muted small' }, actLink(s, st.act), ` · ${t(l('começou há', 'started'))} ${ago(s, st.w0)}`),
      storySteps(st),
      canFund ? h('button', { class: 'btn small primary', onclick: () => { const e = fundExperimental(s, st.id); toast(t(e ?? l('Projeto experimental financiado. Eles vão lembrar.', 'Experimental project funded. They will remember.')), e ? 'bad' : 'good'); rerender(); } },
        t(l('Financiar o projeto experimental', 'Fund the experimental project')), ` (${$(fundCost(s, st))})`) : null,
    ));
}

// ---------------------------------------------------------------- página do ato

function identityTab(s: GameState, actId: string): HTMLElement {
  const a = s.acts[actId] as Act;
  const mine = a.owner === 'player' || !!a.playerBand;
  const deg = mine ? 5 : s.knowledge[a.id]?.degree ?? 0;
  const ph = careerPhase(s, a);
  const m = identity(s).acts[a.id];
  const pr = prefsOf(s, a);
  const au = readAudience(s, a);
  const rel = m?.re ? s.releases[m.re.rel] : undefined;
  const mig = audience(s).mig.filter((x) => x.f === a.id || x.t === a.id);
  const sts = stories(s).list.filter((x) => x.act === a.id).slice(-3).reverse();

  const phaseBox = h('div', null,
    h('h4', null, t(l('Fase da carreira', 'Career phase'))),
    h('p', null, pill(t(PHASES[ph].name), PHASES[ph].tone), ' ', h('span', { class: 'muted small' }, t(PHASES[ph].desc))),
    m?.eras.length ? h('p', { class: 'small' }, m.eras.map((e, i) => h('span', null, i ? ' → ' : '', `${e.y} `, h('b', null, t(PHASES[e.ph].name))))) : null,
  );

  const prefsBox = deg >= 3 || mine ? h('div', null,
    h('h4', null, t(l('Preferências artísticas', 'Artistic preferences'))),
    h('ul', { class: 'attr-list' },
      axis(l('Arte × vendas', 'Art × sales'), l('vendas', 'sales'), l('arte', 'art'), pr.art),
      axis(l('Liberdade criativa', 'Creative freedom'), l('pouca', 'little'), l('muita', 'a lot'), pr.freedom),
      axis(l('Lealdade', 'Loyalty'), l('baixa', 'low'), l('alta', 'high'), pr.loyalty),
      axis(l('Inquietação', 'Restlessness'), l('fiel ao som', 'steady'), l('quer mudar', 'wants change'), pr.restless)),
    h('p', null, prefsLines(pr).map((x) => pill(t(x)))),
  ) : h('p', { class: 'muted small' }, t(l('Conheça melhor o ato (olheiro) para ler as preferências.', 'Scout the act further to read their preferences.')));

  const memBox = m && (mine || m.log.length) ? h('div', null,
    h('h4', null, t(l('Memória da relação com o selo', 'Memory of the label relationship'))),
    chips(stat('handshake', Math.round(m.sup * 10) / 10, l('Apoio lembrado', 'Remembered support')), stat('heart', Math.round(m.kept * 10) / 10, l('Promessas cumpridas', 'Promises kept')),
      stat('warning', Math.round(m.broke * 10) / 10, l('Promessas quebradas', 'Promises broken')), stat('clock', Math.round(m.ab * 10) / 10, l('Abandono e culpa', 'Abandonment and blame')), stat('star', Math.round(m.fav * 10) / 10, l('Favoritismo sentido', 'Felt favoritism'))),
    h('p', null, t(l('Saldo: ', 'Balance: ')), pill(bondBalance(m) > 0.5 ? t(l('boas lembranças', 'fond memories')) : bondBalance(m) < -0.5 ? t(l('mágoa', 'grudge')) : t(l('neutro', 'neutral')), bondBalance(m) > 0.5 ? 'good' : bondBalance(m) < -0.5 ? 'bad' : '')),
    m.log.length ? h('ul', { class: 'small' }, m.log.slice().reverse().map((x) => h('li', null, h('span', { class: 'muted' }, `${ago(s, x.w)} · `), t(bondText(x.k)), x.t ? ` (${x.t})` : ''))) : null,
    m.re && rel ? h('p', { class: 'small' }, h('b', null, t(l('Última reação: ', 'Last reaction: '))), t(fmtL(reactionText(m.re.k) ?? l('', ''), { a: a.name, t: rel.title }))) : null,
  ) : null;

  const audBox = deg >= 2 || mine ? h('div', null,
    h('h4', null, t(l('Público', 'Audience'))),
    h('p', null, pill(t(au.profile), au.viral ? 'warn' : au.bond >= 70 ? 'good' : ''), au.viral ? pill(t(l('viral', 'viral')), 'warn') : null),
    h('table', { class: 'tbl compact' },
      h('tbody', null,
        h('tr', null, h('td', null, t(l('Ouvintes casuais', 'Casual listeners'))), h('td', null, N(au.casual)), h('td', null, arrow(au.trend?.casual))),
        h('tr', null, h('td', null, t(l('Fãs ativos', 'Active fans'))), h('td', null, N(au.active)), h('td', null, arrow(au.trend?.active))),
        h('tr', null, h('td', null, t(l('Núcleo fiel', 'Core fans'))), h('td', null, N(au.core)), h('td', null, arrow(au.trend?.core))),
        h('tr', null, h('td', null, t(l('Colecionadores (do núcleo)', 'Collectors (within core)'))), h('td', null, N(au.collectors)), h('td', null, '')))),
    h('ul', { class: 'attr-list' },
      h('li', null, h('span', null, t(l('Vínculo', 'Bond'))), bar(au.bond, 100, au.bond >= 60 ? 'good' : au.bond < 30 ? 'warn' : ''), h('b', null, au.bond)),
      mine ? h('li', null, h('span', null, t(l('Saturação de lançamentos', 'Release saturation'))), bar(au.saturation, 6, au.saturation > 2.5 ? 'bad' : ''), h('b', null, au.saturation.toFixed(1))) : null),
    h('p', { class: 'muted small' }, t(l('Vínculo alto lota casas e vende edições especiais mesmo sem parada; viral enche a parada, mas pouca gente compra ingresso. Lançar demais cansa os fãs ativos.', 'A strong bond fills venues and sells special editions even off the charts; viral fills the charts but few buy tickets. Releasing too much tires active fans.'))),
    mig.length ? h('ul', { class: 'small' }, mig.slice(0, 4).map((x) => h('li', null, x.t === a.id
      ? h('span', null, `+${N(x.n)} `, t(l('fãs migraram de', 'fans migrated from')), ' ', actLink(s, x.f))
      : h('span', null, `−${N(x.n)} `, t(l('fãs migraram para', 'fans migrated to')), ' ', actLink(s, x.t))))) : null,
  ) : null;

  const storyBox = sts.length ? h('div', null, h('h4', null, t(l('Histórias', 'Stories'))), h('div', { class: 'cards' }, sts.map((x) => storyCard(s, x)))) : null;

  return h('div', { class: 'identity8' }, h('div', { class: 'grid2' }, h('div', null, phaseBox, prefsBox), h('div', null, audBox, memBox)), storyBox);
}

registerPageTab('act', {
  id: 'identity8', label: l('Identidade e público', 'Identity and audience'), icon: 'bulb', order: 10,
  when: (s, id) => !!s.acts[id] && (s.acts[id].owner === 'player' || !!s.acts[id].playerBand || (s.knowledge[id]?.degree ?? 0) >= 2 || s.acts[id].fame > 20),
  render: identityTab,
});

// ---------------------------------------------------------------- ficha do selo

function labelPlaybook(s: GameState, id: string): HTMLElement | null {
  const lb = s.labels[id];
  if (!lb) return null;
  const pb = PLAYBOOKS[playbookOf(lb)];
  const st = rivals8(s);
  const moves = (st.log[id] ?? []).slice().reverse();
  const eyes = Object.entries(st.interest).filter(([, v]) => v.lb === id).map(([actId]) => actId).filter((x) => s.acts[x]);
  const bet = st.tech[id];
  return h('div', { class: 'playbook8' },
    h('h4', null, t(l('Estratégia reconhecível', 'Recognizable strategy'))),
    h('p', null, pill(t(pb.name), 'gold'), ' ', h('span', { class: 'muted small' }, t(pb.desc))),
    h('p', { class: 'small' }, h('b', null, t(l('Como reconhecer: ', 'How to spot it: '))), pb.tells.map((x, i) => h('span', null, i ? ' · ' : '', t(x)))),
    st.scene[id] ? h('p', { class: 'small' }, t(l('Cena dominada: ', 'Dominated scene: ')), pill(sceneName(st.scene[id]))) : null,
    bet ? h('p', { class: 'small' }, t(l('Aposta tecnológica: ', 'Tech bet: ')), pill(t(techById[bet.id]?.name ?? l(bet.id, bet.id)), 'neural'), ` ${t(l('até', 'until'))} ${bet.until}`) : null,
    eyes.length ? h('p', { class: 'small' }, t(l('De olho em: ', 'Eyeing: ')), eyes.map((x) => actLink(s, x))) : null,
    h('h4', null, t(l('Jogadas recentes', 'Recent moves'))),
    moves.length ? h('ul', { class: 'small' }, moves.map((m) => h('li', null, h('span', { class: 'muted' }, `${ago(s, m.w)} · `), t(moveText(m))))) : h('p', { class: 'muted small' }, t(l('Nenhuma jogada observada ainda.', 'No moves observed yet.'))),
  );
}

registerPageTab('label', { id: 'playbook8', label: l('Estratégia', 'Strategy'), icon: 'building', render: labelPlaybook });

// ---------------------------------------------------------------- mesa: histórias em andamento

registerSection('desk', {
  id: 'stories8', order: 5,
  render: (s) => {
    const list = stories(s).list.filter((x) => !x.done || s.week - x.w0 < 104).slice().reverse().slice(0, 6);
    if (!list.length) return null;
    return section(t(l('Histórias em andamento', 'Ongoing stories')), h('p', { class: 'muted small' }, t(l('Nascem das suas decisões e das relações acumuladas; voltam anos depois.', 'They grow out of your decisions and accumulated relationships; they come back years later.'))), h('div', { class: 'cards' }, list.map((x) => storyCard(s, x))));
  },
});
