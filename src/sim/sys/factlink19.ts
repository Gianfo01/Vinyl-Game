// Rodada 19 (0.2 + 11.1) — OUVINTES para os fatos que eram emitidos e ninguém ouvia (relic, situation, rise,
// masterwork, hologram, echo). Cada um mexe em pelo menos um sistema existente — imprensa (manchete do mês no
// press9), fama/momento do ato, espólio e herdeiros (post18), relações (persona13) — com efeitos pequenos e um
// "por quê" no texto. A matriz completa Fato → consumidores fica em ../factmatrix19.ts (testada).

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { onFact, type Fact } from '../facts17';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { opine } from './persona13';
import { post18 } from './post18';
import { press } from './press9';

/** Manchete do mês vinda de um fato (sem duplicar; no máximo 5 manchetes por mês no jornal). */
export function headline19(s: GameState, t: L, i: number): boolean {
  const p = press(s);
  if (p.hl.filter((h) => h.y === s.year && h.m === s.month).length >= 5 || p.hl.some((h) => h.t.pt === t.pt)) return false;
  p.hl.push({ y: s.year, m: s.month, t, i });
  if (p.hl.length > 48) p.hl.splice(0, p.hl.length - 48);
  return true;
}
const act = (s: GameState, f: Fact) => f.actors.map((id) => s.acts[id]).find(Boolean);
const deadOf = (s: GameState, f: Fact): string[] => { const a = act(s, f); return a ? a.members.filter((pid) => s.persons[pid] && !s.persons[pid].alive) : []; };
/** só espólios já abertos (não cria estado novo por causa de um fato) */
const estOf = (s: GameState, pid: string) => post18(s).est[pid];

// relíquia → herdeiros e interesse de leilão: venda divide guardiões do legado; roubo une a família; exposição soma legado
onFact('relic', (s, f) => {
  const ev = f.tags.includes('auction') ? 'auction' : f.tags.includes('gone') ? 'gone' : f.tags.includes('exhibit') || f.tags.includes('museum') ? 'show' : f.tags.includes('born') ? 'born' : '';
  for (const pid of deadOf(s, f)) {
    const e = estOf(s, pid);
    if (!e) continue;
    if (ev === 'auction') {
      const guard = e.heirs.filter((h) => h.st === 'guard').length, cash = e.heirs.filter((h) => h.st === 'cash').length;
      e.legacy = clamp(e.legacy + 2, 0, 100); // leilão público lembra o mundo da obra
      if (guard && cash) e.unity = clamp(e.unity - 4, 0, 100); // uns querem vender, outros guardar
    } else if (ev === 'gone') e.unity = clamp(e.unity + 3, 0, 100);
    else if (ev === 'show') e.legacy = clamp(e.legacy + 1, 0, 100);
  }
  const a = act(s, f);
  if (a && ev === 'auction') a.fame = clamp(a.fame + 0.5, 0, 100);
  if (f.severity >= 45 || ev === 'gone') headline19(s, ev === 'gone' ? fmtL(l('Roubo de relíquia: {t}', 'Relic stolen: {t}'), { t: f.text }) : f.text, ev === 'gone' ? 3 : 2);
}, 'factlink19:relic');

// situação → relações: quem estava no elenco lembra como terminou; as graves e públicas viram manchete
onFact('situation', (s, f) => {
  const tone = f.tags.includes('good') ? 1 : f.tags.includes('bad') ? -1 : 0;
  if (tone && f.visibility !== 'secret') {
    const why = fmtL(l('Situação: {t}', 'Situation: {t}'), { t: f.text });
    for (const k of f.actors.slice(0, 3)) if (k.includes(':') && !k.startsWith('w:')) opine(s, k, tone * 2, why);
  }
  if (f.visibility === 'public' && f.severity >= 45) headline19(s, f.text, 2);
}, 'factlink19:situation');

// revelação (chron "rise") → a imprensa fala do novo nome: momento sobe; os grandes viram manchete
onFact('rise', (s, f) => {
  const a = act(s, f);
  if (a) a.momentum = clamp(a.momentum + 3, 0, 100);
  if (f.severity >= 60) headline19(s, f.text, 2);
}, 'factlink19:rise');

// obra-prima → fama do ato e, se for sua, reputação artística do selo; sempre manchete
onFact('masterwork', (s, f) => {
  const a = act(s, f);
  if (a) a.fame = clamp(a.fame + 2, 0, 100);
  if (a && (a.owner === 'player' || a.playerBand)) s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
  headline19(s, f.text, 3);
}, 'factlink19:masterwork');

// holograma → espólio: soma legado, mas briga com herdeiros se o artista nunca quis (desejo conhecido "nunca")
onFact('hologram', (s, f) => {
  for (const pid of deadOf(s, f)) {
    const e = estOf(s, pid);
    if (!e) continue;
    e.legacy = clamp(e.legacy + 2, 0, 100);
    if (e.wish === 'never') { e.unity = clamp(e.unity - 8, 0, 100); if (e.unity < 45 && e.heirs.length > 1) e.dispute = Math.max(e.dispute, s.week + 26); } // herdeiros vão à justiça
  }
  headline19(s, f.text, 2);
}, 'factlink19:hologram');

// eco de decisão → relação com quem foi afetado (pessoa) ou confiança do ato
onFact('echo', (s, f) => {
  const tone = f.tags.includes('good') ? 1 : f.tags.includes('bad') ? -1 : 0;
  if (!tone) return;
  const k = f.actors[0] ?? '';
  const why = fmtL(l('Lembra da sua decisão: {t}', 'Remembers your decision: {t}'), { t: f.text });
  if (k.startsWith('p:')) opine(s, k, tone * 3, why);
  else if (s.acts[k]?.owner === 'player') s.acts[k].trust = clamp(s.acts[k].trust + tone * 2, 0, 100);
}, 'factlink19:echo');

// mesa de imprensa: fatos públicos de mercado e escândalo que nenhum sistema transformava em notícia
const DESK19: Record<string, number> = { payola: 3, stream_fraud: 3, label_sold: 2, boycott: 2 };
for (const k of Object.keys(DESK19)) onFact(k, (s, f) => { if (f.visibility === 'public' && f.severity >= 40) headline19(s, f.text, DESK19[k]); }, `factlink19:desk:${k}`);

// viral de mídia (media18) → momento do ato (o mundo inteiro fala dele por algumas semanas)
onFact('viral', (s, f) => { const a = act(s, f); if (a) a.momentum = clamp(a.momentum + 2, 0, 100); }, 'factlink19:viral');
