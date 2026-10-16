// R31 · onda 3 (U) — aba "Intermediário" do menu Crime: as facções de fora por país (só o que você sabe de cada uma,
// know.ts orgKnow31), a cotação com as partes do preço, chances, risco de traição e prazo, e os contratos em andamento.
// Só leitura até o clique em "Fechar contrato" (broker31.brokerHire31).

import { countryName } from '../../data/geo';
import { KIND_NAME, RACKET_NAME } from '../../data/orgs17';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { orgPowerBand31, orgSees31 } from '../../sim/know';
import { opinionRaw } from '../../sim/opinion';
import { BROKER_KEY31, brokerHire31, brokerList31, brokerLog31, brokerPlace31, brokerQuote31, deals31 } from '../../sim/sys/broker31';
import { crimeById, nameOf17, orgById, targetsFor, usd } from '../../sim/sys/crime17';
import { facLog31, facOn31, home31, localOrgs31, opsOf31, power31, wars31 } from '../../sim/sys/fac31';
import { jobTk29, jobsFor29 } from '../../sim/sys/mob29';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const P = (x: number): string => `${Math.round(x * 100)}%`;
const N = (pt: string, en: string): L => l(pt, en);
const FORM: { o?: string; job?: string; target?: string } = {};

/** Alvos possíveis do serviço (a mesma lista do formulário de crimes; serviços próprios do digital: seus artistas). */
function targets31(s: GameState, job: string, oid: string): { id: string; name: L }[] {
  const o = orgById(s, oid);
  const j = o ? jobsFor29(o).find((x) => x.id === job) : undefined;
  if (!j) return [];
  if (jobTk29(job) === 'own_act') return playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split').map((a) => ({ id: a!.id, name: l(a!.name) }));
  const d = crimeById(j.c);
  return d ? targetsFor(s, d, 40) : [];
}

function quoteBox(s: GameState, oid: string): HTMLElement {
  const o = orgById(s, oid)!;
  const jobs = jobsFor29(o);
  if (!FORM.job || !jobs.some((j) => j.id === FORM.job)) FORM.job = jobs[0]?.id;
  const ts = FORM.job ? targets31(s, FORM.job, oid) : [];
  if (!FORM.target || !ts.some((x) => x.id === FORM.target)) FORM.target = ts[0]?.id;
  const q = FORM.job && FORM.target ? brokerQuote31(s, oid, FORM.job, FORM.target) : null;
  return h('div', { class: 'card' },
    h('b', null, T(fmtL(N('Cotação com {o}', 'Quote with {o}'), { o: o.name }))),
    h('div', { class: 'row wrap' },
      select<string>(FORM.job ?? '', jobs.map((j) => ({ value: j.id, label: T(j.name) })), (v) => { FORM.job = v; FORM.target = undefined; rerender(); }),
      ts.length ? select<string>(FORM.target ?? '', ts.map((x) => ({ value: x.id, label: T(x.name) })), (v) => { FORM.target = v; rerender(); }) : h('span', { class: 'muted small' }, T(N('Sem alvo possível para este serviço.', 'No possible target for this job.')))),
    q ? h('div', { class: 'small' },
      q.block ? h('p', { class: 'bad' }, T(q.block)) : null,
      q.cost ? h('ul', null,
        h('li', null, `${T(N('Serviço da família (+25% de quem não está no país)', 'The family\'s job (+25% for not being in the country)'))}: ${T(usd(q.fam))}`),
        h('li', null, `${T(N('Taxa do intermediário', 'Broker\'s fee'))}: ${T(usd(q.fee))}`),
        h('li', null, `${T(N('Custo de não ter operação no país', 'Cost of having no operation in the country'))}: ${q.country ? T(usd(q.country)) : T(N('nenhum (crime digital)', 'none (digital crime)'))}`),
        h('li', null, h('b', null, `${T(N('Total agora', 'Total now'))}: ${T(usd(q.cost))}`)),
        h('li', null, `${T(N('Chance de sair', 'Chance it happens'))}: ${P(q.p)} (${T(N('intermediário entrega', 'broker delivers'))} ${P(q.pDeliver)} × ${T(N('serviço', 'job'))} ${P(q.pJob)})`),
        h('li', null, `${T(N('Risco de exposição', 'Exposure risk'))}: ${P(q.q)} · ${T(N('risco de traição do intermediário', 'risk the broker betrays you'))}: ${P(q.betray)}`),
        h('li', null, fmtTxt(N('Prazo: {a} a {b} semanas · você fica devendo um favor a eles', 'Deadline: {a} to {b} weeks · you will owe them a favor'), q.wLo, q.wHi)),
      ) : null,
      h('button', { class: 'btn small', disabled: !!q.block, onclick: () => { const r = brokerHire31(s, oid, FORM.job!, FORM.target!); toast(T(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, T(N('Fechar contrato', 'Strike the deal')))) : null);
}
const fmtTxt = (x: L, a: number, b: number): string => T(fmtL(x, { a, b }));

function orgRow(s: GameState, oid: string, know: 0 | 1 | 2 | 3): HTMLElement {
  const o = orgById(s, oid)!;
  const band = orgPowerBand31(s, o.id, power31(s, o), know);
  const ops = orgSees31(know, 'ops') ? Object.entries(opsOf31(s, o.id)).filter(([, v]) => v > 0).map(([a3, v]) => `${T(countryName(a3))} ${v}`) : [];
  const open = FORM.o === o.id;
  return h('div', { class: 'card' },
    h('div', { class: 'row wrap' }, h('b', null, T(o.name)), ' ',
      orgSees31(know, 'kind') ? pill(T(KIND_NAME[o.kind])) : pill(T(N('pouco se sabe', 'little is known'))),
      band ? pill(`${T(N('Poder', 'Power'))} ${band.exact ? band.mid : `${band.lo}–${band.hi}`}`) : null,
      know >= 2 ? pill(T(know >= 3 ? N('já trabalhou para você', 'has worked for you') : N('já tratou com você', 'has dealt with you')), 'good') : null),
    orgSees31(know, 'desc') ? h('p', { class: 'small' }, T(o.desc)) : h('p', { class: 'small muted' }, T(N('O intermediário só diz o nome e de onde são. Tratar com eles revela mais.', 'The broker only gives the name and where they are from. Dealing with them reveals more.'))),
    orgSees31(know, 'rackets') ? h('p', { class: 'small muted' }, `${T(N('Negócios', 'Rackets'))}: ${o.rackets.map((r) => T(RACKET_NAME[r])).join(' · ')}`) : null,
    ops.length ? h('p', { class: 'small muted' }, `${T(N('Operações fora', 'Operations abroad'))}: ${ops.join(' · ')}`) : null,
    h('button', { class: 'btn small ghost', onclick: () => { FORM.o = open ? undefined : o.id; FORM.job = undefined; FORM.target = undefined; rerender(); } }, T(open ? N('Fechar', 'Close') : N('Cotar um serviço', 'Get a quote'))),
    open ? quoteBox(s, o.id) : null);
}

/** Aba do intermediário. */
export function brokerTab31(s: GameState): HTMLElement {
  if (!facOn31(s)) return h('p', { class: 'muted small' }, T(N('Facções por país desligadas (interruptor no editor): as famílias atendem pela regra antiga.', 'Factions by country are off (switch in the editor): families work under the old rule.')));
  const home = home31(s);
  const deals = deals31(s);
  const op = Math.round(opinionRaw(s, BROKER_KEY31));
  const wars = wars31(s).slice(0, 8);
  return h('div', null,
    h('p', { class: 'small' }, T(fmtL(N('O intermediário atende {p}. Ele contrata facções que não agem em {c}: mais caro, mais lento, com mais chance de falha e de traição. Usar muito a mesma facção pode trazê-la para o seu país — e as locais não gostam.',
      'The broker receives you {p}. He hires factions that do not operate in {c}: dearer, slower, with more chance of failure and betrayal. Using the same faction a lot may bring it into your country — and the locals will not like it.'), { p: brokerPlace31(s), c: countryName(home) }))),
    h('p', { class: 'small muted' }, `${T(N('Facções do seu país', 'Factions in your country'))}: ${localOrgs31(s).map((o) => T(o.name)).join(' · ') || '—'} · ${T(N('Confiança do intermediário', 'Broker\'s trust'))}: ${op > 20 ? T(N('boa', 'good')) : op < -20 ? T(N('ruim', 'bad')) : T(N('neutra', 'neutral'))}`),
    deals.length ? section(T(N('Contratos em andamento', 'Contracts under way')), h('ul', { class: 'small' }, deals.map((d) => h('li', null,
      `${T(orgById(s, d.o)?.name ?? l(d.o))} → ${nameOf17(s, d.target)} · ${T(fmtL(N('sai em até {n} semana(s)', 'due within {n} week(s)'), { n: Math.max(1, d.due - s.week) }))} · ${T(usd(d.cost))}`)))) : null,
    wars.length ? section(T(N('Guerras entre facções', 'Wars between factions')), h('ul', { class: 'small' }, wars.map((w) => h('li', null, `${T(orgById(s, w.a)?.name ?? l(w.a))} × ${T(orgById(s, w.b)?.name ?? l(w.b))} `, pill(w.v >= 60 ? T(N('aberta', 'open')) : T(N('tensão', 'tension')), w.v >= 60 ? 'bad' : 'warn'))))) : null,
    ...brokerList31(s).map((g) => h('details', { class: 'small', open: g.orgs.some((x) => x.o.id === FORM.o) ? true : undefined },
      h('summary', null, `${T(g.name)} (${g.orgs.length})`),
      h('div', { class: 'cards' }, g.orgs.map((x) => orgRow(s, x.o.id, x.know))))),
    brokerLog31(s).length ? section(T(N('Histórico', 'History')), h('ul', { class: 'small' }, brokerLog31(s).slice(-10).reverse().map((x) => h('li', null, T(x[2]))))) : null,
    facLog31(s).length ? section(T(N('O submundo pelo mundo', 'The underworld around the world')), h('ul', { class: 'small' }, facLog31(s).slice(-10).reverse().map((x) => h('li', null, `${x[0]} · ${T(orgById(s, x[1])?.name ?? l(x[1]))}: ${T(x[2])}`)))) : null,
  );
}
