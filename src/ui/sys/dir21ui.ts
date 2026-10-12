// Rodada 21e (criação) — interface: bloco "Mixagem e master" (decisão por era) e "Direção" (faixa-título, single de
// trabalho, ordem, lado B) no projeto (Criação › Projeto); linha da direção na ficha do disco; "Previsão × realizado"
// em Finanças (aba DRE e caixa). O Cockpit recebe a frase pelo head19 (cockpit19).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { availableFormats } from '../../sim/production';
import { songProfile } from '../../sim/repertoire';
import { biasLine21, forecastBias21, leadMult21 } from '../../sim/sys/dir21';
import { MASTER21, defaultMaster21, masterEra21, masterOptions21, type Master21 } from '../../sim/sys/master21';
import { setProjectSongs, type MusicProject } from '../../sim/sys/project8';
import { bestOrder18, sequence18 } from '../../sim/sys/quality18';
import type { GameState, Release, Song } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { why18, whyIcon } from '../explain18';
import { RELEASE_EXTRAS } from '../ficha';
import { registerSection } from '../registry';
import { PROJ_TRACK_EXTRAS18 } from './project8';

const songsOf = (s: GameState, ids: string[]): Song[] => ids.map((id) => s.songs[id]).filter((x): x is Song => !!x);
const vinylEra = (s: GameState): boolean => s.year < 1990 && availableFormats(s).includes('lp');
type OrderId = 'current' | 'best' | 'lead' | 'title';

function orderFor(s: GameState, p: MusicProject, id: OrderId): string[] {
  const best = bestOrder18(s, p.songIds);
  const first = id === 'lead' ? p.dir21?.lead : id === 'title' ? p.dir21?.title : undefined;
  if (id === 'best' || !first) return best;
  return [first, ...best.filter((x) => x !== first)];
}

/** Bloco do projeto: master por era + direção do álbum. */
PROJ_TRACK_EXTRAS18.push((s: GameState, p: MusicProject, locked: boolean) => {
  if (!p.songIds.length) return null;
  const so = songsOf(s, p.songIds);
  const d = (p.dir21 ??= {});
  const opts = masterOptions21(s.year);
  const cur: Master21 = d.master ?? defaultMaster21(s.year);
  const era = masterEra21(s.year);
  const kids: (HTMLElement | null)[] = [];
  // (1) mixagem e master
  kids.push(h('div', { class: 'row wrap' },
    why18(s, 'dir21.master', { master: cur, year: s.year }, t(l('Mixagem e master', 'Mix and master')), ': '),
    opts.length && !locked ? select(cur, opts.map((m) => ({ value: m, label: t(MASTER21[m].name) })), (v) => { d.master = v; rerender(); }) : h('b', null, t(MASTER21[cur].name)),
    h('span', { class: 'muted small' }, ' ', t(MASTER21[cur].desc), era ? ' ' + t(era) : ''),
  ));
  // (2) direção: faixa-título, single de trabalho, ordem, lado B
  if (so.length >= 2) {
    const songOpts = (empty: L) => [{ value: '', label: t(empty) }, ...so.map((x) => ({ value: x.id, label: `${x.title} (Q ${Math.round(x.q)} · ${t(l('gancho', 'hook'))} ${Math.round(songProfile(x).hook)})` }))];
    const lm = leadMult21(s, { type: p.type, songs: p.songIds, dir21: d } as Release);
    const sq = sequence18(s, p.songIds);
    const ord: OrderId = (['best', 'lead', 'title'] as OrderId[]).find((k) => orderFor(s, p, k).join() === p.songIds.join()) ?? 'current';
    const ordOpts: { value: OrderId; label: string }[] = [
      { value: 'current', label: t(l('Ordem atual', 'Current order')) },
      { value: 'best', label: t(fmtL(l('Sugerida (sequência {v})', 'Suggested (sequencing {v})'), { v: sequence18(s, orderFor(s, p, 'best')).v })) },
      ...(d.lead ? [{ value: 'lead' as OrderId, label: t(l('Single de trabalho abre', 'Lead single opens')) }] : []),
      ...(d.title ? [{ value: 'title' as OrderId, label: t(l('Faixa-título abre', 'Title track opens')) }] : []),
    ];
    const n = so.length;
    const sbOpts = [{ value: 0, label: t(l('Sem lado B', 'No side B')) }, ...so.slice(1).map((x, i) => ({ value: i + 1, label: t(fmtL(l('Lado B abre na faixa {n}: {t}', 'Side B opens at track {n}: {t}'), { n: i + 2, t: x.title })) }))];
    kids.push(h('div', { class: 'row wrap' },
      h('label', null, t(l('Faixa-título', 'Title track')), ' ', locked ? h('b', null, so.find((x) => x.id === d.title)?.title ?? '—') : select(d.title ?? '', songOpts(l('Sem faixa-título', 'No title track')), (v) => { d.title = v || undefined; if (v && !p.title) p.title = s.songs[v]?.title ?? p.title; rerender(); })),
      h('label', null, why18(s, 'dir21.lead', { ids: p.songIds.join(','), lead: d.lead ?? '' }, t(l('Single de trabalho', 'Lead single'))), ' ', locked ? h('b', null, so.find((x) => x.id === d.lead)?.title ?? '—') : select(d.lead ?? '', songOpts(l('Automático (primeira faixa)', 'Automatic (first track)')), (v) => { d.lead = v || undefined; rerender(); }),
        d.lead ? h('span', { class: `small ${lm.m > 1.005 ? 'good' : lm.m < 0.995 ? 'bad' : 'muted'}` }, ` ×${lm.m.toFixed(2)} ${t(l('nas 8 primeiras semanas', 'in the first 8 weeks'))}`) : null),
      n >= 3 ? h('label', null, why18(s, 'q18.seq', { ids: p.songIds.join(',') }, t(l('Ordem', 'Order')), ` (${sq.v})`), ' ', locked ? h('b', null, ordOpts.find((o) => o.value === ord)?.label ?? '—') : select(ord, ordOpts, (v) => { if (v !== 'current') { setProjectSongs(s, p, orderFor(s, p, v)); toast(t(l('Faixas reordenadas.', 'Tracks reordered.')), 'info'); } rerender(); })) : null,
      n >= 6 && vinylEra(s) ? h('label', null, t(l('Vinil', 'Vinyl')), ' ', locked ? h('b', null, d.sideB ? t(fmtL(l('lado B na faixa {n}', 'side B at track {n}'), { n: d.sideB + 1 })) : '—') : select(d.sideB ?? 0, sbOpts, (v) => { d.sideB = v || undefined; rerender(); })) : null,
    ));
    kids.push(h('p', { class: 'muted small' }, t(l('Single forte → mais unidades nas primeiras semanas; ordem ruim → coesão e crítica piores; faixa-título forte dá identidade; na era do vinil, o lado B precisa abrir com gancho.', 'Strong lead → more units in the first weeks; bad order → worse cohesion and reviews; strong title track gives identity; in the vinyl era side B must open with a hook.'))));
  }
  return h('fieldset', { class: 'art18-proj dir21' }, h('legend', null, t(l('Direção do disco', 'Record direction'))), ...kids);
});

/** Ficha do disco: a direção escolhida. */
RELEASE_EXTRAS.push((s: GameState, r: Release) => {
  const d = r.dir21;
  if (!d) return null;
  const m = d.master ?? defaultMaster21(r.year);
  const so = songsOf(s, r.songs);
  const bits: string[] = [t(MASTER21[m].name)];
  if (d.title) bits.push(t(l('faixa-título', 'title track')) + ': ' + (so.find((x) => x.id === d.title)?.title ?? '?'));
  if (d.lead) bits.push(t(l('single de trabalho', 'lead single')) + ': ' + (so.find((x) => x.id === d.lead)?.title ?? '?'));
  if (d.sideB) bits.push(t(fmtL(l('lado B na faixa {n}', 'side B at track {n}'), { n: d.sideB + 1 })));
  return h('p', { class: 'small dir21' }, why18(s, 'dir21.master', { master: m, year: r.year }, t(l('Direção', 'Direction'))), ': ', bits.join(' · '));
});

/** Finanças: previsão × realizado (vendas e turnês), com a faixa mostrada estreitada pela equipe. */
export function forecastView21(s: GameState): HTMLElement | null {
  const sl = biasLine21(s, 'sales'), tl = biasLine21(s, 'tour');
  if (!sl && !tl) return null;
  const line = (k: 'sales' | 'tour', txt: L) => {
    const b = forecastBias21(s, k);
    return h('li', { class: b.bias > 0.12 ? 'bad' : b.bias < -0.12 ? 'warn' : 'good' }, why18(s, 'dir21.fc', { k }, t(txt)), ' ', whyIcon(s, 'dir21.fc', { k }), h('span', { class: 'muted small' }, ' · ' + t(b.staff)));
  };
  return section(t(l('Previsão × realizado (12 meses)', 'Forecast × actual (12 months)')),
    h('ul', { class: 'dir21-fc' }, sl ? line('sales', sl) : null, tl ? line('tour', tl) : null),
    h('p', { class: 'muted small' }, t(l('O jogo compara a previsão de vendas (10 semanas) e de turnê (cachê + merch) com o resultado. Analista contratado corta pela metade a faixa de incerteza mostrada; A&R e assessoria, um quarto.', 'The game compares the sales (10 weeks) and tour (pay + merch) forecasts with the result. A hired analyst halves the uncertainty band shown; A&R and a publicist trim a quarter.'))));
}
registerSection('desk', { id: 'dir21fc', order: 33, render: (s: GameState) => forecastView21(s) });
