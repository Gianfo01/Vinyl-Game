// IA, consentimento e autoria como crise estrutural (rodada 8, §3.7). Não é um botão "usar IA ou não":
// o selo negocia consentimento por artista (voz e treino, com fatia e crédito), recebe propostas de
// empresas de modelos para licenciar catálogo, voz ou estilo, enfrenta imitações não autorizadas,
// decide quanto usa produção sintética, pode buscar a certificação "Feito por Humanos" e opera sob leis
// diferentes por país (transparência, consentimento, restrição) com risco de bloqueio de distribuição.
//
// Nenhuma postura é a certa: escala sintética e licenças sem consentimento trazem margem e alcance mas
// corroem a confiança do público, dos artistas e o valor do catálogo; consentimento e certificação
// custam caro no curto prazo e rendem reputação, comunidade e acesso a prêmios próprios. Há também um
// caminho licenciado (vozes com consentimento, crédito e fatia justa) com o seu próprio prêmio.

import { clamp, type Rng } from '../../core/rng';
import { COUNTRY_INFO, countryMarketSize } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { familyOf, l, type L, type MarketId } from '../../data/world';
import { fileLawsuit } from '../business';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { songQ } from '../production';
import type { Act, GameState, Release } from '../types';
import { fmtL, hasTech, money, nextId, notify, playerActs, post, remember, staffSkill } from '../util';
import { hasSpec, influence } from './crew8';

export type ConsentVal = 'g' | 'r';
export interface ConsentRec { v?: ConsentVal; t?: ConsentVal; sh: number; cr: boolean; w: number }
export type AiScope = 'catalog' | 'voices' | 'style';
export interface AiOffer { id: string; co: string; scope: AiScope; upfront: number; monthly: number; months: number; credit: boolean; consentOnly: boolean; expires: number }
export interface AiDeal { id: string; co: string; scope: AiScope; monthly: number; until: number; credit: boolean; consentOnly: boolean; acts: string[] }
export interface Imitation { id: string; actId: string; by: string; week: number; until?: number }
export type AiUse = 0 | 1 | 2;

export interface AiState {
  /** confiança do público na autoria do selo 0..100 */
  trust: number;
  consent: Record<string, ConsentRec>;
  offers: AiOffer[];
  deals: AiDeal[];
  imit: Imitation[];
  /** uso de IA na produção: 0 nenhum, 1 assistência, 2 escala sintética */
  use: AiUse;
  cert?: { since: number; next: number };
  /** diluição do valor do catálogo por treino de modelos 0..0.35 */
  dil: number;
  /** bloqueios de distribuição por país (até a semana) */
  blocks: Record<string, number>;
  /** anos de antecipação (−) ou atraso (+) das leis por lobby */
  lobby: Record<string, number>;
  /** nível de lei já anunciado por país */
  lv: Record<string, number>;
  awards: { year: number; kind: 'human' | 'synth' }[];
  last: { voice: number; scale: number; deals: number };
  scandal?: 1;
  log: { week: number; text: L; tone?: 'good' | 'bad' }[];
}

declare module '../ext4' { interface Ext4 { ai8: AiState } }
registerExt4('ai8', () => ({ trust: 62, consent: {}, offers: [], deals: [], imit: [], use: 0, dil: 0, blocks: {}, lobby: {}, lv: {}, awards: [], last: { voice: 0, scale: 0, deals: 0 }, log: [] }));
export const ai = (s: GameState): AiState => (s as unknown as { x4: { ai8: AiState } }).x4.ai8;

// ---------------------------------------------------------------- leis por país

export const LAW_NAME: L[] = [
  l('Vácuo legal', 'Legal vacuum'),
  l('Transparência: rótulo de IA', 'Transparency: AI labels'),
  l('Consentimento e remuneração', 'Consent and pay'),
  l('Restrição forte', 'Strict restriction'),
];
export const LAW_DESC: L[] = [
  l('Vale quase tudo; processar imitação é difícil.', 'Almost anything goes; suing imitators is hard.'),
  l('Conteúdo sintético precisa de rótulo; o público vê o que é IA.', 'Synthetic content must be labeled; the public sees what is AI.'),
  l('Treino e voz exigem consentimento e pagamento; voz sem autorização pode ser bloqueada.', 'Training and voices need consent and pay; unauthorized voices may be blocked.'),
  l('Sintético sem licença sai das lojas; até o licenciado corre algum risco.', 'Unlicensed synthetic content is pulled; even licensed content carries some risk.'),
];

/** Ano em que cada país chega a cada nível (transparência, consentimento, restrição). */
const LAW_YEARS: Record<string, [number | null, number | null, number | null]> = {
  USA: [2024, 2030, null], CAN: [2025, 2030, null], MEX: [2026, 2033, null], BRA: [2025, 2028, null], ARG: [2027, 2034, null], COL: [2027, 2035, null], CHL: [2026, 2033, null],
  GBR: [2025, 2029, null], IRL: [2024, 2027, 2034], FRA: [2024, 2027, 2033], DEU: [2024, 2027, 2033], ITA: [2024, 2027, 2034], ESP: [2024, 2027, 2034], PRT: [2024, 2028, 2035], NLD: [2024, 2027, 2034], SWE: [2024, 2027, 2034], POL: [2025, 2028, 2036],
  RUS: [2025, 2026, 2029], TUR: [2026, 2029, null], EGY: [2028, null, null], NGA: [2028, 2036, null], GHA: [2030, null, null], ZAF: [2027, 2034, null], KEN: [2029, null, null],
  IND: [2026, 2032, null], JPN: [2027, 2035, null], KOR: [2024, 2028, null], CHN: [2023, 2026, 2030], IDN: [2028, null, null], PHL: [2029, null, null], AUS: [2025, 2031, null], NZL: [2026, 2032, null],
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Nível de lei de IA de um país no ano corrente (0..3), com variação por partida e lobby. */
export function lawLevel(s: GameState, a3: string, year = s.year): number {
  const ys = LAW_YEARS[a3];
  if (!ys) return 0;
  const shift = (hash(`${s.config.seed}|${a3}`) % 3) - 1 + (ai(s).lobby[a3] ?? 0);
  let lv = 0;
  for (const y of ys) if (y !== null && y + shift <= year) lv += 1;
  return lv;
}

export const lawCountries = (): string[] => Object.keys(LAW_YEARS);

export function aiEra(s: GameState): boolean {
  return s.year >= 2023 || hasTech(s, 'synthetic_voice');
}

/** Preferência do público por música "feita por humanos" (0..0.6) — cresce com a crise. */
export function humanPref(s: GameState): number {
  if (!aiEra(s)) return 0;
  return clamp(0.25 + (s.year - 2023) * 0.025, 0.25, 0.6);
}

/** Mercados → países de uma lista de territórios. */
function countriesIn(markets: readonly MarketId[]): string[] {
  return COUNTRY_INFO.filter((c) => markets.includes(c.market)).map((c) => c.a3);
}

/** Fatia do mercado (por tamanho) bloqueada para os territórios dados. */
export function blockedShare(s: GameState, markets: readonly MarketId[]): number {
  const b = ai(s).blocks;
  let tot = 0;
  let blk = 0;
  for (const c of COUNTRY_INFO) {
    if (!markets.includes(c.market)) continue;
    const sz = countryMarketSize(c, s.year);
    tot += sz;
    if ((b[c.a3] ?? 0) > s.week) blk += sz;
  }
  return tot ? blk / tot : 0;
}

/** Aceitação da produção sintética nos territórios do selo (leis mais duras, menos acesso). */
export function accessFactor(s: GameState): number {
  const cs = countriesIn(s.player.territories.length ? s.player.territories : ['na']);
  if (!cs.length) return 1;
  const avg = cs.reduce((t, a3) => t + lawLevel(s, a3), 0) / cs.length;
  return clamp(1 - avg * 0.12, 0.55, 1);
}

function log(s: GameState, text: L, tone?: 'good' | 'bad'): void {
  const st = ai(s);
  st.log.unshift({ week: s.week, text, tone });
  if (st.log.length > 12) st.log.length = 12;
}

function bump(s: GameState, d: number): void {
  const st = ai(s);
  st.trust = clamp(st.trust + d, 0, 100);
}

const homeA3 = (s: GameState): string => countryOfCity(s.config.homeCity) ?? 'USA';

// ---------------------------------------------------------------- consentimento por artista

export function consentOf(s: GameState, actId: string): ConsentRec | undefined {
  return ai(s).consent[actId];
}

/** Chance de o artista consentir (para a interface mostrar antes de pedir). */
export function consentChance(s: GameState, a: Act, kind: 'v' | 't', share: number, credit: boolean): number {
  if (a.archetype === 'synthetic') return 1;
  const fam = familyOf(a.genre);
  const famBias = ['electronic', 'pop', 'hiphop'].includes(fam) ? 0.08 : ['rock', 'blues_jazz', 'country_folk', 'brazil'].includes(fam) ? -0.08 : 0;
  return clamp(
    0.18 + a.trust / 220 + share * 0.9 + (credit ? 0.08 : 0) + famBias - (kind === 'v' ? 0.05 : 0)
      - (influence(s) < 40 ? 0.12 : 0) - (hasSpec(s, 'hardball') ? 0.08 : 0) + (hasSpec(s, 'mediator') ? 0.05 : 0)
      - (s.player.neural.voiceScandal ? 0.2 : 0) - (ai(s).trust < 35 ? 0.1 : 0),
    0.02, 0.95);
}

/** Pedir consentimento de voz ('v') ou de treino ('t') a um artista, com fatia e crédito. */
export function askConsent(s: GameState, r: Rng, actId: string, kind: 'v' | 't', share: number, credit: boolean): L {
  const a = s.acts[actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return l('Artista inválido.', 'Invalid artist.');
  if (!aiEra(s)) return l('Ainda não existe mercado de modelos de voz.', 'There is no voice-model market yet.');
  const st = ai(s);
  const rec = (st.consent[actId] ??= { sh: share, cr: credit, w: -999 });
  if (rec[kind] === 'g') return l('Já consentiu.', 'Already consented.');
  if (s.week - rec.w < 26) return l('Pediu há pouco: espere seis meses para voltar ao assunto.', 'You asked recently: wait six months before bringing it up again.');
  share = clamp(share, 0.05, 0.6);
  const p = consentChance(s, a, kind, share, credit);
  rec.w = s.week;
  if (r.chance(p)) {
    rec[kind] = 'g';
    rec.sh = share;
    rec.cr = credit;
    a.trust = clamp(a.trust + 2, 0, 100);
    const text = fmtL(kind === 'v' ? l('{a} licencia a própria voz ({p}% para o artista{c}).', '{a} licenses their voice ({p}% to the artist{c}).') : l('{a} autoriza treino com a obra ({p}% para o artista{c}).', '{a} allows training on their work ({p}% to the artist{c}).'), { a: a.name, p: Math.round(share * 100), c: credit ? l(', com crédito', ', with credit') : '' });
    log(s, text, 'good');
    remember(s, 'ai_consent', text, { actId });
    return text;
  }
  rec[kind] = 'r';
  a.trust = clamp(a.trust + (share < 0.2 ? -3 : 1), 0, 100);
  const text = fmtL(share < 0.2 ? l('{a} recusa e se sente desvalorizado(a) pela proposta.', '{a} refuses and feels undervalued by the offer.') : l('{a} recusa, mas agradece ter sido consultado(a).', '{a} refuses but appreciates being asked.'), { a: a.name });
  log(s, text);
  return text;
}

/** Receita mensal estimada da voz licenciada de um artista (bruta). */
export function voiceIncome(s: GameState, a: Act): number {
  const legit = lawLevel(s, homeA3(s)) >= 2 ? 1.25 : 1;
  const lic = ai(s).imit.filter((x) => x.actId === a.id && x.until === -1).length;
  return Math.round(money(s, 25 * Math.pow(Math.max(1, a.fame), 1.25)) * (0.6 + 0.4 * (1 - humanPref(s))) * legit * (1 + lic * 0.3));
}

// ---------------------------------------------------------------- uso de IA na produção

export const USE_NAME: L[] = [l('Nenhum: tudo humano', 'None: all human'), l('Assistência (mixagem, limpeza, demos)', 'Assistance (mixing, cleanup, demos)'), l('Escala sintética (faixas funcionais, feeds personalizados)', 'Synthetic scale (functional tracks, personalized feeds)')];

export function setUse(s: GameState, use: AiUse): L | null {
  const st = ai(s);
  if (!aiEra(s) && use > 0) return l('A tecnologia ainda não chegou.', 'The technology has not arrived yet.');
  if (st.use === use) return null;
  if (use > st.use) bump(s, -3 * (use - st.use));
  else bump(s, 1);
  st.use = use;
  if (use > 0 && st.cert) loseCert(s, l('O selo passou a usar IA na produção e devolveu a certificação "Feito por Humanos".', 'The label adopted AI in production and gave back its "Made by Humans" certification.'));
  if (use > 0) s.player.neural.neuralAdopted = true;
  log(s, fmtL(l('Uso de IA na produção: {x}.', 'AI use in production: {x}.'), { x: USE_NAME[use] }));
  return null;
}

/** Receita mensal da produção sintética em escala (bruta). */
export function scaleIncome(s: GameState): number {
  const st = ai(s);
  if (!st.use) return 0;
  const n = Object.values(s.releases).filter((x) => x.owner === 'player').length;
  const base = st.use === 1 ? 120 * Math.sqrt(n + 1) : 700 * Math.sqrt(n + 4);
  return Math.round(money(s, base) * (1 - humanPref(s) * 0.6) * accessFactor(s));
}

// ---------------------------------------------------------------- certificação "Feito por Humanos"

const isSynthRel = (s: GameState, rel: Release) => rel.songs.some((id) => s.songs[id]?.synthetic || s.songs[id]?.aiVoice);

/** O que impede a certificação agora (null = pode). */
export function certBlocker(s: GameState): L | null {
  const st = ai(s);
  if (!aiEra(s)) return l('A certificação só existe na era da IA.', 'The certification only exists in the AI era.');
  if (st.use > 0) return l('O selo usa IA na produção.', 'The label uses AI in production.');
  if (s.player.neural.consentPolicy === 'no_consent') return l('Há uso de voz sem consentimento no histórico.', 'There is unauthorized voice use on record.');
  if (st.deals.some((d) => d.acts.length)) return l('Há licença de treino sem consentimento dos artistas.', 'There is a training license without artist consent.');
  if (playerActs(s).some((id) => s.acts[id].archetype === 'synthetic')) return l('O elenco tem artistas sintéticos.', 'The roster has synthetic artists.');
  if (Object.values(s.releases).some((x) => x.owner === 'player' && s.week - x.week < 104 && isSynthRel(s, x))) return l('Lançamentos dos últimos dois anos têm faixas sintéticas.', 'Releases from the last two years contain synthetic tracks.');
  return null;
}

export const certCost = (s: GameState) => money(s, 3000);

export function applyCert(s: GameState): L | null {
  const st = ai(s);
  if (st.cert) return l('Já certificado.', 'Already certified.');
  const b = certBlocker(s);
  if (b) return b;
  const cost = certCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'ai8:cert', -cost, 'neural', 'Certificação Feito por Humanos');
  st.cert = { since: s.week, next: s.week + 52 };
  s.flags.humanCertified = s.week;
  bump(s, 4);
  const text = l('O selo recebe a certificação "Feito por Humanos".', 'The label earns the "Made by Humans" certification.');
  log(s, text, 'good');
  remember(s, 'human_cert', text, { important: true });
  return null;
}

function loseCert(s: GameState, why: L): void {
  const st = ai(s);
  if (!st.cert) return;
  st.cert = undefined;
  delete s.flags.humanCertified;
  log(s, why, 'bad');
  remember(s, 'human_cert_lost', why, { important: true });
}

// ---------------------------------------------------------------- propostas de empresas de modelos

const COMPANIES = ['Sintonia Labs', 'Timbral', 'EcoModelo', 'Coro Digital', 'Harmonia Generativa', 'Vozário', 'Polifonia Sistemas'];
export const SCOPE_NAME: Record<AiScope, L> = {
  catalog: l('Treino com o catálogo', 'Training on the catalog'),
  voices: l('Vozes do elenco', 'Roster voices'),
  style: l('Estilo do selo', 'Label style'),
};

/** Atos que ficariam cobertos por um acordo sem o consentimento de treino. */
export function uncoveredActs(s: GameState): string[] {
  return playerActs(s).filter((id) => s.acts[id].archetype !== 'synthetic' && ai(s).consent[id]?.t !== 'g');
}

export function consentedShare(s: GameState): number {
  const ids = playerActs(s);
  return ids.length ? (ids.length - uncoveredActs(s).length) / ids.length : 0;
}

export function makeOffer(s: GameState, r: Rng): AiOffer {
  const n = Object.values(s.releases).filter((x) => x.owner === 'player').length;
  const scope = r.pick(['catalog', 'voices', 'style'] as const);
  const consentOnly = r.chance(0.35);
  const base = money(s, 2000 + n * 600) * (scope === 'catalog' ? 1.5 : scope === 'voices' ? 1.2 : 0.8) * (consentOnly ? Math.max(0.15, consentedShare(s)) : 1) * (hasSpec(s, 'hardball') ? 1.2 : 1) * (1 - humanPref(s) * 0.5);
  const o: AiOffer = { id: nextId(s, 'ai'), co: r.pick(COMPANIES), scope, upfront: Math.round(base * 3), monthly: Math.round(base * 0.15), months: 24, credit: r.chance(0.5), consentOnly, expires: s.week + 8 };
  ai(s).offers.push(o);
  return o;
}

export function acceptAiOffer(s: GameState, id: string): L | null {
  const st = ai(s);
  const o = st.offers.find((x) => x.id === id);
  if (!o) return l('Proposta expirada.', 'Offer expired.');
  st.offers = st.offers.filter((x) => x !== o);
  const acts = o.consentOnly ? [] : uncoveredActs(s);
  post(s, `ai8:deal:${o.id}`, o.upfront, 'neural', `Licença para ${o.co}`);
  st.deals.push({ id: o.id, co: o.co, scope: o.scope, monthly: o.monthly, until: s.week + Math.round(o.months * 4.35), credit: o.credit, consentOnly: o.consentOnly, acts });
  if (acts.length) {
    for (const aid of acts) { const a = s.acts[aid]; if (a) a.trust = clamp(a.trust - (o.scope === 'voices' ? 9 : 6), 0, 100); }
    s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
    bump(s, o.credit ? -3 : -6);
    st.dil = clamp(st.dil + (o.scope === 'catalog' ? 0.06 : o.scope === 'style' ? 0.04 : 0.03), 0, 0.35);
    if (st.cert) loseCert(s, l('Licença sem consentimento: a certificação "Feito por Humanos" é cassada.', 'License without consent: the "Made by Humans" certification is revoked.'));
  } else {
    bump(s, 1);
    st.dil = clamp(st.dil + 0.015, 0, 0.35);
  }
  if (o.scope === 'catalog') s.player.neural.catalogTraining = true;
  const text = fmtL(l('Acordo com {c}: {x}{k}.', 'Deal with {c}: {x}{k}.'), { c: o.co, x: SCOPE_NAME[o.scope], k: acts.length ? fmtL(l(' — {n} artista(s) sem consentimento', ' — {n} artist(s) without consent'), { n: acts.length }) : l(' — só obras autorizadas', ' — consented works only') });
  log(s, text, acts.length ? 'bad' : 'good');
  remember(s, 'ai_deal', text, { important: true });
  return null;
}

export function declineAiOffer(s: GameState, id: string): void {
  const st = ai(s);
  const o = st.offers.find((x) => x.id === id);
  if (!o) return;
  st.offers = st.offers.filter((x) => x !== o);
  if (!o.consentOnly) { bump(s, 1); s.player.neural.humanFocus += 0.5; }
}

// ---------------------------------------------------------------- imitações não autorizadas

export type ImitChoice = 'sue' | 'takedown' | 'license' | 'ignore';

export function resolveImitation(s: GameState, r: Rng, id: string, choice: ImitChoice): L | null {
  const st = ai(s);
  const im = st.imit.find((x) => x.id === id && x.until === undefined);
  if (!im) return l('Caso encerrado.', 'Case closed.');
  const a = s.acts[im.actId];
  if (!a) { st.imit = st.imit.filter((x) => x !== im); return null; }
  if (choice === 'license') {
    if (consentOf(s, a.id)?.v !== 'g') return l('Sem o consentimento de voz do artista não dá para licenciar.', 'Without the artist\'s voice consent you cannot license it.');
    im.until = -1; // vira licença permanente: soma à renda da voz
    log(s, fmtL(l('A imitação de {a} por {b} vira licença paga.', '{b}\'s imitation of {a} becomes a paid license.'), { a: a.name, b: im.by }), 'good');
    return null;
  }
  if (choice === 'sue') {
    const cost = money(s, 3000);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `ai8:sue:${im.id}`, -cost, 'legal', 'Ação contra imitação de voz');
    const odds = clamp(0.2 + lawLevel(s, homeA3(s)) * 0.15 + staffSkill(s, 'legal') / 300 + (hasSpec(s, 'hardball') ? 0.1 : 0), 0.1, 0.85);
    fileLawsuit(s, { kind: 'image', plaintiff: s.config.companyName, defendant: im.by, actId: a.id, claim: money(s, 15000 + a.fame * 600), odds, text: fmtL(l('Selo processa {b} por imitar a voz de {a}.', 'Label sues {b} for imitating {a}\'s voice.'), { a: a.name, b: im.by }) });
    a.trust = clamp(a.trust + 4, 0, 100);
    bump(s, 2);
  } else if (choice === 'takedown') {
    const cost = money(s, 800);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `ai8:td:${im.id}`, -cost, 'legal', 'Pedido de remoção');
    if (r.chance(0.6 + lawLevel(s, homeA3(s)) * 0.1)) { a.trust = clamp(a.trust + 2, 0, 100); bump(s, 1); }
    else { st.dil = clamp(st.dil + 0.005, 0, 0.35); log(s, fmtL(l('A imitação de {a} reaparece em outra conta.', 'The {a} imitation reappears on another account.'), { a: a.name }), 'bad'); }
  } else {
    im.until = s.week + 26;
    st.dil = clamp(st.dil + 0.01, 0, 0.35);
    a.trust = clamp(a.trust - 3, 0, 100);
    return null;
  }
  st.imit = st.imit.filter((x) => x !== im);
  return null;
}

// ---------------------------------------------------------------- lobby

export const lobbyCost = (s: GameState) => money(s, 20000);

export function lobby(s: GameState, a3: string, dir: 1 | -1): L | null {
  if (!LAW_YEARS[a3]) return l('Esse país não discute lei de IA.', 'That country is not debating AI law.');
  if (s.flags[`ai8lobby:${a3}`] === s.year) return l('Já fez lobby nesse país este ano.', 'Already lobbied there this year.');
  const cost = lobbyCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `ai8:lobby:${a3}`, -cost, 'legal', `Lobby sobre lei de IA (${a3})`);
  s.flags[`ai8lobby:${a3}`] = s.year;
  const st = ai(s);
  st.lobby[a3] = clamp((st.lobby[a3] ?? 0) + (dir > 0 ? -1 : 1), -3, 3);
  bump(s, dir > 0 ? 2 : -3);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
  return null;
}

// ---------------------------------------------------------------- mês e ano

/** Bloqueios de distribuição: países com lei dura retiram lançamentos de risco. */
export function checkBlocks(s: GameState, r: Rng): string[] {
  const st = ai(s);
  const out: string[] = [];
  for (const k of Object.keys(st.blocks)) if (st.blocks[k] <= s.week) delete st.blocks[k];
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || s.week - rel.week > 52 || !isSynthRel(s, rel)) continue;
    const unconsented = rel.songs.some((id) => s.songs[id]?.aiVoice) && consentOf(s, rel.actId)?.v !== 'g';
    for (const a3 of countriesIn(rel.territories)) {
      if ((st.blocks[a3] ?? 0) > s.week) continue;
      const lv = lawLevel(s, a3);
      const p = lv >= 3 ? (unconsented ? 0.35 : 0.04) : lv === 2 ? (unconsented ? 0.25 : 0) : 0;
      if (p && r.chance(p)) {
        st.blocks[a3] = s.week + 26;
        out.push(a3);
        bump(s, -1);
      }
    }
  }
  if (out.length) {
    const text = fmtL(l('Distribuição bloqueada por lei de IA em: {c}.', 'Distribution blocked under AI law in: {c}.'), { c: out.join(', ') });
    log(s, text, 'bad');
    notify(s, text, 'bad');
  }
  return out;
}

export function aiMonth(s: GameState, r: Rng): void {
  if (!aiEra(s)) return;
  const st = ai(s);
  // escândalos de voz do sistema neural.ts pesam uma vez na confiança
  if (s.player.neural.voiceScandal && !st.scandal) { st.scandal = 1; bump(s, -15); if (st.cert) loseCert(s, l('Escândalo de voz: certificação cassada.', 'Voice scandal: certification revoked.')); }
  // vozes licenciadas: renda contínua (artistas atuais e espólios), fatia para o artista
  let voice = 0;
  for (const [actId, rec] of Object.entries(st.consent)) {
    const a = s.acts[actId];
    if (!a || rec.v !== 'g') continue;
    if (a.owner !== 'player' && !a.playerBand && !a.deceased) continue;
    const gross = voiceIncome(s, a);
    const toArtist = Math.round(gross * rec.sh);
    a.cash += toArtist;
    voice += gross - toArtist;
    if (rec.cr) bump(s, 0.05);
    // artista desconfiado revoga
    if (a.trust < 25 && !a.deceased && r.chance(0.1)) {
      rec.v = 'r';
      if (rec.t === 'g') rec.t = 'r';
      bump(s, -2);
      log(s, fmtL(l('{a} revoga o consentimento de voz e treino.', '{a} revokes voice and training consent.'), { a: a.name }), 'bad');
    }
  }
  if (voice) post(s, 'ai8:voice', voice, 'neural', 'Licenças de voz');
  st.last.voice = voice;
  // escala sintética
  const scale = scaleIncome(s);
  if (scale) post(s, 'ai8:scale', scale, 'neural', 'Música funcional e personalizada (IA)');
  st.last.scale = scale;
  if (st.use === 2) { bump(s, -0.8); s.player.reputation.artistic = clamp(s.player.reputation.artistic - 0.15, 0, 100); }
  else if (st.use === 1) bump(s, -0.2);
  else if (st.trust < 70) bump(s, 0.15);
  if (st.cert) bump(s, 0.3);
  // acordos com empresas de modelos
  let dealsIn = 0;
  for (const d of st.deals) {
    if (d.until <= s.week) continue;
    dealsIn += d.monthly;
    if (d.credit) bump(s, 0.05);
    const alive = d.acts.filter((id) => s.acts[id]);
    if (!alive.length) continue;
    const strict = Math.max(0, ...countriesIn(s.player.territories).map((a3) => lawLevel(s, a3)));
    if (strict >= 2 && r.chance(0.03 * strict)) {
      const a = s.acts[r.pick(alive)];
      if (!s.lawsuits.some((x) => x.kind === 'image' && x.actId === a.id && x.defendant === 'player' && !['settled', 'won', 'lost'].includes(x.stage))) {
        fileLawsuit(s, { kind: 'image', plaintiff: a.name, defendant: 'player', actId: a.id, claim: money(s, 20000 + a.fame * 800), odds: clamp(0.35 + staffSkill(s, 'legal') / 300 + (hasSpec(s, 'hardball') ? 0.1 : 0), 0.1, 0.8), text: fmtL(l('{a} processa o selo por licenciar sua obra para treino sem consentimento.', '{a} sues the label for licensing their work for training without consent.'), { a: a.name }) });
        bump(s, -2);
      }
    }
  }
  if (dealsIn) post(s, 'ai8:deals', dealsIn, 'neural', 'Licenças para empresas de modelos');
  st.last.deals = dealsIn;
  st.deals = st.deals.filter((d) => d.until > s.week);
  // novas propostas
  st.offers = st.offers.filter((o) => o.expires > s.week);
  const nRel = Object.values(s.releases).filter((x) => x.owner === 'player').length;
  if (nRel >= 3 && st.offers.length < 2 && r.chance(0.12)) {
    const o = makeOffer(s, r);
    notify(s, fmtL(l('{c} quer licenciar {x} do selo.', '{c} wants to license the label\'s {x}.'), { c: o.co, x: SCOPE_NAME[o.scope] }), 'info');
  }
  // imitações não autorizadas
  for (const im of st.imit) if (im.until === undefined && s.week - im.week > 8) { im.until = s.week + 26; st.dil = clamp(st.dil + 0.01, 0, 0.35); }
  st.imit = st.imit.filter((x) => x.until === undefined || x.until === -1 || x.until > s.week);
  const famous = playerActs(s).filter((id) => s.acts[id].fame > 25 && s.acts[id].archetype !== 'synthetic' && !st.imit.some((x) => x.actId === id && x.until !== -1));
  if (famous.length && r.chance(Math.min(0.25, 0.05 * famous.length))) {
    const a = s.acts[r.pick(famous)];
    const rivals = Object.values(s.labels).filter((x) => x.active);
    const by = r.chance(0.5) && rivals.length ? r.pick(rivals).name : r.pick(['Perfil anônimo', 'Canal de covers sintéticos', 'Fazenda de faixas']);
    st.imit.push({ id: nextId(s, 'im'), actId: a.id, by, week: s.week });
    notify(s, fmtL(l('Imitação não autorizada da voz de {a} circula ({b}).', 'Unauthorized imitation of {a}\'s voice is circulating ({b}).'), { a: a.name, b: by }), 'bad');
  }
  checkBlocks(s, r);
}

export function aiYear(s: GameState, r: Rng): void {
  if (!aiEra(s)) return;
  const st = ai(s);
  // leis novas
  for (const a3 of Object.keys(LAW_YEARS)) {
    const lv = lawLevel(s, a3);
    if ((st.lv[a3] ?? 0) !== lv) {
      if (lv > (st.lv[a3] ?? 0)) log(s, fmtL(l('{c}: nova lei de IA — {x}.', '{c}: new AI law — {x}.'), { c: a3, x: LAW_NAME[lv] }));
      st.lv[a3] = lv;
    }
  }
  // diluição do catálogo cede devagar
  st.dil = Math.max(0, st.dil * 0.97);
  // auditoria da certificação
  if (st.cert && st.cert.next <= s.week) {
    const b = certBlocker(s);
    if (b) { bump(s, -10); loseCert(s, fmtL(l('Auditoria reprova o selo: {x}', 'Audit fails the label: {x}'), { x: b })); }
    else { post(s, 'ai8:audit', -money(s, 1500), 'neural', 'Auditoria Feito por Humanos'); st.cert.next = s.week + 52; }
  }
  // prêmios próprios de cada postura
  if (st.cert && r.chance(0.6)) {
    post(s, `ai8:award:h:${s.year}`, money(s, 12000), 'neural', 'Prêmio Feito por Humanos');
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + 4, 0, 100);
    bump(s, 3);
    st.awards.push({ year: s.year, kind: 'human' });
    remember(s, 'ai_award', l('O selo vence o Prêmio Feito por Humanos.', 'The label wins the Made by Humans Award.'), { important: true });
  }
  const licensed = Object.values(st.consent).filter((x) => x.v === 'g').length;
  if (st.use >= 1 && licensed >= 1 && !st.deals.some((d) => d.acts.length) && s.player.neural.consentPolicy !== 'no_consent' && st.trust >= 30 && r.chance(0.5)) {
    post(s, `ai8:award:s:${s.year}`, money(s, 10000), 'neural', 'Prêmio de Inovação Sintética');
    s.player.reputation.commercial = clamp(s.player.reputation.commercial + 3, 0, 100);
    st.awards.push({ year: s.year, kind: 'synth' });
    remember(s, 'ai_award', l('O selo vence o Prêmio de Inovação Sintética (vozes licenciadas com consentimento).', 'The label wins the Synthetic Innovation Award (consented, licensed voices).'), { important: true });
  }
  if (st.awards.length > 12) st.awards.splice(0, st.awards.length - 12);
}

registerSimHook('month', 'ai8', (s, r) => aiMonth(s, r));
registerSimHook('year', 'ai8', (s, r) => aiYear(s, r));

// ---------------------------------------------------------------- efeitos no mercado

/** Multiplicador de apelo do selo pela postura (confiança, certificação, vozes diluídas). */
export function aiAppealMult(s: GameState, rel: Release): number {
  const st = ai(s);
  const hp = humanPref(s);
  let m = 1 + ((st.trust - 55) / 100) * hp * 0.3;
  if (st.cert) m *= 1 + 0.03 + hp * 0.08;
  if (consentOf(s, rel.actId)?.v === 'g') m *= 0.97;
  if (isSynthRel(s, rel) && lawLevel(s, homeA3(s)) >= 1) m *= 1 - hp * 0.15;
  return m;
}

registerMod('appeal', 'ai8', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel || rel.owner !== 'player' || !aiEra(s)) return null;
  const m = aiAppealMult(s, rel);
  return Math.abs(m - 1) < 0.002 ? null : { value: value * m, label: l('Postura sobre IA e autoria', 'Stance on AI and authorship') };
});

function hasBlocks(st: AiState): boolean {
  for (const _k in st.blocks) return true;
  return false;
}

registerMod('chartUnits', 'ai8', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel || rel.owner !== 'player') return null;
  const st = ai(s);
  let m = 1;
  if (st.dil > 0 && s.week - rel.week > 104) m *= 1 - st.dil;
  if (st.imit.length && st.imit.some((x) => x.actId === rel.actId && x.until !== undefined && x.until > s.week)) m *= 0.94;
  if (hasBlocks(st) && isSynthRel(s, rel)) m *= 1 - blockedShare(s, rel.territories);
  return m === 1 ? null : { value: value * m, label: l('IA: catálogo, imitações e bloqueios', 'AI: catalog, imitations and blocks') };
});

registerMod('songQ', 'ai8', (s, value, ctx) => {
  const song = ctx.song;
  const use = ai(s).use;
  if (!song || !use) return null;
  const before = songQ(song);
  song.production = clamp(song.production + (use === 1 ? 2 : 4), 5, 100);
  if (use === 2) {
    song.originality = clamp(song.originality - 3, 0, 100);
    song.synthetic = true;
  }
  return { value: value + songQ(song) - before, label: l('IA na produção', 'AI in production') };
});

