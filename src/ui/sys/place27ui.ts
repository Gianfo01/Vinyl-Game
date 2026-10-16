// Rodada 27 (CITY2) — painel e INTERIOR dos lugares do bairro ("Nosso mundo"). O mapa (campus18.ts) chama:
//   placePanel27  — o que é, de quem é, quem está lá agora e as ações (com custo e motivo de bloqueio);
//   ownPlace27    — o interior de um prédio SEU (estúdio, casa de shows, loja, redação…);
//   insideView27  — o corte em pixel art (interior27) sobre o mapa, com as pessoas reais; voltar = afastar.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Bld18 } from '../../sim/sys/campus18';
import { doPlace27, placeActs27, type PAct27, type Person27, type Place27, type PlaceK27 } from '../../sim/sys/place27';
import { panel27 } from '../pixel/city27';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { ventures } from '../../sim/sys/ventures9';
import { $, inspect, rerender, toast } from '../common';
import { h } from '../dom';
import { drawInterior27, interior27 } from '../pixel/interior27';
import { lookOf } from '../pixel/avatar';
import { bindZoomOut27 } from '../ps/zoom27';
import { ic } from '../vis';
import { go18 } from './inbox18';
import './place27ui.css';
import { insideView31 } from '../r31/inside31';

/** Ícone e cor por tipo de lugar. */
export const PLACE_IC27: Record<PlaceK27, { ic: string; col: string }> = {
  venue: { ic: 'stage', col: '#b02868' }, records: { ic: 'cd', col: '#d84848' }, radio: { ic: 'radio', col: '#c89a18' }, studio: { ic: 'mic', col: '#d04040' },
  bar: { ic: 'ticket', col: '#c06028' }, press: { ic: 'typewriter', col: '#6a48b8' }, rehearsal: { ic: 'drums', col: '#a05828' }, label: { ic: 'contract', col: '#8a3a3a' },
  office: { ic: 'briefcase', col: '#3a7a9a' }, apartments: { ic: 'house', col: '#4a8a3a' }, hotel: { ic: 'door', col: '#7a5ab0' }, instruments: { ic: 'headphones', col: '#2a80c8' },
  facade: { ic: 'mask', col: '#5a2a3a' }, police: { ic: 'gavel', col: '#2a4a8a' }, market: { ic: 'vault', col: '#3a3a30' },
};
/** Lugares básicos da música ganham ícone no mapa; cidade comum (prédios, escritórios) só o ponto clicável. */
export const PINNED27 = new Set<PlaceK27>(['venue', 'records', 'radio', 'studio', 'bar', 'press']);
const KNAME27: Record<PlaceK27, L> = {
  venue: l('Casa de shows', 'Venue'), records: l('Loja de música', 'Music shop'), radio: l('Rádio', 'Radio'), studio: l('Estúdio', 'Studio'), bar: l('Bar', 'Bar'), press: l('Imprensa', 'Press'),
  rehearsal: l('Sala de ensaio', 'Rehearsal space'), label: l('Gravadora rival', 'Rival label'), office: l('Escritórios', 'Offices'), apartments: l('Moradia', 'Housing'), hotel: l('Hotel', 'Hotel'), instruments: l('Instrumentos', 'Instruments'),
  facade: l('Fachada', 'Front business'), police: l('Delegacia', 'Police station'), market: l('Mercado negro', 'Black market'),
};

/** Artista escolhido para as ações (por sessão, não vai para o save). */
export const sel27: { act?: string } = {};
const chip = (k: PlaceK27, cls = '') => h('span', { class: `c27-chip ${cls}`, style: `--k:${PLACE_IC27[k].col}`, 'aria-hidden': 'true' }, ic(PLACE_IC27[k].ic));
const kv = (k: L, v: string | HTMLElement | (HTMLElement | string)[]) => [h('dt', null, t(k)), h('dd', null, v)];

function whoList(s: GameState, ps: Person27[]): HTMLElement {
  return h('ul', { class: 'c2-who' }, ps.slice(0, 8).map((p) => h('li', null,
    p.actId ? h('button', { ...ent27('act', p.actId!), type: 'button', class: 'linklike', onclick: () => inspect.act(p.actId!) }, p.name) : h('span', null, p.name),
    h('small', { class: p.mine ? 'good' : 'muted' }, ` · ${t(p.role)}`))));
}

export interface PlaceCtx27 { close: () => void; openLot: (lot: number) => void; inside: () => void; more?: HTMLElement | null; now?: L }

function runP27(s: GameState, p: Place27, a: PAct27, o: PlaceCtx27): void {
  if (a.dis) { toast(t(a.dis), 'bad'); return; }
  if (a.go) { o.close(); go18(a.go); return; }
  if (a.lot) { o.openLot(p.lot); return; }
  const r = doPlace27(s, p, a.id, sel27.act);
  toast(t(r.text), r.ok ? 'good' : 'bad');
  rerender();
}

/** Painel de um lugar de terceiros: o que é, dono, agora, quem está lá, ações. */
export function placePanel27(s: GameState, p: Place27, o: PlaceCtx27): HTMLElement {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && !a.deceased);
  if (sel27.act && !mine.some((a) => a.id === sel27.act)) sel27.act = undefined;
  const acts = placeActs27(s, p, sel27.act);
  const needAct = acts.some((a) => a.act) && mine.length > 1;
  const btn = (a: PAct27) => h('button', { type: 'button', class: `btn small c27-act ${a.dis ? 'ghost c27-dis' : a.go || a.lot ? 'ghost' : 'primary'}`, disabled: !!a.dis, 'aria-disabled': a.dis ? 'true' : undefined, title: t(a.dis ?? a.desc),
    onclick: () => runP27(s, p, a, o) },
    h('span', { class: 'c27-al' }, t(a.label), a.go ? ' ↗' : null), a.cost !== undefined ? h('span', { class: 'c27-ac' }, $(a.cost)) : null);
  return h('div', { class: 'c27-pn c2-pn' },
    h('header', { class: 'c27-ph' }, chip(p.k, p.ownerK === 'rival' ? 'nb' : ''), h('div', null, h('b', null, t(p.name)), h('small', { class: 'muted' }, `${t(p.what)}${p.sale !== undefined ? ` · ${t(l('à venda', 'for sale'))}` : ''}`)),
      h('button', { type: 'button', class: 'icon w19-x', 'aria-label': t(l('Fechar', 'Close')), onclick: o.close }, '✕')),
    h('dl', { class: 'c27-kv' },
      ...kv(p.ownerK === 'rival' ? l('Gravadora', 'Label') : l('Dono', 'Owner'), p.owner),
      ...kv(l('Agora', 'Now'), t(o.now ?? p.now)),
      ...(p.sale !== undefined ? kv(l('Preço', 'Price'), $(p.sale)) : [])),
    p.also.length ? h('p', { class: 'small c2-also' }, ic('building'), ' ', t(l('Também neste prédio: ', 'Also in this building: ')), p.also.map((k) => t(KNAME27[k])).join(', ')) : null,
    h('div', null, h('b', { class: 'small' }, t(l('Quem está lá', 'Who\'s there'))), whoList(s, p.people)),
    h('div', { class: 'c27-main-acts' }, h('button', { type: 'button', class: 'btn small primary c2-enter', onclick: o.inside }, ic('door'), ' ', t(l('Entrar (ver por dentro)', 'Step inside')))),
    needAct ? h('label', { class: 'small c2-actsel' }, t(l('Artista: ', 'Act: ')), h('select', { onchange: (e: Event) => { sel27.act = (e.target as HTMLSelectElement).value; rerender(); } },
      mine.map((a) => h('option', { value: a.id, selected: (sel27.act ?? mine[0].id) === a.id ? true : undefined }, a.name)))) : null,
    acts.length ? h('div', { class: 'w19-acts c2-acts' }, acts.map(btn)) : null,
    acts.some((a) => a.dis) ? h('ul', { class: 'w19-notes small muted' }, acts.filter((a) => a.dis).map((a) => h('li', null, `${t(a.label)}: ${t(a.dis!)}`))) : null,
    o.more ? h('details', { class: 'c27-more' }, h('summary', null, t(l('Mais opções (comprar o imóvel…)', 'More options (buy the property…)'))), o.more) : null);
}

// ---------------------------------------------------------------- prédios seus por dentro

const OWNK27: Partial<Record<Bld18['kind'], PlaceK27>> = {
  studio: 'studio', venue: 'venue', fest: 'venue', store: 'records', rehearsal: 'rehearsal', publisher: 'label', imprint: 'label', sublabel: 'label', booking: 'office',
  branch: 'office', office: 'office', school: 'office', platform: 'office', plant: 'office', museum: 'hotel', home: 'apartments', dorm: 'apartments',
};
/** Interior de um prédio seu (a sede tem a tela própria). */
export function ownPlace27(s: GameState, b: Bld18): { k: PlaceK27; name: string; people: Person27[] } | null {
  if (b.kind === 'hq' || b.kind === 'sign' || b.kind === 'park') return null;
  let k = OWNK27[b.kind];
  if (b.kind === 'media') k = ventures(s).list.find((v) => `v:${v.id}` === b.id)?.media === 'radio' ? 'radio' : 'press';
  if (!k) return null;
  const people: Person27[] = [];
  const mine = new Set(playerActs(s));
  if (k === 'studio' || k === 'rehearsal') for (const x of s.sessions.filter((y) => !y.done && mine.has(y.actId)).slice(0, 2)) { const a = s.acts[x.actId]; if (a) for (const pid of a.members.slice(0, 3)) people.push({ name: s.persons[pid]?.name ?? a.name, role: l('Gravando', 'Recording'), pid, actId: a.id, mine: true }); }
  const pn = panel27(s, b.id);
  for (const w of pn?.who ?? []) if (!people.some((x) => x.name === w) && !/\d/.test(w)) people.push({ name: w, role: l('Equipe', 'Staff') });
  if (!people.length) people.push({ name: s.player.staff[0]?.name ?? t(l('Gerente', 'Manager')), role: l('Gerente', 'Manager') });
  return { k, name: b.name, people };
}

// ---------------------------------------------------------------- interior (sobreposto ao mapa)

export interface InsideT27 { id: string; k: PlaceK27; name: string; what?: string; people: Person27[]; year: number; city: string; seed: string; /** r31: lugar de terceiros (ações) */ place?: Place27; /** r31: prédio seu */ own?: boolean; /** r31 (S): facção da fachada */ org?: string }
/** O corte do lugar por dentro, cobrindo o mapa; "Voltar à cidade" (ou Esc, Ctrl + roda, pinça) afasta.
 *  R31 (onda 4 · I): vira cena interativa (inside31) — pessoas e objetos clicáveis, você lá dentro. */
export function insideView27(s: GameState, x: InsideT27, back: () => void, actions?: () => void): HTMLElement {
  return insideView31(s, x, back, actions);
}
/** O corte antigo (só pessoas clicáveis), mantido para comparação nas capturas. */
export function insideView27old(s: GameState, x: InsideT27, back: () => void, actions?: () => void): HTMLElement {
  const m = interior27(x.k, x.year, x.people.length);
  const cv = h('canvas', { class: 'c2-in-cv px', role: 'img', 'aria-label': t(l('{n} por dentro', '{n}, inside'), { n: x.name }) }) as HTMLCanvasElement;
  const d = drawInterior27(cv, m, x.people, { minW: 300, city: x.city, name: x.name, seed: x.seed, look: (p) => lookOf((p.pid ? s.persons[p.pid] : undefined) ?? { id: p.pid ?? `npc:${x.id}:${p.name}` }), role: (p) => (p.pid ? s.persons[p.pid]?.role : null) ?? null });
  const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(2)}%`;
  const hits = d.hits.map((hh) => {
    const label = `${hh.who.name} — ${t(hh.who.role)}`;
    const on = hh.who.actId ? () => inspect.act(hh.who.actId!) : undefined;
    return h(on ? 'button' : 'span', { class: `c2-hit ${hh.who.mine ? 'mine' : ''}`, type: on ? 'button' : undefined, title: label, 'aria-label': label, onclick: on,
      style: `left:${pct(hh.x, d.W)};top:${pct(hh.y, d.H)};width:${pct(hh.w, d.W)};height:${pct(hh.h, d.H)}` }, h('span', { class: 'c2-tag', 'aria-hidden': 'true' }, hh.who.name.split(' ')[0]));
  });
  const box = h('div', { class: 'c2-in', role: 'dialog', 'aria-label': t(l('{n} por dentro', '{n}, inside'), { n: x.name }) },
    h('div', { class: 'c2-in-bar' },
      h('button', { type: 'button', class: 'btn small c2-back', onclick: back }, '← ', t(l('Voltar à cidade', 'Back to the city'))),
      h('b', null, x.name), x.what ? h('small', { class: 'muted' }, ` · ${x.what}`) : null,
      actions ? h('button', { type: 'button', class: 'btn small primary c2-acts-btn', onclick: actions }, t(l('Ações', 'Actions'))) : null),
    h('div', { class: 'c2-in-st' }, cv, h('div', { class: 'c2-in-hot' }, hits)),
    h('div', { class: 'c2-in-foot' }, h('b', { class: 'small' }, t(l('Quem está aqui', 'Who\'s here'))), whoList(s, x.people),
      h('p', { class: 'small muted' }, t(l('Clique num artista para ver a ficha. Ctrl + roda ou pinça para afastar.', 'Click an act to see their card. Ctrl + wheel or pinch to zoom out.')))));
  bindZoomOut27(box, back);
  return box;
}

import { ent27 } from '../ps/ent27';