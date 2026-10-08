// Mesa de negociação (mini-jogo em tela cheia): rodadas de proposta, barra de paciência, cartas de
// argumento e blefe. No modo automático (ou pelo botão "Resolver automático") fecha sozinha.

import { toReal } from '../../../core/money';
import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { P } from '../../../sim/sys/people/state';
import { CARD_INFO, autoNegotiate, cardAvailable, closeNegotiation, negBlocked, playCard, propose, startNegotiation, type CardId } from '../../../sim/sys/people/negotiation';
import type { GameState } from '../../../sim/types';
import { rngOf } from '../../../sim/util';
import { $, rerender, toast } from '../../common';
import { h } from '../../dom';
import { openScene } from '../../registry';
import { store } from '../../store';
import { meter } from '../../vis';

export function negotiateButton(s: GameState, actId: string, mode: 'sign' | 'renew', label?: string): HTMLElement {
  const blocked = negBlocked(s, actId, mode);
  return h('button', { class: 'btn small', disabled: !!blocked, title: blocked ? t(blocked) : undefined, onclick: () => openNegotiation(s, actId, mode) },
    '🤝 ', label ?? (mode === 'sign' ? t(l('Mesa de negociação', 'Negotiating table')) : t(l('Renovar na mesa', 'Renew at the table'))));
}

export function openNegotiation(s: GameState, actId: string, mode: 'sign' | 'renew'): void {
  if (store.prefs.minigames === 'auto') {
    const res = autoNegotiate(s, actId, mode);
    toast(t(res), s.acts[actId]?.owner === 'player' ? 'good' : 'info');
    rerender();
    return;
  }
  const n = startNegotiation(s, actId, mode);
  if ('pt' in n) {
    toast(t(n), 'bad');
    return;
  }
  const act = s.acts[actId];
  openScene(l(`Mesa de negociação — ${act.name}`, `Negotiating table — ${act.name}`), (close) => {
    const root = h('div', { class: 'ppl-neg' });
    let adv = n.offer.advance;
    let roy = n.offer.royalty;
    const finish = () => {
      const res = closeNegotiation(s);
      toast(t(res), s.acts[actId]?.owner === 'player' ? 'good' : 'info');
      close();
      rerender();
    };
    const draw = () => {
      const cur = P(s).neg;
      root.replaceChildren();
      if (!cur) return;
      const money = (c: number) => `$${Math.round(toReal(c, s.year)).toLocaleString()}`;
      const maxAdv = Math.max(cur.ask.advance * 1.3, adv * 1.2, 1000);
      const advIn = h('input', { type: 'range', min: 0, max: Math.round(maxAdv), step: Math.max(100, Math.round(maxAdv / 200)), value: adv, 'aria-label': t(l('Adiantamento', 'Advance')), oninput: (e: Event) => { adv = Number((e.target as HTMLInputElement).value); advOut.textContent = $(adv); } });
      const advOut = h('b', null, $(adv));
      const royIn = h('input', { type: 'range', min: 5, max: 40, step: 0.5, value: roy * 100, 'aria-label': t(l('Royalties', 'Royalties')), oninput: (e: Event) => { roy = Number((e.target as HTMLInputElement).value) / 100; royOut.textContent = `${(roy * 100).toFixed(1)}%`; } });
      const royOut = h('b', null, `${(roy * 100).toFixed(1)}%`);
      root.append(
        h('div', { class: 'ppl-table' },
          h('div', null,
            meter('heart', l('Paciência', 'Patience'), Math.max(0, cur.patience)),
            h('p', { class: 'small' }, t(l('Rodada {r} de {m}', 'Round {r} of {m}'), { r: cur.round, m: cur.maxRounds })),
            h('p', null, t(l('Eles pedem: ', 'They ask: ')), h('b', null, money(cur.ask.advance)), ' · ', h('b', null, `${(cur.ask.royalty * 100).toFixed(1)}%`), ` · ${cur.ask.months} ${t(l('meses', 'months'))}`),
            h('ol', { class: 'ppl-log', 'aria-live': 'polite' }, cur.log.slice(-8).map((x) => h('li', null, t(x)))),
          ),
          h('div', null,
            cur.done ? h('div', null,
              h('p', { class: cur.done === 'deal' ? 'good' : 'bad' }, cur.done === 'deal'
                ? t(l('Acordo: {a} e {r}%.', 'Deal: {a} and {r}%.'), { a: money(cur.offer.advance), r: (cur.offer.royalty * 100).toFixed(1) })
                : t(l('Sem acordo.', 'No deal.'))),
              h('button', { class: 'btn primary', onclick: finish }, t(l('Concluir', 'Finish'))),
            ) : h('div', null,
              h('label', null, t(cur.mode === 'sign' ? l('Adiantamento', 'Advance') : l('Bônus de renovação', 'Renewal bonus')), advIn, advOut),
              h('label', null, t(l('Royalties', 'Royalties')), royIn, royOut),
              h('div', { class: 'row' },
                h('button', { class: 'btn primary', onclick: () => { propose(s, { advance: adv, royalty: roy, months: cur.ask.months }); draw(); } }, t(l('Propor', 'Propose'))),
                h('button', { class: 'btn ghost', onclick: () => { adv = cur.ask.advance; roy = cur.ask.royalty; draw(); } }, t(l('Copiar o pedido', 'Copy their ask'))),
                h('button', { class: 'btn ghost', onclick: () => { P(s).neg = null; const res = autoNegotiate(s, actId, mode); toast(t(res)); close(); rerender(); } }, t(l('Resolver automático', 'Auto-resolve'))),
              ),
              h('h4', null, t(l('Cartas de argumento', 'Argument cards'))),
              h('div', { class: 'ppl-cards' }, (Object.keys(CARD_INFO) as CardId[]).map((c) => h('button', { disabled: !cardAvailable(s, cur, c), onclick: () => { playCard(s, rngOf(s), c); draw(); } }, h('b', null, t(CARD_INFO[c].name)), h('small', null, t(CARD_INFO[c].desc))))),
            ),
          ),
        ),
      );
    };
    draw();
    return root;
  }, { onClose: () => {
    // sair da mesa no meio conta como desistência (sem reiniciar de graça)
    const cur = P(s).neg;
    if (cur) {
      if (!cur.done) cur.done = 'walk';
      toast(t(closeNegotiation(s)));
    }
    rerender();
  } });
}
