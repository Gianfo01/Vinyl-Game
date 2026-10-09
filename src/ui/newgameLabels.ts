// Rodada 10: cartão do Novo Jogo para escolher as gravadoras rivais — quantas, quais (entre as fundadas
// até o ano de início) e como começam (pela história ou todas iguais, do zero).

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { PLAYBOOKS, type PlaybookId } from '../sim/sys/rivals8';
import type { LabelSetup, RunConfig } from '../sim/types';
import { DEFAULT_LABEL_IDS, labelPool, type PoolLabel } from '../sim/worldgen';
import { cityName } from './common';
import { h, select } from './dom';

const SIZE: Record<PoolLabel['family'], ReturnType<typeof l>> = { A: l('major', 'major'), B: l('indie', 'indie'), C: l('fábrica de hits', 'hit factory'), D: l('catálogo', 'catalog') };

export function labelsCard(cfg: RunConfig, onChange: () => void): { el: HTMLElement; refresh: () => void } {
  const pool = labelPool();
  const setup = (): LabelSetup => (cfg.labels ??= {});
  const chosen = (): Set<string> => new Set(cfg.labels?.ids ?? DEFAULT_LABEL_IDS());
  const listBox = h('div', { class: 'mut-grid labels10' });
  const countOut = h('b');
  const countIn = h('input', { type: 'range', min: 0, max: 60, step: 1, 'aria-label': t(l('Número de gravadoras rivais', 'Number of rival labels')) }) as HTMLInputElement;
  const hint = h('p', { class: 'muted small' });
  const avail = () => pool.filter((d) => d.founded <= cfg.startYear).sort((a, b) => a.founded - b.founded || a.name.localeCompare(b.name));
  const nameOf = (d: PoolLabel) => (cfg.realNames && d.real ? d.real : d.name);
  const selectedNow = () => { const c = chosen(); return avail().filter((d) => c.has(d.id)).length; };
  const setIds = (ids: string[]) => {
    const later = (cfg.labels?.ids ?? DEFAULT_LABEL_IDS()).filter((id) => (pool.find((d) => d.id === id)?.founded ?? 0) > cfg.startYear);
    setup().ids = [...new Set([...ids, ...later])];
    delete setup().count;
    draw();
    onChange();
  };
  const draw = () => {
    const c = chosen();
    const list = avail();
    const n = cfg.labels?.count ?? selectedNow();
    countIn.value = String(n);
    countOut.textContent = String(n);
    const sel = selectedNow();
    hint.textContent = n === sel ? t(l('{n} gravadora(s) existem no começo. As fundadas depois do ano de início aparecem durante a partida, com notícia.', '{n} label(s) exist at the start. Those founded after the start year appear during the game, with a news item.'), { n })
      : n < sel ? t(l('{n} de {k} marcadas, sorteadas pela semente.', '{n} of {k} checked, drawn by the seed.'), { n, k: sel })
        : t(l('As {k} marcadas + {m} sorteadas (do catálogo ou genéricas).', 'The {k} checked + {m} drawn (from the catalog or generic).'), { k: sel, m: n - sel });
    listBox.replaceChildren(...list.map((d) => h('label', { class: 'check', title: t(d.archetype) },
      h('input', { type: 'checkbox', checked: c.has(d.id), onchange: (e: Event) => {
        const on = (e.target as HTMLInputElement).checked;
        const cur = list.filter((x) => (x.id === d.id ? on : c.has(x.id))).map((x) => x.id);
        setIds(cur);
      } }),
      h('span', null, nameOf(d), h('small', { class: 'muted' }, ` — ${cityName(d.city)}, ${d.founded} · ${t(SIZE[d.family])}${d.playbook ? ` · ${t(PLAYBOOKS[d.playbook as PlaybookId]?.name)}` : ''}`)))));
  };
  countIn.oninput = () => { setup().count = Number(countIn.value); countOut.textContent = countIn.value; draw(); };
  countIn.onchange = () => onChange();
  const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const el = h('section', { class: 'card wide' },
    h('h3', null, t(l('Gravadoras rivais', 'Rival labels'))),
    h('fieldset', null, h('legend', null, t(l('Como as gravadoras começam', 'How labels start'))),
      h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'lb10', checked: cfg.labels?.start !== 'equal', onchange: () => { if (cfg.labels) delete cfg.labels.start; onChange(); } }),
        h('span', null, h('b', null, t(l('Histórico / atual', 'Historic / current'))), h('small', { class: 'muted' }, ` — ${t(l('tamanhos, caixa e elencos de acordo com a história (como sempre).', 'sizes, cash and rosters according to history (as always).'))}`))),
      h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'lb10', checked: cfg.labels?.start === 'equal', onchange: () => { setup().start = 'equal'; onChange(); } }),
        h('span', null, h('b', null, t(l('Do zero — todos iguais', 'From scratch — everyone equal'))), h('small', { class: 'muted' }, ` — ${t(l('todas as gravadoras, inclusive a sua, com o mesmo caixa, a mesma reputação e nenhum artista.', 'every label, yours included, with the same cash, the same reputation and no artists.'))}`)))),
    h('label', null, t(l('Número de gravadoras rivais', 'Number of rival labels')), ' ', countOut, countIn),
    hint,
    h('label', null, t(l('Gravadoras fundadas depois do início', 'Labels founded after the start')), select<NonNullable<LabelSetup['future']>>(cfg.labels?.future ?? 'default', [
      { value: 'default', label: t(l('As marcadas (padrão: as clássicas)', 'The checked ones (default: the classics)')) },
      { value: 'all', label: t(l('Todas do catálogo (mais selos ao longo das décadas)', 'All from the catalog (more labels over the decades)')) },
      { value: 'none', label: t(l('Nenhuma', 'None')) },
    ], (v) => { setup().future = v; if (v !== 'default' && !cfg.labels!.ids) cfg.labels!.ids = DEFAULT_LABEL_IDS(); onChange(); })),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => setIds(avail().map((d) => d.id)) }, t(l('Todas', 'All'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => setIds([]) }, t(l('Nenhuma', 'None'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { const a = avail(); setIds(shuffle(a).slice(0, Math.max(1, Math.min(a.length, cfg.labels?.count ?? Math.ceil(a.length / 2)))).map((d) => d.id)); } }, t(l('Aleatórias', 'Random'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { delete cfg.labels; draw(); onChange(); } }, t(l('Padrão', 'Default')))),
    h('p', { class: 'muted small' }, t(l('Só aparecem as gravadoras já fundadas no ano de início. Passe o mouse para ver o perfil de cada uma.', 'Only labels already founded by the start year are listed. Hover to see each one\'s profile.'))),
    listBox,
  );
  draw();
  return { el, refresh: draw };
}
