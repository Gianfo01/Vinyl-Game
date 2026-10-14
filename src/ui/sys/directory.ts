// Diretório (rodada 6): todos os artistas e pessoas do mundo, com busca, filtros, ordenação e ações rápidas
// (ver página, seguir no radar, fazer oferta). Área própria, tecla A.

import { FAMILIES, MARKETS, cityById, familyOf, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { estimate, watchAct } from '../../sim/scouting';
import { fameText, knownLevel } from '../../sim/sys/fame15';
import type { Act, GameState, Person } from '../../sim/types';
import { ROLE_NAMES, overall, type Role } from '../../sim/sys/talent/attrs';
import { rw } from '../../sim/sys/realworld';
import { roleLine27 } from '../../sim/sys/roles27';
import { TAG29, kinTags29, type Tag29 } from '../../sim/sys/family29';
import { preDebut, visibleAct } from '../../sim/future';
import { actLink, cityLink, cityName, actGenre23, genreName, labelLink, logo, pill, rerender, toast } from '../common';
import { h, select } from '../dom';
import { openAct, openOffer, openPerson } from '../ficha';
import { registerArea } from '../registry';
import { setSort27, sortHead27, sortSpec27, sortTable27 } from '../sort27';
import { ic } from '../vis';
import { ent27 } from '../ps/ent27';
import { personKey27 } from '../ps/ent27';

const F = {
  mode: 'acts' as 'acts' | 'people' | 'gone',
  gone: 'all' as 'all' | 'dead' | 'split' | 'retired' | 'hiatus',
  q: '',
  family: 'any',
  market: 'any',
  owner: 'any' as 'any' | 'mine' | 'free' | 'rival',
  status: 'live' as 'live' | 'all' | 'retired',
  format: 'any' as 'any' | 'solo' | 'band',
  sort: 'fame' as 'fame' | 'name' | 'debut' | 'known' | 'momentum',
  role: 'any',
  /** R29 (família): filtro por laços (casados, casais célebres, com filhos, filhos de famosos, menores, ex-mirins…) */
  kin: 'any' as 'any' | Tag29,
  page: 0,
};
/** R29: o ato tem a etiqueta de família em algum integrante (ou é banda de família). */
const kinOk29 = (s: GameState, ids: string[]): boolean => F.kin === 'any' || ids.some((id) => kinTags29(s, id).has(F.kin as Tag29));
const PAGE = 40;

function actMatches(s: GameState, a: Act, q: string): boolean {
  if (!visibleAct(s, a)) return false;
  if (F.family !== 'any' && familyOf(a.genre) !== F.family) return false;
  if (F.market !== 'any' && cityById[a.city]?.market !== F.market) return false;
  if (F.owner === 'mine' && a.owner !== 'player') return false;
  if (F.owner === 'free' && a.owner) return false;
  if (F.owner === 'rival' && (!a.owner || a.owner === 'player')) return false;
  const live = a.status !== 'retired' && a.status !== 'split';
  if (F.status === 'live' && !live) return false;
  if (F.status === 'retired' && live) return false;
  if (F.format === 'solo' && a.members.length !== 1) return false;
  if (F.format === 'band' && a.members.length < 2) return false;
  if (!kinOk29(s, a.members)) return false;
  if (!q) return true;
  if (a.name.toLowerCase().includes(q) || genreName(a.genre).toLowerCase().includes(q) || cityName(a.city).toLowerCase().includes(q)) return true;
  return a.members.some((m) => s.persons[m]?.name.toLowerCase().includes(q));
}

function actRows(s: GameState): HTMLElement {
  const q = F.q.trim().toLowerCase();
  const list = Object.values(s.acts).filter((a) => actMatches(s, a, q));
  const known = (a: Act) => (a.owner === 'player' ? 6 : s.knowledge[a.id]?.degree ?? 0);
  list.sort((a, b) => F.sort === 'name' ? a.name.localeCompare(b.name)
    : F.sort === 'debut' ? b.debutYear - a.debutYear
    : F.sort === 'known' ? known(b) - known(a) || b.fame - a.fame
    : F.sort === 'momentum' ? (b.momentum ?? 0) - (a.momentum ?? 0)
    : b.fame - a.fame);
  // r27: o cabeçalho ordena a lista inteira (todas as páginas) antes de fatiar
  const tal0 = (a: Act) => { const e = estimate(s, a.id, 'talent'); return e ? (e.lo + e.hi) / 2 : null; };
  const SA = sortSpec27<Act>('dir-acts', { name: (a) => a.name, genre: (a) => genreName(a.genre), city: (a) => cityName(a.city), label: (a) => (a.owner === 'player' ? ' ' : a.owner ? s.labels[a.owner]?.name ?? a.owner : null),
    fame: (a) => a.fame, talent: tal0, radar: (a) => (a.owner === 'player' ? null : s.knowledge[a.id]?.degree ?? null) });
  const sorted = SA.apply(list);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  F.page = Math.min(F.page, pages - 1);
  const slice = sorted.slice(F.page * PAGE, F.page * PAGE + PAGE);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('{n} atos encontrados.', '{n} acts found.'), { n: list.length })),
    h('div', { class: 'tbl-wrap' }, h('table', sortTable27('dir-acts', 'tbl dir-tbl'),
      sortHead27(SA, [['', null], [l('Ato', 'Act'), 'name'], [l('Gênero', 'Genre'), 'genre'], [l('Cidade', 'City'), 'city'], [l('Selo', 'Label'), 'label'], [l('Alcance', 'Reach'), 'fame'], [l('Talento', 'Talent'), 'talent'], [l('Radar', 'Radar'), 'radar'], ['', null]], toPage0, list),
      h('tbody', null, slice.map((a) => {
        const k = s.knowledge[a.id];
        const tal = estimate(s, a.id, 'talent');
        return h('tr', null,
          h('td', null, logo(a, 28)),
          h('td', null, actLink(s, a.id), h('div', { class: 'muted small' }, `${a.members.length > 1 ? t(l('Banda', 'Band')) + ` (${a.members.length})` : t(l('Solo', 'Solo'))} · ${preDebut(s, a) ? t(l('promessa', 'up-and-coming')) : `${t(l('desde', 'since'))} ${a.debutYear}`}`), a.status === 'retired' || a.status === 'split' ? pill(t(l('encerrado', 'ended')), 'bad') : a.status === 'hiatus' ? pill(t(l('hiato', 'hiatus')), 'warn') : null),
          h('td', null, actGenre23(s, a)),
          h('td', null, cityLink(a.city)),
          h('td', null, a.owner === 'player' ? pill(t(l('seu', 'yours')), 'good') : a.owner ? labelLink(s, a.owner) : h('span', { class: 'muted' }, t(l('independente', 'independent')))),
          h('td', null, `★${fameText(s, a.id)}`),
          h('td', null, tal ? `${tal.lo}–${tal.hi}` : '?'),
          h('td', null, a.owner === 'player' ? '—' : k ? `${k.degree}/5` : '—'),
          h('td', { class: 'row' },
            h('button', { ...ent27('act', a.id), class: 'btn small ghost', onclick: () => openAct(a.id) }, ic('newspaper'), ' ', t(l('Página', 'Page'))),
            a.owner !== 'player' && !k && a.status !== 'retired' && a.status !== 'split' ? h('button', { class: 'btn small', onclick: () => { watchAct(s, a.id); toast(t(l('{a} entrou no seu radar (Mercado → Pipeline).', '{a} is on your radar (Market → Pipeline).'), { a: a.name }), 'good'); rerender(); } }, t(l('Seguir', 'Follow'))) : null,
            !a.owner && a.status !== 'retired' && a.status !== 'split' ? h('button', { class: 'btn small primary', onclick: () => openOffer(a.id) }, t(l('Oferta', 'Offer'))) : null,
          ),
        );
      })),
    )),
    pager(pages),
  );
}

let ocVer = '';
const OC = new Map<string, number>();
function personRows(s: GameState): HTMLElement {
  const q = F.q.trim().toLowerCase();
  const actOf: Record<string, Act> = {};
  for (const a of Object.values(s.acts)) for (const m of a.members) actOf[m] = a;
  const list = Object.values(s.persons).filter((p) => {
    if (!p.alive && F.status === 'live') return false;
    if (F.role !== 'any' && p.role !== F.role) return false;
    const a = actOf[p.id];
    if (a && !visibleAct(s, a)) return false;
    if (F.owner === 'mine' && a?.owner !== 'player') return false;
    if (F.owner === 'free' && a?.owner) return false;
    if (F.owner === 'rival' && (!a?.owner || a.owner === 'player')) return false;
    if (F.family !== 'any' && (!a || familyOf(a.genre) !== F.family)) return false;
    if (F.market !== 'any' && (!a || cityById[a.city]?.market !== F.market)) return false;
    if (!kinOk29(s, [p.id])) return false;
    return !q || p.name.toLowerCase().includes(q) || (a?.name.toLowerCase().includes(q) ?? false);
  });
  const ver = `${s.config.seed}|${s.week}`; if (ver !== ocVer) { ocVer = ver; OC.clear(); } const oc = OC; // r15: memo por semana (o sort chamava overall() em cada comparação)
  const ovr = (p: Person) => { let v = oc.get(p.id); if (v === undefined) oc.set(p.id, v = overall(s, p)); return v; };
  list.sort((a, b) => F.sort === 'name' ? a.name.localeCompare(b.name) : F.sort === 'debut' ? b.born - a.born : (actOf[b.id]?.fame ?? 0) - (actOf[a.id]?.fame ?? 0) || ovr(b) - ovr(a));
  // r27: ordenação de todas as páginas; "Geral" só ordena pelo que você consegue ver (o resto fica no fim)
  const SP = sortSpec27<Person>('dir-people', { name: (p) => p.name, role: (p) => t(ROLE_NAMES[p.role as Role] ?? l(p.role, p.role)), age: (p) => s.year - p.born, act: (p) => actOf[p.id]?.name ?? null,
    ovr: (p) => { const a = actOf[p.id]; const deg = a?.owner === 'player' || p.isPlayer ? 5 : knownLevel(s, p.id).priv; return deg >= 2 ? ovr(p) : null; } });
  const sorted = SP.apply(list);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  F.page = Math.min(F.page, pages - 1);
  const slice = sorted.slice(F.page * PAGE, F.page * PAGE + PAGE);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('{n} pessoas encontradas.', '{n} people found.'), { n: list.length })),
    h('div', { class: 'tbl-wrap' }, h('table', sortTable27('dir-people', 'tbl dir-tbl'),
      sortHead27(SP, [[l('Nome', 'Name'), 'name'], [l('Função', 'Role'), 'role'], [l('Idade', 'Age'), 'age'], [l('Ato', 'Act'), 'act'], [l('Geral', 'Overall'), 'ovr'], ['', null]], toPage0, list),
      h('tbody', null, slice.map((p) => {
        const a = actOf[p.id];
        const mine = a?.owner === 'player' || p.isPlayer;
        const deg = mine ? 5 : knownLevel(s, p.id).priv;
        const o = overall(s, p);
        return h('tr', null,
          h('td', null, h('b', null, p.name), p.isPlayer ? pill(t(l('você', 'you')), 'good') : null, !p.alive ? pill('†', 'bad') : null,
            ...(() => { const kt = kinTags29(s, p.id); return [kt.has('minor') ? pill(t(l('menor', 'minor')), 'warn') : null, kt.has('couple') ? pill('♥', 'gold') : null, kt.has('nepo') ? pill(t(l('filho(a) de famoso', 'famous parent')), '') : null]; })()),
          h('td', null, t(roleLine27(s, p))),
          h('td', null, String(s.year - p.born)),
          h('td', null, a ? actLink(s, a.id) : '—'),
          h('td', null, deg >= 4 ? String(o) : deg >= 2 ? `${Math.max(0, o - 8)}–${Math.min(99, o + 8)}` : '?'),
          h('td', null, h('button', { ...ent27('person', personKey27(p.id)), class: 'btn small ghost', onclick: () => openPerson(p.id) }, ic('newspaper'), ' ', t(l('Ficha', 'Profile')))),
        );
      })),
    )),
    pager(pages),
  );
}

const N0 = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} mi` : n >= 1e3 ? `${Math.round(n / 1e3)} mil` : String(Math.round(n)));

/** Aba de inativos (rodada 7): falecidos, bandas separadas, aposentados e em pausa. O catálogo segue vendendo. */
function goneRows(s: GameState): HTMLElement {
  const q = F.q.trim().toLowerCase();
  if (F.gone === 'dead') {
    const actsOf: Record<string, Act[]> = {};
    for (const a of Object.values(s.acts)) for (const m of a.members) (actsOf[m] ??= []).push(a);
    for (const [actId, list] of Object.entries(rw(s).former)) for (const f of list) if (s.acts[actId] && !(actsOf[f.personId] ?? []).includes(s.acts[actId])) (actsOf[f.personId] ??= []).push(s.acts[actId]);
    const list = Object.values(s.persons).filter((p) => !p.alive && (!q || p.name.toLowerCase().includes(q) || (actsOf[p.id] ?? []).some((a) => a.name.toLowerCase().includes(q))))
      .sort((a, b) => (b.died ?? 0) - (a.died ?? 0) || Math.max(0, ...(actsOf[b.id] ?? []).map((x) => x.fame)) - Math.max(0, ...(actsOf[a.id] ?? []).map((x) => x.fame)));
    const SD = sortSpec27<Person>('dir-dead', { name: (p) => p.name, role: (p) => t(ROLE_NAMES[p.role as Role] ?? l(p.role, p.role)), life: (p) => p.died ?? null, acts: (p) => (actsOf[p.id] ?? [])[0]?.name ?? null });
    const sorted = SD.apply(list);
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    F.page = Math.min(F.page, pages - 1);
    return h('div', null,
      h('p', { class: 'muted small' }, t(l('{n} pessoas falecidas. Bandas podem seguir com substitutos e o catálogo continua vendendo.', '{n} people have died. Bands may carry on with replacements and the catalog keeps selling.'), { n: list.length })),
      h('div', { class: 'tbl-wrap' }, h('table', sortTable27('dir-dead', 'tbl dir-tbl'),
        sortHead27(SD, [[l('Nome', 'Name'), 'name'], [l('Função', 'Role'), 'role'], [l('Vida', 'Life'), 'life'], [l('Atos', 'Acts'), 'acts'], ['', null]], toPage0, list),
        h('tbody', null, sorted.slice(F.page * PAGE, F.page * PAGE + PAGE).map((p) => h('tr', null,
          h('td', null, h('b', null, p.name), ' ', pill('†', 'bad')),
          h('td', null, t(roleLine27(s, p))),
          h('td', null, `${p.born}–${p.died ?? '?'}${p.died ? ` (${p.died - p.born})` : ''}`),
          h('td', null, (actsOf[p.id] ?? []).map((a) => actLink(s, a.id))),
          h('td', null, h('button', { ...ent27('person', personKey27(p.id)), class: 'btn small ghost', onclick: () => openPerson(p.id) }, ic('newspaper'), ' ', t(l('Ficha', 'Profile')))),
        ))))),
      pager(pages));
  }
  const want = (a: Act) => F.gone === 'all' ? a.status === 'retired' || a.status === 'split' || a.status === 'hiatus' : F.gone === 'split' ? a.status === 'split' : F.gone === 'retired' ? a.status === 'retired' : a.status === 'hiatus';
  const list = Object.values(s.acts).filter((a) => want(a) && (F.family === 'any' || familyOf(a.genre) === F.family) && (F.market === 'any' || cityById[a.city]?.market === F.market) && (!q || a.name.toLowerCase().includes(q) || a.members.some((m) => s.persons[m]?.name.toLowerCase().includes(q))));
  const catalog = (a: Act) => a.releases.reduce((t0, id) => t0 + (s.releases[id]?.totalUnits ?? 0), 0);
  list.sort((a, b) => F.sort === 'name' ? a.name.localeCompare(b.name) : F.sort === 'debut' ? b.careerEnd - a.careerEnd : b.fame - a.fame);
  const SG = sortSpec27<Act>('dir-gone', { name: (a) => a.name, genre: (a) => genreName(a.genre), career: (a) => a.debutYear, status: (a) => (a.deceased ? 0 : a.status === 'split' ? 1 : a.status === 'retired' ? 2 : 3),
    recs: (a) => a.releases.length, sales: catalog, back: (a) => (a.deceased ? null : a.members.filter((m) => s.persons[m]?.alive).length || null) });
  const sorted = SG.apply(list);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  F.page = Math.min(F.page, pages - 1);
  const statusPill = (a: Act) => a.deceased ? pill(t(l('todos falecidos', 'all deceased')), 'bad') : a.status === 'split' ? pill(t(l('separada', 'split')), 'bad') : a.status === 'retired' ? pill(t(l('aposentado', 'retired')), 'warn') : pill(t(l('em pausa', 'on hiatus')), 'warn');
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('{n} atos fora de atividade. Quem ainda tem integrantes vivos pode voltar (reunião, saída da aposentadoria), e todos seguem vendendo catálogo.', '{n} inactive acts. Those with living members may return (reunion, coming out of retirement), and all keep selling their catalog.'), { n: list.length })),
    h('div', { class: 'tbl-wrap' }, h('table', sortTable27('dir-gone', 'tbl dir-tbl'),
      sortHead27(SG, [['', null], [l('Ato', 'Act'), 'name'], [l('Gênero', 'Genre'), 'genre'], [l('Carreira', 'Career'), 'career'], [l('Situação', 'Status'), 'status'], [l('Discos', 'Records'), 'recs'], [l('Vendas totais', 'Total sales'), 'sales'], [l('Pode voltar?', 'Could return?'), 'back'], ['', null]], toPage0, list),
      h('tbody', null, sorted.slice(F.page * PAGE, F.page * PAGE + PAGE).map((a) => {
        const live = a.members.filter((m) => s.persons[m]?.alive).length;
        return h('tr', null,
          h('td', null, logo(a, 28)),
          h('td', null, actLink(s, a.id), a.legend ? pill(t(l('lenda', 'legend')), 'gold') : null),
          h('td', null, actGenre23(s, a)),
          h('td', null, `${a.debutYear}–${a.status === 'hiatus' ? '…' : Math.min(a.careerEnd, s.year)}`), // r19 smoke: o fim planejado não vaza
          h('td', null, statusPill(a)),
          h('td', null, `${a.releases.length} · ${a.hits} top 10 · ${a.number1s} #1`),
          h('td', null, N0(catalog(a))),
          h('td', null, a.deceased || !live ? '—' : t(l('{n} vivos', '{n} alive'), { n: live })),
          h('td', null, h('button', { ...ent27('act', a.id), class: 'btn small ghost', onclick: () => openAct(a.id) }, ic('newspaper'), ' ', t(l('Página', 'Page')))),
        );
      })))),
    pager(pages));
}

/** r27: clique no cabeçalho ordena todas as páginas e volta para a primeira. */
function toPage0(): void { F.page = 0; rerender(); }

function pager(pages: number): HTMLElement | null {
  if (pages <= 1) return null;
  return h('div', { class: 'row center' },
    h('button', { class: 'btn small ghost', disabled: F.page === 0, onclick: () => { F.page -= 1; rerender(); } }, '←'),
    h('span', { class: 'small' }, ` ${F.page + 1} / ${pages} `),
    h('button', { class: 'btn small ghost', disabled: F.page >= pages - 1, onclick: () => { F.page += 1; rerender(); } }, '→'));
}

function directoryArea(s: GameState): HTMLElement {
  const set = <K extends keyof typeof F>(k: K) => (v: (typeof F)[K]) => {
    F[k] = v; F.page = 0;
    if (k === 'sort') for (const id of ['dir-acts', 'dir-people', 'dir-dead', 'dir-gone']) setSort27(id, undefined); // a lista "Ordenar" volta a mandar
    rerender();
  };
  const roles: Role[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'dj', 'producer', 'mc'];
  const search = h('input', { type: 'search', class: 'dir-search', placeholder: t(F.mode === 'acts' ? l('Buscar ato, integrante, gênero ou cidade…', 'Search act, member, genre or city…') : l('Buscar pessoa ou ato…', 'Search person or act…')), value: F.q,
    oninput: (e: Event) => { F.q = (e.target as HTMLInputElement).value; F.page = 0; clearTimeout(timer); timer = window.setTimeout(() => { rerender(); const el = document.querySelector<HTMLInputElement>('.dir-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250); } });
  return h('div', { class: 'panel directory' },
    h('h2', null, ic('fans'), ' ', t(l('Todos os artistas', 'All artists'))),
    h('div', { class: 'tabs', role: 'tablist' },
      h('button', { role: 'tab', class: F.mode === 'acts' ? 'on' : '', 'aria-selected': String(F.mode === 'acts'), onclick: () => set('mode')('acts') }, t(l('Atos', 'Acts'))),
      h('button', { role: 'tab', class: F.mode === 'people' ? 'on' : '', 'aria-selected': String(F.mode === 'people'), onclick: () => set('mode')('people') }, t(l('Pessoas', 'People'))),
      h('button', { role: 'tab', class: F.mode === 'gone' ? 'on' : '', 'aria-selected': String(F.mode === 'gone'), onclick: () => set('mode')('gone') }, ic('skull'), ' ', t(l('Mortos, separados e aposentados', 'Dead, split and retired')))),
    h('div', { class: 'row wrap dir-filters' },
      search,
      select(F.family, [{ value: 'any', label: t(l('Todas as famílias', 'All families')) }, ...FAMILIES.map((f) => ({ value: f.id, label: t(f.name) })).sort((a, b) => a.label.localeCompare(b.label))], set('family')),
      select(F.market, [{ value: 'any', label: t(l('Todas as regiões', 'All regions')) }, ...MARKETS.map((m) => ({ value: m.id, label: t(m.name) }))], set('market')),
      F.mode === 'gone' ? select(F.gone, [
        { value: 'all', label: t(l('Todos os inativos', 'All inactive')) }, { value: 'dead', label: t(l('Falecidos', 'Deceased')) },
        { value: 'split', label: t(l('Bandas separadas', 'Split bands')) }, { value: 'retired', label: t(l('Aposentados', 'Retired')) }, { value: 'hiatus', label: t(l('Em pausa', 'On hiatus')) },
      ] as { value: typeof F.gone; label: string }[], set('gone')) : null,
      F.mode === 'gone' ? null : select(F.owner, [
        { value: 'any', label: t(l('Qualquer selo', 'Any label')) }, { value: 'mine', label: t(l('Meus', 'Mine')) },
        { value: 'free', label: t(l('Sem contrato', 'Unsigned')) }, { value: 'rival', label: t(l('Em rivais', 'With rivals')) },
      ] as { value: typeof F.owner; label: string }[], set('owner')),
      F.mode === 'gone' ? null : select(F.status, [
        { value: 'live', label: t(l('Em atividade', 'Active')) }, { value: 'all', label: t(l('Todos', 'All')) }, { value: 'retired', label: t(l('Encerrados', 'Ended')) },
      ] as { value: typeof F.status; label: string }[], set('status')),
      F.mode === 'gone' ? null : F.mode === 'acts'
        ? select(F.format, [{ value: 'any', label: t(l('Solo e banda', 'Solo and band')) }, { value: 'solo', label: t(l('Solo', 'Solo')) }, { value: 'band', label: t(l('Banda', 'Band')) }] as { value: typeof F.format; label: string }[], set('format'))
        : select(F.role, [{ value: 'any', label: t(l('Qualquer função', 'Any role')) }, ...roles.map((r) => ({ value: r, label: t(ROLE_NAMES[r]) }))], set('role')),
      F.mode === 'gone' ? null : select(F.kin, [{ value: 'any', label: t(l('Família: todos', 'Family: all')) },
        ...(Object.keys(TAG29) as Tag29[]).map((k) => ({ value: k, label: `${t(l('Família', 'Family'))}: ${t(TAG29[k])}` }))] as { value: typeof F.kin; label: string }[], set('kin')),
      select(F.sort, [
        { value: 'fame', label: t(l('Ordenar: alcance', 'Sort: reach')) }, { value: 'name', label: t(l('Ordenar: nome', 'Sort: name')) },
        { value: 'debut', label: t(l('Ordenar: mais novos', 'Sort: newest')) }, { value: 'known', label: t(l('Ordenar: mais conhecidos por você', 'Sort: best known to you')) },
        { value: 'momentum', label: t(l('Ordenar: em alta', 'Sort: trending')) },
      ] as { value: typeof F.sort; label: string }[], set('sort')),
    ),
    F.mode === 'acts' ? actRows(s) : F.mode === 'gone' ? goneRows(s) : personRows(s),
  );
}
let timer = 0;

registerArea({ id: 'directory', label: l('Todos os artistas', 'All artists'), icon: 'fans', key: 'a', render: directoryArea });
