// Rodada 17 — PIPELINE DE ESCÂNDALO. Substitui os `scandals++` espalhados: scandal() continua somando 1 ao
// contador do ato (mesmos números de antes), mas agora o escândalo tem tipo, gravidade, lugar e causa, vira um
// Fact e provoca uma REAÇÃO calculada (sem sorteio) pelo contexto:
//   · religião do país na época (beliefs: secularização), censura vigente (geopolítica) → sexo/drogas/blasfêmia/política
//   · imprensa do mercado (veículos ativos e quão implacáveis são; quem já não gostava do gênero)
//   · base de fãs (núcleo amortece; gênero rebelde transforma parte em notoriedade — efeito Streisand)
//   · fama regional (fame16): quanto mais conhecido no país, mais gente vê
// Efeitos: desvio de fama no país/região, patrocinadores que rompem (marca família rompe antes da "ousada"),
// relações e estresse no elenco (colegas devotos se ressentem), registro do "porquê" para a interface.

import { clamp } from '../core/rng';
import { OUTLETS, censorshipIn, type CensorTag } from '../data/content';
import { countryInfoByA3 } from '../data/countries';
import { countryName, countryOfCity } from '../data/geo';
import { cityById, familyOf, l, type L, type MarketId } from '../data/world';
import { isStrict, viewsOf } from './beliefs';
import { BRANDS } from './brands';
import { registerExt4 } from './ext4';
import { emitFact, type Fact } from './facts17';
import { fameAt } from './famehook16';
import { addStress } from './stress17';
import type { Act, GameState } from './types';
import type { Fame16 } from './sys/fame16';
import { fmtL, notify } from './util';

export type ScandalKind = 'drugs' | 'sex' | 'violence' | 'blasphemy' | 'politics' | 'money' | 'conduct' | 'offense' | 'meltdown' | 'crime';
export const SCANDAL_NAME: Record<ScandalKind, L> = {
  drugs: l('drogas', 'drugs'), sex: l('sexo', 'sex'), violence: l('violência', 'violence'), blasphemy: l('blasfêmia', 'blasphemy'),
  politics: l('política', 'politics'), money: l('dinheiro', 'money'), conduct: l('conduta', 'conduct'), offense: l('declaração ofensiva', 'offensive remark'),
  meltdown: l('surto público', 'public meltdown'), crime: l('crime', 'crime'),
};
const CENSOR: Partial<Record<ScandalKind, CensorTag[]>> = { sex: ['sexual', 'decadent'], drugs: ['drugs', 'decadent'], blasphemy: ['religious'], politics: ['political', 'protest'], violence: ['violence'] };

export interface ScandalMemo { w: number; kind: ScandalKind; sev: number; eff: number; a3?: string; why: L[]; lost?: string[]; rebel?: 1 }
export interface Scandal17State { last: Record<string, ScandalMemo>; n: number }
declare module './ext4' { interface Ext4 { scandal17: Scandal17State } }
const fresh = (): Scandal17State => ({ last: {}, n: 0 });
registerExt4('scandal17', fresh);
export function scandal17(s: GameState): Scandal17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.scandal17 ??= fresh()) as Scandal17State;
  st.last ??= {}; st.n ??= 0;
  return st;
}

/** Desligar a reação (bisecção de balanceamento); o contador e o Fact continuam. */
export const OFF17: Record<string, boolean> = {};

/** Religiosidade do público (0..1) por mercado, com secularização ao longo do século. */
const PIETY: Record<MarketId, number> = { br: 0.72, latam: 0.78, na: 0.62, eu: 0.45, asia: 0.62, africa: 0.85, oceania: 0.45 } as Record<MarketId, number>;
export function piety(market: MarketId, year: number): number {
  return clamp((PIETY[market] ?? 0.6) * (1.18 - 0.5 * clamp((year - 1950) / 75, 0, 1)), 0.15, 1);
}
const REBEL = new Set(['rock', 'hiphop', 'electronic']);

/** Ato de uma pessoa (o mais famoso em atividade). */
function actOfP(s: GameState, pid: string): Act | undefined {
  let best: Act | undefined;
  for (const a of Object.values(s.acts)) if (a.members.includes(pid) && (!best || a.fame > best.fame)) best = a;
  return best;
}

export interface ScandalReaction { mult: number; eff: number; why: L[]; a3: string | null; market: MarketId; rebel: boolean; piety: number }
/** Reação prevista (pura): usada pela simulação e pela interface ("quanto isso vai doer aqui?"). */
export function scandalReaction(s: GameState, act: Act | undefined, kind: ScandalKind, severity: number, place?: string): ScandalReaction {
  const city = place ?? act?.city ?? s.config.homeCity;
  const a3 = countryOfCity(city);
  const market = ((a3 && countryInfoByA3[a3]?.market) || cityById[city]?.market || 'na') as MarketId;
  const why: L[] = [];
  const pi = piety(market, s.year);
  const cn = a3 ? countryName(a3) : l('?', '?');
  let m = 1;
  const pct = (x: number) => `${x >= 1 ? '×' : '×'}${x.toFixed(2)}`;
  const faithK = kind === 'sex' ? 0.55 + pi * 0.9 : kind === 'blasphemy' ? 0.5 + pi * 1.1 : kind === 'drugs' ? 0.65 + pi * 0.6 + (s.year < 1965 ? 0.15 : 0) : 0;
  if (faithK) { m *= faithK; why.push(fmtL(l('{c} em {y}: público {p}% religioso ({x})', '{c} in {y}: audience {p}% religious ({x})'), { c: cn, y: s.year, p: Math.round(pi * 100), x: pct(faithK) })); }
  const cz = censorshipIn(s.year, market);
  if (kind === 'politics') { const k = 0.8 + cz.level * 0.8; m *= k; why.push(fmtL(l('clima político (censura {v}%): {x}', 'political climate (censorship {v}%): {x}'), { v: Math.round(cz.level * 100), x: pct(k) })); }
  else if (cz.level >= 0.4 && CENSOR[kind]?.some((t) => cz.banned.includes(t))) { const k = 1 + cz.level * (market === 'eu' || market === 'asia' || market === 'africa' ? 0.3 : 0.6); /* mercado com muitos países: só parte deles censura */ m *= k; why.push(fmtL(l('tema proibido pela censura: {x}', 'topic banned by censors: {x}'), { x: pct(k) })); }
  const base: Partial<Record<ScandalKind, number>> = { violence: 1.1, crime: 1.15, money: 0.85, conduct: 0.9, offense: 0.9 + (s.year >= 2010 ? 0.25 : 0), meltdown: 0.75 };
  if (base[kind]) { m *= base[kind]!; if (kind === 'offense' && s.year >= 2010) why.push(l('era das redes: declaração vira cancelamento (×1.15)', 'social media era: a remark becomes a cancellation (×1.15)')); }
  // imprensa do mercado
  const outs = OUTLETS.filter((o) => (o.market === market || o.market === 'global') && o.start <= s.year && (o.end === undefined || o.end > s.year) && o.kind !== 'podcast' && o.kind !== 'newsletter');
  if (outs.length) {
    const harsh = outs.reduce((t, o) => t + o.bias.harshness, 0) / outs.length;
    let k = 0.85 + harsh * 0.35;
    const fam = act ? familyOf(act.genre) : null;
    const hater = fam ? outs.find((o) => o.market === market && o.bias.disfavored.includes(fam)) : undefined;
    if (hater) k += 0.08;
    const loud = [...outs].sort((a, b) => b.bias.prestige * b.bias.harshness - a.bias.prestige * a.bias.harshness)[0];
    m *= k;
    why.push(hater ? fmtL(l('imprensa: {o} já torcia o nariz para o gênero ({x})', 'press: {o} already sneered at the genre ({x})'), { o: hater.name, x: pct(k) }) : fmtL(l('imprensa: {o} dá o tom ({x})', 'press: {o} sets the tone ({x})'), { o: loud.name, x: pct(k) }));
  }
  let rebel = false;
  if (act) {
    const tot = act.fans.casual + act.fans.active + act.fans.core;
    const core = tot > 0 ? act.fans.core / tot : 0;
    if (core > 0.05) { const k = 1 - Math.min(0.35, core * 0.6); m *= k; why.push(fmtL(l('fãs núcleo ({p}%) defendem: {x}', 'core fans ({p}%) defend: {x}'), { p: Math.round(core * 100), x: pct(k) })); }
    rebel = REBEL.has(familyOf(act.genre)) && (kind === 'drugs' || kind === 'offense' || kind === 'violence' || kind === 'meltdown' || kind === 'politics');
    if (rebel) { m *= 0.8; why.push(l('gênero rebelde: parte vira notoriedade (×0.80)', 'rebel genre: part of it turns into notoriety (×0.80)')); }
    if (a3) {
      const f = fameAt(s, act, a3);
      const k = 0.75 + f / 200;
      m *= k;
      why.push(fmtL(l('fama em {c}: {f} ({x})', 'fame in {c}: {f} ({x})'), { c: cn, f: Math.round(f), x: pct(k) }));
    }
  }
  return { mult: m, eff: Math.round(clamp(severity * m, 0, 100)), why, a3, market, rebel, piety: pi };
}

export interface ScandalOpts { person?: string; place?: string; text?: L; cause?: string[]; tags?: string[]; quiet?: boolean }
export interface ScandalResult { fact: Fact | null; eff: number; why: L[]; a3: string | null; fameDelta: number; lost: string[] }

/** Escândalo: +1 no contador do ato (como antes), Fact tipado e reação regional. Sem sorteio. */
export function scandal(s: GameState, who: string, kind: ScandalKind, severity: number, cause?: L | string[], o: ScandalOpts = {}): ScandalResult {
  const act = s.acts[who] ?? actOfP(s, who);
  const pid = s.persons[who] ? who : o.person;
  if (act) act.scandals += 1;
  const st = scandal17(s);
  st.n++;
  const R = scandalReaction(s, act, kind, severity, o.place);
  const out: ScandalResult = { fact: null, eff: R.eff, why: R.why, a3: R.a3, fameDelta: 0, lost: [] };
  if (act && !OFF17.reaction) {
    // fama regional: o país do escândalo esfria (ou, no gênero rebelde e escândalo moderado, esquenta um pouco)
    const fx = (s.x4 as unknown as { fame16?: Fame16 }).fame16;
    if (fx && R.a3) {
      const d = (fx.d[act.id] ??= {});
      const delta = R.rebel && R.eff < 55 ? Math.round(R.eff * 0.03 * 10) / 10 : -Math.round(Math.min(8, R.eff * 0.07) * 10) / 10;
      d[R.a3] = clamp((d[R.a3] ?? 0) + delta, -40, 40);
      const rk = `r:${R.market}`;
      if (delta < 0) d[rk] = clamp((d[rk] ?? 0) + delta * 0.3, -40, 40);
      out.fameDelta = delta;
    }
    // patrocínio: marca família rompe primeiro; marca "ousada" nunca
    const TH = { family: 35, luxury: 55, tech: 65, youth: 75, edgy: 999 } as const;
    for (const d of s.deals) {
      if (d.actId !== act.id || d.status !== 'active' || (d.kind !== 'sponsor' && d.kind !== 'sync_ad')) continue;
      const img = BRANDS.find((b) => b.name === d.brand)?.image ?? 'youth';
      if (R.eff < TH[img]) continue;
      d.status = 'done';
      out.lost.push(d.brand);
      if (act.owner === 'player') notify(s, fmtL(l('{b} rompe com {a} depois do escândalo ({k}): imagem "{i}" não combina com a manchete.', '{b} drops {a} after the scandal ({k}): a "{i}" image does not fit the headline.'), { b: d.brand, a: act.name, k: SCANDAL_NAME[kind], i: img }), 'bad');
    }
    // elenco: colegas se afastam do culpado; devotos se ressentem de sexo/drogas/blasfêmia; todos se estressam
    const moral = kind === 'sex' || kind === 'drugs' || kind === 'blasphemy';
    for (const m of act.members) {
      const p = s.persons[m];
      if (!p?.alive || p.isPlayer) continue;
      if (pid && m !== pid) p.rel[pid] = clamp((p.rel[pid] ?? 0) - R.eff / 6, -100, 100);
      if (moral && m !== pid && isStrict(viewsOf(s, m))) { p.resentment = clamp(p.resentment + R.eff / 12, 0, 100); p.morale = clamp(p.morale - R.eff / 15, 0, 100); }
      addStress(s, m, m === pid ? R.eff / 4 : R.eff / 10, fmtL(l('Escândalo ({k}) de {a}', 'Scandal ({k}) of {a}'), { k: SCANDAL_NAME[kind], a: act.name }));
    }
    st.last[act.id] = { w: s.week, kind, sev: Math.round(severity), eff: R.eff, ...(R.a3 ? { a3: R.a3 } : {}), why: R.why, ...(out.lost.length ? { lost: out.lost } : {}), ...(R.rebel ? { rebel: 1 as const } : {}) };
    const keys = Object.keys(st.last);
    if (keys.length > 120) for (const k of keys.sort((a, b) => st.last[a].w - st.last[b].w).slice(0, keys.length - 120)) delete st.last[k];
  }
  const text = cause && !Array.isArray(cause) ? cause : o.text ?? fmtL(l('Escândalo ({k}) envolvendo {a}.', 'Scandal ({k}) involving {a}.'), { k: SCANDAL_NAME[kind], a: (pid && s.persons[pid]?.name) || act?.name || '?' });
  out.fact = emitFact(s, {
    kind: 'scandal', actors: [act?.id ?? who, ...(pid ? [pid] : [])], place: o.place ?? act?.city, severity: R.eff,
    visibility: R.eff >= 25 ? 'public' : 'rumor', tags: [kind, 'bad', ...(R.rebel ? ['rebel'] : []), ...(o.tags ?? [])], text, src: 'scandal17',
    cause: Array.isArray(cause) ? cause : o.cause, data: { kind, sev: Math.round(severity), mult: Math.round(R.mult * 100) / 100, ...(R.a3 ? { a3: R.a3 } : {}), ...(out.fameDelta ? { fame: out.fameDelta } : {}) },
  });
  return out;
}

/** Último escândalo do ato com o porquê da reação (interface). */
export const lastScandal = (s: GameState, actId: string): ScandalMemo | undefined => scandal17(s).last[actId];
