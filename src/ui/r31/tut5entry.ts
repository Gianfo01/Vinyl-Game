// R31 · onda 5 (TUT, EXP-12) — ENTRADAS do tutorial guiado (só com o interruptor `exp5.tut`):
//  - "Aprender a jogar" na tela inicial (home5) e o cartão "Primeiro selo" na lista de Cenários: escolhem a época do
//    mentor e começam a partida do cenário com SEMENTE FIXA (todo mundo vê o mesmo começo);
//  - a chave "Tutorial guiado" no começo rápido da nova run (newrun5), desligada por padrão: a partida é a que o jogador
//    montou, mais a banda roteirizada e o tutorial.
// O resto (banda na recepção, navegação nova ligada, progresso) acontece no gancho 'newgame' de sim/r31/tut5.ts.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { RunConfig } from '../../sim/types';
import { newRunConfig20 } from '../../sim/start17';
import { scenarioById, scenarioConfig } from '../../sim/sys/live';
import { TUT_ERAS5, TUT_SEED5, tut5Enabled, tutScenarioId5 } from '../../sim/r31/tut5';
import { modal, toast } from '../common';
import { h } from '../dom';
import { launchRun27 } from '../newgame';
import { mentor5, mentorCanvas5 } from './tut5px';

export { tut5Enabled };

/** Configuração da partida "Primeiro selo" da época `year` (semente fixa). */
export function tutRunConfig5(year: number, company?: string): RunConfig {
  const d = scenarioById[tutScenarioId5(year)];
  const base = newRunConfig20({ seed: TUT_SEED5, companyName: company || t(l('Selo Agulha', 'Needle Records')), kind: 'scenario' });
  return { ...scenarioConfig(d, base), scenario17: d.id, tut5: { from: 'scenario' } };
}

export function startTutRun5(year: number, onStart: () => void, company?: string): void {
  try { launchRun27(tutRunConfig5(year, company), onStart); }
  catch (e) { console.error(e); toast(t(l('Não foi possível começar o tutorial.', 'Could not start the tutorial.')), 'bad'); }
}

/** Escolha da época (cada uma com o seu mentor). */
export function tutEraPicker5(onStart: () => void, company?: string): void {
  let close = () => {};
  const row = (y: number) => {
    const m = mentor5(y);
    const cv = mentorCanvas5(y, 2); cv.className = 'px tu5-pickav'; cv.setAttribute('aria-hidden', 'true');
    const d = scenarioById[tutScenarioId5(y)];
    return h('button', { type: 'button', class: 'tu5-pick', 'data-tut5': String(y), onclick: () => { close(); startTutRun5(y, onStart, company); } },
      cv, h('span', null, h('b', null, String(y)), h('small', null, document.createTextNode(m.name), ` · ${t(m.role)}`), h('small', { class: 'muted' }, t(d.desc).split(':')[0])));
  };
  close = modal(t(l('Aprender a jogar', 'Learn to play')), h('div', { class: 'tu5-picker' },
    h('p', null, t(l('Um mentor da época mostra o jogo fazendo: 12 capítulos curtos (uns 15 minutos), cada um pode ser pulado. Escolha quando começar:',
      'An era mentor shows you the game by doing: 12 short chapters (about 15 minutes), each one skippable. Pick when to start:'))),
    h('div', { class: 'tu5-picks' }, ...TUT_ERAS5.map(row))));
}

/** Cartão "Primeiro selo" no topo da lista de Cenários (só com exp5.tut). */
export function tutScenarioCard5(onStart: () => void, company: () => string): HTMLElement | null {
  if (!tut5Enabled()) return null;
  return h('section', { class: 'card tu5-scen', 'data-tut5': 'scenario' },
    h('h3', null, t(l('Primeiro selo', 'First label')), h('small', { class: 'muted' }, ` · ${t(l('tutorial guiado', 'guided tutorial'))}`)),
    h('p', { class: 'small' }, t(l('Um selo pequeno, um mentor da época e uma banda batendo na porta. Semente fixa; termina com um diploma e a partida continua livre.',
      'A small label, an era mentor and a band knocking at the door. Fixed seed; it ends with a diploma and the run carries on freely.'))),
    h('button', { type: 'button', class: 'btn', onclick: () => tutEraPicker5(onStart, company()) }, t(l('Jogar o Primeiro selo', 'Play First label'))));
}
