// Rodada 18 (artist18): o playbot no papel ARTISTA — responde propostas de selo como um músico sensato do perfil,
// contrata empresário/agente/editora, contrapropõe, audita, renegocia, processa e (agressivo) abre sociedade.
import type { GameState } from './types';
import type { Profile } from './playbot16';
import { answerMsg } from './sys/people/inbox';
import { P } from './sys/people/state';
import {
  a18, accept18, advice18, audit18, auditBlock18, band18, bestAsk18, breach18, counter18, decline18, hireLawyer18, openOffers18, reneg18, renegBlock18, renegOdds18, sue18, value18,
} from './sys/artist18';
import { capOf18, found18, partners18, sh18 } from './sys/shared18';

export interface BotArt18 { offers: number; signed: number; counters: number; audits: number; renegs: number; suits: number; ventures: number; reps: number }
export function botArt18Log(s: GameState): BotArt18 {
  const f = s.flags as Record<string, number>;
  return { offers: f.ba18o ?? 0, signed: f.ba18s ?? 0, counters: f.ba18c ?? 0, audits: f.ba18a ?? 0, renegs: f.ba18r ?? 0, suits: f.ba18u ?? 0, ventures: f.ba18v ?? 0, reps: f.ba18p ?? 0 };
}
const inc = (s: GameState, k: string) => { (s.flags as Record<string, number>)[k] = ((s.flags as Record<string, number>)[k] ?? 0) + 1; };

export function botArtist18(s: GameState, prof: Profile): void {
  const st = a18(s);
  const a = band18(s);
  if (!a) return;
  // mensagens que pedem resposta: sempre o lado sensato
  const SAFE: Record<string, string> = { a18_deliver: 'promise', a18_ar: prof === 'cautious' ? 'refuse' : 'comply', a18_buried: prof === 'aggressive' ? 'pay' : 'complain', a18_drop: 'masters', a18_merge: 'stay', a18_show: 'go' };
  for (const m of [...P(s).inbox]) {
    const k = String(m.ref?.k18 ?? '');
    if (m.resolved || !m.actions?.length || !SAFE[k]) continue;
    answerMsg(s, m.id, SAFE[k]);
  }
  // representação
  for (const o of openOffers18(s)) {
    if (o.k === 'mgr' && (prof !== 'cautious' || (o.rate ?? 1) <= 0.15)) { accept18(s, o.id); inc(s, 'ba18p'); }
    else if (o.k === 'agent') { accept18(s, o.id); inc(s, 'ba18p'); }
    else if (o.k === 'pub' && (o.ptype === 'admin' || (prof !== 'cautious' && o.ptype === 'copub') || (prof === 'aggressive' && o.ptype === 'full'))) { accept18(s, o.id); inc(s, 'ba18p'); }
    else if (o.k === 'mgr' || o.k === 'pub') decline18(s, o.id);
  }
  const recs = openOffers18(s).filter((o) => o.k === 'record' || o.k === 'dist' || o.k === 'buyout' || o.k === 'reneg' || o.k === 'dev');
  for (const o of recs) if (o.k === 'reneg' && st.deal) { accept18(s, o.id); inc(s, 'ba18r'); }
  const thr = prof === 'cautious' ? 0.62 : prof === 'balanced' ? 0.56 : 0.5;
  const pick = (xs: typeof recs) => xs.map((o) => ({ o, v: (advice18(s) ? value18(s, o).v : value18(s, o).seen) + (prof === 'cautious' && o.master === 'artist' ? 0.05 : 0) })).sort((x, y) => y.v - x.v)[0];
  if (!st.deal && !st.dev) {
    const xs = recs.filter((o) => o.k === 'record' || o.k === 'dist' || o.k === 'dev');
    if (xs.length) {
      inc(s, 'ba18o');
      if (!advice18(s) && prof !== 'aggressive' && xs.some((o) => o.pred || o.low)) hireLawyer18(s);
      const b = pick(xs);
      const bad = b.o.pred && advice18(s);
      if (!bad && b.v >= thr) { const r = accept18(s, b.o.id, prof !== 'cautious'); if (r.ok) inc(s, 'ba18s'); }
      else if (b.o.rounds < 2) { counter18(s, b.o.id, bestAsk18(s, b.o)); inc(s, 'ba18c'); }
    }
  } else if (st.deal) {
    const bo = recs.filter((o) => o.k === 'buyout');
    const b = bo.length ? pick(bo) : undefined;
    if (b && b.v > st.deal.v0 + 0.05 && prof !== 'cautious') { if (accept18(s, b.o.id, true).ok) inc(s, 'ba18s'); }
    if (!renegBlock18(s) && renegOdds18(s) > 0.4) { reneg18(s); inc(s, 'ba18r'); }
    const late = st.stmts.some((x) => x.late && x.lb === st.deal?.lb);
    if (!auditBlock18(s) && (late || (prof === 'cautious' && s.month === 3) || st.deal.prio < 20)) { audit18(s); inc(s, 'ba18a'); }
    if (prof === 'aggressive' && breach18(s) && !st.suits.length) { sue18(s); inc(s, 'ba18u'); }
  }
  // sociedade (agressivo, com folga de caixa)
  const sh = sh18(s);
  if (prof === 'aggressive' && !sh.v.some((v) => v.st === 'on') && s.player.cash > capOf18(s, 'studio') * 6 && s.month === 6) {
    const p = partners18(s, 'studio')[0];
    if (p && found18(s, 'studio', p.pk, 0.5).ok) inc(s, 'ba18v');
  }
  for (const m of [...P(s).inbox]) {
    const k = String(m.ref?.k18 ?? '');
    if (m.resolved || !m.actions?.length) continue;
    if (k === 'sh18_prop') answerMsg(s, m.id, String(m.ref?.k) === 'sell' ? 'no' : 'yes');
    if (k === 'sh18_fall') answerMsg(s, m.id, 'sell');
  }
}
