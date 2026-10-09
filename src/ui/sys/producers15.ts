// Rodada 15 — Produtores reais (interface): lista com som, cachê e disponibilidade, e página de cada um (bio,
// obras até o ano atual, créditos com você e com selos rivais, ficha completa, jantar para aproximar).

import { REAL_PRODS, prodById, type RealProd } from '../../data/producers15';
import { FAMILIES, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { DINNER_COST, bookedBy, dinner, dinnerBlock, feeMult, feeOf, opOf, p15, prodActive, prodDefId, prodKey, prodKnown, prodName, refuses, worksOf } from '../../sim/sys/producers15';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, cityName, modal, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerArea } from '../registry';
import { store } from '../store';
import { ficha13 } from './persona13';

const F = { fam: '', past: false };
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
const years = (s: GameState, p: RealProd) => `${p.from}–${prodActive(s, p) ? '' : Math.min(p.to, p.died ?? 9999)}`;
const opPill = (s: GameState, p: RealProd) => { const v = opOf(s, p); return pill(signed(v), v >= 15 ? 'good' : v <= -15 ? 'bad' : ''); };
const stars = (p: RealProd) => '$'.repeat(p.tier);
function status(s: GameState, p: RealProd): HTMLElement {
  if (!prodActive(s, p)) return pill(t(l('fora de atividade', 'retired')), '');
  if (refuses(s, p)) return pill(t(l('não trabalha com você', 'will not work with you')), 'bad');
  const b = bookedBy(s, p);
  if (b) return pill(t(l('com {x} até a semana {w}', 'with {x} until week {w}'), { x: s.labels[b[0]].name, w: b[1] }), 'bad');
  const busy = (s.producerBusy[prodDefId(p.id)] ?? 0) - s.week;
  return busy > 0 ? pill(t(l('ocupado por {w} sem.', 'busy for {w} wk'), { w: busy }), 'bad') : pill(t(l('livre', 'available')), 'good');
}
const link = (s: GameState, p: RealProd) => h('button', { class: 'link', onclick: () => openProd15(p.id) }, prodName(s, p));

function profile(s: GameState, id: string, redraw: () => void): HTMLElement {
  const p = prodById[id];
  const live = prodActive(s, p);
  const works = worksOf(s, p);
  const cr = (p15(s).credits[id] ?? []).slice().reverse();
  const fm = feeMult(s, p);
  const db = dinnerBlock(s, id);
  const fams = p.fam.map((f) => t(FAMILIES.find((x) => x.id === f)?.name ?? l(f, f))).join(', ');
  return h('div', null,
    h('p', null, pill(t(p.snd), 'trait'), ' ', status(s, p), ' ', h('span', { class: 'small muted' }, `${cityName(p.city)}${s.config.realNames ? ` · ${p.studio}` : ''} · ${years(s, p)}${p.born && s.config.realNames ? ` · ${t(l('nasc.', 'b.'))} ${p.born}` : ''}`)),
    s.config.realNames ? h('p', null, t(p.bio)) : h('p', { class: 'small muted' }, t(l('Personagem inspirado num produtor real da época (nomes reais desligados).', 'Character inspired by a real producer of the era (real names off).'))),
    h('p', { class: 'small' }, h('b', null, t(l('Som de assinatura: ', 'Signature sound: '))), t(l('produção {a}, performance {b}, originalidade {c}; rende 100% nos gêneros {g} e 60% fora deles.', 'production {a}, performance {b}, originality {c}; full effect in {g} and 60% outside them.'), { a: signed(p.fx[0]), b: signed(p.fx[1]), c: signed(p.fx[2]), g: fams })),
    h('p', { class: 'small' }, h('b', null, t(l('Cachê: ', 'Fee: '))), `${$(money(s, feeOf(s, p)))}/${t(l('faixa', 'track'))} (${stars(p)})`, fm.why.length ? ` — ${fm.why.map((x) => t(x)).join('; ')}` : '', '. ', t(l('Um grande projeto por vez: quem é de faixa alta fecha a agenda por mais algumas semanas. Contrate no estúdio ou no projeto musical.', 'One big project at a time: top-tier names shut the diary for a few more weeks. Hire in the studio or the music project.'))),
    works.length ? section(t(l('Obras famosas', 'Famous works')), h('ul', { class: 'small' }, works.map(([w, a, y]) => h('li', null, `${w} — ${a} (${y})`)))) : null,
    cr.length ? section(t(l('Créditos recentes no jogo', 'Recent credits in the game')), h('ul', { class: 'small' }, cr.slice(0, 8).map((c) => h('li', null, `${c.m + 1}/${c.y} — `, c.you ? h('b', null, `${c.who}: "${c.title}" (Q ${c.q})`) : `${c.who} · ${c.title}`)))) : null,
    live ? h('div', { class: 'row wrap' }, h('button', { class: 'btn small', disabled: !!db, title: t(db ?? l('Aproxima: seu carisma e seu ouvido contam. A cada 6 meses. Bom relacionamento dá desconto; quem o desagrada paga mais ou nem é atendido.', 'Brings you closer: your charisma and ear count. Every 6 months. A good relationship gives a discount; disliked, you pay more or are turned away.')), onclick: () => { const r = dinner(s, id); toast(t(r.text), r.ok ? 'good' : 'bad'); redraw(); rerender(); } }, `${t(l('Jantar no estúdio', 'Dinner at the studio'))} · ${$(money(s, DINNER_COST))}`)) : null,
    section(t(l('Ficha', 'Profile')), ficha13(s, prodKey(id), redraw)),
  );
}

export function openProd15(id: string): void {
  const s = store.game;
  const p = prodById[id];
  if (!s || !p || !prodKnown(s, p)) return;
  const box = h('div');
  const draw = () => box.replaceChildren(profile(s, id, draw));
  draw();
  modal(prodName(s, p), box, { wide: true });
}

function area(s: GameState): HTMLElement {
  const list = REAL_PRODS.filter((p) => (F.past ? prodKnown(s, p) : prodActive(s, p)) && (!F.fam || p.fam.includes(F.fam as never)));
  list.sort((a, b) => b.tier - a.tier || a.from - b.from);
  return h('div', { class: 'stack' },
    h('h2', null, t(l('Produtores', 'Producers'))),
    h('p', { class: 'small muted' }, t(l('Os grandes nomes por trás dos discos. Cada um tem um som de assinatura que mexe na produção, na performance e na originalidade das faixas — melhor dentro do seu gênero. Selos rivais também os contratam: agenda tomada e cachê mais alto. Quem você trata bem cobra menos; quem você decepciona cobra mais ou recusa.', 'The big names behind the records. Each has a signature sound that moves production, performance and originality — best inside their genre. Rival labels hire them too: taken diaries and higher fees. Treat them well and they charge less; let them down and they charge more or refuse.'))),
    h('div', { class: 'row wrap' },
      h('select', { onchange: (e: Event) => { F.fam = (e.target as HTMLSelectElement).value; rerender(); } }, h('option', { value: '' }, t(l('Todos os gêneros', 'All genres'))), ...FAMILIES.filter((f) => REAL_PRODS.some((p) => p.fam.includes(f.id))).map((f) => h('option', { value: f.id, selected: F.fam === f.id }, t(f.name)))),
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: F.past, onchange: (e: Event) => { F.past = (e.target as HTMLInputElement).checked; rerender(); } }), ' ', t(l('Incluir quem já saiu de cena', 'Include those who left the scene')))),
    list.length ? h('table', { class: 'table' },
      h('tr', null, ...[l('Nome', 'Name'), l('Som', 'Sound'), l('Praça', 'Base'), l('Anos', 'Years'), l('Cachê', 'Fee'), l('Opinião', 'Opinion'), l('Agenda', 'Diary')].map((x) => h('th', null, t(x)))),
      list.map((p) => h('tr', null, h('td', null, link(s, p)), h('td', { class: 'small' }, t(p.snd)), h('td', null, cityName(p.city)), h('td', null, years(s, p)),
        h('td', null, prodActive(s, p) ? `${$(money(s, feeOf(s, p)))} ${stars(p)}` : '—'), h('td', null, opPill(s, p)), h('td', null, status(s, p)))))
      : h('p', { class: 'muted' }, t(l('Nenhum produtor de destaque em atividade neste ano.', 'No prominent producers active this year.'))),
  );
}

registerArea({ id: 'producers15', label: l('Produtores', 'Producers'), icon: 'cd', key: '', render: area, visible: (s) => s.year >= 1950 });
