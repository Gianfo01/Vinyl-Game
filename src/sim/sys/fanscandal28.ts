// Rodada 28 (Fase 8, I13) — FACÇÕES DE FÃS × ESCÂNDALO. Antes todo escândalo produzia a mesma reação (scandal17 só
// amortecia pelo núcleo; cancel19 tirava sempre −10 do mainstream e −5 da comunidade). Agora cada facção do fans18
// (puristas, mainstream, colecionadores, comunidade) lê o TIPO do escândalo pela sua régua:
//   • puristas DEFENDEM o artista em blasfêmia/política (e em drogas, se o gênero é rebelde) e ABANDONAM por dinheiro;
//   • mainstream foge de quase tudo (violência, ofensa, sexo);
//   • colecionadores mal ligam (e às vezes compram mais — o disco "proibido");
//   • comunidade abraça causa política e surto (empatia), mas não perdoa violência nem ofensa.
// A postura de cada facção = régua do tipo + lealdade da base + gênero rebelde + um sorteio pequeno semeado pelo conteúdo
// do fato (factSeedKey17 — um fato a mais em outro sistema não muda a reação). Efeitos: humor da facção (fac18),
// fãs do núcleo/ativos que ficam ou saem, lealdade, haters. Quando uma facção grande defende e outra grande abandona,
// a base RACHA (fato `fan_split`, racha registrado, haters crescem); quando as grandes defendem, os fãs FECHAM com o
// artista (fato `fan_defend`, núcleo cresce, o escândalo vira bandeira). Só atos do jogador (o fans18 só guarda os seus).

import { Rng, clamp } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import { emitFact, factSeedKey17, onFact, type Fact } from '../facts17';
import { SCANDAL_NAME, type ScandalKind } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL } from '../util';
import { FAC18, FAC_NAME18, factions18, fan18, type Fac18 } from './fans18';

export type FKind28 = ScandalKind | 'founder';
const KINDS28: FKind28[] = ['drugs', 'sex', 'violence', 'blasphemy', 'politics', 'money', 'conduct', 'offense', 'meltdown', 'crime', 'founder'];
/** Régua de cada facção por tipo (−1 abandona … +1 defende), na ordem do FAC18: purist, main, coll, comm. */
export const STANCE28: Record<FKind28, [number, number, number, number]> = {
  drugs: [0.1, -0.55, 0, -0.2],
  sex: [-0.3, -0.5, -0.1, -0.4],
  violence: [-0.5, -0.7, -0.3, -0.7],
  blasphemy: [0.6, -0.45, 0.15, 0],
  politics: [0.5, -0.35, 0, 0.6],
  money: [-0.7, -0.1, -0.3, -0.5],
  conduct: [-0.2, -0.4, 0, -0.35],
  offense: [-0.3, -0.6, -0.1, -0.6],
  meltdown: [0.2, -0.3, 0.2, 0.35],
  crime: [-0.4, -0.6, -0.2, -0.4],
  founder: [-0.3, -0.2, -0.35, -0.55],
};
const REBEL = new Set(['rock', 'hiphop', 'electronic']);

export interface React28 { w: number; act: string; kind: FKind28; sev: number; st: Record<Fac18, number>; wt: Record<Fac18, number>; out: 'split' | 'defend' | 'mixed' | 'leave'; text: L }
export interface FS28State { log: React28[] }
declare module '../ext4' { interface Ext4 { fs28: FS28State } }
const fresh = (): FS28State => ({ log: [] });
registerExt4('fs28', fresh);
export function fs28(s: GameState): FS28State { const x = s.x4 as unknown as { fs28?: FS28State }; const st = (x.fs28 ??= fresh()); st.log ??= []; return st; }
export const OFF_FS28: { on?: boolean } = {};

/** Tipo do escândalo pelo fato (data.kind do scandal17, tag, ou fundador). */
export function kindOf28(f: Pick<Fact, 'tags' | 'data'>): FKind28 {
  if (f.tags.includes('founder')) return 'founder';
  const d = f.data?.kind;
  if (typeof d === 'string' && (KINDS28 as string[]).includes(d)) return d as FKind28;
  return (KINDS28.find((k) => f.tags.includes(k)) ?? 'conduct');
}

/** Postura de cada facção (pura; −1..1). `noise` vem do sorteio semeado (0 nos testes de régua). */
export function stance28(s: GameState, a: Act, kind: FKind28, noise: number[] = [0, 0, 0, 0]): Record<Fac18, number> {
  const f = fan18(s, a.id, false)!;
  const base = STANCE28[kind];
  const rebel = REBEL.has(familyOf(a.genre));
  const out = {} as Record<Fac18, number>;
  FAC18.forEach((k, i) => {
    let v = base[i] + (f.loy - 50) / 250 + f.fac[i] / 200 + noise[i];
    if (rebel && k === 'purist' && (kind === 'drugs' || kind === 'offense' || kind === 'meltdown')) v += 0.3;
    if (rebel && k === 'main' && kind === 'drugs') v += 0.1;
    out[k] = clamp(v, -1, 1);
  });
  return out;
}

/** Aplica a reação (chamada pelo ouvinte; exportada para testes). */
export function react28(s: GameState, a: Act, f: Pick<Fact, 'kind' | 'actors' | 'w' | 'text' | 'tags' | 'data' | 'severity' | 'id'>): React28 | null {
  const fa = fan18(s, a.id);
  if (!fa) return null;
  const kind = kindOf28(f);
  const sev = clamp(f.severity, 0, 100);
  const r = Rng.fromSeed(`${s.config.seed}|fs28|${factSeedKey17(f)}|${a.id}`);
  const noise = FAC18.map(() => r.float(-0.15, 0.15));
  const st = stance28(s, a, kind, noise);
  const wt = factions18(s, a, fa);
  const k = sev / 100;
  let dCore = 0, dAct = 0;
  FAC18.forEach((fac, i) => {
    fa.fac[i] = clamp(fa.fac[i] + st[fac] * 30 * k, -50, 50);
    // quem defende traz gente para o núcleo; quem abandona leva ativos e núcleo embora (na proporção do peso da facção)
    if (st[fac] > 0.2) dCore += wt[fac] * st[fac] * k * 0.08;
    else if (st[fac] < -0.2) { dAct += wt[fac] * st[fac] * k * 0.12; dCore += wt[fac] * st[fac] * k * 0.05; }
  });
  a.fans.core = Math.max(0, Math.round(a.fans.core * (1 + dCore)));
  a.fans.active = Math.max(0, Math.round(a.fans.active * (1 + dAct)));
  const big = (fac: Fac18) => wt[fac] >= 0.2;
  const defenders = FAC18.filter((fac) => big(fac) && st[fac] > 0.25);
  const leavers = FAC18.filter((fac) => big(fac) && st[fac] < -0.25);
  const names = (xs: Fac18[]) => xs.map((x) => FAC_NAME18[x].name.pt).join(', ');
  const namesEn = (xs: Fac18[]) => xs.map((x) => FAC_NAME18[x].name.en).join(', ');
  let out: React28['out'];
  let text: L;
  if (defenders.length && leavers.length) {
    out = 'split';
    fa.loy = clamp(fa.loy - 4, 0, 100);
    text = fmtL(l('A base de {a} racha com o escândalo ({k}): {d} defendem, {x} vão embora.', '{a}\'s fanbase splits over the scandal ({k}): {de} defend, {xe} walk away.'),
      { a: a.name, k: SCANDAL_NAME[kind as ScandalKind] ?? l('fundador', 'founder'), d: names(defenders), x: names(leavers), de: namesEn(defenders), xe: namesEn(leavers) });
  } else if (defenders.length) {
    out = 'defend';
    fa.loy = clamp(fa.loy + 3, 0, 100);
    text = fmtL(l('Os fãs fecham com {a}: {d} transformam o escândalo em bandeira.', 'Fans close ranks around {a}: {de} turn the scandal into a banner.'), { a: a.name, d: names(defenders), de: namesEn(defenders) });
  } else if (leavers.length) {
    out = 'leave';
    fa.loy = clamp(fa.loy - 2, 0, 100);
    text = fmtL(l('{x} se afastam de {a} depois do escândalo.', '{xe} drift away from {a} after the scandal.'), { a: a.name, x: names(leavers), xe: namesEn(leavers) });
  } else {
    out = 'mixed';
    text = fmtL(l('Os fãs de {a} se dividem em silêncio; ninguém sai, ninguém defende.', '{a}\'s fans are quietly divided; nobody leaves, nobody defends.'), { a: a.name });
  }
  const rec: React28 = { w: s.week, act: a.id, kind, sev, st, wt, out, text };
  const lg = fs28(s).log;
  lg.unshift(rec);
  if (lg.length > 40) lg.length = 40;
  if (out === 'split' || out === 'defend') {
    emitFact(s, { kind: out === 'split' ? 'fan_split' : 'fan_defend', actors: [a.id, 'player'], severity: Math.round(sev * 0.7), visibility: 'public',
      tags: ['fans', 'fs28', kind, out === 'split' ? 'bad' : 'good'], text, src: 'fs28', cause: [f.id], data: { kind } });
  }
  return rec;
}

onFact('scandal', (s, f) => {
  if (OFF_FS28.on || f.visibility === 'secret') return;
  // escândalo do fundador: reagem os atos do jogador que estão no elenco daquele selo (raro); senão, o ato do fato
  const ids = f.tags.includes('founder') ? f.actors.slice(1) : [f.actors[0]];
  for (const id of ids) {
    const a = s.acts[id];
    if (!a || !(a.owner === 'player' || a.playerBand)) continue;
    react28(s, a, f);
  }
}, 'fs28:scandal');

// consumidores dos fatos novos: o racha alimenta haters e toxicidade do fandom; a defesa vira momento (o escândalo-bandeira)
onFact('fan_split', (s, f) => {
  const fd = s.fandoms[f.actors[0]];
  if (fd) { fd.haters += Math.round(f.severity * 14); fd.toxicity = clamp((fd.toxicity ?? 0) + f.severity / 10, 0, 100); }
}, 'fs28:split');
onFact('fan_defend', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (a) a.momentum = clamp(a.momentum + Math.round(f.severity / 12), 0, 100);
}, 'fs28:defend');
