// Rodada 18 (U2) — "ir para" comum (go18) e a área 'inbox' (mesmo id, mesmo atalho E), então o Cockpit e os links
// antigos continuam funcionando. r27 (INBOX): a vista virou a caixa estilo e-mail/FM de inbox27.ts (lista compacta +
// painel de leitura com o e-mail inteiro); as ações continuam as mesmas, agora num lugar só (ACT27).

import { l, type L } from '../../data/world';
import type { Goto18 } from '../../sim/inbox18';
import { unreadCount } from '../../sim/sys/people/inbox';
import type { GameState } from '../../sim/types';
import { inspect, rerender } from '../common';
import { registerArea } from '../registry';
import { personRoute16 } from '../route16';
import { store } from '../store';
import { setTab } from '../vis';
import './core18.css';
import { GO27, mailView27 } from './inbox27';

/** Abre o destino de um "ir para" (pessoa, ato ou área/aba). */
export function go18(g: Goto18): void {
  if (g.person) {
    if (g.person.startsWith('a:')) { inspect.act(g.person.slice(2)); return; }
    if (personRoute16.f?.(g.person)) return;
  }
  if (g.act) { inspect.act(g.act); return; }
  if (g.area) { if (g.tab) setTab(g.tab[0], g.tab[1]); store.area = g.area as typeof store.area; rerender(); }
}
export const gotoLabel = (g: Goto18): L => g.label ?? (g.person ? l('Ver pessoa', 'See person') : g.act ? l('Ver artista', 'See act') : l('Ir', 'Go'));
GO27.f = go18;
GO27.label = gotoLabel;

/** Caixa de entrada (o Cockpit a mostra na aba "Caixa de entrada"). */
export function inbox18View(s: GameState): HTMLElement { return mailView27(s); }

/** Chamado por ui/sys/core18.ts (último import): substitui a área antiga de mesmo id. */
export function installInbox18(): void {
  registerArea({ id: 'inbox', label: l('Caixa de entrada', 'Inbox'), icon: 'newspaper', key: 'e', render: (s) => inbox18View(s), badge: (s) => unreadCount(s) || undefined });
}
