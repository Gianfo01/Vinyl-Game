// Rodada 18 (world18) — interface: área "Depois do palco" (segundas carreiras, voltas, quem está sendo cortejado),
// aba "Segunda carreira" na página da pessoa e aba "Estratégia observada" na página do selo (sinais dos rivais que
// aprendem, nunca a intenção pronta).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { histMode } from '../../sim/history15';
import { observed18, type Sign18K } from '../../sim/sys/rivalmind18';
import { DEST18, career18, careersOf18, w18, type Car18, type Dest18 } from '../../sim/sys/world18';
import { opinionOf } from '../../sim/sys/persona13';
import type { GameState, Person } from '../../sim/types';
import { actLink, labelLink, monthName, pill, section } from '../common';
import { h } from '../dom';
import { PERSON_TABS } from '../pages';
import { registerArea, registerPageTab } from '../registry';
import { PAGE16_TABS, personLink16 } from './people16';

const SIGN_CLS: Partial<Record<Sign18K, string>> = { target: 'bad', court: 'bad', flood: 'warn', giveup: 'good', develop: 'warn', abandon: 'good', pact: 'good', dispute: 'warn', overexp: 'warn', badsign: 'warn', trouble: 'bad', bankrupt: 'bad', bid: '' };
const SIGN_NAME: Record<Sign18K, ReturnType<typeof l>> = {
  target: l('boato', 'rumour'), court: l('assédio', 'courting'), flood: l('contratações', 'signings'), giveup: l('desistiu', 'gave up'), develop: l('desenvolvimento', 'development'),
  abandon: l('saiu do mercado', 'left a market'), pact: l('parceria', 'partnership'), dispute: l('disputa', 'dispute'), overexp: l('expansão', 'expansion'), badsign: l('aposta cara', 'costly bet'),
  trouble: l('aperto', 'strain'), bankrupt: l('quebra', 'bust'), bid: l('leilão', 'bidding war'),
};
const wkDate = (s: GameState, w: number) => { const tot = s.year * 12 + s.month - Math.round((s.week - w) / 4.35); return `${monthName(((tot % 12) + 12) % 12)} ${Math.floor(tot / 12)}`; };

function strategyTab(s: GameState, id: string): HTMLElement {
  const o = observed18(s, id);
  const anr = careersOf18(s, 'anr').filter(([, c]) => c.lb === id);
  return h('div', null,
    section(t(l('Leitura do analista', 'Analyst reading')),
      o.read.length ? h('ul', { class: 'small' }, ...o.read.map((x) => h('li', null, t(x)))) : h('p', { class: 'muted small' }, t(l('Nada fora do normal. Os rivais aprendem com o que vivem: perder leilões, dar prejuízo num gênero, ver você dependente de um artista — os sinais aparecem aqui antes do golpe.', 'Nothing unusual. Rivals learn from what they live through: losing bidding wars, losing money in a genre, seeing you depend on one act — the signs show up here before the blow.')))),
    anr.length ? section(t(l('A&R ex-artista', 'Former-artist A&R')), h('ul', { class: 'small' }, ...anr.map(([pid, c]) => h('li', null, personLink16(s, `p:${pid}`), ` — ${t(l('ouvido para', 'an ear for'))} ${c.fam}: ${t(l('o selo acha estreantes do gênero antes dos outros', 'the label finds newcomers in the genre before others'))}`)))) : null,
    section(t(l('Sinais observados', 'Observed signs')),
      o.signs.length ? h('ul', { class: 'small' }, ...o.signs.map((x) => h('li', null, h('span', { class: 'muted' }, `${wkDate(s, x.w)} `), pill(t(SIGN_NAME[x.k]), SIGN_CLS[x.k] ?? ''), ' ', t(x.t)))) : h('p', { class: 'muted small' }, t(l('Nenhum sinal ainda.', 'No signs yet.')))),
    h('p', { class: 'muted small' }, t(l('Sinais vêm do mercado (boatos, contratações, relatórios), com atraso e ruído. Antecipar a intenção vale mais que reagir ao ataque: renove cedo quem está na mira, diversifique, aproveite quando um rival sai de um gênero ou entra em apuros.', 'Signs come from the market (rumours, signings, reports), late and noisy. Anticipating intent beats reacting to the attack: renew early whoever is targeted, diversify, pounce when a rival leaves a genre or gets into trouble.'))),
  );
}
registerPageTab('label', { id: 'strat18', label: l('Estratégia observada', 'Observed strategy'), icon: 'eye', order: 40, when: (s, id) => !!s.labels[id] && id !== 'player', render: strategyTab });

function careerBox(s: GameState, pid: string, c: Car18): HTMLElement {
  const o = opinionOf(s, `p:${pid}`);
  const opin = c.k === 'radio' || c.k === 'critic' || c.k === 'politics' ? h('p', { class: 'small' }, t(l('Opinião sobre você', 'Opinion of you')), `: ${o} — `,
    t(o >= 20 ? l('a favor (efeito positivo)', 'on your side (positive effect)') : o <= -20 ? l('contra (efeito negativo)', 'against you (negative effect)') : l('neutra: aproxime-se pelo menu de ações (ligar, almoçar, presente)', 'neutral: get closer through the action menu (call, lunch, gift)'))) : null;
  return h('div', null,
    h('p', null, pill(t(DEST18[c.k][0]), 'good'), ` ${c.y} · ${t(l('ex-integrante de', 'formerly of'))} `, actLink(s, c.act), c.lb && s.labels[c.lb] ? h('span', null, ' · ', labelLink(s, c.lb)) : null),
    h('p', { class: 'small' }, t(l('Por quê', 'Why')), `: ${t(c.why)}`),
    h('p', { class: 'small muted' }, t(DEST18[c.k][1])),
    opin,
    c.k === 'producer' ? h('p', { class: 'small' }, t(l('Aparece na lista de produtores do estúdio (com som próprio e cachê por faixa).', 'Shows up on the studio producer list (own sound, per-track fee).'))) : null);
}
const T2 = l('Segunda carreira', 'Second career');
PERSON_TABS.push((s, p: Person) => { const c = career18(s, p.id); return c ? { id: 'car18', label: T2, icon: 'briefcase', render: () => careerBox(s, p.id, c) } : null; });
PAGE16_TABS.push((s, key) => { if (!key.startsWith('p:')) return null; const c = career18(s, key); return c ? { id: 'car18', label: T2, icon: 'briefcase', render: () => careerBox(s, key.slice(2), c) } : null; });

function afterArea(s: GameState): HTMLElement {
  const st = w18(s);
  const groups = new Map<Dest18, [string, Car18][]>();
  for (const x of careersOf18(s)) { const a = groups.get(x[1].k) ?? []; a.push(x); groups.set(x[1].k, a); }
  const court = Object.entries(st.court).filter(([aid]) => s.acts[aid] && !s.acts[aid].owner && ((s.knowledge[aid]?.degree ?? 0) >= 1 || s.acts[aid].fame >= 20));
  const cbs = Object.entries(st.cb).filter(([aid]) => s.acts[aid]).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return h('div', { class: 'page' },
    h('h2', null, t(l('Depois do palco', 'After the stage'))),
    histMode(s) !== 'strict' ? h('p', { class: 'small' }, pill(t(l('História alternativa', 'Alternate history')), 'warn'), ' ', t(l('Qualquer pessoa — real ou inventada — pode virar produtor, político, professor ou largar tudo, e voltar.', 'Anyone — real or invented — may become a producer, politician or teacher, quit everything, and come back.')))
      : h('p', { class: 'small' }, pill(t(l('Vida real exata', 'Exact real life')), 'good'), ' ', t(l('Pessoas reais intocadas só seguem o roteiro real; as mudanças de carreira aqui são de personagens fictícios.', 'Untouched real people only follow the real script; career changes here belong to fictional characters.'))),
    court.length ? section(t(l('Sendo cortejados por rivais (sem selo)', 'Being courted by rivals (unsigned)')), h('ul', { class: 'small' }, ...court.map(([aid, c]) => h('li', null, actLink(s, aid), ' ← ', labelLink(s, c.lb), ` · ${t(l('decisão em', 'decision in'))} ~${Math.max(0, c.w - s.week)} ${t(l('sem.', 'wk'))} — ${t(l('uma proposta sua leva a disputa a leilão', 'an offer from you turns it into a bidding war'))}`)))) : null,
    cbs.length ? section(t(l('Voltas', 'Comebacks')), h('ul', { class: 'small' }, ...cbs.map(([aid, y]) => h('li', null, `${y} · `, actLink(s, aid), s.acts[aid].owner ? h('span', null, ' · ', labelLink(s, s.acts[aid].owner)) : ` · ${t(l('sem selo', 'unsigned'))}`)))) : null,
    section(t(l('Segundas carreiras', 'Second careers')),
      groups.size ? h('div', null, ...[...groups].map(([k, xs]) => h('div', null, h('h4', null, t(DEST18[k][0]), ` (${xs.length})`), h('p', { class: 'small muted' }, t(DEST18[k][1])),
        h('ul', { class: 'small' }, ...xs.slice(0, 12).map(([pid, c]) => h('li', null, personLink16(s, `p:${pid}`), ` (${t(l('ex-', 'ex-'))}`, actLink(s, c.act), `, ${c.y}) — ${t(c.why)}`)))))) : h('p', { class: 'muted small' }, t(l('Ninguém pendurou as chuteiras ainda.', 'Nobody has hung up their boots yet.')))),
    st.log.length ? section(t(l('Crônica', 'Chronicle')), h('ul', { class: 'small' }, ...st.log.slice(0, 30).map(([y, m, x]) => h('li', null, h('span', { class: 'muted' }, `${monthName(m)} ${y} `), t(x))))) : null,
  );
}
registerArea({ id: 'after18', label: l('Depois do palco', 'After the stage'), icon: 'briefcase', key: '', render: afterArea });
