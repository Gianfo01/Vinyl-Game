import { tryDownload } from '../store';
// Rodada 9 — área "Lendas": a crônica do mundo. Rodada 11: refeita em abas com cartões — Panteão (quem
// definiu a época, recordes, relíquias em destaque, grandes fatos), linha do tempo, biografias, relíquias,
// cidades, jornal e livro. Cada lenda, recorde, fato e relíquia abre um popup com detalhes e ações
// (negociar com o dono, lance fechado no leilão, emprestar, expor, doar, pedir a um museu, detetive).
// Só passado e presente: tudo vem da crônica já acontecida.

import { CITIES, l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import { biography, chronQuery, chronState, definingFigures, genealogy, influences, nameOf, cityL, genreL, type ChronEv } from '../../sim/sys/chron9';
import { DREAM_TXT, FACETS, FACET_TXT, MEM_TXT, VALUES, VALUE_TXT, describeSoul, dreamOf, moodOf, soul, soulState } from '../../sim/sys/soul9';
import {
  RELIC_KIND, RELIC_ST, acceptCounter, borrowFee, borrowRelic, buyRelic, donateRelic, lendRelic, negotiateRelic, openingBid, ownerName, placeBid,
  relicAttach, relicPrice, relics, seekFee, seekRelic, sellRelic, toggleExhibit, type Relic,
} from '../../sim/sys/relics9';
import { press, rumorText } from '../../sim/sys/press9';
import { bookText, exportWorld, type WorldFile } from '../../sim/sys/world9';
import type { Act, GameState, Person, RunConfig } from '../../sim/types';
import { $, actLink, logo, modal, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { openPerson } from '../ficha';
import { newgameCards } from '../newgame';
import { PERSON_TABS, openActPage } from '../pages';
import { registerArea, registerPageTab } from '../registry';
import { relicHype12 } from './hype12';
import { erasTab17, relicStory17 } from './heritage17';
import { setTab, tabs } from '../vis';
import './lendas9.css';

const WORLD_KEY = 'vtn.world9';
const F: { dec: number; city: string; genre: string; who: string; minI: number; bioQ: string; city2: string; rf: string } = { dec: 0, city: '', genre: '', who: '', minI: 2, bioQ: '', city2: '', rf: '' };

const stars = (i: number) => h('span', { class: 'ln-stars', title: t(l('Importância', 'Importance')) }, '★'.repeat(i) + '☆'.repeat(5 - i));
const RELIC_ICON: Record<Relic['k'], string> = { guitar: '🎸', tape: '📼', lyrics: '📝', trophy: '🏆', outfit: '👗', mic: '🎤', drums: '🥁', record: '💿', car: '🚗', glasses: '👓', piano: '🎹', prop: '🎈', art: '🎨', bass: '🎸' };
const ST_CLS: Record<Relic['st'], string> = { auction: 'gold', player: 'good', stolen: 'bad', lost: 'bad', museum: '', kept: '' };

function who(s: GameState, id: string): HTMLElement {
  if (s.acts[id]) return actLink(s, id);
  if (s.persons[id]) return h('button', { class: 'link', onclick: () => openPerson(id) }, s.persons[id].name);
  return h('button', { class: 'link muted', onclick: () => openLegend(s, id) }, nameOf(s, id));
}
function card(cls: string, onclick: () => void, ...kids: (Node | string | null)[]): HTMLElement {
  return h('button', { class: `ln-card ${cls}`, onclick }, ...kids);
}
const grid = (...kids: HTMLElement[]) => h('div', { class: 'ln-cards' }, ...kids);
const empty = (x: L) => h('p', { class: 'muted' }, t(x));

function evRow(s: GameState, e: ChronEv): HTMLElement {
  return h('li', { class: `ln-ev i${e.i}` },
    h('button', { class: 'link ln-evt', onclick: () => openEvent(s, e) }, h('b', null, `${e.y}`), ' ', stars(e.i), ' ', t(e.t)),
    e.a?.length ? h('span', { class: 'muted small' }, ' · ', ...e.a.slice(0, 3).flatMap((id, i) => [i ? ', ' : '', who(s, id)])) : null);
}

// ---------------------------------------------------------------- popups

/** Popup com conteúdo que se redesenha depois de cada ação. */
function popup(title: string, paint: (redraw: () => void, close: () => void) => HTMLElement, wide = false): void {
  const box = h('div', { class: 'ln-pop' });
  let close = () => {};
  const redraw = () => { box.replaceChildren(paint(redraw, () => close())); };
  close = modal(title, box, { wide, onClose: rerender });
  redraw();
}

function openEvent(s: GameState, e: ChronEv): void {
  const MN = monthNames();
  popup(`${MN[e.m] ?? ''} ${e.y}`, () => {
    const near = (e.a ?? []).flatMap((id) => biography(s, id)).filter((x) => x !== e && Math.abs(x.y - e.y) <= 3 && x.y <= s.year);
    const uniq = [...new Set(near)].sort((a, b) => b.y - a.y || b.m - a.m).slice(0, 10);
    return h('div', null,
      h('p', { class: 'ln-big' }, t(e.t)),
      h('div', { class: 'row wrap' }, stars(e.i), e.c ? pill(t(cityL(e.c))) : null, e.g ? pill(t(genreL(e.g))) : null, pill(e.k)),
      e.a?.length ? section(t(l('Quem está nessa história', 'Who is in this story')), h('div', { class: 'row wrap' }, ...e.a.map((id) => h('button', { class: 'btn small ghost', onclick: () => openLegend(s, id) }, nameOf(s, id))))) : null,
      uniq.length ? section(t(l('Ao redor deste fato', 'Around this event')), h('ul', { class: 'attr-list' }, uniq.map((x) => evRow(s, x)))) : null);
  });
}

/** Lenda (pessoa ou ato): biografia, alma, genealogia e crônica, com atalho para a ficha. */
function openLegend(s: GameState, id: string): void {
  const p = s.persons[id];
  const A = s.acts[id];
  popup(nameOf(s, id), () => h('div', null,
    h('div', { class: 'row wrap' },
      p ? h('span', { class: 'muted' }, p.alive ? t(l('nascido em {y}', 'born {y}'), { y: p.born }) : `${p.born}–${p.died ?? '?'}`) : null,
      A ? pill(t(genreL(A.genre))) : null, A ? pill(t(cityL(A.city))) : null, A?.legend ? pill(t(l('lenda', 'legend')), 'gold') : null,
      p ? h('button', { class: 'btn small', onclick: () => openPerson(id) }, t(l('Abrir ficha', 'Open profile'))) : null,
      A ? h('button', { class: 'btn small', onclick: () => openActPage(id) }, t(l('Abrir página do ato', 'Open act page'))) : null),
    p ? h('div', null, bandPath(s, id), soulBlock(s, p), section(t(l('Vida', 'Life')), chronList(s, biography(s, id))))
      : h('div', null, A ? null : bandPath(s, id), actLegend(s, id))), true);
}

function recordModal(s: GameState, k: string): void {
  const R = RECS.find((x) => x.k === k)!;
  popup(t(R.name), () => {
    const cur = chronState(s).rec[k];
    const top = Object.values(s.acts).filter((a) => R.f(a) > 0).sort((a, b) => R.f(b) - R.f(a)).slice(0, 8);
    return h('div', null,
      cur ? h('p', { class: 'ln-big' }, t(l('Recordista: ', 'Holder: ')), who(s, cur.id), h('b', null, ` — ${cur.v}`)) : empty(l('Ninguém chegou lá ainda.', 'Nobody has got there yet.')),
      top.length ? section(t(l('Ranking de hoje', 'Standings today')), h('ol', { class: 'attr-list' }, top.map((a) => h('li', null, actLink(s, a.id), h('small', { class: 'muted' }, ` · ${R.f(a)}`))))) : null,
      section(t(l('Recordes quebrados', 'Records broken')), chronList(s, chronQuery(s, { kinds: ['record'] }), 30)));
  });
}
const RECS: { k: string; name: L; f: (a: Act) => number; icon: string }[] = [
  { k: 'n1', name: l('Mais números 1', 'Most number ones'), f: (a) => a.number1s, icon: '🥇' },
  { k: 'aw', name: l('Mais premiado', 'Most awarded'), f: (a) => a.awards, icon: '🏆' },
  { k: 'hits', name: l('Mais hits no top 10', 'Most top-10 hits'), f: (a) => a.hits, icon: '🔥' },
];

/** Relíquia: história, dono, valor e o que dá para fazer com ela agora. */
export function openRelic(s: GameState, id: string): void {
  const rl0 = relics(s).list.find((x) => x.id === id);
  if (!rl0) return;
  popup(t(rl0.n), (redraw) => {
    const rl = relics(s).list.find((x) => x.id === id)!;
    const res = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); redraw(); };
    const acts: (HTMLElement | null)[] = [];
    if (rl.st === 'auction') {
      const ob = openingBid(s, rl);
      acts.push(h('p', { class: 'small muted' }, t(l('Lance inicial {o}. Lance fechado: o martelo bate na semana {w}; vence o maior teto e paga pouco acima do segundo lance.', 'Opening bid {o}. Sealed bid: the hammer falls in week {w}; the highest ceiling wins and pays just above the runner-up.'), { o: $(ob), w: rl.au ?? '?' })),
        rl.bid ? h('p', null, pill(t(l('Seu lance: {v}', 'Your bid: {v}'), { v: $(rl.bid) }), 'gold')) : null,
        h('div', { class: 'row wrap' },
          ...[1, 1.2, 1.4, 1.7].map((m) => h('button', { class: 'btn small', onclick: () => res(placeBid(s, rl.id, Math.round(ob * m)), l('Lance registrado.', 'Bid placed.')) }, t(l('Teto {v}', 'Ceiling {v}'), { v: $(Math.round(ob * m)) }))),
          h('button', { class: 'btn small primary', onclick: () => res(buyRelic(s, rl.id), l('Arrematado!', 'Won!')) }, t(l('Arrematar já por {v}', 'Buy now for {v}'), { v: $(relicPrice(s, rl)) }))));
    } else if (rl.st === 'kept') {
      const ask = relicPrice(s, rl);
      const at = relicAttach(s, rl);
      acts.push(h('p', { class: 'small' }, t(l('Dono: {o}. Pedida estimada {v}. Apego: ', 'Owner: {o}. Estimated asking price {v}. Attachment: '), { o: ownerName(rl), v: $(ask) }),
        pill(t(at > 0.65 ? l('não quer vender', 'will not sell') : at > 0.42 ? l('negocia duro', 'drives a hard bargain') : l('aberto a ofertas', 'open to offers')), at > 0.65 ? 'bad' : at > 0.42 ? 'gold' : 'good')));
      if (rl.ctr && s.week <= rl.ctr.w) acts.push(h('div', { class: 'row wrap' }, pill(t(l('Contraproposta: {v} (até a semana {w})', 'Counter-offer: {v} (until week {w})'), { v: $(rl.ctr.p), w: rl.ctr.w }), 'gold'),
        h('button', { class: 'btn small primary', onclick: () => res(acceptCounter(s, rl.id), l('Negócio fechado!', 'Deal!')) }, t(l('Aceitar', 'Accept')))));
      else if (rl.cd && s.week < rl.cd) acts.push(h('p', { class: 'muted small' }, t(l('O dono não quer conversa até a semana {w}.', 'The owner will not talk until week {w}.'), { w: rl.cd })));
      else acts.push(h('div', { class: 'row wrap' }, ...([[0.8, l('Oferta baixa', 'Lowball')], [1, l('Pela pedida', 'At asking')], [1.3, l('Oferta generosa', 'Generous offer')], [1.7, l('Irrecusável', 'Irresistible')]] as [number, L][]).map(([m, lb]) =>
        h('button', { class: 'btn small', onclick: () => {
          const r = negotiateRelic(s, rl.id, m);
          if ('pt' in r) { toast(t(r), 'bad'); return; }
          toast(t(r.msg), r.r === 'accept' ? 'good' : r.r === 'counter' ? 'info' : 'bad');
          redraw();
        } }, `${t(lb)} · ${$(Math.round(ask * m))}`))));
    } else if (rl.st === 'player') {
      acts.push(h('p', { class: 'small' }, rl.ln ? t(l('Emprestada ao {m} até a semana {w}.', 'On loan to the {m} until week {w}.'), { m: rl.ln.to, w: rl.ln.w }) : rl.ex ? t(l('Exposta na sua sede: rende prestígio no fim do ano.', 'On display at your HQ: earns prestige at year end.')) : t(l('Guardada no cofre.', 'Kept in the vault.'))),
        h('div', { class: 'row wrap' },
          rl.ln ? null : h('button', { class: 'btn small', onclick: () => res(toggleExhibit(s, rl.id), rl.ex ? l('Exposta na sede.', 'On display.') : l('De volta ao cofre.', 'Back in the vault.')) }, t(rl.ex ? l('Guardar no cofre', 'Put in the vault') : l('Expor na sede', 'Display at HQ'))),
          rl.ln ? null : h('button', { class: 'btn small', onclick: () => res(lendRelic(s, rl.id), l('Emprestada por um ano: cachê recebido.', 'Lent for a year: fee received.')) }, t(l('Emprestar a um museu (cachê {v})', 'Lend to a museum (fee {v})'), { v: $(Math.round(relicPrice(s, rl) / 1.3 * 0.05)) })),
          h('button', { class: 'btn small ghost', onclick: () => res(donateRelic(s, rl.id), l('Doada. A imprensa aplaude.', 'Donated. The press applauds.')) }, t(l('Doar a um museu', 'Donate to a museum'))),
          rl.ln ? null : h('button', { class: 'btn small ghost', onclick: () => res(sellRelic(s, rl.id), l('Vendida a um colecionador.', 'Sold to a collector.')) }, t(l('Vender (85%)', 'Sell (85%)')))));
    } else if (rl.st === 'museum') {
      acts.push(h('p', { class: 'small' }, rl.brw ? t(l('Emprestada a você até a semana {w}, exposta na sua sede.', 'Lent to you until week {w}, on display at your HQ.'), { w: rl.brw }) : t(l('Museus não vendem, mas emprestam a quem tem reputação.', 'Museums do not sell, but they lend to those with a reputation.'))),
        rl.brw ? null : h('button', { class: 'btn small', onclick: () => res(borrowRelic(s, rl.id), l('O museu empresta a peça por um ano.', 'The museum lends it for a year.')) }, t(l('Pedir emprestada para expor ({v})', 'Ask to borrow for display ({v})'), { v: $(borrowFee(s, rl)) })));
    } else if (rl.st === 'stolen') {
      acts.push(h('button', { class: 'btn small', onclick: () => res(seekRelic(s, rl.id), l('Achada! Devolvida ao dono, e o crédito é seu.', 'Found! Returned to its owner, and you get the credit.')) }, t(l('Contratar detetive ({v})', 'Hire an investigator ({v})'), { v: $(seekFee(s, rl)) })));
    } else acts.push(empty(l('Perdida para sempre.', 'Lost forever.')));
    return h('div', null,
      h('div', { class: 'ln-relhead' }, h('span', { class: 'ln-ico' }, RELIC_ICON[rl.k]),
        h('div', null, h('div', null, t(RELIC_KIND[rl.k]), ' · ', String(rl.y), rl.a ? h('span', null, ' · ', who(s, rl.a)) : null, rl.p && rl.p !== rl.a ? h('span', null, ' · ', who(s, rl.p)) : null),
          h('div', { class: 'row wrap' }, pill(t(RELIC_ST[rl.st]), ST_CLS[rl.st]), h('b', null, $(relicPrice(s, rl)))))),
      relicHype12(s, rl.id),
      relicStory17(s, rl, redraw),
      section(t(l('Donos', 'Provenance')), h('ol', { class: 'ln-own' }, rl.own.map((o) => h('li', null, h('b', null, o[0]), h('small', { class: 'muted' }, ` · ${o[1]} · ${o[2]}`))))),
      section(t(l('Ações', 'Actions')), ...acts),
      section(t(l('Na crônica', 'In the chronicle')), chronList(s, chronQuery(s, { kinds: ['relic'] }).filter((e) => t(e.t).includes(t(rl.n))), 10)));
  });
}

function chronList(s: GameState, list: ChronEv[], n = 60): HTMLElement {
  return list.length ? h('ul', { class: 'attr-list' }, list.slice(-n).reverse().map((e) => evRow(s, e))) : empty(l('Nada registrado.', 'Nothing on record.'));
}
const monthNames = () => (getLang() === 'pt' ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

// ---------------------------------------------------------------- panteão

function figureCard(s: GameState, id: string, score?: number): HTMLElement {
  const A = s.acts[id];
  const p = s.persons[id];
  const sub = A ? `${t(genreL(A.genre))} · ${A.formed ?? ''}` : p ? (p.alive ? t(l('em atividade', 'active')) : `${p.born}–${p.died ?? '?'}`) : t(l('figura da história', 'historical figure'));
  return card(A?.legend ? 'gold' : '', () => openLegend(s, id), A ? logo(A, 36) : h('span', { class: 'ln-ico' }, p ? '👤' : '📜'),
    h('div', null, h('b', null, nameOf(s, id)), h('small', { class: 'muted' }, sub), score !== undefined ? h('small', { class: 'muted' }, t(l('peso histórico {v}', 'historical weight {v}'), { v: Math.round(score) })) : null));
}
function relicCard(s: GameState, rl: Relic): HTMLElement {
  return card(ST_CLS[rl.st], () => openRelic(s, rl.id), h('span', { class: 'ln-ico' }, RELIC_ICON[rl.k]),
    h('div', null, h('b', null, t(rl.n)), h('small', { class: 'muted' }, `${t(RELIC_KIND[rl.k])} · ${rl.y}`), h('span', null, pill(t(RELIC_ST[rl.st]), ST_CLS[rl.st]), ' ', h('small', null, $(relicPrice(s, rl))))));
}

function pantheon(s: GameState): HTMLElement {
  const figs = definingFigures(s, 8);
  const rec = chronState(s).rec;
  const rl = relics(s).list.filter((x) => x.st !== 'lost').sort((a, b) => Number(b.st === 'auction') - Number(a.st === 'auction') || b.v - a.v).slice(0, 4);
  const big = chronQuery(s, { minI: 4 }).filter((e) => e.y <= s.year).slice(-6).reverse();
  return h('div', null,
    section(t(l('Quem definiu a época', 'Who defined the age')), figs.length ? grid(...figs.map((x) => figureCard(s, x.id, x.score))) : empty(l('A história ainda está sendo escrita.', 'History is still being written.'))),
    section(t(l('Recordes', 'Records')), grid(...RECS.map((R) => {
      const c = rec[R.k];
      return card('', () => recordModal(s, R.k), h('span', { class: 'ln-ico' }, R.icon), h('div', null, h('b', null, t(R.name)), h('small', { class: 'muted' }, c ? `${nameOf(s, c.id)} · ${c.v}` : t(l('em aberto', 'open')))));
    }))),
    section(t(l('Relíquias em destaque', 'Featured relics')), rl.length ? grid(...rl.map((x) => relicCard(s, x))) : empty(l('Nenhuma relíquia ainda.', 'No relics yet.'))),
    section(t(l('Grandes fatos recentes', 'Recent landmark events')), big.length ? grid(...big.map((e) => card(`i${e.i}`, () => openEvent(s, e), h('span', { class: 'ln-ico' }, String(e.y)), h('div', null, stars(e.i), h('small', null, t(e.t)))))) : empty(l('Nada marcante ainda.', 'Nothing remarkable yet.'))));
}

// ---------------------------------------------------------------- linha do tempo

function timeline(s: GameState): HTMLElement {
  const c = chronState(s);
  const years = c.ev.map((e) => e.y);
  const y0 = Math.min(s.year, ...years);
  const decs: { value: number; label: string }[] = [{ value: 0, label: t(l('Todas as décadas', 'All decades')) }];
  for (let d = Math.floor(y0 / 10) * 10; d <= s.year; d += 10) decs.push({ value: d, label: `${d}s` });
  const cities = [...new Set(c.ev.map((e) => e.c).filter(Boolean) as string[])].sort((a, b) => t(cityL(a)).localeCompare(t(cityL(b))));
  const genres = [...new Set(c.ev.map((e) => e.g).filter(Boolean) as string[])].sort((a, b) => t(genreL(a)).localeCompare(t(genreL(b))));
  const q = F.who.trim().toLowerCase();
  const ids = q ? Object.entries(c.names).filter(([, n]) => n.toLowerCase().includes(q)).map(([id]) => id) : [];
  const list = chronQuery(s, { y0: F.dec || undefined, y1: F.dec ? F.dec + 9 : undefined, city: F.city || undefined, genre: F.genre || undefined, minI: F.minI })
    .filter((e) => e.y <= s.year && (!q || e.a?.some((id) => ids.includes(id)) || t(e.t).toLowerCase().includes(q)));
  const shown = list.slice(-300).reverse();
  const byYear: Record<number, ChronEv[]> = {};
  for (const e of shown) (byYear[e.y] ??= []).push(e);
  const old = Object.values(c.old).reduce((a, b) => a + b, 0);
  return h('div', { class: 'ln-tl' },
    h('div', { class: 'card ln-filters' },
      select(F.dec, decs, (v) => { F.dec = v; rerender(); }),
      select(F.city, [{ value: '', label: t(l('Todas as cidades', 'All cities')) }, ...cities.map((x) => ({ value: x, label: t(cityL(x)) }))], (v) => { F.city = v; rerender(); }),
      select(F.genre, [{ value: '', label: t(l('Todos os gêneros', 'All genres')) }, ...genres.map((x) => ({ value: x, label: t(genreL(x)) }))], (v) => { F.genre = v; rerender(); }),
      select(F.minI, [1, 2, 3, 4, 5].map((i) => ({ value: i, label: '★'.repeat(i) + '+' })), (v) => { F.minI = v; rerender(); }),
      h('input', { type: 'search', placeholder: t(l('Pessoa, banda ou palavra…', 'Person, act or word…')), value: F.who, onchange: (e: Event) => { F.who = (e.target as HTMLInputElement).value; rerender(); } })),
    h('p', { class: 'muted small' }, t(l('{n} fatos ({o} fatos menores antigos resumidos). Clique num fato para ver detalhes.', '{n} facts ({o} older minor facts summarized). Click an event for details.'), { n: list.length, o: old })),
    ...Object.keys(byYear).map(Number).sort((a, b) => b - a).map((y) => h('div', { class: 'ln-year' }, h('h4', null, String(y)), h('ul', { class: 'attr-list' }, byYear[y].map((e) => evRow(s, e))))));
}

// ---------------------------------------------------------------- biografias

export function soulBlock(s: GameState, p: Person): HTMLElement {
  const so = soul(s, p);
  const ps = soulState(s).p[p.id];
  const d = dreamOf(s, p);
  const mood = moodOf(s, p.id);
  return h('div', { class: 'grid2' },
    h('section', null,
      h('h4', null, t(l('Personalidade', 'Personality'))),
      h('ul', { class: 'attr-list' }, describeSoul(s, p).map((x) => h('li', null, t(x)))),
      h('p', null, h('b', null, t(l('Sonho: ', 'Dream: '))), t(DREAM_TXT[d]), ps?.dd ? pill(t(l('realizado em {y}', 'fulfilled in {y}'), { y: ps.dd }), 'good') : null),
      h('h4', null, t(l('Memórias', 'Memories')), ' ', pill(mood >= 10 ? t(l('em paz', 'at peace')) : mood <= -10 ? t(l('marcado', 'scarred')) : t(l('neutro', 'neutral')), mood >= 10 ? 'good' : mood <= -10 ? 'bad' : '')),
      ps?.m.length ? h('ul', { class: 'attr-list' }, ps.m.map(([k, v, y, ttl]) => h('li', { class: v >= 0 ? 'good' : 'bad' }, `${y} · `, t(MEM_TXT[k] ?? l(k, k)), h('small', { class: 'muted' }, ` ${v > 0 ? '+' : ''}${v}${ttl >= 8 ? t(l(' (trauma duradouro)', ' (lasting)')) : ''}`)))) : h('p', { class: 'muted small' }, t(l('Nada marcante ainda.', 'Nothing remarkable yet.')))),
    h('section', null,
      h('h4', null, t(l('Facetas', 'Facets'))),
      h('ul', { class: 'attr-list compact' }, FACETS.map((k) => h('li', { title: t(FACET_TXT[k][so.f[k] >= 50 ? 2 : 1]) }, h('span', null, t(FACET_TXT[k][0])), bar(so.f[k]), h('small', null, ` ${so.f[k]}`)))),
      h('h4', null, t(l('Valores', 'Values'))),
      h('ul', { class: 'attr-list compact' }, VALUES.map((k) => h('li', { title: t(VALUE_TXT[k][so.v[k] >= 50 ? 2 : 1]) }, h('span', null, t(VALUE_TXT[k][0])), bar(so.v[k]), h('small', null, ` ${so.v[k]}`))))));
}

function bandPath(s: GameState, pid: string): HTMLElement | null {
  const list = chronState(s).mem[pid];
  if (!list?.length) return null;
  return h('p', null, h('b', null, t(l('Bandas: ', 'Bands: '))), ...list.flatMap((x, i) => { const [a, y] = x.split(':'); return [i ? ' → ' : '', who(s, a), ` (${y})`]; }));
}

function actLegend(s: GameState, id: string): HTMLElement {
  const g = genealogy(s, id);
  const inf = influences(s, id);
  return h('div', null,
    inf.from.length || inf.to.length ? h('p', null,
      inf.from.length ? h('span', null, h('b', null, t(l('Influenciado por: ', 'Influenced by: '))), ...inf.from.flatMap((x, i) => [i ? ', ' : '', who(s, x)]), ' ') : null,
      inf.to.length ? h('span', null, h('b', null, t(l('Influenciou: ', 'Influenced: '))), ...inf.to.slice(0, 12).flatMap((x, i) => [i ? ', ' : '', who(s, x)])) : null) : null,
    g.length ? section(t(l('Genealogia', 'Family tree')), h('ul', { class: 'attr-list' }, g.map((m) => h('li', null, who(s, m.pid), ': ', ...m.path.flatMap((st, i) => [i ? ' → ' : '', st.a === id ? h('b', null, st.name) : who(s, st.a), ` (${st.y})`]))))) : null,
    section(t(l('Crônica', 'Chronicle')), chronList(s, biography(s, id))));
}

function bios(s: GameState): HTMLElement {
  const c = chronState(s);
  const q = F.bioQ.trim().toLowerCase();
  const found = q ? Object.entries(c.names).filter(([, n]) => n.toLowerCase().includes(q)).slice(0, 40).map(([id]) => ({ id, score: undefined as number | undefined })) : definingFigures(s, 24);
  return h('div', null,
    h('div', { class: 'card ln-filters' }, h('input', { type: 'search', placeholder: t(l('Buscar pessoa ou ato…', 'Search person or act…')), value: F.bioQ, onchange: (e: Event) => { F.bioQ = (e.target as HTMLInputElement).value; rerender(); } }),
      h('small', { class: 'muted' }, q ? t(l('{n} resultados', '{n} results'), { n: found.length }) : t(l('Quem definiu a época — clique para ler a biografia.', 'Who defined the age — click to read the biography.')))),
    found.length ? grid(...found.map((x) => figureCard(s, x.id, x.score))) : empty(l('Ninguém com esse nome na crônica.', 'Nobody by that name in the chronicle.')));
}

// ---------------------------------------------------------------- relíquias

const RF: [string, L, (r: Relic) => boolean][] = [
  ['', l('Todas', 'All'), (r) => r.st !== 'lost'],
  ['auction', l('Em leilão', 'At auction'), (r) => r.st === 'auction'],
  ['kept', l('Com donos', 'Privately held'), (r) => r.st === 'kept'],
  ['player', l('Seu acervo', 'Your collection'), (r) => r.st === 'player' || !!r.brw],
  ['museum', l('Em museus', 'In museums'), (r) => r.st === 'museum'],
  ['gone', l('Roubadas e perdidas', 'Stolen and lost'), (r) => r.st === 'stolen' || r.st === 'lost'],
];
function relicsTab(s: GameState): HTMLElement {
  const all = relics(s).list;
  if (!all.length) return empty(l('Ainda não há objetos lendários. Eles nascem com lendas, números 1, prêmios, surtos criativos e mortes.', 'No legendary objects yet. They are born from legends, number ones, awards, creative fits and deaths.'));
  const f = RF.find((x) => x[0] === F.rf) ?? RF[0];
  const list = all.filter(f[2]).sort((a, b) => Number(b.st === 'auction') - Number(a.st === 'auction') || b.v - a.v);
  const mine = all.filter((r) => r.st === 'player');
  return h('div', null,
    h('div', { class: 'ln-chips' }, ...RF.map(([k, lb, fn]) => h('button', { class: `chip ${k === F.rf ? 'on' : ''}`, onclick: () => { F.rf = k; rerender(); } }, `${t(lb)} (${all.filter(fn).length})`))),
    mine.length ? h('p', { class: 'muted small' }, t(l('Seu acervo vale {v}. Peças expostas na sede rendem prestígio todo ano.', 'Your collection is worth {v}. Pieces on display at HQ earn prestige every year.'), { v: $(mine.reduce((x, r) => x + relicPrice(s, r), 0)) })) : null,
    list.length ? grid(...list.map((r) => relicCard(s, r))) : empty(l('Nada nesta categoria.', 'Nothing in this category.')));
}

// ---------------------------------------------------------------- cidades, jornal, livro

function cities(s: GameState): HTMLElement {
  const c = chronState(s);
  const city = F.city2 || s.config.homeCity;
  const scenes = Object.entries(c.sc).filter(([k]) => k.startsWith(city + ':'));
  const ru = press(s).rum.filter((r) => r.cs.includes(city));
  return h('div', null,
    h('div', { class: 'card ln-filters' }, select(city, CITIES.map((x) => ({ value: x.id, label: t(x.name) })).sort((a, b) => a.label.localeCompare(b.label)), (v) => { F.city2 = v; rerender(); })),
    section(t(l('Cenas vivas', 'Living scenes')), scenes.length ? grid(...scenes.map(([k, y]) => card('', () => { F.genre = k.split(':')[1]; F.city = city; setTab('lendas9', 'tl'); rerender(); }, h('span', { class: 'ln-ico' }, '🎶'), h('div', null, h('b', null, t(genreL(k.split(':')[1]))), h('small', { class: 'muted' }, t(l('desde {y}', 'since {y}'), { y })))))) : empty(l('Nenhuma cena forte agora.', 'No strong scene right now.'))),
    section(t(l('O que se diz na cidade', 'What the town is saying')), ru.length ? h('ul', { class: 'attr-list' }, ru.slice(-12).reverse().map((r) => h('li', { class: r.tone > 0 ? 'good' : r.tone < 0 ? 'bad' : '' }, t(rumorText(r))))) : empty(l('Silêncio.', 'Silence.'))),
    section(t(l('História da cidade', 'City history')), chronList(s, chronQuery(s, { city, minI: 2 }), 80)));
}

function paper(s: GameState): HTMLElement {
  const p = press(s);
  const MN = monthNames();
  return h('div', { class: 'grid2' },
    section(t(l('Jornal do mundo', 'World newspaper')), h('ul', { class: 'attr-list ln-paper' }, p.hl.slice().reverse().slice(0, 30).map((x) => h('li', null, h('small', { class: 'muted' }, `${MN[x.m]} ${x.y} `), x.i >= 4 ? h('b', null, t(x.t)) : t(x.t))))),
    section(t(l('Boatos correndo', 'Rumors going around')), h('ul', { class: 'attr-list' }, p.rum.slice().reverse().slice(0, 20).map((r) => h('li', { class: r.tone > 0 ? 'good' : r.tone < 0 ? 'bad' : '' }, t(rumorText(r)),
      h('small', { class: 'muted' }, t(l(' — de {c}, já em {n} cidades{d}', ' — from {c}, now in {n} cities{d}'), { c: cityL(r.c0), n: r.cs.length, d: r.d ? l(' (distorcido)', ' (distorted)') : '' })))))));
}

function download(name: string, text: string, type: string): void {
  tryDownload(name, text, type);
}

export function saveWorld(s: GameState): void {
  const w = exportWorld(s);
  const json = JSON.stringify(w);
  try { localStorage.setItem(WORLD_KEY, json); } catch { /* sem espaço: só o arquivo */ }
  download(`mundo-${s.config.seed}-${s.year}.json`, json, 'application/json');
  toast(t(l('Mundo salvo. Comece outra run nele em Novo Jogo → Continuar em mundo salvo.', 'World saved. Start another run in it from New Game → Continue in saved world.')), 'good');
}

let bookCache: { y: number; m: number; txt: string } | null = null;
function book(s: GameState): HTMLElement {
  const lang = getLang() === 'pt' ? 'pt' : 'en';
  return h('div', null,
    s.ended ? h('p', { class: 'good' }, t(l('A run terminou. Salve o mundo para que a próxima história aconteça nele, anos depois.', 'The run is over. Save the world so the next story can happen in it, years later.'))) : null,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => { bookCache = { y: s.year, m: s.month, txt: bookText(s, lang) }; rerender(); } }, t(l('Escrever o livro da partida', 'Write the book of this run'))),
      h('button', { class: 'btn ghost', onclick: () => download(`historia-${s.config.seed}-${s.year}.txt`, bookText(s, lang), 'text/plain') }, t(l('Baixar como texto', 'Download as text'))),
      h('button', { class: 'btn primary', onclick: () => saveWorld(s) }, t(l('Salvar o mundo', 'Save the world')))),
    bookCache ? h('pre', { class: 'ln-book' }, bookCache.txt) : null);
}

function lendasArea(s: GameState): HTMLElement {
  const c = chronState(s);
  const rl = relics(s).list;
  const auc = rl.filter((x) => x.st === 'auction').length;
  const stat = (n: number | string, lb: L, go?: string) => h('button', { class: 'ln-stat', onclick: () => { if (go) { setTab('lendas9', go); rerender(); } } }, h('b', null, String(n)), h('small', null, t(lb)));
  return h('div', { class: 'panel lendas' },
    h('h2', null, t(l('Lendas — a crônica do mundo', 'Legends — the world chronicle'))),
    h('div', { class: 'ln-stats' },
      stat(c.ev.length, l('fatos na crônica', 'chronicle facts'), 'tl'),
      stat(Object.keys(c.names).length, l('nomes na história', 'names in history'), 'bio'),
      stat(Object.keys(c.sc).length, l('cenas vivas', 'living scenes'), 'city'),
      stat(rl.filter((x) => x.st !== 'lost').length, l('relíquias', 'relics'), 'relics'),
      stat(auc, l('em leilão', 'at auction'), 'relics'),
      stat(rl.filter((x) => x.st === 'player').length, l('no seu acervo', 'in your collection'), 'relics')),
    tabs('lendas9', [
      { id: 'pan', label: t(l('Panteão', 'Pantheon')), icon: 'vault', render: () => pantheon(s) },
      { id: 'tl', label: t(l('Linha do tempo', 'Timeline')), icon: 'clock', render: () => timeline(s) },
      { id: 'bio', label: t(l('Biografias', 'Biographies')), icon: 'pen', render: () => bios(s) },
      { id: 'relics', label: t(l('Relíquias', 'Relics')), icon: 'vault', badge: auc || undefined, render: () => relicsTab(s) },
      { id: 'city', label: t(l('Cidades e cenas', 'Cities and scenes')), icon: 'globe', render: () => cities(s) },
      { id: 'eras17', label: t(l('Épocas', 'Eras')), icon: 'clock', render: () => erasTab17(s) },
      { id: 'press', label: t(l('Jornal', 'Newspaper')), icon: 'newspaper', render: () => paper(s) },
      { id: 'book', label: t(l('Livro e mundo', 'Book and world')), icon: 'note', render: () => book(s) },
    ], rerender));
}

registerArea({ id: 'lendas', label: l('Lendas', 'Legends'), icon: 'vault', key: 'h', render: lendasArea, badge: (s) => relics(s).list.filter((x) => x.st === 'auction').length || undefined });

PERSON_TABS.push((s, p) => (p.isPlayer ? null : {
  id: 'soul9', label: l('Alma', 'Soul'), icon: 'brain',
  render: () => h('div', null, bandPath(s, p.id), soulBlock(s, p), section(t(l('Na crônica', 'In the chronicle')), h('ul', { class: 'attr-list' }, biography(s, p.id).slice(-30).reverse().map((e) => evRow(s, e))))),
}));

registerPageTab('act', { id: 'lendas9', label: l('Lendas', 'Legends'), icon: 'vault', order: 80, render: (s, id) => actLegend(s, id) });

// ---------------------------------------------------------------- Novo Jogo: história prévia e mundo salvo

function storedWorld(): WorldFile | null {
  try { const x = localStorage.getItem(WORLD_KEY); return x ? (JSON.parse(x) as WorldFile) : null; } catch { return null; }
}

/** Cartão do Novo Jogo (rodada 9): gerar história prévia e continuar num mundo salvo. */
export function worldCard9(cfg: RunConfig, onYear?: (y: number) => void): HTMLElement {
  let w = storedWorld();
  let gap = 10;
  const info = h('small', { class: 'muted' });
  const apply = (on: boolean) => {
    if (on && w) { cfg.world9 = w; cfg.startYear = Math.max(1920, Math.min(2039, w.year + gap)); onYear?.(cfg.startYear); info.textContent = t(l('{c}, {y} → começa em {s}.', '{c}, {y} → starts in {s}.'), { c: w.company, y: w.year, s: cfg.startYear }); }
    else { delete cfg.world9; info.textContent = w ? t(l('Mundo salvo: {c} ({y}).', 'Saved world: {c} ({y}).'), { c: w.company, y: w.year }) : t(l('Nenhum mundo salvo. Salve um em Lendas → Livro e mundo, ou carregue um arquivo.', 'No saved world. Save one in Legends → Book and world, or load a file.')); }
  };
  const box = h('input', { type: 'checkbox', disabled: !w, onchange: (e: Event) => apply((e.target as HTMLInputElement).checked) }) as HTMLInputElement;
  apply(false);
  const file = h('input', { type: 'file', accept: '.json,application/json', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try { w = JSON.parse(await f.text()) as WorldFile; box.disabled = false; box.checked = true; apply(true); } catch { toast(t(l('Arquivo de mundo inválido.', 'Invalid world file.')), 'bad'); }
  } });
  return h('section', { class: 'card' },
    h('h3', null, t(l('Mundo', 'World'))),
    h('label', { title: t(l('Simula, numa passada leve só de artistas, os anos antes do início: bandas, hits, lendas, separações, mortes, selos e cenas.', 'Runs a light, artists-only pass over the years before the start: bands, hits, legends, splits, deaths, labels and scenes.')) },
      t(l('Gerar história prévia', 'Generate prior history')),
      select(cfg.prehist ?? 0, [0, 10, 20, 40].map((n) => ({ value: n, label: n ? t(l('{n} anos', '{n} years'), { n }) : t(l('Nenhuma', 'None')) })), (v) => (cfg.prehist = v))),
    h('label', { class: 'check' }, box, t(l('Continuar em mundo salvo', 'Continue in saved world'))),
    h('label', null, t(l('Anos depois', 'Years later')), select(gap, [5, 10, 20, 30].map((n) => ({ value: n, label: String(n) })), (v) => { gap = v; if (box.checked) apply(true); })),
    h('label', null, t(l('Carregar arquivo de mundo', 'Load world file')), file),
    info);
}

newgameCards().push(worldCard9);
