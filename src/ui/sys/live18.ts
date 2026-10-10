// Rodada 18 (live18) — interface: logística da turnê no planejador, post-mortem por show/turnê, políticas da estrada
// (bem-estar, exclusividade com o gigante, fornecedor de merch), festival (curadoria, vizinhos, experiência) e a aba
// Fãs no artista (motivos, lealdade × poder de compra × mobilização, facções, equipe de rua).
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { KIT0, type Kit18 } from '../../sim/tourhook18';
import type { TourEstimate, TourPlan } from '../../sim/tours';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import {
  FLY_FROM18, GIANT_FROM18, KIT_TXT18, band18, giant18, live18, setExcl18, setWell18, tourPMs18, wellCost18,
} from '../../sim/sys/live18';
import { FAC18, FAC_NAME18, MOT18, MOT_NAME18, TEAM_FROM18, fan18, factions18, fans18, pp18, relLoad18, setSupplier18, setTeam18, teamCost18 } from '../../sim/sys/fans18';
import { XP18, buyXp18, curation18, ff18, headDep18, xpCost18 } from '../../sim/sys/fest18';
import { liveOf } from '../../sim/sys/live/state';
import { $, N, actLink, cityName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerPageTab, registerSection } from '../registry';
import { why18 } from '../explain18';

const kitDraft: Kit18 = { ...KIT0 };
/** Kit atual do planejador (o painel de turnês junta ao plano). */
export const kitDraft18 = (): Kit18 => ({ ...kitDraft });

/** Formulário de logística dentro do planejador de turnê, com o custo de cada escolha. */
export function kitForm18(s: GameState, plan: TourPlan, est: TourEstimate | null): HTMLElement {
  const set = <K extends keyof Kit18>(k: K, v: Kit18[K]) => { kitDraft[k] = v; rerender(); };
  const opt = <V extends string | number>(o: Record<string, L> | L[], keys: V[]) => keys.map((k) => ({ value: k, label: t((o as Record<string, L>)[k as unknown as string]) }));
  const moves: Kit18['move'][] = s.year >= FLY_FROM18 ? ['van', 'bus', 'fly'] : ['van', 'bus'];
  const g = giant18(s);
  void plan;
  return h('div', null,
    h('h4', null, t(l('Logística da estrada', 'Road logistics'))),
    h('div', { class: 'form grid2' },
      h('label', null, t(l('Transporte', 'Transport')), select(kitDraft.move, opt(KIT_TXT18.move, moves), (v) => set('move', v))),
      h('label', null, t(l('Hospedagem', 'Lodging')), select(kitDraft.bed, opt(KIT_TXT18.bed, ['cheap', 'std', 'good'] as Kit18['bed'][]), (v) => set('bed', v))),
      h('label', null, t(l('Diárias', 'Per diems')), select(kitDraft.diem, opt(KIT_TXT18.diem, [0, 1, 2] as Kit18['diem'][]), (v) => set('diem', Number(v) as Kit18['diem']))),
      h('label', null, t(l('Equipamento', 'Gear')), select(kitDraft.gear, opt(KIT_TXT18.gear, ['own', 'rent'] as Kit18['gear'][]), (v) => set('gear', v))),
      h('label', null, t(l('Ensaio', 'Rehearsal')), select(kitDraft.reh, opt(KIT_TXT18.reh, [0, 1, 2] as Kit18['reh'][]), (v) => set('reh', Number(v) as Kit18['reh']))),
      h('label', null, t(l('Seguro', 'Insurance')), select(kitDraft.ins, opt(KIT_TXT18.ins, [0, 1] as Kit18['ins'][]), (v) => set('ins', Number(v) as Kit18['ins']))),
      h('label', null, t(l('Segurança do público', 'Crowd security')), select(kitDraft.sec, opt(KIT_TXT18.sec, [0, 1, 2] as Kit18['sec'][]), (v) => set('sec', Number(v) as Kit18['sec']))),
      s.year >= GIANT_FROM18 ? h('label', null, t(l('Promotor', 'Promoter')), select(kitDraft.prom, opt(KIT_TXT18.prom, ['local', 'giant'] as Kit18['prom'][]), (v) => set('prom', v))) : null,
    ),
    h('p', { class: 'small muted' }, t(l('Van e pousada barata economizam e cansam (mais brigas). Ensaio de produção deixa o show melhor e mais seguro. Seguro devolve parte da logística e do cachê quando acidente, clima, doença ou visto cancelam datas. Promotor local acerta na noite (e às vezes desconta "despesas"); o gigante garante mais, paga no mês seguinte e cobra taxas do fã.', 'Vans and cheap motels save money and wear people out (more fights). A production rehearsal makes the show better and safer. Insurance refunds part of logistics and fees when accidents, weather, illness or visas cancel dates. Local promoters settle on the night (and sometimes deduct "expenses"); the major guarantees more, pays the next month and charges fans fees.'))),
    g ? h('p', { class: 'small muted' }, t(l('Bilhetagem dominante na época: {g} (taxa ~{p}% ao fã).', 'Dominant ticketing in this era: {g} (~{p}% fan fee).'), { g: g.name, p: Math.round(g.fee * 100) })) : null,
    est ? h('p', { class: 'small' }, t(l('Avisos e custo da logística já estão na estimativa acima.', 'Warnings and logistics cost are already in the estimate above.'))) : null,
  );
}

// ------------------------------------------------------------------ post-mortem e políticas

function pmSection(s: GameState): HTMLElement | null {
  const list = tourPMs18(s).slice(0, 5);
  if (!list.length) return null;
  return section(t(l('Post-mortem das turnês', 'Tour post-mortems')), list.map((pm) => h('div', { class: 'tour' },
    h('header', null, h('b', null, pm.name), ' ', actLink(s, pm.act), ' ', pm.fin ? pill(t(pm.fin.verdict), pm.fin.label >= 0 ? 'good' : 'bad') : pill(t(l('em andamento', 'in progress')))),
    pm.fin ? h('ul', { class: 'small' }, pm.fin.why.map((w) => h('li', null, t(w)))) : null,
    pm.cost.length ? h('p', { class: 'small muted' }, t(l('Logística escolhida: ', 'Chosen logistics: ')), pm.cost.map(([n, v]) => `${t(n)} ${v >= 0 ? '+' : ''}${$(v)}`).join(' · ')) : null,
    h('div', { class: 'tour-stops' }, pm.shows.map((x, i) => h('span', { class: `stop ${x.st}` },
      h('b', null, cityName(x.c)),
      x.st === 'cancelled' ? h('small', null, t(l('cancelado', 'cancelled'))) : x.a ? why18(s, 'live18.show', { tour: pm.id, i }, h('small', null, `${N(x.a)} / ${N(x.e)} ${t(l('prev.', 'fcst'))}`)) : h('small', null, `${N(x.e)} ${t(l('prev.', 'fcst'))}`)))),
  )));
}

function policySection(s: GameState): HTMLElement {
  const v = live18(s), f = fans18(s), g = giant18(s);
  return section(t(l('Políticas da estrada', 'Road policies')),
    h('div', { class: 'row wrap' },
      h('label', null, h('input', { type: 'checkbox', checked: v.well, onchange: (e: Event) => { setWell18(s, (e.target as HTMLInputElement).checked); rerender(); } }), ' ',
        t(l('Programa de bem-estar ({c}/mês): terapia e limites de agenda — menos estresse, risco e brigas; confiança sobe.', 'Wellness programme ({c}/mo): therapy and schedule limits — less stress, risk and fights; trust rises.'), { c: $(wellCost18(s)) })),
    ),
    s.year >= GIANT_FROM18 ? h('div', { class: 'row wrap' },
      h('label', null, h('input', { type: 'checkbox', checked: !!v.excl, onchange: (e: Event) => { const r = setExcl18(s, (e.target as HTMLInputElement).checked); if (r) toast(t(r), 'bad'); rerender(); } }), ' ',
        t(l('Exclusividade com {g}: garantias +15% e bônus anual por artista (fama 30+); promotores locais esfriam; risco de escândalo de taxas/antitruste.', 'Exclusive with {g}: guarantees +15% and a yearly bonus per act (fame 30+); local promoters cool; fee/antitrust scandal risk.'), { g: g?.name ?? '' }))) : null,
    h('div', { class: 'row wrap' }, h('span', null, t(l('Fornecedor de merch: ', 'Merch supplier: '))),
      select(f.sup, [{ value: 'fair' as const, label: t(l('Justo (padrão)', 'Fair (default)')) }, { value: 'cheap' as const, label: t(l('Barato: +12% de margem, risco de denúncia de trabalho precário', 'Cheap: +12% margin, sweatshop exposé risk')) }], (x) => { setSupplier18(s, x); rerender(); })),
    h('p', { class: 'small muted' }, t(l('Incidentes de público nos últimos 3 anos: {n} (encarecem o seguro).', 'Crowd incidents in the last 3 years: {n} (raise insurance premiums).'), { n: v.inc.filter((x) => x.y >= s.year - 3).length })),
    v.log.length ? h('ul', { class: 'small' }, v.log.slice(0, 5).map((x) => h('li', null, `${x.y}: `, t(x.t)))) : null,
  );
}

function festSection(s: GameState): HTMLElement | null {
  const fs = liveOf(s).fests;
  if (!fs.length) return null;
  return section(t(l('Festival: curadoria, vizinhos e experiência', 'Festival: curation, neighbours and experience')), fs.map((f) => {
    const F = ff18(s, f), d = headDep18(s, f);
    return h('div', { class: 'tour' },
      h('header', null, h('b', null, f.name), ' ', pill(t(l('Curadoria {c}', 'Curation {c}'), { c: curation18(s, f) })), pill(t(l('Vizinhos {n}/100', 'Neighbours {n}/100'), { n: F.neigh }), F.neigh < 45 ? 'bad' : ''), pill(t(l('Licença {p}', 'Permit {p}'), { p: N(F.permit) }))),
      f.lineup.length ? h('p', { class: `small ${d.share >= 0.55 ? 'warn' : 'muted'}` }, t(l('Dependência do headliner: ~{p}% da procura vem de {a}.', 'Headliner dependence: ~{p}% of demand comes from {a}.'), { p: Math.round(d.share * 100), a: d.name })) : null,
      h('div', { class: 'row wrap' }, XP18.map((x, i) => h('button', { class: 'btn small', title: t(x.desc), disabled: F.xp[i] >= 2, onclick: () => { const r = buyXp18(s, f.id, i); toast(t(r ?? l('Investimento feito: vale a partir do próximo ciclo.', 'Investment made: applies from the next cycle.')), r ? 'bad' : 'good'); rerender(); } },
        `${t(x.name)} ${F.xp[i]}/2`, F.xp[i] < 2 ? ` (${$(xpCost18(s, f, F.xp[i] + 1))})` : ''))),
      h('p', { class: 'small muted' }, t(l('Curadoria alta: artistas aceitam cachê menor pela vitrine, e o público compra pelo festival. Crescer sem circulação aumenta o risco; licença abaixo da capacidade vira conflito com a prefeitura.', 'High curation: acts accept lower fees for the showcase, and people buy for the festival. Growing without circulation raises risk; a permit below capacity means trouble with city hall.'))),
    );
  }));
}

registerSection('shows', { id: 'live18-pm', order: 22, render: (s) => pmSection(s) });
registerSection('shows', { id: 'live18-pol', order: 23, render: (s) => policySection(s) });
registerSection('shows', { id: 'live18-fest', order: 41, render: (s) => festSection(s) });

// ------------------------------------------------------------------ aba Fãs no artista

registerPageTab('act', {
  id: 'fans18', label: l('Fãs', 'Fans'), icon: 'fans', order: 46,
  when: (s, id) => !!s.acts[id],
  render: (s, id) => {
    const a = s.acts[id];
    const f = fan18(s, id, false);
    if (!a || !f) return null;
    const fac = factions18(s, a, f);
    const mineA = playerActs(s).includes(id);
    const load = relLoad18(s, id);
    const b = band18(s, id);
    return h('div', null,
      h('div', { class: 'row wrap' },
        why18(s, 'fans18.loy', { act: id }, pill(t(l('Lealdade {v}', 'Loyalty {v}'), { v: Math.round(f.loy) }))),
        why18(s, 'fans18.pp', { act: id }, pill(t(l('Poder de compra ×{v}', 'Purchasing power ×{v}'), { v: pp18(s, a).toFixed(2) }))),
        pill(t(l('Mobilização {v}', 'Mobilisation {v}'), { v: Math.round(f.mob) })),
        pill(t(l('Lançamentos 12m: {n} (aguenta ~{t})', 'Releases 12m: {n} (tolerates ~{t})'), { n: load.n, t: load.th }), f.fat >= 20 ? 'bad' : ''),
        mineA ? why18(s, 'live18.band', { act: id }, pill(t(l('Estrada: show {t}, entrosamento {c}', 'Road: tightness {t}, chemistry {c}'), { t: Math.round(b.tight), c: Math.round(b.chem) }))) : null,
      ),
      h('h4', null, t(l('Por que ouvem', 'Why they listen'))),
      h('div', null, MOT18.map((k, i) => h('div', { class: 'row' }, h('span', { style: 'min-width:11em' }, t(MOT_NAME18[k])), bar(f.m[i] * 100), h('small', null, `${Math.round(f.m[i] * 100)}%`)))),
      h('h4', null, t(l('Facções', 'Factions'))),
      h('div', null, FAC18.map((k, i) => h('div', { class: 'row', title: t(FAC_NAME18[k].desc) }, h('span', { style: 'min-width:11em' }, t(FAC_NAME18[k].name)), bar(fac[k] * 100), h('small', { class: f.fac[i] < -15 ? 'bad' : f.fac[i] > 15 ? 'good' : 'muted' }, `${Math.round(fac[k] * 100)}% · ${t(l('humor', 'mood'))} ${Math.round(f.fac[i])}`)))),
      f.dr.length ? h('ul', { class: 'small' }, f.dr.map((d) => h('li', null, t(d.why), ` — ${d.n} ${t(l('meses restantes', 'months left'))}`))) : null,
      mineA && s.year >= TEAM_FROM18 ? h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: !!f.team, onchange: (e: Event) => { const r = setTeam18(s, id, (e.target as HTMLInputElement).checked); if (r) toast(t(r), 'bad'); rerender(); } }), ' ',
        t(l('Equipe de rua ({c}/mês): mobilização sobe, +8% de público no mercado de origem, barulho na estreia; às vezes exagera.', 'Street team ({c}/mo): mobilisation rises, +8% draw in the home market, release-day noise; sometimes overdoes it.'), { c: $(teamCost18(s)) })) : null,
      h('p', { class: 'small muted' }, t(l('Lealdade segura o núcleo quando o artista muda; poder de compra decide ingresso caro, merch e edição de luxo; mobilização faz barulho na estreia e nas votações. Virada comercial, preço, parcerias e excesso de lançamentos mexem nisso aos poucos.', 'Loyalty holds the core when the act changes; purchasing power decides pricey tickets, merch and deluxe editions; mobilisation makes noise on release day and in votes. Commercial turns, pricing, collabs and too many releases shift these gradually.'))),
      fans18(s).log.length ? h('ul', { class: 'small' }, fans18(s).log.filter((x) => t(x[2]).includes(a.name)).slice(0, 5).map((x) => h('li', null, `${x[0]}: `, t(x[2])))) : null,
    );
  },
});
