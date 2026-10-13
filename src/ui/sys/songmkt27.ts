// r27 (SONG) — página "Mercado de canções" (Projetos › Criar). Um lugar só para comprar, ganhar, vender/dar e licenciar
// canções; gravar continua pela agenda/estúdio (o botão leva para lá, sem "Jogar" duplicado). Motor em
// sim/sys/songmkt27.ts, sobre songsale, camps18, writers19, studio.makeCover, rights18 e a rede de favores (holds17).

import { Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { camps18, pitchSong18 } from '../../sim/sys/camps18';
import {
  SONGMKT27, SRC27, acceptGift27, askBlock27, askSong27, buyBlock27, buyLot27, coverQuote27, coverables27, dealKind27, declineGift27, ear27,
  estimate27, friends27, giveSong27, hints27, licenseCover27, lots27, mechRate27, mkt27, passLot27, sellable27, srcsOf27, statusOf27, summary27,
  whyName27, width27, type Deal27, type Lot27,
} from '../../sim/sys/songmkt27';
import { closeSale, fairTerms, offerSong, saleChance, saleTargets, sales, type SaleTerms } from '../../sim/sys/songsale';
import { cutOdds19, takeOffer19, wr19 } from '../../sim/sys/writers19';
import { STATUS_NAMES, type SongStatus } from '../../sim/repertoire';
import { allHolds } from '../../sim/holds17';
import type { Act, GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, genreName, rerender, toast } from '../common';
import { h, select } from '../dom';
import { card27, emptyState27, kpiRow27, list27, listRow27, statusChip27, toolbar27 } from '../ps/ui27';
import { registerArea } from '../registry';
import { store } from '../store';
import { ic, setTab, tabs } from '../vis';
import './songmkt27.css';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const F = { act: '', fam: 'mine' as 'mine' | 'all', target: {} as Record<string, string>, counter: {} as Record<string, SaleTerms>, pitch: {} as Record<string, string> };
const go = (area: string, tab?: [string, string]): void => { if (tab) setTab(tab[0], tab[1]); store.area = area; rerender(); };
const say = (x: { ok: boolean; text: L } | L | string, good?: boolean): void => {
  if (typeof x === 'string') toast(x, good ? 'good' : 'info');
  else if ('ok' in x) toast(T(x.text), x.ok ? 'good' : 'info');
  else toast(T(x), good ? 'good' : 'info');
  rerender();
};
const btn = (label: L | string, fn: () => void, o: { dis?: L | string | null; cls?: string; title?: L | string } = {}): HTMLElement =>
  h('button', { type: 'button', class: `btn small ${o.cls ?? ''}`, disabled: !!o.dis, title: o.dis ? T(o.dis) : o.title ? T(o.title) : undefined, onclick: fn }, T(label));
const muted = (x: L | string): HTMLElement => h('p', { class: 'muted small' }, T(x));
const fmt = (x: L, p: Record<string, string | number>): string => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const live = (a: Act | undefined): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased;
const myActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter(live);
const curAct = (s: GameState): Act | undefined => { const xs = myActs(s); if (!xs.some((a) => a.id === F.act)) F.act = xs[0]?.id ?? ''; return s.acts[F.act]; };
const uiRng = (s: GameState, ...k: string[]): Rng => Rng.fromSeed(`${s.config.seed}|songmkt27ui|${k.join('|')}|${s.week}`);
const studioBtn = (): HTMLElement => btn(l('Gravar no estúdio →', 'Record in the studio →'), () => go('studio'), { cls: 'ghost', title: l('A gravação segue pela agenda/estúdio, como qualquer canção do repertório.', 'Recording goes through the schedule/studio, like any repertoire song.') });

// ---------------------------------------------------------------- Comprar

function lotRow(s: GameState, lot: Lot27, act: Act | undefined): HTMLElement {
  const e = estimate27(s, lot);
  const hs = hints27(s, lot);
  const src = SRC27[lot.src];
  const bRight = act ? buyBlock27(s, lot.id, act.id, 'right') : l('Sem ato no elenco.', 'No act on the roster.');
  const bWork = act ? buyBlock27(s, lot.id, act.id, 'work') : bRight;
  return listRow27({
    lead: h('span', { class: 'sm27-lead', 'aria-hidden': 'true' }, ic(lot.src === 'npc' ? 'turntable' : lot.src === 'tinpan' ? 'scroll' : 'quill')),
    title: `“${lot.t}”`,
    meta: h('span', { class: 'sm27-meta' },
      h('span', null, fmt(l('{w} · {p}', '{w} · {p}'), { w: lot.wn, p: lot.pub })),
      h('span', { class: 'sm27-chips' }, statusChip27(src.name, 'info', T(src.blurb)), statusChip27(genreName(lot.g)), ...hs.map((x) => statusChip27(l('Atenção', 'Watch out'), 'warn', T(x))))),
    aside: h('span', { class: 'sm27-est', title: fmt(l('Qualidade estimada: faixa de {w} pontos (seu ouvido: {e}).', 'Estimated quality: a {w}-point range (your ear: {e}).'), { w: e.w, e: Math.round(ear27(s)) }) },
      h('small', null, t(l('Qualidade', 'Quality'))), h('b', null, `${e.lo}–${e.hi}`)),
    actions: [
      btn(fmt(l('Direito de gravar {v}', 'Right to record {v}'), { v: $(lot.fee) }), () => say(buyLot27(s, lot.id, act!.id, 'right')), { dis: bRight, title: l('O autor e a editora dele ficam com a obra; você paga a licença mecânica por cópia vendida.', 'The writer and their publisher keep the work; you pay the mechanical license per copy sold.') }),
      btn(fmt(l('Comprar a obra {v}', 'Buy the work {v}'), { v: $(lot.buy) }), () => say(buyLot27(s, lot.id, act!.id, 'work')), { dis: bWork, cls: 'ghost', title: l('Você vira a editora: a edição fica com o selo e você pode vender a canção a outros. O autor recebe a parte de autor.', 'You become the publisher: publishing stays with the label and you can sell the song on. The writer keeps the writer share.') }),
      btn(l('Passar', 'Pass'), () => say(passLot27(s, lot.id)), { cls: 'ghost', title: l('Tira da vitrine. Às vezes a canção recusada vira hit na voz de outro.', 'Removes it from the shelf. Sometimes a song you pass on becomes someone else\'s hit.') }),
    ],
  });
}

function dealRows(s: GameState, ds: Deal27[]): HTMLElement {
  return list27(l('Suas canções compradas e licenciadas', 'Your bought and licensed songs'), ds.slice().reverse().slice(0, 20).map((d) => {
    const st = statusOf27(s, d) as SongStatus;
    const risk = d.plag ? statusChip27(l('Processo de plágio', 'Plagiarism suit'), 'bad') : d.dup?.done ? statusChip27(l('Corrida para lançar: encerrada', 'Release race: settled'), 'warn') : d.dup ? statusChip27(l('Outro ato tem a mesma canção!', 'Another act has the same song!'), 'warn', T(l('Lance antes que eles.', 'Release before they do.'))) : d.beat ? statusChip27(l('Superou o original', 'Beat the original'), 'good') : null;
    return listRow27({
      title: `“${d.t}”`,
      meta: h('span', { class: 'sm27-chips' }, statusChip27(dealKind27[d.k], d.k === 'work' ? 'good' : 'neutral'), statusChip27(STATUS_NAMES[st] ?? l('—', '—')), h('span', { class: 'muted small' }, `${s.acts[d.act]?.name ?? ''} · ${d.wn} · ${d.pub}`), risk),
      aside: d.k === 'work' ? h('small', { class: 'muted' }, t(l('edição sua', 'your publishing'))) : h('span', { class: 'sm27-est' }, h('small', null, t(l('Mecânicos pagos', 'Mechanicals paid'))), h('b', null, $(d.paid))),
      actions: st === 'written' ? [studioBtn()] : [],
    });
  }));
}

function buyTab(s: GameState): HTMLElement {
  const act = curAct(s);
  const fams = new Set(myActs(s).map((a) => familyOf(a.genre)));
  const all = lots27(s).filter((x) => x.until >= s.week);
  const shown = F.fam === 'mine' ? all.filter((x) => fams.has(familyOf(x.g))) : all;
  const st = mkt27(s);
  const srcs = srcsOf27(s.year).filter((k) => k !== 'npc');
  return h('div', { class: 'stack27' },
    card27({ title: l('Vitrine do mês', 'This month\'s shelf'), icon: 'quill', variant: 'hero',
      actions: [select<'mine' | 'all'>(F.fam, [{ value: 'mine', label: t(l('Gêneros do seu elenco', 'Your roster\'s genres')) }, { value: 'all', label: t(l('Todos os gêneros', 'All genres')) }], (v) => { F.fam = v; rerender(); }, { 'aria-label': t(l('Filtrar gênero', 'Filter genre')) })],
      more: { label: l('De onde vêm as canções nesta época', 'Where songs come from in this era'), body: srcs.map((k) => h('p', { class: 'small' }, h('b', null, T(SRC27[k].name)), ' — ', T(SRC27[k].blurb))) } },
      muted(fmt(l('A qualidade é uma faixa de {w} pontos: um A&R ou produtor melhor na equipe estreita a estimativa e ouve problemas (plágio, venda dupla). A vitrine muda todo mês.', 'Quality is a {w}-point range: a better A&R or producer on staff narrows the estimate and hears problems (plagiarism, double sale). The shelf changes every month.'), { w: width27(s) })),
      shown.length ? list27(l('Canções à venda', 'Songs for sale'), shown.map((x) => lotRow(s, x, act)))
        : emptyState27({ icon: 'quill', title: l('Nada no seu gênero este mês', 'Nothing in your genre this month'), why: l('Veja todos os gêneros ou volte no mês que vem.', 'Look at all genres or come back next month.'), action: all.length ? { label: l('Ver todos os gêneros', 'Show all genres'), run: () => { F.fam = 'all'; rerender(); } } : undefined })),
    st.deals.length ? card27({ title: l('Suas compras e licenças', 'Your purchases and licenses'), icon: 'copyright' }, dealRows(s, st.deals)) : null);
}

// ---------------------------------------------------------------- Ofertas recebidas (presentes, compositores de fora, pedir)

function offersTab(s: GameState): HTMLElement {
  const st = mkt27(s);
  const gifts = st.gifts.filter((g) => g.until >= s.week);
  const outs = wr19(s).offers.filter((o) => o.until >= s.week);
  const fr = friends27(s);
  const act = curAct(s);
  const owed = (pid: string) => allHolds(s).some((x) => x.status === 'open' && x.holder === 'player' && x.target === pid && (x.kind === 'favor' || x.kind === 'loyalty'));
  const mineF = fr.filter((f) => !act || f.mine === act.id);
  return h('div', { class: 'stack27' },
    card27({ title: l('Canções de presente', 'Song gifts'), icon: 'handshake' },
      gifts.length ? list27(l('Presentes', 'Gifts'), gifts.map((g) => listRow27({
        title: `“${g.t}”`,
        meta: h('span', { class: 'sm27-chips' }, h('span', null, fmt(l('de {o} para {a}', 'from {o} to {a}'), { o: s.acts[g.from]?.name ?? '?', a: s.acts[g.to]?.name ?? '?' })), statusChip27(whyName27[g.why], 'info'), statusChip27(l('custa um favor', 'costs a favor'), 'warn', T(l('A obra fica com quem deu e você passa a dever um favor (Rede de favores).', 'The work stays with the giver and you owe a favor (Favor network).')))),
        aside: h('span', { class: 'sm27-est' }, h('small', null, t(l('Qualidade', 'Quality'))), h('b', null, `~${g.q}`)),
        actions: [btn(l('Aceitar', 'Accept'), () => say(acceptGift27(s, g.id))), btn(l('Recusar', 'Decline'), () => say(declineGift27(s, g.id)), { cls: 'ghost' })],
      }))) : muted(l('Amigos do seu elenco, parceiros de faixa e ídolos em fim de carreira às vezes mandam canções — pela Caixa e aqui.', 'Friends of your roster, track partners and idols late in their career sometimes send songs — via the Inbox and here.'))),
    card27({ title: l('Compositores de fora', 'Outside writers'), icon: 'quill' },
      outs.length ? list27(l('Ofertas de compositores', 'Writer offers'), outs.map((o) => listRow27({
        title: fmt(l('Canção de {w}', 'Song by {w}'), { w: s.persons[o.pid]?.name ?? '?' }),
        meta: h('span', { class: 'sm27-chips' }, h('span', null, `${s.acts[o.act]?.name ?? ''} · ${o.pub}`), statusChip27(fmt(l('cachê {f}', 'fee {f}'), { f: $(o.fee) }))),
        aside: h('span', { class: 'sm27-est' }, h('small', null, t(l('Qualidade', 'Quality'))), h('b', null, `~${o.q}`)),
        actions: [btn(l('Gravar', 'Record it'), () => say(takeOffer19(s, o.id, false))),
          btn(fmt(l('Pedir 25% ({p}%)', 'Ask 25% ({p}%)'), { p: Math.round(cutOdds19(s, o) * 100) }), () => say(takeOffer19(s, o.id, true)), { cls: 'ghost', title: l('Cut-in: crédito de 25% para o seu artista — pode ofender o autor.', 'Cut-in: 25% credit for your artist — may offend the writer.') }),
          btn(l('Recusar', 'Pass'), () => { wr19(s).offers = wr19(s).offers.filter((x) => x !== o); say(l('Recusada.', 'Passed.')); }, { cls: 'ghost' })],
      }))) : muted(l('Nenhuma oferta aberta agora.', 'No open offers right now.'))),
    card27({ title: l('Pedir uma canção a um amigo', 'Ask a friend for a song'), icon: 'people' },
      muted(l('Só quem tem laço com o seu ato (amizade, parceria, mentoria) dá canção. Se ele te deve um favor, o pedido gasta o favor; se não, você passa a dever um.', 'Only acts with a bond to yours (friendship, collaboration, mentorship) give songs. If they owe you a favor, asking spends it; if not, you will owe one.')),
      mineF.length ? list27(l('Amigos', 'Friends'), mineF.slice(0, 10).map((f) => {
        const o = s.acts[f.act], b = askBlock27(s, f);
        return listRow27({
          title: o?.name ?? '?',
          meta: h('span', { class: 'sm27-chips' }, statusChip27(whyName27[f.why], 'info'), statusChip27(fmt(l('laço {b}', 'bond {b}'), { b: f.bond }), f.bond >= 25 ? 'good' : 'neutral'), owed(f.pid) ? statusChip27(l('te deve um favor', 'owes you a favor'), 'good') : null, h('span', { class: 'muted small' }, s.persons[f.pid]?.name ?? '')),
          actions: [btn(l('Pedir canção', 'Ask for a song'), () => say(askSong27(s, f.act, f.mine)), { dis: b })],
        });
      })) : emptyState27({ icon: 'people', title: l('Nenhum laço com artistas de fora ainda', 'No bonds with outside acts yet'), why: l('Turnês, festivais, feats e produtores em comum criam amizades.', 'Tours, festivals, features and shared producers create friendships.') })));
}

// ---------------------------------------------------------------- Vender / dar

function sellTab(s: GameState): HTMLElement {
  const songs = sellable27(s);
  const open = camps18(s).pitches.filter((p) => !p.done && p.until >= s.week);
  const mySales = sales(s).sales.filter((x) => playerActs(s).includes(x.fromActId)).slice(-12).reverse();
  return h('div', { class: 'stack27' },
    open.length ? card27({ title: l('Estrelas pedindo canções', 'Stars asking for songs'), icon: 'star' },
      list27(l('Pedidos', 'Requests'), open.map((p) => {
        const star = s.acts[p.a];
        const fit = songs.filter((x) => x.q >= p.minQ - 10);
        if (!fit.some((x) => x.id === F.pitch[p.id])) F.pitch[p.id] = fit[0]?.id ?? '';
        return listRow27({
          title: star?.name ?? '?',
          meta: h('span', { class: 'sm27-chips' }, statusChip27(genreName(p.g)), statusChip27(fmt(l('qualidade {q}+', 'quality {q}+'), { q: p.minQ })), statusChip27(fmt(l('cachê {f}', 'fee {f}'), { f: $(p.fee) })), p.cut ? statusChip27(fmt(l('quer {c}% do crédito', 'wants {c}% credit'), { c: Math.round(p.cut * 100) }), 'warn') : null),
          actions: fit.length ? [select(F.pitch[p.id], fit.map((x) => ({ value: x.id, label: `${x.title} (${Math.round(x.q)})` })), (v) => { F.pitch[p.id] = v; rerender(); }, { 'aria-label': t(l('Canção', 'Song')) }),
            btn(l('Oferecer', 'Pitch'), () => say(pitchSong18(s, p.id, F.pitch[p.id], true)))] : [h('span', { class: 'muted small' }, t(l('Nenhuma inédita à altura.', 'No unreleased song good enough.')))],
        });
      }))) : null,
    card27({ title: l('Vender ou dar suas inéditas', 'Sell or give your unreleased songs'), icon: 'coin' },
      muted(l('Vender: cachê agora + royalties de composição para sempre (parte do selo e parte de quem escreveu). Dar de presente: sem cachê, os royalties seguem, o outro ato fica mais próximo e te deve um favor. Canções com só o direito de gravar não podem ser vendidas.', 'Sell: a fee now + songwriting royalties forever (part to the label, part to the writers). Give: no fee, royalties still flow, the other act grows closer and owes you a favor. Songs you only hold the right to record cannot be sold.')),
      songs.length ? list27(l('Inéditas', 'Unreleased songs'), songs.slice(0, 15).map((so) => {
        const tg = saleTargets(s, so);
        if (!tg.some((a) => a.id === F.target[so.id])) F.target[so.id] = tg[0]?.id ?? '';
        const target = F.target[so.id];
        const fair = target ? fairTerms(s, so, target) : undefined;
        const ch = fair ? saleChance(s, so, target, fair) : 0;
        const ct = F.counter[so.id];
        return listRow27({
          title: `“${so.title}”`,
          meta: h('span', { class: 'sm27-chips' }, h('span', { class: 'muted small' }, s.acts[so.actId]?.name ?? ''), statusChip27(fmt(l('qualidade {q}', 'quality {q}'), { q: Math.round(so.q) })),
            fair ? statusChip27(fmt(l('{f} + {r}% · chance {c}%', '{f} + {r}% · {c}% chance'), { f: $(fair.fee), r: (fair.royalty * 100).toFixed(1), c: Math.round(ch * 100) }), ch >= 0.5 ? 'good' : 'neutral') : null,
            ct ? statusChip27(fmt(l('contraproposta: {f} + {r}%', 'counter: {f} + {r}%'), { f: $(ct.fee), r: (ct.royalty * 100).toFixed(1) }), 'warn') : null),
          actions: tg.length ? [
            select(target, tg.map((a) => ({ value: a.id, label: a.name })), (v) => { F.target[so.id] = v; delete F.counter[so.id]; rerender(); }, { 'aria-label': t(l('Para quem', 'To whom')) }),
            ct ? btn(l('Aceitar contraproposta', 'Accept counter'), () => { const x = closeSale(s, uiRng(s, 'c', so.id, target), so.id, target, ct); delete F.counter[so.id]; say(x ? l('Venda fechada.', 'Sale closed.') : l('Algo deu errado.', 'Something went wrong.'), !!x); })
              : btn(l('Vender', 'Sell'), () => { const r = offerSong(s, uiRng(s, 'o', so.id, target), so.id, target, fair!); if (r.result === 'counter' && r.counter) F.counter[so.id] = r.counter; say(r.text, r.result === 'accepted'); }),
            btn(l('Dar de presente', 'Give as a gift'), () => say(giveSong27(s, so.id, target)), { cls: 'ghost' }),
          ] : [h('span', { class: 'muted small' }, t(l('Nenhum comprador por perto.', 'No buyer around.')))],
        });
      })) : emptyState27({ icon: 'quill', title: l('Nenhuma inédita para vender', 'No unreleased songs to sell'), why: l('Componha, faça um camp ou compre a obra de alguém na vitrine.', 'Write, run a camp or buy a work from the shelf.'), action: { label: l('Ir para Compor', 'Go to Writing'), run: () => go('creation') } })),
    mySales.length ? card27({ title: l('Suas vendas', 'Your sales'), icon: 'copyright' },
      list27(l('Vendas', 'Sales'), mySales.map((x) => listRow27({
        title: `“${x.title}”`,
        meta: h('span', { class: 'muted small' }, fmt(l('para {b} · {r}% de royalties', 'to {b} · {r}% royalties'), { b: s.acts[x.toActId]?.name ?? '?', r: (x.royalty * 100).toFixed(1) })),
        aside: h('span', { class: 'sm27-est' }, h('small', null, x.fee ? $(x.fee) : t(l('presente', 'gift'))), h('b', null, $(x.paid))),
      })))) : null);
}

// ---------------------------------------------------------------- Licenças (covers)

function coversTab(s: GameState): HTMLElement {
  const act = curAct(s);
  const m = mechRate27(s);
  const cvs = coverables27(s);
  const mine = mkt27(s).deals.filter((d) => d.k === 'cover');
  return h('div', { class: 'stack27' },
    card27({ title: l('Licença para regravar', 'License to re-record'), icon: 'copyright', variant: 'hero' },
      h('p', { class: 'small' }, T(m.why)),
      muted(fmt(l('Licença {f} na hora + {c}¢ por cópia vendida, todo mês, aos autores e à editora da obra. Um cover pode superar o original.', 'License {f} up front + {c}¢ per copy sold, every month, to the writers and the work\'s publisher. A cover can outsell the original.'), { f: $(coverQuote27(s, '').fee), c: m.cents })),
      cvs.length ? list27(l('Canções para regravar', 'Songs to re-record'), cvs.map((x) => {
        const q = coverQuote27(s, x.song.id);
        return listRow27({
          title: `“${x.song.title}”`,
          meta: h('span', { class: 'sm27-chips' }, h('span', null, fmt(l('{a}, {y}', '{a}, {y}'), { a: x.act?.name ?? '?', y: x.oy })),
            x.writers.length ? h('span', { class: 'muted small' }, fmt(l('· autores: {w}', '· writers: {w}'), { w: x.writers.slice(0, 3).join(', ') })) : null,
            statusChip27(x.why === 'standard' ? l('Standard', 'Standard') : l('Sucesso recente', 'Recent hit'), x.why === 'standard' ? 'info' : 'accent'),
            x.pd ? statusChip27(l('Domínio público', 'Public domain'), 'good') : null, x.covers ? statusChip27(fmt(l('{n} covers', '{n} covers'), { n: x.covers })) : null),
          aside: x.rel.peak > 0 ? h('span', { class: 'sm27-est' }, h('small', null, t(l('Original', 'Original'))), h('b', null, `#${x.rel.peak}`)) : null,
          actions: [btn(q.pd ? l('Regravar (grátis)', 'Re-record (free)') : fmt(l('Licenciar {f}', 'License {f}'), { f: $(q.fee) }), () => say(licenseCover27(s, x.song.id, act!.id)), { dis: act ? null : l('Sem ato no elenco.', 'No act on the roster.') })],
        });
      })) : emptyState27({ icon: 'copyright', title: l('Ainda não há catálogo para regravar', 'No catalog to re-record yet'), why: l('Standards aparecem quando há gravações com 20+ anos; sucessos, quando há paradas.', 'Standards appear once recordings are 20+ years old; hits, once there are charts.') })),
    mine.length ? card27({ title: l('Seus covers', 'Your covers'), icon: 'disc' }, dealRows(s, mine)) : null);
}

// ---------------------------------------------------------------- página

export function songMarketPage(s: GameState): HTMLElement {
  const sm = summary27(s);
  const outs = wr19(s).offers.filter((o) => o.until >= s.week).length;
  const acts = myActs(s);
  const act = curAct(s);
  if (!acts.length) return emptyState27({ icon: 'quill', title: l('Sem artistas no elenco', 'No artists on the roster'), why: l('O mercado de canções compra e vende para os seus atos.', 'The song market buys and sells for your acts.'), action: { label: l('Ir para o mercado de talentos', 'Go to the talent market'), run: () => go('market') } });
  return h('div', { class: 'stack27 sm27' },
    h('h2', { class: 'sr-only' }, t(l('Mercado de canções', 'Song market'))),
    kpiRow27([
      { label: l('Na vitrine', 'On the shelf'), value: String(lots27(s).filter((x) => x.until >= s.week).length) },
      { label: l('Ofertas recebidas', 'Offers received'), value: String(sm.gifts + outs), tone: sm.gifts + outs ? 'accent' : 'neutral' },
      { label: l('Compradas e licenciadas', 'Bought and licensed'), value: String(sm.deals) },
      { label: l('Mecânicos pagos', 'Mechanicals paid'), value: $(sm.paid), hint: l(`${mechRate27(s).cents}¢ por cópia`, `${mechRate27(s).cents}¢ per copy`) },
    ]),
    toolbar27([h('label', { class: 'small sm27-for' }, t(l('Para o ato', 'For the act')), ' ',
      select(act?.id ?? '', acts.map((a) => ({ value: a.id, label: a.name })), (v) => { F.act = v; rerender(); }, { 'aria-label': t(l('Ato', 'Act')) }))], [studioBtn()]),
    tabs(SONGMKT27, [
      { id: 'buy', label: t(l('Comprar', 'Buy')), render: () => buyTab(s) },
      { id: 'sell', label: t(l('Vender', 'Sell')), render: () => sellTab(s) },
      { id: 'offers', label: t(l('Ofertas recebidas', 'Offers received')), badge: sm.gifts + outs || undefined, render: () => offersTab(s) },
      { id: 'covers', label: t(l('Licenças (covers)', 'Licenses (covers)')), render: () => coversTab(s) },
    ], rerender));
}

registerArea({ id: SONGMKT27, label: l('Mercado de canções', 'Song market'), icon: 'songsheet', key: '', render: songMarketPage,
  badge: (s) => { const n = mkt27(s).gifts.filter((g) => g.until >= s.week).length; return n || undefined; } });
