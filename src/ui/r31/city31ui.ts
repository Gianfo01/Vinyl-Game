// R31 · onda 4 (H · Loja e cidade) — CENAS DA LOJA E DA CASA (DOM). A pintura é shop31px.ts; a camada de clareza
// (pontos com dica, rótulos, "ver como lista", lista acessível, clique direito = painel rápido) é sceneView31.
//   · área 'loja31': a loja de instrumentos da cidade em cena (estoque do mês, etiquetas, laço = presente, quadro
//     Novidades com a contagem, vitrine da relíquia rara, balcão para presentear, janela da garagem). Cada ponto abre
//     um painel curto com o MESMO cartão da lista (comprar para você / empresa / presente, com o motivo do bloqueio).
//   · área 'casa31': entrar na casa (sala da época e garagem com os seus veículos); casas à venda da época (desde 1889),
//     escolher o terreno da casa, imóveis em outras cidades (aparecem na faixa "pelo mundo").
// Explorar não muda o mundo: montar a cena só lê.

import { cityById, l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import {
  HOUSES_1889_31, buyHome31, casasOn31, chooseHomeLot31, homeLots31, homePrice31, homeUpkeep31, homes31, housesAt31, moveHomeCost31,
} from '../../sim/r31/city31';
import { CO31, ME31, relicMeasure31 } from '../../sim/r31/relic31';
import { itemsOf31, knownPeople31, shopCities31, shopRows31, weeksToRestock31, type ShopRow31 } from '../../sim/r31/items31';
import { LOTS18, homeLot18 } from '../../sim/sys/campus18';
import { goodById, type Owned } from '../../sim/sys/goods8';
import { HOUSES, buyHouse, ownerOf } from '../../sim/sys/people/owner';
import { playerPerson } from '../../sim/sys/life';
import { money } from '../../sim/util';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { lookOf, avatarSprite } from '../pixel/avatar';
import { registerArea } from '../registry';
import { OWNER_EXTRAS } from '../sys/people/area';
import { PLACE_UI31 } from '../sys/place27ui';
import { lockBtn31 } from './lock31';
import { goDest31 } from './quick31';
import { blitPx31, sceneView31 } from './scene31';
import { MON31 } from './scene31model';
import { card, shop31Tab } from './shop31';
import { SH31, SW31, paintHouse31, paintShop31, type Fam31px, type ShopArt31 } from './shop31px';

export const SHOP_AREA31 = 'loja31';
export const HOUSE_AREA31 = 'casa31';
const UI = { city: '' };

/** Bonecos sobre a pintura: você (sempre presente) e, na loja, o vendedor atrás do balcão. */
function people(s: GameState, ctx: CanvasRenderingContext2D, you: [number, number], clerk?: [number, number]): void {
  const me = playerPerson(s);
  if (me) { const sp = avatarSprite(lookOf(me), { year: s.year, pose: 'stand', dir: 'SE', frame: 0 }); ctx.drawImage(sp.c, you[0] - 12, you[1] - 31); }
  if (clerk) { const sp = avatarSprite(lookOf({ id: `clerk31:${s.config.homeCity}` }), { year: s.year, pose: 'stand', dir: 'SW', frame: 0 }); ctx.drawImage(sp.c, clerk[0] - 12, clerk[1] - 31); }
}

// ---------------------------------------------------------------- loja

const famOf = (r: ShopRow31): Fam31px => (r.def?.cat === 'gift' ? 'gift' : (r.def?.fam as Fam31px | undefined) ?? 'guitar');
/** Modelo da arte da loja a partir do estoque do mês (só leitura). */
export function shopArt31(s: GameState, city: string): { art: ShopArt31; rows: ShopRow31[] } {
  const rows = shopRows31(s, city);
  const ppl = knownPeople31(s, 40);
  const items = rows.filter((r) => !r.relic && r.def?.cat !== 'garage');
  const gar = rows.filter((r) => r.def?.cat === 'garage');
  const rel = rows.find((r) => r.relic);
  const w = weeksToRestock31(s);
  const pt = getLang() === 'pt';
  const art: ShopArt31 = {
    year: s.year, head: `${pt ? 'Novidades' : 'New in'} ${t(MON31[s.month])}`, when: pt ? `muda em ${w} sem` : `changes in ${w} wk`, gar: pt ? 'Garagem' : 'Garage', clerk: true,
    weeks: w,
    items: items.slice(0, 6).map((r) => ({ offer: r.offer, fam: famOf(r), price: $(r.price), gift: ppl.length > 0, name: r.def!.name })),
    news: [...items.slice(0, 3).map((r) => `+ ${t(r.def!.name)}`), gar.length ? `+ ${t(gar[0].def!.name)}` : (pt ? '- esgotou o resto' : '- rest sold out')],
    relic: rel?.relic ? { name: l(rel.relic.n.pt, rel.relic.n.en), stars: relicMeasure31(s, rel.relic).tier, price: $(rel.price), offer: rel.offer } : undefined,
    garage: gar.length ? { price: $(gar[0].price), n: gar.length, car: gar[0].offer.length } : undefined,
  };
  return { art, rows };
}

function rowsModal(s: GameState, title: L, rows: ShopRow31[], empty: L): void {
  const ppl = knownPeople31(s, 40);
  modal(t(title), rows.length ? h('div', { class: 'cards' }, rows.map((r) => card(s, r, ppl))) : h('p', { class: 'muted' }, t(empty)), { wide: true });
}

/** A loja em cena (com a alternativa em lista = as abas de sempre). */
export function shopScene31(s: GameState): HTMLElement {
  const cities = shopCities31(s);
  const city = cities.includes(UI.city) ? UI.city : cities[0];
  const { art, rows } = shopArt31(s, city);
  const { px, spots } = paintShop31(art);
  const by = (offer: string) => rows.filter((r) => r.offer === offer);
  return sceneView31(s, {
    id: 'loja31', title: l('Loja de instrumentos', 'Instrument shop'), W: SW31, H: SH31,
    spots: [...spots.map((sp) => (sp.id === 'garage' ? { ...sp, quick: { kind: 'city' as const, id: city } } : sp)),
      { id: 'you', x: 118, y: 72, w: 22, h: 30, label: l('Você', 'You'), tip: l('O seu painel: agenda, energia e dinheiro pessoal', 'Your panel: agenda, energy and personal money'), go: { area: 'you' }, quiet: true }],
    paint: (cv) => { const ctx = blitPx31(cv, px.d, SW31, SH31); if (ctx) people(s, ctx, [128, 101], [172, 86]); },
    panels: {
      buy: (offer?: string) => rowsModal(s, l('Item à venda', 'Item for sale'), by(offer ?? ''), l('Este item já saiu.', 'This item is gone.')),
      news: () => rowsModal(s, l('Novidades do mês', 'New this month'), rows.filter((r) => !r.relic), l('Tudo vendido. Volte no mês que vem.', 'Sold out. Come back next month.')),
      garage: () => rowsModal(s, l('Garagem: carros e motos', 'Garage: cars and bikes'), rows.filter((r) => r.def?.cat === 'garage'), l('Nada na garagem este mês.', 'Nothing in the garage this month.')),
      relic: () => rowsModal(s, l('Vitrine de relíquia', 'Relic showcase'), rows.filter((r) => r.relic), l('Vitrine vazia este mês. Relíquias raras aparecem de vez em quando — sempre peças que já existem.', 'Empty showcase this month. Rare relics turn up now and then — always pieces that already exist.')),
      gift: () => rowsModal(s, l('Presentear alguém', 'Give a gift'), rows.filter((r) => !r.relic), l('Nada para presentear agora.', 'Nothing to give right now.')),
    },
    list: () => shop31Tab(s),
    intro: l('O estoque inteiro troca na virada do mês, de acordo com a época. Etiqueta com laço = pode comprar de presente.', 'The whole stock changes at the turn of the month, by era. A tag with a bow = can be bought as a gift.'),
    tools: cities.length > 1 ? select(city, cities.map((c) => ({ value: c, label: t(cityById[c]?.name ?? l(c, c)) })), (v) => { UI.city = v; rerender(); }) : null,
    legend: h('p', { class: 'small muted' }, t(l('Pessoal sai do seu bolso; empresa sai do caixa do selo; presente pode sair de qualquer um dos dois.', 'Personal comes out of your pocket; company comes out of the label\'s cash; a gift can come from either.'))),
  });
}

// ---------------------------------------------------------------- casa

const vehiclesOf = (s: GameState): Owned[] => ((s.x4 as unknown as { goods8?: { owned?: Owned[] } }).goods8?.owned ?? []).filter((o) => goodById[o.id]?.cat === 'vehicle');

/** A casa por dentro (sala da época e garagem). */
export function houseScene31(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const hs = o.house >= 0 ? HOUSES[o.house] : undefined;
  const cars = vehiclesOf(s);
  const garageItems = [...itemsOf31(s, ME31), ...itemsOf31(s, CO31)].filter((x) => x.def.cat === 'garage');
  const pt = getLang() === 'pt';
  const { px, spots } = paintHouse31({ year: s.year, gar: pt ? 'Garagem' : 'Garage', empty: pt ? 'vazia' : 'empty', house: hs?.id ?? 'rent', prestige: hs?.prestige ?? 0,
    cars: cars.length, carNames: cars.map((c) => goodById[c.id].name), piano: s.year < 1960 || (hs?.prestige ?? 0) >= 5, gold: Math.min(3, s.player.stats.gold), pool: hs?.id === 'modernist' || hs?.id === 'smart' });
  return sceneView31(s, {
    id: 'casa31', title: hs ? hs.name : l('Sua moradia (aluguel)', 'Your place (rented)'), W: SW31, H: SH31,
    spots: [...spots, { id: 'you', x: 132, y: 72, w: 22, h: 30, label: l('Você', 'You'), tip: l('O seu painel: agenda, energia e dinheiro pessoal', 'Your panel: agenda, energy and personal money'), go: { area: 'you' }, quiet: true }],
    paint: (cv) => { const ctx = blitPx31(cv, px.d, SW31, SH31); if (ctx) people(s, ctx, [142, 101]); },
    panels: {
      home: () => modal(t(l('Sala', 'Living room')), h('div', null,
        h('p', null, t(l('Patrimônio pessoal: {v}. Estresse: {e}.', 'Personal wealth: {v}. Stress: {e}.'), { v: $(o.wealth), e: Math.round(o.stress) })),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn small', onclick: () => goDest31({ area: 'wealth' }) }, t(l('Patrimônio e casa', 'Wealth and home'))),
          h('button', { class: 'btn small', onclick: () => goDest31({ area: 'personal' }) }, t(l('Vida pessoal (festas, lazer)', 'Personal life (parties, leisure)')))))),
      garage: () => modal(t(l('Garagem', 'Garage')), cars.length || garageItems.length
        ? h('ul', { class: 'attr-list' }, [...cars.map((c) => h('li', null, h('b', null, t(goodById[c.id].name)), ` · ${$(c.value)}`)), ...garageItems.map((x) => h('li', null, h('b', null, t(x.def.name)), ` · ${x.x.made}`, x.x.prev.length ? h('small', { class: 'muted' }, ` · ${t(l('{n} dono(s) antes', '{n} owner(s) before'), { n: x.x.prev.length })}`) : null))])
        : h('div', null, h('p', { class: 'muted' }, t(l('Garagem vazia.', 'Empty garage.'))), h('button', { class: 'btn small', onclick: () => goDest31({ area: SHOP_AREA31 }) }, t(l('Ver a janela da garagem na loja', 'See the garage window at the shop'))))),
    },
    list: () => houseList31(s),
    intro: l('A sua casa por dentro: a sala da época e a garagem com os seus veículos. Embaixo: casas à venda, terreno e imóveis em outras cidades.', 'Inside your home: the period living room and the garage with your vehicles. Below: houses for sale, the plot and homes in other cities.'),
  });
}

/** Casas à venda da época, terreno da casa e imóveis em outras cidades. */
export function houseList31(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
  const avail = housesAt31(s);
  const lots = homeLots31(s), cur = homeLot18(s);
  const mine = homes31(s);
  const others = Object.values(cityById).filter((c) => c.id !== s.config.homeCity && !mine.some((m) => m.city === c.id)).slice(0, 400);
  const sel = { city: others[0]?.id ?? '', house: avail[0] ?? 0, lot: lots[1] ?? cur };
  return h('div', null,
    section(t(l('Casas à venda ({y})', 'Houses for sale ({y})'), { y: s.year }), h('div', { class: 'cards' }, avail.map((i) => {
      const hs = HOUSES[i], here = o.house === i;
      const resale = o.house >= 0 ? Math.round(money(s, HOUSES[o.house].price) * 0.7) : 0, price = money(s, hs.price);
      return h('div', { class: 'card' }, h('b', null, t(hs.name)), ' ', HOUSES_1889_31.includes(hs.id) ? pill(t(l('da época', 'period')), 'gold') : null,
        h('p', { class: 'small' }, $(price), ' · ', t(l('alívio de estresse {r} · prestígio {p}', 'stress relief {r} · prestige {p}'), { r: hs.relief, p: hs.prestige })),
        here ? pill(t(l('sua casa', 'your home')), 'good')
          : lockBtn31(t(l('Comprar e mudar', 'Buy and move')), o.wealth + resale < price ? l('Patrimônio pessoal insuficiente (a casa sai do seu bolso, não da empresa).', 'Not enough personal wealth (the house comes out of your pocket, not the company).') : null,
            () => say(buyHouse(s, hs.id), l('Casa comprada!', 'House bought!'))));
    }))),
    section(t(l('Terreno da casa', 'House plot')), o.house < 0 ? h('p', { class: 'small muted' }, t(l('Compre uma casa para escolher o terreno.', 'Buy a house to choose its plot.')))
      : h('div', { class: 'row wrap' },
        h('span', null, t(l('Agora: {n}', 'Now: {n}'), { n: t(LOTS18[cur].name) })),
        select(String(sel.lot), lots.filter((x) => x !== cur).map((x) => ({ value: String(x), label: t(LOTS18[x].name) })), (v) => { sel.lot = +v; }),
        lockBtn31(h('span', null, t(l('Mudar a casa para lá', 'Move the house there')), ' ', h('small', null, $(moveHomeCost31(s)))), o.wealth < moveHomeCost31(s) ? l('Falta dinheiro pessoal para a mudança.', 'Not enough personal money for the move.') : lots.length < 2 ? l('Nenhum terreno livre agora.', 'No free plot right now.') : null,
          () => say(chooseHomeLot31(s, sel.lot), l('Mudança feita: a casa está no terreno novo.', 'Moved: the house is on the new plot.'))))),
    section(t(l('Imóveis em outras cidades', 'Homes in other cities')),
      mine.length ? h('ul', { class: 'attr-list' }, mine.map((m) => h('li', null, h('b', null, t(cityById[m.city]?.name ?? l(m.city, m.city))), ` · ${t(HOUSES[m.house].name)} · ${t(l('desde', 'since'))} ${m.y} · ${t(l('manutenção', 'upkeep'))} ${$(homeUpkeep31(s, m))}/${t(l('mês', 'mo'))}`))) : h('p', { class: 'small muted' }, t(l('Nenhum ainda. Eles aparecem na faixa "pelo mundo" do mapa.', 'None yet. They show up in the map\'s "around the world" strip.'))),
      casasOn31(s) && others.length && avail.length ? h('div', { class: 'row wrap' },
        select(sel.city, others.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { sel.city = v; }),
        select(String(sel.house), avail.map((i) => ({ value: String(i), label: t(HOUSES[i].name) })), (v) => { sel.house = +v; }),
        h('button', { class: 'btn small', title: t(l('Preço pelo tamanho da cidade; sai do seu bolso', 'Price by city size; comes out of your pocket')), onclick: () => say(buyHome31(s, sel.city, sel.house), l('Imóvel comprado.', 'Home bought.')) },
          t(l('Comprar imóvel', 'Buy home')), ' ', h('small', null, $(homePrice31(s, sel.city, sel.house))))) : null),
    h('p', { class: 'small muted' }, t(l('Casa melhor = menos estresse do dono e mais prestígio. Tudo sai do dinheiro pessoal.', 'A better home = less owner stress and more prestige. All of it comes out of personal money.'))));
}

// ---------------------------------------------------------------- registro

registerArea({ id: SHOP_AREA31, label: l('Loja de instrumentos', 'Instrument shop'), icon: 'guitar', key: '', render: (s) => h('div', { class: 'r31-shop' }, shopScene31(s)), visible: () => false });
registerArea({ id: HOUSE_AREA31, label: l('Sua casa', 'Your home'), icon: 'house', key: '', render: (s) => h('div', { class: 'r31-house' }, houseScene31(s), houseList31(s)), visible: () => false });
PLACE_UI31.extra.push((_s, p) => (p.k === 'instruments' ? h('button', { type: 'button', class: 'btn small', onclick: () => goDest31({ area: SHOP_AREA31 }) }, '🎸 ', t(l('Entrar na loja', 'Enter the shop'))) : null));
OWNER_EXTRAS.push((s) => section(t(l('Casa e loja', 'Home and shop')), h('div', { class: 'row wrap' },
  h('button', { class: 'btn small primary', onclick: () => goDest31({ area: HOUSE_AREA31 }) }, '🏠 ', t(l('Entrar na casa', 'Enter your home'))),
  h('button', { class: 'btn small', onclick: () => goDest31({ area: SHOP_AREA31 }) }, '🎸 ', t(l('Loja de instrumentos', 'Instrument shop'))),
  homes31(s).length ? pill(t(l('{n} imóvel(is) fora', '{n} home(s) abroad'), { n: homes31(s).length })) : null)));
