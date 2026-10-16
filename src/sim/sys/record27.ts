// r27 (M1) — GRAVAR JOGÁVEL: cada dia de estúdio vira um take com decisão no meio. Por cima da sessão que já
// existe (studio.ts startSession/sessionDay/resolveTake): o jogador vê cansaço e clima da banda (o estado real das
// pessoas, que muda a cada take) e escolhe — aceitar o melhor take, insistir em mais um, trocar um músico de sessão,
// tentar um arranjo novo, deixar a banda brigar ou dar uma pausa. Há chance de "tomada mágica" e de acidente feliz
// que vira timbre de assinatura (sound.t); falhas custam dias (diária de estúdio) e dinheiro.
// No fim, mixagem/master: "mais rádio", "mais crua" ou "mais moderna" — mexe em produção/performance/
// originalidade e no som (polimento, voz, eletrônico), que o rádio, os canais e a crítica já leem.
//
// Puro e determinístico: cada take sorteia de Rng.fromSeed(seed:m1r:sessão:dia). A faixa fecha pelo mesmo caminho
// do modo rápido (fixSong27 → fixSong). Quem não abre o jogo (bots, delegado, autoplay) segue igual a antes.

import { clamp, Rng } from '../../core/rng';
import { APPROACHES } from '../../data/rules';
import { familyOf, l, type L } from '../../data/world';
import { actState, actTalent } from '../people';
import { recordingCost, songQ } from '../production';
import { fixSong27, sessionDays } from '../studio';
import type { Act, GameState, Person, Song } from '../types';
import type { StudioSession } from '../xtypes';
import { electronicCap } from './sound';
import { TIMBRES } from './sound/timbre';
import { fmtL, money, post } from '../util';
import { relAdd } from '../opinion';

export type RecMove27 = 'keep' | 'another' | 'musician' | 'arrange' | 'fight' | 'relax';
export type Mix27 = 'radio' | 'raw' | 'modern';
export interface RecTake27 { n: number; q: number; note: L; magic?: boolean; fail?: boolean; accident?: string }
export interface RecSong27 { songId: string; title: string; perf: number; q: number; notes: L[]; magic?: boolean; timbre?: string }
export interface Rec27 {
  v: 1; seed: string; sessId: string; actId: string;
  songIds: string[]; idx: number;
  takes: RecTake27[];
  /** dias já usados por este jogo (cada take ou pausa = 1 dia) e dias que ainda cabiam na sessão marcada */
  day: number; planned: number; extraDays: number; extraCost: number; dayCost: number;
  mods: { perf: number; sd: number };
  arr: number; musician: boolean; arranged: boolean; fought: number;
  accident?: { songId: string; timbre: string };
  magic: string[];
  results: RecSong27[];
  mix?: Mix27; phase: 'takes' | 'mix' | 'done';
  log: L[];
}

export const MOVES27: Record<RecMove27, { name: L; desc: L }> = {
  keep: { name: l('Aceitar o melhor take', 'Accept the best take'), desc: l('Fecha a faixa com o melhor take até agora.', 'Closes the track with the best take so far.') },
  another: { name: l('Insistir em mais um', 'Push for another take'), desc: l('+1 dia; cansa mais. Os primeiros takes aquecem, depois do 3º a banda perde o frescor.', '+1 day; more tiring. Early takes warm up, after the 3rd the band loses its spark.') },
  musician: { name: l('Trocar um músico de sessão', 'Swap in a session musician'), desc: l('Cachê na hora; o take fica mais firme, mas a faixa perde um pouco de alma e alguém da banda se magoa.', 'Fee up front; takes get tighter, but the track loses a bit of soul and a band member is hurt.') },
  arrange: { name: l('Tentar um arranjo novo', 'Try a new arrangement'), desc: l('Mais originalidade e mais variação: pode sair genial ou desandar. Às vezes nasce um timbre de assinatura.', 'More originality and more variance: it may be brilliant or fall apart. Sometimes a signature sound is born.') },
  fight: { name: l('Deixar a banda brigar', 'Let the band fight it out'), desc: l('Catarse ou desastre: o próximo take sobe ou desce bastante; estresse sobe.', 'Catharsis or disaster: the next take swings a lot; stress rises.') },
  relax: { name: l('Dar uma pausa', 'Take a break'), desc: l('Um dia sem gravar: cansaço cai, o clima melhora.', 'A day without recording: fatigue drops, mood improves.') },
};

export const MIX27: Record<Mix27, { name: L; desc: L; fx: { perf: number; prod: number; or: number }; snd: Partial<Record<number, number>>; cost: number }> = {
  radio: { name: l('Mais rádio', 'More radio'), desc: l('Polida, voz na frente, graves contidos. Rádio e playlists gostam; a crítica torce o nariz.', 'Polished, vocals up front, tidy low end. Radio and playlists like it; critics sniff.'), fx: { perf: 0, prod: 5, or: -4 }, snd: { 4: 12, 3: 8 }, cost: 0 },
  raw: { name: l('Mais crua', 'More raw'), desc: l('Como foi tocada: chiado, ar da sala. A crítica e os fãs fiéis amam; o rádio comercial torce o nariz.', 'As it was played: hiss, room air. Critics and core fans love it; commercial radio sniffs.'), fx: { perf: 3, prod: -4, or: 5 }, snd: { 4: -14, 0: 4 }, cost: 0 },
  modern: { name: l('Mais moderna', 'More modern'), desc: l('Camadas eletrônicas e truques de agora. Soa à frente do tempo — custa horas a mais de mixagem.', 'Electronic layers and tricks of the moment. Sounds ahead of its time — costs extra mixing hours.'), fx: { perf: 0, prod: 3, or: 3 }, snd: { 2: 8, 5: 6 }, cost: 400 },
};

const rngAt = (rc: Pick<Rec27, 'seed' | 'sessId'>, tag: string | number) => Rng.fromSeed(`${rc.seed}:m1r:${rc.sessId}:${tag}`);
const sessOf = (s: GameState, rc: Pick<Rec27, 'sessId'>) => s.sessions.find((x) => x.id === rc.sessId);
const members = (s: GameState, a: Act): Person[] => a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
const takesPer = (approach: string) => (approach === 'meticulous' ? 3 : approach === 'spontaneous' ? 1 : 2);

/** Barras ao vivo: cansaço e clima médios da banda (estado real das pessoas). */
export function bars27(s: GameState, actId: string): { fatigue: number; mood: number; stress: number } {
  const a = s.acts[actId];
  if (!a) return { fatigue: 0, mood: 50, stress: 0 };
  const st = actState(s, a);
  return { fatigue: Math.round(st.fatigue), mood: Math.round(clamp(st.morale - st.stress * 0.3 + 15, 0, 100)), stress: Math.round(st.stress) };
}

/** Pode jogar a sessão? Precisa estar aberta, ser sua e ter faixa por gravar. */
export function recordBlock27(s: GameState, sessId: string): L | null {
  const sess = s.sessions.find((x) => x.id === sessId);
  if (!sess || sess.done) return l('Sessão encerrada.', 'Session closed.');
  const a = s.acts[sess.actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (a.hiatusUntil && a.hiatusUntil > s.week) return l('O ato está afastado.', 'The act is on a break.');
  if (!sess.songIds.some((id) => s.songs[id] && !s.songs[id].recorded)) return l('Nada a gravar nesta sessão.', 'Nothing left to record in this session.');
  return null;
}

/** Abre o jogo numa sessão (recém-marcada ou em andamento): o primeiro take sai na hora. */
export function startRecord27(s: GameState, sessId: string): Rec27 | L {
  const why = recordBlock27(s, sessId);
  if (why) return why;
  const sess = sessOf(s, { sessId })!;
  const songIds = sess.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded);
  const perDay = Math.max(1, Math.round(recordingCost(s, sess.tier, sess.approach, songIds.length) / Math.max(1, sessionDays(songIds.length, sess.approach))));
  const rc: Rec27 = {
    v: 1, seed: String(s.config.seed), sessId, actId: sess.actId, songIds, idx: 0, takes: [],
    day: 0, planned: Math.max(1, sess.days - sess.dayDone), extraDays: 0, extraCost: 0, dayCost: Math.max(money(s, 150), perDay),
    mods: { perf: 0, sd: 1 }, arr: 0, musician: false, arranged: false, fought: 0, magic: [], results: [], phase: 'takes', log: [],
  };
  // takes que a sessão já gravou (dias passados) entram na conta da faixa da vez
  const prev = sess.takes[songIds[0]] ?? [];
  for (const tk of prev) rc.takes.push({ n: tk.n, q: tk.quality, note: tk.note });
  sess.decision = undefined;
  if (!rc.takes.length) take(s, rc);
  return rc;
}

/** Base do take (a mesma conta de takeQuality, com o cansaço e o clima do momento). */
export function takeBase27(s: GameState, rc: Rec27): number {
  const a = s.acts[rc.actId];
  const sess = sessOf(s, rc);
  if (!a || !sess) return 0;
  const t = actTalent(s, a);
  const st = actState(s, a);
  const ap = APPROACHES.find((x) => x.id === sess.approach) ?? APPROACHES[1];
  return (t.voice * 0.55 + t.instr * 0.45) * 0.92 + a.rehearsed * 0.6 + (st.morale - 50) / 8 - st.fatigue / 12 + ap.perf + rc.mods.perf;
}

function spendDay(s: GameState, rc: Rec27): void {
  rc.day += 1;
  if (rc.day > rc.planned) {
    rc.extraDays += 1;
    rc.extraCost += rc.dayCost;
    const a = s.acts[rc.actId];
    post(s, `rec27:${rc.sessId}:${rc.day}`, -rc.dayCost, 'recording', `Diária extra de estúdio ${a?.name ?? ''}`);
  }
}

function take(s: GameState, rc: Rec27, push = false): RecTake27 {
  const a = s.acts[rc.actId]!;
  const r = rngAt(rc, `d${rc.day}:${rc.idx}:${rc.takes.length}`);
  const base = takeBase27(s, rc);
  const n = rc.takes.length + 1;
  const curve = n === 1 ? -2 : n <= 3 ? 2 : -(n - 3) * 2;
  const fat = actState(s, a).fatigue;
  const fail = r.chance(clamp((fat - 55) / 110, 0, 0.35));
  let q = clamp(base + curve + r.normal(0, 7 * rc.mods.sd) - (fail ? 14 : 0), 5, 100);
  const magic = !fail && q >= base + 9;
  if (magic) q = clamp(q + 4, 5, 100);
  let accident: string | undefined;
  if (rc.arranged && !fail && !rc.accident && r.chance(0.2)) {
    const so = s.songs[rc.songIds[rc.idx]];
    const fam = familyOf(a.genre);
    const pool = TIMBRES.filter((x) => (x.from ?? 0) <= s.year && !(so?.sound?.t ?? []).includes(x.id));
    const fit = pool.filter((x) => x.fam?.includes(fam));
    const tb = (fit.length ? r.pick(fit) : pool.length ? r.pick(pool) : undefined);
    if (tb && so) { accident = tb.id; rc.accident = { songId: so.id, timbre: tb.id }; }
  }
  const note = fail ? r.pick([l('a voz falhou no refrão', 'the voice cracked on the chorus'), l('a fita enroscou', 'the tape jammed'), l('a corda arrebentou', 'a string snapped')])
    : magic ? l('tomada mágica!', 'magic take!') : accident ? l('acidente feliz: um som novo apareceu', 'happy accident: a new sound appeared')
      : q > base + 5 ? l('take inspirado', 'inspired take') : q < base - 6 ? l('desafinou no refrão', 'went off in the chorus') : l('take sólido', 'solid take');
  const tk: RecTake27 = { n, q: Math.round(q), note, magic: magic || undefined, fail: fail || undefined, accident };
  rc.takes.push(tk);
  spendDay(s, rc);
  // cada take cansa como um dia de sessão (sessionDay: +1,2); insistir pesa mais
  for (const p of members(s, a)) p.fatigue = clamp(p.fatigue + 1.2 + (push ? 2 : 0), 0, 100);
  const sess = sessOf(s, rc);
  if (sess) {
    sess.dayDone = Math.min(sess.days, sess.dayDone + 1);
    (sess.takes[rc.songIds[rc.idx]] ??= []).push({ n, quality: tk.q, note });
  }
  if (magic) rc.magic.push(rc.songIds[rc.idx]);
  return tk;
}

/** Uma decisão. Devolve o take novo (se houve) ou null. */
export function moveRecord27(s: GameState, rc: Rec27, move: RecMove27): RecTake27 | null | L {
  if (rc.phase !== 'takes') return l('Os takes acabaram.', 'Takes are over.');
  const a = s.acts[rc.actId];
  const sess = sessOf(s, rc);
  if (!a || !sess || sess.done) return l('Sessão encerrada.', 'Session closed.');
  const ms = members(s, a);
  const r = rngAt(rc, `m${rc.day}:${rc.idx}:${move}`);
  switch (move) {
    case 'keep': return keep(s, rc), null;
    case 'another': return take(s, rc, true);
    case 'musician': {
      if (rc.musician) return l('Já há um músico de sessão nesta faixa.', 'There is already a session musician on this track.');
      const fee = money(s, 250 + 120 * sess.tier);
      post(s, `rec27m:${rc.sessId}:${rc.idx}`, -fee, 'recording', `Músico de sessão ${a.name}`);
      rc.extraCost += fee;
      rc.musician = true;
      rc.mods.perf += 7;
      const hurt = [...ms].sort((x, y) => x.skills.instr - y.skills.instr)[0];
      if (hurt) hurt.morale = clamp(hurt.morale - 4, 0, 100);
      rc.log.push(fmtL(l('Músico de sessão no lugar de {p} (cachê {c}).', 'Session musician in for {p} (fee {c}).'), { p: hurt?.name ?? '', c: fee }));
      return take(s, rc);
    }
    case 'arrange': {
      if (rc.arranged) return l('O arranjo já foi refeito nesta faixa.', 'The arrangement was already redone on this track.');
      rc.arranged = true;
      rc.arr += 6;
      rc.mods.sd = 1.6;
      return take(s, rc);
    }
    case 'fight': {
      const mood = bars27(s, a.id).mood;
      const good = r.chance(clamp(0.45 + (mood - 50) / 200, 0.2, 0.7));
      rc.fought += 1;
      for (const p of ms) p.stress = clamp(p.stress + 6, 0, 100);
      if (good) { rc.mods.perf += 6; for (const p of ms) p.morale = clamp(p.morale + 2, 0, 100); rc.log.push(l('A briga virou catarse: todo mundo tocou com raiva boa.', 'The fight turned into catharsis: everyone played with good anger.')); }
      else {
        rc.mods.perf -= 5;
        for (const p of ms) { p.morale = clamp(p.morale - 5, 0, 100); for (const q of ms) if (q !== p) relAdd(s, p.id, q.id, -4); }
        rc.log.push(l('A briga azedou: portas batendo e um take nervoso.', 'The fight soured: doors slammed and a nervous take.'));
      }
      return take(s, rc);
    }
    case 'relax': {
      spendDay(s, rc);
      for (const p of ms) { p.fatigue = clamp(p.fatigue - 10, 0, 100); p.morale = clamp(p.morale + 4, 0, 100); p.stress = clamp(p.stress - 4, 0, 100); }
      rc.mods.perf = Math.min(rc.mods.perf, 6);
      rc.log.push(l('Um dia de pausa: café, conversa e ouvidos frescos.', 'A day off: coffee, talk and fresh ears.'));
      return null;
    }
  }
}

function keep(s: GameState, rc: Rec27): void {
  const sess = sessOf(s, rc)!;
  const songId = rc.songIds[rc.idx];
  const so = s.songs[songId];
  if (so && !so.recorded && rc.takes.length) {
    const best = Math.max(...rc.takes.map((x) => x.q));
    const r = rngAt(rc, `fix:${songId}`);
    fixSong27(s, r, sess, songId, best);
    const notes: L[] = [];
    const delta = { perf: 0, prod: 0, or: rc.arr - (rc.musician ? 2 : 0) };
    if (rc.arr) notes.push(fmtL(l('arranjo novo: +{n} originalidade', 'new arrangement: +{n} originality'), { n: rc.arr }));
    if (rc.musician) notes.push(l('músico de sessão: take firme, −2 originalidade', 'session musician: tight take, −2 originality'));
    adjust(so, delta);
    let timbre: string | undefined;
    if (rc.accident?.songId === songId) {
      timbre = rc.accident.timbre;
      so.sound ??= { v: [50, 50, 50, 50, 50, 50, 50, 50, 50] };
      if (!(so.sound.t ?? []).includes(timbre)) so.sound.t = [...(so.sound.t ?? []), timbre].slice(-3);
      notes.push(l('acidente feliz virou timbre da faixa', 'a happy accident became the track\'s sound'));
    }
    const magic = rc.takes.some((x) => x.magic && x.q === best);
    if (magic) notes.push(l('tomada mágica', 'magic take'));
    rc.results.push({ songId, title: so.title, perf: Math.round(so.performance), q: Math.round(so.q), notes, magic: magic || undefined, timbre });
  }
  rc.idx += 1;
  rc.takes = [];
  rc.mods = { perf: 0, sd: 1 };
  rc.arr = 0; rc.musician = false; rc.arranged = false;
  while (rc.idx < rc.songIds.length && s.songs[rc.songIds[rc.idx]]?.recorded) rc.idx += 1;
  if (rc.idx >= rc.songIds.length) rc.phase = 'mix';
  else take(s, rc);
}

/** Muda atributos de uma faixa já fechada mantendo o que a equipe da casa somou ao Q (applyMods). */
function adjust(so: Song, d: { perf: number; prod: number; or: number }): void {
  const before = songQ(so);
  so.performance = clamp(so.performance + d.perf, 5, 100);
  so.production = clamp(so.production + d.prod, 5, 100);
  so.originality = clamp(so.originality + d.or, 0, 100);
  so.q = clamp(so.q + songQ(so) - before, 0, 100);
}

/** Prévia da mixagem: Q de cada faixa com a versão escolhida. */
export function mixPreview27(s: GameState, rc: Rec27, mix: Mix27): { songId: string; q: number }[] {
  const fx = MIX27[mix].fx;
  return rc.results.map((x) => {
    const so = s.songs[x.songId];
    if (!so) return { songId: x.songId, q: x.q };
    const c = { ...so };
    adjust(c, { perf: fx.perf, prod: fx.prod, or: fx.or });
    return { songId: x.songId, q: Math.round(c.q) };
  });
}

export const mixCost27 = (s: GameState, rc: Rec27, mix: Mix27): number => (MIX27[mix].cost ? money(s, MIX27[mix].cost * Math.max(1, rc.results.length)) : 0);

/** Fecha a mixagem/master e a sessão do jogo. */
export function mixRecord27(s: GameState, rc: Rec27, mix: Mix27): L | null {
  if (rc.phase !== 'mix') return l('Ainda há faixas a gravar.', 'There are still tracks to record.');
  const d = MIX27[mix];
  const cost = mixCost27(s, rc, mix);
  if (cost) { post(s, `rec27x:${rc.sessId}`, -cost, 'recording', 'Mixagem extra'); rc.extraCost += cost; }
  for (const x of rc.results) {
    const so = s.songs[x.songId];
    if (!so) continue;
    adjust(so, { perf: d.fx.perf, prod: d.fx.prod, or: d.fx.or });
    if (so.sound?.v) {
      const v = [...so.sound.v];
      for (const [i, k] of Object.entries(d.snd)) v[Number(i)] = clamp((v[Number(i)] ?? 50) + (k ?? 0), 0, 100);
      v[2] = Math.min(v[2], electronicCap(s));
      so.sound.v = v.map((x2) => Math.round(x2));
    }
    x.q = Math.round(so.q);
    x.perf = Math.round(so.performance);
  }
  rc.mix = mix;
  rc.phase = 'done';
  const sess = sessOf(s, rc);
  if (sess) {
    sess.days += rc.extraDays;
    sess.log.push(fmtL(l('Sessão jogada: {n} faixa(s), mixagem "{m}"{x}.', 'Played session: {n} track(s), "{m}" mix{x}.'), { n: rc.results.length, m: d.name, x: rc.extraDays ? fmtL(l(', {d} dia(s) extra', ', {d} extra day(s)'), { d: rc.extraDays }) : '' }));
  }
  return null;
}

/** "Saiu boa/fraca porque…" da gravação. */
export function explainRecord27(s: GameState, rc: Rec27): L[] {
  const out: L[] = [];
  const avg = rc.results.reduce((t, x) => t + x.q, 0) / Math.max(1, rc.results.length);
  out.push(avg >= 60 ? l('A gravação saiu forte porque…', 'The recording came out strong because…') : avg < 42 ? l('A gravação saiu fraca porque…', 'The recording came out weak because…') : l('A gravação saiu na média porque…', 'The recording came out average because…'));
  const b = bars27(s, rc.actId);
  if (b.fatigue > 55) out.push(fmtL(l('a banda chegou cansada (cansaço {f}): cada take perde ~{p} ponto(s)', 'the band was tired (fatigue {f}): each take loses ~{p} point(s)'), { f: b.fatigue, p: Math.round(b.fatigue / 12) }));
  if (rc.magic.length) out.push(fmtL(l('{n} tomada(s) mágica(s)', '{n} magic take(s)'), { n: rc.magic.length }));
  for (const x of rc.results) if (x.notes.length) out.push(fmtL(l('"{t}": {n}', '"{t}": {n}'), { t: x.title, n: { pt: x.notes.map((y) => y.pt).join('; '), en: x.notes.map((y) => y.en).join('; ') } }));
  for (const x of rc.log.slice(-3)) out.push(x);
  if (rc.extraDays) out.push(fmtL(l('{d} dia(s) além do previsto custaram {c}', '{d} day(s) over schedule cost {c}'), { d: rc.extraDays, c: rc.extraDays * rc.dayCost }));
  if (rc.mix) out.push(fmtL(l('Mixagem: {m} — {d}', 'Mix: {m} — {d}'), { m: MIX27[rc.mix].name, d: MIX27[rc.mix].desc }));
  return out;
}

/** Quantos takes o modo rápido daria por faixa nesta abordagem (para o texto da UI). */
export const quickTakes27 = (sess: StudioSession): number => takesPer(sess.approach);
