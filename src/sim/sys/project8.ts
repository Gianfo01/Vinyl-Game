// Projeto musical (rodada 8): um lugar só para conduzir um disco inteiro — artista, conceito e meta;
// faixas e etapa de produção; orçamento comprometido contra o caixa; produtor e participações; capa,
// divulgação e calendário; e, depois do lançamento, resultado e próximos passos.
// O projeto não cria mecânicas novas: amarra as que já existem (composição e gravação pela agenda,
// sessão de estúdio com produtor, parcerias, capa entre três propostas, rollout, lançamento programado).
// A etapa é derivada do estado do jogo, então o save guarda só as escolhas do jogador.

import type { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { defaultAgenda, setAgenda, slotCost, slotsFor, usedSlots } from '../agenda';
import { coverCost, coverOptions } from '../covers';
import { registerExt4, registerSimHook } from '../ext4';
import { availableChannels, forecastUnits } from '../market';
import { availableFormats, cancelRelease, labelFunded, releaseCost, pressingCost, scheduleRelease, suggestedPress, type ReleasePlan } from '../production';
import { canPresave, canVideo, planRollout } from '../rollout';
import { isDiscarded, songProfile } from '../repertoire';
import { PRODUCERS, sessionCost, startSession } from '../studio';
import type { Act, AgendaSlot, GameState, Release, ReleaseType, Song } from '../types';
import { fmtL, money, nextId, playerActs, remember } from '../util';
import { featureFee, inviteFeature } from './creation/core';

/** Convidado já gravado na faixa (leitura sem criar registro no save). */
export const featOf = (s: GameState, songId: string): string | undefined => s.x4.creation.songs[songId]?.featuring;

export type ProjStage = 'concept' | 'writing' | 'recording' | 'finishing' | 'scheduled' | 'released' | 'followup';
export const STAGES: ProjStage[] = ['concept', 'writing', 'recording', 'finishing', 'scheduled', 'released', 'followup'];
export const STAGE_NAMES: Record<ProjStage, L> = {
  concept: l('Conceito', 'Concept'),
  writing: l('Composição', 'Writing'),
  recording: l('Gravação', 'Recording'),
  finishing: l('Mixagem e capa', 'Mixing and cover'),
  scheduled: l('Programado', 'Scheduled'),
  released: l('Lançado', 'Released'),
  followup: l('Balanço', 'Follow-up'),
};

export type ProjGoal = 'hit' | 'critics' | 'fans' | 'profit' | 'scene';
export const GOALS: Record<ProjGoal, { name: L; desc: L }> = {
  hit: { name: l('Emplacar um hit', 'Land a hit'), desc: l('Meta: chegar ao top 10.', 'Goal: reach the top 10.') },
  critics: { name: l('Conquistar a crítica', 'Win the critics'), desc: l('Meta: nota da crítica 75+.', 'Goal: critic score 75+.') },
  fans: { name: l('Crescer a base de fãs', 'Grow the fan base'), desc: l('Meta: +25% de fãs ativos e fiéis.', 'Goal: +25% active and core fans.') },
  profit: { name: l('Dar lucro', 'Turn a profit'), desc: l('Meta: a receita do disco paga o que o projeto gastou.', 'Goal: the record\'s revenue covers what the project spent.') },
  scene: { name: l('Fortalecer a cena', 'Strengthen the scene'), desc: l('Meta: a cena da cidade no gênero cresce.', 'Goal: the city\'s scene in the genre grows.') },
};

export interface ConceptDef { id: string; name: L; desc: L; goal: ProjGoal; cover: string }
export const CONCEPTS: ConceptDef[] = [
  { id: 'debut', name: l('Cartão de visitas', 'Calling card'), desc: l('Apresentar o artista: canções diretas, capa com o rosto.', 'Introduce the act: direct songs, a face on the cover.'), goal: 'fans', cover: 'portrait' },
  { id: 'radio', name: l('Feito para o rádio', 'Made for radio'), desc: l('Refrões fortes e divulgação pesada atrás de um hit.', 'Strong choruses and heavy promotion chasing a hit.'), goal: 'hit', cover: 'portrait' },
  { id: 'art', name: l('Obra autoral', 'Artistic statement'), desc: l('Originalidade acima de tudo; crítica como alvo.', 'Originality above all; critics as the target.'), goal: 'critics', cover: 'concept' },
  { id: 'roots', name: l('Raízes e cena local', 'Roots and local scene'), desc: l('Disco da cidade: fortalece a cena e a base fiel.', 'A record of the city: boosts the scene and the core base.'), goal: 'scene', cover: 'scene' },
  { id: 'reinvent', name: l('Reinvenção', 'Reinvention'), desc: l('Mudar de pele: risco alto, imprensa curiosa.', 'Change skin: high risk, curious press.'), goal: 'critics', cover: 'provocative' },
  { id: 'budget', name: l('Enxuto e lucrativo', 'Lean and profitable'), desc: l('Gastar pouco e vender bem: gravação rápida, capa barata.', 'Spend little and sell well: quick recording, cheap cover.'), goal: 'profit', cover: 'diy' },
];
export const conceptById = Object.fromEntries(CONCEPTS.map((c) => [c.id, c])) as Record<string, ConceptDef>;

export interface MusicProject {
  id: string;
  actId: string;
  title: string;
  type: ReleaseType;
  concept: string;
  goal: ProjGoal;
  songIds: string[];
  /** completa sozinho com músicas novas do artista até o necessário */
  auto: boolean;
  producerId?: string;
  tier: number;
  approach: string;
  guestId?: string;
  marketing: { channel: string; budget: number }[];
  cover?: { style: string; seed: number };
  coverRound: number;
  weeksAhead: number;
  /** teto de orçamento definido pelo jogador (centavos; 0 = sem teto) */
  budget: number;
  /** quanto o projeto já gastou (centavos) */
  spent: number;
  created: number;
  /** fãs (ativos + fiéis) e força da cena no início, para avaliar a meta */
  fans0: number;
  scene0: number;
  pendingId?: string;
  rolloutId?: string;
  releaseId?: string;
  closed?: boolean;
}

export interface Proj8State { list: MusicProject[] }
declare module '../ext4' { interface Ext4 { proj8: Proj8State } }
registerExt4('proj8', () => ({ list: [] }));
export const proj8 = (s: GameState): Proj8State => (s as unknown as { x4: { proj8: Proj8State } }).x4.proj8;

export const needSongs = (type: ReleaseType): number => (type === 'single' ? 1 : type === 'ep' ? 3 : 7);
export const maxSongs = (type: ReleaseType): number => (type === 'single' ? 2 : type === 'ep' ? 6 : 14);
const fansOf = (a: Act): number => a.fans.active + a.fans.core;
const sceneOf = (s: GameState, a: Act): number => s.scenes[`${a.city}:${a.genre}`] ?? 0;

export function projectById(s: GameState, id: string): MusicProject | undefined {
  return proj8(s).list.find((p) => p.id === id);
}

/** Projetos abertos (de atos que ainda são do jogador). */
export function openProjects(s: GameState, actId?: string): MusicProject[] {
  return proj8(s).list.filter((p) => !p.closed && (!actId || p.actId === actId));
}

function isMine(s: GameState, actId: string): boolean {
  const a = s.acts[actId];
  return !!a && (a.owner === 'player' || !!a.playerBand);
}

/** Músicas usadas por outros projetos abertos. */
function takenElsewhere(s: GameState, p: MusicProject | null): Set<string> {
  return new Set(openProjects(s).filter((x) => x !== p && !x.releaseId).flatMap((x) => x.songIds));
}

/** Músicas do artista que podem entrar no projeto (inéditas, não reservadas por rollout nem por outro projeto). */
export function candidateSongs(s: GameState, p: MusicProject): Song[] {
  const act = s.acts[p.actId];
  if (!act) return [];
  const taken = takenElsewhere(s, p);
  return act.songs.map((id) => s.songs[id]).filter((so): so is Song => !!so && !so.releaseId && !so.vault && !isDiscarded(s, so.id) && !taken.has(so.id) && (!s.flags[`ro:${so.id}`] || p.songIds.includes(so.id)))
    .sort((a, b) => Number(b.recorded) - Number(a.recorded) || b.q - a.q);
}

export function createProject(s: GameState, actId: string, opts: { type?: ReleaseType; concept?: string; goal?: ProjGoal; title?: string } = {}): MusicProject | L {
  if (!isMine(s, actId)) return l('Ato não é seu.', 'Not your act.');
  if (openProjects(s, actId).filter((p) => !p.releaseId).length >= 3) return l('Este artista já tem três projetos em andamento.', 'This act already has three projects in progress.');
  const act = s.acts[actId];
  const concept = conceptById[opts.concept ?? ''] ?? CONCEPTS[0];
  const type = opts.type ?? (act.songs.filter((id) => !s.songs[id]?.releaseId).length >= 7 ? 'lp' : 'single');
  const ch = availableChannels(s);
  const p: MusicProject = {
    id: nextId(s, 'pj'), actId, title: opts.title?.trim() || '', type, concept: concept.id, goal: opts.goal ?? concept.goal,
    songIds: [], auto: true, tier: s.player.hq >= 1 ? 0 : 1, approach: concept.id === 'art' ? 'meticulous' : concept.id === 'budget' ? 'spontaneous' : 'balanced',
    marketing: ch.length ? [{ channel: ch[0].id, budget: money(s, concept.id === 'radio' ? 3000 : concept.id === 'budget' ? 600 : 1500) }] : [],
    coverRound: 0, weeksAhead: 3, budget: 0, spent: 0, created: s.week, fans0: fansOf(act), scene0: sceneOf(s, act),
  };
  // capa sugerida pelo conceito, quando estiver entre as três propostas
  const opts3 = coverOptions(s, actId, 0);
  p.cover = { ...(opts3.find((o) => o.style === concept.cover) ?? opts3[0]) };
  proj8(s).list.push(p);
  fillSongs(s, p);
  return p;
}

/** Completa as faixas com o que o artista já tem (gravadas primeiro, depois as de maior Q). */
export function fillSongs(s: GameState, p: MusicProject): void {
  if (p.pendingId || p.rolloutId || p.releaseId) return;
  const need = needSongs(p.type);
  if (p.songIds.length >= need) return;
  for (const so of candidateSongs(s, p)) {
    if (p.songIds.length >= need) break;
    if (!p.songIds.includes(so.id)) p.songIds.push(so.id);
  }
}

export function setProjectSongs(s: GameState, p: MusicProject, ids: string[]): void {
  const ok = new Set(candidateSongs(s, p).map((x) => x.id));
  p.songIds = ids.filter((id) => ok.has(id)).slice(0, maxSongs(p.type));
}

export function projectStage(s: GameState, p: MusicProject): ProjStage {
  if (p.releaseId && s.releases[p.releaseId]) return s.week - s.releases[p.releaseId].week >= 8 ? 'followup' : 'released';
  if (p.pendingId && s.pendingReleases.some((x) => x.id === p.pendingId)) return 'scheduled';
  if (p.rolloutId && s.rollouts.some((x) => x.id === p.rolloutId && x.status === 'active')) return 'scheduled';
  if (!p.songIds.length) return 'concept';
  if (p.songIds.length < needSongs(p.type)) return 'writing';
  if (p.songIds.some((id) => !s.songs[id]?.recorded)) return 'recording';
  return 'finishing';
}

export const stageIndex = (st: ProjStage): number => STAGES.indexOf(st);

/** Gravação em andamento (sessão de estúdio) de alguma faixa do projeto. */
export function projectSession(s: GameState, p: MusicProject) {
  return s.sessions.find((x) => !x.done && x.actId === p.actId && x.songIds.some((id) => p.songIds.includes(id)));
}

export interface ProjectCosts { recording: number; feat: number; cover: number; marketing: number; pressing: number; remaining: number; committed: number }

/** Orçamento: o que já foi gasto + o que falta pagar até o lançamento. */
export function projectCosts(s: GameState, p: MusicProject): ProjectCosts {
  const done = !!(p.pendingId || p.rolloutId || p.releaseId);
  const unrec = p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const recording = done || !unrec || projectSession(s, p) ? 0 : sessionCost(s, unrec, p.tier, p.approach, p.producerId);
  const lead = s.songs[p.songIds[0]];
  const feat = !done && p.guestId && lead && !featOf(s, lead.id) && s.acts[p.guestId] ? featureFee(s, s.acts[p.guestId]) : 0;
  const cover = done ? 0 : coverCost(s, p.cover?.style);
  const marketing = done ? 0 : p.marketing.reduce((t, m) => t + m.budget, 0);
  const act = s.acts[p.actId];
  const pressing = done || !act || labelFunded(s, p.actId) ? 0 : pressingCost(s, availableFormats(s), suggestedPress(s, act, p.type, projectQ(s, p)));
  const remaining = recording + feat + cover + marketing + pressing;
  return { recording, feat, cover, marketing, pressing, remaining, committed: p.spent + remaining };
}

/** Q estimada do disco a partir das faixas (gravadas contam a Q real; escritas, uma estimativa). */
export function projectQ(s: GameState, p: MusicProject): number {
  const qs = p.songIds.map((id) => s.songs[id]).filter(Boolean).map((so) => (so.recorded ? so.q : so.q * 0.85 + 8)).sort((a, b) => b - a);
  if (!qs.length) return 0;
  return qs.length === 1 ? qs[0] : qs[0] * 0.5 + (qs.reduce((t, x) => t + x, 0) / qs.length) * 0.5;
}

export function projectForecast(s: GameState, p: MusicProject): { lo: number; mid: number; hi: number } | null {
  const act = s.acts[p.actId];
  if (!act || !p.songIds.length) return null;
  return forecastUnits(s, act, p.type, projectQ(s, p), p.marketing, s.player.territories);
}

/** Acrescenta uma ação à agenda do mês do artista (a agenda passa a ser manual). */
export function addAgendaAction(s: GameState, p: MusicProject, slot: AgendaSlot): L | null {
  const act = s.acts[p.actId];
  if (!act || !isMine(s, p.actId)) return l('Ato não é seu.', 'Not your act.');
  const base = s.delegated[act.id] !== false ? defaultAgenda(s, act) : [...(s.agenda[act.id] ?? [])];
  if (base.filter((x) => x.action === slot.action).length >= 4) return l('Essa ação já está na agenda várias vezes.', 'That action is already on the agenda several times.');
  if (usedSlots(base) + slotCost(slot.action) > slotsFor(act)) return l('A agenda do mês está cheia: tire alguma ação na aba de artistas.', 'This month\'s agenda is full: remove an action in the artists tab.');
  if (!setAgenda(s, act.id, [...base, slot])) return l('A formação não tem fôlego para mais isso neste mês.', 'The lineup has no capacity for that this month.');
  return null;
}

export function planWriting(s: GameState, p: MusicProject): L | null {
  return addAgendaAction(s, p, { action: 'compose' });
}

export function planRecording(s: GameState, p: MusicProject): L | null {
  return addAgendaAction(s, p, { action: 'record', params: { tier: p.tier, approach: p.approach } });
}

/** Sessão de estúdio já, com o produtor escolhido, só com as faixas do projeto. */
export function recordNow(s: GameState, p: MusicProject): L | null {
  const ids = p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded);
  if (!ids.length) return l('Não há faixas do projeto para gravar.', 'No project tracks left to record.');
  const cost = sessionCost(s, ids.length, p.tier, p.approach, p.producerId);
  const res = startSession(s, p.actId, ids, p.tier, p.approach, p.producerId || undefined);
  if ('pt' in res) return res;
  p.spent += cost;
  return null;
}

export function inviteGuest(s: GameState, r: Rng, p: MusicProject): L {
  const lead = s.songs[p.songIds[0]];
  if (!lead) return l('Escolha antes a faixa principal.', 'Pick the lead track first.');
  if (!p.guestId || !s.acts[p.guestId]) return l('Escolha um convidado.', 'Pick a guest.');
  const fee = featureFee(s, s.acts[p.guestId]);
  const before = featOf(s, lead.id);
  const res = inviteFeature(s, r, lead.id, p.guestId);
  if (!before && featOf(s, lead.id)) p.spent += fee;
  return res;
}

function planOf(s: GameState, p: MusicProject): ReleasePlan {
  const act = s.acts[p.actId];
  return {
    actId: p.actId, type: p.type, songs: [...p.songIds], title: p.title || undefined, formats: availableFormats(s),
    press: suggestedPress(s, act, p.type, projectQ(s, p)), marketing: p.marketing.filter((m) => m.budget > 0), territories: [...s.player.territories],
    weeksAhead: Math.max(1, Math.min(26, p.weeksAhead)), cover: p.cover,
  };
}

/** Programa o lançamento com tudo o que o projeto definiu. */
export function scheduleProject(s: GameState, r: Rng, p: MusicProject): L | null {
  const st = projectStage(s, p);
  if (st !== 'finishing') return st === 'scheduled' || st === 'released' || st === 'followup' ? l('Já programado.', 'Already scheduled.') : l('Faltam faixas gravadas para lançar.', 'Recorded tracks are still missing.');
  const plan = planOf(s, p);
  const cost = releaseCost(s, plan);
  const res = scheduleRelease(s, r, plan);
  if ('pt' in res) return res;
  p.pendingId = res.id;
  p.title = res.title;
  p.spent += cost;
  return null;
}

/** Álbum com ciclo completo: teaser, pré-save, singles de trabalho, clipe e álbum. */
export function rolloutProject(s: GameState, p: MusicProject): L | null {
  if (projectStage(s, p) !== 'finishing') return l('Grave todas as faixas antes de planejar o rollout.', 'Record every track before planning the rollout.');
  if (p.type !== 'lp') return l('Rollout é para álbuns.', 'Rollouts are for albums.');
  const songs = p.songIds.filter((id) => s.songs[id]?.recorded);
  const singles = [...songs].sort((a, b) => songProfile(s.songs[b]).hook + s.songs[b].q - songProfile(s.songs[a]).hook - s.songs[a].q).slice(0, songs.length >= 9 ? 2 : 1);
  const per = Math.max(money(s, 500), Math.round(p.marketing.reduce((t, m) => t + m.budget, 0) / 4));
  const res = planRollout(s, { actId: p.actId, title: p.title || s.acts[p.actId].name, albumSongs: songs, singles, teaser: true, presave: canPresave(s), video: canVideo(s), deluxeSongs: [], limitedUnits: 0, budget: per, startInWeeks: Math.max(1, p.weeksAhead) });
  if ('pt' in res) return res;
  p.rolloutId = res.id;
  p.title = res.title;
  // o rollout paga fase a fase; a conta do projeto registra o plano inteiro
  p.spent += res.phases.reduce((t, ph) => t + ph.budget, 0);
  return null;
}

/** Cancela o lançamento programado (devolve fabricação e marketing, como em Lançar). */
export function unscheduleProject(s: GameState, p: MusicProject): void {
  const pr = s.pendingReleases.find((x) => x.id === p.pendingId);
  if (!pr) return;
  const refund = (labelFunded(s, pr.actId) ? 0 : pressingCost(s, pr.formats, pr.press)) + pr.marketing.reduce((t, m) => t + m.budget, 0);
  if (cancelRelease(s, pr.id)) p.spent = Math.max(0, p.spent - refund);
  p.pendingId = undefined;
}

export function closeProject(s: GameState, p: MusicProject): void {
  if (p.pendingId) unscheduleProject(s, p);
  p.closed = true;
}

export interface ProjectResult { units: number; peak: number; revenue: number; spent: number; goalMet: boolean | null; goalText: L }

export function projectResult(s: GameState, p: MusicProject): ProjectResult | null {
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  if (!rel) return null;
  const act = s.acts[p.actId];
  const rels = [rel, ...Object.values(s.releases).filter((x) => p.rolloutId && x.rolloutId === p.rolloutId && x.id !== rel.id)];
  const revenue = rels.reduce((t, x) => t + x.revenue, 0);
  const peak = Math.min(...rels.map((x) => x.peak));
  let goalMet: boolean | null = null;
  let goalText: L = GOALS[p.goal].desc;
  const enough = s.week - rel.week >= 8;
  switch (p.goal) {
    case 'hit': goalMet = peak <= 10 ? true : enough ? false : null; break;
    case 'critics': {
      const rv = s.reviews[rel.id];
      const sc = rv?.length ? Math.round((rv.reduce((t, x) => t + x.score, 0) / rv.length) * 10) : rel.critic;
      if (sc !== undefined) { goalMet = sc >= 75; goalText = fmtL(l('Nota da crítica: {n} (meta 75).', 'Critic score: {n} (goal 75).'), { n: sc }); }
      break;
    }
    case 'fans': {
      const now = act ? fansOf(act) : 0;
      const g = p.fans0 > 0 ? now / p.fans0 - 1 : now > 0 ? 1 : 0;
      goalMet = g >= 0.25 ? true : enough ? false : null;
      goalText = fmtL(l('Fãs ativos e fiéis: {d}% (meta +25%).', 'Active and core fans: {d}% (goal +25%).'), { d: `${g >= 0 ? '+' : ''}${Math.round(g * 100)}` });
      break;
    }
    case 'profit': goalMet = revenue >= p.spent ? true : enough ? false : null; break;
    case 'scene': {
      const now = act ? sceneOf(s, act) : 0;
      goalMet = now > p.scene0 + 0.5 ? true : enough ? false : null;
      break;
    }
  }
  return { units: rels.reduce((t, x) => t + x.totalUnits, 0), peak, revenue, spent: p.spent, goalMet, goalText };
}

// ---------------------------------------------------------------- tick

/** Liga o lançamento ao projeto quando ele sai. */
function linkRelease(s: GameState, rel: Release): void {
  for (const p of openProjects(s, rel.actId)) {
    if (p.releaseId) continue;
    const viaPending = p.pendingId && !s.pendingReleases.some((x) => x.id === p.pendingId) && rel.songs[0] === p.songIds[0] && rel.type === p.type;
    const viaRollout = p.rolloutId && rel.rolloutId === p.rolloutId && rel.type === 'lp' && (rel.kind ?? 'standard') === 'standard';
    if (!viaPending && !viaRollout) continue;
    p.releaseId = rel.id;
    p.title = rel.title;
    remember(s, 'project', fmtL(l('Projeto "{t}" chega às lojas.', 'Project "{t}" hits the stores.'), { t: rel.title }), { actId: rel.actId });
    break;
  }
}

registerSimHook('launch', 'proj8', (s, _r, a) => { if (a.release && (a.release.owner === 'player' || s.acts[a.release.actId]?.playerBand)) linkRelease(s, a.release); });

registerSimHook('week', 'proj8', (s) => {
  const st = proj8(s);
  if (!st.list.length) return;
  const mine = new Set(playerActs(s));
  for (const p of st.list) {
    if (p.closed) continue;
    if (!mine.has(p.actId)) { p.closed = true; continue; }
    if (p.releaseId || p.pendingId || p.rolloutId) {
      // lançamento cancelado por fora: volta para a mesa
      if (p.pendingId && !p.releaseId && !s.pendingReleases.some((x) => x.id === p.pendingId)) p.pendingId = undefined;
      if (p.rolloutId && !p.releaseId && !s.rollouts.some((x) => x.id === p.rolloutId && x.status === 'active')) p.rolloutId = undefined;
      continue;
    }
    // faixas lançadas, vendidas ou descartadas por fora saem do projeto
    p.songIds = p.songIds.filter((id) => { const so = s.songs[id]; return so && so.actId === p.actId && !so.releaseId && !isDiscarded(s, id) && (!s.flags[`ro:${id}`] || !!p.rolloutId); });
    if (p.auto) fillSongs(s, p);
  }
  // projetos encerrados há muito tempo saem da lista (save pequeno)
  if (st.list.length > 30) st.list = st.list.filter((p) => !p.closed || s.week - p.created < 520).slice(-30);
});

export { PRODUCERS };
