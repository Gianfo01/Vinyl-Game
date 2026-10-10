// Rodada 18 (artist18): páginas "Contratos do artista" (propostas de selos NPC, seu contrato, extrato com prestações de
// contas, equipe — empresário, agente, editora —, faça-você-mesmo × selo) e "Sociedades" (empresas com sócios NPC,
// votos, briga; divisão da banda; conflito de interesse do híbrido).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import {
  a18, accept18, advice18, ASK18, audit18, auditBlock18, auditCost18, band18, breach18, counter18, counterOdds18, decline18, diy18, fireAgent18, fireMgr18, hireLawyer18, hon18,
  ctx18, interest18, lawyerCost18, leave18, leaveCost18, on18, openOffers18, PTYPE18, reneg18, renegBlock18, renegOdds18, sue18, testi18, value18, votes18, warn18, type Ask18, type Offer18,
} from '../../sim/sys/artist18';
import {
  buyOut18, buyOutPrice18, capOf18, styleOf18, dissolve18, found18, foundOdds18, hybrid18, partners18, PROP18, SELF18, sellStake18, setSelf18, setSplit18, sh18, SPLIT18, STYLE18, value18v, vote18, VKIND18,
  type Prop18, type VKind18,
} from '../../sim/sys/shared18';
import { acceptDeal, declineDeal } from '../../sim/brands';
import { rngOf } from '../../sim/util';
import { $, actLink, labelLink, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea } from '../registry';
import { tabs } from '../vis';
import { why18 } from '../explain18';
import { confirm18, emptyState18 } from '../quick18';

const muted = (x: L) => h('p', { class: 'muted small' }, t(x));
const say = (x: { ok: boolean; text: L } | L | null, ok?: L) => {
  if (x === null) { if (ok) toast(t(ok), 'good'); }
  else if ('ok' in (x as object) && 'text' in (x as object)) { const r = x as { ok: boolean; text: L }; toast(t(r.text), r.ok ? 'good' : 'bad'); }
  else toast(t(x as L), 'info');
  rerender();
};
const pc = (v: number) => `${Math.round(v * 100)}%`;
const btn = (label: L, fn: () => void, cls = 'btn small', title?: L, dis?: boolean) => h('button', { class: cls, onclick: fn, title: title ? t(title) : undefined, disabled: dis || undefined }, t(label));
const KIND: Record<string, L> = { record: l('Contrato de gravação', 'Record deal'), dist: l('Distribuição (P&D)', 'Distribution (P&D)'), dev: l('Desenvolvimento', 'Development'), buyout: l('Compra do seu contrato', 'Contract buyout'), reneg: l('Renegociação', 'Renegotiation'), mgr: l('Empresário', 'Manager'), agent: l('Agente de shows', 'Booking agent'), pub: l('Editora', 'Publisher') };
const ASKS: Ask18[] = ['adv', 'roy', 'master', 'audit', 'term', 'promo', 'control'];
const UI = { ask: {} as Record<string, Ask18>, kind: 'label' as VKind18, pk: '', eq: 0.5, prop: {} as Record<string, Prop18> };

// ---------------------------------------------------------------- propostas

function terms(s: GameState, o: Offer18): HTMLElement {
  const k = o.k18;
  const adv = advice18(s);
  const q = (x: string, hid: number) => (hid > adv ? '?' : x);
  const rows: [L, string][] = o.k === 'dev'
    ? [[l('Mesada', 'Stipend'), `${$(o.stip ?? 0)}/${t(l('mês', 'mo'))} × 12`], [l('Opção', 'Option'), t(l('o selo decide se contrata', 'the label decides whether to sign you'))]]
    : [
      [l('Adiantamento', 'Advance'), $(o.adv)], [l('Fundo de gravação', 'Recording fund'), $(o.fund)],
      [o.model === 'distribution' ? l('Fica com vocês', 'You keep') : l('Royalty', 'Royalty'), pc(o.roy)],
      [l('Base do royalty', 'Royalty base'), q(k ? t(k.base === 'retail' ? l('varejo (− embalagem)', 'retail (− packaging)') : k.base === 'wholesale' ? l('atacado', 'wholesale') : l('receita líquida', 'net receipts')) : '—', 1)],
      [l('Recuperável', 'Recoupable'), q(k ? `${t(l('gravação', 'recording'))} ${pc(k.rec)}${k.video ? ', ' + t(l('clipe', 'video')) : ''}${k.tour ? ', ' + t(l('turnê', 'tour')) : ''}${k.mkt ? `, mkt ${pc(k.mkt)}` : ''} · ${t(k.cross ? l('cruzado', 'cross-coll.') : l('por projeto', 'per project'))}` : '—', 1)],
      [l('Prazo', 'Term'), `${Math.round(o.term / 12 * 10) / 10} ${t(l('anos', 'yrs'))} · ${o.albums} ${t(l('discos', 'records'))} · ${q(String(o.opts), 1)} ${t(l('opções', 'options'))}`],
      [l('Master', 'Master'), t(o.master === 'artist' ? l('seu', 'yours') : o.master === 'shared' ? l('dividido', 'shared') : o.rev ? l('do selo (volta depois)', 'label\'s (reverts later)') : l('do selo para sempre', 'label\'s forever'))],
      [l('360', '360'), o.s360 ? pc(o.s360) : '—'], [l('Território', 'Territory'), t(o.scope === 'world' ? l('mundo', 'world') : o.scope === 'region' ? l('região', 'region') : l('seu país', 'home'))],
      [l('Estúdio', 'Studio'), t(o.ar === 'artist' ? l('vocês decidem', 'you decide') : o.ar === 'joint' ? l('conjunto', 'joint') : l('o selo decide', 'label decides'))],
      [l('Contas', 'Statements'), q(k ? `${t(k.stmt === 'q' ? l('trimestrais', 'quarterly') : k.stmt === 's' ? l('semestrais', 'semiannual') : l('anuais', 'yearly'))} +${k.lag}m${k.audit ? ' · ' + t(l('auditoria', 'audit')) : ''}` : '—', 1)],
    ];
  if (o.k === 'buyout') rows.unshift([l('Paga ao seu selo', 'Pays your label'), $(o.fee ?? 0)]);
  return h('table', { class: 'small' }, h('tbody', null, rows.map(([a, b]) => h('tr', null, h('td', { class: 'muted' }, t(a)), h('td', null, b)))));
}
function offerCard(s: GameState, o: Offer18): HTMLElement {
  const { v, seen } = value18(s, o);
  const adv = advice18(s);
  const vote = o.k === 'reneg' ? [] : votes18(s, o);
  const no = vote.filter((x) => !x.yes).length;
  const w = warn18(s, o);
  const odds = counterOdds18(s, o);
  const ask = UI.ask[o.id] ?? 'adv';
  return h('div', { class: 'card' },
    h('div', { class: 'row wrap between' },
      h('div', { class: 'row wrap' }, s.labels[o.lb] ? h('b', null, labelLink(s, o.lb)) : h('b', null, o.who), ' ', pill(t(KIND[o.k])), o.bid ? pill(t(l('leilão', 'bidding war')), 'gold') : null, o.pred && adv ? pill(t(l('predatória', 'predatory')), 'bad') : null, o.low && adv ? pill(t(l('abaixo do mercado', 'lowball')), 'warn') : null),
      h('span', { class: 'small' }, t(l('Nota para vocês: ', 'Score for you: ')), why18(s, 'artist18.offer', { o: o.id }, h('b', null, String(Math.round((adv ? v : seen) * 100)))), ' · ', t(l('vence em ', 'expires in ')), `${Math.max(0, o.until - s.week)} ${t(l('sem.', 'wk'))}`)),
    o.why.length ? muted(fmtList(l('Por que querem vocês: ', 'Why they want you: '), o.why)) : null,
    terms(s, o),
    w ? h('p', { class: 'small bad' }, t(w)) : null,
    s.labels[o.lb] ? h('details', { class: 'small' }, h('summary', null, t(l('O que dizem do selo', 'What people say about the label')), adv === 2 ? ` · ${t(l('honestidade', 'honesty'))} ~${Math.round(hon18(s, o.lb) * 10)}/10` : ''), h('ul', null, testi18(s, o.lb).map((x) => h('li', null, t(x))))) : null,
    vote.length ? h('div', { class: 'small' }, t(l('Banda: ', 'Band: ')), ...vote.map((x) => h('span', { class: x.yes ? 'good' : 'bad', title: t(x.why) }, `${x.name} ${x.yes ? '✓' : '✗'} `)), no * 2 > vote.length ? h('span', { class: 'warn' }, t(l('— maioria contra', '— majority against'))) : null) : null,
    h('div', { class: 'row wrap' },
      btn(l('Aceitar', 'Accept'), () => { const r = accept18(s, o.id); if (!r.ok && r.vote) confirm18(l('A banda votou contra', 'The band voted no'), r.text, l('Assinar mesmo assim', 'Sign anyway'), () => say(accept18(s, o.id, true))); else say(r); }, 'btn small primary'),
      o.k !== 'reneg' ? select(ask, ASKS.map((x) => ({ value: x, label: t(ASK18[x]) })), (x) => { UI.ask[o.id] = x; rerender(); }) : null,
      o.k !== 'reneg' ? btn(fmtL2(l('Contrapropor ({p}%)', 'Counter ({p}%)'), { p: Math.round(odds.p * 100) }), () => say(counter18(s, o.id, ask)), 'btn small', l(odds.why.map((x) => x.pt).join(' · ') || 'Chance base', odds.why.map((x) => x.en).join(' · ') || 'Base chance')) : null,
      !adv ? btn(fmtL2(l('Advogado ({c})', 'Lawyer ({c})'), { c: $(lawyerCost18(s)) }), () => say(hireLawyer18(s), l('Advogado contratado: as letras miúdas aparecem.', 'Lawyer hired: the fine print shows up.')), 'btn small ghost') : null,
      btn(l('Recusar', 'Decline'), () => { decline18(s, o.id); rerender(); }, 'btn small ghost')));
}
const fmtList = (pre: L, xs: L[]): L => ({ pt: pre.pt + xs.map((x) => x.pt).join(', ') + '.', en: pre.en + xs.map((x) => x.en).join(', ') + '.' });
const fmtL2 = (x: L, p: Record<string, string | number>): L => ({ pt: x.pt.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? '')), en: x.en.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? '')) });

function offersTab(s: GameState): HTMLElement {
  const a = band18(s);
  if (!a) return emptyState18(l('Sem banda', 'No band'), l('Esta página é da carreira de artista: monte sua banda no início do jogo.', 'This page belongs to the artist career: form your band at game start.'));
  const st = a18(s);
  const open = openOffers18(s).filter((o) => o.k === 'record' || o.k === 'dist' || o.k === 'dev' || o.k === 'buyout' || o.k === 'reneg');
  const cx = ctx18(s, a);
  const watch = Object.values(s.labels).filter((x) => x.active && x.founded <= s.year).map((lb) => ({ lb, i: interest18(s, lb, a, cx) })).sort((x, y) => y.i.v - x.i.v).slice(0, 6);
  const past = st.offers.filter((o) => o.st !== 'open' && (o.k === 'record' || o.k === 'dist' || o.k === 'buyout')).slice(0, 8);
  return h('div', null,
    st.dev ? h('p', { class: 'small warn' }, t(fmtL2(l('Contrato de desenvolvimento com {b}: mesada {m}/mês; exclusividade até a decisão deles.', 'Development deal with {b}: {m}/month stipend; exclusive until they decide.'), { b: s.labels[st.dev.lb]?.name ?? '?', m: $(st.dev.stip) }))) : null,
    open.length ? h('div', null, open.map((o) => offerCard(s, o))) : emptyState18(l('Nenhuma proposta na mesa', 'No offers on the table'), l('Selos observam fama, fama na sua terra, embalo, habilidade e o último disco. Shows e um bom lançamento chamam atenção; um empresário leva vocês às portas.', 'Labels watch fame, home fame, momentum, skill and your last record. Gigs and a good release get attention; a manager opens doors.')),
    section(t(l('Quem está de olho em vocês', 'Who is watching you')),
      h('table', { class: 'small' }, h('tbody', null, watch.map(({ lb, i }) => h('tr', null, h('td', null, labelLink(s, lb.id)), h('td', null, bar(i.v * 100), ` ${Math.round(i.v * 100)}%`), h('td', { class: 'muted' }, i.why.map((x) => t(x)).join(', ') || '—'))))),
      muted(l('Interesse acima de ~30% começa a gerar propostas; entre 20% e 35% podem convidar para showcase.', 'Interest above ~30% starts producing offers; between 20% and 35% they may invite you to a showcase.'))),
    past.length ? section(t(l('Propostas anteriores', 'Past offers')), h('ul', { class: 'small' }, past.map((o) => h('li', null, `${o.who} — ${t(KIND[o.k])} — ${$(o.adv)} — `, t(o.st === 'acc' ? l('aceita', 'accepted') : o.st === 'gone' ? l('retirada/fechada', 'withdrawn/closed') : o.st === 'exp' ? l('venceu', 'expired') : l('recusada', 'declined')))))) : null);
}

// ---------------------------------------------------------------- contrato

function dealTab(s: GameState): HTMLElement {
  const st = a18(s), d = st.deal, a = band18(s);
  if (!a) return emptyState18(l('Sem banda', 'No band'), l('Carreira de artista apenas.', 'Artist career only.'));
  const past = st.past.map((p) => h('li', null, `${s.labels[p.lb]?.name ?? p.lb}: `, t(p.why), ` · ${t(l('royalty', 'royalty'))} ${pc(p.roy)} · ${t(l('master', 'master'))} ${t(p.back ? l('de volta', 'returned') : p.master === 'artist' ? l('seu', 'yours') : p.rev ? fmtL2(l('volta {y}', 'back {y}'), { y: Math.floor(s.year + (p.to + p.rev * 52 - s.week) / 52) }) : l('do selo', 'label\'s'))}${p.bal ? ` · ${t(l('a recuperar', 'unrecouped'))} ${$(p.bal)}` : ''}`));
  if (!d) return h('div', null,
    emptyState18(l('Vocês são independentes', 'You are independent'), l('Lançam por conta própria (agregador/distribuidor), ficam com o master e pagam fabricação e divulgação. Compare com as propostas na aba "Faça você mesmo × selo".', 'You release on your own (aggregator/distributor), keep the master and pay manufacturing and promotion. Compare with offers in the "DIY vs label" tab.')),
    past.length ? section(t(l('Contratos anteriores', 'Past deals')), h('ul', { class: 'small' }, past)) : null,
    logList(s));
  const c = s.contracts[d.cid];
  const k = c?.clauses18;
  const br = breach18(s);
  const ab = auditBlock18(s), rb = renegBlock18(s);
  return h('div', null,
    section(t(fmtL2(l('Contrato com {b}', 'Deal with {b}'), { b: s.labels[d.lb]?.name ?? d.lb })),
      h('div', { class: 'row wrap small' }, labelLink(s, d.lb), ' ', pill(`${t(l('desde', 'since'))} ${Math.floor(s.year - (s.week - d.since) / 52)}`), ' ', c ? pill(`${t(l('vence', 'ends'))} ~${Math.floor(s.year + (c.endWeek - s.week) / 52)}`) : null, ' ', c ? pill(`${c.releasesDone}/${c.releasesOwed} ${t(l('discos', 'records'))}`) : null, ' ', c?.options ? pill(`${c.options} ${t(l('opções', 'options'))}`) : null),
      h('div', { class: 'small' }, t(l('Prioridade de vocês no selo: ', 'Your priority at the label: ')), bar(d.prio), ` ${Math.round(d.prio)}/100`),
      muted(l('Prioridade alta = mais divulgação e apoio; baixa = disco adiado ou "enterrado", pressão do A&R e risco de dispensa. Sobe com fama, sucesso e adiantamento recuperado; cai com brigas, recusas e fusões.', 'High priority = more promotion and support; low = delayed or "buried" records, A&R pressure and risk of being dropped. Rises with fame, hits and recouping; falls with clashes, refusals and mergers.')),
      c ? h('table', { class: 'small' }, h('tbody', null,
        h('tr', null, h('td', { class: 'muted' }, t(l('Royalty', 'Royalty'))), h('td', null, pc(c.royalty))),
        h('tr', null, h('td', { class: 'muted' }, t(l('A recuperar', 'Unrecouped'))), h('td', null, $(Math.max(0, c.recoupBalance)))),
        h('tr', null, h('td', { class: 'muted' }, t(l('Fundo de gravação restante', 'Recording fund left'))), h('td', null, $(d.fund))),
        h('tr', null, h('td', { class: 'muted' }, t(l('360', '360'))), h('td', null, d.s360 ? pc(d.s360) : '—')),
        h('tr', null, h('td', { class: 'muted' }, t(l('Contas', 'Statements'))), h('td', null, k ? `${k.stmt === 'q' ? 'Q' : k.stmt === 's' ? 'S' : 'A'} +${k.lag}m${k.audit ? ' · ' + t(l('auditoria', 'audit')) : ''}` : '—')),
        d.demand ? h('tr', null, h('td', { class: 'muted bad' }, t(l('A&R cobra disco até', 'A&R wants a record by'))), h('td', null, `~${Math.max(0, Math.round((d.demand - s.week) / 4.33))} ${t(l('meses', 'months'))}`)) : null)) : null),
    section(t(l('O que vocês podem fazer', 'What you can do')),
      h('div', { class: 'row wrap' },
        btn(fmtL2(l('Auditar os livros ({c})', 'Audit the books ({c})'), { c: $(auditCost18(s)) }), () => say(audit18(s)), 'btn small', ab ?? l('Acha royalties "arredondados" pelo selo; sem cláusula de auditoria custa mais.', 'Finds royalties "rounded down" by the label; without an audit clause it costs more.'), !!ab),
        btn(fmtL2(l('Renegociar ({p}%)', 'Renegotiate ({p}%)'), { p: Math.round(renegOdds18(s) * 100) }), () => say(reneg18(s)), 'btn small', rb ?? l('Royalty +2–4 pontos e bônus; o selo estica o prazo.', 'Royalty +2–4 points and a bonus; the label extends the term.'), !!rb),
        btn(fmtL2(l('Comprar a saída ({c})', 'Buy your way out ({c})'), { c: $(leaveCost18(s)) }), () => confirm18(l('Sair do selo?', 'Leave the label?'), l('Vocês pagam a rescisão e ficam livres; os masters ficam com o selo.', 'You pay the termination fee and go free; the masters stay with the label.'), l('Sair', 'Leave'), () => say(leave18(s))), 'btn small ghost'),
        br ? btn(fmtL2(l('Processar o selo: {w}', 'Sue the label: {w}'), { w: t(br) }), () => say(sue18(s)), 'btn small ghost') : null),
      muted(l('Outros selos podem comprar seu contrato (eles pagam a saída) — essas propostas aparecem em Propostas.', 'Other labels may buy out your contract (they pay your way out) — those offers show up in Offers.'))),
    past.length ? section(t(l('Contratos anteriores', 'Past deals')), h('ul', { class: 'small' }, past)) : null,
    logList(s));
}
const logList = (s: GameState) => { const lg = a18(s).log.slice(0, 10); return lg.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, lg.map(([y, m, x]) => h('li', null, `${m + 1}/${y} — `, t(x))))) : null; };

// ---------------------------------------------------------------- extrato

function ledgerTab(s: GameState): HTMLElement {
  const st = a18(s);
  const sum = (k: string) => st.led.filter((x) => x.k === k).reduce((t2, x) => t2 + x.v, 0);
  const c = st.deal ? s.contracts[st.deal.cid] : undefined;
  return h('div', null,
    h('div', { class: 'row wrap small' },
      pill(`${t(l('Adiantamentos', 'Advances'))} ${$(sum('adv'))}`), ' ', pill(`${t(l('Fundos (gravação/turnê)', 'Funds (recording/tour)'))} ${$(sum('rec') + sum('tour'))}`), ' ',
      pill(`${t(l('Royalties recebidos', 'Royalties received'))} ${$(sum('roy'))}`, 'good'), ' ', pill(`${t(l('Comissões', 'Commissions'))} ${$(sum('com') + sum('agent'))}`, 'warn'), ' ',
      c ? pill(`${t(l('A recuperar', 'Unrecouped'))} ${$(Math.max(0, c.recoupBalance))}`, c.recoupBalance > 0 ? 'bad' : 'good') : null),
    muted(l('Adiantamento não é presente: o selo desconta dos seus royalties (recuperação) antes de pagar qualquer coisa. Royalties chegam na prestação de contas, meses depois do período. Lançado no seu DRE como receita de royalties; adiantamentos como "não operacional".', 'An advance is not a gift: the label deducts it from your royalties (recoupment) before paying anything. Royalties arrive with the statement, months after the period. Booked in your P&L as royalty revenue; advances as "non-operating".')),
    st.stmts.length ? section(t(l('Prestações de contas', 'Royalty statements')), h('table', { class: 'small' },
      h('thead', null, h('tr', null, ...[l('Período', 'Period'), l('Selo', 'Label'), l('Ganho', 'Earned'), l('Recuperado', 'Recouped'), l('A pagar', 'Payable'), l('Saldo', 'Balance'), l('Situação', 'Status')].map((x) => h('th', null, t(x))))),
      h('tbody', null, st.stmts.slice(0, 16).map((x) => h('tr', null, h('td', null, `${x.m + 1}/${x.y}`), h('td', null, s.labels[x.lb]?.name ?? x.lb), h('td', null, $(x.earned)), h('td', null, $(x.recouped)), h('td', null, $(x.paid)), h('td', null, $(x.bal)),
        h('td', { class: x.st === 'paid' ? 'good' : x.late ? 'bad' : '' }, t(x.st === 'paid' ? l('pago', 'paid') : x.late ? l('atrasado', 'late') : fmtL2(l('em {n} sem.', 'in {n} wk'), { n: Math.max(0, x.due - s.week) })))))))) : muted(l('Nenhuma prestação de contas ainda.', 'No statements yet.')),
    section(t(l('Seu extrato de artista', 'Your artist ledger')), st.led.length ? h('table', { class: 'small' }, h('tbody', null, st.led.slice(0, 30).map((x) => h('tr', null, h('td', null, `${x.m + 1}/${x.y}`), h('td', { class: x.v > 0 ? 'good' : x.v < 0 ? 'bad' : 'muted' }, x.v ? $(x.v) : '—'), h('td', null, t(x.t)))))) : muted(l('Nada lançado ainda.', 'Nothing booked yet.'))));
}

// ---------------------------------------------------------------- equipe

function teamTab(s: GameState): HTMLElement {
  const st = a18(s), a = band18(s);
  const reps = openOffers18(s).filter((o) => o.k === 'mgr' || o.k === 'agent' || o.k === 'pub');
  const brand = a ? s.deals.filter((d) => d.actId === a.id && (d.status === 'offered' || d.status === 'active')) : [];
  return h('div', null,
    section(t(l('Quem trabalha para vocês', 'Who works for you')),
      h('ul', { class: 'small' },
        h('li', null, h('b', null, t(l('Empresário: ', 'Manager: '))), st.mgr ? `${st.mgr.name} · ${pc(st.mgr.rate)} · ${t(l('negociação', 'negotiation'))} ${st.mgr.neg}` : t(l('nenhum — vocês leem só o adiantamento e o royalty nominal', 'none — you only read the advance and headline royalty')), st.mgr ? btn(l('Demitir (sunset)', 'Fire (sunset)'), () => say(fireMgr18(s)), 'btn tiny ghost', l('Paga ~6 meses de comissão média.', 'Pays ~6 months of average commission.')) : null),
        h('li', null, h('b', null, t(l('Agente de shows: ', 'Booking agent: '))), st.agent ? `${st.agent.name} · +${pc(st.agent.boost)} ${t(l('nos cachês', 'on fees'))} · ${pc(st.agent.rate)}` : '—', st.agent ? btn(l('Dispensar', 'Let go'), () => { fireAgent18(s); rerender(); }, 'btn tiny ghost') : null),
        h('li', null, h('b', null, t(l('Editora: ', 'Publisher: '))), st.pub ? `${st.pub.name} · ${t(PTYPE18[st.pub.type])} · ${t(l('fica com', 'keeps'))} ${pc(st.pub.take)} · ${t(l('a recuperar', 'unrecouped'))} ${$(st.pub.bal)}` : '—'),
        h('li', null, h('b', null, t(l('Advogado: ', 'Lawyer: '))), st.lawyer >= s.week ? t(l('acompanhando a negociação', 'on the negotiation')) : t(fmtL2(l('por negociação ({c})', 'per negotiation ({c})'), { c: $(lawyerCost18(s)) })))),
      muted(l('Empresário: comissão sobre adiantamentos, royalties, metade dos shows, patrocínio e edição; em troca lê tudo, negocia melhor, consegue cachês maiores e atrai selos. Demitir ativa a cláusula de saída.', 'Manager: commission on advances, royalties, half of live, sponsorship and publishing; in return reads everything, negotiates better, gets higher fees and attracts labels. Firing triggers the sunset clause.'))),
    reps.length ? section(t(l('Propostas de representação', 'Representation offers')), h('div', null, reps.map((o) => h('div', { class: 'card small' },
      h('b', null, o.who), ' ', pill(t(KIND[o.k])), ' ',
      o.k === 'mgr' ? `${pc(o.rate ?? 0)} · ${t(l('negociação', 'negotiation'))} ${o.neg}${o.mgr ? ' · ' + t(l('empresário real', 'real manager')) : ''}` : o.k === 'agent' ? `+${pc(o.boost ?? 0)} ${t(l('nos cachês', 'on fees'))} · ${pc(o.rate ?? 0)}` : `${t(PTYPE18[o.ptype ?? 'admin'])} · ${t(l('adiantamento', 'advance'))} ${$(o.adv)}`,
      h('div', { class: 'row wrap' }, btn(l('Aceitar', 'Accept'), () => say(accept18(s, o.id)), 'btn small primary'), btn(l('Recusar', 'Decline'), () => { decline18(s, o.id); rerender(); }, 'btn small ghost')))))) : null,
    section(t(l('Patrocínio e marcas', 'Sponsorship and brands')), brand.length ? h('ul', { class: 'small' }, brand.map((d) => h('li', null, `${d.brand} · ${d.kind} · ${$(d.fee)} · ${d.status}`, d.status === 'offered' ? h('span', null, ' ', btn(l('Aceitar', 'Accept'), () => say(acceptDeal(s, rngOf(s), d.id)), 'btn tiny'), btn(l('Recusar', 'Decline'), () => { declineDeal(s, d.id); rerender(); }, 'btn tiny ghost')) : null))) : muted(l('Marcas procuram quem tem fama e imagem compatível; com contrato 360, o selo leva uma fatia.', 'Brands look for fame and a matching image; with a 360 deal, the label takes a cut.'))));
}

// ---------------------------------------------------------------- faça você mesmo × selo

function diyTab(s: GameState): HTMLElement {
  const rows = diy18(s);
  return h('div', null,
    muted(l('De cada US$ 100 vendidos, quanto fica com vocês; alcance relativo (DIY = 1); quanto entra adiantado e em quantos anos, no ritmo atual, o selo recupera o que adiantou.', 'Of every US$100 sold, how much you keep; relative reach (DIY = 1); what you get upfront and in how many years, at the current pace, the label recoups what it advanced.')),
    h('table', { class: 'small' }, h('thead', null, h('tr', null, ...[l('Caminho', 'Path'), l('Seus US$ por 100', 'Your US$ per 100'), l('Alcance', 'Reach'), l('Adiantado', 'Upfront'), l('Anos p/ recuperar', 'Years to recoup'), l('Master', 'Master'), l('Nota', 'Note')].map((x) => h('th', null, t(x))))),
      h('tbody', null, rows.map((r) => h('tr', null, h('td', null, h('b', null, r.name)), h('td', null, String(r.youPer100)), h('td', null, `×${r.reach}`), h('td', null, r.upfront ? `$${Math.round(r.upfront).toLocaleString('en')}` : '—'), h('td', null, r.id === 'diy' ? '—' : r.yearsToRecoup > 20 ? '20+' : String(r.yearsToRecoup)), h('td', null, t(r.master)), h('td', { class: 'muted' }, t(r.note)))))),
    rows.length < 2 ? muted(l('Quando chegarem propostas, elas entram nesta comparação.', 'When offers arrive, they join this comparison.')) : null);
}

registerArea({
  id: 'artist18', label: l('Contratos do artista', 'Artist deals'), icon: 'contract', key: '', visible: (s) => on18(s),
  badge: (s) => openOffers18(s).filter((o) => o.k !== 'mgr' && o.k !== 'agent' && o.k !== 'pub').length || undefined,
  render: (s) => h('div', null,
    h('h2', null, t(l('Contratos do artista', 'Artist deals'))),
    band18(s) ? muted(fmtL2(l('{a}: fama {f}, embalo {m}. {d}', '{a}: fame {f}, momentum {m}. {d}'), { a: band18(s)!.name, f: Math.round(band18(s)!.fame), m: Math.round(band18(s)!.momentum), d: t(a18(s).deal ? fmtL2(l('Contratados por {b}.', 'Signed to {b}.'), { b: s.labels[a18(s).deal!.lb]?.name ?? '?' }) : l('Independentes.', 'Independent.')) })) : null,
    tabs('artist18', [
      { id: 'offers', label: t(l('Propostas', 'Offers')), icon: 'handshake', render: () => offersTab(s) },
      { id: 'deal', label: t(l('Seu contrato', 'Your deal')), icon: 'contract', render: () => dealTab(s) },
      { id: 'ledger', label: t(l('Extrato e contas', 'Ledger and statements')), icon: 'money', render: () => ledgerTab(s) },
      { id: 'team', label: t(l('Equipe e editora', 'Team and publisher')), icon: 'star', render: () => teamTab(s) },
      { id: 'diy', label: t(l('Faça você mesmo × selo', 'DIY vs label')), icon: 'disc', render: () => diyTab(s) },
    ], rerender)),
});

// ---------------------------------------------------------------- sociedades

function venCard(s: GameState, id: string): HTMLElement {
  const v = sh18(s).v.find((x) => x.id === id)!;
  const val = value18v(s, v);
  const on = v.st === 'on';
  const prop = UI.prop[v.id] ?? 'dividend';
  return h('div', { class: 'card' },
    h('div', { class: 'row wrap between' }, h('div', null, h('b', null, v.name), ' ', pill(t(VKIND18[v.kind].name)), ' ', on ? null : pill(t(v.st === 'sold' ? l('vendida', 'sold') : l('dissolvida', 'dissolved')), 'warn')),
      h('span', { class: 'small' }, `${t(l('sua parte', 'your stake'))} ${pc(v.eq)} · ${t(l('valor', 'value'))} ${$(val)} · ${t(l('caixa', 'cash'))} ${$(v.cash)}`)),
    h('div', { class: 'small' }, `${t(l('Sócio', 'Partner'))}: ${v.pn} — `, h('span', { title: t(STYLE18[v.style].desc) }, t(STYLE18[v.style].name)), ` · ${t(l('humor', 'mood'))} `, bar(v.mood), ` · ${t(l('reputação', 'reputation'))} ${Math.round(v.rep)} · ${t(l('equipe', 'staff'))} ${v.staff}`),
    muted(v.eq > 0.5 ? l('Você tem a maioria: seu voto decide.', 'You hold the majority: your vote decides.') : v.eq < 0.5 ? l('O sócio tem a maioria: o voto dele decide.', 'The partner holds the majority: their vote decides.') : l('50/50: votos diferentes travam tudo (impasse), e impasses azedam a relação.', '50/50: split votes deadlock everything, and deadlocks sour the relationship.')),
    on ? h('div', { class: 'row wrap' },
      select(prop, (Object.keys(PROP18) as Prop18[]).map((x) => ({ value: x, label: t(PROP18[x]) })), (x) => { UI.prop[v.id] = x; rerender(); }),
      btn(l('Propor e votar sim', 'Propose and vote yes'), () => say(vote18(s, v.id, prop, true))),
      btn(fmtL2(l('Comprar a parte dele ({p})', 'Buy their stake ({p})'), { p: $(buyOutPrice18(s, v)) }), () => say(buyOut18(s, v.id)), 'btn small ghost', undefined, v.eq >= 1),
      btn(l('Vender a minha parte', 'Sell my stake'), () => confirm18(l('Vender sua parte?', 'Sell your stake?'), l('O sócio paga 85% do valor da sua parte.', 'The partner pays 85% of your stake\'s value.'), l('Vender', 'Sell'), () => say(sellStake18(s, v.id))), 'btn small ghost'),
      btn(l('Dissolver na Justiça', 'Dissolve in court'), () => confirm18(l('Dissolver?', 'Dissolve?'), l('Custas + você recebe 80% da sua parte do caixa.', 'Fees + you get 80% of your share of cash.'), l('Dissolver', 'Dissolve'), () => say(dissolve18(s, v.id))), 'btn small ghost')) : null,
    v.votes.length ? h('details', { class: 'small' }, h('summary', null, t(l('Votações', 'Votes'))), h('ul', null, v.votes.slice(0, 8).map((x) => h('li', null, `${x.y} · ${t(PROP18[x.k])} · ${t(l('você', 'you'))} ${x.you ? '✓' : '✗'} · ${v.pn} ${x.them ? '✓' : '✗'} → `, t(x.t))))) : null);
}
function venTab(s: GameState): HTMLElement {
  const st = sh18(s);
  return h('div', null,
    st.v.length ? h('div', null, st.v.map((v) => venCard(s, v.id))) : emptyState18(l('Nenhuma sociedade', 'No partnerships'), l('Funde um selo, festival ou estúdio com um NPC (artista famoso, empresário) ou um imprint com um selo. Aba "Nova sociedade".', 'Found a label, festival or studio with an NPC (famous artist, manager) or an imprint with a label. "New partnership" tab.')),
    st.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, st.log.slice(0, 8).map(([y, m, x]) => h('li', null, `${m + 1}/${y} — `, t(x))))) : null);
}
function newTab(s: GameState): HTMLElement {
  const cands = partners18(s, UI.kind);
  if (!cands.some((c) => c.pk === UI.pk)) UI.pk = cands[0]?.pk ?? '';
  const odds = UI.pk ? foundOdds18(s, UI.kind, UI.pk, UI.kind === 'imprint' ? 0.5 : UI.eq) : null;
  const cap = capOf18(s, UI.kind);
  return h('div', null,
    h('div', { class: 'row wrap' },
      select(UI.kind, (Object.keys(VKIND18) as VKind18[]).map((k) => ({ value: k, label: t(VKIND18[k].name) })), (k) => { UI.kind = k; rerender(); }),
      cands.length ? select(UI.pk, cands.map((c) => ({ value: c.pk, label: `${c.name} — ${t(c.why)}` })), (k) => { UI.pk = k; rerender(); }) : muted(l('Ninguém disponível agora.', 'Nobody available right now.')),
      UI.kind === 'imprint' ? pill('50/50') : select(UI.eq, [0.3, 0.5, 0.7].map((e) => ({ value: e, label: `${t(l('sua parte', 'your stake'))} ${pc(e)}` })), (e) => { UI.eq = e; rerender(); })),
    muted(VKIND18[UI.kind].desc),
    h('p', { class: 'small' }, UI.kind === 'imprint' ? t(l('O selo entra com todo o capital.', 'The label puts up all the capital.')) : `${t(l('Aporte total', 'Total capital'))} ${$(cap)} · ${t(l('sua parte', 'your share'))} ${$(Math.round(cap * UI.eq))}`,
      odds ? h('span', null, ` · ${t(l('chance de topar', 'chance they agree'))} `, h('b', { title: odds.why.map((x) => t(x)).join(' · ') }, pc(odds.p))) : null),
    UI.pk ? btn(l('Propor sociedade', 'Propose partnership'), () => say(found18(s, UI.kind, UI.pk, UI.eq)), 'btn small primary') : null,
    UI.pk && !UI.pk.startsWith('lb:') ? h('p', { class: 'small' }, t(l('Estilo provável do sócio: ', 'Partner\'s likely style: ')), t(STYLE18[styleGuess(s, UI.pk)].name), ' — ', t(STYLE18[styleGuess(s, UI.pk)].desc)) : null);
}
const styleGuess = (s: GameState, pk: string) => styleOf18(s, pk);

function bandTab(s: GameState): HTMLElement {
  const st = sh18(s), a = band18(s);
  if (!a) return emptyState18(l('Sem banda', 'No band'), l('A divisão da banda e o conflito de interesse aparecem quando você toca numa banda.', 'Band splits and conflict of interest show up when you play in a band.'));
  const mates = a.members.map((id) => s.persons[id]).filter((p) => p && p.alive && !p.isPlayer);
  return h('div', null,
    section(t(l('Como a banda divide o dinheiro', 'How the band splits the money')),
      h('div', { class: 'row wrap' }, ...(Object.keys(SPLIT18) as (keyof typeof SPLIT18)[]).map((k) => btn(SPLIT18[k].name, () => { setSplit18(s, k); rerender(); }, st.split === k ? 'btn small primary' : 'btn small', SPLIT18[k].desc))),
      muted(SPLIT18[st.split].desc),
      h('table', { class: 'small' }, h('tbody', null, mates.map((p) => h('tr', null, h('td', null, p.name), h('td', null, `${t(l('moral', 'morale'))} `, bar(p.morale)), h('td', null, `${t(l('mágoa', 'resentment'))} `, bar(p.resentment, 100, 'bad')))))),
      muted(l('Moral baixa por meses e mágoa alta levam integrantes a sair (ou a carreira solo). As propostas de selo também passam por votação da banda.', 'Low morale for months and high resentment push members out (or solo). Label offers also go to a band vote.'))),
    hybrid18(s) ? section(t(l('Conflito de interesse: sua banda no seu selo', 'Conflict of interest: your band on your label')),
      h('div', { class: 'row wrap' }, ...(Object.keys(SELF18) as (keyof typeof SELF18)[]).map((k) => btn(SELF18[k].name, () => { setSelf18(s, k); rerender(); }, st.self === k ? 'btn small primary' : 'btn small', SELF18[k].desc))),
      muted(SELF18[st.self].desc)) : null,
    actLink(s, a.id));
}

registerArea({
  id: 'shared18', label: l('Sociedades', 'Partnerships'), icon: 'handshake', key: '',
  badge: (s) => sh18(s).v.filter((v) => v.st === 'on' && v.mood < 25).length || undefined,
  render: (s) => h('div', null,
    h('h2', null, t(l('Sociedades e carreiras compartilhadas', 'Partnerships and shared careers'))),
    muted(l('Empresas com sócios NPC (participação, votos, briga), a banda como sociedade e, se você também tem selo, o conflito de interesse.', 'Companies with NPC partners (equity, votes, fallouts), the band as a partnership and, if you also own a label, the conflict of interest.')),
    tabs('shared18', [
      { id: 'ven', label: t(l('Sociedades', 'Partnerships')), icon: 'handshake', render: () => venTab(s) },
      { id: 'new', label: t(l('Nova sociedade', 'New partnership')), icon: 'building', render: () => newTab(s) },
      { id: 'band', label: t(l('Banda e conflitos', 'Band and conflicts')), icon: 'guitar', render: () => bandTab(s) },
    ], rerender)),
});
