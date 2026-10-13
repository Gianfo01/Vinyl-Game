// Rodada 29 (WIKI) — registro da wiki: artigos de mecânica, glossário, perguntas, índices por seção, títulos, busca e o
// despachante id → página. Puro (sem DOM): tests/r29-wiki.test.ts monta todas as seções em várias eras sem navegador.

import { CITIES, GENRES, cityById, genreById, l } from '../../data/world';
import { countryName } from '../../data/geo';
import { GEAR19 } from '../../data/more19';
import { ORGS17 } from '../../data/orgs17';
import { OUTLETS17 } from '../../data/media17';
import { MOVEMENTS } from '../../data/content';
import { REAL_EXECS } from '../../data/labels10';
import { TECHS } from '../../data/rules';
import { ERA_SHIFTS } from '../../sim/sys/eras8';
import { SKUS } from '../../sim/sys/merch17';
import { VENUES17 } from '../../sim/sys/venues17';
import { norm29 } from '../ps/route29model';
import { FAQ_A, MECH_A, TERMS_A } from './mech29w_a';
import { FAQ_B, MECH_B, TERMS_B } from './mech29w_b';
import { FAQ_C, MECH_C, TERMS_C } from './mech29w_c';
import { EDGES29W, FAQ_D, MECH_D, TERMS_D } from './mech29w_d';
import { H, P, SECS29W, T, hidden29, inl29, kindOf29, ln29, realCat29, restOf29, slug29, staticLabels29, tx, year29, type Sec29W, type W29 } from './wiki29core';
import { MGRS29, PRODS29, critics29, crumbs29, listLabel29, pageAct29, pageCritic29, pageExec29, pageLabel29, pageMgr29, pagePerson29, pageProd29, pageRealAct29, pageRealPerson29, visible29 } from './wiki29people';
import { SYS_OF_MECH29 } from './wiki29sys';
import type { Block29, Faq29, MechArt29, Page29, Term29 } from './wiki29types';
import { countries29, movName29, pageCity29, pageCountry29, pageEra29, pageGear29, pageGenre29, pageMerch29, pageMove29, pageOrg29, pageOutlet29, pageRelic29, pageTech29, pageVehicle29, pageVenue29, relics29 } from './wiki29world';

export { EDGES29W };

/** Os artigos de mecânica na ordem pedida (um por sistema). */
export const MECH_ORDER29 = ['money', 'contracts', 'scouting', 'music', 'live', 'fame', 'reputation', 'hq', 'life', 'press', 'underworld', 'world', 'awards', 'story', 'start', 'careers', 'modes', 'connections'];
const ALL_MECH = [...MECH_A, ...MECH_B, ...MECH_C, ...MECH_D];
export const MECH29: MechArt29[] = MECH_ORDER29.map((id) => ALL_MECH.find((m) => m.id === id)).filter((m): m is MechArt29 => !!m);
export const mech29 = (id: string): MechArt29 | undefined => MECH29.find((m) => m.id === id);

/** Verbetes próprios da wiki (os demais vêm dos artigos). */
const TERMS_W: Term29[] = [
  { id: 'revelar-historia', term: l('Revelar história real', 'Reveal real history'), def: l('Botão da wiki (desligado por padrão) que mostra fatos reais posteriores ao ano da partida: discos futuros, mortes, separações, datas de tecnologia. Só vale enquanto a wiki está aberta; não muda a partida nem vai para o save.', 'Wiki toggle (off by default) that shows real facts after the run\'s year: future records, deaths, split-ups, technology dates. It lasts while the wiki is open; it does not change the run nor go into the save.'), see: ['mech:modes'] },
  { id: 'na-sua-partida', term: l('Na sua partida', 'In your run'), def: l('Caixa das páginas da wiki com valores vivos da partida carregada (banda atual, relação com você, popularidade do gênero…). Sem partida, ela não aparece.', 'Box on wiki pages with live values from the loaded run (current band, relationship with you, genre popularity…). Without a run it does not appear.'), see: ['mech:connections'] },
  { id: 'fonte-canonica', term: l('Fonte canônica pessoa ↔ ato', 'Canonical person ↔ act source'), def: l('Índice único de quem passou por qual banda (integrantes, ex-integrantes, log de formação e crônica). A ficha da pessoa, a página do ato e esta wiki leem dele, por isso sempre concordam.', 'Single index of who was in which band (members, former members, lineup log and chronicle). The person sheet, the act page and this wiki read it, so they always agree.'), see: ['mech:connections'] },
];
export const TERMS29: Term29[] = [...TERMS_W, ...TERMS_A, ...TERMS_B, ...TERMS_C, ...TERMS_D].filter((x, i, xs) => xs.findIndex((y) => y.id === x.id) === i).sort((a, b) => tx(a.term).localeCompare(tx(b.term)));
const FAQ_W: Faq29[] = [
  { id: 'wiki-spoiler', q: l('A wiki pode estragar a história da minha partida?', 'Can the wiki spoil my run?'), a: l('Não por padrão. Ela esconde talento e potencial ocultos, intenções secretas de rivais, o mínimo escondido de uma negociação e todo fato real depois do ano da partida. Para ver a história real futura, ligue [[glossario:revelar-historia]].', 'Not by default. It hides hidden talent and potential, rivals\' secret intentions, a negotiation\'s hidden minimum and every real fact after the run\'s year. To see future real history, turn on [[glossario:revelar-historia]].'), see: ['mech:modes'] },
  { id: 'wiki-pessoas', q: l('Por que a wiki mostra pessoas diferentes em cada partida?', 'Why does the wiki show different people in each run?'), a: l('Com uma partida carregada, Personagens lista as pessoas, artistas e selos DESTA partida (gerados ou reais). Sem partida, mostra o catálogo de dados reais do jogo.', 'With a run loaded, Characters lists the people, acts and labels of THIS run (generated or real). Without a run it shows the game\'s real-data catalog.') },
];
export const FAQS29: Faq29[] = [...FAQ_W, ...FAQ_A, ...FAQ_B, ...FAQ_C, ...FAQ_D].filter((x, i, xs) => xs.findIndex((y) => y.id === x.id) === i);

// ---------------------------------------------------------------- listas (índices)

export const SEC_LISTS29: Record<Exclude<Sec29W, 'home'>, string[]> = {
  pessoas: ['persons', 'acts', 'labels', 'prods', 'mgrs', 'execs', 'critics'],
  mech: ['mech'],
  mundo: ['cities', 'countries', 'genres', 'movements', 'eras', 'techs', 'venues', 'outlets', 'labels', 'orgs'],
  objetos: ['relics', 'gear', 'merch', 'vehicles'],
  glossario: ['glossario'],
  faq: ['faq'],
};

/** Ids de uma lista, já sem o que é futuro (a menos que revelado). Ordem alfabética/cronológica. */
export function listIds29(c: W29, list: string): string[] {
  const s = c.s;
  const byName = <X>(xs: X[], name: (x: X) => string): X[] => [...xs].sort((a, b) => name(a).localeCompare(name(b)));
  switch (list) {
    case 'persons':
      if (s) { const v = visible29(s); return byName([...v.pids].map((id) => s.persons[id]).filter(Boolean), (p) => p.name).map((p) => `person:${p.id}`); }
      return realCat29().pers.map((p) => `rp:${p.slug}`);
    case 'acts':
      if (s) return byName(visible29(s).acts, (a) => a.name).map((a) => `act:${a.id}`);
      return realCat29().arts.map((a) => `ract:${a.slug}`);
    case 'labels':
      if (s) return byName(Object.values(s.labels).filter((x) => x.founded <= s.year), (x) => x.name).map((x) => `label:${x.id}`);
      return byName(staticLabels29(), (x) => x.real ?? x.name).map((x) => `label:${x.id}`);
    case 'prods': return byName(PRODS29().filter((p) => !hidden29(c, p.from)), (p) => p.name).map((p) => `prod:${p.id}`);
    case 'mgrs': return byName(MGRS29().filter((p) => !hidden29(c, p.from)), (p) => p.name).map((p) => `mgr:${p.id}`);
    case 'execs': return byName(REAL_EXECS.filter((p) => !hidden29(c, p.y)), (p) => p.name).map((p) => `exec:${p.rid}`);
    case 'critics': return critics29().filter((p) => !hidden29(c, p.from)).map((p) => `critic:${p.slug}`);
    case 'cities': return byName(CITIES, (x) => tx(x.name)).map((x) => `city:${x.id}`);
    case 'countries': return byName(countries29(), (x) => tx(countryName(x.a3))).map((x) => `country:${x.a3}`);
    case 'genres': return [...GENRES].filter((g) => !hidden29(c, g.born)).sort((a, b) => a.born - b.born).map((g) => `genre:${g.id}`);
    case 'movements': return MOVEMENTS.filter((m) => !hidden29(c, m.from)).sort((a, b) => a.from - b.from).map((m) => `move:${m.id}`);
    case 'eras': return ERA_SHIFTS.map((e) => `era:${e.id}`);
    case 'techs': return [...TECHS].sort((a, b) => a.base - b.base).map((x) => `tech:${x.id}`);
    case 'venues': return byName(VENUES17.filter((v) => !hidden29(c, v.from)), (v) => v.name).map((v) => `venue:${v.id}`);
    case 'outlets': return byName(OUTLETS17.filter((o) => !hidden29(c, o.from)), (o) => o.name).map((o) => `outlet:${o.id}`);
    case 'orgs': return ORGS17.filter((o) => !hidden29(c, o.from)).map((o) => `org:${o.id}`);
    case 'relics': return relics29().filter((d) => !hidden29(c, d.year)).sort((a, b) => a.year - b.year).map((d) => `relic:${d.id}`);
    case 'gear': return [...GEAR19].filter((g) => !hidden29(c, g.from)).sort((a, b) => a.from - b.from).map((g) => `gear:${g.id}`);
    case 'merch': return Object.keys(SKUS).map((k) => `merch:${k}`);
    case 'vehicles': return ['vehicle:van', 'vehicle:bus', 'vehicle:fly'];
    case 'mech': return MECH29.map((m) => `mech:${m.id}`);
    case 'glossario': return TERMS29.map((x) => `glossario:${x.id}`);
    case 'faq': return FAQS29.map((x) => `faq:${x.id}`);
    default: return [];
  }
}

// ---------------------------------------------------------------- títulos (para links, migalhas, listas e busca)

export function title29(c: W29, id: string): string {
  const k = kindOf29(id), r = restOf29(id);
  const s = c.s;
  switch (k) {
    case 'home': return T('Wiki do Masters', 'Masters wiki');
    case 'idx': return SECS29W.find((x) => x.id === r) ? tx(SECS29W.find((x) => x.id === r)!.label) : listLabel29(r);
    case 'mech': { const m = mech29(r); return m ? tx(m.title) : r; }
    case 'glossario': { const x = TERMS29.find((y) => y.id === r); return x ? tx(x.term) : r; }
    case 'faq': { const x = FAQS29.find((y) => y.id === r); return x ? tx(x.q) : r; }
    case 'person': return s?.persons[r]?.name ?? r;
    case 'act': return s?.acts[r]?.name ?? r;
    case 'label': return s?.labels[r]?.name ?? (() => { const x = staticLabels29().find((y) => y.id === r); return x ? x.real ?? x.name : r; })();
    case 'rp': return realCat29().perBy.get(r)?.n ?? r;
    case 'ract': return realCat29().artBy.get(r)?.n ?? r;
    case 'prod': return PRODS29().find((x) => x.id === r)?.name ?? r;
    case 'mgr': return MGRS29().find((x) => x.id === r)?.name ?? r;
    case 'exec': return REAL_EXECS.find((x) => x.rid === r)?.name ?? r;
    case 'critic': return critics29().find((x) => x.slug === r)?.name ?? r;
    case 'city': return cityById[r] ? tx(cityById[r].name) : r;
    case 'country': return tx(countryName(r));
    case 'genre': return genreById[r] ? tx(genreById[r].name) : r;
    case 'move': return movName29(r);
    case 'era': { const e = ERA_SHIFTS.find((x) => x.id === r); return e ? tx(e.name) : r; }
    case 'tech': { const x = TECHS.find((y) => y.id === r); return x ? tx(x.name) : r; }
    case 'venue': return VENUES17.find((x) => x.id === r)?.name ?? r;
    case 'outlet': { const o = OUTLETS17.find((x) => x.id === r); return o ? ((s ? s.config.realNames : true) && o.real ? o.real : o.name) : r; }
    case 'org': { const o = ORGS17.find((x) => x.id === r); return o ? tx(o.name) : r; }
    case 'relic': { const d = relics29().find((x) => x.id === r); return d ? tx(d.name) : r; }
    case 'gear': return GEAR19.find((x) => x.id === r)?.name ?? r;
    case 'merch': { const m = (SKUS as Record<string, { name: ReturnType<typeof l> }>)[r]; return m ? tx(m.name) : r; }
    case 'vehicle': return r === 'van' ? T('Van', 'Van') : r === 'bus' ? T('Ônibus de turnê', 'Tour bus') : r === 'fly' ? T('Avião', 'Plane') : r;
    default: return id;
  }
}

/** Subtítulo curto de uma linha de lista. */
export function sub29(c: W29, id: string): string {
  const k = kindOf29(id), r = restOf29(id);
  const s = c.s;
  switch (k) {
    case 'person': { const p = s?.persons[r]; return p ? `${p.born}${!p.alive && p.died ? `–${p.died}` : ''}` : ''; }
    case 'act': { const a = s?.acts[r]; return a ? `${genreById[a.genre] ? tx(genreById[a.genre].name) : a.genre} · ${a.formed}` : ''; }
    case 'rp': { const p = realCat29().perBy.get(r); return p ? `${p.b ?? '?'}${p.x && !hidden29(c, p.x) ? `–${p.x}` : ''}` : ''; }
    case 'ract': { const a = realCat29().artBy.get(r); return a ? `${genreById[a.g] ? tx(genreById[a.g].name) : a.g} · ${a.d}` : ''; }
    case 'mech': return tx(mech29(r)?.summary ?? l(''));
    case 'genre': return String(genreById[r]?.born ?? '');
    case 'city': return cityById[r]?.market ?? '';
    case 'relic': return String(relics29().find((x) => x.id === r)?.year ?? '');
    default: return '';
  }
}

// ---------------------------------------------------------------- páginas

const listPage = (c: W29, list: string): Page29 => {
  const ids = listIds29(c, list);
  const sec = (Object.entries(SEC_LISTS29).find(([, xs]) => xs.includes(list))?.[0] ?? 'home') as Sec29W;
  return { id: `idx:${list}`, title: listLabel29(list), kind: `${ids.length.toLocaleString()} ${T('artigos', 'articles')}`, crumbs: crumbs29(sec), blocks: [
    ...(list === 'persons' || list === 'acts' ? [P(c.s ? T('Da sua partida: só quem já existe no ano atual (ou que você já conhece).', 'From your run: only who already exists in the current year (or whom you already know).') : T('Sem partida carregada: catálogo de dados reais do jogo.', 'No run loaded: the game\'s real-data catalog.'))] : []),
    { k: 'list', ids, group: list }] };
};

function secPage(c: W29, sec: Sec29W): Page29 {
  if (sec === 'home') return homePage(c);
  const lists = SEC_LISTS29[sec];
  if (lists.length === 1) return listPage(c, lists[0]);
  return { id: `idx:${sec}`, title: tx(SECS29W.find((x) => x.id === sec)!.label), kind: T('seção', 'section'), crumbs: crumbs29('home'), blocks: [
    { k: 'ul', items: lists.map((x) => [ln29(`idx:${x}`, listLabel29(x)), ` — ${listIds29(c, x).length.toLocaleString()}`]) },
  ] };
}

function homePage(c: W29): Page29 {
  const blocks: Block29[] = [
    P(T('Tudo sobre o jogo num lugar só: personagens com retrato, como cada sistema funciona, o mundo, os objetos, um glossário e as perguntas mais comuns. Busque no campo acima (com ou sem acento) ou navegue pelas seções.', 'Everything about the game in one place: characters with portraits, how each system works, the world, the objects, a glossary and the most common questions. Search above (with or without accents) or browse the sections.')),
    { k: 'note', hue: c.s ? 'good' : 'info', t: c.s ? T('Partida carregada', 'Run loaded') : T('Sem partida', 'No run'), x: [c.s
      ? `${T('Personagens e valores vivos vêm da sua partida', 'Characters and live values come from your run')} (${c.s.config.companyName}, ${c.s.year}). ${T('Fatos reais depois deste ano ficam escondidos.', 'Real facts after this year stay hidden.')}`
      : T('Mostrando o catálogo de dados reais (artistas, produtores, empresários, críticos, veículos). Comece uma partida para ver os personagens dela.', 'Showing the real-data catalog (artists, producers, managers, critics, outlets). Start a run to see its characters.')] },
    H(T('Seções', 'Sections')),
    { k: 'ul', items: SECS29W.filter((x) => x.id !== 'home').map((x) => [ln29(`idx:${x.id}`, tx(x.label)), ` — ${SEC_LISTS29[x.id as Exclude<Sec29W, 'home'>].reduce((n, li) => n + listIds29(c, li).length, 0).toLocaleString()} ${T('artigos', 'articles')}`]) },
    H(T('Comece por aqui', 'Start here')),
    { k: 'ul', items: [[ln29('mech:money', title29(c, 'mech:money'))], [ln29('mech:contracts', title29(c, 'mech:contracts'))], [ln29('mech:music', title29(c, 'mech:music'))], [ln29('mech:connections', title29(c, 'mech:connections'))], [ln29('faq:wiki-spoiler', title29(c, 'faq:wiki-spoiler'))]] },
  ];
  return { id: 'home', title: T('Wiki do Masters', 'Masters wiki'), kind: T('início', 'home'), art: { k: 'icon', name: 'book' }, crumbs: [], blocks };
}

const tl = (c: W29) => (id: string) => title29(c, id);

function mechPage(c: W29, m: MechArt29): Page29 {
  const L2 = (xs: ReturnType<typeof l>[]) => xs.map((x) => inl29(tx(x), tl(c)));
  const blocks: Block29[] = [P(...inl29(tx(m.summary), tl(c)))];
  for (const x of m.what) blocks.push(P(...inl29(tx(x), tl(c))));
  if (m.id === 'connections') blocks.push(H(T('Mapa das conexões', 'Connection map')), { k: 'diagram' });
  if (m.inputs.length) blocks.push(H(T('O que afeta este sistema', 'What affects this system')), { k: 'ul', items: L2(m.inputs) });
  if (m.outputs.length) blocks.push(H(T('O que este sistema afeta', 'What this system affects')), { k: 'ul', items: L2(m.outputs) });
  if (m.rules.length) blocks.push(H(T('Regras e fórmulas', 'Rules and formulas')), { k: 'ul', items: L2(m.rules) });
  let nums: [ReturnType<typeof l>, string][] = [];
  try { nums = m.nums?.(c.s) ?? []; } catch { nums = []; }
  if (nums.length) blocks.push(H(T('Números do código (lidos agora)', 'Numbers from the code (read now)')), { k: 'kv', rows: nums.map(([a, b]) => [tx(a), [b]]) });
  if (m.tips.length) blocks.push(H(T('Dicas', 'Tips')), { k: 'ul', items: L2(m.tips) });
  if (m.pages.length) blocks.push(H(T('Onde se controla no jogo', 'Where to control it in game')), { k: 'pages', ids: m.pages });
  if (m.see.length) blocks.push(H(T('Veja também', 'See also')), { k: 'ul', items: m.see.map((x) => [ln29(x, title29(c, x))]) });
  const mods = SYS_OF_MECH29[m.id] ?? [];
  if (mods.length) blocks.push(H(T('Sistemas no código', 'Systems in the code')), P(`src/sim/sys: ${mods.join(', ')}`), ...(m.docs?.length ? [P(`${T('Documentos', 'Docs')}: ${m.docs.join(', ')}`)] : []));
  return { id: `mech:${m.id}`, title: tx(m.title), kind: T('mecânica', 'mechanic'), art: { k: 'icon', name: m.icon }, crumbs: crumbs29('mech'), blocks };
}

/** Página de um id (null = não existe). */
export function page29(c: W29, id: string): Page29 | null {
  if (!id || id === 'home') return homePage(c);
  const k = kindOf29(id), r = restOf29(id);
  switch (k) {
    case 'idx': return SECS29W.some((x) => x.id === r) ? secPage(c, r as Sec29W) : listIds29(c, r).length || r in LIST_OK ? listPage(c, r) : null;
    case 'mech': { const m = mech29(r); return m ? mechPage(c, m) : null; }
    case 'glossario': { const x = TERMS29.find((y) => y.id === r); return x ? { id, title: tx(x.term), kind: T('glossário', 'glossary'), art: { k: 'icon', name: 'quill' }, crumbs: crumbs29('glossario'), blocks: [P(...inl29(tx(x.def), tl(c))), ...(x.see?.length ? [H(T('Veja também', 'See also')), { k: 'ul' as const, items: x.see.map((y) => [ln29(y, title29(c, y))]) }] : [])] } : null; }
    case 'faq': { const x = FAQS29.find((y) => y.id === r); return x ? { id, title: tx(x.q), kind: T('pergunta frequente', 'FAQ'), art: { k: 'icon', name: 'bulb' }, crumbs: crumbs29('faq'), blocks: [P(...inl29(tx(x.a), tl(c))), ...(x.see?.length ? [H(T('Veja também', 'See also')), { k: 'ul' as const, items: x.see.map((y) => [ln29(y, title29(c, y))]) }] : [])] } : null; }
    case 'person': return pagePerson29(c, r);
    case 'act': return pageAct29(c, r);
    case 'label': return pageLabel29(c, r);
    case 'rp': return pageRealPerson29(c, r);
    case 'ract': return pageRealAct29(c, r);
    case 'prod': return pageProd29(c, r);
    case 'mgr': return pageMgr29(c, r);
    case 'exec': return pageExec29(c, r);
    case 'critic': return pageCritic29(c, r);
    case 'city': return pageCity29(c, r);
    case 'country': return pageCountry29(c, r);
    case 'genre': return pageGenre29(c, r);
    case 'move': return pageMove29(c, r);
    case 'era': return pageEra29(c, r);
    case 'tech': return pageTech29(c, r);
    case 'venue': return pageVenue29(c, r);
    case 'outlet': return pageOutlet29(c, r);
    case 'org': return pageOrg29(c, r);
    case 'relic': return pageRelic29(c, r);
    case 'gear': return pageGear29(c, r);
    case 'merch': return pageMerch29(c, r);
    case 'vehicle': return pageVehicle29(c, r);
    default: return null;
  }
}
const LIST_OK: Record<string, 1> = { persons: 1, acts: 1, labels: 1, prods: 1, mgrs: 1, execs: 1, critics: 1, cities: 1, countries: 1, genres: 1, movements: 1, eras: 1, techs: 1, venues: 1, outlets: 1, orgs: 1, relics: 1, gear: 1, merch: 1, vehicles: 1, mech: 1, glossario: 1, faq: 1 };

/** O id existe (para links)? Pessoas/atos da partida e dados reais contam; não verifica spoiler (a página cuida). */
export function exists29(c: W29, id: string): boolean {
  const k = kindOf29(id), r = restOf29(id);
  if (!k) return false;
  if (k === 'home') return true;
  if (k === 'idx') return SECS29W.some((x) => x.id === r) || r in LIST_OK;
  if (k === 'mech') return !!mech29(r);
  if (k === 'glossario') return TERMS29.some((x) => x.id === r);
  if (k === 'faq') return FAQS29.some((x) => x.id === r);
  return title29(c, id) !== r || page29(c, id) !== null;
}

// ---------------------------------------------------------------- busca

export interface Hit29 { id: string; label: string; sub: string }
export interface HitGroup29 { group: string; label: string; items: Hit29[]; more: number }
interface Ix29 { k: string; rows: { id: string; label: string; f: string; group: string }[] }
const IX = new WeakMap<object, Ix29>();
const NOGAME = {};

/** Índice de busca (montado sob demanda, refeito quando a semana/o revelar mudam). */
export function searchIndex29(c: W29): Ix29['rows'] {
  const key = `${c.s?.week ?? -1}|${c.reveal}|${c.s ? Object.keys(c.s.acts).length : 0}`;
  const o = c.s ?? NOGAME;
  const hit = IX.get(o);
  if (hit && hit.k === key) return hit.rows;
  const rows: Ix29['rows'] = [];
  const lists = ['mech', 'glossario', 'faq', 'persons', 'acts', 'labels', 'prods', 'mgrs', 'execs', 'critics', 'cities', 'countries', 'genres', 'movements', 'eras', 'techs', 'venues', 'outlets', 'orgs', 'relics', 'gear', 'merch', 'vehicles'];
  for (const li of lists) for (const id of listIds29(c, li)) {
    const label = title29(c, id);
    const extra = li === 'mech' ? ` ${tx(mech29(restOf29(id))!.summary)}` : li === 'glossario' ? ` ${tx(TERMS29.find((x) => x.id === restOf29(id))!.term)}` : '';
    rows.push({ id, label, f: norm29(`${label} ${extra}`), group: li });
  }
  IX.set(o, { k: key, rows });
  return rows;
}

/** Busca sem acento, com teto e agrupada por tipo. Começo do nome pesa mais que trecho. */
export function search29(c: W29, q: string, cap = 60, perGroup = 8): HitGroup29[] {
  const f = norm29(q);
  if (f.length < 2) return [];
  const words = f.split(' ').filter(Boolean);
  const scored: { r: Ix29['rows'][number]; sc: number }[] = [];
  for (const r of searchIndex29(c)) {
    if (!words.every((w) => r.f.includes(w))) continue;
    const nl = norm29(r.label);
    const sc = (nl === f ? 100 : nl.startsWith(f) ? 60 : nl.split(' ').some((w) => w.startsWith(words[0])) ? 30 : 10) + (r.group === 'mech' ? 15 : r.group === 'glossario' ? 8 : 0) - nl.length / 100;
    scored.push({ r, sc });
  }
  scored.sort((a, b) => b.sc - a.sc);
  const groups = new Map<string, HitGroup29>();
  let total = 0;
  for (const { r } of scored) {
    let g = groups.get(r.group);
    if (!g) { g = { group: r.group, label: listLabel29(r.group), items: [], more: 0 }; groups.set(r.group, g); }
    if (g.items.length >= perGroup || total >= cap) { g.more++; continue; }
    g.items.push({ id: r.id, label: r.label, sub: sub29(c, r.id) });
    total++;
  }
  return [...groups.values()].filter((g) => g.items.length);
}

/** Todos os links citados em textos de artigos fixos (mecânicas, glossário, perguntas) — para o teste de links. */
export function staticLinks29(): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const scan = (from: string, x: ReturnType<typeof l>) => { for (const tt of [x.pt, x.en]) for (const m of tt.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) out.push({ from, to: m[1].trim() }); };
  for (const m of MECH29) { for (const x of [m.summary, ...m.what, ...m.inputs, ...m.outputs, ...m.rules, ...m.tips]) scan(`mech:${m.id}`, x); for (const s0 of m.see) out.push({ from: `mech:${m.id}`, to: s0 }); }
  for (const x of TERMS29) { scan(`glossario:${x.id}`, x.def); for (const s0 of x.see ?? []) out.push({ from: `glossario:${x.id}`, to: s0 }); }
  for (const x of FAQS29) { scan(`faq:${x.id}`, x.a); for (const s0 of x.see ?? []) out.push({ from: `faq:${x.id}`, to: s0 }); }
  return out;
}

export { slug29, year29 };
