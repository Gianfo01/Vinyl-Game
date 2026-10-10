// Rodada 14 — Novo Jogo, aba Mundo: "Tamanho da base de dados" (artistas reais + gerados). Registrado em
// newgameCards() (mesmo gancho do cartão de mundo da rodada 9), sem tocar em newgame.ts.

import { REAL_EU } from '../data/realacts_eu';
import { REAL_MORE } from '../data/realacts_more14';
import { REAL_17 } from '../data/more17';
import { REAL_US } from '../data/realacts_us';
import { REAL_WORLD } from '../data/realacts_world';
import { l } from '../data/world';
import { t } from '../i18n/strings';
import { DB_SIZES, dbSizeInfo, realAllowed } from '../sim/dbsize14';
import type { RunConfig } from '../sim/types';
import { h, select } from './dom';
import { helpTip } from './newgame13';
import { newgameCards } from './newgame';

const BASE = [...REAL_US, ...REAL_EU, ...REAL_WORLD];
/** Quantos artistas reais existem neste tamanho (sem contar os 100 do catálogo clássico). */
export const realCount = (size: RunConfig['dbSize']): number => [...BASE, ...REAL_MORE, ...REAL_17].filter((a) => realAllowed({ dbSize: size }, a)).length;
const GEN0 = 95;

export function dbCard(cfg: RunConfig): HTMLElement {
  const note = h('small', { class: 'muted' });
  const refresh = () => {
    const d = dbSizeInfo(cfg);
    note.textContent = t(l('≈ {r} artistas reais + ≈ {g} gerados no início (surgem novos todo ano). {p}', '≈ {r} real artists + ≈ {g} generated at the start (more appear every year). {p}'), {
      r: realCount(d.id), g: Math.round(GEN0 * d.gen),
      p: d.lvl >= 3 ? t(l('Pesado: criar o jogo e avançar os meses demoram mais; recomendado para computadores bons.', 'Heavy: creating the game and advancing months take longer; best on a good computer.')) : d.lvl === 2 ? t(l('Um pouco mais lento em celulares antigos.', 'Slightly slower on old phones.')) : d.lvl === 0 ? t(l('Mais leve e rápido; menos nomes regionais.', 'Lighter and faster; fewer regional names.')) : t(l('Equilíbrio entre variedade e velocidade.', 'Balance between variety and speed.')),
    });
  };
  const sel = select(dbSizeInfo(cfg).id, DB_SIZES.map((d) => ({ value: d.id, label: t(l(d.pt, d.en)) })), (v) => { cfg.dbSize = v; refresh(); });
  refresh();
  return h('section', { class: 'card' },
    h('h3', null, t(l('Base de dados', 'Database')), ' ', helpTip(l('Define quantos artistas reais (estrelas, grandes nomes e cenas regionais de todos os países) e quantos artistas gerados existem no mundo. Pequena: só os principais, mais rápido. Média: padrão. Grande/Enorme: muito mais nomes e concorrência, mas o jogo fica mais pesado. Só fatos já verdadeiros no ano de cada estreia.', 'Sets how many real artists (stars, big names and regional scenes worldwide) and how many generated artists exist. Small: main names only, faster. Medium: default. Large/Huge: many more names and competition, but heavier. Only facts already true in each debut year.'))),
    h('label', null, t(l('Tamanho da base de dados', 'Database size')), sel),
    note);
}

newgameCards().push(dbCard);
