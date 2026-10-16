// Rodada 19 (Frente 7, M20) — ONDAS DE CANCELAMENTO DIGITAL (`cancel19`, 2010+). O escândalo (scandal17) de um ato com
// alcance vira ONDA: sobe no 1º mês até o pico (gravidade × fama × era das redes), e a janela de resposta é curta
// (2 semanas). Pedir desculpas cedo derruba a onda pela metade a cada mês; calar deixa esfriar devagar; contra-atacar
// é aposta (os fãs de núcleo se mobilizam — fans18 — ou o caso cresce e os haters dobram). Enquanto dura: fãs casuais
// saem, hype negativo (streaming/rádio), embalo cai; no pico (50+) o ato fica "cancelado" (brands.ts não traz marcas,
// patrocínios e campanhas do adsync19 caem pela cláusula de conduta). Quando passa, volta possível: "retorno" pago.
// Modo exato: gente real só com fatos documentados (sem ondas sorteadas para atos reais travados).

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { histLocked } from '../history15';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';
import { headline19 } from './factlink19';
import { fan18 } from './fans18';
import { addHype } from './hype12';
import { cnt19, link19, log19, mineA19, usd19, xs19, type Log19 , off19 } from './mkb19';
import { cashWhy20, freeCash20 } from '../oblig20';

export const CANCEL_FROM19 = 2010;
export type Resp19 = 'apology' | 'silent' | 'counter';
export const RESP19: Record<Resp19, { name: L; desc: L; k: number }> = {
  apology: { name: l('Pedir desculpas já', 'Apologise now'), desc: l('Dentro da janela, a onda cai pela metade por mês; fora dela, menos. Puristas acham fraqueza.', 'Inside the window the wave halves monthly; outside it, less. Purists call it weakness.'), k: 0.45 },
  silent: { name: l('Ficar em silêncio', 'Stay silent'), desc: l('Esfria devagar (×0,7 por mês). Nada a perder, nada a ganhar.', 'Cools slowly (×0.7 a month). Nothing to lose, nothing to gain.'), k: 0.7 },
  counter: { name: l('Contra-atacar', 'Hit back'), desc: l('Aposta: os fãs de núcleo se mobilizam e a onda vira (×0,55) — ou o caso cresce (×1,15) e os haters dobram.', 'A gamble: core fans mobilise and the wave turns (×0.55) — or the story grows (×1.15) and haters double.'), k: 0.55 },
};
export interface Wave19 { id: string; act: string; w0: number; y: number; sev: number; peak: number; cok?: number; int: number; win: number; resp?: Resp19; late?: 1; mo: number; lost: number; brands: string[]; over?: number; back?: 1; why: L; fact?: string }
export interface Cancel19 extends Log19 { w: Wave19[]; seq: number }
declare module '../ext4' { interface Ext4 { cancel19: Cancel19 } }
const fresh = (): Cancel19 => ({ w: [], seq: 0, log: [], n: {} });
registerExt4('cancel19', fresh);
export const cx19 = (s: GameState): Cancel19 => xs19(s, 'cancel19', fresh);
const rng = (s: GameState) => rng19(s, 'cancel19');
export const waveOf19 = (s: GameState, actId: string): Wave19 | undefined => cx19(s).w.find((x) => x.act === actId && x.over === undefined);
export const eraK19 = (y: number): number => (y >= 2020 ? 1.15 : y >= 2015 ? 1 : 0.8);
/** Pico da onda pela gravidade, fama e era das redes, com o porquê. */
export function peak19(s: GameState, a: Act, sev: number): { v: number; why: WhyPart[] } {
  const why: WhyPart[] = [
    { label: l('Gravidade do escândalo', 'Scandal severity'), value: Math.round(sev), fmt: 'num' },
    { label: fmtL(l('Alcance pela fama ({f})', 'Reach by fame ({f})'), { f: Math.round(a.fame) }), value: Math.round((0.6 + a.fame / 100) * 100) / 100, fmt: 'mult' },
    { label: fmtL(l('Era das redes ({y})', 'Social-media era ({y})'), { y: s.year }), value: eraK19(s.year), fmt: 'mult' },
  ];
  return { v: Math.round(clamp(sev * (0.6 + a.fame / 100) * eraK19(s.year), 0, 100)), why };
}

export function startWave19(s: GameState, a: Act, sev: number, f?: Fact): Wave19 | null {
  if (s.year < CANCEL_FROM19 || waveOf19(s, a.id) || histLocked(s, a)) return null;
  const st = cx19(s), pk = peak19(s, a, sev).v;
  if (pk < 25) return null;
  const x: Wave19 = { id: `cw${++st.seq}`, act: a.id, w0: s.week, y: s.year, sev: Math.round(sev), peak: pk, int: Math.round(pk * 0.6), win: s.week + 2, mo: 0, lost: 0, brands: [], why: f?.text ?? l('Escândalo', 'Scandal'), ...(f ? { fact: f.id } : {}) };
  st.w.push(x); if (st.w.length > 40) st.w.splice(0, st.w.length - 40);
  cnt19(st, 'wave');
  const tx = fmtL(l('Onda de cancelamento contra {a}: hashtags, prints e marcas em silêncio (pico {p}).', 'Cancel wave against {a}: hashtags, screenshots and brands going quiet (peak {p}).'), { a: a.name, p: pk });
  log19(s, st, tx);
  emitFact(s, { kind: 'cancel_wave', actors: [a.id, ...(mineA19(a) ? ['player'] : [])], severity: pk, visibility: 'public', tags: ['cancel19', 'bad'], text: tx, src: 'cancel19', data: { wave: x.id }, ...(f ? { cause: [f.id] } : {}) });
  if (mineA19(a)) pushInbox18(s, 'cx19_wave', { from: l('Assessoria de imprensa', 'Press office').pt, tone: 'bad',
    subject: fmtL(l('{a} está sendo cancelado — responda em 2 semanas', '{a} is being cancelled — respond within 2 weeks'), { a: a.name }),
    body: fmtL(l('{w} Pico previsto {p}: fãs casuais saem, marcas acionam cláusulas e o streaming cai. Pedir desculpas dentro da janela corta a onda pela metade a cada mês.', '{w} Expected peak {p}: casual fans leave, brands trigger clauses and streaming drops. Apologising inside the window halves the wave each month.'), { w: x.why, p: pk }),
    ref: { act: a.id, wave: x.id }, actions: [{ id: 'apology', label: RESP19.apology.name }, { id: 'counter', label: RESP19.counter.name }, { id: 'silent', label: RESP19.silent.name }], weeks: 2 });
  else npcResp(s, x, a);
  return x;
}
function npcResp(s: GameState, x: Wave19, a: Act): void {
  const p = a.members.map((id) => s.persons[id]?.persona).find(Boolean);
  const r = rng(s), w = { apology: 1 + (p?.sociability ?? 50) / 50, silent: 1 + (100 - (p?.resilience ?? 50)) / 50, counter: 0.5 + (p?.ambition ?? 50) / 60 };
  respond19(s, x.id, r.weighted(Object.keys(w) as Resp19[], (k) => w[k]) ?? 'silent');
}
/** Resposta à onda (Caixa, interface ou NPC). */
export function respond19(s: GameState, id: string, k: Resp19): L {
  const x = cx19(s).w.find((y) => y.id === id), a = x && s.acts[x.act];
  if (!x || !a || x.over !== undefined) return l('A onda já passou.', 'The wave is over.');
  if (x.resp) return l('Já respondido.', 'Already answered.');
  x.resp = k; if (s.week > x.win) x.late = 1;
  cnt19(cx19(s), k);
  if (k === 'counter') {
    const fa = fan18(s, a.id, false);
    const ok = rng(s).chance(clamp(0.3 + (fa?.loy ?? 40) / 200 + (fa?.mob ?? 30) / 300, 0.2, 0.75));
    if (!ok) { x.int = Math.round(x.int * 1.15); const fd = s.fandoms[a.id]; if (fd) fd.haters = Math.round(fd.haters * 2 + 500); }
    else if (fa) fa.mob = clamp(fa.mob + 15, 0, 100);
    x.cok = ok ? 1 : 0;
    return ok ? l('Os fãs de núcleo compram a briga: a narrativa vira.', 'Core fans join the fight: the narrative turns.') : l('O contra-ataque virou meme: o caso cresceu e os haters dobraram.', 'The counter-attack became a meme: the story grew and haters doubled.');
  }
  if (k === 'apology') { const fa = fan18(s, a.id, false); if (fa) fa.fac[0] = clamp(fa.fac[0] - 4, -50, 50); return x.late ? l('Desculpas tardias: ajudam, mas menos.', 'A late apology: it helps, but less.') : l('Desculpas dentro da janela: a onda começa a ceder.', 'An apology inside the window: the wave starts to give.'); }
  return l('Silêncio: a onda esfria no tempo dela.', 'Silence: the wave cools in its own time.');
}
registerInboxKind('cx19_wave', { label: l('Cancelamento', 'Cancellation'), cat: 'press', icon: 'fire', prio: 2, goto: () => ({ area: 'firm19' }),
  handle: (s, m, act) => respond19(s, String(m.ref?.wave), (act as Resp19) || 'silent') });
registerConseq18('ib:cx19_wave:apology', { now: RESP19.apology.desc, later: [{ in: [4, 10], p: 0.35, tone: 'good', hint: l('Desculpa sincera pode virar redenção.', 'A sincere apology can become redemption.'),
  fx: (f) => (f.fans(3).trust(2), l('A entrevista de desculpas viraliza pelo lado bom: "pelo menos assumiu".', 'The apology interview goes viral the good way: "at least they owned it".')) }] });
registerConseq18('ib:cx19_wave:counter', { now: RESP19.counter.desc, odds: () => ({ p: 0.5, why: [l('Lealdade e mobilização dos fãs pesam (20–75%).', 'Fan loyalty and mobilisation weigh in (20–75%).')] }), later: [{ in: [3, 9], p: 0.3, tone: 'bad', hint: l('Briga pública deixa rastro.', 'A public fight leaves a trail.'),
  fx: (f) => (f.rep('institutional', -1).mood('stress', 10), l('Prints antigos do contra-ataque voltam a circular: o assunto não morre.', 'Old screenshots of the counter-attack resurface: the story won\'t die.')) }] });
registerConseq18('ib:cx19_wave:silent', { now: RESP19.silent.desc, later: [{ in: [3, 8], p: 0.25, tone: 'mixed', hint: l('O silêncio pode ser lido de dois jeitos.', 'Silence can be read two ways.'),
  fx: (f) => (f.r.chance(0.5) ? (f.fans(2), l('O público esqueceu: o silêncio funcionou.', 'The public forgot: silence worked.')) : (f.fans(-2), l('"Nem uma palavra?" — o silêncio vira manchete própria.', '"Not a word?" — the silence becomes its own headline.'))) }] });

export const comebackCost19 = (s: GameState) => money(s, 3000);
export function comeback19(s: GameState, id: string): L | null {
  const x = cx19(s).w.find((y) => y.id === id), a = x && s.acts[x.act];
  if (!x || !a || x.over === undefined || x.back) return l('Sem retorno pendente.', 'No pending comeback.');
  if (mineA19(a)) { if (freeCash20(s) < comebackCost19(s)) return cashWhy20(s, comebackCost19(s), l('Caixa insuficiente.', 'Not enough cash.')); post(s, `cx19back:${x.id}`, -comebackCost19(s), 'pr_agency', `Retorno de ${a.name}`); }
  x.back = 1;
  cnt19(cx19(s), 'back');
  const tx = fmtL(l('{a} volta depois do cancelamento: entrevista longa, disco novo, fãs divididos.', '{a} returns after the cancellation: a long interview, a new record, split fans.'), { a: a.name });
  log19(s, cx19(s), tx);
  emitFact(s, { kind: 'cancel_comeback', actors: [a.id, ...(mineA19(a) ? ['player'] : [])], severity: 30 + Math.round(a.fame / 4), visibility: 'public', tags: ['cancel19', 'mixed'], text: tx, src: 'cancel19', data: { wave: x.id } });
  return null;
}
registerInboxKind('cx19_back', { label: l('Retorno', 'Comeback'), cat: 'press', icon: 'sparkle', prio: 1, goto: () => ({ area: 'firm19' }),
  handle: (s, m, act) => (act === 'back' ? comeback19(s, String(m.ref?.wave)) ?? l('Retorno anunciado.', 'Comeback announced.') : l('Melhor esperar mais um pouco.', 'Better to wait a bit longer.')) });
registerConseq18('ib:cx19_back:back', { now: l('Custo de assessoria; fama e fãs voltam em parte.', 'PR cost; fame and fans partly return.'), later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: l('Nem todo mundo perdoa.', 'Not everyone forgives.'),
  fx: (f) => (f.r.chance(0.6) ? (f.fame(2).momentum(6), l('O retorno é celebrado: casa cheia e crítica generosa.', 'The comeback is celebrated: full houses and generous critics.')) : (f.fans(-2), l('Protestos na porta do show de retorno.', 'Protests outside the comeback show.'))) }] });
registerConseq18('ib:cx19_back:wait', { later: [{ in: [3, 9], p: 0.2, tone: 'good', hint: l('O tempo cura — às vezes.', 'Time heals — sometimes.'),
  fx: (f) => (f.mood('stress', -8), l('Longe dos holofotes, o artista se recompõe.', 'Away from the spotlight, the artist recovers.')) }] });

export function cancelMonth19(s: GameState): void {
  if (s.year < CANCEL_FROM19) return;
  const st = cx19(s), r = rng(s);
  for (const x of st.w) {
    if (x.over !== undefined) continue;
    const a = s.acts[x.act];
    if (!a) { x.over = s.week; continue; }
    x.mo++;
    if (x.mo === 1) x.int = x.peak;
    else {
      const k = x.resp === 'counter' ? (x.cok ? RESP19.counter.k : 1.15) : x.resp === 'apology' ? (x.late ? 0.65 : RESP19.apology.k) : x.resp === 'silent' ? RESP19.silent.k : 0.75;
      x.int = Math.round(x.int * (x.mo > 6 ? Math.min(k, 0.6) : k));
    }
    if (x.int >= 15) {
      const pc = Math.min(0.08, x.int / 600);
      const lost = Math.round(a.fans.casual * pc + a.fans.active * pc * 0.4);
      a.fans.casual = Math.max(0, Math.round(a.fans.casual * (1 - pc))); a.fans.active = Math.max(0, Math.round(a.fans.active * (1 - pc * 0.4)));
      x.lost += lost;
      addHype(s, `a:${a.id}`, 'cancel19', l('Onda de cancelamento', 'Cancel wave'), -Math.round(x.int / 4));
      a.momentum = clamp(a.momentum - x.int / 10, 0, 100);
    }
    if (x.int >= 50) {
      a.cancelledUntil = Math.max(a.cancelledUntil ?? 0, s.week + 5);
      for (const d of s.deals) if (d.actId === a.id && d.status === 'active' && (d.kind === 'sponsor' || d.kind === 'sync_ad')) { d.status = 'done'; x.brands.push(d.brand); }
    }
    if (x.int < 10) {
      x.over = s.week;
      addHype(s, `a:${a.id}`, 'cancel19', l('Onda de cancelamento', 'Cancel wave'), 0);
      log19(s, st, fmtL(l('A onda contra {a} passou ({m} meses, {n} fãs perdidos).', 'The wave against {a} is over ({m} months, {n} fans lost).'), { a: a.name, m: x.mo, n: x.lost.toLocaleString('en-US') }));
      if (mineA19(a) && a.fame >= 20) pushInbox18(s, 'cx19_back', { from: l('Assessoria de imprensa', 'Press office').pt, tone: 'info', subject: fmtL(l('Hora do retorno de {a}?', 'Time for {a}\'s comeback?'), { a: a.name }),
        body: fmtL(l('A poeira baixou. Um retorno planejado (entrevista, disco, turnê pequena) custa {c} e recupera parte da fama e dos fãs — ou reacende o caso.', 'The dust has settled. A planned comeback (interview, record, small tour) costs {c} and wins back some fame and fans — or reignites the case.'), { c: usd19(comebackCost19(s)) }),
        ref: { act: a.id, wave: x.id }, actions: [{ id: 'back', label: l('Planejar o retorno', 'Plan the comeback') }, { id: 'wait', label: l('Esperar', 'Wait') }], weeks: 8 });
      else if (!mineA19(a) && a.fame >= 30 && r.chance(0.5)) comeback19(s, x.id);
    }
  }
  st.w = st.w.filter((x) => x.over === undefined || x.over > s.week - 260);
}
registerSimHook('month', 'cancel19', (s) => off19('cancel19') || cancelMonth19(s));

// ---------------------------------------------------------------- ouvintes
// escândalo com alcance (2010+) vira onda
onFact('scandal', (s, f) => {
  if (s.year < CANCEL_FROM19 || f.severity < 30 || f.visibility !== 'public') return;
  const a = s.acts[f.actors[0]];
  if (a && a.fame >= 15) startWave19(s, a, f.severity, f);
}, 'cancel19:wave');
// a onda divide os fãs: mainstream e comunidade se afastam, haters crescem
onFact('cancel_wave', (s, f) => {
  const a = s.acts[f.actors[0]], fa = a && fan18(s, a.id, false);
  if (fa) { fa.fac[1] = clamp(fa.fac[1] - 10, -50, 50); fa.fac[3] = clamp(fa.fac[3] - 5, -50, 50); fa.loy = clamp(fa.loy - 3, 0, 100); }
  const fd = a && s.fandoms[a.id]; if (fd) fd.haters += f.severity * 20;
  if (a && mineA19(a)) link19(s, 'cancel', fmtL(l('Onda contra {a} (pico {p}): mainstream −10, comunidade −5, haters +{h}.', 'Wave against {a} (peak {p}): mainstream −10, community −5, haters +{h}.'), { a: a.name, p: f.severity, h: f.severity * 20 }));
}, 'cancel19:fans');
// retorno: manchete, fama e lealdade de quem ficou
onFact('cancel_comeback', (s, f) => {
  const a = s.acts[f.actors[0]], fa = a && fan18(s, a.id, false);
  if (a) { a.fame = clamp(a.fame + 3, 0, 100); a.fans.casual += Math.round(a.fans.core * 0.5); }
  if (fa) fa.loy = clamp(fa.loy + 5, 0, 100);
  headline19(s, f.text, 2);
}, 'cancel19:back');

// ---------------------------------------------------------------- calendário e porquê
registerDeadline('cancel19', (s, from, to) => cx19(s).w.filter((x) => x.over === undefined && !x.resp && x.win >= from && x.win <= to && mineA19(s.acts[x.act])).map((x) => ({
  id: `cancel19-${x.id}`, w: x.win, kind: 'decision' as const, act: true, t: fmtL(l('Janela de resposta: {a}', 'Response window: {a}'), { a: s.acts[x.act]?.name ?? '?' }), tone: 'bad' as const, goto: { area: 'firm19' } })));
registerExplain('cx19.wave', (s, c) => {
  const x = cx19(s).w.find((y) => y.id === String(c.wave ?? '')), a = x && s.acts[x.act];
  if (!x || !a) return null;
  const parts: WhyPart[] = [...peak19(s, a, x.sev).why,
    { label: x.resp ? fmtL(l('Resposta: {r}{t}', 'Response: {r}{t}'), { r: RESP19[x.resp].name, t: x.late ? l(' (fora da janela)', ' (outside the window)') : '' }) : l('Sem resposta ainda (×0,75/mês)', 'No response yet (×0.75/month)'), value: x.resp ? RESP19[x.resp].k : 0.75, fmt: 'mult' },
    { label: l('Fãs perdidos até agora', 'Fans lost so far'), value: x.lost, fmt: 'num', tone: 'bad' }];
  if (x.brands.length) parts.push({ label: fmtL(l('Marcas que saíram: {b}', 'Brands that left: {b}'), { b: x.brands.join(', ') }), value: x.brands.length, fmt: 'num', tone: 'bad' });
  return { title: fmtL(l('Onda contra {a}', 'Wave against {a}'), { a: a.name }), value: x.int, fmt: 'num', parts, note: l('Acima de 50: "cancelado" (sem marcas); abaixo de 10, a onda acaba e o retorno fica possível.', 'Above 50: "cancelled" (no brands); below 10 the wave ends and a comeback becomes possible.') };
});
