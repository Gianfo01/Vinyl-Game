// Rodada 17 — SEXUALIDADE para todos (jogador, elenco, NPCs). Orientação derivada do id (hash, nunca o Rng
// compartilhado); vida pública assumida ou no armário conforme a aceitação do país na época (data/sex17).
// Ligações: fama regional (fame16) e público de shows por país/época (cityDemand), apelo no mercado de casa,
// júri nacional (awards15), propostas (dono assumido / aliado; artista religioso estrito), estresse do armário
// (stress17), segredo como obrigação (holds17: quem sabe pode expor), exposição pelo pipeline de escândalo
// (scandal17: reação por religião/censura/imprensa do país) e situações do diretor (sair do armário, casamento
// de fachada). Pessoas reais: só o que é publicamente documentado (REAL_SEX17); o resto fica "não declarado"
// e nunca entra em sorteio de exposição.

import { clamp, hashString, Rng } from '../../core/rng';
import { ACCEPT17, ACCEPT17_MKT, CRIM17, MARRIAGE17, REAL_SEX17, type Orient17 } from '../../data/sex17';
import { countryInfoByA3 } from '../../data/countries';
import { countryName, countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { isStrict, viewsOf } from '../beliefs';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { grantHold, holds17, registerHoldEffect } from '../holds17';
import { scandal, scandalReaction } from '../scandal17';
import { addStress, relieveLong } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { juryMemHook } from './awards15';
import { f16 } from './fame16';
import { per13 } from './persona13';
import { registerSituation, type SitOption } from './situations17';

export type { Orient17 };
export type Closet17 = 'out' | 'closet' | 'private' | 'na';
export const ORIENT17: Record<Orient17 | 'private', L> = {
  het: l('Heterossexual', 'Heterosexual'), gay: l('Gay / lésbica', 'Gay / lesbian'), bi: l('Bissexual', 'Bisexual'), ace: l('Assexual', 'Asexual'),
  private: l('Não declarada', 'Undisclosed'),
};
export const CLOSET17: Record<Closet17, L> = {
  out: l('assumido(a)', 'out'), closet: l('no armário', 'in the closet'), private: l('vida privada', 'private life'), na: l('—', '—'),
};

export interface Sx17Rec { c?: 'out'; w?: number; outed?: 1; lav?: { name: string; w: number }; ally?: number }
export interface Sex17State { p: Record<string, Sx17Rec>; seen: Record<string, 1>; log: [number, string, L][] }
declare module '../ext4' { interface Ext4 { sex17: Sex17State } }
const fresh = (): Sex17State => ({ p: {}, seen: {}, log: [] });
registerExt4('sex17', fresh);
export function sx17(s: GameState): Sex17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.sex17 ??= fresh()) as Sex17State;
  st.p ??= {}; st.seen ??= {}; st.log ??= [];
  return st;
}
const log17 = (s: GameState, id: string, t: L) => { const L0 = sx17(s).log; L0.unshift([s.year, id, t]); if (L0.length > 30) L0.length = 30; };

// ---------------------------------------------------------------- aceitação por país e época

const step = (tab: [number, number][], y: number): number => { let v = tab[0][1]; for (const [yy, x] of tab) if (yy <= y) v = x; else break; return v; };
const marketOf = (a3: string | null, cityId?: string): MarketId => ((a3 && countryInfoByA3[a3]?.market) || (cityId && cityById[cityId]?.market) || 'na') as MarketId;
/** Aceitação social de pessoas LGBT (0..1) no país (a3) ou mercado, no ano. */
export function acceptance(a3: string | null, year: number, cityId?: string): number {
  if (a3 && ACCEPT17[a3]) return step(ACCEPT17[a3], year);
  return step(ACCEPT17_MKT[marketOf(a3, cityId)] ?? ACCEPT17_MKT.na, year);
}
export const acceptAtCity = (s: GameState, cityId: string): number => acceptance(countryOfCity(cityId), s.year, cityId);
/** Lei (criminalização ou "propaganda") contra pessoas LGBT vigente. */
export function criminalized(a3: string | null, year: number): boolean {
  return !!a3 && (CRIM17[a3] ?? []).some(([a, b]) => year >= a && (b === undefined || year < b));
}
export const marriageLegal = (a3: string | null, year: number): boolean => !!a3 && (MARRIAGE17[a3] ?? 9999) <= year;
/** Texto curto do clima no país (interface e dicas). */
export function climate17(a3: string | null, year: number, cityId?: string): L {
  const a = acceptance(a3, year, cityId);
  const cn = a3 ? countryName(a3) : l('o mercado', 'the market');
  const base = a < 0.12 ? l('hostil', 'hostile') : a < 0.3 ? l('preconceituoso', 'prejudiced') : a < 0.5 ? l('dividido', 'divided') : a < 0.68 ? l('tolerante', 'tolerant') : l('acolhedor', 'welcoming');
  const extra = criminalized(a3, year) ? l(' — lei pune ou censura', ' — the law punishes or censors') : marriageLegal(a3, year) ? l(' — casamento igualitário em lei', ' — marriage equality in law') : l('', '');
  return fmtL(l('{c} em {y}: clima {b} ({p}% de aceitação){x}', '{c} in {y}: {b} climate ({p}% acceptance){x}'), { c: cn, y: year, b: base, p: Math.round(a * 100), x: extra });
}

// ---------------------------------------------------------------- orientação de cada pessoa

/** Pessoa real (catálogo histórico): só dados documentados. */
// índice por semana (pessoa → atos; ato → frente assumida): estas leituras rodam a cada cálculo de público
interface Ix17 { w: number; n: number; acts: Map<string, Act[]>; front: Map<string, boolean> }
const IX = new WeakMap<GameState, Ix17>();
function ix(s: GameState): Ix17 {
  let x = IX.get(s);
  const n = s.idSeq ?? 0;
  if (!x || x.w !== s.week || x.n !== n) {
    x = { w: s.week, n, acts: new Map(), front: new Map() };
    for (const a of Object.values(s.acts)) for (const m of a.members) { const l0 = x.acts.get(m); if (l0) l0.push(a); else x.acts.set(m, [a]); }
    IX.set(s, x);
  }
  return x;
}
/** Pessoa real (catálogo histórico): só dados documentados. */
export function isRealP(s: GameState, pid: string): boolean {
  return (ix(s).acts.get(pid) ?? []).some((a) => !!a.catalogNo);
}
const u01 = (s: GameState, pid: string, k: string): number => (hashString(`${s.config.seed}:sx17:${k}:${pid}`) % 10000) / 10000;
const actOf = (s: GameState, pid: string): Act | undefined => { let b: Act | undefined; for (const a of ix(s).acts.get(pid) ?? []) if (!b || a.fame > b.fame) b = a; return b; };
const homeOf = (s: GameState, pid: string): string => actOf(s, pid)?.city ?? s.config.homeCity;

export interface Sx17 { o: Orient17 | 'private'; c: Closet17; real?: boolean; note?: string; lav?: boolean; outed?: boolean }
/** Orientação e vida pública. 'player' ou id do personagem do jogador = escolha da ficha. */
export function sexOf(s: GameState, pid: string): Sx17 {
  const st = sx17(s);
  const p = s.persons[pid];
  if (pid === 'player' || p?.isPlayer) {
    const ch = s.config.character as (undefined | { orient?: Orient17; closet?: boolean });
    const o = ch?.orient ?? 'het';
    const r = st.p.player;
    if (o === 'het' || o === 'ace') return { o, c: 'na' };
    return { o, c: r?.c === 'out' || !ch?.closet ? 'out' : 'closet', lav: !!r?.lav, outed: !!r?.outed };
  }
  if (!p) return { o: 'private', c: 'private' };
  if (isRealP(s, pid)) {
    const d = REAL_SEX17[p.name];
    if (d && s.year >= d[1]) return { o: d[0], c: 'out', real: true, note: d[3], outed: !!d[2] };
    return { o: 'private', c: 'private', real: true };
  }
  const u = u01(s, pid, 'o');
  const o: Orient17 = u < 0.905 ? 'het' : u < 0.94 ? 'gay' : u < 0.99 ? 'bi' : 'ace';
  if (o === 'het' || o === 'ace') return { o, c: 'na' };
  const r = st.p[pid];
  if (r?.c === 'out') return { o, c: 'out', lav: !!r.lav, outed: !!r.outed };
  // armário: quanto mais aceito no país/época, mais gente vive abertamente (bissexuais um pouco menos)
  const acc = acceptAtCity(s, homeOf(s, pid));
  const out = u01(s, pid, 'c') < Math.pow(acc, o === 'bi' ? 1.5 : 1.25);
  return { o, c: out ? 'out' : 'closet', lav: !!r?.lav };
}
export const isQueer = (x: Sx17): boolean => x.o === 'gay' || x.o === 'bi';
export const orientName = (s: GameState, pid: string, x = sexOf(s, pid)): L => {
  if (x.o === 'gay') { const sx = per13(s, pid === 'player' ? 'player' : `p:${pid}`)?.sex; return sx === 'f' ? l('Lésbica', 'Lesbian') : sx === 'm' ? l('Gay', 'Gay') : l('Gay / lésbica', 'Gay / lesbian'); }
  return ORIENT17[x.o];
};
/** O que o JOGADOR sabe/vê: armário só aparece para seu elenco e para você. */
export function visibleSex(s: GameState, pid: string): Sx17 {
  const x = sexOf(s, pid);
  if (x.c !== 'closet') return x;
  const mine = pid === 'player' || s.persons[pid]?.isPlayer || playerActs(s).some((a) => s.acts[a]?.members.includes(pid));
  return mine ? x : { o: 'private', c: 'private' };
}

/** Membros assumidamente LGBT do ato (para efeitos públicos). */
export function outMembers(s: GameState, a: Act): string[] {
  return a.members.filter((m) => { const p = s.persons[m]; if (!p?.alive) return false; const x = sexOf(s, m); return isQueer(x) && x.c === 'out'; });
}
const frontOut = (s: GameState, a: Act): boolean => {
  const F0 = ix(s).front;
  let v = F0.get(a.id);
  if (v === undefined) { const om = outMembers(s, a); v = om.length > 0 && (a.members.length <= 2 || om.includes(a.leaderId ?? a.members[0]) || om.length * 2 >= a.members.length); F0.set(a.id, v); }
  return v;
};

// ---------------------------------------------------------------- efeitos públicos (fama regional, shows, júri, propostas)

/** Multiplicador de público para ato com frente assumida num país/época, com o porquê. */
export function outEffect(s: GameState, a: Act, cityId: string): { m: number; why: L } | null {
  if (!frontOut(s, a)) return null;
  const a3 = countryOfCity(cityId);
  const acc = acceptance(a3, s.year, cityId);
  let m = 0.78 + 0.27 * acc;
  let why = fmtL(l('Artista assumido(a): {c}.', 'Out artist: {c}.'), { c: climate17(a3, s.year, cityId) });
  if (criminalized(a3, s.year)) { m *= 0.7; why = fmtL(l('{w} Shows sob risco de proibição e protestos.', '{w} Shows risk bans and protests.'), { w: why }); }
  else if (acc >= 0.55 && s.year >= 1990) { m = 1 + (acc - 0.5) * 0.12; why = fmtL(l('{w} Comunidade LGBT e circuito do Orgulho lotam a casa.', '{w} The LGBT community and the Pride circuit pack the venue.'), { w: why }); }
  return Math.abs(m - 1) >= 0.005 ? { m, why } : null;
}
registerMod('cityDemand', 'sex17', (s, v, c) => { if (!c.act || !c.cityId) return null; const e = outEffect(s, c.act, c.cityId); return e ? { value: v * e.m, label: e.why } : null; });
registerMod('appeal', 'sex17', (s, v, c) => {
  if (!c.act) return null;
  const e = outEffect(s, c.act, c.act.city);
  if (!e) return null;
  // ícones pop/dance: a cena gay sempre abraçou disco, pop e eletrônica
  const icon = ['pop', 'electronic', 'disco', 'dance'].includes(familyOf(c.act.genre)) && s.year >= 1975 ? 1.02 : 1;
  const m = 1 + (e.m - 1) * 0.5;
  return { value: v * m * icon, label: icon > 1 ? fmtL(l('{w} Gênero com tradição de ícones LGBT (+2%).', '{w} Genre with a tradition of LGBT icons (+2%).'), { w: e.why }) : e.why };
});
{
  const prev = juryMemHook.f;
  juryMemHook.f = (s, actId, a3) => {
    let k = prev?.(s, actId, a3) ?? 1;
    const a = s.acts[actId];
    if (a && frontOut(s, a)) { const acc = acceptance(a3, s.year); k *= acc < 0.3 ? 0.88 : acc >= 0.6 && s.year >= 2012 ? 1.04 : 1; }
    return k;
  };
}
/** Dono do selo assumido / aliado: artistas LGBT se aproximam; religiosos estritos, nem tanto. */
registerOfferMod('sex17', (s, act) => {
  const me = sexOf(s, 'player');
  const ally = (sx17(s).p.player?.ally ?? 0) >= s.year - 6;
  if (!(isQueer(me) && me.c === 'out') && !ally) return null;
  const queer = act.members.some((m) => { const x = sexOf(s, m); return isQueer(x) && x.c === 'out'; });
  if (queer) return { delta: 0.04, reason: isQueer(me) && me.c === 'out' ? l('Artista se sente seguro(a) com um(a) dono(a) assumido(a) no selo.', 'The act feels safe with an openly LGBT label owner.') : l('Seu apoio público à causa LGBT pesa a favor.', 'Your public support for LGBT rights counts in your favor.') };
  const f = s.persons[act.leaderId ?? act.members[0]];
  if (f && isStrict(viewsOf(s, f.id)) && acceptAtCity(s, act.city) < 0.6) return { delta: -0.03, reason: l('Artista religioso(a) conservador(a) desconfia da sua posição.', 'A conservative religious artist distrusts your stance.') };
  return null;
});

// ---------------------------------------------------------------- sair do armário, ser exposto(a), casamento de fachada

function nudgeFame(s: GameState, a: Act, a3: string | null, d: number): void {
  if (!a3) return;
  const fx = f16(s);
  const x = (fx.d[a.id] ??= {});
  x[a3] = clamp((x[a3] ?? 0) + d, -40, 40);
}
/** Sai do armário (por vontade ou exposto). Devolve o texto do desfecho. */
export function comeOut(s: GameState, pid: string, how: 'chose' | 'outed', by?: string): L {
  const st = sx17(s);
  const isPl = pid === 'player' || !!s.persons[pid]?.isPlayer;
  const key = isPl ? 'player' : pid;
  // pessoas reais nunca são expostas pelo jogo; só quem é LGBT pode "sair do armário"
  if (!isPl && isRealP(s, pid)) return l('Pessoa real: o jogo só usa o que é publicamente documentado.', 'Real person: the game only uses what is publicly documented.');
  if (!isQueer(sexOf(s, key))) return l('Nada a revelar.', 'Nothing to reveal.');
  const rec = (st.p[key] ??= {});
  if (rec.c === 'out') return l('Já é público.', 'Already public.');
  rec.c = 'out'; rec.w = s.week; if (how === 'outed') rec.outed = 1;
  IX.delete(s);
  const name = isPl ? (s.persons[Object.values(s.persons).find((p) => p.isPlayer)?.id ?? '']?.name ?? '?') : s.persons[pid]?.name ?? '?';
  const act = isPl ? undefined : actOf(s, pid);
  const city = act?.city ?? s.config.homeCity;
  const a3 = countryOfCity(city);
  const acc = acceptance(a3, s.year, city);
  // holds sobre esse segredo perdem o valor
  for (const h of holds17(s).h) if (h.status === 'open' && h.kind === 'secret' && h.target === key && h.src === 'sex17') h.status = 'void';
  let out: L;
  if (acc < 0.55) {
    const sev = Math.round((how === 'outed' ? 30 : 18) + (1 - acc) * (how === 'outed' ? 50 : 35));
    const text = how === 'outed'
      ? fmtL(l('{n} é exposto(a) como LGBT pela imprensa{b}.', '{n} is outed as LGBT by the press{b}.'), { n: name, b: by ? fmtL(l(' (vazado por {x})', ' (leaked by {x})'), { x: by }) : '' })
      : fmtL(l('{n} se assume publicamente LGBT.', '{n} comes out publicly as LGBT.'), { n: name });
    if (act) {
      const R = scandal(s, act.id, 'sex', sev, text, { person: pid, tags: ['outing'] });
      out = fmtL(l('{t} Reação: {e} ({w}).', '{t} Reaction: {e} ({w}).'), { t: text, e: R.eff, w: R.why.slice(0, 2).map((w) => w.pt).join('; ') });
    } else {
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - sev / 6, 0, 100);
      emitFact(s, { kind: how === 'outed' ? 'secret_exposed' : 'statement', actors: ['player'], place: city, severity: sev, visibility: 'public', tags: ['sex', 'outing', 'bad'], text, src: 'sex17' });
      out = fmtL(l('{t} Reputação institucional −{v} ({c}).', '{t} Institutional reputation −{v} ({c}).'), { t: text, v: Math.round(sev / 6), c: climate17(a3, s.year, city) });
    }
  } else {
    const text = how === 'outed'
      ? fmtL(l('{n} foi tirado(a) do armário pela imprensa — o público apoia {n} e critica o tabloide.', '{n} was outed by the press — the public backs {n} and slams the tabloid.'), { n: name })
      : fmtL(l('{n} se assume publicamente LGBT e recebe apoio dos fãs.', '{n} comes out publicly as LGBT and fans rally behind them.'), { n: name });
    emitFact(s, { kind: how === 'outed' ? 'secret_exposed' : 'statement', actors: [isPl ? 'player' : pid, ...(act ? [act.id] : [])], place: city, severity: 35, visibility: 'public', tags: ['sex', 'outing', 'good'], text, src: 'sex17' });
    if (act) { nudgeFame(s, act, a3, 2.5); act.fans.core = Math.round(act.fans.core * 1.05); }
    else s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
    out = text;
  }
  // tirar o peso do segredo; ser exposto(a) também machuca
  const p = isPl ? Object.values(s.persons).find((q) => q.isPlayer) : s.persons[pid];
  if (p) { addStress(s, p.id, how === 'outed' ? 14 : -18, how === 'outed' ? l('Exposto(a) sem consentimento', 'Outed without consent') : l('Alívio de não esconder mais', 'Relief of not hiding anymore')); if (how === 'chose') relieveLong(s, p.id, 12); }
  log17(s, key, out);
  if (act?.owner === 'player' || isPl) notify(s, out, acc < 0.55 ? 'bad' : 'good');
  return out;
}

/** Casamento de fachada ("lavanda"): protege do boato, custa caro e pesa por dentro. */
export function lavender(s: GameState, pid: string, r: Rng, partnerName?: string): L {
  const isPl = pid === 'player' || !!s.persons[pid]?.isPlayer;
  const key = isPl ? 'player' : pid;
  const rec = (sx17(s).p[key] ??= {});
  if (rec.lav) return l('Já existe um casamento de fachada.', 'There is already a lavender marriage.');
  const nm = partnerName ?? r.pick(['Ana', 'Lia', 'Marta', 'Joan', 'Claire', 'Rosa', 'Paul', 'Jack', 'Luis', 'Teo']) + ' ' + r.pick(['Reis', 'Moore', 'Silva', 'Hart', 'Costa', 'Lane']);
  rec.lav = { name: nm, w: s.week };
  const name = isPl ? l('Você', 'You').pt : s.persons[pid]?.name ?? '?';
  const t = fmtL(l('{n} se casa com {q}. Para a imprensa, um casal perfeito; por dentro, um acordo.', '{n} marries {q}. To the press, a perfect couple; inside, an arrangement.'), { n: name, q: nm });
  emitFact(s, { kind: 'marriage', actors: [key], place: homeOf(s, pid), severity: 25, visibility: 'public', tags: ['romance', 'lavender'], text: t, src: 'sex17', data: { lav: 1 } });
  // quem arranjou (empresário/selo) passa a saber
  grantHold(s, { holder: isPl ? 'lav:partner' : 'player', target: key, kind: 'secret', strength: 55, months: 240, src: 'sex17', text: fmtL(l('Sabe que o casamento de {n} é de fachada', 'Knows {n}\'s marriage is a front'), { n: name }) });
  log17(s, key, t);
  return t;
}

// segredo usado como "expor" → sai do armário à força
registerHoldEffect('sex17', (s, h, verb) => {
  if (verb !== 'expose') return null;
  const by = s.labels[h.holder]?.name ?? s.persons[h.holder]?.name;
  return comeOut(s, h.target === 'player' ? 'player' : h.target, 'outed', by);
});

// ---------------------------------------------------------------- mês: armário pesa, boatos, quem sabe, reais que se declaram

const notableActs = (s: GameState): Act[] => { const mine = new Set(playerActs(s)); return Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging') && (mine.has(a.id) || a.fame >= 25)); };
const filtered = (s: GameState) => s.config.contentFilters.includes('romance');

/** Risco mensal de exposição de quem está no armário (interface mostra). */
export function outingRisk(s: GameState, pid: string): number {
  const x = sexOf(s, pid);
  if (!isQueer(x) || x.c !== 'closet' || x.real) return 0;
  const isPl = pid === 'player' || !!s.persons[pid]?.isPlayer;
  const fame = isPl ? Math.max((s.x4 as unknown as { life?: { fame: number } }).life?.fame ?? 0, 10) : actOf(s, pid)?.fame ?? 0;
  const knowers = holds17(s).h.filter((h) => h.status === 'open' && h.kind === 'secret' && h.src === 'sex17' && h.target === (isPl ? 'player' : pid)).length;
  const acc = acceptAtCity(s, isPl ? s.config.homeCity : homeOf(s, pid));
  const tabloid = s.year >= 1950 ? 1 : 0.5;
  let p = (0.0015 + fame / 25000 + knowers * 0.0015) * tabloid * (1 + (1 - acc) * 0.6);
  const love = (s.x4 as unknown as { love17?: { ss?: number; affair?: { ss?: number } } }).love17;
  if (isPl && (love?.ss || love?.affair?.ss)) p += 0.004;
  if (x.lav) p *= 0.35;
  return clamp(p, 0, 0.05);
}

registerSimHook('month', 'sex17', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:sex17:${s.year}:${s.month}`);
  const st = sx17(s);
  // reais: declarações públicas documentadas no ano em que aconteceram
  if (s.config.realNames && s.month === 5) for (const a of Object.values(s.acts)) {
    if (!a.catalogNo) continue;
    for (const m of a.members) {
      const p = s.persons[m];
      const d = p && REAL_SEX17[p.name];
      if (!d || d[1] !== s.year || st.seen[m]) continue;
      st.seen[m] = 1;
      const t = fmtL(l('{n} fala publicamente sobre a própria sexualidade ({o}) — {w}.', '{n} speaks publicly about their sexuality ({o}) — {w}.'), { n: p.name, o: ORIENT17[d[0]], w: d[3] });
      emitFact(s, { kind: 'statement', actors: [m, a.id], place: a.city, severity: 40, visibility: 'public', tags: ['sex', 'outing', 'real'], text: t, src: 'sex17' });
      log17(s, m, t);
    }
  }
  if (filtered(s)) return;
  const me = sexOf(s, 'player');
  const pp = Object.values(s.persons).find((p) => p.isPlayer);
  if (pp && isQueer(me) && me.c === 'closet') {
    addStress(s, pp.id, 1.5, l('Esconder quem você é', 'Hiding who you are'));
    if (r.chance(outingRisk(s, 'player'))) comeOut(s, 'player', 'outed', r.chance(0.5) ? l('um tabloide', 'a tabloid').pt : undefined);
  }
  for (const a of notableActs(s)) for (const m of a.members) {
    const p = s.persons[m];
    if (!p?.alive || p.isPlayer) continue;
    const x = sexOf(s, m);
    if (!isQueer(x) || x.c !== 'closet' || x.real) continue;
    if (a.owner === 'player') addStress(s, m, 1.2 * (x.lav ? 1.4 : 1), l('Vive no armário', 'Living in the closet'));
    // quem sabe: rival que cava, ex, empresário
    if (!st.seen[m] && a.fame >= 35 && r.chance(0.08)) {
      st.seen[m] = 1;
      const rivals = Object.values(s.labels).filter((lb) => lb.active && lb.id !== a.owner);
      const lb = rivals.length ? r.pick(rivals) : undefined;
      if (lb) grantHold(s, { holder: lb.id, target: m, kind: 'secret', strength: 50, months: 120, proof: 1, src: 'sex17', text: fmtL(l('Sabe que {n} vive no armário', 'Knows {n} lives in the closet'), { n: p.name }) });
    }
    if (r.chance(outingRisk(s, m))) {
      const h = holds17(s).h.find((y) => y.status === 'open' && y.target === m && y.src === 'sex17' && s.labels[y.holder]);
      comeOut(s, m, 'outed', h ? s.labels[h.holder].name : undefined);
    }
  }
});

// ---------------------------------------------------------------- situações: sair do armário (seu elenco e NPCs)

const closeted = (s: GameState, mine: boolean): [Person, Act] | null => {
  for (const a of notableActs(s)) {
    if ((a.owner === 'player') !== mine) continue;
    for (const m of a.members) {
      const p = s.persons[m];
      if (!p?.alive || p.isPlayer) continue;
      const x = sexOf(s, m);
      if (isQueer(x) && x.c === 'closet' && !x.real && (mine ? a.fame >= 15 : a.fame >= 40)) return [p, a];
    }
  }
  return null;
};
const F = (P0: { facets: Record<string, number> } | null, k: string): number => (P0?.facets[k] ?? 50) / 50;
const OPTS = (mine: boolean): SitOption[] => [
  { id: 'out', label: l('Assumir publicamente', 'Come out publicly'),
    hint: l('Fim do peso do segredo (−18 estresse). Clima hostil = escândalo pelo pipeline (religião/censura/imprensa do país); clima acolhedor = +fãs núcleo e fama local.', 'The weight of the secret lifts (−18 stress). Hostile climate = scandal via the pipeline (country religion/censorship/press); welcoming = +core fans and local fame.'),
    weightByTraits: (P0) => F(P0, 'coragem') * 1.2 + F(P0, 'rebeldia') * 0.6,
    apply: (s, c) => comeOut(s, c.hero, 'chose') },
  { id: 'lav', label: l('Casamento de fachada', 'Lavender marriage'),
    hint: mine ? l('Custa $8.000 (era): risco de exposição ×0,35, mas o estresse do armário pesa 40% mais; quem arranjou guarda o segredo.', 'Costs $8,000 (era): outing risk ×0.35, but closet stress weighs 40% more; whoever arranged it keeps the secret.') : l('Protege a imagem; pesa por dentro.', 'Protects the image; weighs inside.'),
    weightByTraits: (P0, s) => F(P0, 'vaidade') + F(P0, 'ambicao') * 0.5 + (s.year < 1975 ? 1 : 0),
    apply: (s, c, r) => { if (mine) post(s, `lav17:${c.hero}`, -money(s, 8000), 'artist_dev', 'Casamento de fachada'); return lavender(s, c.hero, r); } },
  { id: 'closet', label: l('Continuar no armário', 'Stay in the closet'),
    hint: l('+10 estresse agora; o risco de exposição continua (aparece na ficha).', '+10 stress now; the outing risk stays (shown on the card).'),
    weightByTraits: (P0) => F(P0, 'ansiedade') + F(P0, 'paciencia') * 0.6,
    apply: (s, c) => { addStress(s, c.hero, 10, l('Decidiu continuar escondendo', 'Decided to keep hiding')); } },
];
for (const mine of [true, false]) registerSituation({
  id: mine ? 'comeout17' : 'comeout17n', pressure: 'heart', cost: mine ? 2 : 1, cooldown: mine ? 10 : 6, ...(mine ? { playerOnly: true } : { npcOnly: true }),
  when: (s) => !filtered(s) && !!closeted(s, mine),
  actorsPick: (s) => { const x = closeted(s, mine); return x ? { hero: x[0].id, act: x[1].id, cast: { person: x[0].id }, data: {} } : null; },
  title: (s, c) => fmtL(l('{p} pensa em sair do armário', '{p} is thinking of coming out'), { p: s.persons[c.hero]?.name ?? '?' }),
  text: (s, c) => {
    const a = s.acts[c.act!];
    const a3 = countryOfCity(a?.city ?? s.config.homeCity);
    const R = a ? scandalReaction(s, a, 'sex', 30) : null;
    return fmtL(l('{p} ({a}) confia a você: vive no armário e está cansado(a) de esconder. {c}. Se a imprensa descobrir antes, a reação estimada seria {e}/100 ({w}).',
      '{p} ({a}) confides in you: they live in the closet and are tired of hiding. {c}. If the press found out first, the estimated reaction would be {e}/100 ({w}).'),
      { p: s.persons[c.hero]?.name ?? '?', a: a?.name ?? '?', c: climate17(a3, s.year, a?.city), e: R ? Math.round(R.eff * 1.6) : '?', w: R?.why.slice(0, 2).map((w) => w.pt).join('; ') ?? '' });
  },
  options: OPTS(mine),
});

/** Ação do jogador: apoiar publicamente a causa LGBT (aliado). */
export function declareAlly(s: GameState): L {
  const rec = (sx17(s).p.player ??= {});
  if ((rec.ally ?? 0) >= s.year - 1) return l('Você já se posicionou recentemente.', 'You took a stand recently.');
  rec.ally = s.year;
  const a3 = countryOfCity(s.config.homeCity);
  const acc = acceptance(a3, s.year, s.config.homeCity);
  const d = acc < 0.35 ? -4 : acc < 0.55 ? -1 : 2;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + d, 0, 100);
  const t = fmtL(l('Você declara apoio público aos direitos LGBT. {c}. Reputação institucional {d}.', 'You publicly back LGBT rights. {c}. Institutional reputation {d}.'), { c: climate17(a3, s.year, s.config.homeCity), d: d > 0 ? `+${d}` : d });
  emitFact(s, { kind: 'statement', actors: ['player'], place: s.config.homeCity, severity: 30, visibility: 'public', tags: ['politics', 'lgbt', d < 0 ? 'bad' : 'good'], text: t, src: 'sex17' });
  for (const id of playerActs(s)) for (const m of s.acts[id]?.members ?? []) {
    const p = s.persons[m];
    if (!p) continue;
    const x = sexOf(s, m);
    if (isQueer(x)) p.morale = clamp(p.morale + 8, 0, 100);
    else if (isStrict(viewsOf(s, m))) p.resentment = clamp(p.resentment + 6, 0, 100);
  }
  log17(s, 'player', t);
  return t;
}
