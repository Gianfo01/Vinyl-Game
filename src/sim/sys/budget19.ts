// Rodada 19 (onda 5, B.5 — auditoria 8 §5): camadas de prioridade.
// - Orçamento GLOBAL de conflitos abertos (decisões na mesa + fios do Mestre seus + rixas suas + ecos ruins chegando +
//   crises de clientes do empresário + apertos do festival). Narrador, situações e Mestre leem conflicts19.CONFLICTS19.
// - Avisos de pouco valor (rotina, info/bom além da cota do mês) vão para um único "Resumo do mês".
// - autoResolve19: quais cartões vão valer o padrão ao avançar (o diálogo da UI lista e pergunta).
// - Delegação por carreira (estende policy18): renovação de mandato, patrocínio e headliner do festival, sessões do
//   estúdio. A equipe age sozinha e só sobe exceções (fato `deleg_exc` → Caixa + exceções da política).
import { l, type L } from '../../data/world';
import { CONFLICTS19 } from '../conflicts19';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Decision, GameState } from '../types';
import { fmtL, NOTIFY19, playerActs, rngOf } from '../util';
import { careers } from './careers12';
import { pending18 } from './decide18';
import { dm18 } from './dm18';
import { activeFeuds18 } from './feud18';
import { ask12, f12, muOf, offer12, proj12, takeSponsor12 } from './fest12';
import { liveOf } from './live';
import { c12, negotiateMandate } from './manager12';
import { pol18 } from './policy18';
import { festivalQ19, managerQ19 } from './prof19';
import { registerCockpit18 } from './saga18';
import { acceptJob, studioOf, studios } from './studio12';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- estado

export interface Dlg19 { mg: boolean; mgTrust: number; fsp: boolean; fhead: boolean; fcap: number; st: boolean; n: { done: number; exc: number } }
export interface Bud19 { m: number; vis: number; fold: { w: number; t: L }[]; last: number; dlg: Dlg19 }
declare module '../ext4' { interface Ext4 { bud19: Bud19 } }
const freshDlg = (): Dlg19 => ({ mg: false, mgTrust: 45, fsp: false, fhead: false, fcap: 0.25, st: false, n: { done: 0, exc: 0 } });
registerExt4('bud19', () => ({ m: -1, vis: 0, fold: [], last: 0, dlg: freshDlg() }));
export const bud19 = (s: GameState): Bud19 => {
  const x = s.x4 as unknown as { bud19?: Bud19 };
  const b = (x.bud19 ??= { m: -1, vis: 0, fold: [], last: 0, dlg: freshDlg() });
  b.dlg ??= freshDlg();
  return b;
};
export const dlg19 = (s: GameState): Dlg19 => bud19(s).dlg;

// ---------------------------------------------------------------- orçamento de conflitos

export interface Conf19 { n: number; cap: number; parts: [L, number][] }
const memo = new WeakMap<GameState, { k: string; v: Conf19 }>();
export function conflicts19(s: GameState): Conf19 {
  const mg = ventures(s).mg.clients;
  const k = `${s.week}|${s.decisions.length}|${mg.length}|${mg.filter((c) => c.crisis).length}|${liveOf(s).fests.length}|${dm18(s).th.length}|${activeFeuds18(s).length}`;
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
  if (liveOf(s).fests.length) { const q = festivalQ19(s); add(l('Apertos do festival', 'Festival squeezes'), q.now.length + q.threats.length * 0.5); }
  const extra = Math.max(0, careers(s).active.length - 1);
  const v: Conf19 = { n: parts.reduce((t, p) => t + p[1], 0), cap: 7 + Math.min(2, extra), parts };
  memo.set(s, { k, v });
  return v;
}
CONFLICTS19.n = (s) => conflicts19(s).n;
CONFLICTS19.cap = (s) => conflicts19(s).cap;

registerExplain('bud19.conf', (s) => {
  const c = conflicts19(s);
  const parts: WhyPart[] = c.parts.map(([label, value]) => ({ label, value, fmt: 'num' }));
  parts.push({ label: fmtL(l('Teto: 7 + 1 por carreira extra (até +2) = {c}', 'Cap: 7 + 1 per extra career (up to +2) = {c}'), { c: c.cap }), value: c.cap, fmt: 'num' });
  return { title: l('Conflitos abertos', 'Open conflicts'), value: c.n, fmt: 'num', parts, note: l('Com o teto atingido, o narrador, as situações e o Mestre não abrem crises novas com você — só entre NPCs — até algo se resolver.', 'At the cap, the storyteller, situations and the DM open no new crises with you — only among NPCs — until something resolves.') };
});
registerCockpit18('budget19', (s) => {
  const c = conflicts19(s);
  if (c.n < c.cap * 0.75) return {};
  return { threats: [{ tone: c.n >= c.cap ? 'bad' : 'info', t: fmtL(c.n >= c.cap ? l('Conflitos abertos {n}/{c}: o diretor segura crises novas até você resolver alguma.', 'Open conflicts {n}/{c}: the director holds new crises until you resolve some.') : l('Conflitos abertos {n}/{c}: perto do teto.', 'Open conflicts {n}/{c}: near the cap.'), { n: Math.round(c.n * 10) / 10, c: c.cap }), goto: { area: 'cockpit' } }] };
});

// ---------------------------------------------------------------- avisos: resumo do mês

/** avisos de rotina (sempre vão para o resumo) */
const ROUTINE19 = /gravou \d+ faixa|Por que deu nisso\?|entregou a encomenda|programad[oa] para a semana|pontos de habilidade|Leilão da massa falida/;
/** cota de avisos informativos/bons por mês antes de agrupar (ruins e eventos nunca são agrupados) */
export const NOTE_CAP19 = 8;
const mkey = (s: GameState) => s.year * 12 + s.month;
const SUM19 = 'Resumo do mês:';
NOTIFY19.f = (s, n) => {
  const b = bud19(s);
  if (b.m !== mkey(s)) { b.last = b.fold.length; b.m = mkey(s); b.vis = 0; b.fold = []; }
  const low = n.kind === 'info' || n.kind === 'good';
  if (!low || (!ROUTINE19.test(n.text.pt) && b.vis < NOTE_CAP19)) { b.vis++; return false; }
  b.fold.push({ w: n.week, t: n.text });
  if (b.fold.length > 60) b.fold.shift();
  const ex = b.fold.slice(-3).map((x) => x.t);
  const text: L = { pt: `${SUM19} ${b.fold.length} aviso(s) menor(es) agrupado(s) — ${ex.map((x) => x.pt).join(' · ')}`, en: `Monthly summary: ${b.fold.length} minor notice(s) grouped — ${ex.map((x) => x.en).join(' · ')}` };
  const sum = b.fold.length > 1 ? [...s.notifications].reverse().find((x) => x.text.pt.startsWith(SUM19) && x.week >= s.clock.monthStartWeek) : undefined;
  if (sum) { sum.text = text; sum.week = n.week; }
  else s.notifications.push({ week: n.week, text, kind: 'info' });
  return true;
};
/** avisos agrupados do mês corrente (para a tela do resumo) */
export const folded19 = (s: GameState): { w: number; t: L }[] => (bud19(s).m === mkey(s) ? bud19(s).fold : []);

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

registerInboxKind('dlg19', { label: l('Equipe delegada', 'Delegated staff'), cat: 'staff', prio: 2, goto: () => ({ area: 'long18', tab: ['long18', 'policy'] }) });
function exc19(s: GameState, k: 'mg' | 'fest' | 'studio', t: L, act?: string): void {
  const P = pol18(s);
  if (P.exc.some((e) => e.t.pt === t.pt && s.week - e.w < 8)) return;
  P.exc.unshift({ w: s.week, k: 'renew', act, t });
  if (P.exc.length > 30) P.exc.length = 30;
  dlg19(s).n.exc++;
  emitFact(s, { kind: 'deleg_exc', actors: ['player', ...(act ? [act] : [])], text: t, visibility: 'secret', data: { k } });
}
onFact('deleg_exc', (s, f) => {
  pushInbox18(s, 'dlg19', { from: 'staff', subject: l('A equipe precisa de você', 'Staff needs you'), body: f.text, tone: 'bad' });
}, 'budget19:deleg');

export function delegateMonth(s: GameState): void {
  const D = dlg19(s);
  if (D.mg) {
    const r = rng19(s, 'dlg19', () => rngOf(s));
    for (const c of ventures(s).mg.clients) {
      const a = s.acts[c.actId], x = c12(s, c.actId), left = x.mandate.until - s.week;
      if (!a || left <= 0 || left > 8) continue;
      if (x.trust < D.mgTrust) { exc19(s, 'mg', fmtL(l('Mandato de {a} vence em {w} semanas e a confiança ({t}) está abaixo do mínimo ({m}): renovar é com você.', '{a}\'s mandate ends in {w} weeks and trust ({t}) is below the minimum ({m}): renewing is up to you.'), { a: a.name, w: left, t: Math.round(x.trust), m: D.mgTrust }), a.id); continue; }
      const m = { areas: x.mandate.areas, rate: x.mandate.rate, excl: x.mandate.excl, auto: x.mandate.auto };
      const res = negotiateMandate(s, r, a.id, m);
      if (res.ok) D.n.done++;
      else if (!/há pouco|recently/.test(res.text.pt)) exc19(s, 'mg', fmtL(l('A equipe tentou renovar o mandato de {a} nos mesmos termos e ouviu não: {w}', 'Staff tried to renew {a}\'s mandate on the same terms and got a no: {w}'), { a: a.name, w: res.text }), a.id);
    }
  }
  for (const f of liveOf(s).fests) {
    const x = f12(s, f), mu = muOf(s, f);
    if (D.fsp) for (const o of [...x.cyc.offers]) {
      const p = proj12(s, f), safe = Math.min(p.demand, p.cap) * 0.9;
      if (o.min <= safe) { if (!takeSponsor12(s, f.id, o.id, true)) D.n.done++; }
      else exc19(s, 'fest', fmtL(l('{f}: patrocínio de {n} pede {m} pessoas — acima do que a equipe acha seguro (90% da projeção: {p}).', '{f}: {n}\'s sponsorship requires {m} people — above what staff deems safe (90% of projection: {p}).'), { f: f.name, n: o.name, m: o.min, p: Math.round(safe) }));
    }
    if (D.fhead && mu >= 0 && mu <= 5 && !Object.values(x.deals).some((d) => d.time === 3)) {
      const cash = Math.max(0, s.player.cash);
      const cands = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length && !x.deals[a.id]).sort((a, b) => b.fame - a.fame).slice(0, 30);
      let ok = false;
      for (const a of cands) {
        const k = ask12(s, f, a, { time: 3, len: 60, excl: false });
        if (k.refuse || k.fee * 0.3 > cash * D.fcap) continue;
        if (offer12(s, f.id, a.id, { stage: 0, time: 3, len: 60, excl: false, fee: k.fee }).res === 'yes') { ok = true; D.n.done++; break; }
      }
      if (!ok && mu <= 3) exc19(s, 'fest', fmtL(l('{f}: a {m} mês(es) da edição, a equipe não achou headliner dentro do teto ({p}% do caixa no adiantamento).', '{f}: {m} month(s) out, staff found no headliner within the cap ({p}% of cash on the advance).'), { f: f.name, m: mu, p: Math.round(D.fcap * 100) }));
    }
  }
  if (D.st) for (const v of studios(s)) {
    const sx = studioOf(s, v);
    for (const j of sx.jobs.filter((y) => y.state === 'proposal')) {
      const eng = sx.engs.find((e) => !sx.jobs.some((y) => y.state === 'booked' && y.eng === e.id));
      const room = sx.rooms.find((rm) => !sx.jobs.some((y) => y.state === 'booked' && y.room === rm.id));
      if (eng && room && !acceptJob(s, v.id, j.id, eng.id, room.id)) D.n.done++;
      else { exc19(s, 'studio', fmtL(l('{v}: pedido de sessão de {c} sem sala ou engenheiro livre.', '{v}: session request from {c} with no free room or engineer.'), { v: v.name, c: j.client })); break; }
    }
  }
}
registerSimHook('month', 'budget19:dlg', delegateMonth);
