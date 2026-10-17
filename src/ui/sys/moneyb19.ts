// Rodada 19 (T2 money-b) — página "Mercado de contratos" (Artistas): mercado aberto o ano todo (r22: sem janelas nem
// empréstimos; vender, pagar cláusula de rival), cláusulas de saída com valor de mercado, empresários totais, brigas de gestão e masters
// presos, casos reais documentados e o histórico.

import { basisTag31 } from '../r31/lock31';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CLAUSE19, auditCost19, auditMgr19, chron19, deliverJunk19, fireCost19, fireMgr19, mb19, myClauseActs19, npcClause19, payClause19, rivalStars19, setClause19, value19, type Clause19 } from '../../sim/sys/moneyb19';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';
import { freeCash20 } from '../../sim/oblig20';
import { deals29Tab } from './contracts29';
import { specialDeals29 } from '../../sim/sys/contracts29';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false, why?: L) => h('button', { class: 'btn small', disabled: dis, title: dis && why ? T(why) : undefined, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fm = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const val = (s: GameState, id: string) => h('span', null, why18(s, 'mb19.value', { act: id }, $(value19(s, s.acts[id]).v)), ' ', basisTag31('calc')); // R31 (RN-27): valor é cálculo

/** r22: mercado aberto o ano todo (sem janelas) e sem empréstimos de artista. */
function windowTab(s: GameState): HTMLElement {
  const mine = myClauseActs19(s);
  return h('div', null,
    muted(l('O mercado de contratos funciona o ano todo: a qualquer momento um rival pode fazer um lance pelos seus astros ou pagar uma cláusula de saída barata, e você pode pagar a cláusula de um astro rival. No aperto de caixa os lances ficam mais prováveis e mais baixos.', 'The contract market runs all year: at any time a rival may bid for your stars or pay a cheap exit clause, and you may pay a rival star\'s clause. When cash is tight, bids get more likely and lower.')),
    section(t(l('Seu elenco', 'Your roster')), mine.length ? h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Valor de mercado', 'Market value')].map((x) => h('th', null, T(x)))),
      ...mine.map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, val(s, a.id)))))
      : muted(l('Nenhum ato com contrato do seu selo.', 'No acts under your label\'s contract.'))),
    section(t(l('Astros dos rivais', 'Rival stars')), h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Selo', 'Label'), l('Valor', 'Value'), l('Cláusula', 'Clause'), ''].map((x) => h('th', null, T(x)))),
      ...rivalStars19(s).map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, s.labels[a.owner!]?.name ?? '?'), h('td', null, val(s, a.id)), h('td', null, $(npcClause19(s, a))),
        h('td', null, btn(l('Pagar a cláusula', 'Pay the clause'), () => say(payClause19(s, a.id)), freeCash20(s) < npcClause19(s, a), l('Caixa livre menor que a cláusula.', 'Free cash is below the clause.'))))))));
}

function clauseTab(s: GameState): HTMLElement {
  const mine = myClauseActs19(s);
  return h('div', null,
    muted(l('Cláusula de saída: preço que um rival paga para levar o artista sem negociar. Barata fideliza (confiança +8) e ajuda a fechar a assinatura, mas convida o rival rico a pagar e levar; justa protege; sem cláusula, o artista desconfia. O valor de mercado mostra o porquê.', 'Exit clause: the price a rival pays to take the act without negotiating. Cheap builds loyalty (trust +8) and helps close the signing, but invites a rich rival to pay and take them; fair protects; no clause, the act is wary. Market value shows the why.')),
    mine.length ? h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Valor de mercado', 'Market value'), l('Cláusula', 'Clause'), ''].map((x) => h('th', null, T(x)))),
      ...mine.map((a) => { const k = s.contracts[a.contractId!]; const cheap = !!k?.exitFee && k.exitFee < value19(s, a).v * 0.95;
        return h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, val(s, a.id)), h('td', null, k?.exitFee ? pill($(k.exitFee), cheap ? 'bad' : 'good') : '—'),
          h('td', null, row(...(Object.keys(CLAUSE19) as Clause19[]).map((c) => h('span', { title: t(CLAUSE19[c].desc) }, btn(CLAUSE19[c].name, () => say(setClause19(s, a.id, c))))))));
      })) : muted(l('Nenhum ato com contrato do seu selo.', 'No acts under your label\'s contract.')));
}

function mgrTab(s: GameState): HTMLElement {
  const st = mb19(s), band = playerActs(s).map((id) => s.acts[id]).find((a) => a?.playerBand);
  const k = band?.contractId ? s.contracts[band.contractId] : undefined;
  return h('div', null,
    muted(l('O empresário total (Coronel Parker) fica com 25–50% de tudo o que o artista ganha, traz cinema, TV e merch — renda certa para você — mas não deixa o artista tocar fora do país e guarda um segredo. A corda estica: demitir custa 12 meses da parte dele; a auditoria devolve parte do dinheiro e pode expor o segredo.', 'The total manager (Colonel Parker) takes 25–50% of everything the act earns, brings films, TV and merch — steady income for you — but keeps the act from playing abroad and hides a secret. The rope tightens: firing costs 12 months of his cut; an audit returns some money and may expose the secret.')),
    Object.keys(st.mgr).length ? h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Empresário', 'Manager'), l('Parte', 'Cut'), l('Já levou', 'Taken'), l('Revolta', 'Revolt'), ''].map((x) => h('th', null, T(x)))),
      ...Object.entries(st.mgr).map(([id, m]) => h('tr', null, h('td', null, actLink(s, id)), h('td', null, m.name, m.exposed ? pill(t(l('exposto', 'exposed')), 'bad') : null), h('td', null, `${Math.round(m.cut * 100)}%`), h('td', null, $(m.took)),
        h('td', null, pill(String(Math.round(m.revolt)), m.revolt >= 60 ? 'bad' : m.revolt >= 35 ? 'warn' : '')),
        h('td', null, row(btn(fm(l('Auditar ({p})', 'Audit ({p})'), { p: $(auditCost19(s)) }), () => say(auditMgr19(s, id))), btn(fm(l('Demitir ({p})', 'Fire ({p})'), { p: $(fireCost19(s, s.acts[id])) }), () => say(fireMgr19(s, id))))))))
      : muted(l('Nenhum empresário total. As propostas chegam pela Caixa de entrada.', 'No total manager. Offers arrive in the Inbox.')),
    band && k && k.party !== 'player' ? section(t(l('Sua banda e o selo', 'Your band and the label')),
      muted(fm(l('Contrato com {b}: {d}/{o} discos entregues. Entregar um disco de cumprimento (feito para não vender) adianta a saída — o selo engaveta, lança enterrado ou processa.', 'Deal with {b}: {d}/{o} records delivered. Delivering a contract-filler album (made not to sell) speeds up the exit — the label shelves it, buries it or sues.'), { b: s.labels[k.party]?.name ?? '?', d: k.releasesDone, o: k.releasesOwed })),
      btn(l('Entregar disco de cumprimento', 'Deliver a contract-filler album'), () => say(deliverJunk19(s, band.id)), k.releasesOwed <= k.releasesDone)) : null);
}

function mastersTab(s: GameState): HTMLElement {
  const st = mb19(s), tk = Object.entries(st.tk);
  const bands = myClauseActs19(s).filter((a) => a.members.length >= 3);
  return h('div', null,
    muted(l('Quando um administrador (Klein) aparece, a banda vota: cada integrante pesa ambição, segurança e mágoa, e o mais influente (Dinâmica) puxa os amigos. Fechar vende os masters antigos e os prende por 35 anos; brigar contra a maioria racha a banda; exigir unanimidade adia — e deixa a ferida aberta.', 'When a business manager (Klein) shows up, the band votes: each member weighs ambition, security and resentment, and the most influential (Dynamics) pulls friends along. Dealing sells the early masters and locks them for 35 years; fighting the majority splits the band; requiring unanimity delays — and leaves the wound open.')),
    bands.length ? row(...bands.map((a) => why18(s, 'mb19.vote', { act: a.id }, pill(fm(l('{a}: votação', '{a}: vote'), { a: a.name }))))) : null,
    tk.length ? h('ul', { class: 'small' }, ...tk.map(([id, x]) => h('li', null, actLink(s, id), ' — ', fm(l('{n} levou {k} master(s) em {y}; {s}', '{n} took {k} master(s) in {y}; {s}'), { n: x.name, k: x.rels.length, y: x.y, s: x.done ? t(l('já voltaram', 'already back')) : fm(l('presos até {u}', 'locked until {u}'), { u: x.until }) }))))
      : muted(l('Nenhum master preso.', 'No locked masters.')));
}

function histTab(s: GameState): HTMLElement {
  const st = mb19(s), ch = chron19(s);
  return h('div', null,
    section(t(l('Casos reais', 'Real cases')), ch.length ? h('ul', { class: 'small' }, ...ch.map((c) => h('li', null, `${c.y} — ${t(c.t)}`))) : muted(l('Nada ainda nesta época.', 'Nothing yet in this era.')),
      muted(l('No modo "Vida real exata" estes casos aparecem como manchete no mês real; nos outros modos a partida segue história alternativa.', 'In "Exact real life" mode these cases appear as headlines in the real month; in other modes the run follows alternate history.'))),
    section(t(l('Vendas e override', 'Sales and overrides')), st.sold.length ? h('ul', { class: 'small' }, ...st.sold.slice().reverse().map((x) => h('li', null, actLink(s, x.act), ' → ', s.labels[x.lb]?.name ?? '?', ` (${x.y}, ${$(x.price)})`,
      x.pct ? fm(l(' · override {p}% até {u}: {v} recebidos', ' · {p}% override until {u}: {v} received'), { p: Math.round(x.pct * 100), u: x.until, v: $(x.paid) }) : '', x.regret ? pill(t(l('arrependimento', 'regret')), 'bad') : null)))
      : muted(l('Nenhuma venda.', 'No sales.'))),
    section(t(l('Histórico', 'History')), st.log.length ? h('ul', { class: 'small' }, ...st.log.slice().reverse().slice(0, 20).map((x) => h('li', null, t(x.t)))) : muted(l('Nada ainda.', 'Nothing yet.'))));
}

function page(s: GameState): HTMLElement {
  return h('div', null,
    h('h2', null, t(l('Mercado de contratos', 'Contract market'))),
    tabs('contracts19', [
      { id: 'win', label: t(l('Mercado', 'Market')), render: () => windowTab(s) },
      { id: 'clause', label: t(l('Cláusulas', 'Clauses')), render: () => clauseTab(s) },
      { id: 'mgr', label: t(l('Empresários', 'Managers')), badge: Object.values(mb19(s).mgr).filter((m) => m.revolt >= 60).length || undefined, render: () => mgrTab(s) },
      { id: 'masters', label: t(l('Gestão e masters', 'Management and masters')), render: () => mastersTab(s) },
      { id: 'deals29', label: t(l('Acordos especiais', 'Special deals')), badge: specialDeals29(s).filter((r) => r.active).length || undefined, render: () => deals29Tab(s) }, // R29 (contratos+): empresariamento, produção, JV
      { id: 'hist', label: t(l('Histórico', 'History')), render: () => histTab(s) },
    ], rerender));
}
registerArea({ id: 'contracts19', label: l('Mercado de contratos', 'Contract market'), icon: 'handshake', key: '', render: page });
