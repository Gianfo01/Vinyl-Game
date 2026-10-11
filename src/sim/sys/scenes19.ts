// Rodada 19 (cenas) — QUANDO AS CENAS RODAM. Junta o calendário real dos prêmios (awardcal19), a cerimônia dos
// Gramófonos com os indicados OFICIAIS e a surpresa preservada, e o volume de cenas:
//  - Gramófonos: indicados em novembro (ceremonies8), figurino do tapete vermelho escolhido entre a indicação e a
//    cerimônia (inbox; pesa pouco no voto, com porquê no aw18.adj), vencedor sorteado na noite (fevereiro).
//  - O resultado (livro de prêmios, avisos de vitória/derrota, memória → cartão moment16, fatos → notícia/inbox, resumo
//    do período) só sai DEPOIS que a cena da cerimônia é vista. Sem interface (testes, bot) ou com cenas desligadas,
//    sai na hora (LIVE19.on = false).
//  - Crítica, indústria, ao vivo, regionais e Hall dos Ecos rodam no mês e desde o ano de fundação de cada um.
//  - Fila: picos de cenas menores são espalhados pelas semanas seguintes (no máx. 6 cenas por mês); a fila guarda até
//    60 não vistas e, acima disso, as menores mais antigas vão só para o álbum (com aviso-resumo).

import { l, type L } from '../../data/world';
import { CS_HOOK19, registerExt4, registerSimHook, type Cutscene } from '../ext4';
import { registerExplain } from '../explain18';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { publishGramo19, yearlyAwards, type GramoWin19 } from '../legacy';
import { yearlyAwards2 } from '../awards2';
import { hallOfFameYear } from '../dynasty';
import { ECHOES_CAL19, GRAMO_CAL19, calOf19, honoredYear19 } from '../awardcal19';
import { mineRel19, relAct19 } from '../mine19';
import type { GameState } from '../types';
import { fmtL, notify } from '../util';
import { AFTER_NOMS8, CEREMONY_MONTH, GRAMO_START, ceremonyNight, cer8, cycleYear } from './ceremonies8';
import { REL_ADJ19, voters18 } from './awards18';
import { FIT18, chooseFit18, cine18, fitsNow18, type Fit18 } from './cine18';
import { OFF_S17 } from './scene17';
import { awardsYear } from './scenes/awards';

// ---------------------------------------------------------------- estado

export interface Held19 { cs: string; w: number; year: number; wins: GramoWin19[]; notes: [L, 'good' | 'info'][] }
export interface Scn19St { held: Held19[]; later: Cutscene[]; mk: number; n: number; missed: number; done: number[] }
declare module '../ext4' { interface Ext4 { scn19: Scn19St } }
const fresh = (): Scn19St => ({ held: [], later: [], mk: -1, n: 0, missed: 0, done: [] });
registerExt4('scn19', fresh);
export function scn19(s: GameState): Scn19St {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.scn19 ??= fresh()) as Scn19St;
  st.held ??= []; st.later ??= []; st.done ??= [];
  return st;
}

/** A interface liga: o resultado da cerimônia espera a cena ser vista. Sem interface (testes, bot) sai na hora. */
export const LIVE19 = { on: false };
const live = () => LIVE19.on && !OFF_S17.auto;

// ---------------------------------------------------------------- resultado só depois da cerimônia

function publish(s: GameState, h: Held19): void {
  for (const w of h.wins) publishGramo19(s, w);
  for (const [t, k] of h.notes) notify(s, t, k);
}

/** Publica os resultados guardados: da cena `csId` (fechada agora) ou, sem id, os de cenas já vistas, sumidas ou velhas. */
export function releaseHeld19(s: GameState, csId?: string): number {
  const st = scn19(s);
  let n = 0;
  st.held = st.held.filter((h) => {
    const cs = (s.cutscenes ?? []).find((c) => c.id === h.cs);
    const go = csId ? h.cs === csId : !live() || !cs || !!cs.seen || s.week - h.w > 10;
    if (!go) return true;
    publish(s, h);
    n++;
    return false;
  });
  return n;
}
/** Há resultado de prêmio esperando a cerimônia ser vista? (a interface esconde do resumo) */
export const heldResults19 = (s: GameState): number => scn19(s).held.length;

/** Avisos de derrota e de vitória de cliente (empresário), montados com os indicados oficiais mostrados na cena. */
function notesOf(s: GameState, cs: Cutscene | null, year: number): Held19['notes'] {
  const out: Held19['notes'] = [];
  const cats = (cs?.data.cats ?? []) as { name: L; nominees: { name: string; mine: boolean; actId?: string }[]; winner: number }[];
  for (const c of cats) {
    const w = c.nominees[c.winner];
    if (!w) continue;
    if (w.mine && relAct19(s, w.actId) === 'client') out.push([fmtL(l('Gramófonos {y}: seu cliente {n} leva {c}!', 'Gramophones {y}: your client {n} takes {c}!'), { y: year, n: w.name, c: c.name }), 'good']);
    if (!w.mine) for (const n of c.nominees) if (n.mine) out.push([fmtL(l('Gramófonos {y}: {n} perdeu {c} para {w}.', 'Gramophones {y}: {n} lost {c} to {w}.'), { y: year, n: n.name, c: c.name, w: w.name }), 'info']);
  }
  return out;
}

/** Noite dos Gramófonos (fevereiro, ano homenageado = ano anterior): sorteio, show, cena e (talvez) o anúncio. */
function gramoNight(s: GameState, r: Parameters<typeof yearlyAwards>[1]): void {
  if (s.month !== CEREMONY_MONTH || s.year < GRAMO_START) return;
  const E = s.year - 1, st = scn19(s), noms = cer8(s).noms;
  if (!noms || noms.year !== E || st.done.includes(E)) return;
  st.done.push(E);
  if (st.done.length > 6) st.done.shift();
  const wins = yearlyAwards(s, r, E);
  ceremonyNight(s, E);
  const cs = awardsYear(s, r, E, wins.map((w) => ({ cat: w.cat, releaseId: w.e.releaseId, actId: w.e.actId })));
  if (cs) {
    // figurino escolhido entre a indicação e a cerimônia vale para a cena (sem escolha, o estilista vai de clássico)
    const c18 = cine18(s);
    c18.fit[`aw:${cs.id}`] = c18.fit[`gramo:${E}`] ?? 'classic';
  }
  const h: Held19 = { cs: cs?.id ?? '', w: s.week, year: E, wins, notes: notesOf(s, cs, E) };
  if (cs && live()) st.held.push(h);
  else publish(s, h);
}

// ---------------------------------------------------------------- figurino entre a indicação e a cerimônia

const FIT_KEY = (y: number) => `gramo:${y}`;
AFTER_NOMS8.push((s) => {
  const n = cer8(s).noms;
  if (!n || n.year !== s.year) return;
  const acts = [...new Set(Object.values(n.cats).flat().map((id) => s.releases[id!]).filter((x) => mineRel19(s, x)).map((x) => x!.actId))].map((id) => s.acts[id]).filter(Boolean);
  if (!acts.length) return;
  const best = acts.sort((a, b) => b.fame - a.fame)[0];
  const fits: Fit18[] = [...fitsNow18(s.year).filter((f) => f !== 'classic'), 'classic']; // o último é o padrão se ninguém responder
  pushInbox18(s, 'scn19_fit', {
    from: l('Figurinista', 'Stylist').pt,
    subject: fmtL(l('Tapete vermelho dos Gramófonos {y}: qual figurino para {a}?', '{y} Golden Gramophones red carpet: which outfit for {a}?'), { y: s.year, a: best.name }),
    body: l('A cerimônia é em fevereiro. A roupa muda as fotos, a imprensa e — um pouco — o voto: votantes veteranos premiam a elegância, jovens premiam a ousadia; grife emprestada soa "vendida". Sem resposta, vamos de clássico.', 'The ceremony is in February. The outfit changes the photos, the press and — a little — the vote: veteran voters reward elegance, young voters reward daring; a loaned designer look reads as "sold out". No answer means classic.'),
    actions: fits.map((f) => ({ id: f, label: FIT18[f].name })), ref: { act: best.id, y: s.year }, tone: 'info', weeks: 10,
  });
});
registerInboxKind('scn19_fit', { label: l('Prêmios', 'Awards'), cat: 'decision', icon: 'trophy', prio: 2, goto: () => ({ area: 'awards' }),
  handle: (s, m, a) => chooseFit18(s, FIT_KEY(Number(m.ref?.y ?? cycleYear(s))), a as Fit18, m.ref?.act ? String(m.ref.act) : undefined)?.out ?? l('O figurino já foi escolhido.', 'The outfit was already chosen.') });

/** Peso do figurino no voto final (pequeno; os indicados já tinham saído). */
export function fitVote19(s: GameState, f: Fit18): number {
  const v = voters18(s);
  return f === 'classic' ? (v.age > 50 ? 2 : 1) : f === 'bold' ? (v.young > 0.3 ? 1 : -1) : f === 'statement' ? (v.young > 0.3 ? 1.5 : -1.5) : -1;
}
REL_ADJ19.push((s, rel) => {
  const f = cine18(s).fit[FIT_KEY(cycleYear(s))];
  if (!f || !mineRel19(s, rel) || rel.year !== cycleYear(s)) return null;
  return [fmtL(l('Figurino no tapete vermelho: {f}', 'Red-carpet outfit: {f}'), { f: FIT18[f].name }), fitVote19(s, f)];
});

// ---------------------------------------------------------------- volume: espalhar picos e não perder cenas

/** Cenas menores (só mostram algo) que podem esperar algumas semanas num mês cheio. */
export const SPREAD19 = new Set(['moment16', 'review', 'factory', 'busfx', 'vignette', 'street', 'store', 'fair', 'videoset', 'goldfx', 'club', 'clinic']);
export const MONTH_CAP19 = 6, UNSEEN_CAP19 = 60;
const monthOf = (s: GameState, st: Scn19St) => { const mk = s.year * 12 + s.month; if (st.mk !== mk) { st.mk = mk; st.n = 0; } };
CS_HOOK19.hold = (s, cs) => {
  const st = scn19(s);
  monthOf(s, st);
  if (SPREAD19.has(cs.kind) && st.n >= MONTH_CAP19) {
    st.later.push(cs);
    if (st.later.length > 24) { st.later.shift(); st.missed++; }
    return true;
  }
  st.n++;
  return false;
};
CS_HOOK19.trim = (s) => {
  const q = s.cutscenes;
  if (q.length <= 40) return;
  // vistas saem primeiro; não vistas ficam até 60; acima disso as menores mais antigas vão só para o álbum
  for (let i = 0; i < q.length && q.length > 40;) { if (q[i].seen) q.splice(i, 1); else i++; }
  while (q.length > UNSEEN_CAP19) {
    const i = q.findIndex((c) => SPREAD19.has(c.kind));
    q.splice(i < 0 ? 0 : i, 1);
    scn19(s).missed++;
  }
};
function drain(s: GameState): void {
  const st = scn19(s);
  monthOf(s, st);
  if (!st.later.length || st.n >= MONTH_CAP19) return;
  const cs = st.later.shift()!;
  st.n++;
  (s.cutscenes ??= []).push(cs);
  CS_HOOK19.trim?.(s);
}

// ---------------------------------------------------------------- ganchos

registerSimHook('week', 'scenes19', (s) => {
  releaseHeld19(s);
  drain(s);
});
registerSimHook('month', 'scenes19', (s, r) => {
  yearlyAwards2(s, r); // crítica, indústria, ao vivo e regionais: cada um no seu mês e desde a fundação
  if (s.month === ECHOES_CAL19.month) hallOfFameYear(s); // Hall dos Ecos: abril, desde 1986
  gramoNight(s, r);
  const st = scn19(s);
  if (st.missed > 0) {
    if (LIVE19.on) notify(s, fmtL(l('{n} cenas menores deste período foram direto para o álbum (Cinemateca) para não atrasar o jogo.', '{n} minor scenes from this period went straight to the album (Cinemateca) so the game is not held up.'), { n: st.missed }), 'info');
    st.missed = 0;
  }
});

// ---------------------------------------------------------------- porquê

registerExplain('scn19.cal', (s, c) => {
  const cat = String(c.cat ?? 'record');
  const k = calOf19(cat);
  const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const ME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const gramo = k.id === GRAMO_CAL19.id;
  return {
    title: l('Calendário do prêmio', 'Award calendar'), value: s.year >= k.start ? l('existe', 'exists').pt : l('ainda não existe', 'not yet founded').pt, fmt: 'text',
    parts: [
      { label: l('Primeira cerimônia (dado real)', 'First ceremony (real data)'), value: String(k.start), fmt: 'text' as const },
      { label: l('Mês da cerimônia', 'Ceremony month'), value: `${M[k.month]} / ${ME[k.month]}`, fmt: 'text' as const },
      ...(gramo ? [{ label: l('Indicados anunciados', 'Nominees announced'), value: `${M[GRAMO_CAL19.nomsMonth ?? 10]} / ${ME[GRAMO_CAL19.nomsMonth ?? 10]}`, fmt: 'text' as const }] : []),
      { label: l('Ano homenageado agora', 'Honored year now'), value: String(gramo ? cycleYear(s) : honoredYear19(s.year, k.month)), fmt: 'text' as const },
    ],
    note: gramo
      ? l('Indicados em novembro, voto final e vencedor na noite de fevereiro. O resultado só aparece depois que você assiste à cerimônia.', 'Nominees in November, final vote and winner on the February night. The result only shows after you watch the ceremony.')
      : l('Antes da fundação o prêmio não existe; cerimônias do 1º semestre premiam o ano anterior.', 'Before it was founded the award does not exist; first-half ceremonies honor the previous year.'),
  };
});
