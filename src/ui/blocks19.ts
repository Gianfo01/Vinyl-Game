// Rodada 19 (Frente 8, 11.12) — BLOCOS do Cockpit com peso, condição e recolher persistente. Cartões do home18 e seções
// da Mesa (registerSection('desk', { weight, when, title })) entram num só conjunto: só os ~6 de maior peso abrem por
// padrão; o resto vira a faixa "Mais (n)". O jogador pode recolher (fica a barra), esconder (vai para "Mais") ou fixar
// aberto — a escolha mora no save (x4.ui19), então vale ao recarregar e em outro aparelho.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { registerExt4 } from '../sim/ext4';
import type { GameState } from '../sim/types';
import { rerender } from './common';
import { h } from './dom';
import { sectionList } from './registry';
import { foldWrap21, moreMenu21 } from './ux21';

export interface Block19 {
  id: string;
  title: L;
  /** maior = mais importante agora */
  weight: number;
  /** some quando falso (sem conteúdo / fora de contexto) */
  when?: boolean;
  el: HTMLElement | null;
  /** onde desenhar: topo (home) ou Mesa */
  host: 'home' | 'desk';
}
export type Pref19 = 'c' | 'o' | 'h';
export interface Ui19State { c: Record<string, Pref19> }
declare module '../sim/ext4' { interface Ext4 { ui19: Ui19State } }
registerExt4('ui19', () => ({ c: {} }));
export function ui19(s: GameState): Ui19State {
  const x = s.x4 as unknown as { ui19?: Ui19State };
  const st = (x.ui19 ??= { c: {} });
  st.c ??= {};
  return st;
}
export function setPref19(s: GameState, id: string, p: Pref19 | null): void { const c = ui19(s).c; if (p) c[id] = p; else delete c[id]; }

export const MAX19 = 6;
export interface Pick19 { open: Set<string>; more: Block19[]; all: Block19[] }
/** Escolhe quais blocos abrem: fixados pelo jogador + os de maior peso até `max`; escondidos e excedentes vão para "Mais". */
export function pick19(s: GameState, blocks: Block19[], max = MAX19): Pick19 {
  const pref = ui19(s).c;
  const live = blocks.filter((b) => b.when !== false && b.el);
  const open = new Set<string>();
  for (const b of live) if (pref[b.id] === 'o') open.add(b.id);
  for (const b of [...live].sort((a, c) => c.weight - a.weight)) {
    if (open.size >= max) break;
    if (pref[b.id] !== 'h') open.add(b.id);
  }
  return { open, more: live.filter((b) => !open.has(b.id)), all: live };
}

function ctl(s: GameState, b: Block19, collapsed: boolean): HTMLElement {
  const pref = ui19(s).c[b.id];
  // r21e (§2.3.2): um só botão "…" por bloco (recolher/expandir, fixar, esconder) em vez de dois
  return h('div', { class: 'b19-ctl' }, moreMenu21([
    { label: t(collapsed ? l('Expandir', 'Expand') : l('Recolher (fica salvo)', 'Collapse (saved)')), run: () => { setPref19(s, b.id, collapsed ? (pref === 'c' ? null : 'o') : 'c'); rerender(); } },
    { label: t(pref === 'o' ? l('Desafixar', 'Unpin') : l('Fixar aberto', 'Pin open')), on: pref === 'o', run: () => { setPref19(s, b.id, pref === 'o' ? null : 'o'); rerender(); } },
    { label: t(l('Mover para "Mais"', 'Move to "More"')), run: () => { setPref19(s, b.id, 'h'); rerender(); } },
  ], t(l('Opções do bloco {b}', 'Block options: {b}'), { b: t(b.title) })));
}
/** r21 (§2.3.2): Metas da era, Estrutura × era e Quem tem tempo abrem recolhidos (details, estado nas prefs). */
const FOLD21 = new Set(['desk:ux19-goals', 'desk:org12', 'desk:cap14']);
/** Desenha os blocos abertos de um host (recolhidos viram barra). */
export function renderBlocks19(s: GameState, p: Pick19, host: Block19['host']): HTMLElement[] {
  const pref = ui19(s).c;
  return p.all.filter((b) => b.host === host && p.open.has(b.id)).map((b) => {
    const col = pref[b.id] === 'c';
    return h('div', { class: `b19 ${col ? 'col' : ''}`, 'data-b19': b.id },
      col ? h('button', { class: 'b19-bar', onclick: () => { setPref19(s, b.id, null); rerender(); } }, '▸ ', t(b.title)) : FOLD21.has(b.id) ? foldWrap21(b.id, t(b.title), b.el) : b.el, ctl(s, b, col));
  });
}
/** Faixa "Mais (n)": abre um bloco escondido (fixa aberto). */
export function moreStrip19(s: GameState, p: Pick19): HTMLElement | null {
  if (!p.more.length) return null;
  // r21e (§2.3.2): "3 destaques + N outros" — os blocos fechados ficam num menu único em vez de uma fileira de botões
  const more = p.more.sort((a, b) => b.weight - a.weight);
  return h('div', { class: 'b19-more', role: 'toolbar', 'aria-label': t(l('Mais blocos', 'More blocks')) },
    moreMenu21(more.map((b) => ({ label: `+ ${t(b.title)}`, run: () => { setPref19(s, b.id, 'o'); rerender(); } })), t(l('Mais blocos', 'More blocks')), t(l('Mais ({n}) ▾', 'More ({n}) ▾'), { n: more.length })),
    h('small', { class: 'muted' }, more.slice(0, 4).map((b) => t(b.title)).join(' · '), more.length > 4 ? ' …' : ''),
    Object.keys(ui19(s).c).length ? h('button', { class: 'btn small ghost', title: t(l('Volta à escolha automática por peso', 'Back to automatic weight-based choice')), onclick: () => { ui19(s).c = {}; rerender(); } }, t(l('Restaurar', 'Reset'))) : null);
}

// ---------------------------------------------------------------- seções da Mesa: peso, condição e título

const DESK19: Record<string, [number, L]> = {
  invites8: [75, l('Convites', 'Invitations')], w4strike: [70, l('Greve', 'Strike')], proj12: [65, l('Projetos abertos', 'Open projects')], stories8: [55, l('Histórias em curso', 'Ongoing stories')],
  careers12: [50, l('Carreiras', 'Careers')], org12: [35, l('Estrutura × era', 'Structure vs era')], cap14: [30, l('Capacidade', 'Capacity')], links18: [30, l('Ligações recentes', 'Recent links')],
  era8: [20, l('A era', 'The era')], team8: [15, l('Equipe', 'Team')],
};
/** Seções registradas na Mesa como blocos (peso/condição/título do registro ou da tabela acima). */
export function deskBlocks19(s: GameState): Block19[] {
  return sectionList('desk', s).map((x) => {
    const d = DESK19[x.id];
    const w = typeof x.weight === 'function' ? x.weight(s) : x.weight ?? d?.[0] ?? 40;
    const when = x.when ? x.when(s) : true;
    return { id: `desk:${x.id}`, title: x.title ?? d?.[1] ?? l(x.id, x.id), weight: w, when, el: when ? x.render(s) : null, host: 'desk' as const };
  });
}
