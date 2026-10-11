// Rodada 19 (Frente 9.3) — CRÉDITOS DIVIDIDOS, GHOSTWRITERS E PLÁGIO. Estende os camps do camps18 (que já fazem canção
// em grupo, pitching e o "cut-in" à Elvis):
//  • Divisão negociada por faixa (finance.setSplits): banda inteira em partes iguais (U2, R.E.M.), quem escreveu de verdade,
//    ou o líder com metade — cada escolha mexe em moral e ressentimento de cada um, e vira fato `cowrite_split`.
//  • Compositores de fora oferecem canções aos seus atos (com editora da época, rights18); você pode pedir crédito para o seu
//    artista (cut-in) e arriscar a oferta.
//  • Ghostwriter: escreve para a estrela sem aparecer. Cada hit aumenta o rancor; NDA segura, dinheiro cala, crédito resolve.
//    Se ele revelar tudo → escândalo (scandal17), rixa (feud18) e, muitas vezes, carreira solo (lineup16). Os ghostwriters
//    saem de quem acabou de aparecer no coral/concurso/camp (fatos choir_alumni / contest_winner / prodigy_found): cadeia 3.
//  • Plágio: hit seu acusado por um rival (brigar, dar crédito ou acordo), ou você processa um sucesso alheio. Depois de 2015
//    ("Blurred Lines") os processos dobram.

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, onFact, recentFacts } from '../facts17';
import { setSplits } from '../finance';
import { histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { langForCity, makePerson } from '../people';
import { composeSongs, songQ } from '../production';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState, Person, Song } from '../types';
import { fmtL, money, playerActs, post, staffSkill } from '../util';
import { headline19 } from './factlink19';
import { shield18, startFeud18 } from './feud18';
import { goSolo16 } from './lineup16';
import { registerDimAdj18 } from './quality18';

/** Editoras por época (nomes reais só com nomes reais ligados). */
const PUB19: [string, string, number, number][] = [
  ['M. Witmark & Sons', 'Edições Witmark', 1886, 1929], ['Chappell & Co.', 'Edições Chappell', 1890, 1987], ['Hill and Range', 'Edições Colina', 1945, 1975],
  ['Aldon Music', 'Edições Aldon', 1958, 1964], ['Jobete Music', 'Edições Jobete', 1959, 1997], ['Warner/Chappell', 'Grupo Editorial Norte', 1987, 2021],
  ['EMI Music Publishing', 'Edições Abbey', 1989, 2012], ['Sony/ATV', 'Edições Sol', 1995, 2019], ['Kobalt', 'Edições Cobalto', 2000, 9999], ['Sony Music Publishing', 'Edições Sol', 2019, 9999],
];
export function pubName19(s: GameState, r: Rng): string {
  const xs = PUB19.filter((p) => s.year >= p[2] && s.year <= p[3]);
  const p = xs.length ? r.pick(xs) : PUB19[0];
  return s.config.realNames ? p[0] : p[1];
}

export interface Ghost19 { id: string; pid: string; act: string; mine: boolean; since: number; songs: string[]; hits: number; nda: boolean; grudge: number; st: 'on' | 'out' | 'credit'; warned?: number; from?: string }
export interface Off19 { id: string; pid: string; act: string; pub: string; q: number; fee: number; until: number }
export interface Suit19 { id: string; dir: 'in' | 'out'; song: string; other: string; st: 'open' | 'court' | 'done'; odds: number; due?: number; amt: number; res?: L }
export interface Wr19State { gh: Ghost19[]; offers: Off19[]; suits: Suit19[]; seq: number; ghs: Record<string, string>; ext: Record<string, string>; chk: Record<string, 1>; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { wr19: Wr19State } }
const fresh = (): Wr19State => ({ gh: [], offers: [], suits: [], seq: 0, ghs: {}, ext: {}, chk: {}, log: [] });
registerExt4('wr19', fresh);
export function wr19(s: GameState): Wr19State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.wr19 ??= fresh()) as Wr19State;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
const log = (s: GameState, t: L) => { const st = wr19(s); st.log.push({ w: s.week, t }); if (st.log.length > 24) st.log.shift(); };
const usd = (v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;
const lead = (s: GameState, a: Act): Person | undefined => s.persons[a.leaderId ?? a.members[0]];
const relOf = (s: GameState, so: Song) => (so.releaseId ? s.releases[so.releaseId] : undefined);
/** Divide a obra depois do lançamento (setSplits só vale antes): `pid` entra com `share`, os outros encolhem. */
function cutIn(so: Song, pid: string, share: number): void {
  const base = so.splits?.length ? so.splits : so.writers.map((w) => ({ personId: w, share: 1 / Math.max(1, so.writers.length) }));
  so.splits = [...base.filter((x) => x.personId !== pid).map((x) => ({ personId: x.personId, share: x.share * (1 - share) })), { personId: pid, share }];
  if (!so.writers.includes(pid)) so.writers = [...so.writers, pid];
}

// ---------------------------------------------------------------- divisão negociada
export type SplitMode19 = 'band' | 'writers' | 'lead';
export const SPLIT19: Record<SplitMode19, { name: L; desc: L }> = {
  band: { name: l('Banda inteira, partes iguais', 'Whole band, equal shares'), desc: l('Todo mundo assina (U2, R.E.M.): une a banda, mas quem compõe de verdade se ressente.', 'Everyone signs (U2, R.E.M.): unites the band, but the real writers resent it.') },
  writers: { name: l('Quem escreveu, pelo mérito', 'Who wrote it, by merit'), desc: l('Proporcional ao talento de composição e letra de cada autor.', 'Proportional to each writer\'s songwriting and lyric skill.') },
  lead: { name: l('Líder com metade', 'Leader takes half'), desc: l('O líder fica com 50%, o resto divide. Clássico — e fonte clássica de separações.', 'The leader keeps 50%, the rest split. Classic — and a classic cause of breakups.') },
};
export function splitPlan19(s: GameState, songId: string, mode: SplitMode19): { personId: string; share: number }[] | null {
  const so = s.songs[songId], a = so && s.acts[so.actId];
  if (!so || !a) return null;
  const mem = a.members.filter((id) => s.persons[id]?.alive);
  if (mode === 'band') return mem.map((id) => ({ personId: id, share: 1 / Math.max(1, mem.length) }));
  const ws = so.writers.filter((id) => s.persons[id]);
  if (mode === 'writers') {
    const w = ws.map((id) => Math.max(5, (s.persons[id].skills.comp + s.persons[id].skills.lyr) / 2));
    const t = w.reduce((x, y) => x + y, 0) || 1;
    return ws.map((id, i) => ({ personId: id, share: w[i] / t }));
  }
  const ld = lead(s, a)?.id ?? ws[0];
  const rest = [...new Set([...ws, ...mem.slice(0, 2)])].filter((id) => id !== ld);
  return [{ personId: ld, share: rest.length ? 0.5 : 1 }, ...rest.map((id) => ({ personId: id, share: 0.5 / rest.length }))];
}
export function negotiateSplit19(s: GameState, songId: string, mode: SplitMode19): L | null {
  const so = s.songs[songId], a = so && s.acts[so.actId];
  if (!so || !a || a.owner !== 'player') return l('Escolha uma canção do seu elenco.', 'Pick a song from your roster.');
  const plan = splitPlan19(s, songId, mode);
  if (!plan?.length) return l('Sem autores.', 'No writers.');
  const fix = 1 - plan.reduce((t, x) => t + x.share, 0);
  plan[0].share += fix;
  const err = setSplits(s, songId, plan);
  if (err) return err;
  const t = fmtL(l('"{t}" ({a}): {m} — {w}.', '"{t}" ({a}): {m} — {w}.'), { t: so.title, a: a.name, m: SPLIT19[mode].name, w: plan.map((x) => `${s.persons[x.personId]?.name ?? '?'} ${Math.round(x.share * 100)}%`).join(', ') });
  emitFact(s, { kind: 'cowrite_split', actors: [a.id, ...plan.map((x) => x.personId)], severity: 10, visibility: 'secret', tags: ['songwriting', 'split', mode], text: t, src: 'writers19' });
  log(s, t);
  return null;
}
/** Canções do seu elenco ainda abertas para dividir. */
export const splittable19 = (s: GameState): Song[] => playerActs(s).flatMap((id) => s.acts[id]?.songs ?? []).map((sid) => s.songs[sid]).filter((so): so is Song => !!so && !so.releaseId && !so.coverOf && (s.acts[so.actId]?.members.length ?? 0) > 1).slice(-20).reverse();

// ---------------------------------------------------------------- ghostwriters
/** Quem pode virar ghostwriter: quem acabou de sair do coral, do concurso ou da escola (cadeia 3); senão, um novato. */
function ghostCandidate(s: GameState, r: Rng, city: string): { p: Person; from?: string } {
  for (const f of recentFacts(s, { kinds: ['choir_alumni', 'contest_winner', 'prodigy_found'], months: 36, limit: 12 })) {
    const p = s.persons[f.actors.find((x) => !!s.persons[x]) ?? ''];
    if (p?.alive && !p.isPlayer && !wr19(s).gh.some((g) => g.pid === p.id && g.st === 'on')) return { p, from: f.kind };
  }
  const p = makePerson(s, r, { lang: langForCity(city, r), role: 'keys', potential: r.int(60, 85), born: s.year - r.int(19, 30), startFrac: 0.75 });
  p.skills.comp = Math.max(p.skills.comp, r.int(55, 80)); p.skills.lyr = Math.max(p.skills.lyr, r.int(50, 78));
  s.persons[p.id] = p;
  return { p };
}
export const ghostCost19 = (s: GameState, nda: boolean) => money(s, 2500 + (nda ? 4000 : 0));
export const ghostMonthly19 = (s: GameState) => money(s, 700);
export function hireGhost19(s: GameState, actId: string, nda: boolean): L | null {
  const a = s.acts[actId], st = wr19(s);
  if (!a || a.owner !== 'player') return l('Escolha um ato do seu elenco.', 'Pick an act from your roster.');
  if (st.gh.some((g) => g.act === actId && g.st === 'on')) return l('Esse ato já tem um ghostwriter.', 'That act already has a ghostwriter.');
  const c = ghostCost19(s, nda);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `wr19g:${actId}`, -c, 'recording', `Ghostwriter: ${a.name}${nda ? ' (NDA)' : ''}`);
  const r = Rng.fromSeed(`${s.config.seed}|wr19g|${actId}|${s.week}`);
  const { p, from } = ghostCandidate(s, r, a.city);
  st.gh.push({ id: `gw${++st.seq}`, pid: p.id, act: actId, mine: true, since: s.week, songs: [], hits: 0, nda, grudge: 0, st: 'on', from });
  log(s, fmtL(l('{p} passa a escrever, em segredo, para {a}.', '{p} starts secretly writing for {a}.'), { p: p.name, a: a.name }));
  return null;
}
function ghostWrite(s: GameState, g: Ghost19, r: Rng): void {
  const a = s.acts[g.act], p = s.persons[g.pid];
  if (!a || !p || a.status === 'retired' || a.status === 'split') { g.st = 'out'; return; }
  if (g.mine) {
    post(s, `wr19gm:${g.id}`, -ghostMonthly19(s), 'recording', `Ghostwriter: ${a.name}`);
    if (s.month % 2 === 0) {
      const [so] = composeSongs(s, r, a, 1);
      if (so) {
        so.melody = clamp(Math.max(so.melody, p.skills.comp * 0.95 + r.normal(0, 5)), 5, 100);
        so.lyrics = clamp(Math.max(so.lyrics, p.skills.lyr * 0.95 + r.normal(0, 5)), 5, 100);
        so.q = songQ({ ...so, performance: so.melody * 0.6, production: 30 });
        wr19(s).ghs[so.id] = g.id; g.songs.push(so.id);
        if (g.songs.length > 30) g.songs.shift();
      }
    }
  }
  // rancor: o tempo no escuro e cada hit com o nome dos outros
  g.grudge = clamp(g.grudge + (g.nda ? 1 : 2), 0, 100);
  if (g.mine) for (const sid of g.songs) { const rel = relOf(s, s.songs[sid] ?? ({} as Song)); if (rel && rel.peak > 0 && rel.peak <= 10 && !wr19(s).chk[`gh:${sid}`]) { wr19(s).chk[`gh:${sid}`] = 1; g.hits++; g.grudge = clamp(g.grudge + 12, 0, 100); } }
  else for (const f of recentFacts(s, { kind: 'chart', actor: g.act, months: 1, limit: 2 })) if (!wr19(s).chk[f.id]) { wr19(s).chk[f.id] = 1; g.hits++; g.grudge = clamp(g.grudge + 6, 0, 100); }
  if (g.mine && g.grudge >= 60 && (!g.warned || s.week - g.warned > 52)) {
    g.warned = s.week;
    pushInbox18(s, 'wr19_ghost', { from: p.name, subject: fmtL(l('{p} quer o nome nos discos de {a}', '{p} wants their name on {a}\'s records'), { p: p.name, a: a.name }),
      body: fmtL(l('Escreveu {n} canções ({h} hits) sem aparecer. Dar crédito (30% das obras) resolve; pagar ({v}) cala por um tempo; encerrar o acordo é arriscado.{d}', 'Wrote {n} songs ({h} hits) without showing up. Credit (30% of the works) settles it; paying ({v}) buys silence for a while; ending the deal is risky.{d}'),
        { n: g.songs.length, h: g.hits, v: usd(hushCost19(s, g)), d: g.nda ? l(' Há NDA: se revelar, o escândalo é maior.', ' There is an NDA: if they talk, the scandal is bigger.') : '' }),
      ref: { g: g.id }, actions: [{ id: 'credit', label: l('Dar crédito', 'Give credit') }, { id: 'pay', label: l('Pagar o silêncio', 'Pay for silence') }, { id: 'end', label: l('Encerrar o acordo', 'End the deal') }] });
  }
  const own = Object.values(s.acts).find((x) => x.members.includes(p.id) && x.status === 'active');
  const pr = g.grudge < 50 ? 0 : ((g.grudge - 40) / 600) * (g.nda ? 0.4 : 1) + (own && own.fame >= 30 ? 0.03 : 0);
  if (pr > 0 && r.chance(pr)) reveal(s, g, r);
}
export const hushCost19 = (s: GameState, g: Ghost19) => money(s, 5000 + g.hits * 2500);
function reveal(s: GameState, g: Ghost19, r: Rng): void {
  const a = s.acts[g.act], p = s.persons[g.pid];
  if (!a || !p) return;
  g.st = 'out';
  const sev = clamp(25 + g.hits * 8 + (g.nda ? 15 : 0), 20, 80);
  const t = fmtL(l('{p} revela: escreveu {n} canções de {a}{h}. "Meu nome nunca apareceu."', '{p} reveals: they wrote {n} of {a}\'s songs{h}. "My name never appeared."'), { p: p.name, a: a.name, n: Math.max(g.songs.length, 1 + g.hits), h: g.hits ? fmtL(l(', incluindo {k} hits', ', including {k} hits'), { k: g.hits }) : '' });
  const f = emitFact(s, { kind: 'ghostwriter_revealed', actors: [a.id, p.id, ...(g.mine ? ['player'] : [])], severity: sev, visibility: 'public', tags: ['bad', 'songwriting', 'ghost', 'credit', ...(g.from ? [g.from] : [])], text: t, src: 'writers19' });
  scandal(s, a.id, 'conduct', sev, l('Ghostwriter revelado', 'Ghostwriter revealed'), { text: t, cause: [f.id], tags: ['ghost', 'credit'] });
  for (const sid of g.songs) { const so = s.songs[sid]; if (so) cutIn(so, p.id, 0.3); }
  // vira solo: a revelação é o lançamento da carreira (fora do modo exato, ou se não for gente real)
  const own = Object.values(s.acts).some((x) => x.members.includes(p.id) && x.status === 'active');
  if (!own && (histMode(s) !== 'strict' || !shield18(s, `p:${p.id}`))) {
    const solo = goSolo16(s, r, p, a);
    solo.fame = Math.max(solo.fame, clamp(10 + g.hits * 4, 8, 40));
    log(s, fmtL(l('{p} aproveita a manchete e lança carreira solo.', '{p} rides the headline into a solo career.'), { p: p.name }));
  }
  log(s, t);
}
/** NPC: estrelas de outros selos também têm ghostwriters (cadeia 3 sem o jogador). */
function npcGhosts(s: GameState, r: Rng): void {
  const st = wr19(s);
  if (s.year < 1950 || st.gh.filter((g) => !g.mine && g.st === 'on').length >= 3 || !r.chance(0.04)) return;
  const stars = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status === 'active' && a.fame >= 55 && !shield18(s, a.id) && !st.gh.some((g) => g.act === a.id));
  if (!stars.length) return;
  const a = r.pick(stars);
  const { p, from } = ghostCandidate(s, r, a.city);
  st.gh.push({ id: `gw${++st.seq}`, pid: p.id, act: a.id, mine: false, since: s.week, songs: [], hits: 0, nda: r.chance(0.5), grudge: 20, st: 'on', from });
}

// ---------------------------------------------------------------- canções feitas para outros artistas
function offers(s: GameState, r: Rng): void {
  const st = wr19(s);
  st.offers = st.offers.filter((o) => o.until >= s.week);
  if (s.config.role === 'artist' || s.year < 1920 || st.offers.length >= 2 || !r.chance(0.2)) return;
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
  if (!mine.length) return;
  const act = r.pick(mine);
  const pool = Object.values(s.acts).filter((x) => x.owner !== 'player' && !x.playerBand && x.status !== 'retired' && familyOf(x.genre) === familyOf(act.genre));
  let w: Person | undefined;
  for (let i = 0; i < 12 && pool.length && !w; i++) { const x = r.pick(pool); const p = s.persons[x.members[0]]; if (p?.alive && p.skills.comp >= 55 && !shield18(s, `p:${p.id}`)) w = p; }
  if (!w) return;
  const q = Math.round(clamp(w.skills.comp * 0.9 + r.normal(0, 6), 35, 95));
  const o: Off19 = { id: `of${++st.seq}`, pid: w.id, act: act.id, pub: pubName19(s, r), q, fee: money(s, 600 + q * 25), until: s.week + 8 };
  st.offers.push(o);
  pushInbox18(s, 'wr19_offer', { from: `${w.name} (${o.pub})`, subject: fmtL(l('{w} escreveu uma canção para {a}', '{w} wrote a song for {a}'), { w: w.name, a: act.name }),
    body: fmtL(l('Canção pronta (qualidade ~{q}) pela editora {p}. Cachê {f}; a obra fica 100% com o autor. Pedir 25% de crédito para o seu artista (cut-in) pode irritar e fazer a oferta sumir.', 'A finished song (quality ~{q}) through {p}. Fee {f}; the work stays 100% with the writer. Asking for 25% credit for your artist (cut-in) may annoy them and kill the offer.'), { q, p: o.pub, f: usd(o.fee) }),
    ref: { o: o.id }, actions: [{ id: 'take', label: l('Gravar', 'Record it') }, { id: 'cut', label: l('Gravar pedindo 25% (cut-in)', 'Record it asking 25% (cut-in)') }, { id: 'no', label: l('Recusar', 'Pass') }] });
}
export const cutOdds19 = (s: GameState, o: Off19): number => clamp(0.2 + (s.acts[o.act]?.fame ?? 0) / 130 + (s.year < 1975 ? 0.15 : 0), 0.1, 0.85);
export function takeOffer19(s: GameState, oid: string, cut: boolean): L {
  const st = wr19(s), o = st.offers.find((x) => x.id === oid), a = o && s.acts[o.act], w = o && s.persons[o.pid];
  if (!o || !a || !w) return l('Oferta encerrada.', 'Offer closed.');
  st.offers = st.offers.filter((x) => x !== o);
  if (s.player.cash < o.fee) return l('Caixa insuficiente.', 'Not enough cash.');
  const r = Rng.fromSeed(`${s.config.seed}|wr19o|${o.id}`);
  if (cut && !r.chance(cutOdds19(s, o))) { w.rel['player'] = (w.rel['player'] ?? 0) - 10; return fmtL(l('{w} se ofende com o pedido de crédito e leva a canção para outro artista.', '{w} is offended by the credit grab and takes the song to another act.'), { w: w.name }); }
  post(s, `wr19o:${o.id}`, -o.fee, 'recording', `Canção de fora: ${w.name}`);
  const [so] = composeSongs(s, r, a, 1);
  if (!so) return l('Algo deu errado.', 'Something went wrong.');
  so.melody = clamp(o.q + r.normal(0, 4), 5, 100); so.lyrics = clamp(o.q - 2 + r.normal(0, 4), 5, 100);
  so.q = songQ({ ...so, performance: so.melody * 0.6, production: 30 });
  so.writers = [w.id]; so.splits = [{ personId: w.id, share: 1 }];
  const ld = lead(s, a);
  if (cut && ld) cutIn(so, ld.id, 0.25);
  st.ext[so.id] = o.pub;
  const t = fmtL(l('{a} grava "{t}", de {w} ({p}){c}.', '{a} records "{t}", by {w} ({p}){c}.'), { a: a.name, t: so.title, w: w.name, p: o.pub, c: cut ? l(', com 25% para o artista', ', with 25% to the artist') : '' });
  emitFact(s, { kind: 'cowrite_split', actors: [a.id, w.id, ...(cut && ld ? [ld.id] : [])], severity: 14, visibility: 'rumor', tags: ['songwriting', 'split', 'outside', ...(cut ? ['cut_in'] : [])], text: t, src: 'writers19' });
  log(s, t);
  return t;
}

// ---------------------------------------------------------------- plágio
const plagMult = (s: GameState) => (s.year >= 2015 ? 1.8 : s.year >= 1976 ? 1.2 : 1);
export const plagOdds19 = (s: GameState, so: Song, dir: 'in' | 'out'): number => dir === 'in' ? clamp(0.3 + so.originality / 160 + staffSkill(s, 'legal') / 400 - (s.year >= 2015 ? 0.1 : 0), 0.1, 0.9) : clamp(0.2 + so.originality / 220 + staffSkill(s, 'legal') / 500 + (s.year >= 2015 ? 0.1 : 0), 0.08, 0.75);
export const plagSettle19 = (s: GameState, so: Song) => money(s, 3000 + Math.min(20000, (relOf(s, so)?.totalUnits ?? 0) * 0.01));
function plagiarism(s: GameState, r: Rng): void {
  const st = wr19(s);
  if (s.year < 1925) return;
  // contra você: hit recente acusado
  for (const id of playerActs(s)) for (const sid of (s.acts[id]?.songs ?? []).slice(-12)) {
    const so = s.songs[sid], rel = so && relOf(s, so);
    if (!so || !rel || st.chk[`p:${sid}`] || !rel.peak || rel.peak > 5 || rel.week < s.week - 26) continue;
    st.chk[`p:${sid}`] = 1;
    if (!r.chance(0.035 * plagMult(s))) continue;
    const pool = Object.values(s.acts).filter((x) => x.owner !== 'player' && x.status !== 'retired' && x.fame >= 20 && familyOf(x.genre) === familyOf(so.genre) && !shield18(s, x.id));
    if (!pool.length) continue;
    const other = r.pick(pool);
    const su: Suit19 = { id: `pl${++st.seq}`, dir: 'in', song: sid, other: other.id, st: 'open', odds: plagOdds19(s, so, 'in'), amt: plagSettle19(s, so) };
    st.suits.push(su);
    const t = fmtL(l('{o} acusa "{t}" ({a}) de plágio.', '{o} accuses "{t}" ({a}) of plagiarism.'), { o: other.name, t: so.title, a: s.acts[so.actId]?.name ?? '' });
    emitFact(s, { kind: 'plagiarism_suit', actors: [other.id, so.actId, 'player'], severity: 35, visibility: 'public', tags: ['bad', 'songwriting', 'court', 'in'], text: t, src: 'writers19' });
    pushInbox18(s, 'wr19_plag', { from: other.name, subject: t, tone: 'bad', weeks: 8, ref: { su: su.id },
      body: fmtL(l('Brigar na Justiça: {o}% de chance (originalidade {g}{p}), custas {c}. Dar crédito: 15% da obra para eles. Acordo: {v}.', 'Fight in court: {o}% chance (originality {g}{p}), fees {c}. Give credit: 15% of the work to them. Settle: {v}.'),
        { o: Math.round(su.odds * 100), g: Math.round(so.originality), p: s.year >= 2015 ? l('; depois de "Blurred Lines" a "sensação" conta', '; after "Blurred Lines" the "feel" counts') : '', c: usd(money(s, 5000)), v: usd(su.amt) }),
      actions: [{ id: 'fight', label: l('Brigar', 'Fight') }, { id: 'settle', label: l('Acordo', 'Settle') }, { id: 'credit', label: l('Dar crédito', 'Give credit') }] });
  }
  // você processa: sucesso alheio parecido com o seu catálogo
  if (s.config.role === 'artist' || !r.chance(0.03 * plagMult(s))) return;
  const f = recentFacts(s, { kind: 'chart', months: 1, limit: 6 }).find((x) => s.acts[x.actors[0]] && s.acts[x.actors[0]].owner !== 'player' && !shield18(s, x.actors[0]));
  const other = f && s.acts[f.actors[0]];
  if (!other) return;
  const mine = playerActs(s).flatMap((id) => s.acts[id]?.songs ?? []).map((x) => s.songs[x]).filter((so): so is Song => !!so && !!so.releaseId && so.originality >= 55 && familyOf(so.genre) === familyOf(other.genre));
  if (!mine.length) return;
  const so = r.pick(mine);
  const su: Suit19 = { id: `pl${++st.seq}`, dir: 'out', song: so.id, other: other.id, st: 'open', odds: plagOdds19(s, so, 'out'), amt: money(s, 8000 + other.fame * 300) };
  st.suits.push(su);
  pushInbox18(s, 'wr19_sue', { from: l('Seu advogado', 'Your lawyer').pt, subject: fmtL(l('O novo sucesso de {o} soa muito como "{t}"', '{o}\'s new hit sounds a lot like "{t}"'), { o: other.name, t: so.title }), weeks: 8, ref: { su: su.id },
    body: fmtL(l('Processar: {p}% de chance, custas {c}; se ganhar, ~{v} e crédito. Pode virar rixa.', 'Sue: {p}% chance, fees {c}; if you win, ~{v} and credit. It may turn into a feud.'), { p: Math.round(su.odds * 100), c: usd(money(s, 5000)), v: usd(su.amt) }),
    actions: [{ id: 'sue', label: l('Processar', 'Sue') }, { id: 'no', label: l('Deixar para lá', 'Let it go') }] });
}
export function answerSuit19(s: GameState, id: string, how: 'fight' | 'credit' | 'settle' | 'sue' | 'no'): L {
  const st = wr19(s), su = st.suits.find((x) => x.id === id), so = su && s.songs[su.song], o = su && s.acts[su.other];
  if (!su || !so || !o || su.st !== 'open') return l('Caso encerrado.', 'Case closed.');
  if (how === 'no') { su.st = 'done'; su.res = l('Você deixou para lá.', 'You let it go.'); return su.res; }
  if (how === 'settle') { su.st = 'done'; post(s, `wr19s:${su.id}`, -su.amt, 'legal', `Acordo de plágio: ${so.title}`); su.res = fmtL(l('Acordo fechado: {v}.', 'Settled: {v}.'), { v: usd(su.amt) }); return su.res; }
  if (how === 'credit') { su.st = 'done'; const p = lead(s, o); if (p) cutIn(so, p.id, 0.15); const mine = s.acts[so.actId]; if (mine) mine.trust = clamp(mine.trust - 3, 0, 100); su.res = fmtL(l('{o} entra nos créditos de "{t}" (15%).', '{o} joins the credits of "{t}" (15%).'), { o: o.name, t: so.title }); return su.res; }
  const fee = money(s, 5000);
  if (s.player.cash < fee) return l('Caixa insuficiente para as custas.', 'Not enough cash for legal fees.');
  post(s, `wr19c:${su.id}`, -fee, 'legal', `Processo de plágio: ${so.title}`);
  su.st = 'court'; su.due = s.week + 13;
  if (how === 'sue') emitFact(s, { kind: 'plagiarism_suit', actors: ['player', o.id, so.actId], severity: 30, visibility: 'public', tags: ['songwriting', 'court', 'out'], text: fmtL(l('{c} processa {o}: o sucesso deles copiaria "{t}".', '{c} sues {o}: their hit allegedly copies "{t}".'), { c: s.config.companyName, o: o.name, t: so.title }), src: 'writers19' });
  return fmtL(l('Processo aberto: veredito em ~3 meses ({p}% de chance).', 'Case filed: verdict in ~3 months ({p}% chance).'), { p: Math.round(su.odds * 100) });
}
function courts(s: GameState, r: Rng): void {
  const st = wr19(s);
  for (const su of st.suits) {
    if (su.st !== 'court' || (su.due ?? 0) > s.week) continue;
    su.st = 'done';
    const so = s.songs[su.song], o = s.acts[su.other];
    const win = r.chance(su.odds);
    if (su.dir === 'in') {
      if (!win && so) { post(s, `wr19l:${su.id}`, -Math.round(su.amt * 1.6), 'legal', `Condenação por plágio: ${so.title}`); const p = o && lead(s, o); if (p) cutIn(so, p.id, 0.25); }
      su.res = win ? fmtL(l('Vitória: "{t}" é original.', 'Win: "{t}" is original.'), { t: so?.title ?? '' }) : fmtL(l('Derrota: indenização e 25% de "{t}" para {o}.', 'Defeat: damages and 25% of "{t}" to {o}.'), { t: so?.title ?? '', o: o?.name ?? '' });
    } else {
      if (win) post(s, `wr19w:${su.id}`, su.amt, 'publishing', `Plágio ganho: ${so?.title ?? ''}`);
      su.res = win ? fmtL(l('Vitória contra {o}: {v} e crédito.', 'Win against {o}: {v} and credit.'), { o: o?.name ?? '', v: usd(su.amt) }) : fmtL(l('Derrota: o juiz não ouviu cópia de "{t}".', 'Defeat: the judge heard no copy of "{t}".'), { t: so?.title ?? '' });
    }
    emitFact(s, { kind: 'case_ruling', actors: ['player', su.other], severity: 30, tags: ['songwriting', 'plagiarism', win ? 'win' : 'loss'], text: su.res, src: 'writers19' });
    log(s, su.res);
  }
  st.suits = [...st.suits.filter((x) => x.st !== 'done'), ...st.suits.filter((x) => x.st === 'done').slice(-8)].slice(-20);
}

// ---------------------------------------------------------------- mês
registerSimHook('month', 'writers19', (s) => {
  const r = rng19(s, 'wr19', () => Rng.fromSeed(`${s.config.seed}|wr19m|${s.week}`));
  const st = wr19(s);
  for (const g of st.gh) if (g.st === 'on') ghostWrite(s, g, r);
  st.gh = st.gh.filter((g) => g.st === 'on' || s.week - g.since < 520).slice(-20);
  npcGhosts(s, r);
  offers(s, r);
  plagiarism(s, r);
  courts(s, r);
  const ks = Object.keys(st.chk);
  if (ks.length > 500) for (const k of ks.slice(0, ks.length - 500)) delete st.chk[k];
});

// ---------------------------------------------------------------- qualidade, caixa, porquês, prazos
registerDimAdj18('writers19', (s, rel) => {
  const st = wr19(s);
  const so = rel.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  const out: { d: 'acc' | 'orig' | 'sgl'; v: number; why: L }[] = [];
  const many = so.filter((x) => (x.splits?.length ?? x.writers.length) >= 3).length;
  if (many >= Math.max(1, so.length / 2)) out.push({ d: 'acc', v: 2, why: l('Escrita a muitas mãos: refrões polidos', 'Written by many hands: polished choruses' ) }, { d: 'orig', v: -2, why: l('Escrita por comitê: menos risco', 'Written by committee: less risk') });
  if (so.some((x) => st.ghs[x.id])) out.push({ d: 'sgl', v: 3, why: l('Ghostwriter profissional nas faixas', 'Professional ghostwriter on the tracks') });
  if (so.some((x) => st.ext[x.id])) out.push({ d: 'sgl', v: 2, why: l('Canção de compositor de fora', 'Song from an outside writer') });
  return out;
});
registerInboxKind('wr19_ghost', { label: l('Ghostwriter', 'Ghostwriter'), cat: 'people', icon: 'pen', prio: 2, goto: () => ({ area: 'creation', tab: ['creation-write', 'writers19'] }),
  handle: (s, m, act, r) => {
    const g = wr19(s).gh.find((x) => x.id === m.ref?.g), p = g && s.persons[g.pid];
    if (!g || !p || g.st !== 'on') return l('Assunto encerrado.', 'Matter closed.');
    if (act === 'credit') {
      g.st = 'credit'; g.grudge = 0;
      for (const sid of g.songs) { const so = s.songs[sid]; if (so) cutIn(so, p.id, 0.3); }
      emitFact(s, { kind: 'cowrite_split', actors: [g.act, p.id, 'player'], severity: 20, visibility: 'public', tags: ['songwriting', 'split', 'ghost', 'credit'], text: fmtL(l('{p} passa a assinar as canções que escreveu para {a}.', '{p} now signs the songs they wrote for {a}.'), { p: p.name, a: s.acts[g.act]?.name ?? '' }), src: 'writers19' });
      return l('Crédito dado: 30% das obras para o autor. Sem escândalo — e um aliado.', 'Credit given: 30% of the works to the writer. No scandal — and an ally.');
    }
    if (act === 'pay') { post(s, `wr19h:${g.id}`, -hushCost19(s, g), 'legal', 'Acordo de confidencialidade'); g.grudge = Math.max(0, g.grudge - 35); g.nda = true; return l('Silêncio comprado (por enquanto).', 'Silence bought (for now).'); }
    g.st = 'out'; g.grudge = clamp(g.grudge + 20, 0, 100);
    if (r.chance(g.grudge / 140)) { reveal(s, g, r); return l('Encerrado — e ele foi direto à imprensa.', 'Ended — and they went straight to the press.'); }
    return l('Acordo encerrado. Ele saiu calado… por ora.', 'Deal ended. They left quietly… for now.');
  } });
registerInboxKind('wr19_offer', { label: l('Canção oferecida', 'Song offer'), cat: 'deals', icon: 'pen', prio: 1, goto: () => ({ area: 'creation', tab: ['creation-write', 'writers19'] }),
  handle: (s, m, act) => (act === 'no' ? (wr19(s).offers = wr19(s).offers.filter((x) => x.id !== m.ref?.o), l('Recusada.', 'Passed.')) : takeOffer19(s, String(m.ref?.o ?? ''), act === 'cut')) });
registerInboxKind('wr19_plag', { label: l('Plágio', 'Plagiarism'), cat: 'money', icon: 'gavel', prio: 3, goto: () => ({ area: 'creation', tab: ['creation-write', 'writers19'] }),
  handle: (s, m, act) => answerSuit19(s, String(m.ref?.su ?? ''), act === 'fight' && s.player.cash < money(s, 5000) ? 'settle' : (act as 'fight' | 'credit' | 'settle')) });
registerInboxKind('wr19_sue', { label: l('Plágio', 'Plagiarism'), cat: 'deals', icon: 'gavel', prio: 1, goto: () => ({ area: 'creation', tab: ['creation-write', 'writers19'] }),
  handle: (s, m, act) => answerSuit19(s, String(m.ref?.su ?? ''), act === 'sue' ? 'sue' : 'no') });

onFact('cowrite_split', (s, f) => {
  const ps = f.actors.map((id) => s.persons[id]).filter((p): p is Person => !!p);
  const d = f.tags.includes('band') || f.tags.includes('credit') ? 4 : f.tags.includes('lead') ? -3 : 1;
  for (const a of ps) for (const b of ps) if (a !== b) a.rel[b.id] = clamp((a.rel[b.id] ?? 0) + d, -100, 100);
}, 'writers19:rel');
onFact('ghostwriter_revealed', (s, f) => {
  const star = s.acts[f.actors[0]], own = Object.values(s.acts).find((x) => x.members.includes(f.actors[1]) && x.status === 'active');
  if (star && own && own.id !== star.id) startFeud18(s, own.id, star.id, l('O ghostwriter revelou tudo', 'The ghostwriter told everything'), 18);
  if (star) for (const pid of star.members) addStress(s, pid, 10, l('Ghostwriter revelado', 'Ghostwriter revealed'));
  headline19(s, f.text, 3);
}, 'writers19:reveal');
onFact('plagiarism_suit', (s, f) => {
  const a = s.acts[f.actors[0]], b = s.acts[f.actors[1]];
  if (a && b) startFeud18(s, a.id, b.id, l('Processo de plágio', 'Plagiarism suit'), 12);
  headline19(s, f.text, 2);
}, 'writers19:plag');

registerExplain('wr19.plag', (s, c) => {
  const su = wr19(s).suits.find((x) => x.id === String(c.su)), so = su && s.songs[su.song];
  if (!su || !so) return null;
  return { title: l('Chance no tribunal', 'Odds in court'), value: su.odds, fmt: 'pct', parts: [
    { label: l('Base', 'Base'), value: su.dir === 'in' ? 0.3 : 0.2, fmt: 'pct' },
    { label: fmtL(l('Originalidade da canção ({g})', 'Song originality ({g})'), { g: Math.round(so.originality) }), value: so.originality / (su.dir === 'in' ? 160 : 220), fmt: 'pct', tone: 'good' },
    { label: l('Equipe jurídica', 'Legal staff'), value: staffSkill(s, 'legal') / (su.dir === 'in' ? 400 : 500), fmt: 'pct' },
    ...(s.year >= 2015 ? [{ label: l('Depois de "Blurred Lines" (2015): a "sensação" vira prova', 'After "Blurred Lines" (2015): the "feel" becomes evidence'), value: su.dir === 'in' ? -0.1 : 0.1, fmt: 'pct' as const, tone: (su.dir === 'in' ? 'bad' : 'good') as 'bad' | 'good' }] : []),
  ], note: l('Veredito ~3 meses depois de aberto o processo.', 'Verdict ~3 months after filing.') };
});
registerDeadline('wr19', (s, from, to) => wr19(s).suits.filter((x) => x.st === 'court' && (x.due ?? 0) >= from && (x.due ?? 0) <= to).map((x) => ({ id: `wr19:${x.id}`, w: x.due!, kind: 'court' as const, t: fmtL(l('Veredito de plágio: "{t}"', 'Plagiarism verdict: "{t}"'), { t: s.songs[x.song]?.title ?? '' }), tone: 'info' as const })));
registerAdvisorTip('writers19', (s) => {
  const g = wr19(s).gh.find((x) => x.mine && x.st === 'on' && x.grudge >= 45);
  if (!g) return [];
  return [{ id: 'wr19-ghost', level: 'warn', cat: 'people', score: 55, text: fmtL(l('O ghostwriter de {a} está ficando amargo ({g}/100).', '{a}\'s ghostwriter is getting bitter ({g}/100).'), { a: s.acts[g.act]?.name ?? '?', g: Math.round(g.grudge) }),
    why: [l('Cada hit com o nome de outro aumenta a chance de ele contar tudo.', 'Every hit under someone else\'s name raises the odds they tell all.')], effect: l('Dar crédito evita o escândalo.', 'Giving credit avoids the scandal.'), goto: { area: 'creation', tab: ['creation-write', 'writers19'] } }];
});
export const myGhosts19 = (s: GameState): Ghost19[] => wr19(s).gh.filter((g) => g.mine);
export const npcGhosts19 = (s: GameState): Ghost19[] => wr19(s).gh.filter((g) => !g.mine);
/** Para testes: etapas internas do mês. */
export const _wr19 = { ghostWrite, reveal, npcGhosts, offers, plagiarism, courts };
