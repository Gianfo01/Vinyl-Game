// Repertório (pedido do criador): todas as composições de cada ato, se já foram gravadas e em quais
// discos entraram, e o que fazer com elas — revisar, gravar, lançar como demo/single, coletânea,
// disco ao vivo, guardar no cofre, descartar, oferecer a outro artista ou ao catálogo de sync.
// Também o caderno de ideias: temas colhidos na estrada, na família e nas cenas alimentam composições.

import { clamp, type Rng } from '../core/rng';
import { cityById, l, type L } from '../data/world';
import { availableFormats, scheduleRelease, songQ, suggestedPress } from './production';
import { launchNpcRelease } from './market';
import type { Act, GameState, Release, Song } from './types';
import type { Idea } from './xtypes';
import { fmtL, money, nextId, notify, playerActs, post, remember } from './util';

export type SongStatus = 'written' | 'recorded' | 'scheduled' | 'released' | 'vault' | 'discarded';

export interface SongUse {
  id: string;
  title: string;
  type: Release['type'];
  kind?: Release['kind'];
  year: number;
  pending: boolean;
  owner: string;
}

export function isDiscarded(s: GameState, songId: string): boolean {
  return !!s.flags[`discarded:${songId}`];
}

/** Todos os lançamentos (e programados) em que a música entrou. */
export function songUses(s: GameState, songId: string): SongUse[] {
  const out: SongUse[] = [];
  for (const r of Object.values(s.releases)) if (r.songs.includes(songId)) out.push({ id: r.id, title: r.title, type: r.type, kind: r.kind, year: r.year, pending: false, owner: r.owner });
  for (const p of s.pendingReleases) if (p.songs.includes(songId)) out.push({ id: p.id, title: p.title, type: p.type, kind: p.kind, year: s.year, pending: true, owner: 'player' });
  return out.sort((a, b) => a.year - b.year);
}

/** Versões derivadas: covers, remixes, traduções, ao vivo. */
export function derivedSongs(s: GameState, songId: string): Song[] {
  return Object.values(s.songs).filter((x) => x.coverOf === songId || x.remixOf === songId || x.translationOf === songId || s.flags[`liveOf:${x.id}`] === hashId(songId));
}

function hashId(id: string): number {
  let hsh = 0;
  for (const ch of id) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0;
  return hsh;
}

export function songStatus(s: GameState, song: Song): SongStatus {
  if (isDiscarded(s, song.id)) return 'discarded';
  if (song.vault) return 'vault';
  const uses = songUses(s, song.id);
  if (uses.some((u) => !u.pending)) return 'released';
  if (uses.length || song.releaseId) return 'scheduled';
  return song.recorded ? 'recorded' : 'written';
}

export const STATUS_NAMES: Record<SongStatus, L> = {
  written: l('Escrita', 'Written'),
  recorded: l('Gravada, inédita', 'Recorded, unreleased'),
  scheduled: l('Programada', 'Scheduled'),
  released: l('Lançada', 'Released'),
  vault: l('No cofre', 'In the vault'),
  discarded: l('Descartada', 'Discarded'),
};

/** Perfil comercial determinístico: gancho (singles), acessibilidade (rádio) e durabilidade (catálogo). */
export function songProfile(song: Song): { hook: number; access: number; durability: number } {
  const perf = song.recorded ? song.performance : song.melody * 0.6;
  const hook = clamp(song.melody * 0.6 + perf * 0.2 + song.originality * 0.2, 0, 100);
  const access = clamp(25 + song.melody * 0.6 + perf * 0.15 - Math.abs(song.originality - 40) * 0.8, 0, 100);
  const durability = clamp(song.lyrics * 0.4 + song.originality * 0.3 + song.melody * 0.3, 0, 100);
  return { hook: Math.round(hook), access: Math.round(access), durability: Math.round(durability) };
}

/** Repertório completo do ato (sem descartadas, a não ser que pedidas). */
export function repertoire(s: GameState, act: Act, withDiscarded = false): Song[] {
  return act.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x && (withDiscarded || !isDiscarded(s, x.id)));
}

// ------------------------------------------------------------------ ações

export type ReviseFocus = 'hook' | 'story' | 'texture';
export const REVISE_FOCUS: Record<ReviseFocus, { name: L; desc: L }> = {
  hook: { name: l('Lapidar o refrão', 'Polish the hook'), desc: l('Melodia mais forte.', 'Stronger melody.') },
  story: { name: l('Reescrever a letra', 'Rewrite the lyrics'), desc: l('Letra mais forte.', 'Stronger lyrics.') },
  texture: { name: l('Arriscar no arranjo', 'Take risks in the arrangement'), desc: l('Mais originalidade; pode perder acessibilidade.', 'More originality; may lose accessibility.') },
};

export function reviseCost(s: GameState, song: Song): number {
  return money(s, 300 * ((song.revisions ?? 0) + 1));
}

export function reviseSong(s: GameState, r: Rng, songId: string, focus: ReviseFocus): L | null {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.recorded) return l('Já gravada: para mudar, regrave ou faça uma versão.', 'Already recorded: re-record or make a version to change it.');
  if ((song.revisions ?? 0) >= 4) return l('Esta música já foi revisada demais; os autores não aguentam mais.', 'This song has been revised too much; the writers have had enough.');
  const cost = reviseCost(s, song);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `revise:${song.id}:${song.revisions ?? 0}`, -cost, 'recording', `Revisão de "${song.title}"`);
  const n = song.revisions ?? 0;
  const gain = Math.max(0, r.normal(6 - n * 1.2, 3));
  if (focus === 'hook') song.melody = clamp(song.melody + gain, 0, 100);
  else if (focus === 'story') song.lyrics = clamp(song.lyrics + gain, 0, 100);
  else {
    song.originality = clamp(song.originality + gain * 1.4, 0, 100);
    song.melody = clamp(song.melody - r.float(0, 2), 0, 100);
  }
  song.revisions = n + 1;
  song.q = songQ({ ...song, performance: song.melody * 0.6, production: 30 });
  for (const w of song.writers) {
    const p = s.persons[w];
    if (!p) continue;
    p.stress = clamp(p.stress + 4 + n * 2, 0, 100);
    p.inspiration = clamp(p.inspiration - 3, 0, 100);
  }
  return null;
}

export function toggleVault(s: GameState, songId: string): L | null {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (songStatus(s, song) === 'released' || songStatus(s, song) === 'scheduled') return l('Música já lançada ou programada.', 'Song already released or scheduled.');
  song.vault = !song.vault;
  return null;
}

export function discardSong(s: GameState, songId: string): L | null {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  const st = songStatus(s, song);
  if (st === 'released' || st === 'scheduled') return l('Não dá para descartar algo já lançado.', "You can't discard something already released.");
  s.flags[`discarded:${songId}`] = 1;
  for (const w of song.writers) {
    const p = s.persons[w];
    if (p) p.morale = clamp(p.morale - 3, 0, 100);
  }
  return null;
}

export function restoreSong(s: GameState, songId: string): void {
  delete s.flags[`discarded:${songId}`];
}

/** Demo caseira: grava cru (barato, sem estúdio) e lança como single de baixa tiragem. */
export function releaseDemo(s: GameState, r: Rng, songId: string): L | null {
  const song = s.songs[songId];
  const act = song ? s.acts[song.actId] : undefined;
  if (!song || !act) return l('Música inexistente.', 'Unknown song.');
  if (songStatus(s, song) !== 'written' && songStatus(s, song) !== 'recorded') return l('Só músicas inéditas.', 'Unreleased songs only.');
  if (!song.recorded) {
    const cost = money(s, 150);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `demo:${song.id}`, -cost, 'recording', `Demo "${song.title}"`);
    song.recorded = true;
    song.performance = clamp(song.melody * 0.55 + r.normal(0, 5), 5, 100);
    song.production = clamp(22 + r.normal(0, 4), 5, 100);
    song.q = songQ(song);
  }
  const res = scheduleRelease(s, r, {
    actId: act.id, type: 'single', songs: [song.id], title: `${song.title} (demo)`, formats: availableFormats(s).slice(0, 1),
    press: Math.round(suggestedPress(s, act, 'single', song.q) * 0.25), marketing: [], territories: [cityById[act.city]?.market ?? s.player.territories[0]], weeksAhead: 1, kind: 'demo',
  });
  return 'pt' in res && !('id' in res) ? (res as L) : null;
}

/** Single rápido de uma música gravada (sem rollout). */
export function releaseSingle(s: GameState, r: Rng, songId: string): L | null {
  const song = s.songs[songId];
  const act = song ? s.acts[song.actId] : undefined;
  if (!song || !act) return l('Música inexistente.', 'Unknown song.');
  if (songStatus(s, song) !== 'recorded') return l('Grave a música antes de lançar.', 'Record the song before releasing it.');
  const res = scheduleRelease(s, r, {
    actId: act.id, type: 'single', songs: [song.id], title: song.title, formats: availableFormats(s),
    press: suggestedPress(s, act, 'single', song.q), marketing: [], territories: [...s.player.territories], weeksAhead: 2,
  });
  return 'pt' in res && !('id' in res) ? (res as L) : null;
}

/** Coletânea / "grandes sucessos": reúne músicas já lançadas do ato. */
export function releaseCompilation(s: GameState, r: Rng, actId: string, songIds: string[], title?: string): L | null {
  const act = s.acts[actId];
  if (!act) return l('Ato inválido.', 'Invalid act.');
  const ok = songIds.filter((id) => s.songs[id] && songStatus(s, s.songs[id]) === 'released');
  if (ok.length < 6) return l('Uma coletânea precisa de ao menos 6 músicas já lançadas.', 'A compilation needs at least 6 released songs.');
  const res = scheduleRelease(s, r, {
    actId, type: 'lp', songs: ok.slice(0, 16), title: title || fmtL(l('O melhor de {a}', 'The best of {a}'), { a: act.name }).pt, formats: availableFormats(s),
    press: Math.round(suggestedPress(s, act, 'lp', 60) * 0.6), marketing: [], territories: [...s.player.territories], weeksAhead: 3, kind: 'compilation',
  });
  return 'pt' in res && !('id' in res) ? (res as L) : null;
}

/** Turnês concluídas com shows tocados permitem um disco ao vivo. */
export function liveCandidates(s: GameState, actId: string) {
  return s.tours.filter((tr) => tr.actId === actId && tr.stops.some((x) => x.status === 'played') && !s.flags[`liveAlbum:${tr.id}`]);
}

export function releaseLive(s: GameState, r: Rng, tourId: string): L | null {
  const tr = s.tours.find((x) => x.id === tourId);
  const act = tr ? s.acts[tr.actId] : undefined;
  if (!tr || !act) return l('Turnê inválida.', 'Invalid tour.');
  const played = tr.stops.filter((x) => x.status === 'played');
  if (!played.length) return l('Nenhum show tocado nesta turnê.', 'No shows played on this tour.');
  const base = (tr.setlist.length ? tr.setlist : act.songs).map((id) => s.songs[id]).filter((x): x is Song => !!x && songStatus(s, x) === 'released').slice(0, 12);
  if (base.length < 5) return l('O setlist precisa de ao menos 5 músicas já lançadas.', 'The setlist needs at least 5 released songs.');
  const energy = clamp(50 + tr.production * 8 + played.length * 1.5 + act.fame / 4, 30, 95);
  const ids = base.map((src) => {
    const so: Song = {
      ...src, id: nextId(s, 's'), title: `${src.title} (${l('ao vivo', 'live').pt})`, recorded: true, releaseId: undefined, createdWeek: s.week,
      performance: clamp((src.performance + energy) / 2 + r.normal(0, 4), 5, 100), production: clamp(src.production * 0.85, 5, 100), vault: false, revisions: undefined,
    };
    so.q = songQ(so);
    s.songs[so.id] = so;
    act.songs.push(so.id);
    s.flags[`liveOf:${so.id}`] = hashId(src.id);
    s.flags[`ro:${so.id}`] = 1; // não aparece como inédita
    return so.id;
  });
  const city = cityById[played[played.length - 1].cityId];
  const res = scheduleRelease(s, r, {
    actId: act.id, type: 'lp', songs: ids, title: fmtL(l('Ao vivo em {c}', 'Live in {c}'), { c: city?.name ?? l('turnê', 'tour') }).pt, formats: availableFormats(s),
    press: Math.round(suggestedPress(s, act, 'lp', 60) * 0.7), marketing: [], territories: [...s.player.territories], weeksAhead: 3, kind: 'live',
  });
  if ('pt' in res && !('id' in res)) return res as L;
  s.flags[`liveAlbum:${tr.id}`] = 1;
  return null;
}

/** Oferecer uma música inédita a um artista de fora: taxa na hora + parte da edição. */
export function pitchTargets(s: GameState, song: Song): Act[] {
  const mine = new Set(playerActs(s));
  return Object.values(s.acts)
    .filter((a) => !mine.has(a.id) && a.status !== 'retired' && !a.deceased && a.fame > 10 && a.owner && a.owner !== 'player')
    .sort((a, b) => Number(b.genre === song.genre) - Number(a.genre === song.genre) || b.fame - a.fame)
    .slice(0, 8);
}

export function pitchFee(s: GameState, song: Song, target: Act): number {
  return money(s, 400 + song.q * 25 + target.fame * 30);
}

export function pitchSong(s: GameState, r: Rng, songId: string, targetActId: string): L {
  const song = s.songs[songId];
  const target = s.acts[targetActId];
  if (!song || !target) return l('Inválido.', 'Invalid.');
  const st = songStatus(s, song);
  if (st !== 'written' && st !== 'recorded' && st !== 'vault') return l('Só músicas inéditas podem ser oferecidas.', 'Only unreleased songs can be pitched.');
  if (s.songPitches.some((p) => p.songId === songId && p.status !== 'declined')) return l('Já oferecida.', 'Already pitched.');
  const fee = pitchFee(s, song, target);
  const chance = clamp(0.2 + (song.q - target.fame * 0.6) / 80 + (song.genre === target.genre ? 0.15 : -0.1) + songProfile(song).hook / 400, 0.05, 0.9);
  const accepted = r.chance(chance);
  s.songPitches.push({ id: nextId(s, 'sp'), songId, targetActId, fee, week: s.week, status: accepted ? 'accepted' : 'declined' });
  if (!accepted) return fmtL(l('{a} recusou "{t}".', '{a} passed on "{t}".'), { a: target.name, t: song.title });
  post(s, `pitch:${songId}`, fee, 'publishing', `Música "${song.title}" para ${target.name}`);
  const cover: Song = {
    ...song, id: nextId(s, 's'), actId: target.id, coverOf: song.id, recorded: true, releaseId: undefined, vault: false, createdWeek: s.week,
    performance: clamp(45 + target.fame / 2 + r.normal(0, 6), 5, 100), production: clamp(55 + r.normal(0, 8), 5, 100), genre: target.genre,
  };
  cover.q = songQ(cover);
  s.songs[cover.id] = cover;
  target.songs.push(cover.id);
  const rel = launchNpcRelease(s, r, target, target.owner!, [cover.id], 'single', 3000 + target.fame * 80);
  s.flags[`pitchRel:${rel.id}`] = 1;
  s.flags[`pitchRev:${rel.id}`] = 0;
  song.vault = false;
  s.flags[`ro:${song.id}`] = 1;
  s.flags[`pitched:${song.id}`] = 1;
  remember(s, 'pitch', fmtL(l('"{t}", de {a}, vira single na voz de {b}.', '"{t}", written by {a}, becomes a single for {b}.'), { t: song.title, a: s.acts[song.actId]?.name ?? '', b: target.name }), { actId: song.actId });
  return fmtL(l('{a} gravou "{t}"! Você recebe a taxa e 8% da receita.', '{a} cut "{t}"! You get the fee and 8% of revenue.'), { a: target.name, t: song.title });
}

/** Catálogo de sync: oferece a música a agências; gera uma oferta de licença na mesa. */
export function pitchSync(s: GameState, r: Rng, songId: string): L {
  const song = s.songs[songId];
  if (!song) return l('Inválido.', 'Invalid.');
  if (songStatus(s, song) !== 'released') return l('Só faixas lançadas entram no catálogo de sync.', 'Only released tracks go into the sync catalog.');
  if (s.flags[`syncPitch:${songId}`] && s.week - s.flags[`syncPitch:${songId}`] < 26) return l('Já está no catálogo de agências; aguarde.', 'Already in the agencies catalog; wait.');
  s.flags[`syncPitch:${songId}`] = s.week;
  const p = songProfile(song);
  const chance = clamp(0.15 + p.access / 250 + p.durability / 400 + (s.player.staff.some((x) => x.role === 'sync') ? 0.2 : 0), 0.05, 0.85);
  if (!r.chance(chance)) return l('As agências ouviram, mas ninguém pediu ainda.', 'Agencies listened, but nobody has asked yet.');
  const kind = r.pick(['sync_ad', 'sync_tv', 'sync_film', 'sync_game'] as const);
  const brand = kind === 'sync_ad' ? l('Agência de publicidade', 'Ad agency').pt : kind === 'sync_tv' ? l('Série de TV', 'TV series').pt : kind === 'sync_film' ? l('Produtora de cinema', 'Film studio').pt : l('Estúdio de games', 'Game studio').pt;
  const fee = money(s, 1500 + song.q * 60 + p.access * 30);
  s.deals.push({ id: nextId(s, 'bd'), actId: song.actId, brand, kind, fee, songId, untilWeek: s.week + 5, exclusive: false, status: 'offered', boost: kind === 'sync_film' ? 0.6 : kind === 'sync_game' ? 0.5 : kind === 'sync_tv' ? 0.7 : 0.3 });
  notify(s, fmtL(l('Pedido de sync para "{t}". Veja Marcas.', 'Sync request for "{t}". See Brands.'), { t: song.title }), 'event');
  return l('Uma agência quer licenciar a faixa! A oferta está em Marcas.', 'An agency wants to license the track! The offer is in Brands.');
}

/** Receita de edição das músicas oferecidas e gravadas por outros. */
function pitchesMonth(s: GameState): void {
  for (const rel of Object.values(s.releases)) {
    if (!s.flags[`pitchRel:${rel.id}`]) continue;
    const prev = s.flags[`pitchRev:${rel.id}`] ?? 0;
    const delta = rel.revenue - prev;
    if (delta <= 0) continue;
    s.flags[`pitchRev:${rel.id}`] = rel.revenue;
    const cut = Math.round(delta * 0.08);
    if (cut > 0) post(s, `pitchpub:${rel.id}:${s.year}:${s.month}`, cut, 'publishing', `Edição: "${rel.title}"`);
  }
}

// ------------------------------------------------------------------ caderno de ideias

const THEMES: Record<Idea['source'], L[]> = {
  tour: [l('estrada sem fim', 'endless road'), l('quarto de hotel', 'hotel room'), l('saudade de casa', 'homesick'), l('cidade estrangeira', 'foreign city'), l('multidão', 'the crowd')],
  family: [l('pai ausente', 'absent father'), l('filho recém-nascido', 'newborn child'), l('casamento', 'wedding'), l('herança', 'inheritance')],
  movement: [l('nova cena', 'new scene'), l('juventude rebelde', 'rebel youth'), l('pista de dança', 'dance floor'), l('moda da rua', 'street fashion')],
  city: [l('bairro antigo', 'old neighbourhood'), l('noite na cidade', 'city night'), l('trem das seis', 'six o\'clock train')],
  love: [l('amor de verão', 'summer love'), l('separação', 'break-up'), l('ciúme', 'jealousy'), l('reencontro', 'reunion')],
  loss: [l('despedida', 'farewell'), l('amigo perdido', 'lost friend'), l('luto', 'grief')],
  politics: [l('protesto', 'protest'), l('censura', 'censorship'), l('liberdade', 'freedom'), l('guerra distante', 'distant war')],
};

export function addIdea(s: GameState, r: Rng, actId: string, source: Idea['source'], strength: number): Idea | null {
  const list = (s.ideas[actId] ??= []);
  if (list.length >= 8) list.sort((a, b) => a.strength - b.strength).shift();
  const idea: Idea = { id: nextId(s, 'id'), theme: r.pick(THEMES[source]), source, strength: clamp(Math.round(strength), 1, 10), week: s.week };
  list.push(idea);
  return idea;
}

/** Usada por composeSongs: a ideia mais forte vira tema da próxima música. */
export function takeIdea(s: GameState, actId: string): Idea | null {
  const list = s.ideas?.[actId];
  if (!list?.length) return null;
  list.sort((a, b) => b.strength - a.strength);
  return list.shift() ?? null;
}

export function discardIdea(s: GameState, actId: string, ideaId: string): void {
  s.ideas[actId] = (s.ideas[actId] ?? []).filter((x) => x.id !== ideaId);
}

function ideasMonth(s: GameState, r: Rng): void {
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const playedTour = s.tours.some((tr) => tr.actId === id && tr.stops.some((x) => x.status === 'played' && s.day - x.day < 31 && s.day >= x.day));
    if (playedTour && r.chance(0.6)) addIdea(s, r, id, 'tour', r.int(4, 9));
    if (s.movements.some((m) => m.city === act.city && s.year - m.born <= 2) && r.chance(0.25)) addIdea(s, r, id, 'movement', r.int(5, 9));
    const fam = act.members.some((m) => s.families[m] && r.chance(0.08));
    if (fam) addIdea(s, r, id, r.chance(0.5) ? 'family' : 'love', r.int(3, 8));
    if (s.geo.active.length && r.chance(0.1)) addIdea(s, r, id, 'politics', r.int(4, 10));
    if (act.members.some((m) => s.persons[m] && !s.persons[m].alive) && r.chance(0.2)) addIdea(s, r, id, 'loss', r.int(6, 10));
    if (r.chance(0.12)) addIdea(s, r, id, 'city', r.int(2, 6));
  }
}

export function repertoireMonth(s: GameState, r: Rng): void {
  pitchesMonth(s);
  ideasMonth(s, r);
}
