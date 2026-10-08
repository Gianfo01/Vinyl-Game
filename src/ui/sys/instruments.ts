// Aba "Instrumentos" na página da pessoa (rodada 7): até 5 instrumentos com nível, facilidade de
// aprender por família e aulas (sozinho ou com professor) para quem é do selo ou é você.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { FAMILY_NAMES, INSTRUMENTS, MAX_INSTRUMENTS, aptitude, aptitudeLabel, canLearn, dropInstrument, instById, instrumentsOf, learningOf, lessonCost, monthlyGain, startLessons, stopLessons, type InstFamily } from '../../sim/sys/instruments';
import type { GameState, Person } from '../../sim/types';
import { $, pill, toast } from '../common';
import { bar, h, select } from '../dom';

const pick: Record<string, string> = {};

export function instrumentsTab(s: GameState, p: Person, canAct: boolean, redraw: () => void): HTMLElement {
  const list = instrumentsOf(s, p);
  const lr = learningOf(s, p);
  const fams = Object.keys(FAMILY_NAMES) as InstFamily[];
  const options = INSTRUMENTS.filter((d) => !canLearn(s, p, d.id) || list.some((x) => x.id === d.id));
  if (!pick[p.id] || !options.some((o) => o.id === pick[p.id])) pick[p.id] = options.find((o) => !list.some((x) => x.id === o.id))?.id ?? options[0]?.id ?? 'voice';
  const sel = instById[pick[p.id]];
  const cur = list.find((x) => x.id === sel?.id);
  const say = (e: { pt: string; en: string } | null, ok: string) => { if (e) toast(t(e), 'bad'); else toast(ok, 'good'); redraw(); };
  return h('div', { class: 'grid2' },
    h('div', null,
      h('h4', null, t(l('Toca ({n}/{m})', 'Plays ({n}/{m})'), { n: list.length, m: MAX_INSTRUMENTS })),
      h('ul', { class: 'attr-list' }, list.map((x) => h('li', null,
        h('span', null, t(instById[x.id]?.name ?? l(x.id))),
        bar(x.lvl, 100),
        h('b', null, Math.round(x.lvl)),
        canAct && list.length > 1 ? h('button', { class: 'link small', title: t(l('Parar de tocar', 'Stop playing')), onclick: () => { if (confirm(t(l('Abandonar este instrumento?', 'Drop this instrument?')))) say(dropInstrument(s, p.id, x.id), t(l('Instrumento abandonado.', 'Instrument dropped.'))); } }, '✕') : null))),
      lr ? h('p', { class: 'small' }, pill(t(l('estudando', 'studying')), 'good'), ' ', t(instById[lr.id]?.name ?? l(lr.id)), lr.teacher ? ` · ${t(l('com professor', 'with a teacher'))}` : '', canAct ? h('button', { class: 'btn small ghost', onclick: () => { stopLessons(s, p.id); redraw(); } }, t(l('Parar aulas', 'Stop lessons'))) : null) : null,
      h('p', { class: 'muted small' }, t(l('Cada instrumento a partir do nível 35 melhora composição e gravação; instrumentos típicos do gênero (sanfona no forró, cavaquinho no samba, banjo no bluegrass…) ajudam ainda mais, e bandas multi-instrumentistas rendem mais nos shows.', 'Every instrument from level 35 improves writing and recording; instruments typical of the genre (accordion in forró, cavaquinho in samba, banjo in bluegrass…) help even more, and multi-instrumentalist bands earn more live.'))),
    ),
    h('div', null,
      h('h4', null, t(l('Facilidade para aprender', 'Ease of learning'))),
      h('ul', { class: 'attr-list' }, fams.map((f) => { const v = aptitude(p, f); return h('li', null, h('span', null, t(FAMILY_NAMES[f])), bar(v, 100), h('small', null, t(aptitudeLabel(v)))); })),
      canAct && !lr ? h('div', { class: 'form' },
        h('h4', null, t(l('Aulas', 'Lessons'))),
        select(pick[p.id], options.map((d) => ({ value: d.id, label: `${t(d.name)} (${t(FAMILY_NAMES[d.fam])}, ${t(aptitudeLabel(aptitude(p, d.fam)))})` })), (v) => { pick[p.id] = v; redraw(); }),
        sel ? h('small', { class: 'muted' }, cur ? t(l('Já toca (nível {v}): aulas aprofundam.', 'Already plays (level {v}): lessons deepen it.'), { v: Math.round(cur.lvl) }) : t(l('Novo instrumento: começa no nível 12 depois de alguns meses.', 'New instrument: starts at level 12 after a few months.'))) : null,
        sel ? h('small', { class: 'muted' }, t(l('Ritmo estimado: +{a}/mês sozinho, +{b}/mês com professor.', 'Estimated pace: +{a}/mo alone, +{b}/mo with a teacher.'), { a: monthlyGain(p, sel.fam, cur?.lvl ?? 0, false, s.year).toFixed(1), b: monthlyGain(p, sel.fam, cur?.lvl ?? 0, true, s.year).toFixed(1) })) : null,
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn small', onclick: () => say(startLessons(s, p.id, pick[p.id], false), t(l('Estudando sozinho.', 'Self-study started.'))) }, `${t(l('Estudar sozinho', 'Self-study'))} (${$(lessonCost(s, false))}/${t(l('mês', 'mo'))})`),
          h('button', { class: 'btn small primary', onclick: () => say(startLessons(s, p.id, pick[p.id], true), t(l('Aulas com professor começaram.', 'Lessons with a teacher started.'))) }, `${t(l('Com professor', 'With a teacher'))} (${$(lessonCost(s, true))}/${t(l('mês', 'mo'))})`),
        ),
      ) : null,
    ),
  );
}
