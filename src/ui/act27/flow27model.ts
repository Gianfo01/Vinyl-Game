// r27 (FLOW) — UM caminho só para cada atividade jogável. Antes havia dois: o fluxo normal (agenda do artista,
// sessão de estúdio, turnê, oferta, operação) e um botão "Jogar" separado ao lado. Agora a atividade acontece
// DENTRO do fluxo normal:
//   • "mês" (kind 'agenda' | 'studio' | 'show' | outro registrado): ao apertar Avançar, a interface junta as ocasiões
//     da janela que vai passar (a "Compor" da agenda, os dias de estúdio, o próximo show da turnê…) e oferece cada
//     uma ("Sessão de composição: X — Jogar / Resolver rápido"), no máximo MONTH_CAP27 por mês; o resto é o
//     modo rápido de sempre (o motor resolve sozinho).
//   • "tela" (kind 'screen'): a atividade É a tela natural (a mesa de negociação é a tela da oferta; o plano da
//     operação é o "Executar"), com um caminho rápido dentro dela.
// Este arquivo é PURO (sem DOM): registro, ocasiões e o plano do mês — testável e sem efeito em bots/testes, que
// nunca passam pela interface. As telas (play) são ligadas em flow27.ts via setPlayer27.

import { l, type L } from '../../data/world';
import { defaultAgenda, slotWeek } from '../../sim/agenda';
import { composeBlock27 } from '../../sim/sys/compose27';
import { playable27 } from '../../sim/sys/heist27';
import { negoGate27 } from '../../sim/sys/nego27';
import { recordBlock27 } from '../../sim/sys/record27';
import { playableShows27, showGate27, showKey27, venueName27 } from '../../sim/sys/show27';
import type { AgendaSlot, GameState } from '../../sim/types';
import { dateOfDay, fmtL, playerActs } from '../../sim/util';

/** Preferência global (Opções → Atividades). */
export type FlowMode27 = 'play' | 'key' | 'quick';
/** Como a interface vai avançar o tempo. */
export type AdvMode27 = 'week' | 'month' | 'quarter' | 'event' | 'until';
/** No máximo tantas atividades jogáveis por mês; o resto vai no rápido (com nota). */
export const MONTH_CAP27 = 3;

/** Uma ocasião: um espaço da agenda, um dia de estúdio, uma data da turnê, uma oferta… (objeto livre + chave). */
export interface Occ27 {
  /** fonte: 'agenda' | 'studio' | 'show' | 'screen' | outra registrada (registerOccasions27) */
  src: string;
  /** chave única da ocasião (para não oferecer duas vezes) */
  key: string;
  actId?: string;
  /** dia do jogo em que acontece (ordenação) */
  day?: number;
  slot?: AgendaSlot;
  index?: number;
  sessId?: string;
  showKey?: string;
  tier?: number;
  /** dados livres (atividades da fase 2, telas) */
  data?: Record<string, unknown>;
}

/** Resultado de uma atividade jogada (o `done` do play). */
export interface FlowOut27 { played: boolean; note?: L }

export interface Activity27 {
  id: string;
  /** de onde vêm as ocasiões: 'agenda' | 'studio' | 'show' | 'screen' | fonte registrada */
  kind: string;
  /** nome curto ("Sessão de composição") */
  label: L;
  /** esta atividade se aplica a esta ocasião? */
  when: (s: GameState, occ: Occ27) => boolean;
  /** conta como importante (modo "só as importantes")? */
  important: (s: GameState, occ: Occ27) => boolean;
  /** título do cartão ("Sessão de composição: Banda X") */
  title?: (s: GameState, occ: Occ27) => L;
  /** prévia: o que acontece se jogar × se resolver rápido */
  preview?: (s: GameState, occ: Occ27) => L;
  /** prévia curta (uma linha, mostrada no espaço da agenda / na lista) */
  short?: L;
  /** abre a atividade (interface); chama done ao terminar (jogada ou abandonada) */
  play: (s: GameState, occ: Occ27, done: (r: FlowOut27) => void) => void;
  /** modo rápido: o de sempre. Para as do mês costuma ser nada (o motor resolve ao avançar). */
  quick: (s: GameState, occ: Occ27) => void;
}

const REG: Activity27[] = [];
/** Registra (ou substitui, mesmo id) uma atividade jogável. */
export function registerActivity27(a: Activity27): void {
  const i = REG.findIndex((x) => x.id === a.id);
  if (i >= 0) REG[i] = a; else REG.push(a);
}
export const activities27 = (): readonly Activity27[] => REG;
export const activity27 = (id: string): Activity27 | undefined => REG.find((x) => x.id === id);

/** Fontes de ocasiões para o avanço (cada uma lista o que cai na janela de `days` dias). */
type OccSrc27 = (s: GameState, w: Window27) => Occ27[];
const SRC: Record<string, OccSrc27> = {};
export function registerOccasions27(src: string, fn: OccSrc27): void { SRC[src] = fn; }

export interface Window27 { adv: AdvMode27; from: number; to: number; opensMonth: boolean }

/** Janela do avanço: do dia de hoje até o fim da semana/mês; `opensMonth` = a agenda do mês roda neste avanço. */
export function window27(s: GameState, adv: AdvMode27): Window27 {
  const from = s.day + (s.clock?.dayInMonth ?? 0);
  const { year, month } = dateOfDay(s.config.startYear, s.day);
  const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const left = Math.max(1, dim - (s.clock?.dayInMonth ?? 0));
  const span = adv === 'week' ? Math.min(7, left) : left;
  return { adv, from, to: from + span, opensMonth: !s.clock?.opened };
}

// ---------------------------------------------------------------- fontes de sempre

/** Agenda que vai rodar (delegada = a padrão de agora). */
export function agendaOf27(s: GameState, actId: string): AgendaSlot[] {
  const a = s.acts[actId];
  if (!a) return [];
  return s.delegated[actId] !== false ? defaultAgenda(s, a) : (s.agenda[actId] ?? []);
}

registerOccasions27('agenda', (s, w) => {
  if (!w.opensMonth) return []; // a agenda do mês já rodou (o mês foi aberto por um avanço de semana)
  const out: Occ27[] = [];
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || (a.hiatusUntil && a.hiatusUntil > s.week)) continue;
    agendaOf27(s, id).forEach((slot, index) => out.push({ src: 'agenda', key: `ag:${id}:${s.week}:${slot.action}:${index}`, actId: id, slot, index, day: w.from + (slotWeek(slot, index) - 1) * 7 }));
  }
  return out;
});

registerOccasions27('studio', (s, w) => s.sessions
  .filter((x) => !x.done && x.startDay < w.to && !recordBlock27(s, x.id))
  .map((x) => ({ src: 'studio', key: `st:${x.id}`, actId: x.actId, sessId: x.id, day: Math.max(w.from, x.startDay) })));

registerOccasions27('show', (s, w) => playableShows27(s, Math.max(1, w.to - w.from))
  .map(({ t, st }) => ({ src: 'show', key: `sh:${showKey27(t.id, st.day)}`, actId: t.actId, showKey: showKey27(t.id, st.day), tier: st.tier, day: st.day, data: { cityId: st.cityId } })));

/** Todas as ocasiões da janela (fontes registradas). */
export function occasions27(s: GameState, w: Window27): Occ27[] {
  const out: Occ27[] = [];
  for (const [src, fn] of Object.entries(SRC)) {
    try { out.push(...fn(s, w)); } catch { /* uma fonte com erro não derruba o avanço */ void src; }
  }
  return out;
}

// ---------------------------------------------------------------- plano do mês

export type Why27 = 'mode' | 'cap' | 'long';
export interface FlowItem27 { id: string; occ: Occ27; important: boolean; title: L; preview: L; short?: L; why?: Why27 }
export interface FlowPlan27 { offer: FlowItem27[]; quick: FlowItem27[] }

const nameOf = (s: GameState, id?: string) => (id && s.acts[id]?.name) || '?';

/** Pura: quais atividades o avanço oferece (Jogar / Resolver rápido) e quais vão direto no rápido. */
export function planFlow27(s: GameState, adv: AdvMode27, mode: FlowMode27, cap = MONTH_CAP27, skip: ReadonlySet<string> = new Set()): FlowPlan27 {
  const w = window27(s, adv);
  const items: FlowItem27[] = [];
  const seen = new Set<string>();
  const once = new Set<string>(); // uma por atividade+ato (ex.: uma composição por ato no mês)
  for (const occ of occasions27(s, w)) {
    if (skip.has(occ.key) || seen.has(occ.key)) continue;
    for (const a of REG) {
      if (a.kind !== occ.src) continue;
      let ok = false;
      try { ok = a.when(s, occ); } catch { ok = false; }
      if (!ok) continue;
      const k1 = `${a.id}|${occ.actId ?? occ.key}`;
      if (a.kind === 'agenda' && once.has(k1)) continue;
      once.add(k1);
      seen.add(occ.key);
      const imp = !!a.important(s, occ);
      items.push({ id: a.id, occ, important: imp, title: a.title?.(s, occ) ?? fmtL(l('{a}: {b}', '{a}: {b}'), { a: a.label, b: nameOf(s, occ.actId) }), preview: a.preview?.(s, occ) ?? l('', '') });
      break;
    }
  }
  items.sort((x, y) => Number(y.important) - Number(x.important) || (x.occ.day ?? 0) - (y.occ.day ?? 0));
  const offer: FlowItem27[] = [];
  const quick: FlowItem27[] = [];
  const long = adv === 'quarter' || adv === 'event' || adv === 'until';
  for (const it of items) {
    if (long) quick.push({ ...it, why: 'long' });
    else if (mode === 'quick' || (mode === 'key' && !it.important)) quick.push({ ...it, why: 'mode' });
    else if (offer.length >= cap) quick.push({ ...it, why: 'cap' });
    else offer.push(it);
  }
  return { offer, quick };
}

/** A atividade de tela é oferecida (mesa/plano) ou vai direto no rápido (tela de sempre)? */
export function screenOffered27(s: GameState, id: string, occ: Occ27, mode: FlowMode27): boolean {
  const a = activity27(id);
  if (!a || mode === 'quick') return false;
  try { return a.when(s, occ) && (mode === 'play' || !!a.important(s, occ)); } catch { return false; }
}

/** Esta ocasião vira atividade jogável no próximo avanço? (marcador "🎮 jogável" + prévia) */
export function occPlayable27(s: GameState, occ: Occ27, mode: FlowMode27): FlowItem27 | null {
  if (mode === 'quick') return null;
  for (const a of REG) {
    if (a.kind !== occ.src) continue;
    let ok = false;
    try { ok = a.when(s, occ); } catch { ok = false; }
    if (!ok) continue;
    const imp = !!a.important(s, occ);
    if (mode === 'key' && !imp) return null;
    return { id: a.id, occ, important: imp, title: a.title?.(s, occ) ?? a.label, preview: a.preview?.(s, occ) ?? l('', ''), short: a.short };
  }
  return null;
}
/** Espaço da agenda (mesma chave que a fonte 'agenda' usa). */
export const slotPlayable27 = (s: GameState, actId: string, slot: AgendaSlot, index: number, mode: FlowMode27): FlowItem27 | null =>
  occPlayable27(s, { src: 'agenda', key: `ag:${actId}:${s.week}:${slot.action}:${index}`, actId, slot, index }, mode);
/** Próximo show jogável de uma turnê (marcador na lista de turnês). */
export function tourOcc27(s: GameState, tourId: string): Occ27 | null {
  const x = playableShows27(s, 40).find((y) => y.t.id === tourId);
  return x ? { src: 'show', key: `sh:${showKey27(x.t.id, x.st.day)}`, actId: x.t.actId, showKey: showKey27(x.t.id, x.st.day), tier: x.st.tier, day: x.st.day } : null;
}

/** Registro do que aconteceu no avanço (para o resumo do mês). */
export interface FlowLog27 { week: number; played: string[]; quick: string[]; capped: number; quiet?: boolean }
export function summary27(log: FlowLog27): L | null {
  if (!log.played.length && !log.quick.length) return null;
  const pt: string[] = [], en: string[] = [];
  if (log.played.length) { pt.push(`jogadas: ${log.played.join(', ')}`); en.push(`played: ${log.played.join(', ')}`); }
  if (log.quick.length) { pt.push(`no rápido: ${log.quick.join(', ')}`); en.push(`quick: ${log.quick.join(', ')}`); }
  if (log.capped) { pt.push(`(${log.capped} além do limite de ${MONTH_CAP27} por mês)`); en.push(`(${log.capped} over the ${MONTH_CAP27}-per-month limit)`); }
  return l(`🎮 Atividades do mês — ${pt.join(' · ')}`, `🎮 This month's activities — ${en.join(' · ')}`);
}

// ---------------------------------------------------------------- as 5 atividades de sempre
// `play` chama a tela ligada por flow27.ts (setPlayer27); sem tela (testes, bots), play conta como rápido.

type Player27 = (s: GameState, occ: Occ27, done: (r: FlowOut27) => void) => void;
const PLAYERS: Record<string, Player27> = {};
export function setPlayer27(id: string, fn: Player27): void { PLAYERS[id] = fn; }
const viaUi = (id: string): Player27 => (s, occ, done) => { const p = PLAYERS[id]; if (p) p(s, occ, done); else done({ played: false }); };
/** r27 (FLOW2): o mesmo "play pela tela ligada" para as atividades da fase 2 (flow27p2model.ts). */
export const viaUi27 = viaUi;
const nothing = (): void => {};

registerActivity27({
  id: 'compose', kind: 'agenda', label: l('Sessão de composição', 'Writing session'),
  when: (s, o) => o.slot?.action === 'compose' && !o.slot.params?.played27 && !!o.actId && !composeBlock27(s, o.actId),
  important: (s, o) => !!s.acts[o.actId ?? '']?.playerBand,
  title: (s, o) => fmtL(l('Sessão de composição: {a}', 'Writing session: {a}'), { a: nameOf(s, o.actId) }),
  preview: () => l('Jogar: cartas dos parceiros, energia e química decidem melodia, letra e originalidade. Rápido: as músicas saem sozinhas, como sempre.', 'Play: co-writers\' cards, energy and chemistry decide melody, lyrics and originality. Quick: the songs come out on their own, as always.'),
  short: l('Na virada do mês: sessão de cartas com os parceiros — ou rápido, como sempre.', 'When the month turns: a card session with your co-writers — or quick, as always.'),
  play: viaUi('compose'), quick: nothing,
});

registerActivity27({
  id: 'record', kind: 'studio', label: l('Gravação', 'Recording'),
  when: (s, o) => !!o.sessId && !recordBlock27(s, o.sessId),
  important: () => true,
  title: (s, o) => fmtL(l('Dias de estúdio: {a}', 'Studio days: {a}'), { a: nameOf(s, o.actId) }),
  preview: () => l('Jogar: cada dia é um take — aceitar, insistir, músico de sessão, arranjo novo — e a mixagem no fim. Rápido: o estúdio grava sozinho nos dias marcados.', 'Play: each day is a take — keep, push on, session player, new arrangement — then the mix. Quick: the studio records on its own on the booked days.'),
  short: l('No avanço: jogar os takes e a mixagem — ou o estúdio grava sozinho.', 'On advance: play the takes and the mix — or the studio records on its own.'),
  play: viaUi('record'), quick: nothing,
});

registerActivity27({
  id: 'show', kind: 'show', label: l('Show', 'Show'),
  when: (s, o) => !!o.showKey && !showGate27(s, o.showKey),
  important: (_s, o) => (o.tier ?? 0) >= 2,
  title: (s, o) => fmtL(l('Show: {a} — {v}', 'Show: {a} — {v}'), { a: nameOf(s, o.actId), v: venueName27(o.tier ?? 0) }),
  preview: () => l('Jogar: monte o setlist e decida os momentos da noite (falar com a plateia, estrear inédita, bis…). Rápido: o show acontece na data, como sempre.', 'Play: build the setlist and call the night\'s moments (talk to the crowd, debut a new song, encore…). Quick: the show happens on its date, as always.'),
  short: l('No avanço: setlist e momentos da noite — ou o show acontece sozinho.', 'On advance: setlist and the night\'s moments — or the show plays out on its own.'),
  play: viaUi('show'), quick: nothing,
});

// telas: a ocasião vem da própria tela (oferta, pedido de renegociação, operação do submundo)
registerActivity27({
  id: 'nego', kind: 'screen', label: l('Negociação', 'Negotiation'),
  when: (s, o) => !!o.actId && !!s.acts[o.actId] && !negoGate27(s, o.actId),
  important: (s, o) => (s.acts[o.actId ?? '']?.fame ?? 0) >= 15,
  play: viaUi('nego'), quick: (_s, o) => (o.data?.classic as (() => void) | undefined)?.(),
});
registerActivity27({
  id: 'reneg', kind: 'screen', label: l('Renegociação', 'Renegotiation'),
  when: (_s, o) => !!o.data?.demandId,
  important: (s, o) => (s.acts[o.actId ?? '']?.fame ?? 0) >= 30,
  play: viaUi('reneg'), quick: (_s, o) => (o.data?.classic as (() => void) | undefined)?.(),
});
registerActivity27({
  id: 'heist', kind: 'screen', label: l('Operação', 'Operation'),
  when: (_s, o) => typeof o.data?.cid === 'string' && playable27(o.data.cid as string),
  important: () => true,
  play: viaUi('heist'), quick: (_s, o) => (o.data?.classic as (() => void) | undefined)?.(),
});
