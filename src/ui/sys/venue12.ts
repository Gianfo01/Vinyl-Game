// Interface do dono de casa de shows (rodada 12): programação fixa por dia da semana, acordos,
// público frequente, cena local, reformas, equipe, manutenção, vizinhança e metas.

import { CITIES, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { liveOf } from '../../sim/sys/live';
import {
  DAYS, DEALS, GOALS, NIGHTS, UPS, addNight12, bigger12, biggerCost, branch12, branchCost, dropNight12, effCap, localActs, localFee, monthEst12, neighFund12, nightEst, quiet12,
  setDeal12, setGoal12, setMaint12, setStaff12, staffNeed, upCost, upgrade12, v12, type DayK, type DealK, type Goal, type NightK, type UpK,
} from '../../sim/sys/venue12';
import { VENUE_KINDS } from '../../sim/sys/live';
import type { GameState } from '../../sim/types';
import { monthIndex } from '../../sim/capacity';
import { $, N, cityName, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerSection } from '../registry';
import { chips, meter, stat } from '../vis';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const add = { day: 'fri' as DayK, k: 'original' as NightK, deal: 'door' as DealK, act: '', name: '' };
let branchCity = '';

function venue12Section(s: GameState): HTMLElement | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return null;
  const e = monthEst12(s)!;
  const acts = localActs(s, v);
  const free = (Object.keys(DAYS) as DayK[]).filter((d) => !x.prog.some((n) => n.day === d));
  if (!free.includes(add.day)) add.day = free[0] ?? 'fri';
  const need = staffNeed(x);
  const strong = x.prog.filter((n) => (n.k === 'original' || n.k === 'residency') && n.idn >= 60).length;
  const i = VENUE_KINDS.findIndex((k) => k.id === v.kind);
  const nk = VENUE_KINDS[i + 1];
  const goalLine: Record<Goal, string> = {
    reference: t(l('Fiéis {r}/70 · cena {c}/65 · noites fortes {n}/2 · {m}/12 meses', 'Regulars {r}/70 · scene {c}/65 · strong nights {n}/2 · {m}/12 months'), { r: Math.round(x.regulars), c: Math.round(x.scene), n: strong, m: x.refMonths }),
    chain: t(l('Filiais {n}/3', 'Branches {n}/3'), { n: x.branches.length }),
    big: nk ? t(l('Próximo espaço: {k} ({c})', 'Next space: {k} ({c})'), { k: nk.name, c: $(biggerCost(s, v)) }) : t(l('Já no maior espaço; fiéis {r}/60', 'Already the biggest space; regulars {r}/60'), { r: Math.round(x.regulars) }),
  };
  return section(t(l('Programação da casa', 'House programme')),
    h('p', { class: 'muted small' }, t(l('Noites fixas por dia da semana constroem público frequente. Cada noite tem um acordo: aluguel fixo, divisão de porta ou produção própria.', 'Fixed weekly nights build regulars. Each night has a deal: fixed rent, door split or own production.'))),
    chips(stat('money', $(e.house), l('Programação/mês', 'Programme/month')), stat('money', $(-(e.cost + e.staff + e.maint)), l('Cachês, equipe e manutenção/mês', 'Fees, staff and upkeep/month'), 'bad'),
      x.branches.length ? stat('bank', $(e.branches), l('Filiais/mês', 'Branches/month')) : null, stat('sparkle', $(e.net), l('Resultado da programação/mês', 'Programme result/month'), e.net >= 0 ? 'good' : 'bad'), stat('fans', N(effCap(v, x)), l('Capacidade', 'Capacity'))),
    meter('heart', l('Público frequente (confia na programação)', 'Regulars (trust the programme)'), x.regulars),
    meter('note', l('Relação com a cena local', 'Local scene relations'), x.scene),
    meter('house', l('Vizinhança', 'Neighbours'), x.neigh),
    meter('clock', l('Conservação', 'Condition'), x.cond),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Dia', 'Day'), l('Noite', 'Night'), l('Acordo', 'Deal'), l('Identidade', 'Identity'), l('Público/mês', 'Crowd/month'), l('Resultado/mês', 'Result/month'), l('', '')].map((y) => h('th', null, t(y))))),
      h('tbody', null, x.prog.slice().sort((a, b) => Object.keys(DAYS).indexOf(a.day) - Object.keys(DAYS).indexOf(b.day)).map((n) => {
        const ne = nightEst(s, v, x, n);
        return h('tr', null,
          h('td', null, t(DAYS[n.day].name)),
          h('td', null, h('b', null, n.name), h('br'), h('small', { class: 'muted' }, `${t(NIGHTS[n.k].name)} · ${n.age} ${t(l('meses', 'months'))}`), ne.why.length ? h('small', { class: 'warn' }, h('br'), ne.why.map((w) => t(w)).join(' ')) : null),
          h('td', null, n.k === 'private' || n.k === 'rental' ? t(DEALS.rent.name) : select<DealK>(n.deal, (Object.keys(DEALS) as DealK[]).map((d) => ({ value: d, label: t(DEALS[d].name) })), (d) => { setDeal12(s, n.id, d); rerender(); })),
          h('td', null, String(Math.round(n.idn))),
          h('td', null, `${N(ne.att)} (${Math.round(ne.occ * 100)}%)`),
          h('td', { class: ne.net >= 0 ? 'good' : 'bad' }, $(ne.net)),
          h('td', null, h('button', { class: 'btn tiny ghost', title: t(l('Encerrar (noites antigas custam confiança)', 'End (old nights cost trust)')), onclick: () => { dropNight12(s, n.id); rerender(); } }, '✕')));
      }))),
    free.length ? h('div', { class: 'lv-form' },
      h('label', null, t(l('Dia', 'Day')), select<DayK>(add.day, free.map((d) => ({ value: d, label: t(DAYS[d].name) })), (d) => (add.day = d))),
      h('label', null, t(l('Tipo', 'Type')), select<NightK>(add.k, (Object.keys(NIGHTS) as NightK[]).map((k) => ({ value: k, label: t(NIGHTS[k].name) })), (k) => { add.k = k; rerender(); })),
      add.k !== 'private' && add.k !== 'rental' ? h('label', null, t(l('Acordo', 'Deal')), select<DealK>(add.deal, (Object.keys(DEALS) as DealK[]).map((d) => ({ value: d, label: t(DEALS[d].name) })), (d) => { add.deal = d; rerender(); })) : null,
      add.k === 'original' || add.k === 'residency' ? h('label', null, t(l('Artista local', 'Local act')), select(add.act, [{ value: '', label: t(l('— vários (curadoria) —', '— various (curated) —')) }, ...acts.map((a) => ({ value: a.id, label: `${a.name} · ${Math.round(a.fame)} · ${t(l('relação', 'relation'))} ${Math.round(x.rel[a.id] ?? 30)} · ${$(localFee(s, x, a))}` }))], (id) => (add.act = id))) : null,
      h('label', null, t(l('Nome da noite', 'Night name')), h('input', { type: 'text', maxlength: 40, value: add.name, oninput: (ev: Event) => (add.name = (ev.target as HTMLInputElement).value) })),
      h('button', { class: 'btn small primary', onclick: () => { const r = addNight12(s, { k: add.k, day: add.day, deal: add.deal, actId: add.act || undefined, name: add.name }); add.name = ''; say(r, l('Noite na programação.', 'Night added to the programme.')); } }, t(l('Criar noite fixa', 'Create weekly night'))),
      h('small', { class: 'muted' }, t(NIGHTS[add.k].desc), ' ', add.k !== 'private' && add.k !== 'rental' ? t(DEALS[add.deal].desc) : ''),
    ) : null,
    h('h5', null, t(l('Equipe e manutenção', 'Staff and maintenance'))),
    h('div', { class: 'row wrap small' },
      t(l('Equipe', 'Staff')), ' ', select(x.staff, Array.from({ length: 12 }, (_, k) => ({ value: k + 1, label: String(k + 1) })), (n) => { setStaff12(s, n); rerender(); }),
      ` ${t(l('(a programação pede {n})', '(the programme needs {n})'), { n: need })} · `,
      t(l('Manutenção', 'Maintenance')), ' ', select(x.maint, [0, 1, 2].map((k) => ({ value: k, label: t([l('Nenhuma', 'None'), l('Regular', 'Regular'), l('Preventiva', 'Preventive')][k]) })), (n) => { setMaint12(s, n); rerender(); })),
    h('h5', null, t(l('Reformas', 'Renovations'))),
    h('div', { class: 'cards' }, (Object.keys(UPS) as UpK[]).map((u) => h('div', { class: 'tile' }, h('div', { class: 'tile-body' },
      h('b', null, t(UPS[u].name)), ' ', x.ups[u] ? pill(t(l('feito', 'done')), 'good') : null,
      h('small', { class: 'muted' }, t(UPS[u].desc)),
      x.ups[u] ? null : h('button', { class: 'btn small', disabled: s.player.cash < upCost(s, v, u), onclick: () => say(upgrade12(s, u), l('Reforma feita.', 'Renovation done.')) }, $(upCost(s, v, u))))))),
    h('h5', null, t(l('Vizinhança', 'Neighbourhood'))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => say(neighFund12(s), l('Bairro agradecido.', 'Neighbours grateful.')) }, t(l('Financiar melhorias no bairro', 'Fund neighbourhood improvements'))),
      h('button', { class: 'btn small ghost', disabled: monthIndex(s) < x.quietUntil, onclick: () => { quiet12(s); rerender(); } }, t(l('Acordo de horário (6 meses)', 'Hours agreement (6 months)'))),
      monthIndex(s) < x.quietUntil ? pill(t(l('horário reduzido', 'reduced hours')), 'warn') : null),
    h('h5', null, t(l('Meta', 'Goal'))),
    h('div', { class: 'row wrap small' }, select<Goal>(x.goal, (Object.keys(GOALS) as Goal[]).map((g) => ({ value: g, label: `${t(GOALS[g].name)}${x.done[g] ? ` ✓ ${x.done[g]}` : ''}` })), (g) => { setGoal12(s, g); rerender(); }), ` ${goalLine[x.goal]}`),
    h('p', { class: 'small muted' }, t(GOALS[x.goal].desc)),
    x.goal === 'chain' ? h('div', { class: 'row wrap small' },
      select(branchCity || CITIES.find((c) => c.id !== v.cityId)!.id, CITIES.filter((c) => c.id !== v.cityId && !x.branches.some((b) => b.city === c.id)).map((c) => ({ value: c.id, label: cityName(c.id) })), (c) => (branchCity = c)),
      h('button', { class: 'btn small', onclick: () => say(branch12(s, branchCity || CITIES.find((c) => c.id !== v.cityId)!.id), l('Filial aberta.', 'Branch opened.')) }, t(l('Abrir filial ({c})', 'Open branch ({c})'), { c: $(branchCost(s)) })),
      x.branches.length ? ` ${x.branches.map((b) => cityName(b.city)).join(', ')}` : '') : null,
    x.goal === 'big' && nk && s.year >= nk.minYear ? h('button', { class: 'btn small', onclick: () => { if (confirm(t(l('Mudar para um espaço maior? Parte dos frequentadores não acompanha e as reformas recomeçam.', 'Move to a bigger space? Some regulars will not follow and renovations start over.')))) say(bigger12(s), l('Mudança feita.', 'Moved.')); } }, t(l('Mudar para {k} ({c})', 'Move to a {k} ({c})'), { k: nk.name, c: $(biggerCost(s, v)) })) : null,
    x.notes.length ? h('details', { class: 'small' }, h('summary', null, t(l('O que aconteceu e por quê', 'What happened and why'))), h('ul', null, x.notes.slice(-10).reverse().map((n) => h('li', null, t(n.t))))) : null,
  );
}

registerSection('shows', { id: 'live-venue12', order: 45.5, render: (s) => venue12Section(s) });
