// Rodada 28 (Fase 8) — CADEIAS DE HISTÓRIA 1, 2 E 5 EM PARTIDAS REAIS. As cadeias do plano19 §9 (ux19data CHAINS19)
// só fechavam nos testes forçados: em 10 partidas × 20 anos a 1 fechou 1 vez, a 2 nunca passou do revival, e o leilão /
// a briga de herdeiros / o holograma da 5 dependiam de sorte rara. Aqui um "Mestre das cadeias" acompanha o progresso
// (ux19.ch) e, quando a cadeia EMPACA num elo por mais de 10 meses, empurra o elo seguinte PELOS PRÓPRIOS SISTEMAS —
// nada de fato inventado: cada passo chama a função do sistema dono, que aplica os efeitos de sempre e emite o fato.
//   c1: tributo (tribute19.birth19) → sósia contratado (soundalike19) → documentário (documentary19) → crédito do músico
//       de estúdio (session19: DOC_K19 multiplica a chance do documentário da turma).
//   c2: um FIO por partida — um single antigo que fracassou (de um selo NPC, para não mexer no seu caixa sem você):
//       remix de clube (resolveRemix19) → comercial (takeAd19 'license') → needle drop (needle19) → revival
//       (stage19 com o calor que falta) → certificação tardia (o revival do fio vende o que falta para o ouro).
//   c5: modelo-assinatura (signature19) → [morte: nunca forçada] → relíquia → processo dos herdeiros (suit19) →
//       holograma (post18: ALT_K18 multiplica a chance da história alternativa).
// Uma ajuda por cadeia a cada 10 meses no máximo, sorteio próprio (Rng.fromSeed por cadeia e mês). Desligável
// (OFF_CH28) para medir o "natural". O modo histórico exato não recebe ajuda.

import { Rng } from '../../core/rng';
import { l } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState, Release } from '../types';
import { actsNow27 } from '../tickcache27';
import { estates19, suit19 } from './afterlife19';
import { adOpen19, brandsNow19, adFee19, takeAd19 } from './adsync19';
import { mainGear19, signature19, g19 } from './gear19';
import { ALT_K18 } from './post18';
import { remixOpen19, remixable19, resolveRemix19, rmx19 } from './remix19';
import { activeRev19, rv19, stage19, HEAT19, lateCert19 } from './revival19';
import { needle19 } from './score19';
import { DOC_K19 } from './session19';
import { birth19, documentary19, live19, soundalike19, t19 } from './tribute19';
import { CHAINS19 } from './ux19data';
import { ux19 } from './ux19';

export const CH28 = ['c1', 'c2', 'c5'] as const;
export type Ch28 = (typeof CH28)[number];
export interface Chains28State { last: Record<string, number>; seen: Record<string, number>; nudges: Record<string, number>; rel2?: string; log: [number, string, number][]; /** elo à espera com chance multiplicada (guardado no save) */ boost: Record<string, number> }
declare module '../ext4' { interface Ext4 { ch28: Chains28State } }
const fresh = (): Chains28State => ({ last: {}, seen: {}, nudges: {}, log: [], boost: {} });
registerExt4('ch28', fresh);
export function ch28(s: GameState): Chains28State {
  const x = s.x4 as unknown as { ch28?: Chains28State };
  const st = (x.ch28 ??= fresh());
  st.last ??= {}; st.seen ??= {}; st.nudges ??= {}; st.log ??= []; st.boost ??= {};
  return st;
}
export const OFF_CH28: { on?: boolean } = {};
/** Meses parado num elo antes da ajuda. */
export const STALL28 = 10;

/** Próximo elo da cadeia (índice) ou -1 se completa. */
export function nextStep28(s: GameState, id: string): number {
  const c = CHAINS19.find((x) => x.id === id)!;
  const got = ux19(s).ch[id] ?? [];
  for (let i = 0; i < c.steps.length; i++) if (!got.includes(i)) return i;
  return -1;
}
const exactHist = (s: GameState): boolean => (s.config as { mode?: string }).mode === 'historic';
const mine = (s: GameState, rel: Release): boolean => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;

// ---------------------------------------------------------------- empurrões por cadeia (true = o sistema agiu)

function c1(s: GameState, i: number, r: Rng): boolean {
  const st = t19(s);
  if (i === 1) {
    const a = actsNow27(s).filter((x) => x.fame >= 35 && (x.status === 'split' || x.status === 'retired') && live19(s, x.id).length < 3).sort((p, q) => q.fame - p.fame || (p.id < q.id ? -1 : 1))[0];
    return !!a && !!birth19(s, r, a);
  }
  if (i === 2) {
    const t = live19(s).filter((x) => x.sa && s.persons[x.sa]?.alive && s.acts[x.act] && !s.acts[x.act].playerBand && s.acts[x.act].owner !== 'player' && !st.hired[x.act]).sort((p, q) => q.sim - p.sim || (p.id < q.id ? -1 : 1))[0];
    return !!t && soundalike19(s, t.id) === null;
  }
  if (i === 3) {
    const id = Object.keys(st.hired).find((x) => s.acts[x]);
    if (!id) return false;
    delete st.doc[id];
    documentary19(s, id);
    return true;
  }
  if (i === 4) { ch28(s).boost.c1 = 4; return true; } // o documentário da turma fica bem mais provável até sair
  return false;
}

function pickRel2(s: GameState): Release | undefined {
  const cur = ch28(s).rel2 ? s.releases[ch28(s).rel2!] : undefined;
  if (cur) return cur;
  const pool = Object.values(s.releases).filter((x) => x.type === 'single' && !mine(s, x) && remixable19(s, x) && s.year - x.year >= 10 && x.q >= 45 && s.acts[x.actId]?.owner !== 'player')
    .sort((a, b) => b.totalUnits - a.totalUnits || (a.id < b.id ? -1 : 1));
  // fio: o mais vendido entre os que não viraram clássico (o "fracasso" relativo: peak fora do top 10)
  const rel = pool.find((x) => x.peak > 10) ?? pool[0];
  if (rel) ch28(s).rel2 = rel.id;
  return rel;
}
function c2(s: GameState, i: number, r: Rng): boolean {
  const rel = pickRel2(s);
  if (!rel) return false;
  const a = s.acts[rel.actId];
  if (!a) return false;
  if (i === 0) {
    if (!remixOpen19(s)) return false;
    const st = rmx19(s);
    const x = { id: `rx${++st.seq}`, rel: rel.id, dj: '', djn: s.year >= 1990 ? 'DJ' : 'Disco DJ', w: s.week, due: s.week, k: 'club' as const, split: 0 };
    st.rx.push(x);
    resolveRemix19(s, x, r, true);
    return true;
  }
  if (i === 1) {
    if (!adOpen19(s, 'license')) return false;
    const bs = brandsNow19(s, 'license');
    if (!bs.length) return false;
    const b = r.pick(bs);
    return takeAd19(s, a.id, b.id, 'license', adFee19(s, a, b, 'license'), rel.id) === null;
  }
  if (i === 2) return needle19(s, rel.id, s.year >= 1990 ? l('uma série de TV', 'a TV series').pt : l('um filme', 'a film').pt, 0) === null;
  if (i === 3) {
    const c = rv19(s).c[rel.id];
    return !!stage19(s, rel.id, 'series', Math.max(0, HEAT19 - (c?.h ?? 0)));
  }
  if (i === 4) {
    // o revival do fio vende o bastante para o ouro (o resto do caminho até 500 mil vem do revival em curso)
    const rv = activeRev19(s).find((x) => x.rel === rel.id);
    if (rv && rel.totalUnits < 5e5) { rv.mul = Math.max(rv.mul, Math.min(6, 1 + (5e5 - rel.totalUnits) / Math.max(1, rv.base * 4))); return false; }
    return lateCert19(s, rel);
  }
  return false;
}

function c5(s: GameState, i: number, r: Rng): boolean {
  if (i === 0) {
    const a = actsNow27(s).filter((x) => x.fame >= 50 && x.owner !== 'player' && !x.playerBand).sort((p, q) => q.fame - p.fame || (p.id < q.id ? -1 : 1));
    for (const x of a.slice(0, 12)) for (const pid of x.members) if (s.persons[pid]?.alive && mainGear19(s, pid) && !g19(s).sig[pid]) return signature19(s, pid, r, true) === null;
    return false;
  }
  if (i === 3) {
    const e = estates19(s).find((x) => !x.suit && s.acts[x.act]);
    return !!e && !!suit19(s, e.pid, 'heirs');
  }
  if (i === 4) { ch28(s).boost.c5 = 4; return true; } // a história alternativa (holograma de lenda) fica mais provável
  return false; // morte e relíquia: nunca forçadas
}

const RUN: Record<Ch28, (s: GameState, i: number, r: Rng) => boolean> = { c1, c2, c5 };

/** Um mês do Mestre das cadeias (exportado para testes). */
export function chainsMonth28(s: GameState): void {
  if (OFF_CH28.on || exactHist(s)) return;
  const st = ch28(s);
  for (const id of CH28) {
    const i = nextStep28(s, id);
    if (i < 0) continue;
    if (st.seen[id] !== i) { st.seen[id] = i; st.last[id] = s.week; delete st.boost[id]; continue; }
    if (st.boost[id] === i) continue; // já esperando com a chance multiplicada
    if (s.week - (st.last[id] ?? s.week) < STALL28 * 4.33) continue;
    if (i === 0 && id !== 'c5' && id !== 'c2') continue; // a separação (c1) nasce sozinha
    const r = Rng.fromSeed(`${s.config.seed}|ch28|${id}|${s.year}-${s.month}`);
    if (!r.chance(0.35)) continue;
    const ok = RUN[id](s, i, r);
    if (ok) {
      st.last[id] = s.week;
      st.nudges[id] = (st.nudges[id] ?? 0) + 1;
      st.log.unshift([s.week, id, i]);
      if (st.log.length > 30) st.log.length = 30;
    }
  }
}
// multiplicadores lidos pelos sistemas (estado no save: carregar no meio não muda nada)
DOC_K19.f = (s) => (ch28(s).boost.c1 === 4 ? 8 : 1);
ALT_K18.f = (s) => (ch28(s).boost.c5 === 4 ? 8 : 1);
registerSimHook('month', 'ch28', (s) => chainsMonth28(s));
