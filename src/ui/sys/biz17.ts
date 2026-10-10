// Rodada 17 (F) — interface de negócios: Venda do selo & catálogo, Canais de lançamento, Casas de show,
// Licenças entre regiões, Imagem & voz, Merch, Circuito (festivais/reunião/financiamento coletivo) e a
// Agenda de shows com concorrência. Cada escolha mostra chance, custo e o porquê.

import { FESTIVALS } from '../../data/catalog';
import { CITIES, FAMILIES, cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { careers } from '../../sim/sys/careers12';
import { ownerOf } from '../../sim/sys/people/owner';
import { beginSuccession } from '../../sim/sys/heirs8';
import { rngOf } from '../../sim/util';
import { CAP_GAINS, bidNet, buyLabel17, buyPrice, buyableLabels, cutList, hasLabel, makeBids, minRefound, refound, refoundBlock, relIncome, sale17, sellLabel, sellMaster17, valuation17, MARKET_NAME } from '../../sim/sys/sale17';
import { OUTLETS, editable, estimate, feeOf, out17, outletsNow, reachOf, setPreset, toggleOutlet, upfrontOf, type OutId } from '../../sim/sys/outlets17';
import { POLICY, PRICE, VENUES17, buyVenue17, marketVenues, monthEst17, sellValue, sellVenue17, setVenue17, v17, vdef, venuePrice, type Policy, type PriceK } from '../../sim/sys/venues17';
import { acceptLic, declineLic, estIn, lic17, mkName, pitchOut, pitchTargets } from '../../sim/sys/license17';
import { SCOPES, activeDeal, askImage, endDeal, fairShare, imgChance, img17, isEstate, renegotiate, scopesNow, type Scope } from '../../sim/sys/image17';
import { SKUS, canSell, demandOf, fightCost, m17, makeBatch, skusNow, toggleFight, toggleLicense, unitCost, type Sku, type Line } from '../../sim/sys/merch17';
import { c17, crowdEst, crowdOpen, launchCrowd, pickWar, reunionCands, reunionTerms, stageReunion } from '../../sim/sys/circuit17';
import { TIX, blitz, blitzCost, cal17, clashOf, dateOfWeek, festWeeks, playerShows, setTix, type Tix } from '../../sim/sys/clash17';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const famName = (f: string) => t(FAMILIES.find((x) => x.id === f)?.name ?? l(f, f));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const sg = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
const res = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const say = (r: { ok: boolean; text: L }) => { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); };
const ul = (rows: (string | HTMLElement)[]) => h('ul', { class: 'small' }, rows.map((x) => h('li', null, x)));
const logList = (rows: { y: number; m?: number; t: L }[]) => rows.length ? ul(rows.slice(0, 8).map((x) => `${x.m !== undefined ? `${x.m + 1}/` : ''}${x.y} — ${t(x.t)}`)) : h('p', { class: 'muted small' }, '—');
const myActs = (s: GameState) => Object.values(s.acts).filter((a) => (a.owner === 'player' || a.playerBand) && a.members.length && a.status !== 'retired' && a.status !== 'split');

// ================================================================== venda & catálogo

let fName = '', fCity = '', fCap = 0;
function saleTab(s: GameState): HTMLElement {
  const st = sale17(s);
  if (!hasLabel(s)) return afterSale(s);
  const v = valuation17(s), bids = makeBids(s);
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Em vez de fechar as portas, venda. O preço sai da avaliação abaixo; cada comprador tem um perfil e termos diferentes. Depois da venda o mundo segue: o selo vendido vira concorrente e você escolhe o próximo passo.', 'Instead of shutting down, sell. The price comes from the valuation below; each buyer has a profile and different terms. After the sale the world goes on: the sold label becomes a competitor and you choose your next step.'))),
    section(t(l('Avaliação de {c}: {v}', '{c} valuation: {v}'), { c: s.config.companyName, v: $(v.total) }), ul(v.why.map(([w, x]) => `${t(w)}: ${$(x)}`))),
    section(t(l('Propostas deste mês', 'This month\'s offers')), bids.length ? h('div', null, bids.map((b) => {
      const n = bidNet(s, b), cl = cutList(s, b);
      return h('div', { class: 'card' },
        h('div', { class: 'row wrap' }, h('b', null, b.name), ' ', pill(t({ rival: l('rival', 'rival'), conglomerate: l('conglomerado', 'conglomerate'), fund: l('fundo', 'fund'), vulture: l('abutre', 'vulture') }[b.kind])), ' ', h('b', null, $(b.price))),
        ul([...b.why.map((w) => t(w)),
          t(l('Na mão agora: {a} (já descontado imposto de {tx}%); earn-out: {e}', 'In hand now: {a} (after {tx}% capital-gains tax); earn-out: {e}'), { a: $(n.now), tx: Math.round(CAP_GAINS * 100), e: n.later ? $(n.later) : '—' }),
          t(l('Não-concorrência: {y} anos nas suas regiões · consultoria: {c}/mês por 2 anos', 'Non-compete: {y} years in your regions · consulting: {c}/month for 2 years'), { y: b.nonCompete, c: b.consult ? $(b.consult) : '—' }),
          cl.cut.length || cl.keyman.length ? t(l('Saem: {n}', 'Leaving: {n}'), { n: [...cl.cut, ...cl.keyman].map((a) => a.name + (cl.keyman.includes(a) ? ` (${t(l('empresário: pessoa-chave', 'manager: key-man'))})` : '')).join(', ') }) : t(l('Todo o elenco fica.', 'The whole roster stays.')),
        ]),
        h('button', { class: 'btn small primary', onclick: () => { if (confirm(t(l('Vender {c} para {b}? Não há volta.', 'Sell {c} to {b}? There is no going back.'), { c: s.config.companyName, b: b.name }))) res(sellLabel(s, b.id), l('Selo vendido. O que vem agora?', 'Label sold. What now?')); } }, t(l('Vender', 'Sell'))));
    })) : h('p', { class: 'muted' }, '—')),
    section(t(l('Lances por masters antigos', 'Bids for old masters')),
      st.cat.length ? h('div', null, st.cat.map((b) => { const r = s.releases[b.relId]; return r ? h('div', { class: 'row wrap' }, `"${r.title}" — ${s.acts[r.actId]?.name ?? ''}: ${b.fund} ${t(l('oferece', 'offers'))} ${$(b.price)} (${t(l('rende ~{v}/ano', 'earns ~{v}/yr'), { v: $(relIncome(s, r.id)) })})`, ' ',
        h('button', { class: 'btn tiny', onclick: () => res(sellMaster17(s, b.id), l('Master vendido. O artista não gostou.', 'Master sold. The artist did not like it.')) }, t(l('Vender', 'Sell')))) : null; })) : h('p', { class: 'muted small' }, t(l('Nenhum lance. Fundos aparecem mais na era do streaming e para discos com 5+ anos.', 'No bids. Funds show up more in the streaming era and for records 5+ years old.'))),
      h('p', { class: 'small muted' }, t(l('Vender o master tira o poder de veto do artista: a confiança cai e fica uma mágoa.', 'Selling the master strips the artist\'s veto: trust drops and a grudge remains.')))),
    section(t(l('Histórico', 'History')), logList(st.log)));
}

function afterSale(s: GameState): HTMLElement {
  const st = sale17(s), o = ownerOf(s);
  const city = fCity || s.config.homeCity, nb = refoundBlock(s, city);
  const cap = fCap || minRefound(s) * 4;
  return h('div', null,
    st.sold ? h('p', null, t(l('Você vendeu o selo para {b} em {y} por {p}. Seu patrimônio: {w}.', 'You sold the label to {b} in {y} for {p}. Your wealth: {w}.'), { b: st.sold.name, y: st.sold.y, p: $(st.sold.price), w: $(o.wealth) })) : h('p', null, t(l('Você não tem gravadora no momento. Patrimônio: {w}.', 'You have no label right now. Wealth: {w}.'), { w: $(o.wealth) })),
    st.nc && st.nc.until >= s.year ? h('p', { class: 'small bad' }, t(l('Não-concorrência até {y} em: {m}.', 'Non-compete until {y} in: {m}.'), { y: st.nc.until, m: st.nc.markets.map((m) => t(MARKET_NAME(m))).join(', ') })) : null,
    st.earn ? h('p', { class: 'small' }, t(l('Earn-out pendente: {v} (pago em janeiro se o selo vendido mantiver ≥ 80% da receita).', 'Pending earn-out: {v} (paid in January if the sold label keeps ≥ 80% of revenue).'), { v: $(st.earn.left) })) : null,
    section(t(l('1. Abrir outro selo', '1. Found another label')),
      h('div', { class: 'row wrap' },
        h('input', { type: 'text', placeholder: t(l('Nome', 'Name')), value: fName, oninput: (e: Event) => { fName = (e.target as HTMLInputElement).value; } }),
        select(city, CITIES.filter((c) => c.id).map((c) => ({ value: c.id, label: `${t(c.name)}${refoundBlock(s, c.id).blocked ? ' ⛔' : ''}` })), (v) => { fCity = v; rerender(); }),
        select(cap, [1, 2, 4, 8, 20].map((k) => ({ value: minRefound(s) * k, label: $(minRefound(s) * k) })), (v) => { fCap = v; }),
        h('button', { class: 'btn small primary', onclick: () => res(refound(s, fName, city, cap, nb.blocked), l('Novo selo aberto.', 'New label founded.')) }, nb.blocked ? t(l('Fundar pagando a multa ({v})', 'Found paying the penalty ({v})'), { v: $(nb.buyout) }) : t(l('Fundar', 'Found'))))),
    section(t(l('2. Comprar um selo existente', '2. Buy an existing label')), h('div', null, buyableLabels(s).map((lb) => h('div', { class: 'row wrap' },
      `${lb.name} (${t(cityById[lb.city]?.name ?? l(lb.city))}) — ${lb.roster.length} ${t(l('artistas', 'acts'))} · ${$(buyPrice(s, lb))}`, ' ',
      h('button', { class: 'btn tiny', disabled: o.wealth < buyPrice(s, lb), onclick: () => res(buyLabel17(s, lb.id), l('Selo comprado: elenco, catálogo e dívidas agora são seus.', 'Label bought: roster, catalog and debts are now yours.')) }, t(l('Comprar', 'Buy'))))))),
    section(t(l('3. Outra carreira', '3. Another career')), h('p', { class: 'small' }, t(l('Empresário, festival, casa de shows, estúdio, editora, mídia… Abra em Empreendimentos → Carreiras. Carreiras ativas: {c}.', 'Manager, festival, venue, studio, publisher, media… Open them in Ventures → Careers. Active careers: {c}.'), { c: careers(s).active.join(', ') || '—' }))),
    section(t(l('4. Aposentar-se', '4. Retire')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => { if (confirm(t(l('Passar tudo a um herdeiro?', 'Hand everything to an heir?')))) { beginSuccession(s, rngOf(s), 'retire'); rerender(); } } }, t(l('Passar a um herdeiro', 'Hand over to an heir'))),
        h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Encerrar a história aqui?', 'End the story here?')))) { s.ended = { ending: 'quiet_retirement', year: s.year, reason: 'arc' }; rerender(); } } }, t(l('Encerrar a história', 'End the story'))))),
    section(t(l('Histórico', 'History')), logList(st.log)));
}

// ================================================================== canais

function outletsTab(s: GameState): HTMLElement {
  const rels = Object.values(s.releases).filter((r) => editable(s, r)).sort((a, b) => b.week - a.week).slice(0, 6);
  const now = outletsNow(s), st = out17(s);
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('O formato (vinil, K7, CD…) você escolhe na prensagem; aqui você escolhe ONDE vender. Cada canal tem alcance, margem e custo — e alguns têm efeito colateral. Vale nas 8 primeiras semanas do lançamento.', 'You choose the format (vinyl, cassette, CD…) when pressing; here you choose WHERE to sell. Each channel has reach, margin and cost — and some have side effects. Applies in a release\'s first 8 weeks.'))),
    h('table', { class: 'tbl small' }, h('tr', null, ...[l('Canal', 'Channel'), l('Alcance', 'Reach'), l('Margem', 'Margin'), l('Custo', 'Cost'), l('Padrão', 'Default')].map((x) => h('th', null, t(x)))),
      now.map((o) => h('tr', { title: t(o.desc) }, h('td', null, t(o.name), o.upfront ? h('span', { class: 'small good' }, ` · ${t(l('adianta', 'pays upfront'))}`) : null), h('td', null, sg(o.reach)), h('td', null, sg(o.margin)), h('td', null, o.fee ? $(feeOf(s, o)) : '—'),
        h('td', null, h('input', { type: 'checkbox', checked: st.preset.includes(o.id), onchange: () => { setPreset(s, st.preset.includes(o.id) ? st.preset.filter((x) => x !== o.id) : [...st.preset, o.id]); rerender(); } }))))),
    h('p', { class: 'small muted' }, t(l('"Padrão" é aplicado automaticamente a cada lançamento novo.', '"Default" is applied automatically to every new release.'))),
    ...rels.map((r) => {
      const cur = st.rel[r.id] ?? [], e = estimate(s, r, cur);
      return section(`"${r.title}" — ${s.acts[r.actId]?.name ?? ''}`,
        h('div', { class: 'row wrap' }, outletsNow(s, r).map((o) => h('label', { class: 'check', title: `${t(o.desc)} · ${t(l('alcance', 'reach'))} ${sg(reachOf(s, o, r))}${upfrontOf(s, o, r) ? ` · ${t(l('adiantamento', 'advance'))} ${$(upfrontOf(s, o, r))}` : ''}` },
          h('input', { type: 'checkbox', checked: cur.includes(o.id), onchange: () => res(toggleOutlet(s, r.id, o.id as OutId), l('Canais atualizados.', 'Channels updated.')) }), ' ', t(o.name)))),
        h('p', { class: 'small' }, t(l('Unidades ×{r} · margem {m} sobre a receita por unidade', 'Units ×{r} · margin {m} on revenue per unit'), { r: e.reach.toFixed(2), m: sg(e.margin) })),
        cur.length ? ul(e.why.map(([w, a, m]) => `${t(w)}: ${t(l('alcance', 'reach'))} ${sg(a)}, ${t(l('margem', 'margin'))} ${sg(m)}`)) : null);
    }),
    rels.length ? null : h('p', { class: 'muted' }, t(l('Nenhum lançamento seu nas últimas 8 semanas.', 'None of your releases in the last 8 weeks.'))),
    h('p', { class: 'small muted' }, t(l('Canais de outras épocas: {x}', 'Channels from other eras: {x}'), { x: OUTLETS.filter((o) => !now.includes(o) && o.from <= s.year).map((o) => `${t(o.name)} (${o.from}–${o.to})`).join(', ') || '—' })));
}

// ================================================================== casas

let vsel = '';
function venuesTab(s: GameState): HTMLElement {
  const st = v17(s);
  const mk = marketVenues(s).filter((d) => !st.own.some((o) => o.id === d.id));
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Clubes e teatros lendários estão à venda; estádios e arenas públicas não. Escolha a linha de programação e o preço: curadoria constrói nome (e revela talentos), comercial dá caixa e gasta a reputação, aluguel é renda fixa, residência dá público fiel a um ato seu.', 'Legendary clubs and theatres are for sale; stadiums and public arenas are not. Choose the booking policy and price: curated builds a name (and reveals talent), commercial brings cash and burns reputation, rental is fixed income, residency gives one of your acts a loyal crowd.'))),
    ...st.own.map((o) => {
      const d = vdef(o.id)!, e = monthEst17(s, o);
      return section(`${d.name} — ${t(cityById[d.city]?.name ?? l(d.city))} (${N(d.cap)})`,
        h('div', { class: 'row wrap' },
          select<Policy>(o.policy, (Object.keys(POLICY) as Policy[]).map((k) => ({ value: k, label: t(POLICY[k].name) })), (v) => { setVenue17(s, o.id, { policy: v }); rerender(); }),
          select<PriceK>(o.price, (Object.keys(PRICE) as PriceK[]).map((k) => ({ value: k, label: t(PRICE[k].name) })), (v) => { setVenue17(s, o.id, { price: v }); rerender(); }),
          o.policy === 'residency' ? select(o.actId ?? '', [{ value: '', label: '—' }, ...myActs(s).map((a) => ({ value: a.id, label: a.name }))], (v) => { setVenue17(s, o.id, { actId: v || undefined }); rerender(); }) : null,
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.maint, onchange: () => { setVenue17(s, o.id, { maint: !o.maint }); rerender(); } }), ' ', t(l('Manutenção em dia', 'Maintenance up to date'))),
          h('button', { class: 'btn tiny ghost', onclick: () => { if (confirm(t(l('Vender por {v}?', 'Sell for {v}?'), { v: $(sellValue(s, o)) }))) res(sellVenue17(s, o.id), l('Casa vendida.', 'Venue sold.')); } }, t(l('Vender', 'Sell')))),
        h('p', { class: 'small' }, t(POLICY[o.policy].desc)),
        h('p', { class: 'small' }, t(l('Reputação {r} · conservação {c} · estimativa do mês: {a} pessoas em {n} noites, porta {d} + bar {b} − cachês {f} − manutenção {u} = {net}', 'Reputation {r} · condition {c} · month estimate: {a} people over {n} nights, door {d} + bar {b} − fees {f} − upkeep {u} = {net}'),
          { r: Math.round(o.rep), c: Math.round(o.cond), a: N(e.att), n: e.nights, d: $(e.door), b: $(e.bar), f: $(e.fees), u: $(e.upkeep), net: $(e.net) })),
        ul(e.why.map((w) => t(w))),
        o.booked.length ? h('p', { class: 'small muted' }, t(l('Na agenda: {x}', 'Booked: {x}'), { x: o.booked.map((id) => s.acts[id]?.name ?? '').join(', ') })) : null,
        h('p', { class: 'small muted' }, t(l('Total acumulado: {v}', 'Running total: {v}'), { v: $(o.total) })));
    }),
    section(t(l('À venda', 'For sale')),
      h('div', { class: 'row wrap' }, select(vsel || mk[0]?.id || '', mk.map((d) => ({ value: d.id, label: `${d.name} — ${t(cityById[d.city]?.name ?? l(d.city))} · ${N(d.cap)} · ${d.buyable === false ? t(l('não está à venda', 'not for sale')) : $(venuePrice(s, d))}` })), (v) => { vsel = v; rerender(); }),
        h('button', { class: 'btn small primary', onclick: () => res(buyVenue17(s, vsel || mk[0]?.id || ''), l('Casa comprada.', 'Venue bought.')) }, t(l('Comprar', 'Buy')))),
      (() => { const d = vdef(vsel || mk[0]?.id || ''); return d ? h('p', { class: 'small muted' }, d.buyable === false ? t(d.note ?? l('', '')) : t(l('Prestígio {p} · alma: {f}{c}', 'Prestige {p} · soul: {f}{c}'), { p: d.prestige, f: famName(d.fam), c: d.to ? t(l(' · na história, fecha em {y}', ' · historically closes in {y}'), { y: d.to }) : '' })) : null; })(),
      h('p', { class: 'small muted' }, t(l('{a} de {n} casas do catálogo existem nesta época.', '{a} of {n} catalog venues exist in this era.'), { a: marketVenues(s).length, n: VENUES17.length }))),
    section(t(l('Histórico', 'History')), logList(st.log)));
}

// ================================================================== licenças

function licTab(s: GameState): HTMLElement {
  const st = lic17(s);
  const offers = st.list.filter((d) => d.status === 'offer'), act = st.list.filter((d) => d.status === 'active');
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('ENTRADA: selos sem operação onde você opera pedem que você distribua os discos deles (você paga adiantamento, fica com uma fatia — e ajuda um concorrente). SAÍDA: selos de regiões onde você não está licenciam o seu catálogo (eles adiantam e pagam royalty; seus discos chegam lá). Abrir o mercado por conta própria rompe a exclusividade.', 'IN: labels with no operation where you operate ask you to distribute their records (you pay an advance, keep a cut — and help a competitor). OUT: labels in regions where you are absent license your catalog (they advance and pay royalty; your records reach them). Opening the market yourself breaks exclusivity.'))),
    section(t(l('Propostas', 'Offers')), offers.length ? h('div', null, offers.map((d) => h('div', { class: 'card' },
      h('b', null, `${d.dir === 'in' ? '⇥' : '⇤'} ${s.labels[d.lb]?.name ?? '?'} · ${t(mkName(d.market))}`), d.why ? h('p', { class: 'small' }, t(d.why)) : null,
      h('p', { class: 'small' }, d.dir === 'in' ? t(l('Você paga {a}; fica com {p}% das vendas deles lá (~{e}/mês hoje) até {y}.', 'You pay {a}; keep {p}% of their sales there (~{e}/month now) until {y}.'), { a: $(d.adv), p: Math.round(d.share * 100), e: $(estIn(s, d)), y: dateOfWeek(s, d.until).year }) : t(l('Eles pagam {a} adiantado e {p}% de royalty até {y}; o resto da receita lá fica com eles.', 'They pay {a} upfront and {p}% royalty until {y}; the rest of the revenue there is theirs.'), { a: $(d.adv), p: Math.round(d.share * 100), y: dateOfWeek(s, d.until).year })),
      h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: () => res(acceptLic(s, d.id), l('Acordo fechado.', 'Deal signed.')) }, t(l('Aceitar', 'Accept'))), h('button', { class: 'btn small ghost', onclick: () => { declineLic(s, d.id); rerender(); } }, t(l('Recusar', 'Decline'))))))) : h('p', { class: 'muted small' }, '—')),
    section(t(l('Em vigor', 'Active')), act.length ? ul(act.map((d) => `${d.dir === 'in' ? '⇥' : '⇤'} ${s.labels[d.lb]?.name ?? '?'} · ${t(mkName(d.market))} · ${pct(d.share)} · ${t(l('rendeu', 'earned'))} ${$(d.earned)}`)) : h('p', { class: 'muted small' }, '—')),
    section(t(l('Oferecer seu catálogo', 'Pitch your catalog')), h('div', null, pitchTargets(s).map((x) => h('div', { class: 'row wrap' }, `${t(mkName(x.m))}: ${x.lb.name}`, ' ',
      h('button', { class: 'btn tiny', onclick: () => res(pitchOut(s, x.lb.id, x.m), l('Proposta enviada: veja a resposta acima ou no histórico.', 'Pitch sent: see the answer above or in the history.')) }, t(l('Propor', 'Pitch'))))))),
    section(t(l('Histórico', 'History')), logList(st.log)));
}

// ================================================================== imagem & voz

let iAct = '', iSc: Scope[] = ['merch'], iShare = 0.2, iYears = 3, iUp = 0;
function imageTab(s: GameState): HTMLElement {
  const st = img17(s);
  const cands = Object.values(s.acts).filter((a) => a.members.length && (a.owner === 'player' || a.fame >= 20 || isEstate(s, a))).sort((a, b) => b.fame - a.fame).slice(0, 80);
  const a = s.acts[iAct] ?? cands[0];
  const sc = a ? iSc.filter((x) => scopesNow(s, a).includes(x)) : [];
  const T = { scopes: sc, share: iShare, years: a && isEstate(s, a) ? iYears : Math.max(1, iYears), upfront: iUp };
  const c = a ? imgChance(s, a, T) : null;
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Negocie o uso do nome, rosto e voz com o artista ou com o espólio. Iniciantes aceitam fácil; estrelas, não. Proteções: fatia mínima de 5%, até 10 anos com artista vivo, no máximo 2 acordos predatórios por ano — e acordo predatório volta para cobrar quando o artista cresce.', 'Negotiate the use of name, face and voice with the artist or the estate. Newcomers accept easily; stars do not. Safeguards: 5% minimum share, up to 10 years with a living artist, at most 2 predatory deals a year — and a predatory deal comes back to bite when the artist grows.'))),
    a ? section(t(l('Proposta', 'Proposal')),
      h('div', { class: 'row wrap' },
        select(a.id, cands.map((x) => ({ value: x.id, label: `${x.name}${isEstate(s, x) ? ` (${t(l('espólio', 'estate'))})` : ''} · ${t(l('fama', 'fame'))} ${Math.round(x.fame)}${activeDeal(s, x.id) ? ' ✓' : ''}` })), (v) => { iAct = v; rerender(); }),
        select(iShare, [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5].map((v) => ({ value: v, label: `${t(l('artista', 'artist'))} ${pct(v)}` })), (v) => { iShare = v; rerender(); }),
        select(iYears, [...(isEstate(s, a) ? [0] : []), 1, 3, 5, 7, 10].map((v) => ({ value: v, label: v ? t(l('{y} anos', '{y} years'), { y: v }) : t(l('perpétuo', 'perpetual')) })), (v) => { iYears = v; rerender(); }),
        select(iUp, [0, 2000, 10000, 50000, 200000].map((v) => ({ value: v * 100, label: `${t(l('luvas', 'signing'))} ${$(v * 100)}` })), (v) => { iUp = v; rerender(); })),
      h('div', { class: 'row wrap' }, scopesNow(s, a).map((k) => h('label', { class: 'check', title: t(SCOPES[k].desc) }, h('input', { type: 'checkbox', checked: iSc.includes(k), onchange: () => { iSc = iSc.includes(k) ? iSc.filter((x) => x !== k) : [...iSc, k]; rerender(); } }), ' ', t(SCOPES[k].name)))),
      c?.block ? h('p', { class: 'small bad' }, t(c.block)) : h('div', null,
        h('p', null, h('b', null, t(l('Chance: {p}', 'Odds: {p}'), { p: pct(c?.p ?? 0) })), ' ', h('span', { class: 'small muted' }, t(l('fatia justa ≈ {f}', 'fair share ≈ {f}'), { f: pct(fairShare(a, sc.length ? sc : ['merch'])) }))),
        ul((c?.why ?? []).map(([w, v]) => `${t(w)}: ${sg(v)}`)),
        iShare < fairShare(a, sc.length ? sc : ['merch']) * 0.6 ? h('p', { class: 'small bad' }, t(l('Predatório: abaixo de 60% do justo. Se o artista crescer, vai exigir renegociação — e pode processar.', 'Predatory: below 60% of fair. If the artist grows, they will demand a renegotiation — and may sue.'))) : null,
        h('button', { class: 'btn small primary', onclick: () => say(askImage(s, a.id, T)) }, t(l('Propor', 'Propose'))))) : null,
    section(t(l('Acordos', 'Deals')), st.deals.filter((d) => d.status !== 'ended').length ? h('div', null, st.deals.filter((d) => d.status !== 'ended').map((d) => h('div', { class: 'row wrap' },
      actLink(s, d.act), ` · ${d.scopes.map((k) => t(SCOPES[k].name)).join(', ')} · ${pct(d.share)} ${d.until < 9999 ? `· ${t(l('até', 'until'))} ${d.until}` : ''} · ${t(l('rendeu', 'earned'))} ${$(d.earned)}`,
      d.status === 'demand' ? h('span', { class: 'bad small' }, ` ${t(l('exige renegociação!', 'demands renegotiation!'))} `) : null,
      d.status === 'demand' || d.pred ? h('button', { class: 'btn tiny', onclick: () => res(renegotiate(s, d.id), l('Renegociado.', 'Renegotiated.')) }, t(l('Renegociar (fatia justa)', 'Renegotiate (fair share)'))) : null,
      h('button', { class: 'btn tiny ghost', onclick: () => { endDeal(s, d.id); rerender(); } }, t(l('Encerrar', 'End')))))) : h('p', { class: 'muted small' }, '—')),
    section(t(l('Histórico', 'History')), logList(st.log)));
}

// ================================================================== merch

let mAct = '', mSku: Sku = 'tee', mUnits = 500, mDesign = 60, mPrice: Line['price'] = 'mid';
function merchTab(s: GameState): HTMLElement {
  const st = m17(s);
  const acts = myActs(s).concat(Object.values(s.acts).filter((x) => x.owner !== 'player' && activeDealMerch(s, x.id)));
  const a = s.acts[mAct] ?? acts[0];
  const skus = skusNow(s);
  const sku = skus.includes(mSku) ? mSku : skus[0];
  const no = a ? canSell(s, a) : null;
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Produtos por época, estoque em lotes, preço e design. Vende o dobro durante turnê, moletom no inverno, pirataria quando o artista é grande. Drop limitado esgota e fortalece o núcleo de fãs; encalhe vira liquidação. Precisa de 360, banda própria ou direito de imagem (merch).', 'Products by era, stock in batches, price and design. Sells double while touring, hoodies in winter, bootlegs when the act is big. A limited drop sells out and strengthens the core fanbase; leftovers get cleared. Needs a 360 deal, your own band or image rights (merch).'))),
    a ? section(t(l('Novo lote', 'New batch')),
      h('div', { class: 'row wrap' },
        select(a.id, acts.map((x) => ({ value: x.id, label: x.name })), (v) => { mAct = v; rerender(); }),
        select<Sku>(sku, skus.map((k) => ({ value: k, label: `${t(SKUS[k].name)} (${$(unitCost(s, k, mDesign))}/un)` })), (v) => { mSku = v; rerender(); }),
        select(mUnits, [100, 300, 500, 1000, 3000, 10000].map((v) => ({ value: v, label: `${N(v)} un` })), (v) => { mUnits = v; rerender(); }),
        select(mDesign, [30, 60, 90].map((v) => ({ value: v, label: `${t(l('design', 'design'))} ${v}` })), (v) => { mDesign = v; rerender(); }),
        select<Line['price']>(mPrice, (['low', 'mid', 'high'] as const).map((v) => ({ value: v, label: t({ low: l('barato', 'cheap'), mid: l('normal', 'normal'), high: l('caro', 'pricey') }[v]) })), (v) => { mPrice = v; rerender(); })),
      no ? h('p', { class: 'small bad' }, t(no)) : h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => res(makeBatch(s, a.id, sku, mUnits, mDesign, mPrice), l('Lote produzido.', 'Batch made.')) }, t(l('Produzir', 'Produce'))),
        h('button', { class: 'btn small', onclick: () => res(makeBatch(s, a.id, sku, Math.max(100, Math.round(mUnits / 3)), mDesign, 'high', true), l('Drop limitado no ar.', 'Limited drop is live.')) }, t(l('Drop limitado (1/3, caro)', 'Limited drop (1/3, pricey)'))),
        h('button', { class: 'btn small ghost', onclick: () => { toggleFight(s, a.id); rerender(); } }, st.fight[a.id] ? t(l('Parar combate à pirataria', 'Stop anti-bootleg')) : t(l('Combater pirataria ({c}/mês)', 'Fight bootlegs ({c}/mo)'), { c: $(fightCost(s)) })),
        h('button', { class: 'btn small ghost', onclick: () => res(toggleLicense(s, a.id), l('Licença atualizada.', 'License updated.')) }, st.lic[a.id] ? t(l('Encerrar licença para lojas', 'End retail license')) : t(l('Licenciar para rede de lojas', 'License to a retail chain'))))) : h('p', { class: 'muted' }, t(l('Sem artistas.', 'No acts.'))),
    section(t(l('Linhas', 'Lines')), st.lines.length ? h('table', { class: 'tbl small' }, h('tr', null, ...[l('Artista', 'Act'), l('Produto', 'Product'), l('Estoque', 'Stock'), l('Vendidos', 'Sold'), l('Demanda/mês', 'Demand/mo'), l('Por quê', 'Why')].map((x) => h('th', null, t(x)))),
      st.lines.map((ln) => { const d = demandOf(s, ln); return h('tr', null, h('td', null, s.acts[ln.act]?.name ?? ''), h('td', null, t(SKUS[ln.sku].name), ln.drop ? ' ★' : ''), h('td', null, N(ln.stock)), h('td', null, N(ln.sold)), h('td', null, N(d.units)), h('td', null, d.why.map(([w, v]) => `${t(w)} ×${v.toFixed(2)}`).join(' · '))); })) : h('p', { class: 'muted small' }, '—')),
    section(t(l('Histórico', 'History')), logList(st.log)));
}
const activeDealMerch = (s: GameState, id: string) => !!activeDeal(s, id)?.scopes.includes('merch');

// ================================================================== circuito

let cGoal = 0;
function circuitTab(s: GameState): HTMLElement {
  const st = c17(s);
  const reu = reunionCands(s).sort((a, b) => b.fame - a.fame).slice(0, 6);
  const crowdActs = myActs(s).filter((a) => crowdOpen(s, a));
  return h('div', null,
    section(t(l('Guerra de headliners', 'Headliner war')), st.wars.length ? h('div', null, st.wars.map((w) => {
      const inv = (id: string) => (s.x4 as unknown as { fest8: { invites: { id: string; fi: number }[] } }).fest8.invites.find((x) => x.id === id);
      const A = inv(w.a), B = inv(w.b);
      return h('div', { class: 'card' }, h('p', null, t(l('{a}: dois festivais querem exclusividade. Aceitar um fecha a porta do outro por 2 anos.', '{a}: two festivals want exclusivity. Taking one shuts the other\'s door for 2 years.'), { a: s.acts[w.act]?.name ?? '' })),
        h('div', { class: 'row wrap' },
          A ? h('button', { class: 'btn small', onclick: () => res(pickWar(s, w.id, 'a'), l('Fechado.', 'Done.')) }, `${FESTIVALS[A.fi]?.name} — ${$(w.fa)}`) : null,
          B ? h('button', { class: 'btn small', onclick: () => res(pickWar(s, w.id, 'b'), l('Fechado.', 'Done.')) }, `${FESTIVALS[B.fi]?.name} — ${$(w.fb)}`) : null));
    })) : h('p', { class: 'muted small' }, t(l('Na primavera, se você tiver um ato com fama 60+, os festivais disputam a exclusividade dele. Tocar num festival também cria cláusula de raio (veja a Agenda).', 'In spring, if you have an act with fame 60+, festivals fight over its exclusivity. Playing a festival also creates a radius clause (see the Calendar).')))),
    section(t(l('Turnês de reunião', 'Reunion tours')), reu.length ? h('div', null, reu.map((a) => { const T = reunionTerms(s, a); return h('div', { class: 'card' },
      h('div', { class: 'row wrap' }, actLink(s, a.id), ` · ${t(l('garantia', 'guarantee'))} ${$(T.cost)} · ${t(l('bilheteria esperada', 'expected gross'))} ~${$(T.est)} · ${t(l('chance de topar', 'odds they agree'))} ${pct(T.p)}`),
      ul(T.why.map(([w, v]) => `${t(w)}: ${sg(v)}`)),
      h('button', { class: 'btn small', onclick: () => say(stageReunion(s, a.id)) }, t(l('Bancar a reunião', 'Fund the reunion')))); })) : h('p', { class: 'muted small' }, t(l('Ninguém separado há 8+ anos com fama suficiente.', 'No one split for 8+ years with enough fame.')))),
    section(t(l('Financiamento coletivo', 'Crowdfunding')), crowdActs.length ? h('div', null, crowdActs.map((a) => { const e = crowdEst(s, a); const g = cGoal || Math.round(e * 0.7); return h('div', { class: 'row wrap' },
      `${a.name}: ${t(l('estimativa', 'estimate'))} ~${$(e)} · ${t(l('meta', 'goal'))}`, ' ',
      select(g, [0.5, 0.7, 0.9, 1.1].map((k) => ({ value: Math.round(e * k), label: $(Math.round(e * k)) })), (v) => { cGoal = v; }),
      h('button', { class: 'btn tiny', onclick: () => say(launchCrowd(s, a.id, g)) }, t(l('Lançar campanha', 'Launch campaign')))); }),
      h('p', { class: 'small muted' }, t(l('Tudo ou nada. Atingiu a meta = promessa aos fãs: um disco (não single) em 12 meses. Não cumprir vira escândalo.', 'All or nothing. Hitting the goal = a promise to fans: a record (not a single) within 12 months. Breaking it becomes a scandal.'))),
      ul(st.crowd.slice(-5).map((c) => `${s.acts[c.act]?.name ?? ''}: ${$(c.raised)} · ${c.done === 'ok' ? t(l('entregue', 'delivered')) : c.done === 'broken' ? t(l('promessa quebrada', 'promise broken')) : t(l('prazo {y}', 'due {y}'), { y: dateOfWeek(s, c.due).year })}`))) : h('p', { class: 'muted small' }, t(l('Ainda não existe (2009+; 2003+ no jazz).', 'Not available yet (2009+; 2003+ for jazz).')))),
    section(t(l('Histórico', 'History')), logList(st.log)));
}

function bizArea(s: GameState): HTMLElement {
  const lic = lic17(s).list.filter((d) => d.status === 'offer').length;
  return h('div', { class: 'hub biz17' }, tabs('biz17', [
    { id: 'sale', label: t(hasLabel(s) ? l('Venda & catálogo', 'Sale & catalog') : l('Próximo passo', 'Next step')), icon: 'bank', badge: sale17(s).cat.length || undefined, render: () => saleTab(s) },
    { id: 'out', label: t(l('Canais', 'Channels')), icon: 'disc', render: () => outletsTab(s) },
    { id: 'venues', label: t(l('Casas', 'Venues')), icon: 'mic', render: () => venuesTab(s) },
    { id: 'lic', label: t(l('Licenças', 'Licensing')), icon: 'globe', badge: lic || undefined, render: () => licTab(s) },
    { id: 'img', label: t(l('Imagem & voz', 'Image & voice')), icon: 'star', badge: img17(s).deals.filter((d) => d.status === 'demand').length || undefined, render: () => imageTab(s) },
    { id: 'merch', label: t(l('Merch', 'Merch')), icon: 'shirt', render: () => merchTab(s) },
    { id: 'circ', label: t(l('Circuito', 'Circuit')), icon: 'trophy', badge: c17(s).wars.length || undefined, render: () => circuitTab(s) },
  ], rerender));
}
registerArea({ id: 'biz17', label: l('Negócios & direitos', 'Deals & rights'), icon: 'handshake', key: '', render: bizArea, badge: (s) => lic17(s).list.filter((d) => d.status === 'offer').length + sale17(s).cat.length + c17(s).wars.length || undefined });

// ================================================================== agenda de shows

let calAll = false;
function calArea(s: GameState): HTMLElement {
  const c = cal17(s), mine = playerShows(s), fw = festWeeks(s);
  const cities = new Set(mine.map((x) => x.city));
  const weeks = Array.from({ length: 12 }, (_, i) => s.week + i);
  const acts = [...new Set(mine.map((x) => x.actId))];
  const wkLabel = (w: number) => { const d = dateOfWeek(s, w); return `${d.dom}/${d.month + 1}/${d.year}`; };
  return h('div', { class: 'hub cal17' },
    h('p', { class: 'small muted' }, t(l('Shows seus, de outros selos e festivais nas próximas 12 semanas. Mesma cidade e semana = público dividido (pesa gênero e fama). Quem é bem menor costuma fugir da sua data. Blitz de divulgação corta o prejuízo pela metade.', 'Your shows, other labels\' shows and festivals over the next 12 weeks. Same city and week = split crowd (genre and fame weigh in). Much smaller acts usually move away from your date. A promo blitz halves the damage.'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: calAll, onchange: () => { calAll = !calAll; rerender(); } }), ' ', t(l('Mostrar todos os shows grandes (não só nas suas cidades)', 'Show all big shows (not just in your cities)'))),
    ...weeks.map((w) => {
      const my = mine.filter((x) => x.w === w);
      const npc = c.npc.filter((x) => x.w === w && (calAll ? (s.acts[x.a]?.fame ?? 0) >= 60 : cities.has(x.c)));
      const fs = fw.filter((f) => f.w === w);
      if (!my.length && !npc.length && !fs.length) return null;
      return section(`${t(l('Semana de', 'Week of'))} ${wkLabel(w)}`,
        ...my.map((x) => { const a = s.acts[x.actId]; if (!a) return null; const k = clashOf(s, a, x.city, w); return h('div', { class: 'card' },
          h('div', { class: 'row wrap' }, h('b', null, a.name), ` · ${t(cityById[x.city]?.name ?? l(x.city))} · ${x.kind === 'festival' ? x.label : x.kind === 'tour' ? t(l('turnê', 'tour')) : t(l('data agendada', 'booked date'))}`, ' ',
            k.mult < 1 ? pill(`−${Math.round((1 - k.mult) * 100)}%`, 'bad') : pill(t(l('livre', 'clear')), 'good')),
          k.why.length ? ul(k.why.map((y) => t(y))) : null,
          k.mult < 1 && x.kind !== 'festival' ? h('button', { class: 'btn tiny', onclick: () => res(blitz(s, a.id, x.city, w), l('Blitz contratada.', 'Blitz booked.')) }, t(l('Blitz de divulgação ({c})', 'Promo blitz ({c})'), { c: $(blitzCost(s, a)) })) : null); }),
        npc.length ? ul(npc.map((x) => `${s.acts[x.a]?.name ?? '?'} (${s.labels[s.acts[x.a]?.owner ?? '']?.name ?? t(l('independente', 'independent'))}) — ${t(cityById[x.c]?.name ?? l(x.c))}${x.mv ? ` · ${t(l('mudou a data para não bater com você', 'moved the date to avoid you'))}` : ''}`)) : null,
        fs.length ? ul(fs.map((f) => `★ ${f.name} — ${t(cityById[f.city]?.name ?? l(f.city))}`)) : null);
    }),
    v17(s).own.length ? section(t(l('Nas suas casas este mês', 'At your venues this month')), ul(v17(s).own.map((o) => `${vdef(o.id)?.name ?? ''} (${t(POLICY[o.policy].name)}): ${o.booked.map((id) => s.acts[id]?.name ?? '').join(', ') || '—'}`))) : null,
    section(t(l('Política de ingressos', 'Ticket policy')), acts.length ? h('div', null, acts.map((id) => { const a = s.acts[id]!; const cur = c.tix[id] ?? 'fair'; return h('div', { class: 'row wrap' }, a.name, ' ',
      select<Tix>(cur, (Object.keys(TIX) as Tix[]).filter((k) => s.year >= TIX[k].from).map((k) => ({ value: k, label: t(TIX[k].name) })), (v) => { setTix(s, id, v); rerender(); }), ' ', h('span', { class: 'small muted' }, t(TIX[cur].desc)),
      c.scalp[id] ? h('span', { class: 'small bad' }, ` · ${t(l('cambistas já lucraram ~{v}', 'scalpers have made ~{v}'), { v: $(c.scalp[id]) })}`) : null); })) : h('p', { class: 'muted small' }, t(l('Sem shows marcados.', 'No shows booked.')))),
    section(t(l('Histórico', 'History')), c.log.length ? ul(c.log.slice(0, 8).map((x) => t(x.t))) : h('p', { class: 'muted small' }, '—')));
}
registerArea({ id: 'cal17', label: l('Agenda de shows', 'Show calendar'), icon: 'calendar', key: '', render: calArea });


// r17 nav: abas reaproveitadas pelas páginas de carreira (Gravadora, Casa de shows)
export const bizTabs17 = { saleTab, outletsTab, venuesTab, licTab, imageTab, merchTab, circuitTab };
