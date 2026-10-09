// Projeto como centro (rodada 12): um disco começa por uma intenção (conquistar público, consolidar
// a carreira, experimentar, recuperar prestígio) e por três compromissos — orçamento, direção artística
// e prazo — com efeitos reais na gravação, no apelo do lançamento e no artista. No caminho surgem
// problemas que viram decisões com consequências mostradas antes (atraso, estouro, conflito com o
// artista). Depois do lançamento, a leitura do porquê e o próximo passo (single, turnê, deluxe,
// próximo álbum, pausa). Amarra o projeto da rodada 8 (project8), sem sistema paralelo.

import { Rng, clamp, seedState } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { actState } from '../people';
import { availableFormats, recordingCost, recordSongs, scheduleRelease, suggestedPress } from '../production';
import type { Act, GameState, Release, Song } from '../types';
import { fmtL, money, playerActs, post, remember } from '../util';
import { availableChannels } from '../market';
import { capDeltas, songRec, syncSong, type Deltas } from './music/state';
import {
  createProject, maxSongs, needSongs, openProjects, proj8, projectById, projectCosts, projectForecast, projectSession, projectStage, type MusicProject, type ProjGoal,
} from './project8';
import { AUDIENCES, type Aud12 } from './studio12';

export type Intent = 'audience' | 'career' | 'experiment' | 'prestige';
export type Dir = 'safe' | 'signature' | 'bold';
export type BudgetLvl = 'lean' | 'standard' | 'lavish';
export type Deadline = 'tight' | 'normal' | 'relaxed';
export type ProblemKind = 'late' | 'budget' | 'conflict';
export type NextStep = 'single' | 'tour' | 'deluxe' | 'album' | 'pause';

export const INTENTS: Record<Intent, { name: L; desc: L; fx: L; goal: ProjGoal; aud: Aud12; appeal: number }> = {
  audience: { name: l('Conquistar público', 'Win an audience'), desc: l('Levar o artista a quem ainda não o conhece.', 'Take the act to people who do not know it yet.'),
    fx: l('Apelo ×1,08 no lançamento; o artista fica mais pop (+6 de posicionamento) e ganha fãs casuais — fãs antigos do underground podem torcer o nariz.', 'Release appeal ×1.08; the act turns more pop (+6 positioning) and gains casual fans — old underground fans may sneer.'), goal: 'hit', aud: 'young', appeal: 1.08 },
  career: { name: l('Consolidar a carreira', 'Consolidate the career'), desc: l('Firmar quem já gosta: converter ouvintes em fãs.', 'Lock in who already likes the act: turn listeners into fans.'),
    fx: l('Apelo ×1,02; 8% dos casuais viram ativos e 3% dos ativos viram fiéis; confiança +4; performance +2 nas faixas.', 'Appeal ×1.02; 8% of casual fans become active and 3% of active become core; trust +4; performance +2 on the tracks.'), goal: 'fans', aud: 'core', appeal: 1.02 },
  experiment: { name: l('Experimentar', 'Experiment'), desc: l('Deixar o artista arriscar. Vende menos, mas renova.', 'Let the act take risks. Sells less, but renews.'),
    fx: l('Apelo ×0,90; originalidade +5 nas faixas; inspiração +15 e confiança +6; reputação artística +1.', 'Appeal ×0.90; originality +5 on the tracks; inspiration +15 and trust +6; artistic reputation +1.'), goal: 'critics', aud: 'critics', appeal: 0.9 },
  prestige: { name: l('Recuperar prestígio', 'Recover prestige'), desc: l('Um disco caprichado para a crítica voltar a respeitar.', 'A careful record to win back the critics\' respect.'),
    fx: l('Apelo ×0,95; produção +3 e letra +1 nas faixas; se a crítica der 70+, reputação artística +3 e alcance +3; abaixo de 60, reputação −1.', 'Appeal ×0.95; production +3 and lyrics +1 on the tracks; if critics give 70+, artistic reputation +3 and reach +3; below 60, reputation −1.'), goal: 'critics', aud: 'critics', appeal: 0.95 },
};
export const DIRS: Record<Dir, { name: L; fx: L }> = {
  safe: { name: l('Seguro: o som de sempre', 'Safe: the usual sound'), fx: l('Originalidade −3, performance +2; apelo ×1,04; fãs fiéis +2%.', 'Originality −3, performance +2; appeal ×1.04; core fans +2%.') },
  signature: { name: l('Assinatura: o forte do artista', 'Signature: the act\'s strength'), fx: l('+3 no atributo em que a formação é melhor; sem risco extra.', '+3 on the lineup\'s best attribute; no extra risk.') },
  bold: { name: l('Ousado: som novo', 'Bold: a new sound'), fx: l('Originalidade +4, performance −1; apelo entre ×0,85 e ×1,25 (aposta).', 'Originality +4, performance −1; appeal between ×0.85 and ×1.25 (a gamble).') },
};
export const BUDGETS: Record<BudgetLvl, { name: L; fx: L; mult: number; tier: number; approach: string; mkt: number }> = {
  lean: { name: l('Enxuto', 'Lean'), fx: l('Teto baixo, estúdio barato e gravação espontânea; divulgação pela metade.', 'Low cap, cheap studio and spontaneous takes; half the promotion.'), mult: 0.6, tier: 1, approach: 'spontaneous', mkt: 0.5 },
  standard: { name: l('Padrão', 'Standard'), fx: l('Estúdio regional, gravação equilibrada, divulgação normal.', 'Regional studio, balanced takes, normal promotion.'), mult: 1, tier: 1, approach: 'balanced', mkt: 1 },
  lavish: { name: l('Caprichado', 'Lavish'), fx: l('Teto alto, estúdio profissional e gravação minuciosa; divulgação em dobro.', 'High cap, professional studio and meticulous takes; double promotion.'), mult: 1.8, tier: 2, approach: 'meticulous', mkt: 2 },
};
export const DEADLINES: Record<Deadline, { name: L; fx: L; weeks: number }> = {
  tight: { name: l('Apertado', 'Tight'), fx: l('Sai rápido e aproveita o momento (+5 de momento se cumprir); mais risco de atraso e de cansaço.', 'Out fast while the iron is hot (+5 momentum if met); more risk of delays and fatigue.'), weeks: 8 },
  normal: { name: l('Normal', 'Normal'), fx: l('Prazo de mercado; cumprir dá +3 de confiança.', 'A market deadline; meeting it gives +3 trust.'), weeks: 16 },
  relaxed: { name: l('Folgado', 'Relaxed'), fx: l('Tempo para ensaiar (performance +2), mas o momento esfria (−3).', 'Time to rehearse (performance +2), but momentum cools (−3).'), weeks: 26 },
};
export const NEXT: Record<NextStep, { name: L; fx: L }> = {
  single: { name: l('Mais um single', 'Another single'), fx: l('Novo projeto de single, intenção "conquistar público": mantém o artista nas paradas.', 'A new single project aimed at winning an audience: keeps the act in the charts.') },
  tour: { name: l('Turnê do disco', 'Album tour'), fx: l('Por 16 semanas os shows do artista rendem +12% (o disco puxa público).', 'For 16 weeks the act\'s shows earn +12% (the record draws crowds).') },
  deluxe: { name: l('Edição deluxe', 'Deluxe edition'), fx: l('Relança o álbum com faixas inéditas já gravadas, em 2 semanas.', 'Reissues the album with recorded unreleased tracks, in 2 weeks.') },
  album: { name: l('Próximo álbum', 'Next album'), fx: l('Novo projeto de álbum, intenção "consolidar a carreira".', 'A new album project aimed at consolidating the career.') },
  pause: { name: l('Pausa', 'Break'), fx: l('8 semanas de folga: estresse e cansaço −30, inspiração +20, confiança +4; momento ×0,85.', '8 weeks off: stress and fatigue −30, inspiration +20, trust +4; momentum ×0.85.') },
};

export interface Problem { kind: ProblemKind; week: number; why: L; want?: Dir }
export interface Plan12 {
  intent: Intent; dir: Dir; aud: Aud12; budget: BudgetLvl; deadlineKind: Deadline; deadline: number;
  problem?: Problem;
  /** semana em que cada tipo de problema foi resolvido por último */
  solved: Partial<Record<ProblemKind, number>>;
  conflicts: number;
  log: { w: number; text: L; good?: boolean }[];
  fx?: boolean; fx2?: boolean;
  next?: NextStep; nextUntil?: number;
}
export interface Proj12State { meta: Record<string, Plan12> }
declare module '../ext4' { interface Ext4 { proj12: Proj12State } }
registerExt4('proj12', () => ({ meta: {} }));
export const proj12 = (s: GameState): Proj12State => (s as unknown as { x4: { proj12: Proj12State } }).x4.proj12;
export const planOf12 = (s: GameState, p: MusicProject): Plan12 | undefined => proj12(s).meta[p.id];

const log = (pl: Plan12, w: number, text: L, good?: boolean) => { pl.log.push({ w, text, good }); if (pl.log.length > 14) pl.log.shift(); };
const extraWeeks = (p: MusicProject) => (p.type === 'lp' ? 8 : p.type === 'ep' ? 3 : 0);
const BASE_BUDGET = { single: 4000, ep: 9000, lp: 20000 };

/** Intenção + compromissos. Pode ser refeito enquanto nada foi programado. */
export function commitProject(s: GameState, p: MusicProject, c: { intent: Intent; dir: Dir; aud: Aud12; budget: BudgetLvl; deadline: Deadline }): L | null {
  if (projectStage(s, p) === 'scheduled' || p.releaseId) return l('O lançamento já está programado.', 'The release is already scheduled.');
  const prev = proj12(s).meta[p.id];
  const b = BUDGETS[c.budget];
  p.goal = INTENTS[c.intent].goal;
  p.budget = Math.round(money(s, BASE_BUDGET[p.type] * b.mult) / 100) * 100 + p.spent;
  p.tier = b.tier === 1 && c.budget === 'lean' && s.player.hq >= 1 ? 0 : b.tier;
  p.approach = b.approach;
  const mk = Math.round(money(s, (p.type === 'lp' ? 3000 : 1500) * b.mkt) / 100) * 100;
  if (p.marketing.length) { const tot = p.marketing.reduce((t, m) => t + m.budget, 0) || 1; for (const m of p.marketing) m.budget = Math.round((m.budget / tot) * mk); }
  const deadline = prev && prev.deadlineKind === c.deadline ? prev.deadline : s.week + DEADLINES[c.deadline].weeks + extraWeeks(p);
  proj12(s).meta[p.id] = { ...(prev ?? { solved: {}, conflicts: 0, log: [] }), ...c, deadlineKind: c.deadline, deadline };
  log(proj12(s).meta[p.id], s.week, fmtL(l('Compromisso: {i}, orçamento {b}, prazo até a semana {w}.', 'Commitment: {i}, {b} budget, deadline week {w}.'), { i: INTENTS[c.intent].name, b: b.name, w: deadline }));
  return null;
}

/** Semanas que ainda faltam até o disco poder sair (estimativa honesta, mostrada na tela). */
export function weeksNeeded(s: GameState, p: MusicProject): number {
  const st = projectStage(s, p);
  if (st === 'scheduled') { const pr = s.pendingReleases.find((x) => x.id === p.pendingId); return pr ? Math.max(0, pr.week - s.week) : 0; }
  if (st === 'released' || st === 'followup') return 0;
  const missing = Math.max(0, needSongs(p.type) - p.songIds.length);
  const unrec = p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded).length;
  const sess = projectSession(s, p);
  const rec = sess ? Math.ceil((sess.days - sess.dayDone) / 7) : unrec ? Math.ceil(unrec * 0.6) + 1 : 0;
  return missing * 2 + rec + Math.max(1, p.weeksAhead);
}

export function slack(s: GameState, p: MusicProject): number | null {
  const pl = planOf12(s, p);
  return pl ? pl.deadline - s.week - weeksNeeded(s, p) : null;
}

// ------------------------------------------------------------------ problemas como decisões

export interface ProblemOption { id: string; name: L; fx: L; disabled?: L }

function unrecIds(s: GameState, p: MusicProject): string[] {
  const sess = projectSession(s, p);
  return p.songIds.filter((id) => s.songs[id] && !s.songs[id].recorded && !sess?.songIds.includes(id));
}
const outsideCost = (s: GameState, n: number) => Math.round(recordingCost(s, 2, 'balanced', n) * 1.3);
const lovesArt = (p: MusicProject, pl: Plan12) => pl.intent === 'experiment' || pl.intent === 'prestige' || p.concept === 'art';

export function problemOptions(s: GameState, p: MusicProject): ProblemOption[] {
  const pl = planOf12(s, p);
  const pb = pl?.problem;
  if (!pl || !pb) return [];
  const act = s.acts[p.actId];
  if (pb.kind === 'late') {
    const un = unrecIds(s, p);
    const cut = cutPlan(s, p);
    const cost = outsideCost(s, un.length);
    const dw = p.type === 'lp' ? 8 : 6;
    return [
      { id: 'cut', name: l('Cortar faixas', 'Cut tracks'), fx: cut ? fmtL(l('{n} faixa(s) saem{t}; o disco fica pronto antes.{x}', '{n} track(s) dropped{t}; the record is ready sooner.{x}'), { n: cut.drop, t: cut.type !== p.type ? fmtL(l(' e vira {f}', ' and it becomes an {f}'), { f: cut.type.toUpperCase() }) : '', x: lovesArt(p, pl) ? l(' O artista sente o corte (confiança −4).', ' The act resents the cut (trust −4).') : '' }) : l('—', '—'), disabled: cut ? undefined : l('Nada a cortar: as faixas que faltam são as mínimas.', 'Nothing to cut: the missing tracks are the minimum.') },
      { id: 'outside', name: l('Contratar estúdio externo', 'Hire an outside studio'), fx: fmtL(l('Grava já as {n} faixa(s) pendentes num estúdio profissional por {c} (30% de urgência). Não resolve músicas que ainda nem foram escritas.', 'Records the {n} pending track(s) now in a professional studio for {c} (30% rush fee). Does not fix songs not yet written.'), { n: un.length, c: `$${Math.round(cost / 100).toLocaleString('en-US')}` }),
        disabled: !un.length ? l('Nenhuma faixa escrita esperando gravação.', 'No written track waiting to be recorded.') : s.player.cash < cost ? l('Caixa insuficiente.', 'Not enough cash.') : undefined },
      { id: 'delay', name: l('Adiar o lançamento', 'Delay the release'), fx: fmtL(l('Prazo +{w} semanas. O mercado esfria: momento −4{x}.', 'Deadline +{w} weeks. The market cools: momentum −4{x}.'), { w: dw, x: pl.deadlineKind === 'tight' ? l(' e o prazo deixa de ser "apertado"', ' and the deadline is no longer "tight"') : '' }) },
    ];
  }
  if (pb.kind === 'budget') {
    const c = projectCosts(s, p);
    const fc = projectForecast(s, p);
    const mk = p.marketing.reduce((t, m) => t + m.budget, 0);
    const fc2 = fc ? projectForecast(s, { ...p, marketing: p.marketing.map((m) => ({ ...m, budget: Math.round(m.budget / 2) })) }) : null;
    const drop = fc && fc2 && fc.mid > 0 ? Math.round((1 - fc2.mid / fc.mid) * 100) : 0;
    return [
      { id: 'cutpromo', name: l('Cortar a divulgação pela metade', 'Halve the promotion'), fx: fmtL(l('Economiza {c}; a previsão de vendas cai cerca de {d}%.', 'Saves {c}; the sales forecast drops about {d}%.'), { c: `$${Math.round(mk / 200).toLocaleString('en-US')}`, d: drop }), disabled: mk ? undefined : l('Não há verba de divulgação.', 'There is no promotion budget.') },
      { id: 'cheaper', name: l('Produção mais barata', 'Cheaper production'), fx: l('Estúdio mais simples, gravação espontânea e capa barata: produção −6, originalidade +6 nas faixas que faltam.', 'Simpler studio, spontaneous takes and a cheap cover: production −6, originality +6 on the remaining tracks.'), disabled: !c.recording && !c.cover ? l('Gravação e capa já pagas.', 'Recording and cover already paid.') : undefined },
      { id: 'raise', name: l('Aumentar o teto', 'Raise the cap'), fx: fmtL(l('Novo teto {c}. O artista se sente bancado (confiança +2), mas a meta de lucro fica mais difícil.{x}', 'New cap {c}. The act feels backed (trust +2), but the profit goal gets harder.{x}'), { c: `$${Math.round((c.committed * 1.1) / 100).toLocaleString('en-US')}`, x: c.remaining > s.player.cash ? l(' Atenção: o caixa continua sem cobrir o que falta.', ' Careful: cash still does not cover what is left.') : '' }) },
    ];
  }
  const want = pb.want ?? 'bold';
  return [
    { id: 'listen', name: l('Ouvir o artista', 'Listen to the act'), fx: fmtL(l('Direção vira "{d}". Confiança +8 e moral +6.', 'Direction becomes "{d}". Trust +8 and morale +6.'), { d: DIRS[want].name }), disabled: want === pl.dir ? l('Já é essa a direção.', 'That is already the direction.') : undefined },
    { id: 'insist', name: l('Manter o plano', 'Stick to the plan'), fx: l('Nada muda no disco. Confiança −10 e estresse +10 na formação.', 'Nothing changes on the record. Trust −10 and stress +10 on the lineup.') },
    { id: 'mediate', name: l('Reunião com um produtor mediador', 'Meet with a mediating producer'), fx: fmtL(l('Custa {c} e 2 semanas de prazo; confiança +3 e o plano segue.', 'Costs {c} and 2 weeks of deadline; trust +3 and the plan stays.'), { c: `$${Math.round(money(s, 1500) / 100).toLocaleString('en-US')}` }), disabled: s.player.cash < money(s, 1500) ? l('Caixa insuficiente.', 'Not enough cash.') : undefined },
  ].map((o) => ({ ...o, fx: act ? o.fx : o.fx }));
}

/** O que "cortar faixas" faria: tira as não gravadas além do mínimo, ou encolhe o formato. */
function cutPlan(s: GameState, p: MusicProject): { keep: string[]; type: MusicProject['type']; drop: number } | null {
  const rec = p.songIds.filter((id) => s.songs[id]?.recorded);
  const sess = projectSession(s, p);
  const busy = p.songIds.filter((id) => sess?.songIds.includes(id));
  const fixed = [...new Set([...rec, ...busy])];
  let type = p.type;
  while (type !== 'single' && fixed.length < needSongs(type)) type = type === 'lp' ? 'ep' : 'single';
  const keep = fixed.length >= needSongs(type) ? fixed.slice(0, maxSongs(type)) : [...fixed, ...p.songIds.filter((id) => !fixed.includes(id))].slice(0, needSongs(type));
  const drop = p.songIds.length - keep.length;
  return drop > 0 || type !== p.type ? { keep, type, drop } : null;
}

export function resolveProblem(s: GameState, p: MusicProject, opt: string): L | null {
  const pl = planOf12(s, p);
  const pb = pl?.problem;
  if (!pl || !pb) return l('Nenhum problema pendente.', 'No pending problem.');
  const o = problemOptions(s, p).find((x) => x.id === opt);
  if (!o) return l('Opção inválida.', 'Invalid option.');
  if (o.disabled) return o.disabled;
  const act = s.acts[p.actId];
  if (!act) return l('Artista indisponível.', 'Act unavailable.');
  const crew = act.members.map((id) => s.persons[id]).filter(Boolean);
  switch (opt) {
    case 'cut': {
      const c = cutPlan(s, p)!;
      p.songIds = c.keep; p.type = c.type; p.auto = false;
      if (lovesArt(p, pl)) act.trust = clamp(act.trust - 4, 0, 100);
      break;
    }
    case 'outside': {
      const ids = unrecIds(s, p);
      const extra = outsideCost(s, ids.length) - recordingCost(s, 2, 'balanced', ids.length);
      const before = s.player.cash;
      recordSongs(s, new Rng(seedState(`${s.config.seed}:p12out:${p.id}:${s.week}`)), act, ids, 2, 'balanced');
      post(s, `p12rush:${p.id}`, -extra, 'recording', `Urgência no estúdio ${act.name}`);
      p.spent += before - s.player.cash;
      break;
    }
    case 'delay': pl.deadline += p.type === 'lp' ? 8 : 6; act.momentum = clamp(act.momentum - 4, 0, 100); if (pl.deadlineKind === 'tight') pl.deadlineKind = 'normal'; break;
    case 'cutpromo': for (const m of p.marketing) m.budget = Math.round(m.budget / 2); break;
    case 'cheaper': p.tier = s.player.hq >= 1 ? 0 : 1; p.approach = 'spontaneous'; if (p.cover) p.cover = { ...p.cover, style: 'diy' }; break;
    case 'raise': p.budget = Math.round(projectCosts(s, p).committed * 1.1); act.trust = clamp(act.trust + 2, 0, 100); break;
    case 'listen': pl.dir = pb.want ?? 'bold'; act.trust = clamp(act.trust + 8, 0, 100); for (const m of crew) m.morale = clamp(m.morale + 6, 0, 100); break;
    case 'insist': act.trust = clamp(act.trust - 10, 0, 100); for (const m of crew) m.stress = clamp(m.stress + 10, 0, 100); break;
    case 'mediate': post(s, `p12med:${p.id}`, -money(s, 1500), 'recording', `Mediação ${act.name}`); p.spent += money(s, 1500); pl.deadline += 2; act.trust = clamp(act.trust + 3, 0, 100); break;
  }
  log(pl, s.week, fmtL(l('{p} → {o}: {f}', '{p} → {o}: {f}'), { p: PROBLEM_NAME[pb.kind], o: o.name, f: o.fx }));
  pl.solved[pb.kind] = s.week;
  pl.problem = undefined;
  return null;
}

export const PROBLEM_NAME: Record<ProblemKind, L> = { late: l('Disco atrasado', 'Record behind schedule'), budget: l('Orçamento estourado', 'Over budget'), conflict: l('Conflito com o artista', 'Conflict with the act') };

function detect(s: GameState, p: MusicProject, pl: Plan12): void {
  const st = projectStage(s, p);
  if (st === 'scheduled' || st === 'released' || st === 'followup') return;
  const act = s.acts[p.actId];
  if (!act) return;
  const quiet = (k: ProblemKind, w: number) => s.week - (pl.solved[k] ?? -99) >= w;
  const sl = slack(s, p) ?? 0;
  if (sl < 0 && st !== 'concept' && quiet('late', 6)) {
    pl.problem = { kind: 'late', week: s.week, why: fmtL(l('Faltam ~{n} semanas de trabalho, mas o prazo vence em {d}.', 'About {n} weeks of work left, but the deadline is in {d}.'), { n: weeksNeeded(s, p), d: Math.max(0, pl.deadline - s.week) }) };
    return;
  }
  const c = projectCosts(s, p);
  if (((p.budget > 0 && c.committed > p.budget * 1.05) || c.remaining > s.player.cash) && quiet('budget', 6)) {
    pl.problem = { kind: 'budget', week: s.week, why: c.remaining > s.player.cash ? l('O caixa não cobre o que falta pagar no projeto.', 'Cash does not cover what the project still has to pay.') : fmtL(l('Comprometido {c} contra um teto de {t}.', 'Committed {c} against a cap of {t}.'), { c: `$${Math.round(c.committed / 100).toLocaleString('en-US')}`, t: `$${Math.round(p.budget / 100).toLocaleString('en-US')}` }) };
    return;
  }
  if (pl.conflicts >= 2 || !quiet('conflict', 10)) return;
  const stt = actState(s, act);
  let why: L | null = null;
  let want: Dir = 'bold';
  let risk = 0;
  if (pl.intent === 'audience' && act.positioning < 45) { risk = 0.08; why = fmtL(l('{a} acha o disco comercial demais e teme perder a credibilidade.', '{a} thinks the record is too commercial and fears losing credibility.'), { a: act.name }); want = 'signature'; }
  else if (pl.dir === 'safe' && stt.inspiration > 60) { risk = 0.07; why = fmtL(l('{a} está inspirado e quer arriscar um som novo.', '{a} is inspired and wants to try a new sound.'), { a: act.name }); want = 'bold'; }
  else if (pl.dir === 'bold' && act.trust < 50) { risk = 0.07; why = fmtL(l('{a} não confia na aposta e quer voltar ao som de sempre.', '{a} does not trust the gamble and wants the usual sound back.'), { a: act.name }); want = 'safe'; }
  else if (pl.deadlineKind === 'tight' && (stt.fatigue > 50 || stt.stress > 55)) { risk = 0.09; why = fmtL(l('{a} está exausto com o prazo e ameaça largar o estúdio.', '{a} is exhausted by the deadline and threatens to walk out.'), { a: act.name }); want = 'signature'; }
  else { risk = act.trust < 40 ? 0.03 : 0.01; why = fmtL(l('{a} discorda dos rumos do repertório.', '{a} disagrees with where the repertoire is going.'), { a: act.name }); want = pl.dir === 'bold' ? 'signature' : 'bold'; }
  const r = new Rng(seedState(`${s.config.seed}:p12c:${p.id}:${s.week}`));
  if (why && r.chance(risk)) { pl.problem = { kind: 'conflict', week: s.week, why, want }; pl.conflicts += 1; }
}

// ------------------------------------------------------------------ efeitos reais

/** Projeto (com compromissos) a que um lançamento pertence. */
export function projectOfRelease(s: GameState, rel: Release): { p: MusicProject; pl: Plan12 } | null {
  for (const p of proj8(s).list) {
    if (p.actId !== rel.actId) continue;
    const ok = p.releaseId === rel.id || (!p.releaseId && rel.songs[0] && p.songIds.includes(rel.songs[0]) && !rel.reissueOf && rel.kind !== 'deluxe');
    const pl = ok ? proj12(s).meta[p.id] : undefined;
    if (pl) return { p, pl };
  }
  return null;
}

registerMod('appeal', 'proj12:intent', (s, v, c) => {
  const x = c.release ? projectOfRelease(s, c.release) : null;
  if (!x) return null;
  const i = INTENTS[x.pl.intent];
  const aligned = i.aud === x.pl.aud || (x.pl.intent === 'prestige' && x.pl.aud === 'adult');
  return { value: v * i.appeal * (aligned ? 1.03 : 0.98), label: fmtL(l('intenção "{i}" com público "{a}"', 'intent "{i}" aimed at "{a}"'), { i: i.name, a: AUDIENCES[x.pl.aud].name }) };
});

export function boldGamble(s: GameState, projectId: string): number {
  const r = new Rng(seedState(`${s.config.seed}:p12bold:${projectId}`));
  return 0.85 + r.next() * 0.4;
}
registerMod('appeal', 'proj12:dir', (s, v, c) => {
  const x = c.release ? projectOfRelease(s, c.release) : null;
  if (!x || x.pl.dir === 'signature') return null;
  const m = x.pl.dir === 'safe' ? 1.04 : boldGamble(s, x.p.id);
  return { value: v * m, label: x.pl.dir === 'safe' ? l('direção segura (som conhecido)', 'safe direction (familiar sound)') : m >= 1 ? l('aposta num som novo que pegou', 'a new-sound gamble that paid off') : l('aposta num som novo que não pegou', 'a new-sound gamble that missed') };
});

registerMod('showRevenue', 'proj12:tour', (s, v, c) => {
  if (!c.act) return null;
  const on = openProjects(s, c.act.id).some((p) => { const pl = proj12(s).meta[p.id]; return pl?.next === 'tour' && (pl.nextUntil ?? 0) > s.week; });
  return on ? { value: v * 1.12, label: l('turnê do disco', 'album tour') } : null;
});

// gravação: intenção, direção e prazo mexem nos atributos das faixas (bônus próprio, somado aos do estúdio)
function recBonus(s: GameState, so: Song): void {
  const p = openProjects(s, so.actId).find((x) => x.songIds.includes(so.id));
  const pl = p ? proj12(s).meta[p.id] : undefined;
  const act = s.acts[so.actId];
  if (!p || !pl || !act) return;
  const d: Deltas = {};
  const add = (k: keyof Deltas, v: number) => { d[k] = (d[k] ?? 0) + v; };
  if (pl.intent === 'experiment') { add('originality', 5); add('production', -1); }
  if (pl.intent === 'prestige') { add('production', 3); add('lyrics', 1); }
  if (pl.intent === 'audience') { add('production', 2); add('originality', -2); }
  if (pl.intent === 'career') add('performance', 2);
  if (pl.dir === 'safe') { add('originality', -3); add('performance', 2); }
  if (pl.dir === 'bold') { add('originality', 4); add('performance', -1); }
  if (pl.dir === 'signature') { const best = (['melody', 'lyrics', 'performance', 'production'] as const).reduce((b, k) => (so[k] > so[b] ? k : b), 'performance' as 'melody' | 'lyrics' | 'performance' | 'production'); add(best, 3); }
  if (pl.deadlineKind === 'relaxed') add('performance', 2);
  const rec = songRec(s, so.id);
  if (!rec.recSeen) return; // o sistema de música ainda vai abrir o registro da gravação
  if ((rec.b as Record<string, Deltas>).proj12) return;
  (rec.b as Record<string, Deltas>).proj12 = capDeltas(d);
  syncSong(s, so.id);
}
registerSimHook('record', 'proj12', (s, _r, a) => { if (a.song) recBonus(s, a.song); });

function launchFx(s: GameState, rel: Release, p: MusicProject, pl: Plan12): void {
  const act = s.acts[p.actId];
  if (!act || pl.fx) return;
  pl.fx = true;
  const crew = act.members.map((id) => s.persons[id]).filter(Boolean);
  switch (pl.intent) {
    case 'audience': {
      const under = act.positioning < 35;
      act.positioning = clamp(act.positioning + 6, 0, 100);
      act.fans.casual = Math.round(act.fans.casual * 1.12);
      if (under) act.fans.core = Math.round(act.fans.core * 0.96);
      log(pl, s.week, under ? l('Mais pop: fãs casuais +12%, mas 4% dos fiéis do underground se afastaram.', 'More pop: casual fans +12%, but 4% of the underground core drifted away.') : l('Mais pop: posicionamento +6 e fãs casuais +12%.', 'More pop: positioning +6 and casual fans +12%.'), !under);
      break;
    }
    case 'career': {
      const a = Math.round(act.fans.casual * 0.08), c = Math.round(act.fans.active * 0.03);
      act.fans.casual -= a; act.fans.active += a - c; act.fans.core += c; act.trust = clamp(act.trust + 4, 0, 100);
      log(pl, s.week, fmtL(l('Base firmada: {a} casuais viraram ativos e {c} ativos viraram fiéis.', 'Base locked in: {a} casual fans turned active and {c} active turned core.'), { a, c }), true);
      break;
    }
    case 'experiment':
      for (const m of crew) m.inspiration = clamp(m.inspiration + 15, 0, 100);
      act.trust = clamp(act.trust + 6, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
      log(pl, s.week, l('O artista saiu renovado: inspiração +15, confiança +6.', 'The act came out renewed: inspiration +15, trust +6.'), true);
      break;
    case 'prestige': break; // depende da crítica: avaliado semanas depois
  }
  if (pl.dir === 'safe') act.fans.core = Math.round(act.fans.core * 1.02);
  const onTime = rel.week <= pl.deadline;
  if (onTime) {
    if (pl.deadlineKind === 'tight') act.momentum = clamp(act.momentum + 5, 0, 100);
    if (pl.deadlineKind === 'normal') act.trust = clamp(act.trust + 3, 0, 100);
    log(pl, s.week, pl.deadlineKind === 'tight' ? l('Prazo apertado cumprido: momento +5.', 'Tight deadline met: momentum +5.') : pl.deadlineKind === 'normal' ? l('Entregue no prazo: confiança +3.', 'Delivered on time: trust +3.') : l('Prazo folgado: momento −3 pela espera.', 'Relaxed deadline: momentum −3 from the wait.'), pl.deadlineKind !== 'relaxed');
    if (pl.deadlineKind === 'relaxed') act.momentum = clamp(act.momentum - 3, 0, 100);
  } else {
    act.momentum = clamp(act.momentum - 6, 0, 100);
    log(pl, s.week, fmtL(l('Saiu {n} semana(s) depois do prazo: momento −6.', 'Came out {n} week(s) past the deadline: momentum −6.'), { n: rel.week - pl.deadline }), false);
  }
  remember(s, 'project', fmtL(l('"{t}" sai com a intenção de {i}.', '"{t}" comes out aiming to {i}.'), { t: rel.title, i: { pt: INTENTS[pl.intent].name.pt.toLowerCase(), en: INTENTS[pl.intent].name.en.toLowerCase() } }), { actId: act.id });
}

registerSimHook('launch', 'proj12', (s, _r, a) => {
  const rel = a.release;
  if (!rel) return;
  const x = projectOfRelease(s, rel);
  if (x && x.p.releaseId === rel.id) launchFx(s, rel, x.p, x.pl);
});

registerSimHook('week', 'proj12', (s) => {
  const st = proj12(s);
  const mine = new Set(playerActs(s));
  for (const p of proj8(s).list) {
    const pl = st.meta[p.id];
    if (!pl || p.closed || !mine.has(p.actId)) continue;
    // faixas gravadas em sessão de estúdio (que não passam pelo gancho de gravação)
    if (!p.releaseId) for (const id of p.songIds) { const so = s.songs[id]; if (so?.recorded) recBonus(s, so); }
    if (!pl.problem) detect(s, p, pl);
    else if (projectStage(s, p) === 'scheduled' || p.releaseId) pl.problem = undefined;
    // prestígio: a crítica decide, seis semanas depois do lançamento
    const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
    if (rel && pl.intent === 'prestige' && !pl.fx2 && s.week - rel.week >= 6) {
      pl.fx2 = true;
      const rv = s.reviews[rel.id];
      const sc = rv?.length ? Math.round((rv.reduce((t, r) => t + r.score, 0) / rv.length) * 10) : rel.critic ?? 0;
      const act = s.acts[p.actId];
      if (sc >= 70 && act) { s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100); act.fame = clamp(act.fame + 3, 0, 100); log(pl, s.week, fmtL(l('A crítica deu {n}: prestígio recuperado (reputação artística +3, alcance +3).', 'Critics gave {n}: prestige recovered (artistic reputation +3, reach +3).'), { n: sc }), true); }
      else if (sc < 60) { s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100); log(pl, s.week, fmtL(l('A crítica deu {n}: o prestígio não voltou (reputação artística −1).', 'Critics gave {n}: prestige did not return (artistic reputation −1).'), { n: sc }), false); }
      else log(pl, s.week, fmtL(l('A crítica deu {n}: respeito, mas sem consagração.', 'Critics gave {n}: respect, but no acclaim.'), { n: sc }));
    }
  }
  for (const id of Object.keys(st.meta)) if (!proj8(s).list.some((p) => p.id === id)) delete st.meta[id];
});

// ------------------------------------------------------------------ próximo passo

export function nextStepBlock(s: GameState, p: MusicProject, step: NextStep): L | null {
  const rel = p.releaseId ? s.releases[p.releaseId] : undefined;
  if (!rel) return l('O disco ainda não saiu.', 'The record is not out yet.');
  const pl = planOf12(s, p);
  if (pl?.next) return l('O próximo passo deste disco já foi escolhido.', 'This record\'s next step was already chosen.');
  if (step === 'deluxe') {
    if (p.type !== 'lp') return l('Deluxe é para álbuns.', 'Deluxe is for albums.');
    if (deluxeSongs(s, p).length < 2) return l('Precisa de 2 faixas inéditas já gravadas.', 'Needs 2 recorded unreleased tracks.');
  }
  if (step === 'pause' && (s.acts[p.actId]?.hiatusUntil ?? 0) > s.week) return l('O artista já está em pausa.', 'The act is already on a break.');
  return null;
}

function deluxeSongs(s: GameState, p: MusicProject): string[] {
  const act = s.acts[p.actId];
  const taken = new Set(openProjects(s).filter((x) => x !== p && !x.releaseId).flatMap((x) => x.songIds));
  return (act?.songs ?? []).filter((id) => { const so = s.songs[id]; return so?.recorded && !so.releaseId && !so.vault && !taken.has(id); }).slice(0, 4);
}

/** Aplica o próximo passo; devolve o projeto novo quando cria um. */
export function chooseNext(s: GameState, p: MusicProject, step: NextStep): { err?: L; project?: MusicProject } {
  const err = nextStepBlock(s, p, step);
  if (err) return { err };
  const act = s.acts[p.actId]!;
  const rel = s.releases[p.releaseId!];
  const pl = (proj12(s).meta[p.id] ??= { intent: 'career', dir: 'signature', aud: 'core', budget: 'standard', deadlineKind: 'normal', deadline: s.week, solved: {}, conflicts: 0, log: [] });
  let project: MusicProject | undefined;
  if (step === 'single' || step === 'album') {
    const n = createProject(s, act.id, { type: step === 'single' ? 'single' : 'lp', concept: step === 'single' ? 'radio' : p.concept });
    if ('pt' in n) return { err: n };
    project = n;
    const intent: Intent = step === 'single' ? 'audience' : 'career';
    commitProject(s, n, { intent, dir: step === 'single' ? 'safe' : pl.dir, aud: INTENTS[intent].aud, budget: 'standard', deadline: 'normal' });
  } else if (step === 'tour') {
    pl.nextUntil = s.week + 16;
  } else if (step === 'deluxe') {
    const songs = deluxeSongs(s, p);
    const res = scheduleRelease(s, new Rng(seedState(`${s.config.seed}:p12dx:${p.id}`)), { actId: act.id, type: 'lp', songs, title: `${rel.title} (Deluxe)`, formats: availableFormats(s), press: Math.round(suggestedPress(s, act, 'lp') * 0.4), marketing: availableChannels(s).slice(0, 1).map((c) => ({ channel: c.id, budget: money(s, 800) })), territories: [...s.player.territories], weeksAhead: 2, kind: 'deluxe' });
    if ('pt' in res) return { err: res };
  } else if (step === 'pause') {
    act.hiatusUntil = s.week + 8;
    for (const id of act.members) { const m = s.persons[id]; if (m) { m.stress = clamp(m.stress - 30, 0, 100); m.fatigue = clamp(m.fatigue - 30, 0, 100); m.inspiration = clamp(m.inspiration + 20, 0, 100); } }
    act.trust = clamp(act.trust + 4, 0, 100); act.momentum *= 0.85;
  }
  pl.next = step;
  log(pl, s.week, fmtL(l('Próximo passo: {n}.', 'Next step: {n}.'), { n: NEXT[step].name }), true);
  return { project };
}

/** Quantos projetos pedem atenção (problema aberto ou prontos para programar). */
export function attentionCount(s: GameState): number {
  return openProjects(s).filter((p) => planOf12(s, p)?.problem || projectStage(s, p) === 'finishing').length;
}

export { projectById, type Act };
