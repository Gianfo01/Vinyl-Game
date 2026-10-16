// Rodada 27 (KNOWN) — página "Artistas conhecidos" (Pessoas › Descobrir, antes de "Todos os artistas").
// Lista quem a sua empresa conhece e POR QUÊ (chips): seu elenco, clientes, superestrelas e famosos no seu país,
// cena local, olheiros e sinais, contatos do seu círculo, parcerias, paradas, rivais, imprensa e boatos.
// Modelo puro em sim/sys/knownacts27.ts (knownArtists27). Filtros por motivo (abas + lista), gênero, lugar e
// situação; busca; colunas ordenáveis em TODAS as páginas (sort27) e paginação.

import { FAMILIES, familyOf, l, type L } from '../../data/world';
import { countryName } from '../../data/geo';
import { t } from '../../i18n/strings';
import { FTIERS, fameTier } from '../../sim/sys/fame15';
import { GROUPS27, KNOW27, WHY27, countWhy27, knownArtists27, type Group27, type KnownAct27, type Why27 } from '../../sim/sys/knownacts27';
import type { Act, GameState } from '../../sim/types';
import { actGenre23, actLink, cityLink, cityName, genreName, labelLink, logo, rerender } from '../common';
import { h, select } from '../dom';
import { openAct } from '../ficha';
import { emptyState27, kpiRow27, statusChip27, toolbar27 } from '../ps/ui27';
import { registerArea } from '../registry';
import { store } from '../store';
import { getSort27, page27, setSort27, sortHead27, sortSpec27, sortTable27 } from '../sort27';
import { ic, tabs } from '../vis';
import './knownacts27.css';
import { seen } from '../../sim/know';

export const KNOWNACTS27 = 'knownacts27';
const PAGE = 30;
const F = { q: '', why: 'any' as 'any' | Why27, fam: 'any', place: 'any', status: 'any' as 'any' | 'live' | 'free' | 'rival' | 'mine' | 'off', page: 0 };
let timer = 0;
const goArea = (area: string): void => { store.area = area; rerender(); };

const tx = (x: string | L): string => (typeof x === 'string' ? x : t(x));
const live = (a: Act): boolean => a.status !== 'retired' && a.status !== 'split';

/** Texto do chip: motivo + detalhe curto (quem, onde, posição). */
function chipText(w: Why27, d: string | L | undefined): string {
  const n = t(WHY27[w].name);
  if (d === undefined) return n;
  const v = tx(d);
  if (w === 'contact') return t(l('Contato de {x}', 'Contact of {x}'), { x: v });
  if (w === 'scout') return t(l('Olheiro: {x}', 'Scout: {x}'), { x: v });
  if (w === 'signal') return t(l('Sinal: {x}', 'Signal: {x}'), { x: v });
  if (w === 'chart') return `${n} ${v}`;
  if (w === 'rival') return t(l('Rival: {x}', 'Rival: {x}'), { x: v });
  if (w === 'collab') return t(l('Parceria com {x}', 'Worked with {x}'), { x: v });
  return n; // imprensa/boato/cena: o detalhe vai na dica
}
function chips(k: KnownAct27): HTMLElement {
  const max = 3;
  const out = k.why.slice(0, max).map((w) => statusChip27(chipText(w, k.det[w]), WHY27[w].tone, k.det[w] !== undefined ? tx(k.det[w]!) : undefined));
  if (k.why.length > max) out.push(statusChip27(`+${k.why.length - max}`, 'neutral', k.why.slice(max).map((w) => chipText(w, k.det[w])).join(' · ')));
  return h('span', { class: 'ka27-chips' }, out);
}
function knowDots(n: number): HTMLElement {
  return h('span', { class: 'ka27-know', title: t(KNOW27[n]) }, h('span', { 'aria-hidden': 'true' }, '●'.repeat(n) + '○'.repeat(3 - n)), h('span', { class: 'sr-only' }, t(KNOW27[n])));
}
/** Fama vista daqui: número quando se conhece bem, só o degrau quando é de ouvir falar. */
const fameShown = (k: KnownAct27): number => (k.know >= 2 ? Math.round(k.here) : FTIERS[fameTier(k.here)].min);
const fameCell = (k: KnownAct27): string => (k.know >= 2 ? String(Math.round(k.here)) : t(FTIERS[fameTier(k.here)].name));

function statusOf(s: GameState, a: Act): HTMLElement {
  if (a.owner === 'player' || a.playerBand) return statusChip27(l('Seu', 'Yours'), 'good');
  if (!live(a)) return statusChip27(a.status === 'split' ? l('Separada', 'Split') : l('Encerrado', 'Ended'), 'bad');
  if (a.status === 'hiatus') return statusChip27(l('Em pausa', 'On hiatus'), 'warn');
  return a.owner ? labelLink(s, a.owner) : h('span', { class: 'muted' }, t(l('Sem contrato', 'Unsigned')));
}

function matches(s: GameState, k: KnownAct27, q: string, group: 'all' | Group27): boolean {
  const a = s.acts[k.id];
  if (!a) return false;
  if (group !== 'all' && !k.why.some((w) => WHY27[w].group === group)) return false;
  if (F.why !== 'any' && !k.why.includes(F.why)) return false;
  if (F.fam !== 'any' && familyOf(a.genre) !== F.fam) return false;
  if (F.place === 'home' && a.city !== s.config.homeCity) return false;
  if (F.place !== 'any' && F.place !== 'home' && k.a3 !== F.place) return false;
  const mine = a.owner === 'player' || !!a.playerBand;
  if (F.status === 'live' && (!live(a) || a.status === 'hiatus')) return false;
  if (F.status === 'free' && (a.owner || !live(a))) return false;
  if (F.status === 'rival' && (!a.owner || mine)) return false;
  if (F.status === 'mine' && !mine && !k.why.includes('client')) return false;
  if (F.status === 'off' && live(a) && a.status !== 'hiatus') return false;
  if (!q) return true;
  return a.name.toLowerCase().includes(q) || genreName(a.genre).toLowerCase().includes(q) || cityName(a.city).toLowerCase().includes(q)
    || (seen(s, a.id, 'members') && a.members.some((m) => s.persons[m]?.name.toLowerCase().includes(q))); // r31 F #2: nomes só de quem você sabe quem é
}

function table(s: GameState, all: KnownAct27[], group: 'all' | Group27): HTMLElement {
  const q = F.q.trim().toLowerCase();
  const list = all.filter((k) => matches(s, k, q, group));
  const SK = sortSpec27<KnownAct27>('knownacts27', {
    name: (k) => s.acts[k.id]?.name ?? null, why: (k) => k.score, genre: (k) => genreName(s.acts[k.id]?.genre ?? ''),
    place: (k) => cityName(s.acts[k.id]?.city ?? ''), fame: fameShown, know: (k) => k.know,
  }, { why: -1 });
  const sorted = SK.apply(list);
  const pg = page27(sorted, F.page, PAGE);
  F.page = pg.page;
  const toolbar = toolbar27([
    h('input', { type: 'search', class: 'ka27-search', placeholder: t(l('Buscar artista, integrante, gênero ou cidade…', 'Search act, member, genre or city…')), value: F.q, 'aria-label': t(l('Buscar', 'Search')),
      oninput: (e: Event) => { F.q = (e.target as HTMLInputElement).value; F.page = 0; clearTimeout(timer); timer = window.setTimeout(() => { rerender(); const el = document.querySelector<HTMLInputElement>('.ka27-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250); } }),
    select<string>(F.why, [{ value: 'any', label: t(l('Qualquer motivo', 'Any reason')) }, ...(Object.keys(WHY27) as Why27[]).filter((w) => group === 'all' || WHY27[w].group === group).map((w) => ({ value: w, label: t(WHY27[w].name) }))], (v) => { F.why = v as typeof F.why; F.page = 0; rerender(); }, { 'aria-label': t(l('Motivo', 'Reason')) }),
    select<string>(F.fam, [{ value: 'any', label: t(l('Todos os gêneros', 'All genres')) }, ...FAMILIES.map((f) => ({ value: f.id, label: t(f.name) })).sort((a, b) => a.label.localeCompare(b.label))], (v) => { F.fam = v; F.page = 0; rerender(); }, { 'aria-label': t(l('Gênero', 'Genre')) }),
    select<string>(F.place, [{ value: 'any', label: t(l('Qualquer lugar', 'Anywhere')) }, { value: 'home', label: t(l('Sua cidade ({c})', 'Your city ({c})'), { c: cityName(s.config.homeCity) }) },
      ...[...new Set(all.map((k) => k.a3).filter((x): x is string => !!x))].map((a3) => ({ value: a3, label: t(countryName(a3)) })).sort((a, b) => a.label.localeCompare(b.label))], (v) => { F.place = v; F.page = 0; rerender(); }, { 'aria-label': t(l('Lugar', 'Place')) }),
    select<string>(F.status, [{ value: 'any', label: t(l('Qualquer situação', 'Any status')) }, { value: 'live', label: t(l('Em atividade', 'Active')) }, { value: 'free', label: t(l('Sem contrato', 'Unsigned')) },
      { value: 'rival', label: t(l('Em outro selo', 'With another label')) }, { value: 'mine', label: t(l('Seus e clientes', 'Yours and clients')) }, { value: 'off', label: t(l('Em pausa ou encerrados', 'On hiatus or ended')) }], (v) => { F.status = v as typeof F.status; F.page = 0; rerender(); }, { 'aria-label': t(l('Situação', 'Status')) }),
    // a mesma ordenação do cabeçalho, para o celular (lá a tabela vira cartões e o cabeçalho some)
    select<string>(getSort27('knownacts27')?.col ?? 'why', [{ value: 'why', label: t(l('Ordenar: relevância', 'Sort: relevance')) }, { value: 'fame', label: t(l('Ordenar: fama aqui', 'Sort: fame here')) },
      { value: 'name', label: t(l('Ordenar: nome', 'Sort: name')) }, { value: 'know', label: t(l('Ordenar: conhecimento', 'Sort: knowledge')) }],
    (v) => { setSort27('knownacts27', { col: v, dir: v === 'name' ? 1 : -1 }); F.page = 0; rerender(); }, { 'aria-label': t(l('Ordenar', 'Sort')), class: 'ka27-sort' }),
  ], [h('span', { class: 'muted small' }, t(l('{n} artistas', '{n} acts'), { n: list.length }))]);
  if (!list.length) {
    return h('div', null, toolbar, emptyState27({ icon: 'eye', title: l('Ninguém com esses filtros', 'Nobody matches these filters'),
      why: l('Você só conhece quem tem algum laço com a sua empresa: fama no seu país, a cena da sua cidade, olheiros, contatos, paradas, rivais ou imprensa.', 'You only know acts with some link to your company: fame in your country, your city\'s scene, scouts, contacts, charts, rivals or the press.'),
      action: { label: l('Limpar filtros', 'Clear filters'), run: () => { Object.assign(F, { q: '', why: 'any', fam: 'any', place: 'any', status: 'any', page: 0 }); rerender(); } },
      secondary: { label: l('Ver todos os artistas', 'See all artists'), run: () => goArea('directory') } }));
  }
  const toPage0 = () => { F.page = 0; rerender(); };
  return h('div', null, toolbar,
    h('div', { class: 'tbl-wrap' }, h('table', sortTable27('knownacts27', 'tbl ka27-tbl'),
      sortHead27(SK, [['', null], [l('Artista', 'Act'), 'name'], [l('Por que você conhece', 'Why you know them'), 'why'], [l('Gênero', 'Genre'), 'genre'], [l('Cidade', 'City'), 'place'], [l('Situação', 'Status'), null], [l('Fama aqui', 'Fame here'), 'fame'], [l('Conhecimento', 'Knowledge'), 'know'], ['', null]], toPage0, list),
      h('tbody', null, pg.items.map((k) => {
        const a = s.acts[k.id];
        return h('tr', null,
          h('td', null, logo(a, 28)),
          h('td', null, actLink(s, a.id), h('div', { class: 'muted small' }, a.members.length > 1 ? `${t(l('Banda', 'Band'))} (${a.members.length})` : t(l('Solo', 'Solo')))),
          h('td', null, chips(k)),
          h('td', null, actGenre23(s, a)),
          h('td', null, cityLink(a.city), k.a3 ? h('div', { class: 'muted small' }, t(countryName(k.a3))) : null),
          h('td', null, statusOf(s, a)),
          h('td', { class: 'num' }, fameCell(k)),
          h('td', null, knowDots(k.know)),
          h('td', null, h('button', { ...ent27('act', a.id), class: 'btn small ghost', onclick: () => openAct(a.id) }, ic('newspaper'), ' ', t(l('Página', 'Page')))));
      })))),
    pg.pages > 1 ? h('div', { class: 'row center ka27-pager' },
      h('button', { class: 'btn small ghost', disabled: pg.page === 0, 'aria-label': t(l('Página anterior', 'Previous page')), onclick: () => { F.page -= 1; rerender(); } }, '←'),
      h('span', { class: 'small' }, ` ${pg.page + 1} / ${pg.pages} `),
      h('button', { class: 'btn small ghost', disabled: pg.page >= pg.pages - 1, 'aria-label': t(l('Próxima página', 'Next page')), onclick: () => { F.page += 1; rerender(); } }, '→')) : null);
}

function knownActsPage(s: GameState): HTMLElement {
  const all = knownArtists27(s);
  const c = countWhy27(all);
  const byGroup = (g: Group27) => all.filter((k) => k.why.some((w) => WHY27[w].group === g)).length;
  const kp = kpiRow27([
    { label: l('Artistas que você conhece', 'Acts you know'), value: String(all.length) },
    { label: l('Seu elenco e clientes', 'Roster and clients'), value: String(c.own + c.client), tone: 'good', go: 'artists' },
    { label: l('No radar', 'On the radar'), value: String(byGroup('radar')), tone: byGroup('radar') ? 'accent' : 'neutral', go: 'market' },
    { label: l('Superestrelas', 'Superstars'), value: String(c.star) },
  ], goArea);
  const groups: ('all' | Group27)[] = ['all', ...GROUPS27.map((g) => g.id)];
  return h('div', { class: 'stack27 ka27' },
    h('h2', { class: 'sr-only' }, t(l('Artistas conhecidos', 'Known artists'))),
    kp,
    tabs('knownacts27', groups.map((g) => ({
      id: g, label: g === 'all' ? t(l('Todos', 'All')) : t(GROUPS27.find((x) => x.id === g)!.name), badge: g === 'all' ? undefined : byGroup(g) || undefined,
      render: () => { if (F.why !== 'any' && g !== 'all' && WHY27[F.why].group !== g) F.why = 'any'; return table(s, all, g); },
    })), () => { F.page = 0; rerender(); }));
}

registerArea({ id: KNOWNACTS27, label: l('Artistas conhecidos', 'Known artists'), icon: 'rolodex', key: '', render: knownActsPage });

import { ent27 } from '../ps/ent27';