// r27 (FLOW) — as atividades jogáveis DENTRO do fluxo normal (um caminho só por ação; ver flow27model.ts e
// docs/act27.md). Ao apertar Avançar (semana/mês), antes de o motor rodar, a interface oferece — um cartão por vez,
// na fila de janelas — as atividades daquela janela: "Sessão de composição: X — Jogar / Resolver rápido". Depois
// da última, o avanço segue normalmente; o resumo do mês diz o que foi jogado e o que foi no rápido.
// Bots, testes e autoplay usam a API do motor e nunca passam por aqui.

import './flow27.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { AgendaSlot, GameState } from '../../sim/types';
import type { Ctx17 } from '../../sim/sys/crime17';
import type { Draft27 } from '../../sim/sys/nego27';
import { modal, toast } from '../common';
import { h } from '../dom';
import { AFTER_ADVANCE } from '../registry';
import { statusChip27 } from '../ps/ui27';
import { openCompose27 } from './compose27';
import { openHeist27 } from './heist27';
import { openNego27, openReneg27 } from './negotiate27';
import { actMode27 } from './prefs27';
import { openRecord27 } from './record27';
import { openShow27 } from './show27';
import {
  activity27, agendaOf27, MONTH_CAP27, occPlayable27, planFlow27, screenOffered27, setPlayer27, summary27, tourOcc27,
  type AdvMode27, type FlowItem27, type FlowLog27, type Occ27,
} from './flow27model';

export { registerActivity27, registerOccasions27, setPlayer27, MONTH_CAP27, type Activity27, type Occ27, type FlowOut27 } from './flow27model';

// ---------------------------------------------------------------- telas das 6 atividades de sempre

/** Atos delegados cuja agenda virou manual só para marcar a composição jogada: voltam a delegados depois do avanço. */
const REDELEG = new WeakMap<GameState, Set<string>>();

setPlayer27('compose', (s, o, done) => {
  const id = o.actId!;
  const wasDeleg = s.delegated[id] !== false;
  // agenda delegada é refeita na abertura do mês: a sessão usa a agenda que vai rodar (a padrão de agora)
  if (wasDeleg) s.agenda[id] = agendaOf27(s, id).map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } }));
  openCompose27(s, id, (played) => {
    if (played && wasDeleg) { const set = REDELEG.get(s) ?? new Set<string>(); set.add(id); REDELEG.set(s, set); }
    done({ played });
  });
});
setPlayer27('record', (s, o, done) => openRecord27(s, o.sessId!, (played) => done({ played })));
setPlayer27('show', (_s, o, done) => openShow27(o.showKey!, (played) => done({ played })));
const classic = (o: Occ27) => () => (o.data?.classic as (() => void) | undefined)?.();
setPlayer27('nego', (_s, o, done) => { openNego27(o.actId!, o.data?.base as Draft27 | undefined, classic(o)); done({ played: true }); });
setPlayer27('reneg', (_s, o, done) => { openReneg27(String(o.data?.demandId), classic(o)); done({ played: true }); });
setPlayer27('heist', (s, o, done) => { openHeist27(s, String(o.data?.cid), o.data?.ctx as Ctx17, classic(o)); done({ played: true }); });

// ---------------------------------------------------------------- telas (oferta, renegociação, operação)

/** A tela natural da ação pergunta aqui: se a atividade é jogável, abre a mesa/o plano (com o caminho rápido
 *  dentro) e devolve true; senão devolve false e a tela de sempre segue. Uma entrada só por ação. */
export function screen27(id: 'nego' | 'reneg' | 'heist' | string, s: GameState, occ: Omit<Occ27, 'src' | 'key'> & { key?: string }, classicFn: () => void): boolean {
  const o: Occ27 = { src: 'screen', key: occ.key ?? `${id}:${occ.actId ?? ''}`, ...occ, data: { ...(occ.data ?? {}), classic: classicFn } };
  if (!screenOffered27(s, id, o, actMode27())) return false;
  activity27(id)!.play(s, o, () => {});
  return true;
}
/** Só a pergunta (para a tela decidir quais botões mostrar). */
export const screenOn27 = (id: string, s: GameState, occ: Omit<Occ27, 'src' | 'key'>): boolean => screenOffered27(s, id, { src: 'screen', key: id, ...occ }, actMode27());

// ---------------------------------------------------------------- o avanço

const mk = (g: GameState) => `${g.year}-${g.month}`;
/** Ocasiões já decididas neste mês (avanços por semana não perguntam de novo) e quantas foram oferecidas. */
const MONTH = new WeakMap<GameState, { m: string; done: Set<string>; offered: number }>();
const monthOf = (g: GameState) => {
  let x = MONTH.get(g);
  if (!x || x.m !== mk(g)) { x = { m: mk(g), done: new Set(), offered: 0 }; MONTH.set(g, x); }
  return x;
};
const PENDING = new WeakMap<GameState, FlowLog27>();
let bypass = false;
let active = false;
/** Algum cartão/atividade do avanço está na tela (fila de janelas: dicas e tours esperam). */
export const flowActive27 = (): boolean => active;

const nm = (it: FlowItem27): string => t(it.title);

/** Chamado por doAdvance antes do motor. true = o avanço espera os cartões (e `go` roda no fim). */
export function flowGate27(g: GameState, adv: AdvMode27, go: () => void): boolean {
  if (bypass) { bypass = false; return false; }
  if (active) return true;
  const mode = actMode27();
  if (mode === 'quick') return false; // sempre rápido: nada muda
  const mo = monthOf(g);
  const plan = planFlow27(g, adv, mode, Math.max(0, MONTH_CAP27 - mo.offered), mo.done);
  const log: FlowLog27 = { week: g.week, played: [], quick: plan.quick.map(nm), capped: plan.quick.filter((x) => x.why === 'cap').length };
  for (const x of plan.quick) mo.done.add(x.occ.key);
  // nada a oferecer: o resumo fica na agenda (sem aviso extra), o avanço segue como sempre
  if (!plan.offer.length) { if (log.quick.length) PENDING.set(g, { ...log, quiet: true }); return false; }
  mo.offered += plan.offer.length;
  active = true;
  let i = 0;
  let closeCard: (() => void) | null = null;
  let quiet = false; // fechar o cartão por programa (Jogar/Rápido) não é "cancelar"
  const shut = () => { quiet = true; closeCard?.(); closeCard = null; quiet = false; };
  const finish = () => {
    shut();
    active = false;
    PENDING.set(g, log);
    bypass = true;
    go();
  };
  const next = () => { i += 1; if (i >= plan.offer.length) finish(); else card(); };
  const quickOne = (it: FlowItem27) => {
    mo.done.add(it.occ.key);
    try { activity27(it.id)?.quick(g, it.occ); } catch (e) { console.warn('flow27', e); }
    log.quick.push(nm(it));
  };
  const card = () => {
    const it = plan.offer[i];
    const a = activity27(it.id)!;
    const body = h('div', { class: 'fl27', 'data-act': it.id },
      h('p', { class: 'fl27-step small muted' }, t(l('Atividade {i} de {n} deste avanço', 'Activity {i} of {n} in this advance'), { i: i + 1, n: plan.offer.length }),
        it.important ? statusChip27(l('importante', 'key'), 'accent') : null),
      h('h3', { class: 'fl27-t' }, '🎮 ', nm(it)),
      h('p', { class: 'fl27-pv' }, t(it.preview)),
      plan.quick.some((x) => x.why === 'cap') && i === 0 ? h('p', { class: 'small muted' }, t(l('Mais {n} atividade(s) passam do limite de {c} por mês e vão no rápido.', '{n} more activit(ies) go over the {c}-per-month limit and resolve quickly.'), { n: plan.quick.filter((x) => x.why === 'cap').length, c: MONTH_CAP27 })) : null,
      h('div', { class: 'fl27-act row wrap' },
        h('button', { class: 'btn primary', 'data-fl27': 'play', onclick: () => {
          shut();
          mo.done.add(it.occ.key);
          try {
            a.play(g, it.occ, (r) => { (r.played ? log.played : log.quick).push(nm(it)); next(); });
          } catch (e) { console.warn('flow27', e); log.quick.push(nm(it)); next(); }
        } }, '▶ ', t(l('Jogar', 'Play'))),
        h('button', { class: 'btn', 'data-fl27': 'quick', onclick: () => { quickOne(it); shut(); next(); } }, t(l('Resolver rápido', 'Resolve quickly'))),
        plan.offer.length - i > 1 ? h('button', { class: 'btn ghost small', onclick: () => { for (const x of plan.offer.slice(i)) quickOne(x); finish(); } }, t(l('Tudo no rápido e avançar', 'All quick and advance'))) : null),
      h('p', { class: 'small muted' }, t(l('Opções → Atividades: jogáveis / só importantes / sempre rápido.', 'Settings → Activities: playable / key only / always quick.'))));
    closeCard = modal(t(l('Antes de virar o mês', 'Before the month turns')), body, { onClose: () => {
      if (quiet) return;
      // ✕ / Esc: o avanço não acontece; o que já foi decidido fica decidido
      active = false;
      closeCard = null;
      toast(t(l('Avanço adiado: as atividades que faltam voltam no próximo Avançar.', 'Advance postponed: the remaining activities come back on the next Advance.')), 'info');
      for (const x of plan.offer.slice(i)) mo.done.delete(x.occ.key);
      mo.offered = Math.max(0, mo.offered - (plan.offer.length - i));
    } });
    (body.querySelector('[data-fl27=play]') as HTMLElement | null)?.focus();
  };
  card();
  return true;
}

AFTER_ADVANCE.push((s) => {
  const set = REDELEG.get(s);
  if (set) { for (const id of set) if (s.acts[id]) s.delegated[id] = true; REDELEG.delete(s); }
  const lg = PENDING.get(s);
  if (!lg) return;
  PENDING.delete(s);
  LAST.set(s, lg);
  const m = summary27(lg);
  if (m && !lg.quiet) setTimeout(() => toast(t(m), 'event'), 50);
});
const LAST = new WeakMap<GameState, FlowLog27>();

// ---------------------------------------------------------------- agenda: marcador e nota

/** Marcador "🎮 jogável" (prévia no título) para uma ocasião; null quando ela é só automática. */
export function occMark27(s: GameState, occ: Occ27 | null, when: L = l('No próximo avanço: Jogar ou Resolver rápido.', 'On the next advance: Play or Resolve quickly.')): HTMLElement | null {
  const it = occ ? occPlayable27(s, occ, actMode27()) : null;
  if (!it) return null;
  const tip = `${t(when)} ${t(it.preview)}`;
  return h('span', { class: 'fl27-mark', title: tip, 'aria-label': tip, tabindex: '0', 'data-act': it.id }, '🎮 ', t(l('jogável', 'playable')));
}
/** Prévia curta visível (uma linha) para o espaço da agenda. */
export function slotHint27(s: GameState, actId: string, slot: AgendaSlot, index: number): HTMLElement | null {
  const it = occPlayable27(s, { src: 'agenda', key: `ag:${actId}:${s.week}:${slot.action}:${index}`, actId, slot, index }, actMode27());
  return it?.short ? h('small', { class: 'fl27-hint' }, '🎮 ', t(it.short)) : null;
}
/** Marcador num espaço da agenda do artista. */
export const slotMark27 = (s: GameState, actId: string, slot: AgendaSlot, index: number): HTMLElement | null =>
  occMark27(s, { src: 'agenda', key: `ag:${actId}:${s.week}:${slot.action}:${index}`, actId, slot, index }, l('Na virada do mês: Jogar ou Resolver rápido.', 'When the month turns: Play or Resolve quickly.'));
/** Marcador no próximo show de uma turnê. */
export const tourMark27 = (s: GameState, tourId: string): HTMLElement | null => occMark27(s, tourOcc27(s, tourId));
/** Marcador numa sessão de estúdio em andamento. */
export const sessMark27 = (s: GameState, sessId: string): HTMLElement | null => {
  const x = s.sessions.find((y) => y.id === sessId);
  return x ? occMark27(s, { src: 'studio', key: `st:${x.id}`, actId: x.actId, sessId: x.id }) : null;
};

/** Linha "Mês passado: jogadas… / no rápido…" (agenda do artista). */
export function flowNote27(s: GameState): HTMLElement | null {
  const lg = LAST.get(s);
  const m = lg ? summary27(lg) : null;
  return m ? h('p', { class: 'fl27-note small muted' }, t(m)) : null;
}

/** Texto curto para a ajuda da agenda. */
export const FLOW_HELP27: L = l('Ações com 🎮 viram atividade jogável na virada do mês (até {c} por mês); o resto o motor resolve sozinho.', 'Actions marked 🎮 become a playable activity when the month turns (up to {c} a month); the engine resolves the rest on its own.');
