// Interface de ritmo e delegação (rodada 8): critérios do "avançar até…", resumo do período agrupado,
// área "Equipe e ritmo" com a política de cada carreira (prioridade, atenção, teto de gasto), orçamento
// e capacidade da equipe, e o registro do que a equipe decidiu e por quê.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { defaultAgenda } from '../../sim/agenda';
import { DEFAULT_STOP, PRIOS, TIERS, budgetLeft, describeEntry, overCapacity, pace8, policyOf, setPolicy, teamCapacity, type Digest, type Prio, type StopCriteria, type Tier } from '../../sim/sys/pacing8';
import type { GameState } from '../../sim/types';
import { money, playerActs, staffCount } from '../../sim/util';
import { $, actLink, logo, modal, pill, rerender, section } from '../common';
import { h, select } from '../dom';
import { catName } from '../panels/misc';
import { registerArea, registerSection } from '../registry';
import { store } from '../store';
import { ic } from '../vis';

const STOPS: { k: keyof StopCriteria; name: L; icon: string }[] = [
  { k: 'decision', name: l('Decisão nova na mesa', 'New decision on the desk'), icon: 'calendar' },
  { k: 'offer', name: l('Proposta ou contraproposta importante', 'Important offer or counter-offer'), icon: 'handshake' },
  { k: 'crisis', name: l('Crise, escândalo ou insolvência', 'Crisis, scandal or insolvency'), icon: 'fire' },
  { k: 'cash', name: l('Caixa abaixo do piso', 'Cash below the floor'), icon: 'money' },
  { k: 'release', name: l('Semana de lançamento', 'Release week'), icon: 'disc' },
  { k: 'chart', name: l('Disco seu entra nas paradas', 'Your record enters the charts'), icon: 'chart-up' },
];

/** Texto curto dos critérios ligados (para o título do botão). */
export function stopSummary(s: GameState): string {
  const st = pace8(s).stop;
  const on = STOPS.filter((x) => st[x.k]).map((x) => t(x.name).toLowerCase());
  return t(l('Avança semana a semana até: {c} — ou {m} meses.', 'Advances week by week until: {c} — or {m} months.'), { c: on.join(', ') || '—', m: st.maxMonths });
}

function stopForm(s: GameState, onChange?: () => void): HTMLElement {
  const st = pace8(s).stop;
  const chk = (k: keyof StopCriteria, name: L, icon: string) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: !!st[k], onchange: (e: Event) => { (st as unknown as Record<string, boolean>)[k] = (e.target as HTMLInputElement).checked; onChange?.(); } }), ic(icon), ' ', t(name));
  const num = (k: 'cashFloor' | 'chartTop' | 'maxMonths', min: number, max: number, step: number) => h('input', { type: 'number', min, max, step, value: st[k], style: 'width:7em', onchange: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); if (Number.isFinite(v)) st[k] = Math.max(min, Math.min(max, v)); onChange?.(); } });
  return h('div', { class: 'form pace-form' },
    ...STOPS.map((x) => chk(x.k, x.name, x.icon)),
    h('label', null, t(l('Piso de caixa (dólares de hoje)', 'Cash floor (today\'s dollars)')), ' ', num('cashFloor', 0, 10_000_000, 1000), h('small', { class: 'muted' }, ` ≈ ${$(money(s, st.cashFloor))}`)),
    h('label', null, t(l('Entrada nas paradas até a posição', 'Chart entry up to position')), ' ', num('chartTop', 1, 100, 1)),
    h('label', null, t(l('Avançar no máximo (meses)', 'Advance at most (months)')), ' ', num('maxMonths', 1, 24, 1)),
    h('button', { class: 'btn small ghost', onclick: () => { pace8(s).stop = { ...DEFAULT_STOP }; onChange?.(); rerender(); } }, t(l('Restaurar padrão', 'Restore defaults'))),
  );
}

/** Modal com os critérios de parada; `run` avança com eles. */
export function openUntilConfig(s: GameState, run: () => void): void {
  let close = () => {};
  const body = h('div', null,
    h('p', { class: 'muted small' }, t(l('O tempo corre semana a semana e para no primeiro critério que acontecer. Coisas pequenas viram um resumo no fim.', 'Time runs week by week and stops at the first criterion that happens. Small things become a summary at the end.'))),
    stopForm(s),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { close(); run(); } }, '⏭ ', t(l('Avançar até…', 'Advance until…')))),
  );
  close = modal(t(l('Avançar até algo relevante', 'Advance until something relevant')), body);
}

const weekLabel = (s: GameState, w: number) => {
  const d = new Date(Date.UTC(s.config.startYear, 0, 1 + w * 7));
  return d.toLocaleDateString(t(l('pt-BR', 'en-US')), { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

/** Resumo do período: dinheiro por categoria, acontecimentos agrupados e decisões da equipe. */
export function showDigest(s: GameState, d: Digest, reason?: L, onClose?: () => void): void {
  const body = h('div', { class: 'digest' },
    h('p', { class: 'lead' }, reason ? h('b', null, '⏸ ', t(reason), ' ') : null,
      t(l('{a} → {b} · {w} semana(s)', '{a} → {b} · {w} week(s)'), { a: weekLabel(s, d.fromWeek), b: weekLabel(s, d.toWeek), w: d.toWeek - d.fromWeek })),
    h('div', { class: 'digest-money' },
      h('h4', null, ic('money'), ' ', t(l('Dinheiro', 'Money')), ' ', h('b', { class: d.cashDelta >= 0 ? 'good' : 'bad' }, `${d.cashDelta >= 0 ? '+' : ''}${$(d.cashDelta)}`)),
      d.cats.length ? h('ul', { class: 'small digest-cats' }, d.cats.map((c) => h('li', null, h('span', null, catName(c.cat)), ' ', h('b', { class: c.delta >= 0 ? 'good' : 'bad' }, `${c.delta >= 0 ? '+' : ''}${$(c.delta)}`)))) : null,
    ),
    h('div', { class: 'digest-groups' }, d.groups.map((g) => h('details', { class: 'digest-group', open: g.id === 'crisis' || g.id === 'charts' || d.groups.length <= 3 },
      h('summary', null, ic(g.icon), ' ', h('b', null, t(g.name)), ' ', pill(String(g.n))),
      h('ul', { class: 'small' }, g.items.map((x) => h('li', null, t(x))), g.n > g.items.length ? h('li', { class: 'muted' }, t(l('…e mais {n}', '…and {n} more'), { n: g.n - g.items.length })) : null),
    ))),
    d.team.length ? h('details', { class: 'digest-group' },
      h('summary', null, ic('contract'), ' ', h('b', null, t(l('O que a equipe decidiu', 'What the team decided'))), ' ', pill(String(d.team.length))),
      teamLogList(s, d.team.slice(-12)),
    ) : null,
  );
  modal(t(l('Resumo do período', 'Period summary')), body, { wide: true, onClose });
}

function teamLogList(s: GameState, entries: ReturnType<typeof pace8>['log']): HTMLElement {
  return h('ul', { class: 'team-log small' }, [...entries].reverse().map((e) => {
    const d = describeEntry(s, e);
    const icon = e.k === 'rel' ? 'disc' : e.k === 'cut' ? 'money' : e.k === 'min' ? 'sleep' : e.k === 'hold' ? 'lock' : 'calendar';
    return h('li', { class: `tl-${e.k}` }, ic(icon), ' ', h('span', { class: 'muted' }, `${weekLabel(s, e.w)} · `), t(d.what), d.why.pt ? h('div', { class: 'muted why' }, '↳ ', t(l('Por quê: ', 'Why: ')), t(d.why)) : null);
  }));
}

// ---------------------------------------------------------------- área "Equipe e ritmo"

let logFilter = '';

function policyRow(s: GameState, id: string, over: Set<string>): HTMLElement {
  const a = s.acts[id];
  const pol = policyOf(s, id);
  const delegated = s.delegated[id] !== false;
  const left = budgetLeft(s, id);
  return h('tr', { class: over.has(id) ? 'over' : '' },
    h('td', null, logo(a, 22), ' ', actLink(s, id), over.has(id) ? h('div', null, pill(t(l('sem braço: mínimo', 'no bandwidth: minimum')), 'warn')) : null),
    h('td', null, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: delegated, onchange: (e: Event) => {
      const on = (e.target as HTMLInputElement).checked;
      s.delegated[id] = on;
      if (!on) s.agenda[id] = defaultAgenda(s, a);
      rerender();
    } }), t(l('delegada', 'delegated')))),
    h('td', null, select<Prio>(pol.p, PRIOS.map((p) => ({ value: p.id, label: t(p.name) })), (v) => { setPolicy(s, id, { p: v }); rerender(); }, { disabled: !delegated, title: t(PRIOS.find((p) => p.id === pol.p)!.desc) })),
    h('td', null, select<Tier>(pol.tier, TIERS.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { setPolicy(s, id, { tier: v }); rerender(); }, { title: t(TIERS[pol.tier].desc) })),
    h('td', null, h('input', { type: 'number', min: 0, step: 100, value: pol.cap, style: 'width:6.5em', 'aria-label': t(l('Teto mensal (dólares de hoje; 0 = sem teto)', 'Monthly cap (today\'s dollars; 0 = no cap)')), onchange: (e: Event) => { setPolicy(s, id, { cap: Number((e.target as HTMLInputElement).value) || 0 }); rerender(); } }),
      h('small', { class: 'muted' }, left === Infinity ? ' ∞' : ` ${t(l('resta', 'left'))} ${$(left)}`)),
  );
}

function teamArea(s: GameState): HTMLElement {
  const st = pace8(s);
  const ids = playerActs(s);
  const over = overCapacity(s);
  const cap = teamCapacity(s);
  const delegatedN = ids.filter((id) => s.delegated[id] !== false).length;
  const spent = Object.values(st.spent).reduce((a, b) => a + b, 0);
  const log = st.log.filter((e) => !logFilter || e.a === logFilter);
  return h('div', { class: 'panel team8' },
    h('div', { class: 'col-main' },
      section(t(l('Delegação por carreira', 'Delegation per career')),
        h('p', { class: 'muted small' }, t(l('Com poucos artistas, você decide tudo. Com muitos, decide quem é foco, quanto cada carreira pode gastar e o que a equipe deve priorizar — e confere abaixo o que ela fez.', 'With few artists you decide everything. With many, you decide who is the focus, how much each career may spend and what the team should prioritise — then check below what it did.'))),
        ids.length ? h('table', { class: 'table small team-table' },
          h('thead', null, h('tr', null, ...[l('Carreira', 'Career'), l('Agenda', 'Agenda'), l('Prioridade', 'Priority'), l('Atenção', 'Attention'), l('Teto/mês', 'Cap/mo')].map((x) => h('th', null, t(x))))),
          h('tbody', null, ids.map((id) => policyRow(s, id, over)))) : h('p', { class: 'muted' }, t(l('Nenhuma carreira no elenco.', 'No careers on the roster.'))),
      ),
      section(t(l('O que a equipe decidiu e por quê', 'What the team decided and why')),
        h('div', { class: 'row wrap' }, select(logFilter, [{ value: '', label: t(l('Todas as carreiras', 'All careers')) }, ...ids.map((id) => ({ value: id, label: s.acts[id].name }))], (v) => { logFilter = v; rerender(); })),
        log.length ? teamLogList(s, log.slice(-40)) : h('p', { class: 'muted small' }, t(l('Nada ainda: as decisões aparecem quando o mês abre.', 'Nothing yet: decisions show up when the month opens.'))),
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('Capacidade da equipe', 'Team capacity')),
        h('p', { class: 'big' }, `${delegatedN}/${cap}`),
        h('p', { class: 'small muted' }, t(l('Carreiras delegadas que a equipe acompanha bem: 3 + 2 por nível de sede + 3 por empresário + 2 por administração (hoje: {m} empresário(s), {a} adm.). As de menor atenção além disso ficam no mínimo.', 'Delegated careers the team follows well: 3 + 2 per HQ level + 3 per artist manager + 2 per administration (now: {m} manager(s), {a} admin). Lower-attention ones beyond that stay on minimum.'), { m: staffCount(s, 'manager'), a: staffCount(s, 'admin') })),
        over.size ? h('p', { class: 'small bad' }, t(l('{n} carreira(s) sem braço este mês.', '{n} career(s) without bandwidth this month.'), { n: over.size })) : null,
      ),
      section(t(l('Orçamento mensal da equipe', 'Monthly team budget')),
        h('label', null, t(l('Dólares de hoje (0 = sem limite)', 'Today\'s dollars (0 = no limit)')), ' ',
          h('input', { type: 'number', min: 0, step: 500, value: st.team, style: 'width:8em', onchange: (e: Event) => { st.team = Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) || 0)); rerender(); } })),
        h('p', { class: 'small' }, t(l('Gasto delegado neste mês: {v}', 'Delegated spend this month: {v}'), { v: $(spent) }), st.team ? ` / ${$(money(s, st.team))}` : ''),
        h('p', { class: 'small muted' }, t(l('Vale para ações pagas da agenda e lançamentos automáticos. Carreiras em foco gastam primeiro.', 'Applies to paid agenda actions and automatic releases. Focus careers spend first.'))),
      ),
      section(t(l('Avançar até…', 'Advance until…')), h('p', { class: 'small muted' }, stopSummary(s)), stopForm(s, () => rerender())),
    ),
  );
}

registerArea({ id: 'team', label: l('Equipe e ritmo', 'Team and pacing'), icon: 'contract', key: 't', render: teamArea, badge: (s) => overCapacity(s).size || undefined });

// resumo curto na mesa
registerSection('desk', {
  id: 'team8', order: 40, render: (s) => {
    const last = pace8(s).log.filter((e) => e.k !== 'ag').slice(-4);
    if (!last.length) return null;
    return section(t(l('Equipe: últimas decisões', 'Team: latest decisions')), teamLogList(s, last),
      h('button', { class: 'btn small ghost', onclick: () => { store.area = 'team'; rerender(); } }, ic('contract'), ' ', t(l('Ver tudo em Equipe e ritmo', 'See everything in Team and pacing'))));
  },
});
