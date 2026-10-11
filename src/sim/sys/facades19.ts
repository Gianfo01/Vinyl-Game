// Rodada 19 (Frente 0.6) — fatos das FACHADAS (fandom19, rivals19, awards19) e seus ouvintes.
// Um varredor mensal olha as fontes únicas (act.fans/fans18, s.rivalries, livro s.awards) e publica FATOS-ÍNDICE
// (`emitIndexFact`: anel próprio, sem mexer na numeração/anel dos fatos — não muda sorteio nenhum; gravidade 12 e sem
// cidade: não viram boato nem motivo de NPC; o fato canônico de cada sistema continua sendo o que já era). Servem à matriz Fato → consumidores e aos sistemas da R19.
//   fan_wave ........ base do ato do jogador cresceu ≥15% no mês (≥1.500 fãs) ou a mobilização passou de 60
//   fan_drop ........ base caiu ≥15% no mês
//   rivalry_flare ... calor com um selo cruzou 50 (rixa) ou 75 (guerra) para cima
//   rivalry_cool .... calor caiu de ≥50 para <20
//   award_win ....... entrada nova no livro de prêmios (s.awards)
//   award_posthumous  prêmio para ato sem membro vivo
// Sem sorteio (determinístico semana × mês). Importado por ÚLTIMO em sim/sys/index.ts.

import { l, type L } from '../../data/world';
import { isPosthumous19 } from '../awards19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitIndexFact, onFact, type Fact } from '../facts17';
import { fanTotal } from '../fandom';
import { heatBand19 } from '../rivals19';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { fans18 } from './fans18';

export interface F19 {
  /** último total de fãs (atos do jogador) e mobilização acima de 60 */
  fan: Record<string, number>; mob: Record<string, 1>;
  /** faixa de calor guardada (0 calma/tensa, 1 rixa, 2 guerra) */
  heat: Record<string, number>;
  /** quantas entradas do livro de prêmios já foram vistas (-1 = ainda não iniciado) */
  aw: number;
  waves: [number, number, string, 1 | -1][]; flares: [number, number, string, number][];
  /** memória do júri: vitórias por ato [ano, categoria] (ouvinte de award_win) */
  jury: Record<string, [number, string][]>;
  post: [number, string, string][];
}
declare module '../ext4' { interface Ext4 { f19: F19 } }
const fresh = (): F19 => ({ fan: {}, mob: {}, heat: {}, aw: -1, waves: [], flares: [], jury: {}, post: [] });
registerExt4('f19', fresh);
export function f19(s: GameState): F19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.f19 ??= fresh()) as F19;
  st.fan ??= {}; st.mob ??= {}; st.heat ??= {}; st.aw ??= -1; st.waves ??= []; st.flares ??= []; st.jury ??= {}; st.post ??= [];
  return st;
}
const cap = <T>(a: T[], n: number) => { if (a.length > n) a.splice(0, a.length - n); };
const SRC = 'facades19';

/** Tipos de fato das fachadas, com produtor e ouvintes (para a matriz Fato → consumidores, Frente 0.2). */
export const FACTS19: { kind: string; from: string; listeners: string[]; desc: L }[] = [
  { kind: 'fan_wave', from: 'fandom19', listeners: ['fandom19:wave'], desc: l('Onda de fãs: a base cresce rápido ou se mobiliza.', 'Fan wave: the base grows fast or mobilises.') },
  { kind: 'fan_drop', from: 'fandom19', listeners: ['fandom19:drop'], desc: l('Debandada: a base cai rápido.', 'Fan exodus: the base drops fast.') },
  { kind: 'rivalry_flare', from: 'rivals19', listeners: ['rivals19:flare'], desc: l('A rivalidade com um selo vira rixa ou guerra.', 'A label rivalry turns into a feud or a war.') },
  { kind: 'rivalry_cool', from: 'rivals19', listeners: ['rivals19:cool'], desc: l('Uma rixa esfria.', 'A feud cools down.') },
  { kind: 'award_win', from: 'awards19', listeners: ['awards19:jury'], desc: l('Prêmio entregue (livro único).', 'Award given (single ledger).') },
  { kind: 'award_posthumous', from: 'awards19', listeners: ['awards19:posthumous'], desc: l('Prêmio póstumo.', 'Posthumous award.') },
];

function fact(s: GameState, kind: string, actors: string[], text: L, tags: string[], data?: Record<string, number | string>): void {
  emitIndexFact(s, { kind, actors, severity: 12, visibility: 'public', tags: ['f19', ...tags], src: SRC, text, ...(data ? { data } : {}) });
}

// ---------------------------------------------------------------- varredor mensal
function scanFans(s: GameState): void {
  const st = f19(s);
  const mine = new Set(playerActs(s));
  for (const id of Object.keys(st.fan)) if (!mine.has(id)) delete st.fan[id];
  for (const id of Object.keys(st.mob)) if (!mine.has(id)) delete st.mob[id];
  for (const id of mine) {
    const a = s.acts[id];
    if (!a) continue;
    const n = fanTotal(a), p = st.fan[id];
    st.fan[id] = n;
    const mob = fans18(s).a[id]?.mob ?? 0;
    const mobUp = mob >= 60 && !st.mob[id];
    if (mob >= 60) st.mob[id] = 1; else if (mob < 50) delete st.mob[id];
    if (p === undefined) continue;
    if ((n >= 1500 && n >= p * 1.15) || mobUp) fact(s, 'fan_wave', [id], fmtL(mobUp ? l('Os fãs de {a} se mobilizam em massa (mobilização {m}).', '{a} fans mobilise en masse (mobilisation {m}).') : l('Onda de fãs: a base de {a} cresce {g}% num mês.', 'Fan wave: {a}\'s base grows {g}% in a month.'), { a: a.name, m: Math.round(mob), g: Math.round((n / Math.max(1, p) - 1) * 100) }), ['fans', 'good'], { n, p });
    else if (p >= 1500 && n <= p * 0.85) fact(s, 'fan_drop', [id], fmtL(l('Debandada: a base de {a} cai {g}% num mês.', 'Fan exodus: {a}\'s base drops {g}% in a month.'), { a: a.name, g: Math.round((1 - n / p) * 100) }), ['fans', 'bad'], { n, p });
  }
}
function scanHeat(s: GameState): void {
  const st = f19(s);
  for (const [id, v] of Object.entries(s.rivalries)) {
    const lb = s.labels[id];
    if (!lb) continue;
    const b = v >= 75 ? 2 : v >= 50 ? 1 : 0, was = st.heat[id] ?? 0;
    if (b > was) fact(s, 'rivalry_flare', [id, 'player'], fmtL(b === 2 ? l('A rivalidade com {b} virou guerra (calor {v}).', 'The rivalry with {b} has become a war (heat {v}).') : l('A rivalidade com {b} virou rixa (calor {v}).', 'The rivalry with {b} has become a feud (heat {v}).'), { b: lb.name, v: Math.round(v) }), ['rival', heatBand19(v)], { heat: Math.round(v) });
    else if (was >= 1 && v < 20) fact(s, 'rivalry_cool', [id, 'player'], fmtL(l('A rixa com {b} esfriou (calor {v}).', 'The feud with {b} has cooled (heat {v}).'), { b: lb.name, v: Math.round(v) }), ['rival', 'calm'], { heat: Math.round(v) });
    if (b > was) st.heat[id] = b; else if (v < 20) delete st.heat[id]; // guarda a faixa máxima até esfriar (sem repetir)
  }
  for (const id of Object.keys(st.heat)) if (!s.labels[id]) delete st.heat[id];
}
function scanAwards(s: GameState): void {
  const st = f19(s);
  if (st.aw < 0 || st.aw > s.awards.length) { st.aw = s.awards.length; return; }
  const news = s.awards.slice(st.aw).slice(-20);
  st.aw = s.awards.length;
  for (const a of news) {
    const actors = [a.actId ?? '', ...(a.byPlayer ? ['player'] : [])].filter(Boolean);
    fact(s, 'award_win', actors, fmtL(l('Prêmio {y}: {n}.', '{y} award: {n}.'), { y: a.year, n: a.name }), ['awards', ...(a.byPlayer ? ['good'] : [])], { cat: a.category, y: a.year });
    if (a.actId && isPosthumous19(s, a.actId, a.year)) fact(s, 'award_posthumous', actors, fmtL(l('Prêmio póstumo para {a}: {n}.', 'Posthumous award for {a}: {n}.'), { a: s.acts[a.actId]?.name ?? '?', n: a.name }), ['awards', 'posthumous'], { cat: a.category, y: a.year });
  }
}
registerSimHook('month', 'facades19', (s) => { scanFans(s); scanHeat(s); scanAwards(s); });

// ---------------------------------------------------------------- ouvintes (memória das fachadas; não mexem em dinheiro nem atributos)
const wave = (sign: 1 | -1) => (s: GameState, f: Fact) => {
  const id = f.actors[0];
  if (!id) return;
  const st = f19(s);
  st.waves.push([f.y, f.m, id, sign]); cap(st.waves, 40);
  const fl = fans18(s).log; // diário de fãs (aba Fãs) ganha a linha
  fl.unshift([f.y, f.m, f.text]); if (fl.length > 30) fl.length = 30;
};
onFact('fan_wave', wave(1), 'fandom19:wave');
onFact('fan_drop', wave(-1), 'fandom19:drop');
const flare = (s: GameState, f: Fact) => {
  const id = f.actors[0];
  if (!id) return;
  const st = f19(s);
  st.flares.push([f.y, f.m, id, Number(f.data?.heat ?? 0)]); cap(st.flares, 40);
  if (s.rivalReport && f.kind === 'rivalry_flare') { s.rivalReport.items.push({ labelId: id, text: f.text }); if (s.rivalReport.items.length > 20) s.rivalReport.items.splice(0, s.rivalReport.items.length - 20); }
};
onFact('rivalry_flare', flare, 'rivals19:flare');
onFact('rivalry_cool', flare, 'rivals19:cool');
onFact('award_win', (s, f) => {
  const id = f.actors.find((x) => s.acts[x]);
  if (!id) return;
  const j = (f19(s).jury[id] ??= []);
  j.push([Number(f.data?.y ?? f.y), String(f.data?.cat ?? '')]); cap(j, 12);
}, 'awards19:jury');
onFact('award_posthumous', (s, f) => {
  const id = f.actors.find((x) => s.acts[x]);
  if (!id) return;
  const st = f19(s);
  st.post.push([Number(f.data?.y ?? f.y), id, String(f.data?.cat ?? '')]); cap(st.post, 30);
}, 'awards19:posthumous');

/** Vitórias lembradas pelo júri (ouvinte de award_win). */
export const juryLedger19 = (s: GameState, actId: string): [number, string][] => f19(s).jury[actId] ?? [];
