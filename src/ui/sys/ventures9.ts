// Interface da rodada 9: áreas "Empreendimentos" e "Gestão de artistas", e o prestígio dos selos
// (ranking nas paradas, aba na ficha dos rivais e seção na sede).

import { CITIES, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import { ownerOf } from '../../sim/sys/people/owner';
import { STAND_KEYS, STAND_NAME, standingOf, standingRanking } from '../../sim/sys/standing9';
import {
  CRISIS_NAME, GEAR, MAX_LEVEL, MEDIA, VERDICT_NAME, VKINDS, actFee, autoLineup, bookingCandidates, crisisCost, dealLabel, dropClient, dropFromLineup, favorAct, festCandidates, festCapacity,
  foundCost, foundVenture, funds, handleCrisis, inviteAct, inviteChance, isConglomerate, kindsAvailable, lineupMax, maxGear, mediaAvailable, mgCandidates, mgCap, mgChance, mgGross, negotiateFor,
  pitchClient, pitchSync, placeSong, pushScene, routeTour, sellVenture, setFestival, setMgOwner, setPayout, setStaff, signBooking, signWriter, takePayola, transferVenture, upgradeCost,
  upgradeGear, upgradeVenture, valuation, ventures, writerAdvance, writerCandidates, type CrisisMove, type Holder, type MediaKind, type VKind, type Venture,
} from '../../sim/sys/ventures9';
import { $, actLink, cityName, genreName, pill, rerender, section, sparkline, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea, registerPageTab, registerSection } from '../registry';
import { tabs } from '../vis';
import { visibleAct } from '../../sim/future';
import { clientExtras, poachTab, reportsTab } from './manager11';
import { mgr11 } from '../../sim/sys/manager11';
import { clientPanel12, managementTabs12 } from './manager12';
import { careersPanel } from './careers12';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const res = (x: { ok: boolean; text: L }) => { toast(t(x.text), x.ok ? 'good' : 'bad'); rerender(); };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const HOLDER: Record<Holder, L> = { label: l('Selo (caixa da empresa)', 'Label (company cash)'), personal: l('Pessoal (seu patrimônio)', 'Personal (your wealth)') };
const btn = (label: L, fn: () => void, cls = 'btn small') => h('button', { class: cls, onclick: fn }, t(label));

// ================================================================== empreendimentos

function plLine(v: Venture): HTMLElement {
  const last = v.pl.at(-1);
  const year = v.pl.reduce((s, e) => s + e.rev - e.cost, 0);
  return h('div', { class: 'row wrap small' },
    h('span', null, `${t(l('Mês', 'Month'))}: `, h('b', { class: last && last.rev - last.cost < 0 ? 'bad' : 'good' }, $(last ? last.rev - last.cost : 0))),
    h('span', null, ` · ${t(l('12 meses', '12 months'))}: `, h('b', { class: year < 0 ? 'bad' : 'good' }, $(year))),
    h('span', null, ` · ${t(l('Total', 'Total'))}: ${$(v.total)}`),
    v.pl.length > 1 ? sparkline(v.pl.map((e) => e.rev - e.cost)) : null);
}

function ventureHead(s: GameState, v: Venture): HTMLElement {
  return h('div', null,
    h('div', { class: 'row between wrap' },
      h('h4', null, v.name, ' ', pill(t(v.owner === 'label' ? l('selo', 'label') : l('pessoal', 'personal')), v.owner === 'label' ? '' : 'good'), ' ', pill(`${t(l('Nível', 'Level'))} ${v.level}/${MAX_LEVEL}`)),
      h('span', { class: 'small muted' }, `${cityName(v.city)} · ${t(l('desde', 'since'))} ${v.founded}`)),
    h('div', { class: 'row wrap small' }, t(l('Reputação', 'Reputation')), ' ', bar(v.rep), ` ${Math.round(v.rep)}`),
    plLine(v),
    h('div', { class: 'row wrap' },
      v.level < MAX_LEVEL ? btn(l(`Expandir (${$(upgradeCost(s, v))})`, `Expand (${$(upgradeCost(s, v))})`), () => say(upgradeVenture(s, v.id), l('Negócio ampliado.', 'Business expanded.'))) : null,
      h('span', { class: 'small' }, ` ${t(l('Equipe', 'Staff'))}: `),
      btn(l('−', '−'), () => { setStaff(s, v.id, v.staff - 1); rerender(); }), h('b', null, ` ${v.staff} `), btn(l('+', '+'), () => { setStaff(s, v.id, v.staff + 1); rerender(); }),
      btn(v.owner === 'label' ? l(`Comprar para mim (${$(valuation(s, v))})`, `Buy it personally (${$(valuation(s, v))})`) : l(`Vender ao selo (${$(valuation(s, v))})`, `Sell to the label (${$(valuation(s, v))})`), () => say(transferVenture(s, v.id), l('Transferência feita.', 'Transfer done.')), 'btn small ghost'),
      btn(l('Vender', 'Sell'), () => { if (confirm(t(l('Vender este negócio?', 'Sell this business?')))) say(sellVenture(s, v.id), l('Vendido.', 'Sold.')); }, 'btn small danger')));
}

function foundForm(s: GameState, kind: VKind): HTMLElement {
  const info = VKINDS[kind];
  if (!kindsAvailable(s).includes(kind)) return h('p', { class: 'muted' }, t(l('Ainda não existe nesta época.', 'Not available in this era yet.')));
  let owner: Holder = 'label';
  let name = '';
  let city = s.config.homeCity;
  let media: MediaKind = mediaAvailable(s).at(-1) ?? 'magazine';
  const costEl = h('b');
  const upd = () => { costEl.textContent = $(foundCost(s, kind, kind === 'media' ? media : undefined)); };
  upd();
  return section(t(l('Fundar novo', 'Found new')),
    h('p', { class: 'small muted' }, t(info.desc)),
    h('div', { class: 'row wrap' },
      h('input', { type: 'text', placeholder: t(l('Nome', 'Name')), oninput: (e: Event) => (name = (e.target as HTMLInputElement).value) }),
      select<string>(city, CITIES.map((c) => ({ value: c.id, label: t(c.name) })), (v) => (city = v)),
      kind === 'media' ? select<MediaKind>(media, mediaAvailable(s).map((k) => ({ value: k, label: t(MEDIA[k].name) })), (v) => { media = v; upd(); }) : null,
      select<Holder>(owner, (['label', 'personal'] as Holder[]).map((x) => ({ value: x, label: `${t(HOLDER[x])} — ${$(funds(s, x))}` })), (v) => (owner = v)),
      h('span', null, t(l('Custo', 'Cost')), ': ', costEl),
      btn(l('Fundar', 'Found'), () => say(foundVenture(s, kind, owner, { name, city, media }), l('Negócio fundado.', 'Business founded.')), 'btn small primary')));
}

function festivalBody(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s);
  const cands = festCandidates(s, v.id);
  let pick = cands[0]?.id ?? '';
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' }) }));
  return h('div', null,
    h('div', { class: 'row wrap' },
      t(l('Mês', 'Month')), ' ', select<number>(v.month ?? 6, months, (m) => { setFestival(s, v.id, { month: m }); rerender(); }),
      ' ', t(l('Cidade', 'City')), ' ', select<string>(v.city, CITIES.map((c) => ({ value: c.id, label: t(c.name) })), (c) => { setFestival(s, v.id, { city: c }); rerender(); }),
      ' ', t(l('Ingresso', 'Ticket')), ' ', h('input', { type: 'number', min: 1, value: Math.round((v.price ?? 0) / 100), style: 'width:6em', onchange: (e: Event) => { setFestival(s, v.id, { price: Number((e.target as HTMLInputElement).value) * 100 }); rerender(); } }),
      h('span', { class: 'small muted' }, ` ${t(l('Capacidade', 'Capacity'))} ${festCapacity(v).toLocaleString()}`)),
    h('h5', null, t(l('Line-up', 'Line-up')), ` (${v.lineup!.length}/${lineupMax(v)})`),
    v.lineup!.length ? h('ul', { class: 'small' }, v.lineup!.map((x) => h('li', null, actLink(s, x.actId), ` · ${$(x.fee)} `, btn(l('tirar', 'drop'), () => { dropFromLineup(s, v.id, x.actId); rerender(); }, 'btn tiny ghost')))) : h('p', { class: 'muted small' }, t(l('Ninguém confirmado. Sem line-up, não há edição.', 'Nobody confirmed. No line-up, no edition.'))),
    cands.length ? h('div', { class: 'row wrap' },
      select<string>(pick, cands.map((a) => ({ value: a.id, label: `${a.name} (${a.fame}) · ${a.owner === 'player' ? t(l('seu selo', 'your label')) : a.owner ? s.labels[a.owner]?.name ?? '' : t(l('indep.', 'indie'))} · ${$(actFee(s, a))} · ${pct(inviteChance(s, v, a))}` })), (x) => (pick = x)),
      btn(l('Convidar', 'Invite'), () => res(inviteAct(s, r, v.id, pick)), 'btn small primary'),
      btn(l('Completar automaticamente', 'Auto-fill'), () => { const n = autoLineup(s, r, v.id); toast(t(l('{n} confirmados.', '{n} confirmed.'), { n }), 'good'); rerender(); })) : null,
    v.editions!.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Ano', 'Year'), l('Headliner', 'Headliner'), l('Público', 'Crowd'), l('Resultado', 'Result'), l('Lucro', 'Profit')].map((x) => h('th', null, t(x))))),
      h('tbody', null, v.editions!.slice().reverse().slice(0, 10).map((e) => h('tr', null, h('td', null, String(e.y)), h('td', null, e.head), h('td', null, e.crowd.toLocaleString()),
        h('td', null, pill(t(VERDICT_NAME[e.verdict]), e.verdict === 'legend' ? 'good' : e.verdict === 'ok' ? '' : 'bad')), h('td', { class: e.profit < 0 ? 'bad' : 'good' }, $(e.profit)))))) : null);
}

function publisherBody(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s);
  const cands = writerCandidates(s, v.id);
  let wpick = cands[0]?.pid ?? '';
  const acts = Object.values(s.acts).filter((a) => visibleAct(s, a) && a.status !== 'retired' && a.status !== 'split' && a.fame >= 10).sort((a, b) => b.fame - a.fame).slice(0, 30);
  let apick = acts[0]?.id ?? '';
  let wr = v.writers![0]?.pid ?? '';
  return h('div', null,
    h('h5', null, t(l('Compositores', 'Songwriters')), ` (${v.writers!.length}/${2 + v.level * 2})`),
    v.writers!.length ? h('ul', { class: 'small' }, v.writers!.map((w) => h('li', null, `${w.name} · ${t(l('talento', 'skill'))} ${w.skill} · ${t(l('até', 'until'))} ${w.until}`))) : null,
    cands.length ? h('div', { class: 'row wrap' },
      select<string>(wpick, cands.map((c) => ({ value: c.pid, label: `${c.name} (${c.act}) · ${c.skill} · ${$(writerAdvance(s, c.skill))}` })), (x) => (wpick = x)),
      btn(l('Contratar', 'Sign'), () => res(signWriter(s, r, v.id, wpick)), 'btn small primary')) : null,
    v.writers!.length && acts.length ? h('div', { class: 'row wrap' }, t(l('Oferecer música de', 'Pitch a song by')), ' ',
      select<string>(wr, v.writers!.map((w) => ({ value: w.pid, label: w.name })), (x) => (wr = x)), ' → ',
      select<string>(apick, acts.map((a) => ({ value: a.id, label: `${a.name} (${a.owner === 'player' ? t(l('seu selo', 'your label')) : a.owner ? s.labels[a.owner]?.name ?? '' : t(l('indep.', 'indie'))})` })), (x) => (apick = x)),
      btn(l('Oferecer', 'Pitch'), () => res(placeSong(s, r, v.id, wr, apick)))) : null,
    h('div', { class: 'row wrap' }, btn(l('Buscar sincronização (filme/TV/publicidade)', 'Pitch for sync (film/TV/ads)'), () => res(pitchSync(s, r, v.id)))),
    h('h5', null, t(l('Catálogo', 'Catalog')), ` (${v.cat!.length})`),
    v.cat!.length ? h('table', { class: 'tbl compact' }, h('tbody', null, v.cat!.slice().sort((a, b) => b.v - a.v).slice(0, 12).map((c) => h('tr', null, h('td', null, c.title), h('td', null, actLink(s, c.actId)), h('td', null, String(c.y)), h('td', null, `${$(c.v)}/${t(l('mês', 'mo'))}`))))) : null);
}

function studioBody(s: GameState, v: Venture): HTMLElement {
  const gap = maxGear(s) - v.gear!;
  return h('div', null,
    h('p', null, t(l('Equipamento', 'Gear')), ': ', h('b', null, t(GEAR[v.gear!].name)), gap ? pill(t(l('{n} geração(ões) atrás', '{n} generation(s) behind'), { n: gap }), 'bad') : pill(t(l('de ponta', 'state of the art')), 'good'), ' ',
      gap ? btn(l('Atualizar equipamento', 'Upgrade gear'), () => say(upgradeGear(s, v.id), l('Equipamento novo instalado.', 'New gear installed.'))) : null),
    h('div', { class: 'row small' }, t(l('Som da casa', 'House sound')), ' ', bar(v.sound!), ` ${Math.round(v.sound!)}`),
    h('p', { class: 'small muted' }, t(l('O som da casa melhora a produção dos discos dos seus artistas e atrai sessões de outros selos.', 'The house sound lifts your artists\' productions and attracts sessions from other labels.'))),
    v.booked!.length ? h('p', { class: 'small' }, t(l('Sessões no mês', 'Sessions this month')), ': ', v.booked!.map((b) => `${s.labels[b.lab]?.name ?? '?'} ×${b.n}`).join(', ')) : h('p', { class: 'small muted' }, t(l('Nenhuma sessão de fora no último mês.', 'No outside sessions last month.'))));
}

function bookingBody(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s);
  const cands = bookingCandidates(s, v.id);
  let pick = cands[0]?.id ?? '';
  let rate = 0.12;
  return h('div', null,
    h('h5', null, t(l('Clientes', 'Clients')), ` (${v.clients!.length}/${3 + v.level * 2})`),
    v.clients!.length ? h('ul', { class: 'small' }, v.clients!.map((c) => h('li', null, actLink(s, c.actId), ` · ${pct(c.rate)} `,
      btn(l('Roteirizar turnê', 'Route a tour'), () => res(routeTour(s, r, v.id, c.actId)), 'btn tiny')))) : null,
    cands.length ? h('div', { class: 'row wrap' },
      select<string>(pick, cands.map((a) => ({ value: a.id, label: `${a.name} (${a.fame})` })), (x) => (pick = x)),
      select<number>(rate, [0.08, 0.1, 0.12, 0.15, 0.2].map((x) => ({ value: x, label: pct(x) })), (x) => (rate = x)),
      btn(l('Oferecer agenciamento', 'Offer booking'), () => res(signBooking(s, r, v.id, pick, rate)), 'btn small primary')) : null);
}

function mediaBody(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s);
  const acts = Object.values(s.acts).filter((a) => visibleAct(s, a) && a.status !== 'retired' && a.status !== 'split' && a.members.length).sort((a, b) => b.momentum - a.momentum).slice(0, 40);
  const genres = [...new Set(Object.values(s.acts).filter((a) => a.city === v.city).map((a) => a.genre))];
  return h('div', null,
    h('p', null, t(MEDIA[v.media!].name), ' · ', t(l('Alcance', 'Reach')), ' ', bar(v.reach!), ` ${Math.round(v.reach!)}`, (v.heat ?? 0) > 0.1 ? pill(t(l('jabá na mira', 'payola under scrutiny')), 'bad') : null),
    h('div', { class: 'row wrap' }, t(l('Tocar sem parar', 'Heavy rotation')), ' ',
      select<string>(v.favored ?? '', [{ value: '', label: '—' }, ...acts.map((a) => ({ value: a.id, label: `${a.name}${a.owner === 'player' ? ' ★' : ''}` }))], (x) => { favorAct(s, v.id, x || undefined); rerender(); })),
    h('div', { class: 'row wrap' }, t(l('Lançar uma cena', 'Launch a scene')), ' ',
      select<string>(v.scene ?? '', [{ value: '', label: '—' }, ...genres.map((g) => ({ value: g, label: genreName(g) }))], (x) => { pushScene(s, v.id, x); rerender(); })),
    h('div', { class: 'row wrap' }, btn(l('Aceitar "apoio cultural" de um rival (jabá)', 'Take a rival\'s "cultural support" (payola)'), () => res(takePayola(s, r, v.id)), 'btn small danger')),
    h('p', { class: 'small muted' }, t(l('Favorecer os próprios artistas gasta credibilidade; jabá rende dinheiro e pode virar escândalo.', 'Favoring your own acts costs credibility; payola pays and can become a scandal.'))));
}

function platformBody(s: GameState, v: Venture): HTMLElement {
  const r = rngOf(s);
  const labs = Object.values(s.labels).filter((x) => x.active && !v.deals!.includes(x.id));
  let pick = labs[0]?.id ?? '';
  return h('div', null,
    h('p', null, t(l('Assinantes', 'Subscribers')), ': ', h('b', null, v.subs!.toLocaleString()), ' · ', t(l('Catálogos', 'Catalogs')), `: ${v.deals!.length}`),
    h('div', { class: 'row wrap' }, t(l('Repasse às gravadoras', 'Payout to labels')), ' ',
      select<number>(v.payout!, [0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.85].map((x) => ({ value: x, label: pct(x) })), (x) => { setPayout(s, v.id, x); rerender(); }),
      h('span', { class: 'small muted' }, ` ${t(l('Abaixo de 60%, gravadoras tiram o catálogo.', 'Below 60%, labels pull their catalogs.'))}`)),
    v.deals!.length ? h('p', { class: 'small' }, v.deals!.map((id) => s.labels[id]?.name).join(', ')) : null,
    labs.length ? h('div', { class: 'row wrap' }, select<string>(pick, labs.map((x) => ({ value: x.id, label: x.name })), (x) => (pick = x)), btn(l('Licenciar catálogo', 'License catalog'), () => res(dealLabel(s, r, v.id, pick)), 'btn small primary')) : null);
}

const BODY: Record<VKind, (s: GameState, v: Venture) => HTMLElement> = { festival: festivalBody, publisher: publisherBody, studio: studioBody, booking: bookingBody, media: mediaBody, platform: platformBody };

function kindTab(s: GameState, kind: VKind): HTMLElement {
  const list = ventures(s).list.filter((v) => v.kind === kind);
  const npc = ventures(s).npc.filter((n) => n.kind === kind);
  return h('div', null,
    ...list.map((v) => h('div', { class: 'card' }, ventureHead(s, v), BODY[kind](s, v))),
    kind === 'media' && isConglomerate(s) ? h('p', null, pill(t(l('Conglomerado de mídia', 'Media conglomerate')), 'good'), ' ', t(l('Três veículos diferentes: publicidade +25% e cobertura extra para o selo.', 'Three different outlets: +25% ad revenue and extra coverage for the label.'))) : null,
    foundForm(s, kind),
    npc.length ? section(t(l('Concorrentes', 'Competitors')), h('ul', { class: 'small' }, npc.map((n) => h('li', null, `${n.name} · ${cityName(n.city)} · ${t(l('reputação', 'reputation'))} ${n.rep}`)))) : null);
}

function overview(s: GameState): HTMLElement {
  const st = ventures(s);
  const month = st.list.reduce((t0, v) => { const e = v.pl.at(-1); return t0 + (e ? e.rev - e.cost : 0); }, 0);
  return h('div', null,
    section(t(l('Seus negócios', 'Your businesses')),
      h('p', null, t(l('Caixa do selo', 'Label cash')), `: ${$(s.player.cash)} · `, t(l('Patrimônio pessoal', 'Personal wealth')), `: ${$(ownerOf(s).wealth)} · `, t(l('Resultado do mês', 'Month result')), ': ', h('b', { class: month < 0 ? 'bad' : 'good' }, $(month))),
      st.list.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, ...[l('Negócio', 'Business'), l('Tipo', 'Kind'), l('Dono', 'Owner'), l('Nível', 'Level'), l('Reputação', 'Rep.'), l('12 meses', '12 months'), l('Valor', 'Value')].map((x) => h('th', null, t(x))))),
        h('tbody', null, st.list.map((v) => h('tr', null, h('td', null, v.name), h('td', null, t(VKINDS[v.kind].name)), h('td', null, t(v.owner === 'label' ? l('selo', 'label') : l('pessoal', 'personal'))),
          h('td', null, String(v.level)), h('td', null, String(Math.round(v.rep))), h('td', null, $(v.pl.reduce((a, e) => a + e.rev - e.cost, 0))), h('td', null, $(valuation(s, v))))))) : h('p', { class: 'muted' }, t(l('Nenhum negócio ainda. Cada aba abre um tipo; escolha se é do selo ou seu.', 'No businesses yet. Each tab opens one kind; choose whether the label or you own it.')))),
    st.log.length ? section(t(l('Acontecimentos', 'Happenings')), h('ul', { class: 'small' }, st.log.slice(-12).reverse().map((x) => h('li', null, t(x.t))))) : null);
}

function venturesArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub ventures9' }, tabs('ventures9', [
    { id: 'overview', label: t(l('Visão geral', 'Overview')), icon: 'bank', render: () => overview(s) },
    { id: 'careers12', label: t(l('Carreiras', 'Careers')), icon: 'star', render: () => careersPanel(s) },
    ...(Object.keys(VKINDS) as VKind[]).filter((k) => kindsAvailable(s).includes(k) || ventures(s).list.some((v) => v.kind === k)).map((k) => ({ id: k, label: t(VKINDS[k].name), icon: VKINDS[k].icon, render: () => kindTab(s, k) })),
  ], rerender));
}

registerArea({ id: 'ventures', label: l('Empreendimentos', 'Ventures'), icon: 'bank', key: 'n', render: venturesArea });

// ================================================================== gestão de artistas

function rosterTab(s: GameState): HTMLElement {
  const mg = ventures(s).mg;
  const r = rngOf(s);
  return h('div', null,
    section(t(l('Seu escritório de empresário', 'Your management office')),
      h('div', { class: 'row wrap small' }, t(l('Reputação de empresário', 'Manager reputation')), ' ', bar(mg.rep), ` ${Math.round(mg.rep)} · ${t(l('Clientes', 'Clients'))} ${mg.clients.length}/${mgCap(s)} · ${t(l('Comissões totais', 'Total commissions'))} ${$(mg.total)}`),
      h('div', { class: 'row wrap small' }, t(l('Comissões vão para', 'Commissions go to')), ' ', select<Holder>(mg.owner, (['personal', 'label'] as Holder[]).map((x) => ({ value: x, label: t(HOLDER[x]) })), (x) => { setMgOwner(s, x); rerender(); }))),
    mg.clients.length ? h('div', null, mg.clients.map((c) => {
      const a = s.acts[c.actId];
      if (!a) return null;
      const k = a.contractId ? s.contracts[a.contractId] : undefined;
      let move: CrisisMove = 'pr';
      return h('div', { class: 'card' },
        h('div', { class: 'row between wrap' }, h('h4', null, actLink(s, a.id)), h('span', { class: 'small' }, `${pct(c.rate)} · ${$(Math.round(mgGross(s, a) * c.rate))}/${t(l('mês', 'mo'))}`)),
        h('div', { class: 'row wrap small' }, t(l('Satisfação', 'Satisfaction')), ' ', bar(c.sat), ` ${Math.round(c.sat)} · ${t(l('Fama', 'Fame'))} ${a.fame} · ${t(l('Momento', 'Momentum'))} ${Math.round(a.momentum)} · `,
          k ? `${t(l('Contrato', 'Deal'))}: ${k.party === 'player' ? s.config.companyName : s.labels[k.party]?.name ?? '?'} (${pct(k.royalty)})` : t(l('sem gravadora', 'unsigned'))),
        c.crisis ? h('div', { class: 'row wrap' }, pill(t(CRISIS_NAME[c.crisis.k]), 'bad'), ' ',
          select<CrisisMove>(move, (['pr', 'rest', 'lawyer'] as CrisisMove[]).map((m) => ({ value: m, label: `${t({ pr: l('Assessoria de imprensa', 'PR push'), rest: l('Pausa e conversa', 'Break and talk'), lawyer: l('Advogados', 'Lawyers') }[m])} (${$(crisisCost(s, m))})` })), (m) => (move = m)),
          btn(l('Agir', 'Act'), () => res(handleCrisis(s, r, a.id, move)), 'btn small primary')) : null,
        clientExtras(s, c),
        clientPanel12(s, c),
        h('div', { class: 'row wrap' },
          k && k.party !== 'player' ? btn(l('Renegociar com a gravadora', 'Renegotiate with the label'), () => res(negotiateFor(s, r, a.id))) : null,
          btn(l('Deixar de empresariar', 'Stop managing'), () => { dropClient(s, a.id); rerender(); }, 'btn small ghost')));
    })) : h('p', { class: 'muted' }, t(l('Você ainda não empresaria ninguém. Prospecte artistas — inclusive de outros selos.', 'You do not manage anyone yet. Prospect acts — including other labels\' artists.'))));
}

function prospectTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  let rate = 0.15;
  const cands = mgCandidates(s);
  return h('div', null,
    h('div', { class: 'row wrap' }, t(l('Comissão proposta', 'Proposed commission')), ' ', select<number>(rate, [0.1, 0.12, 0.15, 0.18, 0.2].map((x) => ({ value: x, label: pct(x) })), (x) => { rate = x; })),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Artista', 'Act'), l('Selo', 'Label'), l('Fama', 'Fame'), l('Renda est./mês', 'Est. income/mo'), l('Chance (15%)', 'Chance (15%)'), l('', '')].map((x) => h('th', null, t(x))))),
      h('tbody', null, cands.map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, a.owner === 'player' ? s.config.companyName : a.owner ? s.labels[a.owner]?.name ?? '—' : t(l('independente', 'independent'))),
        h('td', null, String(a.fame)), h('td', null, $(mgGross(s, a))), h('td', null, pct(mgChance(s, a, 0.15))),
        h('td', null, btn(l('Propor', 'Pitch'), () => res(pitchClient(s, r, a.id, rate)), 'btn tiny primary')))))));
}

function managementArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub management9' }, tabs('management9', [
    { id: 'roster', label: t(l('Meus agenciados', 'My clients')), icon: 'fans', badge: ventures(s).mg.clients.filter((c) => c.crisis || mgr11(s).cx[c.actId]?.poach).length || undefined, render: () => rosterTab(s) },
    { id: 'prospect', label: t(l('Prospectar', 'Prospect')), icon: 'handshake', render: () => prospectTab(s) },
    { id: 'reports', label: t(l('Relatórios', 'Reports')), icon: 'chart-up', render: () => reportsTab(s) },
    { id: 'poach', label: t(l('Roubar clientes', 'Poach clients')), icon: 'fire', render: () => poachTab(s) },
    ...managementTabs12(s),
  ], rerender));
}

registerArea({ id: 'management', label: l('Gestão de artistas', 'Artist management'), icon: 'handshake', key: 'g', render: managementArea, badge: (s) => ventures(s).mg.clients.filter((c) => c.crisis).length || undefined });

// ================================================================== prestígio dos selos

function standingBlock(s: GameState, id: string): HTMLElement {
  const st = standingOf(s, id);
  return h('div', null,
    ...STAND_KEYS.map((k) => h('div', { class: 'row small' }, h('span', { style: 'min-width:11em' }, t(STAND_NAME[k])), bar(st[k]), ` ${Math.round(st[k])}`)),
    st.hist.length > 1 ? sparkline(st.hist) : null);
}

export function rankingTab(s: GameState): HTMLElement {
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, t(l('Selo', 'Label'))), ...STAND_KEYS.map((k) => h('th', null, t(STAND_NAME[k]))), h('th', null, t(l('Nota', 'Score'))))),
    h('tbody', null, standingRanking(s).map((x, i) => h('tr', { class: x.id === 'player' ? 'me' : '' }, h('td', null, String(i + 1)), h('td', null, x.id === 'player' ? h('b', null, x.name) : x.name),
      ...STAND_KEYS.map((k) => h('td', null, String(Math.round(x.st[k])))), h('td', null, h('b', null, String(x.score)))))));
}

registerPageTab('label', { id: 'standing9', label: l('Prestígio', 'Standing'), icon: 'star', render: (s, id) => section(t(l('Prestígio', 'Standing')), standingBlock(s, id)) });
registerSection('hq', { id: 'standing9', order: 4, render: (s) => {
  const pos = standingRanking(s).findIndex((x) => x.id === 'player') + 1;
  return section(`${t(l('Prestígio do selo', 'Label standing'))} · #${pos}`, standingBlock(s, 'player'));
} });
