// Rodada 19 (Frente 1, grupo A + 11.7) — MALHA DE LIGAÇÕES. Cada ligação = regra + gancho + porquê (link18 {id})
// + fato com ouvinte (tipos em factmatrix19 LINKFACTS19). Sem estado de módulo; sorteios com rng19 próprio.
//
//  estate   neural.ts (holograma, cofre, voz IA) × post18 (espólio, herdeiros) × rights18/ledger → fato estate_rights;
//           mau gosto → scandal17. Fatia real do espólio nos lançamentos póstumos e hologramas (I1–I3).
//  delay    supply18 (fila da fábrica) → fato release_delayed → hype esfria (hype12), rádio perde a janela (radio18),
//           aviso no calendário (calendar19) (I6).
//  banned   society18 (censura) × world4 (pirataria/leis) → fato banned_song → pirataria e rádio pirata (I10);
//           clipe banido (media18 video_banned) idem, mais fraco.
//  crowd    fest12/fest18 (lotação, licença) × live18 (normas) × crime17 (segurança) → crowd_incident → processo e lei
//           nova de segurança (I16). Raro e sem detalhes; vítimas fictícias; modo exato nunca tem tragédia.
//  echo     decide18 (eco forte) → cena curta cine18 "você escolheu X…"; roupa no tapete vermelho agenda eco (11.7).
//  region   fandom19 (fãs por região) → demanda de ingressos (cityDemand) e renda dos circuitos18; base nova numa
//           região vira fato fan_region (I12/I23).

import { clamp, Rng } from '../../core/rng';
import { CIRCS18, subById18 } from '../../data/regions18';
import { countryOfCity } from '../../data/geo';
import { cityById, MARKETS, l, type L } from '../../data/world';
import { registerConseq18, type Fx18 } from '../decide18';
import { registerMod, registerSimHook } from '../ext4';
import type { WhyPart } from '../explain18';
import { emitFact, onFact, type Fact } from '../facts17';
import { fansByRegion19 } from '../fandom19';
import { exactHist } from '../history15';
import { NEURAL19 } from '../neural';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import { noteDeadline19 } from '../calendar19';
import type { Act, GameState } from '../types';
import { fmtL, hasTech, money, nextId, notify, playerActs, post } from '../util';
import { FIT18, FIT19, logShot18, type Fit18 } from './cine18';
import { crime17 } from './crime17';
import { schedule18 } from './decide18';
import { nudge16 } from './fame16';
import { ff18 } from './fest18';
import { headline19 } from './factlink19';
import { addHype } from './hype12';
import { LINK18_PARTS, LINKS18, lk18 } from './links18';
import { liveOf } from './live/state';
import { live18, safetyNorm18 } from './live18';
import { opine } from './persona13';
import { actOfP18, back18, estate18, post18, STANCE18, type PK18 } from './post18';
import { radio18 } from './radio18';
import { reg18 } from './regions18';
import { mineOf17 } from './scene17';
import { queueScene } from './scenes/state';
import { soc18 } from './society18';
import { SUP19 } from './supply18';
import { piracyLevel } from './world4/laws';

const F = fmtL;
const N = (pt: string, en: string): L => l(pt, en);

// ---------------------------------------------------------------- estado e registro das ligações
export interface L19a { ban: Record<string, 1>; fe: Record<string, number>; fr: Record<string, 1>; rb: Record<string, number>; rv: Record<string, number>; em: number; eth: Record<string, 1>; seen: number }
const fresh = (): L19a => ({ ban: {}, fe: {}, fr: {}, rb: {}, rv: {}, em: -1, eth: {}, seen: 0 });
export function l19a(s: GameState): L19a {
  const x = s.x4 as unknown as { l19a?: L19a };
  const st = (x.l19a ??= fresh());
  st.ban ??= {}; st.fe ??= {}; st.fr ??= {}; st.rb ??= {}; st.rv ??= {}; st.eth ??= {}; st.em ??= -1; st.seen ??= 0;
  return st;
}
const log = (s: GameState, id: string, t: L): void => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const safe = (fn: () => void): void => { try { fn(); } catch { /* uma ligação com erro não derruba o mês */ } };
/** desliga as ligações (A/B de equilíbrio) */
const off = (): boolean => !!(globalThis as { __l19aOff?: boolean }).__l19aOff;

export const LINKS19A = [
  { id: 'estate', a: N('Hologramas e voz IA', 'Holograms and AI voice'), b: N('Espólio e herdeiros', 'Estate and heirs'), how: N('Usar a imagem de quem morreu exige o espólio: herdeiros aprovam pela postura e união, levam uma fatia real das receitas; uso sem aval ou de mau gosto vira escândalo.', 'Using the likeness of the dead needs the estate: heirs approve by stance and unity, take a real share of revenue; unauthorized or tasteless use becomes a scandal.') },
  { id: 'delay', a: N('Fila da fábrica', 'Pressing queue'), b: N('Hype e rádio', 'Hype and radio'), how: N('Disco que perde a data esfria o hype do próximo lançamento e as rádios trocam de faixa; o novo prazo aparece no calendário.', 'A record that misses its date cools the next release\'s hype and radio moves on; the new date shows on the calendar.') },
  { id: 'banned', a: N('Censura e leis', 'Censorship and laws'), b: N('Pirataria e rádio pirata', 'Piracy and pirate radio'), how: N('Música proibida circula em cópias piratas e rádios clandestinas: mais fãs e culto, nenhum centavo para o selo. Quanto mais fácil copiar na época, mais forte.', 'A banned song spreads on bootlegs and clandestine radio: more fans and cult, not a cent for the label. The easier copying is in the era, the stronger.') },
  { id: 'crowd', a: N('Festival lotado', 'Packed festival'), b: N('Processo e lei', 'Lawsuit and law'), how: N('Festival acima da licença e sem segurança pode virar tragédia (rara): processo das famílias e uma lei nova de segurança que endurece as normas para todos.', 'A festival over its permit and without security can turn tragic (rare): a lawsuit from families and a new safety law that tightens the rules for everyone.') },
  { id: 'echo', a: N('Ecos de decisões', 'Decision echoes'), b: N('Cenas', 'Scenes'), how: N('Quando uma escolha volta com força, uma cena curta lembra o que você escolheu. A roupa do tapete vermelho também volta, meses depois.', 'When a choice comes back hard, a short scene recalls what you chose. The red-carpet outfit comes back too, months later.') },
  { id: 'region', a: N('Fãs por região', 'Fans by region'), b: N('Ingressos e circuitos', 'Tickets and circuits'), how: N('Onde estão seus fãs, os ingressos vendem: base forte fora de casa sobe a procura nas cidades daquele mercado e a renda dos circuitos locais.', 'Where your fans are, tickets sell: a strong base abroad lifts demand in that market\'s cities and local circuit income.') },
];
for (const d of LINKS19A) if (!LINKS18.some((x) => x.id === d.id)) LINKS18.push(d);

// ================================================================ 1. espólio × hologramas/voz IA (I1–I3)
const PK19: Record<'holo' | 'vault' | 'voice', PK18> = { holo: 'holo_show', vault: 'vault', voice: 'ai_album' };
const majority = (s: GameState, pid: string): 'guard' | 'cash' | 'artist' | null => {
  const e = estate18(s, pid);
  if (!e) return null;
  const c = { guard: 0, cash: 0, artist: 0 };
  for (const h of e.heirs) c[h.st]++;
  return (Object.keys(c) as ('guard' | 'cash' | 'artist')[]).sort((a, b) => c[b] - c[a])[0];
};
/** Ajuste do espólio na chance de licenciar imagem e voz (neural.negotiateImageRights). */
export function estOdds19(s: GameState, pid: string): { d: number; why: L[] } {
  const e = estate18(s, pid);
  if (!e) return { d: 0, why: [] };
  const why: L[] = [];
  let d = 0;
  const m = majority(s, pid)!;
  const dm = m === 'cash' ? 0.1 : m === 'guard' ? -0.1 : 0;
  d += dm; why.push(F(N('Herdeiros {s} ({d}%)', 'Heirs {s} ({d}%)'), { s: STANCE18[m], d: Math.round(dm * 100) }));
  if (e.unity < 40) { d -= 0.1; why.push(N('Herdeiros desunidos: um veta o que o outro aprova (−10%)', 'Divided heirs: one vetoes what the other approves (−10%)')); }
  if (e.known && e.wish === 'never') { d -= 0.25; why.push(N('Em vida, disse "nunca" (−25%)', 'In life, said "never" (−25%)')); }
  if (e.known && e.wish === 'open') { d += 0.1; why.push(N('Queria "tocar para sempre" (+10%)', 'Wanted to "play forever" (+10%)')); }
  return { d, why };
}
/** Fatia real do espólio nas receitas (hologramas e póstumos): postura dos herdeiros; licença comprada barateia. */
export function estShare19(s: GameState, pid: string): number {
  const m = majority(s, pid);
  if (!m) return 0;
  const base = m === 'cash' ? 0.15 : m === 'guard' ? 0.12 : 0.1;
  return s.imageRights[pid]?.holder === 'player' ? Math.max(0.05, base - 0.04) : base;
}
NEURAL19.gate = (s, pid, neg) => {
  const a = actOfP18(s, pid);
  if (exactHist(s) && a?.catalogNo && !mine(a)) return N('História exata: com artistas reais só acontece o que aconteceu de verdade.', 'Exact history: with real artists only what really happened occurs.');
  const e = estate18(s, pid);
  if (neg && e && e.dispute > s.week) return N('Herdeiros brigando na justiça: o espólio não assina nada agora.', 'Heirs fighting in court: the estate signs nothing now.');
  return null;
};
NEURAL19.odds = (s, pid) => estOdds19(s, pid).d;
NEURAL19.share = (s, pid) => estShare19(s, pid) || 0.1;
NEURAL19.used = (s, pid, k, ok) => {
  if (off()) return;
  const p = s.persons[pid], a = actOfP18(s, pid);
  if (!p || p.alive || !a) return;
  if (k === 'vault' && post18(s).proj.some((x) => x.pid === pid && x.k === 'vault' && x.w === s.week)) return; // post18 já tratou (espólio aprovou)
  const e = estate18(s, pid);
  const b = back18(s, pid, PK19[k]).v;
  const bad = !ok || b >= 55;
  const KN: Record<typeof k, L> = { holo: N('holograma', 'hologram'), vault: N('disco do cofre', 'vault record'), voice: N('voz por IA', 'AI voice') };
  const text = ok
    ? F(N('Espólio de {p} autoriza {k} (fatia de {sh}%; polêmica {b}/100).', '{p}\'s estate authorizes the {k} ({sh}% share; controversy {b}/100).'), { p: p.name, k: KN[k], sh: Math.round(estShare19(s, pid) * 100), b })
    : F(N('{k} de {p} sem aval do espólio: os herdeiros não foram consultados.', '{p} {k} without the estate\'s consent: the heirs were not consulted.'), { p: p.name, k: KN[k] });
  emitFact(s, { kind: 'estate_rights', actors: [a.id, 'player', ...(e?.heirs.map((h) => h.pid ?? '') ?? [])], place: a.city, severity: clamp(25 + b / 2 + a.fame / 5, 20, 80), visibility: 'public', tags: ['posthumous', k, ok ? 'approved' : 'unauthorized', bad ? 'bad' : 'good'], text, data: { pid, b }, src: 'links19a' });
};
// ouvinte: espólio, herdeiros e escândalo
onFact('estate_rights', (s, f) => {
  if (off()) return;
  const pid = String(f.data?.pid ?? '');
  const e = pid ? post18(s).est[pid] : undefined;
  const a = s.acts[f.actors[0]];
  const bad = f.tags.includes('bad'), unauth = f.tags.includes('unauthorized');
  if (e) {
    e.legacy = clamp(e.legacy + (bad ? -4 : 2), 0, 100);
    if (unauth) e.unity = clamp(e.unity + 5, 0, 100); // contra o selo, a família se une
    else if (bad) e.unity = clamp(e.unity - 6, 0, 100);
    const why = F(N('Espólio: {t}', 'Estate: {t}'), { t: f.text });
    for (const h of e.heirs) if (h.pid && s.persons[h.pid]) opine(s, `p:${h.pid}`, unauth ? -10 : bad ? -3 : h.st === 'cash' ? 4 : 2, why);
  }
  if (bad && a) scandal(s, a.id, 'money', unauth ? 50 : clamp(Number(f.data?.b ?? 55) - 10, 30, 70), F(N('Fãs acusam {c} de explorar a memória de {a}.', 'Fans accuse {c} of exploiting {a}\'s memory.'), { c: s.config.companyName, a: a.name }), { tags: ['posthumous', 'links19a'] });
  log(s, 'estate', f.text);
  if (f.severity >= 40) headline19(s, f.text, bad ? 3 : 2);
}, 'links19a:estate');
// fatia do espólio nas vendas dos lançamentos póstumos (dinheiro pelo ledger, categoria direitos)
function estateMonth(s: GameState): void {
  const st = l19a(s);
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || rel.kind !== 'posthumous' || s.week - rel.week > 156) continue;
    const a = s.acts[rel.actId];
    const pid = a?.members.find((id) => s.persons[id] && !s.persons[id].alive);
    if (!pid) continue;
    const d = rel.revenue - (st.rv[rel.id] ?? 0);
    st.rv[rel.id] = rel.revenue;
    const sh = estShare19(s, pid);
    if (d <= 0 || !sh) continue;
    const amt = Math.round(d * sh);
    post(s, `l19a:est:${rel.id}`, -amt, 'rights', `Fatia do espólio: ${rel.title}`);
    if (amt >= money(s, 500)) log(s, 'estate', F(N('Espólio recebe {v} de "{t}" ({p}%).', 'Estate receives {v} from "{t}" ({p}%).'), { v: usd(amt), t: rel.title, p: Math.round(sh * 100) }));
  }
  const ks = Object.keys(st.rv);
  if (ks.length > 80) for (const k of ks.slice(0, ks.length - 80)) delete st.rv[k];
}
LINK18_PARTS.estate = (s, c) => {
  const pid = String(c.pid ?? '');
  if (!pid || !s.persons[pid]) return [{ label: N('Fatia típica do espólio: 10–15% (herdeiros que querem faturar cobram mais; licença comprada barateia 4 pontos).', 'Typical estate share: 10–15% (cash-minded heirs charge more; a bought license cuts 4 points).') }];
  const o = estOdds19(s, pid);
  return [{ label: N('Fatia do espólio', 'Estate share'), value: Math.round(estShare19(s, pid) * 100), fmt: 'pct' }, { label: N('Chance de licenciar', 'Licensing odds'), value: Math.round(o.d * 100), fmt: 'signed' }, ...o.why.map((w) => ({ label: w }))];
};

// ================================================================ 2. fila da fábrica → hype, rádio, calendário (I6)
/** Quanto o hype esfria com um atraso de `w` semanas (pontos de hype). */
export const delayCool19 = (w: number): number => Math.round(clamp(2 + w * 1.5, 0, 14));
SUP19.late = (s, o) => {
  if (off() || o.weeks <= 0) return;
  const a = s.acts[o.act];
  emitFact(s, { kind: 'release_delayed', actors: [o.act, 'player'], severity: clamp(15 + o.weeks * 3, 15, 60), visibility: (a?.fame ?? 0) >= 40 ? 'public' : 'rumor', tags: ['supply', o.how, 'bad'], text: F(N('"{t}" perde a data: a fábrica atrasou {d} semana(s).', '"{t}" misses its date: the plant ran {d} week(s) late.'), { t: o.title, d: o.weeks }), data: { id: o.id, w: o.weeks, nw: o.w, how: o.how, t: o.title }, src: 'links19a' });
};
onFact('release_delayed', (s, f) => {
  if (off()) return;
  const a = s.acts[f.actors[0]];
  if (!a) return;
  const w = Number(f.data?.w ?? 0), id = String(f.data?.id ?? ''), how = String(f.data?.how ?? 'postpone');
  const cool = delayCool19(w);
  const why = N('Fábrica atrasou: a espera esfria', 'Plant delay: the wait cools things');
  addHype(s, how === 'postpone' ? `n:${a.id}` : `r:${id}`, 'sup19', why, -cool);
  const pr = s.pendingReleases.find((x) => x.id === id);
  if (pr && pr.hype) pr.hype = Math.max(0, pr.hype * (1 - Math.min(0.3, w * 0.03)));
  // rádio perde a janela: o single que promovia o disco cai um nível em cada estação
  const R = radio18(s);
  let dropped = 0;
  for (const rid of a.releases.slice(-3)) {
    const rel = s.releases[rid];
    if (!rel || s.week - rel.week > 16 || !R.rot[rid] || w < 3) continue;
    for (const x of R.rot[rid]) if (x.lvl > 0) { x.lvl -= 1; dropped++; }
    R.rot[rid] = R.rot[rid].filter((x) => x.lvl > 0);
    if (!R.rot[rid].length) delete R.rot[rid];
  }
  const nw = Number(f.data?.nw ?? s.week);
  noteDeadline19(s, { id: `links19a:delay:${id}`, w: nw, kind: 'supply', t: F(N('"{t}" chega atrasado', '"{t}" arrives late'), { t: String(f.data?.t ?? a.name) }), d: F(N('Hype −{h}; rádio {r}.', 'Hype −{h}; radio {r}.'), { h: cool, r: dropped ? F(N('perdeu {n} nível(is)', 'lost {n} level(s)'), { n: dropped }) : N('sem efeito', 'unaffected') }), tone: 'bad' });
  log(s, 'delay', F(N('{t} Hype −{h}{r}.', '{t} Hype −{h}{r}.'), { t: f.text, h: cool, r: dropped ? F(N('; rádios baixaram {n} nível(is) de rotação', '; stations cut {n} rotation level(s)'), { n: dropped }) : '' }));
}, 'links19a:delay');
LINK18_PARTS.delay = () => [
  { label: N('Hype perdido por semana de atraso', 'Hype lost per week late'), value: 1.5, fmt: 'num', tone: 'bad' },
  { label: N('Teto de hype perdido', 'Hype loss cap'), value: 14, fmt: 'num' },
  { label: N('Rádio: atraso de 3+ semanas tira 1 nível de rotação do single recente', 'Radio: a 3+ week delay drops the recent single one rotation level') },
];

// ================================================================ 3. censura × leis → pirataria e rádio pirata (I10)
/** Força do mercado negro (0,5–1,7) pela facilidade de copiar na época e pelas leis (world4 piracyLevel). */
export function bootK19(s: GameState): { k: number; name: L; level: number } {
  const p = piracyLevel(s);
  return { k: clamp(0.5 + p.level * 4, 0.5, 1.7), name: p.name, level: p.level };
}
function bannedMonth(s: GameState): void {
  const st = l19a(s), so = soc18(s);
  for (const [rid, y] of Object.entries(so.banned)) {
    if (st.ban[rid]) continue;
    st.ban[rid] = 1;
    const rel = s.releases[rid], a = rel && s.acts[rel.actId];
    if (!rel || !a || y < s.year - 1) continue;
    emitFact(s, { kind: 'banned_song', actors: [a.id, 'player'], place: a.city, severity: 45, visibility: 'public', tags: ['censorship', 'piracy', countryOfCity(a.city) ?? ''], text: F(N('"{t}" proibida: cópias piratas e rádios clandestinas espalham a música de {a}.', '"{t}" banned: bootlegs and clandestine radio spread {a}\'s song.'), { t: rel.title, a: a.name }), data: { rel: rid }, src: 'links19a' });
  }
}
function forbiddenFruit(s: GameState, f: Fact, w: number, radio: boolean): void {
  const a = s.acts[f.actors[0]];
  if (!a) return;
  const b = bootK19(s), k = b.k * w;
  const add = Math.round(a.fans.casual * 0.04 * k + 200 * k);
  a.fans.casual += add;
  a.momentum = clamp(a.momentum + Math.round(3 * k), -100, 100);
  const a3 = countryOfCity(a.city);
  if (a3) nudge16(s, a.id, a3, 1 * k); // fama subterrânea em casa
  const pirate = radio && hasTech(s, 'radio');
  if (pirate) addHype(s, `a:${a.id}`, 'pirate19', N('Rádio pirata toca a proibida', 'Pirate radio plays the banned song'), Math.round(6 * k));
  log(s, 'banned', F(N('{t} Fãs +{n}{r} ({p}).', '{t} Fans +{n}{r} ({p}).'), { t: f.text, n: add.toLocaleString('en-US'), r: pirate ? N('; rádio pirata dá hype', '; pirate radio adds hype') : '', p: b.name }));
  if (a.fame >= 30) headline19(s, f.text, 2);
}
onFact('banned_song', (s, f) => { if (!off()) forbiddenFruit(s, f, 1, true); }, 'links19a:banned');
onFact('video_banned', (s, f) => { if (!off()) forbiddenFruit(s, f, 0.5, false); }, 'links19a:video');
LINK18_PARTS.banned = (s) => {
  const b = bootK19(s);
  return [{ label: F(N('Cópia na época: {n}', 'Copying in this era: {n}'), { n: b.name }), value: Math.round(b.level * 100), fmt: 'pct' }, { label: N('Força do mercado negro', 'Black-market strength'), value: Math.round(b.k * 100) / 100, fmt: 'mult' }, { label: N('Fãs casuais por música proibida', 'Casual fans per banned song'), value: Math.round(4 * b.k * 10) / 10, fmt: 'pct', tone: 'good' }];
};

// ================================================================ 4. festival × segurança × crime → tragédia, processo, lei (I16)
/** Chance de a confusão de uma edição virar tragédia (0..1) e o porquê. Nunca no modo exato. */
export function tragedyOdds19(s: GameState, att: number, cap: number, permit: number, safety: number): { p: number; why: L[] } {
  const why: L[] = [];
  if (exactHist(s)) return { p: 0, why: [N('História exata: tragédias só como crônica real.', 'Exact history: tragedies only as real chronicle.')] };
  let p = 0.1;
  if (att >= cap * 0.97) { p *= 1.5; why.push(N('Lotação no limite (×1,5)', 'Capacity at the limit (×1.5)')); }
  if (permit && att > permit) { p *= 1.5; why.push(N('Público acima da licença (×1,5)', 'Crowd above the permit (×1.5)')); }
  if (safety < 35) { p *= 1.4; why.push(N('Segurança abaixo de 35 (×1,4)', 'Safety below 35 (×1.4)')); }
  const sec = crime17(s).sec;
  if (!sec) { p *= 1.3; why.push(N('Sem segurança contratada (crime17) (×1,3)', 'No hired security (crime17) (×1.3)')); } else { p *= 1 - sec * 0.12; why.push(N('Equipe de segurança contratada reduz', 'Hired security team reduces it')); }
  const n = safetyNorm18(s);
  p *= n; why.push(F(N('Normas da época ×{k}', 'Era rules ×{k}'), { k: Math.round(n * 100) / 100 }));
  return { p: clamp(p, 0, 0.35), why };
}
function festMonth(s: GameState): void {
  const st = l19a(s);
  for (const f of liveOf(s).fests) {
    const n = f.editions.length;
    const prev = st.fe[f.id];
    st.fe[f.id] = n;
    if (prev === undefined || n <= prev) continue;
    const ed = f.editions[n - 1];
    if (!ed.disaster) continue;
    const F18 = ff18(s, f);
    const o = tragedyOdds19(s, ed.attendance, ed.capacity, F18.permit, ed.safety);
    const r = rng19(s, 'links19a', () => Rng.fromSeed(`${s.config.seed}|l19a|${f.id}|${ed.year}`));
    const sev = r.chance(o.p) ? 3 : 2;
    const city = cityById[f.cityId]?.name ?? l(f.cityId, f.cityId);
    const text = sev === 3
      ? F(N('{f} {y}: tragédia na multidão diante do palco; há mortos (história alternativa).', '{f} {y}: tragedy in the crowd before the stage; there are deaths (alternate history).'), { f: f.name, y: ed.year })
      : F(N('{f} {y} em {c}: superlotação, grades derrubadas e feridos.', '{f} {y} in {c}: overcrowding, barriers down and injuries.'), { f: f.name, y: ed.year, c: city });
    emitFact(s, { kind: 'crowd_incident', actors: ['player'], place: f.cityId, severity: sev === 3 ? 85 : 50, visibility: 'public', tags: ['festival', 'safety', ...(sev === 3 ? ['tragedy'] : [])], text, data: { sev, fest: f.id, att: ed.attendance }, src: 'links19a' });
  }
}
// ouvinte: processo (festival próprio) e lei nova de segurança (tragédias)
onFact('crowd_incident', (s, f) => {
  if (off()) return;
  const sev = Number(f.data?.sev ?? (f.severity >= 80 ? 3 : f.severity >= 50 ? 2 : 1));
  if (f.src === 'chron' || sev < 2) return;
  const fest = f.tags.includes('festival') && f.actors.includes('player');
  if (fest) {
    const claim = money(s, sev === 3 ? 400000 : 60000) + Math.round(Number(f.data?.att ?? 0) * money(s, sev === 3 ? 2 : 0.3));
    const sec = crime17(s).sec;
    s.lawsuits.push({ id: nextId(s, 'ls'), kind: 'safety', plaintiff: sev === 3 ? N('Famílias das vítimas', 'Victims\' families').pt : N('Feridos e associação de moradores', 'Injured and residents\' association').pt, defendant: 'player', claim, odds: clamp(0.2 + sec * 0.08, 0.1, 0.5), stage: 'filed', nextWeek: s.week + 12, text: f.text });
    log(s, 'crowd', F(N('{t} Processo de {v}.', '{t} Lawsuit for {v}.'), { t: f.text, v: usd(claim) }));
  }
  if (sev >= 3) {
    if (f.src !== 'live18') { const v = live18(s); v.inc.push({ y: s.year, sev: 3 }); if (v.inc.length > 20) v.inc.shift(); } // normas mais duras (safetyNorm18)
    const place = f.place ? cityById[f.place]?.name ?? l(f.place, f.place) : N('o país', 'the country');
    const t = F(N('Lei de segurança em shows aprovada depois da tragédia em {c}: grades, saídas e socorristas obrigatórios.', 'Concert safety law passed after the tragedy in {c}: barriers, exits and medics mandatory.'), { c: place });
    emitFact(s, { kind: 'law', actors: ['player'], place: f.place, severity: 50, visibility: 'public', tags: ['safety', 'law', 'links19a'], text: t, cause: [f.id], src: 'links19a' });
    headline19(s, t, 3);
    log(s, 'crowd', t);
    notify(s, t, 'bad');
  }
}, 'links19a:crowd');
LINK18_PARTS.crowd = (s) => {
  const f = liveOf(s).fests[0];
  if (!f) return [{ label: N('Sem festival próprio.', 'No own festival.') }];
  const ed = f.editions[f.editions.length - 1];
  const o = tragedyOdds19(s, ed?.attendance ?? 0, ed?.capacity ?? 1, ff18(s, f).permit, ed?.safety ?? 60);
  return [{ label: F(N('Se a edição de {f} der confusão: chance de tragédia', 'If {f}\'s edition goes wrong: tragedy chance'), { f: f.name }), value: Math.round(o.p * 1000) / 10, fmt: 'pct', tone: 'bad' }, ...o.why.map((w) => ({ label: w }))];
};

// ================================================================ 5. eco forte → cena curta; roupa do tapete → eco (11.7)
/** Eco forte: 3+ efeitos, ou ruim com 2+. */
export const strongEcho19 = (f: Fact): boolean => { const n = Number(f.data?.n ?? 0); return n >= 3 || (f.tags.includes('bad') && n >= 2); };
onFact('echo', (s, f) => {
  if (off()) return;
  if (!strongEcho19(f)) return;
  const m = mineOf17(s, f.actors.map((x) => (x.startsWith('p:') ? x.slice(2) : x)));
  if (!m) return;
  const st = l19a(s), mk = s.year * 12 + s.month, thr = String(f.data?.thr ?? f.id);
  if (st.em === mk || st.eth[thr]) return; // uma cena por mês, uma por fio
  st.em = mk; st.eth[thr] = 1;
  const ks = Object.keys(st.eth);
  if (ks.length > 60) delete st.eth[ks[0]];
  const tone = f.tags.includes('good') ? 'good' : f.tags.includes('bad') ? 'bad' : 'mixed';
  const sh = logShot18(s, { k: 'echo', act: m.act, pid: m.pid, text: f.text, fact: f.id, d: { o: String(f.data?.o ?? ''), tone } });
  queueScene(s, 'cine18', tone === 'bad' ? 'street' : 'backstage', { title: F(N('Eco: {o}', 'Echo: {o}'), { o: String(f.data?.o ?? '') }), shot: sh.id, actId: m.act ?? null }, { minor: true, prio: true }); // r19: eco de decisão sua não é cortado
  log(s, 'echo', F(N('Você escolheu "{o}" — e voltou: {t}', 'You chose "{o}" — and it came back: {t}'), { o: String(f.data?.o ?? ''), t: f.text }));
}, 'links19a:echo');
const fitEcho = (fit: Fit18): void => {
  const nm = (f: Fx18) => f.act?.name ?? '';
  const spec: Record<Fit18, Parameters<typeof registerConseq18>[1]> = {
    classic: { later: [{ in: [2, 6], p: 0.5, tone: 'good', hint: N('Elegância é lembrada por quem vota.', 'Elegance is remembered by voters.'), fx: (f) => { f.rep('institutional', 1).fame(1); return F(N('Jurados ainda comentam a elegância de {a} no tapete vermelho.', 'Voters still mention {a}\'s red-carpet elegance.'), { a: nm(f) }); } }] },
    bold: { later: [{ in: [1, 4], p: 0.6, tone: 'mixed', hint: N('A foto pode voltar — como ícone ou como piada.', 'The photo may return — as an icon or a joke.'), fx: (f) => { f.fame(2).fans(2).mood('stress', 4); return F(N('A foto do figurino de {a} volta como meme e capa de revista.', '{a}\'s outfit photo returns as a meme and a magazine cover.'), { a: nm(f) }); } }] },
    statement: { later: [{ in: [2, 8], p: 0.55, tone: 'mixed', hint: N('A mensagem pode cobrar coerência.', 'The message may demand consistency.'), fx: (f) => { f.rep('artistic', 2).momentum(4).fans(-1); return F(N('Ativistas chamam {a} para um ato; parte do público torce o nariz.', 'Activists invite {a} to a rally; part of the audience frowns.'), { a: nm(f) }); } }] },
    brand: { later: [{ in: [3, 9], p: 0.5, tone: 'good', hint: N('A grife pode voltar com proposta.', 'The designer may come back with an offer.'), fx: (f) => { f.cash(2500 + (f.act?.fame ?? 10) * 80, 'designer ambassador').rep('artistic', -1).trust(-2); return F(N('A grife convida {a} para embaixador da marca.', 'The designer invites {a} to be a brand ambassador.'), { a: nm(f) }); } }] },
  };
  registerConseq18(`fit18:${fit}`, spec[fit]);
};
for (const k of Object.keys(FIT18) as Fit18[]) fitEcho(k);
FIT19.after = (s, key, fit, actId) => { if (!off()) schedule18(s, `fit18:${fit}`, { ...(actId ? { act: actId } : {}), fit: key }, N('Tapete vermelho', 'Red carpet'), FIT18[fit].name); };
LINK18_PARTS.echo = (s) => [{ label: N('Eco forte = 3+ efeitos (ou ruim com 2+)', 'Strong echo = 3+ effects (or bad with 2+)') }, { label: N('No máximo 1 cena por mês e 1 por fio', 'At most 1 scene a month and 1 per thread') }, { label: N('Cenas de eco já vistas', 'Echo scenes seen'), value: Object.keys(l19a(s).eth).length, fmt: 'num' }];

// ================================================================ 6. fãs por região → ingressos e circuitos (I12/I23)
const REG_CACHE = new WeakMap<GameState, { w: number; m: Map<string, Record<string, number>> }>();
/** Fatia dos fãs do ato em cada mercado (fandom19; guardado por semana dentro do próprio jogo). */
export function regShare19(s: GameState, actId: string): Record<string, number> {
  let c = REG_CACHE.get(s);
  if (!c || c.w !== s.week) { c = { w: s.week, m: new Map() }; REG_CACHE.set(s, c); }
  let r = c.m.get(actId);
  if (!r) {
    const by = fansByRegion19(s, actId), tot = Object.values(by).reduce((t, x) => t + x, 0);
    r = {};
    for (const [mk, v] of Object.entries(by)) r[mk] = tot ? v / tot : 0;
    c.m.set(actId, r);
  }
  return r;
}
/** Multiplicador de procura numa cidade fora do mercado de casa (0,9–1,5; +10% com base nova recente). */
export function regionDemand19(s: GameState, a: Act, cityId: string): { k: number; sh: number; buzz: boolean } | null {
  const c = cityById[cityId], home = cityById[a.city]?.market;
  if (!c || !home || c.market === home) return null;
  const sh = regShare19(s, a.id)[c.market] ?? 0;
  const buzz = (l19a(s).rb[`${a.id}:${c.market}`] ?? 0) > s.week;
  return { k: clamp(1 + (sh - 0.06) * 2, 0.9, 1.5) * (buzz ? 1.1 : 1), sh, buzz };
}
registerMod('cityDemand', 'links19a:region', (s, v, c) => {
  if (off() || !c.act || !c.cityId || !mine(c.act)) return null;
  const r = regionDemand19(s, c.act, c.cityId);
  if (!r || Math.abs(r.k - 1) < 0.01) return null;
  return { value: v * r.k, label: r.buzz ? N('Base de fãs nova na região', 'New fan base in the region') : N('Fãs nesta região', 'Fans in this region') };
});
function regionMonth(s: GameState): void {
  const st = l19a(s), R = reg18(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    const total = a.fans.core + a.fans.active + a.fans.casual;
    // circuitos: fãs no mercado do circuito engordam a renda
    for (const cid of R.circ[id] ?? []) {
      const c = CIRCS18.find((x) => x.id === cid), sub = c && subById18[c.sub];
      if (!c?.cash || !sub) continue;
      const sh = regShare19(s, id)[sub.mk] ?? 0;
      const bonus = Math.round(money(s, Math.round(c.cash * (0.6 + a.fame / 60))) * clamp(sh * 0.5, 0, 0.25));
      if (bonus > 0) post(s, `l19a:circ:${cid}:${id}`, bonus, 'live', `${c.name.pt}: público próprio (${a.name})`);
    }
    if (s.month % 3 || total < 5000) continue;
    const home = cityById[a.city]?.market;
    const sh = regShare19(s, id);
    for (const m of MARKETS) {
      const key = `${id}:${m.id}`;
      if (m.id === home || st.fr[key] || (sh[m.id] ?? 0) < 0.2 || total * (sh[m.id] ?? 0) < 5000) continue;
      st.fr[key] = 1;
      emitFact(s, { kind: 'fan_region', actors: [id, 'player'], severity: clamp(25 + a.fame / 3, 25, 60), visibility: 'public', tags: ['fans', 'region', m.id, 'good'], text: F(N('{a} ganha uma base de fãs em {m} ({p}% do público).', '{a} builds a fan base in {m} ({p}% of the audience).'), { a: a.name, m: m.name, p: Math.round((sh[m.id] ?? 0) * 100) }), data: { mk: m.id }, src: 'links19a' });
    }
  }
}
onFact('fan_region', (s, f) => {
  if (off()) return;
  const a = s.acts[f.actors[0]], mk = String(f.data?.mk ?? '');
  if (!a || !mk) return;
  l19a(s).rb[`${a.id}:${mk}`] = s.week + 26;
  const circ = CIRCS18.filter((c) => subById18[c.sub]?.mk === mk && s.year >= c.from && (c.to === undefined || s.year <= c.to) && (c.g.includes(a.genre)));
  log(s, 'region', F(N('{t} Shows lá: procura +10% por 6 meses{c}.', '{t} Shows there: demand +10% for 6 months{c}.'), { t: f.text, c: circ.length ? F(N('; circuito local aberto: {n}', '; local circuit open: {n}'), { n: circ[0].name }) : '' }));
  if (a.fame >= 45) headline19(s, f.text, 1);
}, 'links19a:region');
LINK18_PARTS.region = (s, c) => {
  const a = c.act ? s.acts[String(c.act)] : playerActs(s).map((id) => s.acts[id]).find(Boolean);
  if (!a) return [];
  const sh = regShare19(s, a.id);
  return MARKETS.filter((m) => (sh[m.id] ?? 0) >= 0.02).map((m): WhyPart => ({ label: F(N('Fãs em {m}', 'Fans in {m}'), { m: m.name }), value: Math.round((sh[m.id] ?? 0) * 100), fmt: 'pct' }));
};

/** Mês das ligações (exportado para os testes). */
export function month19a(s: GameState): void {
  if (off()) return;
  safe(() => estateMonth(s)); safe(() => bannedMonth(s)); safe(() => festMonth(s)); safe(() => regionMonth(s));
}
registerSimHook('month', 'links19a', month19a);
