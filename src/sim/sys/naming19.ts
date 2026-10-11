// Rodada 19 (Frente 7, M30) — NAMING RIGHTS DE CASAS E FESTIVAIS (`naming19`). Vender o nome da sua casa (venues17,
// 1973+, quando estádios e arenas começam a levar marca) ou do seu festival (1995+, a era dos festivais patrocinados)
// a uma marca da época (data/content BRANDS): caixa fixo todo ano (receita de marcas), mas os puristas torcem o nariz
// (reputação da casa/festival cai na hora e um pouco por mês: "ninguém chama pelo nome novo"). Cláusula de conduta:
// escândalo do selo, onda de cancelamento do residente/cabeça de cartaz (cancel19) ou incidente de público no festival
// (links19a crowd_incident) → a marca sai (`naming_pulled`) e o nome antigo volta. Fim do contrato → renovar (+10%) ou
// deixar vencer.

import { clamp } from '../../core/rng';
import { BRANDS as CBRANDS, type BrandDef } from '../../data/content';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import type { GameState } from '../types';
import { fmtL, money, post } from '../util';
import { schedule18 } from './decide18';
import { headline19 } from './factlink19';
import { liveOf } from './live/state';
import { cnt19, link19, log19, usd19, xs19, type Log19 } from './mkb19';
import { v17, vdef } from './venues17';

export const NAMING_FROM19 = { v: 1973, f: 1995 } as const;
export type NmK19 = 'v' | 'f';
export interface Nm19 { id: string; k: NmK19; tgt: string; brand: string; bname: string; fee: number; from: number; until: number; paid: number; next: number; pulled?: number; why?: L }
export interface Naming19 extends Log19 { d: Nm19[]; seq: number }
declare module '../ext4' { interface Ext4 { naming19: Naming19 } }
const fresh = (): Naming19 => ({ d: [], seq: 0, log: [], n: {} });
registerExt4('naming19', fresh);
export const nm19 = (s: GameState): Naming19 => xs19(s, 'naming19', fresh);
export const liveDeal19 = (s: GameState, k: NmK19, tgt: string): Nm19 | undefined => nm19(s).d.find((x) => x.k === k && x.tgt === tgt && !x.pulled && x.until > s.week);
export interface Tgt19 { k: NmK19; id: string; name: string; rep: number; cap: number }
/** Casas e festivais seus que podem vender o nome nesta época. */
export function targets19(s: GameState): Tgt19[] {
  const out: Tgt19[] = [];
  if (s.year >= NAMING_FROM19.v) for (const o of v17(s).own) { const d = vdef(o.id); if (d) out.push({ k: 'v', id: o.id, name: d.name, rep: o.rep, cap: d.cap }); }
  if (s.year >= NAMING_FROM19.f) for (const f of liveOf(s).fests) out.push({ k: 'f', id: f.id, name: f.name, rep: f.rep, cap: 5000 + f.rep * 300 });
  return out;
}
export const nameBrands19 = (s: GameState): BrandDef[] => CBRANDS.filter((b) => s.year >= b.start && (!b.end || s.year <= b.end) && b.budget >= 3 && !['film_studio', 'novela', 'tv_network', 'game_studio', 'streaming_original', 'ad_agency'].includes(b.category));
/** Valor anual do nome, com o porquê. */
export function nameFee19(s: GameState, t: Tgt19, b: BrandDef): { v: number; why: WhyPart[] } {
  const why: WhyPart[] = [
    { label: fmtL(l('Público ({c} lugares/dia)', 'Audience ({c} capacity/day)'), { c: t.cap.toLocaleString('en-US') }), value: money(s, 1500 + t.cap * 2), fmt: 'money' },
    { label: fmtL(l('Verba da marca ({b}/5)', 'Brand budget ({b}/5)'), { b: b.budget }), value: b.budget / 3, fmt: 'mult' },
    { label: fmtL(l('Prestígio do lugar ({r})', 'Venue prestige ({r})'), { r: Math.round(t.rep) }), value: 0.7 + t.rep / 150, fmt: 'mult' },
  ];
  return { v: Math.round(money(s, 1500 + t.cap * 2) * (b.budget / 3) * (0.7 + t.rep / 150)), why };
}
const nameOf = (s: GameState, k: NmK19, id: string): string => (k === 'v' ? vdef(id)?.name : liveOf(s).fests.find((f) => f.id === id)?.name) ?? '?';
const bumpRep = (s: GameState, k: NmK19, id: string, d: number): void => {
  if (k === 'v') { const o = v17(s).own.find((x) => x.id === id); if (o) o.rep = clamp(o.rep + d, 0, 100); }
  else { const f = liveOf(s).fests.find((x) => x.id === id); if (f) f.rep = clamp(f.rep + d, 0, 100); }
};

/** Vende o nome por 3 ou 5 anos (primeiro ano pago na assinatura). */
export function sellName19(s: GameState, k: NmK19, tgt: string, bid: string, years: 3 | 5 = 3): L | null {
  const t = targets19(s).find((x) => x.k === k && x.id === tgt), b = CBRANDS.find((x) => x.id === bid), st = nm19(s);
  if (!t) return l('Você não tem esse lugar (ou ainda não é época).', 'You do not own that place (or it is not the era yet).');
  if (!b) return l('Escolha uma marca.', 'Pick a brand.');
  if (liveDeal19(s, k, tgt)) return l('O nome já está vendido.', 'The name is already sold.');
  const fee = Math.round(nameFee19(s, t, b).v * (years === 5 ? 0.92 : 1));
  const x: Nm19 = { id: `nm${++st.seq}`, k, tgt, brand: b.id, bname: b.name, fee, from: s.week, until: s.week + years * 52, paid: fee, next: s.week + 52 };
  st.d.push(x); if (st.d.length > 30) st.d.splice(0, st.d.length - 30);
  post(s, `nm19:${x.id}:0`, fee, 'brands', `Naming rights: ${b.name} (${t.name})`);
  cnt19(st, 'deal');
  const tx = fmtL(l('"{n}" passa a se chamar "{b} {n}" por {y} anos ({v}/ano).', '"{n}" becomes "{b} {n}" for {y} years ({v}/year).'), { n: t.name, b: b.name, y: years, v: usd19(fee) });
  log19(s, st, tx);
  schedule18(s, 'nm19:sell', { nm: x.id }, l('Naming rights', 'Naming rights'), fmtL(l('Vender o nome para {b}', 'Sell the name to {b}'), { b: b.name }));
  emitFact(s, { kind: 'naming_deal', actors: ['player'], severity: 20 + b.budget * 4, visibility: 'public', tags: ['naming19', k === 'v' ? 'venue' : 'festival'], text: tx, src: 'naming19', data: { nm: x.id } });
  return null;
}
registerConseq18('nm19:sell', { now: l('Caixa fixo por ano; reputação do lugar cai com os puristas.', 'Fixed yearly cash; the place\'s reputation drops with purists.'), later: [{ in: [6, 18], p: 0.3, tone: 'mixed', hint: l('O nome novo pode pegar — ou virar piada.', 'The new name may stick — or become a joke.'),
  fx: (f) => (f.r.chance(0.5) ? (f.rep('commercial', 1), l('O nome novo pegou: até os taxistas usam.', 'The new name stuck: even cab drivers use it.')) : (f.rep('artistic', -1), l('Fãs fazem camisetas com o nome antigo; a marca vira piada nos shows.', 'Fans print T-shirts with the old name; the brand becomes a joke at shows.'))) }] });

/** Cláusula de conduta: a marca sai e o nome antigo volta. */
export function pullName19(s: GameState, x: Nm19, why: L, cause?: Fact): void {
  if (x.pulled) return;
  x.pulled = s.week; x.why = why;
  cnt19(nm19(s), 'pulled');
  const tx = fmtL(l('{b} aciona a cláusula de conduta e tira o nome de "{n}" ({w}).', '{b} triggers the conduct clause and drops its name from "{n}" ({w}).'), { b: x.bname, n: nameOf(s, x.k, x.tgt), w: why });
  log19(s, nm19(s), tx);
  emitFact(s, { kind: 'naming_pulled', actors: ['player'], severity: 35, visibility: 'public', tags: ['naming19', 'bad'], text: tx, src: 'naming19', data: { nm: x.id }, ...(cause ? { cause: [cause.id] } : {}) });
}
export function nameMonth19(s: GameState): void {
  const st = nm19(s);
  for (const x of st.d) {
    if (x.pulled || x.until <= s.week - 5) continue;
    if (x.until > s.week) bumpRep(s, x.k, x.tgt, -0.1);
    if (x.next <= s.week && x.next < x.until) { x.next += 52; x.paid += x.fee; post(s, `nm19:${x.id}:${x.next}`, x.fee, 'brands', `Naming rights: ${x.bname} (${nameOf(s, x.k, x.tgt)})`); }
    if (x.until <= s.week && x.until > s.week - 5) {
      pushInbox18(s, 'nm19_renew', { from: x.bname, tone: 'info', subject: fmtL(l('Renovar o nome de "{n}"?', 'Renew the name on "{n}"?'), { n: nameOf(s, x.k, x.tgt) }),
        body: fmtL(l('O contrato venceu. {b} renova por 3 anos a {v}/ano (+10%). Deixar vencer devolve o nome antigo (os fãs comemoram).', 'The deal expired. {b} renews for 3 years at {v}/year (+10%). Letting it lapse restores the old name (fans celebrate).'), { b: x.bname, v: usd19(Math.round(x.fee * 1.1)) }),
        ref: { nm: x.id }, actions: [{ id: 'renew', label: l('Renovar', 'Renew') }, { id: 'lapse', label: l('Deixar vencer', 'Let it lapse') }], weeks: 6 });
      x.until = s.week - 6;
    }
  }
}
registerSimHook('month', 'naming19', (s) => nameMonth19(s));
registerInboxKind('nm19_renew', { label: l('Naming rights', 'Naming rights'), cat: 'deals', icon: 'building', prio: 1, goto: () => ({ area: 'firm19' }),
  handle: (s, m, act) => {
    const x = nm19(s).d.find((y) => y.id === String(m.ref?.nm));
    if (!x) return l('Já passou.', 'Already over.');
    if (act !== 'renew') { bumpRep(s, x.k, x.tgt, 3); return l('O nome antigo volta; os fãs comemoram (+3 de reputação).', 'The old name returns; fans celebrate (+3 reputation).'); }
    const fee = Math.round(x.fee * 1.1), st = nm19(s);
    const y: Nm19 = { ...x, id: `nm${++st.seq}`, fee, from: s.week, until: s.week + 156, paid: fee, next: s.week + 52 };
    st.d.push(y);
    post(s, `nm19:${y.id}:0`, fee, 'brands', `Naming rights (renovação): ${x.bname}`);
    return fmtL(l('Renovado por 3 anos: {v}/ano.', 'Renewed for 3 years: {v}/year.'), { v: usd19(fee) });
  } });
registerConseq18('ib:nm19_renew:renew', { later: [{ in: [6, 18], p: 0.2, tone: 'bad', hint: l('Marca antiga, cansaço antigo.', 'Old brand, old fatigue.'), fx: (f) => (f.rep('artistic', -1), l('Uma geração inteira só conhece a casa pelo nome da marca — e a crítica lamenta.', 'A whole generation only knows the venue by the brand name — and critics lament it.')) }] });
registerConseq18('ib:nm19_renew:lapse', { later: [{ in: [2, 6], p: 0.3, tone: 'good', hint: l('Nome de volta, história de volta.', 'Name back, history back.'), fx: (f) => (f.fans(1).rep('artistic', 1), l('Noite de reinauguração com o nome antigo vira festa da cidade.', 'A reopening night under the old name becomes a city party.')) }] });

// ---------------------------------------------------------------- ouvintes
// venda: reputação do lugar cai com os puristas; manchete pequena
onFact('naming_deal', (s, f) => {
  const x = nm19(s).d.find((y) => y.id === String(f.data?.nm ?? ''));
  if (!x) return;
  bumpRep(s, x.k, x.tgt, x.k === 'v' ? -5 : -4);
  headline19(s, f.text, 1);
  link19(s, 'naming', fmtL(l('"{n}" com nome de marca: reputação {d}, {v}/ano no caixa.', '"{n}" with a brand name: reputation {d}, {v}/year in cash.'), { n: nameOf(s, x.k, x.tgt), d: x.k === 'v' ? -5 : -4, v: usd19(x.fee) }));
}, 'naming19:rep');
// marca saiu: o nome antigo volta (reputação +2), manchete
onFact('naming_pulled', (s, f) => {
  const x = nm19(s).d.find((y) => y.id === String(f.data?.nm ?? ''));
  if (x) bumpRep(s, x.k, x.tgt, 2);
  headline19(s, f.text, 2);
}, 'naming19:back');
// cláusula de conduta: escândalo do selo, cancelamento do residente/cabeça de cartaz, incidente no festival
const live = (s: GameState) => nm19(s).d.filter((x) => !x.pulled && x.until > s.week);
onFact('scandal', (s, f) => { if (f.actors.includes('player') && f.severity >= 40) for (const x of live(s)) pullName19(s, x, l('escândalo do selo', 'label scandal'), f); }, 'naming19:scandal');
onFact('cancel_wave', (s, f) => {
  const act = f.actors[0];
  for (const x of live(s)) {
    const tied = x.k === 'v' ? v17(s).own.find((o) => o.id === x.tgt)?.actId === act : liveOf(s).fests.find((y) => y.id === x.tgt)?.lineup.some((u) => u.actId === act);
    if (tied) pullName19(s, x, l('cancelamento do artista da casa', 'the house artist\'s cancellation'), f);
  }
}, 'naming19:cancel');
onFact('crowd_incident', (s, f) => { const fid = String(f.data?.fest ?? ''); for (const x of live(s)) if (x.k === 'f' && x.tgt === fid) pullName19(s, x, l('incidente com o público', 'crowd incident'), f); }, 'naming19:crowd');

// ---------------------------------------------------------------- calendário e porquê
registerDeadline('naming19', (s, from, to) => live(s).flatMap((x) => [
  ...(x.next >= from && x.next <= to && x.next < x.until ? [{ id: `naming19-pay-${x.id}-${x.next}`, w: x.next, kind: 'money' as const, t: fmtL(l('{b} paga o ano do nome ({v})', '{b} pays the name\'s year ({v})'), { b: x.bname, v: usd19(x.fee) }), tone: 'good' as const, goto: { area: 'firm19' } }] : []),
  ...(x.until >= from && x.until <= to ? [{ id: `naming19-end-${x.id}`, w: x.until, kind: 'contract' as const, t: fmtL(l('Fim do nome {b} em "{n}"', '{b} name on "{n}" ends'), { b: x.bname, n: nameOf(s, x.k, x.tgt) }), tone: 'info' as const, goto: { area: 'firm19' } }] : []),
]));
registerExplain('nm19.fee', (s, c) => {
  const t = targets19(s).find((x) => x.k === c.k && x.id === String(c.id ?? '')), b = CBRANDS.find((x) => x.id === String(c.b ?? ''));
  if (!t || !b) return null;
  const { v, why } = nameFee19(s, t, b);
  return { title: fmtL(l('Nome de "{n}" para {b}', '"{n}" name for {b}'), { n: t.name, b: b.name }), value: v, fmt: 'money', parts: why, note: l('Por ano. Contrato de 5 anos sai 8% mais barato por ano. Reputação −5 (casa) / −4 (festival) na hora e −0,1/mês.', 'Per year. A 5-year deal is 8% cheaper per year. Reputation −5 (venue) / −4 (festival) at once and −0.1/month.') };
});
