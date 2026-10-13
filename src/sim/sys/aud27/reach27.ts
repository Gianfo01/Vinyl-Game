// Rodada 27 (AUD2) — FATOS QUE SÓ O EMISSOR OUVIA ganham reação de fora. O audit27 achou 115 tipos de fato cujo
// único ouvinte é o próprio sistema (quase todos da R19). Os mais frequentes no bot (audit27_run.json) agora mexem
// em fama/fãs, vendas (bolsa), relações, manchetes e nas cenas (scenes27) e rivais (rivals27) da R27:
//   tribute_born (28)      → nostalgia: fãs casuais do original +1% (+ embalo se ativo); manchete se famoso; selo
//                            dono do original ganha reputação comercial.
//   tribute_licensed (16)  → royalties chegam: ato seu confia mais; você pagando direitos → reputação com artistas.
//   tribute_sued (1)       → processar o tributo: reputação com artistas −1, fãs casuais do original −0,5%.
//   cert_award (20)        → ação do dono na bolsa (+2/+4/+6%), confiança do ato seu; platina+ sua = inveja do rival
//                            mais quente (rivals27).
//   cowrite_split (34)     → divisão de autoria mexe na banda: igualitária = moral; "do líder" = ressentimento e
//                            relação com o líder; corte no crédito = ressentimento do autor; ghost creditado = moral.
//   zine_founded (13)      → a cena da cidade/gênero esquenta (scenes27) e seus atos de lá ganham embalo.
//   ghost_band (8)         → banda-fantasma confunde o público do ato real: embalo −2, fãs casuais −1%.
//   contest_winner (6)     → vencedor sem selo e com nome (fama ≥ 20) vira alvo do mercado (world18 courtNewcomer18);
//                            cena esquenta.
//   judge_feud (1)         → quem foi humilhado ganha simpatia (embalo +3); o jurado perde fama; líderes brigam.
//   choir_alumni (5)       → coral forma gente: embalo do ato e calor da cena local.
//   legend (21)            → lenda póstuma: fãs casuais +3%; ação do selo dono +3%; seu selo: reputação comercial.
//   revival_hit (1)        → ação do dono +3%; ato seu confia mais; a cena do gênero na cidade esquenta.
//   catalog_rerelease (1)  → núcleo de fãs do ato +1%.
// Sorteios: nenhum (efeitos fixos). Ordem estável (ids ordenados). Recarga por ato (reach27.cd): a mesma reação não
// empilha a cada canção/tributo do mesmo ato (divisão de autoria, tributo, banda-fantasma: 6 meses; inveja do rival: 1 ano).

import { clamp } from '../../../core/rng';
import { familyOf, l, type L } from '../../../data/world';
import { registerExt4 } from '../../ext4';
import { onFact, type Fact } from '../../facts17';
import type { Act, GameState } from '../../types';
import { fmtL } from '../../util';
import { bolsa, OWN } from '../bolsa10';
import { headline19 } from '../factlink19';
import { grudge27 } from '../rivals27';
import { sc27, alive27 } from '../scenes27';
import { courtNewcomer18 } from '../world18';
import { shockStocks27 } from './macro27';
import { OFF_AUD27, OFF_KIND27 } from './off';
import { actsNow27 } from '../../tickcache27';

const N = (pt: string, en: string): L => l(pt, en);
/** recarga por chave (ato:tipo) — a mesma reação não empilha a cada canção/fato do mesmo ato */
export interface Reach27State { cd: Record<string, number> }
declare module '../../ext4' { interface Ext4 { reach27: Reach27State } }
registerExt4('reach27', () => ({ cd: {} }));
function ready(s: GameState, key: string, weeks: number): boolean {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.reach27 ??= { cd: {} }) as Reach27State;
  st.cd ??= {};
  if ((st.cd[key] ?? -Infinity) > s.week) return false;
  st.cd[key] = s.week + weeks;
  const ks = Object.keys(st.cd);
  if (ks.length > 400) for (const k of ks) if (st.cd[k] <= s.week) delete st.cd[k];
  return true;
}
const act0 = (s: GameState, f: Fact): Act | undefined => f.actors.map((id) => s.acts[id]).find(Boolean);
const live = (a: Act) => a.status === 'active' || a.status === 'emerging';
const rep = (s: GameState, k: keyof GameState['player']['reputation'], d: number) => { s.player.reputation[k] = clamp(s.player.reputation[k] + d, 0, 100); };
const fans = (a: Act, k: 'casual' | 'core', pct: number, add = 0) => { a.fans[k] = Math.max(0, Math.round(a.fans[k] * (1 + pct) + add)); };
const mood = (s: GameState, ids: string[], k: 'morale' | 'resentment', d: number) => { for (const id of ids) { const p = s.persons[id]; if (p?.alive) p[k] = clamp(p[k] + d, 0, 100); } };
/** Ação do dono do ato na bolsa (selo listado ou o seu, se listado). */
function stockOf(s: GameState, a: Act, k: number): void {
  if (!a.owner) return;
  const b = bolsa(s);
  if (a.owner === 'player') { if (s.listing?.listed) shockStocks27(s, k, (id) => id === OWN); return; }
  const id = `lb:${a.owner}`;
  if (b.q[id] && !b.q[id].dead) shockStocks27(s, k, (x) => x === id);
}
/** Cenas vivas do gênero numa cidade esquentam (scenes27). */
export function warmScene27(s: GameState, city: string | undefined, genre: string | undefined, d: number, t: L): number {
  if (!city || !genre) return 0;
  let n = 0;
  for (const sc of sc27(s).list) {
    if (!alive27(sc) || !(sc.genre === genre || sc.gs.includes(genre))) continue;
    if (sc.city !== city && !sc.cities.some((c) => c.c === city)) continue;
    sc.heat = clamp(sc.heat + d, 0, 100);
    sc.log.unshift({ y: s.year, m: s.month, t }); if (sc.log.length > 30) sc.log.length = 30;
    n++;
  }
  return n;
}

onFact('tribute_born', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.tribute_born) return;
  const a = s.acts[f.actors[0]];
  if (!a || !ready(s, `trib:${a.id}`, 26)) return;
  fans(a, 'casual', 0.01, 300 * (a.fame / 50));
  if (live(a)) a.momentum = clamp(a.momentum + 2, -100, 100);
  if (a.owner === 'player') rep(s, 'commercial', 0.5);
  if (a.fame >= 60) headline19(s, f.text, 1);
}, 'reach27:tribute');
onFact('tribute_licensed', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.tribute_licensed) return;
  const a = s.acts[f.actors[0]];
  if (a?.owner === 'player') a.trust = clamp(a.trust + 2, 0, 100);
  if (f.actors[1] === 'player') rep(s, 'artists', 1);
}, 'reach27:licensed');
onFact('tribute_sued', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.tribute_sued) return;
  if (f.actors[0] !== 'player') return;
  rep(s, 'artists', -1);
  const a = act0(s, f);
  if (a) fans(a, 'casual', -0.005);
}, 'reach27:sued');

onFact('cert_award', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.cert_award) return;
  const a = s.acts[f.actors[0]];
  if (!a) return;
  const n = Number(f.data?.n ?? 1);
  stockOf(s, a, n >= 99 ? 0.06 : n >= 2 ? 0.04 : 0.02);
  if (a.owner !== 'player') return;
  a.trust = clamp(a.trust + 2, 0, 100);
  if (n < 2) return;
  const lb = Object.entries(s.rivalries).filter(([id, v]) => v > 0 && s.labels[id]?.active).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0]?.[0];
  if (lb && ready(s, `certg:${lb}`, 52)) grudge27(s, lb, 2, fmtL(N('o certificado de {a} na parede de vocês', '{a}\'s certificate on your wall'), { a: a.name }));
}, 'reach27:cert');

onFact('cowrite_split', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.cowrite_split) return;
  const a = s.acts[f.actors[0]];
  if (!a) return;
  const mode = ['band', 'lead', 'writers', 'cut_in', 'ghost'].filter((k) => f.tags.includes(k)).join('+');
  if (!mode || !ready(s, `split:${a.id}:${mode}`, 26)) return; // uma reação por ato e tipo de divisão a cada 6 meses
  const writers = f.actors.slice(1).filter((id) => s.persons[id]);
  const others = a.members.filter((m) => !writers.includes(m));
  if (f.tags.includes('band')) mood(s, a.members, 'morale', 1);
  else if (f.tags.includes('lead')) {
    mood(s, others, 'resentment', 3);
    const ld = writers[0] ? s.persons[writers[0]] : undefined;
    if (ld) for (const m of others) { const p = s.persons[m]; if (p) { p.rel[ld.id] = clamp((p.rel[ld.id] ?? 0) - 3, -100, 100); ld.rel[m] = clamp((ld.rel[m] ?? 0) - 1, -100, 100); } }
  } else if (f.tags.includes('writers')) mood(s, others, 'resentment', 1);
  if (f.tags.includes('cut_in')) mood(s, writers.slice(0, 1), 'resentment', 4);
  if (f.tags.includes('ghost')) mood(s, writers.slice(0, 1), 'morale', 5);
}, 'reach27:split');

onFact('zine_founded', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.zine_founded) return;
  const g = String(f.data?.g ?? f.tags[2] ?? '');
  const t = N('Um fanzine novo escreve sobre a cena.', 'A new fanzine writes about the scene.');
  warmScene27(s, f.place, g, 2, t);
  for (const a of actsNow27(s)) if (a.owner === 'player' && a.city === f.place && (a.genre === g || familyOf(a.genre) === g) && live(a)) a.momentum = clamp(a.momentum + 1, -100, 100);
  if (f.actors.includes('player')) rep(s, 'artistic', 0.5);
}, 'reach27:zine');

onFact('ghost_band', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.ghost_band) return;
  const a = s.acts[f.actors[0]];
  if (!a || !ready(s, `ghost:${a.id}`, 26)) return;
  if (live(a)) a.momentum = clamp(a.momentum - 2, -100, 100);
  fans(a, 'casual', -0.01);
  if (a.owner === 'player') a.trust = clamp(a.trust - 1, 0, 100);
}, 'reach27:ghost');

onFact('contest_winner', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.contest_winner) return;
  const a = f.actors.map((id) => s.acts[id]).find(Boolean);
  if (!a) return;
  warmScene27(s, a.city, a.genre, 1, fmtL(N('{a} vence um concurso e puxa gente para o som.', '{a} wins a contest and draws people to the sound.'), { a: a.name }));
  // só quem já tem nome (fama ≥ 20) atrai um selo rival; você é avisado se conhece o ato e pode disputar
  if (!a.owner && live(a) && a.fame >= 20) courtNewcomer18(s, a, undefined, N('venceu um concurso', 'won a contest'));
}, 'reach27:contest');
onFact('judge_feud', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.judge_feud) return;
  const [j, lo] = [s.acts[f.actors[0]], s.acts[f.actors[1]]];
  if (lo && live(lo)) lo.momentum = clamp(lo.momentum + 3, -100, 100);
  if (j) j.fame = clamp(j.fame - 1, 0, 100);
  const pj = j?.leaderId ?? j?.members[0], pl = lo?.leaderId ?? lo?.members[0];
  if (pj && pl && s.persons[pj] && s.persons[pl]) { s.persons[pj].rel[pl] = clamp((s.persons[pj].rel[pl] ?? 0) - 10, -100, 100); s.persons[pl].rel[pj] = clamp((s.persons[pl].rel[pj] ?? 0) - 15, -100, 100); }
}, 'reach27:judge');
onFact('choir_alumni', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.choir_alumni) return;
  const a = act0(s, f);
  if (!a) return;
  if (live(a)) a.momentum = clamp(a.momentum + 2, -100, 100);
  warmScene27(s, f.place ?? a.city, a.genre, 1, N('Ex-alunos do coral entram na cena.', 'Choir alumni join the scene.'));
}, 'reach27:choir');

onFact('legend', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.legend) return;
  const a = s.acts[f.actors[0]];
  if (!a) return;
  fans(a, 'casual', 0.03);
  stockOf(s, a, 0.03);
  if (a.owner === 'player') rep(s, 'commercial', 1);
}, 'reach27:legend');
onFact('revival_hit', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.revival_hit) return;
  const a = s.acts[f.actors[0]];
  if (!a) return;
  stockOf(s, a, 0.03);
  if (a.owner === 'player') a.trust = clamp(a.trust + 3, 0, 100);
  warmScene27(s, a.city, a.genre, 1, fmtL(N('O revival de {a} reacende o som.', '{a}\'s revival rekindles the sound.'), { a: a.name }));
}, 'reach27:revival');
onFact('catalog_rerelease', (s, f) => {
  if (OFF_AUD27.reach || OFF_KIND27.catalog_rerelease) return;
  const a = s.acts[f.actors[0]];
  if (a) fans(a, 'core', 0.01);
}, 'reach27:rerelease');
