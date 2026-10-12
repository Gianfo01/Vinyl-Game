// Rodada 27 (AUD2) — CRÍTICOS COM MEMÓRIA. A relação selo × crítico (criticrel) só mudava por verbo pago (cópia
// antecipada, jantar, réplica) e ficou parada em 8 lançamentos de 2 anos. Agora ela anda sozinha:
//  • HISTÓRICO DE RESENHAS: quem deu nota alta a um disco seu passa a defender o selo (+3, e +1 se o gênero é o
//    favorito dele); quem detonou (≤ 4,5) se compromete com a tese (−2; −1 a mais se é gênero que ele despreza);
//  • ESCÂNDALOS do seu selo/elenco: críticos de prestígio (≥ 70) se afastam (−3); os populares (mainstream ≥ 0,5)
//    adoram o barulho (+1) — escolhidos pelo conteúdo do fato (factSeedKey17), não pelo id;
//  • DECLARAÇÕES / ENTREVISTAS (fato `statement` com você): uma boa entrevista aproxima 2 críticos (+1); polêmica
//    afasta (−1);
//  • JABÁ exposto (`payola` público): todos −4; CONFLITO DE INTERESSE na sua revista (zines19): todos −3;
//    crítico que vira editor da SUA revista: +12;
//  • TEMPO: todo mês a relação volta 3% para o zero (rancores e simpatias esfriam).
// Cruzar ±25 vira manchete ("passa a defender" / "vira desafeto"). Os porquês ficam no persona13 (opine 'c:').

import { Rng } from '../../../core/rng';
import { familyOf, l, type L } from '../../../data/world';
import { critRel } from '../../criticrel';
import { registerExt4, registerSimHook } from '../../ext4';
import { factSeedKey17, onFact, type Fact } from '../../facts17';
import { activeCritics, criticByName } from '../../media';
import type { GameState } from '../../types';
import { fmtL, playerActs } from '../../util';
import { headline19 } from '../factlink19';
import { opine, p13 } from '../persona13';
import { OFF_AUD27 } from './off';

const N = (pt: string, en: string): L => l(pt, en);
export interface Crit27State { seen: Record<string, 1>; band: Record<string, -1 | 0 | 1> }
declare module '../../ext4' { interface Ext4 { crit27: Crit27State } }
registerExt4('crit27', () => ({ seen: {}, band: {} }));
export function crit27(s: GameState): Crit27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.crit27 ??= { seen: {}, band: {} }) as Crit27State;
  st.seen ??= {}; st.band ??= {};
  return st;
}
const nudge = (s: GameState, critic: string, d: number, why: L): void => { if (d) opine(s, `c:${critic}`, d, why); };
const mineIds = (s: GameState): Set<string> => new Set(['player', ...playerActs(s)]);
const touchesMe = (s: GameState, f: Fact): boolean => { const m = mineIds(s); return f.actors.some((a) => m.has(a)); };

/** Resenhas novas dos seus lançamentos → relação com quem resenhou. */
export function reviewHistory27(s: GameState): number {
  const st = crit27(s);
  let n = 0;
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    for (const rid of (a?.releases ?? []).slice(-6)) {
      const rel = s.releases[rid];
      if (!rel || st.seen[rid] || s.week - rel.week > 26) continue;
      const rv = s.reviews[rid];
      if (!rv?.length) continue;
      st.seen[rid] = 1; n++;
      const fam = familyOf(a.genre);
      for (const x of rv) {
        const c = criticByName(x.critic);
        const fav = !!c?.favors.includes(fam), dis = !!c?.dislikes.includes(fam);
        if (x.score >= 8) nudge(s, x.critic, 3 + (fav ? 1 : 0), fmtL(N('Defendeu "{t}"', 'Championed "{t}"'), { t: rel.title }));
        else if (x.score <= 4.5) nudge(s, x.critic, -2 - (dis ? 1 : 0), fmtL(N('Detonou "{t}" e não volta atrás', 'Panned "{t}" and won\'t back down'), { t: rel.title }));
      }
    }
  }
  const ks = Object.keys(st.seen);
  if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete st.seen[k];
  return n;
}

/** Tempo: relação volta 3% ao zero; cruzar ±25 vira manchete (uma vez por faixa). */
export function critMonth27(s: GameState): void {
  reviewHistory27(s);
  const cr = critRel(s), st = crit27(s);
  for (const [k, v] of Object.entries(cr.rel)) {
    const nv = Math.round(v * 0.97 * 10) / 10;
    if (Math.abs(nv) < 0.5) delete cr.rel[k]; else cr.rel[k] = nv;
  }
  for (const c of activeCritics(s)) {
    const v = cr.rel[c.name] ?? 0, b: -1 | 0 | 1 = v >= 25 ? 1 : v <= -25 ? -1 : 0, was = st.band[c.name] ?? 0;
    if (b === was) continue;
    st.band[c.name] = b;
    if (!b) continue;
    headline19(s, fmtL(b > 0 ? N('{c} ({o}) passa a defender {l} nas resenhas.', '{c} ({o}) becomes a champion of {l} in reviews.') : N('{c} ({o}) vira desafeto de {l}.', '{c} ({o}) turns against {l}.'), { c: c.name, o: c.outlet, l: s.config.companyName }), 1);
  }
}
registerSimHook('month', 'critic27', (s) => { if (!OFF_AUD27.critic) critMonth27(s); });

/** Críticos escolhidos por um fato (semente pelo conteúdo do fato). */
function pickBy(s: GameState, f: Fact, n: number, pred: (c: ReturnType<typeof activeCritics>[number]) => boolean = () => true) {
  const pool = activeCritics(s).filter(pred).sort((a, b) => (a.name < b.name ? -1 : 1));
  if (!pool.length) return [];
  const r = Rng.fromSeed(`${s.config.seed}:critic27:${factSeedKey17(f)}`);
  return r.shuffle(pool).slice(0, n);
}

onFact('scandal', (s, f) => {
  if (OFF_AUD27.critic) return;
  if (!touchesMe(s, f) || f.severity < 25) return;
  const why = N('Escândalo no selo', 'Scandal at the label');
  for (const c of pickBy(s, f, 3, (x) => x.prestige >= 70)) nudge(s, c.name, -3, why);
  for (const c of pickBy(s, f, 2, (x) => x.mainstream >= 0.5)) nudge(s, c.name, 1, N('Adora o barulho', 'Loves the noise'));
}, 'critic27:scandal');
onFact('statement', (s, f) => {
  if (OFF_AUD27.critic) return;
  if (!touchesMe(s, f)) return;
  const bad = f.tags.includes('bad');
  for (const c of pickBy(s, f, 2)) nudge(s, c.name, bad ? -1 : 1, bad ? N('Declaração infeliz', 'An unfortunate statement') : N('Boa entrevista', 'A good interview'));
}, 'critic27:statement');
onFact('payola', (s, f) => {
  if (OFF_AUD27.critic) return;
  if (f.visibility !== 'public' || !touchesMe(s, f)) return;
  for (const c of activeCritics(s)) nudge(s, c.name, -4, N('Jabá exposto', 'Payola exposed'));
}, 'critic27:payola');
onFact('conflict_interest', (s, f) => {
  if (OFF_AUD27.critic) return;
  for (const c of activeCritics(s)) nudge(s, c.name, -3, N('Conflito de interesse na revista do selo', 'Conflict of interest at the label\'s magazine'));
  const who = String(f.data?.c ?? '');
  if (who) nudge(s, who, -6, N('Ficou exposto(a) no conflito', 'Was exposed in the conflict'));
}, 'critic27:conflict');
onFact('critic_editor', (s, f) => {
  if (OFF_AUD27.critic) return;
  const who = String(f.data?.c ?? '');
  if (who && f.actors.includes('player')) nudge(s, who, 12, N('Editor(a) da sua revista', 'Editor of your magazine'));
}, 'critic27:editor');

/** Por que a relação está como está (últimos motivos do persona13). */
export function critWhy27(s: GameState, critic: string): L[] {
  const op = p13(s).op[`c:${critic}`];
  return (op?.w ?? []).slice(-3).reverse().map((w) => fmtL(N('{d} {t} ({y})', '{d} {t} ({y})'), { d: w[2] > 0 ? `+${w[2]}` : `${w[2]}`, t: w[3], y: w[0] }));
}
