// Rodada 18 (long18, feedback #14) — POST-MORTEM de cada lançamento: expectativa × resultado com os fatores principais.
// No lançamento guarda a expectativa (unidades previstas, fãs, marketing, crítica do ato); 12 semanas depois compara
// alcance (unidades × previsão), retorno (as semanas 7–12 contra a curva normal: ouvintes que voltaram), conversão em
// fãs (fãs novos por unidade contra o histórico do ato), campanha (verba × efeito), crítica e dinheiro; lê as
// dimensões de qualidade (quality18) quando houver. Sai uma frase como "O single alcançou mais gente que o previsto,
// mas poucos ouvintes voltaram. A campanha funcionou; a conversão em fãs foi baixa." + fatores com tom, um Fato e uma
// mensagem na Caixa. Sem sorteio.

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { registerExplain } from '../explain18';
import { decay } from '../market';
import type { Act, GameState, Release } from '../types';
import { fmtL } from '../util';
import { DIM18, dims18, type Dim18 } from './quality18';

export interface Snap18 { w: number; fc: number; fans: number; mkt: number; crit: number }
export type Tone18 = 'good' | 'bad' | 'info';
export interface PMFactor18 { k: string; t: L; tone: Tone18; v?: number }
export interface PM18 {
  id: string; actId: string; title: string; type: Release['type']; y: number; m: number; w: number;
  /** unidades/previsão, retorno relativo à curva, fãs/unidade (real e esperado) */
  reach: number; ret: number; conv: number; convE: number;
  units: number; fc: number; fans: number; mkt: number; rev: number; revE: number; crit?: number; critE?: number;
  camp: 'none' | 'worked' | 'modest' | 'wasted';
  tone: Tone18; text: L; factors: PMFactor18[];
}
export interface Review18State { snap: Record<string, Snap18>; pm: PM18[] }
declare module '../ext4' { interface Ext4 { review18: Review18State } }
registerExt4('review18', () => ({ snap: {}, pm: [] }));
export const rv18 = (s: GameState): Review18State => {
  const x = s.x4 as unknown as { review18?: Review18State };
  return (x.review18 ??= { snap: {}, pm: [] });
};

export const PM_WEEKS = 12;
const fansOf = (a: Act | undefined): number => (a ? a.fans.casual + a.fans.active + a.fans.core : 0);
const mineRel = (s: GameState, r: Release): boolean => r.owner === 'player' || !!s.acts[r.actId]?.playerBand;
const usd = (s: GameState, c: number): string => `$${Math.round(toReal(c, s.year)).toLocaleString('en-US')}`;
const sumW = (w: number[], a: number, b: number) => w.slice(a, b).reduce((t, x) => t + x, 0);
const join = (a: L, b: L, sep: L): L => ({ pt: a.pt + sep.pt + b.pt, en: a.en + sep.en + b.en });
const capL = (x: L): L => ({ pt: x.pt.charAt(0).toUpperCase() + x.pt.slice(1), en: x.en.charAt(0).toUpperCase() + x.en.slice(1) });

/** Conversão esperada (fãs novos por unidade): média das leituras anteriores do ato, ou a base pela fama. */
export function convBase18(s: GameState, act: Act | undefined): number {
  const prev = rv18(s).pm.filter((p) => p.actId === act?.id && p.units > 0).slice(0, 4);
  if (prev.length >= 2) return prev.reduce((t, p) => t + p.conv, 0) / prev.length;
  return 0.35 * (1 - clamp((act?.fame ?? 0) / 160, 0, 0.5));
}

/** Retorno: semanas 7–12 contra 1–6, relativo à curva normal do tipo de lançamento (1 = como sempre). */
export function retention18(rel: Release): number {
  const a = sumW(rel.weekly, 0, 6), b = sumW(rel.weekly, 6, 12);
  if (a <= 0) return 1;
  let ea = 0, eb = 0;
  for (let i = 0; i < 12; i++) (i < 6 ? (ea += decay(rel.type, i)) : (eb += decay(rel.type, i)));
  return clamp(b / a / (eb / ea), 0, 4);
}

function snap(s: GameState, rel: Release): void {
  if (!mineRel(s, rel) || rel.hist || rel.kind === 'demo') return;
  const act = s.acts[rel.actId];
  const prevCrit = rv18(s).pm.filter((p) => p.actId === rel.actId && p.crit !== undefined).slice(0, 3);
  rv18(s).snap[rel.id] = {
    w: rel.week, fc: rel.fc ?? 0, fans: fansOf(act), mkt: rel.marketing.reduce((t, m) => t + m.budget, 0),
    crit: prevCrit.length ? prevCrit.reduce((t, p) => t + (p.crit ?? 0), 0) / prevCrit.length : 60,
  };
}

const WHAT: Record<string, L> = { single: l('O single', 'The single'), ep: l('O EP', 'The EP'), lp: l('O álbum', 'The album') };

/** Monta a leitura de um lançamento (exportada para testes e para a interface). */
export function buildPM18(s: GameState, rel: Release, sn: Snap18): PM18 {
  const act = s.acts[rel.actId];
  const units = sumW(rel.weekly, 0, PM_WEEKS) || rel.totalUnits;
  const fc = sn.fc > 0 ? sn.fc * (1 + (PM_WEEKS - 10) * 0.04) : 0;
  const reach = fc > 0 ? units / fc : 1;
  const ret = retention18(rel);
  const fans = Math.max(0, fansOf(act) - sn.fans);
  const conv = units > 0 ? fans / units : 0;
  const convE = convBase18(s, act);
  const rev = rel.revenue, revE = reach > 0 ? rev / reach : rev;
  const mkt = sn.mkt, mE = rel.marketingE ?? 0, mReal = toReal(mkt, s.year);
  const camp: PM18['camp'] = mkt <= 0 ? 'none' : mE >= 0.3 && reach >= 0.9 ? 'worked' : mReal > 2000 && (mE < 0.15 || reach < 0.7) ? 'wasted' : 'modest';
  const f: PMFactor18[] = [];
  // 1ª frase: alcance + retorno
  const what = WHAT[rel.type] ?? l('O lançamento', 'The release');
  const rT: L = reach >= 1.25 ? l('alcançou bem mais gente que o previsto', 'reached far more people than forecast')
    : reach >= 1.05 ? l('alcançou mais gente que o previsto', 'reached more people than forecast')
    : reach >= 0.85 ? l('alcançou o público previsto', 'reached the forecast audience')
    : reach >= 0.55 ? l('alcançou menos gente que o previsto', 'reached fewer people than forecast') : l('passou longe da previsão', 'fell far short of the forecast');
  const tT: L = ret < 0.75 ? l('poucos ouvintes voltaram', 'few listeners came back') : ret > 1.25 ? l('quem ouviu voltou e o disco cresceu com o tempo', 'listeners came back and it grew over time') : l('o público voltou no ritmo de sempre', 'listeners came back at the usual pace');
  const upR = reach >= 0.85, upT = ret >= 0.75;
  let text = join(join(what, rT, l(' ', ' ')), tT, upR === upT ? l(', e ', ', and ') : l(', mas ', ', but '));
  text = join(text, l('.', '.'), l('', ''));
  f.push({ k: 'reach', tone: reach >= 1.05 ? 'good' : reach < 0.85 ? 'bad' : 'info', v: reach, t: fmtL(l('Alcance: {u} unidades em {w} semanas contra {e} previstas ({p}%).', 'Reach: {u} units in {w} weeks vs {e} forecast ({p}%).'), { u: Math.round(units), w: PM_WEEKS, e: Math.round(fc), p: Math.round(reach * 100) }) });
  f.push({ k: 'ret', tone: ret < 0.75 ? 'bad' : ret > 1.25 ? 'good' : 'info', v: ret, t: fmtL(l('Retorno: semanas 7–12 renderam {p}% do normal para a curva de um {t}.', 'Return: weeks 7–12 delivered {p}% of normal for a {t} curve.'), { p: Math.round(ret * 100), t: rel.type.toUpperCase() }) });
  // 2ª frase: campanha + conversão
  const cT: L = camp === 'none' ? l('Sem campanha paga', 'No paid campaign') : camp === 'worked' ? l('A campanha funcionou', 'The campaign worked') : camp === 'wasted' ? l('A campanha foi dinheiro jogado fora', 'The campaign was money down the drain') : l('A campanha rendeu pouco', 'The campaign did little');
  const ratio = convE > 0 ? conv / convE : 1;
  const vT: L = ratio < 0.6 ? l('a conversão em fãs foi baixa', 'fan conversion was low') : ratio > 1.4 ? l('a conversão em fãs foi excelente', 'fan conversion was excellent') : l('a conversão em fãs foi normal', 'fan conversion was normal');
  text = join(text, join(join(cT, vT, l('; ', '; ')), l('.', '.'), l('', '')), l(' ', ' '));
  f.push({ k: 'camp', tone: camp === 'worked' ? 'good' : camp === 'wasted' ? 'bad' : 'info', v: mE, t: camp === 'none' ? l('Campanha: nenhuma verba de marketing.', 'Campaign: no marketing budget.') : fmtL(l('Campanha: {m} de verba, eficácia {e}% (marketing ×{x} no apelo).', 'Campaign: {m} budget, effectiveness {e}% (marketing ×{x} on appeal).'), { m: usd(s, mkt), e: Math.round(mE * 100), x: (1 + 2.5 * mE).toFixed(2) }) });
  f.push({ k: 'conv', tone: ratio < 0.6 ? 'bad' : ratio > 1.4 ? 'good' : 'info', v: ratio, t: fmtL(l('Conversão: {n} fãs novos ({c} por 100 unidades; o normal para {a} é {e}).', 'Conversion: {n} new fans ({c} per 100 units; normal for {a} is {e}).'), { n: Math.round(fans), c: (conv * 100).toFixed(1), a: act?.name ?? '—', e: (convE * 100).toFixed(1) }) });
  // crítica
  let crit: number | undefined, critE: number | undefined;
  if (rel.critic !== undefined && (rel.criticN ?? 0) > 0) {
    crit = rel.critic; critE = sn.crit;
    const d = crit - critE;
    if (Math.abs(d) >= 8) f.push({ k: 'crit', tone: d > 0 ? 'good' : 'bad', v: d, t: fmtL(l('Crítica: nota {c} contra {e} de costume para o ato.', 'Critics: score {c} vs the act\'s usual {e}.'), { c: Math.round(crit), e: Math.round(critE) }) });
  }
  // qualidade em dimensões (quality18): o que explica o retorno
  const dm = dims18(s, rel);
  if (dm) {
    const k = (Object.keys(dm) as Dim18[]);
    const hi = k.reduce((a, b) => (dm[b] > dm[a] ? b : a)), lo = k.reduce((a, b) => (dm[b] < dm[a] ? b : a));
    const note = ret < 0.75 && dm.dur < 50 ? l('pouca durabilidade explica o público que não voltou', 'low longevity explains listeners not returning')
      : reach < 0.85 && dm.acc < 45 ? l('pouca acessibilidade freou a primeira audição', 'low accessibility held back first listens')
      : rel.type !== 'single' && dm.sgl < 45 && reach < 1 ? l('faltou um single que puxasse o disco', 'it lacked a single to pull the record') : null;
    f.push({ k: 'dims', tone: note ? 'bad' : 'info', t: fmtL(l('Qualidade: forte em {h} ({a}), fraca em {w} ({b}){n}.', 'Quality: strong in {h} ({a}), weak in {w} ({b}){n}.'), { h: DIM18[hi].name, a: Math.round(dm[hi]), w: DIM18[lo].name, b: Math.round(dm[lo]), n: note ? join(l(' — ', ' — '), note, l('', '')) : l('', '') }) });
  }
  // dinheiro
  f.push({ k: 'money', tone: rev >= mkt ? 'good' : 'bad', v: rev - mkt, t: fmtL(l('Dinheiro: {r} de receita em {w} semanas contra {m} de marketing (no ritmo previsto seriam {e}).', 'Money: {r} revenue in {w} weeks vs {m} marketing (at forecast pace it would be {e}).'), { r: usd(s, rev), w: PM_WEEKS, m: usd(s, mkt), e: usd(s, revE) }) });
  const score = (reach >= 1.05 ? 1 : reach < 0.85 ? -1 : 0) + (ret < 0.75 ? -1 : ret > 1.25 ? 1 : 0) + (ratio < 0.6 ? -1 : ratio > 1.4 ? 1 : 0) + (camp === 'wasted' ? -1 : camp === 'worked' ? 0.5 : 0);
  return { id: rel.id, actId: rel.actId, title: rel.title, type: rel.type, y: s.year, m: s.month, w: s.week, reach, ret, conv, convE, units, fc, fans, mkt, rev, revE, crit, critE, camp, tone: score >= 1 ? 'good' : score <= -1 ? 'bad' : 'info', text: capL(text), factors: f };
}

registerSimHook('launch', 'review18', (s, _r, a) => { if (a.release) snap(s, a.release); });
registerSimHook('month', 'review18', (s) => {
  const st = rv18(s);
  for (const [id, sn] of Object.entries(st.snap)) {
    const rel = s.releases[id];
    if (!rel) { delete st.snap[id]; continue; }
    if (s.week - rel.week < PM_WEEKS) continue;
    delete st.snap[id];
    const pm = buildPM18(s, rel, sn);
    st.pm.unshift(pm);
    if (st.pm.length > 60) st.pm.length = 60;
    const act = s.acts[rel.actId];
    emitFact(s, { kind: 'release_review', actors: [rel.actId], severity: 20, visibility: 'secret', tags: [pm.tone === 'bad' ? 'bad' : pm.tone === 'good' ? 'good' : 'info'], text: fmtL(l('Post-mortem de "{t}" ({a}): {x}', 'Post-mortem of "{t}" ({a}): {x}'), { t: rel.title, a: act?.name ?? '—', x: pm.text }), src: 'review18', data: { rel: rel.id, reach: Math.round(pm.reach * 100), ret: Math.round(pm.ret * 100) } });
    pushInbox18(s, 'review18', { from: l('Análise', 'Analysis').pt, subject: fmtL(l('Post-mortem: "{t}"', 'Post-mortem: "{t}"'), { t: rel.title }), body: join(pm.text, pm.factors.slice(0, 3).map((x) => x.t).reduce((a, b) => join(a, b, l(' ', ' ')), l('', '')), l(' ', ' ')), ref: { act: rel.actId, rel: rel.id }, tone: pm.tone });
  }
});
registerInboxKind('review18', { label: l('Post-mortem', 'Post-mortem'), cat: 'analyst', icon: 'chart', prio: 1, goto: () => ({ area: 'long18', tab: ['long18', 'pm'], label: l('Ver post-mortems', 'See post-mortems') }) });

registerExplain('review18.reach', (s, c) => {
  const pm = rv18(s).pm.find((p) => p.id === c.rel);
  if (!pm) return null;
  return {
    title: l('Expectativa × resultado', 'Expectation vs result'), value: pm.reach, fmt: 'mult',
    parts: [
      { label: l('Unidades previstas (12 sem.)', 'Forecast units (12 wks)'), value: Math.round(pm.fc), fmt: 'num' },
      { label: l('Unidades reais', 'Actual units'), value: Math.round(pm.units), fmt: 'num' },
      { label: l('Retorno (semanas 7–12 × curva normal)', 'Return (weeks 7–12 × normal curve)'), value: pm.ret, fmt: 'mult', tone: pm.ret < 0.75 ? 'bad' : 'good' },
      { label: l('Fãs novos por 100 unidades', 'New fans per 100 units'), value: Math.round(pm.conv * 1000) / 10, fmt: 'num' },
      { label: l('Normal do ato', 'Act baseline'), value: Math.round(pm.convE * 1000) / 10, fmt: 'num' },
    ],
    note: l('A previsão é a guardada no dia do lançamento (com a incerteza do seu analista).', 'The forecast is the one stored on release day (with your analyst\'s uncertainty).'),
  };
});
