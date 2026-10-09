// Interface do dono de festival (rodada 12). A mesma ficha aparece em Shows (festival próprio) e em
// Empreendimentos (aba Festival): conceito, line-up por palco e horário com negociação, ingressos em
// lotes, financiamento com fluxo de caixa datado e a história das edições com os porquês.

import { CITIES, FAMILIES, l, type FamilyId, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  IDENTS, LENS, SPONS, TECH, TIMES, announce12, ask12, clashes12, drop12, f12, festOf, flow12, found12, loan12, loanSize, lotPrice, move12, muOf, offer12, openEarly12,
  proj12, setCal12, setIdent12, setSales12, stagesOf, structCost, sync12, takeSponsor12, ventureOf, type Ident,
} from '../../sim/sys/fest12';
import { guestAccepts, isMine, liveOf, type OwnFestival } from '../../sim/sys/live';
import { funds, type Holder, type Venture } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { visibleAct } from '../../sim/future';
import { $, N, cityName, monthName, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { openScene, registerSection } from '../registry';
import { festHype12 } from './hype12';
import { chips, ic, meter, stat, tabs } from '../vis';
import { festivalDayView, openFestivalEditor } from './live/festival';
import { BODY } from './ventures9';
import { fameText } from '../../sim/sys/fame15';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, cls = 'btn small', dis = false) => h('button', { class: cls, disabled: dis, onclick: fn }, typeof label === 'string' ? label : t(label));
const ul = (xs: L[], cls = 'small') => (xs.length ? h('ul', { class: cls }, xs.map((x) => h('li', null, t(x)))) : null);
const PHASES: L[] = [l('Conceito', 'Concept'), l('Financiamento', 'Financing'), l('Contratação', 'Booking'), l('Vendas', 'Sales'), l('Operação', 'Operations'), l('Festival', 'Festival')];
const phaseOf = (mu: number) => (mu > 9 ? 0 : mu > 6 ? 1 : mu > 3 ? 2 : mu > 0 ? 3 : 4);

// ---------------------------------------------------------------- conceito

function conceptTab(s: GameState, f: OwnFestival): HTMLElement {
  const x = f12(s, f);
  const mu = muOf(s, f);
  const ph = phaseOf(mu);
  return h('div', null,
    h('div', { class: 'row wrap small' }, PHASES.map((p, i) => pill(t(p), i === ph ? 'good' : i < ph ? '' : 'muted'))),
    h('p', { class: 'small' }, t(l('Próxima edição: {m}/{y} — faltam {n} mês(es). Fundado em {f}.', 'Next edition: {m}/{y} — {n} month(s) to go. Founded in {f}.'), { m: monthName(f.month), y: f.nextYear, n: mu, f: f.founded })),
    h('div', { class: 'lv-form' },
      h('label', null, t(l('Nome', 'Name')), h('input', { type: 'text', maxlength: 40, value: f.name, onchange: (e: Event) => say(setCal12(s, f.id, { name: (e.target as HTMLInputElement).value }), l('Renomeado.', 'Renamed.')) })),
      h('label', null, t(l('Identidade', 'Identity')), select<Ident>(x.ident, (Object.keys(IDENTS) as Ident[]).map((k) => ({ value: k, label: t(IDENTS[k].name) })), (k) => say(setIdent12(s, f.id, k), l('Identidade definida.', 'Identity set.')))),
      x.ident === 'genre' ? h('label', null, t(l('Gênero', 'Genre')), select<FamilyId>(x.fam, FAMILIES.map((fm) => ({ value: fm.id, label: t(fm.name) })), (fm) => say(setIdent12(s, f.id, 'genre', fm), l('Gênero definido.', 'Genre set.')))) : null,
      h('label', null, t(l('Mês', 'Month')), select(f.month, Array.from({ length: 12 }, (_, i) => ({ value: i, label: monthName(i) })), (m) => say(setCal12(s, f.id, { month: m }), l('Data marcada.', 'Date set.')))),
      h('label', null, t(l('Dias', 'Days')), select(f.days, [1, 2, 3].map((d) => ({ value: d, label: String(d) })), (d) => say(setCal12(s, f.id, { days: d }), l('Duração definida.', 'Length set.')))),
      h('label', null, t(l('Ingresso por dia (US$ reais)', 'Ticket per day (real US$)')), h('input', { type: 'number', min: 5, max: 400, value: f.price, onchange: (e: Event) => say(setCal12(s, f.id, { price: Number((e.target as HTMLInputElement).value) }), l('Preço definido.', 'Price set.')) }), h('small', { class: 'muted' }, ` ≈ ${$(money(s, f.price))}`)),
    ),
    h('p', { class: 'small muted' }, t(IDENTS[x.ident].desc)),
    h('div', { class: 'row' }, btn(l('Terreno (palcos, banheiros, segurança)', 'Grounds (stages, toilets, security)'), () => openFestivalEditor(s, f.id), 'btn'), h('span', { class: 'small muted' }, ` ${cityName(f.cityId)} · ${t(l('{n} palco(s)', '{n} stage(s)'), { n: stagesOf(f) })}`)),
    x.cyc.notes.length ? section(t(l('Nesta edição até agora', 'This edition so far')), ul(x.cyc.notes)) : null,
  );
}

// ---------------------------------------------------------------- line-up

const bk = { act: '', stage: 0, time: 2, len: 60, excl: false, pct: 1 };
let lastCounter: { fid: string; act: string } | null = null;

function lineupTab(s: GameState, f: OwnFestival): HTMLElement {
  const x = f12(s, f);
  const n = stagesOf(f);
  const cl = clashes12(s, f);
  const grid = h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, h('th', null, ''), ...Array.from({ length: n }, (_, i) => h('th', null, t(l('Palco {n}', 'Stage {n}'), { n: i + 1 }))))),
    h('tbody', null, [3, 2, 1, 0].map((tm) => h('tr', null, h('th', null, t(TIMES[tm])), ...Array.from({ length: n }, (_, st) => {
      const d = Object.values(x.deals).find((y) => y.stage === st && y.time === tm);
      const a = d ? s.acts[d.actId] : undefined;
      if (!d || !a) return h('td', { class: 'muted small' }, '—');
      const fee = f.lineup.find((y) => y.actId === a.id)?.fee ?? 0;
      return h('td', { class: 'small' }, h('b', null, a.name), ` (${fameText(s, a.id)})`, h('br'),
        `${d.len}′ · ${t(TECH[d.tech])}${d.excl ? ' · ★' : ''} · ${isMine(s, a.id) ? t(l('seu', 'yours')) : $(money(s, fee))}`, h('br'),
        select(`${d.stage}:${d.time}`, Array.from({ length: n * 4 }, (_, i) => ({ value: `${Math.floor(i / 4)}:${i % 4}`, label: `${t(l('P', 'S'))}${Math.floor(i / 4) + 1} · ${t(TIMES[i % 4])}` })), (v) => { const [ps, pt] = v.split(':').map(Number); say(move12(s, f.id, a.id, ps, pt), l('Grade alterada.', 'Schedule changed.')); }, { 'aria-label': t(l('Mover', 'Move')) }),
        btn('✕', () => { drop12(s, f.id, a.id); rerender(); }, 'btn tiny ghost'));
    })))));
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && !x.deals[a.id]);
  const guests = Object.values(s.acts).filter((a) => visibleAct(s, a) && !isMine(s, a.id) && (a.status === 'active' || a.status === 'emerging') && a.fame > 5 && !x.deals[a.id]).sort((a, b) => b.fame - a.fame).slice(0, 50);
  if (!bk.act || x.deals[bk.act] || !s.acts[bk.act]) bk.act = mine[0]?.id ?? guests[0]?.id ?? '';
  bk.stage = Math.min(bk.stage, Math.max(0, n - 1));
  const a = s.acts[bk.act];
  const ask = a ? ask12(s, f, a, bk) : null;
  const counter = lastCounter && lastCounter.fid === f.id && lastCounter.act === bk.act;
  const send = (fee: number) => {
    const res = offer12(s, f.id, bk.act, { ...bk, fee });
    lastCounter = res.res === 'counter' ? { fid: f.id, act: bk.act } : null;
    toast(t(res.text), res.res === 'yes' ? 'good' : res.res === 'counter' ? 'warn' : 'bad');
    rerender();
  };
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Cada palco tem quatro horários. Públicos parecidos no mesmo horário se dividem; dois grandes nomes juntos frustram quem teve de escolher.', 'Each stage has four slots. Similar crowds in the same slot split; two big names at once frustrate whoever had to choose.'))),
    grid,
    cl.why.length ? h('div', { class: 'warn small' }, ic('warning'), ' ', ul(cl.why)) : h('p', { class: 'small good' }, t(l('Sem choques de horário.', 'No scheduling clashes.'))),
    section(t(l('Negociar atração', 'Negotiate an act')),
      h('div', { class: 'lv-form' },
        h('label', null, t(l('Atração', 'Act')), select(bk.act, [...mine.map((y) => ({ value: y.id, label: `★ ${y.name} (${t(l('seu', 'yours'))})` })), ...guests.map((y) => ({ value: y.id, label: `${y.name} · ${fameText(s, y.id)}${guestAccepts(f, y) ? '' : ' ✗'}` }))], (v) => { bk.act = v; lastCounter = null; rerender(); })),
        h('label', null, t(l('Palco', 'Stage')), select(bk.stage, Array.from({ length: n }, (_, i) => ({ value: i, label: String(i + 1) })), (v) => { bk.stage = v; rerender(); })),
        h('label', null, t(l('Horário (posição no cartaz)', 'Slot (billing)')), select(bk.time, [3, 2, 1, 0].map((i) => ({ value: i, label: t(TIMES[i]) })), (v) => { bk.time = v; rerender(); })),
        h('label', null, t(l('Duração do set', 'Set length')), select(bk.len, LENS.map((m) => ({ value: m, label: `${m} min` })), (v) => { bk.len = v; rerender(); })),
        h('label', null, h('input', { type: 'checkbox', checked: bk.excl, onchange: (e: Event) => { bk.excl = (e.target as HTMLInputElement).checked; rerender(); } }), ' ', t(l('Exclusividade regional', 'Regional exclusivity'))),
        h('label', null, t(l('Oferta', 'Offer')), select(bk.pct, [0.8, 0.9, 1, 1.15].map((p) => ({ value: p, label: `${Math.round(p * 100)}% ${t(l('do pedido', 'of the ask'))}` })), (v) => { bk.pct = v; rerender(); })),
      ),
      a && ask ? h('div', { class: 'small' },
        ask.refuse ? h('p', { class: 'bad' }, t(ask.refuse)) : h('p', null, t(l('Pedido: {f} · quer "{w}" · {tech}', 'Ask: {f} · wants "{w}" · {tech}'), { f: $(money(s, ask.fee)), w: TIMES[ask.time], tech: TECH[ask.tech] })),
        ul(ask.why),
        h('div', { class: 'row' },
          btn(t(l('Propor {f}', 'Offer {f}'), { f: $(money(s, Math.round(ask.fee * bk.pct))) }), () => send(Math.round(ask.fee * bk.pct)), 'btn small primary', !!ask.refuse),
          counter ? btn(t(l('Aceitar contraproposta ({f})', 'Accept counter-offer ({f})'), { f: $(money(s, ask.fee)) }), () => send(ask.fee), 'btn small') : null),
        h('p', { class: 'muted' }, t(l('30% do cachê é adiantado na assinatura; o resto vence no dia do festival.', '30% of the fee is advanced on signing; the rest is due on festival day.')))) : null),
  );
}

// ---------------------------------------------------------------- ingressos

function ticketsTab(s: GameState, f: OwnFestival): HTMLElement {
  const x = f12(s, f);
  const p = proj12(s, f);
  const c = x.cyc;
  const mu = muOf(s, f);
  const phase = c.phase === 'plan' ? l('Vendas fechadas', 'Sales closed') : c.phase === 'early' ? l('Early bird (60% do preço, line-up secreto)', 'Early bird (60% of price, secret line-up)') : c.lot >= 2 ? l('Lote 2 (125%)', 'Tier 2 (125%)') : l('Lote 1 (100%)', 'Tier 1 (100%)');
  return h('div', null,
    chips(stat('fans', `${N(c.sold)} / ${N(p.cap)}`, l('Vendidos / capacidade', 'Sold / capacity')), stat('chart-up', N(p.demand), l('Procura prevista', 'Expected demand')), stat('money', $(c.cash), l('Receita de ingressos já no caixa', 'Ticket revenue already banked'), 'good'), stat('money', $(money(s, p.avg) * lotPrice(x)), l('Preço do lote atual (média)', 'Current tier price (average)'))),
    meter('fans', l('Vendidos', 'Sold'), c.sold, Math.max(1, p.cap)),
    h('p', null, pill(t(phase), c.phase === 'plan' ? '' : 'good'), c.early ? ` ${t(l('{n} no early bird', '{n} on early bird'), { n: N(c.early) })}` : ''),
    h('div', { class: 'row wrap' },
      btn(l('Abrir early bird', 'Open early bird'), () => say(openEarly12(s, f.id), l('Early bird aberto.', 'Early bird open.')), 'btn small', c.phase !== 'plan' || mu < 3),
      btn(l('Anunciar o line-up', 'Announce the line-up'), () => say(announce12(s, f.id), l('Line-up anunciado: lote 1 à venda.', 'Line-up announced: tier 1 on sale.')), 'btn small primary', c.phase === 'onsale'),
      f.days > 1 ? h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: c.passes, onchange: (e: Event) => { setSales12(s, f.id, { passes: (e.target as HTMLInputElement).checked }); rerender(); } }), ' ', t(l('Passes de um dia', 'Day passes'))) : null,
      h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: c.packages, onchange: (e: Event) => { setSales12(s, f.id, { packages: (e.target as HTMLInputElement).checked }); rerender(); } }), ' ', t(l('Pacotes (VIP, camping)', 'Packages (VIP, camping)')))),
    h('p', { class: 'small muted' }, t(l('Early bird só vende para quem confia na marca ({e} compradores possíveis): adianta caixa com desconto. Anunciar cedo (4+ meses) dá +6% de expectativa; sem anúncio até 2 meses antes, ele sai tarde (−15%). Pacotes rendem mais por pessoa, mas exigem conforto 60+.', 'Early bird only sells to people who trust the brand ({e} possible buyers): cash early at a discount. Announcing early (4+ months) adds +6% buzz; with no announcement 2 months out it goes out late (−15%). Packages earn more per head but need comfort 60+.'), { e: N(p.early) })),
    section(t(l('Por que essa procura', 'Why this demand')), ul(p.why)),
  );
}

// ---------------------------------------------------------------- finanças

function moneyTab(s: GameState, f: OwnFestival): HTMLElement {
  const x = f12(s, f);
  const v = ventureOf(s, f.id);
  const p = proj12(s, f);
  const att = Math.min(p.cap, p.demand);
  const tix = att * money(s, p.avg);
  const extras = att * money(s, 6) * f.days;
  const spon = x.cyc.sponsors.reduce((t0, y) => t0 + y.total, 0);
  const fees = f.lineup.reduce((t0, y) => t0 + money(s, y.fee), 0);
  const struct = structCost(s, f);
  const paper = tix + extras + spon - fees - struct;
  const flow = flow12(s, f);
  const worst = flow.reduce((w, r) => (r.acc < w.acc ? r : w), flow[0] ?? { m: 0, acc: 0, inn: 0, out: 0 });
  const hold: Holder = v?.owner ?? 'label';
  return h('div', null,
    h('p', { class: 'small' }, t(l('Dono: {h} ({c} disponíveis).', 'Owner: {h} ({c} available).'), { h: hold === 'label' ? l('caixa do selo', 'label cash') : l('patrimônio pessoal', 'personal wealth'), c: $(funds(s, hold)) })),
    chips(stat('money', $(tix), l('Ingressos (no papel)', 'Tickets (on paper)')), stat('money', $(extras), l('Bar, comida, merch', 'Bar, food, merch')), stat('money', $(spon), l('Patrocínios', 'Sponsors')), stat('money', $(-fees), l('Cachês', 'Fees'), 'bad'), stat('money', $(-struct), l('Estrutura e produção', 'Structure and production'), 'bad'), stat('sparkle', $(paper), l('Resultado no papel', 'Result on paper'), paper >= 0 ? 'good' : 'bad')),
    flow.length ? h('div', null,
      h('h5', null, t(l('Fluxo de caixa até o festival', 'Cash flow up to the festival'))),
      h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ...[l('Mês', 'Month'), l('Entra', 'In'), l('Sai', 'Out'), l('Acumulado', 'Running')].map((y) => h('th', null, t(y))))),
        h('tbody', null, flow.map((r) => h('tr', null, h('td', null, `${monthName(r.m % 12)}/${Math.floor(r.m / 12)}`), h('td', { class: 'good' }, $(r.inn)), h('td', { class: 'bad' }, $(-r.out)), h('td', { class: r.acc < 0 ? 'bad' : '' }, $(r.acc)))))),
      worst && worst.acc < 0 ? h('p', { class: 'warn small' }, ic('warning'), ' ', t(l('Aperto de caixa: o pior ponto é {v} em {m}. Lucrativo no papel não paga sinal de fornecedor — patrocínio, early bird ou adiantamento da tiqueteira cobrem o buraco.', 'Cash crunch: the low point is {v} in {m}. Profitable on paper does not pay supplier deposits — sponsors, early bird or a ticketing advance bridge the gap.'), { v: $(worst.acc), m: `${monthName(worst.m % 12)}/${Math.floor(worst.m / 12)}` })) : null) : null,
    h('h5', null, t(l('Compromissos datados', 'Dated commitments'))),
    x.commits.filter((c) => !c.done).length ? h('ul', { class: 'small' }, x.commits.filter((c) => !c.done).sort((a, b) => a.due - b.due).map((c) => h('li', { class: c.amt < 0 ? 'bad' : 'good' }, `${monthName(c.due % 12)}/${Math.floor(c.due / 12)} · ${$(c.amt)} · ${t(c.what)}`))) : h('p', { class: 'small muted' }, t(l('Nada pendente. Fornecedores fecham contrato 3 meses antes (sinal de 50%).', 'Nothing pending. Suppliers sign 3 months out (50% deposit).'))),
    h('h5', null, t(l('Patrocínio', 'Sponsorship'))),
    x.cyc.sponsors.length ? h('p', { class: 'small' }, x.cyc.sponsors.map((y) => `${y.name} (${t(SPONS[y.k].name)}) ${$(y.total)}`).join(' · ')) : null,
    x.cyc.offers.length ? h('div', null, x.cyc.offers.map((o) => h('div', { class: 'row wrap small' },
      h('b', null, o.name), ` · ${t(SPONS[o.k].name)} · ${$(o.total)} · ${t(l('meta {m} pessoas', 'target {m} people'), { m: N(o.min) })}`,
      SPONS[o.k].clash?.includes(x.ident) ? pill(t(l('destoa da identidade', 'clashes with identity')), 'bad') : pill(t(l('combina', 'fits')), 'good'),
      btn(l('Aceitar (40% agora, 60% depois)', 'Accept (40% now, 60% after)'), () => say(takeSponsor12(s, f.id, o.id, true), l('Patrocínio fechado.', 'Sponsorship signed.')), 'btn tiny primary'),
      btn(l('Recusar', 'Decline'), () => say(takeSponsor12(s, f.id, o.id, false), l('Recusado.', 'Declined.')), 'btn tiny ghost')))) : h('p', { class: 'small muted' }, t(l('Ofertas chegam entre 10 e 2 meses antes, conforme a identidade e o prestígio.', 'Offers arrive 10 to 2 months out, depending on identity and prestige.'))),
    h('div', { class: 'row' }, btn(t(l('Adiantamento da tiqueteira: {v} agora, devolve 120% no dia', 'Ticketing advance: {v} now, repay 120% on the day'), { v: $(loanSize(s, f)) }), () => say(loan12(s, f.id), l('Adiantamento recebido.', 'Advance received.')), 'btn small', x.cyc.loan || x.cyc.phase === 'plan')),
  );
}

// ---------------------------------------------------------------- história

function historyTab(s: GameState, f: OwnFestival): HTMLElement {
  const x = f12(s, f);
  const last = f.editions.at(-1);
  return h('div', null,
    h('p', null, t(l('Público fiel (vem pelo festival, não pela atração): {n}', 'Loyal crowd (comes for the festival, not the act): {n}'), { n: N(x.loyal) })),
    meter('star', l('Prestígio do festival', 'Festival prestige'), f.rep),
    last ? btn(t(l('Rever a edição {y}', 'Replay the {y} edition'), { y: last.year }), () => openScene(`${f.name} ${last.year}`, (close) => festivalDayView(s, f, last, close)), 'btn small ghost') : null,
    x.hist.length ? h('div', null, x.hist.slice().reverse().map((e) => h('details', { class: 'small' },
      h('summary', null, `${e.y} · ${t(e.tag)} · ${N(e.crowd)}${e.cap ? ` / ${N(e.cap)}` : ''} · ${t(l('nota', 'rating'))} ${e.rating || '—'} · `, h('span', { class: e.profit < 0 ? 'bad' : 'good' }, $(e.profit)), ` · ${e.head}`),
      ul(e.why)))) : h('p', { class: 'muted small' }, t(l('Nenhuma edição ainda. Um festival pequeno, respeitado e lucrativo também é sucesso.', 'No editions yet. A small, respected, profitable festival is success too.'))),
  );
}

// ---------------------------------------------------------------- ficha única

export function festCard12(s: GameState, f: OwnFestival): HTMLElement {
  const x = f12(s, f);
  const mu = muOf(s, f);
  return h('div', { class: 'lv-fest' },
    h('header', null, ic('flag', 2), h('b', null, f.name), ' ', pill(cityName(f.cityId)), pill(`${monthName(f.month)}/${f.nextYear} · ${f.days}d`), pill(t(IDENTS[x.ident].name)), pill(t(l('{n} edições', '{n} editions'), { n: x.hist.length }))),
    festHype12(s, f.id),
    tabs(`fest12:${f.id}`, [
      { id: 'concept', label: t(l('Conceito', 'Concept')), icon: 'bulb', render: () => conceptTab(s, f) },
      { id: 'lineup', label: t(l('Line-up', 'Line-up')), icon: 'note', badge: clashes12(s, f).why.length || undefined, render: () => lineupTab(s, f) },
      { id: 'tickets', label: t(l('Ingressos', 'Tickets')), icon: 'fans', render: () => ticketsTab(s, f) },
      { id: 'money', label: t(l('Finanças', 'Finances')), icon: 'money', badge: x.cyc.offers.length || undefined, render: () => moneyTab(s, f) },
      { id: 'history', label: t(l('História', 'History')), icon: 'star', render: () => historyTab(s, f) },
    ], rerender),
    mu <= 1 && mu > 0 ? h('p', { class: 'small warn' }, t(l('Mês que vem é o festival: no dia, chuva, atrasos, panes e filas pedem decisões suas.', 'Next month is the festival: on the day, rain, delays, failures and queues will need your calls.'))) : null,
  );
}

const draft = { name: '', city: '', month: 6, ident: 'discovery' as Ident, owner: 'label' as Holder };
function foundForm12(s: GameState): HTMLElement {
  draft.city ||= s.config.homeCity;
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
  return h('div', { class: 'lv-form' },
    h('label', null, t(l('Nome', 'Name')), h('input', { type: 'text', value: draft.name, maxlength: 40, oninput: (e: Event) => (draft.name = (e.target as HTMLInputElement).value) })),
    h('label', null, t(l('Cidade', 'City')), select(draft.city, cities.map((c) => ({ value: c.id, label: cityName(c.id) })), (v) => (draft.city = v))),
    h('label', null, t(l('Mês', 'Month')), select(draft.month, Array.from({ length: 12 }, (_, i) => ({ value: i, label: monthName(i) })), (v) => (draft.month = v))),
    h('label', null, t(l('Identidade', 'Identity')), select<Ident>(draft.ident, (Object.keys(IDENTS) as Ident[]).map((k) => ({ value: k, label: t(IDENTS[k].name) })), (v) => { draft.ident = v; rerender(); })),
    h('label', null, t(l('Dono', 'Owner')), select<Holder>(draft.owner, (['label', 'personal'] as Holder[]).map((k) => ({ value: k, label: `${t(k === 'label' ? l('Selo', 'Label') : l('Pessoal', 'Personal'))} — ${$(funds(s, k))}` })), (v) => (draft.owner = v))),
    h('button', { class: 'btn primary', disabled: s.year < 1950, onclick: () => {
      const r = found12(s, draft.owner, { name: draft.name, city: draft.city, month: draft.month, ident: draft.ident });
      if ('pt' in r) return say(r, r);
      draft.name = '';
      say(null, l('Festival fundado: monte o terreno e o line-up. A primeira edição fica para daqui a 4+ meses.', 'Festival founded: lay out the grounds and the line-up. The first edition is 4+ months away.'));
    } }, ic('flag'), ' ', t(l('Fundar festival', 'Found festival'))),
    h('small', { class: 'muted' }, t(IDENTS[draft.ident].desc)),
  );
}

export function festSection12(s: GameState): HTMLElement {
  sync12(s);
  const lv = liveOf(s);
  return section(t(l('Festival próprio', 'Your own festival')),
    h('p', { class: 'muted small' }, t(l('O mesmo festival aparece aqui e em Empreendimentos: conceito, financiamento, contratação, vendas, operação e a próxima edição.', 'The same festival appears here and in Ventures: concept, financing, booking, sales, operations and the next edition.'))),
    lv.fests.map((f) => festCard12(s, f)),
    s.year >= 1950 ? foundForm12(s) : h('p', { class: 'muted small' }, t(l('Festivais ao ar livre só surgem nos anos 1950.', 'Open-air festivals only appear in the 1950s.'))),
  );
}

registerSection('shows', { id: 'live-festival', order: 40, render: (s) => festSection12(s) });
BODY.festival = (s: GameState, v: Venture) => {
  sync12(s);
  const f = v.fx ? festOf(s, v.fx) : undefined;
  return f ? festCard12(s, f) : h('p', { class: 'muted' }, '—');
};
