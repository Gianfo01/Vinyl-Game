// Composição, gravação e preparação de lançamentos (GDD §12, §13).

import { addRecoup18, recoup } from './sys/contracts18';
import { coverCost } from './covers';
import { clamp, type Rng } from '../core/rng';
import { APPROACHES, EQUIPMENT, FORMATS, STUDIO_TIERS, type FormatId } from '../data/rules';
import { l, type L, type MarketId } from '../data/world';
import { actLang, actState, actTalent, songTitle, traitMod } from './people';
import type { Act, Dir21, GameState, PendingRelease, Release, Song } from './types';
import { fmtL, hasCard, hasTech, money, nextId, notify, post, staffSkill } from './util';
import { forecastUnits } from './market';
import { hqCaps } from './branches';
import { takeIdea } from './repertoire';
import { applyMods, LATE21, runSimHooks } from './ext4';
import { settleVocals } from './sys/vocals10';
import { cashWhy20, freeCash20 } from './oblig20';

export function songQ(song: Pick<Song, 'melody' | 'lyrics' | 'performance' | 'production' | 'originality'> & { instrumental?: boolean }): number {
  // Qualidade Q (GDD §12): 0,25 melodia + 0,20 letra + 0,25 performance + 0,20 produção + 0,10 originalidade
  // rodada 10: instrumental — a letra não conta; os outros pesos são renormalizados
  if (song.instrumental) return (0.25 * song.melody + 0.25 * song.performance + 0.2 * song.production + 0.1 * song.originality) / 0.8;
  return 0.25 * song.melody + 0.2 * song.lyrics + 0.25 * song.performance + 0.2 * song.production + 0.1 * song.originality;
}

/** r21 (E-7): fonte de verdade de Q. Faixa só escrita usa performance e produção estimadas; faixa gravada
 *  recalcula pelos atributos e soma de volta o bônus de perks (`qBonus`, fixado em closeTrack). */
export function refreshQ(song: Song): number {
  song.q = song.recorded
    ? clamp(songQ(song) + (song.qBonus ?? 0), 0, 100)
    : songQ({ ...song, performance: song.melody * 0.6, production: 30 });
  return song.q;
}

export function composeSongs(s: GameState, r: Rng, act: Act, n: number): Song[] {
  const t = actTalent(s, act);
  const st = actState(s, act);
  const out: Song[] = [];
  const writers = act.members
    .map((id) => s.persons[id])
    .filter(Boolean)
    .sort((a, b) => b.skills.comp - a.skills.comp)
    .slice(0, act.members.length > 2 ? 2 : 1)
    .map((p) => p.id);
  const sceneKey = `${act.city}:${act.genre}`;
  const saturation = clamp((s.scenes[sceneKey] ?? 0) / 40, 0, 0.5);
  for (let i = 0; i < n; i++) {
    const insp = (st.inspiration - 50) / 5;
    const melody = clamp(t.comp * 0.85 + insp + r.normal(0, 8) + traitMod(s, act, 'quality'), 5, 100);
    const lyrics = clamp(t.lyr * 0.85 + insp * 0.6 + r.normal(0, 8), 5, 100);
    const originality = clamp(35 + traitMod(s, act, 'originality') + st.inspiration * 0.3 - saturation * 40 + r.normal(0, 10) + (act.archetype === 'genius' ? 20 : 0), 5, 100);
    const idea = takeIdea(s, act.id);
    const ib = idea ? idea.strength : 0;
    const song: Song = {
      id: nextId(s, 's'),
      actId: act.id,
      title: songTitle(r, actLang(act)),
      genre: act.genre,
      writers,
      melody: clamp(melody + ib * 0.4, 5, 100), lyrics: clamp(lyrics + ib * 0.8, 5, 100), performance: 0, production: 0, originality: clamp(originality + ib * 0.6, 5, 100),
      theme: idea?.theme,
      q: 0,
      recorded: false,
      createdWeek: s.week,
      synthetic: act.archetype === 'synthetic',
    };
    s.songs[song.id] = song;
    settleVocals(s, song);
    refreshQ(song);
    act.songs.push(song.id);
    out.push(song);
    runSimHooks('compose', s, r, { song });
  }
  for (const id of act.members) {
    const p = s.persons[id];
    if (p) p.inspiration = clamp(p.inspiration - 8 * n, 0, 100);
  }
  return out;
}

export function ownStudioProduction(s: GameState): number {
  // sede: equipamento instalado (precisa de engenheiro se marcado)
  const hasEng = s.player.staff.some((x) => x.role === 'engineer');
  let v = 0;
  for (const id of s.player.equipment) {
    const def = EQUIPMENT.find((e) => e.id === id);
    if (!def) continue;
    if (def.needsEngineer && !hasEng) continue;
    v += def.effect.production ?? 0;
  }
  return v;
}

/** r21 (1.17): equipamento da sede que melhora a execução (câmara de eco) — só no estúdio próprio (tier 0). */
export function ownStudioPerformance(s: GameState): number {
  let v = 0;
  for (const id of s.player.equipment) v += EQUIPMENT.find((e) => e.id === id)?.effect.performance ?? 0;
  return v;
}

/** r21 (1.17): preservação do acervo (cofre de masters, arquivo digital): fração somada à qualidade de remasters e reedições. */
export function catalogPreservation(s: GameState): number {
  let v = 0;
  for (const id of s.player.equipment) v += EQUIPMENT.find((e) => e.id === id)?.effect.catalog ?? 0;
  return v;
}

export function eraProductionBase(s: GameState): number {
  let v = 22;
  if (hasTech(s, 'electric_rec')) v += 6;
  if (hasTech(s, 'multitrack')) v += 6;
  if (hasTech(s, 'synth')) v += 4;
  if (hasTech(s, 'daw')) v += 6;
  if (hasTech(s, 'streaming')) v += 3;
  return v;
}

export function recordingCost(s: GameState, tier: number, approach: string, songs: number): number {
  const st = STUDIO_TIERS[tier];
  const ap = APPROACHES.find((a) => a.id === approach) ?? APPROACHES[1];
  return money(s, (st.cost * Math.max(1, songs / 3) + 150 * songs) * ap.costMult);
}

/** r21 (E-1): contexto de uma gravação — o mesmo para a agenda (`recordSongs`) e para a sessão de estúdio (`fixSong`). */
export interface CloseTrackCtx {
  tier: number;
  approach: string;
  /** execução já decidida (take escolhido ou base do ato); a assinatura do produtor entra aqui dentro */
  perf: number;
  /** produtor de fora (sessão de estúdio) */
  producer?: { id: string; skill: number; fit: number; sound?: { prod: number; perf: number; orig: number } };
  payer?: 'player' | 'act' | string;
}

/** r21 (E-1): UMA função de gravação. Calcula produção/execução/originalidade com uma fórmula, aplica os perks
 *  (`songQ`) da equipe da casa, grava tier/abordagem/produtor/semana e dispara o gancho `'record'`. */
export function closeTrack(s: GameState, r: Rng, act: Act, song: Song, ctx: CloseTrackCtx): void {
  const payer = ctx.payer ?? 'player';
  const t = actTalent(s, act);
  const ap = APPROACHES.find((a) => a.id === ctx.approach) ?? APPROACHES[1];
  const studio = STUDIO_TIERS[clamp(ctx.tier, 0, 3)];
  const pr = ctx.producer;
  const sig = pr?.sound;
  const fit = pr?.fit ?? 1;
  const own = payer === 'player' && ctx.tier === 0 ? ownStudioProduction(s) + 2 : 0;
  const prodSkill = pr ? pr.skill * 0.25 * fit : payer === 'player' ? staffSkill(s, 'producer') * 0.22 : 8 + ctx.tier * 2;
  const engineerFix = payer === 'player' ? staffSkill(s, 'engineer') / 25 : 2;
  const showman = hasCard(s, 'showman') && payer === 'player' ? -3 : 0;
  const techIssue = r.chance(Math.max(0.02, 0.12 - engineerFix * 0.03)) ? -r.int(4, 12) : 0;
  settleVocals(s, song);
  song.performance = clamp(ctx.perf + (sig?.perf ?? 0) * fit, 5, 100);
  song.production = clamp(eraProductionBase(s) + studio.production + own + prodSkill + t.prod * 0.18 + ap.prod + (sig?.prod ?? 0) * fit + techIssue + showman + r.normal(0, 5), 5, 100);
  song.originality = clamp(song.originality + ap.originality + (sig?.orig ?? 0), 0, 100);
  song.recorded = true;
  song.recordedWeek = s.week;
  song.studioTier = ctx.tier;
  song.approach = ctx.approach;
  song.producerId = pr?.id;
  song.qBonus = 0;
  // sem produtor de fora, a equipe da casa (especialistas, química) assina a faixa; os perks que mexem nos atributos
  // (ex.: engenheiro da casa em song.production) entram pelo recálculo; os que só mexem em Q ficam em qBonus
  if (payer === 'player' && !pr) {
    const q0 = songQ(song);
    const q1 = applyMods(s, 'songQ', q0, { song, act }).value;
    song.qBonus = Math.round((q1 - q0) * 100) / 100;
  }
  refreshQ(song);
  runSimHooks('record', s, r, { song });
  refreshQ(song); // ganchos podem ter mexido nos atributos
}

/** Grava as músicas escritas. tier 0 = estúdio da sede (se houver salas). */
export function recordSongs(s: GameState, r: Rng, act: Act, songIds: string[], tier: number, approach: string, payer: 'player' | 'act' | string = 'player'): { cost: number; songs: Song[] } {
  const t = actTalent(s, act);
  const st = actState(s, act);
  const ap = APPROACHES.find((a) => a.id === approach) ?? APPROACHES[1];
  const cost = recordingCost(s, tier, approach, songIds.length);
  const gear = payer === 'player' && tier === 0 ? ownStudioPerformance(s) : 0;
  const done: Song[] = [];
  for (const id of songIds) {
    const song = s.songs[id];
    if (!song || song.recorded) continue;
    settleVocals(s, song);
    // instrumental: a execução depende dos instrumentos, não da voz
    const perfBase = (song.instrumental ? t.instr * 0.9 + t.voice * 0.1 : t.voice * 0.55 + t.instr * 0.45) * 0.92 + act.rehearsed * 0.6;
    const mood = (st.morale - 50) / 8 - st.fatigue / 12;
    const perf = perfBase + mood + ap.perf + gear + r.normal(0, 6);
    closeTrack(s, r, act, song, { tier, approach, perf, payer });
    done.push(song);
  }
  act.rehearsed = 0;
  // r21 (1.14): chave com id único — duas gravações do mesmo ato na mesma semana cobram as duas
  if (payer === 'player' && cost > 0) post(s, `rec:${act.id}:${nextId(s, 'rec')}`, -cost, 'recording', `Gravação ${act.name}`);
  else if (payer === 'act') act.cash -= cost;
  else if (s.labels[payer]) s.labels[payer].cash -= cost;
  // custo de gravação é recuperável no contrato clássico
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c && payer !== 'act') addRecoup18(s, c, 'rec', cost); // r18: fração negociada nas cláusulas (antes 50% fixo)
  return { cost, songs: done };
}

// ---------- Lançamentos ----------

export function availableFormats(s: GameState): FormatId[] {
  const out: FormatId[] = [];
  for (const f of FORMATS) {
    if (f.id === 'airplay' || f.id === 'sheet') continue;
    if (f.id === 'shellac' && s.year < (s.techDates.disc ?? 0)) continue; // r18 era1889: disco só depois de Berliner
    if (f.id === 'piano_roll' && (s.year < 1896 || s.year > 1931)) continue;
    if (f.tech && !hasTech(s, f.tech)) continue;
    if (f.until && hasTech(s, f.until, s.year - (f.id === 'shellac' ? 6 : f.id === 'cylinder' ? 4 : 8))) continue;
    if (f.id === 'cassette' && s.divergence.format80 === 'cassette' && hasTech(s, 'download', s.year - 10)) continue;
    out.push(f.id);
  }
  if (!out.length) out.push(s.year < (s.techDates.disc ?? 0) ? 'cylinder' : 'shellac');
  return out;
}

export function physicalShare(s: GameState, year = s.year): number {
  // GDD §13: 80% antes de 1995, 35% até 2009, 8% a partir de 2010 (atrelado às tecnologias)
  let p: number;
  if (s.techDates.streaming !== undefined && year >= s.techDates.streaming + 2) p = 0.08;
  else if (s.techDates.download !== undefined && year >= s.techDates.download) p = 0.35;
  else if (s.techDates.p2p !== undefined && year >= s.techDates.p2p) p = 0.55;
  else p = year < 1905 ? 0.5 : year < 1915 ? 0.6 : year < 1920 ? 0.7 : 0.8; // r18 era1889: antes do rádio a partitura é metade do negócio
  // revival do vinil
  if (s.techDates.streaming !== undefined && year >= s.techDates.streaming + 4) p += 0.03;
  return p;
}

export function suggestedPress(s: GameState, act: Act, type: 'single' | 'ep' | 'lp', q = 50): number {
  const f = forecastUnits(s, act, type, q, [], s.player.territories);
  return Math.max(300, Math.round((f.mid * physicalShare(s)) / 100) * 100);
}

export function pressingCost(s: GameState, formats: FormatId[], units: number): number {
  const phys = formats.map((f) => FORMATS.find((x) => x.id === f)!).filter((f) => f.physical);
  if (!phys.length || units <= 0) return 0;
  const unit = phys.reduce((t, f) => t + f.unitCost, 0) / phys.length;
  let discount = 0;
  for (const id of s.player.equipment) discount += EQUIPMENT.find((e) => e.id === id)?.effect.pressing ?? 0;
  discount += staffSkill(s, 'manufacturing') / 400;
  if (hasCard(s, 'manufacturer')) discount += 0.1;
  // r18 final (balanço): tiragem grande sai mais barata por unidade (economia de escala real das fábricas):
  // até −20% a partir de ~150 mil unidades
  discount += Math.min(0.2, Math.max(0, Math.log10(Math.max(1, units) / 10000)) * 0.17);
  discount = Math.min(0.5, discount);
  return Math.round(applyMods(s, 'pressingCost', money(s, (unit * units * (1 - discount) * (s.flags.geoPressing ?? 1)) + 400), { formats }).value);
}

export interface ReleasePlan {
  actId: string;
  type: 'single' | 'ep' | 'lp';
  songs: string[];
  title?: string;
  formats: FormatId[];
  press: number;
  marketing: { channel: string; budget: number }[];
  territories: MarketId[];
  weeksAhead: number;
  reissueOf?: string;
  kind?: Release['kind'];
  hype?: number;
  rolloutId?: string;
  /** rodada 8: proposta de capa escolhida */
  cover?: { style: string; seed: number };
  /** r21e: direção do disco (master, faixa-título, single de trabalho, lado B) */
  dir21?: Dir21;
}

export function validateRelease(s: GameState, p: ReleasePlan): L | null {
  const act = s.acts[p.actId];
  if (!act || act.owner !== 'player') return l('Ato não é seu.', 'Not your act.');
  const need = p.type === 'single' ? 1 : p.type === 'ep' ? 3 : 7;
  if (!p.reissueOf && p.songs.length < need) return fmtL(l('{t} precisa de {n} música(s) gravada(s).', '{t} needs {n} recorded song(s).'), { t: p.type.toUpperCase(), n: need });
  if (p.songs.some((id) => !s.songs[id]?.recorded || (s.songs[id].releaseId && !p.reissueOf && p.kind !== 'compilation' && !s.flags[`extracted:${id}`]))) return l('Use apenas músicas gravadas e inéditas.', 'Use only recorded, unreleased songs.');
  if (!p.formats.length) return l('Escolha ao menos um formato.', 'Pick at least one format.');
  // r21 (1.16): formato que a era não oferece não entra no plano
  const avail = availableFormats(s);
  if (p.formats.some((f) => !avail.includes(f))) return l('Formato indisponível nesta época.', 'Format not available in this era.');
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c && c.party !== 'player' && act.playerBand) return null;
  const cost = releaseCost(s, p);
  if (freeCash20(s) < cost) return cashWhy20(s, cost, l('Caixa insuficiente para fabricação e marketing.', 'Not enough cash for manufacturing and marketing.'));
  return null;
}

/** Banda do jogador contratada por um rival: o selo paga a fabricação e recupera depois. */
export function labelFunded(s: GameState, actId: string): boolean {
  const act = s.acts[actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  return !!(act?.playerBand && c && c.party !== 'player');
}

export function releaseCost(s: GameState, p: ReleasePlan): number {
  const press = labelFunded(s, p.actId) ? 0 : pressingCost(s, p.formats, p.press);
  return press + p.marketing.reduce((t, m) => t + m.budget, 0) + coverCost(s, p.cover?.style);
}

export function scheduleRelease(s: GameState, r: Rng, p: ReleasePlan): PendingRelease | L {
  const err = validateRelease(s, p);
  if (err) return err;
  const act = s.acts[p.actId];
  const title = p.title?.trim() || (p.type === 'single' ? s.songs[p.songs[0]]?.title : songTitle(r, actLang(act)));
  const pr: PendingRelease = {
    id: nextId(s, 'pr'),
    actId: p.actId,
    type: p.type,
    songs: p.songs,
    title: title ?? 'Untitled',
    formats: p.formats,
    press: p.press,
    marketing: p.marketing.filter((m) => m.budget > 0),
    territories: p.territories,
    week: s.week + Math.max(1, p.weeksAhead),
    reissueOf: p.reissueOf,
    kind: p.kind,
    hype: p.hype,
    rolloutId: p.rolloutId,
    cover: p.cover,
    dir21: p.dir21 ? { ...p.dir21 } : undefined,
  };
  // custo pago na programação (cancelar antes do lançamento devolve; GDD §27 "cancelar não cobra")
  const cost = releaseCost(s, p);
  post(s, `relplan:${pr.id}`, -cost, 'release', `Lançamento ${pr.title}`);
  if (labelFunded(s, p.actId)) {
    const c = s.contracts[act.contractId!];
    const press = pressingCost(s, p.formats, p.press);
    recoup(s, c, 'adv', press); // r21 (H-9): único gravador do recuperável (prensagem bancada pelo selo é adiantamento)
    if (s.labels[c.party]) s.labels[c.party].cash -= press;
  }
  // reedição (deluxe, aniversário): só faixas ainda inéditas (bônus) ganham o lançamento
  for (const id of p.songs) if (s.songs[id] && (!p.reissueOf || !s.songs[id].releaseId) && p.kind !== 'compilation') s.songs[id].releaseId = pr.id;
  s.pendingReleases.push(pr);
  notify(s, fmtL(l('{title} programado para a semana {w}.', '{title} scheduled for week {w}.'), { title: pr.title, w: pr.week }), 'info');
  return pr;
}

/** r21 (E-11): o que volta ao cancelar — prensagem, marketing E a capa ("cancelar não cobra", GDD §27). */
export function pendingRefund(s: GameState, pr: PendingRelease): number {
  return (labelFunded(s, pr.actId) ? 0 : pressingCost(s, pr.formats, pr.press)) + pr.marketing.reduce((t, m) => t + m.budget, 0) + coverCost(s, pr.cover?.style);
}

export function cancelRelease(s: GameState, id: string): boolean {
  const pr = s.pendingReleases.find((x) => x.id === id);
  if (!pr) return false;
  const cost = pendingRefund(s, pr);
  post(s, `relcancel:${pr.id}`, cost, 'release', `Cancelado ${pr.title}`);
  for (const sid of pr.songs) if (s.songs[sid]?.releaseId === pr.id) s.songs[sid].releaseId = undefined;
  s.pendingReleases = s.pendingReleases.filter((x) => x !== pr);
  return true;
}

export function unreleasedRecorded(s: GameState, act: Act): Song[] {
  return act.songs.map((id) => s.songs[id]).filter((x) => x && x.recorded && !x.releaseId && !s.flags[`ro:${x.id}`] && !x.vault);
}

export function unrecorded(s: GameState, act: Act): Song[] {
  return act.songs.map((id) => s.songs[id]).filter((x) => x && !x.recorded);
}

export function recordingSessionsAvailable(s: GameState): number {
  return hqCaps(s).sessions;
}

export function notifyRecorded(s: GameState, act: Act, n: number, q: number): void {
  notify(s, fmtL(l('{act} gravou {n} faixa(s); Q média {q}.', '{act} recorded {n} track(s); average Q {q}.'), { act: act.name, n, q: Math.round(q) }), 'info');
}
LATE21.pressingCost = (s, formats, units) => pressingCost(s, formats as FormatId[], units);
