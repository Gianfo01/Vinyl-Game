// Rodada 19 (Frente 9.13) — ENDOSSO DE INSTRUMENTOS E INSTRUMENTO-ÍCONE (`gear19`). Cada instrumentista do seu elenco toca
// um modelo real da época (GEAR19/GEAR_META19, nunca antes do lançamento; nomes genéricos sem "nomes reais"). Fabricantes
// oferecem endosso (1930+: cachê anual, o selo leva comissão; imagem mais pop, puristas desconfiam) e, para estrelas
// (1952+, a Les Paul), MODELO-ASSINATURA (royalty mensal por unidade vendida). O instrumento de quem acumula hits vira
// ÍCONE: nasce uma relíquia (relics18) com apelido. Quando o dono morre, a peça vai aos herdeiros: os que querem faturar
// leiloam, os guardiões emprestam a um museu — e, com os dois tipos na família, a briga vai à justiça (afterlife19).
// O fabricante pode ser comprado (deals18): dividendos, endossos da casa e margem cheia nos modelos-assinatura.
// O som da era (sintetizador, caixa de ritmos, guitarra da moda) entra nas dimensões do disco (quality18).
// Fatos reservados: gear_endorse, signature_model, icon_instrument. Cadeia 5 (plano19 §9): assinatura → morte → relíquia →
// leilão → herdeiros brigam → holograma ou tributo oficial.

import { Rng, clamp, hashString } from '../../core/rng';
import { GEAR19, STUDIOS19, type Gear19 } from '../../data/more19';
import { GEAR_META19, STUDIO_KIT19 } from '../../data/more19/wp_f';
import { familyOf, l, type L } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { histLocked } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { est19, suit19 } from './afterlife19';
import { deals18 } from './deals18';
import { headline19 } from './factlink19';
import { fan18 } from './fans18';
import { LINK18_PARTS, LINKS18, lk18 } from './links18';
import { estate18, post18 } from './post18';
import { registerDimAdj18, type Dim18 } from './quality18';
import { ORIGIN18 } from './relics18';
import { addRelic, relMeta, relics, type RelicKind } from './relics9';
import { cashWhy20, freeCash20 } from '../oblig20';

const F = fmtL;
const $k = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const rr = (s: GameState, tag: string) => rng19(s, 'gear19');

// ---------------------------------------------------------------- estado

export interface End19 { pid: string; act: string; maker: string; gear: string; fee: number; from: number; until: number; paid: number }
export interface Sig19 { pid: string; act: string; maker: string; gear: string; y: number; units: number; earned: number; boost?: number }
export interface G19 { main: Record<string, string>; end: Record<string, End19>; sig: Record<string, Sig19>; icon: Record<string, string>; mk: Record<string, number>; offW: Record<string, number>; log: [number, number, L][]; seen: Record<string, 1> }
declare module '../ext4' { interface Ext4 { g19: G19 } }
const fresh = (): G19 => ({ main: {}, end: {}, sig: {}, icon: {}, mk: {}, offW: {}, log: [], seen: {} });
registerExt4('g19', fresh);
export function g19(s: GameState): G19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.g19 ??= fresh()) as G19;
  for (const k of ['main', 'end', 'sig', 'icon', 'mk', 'offW', 'seen'] as const) st[k] ??= {};
  st.log ??= [];
  return st;
}
const log = (s: GameState, t: L) => { const st = g19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const link = (s: GameState, t: L) => { const st = lk18(s); st.log.unshift([s.week, 'gear19', t]); if (st.log.length > 40) st.log.length = 40; };
const mine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
export const ENDORSE_FROM19 = 1930;
export const SIG_FROM19 = 1952;

// ---------------------------------------------------------------- equipamento de cada um (nada do futuro)

const SUBS: Record<string, string[]> = {
  guitar: ['solid', 'hollow', 'acoustic'], bass: ['bassE'], drums: ['drums', 'dm'], keys: ['organ', 'epiano', 'piano', 'synth', 'poly', 'workstation', 'tapekeys'],
  vocal: ['mic'], dj: ['dj', 'sampler', 'dm'], producer: ['console', 'daw', 'sampler', 'tape'], horns: ['trad', 'other'], strings: ['trad', 'acoustic'], mc: ['mic', 'sampler'],
};
const RELIC_OF: Record<string, RelicKind> = { guitar: 'guitar', bass: 'bass', drums: 'drums', keys: 'piano', vocal: 'mic', mc: 'mic', dj: 'record', producer: 'tape' };
export const gearNow19 = (y: number): Gear19[] => GEAR19.filter((g) => g.from <= y);
export const gearById19 = (id: string): Gear19 | undefined => GEAR19.find((g) => g.id === id);
const FICT_MK = ['Aurora', 'Valente', 'Kestrel', 'Monarca', 'Halcyon', 'Ferro & Filhos', 'Orbis', 'Solace', 'Tornado', 'Lumen', 'Vértice', 'Cobalto'];
/** Fabricante pelo modo: real só com nomes reais; senão um nome fictício estável. */
export const makerName19 = (s: GameState, maker: string): string => (s.config.realNames ? maker : FICT_MK[hashString(`${s.config.seed}|mk|${maker}`) % FICT_MK.length]);
export const gearName19 = (s: GameState, g?: Gear19): L => (!g ? l('—', '—') : s.config.realNames && g.exact !== false ? l(g.name, g.name) : F(l('{a} ({m})', '{a} ({m})'), { a: g.alt, m: makerName19(s, g.maker) }));

/** O instrumento principal de uma pessoa (escolhido uma vez, pela função, gênero e época). */
export function mainGear19(s: GameState, pid: string): Gear19 | undefined {
  const st = g19(s);
  const have = st.main[pid] ? gearById19(st.main[pid]) : undefined;
  if (have && have.from <= s.year) return have;
  const p = s.persons[pid];
  if (!p) return undefined;
  const subs = SUBS[p.role] ?? [];
  const a = Object.values(s.acts).find((x) => x.members.includes(pid));
  const pool = gearNow19(s.year).filter((g) => subs.includes(GEAR_META19[g.id]?.sub ?? '') && (!g.to || g.to >= s.year - 5));
  if (!pool.length) return undefined;
  const fam = a ? familyOf(a.genre) : undefined;
  const score = (g: Gear19) => (a && GEAR_META19[g.id]?.genres.includes(a.genre) ? 4 : 0) + (fam && g.fam.includes(fam) ? 2 : 0) + (s.year - g.from < 15 ? 1 : 0);
  const best = Math.max(...pool.map(score));
  const top = pool.filter((g) => score(g) >= best - 1);
  const g = top[hashString(`${s.config.seed}|g19|${pid}`) % top.length];
  st.main[pid] = g.id;
  return g;
}
/** Quem do ato pode endossar (instrumentistas vivos). */
export const players19 = (s: GameState, a: Act): Person[] => a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive && !!SUBS[p.role]);

// ---------------------------------------------------------------- endosso e modelo-assinatura

/** Cachê anual pela fama e época, com o porquê. */
export function endFee19(s: GameState, a: Act): { v: number; parts: WhyPart[] } {
  const base = 2000 + a.fame * a.fame * 6;
  const era = s.year < 1960 ? 0.6 : s.year < 1980 ? 0.85 : s.year < 2000 ? 1.1 : s.year < 2015 ? 0.9 : 0.75;
  const v = money(s, base * era);
  return { v, parts: [{ label: F(l('Fama {f}: base', 'Fame {f}: base'), { f: Math.round(a.fame) }), value: money(s, base), fmt: 'money' }, { label: l('Mercado de endosso da época', 'Era endorsement market'), value: era, fmt: 'mult', why: undefined },
    { label: l('Comissão do selo (20%, ou a fatia 360 se maior)', 'Label commission (20%, or the 360 share if larger)'), value: commission19(s, a), fmt: 'mult' }] };
}
export function commission19(s: GameState, a: Act): number {
  if (a.playerBand) return 1;
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  return Math.max(0.2, c?.share360 ?? 0);
}
export function endBlock19(s: GameState, a: Act, pid: string): L | null {
  if (s.year < ENDORSE_FROM19) return F(l('Endossos de instrumento começam por volta de {y}.', 'Instrument endorsements start around {y}.'), { y: ENDORSE_FROM19 });
  if (!mine(a)) return l('Só artistas do seu elenco.', 'Only your own roster.');
  if (histLocked(s, a)) return l('História exata: endossos reais só como aconteceram.', 'Exact history: real endorsements only as they happened.');
  if (g19(s).end[pid] && g19(s).end[pid].until > s.week) return l('Já tem endosso em vigor.', 'Already has an endorsement.');
  if (!mainGear19(s, pid)) return l('Sem instrumento de fabricante para essa função.', 'No maker instrument for this role.');
  return null;
}
/** Fecha o endosso (3 anos). */
export function endorse19(s: GameState, pid: string): L | null {
  const a = Object.values(s.acts).find((x) => x.members.includes(pid));
  if (!a) return l('Sem ato.', 'No act.');
  const b = endBlock19(s, a, pid);
  if (b) return b;
  const g = mainGear19(s, pid)!;
  const fee = endFee19(s, a).v;
  const e: End19 = { pid, act: a.id, maker: g.maker, gear: g.id, fee, from: s.week, until: s.week + 156, paid: 0 };
  g19(s).end[pid] = e;
  payYear(s, e);
  const p = s.persons[pid];
  const t = F(l('{p} ({a}) assina endosso com {m}: toca {g} em todo palco.', '{p} ({a}) signs an endorsement with {m}: plays the {g} on every stage.'), { p: p?.name ?? '?', a: a.name, m: makerName19(s, g.maker), g: gearName19(s, g) });
  emitFact(s, { kind: 'gear_endorse', actors: [a.id, pid], place: a.city, severity: clamp(20 + a.fame / 4, 20, 45), visibility: 'public', tags: ['gear', 'endorse'], text: t, src: 'gear19', data: { pid, gear: g.id } });
  return null;
}
function payYear(s: GameState, e: End19): void {
  const a = s.acts[e.act];
  if (!a) return;
  const owned = !!g19(s).mk[e.maker];
  const cut = Math.round(e.fee * commission19(s, a));
  if (owned) { e.paid += e.fee; return; } // a fábrica é sua: o cachê sai de um bolso e entra no outro
  if (cut > 0) post(s, `g19end:${e.pid}:${s.year}`, cut, 'brands', `Endosso de instrumento: ${a.name}`);
  e.paid += e.fee;
}
/** Pedir modelo-assinatura (estrelas, 1952+). */
export function sigOdds19(s: GameState, a: Act): { p: number; why: L[] } {
  const why: L[] = [];
  if (s.year < SIG_FROM19) return { p: 0, why: [F(l('Modelos-assinatura começam em {y} (a Les Paul).', 'Signature models start in {y} (the Les Paul).'), { y: SIG_FROM19 })] };
  let p = clamp((a.fame - 50) / 40, 0, 0.9);
  why.push(F(l('Fama {f}: {p}%', 'Fame {f}: {p}%'), { f: Math.round(a.fame), p: Math.round(p * 100) }));
  if (a.number1s) { p += 0.1; why.push(l('Tem nº 1 (+10%)', 'Has a No. 1 (+10%)')); }
  if (a.legend) { p += 0.15; why.push(l('Lenda (+15%)', 'Legend (+15%)')); }
  return { p: clamp(p, 0, 0.95), why };
}
export function signature19(s: GameState, pid: string, r: Rng, force = false): L | null {
  const a = Object.values(s.acts).find((x) => x.members.includes(pid));
  const g = mainGear19(s, pid);
  if (!a || !g) return l('Sem instrumento.', 'No instrument.');
  if (g19(s).sig[pid]) return l('Já tem modelo-assinatura.', 'Already has a signature model.');
  const od = sigOdds19(s, a);
  if (!force && !r.chance(od.p)) return F(l('{m} achou cedo demais para um modelo com o nome de {p}.', '{m} thinks it is too early for a model named after {p}.'), { m: makerName19(s, g.maker), p: s.persons[pid]?.name ?? '?' });
  const sg: Sig19 = { pid, act: a.id, maker: g.maker, gear: g.id, y: s.year, units: 0, earned: 0 };
  g19(s).sig[pid] = sg;
  const t = F(l('Sai o modelo-assinatura de {p}: {g} "{n}".', '{p}\'s signature model is out: {g} "{n}".'), { p: s.persons[pid]?.name ?? '?', g: gearName19(s, g), n: s.persons[pid]?.name.split(' ').slice(-1)[0] ?? '' });
  emitFact(s, { kind: 'signature_model', actors: [a.id, pid], place: a.city, severity: clamp(25 + a.fame / 3, 25, 60), visibility: 'public', tags: ['gear', 'signature'], text: t, src: 'gear19', data: { pid, gear: g.id } });
  return null;
}
/** Unidades vendidas por mês do modelo-assinatura (fama, época, morte do dono). */
export function sigUnits19(s: GameState, sg: Sig19): number {
  const a = s.acts[sg.act];
  if (!a) return 0;
  const era = s.year < 1965 ? 0.5 : s.year < 1990 ? 1 : s.year < 2010 ? 1.2 : 0.9;
  return Math.round(Math.max(0, a.fame - 35) * 6 * era * ((sg.boost ?? 0) > s.week ? 2 : 1));
}
const SIG_PRICE = 900; // dólares por unidade (preço de loja), royalty 5% ao artista

// ---------------------------------------------------------------- instrumento-ícone → relíquia → herdeiros

const NICK: [string, string][] = [['Rainha', 'Queenie'], ['Fênix', 'Phoenix'], ['Cicatriz', 'Scar'], ['Meia-Noite', 'Midnight'], ['Ferrugem', 'Rusty'], ['Estrela', 'Star'], ['Velha Senhora', 'Old Lady'], ['Trovão', 'Thunder'], ['Corvo', 'Raven'], ['Sorte', 'Lucky']];
export function iconize19(s: GameState, pid: string): string | null {
  const st = g19(s);
  if (st.icon[pid]) return st.icon[pid];
  const p = s.persons[pid], a = Object.values(s.acts).find((x) => x.members.includes(pid)), g = mainGear19(s, pid);
  if (!p || !a || !g) return null;
  const nk = NICK[hashString(`${s.config.seed}|nick|${pid}`) % NICK.length];
  const n = F(l('"{k}" — {g} de {p}', '"{k}" — {p}\'s {g}'), { k: l(nk[0], nk[1]), g: gearName19(s, g), p: p.name });
  const rl = addRelic(s, RELIC_OF[p.role] ?? 'guitar', n, a.id, pid, 30000 + a.fame * 2000);
  Object.assign(relMeta(rl), { o: 'icon', b: rl.v, st: F(l('O instrumento gasto de tanto palco, com apelido próprio; os fãs reconhecem pelo som.', 'The stage-worn instrument with its own nickname; fans know it by its sound.'), {}) });
  st.icon[pid] = rl.id;
  emitFact(s, { kind: 'icon_instrument', actors: [a.id, pid], place: a.city, severity: clamp(30 + a.fame / 3, 30, 65), visibility: 'public', tags: ['gear', 'relic', 'icon'], text: F(l('O instrumento de {p} vira ícone: {n}.', '{p}\'s instrument becomes an icon: {n}.'), { p: p.name, n }), src: 'gear19', data: { pid, relic: rl.id } });
  return rl.id;
}
ORIGIN18.icon ??= l('Instrumento-ícone', 'Icon instrument');

/** Morte do dono: herdeiros decidem — leilão (faturar), museu (guardiões) e, com os dois na família, justiça. */
export function inherit19(s: GameState, pid: string, r: Rng): 'auction' | 'museum' | null {
  const id = g19(s).icon[pid];
  const rl = id ? relics(s).list.find((x) => x.id === id) : undefined;
  const e = estate18(s, pid);
  if (!rl || !e || rl.st !== 'kept' || g19(s).seen[`inh:${pid}`]) return null;
  g19(s).seen[`inh:${pid}`] = 1;
  const cash = e.heirs.filter((h) => h.st === 'cash').length, guard = e.heirs.filter((h) => h.st === 'guard').length;
  const heir = e.heirs[0]?.name ?? '?';
  rl.own.push([heir, s.year, 'herança']);
  rl.v = Math.round(rl.v * 1.4);
  const a = rl.a ? s.acts[rl.a] : undefined;
  if (cash >= guard) {
    rl.st = 'auction'; rl.au = s.week + 13;
    emitFact(s, { kind: 'relic', actors: a ? [a.id] : [], place: a?.city, severity: 50, visibility: 'public', tags: ['relic', 'auction', 'icon'], text: F(l('Herdeiros de {p} leiloam {n}.', '{p}\'s heirs auction {n}.'), { p: s.persons[pid]?.name ?? '?', n: rl.n }), src: 'gear19', data: { relic: rl.id } });
    if (guard && r.chance(0.6)) suit19(s, pid, 'relic'); // os guardiões não aceitam a venda
    return 'auction';
  }
  rl.st = 'museum'; rl.own.push([l('Museu do Som', 'Sound Museum').pt, s.year, 'empréstimo']);
  emitFact(s, { kind: 'relic', actors: a ? [a.id] : [], place: a?.city, severity: 40, visibility: 'public', tags: ['relic', 'museum', 'icon'], text: F(l('Família de {p} empresta {n} a um museu.', '{p}\'s family lends {n} to a museum.'), { p: s.persons[pid]?.name ?? '?', n: rl.n }), src: 'gear19', data: { relic: rl.id } });
  return 'museum';
}

// ---------------------------------------------------------------- fabricante como empresa (deals18)

export interface Maker19 { id: string; models: number; since: number }
export function makers19(s: GameState): Maker19[] {
  const m: Record<string, Maker19> = {};
  for (const g of gearNow19(s.year)) { if (!g.maker) continue; const x = (m[g.maker] ??= { id: g.maker, models: 0, since: g.from }); x.models++; x.since = Math.min(x.since, g.from); }
  return Object.values(m).filter((x) => x.models >= 2).sort((a, b) => b.models - a.models);
}
export const makerPrice19 = (s: GameState, mk: Maker19): number => money(s, 350000 + mk.models * 220000 + Math.max(0, s.year - mk.since) * 6000);
export function buyMaker19(s: GameState, id: string): L | null {
  const mk = makers19(s).find((x) => x.id === id);
  if (!mk) return l('Fabricante indisponível.', 'Maker unavailable.');
  if (g19(s).mk[id]) return l('Já é seu.', 'Already yours.');
  const c = makerPrice19(s, mk);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `venture:g19mk:${id}`, -c, 'acquisitions', `Compra do fabricante ${makerName19(s, id)}`);
  g19(s).mk[id] = s.year;
  const t = F(l('{c} compra o fabricante {m} por {v}.', '{c} buys instrument maker {m} for {v}.'), { c: s.config.companyName, m: makerName19(s, id), v: $k(c) });
  deals18(s).log.unshift({ w: s.week, t });
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 40, visibility: 'public', tags: ['gear', 'maker', 'acquisition'], text: t, src: 'gear19' });
  log(s, t);
  return null;
}
export function sellMaker19(s: GameState, id: string): L | null {
  const mk = makers19(s).find((x) => x.id === id);
  if (!mk || !g19(s).mk[id]) return l('Não é seu.', 'Not yours.');
  const v = Math.round(makerPrice19(s, mk) * 0.9);
  post(s, `venture:g19mksell:${id}`, v, 'asset_sales', `Venda do fabricante ${makerName19(s, id)}`);
  delete g19(s).mk[id];
  const t = F(l('{c} vende o fabricante {m} por {v}.', '{c} sells instrument maker {m} for {v}.'), { c: s.config.companyName, m: makerName19(s, id), v: $k(v) });
  deals18(s).log.unshift({ w: s.week, t }); log(s, t);
  return null;
}
/** Dividendo anual do fabricante: modelos × época (o mercado de instrumentos encolhe depois de 2008). */
export const makerDiv19 = (s: GameState, id: string): number => { const mk = makers19(s).find((x) => x.id === id); return mk ? Math.round(makerPrice19(s, mk) * (s.year >= 2008 ? 0.05 : 0.075)) : 0; };

// ---------------------------------------------------------------- som da era → dimensões do disco

/** Equipamento que define o som do ano (lançado nos últimos 10 anos, mais gêneros atendidos). */
export function eraSound19(y: number): Gear19[] {
  return GEAR19.filter((g) => g.from <= y && g.from >= y - 10 && ['synth', 'drum_machine', 'sampler', 'guitar', 'daw', 'effect'].includes(g.kind)).sort((a, b) => (GEAR_META19[b.id]?.genres.length ?? 0) - (GEAR_META19[a.id]?.genres.length ?? 0) || b.from - a.from).slice(0, 4);
}
registerDimAdj18('gear19', (s, _rel, act) => {
  const out: { d: Dim18; v: number; why: L }[] = [];
  const st = (s.x4 as unknown as { g19?: G19 }).g19;
  if (!st) return out;
  let tot = 0;
  for (const pid of act.members) {
    if (tot >= 3) break;
    const gid = st.main[pid];
    const meta = gid ? GEAR_META19[gid] : undefined;
    if (!meta || !meta.genres.includes(act.genre)) continue;
    const v = st.sig[pid] || st.icon[pid] ? 2 : 1;
    out.push({ d: meta.dims[0], v, why: F(l('Timbre do instrumento ({g})', 'Instrument tone ({g})'), { g: gearName19(s, gearById19(gid!)) }) });
    tot += v;
  }
  if (tot > 0 && eraSound19(s.year).some((g) => GEAR_META19[g.id]?.genres.includes(act.genre))) out.push({ d: 'orig', v: 1, why: l('No som da era (equipamento novo do gênero)', 'In the era\'s sound (the genre\'s new gear)') });
  return out;
});

// ---------------------------------------------------------------- ouvintes

onFact('gear_endorse', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  a.positioning = clamp(a.positioning + 3, 0, 100); // imagem mais pop
  a.fans.casual += Math.round(a.fame * 20);
  const fa = fan18(s, a.id, false);
  if (fa && fa.fac[0] / Math.max(1, fa.fac.reduce((t, x) => t + x, 0)) > 0.3) fa.loy = clamp(fa.loy - 1, 0, 100); // puristas: "vendeu a guitarra"
  log(s, f.text); link(s, f.text);
}, 'gear19:image');
onFact('gear_endorse', (s, f) => { const e = g19(s).end[String(f.data?.pid ?? '')]; if (e && f.severity >= 40) headline19(s, f.text, 1); }, 'gear19:ledger');
onFact('signature_model', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  a.fame = clamp(a.fame + 1, 0, 100);
  deals18(s).log.unshift({ w: s.week, t: f.text });
  headline19(s, f.text, 2); log(s, f.text); link(s, f.text);
}, 'gear19:deals');
onFact('icon_instrument', (s, f) => {
  const pid = String(f.data?.pid ?? '');
  const sg = g19(s).sig[pid];
  if (sg) sg.boost = Math.max(sg.boost ?? 0, s.week + 26); // fãs querem "a" guitarra
  const p = s.persons[pid];
  if (p && !p.alive) { const e = post18(s).est[pid]; if (e) e.legacy = clamp(e.legacy + 3, 0, 100); }
  headline19(s, f.text, 2); log(s, f.text); link(s, f.text);
}, 'gear19:relic');
onFact('death', (s, f) => {
  const r = rr(s, 'death');
  for (const id of f.actors) {
    const a = s.acts[id];
    if (!a) continue;
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p || p.alive) continue;
      const sg = g19(s).sig[pid];
      if (sg && (sg.boost ?? 0) < s.week + 40) { sg.boost = s.week + 52; log(s, F(l('Morte de {p}: o modelo-assinatura esgota nas lojas.', '{p}\'s death: the signature model sells out.'), { p: p.name })); }
      if (g19(s).icon[pid]) { est19(s, pid); inherit19(s, pid, r); }
    }
  }
}, 'gear19:death');

// ---------------------------------------------------------------- mês e ano

registerSimHook('month', 'gear19', (s) => {
  if (s.year < ENDORSE_FROM19) return;
  const st = g19(s);
  const r = rr(s, 'm');
  // modelos-assinatura: royalty mensal (o selo fica com a comissão; fábrica sua = margem cheia)
  for (const sg of Object.values(st.sig)) {
    const a = s.acts[sg.act];
    if (!a) continue;
    const u = sigUnits19(s, sg);
    sg.units += u;
    const roy = money(s, u * SIG_PRICE * (st.mk[sg.maker] ? 0.2 : 0.05));
    const cut = Math.round(roy * (st.mk[sg.maker] ? 1 : commission19(s, a)));
    if (cut > 0 && mine(a)) post(s, `g19sig:${sg.pid}:${s.week}`, cut, 'brands', `Modelo-assinatura: ${a.name}`);
    sg.earned += roy;
  }
  // endossos: renovação anual do cachê e fim
  for (const e of Object.values(st.end)) {
    if (e.until <= s.week) continue;
    if (e.paid < (Math.floor((s.week - e.from) / 52) + 1) * e.fee) payYear(s, e);
  }
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || histLocked(s, a)) continue;
    for (const p of players19(s, a)) {
      // ícone: hits + fama
      if (!st.icon[p.id] && a.fame >= 55 && (a.number1s >= 1 || a.hits >= 3) && (st.end[p.id] || st.sig[p.id] || a.fame >= 70)) iconize19(s, p.id);
      if (a.fame < 40 || (st.offW[p.id] ?? -999) > s.week - 78 || endBlock19(s, a, p.id)) continue;
      if (!r.chance(0.03 * (a.fame / 60))) continue;
      st.offW[p.id] = s.week;
      const g = mainGear19(s, p.id)!;
      const fee = endFee19(s, a).v;
      const sigOk = s.year >= SIG_FROM19 && a.fame >= 62;
      pushInbox18(s, 'gear19_offer', { from: makerName19(s, g.maker), subject: F(l('{m} quer {p} como endossante', '{m} wants {p} as an endorser'), { m: makerName19(s, g.maker), p: p.name }),
        body: F(l('Cachê de {v}/ano por 3 anos para {p} ({a}) tocar {g} em shows, clipes e fotos. O selo fica com {c}%. Imagem mais pop: fãs casuais gostam, puristas desconfiam.{x}', '{v}/year for 3 years for {p} ({a}) to play the {g} at shows, in videos and photos. The label keeps {c}%. A more mainstream image: casual fans like it, purists are wary.{x}'),
          { v: $k(fee), p: p.name, a: a.name, g: gearName19(s, g), c: Math.round(commission19(s, a) * 100), x: sigOk ? l(' Dá para pedir um modelo-assinatura.', ' You can ask for a signature model.') : '' }),
        ref: { pid: p.id, act: a.id }, actions: [{ id: 'yes', label: l('Aceitar o endosso', 'Accept the endorsement') }, ...(sigOk ? [{ id: 'sig', label: l('Exigir modelo-assinatura', 'Demand a signature model') }] : []), { id: 'no', label: l('Recusar (credibilidade)', 'Decline (credibility)') }], weeks: 6 });
    }
  }
});
registerSimHook('year', 'gear19', (s) => {
  for (const id of Object.keys(g19(s).mk)) { const d = makerDiv19(s, id); if (d > 0) post(s, `g19div:${id}:${s.year}`, d, 'brands', `Dividendos do fabricante ${makerName19(s, id)}`); }
});

// ---------------------------------------------------------------- caixa, ecos, calendário, porquês, dicas, ligações

registerInboxKind('gear19_offer', { label: l('Endosso de instrumento', 'Instrument endorsement'), cat: 'deals', icon: 'guitar', prio: 1, goto: () => ({ area: 'creation', tab: ['creation', 'gear19'] }),
  handle: (s, m, act, r) => {
    const pid = String(m.ref?.pid ?? '');
    if (act === 'no') { s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100); return l('Recusado. A crítica gosta de quem não vira vitrine.', 'Declined. Critics like those who do not become a shop window.'); }
    const e = endorse19(s, pid);
    if (e) return e;
    if (act === 'sig') return signature19(s, pid, r) ?? l('Endosso fechado e modelo-assinatura aprovado!', 'Endorsement signed and signature model approved!');
    return l('Endosso fechado por 3 anos.', 'Endorsement signed for 3 years.');
  } });
registerConseq18('ib:gear19_offer:yes', { now: l('Cachê anual; imagem mais pop.', 'Annual fee; a more mainstream image.'), later: [{ in: [6, 20], p: 0.3, tone: 'mixed', hint: l('Quem vira garoto-propaganda é cobrado pelos fãs antigos.', 'Becoming a poster boy draws flak from old fans.'),
  fx: (f) => { f.fans(2).rep('artistic', -1); return l('Revista especializada ironiza o "guitarrista de catálogo", mas o público jovem chega.', 'A trade magazine mocks the "catalog guitarist", but young fans arrive.'); } }] });
registerConseq18('ib:gear19_offer:sig', { odds: (s, c) => { const a = s.acts[String(c.act)]; return a ? sigOdds19(s, a) : { p: 0, why: [] }; }, later: [{ in: [8, 24], p: 0.45, tone: 'good', hint: l('Um instrumento com o seu nome pode virar lenda.', 'An instrument with your name on it can become a legend.'),
  fx: (f) => { f.fame(2).trust(3); return l('O modelo-assinatura esgota no Natal: o nome do artista está em todas as vitrines.', 'The signature model sells out at Christmas: the artist\'s name is in every shop window.'); } }] });
registerConseq18('ib:gear19_offer:no', { later: [{ in: [4, 14], p: 0.35, tone: 'good', hint: l('Recusar dinheiro fácil às vezes rende respeito.', 'Turning down easy money sometimes earns respect.'),
  fx: (f) => { f.rep('artistic', 2).trust(2); return l('O artista conta numa entrevista que recusou o fabricante: "toco o que soa bem".', 'The artist tells an interviewer they turned the maker down: "I play what sounds right".'); } }] });
registerDeadline('gear19', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const e of Object.values(g19(s).end)) if (e.until >= from && e.until <= to && mine(s.acts[e.act])) out.push({ id: `gear19:${e.pid}`, w: e.until, kind: 'contract', t: F(l('Fim do endosso de {p} ({m})', 'End of {p}\'s endorsement ({m})'), { p: s.persons[e.pid]?.name ?? '?', m: makerName19(s, e.maker) }), goto: { area: 'creation', tab: ['creation', 'gear19'] } });
  return out;
});
registerExplain('gear19.fee', (s, c) => {
  const a = s.acts[String(c.act)];
  if (!a) return null;
  const f = endFee19(s, a);
  return { title: F(l('Cachê de endosso: {a}', 'Endorsement fee: {a}'), { a: a.name }), value: f.v, fmt: 'money', parts: f.parts, note: l('Base pela fama ao quadrado × mercado da época (auge 1980–2000). O selo fica com a comissão; fabricante seu = sem cachê, margem cheia no modelo-assinatura.', 'Base by fame squared × era market (peak 1980–2000). The label keeps the commission; owning the maker = no fee, full margin on the signature model.') };
});
registerAdvisorTip('gear19', (s) => {
  const out = [];
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.fame < 60 || s.year < SIG_FROM19) continue;
    for (const p of players19(s, a)) if (g19(s).end[p.id] && !g19(s).sig[p.id]) { out.push({ id: `gear19-sig-${p.id}`, level: 'info' as const, cat: 'opportunity' as const, text: F(l('{p} já pode ter um modelo-assinatura.', '{p} could have a signature model.'), { p: p.name }), why: sigOdds19(s, a).why, goto: { area: 'creation', tab: ['creation', 'gear19'] as [string, string] } }); break; }
  }
  return out.slice(0, 2);
});
const G_LINK = { id: 'gear19', a: l('Equipamento e endossos', 'Gear and endorsements'), b: l('Relíquias, herdeiros e som do disco', 'Relics, heirs and record sound'), how: l('O instrumento do hit vira ícone e relíquia; na morte, herdeiros leiloam ou emprestam ao museu (e brigam); o timbre soma no disco.', 'The hit instrument becomes an icon and relic; at death heirs auction it or lend it to a museum (and fight); its tone adds to the record.') };
if (!LINKS18.some((x) => x.id === G_LINK.id)) LINKS18.push(G_LINK);
LINK18_PARTS.gear19 = (s) => {
  const st = g19(s);
  return [{ label: l('Endossos ativos', 'Active endorsements'), value: Object.values(st.end).filter((e) => e.until > s.week).length, fmt: 'num' }, { label: l('Modelos-assinatura', 'Signature models'), value: Object.keys(st.sig).length, fmt: 'num' }, { label: l('Instrumentos-ícone', 'Icon instruments'), value: Object.keys(st.icon).length, fmt: 'num' }];
};

/** Estúdios reais da época com o equipamento da casa (só o que já foi lançado). */
export function studioKits19(s: GameState): { id: string; name: string; gear: Gear19[]; dims: Dim18[] }[] {
  return STUDIOS19.filter((x) => x.from <= s.year && (!x.to || x.to >= s.year) && (s.config.realNames || x.exact !== false) && STUDIO_KIT19[x.id])
    .map((x) => ({ id: x.id, name: x.name, gear: STUDIO_KIT19[x.id].gear.map(gearById19).filter((g): g is Gear19 => !!g && g.from <= s.year), dims: STUDIO_KIT19[x.id].dims }));
}
export const iconOf19 = (s: GameState, pid: string) => { const id = g19(s).icon[pid]; return id ? relics(s).list.find((x) => x.id === id) : undefined; };
export const notifyGear19 = (s: GameState, t: L) => notify(s, t, 'info');
