// Rodada 16 — Conexões entre sistemas que antes corriam em paralelo. Cada ligação é pequena, determinística
// (Rng próprio por gancho/mês) e deixa uma linha de "porquê" onde o efeito aparece (aviso, hype, autópsia,
// notoriedade, arcos, fonte do sinal de scouting).
//
//   1. fama (fame15) → notoriedade (notoriety14) de Gravadora/Empresário quando um ato sobe de patamar
//   2. sync (sync15) → paradas (chartUnits) e procura de shows (cityDemand) por algumas semanas
//   3. lazer (leisure14) → scouting: amigos dos seus músicos (e seus) viram sinais/indicações
//   4. família (kin15) → luto vira decisão (pausa / disco / agenda), arco (arcs12) e qualidade das faixas (songQ)
//   5. rixa de irmãos (kin15) → arcos e faixas piores no estúdio enquanto dura
//   6. assinatura do produtor (producers15/studio) × conceito do projeto (project8/13) → apelo
//   7. veículos próprios (media12) → hype dos seus artistas, com custo de credibilidade se virar autopromoção
//   8. empresário em rixa (managers14) → ataques na imprensa (dispute15)
//   9. sobrecarga da equipe (capacity14) → lealdade (people/staff) e aliciamento por rivais (crew8)
//  10. esnobada (awards15) → moral, arcos e memória do júri no ano seguinte (charts7)
// Aprofundamentos: júri com memória (compensa ou pune a reação à esnobada) e notoriedade de Gravadora que
// atrai fitas demo de artistas sem selo.

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerDecisionListener, registerExt4, registerMod, registerSimHook } from '../ext4';
import { PRODUCERS } from '../studio';
import type { Act, GameState, Person } from '../types';
import { fmtL, notify, playerActs, remember } from '../util';
import { cityById } from '../../data/world';
import { arcAdd } from './arcs12';
import { aw15, juryMemHook } from './awards15';
import { careers } from './careers12';
import { ch7 } from './charts7';
import { crew } from './crew8';
import { dp15, cleanBooks, claimOf, courtOdds } from './dispute15';
import { FTIERS, fameTier } from './fame15';
import { cap14, roleLoads } from './capacity14';
import { addHype } from './hype12';
import { kin15, kinOf15, type Rel15, REL15 } from './kin15';
import { inFeud, mgrKey, mgrName, repOf } from './managers14';
import { LINES, medOf, slotCap } from './media12';
import { TIERS, noto, notoTier, careerLabel } from './notoriety14';
import { careerOf } from './people/staff';
import { conceptById, proj8 } from './project8';
import { MEDIA15, sy15 } from './sync15';
import { ventures } from './ventures9';

export interface Links16 {
  /** último patamar de fama visto por ato (para notoriedade) */
  ft: Record<string, number>;
  /** mortos de kin15 já processados; rixas já vistas; esnobadas já vistas */
  kd: number; kf: Record<string, 1>; sn: Record<string, 1>;
  /** luto ativo: ato → [semana-limite, modo, nome do membro] (modo: r = descanso, s = disco, p = agenda) */
  gr: Record<string, [number, string, string]>;
  /** reação à esnobada: ato → [ano, opção] */
  jy: Record<string, [number, string]>;
  /** aviso de faixa (luto/rixa) por ato: último mês avisado */
  qn: Record<string, number>;
  log: [number, number, L][];
}
const fresh = (): Links16 => ({ ft: {}, kd: -1, kf: {}, sn: {}, gr: {}, jy: {}, qn: {}, log: [] });
declare module '../ext4' { interface Ext4 { links16: Links16 } }
registerExt4('links16', fresh);
export function lk16(s: GameState): Links16 {
  const x = s.x4 as unknown as { links16?: Links16 };
  const st = (x.links16 ??= fresh());
  st.ft ??= {}; st.kf ??= {}; st.sn ??= {}; st.gr ??= {}; st.jy ??= {}; st.qn ??= {}; st.log ??= []; st.kd ??= -1;
  return st;
}
/** Diagnóstico de balanceamento: desliga ligações pelo nome (vazio no jogo). */
export const OFF16 = new Set<string>((typeof process !== 'undefined' && process.env?.LINKS16_OFF ? process.env.LINKS16_OFF.split(',') : []));
const mIdx = (s: GameState) => s.year * 12 + s.month;
const rng = (s: GameState, k: string) => Rng.fromSeed(`${s.config.seed}:links16:${k}:${s.year}:${s.month}`);
const say = (s: GameState, t: L, tone: 'good' | 'bad' | 'info' | 'event' = 'info', note = true) => {
  const st = lk16(s);
  st.log.unshift([s.year, s.month, t]);
  if (st.log.length > 30) st.log.length = 30;
  if (note) notify(s, t, tone);
};
const mineAct = (a?: Act): a is Act => !!a && a.owner === 'player' && a.status !== 'retired' && a.status !== 'split';
const me = (s: GameState): Person | undefined => Object.values(s.persons).find((p) => p.isPlayer && p.alive);
const INV16: Record<Rel15, Rel15> = { parent: 'child', child: 'parent', sibling: 'sibling', spouse: 'spouse', ex: 'ex', cousin: 'cousin', uncle: 'nephew', nephew: 'uncle' };
const CLOSE16 = new Set<Rel15>(['parent', 'child', 'sibling', 'spouse']);

// ---------------------------------------------------------------- 1. fama → notoriedade

export function fameToNoto(s: GameState): void {
  const st = lk16(s), act = careers(s).active, nv = noto(s);
  const bump = (c: string, a: Act, t: number) => {
    if (!act.includes(c)) return;
    const d = 0.6 * t;
    nv.v[c] = clamp((nv.v[c] ?? 0) + d, 0, 100);
    const tx = fmtL(l('{c}: {a} virou "{t}" — o seu nome cresce junto (+{d} de notoriedade).', '{c}: {a} became "{t}" — your name grows with it (+{d} notoriety).'), { c: careerLabel(c), a: a.name, t: FTIERS[t].name, d: d.toFixed(1) });
    nv.log.push({ y: s.year, m: s.month, c, d: Math.round(d * 10) / 10, t: tx });
    if (nv.log.length > 40) nv.log.shift();
    say(s, tx, 'good', t >= 3);
  };
  const clients = new Set(ventures(s).mg.clients.map((c) => c.actId));
  for (const a of Object.values(s.acts)) {
    const mine = mineAct(a) && !a.playerBand, cl = clients.has(a.id);
    if (!mine && !cl) { delete st.ft[a.id]; continue; }
    const t = fameTier(a.fame), t0 = st.ft[a.id];
    st.ft[a.id] = Math.max(t0 ?? t, t);
    if (t0 === undefined || t <= t0 || t < 2) continue;
    if (mine) bump('label', a, t);
    if (cl) bump('manager', a, t);
  }
}

// ---------------------------------------------------------------- 2. sync → paradas e shows

const SYNC_W = 12;
const syncCache = new WeakMap<GameState, { w: number; rel: Record<string, [number, L, string]>; act: Record<string, [number, L]> }>();
function syncNow(s: GameState) {
  let c = syncCache.get(s);
  if (c && c.w === s.week) return c;
  c = { w: s.week, rel: {}, act: {} };
  for (const b of sy15(s).briefs ?? []) {
    if (b.status !== 'won' || !b.song) continue;
    const age = s.week - b.week;
    if (age < 0 || age > SYNC_W) continue;
    const so = s.songs[b.song];
    const M = MEDIA15[b.medium];
    if (!so || !M) continue;
    const fade = 1 - age / (SYNC_W + 2);
    const k = (0.06 + M.boost * 0.08) * (0.5 + (b.fit ?? 0.5)) * fade;
    if (so.releaseId && (c.rel[so.releaseId]?.[0] ?? 0) < k) c.rel[so.releaseId] = [k, M.name, so.title];
    if ((c.act[so.actId]?.[0] ?? 0) < k) c.act[so.actId] = [Math.min(0.08, k * 0.6), M.name];
  }
  syncCache.set(s, c);
  return c;
}
registerMod('chartUnits', 'links16:sync', (s, v, { release: rel }) => {
  if (OFF16.has('sync')) return null;
  const x = rel && syncNow(s).rel[rel.id];
  if (!x || x[0] < 0.005) return null;
  return { value: v * (1 + x[0]), label: fmtL(l('"{t}" tocando num {m} (sync)', '"{t}" playing in a {m} (sync)'), { t: x[2], m: x[1] }) };
});
registerMod('cityDemand', 'links16:sync', (s, v, { act }) => {
  if (OFF16.has('sync')) return null;
  const x = act && syncNow(s).act[act.id];
  if (!x || x[0] < 0.005) return null;
  return { value: v * (1 + x[0]), label: fmtL(l('Faixa num {m}: público novo', 'Track in a {m}: new audience'), { m: x[1] }) };
});

// ---------------------------------------------------------------- 3. lazer → scouting

export function friendTips(s: GameState, r: Rng): void {
  if (s.config.role === 'artist') return;
  const mine: { p: Person; a?: Act }[] = [];
  const P = me(s);
  if (P) mine.push({ p: P });
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a && !a.playerBand) for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) mine.push({ p, a }); } }
  const actOfP = new Map<string, Act>();
  for (const a of Object.values(s.acts)) if (!a.owner && (a.status === 'emerging' || a.status === 'active') && !s.knowledge[a.id]) for (const pid of a.members) actOfP.set(pid, a);
  if (!actOfP.size) return;
  const cand: { from: { p: Person; a?: Act }; to: Act; who: Person; v: number }[] = [];
  for (const m of mine) for (const [pid, v] of Object.entries(m.p.rel ?? {})) {
    if (v < 30) continue;
    const to = actOfP.get(pid), who = s.persons[pid];
    if (to && who?.alive) cand.push({ from: m, to, who, v });
  }
  if (!cand.length || !r.chance(Math.min(0.3, 0.06 + cand.length * 0.03))) return;
  cand.sort((a, b) => b.v - a.v || a.to.id.localeCompare(b.to.id));
  const c = r.pick(cand.slice(0, 4));
  const close = c.v >= 50;
  s.knowledge[c.to.id] = { actId: c.to.id, degree: close ? 2 : 1, stage: 'signal', bias: r.normal(0, close ? 3 : 5), updatedWeek: s.week, source: 'friend' };
  const tx = c.from.a
    ? fmtL(l('{m} ({a}) indica {w}, de {x} (sem selo): são amigos de noite e de palco. Novo sinal no scouting{c}.', '{m} ({a}) recommends {w} of {x} (unsigned): friends from nights out and gigs. New scouting signal{c}.'), { m: c.from.p.name, a: c.from.a.name, w: c.who.name, x: c.to.name, c: close ? l(' — amizade próxima, relatório mais confiável', ' — close friendship, more reliable report') : '' })
    : fmtL(l('Seu amigo {w} toca em {x} (sem selo): a amizade vira um sinal no scouting{c}.', 'Your friend {w} plays in {x} (unsigned): the friendship becomes a scouting signal{c}.'), { w: c.who.name, x: c.to.name, c: close ? l(' — conhecem-se bem, relatório mais confiável', ' — you know each other well, more reliable report') : '' });
  say(s, tx, 'info');
}

// ---------------------------------------------------------------- 4–5. família → arcos, decisões e estúdio

export function kinLinks(s: GameState): void {
  const st = lk16(s), K = kin15(s);
  if (st.kd < 0) { st.kd = K.dead.length; for (const k of Object.keys(K.feud)) st.kf[k] = 1; return; }
  const fresh = K.dead.slice(st.kd);
  st.kd = K.dead.length;
  let asked = s.decisions.some((d) => d.eventId === 'lk16_grief');
  for (const id of fresh) {
    const d = s.persons[id];
    if (!d || d.died === undefined || d.died < s.year - 1) continue;
    for (const k of kinOf15(s, id)) {
      if (!CLOSE16.has(k.rel) || !k.p.alive) continue;
      const a = Object.values(s.acts).find((x) => x.members.includes(k.p.id) && mineAct(x));
      if (!a || st.gr[a.id]?.[0] > s.week) continue;
      const rel = REL15[INV16[k.rel]];
      arcAdd(s, a.id, 'grief', fmtL(l('{q} perdeu {r} {p} em {y}, conosco no selo.', '{q} lost {r} {p} in {y}, while with the label.'), { q: k.p.name, r: rel, p: d.name, y: s.year }), 0);
      st.gr[a.id] = [s.week + 26, '', k.p.name];
      if (!asked && !a.playerBand) { asked = true; emitEvent(s, rng(s, `gr:${a.id}`), 'lk16_grief', { act: a.id, q: k.p.name, p: d.name, rel: rel.pt, relEn: rel.en }); }
    }
  }
  for (const [key] of Object.entries(K.feud)) {
    if (st.kf[key]) continue;
    st.kf[key] = 1;
    const [x, y] = key.split('|');
    const a = Object.values(s.acts).find((z) => z.members.includes(x) && z.members.includes(y));
    if (!mineAct(a)) continue;
    arcAdd(s, a.id, 'kin_feud', fmtL(l('os irmãos {x} e {y} brigaram em {t}, no auge da rotina do selo.', 'siblings {x} and {y} fell out in {t}, deep in the label routine.'), { x: s.persons[x]?.name ?? '?', y: s.persons[y]?.name ?? '?', t: s.year }), 0);
  }
  for (const k of Object.keys(st.kf)) if (!K.feud[k]) delete st.kf[k];
  for (const [id, g] of Object.entries(st.gr)) if (g[0] <= s.week) delete st.gr[id];
}
const feudIn = (s: GameState, a: Act): boolean => {
  const F = kin15(s).feud;
  for (const k of Object.keys(F)) { const [x, y] = k.split('|'); if (a.members.includes(x) && a.members.includes(y)) return true; }
  return false;
};
registerMod('songQ', 'links16:kin', (s, v, { act }) => {
  if (!mineAct(act)) return null;
  const st = lk16(s), g = st.gr[act.id];
  let m = 1; let t: L | null = null;
  if (g && g[0] > s.week && g[1] === 's') { m *= 1.06; t = fmtL(l('{q} transforma o luto em canção: faixas de {a} saem mais fundas (+6%).', '{q} turns grief into song: {a}\'s tracks come out deeper (+6%).'), { q: g[2], a: act.name }); }
  else if (g && g[0] > s.week && g[1] === 'p') { m *= 0.96; t = fmtL(l('{q} grava de luto, sem pausa: faixas de {a} saem mais frágeis (−4%).', '{q} records while grieving, no break: {a}\'s tracks come out weaker (−4%).'), { q: g[2], a: act.name }); }
  if (feudIn(s, act)) { m *= 0.95; t = fmtL(l('Irmãos brigados no estúdio: faixas de {a} perdem liga (−5%).', 'Feuding siblings in the studio: {a}\'s tracks lose cohesion (−5%).'), { a: act.name }); }
  if (m === 1 || !t) return null;
  if (st.qn[act.id] !== mIdx(s)) { st.qn[act.id] = mIdx(s); say(s, t, m > 1 ? 'good' : 'bad'); }
  return { value: v * m, label: t };
});

// ---------------------------------------------------------------- 6. produtor × conceito

const SIG16: Record<string, [string[], string[]]> = {
  radio: [['wall_of_sound', 'loudness', 'gated_reverb', 'autotune', 'glossy', 'maximalist', 'arranger'], ['lo_fi', 'minimal', 'dub_space', 'tape_echo']],
  art: [['sample_collage', 'tape_echo', 'dub_space', 'minimal', 'orchestral', 'neural'], ['loudness', 'autotune', 'glossy']],
  roots: [['organic', 'live_room', 'dry', 'swing', 'arranger'], ['autotune', 'neural', 'trap_808', 'glossy', 'loudness']],
  reinvent: [['neural', 'sample_collage', 'maximalist', 'trap_808', 'autotune', 'gated_reverb'], ['organic', 'swing', 'dry']],
  budget: [['lo_fi', 'dry', 'minimal', 'live_room'], ['wall_of_sound', 'orchestral', 'maximalist']],
  debut: [['live_room', 'organic', 'glossy', 'dry'], ['maximalist', 'sample_collage', 'orchestral']],
};
/** Química entre o som do produtor e o conceito do projeto: +1 casa, −1 briga, 0 neutro. */
export function prodFit16(concept: string, sig?: string): number {
  const x = SIG16[concept];
  if (!x || !sig) return 0;
  return x[0].includes(sig) ? 1 : x[1].includes(sig) ? -1 : 0;
}
registerMod('appeal', 'links16:prod', (s, v, { release: rel }) => {
  if (OFF16.has('prod')) return null;
  if (!rel || rel.owner !== 'player') return null;
  const p = proj8(s).list.find((x) => x.actId === rel.actId && (x.releaseId === rel.id || (!x.releaseId && rel.songs[0] && x.songIds.includes(rel.songs[0]))));
  if (!p) return null;
  const cnt: Record<string, number> = {};
  for (const id of rel.songs) { const q = s.songs[id]?.producerId; if (q) cnt[q] = (cnt[q] ?? 0) + 1; }
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (!top || top[1] * 2 < rel.songs.length) return null;
  const pr = PRODUCERS.find((x) => x.id === top[0]);
  const f = prodFit16(p.concept, pr?.signature);
  if (!pr || !f) return null;
  const c = conceptById[p.concept]?.name ?? l(p.concept, p.concept);
  return { value: v * (f > 0 ? 1.05 : 0.96), label: fmtL(f > 0 ? l('o som de {p} casa com o conceito "{c}"', '{p}\'s sound suits the "{c}" concept') : l('o som de {p} briga com o conceito "{c}"', '{p}\'s sound clashes with the "{c}" concept'), { p: pr.name, c }) };
});

// ---------------------------------------------------------------- 7. veículo próprio → hype

export function mediaHype(s: GameState): void {
  for (const v of ventures(s).list) {
    if (v.kind !== 'media') continue;
    const x = medOf(s, v.id);
    const own = x.prog.slice(0, slotCap(v)).filter((z) => z.actId && mineAct(s.acts[z.actId]));
    if (!own.length) continue;
    const credK = 0.4 + x.cred / 100;
    const per: Record<string, number> = {};
    for (const z of own) per[z.actId!] = (per[z.actId!] ?? 0) + (z.kind === 'premiere' ? 2 : z.kind === 'interview' ? 1.3 : 1);
    for (const [id, w] of Object.entries(per)) addHype(s, `a:${id}`, `links16:m:${v.id}`, fmtL(l('Espaço no seu veículo {v}', 'Airtime on your outlet {v}'), { v: v.name }), Math.round(Math.min(8, ((v.reach ?? 10) / 12) * w * credK) * 10) / 10);
    const share = own.length / Math.max(1, x.prog.filter((z) => z.actId).length);
    if (own.length >= 3 && share > 0.5) {
      x.cred = clamp(x.cred - 0.6, 0, 100);
      x.lastFx = [...(x.lastFx ?? []), fmtL(l('Autopromoção: {p}% da programação é do seu selo — o público percebe (credibilidade −0,6/mês, hype dos seus artistas rende menos).', 'Self-promotion: {p}% of airtime is your own label — the audience notices (credibility −0.6/month, your acts\' hype yields less).'), { p: Math.round(share * 100) })];
    } else x.lastFx = [...(x.lastFx ?? []), fmtL(l('Seus artistas na programação ganham hype ({n} espaço(s), proporcional ao alcance e à credibilidade de {c}).', 'Your acts on air gain hype ({n} slot(s), scaled by reach and credibility {c}).'), { n: own.length, c: Math.round(x.cred) })];
    void LINES;
  }
}

// ---------------------------------------------------------------- 8. empresário em rixa → imprensa

export function feudPress(s: GameState, r: Rng): void {
  if (s.decisions.some((d) => d.eventId.startsWith('dsp15_'))) return;
  const D = dp15(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    const c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || a.playerBand || !c || c.party !== 'player' || (D.cd[id] ?? 0) > s.week) continue;
    const m = repOf(s, id);
    if (!m || !inFeud(s, m.id) || a.fame < 20 || !r.chance(0.035 + (60 - Math.min(60, a.trust)) / 1500)) continue;
    D.cd[id] = s.week + 52;
    say(s, fmtL(l('{m}, em rixa com você, usa {a} para atacar o selo na imprensa.', '{m}, feuding with you, uses {a} to attack the label in the press.'), { m: mgrName(s, m), a: a.name }), 'bad');
    emitEvent(s, r, 'dsp15_press', { act: id, w: s.week, fee: claimOf(s, a), lead: mgrName(s, m), mk: mgrKey(m.id), clean: Math.round(cleanBooks(s).p * 100), court: Math.round(courtOdds(s) * 100) });
    return;
  }
}

// ---------------------------------------------------------------- 9. equipe sobrecarregada → lealdade e aliciamento

export function staffStrain(s: GameState, r: Rng): void {
  const C = cap14(s), cw = crew(s);
  for (const rl of roleLoads(s)) {
    const k = C.strain[rl.role] ?? 0;
    if (k < 2) continue;
    for (const m of rl.staff) {
      const car = careerOf(s, m);
      car.loyalty = clamp(car.loyalty - 3, 0, 100);
      if (!cw.poach && m.skill >= 60 && r.chance(0.12)) {
        const rivals = Object.values(s.labels).filter((x) => x.active).sort((a, b) => a.id.localeCompare(b.id));
        if (!rivals.length) continue;
        const rv = r.pick(rivals).name;
        cw.poach = { id: m.id, until: s.week + 6, rival: rv };
        say(s, fmtL(l('{b} soube que {n} ({r}) está sobrecarregado(a) há {k} meses ({l}% da carga) e faz uma proposta. Cubra em 6 semanas ou alivie a função.', '{b} heard {n} ({r}) has been overloaded for {k} months ({l}% load) and makes an offer. Match within 6 weeks or ease the role.'), { b: rv, n: m.name, r: rl.name, k, l: rl.load }), 'bad');
      }
    }
    if (k === 2) say(s, fmtL(l('Sobrecarga em {r}: a lealdade da equipe cai a cada mês assim (e rivais farejam).', 'Overload in {r}: staff loyalty drops every month like this (and rivals take notice).'), { r: rl.name }), 'info', false);
  }
}

// ---------------------------------------------------------------- 10. esnobada → moral, arcos, júri com memória

export function snubLinks(s: GameState): void {
  const st = lk16(s);
  for (const [y, id, a3, winner] of aw15(s).snubs) {
    const k = `${y}:${id}:${a3}`;
    if (st.sn[k]) continue;
    st.sn[k] = 1;
    const a = s.acts[id];
    if (!a || y < s.year - 1) continue;
    for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.morale = clamp(p.morale - 4, 0, 100); }
    arcAdd(s, id, 'snubbed', fmtL(l('fomos esnobados no prêmio de {y}: {w} levou Artista do Ano.', 'we were snubbed at the {y} awards: {w} took Artist of the Year.'), { y, w: winner }), 0);
  }
}
registerDecisionListener('links16:snub', (s, ev, opt) => {
  if (ev !== 'aw15_snub') return;
  const sn = aw15(s).snubs[0];
  if (!sn) return;
  const [y, id] = sn;
  lk16(s).jy[id] = [y, opt];
  const w = opt === 'protest' ? 0.15 : opt === 'boycott' ? 0.1 : -0.12;
  arcAdd(s, id, `snub_${opt}`, fmtL(opt === 'grace' ? l('na esnobada de {y}, você aplaudiu o rival em vez de brigar por nós.', 'at the {y} snub, you applauded the rival instead of fighting for us.') : l('na esnobada de {y}, você brigou por nós.', 'at the {y} snub, you fought for us.'), { y }), w);
});
/** Memória do júri: quem foi esnobado nos dois últimos anos tem simpatia — mais se o selo aplaudiu, quase nada se protestou. */
export function juryMem16(s: GameState, actId: string, a3: string): { k: number; why?: L } {
  if (OFF16.has('jury')) return { k: 1 };
  const sn = aw15(s).snubs.find((x) => x[1] === actId && x[2] === a3 && s.year - x[0] >= 1 && s.year - x[0] <= 2);
  if (!sn) return { k: 1 };
  const o = lk16(s).jy[actId]?.[0] === sn[0] ? lk16(s).jy[actId][1] : '';
  const k = o === 'grace' ? 1.2 : o === 'protest' ? 1.03 : 1.1;
  return { k, why: fmtL(o === 'grace' ? l('o júri lembra da elegância na esnobada de {y}', 'the jury remembers the grace after the {y} snub') : o === 'protest' ? l('o júri não esqueceu o protesto de {y}', 'the jury has not forgotten the {y} protest') : l('o júri sente que deve uma a {a} desde {y}', 'the jury feels it owes {a} one since {y}'), { y: sn[0], a: s.acts[actId]?.name ?? '' }) };
}
juryMemHook.f = (s, actId, a3) => juryMem16(s, actId, a3).k;
export function juryPayback(s: GameState): void {
  const aw = ch7(s).awards;
  const y = aw.length ? aw[aw.length - 1].year : -1;
  for (const x of aw) {
    if (x.year !== y || x.cat !== 'artist' || !x.byPlayer || !x.actId) continue;
    const j = juryMem16(s, x.actId, x.a3);
    if (j.k > 1 && j.why) say(s, fmtL(l('{a} leva Artista do Ano — {w}.', '{a} wins Artist of the Year — {w}.'), { a: s.acts[x.actId]?.name ?? '?', w: j.why }), 'good');
  }
}

// ---------------------------------------------------------------- aprofundamento: notoriedade de Gravadora atrai demos

export function labelDemos(s: GameState, r: Rng): void {
  if (s.config.role === 'artist' || !careers(s).active.includes('label')) return;
  const t = notoTier(s, 'label');
  if (t < 1 || !r.chance(0.04 * t)) return;
  const home = cityById[s.config.homeCity]?.market;
  const pool = Object.values(s.acts).filter((a) => !a.owner && (a.status === 'emerging' || a.status === 'active') && !s.knowledge[a.id] && a.fame <= 15 + t * 10).sort((a, b) => a.id.localeCompare(b.id));
  const a = r.weighted(pool, (x) => (cityById[x.city]?.market === home ? 3 : 1) * (1 + x.potential / 50));
  if (!a) return;
  s.knowledge[a.id] = { actId: a.id, degree: t >= 3 ? 2 : 1, stage: 'signal', bias: r.normal(0, t >= 3 ? 4 : 6), updatedWeek: s.week, source: 'demo' };
  const tx = fmtL(l('Chegou uma fita demo de {a} ({c}): artistas sem selo procuram quem tem nome — sua Gravadora é "{t}".', 'A demo tape from {a} ({c}) arrived: unsigned acts seek out names — your Label is "{t}".'), { a: a.name, c: cityById[a.city]?.name ?? a.city, t: TIERS[t].name });
  const nv = noto(s); nv.log.push({ y: s.year, m: s.month, c: 'label', d: 0, t: tx }); if (nv.log.length > 40) nv.log.shift();
  say(s, tx, 'info');
}

// ---------------------------------------------------------------- evento de luto

deferEvents<EventDef>([
  {
    id: 'lk16_grief', cat: 'people', tone: 'bad', tags: [], cooldown: 3, forcedOnly: true,
    title: l('{q}, de {act}, está de luto', '{q} of {act} is grieving'),
    text: l('{q} perdeu {rel} ({p}). A banda espera sua palavra: a agenda segue, para, ou a dor vira música?', '{q} lost their {relEn} ({p}). The band awaits your word: does the schedule go on, stop, or does the pain become music?'),
    options: [
      { id: 'record', label: l('Transformar a dor em disco', 'Turn the pain into a record'), hint: l('Por 6 meses as faixas gravadas saem +6% melhores; inspiração +10, estresse +6.', 'For 6 months recorded tracks come out +6% better; inspiration +10, stress +6.'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (!a) return; for (const pid of a.members) { const p = s.persons[pid]; if (p?.name === c.q) { p.inspiration = clamp(p.inspiration + 10, 0, 100); p.stress = clamp(p.stress + 6, 0, 100); } } const g = lk16(s).gr[a.id]; if (g) g[1] = 's'; arcAdd(s, a.id, 'grief_song', fmtL(l('{q} transformou a perda de {p} em música, com o seu apoio ({y}).', '{q} turned the loss of {p} into music, with your support ({y}).'), { q: String(c.q), p: String(c.p), y: s.year }), 0.05); remember(s, 'grief16', fmtL(l('{q} ({a}) grava sobre a perda de {p}.', '{q} ({a}) records about losing {p}.'), { q: String(c.q), a: a.name, p: String(c.p) }), { actId: a.id }); } },
      { id: 'push', label: l('A agenda não para', 'The schedule does not stop'), hint: l('Nada pausa, mas faixas −4% por 6 meses; estresse +12, ressentimento +10, confiança −6 (arco −).', 'Nothing pauses, but tracks −4% for 6 months; stress +12, resentment +10, trust −6 (arc −).'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (!a) return; a.trust = clamp(a.trust - 6, 0, 100); const g = lk16(s).gr[a.id]; if (g) g[1] = 'p'; for (const pid of a.members) { const p = s.persons[pid]; if (p?.name === c.q) { p.stress = clamp(p.stress + 12, 0, 100); p.resentment = clamp(p.resentment + 10, 0, 100); } } arcAdd(s, a.id, 'grief_push', fmtL(l('quando {q} perdeu {p}, o selo não deu nem uma semana ({y}).', 'when {q} lost {p}, the label did not give us a week ({y}).'), { q: String(c.q), p: String(c.p), y: s.year }), -0.2); } },
      { id: 'rest', label: l('Um mês de luto, sem cobrança', 'A month of mourning, no pressure'), hint: l('Pausa de 4 semanas; estresse −12, confiança +6; o artista lembra (arco +).', '4-week pause; stress −12, trust +6; the act remembers (arc +).'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (!a) return; a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 4); a.trust = clamp(a.trust + 6, 0, 100); for (const pid of a.members) { const p = s.persons[pid]; if (p?.name === c.q) p.stress = clamp(p.stress - 12, 0, 100); } const g = lk16(s).gr[a.id]; if (g) g[1] = 'r'; arcAdd(s, a.id, 'grief_rest', fmtL(l('quando {q} perdeu {p}, você parou tudo por nós ({y}).', 'when {q} lost {p}, you stopped everything for us ({y}).'), { q: String(c.q), p: String(c.p), y: s.year }), 0.15); } },
    ],
  },
]);

// ---------------------------------------------------------------- ganchos

registerSimHook('month', 'links16', (s) => {
  if (!OFF16.has('noto')) fameToNoto(s);
  if (!OFF16.has('friend')) friendTips(s, rng(s, 'friend'));
  if (!OFF16.has('kin')) kinLinks(s);
  if (!OFF16.has('media')) mediaHype(s);
  if (!OFF16.has('press')) feudPress(s, rng(s, 'press'));
  if (!OFF16.has('staff')) staffStrain(s, rng(s, 'staff'));
  if (!OFF16.has('snub')) snubLinks(s);
  if (!OFF16.has('demo')) labelDemos(s, rng(s, 'demo'));
});
registerSimHook('year', 'links16', (s) => juryPayback(s));
