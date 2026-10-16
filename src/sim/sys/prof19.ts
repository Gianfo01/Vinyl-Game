// Rodada 19 (onda 5, B.4 — auditoria 8 §4): o Cockpit fala a língua de cada profissão. Provedores de
// "Hoje / Andamento / Ameaças" (saga18.registerCockpit18) para empresário, festival, editora, estúdio, mídia,
// artista e agência; e openConflicts19 (B.5) soma as crises de clientes e do festival no orçamento global.
import { ownFests } from './feststore';
import { l } from '../../data/world';
import { monthIndex } from '../capacity';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { a18, openOffers18 } from './artist18';
import { careers, isActive } from './careers12';
import { f12, muOf, proj12, stagesOf } from './fest12';
import { c12, mgr12 } from './manager12';
import { medOf } from './media12';
import { registerCockpit18, type Q18 } from './saga18';
import { prod, studioOf, studios } from './studio12';
import { pubOf } from './ventures12';
import { CRISIS_NAME, ventures } from './ventures9';

const MG = { area: 'management', tab: ['management9', 'roster'] as [string, string] };
const FE = { area: 'festivals', tab: ['festivals16', 'mine'] as [string, string] };
const mine = (s: GameState, k: string) => ventures(s).list.filter((v) => v.kind === k && (v.owner === 'label' || v.owner === 'personal'));

/** Empresário: crises abertas, rival rondando, mandatos vencendo em 8 semanas, problemas escondidos. */
export function managerQ19(s: GameState): { now: Q18[]; threats: Q18[]; works: Q18[] } {
  const now: Q18[] = [], threats: Q18[] = [], works: Q18[] = [];
  const cl = ventures(s).mg.clients;
  if (!cl.length) return { now, threats, works };
  for (const c of cl) {
    const a = s.acts[c.actId]; if (!a) continue;
    if (c.crisis) now.push({ tone: 'bad', t: fmtL(l('Crise com {a}: {k} — escolha como reagir.', 'Crisis with {a}: {k} — choose how to react.'), { a: a.name, k: CRISIS_NAME[c.crisis.k] }), goto: MG });
    const px = mgr12(s).c[c.actId]?.poach;
    if (px && px.until >= s.week) now.push({ tone: 'bad', t: fmtL(l('Um empresário rival corteja {a} ({p}% de comissão).', 'A rival manager is courting {a} ({p}% commission).'), { a: a.name, p: Math.round(px.rate * 100) }), goto: MG });
    const x = c12(s, c.actId), left = x.mandate.until - s.week;
    if (left > 0 && left <= 8) now.push({ tone: 'bad', t: fmtL(l('Mandato de {a} vence em {w} semanas (confiança {t}).', '{a}\'s mandate ends in {w} weeks (trust {t}).'), { a: a.name, w: left, t: Math.round(x.trust) }), goto: MG });
    if (x.hidden.length) threats.push({ tone: 'bad', t: fmtL(l('{n} problema(s) escondido(s) de {a}: se vazar, a confiança despenca.', '{n} hidden problem(s) from {a}: if it leaks, trust collapses.'), { n: x.hidden.length, a: a.name }), goto: MG });
    else if (x.trust < 35) threats.push({ tone: 'bad', t: fmtL(l('{a} confia pouco em você ({t}): risco de não renovar.', '{a} barely trusts you ({t}): renewal at risk.'), { a: a.name, t: Math.round(x.trust) }), goto: MG });
  }
  const sat = Math.round(cl.reduce((t, c) => t + c12(s, c.actId).trust, 0) / cl.length);
  works.push({ tone: sat >= 55 ? 'good' : 'bad', t: fmtL(l('Confiança média dos {n} cliente(s): {v}.', 'Average trust of {n} client(s): {v}.'), { n: cl.length, v: sat }), goto: MG });
  return { now, threats, works };
}

/** Festival: meses até a edição, sinal a pagar, vendas × meta do patrocinador, buracos no line-up. */
export function festivalQ19(s: GameState): { now: Q18[]; threats: Q18[]; works: Q18[] } {
  const now: Q18[] = [], threats: Q18[] = [], works: Q18[] = [];
  const mi = monthIndex(s);
  for (const f of ownFests(s)) {
    const x = f12(s, f), mu = muOf(s, f);
    works.push({ tone: 'info', t: fmtL(l('{f}: edição em {m} mês(es) — {v} ingressos vendidos.', '{f}: edition in {m} month(s) — {v} tickets sold.'), { f: f.name, m: Math.max(0, mu), v: Math.round(x.cyc.sold + x.cyc.early) }), goto: FE });
    const due = x.commits.filter((c) => !c.done && c.amt < 0 && c.due - mi <= 2);
    if (due.length) now.push({ tone: 'bad', t: fmtL(l('{f}: {n} pagamento(s) vencendo — {w}.', '{f}: {n} payment(s) due — {w}.'), { f: f.name, n: due.length, w: due[0].what }), goto: FE });
    const slots = stagesOf(f) * 4, deals = Object.values(x.deals);
    if (mu <= 4 && mu >= 0) {
      if (!deals.some((d) => d.time === 3)) now.push({ tone: 'bad', t: fmtL(l('{f}: ainda sem headliner a {m} mês(es) da edição.', '{f}: still no headliner {m} month(s) before the edition.'), { f: f.name, m: mu }), goto: FE });
      else if (deals.length < Math.ceil(slots * 0.6)) threats.push({ tone: 'bad', t: fmtL(l('{f}: line-up com {n} de {c} horários.', '{f}: line-up with {n} of {c} slots.'), { f: f.name, n: deals.length, c: slots }), goto: FE });
    }
    const tgt = Math.max(0, ...x.cyc.sponsors.map((p) => p.min));
    if (tgt > 0) {
      const p = proj12(s, f), sold = x.cyc.sold + x.cyc.early;
      if (Math.min(p.demand, p.cap) < tgt) threats.push({ tone: 'bad', t: fmtL(l('{f}: projeção {d} abaixo da meta do patrocinador ({m}); vendidos {v}.', '{f}: projection {d} below the sponsor target ({m}); sold {v}.'), { f: f.name, d: Math.round(Math.min(p.demand, p.cap)), m: tgt, v: Math.round(sold) }), goto: FE });
    }
  }
  return { now, threats, works };
}

function publisherQ19(s: GameState): Partial<{ now: Q18[]; threats: Q18[] }> {
  const now: Q18[] = [];
  for (const v of mine(s, 'publisher')) {
    const x = pubOf(s, v.id);
    const q = x.reqs.filter((r) => r.until - s.week <= 4).length + x.offers.filter((o) => o.until - s.week <= 4).length;
    if (q) now.push({ tone: 'bad', t: fmtL(l('{v}: {n} pedido(s)/proposta(s) de obra vencendo.', '{v}: {n} song request(s)/offer(s) expiring.'), { v: v.name, n: q }), goto: { area: 'publishing16' } });
  }
  return { now };
}
function studioQ19(s: GameState): Partial<{ now: Q18[]; threats: Q18[] }> {
  const now: Q18[] = [], threats: Q18[] = [];
  for (const v of studios(s)) {
    const x = studioOf(s, v), prop = x.jobs.filter((j) => j.state === 'proposal').length;
    if (prop) now.push({ tone: 'bad', t: fmtL(l('{v}: {n} pedido(s) de sessão esperando resposta.', '{v}: {n} session request(s) awaiting a reply.'), { v: v.name, n: prop }), goto: { area: 'studio12' } });
    const late = x.jobs.filter((j) => j.state === 'booked' && j.deadline - s.week <= 2 && j.left > 0).length;
    if (late) threats.push({ tone: 'bad', t: fmtL(l('{v}: {n} sessão(ões) perto do prazo.', '{v}: {n} session(s) near the deadline.'), { v: v.name, n: late }), goto: { area: 'studio12' } });
  }
  const P = prod(s);
  if (P.on && P.offers.length) now.push({ tone: 'info', t: fmtL(l('{n} convite(s) para produzir.', '{n} offer(s) to produce.'), { n: P.offers.length }), goto: { area: 'studio12' } });
  return { now, threats };
}
function mediaQ19(s: GameState): Partial<{ now: Q18[]; threats: Q18[] }> {
  const now: Q18[] = [], threats: Q18[] = [];
  for (const v of mine(s, 'media')) {
    const x = medOf(s, v.id);
    if (x.dil && x.dil.until >= s.week) now.push({ tone: 'bad', t: fmtL(l('{v}: um selo oferece verba para tocar {a} — decida.', '{v}: a label offers money to play {a} — decide.'), { v: v.name, a: s.acts[x.dil.actId]?.name ?? '?' }), goto: { area: 'outlets16' } });
    if (x.cred < 30) threats.push({ tone: 'bad', t: fmtL(l('{v}: credibilidade {c} — a audiência começa a duvidar.', '{v}: credibility {c} — the audience starts to doubt.'), { v: v.name, c: Math.round(x.cred) }), goto: { area: 'outlets16' } });
  }
  return { now, threats };
}
function artistQ19(s: GameState): Partial<{ now: Q18[]; threats: Q18[] }> {
  const now: Q18[] = [], threats: Q18[] = [];
  const o = openOffers18(s);
  if (o.length) now.push({ tone: 'info', t: fmtL(l('{n} proposta(s) de selo para a banda (a primeira vence em {w} sem.).', '{n} label offer(s) for the band (first expires in {w} wk).'), { n: o.length, w: Math.max(0, Math.min(...o.map((x) => x.until)) - s.week) }), goto: { area: 'artist18' } });
  const due = a18(s).stmts.filter((x) => x.st === 'due' && x.due < s.week).length;
  if (due) threats.push({ tone: 'bad', t: fmtL(l('{n} prestação(ões) de contas atrasada(s) pelo selo.', '{n} royalty statement(s) overdue from the label.'), { n: due }), goto: { area: 'artist18' } });
  return { now, threats };
}

registerCockpit18('manager', (s) => (isActive(s, 'manager') || ventures(s).mg.clients.length ? managerQ19(s) : {}));
registerCockpit18('festival', (s) => (ownFests(s).length ? festivalQ19(s) : {}));
registerCockpit18('publisher', publisherQ19);
registerCockpit18('studio', studioQ19);
registerCockpit18('media', mediaQ19);
registerCockpit18('musician', (s) => (isActive(s, 'musician') ? artistQ19(s) : {}));

/** Carreira principal (a primeira escolhida): define o bloco "humor" do Cockpit. */
export const mainCareer19 = (s: GameState): string => careers(s).active[0] ?? 'label';
