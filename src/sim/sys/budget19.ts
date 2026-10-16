// Rodada 19 (onda 5, B.5 — auditoria 8 §5): camadas de prioridade.
// - Orçamento GLOBAL de conflitos abertos (decisões na mesa + fios do Mestre seus + rixas suas + ecos ruins chegando +
//   crises de clientes do empresário + apertos do festival). Narrador, situações e Mestre leem conflicts19.CONFLICTS19.
// - (r31 UNI-1: o corte de avisos de pouco valor saiu daqui — orçamento único em sim/attention.ts.)
// - autoResolve19: quais cartões vão valer o padrão ao avançar (o diálogo da UI lista e pergunta).
// - Delegação por carreira: renovação de mandato, patrocínio e headliner do festival, sessões do estúdio (r31 Q:
//   configuradas na delegação única, sim/deleg31.ts). A regra age sozinha e só sobe exceções (fato `deleg_exc` → Caixa).
import { ownFests } from './feststore';
import { l, type L } from '../../data/world';
import { CONFLICTS19 } from '../conflicts19';
import { registerExplain, type WhyPart } from '../explain18';
import { registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18 } from '../inbox18';
import { rng19 } from '../rng19';
import type { Decision, GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { careers } from './careers12';
import { pending18 } from './decide18';
import { dm18 } from './dm18';
import { activeFeuds18 } from './feud18';
import { ask12, f12, muOf, offer12, proj12, takeSponsor12 } from './fest12';
import { c12, negotiateMandate } from './manager12';
import { dirOf31, exc31, logAuto31, modeOf31, rule31, type Resp31 } from '../deleg31';
import { festivalQ19, managerQ19 } from './prof19';
import { registerCockpit18 } from './saga18';
import { acceptJob, studioOf, studios } from './studio12';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- orçamento de conflitos

export interface Conf19 { n: number; cap: number; parts: [L, number][] }
const memo = new WeakMap<GameState, { k: string; v: Conf19 }>();
export function conflicts19(s: GameState): Conf19 {
  const mg = ventures(s).mg.clients;
  const k = `${s.week}|${s.decisions.length}|${mg.length}|${mg.filter((c) => c.crisis).length}|${ownFests(s).length}|${dm18(s).th.length}|${activeFeuds18(s).length}`;
  const c = memo.get(s);
  if (c && c.k === k) return c.v;
  const mine = new Set(playerActs(s));
  const parts: [L, number][] = [];
  const add = (t: L, v: number) => { if (v > 0) parts.push([t, Math.round(v * 10) / 10]); };
  add(l('Decisões na mesa', 'Decisions on the desk'), s.decisions.length);
  add(l('Fios do Mestre com você', 'DM threads involving you'), dm18(s).th.filter((t) => !t.done && t.mine).length);
  add(l('Rixas dos seus artistas', 'Your acts\' feuds'), activeFeuds18(s).filter((f) => mine.has(f.a) || mine.has(f.b)).length);
  add(l('Consequências ruins chegando (½ cada)', 'Bad consequences coming (½ each)'), pending18(s).filter((x) => x.tone === 'bad' && x.from - s.week <= 8).length * 0.5);
  if (mg.length) { const q = managerQ19(s); add(l('Crises e mandatos de clientes', 'Client crises and mandates'), q.now.length + q.threats.length * 0.5); }
  if (ownFests(s).length) { const q = festivalQ19(s); add(l('Apertos do festival', 'Festival squeezes'), q.now.length + q.threats.length * 0.5); }
  const extra = Math.max(0, careers(s).active.length - 1);
  const v: Conf19 = { n: parts.reduce((t, p) => t + p[1], 0), cap: 8 + Math.min(2, extra), parts };
  memo.set(s, { k, v });
  return v;
}
CONFLICTS19.n = (s) => conflicts19(s).n;
CONFLICTS19.cap = (s) => conflicts19(s).cap;

registerExplain('bud19.conf', (s) => {
  const c = conflicts19(s);
  const parts: WhyPart[] = c.parts.map(([label, value]) => ({ label, value, fmt: 'num' }));
  parts.push({ label: fmtL(l('Teto: 8 + 1 por carreira extra (até +2) = {c}', 'Cap: 8 + 1 per extra career (up to +2) = {c}'), { c: c.cap }), value: c.cap, fmt: 'num' });
  return { title: l('Conflitos abertos', 'Open conflicts'), value: c.n, fmt: 'num', parts, note: l('Com o teto atingido, o narrador, as situações e o Mestre não abrem crises novas com você — só entre NPCs — até algo se resolver.', 'At the cap, the storyteller, situations and the DM open no new crises with you — only among NPCs — until something resolves.') };
});
registerCockpit18('budget19', (s) => {
  const c = conflicts19(s);
  if (c.n < c.cap * 0.75) return {};
  return { threats: [{ tone: c.n >= c.cap ? 'bad' : 'info', t: fmtL(c.n >= c.cap ? l('Conflitos abertos {n}/{c}: o diretor segura crises novas até você resolver alguma.', 'Open conflicts {n}/{c}: the director holds new crises until you resolve some.') : l('Conflitos abertos {n}/{c}: perto do teto.', 'Open conflicts {n}/{c}: near the cap.'), { n: Math.round(c.n * 10) / 10, c: c.cap }), goto: { area: 'cockpit' } }] };
});

// r31 (UNI-1): o corte de avisos de pouco valor (NOTIFY19, cota de 8/mês e "Resumo do mês") saiu daqui — agora é o
// orçamento único da fila de atenção (sim/attention.ts), e os agrupados viram o boletim da semana.

// ---------------------------------------------------------------- avançar: o que vai valer o padrão

export interface Auto19 { id: string; title: L; def: L; why: L }
export function autoResolve19(s: GameState, mode: 'week' | 'month' | 'quarter' | 'event' | 'until'): Auto19[] {
  const horizon = mode === 'week' ? 1 : mode === 'month' ? 5 : 999;
  const all = mode !== 'week' && (!s.clock.opened || mode !== 'month');
  const out: Auto19[] = [];
  for (const d of s.decisions as Decision[]) {
    const dl = Number(d.ctx.dl18 ?? 0);
    const due = dl && dl <= s.week + horizon;
    if (!all && !due) continue;
    const o = d.options.find((x) => x.id === d.defaultOption);
    out.push({ id: d.id, title: d.title, def: o?.label ?? l('padrão', 'default'), why: due ? fmtL(l('prazo na semana {w}', 'deadline in week {w}'), { w: dl }) : l('fica sem resposta no virar do mês', 'left unanswered at month turn') });
  }
  return out;
}

// ---------------------------------------------------------------- delegação por carreira
// r31 (Q): o estado (`bud19.dlg`: mg/fsp/fhead/st, confiança mínima, teto, contadores) virou as responsabilidades
// "Mandatos de empresariado", "Festival próprio" e "Estúdio próprio" da delegação única (sim/deleg31.ts). Este trecho
// é o executor; o que a regra fez e as exceções vão para o registro de automação.

const DLG_R: Record<'mg' | 'fest' | 'studio', Resp31> = { mg: 'mandates', fest: 'fest', studio: 'studio' };
function exc19(s: GameState, k: 'mg' | 'fest' | 'studio', t: L, act?: string): void {
  if (!exc31(s, DLG_R[k], k, t, act, undefined, true)) return;
  emitFact(s, { kind: 'deleg_exc', actors: ['player', ...(act ? [act] : [])], text: t, visibility: 'secret', data: { k } });
}
onFact('deleg_exc', (s, f) => {
  pushInbox18(s, 'deleg31', { from: 'staff', subject: l('A equipe precisa de você', 'Staff needs you'), body: f.text, tone: 'bad', ref: { acts: f.actors.filter((x) => x !== 'player').join(',') } });
}, 'budget19:deleg');
const did = (s: GameState, r: Resp31, t: L, act?: string, amt?: number) => logAuto31(s, { r, who: 'rule', t, tone: 'good', act, amt });

export function delegateMonth(s: GameState): void {
  if (modeOf31(s, 'mandates') === 'rule') {
    const r = rng19(s, 'dlg19'), minTrust = rule31(s, 'mandates', 'minTrust');
    for (const c of ventures(s).mg.clients) {
      const a = s.acts[c.actId], x = c12(s, c.actId), left = x.mandate.until - s.week;
      if (!a || left <= 0 || left > 8) continue;
      if (x.trust < minTrust) { exc19(s, 'mg', fmtL(l('Mandato de {a} vence em {w} semanas e a confiança ({t}) está abaixo do mínimo ({m}): renovar é com você.', '{a}\'s mandate ends in {w} weeks and trust ({t}) is below the minimum ({m}): renewing is up to you.'), { a: a.name, w: left, t: Math.round(x.trust), m: minTrust }), a.id); continue; }
      const m = { areas: x.mandate.areas, rate: x.mandate.rate, excl: x.mandate.excl, auto: x.mandate.auto };
      const res = negotiateMandate(s, r, a.id, m);
      if (res.ok) did(s, 'mandates', fmtL(l('Mandato de {a} renovado nos mesmos termos (confiança {t}). {w}', '{a}\'s mandate renewed on the same terms (trust {t}). {w}'), { a: a.name, t: Math.round(x.trust), w: res.text }), a.id);
      else if (!/há pouco|recently/.test(res.text.pt)) exc19(s, 'mg', fmtL(l('A equipe tentou renovar o mandato de {a} nos mesmos termos e ouviu não: {w}', 'Staff tried to renew {a}\'s mandate on the same terms and got a no: {w}'), { a: a.name, w: res.text }), a.id);
    }
  }
  const fest = modeOf31(s, 'fest') === 'rule' ? dirOf31(s, 'fest') : null;
  if (fest) for (const f of ownFests(s)) {
    const x = f12(s, f), mu = muOf(s, f), fcap = fest.frac ?? 0.25;
    if (fest.sponsor) for (const o of [...x.cyc.offers]) {
      const p = proj12(s, f), safe = Math.min(p.demand, p.cap) * 0.9;
      if (o.min <= safe) { if (!takeSponsor12(s, f.id, o.id, true)) did(s, 'fest', fmtL(l('{f}: patrocínio de {n} aceito (meta de {m} pessoas cabe em 90% da projeção, {p}).', '{f}: {n}\'s sponsorship accepted (the {m}-people target fits 90% of the projection, {p}).'), { f: f.name, n: o.name, m: o.min, p: Math.round(safe) })); }
      else exc19(s, 'fest', fmtL(l('{f}: patrocínio de {n} pede {m} pessoas — acima do que a equipe acha seguro (90% da projeção: {p}).', '{f}: {n}\'s sponsorship requires {m} people — above what staff deems safe (90% of projection: {p}).'), { f: f.name, n: o.name, m: o.min, p: Math.round(safe) }));
    }
    if (fest.head && mu >= 0 && mu <= 5 && !Object.values(x.deals).some((d) => d.time === 3)) {
      const cash = Math.max(0, s.player.cash);
      const cands = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length && !x.deals[a.id]).sort((a, b) => b.fame - a.fame).slice(0, 30);
      let ok = false;
      for (const a of cands) {
        const k = ask12(s, f, a, { time: 3, len: 60, excl: false });
        if (k.refuse || k.fee * 0.3 > cash * fcap) continue;
        if (offer12(s, f.id, a.id, { stage: 0, time: 3, len: 60, excl: false, fee: k.fee }).res === 'yes') {
          ok = true;
          did(s, 'fest', fmtL(l('{f}: {a} fechado como headliner (fama {m}); o adiantamento cabe em {p}% do caixa.', '{f}: {a} booked as headliner (fame {m}); the advance fits {p}% of cash.'), { f: f.name, a: a.name, m: Math.round(a.fame), p: Math.round(fcap * 100) }), a.id, -Math.round(k.fee * 0.3));
          break;
        }
      }
      if (!ok && mu <= 3) exc19(s, 'fest', fmtL(l('{f}: a {m} mês(es) da edição, a equipe não achou headliner dentro do teto ({p}% do caixa no adiantamento).', '{f}: {m} month(s) out, staff found no headliner within the cap ({p}% of cash on the advance).'), { f: f.name, m: mu, p: Math.round(fcap * 100) }));
    }
  }
  if (modeOf31(s, 'studio') === 'rule') for (const v of studios(s)) {
    const sx = studioOf(s, v);
    for (const j of sx.jobs.filter((y) => y.state === 'proposal')) {
      const eng = sx.engs.find((e) => !sx.jobs.some((y) => y.state === 'booked' && y.eng === e.id));
      const room = sx.rooms.find((rm) => !sx.jobs.some((y) => y.state === 'booked' && y.room === rm.id));
      if (eng && room && !acceptJob(s, v.id, j.id, eng.id, room.id)) did(s, 'studio', fmtL(l('{v}: sessão de {c} aceita (sala e engenheiro livres).', '{v}: session from {c} accepted (free room and engineer).'), { v: v.name, c: j.client }));
      else { exc19(s, 'studio', fmtL(l('{v}: pedido de sessão de {c} sem sala ou engenheiro livre.', '{v}: session request from {c} with no free room or engineer.'), { v: v.name, c: j.client })); break; }
    }
  }
}
registerSimHook('month', 'budget19:dlg', delegateMonth);
