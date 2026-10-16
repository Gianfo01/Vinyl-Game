// R31 · onda 3 (P) — parte leve das telas de resultado (sem importar páginas nem o painel rápido, para poder ser usada
// pela tela do projeto e pelo Diário sem ciclo de import): estado do filtro, navegação, bloco "resultado" das fichas e
// a linha de contexto do Diário (RN-10).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { diaryCtx31, projectResult31, type Row31 } from '../../sim/r31/results31';
import type { GameState, MemoryEntry } from '../../sim/types';
import { $, rerender, section } from '../common';
import { h } from '../dom';
import { store } from '../store';
import './res31.css';
import { setTab } from '../vis';

/** Filtro da tela de resultados (estado só da interface). */
export const RES31 = { dim: 'artist' as 'artist' | 'project', period: 'all' as number | 'all', focus: undefined as string | undefined };
export const RES_DEST31 = { area: 'finance', tab: 'business-finance/results31' };

/** Abre Finanças › Resultados já filtrado num artista ou projeto. */
export function goResults31(d: 'artist' | 'project', id?: string): void {
  RES31.dim = d; RES31.focus = id; RES31.period = 'all';
  setTab('business-finance', 'results31');
  const ev = new CustomEvent('vtn31-go', { detail: 'finance', cancelable: true });
  if (document.dispatchEvent(ev)) { store.area = 'finance' as typeof store.area; rerender(); }
}

export const KIND31: Record<string, L> = { rel: l('lançamento', 'release'), tour: l('turnê', 'tour'), proj: l('projeto', 'project'), x: l('projeto', 'project') };
export const money31 = (v: number): HTMLElement => h('span', { class: v < 0 ? 'neg31' : '' }, $(v));

export function miniRow31(r: Row31 | undefined, d: 'artist' | 'project', id: string, close?: () => void): HTMLElement {
  return h('div', { class: 'res31-mini' },
    r ? h('div', { class: 'row wrap small' },
      h('span', null, t(l('Receita', 'Revenue')), ' ', money31(r.rev)), h('span', null, t(l('Custo direto', 'Direct cost')), ' ', money31(r.cost)),
      h('span', null, t(l('Rateado', 'Allocated')), ' ', money31(r.shared)), h('b', null, t(l('Margem', 'Margin')), ' ', money31(r.margin)))
      : h('p', { class: 'muted small' }, t(l('Ainda sem receita ou custo registrado.', 'No revenue or cost recorded yet.'))),
    h('button', { class: 'btn small ghost', onclick: () => { close?.(); goResults31(d, id); } }, t(l('Ver em Resultados', 'See in Results'))));
}

/** Bloco na tela do projeto musical (project12). */
export function projResult31(s: GameState, p: { id: string; releaseId?: string; pendingId?: string }): HTMLElement {
  const id = p.releaseId ?? p.pendingId ?? p.id;
  const r = projectResult31(s, id) ?? projectResult31(s, p.id);
  return section(t(l('Resultado do projeto', 'Project result')), miniRow31(r, 'project', r?.id ?? id));
}

/** Contexto gravado de um fato do diário (RN-10): fato registrado no momento; a ligação causa → efeito é leitura. */
export function diaryCtxLine31(s: GameState, m: MemoryEntry): HTMLElement | null {
  const c = diaryCtx31(s, m);
  if (!c) return null;
  const parts = [t(l('caixa {c}', 'cash {c}'), { c: $(c.cash) }), t(c.famous === 'act' ? l('fama {f}', 'fame {f}') : l('reputação comercial {f}', 'commercial reputation {f}'), { f: c.fame })];
  if (c.chance !== undefined) parts.push(t(l('chance mostrada {p}%', 'shown chance {p}%'), { p: c.chance }));
  if (c.ref?.name) parts.push(t(l('em jogo: {n}', 'at stake: {n}'), { n: c.ref.name }));
  return h('span', { class: 'muted small ctx31', title: t(l('Fato registrado no momento. A ligação entre causa e efeito é leitura (inferência).', 'Fact recorded at the time. The link between cause and effect is a reading (inference).')) }, ` · ${t(l('no momento', 'at the time'))}: ${parts.join(' · ')}`);
}
