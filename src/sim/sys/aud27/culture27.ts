// Rodada 27 (AUD2) — CULTURA QUE NASCE DO QUE VOCÊ FAZ. A cultura19 era um menu a cada 6 meses e duplicava o perfil
// emergente do identity. Agora a cultura DE FATO acumula pesos todo mês:
//  • o tom das suas decisões (echoes19: generosa → artista primeiro; arriscada → caos; enganosa/agressiva → lucro;
//    cautelosa → lucro/prestígio);
//  • o perfil e o estilo de liderança consolidados do identity (selo formador/palco → artista; hits/catálogo/
//    exportador → lucro; cena/tecnologia → caos; boutique/arquivo/político → prestígio; liderança paternalista,
//    pragmática, delegadora…);
//  • a balança da reputação (artística muito acima da comercial → prestígio; o contrário → lucro).
// Os pesos decaem 10% ao mês. Quando uma cultura domina por 3 meses seguidos e não é a da casa, a casa MUDA sozinha
// (deriva: sem o choque de −6 da troca por decreto). O menu continua: vira a cultura DECLARADA — empurra o peso dela
// (+3 na hora e +0,8 por mês) e só pode mudar a cada 12 meses (CUL_CD19). Enquanto a declarada não é a de fato, a
// equipe percebe a distância ("cartaz na parede"): lealdade −0,3 por mês e um aviso no terceiro mês.
// Sem sorteios (determinístico por construção).

import { l, type L } from '../../../data/world';
import { registerExplain, type WhyPart } from '../../explain18';
import { registerDecisionListener, registerExt4, registerSimHook } from '../../ext4';
import { emitFact, onFact } from '../../facts17';
import type { GameState } from '../../types';
import { fmtL, notify } from '../../util';
import { CUL19, cul19, type Cul19 } from '../culture19';
import { optTone19, type OptTone19 } from '../echoes19';
import { headline19 } from '../factlink19';
import { ident } from '../identity';
import { link19, log19 } from '../mkb19';
import { P } from '../people/state';
import { OFF_AUD27 } from './off';
import { addStaffLoyalty } from '../../opinion';

const N = (pt: string, en: string): L => l(pt, en);
const KS: Cul19[] = ['artist', 'profit', 'prestige', 'chaos'];
export interface Cul27State { w: Record<Cul19, number>; decl: Cul19 | null; top: Cul19 | null; run: number; gap: number; n: number }
declare module '../../ext4' { interface Ext4 { cul27: Cul27State } }
const zero = (): Record<Cul19, number> => ({ artist: 0, profit: 0, prestige: 0, chaos: 0 });
const fresh = (): Cul27State => ({ w: zero(), decl: null, top: null, run: 0, gap: 0, n: 0 });
registerExt4('cul27', fresh);
export function cul27(s: GameState): Cul27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.cul27 ??= fresh()) as Cul27State;
  st.w ??= zero(); st.run ??= 0; st.gap ??= 0; st.n ??= 0;
  if (st.decl === undefined) st.decl = null;
  if (st.top === undefined) st.top = null;
  return st;
}

/** Peso de cada tom de decisão nas culturas. */
export const TONE_CUL27: Record<OptTone19, Partial<Record<Cul19, number>>> = {
  generous: { artist: 2 }, risky: { chaos: 1.1 }, deceitful: { profit: 1.5, chaos: 0.5 }, aggressive: { profit: 1.5 }, cautious: { profit: 0.8, prestige: 1 },
};
/** Perfil consolidado do identity → cultura (por mês). */
export const PROF_CUL27: Record<string, Partial<Record<Cul19, number>>> = {
  hits: { profit: 0.8 }, catalog: { profit: 0.6 }, export: { profit: 0.6 }, dev: { artist: 0.8 }, live: { artist: 0.6 }, scene: { chaos: 0.5, artist: 0.3 },
  tech: { chaos: 0.6 }, hifi: { prestige: 0.8 }, archive: { prestige: 0.7 }, political: { prestige: 0.4, chaos: 0.3 }, sync: { profit: 0.6 }, gospel: { artist: 0.3, prestige: 0.3 }, regional: { artist: 0.4 },
};
export const LEAD_CUL27: Record<string, Partial<Record<Cul19, number>>> = {
  artistFirst: { artist: 0.8 }, pragmatic: { profit: 0.7 }, paternal: { artist: 0.4, prestige: 0.3 }, delegator: { chaos: 0.5 }, controller: { profit: 0.5, prestige: 0.3 },
};
const add = (st: Cul27State, w: Partial<Record<Cul19, number>>, k = 1) => { for (const c of KS) st.w[c] = Math.round((st.w[c] + (w[c] ?? 0) * k) * 100) / 100; };

registerDecisionListener('culture27', (s, eventId, optionId) => {
  if (OFF_AUD27.culture) return;
  const t = optTone19(eventId, optionId);
  if (t) { const st = cul27(s); add(st, TONE_CUL27[t]); st.n++; }
});

/** Cultura que as decisões mostram (null enquanto nenhuma domina). */
export function actualCulture27(s: GameState): Cul19 | null {
  const st = cul27(s);
  const r = KS.map((c) => [c, st.w[c]] as [Cul19, number]).sort((a, b) => b[1] - a[1]);
  return r[0][1] >= 4 && r[0][1] - r[1][1] >= 1.5 ? r[0][0] : null;
}

export function cultureMonth27(s: GameState): void {
  const st = cul27(s), c19 = cul19(s), id = ident(s);
  for (const c of KS) st.w[c] = Math.round(st.w[c] * 0.9 * 100) / 100;
  if (id.cur) add(st, PROF_CUL27[id.cur] ?? {});
  if (id.lead) add(st, LEAD_CUL27[id.lead] ?? {});
  const R = s.player.reputation;
  if (R.artistic - R.commercial > 15) add(st, { prestige: 0.4 });
  else if (R.commercial - R.artistic > 15) add(st, { profit: 0.4 });
  if (st.decl) add(st, { [st.decl]: 0.8 });
  const top = actualCulture27(s);
  st.run = top && top === st.top ? st.run + 1 : top ? 1 : 0;
  st.top = top;
  // deriva: a casa vira o que você faz
  if (top && top !== c19.c && st.run >= 3) {
    const prev = c19.c;
    c19.prev = prev; c19.c = top; // `since` fica: a deriva não trava o menu (só a troca por decreto tem recarga)
    const tx = fmtL(prev ? N('Sem decreto nenhum, {c} virou outra casa: de "{a}" para "{b}" — é o que as decisões mostram.', 'Without any decree, {c} became a different house: from "{a}" to "{b}" — it is what the decisions show.')
      : N('{c} ganhou uma cultura sem ninguém decretar: "{b}".', '{c} found a culture without anyone decreeing it: "{b}".'), { c: s.config.companyName, a: prev ? CUL19[prev].name : '', b: CUL19[top].name });
    log19(s, c19, tx);
    // data.prev vazio: a deriva não dá o choque de −6 da troca por decreto (ouvinte culture19:staff)
    emitFact(s, { kind: 'culture_shift', actors: ['player'], severity: 15, visibility: 'rumor', tags: ['culture19', top, 'drift', ...(prev ? [`from:${prev}`] : [])], text: tx, src: 'culture27', data: { c: top, prev: '', from: prev ?? '' } });
    headline19(s, tx, 1);
  }
  // distância entre o que se declara e o que se faz
  if (st.decl && c19.c && st.decl !== c19.c) {
    st.gap++;
    for (const m of s.player.staff) if (P(s).career[m.id]) addStaffLoyalty(s, m.id, -0.3);
    if (st.gap === 3) {
      const t = fmtL(N('A equipe comenta: "{d}" é cartaz na parede; aqui se vive "{a}".', 'The staff say: "{d}" is a poster on the wall; here people live "{a}".'), { d: CUL19[st.decl].name, a: CUL19[c19.c].name });
      notify(s, t, 'bad');
      link19(s, 'culture', t);
    }
  } else st.gap = 0;
}
registerSimHook('month', 'culture27', (s) => { if (!OFF_AUD27.culture) cultureMonth27(s); });

// troca por decreto (menu) = cultura declarada
onFact('culture_shift', (s, f) => {
  if (f.tags.includes('drift')) return;
  const c = String(f.data?.c ?? '') as Cul19;
  if (!CUL19[c]) return;
  const st = cul27(s);
  st.decl = c; st.gap = 0;
  add(st, { [c]: 3 });
}, 'culture27:declared');

registerExplain('cul27', (s) => {
  const st = cul27(s), top = actualCulture27(s);
  const parts: WhyPart[] = KS.map((c) => ({ label: CUL19[c].name, value: Math.round(st.w[c] * 10) / 10, fmt: 'num' as const, tone: c === top ? 'good' as const : undefined }));
  if (st.decl) parts.push({ label: fmtL(N('Declarada: {c}', 'Declared: {c}'), { c: CUL19[st.decl].name }), value: st.gap, fmt: 'num', tone: st.gap ? 'bad' : undefined });
  return { title: N('Cultura de fato', 'Actual culture'), value: top ? CUL19[top].name.pt : '—', fmt: 'text', parts,
    note: N('Pesos que as suas decisões (tom), o perfil e a liderança do identity e a reputação acumulam; decaem 10% ao mês. Domina 3 meses seguidos → a casa muda sozinha. Declarada diferente da de fato: lealdade −0,3/mês.',
      'Weights accumulated by your decisions (tone), identity\'s profile and leadership, and reputation; they decay 10% a month. Dominant for 3 straight months → the house changes on its own. Declared different from actual: loyalty −0.3/month.') };
});
