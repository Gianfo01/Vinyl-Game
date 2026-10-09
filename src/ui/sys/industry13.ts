// Matéria-prima (rodada 13): preço por material e época, para que formato serve, e escolha do
// fornecedor (barato / padrão / premium) com as consequências mostradas antes.

import { FORMATS } from '../../data/rules';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Material } from '../../sim/sys/industry/state';
import { MATERIAL_NAMES, mainMaterial } from '../../sim/sys/industry/supply';
import { GRADES, GRADE_FX, MAT_FORMATS, MAT_INFO, gradeName, gradeOf, matAvailable, matWhy, setGrade, sup13, unitCostNow, type Grade } from '../../sim/sys/industry/supply13';
import { availableFormats } from '../../sim/production';
import type { GameState } from '../../sim/types';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';

const pct = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 1000) / 10}%`;

function gradeFx(g: Grade): string {
  const f = GRADE_FX[g];
  return t(l('custo ×{c} · defeitos {d} · apelo físico ×{a} · colecionador {k}', 'cost ×{c} · defects {d} · physical appeal ×{a} · collector {k}'),
    { c: f.cost.toFixed(2), d: pct(f.defect), a: f.appeal.toFixed(2), k: f.coll > 0 ? '+' : f.coll < 0 ? '−' : '=' });
}

export function materialsSection(s: GameState): HTMLElement {
  const st = s.x4.industry;
  const main = mainMaterial(s.year);
  const avail = new Set<string>(availableFormats(s));
  const mats = (Object.keys(st.matPrice) as Material[]).filter((m) => matAvailable(s, m));
  return section(t(l('Matéria-prima e fornecedores', 'Raw materials and suppliers')),
    h('p', { class: 'muted small' }, t(l('Cada formato usa um material com preço próprio, que muda com a época e com crises (petróleo, guerra, renascimento do vinil). Escolha o fornecedor de cada um: barato economiza mas gera defeitos, devoluções e fama de chiado; premium custa mais, impressiona na mão e vira peça de colecionador anos depois.', 'Each format uses a material with its own price, which shifts with the era and with crises (oil, war, the vinyl revival). Pick the supplier for each: cheap saves money but brings defects, returns and a crackly reputation; premium costs more, impresses in hand and becomes a collector piece years later.'))),
    h('div', { class: 'ind-mats' }, mats.map((m) => {
      const g = gradeOf(s, m);
      const why = matWhy(m, s.year);
      const fmts = MAT_FORMATS[m].filter((f) => avail.has(f));
      const price = st.matPrice[m];
      return h('div', { class: `ind-mat ${m === main ? 'main' : ''}` },
        h('b', null, t(MATERIAL_NAMES[m])), ' ',
        h('span', { class: price > 1.15 ? 'bad' : price < 0.95 ? 'good' : '' }, `×${price.toFixed(2)}`), ' ',
        m === main ? pill(t(l('mais usado', 'most used'))) : null,
        h('small', { class: 'muted', style: 'display:block' }, t(MAT_INFO[m])),
        h('small', { style: 'display:block' }, t(l('Serve a: ', 'Used for: ')), fmts.length ? fmts.map((f) => `${t(FORMATS.find((x) => x.id === f)!.name)}${m === 'paper' ? '' : ` (${$(Math.round(unitCostNow(s, f) * 100))}/${t(l('un.', 'unit'))})`}`).join(', ') : t(l('nenhum formato ativo agora', 'no active format right now'))),
        why ? h('small', { class: price > 1.1 ? 'bad' : 'good', style: 'display:block' }, t(why)) : null,
        h('label', { class: 'small' }, t(l('Fornecedor', 'Supplier')), ' ',
          select(g, GRADES.map((x) => ({ value: x, label: `${t(GRADE_FX[x].name)}: ${t(gradeName(m, x, s.year))}` })), (v) => { const e = setGrade(s, m, v); toast(t(e ?? l('Fornecedor trocado: vale para as próximas prensagens.', 'Supplier changed: applies to future pressings.')), e ? 'bad' : 'good'); rerender(); })),
        h('small', { class: 'muted', style: 'display:block' }, gradeFx(g)));
    })),
    sup13(s).collYear ? h('p', { class: 'small good' }, t(l('Mercado de colecionadores rendeu {v} no último ano (prensagens premium antigas).', 'The collector market paid {v} last year (old premium pressings).'), { v: $(sup13(s).collYear) })) : null,
  );
}
