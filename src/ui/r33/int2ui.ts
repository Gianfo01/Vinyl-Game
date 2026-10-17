// R33 · INT-2 (ligado no QA33) — entrar nos prédios novos pelos cartões de ação da cidade (EXP-13, sem tela nova):
// "Terreno do festival" entra na cena do festival da INT-2 e "Banco" entra no banco do mapa (lote da MAPA33). Só
// aparecem com `exp33.int2` ligado (e o banco, com o prédio no mapa); desligado, os cartões ficam como eram.

import { l } from '../../data/world';
import { FEST_PL33 } from '../../sim/r33/ligar33';
import { int2On } from '../../sim/r33/int2';
import { lotFor33, mapaOn33 } from '../../sim/r33/mapa33';
import type { GameState } from '../../sim/types';
import { CARDS5 } from '../r31/acoes5data';
import { ACTS_CAT5 } from '../r31/acoes5cat';
import type { ActDef5 } from '../r31/acoes5model';
import { openInside18 } from '../sys/campus18';

const bankId = (s: GameState): string | null => { const n = mapaOn33(s) ? lotFor33(s, 'bank') : undefined; return n === undefined ? null : `pl:${n}`; };
const ADD: Record<string, ActDef5> = {
  'i2.festival': { label: l('Entrar no terreno do festival', 'Enter the festival grounds'), kind: 'ui', src: ['ui/sys/campus18', 'openInside18'], fn: openInside18,
    when: (s) => int2On(s), run: (_s, c) => { c.close(); openInside18(FEST_PL33); } },
  'i2.banco': { label: l('Entrar no banco', 'Enter the bank'), kind: 'ui', src: ['ui/sys/campus18', 'openInside18'], fn: openInside18,
    when: (s) => int2On(s) && !!bankId(s), run: (s, c) => { const id = bankId(s); c.close(); if (id) openInside18(id); } },
};
Object.assign(ACTS_CAT5, ADD);
for (const [card, a] of [['festival', 'i2.festival'], ['banco', 'i2.banco']] as const) { const c = CARDS5[card]; if (c && !c.acts.includes(a)) c.acts.unshift(a); }
