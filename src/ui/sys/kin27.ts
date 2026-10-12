// r27 AUD2 — escolhas sobre os filhos (apoiar a carreira, pagar estudos, trazer para a empresa, deserdar, fazer as
// pazes) e como cada filho(a) entra na sucessão. Motor em sim/sys/aud27/kin27.ts.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { fmtL as fmt, money } from '../../sim/util';
import {
  KIN_COST27, bringKidIn27, companyBlock27, cutBlock27, cutOffKid27, heirStance27, payKidSchool27, reconcileBlock27, reconcileKid27, schoolBlock27, supportBlock27, supportKidCareer27,
} from '../../sim/sys/aud27/kin27';
import { $ } from '../common';
import { h } from '../dom';

type Run = (res: unknown, ok?: L) => void;

function b(label: L, block: L | null, fn: () => void): HTMLElement {
  return h('button', { class: 'btn small', disabled: !!block, title: block ? t(block) : undefined, onclick: fn }, t(label));
}

/** Botões e a linha de sucessão de um filho(a). Nada para crianças pequenas. */
export function kidChoices27(s: GameState, i: number, age: number, run: Run): HTMLElement | null {
  if (age < 16) return null;
  const hs = heirStance27(s, i);
  const succ = age < 18 ? null : hs.skip ? fmt(l('Sucessão: fora ({w})', 'Succession: out ({w})'), { w: hs.why ?? '' })
    : fmt(l('Sucessão: entra{n}', 'Succession: in{n}'), { n: hs.note ? fmt(l(' · {x}', ' · {x}'), { x: hs.note }) : '' });
  return h('div', { class: 'col' },
    succ ? h('small', { class: hs.skip ? 'muted bad' : 'muted' }, t(succ)) : null,
    h('div', { class: 'row wrap' },
      b(fmt(l('Apoiar a carreira ({v})', 'Support the career ({v})'), { v: $(money(s, KIN_COST27.support)) }), supportBlock27(s, i), () => run(supportKidCareer27(s, i), l('Apoio dado.', 'Support given.'))),
      b(fmt(l('Pagar faculdade ({v})', 'Pay for college ({v})'), { v: $(money(s, KIN_COST27.college)) }), schoolBlock27(s, i), () => run(payKidSchool27(s, i, 'college'), l('Faculdade paga.', 'College paid.'))),
      b(fmt(l('Pagar conservatório ({v})', 'Pay for conservatory ({v})'), { v: $(money(s, KIN_COST27.conservatory)) }), schoolBlock27(s, i), () => run(payKidSchool27(s, i, 'conservatory'), l('Conservatório pago.', 'Conservatory paid.'))),
      b(l('Trazer para a empresa', 'Bring into the company'), companyBlock27(s, i), () => run(bringKidIn27(s, i), l('Agora trabalha no selo.', 'Now works at the label.'))),
      reconcileBlock27(s, i) ? b(l('Deserdar', 'Disinherit'), cutBlock27(s, i), () => { if (confirm(t(l('Deserdar? O vínculo despenca e ele(a) sai da sucessão.', 'Disinherit? The bond collapses and they leave the succession.')))) run(cutOffKid27(s, i), l('Deserdado(a).', 'Disinherited.')); })
        : b(l('Fazer as pazes', 'Make peace'), null, () => run(reconcileKid27(s, i), l('Vocês fizeram as pazes.', 'You made peace.'))),
    ));
}
