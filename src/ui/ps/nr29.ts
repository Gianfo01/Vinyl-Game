// Rodada 29 (REORG, NR01–NR06 + Parte IV) — Nova run completa no estilo do Atlas, SEM segundo gerador: só apresentação
// sobre o formulário de sempre (newgame.ts). O rascunho, a revisão e o "Começar run" são os mesmos (launchRun27), então
// a rápida e a completa continuam gerando a mesma RunConfig. Arte: ícones pixel existentes, ampliados.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { PRESETS17 } from '../../sim/start17';
import type { RunConfig } from '../../sim/types';
import { SAVE_VERSION } from '../../sim/worldgen';
import { endOf28 } from '../../sim/start28data';
import { h } from '../dom';
import { ic } from '../vis';
import './nr29.css';

/** Cabeçalho-herói de cada etapa (título do Atlas; o texto de propósito de sempre vira o subtítulo). */
export const NR_STEP29: Record<string, { title: L; icon: string; quote: L }> = {
  world: { title: l('Configure o mundo', 'Set up the world'), icon: 'globe', quote: l('Diferentes mundos, infinitas histórias.', 'Different worlds, endless stories.') },
  you: { title: l('Quem é você na música', 'Who you are in music'), icon: 'fame', quote: l('Toda carreira começa com uma pessoa.', 'Every career starts with a person.') },
  mode: { title: l('Como você quer jogar', 'How you want to play'), icon: 'compass', quote: l('Carreira, ponto de partida e empresa.', 'Career, starting point and company.') },
  labels: { title: l('Gravadoras e rivais', 'Labels and rivals'), icon: 'platinum-disc', quote: l('Com quem você vai disputar o mercado.', 'Who you will compete with.') },
  rules: { title: l('Regras e ritmo', 'Rules and pace'), icon: 'hourglass', quote: l('Desafio, duração e o que é preferência.', 'Challenge, length and what is just a preference.') },
  review: { title: l('Revise antes de começar', 'Review before you start'), icon: 'scroll', quote: l('Revisão e geração usam o mesmo rascunho.', 'Review and generation use the same draft.') },
};

export function nrHero29(id: string, sub: string, n: number, total: number): HTMLElement {
  const d = NR_STEP29[id];
  if (!d) return h('p', { class: 'muted small ng17-step' }, sub);
  return h('header', { class: 'nr29-hero' },
    h('div', { class: 'nr29-tx' },
      h('p', { class: 'nr29-kick' }, `${t(l('Nova run completa', 'Complete new run'))} · ${n}/${total}`),
      h('h2', { class: 'nr29-title' }, t(d.title)),
      h('p', { class: 'nr29-sub ng17-step' }, sub)),
    h('div', { class: 'nr29-art', 'aria-hidden': 'true' }, h('span', { class: 'nr29-q' }, t(d.quote)), h('span', { class: 'nr29-ic' }, ic(d.icon, 5))));
}

/** "Confirmação da campanha" (NR-03): semente, versão do save, valores herdados do preset, avisos e fim/sandbox. */
export function nrConfirm29(cfg: RunConfig, warns: number): HTMLElement {
  const pr = cfg.preset17 ? PRESETS17.find((p) => p.id === cfg.preset17) : undefined;
  const end = endOf28(cfg.startYear, cfg.runYears17);
  const row = (icon: string, k: L, v: string, note?: L) => h('div', { class: 'nr29-cf' }, h('span', { class: 'nr29-cfi', 'aria-hidden': 'true' }, ic(icon, 2)),
    h('div', null, h('b', null, t(k)), h('span', null, v), note ? h('small', { class: 'muted' }, t(note)) : null));
  return h('section', { class: 'nr29-confirm', 'aria-label': t(l('Confirmação da campanha', 'Campaign confirmation')) },
    h('h4', null, t(l('Confirmação da campanha', 'Campaign confirmation'))),
    row('seedling', l('Semente', 'Seed'), cfg.seed || '—', l('Definida no rascunho validado.', 'Set in the validated draft.')),
    row('cassette', l('Versão do save', 'Save version'), `v${SAVE_VERSION}`),
    row('flag', l('Valores herdados', 'Inherited values'), pr ? t(pr.name) : t(l('personalizado', 'custom')), l('Predefinição usada como base; mudanças manuais valem por cima.', 'Preset used as a base; manual changes apply on top.')),
    row('calendar', l('Início e fim', 'Start and end'), end === null ? `${cfg.startYear} → ${t(l('sem fim (sandbox)', 'no end (sandbox)'))}` : `${cfg.startYear} → ${end}`),
    row('warning', l('Avisos pendentes', 'Pending warnings'), String(warns)),
    h('p', { class: 'small nr29-note' }, 'ⓘ ', t(l('Alterar uma escolha exige nova revisão. Depois de começar, a partida segue o estado gerado neste momento.', 'Changing a choice requires a new review. Once started, the run follows the state generated at this moment.'))));
}
