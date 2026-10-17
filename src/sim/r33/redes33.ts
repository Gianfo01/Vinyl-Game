// R33 · REDES — O FEED DE REDES SOCIAIS sobre os fatos do jogo (`exp33.redes`, LIGADO por padrão).
//
//  • O feed é uma VISTA sobre os fatos públicos recentes (facts17) que têm um artista entre os atores; cada fato vira um
//    post na voz do artista (tom por persona13/temper18), montado em frases33.ts. O único estado novo é a memória curta
//    de núcleos usados (50 por artista) e o anel de posts já escritos (para o texto não mudar a cada abertura). O mundo
//    também posta (fatos de crise/lei/boicote sem artista e mundoNow33). Mostra primeiro os seus artistas, depois quem
//    você conhece (social31), depois os rivais, depois o mundo.
//  • Os posts mexem no mundo só com funções que já existem: boato → público (raiseVisibility), hype (addHype), indireta
//    esquenta a briga (feud18), apoio aproxima (shiftTie31), polêmica (addRep33/scandal33), lançamento ajuda o pré-save
//    (rollout.presaves), meme que pega (mundo33.fx), diretor de imprensa (pressPick33).
//  • Mecânicas novas aprovadas: conta hackeada (2010+), viralizar um trecho (2018+), live (2016+, gasta 1 bolinha) e post
//    com ganho próprio de fãs e hype.
//  • Antes de 2004 a rede social é o Jornal (jornal33.ts): as mesmas ações, com a forma de nota/coluna.
// Sem sorteio no fluxo rng19: sorte por chave (Rng.fromSeed) — os outros sistemas não mudam de sorteio.

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, factById, facts17, raiseVisibility, type Fact, type Visibility } from '../facts17';
import { freeCash20 } from '../oblig20';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { met31, meNode31, shiftTie31 } from '../social31';
import { isFossati31 } from '../sys/amor31';
import { quality } from '../sys/deleg16';
import { feudOf18, heatFeud18, leadOf18, shield18, startFeud18, temper18 } from '../sys/feud18';
import { addHype } from '../sys/hype12';
import { spendEnergy } from '../sys/life';
import { per13 } from '../sys/persona13';
import { pushTrend17 } from '../sys/trends17';
import { actsNow27 } from '../tickcache27';
import type { Act, Decision, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { director33, dirOn33, pressPick33 } from './dir33';
import { MEM33, TONES33, catchOf33, compose33, remember33, type Slots33, type Tone33 } from './frases33';
import { groupOf33 } from './frases33data';
import { memes33On, mundo33, mundoNow33 } from './mundo33';
import { addRep33, scandal33 } from './vida33';

// ================================================================ interruptor

export const SW_REDES33 = 'exp33.redes';
registerSwitch({
  id: SW_REDES33, def: true, scope: 'game',
  desc: l('Onda 33 · redes sociais: feed de posts sobre os fatos do jogo (a rede social antes de 2004 é o Jornal), posts que mexem no mundo, conta hackeada, trecho viral e live. Desligado: como antes.',
    'Wave 33 · social networks: a feed of posts about the game\'s facts (before 2004 the social network is the newspaper), posts that move the world, hacked accounts, viral snippets and lives. Off: as before.'),
});
export const redes33On = (s: GameState): boolean => sw<boolean>(s, SW_REDES33);
registerEditable({ id: `sw.${SW_REDES33}`, area: 'tools', kind: 'bool', label: l('V33 · redes sociais e Jornal', 'V33 · social networks and newspaper'),
  get: (s) => redes33On(s), set: (s, v) => { setSw(s, SW_REDES33, !!v); } });

// ================================================================ forma por época

export type Form33 = 'jornal' | 'perfil' | 'micro' | 'foto' | 'video' | 'avatar';
/** Forma da rede por ano: antes de 2004 é o Jornal; 2004 perfil, 2006 post curto, 2010 foto, 2018 vídeo curto, 2030 avatar. */
export const FORMS33: { y: number; id: Form33; name: L }[] = [
  { y: 1889, id: 'jornal', name: l('Jornal', 'Newspaper') }, { y: 2004, id: 'perfil', name: l('Perfil', 'Profile') }, { y: 2006, id: 'micro', name: l('Post curto', 'Short post') },
  { y: 2010, id: 'foto', name: l('Foto', 'Photo') }, { y: 2018, id: 'video', name: l('Vídeo curto', 'Short video') }, { y: 2030, id: 'avatar', name: l('Avatar', 'Avatar') },
];
export const form33 = (year: number): Form33 => FORMS33.reduce<Form33>((k, f) => (year >= f.y ? f.id : k), 'jornal');
export const formName33 = (year: number): L => FORMS33.reduce((k, f) => (year >= f.y ? f.name : k), FORMS33[0].name);

// ================================================================ estado

export interface Post33 {
  id: string;
  fid?: string;
  w: number; y: number; m: number;
  /** ato dono da voz; 'world' = jornal/perfil de notícia */
  who: string;
  kind: string;
  vis: Visibility;
  sev: number;
  text: L;
  core: string;
  tone: Tone33;
  place?: string;
  mine: boolean;
  /** indireta contra um ato (id) */
  jab?: string;
  /** post ruim (conta hackeada, gafe) */
  bad?: boolean;
  world?: boolean;
  /** ação já feita sobre o post */
  done?: string;
}
export interface Redes33St {
  /** ato → últimos núcleos usados (máx. 50) */
  mem: Record<string, string[]>;
  posts: Post33[];
  seq: number;
  /** último fato (número do id) já visto */
  cursor: number;
  /** boatos à espera de virar públicos */
  pend: string[];
  /** segurança digital 0..2 */
  sec: number;
  /** ato → conta hackeada desde a semana */
  hacked: Record<string, { w: number; post: string }>;
  lastPost: Record<string, number>;
  lastLive: Record<string, string>;
  /** rollout → tentou viralizar */
  viral: Record<string, number>;
  /** itens do mundo já postados (chave por mês) */
  wseen: string[];
  /** fatos desmentidos / plantados (id → 'deny' | 'plant') */
  fx: Record<string, string>;
}
declare module '../ext4' { interface Ext4 { redes33: Redes33St } }
const fresh = (): Redes33St => ({ mem: {}, posts: [], seq: 0, cursor: 0, pend: [], sec: 0, hacked: {}, lastPost: {}, lastLive: {}, viral: {}, wseen: [], fx: {} });
registerExt4('redes33', fresh);
export function redes33(s: GameState): Redes33St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.redes33 ??= fresh()) as Redes33St;
  st.mem ??= {}; st.posts ??= []; st.pend ??= []; st.hacked ??= {}; st.lastPost ??= {}; st.lastLive ??= {}; st.viral ??= {}; st.wseen ??= []; st.fx ??= {};
  st.seq ??= 0; st.cursor ??= 0; st.sec ??= 0;
  return st;
}

export const POSTS_CAP33 = 160;
const SEED = (s: GameState, ...k: (string | number)[]): Rng => Rng.fromSeed(`${s.config.seed}|redes33|${k.join('|')}`);
const mineAct = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const liveAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
export type Res33 = { ok: boolean; text: L };
const no = (pt: string, en: string): Res33 => ({ ok: false, text: l(pt, en) });
const yes = (pt: string, en: string): Res33 => ({ ok: true, text: l(pt, en) });

// ================================================================ tom do artista

/** Tom por persona13 (facetas do líder do ato) e temperamento (temper18). Determinístico. */
export function tone33(s: GameState, a: Act): Tone33 {
  const p = leadOf18(s, a);
  const f = (p ? per13(s, `p:${p.id}`)?.facets : undefined) as Record<string, number> | undefined;
  const g = (k: string): number => f?.[k] ?? 50;
  const t = p ? temper18(s, p) : 0.5;
  const score: Record<Tone33, number> = {
    arrogante: (g('ego') + g('vaidade')) / 2 + (t - 0.5) * 30,
    engracado: g('humor') + 4,
    romantico: g('romantismo') + 4,
    politico: (g('rebeldia') + g('coragem')) / 2 + (a.positioning < 30 ? 6 : 0),
    misterioso: (g('melancolia') + g('ansiedade')) / 2 + 2,
    humilde: (200 - g('ego') - g('vaidade')) / 2 + (g('empatia') - 50) / 3 - 12,
  };
  let best: Tone33 = 'humilde', bv = -Infinity;
  for (const k of TONES33) if (score[k] > bv) { bv = score[k]; best = k; }
  return best;
}

// ================================================================ encaixes

const VENUES: [string, string][] = [['o teatro', 'the theatre'], ['a praça', 'the square'], ['o clube', 'the club'], ['o estádio', 'the stadium'], ['o auditório', 'the hall'], ['o bar da esquina', 'the corner bar'], ['o salão', 'the ballroom']];
function slotsOf(s: GameState, a: Act | undefined, f: Fact | undefined, r: Rng): Slots33 {
  const city = f?.place ?? a?.city;
  const cName = city ? cityById[city]?.name : undefined;
  const rel = a ? [...a.releases].reverse().map((id) => s.releases[id]).find((x) => !!x) : undefined;
  const song = (f?.data?.title as string | undefined) ?? (f?.data?.song as string | undefined) ?? rel?.title ?? (a?.songs.length ? s.songs[a.songs[a.songs.length - 1]]?.title : undefined);
  let rival: string | undefined;
  for (const x of f?.actors ?? []) { const o = s.acts[x]; if (o && o.id !== a?.id) { rival = o.name; break; } }
  if (!rival) { const pool = actsNow27(s).filter((o) => o.id !== a?.id && o.fame >= 40); if (pool.length) rival = pool[r.int(0, pool.length - 1)].name; }
  const v = VENUES[r.int(0, VENUES.length - 1)];
  const sl: Slots33 = { s: song, r: rival, p: l(v[0], v[1]) };
  if (cName) sl.c = cName.pt;
  const n = f?.data?.n ?? f?.data?.pos;
  if (typeof n === 'number') sl.n = n;
  return sl;
}

// ================================================================ posts a partir dos fatos

const ROMANCE = new Set(['romance', 'affair', 'marriage', 'breakup']);
const WORLD_KINDS = new Set(['law', 'boycott', 'world_crisis', 'disaster', 'rate_shift', 'culture31', 'culture33', 'culture_shift', 'scene_boom', 'scene_bust', 'strike_settled']);
export const WORLD_VOICE33 = (year: number): L => (year < 1920 ? l('A Gazeta', 'The Gazette') : year < 1950 ? l('Rádio Jornal', 'Radio Journal') : year < 1980 ? l('Revista da Música', 'Music Weekly') : year < 2004 ? l('Jornal da Música', 'Music Daily') : l('Portal Música', 'Music Portal'));

function actMap(s: GameState): Map<string, Act> {
  const m = new Map<string, Act>();
  for (const a of actsNow27(s)) { if (!liveAct(a)) continue; m.set(a.id, a); for (const pid of a.members) if (!m.has(pid)) m.set(pid, a); }
  return m;
}
const actorAct = (s: GameState, f: Fact, map: Map<string, Act>): Act | undefined => {
  for (const x of f.actors) { const k = x.startsWith('p:') ? x.slice(2) : x; const a = map.get(k) ?? s.acts[k]; if (a) return a; }
  return undefined;
};

function push(s: GameState, p: Omit<Post33, 'id' | 'm' | 'y'> & { y?: number; m?: number }): Post33 {
  const st = redes33(s);
  const q: Post33 = { ...p, id: `r${++st.seq}`, y: p.y ?? s.year, m: p.m ?? s.month };
  st.posts.push(q);
  if (st.posts.length > POSTS_CAP33) st.posts.splice(0, st.posts.length - POSTS_CAP33);
  return q;
}
/** Escreve um post na voz de `a` (usa e atualiza a memória de núcleos do artista). */
export function write33(s: GameState, a: Act, kind: string, f: Fact | undefined, key: string, o: { tone?: Tone33; year?: number } = {}): { text: L; core: string; tone: Tone33 } {
  const st = redes33(s);
  const r = SEED(s, 'w', key);
  const tone = o.tone ?? tone33(s, a);
  const mem = (st.mem[a.id] ??= []);
  const out = compose33({ kind, tone, year: o.year ?? s.year, slots: slotsOf(s, a, f, r), mem, rng: r, catch: a.owner === 'player' ? undefined : catchOf33(a.id) });
  remember33(mem, out.core);
  return { text: out.text, core: out.core, tone };
}

function considerFact(s: GameState, st: Redes33St, f: Fact, map: Map<string, Act>): void {
  if (f.src === 'redes33' || f.visibility === 'secret') return;
  if (f.visibility === 'rumor') { if (!st.pend.includes(f.id)) { st.pend.push(f.id); if (st.pend.length > 80) st.pend.shift(); } return; }
  const a = actorAct(s, f, map);
  if (ROMANCE.has(f.kind) && f.actors.some((x) => isFossati31(s, x))) return; // a família Fossati nunca entra em fofoca romântica
  if (!a) {
    if (!WORLD_KINDS.has(f.kind) && groupOf33(f.kind) !== 'world') return;
    push(s, { fid: f.id, w: f.w, y: f.y, m: f.m, who: 'world', kind: f.kind, vis: f.visibility, sev: f.severity, text: f.text, core: `world:${f.kind}`, tone: 'politico', place: f.place, mine: false, world: true });
    return;
  }
  if (f.severity < 10 && !mineAct(a)) return;
  const w = write33(s, a, f.kind, f, f.id, { year: f.y });
  push(s, { fid: f.id, w: f.w, y: f.y, m: f.m, who: a.id, kind: f.kind, vis: f.visibility, sev: f.severity, text: w.text, core: w.core, tone: w.tone, place: f.place, mine: mineAct(a) });
}

/** Lê os fatos novos e escreve os posts (idempotente; chamado todo mês e ao abrir o feed). */
export function sync33(s: GameState): void {
  if (!redes33On(s)) return;
  const st = redes33(s);
  const fs = facts17(s).f;
  const first = st.cursor === 0;
  const map = actMap(s);
  let top = st.cursor;
  for (const f of fs) {
    const n = Number(f.id.slice(1));
    if (!(n > st.cursor)) continue;
    top = Math.max(top, n);
    if (first && s.week - f.w > 13) continue;
    considerFact(s, st, f, map);
  }
  st.cursor = top;
  if (st.pend.length) {
    const keep: string[] = [];
    for (const id of st.pend) {
      const f = factById(s, id);
      if (!f) continue;
      if (f.visibility === 'public') considerFact(s, st, f, map);
      else if (f.visibility === 'rumor') keep.push(id);
    }
    st.pend = keep;
  }
  // o mundo posta: crises, memes e bolhas do MUNDO
  for (const w of mundoNow33(s)) {
    const key = `${w.id}:${s.year}-${s.month}`;
    if (st.wseen.includes(key)) continue;
    st.wseen.push(key);
    if (st.wseen.length > 60) st.wseen.shift();
    const txt = w.kind === 'crise' ? fmtL(l('{n}: a crise aperta o mercado da música.', '{n}: the crisis squeezes the music market.'), { n: w.label })
      : w.kind === 'meme' ? l('Um meme toma as redes e empurra as vendas por uns dias.', 'A meme takes over the feeds and lifts sales for a few days.')
        : l(w.label.pt === 'Bolha estourou' ? 'A bolha estourou: o crédito aperta.' : 'A bolha da moda continua inflando.', w.label.pt === 'Bolha estourou' ? 'The bubble burst: credit tightens.' : 'The fashion bubble keeps inflating.');
    push(s, { w: s.week, who: 'world', kind: `mundo_${w.kind}`, vis: 'public', sev: 40, text: txt, core: `world:${w.id}`, tone: 'politico', mine: false, world: true });
  }
}

// ================================================================ leitura do feed

export interface FeedItem33 extends Post33 {
  act?: Act;
  rank: number;
  known: boolean;
  rival: boolean;
  /** quem você conhece mais perto (laço do dono com o líder do ato) */
  voice: L;
}
/** Feed: seus artistas primeiro, depois quem você conhece, depois rivais, depois o mundo; dentro de cada grupo, o mais recente. */
export function feed33(s: GameState, o: { limit?: number; act?: string } = {}): FeedItem33[] {
  if (!redes33On(s)) return [];
  sync33(s);
  const st = redes33(s);
  const me = meNode31(s);
  const out: FeedItem33[] = [];
  const knownCache = new Map<string, boolean>();
  for (let i = st.posts.length - 1; i >= 0; i--) {
    const p = st.posts[i];
    if (o.act && p.who !== o.act && p.jab !== o.act) continue;
    const act = p.world ? undefined : s.acts[p.who];
    let known = false;
    if (act && !p.mine) {
      const pid = leadOf18(s, act)?.id;
      if (pid) { if (!knownCache.has(pid)) knownCache.set(pid, met31(s, me, pid)); known = knownCache.get(pid)!; }
    }
    const rival = !!act && !p.mine && !known;
    out.push({ ...p, act, known, rival, rank: p.mine ? 0 : known ? 1 : p.world ? 3 : 2, voice: p.world ? WORLD_VOICE33(p.y) : l(act?.name ?? '?', act?.name ?? '?') });
  }
  out.sort((a, b) => a.rank - b.rank || b.w - a.w);
  return out.slice(0, o.limit ?? 40);
}

/** Boatos (fatos ainda não públicos, não secretos) sobre os seus artistas: a Coluna social e o painel de boatos. */
export function boatos33(s: GameState): { f: Fact; act: Act }[] {
  const mine = playerActs(s);
  const out: { f: Fact; act: Act }[] = [];
  const seen = new Set<string>();
  for (const id of mine) {
    const a = s.acts[id];
    if (!a) continue;
    for (const pid of [id, ...a.members]) {
      for (const f of facts17(s).f) {
        if (f.visibility !== 'rumor' || seen.has(f.id) || !f.actors.includes(pid) || s.week - f.w > 52) continue;
        if (ROMANCE.has(f.kind) && f.actors.some((x) => isFossati31(s, x))) continue;
        seen.add(f.id); out.push({ f, act: a });
      }
      if (out.length > 30) break;
    }
  }
  return out.sort((x, y) => y.f.w - x.f.w);
}

// ================================================================ suas ações com artista seu

const NEG = new Set(['scandal', 'arrest', 'case_ruling', 'affair', 'breakup', 'addiction', 'breakdown', 'crime', 'plagiarism_suit', 'theft', 'payola', 'stream_fraud', 'betrayal', 'secret_exposed', 'crowd_incident', 'video_banned']);
const POLEMIC = new Set(['statement', 'boycott', 'feud', 'scandal', 'law', 'payola', 'video_banned']);
const COOL_W = 2;

function rolloutOf(s: GameState, actId: string) { return s.rollouts.find((r) => r.actId === actId && r.status === 'active'); }
function gainFans(a: Act, k: number): void {
  a.fans.casual += Math.max(1, Math.round(a.fans.casual * 0.003 * k)) + Math.round(2 * k);
  a.fans.active += Math.max(0, Math.round(a.fans.active * 0.0012 * k));
}
const hypeKey = (a: Act): string => `a:${a.id}`;

/** Quem posta e o que: validação comum das ações com artista seu. */
function mineOrWhy(s: GameState, actId: string): { a: Act } | Res33 {
  if (!redes33On(s)) return no('As redes estão desligadas.', 'Social networks are off.');
  const a = s.acts[actId];
  if (!mineAct(a) || !liveAct(a)) return no('Só com artista do seu elenco.', 'Only with an act on your roster.');
  if (redes33(s).hacked[actId]) return no('A conta está hackeada: recupere antes de postar.', 'The account is hacked: recover it before posting.');
  return { a };
}

export type OwnMode33 = 'post' | 'deny' | 'apologize' | 'quiet';
/**
 * Postar, desmentir, pedir desculpa ou ficar quieto, sobre um fato (`fid`) ou livre. Efeitos só por funções que já existem:
 * boato → público (raiseVisibility), hype (addHype), lançamento ajuda o pré-save (rollout), polêmica (addRep33/scandal33),
 * meme que pega (mundo33.fx), fãs ganhos (post/live têm ganho próprio).
 */
export function ownPost33(s: GameState, actId: string, mode: OwnMode33, fid?: string, o: { tone?: Tone33 } = {}): Res33 {
  const v = mineOrWhy(s, actId);
  if (!('a' in v)) return v;
  const a = v.a, st = redes33(s), f = fid ? factById(s, fid) : undefined;
  const r = SEED(s, 'own', a.id, fid ?? 'free', mode, s.week);
  if (mode === 'quiet') {
    if (f?.visibility === 'rumor' && r.chance(0.2)) { raiseVisibility(f, 'public'); return yes('Você ficou quieto, mas o boato vazou sozinho e virou público.', 'You stayed quiet, but the rumor leaked and went public.'); }
    markDone(s, fid, 'quiet');
    return yes('Você ficou quieto. Às vezes é o melhor post.', 'You stayed quiet. Sometimes that is the best post.');
  }
  if (mode === 'post' && (st.lastPost[a.id] ?? -99) > s.week - COOL_W) return no('Calma: o artista postou há pouco. Espere umas semanas.', 'Easy: the act posted a moment ago. Wait a few weeks.');
  const kind = mode === 'post' ? (f?.kind ?? latestKind(s, a)) : 'statement';
  const tone = o.tone ?? (mode === 'apologize' ? 'humilde' : tone33(s, a));
  const w = write33(s, a, mode === 'apologize' ? 'scandal' : kind, f, `${a.id}:${s.week}:${mode}:${fid ?? ''}`, { tone });
  let bad = false;
  let msg: Res33;
  if (mode === 'deny') {
    if (!f) return no('Não há o que desmentir.', 'Nothing to deny.');
    const p = clamp(0.35 + a.fame / 250 + (a.trust - 50) / 400, 0.2, 0.8);
    if (r.chance(p)) {
      st.fx[f.id] = 'deny';
      addHype(s, hypeKey(a), 'redes33:deny', l('Desmentido firme', 'Firm denial'), 2);
      msg = yes('Desmentido: o boato perde força.', 'Denied: the rumor loses steam.');
    } else {
      raiseVisibility(f, 'public');
      bad = true;
      addRep33(s, -1);
      addHype(s, hypeKey(a), 'redes33:deny', l('Desmentido que não colou', 'Denial that fell flat'), -2);
      msg = yes('O desmentido não colou: o boato virou público.', 'The denial fell flat: the rumor went public.');
    }
  } else if (mode === 'apologize') {
    addRep33(s, 1.5);
    addHype(s, hypeKey(a), 'redes33:apology', l('Pediu desculpas', 'Apologised'), -1);
    a.trust = clamp(a.trust + 1, 0, 100);
    msg = yes('Pedido de desculpas publicado: a imagem se recompõe aos poucos.', 'Apology posted: the image recovers slowly.');
  } else {
    msg = postEffects(s, a, f, kind, tone, r);
    st.lastPost[a.id] = s.week;
  }
  push(s, { fid: f?.id, w: s.week, who: a.id, kind, vis: 'public', sev: f?.severity ?? 20, text: w.text, core: w.core, tone: w.tone, mine: true, bad: bad || undefined });
  markDone(s, fid, mode);
  return msg;
}

function latestKind(s: GameState, a: Act): string {
  for (const f of facts17(s).f.slice(-80).reverse()) if (f.actors.includes(a.id) && f.visibility === 'public' && f.src !== 'redes33') return f.kind;
  return 'career';
}
function markDone(s: GameState, fid: string | undefined, how: string): void {
  if (!fid) return;
  for (const p of redes33(s).posts) if (p.fid === fid) p.done = how;
}

function postEffects(s: GameState, a: Act, f: Fact | undefined, kind: string, tone: Tone33, r: Rng): Res33 {
  const lines: string[] = [];
  const k = 1 + a.fame / 100;
  addHype(s, hypeKey(a), 'redes33:post', l('Post nas redes', 'Social post'), clamp(2 + (f ? f.severity / 30 : 0) + (tone === 'engracado' ? 1 : 0), 1, 6));
  gainFans(a, k);
  lines.push(s.year < 2004 ? 'Nota publicada: hype e leitores sobem.' : 'Post publicado: hype e fãs sobem.');
  if (f && f.visibility === 'rumor' && raiseVisibility(f, 'public')) lines.push('O boato virou público.');
  if (kind === 'release' || kind === 'chart') {
    const ro = rolloutOf(s, a.id);
    if (ro && ro.phases.some((p) => !p.done)) { ro.presaves += Math.round(20 + a.fans.active * 0.01); lines.push('Pré-save ajudado.'); }
  }
  if (POLEMIC.has(kind) && (tone === 'arrogante' || tone === 'politico')) {
    addRep33(s, -1.5); scandal33(s, 1.5);
    addHype(s, hypeKey(a), 'redes33:polemic', l('Polêmica engaja', 'Controversy engages'), 3);
    lines.push('Post polêmico: imagem pessoal cai, engajamento sobe.');
  } else if (NEG.has(kind) && tone !== 'humilde') { addRep33(s, -0.5); lines.push('Postar sobre isso arranhou a imagem.'); }
  else if (tone === 'humilde' || tone === 'romantico') addRep33(s, 0.3);
  if (s.year >= 2010 && tone === 'engracado' && memes33On(s) && r.chance(0.07 + a.fame / 1500)) {
    mundo33(s).fx.push({ id: `meme33:${a.id}:${s.week}`, kind: 'meme', week: s.week });
    emitFact(s, { kind: 'viral', actors: [a.id], place: a.city, severity: 35, visibility: 'public', tags: ['viral', 'meme', 'redes33'], src: 'redes33', text: fmtL(l('O post de {a} vira meme.', '{a}\'s post becomes a meme.'), { a: a.name }) });
    lines.push('O post pegou e virou meme.');
  }
  return yes(lines.join(' '), lines.join(' '));
}

// ================================================================ reagir ao post de outro

export type Reaction33 = 'like' | 'repost' | 'reply' | 'ignore';
export function react33(s: GameState, postId: string, how: Reaction33, myAct?: string): Res33 {
  if (!redes33On(s)) return no('As redes estão desligadas.', 'Social networks are off.');
  const st = redes33(s), p = st.posts.find((x) => x.id === postId);
  if (!p || p.world || p.mine) return no('Esse post não aceita reação.', 'This post accepts no reaction.');
  const target = s.acts[p.who];
  if (!target) return no('O artista saiu de cena.', 'The act is gone.');
  const mineId = myAct && mineAct(s.acts[myAct]) ? myAct : playerActs(s)[0];
  const me = meNode31(s), lead = leadOf18(s, target);
  if (p.done) return no('Você já reagiu a esse post.', 'You already reacted to this post.');
  p.done = how;
  if (how === 'ignore') return yes('Ignorado.', 'Ignored.');
  if (how === 'like' || how === 'repost') {
    if (lead) shiftTie31(s, me, lead.id, { i: how === 'repost' ? 2.5 : 1, r: how === 'repost' ? 1 : 0.5 }, 'press');
    if (how === 'repost') { addHype(s, hypeKey(target), 'redes33:rt', l('Repostado pelo selo', 'Reposted by your label'), 1); const m = s.acts[mineId]; if (m) addHype(s, hypeKey(m), 'redes33:rt', l('Apoio público', 'Public support'), 0.5); }
    return yes(how === 'repost' ? 'Repostado: vocês ficam mais próximos.' : 'Curtido: um aceno simpático.', how === 'repost' ? 'Reposted: you grow closer.' : 'Liked: a friendly nod.');
  }
  // responder: pode virar briga
  const m = s.acts[mineId];
  const r = SEED(s, 'reply', postId, s.week);
  const t = lead ? temper18(s, lead) : 0.5;
  const pf = clamp(0.2 + t * 0.5 + (p.jab === mineId ? 0.25 : 0) + (NEG.has(p.kind) ? 0.1 : 0), 0.1, 0.85);
  if (m && p.jab !== mineId && !r.chance(pf)) {
    if (lead) shiftTie31(s, me, lead.id, { i: 1 }, 'press');
    addHype(s, hypeKey(target), 'redes33:reply', l('Resposta educada', 'Polite reply'), 0.5);
    return yes('A conversa foi civilizada. Todos ganharam um pouco de atenção.', 'The exchange was civil. Everyone got a little attention.');
  }
  if (m && !shield18(s, m.id) && !shield18(s, target.id)) {
    const why = fmtL(l('Troca de farpas nas redes: {a} × {b}', 'Social media jabs: {a} v {b}'), { a: m.name, b: target.name });
    const fe = feudOf18(s, m.id, target.id);
    if (fe) heatFeud18(s, fe, 6, why); else startFeud18(s, m.id, target.id, why, 8);
    addHype(s, hypeKey(m), 'redes33:feud', l('Treta nas redes', 'Beef online'), 2);
    addHype(s, hypeKey(target), 'redes33:feud', l('Treta nas redes', 'Beef online'), 2);
    return yes('A resposta esquentou: virou briga, e a briga rende hype para os dois.', 'The reply heated up: it became a feud, and feuds feed both acts\' hype.');
  }
  return yes('Você respondeu, e nada explodiu.', 'You replied and nothing blew up.');
}

// ================================================================ diretor de imprensa

/** Delegar o post (ou o boato) ao diretor de imprensa: `pressPick33` escolhe pela linha da casa. `ref` = id do post ou do fato. */
export function delegate33(s: GameState, ref: string): Res33 {
  if (!redes33On(s)) return no('As redes estão desligadas.', 'Social networks are off.');
  const p = redes33(s).posts.find((x) => x.id === ref);
  const f = factById(s, p?.fid ?? ref);
  const actId = p?.who ?? (f ? f.actors.map((x) => (s.acts[x] ? x : Object.values(s.acts).find((a) => a.members.includes(x))?.id)).find(Boolean) : undefined);
  if (!actId || !mineAct(s.acts[actId])) return no('Só posts e boatos do seu elenco.', 'Only posts and rumours from your roster.');
  if (!dirOn33(s)) return no('Ligue os diretores (exp33.dir) para delegar.', 'Turn the directors on (exp33.dir) to delegate.');
  const dir = director33(s, 'press');
  if (!dir) return no('Falta um diretor de imprensa com o cargo e a delegação ligada.', 'You need a press director in the role with delegation switched on.');
  const kind = p?.kind ?? f?.kind ?? 'career';
  const opts: { id: string }[] = [];
  if (f?.visibility === 'rumor') opts.push({ id: 'statement' });
  if (NEG.has(kind)) opts.push({ id: 'apologize' });
  opts.push({ id: 'silence' });
  const d = { options: opts, defaultOption: 'silence' } as unknown as Decision;
  const pick = pressPick33(d, quality(s, dir).q);
  const mode: OwnMode33 = pick === 'statement' ? 'deny' : pick === 'apologize' ? 'apologize' : 'quiet';
  const res = ownPost33(s, actId, mode, f?.id);
  return res.ok ? { ok: true, text: fmtL(l('{n} cuidou: {t}', '{n} handled it: {t}'), { n: dir.name, t: res.text }) } : res;
}

/** Mandar parabéns (nascimento, casamento): aproxima do protagonista do fato (social31). */
export function congrats33(s: GameState, fid: string): Res33 {
  const f = factById(s, fid);
  if (!f) return no('Essa notícia já saiu de circulação.', 'That story is gone.');
  const me = meNode31(s);
  const pid = f.actors.map((x) => (x.startsWith('p:') ? x.slice(2) : x)).find((x) => s.persons[x]);
  if (!pid || isFossati31(s, pid) && ROMANCE.has(f.kind)) return no('Não há a quem mandar os parabéns.', 'Nobody to send congratulations to.');
  shiftTie31(s, me, pid, { i: 2, r: 1 }, 'press');
  return yes('Parabéns enviados: um gesto que se lembra.', 'Congratulations sent: a gesture people remember.');
}

// ================================================================ conta hackeada (2010+)

const HACK_POSTS: string[] = [
  'ganhei um carro, clica no link aí embaixo|won a car, click the link below', 'quem é fã paga e quem não é que se vire|fans pay up and everyone else can sort themselves out',
  'vendo meu disco de ouro por um bom preço, chama no privado|selling my gold record cheap, DM me', 'o produtor é um fraude e todo mundo sabe|my producer is a fraud and everyone knows it',
  'apostem em tudo, a banda vai falir mesmo|bet on everything, the band is going broke anyway', 'estou cansado de vocês todos|I am tired of all of you',
  'dobrem o dinheiro agora, só hoje, link na bio|double your money now, today only, link in bio', 'nunca gostei da cidade de vocês|I never liked your city',
];
export const HACK_FROM33 = 2010;
/** Chance mensal de invasão: rara; maior com artista famoso; segurança digital reduz (0, −50%, −85%). */
export function hackChance33(s: GameState, a: Act): number {
  if (s.year < HACK_FROM33) return 0;
  return (0.003 + 0.01 * (a.fame / 100) + (s.year >= 2020 ? 0.003 : 0)) * [1, 0.5, 0.15][redes33(s).sec] ;
}
export const SEC_COST33 = [0, 2500, 6000];
export function hireSecurity33(s: GameState): Res33 {
  if (!redes33On(s)) return no('As redes estão desligadas.', 'Social networks are off.');
  const st = redes33(s);
  if (st.sec >= 2) return no('A segurança digital já está no máximo.', 'Digital security is already maxed out.');
  const cost = money(s, SEC_COST33[st.sec + 1]);
  if (freeCash20(s) < cost) return no('Sem caixa para a segurança digital.', 'Not enough cash for digital security.');
  if (!post(s, `redes33sec:${st.sec + 1}`, -cost, 'misc', 'Segurança digital das contas')) return no('Já feito nesta semana.', 'Already done this week.');
  st.sec++;
  return yes(st.sec === 1 ? 'Contas com verificação em duas etapas e senha forte.' : 'Equipe de segurança digital cuidando das contas.', st.sec === 1 ? 'Accounts with two-step verification and strong passwords.' : 'A digital security team now watches the accounts.');
}
export const RECOVER_COST33 = 1500;
export function recoverAccount33(s: GameState, actId: string): Res33 {
  const st = redes33(s), h = st.hacked[actId], a = s.acts[actId];
  if (!h || !a) return no('A conta não está hackeada.', 'The account is not hacked.');
  const cost = money(s, RECOVER_COST33 * (1 + a.fame / 100));
  if (freeCash20(s) < cost) return no('Sem caixa para recuperar a conta.', 'Not enough cash to recover the account.');
  if (!post(s, `redes33rec:${actId}`, -cost, 'legal', `Recuperar a conta de ${a.name}`)) return no('Já feito nesta semana.', 'Already done this week.');
  delete st.hacked[actId];
  addRep33(s, 0.5);
  return yes('Conta recuperada e o post ruim foi apagado.', 'Account recovered and the bad post deleted.');
}
export function hackMonth33(s: GameState): void {
  if (s.year < HACK_FROM33) return;
  const st = redes33(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!liveAct(a)) continue;
    const h = st.hacked[id];
    if (h) {
      addHype(s, hypeKey(a), 'redes33:hack', l('Conta hackeada', 'Hacked account'), -2);
      if (s.week - h.w > 13) { delete st.hacked[id]; addRep33(s, -1); } // a plataforma devolve sozinha, tarde
      continue;
    }
    if (!SEED(s, 'hack', id, s.year, s.month).chance(hackChance33(s, a))) continue;
    const r = SEED(s, 'hackp', id, s.week);
    const raw = HACK_POSTS[r.int(0, HACK_POSTS.length - 1)], i = raw.indexOf('|');
    const f = emitFact(s, { kind: 'scandal', actors: [id], place: a.city, severity: 55, visibility: 'public', tags: ['redes33', 'hack'], src: 'redes33', text: fmtL(l('Conta de {a} é invadida e publica uma série de absurdos.', '{a}\'s account is hacked and posts a string of nonsense.'), { a: a.name }) });
    const q = push(s, { fid: f.id, w: s.week, who: id, kind: 'hack', vis: 'public', sev: 55, text: l(raw.slice(0, i), raw.slice(i + 1)), core: 'hack', tone: 'misterioso', mine: true, bad: true });
    st.hacked[id] = { w: s.week, post: q.id };
    addRep33(s, -(2 + a.fame / 40));
    scandal33(s, 2);
    addHype(s, hypeKey(a), 'redes33:hack', l('Conta hackeada', 'Hacked account'), -6);
  }
}

// ================================================================ live (2016+) e trecho viral (2018+)

export const LIVE_FROM33 = 2016, VIRAL_FROM33 = 2018;
export function goLive33(s: GameState, actId: string): Res33 {
  const v = mineOrWhy(s, actId);
  if (!('a' in v)) return v;
  if (s.year < LIVE_FROM33) return no('Ainda não existe transmissão ao vivo.', 'Live streaming does not exist yet.');
  const a = v.a, st = redes33(s), key = `${s.year}-${s.month}`;
  if (st.lastLive[a.id] === key) return no('Já fez uma live este mês.', 'Already did a live this month.');
  const err = spendEnergy(s, 1);
  if (err) return { ok: false, text: err };
  st.lastLive[a.id] = key;
  const k = 1 + a.fame / 100;
  addHype(s, hypeKey(a), 'redes33:live', l('Live com os fãs', 'Live with fans'), clamp(4 + a.fame / 20, 4, 9));
  gainFans(a, 3 * k);
  const w = write33(s, a, 'show', undefined, `${a.id}:${s.week}:live`);
  push(s, { w: s.week, who: a.id, kind: 'live', vis: 'public', sev: 25, text: w.text, core: w.core, tone: w.tone, mine: true });
  return yes('Live feita: mais hype e mais fãs que um post comum (gasta uma bolinha).', 'Live done: more hype and more fans than a regular post (costs one ball).');
}
/** Ato com um plano de lançamento ativo e fase por vir: pode viralizar um trecho. */
export const viralRollout33 = (s: GameState, actId: string) => { const ro = rolloutOf(s, actId); return ro && ro.phases.some((p) => !p.done && (p.kind === 'single' || p.kind === 'album')) ? ro : undefined; };
export function viralClip33(s: GameState, actId: string): Res33 {
  const v = mineOrWhy(s, actId);
  if (!('a' in v)) return v;
  if (s.year < VIRAL_FROM33) return no('Vídeo curto só existe a partir de 2018.', 'Short video only exists from 2018.');
  const a = v.a, st = redes33(s), ro = viralRollout33(s, actId);
  if (!ro) return no('Precisa de um lançamento planejado e ainda por vir.', 'You need a planned release that is still to come.');
  if (st.viral[ro.id] !== undefined) return no('Esse lançamento já teve a sua tentativa.', 'This release already had its try.');
  st.viral[ro.id] = s.week;
  const song = s.songs[ro.singles[0] ?? ro.songIds[0]]?.title ?? ro.title;
  const r = SEED(s, 'viral', ro.id);
  const p = clamp(0.14 + a.fame / 300 + ro.hype * 0.2, 0.1, 0.6);
  if (!r.chance(p)) { addHype(s, `n:${a.id}`, 'redes33:clip', l('Trecho postado', 'Snippet posted'), 1); return yes('O trecho passou batido. Fica a prévia.', 'The snippet went unnoticed. At least it is a preview.'); }
  ro.presaves += Math.round(200 + a.fans.active * 0.05);
  ro.hype = clamp(ro.hype + 0.12, 0, 1);
  pushTrend17(s, a.genre, 0.05);
  if (memes33On(s)) mundo33(s).fx.push({ id: `viral33:${ro.id}`, kind: 'meme', week: s.week });
  addHype(s, `n:${a.id}`, 'redes33:viral', l('Trecho viral antes do lançamento', 'Snippet went viral before release'), 8);
  gainFans(a, 4);
  emitFact(s, { kind: 'viral', actors: [a.id], place: a.city, severity: 45, visibility: 'public', tags: ['viral', 'redes33'], src: 'redes33', text: fmtL(l('O refrão de "{t}", de {a}, estoura antes do lançamento.', 'The chorus of "{t}" by {a} blows up before release.'), { t: song, a: a.name }) });
  const w = write33(s, a, 'viral', undefined, `${a.id}:${s.week}:clip`);
  push(s, { w: s.week, who: a.id, kind: 'viral', vis: 'public', sev: 45, text: w.text, core: w.core, tone: w.tone, mine: true });
  return yes('O refrão estourou antes do lançamento e puxa o single (pré-save, hype e a tendência do gênero sobem).', 'The chorus blew up before release and pulls the single (pre-saves, hype and the genre trend rise).');
}

// ================================================================ coluna social (Jornal): plantar outra nota

export const PLANT_COST33 = 800;
/** Paga a coluna para plantar outra nota: segura o boato (não vira público) com chance; falhando, vaza. */
export function plantNote33(s: GameState, fid: string): Res33 {
  const f = factById(s, fid), st = redes33(s);
  if (!f || f.visibility !== 'rumor') return no('Esse fato já não é boato.', 'That fact is no longer a rumour.');
  const actId = f.actors.map((x) => (s.acts[x] ? x : Object.values(s.acts).find((a) => mineAct(a) && a.members.includes(x))?.id)).find(Boolean);
  const a = actId ? s.acts[actId] : undefined;
  if (!a || !mineAct(a)) return no('Só boatos sobre o seu elenco.', 'Only rumours about your roster.');
  const cost = money(s, PLANT_COST33 * (1 + f.severity / 50));
  if (freeCash20(s) < cost) return no('Sem caixa para pagar a coluna.', 'Not enough cash to pay the column.');
  if (!post(s, `redes33plant:${fid}`, -cost, 'marketing', `Nota paga na coluna: ${a.name}`)) return no('Já feito nesta semana.', 'Already done this week.');
  st.fx[fid] = 'plant';
  const r = SEED(s, 'plant', fid);
  if (r.chance(clamp(0.6 - f.severity / 250, 0.3, 0.7))) {
    addHype(s, hypeKey(a), 'redes33:plant', l('Nota simpática na coluna', 'Friendly note in the column'), 2);
    return yes('Outra nota ocupou a coluna: o boato fica de lado por ora.', 'Another note took the column: the rumour is set aside for now.');
  }
  raiseVisibility(f, 'public');
  addRep33(s, -0.5);
  return yes('A nota paga vazou e o boato virou público.', 'The paid note leaked and the rumour went public.');
}
/** Deixar correr: o boato pode virar público sozinho (chance pela gravidade). */
export function letRun33(s: GameState, fid: string): Res33 {
  const f = factById(s, fid);
  if (!f || f.visibility !== 'rumor') return no('Esse fato já não é boato.', 'That fact is no longer a rumour.');
  const r = SEED(s, 'run', fid, s.week);
  if (r.chance(clamp(0.25 + f.severity / 200, 0.2, 0.7))) { raiseVisibility(f, 'public'); return yes('Você deixou correr e o boato virou público.', 'You let it run and the rumour went public.'); }
  return yes('Você deixou correr. Por ora, ninguém deu bola.', 'You let it run. For now, nobody cared.');
}

// ================================================================ rivais postam, brigam e erram

function rivalMonth33(s: GameState): void {
  const mine = playerActs(s).map((id) => s.acts[id]).filter(liveAct);
  if (!mine.length) return;
  const cands = actsNow27(s).filter((a) => liveAct(a) && !mineAct(a) && a.fame >= 35).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 14);
  let n = 0;
  for (const a of cands) {
    if (n >= 2) break;
    if (shield18(s, a.id)) continue; // modo "Vida real exata": nada inventado com gente real
    const r = SEED(s, 'rival', a.id, s.year, s.month);
    const lead = leadOf18(s, a), t = lead ? temper18(s, lead) : 0.5;
    if (!r.chance(0.08 + t * 0.1)) continue;
    n++;
    const roll = r.float();
    const tone = tone33(s, a);
    if (roll < 0.45) { // indireta contra um ato seu (do mesmo gênero, se houver)
      const tgt = mine.find((m) => m.genre === a.genre) ?? mine[r.int(0, mine.length - 1)];
      const w = write33(s, a, 'feud', undefined, `${a.id}:${s.week}:jab`, { tone: t > 0.5 ? 'arrogante' : tone });
      push(s, { w: s.week, who: a.id, kind: 'feud', vis: 'public', sev: 30, text: w.text, core: w.core, tone: w.tone, mine: false, jab: tgt.id });
      const fe = feudOf18(s, a.id, tgt.id);
      if (fe && !shield18(s, tgt.id)) heatFeud18(s, fe, 3, fmtL(l('{a} lança uma indireta nas redes.', '{a} drops a subtweet.'), { a: a.name }));
    } else if (roll < 0.7) { // gafe: apaga o post, perde hype
      const w = write33(s, a, 'scandal', undefined, `${a.id}:${s.week}:gaffe`, { tone: 'arrogante' });
      push(s, { w: s.week, who: a.id, kind: 'scandal', vis: 'public', sev: 35, text: w.text, core: w.core, tone: w.tone, mine: false, bad: true });
      addHype(s, hypeKey(a), 'redes33:gaffe', l('Gafe nas redes', 'Social media gaffe'), -4);
    } else { // vitrine: o rival se exibe
      const w = write33(s, a, 'chart', undefined, `${a.id}:${s.week}:brag`, { tone });
      push(s, { w: s.week, who: a.id, kind: 'chart', vis: 'public', sev: 25, text: w.text, core: w.core, tone: w.tone, mine: false });
      addHype(s, hypeKey(a), 'redes33:brag', l('Vitrine nas redes', 'Showing off online'), 1.5);
    }
  }
}

// ================================================================ mês

registerSimHook('month', 'redes33', (s) => {
  if (!redes33On(s)) return;
  sync33(s);
  hackMonth33(s);
  rivalMonth33(s);
});

export { MEM33 };
