// R31 · O — PAINEL RÁPIDO DE AÇÃO (núcleo, sem DOM). Para um alvo (artista, pessoa, projeto, cidade) lista as ações
// possíveis, cada uma com o motivo do bloqueio e a condição para liberar (RN-04), o custo e o destino (r31/dest).
// A busca (Ctrl+K) usa o mesmo registro: "contratar X", "gravar com Y", "lançar Z", "turnê em Recife", "comprar casa".
//
// As regras não são copiadas: cada trava lê a função do sistema dono (offerEligible29, recordPlan20 via actionRow20,
// projectStage, planTour, buyVenue). Abrir o painel ou buscar nunca muda o estado.
//
//   quickRows31(s, { kind: 'act', id })     // linhas do painel
//   searchActions31(s, 'contratar beatles')  // [{ target, row, name }]
//
// As cenas da onda 2 registram mais ações com registerQuick31 (mesmo formato).

import { cityById, CITIES, l, type L } from '../../data/world';
import { defaultOffer, offerEligible29 } from '../../sim/contracts';
import { visibleAct } from '../../sim/future';
import type { Dest } from '../../sim/r31/dest';
import { cashLock31, lock31, lockOf31, UNLOCK31, type Lock31 } from '../../sim/r31/lock';
import { liveOf } from '../../sim/sys/live/state';
import { VENUE_KINDS } from '../../sim/sys/live/venue';
import { openProjects, projectStage } from '../../sim/sys/project8';
import { MAX_VENUES27, venueCount27 } from '../../sim/sys/venues17';
import type { Act, GameState } from '../../sim/types';
import { fmtL, money, playerActs } from '../../sim/util';
import { actionRow20 } from '../actions20';

export type QKind31 = 'act' | 'person' | 'project' | 'city';
export interface QTarget31 { kind: QKind31; id: string }
export type QVerb31 = 'sign' | 'record' | 'release' | 'tour' | 'buy' | 'open' | 'pin' | 'more' | 'renew' | 'rescind' | 'lineup';

export interface QAction31 {
  id: string;
  verb: QVerb31;
  label: L;
  icon: string;
  kinds: QKind31[];
  /** aparece para este alvo? */
  applies: (s: GameState, t: QTarget31) => boolean;
  /** trava (motivo + condição); null = pode */
  lock?: (s: GameState, t: QTarget31) => Lock31 | null;
  /** custo estimado (centavos) */
  cost?: (s: GameState, t: QTarget31) => number;
  /** para onde a ação leva */
  dest: (s: GameState, t: QTarget31) => Dest;
  /** ação que só lê / navega (abrir, fixar) */
  passive?: boolean;
  /** R31 · V: a ação abre uma cena (ou o modo de 2 cliques) em vez de navegar */
  run?: (s: GameState, t: QTarget31) => void;
}
export interface QRow31 { def: QAction31; lock: Lock31 | null; cost: number; dest: Dest }

const REG: QAction31[] = [];
export function registerQuick31(a: QAction31): void {
  const i = REG.findIndex((x) => x.id === a.id);
  if (i >= 0) REG[i] = a; else REG.push(a);
}
export const quickActions31 = (): readonly QAction31[] => REG;

// ---------------------------------------------------------------- alvos

const mine = (s: GameState, id: string): boolean => playerActs(s).includes(id);
/** Artista do alvo: o próprio, o da pessoa (integrante) ou o do projeto. */
export function actOf31(s: GameState, t: QTarget31): Act | undefined {
  if (t.kind === 'act') return s.acts[t.id];
  if (t.kind === 'project') { const p = openProjects(s).find((x) => x.id === t.id); return p ? s.acts[p.actId] : undefined; }
  if (t.kind === 'person') {
    const p = s.persons[t.id];
    if (!p) return undefined;
    return Object.values(s.acts).find((a) => a.members.includes(p.id) && visibleAct(s, a) && a.status !== 'retired' && a.status !== 'split');
  }
  return undefined;
}

/** Nome do alvo (para o título do painel e a busca). */
export function targetName31(s: GameState, t: QTarget31): L {
  if (t.kind === 'city') return cityById[t.id]?.name ?? l('—');
  if (t.kind === 'person') { const n = s.persons[t.id]?.name ?? '—'; return l(n, n); }
  if (t.kind === 'project') {
    const p = openProjects(s).find((x) => x.id === t.id);
    const a = p ? s.acts[p.actId]?.name ?? '' : '';
    return p ? l(`${p.title || 'Projeto'} · ${a}`, `${p.title || 'Project'} · ${a}`) : l('Projeto', 'Project');
  }
  const n = s.acts[t.id]?.name ?? '—';
  return l(n, n);
}

export const targetExists31 = (s: GameState, t: QTarget31): boolean =>
  t.kind === 'city' ? !!cityById[t.id] : t.kind === 'person' ? !!s.persons[t.id] : t.kind === 'project' ? openProjects(s).some((x) => x.id === t.id) : !!s.acts[t.id];

// ---------------------------------------------------------------- travas por ação (lendo os donos)

const N = (pt: string, en: string): L => l(pt, en);

/** RN-04: trava de contratar (proposta de selo) — a regra do radar, da ficha e do aceite. */
export function signLock31(s: GameState, a: Act): Lock31 | null {
  const el = offerEligible29(s, a, 'classic');
  if (!el.ok) return lockOf31(el.why ?? N('Não contratável agora.', 'Not signable right now.'));
  if ((s.offers ?? []).some((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'))) return lock31(N('Já existe uma oferta em aberto para este artista.', 'There is already an open offer for this act.'), UNLOCK31.offer);
  return cashLock31(s, defaultOffer(s, a).advance, N('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.'));
}

function bestProject(s: GameState, actId: string) {
  const ps = openProjects(s, actId);
  return ps.find((p) => projectStage(s, p) === 'finishing') ?? ps[0];
}
/** RN-04: trava de lançar (projeto pronto?). */
export function releaseLock31(s: GameState, actId: string, projectId?: string): Lock31 | null {
  const p = projectId ? openProjects(s).find((x) => x.id === projectId) : bestProject(s, actId);
  if (!p) return lock31(N('Nenhum projeto de disco aberto para este artista.', 'No open record project for this act.'), UNLOCK31.project);
  const st = projectStage(s, p);
  if (st === 'finishing') return null;
  if (st === 'scheduled' || st === 'released' || st === 'followup') return lock31(N('O lançamento já está programado.', 'The release is already scheduled.'), UNLOCK31.scheduled);
  return lock31(N('Faltam faixas gravadas para lançar.', 'Recorded tracks are still missing.'), UNLOCK31.record);
}

/** RN-04: trava de marcar turnê (as mesmas regras de planTour que não dependem da rota). */
export function tourLock31(s: GameState, a: Act): Lock31 | null {
  if (a.status === 'retired' || a.status === 'split') return lock31(N('O artista encerrou a carreira.', 'The act has ended its career.'), UNLOCK31.ended);
  if (a.status === 'hiatus') return lock31(N('O artista está em pausa.', 'The act is on hiatus.'), UNLOCK31.hiatus);
  if (s.tours.some((x) => x.actId === a.id && (x.status === 'planned' || x.status === 'running'))) return lock31(N('Já existe uma turnê marcada.', 'A tour is already booked.'), UNLOCK31.tour);
  return null;
}

/** Casa de shows: mesmas regras de buyVenue (sim/sys/live/venue). */
export function venueLock31(s: GameState, kind: (typeof VENUE_KINDS)[number]['id'] = 'club'): Lock31 | null {
  if (liveOf(s).venue) return lock31(N('Você já tem uma casa de shows própria.', 'You already own a venue.'), N('Venda a atual ou compre casas avulsas em Shows › Negócios.', 'Sell the current one or buy standalone venues in Shows › Business.'));
  if (venueCount27(s) >= MAX_VENUES27) return lock31(N('Quatro casas é o máximo que dá para administrar.', 'Four venues is as many as you can run.'), UNLOCK31.cap);
  const k = VENUE_KINDS.find((x) => x.id === kind)!;
  if (s.year < k.minYear) return lock31(N('Ainda não existem casas desse porte.', 'Venues of that size don\'t exist yet.'), fmtL(N('Disponível a partir de {y}.', 'Available from {y}.'), { y: k.minYear }));
  return cashLock31(s, money(s, k.price), N('Caixa insuficiente.', 'Not enough cash.'));
}

const ROSTER_LOCK = (): Lock31 => lock31(N('Nenhum artista no seu elenco.', 'No acts on your roster.'), UNLOCK31.roster);

// ---------------------------------------------------------------- registro de fábrica

const tabDest = (area: string, key: string, id: string, extra: Partial<Dest> = {}): Dest => ({ area, tab: `${key}/${id}`, ...extra });

registerQuick31({
  id: 'q.sign', verb: 'sign', icon: 'contract', kinds: ['act', 'person'], label: N('Contratar (fazer proposta)', 'Sign (make an offer)'),
  applies: (s, t) => { const a = actOf31(s, t); return !!a && !mine(s, a.id) && a.status !== 'retired' && a.status !== 'split'; },
  lock: (s, t) => signLock31(s, actOf31(s, t)!),
  cost: (s, t) => defaultOffer(s, actOf31(s, t)!).advance,
  dest: (s, t) => ({ area: 'market', intent: 'sign', actId: actOf31(s, t)!.id }),
});
registerQuick31({
  id: 'q.record', verb: 'record', icon: 'mic', kinds: ['act', 'person', 'project'], label: N('Gravar', 'Record'),
  applies: (s, t) => { const a = actOf31(s, t); return !!a && mine(s, a.id) && !!actionRow20(s, 'record.prepare', { act: a.id }); },
  lock: (s, t) => { const a = actOf31(s, t)!; const r = actionRow20(s, 'record.prepare', { act: a.id })!; return lockOf31(r.block, r.unlock); },
  dest: (s, t) => ({ area: 'artists', intent: 'record', actId: actOf31(s, t)!.id }),
});
registerQuick31({
  id: 'q.release', verb: 'release', icon: 'cd', kinds: ['act', 'person', 'project'], label: N('Lançar disco', 'Release a record'),
  applies: (s, t) => { const a = actOf31(s, t); return !!a && mine(s, a.id); },
  lock: (s, t) => releaseLock31(s, actOf31(s, t)!.id, t.kind === 'project' ? t.id : undefined),
  dest: (s, t) => tabDest('creation', 'creation-write', 'projects', { intent: 'release', actId: actOf31(s, t)!.id }),
});
registerQuick31({
  id: 'q.tour', verb: 'tour', icon: 'tour-bus', kinds: ['act', 'person', 'city'], label: N('Marcar show ou turnê', 'Book a show or tour'),
  applies: (s, t) => (t.kind === 'city' ? !!cityById[t.id] : ((a) => !!a && mine(s, a.id))(actOf31(s, t))),
  lock: (s, t) => {
    if (t.kind === 'city') { const ids = playerActs(s); if (!ids.length) return ROSTER_LOCK(); const free = ids.map((id) => s.acts[id]).find((a) => a && !tourLock31(s, a)); return free ? null : tourLock31(s, s.acts[ids[0]])!; }
    return tourLock31(s, actOf31(s, t)!);
  },
  dest: (s, t) => tabDest('shows', 'showsHub', 'tours', { intent: 'tour', actId: t.kind === 'city' ? undefined : actOf31(s, t)!.id }),
});
registerQuick31({
  id: 'q.buyVenue', verb: 'buy', icon: 'house', kinds: ['city'], label: N('Comprar casa de shows aqui', 'Buy a venue here'),
  applies: (_s, t) => !!cityById[t.id],
  lock: (s) => venueLock31(s, 'club'),
  cost: (s) => money(s, VENUE_KINDS[0].price),
  dest: () => tabDest('shows', 'showsHub', 'biz', { intent: 'buy' }),
});
registerQuick31({
  id: 'q.more', verb: 'more', icon: 'handshake', kinds: ['act', 'person'], label: N('Todas as ações do artista…', 'All actions for this act…'), passive: true,
  applies: (s, t) => { const a = actOf31(s, t); return !!a && mine(s, a.id); },
  dest: (s, t) => ({ area: 'artists', actId: actOf31(s, t)!.id }),
});
registerQuick31({
  id: 'q.open', verb: 'open', icon: 'eye', kinds: ['act', 'person', 'project', 'city'], label: N('Abrir a ficha', 'Open the sheet'), passive: true,
  applies: (s, t) => targetExists31(s, t),
  dest: (s, t) => (t.kind === 'act' ? { area: 'artists', actId: t.id } : t.kind === 'person' ? { area: 'artists', personId: `p:${t.id}` } : t.kind === 'project' ? tabDest('creation', 'creation-write', 'projects', { actId: actOf31(s, t)?.id }) : { area: 'world', intent: 'city' }),
});
registerQuick31({
  id: 'q.pin', verb: 'pin', icon: 'pin', kinds: ['act', 'person', 'city'], label: N('Fixar nos favoritos', 'Pin to favourites'), passive: true,
  applies: (s, t) => targetExists31(s, t),
  dest: (_s, t) => (t.kind === 'act' ? { area: 'artists', actId: t.id } : t.kind === 'person' ? { area: 'artists', personId: `p:${t.id}` } : { area: 'world', intent: `city:${t.id}` }),
});

// ---------------------------------------------------------------- linhas

export function quickRow31(s: GameState, def: QAction31, t: QTarget31): QRow31 | null {
  try {
    if (!def.kinds.includes(t.kind) || !def.applies(s, t)) return null;
    return { def, lock: def.lock?.(s, t) ?? null, cost: def.cost?.(s, t) ?? 0, dest: def.dest(s, t) };
  } catch { return null; }
}
/** Linhas do painel rápido (ações do jogo primeiro, depois abrir/fixar). */
export function quickRows31(s: GameState, t: QTarget31): QRow31[] {
  if (!targetExists31(s, t)) return [];
  const rows = REG.map((d) => quickRow31(s, d, t)).filter((x): x is QRow31 => !!x);
  return [...rows.filter((r) => !r.def.passive), ...rows.filter((r) => r.def.passive)];
}

// ---------------------------------------------------------------- busca que abre a ação

const fold = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const VERBS31: { verb: QVerb31; words: string[] }[] = [
  { verb: 'sign', words: ['contratar', 'assinar', 'proposta', 'sign', 'hire', 'offer'] },
  { verb: 'record', words: ['gravar', 'gravacao', 'record', 'recording'] },
  { verb: 'release', words: ['lancar', 'lancamento', 'release', 'launch'] },
  { verb: 'tour', words: ['turne', 'show', 'shows', 'marcar', 'tour', 'gig', 'book'] },
  { verb: 'buy', words: ['comprar', 'compra', 'buy', 'purchase'] },
  { verb: 'pin', words: ['fixar', 'favoritar', 'favorito', 'pin', 'favourite', 'favorite'] },
  { verb: 'renew', words: ['renovar', 'renovacao', 'renew', 'renewal'] },
  { verb: 'rescind', words: ['rescindir', 'rescisao', 'dispensar', 'terminate', 'drop'] },
  { verb: 'lineup', words: ['formacao', 'integrante', 'lineup', 'member'] },
];
const FILLER = new Set(['com', 'de', 'do', 'da', 'o', 'a', 'os', 'as', 'em', 'no', 'na', 'para', 'with', 'the', 'in', 'at', 'for', 'of', 'to', 'um', 'uma', 'casa', 'venue', 'disco', 'record']);

/** "contratar os beatles" → { verb: 'sign', rest: 'beatles' }. Sem verbo reconhecido: verb undefined. */
export function parseQuery31(q: string): { verb?: QVerb31; rest: string } {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return { rest: '' };
  const w0 = words[0];
  const hit = w0.length >= 3 ? VERBS31.find((v) => v.words.some((w) => w === w0 || (w.startsWith(w0) && w0.length >= 4))) : undefined;
  if (!hit) return { rest: words.join(' ') };
  let i = 1;
  while (i < words.length && FILLER.has(words[i])) i++;
  return { verb: hit.verb, rest: words.slice(i).join(' ') };
}

export interface QHit31 { target: QTarget31; row: QRow31; name: L; score: number }

/** Busca que resolve ação + alvo. Só leitura; no máximo `limit` resultados. */
export function searchActions31(s: GameState, q: string, limit = 8): QHit31[] {
  const { verb, rest } = parseQuery31(q);
  if (!verb) return [];
  const out: QHit31[] = [];
  const score = (name: string): number => {
    if (!rest) return 1;
    const n = fold(name);
    return n === rest ? 4 : n.startsWith(rest) ? 3 : n.split(/\s+/).some((w) => w.startsWith(rest)) ? 2.5 : n.includes(rest) ? 2 : 0;
  };
  const push = (t: QTarget31, sc: number) => {
    if (sc <= 0) return;
    for (const def of REG) {
      if (def.verb !== verb) continue;
      const row = quickRow31(s, def, t);
      if (row) out.push({ target: t, row, name: targetName31(s, t), score: sc + (row.lock ? 0 : 0.5) });
    }
  };
  const mineIds = new Set(playerActs(s));
  const actPool = verb === 'sign' ? (rest.length >= 2 ? Object.values(s.acts).filter((a) => !mineIds.has(a.id) && visibleAct(s, a)) : [])
    : [...mineIds].map((id) => s.acts[id]).filter(Boolean);
  for (const a of actPool) { const sc = score(a.name); if (sc > 0) push({ kind: 'act', id: a.id }, sc + (mineIds.has(a.id) ? 0.3 : Math.min(1, a.fame / 100))); }
  // pessoas (integrantes): "gravar com Fulano" acha a banda dele
  if (rest.length >= 3 && verb !== 'buy') {
    for (const a of actPool) for (const m of a.members) { const p = s.persons[m]; const sc = p?.alive && !p.isPlayer ? score(p.name) : 0; if (sc > 0) push({ kind: 'person', id: p.id }, sc - 0.2); }
  }
  if (verb === 'buy' || verb === 'tour') for (const c of CITIES) push({ kind: 'city', id: c.id }, rest ? Math.max(score(c.name.pt), score(c.name.en)) : (c.id === s.config.homeCity ? 1 : 0));
  // um resultado por (ação, artista): a pessoa só entra se a banda dela não entrou
  const seen = new Set<string>();
  return out.sort((x, y) => y.score - x.score).filter((h) => {
    const k = `${h.row.def.id}|${h.target.kind === 'city' ? h.target.id : actOf31(s, h.target)?.id ?? h.target.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, limit);
}
