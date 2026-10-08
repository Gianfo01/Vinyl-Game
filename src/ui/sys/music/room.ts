// Estúdio (aba em Criação): foco por etapa da próxima gravação, pistas da era e equipamentos lendários.

import { familyOf, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { FOCUS_IDEAL, STAGES, TRACK_LABEL, buyGear, eraLimits, focusFit, gearAvailable, gearById, ms, normalizeFocus, setFocus, trackLimit, type Stage } from '../../../sim/sys/music';
import type { GameState } from '../../../sim/types';
import { money } from '../../../sim/util';
import { $, pill, rerender, section, toast } from '../../common';
import { h } from '../../dom';
import { store } from '../../store';
import { chips, ic, stat } from '../../vis';

export function studioTab(s: GameState): HTMLElement {
  const a = s.acts[store.selectedAct ?? ''];
  return h('div', { class: 'mu-room' }, a ? focusSection(s, a.id) : null, studioSection(s));
}

const focusDraft: Record<string, Record<Stage, number>> = {};

function focusSection(s: GameState, actId: string): HTMLElement {
  const fam = familyOf(s.acts[actId].genre);
  const cur = ms(s).focus[actId];
  const d = (focusDraft[actId] ??= cur ? { ...cur } : { comp: 25, arr: 25, rec: 25, mix: 25 });
  const learn = ms(s).focusLearn[fam];
  const keys = Object.keys(STAGES) as Stage[];
  const top = (Object.entries(FOCUS_IDEAL[fam]) as [Stage, number][]).sort((x, y) => y[1] - x[1])[0][0];
  const norm = normalizeFocus(d);
  const box = h('div', { class: 'mu-focus' }, keys.map((k) => h('label', null, h('span', null, t(STAGES[k])), h('input', { type: 'range', min: 0, max: 100, value: d[k], 'aria-label': t(STAGES[k]), oninput: (e: Event) => { d[k] = Number((e.target as HTMLInputElement).value); const n = normalizeFocus(d); box.querySelectorAll('output').forEach((o, i) => { o.textContent = `${n[keys[i]]}%`; }); } }), h('output', null, `${norm[k]}%`))));
  return section(t(l('Foco por etapa (próxima gravação)', 'Stage focus (next recording)')),
    h('p', { class: 'muted small' }, t(l('Divida o tempo do estúdio entre composição, arranjo, gravação e mixagem. Cada gênero tem uma distribuição ideal — você a descobre gravando.', 'Split studio time between songwriting, arrangement, recording and mixing. Each genre has an ideal split — you discover it by recording.'))),
    box,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small primary', onclick: () => { setFocus(s, actId, d); toast(t(l('Foco salvo para as próximas gravações.', 'Focus saved for the next recordings.')), 'good'); rerender(); } }, t(l('Salvar foco', 'Save focus'))),
      cur ? pill(`${t(l('Atual', 'Current'))}: ${keys.map((k) => `${t(STAGES[k]).slice(0, 4)} ${cur[k]}%`).join(' · ')}`) : pill(t(l('sem foco definido (neutro)', 'no focus set (neutral)'))),
      learn ? pill(`${t(l('Melhor encaixe', 'Best fit'))}: ${Math.round(learn.best * 100)}% · ${t(l('último', 'last'))} ${Math.round(learn.last * 100)}% · ${learn.tries}×`, learn.best > 0.8 ? 'good' : '') : null,
      learn && learn.tries >= 3 ? pill(`${t(l('Aprendido: o gênero pede mais', 'Learned: the genre wants more'))} ${t(STAGES[top]).toLowerCase()}`, 'good') : null,
      cur ? pill(`${t(l('Previsão', 'Forecast'))} ~${learn && learn.tries >= 2 ? Math.round(focusFit(fam, cur) * 100) + '%' : '?'}`) : null,
    ));
}

function studioSection(s: GameState): HTMLElement {
  const m = ms(s);
  const tracks = trackLimit(s);
  const lim = eraLimits(s);
  const avail = gearAvailable(s);
  return section(t(l('Estúdio: pistas e equipamentos lendários', 'Studio: tracks and legendary gear')),
    chips(stat('mic', TRACK_LABEL(tracks), l('Pistas por gravação nesta era', 'Tracks per recording in this era')), stat('clock', `${Math.floor(lim.maxSeconds / 60)}:${String(lim.maxSeconds % 60).padStart(2, '0')}`, l('Duração máxima da faixa', 'Maximum track length'))),
    h('p', { class: 'muted small' }, t(lim.note)),
    m.gear.length ? h('div', { class: 'row wrap' }, h('small', null, t(l('Seus equipamentos:', 'Your gear:'))), m.gear.map((id) => pill(t(gearById[id]?.name ?? l(id, id)), 'good'))) : null,
    m.gearOffers.length ? h('div', { class: 'mu-gear' }, m.gearOffers.map((o) => {
      const g = gearById[o.gearId];
      return h('article', { class: 'tile mu-offer' }, h('div', { class: 'tile-ic' }, ic('gavel', 2)), h('div', { class: 'tile-body' },
        h('b', null, t(g.name)), h('small', null, t(l('Massa falida de {lb}', '{lb} bankruptcy sale'), { lb: o.from })),
        h('button', { class: 'btn small primary', disabled: s.player.cash < o.price, onclick: () => { const e = buyGear(s, o.gearId, o.id); toast(t(e ?? l('Comprado no leilão!', 'Bought at auction!')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Arrematar', 'Buy'))} ${$(o.price)}`)));
    })) : null,
    avail.length ? h('div', { class: 'mu-gear' }, avail.map((g) => h('article', { class: 'tile' }, h('div', { class: 'tile-ic' }, ic('mic', 2)), h('div', { class: 'tile-body' },
      h('b', null, t(g.name)), h('small', null, t(g.desc)),
      chips(stat('radio', `+${g.prod}`, l('Produção', 'Production')), g.perf ? stat('mic', `+${g.perf}`, l('Performance', 'Performance')) : null, g.orig ? stat('sparkle', `${g.orig > 0 ? '+' : ''}${g.orig}`, l('Originalidade', 'Originality')) : null),
      h('button', { class: 'btn small', disabled: s.player.cash < money(s, g.price), onclick: () => { const e = buyGear(s, g.id); toast(t(e ?? l('Equipamento instalado no estúdio.', 'Gear installed in the studio.')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Comprar', 'Buy'))} ${$(money(s, g.price))}`))))) : h('p', { class: 'muted small' }, t(l('Nenhum equipamento lendário novo nesta época.', 'No new legendary gear in this era.'))),
    h('p', { class: 'muted small' }, t(l('Equipamentos valem inteiros no estúdio da sede e pela metade em estúdios externos; casam melhor com alguns gêneros e mudam o som do trecho.', 'Gear counts fully in your HQ studio and half in outside studios; it suits some genres better and changes the snippet\'s sound.'))),
  );
}

