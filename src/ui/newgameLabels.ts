// Rodada 10 (r22: etapa própria "Gravadoras"): quais gravadoras existem, quantas e como começam. Sem escolha
// manual, vale a SUGESTÃO, que acompanha o ano de início, a cidade-sede e o mundo; ela é gravada ao começar a run.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { PLAYBOOKS, type PlaybookId } from '../sim/sys/rivals8';
import type { LabelSetup, RunConfig } from '../sim/types';
import { realFounded } from '../data/realnames';
import { LABELS_MAX22, labelPool, suggestLabels22, type PoolLabel } from '../sim/worldgen';
import { cityById } from '../data/world';
import { cityName } from './common';
import { h, select } from './dom';

const SIZE: Record<PoolLabel['family'], L> = { A: l('major', 'major'), B: l('indie', 'indie'), C: l('fábrica de hits', 'hit factory'), D: l('catálogo', 'catalog') };
type Start22 = NonNullable<LabelSetup['start']>;
const STARTS22: { id: Start22; name: L; desc: L }[] = [
  { id: 'history', name: l('Pela história', 'By history'), desc: l('Tamanho, caixa e elenco como eram no ano de início.', 'Size, cash and roster as they were in the start year.') },
  { id: 'random', name: l('Aleatório', 'Random'), desc: l('Porte, caixa e prestígio sorteados: uma major pode começar quebrada e um selo de garagem, rico.', 'Size, cash and prestige rolled: a major may start broke and a garage label rich.') },
  { id: 'equal', name: l('Todos iguais', 'All equal'), desc: l('Todas, inclusive a sua, com o mesmo caixa e a mesma reputação, e ninguém com artistas.', 'Everyone, you included, with the same cash and reputation, and nobody with artists.') },
  { id: 'inverted', name: l('Mundo virado', 'Upside down'), desc: l('As grandes começam pequenas e as pequenas começam grandes.', 'The big ones start small and the small ones start big.') },
  { id: 'giants', name: l('Gigantes', 'Giants'), desc: l('Todas as rivais com caixa e prestígio de major. Para quem gosta de sofrer.', 'Every rival with a major\'s cash and prestige. For those who like to suffer.') },
  { id: 'startups', name: l('Todas novatas', 'All newcomers'), desc: l('Rivais recém-abertas: pouco caixa, pouco prestígio e nenhum artista no começo.', 'Freshly opened rivals: little cash, little prestige and no artists at the start.') },
];
const WHY22: Record<string, L> = { core: l('núcleo histórico', 'historical core'), major: l('majors da época', 'majors of the era'), local: l('concorrência na sua região', 'competition in your region'), era: l('cena do momento', 'scene of the moment'), acoustic: l('pioneiros do disco', 'record pioneers') };
type Filter22 = 'all' | 'on' | 'A' | 'indie' | 'local';

/** Ids que valem agora: a lista escolhida ou, sem escolha, a sugestão para a configuração atual. */
export function chosenLabels22(cfg: RunConfig): string[] {
  return cfg.labels?.ids ?? suggestLabels22(cfg).ids;
}

/** Ao começar: sem escolha manual, a sugestão vira a lista da partida (o mundo nasce com o que a tela mostrou). */
export function materializeLabels22(cfg: RunConfig): void {
  if (cfg.labels?.ids) return;
  cfg.labels = { ...(cfg.labels ?? {}), ids: suggestLabels22(cfg).ids };
}

export function labelsCard(cfg: RunConfig, onChange: () => void): { el: HTMLElement; refresh: () => void } {
  const pool = labelPool();
  const setup = (): LabelSetup => (cfg.labels ??= {});
  const fy = (d: PoolLabel) => (cfg.realNames ? realFounded(d.id, d.founded) : d.founded);
  const avail = () => pool.filter((d) => fy(d) <= cfg.startYear).sort((a, b) => fy(a) - fy(b) || a.name.localeCompare(b.name));
  const nameOf = (d: PoolLabel) => (cfg.realNames && d.real ? d.real : d.name);
  const home = () => cityById[cfg.homeCity]?.market;
  let filter: Filter22 = 'all';
  let q = '';

  const sugBox = h('div', { class: 'ng22-sug', 'aria-live': 'polite' });
  const startBox = h('div', { class: 'ng22-picks' });
  const countOut = h('b', { class: 'ng22-count' });
  const countIn = h('input', { type: 'range', min: 0, max: LABELS_MAX22, step: 1, 'aria-label': t(l('Número de gravadoras rivais', 'Number of rival labels')) }) as HTMLInputElement;
  const hint = h('p', { class: 'muted small' });
  const filters = h('div', { class: 'ng22-chips', role: 'group', 'aria-label': t(l('Filtrar gravadoras', 'Filter labels')) });
  const listBox = h('div', { class: 'ng22-labels' });

  const setIds = (ids: string[]) => {
    // as do futuro escolhidas continuam valendo
    const later = chosenLabels22(cfg).filter((id) => { const d = pool.find((x) => x.id === id); return (d ? fy(d) : 0) > cfg.startYear; });
    setup().ids = [...new Set([...ids, ...later])];
    delete setup().count;
    draw();
    onChange();
  };
  const draw = () => {
    const sug = suggestLabels22(cfg);
    const custom = !!cfg.labels?.ids;
    const c = new Set(chosenLabels22(cfg));
    const list = avail();
    const sel = list.filter((d) => c.has(d.id)).length;
    const nowSug = list.filter((d) => sug.ids.includes(d.id)).length;
    sugBox.replaceChildren(...[
      h('div', null,
        h('b', null, custom ? t(l('Lista personalizada', 'Custom list')) : t(l('Usando a sugestão', 'Using the suggestion'))),
        h('p', { class: 'small' }, t(l('Para {y} em {c}: {n} gravadoras já existem no começo.', 'For {y} in {c}: {n} labels already exist at the start.'), { y: cfg.startYear, c: cityName(cfg.homeCity), n: nowSug })),
        h('ul', { class: 'small ng22-why' }, ...sug.parts.map((p) => {
          const k = p.ids.filter((id) => list.some((d) => d.id === id)).length;
          return k ? h('li', null, h('b', null, String(k)), ' ', t(WHY22[p.why])) : null;
        })),
        h('p', { class: 'muted small' }, custom ? t(l('A sugestão continua mudando com ano, cidade e mundo; sua lista, não.', 'The suggestion keeps changing with year, city and world; your list does not.')) : t(l('Mude o ano, a cidade-sede ou o mundo e a sugestão acompanha.', 'Change the year, home city or world and the suggestion follows.')))),
      custom ? h('button', { type: 'button', class: 'btn primary small', onclick: () => { delete cfg.labels!.ids; delete cfg.labels!.count; draw(); onChange(); } }, t(l('Voltar à sugestão', 'Back to the suggestion'))) : null].filter((x) => !!x) as HTMLElement[]);
    startBox.replaceChildren(...STARTS22.map((x) => {
      const on = (cfg.labels?.start ?? 'history') === x.id;
      return h('button', { type: 'button', class: `pick ${on ? 'on' : ''}`, 'aria-pressed': String(on), onclick: () => { if (x.id === 'history') { if (cfg.labels) delete cfg.labels.start; } else setup().start = x.id; draw(); onChange(); } },
        h('b', null, t(x.name), x.id === 'history' ? h('span', { class: 'ng20-badge' }, t(l('PADRÃO', 'DEFAULT'))) : null), h('small', null, t(x.desc)));
    }));
    const n = cfg.labels?.count ?? sel;
    countIn.value = String(n);
    countOut.textContent = String(n);
    hint.textContent = n === sel ? t(l('{n} marcadas existem no começo. As fundadas depois do início aparecem durante a partida, com notícia.', '{n} checked exist at the start. Those founded after the start appear during the game, with a news item.'), { n })
      : n < sel ? t(l('{n} de {k} marcadas, sorteadas pela semente.', '{n} of {k} checked, drawn by the seed.'), { n, k: sel })
        : t(l('As {k} marcadas + {m} sorteadas (do catálogo ou genéricas).', 'The {k} checked + {m} drawn (from the catalog or generic).'), { k: sel, m: n - sel });
    const FIL: [Filter22, L, number][] = [
      ['all', l('Todas', 'All'), list.length], ['on', l('Marcadas', 'Checked'), sel],
      ['A', l('Majors', 'Majors'), list.filter((d) => d.family === 'A').length], ['indie', l('Indies e outras', 'Indies and others'), list.filter((d) => d.family !== 'A').length],
      ['local', l('Da sua região', 'From your region'), list.filter((d) => cityById[d.city]?.market === home()).length]];
    filters.replaceChildren(...FIL.map(([id, name, k]) => h('button', { type: 'button', class: `chip-btn ${filter === id ? 'on' : ''}`, 'aria-pressed': String(filter === id), onclick: () => { filter = id; draw(); } }, `${t(name)} · ${k}`)));
    const shown = list.filter((d) => (filter === 'all' || (filter === 'on' ? c.has(d.id) : filter === 'A' ? d.family === 'A' : filter === 'indie' ? d.family !== 'A' : cityById[d.city]?.market === home()))
      && (!q || nameOf(d).toLowerCase().includes(q) || cityName(d.city).toLowerCase().includes(q)));
    listBox.replaceChildren(...(shown.length ? shown.map((d) => h('label', { class: `ng22-lb ${c.has(d.id) ? 'on' : ''}`, title: t(d.archetype) },
      h('input', { type: 'checkbox', checked: c.has(d.id), onchange: (e: Event) => {
        const on = (e.target as HTMLInputElement).checked;
        setIds(list.filter((x) => (x.id === d.id ? on : c.has(x.id))).map((x) => x.id));
      } }),
      h('span', null, h('b', null, nameOf(d)), h('small', { class: 'muted' }, `${cityName(d.city)} · ${fy(d)} · ${t(SIZE[d.family])}${d.playbook ? ` · ${t(PLAYBOOKS[d.playbook as PlaybookId]?.name)}` : ''}`))))
      : [h('p', { class: 'muted small' }, t(l('Nada com este filtro.', 'Nothing with this filter.')))]));
  };
  countIn.oninput = () => { setup().count = Number(countIn.value); if (!cfg.labels!.ids) cfg.labels!.ids = suggestLabels22(cfg).ids; draw(); };
  countIn.onchange = () => onChange();
  const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const search = h('input', { type: 'search', placeholder: t(l('Buscar por nome ou cidade…', 'Search by name or city…')), 'aria-label': t(l('Buscar gravadora', 'Search label')), oninput: (e: Event) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); draw(); } });
  const el = h('div', { class: 'ng22-lbwrap' },
    h('section', { class: 'card wide' }, h('h3', null, t(l('Sugestão para a sua run', 'Suggestion for your run'))), sugBox),
    h('section', { class: 'card wide' }, h('h3', null, t(l('Como as gravadoras começam', 'How labels start'))), startBox),
    h('section', { class: 'card wide' },
      h('h3', null, t(l('Quantas e quais', 'How many and which'))),
      h('div', { class: 'ng22-range' }, h('span', null, t(l('Gravadoras rivais no começo', 'Rival labels at the start'))), countIn, countOut),
      hint,
      h('label', null, t(l('Fundadas depois do início', 'Founded after the start')), select<NonNullable<LabelSetup['future']>>(cfg.labels?.future ?? 'default', [
        { value: 'default', label: t(l('As da lista (padrão)', 'The ones on the list (default)')) },
        { value: 'all', label: t(l('Todas do catálogo (mais selos ao longo das décadas)', 'All from the catalog (more labels over the decades)')) },
        { value: 'none', label: t(l('Nenhuma', 'None')) },
      ], (v) => { setup().future = v; onChange(); })),
      h('div', { class: 'row wrap ng22-tools' }, search,
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => setIds(avail().map((d) => d.id)) }, t(l('Marcar todas', 'Check all'))),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => setIds([]) }, t(l('Nenhuma', 'None'))),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => { const a = avail(); setIds(shuffle(a).slice(0, Math.max(1, Math.min(a.length, Math.ceil(a.length / 3)))).map((d) => d.id)); } }, '🎲 ', t(l('Sortear', 'Roll')))),
      filters,
      listBox),
  );
  draw();
  return { el, refresh: draw };
}
