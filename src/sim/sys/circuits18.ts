// Rodada 18 (regions18, R3) — CIRCUITOS COM REGRAS PRÓPRIAS: rodeios sertanejos, São João, bailes funk, gospel (Brasil
// e CCM americano), marketers de Alaba e shows corporativos de Lagos, cantor de playback em Bollywood, sound systems e
// dub plates na Jamaica, underground do perreo, palenques do regional mexicano e teatro de idols. Cada circuito tem
// porteiro, entrada/mensalidade, efeito (shows, apelo, fama no país, renda fixa ou venda do master à vista) e risco.
// Dados em src/data/regions18/flows.ts; os shows usam o mod cityDemand de regions18.ts.

import { clamp, Rng } from '../../core/rng';
import { CIRCS18, subById18, type Circ18 } from '../../data/regions18';
import { MARKETS, familyOf, l, type L } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { nudge16 } from './fame16';
import { reg18, subW18 } from './regions18';

const live = (y: number, c: Circ18) => y >= c.from && (c.to === undefined || y <= c.to);
export const circFits18 = (c: Circ18, a: Act): boolean => c.g.includes(a.genre) || c.g.includes(familyOf(a.genre));
export const circsFor18 = (s: GameState, a: Act): Circ18[] => CIRCS18.filter((c) => live(s.year, c) && circFits18(c, a));
export const circsOf18 = (s: GameState, actId: string): Circ18[] => (reg18(s).circ[actId] ?? []).map((id) => CIRCS18.find((c) => c.id === id)).filter((c): c is Circ18 => !!c);
export const lumpOf18 = (s: GameState, c: Circ18, a: Act): number => money(s, Math.round((c.lump ?? 0) * (0.5 + a.fame / 40)));

export function circBlock18(s: GameState, actId: string, cid: string): L | null {
  const a = s.acts[actId], c = CIRCS18.find((x) => x.id === cid);
  if (!a || a.owner !== 'player' || !c) return l('Inválido.', 'Invalid.');
  if (!live(s.year, c)) return l('Este circuito não existe nesta época.', 'This circuit does not exist in this era.');
  if (!circFits18(c, a)) return l('O gênero do ato não entra neste circuito.', 'The act\'s genre does not fit this circuit.');
  if ((reg18(s).circ[actId] ?? []).includes(cid)) return l('Já está no circuito.', 'Already on the circuit.');
  if (c.lump && reg18(s).sold[actId]) return l('O master já foi vendido.', 'The master was already sold.');
  if (s.player.cash < money(s, c.usd)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function joinCirc18(s: GameState, actId: string, cid: string): L | null {
  const b = circBlock18(s, actId, cid);
  if (b) return b;
  const a = s.acts[actId], c = CIRCS18.find((x) => x.id === cid)!, st = reg18(s), sub = subById18[c.sub];
  if (c.usd) post(s, `circ18:${cid}`, -money(s, c.usd), 'promo', `Entrada no circuito ${c.name.pt} (${a.name})`);
  if (c.lump) {
    st.sold[actId] = s.year;
    post(s, `circ18lump:${actId}`, lumpOf18(s, c, a), 'licensing', `Master vendido a marketer (${a.name})`);
    emitFact(s, { kind: 'deal', actors: [a.id, 'player'], severity: 30, visibility: 'public', tags: ['market', 'piracy', cid], src: 'circuits18', text: fmtL(l('{a} vende o master aos marketers de Alaba: dinheiro já, sem royalties.', '{a} sells the master to the Alaba marketers: cash now, no royalties.'), { a: a.name }) });
  }
  (st.circ[actId] ??= []).push(cid);
  emitFact(s, { kind: 'deal', actors: [a.id], severity: 20, visibility: 'public', tags: ['circuit', cid], src: 'circuits18', place: sub?.hub, text: fmtL(l('{a} entra no {c}.', '{a} joins the {c}.'), { a: a.name, c: c.name }) });
  return null;
}
export function leaveCirc18(s: GameState, actId: string, cid: string): void {
  const st = reg18(s);
  st.circ[actId] = (st.circ[actId] ?? []).filter((x) => x !== cid);
  if (!st.circ[actId].length) delete st.circ[actId];
}

// apelo: só a fatia do submercado dentro dos territórios do lançamento
registerMod('appeal', 'circuits18', (s, value, ctx) => {
  const a = ctx.act, rel = ctx.release;
  if (!a || !rel || a.owner !== 'player') return null;
  const cs = reg18(s).circ[a.id];
  if (!cs?.length) return null;
  const tot = rel.territories.reduce((t, mk) => t + (MARKETS.find((m) => m.id === mk)?.size(s.year) ?? 0), 0);
  let m = 1;
  for (const id of cs) {
    const c = CIRCS18.find((x) => x.id === id), sub = c && subById18[c.sub];
    if (!c?.appeal || !sub || !rel.territories.includes(sub.mk) || !tot) continue;
    m *= 1 + (c.appeal - 1) * subW18(sub.id, s.year) * ((MARKETS.find((x) => x.id === sub.mk)?.size(s.year) ?? 0) / tot) * 3;
  }
  return Math.abs(m - 1) < 0.005 ? null : { value: value * m, label: l('Circuito local', 'Local circuit') };
});

registerSimHook('month', 'circuits18', (s) => {
  const st = reg18(s);
  for (const [actId, ids] of Object.entries(st.circ)) {
    const a = s.acts[actId];
    if (!a || a.owner !== 'player' || a.status === 'retired' || a.status === 'split') { delete st.circ[actId]; continue; }
    const r = Rng.fromSeed(`${s.config.seed}|circ18|${actId}|${s.week}`);
    for (const id of ids) {
      const c = CIRCS18.find((x) => x.id === id), sub = c && subById18[c.sub];
      if (!c || !sub) continue;
      if (!live(s.year, c)) { leaveCirc18(s, actId, id); notify(s, fmtL(l('O {c} acabou; {a} sai do circuito.', 'The {c} is over; {a} leaves the circuit.'), { c: c.name, a: a.name }), 'info'); continue; }
      if (c.monthly) post(s, `circ18m:${id}`, -money(s, c.monthly), 'promo', `Circuito ${c.name.pt} (${a.name})`);
      if (c.cash) post(s, `circ18c:${id}`, money(s, Math.round(c.cash * (0.6 + a.fame / 60))), id === 'playback' ? 'licensing' : 'live', `${c.name.pt} (${a.name})`);
      const f = (c.fame ?? 0) * (id === 'playback' && s.year < 1970 ? 0.5 : 1) * (c.lump ? (s.year - (st.sold[actId] ?? 0) < 2 ? 1 : 0.3) : 1);
      if (f) nudge16(s, a.id, sub.a3[0], f);
      if (c.risk && r.chance(c.risk.p)) {
        emitFact(s, { kind: c.risk.kind, actors: [a.id], severity: c.risk.sev, visibility: 'public', tags: ['bad', 'circuit', id], src: 'circuits18', place: sub.hub, text: fmtL(l('{a}: {t}', '{a}: {t}'), { a: a.name, t: c.risk.text }) });
        for (const pid of a.members) addStress(s, pid, Math.round(c.risk.sev / 4), c.name);
        if (c.risk.kind === 'boycott' || c.risk.kind === 'arrest') a.momentum = clamp(a.momentum - 8, 0, 100);
        notify(s, fmtL(l('⚠ {a} no {c}: {t}', '⚠ {a} on the {c}: {t}'), { a: a.name, c: c.name, t: c.risk.text }), 'bad');
      }
    }
  }
});
