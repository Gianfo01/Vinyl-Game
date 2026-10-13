// Rodada 29 (WIKI) — LINHA DO TEMPO. Junta todo fato datado (história real e do mundo do jogo) que já existe nas
// tabelas de dados: marcos 1926–2026, cartões de decisão, décadas, cenas, covers, tecnologias, eras, gêneros,
// movimentos, geopolítica, fronteiras, crime documentado, relíquias, gravadoras, casas de show, imprensa,
// festivais, prêmios, leis e estreias das estrelas globais. Nada é copiado: tudo é lido na primeira chamada.
// Convenção: `m` é o mês 0..11 (0 = janeiro), igual ao resto do jogo.
import '../../sim/tick';
import type { Event29 } from './wiki29types';
import { l, cityById, genreById, GENRES, type L } from '../../data/world';
import { TECHS } from '../../data/rules';
import { MOVEMENTS, GEOPOLITICS, TECH_ERAS, AWARDS, PLATFORMS, CHARTS } from '../../data/content';
import { GEO_EVENTS } from '../../sim/culture';
import { UNIONS, PARTITIONS, COLONIES, countryName } from '../../data/geo';
import { COUNTRY_INFO, type CountryInfo } from '../../data/countries';
import { COUNTRY_INFO19 } from '../../data/countries19';
import { ERAS17, SCENES17, COVERS17 } from '../../data/heritage17';
import { GLOBAL17 } from '../../data/relevance17';
import { DOC17 } from '../../data/orgs17';
import { MARRIAGE17 } from '../../data/sex17';
import { REAL_LABEL_FOUNDED, REAL_LABELS } from '../../data/realnames';
import { CATALOG_LABELS, FESTIVALS, MEDIA, STUDIOS } from '../../data/catalog';
import { EXTRA_LABELS } from '../../data/labels10';
import { LABEL_FATES_1889 } from '../../data/era1889';
import { OUTLETS17 } from '../../data/media17';
import { SHOWS19 } from '../../data/media19';
import { LANDMARKS19 } from '../../data/landmarks19';
import { RELICS18 } from '../../data/relics18';
import { RELICS17 } from '../../sim/relics17';
import { ERA_SHIFTS } from '../../sim/sys/eras8';
import { MILESTONES } from '../../sim/sys/world4/milestones';
import { REAL19 } from '../../sim/sys/realhist19';
import { EVS27 } from '../../sim/sys/hist27';
import { VENUES17 } from '../../sim/sys/venues17';
import { REAL_ALL, canonKey } from '../../sim/sys/realworld';

/** Tipos de evento da linha do tempo (filtro e ícone na interface). */
export const TIME_KINDS29: { id: string; label: L; icon: string }[] = [
  { id: 'history', label: l('Marcos da história', 'History milestones'), icon: 'scroll' },
  { id: 'decision', label: l('Cartões de decisão', 'Decision cards'), icon: 'chess' },
  { id: 'decade', label: l('Décadas', 'Decades'), icon: 'calendar' },
  { id: 'scene', label: l('Cenas locais', 'Local scenes'), icon: 'map' },
  { id: 'cover', label: l('Covers e samples', 'Covers and samples'), icon: 'songsheet' },
  { id: 'global', label: l('Sucessos globais', 'Global hits'), icon: 'globe' },
  { id: 'tech', label: l('Tecnologias', 'Technologies'), icon: 'bulb' },
  { id: 'format', label: l('Formatos e suportes', 'Formats and media'), icon: 'disc' },
  { id: 'era', label: l('Eras do negócio', 'Business eras'), icon: 'hourglass' },
  { id: 'genre', label: l('Nascimento de gêneros', 'Genre births'), icon: 'note' },
  { id: 'movement', label: l('Movimentos', 'Movements'), icon: 'sparkle' },
  { id: 'geo', label: l('Geopolítica', 'Geopolitics'), icon: 'flag' },
  { id: 'border', label: l('Fronteiras e independências', 'Borders and independence'), icon: 'passport' },
  { id: 'country', label: l('Mercados nacionais', 'National markets'), icon: 'compass' },
  { id: 'crime', label: l('Crime documentado', 'Documented crime'), icon: 'skull' },
  { id: 'relic', label: l('Relíquias', 'Relics'), icon: 'vault' },
  { id: 'label', label: l('Gravadoras', 'Labels'), icon: 'building' },
  { id: 'venue', label: l('Casas de show', 'Venues'), icon: 'stage' },
  { id: 'media', label: l('Imprensa, rádio e TV', 'Press, radio and TV'), icon: 'newspaper' },
  { id: 'platform', label: l('Plataformas', 'Platforms'), icon: 'headphones' },
  { id: 'chart', label: l('Paradas', 'Charts'), icon: 'chart-up' },
  { id: 'festival', label: l('Festivais', 'Festivals'), icon: 'ticket' },
  { id: 'award', label: l('Prêmios', 'Awards'), icon: 'trophy' },
  { id: 'studio', label: l('Estúdios', 'Studios'), icon: 'mixer' },
  { id: 'landmark', label: l('Marcos urbanos', 'City landmarks'), icon: 'skyline' },
  { id: 'society', label: l('Sociedade e leis', 'Society and law'), icon: 'heart' },
  { id: 'debut', label: l('Estreias das estrelas', 'Star debuts'), icon: 'star' },
];

// ---------------------------------------------------------------- utilitários
/** junta pedaços bilíngues (string = igual nos dois idiomas) */
const J = (...xs: (L | string)[]): L => ({ pt: xs.map((x) => (typeof x === 'string' ? x : x.pt)).join(''), en: xs.map((x) => (typeof x === 'string' ? x : x.en)).join('') });
const T = (pt: string, en: string): L => l(pt, en);
const cityLink = (id: string | undefined): string[] => (id && cityById[id] ? [`city:${id}`] : []);
const genreLink = (id: string | undefined): string[] => (id && genreById[id] ? [`genre:${id}`] : []);
const cityName = (id: string): L => cityById[id]?.name ?? l(id);
const span = (a: number, b?: number): string => (b === undefined || b === a ? `${a}` : b > 2026 ? `${a}–` : `${a}–${b}`);

let RACTS: Set<string> | null = null;
/** link 'ract:<slug>' só quando o nome existe no banco de artistas reais */
function ract(name: string): string[] {
  if (!RACTS) RACTS = new Set(REAL_ALL.map((a) => canonKey(a.n)));
  const k = canonKey(name);
  return RACTS.has(k) ? [`ract:${k.replace(/\s+/g, '-')}`] : [];
}

/** cartões de decisão da rodada 27 → marco que os dispara (a ligação vive em hist27, sem exportar) */
const BIND27: Record<string, string> = { h27_payola: 'payola59', h27_ai5: 'h19_tropicalia', h27_disco: 'disco_demolition', h27_stream: 'h19_spotify' };

let MEMO: Event29[] | null = null;

/** Linha do tempo completa, ordenada por ano e mês (memoizada). */
export function timeline29(): Event29[] {
  if (MEMO) return MEMO;
  const out: Event29[] = [];
  const add = (y: number, kind: string, text: L, see?: string[], m?: number): void => {
    if (!Number.isFinite(y)) return;
    const e: Event29 = { y, text, kind };
    if (m !== undefined && m >= 0 && m <= 11) e.m = m;
    const s = see ? [...new Set(see)] : [];
    if (s.length) e.see = s;
    out.push(e);
  };
  const techBase = Object.fromEntries(TECHS.map((t) => [t.id, t.base])) as Record<string, number>;

  // ---------- marcos da história (world4 + history19 + more19); os de realhist19 usam o texto "o que houve de fato"
  const realMs = new Set(REAL19.map((r) => r.ms));
  const msById = new Map(MILESTONES.map((m) => [m.id, m]));
  for (const m of MILESTONES) {
    if (realMs.has(m.id)) continue;
    add(m.year, 'history', J(m.title, ' — ', m.text), m.tech ? [`tech:${m.tech}`] : [], m.month);
  }
  for (const r of REAL19) add(r.year, 'history', J(r.title, ' — ', r.real), [], msById.get(r.ms)?.month);
  for (const ev of EVS27) {
    const ms = msById.get(BIND27[ev.id] ?? '');
    if (!ms) continue;
    const title = typeof ev.title === 'function' ? null : ev.title;
    if (!title) continue;
    add(ms.year, 'decision', J(T('Cartão de decisão: ', 'Decision card: '), title), ms.tech ? [`tech:${ms.tech}`] : [], ms.month);
  }

  // ---------- heritage17: décadas, cenas, covers; sucessos globais
  for (const [dec, names, pt, en] of ERAS17) add(dec, 'decade', J(T(`Anos ${dec}: `, `The ${dec}s: `), T(pt, en), ` (${names.join(', ')})`), names.flatMap(ract));
  for (const [, city, genre, from, to, npt, nen, tpt, ten, acts] of SCENES17)
    add(from, 'scene', J(T(`Cena local (${span(from, to)}): `, `Local scene (${span(from, to)}): `), T(npt, nen), ' — ', T(tpt, ten)), [...cityLink(city), ...genreLink(genre), ...acts.flatMap(ract)]);
  for (const [y, m, , , orig, neo, , pt, en] of COVERS17) add(y, 'cover', T(pt, en), [...ract(orig), ...ract(neo)], m);
  for (const [name, from, to, , pt, en] of GLOBAL17) add(from, 'global', J(`${name} (${span(from, to || undefined)}): `, T(pt, en)), ract(name));

  // ---------- tecnologias, formatos, eras do negócio
  for (const t of TECHS) add(t.base, 'tech', J(T('Chega a tecnologia: ', 'Technology arrives: '), t.name), [`tech:${t.id}`]);
  for (const f of TECH_ERAS) {
    add(f.start, 'format', J(T('Começa a era do formato: ', 'Format era begins: '), f.name, ' — ', f.desc), f.tech && techBase[f.tech] !== undefined ? [`tech:${f.tech}`] : []);
    if (f.end !== undefined && f.end <= 2026) add(f.end, 'format', J(T('Fim do formato: ', 'End of format: '), f.name), f.tech && techBase[f.tech] !== undefined ? [`tech:${f.tech}`] : []);
  }
  const minTech = Math.min(...TECHS.map((t) => t.base));
  for (const e of ERA_SHIFTS) {
    let y: number | undefined = e.tech ? techBase[e.tech] : undefined;
    if (y === undefined && e.after?.length) y = Math.min(...e.after.map((a) => (techBase[a.tech] ?? minTech) + a.plus));
    if (y === undefined) y = techBase[e.id] ?? minTech;
    add(y, 'era', J(T('Nova era: ', 'New era: '), e.name, ' — ', e.model), [`era:${e.id}`, ...(e.tech ? [`tech:${e.tech}`] : [])]);
  }

  // ---------- gêneros e movimentos
  for (const g of GENRES) add(g.born, 'genre', J(T('Nasce o gênero: ', 'Genre is born: '), g.name), [`genre:${g.id}`, ...g.parents.flatMap(genreLink)]);
  for (const mv of MOVEMENTS) {
    const city = mv.cities[0], parent = mv.parents[0];
    const fill = (p: string | undefined, lang: 'pt' | 'en'): string => (p ?? '').replace('{city}', city ? cityName(city)[lang] : '').replace('{parent}', parent ? (genreById[parent]?.name[lang] ?? parent) : '').replace('{adj}', '').replace(/\s+/g, ' ').trim();
    const name = l(fill(mv.namePatterns.pt[0], 'pt'), fill(mv.namePatterns.en[0], 'en'));
    add(mv.from, 'movement', J(T(`Movimento (${span(mv.from, mv.to)}): `, `Movement (${span(mv.from, mv.to)}): `), name, ' — ', mv.desc), [...mv.parents.flatMap(genreLink), ...mv.cities.flatMap(cityLink)]);
  }

  // ---------- geopolítica (lista de conteúdo + lista da simulação, sem repetir)
  const geoSeen = new Set<string>();
  for (const g of GEOPOLITICS) {
    geoSeen.add(g.id); geoSeen.add(g.name.en);
    add(g.from, 'geo', J(g.name, ` (${span(g.from, g.to)}): `, g.desc), (g.cities ?? []).flatMap(cityLink));
  }
  for (const g of GEO_EVENTS) {
    if (geoSeen.has(g.id) || geoSeen.has(g.name.en)) continue;
    add(g.from, 'geo', J(g.name, ` (${span(g.from, g.to)}): `, g.note));
  }

  // ---------- fronteiras: uniões, partições, independências
  for (const u of UNIONS) {
    add(u.from, 'border', J(T('Surge: ', 'Formed: '), u.name));
    if (u.to <= 2026) add(u.to, 'border', J(T('Deixa de existir: ', 'Ceases to exist: '), u.name));
  }
  for (const p of PARTITIONS) {
    add(p.from, 'border', J(T('Divisão de ', 'Partition of '), countryName(p.country), ': ', p.inside.name, ' / ', p.outside.name));
    if (p.to <= 2026) add(p.to, 'border', J(T('Fim da divisão de ', 'End of the partition of '), countryName(p.country), ': ', p.inside.name, ' / ', p.outside.name));
  }
  for (const [a3, [power, y]] of Object.entries(COLONIES)) add(y, 'border', J(T('Independência: ', 'Independence: '), countryName(a3), T(' (de ', ' (from '), countryName(power), ')'));

  // ---------- mercados nacionais: notas por época e criação dos prêmios
  const infos: CountryInfo[] = [];
  const seenA3 = new Set<string>();
  for (const c of [...COUNTRY_INFO, ...COUNTRY_INFO19]) if (!seenA3.has(c.a3)) { seenA3.add(c.a3); infos.push(c); }
  for (const c of infos) {
    for (const [y, pt, en] of c.notes ?? []) add(y, 'country', J(countryName(c.a3), ': ', T(pt, en)));
    if (c.award) add(c.award[2], 'award', J(T('Criado o prêmio nacional ', 'National award created: '), `${c.award[0]} (≈ ${c.award[1]}) — `, countryName(c.a3)));
  }
  for (const a of AWARDS) {
    add(a.start, 'award', J(T('Primeira cerimônia: ', 'First ceremony: '), a.name, a.realRef ? ` (≈ ${a.realRef})` : ''), [], a.month);
    if (a.end !== undefined && a.end <= 2026) add(a.end, 'award', J(T('Última edição: ', 'Last edition: '), a.name));
  }

  // ---------- sociedade: casamento igualitário
  for (const [a3, y] of Object.entries(MARRIAGE17)) add(y, 'society', J(countryName(a3), T(' aprova o casamento entre pessoas do mesmo sexo', ' legalises same-sex marriage')));

  // ---------- crime documentado
  for (const d of DOC17) add(d.y, 'crime', J(countryName(d.a3), ': ', d.text), [], d.m);

  // ---------- relíquias reais (17 + 18 + 19 + 1889, já reunidas em RELICS17) e a trajetória de cada uma
  const relics = [...RELICS17, ...RELICS18.filter((r) => !RELICS17.some((x) => x.id === r.id))];
  for (const r of relics) {
    const see = [`relic:${r.id}`, ...ract(r.owner)];
    add(r.year, 'relic', J(r.name, ' — ', r.story), see, r.month);
    for (const [y, m, , , , pt, en] of r.steps ?? []) add(y, 'relic', J(r.name, ': ', T(pt, en)), see, m);
  }

  // ---------- gravadoras: catálogo (ano real quando o selo real nasceu depois), extras e fins de 1889
  for (const lb of CATALOG_LABELS) {
    const y = Math.max(lb.founded, REAL_LABEL_FOUNDED[lb.id] ?? lb.founded);
    add(y, 'label', J(T('Fundação: ', 'Founded: '), lb.name, REAL_LABELS[lb.id] ? ` (≈ ${REAL_LABELS[lb.id]})` : '', ', ', cityName(lb.city), ' — ', lb.archetype), cityLink(lb.city));
  }
  const xById = new Map(EXTRA_LABELS.map((x) => [x.id, x]));
  for (const lb of EXTRA_LABELS) add(lb.founded, 'label', J(T('Fundação: ', 'Founded: '), lb.name, ` (≈ ${lb.real}), `, cityName(lb.city), ' — ', lb.archetype), cityLink(lb.city));
  for (const f of LABEL_FATES_1889) add(f.y, 'label', T(f.pt, f.en), cityLink(xById.get(f.id)?.city));

  // ---------- casas de show
  for (const v of VENUES17) {
    add(v.from, 'venue', J(T('Abre: ', 'Opens: '), `${v.name} (`, cityName(v.city), T(`, ${v.cap} lugares)`, `, ${v.cap} seats)`)), cityLink(v.city));
    if (v.to !== undefined && v.to <= 2026) add(v.to, 'venue', J(T('Fecha: ', 'Closes: '), `${v.name} (`, cityName(v.city), ')'), cityLink(v.city));
  }

  // ---------- imprensa, rádio e TV, plataformas, paradas
  for (const o of OUTLETS17) {
    const nm = o.real && o.real !== o.name ? `${o.name} (≈ ${o.real})` : o.name;
    add(o.from, 'media', J(T('Lançamento: ', 'Launched: '), nm, ' — ', o.desc));
    if (o.to <= 2026) add(o.to, 'media', J(T('Fim de ', 'End of '), nm));
  }
  for (const s of SHOWS19) {
    const nm = J(s.alt, ` (≈ ${s.real})`);
    add(s.from, 'media', J(T('Estreia o programa ', 'Show premieres: '), nm, ' — ', s.desc));
    if (s.to <= 2026) add(s.to, 'media', J(T('Sai do ar: ', 'Goes off air: '), nm));
  }
  for (const md of MEDIA) {
    add(md.start, 'media', J(T('Começa: ', 'Starts: '), md.name, ' — ', md.type));
    if (md.end !== undefined && md.end <= 2026) add(md.end, 'media', J(T('Acaba: ', 'Ends: '), md.name));
  }
  for (const p of PLATFORMS) {
    const nm = p.realRef ? `${p.name} (≈ ${p.realRef})` : p.name;
    add(p.launch, 'platform', J(T('Lançada a plataforma ', 'Platform launched: '), nm, ' — ', p.desc));
    if (p.close !== undefined && p.close <= 2026) add(p.close, 'platform', J(T('Fecha a plataforma ', 'Platform closes: '), nm));
  }
  for (const c of CHARTS) {
    add(c.start, 'chart', J(T('Primeira edição da parada ', 'First chart: '), c.name, c.realRef ? ` (≈ ${c.realRef})` : ''));
    if (c.end !== undefined && c.end <= 2026) add(c.end, 'chart', J(T('Última edição da parada ', 'Last chart: '), c.name));
  }

  // ---------- festivais, estúdios, marcos urbanos
  for (const f of FESTIVALS) add(f.start, 'festival', J(T('Primeira edição: ', 'First edition: '), f.name, f.realRef ? ` (≈ ${f.realRef})` : '', ', ', cityName(f.city), ' — ', f.kind), cityLink(f.city));
  for (const st of STUDIOS) {
    if (st.from === undefined) continue;
    add(st.from, 'studio', J(T('Abre o estúdio ', 'Studio opens: '), `${st.name}, `, cityName(st.city)), cityLink(st.city));
    if (st.to !== undefined && st.to <= 2026) add(st.to, 'studio', J(T('Fecha o estúdio ', 'Studio closes: '), `${st.name}, `, cityName(st.city)), cityLink(st.city));
  }
  for (const lm of LANDMARKS19) {
    add(lm.from, 'landmark', J(lm.n, ' (', cityName(lm.city), '): ', lm.fact), cityLink(lm.city));
    if (lm.to !== undefined && lm.to <= 2026) add(lm.to, 'landmark', J(lm.n, ' (', cityName(lm.city), T('): demolido', '): demolished')), cityLink(lm.city));
  }

  // ---------- estreias das estrelas globais (só tier 1; o banco inteiro seria grande demais)
  const seenAct = new Set<string>();
  for (const a of REAL_ALL) {
    if (a.t !== 1) continue;
    const k = canonKey(a.n);
    if (seenAct.has(k)) continue;
    seenAct.add(k);
    add(a.d, 'debut', T(`Estreia de ${a.n}`, `${a.n} debuts`), [`ract:${k.replace(/\s+/g, '-')}`, ...cityLink(a.c), ...genreLink(a.g)]);
  }

  out.sort((a, b) => a.y - b.y || (a.m ?? -1) - (b.m ?? -1));
  MEMO = out;
  return out;
}
