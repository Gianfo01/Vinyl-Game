// Rodada 17 (J) — MAPA: clicar num país, cidade ou casa abre um POPUP com tudo o que se sabe dali (em vez da
// ficha embaixo do mapa): população/mercado, gasto com música, relevância musical (gostos, cenas, movimentos),
// artistas da cidade (visibilidade pelo fame15 canSee), sua fama regional (fame16), casas (venues17), festivais,
// veículos de imprensa (outlets17) com sua relação, crime (organizações, calor, polícia), leis e aceitação
// (sex17, censura), tendências (trends17), relíquias e exposições (relics17), notícias e boatos dali e cenas
// suas vividas ali. Nada do futuro: tudo é filtrado pelo ano corrente. Também: camadas extras do mapa (turnê
// marcada, choques de agenda, calor do crime, suas cenas).

import { CITIES, FAMILIES, MARKETS, cityById, l, type L } from '../../data/world';
import { countryInfoByA3, countryMarketSize, countryPop, countryTaste } from '../../data/countries';
import { countryName, countryOfCity } from '../../data/geo';
import { musicSpend17 } from '../../data/relevance17';
import { KIND_NAME } from '../../data/orgs17';
import { t } from '../../i18n/strings';
import { recentFacts } from '../../sim/facts17';
import { activeCensorship } from '../../sim/media';
import { EXPOS17, RELICS17, relic9Of17, whereNow17 } from '../../sim/relics17';
import { KIND17, LINE17 } from '../../sim/outlets17';
import { cal17, clashOf, playerShows } from '../../sim/sys/clash17';
import { agency, heatIn, orgs17 } from '../../sim/sys/crime17';
import { FTIERS, canSee, fameTier } from '../../sim/sys/fame15';
import { fameIn } from '../../sim/sys/fame16';
import { outlets17, relOf } from '../../sim/sys/media17';
import { rumorsIn, rumorText } from '../../sim/sys/press9';
import { s17 } from '../../sim/sys/scene17';
import { acceptAtCity, climate17, criminalized, marriageLegal } from '../../sim/sys/sex17';
import { hotList17 } from '../../sim/sys/trends17';
import { VENUES17, sceneFam, venueOpen, venuePrice, type VDef } from '../../sim/sys/venues17';
import type { Act, GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, N, actLink, cityName, genreName, pill, rerender } from '../common';
import { h } from '../dom';
import type { MapOverlay } from '../map';
import { openScene } from '../registry';
import { ic } from '../vis';
import './mapinfo17.css';

const T = (x: L) => t(x);
const blk = (icon: string, title: L, ...body: (HTMLElement | null | false | string)[]): HTMLElement | null => {
  const b = body.filter((x): x is HTMLElement | string => !!x);
  return b.length ? h('details', { class: 'mi17-blk', open: true }, h('summary', null, ic(icon), ' ', T(title)), ...b) : null;
};
const li = (...xs: (HTMLElement | string | null)[]) => h('li', null, ...xs);
const pct = (v: number) => `${Math.round(v * 100)}%`;

type Scope = { kind: 'city'; id: string; cities: string[]; a3: string } | { kind: 'country'; id: string; cities: string[]; a3: string };
const scopeOf = (kind: 'city' | 'country', id: string): Scope => {
  if (kind === 'city') return { kind, id, cities: [id], a3: countryOfCity(id) ?? 'USA' };
  return { kind, id, cities: CITIES.filter((c) => countryOfCity(c.id) === id).map((c) => c.id), a3: id };
};

function basics(s: GameState, sc: Scope): HTMLElement | null {
  const ci = countryInfoByA3[sc.a3];
  const notes = (ci?.notes ?? []).filter((n) => n[0] <= s.year).slice(-2);
  const mk = cityById[sc.cities[0]]?.market;
  const mkt = MARKETS.find((m) => m.id === (ci?.market ?? mk));
  return blk('globe', l('País e mercado', 'Country and market'),
    h('div', { class: 'chips' },
      pill(`${T(countryName(sc.a3))}${mkt ? ` · ${T(mkt.name)}` : ''}`),
      ci ? pill(`${T(l('População', 'Population'))} ${N(Math.round(countryPop(ci, s.year) * 1e6))}`) : null,
      ci ? pill(`${T(l('Mercado de música', 'Music market'))} ${countryMarketSize(ci, s.year).toFixed(1)} M`) : null,
      pill(`${T(l('Gasto per capita (índice)', 'Per-capita spend (index)'))} ${musicSpend17(sc.a3, s.year).toFixed(2)}`),
      ci?.chart ? pill(`${T(l('Parada', 'Chart'))}: ${ci.chart[0]}`) : null,
      ci?.award && ci.award[2] <= s.year ? pill(`${T(l('Prêmio', 'Award'))}: ${ci.award[0]}`) : null,
      s.player.territories.includes((ci?.market ?? mk)!) ? pill(T(l('você distribui aqui', 'you distribute here')), 'good') : pill(T(l('sem distribuição', 'no distribution')), 'warn')),
    notes.length ? h('ul', { class: 'small' }, notes.map((n) => li(`${n[0]} — `, t(l(n[1], n[2]))))) : null);
}

function relevance(s: GameState, sc: Scope): HTMLElement | null {
  const ci = countryInfoByA3[sc.a3];
  const taste = ci ? FAMILIES.map((f) => [f, countryTaste(ci, f.id, s.year)] as const).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];
  const scenes = Object.entries(s.scenes).filter(([k, v]) => v > 0.5 && sc.cities.some((c) => k.startsWith(c + ':'))).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const mov = s.movements.filter((m) => sc.cities.includes(m.city) && m.born <= s.year).slice(-3);
  const home = sc.cities.flatMap((c) => cityById[c]?.scenes ?? []).filter((g, i, xs) => xs.indexOf(g) === i).slice(0, 6);
  return blk('note', l('Relevância musical', 'Musical relevance'),
    taste.length ? h('p', { class: 'small' }, T(l('Gosto do país: ', 'Country taste: ')), taste.map(([f, v]) => `${T(f.name)} ${v.toFixed(2)}`).join(' · ')) : null,
    home.length ? h('p', { class: 'small' }, T(l('Gêneros nativos: ', 'Native genres: ')), home.map((g) => genreName(g)).join(', ')) : null,
    scenes.length ? h('p', { class: 'small' }, T(l('Cenas ativas: ', 'Active scenes: ')), scenes.map(([k, v]) => `${genreName(k.split(':')[1])} (${v.toFixed(1)})`).join(' · ')) : h('p', { class: 'small muted' }, T(l('Nenhuma cena forte agora.', 'No strong scene right now.'))),
    mov.length ? h('p', { class: 'small' }, T(l('Movimentos: ', 'Movements: ')), mov.map((m) => `${T(m.name)} (${m.born})`).join(' · ')) : null);
}

/** Atos da região: nomes públicos; fama só se o jogador pode ver (fame15). Nada formado no futuro. */
function topActs(s: GameState, sc: Scope): HTMLElement | null {
  const set = new Set(sc.cities);
  const acts = Object.values(s.acts).filter((a) => set.has(a.city) && a.status !== 'retired' && a.formed <= s.year && a.members.length).sort((a, b) => b.fame - a.fame).slice(0, 8);
  return blk('fame', l('Artistas da região', 'Acts from here'),
    acts.length ? h('ul', { class: 'small mi17-cols' }, acts.map((a) => li(actLink(s, a.id), ' ', canSee(s, a.id, 'fame') ? pill(T(FTIERS[fameTier(a.fame)].name)) : h('small', { class: 'muted', title: T(l('Descubra com olheiros / relacionamento', 'Find out with scouts / relationships')) }, '?'), ' ', h('small', { class: 'muted' }, genreName(a.genre))))) : h('p', { class: 'small muted' }, T(l('Nenhum artista ativo conhecido daqui.', 'No known active acts from here.'))));
}

function myFame(s: GameState, sc: Scope): HTMLElement | null {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired');
  if (!mine.length) return null;
  const rows = mine.map((a) => [a, fameIn(s, a, sc.a3)] as const).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return blk('star', l('Sua fama aqui', 'Your fame here'),
    h('ul', { class: 'small' }, rows.map(([a, v]) => li(actLink(s, a.id), ` — ${Math.round(v)} · `, T(FTIERS[fameTier(v)].name), a.fame > 0 ? h('small', { class: 'muted' }, ` (${T(l('mundo', 'world'))} ${Math.round(a.fame)})`) : null))));
}

function venues(s: GameState, sc: Scope): HTMLElement | null {
  const vs = VENUES17.filter((v) => sc.cities.includes(v.city) && venueOpen(s, v));
  const clubs = s.clubs.filter((c) => sc.cities.includes(c.city) && !c.closed).slice(0, 4);
  return blk('house', l('Casas de show', 'Venues'),
    vs.length ? h('ul', { class: 'small' }, vs.map((v) => li(h('button', { class: 'link', onclick: () => openVenue17(s, v.id) }, v.name), ` · ${N(v.cap)} ${T(l('lugares', 'seats'))} · ${T(l('prestígio', 'prestige'))} ${v.prestige}`))) : null,
    clubs.length ? h('ul', { class: 'small' }, clubs.map((c) => li(c.name, ` · ${genreName(c.genre)} · ${N(c.capacity)}`, c.owner === 'player' ? pill(T(l('seu', 'yours')), 'good') : null))) : null,
    !vs.length && !clubs.length ? h('p', { class: 'small muted' }, T(l('Sem casas famosas registradas agora.', 'No famous venues on record right now.'))) : null);
}

function press(s: GameState, sc: Scope): HTMLElement | null {
  const mk = cityById[sc.cities[0]]?.market ?? countryInfoByA3[sc.a3]?.market;
  const os = outlets17(s).filter((o) => o.market === mk).sort((a, b) => b.reach - a.reach).slice(0, 6);
  const glob = outlets17(s).filter((o) => o.market === 'global').sort((a, b) => b.reach - a.reach).slice(0, 2);
  return blk('newspaper', l('Imprensa local', 'Local press'),
    os.length || glob.length ? h('ul', { class: 'small' }, [...os, ...glob].map((o) => li(h('b', null, o.real ? `${o.name} (≈ ${o.real})` : o.name), ` · ${T(KIND17[o.kind])} · ${T(LINE17[o.line][0])} · ${T(l('alcance', 'reach'))} ${o.reach} · ${T(l('credibilidade', 'credibility'))} ${Math.round(o.cred)}`,
      relOf(s, o.id) ? pill(`${T(l('relação', 'relation'))} ${relOf(s, o.id) > 0 ? '+' : ''}${Math.round(relOf(s, o.id))}`, relOf(s, o.id) > 0 ? 'good' : 'bad') : null, o.market === 'global' ? pill(T(l('global', 'global'))) : null))) : null);
}

function crime(s: GameState, sc: Scope): HTMLElement | null {
  const os = orgs17(s).filter((o) => (sc.kind === 'city' ? o.city === sc.id : o.a3 === sc.a3));
  const heat = heatIn(s, sc.a3);
  return blk('skull', l('Crime e polícia', 'Crime and police'),
    h('div', { class: 'chips' }, pill(`${T(l('Calor policial', 'Police heat'))} ${heat}`, heat >= 50 ? 'bad' : heat >= 20 ? 'warn' : ''), pill(`${T(l('Polícia', 'Police'))}: ${T(agency(s, sc.a3))}`)),
    os.length ? h('ul', { class: 'small' }, os.map((o) => li(h('b', null, T(o.name)), ` · ${T(KIND_NAME[o.kind])} · ${T(l('poder', 'power'))} ${o.power}`, o.real ? pill(T(l('real', 'real'))) : null))) : h('p', { class: 'small muted' }, T(l('Nenhuma organização conhecida atuando aqui.', 'No known organization operating here.'))));
}

function laws(s: GameState, sc: Scope): HTMLElement | null {
  const mk = cityById[sc.cities[0]]?.market ?? countryInfoByA3[sc.a3]?.market;
  const cens = activeCensorship(s).filter((c) => c.markets.includes(mk!));
  const acc = sc.kind === 'city' ? acceptAtCity(s, sc.id) : null;
  return blk('gavel', l('Leis, censura e aceitação', 'Laws, censorship and acceptance'),
    h('p', { class: 'small' }, T(climate17(sc.a3, s.year, sc.kind === 'city' ? sc.id : undefined))),
    h('div', { class: 'chips' },
      acc !== null ? pill(`${T(l('Aceitação LGBT na cidade', 'LGBT acceptance in town'))} ${pct(acc)}`, acc < 0.3 ? 'bad' : acc > 0.6 ? 'good' : 'warn') : null,
      criminalized(sc.a3, s.year) ? pill(T(l('relação gay é crime', 'same-sex relations criminalized')), 'bad') : null,
      marriageLegal(sc.a3, s.year) ? pill(T(l('casamento igualitário', 'marriage equality')), 'good') : null),
    cens.length ? h('ul', { class: 'small' }, cens.map((c) => li(ic('lock'), ' ', h('b', null, T(c.name)), ` (${T(l('desde', 'since'))} ${c.from}) · ${T(l('risco de veto', 'ban risk'))} ${pct(c.level)}`))) : h('p', { class: 'small muted' }, T(l('Sem censura ativa.', 'No active censorship.'))));
}

function trends(s: GameState, sc: Scope): HTMLElement | null {
  const ci = countryInfoByA3[sc.a3];
  const hot = hotList17(s, 6);
  const local = ci ? hot.map((x) => ({ ...x, fit: countryTaste(ci, FAMILIES.find((f) => x.g.startsWith(f.id))?.id ?? FAMILIES[0].id, s.year) })) : hot.map((x) => ({ ...x, fit: 1 }));
  return blk('chart-up', l('Tendências', 'Trends'),
    hot.length ? h('ul', { class: 'small mi17-cols' }, local.map((x) => li(genreName(x.g), ` ${pct(x.share)} `, x.d > 0.005 ? pill('▲', 'good') : x.d < -0.005 ? pill('▼', 'bad') : null))) : h('p', { class: 'small muted' }, T(l('Paradas ainda sem tendência clara.', 'Charts show no clear trend yet.'))));
}

function relicsHere(s: GameState, sc: Scope): HTMLElement | null {
  const names = sc.cities.flatMap((c) => [cityById[c]?.name.pt, cityById[c]?.name.en]).filter((x): x is string => !!x);
  const rel = RELICS17.map((d) => [d, relic9Of17(s, d.id)] as const).filter(([, r]) => !!r).map(([d, r]) => ({ d, w: whereNow17(s, d, r!) })).filter((x) => names.some((n) => x.w.pt.includes(n) || x.w.en.includes(n)));
  const ex = EXPOS17.filter((e) => sc.cities.includes(e[1]) && e[2] <= s.year && (!e[3] || s.year <= e[3]));
  return blk('vault', l('Relíquias e museus', 'Relics and museums'),
    rel.length ? h('ul', { class: 'small' }, rel.map((x) => li(h('b', null, T(x.d.name)), ' — ', T(x.w)))) : null,
    ex.length ? h('ul', { class: 'small' }, ex.map((e) => li(ic('building'), ` ${e[0]} (${e[2]}${e[3] ? `–${e[3]}` : ''})`))) : null);
}

function news(s: GameState, sc: Scope): HTMLElement | null {
  const set = new Set(sc.cities);
  const fs = recentFacts(s, { notSecret: true, months: 24, limit: 300 }).filter((f) => f.place && set.has(f.place) && f.severity >= 25).slice(-6).reverse();
  const rs = sc.cities.flatMap((c) => rumorsIn(s, c)).slice(0, 4);
  const mine = s17(s).book.filter((b) => b.city && set.has(b.city)).slice(-4).reverse();
  return blk('newspaper', l('Notícias, boatos e suas cenas', 'News, rumors and your scenes'),
    fs.length ? h('ul', { class: 'small' }, fs.map((f) => li(h('small', { class: 'muted' }, `${f.y} · `), T(f.text), f.visibility === 'rumor' ? pill(T(l('boato', 'rumor')), 'warn') : null))) : null,
    rs.length ? h('ul', { class: 'small' }, rs.map((r) => li(ic('fire'), ' ', T(rumorText(r))))) : null,
    mine.length ? h('ul', { class: 'small' }, mine.map((b) => li(ic('camera'), ` ${b.y} · `, T(b.title), ' — ', T(b.out)))) : null,
    !fs.length && !rs.length && !mine.length ? h('p', { class: 'small muted' }, T(l('Nada de notável por aqui ultimamente.', 'Nothing notable here lately.'))) : null);
}

/** Corpo completo do popup (puro DOM; testável). */
export function mapInfo17(s: GameState, kind: 'city' | 'country', id: string): HTMLElement {
  const sc = scopeOf(kind, id);
  return h('div', { class: 'mi17' },
    kind === 'country' && sc.cities.length ? h('p', { class: 'small' }, T(l('Cidades: ', 'Cities: ')), ...sc.cities.map((c) => h('button', { class: 'link mi17-city', onclick: () => openMapInfo17(s, 'city', c) }, `${cityName(c)} `))) : null,
    basics(s, sc), myFame(s, sc), relevance(s, sc), topActs(s, sc), venues(s, sc), press(s, sc), laws(s, sc), crime(s, sc), trends(s, sc), relicsHere(s, sc), news(s, sc));
}

/** Abre o popup do mapa; `base` = ficha antiga (ações: filial, clubes…) mostrada no topo. */
export function openMapInfo17(s: GameState, kind: 'city' | 'country', id: string, base?: () => HTMLElement | null): void {
  document.querySelectorAll('.mi17-pop').forEach((x) => x.closest('.overlay, .scene-overlay')?.remove());
  const title = kind === 'city' ? `${cityName(id)} · ${T(countryName(countryOfCity(id)))}` : T(countryName(id));
  openScene(title, (close) => h('div', { class: 'mi17-pop' }, base?.() ?? null, mapInfo17(s, kind, id), h('div', { class: 'row scene-close' }, h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close'))))), { wide: true, onClose: rerender });
}

export function openVenue17(s: GameState, id: string): void {
  const v = VENUES17.find((x) => x.id === id) as VDef | undefined;
  if (!v || !venueOpen(s, v)) return;
  const owned = s.x4 && (s.x4 as unknown as { venues17?: { own: { id: string }[] } }).venues17?.own.some((o) => o.id === id);
  openScene(v.name, (close) => h('div', { class: 'mi17' },
    h('div', { class: 'chips' }, pill(cityName(v.city)), pill(`${N(v.cap)} ${T(l('lugares', 'seats'))}`), pill(`${T(l('prestígio', 'prestige'))} ${v.prestige}`), pill(`${T(l('desde', 'since'))} ${v.from}`), pill(genreName(v.fam)), owned ? pill(T(l('sua casa', 'your venue')), 'good') : null),
    v.note ? h('p', { class: 'small' }, T(v.note)) : null,
    h('p', { class: 'small' }, T(l('Cena do gênero na cidade: ', 'Genre scene in town: ')), sceneFam(s, v.city, v.fam).toFixed(1), v.buyable === false ? '' : ` · ${T(l('preço estimado', 'estimated price'))} ${$(venuePrice(s, v))}`),
    h('p', { class: 'small muted' }, T(l('Compra e programação ficam em Negócios 17 → Casas.', 'Buying and programming live in Business 17 → Venues.'))),
    h('div', { class: 'row scene-close' }, h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close'))))));
}

// ---------------------------------------------------------------- camadas extras do mapa

type Ly17 = 'tour17' | 'clash17' | 'heat17' | 'scenes17';
const LY17: { id: Ly17; icon: string; name: L }[] = [
  { id: 'tour17', icon: 'tour-bus', name: l('Agenda marcada', 'Booked dates') },
  { id: 'clash17', icon: 'warning', name: l('Choques de agenda', 'Date clashes') },
  { id: 'heat17', icon: 'skull', name: l('Calor do crime', 'Crime heat') },
  { id: 'scenes17', icon: 'camera', name: l('Suas cenas', 'Your scenes') },
];
const on17 = new Set<Ly17>();
export function layerButtons17(): HTMLElement[] {
  return LY17.map((ly) => h('button', { type: 'button', class: `chip-btn ${on17.has(ly.id) ? 'on' : ''}`, 'aria-pressed': on17.has(ly.id) ? 'true' : 'false',
    onclick: () => { if (on17.has(ly.id)) on17.delete(ly.id); else on17.add(ly.id); rerender(); } }, ic(ly.icon), ' ', T(ly.name)));
}
export function overlays17(s: GameState): MapOverlay[] {
  const o: MapOverlay[] = [];
  if (on17.has('tour17') || on17.has('clash17')) {
    const shows = playerShows(s).filter((x) => x.w <= s.week + 26 && cityById[x.city]);
    if (on17.has('tour17')) {
      const by = new Map<string, string[]>();
      for (const x of shows) { const xs = by.get(x.actId) ?? []; if (xs[xs.length - 1] !== x.city) xs.push(x.city); by.set(x.actId, xs); }
      for (const xs of by.values()) for (let i = 1; i < xs.length; i++) o.push({ kind: 'arc', from: xs[i - 1], to: xs[i], color: 'var(--accent)', width: 1.4 });
      for (const x of shows) o.push({ kind: 'icon', city: x.city, icon: x.kind === 'festival' ? 'festival' : 'tour', slot: 2 });
    }
    if (on17.has('clash17')) {
      for (const x of shows) { const a = s.acts[x.actId]; if (a && clashOf(s, a, x.city, x.w).mult < 0.92) o.push({ kind: 'icon', city: x.city, icon: 'warn', slot: 3 }); }
      const rival = new Map<string, number>();
      for (const n of cal17(s).npc) if (n.w >= s.week && n.w <= s.week + 12) rival.set(n.c, (rival.get(n.c) ?? 0) + 1);
      const mx = Math.max(1, ...rival.values());
      for (const [c, v] of rival) if (cityById[c]) o.push({ kind: 'bubble', city: c, value: v / mx, color: 'var(--bad)' });
    }
  }
  if (on17.has('scenes17')) {
    const by = new Map<string, number>();
    for (const b of s17(s).book) if (b.city && cityById[b.city]) by.set(b.city, (by.get(b.city) ?? 0) + 1);
    const mx = Math.max(1, ...by.values());
    for (const [c, v] of by) o.push({ kind: 'bubble', city: c, value: 0.3 + 0.7 * (v / mx), color: '#a35bd8' });
  }
  return o;
}
/** Sombreamento por país para a camada de calor do crime. */
export function shade17(s: GameState, a3: string): { color: string; hatch?: boolean } | undefined {
  if (!on17.has('heat17')) return undefined;
  const v = heatIn(s, a3);
  return v >= 10 ? { color: `rgba(200,40,40,${Math.min(0.65, 0.15 + v / 150).toFixed(2)})`, hatch: v >= 60 } : undefined;
}
export function legend17(): HTMLElement[] {
  const k = (c: string, txt: L) => h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: `background-color:${c}` }), T(txt));
  return [
    on17.has('tour17') ? k('var(--accent)', l('Rota da agenda marcada (6 meses)', 'Booked route (6 months)')) : null,
    on17.has('clash17') ? k('var(--bad)', l('Bolha: shows rivais (12 sem.); ⚠ choque com o seu', 'Bubble: rival shows (12 wk); ⚠ clash with yours')) : null,
    on17.has('heat17') ? k('rgb(200,40,40)', l('País: calor policial', 'Country: police heat')) : null,
    on17.has('scenes17') ? k('#a35bd8', l('Bolha: cenas que você viveu ali', 'Bubble: scenes you lived there')) : null,
  ].filter((x): x is HTMLElement => !!x);
}
