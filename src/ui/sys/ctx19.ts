// Rodada 19 (onda 5, C) — interface das regras de contexto: a linha "Contexto" nos cartões de decisão (por que a mesma
// opção rende diferente com este ator) e a chance de renovação do mandato no empresário, ambas com o porquê (why18).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { explain18 } from '../../sim/explain18';
import { ctxFx19, ctxNotable19 } from '../../sim/sys/ctxsys19';
import type { Decision, GameState } from '../../sim/types';
import { h } from '../dom';
import { why18 } from '../explain18';

const r2 = (x: number) => (Math.round(x * 100) / 100).toLocaleString();

/** Linha de contexto do cartão: só aparece quando o histórico com o ator muda o peso das escolhas. */
export function ctxLine19(s: GameState, d: Decision): HTMLElement | null {
  const act = d.ctx.act !== undefined ? String(d.ctx.act) : undefined, person = d.ctx.person !== undefined ? String(d.ctx.person) : undefined;
  if (!act && !person) return null;
  const x = ctxFx19(s, { act, person });
  if (!ctxNotable19(x)) return null;
  const top = x.parts[0]?.label;
  return h('small', { class: `dc18-ctx ${x.loss > x.gain ? 'bad' : 'good'}` },
    why18(s, 'ctx19.ctxfx', { act, person }, '⚖ ', t(l('Contexto com {n}: ganhos de confiança ×{g}, perdas ×{p}', 'Context with {n}: trust gains ×{g}, losses ×{p}'), { n: x.name, g: r2(x.gain), p: r2(x.loss) })),
    top ? h('span', { class: 'muted' }, ` — ${typeof top === 'string' ? top : t(top)}`) : null);
}

/** "renovação ~N%" com o porquê (empresário). */
export function renewTag19(s: GameState, actId: string): HTMLElement | null {
  const w = explain18(s, 'ctx19.renew', { act: actId });
  if (!w) return null;
  return why18(s, 'ctx19.renew', { act: actId }, t(l('renovação ~{p}%', 'renewal ~{p}%'), { p: Math.round(Number(w.value) * 100) }));
}
