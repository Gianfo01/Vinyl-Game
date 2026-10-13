// Rodada 29 (WIKI) — Mundo e Objetos: cidades (brasão, horizonte, bandeira), países, gêneros (selo e história),
// movimentos, eras e tecnologias (com datas), casas de shows, veículos de imprensa, organizações do submundo,
// relíquias, equipamento, merch e veículos de turnê. Tudo das tabelas que já existem (sem duplicar dados).
// Segredo: data de tecnologia/era de uma partida em história alternativa é agenda secreta do mundo — só aparece quando
// chega; data real futura só com "Revelar história real".

import { COUNTRY_INFO, countryInfoByA3, countryPop, type CountryInfo } from '../../data/countries';
import { COUNTRY_INFO19 } from '../../data/countries19';
import { MOVEMENTS } from '../../data/content';
import { countryName, countryOfCity } from '../../data/geo';
import { CITIES, FAMILIES, GENRES, cityById, genreById, l, marketById, type Genre } from '../../data/world';
import { GEAR19 } from '../../data/more19';
import { KIND_NAME, ORGS17, RACKET_NAME } from '../../data/orgs17';
import { OUTLETS17 } from '../../data/media17';
import { RELICS18 } from '../../data/relics18';
import { TECHS } from '../../data/rules';
import { RELICS17, type RelicDef17 } from '../../sim/relics17';
import { ERA_SHIFTS, eraById, eraYear, type EraId } from '../../sim/sys/eras8';
import { FLY_FROM18 } from '../../sim/sys/live18';
import { SKUS, type Sku } from '../../sim/sys/merch17';
import { relics } from '../../sim/sys/relics9';
import { VENUES17 } from '../../sim/sys/venues17';
import { histMode } from '../../sim/history15';
import { money } from '../../sim/util';
import { H, P, T, hidden29, join29, ln29, realCat29, span29, staticLabels29, tx, year29, type W29 } from './wiki29core';
import { crumbs29, futurePage29, hashName29, visible29 } from './wiki29people';
import type { Block29, Inline29, Page29 } from './wiki29types';

const usd = (c: number): string => `US$ ${Math.round(c / 100).toLocaleString('pt-BR')}`;

// ---------------------------------------------------------------- listas (com o filtro de futuro)

export const countries29 = (): CountryInfo[] => [...COUNTRY_INFO, ...COUNTRY_INFO19.filter((x) => !countryInfoByA3[x.a3])];
export const relics29 = (): RelicDef17[] => [...RELICS17, ...RELICS18.filter((d) => !RELICS17.some((x) => x.id === d.id))];
export const genreKids29 = (id: string): Genre[] => GENRES.filter((g) => g.parents.includes(id));
const famName = (f: string): string => tx(FAMILIES.find((x) => x.id === f)?.name ?? l(f));

/** Ano real (base) de uma era: a da tecnologia ou "N anos depois" de outra. */
export function eraBase29(id: EraId): number | undefined {
  const e = eraById[id];
  if (!e) return undefined;
  const tech = (k: string) => TECHS.find((x) => x.id === k)?.base;
  if (e.tech) return tech(e.tech);
  const xs = (e.after ?? []).map((a) => (tech(a.tech) ?? 9999) + a.plus);
  return xs.length ? Math.min(...xs) : 1920;
}

/** Data de uma tecnologia como o jogador pode saber agora: a da partida (se já chegou), senão a real (se revelada). */
function techWhen(c: W29, id: string): { y?: number; txt: string; hid: boolean } {
  const base = TECHS.find((x) => x.id === id)?.base;
  const s = c.s;
  if (!s) return { y: base, txt: base ? String(base) : '—', hid: false };
  const sy = s.techDates[id];
  if (sy !== undefined && sy <= s.year) return { y: sy, txt: String(sy), hid: false };
  if (c.reveal && base !== undefined) return { y: base, txt: `${T('ainda não chegou na partida · na história real:', 'not in the run yet · in real history:')} ${base}`, hid: false };
  return { txt: T('ainda não chegou na partida', 'not in the run yet'), hid: true };
}

// ---------------------------------------------------------------- cidade

export function pageCity29(c: W29, id: string): Page29 | null {
  const ct = cityById[id];
  if (!ct) return null;
  const a3 = countryOfCity(id) ?? ct.a3 ?? '';
  const y = Math.min(year29(c), 2026);
  const scenes = ct.scenes.map((g) => genreById[g]).filter(Boolean);
  const blocks: Block29[] = [{ k: 'arts', items: [
    { art: { k: 'crest', city: id }, cap: T('Brasão', 'Crest') },
    { art: { k: 'skyline', city: id, year: y }, cap: `${T('Horizonte em', 'Skyline in')} ${y}` },
    ...(a3 ? [{ art: { k: 'flag' as const, a3 }, cap: tx(countryName(a3)), link: `country:${a3}` }] : []),
  ] }, { k: 'kv', rows: [
    ...(a3 ? [[T('País', 'Country'), [ln29(`country:${a3}`, tx(countryName(a3)))]] as [string, Inline29[]]] : []),
    [T('Mercado', 'Market'), [tx(marketById[ct.market]?.name ?? l(ct.market))]],
    [T('Cenas', 'Scenes'), join29(scenes.map((g) => ln29(`genre:${g.id}`, tx(g.name))))],
  ] }];
  const venues = VENUES17.filter((v) => v.city === id && !hidden29(c, v.from));
  if (venues.length) blocks.push(H(T('Casas de shows', 'Venues')), { k: 'ul', items: venues.map((v) => [ln29(`venue:${v.id}`, v.name), ` — ${v.cap.toLocaleString()} ${T('lugares', 'seats')}`]) });
  const labs = c.s ? Object.values(c.s.labels).filter((x) => x.city === id && x.founded <= c.s!.year).map((x) => ln29(`label:${x.id}`, x.name))
    : staticLabels29().filter((x) => x.city === id).map((x) => ln29(`label:${x.id}`, x.real ?? x.name));
  if (labs.length) blocks.push(H(T('Gravadoras daqui', 'Labels based here')), P(...join29(labs)));
  const mv = MOVEMENTS.filter((m) => m.cities.includes(id) && !hidden29(c, m.from));
  if (mv.length) blocks.push(H(T('Movimentos', 'Movements')), P(...join29(mv.map((m) => ln29(`move:${m.id}`, movName29(m.id))))));
  if (c.s) {
    const s = c.s;
    const acts = visible29(s).acts.filter((a) => a.city === id && (a.status === 'active' || a.status === 'emerging'));
    blocks.unshift({ k: 'live', rows: [[T('Sua cidade-base?', 'Your home city?'), [s.config.homeCity === id ? T('sim', 'yes') : T('não', 'no')]], [T('Artistas na ativa daqui', 'Active acts from here'), [String(acts.length)]],
      ...(acts.length ? [[T('Mais famosos agora', 'Most famous now'), join29([...acts].sort((x, z) => z.fame - x.fame).slice(0, 6).map((a) => ln29(`act:${a.id}`, a.name)))] as [string, Inline29[]]] : [])] });
  } else {
    const arts = realCat29().arts.filter((a) => a.c === id).sort((x, z) => x.t - z.t || x.d - z.d).slice(0, 12);
    if (arts.length) blocks.push(H(T('Artistas reais daqui', 'Real artists from here')), P(...join29(arts.map((a) => ln29(`ract:${a.slug}`, a.n)))));
  }
  return { id: `city:${id}`, title: tx(ct.name), kind: T('cidade', 'city'), art: { k: 'crest', city: id }, crumbs: crumbs29('mundo', 'cities'), blocks };
}

// ---------------------------------------------------------------- país

export function pageCountry29(c: W29, a3: string): Page29 | null {
  const ci = countryInfoByA3[a3] ?? COUNTRY_INFO19.find((x) => x.a3 === a3);
  const cities = CITIES.filter((x) => (countryOfCity(x.id) ?? x.a3) === a3);
  if (!ci && !cities.length) return null;
  const real = c.s ? !!c.s.config.realNames : true;
  const blocks: Block29[] = [{ k: 'arts', items: [{ art: { k: 'flag', a3 }, cap: tx(countryName(a3)) }] }];
  const rows: [string, Inline29[]][] = [];
  if (ci) {
    rows.push([T('Mercado', 'Market'), [tx(marketById[ci.market]?.name ?? l(ci.market))]]);
    rows.push([T('Idiomas', 'Languages'), [ci.lang.join(', ')]]);
    rows.push([T('Parada nacional', 'National chart'), [real ? `${ci.chart[1]} (${T('no jogo', 'in game')}: ${ci.chart[0]})` : ci.chart[0]]]);
    if (ci.award && !hidden29(c, ci.award[2])) rows.push([T('Prêmio nacional', 'National award'), [`${real ? ci.award[1] : ci.award[0]} (${T('desde', 'since')} ${ci.award[2]})`]]);
    const py = Math.min(year29(c), 2040);
    rows.push([`${T('População em', 'Population in')} ${py}`, [`${(countryPop(ci, py)).toLocaleString()} mi`]]);
  }
  blocks.push({ k: 'kv', rows });
  if (cities.length) blocks.push(H(T('Cidades', 'Cities')), P(...join29(cities.map((x) => ln29(`city:${x.id}`, tx(x.name))))));
  let hid = 0;
  const notes: Inline29[][] = [];
  for (const [y, pt, en] of ci?.notes ?? []) { if (hidden29(c, y)) { hid++; continue; } notes.push([`${y} · ${tx(l(pt, en))}`]); }
  if (notes.length) blocks.push(H(T('Fatos por época', 'Facts by era')), { k: 'ul', items: notes });
  if (hid) blocks.push({ k: 'spoiler', n: hid });
  return { id: `country:${a3}`, title: tx(countryName(a3)), kind: T('país', 'country'), art: { k: 'flag', a3 }, crumbs: crumbs29('mundo', 'countries'), blocks };
}

// ---------------------------------------------------------------- gênero

export function pageGenre29(c: W29, id: string): Page29 | null {
  const g = genreById[id];
  if (!g) return null;
  if (hidden29(c, g.born)) return futurePage29(`genre:${id}`, tx(g.name), T('gênero', 'genre'));
  const kids = genreKids29(id).filter((k) => !hidden29(c, k.born));
  const cities = CITIES.filter((x) => x.scenes.includes(id));
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Família', 'Family'), [famName(g.family)]], [T('Surgiu em', 'Born in'), [String(g.born)]],
    [T('Vem de', 'Comes from'), g.parents.length ? join29(g.parents.map((p) => genreById[p]).filter(Boolean).map((p) => ln29(`genre:${p.id}`, tx(p.name)))) : [T('raiz', 'root genre')]],
    ...(kids.length ? [[T('Deu origem a', 'Gave rise to'), join29(kids.map((k) => ln29(`genre:${k.id}`, tx(k.name))))] as [string, Inline29[]]] : []),
    ...(cities.length ? [[T('Cenas', 'Scenes'), join29(cities.map((x) => ln29(`city:${x.id}`, tx(x.name))))] as [string, Inline29[]]] : []),
  ] }];
  const mv = MOVEMENTS.filter((m) => m.parents.includes(id) && !hidden29(c, m.from));
  if (mv.length) blocks.push(H(T('Movimentos', 'Movements')), P(...join29(mv.map((m) => ln29(`move:${m.id}`, movName29(m.id))))));
  blocks.push(P(T('A popularidade de cada gênero sobe e desce com as paradas, as eras e as cenas — veja ', 'Each genre\'s popularity rises and falls with the charts, eras and scenes — see '), ln29('mech:world', T('Mundo e eras', 'World and eras')), '.'));
  if (c.s) {
    const s = c.s;
    const acts = visible29(s).acts.filter((a) => a.genre === id && (a.status === 'active' || a.status === 'emerging')).sort((x, z) => z.fame - x.fame);
    blocks.unshift({ k: 'live', rows: [[T('Popularidade agora', 'Popularity now'), [`${Math.round((s.genrePop[id] ?? 0) * 100)}%`]], [T('Artistas na ativa', 'Active acts'), [String(acts.length)]],
      ...(acts.length ? [[T('Maiores agora', 'Biggest now'), join29(acts.slice(0, 6).map((a) => ln29(`act:${a.id}`, a.name)))] as [string, Inline29[]]] : [])] });
  } else {
    const arts = realCat29().arts.filter((a) => a.g === id).sort((x, z) => x.t - z.t || x.d - z.d).slice(0, 14);
    if (arts.length) blocks.push(H(T('Artistas reais', 'Real artists')), P(...join29(arts.map((a) => ln29(`ract:${a.slug}`, a.n)))));
  }
  return { id: `genre:${id}`, title: tx(g.name), kind: T('gênero', 'genre'), art: { k: 'genre', id }, crumbs: crumbs29('mundo', 'genres'), blocks };
}

// ---------------------------------------------------------------- movimento

export function movName29(id: string): string {
  const m = MOVEMENTS.find((x) => x.id === id);
  if (!m) return id;
  const pat = T(m.namePatterns.pt[0] ?? id, m.namePatterns.en[0] ?? id);
  return pat.replace('{city}', tx(cityById[m.cities[0]]?.name ?? l(''))).replace('{parent}', tx(genreById[m.parents[0]]?.name ?? l(''))).replace('{adj}', '').replace(/\s+/g, ' ').trim();
}

export function pageMove29(c: W29, id: string): Page29 | null {
  const m = MOVEMENTS.find((x) => x.id === id);
  if (!m) return null;
  if (hidden29(c, m.from)) return futurePage29(`move:${id}`, movName29(id), T('movimento', 'movement'));
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Época', 'Period'), [span29(m.from, hidden29(c, m.to) ? undefined : m.to)]],
    [T('Gêneros de origem', 'Parent genres'), join29(m.parents.map((p) => genreById[p]).filter(Boolean).map((p) => ln29(`genre:${p.id}`, tx(p.name))))],
    [T('Cidades', 'Cities'), join29(m.cities.filter((x) => cityById[x]).map((x) => ln29(`city:${x}`, tx(cityById[x].name))))],
    [T('Visual', 'Look'), [tx(m.look)]],
  ] }, P(tx(m.desc))];
  if (c.s) {
    // movimentos vivos da partida com a mesma origem e época (o mundo dá nome próprio a cada um)
    const live = c.s.movements.filter((x) => x.born <= c.s!.year && (m.parents.includes(x.parent) || m.parents.includes(x.genreId)) && x.born >= m.from - 5 && x.born <= m.to + 5);
    if (live.length) blocks.unshift({ k: 'live', rows: live.slice(0, 6).map((x) => [tx(x.name), [cityById[x.city] ? ln29(`city:${x.city}`, tx(cityById[x.city].name)) : x.city, ` · ${x.born} · ${T('força', 'strength')} ${Math.round(x.strength)}`]] as [string, Inline29[]]) });
  }
  blocks.push(P(T('Atos entram como fundadores, núcleo ou simpatizantes; o movimento nasce, vira moda, é reprimido ou dilui — veja ', 'Acts join as founders, core or sympathizers; the movement is born, goes mainstream, gets repressed or dilutes — see '), ln29('mech:world', T('Mundo', 'World')), '.'));
  return { id: `move:${id}`, title: movName29(id), kind: T('movimento', 'movement'), art: { k: 'movement', id, genre: m.parents[0] ?? 'rock', year: m.from }, crumbs: crumbs29('mundo', 'movements'), blocks };
}

// ---------------------------------------------------------------- era e tecnologia

export function pageEra29(c: W29, id: string): Page29 | null {
  const e = eraById[id as EraId];
  if (!e) return null;
  const base = eraBase29(e.id);
  const s = c.s;
  const sy = s ? eraYear(s, e.id) : undefined;
  const started = !s || (sy !== undefined && sy <= s.year);
  if (!started && !c.reveal) return futurePage29(`era:${id}`, tx(e.name), T('era', 'era'));
  const rows: [string, Inline29[]][] = [];
  if (s && started) rows.push([T('Começou na partida em', 'Began in the run in'), [String(sy)]]);
  if (base !== undefined && (!s || c.reveal || histMode(s) === 'strict' || started)) rows.push([T('Na história real', 'In real history'), [`≈ ${base}`]]);
  if (e.tech) rows.push([T('Tecnologia', 'Technology'), [ln29(`tech:${e.tech}`, tx(TECHS.find((x) => x.id === e.tech)?.name ?? l(e.tech)))]]);
  const blocks: Block29[] = [{ k: 'kv', rows }, H(T('O que dá dinheiro', 'What makes money')), P(tx(e.model))];
  if (e.question.pt) blocks.push(H(T('A pergunta da era', 'The era\'s question')), P(tx(e.question)));
  if (e.stances.length) blocks.push(H(T('Posturas possíveis', 'Possible stances')), { k: 'ul', items: e.stances.map((x) => [`${tx(x.name)} — ${tx(x.desc)}`]) });
  blocks.push(P(T('Cada virada de era muda formatos, custos e o que o público compra; você escolhe uma postura — veja ', 'Each era shift changes formats, costs and what the public buys; you choose a stance — see '), ln29('mech:world', T('Mundo e eras', 'World and eras')), '.'));
  return { id: `era:${id}`, title: tx(e.name), kind: T('era', 'era'), art: { k: 'icon', name: 'hourglass' }, crumbs: crumbs29('mundo', 'eras'), blocks };
}

export function pageTech29(c: W29, id: string): Page29 | null {
  const tdef = TECHS.find((x) => x.id === id);
  if (!tdef) return null;
  const w = techWhen(c, id);
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Chegada', 'Arrival'), [w.txt]],
    ...(tdef.deps.length ? [[T('Depende de', 'Depends on'), join29(tdef.deps.map((d) => ln29(`tech:${d}`, tx(TECHS.find((x) => x.id === d)?.name ?? l(d)))))] as [string, Inline29[]]] : []),
    [T('Variação nos modos Livre/Caos', 'Variation in Free/Chaos modes'), [tdef.spread ? `± ${tdef.spread} ${T('anos (Caos: o dobro)', 'years (Chaos: double)')}` : T('nenhuma', 'none')]],
  ] }];
  const eras = ERA_SHIFTS.filter((e) => e.tech === id);
  if (eras.length) blocks.push(P(T('Abre a era: ', 'Opens the era: '), ...join29(eras.map((e) => ln29(`era:${e.id}`, tx(e.name))))));
  if (w.hid) blocks.push({ k: 'note', hue: 'muted', t: T('Data secreta', 'Secret date'), x: [T('Em história alternativa a data desta tecnologia é sorteada na criação do mundo e fica escondida até chegar.', 'In alternate history this technology\'s date is rolled when the world is created and stays hidden until it arrives.')] }, { k: 'spoiler', n: 1 });
  return { id: `tech:${id}`, title: tx(tdef.name), kind: T('tecnologia', 'technology'), art: { k: 'icon', name: 'bulb' }, crumbs: crumbs29('mundo', 'techs'), blocks };
}

// ---------------------------------------------------------------- casas, veículos, organizações

export function pageVenue29(c: W29, id: string): Page29 | null {
  const v = VENUES17.find((x) => x.id === id);
  if (!v) return null;
  if (hidden29(c, v.from)) return futurePage29(`venue:${id}`, v.name, T('casa de shows', 'venue'));
  const y = Math.min(year29(c), v.to ?? 2026);
  return { id: `venue:${id}`, title: v.name, kind: T('casa de shows', 'venue'), art: { k: 'venue', id, name: v.name, cap: v.cap, year: Math.max(v.from, y), city: v.city }, crumbs: crumbs29('mundo', 'venues'),
    blocks: [{ k: 'kv', rows: [
      [T('Cidade', 'City'), cityById[v.city] ? [ln29(`city:${v.city}`, tx(cityById[v.city].name))] : [v.city]], [T('Capacidade', 'Capacity'), [v.cap.toLocaleString()]],
      [T('Época', 'Period'), [span29(v.from, v.to && hidden29(c, v.to) ? undefined : v.to)]], [T('Prestígio', 'Prestige'), [`${v.prestige}/100`]],
      [T('Pode ser comprada', 'Can be bought'), [v.buyable === false ? T('não', 'no') : `${T('sim, a partir de', 'yes, from')} ${c.s ? usd(money(c.s, v.price)) : `US$ ${v.price.toLocaleString()} (${T('dólares da época', 'era dollars')})`}`]],
    ] }, ...(v.note ? [P(tx(v.note))] : []), P(T('Shows aqui rendem conforme a fama do ato na cidade e a cena local — veja ', 'Gigs here earn according to the act\'s fame in the city and the local scene — see '), ln29('mech:live', T('Ao vivo', 'Live')), '.')] };
}

export function pageOutlet29(c: W29, id: string): Page29 | null {
  const o = OUTLETS17.find((x) => x.id === id);
  if (!o) return null;
  if (hidden29(c, o.from)) return futurePage29(`outlet:${id}`, o.name, T('veículo', 'outlet'));
  const real = c.s ? !!c.s.config.realNames : true;
  return { id: `outlet:${id}`, title: real && o.real ? o.real : o.name, kind: T('veículo de imprensa', 'media outlet'), art: { k: 'outlet', id, name: o.name, kind: o.kind, year: Math.max(o.from, Math.min(year29(c), o.to)) }, crumbs: crumbs29('mundo', 'outlets'),
    blocks: [{ k: 'kv', rows: [
      [T('Nome no jogo', 'In-game name'), [o.name]], ...(o.real ? [[T('Inspirado em', 'Based on'), [o.real]] as [string, Inline29[]]] : []),
      [T('Tipo', 'Type'), [o.kind]], [T('Mercado', 'Market'), [o.market === 'global' ? T('global', 'global') : tx(marketById[o.market]?.name ?? l(o.market))]],
      [T('Época', 'Period'), [span29(o.from, hidden29(c, o.to) ? undefined : o.to)]], [T('Alcance', 'Reach'), [`${o.reach}/100`]], [T('Credibilidade', 'Credibility'), [`${o.cred}/100`]],
      [T('Linha', 'Stance'), [o.stance < -0.2 ? T('progressista', 'progressive') : o.stance > 0.2 ? T('conservadora', 'conservative') : T('ao centro', 'centrist')]],
    ] }, P(tx(o.desc))] };
}

export function pageOrg29(c: W29, id: string): Page29 | null {
  const o = ORGS17.find((x) => x.id === id);
  if (!o) return null;
  if (hidden29(c, o.from)) return futurePage29(`org:${id}`, tx(o.name), T('organização', 'organization'));
  const ties = (o.ties ?? []).filter((x) => !hidden29(c, x.y));
  const hid = (o.ties ?? []).length - ties.length;
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Tipo', 'Kind'), [tx(KIND_NAME[o.kind])]], [T('Base', 'Base'), o.city && cityById[o.city] ? [ln29(`city:${o.city}`, tx(cityById[o.city].name))] : [T('a cidade-base do jogador', 'the player\'s home city')]],
    [T('Época', 'Period'), [span29(o.from, hidden29(c, o.to) ? undefined : o.to)]], [T('Negócios', 'Rackets'), [o.rackets.map((r) => tx(RACKET_NAME[r])).join(', ')]],
    [T('Origem', 'Source'), [o.real ? T('organização real documentada', 'documented real organization') : T('organização fictícia', 'fictional organization')]],
  ] }, P(tx(o.desc))];
  if (ties.length) blocks.push(H(T('Laços documentados', 'Documented ties')), { k: 'ul', items: ties.map((x) => [`${x.y} · ${tx(x.text)}`]) });
  if (hid) blocks.push({ k: 'spoiler', n: hid });
  blocks.push(P(T('Aproximar-se, lavar dinheiro ou denunciar mexem no calor policial — veja ', 'Approaching, laundering or reporting moves police heat — see '), ln29('mech:underworld', T('Submundo', 'Underworld')), '.'));
  return { id: `org:${id}`, title: tx(o.name), kind: T('organização do submundo', 'underworld organization'), art: { k: 'emblem', id: o.id, kind: o.kind, a3: countryOfCity(o.city) ?? undefined, name: tx(o.name) }, crumbs: crumbs29('mundo', 'orgs'), blocks };
}

// ---------------------------------------------------------------- objetos

export function pageRelic29(c: W29, id: string): Page29 | null {
  const d = relics29().find((x) => x.id === id);
  if (!d) return null;
  if (hidden29(c, d.year)) return futurePage29(`relic:${id}`, tx(d.name), T('relíquia', 'relic'));
  let hid = 0;
  const steps: Inline29[][] = [];
  for (const st of d.steps ?? []) { if (hidden29(c, st[0])) { hid++; continue; } steps.push([`${st[0]} · ${tx(l(st[5], st[6]))}`]); }
  const rarts = realCat29();
  const owner = rarts.artBy.get(rarts.arts.find((a) => a.n === d.owner)?.slug ?? '');
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('De quem', 'Whose'), owner && !c.s ? [ln29(`ract:${owner.slug}`, d.owner)] : [d.owner]], [T('Ano', 'Year'), [String(d.year)]],
    [T('Valor estimado', 'Estimated value'), [`US$ ${d.value.toLocaleString()} ${T('(dólares reais)', '(real dollars)')}`]],
    [T('Onde está (história real)', 'Where it is (real history)'), [hid ? T('— (depende de fatos futuros)', '— (depends on future facts)') : tx(d.location)]],
  ] }, P(tx(d.story))];
  if (steps.length) blocks.push(H(T('Caminho', 'Path')), { k: 'ul', items: steps });
  if (hid) blocks.push({ k: 'spoiler', n: hid });
  if (c.s) {
    const rl = relics(c.s).list.find((x) => x.rr === id);
    if (rl) blocks.unshift({ k: 'live', rows: [[T('Nesta partida', 'In this run'), [rl.st === 'player' ? T('no seu acervo', 'in your collection') : rl.st === 'auction' ? T('em leilão', 'at auction') : rl.st === 'stolen' ? T('desaparecida', 'missing') : rl.st === 'museum' ? T('num museu', 'in a museum') : T('com o dono', 'with its owner')]]] });
  }
  blocks.push(P(T('Relíquias podem ser compradas, leiloadas, emprestadas a museus ou roubadas — veja ', 'Relics can be bought, auctioned, lent to museums or stolen — see '), ln29('mech:awards', T('Prêmios e legado', 'Awards and legacy')), '.'));
  return { id: `relic:${id}`, title: tx(d.name), kind: T('relíquia', 'relic'), art: { k: 'relic', kind: d.kind, name: tx(d.name), year: d.year, seed: d.id }, crumbs: crumbs29('objetos', 'relics'), blocks };
}

export function pageGear29(c: W29, id: string): Page29 | null {
  const g = GEAR19.find((x) => x.id === id);
  if (!g) return null;
  if (hidden29(c, g.from)) return futurePage29(`gear:${id}`, g.name, T('equipamento', 'gear'));
  const real = c.s ? !!c.s.config.realNames && g.exact !== false : true;
  return { id: `gear:${id}`, title: real ? g.name : tx(g.alt), kind: T('equipamento', 'gear'), art: { k: 'gear', id: g.id, name: g.name }, crumbs: crumbs29('objetos', 'gear'),
    blocks: [{ k: 'kv', rows: [
      ...(real ? [[T('Nome genérico (sem nomes reais)', 'Generic name (no real names)'), [tx(g.alt)]] as [string, Inline29[]]] : []),
      [T('Tipo', 'Kind'), [g.kind]], [T('Fabricante', 'Maker'), [real ? g.maker : T('(fictício na partida)', '(fictional in the run)')]], [T('Desde', 'Since'), [String(g.from)]],
      [T('Famílias de gênero', 'Genre families'), [g.fam.map(famName).join(', ')]],
      ...(g.fx ? [[T('Som (produção · performance · originalidade)', 'Sound (production · performance · originality)'), [g.fx.map((x) => (x > 0 ? `+${x}` : String(x))).join(' · ')]] as [string, Inline29[]]] : []),
    ] }, ...(g.note ? [P(tx(g.note))] : []), P(T('Músicos podem ganhar endosso de fabricantes e virar donos de um instrumento-ícone — veja ', 'Musicians can get maker endorsements and own an icon instrument — see '), ln29('mech:music', T('Estúdio', 'Studio')), '.')] };
}

export function pageMerch29(c: W29, sku: string): Page29 | null {
  const m = SKUS[sku as Sku];
  if (!m) return null;
  const s = c.s;
  return { id: `merch:${sku}`, title: tx(m.name), kind: T('merch', 'merch'), art: { k: 'merch', sku, seed: 7, act: 'Masters', genre: 'rock', year: Math.max(m.from, Math.min(year29(c), m.to)) }, crumbs: crumbs29('objetos', 'merch'),
    blocks: [{ k: 'kv', rows: [
      [T('Época', 'Period'), [m.to >= 2100 ? `${T('desde', 'since')} ${m.from}` : span29(m.from, m.to)]],
      [T('Custo por unidade', 'Unit cost'), [s ? usd(money(s, m.cost)) : `US$ ${m.cost} (${T('dólares de referência', 'reference dollars')})`]],
      [T('Preço médio', 'Average price'), [s ? usd(money(s, m.price)) : `US$ ${m.price}`]],
      [T('Quem compra', 'Who buys'), [m.fan === 'core' ? T('fãs núcleo', 'core fans') : m.fan === 'active' ? T('fãs ativos', 'active fans') : T('público casual', 'casual audience')]],
      ...(m.winter ? [[T('Sazonal', 'Seasonal'), [T('vende mais no inverno', 'sells more in winter')]] as [string, Inline29[]]] : []),
    ] }, P(T('Lotes de merch são feitos por artista; vendem nos shows e na loja — veja ', 'Merch batches are made per act; they sell at shows and in the store — see '), ln29('mech:live', T('Ao vivo', 'Live')), '.')] };
}

const VEH: Record<'van' | 'bus' | 'fly', { t: [string, string]; d: [string, string] }> = {
  van: { t: ['Van', 'Van'], d: ['A mais barata. Cansa mais (fadiga ×1,35 na estrada). Com mais de 9 pessoas vira ônibus automaticamente.', 'The cheapest. More tiring (fatigue ×1.35 on the road). With more than 9 people it becomes a bus automatically.'] },
  bus: { t: ['Ônibus de turnê', 'Tour bus'], d: ['O padrão das turnês: fadiga normal (×1).', 'The tour standard: normal fatigue (×1).'] },
  fly: { t: ['Avião', 'Plane'], d: ['Caro, mas descansa (fadiga ×0,7). Antes do ano em que as turnês aéreas existem, vira ônibus.', 'Pricey, but restful (fatigue ×0.7). Before air touring exists it becomes a bus.'] },
};
export function pageVehicle29(c: W29, k: string): Page29 | null {
  const v = VEH[k as 'van'];
  if (!v) return null;
  const y = Math.min(year29(c), 2026);
  return { id: `vehicle:${k}`, title: T(v.t[0], v.t[1]), kind: T('veículo de turnê', 'tour vehicle'), art: { k: 'vehicle', move: k as 'van', year: y }, crumbs: crumbs29('objetos', 'vehicles'),
    blocks: [{ k: 'arts', items: [1955, 1975, 1995, 2020].map((yy) => ({ art: { k: 'vehicle' as const, move: k as 'van', year: yy }, cap: String(yy) })) }, P(T(v.d[0], v.d[1])),
      { k: 'kv', rows: [[T('Turnê aérea a partir de', 'Air touring from'), [String(FLY_FROM18)]]] },
      P(T('O veículo é escolhido no kit da turnê — veja ', 'The vehicle is chosen in the tour kit — see '), ln29('mech:live', T('Ao vivo e turnês', 'Live and tours')), '.')] };
}

export { hashName29 };
