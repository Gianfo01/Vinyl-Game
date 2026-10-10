// Rodada 18 (art18, item 6) — QUALIDADE MULTIDIMENSIONAL. O "Q" único continua existindo (resumo, compatível com
// tudo), mas cada disco ganha um perfil: técnica, emoção, originalidade, acessibilidade, imediatismo, durabilidade,
// coesão do álbum, força do single, sequência das faixas e química artista–produtor. Cada dimensão alimenta um
// consumidor diferente — acessibilidade/single → vendas e paradas; imediatismo × durabilidade → curva de vendas
// (estreia forte que some vs. catálogo que fica); originalidade/emoção/coesão → crítica (e prêmios, que leem a
// crítica); emoção/durabilidade → sync; durabilidade → valor de catálogo. Qualidade abre portas, não garante nada:
// mercado, época, marketing e sorte seguem no appeal. O produtor certo depende do projeto: o famoso dá técnica e
// polimento (caro, e tira a crueza de gêneros crus); o da cena local entende o som. A química cresce a cada parceria.
// Perfil congelado no lançamento em s.x4.q18 (só discos do jogador; os demais são lidos na hora).

import { clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod } from '../ext4';
import { registerReviewAdjust } from '../media';
import { songProfile } from '../repertoire';
import { releaseAspects } from '../reviews';
import { PRODUCERS, availableProducers, producerFit, sessionCost, type ProducerDef } from '../studio';
import type { Act, GameState, Release, Song } from '../types';
import { fmtL } from '../util';
import { realProdOf } from './producers15';
import { cohesion as soundSpread, soundOf } from './sound';
import { soul } from './soul9';

export const DIMS18 = ['tech', 'emo', 'orig', 'acc', 'imm', 'dur', 'coh', 'sgl', 'seq', 'chem'] as const;
export type Dim18 = (typeof DIMS18)[number];
export const DIM18: Record<Dim18, { name: L; desc: L; feeds: L }> = {
  tech: { name: l('Técnica', 'Technique'), desc: l('Execução e produção: afinação, timbre, mixagem.', 'Execution and production: tuning, tone, mix.'), feeds: l('crítica (pouco), estúdio', 'critics (a little), studio rep') },
  emo: { name: l('Emoção', 'Emotion'), desc: l('Expressividade: interpretação, letra vivida, entrega. Pode ser crua e ainda assim enorme.', 'Expressiveness: delivery, lived-in lyrics. Can be raw and still huge.'), feeds: l('crítica, sync, durabilidade', 'critics, sync, longevity') },
  orig: { name: l('Originalidade', 'Originality'), desc: l('O quanto soa novo. Muito original costuma ser menos acessível.', 'How new it sounds. Very original is usually less accessible.'), feeds: l('crítica, prêmios, durabilidade', 'critics, awards, longevity') },
  acc: { name: l('Acessibilidade', 'Accessibility'), desc: l('Fácil de gostar na primeira audição: melodia, polimento, refrão.', 'Easy to like on first listen: melody, polish, chorus.'), feeds: l('vendas e paradas', 'sales and charts') },
  imm: { name: l('Imediatismo', 'Immediacy'), desc: l('Impacto nas primeiras semanas (gancho, energia).', 'Impact in the first weeks (hook, energy).'), feeds: l('estreia nas paradas', 'chart debut') },
  dur: { name: l('Durabilidade', 'Longevity'), desc: l('Resiste ao tempo: letra, melodia, identidade. Disco que cresce depois.', 'Stands the test of time: lyrics, melody, identity. A record that grows later.'), feeds: l('cauda de vendas, catálogo, sync', 'sales tail, catalog, sync') },
  coh: { name: l('Coesão', 'Cohesion'), desc: l('Funciona como obra: som e nível parecidos, repertório escolhido.', 'Works as a whole: consistent sound and level, chosen repertoire.'), feeds: l('crítica de álbum, vendas de LP', 'album reviews, LP sales') },
  sgl: { name: l('Força do single', 'Single strength'), desc: l('A faixa de trabalho segura o rádio/playlist sozinha?', 'Can the lead track carry radio/playlists alone?'), feeds: l('vendas de single e de lançamento', 'single and launch sales') },
  seq: { name: l('Sequência', 'Sequencing'), desc: l('Ordem das faixas: abertura forte, melhor faixa cedo, sem trechos mornos, fecho que fica.', 'Track order: strong opener, best song early, no dull stretches, a closer that lingers.'), feeds: l('coesão', 'cohesion') },
  chem: { name: l('Química', 'Chemistry'), desc: l('Artista e produtor se entendem; cresce a cada parceria.', 'Artist and producer click; grows with each collaboration.'), feeds: l('emoção, coesão', 'emotion, cohesion') },
};

export interface Q18State { q: Record<string, number[]> }
declare module '../ext4' { interface Ext4 { q18: Q18State } }
registerExt4('q18', () => ({ q: {} }));
const st = (s: GameState): Q18State => ((s as unknown as { x4: { q18?: Q18State } }).x4.q18 ??= { q: {} });

export const mine18 = (s: GameState, rel: Release): boolean => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
const skip = (rel: Release): boolean => !!rel.reissueOf || !!rel.hist || rel.kind === 'compilation' || rel.kind === 'tribute';

// ------------------------------------------------------------------ ajustes externos (trajetória, etc.)

export interface DimAdj18 { d: Dim18; v: number; why: L }
type AdjFn = (s: GameState, rel: Release, act: Act) => DimAdj18[];
const ADJ: { id: string; fn: AdjFn }[] = [];
/** Outros sistemas (trajetória do artista) somam pontos a uma dimensão, com o porquê. */
export function registerDimAdj18(id: string, fn: AdjFn): void {
  const i = ADJ.findIndex((x) => x.id === id);
  if (i >= 0) ADJ[i] = { id, fn }; else ADJ.push({ id, fn });
}

// ------------------------------------------------------------------ produtor × projeto

const RAW: Partial<Record<FamilyId, number>> = { blues_jazz: 0.8, country_folk: 0.8, rock: 0.6, hiphop: 0.6, caribbean: 0.6, africa: 0.6, brazil: 0.5, sacred: 0.5, latin: 0.4, rnb: 0.4, europe: 0.4, asia_me: 0.4, electronic: 0.3, pop: 0.1 };
/** Quanto o projeto vive de crueza/autenticidade (gênero cru e artista mais underground). */
export const rawness18 = (act: Act): number => clamp((RAW[familyOf(act.genre)] ?? 0.3) * (1.25 - act.positioning / 100), 0, 1);
export const prodDef18 = (id: string | undefined): ProducerDef | undefined => (id ? PRODUCERS.find((p) => p.id === id) : undefined);
/** Fama/custo do produtor 0..1 (cachê por faixa). */
export const prodStar18 = (pr: ProducerDef): number => clamp((pr.fee - 400) / 1600, 0, 1);
/** Produtor da cena: real da mesma terra do artista, ou de cachê baixo que domina o gênero. */
export function prodLocal18(act: Act, pr: ProducerDef): boolean {
  if (producerFit(pr, act.genre) < 1) return false;
  const rp = realProdOf(pr.id);
  const home = countryOfCity(act.city) ?? cityById[act.city]?.market;
  if (rp) return !!home && (countryOfCity(rp.city) ?? rp.city) === home;
  return pr.fee <= 400;
}

const leaderOf = (s: GameState, act: Act) => s.persons[act.leaderId ?? act.members[0]];

/** Química artista–produtor: começa no encaixe de temperamento e cresce a cada disco juntos (até ~95). */
export function chemistry18(s: GameState, act: Act, prodId: string, beforeWeek = Infinity): { v: number; n: number; why: L[] } {
  const pr = prodDef18(prodId);
  if (!pr) return { v: 0, n: 0, why: [] };
  let n = 0;
  for (const id of act.releases) {
    const r = s.releases[id];
    if (!r || r.week >= beforeWeek || skip(r)) continue;
    if (mainProducer18(s, r) === prodId) n++;
  }
  const ld = leaderOf(s, act);
  const ego = ld ? soul(s, ld).f.ego : 50;
  const compat = 1 - Math.abs(pr.ego - (100 - ego)) / 100; // ego alto de um lado pede humildade do outro
  const v = Math.round(clamp(22 + compat * 18 + n * 16, 0, 95));
  const why = [fmtL(l('Temperamento: {c}% de encaixe (ego do produtor {p}, do artista {a})', 'Temperament: {c}% fit (producer ego {p}, artist {a})'), { c: Math.round(compat * 100), p: pr.ego, a: Math.round(ego) })];
  if (n) why.push(fmtL(l('{n} disco(s) juntos antes deste: +{v}', '{n} record(s) together before this one: +{v}'), { n, v: n * 16 }));
  return { v, n, why };
}

/** Produtor dominante do disco (o que assinou mais faixas). */
export function mainProducer18(s: GameState, rel: Release): string | undefined {
  const c: Record<string, number> = {};
  for (const id of rel.songs) { const p = s.songs[id]?.producerId; if (p) c[p] = (c[p] ?? 0) + 1; }
  let best: string | undefined, n = 0;
  for (const [k, v] of Object.entries(c)) if (v > n) { n = v; best = k; }
  return best;
}

/** Encaixe do produtor NESTE projeto: o que ele soma/tira em cada dimensão, com motivos. */
export function prodFit18(s: GameState, act: Act, pr: ProducerDef, beforeWeek = Infinity): { adj: DimAdj18[]; score: number } {
  const adj: DimAdj18[] = [];
  const raw = rawness18(act);
  const star = prodStar18(pr);
  const fit = producerFit(pr, act.genre);
  adj.push({ d: 'tech', v: Math.round((pr.skill - 60) * 0.3 * fit), why: fmtL(l('Ofício de {p} (habilidade {k})', '{p}\'s craft (skill {k})'), { p: pr.name, k: pr.skill }) });
  if (star > 0.2) {
    adj.push({ d: 'acc', v: Math.round(7 * star), why: l('Produtor estrela: polimento radiofônico', 'Star producer: radio polish') });
    if (raw > 0.35) adj.push({ d: 'emo', v: -Math.round(12 * star * raw), why: l('Polido demais para um som cru: perde autenticidade', 'Too polished for a raw sound: loses authenticity') });
  }
  if (prodLocal18(act, pr)) adj.push({ d: 'emo', v: Math.round(2 + 6 * raw), why: l('Produtor da cena: entende o som e o público local', 'Scene producer: gets the sound and the local crowd') });
  if (fit < 1) { adj.push({ d: 'emo', v: -4, why: l('Produtor de outro gênero', 'Producer from another genre') }); adj.push({ d: 'coh', v: -4, why: l('Produtor de outro gênero', 'Producer from another genre') }); }
  const ch = chemistry18(s, act, pr.id, beforeWeek);
  adj.push({ d: 'emo', v: Math.round((ch.v - 40) / 8), why: fmtL(l('Química com {p}: {c}', 'Chemistry with {p}: {c}'), { p: pr.name, c: ch.v }) });
  adj.push({ d: 'coh', v: Math.round((ch.v - 40) / 10), why: fmtL(l('Química com {p}: {c}', 'Chemistry with {p}: {c}'), { p: pr.name, c: ch.v }) });
  const ld = leaderOf(s, act);
  if (ld && pr.ego > 70 && soul(s, ld).f.ego > 65) adj.push({ d: 'emo', v: -4, why: l('Dois egos no estúdio: brigas pelo arranjo', 'Two egos in the studio: fights over the arrangement') });
  // valor para o projeto: técnica e acessibilidade pesam mais no pop; emoção, no som cru
  const w: Record<string, number> = { tech: 1, acc: 1 - raw * 0.7, emo: 0.6 + raw * 1.2, coh: 0.6 };
  const score = adj.reduce((t, a) => t + a.v * (w[a.d] ?? 0.5), 0);
  return { adj, score: Math.round(score * 10) / 10 };
}

/** Melhor produtor para o projeto (dentro do teto de custo extra); undefined = produzir em casa. */
export function bestProducer18(s: GameState, act: Act, songs: number, cap = Infinity): string | undefined {
  let best: string | undefined, bv = 2;
  for (const pr of availableProducers(s)) {
    if ((s.producerBusy[pr.id] ?? 0) > s.week) continue;
    const c = sessionCost(s, songs, 1, 'balanced', pr.id) - sessionCost(s, songs, 1, 'balanced');
    if (c > cap) continue;
    const v = prodFit18(s, act, pr).score;
    if (v > bv) { bv = v; best = pr.id; }
  }
  return best;
}

// ------------------------------------------------------------------ sequência das faixas

const val = (so: Song) => so.q + songProfile(so).hook * 0.3;
/** Nota da ordem das faixas (0–100) e motivos. */
export function sequence18(s: GameState, ids: string[]): { v: number; why: [L, number][] } {
  const so = ids.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  if (so.length < 3) return { v: 70, why: [[l('Poucas faixas: a ordem quase não pesa', 'Few tracks: order barely matters'), 0]] };
  const why: [L, number][] = [];
  const hooks = so.map((x) => songProfile(x).hook).sort((a, b) => b - a);
  const op = songProfile(so[0]).hook;
  why.push(op >= hooks[Math.min(2, hooks.length - 1)] ? [l('Abre com um dos maiores ganchos', 'Opens with one of the biggest hooks'), 18] : [l('Abertura morna', 'Lukewarm opener'), -8]);
  const vs = so.map(val);
  const bi = vs.indexOf(Math.max(...vs));
  why.push(bi <= Math.floor(so.length * 0.6) ? [l('Melhor faixa na primeira metade', 'Best track in the first half'), 12] : [l('Melhor faixa enterrada no fim', 'Best track buried at the end'), -10]);
  const durs = so.map((x) => songProfile(x).durability);
  const cl = durs[durs.length - 1];
  why.push(cl >= [...durs].sort((a, b) => b - a)[Math.min(2, durs.length - 1)] ? [l('Fecho que fica na cabeça', 'A closer that lingers'), 10] : [l('Fecho fraco', 'Weak closer'), -4]);
  const med = [...vs].sort((a, b) => a - b)[Math.floor(vs.length / 2)];
  let runs = 0;
  for (let i = 1; i < vs.length; i++) if (vs[i] < med - 6 && vs[i - 1] < med - 6) runs++;
  if (runs) why.push([fmtL(l('{n} trecho(s) morno(s) em sequência', '{n} dull stretch(es) back to back'), { n: runs }), -9 * runs]);
  return { v: Math.round(clamp(50 + why.reduce((t, x) => t + x[1], 0), 0, 100)), why };
}

/** Ordem sugerida: abre com o maior gancho, a melhor faixa cedo, alterna fortes e fracas e fecha com a mais durável. */
export function bestOrder18(s: GameState, ids: string[]): string[] {
  const so = ids.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  if (so.length < 3) return ids.slice();
  const left = so.slice();
  const take = (f: (x: Song) => number) => { const i = left.reduce((b, x, j) => (f(x) > f(left[b]) ? j : b), 0); return left.splice(i, 1)[0]; };
  const first = take((x) => songProfile(x).hook);
  const close = take((x) => songProfile(x).durability - (x.q < 40 ? 50 : 0));
  const mid = left.sort((a, b) => val(b) - val(a));
  const out: Song[] = [first];
  let a = 0, b = mid.length - 1, strong = true;
  while (a <= b) { out.push(strong ? mid[a++] : mid[b--]); strong = !strong; }
  out.push(close);
  return out.map((x) => x.id);
}

// ------------------------------------------------------------------ dimensões

export interface Dims18 { v: Record<Dim18, number>; parts: Record<Dim18, [L, number][]> }
const avg = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : 0);

/** Calcula o perfil (com o porquê de cada dimensão). `act` padrão: o do disco. */
export function computeDims18(s: GameState, rel: Release): Dims18 | null {
  const act = s.acts[rel.actId];
  const so = rel.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  if (!act || !so.length) return null;
  const P = {} as Record<Dim18, [L, number][]>;
  for (const d of DIMS18) P[d] = [];
  const add = (d: Dim18, why: L, v: number) => { if (Math.abs(v) >= 0.5) P[d].push([why, Math.round(v * 10) / 10]); };
  const pf = so.map((x) => songProfile(x));
  const snd = so.map((x) => soundOf(s, x));
  const lead = so[0], lp = pf[0];
  add('tech', l('Produção e execução das faixas', 'Tracks\' production and performance'), avg(so.map((x) => x.production * 0.5 + x.performance * 0.5)));
  add('emo', l('Interpretação, letra e melodia', 'Delivery, lyrics and melody'), avg(so.map((x) => x.performance * 0.45 + (x.instrumental ? x.melody : x.lyrics) * 0.4 + x.melody * 0.15)));
  const polish = avg(snd.map((v) => v[4] ?? 50));
  const raw = rawness18(act);
  if (polish < 42 && raw > 0.4) add('emo', l('Som cru que combina com o gênero', 'Raw sound that suits the genre'), 4);
  add('orig', l('Originalidade das faixas', 'Tracks\' originality'), avg(so.map((x) => x.originality)) * 0.8);
  add('orig', l('Experimentação do som', 'Sound experimentation'), avg(snd.map((v) => v[5] ?? 30)) * 0.2);
  add('acc', l('Melodia e refrão (perfil comercial)', 'Melody and chorus (commercial profile)'), avg(pf.map((x) => x.access)) * 0.7);
  add('acc', l('Polimento do som', 'Sound polish'), polish * 0.15);
  add('acc', l('Posicionamento do artista', 'Act positioning'), act.positioning * 0.15);
  // produtor
  const pid = mainProducer18(s, rel);
  const pr = prodDef18(pid);
  if (pr) for (const a of prodFit18(s, act, pr, rel.week).adj) add(a.d, a.why, a.v);
  else add('chem', l('Autoproduzido (sem produtor de fora)', 'Self-produced (no outside producer)'), 0);
  // temas vividos e outros ajustes (trajetória)
  for (const x of ADJ) for (const a of x.fn(s, rel, act)) add(a.d, a.why, a.v);
  const sum = (d: Dim18) => P[d].reduce((t, x) => t + x[1], 0);
  const V = {} as Record<Dim18, number>;
  V.tech = sum('tech'); V.emo = sum('emo'); V.orig = sum('orig'); V.acc = sum('acc');
  const maxHook = Math.max(...pf.map((x) => x.hook));
  const energy = avg(snd.map((v) => v[0] ?? 50));
  add('imm', l('Gancho da faixa de trabalho', 'Lead track hook'), lp.hook * 0.5);
  add('imm', l('Maior gancho do disco', 'Biggest hook on the record'), maxHook * 0.2);
  add('imm', l('Energia', 'Energy'), energy * 0.15);
  add('imm', l('Acessibilidade', 'Accessibility'), V.acc * 0.15);
  V.imm = sum('imm');
  add('dur', l('Letra, melodia e identidade das faixas', 'Lyrics, melody and identity'), avg(pf.map((x) => x.durability)) * 0.7);
  add('dur', l('Emoção', 'Emotion'), V.emo * 0.15);
  add('dur', l('Originalidade', 'Originality'), V.orig * 0.15);
  if (V.imm > 70) add('dur', l('Feito para estourar já (enjoa rápido)', 'Built to pop now (wears out fast)'), -(V.imm - 70) * 0.2);
  V.dur = sum('dur');
  const sq = sequence18(s, rel.songs);
  for (const [w, v] of sq.why) P.seq.push([w, v]);
  V.seq = sq.v;
  if (so.length < 3) {
    add('coh', l('Single/EP curto: coesão = nível da faixa', 'Short release: cohesion = track level'), avg(so.map((x) => x.q)));
  } else {
    add('coh', l('Nível parecido entre as faixas (crítica)', 'Even level across tracks (critics)'), releaseAspects(s, rel).cohesion * 0.5);
    const sp = soundSpread(s, rel) ?? 15;
    add('coh', l('Som coerente entre as faixas', 'Consistent sound across tracks'), clamp(100 - sp * 2.5, 0, 100) * 0.3);
    add('coh', l('Sequência das faixas', 'Track sequencing'), sq.v * 0.2);
  }
  V.coh = sum('coh');
  add('sgl', l('Gancho da faixa de trabalho', 'Lead track hook'), lp.hook * 0.55);
  add('sgl', l('Qualidade da faixa de trabalho', 'Lead track quality'), lead.q * 0.45);
  V.sgl = sum('sgl');
  if (pr) { const ch = chemistry18(s, act, pr.id, rel.week); P.chem = ch.why.map((w) => [w, 0]); V.chem = ch.v; } else V.chem = -1;
  for (const d of DIMS18) if (d !== 'chem') V[d] = Math.round(clamp(V[d], 0, 100));
  return { v: V, parts: P };
}

/** Perfil do disco (congelado no lançamento para os do jogador). */
export function dims18(s: GameState, rel: Release): Record<Dim18, number> | null {
  const q = st(s).q[rel.id];
  if (q) return Object.fromEntries(DIMS18.map((d, i) => [d, q[i]])) as Record<Dim18, number>;
  if (skip(rel)) return null;
  const c = computeDims18(s, rel);
  if (!c) return null;
  if (mine18(s, rel)) st(s).q[rel.id] = DIMS18.map((d) => c.v[d]);
  return c.v;
}
const frozen = (s: GameState, rel: Release): Record<Dim18, number> | null => (st(s).q[rel.id] ? dims18(s, rel) : null);

/** Leitura curta do perfil: 2 forças e 1 fraqueza. */
export function profileLine18(v: Record<Dim18, number>): { hi: Dim18[]; lo: Dim18 } {
  const ds = DIMS18.filter((d) => d !== 'chem' && d !== 'seq');
  const sorted = ds.slice().sort((a, b) => v[b] - v[a]);
  return { hi: sorted.slice(0, 2), lo: sorted[sorted.length - 1] };
}

// ------------------------------------------------------------------ consumidores

const k = (x: number, c = 55, span = 40) => clamp((x - c) / span, -1, 1);
/** Multiplicador de apelo (vendas/paradas) vindo das dimensões. */
export function appealMult18(rel: Release, v: Record<Dim18, number>): { m: number; why: [L, number][] } {
  const why: [L, number][] = [[l('Acessibilidade', 'Accessibility'), 0.06 * k(v.acc, 48)]];
  if (rel.type === 'single') why.push([l('Força do single', 'Single strength'), 0.08 * k(v.sgl)]);
  else if (rel.type === 'lp') { why.push([l('Coesão do álbum', 'Album cohesion'), 0.05 * k(v.coh, 57)]); why.push([l('Single puxando o álbum', 'Single pulling the album'), 0.04 * k(v.sgl)]); }
  else why.push([l('Força do single', 'Single strength'), 0.05 * k(v.sgl)]);
  const m = clamp(1 + why.reduce((t, x) => t + x[1], 0), 0.88, 1.12);
  return { m, why };
}
registerMod('appeal', 'q18', (s, value, c) => {
  const rel = c.release;
  if (!rel || !mine18(s, rel) || skip(rel)) return null;
  const v = dims18(s, rel);
  if (!v) return null;
  const { m } = appealMult18(rel, v);
  if (Math.abs(m - 1) < 0.005) return null;
  const p = profileLine18(v);
  return { value: value * m, label: m > 1 ? fmtL(l('perfil: {a} e {b}', 'profile: {a} and {b}'), { a: DIM18[p.hi[0]].name, b: DIM18[p.hi[1]].name }) : fmtL(l('perfil: pouca {a}', 'profile: low {a}'), { a: DIM18[p.lo].name }) };
});

/** Curva de vendas: imediatismo pesa na estreia; durabilidade, na cauda (catálogo). */
export function curveMult18(v: Record<Dim18, number>, age: number): number {
  if (age <= 6) return clamp(1 + 0.1 * (v.imm - v.dur) / 50, 0.9, 1.1);
  if (age >= 20) return clamp(1 + 0.22 * k(v.dur, 55, 45), 0.82, 1.22);
  return 1;
}
registerMod('chartUnits', 'q18', (s, value, c) => {
  const rel = c.release;
  if (!rel) return null;
  const v = frozen(s, rel);
  if (!v) return null;
  const m = curveMult18(v, s.week - rel.week);
  return m === 1 ? null : { value: value * m };
});

/** Ajuste da crítica (pontos na escala 0–10). */
export function criticAdj18(rel: Release, v: Record<Dim18, number>): [L, number][] {
  const out: [L, number][] = [
    [l('Originalidade', 'Originality'), 0.35 * k(v.orig, 55, 45)],
    [l('Emoção', 'Emotion'), 0.3 * k(v.emo, 55, 45)],
    [l('Técnica', 'Technique'), 0.1 * k(v.tech, 55, 45)],
  ];
  if (rel.type === 'lp') out.push([l('Coesão do álbum', 'Album cohesion'), 0.25 * k(v.coh, 55, 45)]);
  if (v.acc > 75 && v.orig < 45) out.push([l('Fácil demais (fórmula)', 'Too easy (formulaic)'), -0.2]);
  return out.map(([a, b]) => [a, Math.round(b * 100) / 100]);
}
registerReviewAdjust('q18', (s, rel) => {
  if (!mine18(s, rel) || skip(rel)) return 0;
  const v = dims18(s, rel);
  return v ? clamp(criticAdj18(rel, v).reduce((t, x) => t + x[1], 0), -0.7, 0.7) : 0;
});

/** Sync: faixas emocionantes e duráveis entram melhor sob uma cena. */
export function syncFit18(s: GameState, song: Song): [L, number] | null {
  const pf = songProfile(song);
  const emo = song.performance * 0.45 + (song.instrumental ? song.melody : song.lyrics) * 0.4 + song.melody * 0.15;
  const v = Math.round((0.08 * k(emo, 55, 45) + 0.05 * k(pf.durability, 55, 45)) * 100) / 100;
  return Math.abs(v) < 0.01 ? null : [l('Emoção e durabilidade da faixa', 'Track emotion and longevity'), v];
}

// ------------------------------------------------------------------ porquês (explain18)

registerExplain('q18.rel', (s, c) => {
  const rel = s.releases[String(c.rel)];
  const v = rel && dims18(s, rel);
  if (!rel || !v) return null;
  return {
    title: fmtL(l('Qualidade de "{t}" em dimensões', 'Quality of "{t}" by dimension'), { t: rel.title }), value: Math.round(rel.q), fmt: 'num',
    parts: DIMS18.filter((d) => v[d] >= 0).map((d) => ({ label: DIM18[d].name, value: v[d], fmt: 'num' as const, why: { key: 'q18.dim', ctx: { rel: rel.id, d } } })),
    note: l('Q geral é só o resumo. Cada dimensão alimenta outra coisa: acessibilidade/single → vendas; imediatismo × durabilidade → curva de vendas; originalidade/emoção/coesão → crítica e prêmios; durabilidade → catálogo e sync. Nada disso garante sucesso: mercado, época, marketing e sorte continuam valendo.', 'Overall Q is only a summary. Each dimension feeds something else: accessibility/single → sales; immediacy × longevity → sales curve; originality/emotion/cohesion → critics and awards; longevity → catalog and sync. None of it guarantees success: market, timing, marketing and luck still count.'),
  };
});
registerExplain('q18.dim', (s, c) => {
  const rel = s.releases[String(c.rel)];
  const d = String(c.d) as Dim18;
  if (!rel || !DIM18[d]) return null;
  const det = computeDims18(s, rel);
  const v = dims18(s, rel);
  if (!det || !v) return null;
  const parts: WhyPart[] = det.parts[d].map(([label, x]) => ({ label, value: x, fmt: d === 'seq' ? 'signed' as const : 'num' as const }));
  return { title: DIM18[d].name, value: v[d] < 0 ? '—' : v[d], fmt: v[d] < 0 ? 'text' : 'num', parts, note: l(`${DIM18[d].desc.pt} Alimenta: ${DIM18[d].feeds.pt}. (Congelado no lançamento.)`, `${DIM18[d].desc.en} Feeds: ${DIM18[d].feeds.en}. (Frozen at release.)`) };
});
registerExplain('q18.use', (s, c) => {
  const rel = s.releases[String(c.rel)];
  const v = rel && dims18(s, rel);
  if (!rel || !v) return null;
  const am = appealMult18(rel, v);
  const cr = criticAdj18(rel, v);
  return {
    title: l('O que este perfil fez', 'What this profile did'), value: am.m, fmt: 'mult',
    parts: [
      ...am.why.map(([label, x]) => ({ label: l(`Vendas: ${label.pt}`, `Sales: ${label.en}`), value: 1 + x, fmt: 'mult' as const })),
      { label: l('Estreia (imediatismo × durabilidade)', 'Debut (immediacy × longevity)'), value: curveMult18(v, 0), fmt: 'mult' },
      { label: l('Cauda/catálogo após 20 semanas (durabilidade)', 'Tail/catalog after 20 weeks (longevity)'), value: curveMult18(v, 30), fmt: 'mult' },
      ...cr.map(([label, x]) => ({ label: l(`Crítica: ${label.pt}`, `Critics: ${label.en}`), value: x, fmt: 'signed' as const })),
    ],
    note: l('Prêmios seguem a crítica; o valor de catálogo segue a receita anual (que a durabilidade sustenta).', 'Awards follow critics; catalog value follows annual revenue (sustained by longevity).'),
  };
});
registerExplain('q18.prod', (s, c) => {
  const act = s.acts[String(c.act)];
  const pr = prodDef18(String(c.pr));
  if (!act || !pr) return null;
  const f = prodFit18(s, act, pr);
  return {
    title: fmtL(l('{p} para {a}', '{p} for {a}'), { p: pr.name, a: act.name }), value: f.score, fmt: 'signed',
    parts: f.adj.filter((a) => a.v).map((a) => ({ label: l(`${DIM18[a.d].name.pt}: ${a.why.pt}`, `${DIM18[a.d].name.en}: ${a.why.en}`), value: a.v, fmt: 'signed' as const })),
    note: fmtL(l('Crueza do projeto {r}%: quanto mais cru, mais pesa a emoção e mais o polimento de estrela atrapalha.', 'Project rawness {r}%: the rawer, the more emotion matters and star polish hurts.'), { r: Math.round(rawness18(act) * 100) }),
  };
});
registerExplain('q18.seq', (s, c) => {
  const ids = String(c.ids ?? '').split(',').filter(Boolean);
  if (ids.length < 1) return null;
  const q = sequence18(s, ids);
  return { title: l('Sequência das faixas', 'Track sequencing'), value: q.v, fmt: 'num', parts: q.why.map(([label, v]) => ({ label, value: v, fmt: 'signed' as const })), note: l('Base 50. A sequência entra na coesão do álbum.', 'Base 50. Sequencing feeds album cohesion.') };
});

