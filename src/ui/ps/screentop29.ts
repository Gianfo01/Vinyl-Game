// Rodada 29 (REORG) — o "topo de tela" no estilo do Atlas (Parte IX) para as telas canônicas, logo abaixo do
// cabeçalho-herói de cada página. Um encaixe só (app.ts chama `screenTop29`); cada tela registra o seu bloco aqui.
// Regras: só LÊ o estado (modelos puros de screens29model); cada botão abre um destino EXISTENTE; nada é duplicado —
// S13 resume a Posição em três naturezas e leva à origem; S06 mostra o funil sobre as páginas que já existem;
// S16 junta capítulos e escolhas reais da campanha. Sem arte nova: ícones pixel existentes.

import { l, type L } from '../../data/world';
import { formatMoney } from '../../core/money';
import { locale, t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { openTarget29 } from './route29';
import { money29, resume29, trail29, type Money29 } from './screens29model';
import { show29 } from './state29model';
import { layout29, linkCards29, note29, pill29, secTitle29, steps29, triCards29 } from './shell29';
import type { Target29 } from './route29model';

type Top29 = (s: GameState, area: string) => HTMLElement | null;
const TOPS: Record<string, Top29> = {};
const reg = (areas: string[], f: Top29) => { for (const a of areas) TOPS[a] = f; };
const go = (x: Target29) => () => openTarget29(x);
const lang = (): 'pt' | 'en' => (locale().startsWith('en') ? 'en' : 'pt');

/** Bloco do topo da página (ou null). Se a página já traz o próprio cabeçalho (.ph27), entra logo depois dele. */
export function screenTop29(area: string, s: GameState, body: HTMLElement): HTMLElement | null {
  const f = TOPS[area];
  if (!f) return null;
  let el: HTMLElement | null = null;
  try { el = f(s, area); } catch { el = null; }
  if (!el) return null;
  el.classList.add('top29');
  const ph = body.querySelector(':scope > .ph27, :scope > * > .ph27');
  if (ph) { ph.after(el); return null; }
  return el;
}

// ---------------------------------------------------------------- S13 Finanças: realizado × comprometido × estimado

const money = (m: Money29 | undefined): string => (m ? show29(m.v, (n) => (m.v.unit ? `${n.toFixed(1)}` : formatMoney(n, locale())), lang()) : '—');
reg(['finance', 'business'], (s) => {
  const M = money29(s);
  const by = (id: string) => M.find((x) => x.id === id);
  const line = (id: string): [L, string] => [by(id)!.label, money(by(id))];
  return h('div', null,
    triCards29([
      { icon: 'money', hue: 'good', title: l('Realizado', 'Realized'), why: l('O que já aconteceu: dinheiro na conta e o último mês fechado.', 'What already happened: money in the bank and the last closed month.'),
        lines: [line('cash'), line('delta'), line('op')], go: go({ area: 'finance' }), goLabel: l('Ver origem', 'See source') },
      { icon: 'contract', hue: 'warn', title: l('Comprometido', 'Committed'), why: l('O que já está assumido e ainda vai sair do caixa.', 'What is already promised and will still leave the till.'),
        lines: [line('ap'), line('prom'), line('owed')], go: go({ area: 'contracts19' }), goLabel: l('Ver contratos', 'See contracts') },
      { icon: 'chart-up', hue: 'info', title: l('Estimado', 'Estimated'), why: l('Projeções: recebíveis agendados e fôlego no ritmo do último mês.', 'Projections: scheduled receivables and runway at last month\'s pace.'),
        lines: [line('ar'), [by('runway')!.label, show29(by('runway')!.v, (n) => `${Math.floor(n)} ${lang() === 'en' ? 'mo' : 'meses'}`, lang())]], go: go({ area: 'calendar19' }), goLabel: l('Ver prazos', 'See deadlines') },
    ]),
    h('p', { class: 'small muted' }, t(l('Cada cartão tem a própria base e período — não se somam. "Desconhecido" não é zero.', 'Each card has its own basis and period — they do not add up. "Unknown" is not zero.'))));
});

// ---------------------------------------------------------------- S06/S07: funil de talentos sobre as páginas que existem

const FUNNEL: { area: string; icon: string; title: L; sub: L }[] = [
  { area: 'directory', icon: 'fans', title: l('Descobrir', 'Discover'), sub: l('Todos os artistas do mundo', 'Every act in the world') },
  { area: 'market', icon: 'eye', title: l('Avaliar', 'Evaluate'), sub: l('Radar e relatório do olheiro', 'Radar and scout report') },
  { area: 'knownacts27', icon: 'rolodex', title: l('Acompanhar', 'Follow'), sub: l('O que você já sabe de cada um', 'What you know about each') },
  { area: 'contracts19', icon: 'quill', title: l('Negociar', 'Negotiate'), sub: l('Proposta, mesa e contrato', 'Offer, table and contract') },
];
reg(FUNNEL.map((x) => x.area), (_s, area) => steps29(t(l('Funil de talentos', 'Talent funnel')),
  FUNNEL.map((x, i) => ({ n: i + 1, icon: x.icon, title: x.title, sub: x.sub, on: x.area === area, go: go({ area: x.area }) }))));

// ---------------------------------------------------------------- S03 (Agenda e contratações): ponte para a revisão

reg(['agenda17'], () => linkCards29([
  { icon: 'datebook', title: l('Calendário e revisão do período', 'Calendar and period review'), sub: l('Todos os prazos e o que o próximo avanço afeta.', 'Every deadline and what the next advance affects.'), go: go({ area: 'calendar19' }) },
  { icon: 'calendar', title: l('Agenda de shows', 'Show calendar'), sub: l('Datas marcadas no palco.', 'Dates booked on stage.'), go: go({ area: 'cal17' }) },
]));

// ---------------------------------------------------------------- S16 Você: marcos e contexto

reg(['you'], (s) => {
  const T = trail29(s);
  const R = resume29(s);
  const marks = [
    ...T.chapters.slice(-3).reverse().map((c) => h('li', { class: 'mk29' }, h('b', null, `${c.decade}s`), ' ', pill29(c.open ? l('em curso', 'ongoing') : l('fechado', 'closed'), c.open ? 'accent' : 'muted'), h('p', { class: 'small' }, t(c.epitaph)))),
    ...R.choices.map((c) => h('li', { class: 'mk29' }, h('b', null, t(c.title)), ' ', h('small', { class: 'muted' }, t(c.when)), h('p', { class: 'small' }, '→ ', t(c.pick)))),
  ];
  return layout29([
    secTitle29(l('Sua história em marcos', 'Your story in milestones'), l('Capítulos e escolhas reais desta campanha.', 'Real chapters and choices of this campaign.')),
    T.rumo ? h('p', { class: 'small' }, t(l('Rumo a: ', 'Heading to: ')), h('b', null, t(T.rumo.name)), ` (${T.rumo.score}/100) · `, t(T.continuity)) : h('p', { class: 'small' }, t(T.continuity)),
    marks.length ? h('ol', { class: 'mk29-list' }, marks) : note29(l('Ainda sem marcos', 'No milestones yet'), l('Os capítulos aparecem conforme a campanha avança; nada é inventado.', 'Chapters appear as the campaign advances; nothing is made up.'), 'muted'),
  ], [
    h('h3', { class: 'aside29-h' }, t(l('Seu contexto', 'Your context'))),
    linkCards29([
      { icon: 'target', title: l('Objetivo da campanha', 'Campaign goal'), sub: l('Metas e conquistas.', 'Goals and achievements.'), go: go({ area: 'goals' }) },
      { icon: 'heart', title: l('Relações acompanhadas', 'Followed relationships'), sub: l('Pessoas e vínculos.', 'People and ties.'), go: go({ area: 'people' }) },
      { icon: 'datebook', title: l('Compromissos', 'Commitments'), sub: l('Prazos e revisão do período.', 'Deadlines and period review.'), go: go({ area: 'calendar19' }) },
      { icon: 'book', title: l('Ver o que aconteceu', 'See what happened'), sub: l('Diário da run.', 'Run diary.'), go: go({ area: 'diary' }) },
      { icon: 'shirt', title: l('Álbum de cenas', 'Scene album'), sub: l('Rever sem executar efeitos.', 'Replay without running effects.'), go: go({ area: 'scenes17' }) },
    ], 'col'),
  ]);
});
