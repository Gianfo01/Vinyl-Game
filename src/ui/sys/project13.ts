// Projeto musical (rodada 13): mistura de conceitos, produtor, convidado, local, singles, edição,
// direção de arte, divisão da verba e polimento — com prévia de resultado e o porquê de cada número.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { availableProducers, producerFit, SIGNATURES } from '../../sim/studio';
import { featureCandidates, featureFee } from '../../sim/sys/creation/core';
import { CONCEPTS, conceptById, featOf, inviteGuest, type MusicProject } from '../../sim/sys/project8';
import {
  ARTS, DEFAULT13, EDITIONS, LOCS, SINGLES, blendHints, blendOf, block13, commit13, isOpen, normSplit, planOf13, preview13,
  type Art, type Choice13, type Edition, type Loc, type Single,
} from '../../sim/sys/project13';
import type { Deltas } from '../../sim/sys/music/state';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, N, kv, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { chips, ic } from '../vis';

const ui = { draft: null as null | (Choice13 & { pid: string }), newC2: '' };
const ATTR: Record<string, L> = { melody: l('melodia', 'melody'), lyrics: l('letra', 'lyrics'), originality: l('originalidade', 'originality'), performance: l('performance', 'performance'), production: l('produção', 'production') };
const fmtD = (d: Deltas) => Object.entries(d).filter(([, v]) => v).map(([k, v]) => `${t(ATTR[k])} ${v! > 0 ? '+' : ''}${v}`).join(', ');
const x = (v: number) => `×${v.toFixed(2)}`;

/** Segundo conceito na criação do disco (mistura). */
export function newBlendSelect(c1: string): HTMLElement {
  const b = blendOf(c1, ui.newC2);
  return h('span', { class: 'row wrap' },
    select(ui.newC2, [{ value: '', label: t(l('Sem mistura', 'No blend')) }, ...CONCEPTS.filter((c) => c.id !== c1).map((c) => { const k = blendOf(c1, c.id)!.k; return { value: c.id, label: `+ ${t(c.name)}${k === 'syn' ? ' ✓' : k === 'clash' ? ' ✗' : ''}` }; })], (v) => { ui.newC2 = v; rerender(); }, { 'aria-label': t(l('Misturar com', 'Blend with')) }),
    b ? pill(t(b.name), b.k === 'syn' ? 'good' : b.k === 'clash' ? 'bad' : '') : null);
}
/** Aplica a mistura escolhida na criação ao projeto novo. */
export function applyNewBlend(s: GameState, p: MusicProject): void {
  if (!ui.newC2 || ui.newC2 === p.concept) return;
  commit13(s, p, { ...DEFAULT13, c2: ui.newC2 });
  ui.newC2 = '';
}

function optSel<K extends string>(s: GameState, rec: Record<K, { name: L; fx: L; from: number; cost: number }>, val: K, set: (v: K) => void, mult: number, skip?: (k: K) => boolean) {
  return select(val, (Object.keys(rec) as K[]).filter((k) => isOpen(s, rec[k]) && !skip?.(k)).map((k) => ({ value: k, label: `${t(rec[k].name)}${rec[k].cost ? ` (${$(money(s, rec[k].cost * mult))})` : ''}` })), (v) => { set(v); rerender(); });
}

function range(label: L, val: number, set: (v: number) => void, note: string): HTMLElement {
  return h('label', null, `${t(label)}: ${val}%`, h('input', { type: 'range', min: 0, max: 100, step: 5, value: val, onchange: (e: Event) => { set(Number((e.target as HTMLInputElement).value)); rerender(); } }), h('small', { class: 'muted' }, note));
}

function previewBox(s: GameState, p: MusicProject, c: Choice13): HTMLElement {
  const pv = preview13(s, p, c);
  return h('div', { class: 'p12-problem', style: 'border-style:dashed' },
    h('h4', null, ic('sparkle'), ' ', t(l('Prévia do resultado', 'Outcome preview'))),
    h('div', { class: 'row wrap' },
      kv(t(l('Vendas esperadas', 'Expected sales')), `${N(pv.units.lo)} – ${N(pv.units.mid)} – ${N(pv.units.hi)}`),
      kv(t(l('Apelo das escolhas', 'Appeal from choices')), h('b', { class: pv.appeal > 1.01 ? 'good' : pv.appeal < 0.99 ? 'bad' : '' }, x(pv.appeal))),
      kv(t(l('Q estimada', 'Estimated Q')), `${pv.q} (${pv.dq >= 0 ? '+' : ''}${pv.dq})`),
      kv(t(l('Custo extra', 'Extra cost')), $(pv.cost)),
      kv('Hype', `${pv.hype > 0 ? '+' : ''}${pv.hype}`),
      kv(t(l('Colecionador', 'Collector')), `+${Math.max(0, pv.coll)}`),
      kv(t(l('Prazo', 'Deadline')), `${pv.weeks > 0 ? '+' : ''}${pv.weeks} ${t(l('sem.', 'wk'))}`)),
    h('p', { class: 'small' }, h('b', null, t(l('Por quê: ', 'Why: ')))),
    h('ul', { class: 'small' },
      pv.fx.map((f) => h('li', { class: f.risk ? '' : f.v > 1 ? 'good' : f.v < 1 ? 'bad' : '' }, t(f.t), ': ', f.risk ? t(l('entre {a} e {b} (risco)', 'between {a} and {b} (risk)'), { a: x(f.risk[0]), b: x(f.risk[1]) }) : `${t(l('apelo', 'appeal'))} ${x(f.v)}`)),
      pv.deltas.why.map((w) => h('li', null, t(w.t), ': ', fmtD(w.d), ' ', t(l('(nas faixas gravadas daqui em diante)', '(on tracks recorded from now on)'))))),
    h('p', { class: 'muted small' }, t(l('Faixa de vendas = previsão do mercado × fatores acima; os extremos incluem as apostas (capa provocativa, direção ousada). Produtor e convidado entram pelo estúdio e pelo dueto.', 'Sales range = market forecast × the factors above; extremes include gambles (provocative cover, bold direction). Producer and guest act through the studio and the duet.'))));
}

function crewBits(s: GameState, p: MusicProject, locked: boolean): HTMLElement {
  const act = s.acts[p.actId];
  const prods = availableProducers(s);
  const pr = prods.find((x) => x.id === p.producerId);
  const lead = s.songs[p.songIds[0]];
  const feat = lead ? featOf(s, lead.id) : undefined;
  const guests = lead && !locked && !feat ? featureCandidates(s, lead) : [];
  return h('div', { class: 'p12-grid' },
    h('label', null, t(l('Produtor', 'Producer')),
      select(p.producerId ?? '', [{ value: '', label: t(l('Equipe da casa', 'House team')) }, ...prods.map((x) => ({ value: x.id, label: `${x.name} · ${t(SIGNATURES[x.signature].name)} (${$(money(s, x.fee))}/${t(l('faixa', 'track'))})`, disabled: (s.producerBusy[x.id] ?? 0) > s.week }))], (v) => { p.producerId = v || undefined; rerender(); }, { disabled: locked }),
      h('small', { class: 'muted' }, pr ? t(l('Assinatura: produção {a}, performance {b}, originalidade {c}. {f}', 'Signature: production {a}, performance {b}, originality {c}. {f}'), { a: SIGNATURES[pr.signature].prod, b: SIGNATURES[pr.signature].perf, c: SIGNATURES[pr.signature].orig, f: act && producerFit(pr, act.genre) >= 1 ? t(l('Combina com o gênero.', 'Fits the genre.')) : t(l('Fora do gênero: rende 60%.', 'Outside the genre: 60% effect.')) }) : t(l('Sem produtor de fora: a equipe da casa assina as faixas.', 'No outside producer: the house team signs the tracks.')))),
    h('label', null, t(l('Convidado (dueto na faixa principal)', 'Guest (duet on the lead track)')),
      feat ? h('b', null, s.acts[feat]?.name ?? '—') : lead ? h('span', { class: 'row wrap' },
        select(p.guestId ?? '', [{ value: '', label: t(l('Sem convidado', 'No guest')) }, ...guests.map((g) => ({ value: g.id, label: `${g.name} (${$(featureFee(s, g))})` }))], (v) => { p.guestId = v || undefined; rerender(); }, { disabled: locked }),
        h('button', { class: 'btn small', disabled: !p.guestId || locked, onclick: () => { toast(t(inviteGuest(s, rngOf(s), p)), 'info'); rerender(); } }, t(l('Convidar', 'Invite')))) : h('small', { class: 'muted' }, t(l('Escolha as faixas primeiro.', 'Pick the tracks first.'))),
      h('small', { class: 'muted' }, t(l('Um nome conhecido empresta público e alcance; pode recusar se o seu artista for pequeno.', 'A known name lends audience and reach; may refuse if your act is small.')))));
}

/** Painel das escolhas da rodada 13 (dentro do projeto musical). */
export function p13Panel(s: GameState, p: MusicProject, locked: boolean): HTMLElement {
  const pl = planOf13(s, p);
  if (!ui.draft || ui.draft.pid !== p.id) ui.draft = { pid: p.id, ...(pl ? { c2: pl.c2, loc: pl.loc, single: pl.single, ed: pl.ed, art: pl.art, split: [...pl.split] as [number, number, number], polish: pl.polish } : { ...DEFAULT13, split: [...DEFAULT13.split] as [number, number, number] }) };
  const d = ui.draft;
  const mult = p.type === 'lp' ? 1 : p.type === 'ep' ? 0.7 : 0.4;
  const b = blendOf(p.concept, d.c2);
  const hints = blendHints(p.concept);
  const sp = normSplit(d.split);
  if (locked) {
    const c = pl ?? { ...DEFAULT13 };
    return section(t(l('Som, lançamento e embalagem', 'Sound, release and packaging')),
      chips(...[b ? pill(t(b.name), b.k === 'syn' ? 'good' : b.k === 'clash' ? 'bad' : '') : null, pill(t(LOCS[c.loc].name)), pill(t(SINGLES[c.single].name)), pill(t(EDITIONS[c.ed].name)), pill(t(ARTS[c.art].name)), pill(`${t(l('polimento', 'polish'))} ${c.polish}%`)].filter((z): z is HTMLElement => !!z)),
      crewBits(s, p, true), pl ? previewBox(s, p, pl) : null);
  }
  const err = block13(s, p, d);
  return section(`3. ${t(l('Conceito, equipe e lançamento', 'Concept, team and release'))}`,
    h('div', { class: 'p12-grid' },
      h('label', null, t(l('Misturar o conceito "{c}" com', 'Blend the "{c}" concept with'), { c: t(conceptById[p.concept]?.name ?? CONCEPTS[0].name) }),
        select(d.c2 ?? '', [{ value: '', label: t(l('Sem mistura', 'No blend')) }, ...CONCEPTS.filter((c) => c.id !== p.concept).map((c) => ({ value: c.id, label: t(c.name) }))], (v) => { d.c2 = v || undefined; rerender(); }),
        b ? h('small', { class: b.k === 'syn' ? 'good' : b.k === 'clash' ? 'bad' : 'muted' }, `${b.k === 'syn' ? t(l('Sinergia', 'Synergy')) : b.k === 'clash' ? t(l('Choque', 'Clash')) : t(l('Neutra', 'Neutral'))}: ${t(b.name)} — ${t(b.why)} (${t(l('apelo', 'appeal'))} ${x(b.appeal)}${Object.keys(b.d).length ? `; ${fmtD(b.d)}` : ''})`) : null,
        hints.length ? h('small', { class: 'muted' }, t(l('Combina: ', 'Works with: ')), hints.filter((z) => z.b.k === 'syn').map((z) => t(conceptById[z.c2].name)).join(', ') || '—', ' · ', t(l('Choca com: ', 'Clashes with: ')), hints.filter((z) => z.b.k === 'clash').map((z) => t(conceptById[z.c2].name)).join(', ') || '—') : null),
      h('label', null, t(l('Local de gravação', 'Recording location')), optSel(s, LOCS, d.loc, (v: Loc) => { d.loc = v; }, mult), h('small', { class: 'muted' }, t(LOCS[d.loc].fx))),
      h('label', null, t(l('Estratégia de singles', 'Single strategy')), optSel(s, SINGLES, d.single, (v: Single) => { d.single = v; }, mult, (k) => p.type === 'single' && k !== 'none' && k !== 'focus' && k !== 'surprise'), h('small', { class: 'muted' }, t(SINGLES[d.single].fx))),
      h('label', null, t(l('Edição', 'Edition')), optSel(s, EDITIONS, d.ed, (v: Edition) => { d.ed = v; }, mult, (k) => k === 'box' && p.type !== 'lp'), h('small', { class: 'muted' }, t(EDITIONS[d.ed].fx))),
      h('label', null, t(l('Direção de arte da capa', 'Cover art direction')), optSel(s, ARTS, d.art, (v: Art) => { d.art = v; }, mult), h('small', { class: 'muted' }, t(ARTS[d.art].fx)))),
    crewBits(s, p, false),
    h('h4', null, t(l('Divisão da verba e polimento', 'Budget split and polish'))),
    h('div', { class: 'p12-grid' },
      range(l('Gravação', 'Recording'), sp[0], (v) => { d.split = [v, sp[1], sp[2]]; d.split = normSplit(d.split); }, t(l('Acima de 50%: produção melhor nas faixas.', 'Above 50%: better production on the tracks.'))),
      range(l('Divulgação', 'Promotion'), sp[1], (v) => { d.split = [sp[0], v, sp[2]]; d.split = normSplit(d.split); }, t(l('Acima de 35%: mais apelo e hype; abaixo, menos.', 'Above 35%: more appeal and hype; below, less.'))),
      range(l('Embalagem', 'Packaging'), sp[2], (v) => { d.split = [sp[0], sp[1], v]; d.split = normSplit(d.split); }, t(l('30%+: valor de colecionador; ajuda o apelo físico.', '30%+: collector value; helps physical appeal.'))),
      range(l('Polimento (contra o prazo)', 'Polish (vs deadline)'), d.polish, (v) => { d.polish = v; }, t(l('Cada 10 pontos acima de 50 = +1 semana e mais produção; 75+ custa momento na espera. Abaixo de 25: som cru.', 'Every 10 points above 50 = +1 week and more production; 75+ costs momentum from the wait. Below 25: raw sound.')))),
    previewBox(s, p, d),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', disabled: !!err, title: err ? t(err) : undefined, onclick: () => { const e = commit13(s, p, d); toast(t(e ?? l('Escolhas assumidas.', 'Choices made.')), e ? 'bad' : 'good'); rerender(); } }, ic('contract'), ' ', t(pl ? l('Atualizar escolhas', 'Update choices') : l('Assumir escolhas', 'Make the choices'))),
      err ? h('small', { class: 'bad' }, t(err)) : null));
}
