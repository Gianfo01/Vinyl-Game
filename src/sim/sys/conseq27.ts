// Rodada 27 (E2) — CONSEQUÊNCIAS QUE SE ESPALHAM.
//  • ESCÂNDALO QUE VIAJA: o scandal17 já esfria a fama no país do escândalo. Aqui, um escândalo de um ato SEU repercute
//    nas VENDAS mercado a mercado, cada um pela sua régua (scandalReaction: religiosidade do público na época, censura,
//    imprensa local, fãs núcleo, quão conhecido o ato é ali, gênero rebelde que vira notoriedade). Resultado: vendas
//    semanais (mod 'chartUnits') caem mais onde dói mais e quase nada onde ninguém liga — e esfriam ~15% ao mês.
//    Fato `scandal_ripple` com a lista ("EUA −24%, Brasil −6%, Europa +3%").
//  • MORTE VIRA LENDA: quando morre o rosto de um ato conhecido (líder, solo ou estrela), o catálogo do ato vende mais
//    (pico ×1,15–1,45, caindo para um piso permanente ×1,05–1,12), o valor de catálogo do selo sobe (rights.catalogValue
//    via CATALOG_ADJ) e atos com fama ≥ 50 viram LENDA (act.legend → relíquias valem mais no relics18, sonhos do soul9).
//    Fato `legend`. Vale para qualquer dono (o catálogo de uma lenda vende para quem tiver os masters).
//  • Hit do jogador que planta cena: em scenes27 (hitSeeds).

import { clamp } from '../../core/rng';
import { countryName } from '../../data/geo';
import { cityById, l, marketById, type L, type MarketId } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { CATALOG_ADJ } from '../rights';
import { scandalReaction, type ScandalKind } from '../scandal17';
import type { Act, GameState, Release } from '../types';
import { fmtL } from '../util';
import { headline19 } from './factlink19';

/** cidade-vitrine de cada mercado (onde se mede a reação) */
export const HUB27: Record<MarketId, string> = { na: 'new_york', eu: 'london', br: 'sao_paulo', latam: 'mexico_city', asia: 'tokyo', africa: 'lagos', oceania: 'sydney' } as Record<MarketId, string>;

export interface Rip27 { w: number; kind: ScandalKind; sev: number; m: Partial<Record<MarketId, number>>; why: Partial<Record<MarketId, L>> }
export interface Leg27 { w: number; y: number; pid: string; fame: number; peak: number; floor: number; legend: boolean }
export interface Cq27State { rip: Record<string, Rip27>; leg: Record<string, Leg27> }
declare module '../ext4' { interface Ext4 { cq27: Cq27State } }
const init = (): Cq27State => ({ rip: {}, leg: {} });
registerExt4('cq27', init);
export function cq27(s: GameState): Cq27State {
  const x = s.x4 as unknown as { cq27?: Cq27State };
  const st = (x.cq27 ??= init());
  st.rip ??= {}; st.leg ??= {};
  return st;
}
export const OFF_CQ27: { rip?: boolean; leg?: boolean } = {};
const mine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const pctTxt = (k: number) => `${k >= 1 ? '+' : '−'}${Math.round(Math.abs(k - 1) * 100)}%`;

// ---------------------------------------------------------------- escândalo que viaja

/** Mercados onde o ato tem presença: sede, territórios do selo e dos lançamentos recentes. */
function presence(s: GameState, a: Act): MarketId[] {
  const out = new Set<MarketId>();
  const hm = cityById[a.city]?.market;
  if (hm) out.add(hm);
  for (const t of s.player.territories) out.add(t);
  for (const id of a.releases.slice(-6)) for (const t of s.releases[id]?.territories ?? []) out.add(t);
  return [...out].filter((m) => HUB27[m]);
}

/** Repercussão prevista por mercado (pura): multiplicador de vendas e o porquê. */
export function ripplePreview27(s: GameState, a: Act, kind: ScandalKind, sev: number): { mk: MarketId; k: number; why: L }[] {
  const raw = presence(s, a).map((mk) => {
    const R = scandalReaction(s, a, kind, sev, HUB27[mk]);
    const pen = R.rebel && R.eff < 55 ? -0.03 : Math.min(0.22, (R.eff / 100) * 0.3);
    const top = R.why.slice(0, 2).map((w) => w.pt).join('; ');
    const topEn = R.why.slice(0, 2).map((w) => w.en).join('; ');
    return { mk, pen, w: marketById[mk]?.size(s.year) ?? 0, why: l(`${countryName(R.a3).pt}: ${top}`, `${countryName(R.a3).en}: ${topEn}`) };
  });
  // a fama no país do escândalo já caiu (scandal17): aqui pesa sobretudo a DIFERENÇA entre mercados — 70% da média sai
  const W = raw.reduce((t, x) => t + x.w, 0);
  const mean = W > 0 ? raw.reduce((t, x) => t + x.w * x.pen, 0) / W : 0;
  return raw.map((x) => ({ mk: x.mk, k: Math.round(clamp(1 - (x.pen - mean * 0.7), 0.75, 1.1) * 100) / 100, why: x.why }));
}

onFact('scandal', (s, f) => {
  if (OFF_CQ27.rip || f.src !== 'scandal17') return;
  const a = s.acts[f.actors[0]];
  const kind = String(f.data?.kind ?? '') as ScandalKind;
  const sev = Number(f.data?.sev ?? f.severity);
  if (!mine(a) || !a || !kind || sev < 15) return;
  const pv = ripplePreview27(s, a, kind, sev);
  if (pv.length < 2) return;
  const rip: Rip27 = { w: s.week, kind, sev, m: {}, why: {} };
  for (const p of pv) { rip.m[p.mk] = p.k; rip.why[p.mk] = p.why; }
  cq27(s).rip[a.id] = rip;
  const sorted = [...pv].sort((x, y) => x.k - y.k);
  const list = sorted.map((p) => `${(marketById[p.mk]?.name ?? l(p.mk, p.mk)).pt} ${pctTxt(p.k)}`).join(', ');
  const listEn = sorted.map((p) => `${(marketById[p.mk]?.name ?? l(p.mk, p.mk)).en} ${pctTxt(p.k)}`).join(', ');
  emitFact(s, { kind: 'scandal_ripple', actors: [a.id, 'player'], place: a.city, severity: clamp(sev, 20, 70), visibility: 'public', tags: ['conseq27', kind, 'bad'], src: 'conseq27', cause: [f.id],
    text: fmtL(l('O escândalo de {a} repercute diferente pelo mundo — vendas: {x}.', '{a}\'s scandal lands differently around the world — sales: {y}.'), { a: a.name, x: list, y: listEn }) });
}, 'conseq27:scandal');

/** multiplicador de vendas de um lançamento pela repercussão (média pelos territórios, ponderada pelo tamanho do mercado) */
export function rippleMult27(s: GameState, rel: Release): number {
  const rip = cq27(s).rip[rel.actId];
  if (!rip) return 1;
  let num = 0, den = 0;
  for (const t of rel.territories) {
    const w = marketById[t]?.size(s.year) ?? 0;
    num += w * (rip.m[t] ?? 1); den += w;
  }
  return den > 0 ? num / den : 1;
}
registerMod('chartUnits', 'ripple27', (s, v, c) => {
  if (OFF_CQ27.rip || !c.release) return null;
  const k = rippleMult27(s, c.release);
  return Math.abs(k - 1) < 0.005 ? null : { value: v * k, label: k < 1 ? l('Escândalo repercute nos mercados', 'Scandal echoes across markets') : l('Escândalo vira notoriedade', 'Scandal turns into notoriety') };
});

// ---------------------------------------------------------------- morte → lenda

const isFace = (a: Act, pid: string) => a.leaderId === pid || a.members.length <= 2 || a.fame >= 50;
onFact('death', (s, f) => {
  if (OFF_CQ27.leg) return;
  const st = cq27(s);
  const dead = f.actors.filter((id) => s.persons[id] && !s.persons[id].alive);
  for (const id of f.actors) {
    const a = s.acts[id];
    if (!a || st.leg[a.id]) continue;
    const pid = dead.find((p) => a.members.includes(p) || a.leaderId === p) ?? a.members.find((p) => s.persons[p] && !s.persons[p].alive);
    if (!pid || !isFace(a, pid)) continue;
    if (a.fame < 35 && !mine(a) && !a.releases.some((r) => s.releases[r]?.owner === 'player')) continue;
    const peak = 1 + clamp(a.fame / 140, 0.15, 0.45);
    const legend = a.fame >= 50;
    const floor = legend ? 1.12 : 1.05;
    st.leg[a.id] = { w: s.week, y: s.year, pid, fame: Math.round(a.fame), peak: Math.round(peak * 100) / 100, floor, legend };
    if (legend) a.legend = true;
    const p = s.persons[pid];
    emitFact(s, { kind: 'legend', actors: [a.id, pid], place: a.city, severity: clamp(35 + a.fame / 2, 35, 85), visibility: 'public', tags: ['conseq27', 'posthumous', 'good'], src: 'conseq27', cause: [f.id],
      text: fmtL(legend ? l('A morte de {p} transforma {a} em lenda: o catálogo vende ×{k} e o valor dos masters sobe.', '{p}\'s death turns {a} into a legend: the catalog sells ×{k} and the masters\' value rises.')
        : l('A morte de {p} faz o público redescobrir {a}: o catálogo vende ×{k} por um tempo.', '{p}\'s death makes the public rediscover {a}: the catalog sells ×{k} for a while.'), { p: p?.name ?? '?', a: a.name, k: peak.toFixed(2) }) });
  }
}, 'conseq27:death');

/** fator de catálogo do ato agora (1 = sem efeito) */
export function legendMult27(s: GameState, actId: string): number {
  const g = cq27(s).leg[actId];
  if (!g) return 1;
  const mo = Math.max(0, (s.week - g.w) / 4.35);
  return g.floor + (g.peak - g.floor) * Math.exp(-mo / 12);
}
const catalogRel = (rel: Release, g: Leg27) => rel.week <= g.w || !!rel.reissueOf || ['compilation', 'posthumous', 'anniversary', 'deluxe', 'tribute', 'live'].includes(rel.kind ?? '');
registerMod('chartUnits', 'legend27', (s, v, c) => {
  const rel = c.release;
  const g = rel && !OFF_CQ27.leg ? cq27(s).leg[rel.actId] : undefined;
  if (!rel || !g || !catalogRel(rel, g)) return null;
  const k = legendMult27(s, rel.actId);
  return { value: v * k, label: g.legend ? l('Catálogo de uma lenda', 'A legend\'s catalog') : l('Redescoberta póstuma', 'Posthumous rediscovery') };
});
CATALOG_ADJ.push((s, rel) => {
  const g = cq27(s).leg[rel.actId];
  return g && catalogRel(rel, g) ? 1 + (g.legend ? 0.25 : 0.1) : 1;
});

onFact('legend', (s, f) => { headline19(s, f.text, 2); }, 'conseq27:legend');
onFact('scandal_ripple', (s, f) => { if (f.severity >= 35) headline19(s, f.text, 3); }, 'conseq27:ripple');

// ---------------------------------------------------------------- mês: repercussão esfria

export function conseq27Month(s: GameState): void {
  const st = cq27(s);
  for (const [id, rip] of Object.entries(st.rip)) {
    let any = false;
    for (const mk of Object.keys(rip.m) as MarketId[]) {
      const k = 1 + ((rip.m[mk] ?? 1) - 1) * 0.85;
      if (Math.abs(k - 1) < 0.01) delete rip.m[mk]; else { rip.m[mk] = Math.round(k * 1000) / 1000; any = true; }
    }
    if (!any || !s.acts[id]) delete st.rip[id];
  }
  const ks = Object.keys(st.leg);
  if (ks.length > 300) for (const k of ks.sort((a, b) => st.leg[a].w - st.leg[b].w).slice(0, ks.length - 300)) delete st.leg[k];
}
registerSimHook('month', 'conseq27', (s) => conseq27Month(s));

// ---------------------------------------------------------------- leitura (interface)

registerExplain('ripple27', (s, c) => {
  const a = s.acts[String(c.act ?? c.id ?? '')];
  const rip = a && cq27(s).rip[a.id];
  if (!a || !rip) return null;
  const parts: WhyPart[] = (Object.keys(rip.m) as MarketId[]).map((mk) => ({ label: marketById[mk]?.name ?? mk, value: rip.m[mk] ?? 1, fmt: 'mult' as const, tone: (rip.m[mk] ?? 1) >= 1 ? 'good' as const : 'bad' as const, note: rip.why[mk] }));
  return { title: fmtL(l('Repercussão do escândalo de {a}', 'Fallout of {a}\'s scandal'), { a: a.name }), value: parts.length, parts, note: l('Cada mercado reage pela sua régua (religião, censura, imprensa, fãs, fama local). Esfria ~15% ao mês.', 'Each market reacts by its own yardstick (religion, censorship, press, fans, local fame). Cools ~15% a month.') };
});
registerExplain('legend27', (s, c) => {
  const a = s.acts[String(c.act ?? c.id ?? '')];
  const g = a && cq27(s).leg[a.id];
  if (!a || !g) return null;
  return { title: fmtL(l('{a}: catálogo póstumo', '{a}: posthumous catalog'), { a: a.name }), value: legendMult27(s, a.id), fmt: 'mult', parts: [
    { label: l('Pico logo após a morte', 'Peak right after the death'), value: g.peak, fmt: 'mult' },
    { label: l('Piso permanente', 'Permanent floor'), value: g.floor, fmt: 'mult' },
    { label: l('Lenda (relíquias valem mais)', 'Legend (relics are worth more)'), value: g.legend ? 'sim' : 'não' },
  ], note: l('Vale para discos lançados até a morte e para coletâneas, reedições e póstumos.', 'Applies to records released up to the death and to compilations, reissues and posthumous releases.') };
});

