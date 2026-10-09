// Rodada 13: aba "Ficha completa" na página de qualquer pessoa (inclusive você). Separada de persona13.ts para
// que dossiê, críticos e equipe possam importar a ficha sem criar ciclo com pages.ts.
import { l } from '../../data/world';
import { h } from '../dom';
import { PERSON_TABS } from '../pages';
import { ficha13 } from './persona13';

PERSON_TABS.push((s, p) => ({
  id: 'p13', label: l('Ficha completa', 'Full profile'), icon: 'bulb',
  render: () => { const box = h('div'); const draw = () => box.replaceChildren(ficha13(s, `p:${p.id}`, draw)); draw(); return box; },
}));
