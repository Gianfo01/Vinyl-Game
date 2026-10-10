// Rodada 18 (supply18): área "Cadeia física & acordos" — Prensagem (fábricas, filas, reservas, atraso, variantes,
// capacidade), Distribuição (distribuidor e agregador), Estoque (armazém, devoluções, ponta de estoque),
// Acordos (desenvolvimento, selo-vaidade, JV de gênero, pacotes) e Mercado (relatório U10).

import { FAMILIES, MARKETS, genreById, l, type L, type MarketId } from '../../data/world';
import { FORMATS } from '../../data/rules';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { MATERIAL_NAMES } from '../../sim/sys/industry/supply';
import { unitCostNow } from '../../sim/sys/industry/supply13';
import type { Material } from '../../sim/sys/industry/state';
import {
  AGGS18, DISTS18, agg18, boom18, cutOut18, digitalOn18, dist18, distAdv18, feeAdj18, lateOf18, partnerOf18, plantMats, plantsNow, queueOf18, queueWhy18,
  reserveCap18, resolveLate18, rushCost18, setAgg18, setDist18, setLatePol18, setPlant18, setPref18, setVariants18, stockList18, sup18, topCost18, variantCost18, variantsOk18, type LatePol,
} from '../../sim/sys/supply18';
import {
  deals18, devCandidates18, devChance18, devSignCost18, devStipend18, endJv18, ensureDeals18, exerciseDev18, impMonthly18, impOk18, impSetup18, jvCap18, jvPartners18, releaseDev18,
  startDev18, startImprint18, startJv18,
} from '../../sim/sys/deals18';
import { makeReport18, reps18, type Mix18, type Rep18 } from '../../sim/sys/report18';
import { money, playerActs } from '../../sim/util';
import { availableFormats } from '../../sim/production';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerArea } from '../registry';
import { tabs } from '../vis';
import { why18 } from '../explain18';

const pc = (v: number) => `${Math.round(v * 100)}%`;
const res = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const say = (r: { ok: boolean; text: L }) => { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); };
const sayL = (x: L) => { toast(t(x), 'info'); rerender(); };
const muted = (x: L) => h('p', { class: 'muted small' }, t(x));
const ul = (rows: (string | HTMLElement | null)[]) => h('ul', { class: 'small' }, rows.filter(Boolean).map((x) => h('li', null, x)));
const MATS: Material[] = ['shellac', 'vinyl', 'tape', 'polycarbonate'];
const LATE: { v: LatePol; n: L }[] = [
  { v: 'ask', n: l('Perguntar a cada vez', 'Ask each time') }, { v: 'smart', n: l('Decidir por mim (pesa o físico)', 'Decide for me (weighs physical)') },
  { v: 'postpone', n: l('Sempre adiar', 'Always postpone') }, { v: 'rush', n: l('Pagar prioridade; se não der, adiar', 'Pay priority; if not enough, postpone') }, { v: 'launch', n: l('Sempre lançar na data', 'Always launch on the date') },
];

// ================================================================== prensagem

let capPlant = '', capUnits = 5000;
function pressTab(s: GameState): HTMLElement {
  const st = sup18(s);
  const plants = plantsNow(s);
  const mats = MATS.filter((m) => plants.some((p) => plantMats(p, s.year).includes(m)));
  const mine = s.pendingReleases.filter((p) => s.acts[p.actId]?.owner === 'player' && st.book[p.id]);
  const recent = Object.entries(st.rel).slice(-8).reverse();
  return h('div', null,
    muted(l('Cada lançamento físico reserva uma fábrica por material. A fila depende da época (vinil em 2021: 22 semanas), da carga da fábrica e do seu tamanho como cliente. Se o disco não chega na data, a venda de lançamento do físico se perde: os fãs compram no dia ou nunca.', 'Each physical release books a plant per material. The queue depends on the era (vinyl in 2021: 22 weeks), plant load and your size as a client. If the record misses the date, physical launch sales are lost: fans buy on the day or never.')),
    h('div', { class: 'row wrap' }, h('b', null, t(l('Quando a fábrica atrasar:', 'When the plant runs late:'))), ' ',
      select<LatePol>(st.late, LATE.map((x) => ({ value: x.v, label: t(x.n) })), (v) => { setLatePol18(s, v); rerender(); })),
    section(t(l('Lançamentos programados', 'Scheduled releases')), mine.length ? h('div', null, mine.map((pr) => {
      const b = st.book[pr.id];
      const lt = lateOf18(s, pr, b);
      return h('div', { class: 'card' },
        h('div', { class: 'row wrap' }, h('b', null, pr.title), ` · ${s.acts[pr.actId]?.name ?? ''} · ${t(l('sai na semana {w}', 'out in week {w}'), { w: pr.week })} · ${N(pr.press)} ${t(l('cópias', 'copies'))} `,
          lt.weeks > 0 ? pill(t(l('{d} sem. atrasado ({p} do físico)', '{d} wk late ({p} of physical)'), { d: lt.weeks, p: pc(lt.share) }), 'bad') : pill(t(l('em dia', 'on time')), 'good'),
          b.bumped ? pill(t(l('furado por major', 'bumped by a major')), 'bad') : null, b.rush ? pill(t(l('prioridade', 'priority')), 'good') : null),
        ...(Object.keys(b.plant) as Material[]).map((m) => h('div', { class: 'row wrap small' }, `${t(MATERIAL_NAMES[m])}: `,
          select(b.plant[m] ?? '', plants.filter((p) => plantMats(p, s.year).includes(m)).map((p) => ({ value: p.id, label: `${t(p.name)} (${queueOf18(s, p, m)} ${t(l('sem.', 'wk'))}, ×${p.price.toFixed(2)})` })), (v) => res(setPlant18(s, pr.id, m, v), l('Fábrica trocada (fila recontada a partir de hoje).', 'Plant switched (queue recounted from today).'))),
          ' ', t(l('pronto na semana {w}', 'ready in week {w}'), { w: b.ready[m] ?? '?' }))),
        h('div', { class: 'row wrap' },
          lt.weeks > 0 ? h('button', { class: 'btn tiny', onclick: () => sayL(resolveLate18(s, pr.id, 'postpone')) }, t(l('Adiar {d} semanas', 'Postpone {d} weeks'), { d: lt.weeks })) : null,
          lt.weeks > 0 && !b.rush ? h('button', { class: 'btn tiny', onclick: () => sayL(resolveLate18(s, pr.id, 'rush')) }, t(l('Prioridade ({c})', 'Priority ({c})'), { c: $(rushCost18(s, pr)) })) : null,
          variantsOk18(s, pr.formats) ? h('span', { class: 'small' }, ' ', t(l('Variantes de vinil:', 'Vinyl variants:')), ' ', select(b.var ?? 0, [0, 1, 2, 3, 4].map((n) => ({ value: n, label: n ? `${n} (+${n * 4}% ${t(l('nas 6 primeiras semanas', 'in the first 6 weeks'))})` : t(l('só a capa padrão', 'standard sleeve only')) })), (v) => res(setVariants18(s, pr.id, v), l('Variantes definidas.', 'Variants set.'))), ' ', h('span', { class: 'muted' }, t(l('{c} cada; fãs compram várias — e a imprensa acusa de inflar as paradas.', '{c} each; fans buy several — and the press says you inflate the charts.'), { c: $(variantCost18(s)) }))) : null));
    })) : muted(l('Nenhum lançamento físico programado. A reserva é feita sozinha quando você programa um.', 'No physical release scheduled. Booking happens on its own when you schedule one.'))),
    section(t(l('Fábricas disponíveis em {y}', 'Plants available in {y}'), { y: s.year }), h('table', { class: 'tbl small' },
      h('tr', null, h('th', null, t(l('Fábrica', 'Plant'))), ...mats.map((m) => h('th', null, t(MATERIAL_NAMES[m]))), h('th', null, t(l('Defeitos', 'Defects'))), h('th', null, t(l('Preço', 'Price')))),
      ...plants.map((p) => h('tr', { title: t(p.desc) }, h('td', null, h('b', null, t(p.name)), h('div', { class: 'muted' }, `${t(p.where)} · ${t(p.desc)}`)),
        ...mats.map((m) => h('td', null, plantMats(p, s.year).includes(m) ? why18(s, 'supply.queue', { plant: p.id, mat: m }, `${queueOf18(s, p, m)} ${t(l('sem.', 'wk'))}`) : '—')),
        h('td', null, p.def > 0.005 ? pill(t(l('mais', 'more')), 'bad') : p.def < -0.005 ? pill(t(l('menos', 'fewer')), 'good') : t(l('média', 'avg'))),
        h('td', null, `×${p.price.toFixed(2)}`)))),
      h('div', { class: 'row wrap small' }, t(l('Preferência por material:', 'Preference by material:')), ...mats.map((m) => h('span', null, ' ', t(MATERIAL_NAMES[m]), ' ',
        select(st.pref[m] ?? '', [{ value: '', label: t(l('menor fila', 'shortest queue')) }, ...plants.filter((p) => plantMats(p, s.year).includes(m)).map((p) => ({ value: p.id, label: t(p.name) }))], (v) => { setPref18(s, m, v); rerender(); })))),
      ul(mats.map((m) => { const w = queueWhy18(m, s.year); return w ? `${t(MATERIAL_NAMES[m])}: ${t(w)}` : null; }))),
    section(t(l('Custo por unidade agora', 'Unit cost now')), ul(FORMATS.filter((f) => f.physical && availableFormats(s).includes(f.id)).map((f) => `${t(f.name)}: $${unitCostNow(s, f.id).toFixed(2)}`)),
      muted(l('Grau do material (barato/padrão/premium) fica em Indústria › Suprimentos. Edição limitada e vinil especial ficam no planejamento e nos Canais.', 'Material grade (cheap/standard/premium) lives in Industry › Supply. Limited editions and special vinyl live in planning and Channels.'))),
    section(t(l('Contrato de capacidade (take-or-pay)', 'Capacity contract (take-or-pay)')),
      st.top && st.top.until > s.week ? h('p', null, t(l('{p}: {u} cópias/mês até a semana {w} — fila de 1 semana lá.', '{p}: {u} copies/month until week {w} — 1-week queue there.'), { p: t(plantsNow(s).find((x) => x.id === st.top!.plant)?.name ?? l('?')), u: N(st.top.units), w: st.top.until })) :
        h('div', { class: 'row wrap' }, select(capPlant || plants[0]?.id || '', plants.map((p) => ({ value: p.id, label: t(p.name) })), (v) => { capPlant = v; }), ' ',
          select(capUnits, [2000, 5000, 10000, 25000].map((u) => ({ value: u, label: `${N(u)}/${t(l('mês', 'mo'))} · ${$(topCost18(s, u))}` })), (v) => { capUnits = v; rerender(); }), ' ',
          h('button', { class: 'btn small', onclick: () => res(reserveCap18(s, capPlant || plants[0]?.id || '', capUnits), l('Capacidade reservada por 12 meses.', 'Capacity reserved for 12 months.')) }, t(l('Reservar 12 meses', 'Reserve 12 months')))),
      muted(boom18(s) ? l('Época de aperto: quem tem capacidade reservada não é furado por pedido de superestrela.', 'Crunch era: reserved capacity can\'t be bumped by a superstar\'s order.') : l('Paga todo mês, usando ou não. Vale a pena quando as filas explodem.', 'Pays every month, used or not. Worth it when queues explode.'))),
    section(t(l('Últimos lançamentos', 'Recent launches')), recent.length ? ul(recent.map(([rid, x]) => { const rel = s.releases[rid]; if (!rel) return null; return `${rel.title}: ${t(plantsNow(s).find((p) => p.id === x.plant)?.name ?? l(x.plant))}${x.late ? ` · ${t(l('{d} sem. de atraso', '{d} wk late'), { d: x.late })}` : ''}${x.var ? ` · ${x.var} ${t(l('variantes', 'variants'))}` : ''}${x.def ? ` · ${x.def > 0 ? '+' : ''}${N(x.def)} ${t(l('refugo', 'rejects'))}` : ''}`; })) : muted(l('—', '—'))),
    section(t(l('Histórico', 'History')), st.log.length ? ul(st.log.slice(0, 10).map((x) => t(x.t))) : muted(l('—', '—'))));
}

// ================================================================== distribuição

function distTab(s: GameState): HTMLElement {
  const st = sup18(s), d = dist18(st.dist), g = agg18(st.agg);
  const fee = ([0.22, 0.2, 0.17, 0.13, 0.1, 0.08][s.player.hq] ?? 0.08) + feeAdj18(s);
  return h('div', null,
    section(t(l('Seu acordo de distribuição', 'Your distribution deal')),
      h('p', null, h('b', null, t(d.name)), partnerOf18(s) ? ` (${s.labels[partnerOf18(s)]?.name})` : '', ' · ', t(l('taxa efetiva', 'effective fee')), ' ', why18(s, 'supply.fee', {}, pc(fee)),
        ` · ${t(l('prazo do físico', 'physical terms'))} ${(s.year < 1970 ? 4 : 3) + d.lag} ${t(l('meses', 'months'))}`, d.res ? ` · ${t(l('reserva de devolução', 'returns reserve'))} ${pc(d.res)}` : ''),
      st.dist === 'major_pd' ? h('p', { class: 'small' }, t(l('Adiantamento a recuperar: {v} (25% do faturamento mensal). Mínimo de {n} lançamentos por ano.', 'Advance left to recoup: {v} (25% of monthly sales). Minimum {n} releases a year.'), { v: $(st.adv), n: d.minRel })) : null,
      st.dist === 'indie_net' ? h('p', { class: 'small' }, t(l('Saúde da rede: ', 'Network health: ')), pill(`${Math.round(st.health)}/100`, st.health < 40 ? 'bad' : st.health < 60 ? '' : 'good'), ' ', t(l('Abaixo de 25, pode quebrar levando ~60% do que deve.', 'Below 25, it may go bust taking ~60% of what it owes.'))) : null,
      muted(l('Distribuidores regionais por mercado (alcance extra) ficam em Indústria › Varejo.', 'Regional distributors per market (extra reach) live in Industry › Retail.'))),
    section(t(l('Trocar de distribuidor', 'Switch distributor')), h('div', null, DISTS18.filter((x) => s.year >= x.from && s.year <= x.to).map((x) => h('div', { class: 'card' },
      h('div', { class: 'row wrap' }, h('b', null, t(x.name)), ' ', x.fee ? pill(`${x.fee > 0 ? '+' : ''}${Math.round(x.fee * 100)} p.p.`, x.fee > 0 ? 'bad' : 'good') : null, x.reach ? pill(`+${pc(x.reach)} ${t(l('alcance físico', 'physical reach'))}`, 'good') : null,
        x.id === 'major_pd' ? pill(t(l('adiantamento ~{v}', 'advance ~{v}'), { v: $(distAdv18(s)) }), 'good') : null, ' ',
        st.dist === x.id ? pill(t(l('atual', 'current')), 'good') : h('button', { class: 'btn tiny', onclick: () => res(setDist18(s, x.id), l('Distribuidor trocado.', 'Distributor switched.')) }, t(l('Escolher', 'Choose')))),
      muted(x.desc))))),
    section(t(l('Digital: agregador', 'Digital: aggregator')), digitalOn18(s) ? h('div', null, AGGS18.filter((x) => s.year >= x.from).map((x) => h('div', { class: 'card' },
      h('div', { class: 'row wrap' }, h('b', null, t(x.name)), ' ', x.fee >= 0 ? pill(`${pc(x.fee)}`, '') : null, x.flat ? pill(t(l('{v}/artista/ano', '{v}/artist/yr'), { v: $(money(s, x.flat)) }), '') : null, x.pitch ? pill(`+${pc(x.pitch)} ${t(l('alcance digital', 'digital reach'))}`, 'good') : null, ' ',
        st.agg === x.id ? pill(t(l('atual', 'current')), 'good') : h('button', { class: 'btn tiny', onclick: () => res(setAgg18(s, x.id), l('Agregador trocado.', 'Aggregator switched.')) }, t(l('Escolher', 'Choose')))),
      muted(x.desc)))) : muted(l('Ainda não existe venda digital.', 'There are no digital sales yet.'))),
    g.id !== 'none' ? muted(l('Todos os agregadores deixam o master com você; o risco é a derrubada por suspeita de fraude (streams artificiais) — mais comum no de assinatura.', 'All aggregators leave the master with you; the risk is a takedown over suspected fraud (artificial streams) — most common with the subscription one.')) : null);
}

// ================================================================== estoque

function stockTab(s: GameState): HTMLElement {
  const st = sup18(s), list = stockList18(s);
  const ret = list.reduce((t0, x) => t0 + (x.rel.returns ?? 0), 0);
  return h('div', null,
    h('p', null, t(l('Armazém: {v}/mês por {n} cópias paradas.', 'Warehouse: {v}/month for {n} idle copies.'), { v: $(st.stor), n: N(list.reduce((t0, x) => t0 + x.stock, 0)) }), ' ',
      ret ? pill(t(l('{n} devolvidas pelo varejo', '{n} returned by retail'), { n: N(ret) }), 'bad') : null),
    muted(l('O varejo devolve o que não vende (frete e triagem por sua conta). Ponta de estoque: vende o encalhe a ~15% para o cesto de saldão — entra dinheiro e o armazém zera, mas o artista se ofende. Destruir só custa a trituração.', 'Retail returns what does not sell (freight and sorting on you). Cut-outs: sell the overstock at ~15% to bargain bins — cash in and storage cleared, but the artist is offended. Destroying only costs the shredding.')),
    list.length ? h('table', { class: 'tbl small' }, h('tr', null, ...[l('Disco', 'Record'), l('Estoque', 'Stock'), l('Vende/sem.', 'Sells/wk'), l('Armazém/mês', 'Storage/mo'), l('', '')].map((x) => h('th', null, t(x)))),
      ...list.slice(0, 25).map((x) => h('tr', null, h('td', null, x.rel.title, h('div', { class: 'muted' }, s.acts[x.rel.actId]?.name ?? '')), h('td', null, N(x.stock)), h('td', null, N(x.weekly)), h('td', null, $(x.cost)),
        h('td', null, s.week - x.rel.week >= 12 ? h('span', null, h('button', { class: 'btn tiny', onclick: () => res(cutOut18(s, x.rel.id), l('Vendido como ponta de estoque.', 'Sold off as cut-outs.')) }, t(l('Ponta de estoque', 'Cut-out'))), ' ',
          h('button', { class: 'btn tiny ghost', onclick: () => res(cutOut18(s, x.rel.id, true), l('Estoque destruído.', 'Stock destroyed.')) }, t(l('Destruir', 'Destroy')))) : h('span', { class: 'muted' }, t(l('recente', 'recent'))))))) : muted(l('Nada parado no armazém.', 'Nothing idle in the warehouse.')));
}

// ================================================================== acordos

let jvLb = '', jvFam = '';
function dealsTab(s: GameState): HTMLElement {
  ensureDeals18();
  const st = deals18(s);
  const cands = devCandidates18(s);
  const stars = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.fame >= 40);
  const partners = jvPartners18(s);
  const myFams = [...new Set(playerActs(s).map((id) => FAMILIES.find((f) => f.id === (genreById[s.acts[id]?.genre ?? '']?.family ?? ''))?.id).filter(Boolean) as string[])];
  return h('div', null,
    section(t(l('Contratos de desenvolvimento', 'Development deals')),
      muted(l('Opção barata sobre um artista livre: mesada, estúdio e ensaio por 12 ou 24 meses; nenhum rival pode contratá-lo. No fim, você exerce a opção (contrato indie), estende ou libera. Se ele estourar no incubador, pede o dobro.', 'A cheap option on a free artist: stipend, studio and rehearsal for 12 or 24 months; no rival can sign them. At the end you exercise the option (indie deal), extend or release. If they blow up in the incubator, they ask double.')),
      Object.values(st.dev).length ? h('div', null, Object.values(st.dev).map((d) => { const a = s.acts[d.act]; if (!a) return null; return h('div', { class: 'card row wrap' }, actLink(s, a.id), ` · ${t(l('até a semana {w}', 'until week {w}'), { w: d.end })} · ${$(d.stip)}/${t(l('mês', 'mo'))} · ${t(l('alcance', 'reach'))} ${Math.round(d.fame0)} → ${Math.round(a.fame)} `,
        h('button', { class: 'btn tiny', onclick: () => say(exerciseDev18(s, a.id)) }, t(l('Assinar ({v})', 'Sign ({v})'), { v: $(devSignCost18(s, d)) })), ' ',
        h('button', { class: 'btn tiny ghost', onclick: () => { releaseDev18(s, a.id); rerender(); } }, t(l('Liberar', 'Release')))); })) : null,
      cands.length ? h('table', { class: 'tbl small' }, h('tr', null, ...[l('Artista livre que você conhece', 'Free artist you know'), l('Alcance', 'Reach'), l('Aceita?', 'Accepts?'), l('', '')].map((x) => h('th', null, t(x)))),
        ...cands.slice(0, 10).map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, String(Math.round(a.fame))), h('td', null, why18(s, 'deal.dev', { act: a.id }, pc(devChance18(s, a).p))),
          h('td', null, h('button', { class: 'btn tiny', onclick: () => say(startDev18(s, a.id, 12)) }, t(l('12 meses', '12 months'))), ' ', h('button', { class: 'btn tiny', onclick: () => say(startDev18(s, a.id, 24)) }, t(l('24 meses', '24 months'))))))) :
        muted(l('Nenhum artista livre conhecido: o olheiro traz candidatos.', 'No known free artist: scouting brings candidates.')),
      muted(fmtMoney(s, l('Mesada atual: {v}/mês.', 'Current stipend: {v}/month.'), devStipend18(s)))),
    section(t(l('Selo-vaidade (imprint)', 'Vanity label (imprint)')),
      muted(l('Uma estrela da casa ganha selo próprio: confiança sobe, ela indica talentos do gosto dela (contrato de desenvolvimento pela metade) e os atos do selo pegam carona no nome (+4% de apelo). Você paga a estrutura e repassa 15% da receita desses atos para ela.', 'A house star gets their own label: trust rises, they recommend talent of their taste (development deal at half price) and imprint acts ride on the name (+4% appeal). You pay the structure and pass 15% of those acts\' revenue to the star.')),
      Object.values(st.imp).length ? ul(Object.values(st.imp).map((im) => `${im.name} (${s.acts[im.host]?.name ?? ''}) · ${im.acts.length} ${t(l('atos', 'acts'))} · ${t(l('já repassado', 'paid out'))} ${$(im.paid)}`)) : null,
      stars.length ? h('div', null, stars.map((a) => { const e = impOk18(s, a); return h('div', { class: 'row wrap small' }, actLink(s, a.id), ' ', e ? h('span', { class: 'muted' }, t(e)) : h('button', { class: 'btn tiny', onclick: () => say(startImprint18(s, a.id)) }, t(l('Criar selo ({v} + {m}/mês)', 'Create imprint ({v} + {m}/mo)'), { v: $(impSetup18(s)), m: $(impMonthly18(s)) }))); })) : muted(l('Nenhuma estrela (alcance 50+) no elenco ainda.', 'No star (reach 50+) on the roster yet.'))),
    section(t(l('Joint venture de gênero com uma major', 'Genre joint venture with a major')),
      muted(l('A major aporta capital (financiamento, não receita) e põe o marketing dela nos seus lançamentos do gênero (+15% de vendas); em troca leva 30% da receita deles. Depois de 5 anos ela pode querer comprar a sua metade.', 'The major puts in capital (financing, not revenue) and its marketing behind your releases in the genre (+15% sales); in return it takes 30% of their revenue. After 5 years it may want to buy your half.')),
      st.jv.length ? h('div', null, st.jv.map((j, i) => h('div', { class: 'row wrap small' }, `${s.labels[j.lb]?.name ?? '?'} × ${t(FAMILIES.find((f) => f.id === j.fam)?.name ?? l(j.fam))} · ${t(l('aporte', 'capital'))} ${$(j.cap)} · ${t(l('repassado', 'paid out'))} ${$(j.paid)}${j.cool ? ` · ${t(l('apoio esfriou', 'support cooled'))}` : ''} `,
        h('button', { class: 'btn tiny ghost', onclick: () => say(endJv18(s, i)) }, t(l('Desfazer (devolve o aporte)', 'Dissolve (return capital)')))))) : null,
      partners.length && myFams.length ? h('div', { class: 'row wrap' }, select(jvLb || partners[0], partners.map((id) => ({ value: id, label: s.labels[id].name })), (v) => { jvLb = v; }), ' ',
        select(jvFam || myFams[0], myFams.map((f) => ({ value: f, label: t(FAMILIES.find((x) => x.id === f)!.name) })), (v) => { jvFam = v; }), ' ',
        h('button', { class: 'btn small', onclick: () => say(startJv18(s, jvLb || partners[0], jvFam || myFams[0])) }, t(l('Propor JV (aporte ~{v})', 'Propose JV (~{v} capital)'), { v: $(jvCap18(s)) }))) : muted(l('Precisa de uma major sem rivalidade forte e de artistas seus no gênero.', 'Needs a major without strong rivalry and your own artists in the genre.'))),
    section(t(l('Pacotes de contrato novos', 'New contract packages')), muted(l('Na tela de proposta (cláusulas): "Serviços de selo" (artista dono do master paga 25% por distribuição + marketing + equipe) e "P&D" (você só prensa e distribui por 18%). Ambos viram modelo Distribuição.', 'On the offer screen (clauses): "Label services" (the master-owning artist pays 25% for distribution + marketing + staff) and "P&D" (you only press and distribute for 18%). Both become the Distribution model.'))),
    section(t(l('Histórico', 'History')), st.log.length ? ul(st.log.slice(0, 8).map((x) => t(x.t))) : muted(l('—', '—'))));
}
const fmtMoney = (s: GameState, x: L, v: number): L => ({ pt: x.pt.replace('{v}', $(v)), en: x.en.replace('{v}', $(v)) });

// ================================================================== mercado (U10)

function repView(s: GameState, rp: Rep18): HTMLElement {
  const mks = Object.keys(rp.mix) as MarketId[];
  const cols: [keyof Mix18, L][] = [['phys', l('Físico', 'Physical')], ['vinyl', l('Vinil', 'Vinyl')], ['tape', l('Fita', 'Tape')], ['cd', l('CD', 'CD')], ['dl', l('Download', 'Download')], ['stream', l('Streaming', 'Streaming')], ['radio', l('Rádio/execução', 'Radio/perf.')]];
  const used = cols.filter(([k]) => mks.some((m) => (rp.mix[m]?.[k] ?? 0) > 0.005));
  const gname = (g: string) => t(genreById[g]?.name ?? l(g));
  return h('div', null,
    h('h4', null, t(l('Relatório {m}/{y}', 'Report {m}/{y}'), { m: rp.m + 1, y: rp.y })),
    h('table', { class: 'tbl small' }, h('tr', null, h('th', null, t(l('Mercado', 'Market'))), ...used.map(([, n]) => h('th', null, t(n)))),
      ...mks.map((m) => h('tr', null, h('td', null, why18(s, 'market.mix', { mk: m }, t(MARKETS.find((x) => x.id === m)!.name))), ...used.map(([k]) => h('td', null, pc(rp.mix[m]![k] ?? 0)))))),
    h('div', { class: 'row wrap small' },
      h('div', null, h('b', null, t(l('Subindo', 'Rising'))), ul(rp.hot.map((x) => `${gname(x.g)} (${pc(x.share)} ${t(l('das paradas', 'of charts'))}, +${(x.d * 100).toFixed(1)} p.p.)`))),
      h('div', null, h('b', null, t(l('Caindo', 'Falling'))), ul(rp.cold.map((x) => `${gname(x.g)} (${(x.d * 100).toFixed(1)} p.p.)`)))),
    h('div', null, h('b', null, t(l('Concorrência nas paradas (13 semanas)', 'Competition on the charts (13 weeks)'))), rp.comp.length ? ul(rp.comp.map((c) => `${s.labels[c.lb]?.name ?? c.lb}: ${c.n} ${t(l('entradas', 'entries'))} · ${t(l('melhor', 'best'))} #${c.pos} ${c.top}`)) : muted(l('—', '—'))),
    h('p', { class: 'small' }, t(l('Varejo físico', 'Physical retail')), ' ', pill(`${Math.round(rp.retail * 100)}`, rp.retail < 0.6 ? 'bad' : rp.retail > 1.05 ? 'good' : ''), ' · ',
      t(l('Fila das prensas: vinil {v} sem.', 'Pressing queues: vinyl {v} wk'), { v: rp.queue.vinyl }), rp.queue.cd ? ` · CD ${rp.queue.cd}` : '', rp.queue.tape ? ` · ${t(l('fita', 'tape'))} ${rp.queue.tape}` : '', ' · ',
      t(l('Adiantamento médio dos rivais', 'Rivals\' average advance')), ' ', rp.adv ? why18(s, 'market.adv', {}, $(rp.adv)) : '—'),
    rp.notes.length ? section(t(l('Leitura do analista', 'Analyst\'s reading')), ul(rp.notes.map((n) => t(n)))) : null);
}
function repTab(s: GameState): HTMLElement {
  const list = reps18(s).list;
  return h('div', null,
    muted(l('Sai todo trimestre (todo mês com um analista na equipe) e chega na Caixa de entrada.', 'Comes out every quarter (every month with an analyst on staff) and lands in the Inbox.')),
    list.length ? repView(s, list[0]) : repView(s, makeReport18(s)),
    list.length > 1 ? section(t(l('Relatórios anteriores', 'Previous reports')), ul(list.slice(1).map((r) => `${r.m + 1}/${r.y}: ${t(l('físico (EUA)', 'physical (NA)'))} ${pc(r.mix.na?.phys ?? 0)} · ${t(l('vinil', 'vinyl'))} ${r.queue.vinyl} ${t(l('sem.', 'wk'))} · ${r.hot.map((x) => t(genreById[x.g]?.name ?? l(x.g))).join(', ')}`))) : null,
  );
}

function supplyArea(s: GameState): HTMLElement {
  const st = sup18(s);
  const late = s.pendingReleases.filter((p) => st.book[p.id] && lateOf18(s, p, st.book[p.id]).weeks > 0).length;
  return h('div', { class: 'hub supply18' }, tabs('supply18', [
    { id: 'press', label: t(l('Prensagem', 'Pressing')), icon: 'disc', badge: late || undefined, render: () => pressTab(s) },
    { id: 'dist', label: t(l('Distribuição', 'Distribution')), icon: 'globe', render: () => distTab(s) },
    { id: 'stock', label: t(l('Estoque', 'Stock')), icon: 'house', render: () => stockTab(s) },
    { id: 'deals', label: t(l('Acordos', 'Deals')), icon: 'handshake', badge: Object.keys(deals18(s).dev).length || undefined, render: () => dealsTab(s) },
    { id: 'rep', label: t(l('Mercado', 'Market')), icon: 'chart-up', render: () => repTab(s) },
  ], rerender));
}
registerArea({ id: 'supply18', label: l('Cadeia física & acordos', 'Supply chain & deals'), icon: 'disc', key: '', render: supplyArea,
  badge: (s) => { const st = sup18(s); return s.pendingReleases.filter((p) => st.book[p.id] && lateOf18(s, p, st.book[p.id]).weeks > 0).length || undefined; },
  visible: (s) => s.config.role !== 'artist' });
