// Rodada 17 — "Panorama 360°" no popup de pessoa e de artista: um quadro limpo que liga a ficha às mecânicas
// (estresse, obrigações, fatos recentes, imprensa, fama em casa x no mundo, ficha criminal, direitos de
// imagem/voz, casas de show e empresário) — cada cartão diz onde aprofundar (a aba certa do popup).

import { countryName } from '../../data/geo';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { factsAbout, type Fact } from '../../sim/facts17';
import { holdsOf } from '../../sim/holds17';
import { STRESS_LEVEL, stressOf } from '../../sim/stress17';
import { crime17 } from '../../sim/sys/crime17';
import { fameIn, homeA3 } from '../../sim/sys/fame16';
import { img17 } from '../../sim/sys/image17';
import { actOfPerson } from '../../sim/sys/social8';
import { v17, vdef } from '../../sim/sys/venues17';
import type { Act, GameState, Person } from '../../sim/types';
import { h } from '../dom';
import { ACT_TABS, PERSON_TABS } from '../pages';

type Card = [L, string, string?, L?];
const card = ([k, v, cls, where]: Card) => h('div', null, h('b', null, t(k)), h('span', { class: cls ?? '' }, v), where ? h('small', { class: 'muted' }, ` · ${t(where)}`) : null);
const YEAR = 52;

function factCards(s: GameState, key: string): Card[] {
  const fs = factsAbout(s, key, { limit: 60, withAct: true, notSecret: true }).filter((f) => f.w >= s.week - YEAR);
  const bad = fs.filter((f) => f.tags.includes('bad')).sort((a, b) => b.severity - a.severity)[0];
  const pub = fs.filter((f: Fact) => f.visibility === 'public').sort((a, b) => b.w - a.w)[0];
  return [
    [l('Fatos (12 meses)', 'Facts (12 months)'), fs.length ? `${fs.length}${bad ? ` · ${t(l('pior', 'worst'))}: ${t(bad.text).slice(0, 70)}` : ''}` : '—', bad && bad.severity >= 50 ? 'bad' : '', l('aba Fatos & Obrigações', 'Facts & Holds tab')],
    [l('Na imprensa', 'In the press'), pub ? t(pub.text).slice(0, 90) : t(l('nada público recente', 'nothing public lately')), '', l('Mundo e imprensa', 'World and press')],
  ];
}

function holdCard(s: GameState, key: string): Card {
  const x = holdsOf(s, key);
  return [l('Obrigações', 'Holds'), x.has.length || x.owes.length ? t(l('tem {a} sobre outros · deve {b}', 'holds {a} over others · owes {b}'), { a: x.has.length, b: x.owes.length }) : '—', x.owes.length > x.has.length ? 'bad' : '', l('segredos, favores, dívidas, mágoas', 'secrets, favors, debts, grudges')];
}

function crimeCard(s: GameState, ids: string[]): Card | null {
  const c = crime17(s);
  const cs = c.cases.filter((x) => ids.includes(x.who));
  const jail = ids.map((i) => c.jail[i]).find(Boolean);
  if (!cs.length && !jail) return null;
  const open = cs.filter((x) => x.stage !== 'closed').length;
  return [l('Ficha criminal', 'Criminal record'), `${jail ? t(l('preso(a) · ', 'in prison · ')) : ''}${t(l('{n} caso(s), {o} em aberto', '{n} case(s), {o} open'), { n: cs.length, o: open })}`, jail || open ? 'bad' : '', l('Submundo › Polícia', 'Underworld › Police')];
}

function actCards(s: GameState, a: Act): Card[] {
  const out: (Card | null)[] = [];
  const h3 = homeA3(a);
  out.push([l('Fama', 'Fame'), h3 ? `${Math.round(a.fame)} ${t(l('no mundo', 'worldwide'))} · ${Math.round(fameIn(s, a, h3))} ${t(l('em', 'in'))} ${t(countryName(h3))}` : String(Math.round(a.fame)), '', l('aba Fama', 'Fame tab')]);
  const st = a.members.map((m) => s.persons[m]).filter((p): p is Person => !!p && p.alive).map((p) => ({ p, r: stressOf(s, p.id) })).sort((x, y) => y.r.short - x.r.short)[0];
  if (st) out.push([l('Estresse no grupo', 'Stress in the band'), `${st.p.name}: ${t(STRESS_LEVEL[st.r.level])} (${Math.round(st.r.short)}/${Math.round(st.r.long)})`, st.r.level === 'breaking' || st.r.level === 'strained' ? 'bad' : '']);
  out.push(holdCard(s, a.id), ...factCards(s, a.id), crimeCard(s, [a.id, ...a.members]));
  const img = img17(s).deals.filter((d) => d.act === a.id && d.status !== 'ended');
  if (img.length) out.push([l('Imagem e voz', 'Image and voice'), img.map((d) => `${d.scopes.join('/')} ${Math.round(d.share * 100)}%${d.status === 'demand' ? ` (${t(l('cobrando', 'demanding'))})` : ''}`).join(' · '), img.some((d) => d.status === 'demand') ? 'bad' : '', l('Gravadora › Imagem & voz', 'Label › Image & voice')]);
  const vs = v17(s).own.filter((o) => o.booked.includes(a.id) || o.actId === a.id);
  if (vs.length) out.push([l('Casas de show', 'Venues'), vs.map((o) => { const n = vdef(o.id)?.name; return n ? (typeof n === 'string' ? n : t(n)) : o.id; }).join(', '), '', l('agendado nas suas casas', 'booked at your venues')]);
  return out.filter((x): x is Card => !!x);
}

function personCards(s: GameState, p: Person): Card[] {
  const key = p.isPlayer ? 'player' : `p:${p.id}`;
  const r = stressOf(s, p.id);
  const act = actOfPerson(s, p.id);
  const out: (Card | null)[] = [
    [l('Estresse', 'Stress'), `${t(STRESS_LEVEL[r.level])} · ${t(l('curto', 'short'))} ${Math.round(r.short)} · ${t(l('longo', 'long'))} ${Math.round(r.long)}${r.why[0] ? ` — ${t(r.why[0])}` : ''}`, r.level === 'breaking' || r.level === 'strained' ? 'bad' : r.level === 'ok' ? 'good' : '', l('quebra só com curto > 65 e longo > 45', 'breaks only with short > 65 and long > 45')],
    act ? [l('Artista', 'Act'), `${act.name} · ${t(l('fama', 'fame'))} ${Math.round(act.fame)}`] : null,
    holdCard(s, key), ...factCards(s, key), crimeCard(s, [p.id, ...(p.isPlayer ? ['player'] : [])]),
  ];
  return out.filter((x): x is Card => !!x);
}

const TAB = l('Panorama 360°', '360° overview');
ACT_TABS.push((s, a) => ({ id: 'pan17', label: TAB, icon: 'compass', render: () => h('div', { class: 'sum17' }, actCards(s, a).map(card)) }));
PERSON_TABS.push((s, p) => ({ id: 'pan17', label: TAB, icon: 'compass', render: () => h('div', { class: 'sum17' }, personCards(s, p).map(card)) }));
