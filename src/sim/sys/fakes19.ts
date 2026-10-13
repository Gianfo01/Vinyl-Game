// Rodada 19 (Frente 9.11, onda 3 — T9) — FRAUDES, SÓSIAS E BANDAS-FANTASMA (`fakes19`).
//  • Dublagem/voz-fantasma: um ato canta com a voz de um cantor de estúdio escondido (Milli Vanilli, 1990). Rende apelo
//    agora; o RISCO cresce com a fama, cada playback na TV e o tempo; um cantor esquecido pode ameaçar contar. Exposto →
//    `lipsync_exposed` (escândalo, reembolsos, fãs) e `award_revoked` (prêmios cassados).
//  • Bandas-fantasma: um promotor põe na estrada uma banda falsa usando o nome de um ato famoso que sumiu (o falso Fleetwood
//    Mac de 1974) ou "de uma cena" que virou febre (consome `scene_boom`/`zine_scene`; acaba no `scene_bust`). Dono do nome:
//    processar, licenciar ou ignorar. Cada banda-fantasma pressiona o mercado; com 3, passa uma LEI (`law`, tag truth_ads)
//    que corta o golpe — fim da cadeia 6 (fanzine → cena → corrida do ouro → fantasmas → lei).
//  • Voz de IA não autorizada (2020+): `ai_voice_fake` (ouve o deepfake do ai18 e cria os do mundo) → lei de voz (ELVIS Act).
//  • Despedida falsa do tribute19 (`fake_farewell`) conta como propaganda enganosa (pressão por lei).
// Modo exato: nenhum ato real é fraudado por sorteio; só a crônica documentada (Milli Vanilli 1990; o falso Fleetwood Mac
// 1974; leis de 2006 e 2024). Pessoas reais nunca viram autoras de crime inventado.

import { Rng, clamp } from '../../core/rng';
import { CITIES, cityById, familyOf, genreById, l, type L, type MarketId } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerConseq18 } from '../decide18';
import type { EventDef } from '../events';
import { registerExplain, type WhyPart } from '../explain18';
import { deferEvents, registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { scaleFans19 } from '../fandom19';
import { histMode } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post, remember } from '../util';
import { headline19 } from './factlink19';
import { LINKS18, lk18 } from './links18';
import { actsNow27 } from '../tickcache27';

export interface Lip19 { act: string; since: number; risk: number; by: 'player' | 'npc'; exp?: number; hush?: number; mimes: number; end?: number }
export interface Ghost19 { id: string; name: string; of?: string; city: string; since: number; k: 'name' | 'scene'; g?: string; end?: number; why?: L; lic?: 1; court?: number; asked?: 1 }
export interface Fk19 {
  lip: Lip19[]; gb: Ghost19[];
  /** pressão por lei por mercado (bandas-fantasma, despedidas falsas) e por voz de IA */
  pr: Record<string, number>; ai: Record<string, number>;
  /** ano da lei por mercado: truth in advertising (t:mk) e voz (v:mk) */
  law: Record<string, number>;
  rev: [number, string, number][];
  /** cenas quentes (cidade|gênero → semana final) que atraem fantasmas */
  hot: Record<string, number>;
  real: Record<string, 1>; whis: number;
  log: [number, number, L][]; n: Record<string, number>; seq: number;
}
declare module '../ext4' { interface Ext4 { fk19: Fk19 } }
const fresh = (): Fk19 => ({ lip: [], gb: [], pr: {}, ai: {}, law: {}, rev: [], hot: {}, real: {}, whis: 0, log: [], n: {}, seq: 0 });
registerExt4('fk19', fresh);
export function fk19(s: GameState): Fk19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.fk19 ??= fresh()) as Fk19;
  const f = fresh();
  for (const k of Object.keys(f) as (keyof Fk19)[]) (st as unknown as Record<string, unknown>)[k] ??= f[k];
  return st;
}
const N = (pt: string, en: string): L => l(pt, en);
const logF = (s: GameState, t: L) => { const st = fk19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const cnt = (s: GameState, k: string) => { const n = fk19(s).n; n[k] = (n[k] ?? 0) + 1; };
export const mineAct = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const exact = (s: GameState) => histMode(s) === 'strict';
/** ato real protegido: no modo exato, nada inventado com gente real */
const shielded = (s: GameState, a: Act) => exact(s) && !!a.catalogNo && !mineAct(s, a);
const mkOf = (city?: string): MarketId => (cityById[city ?? '']?.market ?? 'na') as MarketId;

// ================================================================ dublagem / voz-fantasma
export const lipOf19 = (s: GameState, actId: string): Lip19 | undefined => fk19(s).lip.find((x) => x.act === actId && !x.exp && !x.end);
/** Chance por mês de a fraude vir à tona (0..0,25). */
export const lipOdds19 = (x: Lip19): number => clamp((x.risk - 15) / 400, 0, 0.25);
export function lipRisk19(s: GameState, actId: string): { v: number; parts: WhyPart[] } {
  const x = fk19(s).lip.find((y) => y.act === actId && !y.exp);
  const a = s.acts[actId];
  if (!x || !a) return { v: 0, parts: [] };
  const months = Math.max(0, Math.round((s.week - x.since) / 4.35));
  return { v: x.risk, parts: [
    { label: N('Meses de esquema', 'Months of the scheme'), value: months, fmt: 'num' },
    { label: N('Fama (mais olhos, mais risco)', 'Fame (more eyes, more risk)'), value: Math.round(a.fame), fmt: 'num' },
    { label: N('Playbacks na TV', 'TV playbacks'), value: x.mimes, fmt: 'num' },
    ...(x.hush ? [{ label: N('Silêncio comprado', 'Silence bought'), value: -25, fmt: 'signed' as const, tone: 'good' as const }] : []),
    { label: N('Chance de vir à tona neste mês', 'Chance it comes out this month'), value: lipOdds19(x), fmt: 'pct' },
  ] };
}
/** Playback na TV: só pesa se houver voz-fantasma (aparecer muito dublando é onde a fita pula). */
export function mimeRisk19(s: GameState, actId: string, n: number): void { const x = lipOf19(s, actId); if (x) { x.risk = clamp(x.risk + n, 0, 100); x.mimes++; } }
/** Começa o esquema (selo do jogador). */
export function startLip19(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a || !mineAct(s, a)) return N('Só atos seus.', 'Only your acts.');
  if (lipOf19(s, actId)) return N('Já existe uma voz-fantasma.', 'A ghost voice is already in place.');
  fk19(s).lip.push({ act: actId, since: s.week, risk: 8, by: 'player', mimes: 0 });
  cnt(s, 'lip'); logF(s, fmtL(N('{a} passa a gravar com uma voz-fantasma de estúdio.', '{a} starts recording with a hidden studio voice.'), { a: a.name }));
  return null;
}
/** Encerra: confessar (controle de danos) ou parar em silêncio (o risco esfria, mas não some). */
export function endLip19(s: GameState, actId: string, how: 'confess' | 'quiet'): L {
  const x = lipOf19(s, actId); const a = s.acts[actId];
  if (!x || !a) return N('Nada a encerrar.', 'Nothing to end.');
  if (how === 'confess') { expose19(s, x, 'confess'); return N('Confissão pública: o golpe dói menos quando sai da sua boca.', 'Public confession: it hurts less when it comes from your own mouth.'); }
  x.end = s.week; x.risk = Math.round(x.risk * 0.6);
  return N('A voz-fantasma sai do estúdio. O risco esfria, mas o cantor ainda sabe de tudo.', 'The ghost voice leaves the studio. The risk cools, but the singer still knows everything.');
}
/** Vem à tona: escândalo, reembolsos, fãs e prêmios cassados. */
export function expose19(s: GameState, x: Lip19, how: 'leak' | 'confess' | 'stage' | 'real' = 'leak', text?: L): Fact | null {
  // 'real' = crônica documentada: o fato entra sem escândalo inventado
  const a = s.acts[x.act];
  if (!a || x.exp) return null;
  x.exp = s.week; cnt(s, 'exposed');
  const t = text ?? fmtL(how === 'confess' ? N('{a} confessa: as vozes dos discos eram de cantores de estúdio.', '{a} confesses: the voices on the records were session singers.')
    : how === 'stage' ? N('O playback de {a} trava ao vivo e repete a mesma frase: os dois nunca cantaram nos discos.', '{a}\'s playback jams live and repeats the same line: they never sang on the records.')
      : N('Um cantor de estúdio revela: era a voz dele nos discos de {a}.', 'A session singer reveals: it was his voice on {a}\'s records.'), { a: a.name });
  return emitFact(s, { kind: 'lipsync_exposed', actors: [a.id, ...(x.by === 'player' ? ['player'] : a.owner && s.labels[a.owner] ? [a.owner] : [])], place: a.city, severity: how === 'confess' ? 50 : 65, visibility: 'public', tags: ['fakes19', 'fraud', how], src: 'fakes19', text: t });
}
onFact('lipsync_exposed', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  const conf = f.tags.includes('confess');
  if (!f.tags.includes('real')) scandal(s, a.id, 'conduct', conf ? 35 : 55, [f.id], { tags: ['fakes19'] });
  scaleFans19(a, conf ? -12 : -25);
  a.momentum = clamp(a.momentum - 20, -100, 100);
  if (mineAct(s, a)) post(s, `fk19ref:${a.id}:${s.week}`, -money(s, (conf ? 2000 : 4000) + a.fame * 150), 'legal', `Reembolsos: dublagem de ${a.name}`);
  headline19(s, f.text, 3);
  remember(s, 'fakes19', f.text, { important: true, actId: a.id });
  logF(s, f.text);
  // prêmios dos últimos 5 anos são cassados
  const won = s.awards.filter((w) => w.actId === a.id && s.year - w.year <= 5);
  if (won.length) {
    s.awards = s.awards.filter((w) => !won.includes(w));
    a.awards = Math.max(0, a.awards - won.length);
    const byP = won.filter((w) => w.byPlayer).length; if (byP) s.player.stats.awards = Math.max(0, s.player.stats.awards - byP);
    emitFact(s, { kind: 'award_revoked', actors: [a.id], place: a.city, severity: 45, visibility: 'public', tags: ['fakes19', 'awards'], src: 'fakes19', cause: [f.id], data: { n: won.length },
      text: fmtL(N('A academia cassa {n} prêmio(s) de {a} ({w}).', 'The academy revokes {n} award(s) from {a} ({w}).'), { n: won.length, a: a.name, w: won.map((w) => w.name).slice(0, 2).join(', ') }) });
  }
}, 'fakes19:expose');
onFact('award_revoked', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  a.fame = clamp(a.fame - 3, 0, 100);
  fk19(s).rev.unshift([s.year, a.id, Number(f.data?.n ?? 1)]);
  headline19(s, f.text, 2);
  for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.stress = clamp(p.stress + 8, 0, 100); }
}, 'fakes19:revoke');
registerMod('appeal', 'fakes19', (s, v, c) => {
  const a = c.release ? s.acts[c.release.actId] : c.act;
  if (!a) return null;
  const x = lipOf19(s, a.id);
  return x ? { value: v * 1.1, label: N('Voz-fantasma de estúdio', 'Hidden studio voice') } : null;
});

// ================================================================ bandas-fantasma
const absent = (s: GameState, a: Act) => a.status === 'split' || a.status === 'retired' || a.status === 'hiatus' || (a.members.length > 0 && a.members.every((m) => !s.persons[m]?.alive));
export const ghostsLive19 = (s: GameState): Ghost19[] => fk19(s).gb.filter((g) => !g.end);
export const lawIn19 = (s: GameState, mk: string, k: 't' | 'v' = 't'): boolean => fk19(s).law[`${k}:${mk}`] !== undefined;
const bigCity = (r: Rng, mk: MarketId): string => { const cs = CITIES.filter((c) => c.market === mk); return cs.length ? r.pick(cs).id : 'new_york'; };
export function spawnGhost19(s: GameState, r: Rng, o: { of?: Act; city?: string; g?: string; k: 'name' | 'scene' }): Ghost19 | null {
  const st = fk19(s);
  if (ghostsLive19(s).length >= 10) return null;
  const a = o.of;
  if (a && (shielded(s, a) || st.gb.some((g) => g.of === a.id && !g.end))) return null;
  const city = o.city ?? bigCity(r, mkOf(a?.city));
  const gname = o.g ? genreById[o.g]?.name ?? o.g : '';
  const name = a ? a.name : fmtL(N('{g} All-Stars de {c}', '{c} {g} All-Stars'), { g: gname, c: cityById[city]?.name ?? city }).pt;
  const g: Ghost19 = { id: `gb${++st.seq}`, name, of: a?.id, city, since: s.week, k: o.k, g: o.g };
  st.gb.push(g); if (st.gb.length > 60) st.gb.splice(0, st.gb.length - 60);
  cnt(s, 'ghost');
  const t = a ? fmtL(N('Uma banda falsa excursiona como "{n}" em {c} — nenhum integrante original no palco.', 'A fake band tours as "{n}" in {c} — not one original member on stage.'), { n: name, c: cityById[city]?.name ?? city })
    : fmtL(N('Na febre da cena, "{n}" aparece do nada dizendo ser a banda que criou o som — ninguém da cena a conhece.', 'In the scene\'s gold rush, "{n}" appears out of nowhere claiming to have invented the sound — nobody in the scene knows them.'), { n: name });
  emitFact(s, { kind: 'ghost_band', actors: a ? [a.id] : [], place: city, severity: 35, visibility: 'public', tags: ['fakes19', 'fraud', o.k], src: 'fakes19', text: t, data: { gb: g.id, ...(o.g ? { g: o.g } : {}) } });
  if (a && mineAct(s, a) && !a.playerBand) {
    g.asked = 1;
    pushInbox18(s, 'fk19_ghost', { from: cityById[city]?.name.pt ?? city, subject: fmtL(N('Banda falsa usando o nome de {a}', 'A fake band using {a}\'s name'), { a: a.name }),
      body: fmtL(N('{t} Processar (chance {p}%, sentença em ~3 meses), licenciar como "tributo oficial" (renda pequena, fraude vira produto) ou ignorar (fãs se confundem).', '{t} Sue ({p}% chance, ruling in ~3 months), license it as an "official tribute" (small income, the fraud becomes a product) or ignore (fans get confused).'), { t, p: Math.round(suitOdds19(s, g) * 100) }),
      ref: { gb: g.id }, actions: [{ id: 'sue', label: N('Processar', 'Sue') }, { id: 'license', label: N('Licenciar', 'License') }, { id: 'ignore', label: N('Ignorar', 'Ignore') }], weeks: 6 });
  }
  return g;
}
export function suitOdds19(s: GameState, g: Ghost19): number {
  const a = g.of ? s.acts[g.of] : undefined;
  return clamp(0.5 + (lawIn19(s, mkOf(g.city)) ? 0.3 : 0) + (a?.fame ?? 0) / 400, 0.3, 0.92);
}
export const suitCost19 = (s: GameState) => money(s, 1500);
export function ghostAct19(s: GameState, id: string, how: 'sue' | 'license' | 'ignore'): L {
  const g = fk19(s).gb.find((x) => x.id === id);
  if (!g || g.end) return N('A banda falsa já sumiu.', 'The fake band is already gone.');
  if (how === 'sue') { post(s, `fk19sue:${g.id}`, -suitCost19(s), 'legal', `Processo: banda falsa "${g.name}"`); g.court = s.week + 13; return N('Processo aberto; a sentença sai em cerca de três meses (Calendário).', 'Lawsuit filed; the ruling comes in about three months (Calendar).'); }
  if (how === 'license') { g.lic = 1; return N('Licenciada: a banda paga uma taxa e vira "tributo oficial".', 'Licensed: the band pays a fee and becomes an "official tribute".'); }
  return N('Você deixa a banda falsa em paz — por enquanto.', 'You leave the fake band alone — for now.');
}
registerInboxKind('fk19_ghost', { label: N('Banda falsa', 'Fake band'), cat: 'deals', icon: 'alert', prio: 2, goto: () => ({ area: 'fakes19' }),
  handle: (s, m, a) => ghostAct19(s, String(m.ref?.gb), a as 'sue' | 'license' | 'ignore') });
registerConseq18('ib:fk19_ghost:sue', { later: [{ in: [3, 5], p: 0.6, tone: 'mixed', hint: N('A sentença decide quem pode usar o nome.', 'The ruling decides who may use the name.'), fx: (f) => { f.rep('institutional', 1); return N('O processo contra a banda falsa virou notícia: o nome importa.', 'The suit against the fake band made news: names matter.'); } }] });
registerConseq18('ib:fk19_ghost:license', { later: [{ in: [3, 12], p: 0.5, tone: 'mixed', hint: N('Fãs puristas podem não gostar.', 'Purist fans may not like it.'), fx: (f) => { f.rep('artistic', -1).cash(600, 'Banda licenciada: taxa extra de turnê', 'licensing'); return N('A banda licenciada lotou cassinos; os puristas reclamaram do "tributo oficial".', 'The licensed band packed casinos; purists grumbled about the "official tribute".'); } }] });
registerConseq18('ib:fk19_ghost:ignore', { later: [{ in: [2, 8], p: 0.55, tone: 'bad', hint: N('Fãs compram ingresso achando que é a banda.', 'Fans buy tickets thinking it is the band.'), fx: (f) => { f.momentum(-3).rep('commercial', -1); return N('Fãs que viram a banda falsa reclamam do "show fraco" — e culpam o original.', 'Fans who saw the fake band complain about the "weak show" — and blame the original.'); } }] });
onFact('ghost_band', (s, f) => {
  const st = fk19(s), mk = mkOf(f.place);
  st.pr[mk] = (st.pr[mk] ?? 0) + (f.tags.includes('scene') ? 1.5 : 1);
  headline19(s, f.text, 1);
  logF(s, f.text);
  if (!exact(s) && st.pr[mk] >= 3 && !lawIn19(s, mk)) passLaw19(s, mk, 't', [f.id]);
}, 'fakes19:law');
/** Lei nova: propaganda enganosa (t) ou voz de IA (v). */
export function passLaw19(s: GameState, mk: string, k: 't' | 'v', cause?: string[], text?: L): void {
  const st = fk19(s); if (st.law[`${k}:${mk}`] !== undefined) return;
  st.law[`${k}:${mk}`] = s.year; cnt(s, k === 't' ? 'law_t' : 'law_v');
  const t = text ?? (k === 't' ? N('Lei nova: anunciar show com o nome de um grupo sem integrantes originais (ou licença) vira propaganda enganosa.', 'New law: advertising a show under a group\'s name without original members (or a licence) becomes false advertising.')
    : N('Lei nova: a voz de um artista passa a ser protegida contra clonagem por IA sem autorização.', 'New law: an artist\'s voice is now protected against unauthorised AI cloning.'));
  emitFact(s, { kind: 'law', actors: [], place: CITIES.find((c) => c.market === mk)?.id, severity: 55, visibility: 'public', tags: ['fakes19', k === 't' ? 'truth_ads' : 'voice_law', mk], src: 'fakes19', cause, text: t });
  headline19(s, t, 3);
  logF(s, t);
  lk18(s).log.unshift([s.week, k === 't' ? 'fakes19' : 'fakes19v', t]);
}

// ================================================================ voz de IA não autorizada
onFact('statement', (s, f) => {
  if (!f.tags.includes('deepfake')) return;
  const a = s.acts[f.actors[0]]; if (!a) return;
  emitFact(s, { kind: 'ai_voice_fake', actors: [a.id], place: a.city, severity: 40, visibility: 'public', tags: ['fakes19', 'ai', 'player'], src: 'fakes19', cause: [f.id], text: fmtL(N('Voz de {a} clonada por IA sem autorização.', '{a}\'s voice cloned by AI without permission.'), { a: a.name }) });
}, 'fakes19:deepfake');
onFact('ai_voice_fake', (s, f) => {
  const st = fk19(s), mk = mkOf(f.place);
  st.ai[mk] = (st.ai[mk] ?? 0) + 1; cnt(s, 'ai');
  const a = s.acts[f.actors[0]];
  if (a && !mineAct(s, a)) { a.fame = clamp(a.fame + 0.5, 0, 100); a.trust = clamp(a.trust - 2, 0, 100); }
  logF(s, f.text);
  if (!exact(s) && st.ai[mk] >= 3 && !lawIn19(s, mk, 'v')) passLaw19(s, mk, 'v', [f.id]);
}, 'fakes19:ai');
// despedida falsa (tribute19) também é propaganda enganosa
onFact('fake_farewell', (s, f) => { const st = fk19(s), mk = mkOf(f.place); st.pr[mk] = (st.pr[mk] ?? 0) + 0.5; }, 'fakes19:farewell');
// corrida do ouro (T6 scene_boom) e cena de fanzine (zines19) atraem bandas-fantasma; scene_bust encerra
const sceneKey = (f: Fact): string | null => { const g = String(f.data?.g ?? f.data?.genre ?? f.tags.find((t) => !!genreById[t]) ?? ''); return f.place && g ? `${f.place}|${g}` : null; };
onFact('scene_boom', (s, f) => { const k = sceneKey(f); if (k) fk19(s).hot[k] = s.week + 52; }, 'fakes19:boom');
onFact('zine_scene', (s, f) => { const k = sceneKey(f); if (k) fk19(s).hot[k] = Math.max(fk19(s).hot[k] ?? 0, s.week + 26); }, 'fakes19:zinescene');
onFact('scene_bust', (s, f) => {
  const k = sceneKey(f); const st = fk19(s);
  if (k) delete st.hot[k];
  for (const g of ghostsLive19(s)) if (g.k === 'scene' && g.city === f.place) { g.end = s.week; g.why = N('a febre da cena passou', 'the scene craze passed'); }
}, 'fakes19:bust');

// ================================================================ crônica real (modo exato; ou antes do início da partida)
interface RealFk { id: string; y: number; m: number; k: 'lip' | 'ghost' | 'ai' | 'law_t' | 'law_v'; act?: string; mk?: MarketId; text: L }
export const REAL_FK19: RealFk[] = [
  { id: 'fake_mac', y: 1974, m: 0, k: 'ghost', act: 'Fleetwood Mac', text: N('O empresário do Fleetwood Mac põe na estrada uma banda substituta com o nome do grupo, sem nenhum integrante; a briga pelo nome vai à justiça.', 'Fleetwood Mac\'s manager sends a substitute band on the road under the group\'s name, with none of its members; the fight over the name goes to court.') },
  { id: 'milli', y: 1990, m: 10, k: 'lip', act: 'Milli Vanilli', text: N('O produtor admite que a dupla não cantava nos discos; a academia cassa o prêmio de Artista Revelação (novembro de 1990).', 'The producer admits the duo did not sing on the records; the academy revokes their Best New Artist award (November 1990).') },
  { id: 'tima', y: 2006, m: 0, k: 'law_t', mk: 'na', text: N('Estados americanos começam a aprovar leis "Truth in Music Advertising" contra grupos vocais falsos que usam nomes de grupos famosos.', 'US states begin passing "Truth in Music Advertising" laws against fake vocal groups using famous groups\' names.') },
  { id: 'ai2023', y: 2023, m: 3, k: 'ai', text: N('Uma faixa com vozes de dois astros clonadas por IA viraliza e é retirada das plataformas a pedido da gravadora.', 'A track with two stars\' voices cloned by AI goes viral and is pulled from platforms at the label\'s request.') },
  { id: 'elvis_act', y: 2024, m: 2, k: 'law_v', mk: 'na', text: N('O Tennessee aprova a ELVIS Act: a voz do artista passa a ser protegida contra clonagem por IA (março de 2024).', 'Tennessee passes the ELVIS Act: an artist\'s voice is protected against AI cloning (March 2024).') },
];
function realChron(s: GameState): void {
  const st = fk19(s);
  for (const x of REAL_FK19) {
    if (st.real[x.id] || s.year < x.y || (s.year === x.y && s.month < x.m) || s.year - x.y > 1) continue;
    if (!exact(s) && x.y >= s.config.startYear) continue; // história alternativa: depois do início, nada é reencenado
    st.real[x.id] = 1;
    const a = x.act ? actsNow27(s).find((y) => y.name === x.act) : undefined;
    if (x.k === 'lip' && a) { const l9: Lip19 = { act: a.id, since: s.week - 100, risk: 100, by: 'npc', mimes: 0 }; st.lip.push(l9); expose19(s, l9, 'real', x.text); continue; }
    if (x.k === 'ghost') { emitFact(s, { kind: 'ghost_band', actors: a ? [a.id] : [], place: a?.city ?? 'london', severity: 35, visibility: 'public', tags: ['fakes19', 'name', 'real'], src: 'fakes19', text: x.text }); continue; }
    if (x.k === 'ai') { emitFact(s, { kind: 'ai_voice_fake', actors: [], place: 'new_york', severity: 40, visibility: 'public', tags: ['fakes19', 'ai', 'real'], src: 'fakes19', text: x.text }); continue; }
    if (x.mk) passLaw19(s, x.mk, x.k === 'law_t' ? 't' : 'v', undefined, x.text);
  }
}

// ================================================================ cartão: voz-fantasma oferecida ao selo
const ghostVoice: EventDef = {
  id: 'fk19_ghostvoice', cat: 'contract', tone: 'neutral', tags: ['fakes19'], cooldown: 36, weight: 0.35,
  find: (s, r) => {
    if (s.year < 1960 || !r.chance(0.04)) return null;
    const a = playerActs(s).map((id) => s.acts[id]).filter((x) => x && !x.playerBand && x.fame >= 15 && x.fame <= 70 && ['pop', 'rnb', 'electronic', 'hiphop'].includes(familyOf(x.genre)) && !lipOf19(s, x.id))
      .sort((x, y) => y.fame - x.fame)[0];
    return a ? { act: a.id } : null;
  },
  title: N('O produtor quer outra voz no disco de {act}', 'The producer wants another voice on {act}\'s record'),
  text: N('"{act} tem a imagem; a voz não segura." O produtor sugere um cantor de estúdio escondido nos discos — {act} só dublaria nos shows e na TV. Muita gente faz. Quando descobrem, é o fim.', '"{act} has the look; the voice can\'t carry it." The producer suggests a hidden session singer on the records — {act} would just mime on stage and TV. Lots of people do it. When it comes out, it is the end.'),
  options: [
    { id: 'ghost', label: N('Topar a voz-fantasma', 'Go with the ghost voice'), hint: N('Discos melhores agora (+10% de apelo); o risco cresce todo mês.', 'Better records now (+10% appeal); the risk grows every month.'), apply: (s, _r, c) => { startLip19(s, String(c.act)); } },
    { id: 'coach', label: N('Pagar aulas de canto', 'Pay for vocal coaching'), hint: N('Custo agora; voz melhora devagar.', 'Cost now; the voice improves slowly.'), apply: (s) => { post(s, `fk19coach:${s.week}`, -money(s, 1500), 'recording', 'Professor de canto'); } },
    { id: 'refuse', label: N('Recusar: a voz é dele(a)', 'Refuse: the voice is theirs'), hint: N('Nada agora; o artista sabe que você confiou.', 'Nothing now; the artist knows you trusted them.'), apply: () => {} },
  ],
};
registerConseq18('ev:fk19_ghostvoice:ghost', { now: N('Apelo +10% nos discos do ato enquanto durar.', '+10% appeal on the act\'s records while it lasts.'), later: [{ in: [6, 24], p: 0.45, tone: 'bad', hint: N('Segredo de estúdio tem muitas testemunhas.', 'A studio secret has many witnesses.'),
  when: (s, c) => !!lipOf19(s, String(c.act)),
  fx: (f) => { const x = f.act ? lipOf19(f.s, f.act.id) : undefined; if (x) x.risk = clamp(x.risk + 20, 0, 100); f.mood('stress', 10); return N('Um técnico de som começou a fazer perguntas sobre as sessões. O risco subiu.', 'A sound engineer started asking questions about the sessions. The risk went up.'); } }] });
registerConseq18('ev:fk19_ghostvoice:coach', { later: [{ in: [3, 9], p: 0.6, tone: 'good', hint: N('A voz pode crescer.', 'The voice may grow.'), fx: (f) => { f.mood('inspiration', 8).trust(3); return N('As aulas funcionaram: o ato canta melhor e confia mais no selo.', 'The lessons worked: the act sings better and trusts the label more.'); } }] });
registerConseq18('ev:fk19_ghostvoice:refuse', { later: [{ in: [2, 6], p: 0.5, tone: 'good', hint: N('O artista sabe quem bancou a voz dele.', 'The artist knows who backed their voice.'), fx: (f) => { f.trust(5); return N('O ato soube que o selo recusou a voz-fantasma: confiança em alta.', 'The act learned the label refused the ghost voice: trust is up.'); } }] });

// ================================================================ cantor ameaça contar
export function whistle19(s: GameState, actId: string, how: 'pay' | 'confess' | 'deny', r: Rng): L {
  const x = lipOf19(s, actId); const a = s.acts[actId];
  if (!x || !a) return N('O assunto morreu.', 'The matter died.');
  if (how === 'pay') {
    post(s, `fk19hush:${actId}:${s.week}`, -money(s, 3000 + a.fame * 60), 'legal', `Acordo de confidencialidade: ${a.name}`);
    x.risk = clamp(x.risk - 25, 0, 100); x.hush = s.week;
    grantHold(s, { holder: actId, target: 'player', kind: 'secret', strength: 45, text: fmtL(N('O cantor de estúdio sabe da voz-fantasma de {a}.', 'The session singer knows about {a}\'s ghost voice.'), { a: a.name }), src: 'fakes19' });
    return N('Silêncio comprado — por ora. Quem cala também guarda um trunfo.', 'Silence bought — for now. Whoever stays quiet also keeps leverage.');
  }
  if (how === 'confess') return endLip19(s, actId, 'confess');
  x.risk = clamp(x.risk + 10, 0, 100);
  if (r.chance(0.5)) { expose19(s, x, 'leak'); return N('Você negou; o cantor foi à imprensa com as fitas.', 'You denied it; the singer went to the press with the tapes.'); }
  return N('Você negou; o cantor recuou. Por enquanto.', 'You denied it; the singer backed down. For now.');
}
registerInboxKind('fk19_whistle', { label: N('Voz-fantasma', 'Ghost voice'), cat: 'decision', icon: 'alert', prio: 3, goto: () => ({ area: 'fakes19' }),
  handle: (s, m, a, r) => whistle19(s, String(m.ref?.act), a as 'pay' | 'confess' | 'deny', r) });
registerConseq18('ib:fk19_whistle:pay', { later: [{ in: [6, 24], p: 0.35, tone: 'bad', hint: N('Silêncio comprado pode ser renegociado.', 'Bought silence can be renegotiated.'), when: (s, c) => !!lipOf19(s, String(c.act ?? '')), fx: (f) => { f.cash(-1500, 'Acordo de confidencialidade: reajuste', 'legal'); return N('O cantor voltou pedindo mais pelo silêncio.', 'The singer came back asking more for silence.'); } }] });
registerConseq18('ib:fk19_whistle:confess', { later: [{ in: [6, 18], p: 0.5, tone: 'mixed', hint: N('Quem confessa pode ganhar uma segunda chance.', 'Those who confess may get a second chance.'), fx: (f) => { f.fans(4).rep('artistic', 1); return N('Depois da confissão, o ato voltou cantando com a própria voz — e parte dos fãs voltou junto.', 'After the confession, the act came back singing in its own voice — and some fans came back too.'); } }] });
registerConseq18('ib:fk19_whistle:deny', { later: [{ in: [2, 8], p: 0.4, tone: 'bad', hint: N('Negar é apostar contra as fitas.', 'Denying is betting against the tapes.'), fx: (f) => { f.rep('institutional', -2); return N('A negação ficou registrada: quando vier à tona, vai pior.', 'The denial is on record: when it comes out, it will be worse.'); } }] });

// ================================================================ mês
registerSimHook('month', 'fakes19', (s) => {
  const r = rng19(s, 'fk19', () => Rng.fromSeed(`${s.config.seed}|fk19|${s.week}`));
  const st = fk19(s);
  realChron(s);
  // 1) esquemas de voz-fantasma: risco, denúncia, exposição
  for (const x of st.lip) {
    if (x.exp) continue;
    const a = s.acts[x.act]; if (!a) { x.exp = s.week; continue; }
    if (x.end) { x.risk = Math.max(0, x.risk - 2); if (x.risk <= 0) { x.exp = s.week; continue; } }
    else { x.risk = clamp(x.risk + 1 + a.fame / 50, 0, 100); if (x.by === 'player') post(s, `fk19ses:${x.act}:${s.year}-${s.month}`, -money(s, 250), 'recording', `Voz de estúdio: ${a.name}`); }
    if (x.by === 'player' && !x.end && x.risk >= 40 && s.week - st.whis > 26) {
      st.whis = s.week;
      pushInbox18(s, 'fk19_whistle', { from: N('Cantor de estúdio', 'Session singer').pt, subject: fmtL(N('O cantor de {a} quer ser pago — ou vai falar', '{a}\'s singer wants to be paid — or will talk'), { a: a.name }),
        body: fmtL(N('A voz verdadeira dos discos de {a} cansou do anonimato. Pagar (risco −25, ele guarda um trunfo), confessar (escândalo menor, prêmios cassados) ou negar (50% de ele ir à imprensa já).', 'The real voice on {a}\'s records is tired of anonymity. Pay (risk −25, he keeps leverage), confess (smaller scandal, awards revoked) or deny (50% he goes to the press now).'), { a: a.name }),
        ref: { act: a.id }, actions: [{ id: 'pay', label: N('Pagar', 'Pay') }, { id: 'confess', label: N('Confessar', 'Confess') }, { id: 'deny', label: N('Negar', 'Deny') }], weeks: 4 });
    }
    if (r.chance(lipOdds19(x))) expose19(s, x, r.chance(0.3) ? 'stage' : 'leak');
  }
  // NPC: selos rivais também escondem vozes (só atos fictícios no modo exato)
  if (s.year >= 1960 && st.lip.filter((x) => !x.exp && x.by === 'npc').length < 3 && r.chance(0.02)) {
    const cands = actsNow27(s).filter((a) => !mineAct(s, a) && a.owner && s.labels[a.owner] && a.fame >= 30 && a.fame <= 75 && ['pop', 'rnb', 'electronic'].includes(familyOf(a.genre)) && !shielded(s, a) && !lipOf19(s, a.id) && a.status !== 'split' && a.status !== 'retired');
    if (cands.length) st.lip.push({ act: r.pick(cands).id, since: s.week, risk: 10, by: 'npc', mimes: 0 });
  }
  // 2) bandas-fantasma: nome de ato ausente, febre de cena
  if (s.year >= 1955) {
    const live = ghostsLive19(s);
    for (const g of live) {
      const a = g.of ? s.acts[g.of] : undefined, mk = mkOf(g.city);
      if (g.court && g.court <= s.week) {
        g.court = undefined;
        if (r.chance(suitOdds19(s, g))) { g.end = s.week; g.why = N('perdeu na justiça', 'lost in court'); post(s, `fk19won:${g.id}`, money(s, 2500), 'legal', `Indenização: banda falsa "${g.name}"`); emitFact(s, { kind: 'case_ruling', actors: ['player', ...(a ? [a.id] : [])], place: g.city, severity: 35, visibility: 'public', tags: ['good', 'fakes19'], src: 'fakes19', text: fmtL(N('A justiça proíbe a banda falsa "{n}" de usar o nome.', 'The court bars the fake band "{n}" from using the name.'), { n: g.name }) }); }
        else { post(s, `fk19lost:${g.id}`, -money(s, 1500), 'legal', `Custas: banda falsa "${g.name}"`); emitFact(s, { kind: 'case_ruling', actors: ['player', ...(a ? [a.id] : [])], place: g.city, severity: 30, visibility: 'public', tags: ['bad', 'fakes19'], src: 'fakes19', text: fmtL(N('A banda "{n}" ganha o processo: o nome não estava registrado naquele mercado.', '"{n}" wins the suit: the name was not registered in that market.'), { n: g.name }) }); }
        continue;
      }
      if (a && mineAct(s, a)) {
        if (g.lic) post(s, `fk19lic:${g.id}:${s.year}-${s.month}`, money(s, 400), 'licensing', `Licença: "${g.name}"`);
        else a.momentum = clamp(a.momentum - 0.5, -100, 100);
      }
      if (lawIn19(s, mk) && !g.lic && r.chance(0.25)) { g.end = s.week; g.why = N('a lei nova fechou o cerco', 'the new law closed in'); continue; }
      if (s.week - g.since > 30 * 4.35 || r.chance(0.03)) { g.end = s.week; g.why = N('a turnê acabou', 'the tour ended'); }
    }
    if (live.length < 10) {
      // nome famoso de quem sumiu
      const cands = actsNow27(s).filter((a) => a.fame >= 55 && absent(s, a) && !shielded(s, a) && !st.gb.some((g) => g.of === a.id && !g.end));
      for (const a of cands.slice(0, 40)) {
        const mk = mkOf(a.city);
        if (r.chance(0.008 * (a.fame / 60) * (lawIn19(s, mk) ? 0.3 : 1))) { spawnGhost19(s, r, { of: a, k: 'name' }); break; }
      }
      // febre de cena
      for (const [k, until] of Object.entries(st.hot)) {
        if (until < s.week) { delete st.hot[k]; continue; }
        const [city, g] = k.split('|');
        if (r.chance(0.12 * (lawIn19(s, mkOf(city)) ? 0.3 : 1))) {
          const lead = actsNow27(s).filter((a) => a.city === city && a.genre === g && a.fame >= 40 && !shielded(s, a)).sort((x, y) => y.fame - x.fame)[0];
          spawnGhost19(s, r, lead && !st.gb.some((x) => x.of === lead.id && !x.end) ? { of: lead, city, g, k: 'scene' } : { city, g, k: 'scene' });
          break;
        }
      }
    }
  }
  // 3) vozes de IA não autorizadas no mundo (2020+)
  if (s.year >= 2020 && r.chance(s.year >= 2023 ? 0.06 : 0.02)) {
    const cands = actsNow27(s).filter((a) => a.fame >= 60 && !mineAct(s, a) && !shielded(s, a));
    if (cands.length) {
      const a = r.pick(cands);
      if (!lawIn19(s, mkOf(a.city), 'v') || r.chance(0.3)) emitFact(s, { kind: 'ai_voice_fake', actors: [a.id], place: a.city, severity: 40, visibility: 'public', tags: ['fakes19', 'ai'], src: 'fakes19', text: fmtL(N('Uma faixa "inédita" de {a} viraliza — a voz foi gerada por IA, sem autorização.', 'An "unreleased" {a} track goes viral — the voice was AI-generated, without permission.'), { a: a.name }) });
    }
  }
  // as pressões esfriam devagar
  for (const k of Object.keys(st.pr)) st.pr[k] = Math.max(0, st.pr[k] - 0.04);
});

// ================================================================ calendário, porquê, conselheiro, ligações
registerDeadline('fakes19', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const g of ghostsLive19(s)) if (g.court && g.court >= from && g.court <= to) out.push({ id: `fakes19-court-${g.id}`, w: g.court, kind: 'court', t: fmtL(N('Sentença: banda falsa "{n}"', 'Ruling: fake band "{n}"'), { n: g.name }), tone: 'info', goto: { area: 'fakes19' } });
  for (const x of fk19(s).lip) if (x.by === 'player' && !x.exp && !x.end && x.risk >= 30) { const a = s.acts[x.act]; if (a) out.push({ id: `fakes19-lip-${x.act}`, w: Math.min(to, from + 4), w0: from, kind: 'other', tone: 'bad', t: fmtL(N('Voz-fantasma de {a}: risco {r}', '{a}\'s ghost voice: risk {r}'), { a: a.name, r: Math.round(x.risk) }), goto: { area: 'fakes19' } }); }
  return out;
});
registerExplain('fk19.risk', (s, c) => {
  const a = s.acts[String(c.a ?? '')]; if (!a) return null;
  const v = lipRisk19(s, a.id);
  return { title: fmtL(N('Risco da voz-fantasma de {a}', '{a}\'s ghost-voice risk'), { a: a.name }), value: v.v, fmt: 'num', parts: v.parts, note: N('Sobe 1 + fama/50 por mês e 4 por playback na TV; pagar silêncio tira 25. Acima de 15, cada ponto é 0,25% de chance por mês de vir à tona (máx. 25%).', 'Rises 1 + fame/50 a month and 4 per TV playback; paying for silence removes 25. Above 15, each point is a 0.25% monthly chance it comes out (max 25%).') };
});
registerExplain('fk19.suit', (s, c) => {
  const g = fk19(s).gb.find((x) => x.id === String(c.g ?? '')); if (!g) return null;
  const a = g.of ? s.acts[g.of] : undefined;
  return { title: N('Chance no processo contra a banda falsa', 'Odds against the fake band'), value: suitOdds19(s, g), fmt: 'pct', parts: [
    { label: N('Base (o nome é seu)', 'Base (the name is yours)'), value: 0.5, fmt: 'pct' },
    ...(lawIn19(s, mkOf(g.city)) ? [{ label: N('Lei de propaganda enganosa no mercado', 'False-advertising law in the market'), value: 0.3, fmt: 'pct' as const, tone: 'good' as const }] : []),
    { label: N('Fama do original', 'Fame of the original'), value: (a?.fame ?? 0) / 400, fmt: 'pct' }] };
});
registerAdvisorTip('fakes19', (s) => fk19(s).lip.filter((x) => x.by === 'player' && !x.exp && !x.end && x.risk >= 25).slice(0, 1).map((x) => ({
  id: `fk19-${x.act}`, level: 'warn' as const, score: 55,
  text: fmtL(N('A voz-fantasma de {a} está ficando arriscada.', '{a}\'s ghost voice is getting risky.'), { a: s.acts[x.act]?.name ?? '?' }),
  why: [fmtL(N('Risco {r}: {p}% por mês de vir à tona.', 'Risk {r}: {p}% a month that it comes out.'), { r: Math.round(x.risk), p: Math.round(lipOdds19(x) * 100) })], goto: { area: 'fakes19' },
  run: { label: N('Parar em silêncio', 'Stop quietly'), fn: (s2: GameState) => endLip19(s2, x.act, 'quiet') },
})));
if (!LINKS18.some((x) => x.id === 'fakes19')) LINKS18.push({ id: 'fakes19', a: N('Cenas em febre e bandas falsas', 'Scene crazes and fake bands'), b: N('Leis', 'Laws'), how: N('Na corrida do ouro de uma cena, bandas-fantasma aparecem; três num mercado e passa uma lei de propaganda enganosa que fecha o cerco.', 'In a scene\'s gold rush, ghost bands appear; three in one market and a false-advertising law passes that closes in on them.') });
if (!LINKS18.some((x) => x.id === 'fakes19v')) LINKS18.push({ id: 'fakes19v', a: N('Vozes de IA', 'AI voices'), b: N('Leis e direitos', 'Laws and rights'), how: N('Clones de voz sem autorização somam pressão; com três num mercado, a voz do artista vira direito protegido.', 'Unauthorised voice clones add pressure; with three in one market, the artist\'s voice becomes a protected right.') });

deferEvents<EventDef>([ghostVoice]);
export const FAKES19_EVENTS = ['fk19_ghostvoice'];
