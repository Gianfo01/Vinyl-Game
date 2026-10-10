// Rodada 15 — Sync por briefing: supervisores musicais pedem um clima (alegria, romance, tensão,
// melancolia, energia) para um meio da época (jingle de rádio, cinema, comercial de TV, novela,
// trailer, game, série de streaming, campanha de vídeo curto). Você escolhe QUAL faixa do catálogo
// oferecer; o encaixe é explicado (clima pelo som, qualidade, nostalgia, fama, desgaste) e um selo
// rival disputa a vaga. Ganhar paga pela ficha de direitos (master + edição) e pode ressuscitar
// uma faixa antiga nas paradas (o "efeito série"); comercial sem consultar artista purista custa confiança.

import { formatMoney } from '../../core/money';
import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { songStatus } from '../repertoire';
import { USE_BLOCK18, syncMasterShare } from '../rights';
import type { Act, GameState, Song } from '../types';
import { fmtL, hasTech, money, nextId, notify, playerActs, post, remember } from '../util';
import { addHype } from './hype12';
import { opine } from './persona13';

export type Mood15 = 'joy' | 'romance' | 'tension' | 'melancholy' | 'energy';
export type Medium15 = 'jingle' | 'film' | 'tvad' | 'novela' | 'trailer' | 'game' | 'series' | 'short';
export interface Brief15 {
  id: string; medium: Medium15; client: string; mood: Mood15; old: boolean; budget: number; until: number;
  rival: string; rv: number; status: 'open' | 'won' | 'lost' | 'asked' | 'refused'; song?: string; fit?: number; week: number;
}
export interface Sync15 { briefs: Brief15[]; used: Record<string, number[]>; log: [number, number, L][] }
declare module '../ext4' { interface Ext4 { sync15: Sync15 } }
const fresh = (): Sync15 => ({ briefs: [], used: {}, log: [] });
registerExt4('sync15', fresh);
export function sy15(s: GameState): Sync15 {
  const x = s.x4 as unknown as { sync15?: Sync15 };
  const st = (x.sync15 ??= fresh());
  st.briefs ??= []; st.used ??= {}; st.log ??= [];
  return st;
}

export const MOOD15: Record<Mood15, L> = {
  joy: l('alegria', 'joy'), romance: l('romance', 'romance'), tension: l('tensão', 'tension'), melancholy: l('melancolia', 'melancholy'), energy: l('energia', 'energy'),
};
interface MDef { name: L; from: number; to: number; tech?: string; budget: number; boost: number; ad?: 1; clients: string[]; old: number }
export const MEDIA15: Record<Medium15, MDef> = {
  jingle: { name: l('jingle de rádio', 'radio jingle'), from: 1925, to: 1975, budget: 1800, boost: 0.15, ad: 1, clients: ['Café Aurora', 'Sabonete Lírio', 'Rádio Vitrola'], old: 0.1 },
  film: { name: l('trilha de filme', 'film soundtrack'), from: 1930, to: 2100, budget: 9000, boost: 0.6, clients: ['Estúdios Aurora', 'Celuloide Filmes', 'Lumen Pictures'], old: 0.35 },
  tvad: { name: l('comercial de TV', 'TV commercial'), from: 1952, to: 2100, tech: 'tv_music', budget: 12000, boost: 0.3, ad: 1, clients: ['Corsa Motors', 'Cola Estrela', 'Banco Meridiano'], old: 0.3 },
  novela: { name: l('novela / série de TV', 'TV drama / soap'), from: 1960, to: 2100, tech: 'tv_music', budget: 8000, boost: 0.7, clients: ['Rede Globalis', 'Canal Sete', 'TV Horizonte'], old: 0.25 },
  trailer: { name: l('trailer de cinema', 'movie trailer'), from: 1985, to: 2100, budget: 15000, boost: 0.35, clients: ['Celuloide Filmes', 'Titan Pictures'], old: 0.4 },
  game: { name: l('trilha de game', 'video game soundtrack'), from: 1995, to: 2100, budget: 10000, boost: 0.5, clients: ['Pixelforge Games', 'Rockstride Interactive'], old: 0.3 },
  series: { name: l('série de streaming', 'streaming series'), from: 2012, to: 2100, tech: 'streaming', budget: 18000, boost: 1.1, clients: ['Netstream Séries', 'Halo+'], old: 0.6 },
  short: { name: l('campanha de vídeo curto', 'short-video campaign'), from: 2018, to: 2100, tech: 'short_video', budget: 7000, boost: 0.9, ad: 1, clients: ['Swoosh Athletics', 'Ápice Tecnologia'], old: 0.45 },
};

export const mediaNow = (s: GameState): Medium15[] =>
  (Object.keys(MEDIA15) as Medium15[]).filter((k) => { const m = MEDIA15[k]; return s.year >= m.from && s.year <= m.to && (!m.tech || hasTech(s, m.tech) || s.year >= m.from + 5); });

/** Clima da faixa: pelo som (energia, foco vocal, experimentação), pelo tema e pelo gênero. */
export function moodOf(song: Song): Mood15 {
  const v = song.sound?.v ?? [50, 50, 50, 50, 50, 50];
  const th = `${song.theme?.en ?? ''}`.toLowerCase();
  if (/love|wedding|reunion|summer/.test(th)) return 'romance';
  if (/grief|farewell|lost|break|homesick/.test(th)) return 'melancholy';
  if (/protest|war|censor/.test(th)) return 'tension';
  if (v[0] >= 68) return v[5] >= 60 ? 'tension' : 'energy';
  if (v[0] <= 35) return v[3] >= 55 ? 'romance' : 'melancholy';
  if (v[5] >= 65) return 'tension';
  return /pop|disco|samba|funk|dance|reggae|axé|ska/.test(song.genre) ? 'joy' : v[3] >= 60 ? 'romance' : 'joy';
}
const NEAR: Record<Mood15, Mood15[]> = { joy: ['energy', 'romance'], romance: ['joy', 'melancholy'], tension: ['energy', 'melancholy'], melancholy: ['romance', 'tension'], energy: ['joy', 'tension'] };

const relYear = (s: GameState, song: Song) => s.releases[song.releaseId ?? '']?.year ?? s.year;
const actOf = (s: GameState, song: Song): Act | undefined => s.acts[song.actId];

/** Sua parte de uma licença: master pela ficha de direitos + edição (se for sua). 0 = não pode oferecer. */
export function shareOf(s: GameState, song: Song): { master: number; pub: number } {
  const act = actOf(s, song);
  if (!act) return { master: 0, pub: 0 };
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const master = act.playerBand ? 0.75 : syncMasterShare(s, act, song.id, c?.party === 'player' ? 0.75 : 0);
  const pub = act.playerBand || (c?.party === 'player' && c.publishing) || s.ownPublishing ? 0.25 : 0;
  return { master, pub };
}

export interface Fit15 { v: number; why: [L, number][] }
/** Encaixe 0..1 da faixa no briefing, com cada motivo e seu peso. */
export function fitOf(s: GameState, b: Brief15, song: Song): Fit15 {
  const why: [L, number][] = [];
  const md = moodOf(song);
  const m = md === b.mood ? 0.35 : NEAR[b.mood].includes(md) ? 0.15 : -0.05;
  why.push([fmtL(l('Clima da faixa: {m}', 'Track mood: {m}'), { m: MOOD15[md] }), m]);
  why.push([l('Qualidade da gravação', 'Recording quality'), (song.q / 100) * 0.3]);
  const age = s.year - relYear(s, song);
  const ag = b.old ? (age >= 15 ? 0.2 : age >= 8 ? 0.1 : -0.08) : age <= 3 ? 0.08 : age >= 20 ? -0.05 : 0;
  if (ag) why.push([b.old ? fmtL(l('Pedem nostalgia; a faixa tem {n} anos', 'They want nostalgia; the track is {n} years old'), { n: age }) : fmtL(l('Pedem som atual; a faixa tem {n} anos', 'They want a current sound; the track is {n} years old'), { n: age }), ag]);
  const act = actOf(s, song);
  if (act) why.push([fmtL(l('Nome conhecido ({a})', 'Known name ({a})'), { a: act.name }), clamp(act.fame / 100, 0, 1) * 0.12]);
  const used = (sy15(s).used[song.id] ?? []).filter((y) => s.year - y < 4).length;
  if (used) why.push([fmtL(l('Desgaste: já licenciada {n}× em 4 anos', 'Overexposed: licensed {n}× in 4 years'), { n: used }), -0.15 * used]);
  const ag2 = s.player.staff.filter((x) => x.role === 'sync').reduce((t, x) => Math.max(t, x.skill), 0);
  if (ag2) why.push([l('Seu agente de sync conhece o supervisor', 'Your sync agent knows the supervisor'), ag2 / 100 * 0.12]);
  if (song.instrumental && (b.medium === 'game' || b.medium === 'trailer')) why.push([l('Instrumental: cabe sob diálogo e ação', 'Instrumental: sits under dialogue and action'), 0.08]);
  const v = clamp(why.reduce((t, x) => t + x[1], 0), 0, 1);
  return { v: Math.round(v * 100) / 100, why };
}

/** Faixas que você pode oferecer (lançadas e com direitos), da que mais encaixa para a que menos. */
export function candidates(s: GameState, b: Brief15, max = 8): { song: Song; fit: Fit15; share: number }[] {
  const out: { song: Song; fit: Fit15; share: number }[] = [];
  for (const id of playerActs(s)) for (const sid of s.acts[id]?.songs ?? []) {
    const song = s.songs[sid];
    if (!song || songStatus(s, song) !== 'released') continue;
    if (USE_BLOCK18.fn?.(s, [song.id], 'sync')) continue; // r18: disputa/autorização pendente
    const sh = shareOf(s, song);
    if (sh.master + sh.pub <= 0) continue;
    out.push({ song, fit: fitOf(s, b, song), share: sh.master + sh.pub });
  }
  return out.sort((a, c) => c.fit.v - a.fit.v).slice(0, max);
}

export const feeOf = (s: GameState, b: Brief15, fit: number): number => money(s, b.budget * (0.6 + fit * 0.6));
/** Artista que pode se opor a publicidade: purista ou com controle criativo e pouca confiança. */
export function objects(s: GameState, song: Song, b: Brief15): boolean {
  if (!MEDIA15[b.medium].ad) return false;
  const act = actOf(s, song);
  if (!act || act.playerBand) return false;
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  return act.members.some((id) => s.persons[id]?.traits.includes('purist')) || (!!c?.creativeControl && act.trust < 45);
}

const logIt = (s: GameState, t: L) => { const st = sy15(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 24) st.log.length = 24; };

/** Oferece a faixa. ask = consulta o artista antes (pode recusar, mas não há ressentimento). */
export function pitch15(s: GameState, briefId: string, songId: string, ask = false): { ok: boolean; text: L } {
  const st = sy15(s);
  const b = st.briefs.find((x) => x.id === briefId && x.status === 'open');
  const song = s.songs[songId];
  if (!b || b.until < s.week) return { ok: false, text: l('Briefing encerrado.', 'Brief closed.') };
  if (!song || !candidates(s, b, 999).some((c) => c.song.id === songId)) return { ok: false, text: l('Faixa indisponível para sync (não lançada ou sem direitos).', 'Track not available for sync (unreleased or no rights).') };
  const act = actOf(s, song)!;
  const r = Rng.fromSeed(`${s.config.seed}:sync15:${b.id}:${songId}`);
  const obj = objects(s, song, b);
  if (ask && obj && r.chance(0.55 - act.trust / 300)) {
    b.status = 'refused';
    act.trust = clamp(act.trust + 3, 0, 100);
    const t = fmtL(l('{a} vetou "{t}" no {m}: não quer a música vendendo produto. Gostou de ter sido consultado (+confiança).', '{a} vetoed "{t}" for the {m}: no selling products with it. Appreciated being asked (+trust).'), { a: act.name, t: song.title, m: MEDIA15[b.medium].name });
    logIt(s, t);
    return { ok: false, text: t };
  }
  const fit = fitOf(s, b, song).v;
  b.song = songId; b.fit = fit;
  const roll = fit * r.float(0.85, 1.15);
  const rival = s.labels[b.rival]?.name ?? l('outro selo', 'another label').pt;
  if (roll < b.rv) {
    b.status = 'lost';
    const t = fmtL(l('{c} escolheu a faixa de {r} para o {m}: encaixe {y}% contra o seu {x}%. Clima e nostalgia pesam mais que fama.', '{c} picked {r}\'s track for the {m}: fit {y}% vs your {x}%. Mood and nostalgia matter more than fame.'), { c: b.client, r: rival, m: MEDIA15[b.medium].name, y: Math.round(b.rv * 100), x: Math.round(roll * 100) });
    logIt(s, t);
    return { ok: false, text: t };
  }
  b.status = 'won';
  const sh = shareOf(s, song);
  const fee = feeOf(s, b, fit);
  const mine = Math.round(fee * (sh.master + sh.pub));
  post(s, `sync15:${b.id}`, mine, 'sync', `${b.client} — "${song.title}"`);
  if (!act.playerBand) act.cash += fee - mine;
  (st.used[song.id] ??= []).push(s.year);
  const M = MEDIA15[b.medium];
  const rel = s.releases[song.releaseId ?? ''];
  let revived = false;
  if (rel) {
    if (!rel.live && s.year - rel.year >= 3) { rel.live = true; rel.week = s.week - 53; rel.appeal *= 0.2; revived = true; }
    rel.appeal *= 1 + M.boost * (0.5 + fit);
  }
  act.fans.casual += Math.round(fee / money(s, 3) * M.boost);
  addHype(s, `a:${act.id}`, 'sync15', fmtL(l('Faixa em {m}', 'Track in a {m}'), { m: M.name }), Math.round(4 + M.boost * 8));
  const extra: L[] = [];
  if (obj && !ask) {
    act.trust = clamp(act.trust - 8, 0, 100);
    const f = s.fandoms[act.id];
    if (f) f.superfans = Math.round(f.superfans * 0.94);
    for (const id of act.members) opine(s, `p:${id}`, -8, fmtL(l('vendeu "{t}" para publicidade sem me consultar.', 'sold "{t}" to advertising without asking me.'), { t: song.title }));
    extra.push(l('O artista soube pela TV e ficou furioso (−confiança, superfãs se dizem traídos).', 'The artist found out from TV and is furious (−trust, superfans feel betrayed).'));
  }
  extra.push(l('Nas próximas semanas a faixa vende mais nas paradas e os shows do artista atraem público novo (efeito some em ~3 meses).', 'Over the next weeks the track sells more on the charts and the act\'s shows draw new crowds (fades in ~3 months).'));
  if (revived) extra.push(fmtL(l('"{t}" ({y}) volta às lojas e às paradas.', '"{t}" ({y}) returns to stores and charts.'), { t: song.title, y: rel!.year }));
  const text = fmtL(l('{c} fechou "{t}" ({a}) para o {m}: {f} para você. {x}', '{c} licensed "{t}" ({a}) for the {m}: {f} to you. {x}'),
    { c: b.client, t: song.title, a: act.name, m: M.name, f: { pt: formatMoney(mine, 'pt-BR'), en: formatMoney(mine, 'en-US') }, x: { pt: extra.map((e) => e.pt).join(' '), en: extra.map((e) => e.en).join(' ') } });
  logIt(s, text);
  notify(s, text, 'good');
  remember(s, 'sync15', fmtL(l('"{t}" toca em {m} de {c}.', '"{t}" plays in a {m} by {c}.'), { t: song.title, m: M.name, c: b.client }), { actId: act.id, important: revived });
  return { ok: true, text };
}

/** Briefings do mês: mais pedidos com catálogo maior, reputação comercial e agente de sync. */
export function syncMonth15(s: GameState): void {
  const st = sy15(s);
  for (const b of st.briefs) if (b.status === 'open' && b.until < s.week) b.status = 'lost';
  st.briefs = st.briefs.filter((b) => b.status === 'open' || s.week - b.until < 12).slice(-14);
  const mine = playerActs(s).reduce((t, id) => t + (s.acts[id]?.songs.filter((x) => s.songs[x]?.releaseId).length ?? 0), 0);
  if (mine < 2) return;
  const r = Rng.fromSeed(`${s.config.seed}:sync15:${s.year}:${s.month}`);
  const media = mediaNow(s);
  if (!media.length) return;
  const n = (r.chance(clamp(0.25 + mine / 80 + s.player.reputation.commercial / 300 + (s.player.staff.some((x) => x.role === 'sync') ? 0.25 : 0), 0, 0.9)) ? 1 : 0) + (r.chance(0.12) ? 1 : 0);
  const rivals = Object.values(s.labels).filter((x) => x.active);
  for (let i = 0; i < n && st.briefs.filter((b) => b.status === 'open').length < 4; i++) {
    const medium = r.pick(media);
    const M = MEDIA15[medium];
    const rv = rivals.length ? r.pick(rivals) : undefined;
    st.briefs.push({ id: nextId(s, 'sb'), medium, client: r.pick(M.clients), mood: r.pick(Object.keys(MOOD15) as Mood15[]), old: r.chance(M.old), budget: Math.round(M.budget * r.float(0.7, 1.4)), until: s.week + 6, rival: rv?.id ?? '', rv: Math.round(r.float(0.36, 0.74) * 100) / 100, status: 'open', week: s.week });
  }
}

export const openBriefs = (s: GameState): Brief15[] => sy15(s).briefs.filter((b) => b.status === 'open' && b.until >= s.week);

registerSimHook('month', 'sync15', (s) => syncMonth15(s));
