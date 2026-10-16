// R31 · W0-CON — primeiras fontes da pendência única, ligadas SÓ como provedores (leitura) ao que já existe:
//  - decisões abertas do contador de histórias (`s.decisions`, events.ts) — dono: a mesa ('desk');
//  - mensagens da caixa de entrada que esperam resposta (`P(s).inbox` com botões, não resolvidas, no prazo) — dono: 'inbox';
//  - contrapropostas de artistas às suas ofertas (`s.offers` com status 'counter') — dono: mercado ('market').
// Nenhuma delas grava estado; a pendência some quando o sistema dono resolve.

import { l } from '../../data/world';
import { P } from '../sys/people/state';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { registerDestArea, type Dest } from './dest';
import { registerPendingSource, type Pending } from './pending';

registerDestArea('inbox');

const actDest = (actId: string | undefined): Dest[] => (actId ? [{ area: 'artists', actId }] : []);

registerPendingSource('decisions', (s: GameState): Pending[] =>
  s.decisions.map((d) => {
    const actId = d.ctx.act !== undefined ? String(d.ctx.act) : undefined;
    const personId = d.ctx.person !== undefined ? String(d.ctx.person) : undefined;
    return {
      id: `dec:${d.id}`, kind: 'decision', title: d.title, owner: { area: 'desk', intent: 'decide' },
      ...(actId ? { actId } : {}), ...(personId ? { personId } : {}),
      shortcuts: actDest(actId), prio: 2,
    };
  }));

registerPendingSource('inbox', (s: GameState): Pending[] =>
  P(s).inbox
    .filter((m) => m.actions?.length && !m.resolved && (m.expires === undefined || m.expires >= s.week))
    .map((m) => {
      const actId = m.ref?.act !== undefined ? String(m.ref.act) : undefined;
      return {
        // mesmo id que a fila única dá à carta (`msg:<id>`, people/state.addMsg): a carta conta UMA vez no menu/Hoje
        id: `msg:${m.id}`, kind: `inbox:${m.ref?.k18 ?? m.kind}`, title: m.subject, owner: { area: 'inbox', intent: 'answer' },
        ...(m.expires !== undefined ? { due: m.expires } : {}), ...(actId ? { actId } : {}),
        shortcuts: actDest(actId), prio: m.expires !== undefined && m.expires - s.week <= 2 ? 3 : 1,
      };
    }));

registerPendingSource('offers', (s: GameState): Pending[] =>
  s.offers
    .filter((o) => o.status === 'counter' && !!s.acts[o.actId])
    .map((o) => ({
      id: `offer:${o.id}`, kind: 'offer_counter',
      title: fmtL(l('{a} respondeu com uma contraproposta', '{a} came back with a counter-offer'), { a: s.acts[o.actId].name }),
      owner: { area: 'market', intent: 'counter' }, actId: o.actId,
      ...(o.thinkUntil !== undefined ? { due: o.thinkUntil } : {}),
      shortcuts: [{ area: 'desk' }, ...actDest(o.actId)], prio: 2,
    })));
