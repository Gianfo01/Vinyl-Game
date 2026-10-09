// Estúdio sob medida (rodada 12): não existe mais "receita ideal por gênero". O melhor foco por etapa
// e a melhor receita sonora dependem do contexto da faixa: pontos fortes do artista, conceito do
// projeto, assinatura do produtor e público-alvo — além da tradição do gênero, que vira só um dos pesos.
// Tudo é derivado do estado (projeto aberto, sessão, formação), então o save não guarda nada novo aqui.

import { clamp, hashString } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerMod } from '../ext4';
import { actTalent } from '../people';
import { PRODUCERS, SIGNATURES, type ProducerDef } from '../studio';
import type { Act, GameState, Song } from '../types';
import { fmtL } from '../util';
import { FOCUS_IDEAL, type Stage } from './music/data';
import { EFFECTS, INGREDIENTS } from './creation/core';

export type Aud12 = 'young' | 'adult' | 'core' | 'critics';
export const AUDIENCES: Record<Aud12, { name: L; desc: L }> = {
  young: { name: l('Jovens e pistas', 'Youth and dancefloors'), desc: l('Querem brilho e impacto: mixagem caprichada, sons dançantes e futuristas.', 'They want shine and punch: a polished mix, danceable and futuristic sounds.') },
  adult: { name: l('Público adulto e rádio', 'Adults and radio'), desc: l('Querem canção: composição forte, clima épico, nostálgico ou melancólico.', 'They want songs: strong writing, an epic, nostalgic or melancholic mood.') },
  core: { name: l('Fãs fiéis do artista', 'The act\'s core fans'), desc: l('Querem o artista de sempre, tocando de verdade: gravação viva e a cara dos discos anteriores.', 'They want the act they know, really playing: live takes and the feel of earlier records.') },
  critics: { name: l('Crítica e público cult', 'Critics and cult audience'), desc: l('Querem ideias: arranjos ousados, sons experimentais.', 'They want ideas: bold arrangements, experimental sounds.') },
};

const KEYS: Stage[] = ['comp', 'arr', 'rec', 'mix'];
const STAGE_NAME: Record<Stage, L> = { comp: l('composição', 'songwriting'), arr: l('arranjo', 'arrangement'), rec: l('gravação', 'recording'), mix: l('mixagem', 'mixing') };
type Tilt = Partial<Record<Stage, number>>;
const CONCEPT_TILT: Record<string, Tilt> = { debut: { rec: 10 }, radio: { mix: 12, comp: 4 }, art: { arr: 10, comp: 6 }, roots: { rec: 12 }, reinvent: { arr: 12, mix: 4 }, budget: { comp: 12, mix: -6 } };
const SIG_TILT: Record<ProducerDef['signature'], Tilt> = {
  wall_of_sound: { arr: 12 }, lofi: { rec: 10, mix: -8 }, maximalist: { mix: 10, arr: 6 }, dry: { rec: 12, mix: -4 }, organic: { rec: 12 },
  trap808: { mix: 12 }, neural: { mix: 12, arr: 4 }, swing: { arr: 8, rec: 6 }, dub: { mix: 12 }, glossy: { mix: 10, comp: 2 },
};
const AUD_TILT: Record<Aud12, Tilt> = { young: { mix: 10 }, adult: { comp: 10 }, core: { rec: 8 }, critics: { arr: 10, comp: 4 } };
const CONCEPT_FX: Record<string, string[]> = { debut: [], radio: ['danceable', 'epic'], art: ['experimental', 'melancholic'], roots: ['nostalgic', 'spiritual'], reinvent: ['futuristic', 'experimental', 'rebellious'], budget: [] };
const AUD_FX: Record<Aud12, string[]> = { young: ['danceable', 'futuristic', 'sensual'], adult: ['melancholic', 'nostalgic', 'epic'], core: [], critics: ['experimental', 'melancholic', 'rebellious'] };
const SIG_FX: Record<ProducerDef['signature'], string[]> = {
  wall_of_sound: ['epic'], lofi: ['nostalgic', 'melancholic'], maximalist: ['epic', 'danceable'], dry: ['aggressive', 'rebellious'], organic: ['nostalgic', 'spiritual'],
  trap808: ['aggressive', 'sensual'], neural: ['futuristic'], swing: ['danceable'], dub: ['experimental', 'spiritual'], glossy: ['sensual', 'danceable'],
};
/** Que habilidade da formação cada ingrediente exige. */
const ING_SKILL: Record<string, 'instr' | 'voice' | 'prod'> = {
  strings: 'instr', horns: 'instr', acoustic: 'instr', distortion: 'instr', organ: 'instr', percussion: 'instr',
  choir: 'voice', whisper: 'voice', shout: 'voice',
  synth: 'prod', drum_machine: 'prod', sample: 'prod', reverb: 'prod', autotune: 'prod', tape_noise: 'prod', neural: 'prod',
};

interface P8Lite { id: string; actId: string; concept: string; songIds: string[]; producerId?: string; closed?: boolean; releaseId?: string; created: number }
const projects = (s: GameState): P8Lite[] => ((s.x4 as unknown as { proj8?: { list: P8Lite[] } }).proj8?.list ?? []);
const meta12 = (s: GameState, id: string): { aud?: Aud12; intent?: string } | undefined => (s.x4 as unknown as { proj12?: { meta: Record<string, { aud?: Aud12; intent?: string }> } }).proj12?.meta[id];

export interface StudioCtx { act: Act; project?: P8Lite; concept?: string; producer?: ProducerDef; aud: Aud12; audSet: boolean }

/** Contexto de uma faixa (ou do próximo trabalho do artista): projeto, produtor e público-alvo. */
export function studioContext(s: GameState, actId: string, songId?: string, producerId?: string): StudioCtx | null {
  const act = s.acts[actId];
  if (!act) return null;
  const open = projects(s).filter((p) => p.actId === actId && !p.closed);
  const project = (songId ? open.find((p) => p.songIds.includes(songId)) : undefined) ?? open.filter((p) => !p.releaseId).sort((a, b) => b.created - a.created)[0];
  const sess = songId ? s.sessions.find((x) => x.songIds.includes(songId)) : undefined;
  const pid = producerId ?? sess?.producerId ?? project?.producerId;
  const m = project ? meta12(s, project.id) : undefined;
  const aud: Aud12 = m?.aud ?? (act.positioning >= 65 ? 'young' : act.positioning <= 30 ? 'core' : 'adult');
  return { act, project, concept: project?.concept, producer: PRODUCERS.find((x) => x.id === pid), aud, audSet: !!m?.aud };
}

/** Força relativa da formação em cada etapa (0–100). */
function stageStrength(s: GameState, act: Act): Record<Stage, number> {
  const t = actTalent(s, act);
  return { comp: (t.comp + t.lyr) / 2, arr: t.instr, rec: (t.voice + t.stage) / 2, mix: t.prod };
}

export interface FocusDriver { label: L; stage: Stage }

/** Foco ideal da gravação neste contexto (soma 100) e os fatores que o empurram. */
export function focusIdeal(s: GameState, ctx: StudioCtx, genre?: string): { ideal: Record<Stage, number>; drivers: FocusDriver[] } {
  const fam = familyOf(genre ?? ctx.act.genre);
  const base = FOCUS_IDEAL[fam];
  const v: Record<Stage, number> = { comp: base.comp * 0.55, arr: base.arr * 0.55, rec: base.rec * 0.55, mix: base.mix * 0.55 };
  const drivers: FocusDriver[] = [];
  const add = (t: Tilt, label: L) => {
    let top: Stage | null = null;
    for (const k of KEYS) { v[k] += t[k] ?? 0; if ((t[k] ?? 0) > 0 && (!top || (t[k] ?? 0) > (t[top] ?? 0))) top = k; }
    if (top) drivers.push({ label, stage: top });
  };
  const str = stageStrength(s, ctx.act);
  const best = [...KEYS].sort((a, b) => str[b] - str[a]);
  add({ [best[0]]: 10, [best[3]]: -5 }, fmtL(l('pontos fortes de {a}', '{a}\'s strengths'), { a: ctx.act.name }));
  if (ctx.concept && CONCEPT_TILT[ctx.concept]) add(CONCEPT_TILT[ctx.concept], l('conceito do projeto', 'project concept'));
  if (ctx.producer) add(SIG_TILT[ctx.producer.signature], fmtL(l('assinatura de {p}', '{p}\'s signature'), { p: ctx.producer.name }));
  add(AUD_TILT[ctx.aud], fmtL(l('público-alvo: {x}', 'target audience: {x}'), { x: AUDIENCES[ctx.aud].name }));
  // cada formação tem seu jeito (fixo por artista, oculto)
  const h = hashString(`${s.config.seed}:focus12:${ctx.act.id}`);
  KEYS.forEach((k, i) => { v[k] = Math.max(3, v[k] + (((h >> (i * 4)) & 15) - 7.5) * 0.6); });
  const sum = KEYS.reduce((t, k) => t + v[k], 0);
  const ideal = {} as Record<Stage, number>;
  for (const k of KEYS) ideal[k] = Math.round((v[k] / sum) * 100);
  return { ideal, drivers };
}

export const stageName = (k: Stage): L => STAGE_NAME[k];

/** Ideal da faixa no momento da gravação. */
export function focusIdealForSong(s: GameState, song: Song): Record<Stage, number> | null {
  const ctx = studioContext(s, song.actId, song.id);
  return ctx ? focusIdeal(s, ctx, song.genre).ideal : null;
}

// ------------------------------------------------------------------ receita sonora × contexto

export interface RecipeFit { score: number; wanted: string[]; notes: { text: L; good: boolean }[] }

/** Efeitos que o contexto pede (conceito, público, produtor e, para fãs fiéis, a cara dos discos anteriores). */
export function wantedEffects(s: GameState, ctx: StudioCtx): string[] {
  const out = new Set<string>([...(CONCEPT_FX[ctx.concept ?? ''] ?? []), ...AUD_FX[ctx.aud], ...(ctx.producer ? SIG_FX[ctx.producer.signature] : [])]);
  if (ctx.aud === 'core') {
    const count: Record<string, number> = {};
    for (const id of ctx.act.songs) {
      if (!s.songs[id]?.releaseId) continue;
      for (const e of s.x4.creation.songs[id]?.effects ?? []) count[e] = (count[e] ?? 0) + 1;
    }
    const past = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([e]) => e);
    for (const e of past.length ? past : ['nostalgic']) out.add(e);
  }
  return [...out];
}

export function recipeFit(s: GameState, songId: string): RecipeFit | null {
  const song = s.songs[songId];
  if (!song) return null;
  const ctx = studioContext(s, song.actId, songId);
  if (!ctx) return null;
  const x = s.x4.creation.songs[songId];
  const recipe = x?.recipe ?? [];
  const wanted = wantedEffects(s, ctx);
  const notes: RecipeFit['notes'] = [];
  if (!recipe.length) return { score: 0, wanted, notes: [{ text: l('Sem receita: o arranjo fica neutro.', 'No recipe: the arrangement stays neutral.'), good: false }] };
  const eff = x?.effects ?? [];
  const hit = eff.filter((e) => wanted.includes(e));
  const miss = eff.filter((e) => !wanted.includes(e));
  if (hit.length) notes.push({ text: fmtL(l('O contexto pede {e}.', 'The context asks for {e}.'), { e: hit.map((e) => EFFECTS[e]?.pt.toLowerCase() ?? e).join(', ') }), good: true });
  if (miss.length && !hit.length) notes.push({ text: l('Nenhum efeito da receita casa com o conceito, o público ou o produtor.', 'No effect in the recipe suits the concept, audience or producer.'), good: false });
  const t = actTalent(s, ctx.act);
  let skill = 0;
  for (const id of recipe) {
    const k = ING_SKILL[id];
    if (!k) continue;
    const name = INGREDIENTS.find((g) => g.id === id)?.name ?? l(id);
    if (t[k] >= 65) { skill += 0.5; notes.push({ text: fmtL(l('{i}: a formação domina isso.', '{i}: the lineup excels at this.'), { i: name }), good: true }); }
    else if (t[k] < 40) { skill -= 0.7; notes.push({ text: fmtL(l('{i}: ninguém na formação faz isso bem.', '{i}: nobody in the lineup does this well.'), { i: name }), good: false }); }
  }
  const score = clamp((hit.length - 1) * 0.35 - (hit.length ? 0 : 0.2) + skill * 0.3, -1, 1);
  return { score: Math.round(score * 100) / 100, wanted, notes };
}

export const effectName = (e: string): L => EFFECTS[e] ?? l(e);

// a faixa principal: receita que conversa com o contexto rende mais; receita "de manual" fora dele, menos
registerMod('appeal', 'studio12:recipe', (s, v, c) => {
  const rel = c.release;
  if (!rel || (rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand) || rel.reissueOf) return null;
  const lead = rel.songs[0];
  if (!lead || !s.x4.creation.songs[lead]?.recipe?.length) return null;
  const fit = recipeFit(s, lead);
  if (!fit || Math.abs(fit.score) < 0.05) return null;
  return { value: v * (1 + 0.07 * fit.score), label: fit.score > 0 ? l('receita sonora sob medida', 'a tailor-made sound recipe') : l('receita sonora fora do contexto', 'a sound recipe out of context') };
});

export { SIGNATURES };
