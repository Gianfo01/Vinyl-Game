// Rodada 27 — OVOS DE PÁSCOA (simulação). Momentos raros, quase sempre presos a uma data e um lugar históricos
// (Memphis 1953, o telhado de 1969, Rock in Rio 1985…), que nunca quebram a partida: efeitos pequenos, uma vez por
// partida, sem sorteio no fluxo comum (cada ovo usa o seu próprio Rng.fromSeed(semente|egg27|id|semana)).
// No máximo um ovo automático por mês. Cada ovo publica um fato `easter_egg` (consumido aqui: diário de ovos e a
// conquista "Caçador de ovos"); conquistas secretas entram em ACHIEVEMENTS (escondidas).
// Catálogo/textos para a galeria: src/data/eggs27.ts. Interface (busca, gramofone, mapa): src/ui/sys/eggs27.ts.
// Lista com spoilers: docs/eggs27.md.
//
//   RULES27: { id, phase: 'month'|'show', test(s, show?) → contexto|null, p (chance), run(s, ctx, r) }
//   eggTest27(s, id) · eggRun27(s, id) (força, para testes) · eggFire27(s, id, {...}) · eggFeat27(s, featId)

import { editions8 } from './feststore';
import { fests31, ownFests } from './feststore';
import { Rng, clamp } from '../../core/rng';
import { EGGS27, FEATS27, eggMeta27 } from '../../data/eggs27';
import { cityById, familyOf, l, type L } from '../../data/world';
import { acceptOffer, defaultOffer } from '../contracts';
import { registerExt4, registerSimHook, type HookArgs } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { exactHist } from '../history15';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { freeCash20 } from '../oblig20';
import { registerPerkSource } from '../perks';
import { scandal } from '../scandal17';
import { availableProducers } from '../studio';
import type { Act, GameState, Offer, Release } from '../types';
import { fmtL, money, nextId, playerActs, post, remember } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { addLead18, disc18 } from './discover18';
import { headline19 } from './factlink19';
import { nudge16 } from './fame16';
import { FESTIVALS } from '../../data/catalog';
import { expose19, fk19, lipOf19 } from './fakes19';
import { ACHIEVEMENTS, achById, checkAchievements } from './live/achievements';
import { repOf, mgrName } from './managers14';
import { soc18 } from './society18';
import { ventures } from './ventures9';
import { actsNow27, releasesNow27 } from '../tickcache27';

// ================================================================ estado

export interface Hunt27 { act: string; title: string; y0: number; next: number; beats: number; clues: number; tried: Record<string, 1>; helped?: 1; done?: number }
export interface Egg27State {
  /** ovo → semana em que apareceu */
  seen: Record<string, number>;
  /** conquista secreta → semana */
  feats: Record<string, number>;
  /** diário: [ano, mês, id, texto] */
  log: [number, number, string, L][];
  /** bandas com o amplificador que vai até 11 (ato → semana) */
  amp: Record<string, number>;
  /** bateristas por banda procedural do jogador */
  drums: Record<string, string[]>;
  /** pessoas que já passaram por atos do jogador (para "Ciclo completo") */
  alum: Record<string, 1>;
  /** fita sem nome: ato e ano */
  tape?: { act: string; y: number };
  /** disco devocional (racional): ato e ano */
  rac?: { act: string; y: number };
  hunt?: Hunt27;
  /** "quinto integrante": chave da pessoa → ato e nome */
  fifth: Record<string, { act: string; name: string; y: number }>;
  /** pele da interface: 'phono' (1889) ou 'chip' (Konami) até a semana */
  skin?: { k: string; until: number };
  /** chão tremendo no mapa (cidade, até a semana) */
  shake?: { city: string; until: number };
  /** calhambeque na garagem da sede */
  garage?: 1;
  /** chaves de ocorrências já tratadas (festivais, bootleg) */
  done: Record<string, 1>;
}
declare module '../ext4' { interface Ext4 { eggs27: Egg27State } }
const fresh = (): Egg27State => ({ seen: {}, feats: {}, log: [], amp: {}, drums: {}, alum: {}, fifth: {}, done: {} });
registerExt4('eggs27', fresh);
export function eg27(s: GameState): Egg27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.eggs27 ??= fresh()) as Egg27State;
  const d = fresh();
  for (const k of Object.keys(d) as (keyof Egg27State)[]) if (st[k] === undefined) (st as unknown as Record<string, unknown>)[k] = d[k];
  return st;
}

// ================================================================ utilidades

const T = (pt: string, en: string): L => l(pt, en);
const egRng = (s: GameState, id: string, k: string | number = s.week): Rng => Rng.fromSeed(`${s.config.seed}|egg27|${id}|${k}`);
const alive = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased;
/** Atos ativos do jogador. */
export const mine27 = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter(alive);
const cityN = (c: string): L => cityById[c]?.name ?? l(c, c);
const UK = new Set(['london', 'manchester', 'liverpool', 'glasgow', 'bristol', 'birmingham', 'sheffield']);
const DE = new Set(['berlin', 'hamburg', 'munich', 'cologne']);
const IT = new Set(['milan', 'rome', 'naples']);
const US_SOUTH = new Set(['nashville', 'memphis', 'new_orleans', 'atlanta', 'houston', 'austin']);
const inBR = (c: string) => cityById[c]?.market === 'br';
const has = (a: Act | undefined, ...g: string[]) => !!a && g.includes(a.genre);
const firstAct = (s: GameState, f: (a: Act) => boolean): Act | undefined => mine27(s).filter(f).sort((x, y) => y.fame - x.fame || (x.id < y.id ? -1 : 1))[0];
/** Sede, filial ou empreendimento seu numa cidade. */
export function presence27(s: GameState, city: string): boolean {
  return s.config.homeCity === city || (s.branches ?? []).some((b) => b.city === city) || ventures(s).list.some((v) => v.city === city) || mine27(s).some((a) => a.city === city && a.playerBand);
}
function boost(s: GameState, a: Act, o: { fame?: number; mom?: number; casual?: number; core?: number; a3?: string; a3v?: number; stress?: number; insp?: number }): void {
  if (o.fame) a.fame = clamp(a.fame + o.fame, 0, 100);
  if (o.mom) a.momentum = clamp(a.momentum + o.mom, 0, 100);
  if (o.casual) a.fans.casual = Math.max(0, Math.round(a.fans.casual * (1 + o.casual)));
  if (o.core) a.fans.core = Math.max(0, Math.round(a.fans.core * (1 + o.core)) + (o.core > 0 ? 1 : 0));
  if (o.a3 && o.a3v) nudge16(s, a.id, o.a3, o.a3v);
  for (const pid of a.members) {
    const p = s.persons[pid];
    if (!p?.alive) continue;
    if (o.stress) p.stress = clamp(p.stress + o.stress, 0, 100);
    if (o.insp) p.inspiration = clamp(p.inspiration + o.insp, 0, 100);
  }
}
const rep = (s: GameState, k: keyof GameState['player']['reputation'], v: number) => { s.player.reputation[k] = clamp(s.player.reputation[k] + v, 0, 100); };

// desempenho: as varreduras do mundo inteiro rodam no máximo uma vez por semana (e as caras, uma vez por trimestre)
const C27 = new WeakMap<GameState, { w: number; n: number; rels: Release[]; acts: Act[] }>();
function cache27(s: GameState): { rels: Release[]; acts: Act[] } {
  const c = C27.get(s);
  if (c && c.w === s.week && c.n === s.idSeq) return c;
  const v = { w: s.week, n: s.idSeq, rels: releasesNow27(s).filter((r) => r.owner === 'player'), acts: actsNow27(s).filter((a) => a.owner === 'player' || !!a.playerBand) };
  C27.set(s, v);
  return v;
}
/** Lançamentos do jogador / atos do jogador (inclusive aposentados). */
const myRels = (s: GameState) => cache27(s).rels;
const myActs = (s: GameState) => cache27(s).acts;
const quarterly = (s: GameState) => s.month % 3 === 0;

/** Publica o ovo: marca como visto, fato `easter_egg`, diário, aviso e (opcional) manchete. */
export function eggFire27(s: GameState, id: string, o: { text: L; act?: string; actors?: string[]; place?: string; sev?: number; hl?: boolean; tone?: 'good' | 'bad' | 'info'; vis?: 'public' | 'secret' }): void {
  const st = eg27(s);
  st.seen[id] ??= s.week;
  const actors = [...(o.act ? [o.act] : []), ...(o.actors ?? []), 'player'];
  emitFact(s, { kind: 'easter_egg', actors, place: o.place ?? (o.act ? s.acts[o.act]?.city : undefined), severity: o.sev ?? 25, visibility: o.vis ?? 'public', tags: ['egg27', id], text: o.text, src: 'eggs27', data: { egg: id },
    diary: { kind: 'egg27', actId: o.act && s.acts[o.act] ? o.act : undefined, important: (o.sev ?? 25) >= 40 },
    notify: o.tone === 'bad' ? 'bad' : o.tone === 'info' ? 'info' : 'good' });
  if (o.hl) headline19(s, o.text, 2);
}
/** Marca um ovo de interface (busca, gramofone…) sem notícia pública. */
export function markEgg27(s: GameState, id: string, text?: L): boolean {
  const st = eg27(s);
  if (st.seen[id] !== undefined) return false;
  eggFire27(s, id, { text: text ?? eggMeta27[id]?.title ?? l(id, id), sev: 5, vis: 'secret', tone: 'info' });
  return true;
}
/** Libera uma conquista secreta (uma vez). */
export function eggFeat27(s: GameState, id: string): boolean {
  const st = eg27(s);
  if (st.feats[id] !== undefined) return false;
  st.feats[id] = s.week;
  checkAchievements(s);
  return true;
}
const msg = (s: GameState, egg: string, from: string, subject: L, body: L, actions: { id: string; label: L }[], ref: Record<string, string | number> = {}, weeks = 6) =>
  pushInbox18(s, 'egg27', { from, subject, body, actions, ref: { egg, ...ref }, weeks, tone: 'info' });

/** Proposta de contrato padrão (mesmo padrão do vencedor de concurso). */
export function signEgg27(s: GameState, a: Act): L {
  if (a.owner) return fmtL(T('{a} já tem selo.', '{a} is already signed.'), { a: a.name });
  const o = { ...defaultOffer(s, a), termMonths: 48, id: nextId(s, 'of'), week: s.week, status: 'pending' as const } as Offer;
  o.advance = Math.round(o.advance * 0.5);
  if (freeCash20(s) < o.advance) return T('Caixa livre insuficiente para o adiantamento.', 'Not enough free cash for the advance.');
  acceptOffer(s, a, o);
  return fmtL(T('{a} assina com você.', '{a} signs with you.'), { a: a.name });
}
const SIGNPASS = (yes: L = T('Assinar', 'Sign')) => [{ id: 'listen', label: T('Ouvir de novo (pista)', 'Listen again (lead)') }, { id: 'sign', label: yes }, { id: 'pass', label: T('Deixar para lá', 'Let it go') }];

// ================================================================ regras

export interface Show27 { actId: string; cityId: string; sold: number; capacity: number; revenue: number; tourId: string }
interface Ctx27 { act?: Act; data?: Record<string, string | number>; p?: number }
export interface Rule27 {
  id: string;
  phase: 'month' | 'show';
  /** chance quando o gatilho vale (pode vir do contexto: ctx.p) */
  p: number;
  /** repete? (padrão: uma vez por partida) */
  again?: boolean;
  test: (s: GameState, show?: Show27) => Ctx27 | null;
  run: (s: GameState, c: Ctx27, r: Rng, show?: Show27) => void;
}
export const RULES27: Rule27[] = [];
const R = (x: Rule27) => { RULES27.push(x); };
const M = (y0: number, y1: number, s: GameState) => s.year >= y0 && s.year <= y1;
const at = (s: GameState, y: number, m: number) => s.year === y && s.month === m;

// ---------------------------------------------------------------- 1. Memphis 1953
R({ id: 'memphis_1953', phase: 'month', p: 0.35, test: (s) => (M(1953, 1954, s) && presence27(s, 'memphis') ? {} : null),
  run: (s, _c, r) => {
    const real = exactHist(s) ? actsNow27(s).find((a) => /^Elvis Presley$/i.test(a.name) && !a.owner && !a.deceased) : undefined;
    const a = real ?? spawnProceduralAct(s, r, { city: 'memphis', genre: 'rnr', potential: 93, members: 1, fame: 0.5, formedYear: s.year });
    if (!real) a.potential = Math.max(a.potential, 92);
    addLead18(s, r, a, 'demo', 3, 4, T('Acetato pago do próprio bolso.', 'Acetate paid out of pocket.'));
    eggFire27(s, 'memphis_1953', { act: a.id, place: 'memphis', sev: 30, text: fmtL(T('Memphis: um rapaz tímido, motorista, paga uns poucos dólares para gravar um acetato "de presente para a mãe". Na ficha da recepção: "{a} — bom cantor de baladas. Guardar."', 'Memphis: a shy young driver pays a few dollars to cut an acetate "as a gift for his mother". The receptionist\'s note: "{a} — good ballad singer. Hold."'), { a: a.name }) });
    msg(s, 'memphis_1953', a.name, T('Um acetato de presente', 'An acetate as a gift'), fmtL(T('{a} gravou duas baladas no estúdio de Memphis e deixou o telefone. A voz é estranha, nervosa — e inesquecível.', '{a} cut two ballads at the Memphis studio and left a phone number. The voice is odd, nervous — and unforgettable.'), { a: a.name }), SIGNPASS(), { act: a.id }, 10);
  } });

// ---------------------------------------------------------------- 2. Decca 1962
const LIVERPOOL_G = ['beat', 'pop_rock', 'skiffle', 'rnr', 'blues_rock', 'garage_rock'];
function deccaFire(s: GameState, a?: Act): void {
  if (eg27(s).seen.decca_1962 !== undefined) return;
  eggFire27(s, 'decca_1962', { act: a?.id, place: 'london', sev: 45, hl: true, tone: 'bad', text: fmtL(T('"Grupos de guitarra estão saindo de moda": o seu selo dispensa {a}, um grupo beat de Liverpool. Talvez a frase mais famosa (e mais errada) da indústria.', '"Guitar groups are on their way out": your label turns down {a}, a beat group from Liverpool. Perhaps the most famous (and most wrong) line in the industry.'), { a: a?.name ?? 'um grupo de Liverpool' }) });
  eggFeat27(s, 'decca27');
}
R({ id: 'decca_1962', phase: 'month', p: 1, test: (s) => {
  if (s.year !== 1962) return null;
  const d = disc18(s);
  const a = Object.keys(d.passed).map((id) => s.acts[id]).find((x) => x && x.city === 'liverpool' && x.members.length >= 3 && has(x, ...LIVERPOOL_G) && d.passed[x.id] >= s.week - 9);
  return a ? { act: a } : null;
}, run: (s, c) => deccaFire(s, c.act) });
R({ id: 'decca_audition', phase: 'month', p: 0.3, test: (s) => (s.year === 1962 && (presence27(s, 'london') || presence27(s, 'liverpool')) ? {} : null),
  run: (s, _c, r) => {
    const real = exactHist(s) ? actsNow27(s).find((a) => /^The Beatles$/i.test(a.name) && !a.owner) : undefined;
    const a = real ?? spawnProceduralAct(s, r, { city: 'liverpool', genre: 'beat', potential: 90, members: 4, fame: 3, formedYear: s.year - 2 });
    eg27(s).seen.decca_audition = s.week;
    msg(s, 'decca_audition', 'A&R', fmtL(T('Audição: {a}, de Liverpool', 'Audition: {a}, from Liverpool'), { a: a.name }),
      fmtL(T('Um grupo beat de Liverpool, trazido por um empresário que tem uma loja de discos, gravou 15 músicas no seu estúdio numa manhã gelada. O técnico achou "nervosos". Assinar?', 'A beat group from Liverpool, brought in by a manager who runs a record shop, cut 15 songs at your studio on a freezing morning. The engineer found them "nervous". Sign them?'), { a: a.name }),
      [{ id: 'sign', label: T('Assinar o grupo', 'Sign the group') }, { id: 'pass', label: T('Grupos de guitarra estão saindo de moda', 'Guitar groups are on their way out') }], { act: a.id }, 8);
  } });

// ---------------------------------------------------------------- 3. telhado
R({ id: 'rooftop_1969', phase: 'month', p: 1, test: (s) => { const a = at(s, 1969, 0) ? firstAct(s, (x) => x.city === 'london' && x.members.length >= 2) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.rooftop_1969 = s.week; msg(s, 'rooftop_1969', a.name, T('Um show no telhado?', 'A rooftop gig?'), fmtL(T('{a} quer subir no telhado do escritório, em pleno inverno de Londres, e tocar sem avisar ninguém.', '{a} wants to go up on the office roof, in the middle of the London winter, and play without telling anyone.'), { a: a.name }), [{ id: 'play', label: T('Liberar o telhado', 'Open the roof') }, { id: 'no', label: T('Melhor não', 'Better not') }], { act: a.id }, 4); } });

// ---------------------------------------------------------------- 4. amanhecer
R({ id: 'dawn_set', phase: 'month', p: 1, test: (s) => {
  const mineIds = new Set(mine27(s).map((a) => a.id));
  for (const e of editions8(s)) {
    if (!e.done || e.year !== s.year) continue;
    const head = e.lineup.find((x) => x.tier === 'headline' && mineIds.has(x.actId));
    if (!head) continue;
    const f = FESTIVALS[e.fi];
    const hist = !!f && f.start === 1969 && s.year === 1969;
    return { act: s.acts[head.actId], p: hist ? 1 : 0.12, data: { fest: f?.name ?? '', k: `f8:${e.fi}:${e.year}` } };
  }
  for (const f of ownFests(s)) {
    const ed = f.editions.at(-1), h = fests31(s).f[f.id]?.biz?.hist.at(-1);
    if (!ed || ed.year !== s.year || ed.weather === 'sun' || !h) continue;
    const a = mine27(s).find((x) => x.name === h.head);
    if (a) return { act: a, p: 1, data: { fest: f.name, k: `f12:${f.id}:${ed.year}` } };
  }
  return null;
}, run: (s, c) => {
  const a = c.act!;
  boost(s, a, { mom: 8, core: 0.08, fame: 2 });
  rep(s, 'artistic', 2);
  eggFire27(s, 'dawn_set', { act: a.id, sev: 40, hl: true, text: fmtL(T('{f}: o festival atrasou tanto que {a} só sobe ao palco na segunda de manhã. Toca para um campo quase vazio, de barro e lixo, ao nascer do sol — e quem ficou nunca mais esquece.', '{f}: the festival ran so late that {a} only takes the stage on Monday morning. They play to a near-empty field of mud and litter at sunrise — and those who stayed never forget it.'), { f: String(c.data?.fest ?? ''), a: a.name }) });
} });

// ---------------------------------------------------------------- 5. a fita pulou
R({ id: 'lipsync_skip', phase: 'month', p: 0.25, test: (s) => {
  if (!M(1989, 1991, s)) return null;
  const a = firstAct(s, (x) => x.members.length === 2 && (!!lipOf19(s, x.id) || x.songs.filter((id) => s.songs[id]?.sessionVocal && s.songs[id]?.releaseId).length >= 2));
  return a ? { act: a } : null;
}, run: (s, c) => {
  const a = c.act!;
  let x = lipOf19(s, a.id);
  if (!x) { x = { act: a.id, since: s.week - 52, risk: 60, by: 'player', mimes: 3 }; fk19(s).lip.push(x); }
  const t = fmtL(T('Show ao ar livre, playback no talo: a fita de {a} trava e repete a mesma frase sem parar. Os dois correm do palco. Em pouco tempo todo mundo sabe que eles nunca cantaram nos discos.', 'An open-air show, playback at full blast: {a}\'s tape jams and repeats the same line over and over. The two run off stage. Soon everyone knows they never sang on the records.'), { a: a.name });
  expose19(s, x, 'stage', t);
  eggFire27(s, 'lipsync_skip', { act: a.id, sev: 50, tone: 'bad', text: t });
} });

// ---------------------------------------------------------------- 6. Spinal Tap
const METAL = ['heavy_metal', 'thrash', 'hard_rock'];
R({ id: 'amp11', phase: 'month', p: 0.03, test: (s) => { const a = s.year >= 1984 ? firstAct(s, (x) => has(x, ...METAL)) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.amp11 = s.week; msg(s, 'amp11', T('Loja de instrumentos', 'Music shop').pt, T('Um amplificador diferente', 'A different amp'), fmtL(T('O guitarrista de {a} achou um amplificador cujos botões vão até 11. "É um a mais, entende? Quando você está no 10 e precisa de mais…"', '{a}\'s guitarist found an amp whose knobs go to 11. "It\'s one louder, isn\'t it? When you\'re at 10 and you need that extra push…"'), { a: a.name }), [{ id: 'buy', label: fmtL(T('Comprar ({v})', 'Buy ({v})'), { v: '$1.1k' }) }, { id: 'no', label: T('Por que não fazer o 10 mais alto?', 'Why not just make 10 louder?') }], { act: a.id }); } });
R({ id: 'stonehenge', phase: 'show', p: 0.05, test: (s, sh) => (sh && eg27(s).amp[sh.actId] !== undefined && alive(s.acts[sh.actId]) ? { act: s.acts[sh.actId] } : null),
  run: (s, c, _r, sh) => {
    const a = c.act!;
    boost(s, a, { fame: 0.5, core: 0.03, stress: 3 });
    eggFire27(s, 'stonehenge', { act: a.id, place: sh?.cityId, sev: 20, text: fmtL(T('{a} encomenda um Stonehenge para o palco. Alguém confunde pés com polegadas: desce do teto um monólito de 45 centímetros. A plateia ri; os fãs mais fiéis adoram.', '{a} orders a Stonehenge for the stage. Someone mixes up feet and inches: an 18-inch monolith descends from the ceiling. The crowd laughs; the hardcore fans love it.'), { a: a.name }) });
  } });
const FATES = [T('virou dentista numa cidade do litoral', 'became a dentist in a seaside town'), T('abriu uma padaria e não atende telefone', 'opened a bakery and won\'t answer the phone'), T('entrou para a banda de um navio de cruzeiro', 'joined a cruise ship band'),
  T('foi "se encontrar" no deserto e mandou um cartão-postal', 'went to "find himself" in the desert and sent a postcard'), T('jura que só toca jazz agora', 'swears he only plays jazz now'), T('sumiu numa névoa de gelo seco depois do bis', 'vanished in a dry-ice fog after the encore')];
R({ id: 'drummer_curse', phase: 'month', p: 1, test: (s) => {
  for (const [id, ds] of Object.entries(eg27(s).drums)) { const a = s.acts[id]; if (ds.length >= 3 && alive(a) && a.owner === 'player' && !a.catalogNo) return { act: a }; }
  return null;
}, run: (s, c, r) => {
  const a = c.act!;
  const f = [...FATES].sort(() => r.next() - 0.5).slice(0, 2);
  boost(s, a, { fame: 1, mom: 3 });
  eggFire27(s, 'drummer_curse', { act: a.id, sev: 25, text: fmtL(T('A maldição do baterista de {a}: um {x}, o outro {y}. O terceiro já pediu um contrato com cláusula de saída.', '{a}\'s drummer curse: one {x}, the other {y}. The third has asked for an exit clause.'), { a: a.name, x: f[0], y: f[1] }) });
} });

// ---------------------------------------------------------------- 8. M&M's marrons
R({ id: 'brown_mms', phase: 'show', p: 0.02, test: (s, sh) => { const a = sh && s.acts[sh.actId]; return a && M(1978, 1992, s) && alive(a) && a.owner === 'player' && familyOf(a.genre) === 'rock' && a.fame >= 25 ? { act: a } : null; },
  run: (s, c, _r, sh) => { const a = c.act!; eg27(s).seen.brown_mms = s.week; msg(s, 'brown_mms', T('Roadie-chefe', 'Head roadie').pt, T('M&M\'s marrons no camarim', 'Brown M&M\'s backstage'), fmtL(T('O rider de {a} diz, no meio de 50 páginas de exigências técnicas: "sem M&M\'s marrons". Hoje havia M&M\'s marrons em {c}. Se não leram isso, o que mais não leram?', '{a}\'s rider says, buried in 50 pages of technical demands: "no brown M&M\'s". Tonight there were brown M&M\'s in {c}. If they didn\'t read that, what else didn\'t they read?'), { a: a.name, c: cityN(sh?.cityId ?? a.city) }), [{ id: 'check', label: T('Conferir toda a estrutura (custa um pouco)', 'Check the whole rig (costs a little)') }, { id: 'ignore', label: T('É só chocolate', 'It\'s just candy') }], { act: a.id }, 2); } });

// ---------------------------------------------------------------- 9. fita sem nome
R({ id: 'mystery_tape_offer', phase: 'month', p: 0.004, test: (s) => (M(1955, 2010, s) && !eg27(s).tape && s.config.role !== 'artist' ? {} : null),
  run: (s, _c, r) => {
    const a = spawnProceduralAct(s, r, { genre: s.year >= 1958 ? 'folk' : 'country', members: 1, potential: 78, fame: 0, formedYear: s.year - 1 });
    eg27(s).seen.mystery_tape_offer = s.week;
    msg(s, 'mystery_tape_offer', '?', T('Uma fita sem nome', 'An unnamed tape'), T('Pelo correio, sem remetente: uma fita com canções de bar, voz cansada, letras sobre a cidade e os de baixo. Só um telefone a lápis.', 'By mail, no sender: a tape of bar songs, a weary voice, lyrics about the city and the people at the bottom. Just a phone number in pencil.'),
      [{ id: 'sign', label: T('Ligar e lançar o disco', 'Call and release the record') }, { id: 'shelve', label: T('Guardar na gaveta', 'Put it in a drawer') }], { act: a.id }, 8);
  } });
R({ id: 'mystery_tape', phase: 'month', p: 1, test: (s) => {
  const t = eg27(s).tape; const a = t && s.acts[t.act];
  if (!t || !a || !a.releases.length) return null;
  const wait = 27 + Math.floor(egRng(s, 'tape', t.act).next() * 6);
  return s.year >= t.y + wait ? { act: a } : null;
}, run: (s, c) => {
  const a = c.act!;
  a.fame = clamp(a.fame + 10, 0, 100); nudge16(s, a.id, 'ZAF', 25); nudge16(s, a.id, 'AUS', 8);
  if (a.releases.some((id) => s.releases[id]?.owner === 'player')) post(s, `egg27:tape:${s.week}`, money(s, 25000), 'sales', `Revival: ${a.name}`);
  eggFire27(s, 'mystery_tape', { act: a.id, sev: 45, hl: true, text: fmtL(T('Trinta anos depois, descobre-se que o disco de {a} — fracasso em casa — foi a trilha de uma geração inteira do outro lado do mundo, em cópias piratas. Fãs procuram "o que aconteceu com ele".', 'Thirty years on, it turns out {a}\'s record — a flop at home — was the soundtrack of a whole generation on the other side of the world, on bootleg copies. Fans go looking for "whatever happened to him".'), { a: a.name }) });
  eggFeat27(s, 'sugar27');
} });

// ---------------------------------------------------------------- 10. quinto integrante
R({ id: 'fifth_member', phase: 'month', p: 1, test: (s) => {
  for (const a of mine27(s).filter((x) => x.fame >= 75)) {
    const cnt: Record<string, number> = {};
    for (const id of a.songs) { const p = s.songs[id]?.producerId; if (p) cnt[p] = (cnt[p] ?? 0) + 1; }
    const top = Object.entries(cnt).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
    if (top && top[1] >= 4) { const pr = availableProducers(s).find((p) => p.id === top[0]); return { act: a, data: { key: top[0], name: pr?.name ?? top[0] } }; }
    const m = repOf(s, a.id);
    if (m) return { act: a, data: { key: `e:${m.id}`, name: mgrName(s, m) } };
  }
  return null;
}, run: (s, c) => {
  const a = c.act!, key = String(c.data!.key), name = String(c.data!.name);
  eg27(s).fifth[key] = { act: a.id, name, y: s.year };
  eggFire27(s, 'fifth_member', { act: a.id, sev: 30, text: fmtL(T('A imprensa começa a chamar {p} de "o quinto integrante" de {a}.', 'The press starts calling {p} "the fifth member" of {a}.'), { p: name, a: a.name }) });
  eggFeat27(s, 'fifth27');
} });
/** Título "O quinto integrante" para a ficha de uma pessoa (chave do produtor ou 'e:<empresário>'). */
export function fifthTitle27(s: GameState, key: string): L | null {
  const f = eg27(s).fifth[key];
  return f ? fmtL(T('O quinto integrante de {a} ({y})', 'The fifth member of {a} ({y})'), { a: s.acts[f.act]?.name ?? '?', y: f.y }) : null;
}

// ---------------------------------------------------------------- 13. carta perdida
R({ id: 'lost_letter', phase: 'month', p: 0.05, test: (s) => {
  if (s.year - s.config.startYear < 20) return null;
  const a = myActs(s).find((x) => x.members.some((m) => s.persons[m] && !s.persons[m].alive && (s.persons[m].died ?? 0) >= s.config.startYear));
  return a ? { act: a } : null;
}, run: (s, c) => {
  const a = c.act!;
  const p = a.members.map((m) => s.persons[m]).find((x) => x && !x.alive)!;
  a.fame = clamp(a.fame + 6, 0, 100);
  if (a.fame >= 50) a.legend = true;
  rep(s, 'artistic', 1);
  eggFire27(s, 'lost_letter', { act: a.id, sev: 40, text: fmtL(T('No arquivo do selo, entre contratos amarelados, aparece uma carta de {p} sobre {a}: o que queria dizer com aquelas canções, para quem eram. A carta é publicada e o legado ganha outra leitura.', 'In the label archive, among yellowed contracts, a letter from {p} about {a} turns up: what those songs meant, who they were for. It is published and the legacy is read anew.'), { p: p.name, a: a.name }) });
} });

// ---------------------------------------------------------------- 15. conquistas
R({ id: 'one_album_legend', phase: 'month', p: 1, test: (s) => { const a = myActs(s).find((x) => x.legend && x.releases.filter((id) => s.releases[id]?.type === 'lp' && !s.releases[id]?.reissueOf).length === 1); return a ? { act: a } : null; },
  run: (s, c) => { eggFire27(s, 'one_album_legend', { act: c.act!.id, sev: 30, text: fmtL(T('{a}: um disco só — e é uma lenda.', '{a}: a single record — and it is a legend.'), { a: c.act!.name }) }); eggFeat27(s, 'onealbum27'); } });
const minutesOf = (s: GameState, r: Release) => r.songs.reduce((t, id) => t + (s.songs[id]?.minutes ?? 4), 0);
const expOf = (s: GameState, r: Release) => { const v = r.songs.map((id) => s.songs[id]?.sound?.v?.[5]).filter((x): x is number => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
R({ id: 'noise_cult', phase: 'month', p: 0.2, test: (s) => {
  const r = myRels(s).find((x) => x.type === 'lp' && x.year <= s.year - 8 && x.totalUnits < 20000 && minutesOf(s, x) >= 60 && expOf(s, x) >= 75);
  return r ? { act: s.acts[r.actId], data: { rel: r.id } } : null;
}, run: (s, c) => {
  const r = s.releases[String(c.data!.rel)];
  r.critic = Math.max(r.critic ?? 0, 84); r.totalUnits += 6000;
  post(s, `egg27:noise:${s.week}`, money(s, 6000), 'sales', `Culto: ${r.title}`);
  eggFire27(s, 'noise_cult', { act: r.actId, sev: 30, text: fmtL(T('"{t}", mais de uma hora de ruído que ninguém comprou, vira objeto de culto: a crítica pede desculpas e os sebos cobram caro.', '"{t}", over an hour of noise nobody bought, becomes a cult object: critics apologise and record shops charge a fortune.'), { t: r.title }) });
  eggFeat27(s, 'noise27');
} });
R({ id: 'full_circle', phase: 'month', p: 1, test: (s) => {
  const al = eg27(s).alum;
  for (const a of mine27(s)) for (const m of a.members) { const par = s.persons[m]?.parentId; if (par && al[par] && !a.members.includes(par)) return { act: a, data: { kid: m, par } }; }
  return null;
}, run: (s, c) => {
  const a = c.act!; a.trust = clamp(a.trust + 10, 0, 100);
  eggFire27(s, 'full_circle', { act: a.id, sev: 30, text: fmtL(T('Ciclo completo: {k}, de {a}, é filho(a) de {p}, que você lançou anos atrás.', 'Full circle: {k}, of {a}, is the child of {p}, whom you launched years ago.'), { k: s.persons[String(c.data!.kid)]?.name ?? '?', a: a.name, p: s.persons[String(c.data!.par)]?.name ?? '?' }) });
  eggFeat27(s, 'circle27');
} });

// ---------------------------------------------------------------- 17–19 Brasil
R({ id: 'jovem_guarda', phase: 'month', p: 0.3, test: (s) => { const a = M(1965, 1968, s) ? firstAct(s, (x) => inBR(x.city) && has(x, 'jovem_guarda', 'beat', 'pop_rock', 'rnr')) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.jovem_guarda = s.week; msg(s, 'jovem_guarda', T('TV de São Paulo', 'São Paulo TV').pt, T('Convite: domingo à tarde', 'Invitation: Sunday afternoon'), fmtL(T('O programa jovem das tardes de domingo quer {a} no palco — terninho, franja e muito grito na plateia.', 'The Sunday afternoon youth show wants {a} on stage — slim suits, fringes and a lot of screaming.'), { a: a.name }), [{ id: 'go', label: T('Aceitar', 'Accept') }, { id: 'no', label: T('Recusar', 'Decline') }], { act: a.id }); } });
R({ id: 'tropicalia_exile', phase: 'month', p: 0.3, test: (s) => {
  if (!M(1969, 1972, s)) return null;
  const ex = soc18(s).exile;
  const a = mine27(s).find((x) => ex[x.id]?.reg === 'br');
  return a ? { act: a } : null;
}, run: (s, c) => { const a = c.act!; eg27(s).seen.tropicalia_exile = s.week; msg(s, 'tropicalia_exile', a.name, fmtL(T('Fitas de {c}', 'Tapes from {c}'), { c: cityN(a.city) }), fmtL(T('{a} manda do exílio uma caixa de fitas: canções com saudade, frio e cinza. Com o nome verdadeiro, o censor corta tudo. E com outro nome?', '{a} sends a box of tapes from exile: songs of longing, cold and grey skies. Under the real name, the censor cuts it all. Under another name?'), { a: a.name }), [{ id: 'pseudo', label: T('Lançar com pseudônimo', 'Release under a pseudonym') }, { id: 'wait', label: T('Esperar a volta', 'Wait for the return') }], { act: a.id }, 8); } });
R({ id: 'sai_do_chao', phase: 'show', p: 1, test: (s, sh) => { const a = sh && s.acts[sh.actId]; return a && sh!.cityId === 'salvador' && sh!.sold >= sh!.capacity && sh!.capacity > 0 && has(a, 'axe') && a.owner === 'player' ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).shake = { city: 'salvador', until: s.week + 1 }; boost(s, a, { core: 0.06, mom: 5, a3: 'BRA', a3v: 2 }); eggFire27(s, 'sai_do_chao', { act: a.id, place: 'salvador', sev: 25, hl: true, text: fmtL(T('"Sai do chão!": show de {a} esgotado em Salvador e o chão da cidade treme — dizem que deu para sentir no sismógrafo.', '"Off the ground!": {a}\'s sold-out show in Salvador and the city floor shakes — they say it showed up on the seismograph.'), { a: a.name }) }); } });
onFact('contest_final', (s, f) => {
  if (!M(1965, 1972, s) || f.data?.ct !== 'mpb' || eg27(s).seen.guitar_smash !== undefined) return;
  const a = f.actors.map((id) => s.acts[id]).find((x) => x && x.owner === 'player');
  if (!a || !(f.tags.includes('booed') || f.actors[0] !== a.id)) return;
  eg27(s).seen.guitar_smash = s.week;
  msg(s, 'guitar_smash', a.name, T('A plateia vaiou', 'The crowd booed'), fmtL(T('No festival da canção, a plateia vaia {a} do começo ao fim. No palco, um violão na mão e a raiva na garganta.', 'At the song festival, the crowd boos {a} from start to finish. On stage: a guitar in hand and anger in the throat.'), { a: a.name }), [{ id: 'smash', label: T('Quebrar o violão e jogar na plateia', 'Smash the guitar and throw it into the crowd') }, { id: 'bow', label: T('Agradecer e sair', 'Bow and leave') }], { act: a.id }, 3);
}, 'eggs27:smash');

// ---------------------------------------------------------------- os nossos (datas e lugares)
type Simple = { id: string; y0: number; y1: number; m?: number; p?: number; pick: (s: GameState, a: Act) => boolean; fx: (s: GameState, a: Act) => void; text: L; sev?: number; hl?: boolean; month?: boolean };
const simple = (x: Simple) => R({ id: x.id, phase: 'month', p: x.p ?? 1,
  test: (s) => { if (!M(x.y0, x.y1, s) || (x.m !== undefined && s.month !== x.m)) return null; const a = firstAct(s, (b) => x.pick(s, b)); return a ? { act: a } : null; },
  run: (s, c) => { x.fx(s, c.act!); eggFire27(s, x.id, { act: c.act!.id, sev: x.sev ?? 25, hl: x.hl, text: fmtL(x.text, { a: c.act!.name, c: cityN(c.act!.city) }) }); } });

R({ id: 'edison_lamb', phase: 'month', p: 0.5, test: (s) => (s.year <= 1890 && s.year - s.config.startYear <= 1 ? {} : null),
  run: (s) => { rep(s, 'institutional', 2); eggFire27(s, 'edison_lamb', { sev: 20, text: T('Um agente da Edison passa no escritório com um fonógrafo de cera e um funil de lata. Gira a manivela: "Mary had a little lamb…". É a mesma demonstração que lota a Exposição Universal de Paris.', 'An Edison agent drops by with a wax-cylinder phonograph and a tin horn. He turns the crank: "Mary had a little lamb…". It is the same demo packing the Paris Exposition Universelle.') }); } });
simple({ id: 'caruso_hotel', y0: 1902, y1: 1904, p: 0.3, pick: (_s, a) => IT.has(a.city) && has(a, 'opera', 'classical', 'canzone_napoletana', 'operetta'), fx: (s, a) => { boost(s, a, { fame: 4, a3: 'ITA', a3v: 4 }); rep(s, 'artistic', 1); },
  text: T('Milão: {a} grava dez faixas numa tarde, num quarto de hotel, com o técnico da gravadora inglesa suando sobre a corneta. Os discos atravessam o oceano.', 'Milan: {a} records ten sides in one afternoon, in a hotel room, with the English company\'s engineer sweating over the horn. The discs cross the ocean.') });
simple({ id: 'bristol_1927', y0: 1927, y1: 1927, p: 0.4, pick: (_s, a) => US_SOUTH.has(a.city) && has(a, 'country', 'old_time', 'gospel_quartet', 'gospel'), fx: (s, a) => boost(s, a, { fame: 4, casual: 0.1, a3: 'USA', a3v: 3 }),
  text: T('Um caçador de talentos com um gravador portátil aluga um galpão e anuncia no jornal. {a} pega a estrada, grava duas faixas e volta para casa com um cheque e um futuro.', 'A talent scout with a portable recorder rents a warehouse and advertises in the paper. {a} hits the road, cuts two sides and comes home with a check and a future.') });
R({ id: 'crossroads', phase: 'month', p: 0.03, test: (s) => { const a = M(1930, 1945, s) ? firstAct(s, (x) => has(x, 'delta_blues') && x.members.some((m) => s.persons[m]?.role === 'guitar' || s.persons[m]?.role === 'vocal')) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.crossroads = s.week; msg(s, 'crossroads', '?', T('Meia-noite, na encruzilhada', 'Midnight, at the crossroads'), fmtL(T('Um homem alto, de chapéu, espera o guitarrista de {a} onde duas estradas de terra se cruzam. Pede o violão, afina e devolve. "Agora você toca como ninguém. O preço a gente acerta depois."', 'A tall man in a hat waits for {a}\'s guitarist where two dirt roads cross. He asks for the guitar, tunes it and hands it back. "Now you play like nobody else. We\'ll settle the price later."'), { a: a.name }), [{ id: 'take', label: T('Aceitar o violão', 'Take the guitar') }, { id: 'run', label: T('Correr para casa', 'Run home') }], { act: a.id }, 2); } });
simple({ id: 'sinatra_riot', y0: 1944, y1: 1944, m: 9, pick: (_s, a) => a.city === 'new_york' && has(a, 'trad_pop', 'vocal_jazz', 'big_band', 'torch_song') && a.fame >= 30, fx: (s, a) => boost(s, a, { fame: 3, core: 0.15 }), hl: true,
  text: T('Dia de Colombo em Nova York: milhares de fãs adolescentes não conseguem entrar no teatro onde {a} canta e param a Times Square. A polícia nunca tinha visto nada igual.', 'Columbus Day in New York: thousands of teenage fans who can\'t get into the theater where {a} sings stop Times Square. The police had never seen anything like it.') });
simple({ id: 'crosby_tape', y0: 1947, y1: 1948, p: 0.2, pick: (_s, a) => has(a, 'trad_pop', 'vocal_jazz', 'cowboy_song') && a.fame >= 35, fx: (s, a) => boost(s, a, { stress: -10 }),
  text: T('{a} cansa de cantar o programa de rádio ao vivo duas vezes por noite e passa a gravá-lo em fita magnética, um invento trazido da Alemanha. Agora dá para editar — e dormir.', '{a} tires of singing the radio show live twice a night and starts pre-recording it on magnetic tape, a technology brought over from Germany. Now it can be edited — and they can sleep.') });
R({ id: 'million_quartet', phase: 'month', p: 1, test: (s) => {
  if (!at(s, 1956, 11) || !presence27(s, 'memphis')) return null;
  const xs = mine27(s).filter((a) => has(a, 'rnr', 'rockabilly', 'country', 'honky_tonk', 'gospel_quartet'));
  return xs.length >= 2 ? { act: xs[0], data: { b: xs[1].id } } : null;
}, run: (s, c) => {
  const a = c.act!, b = s.acts[String(c.data!.b)];
  boost(s, a, { fame: 2, insp: 15 }); boost(s, b, { fame: 2, insp: 15 });
  eggFire27(s, 'million_quartet', { act: a.id, actors: [b.id], place: 'memphis', sev: 35, hl: true, text: fmtL(T('4 de dezembro em Memphis: {a} e {b} se esbarram no estúdio e a sessão vira uma jam de gospel e rock\'n\'roll em volta do piano. O técnico deixa a fita rodando. Um jornal chama de "quarteto de um milhão de dólares".', 'December 4 in Memphis: {a} and {b} bump into each other at the studio and the session turns into a gospel and rock\'n\'roll jam round the piano. The engineer keeps the tape rolling. A paper calls it a "million dollar quartet".'), { a: a.name, b: b.name }) });
} });
simple({ id: 'chega_de_saudade', y0: 1958, y1: 1959, p: 0.3, pick: (_s, a) => a.city === 'rio' && has(a, 'bossa'), fx: (s, a) => { boost(s, a, { fame: 3 }); rep(s, 'artistic', 3); },
  text: T('Rio: o violão de {a} faz uma batida estranha, sincopada, quase sussurrada. Os puristas torcem o nariz; os jovens de Copacabana copiam tudo.', 'Rio: {a}\'s guitar plays a strange, syncopated, almost whispered beat. Purists frown; the young crowd in Copacabana copies everything.') });
simple({ id: 'sullivan_1964', y0: 1964, y1: 1964, m: 1, pick: (_s, a) => UK.has(a.city) && has(a, 'beat', 'pop_rock', 'skiffle', 'blues_rock', 'rnr') && a.fame >= 25, fx: (s, a) => boost(s, a, { fame: 5, casual: 0.2, a3: 'USA', a3v: 10 }), hl: true, sev: 40,
  text: T('Domingo à noite na TV americana: {a} toca no programa de variedades mais visto do país. Dezenas de milhões de famílias assistem; na segunda, todo garoto quer uma guitarra.', 'Sunday night on American TV: {a} plays the most-watched variety show in the country. Tens of millions of families tune in; on Monday every kid wants a guitar.') });
R({ id: 'scrambled_eggs', phase: 'month', p: 0.004, test: (s) => { if (s.year < 1965) return null; const a = firstAct(s, (x) => x.members.some((m) => (s.persons[m]?.skills.comp ?? 0) >= 50)); return a ? { act: a } : null; },
  run: (s, c) => {
    const a = c.act!, p = a.members.map((m) => s.persons[m]).filter((x) => x?.alive).sort((x, y) => y.skills.comp - x.skills.comp)[0];
    if (p) p.inspiration = 100;
    eggFire27(s, 'scrambled_eggs', { act: a.id, sev: 20, text: fmtL(T('{p}, de {a}, acorda com uma melodia inteira na cabeça e passa semanas perguntando a todo mundo se é plágio. Enquanto não acha a letra, a música se chama "Ovos mexidos".', '{p}, of {a}, wakes up with a whole melody in their head and spends weeks asking everyone whether it\'s someone else\'s. Until the words come, the song is called "Scrambled Eggs".'), { p: p?.name ?? '?', a: a.name }) });
  } });
R({ id: 'newport_1965', phase: 'month', p: 1, test: (s) => { const a = at(s, 1965, 6) ? firstAct(s, (x) => has(x, 'folk') && x.fame >= 20) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.newport_1965 = s.week; msg(s, 'newport_1965', a.name, T('Elétrico no festival de folk?', 'Electric at the folk festival?'), fmtL(T('{a} quer subir no palco do festival de folk com uma banda elétrica, guitarra plugada e volume alto. Os organizadores estão nervosos.', '{a} wants to take the folk festival stage with an electric band, guitar plugged in and loud. The organisers are nervous.'), { a: a.name }), [{ id: 'electric', label: T('Plugar', 'Plug in') }, { id: 'acoustic', label: T('Ficar no violão', 'Stay acoustic') }], { act: a.id }, 3); } });
R({ id: 'chacrinha', phase: 'month', p: 0.02, test: (s) => { const a = M(1967, 1988, s) ? firstAct(s, (x) => inBR(x.city) && x.fame >= 15 && x.fame <= 50) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.chacrinha = s.week; msg(s, 'chacrinha', T('Programa de auditório', 'Variety show').pt, T('"Vocês querem bacalhau?"', '"Who wants codfish?"'), fmtL(T('O apresentador mais anárquico da TV, de buzina e fantasia, quer {a} no programa de sábado. Ele joga bacalhau na plateia e dá abacaxi a quem desafina.', 'TV\'s most anarchic host, with his horn and costumes, wants {a} on the Saturday show. He throws codfish at the audience and hands a pineapple to whoever sings flat.'), { a: a.name }), [{ id: 'go', label: T('Ir ao programa', 'Go on the show') }, { id: 'no', label: T('Não é a nossa praia', 'Not our scene') }], { act: a.id }); } });
R({ id: 'glastonbury_milk', phase: 'month', p: 1, test: (s) => { if (s.year < 1970) return null; const f = ownFests(s).find((x) => UK.has(x.cityId) && x.editions.length >= 1); return f ? { data: { f: f.name } } : null; },
  run: (s, c) => { rep(s, 'institutional', 1); rep(s, 'artistic', 1); eggFire27(s, 'glastonbury_milk', { sev: 20, text: fmtL(T('{f}: o fazendeiro vizinho manda leite fresco e o ingresso passa a "incluir leite da fazenda". Ninguém esquece um festival que dá leite.', '{f}: the neighbouring farmer sends fresh milk and the ticket now "includes milk from the farm". Nobody forgets a festival that hands out milk.'), { f: String(c.data!.f) }) }); } });
simple({ id: 'clube_esquina', y0: 1970, y1: 1974, p: 0.3, pick: (_s, a) => a.city === 'bh' && has(a, 'mpb', 'bossa', 'rock_br'), fx: (s, a) => { boost(s, a, { insp: 20 }); s.scenes['bh:mpb'] = Math.min(100, (s.scenes['bh:mpb'] ?? 20) + 5); },
  text: T('Belo Horizonte: {a} passa as noites numa esquina de Santa Tereza, violões e amigos sentados no meio-fio. Dali sai um disco que ninguém sabe classificar.', 'Belo Horizonte: {a} spends its nights on a Santa Tereza street corner, guitars and friends on the kerb. Out of it comes a record nobody knows how to classify.') });
simple({ id: 'ziggy_1973', y0: 1972, y1: 1975, p: 0.05, pick: (_s, a) => a.city === 'london' && has(a, 'glam'), fx: (s, a) => boost(s, a, { fame: 3, mom: 10, stress: 6 }), hl: true,
  text: T('Último bis da turnê em Londres: {a} anuncia ao microfone que "este é o último show que faremos". A plateia chora — e a banda, que não sabia de nada, também.', 'Last encore of the tour in London: {a} announces into the mic that "this is the last show we\'ll ever do". The crowd weeps — and so does the band, who knew nothing about it.') });
simple({ id: 'bronx_1973', y0: 1973, y1: 1973, m: 7, pick: (_s, a) => a.city === 'new_york' && has(a, 'funk', 'soul', 'disco', 'rnb'), fx: (s, a) => { boost(s, a, { insp: 15 }); rep(s, 'artistic', 1); },
  text: T('Uma festa de volta às aulas no Bronx: um DJ usa dois toca-discos para esticar o break de um disco de {a} até a pista explodir. Alguém está inventando alguma coisa ali.', 'A back-to-school party in the Bronx: a DJ uses two turntables to stretch the break of a {a} record until the floor explodes. Someone is inventing something there.') });
simple({ id: 'waterloo_1974', y0: 1974, y1: 1974, m: 3, pick: (_s, a) => a.city === 'stockholm' && (familyOf(a.genre) === 'pop' || has(a, 'nordic_pop', 'glam')), fx: (s, a) => boost(s, a, { fame: 5, a3: 'GBR', a3v: 6, casual: 0.15 }), hl: true, sev: 35,
  text: T('{a} vence o concurso europeu de canção com roupas de cetim e botas plataforma. A Europa inteira cantarola o refrão.', '{a} win the European song contest in satin and platform boots. All of Europe hums the chorus.') });
simple({ id: 'grandola_1974', y0: 1974, y1: 1974, m: 3, pick: (_s, a) => a.city === 'lisbon', fx: (s, a) => { boost(s, a, { fame: 3, a3: 'PRT', a3v: 8 }); rep(s, 'institutional', 3); }, hl: true, sev: 40,
  text: T('Lisboa, madrugada de 25 de abril: uma rádio toca uma canção — e é a senha. Tropas na rua, cravos nos fuzis. O disco de {a} entra nessa noite para sempre.', 'Lisbon, before dawn on 25 April: a radio station plays a song — and it is the signal. Troops in the streets, carnations in the rifles. {a}\'s record becomes part of that night forever.') });
simple({ id: 'bowery_punk', y0: 1974, y1: 1978, p: 0.1, pick: (_s, a) => a.city === 'new_york' && has(a, 'punk', 'garage_rock', 'new_wave'), fx: (s, a) => boost(s, a, { core: 0.2, fame: 1 }),
  text: T('Um bar sujo no Bowery, que devia ser de country e bluegrass, dá a {a} as noites de segunda. O banheiro é um caso de polícia; a cena que nasce ali, de história.', 'A grimy Bowery bar that was meant for country and bluegrass gives {a} its Monday nights. The bathroom is a police matter; the scene born there is history.') });
R({ id: 'racional', phase: 'month', p: 0.05, test: (s) => { const a = M(1974, 1976, s) ? firstAct(s, (x) => has(x, 'soul_br')) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.racional = s.week; msg(s, 'racional', a.name, T('Um disco "racional"', 'A "rational" record'), fmtL(T('O cantor de {a} entrou numa seita, vestiu branco, largou tudo e quer gravar um disco inteiro sobre "o conhecimento". A gravadora odeia a ideia.', '{a}\'s singer has joined a sect, dresses in white, gave everything up and wants to record a whole album about "the knowledge". The label hates the idea.'), { a: a.name }), [{ id: 'record', label: T('Deixar gravar', 'Let them record it') }, { id: 'no', label: T('Vetar', 'Veto') }], { act: a.id }); } });
R({ id: 'racional_bloom', phase: 'month', p: 1, test: (s) => { const x = eg27(s).rac; const a = x && s.acts[x.act]; return a && s.year >= x!.y + 30 ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; a.fame = clamp(a.fame + 8, 0, 100); eggFire27(s, 'racional_bloom', { act: a.id, sev: 30, text: fmtL(T('O disco "racional" de {a}, renegado por décadas, vira o item mais procurado dos colecionadores de soul brasileiro.', '{a}\'s "rational" record, disowned for decades, becomes the most wanted item among Brazilian soul collectors.'), { a: a.name }) }); } });
R({ id: 'grundy_1976', phase: 'month', p: 0.5, test: (s) => { if (!(at(s, 1976, 11) || s.year === 1977)) return null; const a = firstAct(s, (x) => UK.has(x.city) && has(x, 'punk')); return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; const t = fmtL(T('No programa das seis da tarde, o apresentador provoca e {a} responde com uma enxurrada de palavrões, ao vivo. Manchete no dia seguinte: "A sujeira e a fúria". Os shows são cancelados — e todo adolescente do país sabe o nome da banda.', 'On the 6 pm show, the host goads them and {a} answer with a torrent of swearing, live. Next day\'s headline: "The filth and the fury". Gigs are cancelled — and every teenager in the country knows the band\'s name.'), { a: a.name });
    scandal(s, a.id, 'conduct', 25, t, { tags: ['egg27'] }); boost(s, a, { fame: 6, core: 0.1, a3: 'GBR', a3v: 8 }); eggFire27(s, 'grundy_1976', { act: a.id, sev: 40, hl: true, text: t }); } });
simple({ id: 'peace_1978', y0: 1978, y1: 1978, m: 3, pick: (_s, a) => a.city === 'kingston' && has(a, 'reggae', 'ska', 'dancehall') && a.fame >= 30, fx: (s, a) => { boost(s, a, { fame: 3, a3: 'JAM', a3v: 6 }); rep(s, 'institutional', 3); }, hl: true, sev: 40,
  text: T('Concerto da paz em Kingston: no meio da música, {a} chama ao palco os dois líderes rivais e junta as mãos deles no alto. O estádio inteiro prende a respiração.', 'Peace concert in Kingston: mid-song, {a} calls both rival leaders on stage and joins their hands above their heads. The whole stadium holds its breath.') });
simple({ id: 'robots', y0: 1978, y1: 2100, p: 0.05, pick: (_s, a) => DE.has(a.city) && has(a, 'krautrock', 'synthpop', 'techno'), fx: (s, a) => boost(s, a, { fame: 2, stress: -8 }),
  text: T('{a} manda manequins-robôs no lugar da banda para a sessão de fotos (e ameaça mandar para as entrevistas). A imprensa adora; a banda dorme até tarde.', '{a} sends robot mannequins in place of the band to the photo shoot (and threatens to send them to interviews). The press loves it; the band sleeps in.') });
simple({ id: 'disco_demolition', y0: 1979, y1: 1979, m: 6, pick: (_s, a) => has(a, 'disco'), fx: (s, a) => boost(s, a, { mom: -8, core: 0.1 }), sev: 30,
  text: T('Num estádio de beisebol, um locutor explode uma caçamba de discos de disco — inclusive um de {a}. O jogo é cancelado, a moda vira; os fãs de verdade ficam.', 'At a baseball stadium, a DJ blows up a crate of disco records — {a}\'s among them. The game is called off, the tide turns; the true fans stay.') });
const relWith = (s: GameState, f: (r: Release) => boolean) => myRels(s).find((r) => f(r));
R({ id: 'walkman', phase: 'month', p: 0.15, test: (s) => { const r = M(1979, 1981, s) ? relWith(s, (x) => x.formats.includes('cassette' as never) && x.year >= 1978) : undefined; return r && s.acts[r.actId] ? { act: s.acts[r.actId] } : null; },
  run: (s, c) => { boost(s, c.act!, { casual: 0.05 }); eggFire27(s, 'walkman', { act: c.act!.id, sev: 15, text: fmtL(T('Um tocador de fita do tamanho de um livro, com fones leves, vira febre: gente ouvindo {a} no metrô, na corrida, no ônibus.', 'A tape player the size of a book, with light headphones, becomes a craze: people listening to {a} on the subway, while jogging, on the bus.'), { a: c.act!.name }) }); } });
R({ id: 'home_taping', phase: 'month', p: 0.1, test: (s) => (M(1981, 1984, s) && relWith(s, (x) => x.formats.includes('cassette' as never)) ? {} : null),
  run: (s) => { eggFire27(s, 'home_taping', { sev: 15, text: T('Uma campanha da indústria espalha uma caveira feita de fita cassete: "gravar em casa está matando a música". Do outro lado, uma geração aprende a fazer mixtapes.', 'An industry campaign spreads a skull made out of a cassette: "home taping is killing music". Meanwhile a generation learns to make mixtapes.') }); } });
simple({ id: 'mtv_1981', y0: 1981, y1: 1981, m: 7, pick: (_s, a) => has(a, 'new_wave', 'synthpop', 'post_punk', 'pop_rock', 'glam', 'art_rock'), fx: (s, a) => boost(s, a, { fame: 4, casual: 0.1, a3: 'USA', a3v: 6 }), hl: true,
  text: T('Meia-noite: estreia um canal de TV só de clipes. Primeiro, uma música sobre o vídeo matando a estrela do rádio; logo depois, o clipe de {a}.', 'Midnight: a TV channel showing nothing but music videos launches. First, a song about video killing the radio star; soon after, {a}\'s clip.') });
R({ id: 'first_cd', phase: 'month', p: 1, test: (s) => { const r = s.year === 1982 && s.month >= 7 && s.month <= 9 ? relWith(s, (x) => x.formats.includes('cd' as never)) : undefined; return r ? { act: s.acts[r.actId], data: { t: r.title } } : null; },
  run: (s, c) => { rep(s, 'institutional', 1); rep(s, 'artistic', 1); eggFire27(s, 'first_cd', { act: c.act?.id, sev: 20, text: fmtL(T('"{t}" sai entre os primeiros discos a laser do mundo: 12 centímetros, nada de chiado. Colecionadores guardam o seu ainda lacrado.', '"{t}" comes out among the world\'s first laser discs: 12 centimetres, no hiss. Collectors keep theirs still sealed.'), { t: String(c.data!.t) }) }); } });
simple({ id: 'rock_in_rio_mud', y0: 1985, y1: 1985, m: 0, pick: (_s, a) => a.fame >= 40 && (inBR(a.city) || familyOf(a.genre) === 'rock'), fx: (s, a) => boost(s, a, { fame: 3, a3: 'BRA', a3v: 8, core: 0.05 }), hl: true,
  text: T('Rio, janeiro: o maior festival que o país já viu, dez noites de chuva e um mar de lama. {a} toca para centenas de milhares de capas de chuva — e o Brasil entra no mapa das turnês.', 'Rio, January: the biggest festival the country has ever seen, ten nights of rain and a sea of mud. {a} plays to hundreds of thousands of raincoats — and Brazil goes on the touring map.') });
R({ id: 'live_aid', phase: 'month', p: 1, test: (s) => { const a = at(s, 1985, 6) ? firstAct(s, (x) => x.fame >= 50) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.live_aid = s.week; msg(s, 'live_aid', T('Comitê do megaevento', 'Mega-event committee').pt, T('Vinte minutos, via satélite', 'Twenty minutes, via satellite'), fmtL(T('Dois estádios, dois continentes, uma transmissão por satélite para mais de cem países, contra a fome. {a} tem vinte minutos, sem cachê.', 'Two stadiums, two continents, a satellite broadcast to over a hundred countries, against famine. {a} gets twenty minutes, no fee.'), { a: a.name }), [{ id: 'yes', label: T('Tocar', 'Play') }, { id: 'no', label: T('Agenda cheia', 'Busy') }], { act: a.id }, 3); } });
simple({ id: 'graceland', y0: 1985, y1: 1987, p: 0.2, pick: (_s, a) => ['johannesburg', 'durban', 'cape_town'].includes(a.city) && has(a, 'mbaqanga', 'isicathamiya', 'marabi', 'kwaito', 'cape_jazz'), fx: (s, a) => { boost(s, a, { fame: 5, a3: 'USA', a3v: 6 }); boost(s, a, { a3: 'GBR', a3v: 4 }); },
  text: T('Uma estrela americana vem a Joanesburgo gravar com {a}. O disco corre o mundo — e reacende o debate sobre o boicote cultural ao apartheid.', 'An American star comes to Johannesburg to record with {a}. The album travels the world — and reignites the debate over the cultural boycott of apartheid.') });
simple({ id: 'wall_1989', y0: 1989, y1: 1989, m: 10, pick: (_s, a) => a.city === 'berlin', fx: (s, a) => { boost(s, a, { fame: 3, a3: 'DEU', a3v: 8 }); rep(s, 'institutional', 2); }, hl: true, sev: 40,
  text: T('Berlim, novembro: o muro abriu. {a} leva os instrumentos até a brecha e toca para quem passa de um lado para o outro.', 'Berlin, November: the wall is open. {a} carries its instruments to the breach and plays for the people crossing from one side to the other.') });
simple({ id: 'mangue_1991', y0: 1991, y1: 1994, p: 0.2, pick: (_s, a) => a.city === 'recife', fx: (s, a) => { s.scenes[`recife:${a.genre}`] = Math.min(100, (s.scenes[`recife:${a.genre}`] ?? 20) + 8); rep(s, 'artistic', 2); },
  text: T('Recife: {a} e amigos escrevem um manifesto — uma antena parabólica enfiada na lama do mangue, caranguejos com cérebro. A cena ganha nome.', 'Recife: {a} and friends write a manifesto — a satellite dish stuck in the mangrove mud, crabs with brains. The scene gets a name.') });
simple({ id: 'grunge_1992', y0: 1991, y1: 1993, p: 0.2, pick: (_s, a) => a.city === 'seattle' && has(a, 'grunge', 'alt_rock', 'indie'), fx: (s, a) => boost(s, a, { fame: 5, mom: 10 }), hl: true,
  text: T('Um disco gravado com pouco dinheiro por {a} tira o rei do pop do primeiro lugar. As lojas ficam sem camisa de flanela.', 'A record {a} made on a shoestring knocks the king of pop off number one. Shops run out of flannel shirts.') });
R({ id: 'slave_cheek', phase: 'month', p: 0.1, test: (s) => { const a = s.year >= 1990 ? firstAct(s, (x) => x.fame >= 60 && x.trust < 25 && !x.playerBand) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.slave_cheek = s.week; msg(s, 'slave_cheek', a.name, T('"Escravo"', '"Slave"'), fmtL(T('{a} aparece na premiação com a palavra "escravo" escrita no rosto. Na entrevista, diz que não é dono das próprias gravações.', '{a} shows up at the awards with the word "slave" written on their face. In the interview, says they don\'t own their own recordings.'), { a: a.name }), [{ id: 'renegotiate', label: T('Renegociar (devolver parte dos direitos)', 'Renegotiate (give back some rights)') }, { id: 'ignore', label: T('Contrato é contrato', 'A contract is a contract') }], { act: a.id }); } });
R({ id: 'klf_burn', phase: 'month', p: 0.05, test: (s) => { const a = s.year >= 1994 ? firstAct(s, (x) => UK.has(x.city) && familyOf(x.genre) === 'electronic' && x.cash >= money(s, 300000)) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; a.cash = 0; boost(s, a, { fame: 4 }); if (a.fame >= 40) a.legend = true; rep(s, 'artistic', 3);
    eggFire27(s, 'klf_burn', { act: a.id, sev: 40, hl: true, text: fmtL(T('Numa ilha escocesa, {a} queima todo o dinheiro que ganhou, nota por nota, e filma. Ninguém sabe se foi arte, protesto ou loucura — nem eles.', 'On a Scottish island, {a} burns all the money it made, note by note, and films it. Nobody knows if it was art, protest or madness — not even them.'), { a: a.name }) }); } });
R({ id: 'buena_vista', phase: 'month', p: 0.2, test: (s) => { const a = s.year >= 1996 ? firstAct(s, (x) => x.city === 'havana' && has(x, 'son', 'bolero', 'danzon', 'mambo', 'cha_cha', 'salsa') && x.members.length > 0 && x.members.reduce((t, m) => t + (s.year - (s.persons[m]?.born ?? s.year)), 0) / x.members.length >= 60) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; boost(s, a, { fame: 12, a3: 'USA', a3v: 8, casual: 0.3 }); boost(s, a, { a3: 'ESP', a3v: 6 }); eggFire27(s, 'buena_vista', { act: a.id, place: 'havana', sev: 40, hl: true, text: fmtL(T('Uma sessão de duas semanas num estúdio antigo de Havana junta {a} e outros veteranos esquecidos. O disco vira fenômeno mundial; alguns deles tocam pela primeira vez fora de Cuba.', 'A two-week session in an old Havana studio brings {a} together with other forgotten veterans. The album becomes a worldwide phenomenon; some of them play outside Cuba for the first time.'), { a: a.name }) }); } });
simple({ id: 'helmets', y0: 1997, y1: 2100, p: 0.05, pick: (_s, a) => a.city === 'paris' && familyOf(a.genre) === 'electronic' && a.members.length === 2, fx: (s, a) => { boost(s, a, { stress: -10 }); if (a.image) a.image.artistic = clamp(a.image.artistic + 5, 0, 100); },
  text: T('{a} decide: daqui em diante, só aparece em público de capacete de robô. A dupla anda na rua sem ser reconhecida; o mito cresce.', '{a} decide: from now on, they only appear in public in robot helmets. The duo walks the streets unrecognised; the myth grows.') });
R({ id: 'napster_leak', phase: 'month', p: 0.06, test: (s) => { if (!M(1999, 2002, s)) return null; const pr = s.pendingReleases.find((x) => s.acts[x.actId]?.owner === 'player'); return pr ? { act: s.acts[pr.actId], data: { t: pr.title } } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.napster_leak = s.week; msg(s, 'napster_leak', T('Departamento jurídico', 'Legal department').pt, fmtL(T('"{t}" vazou', '"{t}" leaked'), { t: String(c.data!.t) }), fmtL(T('Uma faixa inacabada de {a} apareceu nos programas de troca de arquivos semanas antes do lançamento. Os advogados querem processar até os fãs.', 'An unfinished {a} track turned up on file-sharing programs weeks before release. The lawyers want to sue the fans too.'), { a: a.name }), [{ id: 'sue', label: T('Processar', 'Sue') }, { id: 'embrace', label: T('Deixar rolar', 'Let it ride') }], { act: a.id }, 3); } });
simple({ id: 'kpop_vote', y0: 2005, y1: 2100, p: 0.1, pick: (_s, a) => a.city === 'seoul' && has(a, 'kpop') && a.fans.core >= 20000, fx: (s, a) => boost(s, a, { core: 0.1, fame: 2 }),
  text: T('Os fãs de {a} se organizam em planilhas, votam de madrugada e fazem streaming em turnos: o grupo leva o troféu do programa musical da semana.', '{a}\'s fans organise in spreadsheets, vote at dawn and stream in shifts: the group takes the weekly music show trophy.') });
R({ id: 'pwyw_2007', phase: 'month', p: 0.02, test: (s) => { const a = s.year >= 2007 ? firstAct(s, (x) => x.fame >= 55) : undefined; return a ? { act: a } : null; },
  run: (s, c) => { const a = c.act!; eg27(s).seen.pwyw_2007 = s.week; msg(s, 'pwyw_2007', a.name, T('Pague quanto quiser', 'Pay what you want'), fmtL(T('{a} quer lançar o próximo disco direto no site, pelo preço que cada fã quiser pagar — inclusive zero.', '{a} wants to release the next album straight on its website, at whatever price each fan wants to pay — including zero.'), { a: a.name }), [{ id: 'yes', label: T('Topar', 'Go for it') }, { id: 'no', label: T('Disco tem preço', 'Records have a price') }], { act: a.id }); } });
const revival = (id: string, p: number, y0: number, pick: (s: GameState, r: Release) => boolean, fame: number, cash: number, text: L, a3?: string) => R({ id, phase: 'month', p,
  test: (s) => { if (s.year < y0) return null; const r = relWith(s, (x) => pick(s, x) && !!s.acts[x.actId]); return r ? { act: s.acts[r.actId], data: { t: r.title, rel: r.id } } : null; },
  run: (s, c) => { const a = c.act!; boost(s, a, { fame, mom: 15, a3, a3v: a3 ? 6 : 0 }); const r = s.releases[String(c.data!.rel)]; if (r) r.totalUnits += Math.round(cash / 2); post(s, `egg27:${id}:${s.week}`, money(s, cash), 'sales', `Revival: ${String(c.data!.t)}`); eggFire27(s, id, { act: a.id, sev: 35, hl: true, text: fmtL(text, { a: a.name, t: String(c.data!.t) }) }); } });
revival('rickroll', 0.03, 2007, (s, r) => r.type === 'single' && r.year >= 1985 && r.year <= 1990 && (familyOf(s.acts[r.actId]?.genre ?? '') === 'pop' || has(s.acts[r.actId], 'dance_pop', 'pop_rnb', 'new_jack')), 6, 12000,
  T('Uma pegadinha da internet troca links por "{t}", de {a}: milhões de pessoas clicam esperando outra coisa — e ficam até o fim.', 'An internet prank swaps links for {a}\'s "{t}": millions click expecting something else — and stay till the end.'));
revival('needle_drop', 0.02, 2016, (s, r) => r.year >= 1980 && r.year <= 1989 && has(s.acts[r.actId], 'synthpop', 'new_wave', 'art_rock', 'post_punk'), 6, 20000,
  T('Uma série de TV usa "{t}", de {a}, numa cena decisiva. Na semana seguinte, a faixa de quase 40 anos está nas paradas de novo.', 'A TV series uses {a}\'s "{t}" in a key scene. The next week, the nearly 40-year-old track is in the charts again.'));
revival('city_pop_revival', 0.1, 2017, (s, r) => r.year >= 1976 && r.year <= 1989 && has(s.acts[r.actId], 'city_pop'), 8, 15000,
  T('O algoritmo de vídeos recomenda "{t}", de {a}, a milhões de pessoas que nunca foram a Tóquio. A capa vira papel de parede no mundo inteiro.', 'The video algorithm recommends {a}\'s "{t}" to millions who have never been to Tokyo. The cover becomes a wallpaper all over the world.'), 'USA');

// ---------------------------------------------------------------- caça à gravação perdida (FEX)
const BEATS27: L[] = [
  T('O fórum da gravação misteriosa passa de mil membros. Alguém jura que ouviu a fita num programa de rádio de madrugada.', 'The mystery recording forum passes a thousand members. Someone swears the tape is from a late-night radio show.'),
  T('Discussões de 400 páginas sobre uma palavra: "wind" ou "mind"? Linguistas amadores analisam o sotaque.', '400-page threads over one word: "wind" or "mind"? Amateur linguists study the accent.'),
  T('Um ex-locutor de rádio dos anos 80 é procurado; não se lembra, mas manda fotos do estúdio.', 'A former 80s radio host is tracked down; he doesn\'t remember, but sends photos of the studio.'),
  T('Colecionadores varrem catálogos de selos pequenos e listas de bandas de festival. Nada ainda.', 'Collectors comb through small-label catalogs and festival band lists. Nothing yet.'),
  T('Um vídeo sobre "a canção mais misteriosa da internet" passa de um milhão de visualizações.', 'A video about "the most mysterious song on the internet" passes a million views.'),
  T('Alguém refaz o arranjo inteiro de ouvido e grava uma versão; a original continua sem nome.', 'Someone recreates the whole arrangement by ear and records a version; the original is still unnamed.'),
];
R({ id: 'fex_hunt', phase: 'month', p: 0.02, test: (s) => {
  if (s.year < 2007 || eg27(s).hunt || !quarterly(s)) return null;
  const old = actsNow27(s).filter((a) => a.debutYear >= 1980 && a.debutYear <= 1989 && a.songs.length > 0 && (a.status === 'retired' || a.status === 'split' || a.fame < 12) && !a.catalogNo);
  const pick = old.find((a) => a.releases.some((id) => s.releases[id]?.owner === 'player')) ?? old.sort((x, y) => x.fame - y.fame || (x.id < y.id ? -1 : 1))[0];
  return pick ? { act: pick, p: pick.releases.some((id) => s.releases[id]?.owner === 'player') ? 0.04 : 0.02 } : null;
}, run: (s, c, r) => {
  const a = c.act!;
  const title = s.songs[r.pick(a.songs)]?.title ?? 'Untitled';
  eg27(s).hunt = { act: a.id, title, y0: s.year, next: s.week + r.int(14, 30), beats: 0, clues: 0, tried: {} };
  eggFire27(s, 'fex_hunt', { sev: 30, text: T('Um fragmento de música gravado do rádio numa fita dos anos 80 aparece num fórum, sem título e sem artista. Uma voz, uma guitarra, um refrão meio inaudível. A internet começa a procurar.', 'A fragment of music taped off the radio in the 80s turns up on a forum, with no title and no artist. A voice, a guitar, a half-audible chorus. The internet starts searching.') });
  huntMsg(s);
} });
function huntMsg(s: GameState): void {
  const h = eg27(s).hunt;
  if (!h || h.done) return;
  const acts = [{ id: 'archive', label: T('Vasculhar o arquivo do selo', 'Search the label archive') }, { id: 'masters', label: T('Ouvir fitas master antigas (custa)', 'Listen to old master tapes (costs)') }, { id: 'members', label: T('Procurar ex-integrantes de bandas dos anos 80', 'Track down former members of 80s bands') }].filter((x) => !h.tried[x.id]);
  if (!acts.length) return;
  pushInbox18(s, 'egg27', { from: T('Fórum da fita misteriosa', 'Mystery tape forum').pt, subject: T('Ajude a achar a canção sem nome', 'Help find the nameless song'), body: T('A comunidade pede ajuda à indústria: quem tem arquivo, fitas master ou contato com músicos da época pode resolver o mistério.', 'The community asks the industry for help: anyone with an archive, master tapes or contacts with musicians from back then could solve the mystery.'),
    actions: [...acts, { id: 'watch', label: T('Só acompanhar', 'Just watch') }], ref: { egg: 'fex_hunt' }, weeks: 8, tone: 'info' });
}
function huntSolve(s: GameState, helped: boolean): void {
  const st = eg27(s), h = st.hunt;
  if (!h || h.done) return;
  h.done = s.week; if (helped) h.helped = 1;
  const a = s.acts[h.act];
  if (a) {
    a.fame = clamp(a.fame + 10, 0, 100); a.momentum = clamp(a.momentum + 20, 0, 100); a.fans.casual += 20000;
    const own = a.releases.filter((id) => s.releases[id]?.owner === 'player');
    if (own.length) { post(s, `egg27:fex:${s.week}`, money(s, 30000), 'sales', `Revival: ${h.title}`); for (const id of own) s.releases[id].totalUnits += 8000; }
    else if (helped) rep(s, 'artistic', 2);
  }
  eggFire27(s, 'fex_solved', { act: h.act, sev: 45, hl: true, text: fmtL(helped ? T('Mistério resolvido com a sua ajuda: a canção sem nome é "{t}", de {a}, uma banda esquecida dos anos 80. Os ex-integrantes nem sabiam que a internet procurava por eles há {n} anos. Revival imediato.', 'Mystery solved with your help: the nameless song is "{t}" by {a}, a forgotten 80s band. The former members had no idea the internet had been looking for them for {n} years. Instant revival.')
    : T('Depois de {n} anos de busca, a comunidade identifica a canção sem nome: "{t}", de {a}. Revival imediato.', 'After {n} years of searching, the community identifies the nameless song: "{t}" by {a}. Instant revival.'), { t: h.title, a: a?.name ?? '?', n: Math.max(1, s.year - h.y0) }) });
  if (helped) eggFeat27(s, 'lostmedia27');
}
function huntMonth(s: GameState): void {
  const h = eg27(s).hunt;
  if (!h || h.done || s.week < h.next) return;
  const r = egRng(s, 'fexbeat', h.beats);
  if (h.clues >= 2) { huntSolve(s, true); return; }
  if (s.year - h.y0 >= 17) { huntSolve(s, false); return; }
  const t = BEATS27[h.beats % BEATS27.length];
  h.beats++; h.next = s.week + r.int(36, 60);
  emitFact(s, { kind: 'easter_egg', actors: ['player'], severity: 10, visibility: 'public', tags: ['egg27', 'fex_beat'], text: t, src: 'eggs27', data: { egg: 'fex_beat' } });
  remember(s, 'egg27', t);
  if (h.beats <= 4) huntMsg(s);
}
function huntHelp(s: GameState, action: string): L {
  const h = eg27(s).hunt;
  if (!h || h.done) return T('O mistério já foi resolvido.', 'The mystery is already solved.');
  if (action === 'watch') return T('Você acompanha de longe.', 'You follow from afar.');
  h.tried[action] = 1;
  const a = s.acts[h.act];
  const r = egRng(s, `fexhelp:${action}`);
  let gain = 0, t: L;
  if (action === 'archive') {
    const ours = !!a && a.releases.some((id) => s.releases[id]?.owner === 'player');
    gain = ours ? 2 : 0;
    t = ours ? T('No arquivo, uma caixa de fitas com a etiqueta da sua antiga gravadora: a melodia está lá, com nome e tudo.', 'In the archive, a box of tapes with your old label\'s sticker: the melody is there, title and all.') : T('Nada no seu arquivo — mas você descarta uma dezena de pistas falsas.', 'Nothing in your archive — but you rule out a dozen false leads.');
  } else if (action === 'masters') {
    post(s, `egg27:fexm:${s.week}`, -money(s, 3000), 'misc', 'Fitas master: caça à gravação perdida');
    gain = r.chance(0.5) ? 1 : 0;
    t = gain ? T('Numa fita master de um selo falido, o mesmo riff — em outra mixagem. Pista quente.', 'On a master tape from a defunct label, the same riff — in another mix. A hot lead.') : T('Horas de fitas master, nenhuma pista.', 'Hours of master tapes, no leads.');
  } else {
    const anyAlive = !!a && a.members.some((m) => s.persons[m]?.alive);
    gain = anyAlive ? 1 : 0;
    t = anyAlive ? T('Um ex-baixista reconhece a linha de baixo no primeiro segundo, mas pede tempo para falar com os antigos colegas antes de tornar público.', 'A former bassist recognises the bassline in the first second, but asks for time to talk to his old bandmates before going public.') : T('Os músicos da época que você encontra não reconhecem a canção.', 'The musicians from back then you find don\'t recognise the song.');
  }
  h.clues += gain;
  if (h.clues >= 2) h.next = Math.min(h.next, s.week + 4);
  return t;
}
/** Estado da caça (para a interface). */
export const hunt27 = (s: GameState): Hunt27 | undefined => eg27(s).hunt;

// ================================================================ caixa de entrada: respostas
const H: Record<string, (s: GameState, a: Act | undefined, action: string, ref: Record<string, string | number>) => L> = {
  memphis_1953: (s, a, x) => !a ? T('Sumiu.', 'Gone.') : x === 'sign' ? signEgg27(s, a) : x === 'listen' ? (addLead18(s, egRng(s, 'memlisten'), a, 'demo', 4, 3, T('Segunda audição.', 'Second listen.')), fmtL(T('A voz de {a} fica na cabeça (pista grau 4).', '{a}\'s voice sticks in your head (degree 4 lead).'), { a: a.name })) : T('A ficha fica na gaveta da recepção.', 'The note stays in the reception drawer.'),
  street_3am: (s, a, x, ref) => H.memphis_1953(s, a, x, ref),
  decca_audition: (s, a, x) => { if (x === 'sign' && a) return signEgg27(s, a); deccaFire(s, a); return T('Você fica com o outro grupo, o da sua cidade.', 'You go with the other group, the local one.'); },
  rooftop_1969: (s, a, x) => { if (!a || x !== 'play') return T('O telhado fica em silêncio.', 'The roof stays quiet.'); boost(s, a, { fame: 4, mom: 10, casual: 0.05, a3: 'GBR', a3v: 4 }); eggFire27(s, 'rooftop_1969', { act: a.id, place: 'london', sev: 40, hl: true, text: fmtL(T('Meio-dia de janeiro em Londres: {a} toca no telhado sem avisar. A rua para, os escritórios abrem as janelas — e depois de uns 40 minutos a polícia sobe e manda desligar.', 'A January noon in London: {a} plays on the roof unannounced. The street stops, offices open their windows — and after some 40 minutes the police come up and pull the plug.'), { a: a.name }) }); return T('O show vira história.', 'The gig becomes history.'); },
  amp11: (s, a, x) => { if (!a || x !== 'buy') return T('O 10 continua sendo o máximo.', '10 is still the top.'); post(s, `egg27:amp:${s.week}`, -money(s, 1100), 'live_costs', 'Amplificador que vai até 11'); eg27(s).amp[a.id] = s.week; eggFire27(s, 'amp11', { act: a.id, sev: 15, text: fmtL(T('{a} agora tem um amplificador que vai até 11. É um a mais.', '{a} now owns an amp that goes to 11. It\'s one louder.'), { a: a.name }) }); eggFeat27(s, 'amp11'); return T('Um a mais.', 'One louder.'); },
  brown_mms: (s, a, x) => { if (!a) return T('—', '—'); if (x === 'check') { post(s, `egg27:mms:${s.week}`, -money(s, 300), 'live_costs', 'Vistoria da estrutura'); rep(s, 'artists', 1); eggFire27(s, 'brown_mms', { act: a.id, sev: 20, text: fmtL(T('A equipe de {a} confere tudo e acha o piso do palco mal escorado: arrumado a tempo. As M&M\'s marrons salvaram o show.', '{a}\'s crew checks everything and finds the stage floor badly braced: fixed in time. The brown M&M\'s saved the show.'), { a: a.name }) }); return T('Estrutura conferida.', 'Rig checked.'); }
    boost(s, a, { stress: 8, casual: -0.03 }); post(s, `egg27:mms:${s.week}`, -money(s, 900), 'live_costs', 'Estrago no palco'); eggFire27(s, 'brown_mms', { act: a.id, sev: 30, tone: 'bad', text: fmtL(T('Ninguém leu o rider de {a}: no bis, parte do piso do palco cede. Ninguém se fere, mas o show acaba ali.', 'Nobody read {a}\'s rider: during the encore, part of the stage floor gives way. Nobody is hurt, but the show ends there.'), { a: a.name }) }); return T('O show deu errado.', 'The show went wrong.'); },
  mystery_tape_offer: (s, a, x) => { if (!a || x !== 'sign') return T('A fita fica na gaveta.', 'The tape stays in the drawer.'); const t = signEgg27(s, a); if (a.owner === 'player') eg27(s).tape = { act: a.id, y: s.year }; return t; },
  jovem_guarda: (s, a, x) => { if (!a || x !== 'go') return T('Fica para outro domingo.', 'Another Sunday, then.'); boost(s, a, { fame: 4, mom: 6, a3: 'BRA', a3v: 5 }); eg27(s).garage = 1; eggFire27(s, 'jovem_guarda', { act: a.id, sev: 30, text: fmtL(T('Domingo à tarde na TV: {a} canta para um auditório histérico. Na segunda, a sede amanhece com um calhambeque estacionado na garagem — presente de um fã.', 'Sunday afternoon on TV: {a} sings to a screaming studio audience. On Monday, an old jalopy is parked in the HQ garage — a gift from a fan.'), { a: a.name }) }); return T('É uma brasa, mora!', 'Groovy!'); },
  tropicalia_exile: (s, a, x) => { if (!a || x !== 'pseudo') return T('As fitas esperam.', 'The tapes wait.'); boost(s, a, { fame: 3, a3: 'BRA', a3v: 4, insp: 10 }); rep(s, 'artistic', 2); eggFire27(s, 'tropicalia_exile', { act: a.id, sev: 30, text: fmtL(T('O disco que {a} gravou no exílio sai no Brasil com outro nome na capa. O censor carimba "liberado"; meio país sabe de quem é a voz.', 'The record {a} made in exile comes out in Brazil with another name on the cover. The censor stamps it "approved"; half the country knows whose voice it is.'), { a: a.name }) }); return T('Driblou o censor.', 'Dodged the censor.'); },
  guitar_smash: (s, a, x) => { if (!a || x !== 'smash') return T('Você agradece e sai sob vaias.', 'You bow and leave under boos.'); boost(s, a, { fame: 3, mom: 8, a3: 'BRA', a3v: 4 }); eggFire27(s, 'guitar_smash', { act: a.id, sev: 40, hl: true, text: fmtL(T('"Vocês ganharam!": vaiado do começo ao fim, {a} quebra o violão no banquinho e joga os pedaços na plateia. É a imagem do festival.', '"You win!": booed from start to finish, {a} smashes the guitar on the stool and throws the pieces into the crowd. It is the image of the festival.'), { a: a.name }) }); return T('Manchete.', 'Headline.'); },
  crossroads: (s, a, x) => { if (!a || x !== 'take') return T('Você corre e não olha para trás.', 'You run and never look back.'); const p = a.members.map((m) => s.persons[m]).find((q) => q?.alive && (q.role === 'guitar' || q.role === 'vocal')); if (p) { p.skills.instr = clamp(p.skills.instr + 12, 0, 100); p.inspiration = 100; p.stress = clamp(p.stress + 15, 0, 100); }
    eggFire27(s, 'crossroads', { act: a.id, sev: 30, text: fmtL(T('Ninguém sabe o que aconteceu na encruzilhada. Mas {p}, de {a}, voltou tocando como ninguém — e com um olhar que assusta.', 'Nobody knows what happened at the crossroads. But {p}, of {a}, came back playing like nobody else — with a look that frightens people.'), { p: p?.name ?? '?', a: a.name }) }); return T('Feito.', 'Done.'); },
  newport_1965: (s, a, x) => { if (!a || x !== 'electric') return T('Violão e gaita, como sempre.', 'Guitar and harmonica, as always.'); boost(s, a, { mom: -6 }); a.positioning = clamp(a.positioning + 10, 0, 100); rep(s, 'artistic', 3); eggFire27(s, 'newport_1965', { act: a.id, sev: 35, hl: true, text: fmtL(T('{a} pluga a guitarra no festival de folk. Vaias, gritos de "traidor", alguém procurando um machado para cortar o cabo. Anos depois, todo mundo diz que estava lá.', '{a} plugs in at the folk festival. Boos, shouts of "traitor", someone looking for an axe to cut the cable. Years later, everyone claims they were there.'), { a: a.name }) }); return T('Plugado.', 'Plugged in.'); },
  chacrinha: (s, a, x) => { if (!a || x !== 'go') return T('Fica para a próxima.', 'Maybe next time.'); boost(s, a, { fame: 2, a3: 'BRA', a3v: 5, casual: 0.08 }); a.positioning = clamp(a.positioning + 8, 0, 100); eggFire27(s, 'chacrinha', { act: a.id, sev: 25, text: fmtL(T('{a} canta no programa de auditório entre chacretes, buzinadas e bacalhau voando. O Brasil inteiro viu.', '{a} sings on the variety show between dancers, horn blasts and flying codfish. All of Brazil saw it.'), { a: a.name }) }); return T('"Alô, alô, Terezinha!"', '"Hello, hello, Terezinha!"'); },
  racional: (s, a, x) => { if (!a || x !== 'record') return T('Disco vetado.', 'Record vetoed.'); boost(s, a, { mom: -10 }); eg27(s).rac = { act: a.id, y: s.year }; eggFire27(s, 'racional', { act: a.id, sev: 25, text: fmtL(T('{a} grava um disco inteiro sobre "o conhecimento". Ninguém compra; o cantor depois renega tudo.', '{a} records a whole album about "the knowledge". Nobody buys it; the singer later disowns it all.'), { a: a.name }) }); return T('Gravado.', 'Recorded.'); },
  live_aid: (s, a, x) => { if (!a || x !== 'yes') return T('Você assiste pela TV.', 'You watch it on TV.'); boost(s, a, { fame: 4, casual: 0.15, a3: 'USA', a3v: 4 }); boost(s, a, { a3: 'GBR', a3v: 4 }); rep(s, 'institutional', 2); eggFire27(s, 'live_aid', { act: a.id, sev: 40, hl: true, text: fmtL(T('Vinte minutos de {a} para o mundo inteiro, via satélite, num estádio lotado. O telefone das doações não para.', 'Twenty minutes of {a} for the whole world, via satellite, in a packed stadium. The donation lines never stop ringing.'), { a: a.name }) }); return T('Para o mundo inteiro.', 'For the whole world.'); },
  slave_cheek: (s, a, x) => { if (!a) return T('—', '—'); if (x === 'renegotiate') { a.trust = clamp(a.trust + 25, 0, 100); post(s, `egg27:slave:${s.week}`, -money(s, 20000), 'legal', `Renegociação: ${a.name}`); eggFire27(s, 'slave_cheek', { act: a.id, sev: 30, text: fmtL(T('Você devolve parte dos direitos a {a}. A palavra some do rosto; a confiança volta aos poucos.', 'You give some rights back to {a}. The word disappears from their face; trust slowly returns.'), { a: a.name }) }); return T('Renegociado.', 'Renegotiated.'); }
    a.trust = clamp(a.trust - 5, 0, 100); boost(s, a, { fame: 2 }); rep(s, 'commercial', -2); eggFire27(s, 'slave_cheek', { act: a.id, sev: 35, tone: 'bad', text: fmtL(T('{a} troca de nome, vira um símbolo e lança discos só para cumprir contrato. A imprensa toma o lado do artista.', '{a} changes name to a symbol and releases records just to fulfil the contract. The press sides with the artist.'), { a: a.name }) }); return T('Crise aberta.', 'Open crisis.'); },
  napster_leak: (s, a, x) => { if (!a) return T('—', '—'); if (x === 'sue') { rep(s, 'commercial', 1); boost(s, a, { casual: -0.05, core: -0.03 }); eggFire27(s, 'napster_leak', { act: a.id, sev: 30, tone: 'bad', text: fmtL(T('Você processa os programas de troca de arquivos — e, na prática, os fãs de {a}. Ganha no tribunal, perde no fórum.', 'You sue the file-sharing services — and, in practice, {a}\'s fans. You win in court and lose on the forums.'), { a: a.name }) }); return T('Processo aberto.', 'Lawsuit filed.'); }
    boost(s, a, { casual: 0.1 }); eggFire27(s, 'napster_leak', { act: a.id, sev: 25, text: fmtL(T('A faixa vazada de {a} roda o mundo antes do disco: menos vendas na primeira semana, muito mais gente nos shows.', '{a}\'s leaked track circles the globe ahead of the album: fewer first-week sales, many more people at the shows.'), { a: a.name }) }); return T('Deixou rolar.', 'Let it ride.'); },
  pwyw_2007: (s, a, x) => { if (!a || x !== 'yes') return T('Disco tem preço.', 'Records have a price.'); boost(s, a, { core: 0.15 }); rep(s, 'artistic', 2); post(s, `egg27:pwyw:${s.week}`, money(s, 8000), 'sales', `Pague quanto quiser: ${a.name}`); eggFire27(s, 'pwyw_2007', { act: a.id, sev: 30, hl: true, text: fmtL(T('{a} lança o disco pelo preço que cada um quiser pagar. Muitos pagam zero; muitos pagam mais do que valeria. A indústria inteira discute.', '{a} releases the album at whatever price people want to pay. Many pay nothing; many pay more than it\'s worth. The whole industry argues about it.'), { a: a.name }) }); return T('Lançado.', 'Released.'); },
};
registerInboxKind('egg27', { label: l('Algo curioso', 'Something curious'), cat: 'decision', icon: 'sparkle', prio: 1, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const id = String(m.ref?.egg ?? '');
    if (id === 'fex_hunt') return huntHelp(s, action);
    const a = m.ref?.act ? s.acts[String(m.ref.act)] : undefined;
    const fn = H[id];
    return fn ? fn(s, a, action, m.ref as Record<string, string | number>) : T('Anotado.', 'Noted.');
  } });

// ================================================================ ovos chamados pela interface

/** Músico de rua das 3 da manhã (clique no mapa da cidade): pista rara de alto potencial, uma vez por partida. */
export function streetBusker27(s: GameState): L | null {
  const st = eg27(s);
  if (st.seen.street_3am !== undefined) return null;
  const r = egRng(s, 'street');
  const city = s.config.homeCity;
  const scenes = cityById[city]?.scenes ?? [];
  const a = spawnProceduralAct(s, r, { city, genre: scenes.length ? r.pick(scenes) : undefined, potential: 88, members: 1, fame: 0, formedYear: s.year });
  a.potential = Math.max(a.potential, 86);
  addLead18(s, r, a, 'street', 3, 5, T('Músico de rua, 3 da manhã.', 'Street musician, 3 AM.'));
  const t = fmtL(T('3 da manhã, uma esquina vazia de {c}: {a} toca para ninguém, com o estojo aberto e três moedas dentro. Você para.', '3 AM, an empty corner of {c}: {a} plays to nobody, case open with three coins inside. You stop.'), { c: cityN(city), a: a.name });
  eggFire27(s, 'street_3am', { act: a.id, place: city, sev: 20, text: t });
  msg(s, 'street_3am', a.name, T('O músico das 3 da manhã', 'The 3 AM busker'), t, SIGNPASS(T('Fazer proposta', 'Make an offer')), { act: a.id }, 8);
  return t;
}
/** Pele temporária da interface ('phono' = 1889, 'chip' = Konami). */
export function setSkin27(s: GameState, k: string, weeks: number): void { eg27(s).skin = weeks > 0 ? { k, until: s.week + weeks } : undefined; }
export const skin27 = (s: GameState): string | null => { const x = eg27(s).skin; return x && (x.until >= s.week || x.until < 0) ? x.k : null; };
/** O chão treme no mapa desta cidade? */
export const shake27 = (s: GameState, city: string): boolean => { const x = eg27(s).shake; return !!x && x.city === city && x.until >= s.week; };
/** Calhambeque na garagem da sede. */
export const garage27 = (s: GameState): boolean => !!eg27(s).garage;
/** Ovos achados (só os do catálogo). */
export const found27 = (s: GameState): string[] => Object.keys(eg27(s).seen).filter((id) => eggMeta27[id]);

// ================================================================ ganchos

function tickRules(s: GameState, phase: 'month' | 'show', show?: Show27): void {
  const st = eg27(s);
  for (const x of RULES27) {
    if (x.phase !== phase || (!x.again && st.seen[x.id] !== undefined)) continue;
    let c: Ctx27 | null = null;
    try { c = x.test(s, show); } catch { c = null; }
    if (!c) continue;
    const r = egRng(s, x.id, phase === 'show' ? `${s.week}:${show?.actId}:${show?.cityId}` : s.week);
    if (!r.chance(c.p ?? x.p)) continue;
    x.run(s, c, r, show);
    st.seen[x.id] ??= s.week;
    return; // no máximo um ovo por mês (ou por show)
  }
}
/** Gatilho do ovo neste estado (sem sorteio) — para testes e para a galeria. */
export function eggTest27(s: GameState, id: string, show?: Show27): boolean {
  const x = RULES27.find((y) => y.id === id);
  if (!x) return false;
  try { return !!x.test(s, show); } catch { return false; }
}
/** Força o ovo (ignora a chance; respeita o gatilho). Devolve se rodou. */
export function eggRun27(s: GameState, id: string, show?: Show27): boolean {
  const x = RULES27.find((y) => y.id === id);
  const c = x?.test(s, show);
  if (!x || !c) return false;
  x.run(s, c, egRng(s, x.id, 'forced'), show);
  eg27(s).seen[x.id] ??= s.week;
  return true;
}

/** Passo mensal dos ovos (livro-razão, caça à gravação perdida e regras). */
export function eggMonth27(s: GameState): void {
  const st = eg27(s);
  // livro-razão leve para os gatilhos de longo prazo (bateristas, ex-integrantes)
  for (const a of mine27(s)) {
    for (const m of a.members) st.alum[m] = 1;
    if (!a.catalogNo && has(a, ...METAL, 'punk', 'glam', 'arena_rock')) {
      const ds = (st.drums[a.id] ??= []);
      for (const m of a.members) if (s.persons[m]?.role === 'drums' && !ds.includes(m) && ds.length < 5) ds.push(m);
    }
  }
  const ks = Object.keys(st.alum);
  if (ks.length > 800) for (const k of ks.slice(0, ks.length - 800)) delete st.alum[k];
  huntMonth(s);
  tickRules(s, 'month');
}
registerSimHook('month', 'eggs27', (s) => eggMonth27(s));
registerSimHook('show', 'eggs27', (s, _r, arg: Partial<HookArgs>) => { if (arg.show) tickRules(s, 'show', arg.show); });

// fato `easter_egg` → diário de ovos e "Caçador de ovos"
onFact('easter_egg', (s, f) => {
  const st = eg27(s), id = String(f.data?.egg ?? '');
  st.log.unshift([s.year, s.month, id, f.text]);
  if (st.log.length > 60) st.log.length = 60;
  if (found27(s).length >= 10) eggFeat27(s, 'hunter27');
}, 'eggs27:log');

// perk: o amplificador que vai até 11
registerPerkSource('eggs27', (s) => {
  const amp = eg27(s).amp;
  return Object.keys(amp).length ? [{ label: l('Amplificador que vai até 11', 'Amp that goes to 11'), values: { showRevenue: 0.03 }, act: (_s, a) => amp[a.id] !== undefined }] : [];
});

// conquistas secretas (escondidas até liberar)
for (const f of FEATS27) {
  if (ACHIEVEMENTS.some((x) => x.id === `egg27:${f.id}`)) continue;
  const def = { id: `egg27:${f.id}`, cat: 'company' as const, icon: f.icon, name: f.name, desc: f.desc, hidden: true, check: (s: GameState) => eg27(s).feats[f.id] !== undefined };
  ACHIEVEMENTS.push(def); achById[def.id] = def;
}

/** Ids do catálogo sem regra de simulação (ovos de interface/busca ou de evento): para o teste de cobertura. */
export const uiEggIds27 = (): string[] => EGGS27.filter((e) => e.kind === 'ui' || e.kind === 'code').map((e) => e.id);
