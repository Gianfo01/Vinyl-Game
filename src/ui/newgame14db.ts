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
import { cast31, countries31 } from '../sim/dbcast31';
import { countryName } from '../data/geo';
import type { RunConfig } from '../sim/types';
import { h } from './dom';
import { cards22 } from './pick22';
import { helpTip } from './newgame13';
import { newgameCards } from './newgame';

const BASE = [...REAL_US, ...REAL_EU, ...REAL_WORLD];
/** Quantos artistas reais existem neste tamanho (sem contar os 100 do catálogo clássico). */
export const realCount = (size: RunConfig['dbSize']): number => [...BASE, ...REAL_MORE, ...REAL_17].filter((a) => realAllowed({ dbSize: size }, a)).length;
/** r25: personagens no começo da partida, pelo ano de início — R31 (DBTAM): conta do motor (sim/dbcast31: mesmas regras
 *  de quem entra, catálogo clássico e gerados), para o número mostrado bater com o mundo gerado. */
export function cast25(size: RunConfig['dbSize'], year: number, off?: string[], cfg?: Partial<RunConfig>): { acts: number; real: number; people: number; gen: number } {
  return cast31({ realNames: true, mode: 'free', ...cfg, dbSize: size, realOff31: off }, year);
}
const fmt25 = (n: number): string => n.toLocaleString('pt-BR');

export function dbCard(cfg: RunConfig): HTMLElement {
  const note = h('small', { class: 'muted' });
  const refresh = () => {
    const d = dbSizeInfo(cfg);
    const c = cast25(d.id, cfg.startYear, cfg.realOff31, cfg);
    note.textContent = t(l('Em {y}: ≈ {pp} personagens em ≈ {a} artistas ({r} reais + ≈ {g} gerados); surgem novos todo ano. {p}', 'In {y}: ≈ {pp} characters in ≈ {a} artists ({r} real + ≈ {g} generated); more appear every year. {p}'), {
      y: cfg.startYear, pp: fmt25(c.people), a: fmt25(c.acts), r: fmt25(c.real), g: fmt25(c.gen),
      p: d.lvl >= 3 ? t(l('Pesado: criar o jogo e avançar os meses demoram mais; recomendado para computadores bons.', 'Heavy: creating the game and advancing months take longer; best on a good computer.')) : d.lvl === 2 ? t(l('Um pouco mais lento em celulares antigos.', 'Slightly slower on old phones.')) : d.lvl === 0 ? t(l('Mais leve e rápido; menos nomes regionais.', 'Lighter and faster; fewer regional names.')) : t(l('Equilíbrio entre variedade e velocidade.', 'Balance between variety and speed.')),
    });
  };
  // r22: tamanhos em cartões
  const cards = () => cards22(t(l('Tamanho da base de dados', 'Database size')), DB_SIZES.map((d) => ({ value: d.id, name: t(l(d.pt, d.en)).split(' (')[0].split(' —')[0], desc: ((c) => `≈ ${fmt25(c.people)} ${t(l('personagens', 'characters'))} · ${fmt25(c.acts)} ${t(l('artistas', 'artists'))}`)(cast25(d.id, cfg.startYear, cfg.realOff31, cfg)) })), () => dbSizeInfo(cfg).id, (v) => { cfg.dbSize = v; refresh(); redrawC(); }, 'ng22-4');
  const sel = h('div', null, cards());
  let redrawC = () => {};
  refresh();
  return h('section', { class: 'card' },
    h('h3', null, t(l('Base de dados', 'Database')), ' ', helpTip(l('Define quantos artistas reais (estrelas, grandes nomes e cenas regionais de todos os países) e quantos artistas gerados existem no mundo. Pequena: só os principais, mais rápido. Média: padrão. Grande/Enorme: muito mais nomes e concorrência, mas o jogo fica mais pesado. Só fatos já verdadeiros no ano de cada estreia.', 'Sets how many real artists (stars, big names and regional scenes worldwide) and how many generated artists exist. Small: main names only, faster. Medium: default. Large/Huge: many more names and competition, but heavier. Only facts already true in each debut year.'))),
    sel,
    note,
    countriesBox31(cfg, () => { sel.replaceChildren(cards()); refresh(); }, (f) => { redrawC = f; }));
}

/** R31 onda 5: artistas reais por país — cada país da base liga ou desliga (desligado = os artistas reais de lá não
 *  entram na partida; os gerados continuam). Ordem: quem tem mais artistas na base primeiro. R31 (DBTAM): a contagem é a
 *  do tamanho de base escolhido (sim/dbcast31.countries31), não a da base inteira. */
export function realCountries31(cfg: Partial<RunConfig> = {}): { a3: string; n: number }[] {
  return countries31({ realNames: true, ...cfg });
}
function countriesBox31(cfg: RunConfig, changed: () => void, hook: (redraw: () => void) => void): HTMLElement {
  const list = h('div', { class: 'db31-countries', role: 'group', 'aria-label': t(l('Artistas reais por país', 'Real artists by country')) });
  const head = h('small', { class: 'muted' });
  // o país que some neste tamanho continua na lista se estiver desligado (para poder religar)
  let all = realCountries31(cfg);
  const draw = () => {
    const now = realCountries31(cfg);
    all = [...now, ...(cfg.realOff31 ?? []).filter((a3) => !now.some((x) => x.a3 === a3)).map((a3) => ({ a3, n: 0 }))];
    const off = new Set(cfg.realOff31 ?? []);
    head.textContent = off.size ? t(l('{n} país(es) desligado(s): os artistas reais de lá ficam fora; os gerados continuam.', '{n} countr(y/ies) off: their real artists stay out; generated ones remain.'), { n: off.size }) : t(l('Todos os países ligados.', 'All countries on.'));
    list.replaceChildren(...all.map(({ a3, n }) => h('label', { class: `check db31-c ${off.has(a3) ? 'off' : ''}` },
      h('input', { type: 'checkbox', checked: !off.has(a3), 'data-a3': a3, onchange: (e: Event) => {
        const on = (e.target as HTMLInputElement).checked;
        const cur = new Set(cfg.realOff31 ?? []);
        if (on) cur.delete(a3); else cur.add(a3);
        if (cur.size) cfg.realOff31 = [...cur].sort(); else delete cfg.realOff31;
        draw(); changed();
      } }), ' ', `${t(countryName(a3))} (${n})`)));
  };
  draw();
  hook(draw);
  const bulk = (on: boolean) => { if (on) delete cfg.realOff31; else cfg.realOff31 = all.map((x) => x.a3).sort(); draw(); changed(); };
  return h('details', { class: 'db31' },
    h('summary', null, t(l('Artistas reais por país (ligar/desligar)', 'Real artists by country (on/off)'))),
    head,
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => bulk(true) }, t(l('Ligar todos', 'All on'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => bulk(false) }, t(l('Desligar todos', 'All off')))),
    list);
}

newgameCards().push(dbCard);
