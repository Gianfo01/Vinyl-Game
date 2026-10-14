// Rodada 29 (WIKI) — interface da wiki: página SEPARADA do jogo (wiki.html), sem partida nem save. Busca, migalhas,
// voltar/avançar (histórico do navegador), links cruzados e abas das seções.
// Listas longas (a base "enorme" tem milhares de pessoas) são virtualizadas; as páginas são montadas só quando abertas.
// Arte: só a pixel art procedural que já existe (retratos com visual famoso, logos, brasões, selos, relíquias…).

import { getLang, setLang, t } from '../../i18n/strings';
import { logoUrl } from '../art';
import { h } from '../dom';
import { portraitDataUrl } from '../pixel/avatar';
import { awardSealImg29, genreBadgeImg29, movementBadgeImg29 } from '../pixel/badge29';
import { emblemImg28, orgEmblemKind28 } from '../pixel/emblem28';
import { cityCrestImg29, flagImg29, skylineThumbImg29 } from '../pixel/geo29';
import { bandPhotoImg29, staffPortraitImg29, staffRoleOf29 } from '../pixel/people29';
import { relicImg28 } from '../pixel/relic28';
import { gearImg29, merchImg29, vehicleImg29 } from '../pixel/things29';
import { outletArt29, venueArt29 } from '../art29ui';
import { ic } from '../vis';
import { SCREENS29 } from '../ps/route29model';
import { SECTIONS25 } from '../ps/nav25';
import { refActBlocks29, refBlocks29 } from './wiki29ref';
import { MECH29, SEC_LISTS29, listIds29, page29, search29, title29, sub29 } from './wiki29model';
import { listLabel29 } from './wiki29people';
import { CATS29, catItems29, decades29 } from './wiki29bible';
import { CONNMAP29, SYSTEMS29 } from '../../sim/connmap29';
import { l } from '../../data/world';
import { SECS29W, T, hashOf29, idOfHash29, kindOf29, restOf29, secOf29W, type W29 } from './wiki29core';
import type { Art29W, Block29, Inline29, Page29 } from './wiki29types';
import './wiki29.css';

// ---------------------------------------------------------------- estado da página (só nesta aba do navegador)

interface St { id: string; q: string; root: HTMLElement | null; body: HTMLElement | null; input: HTMLInputElement | null; side: HTMLElement | null }
const st: St = { id: 'home', q: '', root: null, body: null, input: null, side: null };
/** A wiki é um arquivo separado do jogo: nunca lê partida nem save — sempre o catálogo de dados do jogo. */
const ctx = (): W29 => ({ s: null, reveal: false });

/** Endereço da página: #/mech/money ↔ id "mech:money" (mesmo formato de hashOf29, sem o prefixo /wiki). */
const pageHash = (id: string): string => hashOf29(id).replace(/^#\/wiki/, '#') || '#/';
const idOfPage = (hash: string): string => idOfHash29(`#/wiki${hash.replace(/^#/, '')}`) ?? 'home';

/** Tema da página (pergaminho claro ou noite). Só nesta aba: a wiki não grava nada. */
let theme29: 'light' | 'dark' = 'light';

/** Monta a wiki ocupando `root` (wiki.html). Layout inspirado nas wikis de jogos (Stardew Valley Wiki): cabeçalho com
 *  logotipo e busca, barra lateral de navegação, página inicial em quadros com ícones, caixa de informações à direita,
 *  índice do artigo e quadros de navegação no rodapé. Voltar/avançar do navegador funcionam (histórico por hash). */
export function mountWiki29(root: HTMLElement): void {
  const input = h('input', { type: 'search', class: 'wk29-q', placeholder: T('Buscar na wiki…', 'Search the wiki…'), 'aria-label': T('Buscar na wiki', 'Search the wiki') }) as HTMLInputElement;
  input.addEventListener('input', () => { st.q = input.value; draw(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') st.body?.querySelector<HTMLButtonElement>('.wk29-hit')?.click(); });
  const body = h('div', { class: 'wk29-body', id: 'main', role: 'main', tabindex: '-1' });
  const side = h('nav', { class: 'wk29-side', 'aria-label': T('Navegação da wiki', 'Wiki navigation') });
  const langBtn = (lg: 'pt' | 'en') => h('button', { type: 'button', class: `wk29-lang${getLang() === lg ? ' on' : ''}`, 'aria-pressed': getLang() === lg ? 'true' : 'false', onclick: () => { setLang(lg); document.documentElement.lang = lg === 'pt' ? 'pt-BR' : 'en'; root.replaceChildren(); mountWiki29(root); } }, lg.toUpperCase());
  const themeBtn = h('button', { type: 'button', class: 'wk29-lang', title: T('Tema claro/escuro', 'Light/dark theme'), 'aria-label': T('Tema claro/escuro', 'Light/dark theme'),
    onclick: () => { theme29 = theme29 === 'light' ? 'dark' : 'light'; page.dataset.wtheme = theme29; } }, '☀/☾');
  const menuBtn = h('button', { type: 'button', class: 'wk29-menu', 'aria-label': T('Menu', 'Menu'), 'aria-expanded': 'false',
    onclick: () => { const open = page.classList.toggle('side-open'); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); } }, '☰');
  const page = h('div', { class: 'wk29 wk29-standalone', 'data-wtheme': theme29 },
    h('header', { class: 'wk29-top' }, menuBtn,
      h('a', { class: 'wk29-brand', href: '#/' }, h('span', { class: 'wk29-disc', 'aria-hidden': 'true' }), h('span', { class: 'wk29-logo' }, h('b', null, 'MASTERS'), h('small', null, T('Wiki oficial do jogo', 'Official game wiki')))),
      h('div', { class: 'wk29-search' }, h('span', { class: 'wk29-sic', 'aria-hidden': 'true' }, ic('eye', 1)), input),
      h('div', { class: 'wk29-langs', role: 'group', 'aria-label': T('Idioma e tema', 'Language and theme') }, langBtn('pt'), langBtn('en'), themeBtn)),
    h('div', { class: 'wk29-wrap' }, side, body));
  root.append(page);
  st.root = page; st.body = body; st.input = input; st.side = side;
  st.id = idOfPage(location.hash);
  window.onhashchange = () => { st.id = idOfPage(location.hash); st.q = ''; input.value = ''; page.classList.remove('side-open'); draw(); };
  draw();
}

function go(id: string): void {
  st.q = '';
  if (st.input) st.input.value = '';
  const hsh = pageHash(id);
  if (location.hash === hsh) { st.id = id; draw(); return; }
  location.hash = hsh; // dispara hashchange → draw()
}

// ---------------------------------------------------------------- barra lateral

function sideEl(): HTMLElement[] {
  const c = ctx();
  const sec = secOf29W(st.id);
  const item = (id: string, icon: string, label: string, on: boolean) => h('li', null, h('a', { href: pageHash(id), class: `wk29-sl${on ? ' on' : ''}`, 'aria-current': on ? 'page' : undefined }, h('span', { class: 'wk29-sli', 'aria-hidden': 'true' }, ic(icon, 1)), h('span', null, label)));
  return [
    h('div', { class: 'wk29-sbox' }, h('h2', null, T('Navegação', 'Navigation')),
      h('ul', null, SECS29W.map((x) => item(x.id === 'home' ? 'home' : `idx:${x.id}`, x.icon, t(x.label), x.id === sec && !st.q)))),
    h('div', { class: 'wk29-sbox' }, h('h2', null, T('Mecânicas', 'Mechanics')),
      h('ul', null, MECH29.map((m) => item(`mech:${m.id}`, m.icon, title29(c, `mech:${m.id}`), st.id === `mech:${m.id}`)))),
    h('div', { class: 'wk29-sbox' }, h('h2', null, T('Ferramentas', 'Tools')),
      h('ul', null,
        h('li', null, h('button', { type: 'button', class: 'wk29-sl', onclick: () => go(randomId()) }, h('span', { class: 'wk29-sli', 'aria-hidden': 'true' }, ic('dice', 1)), h('span', null, T('Página aleatória', 'Random page')))),
        h('li', null, h('button', { type: 'button', class: 'wk29-sl', onclick: () => history.back() }, h('span', { class: 'wk29-sli', 'aria-hidden': 'true' }, '◀'), h('span', null, T('Voltar', 'Back')))),
        h('li', null, h('button', { type: 'button', class: 'wk29-sl', onclick: () => history.forward() }, h('span', { class: 'wk29-sli', 'aria-hidden': 'true' }, '▶'), h('span', null, T('Avançar', 'Forward')))))),
  ];
}

/** Uma página qualquer (artistas e pessoas reais, mecânicas, mundo, objetos). */
function randomId(): string {
  const c = ctx();
  const lists = ['acts', 'persons', 'mech', 'cities', 'genres', 'relics', 'venues', 'orgs', 'glossario'];
  const li = lists[Math.floor(Math.random() * lists.length)];
  const ids = listIds29(c, li);
  return ids.length ? ids[Math.floor(Math.random() * ids.length)] : 'home';
}

// ---------------------------------------------------------------- desenho

function draw(): void {
  const root = st.root, body = st.body;
  if (!root || !body) return;
  const c = ctx();
  st.side?.replaceChildren(...sideEl());
  body.replaceChildren();
  if (st.q.trim().length >= 2) { body.append(results(c)); document.title = `${T('Busca', 'Search')} · Masters Wiki`; return; }
  if (st.id === 'home') { body.append(homeEl()); document.title = 'Masters Wiki'; window.scrollTo(0, 0); return; }
  let p: Page29 | null = null;
  try { p = page29(c, st.id); } catch (e) { console.error('wiki29', e); }
  if (!p) p = { id: st.id, title: T('Página não encontrada', 'Page not found'), kind: '', crumbs: [{ id: 'home', label: T('Início', 'Home') }], blocks: [{ k: 'p', x: [T('Este artigo não existe. Use a busca acima.', 'This article does not exist. Use the search above.')] }] };
  document.title = `${p.title} · Masters Wiki`;
  const sec = secOf29W(st.id);
  body.append(st.id.startsWith('idx:') && SECS29W.some((x) => x.id === restOf29(st.id)) && sec !== 'dados' && sec !== 'mech' && restOf29(st.id) === sec ? sectionEl(p, sec) : pageEl(p));
  window.scrollTo(0, 0);
}

function results(c: W29): HTMLElement {
  const gs = search29(c, st.q);
  const head = h('h1', { class: 'wk29-title' }, T(`Resultados para “${st.q.trim()}”`, `Results for “${st.q.trim()}”`));
  if (!gs.length) return h('article', { class: 'wk29-page' }, head, h('p', { class: 'muted' }, T('Nada encontrado. Tente outra palavra (a busca ignora acentos).', 'Nothing found. Try another word (search ignores accents).')));
  return h('article', { class: 'wk29-page' }, head, h('div', { class: 'wk29-res' }, gs.map((g) => h('section', { class: 'wk29-portal' }, h('h2', null, g.label, g.more ? h('small', null, ` +${g.more}`) : null),
    h('ul', { class: 'wk29-rlist' }, g.items.map((x) => h('li', null, h('button', { type: 'button', class: 'wk29-hit', onclick: () => go(x.id) }, thumb(x.id), h('span', null, h('b', null, x.label), x.sub ? h('small', null, ` ${x.sub}`) : null)))))))));
}

// ---------------------------------------------------------------- página inicial (quadros com ícones)

const SEC_ART: Record<string, string> = { persons: 'star', acts: 'guitar', labels: 'building', prods: 'mixer', mgrs: 'briefcase', execs: 'tie', critics: 'quill', cities: 'skyline', countries: 'flag', genres: 'note', movements: 'fans', eras: 'hourglass', techs: 'headphones', venues: 'stage', outlets: 'radio', orgs: 'mask', relics: 'diamond', gear: 'guitar', merch: 'shirt', vehicles: 'tour-bus' };

function tileEl(id: string, label: string, sub: string | null, icon: Node): HTMLElement {
  return h('a', { href: pageHash(id), class: 'wk29-tile' }, h('span', { class: 'wk29-tic', 'aria-hidden': 'true' }, icon), h('span', { class: 'wk29-tl' }, h('b', null, label), sub ? h('small', null, sub) : null));
}
function portal(title: string, icon: string, kids: (Node | null)[], cls = ''): HTMLElement {
  return h('section', { class: `wk29-portal ${cls}` }, h('h2', null, h('span', { class: 'wk29-pic', 'aria-hidden': 'true' }, ic(icon, 1)), title), h('div', { class: 'wk29-pbody' }, ...kids));
}

function homeEl(): HTMLElement {
  const c = ctx();
  const n = (li: string) => listIds29(c, li).length;
  const total = Object.values(SEC_LISTS29).flat().filter((x, i, xs) => xs.indexOf(x) === i).reduce((a, li) => a + n(li), 0);
  const lists = (sec: keyof typeof SEC_LISTS29) => h('div', { class: 'wk29-tiles' }, SEC_LISTS29[sec].map((li) => tileEl(`idx:${li}`, listLabel29(li), `${n(li).toLocaleString()} ${T('artigos', 'articles')}`, ic(SEC_ART[li] ?? 'book', 2))));
  const feat = featured();
  return h('article', { class: 'wk29-home' },
    h('section', { class: 'wk29-welcome' },
      h('div', { class: 'wk29-wdisc', 'aria-hidden': 'true' }),
      h('div', null, h('h1', null, T('Bem-vindo à Wiki do Masters!', 'Welcome to the Masters Wiki!')),
        h('p', null, T(`O guia completo do simulador de gestão musical — de 1889 ao futuro. ${total.toLocaleString()} artigos sobre personagens, mecânicas, mundo, objetos e regras, lidos direto do código do jogo.`, `The complete guide to the music management sim — from 1889 to the future. ${total.toLocaleString()} articles on characters, mechanics, world, objects and rules, read straight from the game's code.`)),
        h('p', { class: 'wk29-wnote' }, T('Esta wiki é um arquivo separado: não lê partidas nem saves.', 'This wiki is a separate file: it does not read runs or saves.')))),
    h('div', { class: 'wk29-cols' },
      h('div', { class: 'wk29-col' },
        portal(T('Primeiros passos', 'Getting started'), 'signpost', [h('div', { class: 'wk29-tiles' },
          ['start', 'money', 'contracts', 'music', 'live', 'connections'].map((m) => tileEl(`mech:${m}`, title29(c, `mech:${m}`), null, ic(MECH29.find((x) => x.id === m)?.icon ?? 'book', 2))))]),
        portal(T('Mecânicas', 'Mechanics'), 'chess', [h('div', { class: 'wk29-icons' }, MECH29.map((m) => h('a', { href: pageHash(`mech:${m.id}`), class: 'wk29-ibtn', title: title29(c, `mech:${m.id}`) }, ic(m.icon, 2), h('span', null, title29(c, `mech:${m.id}`)))))]),
        portal(T('Personagens', 'Characters'), 'people', [lists('pessoas')]),
        portal(T('Mundo', 'World'), 'globe', [lists('mundo')])),
      h('div', { class: 'wk29-col' },
        feat ? portal(T('Artista em destaque', 'Featured artist'), 'star', [feat], 'wk29-feat') : null,
        portal(T('Objetos', 'Objects'), 'diamond', [lists('objetos')]),
        portal(T('Linha do tempo', 'Timeline'), 'datebook', [h('div', { class: 'wk29-decs' }, decades29().map((d) => h('a', { href: pageHash(`time:${d}`), class: 'wk29-dec' }, d === 'antes' ? '<1880' : d === 'futuro' ? '2030+' : `${d}s`)))]),
        portal(T('Regras e dados', 'Rules and data'), 'scroll', [h('p', null, T(`${CATS29.length} catálogos com cada tabela do jogo: o que existe, quanto custa e desde quando.`, `${CATS29.length} catalogs with every game table: what exists, what it costs and since when.`)),
          h('div', { class: 'wk29-chips' }, CATS29.slice(0, 18).map((x) => h('a', { href: pageHash(`cat:${x.id}`), class: 'wk29-chip' }, t(x.title))), h('a', { href: pageHash('idx:dados'), class: 'wk29-chip more' }, T('ver todos →', 'see all →')))]),
        portal(T('Ajuda', 'Help'), 'bulb', [h('ul', { class: 'wk29-plist' },
          h('li', null, link('idx:glossario', T(`Glossário (${n('glossario')} verbetes)`, `Glossary (${n('glossario')} terms)`))),
          h('li', null, link('idx:faq', T(`Perguntas frequentes (${n('faq')})`, `FAQ (${n('faq')})`))),
          h('li', null, link('faq:wiki-separada', title29(c, 'faq:wiki-separada'))))]))));
}

/** Artista real em destaque do dia (determinístico pela data). */
function featured(): HTMLElement | null {
  const c = ctx();
  try {
    const ids = listIds29(c, 'acts');
    if (!ids.length) return null;
    const day = Math.floor(Date.now() / 86400000);
    for (let k = 0; k < 20; k++) {
      const id = ids[(day * 7919 + k * 104729) % ids.length];
      const p = page29(c, id);
      if (!p) continue;
      const ps = p.blocks.filter((b): b is Extract<Block29, { k: 'p' }> => b.k === 'p').map((b) => b.x.map((x) => (typeof x === 'string' ? x : x.text)).join(''));
      const txt = ps.find((x) => x.length >= 60 && !x.trim().endsWith(':')) ?? '';
      return h('div', { class: 'wk29-fbox' }, p.art ? h('a', { href: pageHash(id), class: 'wk29-fart' }, art(p.art, 96)) : null,
        h('div', null, h('h3', null, link(id, p.title)), h('p', { class: 'wk29-fkind' }, p.kind), txt ? h('p', null, txt.length > 260 ? `${txt.slice(0, 258)}…` : txt) : null, link(id, T('Ler o artigo →', 'Read the article →'))));
    }
  } catch { /* sem destaque */ }
  return null;
}

/** Página de seção (Personagens, Mundo, Objetos…): quadros com as listas. */
function sectionEl(p: Page29, sec: string): HTMLElement {
  const c = ctx();
  const ls = SEC_LISTS29[sec as keyof typeof SEC_LISTS29] ?? [];
  return h('article', { class: 'wk29-page' }, crumbsEl(p), h('h1', { class: 'wk29-title' }, p.title),
    h('div', { class: 'wk29-tiles big' }, ls.map((li) => tileEl(`idx:${li}`, listLabel29(li), `${listIds29(c, li).length.toLocaleString()} ${T('artigos', 'articles')}`, ic(SEC_ART[li] ?? 'book', 3)))),
    navboxes(p));
}

// ---------------------------------------------------------------- artigo

const crumbsEl = (p: Page29) => (p.crumbs.length ? h('nav', { class: 'wk29-crumbs', 'aria-label': T('Migalhas', 'Breadcrumbs') }, p.crumbs.flatMap((x, i) => [i ? h('span', { 'aria-hidden': 'true' }, ' › ') : null, link(x.id, x.label)])) : null);

function pageEl(p: Page29): HTMLElement {
  const blocks = [...p.blocks];
  // caixa de informações: a arte + a primeira tabela chave/valor do topo do artigo (como as infobox das wikis de jogos)
  const kvAt = p.art ? blocks.slice(0, 4).findIndex((b) => b.k === 'kv') : -1;
  const kv = kvAt >= 0 ? (blocks.splice(kvAt, 1)[0] as Extract<Block29, { k: 'kv' }>) : null;
  const iconOnly = p.art?.k === 'icon' && !kv;
  const info = p.art && !iconOnly ? h('aside', { class: 'wk29-info', 'aria-label': T('Caixa de informações', 'Infobox') },
    h('div', { class: 'wk29-ititle' }, p.title),
    h('div', { class: `wk29-iart wk29-art-${p.art.k}` }, art(p.art, 128)),
    p.kind ? h('div', { class: 'wk29-ikind' }, p.kind) : null,
    kv ? h('table', null, h('tbody', null, kv.rows.map(([k, v]) => h('tr', null, h('th', { scope: 'row' }, k), h('td', null, ...inl(v)))))) : null) : null;
  // índice (como o "Contents" das wikis): com 3+ seções
  const heads = blocks.filter((b) => b.k === 'h') as Extract<Block29, { k: 'h' }>[];
  let hi = 0;
  const toc = heads.length >= 3 ? h('nav', { class: 'wk29-toc', 'aria-label': T('Conteúdo', 'Contents') }, h('b', null, T('Conteúdo', 'Contents')),
    h('ol', null, heads.map((x, i) => h('li', null, h('a', { href: `#s29-${i}`, onclick: (e: Event) => { e.preventDefault(); document.getElementById(`s29-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, x.t))))) : null;
  return h('article', { class: 'wk29-page' }, crumbsEl(p),
    h('h1', { class: 'wk29-title' }, iconOnly && p.art ? h('span', { class: 'wk29-ticon', 'aria-hidden': 'true' }, art(p.art, 40)) : null, p.title), h('p', { class: 'wk29-from' }, p.kind ? `${p.kind} · ` : '', T('De Masters Wiki', 'From Masters Wiki')),
    h('div', { class: 'wk29-content' }, info, toc, ...blocks.map((b) => (b.k === 'h' ? h('h2', { class: 'wk29-h', id: `s29-${hi++}` }, b.t) : block(b)))),
    navboxes(p));
}

// ---------------------------------------------------------------- quadros de navegação (rodapé)

function navbox(title: string, rows: [string, [string, string][]][], open = true): HTMLElement {
  return h('details', { class: 'wk29-navbox', open: open ? '' : undefined }, h('summary', null, title),
    h('table', null, h('tbody', null, rows.map(([g, xs]) => h('tr', null, g ? h('th', { scope: 'row' }, g) : null, h('td', { colspan: g ? undefined : '2' }, ...xs.flatMap(([id, lb], i) => [i ? h('span', { class: 'wk29-dot', 'aria-hidden': 'true' }, ' · ') : null, link(id, lb)])))))));
}
function navboxes(p: Page29): HTMLElement {
  const c = ctx();
  const id = p.id, k = kindOf29(id), sec = secOf29W(id);
  const out: HTMLElement[] = [];
  const tl = (x: string): [string, string] => [x, title29(c, x)];
  if (k === 'mech' || id === 'idx:mech') {
    const g1 = MECH29.slice(0, 8), g2 = MECH29.slice(8, 14), g3 = MECH29.slice(14);
    out.push(navbox(T('Mecânicas', 'Mechanics'), [[T('Negócio e música', 'Business and music'), g1.map((m) => tl(`mech:${m.id}`))], [T('Vida e mundo', 'Life and world'), g2.map((m) => tl(`mech:${m.id}`))], [T('Partida', 'Run'), g3.map((m) => tl(`mech:${m.id}`))]]));
  } else if (k === 'ci') {
    const [cid] = restOf29(id).split('~');
    const xs = catItems29(cid);
    if (xs.length <= 120) out.push(navbox(t(CATS29.find((x) => x.id === cid)?.title ?? l(cid, cid)), [['', xs.map((x) => [`ci:${cid}~${x.id}`, typeof x.title === 'string' ? x.title : t(x.title)] as [string, string])]]));
  } else if (k === 'time') {
    out.push(navbox(T('Linha do tempo', 'Timeline'), [['', decades29().map((d) => tl(`time:${d}`))]]));
  } else if (k === 'cat' || id === 'idx:dados') {
    const gs = [...new Set(CATS29.map((x) => x.group))];
    out.push(navbox(T('Regras e dados', 'Rules and data'), gs.map((g) => [g, CATS29.filter((x) => x.group === g).map((x) => [`cat:${x.id}`, t(x.title)] as [string, string])])));
  } else if (sec !== 'home' && sec in SEC_LISTS29) {
    const ls = SEC_LISTS29[sec as keyof typeof SEC_LISTS29];
    out.push(navbox(t(SECS29W.find((x) => x.id === sec)!.label), [['', ls.map((li) => [`idx:${li}`, `${listLabel29(li)} (${listIds29(c, li).length.toLocaleString()})`] as [string, string])]]));
  }
  out.push(navbox('Masters Wiki', [['', SECS29W.map((x) => [x.id === 'home' ? 'home' : `idx:${x.id}`, t(x.label)] as [string, string])]], out.length === 0));
  return h('div', { class: 'wk29-navboxes' }, ...out);
}

const inl = (xs: Inline29[]): (Node | string)[] => xs.map((x) => (typeof x === 'string' ? x : link(x.link, x.text)));
function link(id: string, text: string): HTMLElement {
  return h('a', { href: pageHash(id), class: 'wk29-a' }, text);
}

function block(b: Block29): HTMLElement {
  switch (b.k) {
    case 'h': return h('h3', { class: 'wk29-h' }, b.t);
    case 'p': return h('p', null, ...inl(b.x));
    case 'ul': return h('ul', { class: 'wk29-ul' }, b.items.map((x) => h('li', null, ...inl(x))));
    case 'kv': return h('table', { class: 'wk29-wt wk29-kv' }, h('tbody', null, b.rows.map(([k, v]) => h('tr', null, h('th', { scope: 'row' }, k), h('td', null, ...inl(v))))));
    case 'live': return h('section', { class: 'wk29-live', 'aria-label': T('Na sua partida', 'In your run') }, h('h3', null, '● ', T('Na sua partida', 'In your run')),
      h('dl', { class: 'wk29-kv' }, b.rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, ...inl(v))])));
    case 'note': return h('div', { class: `wk29-note hue-${b.hue}`, role: 'note' }, h('b', null, b.t), h('p', null, ...inl(b.x)));
    case 'arts': return h('div', { class: 'wk29-arts' }, b.items.map((x) => h('figure', null, x.link ? h('a', { href: pageHash(x.link) }, art(x.art, 64)) : art(x.art, 64), h('figcaption', null, x.cap))));
    case 'list': return vlist(b.ids);
    case 'pages': return pagesEl(b.ids);
    case 'spoiler': return h('span'); // sem partida nada é futuro (a wiki não lê saves)
    case 'diagram': return diagram();
    case 'ref': {
      // ficha de referência: gera a partida de referência do ano só agora (≈0,5 s), sem travar o resto da página
      const box = h('div', { class: 'wk29-ref', 'aria-busy': 'true' }, h('p', { class: 'muted' }, '⏳ ', T(`Gerando a partida de referência de ${b.year}…`, `Generating the ${b.year} reference run…`)));
      setTimeout(() => {
        let bs: Block29[] = [];
        try { bs = b.who === 'person' ? refBlocks29(b.name, b.year) : refActBlocks29(b.name, b.year); } catch (e) { console.error('wiki29 ref', e); }
        box.replaceChildren(...bs.map(block));
        box.removeAttribute('aria-busy');
      }, 40);
      return box;
    }
    case 'events': return h('ol', { class: 'wk29-ev' }, b.items.map((e) => h('li', { class: `wk29-ev-${e.kind}` }, h('b', null, e.m ? `${e.y}/${String(e.m).padStart(2, '0')}` : String(e.y)), ' ', h('span', { class: 'wk29-evk' }, e.kind), ' ', e.text,
      ...e.links.map((x) => [' ', link(x, '→')]).flat())));
    default: return h('span');
  }
}

/** Páginas do jogo que controlam o sistema (a wiki é separada do jogo: só o nome e o caminho, sem abrir). */
function pagesEl(ids: string[]): HTMLElement {
  return h('ul', { class: 'wk29-pages' }, ids.map((a) => h('li', { class: 'chip27' }, gamePage29(a))));
}
/** Nome de uma página do jogo pelo catálogo único (a tela canônica que a usa) — sem precisar do jogo carregado. */
function gamePage29(area: string): string {
  const sc = SCREENS29.find((x) => x.home.area === area) ?? SCREENS29.find((x) => x.areas.includes(area));
  const grp = sc ? SECTIONS25.find((x) => x.id === sc.group) : undefined;
  return sc ? `${grp ? `${t(grp.label)} › ` : ''}${t(sc.label)}` : area;
}

// ---------------------------------------------------------------- lista virtualizada

const ROW = 44;
function vlist(ids: string[]): HTMLElement {
  const c = ctx();
  const filt = h('input', { type: 'search', class: 'wk29-lf', placeholder: T('Filtrar esta lista…', 'Filter this list…'), 'aria-label': T('Filtrar esta lista', 'Filter this list') }) as HTMLInputElement;
  const view = h('div', { class: 'wk29-vl', role: 'list' });
  const pad = h('div', { class: 'wk29-vpad' });
  view.append(pad);
  const count = h('p', { class: 'small muted' });
  let cur = ids;
  const titles = new Map<string, string>();
  const tl = (id: string) => { let x = titles.get(id); if (x === undefined) { x = title29(c, id); titles.set(id, x); } return x; };
  const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const paint = () => {
    const top = view.scrollTop, hgt = view.clientHeight || 520;
    const a = Math.max(0, Math.floor(top / ROW) - 6), z = Math.min(cur.length, Math.ceil((top + hgt) / ROW) + 6);
    pad.style.height = `${cur.length * ROW}px`;
    pad.replaceChildren(...cur.slice(a, z).map((id, i) => h('button', { type: 'button', role: 'listitem', class: 'wk29-row', style: `top:${(a + i) * ROW}px`, onclick: () => go(id) }, thumb(id), h('span', { class: 'wk29-rt' }, h('b', null, tl(id)), h('small', { class: 'muted' }, sub29(c, id))))));
  };
  filt.addEventListener('input', () => { const f = fold(filt.value.trim()); cur = f ? ids.filter((id) => fold(tl(id)).includes(f)) : ids; count.textContent = `${cur.length.toLocaleString()} / ${ids.length.toLocaleString()}`; view.scrollTop = 0; paint(); });
  view.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
  count.textContent = ids.length.toLocaleString();
  requestAnimationFrame(paint);
  setTimeout(paint, 0);
  return h('div', { class: 'wk29-list' }, ids.length > 12 ? filt : null, count, view);
}

// ---------------------------------------------------------------- arte (pixel art procedural que já existe)

function thumb(id: string): HTMLElement {
  const k = kindOf29(id), r = restOf29(id);
  const box = (x: Node) => h('span', { class: 'wk29-th', 'aria-hidden': 'true' }, x);
  try {
    if (k === 'city') return box(cityCrestImg29(r, 28));
    if (k === 'genre') return box(genreBadgeImg29(r, 28));
    if (k === 'country') return box(flagImg29(r, 28));
    if (k === 'mech') { const m = MECH29.find((x) => x.id === r); return box(ic(m?.icon ?? 'book', 1)); }
  } catch { /* sem arte */ }
  return box(ic(k === 'rp' || k === 'person' ? 'star' : k === 'ract' || k === 'act' ? 'guitar' : k === 'relic' ? 'diamond' : k === 'glossario' ? 'quill' : k === 'faq' ? 'bulb' : k === 'label' ? 'building' : 'book', 1));
}
const img = (src: string, size: number) => h('img', { class: 'px', src, width: size, height: size, alt: '' });

function art(a: Art29W, size: number): HTMLElement {
  try {
    switch (a.k) {
      case 'portrait': return img(portraitDataUrl({ id: a.id, look: a.look, born: a.born, role: a.role as never }, 96, a.year), size);
      case 'staff': return sz(staffPortraitImg29({ id: a.id, born: a.born }, staffRoleOf29(a.role), a.year, 96), size);
      case 'band': return sz(bandPhotoImg29(a.ids, a.year, a.seed, 160), size * 1.6);
      case 'logo': return img(logoUrl(a.seed, a.name, a.genre, a.year, 96), size);
      case 'crest': return sz(cityCrestImg29(a.city, 48), size);
      case 'skyline': return sz(skylineThumbImg29(a.city, a.year, 192), size * 2);
      case 'flag': return sz(flagImg29(a.a3, 48), size);
      case 'genre': return sz(genreBadgeImg29(a.id, 48), size);
      case 'movement': return sz(movementBadgeImg29(a.id, a.genre, a.year, 48), size);
      case 'relic': return sz(relicImg28(a.kind, a.name, a.year, a.seed, 64), size);
      case 'gear': return sz(gearImg29(a.id, a.name, 48), size);
      case 'merch': return sz(merchImg29(a.sku, a.seed, a.act, a.genre, a.year, 48), size);
      case 'vehicle': return sz(vehicleImg29(a.move, a.year, '', 96), size * 1.5);
      case 'emblem': return sz(emblemImg28({ id: a.id, kind: orgEmblemKind28(a.kind), a3: a.a3, name: a.name }, 48), size);
      case 'venue': return sz(venueArt29(a.id, a.name, a.cap, a.year, a.city, 48), size);
      case 'outlet': return outletArt29(a.id, a.name, a.kind, a.year, a.city);
      case 'award': return sz(awardSealImg29(a.id, a.name, a.year, 48), size);
      case 'icon': return h('span', { class: 'wk29-icon' }, ic(a.name, 3));
    }
  } catch { /* arte indisponível */ }
  return h('span', { class: 'wk29-icon' }, ic('book', 3));
}
function sz<E extends HTMLElement>(e: E, size: number): E {
  e.classList.add('px');
  e.style.width = `${Math.round(size)}px`; e.style.height = 'auto';
  return e;
}

// ---------------------------------------------------------------- mapa das ligações (medido pela sonda do jogo: connmap29)

/** Sistema do mapa medido → artigo da wiki. */
const SYS_MECH29: Record<string, string> = { dinheiro: 'money', reputacao: 'reputation', imprensa: 'press', projetos: 'music', aovivo: 'live', sede: 'hq', fama: 'fame', mundo: 'world', vida: 'life', contratos: 'contracts', premios: 'awards', submundo: 'underworld', publico: 'fame' };
const SYS_SHORT29: Record<string, [string, string]> = { dinheiro: ['Dinheiro', 'Money'], reputacao: ['Reputação', 'Reputation'], imprensa: ['Imprensa', 'Press'], projetos: ['Projetos', 'Projects'], aovivo: ['Ao vivo', 'Live'], sede: ['Sede', 'HQ'], fama: ['Fama', 'Fame'], mundo: ['Mundo', 'World'], vida: ['Vida', 'Life'], contratos: ['Contratos', 'Contracts'], premios: ['Prêmios', 'Awards'], submundo: ['Submundo', 'Underworld'], publico: ['Público', 'Audience'] };
const STR_L: Record<string, [string, string]> = { forte: ['forte (≥ 10%)', 'strong (≥ 10%)'], media: ['média (≥ 3%)', 'medium (≥ 3%)'], fraca: ['fraca (≥ 0,5%)', 'weak (≥ 0.5%)'] };

function diagram(): HTMLElement {
  const sn = (id: string) => { const x = SYS_SHORT29[id]; return x ? T(x[0], x[1]) : id; };
  const E = new Map(CONNMAP29.map((e) => [`${e.a}|${e.b}`, e]));
  const n = SYSTEMS29.length;
  const head = h('tr', null, h('th', { class: 'wk29-mx-c' }, T('de ↓ · para →', 'from ↓ · to →')), ...SYSTEMS29.map((x) => h('th', { scope: 'col', class: 'wk29-mx-col' }, h('span', null, sn(x.id)))));
  const rows = SYSTEMS29.map((r) => h('tr', null, h('th', { scope: 'row' }, link(`mech:${SYS_MECH29[r.id] ?? 'connections'}`, sn(r.id))), ...SYSTEMS29.map((col) => {
    if (r.id === col.id) return h('td', { class: 'wk29-mx-self' });
    const e = E.get(`${r.id}|${col.id}`);
    if (!e) return h('td', { class: 'wk29-mx-none', title: T('sem ligação medida', 'no measured link') }, '·');
    const tip = `${sn(r.id)} → ${sn(col.id)}: ${T(STR_L[e.str][0], STR_L[e.str][1])}, ${e.d >= 0 ? '↑' : '↓'} ${Math.round(Math.abs(e.d) * 1000) / 10}% (${e.via})`;
    return h('td', { class: `wk29-mx-${e.str}`, title: tip }, e.d >= 0 ? '↑' : '↓');
  })));
  const legend = h('ul', { class: 'wk29-lg' }, ...(['forte', 'media', 'fraca'] as const).map((k) => h('li', null, h('span', { class: `wk29-sw wk29-mx-${k}` }), T(STR_L[k][0], STR_L[k][1]))),
    h('li', null, h('span', { class: 'wk29-sw wk29-mx-none' }), T('sem ligação', 'no link')), h('li', null, T('↑ o empurrão na linha faz a coluna subir · ↓ faz cair', '↑ the push on the row makes the column rise · ↓ makes it fall')));
  const bySys = SYSTEMS29.map((x) => {
    const out = CONNMAP29.filter((e) => e.a === x.id);
    return h('details', { class: 'wk29-mxd' }, h('summary', null, `${getLang() === 'pt' ? x.name : sn(x.id)} — ${out.length} ${T('ligações', 'links')}`),
      h('table', { class: 'wk29-wt' }, h('thead', null, h('tr', null, h('th', null, T('Para', 'To')), h('th', null, T('Força', 'Strength')), h('th', null, T('Efeito', 'Effect')), h('th', null, T('Como (empurrão → saída)', 'How (push → output)')))),
        h('tbody', null, out.map((e) => h('tr', null, h('td', null, link(`mech:${SYS_MECH29[e.b] ?? 'connections'}`, sn(e.b))), h('td', null, h('span', { class: `wk29-sw wk29-mx-${e.str}` }), ' ', T(STR_L[e.str][0], STR_L[e.str][1])), h('td', null, `${e.d >= 0 ? '↑' : '↓'} ${Math.round(Math.abs(e.d) * 1000) / 10}%`), h('td', null, h('code', null, e.via)))))));
  });
  return h('div', { class: 'wk29-dgw' },
    h('p', null, T(`Medido pela sonda do jogo: cada sistema leva um "empurrão" (ficar pobre, ganhar fama, levar um escândalo…) e mede-se o efeito nos outros, na mesma semente. ${CONNMAP29.length} de ${n * (n - 1)} pares ligados. Passe o mouse numa célula para ver como.`, `Measured by the game's probe: each system gets a "push" (going broke, gaining fame, a scandal…) and the effect on the others is measured, same seed. ${CONNMAP29.length} of ${n * (n - 1)} pairs linked. Hover a cell to see how.`)),
    h('div', { class: 'wk29-mxw' }, h('table', { class: 'wk29-mx' }, h('thead', null, head), h('tbody', null, ...rows))), legend,
    h('h3', { class: 'wk29-h3' }, T('Ligações por sistema', 'Links by system')), ...bySys);
}
