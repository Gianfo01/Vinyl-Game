import { tryDownload } from '../store';
// Rodada 9 — área "Lendas": linha do tempo do mundo com filtros, biografias (personalidade, sonho,
// memórias, genealogia, influências), cidades e cenas, jornal e boatos, relíquias com leilão, o livro
// da partida e o mundo persistente. Também: aba "Alma" na página da pessoa, aba "Lendas" na página do
// ato e o cartão de mundo no Novo Jogo.

import { CITIES, l } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import { biography, chronQuery, chronState, definingFigures, genealogy, influences, nameOf, cityL, genreL, type ChronEv } from '../../sim/sys/chron9';
import { DREAM_TXT, FACETS, FACET_TXT, MEM_TXT, VALUES, VALUE_TXT, describeSoul, dreamOf, moodOf, soul, soulState } from '../../sim/sys/soul9';
import { RELIC_KIND, RELIC_ST, buyRelic, relicPrice, relics, sellRelic } from '../../sim/sys/relics9';
import { press, rumorText } from '../../sim/sys/press9';
import { bookText, exportWorld, type WorldFile } from '../../sim/sys/world9';
import type { GameState, Person, RunConfig } from '../../sim/types';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { openPerson } from '../ficha';
import { newgameCards } from '../newgame';
import { PERSON_TABS } from '../pages';
import { registerArea, registerPageTab } from '../registry';
import { setTab, tabs } from '../vis';
import './lendas9.css';

const WORLD_KEY = 'vtn.world9';
const F: { dec: number; city: string; genre: string; who: string; minI: number; bio: string; bioQ: string; city2: string } = { dec: 0, city: '', genre: '', who: '', minI: 2, bio: '', bioQ: '', city2: '' };

const stars = (i: number) => h('span', { class: 'muted', title: t(l('Importância', 'Importance')) }, '★'.repeat(i) + '☆'.repeat(5 - i));

function who(s: GameState, id: string): HTMLElement {
  if (s.acts[id]) return actLink(s, id);
  if (s.persons[id]) return h('button', { class: 'link', onclick: () => openPerson(id) }, s.persons[id].name);
  return h('button', { class: 'link muted', onclick: () => { F.bio = id; setTabTo('bio'); } }, nameOf(s, id));
}
function setTabTo(id: string): void {
  setTab('lendas9', id);
  rerender();
}

function evRow(s: GameState, e: ChronEv): HTMLElement {
  return h('li', { class: `ln-ev i${e.i}` },
    h('b', null, `${e.y}`), ' ', stars(e.i), ' ', t(e.t),
    e.a?.length ? h('span', { class: 'muted small' }, ' · ', ...e.a.slice(0, 3).flatMap((id, i) => [i ? ', ' : '', who(s, id)])) : null);
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
    .filter((e) => !q || e.a?.some((id) => ids.includes(id)) || t(e.t).toLowerCase().includes(q));
  const shown = list.slice(-300).reverse();
  const byYear: Record<number, ChronEv[]> = {};
  for (const e of shown) (byYear[e.y] ??= []).push(e);
  const old = Object.values(c.old).reduce((a, b) => a + b, 0);
  return h('div', { class: 'ln-tl' },
    h('div', { class: 'row wrap' },
      select(F.dec, decs, (v) => { F.dec = v; rerender(); }),
      select(F.city, [{ value: '', label: t(l('Todas as cidades', 'All cities')) }, ...cities.map((x) => ({ value: x, label: t(cityL(x)) }))], (v) => { F.city = v; rerender(); }),
      select(F.genre, [{ value: '', label: t(l('Todos os gêneros', 'All genres')) }, ...genres.map((x) => ({ value: x, label: t(genreL(x)) }))], (v) => { F.genre = v; rerender(); }),
      select(F.minI, [1, 2, 3, 4, 5].map((i) => ({ value: i, label: '★'.repeat(i) + '+' })), (v) => { F.minI = v; rerender(); }),
      h('input', { type: 'search', placeholder: t(l('Pessoa, banda ou palavra…', 'Person, act or word…')), value: F.who, onchange: (e: Event) => { F.who = (e.target as HTMLInputElement).value; rerender(); } })),
    h('p', { class: 'muted small' }, t(l('{n} fatos ({o} fatos menores antigos resumidos).', '{n} facts ({o} older minor facts summarized).'), { n: list.length, o: old })),
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
    section(t(l('Crônica', 'Chronicle')), h('ul', { class: 'attr-list' }, biography(s, id).slice(-60).reverse().map((e) => evRow(s, e)))));
}

function bios(s: GameState): HTMLElement {
  const c = chronState(s);
  const q = F.bioQ.trim().toLowerCase();
  const found = q ? Object.entries(c.names).filter(([, n]) => n.toLowerCase().includes(q)).slice(0, 30).map(([id]) => id) : definingFigures(s, 20).map((x) => x.id);
  const id = F.bio;
  const p = id ? s.persons[id] : undefined;
  const detail = !id ? h('p', { class: 'muted' }, t(l('Escolha alguém para ler a biografia.', 'Pick someone to read their biography.')))
    : p ? h('div', null, h('h3', null, p.name, p.alive ? '' : ` (${p.born}–${p.died ?? '?'})`), bandPath(s, id), soulBlock(s, p), section(t(l('Vida', 'Life')), h('ul', { class: 'attr-list' }, biography(s, id).slice(-60).reverse().map((e) => evRow(s, e)))))
    : h('div', null, h('h3', null, nameOf(s, id)), s.acts[id] ? null : bandPath(s, id), actLegend(s, id));
  return h('div', { class: 'grid2' },
    h('section', null,
      h('input', { type: 'search', placeholder: t(l('Buscar pessoa ou ato…', 'Search person or act…')), value: F.bioQ, onchange: (e: Event) => { F.bioQ = (e.target as HTMLInputElement).value; rerender(); } }),
      h('p', { class: 'muted small' }, q ? t(l('Resultados', 'Results')) : t(l('Quem definiu a época', 'Who defined the age'))),
      h('ul', { class: 'attr-list' }, found.map((x) => h('li', null, h('button', { class: `link ${x === id ? 'mine' : ''}`, onclick: () => { F.bio = x; rerender(); } }, nameOf(s, x)))))),
    h('section', null, detail));
}

// ---------------------------------------------------------------- cidades, jornal, relíquias, livro

function cities(s: GameState): HTMLElement {
  const c = chronState(s);
  const city = F.city2 || s.config.homeCity;
  const scenes = Object.entries(c.sc).filter(([k]) => k.startsWith(city + ':'));
  const ru = press(s).rum.filter((r) => r.cs.includes(city));
  return h('div', null,
    select(city, CITIES.map((x) => ({ value: x.id, label: t(x.name) })).sort((a, b) => a.label.localeCompare(b.label)), (v) => { F.city2 = v; rerender(); }),
    section(t(l('Cenas vivas', 'Living scenes')), scenes.length ? h('ul', { class: 'attr-list' }, scenes.map(([k, y]) => h('li', null, t(genreL(k.split(':')[1])), h('small', { class: 'muted' }, t(l(' — desde {y}', ' — since {y}'), { y }))))) : h('p', { class: 'muted' }, t(l('Nenhuma cena forte agora.', 'No strong scene right now.')))),
    section(t(l('O que se diz na cidade', 'What the town is saying')), ru.length ? h('ul', { class: 'attr-list' }, ru.slice(-12).reverse().map((r) => h('li', { class: r.tone > 0 ? 'good' : r.tone < 0 ? 'bad' : '' }, t(rumorText(r))))) : h('p', { class: 'muted' }, t(l('Silêncio.', 'Silence.')))),
    section(t(l('História da cidade', 'City history')), h('ul', { class: 'attr-list' }, chronQuery(s, { city, minI: 2 }).slice(-80).reverse().map((e) => evRow(s, e)))));
}

function paper(s: GameState): HTMLElement {
  const p = press(s);
  const MN = getLang() === 'pt' ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return h('div', null,
    section(t(l('Jornal do mundo', 'World newspaper')), h('ul', { class: 'attr-list ln-paper' }, p.hl.slice().reverse().slice(0, 30).map((x) => h('li', null, h('small', { class: 'muted' }, `${MN[x.m]} ${x.y} `), x.i >= 4 ? h('b', null, t(x.t)) : t(x.t))))),
    section(t(l('Boatos correndo', 'Rumors going around')), h('ul', { class: 'attr-list' }, p.rum.slice().reverse().slice(0, 20).map((r) => h('li', { class: r.tone > 0 ? 'good' : r.tone < 0 ? 'bad' : '' }, t(rumorText(r)),
      h('small', { class: 'muted' }, t(l(' — de {c}, já em {n} cidades{d}', ' — from {c}, now in {n} cities{d}'), { c: cityL(r.c0), n: r.cs.length, d: r.d ? l(' (distorcido)', ' (distorted)') : '' })))))));
}

function relicsTab(s: GameState): HTMLElement {
  const list = relics(s).list.slice().sort((a, b) => (a.st === 'auction' ? -1 : 0) - (b.st === 'auction' ? -1 : 0));
  if (!list.length) return h('p', { class: 'muted' }, t(l('Ainda não há objetos lendários. Eles nascem com lendas, números 1, prêmios, surtos criativos e mortes.', 'No legendary objects yet. They are born from legends, number ones, awards, creative fits and deaths.')));
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, ...[l('Objeto', 'Object'), l('Tipo', 'Kind'), l('Situação', 'Status'), l('História', 'History'), l('Valor', 'Value'), l('', '')].map((x) => h('th', null, t(x))))),
    h('tbody', null, list.map((rl) => h('tr', null,
      h('td', null, t(rl.n), rl.a ? h('small', null, ' · ', who(s, rl.a)) : null), h('td', null, t(RELIC_KIND[rl.k])), h('td', null, pill(t(RELIC_ST[rl.st]), rl.st === 'auction' ? 'gold' : rl.st === 'lost' || rl.st === 'stolen' ? 'bad' : '')),
      h('td', { class: 'small' }, rl.own.map((o) => `${o[0]} (${o[1]}, ${o[2]})`).join(' → ')),
      h('td', null, $(relicPrice(s, rl))),
      h('td', null, rl.st === 'auction' ? h('button', { class: 'btn small', onclick: () => { const e = buyRelic(s, rl.id); toast(e ? t(e) : t(l('Arrematado!', 'Won!')), e ? 'bad' : 'good'); rerender(); } }, t(l('Dar lance', 'Bid'))) : rl.st === 'player' ? h('button', { class: 'btn small ghost', onclick: () => { const e = sellRelic(s, rl.id); if (e) toast(t(e), 'bad'); rerender(); } }, t(l('Vender', 'Sell'))) : null)))));
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
  return h('div', { class: 'panel lendas' },
    h('h2', null, t(l('Lendas — a crônica do mundo', 'Legends — the world chronicle'))),
    tabs('lendas9', [
      { id: 'tl', label: t(l('Linha do tempo', 'Timeline')), icon: 'clock', render: () => timeline(s) },
      { id: 'bio', label: t(l('Biografias', 'Biographies')), icon: 'pen', render: () => bios(s) },
      { id: 'city', label: t(l('Cidades e cenas', 'Cities and scenes')), icon: 'globe', render: () => cities(s) },
      { id: 'press', label: t(l('Jornal', 'Newspaper')), icon: 'newspaper', render: () => paper(s) },
      { id: 'relics', label: t(l('Relíquias', 'Relics')), icon: 'vault', badge: relics(s).list.filter((x) => x.st === 'auction').length || undefined, render: () => relicsTab(s) },
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
