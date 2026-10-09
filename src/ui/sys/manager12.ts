// Interface do empresário da rodada 12: confiança, ambições, plano de carreira, mandato, equipe,
// prestação de contas, dilema família × turnê, serviços de NPCs, agência (agentes, sucessão, talentos).

import { GENRES, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import {
  AMB_NAME, AREA_NAME, AUTO_NAME, TEAM_NAME, acceptCounter, agencyTier, agentMax, agentSalary, ambitionsOf, answerIssue, arrange, assignAgent, c12, canArrange, capacityHours,
  clashesOf, clientHours, demandHours, devCandidates, endorse, endorseReady, endorseValue, fireAgent, hireAgent, mandateChance, mgr12, negotiateMandate, proposePlan,
  raiseAgent, reinvent, resolveDilemma, setSuccessor, signDev, talk, talkReady, teamCost, toggleTeam, type Amb, type Area, type DilemmaMove, type Mandate, type TeamRole,
} from '../../sim/sys/manager12';
import { SVC, askChance, isForeign, providers, quote, remaining, services, type SvcKind } from '../../sim/sys/services12';
import { ventures, type Client } from '../../sim/sys/ventures9';
import { $, actLink, cityName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { fameText } from '../../sim/sys/fame15';

const res = (x: { ok: boolean; text: L }) => { toast(t(x.text), x.ok ? 'good' : 'bad'); rerender(); };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const btn = (label: L, fn: () => void, cls = 'btn small', dis = false, title?: L) => h('button', { class: cls, disabled: dis, title: title ? t(title) : undefined, onclick: fn }, t(label));
const AMBS: Amb[] = ['money', 'recognition', 'genre', 'family', 'international', 'art'];
const AREAS: Area[] = ['recordings', 'shows', 'endorsements', 'international'];
const KINDS: SvcKind[] = ['label', 'producer', 'studio', 'booking', 'festival', 'media'];

/** Bloco da rodada 12 em cada agenciado. */
export function clientPanel12(s: GameState, c: Client): HTMLElement {
  const r = rngOf(s);
  const a = s.acts[c.actId];
  const x = c12(s, c.actId);
  const amb = ambitionsOf(s, a.id);
  const goals = new Set<Amb>(x.plan?.goals.map((g) => g.k) ?? []);
  let target = GENRES.find((g) => g.id !== a.genre && g.born <= s.year)?.id ?? a.genre;
  const m: Omit<Mandate, 'until'> = { areas: x.mandate.areas.slice(), rate: x.mandate.rate, excl: x.mandate.excl, auto: x.mandate.auto };
  const chance = h('span', { class: 'muted small' });
  const upd = () => (chance.textContent = `${t(l('chance', 'chance'))} ${pct(mandateChance(s, a.id, m))}`);
  upd();
  const ag = mgr12(s).agents;
  return h('details', { class: 'mgr12' },
    h('summary', null, t(l('Confiança', 'Trust')), ' ', bar(x.trust), ` ${Math.round(x.trust)} · ${clientHours(s, a.id)}h/${t(l('mês', 'mo'))}`,
      x.issue ? pill(t(l('problema', 'issue')), 'bad') : null, x.dilemma ? pill(t(l('dilema', 'dilemma')), 'warn') : null, x.dev ? pill(t(l('aposta', 'prospect')), '') : null),
    // ambições
    h('div', { class: 'small' }, t(l('Ambições do artista', 'Act\'s ambitions')), ': ',
      x.known ? h('b', null, amb.map((k) => t(AMB_NAME[k])).join(' · ')) : h('span', { class: 'muted' }, t(l('desconhecidas — converse primeiro', 'unknown — talk first'))), ' ',
      btn(l('Conversar', 'Talk'), () => res(talk(s, a.id)), 'btn tiny', !talkReady(s, a.id))),
    // dilema
    x.dilemma ? h('div', { class: 'card warn' },
      h('p', { class: 'small' }, t(l('Turnê internacional de {v} para {a}. Mas existe a promessa de tempo com a família. O que você faz?', 'International tour worth {v} for {a}. But there is the promise of family time. What do you do?'), { v: $(x.dilemma.gross), a: a.name })),
      h('div', { class: 'row wrap' }, ...([
        ['full', l('Turnê inteira', 'Full tour'), l('100% do dinheiro; quebra a promessa (−18, lembrado)', '100% of the money; breaks the promise (−18, remembered)')],
        ['fewer', l('Menos datas', 'Fewer dates'), l('40% do dinheiro; promessa mantida (+4)', '40% of the money; promise kept (+4)')],
        ['other', l('Patrocínio no lugar', 'Endorsement instead'), l('30% do dinheiro sem viajar (+2; exige patrocínios no mandato)', '30% of the money without travel (+2; needs endorsements in the mandate)')],
        ['pressure', l('Pressionar', 'Push them'), l('100%; −8 e pesa na renovação (exige confiança 60+)', '100%; −8 and weighs on renewal (needs trust 60+)')],
        ['decline', l('Recusar', 'Decline'), l('nada de dinheiro (+1)', 'no money (+1)')],
      ] as [DilemmaMove, L, L][]).map(([k, n, d]) => btn(n, () => res(resolveDilemma(s, a.id, k)), k === 'decline' ? 'btn small ghost' : 'btn small', false, d)))) : null,
    // prestação de contas
    x.issue ? h('div', { class: 'row wrap small' }, pill(t(l('problema', 'issue')), 'bad'), ' ', t(x.issue.t), ' ',
      btn(l('Explicar ao artista', 'Explain to the act'), () => res(answerIssue(s, a.id, 'explain')), 'btn tiny primary', false, l('Custa pouca confiança agora (menos se o plano foi seguido).', 'Costs a little trust now (less if the plan was followed).')),
      btn(l('Esconder', 'Hide it'), () => res(answerIssue(s, a.id, 'hide')), 'btn tiny ghost', false, l('Nada agora; se descobrir, −15.', 'Nothing now; if found out, −15.'))) : null,
    // plano
    h('div', { class: 'small' }, h('b', null, t(l('Plano de carreira', 'Career plan'))), ' ',
      x.plan ? h('span', null, x.plan.goals.map((g) => `${g.done ? '✓' : '·'} ${t(AMB_NAME[g.k])}`).join('  '), h('span', { class: 'muted' }, ` · ${t(l('passos', 'steps'))} ${x.plan.steps} · ${t(l('revisão na semana', 'review at week'))} ${x.plan.w + 52}${x.plan.broken ? ` · ${t(l('plano quebrado', 'plan broken'))}` : ''}`))
        : h('span', { class: 'muted' }, t(l('sem plano — sem plano, fracassos não são perdoados', 'no plan — without one, failures are not forgiven'))),
      x.plan?.target && a.genre !== x.plan.target ? btn(l('Reinventar agora', 'Reinvent now'), () => res(reinvent(s, a.id)), 'btn tiny') : null),
    h('div', { class: 'row wrap small' }, ...AMBS.map((k) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: goals.has(k), onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) goals.add(k); else goals.delete(k); } }),
      t(AMB_NAME[k]), x.known && amb.includes(k) ? ' ★' : '')),
      select<string>(target, GENRES.filter((g) => g.born <= s.year && g.id !== a.genre).map((g) => ({ value: g.id, label: t(g.name) })), (v) => (target = v), { title: t(l('Gênero novo (meta de mudar de gênero)', 'New genre (change-genre goal)')) }),
      btn(l('Propor plano', 'Propose plan'), () => { const gs = [...goals]; const cl = clashesOf(gs); if (cl.length) toast(t(l('Metas em conflito: {x}', 'Clashing goals: {x}'), { x: cl.map((q) => t(q[2])).join('; ') }), 'warn'); res(proposePlan(s, a.id, gs, target)); })),
    // mandato
    h('div', { class: 'row wrap small' }, h('b', null, t(l('Mandato', 'Mandate'))), ' ',
      x.mandate.legacy ? pill(t(l('informal', 'informal')), 'warn') : null,
      ...AREAS.map((k) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.areas.includes(k), onchange: (e: Event) => { m.areas = (e.target as HTMLInputElement).checked ? [...m.areas, k] : m.areas.filter((y) => y !== k); upd(); } }), t(AREA_NAME[k]))),
      select<number>(m.rate, [0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25].map((v) => ({ value: v, label: pct(v) })), (v) => { m.rate = v; upd(); }),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: m.excl, onchange: (e: Event) => { m.excl = (e.target as HTMLInputElement).checked; upd(); } }), t(l('exclusivo', 'exclusive'))),
      select<number>(m.auto, AUTO_NAME.map((n, i) => ({ value: i, label: t(n) })), (v) => { m.auto = v as 0 | 1 | 2; upd(); }),
      chance, btn(l('Negociar mandato', 'Negotiate mandate'), () => res(negotiateMandate(s, r, a.id, m)), 'btn tiny primary'),
      h('span', { class: 'muted' }, ` ${t(l('vence na semana', 'expires week'))} ${x.mandate.until}`)),
    // equipe
    h('div', { class: 'row wrap small' }, h('b', null, t(l('Equipe', 'Team'))), ' ',
      ...(['pub', 'law', 'book'] as TeamRole[]).map((k) => h('label', { class: 'check', title: t({ pub: l('Amortece crises; melhora campanhas na mídia.', 'Softens crises; better media campaigns.'), law: l('+8% nas negociações de mandato.', '+8% on mandate negotiations.'), book: l('Melhores condições com agências e festivais.', 'Better terms with bookers and festivals.') }[k]) },
        h('input', { type: 'checkbox', checked: !!x.team[k], onchange: () => res(toggleTeam(s, a.id, k)) }), `${t(TEAM_NAME[k])} (${$(teamCost(s, k))}/${t(l('mês', 'mo'))})`)),
      ag.length ? select<string>(x.agent ?? '', [{ value: '', label: t(l('— você cuida —', '— you handle it —')) }, ...ag.map((g) => ({ value: g.id, label: g.name }))], (v) => res(assignAgent(s, a.id, v || undefined))) : null,
      x.agent ? h('span', { class: 'muted' }, ` ${t(l('vínculo com o agente', 'bond with agent'))} ${Math.round(x.bond)}`) : null),
    h('div', { class: 'row wrap small' },
      btn(l('Fechar patrocínio', 'Close an endorsement'), () => res(endorse(s, a.id)), 'btn tiny', !endorseReady(s, a.id) || !x.mandate.areas.includes('endorsements'), fmtTitle(s, a.id))),
    // serviços
    servicesForm(s, a.id),
    x.promises.length ? h('ul', { class: 'small' }, x.promises.slice(-3).map((p) => h('li', { class: p.kept === false ? 'bad' : p.kept ? 'good' : '' }, t(p.t), ' ', p.kept === false ? t(l('(quebrada)', '(broken)')) : p.kept ? t(l('(cumprida)', '(kept)')) : t(l('(em aberto)', '(open)'))))) : null,
    x.book.length ? h('details', { class: 'small' }, h('summary', null, t(l('Prestação de contas', 'Accountability log'))), h('ul', null, x.book.slice().reverse().map((y) => h('li', null, t(y))))) : null,
  );
}
const fmtTitle = (s: GameState, id: string): L => ({ pt: `≈ $${Math.round(endorseValue(s, s.acts[id]) / 100).toLocaleString()}`, en: `≈ $${Math.round(endorseValue(s, s.acts[id]) / 100).toLocaleString()}` });

function servicesForm(s: GameState, id: string): HTMLElement {
  const r = rngOf(s);
  const a = s.acts[id];
  const x = c12(s, id);
  let kind: SvcKind = a.owner ? 'producer' : 'label';
  const list = h('div');
  const draw = () => {
    const ps = providers(s, kind).sort((p, q) => q.q - p.q).slice(0, 6);
    list.replaceChildren(h('table', { class: 'tbl compact' }, h('tbody', null, ps.map((p) => {
      const q = quote(s, p, a);
      let amt = q;
      const inp = h('input', { type: 'number', value: Math.round(q / 100), step: 50, style: 'width:6em', oninput: (e: Event) => { amt = Math.round(Number((e.target as HTMLInputElement).value) * 100); ch.textContent = pct(askChance(s, p, a, amt, `mgr:${id}`)); } }) as HTMLInputElement;
      const ch = h('span', { class: 'muted' }, pct(askChance(s, p, a, amt, `mgr:${id}`)));
      const err = canArrange(s, id, p.id);
      return h('tr', null, h('td', null, p.name, isForeign(s, a, p) ? ` 🌐` : '', h('div', { class: 'muted' }, `${cityName(p.city)} · ${t(l('qualidade', 'quality'))} ${p.q} · ${t(l('vagas', 'slots'))} ${remaining(s, p)}/${p.cap}`)),
        h('td', null, `${t(SVC[kind].pays ? l('pede', 'ask') : l('oferta', 'offer'))} $`, inp, ' ', ch),
        h('td', null, err ? h('span', { class: 'muted' }, t(err)) : h('button', { class: 'btn tiny primary', disabled: !remaining(s, p), onclick: () => { const k = arrange(s, r, id, p.id, amt); toast(t(k.text), k.status === 'accepted' ? 'good' : k.status === 'counter' ? 'warn' : 'bad'); rerender(); } }, t(SVC[kind].verb))));
    }))));
  };
  draw();
  return h('div', { class: 'small' }, h('b', null, t(l('Mercado de serviços', 'Services market'))), ' ',
    select<SvcKind>(kind, KINDS.filter((k) => SVC[k].from <= s.year).map((k) => ({ value: k, label: t(SVC[k].name) })), (k) => { kind = k; draw(); }),
    h('span', { class: 'muted' }, ` ${t(SVC[kind].pays ? l('(eles pagam o artista; você leva comissão se a área estiver no mandato)', '(they pay the act; you take commission if the area is in the mandate)') : l('(o artista paga; se não tiver, você adianta)', '(the act pays; if short, you front it)'))}`),
    x.counter ? h('div', null, pill(t(l('contraproposta', 'counteroffer')), 'warn'), ` ${$(x.counter.price)} `, btn(l('Aceitar', 'Accept'), () => res(acceptCounter(s, r, id)), 'btn tiny primary')) : null,
    list);
}

// ---------------------------------------------------------------- abas da gestão

function agencyTab(s: GameState): HTMLElement {
  const st = mgr12(s);
  const mg = ventures(s).mg;
  const r = rngOf(s);
  const cap = capacityHours(s);
  const dem = demandHours(s);
  return h('div', null,
    section(`${t(agencyTier(s))} · ${t(l('prestígio', 'prestige'))} ${st.prestige}`,
      h('p', { class: 'small' }, t(l('Horas do mês: {d} de {c}. Poucos clientes = atenção pessoal (+confiança); muitos clientes pedem equipe e agentes, senão a confiança cai.', 'Hours this month: {d} of {c}. Few clients = personal attention (+trust); many clients need a team and agents, or trust falls.'), { d: dem, c: cap })),
      bar(Math.min(100, (dem / cap) * 100)),
      h('p', { class: 'small muted' }, t(l('Prestígio vem de carreiras longas (5+ anos com você), clientes confiantes e talentos que você descobriu ({n}).', 'Prestige comes from long careers (5+ years with you), trusting clients and talents you discovered ({n}).'), { n: st.devHits }))),
    section(`${t(l('Agentes', 'Agents'))} ${st.agents.length}/${agentMax(s)}`,
      h('p', { class: 'small muted' }, t(l('Cada agente cuida de até 4 clientes ({v}/mês). Agente desleal pode sair levando os clientes que confiam mais nele que em você.', 'Each agent handles up to 4 clients ({v}/mo). A disloyal agent may leave with clients who trust them more than you.'), { v: $(agentSalary(s)) })),
      st.agents.map((g) => h('div', { class: 'row wrap small' }, h('b', null, g.name), ` ${t(l('talento', 'skill'))} ${g.skill} · ${t(l('lealdade', 'loyalty'))} `, bar(g.loyalty), ` ${Math.round(g.loyalty)}`,
        st.successor === g.id ? pill(t(l('sucessor', 'successor')), 'good') : btn(l('Preparar como sucessor', 'Groom as successor'), () => { setSuccessor(s, g.id); rerender(); }, 'btn tiny'),
        btn(l('Bônus', 'Bonus'), () => res(raiseAgent(s, g.id)), 'btn tiny'), btn(l('Demitir', 'Fire'), () => { fireAgent(s, g.id); rerender(); }, 'btn tiny ghost'))),
      btn(l('Contratar agente', 'Hire an agent'), () => res(hireAgent(s)), 'btn small primary', st.agents.length >= agentMax(s)),
      !st.successor ? h('p', { class: 'small bad' }, t(l('Sem sucessor: se você sair de cena, os clientes perdem a confiança.', 'No successor: if you leave the stage, clients lose trust.'))) : null),
    st.alumni.length ? section(t(l('Ex-funcionários', 'Former staff')), h('ul', { class: 'small' }, st.alumni.slice().reverse().map((x) => h('li', null, `${x.y}: ${x.name}${x.took.length ? ` → ${x.took.map((id) => s.acts[id]?.name ?? '?').join(', ')}` : ''}`)))) : null,
    section(t(l('Desenvolver talentos', 'Develop new talent')),
      h('p', { class: 'small muted' }, t(l('Desconhecidos (fama < 8): pouco dinheiro agora, muita confiança. Se um chegar a fama 30, a descoberta é sua (+prestígio).', 'Unknowns (fame < 8): little money now, lots of trust. If one reaches fame 30, the discovery is yours (+prestige).'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, devCandidates(s).map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, `${t(l('fama', 'fame'))} ${fameText(s, a.id)} · ${t(l('momento', 'momentum'))} ${Math.round(a.momentum)}`),
        h('td', null, btn(l('Apostar', 'Bet on them'), () => res(signDev(s, r, a.id)), 'btn tiny primary'))))))),
    mg.clients.length ? null : h('p', { class: 'muted' }, t(l('Sem clientes ainda.', 'No clients yet.'))),
  );
}

function contractsTab(s: GameState): HTMLElement {
  const st = services(s);
  const rows = st.contracts.slice().reverse().slice(0, 30);
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Contratos com empresas de terceiros: cada uma tem vagas limitadas por mês, pode contrapropor e às vezes fura. Cumpridos: {d} · quebrados: {b}.', 'Contracts with third-party companies: each has limited monthly slots, may counter and sometimes fails. Delivered: {d} · broken: {b}.'), { d: st.done, b: st.broken })),
    h('table', { class: 'tbl compact' }, h('tbody', null, rows.map((c) => h('tr', null, h('td', null, actLink(s, c.actId)), h('td', null, `${t(SVC[c.kind].name)}: ${c.pname}`), h('td', null, $(c.price)),
      h('td', null, pill(t(c.status === 'open' ? l('em andamento', 'open') : c.status === 'done' ? l('entregue', 'done') : l('quebrado', 'broken')), c.status === 'broken' ? 'bad' : c.status === 'done' ? 'good' : '')),
      h('td', { class: 'small muted' }, c.note ? t(c.note) : `${t(l('semana', 'week'))} ${c.due}`))))));
}

/** Abas extras da Gestão de artistas. */
export function managementTabs12(s: GameState): { id: string; label: string; icon: string; render: () => HTMLElement }[] {
  return [
    { id: 'agency12', label: t(l('Agência', 'Agency')), icon: 'building', render: () => agencyTab(s) },
    { id: 'services12', label: t(l('Serviços', 'Services')), icon: 'handshake', render: () => contractsTab(s) },
  ];
}
