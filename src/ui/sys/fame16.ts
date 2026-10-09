// Rodada 16 — fama regional (interface): bloco "Fama por região" (países com degrau, de onde vem, regiões,
// média mundial e efeitos locais) para embutir em qualquer aba de fama, e a camada do mapa
// "Fama do artista selecionado".  Exportes para outras telas: regionFameBlock(s, id), afameAll(s), afameAct(s).

import { COUNTRY_INFO, countryMarketSize } from '../../data/countries';
import { countryName } from '../../data/geo';
import { MARKETS, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { FTIERS, canSee, fameTier, mainActOf } from '../../sim/sys/fame15';
import { SRC16, fameIn, fameMap16, homeA3, myA3, personFameIn, reach16, worldFame16 } from '../../sim/sys/fame16';
import { setPaint } from './map13';
import type { Act, GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { pill, rerender, section } from '../common';
import { h } from '../dom';
import { store } from '../store';

const tierPill = (v: number) => { const i = fameTier(v); return pill(t(FTIERS[i].name), i >= 4 ? 'gold' : i >= 2 ? 'good' : ''); };
const bar = (v: number) => h('span', { style: 'display:inline-block;vertical-align:middle;width:90px;height:7px;border-radius:4px;background:var(--line);margin:0 6px;overflow:hidden' },
  h('i', { style: `display:block;height:100%;width:${Math.round(v)}%;background:${fameTier(v) >= 4 ? 'var(--gold)' : 'var(--accent)'}` }));

/** Ato de referência do mapa: o selecionado (store.selectedAct) ou o seu ato mais famoso. */
export function afameAct(s: GameState): Act | undefined {
  const sel = store.selectedAct ? s.acts[store.selectedAct] : undefined;
  if (sel) return sel;
  return playerActs(s).map((id) => s.acts[id]).filter(Boolean).sort((a, b) => b.fame - a.fame)[0];
}

/** Valores por país (todos os países do mapa) da fama do ato selecionado — vazio se a fama dele não é visível. */
export function afameAll(s: GameState): { v: Map<string, number>; min: number; max: number } {
  const v = new Map<string, number>();
  const a = afameAct(s);
  if (!a || !canSee(s, a.id, 'fame')) return { v, min: 0, max: 0 };
  for (const x of fameMap16(s, a, true)) v.set(x.a3, x.v);
  return { v, min: 0, max: 100 };
}

/** Bloco "Fama por região" de um ato ou pessoa (para a aba Fama, a página da pessoa, etc.). */
export function regionFameBlock(s: GameState, id: string): HTMLElement | null {
  const person = !s.acts[id] && !!s.persons[id];
  const a = s.acts[id] ?? (person ? mainActOf(s, id) : undefined);
  if (!a) return null;
  if (!canSee(s, id, 'fame')) return section(t(l('Fama por região', 'Fame by region')), h('p', { class: 'muted small' }, t(l('? — onde é conhecido só aparece quando a fama é pública ou com olheiros.', '? — where they are known only shows when fame is public or with scouts.'))));
  const rows = fameMap16(s, a);
  const home = homeA3(a);
  const me = myA3(s);
  const val = (a3: string, v: number) => (person ? personFameIn(s, id, a3) : v);
  const top = rows.slice(0, 10);
  if (me && !top.some((x) => x.a3 === me)) { const x = rows.find((y) => y.a3 === me); if (x) top.push(x); }
  const reg = MARKETS.map((m) => {
    const cs = COUNTRY_INFO.filter((c) => c.market === m.id);
    let w = 0, v = 0;
    for (const c of cs) { const k = countryMarketSize(c, s.year); w += k; v += k * val(c.a3, fameIn(s, a, c.a3)); }
    return { m, v: w ? v / w : 0 };
  }).filter((x) => x.v > 0).sort((x, y) => y.v - x.v);
  const wf = worldFame16(s, a);
  return section(t(l('Fama por região', 'Fame by region')),
    h('p', { class: 'small' },
      t(l('Alcance global {g} · média mundial ponderada pelo mercado {w} · alcance internacional {r}%', 'Global reach {g} · market-weighted world average {w} · international reach {r}%'), { g: Math.round(a.fame), w: Math.round(person && a.fame > 0 ? wf * (personFameIn(s, id, home ?? '') / Math.max(1, fameIn(s, a, home ?? ''))) : wf), r: Math.round(reach16(a) * 100) }),
      person ? h('span', { class: 'muted' }, ` · ${t(l('pela fama de {a}', 'through {a}\'s fame'), { a: a.name })}`) : null),
    h('ul', { class: 'small fame16-list', style: 'list-style:none;padding-left:0' }, top.map((x) => {
      const v = val(x.a3, x.v);
      const src = SRC16.filter((b) => x.m & b.bit).map((b) => t(b.name));
      return h('li', { style: 'margin:3px 0' },
        h('b', { style: 'display:inline-block;min-width:9em' }, t(countryName(x.a3)), x.a3 === home ? ' ★' : '', x.a3 === me ? ` (${t(l('você', 'you'))})` : ''),
        bar(v), h('b', null, String(Math.round(v))), ' ', tierPill(v), ' ',
        h('span', { class: 'muted' }, `${t(x.base.why)}${x.base.aff !== 1 ? ` · ${t(l('gosto pelo gênero', 'genre taste'))} ×${x.base.aff.toFixed(2)}` : ''}`),
        x.d ? h('span', { class: x.d > 0 ? 'good' : 'bad' }, ` · ${x.d > 0 ? '+' : ''}${x.d} ${t(l('local', 'local'))}${src.length ? ` (${src.join(', ')})` : ''}`) : null);
    })),
    reg.length ? h('p', { class: 'small' }, h('b', null, t(l('Regiões: ', 'Regions: '))), ...reg.map((x) => h('span', { style: 'margin-right:10px' }, `${t(x.m.name)} ${Math.round(x.v)} `, tierPill(x.v)))) : null,
    h('p', { class: 'small muted' }, t(l('A fama é local: cada país soma uma base (origem, idioma e mercado, alcance do degrau, gosto pelo gênero) e um desvio por atividade lá — paradas, prêmios nacionais, shows, divulgação, rede da cena e transbordo dos vizinhos. Sem atividade o desvio some devagar. Onde pesa: público e cachê de shows naquela cidade, paparazzi e tumultos onde o artista está, interesse de selos da cidade, reconhecimento em turnê e quanto você (no seu país) sabe de artistas de fora.', 'Fame is local: each country adds a base (origin, language and market, tier reach, genre taste) and a local shift from activity there — charts, national awards, shows, promotion, scene network and spillover from neighbours. Without activity the shift slowly fades. It weighs on: audience and fees for shows in that city, paparazzi and mobs where the artist is, interest from labels in that city, recognition on tour and how much you (in your country) know about foreign artists.'))),
    h('button', { class: 'btn small ghost', onclick: () => { store.selectedAct = a.id; setPaint('afame'); store.area = 'world'; rerender(); } }, t(l('Ver no mapa', 'See on the map'))),
  );
}

/** Linha do balão do país no mapa (camada "fama do artista selecionado"). */
export function afameTip(s: GameState, a3: string): HTMLElement | null {
  const a = afameAct(s);
  if (!a || !canSee(s, a.id, 'fame')) return null;
  const v = fameIn(s, a, a3);
  return h('div', { class: 'wmap-tip-row' }, `${a.name}: ${Math.round(v)} `, tierPill(v), homeA3(a) === a3 ? ` ★ ${t(l('origem', 'home'))}` : '');
}
