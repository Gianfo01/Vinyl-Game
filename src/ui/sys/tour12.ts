// Rodada 12 (UI): agente x promotor. Mapa + calendário + previsão por parada; ofertas arena x casa menor.

import { VENUE_TIERS } from '../../data/rules';
import { CITIES, cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { dateOfDay, rngOf } from '../../sim/util';
import {
  DEAL_NAME, WEEKS_AHEAD, acceptChance, acceptOffer, askFee, bookRoute, c12, cancelShow, clientsOf, defaultStop, fatigueTrack, hasAgency, isNewMarket, localDraw, npcOffer, openPromoter, rel, suggestTier, tiersOpen, validate,
  type Deal, type Pred, type Role, type Stop,
} from '../../sim/sys/tour12';
import type { GameState } from '../../sim/types';
import { $, actLink, cityName, monthName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea } from '../registry';

let role: Role = 'agent';
let actId = '';
let draft: Stop[] = [];
let selCity = '';
const pct = (x: number) => `${Math.round(x * 100)}%`;
const btn = (label: L, fn: () => void, cls = 'btn small') => h('button', { class: cls, onclick: fn }, t(label));
const wk = (s: GameState, w: number) => { const d = dateOfDay(s.config.startYear, w * 7); return `${d.dom}/${d.month + 1}`; };
const say = (r: { ok: boolean; text: L[] }) => { toast(r.text.map((x) => t(x)).join(' · '), r.ok ? 'good' : 'bad'); rerender(); };

/** Recalcula cachê/pct a partir do que o jogador escolheu (multiplicador "ask"). */
function refee(s: GameState, st: Stop, actIdx: string): void {
  const act = s.acts[actIdx], m = st.ask ?? 1;
  if (role === 'agent') { const o = npcOffer(s, act, st); st.fee = Math.round(st.deal === 'guarantee' ? o * m : st.deal === 'versus' ? o * 0.7 * m : 0); st.pct = st.deal === 'versus' ? 0.8 : 0.85; }
  else { const a = askFee(s, act, st.tier); st.fee = Math.round(st.deal === 'guarantee' ? a * m : st.deal === 'versus' ? a * 0.6 * m : 0); st.pct = st.deal === 'door' ? 0.85 : 0.85; }
}

function pool(s: GameState) {
  return role === 'agent' ? clientsOf(s) : Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length && a.fame >= 5).sort((a, b) => b.fame - a.fame).slice(0, 40);
}

function mapView(s: GameState): HTMLElement {
  const W = 420, H = 210, act = s.acts[actId];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'map12'); svg.setAttribute('style', 'width:100%;max-width:560px;background:rgba(127,127,127,.12);border-radius:8px');
  const P = (id: string) => { const c = cityById[id]; return [((c.lon + 180) / 360) * W, ((90 - c.lat) / 180) * H]; };
  const add = (tag: string, a: Record<string, string>, txt?: string) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; svg.appendChild(e); return e; };
  const sorted = [...draft].sort((a, b) => a.week - b.week);
  sorted.slice(1).forEach((st, i) => { const [x1, y1] = P(sorted[i].city), [x2, y2] = P(st.city); add('line', { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), stroke: '#e6a23c', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }); });
  for (const c of CITIES) {
    const [x, y] = P(c.id), d = act ? localDraw(s, act, c.id) : 0, nw = act ? isNewMarket(s, act.id, c.id) : true;
    const r = 3 + Math.min(7, Math.log10(1 + d) * 2);
    const el = add('circle', { cx: String(x), cy: String(y), r: String(r), fill: nw ? '#8a8f98' : '#3fb27f', stroke: c.id === selCity ? '#fff' : rel(s, c.id) >= 50 ? '#e6a23c' : 'none', 'stroke-width': '2', style: 'cursor:pointer' });
    el.addEventListener('click', () => { selCity = c.id; rerender(); });
    const tt = document.createElementNS(ns, 'title'); tt.textContent = `${cityName(c.id)} · ${t(nw ? l('mercado novo', 'new market') : l('conquistada', 'conquered'))} · ${t(l('força local', 'local draw'))} ~${Math.round(d)} · ${t(l('relação', 'relations'))} ${Math.round(rel(s, c.id))}`; el.appendChild(tt);
  }
  return h('div', null, svg, h('div', { class: 'small muted' }, t(l('Verde = conquistada (tamanho = força local), cinza = mercado novo, contorno dourado = boa relação com o promotor local, tracejado = sua rota.', 'Green = conquered (size = local draw), grey = new market, gold ring = good local promoter relations, dashed = your route.'))));
}

function calendar(s: GameState): HTMLElement {
  const act = s.acts[actId], tr = act ? fatigueTrack(s, actId, draft) : new Map<Stop, number>();
  const cells: HTMLElement[] = [];
  for (let i = 2; i < WEEKS_AHEAD + 2; i++) {
    const w = s.week + i, booked = c12(s).shows.filter((x) => x.actId === actId && x.status === 'booked' && x.week === w), dr = draft.filter((x) => x.week === w);
    const fat = Math.max(0, ...[...booked, ...dr].map((x) => tr.get(x) ?? 0));
    cells.push(h('div', { class: 'cal12', title: `${wk(s, w)}`, style: `padding:3px;border-radius:4px;font-size:11px;min-width:54px;text-align:center;border:1px solid ${dr.length ? '#e6a23c' : 'rgba(127,127,127,.3)'};background:${fat > 0 ? `rgba(220,80,60,${Math.min(0.6, fat * 0.4)})` : 'rgba(127,127,127,.08)'}` },
      h('div', { class: 'muted' }, wk(s, w)),
      ...[...booked, ...dr].map((x) => h('div', { style: 'status' in x ? 'font-weight:600' : 'font-style:italic' }, cityName(x.city).slice(0, 8))),
      !booked.length && !dr.length ? h('div', { class: 'muted' }, '·') : null));
  }
  return h('div', null, h('div', { class: 'row wrap', style: 'gap:4px' }, cells),
    h('div', { class: 'small muted' }, t(l('Itálico = rascunho, negrito = marcado. Vermelho = cansaço projetado: viagens longas e semanas seguidas sem folga cansam o artista.', 'Italic = draft, bold = booked. Red = projected fatigue: long trips and back-to-back weeks wear the act down.'))));
}

function predRow(s: GameState, st: Stop, p: Pred, reasons: L[], i: number): HTMLElement {
  const act = s.acts[actId], tiers = tiersOpen(s), sug = suggestTier(s, act, st.city);
  const upd = () => { refee(s, st, actId); rerender(); };
  const money3 = (a: number[]) => `${$(a[0])} / ${$(a[1])} / ${$(a[2])}`;
  return h('div', { class: 'card', style: 'padding:8px' },
    h('div', { class: 'row between wrap' },
      h('b', null, `${cityName(st.city)} · ${wk(s, st.week)}`, ' ', p.isNew ? pill(t(l('mercado novo', 'new market')), '') : pill(t(l('conquistada', 'conquered')), 'good'), ' ', pill(`${t(l('relação', 'rel.'))} ${Math.round(rel(s, st.city))}`)),
      btn(l('Remover', 'Remove'), () => { draft.splice(i, 1); rerender(); }, 'btn tiny ghost')),
    h('div', { class: 'row wrap small' },
      select<number>(st.tier, tiers.map((x) => ({ value: x, label: `${t(VENUE_TIERS[x].name)}${x === sug ? ' ★' : ''}` })), (v) => { st.tier = v; upd(); }),
      select<Deal>(st.deal, (['guarantee', 'door', 'versus'] as Deal[]).map((x) => ({ value: x, label: t(DEAL_NAME[x]) })), (v) => { st.deal = v; upd(); }),
      st.deal !== 'door' ? select<number>(st.ask ?? 1, (role === 'agent' ? [0.9, 1, 1.15, 1.3] : [0.7, 0.85, 1, 1.2]).map((x) => ({ value: x, label: role === 'agent' ? `${t(l('pedir', 'ask'))} ×${x}` : `${t(l('oferecer', 'offer'))} ×${x}` })), (v) => { st.ask = v; upd(); }) : null,
      select<number>(st.pmult, [0.8, 1, 1.25].map((x) => ({ value: x, label: `${t(l('ingresso', 'ticket'))} ${$(p.price / st.pmult * x)}` })), (v) => { st.pmult = v; upd(); }),
      select<number>(st.promo, [0, 1, 2].map((x) => ({ value: x, label: `${t(l('divulgação', 'promo'))} ${x}` })), (v) => { st.promo = v; upd(); }),
      select<string>(st.opener ?? '', [{ value: '', label: t(l('sem abertura', 'no opener')) }, ...Object.values(s.acts).filter((a) => a.id !== actId && a.fame >= 3 && a.fame < act.fame && a.members.length && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame).slice(0, 25).map((a) => ({ value: a.id, label: `${a.name} (${a.genre === act.genre ? t(l('mesmo público', 'same crowd')) : t(l('outro público', 'other crowd'))})` }))], (v) => { st.opener = v || undefined; upd(); })),
    st.deal === 'guarantee' && role === 'agent' && (st.ask ?? 1) > 1 ? h('div', { class: 'small' }, `${t(l('Chance de o promotor aceitar o cachê pedido', 'Chance the promoter accepts your ask'))}: ${pct(acceptChance(s, st, actId))}`) : null,
    h('div', { class: 'small' }, `${t(l('Público (pessimista / esperado / otimista)', 'Crowd (low / expected / high)'))}: ${p.att.join(' / ')} ${t(l('de', 'of'))} ${p.cap} · ${t(l('chance de lotar', 'sell-out chance'))} ${pct(p.pSell)} · ${bar(Math.min(100, (p.att[1] / p.cap) * 100))}`),
    h('div', { class: 'small' }, `${t(l('Cachê do artista', 'Artist take'))}: ${money3(p.take)}`, role === 'agent' ? ` · ${t(l('sua comissão (esperada)', 'your commission (expected)'))}: ${$(p.comm)}` : ` · ${t(l('seu resultado', 'your result'))}: `, role === 'promoter' ? h('b', { class: p.prom[1] < 0 ? 'bad' : 'good' }, money3(p.prom)) : null),
    ...[...reasons.map((x) => ({ x, c: 'bad' })), ...p.warn.map((x) => ({ x, c: 'muted' }))].map((m) => h('div', { class: `small ${m.c}` }, '• ', t(m.x))));
}

function builder(s: GameState): HTMLElement {
  const list = pool(s);
  if (!list.some((a) => a.id === actId)) { actId = list[0]?.id ?? ''; draft = []; }
  if (role === 'agent' && !hasAgency(s)) return h('p', { class: 'muted' }, t(l('Para atuar como agente, fundue uma Agência de shows em Empreendimentos e assine clientes.', 'To act as an agent, found a Booking agency under Ventures and sign clients.')));
  if (role === 'promoter' && !c12(s).promoter.on) return h('div', null, h('p', null, t(l('Como promotor você banca os shows: paga casa e cachê, fica com a bilheteria — e com o prejuízo se a casa esvaziar.', 'As a promoter you finance the shows: you pay venue and fee, keep the box office — and the loss if the room empties.'))),
    btn(l('Abrir promotora', 'Open promotion arm'), () => { const e = openPromoter(s); toast(t(e ?? l('Promotora aberta.', 'Promotion arm open.')), e ? 'bad' : 'good'); rerender(); }, 'btn primary'));
  if (!actId) return h('p', { class: 'muted' }, t(l('Nenhum artista disponível.', 'No acts available.')));
  const act = s.acts[actId];
  const v = validate(s, role, actId, draft);
  if (!selCity) selCity = act.city;
  const free = [...Array(WEEKS_AHEAD).keys()].map((i) => s.week + 2 + i);
  let week = free[0];
  return h('div', null,
    h('div', { class: 'row wrap' }, select<string>(actId, list.map((a) => ({ value: a.id, label: `${a.name} (${Math.round(a.fame)})` })), (x) => { actId = x; draft = []; rerender(); }),
      act ? h('span', { class: 'small muted' }, `${t(l('Força local em', 'Local draw in'))} ${cityName(selCity)}: ~${Math.round(localDraw(s, act, selCity))} · ${t(l('porte sustentável', 'sustainable size'))}: ${t(VENUE_TIERS[suggestTier(s, act, selCity)].name)}`) : null),
    h('div', { class: 'row wrap', style: 'align-items:flex-start;gap:12px' }, h('div', { style: 'flex:1 1 320px' }, mapView(s)), h('div', { style: 'flex:1 1 320px' }, calendar(s))),
    h('div', { class: 'row wrap' }, select<string>(selCity, CITIES.map((c) => ({ value: c.id, label: cityName(c.id) })), (x) => { selCity = x; rerender(); }),
      select<number>(week, free.map((w) => ({ value: w, label: wk(s, w) })), (x) => (week = x)),
      btn(l('Adicionar parada', 'Add stop'), () => { const st = defaultStop(s, act, selCity, week); st.ask = 1; refee(s, st, actId); draft.push(st); draft.sort((a, b) => a.week - b.week); rerender(); }, 'btn small primary')),
    ...draft.map((st, i) => predRow(s, st, v.preds[i], v.reasons[i], i)),
    draft.length ? h('div', { class: 'row wrap' }, h('b', null, `${t(l('Total esperado', 'Expected total'))}: `, role === 'agent' ? $(v.preds.reduce((a, p) => a + p.comm, 0)) : $(v.preds.reduce((a, p) => a + p.prom[1], 0))),
      btn(l('Fechar rota', 'Book route'), () => { const r = bookRoute(s, rngOf(s), role, actId, draft); if (r.ok) draft = []; say(r); }, 'btn primary'), btn(l('Limpar', 'Clear'), () => { draft = []; rerender(); }, 'btn small ghost')) : h('p', { class: 'muted small' }, t(l('Clique numa cidade do mapa, escolha a semana e adicione. A previsão aparece em cada parada.', 'Click a city on the map, pick a week and add it. A forecast shows on every stop.'))));
}

function offersView(s: GameState): HTMLElement | null {
  const c = c12(s);
  if (!c.offers.length) return null;
  return section(t(l('Ofertas na mesa', 'Offers on the table')), ...c.offers.map((o) => {
    const side = (k: 'a' | 'b', title: L) => {
      const stops = o[k].map((x) => ({ ...x })), v = validate(s, 'agent', o.actId, stops), p = v.preds[0];
      const tot = v.preds.reduce((a, q) => a + q.take[1], 0);
      return h('div', { class: 'card', style: 'flex:1 1 260px;padding:8px' }, h('b', null, t(title)),
        h('div', { class: 'small' }, `${t(VENUE_TIERS[stops[0].tier].name)} ×${stops.length} · ${t(DEAL_NAME[stops[0].deal])} · ${wk(s, stops[0].week)}`),
        h('div', { class: 'small' }, `${t(l('Garantia', 'Guarantee'))}: ${$(stops[0].fee)}${stops[0].deal === 'versus' ? ` + ${pct(stops[0].pct)} ${t(l('da porta', 'of the door'))}` : ''}`),
        h('div', { class: 'small' }, `${t(l('Público previsto por noite', 'Predicted crowd per night'))}: ${p.att[0]}–${p.att[2]} ${t(l('de', 'of'))} ${p.cap} (${pct(p.att[1] / p.cap)}) · ${t(l('lotar', 'sell out'))} ${pct(p.pSell)}`),
        h('div', { class: 'small' }, `${t(l('Cachê esperado do artista', 'Expected artist take'))}: ${$(tot)} · ${t(l('sua comissão', 'your commission'))}: ${$(v.preds.reduce((a, q) => a + q.comm, 0))}`),
        ...v.preds[0].warn.map((w) => h('div', { class: 'small muted' }, '• ', t(w))),
        btn(l('Aceitar', 'Accept'), () => say(acceptOffer(s, rngOf(s), o.id, k)), 'btn small primary'));
    };
    return h('div', null, h('p', null, actLink(s, o.actId), ` · ${cityName(o.city)} · ${t(l('responder até', 'reply by'))} ${wk(s, o.until)}`),
      h('p', { class: 'small muted' }, t(l('A arena paga um cachê alto olhando para a fama do artista; mas o público é a força LOCAL, e arena vazia machuca imagem e relação com a cidade. Duas noites numa casa menor pagam menos agora, com pouco risco, e uma noite lotada alimenta a próxima visita.', 'The arena pays big looking at the act\'s fame; but the crowd is LOCAL strength, and an empty arena hurts image and city relations. Two nights in a smaller house pay less now, at low risk, and a sold-out night feeds the next visit.'))),
      h('div', { class: 'row wrap', style: 'gap:8px;align-items:stretch' }, side('a', l('A) Data na arena, cachê alto', 'A) Arena date, big guarantee')), side('b', l('B) Duas noites em casa menor, porta + piso', 'B) Two nights, smaller house, door + floor'))),
      btn(l('Recusar', 'Decline'), () => say(acceptOffer(s, rngOf(s), o.id, 'no')), 'btn small ghost'));
  }));
}

function showsView(s: GameState): HTMLElement {
  const c = c12(s), mine = [...c.shows].filter((x) => x.status !== 'cancelled').sort((a, b) => b.week - a.week).slice(0, 14);
  return section(t(l('Agenda e resultados', 'Schedule & results')), mine.length ? h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ...[l('Data', 'Date'), l('Artista', 'Act'), l('Cidade', 'City'), l('Papel', 'Role'), l('Resultado', 'Result'), l('Por quê', 'Why'), l('', '')].map((x) => h('th', null, t(x))))),
    h('tbody', null, mine.map((x) => h('tr', null, h('td', null, wk(s, x.week)), h('td', null, actLink(s, x.actId)), h('td', null, cityName(x.city)), h('td', null, t(x.by === 'agent' ? l('agente', 'agent') : l('promotor', 'promoter'))),
      h('td', null, x.res ? (x.res.cancelled ? pill(t(l('cancelado', 'cancelled')), 'bad') : `${x.res.att}/${x.res.cap} · ${x.by === 'agent' ? $(x.res.comm) : $(x.res.prom)}`) : t(l('marcado', 'booked'))),
      h('td', { class: 'small' }, x.res ? x.res.why.map((w) => t(w)).join(' ') : ''),
      h('td', null, x.status === 'booked' ? btn(l('Cancelar', 'Cancel'), () => { const e = cancelShow(s, x.id); toast(t(e ?? l('Cancelado (relação com a cidade sofre).', 'Cancelled (city relations suffer).')), e ? 'bad' : 'info'); rerender(); }, 'btn tiny ghost') : null)))))
    : h('p', { class: 'muted' }, t(l('Nada marcado ainda.', 'Nothing booked yet.'))));
}

function relView(s: GameState): HTMLElement {
  const c = c12(s), rows = Object.entries(c.rel).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ag = hasAgency(s);
  return section(t(l('Relações e clientes', 'Relations & clients')),
    c.promoter.on ? h('p', { class: 'small' }, `${t(l('Reputação de promotor', 'Promoter reputation'))}: ${Math.round(c.promoter.rep)} · ${t(l('resultado acumulado', 'cumulative result'))}: `, h('b', { class: c.promoter.total < 0 ? 'bad' : 'good' }, $(c.promoter.total)), ` (${c.promoter.n} ${t(l('shows', 'shows'))})`) : null,
    rows.length ? h('ul', { class: 'small' }, rows.map(([k, v]) => h('li', null, `${cityName(k)}: ${Math.round(v)} `, bar(v)))) : h('p', { class: 'muted small' }, t(l('Promotores locais ainda não te conhecem. Shows lucrativos para eles melhoram a relação; casa vazia por causa de um cachê alto demais a destrói.', 'Local promoters do not know you yet. Profitable shows for them build the relationship; an empty house from a too-high fee wrecks it.'))),
    ag?.clients?.length ? h('ul', { class: 'small' }, ag.clients.map((cl) => h('li', null, actLink(s, cl.actId), ` · ${t(l('satisfação', 'satisfaction'))} `, bar(c.sat[cl.actId] ?? 60)))) : null,
    c.log.length ? h('ul', { class: 'small muted' }, c.log.slice(-6).reverse().map((x) => h('li', null, t(x.t)))) : null);
}

function tourArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub tour12' },
    h('div', { class: 'row wrap' }, btn(l('Sou agente', 'I am the agent'), () => { role = 'agent'; draft = []; actId = ''; rerender(); }, role === 'agent' ? 'btn primary' : 'btn'),
      btn(l('Sou promotor', 'I am the promoter'), () => { role = 'promoter'; draft = []; actId = ''; rerender(); }, role === 'promoter' ? 'btn primary' : 'btn'),
      h('span', { class: 'small muted' }, t(role === 'agent' ? l('Agente: acha e negocia datas para o artista e ganha comissão; o risco é perder o cliente.', 'Agent: finds and negotiates dates for the act and earns commission; the risk is losing the client.') : l('Promotor: banca o show e fica com a bilheteria; o risco é o prejuízo.', 'Promoter: finances the show and keeps the box office; the risk is the loss.')))),
    offersView(s), section(t(l('Montar rota', 'Build a route')), builder(s)), showsView(s), relView(s));
}

registerArea({ id: 'tour12', label: l('Agente e promotor', 'Agent & promoter'), icon: 'tour-bus', key: '[', render: tourArea, visible: (s) => s.year >= 1930, badge: (s) => c12(s).offers.length || undefined });
void monthName;
