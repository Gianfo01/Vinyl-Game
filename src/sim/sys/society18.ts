// Rodada 18 (society18, frente H — S2/S3/S4) — CENSURA E EXÍLIO, FILANTROPIA, CIDADE DA MÚSICA.
// S2: regimes por país e datas reais (Brasil 1964-85 com AI-5 1968-78, Chile, Argentina, Uruguai, Franco, Salazar, junta
// grega, bloco soviético, Irã 1979+, apartheid, Nigéria militar, Coreia de Park/Chun, caça às bruxas nos EUA). Lançamento
// de um ato seu num regime pode cair no censor: cortar (perde força), letra em código (metáfora: passa ou cai) ou
// desafiar (proibido em casa, culto lá fora, "calor" sobe). Calor alto → exílio (muda de cidade; volta como herói quando
// o regime cai), ficar quieto ou resistir (prisão). Boicote cultural: Sun City (1980-91) paga muito e vira lista negra;
// show privado para família de ditador (2000+). Modo exato: casos reais só como CRÔNICA documentada (sem inventar nada
// para gente real); nos outros, NPCs reais ou fictícios podem ser banidos/exilados (história alternativa).
// S3: campanha beneficente em etapas (causa por época; single, megaconcerto televisionado 1985+ ou fundação): recrutar
// estrelas (relação e fama decidem), egos, arrecadação, taxa administrativa (desvio vira escândalo), "caridade cínica"
// se o elenco teve escândalo recente, honraria de Estado ao acumular filantropia.
// S4: status de Cidade da Música (cena, atos famosos, casas, museu, título UNESCO 2006+ — no exato só as cidades reais
// nas datas reais): museu/hall da fama e rota turística rendem visitantes; lobby na prefeitura (lei do silêncio, "agente
// da mudança"); gentrificação ameaça as casas quando a cidade fica cara.

import { clamp, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type L } from '../../data/world';
import { isPolitical, viewsOf } from '../beliefs';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { scandal, lastScandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { adjRel18, relOf18 } from './agency18';
import { nudge16 } from './fame16';
import { shield18 } from './feud18';
import { playerPerson } from './life';
import { v17, vdef } from './venues17';

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const exact = (s: GameState) => histMode(s) === 'strict';
const mineAct = (s: GameState, a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);

// ================================================================ S2 censura e exílio

export interface Regime18 { id: string; a3: string[]; from: number; to: number; hard?: [number, number]; name: L; censor: L; exile: string[] }
export const REGIMES18: Regime18[] = [
  { id: 'br', a3: ['BRA'], from: 1964, to: 1985, hard: [1968, 1978], name: l('Ditadura militar (Brasil)', 'Military dictatorship (Brazil)'), censor: l('Censura federal (DCDP); AI-5', 'Federal censorship (DCDP); AI-5'), exile: ['london', 'paris'] },
  { id: 'cl', a3: ['CHL'], from: 1973, to: 1990, hard: [1973, 1980], name: l('Ditadura chilena', 'Chilean dictatorship'), censor: l('Junta militar', 'Military junta'), exile: ['paris', 'mexico_city'] },
  { id: 'ar', a3: ['ARG'], from: 1976, to: 1983, hard: [1976, 1981], name: l('Ditadura argentina', 'Argentine dictatorship'), censor: l('Listas negras do governo', 'Government blacklists'), exile: ['madrid', 'mexico_city'] },
  { id: 'uy', a3: ['URY'], from: 1973, to: 1985, name: l('Ditadura uruguaia', 'Uruguayan dictatorship'), censor: l('Junta militar', 'Military junta'), exile: ['madrid', 'buenos_aires'] },
  { id: 'es', a3: ['ESP'], from: 1939, to: 1975, name: l('Regime franquista', 'Franco regime'), censor: l('Censura prévia', 'Prior censorship'), exile: ['paris', 'mexico_city'] },
  { id: 'pt', a3: ['PRT'], from: 1933, to: 1974, name: l('Estado Novo (Portugal)', 'Estado Novo (Portugal)'), censor: l('Lápis azul', 'The blue pencil'), exile: ['paris'] },
  { id: 'gr', a3: ['GRC'], from: 1967, to: 1974, name: l('Junta grega', 'Greek junta'), censor: l('Junta dos coronéis', 'The colonels\' junta'), exile: ['paris'] },
  { id: 'su', a3: ['RUS', 'UKR', 'BLR', 'GEO', 'ARM', 'KAZ', 'EST', 'LVA', 'LTU'], from: 1922, to: 1991, name: l('União Soviética', 'Soviet Union'), censor: l('Glavlit e o comitê de cultura', 'Glavlit and the culture committee'), exile: ['paris', 'new_york'] },
  { id: 'eb', a3: ['CZE', 'POL', 'HUN', 'ROU', 'BGR'], from: 1948, to: 1989, name: l('Bloco do Leste', 'Eastern Bloc'), censor: l('Ministério da Cultura do partido', 'Party culture ministry'), exile: ['vienna', 'berlin'] },
  { id: 'ir', a3: ['IRN'], from: 1979, to: 9999, name: l('República Islâmica do Irã', 'Islamic Republic of Iran'), censor: l('Ministério da Cultura e Orientação Islâmica', 'Ministry of Culture and Islamic Guidance'), exile: ['los_angeles'] },
  { id: 'za', a3: ['ZAF'], from: 1948, to: 1994, name: l('Apartheid', 'Apartheid'), censor: l('Comitê de censura da SABC', 'SABC censorship committee'), exile: ['london', 'new_york'] },
  { id: 'ng', a3: ['NGA'], from: 1966, to: 1999, name: l('Governos militares (Nigéria)', 'Military governments (Nigeria)'), censor: l('Exército', 'The army'), exile: ['london'] },
  { id: 'kr', a3: ['KOR'], from: 1961, to: 1987, name: l('Regimes de Park e Chun', 'Park and Chun regimes'), censor: l('Comitê de ética da arte', 'Art ethics committee'), exile: ['los_angeles'] },
  { id: 'us', a3: ['USA'], from: 1947, to: 1957, name: l('Caça às bruxas', 'Red Scare'), censor: l('Listas negras do rádio e da TV', 'Radio and TV blacklists'), exile: ['paris'] },
  { id: 'ru2', a3: ['RUS'], from: 2012, to: 9999, name: l('Rússia: agentes estrangeiros', 'Russia: foreign agents'), censor: l('Lei de agentes estrangeiros', 'Foreign agents law'), exile: ['berlin', 'london'] },
];
export const regimeAt18 = (s: GameState, a3: string | null): Regime18 | undefined => (a3 ? REGIMES18.find((r) => r.a3.includes(a3) && s.year >= r.from && s.year <= r.to) : undefined);
const hardNow = (s: GameState, r: Regime18) => !!r.hard && s.year >= r.hard[0] && s.year <= r.hard[1];
/** Crônica documentada (só aparece depois da data; no modo exato vira notícia). */
export const CHRON18: [number, number, L][] = [
  [1950, 5, l('Red Channels lista 151 artistas de rádio e TV como "subversivos"; Pete Seeger e os Weavers somem do ar.', 'Red Channels lists 151 radio and TV artists as "subversive"; Pete Seeger and the Weavers vanish from the air.')],
  [1960, 3, l('Miriam Makeba tem o passaporte cassado e fica no exílio por 30 anos.', 'Miriam Makeba has her passport revoked and stays in exile for 30 years.')],
  [1969, 6, l('Caetano Veloso e Gilberto Gil, presos depois do AI-5, partem para o exílio em Londres.', 'Caetano Veloso and Gilberto Gil, jailed after AI-5, leave for exile in London.')],
  [1973, 8, l('Víctor Jara é morto no Estádio Chile dias depois do golpe.', 'Víctor Jara is killed in Estadio Chile days after the coup.')],
  [1973, 10, l('"Cálice", de Chico Buarque e Gil, é vetada; o microfone é cortado no palco.', '"Cálice" by Chico Buarque and Gil is banned; the microphone is cut on stage.')],
  [1976, 8, l('Os Plastic People of the Universe são julgados em Praga; nasce a Carta 77.', 'The Plastic People of the Universe are tried in Prague; Charter 77 is born.')],
  [1977, 1, l('Soldados invadem e queimam a República Kalakuta de Fela Kuti, em Lagos.', 'Soldiers raid and burn Fela Kuti\'s Kalakuta Republic in Lagos.')],
  [1979, 1, l('Mercedes Sosa é presa num show em La Plata e parte para o exílio.', 'Mercedes Sosa is arrested at a show in La Plata and goes into exile.')],
  [1979, 6, l('O Irã proíbe a música popular; Googoosh é silenciada por duas décadas.', 'Iran bans popular music; Googoosh is silenced for two decades.')],
  [1985, 9, l('"Sun City": Artists United Against Apartheid recusa tocar no resort sul-africano.', '"Sun City": Artists United Against Apartheid refuse to play the South African resort.')],
  [1990, 1, l('Hugh Masekela e Miriam Makeba voltam à África do Sul depois da libertação de Mandela.', 'Hugh Masekela and Miriam Makeba return to South Africa after Mandela\'s release.')],
  [2003, 2, l('Rádios country boicotam as Dixie Chicks depois de uma crítica à guerra no palco.', 'Country radio boycotts the Dixie Chicks after an anti-war remark on stage.')],
  [2012, 7, l('Integrantes do Pussy Riot são condenadas a dois anos de prisão em Moscou.', 'Pussy Riot members are sentenced to two years in prison in Moscow.')],
];
export interface Soc18 {
  heat: Record<string, number>;
  exile: Record<string, { from: string; to: string; since: number; reg: string }>;
  banned: Record<string, number>;
  cut: Record<string, number>;
  laylow: Record<string, number>;
  sunCity: string[];
  chron: number;
  /** filantropia */
  camp?: Camp18;
  phil: number; honors: number; past: { y: number; cause: string; raised: number; t: L }[];
  /** cidade da música */
  museum?: { city: string; since: number; vis: number };
  route?: { city: string; since: number };
  council: Record<string, number>;
  unesco: Record<string, number>;
  log: { y: number; t: L }[];
}
export interface Camp18 { cause: string; fmt: 'single' | 'concert' | 'foundation'; stage: 'recruit' | 'make' | 'done'; w: number; stars: string[]; asked: string[]; fee: number; ego?: string }
declare module '../ext4' { interface Ext4 { soc18: Soc18 } }
const init = (): Soc18 => ({ heat: {}, exile: {}, banned: {}, cut: {}, laylow: {}, sunCity: [], chron: 0, phil: 0, honors: 0, past: [], council: {}, unesco: {}, log: [] });
registerExt4('soc18', init);
export function soc18(s: GameState): Soc18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.soc18 ??= init()) as Soc18;
  const d = init();
  for (const k of Object.keys(d) as (keyof Soc18)[]) if (st[k] === undefined) (st as unknown as Record<string, unknown>)[k] = d[k];
  return st;
}
const logS = (s: GameState, t: L) => { const st = soc18(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 40) st.log.length = 40; };

const PROTEST_FAM = new Set(['rock', 'hiphop', 'brazil', 'latin', 'africa', 'country_folk']);
/** Chance de o censor barrar um lançamento (pura). */
export function censorOdds18(s: GameState, a: Act): { p: number; why: [L, number][] } | null {
  const reg = regimeAt18(s, countryOfCity(a.city));
  if (!reg) return null;
  const pol = a.members.some((m) => s.persons[m] && isPolitical(viewsOf(s, m), 60));
  const why: [L, number][] = [[reg.censor, hardNow(s, reg) ? 0.35 : 0.15]];
  if (pol) why.push([l('Integrantes engajados', 'Politically engaged members'), 0.25]);
  if (PROTEST_FAM.has(familyOf(a.genre))) why.push([l('Gênero visado pelo regime', 'Genre targeted by the regime'), 0.1]);
  const h = soc18(s).heat[a.id] ?? 0;
  if (h) why.push([l('Ficha no censor (calor)', 'Censor file (heat)'), h / 300]);
  if ((soc18(s).laylow[a.id] ?? 0) > s.week) why.push([l('Ficando quieto', 'Lying low'), -0.2]);
  return { p: clamp(why.reduce((t, x) => t + x[1], 0), 0, 0.9), why };
}
registerSimHook('launch', 'soc18', (s, _r, arg) => {
  const rel = arg.release, a = rel && s.acts[rel.actId];
  if (!rel || !a || !mineAct(s, a)) return;
  const o = censorOdds18(s, a);
  if (!o) return;
  const r = Rng.fromSeed(`${s.config.seed}|soc18cen|${rel.id}`);
  if (!r.chance(o.p)) return;
  const reg = regimeAt18(s, countryOfCity(a.city))!;
  const comp = Math.max(0, ...a.members.map((m) => s.persons[m]?.skills?.comp ?? 0));
  pushInbox18(s, 'soc18_censor', { from: reg.censor.pt, subject: fmtL(l('Censura: "{t}" foi vetado', 'Censorship: "{t}" was vetoed'), { t: rel.title }),
    body: fmtL(l('{r}. Cortar a letra (passa, mas perde força e o artista se ressente), reescrever em código ({p}% de passar; se cair, é proibido) ou lançar assim mesmo (proibido em casa, culto lá fora, a ficha esquenta).', '{r}. Cut the lyrics (it passes but loses bite and the artist resents it), rewrite in code ({p}% to pass; if caught, it is banned) or release anyway (banned at home, cult abroad, the file heats up).'), { r: reg.name, p: Math.round(codeOdds18(comp) * 100) }),
    ref: { rel: rel.id }, actions: [{ id: 'code', label: l('Reescrever em código', 'Rewrite in code') }, { id: 'defy', label: l('Desafiar', 'Defy') }, { id: 'cut', label: l('Cortar', 'Cut') }], weeks: 3 });
});
export const codeOdds18 = (comp: number) => clamp(0.35 + comp / 180, 0.3, 0.85);
export function censorChoice18(s: GameState, relId: string, ch: 'cut' | 'code' | 'defy', r: Rng): L {
  const st = soc18(s), rel = s.releases[relId], a = rel && s.acts[rel.actId];
  if (!rel || !a || st.banned[relId] || st.cut[relId]) return l('Já decidido.', 'Already decided.');
  const a3 = countryOfCity(a.city) ?? '';
  const ban = (why: L) => {
    st.banned[relId] = s.year;
    st.heat[a.id] = clamp((st.heat[a.id] ?? 0) + 25, 0, 100);
    a.fans.core = Math.round(a.fans.core * 1.08);
    if (a3) nudge16(s, a.id, a3, -3);
    emitFact(s, { kind: 'statement', actors: [a.id], severity: 50, visibility: 'public', tags: ['censorship', 'soc18', 'politics'], src: 'soc18', place: a.city, text: fmtL(l('"{t}", de {a}, é proibido pelo regime: {w}', '"{t}" by {a} is banned by the regime: {w}'), { t: rel.title, a: a.name, w: why }) });
  };
  if (ch === 'cut') { st.cut[relId] = s.year; a.trust = clamp(a.trust - 4, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100); st.heat[a.id] = clamp((st.heat[a.id] ?? 0) - 5, 0, 100); return l('Letra cortada: o disco sai, mais manso.', 'Lyrics cut: the record comes out, tamer.'); }
  if (ch === 'code') {
    const comp = Math.max(0, ...a.members.map((m) => s.persons[m]?.skills?.comp ?? 0));
    if (r.chance(codeOdds18(comp))) { st.cut[relId] = -s.year; st.heat[a.id] = clamp((st.heat[a.id] ?? 0) + 6, 0, 100); a.fame = clamp(a.fame + 1, 0, 100); return l('A metáfora passou pelo censor — e o público entendeu tudo.', 'The metaphor slipped past the censor — and the audience got it all.'); }
    ban(l('o censor decifrou a metáfora', 'the censor decoded the metaphor'));
    return l('O censor decifrou: proibido.', 'The censor decoded it: banned.');
  }
  ban(l('lançado sem cortes', 'released uncut'));
  return l('Desafio: proibido em casa, cultuado lá fora.', 'Defiance: banned at home, a cult abroad.');
}
registerInboxKind('soc18_censor', { label: l('Censura', 'Censorship'), cat: 'decision', icon: 'alert', prio: 3, goto: () => ({ area: 'society18', tab: ['society18', 'censor'] }),
  handle: (s, m, a, r) => censorChoice18(s, String(m.ref?.rel), a as 'cut' | 'code' | 'defy', r) });
/** Efeito de apelo: proibido perde o mercado de casa; metáfora que passou ganha culto; cortado perde força. */
export function censorMult18(s: GameState, relId: string): number {
  const st = soc18(s);
  if (st.banned[relId]) return 0.6;
  const c = st.cut[relId];
  return c === undefined ? 1 : c < 0 ? 1.05 : 0.92;
}
registerMod('appeal', 'soc18', (s, v, c) => {
  if (!c.release) return null;
  const m = censorMult18(s, c.release.id);
  return m !== 1 ? { value: v * m, label: l('Censura', 'Censorship') } : null;
});

function crackdown(s: GameState, r: Rng, a: Act): void {
  const reg = regimeAt18(s, countryOfCity(a.city));
  if (!reg || shield18(s, a.id)) return;
  const to = reg.exile.find((c) => cityById[c]) ?? 'london';
  pushInbox18(s, 'soc18_exile', { from: reg.censor.pt, subject: fmtL(l('{a} está na mira do regime', '{a} is in the regime\'s sights'), { a: a.name }),
    body: fmtL(l('Calor {h}/100. Exílio em {c} (fama em casa esfria, cresce lá fora; volta como herói quando o regime cair), ficar quieto por um ano (sem política; o artista se sente amordaçado) ou resistir (risco de prisão {p}%).', 'Heat {h}/100. Exile in {c} (home fame cools, grows abroad; returns a hero when the regime falls), lie low for a year (no politics; the artist feels gagged) or resist ({p}% arrest risk).'), { h: Math.round(soc18(s).heat[a.id] ?? 0), c: cityById[to]?.name ?? to, p: Math.round(arrestOdds18(s, a) * 100) }),
    ref: { act: a.id, to }, actions: [{ id: 'exile', label: l('Exílio', 'Exile') }, { id: 'resist', label: l('Resistir', 'Resist') }, { id: 'low', label: l('Ficar quieto', 'Lie low') }], weeks: 4 });
}
export const arrestOdds18 = (s: GameState, a: Act) => clamp((soc18(s).heat[a.id] ?? 0) / 150, 0.1, 0.65);
export function exileChoice18(s: GameState, actId: string, to: string, ch: 'exile' | 'resist' | 'low', r: Rng): L {
  const st = soc18(s), a = s.acts[actId];
  const reg = a && regimeAt18(s, countryOfCity(a.city));
  if (!a || !reg) return l('O momento passou.', 'The moment passed.');
  if (ch === 'exile') {
    st.exile[a.id] = { from: a.city, to, since: s.year, reg: reg.id };
    const home = countryOfCity(a.city), dest = countryOfCity(to);
    a.city = to;
    st.heat[a.id] = 0;
    if (home) nudge16(s, a.id, home, -6);
    if (dest) nudge16(s, a.id, dest, 6);
    for (const m of a.members) addStress(s, m, 10, l('Exílio', 'Exile'));
    emitFact(s, { kind: 'statement', actors: [a.id], severity: 60, visibility: 'public', tags: ['censorship', 'soc18', 'exile', 'politics'], src: 'soc18', place: to, text: fmtL(l('{a} parte para o exílio em {c}.', '{a} goes into exile in {c}.'), { a: a.name, c: cityById[to]?.name ?? to }) });
    logS(s, fmtL(l('{a} no exílio ({r}).', '{a} in exile ({r}).'), { a: a.name, r: reg.name }));
    return l('Exílio: longe de casa, mas livre.', 'Exile: far from home, but free.');
  }
  if (ch === 'low') { st.laylow[a.id] = s.week + 52; st.heat[a.id] = clamp((st.heat[a.id] ?? 0) - 30, 0, 100); a.trust = clamp(a.trust - 8, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic - 2, 0, 100); return l('Um ano de silêncio político.', 'A year of political silence.'); }
  if (r.chance(arrestOdds18(s, a))) {
    for (const m of a.members) addStress(s, m, 20, l('Prisão política', 'Political arrest'));
    post(s, `soc18arr:${a.id}:${s.week}`, -money(s, 6000), 'legal', `Advogados: prisão de ${a.name}`);
    a.fame = clamp(a.fame + 3, 0, 100); a.fans.core = Math.round(a.fans.core * 1.1);
    emitFact(s, { kind: 'arrest', actors: [a.id], severity: 65, visibility: 'public', tags: ['censorship', 'soc18', 'politics'], src: 'soc18', place: a.city, text: fmtL(l('{a} é preso(a) pelo regime; o caso vira símbolo.', '{a} is arrested by the regime; the case becomes a symbol.'), { a: a.name }) });
    return l('Preso(a). Mártir para os fãs, pesadelo para o selo.', 'Arrested. A martyr to fans, a nightmare for the label.');
  }
  st.heat[a.id] = clamp((st.heat[a.id] ?? 0) + 10, 0, 100); a.fame = clamp(a.fame + 1, 0, 100);
  return l('Resistiu e escapou — por enquanto.', 'Resisted and got away — for now.');
}
registerInboxKind('soc18_exile', { label: l('Censura', 'Censorship'), cat: 'decision', icon: 'plane', prio: 3, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a, r) => exileChoice18(s, String(m.ref?.act), String(m.ref?.to), a as 'exile' | 'resist' | 'low', r) });
function homecoming(s: GameState, actId: string): L {
  const st = soc18(s), x = st.exile[actId], a = s.acts[actId];
  if (!x || !a) return l('Nada a decidir.', 'Nothing to decide.');
  delete st.exile[actId];
  a.city = x.from;
  const home = countryOfCity(x.from);
  if (home) nudge16(s, a.id, home, 10);
  a.fame = clamp(a.fame + 5, 0, 100);
  emitFact(s, { kind: 'show', actors: [a.id], severity: 60, visibility: 'public', tags: ['good', 'soc18', 'homecoming'], src: 'soc18', place: x.from, text: fmtL(l('{a} volta do exílio: multidão no aeroporto, show histórico.', '{a} returns from exile: crowds at the airport, a historic show.'), { a: a.name }) });
  return l('Volta para casa como herói.', 'Home again as a hero.');
}
registerInboxKind('soc18_home', { label: l('Censura', 'Censorship'), cat: 'decision', icon: 'home', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a) => (a === 'go' ? homecoming(s, String(m.ref?.act)) : l('Fica no exílio, por ora.', 'Stays in exile, for now.')) });

/** Boicote cultural: Sun City (1980-91) e show privado para família de ditador (2000+). */
export function boycottOffer18(s: GameState, actId: string, kind: 'suncity' | 'dictator', yes: boolean): L {
  const a = s.acts[actId];
  if (!a) return l('Proposta vencida.', 'Offer expired.');
  const fee = money(s, (kind === 'suncity' ? 60000 : 90000) + a.fame * 1500);
  if (!yes) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
    a.fans.core = Math.round(a.fans.core * 1.02);
    emitFact(s, { kind: 'statement', actors: [a.id], severity: 35, visibility: 'public', tags: ['good', 'soc18', 'boycott'], src: 'soc18', place: a.city, text: fmtL(kind === 'suncity' ? l('{a} recusa tocar em Sun City: "não vou tocar para o apartheid".', '{a} refuses to play Sun City: "I won\'t play for apartheid".') : l('{a} recusa um cachê milionário de uma família de ditador.', '{a} turns down a huge fee from a dictator\'s family.'), { a: a.name }) });
    return l('Recusado em público: respeito.', 'Refused publicly: respect.');
  }
  post(s, `soc18${kind}:${a.id}:${s.year}`, fee, 'live', kind === 'suncity' ? `Sun City: ${a.name}` : `Show privado: ${a.name}`);
  if (kind === 'suncity') soc18(s).sunCity.push(a.id);
  scandal(s, a.id, 'politics', kind === 'suncity' ? 60 : 50, kind === 'suncity' ? l('Tocou em Sun City, furando o boicote ao apartheid', 'Played Sun City, breaking the apartheid boycott') : l('Tocou na festa da família de um ditador', 'Played a dictator\'s family party'), { tags: ['soc18', 'boycott'] });
  return fmtL(l('Cachê de {v} — e a lista negra.', 'A {v} fee — and the blacklist.'), { v: usd(fee) });
}
registerInboxKind('soc18_boycott', { label: l('Boicote', 'Boycott'), cat: 'deals', icon: 'coins', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a) => boycottOffer18(s, String(m.ref?.act), String(m.ref?.k) as 'suncity' | 'dictator', a === 'yes') });
registerMod('cityDemand', 'soc18', (s, v, c) => {
  // lista negra da ONU: quem tocou em Sun City perde público nos mercados que boicotam até 1994
  if (!c.act || s.year > 1994 || !soc18(s).sunCity.includes(c.act.id)) return null;
  return { value: v * 0.85, label: l('Lista negra (Sun City)', 'Blacklist (Sun City)') };
});

function censorMonth(s: GameState, r: Rng): void {
  const st = soc18(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a) continue;
    if ((st.heat[id] ?? 0) > 0) st.heat[id] = clamp(st.heat[id] - 1, 0, 100);
    if ((st.heat[id] ?? 0) >= 60 && !st.exile[id] && r.chance(0.25)) crackdown(s, r, a);
    // regime caiu: convite para voltar
    const x = st.exile[id];
    if (x) { const reg = REGIMES18.find((g) => g.id === x.reg); if (reg && s.year > reg.to && s.month === 2) pushInbox18(s, 'soc18_home', { from: a.name, subject: fmtL(l('{r} acabou: {a} pode voltar', '{r} is over: {a} can go home'), { r: reg.name, a: a.name }), body: l('Volta triunfal (fama em casa +10, show histórico) ou seguir carreira no exílio.', 'Triumphant return (home fame +10, historic show) or keep the career abroad.'), ref: { act: id }, actions: [{ id: 'go', label: l('Voltar', 'Go home') }, { id: 'stay', label: l('Ficar', 'Stay') }] }); }
    if (a.fame >= 35 && s.year >= 1980 && s.year <= 1991 && r.chance(0.01)) pushInbox18(s, 'soc18_boycott', { from: 'Sun City', subject: fmtL(l('Convite de Sun City para {a}', 'Sun City invites {a}'), { a: a.name }), body: fmtL(l('Cachê de {v} para tocar no resort da África do Sul. Há boicote cultural da ONU ao apartheid.', 'A {v} fee to play the South African resort. There is a UN cultural boycott of apartheid.'), { v: usd(money(s, 60000 + a.fame * 1500)) }), ref: { act: id, k: 'suncity' }, actions: [{ id: 'yes', label: l('Aceitar', 'Accept') }, { id: 'no', label: l('Recusar publicamente', 'Refuse publicly') }] });
    if (a.fame >= 50 && s.year >= 2000 && r.chance(0.004)) pushInbox18(s, 'soc18_boycott', { from: l('Intermediário', 'Middleman').pt, subject: fmtL(l('Festa privada para {a}', 'Private party for {a}'), { a: a.name }), body: fmtL(l('{v} por uma hora numa festa de família de um ditador. Se vazar, escândalo.', '{v} for one hour at a dictator\'s family party. If it leaks, scandal.'), { v: usd(money(s, 90000 + a.fame * 1500)) }), ref: { act: id, k: 'dictator' }, actions: [{ id: 'yes', label: l('Aceitar', 'Accept') }, { id: 'no', label: l('Recusar', 'Refuse') }] });
  }
  // crônica documentada (exato) / NPCs sob regime (história alternativa)
  for (const [y, m, t] of CHRON18) {
    const k = y * 12 + m;
    if (k <= st.chron || s.year * 12 + s.month < k) continue;
    st.chron = k;
    if (exact(s) && s.config.realNames && s.year - y <= 1) emitFact(s, { kind: 'statement', actors: [], severity: 45, visibility: 'public', tags: ['censorship', 'soc18', 'chronicle'], src: 'soc18', text: t });
  }
  if (!exact(s) && s.month === 6) {
    const pool = Object.values(s.acts).filter((a) => !mineAct(s, a) && a.fame >= 30 && a.status !== 'retired' && a.status !== 'split' && !st.exile[a.id] && regimeAt18(s, countryOfCity(a.city)));
    if (pool.length && r.chance(0.3)) {
      const a = r.pick(pool), reg = regimeAt18(s, countryOfCity(a.city))!;
      const to = reg.exile.find((c) => cityById[c]);
      if (to && r.chance(0.4)) { st.exile[a.id] = { from: a.city, to, since: s.year, reg: reg.id }; a.city = to; }
      emitFact(s, { kind: 'statement', actors: [a.id], severity: 45, visibility: 'public', tags: ['censorship', 'soc18', 'alt_history'], src: 'soc18', place: a.city, text: fmtL(to && st.exile[a.id] ? l('{a} deixa o país sob {r} e segue carreira em {c}.', '{a} leaves the country under {r} and works on from {c}.') : l('{r} proíbe as músicas de {a}.', '{r} bans {a}\'s songs.'), { a: a.name, r: reg.name, c: to ? cityById[to]?.name ?? to : '' }) });
    }
  }
}

// ================================================================ S3 filantropia

export const CAUSES18: { id: string; name: L; from: number; to?: number; w: number }[] = [
  { id: 'war', name: l('Socorro de guerra', 'War relief'), from: 1914, to: 1950, w: 1 },
  { id: 'disaster', name: l('Vítimas de catástrofe', 'Disaster victims'), from: 1900, w: 1 },
  { id: 'famine', name: l('Fome na África', 'Famine relief'), from: 1971, w: 1.3 },
  { id: 'farm', name: l('Agricultores falidos', 'Bankrupt farmers'), from: 1985, w: 0.9 },
  { id: 'aids', name: l('Luta contra a AIDS', 'Fight against AIDS'), from: 1985, w: 1.1 },
  { id: 'apartheid', name: l('Contra o apartheid', 'Against apartheid'), from: 1985, to: 1994, w: 1.1 },
  { id: 'refugees', name: l('Refugiados', 'Refugees'), from: 1990, w: 1 },
  { id: 'climate', name: l('Clima', 'Climate'), from: 2005, w: 1 },
  { id: 'children', name: l('Hospitais infantis', 'Children\'s hospitals'), from: 1900, w: 1 },
];
export const causesNow18 = (s: GameState) => CAUSES18.filter((c) => s.year >= c.from && (!c.to || s.year <= c.to));
export const FMT18: Record<Camp18['fmt'], { name: L; desc: L; cost: number; from: number }> = {
  single: { name: l('Single beneficente', 'Charity single'), desc: l('Várias estrelas numa faixa; sai em 2 meses.', 'Many stars on one track; out in 2 months.'), cost: 15000, from: 1940 },
  concert: { name: l('Megaconcerto beneficente', 'Benefit mega-concert'), desc: l('Estádio e transmissão (mundial a partir de 1985); mais caro, arrecada mais.', 'Stadium and broadcast (worldwide from 1985); pricier, raises more.'), cost: 60000, from: 1950 },
  foundation: { name: l('Fundação permanente', 'Permanent foundation'), desc: l('Doa 3% do lucro operacional ao ano; reputação lenta e sólida.', 'Gives 3% of operating profit a year; slow, solid reputation.'), cost: 10000, from: 1900 },
};
export function startCharity18(s: GameState, cause: string, fmt: Camp18['fmt'], fee: number): L | null {
  const st = soc18(s);
  if (st.camp && st.camp.stage !== 'done') return l('Já há uma campanha em andamento.', 'A campaign is already running.');
  if (!causesNow18(s).some((c) => c.id === cause)) return l('Causa indisponível nesta época.', 'Cause unavailable in this era.');
  if (s.year < FMT18[fmt].from) return l('Formato ainda não existe.', 'Format not available yet.');
  const c = money(s, FMT18[fmt].cost);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `soc18ch:${s.week}`, -c, 'marketing', `Campanha beneficente: ${FMT18[fmt].name.pt}`);
  const own = playerActs(s).filter((id) => s.acts[id] && s.acts[id].status !== 'retired').sort((a, b) => s.acts[b].fame - s.acts[a].fame).slice(0, 3);
  st.camp = { cause, fmt, stage: fmt === 'foundation' ? 'done' : 'recruit', w: s.week, stars: own, asked: [], fee: clamp(fee, 0, 0.25) };
  if (fmt === 'foundation') { st.phil += 5; logS(s, l('Fundação criada.', 'Foundation created.')); }
  return null;
}
/** Chance de uma estrela de fora topar (fama dela, relação com você, causa da moda). */
export function joinOdds18(s: GameState, a: Act): number {
  const rel = a.members[0] ? relOf18(s, `p:${a.members[0]}`, 'player') : 0;
  return clamp(0.35 + rel / 150 - (a.fame - 40) / 150 + soc18(s).phil / 200, 0.05, 0.9);
}
export function invite18(s: GameState, actId: string): L | null {
  const st = soc18(s), c = st.camp, a = s.acts[actId];
  if (!c || c.stage !== 'recruit' || !a) return l('Sem recrutamento aberto.', 'No recruiting open.');
  if (c.asked.includes(actId) || c.stars.includes(actId)) return l('Já convidado.', 'Already invited.');
  if (c.asked.length >= 8) return l('Limite de 8 convites.', 'Limit of 8 invitations.');
  c.asked.push(actId);
  const r = Rng.fromSeed(`${s.config.seed}|soc18inv|${actId}|${c.w}`);
  if (!r.chance(joinOdds18(s, a))) return fmtL(l('{a} declina (agenda cheia).', '{a} declines (busy schedule).'), { a: a.name });
  c.stars.push(actId);
  if (a.fame >= 60 && r.chance(0.3)) c.ego = actId;
  return null;
}
export const raised18 = (s: GameState, c: Camp18): number => {
  const fame = c.stars.reduce((t, id) => t + (s.acts[id]?.fame ?? 0), 0);
  const w = CAUSES18.find((x) => x.id === c.cause)?.w ?? 1;
  const big = c.fmt === 'concert' ? (s.year >= 1985 ? 3.2 : 1.8) : 1;
  return money(s, fame * 900 * big * w);
};
function charityStep(s: GameState, r: Rng): void {
  const st = soc18(s), c = st.camp;
  if (!c || c.stage === 'done') return;
  if (c.stage === 'recruit' && s.week - c.w >= 6) {
    c.stage = 'make';
    if (c.ego) {
      const e = s.acts[c.ego], other = c.stars.find((x) => x !== c.ego && (s.acts[x]?.fame ?? 0) >= 45);
      if (e && other && e.members[0] && s.acts[other]?.members[0]) adjRel18(s, `p:${e.members[0]}`, `p:${s.acts[other].members[0]}`, -15, l('Briga pela linha principal', 'Fight over the lead line'));
      if (e) emitFact(s, { kind: 'statement', actors: [e.id], severity: 35, visibility: 'public', tags: ['soc18', 'charity', 'ego'], src: 'soc18', place: e.city, text: fmtL(l('{a} exige cantar o refrão principal na gravação beneficente.', '{a} demands the lead chorus on the charity recording.'), { a: e.name }) });
    }
    return;
  }
  if (c.stage === 'make' && s.week - c.w >= 9) {
    c.stage = 'done';
    const tot = raised18(s, c), keep = Math.round(tot * c.fee);
    if (keep) post(s, `soc18adm:${c.w}`, keep, 'other_income', 'Taxa administrativa de campanha beneficente');
    const cause = CAUSES18.find((x) => x.id === c.cause)!;
    const cyn = c.stars.some((id) => { const m = lastScandal(s, id); return !!m && s.week - m.w < 26; });
    const gain = (cyn ? 1.5 : 3) + c.stars.length * 0.4;
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + gain, 0, 100);
    s.player.reputation.artists = clamp(s.player.reputation.artists + 1, 0, 100);
    for (const id of c.stars) { const a = s.acts[id]; if (!a) continue; a.fame = clamp(a.fame + (c.fmt === 'concert' ? 2.5 : 1.2), 0, 100); a.fans.casual += Math.round(5000 * (c.fmt === 'concert' ? 3 : 1)); if (!mineAct(s, a) && a.members[0]) adjRel18(s, `p:${a.members[0]}`, 'player', 8, l('Fizemos o bem juntos', 'We did good together')); }
    st.phil += c.fmt === 'concert' ? 12 : 7;
    const t = fmtL(c.fmt === 'concert' ? l('Megaconcerto por "{c}" com {n} atrações arrecada {v}.', 'Mega-concert for "{c}" with {n} acts raises {v}.') : l('Single beneficente por "{c}" com {n} estrelas arrecada {v}.', 'Charity single for "{c}" with {n} stars raises {v}.'), { c: cause.name, n: c.stars.length, v: usd(tot - keep) });
    st.past.unshift({ y: s.year, cause: c.cause, raised: tot - keep, t }); if (st.past.length > 20) st.past.length = 20;
    emitFact(s, { kind: 'show', actors: ['player', ...c.stars], severity: c.fmt === 'concert' ? 60 : 45, visibility: 'public', tags: ['good', 'soc18', 'charity'], src: 'soc18', place: s.config.homeCity, text: t });
    if (cyn) emitFact(s, { kind: 'statement', actors: ['player'], severity: 40, visibility: 'public', tags: ['bad', 'soc18', 'charity'], src: 'soc18', place: s.config.homeCity, text: l('Colunistas chamam a campanha de "caridade cínica" para limpar a imagem do elenco.', 'Columnists call the campaign "cynical charity" to clean up the roster\'s image.') });
    if (c.fee > 0.04 && r.chance(c.fee >= 0.15 ? 0.4 : 0.1)) {
      scandal(s, c.stars[0] ?? 'player', 'money', c.fee >= 0.15 ? 60 : 35, fmtL(l('Auditoria: só {p}% do dinheiro chegou à causa', 'Audit: only {p}% of the money reached the cause'), { p: Math.round((1 - c.fee) * 100) }), { tags: ['soc18', 'charity', 'fraud'] });
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 8, 0, 100);
      st.phil = Math.max(0, st.phil - 15);
    }
    logS(s, t);
    // honraria de Estado
    if (st.phil >= 30 * (st.honors + 1)) {
      st.honors++;
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + 5, 0, 100);
      const p = playerPerson(s);
      emitFact(s, { kind: 'award', actors: ['player', ...(p ? [p.id] : [])], severity: 55, visibility: 'public', tags: ['good', 'soc18', 'honor'], src: 'soc18', place: s.config.homeCity, text: fmtL(l('{p} recebe uma honraria de Estado pelos serviços à música e à caridade.', '{p} receives a state honour for services to music and charity.'), { p: p?.name ?? s.config.companyName }) });
    }
  }
}

// ================================================================ S4 cidade da música

export const UNESCO18: [string, number][] = [['sevilla', 2006], ['glasgow', 2008], ['bogota', 2012], ['liverpool', 2015], ['salvador', 2015], ['kingston', 2015], ['medellin', 2015], ['adelaide', 2015], ['kinshasa', 2015], ['kansas_city', 2017], ['auckland', 2017], ['chennai', 2017]];
export function cityScore18(s: GameState, city: string): { v: number; why: [L, number][] } {
  const st = soc18(s), why: [L, number][] = [];
  const acts = Object.values(s.acts).filter((a) => a.city === city && a.fame >= 40 && a.status !== 'split');
  if (acts.length) why.push([fmtL(l('{n} atos famosos da cidade', '{n} famous acts from the city'), { n: acts.length }), Math.min(35, acts.length * 4)]);
  const legends = Object.values(s.acts).filter((a) => a.city === city && (a.awards ?? 0) >= 2).length;
  if (legends) why.push([l('Lendas premiadas', 'Award-winning legends'), Math.min(15, legends * 3)]);
  const own = v17(s).own.filter((o) => vdef(o.id)?.city === city).length;
  if (own) why.push([l('Suas casas de show', 'Your venues'), own * 5]);
  if (st.museum?.city === city) why.push([l('Museu da música', 'Music museum'), 12]);
  if (st.route?.city === city) why.push([l('Rota turística', 'Tourist route'), 5]);
  if ((st.council[city] ?? 0) > s.year - 10) why.push([l('Lei pró-casas de show', 'Pro-venue ordinance'), 6]);
  if (st.unesco[city]) why.push([l('Cidade da Música UNESCO', 'UNESCO City of Music'), 15]);
  return { v: clamp(why.reduce((t, x) => t + x[1], 0), 0, 100), why };
}
export const museumCost18 = (s: GameState) => money(s, 250000);
export const routeCost18 = (s: GameState) => money(s, 20000);
export function buildMuseum18(s: GameState, kind: 'museum' | 'route'): L | null {
  const st = soc18(s), city = s.config.homeCity;
  if (kind === 'museum' ? st.museum : st.route) return l('Já existe.', 'Already exists.');
  if (kind === 'route' && cityScore18(s, city).v < 15) return l('A cidade ainda não tem lugares que atraiam turistas (pontuação 15+).', 'The city has no sites that draw tourists yet (score 15+).');
  const v = kind === 'museum' ? museumCost18(s) : routeCost18(s);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `venture:soc18${kind}`, -v, 'capex', kind === 'museum' ? 'Museu da música' : 'Rota turística musical');
  if (kind === 'museum') st.museum = { city, since: s.year, vis: 0 }; else st.route = { city, since: s.year };
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 35, visibility: 'public', tags: ['good', 'soc18', 'tourism'], src: 'soc18', place: city, text: fmtL(kind === 'museum' ? l('{c} inaugura um museu da música em {x}.', '{c} opens a music museum in {x}.') : l('{c} lança uma rota turística musical em {x}.', '{c} launches a music tourist route in {x}.'), { c: s.config.companyName, x: cityById[city]?.name ?? city }) });
  return null;
}
export function lobbyCouncil18(s: GameState): L | null {
  const st = soc18(s), city = s.config.homeCity;
  if ((st.council[city] ?? 0) > s.year - 10) return l('A lei já está em vigor.', 'The ordinance is already in force.');
  const v = money(s, 12000);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `soc18cn:${s.week}`, -v, 'misc', 'Lobby na câmara municipal');
  const r = Rng.fromSeed(`${s.config.seed}|soc18cn|${s.week}`);
  if (!r.chance(clamp(0.3 + s.player.reputation.institutional / 200 + cityScore18(s, city).v / 300, 0.15, 0.85))) return l('A câmara engaveta o projeto.', 'The council shelves the bill.');
  st.council[city] = s.year;
  logS(s, l('Aprovada a lei que protege casas de show de vizinhos novos ("agente da mudança").', 'Ordinance passed protecting venues from new neighbours ("agent of change").'));
  return null;
}
export function applyUnesco18(s: GameState): L | null {
  const st = soc18(s), city = s.config.homeCity;
  if (s.year < 2006) return l('O título ainda não existe.', 'The title does not exist yet.');
  if (st.unesco[city]) return l('A cidade já tem o título.', 'The city already holds the title.');
  if (exact(s)) return l('Modo exato: o título segue as cidades e datas reais.', 'Exact mode: the title follows the real cities and dates.');
  const sc = cityScore18(s, city).v;
  if (sc < 45) return fmtL(l('Candidatura fraca: pontuação {v}/45.', 'Weak bid: score {v}/45.'), { v: sc });
  const v = money(s, 30000);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `soc18un:${s.year}`, -v, 'misc', 'Candidatura UNESCO');
  if (!Rng.fromSeed(`${s.config.seed}|soc18un|${s.year}`).chance(clamp(sc / 100, 0.3, 0.8))) return l('Candidatura recusada este ano.', 'Bid rejected this year.');
  st.unesco[city] = s.year;
  emitFact(s, { kind: 'award', actors: ['player'], severity: 50, visibility: 'public', tags: ['good', 'soc18', 'unesco'], src: 'soc18', place: city, text: fmtL(l('{x} vira Cidade da Música da UNESCO (história alternativa).', '{x} becomes a UNESCO City of Music (alternate history).'), { x: cityById[city]?.name ?? city }) });
  return null;
}
export const tourismMonth18 = (s: GameState): number => {
  const st = soc18(s);
  let v = 0;
  if (st.museum) v += money(s, 180 * cityScore18(s, st.museum.city).v);
  if (st.route) v += money(s, 40 * cityScore18(s, st.route.city).v);
  return v;
};
registerMod('showRevenue', 'soc18', (s, v, c) => {
  if (!c.cityId) return null;
  const sc = cityScore18(s, c.cityId).v;
  return sc >= 40 ? { value: v * (1 + (sc - 40) / 600), label: l('Turismo musical', 'Music tourism') } : null;
});
function cityMonth(s: GameState, r: Rng): void {
  const st = soc18(s);
  const t = tourismMonth18(s);
  if (t) { post(s, `soc18tour:${s.week}`, t, 'tourism', 'Visitantes: museu e rota musical'); post(s, `soc18up:${s.week}`, -Math.round(t * 0.45), 'misc', 'Manutenção: museu e rota'); if (st.museum) st.museum.vis += Math.round(t / Math.max(1, money(s, 15))); }
  if (exact(s) && s.config.realNames) for (const [c, y] of UNESCO18) if (s.year >= y && !st.unesco[c] && cityById[c]) st.unesco[c] = y;
  // gentrificação: cidade famosa encarece e ameaça casas próprias
  const city = s.config.homeCity;
  if (s.year >= 1990 && cityScore18(s, city).v >= 35 && r.chance(0.02)) {
    const o = v17(s).own.find((x) => vdef(x.id)?.city === city);
    if (o) pushInbox18(s, 'soc18_rent', { from: l('Proprietário', 'Landlord').pt, subject: fmtL(l('{v}: aluguel vai dobrar', '{v}: rent is doubling'), { v: vdef(o.id)?.name ?? '?' }), body: fmtL(l('O bairro ficou caro. Pagar {c} agora, ou brigar na câmara ({p}% de vencer; melhor com lei pró-casas).', 'The neighbourhood got pricey. Pay {c} now, or fight at the council ({p}% to win; better with the pro-venue ordinance).'), { c: usd(money(s, 20000)), p: Math.round(rentOdds18(s) * 100) }), ref: { v: o.id }, actions: [{ id: 'fight', label: l('Brigar', 'Fight') }, { id: 'pay', label: l('Pagar', 'Pay') }], weeks: 4 });
  }
}
export const rentOdds18 = (s: GameState) => clamp(0.35 + ((soc18(s).council[s.config.homeCity] ?? -99) > s.year - 10 ? 0.35 : 0), 0.2, 0.85);
registerInboxKind('soc18_rent', { label: l('Cidade', 'City'), cat: 'money', icon: 'home', prio: 2, goto: () => ({ area: 'society18', tab: ['society18', 'city'] }),
  handle: (s, m, a, r) => {
    if (a === 'pay') { post(s, `soc18rent:${s.week}`, -money(s, 20000), 'misc', 'Reajuste do aluguel'); return l('Pago.', 'Paid.'); }
    if (r.chance(rentOdds18(s))) return l('A câmara protege a casa: aluguel congelado.', 'The council protects the venue: rent frozen.');
    const o = v17(s).own.find((x) => x.id === String(m.ref?.v)); if (o) o.rep = clamp(o.rep - 10, 0, 100);
    post(s, `soc18rentl:${s.week}`, -money(s, 30000), 'legal', 'Derrota na disputa do aluguel');
    return l('Perdeu: paga mais caro e a casa sofre.', 'Lost: you pay more and the venue suffers.');
  } });

// ================================================================ tick, explicações, dicas

registerSimHook('month', 'soc18', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}|soc18|${s.week}`);
  censorMonth(s, r);
  charityStep(s, r);
  cityMonth(s, r);
});
registerSimHook('year', 'soc18', (s) => {
  const st = soc18(s);
  if (st.camp?.fmt === 'foundation') {
    const prof = s.player.profitByYear?.[s.year - 1] ?? 0;
    const v = Math.max(money(s, 2000), Math.round(prof * 0.03));
    post(s, `soc18fd:${s.year}`, -v, 'misc', 'Doação anual da fundação');
    st.phil += 3; s.player.reputation.institutional = clamp(s.player.reputation.institutional + 0.8, 0, 100);
  }
});
registerExplain('soc18.censor', (s, c) => {
  const a = s.acts[String(c.act)];
  const o = a && censorOdds18(s, a);
  if (!o) return null;
  return { title: l('Chance de veto do censor', 'Censor veto chance'), value: o.p, fmt: 'pct', parts: o.why.map(([label, value]) => ({ label, value, fmt: 'pct' as const })), note: l('Por lançamento, no país natal do ato sob regime.', 'Per release, in the act\'s home country under a regime.') };
});
registerExplain('soc18.city', (s, c) => {
  const city = String(c.city ?? s.config.homeCity), x = cityScore18(s, city);
  return { title: l('Cidade da música', 'Music city'), value: x.v, fmt: 'num', parts: x.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const })), note: l('40+ aumenta a renda dos shows na cidade; museu e rota pagam por visitante.', '40+ raises show revenue in the city; museum and route pay per visitor.') };
});
registerExplain('soc18.raise', (s) => {
  const c = soc18(s).camp;
  if (!c) return null;
  return { title: l('Arrecadação prevista', 'Expected funds raised'), value: raised18(s, c), fmt: 'money', parts: [
    { label: l('Fama somada das estrelas', 'Combined star fame'), value: c.stars.reduce((t, id) => t + (s.acts[id]?.fame ?? 0), 0), fmt: 'num' },
    { label: l('Formato', 'Format'), value: c.fmt === 'concert' ? (s.year >= 1985 ? 3.2 : 1.8) : 1, fmt: 'mult' },
    { label: l('Taxa administrativa retida', 'Admin fee kept'), value: c.fee, fmt: 'pct', tone: c.fee > 0.04 ? 'bad' : '' }],
    note: l('Taxa acima de 4% pode virar escândalo de desvio na auditoria.', 'A fee above 4% may become a diversion scandal at audit.') };
});
registerAdvisorTip('soc18', (s) => {
  const st = soc18(s), out = [] as ReturnType<Parameters<typeof registerAdvisorTip>[1]>;
  for (const id of playerActs(s)) { const h = st.heat[id] ?? 0; if (h >= 45) { out.push({ id: `soc18-heat-${id}`, level: 'warn', cat: 'people', score: 55, text: fmtL(l('{a} está com ficha quente no censor ({h}/100).', '{a} has a hot censor file ({h}/100).'), { a: s.acts[id]?.name ?? '?', h: Math.round(h) }), goto: { area: 'society18', tab: ['society18', 'censor'] } }); break; } }
  if (st.camp?.stage === 'recruit') out.push({ id: 'soc18-recruit', level: 'info', cat: 'opportunity', score: 40, text: fmtL(l('Campanha beneficente recrutando: {n} estrela(s).', 'Charity campaign recruiting: {n} star(s).'), { n: st.camp.stars.length }), goto: { area: 'society18', tab: ['society18', 'charity'] } });
  return out;
});
