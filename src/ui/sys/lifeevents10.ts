// Eventos de vida pessoal (rodada 10) na interface: pop-up com respostas (custos à vista, efeitos reais
// descobertos ao escolher) e a seção "Vida pessoal" em Você → Decisões com eventos em aberto e o diário.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { answerLifeEvent, choiceBlocker, costOf, defOf, leState, names, openEvents } from '../../sim/sys/lifeevents10';
import { energyLeft, maxEnergy } from '../../sim/sys/life';
import type { GameState } from '../../sim/types';
import { fmtL, money } from '../../sim/util';
import { $, rerender, section, toast } from '../common';
import { h } from '../dom';
import { openCutscene, registerCutscene } from '../registry';

const dots = (s: GameState): HTMLElement => h('div', { class: 'lf-energy' },
  h('span', null, t(l('Tempo livre este mês', 'Free time this month'))),
  h('span', { class: 'lf-dots' }, Array.from({ length: maxEnergy(s) }, (_, i) => h('i', { class: i < energyLeft(s) ? 'on' : '' }))));

registerCutscene('lifeEvent', (s, cs, close) => {
  const box = h('div', { class: 'le10' });
  const draw = (): void => {
    const st = leState(s);
    const op = st.open.find((x) => x.id === cs.data.openId);
    const d = op && defOf(op.ev);
    if (!op || !d) { box.replaceChildren(h('p', { class: 'muted' }, t(l('Este momento já passou.', 'This moment has passed.'))), h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue')))); return; }
    if (op.done) {
      box.replaceChildren(h('p', null, t(d.text(s, op.ctx))), h('p', { class: 'le10-res' }, h('b', null, t(l('Você decidiu: ', 'You decided: '))), t(op.done.text)), h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue'))));
      return;
    }
    const nm = names(s, op.ctx);
    box.replaceChildren(
      h('p', { class: 'le10-text' }, t(d.text(s, op.ctx))),
      dots(s),
      h('div', { class: 'col' }, d.ch.map((ch) => {
        const blk = choiceBlocker(s, ch, op.ctx);
        const k = costOf(ch);
        const bits = [k.w ? `${$(money(s, k.w))} ${t(l('do bolso', 'personal'))}` : '', k.cash ? `${$(money(s, k.cash))} ${t(l('do caixa', 'from the label'))}` : '', k.energy ? '⏱'.repeat(k.energy) : ''].filter(Boolean).join(' · ');
        return h('div', { class: 'opt' },
          h('button', { class: 'btn', disabled: !!blk, title: blk ? t(blk) : '', onclick: () => {
            const e = answerLifeEvent(s, op.id, ch.id);
            if (e) toast(t(e), 'bad');
            draw();
            rerender();
          } }, t(fmtL(ch.label, nm))),
          bits ? h('small', { class: 'muted' }, ` ${bits}`) : null,
          ch.note ? h('small', { class: 'muted' }, ` ${t(ch.note)}`) : null,
          blk ? h('small', { class: 'bad' }, ` ${t(blk)}`) : null);
      })),
      h('p', { class: 'muted small' }, t(l('Se você deixar passar, vale a resposta mais cautelosa.', 'If you let it pass, the most cautious answer applies.'))),
      h('button', { class: 'btn ghost small', onclick: close }, t(l('Decidir depois', 'Decide later'))),
    );
  };
  draw();
  return box;
});

/** Seção da aba Decisões (substitui os antigos dilemas pessoais). */
export function lifeEventsSection(s: GameState): HTMLElement {
  const st = leState(s);
  const open = openEvents(s);
  return section(t(l('Vida pessoal', 'Personal life')),
    h('p', { class: 'muted small' }, t(l('Todo mês a vida pode trazer um acontecimento (família, saúde, dinheiro, fé, política, a cena). Ele chega como pop-up; quem ignora, fica com a resposta mais cautelosa.', 'Every month life may bring something (family, health, money, faith, politics, the scene). It arrives as a pop-up; ignore it and the most cautious answer applies.'))),
    open.length ? h('div', { class: 'card-grid' }, open.map((op) => {
      const d = defOf(op.ev)!;
      return h('div', { class: 'pick' }, h('b', null, t(d.name)), h('small', null, t(d.text(s, op.ctx))),
        h('button', { class: 'btn small primary', onclick: () => { openCutscene(s, { id: op.id, kind: 'lifeEvent', week: s.week, data: { title: d.name, openId: op.id } }, rerender); } }, t(l('Responder', 'Answer'))));
    })) : h('p', { class: 'muted small' }, t(l('Nada pendente.', 'Nothing pending.'))),
    st.pend.length ? h('p', { class: 'small' }, t(l('Desdobramentos a caminho: {n}', 'Consequences on the way: {n}'), { n: st.pend.length })) : null,
    st.log.length ? h('ul', { class: 'small' }, st.log.slice(0, 8).map((x) => h('li', null, h('b', null, `${Math.floor(x.m / 12)}: `), t(defOf(x.ev)?.name as L), ' — ', t(x.text)))) : null,
  );
}
