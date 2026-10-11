// Rodada 19 (Frente 9.5) — SUCESSO TARDIO E SEGUNDA CHANCE (`revival19`). Uma faixa antiga (de preferência um fracasso)
// acumula "calor" a cada uso: remix de clube, comercial de rádio/TV, filme, série, trilha de jogo, documentário, vídeo curto
// (2016+) ou viral (media18). Calor alto → a faixa explode de novo (revival_hit): vende por meses, traz fãs de outra geração
// (fandom19/act.fans), faz nascer tributos (tribute19), pode ganhar certificação tardia (late_cert) e sobe o valor do catálogo
// (a receita do lançamento entra no múltiplo do sale17). Decisão do dono: relançar, remasterizar, voltar em turnê (reunião!),
// licenciar mais, mexer no espólio (artista morto → post18: tributo/holograma) ou deixar quieto (e o artista não gostar).
// Gatilhos de outros sistemas: screen18 (estreias), media18 (viral, concurso de remix, parada de clube), tribute19
// (documentário) e os tipos reservados de remix19/adsync19/score19 (remix_hit, ad_sync, needle_drop).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { fan18 } from '../fandom19';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, post } from '../util';
import { headline19 } from './factlink19';
import { post18, start18 } from './post18';

export type RK19 = 'radio_ad' | 'film' | 'tv_ad' | 'series' | 'remix' | 'game' | 'doc' | 'short' | 'viral' | 'sync';
export const RK19: Record<RK19, { name: L; from: number; h: number; p: number }> = {
  radio_ad: { name: l('Comercial de rádio', 'Radio ad'), from: 1925, h: 18, p: 0.025 },
  film: { name: l('Filme', 'Film'), from: 1930, h: 28, p: 0.03 },
  tv_ad: { name: l('Comercial de TV', 'TV ad'), from: 1950, h: 25, p: 0.035 },
  series: { name: l('Série de TV', 'TV series'), from: 1955, h: 30, p: 0.035 },
  doc: { name: l('Documentário', 'Documentary'), from: 1960, h: 24, p: 0.01 },
  remix: { name: l('Remix de clube', 'Club remix'), from: 1975, h: 22, p: 0.035 },
  game: { name: l('Trilha de game', 'Game soundtrack'), from: 1985, h: 20, p: 0.02 },
  short: { name: l('Vídeo curto', 'Short video'), from: 2016, h: 38, p: 0.05 },
  viral: { name: l('Viral', 'Viral'), from: 1995, h: 40, p: 0 },
  sync: { name: l('Licença de sincronização', 'Sync licence'), from: 1950, h: 30, p: 0 },
};
export const HEAT19 = 60;
export type Dec19 = 'reissue' | 'remaster' | 'tour' | 'license' | 'estate' | 'quiet';
export const DEC19: Record<Dec19, { name: L; desc: L }> = {
  reissue: { name: l('Relançar', 'Re-release'), desc: l('Coletânea/edição nova nas lojas: vendas ×1,5 e mais 2 meses de fôlego.', 'New edition/compilation in stores: sales ×1.5 and 2 more months.') },
  remaster: { name: l('Remasterizar', 'Remaster'), desc: l('Som novo para a geração nova: vendas ×1,3, +3 meses, qualidade +5.', 'New sound for the new generation: sales ×1.3, +3 months, quality +5.') },
  tour: { name: l('Turnê de volta', 'Comeback tour'), desc: l('O artista volta à estrada; se estava separado, é reunião (tributos perdem público; um sósia pode virar a voz oficial).', 'The artist hits the road; if split, it is a reunion (tributes lose crowds; a sound-alike may become the official voice).') },
  license: { name: l('Licenciar mais', 'License more'), desc: l('Dinheiro de sincronização agora e mais calor, mas os fãs puristas torcem o nariz.', 'Sync money now and more heat, but purist fans frown.') },
  estate: { name: l('Espólio: homenagem/holograma', 'Estate: tribute/hologram'), desc: l('Artista morto: o espólio monta um tributo (ou holograma, 2012+) pelo Legado póstumo.', 'Dead artist: the estate stages a tribute (or a hologram, 2012+) via Posthumous legacy.') },
  quiet: { name: l('Deixar quieto', 'Keep quiet'), desc: l('Sem custo; vendas ×0,8 — e o artista vivo pode não gostar.', 'No cost; sales ×0.8 — and a living artist may resent it.') },
};
export interface Cand19 { h: number; st: [RK19, number][]; w: number }
export interface Rev19 { id: string; rel: string; act: string; y: number; w: number; until: number; k: RK19; base: number; mul: number; u: number; v: number; gen: number; mo: number; dec?: Dec19; why: L }
export interface R19 { c: Record<string, Cand19>; rv: Rev19[]; seq: number; cd: Record<string, number>; log: [number, number, L][]; n: Record<string, number> }
declare module '../ext4' { interface Ext4 { revival19: R19 } }
const fresh = (): R19 => ({ c: {}, rv: [], seq: 0, cd: {}, log: [], n: {} });
registerExt4('revival19', fresh);
export function rv19(s: GameState): R19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.revival19 ??= fresh()) as R19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const cnt = (s: GameState, k: string) => { const n = rv19(s).n; n[k] = (n[k] ?? 0) + 1; };
const logR = (s: GameState, t: L) => { const st = rv19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const rng = (s: GameState) => rng19(s, 'revival19', () => Rng.fromSeed(`${s.config.seed}|rv19|${s.week}`));
export const activeRev19 = (s: GameState): Rev19[] => rv19(s).rv.filter((x) => x.until > s.week);
const mineRel = (s: GameState, rel: Release): boolean => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
export const flop19 = (rel: Release): boolean => !rel.peak || rel.peak > 20;
/** Faixa antiga elegível (10+ anos, não é reedição, qualidade mínima). */
export const oldRel19 = (s: GameState, rel: Release | undefined): rel is Release => !!rel && !rel.reissueOf && s.year - rel.year >= 10 && rel.q >= 35 && !!s.acts[rel.actId];

/** Um uso em mídia soma calor à faixa; calor ≥ 60 → sucesso tardio. Devolve o revival se começou. */
export function stage19(s: GameState, relId: string, k: RK19, extra = 0): Rev19 | null {
  const rel = s.releases[relId];
  if (!oldRel19(s, rel)) return null;
  const st = rv19(s);
  const c = (st.c[relId] ??= { h: 0, st: [], w: s.week });
  c.h = Math.round(c.h + RK19[k].h * (flop19(rel) ? 1.1 : 1) + extra); c.w = s.week;
  c.st.push([k, s.year]); if (c.st.length > 8) c.st.shift();
  cnt(s, `st_${k}`);
  logR(s, fmtL(l('{k}: "{t}" ({y}) de {a} volta a tocar (calor {h}).', '{k}: "{t}" ({y}) by {a} is heard again (heat {h}).'), { k: RK19[k].name, t: rel.title, y: rel.year, a: s.acts[rel.actId]?.name ?? '?', h: c.h }));
  if (c.h >= HEAT19 && !activeRev19(s).some((x) => x.rel === relId) && (st.cd[relId] ?? 0) <= s.week) return start19(s, rel, k);
  return null;
}
function start19(s: GameState, rel: Release, k: RK19): Rev19 {
  const st = rv19(s), a = s.acts[rel.actId], c = st.c[rel.id];
  const h = c?.h ?? HEAT19;
  const base = Math.round(25000 * (h / HEAT19) ** 1.5 * (0.5 + rel.q / 100) * (0.6 + (a?.fame ?? 30) / 100) * (flop19(rel) ? 1.2 : 1) * (s.year < 1960 ? 0.4 : s.year < 1990 ? 0.7 : 1));
  const why = fmtL(l('{s} — {y} anos depois', '{s} — {y} years later'), { s: (c?.st ?? [[k, s.year]]).map(([x]) => RK19[x].name.pt).join(' → '), y: s.year - rel.year });
  const x: Rev19 = { id: `rv${++st.seq}`, rel: rel.id, act: rel.actId, y: s.year, w: s.week, until: s.week + 35, k, base, mul: 1, u: 0, v: 0, gen: 0, mo: 0, why };
  st.rv.push(x); if (st.rv.length > 30) st.rv.splice(0, st.rv.length - 30);
  st.cd[rel.id] = s.week + 260;
  if (c) c.h = 0;
  cnt(s, 'hit');
  const tx = fmtL(l('Sucesso tardio: "{t}" ({y}) de {a} explode de novo ({w}).', 'Late hit: "{t}" ({y}) by {a} blows up again ({w}).'), { t: rel.title, y: rel.year, a: a?.name ?? '?', w: RK19[k].name });
  logR(s, tx);
  emitFact(s, { kind: 'revival_hit', actors: [rel.actId, mineRel(s, rel) ? 'player' : rel.owner], severity: Math.round(35 + (a?.fame ?? 0) / 4 + (flop19(rel) ? 8 : 0)), visibility: 'public', tags: ['revival19', k, flop19(rel) ? 'flop' : 'hit', 'good'], text: tx, src: 'revival19', data: { rel: rel.id, rv: x.id } });
  if (mineRel(s, rel)) ask19(s, x); else npcDecide(s, x);
  return x;
}
const deadAll = (s: GameState, a: Act | undefined) => !!a && (a.deceased || (a.members.length > 0 && a.members.every((p) => !s.persons[p]?.alive)));
const canTour = (s: GameState, a: Act | undefined) => !!a && !deadAll(s, a) && a.members.some((p) => s.persons[p]?.alive);
export function decOptions19(s: GameState, x: Rev19): Dec19[] {
  const a = s.acts[x.act];
  return (['reissue', 'remaster', ...(canTour(s, a) ? ['tour'] : []), 'license', ...(deadAll(s, a) ? ['estate'] : []), 'quiet'] as Dec19[]);
}
function ask19(s: GameState, x: Rev19): void {
  const rel = s.releases[x.rel];
  pushInbox18(s, 'rev19_dec', { from: s.acts[x.act]?.name ?? '?', subject: fmtL(l('"{t}" voltou às paradas — e agora?', '"{t}" is back in the charts — now what?'), { t: rel?.title ?? '?' }), tone: 'good',
    body: fmtL(l('{w}. Previsão: {u} unidades/mês, caindo. Fãs novos de outra geração estão chegando.', '{w}. Forecast: {u} units/month, fading. New fans from another generation are arriving.'), { w: x.why, u: Math.round(x.base).toLocaleString('en-US') }),
    ref: { rv: x.id }, actions: decOptions19(s, x).map((d) => ({ id: d, label: DEC19[d].name })), weeks: 6 });
}
function npcDecide(s: GameState, x: Rev19): void {
  const r = rng(s), ops = decOptions19(s, x).filter((d) => d !== 'estate' && d !== 'tour');
  decide19(s, x.id, r.weighted(ops, (d) => (d === 'reissue' ? 3 : d === 'remaster' ? 2 : d === 'license' ? 1.5 : 1)) ?? 'quiet', false);
}
export const reissueCost19 = (s: GameState) => money(s, 1500);
export const remasterCost19 = (s: GameState) => money(s, 2500);
/** Decisão do dono sobre o sucesso tardio. */
export function decide19(s: GameState, id: string, d: Dec19, mine = true): L {
  const x = rv19(s).rv.find((y) => y.id === id), rel = x && s.releases[x.rel], a = x && s.acts[x.act];
  if (!x || !rel) return l('Já passou.', 'Already over.');
  if (x.dec) return l('Já decidido.', 'Already decided.');
  x.dec = d;
  const tag = (k: string) => emitFact(s, { kind: 'catalog_rerelease', actors: [x.act, mine ? 'player' : rel.owner], severity: 30, visibility: 'public', tags: ['revival19', k], text: fmtL(k === 'remaster' ? l('"{t}" ganha remasterização para a nova geração.', '"{t}" is remastered for a new generation.') : l('"{t}" volta às lojas em edição nova.', '"{t}" returns to stores in a new edition.'), { t: rel.title }), src: 'revival19', data: { rel: rel.id } });
  switch (d) {
    case 'reissue': if (mine) post(s, `rv19re:${x.id}`, -reissueCost19(s), 'manufacturing', `Relançamento ${rel.title}`); x.mul *= 1.5; x.until += 9; tag('reissue'); return l('Relançado: vendas ×1,5.', 'Re-released: sales ×1.5.');
    case 'remaster': if (mine) post(s, `rv19rm:${x.id}`, -remasterCost19(s), 'recording', `Remaster ${rel.title}`); x.mul *= 1.3; x.until += 13; rel.q = Math.min(100, rel.q + 5); tag('remaster'); return l('Remasterizado: vendas ×1,3.', 'Remastered: sales ×1.3.');
    case 'tour': {
      if (!a || !canTour(s, a)) return l('Não há quem suba ao palco.', 'Nobody left to take the stage.');
      const back = a.status === 'split' || a.status === 'retired' || a.status === 'hiatus';
      if (back) { a.status = 'active'; a.hiatusUntil = undefined; }
      a.momentum = clamp(a.momentum + 15, 0, 100); x.mul *= 1.2;
      emitFact(s, { kind: 'comeback', actors: [a.id], severity: back ? 50 : 30, visibility: 'public', tags: ['revival19', back ? 'reunion' : 'tour', 'good'], text: fmtL(back ? l('{a} se reúne para uma turnê de volta, puxada por "{t}".', '{a} reunites for a comeback tour, riding "{t}".') : l('{a} volta à estrada com "{t}".', '{a} hits the road again with "{t}".'), { a: a.name, t: rel.title }), src: 'revival19' });
      return back ? l('Reunião anunciada!', 'Reunion announced!') : l('Turnê de volta marcada.', 'Comeback tour booked.');
    }
    case 'license': {
      const h = Math.max(30, rv19(s).c[rel.id]?.h ?? 30);
      if (mine) post(s, `rv19sy:${x.id}`, Math.round(money(s, 2000) * (h / HEAT19)), 'sync', `Sincronização ${rel.title}`);
      x.until += 9;
      const fa = a && fan18(s, a.id, false); if (fa?.fac?.length) fa.fac[0] = clamp(fa.fac[0] - 10, -50, 50);
      return l('Licenciado para mais campanhas: dinheiro agora, puristas incomodados.', 'Licensed to more campaigns: cash now, purists annoyed.');
    }
    case 'estate': {
      const pid = a?.members.find((p) => s.persons[p] && !s.persons[p].alive);
      if (!pid) return l('Sem espólio.', 'No estate.');
      const res = start18(s, pid, s.year >= 2012 ? 'holo_show' : 'tribute');
      if (!res.ok && s.year >= 2012) { const r2 = start18(s, pid, 'tribute'); return r2.text; }
      return res.text;
    }
    default:
      x.mul *= 0.8;
      if (mine && a && canTour(s, a)) a.trust = clamp(a.trust - 5, 0, 100); // o artista queria aproveitar a onda
      return l('Você deixa a onda passar.', 'You let the wave pass.');
  }
}
registerInboxKind('rev19_dec', { label: l('Sucesso tardio', 'Late hit'), cat: 'decision', icon: 'disc', prio: 2, goto: () => ({ area: 'tribute19' }),
  handle: (s, m, a) => decide19(s, String(m.ref?.rv), a as Dec19) });

const CERT: [NonNullable<Release['certified']>, number, L][] = [['diamond', 10e6, l('diamante', 'diamond')], ['platinum', 1e6, l('platina', 'platinum')], ['gold', 5e5, l('ouro', 'gold')]];
const RANK = { gold: 1, platinum: 2, diamond: 3 } as const;
/** Certificação tardia (mesmos patamares das paradas). */
export function lateCert19(s: GameState, rel: Release): boolean {
  const hit = CERT.find(([, n]) => rel.totalUnits >= n);
  if (!hit || (rel.certified && RANK[rel.certified] >= RANK[hit[0]])) return false;
  rel.certified = hit[0];
  const mine = mineRel(s, rel);
  if (mine) { if (hit[0] === 'gold') s.player.stats.gold += 1; else s.player.stats.platinum += 1; }
  const tx = fmtL(l('"{t}" ({y}) recebe disco de {c} — {n} anos depois do lançamento.', '"{t}" ({y}) is certified {c} — {n} years after release.'), { t: rel.title, y: rel.year, c: hit[2], n: s.year - rel.year });
  logR(s, tx); cnt(s, 'cert');
  emitFact(s, { kind: 'late_cert', actors: [rel.actId, ...(mine ? ['player'] : [])], severity: hit[0] === 'gold' ? 35 : 50, visibility: 'public', tags: ['revival19', hit[0], 'good'], text: tx, src: 'revival19', data: { rel: rel.id } });
  return true;
}

/** Mês: decaimento do calor, usos novos em mídia e vendas dos revivals ativos. */
export function revivalMonth19(s: GameState): void {
  const st = rv19(s), r = rng(s);
  for (const [id, c] of Object.entries(st.c)) { c.h = Math.round(c.h * 0.9); if (c.h < 3) delete st.c[id]; } // r19 onda 4: 0,85 → 0,9
  const ks = (Object.keys(RK19) as RK19[]).filter((k) => RK19[k].p > 0 && s.year >= RK19[k].from);
  let pool: Release[] | null = null;
  for (const k of ks) {
    if (!r.chance(RK19[k].p)) continue;
    pool ??= Object.values(s.releases).filter((x) => oldRel19(s, x) && (x.type !== 'lp' || r.chance(0.3)));
    // r19 onda 4: faixa já em evidência atrai novos usos (metade das vezes a mídia volta a uma faixa com calor) — sem isso
    // o calor se espalhava por milhares de faixas e a cadeia 2 (remix → comercial → série → revival) não acontecia sozinha
    const hot = Object.keys(st.c).filter((id) => oldRel19(s, s.releases[id]));
    const hid = hot.length && r.chance(0.5) ? r.weighted(hot, (id) => st.c[id].h) : undefined;
    const rel = hid ? s.releases[hid] : r.weighted(pool, (x) => (x.q / 50) ** 2 * (flop19(x) ? 1.6 : 1) * (mineRel(s, x) ? 2.5 : 1) * (st.c[x.id] ? 3 : 1));
    if (rel) stage19(s, rel.id, k);
  }
  for (const x of activeRev19(s)) {
    const rel = s.releases[x.rel], a = s.acts[x.act];
    if (!rel) continue;
    const u = Math.round(x.base * x.mul * 0.85 ** x.mo * (0.85 + r.next() * 0.3));
    x.mo++;
    const per = s.year >= 2008 ? 0.25 : s.year >= 1985 ? 0.8 : 0.6;
    const v = Math.round(u * money(s, per));
    rel.totalUnits += u; rel.revenue += v; x.u += u; x.v += v;
    if (mineRel(s, rel)) post(s, `rv19:${x.id}:${s.year}-${s.month}`, v, 'sales', `Sucesso tardio: ${rel.title}`);
    if (a) {
      const g = Math.round(u * 0.03); x.gen += g; // fãs de outra geração (fonte única: act.fans)
      a.fans.casual += g; a.fans.active += Math.round(g * 0.12);
      a.fame = clamp(a.fame + (x.mo <= 3 ? 0.6 : 0.2), 0, 100);
    }
    lateCert19(s, rel);
    if (x.until <= s.week + 4) logR(s, fmtL(l('Fim da onda de "{t}": {u} unidades, {g} fãs novos.', '"{t}" wave ends: {u} units, {g} new fans.'), { t: rel.title, u: x.u.toLocaleString('en-US'), g: x.gen.toLocaleString('en-US') }));
  }
}
registerSimHook('month', 'revival19', (s) => revivalMonth19(s));

// ---------------------------------------------------------------- gatilhos de outros sistemas

const oldOf = (s: GameState, actId: string, title?: string): Release | undefined => {
  const a = s.acts[actId];
  const xs = (a?.releases ?? []).map((id) => s.releases[id]).filter((x): x is Release => oldRel19(s, x));
  return (title && xs.find((x) => title.includes(x.title))) || xs.sort((p, q) => q.q - p.q)[0];
};
// viral (media18) de uma faixa antiga
onFact('viral', (s, f) => { const rel = oldOf(s, f.actors[0], f.text.pt); if (rel && f.text.pt.includes(rel.title)) stage19(s, rel.id, s.year >= 2016 ? 'short' : 'viral'); }, 'revival19:viral');
// estreia de filme/série/jogo (screen18) ou documentário (tribute19) → needle drop numa faixa antiga
onFact('release', (s, f) => {
  if (f.tags.includes('documentary')) { const rel = oldOf(s, f.actors[0]); if (rel) stage19(s, rel.id, 'doc'); return; }
  if (!f.tags.includes('screen18')) return;
  const r = rng(s);
  if (!r.chance(0.5)) return;
  const pool = Object.values(s.releases).filter((x) => oldRel19(s, x) && x.type === 'single');
  const rel = r.weighted(pool, (x) => (x.q / 50) ** 2 * (flop19(x) ? 1.5 : 1));
  if (rel) stage19(s, rel.id, f.tags.includes('game') ? 'game' : f.tags.includes('series') || f.tags.includes('tv') ? 'series' : 'film');
}, 'revival19:screen');
// concurso de remix / parada de clube (media18) e remix_hit (remix19) → remix de uma faixa antiga do ato
for (const k of ['remix_contest', 'club_chart', 'remix_hit']) onFact(k, (s, f) => { const d = s.releases[String(f.data?.rel ?? '')], rel = oldRel19(s, d) ? d : oldOf(s, f.actors[0]); if (rel) stage19(s, rel.id, 'remix'); }, `revival19:${k}`);
// publicidade e trilhas (adsync19/score19, onda 3)
onFact('ad_sync', (s, f) => { const rel = s.releases[String(f.data?.rel ?? '')] ?? oldOf(s, f.actors[0]); if (rel) stage19(s, rel.id, s.year >= 1950 ? 'tv_ad' : 'radio_ad'); }, 'revival19:ad');
onFact('needle_drop', (s, f) => { const rel = s.releases[String(f.data?.rel ?? '')] ?? oldOf(s, f.actors[0]); if (rel) stage19(s, rel.id, 'series'); }, 'revival19:needle');

// ---------------------------------------------------------------- ouvintes dos próprios fatos

const relOf = (s: GameState, f: Fact) => s.releases[String(f.data?.rel ?? '')];
// sucesso tardio → imprensa; espólio (post18: legado sobe); fãs (lealdade de quem já era fã)
onFact('revival_hit', (s, f) => { headline19(s, f.text, f.severity >= 50 ? 3 : 2); }, 'revival19:press');
onFact('revival_hit', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  for (const pid of a.members) { const e = post18(s).est[pid]; if (e) e.legacy = clamp(e.legacy + 3, 0, 100); }
}, 'revival19:estate');
onFact('revival_hit', (s, f) => { const fa = fan18(s, f.actors[0], false); if (fa) { fa.loy = clamp(fa.loy + 3, 0, 100); fa.fat = Math.max(0, fa.fat - 5); } }, 'revival19:fans');
// certificação tardia → manchete (press9) e prestígio comercial do selo
onFact('late_cert', (s, f) => {
  headline19(s, f.text, 2);
  const a = s.acts[f.actors[0]]; if (a) a.fame = clamp(a.fame + 1, 0, 100);
  if (f.actors.includes('player')) s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100);
}, 'revival19:cert');
// relançamento → vitrine nas lojas (market: impulso de hype na faixa) e manchete pequena
onFact('catalog_rerelease', (s, f) => { const rel = relOf(s, f); if (rel) rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + 0.15); headline19(s, f.text, 1); }, 'revival19:market');

// ---------------------------------------------------------------- calendário e porquê

registerDeadline('revival19', (s, from, to) => activeRev19(s).filter((x) => x.until >= from && x.until <= to).map((x) => ({
  id: `revival19-end-${x.id}`, w: x.until, w0: x.until - 4, kind: 'release' as const, t: fmtL(l('Onda de "{t}" acaba', '"{t}" wave fades'), { t: s.releases[x.rel]?.title ?? '?' }), tone: 'info' as const, goto: { area: 'tribute19' },
})));
registerExplain('rev19.heat', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')], cd = rel && rv19(s).c[rel.id];
  if (!rel || !cd) return null;
  const parts: WhyPart[] = cd.st.map(([k, y]) => ({ label: fmtL(l('{k} ({y})', '{k} ({y})'), { k: RK19[k].name, y }), value: RK19[k].h, fmt: 'signed' }));
  if (flop19(rel)) parts.push({ label: l('Era um fracasso: a história "injustiçado" pega (×1,1)', 'It was a flop: the "overlooked gem" story sticks (×1.1)'), value: 1.1, fmt: 'mult', tone: 'good' });
  parts.push({ label: l('Esfria 15% por mês', 'Cools 15% a month'), value: 0.85, fmt: 'mult', tone: 'bad' });
  return { title: fmtL(l('Calor de "{t}"', '"{t}" heat'), { t: rel.title }), value: cd.h, fmt: 'num', parts, note: fmtL(l('Com {h}+ a faixa explode de novo.', 'At {h}+ the track blows up again.'), { h: HEAT19 }) };
});
registerExplain('rev19.units', (s, c) => {
  const x = rv19(s).rv.find((y) => y.id === String(c.rv ?? '')), rel = x && s.releases[x.rel];
  if (!x || !rel) return null;
  return { title: l('Vendas do sucesso tardio', 'Late-hit sales'), value: x.u, fmt: 'num', parts: [
    { label: x.why, value: x.base, fmt: 'num' }, { label: l('Decisão do dono', 'Owner\'s decision'), value: x.mul, fmt: 'mult', note: x.dec ? DEC19[x.dec].name : l('pendente', 'pending') },
    { label: l('Cai 15% por mês', 'Falls 15% a month'), value: 0.85, fmt: 'mult', tone: 'bad' }, { label: l('Fãs novos de outra geração', 'New fans from another generation'), value: x.gen, fmt: 'num', tone: 'good' },
  ], note: l('A receita entra no lançamento e no múltiplo de catálogo do valor de venda do selo.', 'Revenue goes into the release and into the catalogue multiple of the label\'s sale value.') };
});
