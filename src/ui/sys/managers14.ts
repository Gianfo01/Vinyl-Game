// Rodada 14 — Empresários (interface): diretório dos empresários ativos da época (reais ou equivalentes),
// ficha completa de cada um (atributos unificados, opinião, carteira, exigência do estilo, histórico),
// ações (almoço, indicação, acordo de paz, disputar cliente na sua carreira de empresário) e uma aba
// "Empresário" na página do artista.

import { MGR_STYLE, REAL_MGRS, mgrById, type RealMgr } from '../../data/managers14';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { fameText } from '../../sim/sys/fame15';
import { isActive } from '../../sim/sys/careers12';
import {
  LUNCH_COST, askReferral, inFeud, knownMgr, lunch, lunchBlock, m14, makePeace, mgrActive, mgrCap, mgrKey, mgrLog, mgrName, mgrRanking, pastClients,
  peaceBlock, peaceCost, referralBlock, repOf, rivalAdj14, rosterOf, type Res14,
} from '../../sim/sys/managers14';
import { opinionOf } from '../../sim/sys/persona13';
import { mgCap, mgChance, pitchClient, ventures } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, actLink, cityName, modal, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { openOffer } from '../ficha';
import { registerArea, registerPageTab } from '../registry';
import { store } from '../store';
import { ficha13 } from './persona13';
import { personRoute16 } from '../route16';
import { mgrsOfAct16 } from '../../sim/sys/people16';

/** Rodada 16: quem já empresariou o ato (com anos). */
function mgrHist16(s: GameState, actId: string): HTMLElement | null {
  const hs = mgrsOfAct16(s, actId).filter((x) => mgrById[x.id]);
  return hs.length ? section(t(l('Empresários ao longo da carreira', 'Managers over the career')), h('ul', { class: 'small' }, hs.map((x) => h('li', null, mgrBtn(s, mgrById[x.id]), ` · ${x.from}–${x.to ?? t(l('hoje', 'now'))}`)))) : null;
}

const F = { past: false };
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const years = (s: GameState, m: RealMgr) => `${m.from}–${mgrActive(s, m) ? '' : Math.min(m.to, m.died ?? 9999)}`;
const stylePill = (m: RealMgr) => h('span', { title: t(MGR_STYLE[m.style][1]) }, pill(t(MGR_STYLE[m.style][0]), m.style === 'guardian' ? 'good' : m.style === 'muscle' || m.style === 'shark' ? 'bad' : ''));
const opPill = (s: GameState, id: string) => { const v = opinionOf(s, mgrKey(id)); return pill(signed(v), v >= 15 ? 'good' : v <= -15 ? 'bad' : ''); };
const mgrBtn = (s: GameState, m: RealMgr) => h('button', { class: 'link', onclick: () => openMgr14(m.id) }, mgrName(s, m));
const act14 = (redraw: () => void, fn: () => Res14) => () => { const r = fn(); toast(t(r.text), r.ok ? 'good' : 'bad'); redraw(); rerender(); };

/** Disputar o cliente de um empresário (carreira de empresário do jogador). */
function contestBtn(s: GameState, actId: string, redraw: () => void): HTMLElement | null {
  const a = s.acts[actId];
  const mg = ventures(s).mg;
  if (!a || !isActive(s, 'manager') && !mg.clients.length) return null;
  if (mg.clients.some((c) => c.actId === actId)) return pill(t(l('seu cliente', 'your client')), 'good');
  const full = mg.clients.length >= mgCap(s);
  const ch = mgChance(s, a, 0.15);
  const adj = rivalAdj14(s, a);
  return h('button', {
    class: 'btn small', disabled: full,
    title: full ? t(l('Sua carteira está cheia.', 'Your roster is full.')) : t(l('Chance {c} (15% de comissão). O empresário atual pesa {d} pontos: negociação + carisma dele, rixa e o que ele pensa de você. Tirar o cliente dele gera mágoa — e rixa com tubarões e linhas-duras.', 'Chance {c} (15% commission). The current manager weighs {d} points: their negotiation + charisma, feud and what they think of you. Taking their client hurts them — and starts a feud with sharks and enforcers.'), { c: pct(ch), d: signed(adj * 100) }),
    onclick: act14(redraw, () => pitchClient(s, rngOf(s), actId, 0.15)),
  }, `${t(l('Disputar cliente', 'Contest client'))} · ${pct(ch)}`);
}

export function profile(s: GameState, id: string, redraw: () => void, full = true): HTMLElement {
  const m = mgrById[id];
  const live = mgrActive(s, m);
  const ro = live ? rosterOf(s, id) : [];
  const past = pastClients(s, m);
  const feud = inFeud(s, id);
  const lb = lunchBlock(s, id), rb = referralBlock(s, id), pb = peaceBlock(s, id);
  const lg = mgrLog(s, id).slice(-8).reverse();
  return h('div', null,
    h('p', null, stylePill(m), ' ', h('span', { class: 'small muted' }, `${cityName(m.city)} · ${t(l('na gestão', 'managing'))} ${years(s, m)}${m.born ? ` · ${t(l('nasc.', 'b.'))} ${m.born}` : ''} · ${t(l('comissão típica', 'typical commission'))} ${pct(m.rate)}`), feud ? pill(t(l('rixa com você', 'feuding with you')), 'bad') : null),
    s.config.realNames ? h('p', null, t(m.bio)) : h('p', { class: 'small muted' }, t(l('Personagem inspirado num empresário real da época (nomes reais desligados).', 'Character inspired by a real manager of the era (real names off).'))),
    h('p', { class: 'small' }, h('b', null, t(l('Nas suas propostas: ', 'In your offers: '))), t(MGR_STYLE[m.style][1]), ' ',
      t(l('Também pesa a negociação dele ({n}) contra a do seu selo, a opinião que tem de você e qualquer rixa.', 'Their negotiation ({n}) against your label\'s, their opinion of you and any feud also count.'), { n: m.a[1] })),
    section(t(l('Carteira atual', 'Current roster')),
      ro.length ? h('ul', null, ro.map((a) => h('li', null, actLink(s, a.id), ` · ${t(l('fama', 'fame'))} ${fameText(s, a.id)}`, a.owner === 'player' ? h('span', null, ' ', pill(t(l('no seu selo', 'on your label')), 'trait')) : null, ' ', contestBtn(s, a.id, redraw))))
        : h('p', { class: 'muted small' }, live ? t(l('Sem clientes no momento.', 'No clients right now.')) : t(l('Fora do ramo.', 'Out of the business.'))),
      live ? h('p', { class: 'small muted' }, t(l('Capacidade: {c} clientes (gestão {g}).', 'Capacity: {c} clients (management {g}).'), { c: mgrCap(m), g: m.a[3] })) : null),
    s.config.realNames && past.length ? section(t(l('Clientes na história real', 'Clients in real history')), h('ul', { class: 'small' }, past.map(([n, a, b]) => h('li', null, `${n} (${a}–${b})`)))) : null,
    live ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', disabled: !!lb, title: t(lb ?? l('Aproxima: conta seu carisma e o dele. A cada 6 meses.', 'Brings you closer: your charisma and theirs count. Every 6 months.')), onclick: act14(redraw, () => lunch(s, id)) }, `${t(l('Almoço de negócios', 'Business lunch'))} · ${$(money(s, LUNCH_COST))}`),
      h('button', { class: 'btn small', disabled: !!rb, title: t(rb ?? l('Gasta boa vontade: ele manda um cliente sem selo; suas propostas a ele ganham peso por 3 meses.', 'Spends goodwill: they send an unsigned client; your offers to them gain weight for 3 months.')), onclick: act14(redraw, () => askReferral(s, id)) }, t(l('Pedir indicação', 'Ask for a referral'))),
      feud ? h('button', { class: 'btn small', disabled: !!pb, title: t(pb ?? l('Paga um acordo e encerra a rixa.', 'Pay a settlement and end the feud.')), onclick: act14(redraw, () => makePeace(s, id)) }, `${t(l('Fazer as pazes', 'Make peace'))} · ${$(peaceCost(s, m))}`) : null,
    ) : null,
    lg.length ? section(t(l('Histórico com o mercado e com você', 'History with the trade and with you')), h('ul', { class: 'small' }, lg.map(([y, mo, , x]) => h('li', null, `${mo + 1}/${y} — `, t(x))))) : null,
    full ? section(t(l('Ficha', 'Profile')), ficha13(s, mgrKey(id), redraw)) : null,
  );
}

export function openMgr14(id: string): void {
  if (personRoute16.f?.(mgrKey(id), 'r_manager')) return;
  const s = store.game;
  const m = mgrById[id];
  if (!s || !m || !knownMgr(s, m)) return;
  const box = h('div');
  const draw = () => box.replaceChildren(profile(s, id, draw));
  draw();
  modal(mgrName(s, m), box, { wide: true });
}

function area(s: GameState): HTMLElement {
  const st = m14(s);
  const list = REAL_MGRS.filter((m) => (F.past ? knownMgr(s, m) : mgrActive(s, m)));
  list.sort((a, b) => rosterOf(s, b.id).reduce((t2, x) => t2 + x.fame, 0) - rosterOf(s, a.id).reduce((t2, x) => t2 + x.fame, 0) || a.from - b.from);
  const brought = Object.entries(st.brought).filter(([a, b]) => s.acts[a] && b[1] >= s.week);
  const mine = ventures(s).mg.clients.length > 0 || isActive(s, 'manager');
  const rank = mine ? mgrRanking(s) : [];
  return h('div', { class: 'stack' },
    h('h2', null, t(l('Empresários', 'Managers'))),
    h('p', { class: 'small muted' }, t(l('Quem manda na carreira dos artistas. Um empresário negocia pelo cliente nas suas propostas (cada estilo exige algo), indica artistas a quem confia, faz exigências nas renovações e, se virar desafeto, envenena e rouba seus artistas. Presentes, almoços e elogios aproximam; aliciar clientes deles e recusar exigências afastam.', 'Who runs artists\' careers. A manager negotiates for the client in your offers (each style demands something), refers acts to people they trust, makes demands at renewal time and, as an enemy, poisons and poaches your acts. Gifts, lunches and praise bring them closer; poaching their clients and refusing demands push them away.'))),
    brought.length ? section(t(l('Indicações recebidas', 'Referrals received')), h('ul', null, brought.map(([a, [mid, w]]) => h('li', null, actLink(s, a), ' — ', t(l('indicado por', 'referred by')), ' ', mgrBtn(s, mgrById[mid]), h('span', { class: 'small muted' }, ` · ${t(l('vale até a semana', 'valid until week'))} ${w} `), s.acts[a].owner ? null : h('button', { class: 'btn small', onclick: () => openOffer(a) }, t(l('Fazer proposta', 'Make an offer'))))))) : null,
    rank.length ? section(t(l('Disputa por clientes (sua carreira de empresário)', 'Race for clients (your manager career)')),
      h('table', { class: 'table small' }, h('tr', null, h('th', null, '#'), h('th', null, t(l('Escritório', 'Office'))), h('th', null, t(l('Clientes', 'Clients'))), h('th', null, t(l('Fama somada', 'Total fame')))),
        rank.slice(0, 10).map((r, i) => h('tr', { class: r.you ? 'good' : '' }, h('td', null, String(i + 1)), h('td', null, r.you ? h('b', null, r.name) : h('button', { class: 'link', onclick: () => openMgr14(r.id) }, r.name)), h('td', null, String(r.clients)), h('td', null, String(r.fame))))),
      h('p', { class: 'small muted' }, t(l('Tirar clientes de outro empresário é mais difícil quanto mais forte ele for; dá para disputar na ficha dele ou na página do artista.', 'Taking clients from another manager is harder the stronger they are; contest them on their profile or the artist page.')))) : null,
    h('div', { class: 'row wrap' },
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: F.past, onchange: (e: Event) => { F.past = (e.target as HTMLInputElement).checked; rerender(); } }), ' ', t(l('Incluir quem já saiu do ramo', 'Include those who left the business')))),
    list.length ? h('table', { class: 'table' },
      h('tr', null, ...[l('Nome', 'Name'), l('Estilo', 'Style'), l('Praça', 'Base'), l('Anos', 'Years'), l('Negociação', 'Negotiation'), l('Carisma', 'Charisma'), l('Opinião', 'Opinion'), l('Clientes', 'Clients')].map((x) => h('th', null, t(x)))),
      list.map((m) => {
        const ro = mgrActive(s, m) ? rosterOf(s, m.id) : [];
        return h('tr', null, h('td', null, mgrBtn(s, m), inFeud(s, m.id) ? h('span', null, ' ', pill(t(l('rixa', 'feud')), 'bad')) : null), h('td', null, stylePill(m)), h('td', null, cityName(m.city)), h('td', null, years(s, m)),
          h('td', null, String(m.a[1])), h('td', null, String(m.a[2])), h('td', null, opPill(s, m.id)),
          h('td', { class: 'small' }, ro.length ? ro.slice(0, 4).flatMap((a, i) => (i ? [', ', actLink(s, a.id)] : [actLink(s, a.id)])) : '—', ro.length > 4 ? ` +${ro.length - 4}` : ''));
      })) : h('p', { class: 'muted' }, t(l('Nenhum empresário de destaque em atividade neste ano.', 'No prominent managers active this year.'))),
  );
}

registerArea({ id: 'managers14', label: l('Empresários', 'Managers'), icon: 'handshake', key: '', render: area, badge: (s) => Object.values(m14(s).brought).filter((b) => b[1] >= s.week).length || undefined });

registerPageTab('act', {
  id: 'mgr14', label: l('Empresário', 'Manager'), icon: 'handshake', order: 46,
  when: (s, id) => !!repOf(s, id) || !!m14(s).brought[id] || mgrsOfAct16(s, id).length > 0,
  render: (s, id) => {
    const m = repOf(s, id);
    const br = m14(s).brought[id];
    const box = h('div');
    const draw = () => box.replaceChildren(h('div', null,
      m ? h('p', null, t(l('Representado por', 'Represented by')), ' ', mgrBtn(s, m), ' ', stylePill(m), ' · ', t(l('opinião sobre você', 'opinion of you')), ' ', opPill(s, m.id), inFeud(s, m.id) ? h('span', null, ' ', pill(t(l('rixa', 'feud')), 'bad')) : null) : null,
      m ? h('p', { class: 'small' }, h('b', null, t(l('O que exige numa proposta: ', 'What they demand in an offer: '))), t(MGR_STYLE[m.style][1]), ' ', t(l('Negociação {n}.', 'Negotiation {n}.'), { n: m.a[1] })) : null,
      br && br[1] >= s.week ? h('p', { class: 'small good' }, t(l('Indicado por {n}: suas propostas valem mais até a semana {w}.', 'Referred by {n}: your offers count for more until week {w}.'), { n: mgrName(s, mgrById[br[0]]), w: br[1] })) : null,
      m ? contestBtn(s, id, draw) : null,
      !m ? h('p', { class: 'small muted' }, t(l('Sem empresário no momento: negocia direto (sem exigências de estilo).', 'No manager right now: negotiates directly (no style demands).'))) : null,
      mgrHist16(s, id),
    ));
    draw();
    return box;
  },
});
