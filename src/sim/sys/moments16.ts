// Rodada 16 — momentos ilustrados: a pixel art deixa de ser cabeçalho fixo das telas e aparece só
// quando algo acontece (show, entrevista/imprensa, premiação, fim de sessão, lançamento, contrato).
// Aqui fica a parte pura (evento → momento) e o registro/fila; a interface (ui/sys/moments16) desenha.

import { VENUE_TIERS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { queueCutscene, registerExt4, registerSimHook } from '../ext4';
import type { GameState, MemoryEntry } from '../types';
import { fmtL, rememberListeners } from '../util';
import { c12 } from './tour12';

export type Award16 = 'major' | 'regional' | 'national' | 'festival' | 'contest' | 'hall' | 'special';
export type Press16 = 'tv' | 'radio' | 'magazine' | 'interview';
export type Moment16 =
  | { k: 'show'; year: number; tier: number; att: number; cap: number; fest?: boolean; city?: string }
  | { k: 'press'; year: number; medium: Press16 }
  | { k: 'award'; year: number; award: Award16 }
  | { k: 'record'; year: number }
  | { k: 'release'; year: number }
  | { k: 'contract'; year: number; renewal?: boolean };

export interface MomentRec16 { id: string; week: number; year: number; month: number; ev: Moment16; title: L; text: L; why: L[]; mem?: string }
interface St16 { log: MomentRec16[]; best: Record<string, number>; mk: number; n: number; seen: string[]; wk: Record<string, number> }

declare module '../ext4' { interface Ext4 { moments16: St16 } }
registerExt4('moments16', () => ({ log: [], best: {}, mk: -1, n: 0, seen: [], wk: {} }));
export const mo16 = (s: GameState): St16 => {
  const x = s.x4 as unknown as { moments16?: St16 };
  return (x.moments16 ??= { log: [], best: {}, mk: -1, n: 0, seen: [], wk: {} });
};

/** Porte (0 bar … 4 estádio) a partir da capacidade da casa, pelas faixas de VENUE_TIERS. */
export function tierOfCap16(cap: number): number {
  const i = VENUE_TIERS.findIndex((v) => cap <= v.cap[1]);
  return i < 0 ? VENUE_TIERS.length - 1 : i;
}

/** Fato do diário → momento (null = não tem cena). Shows comuns vêm dos ganchos, com porte exato. */
export function momentOfMemory16(kind: string, year: number): Moment16 | null {
  const aw = (award: Award16): Moment16 => ({ k: 'award', year, award });
  const pr = (medium: Press16): Moment16 => ({ k: 'press', year, medium });
  switch (kind) {
    case 'award': return aw('major');
    case 'award2': return aw('regional');
    case 'nat_award': return aw('national');
    case 'festival_tv': return aw('festival');
    case 'contest_win': return aw('contest');
    case 'hall_of_fame': return aw('hall');
    case 'ai_award': return aw('special');
    case 'interview': return pr('interview');
    case 'radio_visit': return pr('radio');
    case 'tv': return pr('tv');
    case 'magazine_cover': return pr('magazine');
    case 'session': return { k: 'record', year };
    case 'release': return { k: 'release', year };
    case 'signed': return { k: 'contract', year };
    case 'renewal': return { k: 'contract', year, renewal: true };
    case 'festival': case 'festival8': case 'festival9': return { k: 'show', year, tier: 4, att: 20000, cap: 20000, fest: true };
    default: return null;
  }
}

/** Grandes momentos furam o limite mensal; os menores entram no máximo 2 por mês. */
const MAJOR = new Set(['award', 'award2', 'nat_award', 'festival_tv', 'contest_win', 'hall_of_fame', 'ai_award', 'signed']);
/** Já têm cena interativa própria (entrevista, rádio): só guardamos para rever. */
const OWN_SCENE = new Set(['interview', 'radio_visit', 'renewal']);
/** Cena própria do mesmo assunto na semana (evita duas janelas seguidas). */
const SAME: Record<string, string> = { award: 'awards', festival: 'festivalDay', festival8: 'festivalDay', festival9: 'festivalDay' };

function mine(s: GameState, e: MemoryEntry): boolean {
  if (e.actId) return s.acts[e.actId]?.owner === 'player';
  return !!e.important || e.kind.startsWith('festival');
}

const TITLE: Record<Moment16['k'], L> = {
  show: l('Noite de show', 'Show night'), press: l('Na mídia', 'In the media'), award: l('Premiação', 'Awards'),
  record: l('Sessão concluída', 'Session wrapped'), release: l('Lançamento', 'Release day'), contract: l('Contrato assinado', 'Contract signed'),
};

function log16(s: GameState, ev: Moment16, text: L, why: L[], queue: boolean, major: boolean, key: string, mem?: string): void {
  const st = mo16(s);
  const rec: MomentRec16 = { id: `mo${s.week}-${st.log.length}-${ev.k}`, week: s.week, year: s.year, month: s.month, ev, title: TITLE[ev.k], text, why, mem };
  st.log.push(rec);
  if (st.log.length > 80) st.log.splice(0, st.log.length - 80);
  if (!queue) return;
  if (st.wk[key] === s.week) return; // um por assunto por semana
  const mk = s.year * 12 + s.month;
  if (st.mk !== mk) { st.mk = mk; st.n = 0; }
  if (!major && st.n >= 2) return;
  if (!major) st.n += 1;
  st.wk[key] = s.week;
  for (const k of Object.keys(st.wk)) if (s.week - st.wk[k] > 8) delete st.wk[k];
  queueCutscene(s, 'moment16', { title: TITLE[ev.k], rec: rec.id });
}

rememberListeners().push((s, e) => {
  const ev = momentOfMemory16(e.kind, e.year);
  if (!ev || !mine(s, e)) return;
  if (e.kind === 'award2' && !e.important) return;
  const same = SAME[e.kind];
  const dup = !!same && (s.cutscenes ?? []).some((c) => c.kind === same && !c.seen && c.week === s.week);
  log16(s, ev, e.text, [], !OWN_SCENE.has(e.kind) && !dup, MAJOR.has(e.kind), e.kind, e.id);
});

/** Show tocado: vira momento quando é a primeira vez do artista nesse porte, ou o primeiro lotado/vazio nele. */
function onShow(s: GameState, actId: string, cityId: string, att: number, cap: number, tier: number, live: boolean): void {
  const st = mo16(s);
  const a = s.acts[actId];
  const full = cap > 0 ? att / cap : 0;
  const first = (st.best[actId] ?? -1) < tier;
  const soKey = `${actId}:so${tier}`, emKey = `${actId}:em${tier}`;
  const sold = full >= 0.95 && tier >= 1 && !st.best[soKey];
  const empty = full < 0.35 && tier >= 2 && !st.best[emKey];
  if (!first && !sold && !empty) return;
  if (first) st.best[actId] = tier;
  if (sold) st.best[soKey] = 1;
  if (empty) st.best[emKey] = 1;
  const v = VENUE_TIERS[tier];
  const c = cityById[cityId]?.name ?? l(cityId, cityId);
  const text = fmtL(l('{a} em {c}: {n} de {k} pessoas.', '{a} in {c}: {n} of {k} people.'), { a: a?.name ?? '?', c, n: att.toLocaleString('pt-BR'), k: cap.toLocaleString('pt-BR') });
  const why: L[] = [fmtL(l('Casa: {t} ({x}–{y} lugares). A cena mostra esse porte.', 'Venue: {t} ({x}–{y} seats). The scene shows that size.'), { t: v.name, x: v.cap[0], y: v.cap[1] })];
  if (first) why.push(tier ? l('Primeira vez do artista nesse porte de casa.', 'First time the act plays a room this size.') : l('Primeiro show registrado: todo mundo começa nos bares.', 'First recorded show: everyone starts in bars.'));
  if (sold) why.push(l('Lotou: sinal de que o próximo porte já cabe.', 'Sold out: the next size up now fits.'));
  if (empty) why.push(l('Casa grande vazia: a imprensa comenta e o artista perde moral.', 'Big room, empty seats: the press talks and the act loses morale.'));
  // o mini-jogo ao vivo já mostra as noites grandes da turnê clássica
  log16(s, { k: 'show', year: s.year, tier, att, cap, city: cityId }, text, why, !live, false, `show:${actId}`);
}

registerSimHook('show', 'moments16', (s, _r, a) => {
  const sh = a.show;
  if (!sh || s.acts[sh.actId]?.owner !== 'player') return;
  const tier = tierOfCap16(sh.capacity);
  onShow(s, sh.actId, sh.cityId, sh.sold, sh.capacity, tier, tier >= 3);
});

registerSimHook('week', 'moments16', (s) => {
  const st = mo16(s);
  const seen = new Set(st.seen);
  for (const sh of c12(s).shows) {
    if (sh.status !== 'played' || !sh.res || sh.res.cancelled || seen.has(sh.id) || s.week - sh.week > 6) continue;
    st.seen.push(sh.id);
    onShow(s, sh.actId, sh.city, sh.res.att, sh.res.cap, sh.tier, false);
  }
  if (st.seen.length > 200) st.seen.splice(0, st.seen.length - 200);
});
