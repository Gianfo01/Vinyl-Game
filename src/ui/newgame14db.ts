// Rodada 14 — Novo Jogo, aba Mundo: "Tamanho da base de dados" (artistas reais + gerados). Registrado em
// newgameCards() (mesmo gancho do cartão de mundo da rodada 9), sem tocar em newgame.ts.

import { REAL_EU } from '../data/realacts_eu';
import { REAL_MORE } from '../data/realacts_more14';
import { REAL_17 } from '../data/more17';
import { REAL_US } from '../data/realacts_us';
import { REAL_WORLD } from '../data/realacts_world';
import { l } from '../data/world';
import { t } from '../i18n/strings';
import { REAL_ALL } from '../sim/sys/realworld';
import { DB_SIZES, dbSizeInfo, realAllowed, realCountry31 } from '../sim/dbsize14';
import { countryName } from '../data/geo';
import type { RunConfig } from '../sim/types';
import { h } from './dom';
import { cards22 } from './pick22';
import { helpTip } from './newgame13';
import { newgameCards } from './newgame';

const BASE = [...REAL_US, ...REAL_EU, ...REAL_WORLD];
/** Quantos artistas reais existem neste tamanho (sem contar os 100 do catálogo clássico). */
export const realCount = (size: RunConfig['dbSize']): number => [...BASE, ...REAL_MORE, ...REAL_17].filter((a) => realAllowed({ dbSize: size }, a)).length;
const GEN0 = 95;
/** r25: personagens no começo da partida, pelo ano de início: artistas reais já estreados (+ integrantes) e gerados (≈2 pessoas por ato). */
export function cast25(size: RunConfig['dbSize'], year: number, off?: string[]): { acts: number; real: number; people: number } {
  const ra = REAL_ALL.filter((a) => a.d <= year && realAllowed({ dbSize: size, realOff31: off }, a));
  const realP = ra.reduce((n, a) => n + Math.max(1, a.m?.length ?? 0), 0);
  const gen = Math.round(GEN0 * dbSizeInfo({ dbSize: size }).gen);
  return { acts: ra.length + gen, real: ra.length, people: realP + gen * 2 };
}
const fmt25 = (n: number): string => n.toLocaleString('pt-BR');

export function dbCard(cfg: RunConfig): HTMLElement {
  const note = h('small', { class: 'muted' });
  const refresh = () => {
    const d = dbSizeInfo(cfg);
    const c = cast25(d.id, cfg.startYear, cfg.realOff31);
    note.textContent = t(l('Em {y}: ≈ {pp} personagens em ≈ {a} artistas ({r} reais + ≈ {g} gerados); surgem novos todo ano. {p}', 'In {y}: ≈ {pp} characters in ≈ {a} artists ({r} real + ≈ {g} generated); more appear every year. {p}'), {
      y: cfg.startYear, pp: fmt25(c.people), a: fmt25(c.acts), r: fmt25(c.real), g: Math.round(GEN0 * d.gen),
      p: d.lvl >= 3 ? t(l('Pesado: criar o jogo e avançar os meses demoram mais; recomendado para computadores bons.', 'Heavy: creating the game and advancing months take longer; best on a good computer.')) : d.lvl === 2 ? t(l('Um pouco mais lento em celulares antigos.', 'Slightly slower on old phones.')) : d.lvl === 0 ? t(l('Mais leve e rápido; menos nomes regionais.', 'Lighter and faster; fewer regional names.')) : t(l('Equilíbrio entre variedade e velocidade.', 'Balance between variety and speed.')),
    });
  };
  // r22: tamanhos em cartões
  const cards = () => cards22(t(l('Tamanho da base de dados', 'Database size')), DB_SIZES.map((d) => ({ value: d.id, name: t(l(d.pt, d.en)).split(' (')[0].split(' —')[0], desc: ((c) => `≈ ${fmt25(c.people)} ${t(l('personagens', 'characters'))} · ${fmt25(c.acts)} ${t(l('artistas', 'artists'))}`)(cast25(d.id, cfg.startYear, cfg.realOff31)) })), () => dbSizeInfo(cfg).id, (v) => { cfg.dbSize = v; refresh(); }, 'ng22-4');
  const sel = h('div', null, cards());
  refresh();
  return h('section', { class: 'card' },
    h('h3', null, t(l('Base de dados', 'Database')), ' ', helpTip(l('Define quantos artistas reais (estrelas, grandes nomes e cenas regionais de todos os países) e quantos artistas gerados existem no mundo. Pequena: só os principais, mais rápido. Média: padrão. Grande/Enorme: muito mais nomes e concorrência, mas o jogo fica mais pesado. Só fatos já verdadeiros no ano de cada estreia.', 'Sets how many real artists (stars, big names and regional scenes worldwide) and how many generated artists exist. Small: main names only, faster. Medium: default. Large/Huge: many more names and competition, but heavier. Only facts already true in each debut year.'))),
    sel,
    note,
    countriesBox31(cfg, () => { sel.replaceChildren(cards()); refresh(); }));
}

/** R31 onda 5: artistas reais por país — cada país da base liga ou desliga (desligado = os artistas reais de lá não
 *  entram na partida; os gerados continuam). Ordem: quem tem mais artistas na base primeiro. */
export function realCountries31(): { a3: string; n: number }[] {
  const n = new Map<string, number>();
  for (const a of REAL_ALL) { const k = realCountry31(a); if (k) n.set(k, (n.get(k) ?? 0) + 1); }
  return [...n.entries()].map(([a3, k]) => ({ a3, n: k })).sort((x, y) => y.n - x.n || x.a3.localeCompare(y.a3));
}
function countriesBox31(cfg: RunConfig, changed: () => void): HTMLElement {
  const list = h('div', { class: 'db31-countries', role: 'group', 'aria-label': t(l('Artistas reais por país', 'Real artists by country')) });
  const head = h('small', { class: 'muted' });
  const all = realCountries31();
  const draw = () => {
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
