// Rodada 17 — IMPRENSA VIVA: notícias, boatos e fofocas com origem (veículo, colunista, informante, paparazzo),
// verdade/mentira, confirmação/desmentido, alcance por país (fama regional, fame16) e consequências (hype,
// estresse, escândalo pelo pipeline, relações, obrigações). Quanto mais famoso, mais aparece. O jogador planta
// boatos, solta notícias e exclusivas, responde (desmentir/confirmar/abafar/processar), corteja veículos,
// contrata detetive/paparazzo, vende segredos a tabloides e dá entrevistas arriscadas. Veículos têm linha
// editorial, alcance, credibilidade (que cai a cada boato desmentido), posição política e dono (conglomerados
// favorecem os artistas do grupo). Críticos reais por era entram na lista de críticos; resenha muito dura de
// ato famoso vira situação do diretor (responder ao crítico?).

import { Rng, clamp, hashString } from '../../core/rng';
import { COUNTRY_INFO } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { COLUMNISTS, CRITICS17 } from '../../data/media17';
import { cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, facts17, raiseVisibility, recentFacts, type Fact } from '../facts17';
import { grantHold, holdsOf, useHold } from '../holds17';
import { CRITICS, registerReviewAdjust } from '../media';
import { outletsIn, pickOutlet, type O17 } from '../outlets17';
import { piety, scandal, scandalReaction, type ScandalKind } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { critRel } from '../criticrel';
import { f15, fameTier } from './fame15';
import { f16, fameIn, mkOf } from './fame16';
import { addHype } from './hype12';
import { medOf } from './media12';
import { per13 } from './persona13';
import { registerSituation } from './situations17';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- críticos reais e novos (entram nas resenhas)
// preguiçoso: o contentBridge troca a lista (setCritics) e a ordem dos módulos no bundle não é garantida (TDZ)
export function ensureCritics17(): void {
  const arr = CRITICS as typeof CRITICS & { r17?: 1 };
  if (arr.r17) return;
  for (const c of CRITICS17) if (!arr.some((x) => x.name === c.name)) arr.push({ name: c.name, outlet: c.outlet, from: c.from, to: c.to, favors: c.favors, dislikes: c.dislikes, mainstream: c.mainstream, harsh: c.harsh, prestige: c.prestige, id: `c17_${hashString(c.name) % 100000}`, region: c.region });
  arr.r17 = 1;
}
registerSimHook('newgame', 'media17', () => ensureCritics17());
export const REAL_CRITICS = new Set(CRITICS17.filter((c) => c.real).map((c) => c.name));

// ---------------------------------------------------------------- estado

export type SSrc = 'fact' | 'insider' | 'paparazzi' | 'player' | 'npc' | 'columnist' | 'hoax';
export type SSt = 'open' | 'confirmed' | 'denied' | 'debunked' | 'retracted' | 'killed' | 'faded';
export interface Story {
  id: string; y: number; m: number; w: number; t: L; tpl: string; a?: string; b?: string; out: string; src: SSrc; via?: string;
  truth: 0 | 1; st: SSt; cred: number; sev: number; tone: number; reach: string[]; fact?: string; mine?: 1; traced?: 1; lied?: 1; due: number; resp?: string; why?: L; news?: 1;
}
export interface Suit { id: string; story: string; out: string; who: string; due: number; p: number; dmg: number; vsPlayer?: 1; t: L }
export interface Media17 { st: Story[]; seq: number; rel: Record<string, number>; credD: Record<string, number>; own: Record<string, string>; suits: Suit[]; cd: Record<string, number>; lastF: number; log: [number, number, L][]; seen: Record<string, 1> }
declare module '../ext4' { interface Ext4 { media17: Media17 } }
const fresh = (): Media17 => ({ st: [], seq: 0, rel: {}, credD: {}, own: {}, suits: [], cd: {}, lastF: 0, log: [], seen: {} });
registerExt4('media17', fresh);
export function m17(s: GameState): Media17 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.media17 ??= fresh()) as Media17;
  st.st ??= []; st.rel ??= {}; st.credD ??= {}; st.own ??= {}; st.suits ??= []; st.cd ??= {}; st.log ??= []; st.seen ??= {}; st.seq ??= 0; st.lastF ??= 0;
  return st;
}
const log = (s: GameState, t: L): void => { const st = m17(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };

// ---------------------------------------------------------------- veículos (com os do jogador)

const MK: Record<string, O17['kind']> = { magazine: 'magazine', radio: 'radio', tv: 'tv', blog: 'blog', playlist: 'social' };
/** Todos os veículos ativos, com credibilidade atual, dono e os seus (media12). */
export function outlets17(s: GameState): O17[] {
  const st = m17(s);
  const base = outletsIn(s.year).map((o) => ({ ...o, cred: clamp(o.cred + (st.credD[o.id] ?? 0), 5, 98), owner: st.own[o.id] ? s.labels[st.own[o.id]]?.name ?? o.owner : o.owner }));
  for (const v of ventures(s).list) if (v.kind === 'media' && v.media) {
    const x = medOf(s, v.id);
    base.push({ id: `v:${v.id}`, name: v.name, kind: MK[v.media] ?? 'magazine', market: cityById[v.city]?.market ?? 'global', line: x.line === 'prestige' ? 'serious' : x.line, reach: clamp(v.reach ?? 30 + v.level * 10, 10, 90), cred: x.cred, stance: 0, fav: [], owner: s.config.companyName, mine: 1 });
  }
  return base;
}
export const outletById17 = (s: GameState, id: string): O17 | undefined => outlets17(s).find((o) => o.id === id);
export const relOf = (s: GameState, outId: string): number => m17(s).rel[outId] ?? 0;
/** Selo dono do veículo (conglomerado) — id do selo, quando houver. */
export const ownerLabel17 = (s: GameState, outId: string): string | undefined => m17(s).own[outId];
const prTier = (s: GameState): number => (s.prAgency?.tier ?? 0) + (s.player.staff.some((x) => x.role === 'publicist') ? 1 : 0);

// ---------------------------------------------------------------- modelos de boato (por era)

interface Tpl { id: string; from: number; tone: number; sev: number; sk?: ScandalKind; pair?: 'genre' | 'famous'; name: L; t: L; real: (s: GameState, a: Act, b?: Act) => boolean }
const lead = (s: GameState, a: Act) => s.persons[a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]];
const facet = (s: GameState, a: Act, k: string): number => { const p = lead(s, a); return p ? per13(s, `p:${p.id}`)?.facets[k as 'ego'] ?? 50 : 50; };
const mem = (s: GameState, a: Act) => a.members.map((id) => s.persons[id]).filter((p) => p?.alive);
const secretAbout = (s: GameState, a: Act): Fact | undefined => recentFacts(s, { vis: 'secret', months: 60, minSev: 30 }).find((f) => f.actors.includes(a.id) || a.members.some((m) => f.actors.includes(m)));
export const TPL17: Tpl[] = [
  { id: 'romance', from: 1920, tone: 0, sev: 30, pair: 'famous', name: l('Romance', 'Romance'), t: l('{a} e {b} vistos juntos de madrugada: romance?', '{a} and {b} seen together at dawn: romance?'), real: (s, a, b) => !!b && mem(s, a).some((p) => b.members.some((m) => (p.rel[m] ?? 0) > 60)) },
  { id: 'split', from: 1950, tone: -1, sev: 45, name: l('Fim da banda', 'Band split'), t: l('Clima pesado nos bastidores: {a} pode acabar', 'Tension backstage: {a} may be finished'), real: (s, a) => a.members.length >= 2 && mem(s, a).some((p) => p.resentment > 55 || p.morale < 30) },
  { id: 'feud', from: 1950, tone: -1, sev: 35, pair: 'genre', name: l('Rixa', 'Feud'), t: l('{a} e {b} não se falam mais', '{a} and {b} are no longer speaking'), real: (s, a, b) => !!b && mem(s, a).some((p) => b.members.some((m) => (p.rel[m] ?? 0) < -30)) },
  { id: 'rehab', from: 1955, tone: -1, sev: 55, sk: 'drugs', name: l('Vício', 'Addiction'), t: l('Integrante de {a} estaria internado numa clínica', 'A member of {a} is said to be in a clinic'), real: (s, a) => mem(s, a).some((p) => p.health === 'addiction' || p.health === 'recovering') },
  { id: 'label', from: 1960, tone: 0, sev: 30, name: l('Troca de selo', 'Label move'), t: l('{a} negocia em segredo com outro selo', '{a} secretly talking to another label'), real: (s, a) => !!a.owner && a.trust < 40 },
  { id: 'album', from: 1960, tone: 1, sev: 20, name: l('Disco secreto', 'Secret album'), t: l('{a} grava disco novo escondido', '{a} quietly recording a new album'), real: (s, a) => s.pendingReleases.some((p) => p.actId === a.id) },
  { id: 'ghost', from: 1965, tone: -1, sev: 50, sk: 'conduct', name: l('Quem canta de verdade?', 'Who really sings?'), t: l('Quem canta mesmo nos discos de {a}? Fontes falam em dublagem', 'Who really sings on {a}\'s records? Sources talk of lip-syncing'), real: () => false },
  { id: 'deathhoax', from: 1967, tone: 0, sev: 40, name: l('Boato de morte', 'Death hoax'), t: l('Pistas na capa: {a} estaria morto e substituído por um sósia?', 'Clues on the sleeve: is {a} dead and replaced by a double?'), real: () => false },
  { id: 'diva', from: 1970, tone: -1, sev: 25, sk: 'conduct', name: l('Exigências de camarim', 'Backstage demands'), t: l('As exigências absurdas de {a} no camarim', '{a}\'s outrageous backstage rider'), real: (s, a) => facet(s, a, 'ego') >= 72 },
  { id: 'broke', from: 1975, tone: -1, sev: 40, sk: 'money', name: l('Falência', 'Broke'), t: l('{a} estaria afundado em dívidas', '{a} said to be drowning in debt'), real: (s, a) => a.cash < 0 },
  { id: 'surgery', from: 1980, tone: 0, sev: 20, name: l('Rosto novo', 'New face'), t: l('{a} mudou o rosto? Fotos antigas viram assunto', 'Has {a} changed their face? Old photos go around'), real: (s, a) => facet(s, a, 'vaidade') >= 75 },
  { id: 'dms', from: 2008, tone: -1, sev: 45, sk: 'offense', name: l('Mensagens vazadas', 'Leaked messages'), t: l('Prints de mensagens privadas de {a} circulam', 'Screenshots of {a}\'s private messages are circulating'), real: (s, a) => !!secretAbout(s, a) },
  { id: 'oldpost', from: 2015, tone: -1, sev: 50, sk: 'offense', name: l('Post antigo', 'Old post'), t: l('Post antigo de {a} ressurge e pede cancelamento', 'An old post by {a} resurfaces; calls to cancel'), real: (s, a) => facet(s, a, 'impulsividade') >= 70 },
];
const tplById = Object.fromEntries(TPL17.map((x) => [x.id, x])) as Record<string, Tpl>;
export const tplsIn = (year: number): Tpl[] => TPL17.filter((x) => x.from <= year);

// ---------------------------------------------------------------- criação e efeitos

const due = (s: GameState, r: Rng, o?: O17): number => s.week + Math.round((o && (o.kind === 'social' || o.kind === 'blog') ? 4 + r.int(0, 8) : 12 + r.int(0, 20)));
function colName(s: GameState, o: O17, r: Rng): string | undefined {
  if (o.line !== 'tabloid' && o.kind !== 'tv') return undefined;
  const c = COLUMNISTS.filter((x) => x.from <= s.year && x.to >= s.year && (x.market === o.market || x.market === 'global' || (o.market === 'global' && x.market === 'na')));
  return c.length && r.chance(0.5) ? r.pick(c).name : undefined;
}
function startReach(s: GameState, a: Act | undefined, o: O17, place?: string): string[] {
  const out = new Set<string>();
  const c = countryOfCity(place ?? a?.city ?? s.config.homeCity);
  if (c) out.add(c);
  if (o.market !== 'global') { const k = COUNTRY_INFO.find((x) => x.market === o.market && (x.a3 === c || x.a3 === 'USA' || x.a3 === 'BRA' || x.a3 === 'GBR' || x.a3 === 'JPN' || x.a3 === 'MEX' || x.a3 === 'NGA' || x.a3 === 'AUS')); if (k) out.add(k.a3); }
  return [...out];
}
function addStory(s: GameState, x: Omit<Story, 'id' | 'y' | 'm' | 'w' | 'reach'> & { reach?: string[] }): Story {
  const st = m17(s);
  const o = outletById17(s, x.out);
  const story: Story = { ...x, id: `n${++st.seq}`, y: s.year, m: s.month, w: s.week, reach: x.reach ?? (o ? startReach(s, x.a ? s.acts[x.a] : undefined, o) : []) };
  st.st.unshift(story);
  if (st.st.length > 160) {
    // sai primeiro o que já terminou e é pequeno
    const keep = st.st.filter((y, i) => i < 60 || y.st === 'open' || y.mine || y.sev >= 50);
    st.st = keep.slice(0, 160);
  }
  const a = x.a ? s.acts[x.a] : undefined;
  if (a && o && x.src !== 'fact') {
    // atenção: boato é hype (sobe mais com alcance do veículo)
    addHype(s, `a:${a.id}`, `m17:${x.tpl}`, fmtL(l('{o}: {t}', '{o}: {t}'), { o: o.name, t: x.t }), Math.round((3 + x.sev / 12) * (0.5 + o.reach / 100)));
    if (x.tone < 0 && x.st === 'open') { const p = lead(s, a); if (p) addStress(s, p.id, 3 + x.sev / 12, fmtL(l('Boato: {t}', 'Rumor: {t}'), { t: x.t })); }
    if (playerActs(s).includes(a.id) && !x.mine) notify(s, fmtL(l('Na imprensa ({o}): {t}', 'In the press ({o}): {t}'), { o: o.name, t: x.t }), x.tone < 0 ? 'bad' : 'info');
  }
  return story;
}

/** Efeito regional de uma história ao chegar num país (fama local, mais forte em público devoto para boato ruim). */
function regionalHit(s: GameState, sto: Story, a3: string): void {
  const a = sto.a ? s.acts[sto.a] : undefined;
  if (!a || sto.st === 'killed') return;
  const credF = sto.cred / 100;
  const mk = mkOf(a3);
  const delta = sto.tone < 0 ? -(0.3 + sto.sev / 120) * (0.4 + credF) * (0.6 + piety(mk, s.year)) * (sto.resp === 'deny' && !sto.truth ? 0.4 : 1) : sto.tone > 0 ? 0.4 * (0.4 + credF) : 0.15;
  const fx = f16(s);
  const d = (fx.d[a.id] ??= {});
  d[a3] = clamp(Math.round(((d[a3] ?? 0) + delta) * 10) / 10, -40, 40);
  const m = (fx.m[a.id] ??= {});
  m[a3] = (m[a3] ?? 0) | 16;
}

// ---------------------------------------------------------------- mês: notícias de fatos, vazamentos, fofoca, paparazzi, propagação, desfechos

const LINE_BY: [RegExp, O17['line'][]][] = [
  [/^(chart|award|release|signing|deal|label_sold|poach)$/, ['trade', 'serious', 'mainstream']],
  [/^(death|health|case_ruling|law|boycott)$/, ['serious', 'mainstream']],
  [/^(scandal|arrest|affair|addiction|rehab|breakdown|secret_exposed)$/, ['tabloid', 'fan', 'mainstream']],
  [/^(romance|marriage|breakup|birth)$/, ['tabloid', 'mainstream', 'fan']],
];
const linesFor = (f: Fact): O17['line'][] => LINE_BY.find(([re]) => re.test(f.kind))?.[1] ?? ['mainstream', 'serious', 'tabloid'];
const SKIP = new Set(['memory', 'stress', 'hold', 'hold_used', 'favor', 'forgiven']);
const actOfFact = (s: GameState, f: Fact): Act | undefined => { for (const id of f.actors) { if (s.acts[id]) return s.acts[id]; } for (const id of f.actors) { const a = Object.values(s.acts).find((x) => x.members.includes(id) && x.status !== 'retired'); if (a) return a; } return undefined; };
const live = (a?: Act): a is Act => !!a && !a.deceased && (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus');

function ingestFacts(s: GameState, r: Rng, list: O17[]): void {
  const st = m17(s);
  const fs = facts17(s).f;
  const mine = new Set(playerActs(s));
  const fresh: Fact[] = [];
  for (let i = fs.length - 1; i >= 0; i--) { const f = fs[i]; const n = Number(f.id.slice(1)); if (n <= st.lastF) break; fresh.push(f); }
  st.lastF = facts17(s).seq;
  const cand = fresh.filter((f) => f.visibility !== 'secret' && !SKIP.has(f.kind) && f.src !== 'media17' && f.severity >= 25)
    .map((f) => ({ f, a: actOfFact(s, f) })).filter((x) => x.a || x.f.actors.includes('player'))
    .filter((x) => x.a && (mine.has(x.a.id) || r.chance(clamp((x.a.fame - 15) / 50 + x.f.severity / 150, 0, 1))))
    .sort((a, b) => b.f.severity + (b.a?.fame ?? 0) - a.f.severity - (a.a?.fame ?? 0)).slice(0, 12);
  for (const { f, a } of cand) {
    if (st.st.some((y) => s.week - y.w < 9 && y.t.pt === f.text.pt)) continue;
    const o = pickOutlet(list, `${f.id}`, linesFor(f), a ? cityById[a.city]?.market : undefined, a ? familyOf(a.genre) : undefined);
    if (!o) continue;
    const tone = f.tags.includes('good') ? 1 : f.tags.includes('bad') ? -1 : 0;
    const rumor = f.visibility === 'rumor';
    addStory(s, { t: f.text, tpl: f.kind, a: a?.id, out: o.id, src: 'fact', via: tone <= 0 ? colName(s, o, r) : undefined, truth: 1, st: rumor ? 'open' : 'confirmed', cred: o.cred, sev: f.severity, tone, fact: f.id, due: due(s, r, o), news: rumor ? undefined : 1, reach: startReach(s, a, o, f.place) });
  }
}

const SK_KEY: Partial<Record<string, string>> = { drugs: 'addiction', sex: 'affair', money: 'tax' };
function leaks(s: GameState, r: Rng, list: O17[]): void {
  let n = 0;
  for (const f of recentFacts(s, { vis: 'secret', months: 24, minSev: 30 })) {
    if (n >= 2) break;
    if (f.src === 'holds17') continue;
    const a = actOfFact(s, f);
    if (!live(a) || a.fame < 25) continue;
    const t = fameTier(a.fame), sec = [1, 0.6, 0.3][f15(s).sec[a.id] ?? 0];
    if (!r.chance((0.02 + t * 0.025) * sec)) continue;
    n++;
    raiseVisibility(f, 'rumor');
    const o = pickOutlet(list, `leak${f.id}`, ['tabloid', 'fan'], cityById[a.city]?.market);
    if (!o) continue;
    const others = mem(s, a).filter((p) => !f.actors.includes(p.id));
    const via = others.length && r.chance(0.4) ? fmtL(l('alguém próximo de {a}', 'someone close to {a}'), { a: a.name }).pt : r.pick([l('ex-funcionário', 'former employee'), l('fonte da gravadora', 'label source'), l('motorista', 'driver'), l('vizinho', 'neighbour')]).pt;
    addStory(s, { t: fmtL(l('Vazou: {t}', 'Leaked: {t}'), { t: f.text }), tpl: 'leak', a: a.id, out: o.id, src: 'insider', via, truth: 1, st: 'open', cred: o.cred, sev: f.severity, tone: -1, fact: f.id, due: due(s, r, o) });
  }
}

function gossip(s: GameState, r: Rng, list: O17[]): void {
  const famous = Object.values(s.acts).filter((a) => live(a) && a.fame >= 30).sort((a, b) => b.fame - a.fame).slice(0, 40);
  const tpls = tplsIn(s.year);
  const st = m17(s);
  let n = 0;
  for (const a of famous) {
    if (n >= 6) break;
    // paparazzi: estrela grande sem segurança vira foto toda hora
    const t = fameTier(a.fame), sec = [1, 0.6, 0.25][f15(s).sec[a.id] ?? 0];
    if (s.year >= 1955 && t >= 3 && r.chance((t - 2) * 0.035 * sec)) {
      const o = pickOutlet(list, `pap${a.id}${s.week}`, ['tabloid', 'fan'], cityById[a.city]?.market);
      if (o) {
        const sf = secretAbout(s, a);
        const where = cityById[a.city]?.name ?? { pt: a.city, en: a.city };
        if (sf && r.chance(0.35)) { raiseVisibility(sf, 'rumor'); addStory(s, { t: fmtL(l('Fotos de paparazzi: {t}', 'Paparazzi shots: {t}'), { t: sf.text }), tpl: 'leak', a: a.id, out: o.id, src: 'paparazzi', truth: 1, st: 'open', cred: o.cred, sev: sf.severity, tone: -1, fact: sf.id, due: due(s, r, o) }); }
        else addStory(s, { t: fmtL(r.pick([l('{a} flagrado(a) saindo de boate em {c}', '{a} snapped leaving a club in {c}'), l('{a} de óculos escuros e boné em {c}: fugindo de quem?', '{a} in shades and a cap in {c}: hiding from whom?'), l('{a} briga com fotógrafo em {c}', '{a} scuffles with a photographer in {c}')]), { a: a.name, c: where }), tpl: 'paparazzi', a: a.id, out: o.id, src: 'paparazzi', truth: 1, st: 'confirmed', cred: o.cred, sev: 20, tone: 0, due: s.week, news: 1 });
        n++;
        continue;
      }
    }
    if ((st.cd[`g:${a.id}`] ?? 0) > s.week) continue;
    if (!r.chance(0.3 * ((a.fame - 25) / 75) ** 2)) continue;
    const tp = r.pick(tpls);
    const pool = tp.pair === 'genre' ? famous.filter((b) => b.id !== a.id && b.genre === a.genre) : tp.pair ? famous.filter((b) => b.id !== a.id) : [];
    if (tp.pair && !pool.length) continue;
    const b = tp.pair ? r.pick(pool) : undefined;
    let o = pickOutlet(list, `g${a.id}${s.week}`, s.year >= 2006 ? ['tabloid', 'fan'] : ['tabloid', 'mainstream'], cityById[a.city]?.market);
    if (!o) continue;
    // conglomerado protege os artistas do próprio grupo: troca o boato ruim por um bom
    if (st.own[o.id] && st.own[o.id] === a.owner && tp.tone < 0) o = pickOutlet(list.filter((x) => x.id !== o!.id), `g2${a.id}${s.week}`, ['tabloid', 'fan']) ?? o;
    const truth = tp.real(s, a, b) ? 1 : 0;
    addStory(s, { t: fmtL(tp.t, { a: a.name, b: b?.name ?? '' }), tpl: tp.id, a: a.id, b: b?.id, out: o.id, src: tp.id === 'deathhoax' ? 'hoax' : colName(s, o, r) ? 'columnist' : 'npc', via: colName(s, o, r), truth, st: 'open', cred: o.cred, sev: tp.sev, tone: tp.tone, due: due(s, r, o) });
    st.cd[`g:${a.id}`] = s.week + 12;
    n++;
  }
}

function spread(s: GameState, r: Rng): void {
  const st = m17(s);
  const all = outlets17(s);
  for (const sto of st.st) {
    if (sto.st !== 'open' && !(sto.news && s.week - sto.w < 8)) continue;
    const a = sto.a ? s.acts[sto.a] : undefined;
    if (!a || sto.reach.length >= 25) continue;
    const o = all.find((x) => x.id === sto.out);
    const speed = (o?.kind === 'social' ? 3 : o?.kind === 'tv' || o?.line === 'tabloid' ? 2 : 1) + (s.year >= 2010 ? 1 : 0);
    let added = 0;
    for (let k = 0; k < 8 && added < speed; k++) {
      const c = r.pick(COUNTRY_INFO);
      if (sto.reach.includes(c.a3)) continue;
      const near = o && (o.market === 'global' || o.market === c.market);
      if (!near && fameIn(s, a, c.a3) < 20) continue;
      sto.reach.push(c.a3);
      regionalHit(s, sto, c.a3);
      added++;
    }
  }
}

function npcRespond(s: GameState, r: Rng, sto: Story, a: Act): void {
  const ego = facet(s, a, 'ego'), imp = facet(s, a, 'impulsividade');
  const o = outletById17(s, sto.out);
  if (sto.tone >= 0) { sto.resp = 'silent'; return; }
  if (!sto.truth && (ego > 65 || imp > 65) && o && o.cred >= 35 && r.chance(0.35)) { sto.resp = 'sue'; openSuit(s, sto, a.id, 0.6, false); return; }
  sto.resp = !sto.truth || r.chance(ego / 160) ? 'deny' : 'silent';
  if (sto.resp === 'deny' && sto.truth) sto.lied = 1;
}

function resolve(s: GameState, r: Rng, sto: Story): void {
  const st = m17(s);
  const a = sto.a ? s.acts[sto.a] : undefined;
  const o = outletById17(s, sto.out);
  const mine = a && playerActs(s).includes(a.id);
  const tp = tplById[sto.tpl];
  if (sto.truth) {
    const pc = 0.35 + sto.cred / 200 + (sto.src === 'paparazzi' || sto.src === 'insider' ? 0.15 : 0);
    if (!r.chance(pc)) { sto.st = 'faded'; sto.why = l('Ninguém provou nada; o assunto morreu.', 'Nobody proved anything; the story died.'); return; }
    sto.st = 'confirmed';
    sto.why = sto.src === 'insider' || sto.src === 'paparazzi' ? l('Apareceram provas (fotos, documentos).', 'Proof surfaced (photos, papers).') : l('Os fatos confirmaram o boato.', 'Events confirmed the rumor.');
    const f = sto.fact ? facts17(s).f.find((x) => x.id === sto.fact) : undefined;
    if (f) raiseVisibility(f, 'public');
    const sk = tp?.sk ?? (f ? (['drugs', 'sex', 'violence', 'money', 'crime', 'offense', 'blasphemy', 'politics', 'conduct'] as ScandalKind[]).find((k) => f.tags.includes(k)) : undefined);
    if (a && sto.tone < 0 && sk && f?.kind !== 'scandal') scandal(s, a.id, sk, sto.sev, fmtL(l('Confirmado: {t}', 'Confirmed: {t}'), { t: sto.t }), { cause: f ? [f.id] : undefined, tags: ['media17'] });
    if (a && sto.lied) { scandal(s, a.id, 'conduct', 35, fmtL(l('{a} mentiu à imprensa: o desmentido caiu.', '{a} lied to the press: the denial collapsed.'), { a: a.name }), { tags: ['media17'] }); if (mine) a.trust = clamp(a.trust - 4, 0, 100); }
    if (a && tp?.id === 'split' && sto.tone < 0) for (const p of mem(s, a)) p.morale = clamp(p.morale - 4, 0, 100);
    return;
  }
  // falso
  if (!r.chance(0.5 + (1 - sto.cred / 100) * 0.2 + (sto.resp === 'deny' ? 0.15 : 0))) { sto.st = 'faded'; sto.why = l('Nunca foi desmentido de vez: fica a dúvida.', 'Never fully debunked: doubt lingers.'); return; }
  sto.st = 'debunked';
  st.credD[sto.out] = clamp((st.credD[sto.out] ?? 0) - (o?.line === 'serious' ? 8 : 3), -40, 20);
  sto.why = fmtL(l('Era mentira: {o} perde credibilidade ({c}).', 'It was false: {o} loses credibility ({c}).'), { o: o?.name ?? '?', c: o?.line === 'serious' ? -8 : -3 });
  if (a) {
    addHype(s, `a:${a.id}`, `m17d:${sto.tpl}`, tp?.id === 'deathhoax' ? fmtL(l('"{a} está vivo!": o boato da morte vendeu discos', '"{a} is alive!": the death hoax sold records'), { a: a.name }) : l('Solidariedade depois de boato falso', 'Sympathy after a false rumor'), tp?.id === 'deathhoax' ? 18 : 5);
    if (sto.tone < 0) for (const a3 of sto.reach.slice(0, 6)) { const d = (f16(s).d[a.id] ??= {}); d[a3] = clamp((d[a3] ?? 0) + 0.3, -40, 40); }
  }
  if (sto.mine && sto.traced) log(s, fmtL(l('O boato que você plantou ("{t}") foi desmentido.', 'The rumor you planted ("{t}") was debunked.'), { t: sto.t }));
  if (mine && sto.tone < 0 && o && !o.mine && o.cred >= 30) notify(s, fmtL(l('Boato desmentido: "{t}". Dá para processar {o} por difamação (Notícias).', 'Rumor debunked: "{t}". You can sue {o} for defamation (News).'), { t: sto.t, o: o.name }), 'info');
}

function openSuit(s: GameState, sto: Story, who: string, p: number, vsPlayer: boolean): Suit {
  const st = m17(s);
  const a = s.acts[sto.a ?? ''];
  const sc: Suit = { id: `su${++st.seq}`, story: sto.id, out: sto.out, who, due: s.week + 26 + (hashString(sto.id) % 26), p: clamp(p, 0.05, 0.95), dmg: money(s, 4000 + (a?.fame ?? 30) * 220), ...(vsPlayer ? { vsPlayer: 1 as const } : {}), t: sto.t };
  st.suits.push(sc);
  st.rel[sto.out] = clamp((st.rel[sto.out] ?? 0) - 25, -100, 100);
  return sc;
}
function suitEnd(s: GameState, r: Rng, sc: Suit): void {
  const st = m17(s);
  const sto = st.st.find((x) => x.id === sc.story);
  const o = outletById17(s, sc.out);
  const win = r.chance(sc.p);
  const mineP = sc.who === 'player' || playerActs(s).includes(sc.who);
  if (sc.vsPlayer) {
    // você foi processado (boato plantado e rastreado)
    if (win) { post(s, `m17suit:${sc.id}`, -sc.dmg, 'legal', 'Difamação (condenação)'); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100); }
    const t = win ? fmtL(l('Condenado por difamação ("{t}"): indenização de {v} e reputação −6.', 'Found liable for defamation ("{t}"): damages and reputation −6.'), { t: sc.t, v: Math.round(sc.dmg / 100) }) : fmtL(l('Processo por difamação ("{t}") arquivado: você escapou.', 'Defamation suit ("{t}") dismissed: you got away with it.'), { t: sc.t });
    notify(s, t, win ? 'bad' : 'good'); log(s, t);
    emitFact(s, { kind: 'case_ruling', actors: ['player', sc.who], severity: win ? 50 : 25, visibility: 'public', tags: ['media17', win ? 'bad' : 'good'], text: t, src: 'media17' });
    return;
  }
  if (win) {
    if (mineP) post(s, `m17suit:${sc.id}`, sc.dmg, 'other_income', 'Difamação (indenização)');
    if (sto) { sto.st = 'retracted'; sto.why = l('Retratação publicada por ordem judicial.', 'Retraction printed by court order.'); }
    st.credD[sc.out] = clamp((st.credD[sc.out] ?? 0) - 10, -40, 20);
  } else if (sto && sto.a) addHype(s, `a:${sto.a}`, 'm17streisand', l('Efeito Streisand: o processo espalhou o boato', 'Streisand effect: the lawsuit spread the rumor'), 10);
  const nm = s.acts[sc.who]?.name ?? s.config.companyName;
  const t = win ? fmtL(l('{a} vence {o} na Justiça: retratação e indenização.', '{a} beats {o} in court: retraction and damages.'), { a: nm, o: o?.name ?? '?' }) : fmtL(l('{a} perde o processo contra {o}: o boato voltou às capas.', '{a} loses the suit against {o}: the rumor is back on the covers.'), { a: nm, o: o?.name ?? '?' });
  if (mineP) notify(s, t, win ? 'good' : 'bad');
  log(s, t);
  emitFact(s, { kind: 'case_ruling', actors: [sc.who], severity: 40, visibility: 'public', tags: ['media17', win ? 'good' : 'bad'], text: t, src: 'media17' });
}

/** Conglomerados: a partir de 1985 os maiores selos NPC compram veículos (e os favorecem nas resenhas e fofocas). */
function ownership(s: GameState): void {
  if (s.year < 1985 || s.month !== 0) return;
  const st = m17(s);
  const labels = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.roster.length - a.roster.length).slice(0, 3);
  const cands = outletsIn(s.year).filter((o) => (o.kind === 'magazine' || o.kind === 'tv' || o.kind === 'radio') && !st.own[o.id] && !/Estado|Família|Organizações/.test(o.owner ?? ''));
  for (const lb of labels) {
    if (Object.values(st.own).filter((x) => x === lb.id).length >= 2 || !cands.length) continue;
    const o = cands.splice(hashString(lb.id + s.year) % cands.length, 1)[0];
    st.own[o.id] = lb.id;
    log(s, fmtL(l('{l} compra {o}: o grupo agora tem imprensa própria.', '{l} buys {o}: the group now has its own press.'), { l: lb.name, o: o.name }));
  }
  for (const [oid, lid] of Object.entries(st.own)) if (!s.labels[lid]?.active) delete st.own[oid];
}

/** desliga a imprensa viva (testes A/B de balanço) */
export const MEDIA17 = { off: false };
registerSimHook('month', 'media17', (s) => {
  ensureCritics17();
  if (MEDIA17.off) return;
  const r = Rng.fromSeed(`${s.config.seed}:media17:${s.year}:${s.month}`);
  const st = m17(s);
  const list = outlets17(s);
  ownership(s);
  ingestFacts(s, r, list);
  leaks(s, r, list);
  gossip(s, r, list);
  spread(s, r);
  const mine = new Set(playerActs(s));
  for (const sto of st.st) {
    if (sto.st !== 'open') continue;
    const a = sto.a ? s.acts[sto.a] : undefined;
    if (a && !mine.has(a.id) && !sto.resp && s.week - sto.w >= 4) npcRespond(s, r, sto, a);
    if (s.week >= sto.due) resolve(s, r, sto);
  }
  for (const sc of st.suits.filter((x) => s.week >= x.due)) suitEnd(s, r, sc);
  st.suits = st.suits.filter((x) => s.week < x.due);
  for (const k of Object.keys(st.rel)) { st.rel[k] = Math.round(st.rel[k] * 0.97 * 10) / 10; if (Math.abs(st.rel[k]) < 0.5) delete st.rel[k]; }
  for (const [k, w] of Object.entries(st.cd)) if (w < s.week - 52) delete st.cd[k];
  reviewFacts(s);
});

// ---------------------------------------------------------------- resenhas: dono do veículo e relação com a imprensa

registerReviewAdjust('media17', (s, rel) => {
  const st = m17(s);
  const a = s.acts[rel.actId];
  if (!a) return 0;
  let v = 0;
  if (a.owner && Object.values(st.own).includes(a.owner)) v += 0.25; // revista do mesmo grupo
  if (rel.owner === 'player' || a.playerBand) {
    const ser = outletsIn(s.year).filter((o) => o.line === 'serious' || o.line === 'underground');
    const avg = ser.length ? ser.reduce((t, o) => t + (st.rel[o.id] ?? 0), 0) / ser.length : 0;
    v += clamp(avg / 120, -0.4, 0.4);
  }
  return v;
});

/** Resenha muito dura para ato famoso vira Fact 'review' (alimenta a situação do diretor "responder ao crítico"). */
function reviewFacts(s: GameState): void {
  const st = m17(s);
  const mine = new Set(playerActs(s));
  for (const a of Object.values(s.acts)) {
    if (!live(a) || (a.fame < 40 && !mine.has(a.id))) continue;
    const rid = a.releases[a.releases.length - 1];
    const rel = rid ? s.releases[rid] : undefined;
    if (!rel || s.week - rel.week > 5 || st.seen[rid]) continue;
    const worst = (s.reviews[rid] ?? []).slice().sort((x, y) => x.score - y.score)[0];
    if (!worst || worst.score > 4.5) continue;
    st.seen[rid] = 1;
    emitFact(s, { kind: 'review', actors: [a.id], place: a.city, severity: Math.round(30 + (5 - worst.score) * 8 + a.fame / 5), visibility: 'public', tags: ['bad', 'media17'], text: fmtL(l('{c} detona "{t}" de {a}: nota {n}.', '{c} pans "{t}" by {a}: {n}/10.'), { c: worst.critic, t: rel.title, a: a.name, n: worst.score }), src: 'media17', data: { critic: worst.critic, rel: rid } });
  }
  const keys = Object.keys(st.seen);
  if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete st.seen[k];
}

registerSituation({
  id: 'critic_pan', pressure: 'fame', cost: 1, cooldown: 4, trigger: ['review'],
  when: (s, c) => !!c.fact && !!s.acts[c.fact.actors[0]],
  actorsPick: (s, c) => { const a = s.acts[c.fact!.actors[0]]; const p = lead(s, a); return p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: { critic: String(c.fact!.data?.critic ?? '?') } } : null; },
  title: (s, c) => fmtL(l('{c} detonou o disco', '{c} panned the record'), { c: String(c.data.critic) }),
  text: (s, c) => fmtL(l('A resenha de {c} sobre {a} está em todo lugar. Responder vira rixa (hype, mas o crítico não esquece); convidar para ouvir ao vivo custa e pode virar o jogo; ignorar dói por dentro.', '{c}\'s review of {a} is everywhere. Hitting back starts a feud (hype, but critics remember); inviting them to a show costs money and may turn it around; ignoring it hurts inside.'), { c: String(c.data.critic), a: s.acts[c.act ?? '']?.name ?? '?' }),
  options: [
    { id: 'reply', label: l('Responder em público', 'Hit back in public'), hint: l('+12 de hype; relação com o crítico −20; 30% de virar rixa famosa (boato que corre)', '+12 hype; critic relationship −20; 30% it becomes a famous feud (a rumor that travels)'),
      weightByTraits: (P) => ((P?.facets.ego ?? 50) + (P?.facets.impulsividade ?? 50)) / 70,
      apply: (s, c, r) => {
        const a = s.acts[c.act ?? '']; const cr = String(c.data.critic);
        if (a) addHype(s, `a:${a.id}`, 'm17reply', fmtL(l('Rixa com o crítico {c}', 'Feud with critic {c}'), { c: cr }), 12);
        if (a && playerActs(s).includes(a.id)) { const cs = critRel(s); if (cs?.rel) cs.rel[cr] = clamp((cs.rel[cr] ?? 0) - 20, -100, 100); }
        if (a && r.chance(0.3)) { const o = pickOutlet(outlets17(s), `cf${a.id}${s.week}`, ['tabloid', 'fan', 'mainstream']); if (o) addStory(s, { t: fmtL(l('{a} x {c}: a briga entre artista e crítico vira novela', '{a} vs {c}: the artist–critic fight becomes a saga'), { a: a.name, c: cr }), tpl: 'critic_feud', a: a.id, out: o.id, src: 'npc', truth: 1, st: 'confirmed', cred: o.cred, sev: 35, tone: 0, due: s.week, news: 1 }); return l('Virou rixa famosa: hype alto, crítico inimigo.', 'It became a famous feud: big hype, an enemy critic.'); }
        return l('Resposta publicada: hype +12, o crítico anotou o nome.', 'Reply published: hype +12, the critic took note.');
      } },
    { id: 'invite', label: l('Convidar para um show', 'Invite them to a show'), hint: l('Custa ~$1,5 mil; relação +10; 50% de o crítico escrever uma nota mais branda (+6 de hype)', 'Costs ~$1.5k; relationship +10; 50% the critic writes a kinder follow-up (+6 hype)'),
      weightByTraits: (P) => ((P?.facets.empatia ?? 50) + (P?.facets.paciencia ?? 50)) / 90,
      apply: (s, c, r) => {
        const a = s.acts[c.act ?? '']; const cr = String(c.data.critic);
        const mineA = a && playerActs(s).includes(a.id);
        if (mineA) { post(s, `m17inv:${a!.id}`, -money(s, 1500), 'marketing', `Convite ao crítico ${cr}`); const cs = critRel(s); if (cs?.rel) cs.rel[cr] = clamp((cs.rel[cr] ?? 0) + 10, -100, 100); }
        if (a && r.chance(0.5)) { addHype(s, `a:${a.id}`, 'm17inv', fmtL(l('{c} revê a opinião depois do show', '{c} reconsiders after the show'), { c: cr }), 6); return l('O crítico foi, gostou e escreveu uma nota mais branda.', 'The critic came, liked it and wrote a kinder note.'); }
        return l('O crítico foi, mas não mudou de ideia.', 'The critic came but did not change their mind.');
      } },
    { id: 'ignore', label: l('Ignorar', 'Ignore it'), hint: l('Nada muda lá fora; estresse +6 no líder', 'Nothing changes outside; leader stress +6'),
      apply: (s, c) => { if (c.cast.person) addStress(s, c.cast.person, 6, l('Resenha cruel', 'Cruel review')); } },
  ],
});

/** Artistas leem jornal: selo flagrado plantando boato/abafando/espionando assusta; boa imprensa ajuda. */
registerOfferMod('media17', (s) => {
  const st = m17(s);
  let bad = 0, good = 0;
  for (const x of st.st) {
    if (s.week - x.w > 52) break;
    if ((x.mine && x.traced) || x.tpl === 'coverup') bad++;
    else if (x.mine && x.tone > 0 && x.news) good++;
  }
  const v = clamp(-bad * 0.035 + Math.min(3, good) * 0.01, -0.12, 0.03);
  if (Math.abs(v) < 0.005) return null;
  return { delta: v, reason: v < 0 ? fmtL(l('Imprensa: seu selo foi pego manipulando a mídia ({n}× no último ano)', 'Press: your label was caught manipulating the media ({n}× in the last year)'), { n: bad }) : l('Imprensa: boas exclusivas e entrevistas recentes', 'Press: good recent exclusives and interviews') };
});

// ---------------------------------------------------------------- ações do jogador (com chance e custo à vista)

export interface Odds { ok: boolean; why?: L; cost: number; p: number; trace: number; suit: number; truth: 0 | 1 | null; notes: L[] }
const knowsTruth = (s: GameState, actId: string): boolean => playerActs(s).includes(actId) || holdsOf(s, 'player').has.some((h) => h.kind === 'secret' && (h.target === actId || s.acts[actId]?.members.includes(h.target)));
const LINE_COST: Record<O17['line'], number> = { tabloid: 1500, fan: 600, mainstream: 3000, serious: 6000, underground: 800, trade: 2500 };

/** Plantar boato: custo, chance de publicar, de rastrearem até você e de processo. */
export function plantOdds(s: GameState, actId: string, tplId: string, outId: string): Odds {
  const a = s.acts[actId], tp = tplById[tplId], o = outletById17(s, outId);
  const z: Odds = { ok: false, cost: 0, p: 0, trace: 0, suit: 0, truth: null, notes: [] };
  if (!a || !tp || !o || tp.from > s.year) return { ...z, why: l('Indisponível.', 'Unavailable.') };
  if ((m17(s).cd[`p:${actId}`] ?? 0) > s.week) return { ...z, why: l('Cedo demais: já há boato seu sobre esse ato.', 'Too soon: you already have a rumor about this act.') };
  const pr = prTier(s), rel = relOf(s, o.id);
  const truth = knowsTruth(s, actId) ? (tp.real(s, a) ? 1 : 0) : null;
  const cost = o.mine ? 0 : money(s, LINE_COST[o.line] * (0.6 + a.fame / 100));
  const p = o.mine ? 1 : clamp(0.9 - o.cred / 150 + rel / 250 + pr * 0.04 + (truth === 1 ? 0.25 : 0), 0.05, 0.95);
  const trace = clamp(0.1 + a.fame / 500 + (o.line === 'serious' ? 0.1 : 0) + (o.mine ? 0.2 : 0) - pr * 0.03 - (o.kind === 'social' ? 0.05 : 0) + (rel < 0 ? 0.1 : 0), 0.03, 0.7);
  const suit = truth === 1 ? 0 : clamp(0.25 + o.cred / 250 + a.fame / 400, 0, 0.8);
  const notes: L[] = [
    fmtL(l('Alcance {r}, credibilidade {c}: boato em veículo sério pesa mais e espalha devagar; tabloide e rede espalham rápido e pesam pouco.', 'Reach {r}, credibility {c}: a serious outlet weighs more and spreads slowly; tabloids and networks spread fast and weigh little.'), { r: o.reach, c: Math.round(o.cred) }),
    truth === null ? l('Você não sabe se é verdade: se for mentira, pode virar processo por difamação.', 'You don\'t know if it\'s true: if it\'s false, it may become a defamation suit.') : truth ? l('Você sabe que é verdade: sem risco de difamação, e a confirmação vira escândalo para eles.', 'You know it\'s true: no defamation risk, and confirmation becomes their scandal.') : l('Você sabe que é mentira: se descobrirem, o processo é quase certo.', 'You know it\'s false: if traced, a lawsuit is almost certain.'),
  ];
  if (o.mine) notes.push(l('Veículo próprio: publica de graça, mas a credibilidade dele cai 8.', 'Your own outlet: free, but its credibility drops 8.'));
  if (playerActs(s).includes(actId)) notes.push(l('Boato sobre o próprio artista (golpe de publicidade): se rastrearem, a confiança dele cai.', 'A rumor about your own act (publicity stunt): if traced, their trust drops.'));
  return { ok: true, cost, p, trace, suit, truth, notes };
}

export function plantRumor(s: GameState, actId: string, tplId: string, outId: string): { ok: boolean; text: L } {
  const od = plantOdds(s, actId, tplId, outId);
  if (!od.ok) return { ok: false, text: od.why ?? l('Indisponível.', 'Unavailable.') };
  const st = m17(s), a = s.acts[actId], tp = tplById[tplId], o = outletById17(s, outId)!;
  if (od.cost && s.player.cash < od.cost) return { ok: false, text: l('Sem dinheiro.', 'Not enough cash.') };
  if (od.cost && !post(s, `m17plant:${actId}`, -od.cost, 'marketing', `Boato: ${a.name}`)) return { ok: false, text: l('Já feito nesta semana.', 'Already done this week.') };
  st.cd[`p:${actId}`] = s.week + 8;
  const r = Rng.fromSeed(`${s.config.seed}:m17p:${s.week}:${actId}:${tplId}:${outId}`);
  if (!r.chance(od.p)) { st.rel[o.id] = clamp((st.rel[o.id] ?? 0) - 3, -100, 100); return { ok: true, text: fmtL(l('{o} recusou publicar sem provas. O dinheiro não volta.', '{o} refused to print without proof. The money is gone.'), { o: o.name }) }; }
  const pairs = Object.values(s.acts).filter((b) => live(b) && b.id !== a.id && b.fame >= 30 && (tp.pair !== 'genre' || b.genre === a.genre));
  const b = tp.pair && pairs.length ? r.pick(pairs) : undefined;
  const truth = tp.real(s, a, b) ? 1 : 0;
  if (o.mine) { const x = medOf(s, o.id.slice(2)); x.cred = clamp(x.cred - 8, 0, 100); }
  const sto = addStory(s, { t: fmtL(tp.t, { a: a.name, b: b?.name ?? '' }), tpl: tp.id, a: a.id, b: b?.id, out: o.id, src: 'columnist', via: l('fonte anônima', 'anonymous source').pt, truth, st: 'open', cred: o.cred, sev: tp.sev, tone: tp.tone, due: due(s, r, o), mine: 1 });
  sto.reach = [...new Set([...sto.reach, ...COUNTRY_INFO.filter((c) => c.market === o.market).slice(0, 2).map((c) => c.a3)])];
  for (const a3 of sto.reach) regionalHit(s, sto, a3);
  let msg = fmtL(l('Publicado em {o}: "{t}".', 'Printed in {o}: "{t}".'), { o: o.name, t: sto.t });
  if (r.chance(od.trace)) {
    sto.traced = 1;
    const p = lead(s, a);
    if (playerActs(s).includes(a.id)) { a.trust = clamp(a.trust - 8, 0, 100); msg = fmtL(l('{m} Mas {a} descobriu que foi você (confiança −8).', '{m} But {a} found out it was you (trust −8).'), { m: msg, a: a.name }); }
    else {
      if (p) grantHold(s, { holder: p.id, target: 'player', kind: 'grievance', strength: 35 + a.fame / 3, months: 36, src: 'media17', text: fmtL(l('Você plantou um boato sobre {a}', 'You planted a rumor about {a}'), { a: a.name }) });
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
      emitFact(s, { kind: 'statement', actors: ['player', a.id], place: s.config.homeCity, severity: 40, visibility: 'public', tags: ['bad', 'media17'], text: fmtL(l('{c} estaria por trás do boato sobre {a}.', '{c} is said to be behind the rumor about {a}.'), { c: s.config.companyName, a: a.name }), src: 'media17' });
      msg = fmtL(l('{m} Rastrearam até você: mágoa de {a}, reputação institucional −4.', '{m} It was traced back to you: {a} holds a grudge, institutional reputation −4.'), { m: msg, a: a.name });
      if (!truth && r.chance(od.suit / Math.max(0.1, od.trace))) { openSuit(s, sto, a.id, 0.45 + o.cred / 300, true); msg = fmtL(l('{m} E vão processar por difamação.', '{m} And they\'re suing for defamation.'), { m: msg }); }
    }
  }
  log(s, msg);
  return { ok: true, text: msg };
}

/** Soltar notícia/exclusiva sobre um artista seu. */
export function releaseOdds(s: GameState, actId: string, outId: string, excl: boolean): Odds {
  const a = s.acts[actId], o = outletById17(s, outId);
  const z: Odds = { ok: false, cost: 0, p: 1, trace: 0, suit: 0, truth: 1, notes: [] };
  if (!a || !o || !playerActs(s).includes(actId)) return { ...z, why: l('Só para artistas seus.', 'Only for your acts.') };
  if ((m17(s).cd[`r:${actId}`] ?? 0) > s.week) return { ...z, why: l('Cedo demais: a imprensa ainda está digerindo a última.', 'Too soon: the press is still digesting the last one.') };
  const hype = Math.round((excl ? 6 : 3) + o.reach / (excl ? 9 : 15) + a.fame / 20);
  return { ...z, ok: true, cost: excl ? 0 : money(s, 300), p: excl ? 1 : clamp(0.5 + relOf(s, o.id) / 200 + prTier(s) * 0.08 + a.fame / 250, 0.15, 0.95), notes: [fmtL(l('~+{h} de hype. {x}', '~+{h} hype. {x}'), { h: hype, x: excl ? l('Exclusiva: o veículo fica grato (+12), os concorrentes do mesmo mercado nem tanto (−3).', 'Exclusive: the outlet is grateful (+12), its same-market rivals less so (−3).') : l('Comunicado para todos: pode ser ignorado se o artista for pequeno.', 'Press release to all: may be ignored if the act is small.') })] };
}
export function releaseNews(s: GameState, actId: string, outId: string, excl: boolean): { ok: boolean; text: L } {
  const od = releaseOdds(s, actId, outId, excl);
  if (!od.ok) return { ok: false, text: od.why! };
  const st = m17(s), a = s.acts[actId], o = outletById17(s, outId)!;
  if (od.cost) post(s, `m17rel:${actId}`, -od.cost, 'marketing', `Release ${a.name}`);
  st.cd[`r:${actId}`] = s.week + 6;
  const r = Rng.fromSeed(`${s.config.seed}:m17r:${s.week}:${actId}:${outId}`);
  if (!r.chance(od.p)) return { ok: true, text: l('Ninguém publicou o comunicado.', 'Nobody ran the press release.') };
  const pr = s.pendingReleases.filter((p) => p.actId === a.id).sort((x, y) => x.week - y.week)[0];
  const tr = s.tours.find((x) => x.actId === a.id && (x.status === 'planned' || x.status === 'running'));
  const t = pr ? fmtL(l('{a} anuncia "{t}"', '{a} announces "{t}"'), { a: a.name, t: pr.title }) : tr ? fmtL(l('{a} anuncia a turnê "{t}"', '{a} announces the "{t}" tour'), { a: a.name, t: tr.name }) : fmtL(l('{a} abre o jogo sobre a carreira', '{a} opens up about their career'), { a: a.name });
  const full = excl ? fmtL(l('Exclusiva: {t}', 'Exclusive: {t}'), { t }) : t;
  addStory(s, { t: full, tpl: excl ? 'exclusive' : 'release', a: a.id, out: o.id, src: 'player', truth: 1, st: 'confirmed', cred: o.cred, sev: 25, tone: 1, due: s.week, news: 1, mine: 1 });
  const hype = Math.round((excl ? 6 : 3) + o.reach / (excl ? 9 : 15) + a.fame / 20);
  addHype(s, pr ? `n:${a.id}` : `a:${a.id}`, `m17rel`, fmtL(l('{o}: {t}', '{o}: {t}'), { o: o.name, t }), hype);
  if (excl) { st.rel[o.id] = clamp((st.rel[o.id] ?? 0) + 12, -100, 100); for (const x of outlets17(s)) if (x.id !== o.id && x.market === o.market && x.kind === o.kind) st.rel[x.id] = clamp((st.rel[x.id] ?? 0) - 3, -100, 100); }
  return { ok: true, text: fmtL(l('{t} — +{h} de hype.', '{t} — +{h} hype.'), { t: full, h: hype }) };
}

export type Resp = 'deny' | 'confirm' | 'silent' | 'kill' | 'sue';
/** Resposta a boato sobre artista seu: chance e custo de cada caminho. */
export function respondOdds(s: GameState, storyId: string, v: Resp): Odds {
  const sto = m17(s).st.find((x) => x.id === storyId);
  const o = sto ? outletById17(s, sto.out) : undefined;
  const z: Odds = { ok: false, cost: 0, p: 0, trace: 0, suit: 0, truth: sto?.truth ?? null, notes: [] };
  const late = v === 'sue' && (sto?.st === 'debunked' || sto?.st === 'faded') && sto.tone < 0;
  if (!sto || !o || (sto.st !== 'open' && !late) || sto.resp === 'sue' || !sto.a || !playerActs(s).includes(sto.a)) return { ...z, why: l('Indisponível.', 'Unavailable.') };
  const a = s.acts[sto.a];
  if (v === 'silent') return { ...z, ok: true, p: 1, notes: [l('Deixa o boato correr até morrer sozinho (ou ser provado).', 'Let it run until it dies (or is proven).')] };
  if (v === 'deny') return { ...z, ok: true, p: 1, notes: [sto.truth ? l('É verdade: negar segura agora, mas se for provado vira escândalo de mentira.', 'It\'s true: denying holds for now, but if proven it becomes a lying scandal.') : l('É mentira: o desmentido reduz o estrago pela metade e acelera o desmentido.', 'It\'s false: denying halves the damage and speeds up the debunk.')] };
  if (v === 'confirm') return sto.truth ? { ...z, ok: true, p: 1, notes: [l('Assumir antes controla a narrativa: escândalo com 60% da gravidade.', 'Owning it first controls the story: scandal at 60% severity.')] } : { ...z, why: l('Não dá para confirmar o que é mentira.', 'You cannot confirm something false.') };
  if (v === 'kill') {
    if (o.mine) return { ...z, ok: true, p: 1, notes: [l('Veículo seu: tira do ar (credibilidade −5).', 'Your outlet: pull it (credibility −5).')] };
    const p = clamp(0.35 + relOf(s, o.id) / 150 + (o.line === 'tabloid' ? 0.25 : 0) - o.cred / 250 + prTier(s) * 0.04, 0.05, 0.9);
    return { ...z, ok: true, cost: money(s, 4000 * (1 + sto.sev / 50) * (o.reach / 60)), p, notes: [l('Comprar a história ("catch and kill"): se falhar, vira manchete de abafamento.', 'Buy the story ("catch and kill"): if it fails, the cover-up becomes the headline.')] };
  }
  // processo
  const malice = o.market === 'na' && s.year >= 1964;
  const p = sto.truth ? 0.1 : clamp(0.55 + (1 - o.cred / 100) * 0.2 - (malice ? 0.2 : 0) + (a.fame < 40 ? 0.1 : 0), 0.1, 0.9);
  return { ...z, ok: !o.mine, why: o.mine ? l('Não dá para processar o próprio veículo.', 'You cannot sue your own outlet.') : undefined, cost: money(s, 8000), p, notes: [
    malice ? l('EUA desde 1964 (NYT v. Sullivan): figura pública precisa provar "malícia real" — mais difícil ganhar.', 'US since 1964 (NYT v. Sullivan): a public figure must prove "actual malice" — harder to win.') : l('Fora dos EUA a lei de difamação é mais favorável a quem processa.', 'Outside the US, defamation law favors the plaintiff.'),
    sto.truth ? l('É verdade: processar quase sempre perde e o processo espalha o boato (efeito Streisand).', 'It\'s true: suing almost always loses and spreads the rumor (Streisand effect).') : l('Ganhar: indenização, retratação e o veículo perde credibilidade. Leva 6–12 meses.', 'Winning: damages, retraction and the outlet loses credibility. Takes 6–12 months.')] };
}
export function respond(s: GameState, storyId: string, v: Resp): { ok: boolean; text: L } {
  const od = respondOdds(s, storyId, v);
  if (!od.ok) return { ok: false, text: od.why ?? l('Indisponível.', 'Unavailable.') };
  const st = m17(s), sto = st.st.find((x) => x.id === storyId)!, a = s.acts[sto.a!], o = outletById17(s, sto.out)!;
  if (od.cost && s.player.cash < od.cost) return { ok: false, text: l('Sem dinheiro.', 'Not enough cash.') };
  if (od.cost) post(s, `m17resp:${sto.id}:${v}`, -od.cost, v === 'sue' ? 'legal' : 'marketing', `Imprensa: ${v} ${a.name}`);
  sto.resp = v;
  const r = Rng.fromSeed(`${s.config.seed}:m17resp:${sto.id}:${v}:${s.week}`);
  if (v === 'silent') return { ok: true, text: l('Sem comentários.', 'No comment.') };
  if (v === 'deny') {
    if (sto.truth) { sto.lied = 1; return { ok: true, text: l('Desmentido publicado. Torça para ninguém provar.', 'Denial issued. Hope nobody proves it.') }; }
    sto.due = Math.min(sto.due, s.week + 4);
    addHype(s, `a:${a.id}`, 'm17deny', l('Desmentido firme', 'Firm denial'), 3);
    return { ok: true, text: l('Desmentido publicado: o boato perde força.', 'Denial issued: the rumor loses steam.') };
  }
  if (v === 'confirm') {
    sto.st = 'confirmed'; sto.why = l('Você assumiu antes de provarem.', 'You owned it before anyone proved it.');
    const sk = tplById[sto.tpl]?.sk;
    if (sk && sto.tone < 0) scandal(s, a.id, sk, Math.round(sto.sev * 0.6), fmtL(l('{a} assume: {t}', '{a} admits it: {t}'), { a: a.name, t: sto.t }), { tags: ['media17'] });
    else addHype(s, `a:${a.id}`, 'm17conf', l('Assumiu em público', 'Owned it publicly'), 6);
    a.trust = clamp(a.trust + 2, 0, 100);
    return { ok: true, text: l('Assumido: o estrago fica menor e a imprensa respeita a franqueza.', 'Owned: less damage and the press respects the candor.') };
  }
  if (v === 'kill') {
    if (o.mine) { const x = medOf(s, o.id.slice(2)); x.cred = clamp(x.cred - 5, 0, 100); sto.st = 'killed'; return { ok: true, text: l('Matéria retirada do ar no seu veículo.', 'Story pulled from your outlet.') }; }
    if (r.chance(od.p)) { sto.st = 'killed'; sto.why = l('Comprada e engavetada.', 'Bought and buried.'); st.rel[o.id] = clamp((st.rel[o.id] ?? 0) + 5, -100, 100); return { ok: true, text: fmtL(l('{o} engavetou a história.', '{o} buried the story.'), { o: o.name }) }; }
    sto.sev = Math.min(90, sto.sev + 15);
    const p2 = pickOutlet(outlets17(s), `ck${sto.id}`, ['serious', 'tabloid'], cityById[a.city]?.market) ?? o;
    addStory(s, { t: fmtL(l('{c} tentou comprar o silêncio de {o} sobre {a}', '{c} tried to buy {o}\'s silence about {a}'), { c: s.config.companyName, o: o.name, a: a.name }), tpl: 'coverup', a: a.id, out: p2.id, src: 'insider', truth: 1, st: 'confirmed', cred: p2.cred, sev: 50, tone: -1, due: s.week, news: 1 });
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
    return { ok: true, text: l('Não aceitaram — e publicaram a tentativa de abafar. Reputação −5.', 'They refused — and printed the cover-up attempt. Reputation −5.') };
  }
  const sc = openSuit(s, sto, a.id, od.p, false);
  return { ok: true, text: fmtL(l('Processo aberto contra {o}: decisão em ~{n} meses ({p}% de chance).', 'Suit filed against {o}: ruling in ~{n} months ({p}% chance).'), { o: o.name, n: Math.round((sc.due - s.week) / 4.35), p: Math.round(sc.p * 100) }) };
}

/** Relação com veículo: almoço com editor, anúncios. */
export type Court = 'lunch' | 'ads';
export function courtOdds(s: GameState, outId: string, v: Court): Odds {
  const o = outletById17(s, outId);
  const z: Odds = { ok: false, cost: 0, p: 1, trace: 0, suit: 0, truth: null, notes: [] };
  if (!o || o.mine) return { ...z, why: l('Indisponível.', 'Unavailable.') };
  if ((m17(s).cd[`c:${v}:${outId}`] ?? 0) > s.week) return { ...z, why: l('Já feito recentemente.', 'Done recently.') };
  if (v === 'lunch') return { ...z, ok: true, cost: money(s, 400 * (0.5 + o.cred / 60)), notes: [l('+6 de relação; serve de porta para exclusivas e para abafar.', '+6 relationship; opens the door to exclusives and kills.')] };
  const serious = o.cred >= 75;
  return { ...z, ok: true, cost: money(s, 1800 * (0.4 + o.reach / 60)), notes: [serious ? l('Veículo sério: anúncio rende só +4 (redação independente).', 'Serious outlet: ads only yield +4 (independent newsroom).') : l('+10 de relação: anunciante bom é anunciante protegido.', '+10 relationship: a good advertiser is a protected advertiser.')] };
}
export function court(s: GameState, outId: string, v: Court): { ok: boolean; text: L } {
  const od = courtOdds(s, outId, v);
  if (!od.ok) return { ok: false, text: od.why! };
  if (s.player.cash < od.cost) return { ok: false, text: l('Sem dinheiro.', 'Not enough cash.') };
  const st = m17(s), o = outletById17(s, outId)!;
  post(s, `m17court:${outId}:${v}`, -od.cost, 'marketing', `Imprensa: ${o.name}`);
  st.cd[`c:${v}:${outId}`] = s.week + (v === 'lunch' ? 8 : 12);
  const d = v === 'lunch' ? 6 : o.cred >= 75 ? 4 : 10;
  st.rel[outId] = clamp((st.rel[outId] ?? 0) + d, -100, 100);
  return { ok: true, text: fmtL(l('Relação com {o}: +{d}.', 'Relationship with {o}: +{d}.'), { o: o.name, d }) };
}

/** Detetive/paparazzo seguindo um ato: pode achar um segredo (vira obrigação "segredo" com prova). */
export function stakeoutOdds(s: GameState, actId: string): Odds {
  const a = s.acts[actId];
  const z: Odds = { ok: false, cost: 0, p: 0, trace: 0, suit: 0, truth: null, notes: [] };
  if (!a || playerActs(s).includes(actId) || !live(a)) return { ...z, why: l('Escolha um artista de outro selo.', 'Pick an act from another label.') };
  if ((m17(s).cd[`s:${actId}`] ?? 0) > s.week) return { ...z, why: l('Já está sendo seguido.', 'Already being followed.') };
  const sec = [1, 0.7, 0.4][f15(s).sec[a.id] ?? 0];
  const has = !!secretAbout(s, a);
  return { ...z, ok: true, cost: money(s, 2500 * (1 + a.fame / 50)), p: has ? clamp(0.6 * sec, 0.1, 0.8) : 0.1, trace: clamp(0.15 + (1 - sec) * 0.3, 0.1, 0.5), notes: [s.year < 1960 ? l('Detetive particular por um mês.', 'A private eye for a month.') : l('Paparazzo exclusivo por um mês (a palavra vem de "A Doce Vida", 1960).', 'A dedicated paparazzo for a month (the word comes from "La Dolce Vita", 1960).'), l('Chance maior se houver algo a esconder; segurança do artista atrapalha.', 'Better odds if there is something to hide; the act\'s security gets in the way.')] };
}
export function stakeout(s: GameState, actId: string): { ok: boolean; text: L } {
  const od = stakeoutOdds(s, actId);
  if (!od.ok) return { ok: false, text: od.why! };
  if (s.player.cash < od.cost) return { ok: false, text: l('Sem dinheiro.', 'Not enough cash.') };
  const st = m17(s), a = s.acts[actId];
  post(s, `m17stk:${actId}`, -od.cost, 'marketing', `Investigação: ${a.name}`);
  st.cd[`s:${actId}`] = s.week + 12;
  const r = Rng.fromSeed(`${s.config.seed}:m17s:${s.week}:${actId}`);
  const f = secretAbout(s, a);
  let msg: L;
  if (f && r.chance(od.p)) {
    const sk = (['drugs', 'sex', 'money'] as const).find((k) => f.tags.includes(k));
    const target = f.actors.find((x) => s.persons[x]) ?? a.id;
    grantHold(s, { holder: 'player', target, kind: 'secret', strength: 45 + f.severity / 2, proof: 2, factId: f.id, src: 'media17', months: 60, text: f.text, data: sk && SK_KEY[sk] ? { sk: SK_KEY[sk]! } : undefined });
    msg = fmtL(l('Fotos e documentos: "{t}". Agora é um segredo seu (Obrigações): chantagear, expor ou vender a um tabloide.', 'Photos and papers: "{t}". It is now your secret (Obligations): blackmail, expose or sell it to a tabloid.'), { t: f.text });
  } else msg = fmtL(l('Um mês seguindo {a} e nada comprometedor.', 'A month tailing {a} and nothing compromising.'), { a: a.name });
  if (r.chance(od.trace)) {
    const p = lead(s, a);
    if (p) grantHold(s, { holder: p.id, target: 'player', kind: 'grievance', strength: 40, months: 36, src: 'media17', text: fmtL(l('Você mandou seguir {a}', 'You had {a} followed'), { a: a.name }) });
    emitFact(s, { kind: 'statement', actors: ['player', a.id], place: a.city, severity: 45, visibility: 'public', tags: ['bad', 'media17'], text: fmtL(l('{a} flagra fotógrafo pago por {c}.', '{a} catches a photographer paid by {c}.'), { a: a.name, c: s.config.companyName }), src: 'media17' });
    msg = fmtL(l('{m} E o fotógrafo foi pego: {a} sabe que foi você.', '{m} And the photographer got caught: {a} knows it was you.'), { m: msg, a: a.name });
  }
  log(s, msg);
  return { ok: true, text: msg };
}

/** Vender um segredo seu a um tabloide (jornalismo de talão de cheques). */
export function sellOdds(s: GameState, holdId: string, outId: string): Odds {
  const h = holdsOf(s, 'player').has.find((x) => x.id === holdId && x.kind === 'secret' && x.status === 'open');
  const o = outletById17(s, outId);
  const z: Odds = { ok: false, cost: 0, p: 1, trace: 0.2, suit: 0, truth: 1, notes: [] };
  if (!h || !o || o.mine) return { ...z, why: l('Indisponível.', 'Unavailable.') };
  const a = s.acts[h.target] ?? Object.values(s.acts).find((x) => x.members.includes(h.target));
  const pay = money(s, (3000 + (a?.fame ?? 20) * 150) * (o.reach / 70) * (o.line === 'tabloid' ? 1 : 0.5));
  return { ...z, ok: true, cost: -pay, notes: [l('Eles pagam e publicam: o segredo vira escândalo para o alvo. 20% de descobrirem quem vendeu.', 'They pay and print: the secret becomes the target\'s scandal. 20% they find out who sold it.')] };
}
export function sellSecret(s: GameState, holdId: string, outId: string): { ok: boolean; text: L } {
  const od = sellOdds(s, holdId, outId);
  if (!od.ok) return { ok: false, text: od.why! };
  const h = holdsOf(s, 'player').has.find((x) => x.id === holdId)!, o = outletById17(s, outId)!;
  const a = s.acts[h.target] ?? Object.values(s.acts).find((x) => x.members.includes(h.target));
  const res = useHold(s, holdId, 'expose');
  if (!res.ok) return res;
  post(s, `m17sell:${holdId}`, -od.cost, 'other_income', `Venda de furo: ${o.name}`);
  const r = Rng.fromSeed(`${s.config.seed}:m17sell:${holdId}`);
  addStory(s, { t: fmtL(l('Exclusivo: {t}', 'Exclusive: {t}'), { t: h.text }), tpl: 'leak', a: a?.id, out: o.id, src: 'insider', via: l('fonte paga', 'paid source').pt, truth: 1, st: 'confirmed', cred: o.cred, sev: 40 + h.strength / 3, tone: -1, due: s.week, news: 1, mine: 1, traced: undefined });
  let msg = fmtL(l('{o} pagou pelo furo e publicou.', '{o} paid for the scoop and printed it.'), { o: o.name });
  if (r.chance(od.trace) && a) { const p = lead(s, a); if (p) grantHold(s, { holder: p.id, target: 'player', kind: 'grievance', strength: 55, months: 48, src: 'media17', text: fmtL(l('Você vendeu um segredo de {a}', 'You sold {a}\'s secret'), { a: a.name }) }); msg = fmtL(l('{m} {a} descobriu quem vendeu.', '{m} {a} found out who sold it.'), { m: msg, a: a.name }); }
  log(s, msg);
  return { ok: true, text: msg };
}

/** Entrevista de capa: hype e relação; risco de frase infeliz pelos traços (Lennon, 1966). */
export function interviewOdds(s: GameState, actId: string, outId: string): Odds & { kind: ScandalKind; pain: number } {
  const a = s.acts[actId], o = outletById17(s, outId);
  const z = { ok: false, cost: 0, p: 0, trace: 0, suit: 0, truth: null, notes: [], kind: 'offense' as ScandalKind, pain: 0 };
  if (!a || !o || !playerActs(s).includes(actId) || o.kind === 'social' || o.kind === 'fanzine') return { ...z, why: l('Escolha um artista seu e um veículo (não rede social).', 'Pick your act and an outlet (not a social network).') };
  if ((m17(s).cd[`i:${actId}`] ?? 0) > s.week) return { ...z, why: l('Cedo demais para outra entrevista.', 'Too soon for another interview.') };
  const p = lead(s, a);
  const P = p ? per13(s, `p:${p.id}`) : null;
  const F = (k: string) => (P?.facets[k as 'ego'] ?? 50);
  const risk = clamp(0.04 + (F('impulsividade') - 50) / 250 + (F('rebeldia') - 50) / 300 + (F('ego') - 50) / 400 + (F('humor') - 50) / 500 - prTier(s) * 0.02, 0.02, 0.45);
  const devout = piety(cityById[a.city]?.market ?? 'na', s.year) > 0.6;
  const kind: ScandalKind = F('rebeldia') > 60 && devout ? 'blasphemy' : (P?.views?.eng ?? 0) >= 60 && F('coragem') > 60 ? 'politics' : 'offense';
  const pain = Math.round(scandalReaction(s, a, kind, 50).eff);
  return { ...z, ok: true, p: 1 - risk, notes: [fmtL(l('Risco de frase infeliz {r}% (impulsividade, rebeldia, ego, humor do líder; assessoria reduz). Se der errado: escândalo "{k}" — reação estimada {e}.', 'Gaffe risk {r}% (leader\'s impulsiveness, rebellion, ego, humor; PR reduces it). If it goes wrong: "{k}" scandal — estimated reaction {e}.'), { r: Math.round(risk * 100), k: kind, e: pain })], kind, pain };
}
export function interview(s: GameState, actId: string, outId: string): { ok: boolean; text: L } {
  const od = interviewOdds(s, actId, outId);
  if (!od.ok) return { ok: false, text: od.why! };
  const st = m17(s), a = s.acts[actId], o = outletById17(s, outId)!;
  st.cd[`i:${actId}`] = s.week + 12;
  const r = Rng.fromSeed(`${s.config.seed}:m17i:${s.week}:${actId}:${outId}`);
  if (!r.chance(od.p)) {
    const lines: Record<string, L> = { blasphemy: l('"Somos mais populares que Jesus"', '"We\'re more popular than Jesus"'), politics: l('um ataque ao governo', 'an attack on the government'), offense: l('uma piada que ninguém achou graça', 'a joke nobody found funny') };
    const t = fmtL(l('Entrevista de {a} à {o}: {x} vira polêmica', '{a}\'s interview with {o}: {x} sparks outrage'), { a: a.name, o: o.name, x: lines[od.kind] ?? lines.offense });
    scandal(s, a.id, od.kind, 40 + r.int(0, 25), t, { tags: ['media17'] });
    addStory(s, { t, tpl: 'gaffe', a: a.id, out: o.id, src: 'player', truth: 1, st: 'confirmed', cred: o.cred, sev: 50, tone: -1, due: s.week, news: 1 });
    return { ok: true, text: fmtL(l('{t}. Escândalo — ver Fatos do artista.', '{t}. Scandal — see the act\'s Facts.'), { t }) };
  }
  const P = lead(s, a) ? per13(s, `p:${lead(s, a)!.id}`) : null;
  const hype = Math.round(6 + (P?.attrs.cha ?? 50) / 10 + o.reach / 15);
  addHype(s, `a:${a.id}`, 'm17int', fmtL(l('Entrevista de capa na {o}', 'Cover interview in {o}'), { o: o.name }), hype);
  st.rel[o.id] = clamp((st.rel[o.id] ?? 0) + 4, -100, 100);
  addStory(s, { t: fmtL(l('{a} na capa da {o}', '{a} on the cover of {o}'), { a: a.name, o: o.name }), tpl: 'interview', a: a.id, out: o.id, src: 'player', truth: 1, st: 'confirmed', cred: o.cred, sev: 25, tone: 1, due: s.week, news: 1, mine: 1 });
  return { ok: true, text: fmtL(l('Entrevista elogiada: +{h} de hype.', 'Interview praised: +{h} hype.'), { h: hype }) };
}

// ---------------------------------------------------------------- leitura (interface / outros sistemas)

/** Histórias visíveis: quanto mais famoso o ato, mais aparece. */
export function feed17(s: GameState, f: { act?: string; mine?: boolean; open?: boolean } = {}): Story[] {
  const mine = new Set(playerActs(s));
  return m17(s).st.filter((x) => {
    const a = x.a ? s.acts[x.a] : undefined;
    if (f.act && x.a !== f.act && x.b !== f.act) return false;
    if (f.mine && !(a && mine.has(a.id)) && !x.mine) return false;
    if (f.open && x.st !== 'open') return false;
    return !a || mine.has(a.id) || x.mine || a.fame >= 25 || x.sev >= 55;
  });
}
export const storyOutlet = (s: GameState, sto: Story): O17 | undefined => outletById17(s, sto.out);
/** Ponto de fama local para a interface explicar o peso de uma história num país. */
export const storyWeight = (sto: Story): number => Math.round((sto.sev / 10) * (0.4 + sto.cred / 100) * 10) / 10;
export const marketOf17 = (o: O17): MarketId | 'global' => o.market;
