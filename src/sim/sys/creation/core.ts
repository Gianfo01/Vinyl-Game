import { deferEvents } from '../../ext4';
// Criação (rodada 4): gênero × tema com tendências, receita sonora com efeitos, críticas no
// lançamento (cena), participações e duetos, compositores contratados e fantasmas, encomendas,
// domínio público e standards, remasterização, capa, videoclipe, trecho viral e divisões.

import { clamp, hashString, type Rng } from '../../../core/rng';
import { FAMILIES, MARKETS, familyOf, l, type FamilyId, type L, type MarketId } from '../../../data/world';
import { emitEvent, type EventDef } from '../../events';
import { queueCutscene, registerExt4, registerMod, registerSimHook } from '../../ext4';
import { reviewRelease } from '../../media';
import { personName } from '../../people';
import { scheduleRelease, songQ, availableFormats, suggestedPress } from '../../production';
import { songProfile } from '../../repertoire';
import type { Act, GameState, Release, Song } from '../../types';
import { fmtL, hasTech, money, nextId, notify, playerActs, post, remember } from '../../util';

// ------------------------------------------------------------------ estado

export interface Commission {
  id: string;
  kind: 'jingle' | 'film' | 'novela' | 'game' | 'anthem' | 'tv_theme';
  client: string;
  pay: number;
  minQ: number;
  due: number; // semana
  status: 'offered' | 'accepted' | 'done' | 'failed' | 'declined';
  actId?: string;
  songId?: string;
  week: number;
}

export interface Writer {
  id: string;
  name: string;
  skill: number;
  style: FamilyId;
  fee: number; // por mês
  ghost: boolean;
  songs: number;
  until: number; // semana
}

export interface Feature {
  id: string;
  songId: string;
  guestActId: string;
  fee: number;
  share: number;
  status: 'pending' | 'done' | 'refused';
  week: number;
}

export interface CreationState {
  songs: Record<string, { recipe?: string[]; effects?: string[]; featuring?: string; ghost?: string; writer?: string; cover?: number; clip?: { shots: string[]; budget: number; result: number }; viral?: { start: number; challenge: string; result: number } }>;
  seen: Record<string, number>; // "família:tema" -> nota descoberta
  writers: Writer[];
  features: Feature[];
  commissions: Commission[];
  remasters: string[];
  museum: string[]; // releaseIds com capas icônicas
  divisions: Record<string, { since: number; prestige: number; awards: number }>;
  divisionAwards: { year: number; division: string; title: string; mine: boolean }[];
  reviewed: string[];
}

declare module '../../ext4' {
  interface Ext4 {
    creation: CreationState;
  }
}

registerExt4('creation', () => ({ songs: {}, seen: {}, writers: [], features: [], commissions: [], remasters: [], museum: [], divisions: {}, divisionAwards: [], reviewed: [] }));

export function songX(s: GameState, songId: string) {
  return (s.x4.creation.songs[songId] ??= {});
}

// ------------------------------------------------------------------ temas e tendências

export const THEMES: { id: string; name: L }[] = [
  { id: 'love', name: l('Amor', 'Love') }, { id: 'party', name: l('Festa', 'Party') }, { id: 'protest', name: l('Protesto', 'Protest') },
  { id: 'longing', name: l('Saudade', 'Longing') }, { id: 'road', name: l('Estrada', 'The road') }, { id: 'faith', name: l('Fé', 'Faith') },
  { id: 'city', name: l('Cidade', 'The city') }, { id: 'dance', name: l('Dança', 'Dance') }, { id: 'rebellion', name: l('Rebeldia', 'Rebellion') },
  { id: 'nostalgia', name: l('Nostalgia', 'Nostalgia') }, { id: 'tech', name: l('Tecnologia e futuro', 'Tech and the future') }, { id: 'heartbreak', name: l('Desilusão', 'Heartbreak') },
  { id: 'money', name: l('Dinheiro e ostentação', 'Money and flexing') }, { id: 'nature', name: l('Natureza', 'Nature') },
];
export const themeById = Object.fromEntries(THEMES.map((x) => [x.id, x])) as Record<string, (typeof THEMES)[number]>;

/** Afinidade base família × tema (−1..1), com um toque da seed para que cada run seja diferente. */
const BASE: Partial<Record<FamilyId, Partial<Record<string, number>>>> = {
  blues_jazz: { longing: 0.8, heartbreak: 0.7, city: 0.5, party: 0.3, tech: -0.6, money: -0.3 },
  country_folk: { road: 0.8, nature: 0.7, longing: 0.6, faith: 0.5, protest: 0.4, tech: -0.7, money: -0.4 },
  rnb: { love: 0.8, dance: 0.7, party: 0.6, heartbreak: 0.5, protest: 0.2, nature: -0.4 },
  rock: { rebellion: 0.9, road: 0.6, protest: 0.5, city: 0.4, faith: -0.4, money: -0.2 },
  pop: { love: 0.9, dance: 0.7, party: 0.6, heartbreak: 0.6, protest: -0.4, nature: -0.2 },
  hiphop: { money: 0.8, city: 0.8, protest: 0.7, rebellion: 0.5, nature: -0.6, faith: -0.1 },
  electronic: { dance: 0.9, tech: 0.8, party: 0.7, city: 0.3, faith: -0.5, road: -0.3 },
  caribbean: { party: 0.7, faith: 0.6, protest: 0.6, dance: 0.6, tech: -0.4 },
  latin: { love: 0.8, dance: 0.8, party: 0.6, heartbreak: 0.6, tech: -0.4 },
  brazil: { longing: 0.9, love: 0.6, party: 0.6, protest: 0.5, nature: 0.4, tech: -0.3 },
  africa: { dance: 0.8, protest: 0.7, faith: 0.5, party: 0.6, tech: -0.2 },
  asia_me: { love: 0.7, nostalgia: 0.6, faith: 0.5, tech: 0.3, rebellion: -0.3 },
};

export function themeAffinity(s: GameState, fam: FamilyId, theme: string): number {
  const base = BASE[fam]?.[theme] ?? 0;
  const jitter = ((hashString(`${s.config.seed}:${fam}:${theme}`) % 1000) / 1000 - 0.5) * 0.5;
  return clamp(base + jitter, -1, 1);
}

/** Tendência do tema no ano (0.7..1.35), com ondas por tema e eventos históricos. */
export function themeTrend(s: GameState, theme: string, market?: MarketId): number {
  const h = hashString(`${theme}:${market ?? 'all'}`);
  const phase = (h % 360) * (Math.PI / 180);
  const period = 9 + (h % 7);
  let v = 1 + 0.18 * Math.sin((s.year / period) * Math.PI * 2 + phase);
  if (theme === 'protest' && ((s.year >= 1963 && s.year <= 1973) || (s.year >= 2016 && s.year <= 2021))) v += 0.2;
  if (theme === 'dance' && s.year >= 1975 && s.year <= 1980) v += 0.25;
  if (theme === 'tech' && s.year >= 2025) v += 0.15;
  if (theme === 'money' && s.year >= 2005 && s.year <= 2020) v += 0.15;
  if (theme === 'nostalgia' && s.year >= 2010) v += 0.1;
  if (theme === 'faith' && s.geo?.active?.length) v += 0.05;
  return clamp(v, 0.7, 1.35);
}

export function hotThemes(s: GameState, n = 4): { id: string; trend: number }[] {
  return THEMES.map((x) => ({ id: x.id, trend: themeTrend(s, x.id) })).sort((a, b) => b.trend - a.trend).slice(0, n);
}

function pickTheme(s: GameState, r: Rng, act: Act): string {
  const fam = familyOf(act.genre);
  return (r.weighted(THEMES, (x) => Math.max(0.05, 1 + themeAffinity(s, fam, x.id)) * themeTrend(s, x.id)) ?? THEMES[0]).id;
}

function themeOf(song: Song): string | undefined {
  if (!song.theme) return undefined;
  const pt = song.theme.pt.toLowerCase();
  return THEMES.find((x) => x.name.pt.toLowerCase() === pt)?.id ?? (song.theme as unknown as { id?: string }).id;
}

/** Tema canônico guardado no estado da música (o caderno de ideias usa temas livres). */
export function songTheme(s: GameState, song: Song): string | undefined {
  return (s.x4.creation.songs[song.id] as { theme?: string } | undefined)?.theme ?? themeOf(song);
}

// ------------------------------------------------------------------ receita sonora

export const INGREDIENTS: { id: string; name: L; from?: number; tech?: string; effects: string[] }[] = [
  { id: 'strings', name: l('Cordas', 'Strings'), effects: ['epic', 'melancholic'] },
  { id: 'horns', name: l('Metais', 'Horns'), effects: ['danceable', 'epic'] },
  { id: 'acoustic', name: l('Violão', 'Acoustic guitar'), effects: ['nostalgic', 'melancholic'] },
  { id: 'distortion', name: l('Guitarra distorcida', 'Distorted guitar'), from: 1960, effects: ['aggressive', 'rebellious'] },
  { id: 'organ', name: l('Órgão', 'Organ'), effects: ['spiritual', 'nostalgic'] },
  { id: 'percussion', name: l('Percussão', 'Percussion'), effects: ['danceable', 'sensual'] },
  { id: 'choir', name: l('Coro', 'Choir'), effects: ['spiritual', 'epic'] },
  { id: 'synth', name: l('Sintetizador', 'Synthesizer'), tech: 'synth', effects: ['futuristic', 'danceable'] },
  { id: 'drum_machine', name: l('Bateria eletrônica', 'Drum machine'), from: 1980, effects: ['danceable', 'futuristic'] },
  { id: 'sample', name: l('Sample de disco antigo', 'Old-record sample'), from: 1986, effects: ['nostalgic', 'experimental'] },
  { id: 'reverb', name: l('Muito reverb', 'Heavy reverb'), effects: ['melancholic', 'spiritual'] },
  { id: 'autotune', name: l('Afinador automático', 'Auto-tune'), from: 1998, effects: ['futuristic', 'sensual'] },
  { id: 'whisper', name: l('Voz sussurrada', 'Whispered vocals'), effects: ['sensual', 'melancholic'] },
  { id: 'shout', name: l('Voz rasgada', 'Raw shouting'), effects: ['aggressive', 'rebellious'] },
  { id: 'tape_noise', name: l('Chiado de fita', 'Tape hiss'), from: 1950, effects: ['nostalgic', 'experimental'] },
  { id: 'neural', name: l('Textura neural', 'Neural texture'), tech: 'neural', effects: ['futuristic', 'experimental'] },
];
export const EFFECTS: Record<string, L> = {
  danceable: l('Dançante', 'Danceable'), melancholic: l('Melancólica', 'Melancholic'), epic: l('Épica', 'Epic'), nostalgic: l('Nostálgica', 'Nostalgic'),
  aggressive: l('Agressiva', 'Aggressive'), sensual: l('Sensual', 'Sensual'), spiritual: l('Espiritual', 'Spiritual'), experimental: l('Experimental', 'Experimental'),
  rebellious: l('Rebelde', 'Rebellious'), futuristic: l('Futurista', 'Futuristic'),
};

export function availableIngredients(s: GameState) {
  return INGREDIENTS.filter((x) => (!x.from || s.year >= x.from) && (!x.tech || hasTech(s, x.tech)));
}

export function effectsOf(recipe: string[]): string[] {
  const count: Record<string, number> = {};
  for (const id of recipe) for (const e of INGREDIENTS.find((x) => x.id === id)?.effects ?? []) count[e] = (count[e] ?? 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
}

/** O que cada mercado procura no ano (dois efeitos), deterministicamente. */
export function marketCraving(s: GameState, m: MarketId): string[] {
  const keys = Object.keys(EFFECTS);
  const h = hashString(`${s.config.seed}:${m}:${Math.floor(s.year / 3)}`);
  const a = keys[h % keys.length];
  const b = keys[(h >> 5) % keys.length];
  return a === b ? [a, keys[(h + 3) % keys.length]] : [a, b];
}

export function setRecipe(s: GameState, songId: string, recipe: string[]): L | null {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.releaseId) return l('A música já foi lançada.', 'The song is already released.');
  if (recipe.length > 4) return l('No máximo 4 ingredientes.', 'At most 4 ingredients.');
  const x = songX(s, songId);
  x.recipe = recipe;
  x.effects = effectsOf(recipe);
  return null;
}

// ------------------------------------------------------------------ apelo: tema, efeitos, capa, clipe, viral, parcerias

function releaseAppealMult(s: GameState, rel: Release, act: Act): { m: number; label: L } {
  const fam = familyOf(act.genre);
  let m = 1;
  const songs = rel.songs.map((id) => s.songs[id]).filter(Boolean);
  // tema × gênero × tendência
  let themeM = 0;
  let n = 0;
  for (const so of songs.slice(0, 4)) {
    const th = songTheme(s, so);
    if (!th) continue;
    themeM += 1 + themeAffinity(s, fam, th) * 0.1 + (themeTrend(s, th, rel.territories[0]) - 1) * 0.35;
    n++;
  }
  if (n) m *= themeM / n;
  // efeitos que os mercados procuram
  const lead = songs[0] ? s.x4.creation.songs[songs[0].id] : undefined;
  if (lead?.effects?.length) {
    let hits = 0;
    for (const mk of rel.territories) for (const e of marketCraving(s, mk)) if (lead.effects.includes(e)) hits++;
    m *= 1 + Math.min(0.15, hits * 0.03);
  }
  if (lead?.cover) m *= 0.97 + lead.cover / 1000;
  if (lead?.clip) m *= 1 + lead.clip.result * 0.12;
  if (lead?.viral) m *= 1 + lead.viral.result * 0.35;
  if (lead?.featuring) {
    const g = s.acts[lead.featuring];
    if (g) m *= 1 + Math.min(0.25, g.fame / 300) + (familyOf(g.genre) !== fam ? 0.05 : 0);
  }
  // standards: regravar clássico em domínio público dá familiaridade
  if (songs[0]?.coverOf && isPublicDomain(s, songs[0].coverOf)) m *= 1.04;
  if (s.x4.creation.remasters.includes(rel.reissueOf ?? '')) m *= 1.25;
  return { m, label: l('Tema, receita sonora, capa e parcerias', 'Theme, sound recipe, cover and features') };
}

registerMod('appeal', 'creation', (s, v, c) => {
  if (!c.release || !c.act) return null;
  if (c.release.owner !== 'player' && !c.act.playerBand) return null;
  const { m, label } = releaseAppealMult(s, c.release, c.act);
  return { value: v * m, label };
});

/** Críticas boas seguram as primeiras semanas; ruins derrubam. */
registerMod('chartUnits', 'creation:reviews', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player' || s.week - rel.week > 8) return null;
  const rv = s.reviews[rel.id];
  if (!rv?.length) return null;
  const avg = rv.reduce((t, x) => t + x.score, 0) / rv.length;
  return { value: v * clamp(0.9 + (avg - 5) * 0.04, 0.85, 1.15) };
});

// ------------------------------------------------------------------ lançamento: críticas e descobertas

function onLaunch(s: GameState, r: Rng, rel: Release): void {
  const act = s.acts[rel.actId];
  if (!act || (rel.owner !== 'player' && !act.playerBand)) return;
  const st = s.x4.creation;
  if (!s.reviews[rel.id]) reviewRelease(s, r, rel);
  const rv = s.reviews[rel.id] ?? [];
  const avg = rv.reduce((t, x) => t + x.score, 0) / Math.max(1, rv.length);
  // descobre a nota da combinação família × tema
  const fam = familyOf(act.genre);
  for (const id of rel.songs) {
    const so = s.songs[id];
    const th = so ? songTheme(s, so) : undefined;
    if (th) st.seen[`${fam}:${th}`] = Math.round(themeAffinity(s, fam, th) * 10) / 10;
  }
  // capa icônica vai para o museu
  const lead = st.songs[rel.songs[0]];
  if (lead?.cover && lead.cover >= 85 && !st.museum.includes(rel.id)) st.museum.push(rel.id);
  st.reviewed.push(rel.id);
  if (st.reviewed.length > 60) st.reviewed.splice(0, st.reviewed.length - 60);
  queueCutscene(s, 'review', { title: fmtL(l('Crítica: "{t}"', 'Reviews: "{t}"'), { t: rel.title }), releaseId: rel.id, avg });
}

// ------------------------------------------------------------------ composição: tema

function onCompose(s: GameState, r: Rng, song: Song): void {
  const act = s.acts[song.actId];
  if (!act) return;
  const x = songX(s, song.id) as { theme?: string };
  x.theme = themeOf(song) ?? pickTheme(s, r, act);
  // compositor contratado do selo ajuda as músicas dos seus atos
  if (act.owner !== 'player') return;
  const w = s.x4.creation.writers.find((wr) => wr.until > s.week && wr.style === familyOf(act.genre)) ?? s.x4.creation.writers.find((wr) => wr.until > s.week);
  if (w) {
    const bump = (w.skill - 50) / 10;
    song.melody = clamp(song.melody + Math.max(0, bump) + 2, 0, 100);
    song.lyrics = clamp(song.lyrics + Math.max(0, bump) + 1, 0, 100);
    song.q = songQ({ ...song, performance: song.melody * 0.6, production: 30 });
    songX(s, song.id).writer = w.id;
    w.songs++;
    if (w.ghost) songX(s, song.id).ghost = w.name;
    else if (!song.writers.includes(w.id)) {
      // compositor creditado leva parte da edição: registrado como nome, sem pessoa no elenco
      (songX(s, song.id) as { credit?: string }).credit = w.name;
    }
  }
}

// ------------------------------------------------------------------ parcerias e duetos

export function featureCandidates(s: GameState, song: Song): Act[] {
  const mine = new Set(playerActs(s));
  return Object.values(s.acts).filter((a) => !mine.has(a.id) && a.status !== 'retired' && !a.deceased && a.fame > 15 && a.id !== song.actId).sort((a, b) => b.fame - a.fame).slice(0, 10);
}

export function featureFee(s: GameState, guest: Act): number {
  return money(s, 1500 + guest.fame * guest.fame * 6);
}

export function inviteFeature(s: GameState, r: Rng, songId: string, guestId: string): L {
  const song = s.songs[songId];
  const guest = s.acts[guestId];
  if (!song || !guest) return l('Inválido.', 'Invalid.');
  if (song.releaseId) return l('A música já foi lançada.', 'The song is already released.');
  if (songX(s, songId).featuring) return l('Esta música já tem participação.', 'This song already has a feature.');
  const fee = featureFee(s, guest);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  const host = s.acts[song.actId];
  const rivalOwner = guest.owner && guest.owner !== 'player' ? s.labels[guest.owner] : undefined;
  const rivalry = rivalOwner ? s.rivalries[rivalOwner.id] ?? 0 : 0;
  const chance = clamp(0.35 + (host?.fame ?? 0) / 150 - guest.fame / 250 - rivalry / 200 + (song.q - 50) / 150, 0.05, 0.9);
  const ok = r.chance(chance);
  s.x4.creation.features.push({ id: nextId(s, 'ft'), songId, guestActId: guestId, fee, share: 0.2, status: ok ? 'done' : 'refused', week: s.week });
  if (!ok) return fmtL(l('{g} (ou o selo) recusou o convite.', '{g} (or their label) turned the invite down.'), { g: guest.name });
  post(s, `feat:${songId}`, -fee, 'recording', `Participação de ${guest.name}`);
  songX(s, songId).featuring = guestId;
  song.title = `${song.title} (feat. ${guest.name})`;
  song.performance = clamp(song.performance + 4, 0, 100);
  remember(s, 'feature', fmtL(l('{g} grava participação em "{t}".', '{g} records a feature on "{t}".'), { g: guest.name, t: song.title }), { actId: song.actId });
  return fmtL(l('{g} topou! Participação gravada.', '{g} said yes! Feature recorded.'), { g: guest.name });
}

// ------------------------------------------------------------------ compositores profissionais e fantasmas

export function writerPool(s: GameState): Writer[] {
  const r = { h: hashString(`${s.config.seed}:wr:${s.year}`) };
  const out: Writer[] = [];
  for (let i = 0; i < 5; i++) {
    const h = hashString(`${r.h}:${i}`);
    const fam = FAMILIES[h % FAMILIES.length].id;
    const skill = 45 + (h % 45);
    out.push({ id: `wpool:${s.year}:${i}`, name: `${['Ana', 'Leo', 'Mia', 'Hal', 'Rosa', 'Theo', 'Iris', 'Noel'][h % 8]} ${['Blum', 'Carvalho', 'Reyes', 'Marsh', 'Okafor', 'Sato', 'Weiss', 'Duarte'][(h >> 4) % 8]}`, skill, style: fam, fee: 0, ghost: false, songs: 0, until: 0 });
  }
  return out;
}

export function hireWriter(s: GameState, poolId: string, ghost: boolean, months = 6): L | null {
  const w = writerPool(s).find((x) => x.id === poolId);
  if (!w) return l('Compositor indisponível.', 'Songwriter unavailable.');
  if (s.x4.creation.writers.some((x) => x.name === w.name && x.until > s.week)) return l('Já contratado.', 'Already hired.');
  const fee = money(s, 800 + w.skill * 25) * (ghost ? 1.4 : 1);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `writer:${w.id}:${s.week}`, -Math.round(fee), 'recording', `Compositor ${w.name}`);
  s.x4.creation.writers.push({ ...w, id: `wr:${s.week}:${w.id}`, fee: Math.round(fee), ghost, until: s.week + months * 4 });
  return null;
}

function writersMonth(s: GameState, r: Rng): void {
  const st = s.x4.creation;
  for (const w of st.writers) if (w.until > s.week) post(s, `writerfee:${w.id}`, -w.fee, 'recording', `Compositor ${w.name}`);
  st.writers = st.writers.filter((w) => w.until > s.week - 52);
  // fantasma pode vazar
  const ghostHits = Object.entries(st.songs).filter(([id, x]) => x.ghost && s.songs[id]?.releaseId && s.releases[s.songs[id].releaseId!]?.peak <= 10);
  if (ghostHits.length && r.chance(0.04 * ghostHits.length)) {
    const [songId, x] = r.pick(ghostHits);
    emitEvent(s, r, 'cr_ghost', { song: songId, ghost: x.ghost ?? '', act: s.songs[songId].actId });
    x.ghost = undefined;
  }
}

// ------------------------------------------------------------------ encomendas

const COMMISSION_KINDS: { kind: Commission['kind']; name: L; from: number; to?: number; pay: number; minQ: number; tech?: string }[] = [
  { kind: 'jingle', name: l('Jingle publicitário', 'Advertising jingle'), from: 1926, pay: 1800, minQ: 35 },
  { kind: 'film', name: l('Trilha de filme', 'Film score'), from: 1929, pay: 9000, minQ: 55 },
  { kind: 'novela', name: l('Tema de novela', 'Soap opera theme'), from: 1951, pay: 5000, minQ: 45 },
  { kind: 'tv_theme', name: l('Abertura de programa de TV', 'TV show opening'), from: 1950, pay: 4000, minQ: 45 },
  { kind: 'anthem', name: l('Hino de clube', 'Club anthem'), from: 1920, pay: 2500, minQ: 40 },
  { kind: 'game', name: l('Trilha de jogo eletrônico', 'Video game soundtrack'), from: 1982, pay: 7000, minQ: 50 },
];
export const commissionName = (k: Commission['kind']) => COMMISSION_KINDS.find((x) => x.kind === k)!.name;

const CLIENTS = ['Cola Sol', 'Studio Aurora', 'TV Horizonte', 'Pixel Forge', 'Atlético Real', 'Banco Mercúrio', 'Rádio Brisa', 'Lumen Pictures', 'Café Serra', 'Moto Veloz'];

function commissionsMonth(s: GameState, r: Rng): void {
  const st = s.x4.creation;
  st.commissions = st.commissions.filter((c) => s.week - c.week < 52);
  for (const c of st.commissions) if (c.status === 'offered' && c.due - 6 < s.week) c.status = 'declined';
  const open = st.commissions.filter((c) => c.status === 'offered').length;
  const kinds = COMMISSION_KINDS.filter((k) => s.year >= k.from);
  const n = playerActs(s).length ? (r.chance(0.65) ? 1 : 0) + (r.chance(0.25) ? 1 : 0) : 0;
  for (let i = 0; i < n && open + i < 5; i++) {
    const k = r.pick(kinds);
    if (!k) break;
    st.commissions.push({ id: nextId(s, 'cm'), kind: k.kind, client: r.pick(CLIENTS), pay: money(s, k.pay * r.float(0.8, 1.4)), minQ: k.minQ + r.int(-5, 10), due: s.week + r.int(6, 14), status: 'offered', week: s.week });
  }
  // entrega
  for (const c of st.commissions) {
    if (c.status !== 'accepted' || c.due > s.week) continue;
    const act = c.actId ? s.acts[c.actId] : undefined;
    if (!act) { c.status = 'failed'; continue; }
    const fam = familyOf(act.genre);
    const talent = act.members.reduce((t, id) => t + (s.persons[id]?.skills.comp ?? 40), 0) / Math.max(1, act.members.length);
    const q = clamp(talent * 0.8 + r.normal(10, 10) + (c.kind === 'game' && fam === 'electronic' ? 8 : 0), 5, 100);
    if (q >= c.minQ) {
      c.status = 'done';
      post(s, `comm:${c.id}`, c.pay, 'publishing', `Encomenda: ${c.client}`);
      act.fans.casual += Math.round(c.pay / 100);
      notify(s, fmtL(l('{a} entregou a encomenda de {c}. Pagamento recebido.', '{a} delivered the {c} commission. Payment received.'), { a: act.name, c: c.client }), 'good');
    } else {
      c.status = 'failed';
      post(s, `commhalf:${c.id}`, Math.round(c.pay * 0.25), 'publishing', `Encomenda recusada: ${c.client} (sinal)`);
      notify(s, fmtL(l('{c} não gostou da entrega de {a}. Só o sinal foi pago.', "{c} didn't like {a}'s delivery. Only the deposit was paid."), { a: act.name, c: c.client }), 'bad');
    }
  }
}

export function acceptCommission(s: GameState, id: string, actId: string): L | null {
  const c = s.x4.creation.commissions.find((x) => x.id === id);
  if (!c || c.status !== 'offered') return l('Encomenda indisponível.', 'Commission unavailable.');
  const act = s.acts[actId];
  if (!act || act.owner !== 'player') return l('Escolha um ato seu.', 'Pick one of your acts.');
  c.status = 'accepted';
  c.actId = actId;
  for (const pid of act.members) { const p = s.persons[pid]; if (p) p.stress = clamp(p.stress + 3, 0, 100); }
  return null;
}

export function declineCommission(s: GameState, id: string): void {
  const c = s.x4.creation.commissions.find((x) => x.id === id);
  if (c) c.status = 'declined';
}

// ------------------------------------------------------------------ domínio público e standards

/** Prazo de proteção do país (simplificado): 50 anos até 1998, 70 depois. */
export function protectionYears(year: number): number {
  return year < 1998 ? 50 : 70;
}

export function isPublicDomain(s: GameState, songId: string): boolean {
  const so = s.songs[songId];
  const rel = so?.releaseId ? s.releases[so.releaseId] : undefined;
  if (!rel) return false;
  return s.year - rel.year >= protectionYears(s.year);
}

/** Standards: as músicas mais regravadas ou mais vendidas há mais de 20 anos. */
export function standards(s: GameState, n = 12): { song: Song; rel: Release; pd: boolean; covers: number }[] {
  const covers: Record<string, number> = {};
  for (const so of Object.values(s.songs)) if (so.coverOf) covers[so.coverOf] = (covers[so.coverOf] ?? 0) + 1;
  return Object.values(s.releases)
    .filter((r) => s.year - r.year >= 20 && r.totalUnits > 0)
    .sort((a, b) => b.totalUnits - a.totalUnits)
    .slice(0, 80)
    .map((rel) => ({ song: s.songs[rel.songs[0]], rel }))
    .filter((x) => x.song)
    .map((x) => ({ ...x, pd: isPublicDomain(s, x.song.id), covers: covers[x.song.id] ?? 0 }))
    .sort((a, b) => b.covers - a.covers || b.rel.totalUnits - a.rel.totalUnits)
    .slice(0, n);
}

// ------------------------------------------------------------------ remasterização

export const REMASTER_TECH: { tech: string; name: L; from: number }[] = [
  { tech: 'cd', name: l('Remaster para CD', 'CD remaster'), from: 1984 },
  { tech: 'download', name: l('Alta resolução', 'High resolution'), from: 2006 },
  { tech: 'streaming', name: l('Áudio espacial', 'Spatial audio'), from: 2019 },
];

export function remasterOptions(s: GameState) {
  return REMASTER_TECH.filter((x) => s.year >= x.from && hasTech(s, x.tech));
}

export function remaster(s: GameState, r: Rng, relId: string): L | null {
  const rel = s.releases[relId];
  if (!rel || rel.owner !== 'player') return l('Só o seu catálogo.', 'Only your catalog.');
  if (s.year - rel.year < 8) return l('Remasterize discos com pelo menos 8 anos.', 'Remaster records at least 8 years old.');
  if (!remasterOptions(s).length) return l('Ainda não há tecnologia nova para remasterizar.', 'There is no new technology to remaster with yet.');
  if (s.x4.creation.remasters.includes(relId)) return l('Já remasterizado nesta geração.', 'Already remastered for this generation.');
  const cost = money(s, 3000 + rel.songs.length * 600);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `remaster:${relId}`, -cost, 'recording', `Remaster de ${rel.title}`);
  s.x4.creation.remasters.push(relId);
  const act = s.acts[rel.actId];
  const res = scheduleRelease(s, r, {
    actId: rel.actId, type: rel.type, songs: rel.songs, title: `${rel.title} (${l('Remasterizado', 'Remastered').pt})`, formats: availableFormats(s),
    press: Math.round(suggestedPress(s, act, rel.type, rel.q) * 0.5), marketing: [], territories: [...s.player.territories], weeksAhead: 3, reissueOf: rel.id, kind: 'deluxe',
  });
  return 'pt' in res && !('id' in res) ? (res as L) : null;
}

// ------------------------------------------------------------------ capa, clipe, trecho viral

export function setCover(s: GameState, songId: string, score: number): void {
  songX(s, songId).cover = clamp(Math.round(score), 0, 100);
}

export const SHOTS: { id: string; name: L; cost: number; impact: number; risk: number }[] = [
  { id: 'band', name: l('Banda tocando', 'Band performing'), cost: 2, impact: 2, risk: 0 },
  { id: 'story', name: l('Historinha', 'Storyline'), cost: 4, impact: 4, risk: 0.05 },
  { id: 'dance', name: l('Coreografia', 'Choreography'), cost: 5, impact: 5, risk: 0.05 },
  { id: 'animation', name: l('Animação', 'Animation'), cost: 7, impact: 6, risk: 0.1 },
  { id: 'stunt', name: l('Efeito caro', 'Expensive effect'), cost: 10, impact: 8, risk: 0.2 },
  { id: 'cameo', name: l('Participação de famoso', 'Celebrity cameo'), cost: 8, impact: 6, risk: 0.08 },
  { id: 'one_take', name: l('Plano-sequência', 'One-take shot'), cost: 3, impact: 5, risk: 0.15 },
];

export function shootClip(s: GameState, r: Rng, songId: string, shots: string[]): L | null {
  if (!hasTech(s, 'clipnet') && s.year < 1981) return l('Videoclipe ainda não é um canal (MTV e afins chegam nos anos 80).', 'Music videos are not a channel yet (music TV arrives in the 1980s).');
  if (shots.length !== 6) return l('Escolha 6 planos.', 'Pick 6 shots.');
  const defs = shots.map((id) => SHOTS.find((x) => x.id === id)!).filter(Boolean);
  const budget = defs.reduce((t, x) => t + x.cost, 0);
  const cost = money(s, budget * 1500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `clip:${songId}`, -cost, 'marketing', 'Videoclipe');
  const variety = new Set(shots).size;
  const risk = defs.reduce((t, x) => t + x.risk, 0);
  let result = (defs.reduce((t, x) => t + x.impact, 0) / 36) * (0.7 + variety / 12);
  const legend = r.chance(0.05 + variety * 0.01);
  const flop = r.chance(risk * 0.25);
  if (legend) result *= 1.8;
  if (flop) result *= 0.3;
  songX(s, songId).clip = { shots, budget, result: clamp(result, 0, 2) };
  if (legend) remember(s, 'clip', fmtL(l('O clipe de "{t}" vira lenda da TV.', 'The "{t}" video becomes TV legend.'), { t: s.songs[songId]?.title ?? '' }), { important: true });
  return flop ? l('O clipe ficou caro e esquisito. Mesmo assim, vai ao ar.', 'The video turned out pricey and odd. It airs anyway.') : null;
}

export const CHALLENGES: { id: string; name: L }[] = [
  { id: 'dance', name: l('Desafio de dança', 'Dance challenge') },
  { id: 'lip', name: l('Dublagem', 'Lip-sync') },
  { id: 'meme', name: l('Meme', 'Meme') },
  { id: 'duet', name: l('Dueto com fãs', 'Fan duet') },
  { id: 'transition', name: l('Transição de look', 'Outfit transition') },
];

export function viralPush(s: GameState, r: Rng, songId: string, start: number, challenge: string): L {
  const song = s.songs[songId];
  if (!song) return l('Inválido.', 'Invalid.');
  if (!hasTech(s, 'short_video')) return l('Vídeo curto ainda não existe.', 'Short video does not exist yet.');
  const p = songProfile(song);
  // o melhor trecho começa perto do refrão (35–55% da música)
  const sweet = 1 - Math.min(1, Math.abs(start - 45) / 45);
  const fit = challenge === 'dance' ? (s.x4.creation.songs[songId]?.effects?.includes('danceable') ? 1.3 : 0.9) : challenge === 'meme' ? 1.1 : 1;
  const chance = clamp((p.hook / 100) * 0.5 * sweet * fit + 0.05, 0.02, 0.7);
  const result = r.chance(chance) ? clamp(0.5 + p.hook / 100, 0, 1.5) : r.float(0, 0.2);
  songX(s, songId).viral = { start, challenge, result };
  if (result > 0.5) {
    const act = s.acts[song.actId];
    if (act) { act.fans.casual += Math.round(20000 * result); act.momentum = clamp(act.momentum + 15, 0, 100); }
    remember(s, 'viral', fmtL(l('"{t}" viraliza nos vídeos curtos.', '"{t}" goes viral on short video.'), { t: song.title }), { actId: song.actId, important: true });
    return l('Viralizou! Milhões de vídeos com o trecho.', 'It went viral! Millions of videos with the snippet.');
  }
  return l('Alguns vídeos, nada de explosão. Tente outro trecho ou desafio em outra música.', 'A few videos, no explosion. Try another snippet or challenge on another song.');
}

// ------------------------------------------------------------------ divisões especializadas

export const DIVISIONS: { id: string; name: L; from: number; cost: number; income: number; families?: FamilyId[] }[] = [
  { id: 'classical', name: l('Clássica e orquestra', 'Classical & orchestra'), from: 1920, cost: 4000, income: 3500 },
  { id: 'gospel', name: l('Gospel e religiosa', 'Gospel & sacred'), from: 1920, cost: 2500, income: 3000 },
  { id: 'kids', name: l('Infantil', "Children's music"), from: 1940, cost: 2000, income: 2600 },
  { id: 'soundtrack', name: l('Trilhas sonoras', 'Soundtracks'), from: 1935, cost: 3500, income: 3800 },
  { id: 'musicals', name: l('Musicais de teatro', 'Stage musicals'), from: 1927, cost: 4500, income: 4200 },
  { id: 'games', name: l('Música de jogos', 'Video game music'), from: 1983, cost: 3000, income: 3600 },
];

export function openDivision(s: GameState, id: string): L | null {
  const d = DIVISIONS.find((x) => x.id === id);
  if (!d) return l('Inválido.', 'Invalid.');
  if (s.year < d.from) return fmtL(l('Disponível a partir de {y}.', 'Available from {y}.'), { y: d.from });
  if (s.x4.creation.divisions[id]) return l('Divisão já aberta.', 'Division already open.');
  const cost = money(s, d.cost * 5);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `div:${id}`, -cost, 'business', `Divisão ${d.name.pt}`);
  s.x4.creation.divisions[id] = { since: s.week, prestige: 20, awards: 0 };
  return null;
}

export function closeDivision(s: GameState, id: string): void {
  delete s.x4.creation.divisions[id];
}

function divisionsMonth(s: GameState, r: Rng): void {
  for (const [id, dv] of Object.entries(s.x4.creation.divisions)) {
    const d = DIVISIONS.find((x) => x.id === id);
    if (!d) continue;
    dv.prestige = clamp(dv.prestige + r.normal(0.6, 1.2), 0, 100);
    const income = money(s, d.income * (0.6 + dv.prestige / 100) * r.float(0.85, 1.15) * (id === 'games' && s.year > 2005 ? 1.6 : 1));
    post(s, `divrev:${id}`, Math.round(income), 'publishing', `Divisão ${d.name.pt}`);
    post(s, `divcost:${id}`, -money(s, d.cost), 'business', `Custos da divisão ${d.name.pt}`);
  }
}

function divisionsYear(s: GameState, r: Rng): void {
  const st = s.x4.creation;
  for (const d of DIVISIONS) {
    if (s.year < d.from) continue;
    const mine = st.divisions[d.id];
    const p = mine ? mine.prestige / 160 : 0;
    const win = r.chance(p);
    st.divisionAwards.unshift({ year: s.year, division: d.id, title: win ? `${s.config.companyName} — ${d.name.pt}` : `${r.pick(['Aurora', 'Lumen', 'Atlas', 'Solaris', 'Meridian'])} ${d.name.pt}`, mine: win });
    if (win && mine) {
      mine.awards++;
      s.player.stats.awards += 1;
      notify(s, fmtL(l('Sua divisão {d} ganhou o prêmio do ano.', 'Your {d} division won the award of the year.'), { d: d.name }), 'good');
    }
  }
  if (st.divisionAwards.length > 60) st.divisionAwards.length = 60;
}

// ------------------------------------------------------------------ eventos

const EVENTS_CR: EventDef[] = [
  {
    id: 'cr_ghost', cat: 'scandal', tone: 'bad', tags: [], cooldown: 12, forcedOnly: true,
    title: l('Compositor fantasma revelado', 'Ghostwriter revealed'),
    text: l('{ghost} conta a um jornal que escreveu um hit atribuído a {act}.', '{ghost} tells a newspaper they wrote a hit credited to {act}.'),
    options: [
      { id: 'credit', label: l('Dar o crédito e pagar', 'Give credit and pay'), hint: l('Custa dinheiro; reputação preservada.', 'Costs money; reputation preserved.'), apply: (s, _r, c) => { post(s, `ghostpay:${c.song}`, -money(s, 6000), 'legal', 'Acordo com compositor'); } },
      { id: 'deny', label: l('Negar tudo', 'Deny everything'), hint: l('Grátis; o artista perde credibilidade.', 'Free; the artist loses credibility.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a?.image) a.image.artistic = clamp(a.image.artistic - 10, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic - 3, 0, 100); } },
    ],
  },
];
deferEvents(EVENTS_CR);

registerSimHook('compose', 'creation', (s, r, a) => { if (a.song) onCompose(s, r, a.song); });
registerSimHook('launch', 'creation', (s, r, a) => { if (a.release) onLaunch(s, r, a.release); });
registerSimHook('month', 'creation', (s, r) => { writersMonth(s, r); commissionsMonth(s, r); divisionsMonth(s, r); });
registerSimHook('year', 'creation', (s, r) => divisionsYear(s, r));

export { MARKETS, personName };
