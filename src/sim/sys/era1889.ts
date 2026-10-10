// Rodada 18 (era1889) — a era acústica (1889–1919) como uma era jogável completa:
//  · dados reais instalados nos sistemas existentes (relíquias, imprensa, impérios, fábricas, guerras, populações);
//  · guerra dos formatos (cilindro × disco) e guerra de patentes (pool Victor/Columbia), com escolha do jogador;
//  · gravação acústica (corneta: vozes potentes e metais gravam bem, cordas e sussurros somem);
//  · partitura como o grande negócio (song pluggers do Tin Pan Alley) e salões de fonógrafo a moedas;
//  · linha do tempo real (pânicos de 1893/1907, Titanic, Grande Guerra, gripe espanhola, ASCAP, Lei de 1909…);
//  · menestréis e "coon songs" tratados como contexto histórico: o gênero existe, é explicado e decai;
//  · cenários "Columbia 1889" e "Casa Edison, Rio 1902"; fusões/fechamentos reais de selos no modo exato.

import { l, type L } from '../../data/world';
import { COUNTRY_INFO } from '../../data/countries';
import { UNIONS } from '../../data/geo';
import { GEOPOLITICS, TECH_ERAS } from '../../data/content';
import { OUTLETS17 } from '../../data/media17';
import { LABEL_FATES_1889, OUTLETS_1889, POP_1889, RELICS_1889, TASTE_1889, UNIONS_1889 } from '../../data/era1889';
import { GEO_EVENTS, setGeoEvents } from '../culture';
import { RELICS17 } from '../relics17';
import { PLANTS18 } from './supply18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerPerkSource, type PerkEntry } from '../perks';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { histMode } from '../history15';
import { addHype } from './hype12';
import { SCENARIOS, adjustCash, genreUnits, insolvent, liveOf, scenarioById, signAct } from './live';
import { SCENARIOS17, type Scenario17 } from './scenarios17';
import type { GameState, Release } from '../types';
import { hasTech, money, notify, post, remember } from '../util';
import { Rng } from '../../core/rng';

// ---------------------------------------------------------------- dados nos sistemas existentes

for (const d of RELICS_1889) if (!RELICS17.some((x) => x.id === d.id)) RELICS17.push(d);
for (const o of OUTLETS_1889) if (!OUTLETS17.some((x) => x.id === o.id)) OUTLETS17.push(o);
for (const u of UNIONS_1889) if (!UNIONS.some((x) => x.id === u.id)) (UNIONS as unknown as typeof UNIONS_1889).push(u);
for (const c of COUNTRY_INFO) {
  const p = POP_1889[c.a3];
  if (c.pop[0][0] >= 1920) c.pop.unshift(...(p ? [[1890, p[0]], [1900, p[1]], [1910, p[2]]] as [number, number][] : [[1890, c.pop[0][1] * 0.75], [1900, c.pop[0][1] * 0.82], [1910, c.pop[0][1] * 0.9]] as [number, number][]));
  const t = TASTE_1889[c.a3];
  if (t && c.taste[0][0] >= 1920) c.taste.unshift([1889, t]);
}
const PL = (id: string, pt: string, en: string, wpt: string, wen: string, from: number, to: number, mats: ('shellac' | 'paper')[], cap: number, def: number, price: number, major: boolean, dpt: string, den: string) =>
  ({ id, name: l(pt, en), where: l(wpt, wen), from, to, mats, cap, def, price, major, desc: l(dpt, den) });
for (const p of [
  PL('cyl_works', 'Moldagem de cilindros (Nova Jersey)', 'Cylinder moulding works (New Jersey)', 'EUA', 'USA', 1889, 1929, ['shellac', 'paper'], 0.6, 0.02, 1.1, true,
    'Até 1902 cada cilindro era copiado por pantógrafo, poucos de cada vez; depois, moldes de ouro. Do inventor: os discos dele furam a fila.', 'Until 1902 each cylinder was dubbed by pantograph, a few at a time; then gold moulds. Owned by the inventor: his records jump the queue.'),
  PL('disc_camden', 'Prensa de discos de Camden', 'Camden disc pressing plant', 'EUA', 'USA', 1897, 1925, ['shellac', 'paper'], 1, 0.008, 1, true,
    'Prensa de goma-laca da concorrência: rápida, mas cobra pelas patentes de disco.', 'A rival\'s shellac press: fast, but it charges for the disc patents.'),
  PL('job_press', 'Prensa de encomenda', 'Custom job press', 'sua cidade', 'your city', 1905, 1935, ['shellac', 'paper'], 0.4, 0.025, 0.95, false,
    'Pequena oficina que prensa para selos sem fábrica: barata, discos chiam e empenam.', 'A small shop pressing for labels without a plant: cheap, records hiss and warp.'),
]) if (!PLANTS18.some((x) => x.id === p.id)) PLANTS18.push(p);
const TE = (id: string, pt: string, en: string, start: number, peak: number, decline: number, end: number, ps: number, sb: number, rc: number, dpt: string, den: string, ept: string, een: string) =>
  ({ id, name: l(pt, en), tech: undefined, start, peak, decline, end, effects: { piracy: 0.02, physicalShare: ps, singlesBias: sb, recordingCost: rc, discovery: l(dpt, den) }, desc: l(ept, een) });
for (const e of [
  TE('cylinder', 'Cilindro de cera', 'Wax cylinder', 1889, 1904, 1912, 1929, 0.6, 1, 1.4, 'Salões de fonógrafo a moedas e catálogos por correio', 'Coin-in-the-slot parlors and mail-order catalogs', 'Dois minutos por cilindro; até 1902 cada cópia é uma regravação.', 'Two minutes per cylinder; until 1902 each copy is a re-recording.'),
  TE('acoustic_disc', 'Disco acústico', 'Acoustic disc', 1895, 1915, 1925, 1930, 0.65, 1, 1.3, 'Vaudeville, partituras e o suplemento mensal da gravadora', 'Vaudeville, sheet music and the label\'s monthly supplement', 'Canta-se para dentro de uma corneta: vozes potentes e metais vencem.', 'Singers sing into a horn: powerful voices and brass win.'),
  TE('piano_roll', 'Rolo de pianola', 'Piano roll', 1896, 1923, 1929, 1935, 0.5, 1, 1, 'Lojas de pianos e salas de estar', 'Piano stores and parlors', 'A pianola toca sozinha o que o pianista gravou em papel perfurado.', 'The player piano plays by itself what the pianist punched into paper.'),
]) if (!TECH_ERAS.some((x) => x.id === e.id)) TECH_ERAS.push(e as (typeof TECH_ERAS)[number]);

type G = (typeof GEO_EVENTS)[number];
const GEO_1889: G[] = [
  { id: 'panic1893', name: l('Pânico de 1893', 'Panic of 1893'), from: 1893, to: 1896, markets: ['na', 'eu'], demand: 0.78, note: l('Bancos quebram em série; ninguém compra fonógrafo.', 'Banks fail one after another; nobody buys phonographs.') },
  { id: 'panic1907', name: l('Pânico de 1907', 'Panic of 1907'), from: 1907, to: 1908, markets: ['na'], demand: 0.88, note: l('Corrida aos bancos em Nova York; J. P. Morgan segura o sistema.', 'A run on New York banks; J. P. Morgan props up the system.') },
  { id: 'mexrev', name: l('Revolução Mexicana', 'Mexican Revolution'), from: 1910, to: 1920, markets: ['latam'], demand: 0.9, note: l('Corridos contam a guerra; o comércio se desorganiza.', 'Corridos tell the war; trade falls apart.') },
  { id: 'ww1', name: l('Grande Guerra', 'Great War'), from: 1914, to: 1918, markets: ['eu'], demand: 0.7, liveBlocked: true, pressingMult: 1.3, note: l('Fábricas viram arsenais e turnês pela Europa param; canções patrióticas vendem.', 'Factories turn into arsenals and European tours stop; patriotic songs sell.') },
  { id: 'ww1us', name: l('EUA na Grande Guerra', 'US in the Great War'), from: 1917, to: 1918, markets: ['na'], demand: 0.92, note: l('Racionamento, músicos convocados e "Over There" em todo canto.', 'Rationing, drafted musicians and "Over There" everywhere.') },
  { id: 'flu1918', name: l('Gripe espanhola', 'Spanish flu'), from: 1918, to: 1918, markets: ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'], demand: 0.85, liveBlocked: true, note: l('Teatros, cinemas e salões fechados por ordem sanitária.', 'Theatres, cinemas and dance halls closed by health order.') },
  { id: 'russrev', name: l('Revolução Russa e guerra civil', 'Russian Revolution and civil war'), from: 1917, to: 1921, markets: ['eu'], demand: 0.95, note: l('A Gramophone perde a fábrica de Riga e o mercado russo.', 'The Gramophone Co. loses its Riga plant and the Russian market.') },
];
function ensureGeo(): void {
  if (GEO_EVENTS.some((g) => g.id === 'ww1')) return;
  setGeoEvents([...GEO_EVENTS, ...GEO_1889]);
}
ensureGeo();
// também na lista de dados (conteúdo e cartões), sem efeito de censura
for (const g of GEO_1889) if (!GEOPOLITICS.some((x) => x.id === g.id)) GEOPOLITICS.push({ id: g.id, name: g.name, kind: g.id.startsWith('panic') ? 'recession' : g.id === 'flu1918' ? 'pandemic' : g.id === 'russrev' || g.id === 'mexrev' ? 'revolution' : 'war', markets: g.markets, from: g.from, to: g.to, effects: { censorshipLevel: 0, bannedTags: [], demandMult: g.demand, touringBlocked: g.liveBlocked }, desc: g.note });

// ---------------------------------------------------------------- estado

export interface Era1889State {
  /** guerra de patentes: licença paga, risco assumido ou ainda sem decisão */
  pat?: 'lic' | 'risk';
  patAsked?: number;
  /** salão de fonógrafos a moedas (semana de abertura) */
  parlor?: number;
  parlorEarned: number;
  /** song pluggers: semana do último uso por ato */
  plug: Record<string, number>;
  /** marcos já noticiados */
  news: Record<string, 1>;
  fates: Record<string, 1>;
  injunctions: number;
}
declare module '../ext4' { interface Ext4 { era1889: Era1889State } }
const fresh = (): Era1889State => ({ parlorEarned: 0, plug: {}, news: {}, fates: {}, injunctions: 0 });
registerExt4('era1889', fresh);
export function era1889(s: GameState): Era1889State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.era1889 ??= fresh()) as Era1889State;
  st.plug ??= {}; st.news ??= {}; st.fates ??= {}; st.parlorEarned ??= 0; st.injunctions ??= 0;
  return st;
}

/** É a era acústica (antes da gravação elétrica)? */
export const acoustic1889 = (s: GameState): boolean => !hasTech(s, 'electric_rec');
const mine = (s: GameState, r: Release) => r.owner === 'player' || !!s.acts[r.actId]?.playerBand;
const myRels = (s: GameState, weeks: number) => Object.values(s.releases).filter((r) => mine(s, r) && s.week - r.week <= weeks);

// ---------------------------------------------------------------- gravação acústica

/** Como cada gênero soa na corneta acústica (multiplicador de apelo e motivo). */
export function acousticFit1889(genre: string): { m: number; why: L } | null {
  if (['opera', 'march', 'vaudeville', 'barbershop', 'minstrel'].includes(genre)) return { m: 1.06, why: l('Vozes potentes e metais gravam bem na corneta acústica.', 'Powerful voices and brass record well into the acoustic horn.') };
  if (['classical', 'parlor_song', 'modinha', 'spirituals', 'indian_classical', 'arabic_classical'].includes(genre)) return { m: 0.95, why: l('Cordas, coros e vozes suaves somem na corneta: o disco não faz justiça.', 'Strings, choirs and soft voices vanish in the horn: the record does them no justice.') };
  if (['nola_jazz', 'ragtime', 'klezmer', 'polka'].includes(genre)) return { m: 1.03, why: l('Banjo, clarinete e metais furam a corneta (a bateria toca baixinho, só blocos de madeira).', 'Banjo, clarinet and brass cut through the horn (drums play softly, woodblocks only).') };
  return null;
}
registerPerkSource('era1889', (s) => {
  if (s.year >= 1930) return [];
  const out: PerkEntry[] = [];
  if (acoustic1889(s)) {
    out.push({ label: l('Gravação acústica: vozes potentes e metais', 'Acoustic recording: powerful voices and brass'), values: { appeal: 0.06 }, act: (_s, a) => (acousticFit1889(a.genre)?.m ?? 1) > 1.04 });
    out.push({ label: l('Gravação acústica: ragtime, jazz e banjo', 'Acoustic recording: ragtime, jazz and banjo'), values: { appeal: 0.03 }, act: (_s, a) => { const m = acousticFit1889(a.genre)?.m ?? 1; return m > 1 && m <= 1.04; } });
    out.push({ label: l('Gravação acústica: cordas e vozes suaves somem', 'Acoustic recording: strings and soft voices vanish'), values: { appeal: -0.05 }, act: (_s, a) => (acousticFit1889(a.genre)?.m ?? 1) < 1 });
  }
  // menestréis: o público e a imprensa negra (e depois a NAACP, 1915) rejeitam a caricatura racista
  if (s.year >= 1905) out.push({ label: s.year >= 1915 ? l('Menestréis: protestos da NAACP (1915) e público em fuga', 'Minstrelsy: NAACP protests (1915) and a shrinking audience') : l('Menestréis: forma antiga e caricata, em declínio', 'Minstrelsy: an old caricature form, in decline'),
    values: { appeal: s.year >= 1915 ? -0.15 : -0.06, critics: s.year >= 1915 ? -8 : -3 }, act: (_s, a) => a.genre === 'minstrel' });
  return out;
});

// ---------------------------------------------------------------- guerra dos formatos

/** Fator de demanda de um lançamento pelo formato físico na guerra cilindro × disco. */
export function formatWar1889(s: GameState, rel: Release): { k: number; why: L } | null {
  if (s.year >= 1930) return null;
  const cyl = rel.formats.includes('cylinder'), disc = rel.formats.includes('shellac');
  if (cyl && !disc && hasTech(s, 'disc')) {
    const k = s.year < 1905 ? 1 : s.year < 1910 ? 0.85 : s.year < 1915 ? 0.65 : 0.45;
    return k < 1 ? { k, why: l('Só em cilindro: o disco ganhou a guerra dos formatos (a Columbia larga o cilindro em 1912).', 'Cylinder only: the disc won the format war (Columbia drops cylinders in 1912).') } : null;
  }
  if (disc && !cyl && s.year < 1905) return { k: 0.9, why: l('Só em disco: muitos lares ainda têm fonógrafo de cilindro.', 'Disc only: many homes still own a cylinder phonograph.') };
  return null;
}
registerMod('chartUnits', 'era1889fmt', (s, value, ctx) => {
  const rel = ctx.release as Release | undefined;
  if (!rel || s.year >= 1930) return null;
  const f = formatWar1889(s, rel);
  return f ? { value: value * f.k, label: f.why } : null;
});

// ---------------------------------------------------------------- guerra de patentes

export const PATENT_FEE_PCT = 0.06;
registerInboxKind('era1889_patent', {
  label: l('Patentes', 'Patents'), cat: 'decision', icon: 'gavel', prio: 2,
  handle: (s, _m, act) => {
    const st = era1889(s);
    if (act === 'lic') { st.pat = 'lic'; post(s, `patent:lic:${s.year}`, -money(s, 6000), 'legal', 'Licença de patentes (fonógrafo/gramofone)'); return l('Licença assinada: você paga 6% da venda de discos ao pool de patentes até 1912 e dorme tranquilo.', 'License signed: you pay 6% of record sales to the patent pool until 1912 and sleep soundly.'); }
    st.pat = 'risk';
    return l('Você vai prensar sem licença. Advogados da Victor e da Columbia (e de Edison) processam quem aparece.', 'You will press without a license. Victor, Columbia (and Edison) lawyers sue whoever shows up.');
  },
});
/** Mês: royalties de licença ou risco de liminar. */
function patentMonth(s: GameState, r: Rng): void {
  const st = era1889(s);
  if (s.year >= 1912 || s.config.role === 'artist') return;
  const rels = myRels(s, 9999).filter((x) => x.formats.some((f) => f === 'shellac' || f === 'cylinder'));
  if (!rels.length) return;
  if (!st.pat && (st.patAsked ?? -99) < s.week - 26) {
    st.patAsked = s.week;
    pushInbox18(s, 'era1889_patent', {
      from: 'Talking Machine World', subject: l('Guerra de patentes: licenciar ou arriscar?', 'Patent war: license or gamble?'),
      body: l('Edison (cilindro), a Graphophone/Columbia (gravação em cera) e Berliner/Victor (disco) se processam e processam quem fabrica sem licença. Em 1902 Victor e Columbia trocam licenças e formam um pool. Licenciar: taxa agora + 6% das vendas físicas até 1912. Arriscar: sem taxa, mas uma liminar pode apreender metade do estoque e trazer multa.',
        'Edison (cylinder), Graphophone/Columbia (wax recording) and Berliner/Victor (disc) sue each other and anyone manufacturing without a license. In 1902 Victor and Columbia cross-license into a pool. License: a fee now + 6% of physical sales until 1912. Gamble: no fee, but an injunction may seize half your stock and bring a fine.'),
      actions: [{ id: 'lic', label: l('Licenciar (taxa + 6%)', 'License (fee + 6%)') }, { id: 'risk', label: l('Arriscar sem licença', 'Gamble without a license') }], weeks: 8,
    });
    return;
  }
  if (st.pat === 'lic') {
    // 6% sobre o faturamento físico estimado do mês (unidades das últimas 4 semanas × preço do formato)
    let gross = 0;
    for (const x of rels) gross += (x.weekly.slice(-4).reduce((t, u) => t + u, 0)) * money(s, 3.4) * 0.65;
    const fee = Math.round(gross * PATENT_FEE_PCT);
    if (fee > 0) post(s, `patent:${s.year}:${s.month}`, -fee, 'royalties', 'Royalties de patentes (pool Victor/Columbia)');
  } else if (st.pat === 'risk' && r.chance(s.year < 1902 ? 0.05 : 0.03)) {
    const hit = rels.filter((x) => x.stock !== Infinity && x.stock > 0);
    for (const x of hit) x.stock = Math.floor(x.stock / 2);
    const fine = money(s, 5000 + 1500 * hit.length);
    post(s, `patent:fine:${s.week}`, -fine, 'legal', 'Liminar de patentes: multa e estoque apreendido');
    st.injunctions++;
    const t = l('Liminar! Um tribunal federal manda apreender metade do seu estoque de discos e cilindros por violação de patente.', 'Injunction! A federal court orders half your disc and cylinder stock seized for patent infringement.');
    notify(s, t, 'bad');
    emitFact(s, { kind: 'case_ruling', actors: ['player'], place: s.config.homeCity, severity: 45, visibility: 'public', tags: ['legal', 'patent'], src: 'era1889', text: t });
  }
}

// ---------------------------------------------------------------- salão de fonógrafos e song pluggers

export const PARLOR_YEARS: [number, number] = [1889, 1906];
export const parlorOpen1889 = (s: GameState): boolean => s.year >= PARLOR_YEARS[0] && s.year < PARLOR_YEARS[1];
export const parlorCost1889 = (s: GameState): number => money(s, 9000);
export function openParlor1889(s: GameState): L | null {
  const st = era1889(s);
  if (!parlorOpen1889(s)) return l('Os salões de fonógrafo já saíram de moda.', 'Phonograph parlors are out of fashion.');
  if (st.parlor !== undefined) return l('Você já tem um salão.', 'You already run a parlor.');
  const c = parlorCost1889(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'venture:parlor1889', -c, 'investments', 'Salão de fonógrafos a moedas');
  st.parlor = s.week;
  remember(s, 'parlor', l('Você abre um salão de fonógrafos: uma moeda, um cilindro, fones de borracha no ouvido.', 'You open a phonograph parlor: one coin, one cylinder, rubber ear tubes.'), { important: true });
  return null;
}
/** Renda mensal estimada do salão (centavos). */
export function parlorIncome1889(s: GameState): number {
  const n = myRels(s, 52).length;
  const fade = s.year < 1898 ? 1 : s.year < 1902 ? 0.8 : 0.55; // a máquina doméstica esvazia os salões
  return Math.round(money(s, (260 + 90 * Math.min(8, n)) * fade) - money(s, 140));
}
export const plugCost1889 = (s: GameState): number => money(s, liveOf(s).scenario?.id === 'tinpan_1910' && !liveOf(s).scenario?.done ? 350 : 700);
export const plugReady1889 = (s: GameState, actId: string): boolean => (era1889(s).plug[actId] ?? -99) <= s.week - 4;
/** Song pluggers: demonstram a canção em lojas e teatros de vaudeville; sobe a expectativa do ato. */
export function plugSong1889(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a) return l('Ato não encontrado.', 'Act not found.');
  if (s.year >= 1930) return l('Com o rádio, o song plugger perdeu a vez.', 'With radio, the song plugger lost his place.');
  if (!plugReady1889(s, actId)) return l('Os pluggers já estão rodando as lojas com essa canção este mês.', 'The pluggers are already working the stores with this song this month.');
  const c = plugCost1889(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `plug:${actId}:${s.week}`, -c, 'promo', 'Song pluggers (Tin Pan Alley)');
  era1889(s).plug[actId] = s.week;
  addHype(s, `a:${actId}`, 'plug1889', l('Song pluggers tocando a canção em lojas e teatros', 'Song pluggers playing the song in stores and theatres'), 7);
  a.momentum = Math.min(100, a.momentum + 3);
  return null;
}

// ---------------------------------------------------------------- linha do tempo real

type Mark = { y: number; m: number; id: string; t: L; g?: [string, number][]; fam?: number };
const MARKS: Mark[] = [
  { y: 1889, m: 4, id: 'expo1889', t: l('Exposição Universal de Paris: multidões ouvem o fonógrafo de Edison na Galeria das Máquinas.', 'Paris Exposition: crowds hear Edison\'s phonograph in the Gallery of Machines.') },
  { y: 1890, m: 5, id: 'parlors', t: l('Salões de fonógrafo a moedas se espalham: o cilindro vira diversão, não ditafone.', 'Coin-in-the-slot phonograph parlors spread: the cylinder becomes entertainment, not a dictation machine.') },
  { y: 1893, m: 4, id: 'panic93', t: l('Pânico de 1893: bancos quebram e a North American Phonograph afunda.', 'Panic of 1893: banks collapse and North American Phonograph sinks.') },
  { y: 1895, m: 3, id: 'berliner', t: l('Berliner vende o disco plano nos EUA: uma matriz, milhares de cópias prensadas.', 'Berliner sells the flat disc in the US: one master, thousands of pressed copies.') },
  { y: 1896, m: 4, id: 'plessy', t: l('Plessy v. Ferguson: a Suprema Corte dos EUA aceita a segregação "separados mas iguais".', 'Plessy v. Ferguson: the US Supreme Court upholds "separate but equal" segregation.') },
  { y: 1896, m: 10, id: 'afm', t: l('Nasce a Federação Americana de Músicos (AFM): cachês mínimos para orquestras e bandas.', 'The American Federation of Musicians (AFM) is founded: minimum fees for orchestras and bands.') },
  { y: 1897, m: 0, id: 'ragtime', t: l('O ragtime toma as partituras: a síncope vira febre nos pianos de sala.', 'Ragtime takes over sheet music: syncopation becomes a parlor-piano craze.'), g: [['ragtime', 1.3]] },
  { y: 1899, m: 1, id: 'nipper', t: l('A Gramophone Co. compra o quadro do cachorro Nipper: "His Master\'s Voice".', 'The Gramophone Co. buys the painting of Nipper the dog: "His Master\'s Voice".') },
  { y: 1902, m: 3, id: 'caruso', t: l('Gaisberg grava Caruso num quarto de hotel em Milão: a ópera dá prestígio ao disco.', 'Gaisberg records Caruso in a Milan hotel room: opera gives the disc prestige.'), g: [['opera', 1.3]] },
  { y: 1902, m: 0, id: 'casaedison', t: l('Rio: a Casa Edison lança "Isto É Bom", com Bahiano — o primeiro disco gravado no Brasil.', 'Rio: Casa Edison releases "Isto É Bom" by Bahiano — the first record made in Brazil.'), g: [['modinha', 1.2], ['maxixe', 1.15]] },
  { y: 1902, m: 6, id: 'pool', t: l('Victor e Columbia trocam licenças de patente: nasce o pool que domina o disco nos EUA.', 'Victor and Columbia cross-license their patents: the pool that will dominate US discs is born.') },
  { y: 1903, m: 0, id: 'twosided', t: l('Discos de dois lados (Odeon) chegam à Europa: duas canções pelo preço de uma.', 'Two-sided discs (Odeon) reach Europe: two songs for the price of one.') },
  { y: 1906, m: 3, id: 'sfquake', t: l('Terremoto de São Francisco: teatros e lojas de discos da cidade viram cinza.', 'San Francisco earthquake: the city\'s theatres and record stores burn down.') },
  { y: 1906, m: 8, id: 'victrola', t: l('A Victor lança a Victrola: a corneta some dentro de um móvel de sala.', 'Victor launches the Victrola: the horn disappears inside a parlor cabinet.') },
  { y: 1907, m: 9, id: 'panic07', t: l('Pânico de 1907: corrida aos bancos de Nova York.', 'Panic of 1907: a run on New York banks.') },
  { y: 1909, m: 2, id: 'copyright', t: l('Lei de Direito Autoral de 1909 (EUA): royalty mecânico compulsório de 2 centavos por cópia — compositores passam a ganhar com discos e rolos.', 'US Copyright Act of 1909: a compulsory 2-cent mechanical royalty per copy — songwriters now earn from records and rolls.') },
  { y: 1911, m: 4, id: 'berlin', t: l('"Alexander\'s Ragtime Band" vende partituras aos milhões: Irving Berlin vira o rei do Tin Pan Alley.', '"Alexander\'s Ragtime Band" sells sheet music by the million: Irving Berlin becomes king of Tin Pan Alley.'), g: [['ragtime', 1.15], ['tin_pan_alley', 1.15]] },
  { y: 1912, m: 3, id: 'titanic', t: l('O Titanic afunda; a banda de bordo tocou até o fim, dizem os sobreviventes.', 'The Titanic sinks; the ship\'s band played to the end, survivors say.') },
  { y: 1912, m: 8, id: 'colcyl', t: l('A Columbia abandona o cilindro: o disco venceu a guerra dos formatos (Edison insiste até 1929).', 'Columbia abandons the cylinder: the disc has won the format war (Edison holds on until 1929).') },
  { y: 1913, m: 10, id: 'sheetlist', t: l('A Billboard começa a publicar as partituras mais vendidas: a primeira "parada".', 'Billboard starts printing the best-selling sheet music: the first "chart".') },
  { y: 1913, m: 11, id: 'dances', t: l('Febre das danças: Vernon e Irene Castle, com a orquestra de James Reese Europe, ensinam o foxtrote e o tango.', 'Dance craze: Vernon and Irene Castle, with James Reese Europe\'s orchestra, teach the foxtrot and tango.'), g: [['tango', 1.3], ['ragtime', 1.1], ['maxixe', 1.2]] },
  { y: 1914, m: 1, id: 'ascap', t: l('Fundada a ASCAP (e a PRS no Reino Unido): restaurantes e teatros terão de pagar pela execução de canções.', 'ASCAP is founded (and the PRS in the UK): restaurants and theatres will have to pay for performing songs.') },
  { y: 1914, m: 7, id: 'ww1', t: l('Começa a Grande Guerra: turnês pela Europa param e as fábricas de discos viram arsenais.', 'The Great War begins: European tours stop and record factories turn into arsenals.'), g: [['march', 1.2]] },
  { y: 1915, m: 1, id: 'birth', t: l('"O Nascimento de uma Nação" estreia; a NAACP protesta contra a caricatura racista — o teatro de menestréis perde público.', '"The Birth of a Nation" premieres; the NAACP protests the racist caricature — minstrel shows lose their audience.'), g: [['minstrel', 0.75]] },
  { y: 1917, m: 1, id: 'odjb', t: l('Sai "Livery Stable Blues": o primeiro disco de jazz, gravado por uma banda branca de Nova Orleans — os pioneiros negros ficaram de fora dos estúdios.', '"Livery Stable Blues" comes out: the first jazz record, by a white New Orleans band — the Black pioneers were kept out of the studios.'), g: [['nola_jazz', 1.5]] },
  { y: 1917, m: 3, id: 'usenter', t: l('Os EUA entram na guerra: "Over There" vira o hino de quem embarca.', 'The US enters the war: "Over There" becomes the anthem of those shipping out.'), g: [['march', 1.15], ['tin_pan_alley', 1.1]] },
  { y: 1917, m: 10, id: 'storyville', t: l('A Marinha fecha Storyville, em Nova Orleans: músicos de jazz sobem o Mississippi rumo a Chicago.', 'The Navy shuts Storyville in New Orleans: jazz musicians head up the Mississippi to Chicago.') },
  { y: 1917, m: 0, id: 'telefone', t: l('Rio: "Pelo Telefone", registrado por Donga, é o primeiro samba gravado com esse nome.', 'Rio: "Pelo Telefone", registered by Donga, is the first recorded song labelled a samba.'), g: [['samba', 1.4]] },
  { y: 1918, m: 9, id: 'flu', t: l('Gripe espanhola: teatros, cinemas e salões de dança fecham por semanas.', 'Spanish flu: theatres, cinemas and dance halls close for weeks.') },
  { y: 1918, m: 10, id: 'armistice', t: l('Armistício: a guerra acaba; bandas militares voltam com o jazz na bagagem.', 'Armistice: the war ends; military bands come home with jazz in their luggage.'), g: [['nola_jazz', 1.15]] },
  { y: 1919, m: 0, id: 'gramophone_boom', t: l('Pós-guerra: as vendas de discos batem recorde e as patentes da Victor expiram — selos novos surgem às dezenas.', 'Post-war: record sales hit records and Victor\'s patents expire — new labels pop up by the dozen.') },
];

function marksMonth(s: GameState): void {
  const st = era1889(s);
  if (s.year > 1920) return;
  for (const k of MARKS) {
    if (st.news[k.id] || k.y > s.year || (k.y === s.year && k.m > s.month)) continue;
    st.news[k.id] = 1;
    if (k.y < s.config.startYear) continue; // já era passado no começo
    for (const [g, mlt] of k.g ?? []) if (s.genrePop[g] !== undefined) s.genrePop[g] = Math.max(0.15, Math.min(2, s.genrePop[g] * mlt));
    remember(s, 'world', k.t, { important: true });
    notify(s, k.t, 'event');
    emitFact(s, { kind: 'memory', actors: [], place: s.config.homeCity, severity: 30, visibility: 'public', tags: ['world', 'era1889'], src: 'era1889', text: k.t });
  }
}
export const marks1889 = (s: GameState): Mark[] => MARKS.filter((k) => k.y < s.year || (k.y === s.year && k.m <= s.month));

// ---------------------------------------------------------------- fusões/fechamentos reais (modo exato)

function fatesMonth(s: GameState): void {
  if (histMode(s) !== 'strict' || s.month !== 6) return;
  const st = era1889(s);
  for (const f of LABEL_FATES_1889) {
    if (st.fates[f.id] || f.y > s.year) continue;
    st.fates[f.id] = 1;
    const lb = s.labels[f.id];
    if (!lb || !lb.active) continue;
    const big = f.into ? s.labels[f.into] : undefined;
    for (const id of [...lb.roster]) {
      const a = s.acts[id];
      if (!a) continue;
      if (big?.active) { big.roster.push(id); a.owner = big.id; const c = a.contractId ? s.contracts[a.contractId] : undefined; if (c) c.party = big.id; }
    }
    lb.roster = [];
    if (big?.active) for (const rel of Object.values(s.releases)) if (rel.owner === lb.id) rel.owner = big.id;
    lb.active = false; lb.closedYear = s.year; if (big) lb.parentLabel = big.id;
    const t = l(f.pt, f.en);
    remember(s, 'label_closed', t, { important: true });
    emitFact(s, { kind: 'deal', actors: [lb.id, ...(big ? [big.id] : [])], severity: 35, visibility: 'public', tags: ['merger', 'era1889'], src: 'era1889', text: t });
  }
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'era1889', (s) => {
  if (s.year > 1931) return;
  ensureGeo();
  const r = Rng.fromSeed(`${s.config.seed}|era1889|${s.week}`);
  marksMonth(s);
  fatesMonth(s);
  patentMonth(s, r);
  const st = era1889(s);
  if (st.parlor !== undefined) {
    if (!parlorOpen1889(s)) {
      st.parlor = undefined;
      remember(s, 'parlor', l('Seu salão de fonógrafos fecha: agora cada sala de estar tem o seu aparelho.', 'Your phonograph parlor closes: every living room now has its own machine.'), { important: true });
    } else {
      const v = parlorIncome1889(s);
      post(s, `parlor:${s.year}:${s.month}`, v, 'live', 'Salão de fonógrafos (moedas)');
      st.parlorEarned += v;
    }
  }
  // menestréis: a forma decai ano a ano a partir de 1900
  if (s.month === 0 && s.year >= 1900 && s.genrePop.minstrel !== undefined) s.genrePop.minstrel = Math.max(0.15, s.genrePop.minstrel * 0.93);
});

// ---------------------------------------------------------------- cenários

const certsOf = (s: GameState) => s.player.stats.gold + s.player.stats.platinum;
const SC_1889: Scenario17[] = [
  {
    id: 'columbia_1889', name: l('Columbia: Washington, 1889', 'Columbia: Washington, 1889'), startYear: 1889, endYear: 1899, homeCity: 'washington', scenario: 'from_zero',
    desc: l('Um grupo de taquígrafos arrenda fonógrafos para escritórios que não querem ditafones. Mas nos salões a moedas o público paga para ouvir a Banda dos Fuzileiros e piadas de vaudeville. E se o fonógrafo for uma máquina de música?',
      'A group of stenographers leases phonographs to offices that do not want dictation machines. But in coin-in-the-slot parlors people pay to hear the Marine Band and vaudeville jokes. What if the phonograph is a music machine?'),
    goal: l('Venda o máximo de cilindros e discos de banda e vaudeville até 1899 (mil unidades).', 'Sell as many band and vaudeville cylinders and discs as you can by 1899 (thousand units).'), unit: l('mil unidades', 'thousand units'), tiers: [40, 120, 300],
    rules17: [l('Até 1902 cada cilindro é uma regravação: fabricar custa mais (use o salão de fonógrafos para faturar).', 'Until 1902 each cylinder is a re-recording: manufacturing costs more (use the phonograph parlor to earn).'),
      l('1893: o pânico financeiro derruba a demanda por três anos.', '1893: the financial panic knocks demand down for three years.'),
      l('Bandas e vaudeville gravam melhor na corneta: +8% de apelo.', 'Bands and vaudeville record best into the horn: +8% appeal.')],
    events17: [{ year: 1890, month: 5, title: l('Salões de fonógrafo lotados', 'Phonograph parlors packed'), text: l('Filas para ouvir marchas e monólogos cômicos por uma moeda.', 'Queues to hear marches and comic monologues for a coin.'), genre: 'march', genreMult: 1.3 }],
    perks17: () => [{ label: l('Cenário: bandas e vaudeville na corneta', 'Scenario: bands and vaudeville into the horn'), values: { appeal: 0.08 }, act: (_s, a) => ['march', 'vaudeville', 'barbershop'].includes(a.genre) }],
    setup: (s, r) => { adjustCash(s, 0.6); signAct(s, r, 'march', 'washington', 12, 4); signAct(s, r, 'vaudeville', 'washington', 6, 1); },
    metric: (s) => Math.round(genreUnits(s, ['march', 'vaudeville', 'barbershop', 'parlor_song']) / 1000), fail: insolvent,
  },
  {
    id: 'casa_edison_1902', name: l('Casa Edison: Rio de Janeiro, 1902', 'Casa Edison: Rio de Janeiro, 1902'), startYear: 1902, endYear: 1917, homeCity: 'rio', scenario: 'from_zero',
    desc: l('Uma loja de novidades na Rua do Ouvidor vende fonógrafos, máquinas de escrever e geladeiras. Agora ela quer gravar a música da cidade: lundus, modinhas, maxixes e choros — gente que a polícia persegue e o salão chama de indecente.',
      'A novelty shop on Rua do Ouvidor sells phonographs, typewriters and iceboxes. Now it wants to record the city\'s music: lundus, modinhas, maxixes and choros — people the police harass and polite society calls indecent.'),
    goal: l('Venda música brasileira (mil unidades) até 1917, quando nasce o samba gravado.', 'Sell Brazilian music (thousand units) by 1917, when recorded samba is born.'), unit: l('mil unidades', 'thousand units'), tiers: [25, 80, 200],
    rules17: [l('Discos vêm prensados da Europa (frete de um mês) até a fábrica nacional de 1913: +15% no custo de fabricação.', 'Discs are pressed in Europe (a month\'s freight) until the national plant of 1913: +15% manufacturing cost.'),
      l('Atos de choro, maxixe e modinha ganham +10% de apelo no Brasil.', 'Choro, maxixe and modinha acts get +10% appeal in Brazil.'),
      l('1917: "Pelo Telefone" — o samba vira gênero de disco.', '1917: "Pelo Telefone" — samba becomes a record genre.')],
    events17: [{ year: 1913, month: 6, title: l('Fábrica Odeon no Rio', 'Odeon plant in Rio'), text: l('A primeira fábrica de discos do Brasil começa a prensar na Tijuca.', 'Brazil\'s first record plant starts pressing in Tijuca.'), cash: 0 },
      { year: 1917, month: 1, title: l('"Pelo Telefone"', '"Pelo Telefone"'), text: l('O samba registrado por Donga toma o carnaval e as lojas.', 'The samba registered by Donga takes over carnival and the shops.'), genre: 'samba', genreMult: 1.5 }],
    perks17: (s) => [{ label: l('Cenário: a música da cidade', 'Scenario: the city\'s music'), values: { appeal: 0.1 }, act: (_s, a) => ['choro', 'maxixe', 'modinha', 'samba', 'marchinha'].includes(a.genre) },
      ...(s.year < 1913 ? [{ label: l('Cenário: discos prensados na Europa', 'Scenario: discs pressed in Europe'), values: { pressingCost: 0.15 } }] : [])],
    setup: (s, r) => { adjustCash(s, 0.7); signAct(s, r, 'modinha', 'rio', 10, 1); signAct(s, r, 'choro', 'rio', 6, 3); },
    metric: (s) => Math.round(genreUnits(s, ['choro', 'maxixe', 'modinha', 'samba', 'marchinha']) / 1000), fail: insolvent,
  },
  {
    id: 'tinpan_1910', name: l('Tin Pan Alley: Nova York, 1910', 'Tin Pan Alley: New York, 1910'), startYear: 1910, endYear: 1919, homeCity: 'new_york', scenario: 'emerging',
    desc: l('Na Rua 28, pianos martelam o dia todo. Uma editora de canções vive de vender partituras: pluggers nas lojas, astros do vaudeville pagos para cantar a sua música, capas coloridas. Os discos são só mais uma vitrine.',
      'On 28th Street pianos pound all day. A song publisher lives on selling sheet music: pluggers in the stores, vaudeville stars paid to sing your song, colorful covers. Records are just another shop window.'),
    goal: l('Conquiste discos de ouro (meio milhão de cópias) até 1919.', 'Earn gold records (half a million copies) by 1919.'), unit: l('certificados', 'certifications'), tiers: [1, 3, 6],
    rules17: [l('Song pluggers custam metade.', 'Song pluggers cost half.'), l('1914: ASCAP — execução pública passa a render.', '1914: ASCAP — public performance starts paying.'), l('1917: a guerra chega aos EUA; marchas e canções patrióticas sobem.', '1917: war reaches the US; marches and patriotic songs rise.')],
    perks17: () => [{ label: l('Cenário: editora do Tin Pan Alley', 'Scenario: Tin Pan Alley publisher'), values: { appeal: 0.05 }, act: (_s, a) => ['tin_pan_alley', 'ragtime', 'vaudeville'].includes(a.genre) }],
    setup: (s, r) => { signAct(s, r, 'tin_pan_alley', 'new_york', 15, 1); signAct(s, r, 'ragtime', 'new_york', 10, 1); },
    metric: (s, b) => certsOf(s) - (b.certs ?? 0), fail: insolvent,
  },
];
for (const d of SC_1889) {
  if (!SCENARIOS17.some((x) => x.id === d.id)) SCENARIOS17.push(d);
  if (!scenarioById[d.id]) { SCENARIOS.push(d); scenarioById[d.id] = d; }
}
