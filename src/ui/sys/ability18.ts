// Rodada 18 (ability18) — interface da habilidade atual/potencial: estrelas (atual cheias; potencial em contorno,
// com a faixa de incerteza do olheiro), relatório de olheiro, aba "Desenvolvimento" (atributos com teto, causas da
// variação, personalidade, gráfico de evolução ano a ano) em toda página de pessoa, bloco de elenco no artista,
// e estrelas nas listas de elenco, mercado/scouting e profissionais.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState, Person } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { canSee } from '../../sim/sys/fame15';
import { AGE18, CAUSE18, SKILL18, ab18, ability18, est18, mentorFor18, weights18, type Est18 } from '../../sim/sys/ability18';
import { personStars18 } from '../ab18stars';
import { section } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { ACT_OVERVIEW_EXTRAS, PERSON_HEAD_EXTRAS, PERSON_TABS, openPersonPage } from '../pages';
import { PAGE16_HEAD, PAGE16_TABS } from './people16';

const T = (x: L) => t(x);
const nums = (s: GameState, key: string, e: Est18): HTMLElement =>
  h('span', { class: 'small muted' },
    e.mine ? why18(s, 'ability.ca', { key }, h('b', null, `${T(l('Atual', 'Current'))} ${e.ca}`)) : `${T(l('Atual', 'Current'))} ~${e.caLo}–${e.caHi}`,
    ' · ', why18(s, 'ability.pa', { key }, `${T(l('Potencial', 'Potential'))} ${e.paLo}–${e.paHi}`), ' /200');

function headLine(s: GameState, key: string): HTMLElement | null {
  const e = est18(s, key);
  if (!e) return null;
  return h('div', { class: 'ab18-head row wrap small' }, personStars18(s, key), ' ', nums(s, key, e), ' ', h('i', { class: 'muted' }, T(e.report[0])));
}

// ------------------------------------------------------------------ gráfico de evolução

function chart(s: GameState, key: string, e: Est18): HTMLElement {
  const st = ab18(s);
  const A = ability18(s, key);
  const raw = st.h[key] ?? [];
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) pts.push([raw[i], raw[i + 1]]);
  if (A && (!pts.length || pts[pts.length - 1][0] < s.year)) pts.push([s.year, Math.round(A.ca)]);
  if (pts.length < 2) return h('p', { class: 'muted small' }, T(l('O gráfico de evolução começa a encher no próximo ano (um ponto por ano).', 'The evolution chart starts filling next year (one point per year).')));
  const W = 320, H = 120, x0 = pts[0][0], x1 = Math.max(pts[pts.length - 1][0], x0 + 1);
  const X = (y: number) => 26 + (y - x0) / (x1 - x0) * (W - 34), Y = (v: number) => H - 14 - v / 200 * (H - 22);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'ab18-chart'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', T(l('Evolução da habilidade atual por ano', 'Current ability by year')));
  const el = (tag: string, at: Record<string, string | number>, txt?: string) => { const n = document.createElementNS(ns, tag); for (const [a, v] of Object.entries(at)) n.setAttribute(a, String(v)); if (txt) n.textContent = txt; svg.appendChild(n); return n; };
  el('rect', { x: 26, y: Y(e.paHi), width: W - 34, height: Math.max(1, Y(e.paLo) - Y(e.paHi)), class: 'ab18-band' });
  for (const g of [50, 100, 150, 200]) { el('line', { x1: 26, x2: W - 8, y1: Y(g), y2: Y(g), class: 'ab18-grid' }); el('text', { x: 2, y: Y(g) + 3, class: 'ab18-ax' }, String(g)); }
  el('text', { x: 26, y: H - 2, class: 'ab18-ax' }, String(x0)); el('text', { x: W - 30, y: H - 2, class: 'ab18-ax' }, String(x1));
  el('polyline', { points: pts.map(([y, v]) => `${X(y)},${Y(v)}`).join(' '), class: 'ab18-line' });
  for (const [y, v] of pts) { const c = el('circle', { cx: X(y), cy: Y(v), r: 2.6, class: 'ab18-dot' }); const ti = document.createElementNS(ns, 'title'); ti.textContent = `${y}: ${v}`; c.appendChild(ti); }
  return h('div', { class: 'ab18-chartbox' }, svg as unknown as HTMLElement,
    h('small', { class: 'muted' }, T(l('Linha: habilidade atual. Faixa: potencial estimado (o teto verdadeiro é oculto).', 'Line: current ability. Band: estimated potential (the true ceiling is hidden).'))));
}

// ------------------------------------------------------------------ aba Desenvolvimento

const phase = (age: number, k: keyof typeof AGE18): L => {
  const [end, dec] = AGE18[k];
  return age < end - 2 ? l('crescendo', 'growing') : age < dec ? l('auge', 'peak') : l('em declínio', 'declining');
};

function devTab(s: GameState, key: string): HTMLElement {
  const e = est18(s, key);
  const A = ability18(s, key);
  if (!e || !A) return h('p', { class: 'muted' }, '—');
  const st = ab18(s);
  const p = key.startsWith('p:') ? s.persons[key.slice(2)] : undefined;
  const seeAttrs = e.mine || (p ? canSee(s, p.id, 'attrs') : true);
  const seeMind = e.mine || (p ? canSee(s, p.id, 'traits') : e.know >= 0.5);
  const out: (HTMLElement | null)[] = [];
  out.push(h('div', { class: 'ab18-top' }, personStars18(s, key, true), h('div', null, nums(s, key, e),
    A.band && !e.mine ? h('div', { class: 'small muted' }, T(fmtL(l('Faixa juvenil nos relatórios: −{b}', 'Youth band in reports: −{b}'), { b: A.band }))) : null)));
  out.push(section(T(l('Relatório de olheiro', 'Scout report')), h('ul', { class: 'ab18-rep' }, e.report.map((r) => h('li', null, T(r))))));
  if (p && A.kind === 'artist' && seeAttrs) {
    const w = weights18(p.role);
    const age = s.year - p.born;
    const cap = (A.eff ?? A.pa) / 2;
    out.push(section(T(l('Atributos (dentro do teto)', 'Attributes (within the ceiling)')),
      h('div', { class: 'ab18-attrs' }, (Object.keys(SKILL18) as (keyof typeof SKILL18)[]).map((k) => {
        const v = Math.round(p.skills[k]);
        const c = Math.round(Math.min(99, cap + (w[k] >= 0.2 ? 7 : w[k] >= 0.1 ? 2 : -5)));
        return h('div', { class: `ab18-attr${w[k] >= 0.2 ? ' main' : ''}` },
          h('span', { class: 'ab18-k' }, T(SKILL18[k]), w[k] ? h('small', { class: 'muted' }, ` ${Math.round(w[k] * 100)}%`) : null),
          h('span', { class: 'ab18-bar' }, h('span', { class: 'v', style: `width:${v}%` }), e.mine ? h('span', { class: 'cap', style: `left:${c}%`, title: T(l('Teto que a personalidade alcança', 'Ceiling their personality reaches')) }) : null),
          h('b', null, String(v)), h('small', { class: 'muted' }, ` ${T(phase(age, k))}`));
      })),
      h('p', { class: 'small muted' }, T(l('% = peso na habilidade atual pela função. Voz e palco atingem o auge cedo; composição e letra amadurecem tarde; negócios crescem até tarde.', '% = weight in current ability for the role. Voice and stage peak early; songwriting and lyrics mature late; business grows until late.')))));
  }
  const d = st.d[A.key], dp = st.dp[A.key];
  if (d || dp) {
    const rows = Object.entries(d ?? {}).filter(([, v]) => Math.abs(v) >= 0.05).sort((a, b) => b[1] - a[1]);
    out.push(section(T(l('Por que mudou (este ano)', 'Why it changed (this year)')),
      rows.length ? h('ul', { class: 'ab18-why' }, rows.map(([c, v]) => h('li', { class: v > 0 ? 'good' : 'bad' }, `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10} `, T(CAUSE18[c] ?? l(c, c))))) : h('p', { class: 'muted small' }, T(l('Nada relevante ainda neste ano.', 'Nothing notable yet this year.'))),
      dp ? h('p', { class: 'small muted' }, T(fmtL(l('Ano passado: {v} pontos.', 'Last year: {v} points.'), { v: `${Object.values(dp).reduce((x, y) => x + y, 0) >= 0 ? '+' : ''}${Math.round(Object.values(dp).reduce((x, y) => x + y, 0) * 10) / 10}` }))) : null));
  }
  if (seeMind) {
    const dv = A.drive;
    const m = (lab: L, v: number) => h('div', { class: 'ab18-attr' }, h('span', { class: 'ab18-k' }, T(lab)), h('span', { class: 'ab18-bar' }, h('span', { class: 'v', style: `width:${Math.round(v)}%` })), h('b', null, String(Math.round(v))));
    out.push(section(T(l('Personalidade (quanto do teto alcança)', 'Personality (how much of the ceiling they reach)')),
      h('div', { class: 'ab18-attrs' }, m(l('Profissionalismo', 'Professionalism'), dv.prof), m(l('Ambição', 'Ambition'), dv.amb), m(l('Determinação', 'Determination'), dv.det), m(l('Temperamento', 'Temperament'), dv.temp)),
      h('p', { class: 'small muted' }, T(fmtL(l('Ritmo de evolução ×{v}.', 'Growth pace ×{v}.'), { v: dv.v.toFixed(2) })))));
  }
  if (p && e.mine) {
    const tr = st.tr[A.key] ?? 0, mt = st.mt[p.id];
    const m = mentorFor18(s, p);
    out.push(section(T(l('Treino e mentoria', 'Training and mentoring')),
      h('p', { class: 'small' }, tr > s.week ? T(fmtL(l('Em aulas por mais {w} semanas.', 'In lessons for {w} more weeks.'), { w: tr - s.week })) : T(l('Sem aulas agora.', 'No lessons right now.')), ' ',
        mt && mt[1] > s.week ? h('span', null, T(l('Mentor: ', 'Mentor: ')), h('button', { class: 'link', onclick: () => openPersonPage(mt[0]) }, s.persons[mt[0]]?.name ?? '?')) : m ? T(fmtL(l('Mentor possível no elenco: {m}.', 'Possible mentor on the roster: {m}.'), { m: m.name })) : null),
      h('p', { class: 'small muted' }, T(l('Use o menu de ações da pessoa (Carreira): aulas, mentor. Estrada e estúdio também ensinam; estresse, vício e burnout travam.', 'Use the person\'s action menu (Career): lessons, mentor. The road and the studio teach too; stress, addiction and burnout stall.')))));
  }
  if (A.np && (e.mine || e.know >= 0.5)) {
    const n = A.np;
    out.push(section(T(l('Carreira no ofício', 'Career in the trade')), h('ul', { class: 'ab18-why' },
      h('li', null, T(fmtL(l('Idade {a}: {p}', 'Age {a}: {p}'), { a: n.age, p: n.ramp < 1 ? l('ainda subindo', 'still rising') : n.decl > 0 ? l('em declínio', 'declining') : l('no auge', 'at their peak') }))),
      n.xp ? h('li', { class: 'good' }, T(fmtL(l('Experiência acumulada: +{v}', 'Accumulated experience: +{v}'), { v: Math.round(n.xp) }))) : null,
      n.youth ? h('li', { class: 'bad' }, T(fmtL(l('Inexperiência: −{v}', 'Inexperience: −{v}'), { v: Math.round(n.youth) }))) : null,
      n.decl ? h('li', { class: 'bad' }, T(fmtL(l('Idade: −{v}', 'Age: −{v}'), { v: Math.round(n.decl) }))) : null)));
  }
  out.push(section(T(l('Evolução', 'Evolution')), chart(s, A.key, e)));
  return h('div', { class: 'ab18' }, ...out);
}

// ------------------------------------------------------------------ registros

PERSON_HEAD_EXTRAS.push((s, p) => headLine(s, `p:${p.id}`));
PERSON_TABS.push((s, p) => ({ id: 'ability18', label: l('Desenvolvimento', 'Development'), icon: 'star', render: () => devTab(s, `p:${p.id}`) }));
PAGE16_HEAD.push((s, key) => (key.startsWith('p:') ? null : headLine(s, key)));
PAGE16_TABS.push((s, key) => (key.startsWith('p:') || !ability18(s, key) ? null : { id: 'ability18', label: l('Desenvolvimento', 'Development'), icon: 'star', render: () => devTab(s, key) }));

ACT_OVERVIEW_EXTRAS.push((s, a, _deg, mine) => {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive);
  if (!ms.length) return null;
  return section(T(l('Habilidade atual e potencial', 'Current and potential ability')),
    h('div', { class: 'ab18-members' }, ms.map((p) => {
      const e = est18(s, `p:${p.id}`);
      return h('div', { class: 'ab18-mem' },
        h('button', { class: 'link', onclick: () => openPersonPage(p.id, 'ability18') }, p.name), ' ', h('small', { class: 'muted' }, `${s.year - p.born}`),
        ' ', personStars18(s, `p:${p.id}`), e ? h('small', { class: 'muted' }, ` ${T(e.report[0])}`) : null);
    })),
    !mine ? h('p', { class: 'small muted' }, T(l('Estimativa do seu A&R: olheiros e conversas estreitam a faixa.', 'Your A&R\'s estimate: scouts and talks narrow the range.'))) : null);
});

