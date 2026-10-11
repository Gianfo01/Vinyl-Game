// Rodada 19 (T2 money-b) — página "Mercado de contratos" (Artistas): janela de transferências (vender, emprestar, pegar
// emprestado, pagar cláusula de rival), cláusulas de saída com valor de mercado, empresários totais, brigas de gestão e masters
// presos, casos reais documentados e o histórico.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CLAUSE19, auditCost19, auditMgr19, borrow19, borrowFee19, chron19, deliverJunk19, fireCost19, fireMgr19, lend19, loanFee19, loansOn19, mb19, myClauseActs19, npcClause19, onLoan19, payClause19, recall19, rivalStars19, setClause19, value19, window19, windows19, type Clause19 } from '../../sim/sys/moneyb19';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fm = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const val = (s: GameState, id: string) => why18(s, 'mb19.value', { act: id }, $(value19(s, s.acts[id]).v));

function windowTab(s: GameState): HTMLElement {
  const open = window19(s), mine = myClauseActs19(s), w = windows19(s, 2);
  return h('div', null,
    muted(l('Duas janelas por ano, como no futebol: janeiro e julho–agosto. Nelas os rivais fazem lances pelos seus astros, pagam cláusulas baratas e pegam artistas emprestados; fora delas, só a venda de aperto (caixa no vermelho) acontece.', 'Two windows a year, like football: January and July–August. In them rivals bid for your stars, pay cheap clauses and borrow acts; outside them only the distress sale (cash in the red) happens.')),
    row(pill(open ? t(l('Janela ABERTA', 'Window OPEN')) : t(l('Janela fechada', 'Window closed')), open ? 'good' : ''), ...w.map((x) => pill(fm(l('{m}/{y}', '{m}/{y}'), { m: x.m + 1, y: x.y })))),
    section(t(l('Seu elenco', 'Your roster')), mine.length ? h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Valor', 'Value'), l('Situação', 'Status'), ''].map((x) => h('th', null, T(x)))),
      ...mine.map((a) => { const ln = onLoan19(s, a.id); return h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, val(s, a.id)), h('td', null, ln ? pill(t(l('emprestado (chegou)', 'borrowed (in)')), 'warn') : ''),
        h('td', null, ln ? '' : row(btn(fm(l('Emprestar 1 disco (+{f})', 'Lend 1 record (+{f})'), { f: $(loanFee19(s, a, 'record')) }), () => say(lend19(s, a.id, 'record')), !open),
          btn(fm(l('Emprestar turnê (+{f})', 'Lend a tour (+{f})'), { f: $(loanFee19(s, a, 'tour')) }), () => say(lend19(s, a.id, 'tour')), !open)))); }))
      : muted(l('Nenhum ato com contrato do seu selo.', 'No acts under your label\'s contract.'))),
    section(t(l('Emprestados', 'On loan')), loansOn19(s).length ? h('ul', { class: 'small' }, ...loansOn19(s).map((x) => h('li', null, actLink(s, x.act), ' — ',
      x.from === 'player' ? fm(l('com {b} até a semana {w}', 'with {b} until week {w}'), { b: s.labels[x.to]?.name ?? '?', w: x.end }) : fm(l('de {b}, volta na semana {w}', 'from {b}, returns on week {w}'), { b: s.labels[x.from]?.name ?? '?', w: x.end }),
      ' ', x.from === 'player' ? btn(fm(l('Chamar de volta (multa {p})', 'Recall (penalty {p})'), { p: $(Math.round(x.fee / 2)) }), () => say(recall19(s, x.id))) : null)))
      : muted(l('Ninguém emprestado.', 'Nobody on loan.'))),
    section(t(l('Astros dos rivais', 'Rival stars')), h('table', { class: 'table small' },
      h('tr', null, ...[l('Ato', 'Act'), l('Selo', 'Label'), l('Valor', 'Value'), l('Cláusula', 'Clause'), ''].map((x) => h('th', null, T(x)))),
      ...rivalStars19(s).map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, s.labels[a.owner!]?.name ?? '?'), h('td', null, val(s, a.id)), h('td', null, $(npcClause19(s, a))),
        h('td', null, row(btn(l('Pagar a cláusula', 'Pay the clause'), () => say(payClause19(s, a.id)), !open || s.player.cash < npcClause19(s, a)),
          btn(fm(l('Pegar emprestado ({p})', 'Borrow ({p})'), { p: $(borrowFee19(s, a)) }), () => say(borrow19(s, a.id)), !open || s.player.cash < borrowFee19(s, a)))))))));
}

function clauseTab(s: GameState): HTMLElement {
  const mine = myClauseActs19(s);
  return h('div', null,
    muted(l('Cláusula de saída: preço que um rival paga para levar o artista sem negociar. Barata fideliza (confiança +8) e ajuda a fechar a assinatura, mas convida o rival rico na janela; justa protege; sem cláusula, o artista desconfia. O valor de mercado mostra o porquê.', 'Exit clause: the price a rival pays to take the act without negotiating. Cheap builds loyalty (trust +8) and helps close the signing, but invites the rich rival in the window; fair protects; no clause, the act is wary. Market value shows the why.')),
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
      { id: 'win', label: t(l('Janela', 'Window')), badge: window19(s) ? 1 : undefined, render: () => windowTab(s) },
      { id: 'clause', label: t(l('Cláusulas', 'Clauses')), render: () => clauseTab(s) },
      { id: 'mgr', label: t(l('Empresários', 'Managers')), badge: Object.values(mb19(s).mgr).filter((m) => m.revolt >= 60).length || undefined, render: () => mgrTab(s) },
      { id: 'masters', label: t(l('Gestão e masters', 'Management and masters')), render: () => mastersTab(s) },
      { id: 'hist', label: t(l('Histórico', 'History')), render: () => histTab(s) },
    ], rerender));
}
registerArea({ id: 'contracts19', label: l('Mercado de contratos', 'Contract market'), icon: 'handshake', key: '', render: page, badge: (s) => (window19(s) && s.config.role !== 'artist' ? 1 : undefined) });
