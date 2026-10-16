// R31 · onda 4 (N) — CRÉDITOS e dedicatória ("Para Efro, Lucia, Antonella e Sonia"). Painel do jogo (sem janela do
// navegador), aberto da tela inicial e do fim de jogo. A homenagem à família Fossati é ficção declarada.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { DEDICATION31 } from '../../sim/sys/extras31';
import { modal } from '../common';
import { h } from '../dom';

/** Linha da dedicatória (abertura e créditos). */
export const dedication31 = (cls = 'h27-dedic small'): HTMLElement => h('p', { class: cls, 'data-dedication31': '' }, t(DEDICATION31));

export function creditsBody31(): HTMLElement {
  return h('div', { class: 'form credits31' },
    h('p', { style: 'font-size:1.15em' }, h('b', null, t(DEDICATION31))),
    h('p', { class: 'small' }, t(l('Efro, Lucia, Sonia e Antonella Fossati existem no mundo do jogo como pessoas, em todas as partidas, sem envelhecer, nos papéis de cada época — uma homenagem discreta, ficção declarada. Gianluca Fossati, da árvore da família, fundou a Arara.',
      'Efro, Lucia, Sonia and Antonella Fossati exist in the game world as people, in every run, never ageing, in the roles of each era — a quiet tribute, declared fiction. Gianluca Fossati, from the family tree, founded Arara.'))),
    h('p', { class: 'small' }, t(l('Na sua cidade há uma praça com o nome de Efro e Lucia Fossati; a placa fica ao lado da sua sede.', 'In your city there is a square named after Efro and Lucia Fossati; the plaque stands next to your HQ.'))),
    h('h4', null, t(l('Nomes e obras reais', 'Real names and works'))),
    h('p', { class: 'small muted' }, t(l('Artistas, músicas, marcas, festivais, prêmios, veículos, bandas de filmes e séries e referências da cultura pop aparecem com o nome real só como referência histórica e afetiva. Em Opções › "Nomes e obras reais" tudo vira homenagem parecida (a família Fossati continua com o nome real). Trocar nomes não é garantia jurídica.',
      'Artists, songs, brands, festivals, awards, outlets, film and series bands and pop-culture references appear under their real names only as historical and affectionate reference. In Options › "Real names and works" everything becomes a similar tribute (the Fossati family keeps its real name). Renaming is no legal guarantee.'))),
    h('p', { class: 'small muted' }, t(l('Feito com carinho, em pixel art, de 1889 a 2040.', 'Made with love, in pixel art, from 1889 to 2040.'))));
}

export function openCredits31(): void { modal(t(l('Créditos', 'Credits')), creditsBody31()); }
