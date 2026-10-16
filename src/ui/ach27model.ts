// Rodada 27 (ACH) — conquistas escondidas e conquistas do PERFIL (camada de interface; não toca na simulação).
// • R31 (N): bloqueadas comuns aparecem com nome e como ganhar (`lockedItems`); as secretas (hidden, ovos do eggs27)
//   continuam "???" — só a contagem por categoria (`secretLocked`), nunca id, nome ou descrição.
// • Conquista desbloqueada em qualquer partida é gravada no perfil local (saves17: curProfile17) com data real, partida
//   (empresa, ano de início, semente) e ano do jogo. Mesmo armazenamento dos perfis (localStorage, com try/catch).
// • Apagar o perfil apaga as conquistas dele; apagar um save não mexe nelas.
// A leitura do estado é só leitura (x4.live sem criar nada): o determinismo da simulação não muda.

import { l, type L } from '../data/world';
import { ACHIEVEMENTS, scenarioById, type AchievementDef } from '../sim/sys/live';
import type { GameState } from '../sim/types';
import { yearOfWeek } from '../sim/util';
import { isEdited31 } from '../sim/r31/editor';
import { profileId17 } from './store';
import { EPOCH27, profAch27, recordAch27, recordMedal27, runOf27, type AchRun27, type MedalRec27 } from './ach27store';

export * from './ach27store';


type LiveRO = { ach?: Record<string, number>; scenario?: { id: string; done?: { medal: string; year: number } } | null };
/** Lê (sem criar) o estado de conquistas da partida. */
export const liveRO27 = (s: GameState): LiveRO => ((s as unknown as { x4?: { live?: LiveRO } }).x4?.live ?? {});
/** Conquistas desbloqueadas NESTA partida: id → ano do jogo. */
export function runUnlocked27(s: GameState): Record<string, number> {
  const ach = liveRO27(s).ach ?? {};
  const out: Record<string, number> = {};
  for (const [id, wk] of Object.entries(ach)) { try { out[id] = yearOfWeek(s, wk); } catch { out[id] = s.year; } }
  return out;
}

// cache: só regrava quando o conjunto da partida muda (o gancho roda toda semana)
const SYNCED = new WeakMap<GameState, string>();
/** Copia para o perfil as conquistas (e a medalha de cenário) desta partida. Só lê o estado. Devolve as novas no perfil. */
export function syncRunAch27(s: GameState, pid: string = profileId17()): string[] {
  if (isEdited31(s)) return []; // R31 (EDT): partida editada (editor ou base editada) não conta para conquistas
  const lv = liveRO27(s);
  const ids = Object.keys(lv.ach ?? {});
  const med = lv.scenario?.done?.medal ?? '';
  const k = `${EPOCH27.n}|${pid}|${s.signature}|${ids.length}|${med}`;
  if (SYNCED.get(s) === k) return [];
  const run = runOf27(s);
  const got = runUnlocked27(s);
  const fresh = recordAch27(pid, ids.map((id) => ({ id, gy: got[id] })), run);
  if (lv.scenario?.done && med !== 'none' && (med === 'gold' || med === 'silver' || med === 'bronze')) recordMedal27(pid, lv.scenario.id, med, lv.scenario.done.year, run);
  SYNCED.set(s, k);
  return fresh;
}

// ---------------------------------------------------------------- modelo de exibição (só desbloqueadas)

export const CAT27: Record<AchievementDef['cat'], L> = {
  sales: l('Vendas', 'Sales'), tours: l('Turnês', 'Tours'), awards: l('Prêmios', 'Awards'), formats: l('Formatos', 'Formats'), legal: l('Tribunais', 'Courts'),
  stores: l('Lojas e filiais', 'Stores and branches'), digital: l('Digital', 'Digital'), live: l('Palco e festivais', 'Stage and festivals'), company: l('Empresa', 'Company'),
};
export interface AchItem27 { id: string; name: L; desc: L; icon: string; cat: AchievementDef['cat']; secret: boolean; gy?: number; at?: number; run?: AchRun27; runs?: number }
export interface AchCat27 { cat: AchievementDef['cat']; label: L; items: AchItem27[]; /** bloqueadas comuns (as secretas não contam aqui) */ locked: number;
  /** R31 (N): bloqueadas comuns com nome e "como ganhar" (descrição); secretas bloqueadas nunca entram aqui */
  lockedItems: AchItem27[]; /** R31 (N): secretas ainda bloqueadas desta categoria (aparecem como "???") */ secretLocked: number }
export interface AchView27 { got: number; total: number; /** secretas ainda não achadas (só no total) */ secretLeft: number; cats: AchCat27[]; items: AchItem27[] }
type Unl = Record<string, { gy?: number; at?: number; run?: AchRun27; runs?: number }>;

/** Monta a vista: SÓ conquistas desbloqueadas viram itens; das bloqueadas sobra a contagem por categoria (comuns) e no total. */
export function achView27(unlocked: Unl, defs: readonly AchievementDef[] = ACHIEVEMENTS): AchView27 {
  const cats = new Map<AchievementDef['cat'], AchCat27>();
  const items: AchItem27[] = [];
  let secretLeft = 0;
  for (const d of defs) {
    const c = cats.get(d.cat) ?? { cat: d.cat, label: CAT27[d.cat] ?? l(d.cat, d.cat), items: [], locked: 0, lockedItems: [], secretLocked: 0 };
    cats.set(d.cat, c);
    const u = unlocked[d.id];
    if (!u) {
      if (d.hidden) { secretLeft++; c.secretLocked++; } else { c.locked++; c.lockedItems.push({ id: d.id, name: d.name, desc: d.desc, icon: d.icon, cat: d.cat, secret: false }); }
      continue;
    }
    const it: AchItem27 = { id: d.id, name: d.name, desc: d.desc, icon: d.icon, cat: d.cat, secret: !!d.hidden, ...u };
    c.items.push(it); items.push(it);
  }
  // categoria só aparece se tiver algo desbloqueado ou bloqueadas comuns (uma categoria só de secretas some)
  const list = [...cats.values()].filter((c) => c.items.length || c.locked || c.secretLocked);
  return { got: items.length, total: defs.length, secretLeft, cats: list, items };
}
/** Vista das conquistas desta partida. */
export const runView27 = (s: GameState): AchView27 => {
  const run = runOf27(s);
  return achView27(Object.fromEntries(Object.entries(runUnlocked27(s)).map(([id, gy]) => [id, { gy, run }])));
};
/** Vista das conquistas do perfil (todas as partidas). */
export const profView27 = (pid: string = profileId17()): AchView27 => {
  const p = profAch27(pid);
  return achView27(Object.fromEntries(Object.entries(p.ach).map(([id, r]) => [id, { gy: r.gy, at: r.at, run: r.run, runs: r.sigs?.length ?? 1 }])));
};
/** Medalhas de cenário do perfil, com o nome do cenário. */
export const profMedals27 = (pid: string = profileId17()): { id: string; name: L; rec: MedalRec27 }[] =>
  Object.entries(profAch27(pid).medals).map(([id, rec]) => ({ id, name: scenarioById[id]?.name ?? l(id, id), rec })).sort((a, b) => a.rec.at - b.rec.at);
