// Rodada 19 (Frente 6, T5) — REGIÕES, SOCIEDADE E POLÍTICA (`regions19`).
//  N10  comuna-república e exílio: o ato declara uma "república" na sede (Kalakuta, Tropicália): núcleo de fãs, prestígio
//       artístico e calor do regime (society18); batida (não gráfica, ninguém identificado como vítima) → exílio pelo soc18.
//  N8/N13/N14/N20  fatias regionais da indústria (`IND19`): império do cassete (versões de trilhas; acusações tratadas como
//       acusações), sound system de Kingston (clash, dubplates), selo de rua do hip-hop (festa → single em uma semana;
//       royalties pagos ou não), marca de salsa (All-Stars). Renda mensal pelo gosto do submercado (regions18) e da época.
//  M11  vistos de turnê e cotas de músicos estrangeiros por época/país (`VISA19`) → procura de ingressos (cityDemand).
//  M9   needle time (BBC até 1967, regras até 1988) e sessões de rádio → apelo no Reino Unido.
//  M10  greves de gravação 1942/1948 jogáveis: estoque antes, a capella, gravar no exterior, acordo + fundo (MPTF).
//  M29  campanhas políticas usando canções do selo (licenciar, protestar, ignorar).
//  Leis do more19 (`law_*`): cotas (Toubon, CanCon), rádios livres, Malvinas, piratas 1967, direitos (1976, Berna, DMCA,
//       AHRA, cópia privada, ECAD, Japão, prazo de 70 anos, MMA), Rouanet, abertura Coreia×Japão, Indonésia 1959, IA/voz.
// Modo exato: gente real não funda comuna nem sofre batida inventada; candidatos são sempre fictícios.

import { on31 } from '../r31/market31';
import { clamp, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type L } from '../../data/world';
import { viewsOf } from '../beliefs';
import { registerDeadline, weekOfMonth19, type Deadline19 } from '../calendar19';
import { registerConseq18, type Ctx18 } from '../decide18';
import { registerMod, registerExt4, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact, recentFacts } from '../facts17';
import { histLocked, histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import { rng19 } from '../rng19';
import { addStress } from '../stress17';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { schedule18 } from './decide18';
import { nudge16 } from './fame16';
import { fan18 } from './fans18';
import { headline19 } from './factlink19';
import { LINKS18, lk18 } from './links18';
import { actLang18, addAff18 } from './regions18';
import { exileChoice18, regimeAt18, soc18 } from './society18';
import { strikeActive } from './world4/common';
import { milestoneById } from './world4/milestones';
import { w4 } from './world4/state';
import { cashWhy20, freeCash20 } from '../oblig20';

const exact = (s: GameState) => histMode(s) === 'strict';
/** chave de balanço (lote liga/desliga): desliga ganchos mensais e modificadores */
const off = (): boolean => !!(globalThis as { __reg19Off?: boolean }).__reg19Off;
const mineA = (s: GameState, a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const myActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split');
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const rng = (s: GameState) => rng19(s, 'reg19');
const a3Of = (a: Act) => countryOfCity(a.city);

// ================================================================ estado

export type IndId = 'cassette' | 'sound' | 'street' | 'salsa';
export interface Ind19 { lv: number; since: number; inc: number; hits: number; dub: number; ver: number; fair: boolean; grudge: number; last: number }
export interface Com19 { city: string; since: number; raids: number; reg?: string }
export interface Reg19 {
  ind: Partial<Record<IndId, Ind19>>;
  com: Record<string, Com19>;
  visa: Record<string, number>;
  sess: Record<string, number>;
  stk: { warned: Record<string, 1>; started: Record<string, 1>; mode?: string; stock?: number; s48?: 1 };
  mptf?: { since: number; paid: number; gigs: number };
  camp: Record<number, string>;
  laws: Record<string, number>;
  log: [number, number, L][];
  n: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { reg19: Reg19 } }
const fresh = (): Reg19 => ({ ind: {}, com: {}, visa: {}, sess: {}, stk: { warned: {}, started: {} }, camp: {}, laws: {}, log: [], n: {} });
registerExt4('reg19', fresh);
export function reg19(s: GameState): Reg19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.reg19 ??= fresh()) as Reg19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const cnt = (s: GameState, k: string) => { const n = reg19(s).n; n[k] = (n[k] ?? 0) + 1; };
export const logR19 = (s: GameState, t: L) => { const st = reg19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const link = (s: GameState, id: string, t: L) => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };

// ================================================================ N8/N13/N14/N20 — fatias regionais da indústria

export interface IndDef { id: IndId; name: L; real: string; from: number; to: number; city: string; sub: string; genres: string[]; cost: number; base: number; act: L; desc: L }
export const IND19: Record<IndId, IndDef> = {
  cassette: { id: 'cassette', name: l('Império do cassete', 'Cassette empire'), real: 'Super Cassettes Industries / T-Series (1983)', from: 1979, to: 2008, city: 'delhi', sub: 'in', genres: ['bollywood', 'bhangra', 'ghazal_pop'], cost: 15000, base: 900,
    act: l('Versões de trilhas de filme', 'Film-song version recordings'), desc: l('Fita barata, devocionais e regravações de sucessos de cinema com cantores novos. A cláusula de "versão" da lei é disputada: rivais acusam pirataria (acusações, não condenações).', 'Cheap tapes, devotionals and re-recordings of film hits with new singers. The law\'s "version" clause is contested: rivals allege piracy (allegations, not convictions).') },
  sound: { id: 'sound', name: l('Sound system de Kingston', 'Kingston sound system'), real: 'Downbeat, Trojan, Stone Love (1950s+)', from: 1952, to: 9999, city: 'kingston', sub: 'carib', genres: ['ska', 'reggae', 'dub', 'dancehall'], cost: 6000, base: 500,
    act: l('Clash contra outro sound', 'Clash against another sound'), desc: l('Caixas enormes na rua, um seletor e dubplates exclusivas: quem tem o disco que ninguém tem ganha o clash e a cidade.', 'Huge speaker stacks in the street, a selector and exclusive dubplates: whoever has the record nobody else has wins the clash and the city.') },
  street: { id: 'street', name: l('Selo de rua do hip-hop', 'Hip-hop street label'), real: 'Sugar Hill Records (1979)', from: 1979, to: 9999, city: 'new_york', sub: 'us', genres: ['hiphop'], cost: 8000, base: 600,
    act: l('Gravar o MC da festa', 'Record the party MC'), desc: l('Um MC de festa de quarteirão vira single numa semana, banda da casa no lugar do sampler. Royalties justos ou não: o acerto vem depois.', 'A block-party MC becomes a single in a week, house band instead of a sampler. Fair royalties or not: the reckoning comes later.') },
  salsa: { id: 'salsa', name: l('Marca de salsa', 'Salsa brand label'), real: 'Fania Records (1964)', from: 1964, to: 9999, city: 'new_york', sub: 'latino', genres: ['salsa', 'mambo'], cost: 10000, base: 700,
    act: l('Show das All-Stars', 'All-Stars concert'), desc: l('O selo vira marca: banda da casa, estrelas no mesmo palco, filme do show. Leva a salsa de Nova York ao Caribe e à América Latina.', 'The label becomes a brand: house band, stars on one stage, a concert film. Carries New York salsa to the Caribbean and Latin America.') },
};
export const indsNow19 = (s: GameState): IndDef[] => Object.values(IND19).filter((d) => s.year >= d.from && s.year <= d.to);
export const indCost19 = (s: GameState, id: IndId, lv = (reg19(s).ind[id]?.lv ?? 0) + 1) => money(s, IND19[id].cost * lv);
const popOf = (s: GameState, gs: string[]) => gs.reduce((t, g) => t + (s.genrePop[g] ?? 0.4), 0) / gs.length;
const myIn = (s: GameState, gs: string[]) => myActs(s).filter((a) => gs.includes(a.genre));
/** Renda mensal da fatia (com porquê). */
export function indYield19(s: GameState, id: IndId): { v: number; parts: WhyPart[] } {
  const x = reg19(s).ind[id], d = IND19[id];
  if (!x) return { v: 0, parts: [] };
  const pop = clamp(popOf(s, d.genres), 0.2, 2), acts = myIn(s, d.genres).length;
  const ver = x.ver > s.week ? 1.6 : 1, cheap = id === 'street' && !x.fair ? 1.25 : 1, k = clamp(1 + acts * 0.15, 1, 1.6);
  const v = Math.round(money(s, d.base) * x.lv * pop * ver * cheap * k);
  const parts: WhyPart[] = [
    { label: l('Base da época × nível', 'Era base × level'), value: money(s, d.base) * x.lv, fmt: 'money' },
    { label: l('Gosto do submercado pelos gêneros', 'Submarket taste for the genres'), value: Math.round(pop * 100) / 100, fmt: 'mult' },
    { label: l('Seus atos do gênero (+15% cada)', 'Your acts in the genre (+15% each)'), value: Math.round(k * 100) / 100, fmt: 'mult' },
  ];
  if (ver > 1) parts.push({ label: l('Versões de trilhas em catálogo', 'Version recordings in catalogue'), value: ver, fmt: 'mult', tone: 'good' });
  if (cheap > 1) parts.push({ label: l('Royalties "de rua" (margem maior, mágoa)', '"Street" royalties (bigger margin, grudges)'), value: cheap, fmt: 'mult', tone: 'bad' });
  return { v, parts };
}
export function foundInd19(s: GameState, id: IndId): L | null {
  const d = IND19[id], st = reg19(s), x = st.ind[id];
  if (s.year < d.from || s.year > d.to) return l('Fora da época.', 'Out of its era.');
  if ((x?.lv ?? 0) >= 3) return l('Já está no nível máximo.', 'Already at the top level.');
  const c = indCost19(s, id);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `reg19ind:${id}:${(x?.lv ?? 0) + 1}`, -c, 'capex', `${d.name.pt} (nível ${(x?.lv ?? 0) + 1})`);
  if (x) { x.lv++; return null; }
  st.ind[id] = { lv: 1, since: s.year, inc: 0, hits: 0, dub: 0, ver: 0, fair: true, grudge: 0, last: -99 };
  cnt(s, `ind_${id}`);
  const t = fmtL(l('{c} abre um {n} em {p}.', '{c} opens a {n} in {p}.'), { c: s.config.companyName, n: d.name, p: cityById[d.city]?.name ?? d.city });
  logR19(s, t);
  emitFact(s, { kind: 'industry_born', actors: ['player'], place: d.city, severity: 30, visibility: 'public', tags: ['regions19', id, 'good'], src: 'regions19', text: t, data: { ind: id } });
  return null;
}
export const actCost19 = (s: GameState, id: IndId) => money(s, id === 'salsa' ? 9000 : id === 'cassette' ? 3000 : id === 'sound' ? 1200 : 1500);
export const clashOdds19 = (s: GameState): number => { const x = reg19(s).ind.sound; return x ? clamp(0.35 + x.dub * 0.07 + x.lv * 0.06 + myIn(s, IND19.sound.genres).length * 0.03, 0.2, 0.85) : 0; };
/** A ação característica de cada fatia (botão da página). Agenda o eco (decide18). */
export function indAction19(s: GameState, id: IndId, opt = ''): L {
  const x = reg19(s).ind[id], d = IND19[id], r = rng(s);
  if (!x) return l('Abra primeiro.', 'Open it first.');
  const ctx: Ctx18 = { ind: id };
  const pick = (k: string) => schedule18(s, `ib:reg19_ind:${k}`, ctx, d.act, d.name);
  if (id === 'sound' && opt === 'dub') {
    const c = money(s, 400);
    if (x.dub >= 8 || freeCash20(s) < c) return cashWhy20(s, c, l('Caixote cheio ou sem caixa.', 'Box full or no cash.'));
    post(s, `reg19dub:${x.dub}`, -c, 'recording', 'Dubplate exclusiva');
    x.dub++; pick('dub');
    return fmtL(l('Dubplate exclusiva gravada ({n} no caixote).', 'Exclusive dubplate cut ({n} in the box).'), { n: x.dub });
  }
  if (x.last > s.week - 4) return l('Uma vez por mês.', 'Once a month.');
  const c = actCost19(s, id);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.'));
  x.last = s.week;
  post(s, `reg19act:${id}`, -c, id === 'salsa' ? 'live_costs' : 'recording', d.act.pt);
  const a = r.pick(myIn(s, d.genres)) as Act | undefined;
  switch (id) {
    case 'cassette': {
      x.ver = s.week + 52; pick('version');
      if (r.chance(0.25)) { suit19(s, id); return l('Versões no ar — e um rival já fala em pirataria.', 'Versions out — and a rival already cries piracy.'); }
      return l('Versões no ar: a fita vende ×1,6 por um ano.', 'Versions out: tapes sell ×1.6 for a year.');
    }
    case 'sound': {
      const p = clashOdds19(s), win = r.chance(p);
      pick(win ? 'clash_win' : 'clash_lose');
      const t = fmtL(win ? l('Clash em {c}: seu sound vence com {n} dubplates.', 'Clash in {c}: your sound wins with {n} dubplates.') : l('Clash em {c}: seu sound perde para o rival.', 'Clash in {c}: your sound loses to the rival.'), { c: cityById[d.city]?.name ?? d.city, n: x.dub });
      logR19(s, t);
      emitFact(s, { kind: 'sound_clash', actors: [a?.id ?? 'player', 'player'], place: d.city, severity: win ? 35 : 20, visibility: 'public', tags: ['regions19', win ? 'good' : 'bad', win ? 'win' : 'lose'], src: 'regions19', text: t, data: { ind: id, win: win ? 1 : 0 } });
      if (win) { post(s, `reg19clash:${s.week}`, money(s, 800 * x.lv), 'shows', 'Clash: porta e bar'); x.hits++; }
      return t;
    }
    case 'street': {
      x.fair = opt !== 'cheap';
      pick(x.fair ? 'fair' : 'cheap');
      if (!r.chance(0.3 + x.lv * 0.05)) return l('O single sai, a rua não pega desta vez.', 'The single is out; the street does not bite this time.');
      x.hits++; if (!x.fair) x.grudge++;
      const v = money(s, 6000 * x.lv);
      post(s, `reg19street:${s.week}`, v, 'sales', 'Selo de rua: single de festa');
      const t = fmtL(l('Single de festa do seu selo de rua estoura na rádio ({v}).', 'Your street label\'s party single breaks on radio ({v}).'), { v: usd(v) });
      logR19(s, t);
      emitFact(s, { kind: 'street_hit', actors: [a?.id ?? 'player', 'player'], place: d.city, severity: 40, visibility: 'public', tags: ['regions19', 'good', x.fair ? 'fair' : 'cheap'], src: 'regions19', text: t, data: { ind: id } });
      if (x.grudge >= 2 && r.chance(0.5)) suit19(s, id);
      return t;
    }
    default: {
      pick('allstars');
      const gross = money(s, 14000 * x.lv * clamp(popOf(s, d.genres), 0.4, 1.6));
      post(s, `reg19all:${s.week}`, gross, 'shows', 'All-Stars: bilheteria e filme');
      x.hits++;
      const t = fmtL(l('Show das All-Stars do seu selo lota o estádio ({v}).', 'Your label\'s All-Stars concert fills the stadium ({v}).'), { v: usd(gross) });
      logR19(s, t);
      emitFact(s, { kind: 'allstars_show', actors: [a?.id ?? 'player', 'player'], place: d.city, severity: 45, visibility: 'public', tags: ['regions19', 'good'], src: 'regions19', text: t, data: { ind: id } });
      return t;
    }
  }
}
function suit19(s: GameState, id: IndId): void {
  const x = reg19(s).ind[id]; if (!x) return;
  const c = money(s, 5000 * x.lv);
  post(s, `reg19suit:${id}:${s.week}`, -c, 'legal', 'Processo: acusação contra o selo regional');
  if (id === 'street') x.grudge = 0;
  const t = fmtL(id === 'street' ? l('Artistas do seu selo de rua processam por royalties não pagos ({v} em advogados e acordo).', 'Your street label\'s artists sue over unpaid royalties ({v} in lawyers and settlement).') : l('Rival acusa seu selo de cassete de pirataria; o caso fica na justiça ({v}). Acusação, não condenação.', 'A rival accuses your cassette label of piracy; the case drags on ({v}). An allegation, not a conviction.'), { v: usd(c) });
  logR19(s, t);
  emitFact(s, { kind: 'industry_suit', actors: ['player'], place: IND19[id].city, severity: 35, visibility: 'public', tags: ['regions19', 'bad', id, 'allegation'], src: 'regions19', text: t, data: { ind: id } });
}
export const setFair19 = (s: GameState, fair: boolean) => { const x = reg19(s).ind.street; if (x) x.fair = fair; };

// ================================================================ N10 — comuna-república e exílio

export const communeCost19 = (s: GameState) => money(s, 12000);
export function communeBlock19(s: GameState, a?: Act): L | null {
  if (!mineA(s, a)) return l('Só atos do seu elenco.', 'Only acts on your roster.');
  if (s.year < 1965) return l('Comunas de artistas começam nos anos 1960.', 'Artist communes start in the 1960s.');
  if (histLocked(s, a)) return l('Modo exato: artista real segue a própria história.', 'Exact mode: a real artist follows their own history.');
  if (reg19(s).com[a.id]) return l('Já tem uma comuna.', 'Already has a commune.');
  if (freeCash20(s) < communeCost19(s)) return cashWhy20(s, communeCost19(s), l('Caixa insuficiente.', 'Not enough cash.'));
  return null;
}
export function foundCommune19(s: GameState, actId: string): L | null {
  const a = s.acts[actId], b = communeBlock19(s, a);
  if (b || !a) return b;
  post(s, `reg19com:${a.id}`, -communeCost19(s), 'capex', `Comuna de ${a.name}`);
  const reg = regimeAt18(s, a3Of(a));
  reg19(s).com[a.id] = { city: a.city, since: s.year, raids: 0, reg: reg?.id };
  cnt(s, 'commune');
  const t = fmtL(l('{a} declara uma república-comuna em {c}: estúdio, palco e casa para quem chegar.', '{a} declares a commune-republic in {c}: studio, stage and home for whoever shows up.'), { a: a.name, c: cityById[a.city]?.name ?? a.city });
  logR19(s, t);
  emitFact(s, { kind: 'commune_founded', actors: [a.id, 'player'], place: a.city, severity: 40, visibility: 'public', tags: ['regions19', 'politics', reg ? 'regime' : 'free'], src: 'regions19', text: t });
  return null;
}
/** Chance de batida no mês (com porquê). */
export function raidOdds19(s: GameState, actId: string): { p: number; why: [L, number][] } {
  const a = s.acts[actId], c = reg19(s).com[actId];
  if (!a || !c) return { p: 0, why: [] };
  const reg = regimeAt18(s, a3Of(a)), heat = soc18(s).heat[a.id] ?? 0;
  const why: [L, number][] = [];
  let p = reg ? 0.01 + heat / 600 : exact(s) ? 0 : 0.003;
  why.push([reg ? fmtL(l('Regime: {r}', 'Regime: {r}'), { r: reg.name }) : l('Democracia (polícia, raro)', 'Democracy (police, rare)'), Math.round(p * 1000) / 10]);
  if (reg?.hard && s.year >= reg.hard[0] && s.year <= reg.hard[1]) { p *= 1.6; why.push([l('Anos de chumbo', 'Hardline years'), 1.6]); }
  if ((soc18(s).laylow[a.id] ?? 0) > s.week) { p *= 0.4; why.push([l('Silêncio político', 'Political silence'), 0.4]); }
  return { p: clamp(p, 0, 0.15), why };
}
export function raid19(s: GameState, a: Act): void {
  const st = reg19(s), c = st.com[a.id]; if (!c) return;
  c.raids++;
  const loss = money(s, 5000);
  post(s, `reg19raid:${a.id}:${s.week}`, -loss, 'misc', `Batida na comuna de ${a.name}`);
  for (const m of a.members) addStress(s, m, 15, l('Batida na comuna', 'Commune raid'));
  a.fans.core = Math.max(a.fans.core + 1, Math.round(a.fans.core * 1.15)); a.fame = clamp(a.fame + 3, 0, 100);
  const reg = regimeAt18(s, a3Of(a));
  const t = fmtL(l('Batida na república de {a}: o prédio é tomado e incendiado, fitas perdidas; os moradores se dispersam.', 'Raid on {a}\'s republic: the compound is seized and set on fire, tapes lost; the residents scatter.'), { a: a.name });
  logR19(s, t); cnt(s, 'raid');
  emitFact(s, { kind: 'commune_raid', actors: [a.id, 'player'], place: a.city, severity: 60, visibility: 'public', tags: ['regions19', 'politics', 'bad', reg ? 'regime' : 'police'], src: 'regions19', text: t });
  pushInbox18(s, 'reg19_raid', { from: a.name, subject: fmtL(l('A república de {a} foi invadida', '{a}\'s republic was raided'), { a: a.name }), tone: 'bad',
    body: l('Exílio (se houver regime), reconstruir (o calor sobe, os fãs vêm junto) ou encerrar a comuna.', 'Exile (if there is a regime), rebuild (heat rises, fans come along) or close the commune.'),
    ref: { act: a.id, to: reg?.exile[0] ?? '' }, actions: [...(reg ? [{ id: 'exile', label: fmtL(l('Exílio em {c}', 'Exile in {c}'), { c: cityById[reg.exile[0]]?.name ?? reg.exile[0] }) }] : []), { id: 'rebuild', label: l('Reconstruir', 'Rebuild') }, { id: 'disband', label: l('Encerrar a comuna', 'Close the commune') }], weeks: 6 });
}
export function raidAnswer19(s: GameState, actId: string, how: string, r: Rng): L {
  const a = s.acts[actId], c = reg19(s).com[actId];
  if (!a || !c) return l('Nada a decidir.', 'Nothing to decide.');
  if (how === 'exile') { delete reg19(s).com[actId]; return exileChoice18(s, actId, regimeAt18(s, a3Of(a))?.exile[0] ?? 'paris', 'exile', r); }
  if (how === 'rebuild') {
    post(s, `reg19reb:${a.id}:${s.week}`, -money(s, 6000), 'capex', `Reconstrução da comuna de ${a.name}`);
    soc18(s).heat[a.id] = clamp((soc18(s).heat[a.id] ?? 0) + 15, 0, 100);
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
    return l('Reconstruída: o símbolo fica de pé, o regime anota o nome.', 'Rebuilt: the symbol stands, the regime takes note.');
  }
  delete reg19(s).com[actId];
  a.trust = clamp(a.trust - 6, 0, 100);
  return l('Comuna encerrada. A banda se sente traída.', 'Commune closed. The band feels betrayed.');
}
registerInboxKind('reg19_raid', { label: l('Comuna', 'Commune'), cat: 'decision', icon: 'home', prio: 3, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : { area: 'regions19' }),
  handle: (s, m, a, r) => raidAnswer19(s, String(m.ref?.act), a, r) });

// ================================================================ M11 — vistos e cotas de músicos estrangeiros

export interface Visa19 { id: string; name: L; host: string[]; from: number; to: number; who?: string[]; ban?: boolean; cost: number; deny: number; real: string; desc: L }
const EU27 = ['FRA', 'DEU', 'ESP', 'ITA', 'NLD', 'BEL', 'PRT', 'IRL', 'SWE', 'DNK', 'FIN', 'AUT', 'POL', 'CZE', 'HUN', 'GRC'];
const SOV = ['RUS', 'UKR', 'BLR', 'GEO', 'ARM', 'KAZ', 'EST', 'LVA', 'LTU'];
export const VISA19: Visa19[] = [
  { id: 'uk_mu', name: l('Proibição do sindicato britânico a músicos americanos', 'British union ban on American musicians'), host: ['GBR'], from: 1935, to: 1955, who: ['USA'], ban: true, cost: 3000, deny: 0.5, real: 'Musicians\' Union × AFM (1935–1955)',
    desc: l('Só em troca: uma banda britânica toca nos EUA para a americana tocar aqui.', 'Exchange only: a British band plays the US so the American one can play here.') },
  { id: 'us_h1', name: l('Visto H-1 para artistas nos EUA', 'US H-1 performer visa'), host: ['USA'], from: 1952, to: 1990, cost: 1500, deny: 0.12, real: 'Immigration and Nationality Act (1952)', desc: l('Petição do promotor, meses de espera; ficha policial pesa.', 'Promoter petition, months of waiting; a police record weighs.') },
  { id: 'us_p1', name: l('Visto P-1/O-1 nos EUA', 'US P-1/O-1 visa'), host: ['USA'], from: 1991, to: 9999, cost: 2500, deny: 0.1, real: 'Immigration Act (1990)', desc: l('Precisa provar "reconhecimento internacional"; depois de 2001, filas mais longas.', 'Must prove "international recognition"; after 2001, longer queues.') },
  { id: 'su_gk', name: l('Aprovação do Goskoncert', 'Goskoncert approval'), host: SOV, from: 1957, to: 1991, cost: 2000, deny: 0.45, real: 'Goskoncert (agência estatal de concertos)', desc: l('A agência estatal decide quem toca, onde e por quanto; rock ocidental quase nunca.', 'The state agency decides who plays, where and for how much; Western rock almost never.') },
  { id: 'jp_work', name: l('Visto de trabalho no Japão', 'Japanese work visa'), host: ['JPN'], from: 1966, to: 9999, cost: 1800, deny: 0.08, real: 'Lei de imigração japonesa', desc: l('Rigoroso com antecedentes de drogas: uma prisão pode fechar a porta.', 'Strict about drug records: one arrest can shut the door.') },
  { id: 'cn_min', name: l('Aprovação do Ministério da Cultura (China)', 'Ministry of Culture approval (China)'), host: ['CHN'], from: 1980, to: 9999, cost: 2500, deny: 0.3, real: 'Aprovação de apresentações estrangeiras', desc: l('Setlist e letras revisadas; ativismo político anterior pesa.', 'Setlist and lyrics reviewed; past political activism weighs.') },
  { id: 'brexit', name: l('Permissões de turnê pós-Brexit', 'Post-Brexit touring permits'), host: EU27, from: 2021, to: 9999, who: ['GBR'], cost: 2200, deny: 0.04, real: 'Acordo UE–Reino Unido (2021)', desc: l('Cada país com regra própria; carnês para equipamento e cabotagem limitada.', 'Each country with its own rule; carnets for gear and limited cabotage.') },
];
/** Barreira de visto para o ato tocar nesta cidade (só estrangeiros e só para atos do jogador). */
export function visaFor19(s: GameState, a: Act, city: string): Visa19 | undefined {
  const host = countryOfCity(city), home = a3Of(a);
  if (!host || !home || host === home) return undefined;
  return VISA19.find((v) => v.host.includes(host) && s.year >= v.from && s.year <= v.to && (!v.who || v.who.includes(home)));
}
export const visaKey19 = (actId: string, vid: string) => `${actId}|${vid}`;
export const hasVisa19 = (s: GameState, actId: string, vid: string) => (reg19(s).visa[visaKey19(actId, vid)] ?? 0) > s.week;
export function visaOdds19(s: GameState, a: Act, v: Visa19): { p: number; why: [L, number][] } {
  const why: [L, number][] = [[v.name, Math.round((1 - v.deny) * 100)]];
  let deny = v.deny;
  const arrests = a.members.reduce((t, m) => t + recentFacts(s, { kind: 'arrest', actor: m, months: 120 }).length, 0) + recentFacts(s, { kind: 'arrest', actor: a.id, months: 120 }).length;
  if (arrests) { deny += arrests * (v.id === 'jp_work' ? 0.35 : 0.15); why.push([fmtL(l('Prisões na ficha: {n}', 'Arrests on record: {n}'), { n: arrests }), -arrests]); }
  if (v.id === 'us_p1' && s.year >= 2002) { deny += 0.05; why.push([l('Depois de 2001: análise mais longa', 'After 2001: longer screening'), -5]); }
  if (v.id === 'cn_min' && (soc18(s).heat[a.id] ?? 0) > 20) { deny += 0.25; why.push([l('Ativismo político conhecido', 'Known political activism'), -25]); }
  if (a.fame >= 60) { deny -= 0.05; why.push([l('Fama internacional', 'International fame'), 5]); }
  return { p: clamp(1 - deny, 0.05, 0.97), why };
}
export function applyVisa19(s: GameState, actId: string, vid: string, r = rng(s)): L {
  const a = s.acts[actId], v = VISA19.find((x) => x.id === vid);
  if (!a || !v || !mineA(s, a)) return l('Indisponível.', 'Unavailable.');
  if (hasVisa19(s, actId, vid)) return l('Já tem.', 'Already granted.');
  const c = money(s, v.cost);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `reg19visa:${actId}:${vid}:${s.week}`, -c, 'touring', `Visto: ${v.name.pt} (${a.name})`);
  const ok = r.chance(visaOdds19(s, a, v).p);
  if (ok) { reg19(s).visa[visaKey19(actId, vid)] = s.week + 52; cnt(s, 'visa_ok'); return fmtL(l('{a}: visto concedido por um ano.', '{a}: visa granted for a year.'), { a: a.name }); }
  cnt(s, 'visa_no');
  const t = fmtL(l('{a} tem o pedido negado: {v}.', '{a} is refused: {v}.'), { a: a.name, v: v.name });
  logR19(s, t);
  emitFact(s, { kind: 'visa_denied', actors: [a.id, 'player'], severity: 30 + Math.round(a.fame / 4), visibility: 'public', tags: ['regions19', 'bad', v.id], src: 'regions19', text: t, data: { visa: v.id, a3: v.host[0] } });
  return t;
}
/** Multiplicador de procura: sem visto, datas caem e o promotor teme (×0,9; proibição ×0,6). */
export function visaMult19(s: GameState, a: Act, city: string): { k: number; v?: Visa19 } {
  const v = visaFor19(s, a, city);
  if (!v || hasVisa19(s, a.id, v.id)) return { k: 1, v };
  return { k: v.ban ? 0.6 : 0.9, v };
}
registerMod('cityDemand', 'regions19:visa', (s, val, c) => {
  if (off() || !c.act || !c.cityId || !mineA(s, c.act)) return null;
  const { k, v } = visaMult19(s, c.act, c.cityId);
  if (k === 1 || !v) return null;
  return { value: val * k, label: fmtL(l('Sem visto: {v}', 'No visa: {v}'), { v: v.name }) };
});

// ================================================================ M9 — needle time e sessões de rádio

/** Fase do needle time no Reino Unido: 1935–1966 limite rígido (~5 h/dia de discos na BBC), 1967–1988 afrouxado, depois livre. */
export const needle19 = (y: number): 0 | 1 | 2 => (y >= 1935 && y < 1967 ? 2 : y >= 1967 && y <= 1988 ? 1 : 0);
export const sessFee19 = (s: GameState) => money(s, s.year < 1967 ? 120 : 300);
export function radioSession19(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!mineA(s, a)) return l('Só atos do seu elenco.', 'Only acts on your roster.');
  if (s.year < 1935) return l('A BBC ainda não grava sessões.', 'The BBC does not record sessions yet.');
  if ((reg19(s).sess[a.id] ?? -99) > s.week - 13) return l('Uma sessão por trimestre.', 'One session per quarter.');
  reg19(s).sess[a.id] = s.week;
  post(s, `reg19sess:${a.id}:${s.week}`, sessFee19(s), 'shows', `Sessão de rádio: ${a.name}`);
  for (const m of a.members) addStress(s, m, 2, l('Sessão de rádio', 'Radio session'));
  a.momentum = clamp(a.momentum + 3, -100, 100);
  cnt(s, 'session');
  const t = fmtL(l('{a} grava uma sessão ao vivo para a rádio pública britânica.', '{a} records a live session for British public radio.'), { a: a.name });
  emitFact(s, { kind: 'radio_session', actors: [a.id, 'player'], place: 'london', severity: 20, visibility: 'public', tags: ['regions19', 'radio', 'good'], src: 'regions19', text: t });
  return null;
}
const sessRecent = (s: GameState, actId: string) => (reg19(s).sess[actId] ?? -99) > s.week - 26;

// ================================================================ leis do more19 (law_*)

export const lawOn19 = (s: GameState, id: string): boolean => w4(s).ms[`law_${id}`] !== undefined;
/** Efeito de apelo das leis para um lançamento (fator, rótulo). */
export function lawAppeal19(s: GameState, rel: Release, a: Act): [number, L][] {
  const out: [number, L][] = [];
  if (on31(s, 'y31.laws')) return out; // R31 Y: estas leis valem só no país da lei (sys/mercado31, QUOTAS31)
  const a3 = a3Of(a), lang = actLang18(a), t = rel.territories, fam = familyOf(a.genre);
  if (lawOn19(s, 'toubon') && t.includes('eu')) out.push(lang === 'fr' ? [1.06, l('Cota de canções em francês (Toubon)', 'French-song quota (Toubon)')] : a3 === 'FRA' ? [1, l('', '')] : [0.98, l('Cota francesa tira espaço do resto', 'French quota squeezes others')]);
  if (lawOn19(s, 'cancon') && t.includes('na') && a3 === 'CAN') out.push([1.08, l('CanCon: 30% de música canadense no rádio', 'CanCon: 30% Canadian music on radio')]);
  if (lawOn19(s, 'free_radios_fr') && t.includes('eu') && s.year <= 1990 && ['rock', 'electronic', 'hiphop', 'africa'].includes(fam)) out.push([1.03, l('Rádios livres na França', 'French free radios')]);
  if (lawOn19(s, 'falklands_radio') && s.year <= 1983 && t.includes('latam')) out.push(a3 === 'ARG' && fam === 'rock' ? [1.2, l('Malvinas: rock nacional ocupa as rádios', 'Falklands: national rock takes the airwaves')] : lang === 'en' ? [0.9, l('Malvinas: música em inglês evitada', 'Falklands: English songs avoided')] : [1, l('', '')]);
  if (lawOn19(s, 'kr_japan_open') && t.includes('asia') && a3 === 'JPN' && s.year <= 2004) out.push([1.05, l('Coreia abre a cultura japonesa', 'Korea opens to Japanese culture')]);
  if (!lawOn19(s, 'kr_japan_open') && s.year >= 1965 && t.includes('asia') && a3 === 'JPN') out.push([0.97, l('Coreia fechada à música japonesa', 'Korea closed to Japanese music')]);
  if (lawOn19(s, 'indo_ban') && s.year <= 1965 && t.includes('asia') && ['rock', 'pop'].includes(fam) && a3 !== 'IDN') out.push([0.95, l('Indonésia contra o "ngak-ngik-ngok"', 'Indonesia against "ngak-ngik-ngok"')]);
  if (lawOn19(s, 'uk_broadcasting_1990') && t.includes('eu') && s.year <= 1996 && fam === 'pop') out.push([1.03, l('Rádios comerciais novas no Reino Unido', 'New UK commercial radio')]);
  return out.filter(([k]) => k !== 1);
}
/** Efeitos de regra quando a lei dispara (rightsMult, etc.). Ligados por id em world4 milestones (onFire). */
const LAWFX19: Record<string, (s: GameState) => void> = {
  us_copyright_1976: (s) => { s.economy.rightsMult *= 1.03; },
  berne_us: (s) => { s.economy.rightsMult *= 1.02; },
  dmca: (s) => { s.economy.rightsMult *= 1.02; },
  ahra: (s) => { s.economy.rightsMult *= 1.01; },
  blank_levy_de: (s) => { s.economy.rightsMult *= 1.01; },
  br_5988: (s) => { s.economy.rightsMult *= 1.02; },
  jp_copyright: (s) => { s.economy.rightsMult *= 1.01; },
  eu_term: (s) => { s.economy.rightsMult *= 1.02; },
  mma: (s) => { s.economy.rightsMult *= 1.03; },
  marine_offences: (s) => { for (const a of myActs(s)) if (familyOf(a.genre) === 'rock' || familyOf(a.genre) === 'pop') a.momentum = clamp(a.momentum - 2, -100, 100); },
};
for (const id of Object.keys(milestoneById).filter((k) => k.startsWith('law_'))) {
  const m = milestoneById[id], k = id.slice(4), prev = m.onFire;
  m.onFire = (s, r) => {
    prev?.(s, r);
    LAWFX19[k]?.(s);
    reg19(s).laws[k] = s.year;
    emitFact(s, { kind: 'law', actors: ['player'], severity: 35, visibility: 'public', tags: ['regions19', 'law', k], src: 'regions19', text: m.title, data: { law: k } });
  };
}
/** Rouanet (1991+): patrocínio dedutível para atos brasileiros do selo (1 pedido por ano). */
export const rouanetOk19 = (s: GameState): boolean => lawOn19(s, 'rouanet') && myActs(s).some((a) => a3Of(a) === 'BRA') && reg19(s).laws.rouanet_y !== s.year;
export function rouanet19(s: GameState): L | null {
  if (!rouanetOk19(s)) return l('Precisa da lei (1991+) e de um ato brasileiro; 1 por ano.', 'Needs the law (1991+) and a Brazilian act; once a year.');
  reg19(s).laws.rouanet_y = s.year;
  const v = money(s, 8000 * myActs(s).filter((a) => a3Of(a) === 'BRA').length);
  post(s, `reg19rouanet:${s.year}`, v, 'other_income', 'Lei Rouanet: patrocínio de projeto cultural');
  schedule18(s, 'ib:reg19_rouanet:take', {}, l('Patrocínio pela Lei Rouanet', 'Rouanet sponsorship'), l('Captar', 'Raise'));
  return null;
}
/** Vozes protegidas (ELVIS Act 2024 / AI Act): outros sistemas (tribute19/fakes19) podem ler. */
export const voiceLaw19 = (s: GameState): boolean => lawOn19(s, 'elvis_act') || lawOn19(s, 'eu_ai_act');

// ================================================================ apelo: leis + needle time + estoque de greve

registerMod('appeal', 'regions19', (s, v, c) => {
  const rel = c.release, a = c.act;
  if (off() || !rel || !a) return null;
  let k = 1;
  const labels: string[] = [];
  for (const [f, lb] of lawAppeal19(s, rel, a)) { k *= f; labels.push(lb.pt); }
  if (mineA(s, a) && rel.territories.includes('eu')) {
    const nd = needle19(s.year);
    if (sessRecent(s, a.id)) { k *= nd ? 1.06 : 1.02; labels.push('Sessão de rádio'); }
    else if (nd) { k *= nd === 2 ? 0.96 : 0.98; labels.push('Needle time'); }
  }
  if (mineA(s, a) && (reg19(s).stk.stock ?? 0) > s.week) { k *= 1.08; labels.push('Estoque de gravações da greve'); }
  if (Math.abs(k - 1) < 0.002) return null;
  return { value: v * k, label: l(`Regiões e leis: ${labels.join(', ')}`, `Regions and laws: ${labels.join(', ')}`) };
});

// ================================================================ M10 — greves de gravação 1942/1948

export const STRIKES19 = [
  { id: '1942', warn: [1942, 5] as [number, number], name: l('Proibição Petrillo (1942–44)', 'Petrillo ban (1942–44)') },
  { id: '1948', warn: [1947, 10] as [number, number], name: l('Segunda proibição (1948)', 'Second ban (1948)') },
];
export type StrikeHow19 = 'acappella' | 'abroad' | 'settle' | 'hold';
export function strikeWarnAns19(s: GameState, how: string): L {
  if (how !== 'stock') return l('Você espera para ver.', 'You wait and see.');
  const n = Math.max(1, myActs(s).length);
  post(s, `reg19stock:${s.year}`, -money(s, 900 * n), 'recording', 'Sessões extras antes da greve');
  reg19(s).stk.stock = s.week + 60;
  for (const a of myActs(s)) for (const m of a.members) addStress(s, m, 4, l('Maratona de estúdio antes da greve', 'Studio marathon before the strike'));
  return l('Maratona de estúdio: masters no cofre para o ano da greve.', 'Studio marathon: masters in the vault for the strike year.');
}
export function strikeAns19(s: GameState, how: StrikeHow19): L {
  const st = reg19(s).stk, w = w4(s);
  st.mode = how;
  if (how === 'settle') {
    w.union = true;
    reg19(s).mptf = { since: s.year, paid: 0, gigs: 0 };
    s.player.reputation.artists = clamp(s.player.reputation.artists + 3, 0, 100);
    const t = l('O selo assina com o sindicato: fundo de 1% por disco paga shows gratuitos em praças.', 'The label signs with the union: a 1% per-record fund pays free concerts in parks.');
    logR19(s, t);
    emitFact(s, { kind: 'strike_settled', actors: ['player'], severity: 35, visibility: 'public', tags: ['regions19', 'union', 'good'], src: 'regions19', text: t });
    return t;
  }
  if (how === 'abroad') { s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100); return l('Sessões em Londres e na Cidade do México: som normal, sindicato furioso.', 'Sessions in London and Mexico City: normal sound, an angry union.'); }
  if (how === 'acappella') return l('Coros e vozes no lugar da banda: cantores brilham, o resto sofre.', 'Choirs and voices instead of the band: singers shine, the rest suffer.');
  return l('Você segura e vive do cofre.', 'You hold out and live off the vault.');
}
registerInboxKind('reg19_strike_warn', { label: l('Sindicato', 'Union'), cat: 'decision', icon: 'alert', prio: 2, goto: () => ({ area: 'regions19' }), handle: (s, _m, a) => strikeWarnAns19(s, a) });
registerInboxKind('reg19_strike', { label: l('Greve', 'Strike'), cat: 'decision', icon: 'alert', prio: 3, goto: () => ({ area: 'regions19' }), handle: (s, _m, a) => strikeAns19(s, a as StrikeHow19) });
const VOCAL = new Set(['pop', 'rnb', 'sacred', 'blues_jazz', 'country_folk', 'brazil', 'latin']);
// depois do gancho w4ms (que tira 30% da performance sem acordo): a capella salva os cantores, o exterior salva tudo
registerSimHook('record', 'regions19:strike', (s, _r, arg) => {
  const song = arg.song;
  if (!song || !strikeActive(s) || w4(s).union) return;
  const a = s.acts[song.actId];
  if (!mineA(s, a)) return;
  const md = reg19(s).stk.mode;
  if (md === 'abroad') { song.performance = clamp(song.performance / 0.7 * 0.95, 5, 100); post(s, `reg19abroad:${song.id}`, -money(s, 350), 'recording', 'Sessão no exterior (greve)'); }
  else if (md === 'acappella' && VOCAL.has(familyOf(song.genre))) song.performance = clamp(song.performance * 1.2, 5, 100);
});
function strikeMonth(s: GameState): void {
  const st = reg19(s).stk;
  for (const x of STRIKES19) if (s.year === x.warn[0] && s.month === x.warn[1] && !st.warned[x.id] && s.config.startYear <= x.warn[0]) {
    st.warned[x.id] = 1;
    pushInbox18(s, 'reg19_strike_warn', { from: l('Sindicato dos músicos', 'Musicians\' union').pt, subject: fmtL(l('Greve à vista: {n}', 'Strike ahead: {n}'), { n: x.name }), tone: 'bad',
      body: l('O sindicato avisa: em poucos meses, nenhum músico filiado grava. Gravar tudo agora (maratona) enche o cofre.', 'The union warns: in a few months no member will record. Recording everything now (a marathon) fills the vault.'),
      actions: [{ id: 'stock', label: l('Maratona de estúdio', 'Studio marathon') }, { id: 'wait', label: l('Esperar', 'Wait') }], weeks: 6 });
  }
  if (s.year === 1948 && s.month === 0 && !st.s48) {
    st.s48 = 1;
    const w = w4(s);
    if (!strikeActive(s)) { w.strike = { from: s.week, to: s.week + 48, name: 'Petrillo 1948' }; w.union = false; st.mode = undefined; }
  }
  const sa = strikeActive(s);
  const sid = sa ? (s.year >= 1947 ? '1948' : '1942') : '';
  if (sa && !st.started[sid] && !w4(s).union) {
    st.started[sid] = 1;
    pushInbox18(s, 'reg19_strike', { from: l('Sindicato dos músicos', 'Musicians\' union').pt, subject: l('A greve começou: como o selo grava?', 'The strike has begun: how does the label record?'), tone: 'bad',
      body: l('A capella (cantores e coros), gravar no exterior (som normal, sindicato contra), assinar o acordo do fundo (1% por disco paga shows gratuitos) ou segurar.', 'A cappella (singers and choirs), record abroad (normal sound, union against), sign the fund deal (1% per record pays free concerts) or hold out.'),
      actions: [{ id: 'acappella', label: l('A capella', 'A cappella') }, { id: 'abroad', label: l('Gravar no exterior', 'Record abroad') }, { id: 'settle', label: l('Assinar o fundo', 'Sign the fund') }, { id: 'hold', label: l('Segurar', 'Hold out') }], weeks: 8 });
  }
  const f = reg19(s).mptf;
  if (f) {
    const acts = myActs(s);
    const fee = money(s, 40 + acts.length * 25);
    post(s, 'reg19mptf', -fee, 'w4_union', 'Fundo dos músicos (MPTF): 1% por disco');
    f.paid += fee;
    if (s.month % 3 === 0 && acts.length) { f.gigs++; for (const a of acts.slice(0, 3)) a.fans.casual += Math.round(40 + a.fame * 3); }
  }
}

// ================================================================ M29 — campanhas políticas usando canções

export const electionYear19 = (s: GameState, y = s.year): boolean => y >= 1936 && y % 4 === 0 && !regimeAt18(s, countryOfCity(s.config.homeCity));
function hitOfMine(s: GameState): Release | undefined {
  return Object.values(s.releases).filter((r) => r.owner === 'player' && r.peak > 0 && r.peak <= 10 && s.year - r.year <= 8).sort((a, b) => a.peak - b.peak)[0];
}
function campaignMonth(s: GameState, r: Rng): void {
  if (!electionYear19(s) || s.month !== 7 || reg19(s).camp[s.year]) return;
  const rel = hitOfMine(s);
  if (!rel || !r.chance(0.55)) return;
  const side = r.chance(0.5) ? 'left' : 'right';
  reg19(s).camp[s.year] = `${rel.id}|${side}`;
  const a = s.acts[rel.actId];
  pushInbox18(s, 'reg19_campaign', { from: side === 'left' ? l('Campanha da oposição', 'Opposition campaign').pt : l('Campanha do governo', 'Government campaign').pt,
    subject: fmtL(l('"{t}" virou jingle de campanha', '"{t}" became a campaign anthem'), { t: rel.title }), tone: 'info',
    body: fmtL(l('Um candidato (fictício) toca "{t}" de {a} em todo comício. Licenciar paga e divide os fãs; protestar agrada ao artista; ignorar deixa rolar.', 'A (fictional) candidate plays "{t}" by {a} at every rally. Licensing pays and splits fans; protesting pleases the artist; ignoring lets it roll.'), { t: rel.title, a: a?.name ?? '?' }),
    ref: { rel: rel.id, act: rel.actId, side }, actions: [{ id: 'license', label: l('Licenciar', 'License') }, { id: 'protest', label: l('Exigir que pare', 'Demand they stop') }, { id: 'ignore', label: l('Ignorar', 'Ignore') }], weeks: 6 });
}
/** O artista concorda com o lado do candidato? (média das visões dos integrantes; −1..1) */
export function campAgree19(s: GameState, actId: string, side: string): number {
  const a = s.acts[actId]; if (!a?.members.length) return 0;
  const ax = { left: -2, cleft: -1, center: 0, cright: 1, right: 2, apolitical: 0 } as Record<string, number>;
  const m = a.members.reduce((t, p) => t + (ax[viewsOf(s, p).pol] ?? 0), 0) / a.members.length;
  return clamp((side === 'left' ? -m : m) / 2, -1, 1);
}
export function campaignAns19(s: GameState, relId: string, side: string, how: string): L {
  const rel = s.releases[relId], a = rel && s.acts[rel.actId];
  if (!rel || !a) return l('Passou.', 'Gone.');
  const ag = campAgree19(s, a.id, side), fa = fan18(s, a.id, false);
  if (how === 'license') {
    post(s, `reg19camp:${s.year}`, money(s, 12000), 'sync', `Campanha: licença de "${rel.title}"`);
    a.trust = clamp(a.trust + Math.round(ag * 8), 0, 100);
    if (fa) { fa.loy = clamp(fa.loy - 4, 0, 100); if (fa.fac.length) fa.fac[0] = clamp(fa.fac[0] + (side === 'left' ? -12 : 12), -50, 50); }
  } else if (how === 'protest') {
    a.trust = clamp(a.trust + 5, 0, 100); a.fame = clamp(a.fame + 1, 0, 100);
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
  } else if (fa) fa.fac[0] = clamp((fa.fac[0] ?? 0) + (side === 'left' ? -5 : 5), -50, 50);
  const t = fmtL(how === 'license' ? l('"{t}" é o hino oficial da campanha.', '"{t}" is the campaign\'s official anthem.') : how === 'protest' ? l('{a} manda a campanha parar de usar "{t}".', '{a} tells the campaign to stop using "{t}".') : l('"{t}" toca em comícios sem autorização.', '"{t}" plays at rallies without permission.'), { t: rel.title, a: a.name });
  logR19(s, t); cnt(s, `camp_${how}`);
  emitFact(s, { kind: 'campaign_song', actors: [a.id, 'player'], severity: 30 + Math.round(a.fame / 5), visibility: 'public', tags: ['regions19', 'politics', how, side], src: 'regions19', text: t, data: { rel: rel.id, side } });
  return t;
}
registerInboxKind('reg19_campaign', { label: l('Campanha política', 'Political campaign'), cat: 'decision', icon: 'mic', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a) => campaignAns19(s, String(m.ref?.rel), String(m.ref?.side), a) });

// ================================================================ mês

function indMonth(s: GameState): void {
  for (const id of Object.keys(reg19(s).ind) as IndId[]) {
    const x = reg19(s).ind[id]!, y = indYield19(s, id);
    x.inc = y.v;
    post(s, `reg19inc:${id}`, y.v, 'sales', `${IND19[id].name.pt}: vendas e porta`);
    post(s, `reg19up:${id}`, -money(s, IND19[id].base * 0.35 * x.lv), 'salaries', `${IND19[id].name.pt}: equipe e aluguel`);
  }
}
function communeMonth(s: GameState, r: Rng): void {
  for (const [id, c] of Object.entries(reg19(s).com)) {
    const a = s.acts[id];
    if (!a || a.status === 'split' || a.status === 'retired') { delete reg19(s).com[id]; continue; }
    a.fans.core += Math.round(5 + a.fame / 5);
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + 0.15, 0, 100);
    post(s, `reg19comup:${id}`, -money(s, 250), 'misc', `Comuna de ${a.name}: casa e comida`);
    if (regimeAt18(s, a3Of(a))) soc18(s).heat[id] = clamp((soc18(s).heat[id] ?? 0) + 2, 0, 100);
    if (c.city !== a.city) { delete reg19(s).com[id]; continue; }
    if (r.chance(raidOdds19(s, id).p)) raid19(s, a);
  }
}
export function regionsMonth19(s: GameState): void {
  const r = rng(s);
  indMonth(s);
  communeMonth(s, r);
  strikeMonth(s);
  campaignMonth(s, r);
}
registerSimHook('month', 'regions19', (s) => { if (!off()) regionsMonth19(s); });

// ================================================================ ouvintes

onFact('industry_born', (s, f) => {
  const d = IND19[String(f.data?.ind) as IndId]; if (!d) return;
  for (const g of d.genres) addAff18(s, d.sub, g, 0.04, true, fmtL(l('{n} aquece a cena', '{n} heats up the scene'), { n: d.name }));
  headline19(s, f.text, 1);
}, 'regions19:born');
onFact('sound_clash', (s, f) => {
  const win = Number(f.data?.win) === 1, a = s.acts[f.actors[0]];
  for (const x of myIn(s, IND19.sound.genres)) { x.fame = clamp(x.fame + (win ? 1.5 : -0.5), 0, 100); if (win) nudge16(s, x.id, 'JAM', 3); }
  if (win) addAff18(s, 'carib', a?.genre ?? 'reggae', 0.03, true, l('Clash vencido', 'Clash won'));
}, 'regions19:clash');
onFact('street_hit', (s, f) => {
  const a = s.acts[f.actors[0]]; if (a) { a.fame = clamp(a.fame + 2, 0, 100); a.momentum = clamp(a.momentum + 5, -100, 100); }
  if (f.tags.includes('cheap') && a) a.trust = clamp(a.trust - 4, 0, 100);
  headline19(s, f.text, 1);
}, 'regions19:street');
onFact('allstars_show', (s, f) => {
  for (const x of myIn(s, IND19.salsa.genres)) { x.fans.casual += Math.round(200 + x.fame * 10); nudge16(s, x.id, 'PRI', 3); }
  addAff18(s, 'carib', 'salsa', 0.04, true, l('Show das All-Stars', 'All-Stars concert'));
  headline19(s, f.text, 2);
}, 'regions19:allstars');
onFact('industry_suit', (s, f) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1.5, 0, 100); headline19(s, f.text, 1); }, 'regions19:suit');
onFact('commune_founded', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  if (f.tags.includes('regime')) soc18(s).heat[a.id] = clamp((soc18(s).heat[a.id] ?? 0) + 10, 0, 100);
  for (const m of a.members) addStress(s, m, -5, l('Vida na comuna', 'Commune life'));
  link(s, 'commune', fmtL(l('{a}: comuna → calor do regime +10, estresse −5.', '{a}: commune → regime heat +10, stress −5.'), { a: a.name }));
}, 'regions19:commune');
onFact('commune_raid', (s, f) => {
  headline19(s, f.text, 3);
  const a = s.acts[f.actors[0]], a3 = a && a3Of(a);
  if (a && a3) { nudge16(s, a.id, a3, 4); const fa = fan18(s, a.id, false); if (fa) fa.loy = clamp(fa.loy + 6, 0, 100); }
}, 'regions19:raid');
onFact('visa_denied', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  for (const m of a.members) addStress(s, m, 5, l('Visto negado', 'Visa denied'));
  const a3 = String(f.data?.a3 ?? ''); if (a3) nudge16(s, a.id, a3, -2);
  link(s, 'visa', fmtL(l('{a}: visto negado → estresse +5, fama lá −2.', '{a}: visa denied → stress +5, fame there −2.'), { a: a.name }));
  if (a.fame >= 50) headline19(s, f.text, 1);
}, 'regions19:visa');
onFact('radio_session', (s, f) => { const a = s.acts[f.actors[0]]; if (a) nudge16(s, a.id, 'GBR', 2); }, 'regions19:session');
onFact('strike_settled', (s, f) => { headline19(s, f.text, 1); for (const a of myActs(s)) a.trust = clamp(a.trust + 2, 0, 100); }, 'regions19:union');
onFact('campaign_song', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  if (f.tags.includes('protest')) for (const m of a.members) addStress(s, m, 3, l('Briga com a campanha', 'Fight with the campaign'));
  headline19(s, f.text, f.tags.includes('protest') ? 2 : 1);
}, 'regions19:campaign');
// leis chegam ao diário regional (regions18) e ao Cockpit
onFact('law', (s, f) => { if (f.src === 'regions19') logR19(s, f.text); }, 'regions19:law');

// ================================================================ ecos (decide18)

registerConseq18('ib:reg19_raid:exile', { later: [{ in: [24, 60], p: 0.5, tone: 'good', hint: l('Regimes caem; exilados voltam.', 'Regimes fall; exiles come home.'),
  fx: (f) => { f.fame(4).fans(8); return l('No exílio, o ato vira voz da diáspora: shows lotados de conterrâneos.', 'In exile the act becomes the diaspora\'s voice: shows packed with compatriots.'); } }] });
registerConseq18('ib:reg19_raid:rebuild', { later: [{ in: [6, 18], p: 0.35, tone: 'bad', hint: l('O regime não esquece um símbolo.', 'The regime does not forget a symbol.'),
  fx: (f) => { f.cash(-3000, 'Multas e advogados da comuna', 'legal').mood('stress', 6); return l('Fiscais e processos voltam à comuna.', 'Inspectors and lawsuits return to the commune.'); },
  miss: () => l('A comuna reconstruída vira ponto de peregrinação.', 'The rebuilt commune becomes a pilgrimage site.') }] });
registerConseq18('ib:reg19_raid:disband', { later: [{ in: [3, 9], p: 0.4, tone: 'mixed', hint: l('Quem saiu da comuna lembra quem fechou a porta.', 'Those who left the commune remember who shut the door.'),
  fx: (f) => { f.trust(-4).mood('morale', 4); return l('A banda segue, mais quieta — e mais distante do selo.', 'The band carries on, quieter — and further from the label.'); } }] });
registerConseq18('ib:reg19_strike_warn:stock', { later: [{ in: [3, 8], p: 0.6, tone: 'good', hint: l('Quem tem cofre lança durante a greve.', 'Whoever has a vault releases during the strike.'),
  fx: (f) => { f.cash(1500, 'Lançamentos do cofre durante a greve', 'sales'); return l('O cofre segura a programação enquanto rivais param.', 'The vault keeps the schedule going while rivals stall.'); } }] });
registerConseq18('ib:reg19_strike_warn:wait', { later: [{ in: [3, 8], p: 0.4, tone: 'bad', hint: l('Sem estoque, a greve dói.', 'Without stock, the strike hurts.'),
  fx: (f) => { f.cash(-1200, 'Agenda vazia na greve', 'misc'); return l('A programação do selo trava na greve.', 'The label\'s schedule stalls in the strike.'); } }] });
registerConseq18('ib:reg19_strike:acappella', { later: [{ in: [2, 8], p: 0.4, tone: 'good', hint: l('Coros viram moda quando a banda some.', 'Choirs become a fad when the band disappears.'),
  fx: (f) => { for (const a of f.mine.slice(0, 2)) a.fans.casual += 300; return l('Gravações a capella pegam: o público gosta das vozes nuas.', 'A cappella records catch on: the public likes bare voices.'); } }] });
registerConseq18('ib:reg19_strike:abroad', { later: [{ in: [4, 14], p: 0.5, tone: 'bad', hint: l('O sindicato tem memória longa.', 'The union has a long memory.'),
  fx: (f) => { f.cash(-2500, 'Multa do sindicato (fura-greve)', 'w4_union').rep('artists', -2); return l('O sindicato multa o selo por furar a greve.', 'The union fines the label for strike-breaking.'); } }] });
registerConseq18('ib:reg19_strike:settle', { later: [{ in: [6, 18], p: 0.5, tone: 'good', hint: l('Shows gratuitos do fundo formam plateia.', 'The fund\'s free shows grow audiences.'),
  fx: (f) => { for (const a of f.mine.slice(0, 3)) a.fans.casual += 500; f.rep('institutional', 2); return l('Os shows gratuitos do fundo enchem praças com seus artistas.', 'The fund\'s free concerts fill parks with your artists.'); } }] });
registerConseq18('ib:reg19_strike:hold', { later: [{ in: [3, 10], p: 0.45, tone: 'mixed', hint: l('Quem segura pode sair por cima — ou atrás.', 'Holding out can win — or fall behind.'),
  fx: (f) => { f.rep('commercial', 1).rep('artists', -1); return l('O selo aguenta, mas os músicos lembram.', 'The label holds, but musicians remember.'); } }] });
registerConseq18('ib:reg19_campaign:license', { later: [{ in: [2, 8], p: 0.5, tone: 'mixed', hint: l('Canção de campanha fica marcada.', 'A campaign song stays branded.'),
  fx: (f) => { f.fans(-3).cash(2000, 'Campanha: bônus de vitória', 'sync'); return l('O candidato ganha (ou perde) e a canção fica com o rótulo dele.', 'The candidate wins (or loses) and the song keeps their label.'); } }] });
registerConseq18('ib:reg19_campaign:protest', { later: [{ in: [1, 6], p: 0.5, tone: 'good', hint: l('Briga com campanha vira notícia.', 'A fight with a campaign makes news.'),
  fx: (f) => { f.fame(2).trust(3); return l('A recusa vira notícia: o artista ganha respeito.', 'The refusal makes news: the artist earns respect.'); } }] });
registerConseq18('ib:reg19_campaign:ignore', { later: [{ in: [2, 6], p: 0.35, tone: 'bad', hint: l('Fã que discorda cobra silêncio.', 'Fans who disagree resent the silence.'),
  fx: (f) => { f.fans(-2).trust(-2); return l('Fãs cobram posição; o silêncio custa.', 'Fans demand a stance; silence costs.'); } }] });
registerConseq18('ib:reg19_ind:version', { later: [{ in: [4, 12], p: 0.35, tone: 'bad', hint: l('Versões incomodam quem tem o original.', 'Versions annoy whoever owns the original.'),
  fx: (f) => { f.cash(-2500, 'Acordo com dono de trilha', 'legal'); return l('Um dono de trilha exige acordo pelas versões.', 'A soundtrack owner demands a settlement for the versions.'); } }] });
registerConseq18('ib:reg19_ind:dub', { later: [{ in: [2, 6], p: 0.4, tone: 'good', hint: l('Dubplate boa corre de boca em boca.', 'A good dubplate travels by word of mouth.'),
  fx: (f) => { f.cash(600, 'Dubplate pedida por outros sounds', 'licensing'); return l('Outros sounds pagam por cópias da sua dubplate.', 'Other sounds pay for copies of your dubplate.'); } }] });
registerConseq18('ib:reg19_ind:clash_win', { later: [{ in: [1, 4], p: 0.4, tone: 'mixed', hint: l('Quem perde quer revanche.', 'The loser wants a rematch.'),
  fx: (f) => { f.cash(-500, 'Segurança na revanche', 'security').rep('artistic', 1); return l('O rival exige revanche; a rua inteira aparece.', 'The rival demands a rematch; the whole street turns up.'); } }] });
registerConseq18('ib:reg19_ind:clash_lose', { later: [{ in: [1, 4], p: 0.4, tone: 'good', hint: l('Derrota ensina o seletor.', 'Defeat teaches the selector.'),
  fx: (f) => { const x = reg19(f.s).ind.sound; if (x) x.dub++; return l('O seletor volta com uma dubplate nova.', 'The selector comes back with a new dubplate.'); } }] });
registerConseq18('ib:reg19_ind:fair', { later: [{ in: [6, 18], p: 0.4, tone: 'good', hint: l('Pagar direito fideliza MCs.', 'Paying fairly keeps MCs loyal.'),
  fx: (f) => { f.rep('artists', 2); return l('MCs da rua preferem seu selo: "lá pagam".', 'Street MCs prefer your label: "they pay there".'); } }] });
registerConseq18('ib:reg19_ind:cheap', { later: [{ in: [6, 24], p: 0.5, tone: 'bad', hint: l('Royalty não pago vira processo.', 'Unpaid royalties become a lawsuit.'),
  fx: (f) => { f.cash(-4000, 'Acordo de royalties atrasados', 'legal').rep('artists', -2); return l('Os MCs descobrem quanto o single rendeu.', 'The MCs find out how much the single made.'); } }] });
registerConseq18('ib:reg19_ind:allstars', { later: [{ in: [3, 12], p: 0.45, tone: 'good', hint: l('O filme do show viaja.', 'The concert film travels.'),
  fx: (f) => { f.cash(3000, 'Filme do show das All-Stars', 'licensing'); return l('O filme do show estreia em Caracas, San Juan e Dakar.', 'The concert film opens in Caracas, San Juan and Dakar.'); } }] });
registerConseq18('ib:reg19_rouanet:take', { later: [{ in: [12, 36], p: 0.2, tone: 'bad', hint: l('Prestação de contas de lei cultural é exigente.', 'Cultural-law accounting is demanding.'),
  fx: (f) => { f.cash(-3000, 'Prestação de contas rejeitada (Rouanet)', 'legal').rep('institutional', -2); return l('A prestação de contas é rejeitada: devolução e manchete.', 'The accounting is rejected: repayment and a headline.'); } }] });

// ================================================================ calendário, porquês, dica, ligações

registerDeadline('regions19', (s, from, to) => {
  const out: Deadline19[] = [];
  const sa = strikeActive(s);
  if (sa && sa.to >= from && sa.to <= to) out.push({ id: 'regions19-strike', w: sa.to, kind: 'other', t: l('Fim previsto da greve de gravação', 'Recording strike expected to end'), tone: 'info', goto: { area: 'regions19' } });
  for (let y = s.year; y <= s.year + 1; y++) if (electionYear19(s, y)) { const w = weekOfMonth19(s, y, 10); if (w >= from && w <= to) out.push({ id: `regions19-elect-${y}`, w, kind: 'other', t: l('Eleição: campanhas usam canções', 'Election: campaigns use songs'), tone: 'info', goto: { area: 'regions19' } }); }
  for (const [k, w] of Object.entries(reg19(s).visa)) if (w >= from && w <= to) { const [aid, vid] = k.split('|'); out.push({ id: `regions19-visa-${k}`, w, kind: 'contract', t: fmtL(l('Visto vence: {a} ({v})', 'Visa expires: {a} ({v})'), { a: s.acts[aid]?.name ?? '?', v: VISA19.find((v) => v.id === vid)?.name ?? vid }), tone: 'bad', goto: { area: 'regions19' } }); }
  return out;
});
registerExplain('reg19.ind', (s, c) => {
  const id = String(c.id) as IndId, d = IND19[id], y = indYield19(s, id);
  if (!d || !reg19(s).ind[id]) return null;
  return { title: d.name, value: y.v, fmt: 'money', parts: y.parts, note: l('Menos 35% da base × nível em equipe e aluguel.', 'Minus 35% of base × level for staff and rent.') };
});
registerExplain('reg19.visa', (s, c) => {
  const a = s.acts[String(c.act)], v = VISA19.find((x) => x.id === String(c.v));
  if (!a || !v) return null;
  const o = visaOdds19(s, a, v);
  return { title: fmtL(l('Chance do visto: {v}', 'Visa odds: {v}'), { v: v.name }), value: Math.round(o.p * 100), fmt: 'pct', parts: o.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const })),
    note: l('Sem visto, a procura de ingressos no país cai (×0,9; proibição ×0,6).', 'Without a visa, ticket demand in the country drops (×0.9; ban ×0.6).') };
});
registerExplain('reg19.raid', (s, c) => {
  const o = raidOdds19(s, String(c.act));
  if (!reg19(s).com[String(c.act)]) return null;
  return { title: l('Risco de batida na comuna (mês)', 'Commune raid risk (month)'), value: Math.round(o.p * 1000) / 10, fmt: 'pct', parts: o.why.map(([label, value]) => ({ label, value, fmt: 'num' as const })),
    note: l('O calor do regime (censura) sobe 2 por mês na comuna; ficar quieto reduz.', 'Regime heat (censorship) rises 2 a month at the commune; laying low reduces it.') };
});
registerExplain('reg19.law', (s, c) => {
  const a = s.acts[String(c.act)], rel = a && s.releases[a.releases[a.releases.length - 1] ?? ''];
  if (!a || !rel) return null;
  const xs = lawAppeal19(s, rel, a);
  const nd = needle19(s.year);
  return { title: l('Leis, cotas e rádio', 'Laws, quotas and radio'), value: xs.reduce((t, [k]) => t * k, 1), fmt: 'mult', parts: [
    ...xs.map(([value, label]) => ({ label, value, fmt: 'mult' as const, tone: value >= 1 ? 'good' as const : 'bad' as const })),
    ...(nd ? [{ label: sessRecent(s, a.id) ? l('Sessão de rádio recente (Reino Unido)', 'Recent radio session (UK)') : l('Needle time limita discos na rádio britânica', 'Needle time limits records on British radio'), value: sessRecent(s, a.id) ? 1.06 : nd === 2 ? 0.96 : 0.98, fmt: 'mult' as const }] : [])],
    note: l('As leis entram na data real; as anteriores ao início da partida já valem.', 'Laws take effect on the real date; those before the start already apply.') };
});
registerAdvisorTip('regions19', (s) => {
  const out: AdvTip18[] = [];
  const reggae = myIn(s, IND19.sound.genres).length, hh = myIn(s, IND19.street.genres).length;
  if (s.year >= 1952 && reggae && !reg19(s).ind.sound) out.push({ id: 'reg19-sound', level: 'info', cat: 'opportunity', score: 22, text: l('Seu reggae precisa de um sound system em Kingston.', 'Your reggae needs a sound system in Kingston.'), effect: l('Renda mensal, clashes e fama local.', 'Monthly income, clashes and local fame.'), goto: { area: 'regions19' } });
  if (s.year >= 1979 && hh && !reg19(s).ind.street) out.push({ id: 'reg19-street', level: 'info', cat: 'opportunity', score: 20, text: l('Um selo de rua grava o MC da festa em uma semana.', 'A street label cuts the party MC in a week.'), effect: l('Singles rápidos; royalties justos evitam processo.', 'Fast singles; fair royalties avoid lawsuits.'), goto: { area: 'regions19' } });
  if (strikeActive(s) && !w4(s).union && !reg19(s).stk.mode) out.push({ id: 'reg19-strike', level: 'warn', cat: 'release', score: 60, text: l('Greve de gravação sem estratégia: suas faixas novas saem 30% piores.', 'Recording strike without a plan: your new tracks come out 30% worse.'), effect: l('A capella, exterior ou o fundo.', 'A cappella, abroad or the fund.'), goto: { area: 'regions19' } });
  return out;
});
export const LINKS_REG19 = [
  { id: 'visa', a: l('Prisões e ativismo', 'Arrests and activism'), b: l('Vistos de turnê', 'Touring visas'), how: l('Prisão na ficha e calor político derrubam a chance do visto; sem visto, a procura de ingressos no país cai e o pedido negado vira notícia.', 'Arrests on record and political heat lower visa odds; without a visa, ticket demand in that country falls and a refusal makes news.') },
  { id: 'commune', a: l('Comuna-república', 'Commune-republic'), b: l('Censura e exílio', 'Censorship and exile'), how: l('A comuna dá núcleo de fãs e prestígio, mas esquenta o regime: batida → exílio.', 'The commune grows core fans and prestige but heats up the regime: a raid → exile.') },
];
for (const d of LINKS_REG19) if (!LINKS18.some((x) => x.id === d.id)) LINKS18.push(d);
