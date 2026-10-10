// Rodada 18 (cine18) — CARREIRAS PÓSTUMAS e espólios. A morte não encerra a carreira: o espólio (herdeiros com
// postura própria, união, desejo do artista em vida, valor de legado) aprova ou veta projetos com custo, qualidade
// técnica da época, polêmica ética, reação dos fãs e receita:
//   show-tributo · caixa de colecionador · remasterização (Atmos 2019+) · disco do cofre (inéditas, usa neural.ts) ·
//   cinebiografia (liga image17/screen18) · ilusão de Pepper's ghost (palco, antes de 2012) · holograma em festival
//   (2012, estilo Coachella) · turnê de holograma (2018+) · residência de avatares digitais (2022+, estilo ABBA
//   Voyage — também para artistas VIVOS, com consentimento) · álbum com IA (2023+: "restaurar" a voz de uma demo ou
//   "clonar" a voz — regras do ai18 e direitos de voz do image17).
// Herdeiros brigam (disputa na justiça trava aprovações e receitas), legado sobe com homenagens e cai com caça-níqueis.
// Modo história EXATA: com artistas reais só acontece o que aconteceu (crônica real: Tupac 2012, MJ 2014, Orbison 2018,
// Whitney 2020, ABBA Voyage 2022, Beatles "Now and Then" 2023...). Demais modos: história alternativa — selos rivais
// também fazem hologramas e cinebiografias de lendas mortas.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { exactHist } from '../history15';
import { posthumousRelease } from '../neural';
import { scandal } from '../scandal17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { hasRight, isEstate } from './image17';
import { platformPolicy18 } from './ai18';
import { kinOf15 } from './kin15';
import { soul } from './soul9';
import { logShot18, type Kind18 } from './cine18';
import { nudge16 } from './fame16';
import { countryOfCity } from '../../data/geo';

const F = fmtL;

// ---------------------------------------------------------------- catálogo de projetos

export type PK18 = 'tribute' | 'box' | 'remaster' | 'vault' | 'biopic' | 'ghost' | 'holo_show' | 'holo_tour' | 'avatar' | 'ai_album';
export interface PDef18 { name: L; desc: L; from: number; to?: number; cost: number; months: number; back: number; legacy: number; living?: boolean; shot?: Kind18; rev: string; cost_cat: string; roi: number }
export const PK18: Record<PK18, PDef18> = {
  tribute: { name: l('Show-tributo', 'Tribute concert'), desc: l('Amigos e artistas do selo tocam o repertório. Beneficente (legado) ou com ingresso (caixa).', 'Friends and label acts play the songbook. Charity (legacy) or ticketed (cash).'), from: 1930, cost: 40000, months: 1, back: 0, legacy: 6, shot: 'tribute', rev: 'live', cost_cat: 'live_costs', roi: 1.3 },
  box: { name: l('Caixa de colecionador', 'Collector\'s box set'), desc: l('Discografia, encarte, fotos raras. Fãs fiéis compram; casuais ignoram.', 'Discography, booklet, rare photos. Core fans buy; casuals ignore it.'), from: 1965, cost: 25000, months: 3, back: 4, legacy: 3, living: true, rev: 'sales', cost_cat: 'manufacturing', roi: 1.5 },
  remaster: { name: l('Remasterização', 'Remaster'), desc: l('Som novo para o catálogo (a partir de 2019, mixagem Atmos). Puristas reclamam.', 'New sound for the catalog (from 2019, Atmos mix). Purists complain.'), from: 1985, cost: 15000, months: 2, back: 8, legacy: 2, living: true, rev: 'sales', cost_cat: 'recording', roi: 1.45 },
  vault: { name: l('Disco do cofre', 'Vault album'), desc: l('Inéditas e demos finalizadas. Um grande disco ou "raspar o tacho".', 'Unreleased songs and demos finished. A great record or "scraping the barrel".'), from: 1950, cost: 20000, months: 2, back: 14, legacy: 1, rev: 'sales', cost_cat: 'recording', roi: 1.6 },
  biopic: { name: l('Cinebiografia', 'Biopic'), desc: l('Filme sobre a vida. Fiel (legado) ou glamourizado (bilheteria). O catálogo volta às paradas.', 'A film about the life. Faithful (legacy) or glossy (box office). The catalog returns to the charts.'), from: 1945, cost: 120000, months: 12, back: 10, legacy: 4, living: true, shot: 'premiere', rev: 'licensing', cost_cat: 'production', roi: 1.7 },
  ghost: { name: l('Ilusão de Pepper\'s ghost', 'Pepper\'s ghost illusion'), desc: l('Truque teatral com vidro inclinado e filmagens antigas: o artista "aparece" no palco.', 'Theatre trick with angled glass and old footage: the artist "appears" on stage.'), from: 1900, to: 2011, cost: 30000, months: 3, back: 20, legacy: 0, shot: 'ghost', rev: 'live', cost_cat: 'live_costs', roi: 1.25 },
  holo_show: { name: l('Holograma em festival', 'Festival hologram'), desc: l('Uma aparição surpresa num festival ou premiação (Coachella 2012, Billboard 2014). Novidade gera buzz.', 'A surprise appearance at a festival or awards show (Coachella 2012, Billboard 2014). Novelty creates buzz.'), from: 2012, cost: 400000, months: 1, back: 34, legacy: 1, shot: 'hologram', rev: 'live', cost_cat: 'live_costs', roi: 1.5 },
  holo_tour: { name: l('Turnê de holograma', 'Hologram tour'), desc: l('Banda ao vivo + holograma do artista, cidade a cidade (Orbison 2018, Whitney 2020).', 'Live band + the artist\'s hologram, city by city (Orbison 2018, Whitney 2020).'), from: 2018, cost: 1200000, months: 6, back: 42, legacy: 0, shot: 'hologram', rev: 'live', cost_cat: 'live_costs', roi: 1.55 },
  avatar: { name: l('Residência de avatares', 'Avatar residency'), desc: l('Arena própria, avatares digitais rejuvenescidos por captura de movimento (ABBA Voyage 2022). Vivos também.', 'Purpose-built arena, de-aged digital avatars via motion capture (ABBA Voyage 2022). Living acts too.'), from: 2022, cost: 6000000, months: 24, back: 18, legacy: 3, living: true, shot: 'avatar', rev: 'live', cost_cat: 'live_costs', roi: 1.9 },
  ai_album: { name: l('Álbum com IA', 'AI album'), desc: l('"Restaurar" a voz de uma demo (Now and Then, 2023) ou "clonar" a voz para músicas novas.', '"Restore" the voice from a demo (Now and Then, 2023) or "clone" the voice for new songs.'), from: 2023, cost: 60000, months: 2, back: 48, legacy: -2, rev: 'sales', cost_cat: 'recording', roi: 1.5 },
};

export type Share18 = 'low' | 'fair' | 'high';
export const SHARE18: Record<Share18, { name: L; v: number; p: number }> = {
  low: { name: l('25% ao espólio', '25% to the estate'), v: 0.25, p: -0.12 },
  fair: { name: l('50% ao espólio', '50% to the estate'), v: 0.5, p: 0.1 },
  high: { name: l('65% ao espólio', '65% to the estate'), v: 0.65, p: 0.22 },
};
/** Estilo por tipo: tributo (beneficente/ingresso), filme (fiel/glamour), IA (restaurar/clonar). */
export type Style18 = 'charity' | 'ticketed' | 'faithful' | 'glossy' | 'restore' | 'clone' | '';

// ---------------------------------------------------------------- estado

export interface Heir18 { name: string; pid?: string; rel: L; st: 'guard' | 'cash' | 'artist' }
export interface Est18 { pid: string; act: string; heirs: Heir18[]; unity: number; legacy: number; wish: 'never' | 'open' | 'unknown'; known?: 1; dispute: number; n: number; last: number }
export interface Proj18 { id: string; k: PK18; pid: string; act: string; y: number; m: number; w: number; left: number; q: number; back: number; share: number; style: Style18; cost: number; rev: number; tot: number; st: 'run' | 'done'; shot?: string; living?: 1 }
export interface Post18 { est: Record<string, Est18>; proj: Proj18[]; seq: number; cd: Record<string, number>; log: [number, number, L][]; chron: Record<string, 1>; alt: Record<string, 1>; holoN: number }
declare module '../ext4' { interface Ext4 { post18: Post18 } }
const fresh = (): Post18 => ({ est: {}, proj: [], seq: 0, cd: {}, log: [], chron: {}, alt: {}, holoN: 0 });
registerExt4('post18', fresh);
export function post18(s: GameState): Post18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.post18 ??= fresh()) as Post18;
  st.est ??= {}; st.proj ??= []; st.cd ??= {}; st.log ??= []; st.chron ??= {}; st.alt ??= {}; st.holoN ??= 0;
  return st;
}
const rng = (s: GameState, tag: string) => Rng.fromSeed(`${s.config.seed}:post18:${tag}`);
const log = (s: GameState, t: L) => { const st = post18(s); st.log.push([s.year, s.month, t]); if (st.log.length > 60) st.log.shift(); };
export const actOfP18 = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid));
const mine = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);

/** Espólio (criado na primeira consulta depois da morte). */
export function estate18(s: GameState, pid: string): Est18 | null {
  const p = s.persons[pid];
  if (!p || p.alive) return null;
  const st = post18(s);
  if (st.est[pid]) return st.est[pid];
  const a = actOfP18(s, pid);
  const r = rng(s, `est:${pid}`);
  const kin = kinOf15(s, pid).filter((k) => k.p.alive && ['child', 'spouse', 'sibling', 'parent'].includes(k.rel)).slice(0, 4);
  const stance = (q?: Person): Heir18['st'] => {
    if (!q) return r.pick(['guard', 'cash', 'artist'] as const);
    const f = soul(s, q).f;
    return (f.ambicao ?? 50) > 62 ? 'cash' : (f.lealdade ?? 50) > 60 || (f.empatia ?? 50) > 62 ? 'guard' : 'artist';
  };
  const heirs: Heir18[] = kin.length ? kin.map((k) => ({ name: k.p.name, pid: k.p.id, rel: REL[k.rel] ?? l('parente', 'relative'), st: stance(k.p) }))
    : [{ name: F(l('Fundação {p}', '{p} Foundation'), { p: p.name.split(' ').slice(-1)[0] }).pt, rel: l('fundação/curadores', 'foundation/trustees'), st: r.pick(['guard', 'artist'] as const) }];
  const e: Est18 = { pid, act: a?.id ?? '', heirs, unity: clamp(Math.round(80 - (heirs.length - 1) * 14 + r.int(-10, 10)), 10, 95), legacy: clamp(Math.round((a?.fame ?? 20) * 0.8 + (a?.legend ? 15 : 0)), 5, 100), wish: r.chance(0.22) ? 'never' : r.chance(0.35) ? 'open' : 'unknown', dispute: 0, n: 0, last: 0 };
  st.est[pid] = e;
  return e;
}
const REL: Record<string, L> = { child: l('filho(a)', 'child'), spouse: l('viúvo(a)', 'widow(er)'), sibling: l('irmão(ã)', 'sibling'), parent: l('pai/mãe', 'parent') };
const majority = (e: Est18): Heir18['st'] => { const c = { guard: 0, cash: 0, artist: 0 }; for (const h of e.heirs) c[h.st]++; return (Object.keys(c) as Heir18['st'][]).sort((a, b) => c[b] - c[a])[0]; };

/** Quem pode virar projeto: mortos com obra (seus ou de terceiros) e, para alguns tipos, seus atos vivos. */
export function cands18(s: GameState): { pid: string; act: Act; dead: boolean }[] {
  const out: { pid: string; act: Act; dead: boolean }[] = [];
  for (const a of Object.values(s.acts)) {
    if (!mine(a) && a.fame < 25) continue;
    const dead = a.members.filter((id) => s.persons[id] && !s.persons[id].alive);
    for (const id of dead.slice(0, 2)) out.push({ pid: id, act: a, dead: true });
    if (mine(a) && !isEstate(s, a) && a.members.length) out.push({ pid: a.members[0], act: a, dead: false });
  }
  return out.sort((x, y) => Number(mine(y.act)) - Number(mine(x.act)) || y.act.fame - x.act.fame).slice(0, 40);
}

// ---------------------------------------------------------------- tecnologia, polêmica e chance

/** Qualidade técnica (0..1) pela época: a mesma ideia fica estranha em 2012 e convincente em 2030. */
export function tech18(y: number, k: PK18): { q: number; why: L } {
  if (k === 'ghost') return { q: 0.35, why: l('Vidro inclinado e filme antigo: lindo de frente, fantasmagórico de lado.', 'Angled glass and old film: lovely head-on, ghostly from the side.') };
  if (k === 'holo_show' || k === 'holo_tour') {
    const q = y >= 2027 ? 0.92 : y >= 2020 ? 0.7 : y >= 2018 ? 0.64 : y >= 2014 ? 0.6 : 0.55;
    return { q, why: y >= 2027 ? l('Holograma volumétrico (2027+): convincente de qualquer ângulo.', 'Volumetric hologram (2027+): convincing from any angle.') : l('Projeção em película (Pepper\'s ghost digital): o vale da estranheza aparece.', 'Foil projection (digital Pepper\'s ghost): the uncanny valley shows.') };
  }
  if (k === 'avatar') return { q: y >= 2027 ? 0.95 : 0.86, why: l('Captura de movimento com os próprios artistas (ou dublês) e telas gigantes de altíssima resolução.', 'Motion capture with the artists themselves (or doubles) and giant ultra-high-res screens.') };
  if (k === 'ai_album') return { q: y >= 2028 ? 0.85 : y >= 2025 ? 0.72 : 0.62, why: l('Modelos de voz melhoram ano a ano; ouvidos atentos ainda percebem.', 'Voice models improve every year; sharp ears still notice.') };
  if (k === 'remaster') return { q: y >= 2019 ? 0.85 : y >= 1995 ? 0.75 : 0.65, why: y >= 2019 ? l('Mixagem espacial (Atmos) a partir dos multipistas.', 'Spatial (Atmos) mix from the multitracks.') : l('Remasterização digital das fitas originais.', 'Digital remaster from the original tapes.') };
  return { q: 0.8, why: l('Tecnologia não é o problema aqui.', 'Technology is not the issue here.') };
}

export const kindsNow18 = (s: GameState, dead: boolean): PK18[] => (Object.keys(PK18) as PK18[]).filter((k) => s.year >= PK18[k].from && (!PK18[k].to || s.year <= PK18[k].to!) && (dead || PK18[k].living));

/** Bloqueios: modo exato (reais só como crônica), disputa, intervalo, dinheiro. */
export function block18(s: GameState, pid: string, k: PK18): L | null {
  const a = actOfP18(s, pid);
  const p = s.persons[pid];
  if (!a || !p) return l('Sem carreira associada.', 'No associated career.');
  const def = PK18[k];
  if (s.year < def.from) return F(l('Ainda não existe ({y}).', 'Does not exist yet ({y}).'), { y: def.from });
  if (def.to && s.year > def.to) return l('Superado pela tecnologia nova.', 'Superseded by newer tech.');
  if (p.alive && !def.living) return l('Só para quem já partiu.', 'Only for those who have passed.');
  if (p.alive && !mine(a)) return l('Com artistas vivos, só os do seu elenco.', 'With living artists, only your own roster.');
  if (exactHist(s) && a.catalogNo && !mine(a)) return l('História exata: com artistas reais só acontece o que aconteceu de verdade (veja a crônica).', 'Exact history: with real artists only what really happened occurs (see the chronicle).');
  const e = p.alive ? null : estate18(s, pid);
  if (e && e.dispute > s.week) return l('Herdeiros brigando na justiça: o espólio não assina nada.', 'Heirs fighting in court: the estate signs nothing.');
  if ((post18(s).cd[pid] ?? 0) > s.week) return l('O espólio pediu um tempo antes de ouvir outra proposta.', 'The estate asked for time before hearing another pitch.');
  if (post18(s).proj.some((x) => x.pid === pid && x.k === k && x.st === 'run')) return l('Já em andamento.', 'Already running.');
  if (k === 'ai_album' && p.alive) return l('Voz por IA de artista vivo: use os acordos de imagem (image17).', 'AI voice of a living artist: use image deals (image17).');
  if (s.player.cash < money(s, def.cost)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}

/** Polêmica prevista (0..100) com o porquê. */
export function back18(s: GameState, pid: string, k: PK18, style: Style18 = ''): { v: number; why: L[] } {
  const why: L[] = [];
  const p = s.persons[pid];
  const a = actOfP18(s, pid);
  let v = PK18[k].back;
  why.push(F(l('Base do tipo: {v}', 'Type baseline: {v}'), { v }));
  if (k === 'ai_album') { if (style === 'restore') { v = 14; why.push(l('Restaurar uma voz real de demo é aceito pela maioria.', 'Restoring a real demo voice is accepted by most.')); } else { const pol = platformPolicy18(s); v += Math.round(pol.detect * 30); why.push(pol.name); } }
  if (k === 'tribute' && style === 'ticketed') { v += 8; why.push(l('Ingresso caro em homenagem pega mal.', 'Pricey tickets for a tribute look bad.')); }
  if (k === 'biopic' && style === 'glossy') { v += 10; why.push(l('Versão glamourizada: família e fãs reclamam de mentiras.', 'Glossy version: family and fans complain about lies.')); }
  const t = tech18(s.year, k);
  if (['holo_show', 'holo_tour', 'ai_album', 'ghost'].includes(k) && t.q < 0.7) { const d = Math.round((0.7 - t.q) * 60); v += d; why.push(F(l('Vale da estranheza (qualidade {q}%): +{d}', 'Uncanny valley (quality {q}%): +{d}'), { q: Math.round(t.q * 100), d })); }
  if (p && !p.alive) {
    const e = estate18(s, pid)!;
    if (e.wish === 'never' && e.known && ['holo_show', 'holo_tour', 'avatar', 'ai_album', 'ghost'].includes(k)) { v += 30; why.push(l('Em vida, o artista disse que nunca queria isso: +30', 'In life, the artist said they never wanted this: +30')); }
    if (p.died && s.year - p.died < 2) { v += 15; why.push(l('Cedo demais: o luto ainda está fresco (+15).', 'Too soon: the grief is still fresh (+15).')); }
    const recent = post18(s).proj.filter((x) => x.pid === pid && s.year - x.y <= 5).length;
    if (recent) { v += recent * 8; why.push(F(l('{n} projeto(s) nos últimos 5 anos: cheiro de caça-níquel (+{d}).', '{n} project(s) in the last 5 years: smells like a cash grab (+{d}).'), { n: recent, d: recent * 8 })); }
  } else if (p) { v = Math.max(0, v - 15); why.push(l('Artista vivo e de acordo: menos polêmica.', 'Living artist on board: less controversy.')); }
  const pur = a ? purist18(s, a) : 0;
  if (pur > 0.3 && k !== 'tribute') { const d = Math.round(pur * 15); v += d; why.push(F(l('Fandom purista ({p}%): +{d}', 'Purist fandom ({p}%): +{d}'), { p: Math.round(pur * 100), d })); }
  return { v: clamp(Math.round(v), 0, 100), why };
}
function purist18(s: GameState, a: Act): number {
  const f = (s.x4 as unknown as { fans18?: { a: Record<string, { fac: number[] }> } }).fans18?.a[a.id];
  if (!f) return 0;
  const sum = f.fac.reduce((t, x) => t + x, 0);
  return sum > 0 ? f.fac[0] / sum : 0;
}

/** Chance de o espólio (ou os membros vivos) aprovar, termo a termo. */
export function ask18(s: GameState, pid: string, k: PK18, share: Share18 = 'fair', style: Style18 = ''): { p: number; why: L[] } {
  const p = s.persons[pid];
  const a = actOfP18(s, pid);
  const why: L[] = [];
  if (!p || !a) return { p: 0, why };
  if (p.alive) {
    const live = a.members.map((id) => s.persons[id]).filter((x) => x?.alive);
    const tr = live.length ? live.reduce((t, x) => t + (x.morale ?? 50), 0) / live.length : 50;
    const v = clamp(a.trust / 100 * 0.6 + tr / 100 * 0.4 + 0.1, 0.05, 0.95);
    why.push(F(l('Confiança da banda no selo ({t}) e moral ({m}).', 'Band trust in the label ({t}) and morale ({m}).'), { t: Math.round(a.trust), m: Math.round(tr) }));
    return { p: v, why };
  }
  const e = estate18(s, pid)!;
  const scope = k === 'holo_show' || k === 'holo_tour' || k === 'ghost' || k === 'avatar' ? 'hologram' : k === 'ai_album' ? 'voice_ai' : k === 'biopic' ? 'biopic' : null;
  if (scope && hasRight(s, a.id, scope)) return { p: 1, why: [l('Acordo de imagem em vigor cobre isso (Direitos de imagem).', 'An image deal in force covers this (Image rights).')] };
  if ((k === 'box' || k === 'remaster') && mine(a)) return { p: 1, why: [l('As masters são do selo: não precisa do espólio.', 'The masters belong to the label: no estate needed.')] };
  const m = majority(e);
  let v = m === 'cash' ? 0.75 : m === 'guard' ? 0.35 : 0.55;
  why.push(F(l('Postura dos herdeiros: {s}', 'Heirs\' stance: {s}'), { s: STANCE18[m] }));
  if (k === 'tribute') { v += 0.3; why.push(l('Homenagem: quase sempre aceita (+30%).', 'A tribute: almost always accepted (+30%).')); }
  if (k === 'box' || k === 'remaster') { v += 0.2; why.push(l('Relançamento cuidadoso (+20%).', 'Careful reissue (+20%).')); }
  if (k === 'ai_album' && style !== 'restore') { v -= 0.15; why.push(l('Clonar a voz assusta herdeiros (−15%).', 'Cloning the voice scares heirs (−15%).')); }
  if (k === 'biopic' && style === 'faithful') { v += 0.1; why.push(l('Filme fiel, com consultoria da família (+10%).', 'A faithful film, with family consultancy (+10%).')); }
  v += SHARE18[share].p; why.push(F(l('Proposta: {s} ({d})', 'Offer: {s} ({d})'), { s: SHARE18[share].name, d: `${SHARE18[share].p > 0 ? '+' : ''}${Math.round(SHARE18[share].p * 100)}%` }));
  const rep = s.player.reputation.artists / 250; v += rep; why.push(F(l('Sua reputação com artistas: +{d}%', 'Your reputation with artists: +{d}%'), { d: Math.round(rep * 100) }));
  if (e.unity < 40) { v -= 0.15; why.push(l('Herdeiros desunidos: um veta o que o outro aprova (−15%).', 'Divided heirs: one vetoes what the other approves (−15%).')); }
  if (e.wish === 'never' && e.known && scope) { v -= 0.3; why.push(l('Desejo do artista em vida: "nunca" (−30%).', 'The artist\'s wish in life: "never" (−30%).')); }
  if (e.wish === 'open' && e.known && scope) { v += 0.15; why.push(l('O artista dizia que gostaria de "tocar para sempre" (+15%).', 'The artist used to say they\'d love to "play forever" (+15%).')); }
  return { p: clamp(v, 0.03, 0.97), why };
}
export const STANCE18: Record<Heir18['st'], L> = { guard: l('guardiões do legado', 'legacy guardians'), cash: l('querem faturar', 'want to cash in'), artist: l('pensam como artistas', 'think like artists') };

/** Receita total esperada (centavos) — a interface mostra a faixa. */
export function forecast18(s: GameState, pid: string, k: PK18, style: Style18 = ''): { cost: number; rev: number; q: number; back: number } {
  const a = actOfP18(s, pid);
  const def = PK18[k];
  const cost = money(s, def.cost);
  const t = tech18(s.year, k);
  const b = back18(s, pid, k, style).v;
  if (!a) return { cost, rev: 0, q: t.q, back: b };
  const fans = a.fans.core + a.fans.active * 0.5 + a.fans.casual * 0.05;
  let r = def.roi * (0.35 + a.fame / 70 + Math.log10(1 + fans) / 9) * (0.55 + t.q * 0.6) * (1 - b / 170);
  if (k === 'holo_show' || k === 'holo_tour') r *= Math.max(0.65, (s.year <= 2014 ? 1.25 : 1) - post18(s).holoN * 0.05);
  if (k === 'tribute' && style === 'charity') r = 0;
  if (k === 'biopic' && style === 'glossy') r *= 1.3;
  if (k === 'vault' && !(s.vault?.[pid] ?? []).length) r *= 0.7;
  return { cost, rev: Math.round(cost * Math.max(0, r)), q: t.q, back: b };
}

// ---------------------------------------------------------------- iniciar e mês a mês

export function start18(s: GameState, pid: string, k: PK18, share: Share18 = 'fair', style: Style18 = ''): { ok: boolean; text: L; shot?: string } {
  const bl = block18(s, pid, k);
  if (bl) return { ok: false, text: bl };
  const st = post18(s);
  const p = s.persons[pid];
  const a = actOfP18(s, pid)!;
  const r = rng(s, `start:${k}:${pid}:${s.week}`);
  const e = p.alive ? null : estate18(s, pid);
  const firstAsk = e && !e.known;
  if (e) e.known = 1;
  const od = ask18(s, pid, k, share, style);
  if (!r.chance(od.p)) {
    st.cd[pid] = s.week + 12;
    const t = F(p.alive ? l('A banda de {a} recusa a proposta de {k}.', '{a}\'s band turns down the {k} pitch.') : l('O espólio de {p} recusa: {k}. Volte em 3 meses.', '{p}\'s estate refuses: {k}. Try again in 3 months.'), { a: a.name, p: p.name, k: PK18[k].name });
    log(s, t);
    return { ok: false, text: firstAsk && e!.wish !== 'unknown' ? F(l('{t} (Ao conversar, você descobriu o desejo do artista: {w}.)', '{t} (Talking to them, you learned the artist\'s wish: {w}.)'), { t, w: e!.wish === 'never' ? l('"nunca"', '"never"') : l('"tocar para sempre"', '"play forever"') }) : t };
  }
  const f = forecast18(s, pid, k, style);
  post(s, `post18:${k}:${pid}`, -f.cost, PK18[k].cost_cat, `${PK18[k].name.pt}: ${p.name}`);
  const sh = SHARE18[share].v;
  const pr: Proj18 = { id: `pj${++st.seq}`, k, pid, act: a.id, y: s.year, m: s.month, w: s.week, left: PK18[k].months, q: f.q, back: f.back, share: p.alive ? 0 : sh, style, cost: f.cost, rev: 0, tot: Math.round(f.rev * r.float(0.75, 1.25)), st: 'run', living: p.alive ? 1 : undefined };
  st.proj.push(pr);
  if (st.proj.length > 60) st.proj.splice(0, st.proj.length - 60);
  if (k === 'holo_show' || k === 'holo_tour') st.holoN += 1;
  if (e) { e.n += 1; e.last = s.year; }
  // vault: as inéditas reais saem pelo neural.ts (lançamento de verdade)
  if (k === 'vault' && (s.vault?.[pid] ?? []).length) {
    s.imageRights[pid] = { ...(s.imageRights[pid] ?? { personId: pid, feeAsk: 0 }), personId: pid, holder: 'player', consent: true } as (typeof s.imageRights)[string];
    posthumousRelease(s, r, pid, true);
  }
  const text = F(l('{k} de {p} aprovado(a). Custo {c}; polêmica prevista {b}/100; qualidade técnica {q}%.', '{k} for {p} approved. Cost {c}; expected controversy {b}/100; technical quality {q}%.'), { k: PK18[k].name, p: p.name, c: `$${Math.round(f.cost / 100).toLocaleString('en-US')}`, b: f.back, q: Math.round(f.q * 100) });
  log(s, text);
  const heir = e?.heirs.find((h) => h.pid)?.pid;
  const shotK = PK18[k].shot;
  if (shotK && shotK !== 'premiere') {
    const guests = playerActs(s).filter((id) => id !== a.id).map((id) => s.acts[id]?.members[0]).filter(Boolean).slice(0, 3).join(',');
    pr.shot = logShot18(s, { k: shotK, act: a.id, pid, city: a.city, text: F(l('{k}: {p}', '{k}: {p}'), { k: PK18[k].name, p: p.name }), d: { q: f.q, back: f.back, ...(heir ? { heir } : {}), ...(guests ? { guests } : {}) } }).id;
  }
  emitFact(s, { kind: k.startsWith('holo') || k === 'avatar' || k === 'ghost' ? 'hologram' : 'deal', actors: [a.id, 'player', pid], place: a.city, severity: clamp(25 + f.back / 2 + a.fame / 4, 20, 85), visibility: 'public', tags: ['posthumous', k, f.back >= 55 ? 'bad' : 'good'], text, src: 'post18' });
  if (f.back >= 55 && !p.alive) scandal(s, a.id, 'money', Math.round(f.back - 15), F(l('Fãs acusam {c} de explorar a memória de {p} ({k}).', 'Fans accuse {c} of exploiting {p}\'s memory ({k}).'), { c: s.config.companyName, p: p.name, k: PK18[k].name }), { tags: ['posthumous'] });
  return { ok: true, text, shot: pr.shot };
}

function legacyFx(s: GameState, pr: Proj18): number {
  let d = PK18[pr.k].legacy;
  if (pr.back >= 55) d -= 8; else if (pr.back <= 20) d += 2;
  if (pr.k === 'tribute' && pr.style === 'charity') d += 6;
  if (pr.k === 'biopic') d += pr.style === 'faithful' ? 5 : -3;
  if (pr.k === 'ai_album' && pr.style === 'restore') d += 4;
  return d;
}

registerSimHook('month', 'post18', (s) => {
  const st = post18(s);
  for (const pr of st.proj) {
    if (pr.st !== 'run') continue;
    const a = s.acts[pr.act];
    const e = pr.living ? null : st.est[pr.pid];
    const months = PK18[pr.k].months;
    let part = Math.round(pr.tot / months);
    if (e && e.dispute > s.week) part = Math.round(part * 0.5); // receitas em juízo
    if (part > 0) {
      post(s, `post18m:${pr.id}`, part, PK18[pr.k].rev, `${PK18[pr.k].name.pt} (${a?.name ?? ''})`);
      if (pr.share > 0) post(s, `post18e:${pr.id}`, -Math.round(part * pr.share), 'rights', `Repasse ao espólio (${a?.name ?? ''})`);
      pr.rev += part;
    }
    pr.left -= 1;
    if (pr.left > 0) continue;
    pr.st = 'done';
    const ld = legacyFx(s, pr);
    if (e) e.legacy = clamp(e.legacy + ld, 0, 100);
    if (a) {
      const lift = Math.max(0, ld) * 0.6 + (pr.k === 'biopic' ? 5 : pr.k === 'avatar' || pr.k === 'holo_tour' ? 3 : 1);
      a.fame = clamp(a.fame + lift * (pr.back >= 60 ? 0.4 : 1), 0, 100);
      a.momentum = clamp(a.momentum + (pr.k === 'biopic' ? 15 : 4), 0, 100);
      a.fans.casual += Math.round(pr.rev / 100 / 40);
      const a3 = countryOfCity(a.city);
      if (a3) nudge16(s, a.id, a3, lift * 0.5);
      if (pr.k === 'tribute') for (const id of playerActs(s)) if (id !== a.id && s.acts[id]) s.acts[id].fans.casual += 300;
      if (pr.living) for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.stress = clamp((p.stress ?? 0) - 8, 0, 100); }
    }
    const net = pr.rev - Math.round(pr.rev * pr.share) - pr.cost;
    const t = F(l('{k} de {a} termina: receita {r}, saldo {n}. Legado {d}.', '{k} for {a} wraps: revenue {r}, net {n}. Legacy {d}.'), { k: PK18[pr.k].name, a: a?.name ?? '?', r: `$${Math.round(pr.rev / 100).toLocaleString('en-US')}`, n: `${net < 0 ? '−' : '+'}$${Math.abs(Math.round(net / 100)).toLocaleString('en-US')}`, d: `${ld >= 0 ? '+' : ''}${ld}` });
    log(s, t);
    notify(s, t, net >= 0 ? 'good' : 'bad');
    if (pr.k === 'biopic' && a) pr.shot = logShot18(s, { k: 'premiere', act: a.id, pid: pr.pid, city: a.city, text: F(l('Estreia da cinebiografia de {a}', '{a} biopic premiere'), { a: a.name }), d: { box: pr.style === 'glossy' ? 0.75 : 0.55 } }).id;
    emitFact(s, { kind: 'deal', actors: [pr.act, 'player'], severity: 30, visibility: 'public', tags: ['posthumous', pr.k, net >= 0 ? 'good' : 'bad'], text: t, src: 'post18' });
  }
  // espólios: união, disputas (com Rng própria) e mediação
  for (const e of Object.values(st.est)) {
    e.unity = clamp(e.unity + 1, 0, 100);
    if (e.heirs.length < 2 || e.dispute > s.week) continue;
    const a = s.acts[e.act];
    if (exactHist(s) && a?.catalogNo) continue;
    const money_ = st.proj.some((x) => x.pid === e.pid && s.year - x.y <= 2);
    const r = rng(s, `disp:${e.pid}:${s.year}:${s.month}`);
    if (r.chance((money_ ? 0.05 : 0.008) * (100 - e.unity) / 50)) {
      e.dispute = s.week + 26; e.unity = clamp(e.unity - 15, 0, 100);
      const t = F(l('Herdeiros de {p} brigam na justiça pelo espólio: aprovações travadas e receitas em juízo.', '{p}\'s heirs fight in court over the estate: approvals frozen and revenue held in escrow.'), { p: s.persons[e.pid]?.name ?? '?' });
      log(s, t);
      emitFact(s, { kind: 'dispute', actors: [e.act, ...e.heirs.map((h) => h.pid).filter((x): x is string => !!x)], severity: 40, visibility: 'public', tags: ['posthumous', 'estate', 'law'], text: t, src: 'post18' });
      if (st.proj.some((x) => x.pid === e.pid && x.st === 'run')) notify(s, t, 'bad');
    }
  }
  altWorld18(s);
  chronicle18(s);
});

/** Mediação entre herdeiros (sua habilidade de negociar conta). */
export const mediateCost18 = (s: GameState) => money(s, 8000);
export function mediate18(s: GameState, pid: string): L {
  const e = estate18(s, pid);
  if (!e) return l('Sem espólio.', 'No estate.');
  if (s.player.cash < mediateCost18(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `post18med:${pid}`, -mediateCost18(s), 'legal', 'Mediação de espólio');
  const r = rng(s, `med:${pid}:${s.week}`);
  const neg = (s.player.reputation.institutional + s.player.reputation.artists) / 400;
  if (r.chance(clamp(0.35 + neg, 0.2, 0.85))) { e.dispute = 0; e.unity = clamp(e.unity + 25, 0, 100); return l('Acordo entre os herdeiros: a disputa acaba e o espólio volta a assinar.', 'The heirs settle: the dispute ends and the estate signs again.'); }
  e.unity = clamp(e.unity + 5, 0, 100);
  return l('A mediação não fechou acordo; os ânimos esfriaram um pouco.', 'Mediation reached no deal; tempers cooled a little.');
}

// ---------------------------------------------------------------- mundo: crônica real (exato) e história alternativa

export interface Real18 { y: number; m: number; t: L }
/** Fatos reais documentados (só no modo exato viram crônica, na data certa). */
export const REAL18: Real18[] = [
  { y: 1991, m: 5, t: l('Natalie Cole lança "Unforgettable" em dueto virtual com o pai, Nat King Cole (morto em 1965).', 'Natalie Cole releases "Unforgettable" as a virtual duet with her late father, Nat King Cole (d. 1965).') },
  { y: 1995, m: 10, t: l('Os Beatles lançam "Free as a Bird", feita sobre uma demo de John Lennon.', 'The Beatles release "Free as a Bird", built on a John Lennon demo.') },
  { y: 2009, m: 9, t: l('"This Is It", filme com os ensaios de Michael Jackson, estreia meses após sua morte.', '"This Is It", the film of Michael Jackson\'s rehearsals, opens months after his death.') },
  { y: 2012, m: 3, t: l('Tupac Shakur "aparece" em holograma no Coachella, ao lado de Snoop Dogg e Dr. Dre.', 'Tupac Shakur "appears" as a hologram at Coachella, alongside Snoop Dogg and Dr. Dre.') },
  { y: 2014, m: 4, t: l('Holograma de Michael Jackson canta "Slave to the Rhythm" no Billboard Music Awards.', 'A Michael Jackson hologram performs "Slave to the Rhythm" at the Billboard Music Awards.') },
  { y: 2018, m: 3, t: l('Roy Orbison sai em turnê como holograma ("In Dreams"), com orquestra ao vivo.', 'Roy Orbison tours as a hologram ("In Dreams"), with a live orchestra.') },
  { y: 2018, m: 9, t: l('"Piano & a Microphone 1983": primeiro disco do cofre de Prince.', '"Piano & a Microphone 1983": the first album from Prince\'s vault.') },
  { y: 2018, m: 9, t: l('"Bohemian Rhapsody", cinebiografia do Queen, estreia e devolve o catálogo às paradas.', '"Bohemian Rhapsody", the Queen biopic, opens and sends the catalog back up the charts.') },
  { y: 2019, m: 1, t: l('Turnê de holograma de Amy Winehouse é adiada após críticas e "desafios únicos".', 'Amy Winehouse hologram tour is postponed after criticism and "unique challenges".') },
  { y: 2020, m: 1, t: l('"An Evening with Whitney": turnê de holograma de Whitney Houston estreia no Reino Unido.', '"An Evening with Whitney": Whitney Houston\'s hologram tour opens in the UK.') },
  { y: 2022, m: 4, t: l('ABBA Voyage estreia em Londres: avatares digitais rejuvenescidos numa arena construída para isso.', 'ABBA Voyage opens in London: de-aged digital avatars in a purpose-built arena.') },
  { y: 2023, m: 10, t: l('"Now and Then": a última música dos Beatles usa IA para isolar a voz de Lennon de uma demo.', '"Now and Then": the last Beatles song uses AI to isolate Lennon\'s voice from a demo.') },
  { y: 2024, m: 4, t: l('"Back to Black", cinebiografia de Amy Winehouse, estreia entre críticas da família e dos fãs.', '"Back to Black", the Amy Winehouse biopic, opens amid criticism from fans.') },
];
function chronicle18(s: GameState): void {
  if (!exactHist(s)) return;
  const st = post18(s);
  for (const c of REAL18) {
    const k = `${c.y}-${c.m}-${c.t.en.slice(0, 12)}`;
    if (st.chron[k] || c.y !== s.year || c.m !== s.month) continue;
    st.chron[k] = 1;
    log(s, c.t);
    emitFact(s, { kind: 'statement', actors: [], severity: 45, visibility: 'public', tags: ['posthumous', 'chron', 'real'], text: c.t, src: 'post18' });
  }
}
/** História alternativa: selos rivais/espólios fazem hologramas e filmes de lendas mortas (Rng própria). */
function altWorld18(s: GameState): void {
  if (exactHist(s) || s.year < 1950) return;
  const st = post18(s);
  const r = rng(s, `alt:${s.year}:${s.month}`);
  if (!r.chance(0.03)) return;
  const pool = Object.values(s.acts).filter((a) => !mine(a) && a.fame >= 55 && a.members.some((id) => s.persons[id] && !s.persons[id].alive));
  if (!pool.length) return;
  const a = r.pick(pool);
  const k: PK18 = s.year >= 2018 && r.chance(0.5) ? 'holo_tour' : s.year >= 2012 && r.chance(0.4) ? 'holo_show' : 'biopic';
  const key = `${a.id}:${k}`;
  if (st.alt[key]) return;
  st.alt[key] = 1;
  const lb = Object.values(s.labels).filter((x) => x.active)[r.int(0, Math.max(0, Object.values(s.labels).filter((x) => x.active).length - 1))];
  a.fame = clamp(a.fame + (k === 'biopic' ? 5 : 2), 0, 100);
  const t = F(l('Nesta história: {l} lança {k} de {a}. Fãs se dividem.', 'In this history: {l} launches a {k} of {a}. Fans are split.'), { l: lb?.name ?? l('um espólio', 'an estate'), k: PK18[k].name, a: a.name });
  log(s, t);
  emitFact(s, { kind: k === 'biopic' ? 'release' : 'hologram', actors: [a.id, ...(lb ? [lb.id] : [])], severity: 40, visibility: 'public', tags: ['posthumous', 'alt', k], text: t, src: 'post18' });
}

// prêmio póstumo e Hall da Fama: o legado sobe
onFact('award', (s, f) => {
  for (const id of f.actors) {
    const a = s.acts[id];
    if (!a || !isEstate(s, a)) continue;
    for (const pid of a.members) { const e = estate18(s, pid); if (e) e.legacy = clamp(e.legacy + 4, 0, 100); }
  }
}, 'post18:award');
onFact('*', (s, f) => {
  if (f.src !== 'memory' || !f.tags.includes('mem:hall_of_fame')) return;
  for (const id of f.actors) { const a = s.acts[id]; if (a && isEstate(s, a)) for (const pid of a.members) { const e = estate18(s, pid); if (e) e.legacy = clamp(e.legacy + 8, 0, 100); } }
}, 'post18:hall');

export const projOf18 = (s: GameState, pid?: string): Proj18[] => post18(s).proj.filter((x) => !pid || x.pid === pid);
