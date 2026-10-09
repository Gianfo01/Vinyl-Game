// Estúdio (GDD §11, §12, §43): sessão com decisões por take (granularidade diária), produtores
// com assinatura sonora, samples e interpolações com liberação de direitos, covers, remixes,
// versões em outro idioma e discos-tributo.

import { clamp, type Rng } from '../core/rng';
import { APPROACHES, STUDIO_TIERS } from '../data/rules';
import { familyOf, l, type L } from '../data/world';
import { actState, actTalent, songTitle, actLang } from './people';
import { eraProductionBase, ownStudioProduction, recordingCost, songQ } from './production';
import type { Act, GameState, Song } from './types';
import type { SampleRequest, StudioSession, Take } from './xtypes';
import { fmtL, hasTech, money, nextId, notify, post, remember, staffSkill } from './util';
import { activeMembers, checkCapacity, monthIndex } from './capacity';
import { applyMods } from './ext4';

// ---------- Produtores ----------
export interface ProducerDef {
  id: string;
  name: string;
  signature: 'wall_of_sound' | 'lofi' | 'maximalist' | 'dry' | 'organic' | 'trap808' | 'neural' | 'swing' | 'dub' | 'glossy';
  from: number;
  to: number;
  families: string[];
  skill: number;
  fee: number; // dólares base por faixa
  ego: number; // 0..100
  /** rodada 15: produtor real (id em data/producers15) e som próprio que substitui a assinatura genérica */
  real?: string;
  sound?: { name: L; prod: number; perf: number; orig: number };
}
/** Rodada 15: ganchos do sistema de produtores reais (nome gerado, cachê com relação, recusa, ocupação longa). */
export const prodHooks: { name?: (s: GameState, p: ProducerDef) => string; fee?: (s: GameState, p: ProducerDef) => number; ok?: (s: GameState, p: ProducerDef) => boolean; started?: (s: GameState, p: ProducerDef, sess: StudioSession) => void } = {};
export const soundOf = (p: ProducerDef): { name: L; prod: number; perf: number; orig: number } => p.sound ?? SIGNATURES[p.signature];

export const SIGNATURES: Record<ProducerDef['signature'], { name: L; prod: number; perf: number; orig: number; families: string[] }> = {
  wall_of_sound: { name: l('Parede de som', 'Wall of sound'), prod: 8, perf: 0, orig: -2, families: ['pop', 'rock', 'rnb'] },
  lofi: { name: l('Lo-fi caseiro', 'Lo-fi'), prod: -6, perf: 2, orig: 10, families: ['rock', 'hiphop', 'electronic'] },
  maximalist: { name: l('Maximalista', 'Maximalist'), prod: 10, perf: -2, orig: 2, families: ['pop', 'electronic'] },
  dry: { name: l('Seco e cru', 'Dry and raw'), prod: 2, perf: 6, orig: 4, families: ['rock', 'blues_jazz', 'country_folk'] },
  organic: { name: l('Orgânico ao vivo', 'Organic live'), prod: 4, perf: 8, orig: 0, families: ['blues_jazz', 'brazil', 'latin', 'country_folk'] },
  trap808: { name: l('Graves 808', '808 low end'), prod: 7, perf: 0, orig: 3, families: ['hiphop', 'electronic'] },
  neural: { name: l('Síntese neural', 'Neural synthesis'), prod: 12, perf: -4, orig: 5, families: ['electronic', 'pop'] },
  swing: { name: l('Big band e swing', 'Big band swing'), prod: 5, perf: 5, orig: 0, families: ['blues_jazz', 'pop'] },
  dub: { name: l('Dub e eco', 'Dub and echo'), prod: 6, perf: 0, orig: 6, families: ['caribbean', 'electronic'] },
  glossy: { name: l('Polido de rádio', 'Radio gloss'), prod: 9, perf: 0, orig: -4, families: ['pop', 'country_folk'] },
};

const P = (id: string, name: string, signature: ProducerDef['signature'], from: number, to: number, skill: number, fee: number, ego = 40): ProducerDef =>
  ({ id, name, signature, from, to, families: SIGNATURES[signature].families, skill, fee, ego });

/** Produtores fictícios por era (o catálogo de conteúdo pode ampliar esta lista). */
export const PRODUCERS: ProducerDef[] = [
  P('pr_harlan', 'Harlan Voss', 'swing', 1922, 1960, 62, 180),
  P('pr_odete', 'Odete Lacerda', 'organic', 1928, 1972, 66, 160),
  P('pr_bixby', 'Monroe Bixby', 'glossy', 1945, 1985, 70, 400, 55),
  P('pr_spectra', 'Phil Spectrum', 'wall_of_sound', 1958, 1990, 82, 900, 85),
  P('pr_kingsley', 'Ras Kingsley', 'dub', 1965, 2005, 74, 500),
  P('pr_marlowe', 'Iris Marlowe', 'dry', 1966, 2010, 78, 700, 45),
  P('pr_tetsuo', 'Tetsuo Arai', 'maximalist', 1975, 2015, 76, 800, 60),
  P('pr_dumont', 'Céline Dumont', 'glossy', 1978, 2020, 80, 1200, 50),
  P('pr_alby', 'Steve Albanese', 'dry', 1985, 2030, 77, 600, 70),
  P('pr_kwame', 'Kwame Osei', 'organic', 1990, 2035, 72, 650),
  P('pr_lowkey', 'Lowkey Sato', 'lofi', 1995, 2040, 68, 300, 30),
  P('pr_metro', 'Metro Vance', 'trap808', 2005, 2040, 84, 2000, 65),
  P('pr_lux', 'Lux Ferreira', 'maximalist', 2010, 2040, 79, 1500, 55),
  P('pr_nyx', 'NYX-7', 'neural', 2030, 2040, 88, 2500, 10),
  P('pr_aurelia', 'Aurélia Nunes', 'organic', 2015, 2040, 81, 1400, 40),
];

export function availableProducers(s: GameState): ProducerDef[] {
  return PRODUCERS.filter((p) => s.year >= p.from && s.year <= p.to && (p.signature !== 'neural' || hasTech(s, 'synthetic_voice')) && (!prodHooks.ok || prodHooks.ok(s, p)))
    .map((p) => (prodHooks.name ? { ...p, name: prodHooks.name(s, p) } : p));
}

export function producerFit(p: ProducerDef, genre: string): number {
  return p.families.includes(familyOf(genre)) ? 1 : 0.6;
}

// ---------- Sessão de estúdio ----------

export function sessionDays(songs: number, approach: string): number {
  return Math.ceil(songs * (approach === 'meticulous' ? 3 : approach === 'spontaneous' ? 1 : 2));
}

export function sessionCost(s: GameState, songs: number, tier: number, approach: string, producerId?: string): number {
  const pr = PRODUCERS.find((x) => x.id === producerId);
  return recordingCost(s, tier, approach, songs) + (pr ? money(s, (prodHooks.fee ? prodHooks.fee(s, pr) : pr.fee) * songs) : 0);
}

export function startSession(s: GameState, actId: string, songIds: string[], tier: number, approach: string, producerId?: string): StudioSession | L {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (s.sessions.some((x) => x.actId === actId && !x.done)) return l('Já há uma sessão em andamento.', 'A session is already running.');
  const songs = songIds.map((id) => s.songs[id]).filter((x) => x && !x.recorded && x.actId === actId);
  if (!songs.length) return l('Escolha músicas escritas e não gravadas.', 'Pick written, unrecorded songs.');
  if (producerId && (s.producerBusy[producerId] ?? 0) > s.week) return l('Produtor ocupado com outra sessão.', 'Producer busy with another session.');
  const load = Math.min(90, 55 + 5 * songs.length);
  const conflict = checkCapacity(s, activeMembers(s, act), monthIndex(s), 1, load);
  if (conflict) return conflict.text;
  const cost = sessionCost(s, songs.length, tier, approach, producerId);
  if (s.player.cash < cost) return l('Caixa insuficiente para a sessão.', 'Not enough cash for the session.');
  // gravar exige estar na cidade da sede (estúdio externo usa a mesma cidade)
  const home = s.config.homeCity;
  let travel = 0;
  if (s.location[actId] && s.location[actId] !== home) {
    travel = money(s, 300 * act.members.length);
    s.location[actId] = home;
  }
  post(s, `session:${actId}:${songs.map((x) => x.id).join(',').slice(0, 30)}`, -(cost + travel), 'recording', `Sessão de estúdio ${act.name}`);
  const sess: StudioSession = {
    id: nextId(s, 'ss'), actId, songIds: songs.map((x) => x.id), producerId, approach, tier, startDay: s.day + s.clock.dayInMonth,
    days: sessionDays(songs.length, approach), dayDone: 0, takes: {}, costPaid: cost + travel, log: [],
  };
  s.sessions.push(sess);
  s.agenda[actId] = [...(s.agenda[actId] ?? []).filter((x) => x.action !== 'record'), { action: 'session', params: { session: sess.id } }];
  if (producerId) s.producerBusy[producerId] = s.week + Math.ceil(sess.days / 7) + 1;
  const pr0 = PRODUCERS.find((x) => x.id === producerId);
  if (pr0) prodHooks.started?.(s, pr0, sess);
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c && c.party === 'player' && c.model !== 'distribution' && c.model !== 'licensing') c.recoupBalance += Math.round(cost * 0.5);
  return sess;
}

function takeQuality(s: GameState, r: Rng, act: Act, sess: StudioSession, n: number): Take {
  const t = actTalent(s, act);
  const st = actState(s, act);
  const ap = APPROACHES.find((a) => a.id === sess.approach) ?? APPROACHES[1];
  const base = (t.voice * 0.55 + t.instr * 0.45) * 0.92 + act.rehearsed * 0.6 + (st.morale - 50) / 8 - st.fatigue / 12 + ap.perf;
  // primeiros takes aquecem; muitos takes cansam e perdem espontaneidade
  const curve = n === 1 ? -2 : n <= 3 ? 2 : -(n - 3) * 2;
  const q = clamp(base + curve + r.normal(0, 7), 5, 100);
  const note = q > base + 6 ? l('take mágico', 'magic take') : q < base - 6 ? l('desafinou no refrão', 'went off in the chorus') : l('take sólido', 'solid take');
  return { n, quality: Math.round(q), note };
}

/** Um dia de estúdio: um take da faixa da vez; decisão do jogador ou automática. */
export function sessionDay(s: GameState, r: Rng, day: number): void {
  for (const sess of s.sessions) {
    if (sess.done || day < sess.startDay) continue;
    const act = s.acts[sess.actId];
    if (!act) {
      sess.done = true;
      continue;
    }
    if (act.hiatusUntil && act.hiatusUntil > s.week) continue; // afastamento pausa, não cancela
    const songId = sess.songIds.find((id) => !(s.songs[id]?.recorded));
    if (!songId) {
      finishSession(s, r, sess);
      continue;
    }
    if (sess.decision) {
      // decisão sem resposta por dois dias: o produtor escolhe manter
      if (day - sess.startDay - sess.dayDone > 2) resolveTake(s, r, sess.id, 'keep');
      continue;
    }
    const takes = (sess.takes[songId] ??= []);
    const tk = takeQuality(s, r, act, sess, takes.length + 1);
    takes.push(tk);
    sess.dayDone += 1;
    for (const id of act.members) {
      const p = s.persons[id];
      if (p) p.fatigue = clamp(p.fatigue + 1.2, 0, 100);
    }
    const song = s.songs[songId];
    s.daily.push({ day, kind: 'studio', actId: act.id, tone: tk.quality > 70 ? 'good' : tk.quality < 40 ? 'bad' : 'neutral', text: fmtL(l('{a} grava "{s}", take {n}: {q} — {note}.', '{a} records "{s}", take {n}: {q} — {note}.'), { a: act.name, s: song?.title ?? '', n: tk.n, q: tk.quality, note: tk.note }) });
    const delegated = s.delegated[act.id] !== false;
    if (delegated) {
      if (takes.length >= (sess.approach === 'meticulous' ? 3 : sess.approach === 'spontaneous' ? 1 : 2)) resolveTake(s, r, sess.id, 'keep');
    } else sess.decision = { songId, options: takes.length >= 2 ? ['keep', 'another', 'comp'] : ['keep', 'another'] };
  }
}

/** Decisão por take: manter o melhor, tentar outro (custa um dia e cansa) ou montar (comp). */
export function resolveTake(s: GameState, r: Rng, sessionId: string, choice: 'keep' | 'another' | 'comp'): L | null {
  const sess = s.sessions.find((x) => x.id === sessionId);
  if (!sess || sess.done) return l('Sessão encerrada.', 'Session closed.');
  const songId = sess.decision?.songId ?? sess.songIds.find((id) => !s.songs[id]?.recorded);
  if (!songId) return null;
  sess.decision = undefined;
  if (choice === 'another') return null; // próximo dia faz novo take
  const takes = sess.takes[songId] ?? [];
  if (!takes.length) return null;
  let perf = Math.max(...takes.map((t) => t.quality));
  if (choice === 'comp' && takes.length >= 2) {
    const sorted = [...takes].sort((a, b) => b.quality - a.quality);
    perf = Math.round(sorted[0].quality * 0.7 + sorted[1].quality * 0.3 + 3);
    sess.days += 1; // edição leva um dia
  }
  fixSong(s, r, sess, songId, perf);
  return null;
}

function fixSong(s: GameState, r: Rng, sess: StudioSession, songId: string, perf: number): void {
  const song = s.songs[songId];
  const act = s.acts[sess.actId];
  if (!song || !act) return;
  const t = actTalent(s, act);
  const ap = APPROACHES.find((a) => a.id === sess.approach) ?? APPROACHES[1];
  const studio = STUDIO_TIERS[clamp(sess.tier, 0, 3)];
  const pr = PRODUCERS.find((x) => x.id === sess.producerId);
  const sig = pr ? soundOf(pr) : undefined;
  const fit = pr ? producerFit(pr, song.genre) : 1;
  const own = sess.tier === 0 ? ownStudioProduction(s) + 2 : 0;
  const prodSkill = pr ? pr.skill * 0.25 * fit : staffSkill(s, 'producer') * 0.22;
  const engineerFix = staffSkill(s, 'engineer') / 25;
  const techIssue = r.chance(Math.max(0.02, 0.12 - engineerFix * 0.03)) ? -r.int(4, 12) : 0;
  song.performance = clamp(perf + (sig?.perf ?? 0) * fit, 5, 100);
  song.production = clamp(eraProductionBase(s) + studio.production + own + prodSkill + t.prod * 0.18 + ap.prod + (sig?.prod ?? 0) * fit + techIssue + r.normal(0, 4), 5, 100);
  song.originality = clamp(song.originality + ap.originality + (sig?.orig ?? 0), 0, 100);
  // ego do produtor: briga com artistas teimosos
  if (pr && pr.ego > 70 && act.members.some((id) => s.persons[id]?.traits.includes('big_ego'))) {
    for (const id of act.members) if (s.persons[id]) s.persons[id].stress = clamp(s.persons[id].stress + 6, 0, 100);
    sess.log.push(fmtL(l('{p} e a banda discutiram sobre o arranjo.', '{p} and the band argued over the arrangement.'), { p: pr.name }));
  }
  song.q = songQ(song);
  // sem produtor de fora, a equipe da casa (especialistas, química) assina a faixa
  if (!pr) song.q = applyMods(s, 'songQ', song.q, { song, act }).value;
  song.recorded = true;
  song.studioTier = sess.tier;
  song.approach = sess.approach;
  song.producerId = pr?.id;
  sess.log.push(fmtL(l('"{s}" fechada: Q {q}.', '"{s}" done: Q {q}.'), { s: song.title, q: Math.round(song.q) }));
}

function finishSession(s: GameState, _r: Rng, sess: StudioSession): void {
  sess.done = true;
  const act = s.acts[sess.actId];
  if (!act) return;
  act.rehearsed = 0;
  const songs = sess.songIds.map((id) => s.songs[id]).filter((x) => x?.recorded);
  const avg = songs.reduce((t, x) => t + x.q, 0) / Math.max(1, songs.length);
  notify(s, fmtL(l('Sessão de {a} terminou: {n} faixa(s), Q média {q}.', '{a}\'s session wrapped: {n} track(s), average Q {q}.'), { a: act.name, n: songs.length, q: Math.round(avg) }), 'good');
  remember(s, 'session', fmtL(l('{a} conclui sessão de estúdio{p}.', '{a} wraps a studio session{p}.'), { a: act.name, p: sess.producerId ? fmtL(l(' com {x}', ' with {x}'), { x: (() => { const q = PRODUCERS.find((x) => x.id === sess.producerId); return q ? (prodHooks.name?.(s, q) ?? q.name) : ''; })() }) : '' }), { actId: act.id });
  s.agenda[act.id] = (s.agenda[act.id] ?? []).filter((x) => x.action !== 'session');
}

export function cancelSession(s: GameState, sessionId: string): void {
  const sess = s.sessions.find((x) => x.id === sessionId);
  if (!sess || sess.done) return;
  sess.done = true; // gravações feitas ficam; investimento não volta (GDD §34)
  s.agenda[sess.actId] = (s.agenda[sess.actId] ?? []).filter((x) => x.action !== 'session');
}

// ---------- Samples e interpolações ----------

export function requestSample(s: GameState, r: Rng, songId: string, sourceSongId: string, kind: 'sample' | 'interpolation'): SampleRequest | L {
  const song = s.songs[songId];
  const src = s.songs[sourceSongId];
  if (!song || !src) return l('Faixa inválida.', 'Invalid track.');
  if (song.recorded) return l('Samples entram antes da gravação.', 'Samples go in before recording.');
  const srcAct = s.acts[src.actId];
  const fee = srcAct?.owner === 'player' ? 0 : money(s, (kind === 'sample' ? 2500 : 1200) + (srcAct?.fame ?? 0) * 120);
  const share = kind === 'sample' ? 0.35 : 0.2;
  const req: SampleRequest = { id: nextId(s, 'smp'), songId, sourceSongId, kind, fee, share, status: 'pending' };
  s.samples.push(req);
  song.sampleOf = sourceSongId;
  song.melody = clamp(song.melody + (kind === 'sample' ? 6 : 4), 0, 100);
  song.originality = clamp(song.originality - (kind === 'sample' ? 4 : 2), 0, 100);
  song.q = songQ({ ...song, performance: song.melody * 0.6, production: 30 });
  // resposta do detentor: dono do master rival pesa rivalidade; espólio pesa valor
  const holder = srcAct?.owner;
  let pDeny = 0.15;
  if (holder && holder !== 'player') pDeny += (s.rivalries[holder] ?? 0) / 200;
  if (srcAct?.deceased) pDeny += 0.15;
  if (holder === 'player') pDeny = 0;
  if (r.chance(pDeny)) req.status = 'denied';
  else if (s.player.cash >= fee) {
    if (fee) post(s, `sample:${req.id}`, -fee, 'rights', `Liberação de sample`);
    req.status = 'cleared';
  } else req.status = 'uncleared';
  return req;
}

/** Usar sample negado/não liberado num lançamento abre risco de processo (lawsuits). */
export function unclearedSamples(s: GameState, songIds: string[]): SampleRequest[] {
  return s.samples.filter((x) => songIds.includes(x.songId) && x.status !== 'cleared');
}

// ---------- Covers, remixes, versões, tributos ----------

function cloneSong(s: GameState, act: Act, base: Song, patch: Partial<Song>): Song {
  const song: Song = {
    ...base,
    id: nextId(s, 's'),
    actId: act.id,
    recorded: false,
    releaseId: undefined,
    createdWeek: s.week,
    performance: 0,
    production: 0,
    splits: undefined,
    ...patch,
  };
  song.q = songQ({ ...song, performance: song.melody * 0.6, production: 30 });
  s.songs[song.id] = song;
  act.songs.push(song.id);
  return song;
}

/** Cover: nova gravação de composição alheia; a edição continua com os autores originais. */
export function makeCover(s: GameState, actId: string, sourceSongId: string): Song | L {
  const act = s.acts[actId];
  const src = s.songs[sourceSongId];
  if (!act || !src) return l('Inválido.', 'Invalid.');
  const fee = money(s, 300);
  if (s.player.cash < fee) return l('Caixa insuficiente para a licença mecânica.', 'Not enough cash for the mechanical license.');
  post(s, `cover:${act.id}:${src.id}`, -fee, 'rights', `Licença de cover "${src.title}"`);
  return cloneSong(s, act, src, { coverOf: src.id, originality: clamp(src.originality - 15, 0, 100), genre: act.genre, writers: src.writers, splits: src.splits });
}

/** Remix: mesma composição, nova produção, normalmente por DJ/produtor. */
export function makeRemix(s: GameState, sourceSongId: string, remixerActId?: string): Song | L {
  const src = s.songs[sourceSongId];
  if (!src || !src.recorded) return l('Só faixas gravadas.', 'Recorded tracks only.');
  const act = s.acts[remixerActId ?? src.actId];
  if (!act) return l('Inválido.', 'Invalid.');
  const song = cloneSong(s, act, src, { remixOf: src.id, title: `${src.title} (Remix)`, originality: clamp(src.originality + 5, 0, 100), writers: src.writers, splits: src.splits });
  song.performance = src.performance;
  return song;
}

/** Versão em outro idioma: amplia alcance no mercado do idioma; letra perde um pouco. */
export function makeTranslation(s: GameState, r: Rng, sourceSongId: string, lang: string): Song | L {
  const src = s.songs[sourceSongId];
  if (!src) return l('Inválido.', 'Invalid.');
  const act = s.acts[src.actId];
  const cost = money(s, 600);
  if (s.player.cash < cost) return l('Caixa insuficiente para a versão.', 'Not enough cash for the adaptation.');
  post(s, `transl:${src.id}:${lang}`, -cost, 'rights', `Versão em ${lang}`);
  return cloneSong(s, act, src, { translationOf: src.id, lang, lyrics: clamp(src.lyrics * 0.9 + r.normal(0, 4), 5, 100), title: `${songTitle(r, lang as ReturnType<typeof actLang>)} (${src.title})`, writers: src.writers });
}

/** Disco-tributo: atos do jogador regravam o repertório de um homenageado. */
export function planTribute(s: GameState, honoreeActId: string, actIds: string[]): Song[] | L {
  const hon = s.acts[honoreeActId];
  if (!hon) return l('Inválido.', 'Invalid.');
  const base = hon.songs.map((id) => s.songs[id]).filter((x) => x?.releaseId).slice(0, Math.max(6, actIds.length));
  if (base.length < 6) return l('O homenageado precisa de ao menos 6 músicas lançadas.', 'The honoree needs at least 6 released songs.');
  const out: Song[] = [];
  base.forEach((src, i) => {
    const act = s.acts[actIds[i % actIds.length]];
    if (!act) return;
    const so = cloneSong(s, act, src, { coverOf: src.id, writers: src.writers, splits: src.splits, originality: clamp(src.originality - 8, 0, 100) });
    s.flags[`tribute:${so.id}`] = 1;
    out.push(so);
  });
  remember(s, 'tribute', fmtL(l('Começa a gravação de um tributo a {a}.', 'Recording begins on a tribute to {a}.'), { a: hon.name }), { actId: hon.id, important: true });
  return out;
}

export function studioCleanup(s: GameState): void {
  s.sessions = s.sessions.filter((x) => !x.done || s.day - x.startDay < 90).slice(-20);
  if (s.daily.length > 160) s.daily.splice(0, s.daily.length - 160);
  if (s.samples.length > 80) s.samples = s.samples.slice(-80);
}
