// R29 (relíquias procedurais): pedaços de interface que as telas de sempre usam para as peças do relics29 —
// arquétipo, estado, procedência e a história montada na hora — e o navegador com filtros e páginas para listas com
// centenas de peças. Nada de tela nova: entram na ficha da relíquia (Lendas → Relíquias), no Acervo vivo, no
// mercado negro e no museu do selo.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { relicDef17 } from '../../sim/relics17';
import { nameOf } from '../../sim/sys/chron9';
import { ARCH29, ARCHDEF29, COND29, DENS29_NAME, PROV29, arc29, dens29, meta29, realArch29, story29, type Arch29, type Dens29, type Prov29 } from '../../sim/sys/relics29';
import type { Relic } from '../../sim/sys/relics9';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, pill, section } from '../common';
import { h, select } from '../dom';

/** Com quem está agora: o estado da peça manda (comprada, no museu, roubada, em leilão); senão, a procedência de origem. */
const holder = (rl: Relic, prov: Prov29): Prov29 => (rl.st === 'player' ? 'p' : rl.st === 'museum' ? 'm' : rl.st === 'stolen' ? 'b' : rl.st === 'auction' ? 'u' : prov === 'p' || prov === 'u' || prov === 'b' || prov === 'm' ? 'c' : prov);
/** Pílulas curtas (arquétipo, estado, procedência) — ou null se a peça não é procedural. */
export function relic29Pills(s: GameState, rl: Relic): HTMLElement | null {
  const m = meta29(s, rl.id);
  if (!m) return null;
  return h('span', { class: 'r29-pills' },
    pill(t(ARCHDEF29[m.arch].name)), ' ',
    pill(`${t(l('estado', 'condition'))}: ${t(COND29[m.cond] ?? COND29[1])}`, m.cond >= 3 ? 'bad' : m.cond === 0 ? 'good' : ''), ' ',
    pill(t(PROV29[holder(rl, m.prov)] ?? PROV29.a)));
}

/** Seção "Versão de um arquétipo real" da ficha: história, estado, procedência e o porquê do valor. */
export function relic29Section(s: GameState, rl: Relic): HTMLElement | null {
  const m = meta29(s, rl.id);
  const st = m ? story29(s, rl) : null;
  if (!m || !st) return null;
  const d = ARCHDEF29[m.arch];
  return section(t(l('História da peça', 'The piece\'s story')),
    h('p', null, t(st)),
    relic29Pills(s, rl),
    h('p', { class: 'muted small' }, t(l('Versão procedural de "{a}", um arquétipo das relíquias reais. O valor anda com o legado do artista (fama, nº 1, prêmios, lenda), sobe na morte de quem usou a peça, em voltas e aniversários, e o escândalo mexe nele. Falsificações circulam no mercado negro: na dúvida, perícia.',
      'A procedural version of "{a}", an archetype of real relics. The value moves with the artist\'s legacy (fame, #1s, awards, legend), rises on the death of whoever used it, on comebacks and anniversaries, and scandal moves it. Forgeries circulate on the black market: when in doubt, get an appraisal.'), { a: t(d.name) })));
}

// ---------------------------------------------------------------- navegador de relíquias (filtros + páginas)

/** Filtros guardados por tela (só na sessão: navegação, fora do save). */
interface F29 { q: string; act: string; arch: string; era: string; st: string; min: number; sort: 'v' | 'new' | 'old'; page: number }
const F29S = new Map<string, F29>();
const f29 = (key: string): F29 => { let f = F29S.get(key); if (!f) F29S.set(key, (f = { q: '', act: '', arch: '', era: '', st: '', min: 0, sort: 'v', page: 0 })); return f; };
/** Arquétipo de qualquer peça: procedural (registro do relics29), real (classificação do catálogo) ou '' (outras). */
export function archOf29(s: GameState, rl: Relic): Arch29 | '' {
  const m = meta29(s, rl.id);
  if (m) return m.arch;
  const d = rl.rr ? relicDef17(rl.rr) : undefined;
  return d ? realArch29(d) : '';
}
const ST29: [string, L][] = [['', l('Todos os donos', 'All owners')], ['kept', l('Com donos', 'Privately held')], ['player', l('Seu acervo', 'Your collection')], ['museum', l('Em museus', 'In museums')], ['auction', l('Em leilão', 'At auction')], ['stolen', l('Roubadas', 'Stolen')]];
/** valor mínimo em dólares reais (comparado com o valor da peça, que também é em dólares reais) */
const MIN29 = [0, 10000, 50000, 250000];

/**
 * Lista grande de relíquias com filtros (busca, ato, arquétipo, época, dono, valor mínimo, ordem) e páginas.
 * `render` desenha uma peça; `wrap` monta o contêiner da página (grade, lista…). Só redesenha a si mesmo.
 */
export function relicBrowser29(s: GameState, key: string, list: Relic[], render: (rl: Relic) => HTMLElement, o: { size?: number; wrap?: (kids: HTMLElement[]) => HTMLElement; owners?: boolean } = {}): HTMLElement {
  const size = o.size ?? 24;
  const f = f29(key);
  const root = h('div', { class: 'r29-browser' });
  const acts = new Map<string, number>();
  for (const rl of list) if (rl.a) acts.set(rl.a, (acts.get(rl.a) ?? 0) + 1);
  const archs = new Set(list.map((rl) => archOf29(s, rl)));
  const eras = [...new Set(list.map((rl) => Math.floor(rl.y / 10) * 10))].sort((a, b) => a - b);
  const draw = (): void => {
    const q = f.q.trim().toLowerCase();
    let xs = list.filter((rl) => (!f.act || rl.a === f.act) && (!f.arch || (f.arch === '-' ? archOf29(s, rl) === '' : archOf29(s, rl) === f.arch))
      && (!f.era || Math.floor(rl.y / 10) * 10 === +f.era) && (!f.st || rl.st === f.st) && (!f.min || rl.v >= f.min)
      && (!q || t(rl.n).toLowerCase().includes(q) || (rl.a ? nameOf(s, rl.a).toLowerCase().includes(q) : false)));
    xs = xs.slice().sort((a, b) => (f.sort === 'v' ? b.v - a.v : f.sort === 'new' ? b.y - a.y || b.v - a.v : a.y - b.y || b.v - a.v));
    const pages = Math.max(1, Math.ceil(xs.length / size));
    f.page = Math.min(f.page, pages - 1);
    const page = xs.slice(f.page * size, f.page * size + size);
    const set = <K extends keyof F29>(k: K, v: F29[K]) => { f[k] = v; if (k !== 'page') f.page = 0; draw(); };
    const actOpts = [...acts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([id, n]) => ({ value: id, label: `${nameOf(s, id)} (${n})` }));
    const bar = h('div', { class: 'row wrap r29-filters' },
      h('input', { type: 'search', value: f.q, placeholder: t(l('Buscar peça ou artista', 'Search piece or artist')), 'aria-label': t(l('Buscar peça ou artista', 'Search piece or artist')),
        onchange: (e: Event) => set('q', (e.target as HTMLInputElement).value) }),
      select(f.act, [{ value: '', label: t(l('Todos os atos', 'All acts')) }, ...actOpts], (v) => set('act', v), { 'aria-label': t(l('Ato', 'Act')) }),
      select(f.arch, [{ value: '', label: t(l('Todos os arquétipos', 'All archetypes')) }, ...ARCH29.filter((a) => archs.has(a)).map((a) => ({ value: a as string, label: t(ARCHDEF29[a].name) })),
        ...(archs.has('') ? [{ value: '-', label: t(l('Outras peças', 'Other pieces')) }] : [])], (v) => set('arch', v), { 'aria-label': t(l('Arquétipo', 'Archetype')) }),
      select(f.era, [{ value: '', label: t(l('Todas as épocas', 'All eras')) }, ...eras.map((e) => ({ value: String(e), label: t(l('Anos {d}', 'The {d}s'), { d: e }) }))], (v) => set('era', v), { 'aria-label': t(l('Época', 'Era')) }),
      o.owners === false ? null : select(f.st, ST29.map(([v, lb]) => ({ value: v, label: t(lb) })), (v) => set('st', v), { 'aria-label': t(l('Dono', 'Owner')) }),
      select(f.min, MIN29.map((v) => ({ value: v, label: v ? t(l('Valor ≥ {v}', 'Value ≥ {v}'), { v: $(money(s, v)) }) : t(l('Qualquer valor', 'Any value')) })), (v) => set('min', v), { 'aria-label': t(l('Valor mínimo', 'Minimum value')) }),
      select(f.sort, [{ value: 'v' as const, label: t(l('Mais valiosas', 'Most valuable')) }, { value: 'new' as const, label: t(l('Mais novas', 'Newest')) }, { value: 'old' as const, label: t(l('Mais antigas', 'Oldest')) }], (v) => set('sort', v), { 'aria-label': t(l('Ordem', 'Order')) }));
    const nav = (): HTMLElement => (pages > 1 ? h('div', { class: 'row r29-pager' },
      h('button', { class: 'btn small ghost', disabled: f.page === 0 ? true : undefined, onclick: () => set('page', f.page - 1) }, t(l('‹ Anterior', '‹ Previous'))),
      h('small', { class: 'muted' }, t(l('Página {p} de {n} · {c} peças', 'Page {p} of {n} · {c} pieces'), { p: f.page + 1, n: pages, c: xs.length })),
      h('button', { class: 'btn small ghost', disabled: f.page >= pages - 1 ? true : undefined, onclick: () => set('page', f.page + 1) }, t(l('Próxima ›', 'Next ›'))))
      : h('small', { class: 'muted' }, t(l('{c} peças', '{c} pieces'), { c: xs.length })));
    const kids = page.map(render);
    root.replaceChildren(bar, nav(), kids.length ? (o.wrap ? o.wrap(kids) : h('div', null, ...kids)) : h('p', { class: 'muted small' }, t(l('Nenhuma peça com esses filtros.', 'No piece matches these filters.'))), pages > 1 ? nav() : '');
  };
  draw();
  return root;
}

// ---------------------------------------------------------------- densidade (Opções e Nova run)

/** Descrição curta de cada densidade (Nova run e Opções). */
export const DENS29_DESC: Record<Dens29, L> = {
  few: l('Raras: ~4 por ano, 30 vivas (a primeira versão).', 'Rare: ~4 a year, 30 alive (the first version).'),
  normal: l('~10 por ano num mundo médio, até 150 vivas.', '~10 a year in a medium world, up to 150 alive.'),
  many: l('~15–30 por ano, até 400 vivas; antigas e baratas viram acervo histórico.', '~15–30 a year, up to 400 alive; old cheap ones become a historical archive.'),
  all: l('O máximo: ~25–50 por ano, até 500 vivas.', 'The maximum: ~25–50 a year, up to 500 alive.'),
};
export const DENS29_ORDER: Dens29[] = ['few', 'normal', 'many', 'all'];
/** Linha das Opções: densidade das relíquias desta partida (fica no config: muda o mundo daqui para a frente). */
export function settingsRelics29(s: GameState | null): HTMLElement | null {
  if (!s) return null;
  return h('label', null, t(l('Relíquias', 'Relics')),
    select(dens29(s), DENS29_ORDER.map((d) => ({ value: d, label: `${t(DENS29_NAME[d])} — ${t(DENS29_DESC[d])}` })), (v) => { s.config.relicDensity = v; }),
    h('small', { class: 'muted' }, t(l('Vale para esta partida daqui em diante (as peças que já existem ficam).', 'Applies to this run from now on (existing pieces stay).'))));
}

/** Linha do acervo histórico (peças antigas resumidas por ato para o save não crescer). */
export function archiveLine29(s: GameState): HTMLElement | null {
  const a = arc29(s);
  if (!a.n) return null;
  return h('p', { class: 'muted small' }, t(l('Acervo histórico: {n} peças antigas e menos cobiçadas de {k} atos ficam resumidas por ato (valor somado {v}); as notáveis seguem na lista.',
    'Historical archive: {n} older, less coveted pieces from {k} acts are summarised per act (total value {v}); the notable ones stay listed.'), { n: a.n, k: a.acts, v: $(money(s, a.v)) }));
}
