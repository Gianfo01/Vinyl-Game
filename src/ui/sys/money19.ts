// Rodada 19 (onda 3, T1) — Finanças › "Dívida e catálogo": juros por época e múltiplos (M13), covenants e o banco (J3),
// leilões de masters (N1), títulos lastreados em catálogo (N6), direito de preferência e "Versão do artista" (N5).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { realRate19 } from '../../sim/rates19';
import { RATING19, bidAuc19, bondTerms19, campaignable19, cov19, fanCampaign19, issueBond19, liveBond19, m19, rates19, repayBond19, setRofr19, sideShare19, topBid19 } from '../../sim/sys/money19';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerTab } from '../registry';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null, ok?: L) => { if (r) toast(T(r), 'info'); else if (ok) toast(T(ok), 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fm = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const r1 = (x: number) => Math.round(x * 10) / 10;

export function debtTab19(s: GameState): HTMLElement {
  const st = m19(s), r = rates19(s), c = cov19(s), b = liveBond19(s), bt = bondTerms19(s);
  const decades = [-30, -20, -10, 0].map((d) => s.year + d).filter((y) => y >= 1889);
  const open = st.auc.filter((a) => a.st === 'open'), done = st.auc.filter((a) => a.st !== 'open').slice(0, 6);
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.playerBand);
  return h('div', null,
    section(t(l('Juros e múltiplos de catálogo', 'Rates and catalog multiples')),
      row(why18(s, 'm19.rate', {}, pill(fm(l('Juro {r}% — {w}', 'Rate {r}% — {w}'), { r: r1(r.rate), w: t(r.word) }), r.rate >= 8 ? 'bad' : r.rate <= 1 ? 'good' : '')),
        pill(fm(l('masters {m}×', 'masters {m}×'), { m: r1(r.masters) })), pill(fm(l('edição {m}×', 'publishing {m}×'), { m: r1(r.pub) })),
        pill(fm(l('apetite dos fundos ×{a}', 'fund appetite ×{a}'), { a: r1(r.appetite) }), r.appetite > 1 ? 'good' : '')),
      muted(fm(l('Trajetória: {p}. Juro baixo infla o valor de catálogo e traz fundos com lances; juro alto encarece o crédito e comprime a venda. Época: {w}.', 'Path: {p}. Low rates inflate catalog value and bring fund bids; high rates make credit dear and squeeze sale prices. Era: {w}.'), { p: decades.map((y) => `${y}: ${r1(realRate19(y))}%`).join(' · '), w: t(r.why) }))),
    section(t(l('Banco e covenants', 'Bank and covenants')),
      row(why18(s, 'm19.cov', {}, pill(fm(l('dívida ÷ receita {x}', 'debt ÷ revenue {x}'), { x: Math.round(c.ratio * 100) / 100 }), c.ratio > 0.8 ? 'bad' : '')),
        pill(fm(l('{n} trimestre(s) no prejuízo', '{n} losing quarter(s)'), { n: c.losing }), c.losing >= 2 ? 'bad' : ''),
        pill(fm(l('dívida {d}', 'debt {d}'), { d: $(c.debt) })),
        st.call ? pill(t(({ open: l('banco chamou a dívida', 'bank called the loan'), pledge: l('masters empenhados', 'masters pledged'), accel: l('aceleração', 'acceleration'), paid: l('quitado', 'paid off'), sold: l('masters vendidos', 'masters sold'), petition: l('pedido de falência', 'bankruptcy petition') } as Record<string, L>)[st.call.st]), st.call.st === 'paid' ? 'good' : 'bad') : null,
        (s.flags.m19nolend ?? 0) > s.week ? pill(t(l('banco fechado para novos empréstimos', 'bank closed to new loans')), 'bad') : null),
      muted(l('Covenant: dívida até 1× a receita de 12 meses e no máximo 2 trimestres seguidos no prejuízo. Quebrou: pagar, empenhar masters, vender masters a um fundo ou aceitar a aceleração. Quebrar de novo no vermelho em 12 meses = o banco pede a falência (caso Stax, 1975).', 'Covenant: debt up to 1× 12-month revenue and at most 2 losing quarters in a row. Breach: pay, pledge masters, sell masters to a fund or accept acceleration. Breach again in the red within 12 months = the bank files for bankruptcy (Stax case, 1975).')),
      st.lien.length ? muted(fm(l('Empenhados: {t}', 'Pledged: {t}'), { t: st.lien.map((id) => s.releases[id]?.title ?? '?').join(', ') })) : null),
    section(t(l('Leilões de masters', 'Master auctions')),
      open.length ? h('div', null, ...open.map((a) => row(h('b', null, a.name), pill(fm(l('{k} gravações', '{k} recordings'), { k: a.rels.length })),
        why18(s, 'm19.auc', { auc: a.id }, pill(fm(l('justo {f}', 'fair {f}'), { f: $(a.fair) }))),
        pill(fm(l('maior lance {v} ({w})', 'top bid {v} ({w})'), { v: $(topBid19(a)), w: a.bids.length ? a.bids[a.bids.length - 1].name : t(l('mínimo', 'minimum')) })),
        pill(fm(l('fecha em {n} sem.', 'closes in {n} wk'), { n: Math.max(0, a.ends - s.week) })),
        btn(fm(l('Lance {v}', 'Bid {v}'), { v: $(Math.round(topBid19(a) * 1.08)) }), () => say(bidAuc19(s, a.id, Math.round(topBid19(a) * 1.08)), l('Lance registrado.', 'Bid placed.')))))) : muted(l('Nenhum leilão aberto. Quando um selo quebra, o banco executa e as gravações vão a leilão: rivais de catálogo, conglomerados e fundos disputam.', 'No open auction. When a label goes bust, the bank forecloses and the recordings go to auction: catalog rivals, conglomerates and funds compete.')),
      done.length ? h('ul', { class: 'small' }, ...done.map((a) => h('li', null, a.st === 'sold' ? fm(l('{y} — {n}: {w} por {p}', '{y} — {n}: {w} for {p}'), { y: a.y, n: a.name, w: a.winName ?? '?', p: $(a.price ?? 0) }) : fm(l('{y} — {n}: sem lance', '{y} — {n}: no bid'), { y: a.y, n: a.name })))) : null),
    section(t(l('Título lastreado em catálogo (Bowie Bonds)', 'Catalog-backed bond (Bowie Bonds)')),
      b ? h('div', null, row(why18(s, 'm19.rating', {}, pill(fm(l('rating {r}', 'rated {r}'), { r: RATING19[b.rating] }), b.rating >= 3 ? 'bad' : 'good')),
          pill(fm(l('cupom {k}%', 'coupon {k}%'), { k: r1(b.coupon * 100) })), pill(fm(l('saldo {v}', 'balance {v}'), { v: $(b.left) })), pill(fm(l('{n} masters no lastro', '{n} masters pledged'), { n: b.rels.length })),
          btn(fm(l('Resgatar ({v})', 'Redeem ({v})'), { v: $(Math.round(b.left * 1.02)) }), () => say(repayBond19(s), l('Título resgatado.', 'Bond redeemed.')))))
        : h('div', null, row(why18(s, 'm19.rating', {}, pill(fm(l('rating estimado {r}', 'estimated rating {r}'), { r: RATING19[bt.idx] }))), pill(fm(l('capta {v}', 'raises {v}'), { v: $(bt.amt) })), pill(fm(l('cupom {k}%', 'coupon {k}%'), { k: r1(bt.coupon * 100) })),
            btn(l('Emitir 10 anos', 'Issue 10 years'), () => say(issueBond19(s, 10), l('Título emitido.', 'Bond issued.')), !!bt.ok), btn(l('Emitir 15 anos', 'Issue 15 years'), () => say(issueBond19(s, 15), l('Título emitido.', 'Bond issued.')), !!bt.ok)),
          bt.ok ? muted(bt.ok) : null),
      muted(l('Dinheiro agora contra a renda futura dos masters com 3+ anos. Cobertura trimestral abaixo de 1× duas vezes rebaixa; a pirataria digital (1999–2007) pesa no rating; inadimplência entrega os masters aos credores, que os levam a leilão.', 'Cash now against the future income of masters 3+ years old. Quarterly coverage under 1× twice downgrades; digital piracy (1999–2007) weighs on the rating; default hands the masters to creditors, who auction them.'))),
    section(t(l('Direito de preferência e "Versão do artista"', 'First refusal and "Artist\'s Version"')),
      mine.length ? h('div', null, ...mine.map((a) => row(h('b', null, a.name), st.rofr[a.id] ? pill(t(l('com preferência', 'has first refusal')), 'good') : null,
        btn(st.rofr[a.id] ? l('Retirar preferência (−confiança)', 'Revoke first refusal (−trust)') : l('Dar direito de preferência (+confiança; o artista cobre a oferta se você vender)', 'Grant first refusal (+trust; the artist matches if you sell)'), () => say(setRofr19(s, a.id, !st.rofr[a.id])))))) : muted(l('Sem artistas no elenco.', 'No acts on the roster.')),
      ...campaignable19(s).map((x) => row(h('b', null, x.act.name), pill(fm(l('{n} master(s) antigo(s) em outro selo', '{n} old master(s) at another label'), { n: x.old.length })), pill(fm(l('{p}% dos fãs devem seguir', '{p}% of fans should follow'), { p: Math.round(sideShare19(s, x.act.id) * 100) })),
        btn(l('Campanha: "ouçam a minha versão"', 'Campaign: "stream my version"'), () => say(fanCampaign19(s, x.act.id), l('Campanha no ar.', 'Campaign live.'))))),
      st.vows.filter((v) => !v.done).length ? h('ul', { class: 'small' }, ...st.vows.filter((v) => !v.done).map((v) => h('li', null, fm(l('{a} prepara a regravação ({p}% dos fãs devem migrar)', '{a} is preparing the re-record ({p}% of fans should switch)'), { a: s.acts[v.act]?.name ?? '?', p: Math.round(v.share * 100) })))) : null,
      muted(l('Vender os masters de um artista sem preferência pode virar juramento de regravação; os fãs escolhem um lado (lealdade e mobilização) e o master antigo perde demanda. Regrave em Direitos › Regravações e depois chame os fãs aqui.', 'Selling an act\'s masters without first refusal may turn into a re-record vow; fans pick a side (loyalty and mobilisation) and the old master loses demand. Re-record in Rights › Re-recordings, then rally the fans here.'))),
    st.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, ...st.log.slice(0, 10).map((x) => h('li', null, `${x.y}: ${t(x.t)}`)))) : null);
}

registerTab('business', { id: 'debt19', label: l('Dívida e catálogo', 'Debt & catalog'), icon: 'bank', order: 58, render: debtTab19, badge: (s) => m19(s).auc.filter((a) => a.st === 'open').length + (m19(s).call?.st === 'open' ? 1 : 0) || undefined });
