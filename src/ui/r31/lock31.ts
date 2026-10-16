// R31 · O — peças de interface dos fundamentos (sem dependência de telas: qualquer painel importa).
//  · lockBtn31: botão de ação que, travado, mostra o motivo e a condição para liberar ANTES do clique (RN-04).
//  · moneyTag31: etiqueta estimado / reservado / a pagar / pago ao lado de um valor (RN-03).
//  · basisTag31: etiqueta fato / cálculo / hipótese ao lado de um número (RN-27/28), com a nota "um resultado não prova".
import { t } from '../../i18n/strings';
import { lockLine31, lockOf31, type Lock31 } from '../../sim/r31/lock';
import { BASIS31, MONEY31, ONE_RESULT31, type Basis31, type Money31 } from '../../sim/r31/tags';
import type { L } from '../../data/world';
import { h } from '../dom';
import './o31.css';

type Kid = Node | string | number | null | undefined | false | Kid[];
let seq = 0;

export interface LockBtnOpts31 {
  /** classes do botão (padrão 'btn small') */
  cls?: string;
  /** dica quando livre */
  title?: string;
  /** só ícone 🔒 + dica (para botões miúdos em tabela); o padrão mostra o motivo numa linha embaixo */
  compact?: boolean;
  attrs?: Record<string, unknown>;
}

/** Botão de ação com o motivo do bloqueio visível. `lock` pode ser uma trava completa ou só o motivo (a condição é deduzida). */
export function lockBtn31(label: Kid, lock: Lock31 | L | null | undefined, onclick: (e: Event) => void, o: LockBtnOpts31 = {}): HTMLElement {
  const lk: Lock31 | null = !lock ? null : 'why' in lock ? lock : lockOf31(lock);
  const cls = o.cls ?? 'btn small';
  if (!lk) return h('button', { type: 'button', class: cls, title: o.title, ...(o.attrs ?? {}), onclick }, label);
  const id = `lk31-${++seq}`;
  const line = t(lockLine31(lk));
  const btn = h('button', { type: 'button', class: `${cls} lk31-off`, disabled: true, 'aria-disabled': 'true', 'aria-describedby': id, title: `🔒 ${line}`, 'data-lock31': '', ...(o.attrs ?? {}) }, label);
  return h('span', { class: `lk31${o.compact ? ' compact' : ''}`, title: `🔒 ${line}` },
    btn,
    h('small', { id, class: 'lk31-why', role: 'note' }, '🔒 ', h('span', null, t(lk.why)), h('span', { class: 'lk31-cond' }, ` → ${t(lk.unlock)}`)));
}

/** Só a nota de bloqueio (para formulários onde o botão já existe). */
export function lockNote31(lock: Lock31 | null | undefined): HTMLElement | null {
  if (!lock) return null;
  return h('p', { class: 'lk31-why small', role: 'note' }, '🔒 ', h('span', null, t(lock.why)), h('span', { class: 'lk31-cond' }, ` → ${t(lock.unlock)}`));
}

/** RN-03: etiqueta do estado do dinheiro. */
export function moneyTag31(kind: Money31): HTMLElement {
  const d = MONEY31[kind];
  return h('span', { class: `tag31 m31-${kind}`, title: t(d.hint), 'data-money31': kind }, d.icon, ' ', t(d.label));
}

/** RN-27/28: etiqueta da origem do número. `chance` acrescenta a nota de que um resultado não prova a estratégia. */
export function basisTag31(kind: Basis31, chance = false): HTMLElement {
  const d = BASIS31[kind];
  return h('span', { class: `tag31 b31-${kind}`, title: chance ? `${t(d.hint)} ${t(ONE_RESULT31)}` : t(d.hint), 'data-basis31': kind }, d.icon, ' ', t(d.label));
}

// ---------------------------------------------------------------- painel rápido sem ciclo de imports
/** Alvo do painel rápido (mesmo formato de quick31core.QTarget31). */
export interface QuickTarget31 { kind: 'act' | 'person' | 'project' | 'city'; id: string }
/** Preenchido por ui/r31/quick31.ts: qualquer tela abre o painel sem importar a pilha de telas. */
export const quickHook31: { open?: (tg: QuickTarget31, focus?: string) => void } = {};

/** Botão ⚡ que abre o painel rápido de ações (artista, pessoa, projeto ou cidade). */
export function quickBtn31(tg: QuickTarget31, name: string, cls = 'btn small ghost'): HTMLElement {
  return h('button', { type: 'button', class: cls, title: t({ pt: 'Ações rápidas (com o motivo do que estiver travado)', en: 'Quick actions (with the reason for anything locked)' }),
    'aria-label': t({ pt: `Ações rápidas: ${name}`, en: `Quick actions: ${name}` }), 'data-quick31': tg.kind,
    onclick: (e: Event) => { e.stopPropagation(); quickHook31.open?.(tg); } }, '⚡');
}

/** Valor com etiqueta: "$1.200 ≈ estimado". */
export function tagged31(value: Kid, tag: HTMLElement): HTMLElement {
  return h('span', { class: 'tagged31' }, value, ' ', tag);
}
