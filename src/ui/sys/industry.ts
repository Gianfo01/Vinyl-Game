// Interface do sistema de indústria: área "Indústria" (tecla I) e edição de salas na Sede.

import { CITIES, MARKETS, cityById, l, type L, type MarketId } from '../../data/world';
import { t } from '../../i18n/strings';
import { MATERIAL_NAMES, PLANT_LEVELS, buildPlant, mainMaterial, pressCapacity, upgradePlant } from '../../sim/sys/industry/supply';
import { CELL_INFO, PRICE_TIERS, STORE_W, STREET_COST, closeStore, fireDistributor, hireDistributor, openStore, retailCycle, setCell, setJukebox, setStreetTeam, storeOpenCost, storeScore, toggleMailClub } from '../../sim/sys/industry/retail';
import { RESEARCH, canResearch, startResearch } from '../../sim/sys/industry/research';
import { OUTLET_INFO, boardProgress, buyOutlet, endorse, fxLoss, joinBoard, launchStreaming, licenseCatalog, openVenture, outletCost, outletKinds, setFavoritism } from '../../sim/sys/industry/corp';
import { COMBOS, ROOM_ITEMS, activeCombos, buyItem, effectiveRooms, swapRooms } from '../../sim/sys/industry/hqedit';
import { ROOM_NAMES } from '../pixel/scene';
import type { Material, PriceTier, StoreCell } from '../../sim/sys/industry/state';
import type { GameState } from '../../sim/types';
import { hasTech, money, playerActs, rngOf } from '../../sim/util';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerArea, registerSection } from '../registry';
import { chips, ic, meter, stat, tabs, tile } from '../vis';
import './industry.css';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const ui = { plantCity: '', storeCity: '', distMarket: 'na' as MarketId, outletKind: 'radio' as 'radio' | 'tv' | 'magazine', outletMarket: 'na' as MarketId, storeSel: '', cellPick: 'shelf' as StoreCell, swapA: '', swapB: '' };

function citySelect(value: string, set: (v: string) => void, filter?: (id: string) => boolean): HTMLSelectElement {
  const list = CITIES.filter((c) => !filter || filter(c.id)).sort((a, b) => a.name.pt.localeCompare(b.name.pt));
  if (!value && list[0]) set(list[0].id);
  return select(value || list[0]?.id, list.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { set(v); rerender(); }, { 'aria-label': t(l('Cidade', 'City')) });
}

function marketSelect(value: MarketId, set: (v: MarketId) => void): HTMLSelectElement {
  return select(value, MARKETS.map((m) => ({ value: m.id, label: t(m.name) })), (v) => { set(v); rerender(); }, { 'aria-label': t(l('Mercado', 'Market')) });
}

// ------------------------------------------------------------------ abas

function supplyTab(s: GameState): HTMLElement {
  const st = s.x4.industry;
  const cap = pressCapacity(s);
  const main = mainMaterial(s.year);
  return h('div', null,
    section(t(l('Matéria-prima', 'Raw materials')),
      h('p', { class: 'muted small' }, t(l('O preço da matéria-prima muda o custo de prensagem. Guerras e crises do petróleo encarecem tudo; o renascimento do vinil criou filas mundiais.', 'Raw material prices change pressing costs. Wars and oil crises make everything pricier; the vinyl revival created worldwide queues.'))),
      h('div', { class: 'ind-mats' }, (Object.keys(st.matPrice) as Material[]).map((m) => h('div', { class: `ind-mat ${m === main ? 'main' : ''}` },
        h('b', null, t(MATERIAL_NAMES[m])), h('span', { class: st.matPrice[m] > 1.15 ? 'bad' : st.matPrice[m] < 0.95 ? 'good' : '' }, `×${st.matPrice[m].toFixed(2)}`), m === main ? pill(t(l('em uso', 'in use'))) : null))),
    ),
    section(t(l('Capacidade de prensagem', 'Pressing capacity')),
      chips(stat('house', N(cap.own), l('Própria por semana', 'Own per week')), stat('handshake', N(cap.third), l('Terceiros por semana', 'Third-party per week')), stat('warning', N(st.defectsYear), l('Defeitos no ano', 'Defects this year'))),
      st.orders.length ? h('ul', { class: 'small' }, st.orders.slice(0, 8).map((o) => h('li', null, `${s.releases[o.releaseId]?.title ?? '?'} — ${N(o.units)} ${t(l('cópias na semana', 'copies in week'))} ${o.ready}`))) : h('p', { class: 'muted small' }, t(l('Fila vazia.', 'Queue empty.'))),
    ),
    section(t(l('Fábricas próprias', 'Own plants')),
      st.plants.length ? h('div', { class: 'cards' }, st.plants.map((p) => tile('house', `${t(cityById[p.city]?.name)} — ${t(PLANT_LEVELS[p.level - 1].name)}`, [
        h('small', null, `${N(p.capacity)} ${t(l('cópias/semana', 'copies/week'))} · ${t(l('terceiros no mês', 'third-party this month'))} ${N(p.contractUnits)}`),
        PLANT_LEVELS[p.level] ? h('button', { class: 'btn small', onclick: () => say(upgradePlant(s, p.id), l('Fábrica ampliada.', 'Plant upgraded.')) }, `${t(l('Ampliar', 'Upgrade'))} (${$(money(s, PLANT_LEVELS[p.level].cost))})`) : null,
      ]))) : h('p', { class: 'muted small' }, t(l('Sem fábrica própria: você depende da fila das prensas de terceiros.', 'No own plant: you depend on third-party press queues.'))),
      h('div', { class: 'row wrap' }, citySelect(ui.plantCity, (v) => { ui.plantCity = v; }), h('button', { class: 'btn', onclick: () => say(buildPlant(s, ui.plantCity), l('Fábrica construída!', 'Plant built!')) }, ic('house'), ` ${t(l('Construir fábrica', 'Build plant'))} (${$(money(s, PLANT_LEVELS[0].cost))})`)),
    ),
  );
}

function storeGrid(s: GameState, storeId: string): HTMLElement {
  const store = s.x4.industry.stores.find((x) => x.id === storeId)!;
  const sc = storeScore(store);
  const cells = store.layout.map((c, i) => h('button', { class: `ind-cell c-${c}`, title: t(CELL_INFO[c].name), 'aria-label': `${t(l('Casa', 'Cell'))} ${i + 1}: ${t(CELL_INFO[c].name)}`, onclick: () => say(setCell(s, store.id, i, ui.cellPick), l('Loja reformada.', 'Store refitted.')) }, CELL_ICON[c]));
  return h('div', { class: 'ind-store' },
    h('div', { class: 'row wrap' }, h('span', { class: 'small' }, t(l('Colocar:', 'Place:'))),
      (Object.keys(CELL_INFO) as StoreCell[]).map((c) => h('button', { class: `chip-btn ${ui.cellPick === c ? 'on' : ''}`, 'aria-pressed': ui.cellPick === c ? 'true' : 'false', onclick: () => { ui.cellPick = c; rerender(); } }, `${CELL_ICON[c]} ${t(CELL_INFO[c].name)}${CELL_INFO[c].cost ? ` ${$(money(s, CELL_INFO[c].cost))}` : ''}`))),
    h('div', { class: 'ind-grid', style: `grid-template-columns: repeat(${STORE_W}, 1fr)`, role: 'grid', 'aria-label': t(l('Planta da loja', 'Store floor plan')) }, cells),
    chips(meter('fans', l('Tráfego', 'Traffic'), sc.traffic * 100, 120), meter('money', l('Conversão', 'Conversion'), sc.conversion * 100, 40), stat('cd', sc.ticket.toFixed(2), l('Tíquete', 'Basket')), ...sc.combos.map((c) => pill(t(c), 'good'))),
    h('p', { class: 'muted small' }, t(l('Frente da loja = primeira linha. Vitrine traz gente; cabine de audição ao lado da parede de vinis vende mais; sem caixa ninguém paga.', 'Shop front = first row. Windows bring people in; a listening booth next to the vinyl wall sells more; without a till nobody pays.'))),

  );
}

const CELL_ICON: Record<StoreCell, string> = { empty: '·', shelf: '▤', vinyl_wall: '◉', booth: '🎧', window: '▢', register: '$', stage: '★', cafe: '☕' };

function retailTab(s: GameState): HTMLElement {
  const st = s.x4.industry;
  if (!st.stores.some((x) => x.id === ui.storeSel)) ui.storeSel = st.stores[0]?.id ?? '';
  return h('div', null,
    section(t(l('Lojas de discos', 'Record stores')),
      h('p', { class: 'muted small' }, `${t(l('Momento do varejo físico', 'Physical retail climate'))}: ×${retailCycle(s.year).toFixed(2)}`),
      st.stores.length ? h('div', { class: 'row wrap' }, st.stores.map((x) => h('button', { class: `chip-btn ${ui.storeSel === x.id ? 'on' : ''}`, onclick: () => { ui.storeSel = x.id; rerender(); } }, `${t(cityById[x.city]?.name)} · ${x.revenueMonth >= 0 ? '+' : ''}${$(x.revenueMonth)}`))) : null,
      ui.storeSel ? h('div', null, storeGrid(s, ui.storeSel), h('button', { class: 'btn small ghost', onclick: () => { closeStore(s, ui.storeSel); rerender(); } }, t(l('Fechar esta loja', 'Close this store')))) : h('p', { class: 'muted small' }, t(l('Você ainda não tem lojas.', "You don't have stores yet."))),
      h('div', { class: 'row wrap' }, citySelect(ui.storeCity, (v) => { ui.storeCity = v; }, (id) => !st.stores.some((x) => x.city === id)), h('button', { class: 'btn', onclick: () => say(openStore(s, ui.storeCity), l('Loja aberta!', 'Store opened!')) }, ic('cd'), ` ${t(l('Abrir loja', 'Open store'))} (${$(storeOpenCost(s))})`)),
    ),
    section(t(l('Clube do disco por correio', 'Mail-order record club')),
      st.mailClub.active ? chips(stat('fans', N(st.mailClub.members), l('Assinantes', 'Members'))) : h('p', { class: 'muted small' }, t(l('Assinantes recebem discos pelo correio todo mês (1955–1998): receita recorrente, margem baixa.', 'Members get records by mail every month (1955–1998): recurring revenue, low margin.'))),
      h('button', { class: 'btn small', onclick: () => say(toggleMailClub(s), st.mailClub.active ? l('Clube fechado.', 'Club closed.') : l('Clube aberto!', 'Club opened!')) }, st.mailClub.active ? t(l('Fechar o clube', 'Close the club')) : t(l('Abrir o clube', 'Open the club'))),
    ),
  );
}

function distributionTab(s: GameState): HTMLElement {
  const st = s.x4.industry;
  const jukeboxEra = s.year >= 1930 && s.year <= 1965;
  return h('div', null,
    section(t(l('Preço', 'Pricing')), h('div', { class: 'cards' }, (Object.keys(PRICE_TIERS) as PriceTier[]).map((p) => h('button', { class: `tile ${st.pricing === p ? 'on' : ''}`, 'aria-pressed': st.pricing === p ? 'true' : 'false', onclick: () => { st.pricing = p; rerender(); } },
      h('div', { class: 'tile-ic' }, ic('money', 2)), h('div', { class: 'tile-body' }, h('b', null, t(PRICE_TIERS[p].name)), h('small', null, t(PRICE_TIERS[p].desc)), h('small', { class: 'muted' }, `${t(l('cópias', 'copies'))} ×${PRICE_TIERS[p].units} · ${t(l('receita por cópia', 'revenue per copy'))} ${PRICE_TIERS[p].revenue >= 0 ? '+' : ''}${Math.round(PRICE_TIERS[p].revenue * 100)}%`)))))),
    section(t(l('Distribuidores independentes', 'Independent distributors')),
      st.distributors.length ? h('ul', { class: 'small' }, st.distributors.map((d) => h('li', null, `${d.name} · ${t(MARKETS.find((m) => m.id === d.market)!.name)} · ${N(d.stores)} ${t(l('lojas', 'stores'))} · ${Math.round(d.commission * 100)}% `, h('button', { class: 'btn small ghost', onclick: () => { fireDistributor(s, d.id); rerender(); } }, t(l('Encerrar', 'End')))))) : null,
      h('div', { class: 'row wrap' }, marketSelect(ui.distMarket, (v) => { ui.distMarket = v; }), h('button', { class: 'btn', onclick: () => say(hireDistributor(s, rngOf(s), ui.distMarket), l('Distribuidor contratado.', 'Distributor hired.')) }, t(l('Contratar distribuidor', 'Hire distributor')))),
      h('p', { class: 'muted small' }, t(l('Cada distribuidor cobra comissão sobre as vendas, mas coloca seus discos em mais lojas do mercado e abre o território.', 'Each distributor takes a commission on sales but puts your records in more stores and opens the territory.'))),
    ),
    section(t(l('Equipe de rua', 'Street team')), h('table', { class: 'tbl compact' }, h('tbody', null, MARKETS.map((m) => h('tr', null, h('td', null, t(m.name)),
      h('td', null, select(st.streetTeams[m.id] ?? 0, [0, 1, 2, 3].map((v) => ({ value: v, label: v ? `${t(l('Nível', 'Level'))} ${v} · ${$(money(s, STREET_COST[v]))}/m` : t(l('Nenhuma', 'None')) })), (v) => { setStreetTeam(s, m.id, v); rerender(); }, { 'aria-label': t(m.name) }))))))),
    section(t(l('Rotas de jukebox', 'Jukebox routes')), jukeboxEra ? h('table', { class: 'tbl compact' }, h('tbody', null, MARKETS.map((m) => h('tr', null, h('td', null, t(m.name)),
      h('td', null, select(st.jukebox[m.id] ?? 0, [0, 1, 2, 3].map((v) => ({ value: v, label: v ? `${v} · ${$(money(s, 900 * v))}/m` : '—' })), (v) => { const e = setJukebox(s, m.id, v); if (e) toast(t(e), 'bad'); rerender(); }, { 'aria-label': t(m.name) })))))) : h('p', { class: 'muted small' }, t(l('Operadores de jukebox compravam compactos e criavam hits regionais entre 1930 e 1965.', 'Jukebox operators bought singles and made regional hits between 1930 and 1965.')))),
  );
}

function researchTab(s: GameState): HTMLElement {
  const st = s.x4.industry.research;
  const cur = st.current ? RESEARCH.find((x) => x.id === st.current) : null;
  return section(t(l('Pesquisa e desenvolvimento', 'Research and development')),
    chips(stat('bulb', st.points, l('Pontos guardados', 'Stored points')), cur ? stat('clock', `${st.progress}/${cur.cost}`, l('Progresso', 'Progress')) : null),
    h('p', { class: 'muted small' }, t(l('Pontos vêm de lançamentos, analistas, A&R e engenheiros.', 'Points come from releases, analysts, A&R and engineers.'))),
    h('div', { class: 'cards' }, RESEARCH.map((n) => {
      const done = st.done.includes(n.id);
      const err = canResearch(s, n.id);
      return h('div', { class: `tile ${done ? 'good' : ''} ${st.current === n.id ? 'on' : ''}` },
        h('div', { class: 'tile-ic' }, ic(done ? 'sparkle' : 'bulb', 2)),
        h('div', { class: 'tile-body' }, h('b', null, t(n.name)), h('small', null, t(n.desc)), h('small', { class: 'muted' }, `${n.cost} ${t(l('pontos', 'points'))}`),
          done ? pill(t(l('concluída', 'done')), 'good') : st.current === n.id ? pill(t(l('em andamento', 'in progress')), 'warn') : h('button', { class: 'btn small', disabled: !!err, title: err ? t(err) : '', onclick: () => say(startResearch(s, n.id), l('Pesquisa iniciada.', 'Research started.')) }, t(l('Pesquisar', 'Research')))));
    })),
  );
}

function corpTab(s: GameState): HTMLElement {
  const st = s.x4.industry;
  const kinds = outletKinds(s);
  if (!kinds.includes(ui.outletKind)) ui.outletKind = kinds[0] ?? 'radio';
  return h('div', null,
    section(t(l('Mídia própria', 'Own media')),
      st.outlets.length ? h('div', { class: 'cards' }, st.outlets.map((o) => tile(o.kind === 'tv' ? 'tv' : o.kind === 'radio' ? 'radio' : 'newspaper', o.name, [
        h('small', null, `${t(MARKETS.find((m) => m.id === o.market)!.name)} · ${t(l('audiência', 'audience'))} ${Math.round(o.audience)}`),
        h('label', { class: 'small' }, `${t(l('Toca a casa', 'Plays house acts'))}: ${Math.round(o.favoritism * 100)}% `, h('input', { type: 'range', min: 0, max: 100, value: Math.round(o.favoritism * 100), onchange: (e: Event) => { setFavoritism(s, o.id, Number((e.target as HTMLInputElement).value) / 100); rerender(); } })),
      ]))) : null,
      kinds.length ? h('div', { class: 'row wrap' },
        select(ui.outletKind, kinds.map((k) => ({ value: k, label: `${t(OUTLET_INFO[k].name)} (${$(outletCost(s, k))})` })), (v) => { ui.outletKind = v; rerender(); }),
        marketSelect(ui.outletMarket, (v) => { ui.outletMarket = v; }),
        h('button', { class: 'btn', onclick: () => say(buyOutlet(s, ui.outletKind, ui.outletMarket, ''), l('Veículo comprado!', 'Outlet bought!')) }, t(l('Comprar', 'Buy')))) : null,
      h('p', { class: 'muted small' }, t(l('Tocar seus artistas ajuda os lançamentos, mas a audiência cai e há risco de acusação de favorecimento.', 'Playing your artists helps releases, but audiences drop and there is a risk of favoritism accusations.'))),
    ),
    section(t(l('Empresas do grupo', 'Group companies')), h('div', { class: 'cards' },
      tile('tour-bus', t(l('Promotora de shows', 'Concert promoter')), [h('small', null, t(l('Ganha com shows de terceiros; seus atos atraem +5% de público.', 'Earns from third-party shows; your acts draw +5% audiences.'))), st.promoter.active ? pill(`${$(st.promoter.revenue)}/m`, 'good') : h('button', { class: 'btn small', onclick: () => say(openVenture(s, 'promoter'), l('Promotora aberta.', 'Promoter opened.')) }, `${t(l('Abrir', 'Open'))} (${$(money(s, 150000))})`)]),
      s.year < 1970 && !st.ticketing.active ? null : tile('key', t(l('Ticketeira', 'Ticketing company')), [h('small', null, t(l('Taxas sobre ingressos.', 'Fees on tickets.'))), st.ticketing.active ? pill(`${$(st.ticketing.revenue)}/m`, 'good') : h('button', { class: 'btn small', onclick: () => say(openVenture(s, 'ticketing'), l('Ticketeira aberta.', 'Ticketing opened.')) }, `${t(l('Abrir', 'Open'))} (${$(money(s, 300000))})`)]),
      tile('guitar', t(l('Fábrica de instrumentos', 'Instrument factory')), [h('small', null, t(l('Vende mais com endossos de artistas famosos.', 'Sells more with famous artist endorsements.'))),
        st.instruments.active ? h('div', null, pill(`${$(st.instruments.revenue)}/m`, 'good'), h('div', { class: 'row wrap' }, playerActs(s).filter((id) => !st.instruments.endorsements.includes(id)).slice(0, 6).map((id) => h('button', { class: 'btn small ghost', onclick: () => say(endorse(s, id), l('Endosso fechado.', 'Endorsement signed.')) }, `+ ${s.acts[id].name}`))), h('div', { class: 'row wrap' }, st.instruments.endorsements.map((id) => actLink(s, id))))
          : h('button', { class: 'btn small', onclick: () => say(openVenture(s, 'instruments'), l('Fábrica aberta.', 'Factory opened.')) }, `${t(l('Abrir', 'Open'))} (${$(money(s, 200000))})`)]),
    )),
    !hasTech(s, 'streaming') && !st.streaming.active ? null : section(t(l('Plataforma de streaming própria', 'Own streaming platform')),
      st.streaming.active ? h('div', null, chips(stat('fans', N(st.streaming.subs), l('Assinantes', 'Subscribers')), stat('cd', st.streaming.licenses.length, l('Catálogos licenciados', 'Licensed catalogs'))),
        h('div', { class: 'row wrap' }, Object.values(s.labels).filter((lb) => lb.active && !st.streaming.licenses.includes(lb.id)).slice(0, 8).map((lb) => h('button', { class: 'btn small ghost', onclick: () => say(licenseCatalog(s, lb.id), l('Catálogo licenciado.', 'Catalog licensed.')) }, `${t(l('Licenciar', 'License'))} ${lb.name}`))))
        : h('div', null, h('p', { class: 'muted small' }, t(l('Concorra com as gigantes: assinantes crescem com o tamanho do catálogo (o seu e os licenciados). Investimento enorme.', 'Compete with the giants: subscribers grow with catalog size (yours and licensed ones). A huge investment.'))),
          h('button', { class: 'btn', onclick: () => say(launchStreaming(s, ''), l('Plataforma no ar!', 'Platform live!')) }, t(l('Lançar plataforma', 'Launch platform')))),
    ),
    section(t(l('Fusões no setor', 'Industry mergers')), st.mergers.length ? h('ul', { class: 'small' }, st.mergers.map((m) => h('li', null, `${m.year} — ${t(m.text)}`))) : h('p', { class: 'muted small' }, t(l('As grandes ainda não se fundiram. Quando acontecer, o órgão antitruste pode forçar a venda de catálogos — e você pode comprar.', "The majors haven't merged yet. When they do, the antitrust authority may force catalog sales — and you can buy.")))),
  );
}

function boardTab(s: GameState): HTMLElement {
  const b = s.x4.industry.board;
  if (!b.active) return section(t(l('Conselho e investidores', 'Board and investors')),
    h('p', null, t(l('Venda uma participação a investidores: entra um aporte agora, e um conselho passa a cobrar metas anuais (lucro, lançamentos, hits ou prêmios). Três anos ruins e você é demitido.', 'Sell a stake to investors: you get cash now, and a board starts setting annual goals (profit, releases, hits or awards). Three bad years and you are fired.'))),
    h('button', { class: 'btn primary', onclick: () => say(joinBoard(s, rngOf(s)), l('Investidores a bordo.', 'Investors on board.')) }, `${t(l('Aceitar investidores', 'Accept investors'))} (+${$(money(s, 400000))})`));
  return section(t(l('Conselho', 'Board')),
    chips(meter('heart', l('Satisfação', 'Satisfaction'), b.satisfaction), stat('warning', `${b.warnings}/3`, l('Avisos', 'Warnings')), stat('money', $(b.bonusPaid), l('Bônus recebidos', 'Bonuses received'))),
    h('h4', null, `${t(l('Metas de', 'Goals for'))} ${b.year || s.year}`),
    h('ul', null, boardProgress(s).map((g) => h('li', null, g.value >= g.target ? '☑ ' : '◻ ', t(g.text), h('small', { class: 'muted' }, ` (${g.metric === 'profit' ? $(g.value) : g.value})`)))),
    b.offers.length ? h('div', null, h('h4', null, t(l('Ofertas de emprego', 'Job offers'))), h('ul', { class: 'small' }, b.offers.map((o) => h('li', null, `${o.label} ${t(l('quer você como diretor.', 'wants you as an executive.'))}`)))) : null,
  );
}

function fxTab(s: GameState): HTMLElement {
  const st = s.x4.industry;
  return section(t(l('Câmbio e inflação', 'Exchange and inflation')),
    h('p', { class: 'muted small' }, t(l('Receitas em mercados com hiperinflação ou crise cambial perdem valor até chegar à matriz.', 'Revenue in markets with hyperinflation or currency crises loses value before it reaches HQ.'))),
    h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, h('th', null, t(l('Mercado', 'Market'))), h('th', null, t(l('Perda anual', 'Annual loss'))), h('th', null, t(l('Valor da moeda', 'Currency value'))))),
      h('tbody', null, MARKETS.map((m) => { const loss = fxLoss(m.id, s.year); return h('tr', null, h('td', null, t(m.name), s.player.territories.includes(m.id) ? ' ✓' : ''), h('td', { class: loss ? 'bad' : '' }, loss ? `${Math.round(loss * 100)}%` : '—'), h('td', null, `${Math.round((st.fx[m.id] ?? 1) * 100)}%`)); }))),
    h('p', { class: 'small' }, `${t(l('Perda cambial no ano', 'Currency loss this year'))}: ${$(st.fxLossYear)}`),
  );
}

function industryArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub industry' }, tabs('industry', [
    { id: 'supply', label: t(l('Fábricas e suprimentos', 'Plants and supply')), icon: 'house', render: () => supplyTab(s) },
    { id: 'retail', label: t(l('Lojas', 'Stores')), icon: 'cd', render: () => retailTab(s) },
    { id: 'dist', label: t(l('Distribuição e preço', 'Distribution and price')), icon: 'tour-bus', render: () => distributionTab(s) },
    { id: 'research', label: t(l('Pesquisa', 'Research')), icon: 'bulb', render: () => researchTab(s) },
    { id: 'corp', label: t(l('Mídia e empresas', 'Media and companies')), icon: 'bank', render: () => corpTab(s) },
    { id: 'board', label: t(l('Conselho', 'Board')), icon: 'handshake', render: () => boardTab(s) },
    { id: 'fx', label: t(l('Câmbio', 'Exchange')), icon: 'globe', render: () => fxTab(s) },
  ], rerender));
}

registerArea({ id: 'industry', label: l('Indústria', 'Industry'), icon: 'building', key: 'i', render: industryArea });

// ------------------------------------------------------------------ Sede: salas, itens e combos

registerSection('hq', {
  id: 'industry-rooms',
  render: (s) => {
    const rooms = effectiveRooms(s);
    const combos = activeCombos(s);
    if (!ui.swapA || !rooms.some((r) => r.id === ui.swapA)) ui.swapA = rooms[0]?.id ?? '';
    if (!ui.swapB || !rooms.some((r) => r.id === ui.swapB)) ui.swapB = rooms[1]?.id ?? '';
    const opt = rooms.map((r) => ({ value: r.id, label: `${t(ROOM_NAMES[r.kind])} (${r.id})` }));
    return section(t(l('Reformar a sede', 'Refit the HQ')),
      h('p', { class: 'muted small' }, t(l('Troque a função das salas para criar combos de vizinhança e compre itens com efeito medido.', 'Swap room functions to create adjacency combos and buy items with a measured effect.'))),
      h('div', { class: 'row wrap' }, select(ui.swapA, opt, (v) => { ui.swapA = v; rerender(); }, { 'aria-label': t(l('Sala A', 'Room A')) }), '⇄', select(ui.swapB, opt, (v) => { ui.swapB = v; rerender(); }, { 'aria-label': t(l('Sala B', 'Room B')) }),
        h('button', { class: 'btn small', onclick: () => say(swapRooms(s, ui.swapA, ui.swapB), l('Salas trocadas.', 'Rooms swapped.')) }, `${t(l('Trocar funções', 'Swap functions'))} (${$(money(s, 2500))})`)),
      h('h4', null, t(l('Combos', 'Combos'))),
      h('ul', { class: 'small' }, COMBOS.map((c) => h('li', { class: combos.includes(c) ? 'good' : 'muted' }, combos.includes(c) ? '☑ ' : '◻ ', `${t(c.name)} — ${t(c.effect)}`))),
      h('h4', null, t(l('Itens', 'Items'))),
      h('div', { class: 'cards' }, ROOM_ITEMS.map((it) => tile('sparkle', t(it.name), [h('small', null, t(it.desc)), h('small', { class: 'muted' }, `${t(ROOM_NAMES[it.room])} · ${s.x4.industry.items[it.id] ?? 0}/${it.max}`), h('button', { class: 'btn small', disabled: (s.x4.industry.items[it.id] ?? 0) >= it.max, onclick: () => say(buyItem(s, it.id), l('Item instalado.', 'Item installed.')) }, `${t(l('Comprar', 'Buy'))} ${$(money(s, it.cost))}`)]))),
    );
  },
});
