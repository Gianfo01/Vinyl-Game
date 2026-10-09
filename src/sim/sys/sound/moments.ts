// Momentos de vida (rodada 9): 40 situações que puxam os eixos do som e o assunto das letras.
// Os 14 originais vêm do estado (humor, vício, luto, paixão, idade…); os 26 novos são detectados
// de memórias, decisões resolvidas, pensamentos e saúde — ou marcados por outros sistemas com
// markMoment(). Tudo em tabelas: nada de código novo por momento.

import { l, type L } from '../../../data/world';
import type { GameState } from '../../types';

export type MomentDef = { name: L; phrase: L; themes?: string[] };
/** Eixos: en de el vo po ex me gl tr (me = melancolia↔euforia, gl = local↔global, tr = tradição↔ruptura). */
export type AxisPull = Partial<Record<'en' | 'de' | 'el' | 'vo' | 'po' | 'ex' | 'me' | 'gl' | 'tr', number>>;

export const BASE_MOMENTS: Record<string, MomentDef> = {
  gr: { name: l('luto', 'grief'), phrase: l('escrita no luto', 'written in mourning'), themes: ['longing', 'heartbreak', 'faith'] },
  ad: { name: l('vício', 'addiction'), phrase: l('febril, escrita no excesso', 'feverish, written in excess'), themes: ['rebellion', 'party'] },
  rh: { name: l('reabilitação', 'rehab'), phrase: l('sóbria, sobre recomeçar', 'sober, about starting over'), themes: ['faith', 'nature'] },
  su: { name: l('sucesso recente', 'recent success'), phrase: l('confiante depois do sucesso', 'confident after a hit'), themes: ['money', 'party'] },
  fl: { name: l('fracasso recente', 'recent flop'), phrase: l('teimosa depois do tropeço', 'defiant after a stumble'), themes: ['rebellion', 'protest'] },
  lv: { name: l('apaixonado(a)', 'in love'), phrase: l('apaixonada', 'smitten'), themes: ['love'] },
  br: { name: l('término', 'breakup'), phrase: l('de coração partido', 'heartbroken'), themes: ['heartbreak'] },
  yo: { name: l('juventude', 'youth'), phrase: l('com pressa de juventude', 'with youthful hurry') },
  ol: { name: l('maturidade', 'maturity'), phrase: l('madura, sem pressa', 'mature, unhurried'), themes: ['nostalgia'] },
  ti: { name: l('exaustão', 'exhaustion'), phrase: l('cansada', 'weary') },
  st: { name: l('estresse', 'stress'), phrase: l('tensa', 'tense') },
  in: { name: l('inspiração', 'inspiration'), phrase: l('inspirada', 'inspired') },
  lo: { name: l('baixo astral', 'low spirits'), phrase: l('confessional', 'confessional'), themes: ['longing'] },
  hi: { name: l('alto astral', 'high spirits'), phrase: l('para cima', 'upbeat'), themes: ['party', 'dance'] },
};

export const BASE_PULL: Record<string, AxisPull> = {
  gr: { en: -15, de: -10, vo: 10, el: -6, me: -18 },
  ad: { ex: 15, po: -12, de: 6, tr: 6 },
  rh: { en: -8, vo: 8, po: 4, ex: -4, me: 4 },
  su: { po: 8, en: 6, de: 5, me: 10 },
  fl: { ex: 10, po: -5, me: -6, tr: 6 },
  lv: { en: 4, vo: 6, me: 12 },
  br: { vo: 10, en: -6, me: -14 },
  yo: { en: 8, el: 6, po: -5, tr: 6, me: 5 },
  ol: { en: -8, el: -6, ex: -6, po: 6, tr: -8 },
  ti: { en: -10, de: -6, me: -6 },
  st: { en: 8, po: -8, me: -4 },
  in: { ex: 8, de: 5, me: 5 },
  lo: { en: -6, vo: 6, me: -10 },
  hi: { en: 6, me: 12 },
};

/** Os 26 novos. */
export const NEW_MOMENTS: Record<string, MomentDef & { pull: AxisPull }> = {
  nb: { name: l('nascimento de filho', 'a child is born'), phrase: l('de berço, escrita com um bebê em casa', 'a lullaby-tinged song written with a baby at home'), themes: ['love', 'nature'], pull: { en: -8, vo: 8, me: 14, po: 4, el: -4 } },
  dv: { name: l('divórcio', 'divorce'), phrase: l('depois da separação, sem enfeite', 'after the split, unadorned'), themes: ['heartbreak', 'longing'], pull: { vo: 10, en: -6, me: -16, po: -4 } },
  fm: { name: l('problemas na família', 'trouble in the family'), phrase: l('com a cabeça em casa', 'with the mind back home'), themes: ['longing', 'faith'], pull: { en: -8, de: -6, me: -12, vo: 6 } },
  ex: { name: l('exílio', 'exile'), phrase: l('de quem não pode voltar', 'by someone who cannot go back'), themes: ['longing', 'protest'], pull: { vo: 8, me: -12, gl: 12, tr: 6, ex: 6 } },
  pr: { name: l('prisão', 'prison'), phrase: l('de cela, seca e direta', 'from a cell, stark and direct'), themes: ['rebellion', 'protest'], pull: { po: -14, de: -8, en: 6, me: -10, tr: 8 } },
  mp: { name: l('mudança de país', 'moving abroad'), phrase: l('entre dois mundos', 'caught between two worlds'), themes: ['road', 'city'], pull: { gl: 16, ex: 6, me: -4 } },
  rr: { name: l('volta às raízes', 'return to the roots'), phrase: l('de volta às raízes', 'back to the roots'), themes: ['nostalgia', 'nature'], pull: { el: -10, po: -4, gl: -16, tr: -14, ex: -4, me: 4 } },
  cv: { name: l('conversão religiosa', 'religious conversion'), phrase: l('em tom de fé recém-achada', 'in the tone of newfound faith'), themes: ['faith'], pull: { vo: 8, de: 6, me: 12, tr: -8, ex: -6, en: 2 } },
  gs: { name: l('doença grave', 'serious illness'), phrase: l('frágil, quase sussurrada', 'fragile, almost whispered'), themes: ['faith', 'longing'], pull: { en: -16, de: -8, vo: 12, me: -14, po: -2 } },
  ac: { name: l('acidente', 'accident'), phrase: l('escrita depois do susto', 'written after the scare'), themes: ['road', 'faith'], pull: { en: -6, me: -6, vo: 4, ex: 4 } },
  bk: { name: l('falência', 'bankruptcy'), phrase: l('de bolso vazio e língua afiada', 'broke and sharp-tongued'), themes: ['money', 'rebellion'], pull: { po: -10, de: -8, me: -8, tr: 6, en: 4 } },
  pc: { name: l('processo na justiça', 'lawsuit'), phrase: l('na defensiva, com advogado no pé', 'on the defensive, lawyers in tow'), themes: ['rebellion', 'money'], pull: { en: 6, po: -4, me: -8, tr: 6 } },
  fs: { name: l('fama repentina', 'sudden fame'), phrase: l('tonta de tanta luz', 'dizzy with the spotlight'), themes: ['money', 'party', 'city'], pull: { po: 10, en: 8, gl: 12, me: 8, de: 6 } },
  cg: { name: l('crise com a gravadora', 'row with the label'), phrase: l('de punhos fechados contra o selo', 'with a clenched fist at the label'), themes: ['rebellion', 'money'], pull: { po: -12, en: 8, ex: 8, me: -6, tr: 10 } },
  pd: { name: l('morte de parceiro de banda', 'death of a bandmate'), phrase: l('para o amigo que se foi', 'for the friend who is gone'), themes: ['longing', 'faith'], pull: { en: -14, vo: 10, de: -6, me: -18, tr: -4 } },
  mv: { name: l('entrada num movimento', 'joining a movement'), phrase: l('de bandeira na mão, em coro', 'banner in hand, as a chorus'), themes: ['protest', 'city'], pull: { en: 6, vo: 6, gl: -4, tr: 14, me: 6, ex: 6 } },
  mi: { name: l('militância', 'activism'), phrase: l('de palanque, sem rodeios', 'from the soapbox, no detours'), themes: ['protest', 'rebellion'], pull: { en: 10, vo: 10, po: -6, tr: 12, me: 2 } },
  cn: { name: l('censura', 'censorship'), phrase: l('cifrada, dizendo sem dizer', 'coded, saying without saying'), themes: ['protest', 'rebellion'], pull: { ex: 12, vo: 4, po: -4, tr: 10, me: -6, de: 4 } },
  mc: { name: l('crise de meia-idade', 'midlife crisis'), phrase: l('em plena crise de meia-idade', 'in the middle of a midlife crisis'), themes: ['nostalgia', 'longing'], pull: { ex: 8, en: 4, me: -8, tr: 8, el: 4 } },
  cb: { name: l('bloqueio criativo', 'creative block'), phrase: l('arrancada a fórceps', 'pulled out with forceps'), themes: ['longing'], pull: { ex: -8, de: -8, en: -4, me: -8, tr: -6 } },
  sb: { name: l('sobriedade', 'sobriety'), phrase: l('limpa, de cabeça clara', 'clean and clear-headed'), themes: ['faith', 'nature', 'love'], pull: { po: 6, vo: 6, ex: -4, me: 8, en: -2 } },
  pa: { name: l('paternidade / maternidade', 'parenthood'), phrase: l('de quem agora tem uma casa para voltar', 'by someone with a home to return to'), themes: ['love', 'nostalgia'], pull: { en: -4, po: 4, me: 8, ex: -4, tr: -6 } },
  vg: { name: l('viagem transformadora', 'life-changing trip'), phrase: l('trazida de uma viagem longe', 'brought back from a faraway trip'), themes: ['road', 'nature'], pull: { gl: 16, ex: 10, de: 4, me: 8, tr: 6 } },
  sd: { name: l('saudade', 'homesickness'), phrase: l('cheia de saudade', 'full of saudade'), themes: ['longing', 'nostalgia'], pull: { vo: 8, el: -6, me: -10, gl: -8, en: -6 } },
  fb: { name: l('amizade rompida', 'broken friendship'), phrase: l('para quem já não atende o telefone', 'for someone who no longer picks up'), themes: ['heartbreak', 'rebellion'], pull: { en: 4, vo: 6, me: -10, po: -4 } },
  rc: { name: l('reconciliação', 'reconciliation'), phrase: l('de pazes feitas', 'with peace made'), themes: ['love', 'faith'], pull: { de: 6, me: 14, vo: 4, tr: -4, po: 4 } },
};

export const MOMENTS: Record<string, MomentDef> = { ...BASE_MOMENTS, ...NEW_MOMENTS };
export const MOMENT_PULL: Record<string, AxisPull> = { ...BASE_PULL, ...Object.fromEntries(Object.entries(NEW_MOMENTS).map(([k, v]) => [k, v.pull])) };

// ---------------------------------------------------------------- detecção

/** Regras de memória: tipo de memória (ou "decision:<evento>") do ato → momento, horizonte em semanas e força. */
export const MEM_RULES: { code: string; k: string; h: number; s: number }[] = [
  { code: 'ex', k: 'decision:artist_exile', h: 150, s: 1 }, { code: 'ex', k: 'decision:tour_blocked', h: 60, s: 0.5 },
  { code: 'mp', k: 'decision:visa_denied', h: 80, s: 0.6 }, { code: 'mp', k: 'decision:member_drafted', h: 80, s: 0.6 }, { code: 'mp', k: 'territory', h: 60, s: 0.5 },
  { code: 'vg', k: 'travel', h: 40, s: 0.8 }, { code: 'vg', k: 'decision:diplomacy_tour', h: 60, s: 0.8 }, { code: 'vg', k: 'decision:fan_pilgrimage', h: 40, s: 0.6 },
  { code: 'rr', k: 'decision:diaspora_scene', h: 80, s: 0.6 }, { code: 'rr', k: 'decision:regional_award', h: 52, s: 0.4 },
  { code: 'pc', k: 'lawsuit', h: 90, s: 1 }, { code: 'pc', k: 'decision:plagiarism_suit', h: 90, s: 1 }, { code: 'pc', k: 'decision:sample_uncleared', h: 70, s: 0.8 },
  { code: 'pc', k: 'decision:cowriter_claim', h: 70, s: 0.8 }, { code: 'pc', k: 'decision:estate_dispute', h: 90, s: 0.8 }, { code: 'pc', k: 'decision:band_name_dispute', h: 70, s: 0.7 },
  { code: 'ac', k: 'tour_accident', h: 52, s: 1 }, { code: 'ac', k: 'decision:stage_fall', h: 40, s: 0.9 }, { code: 'ac', k: 'decision:bus_breakdown', h: 20, s: 0.5 },
  { code: 'bk', k: 'decision:family_debt', h: 80, s: 0.8 }, { code: 'bk', k: 'decision:hyperinflation', h: 80, s: 0.5 }, { code: 'bk', k: 'distress', h: 60, s: 0.7 },
  { code: 'fs', k: 'decision:viral_clip', h: 30, s: 0.8 }, { code: 'fs', k: 'decision:magazine_cover', h: 30, s: 0.7 }, { code: 'fs', k: 'viral', h: 30, s: 0.8 }, { code: 'fs', k: 'viral8', h: 30, s: 0.8 },
  { code: 'cg', k: 'decision:morality_clause', h: 70, s: 0.9 }, { code: 'cg', k: 'decision:contract_leak', h: 60, s: 0.7 }, { code: 'cg', k: 'renegotiation', h: 40, s: 0.4 },
  { code: 'pd', k: 'death', h: 78, s: 0.7 },
  { code: 'mv', k: 'movement', h: 156, s: 1 }, { code: 'mv', k: 'decision:movement_born', h: 156, s: 1 }, { code: 'mv', k: 'decision:scene_look_adopted', h: 80, s: 0.5 },
  { code: 'mi', k: 'decision:benefit_concert', h: 80, s: 0.8 }, { code: 'mi', k: 'decision:coded_anthem', h: 80, s: 0.8 }, { code: 'mi', k: 'decision:consent_wave_manifesto', h: 90, s: 1 }, { code: 'mi', k: 'union', h: 90, s: 0.6 },
  { code: 'cn', k: 'decision:censor_lyrics', h: 90, s: 1 }, { code: 'cn', k: 'decision:city_ban', h: 90, s: 0.9 }, { code: 'cn', k: 'decision:rock_moral_panic', h: 70, s: 0.8 }, { code: 'cn', k: 'decision:language_quota', h: 90, s: 0.5 },
  { code: 'fb', k: 'split', h: 100, s: 0.9 }, { code: 'fb', k: 'member_quits', h: 90, s: 0.8 }, { code: 'fb', k: 'fired', h: 80, s: 0.7 }, { code: 'fb', k: 'decision:leader_fires_member', h: 90, s: 0.9 }, { code: 'fb', k: 'decision:direction_split', h: 80, s: 0.6 },
  { code: 'rc', k: 'reunion', h: 100, s: 1 }, { code: 'rc', k: 'mediation', h: 70, s: 0.8 },
  { code: 'sb', k: 'recovery', h: 140, s: 0.7 }, { code: 'sb', k: 'treatment_done', h: 140, s: 0.7 },
  { code: 'fm', k: 'decision:parent_manager', h: 60, s: 0.3 }, { code: 'fm', k: 'decision:sibling_wants_in', h: 40, s: 0.3 },
  { code: 'pr', k: 'arrest', h: 120, s: 1 }, { code: 'pr', k: 'prison', h: 120, s: 1 },
];

/** Pensamentos (humor) que também revelam um momento. */
export const THOUGHT_RULES: { code: string; thought: string; s: number }[] = [
  { code: 'fm', thought: 'family_strain', s: 0.8 }, { code: 'ac', thought: 'injured', s: 0.7 }, { code: 'bk', thought: 'broke', s: 0.9 },
  { code: 'cg', thought: 'unpaid', s: 0.6 }, { code: 'cg', thought: 'fined', s: 0.6 }, { code: 'fb', thought: 'credit_taken', s: 0.5 },
  { code: 'fs', thought: 'top_chart', s: 0.5 }, { code: 'rc', thought: 'promise_kept', s: 0.4 },
];

export interface MomentCtx {
  fame: number; momentum: number; trust: number; hasLabel: boolean;
  age: number; insp: number; stress: number; fat: number;
  /** memória: tipo → semanas desde a entrada mais recente do ato */
  mem: Map<string, number>;
  thoughts: Set<string>;
  ill: boolean; burnout: boolean; cleanMonths: number;
  /** pessoa de fora do mercado do ato, e anos desde a formação */
  abroad: boolean; yearsFormed: number;
  /** filho mais novo do jogador (anos) e textos de vida recentes (semanas) */
  kidAge?: number; lifeAgo: { divorce?: number; birth?: number };
  sacred: boolean;
  /** marcas de outros sistemas: código → semanas restantes */
  marks: Record<string, number>;
}

/** Os 26 momentos novos que o estado atual sugere, com intensidade 0–1. */
export function detectNewMoments(c: MomentCtx): { code: string; k: number }[] {
  const out: Record<string, number> = {};
  const up = (code: string, k: number) => { if (k > (out[code] ?? 0)) out[code] = Math.min(1, k); };
  for (const r of MEM_RULES) {
    const ago = c.mem.get(r.k);
    if (ago !== undefined && ago <= r.h) up(r.code, r.s * (1 - (ago / r.h) * 0.7));
  }
  for (const r of THOUGHT_RULES) if (c.thoughts.has(r.thought)) up(r.code, r.s);
  for (const [code, left] of Object.entries(c.marks)) if (left > 0 && MOMENTS[code]) up(code, Math.min(1, 0.4 + left / 52));
  if (c.lifeAgo.divorce !== undefined && c.lifeAgo.divorce < 78) up('dv', 1 - c.lifeAgo.divorce / 110);
  if (c.lifeAgo.birth !== undefined && c.lifeAgo.birth < 52) up('nb', 1 - c.lifeAgo.birth / 70);
  if (c.kidAge !== undefined && c.kidAge <= 5) up('pa', 0.6 - c.kidAge * 0.06);
  if (c.ill) up('gs', 0.8);
  if (c.burnout || (c.insp < 16 && c.fat > 45)) up('cb', c.burnout ? 0.8 : 0.5 + (16 - c.insp) / 30);
  if (c.cleanMonths >= 12) up('sb', Math.min(0.9, 0.4 + c.cleanMonths / 60));
  if (c.fame < 45 && c.momentum > 82) up('fs', (c.momentum - 80) / 20);
  if (c.hasLabel && c.trust < 28) up('cg', (35 - c.trust) / 30);
  if (c.age >= 40 && c.age <= 54 && c.momentum < 38 && c.fame > 20) up('mc', 0.5 + (40 - c.momentum) / 80);
  if (c.abroad) up(c.yearsFormed < 3 ? 'mp' : 'sd', c.yearsFormed < 3 ? 0.6 : 0.4);
  if (c.sacred && c.mem.has('recovery')) up('cv', 0.4);
  return Object.entries(out).map(([code, k]) => ({ code, k }));
}

/** Outros sistemas (movimentos, censura, prisão, conversão…) marcam um momento no ato por algumas semanas. */
export function markMoment(s: GameState, actId: string, code: string, weeks = 52): void {
  if (!MOMENTS[code]) return;
  s.flags[`mom:${code}:${actId}`] = s.week + weeks;
}
export function momentMarks(s: GameState, actId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of Object.keys(NEW_MOMENTS)) {
    const until = s.flags[`mom:${code}:${actId}`];
    if (until !== undefined && until > s.week) out[code] = until - s.week;
  }
  return out;
}
