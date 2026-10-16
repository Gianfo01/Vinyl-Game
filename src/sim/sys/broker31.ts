// R31 · onda 3 (U) — O INTERMEDIÁRIO das facções de fora. Plano: docs/r31/plano-pagina.md, "Facções de fora, pelo
// intermediário". Na sala VIP do aeroporto (no porto até 1919, no hotel até 1949) um intermediário mostra todas as
// facções do mundo por país e contrata qualquer serviço das que NÃO agem no seu país (fac31.present31):
//  • mais caro: o serviço da família (mob29.hireOdds29) + a taxa do intermediário + o custo de não ter operação no
//    país; o crime digital depois da internet não paga a taxa de país;
//  • mais lento: o serviço sai depois de um prazo (semanas, no calendário);
//  • mais chance de falha e menos controle: o intermediário pode não entregar e o serviço roda com menos chance;
//  • risco de traição: o intermediário pode vender você à polícia (caso, calor e fato secreto).
// Usar muito a mesma facção de fora a puxa para o seu país (fac31.pull31 → expansão anual).
// Opinião do intermediário e das facções: opinion.ts (chaves 'w:broker31' e 'w:f31:<id>'). O que se sabe de cada
// facção: know.ts (orgKnow31). Sorte: rng19 'broker31' (só gira quando o jogador contrata). Estado: x4.broker31.

import { clamp } from '../../core/rng';
import { countryName } from '../../data/geo';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { orgKnow31, type OrgKnow31 } from '../know';
import { cashWhy20, freeCash20 } from '../oblig20';
import { opinionRaw, putOpinion, shiftOpinion } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import { rng19 } from '../rng19';
import type { GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { addHeat, feedCase, heatIn, nameOf17, orgById, usd, type Org17 } from './crime17';
import { NET31, expandYear31, facOn31, facOpKey31, foreignOrgs31, home31, power31, present31, pull31, setOp31 } from './fac31';
import { BROKER31, hire29, hireOdds29, jobOf29 } from './mob29';

const N = (pt: string, en: string): L => l(pt, en);

export interface Deal31 { id: string; o: string; job: string; target: string; method?: string; cat?: string; w: number; due: number; cost: number; a3: string }
export interface Broker31State {
  deals: Deal31[]; seq: number;
  /** contratos entregues por facção (conhecimento grau 3) */
  done: Record<string, number>;
  /** facções com quem já tratou pelo intermediário (grau 2) */
  met: Record<string, 1>;
  log: [number, string, L][];
  /** multiplicador de preço (editor; 1 = normal) */
  k?: number;
}
declare module '../ext4' { interface Ext4 { broker31: Broker31State } }
const fresh = (): Broker31State => ({ deals: [], seq: 0, done: {}, met: {}, log: [] });
registerExt4('broker31', fresh);
export function broker31(s: GameState): Broker31State {
  const x = s.x4 as unknown as { broker31?: Broker31State };
  const st = (x.broker31 ??= fresh());
  st.deals ??= []; st.done ??= {}; st.met ??= {}; st.log ??= [];
  return st;
}
const peek = (s: GameState): Broker31State | undefined => (s.x4 as unknown as { broker31?: Broker31State }).broker31;
export const BROKER_KEY31 = 'w:broker31';
const logIt = (s: GameState, oid: string, text: L): void => { const st = broker31(s); st.log.push([s.week, oid, text]); if (st.log.length > 60) st.log.splice(0, st.log.length - 60); };

/** Onde o intermediário atende, pela época (porto → hotel → sala VIP do aeroporto). */
export function brokerPlace31(s: GameState): L {
  if (s.year < 1920) return N('no cais do porto', 'on the harbour quay');
  if (s.year < 1950) return N('no bar do hotel do centro', 'in the downtown hotel bar');
  return N('na sala VIP do aeroporto', 'in the airport VIP lounge');
}
const digital = (s: GameState, o: Org17): boolean => o.kind === 'cyber' && s.year >= NET31;

export interface Quote31 {
  block: L | null;
  /** total cobrado agora (centavos) e as partes */
  cost: number; fam: number; fee: number; country: number;
  /** chance de o intermediário entregar × chance do serviço */
  pDeliver: number; pJob: number; p: number;
  /** risco de exposição do serviço e de traição do intermediário */
  q: number; betray: number;
  /** prazo (semanas) */
  wLo: number; wHi: number;
  favor: number;
  know: OrgKnow31;
}
const zero = (block: L, know: OrgKnow31 = 0): Quote31 => ({ block, cost: 0, fam: 0, fee: 0, country: 0, pDeliver: 0, pJob: 0, p: 0, q: 0, betray: 0, wLo: 0, wHi: 0, favor: 0, know });

/** Conhecimento sobre a facção (know.ts), com o "é do seu país" e o "documentada" daqui. */
export const orgKnowOf31 = (s: GameState, o: Org17): OrgKnow31 => orgKnow31(s, o.id, { local: present31(s, o, home31(s)), real: o.real });

/** Cotação do serviço pela facção de fora: custo em partes, chances, risco de traição e prazo — com o motivo quando não dá. */
export function brokerQuote31(s: GameState, oid: string, job: string, target: string, method?: string, cat?: string): Quote31 {
  const o = orgById(s, oid);
  if (!o) return zero(N('Inválido.', 'Invalid.'));
  const know = orgKnowOf31(s, o);
  if (!facOn31(s)) return zero(N('Facções por país desligadas: as famílias atendem pela regra antiga.', 'Factions by country are off: families work under the old rule.'), know);
  const home = home31(s);
  if (present31(s, o, home)) return zero(N('Esta facção já age no seu país: trate direto com ela.', 'This faction already operates in your country: deal with it directly.'), know);
  if (opinionRaw(s, BROKER_KEY31) <= -60) return zero(N('O intermediário não atende mais você (traições e calotes).', 'The broker no longer takes your calls (betrayals and unpaid debts).'), know);
  if (peek(s)?.deals.some((d) => d.o === o.id)) return zero(N('Já há um contrato em andamento com esta facção.', 'There is already a contract under way with this faction.'), know);
  BROKER31.on = o.id;
  let od;
  try { od = hireOdds29(s, o.id, job, target, method, cat, { noCash: true }); } finally { BROKER31.on = false; }
  if (od.block) return zero(od.block, know);
  const P = power31(s, o);
  const dig = digital(s, o);
  const k = peek(s)?.k ?? 1;
  const fam = Math.round(od.cost * 1.25 * k);
  const fee = Math.round(money(s, 1500 + P * 20) * (dig ? 0.5 : 1) * k);
  const country = dig ? 0 : Math.round(money(s, 1000 + P * 15) * k);
  const cost = fam + fee + country;
  const op = opinionRaw(s, BROKER_KEY31);
  const pDeliver = clamp(0.9 - (know < 2 ? 0.05 : 0) + op / 1000, 0.6, 0.97);
  const pJob = clamp(od.p * 0.88, 0.03, 0.9);
  const betray = clamp(0.1 + heatIn(s, home) / 300 - op / 400 - know * 0.02 - (dig ? 0.04 : 0), 0.03, 0.4);
  const wLo = dig ? 1 : 2 + (s.year < 1950 ? 2 : 0), wHi = wLo + (dig ? 2 : 4);
  const block = freeCash20(s) < cost ? cashWhy20(s, cost, N('Caixa insuficiente.', 'Not enough cash.')) : null;
  return { block, cost, fam, fee, country, pDeliver, pJob, p: pDeliver * pJob, q: clamp(od.q + 0.05, 0, 0.95), betray, wLo, wHi, favor: od.favor, know };
}

/** Fecha o contrato: paga tudo agora; o serviço sai no prazo (ou não). */
export function brokerHire31(s: GameState, oid: string, job: string, target: string, method?: string, cat?: string): { ok: boolean; text: L } {
  const o = orgById(s, oid);
  const q = brokerQuote31(s, oid, job, target, method, cat);
  if (!o || q.block) return { ok: false, text: q.block ?? N('Inválido.', 'Invalid.') };
  const st = broker31(s);
  const r = rng19(s, 'broker31');
  const id = `bk${++st.seq}`;
  const due = s.week + r.int(q.wLo, q.wHi);
  post(s, `broker31:${id}`, -q.cost, 'legal', `Intermediário (${o.name.pt})`);
  st.deals.push({ id, o: o.id, job, target, method, cat, w: s.week, due, cost: q.cost, a3: home31(s) });
  st.met[o.id] = 1;
  pull31(s, o.id, home31(s));
  const jn = jobOf29(job, o)?.name ?? N('serviço', 'job');
  const text = fmtL(N('Contrato fechado {p}: {o} ({c}) fará "{j}" contra {t} em {a} a {b} semanas. Pago: {v}.', 'Deal struck {p}: {o} ({c}) will do "{j}" against {t} in {a} to {b} weeks. Paid: {v}.'),
    { p: brokerPlace31(s), o: o.name, c: countryName(o.a3), j: jn, t: nameOf17(s, target), a: q.wLo, b: q.wHi, v: usd(q.cost) });
  logIt(s, o.id, text);
  return { ok: true, text };
}

/** Resolve um contrato vencido: traição, falha do intermediário ou o serviço (com menos chance). */
function resolve31(s: GameState, d: Deal31): L {
  const st = broker31(s);
  const o = orgById(s, d.o);
  const r = rng19(s, 'broker31');
  if (!o) { post(s, `broker31r:${d.id}`, Math.round(d.cost * 0.5), 'legal', 'Intermediário: devolução'); return N('A facção sumiu; o intermediário devolve metade.', 'The faction vanished; the broker returns half.'); }
  const q = brokerQuote31(s, o.id, d.job, d.target, d.method, d.cat);
  const betray = q.block ? 0.1 : q.betray;
  if (r.chance(betray)) {
    feedCase(s, 'player', d.a3, 15, 40, true);
    addHeat(s, 'player', d.a3, 8);
    shiftOpinion(s, BROKER_KEY31, -25, { why: N('Ele vendeu você à polícia.', 'He sold you out to the police.') });
    emitFact(s, { kind: 'broker_betrayal', actors: ['player', o.key], severity: 45, visibility: 'secret', tags: ['crime', 'broker31'], src: 'broker31',
      text: fmtL(N('O intermediário vende à polícia o contrato de {c} com {o}.', 'The broker sells {c}\'s contract with {o} to the police.'), { c: s.config.companyName, o: o.name }) });
    notify(s, fmtL(N('Traição: o intermediário entregou seu contrato com {o} à polícia. O serviço não sai e o dinheiro sumiu.', 'Betrayal: the broker handed your contract with {o} to the police. The job is off and the money is gone.'), { o: o.name }), 'bad');
    return fmtL(N('Traído pelo intermediário (contrato com {o}).', 'Betrayed by the broker (contract with {o}).'), { o: o.name });
  }
  const pDel = q.block ? 0.85 : q.pDeliver;
  if (!r.chance(pDel)) {
    post(s, `broker31r:${d.id}`, Math.round(d.cost * 0.3), 'legal', 'Intermediário: devolução parcial');
    shiftOpinion(s, BROKER_KEY31, -3, { why: N('Não entregou um contrato.', 'Failed to deliver a contract.') });
    notify(s, fmtL(N('O intermediário não conseguiu acertar com {o}; devolve 30%.', 'The broker could not close it with {o}; 30% back.'), { o: o.name }), 'bad');
    return fmtL(N('Não entregue (devolução de 30%): {o}.', 'Not delivered (30% back): {o}.'), { o: o.name });
  }
  BROKER31.on = o.id;
  let res: { ok: boolean; text: L };
  try { res = hire29(s, o.id, d.job, d.target, d.method, d.cat, { prepaid: true }); } finally { BROKER31.on = false; }
  // a parte do "menos controle": o serviço sai, mas sem o acompanhamento de quem está no país
  const ok = res.ok && r.chance(0.92);
  st.done[o.id] = (st.done[o.id] ?? 0) + 1;
  shiftOpinion(s, BROKER_KEY31, 3, { why: N('Contrato entregue.', 'Contract delivered.') });
  shiftOpinion(s, facOpKey31(o.id), ok ? 3 : -2, { why: ok ? N('Pagou em dia pelo intermediário.', 'Paid on time through the broker.') : N('Serviço mal feito, cliente reclamou.', 'Botched job, the client complained.') });
  notify(s, fmtL(N('Intermediário: {t}', 'Broker: {t}'), { t: res.text }), ok ? 'info' : 'bad');
  return res.text;
}

registerSimHook('week', 'broker31', (s) => {
  const st = peek(s);
  if (!st?.deals.length) return;
  const due = st.deals.filter((d) => d.due <= s.week);
  if (!due.length) return;
  st.deals = st.deals.filter((d) => d.due > s.week);
  for (const d of due) logIt(s, d.o, resolve31(s, d));
});

/** Resolve todos os contratos agora (editor). */
export function resolveAll31(s: GameState): number {
  const st = broker31(s);
  const all = st.deals.splice(0);
  for (const d of all) logIt(s, d.o, resolve31(s, d));
  return all.length;
}

export const deals31 = (s: GameState): Deal31[] => peek(s)?.deals ?? [];
export const brokerLog31 = (s: GameState): [number, string, L][] => peek(s)?.log ?? [];

/** A vitrine do intermediário: facções de fora agrupadas por país (as digitais à parte), com o que se sabe de cada. */
export function brokerList31(s: GameState): { a3: string; name: L; orgs: { o: Org17; know: OrgKnow31 }[] }[] {
  const by = new Map<string, { o: Org17; know: OrgKnow31 }[]>();
  for (const o of foreignOrgs31(s)) {
    const g = o.kind === 'cyber' ? '*' : o.a3;
    if (!by.has(g)) by.set(g, []);
    by.get(g)!.push({ o, know: orgKnowOf31(s, o) });
  }
  return [...by.entries()].map(([a3, orgs]) => ({ a3, name: a3 === '*' ? N('Crime digital (sem fronteira)', 'Digital crime (no borders)') : countryName(a3), orgs: orgs.sort((x, y) => y.know - x.know || x.o.name.pt.localeCompare(y.o.name.pt)) }))
    .sort((a, b) => (a.a3 === '*' ? -1 : b.a3 === '*' ? 1 : a.name.pt.localeCompare(b.name.pt)));
}

registerDeadline('broker31', (s, from, to) => deals31(s).filter((d) => d.due >= from && d.due <= to).map((d) => ({
  id: `broker31:${d.id}`, w: d.due, kind: 'other' as const,
  t: fmtL(N('Intermediário: contrato com {o}', 'Broker: contract with {o}'), { o: orgById(s, d.o)?.name ?? l(d.o) }),
  d: N('Prazo do intermediário (o serviço sai ou não).', 'The broker\'s deadline (the job happens or not).'),
  tone: 'info' as const, goto: { area: 'crime', tab: ['crime17', 'broker'] as [string, string] },
})));


// ---------------------------------------------------------------- editor (regra 10)

registerEditable({
  id: 'u31.brokerK', area: 'world', kind: 'number', min: 0.5, max: 3, step: 0.1,
  label: N('Intermediário: multiplicador de preço', 'Broker: price multiplier'),
  help: N('1 = normal. Vale para as próximas cotações.', '1 = normal. Applies to the next quotes.'),
  get: (s) => peek(s)?.k ?? 1,
  set: (s, v) => { const n = clamp(Number(v), 0.5, 3); broker31(s).k = n === 1 ? undefined : Math.round(n * 10) / 10; },
  raw: true,
});
registerEditable({
  id: 'u31.brokerOp', area: 'world', kind: 'number', min: -100, max: 100, step: 5,
  label: N('Intermediário: opinião dele sobre você', 'Broker: his opinion of you'),
  get: (s) => Math.round(opinionRaw(s, BROKER_KEY31)),
  set: (s, v) => { putOpinion(s, BROKER_KEY31, clamp(Number(v), -100, 100), N('Ajustado no editor.', 'Set in the editor.')); },
});
registerRunnable({
  id: 'u31.expand', area: 'world', label: N('Facções: rodar a expansão do ano agora', 'Factions: run this year\'s expansion now'),
  when: (s) => facOn31(s),
  run: (s) => { expandYear31(s, true); return N('Expansão das facções rodada.', 'Faction expansion run.'); },
});
registerRunnable({
  id: 'u31.open', area: 'world', label: N('Facções: abrir operação no seu país', 'Factions: open an operation in your country'),
  when: (s) => facOn31(s),
  arg: { kind: 'select', label: N('Facção', 'Faction'), options: (s) => foreignOrgs31(s).filter((o) => o.kind !== 'cyber').map((o) => ({ value: o.id, label: fmtL(N('{o} ({c})', '{o} ({c})'), { o: o.name, c: countryName(o.a3) }) })) },
  run: (s, _t, arg) => { const o = orgById(s, String(arg ?? '')); if (!o) return { ok: false, text: N('Escolha uma facção.', 'Pick a faction.') }; setOp31(s, o.id, home31(s), 40); return fmtL(N('{o} agora opera no seu país.', '{o} now operates in your country.'), { o: o.name }); },
});
registerRunnable({
  id: 'u31.resolve', area: 'world', label: N('Intermediário: resolver os contratos agora', 'Broker: resolve the contracts now'),
  when: (s) => deals31(s).length > 0,
  run: (s) => fmtL(N('{n} contrato(s) resolvido(s).', '{n} contract(s) resolved.'), { n: resolveAll31(s) }),
});
