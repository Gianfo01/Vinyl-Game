// R33 (GESTÃO · 6) — APRENDIZADOS QUE ENSINAM. A biblioteca do learn31 (amostras dos seus lançamentos: vendeu × previsão,
// com os traços da decisão) passa a corrigir a previsão de vendas e as escolhas dos diretores. Interruptor `exp33.learn`
// (desligado no código: sem ele nada muda — multiplicador 1 exato e nenhuma escolha diferente).
//
// • Calibração: para o lançamento planejado, as amostras PARECIDAS (mesma família de gênero, mesmo tipo, traços em
//   comum — divulgação, rollout, expectativa, fim de ano…; as recentes valem mais) dizem quanto você costuma vender
//   acima ou abaixo da previsão. A média (em log) encolhe para "sem correção" quando há pouca amostra: k = exp(média ×
//   W/(W+3)), limitado a ±40%. Entra na previsão como fator de apelo só da previsão (market31 FORECAST31.appeal).
// • Sem eco: a amostra guarda o k que a previsão já trazia (learn31 `k`), e a conta usa a razão crua (vendeu ÷ previsão
//   sem calibração) — senão a correção se desfaria sozinha no lançamento seguinte.
// • Certeza: com amostra parecida, a faixa (mín–máx) pode encolher até 40% (`learnWidth33`); o mercado aplica pelo
//   gancho quando quiser (ver docs/r33/gestao.md).
// • Diretores: o A&R delegado dá até ±8 pontos na leitura de um ato pelo histórico do gênero dele no selo; o produtor
//   executivo troca o LP por single quando, no gênero do artista, os seus singles batem a previsão bem mais que os LPs.
// Só lê o jogo; sem sorteio. Estado em `x4.learn33` (k da previsão por lançamento, até virar amostra).

import { l } from '../../data/world';
import { familyOf } from '../../data/world';
import { LEARN31X } from '../deleg31';
import { registerSimHook } from '../ext4';
import { FORECAST31, isForecast31 } from '../r31/market31';
import { LEARN_MIN31, SAMP31X, samples31, traitsOf31, type Samp31 } from '../r31/learn31';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import type { Act, GameState, Release } from '../types';
import { playerActs } from '../util';

export const SW_LEARN33 = 'exp33.learn';
registerSwitch({
  id: SW_LEARN33, def: false, scope: 'game',
  desc: l('Versão 33 · aprendizados ensinam: a previsão de vendas se corrige pelo que os seus lançamentos parecidos venderam, e o A&R e o produtor executivo delegados escolhem pelo histórico. Desligado: tudo como antes.',
    'Version 33 · learnings teach: the sales forecast corrects itself by what your similar releases sold, and the delegated A&R and executive producer choose by the track record. Off: everything as before.'),
});
export const learnOn33 = (s: GameState): boolean => sw<boolean>(s, SW_LEARN33);
registerEditable({ id: `sw.${SW_LEARN33}`, area: 'tools', kind: 'bool', label: l('V33 · aprendizados corrigem previsão e diretores', 'V33 · learnings correct forecast and directors'),
  get: (s) => learnOn33(s), set: (s, v) => { setSw(s, SW_LEARN33, !!v); } });

/** Números da regra (editáveis no editor). */
export const LEARN33 = { cap: 0.4, prior: 3, half: 12, width: 0.4, anr: 8, fmt: 1.15 };

// ---------------------------------------------------------------- calibração (pura)

export interface Calib33 { k: number; w: number; n: number }
const NONE: Calib33 = { k: 1, w: 0, n: 0 };
/** razão crua da amostra: vendeu ÷ previsão sem a calibração que ela já trazia */
const rawLog = (x: Samp31): number => Math.log(Math.min(20, Math.max(0.05, (x.u / Math.max(1, x.e)) * (x.k ?? 1))));
function jac(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 1;
  let i = 0;
  for (const x of a) if (b.includes(x)) i++;
  return i / (a.length + b.length - i);
}

/** Quanto corrigir a previsão de um lançamento (família de gênero, tipo, traços) pelo histórico do selo. */
export function calib33(s: GameState, fam: string, type: Release['type'], traits: string[], year = s.year): Calib33 {
  const xs = samples31(s);
  if (xs.length < LEARN_MIN31.n) return NONE;
  let W = 0, S = 0, n = 0;
  for (const x of xs) {
    const w = 0.5 ** (Math.max(0, year - x.y) / LEARN33.half) * (x.g === fam ? 1 : 0.1) * (x.t === type ? 1 : 0.4) * (0.4 + 0.6 * jac(x.f, traits));
    if (w < 0.02) continue;
    W += w; S += w * rawLog(x); n++;
  }
  if (!W) return NONE;
  const lk = Math.max(-LEARN33.cap, Math.min(LEARN33.cap, (S / W) * (W / (W + LEARN33.prior))));
  return { k: Math.exp(lk), w: W, n };
}
export const calibAct33 = (s: GameState, act: Act, type: Release['type'], traits: string[] = []): Calib33 => calib33(s, familyOf(act.genre), type, traits);

/** Calibração de um lançamento (o da previsão ou um real), com os traços dele. */
export function calibRel33(s: GameState, rel: Release): Calib33 {
  const a = s.acts[rel.actId];
  if (!a) return NONE;
  return calib33(s, familyOf(a.genre), rel.type, traitsOf31(s, rel));
}

/** Fator da faixa da previsão (1 = como antes; menor = mais certeza) — gancho para o mercado. */
export function learnWidth33(s: GameState, act: Act, type: Release['type']): number {
  if (!learnOn33(s)) return 1;
  const c = calibAct33(s, act, type);
  return 1 - LEARN33.width * (c.w / (c.w + 6));
}

// ---------------------------------------------------------------- previsão

// fator de apelo só da previsão (o lançamento real não passa por aqui)
FORECAST31.appeal.push((s, rel) => (learnOn33(s) && isForecast31(rel) && rel.owner === 'player' ? calibRel33(s, rel).k : 1));

// k que a previsão de cada lançamento seu já trazia (lido quando ele vira amostra). Só nasce com o interruptor ligado.
export interface Learn33St { k: Record<string, number> }
declare module '../ext4' { interface Ext4 { learn33?: Learn33St } }
const ro = (s: GameState): Learn33St | undefined => (s as unknown as { x4?: { learn33?: Learn33St } }).x4?.learn33;
function st33(s: GameState): Learn33St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.learn33 ??= { k: {} }) as Learn33St;
  st.k ??= {};
  return st;
}
registerSimHook('week', 'learn33', (s) => {
  if (!learnOn33(s)) return;
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    for (const rid of act?.releases.slice(-3) ?? []) {
      const rel = s.releases[rid];
      if (!rel || rel.fc === undefined || rel.fa !== undefined || s.week - rel.week > 1 || ro(s)?.k[rid] !== undefined) continue;
      st33(s).k[rid] = Math.round(calibRel33(s, rel).k * 1000) / 1000;
    }
  }
});
SAMP31X.k = (s, rel) => {
  const st = ro(s);
  const k = st?.k[rel.id];
  if (k !== undefined) delete st!.k[rel.id];
  return k;
};

// ---------------------------------------------------------------- diretores

/** A&R: pontos na leitura do ato pelo que o gênero dele rendeu no selo (vendeu × previsão). */
export function anrBias33(s: GameState, act: Act): number {
  if (!learnOn33(s)) return 0;
  const c = calib33(s, familyOf(act.genre), 'lp', []);
  return Math.max(-LEARN33.anr, Math.min(LEARN33.anr, Math.log(c.k) * LEARN33.anr / LEARN33.cap));
}
/** Produtor executivo: LP vira single quando os singles do gênero batem a previsão bem mais que os LPs. */
export function fmtPick33(s: GameState, act: Act, type: 'single' | 'lp'): 'single' | 'lp' {
  if (!learnOn33(s) || type !== 'lp') return type;
  const fam = familyOf(act.genre);
  const lp = calib33(s, fam, 'lp', []), sg = calib33(s, fam, 'single', []);
  return sg.n >= LEARN_MIN31.n && sg.k > lp.k * LEARN33.fmt ? 'single' : type;
}
LEARN31X.anr = anrBias33;
LEARN31X.fmt = (s, act, type) => fmtPick33(s, act, type);

registerEditable({ id: 'learn33.cap', area: 'tools', kind: 'number', raw: true, min: 0, max: 1, step: 0.05,
  label: l('V33 · aprendizados: correção máxima da previsão (fração)', 'V33 · learnings: max forecast correction (fraction)'),
  get: () => LEARN33.cap, set: (_s, v) => { LEARN33.cap = Math.max(0, Math.min(1, Number(v) || 0)); } });
registerEditable({ id: 'learn33.prior', area: 'tools', kind: 'number', raw: true, min: 0, max: 30, step: 1,
  label: l('V33 · aprendizados: peso da dúvida (amostras para meia correção)', 'V33 · learnings: doubt weight (samples for half correction)'),
  get: () => LEARN33.prior, set: (_s, v) => { LEARN33.prior = Math.max(0, Math.min(30, Number(v) || 0)); } });
