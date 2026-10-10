// Próximos passos (rodada 5): uma lista curta de pendências com botão "Ir", no topo da Mesa do mês.
// Lê o estado e aponta o que merece atenção: caixa, músicas paradas, contratos no fim, moral,
// atos sem lançar, caixa de entrada, e o próprio personagem (tempo livre, relação, saúde).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { unreleasedRecorded } from '../sim/production';
import { actState } from '../sim/people';
import { energyLeft, life, maxEnergy } from '../sim/sys/life';
import { ownerOf } from '../sim/sys/people/owner';
import type { GameState } from '../sim/types';
import { fmtL, playerActs } from '../sim/util';
import { $, rerender, section } from './common';
import { h } from './dom';
import { store } from './store';
import { ic, setTab } from './vis';
import { unreadCount } from '../sim/sys/people/inbox';
import { careers } from '../sim/sys/careers12';
import { advisorTips18, snoozeTip18, snoozed18, tipScore, type AdvTip18 } from '../sim/inbox18';
import { go18 } from './sys/inbox18';
import { toast } from './common';

export interface Tip {
  icon: string;
  text: L;
  area: string;
  tab?: [string, string];
  act?: string;
  level: 'bad' | 'warn' | 'info';
}

/** Rodada 13: outros sistemas somam dicas (ex.: por carreira). */
export const ADVISOR_EXTRA: ((s: GameState) => Tip[])[] = [];

export function advisorTips(s: GameState): Tip[] {
  const out: Tip[] = [];
  const net = Object.values(s.lastMonthLedger).reduce((a, b) => a + b, 0);
  if (s.player.cash < 0) out.push({ icon: 'warning', text: l('Caixa negativo: corte custos, venda masters ou peça empréstimo (Negócios).', 'Negative cash: cut costs, sell masters or take a loan (Business).'), area: 'business', level: 'bad' });
  else if (net < 0 && s.player.cash / -net < 4) out.push({ icon: 'warning', text: fmtL(l('No ritmo do último mês, o caixa dura ~{n} meses ({c}).', 'At last month\'s pace, cash lasts ~{n} months ({c}).'), { n: Math.max(1, Math.floor(s.player.cash / -net)), c: $(s.player.cash) }), area: 'business', level: 'warn' });
  const ids = playerActs(s);
  if (!ids.length && careers(s).active.some((c) => c === 'label' || c === 'musician')) out.push({ icon: 'fans', text: l('Seu elenco está vazio: descubra artistas no Mercado e faça uma oferta.', 'Your roster is empty: discover artists in the Market and make an offer.'), area: 'market', level: 'warn' });
  for (const id of ids) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    const ready = unreleasedRecorded(s, a).length;
    const scheduled = s.pendingReleases.some((p) => p.actId === id);
    if (ready >= 3 && !scheduled) out.push({ icon: 'disc', text: fmtL(l('{a} tem {n} músicas gravadas esperando lançamento.', '{a} has {n} recorded songs waiting for release.'), { a: a.name, n: ready }), area: 'creation', act: id, level: 'info' });
    else if (a.releases.length && s.week - a.lastRelease > 60 && !scheduled && a.status === 'active') out.push({ icon: 'clock', text: fmtL(l('{a} está há mais de um ano sem lançar: o público esquece rápido.', '{a} has not released for over a year: audiences forget fast.'), { a: a.name }), area: 'creation', act: id, level: 'info' });
    const st = actState(s, a);
    if (st.morale < 35) out.push({ icon: 'heart', text: fmtL(l('Moral baixa em {a} ({m}). Converse, dê folga ou cumpra promessas (Pessoas).', 'Low morale in {a} ({m}). Talk, give a break or keep promises (People).'), { a: a.name, m: Math.round(st.morale) }), area: 'people', act: id, level: 'warn' });
    if (st.fatigue > 75) out.push({ icon: 'sleep', text: fmtL(l('{a} está exausto(a): coloque uma pausa na agenda.', '{a} is exhausted: add a rest to the agenda.'), { a: a.name }), area: 'artists', act: id, level: 'warn' });
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (c && c.party === 'player' && !a.playerBand && c.endWeek - s.week <= 13 && c.endWeek > s.week) out.push({ icon: 'contract', text: fmtL(l('O contrato de {a} acaba em {w} semanas. Renove antes que um rival chegue.', '{a}\'s contract ends in {w} weeks. Renew before a rival steps in.'), { a: a.name, w: c.endWeek - s.week }), area: 'artists', act: id, level: 'warn' });
  }
  const unread = unreadCount(s);
  if (unread >= 3) out.push({ icon: 'newspaper', text: fmtL(l('{n} mensagens não lidas na caixa de entrada.', '{n} unread messages in the inbox.'), { n: unread }), area: 'inbox', level: 'info' });
  const o = ownerOf(s);
  if (o.stress > 75 || o.health < 40) out.push({ icon: 'stress', text: l('Você está no limite (estresse/saúde). Tire férias, faça terapia ou um hobby (Você).', 'You are at your limit (stress/health). Take a holiday, therapy or a hobby (You).'), area: 'you', tab: ['life', 'leisure'], level: 'bad' });
  const pt = life(s).partner;
  if (pt && pt.affinity < 30) out.push({ icon: 'heart', text: fmtL(l('{p} anda distante. Passe tempo junto (Vida pessoal → Amor e família).', '{p} has been distant. Spend time together (Personal life → Love and family).'), { p: pt.name }), area: 'you', tab: ['life', 'love'], level: 'warn' });
  if (energyLeft(s) === maxEnergy(s) && out.length < 6) out.push({ icon: 'star', text: l('Você ainda tem todo o tempo livre do mês: pratique, namore, toque num bar ou mentore um artista (Você).', 'You still have all your free time this month: practise, date, play a bar or mentor an artist (You).'), area: 'you', level: 'info' });
  for (const f of ADVISOR_EXTRA) out.push(...f(s));
  const order = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// r18 (U2): Conselheiro v2 — junta as dicas antigas e as registradas (registerAdvisorTip) num ranking com
// porquê, efeito estimado, ação direta e "adiar"; 7 visíveis e "ver mais".
let advMore = false;
function allTips18(s: GameState): AdvTip18[] {
  const old: AdvTip18[] = advisorTips(s).map((x, i) => ({ id: `old:${x.area}:${x.act ?? ''}:${t(x.text).slice(0, 40)}`, level: x.level, text: x.text, score: (x.level === 'bad' ? 92 : x.level === 'warn' ? 62 : 28) - i * 0.1, goto: { area: x.area, tab: x.tab, act: x.act } }));
  const seen = new Set<string>();
  return [...advisorTips18(s), ...old].filter((x) => !snoozed18(s, x.id) && (seen.has(x.id) ? false : (seen.add(x.id), true))).sort((a, b) => tipScore(b) - tipScore(a));
}

export function advisorSection(s: GameState): HTMLElement | null {
  const tips = allTips18(s);
  if (!tips.length) return null;
  const shown = advMore ? tips : tips.slice(0, 7);
  const go = (x: AdvTip18) => { const g = x.goto!; if (g.act && g.area) { store.selectedAct = g.act; if (g.tab) setTab(g.tab[0], g.tab[1]); store.area = g.area as typeof store.area; rerender(); } else go18(g); };
  return section(t(l('Próximos passos', 'Next steps')),
    h('ul', { class: 'adv18' }, shown.map((x) => h('li', { class: x.level },
      ic(x.level === 'bad' ? 'warning' : x.level === 'good' ? 'star' : x.level === 'warn' ? 'clock' : 'bulb'), h('span', null, t(x.text), x.effect ? h('div', { class: 'adv18-fx muted' }, '→ ', t(x.effect)) : null),
      x.goto ? h('button', { class: 'btn small ghost', onclick: () => go(x) }, t(x.goto.label ?? l('Ir', 'Go')), ' →') : h('span'),
      x.why?.length ? h('div', { class: 'adv18-why' }, t(l('Por quê: ', 'Why: ')), x.why.map((w) => t(w)).join(' ')) : null,
      h('div', { class: 'adv18-acts' },
        x.run ? h('button', { class: 'btn small', onclick: () => { toast(t(x.run!.fn(s))); rerender(); } }, t(x.run.label)) : null,
        h('button', { class: 'btn small ghost', title: t(l('Some por 2 meses', 'Hidden for 2 months')), onclick: () => { snoozeTip18(s, x.id); rerender(); } }, t(l('Adiar', 'Snooze'))))))),
    tips.length > 7 ? h('button', { class: 'btn small ghost', onclick: () => { advMore = !advMore; rerender(); } }, advMore ? t(l('Ver menos', 'Show less')) : t(l('Ver mais ({n})', 'Show more ({n})'), { n: tips.length - 7 })) : null);
}
