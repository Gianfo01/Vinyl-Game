// R33 (DADOS33) — varredura da base: gera mundos (anos × sementes × modos de história) e lista inconsistências dos atos
// REAIS (catalogNo). Usado pelo script `run33.ts` (relatório docs/r33/dados/AUDITORIA.md) e pelo teste r33-dados.
// Tipos:
//   selo_fora_epoca      gravadora no mundo do começo antes de fundada ou depois de extinta (nome real fora da época)
//   dono_fora_epoca      ato real contratado por gravadora fora da época
//   dono_historico       ato real com selo histórico conhecido (HIST_LABEL33) e esse selo no mundo, mas o dono é outro
//   morto_ativo          artista real que morreu antes do ano de começo aparecendo vivo/ativo/separado/aposentado-vivo
//   solo_com_integrantes ato solo (nome do ato = nome de um integrante, ou dado real solo) com mais de um integrante
//   integrante_duplo     a mesma pessoa real duplicada (dois registros vivos com o mesmo nome e nascimento)
//   idade                idade negativa ou absurda (< 5 ou > 110 anos, vivo) de integrante de ato real
//   morto_depois         (com simulação) ato cujo dono do nome já morreu na partida aparecendo ativo/separado depois
import { createGame, suggestLabels22 } from '../../../src/sim/worldgen';
import { defaultConfig } from '../../../src/sim/bot';
import { advanceMonth } from '../../../src/sim/tick';
import { realDataOf } from '../../../src/sim/sys/realworld';
import { histLabelAt33, labelAliveAt33 } from '../../../src/data/labelhist33';
import type { Act, GameState, RunConfig } from '../../../src/sim/types';
import { inLineupAt } from '../../../src/data/realtypes';
import { setLabels29 } from '../../../src/sim/labels29data';

export type Kind33 = 'selo_fora_epoca' | 'dono_fora_epoca' | 'dono_historico' | 'morto_ativo' | 'solo_com_integrantes' | 'integrante_duplo' | 'idade' | 'morto_depois';
export const KINDS33: Kind33[] = ['selo_fora_epoca', 'dono_fora_epoca', 'dono_historico', 'morto_ativo', 'solo_com_integrantes', 'integrante_duplo', 'idade', 'morto_depois'];
export interface Issue33 { kind: Kind33; year: number; hist: string; seed: string; what: string }

const live = (a: Act) => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';

/** Configuração como a Nova run monta (gravadoras sugeridas da época), a Nova run rápida com gravadoras escolhidas (labels29) ou a do bot (mundo padrão). */
export function cfg33(seed: string, year: number, hist: 'strict' | 'loose' | 'free', path: 'ui' | 'bot' | 'l29'): RunConfig {
  const c = defaultConfig(seed, { startYear: year, realNames: true, history: hist, homeCity: 'rio' });
  if (hist === 'free') c.mode = 'chaos';
  if (path === 'ui') c.labels = { ids: suggestLabels22(c).ids }; // como a Nova run: a sugestão da época (materializeLabels22)
  if (path === 'l29') setLabels29(c, { n: 'many' }); // Nova run rápida com "Gravadoras no início: muitas" (labels29)
  return c;
}

export function scan33(s: GameState, hist: string, seed: string): Issue33[] {
  const out: Issue33[] = [];
  const y = s.year;
  const push = (kind: Kind33, what: string) => out.push({ kind, year: s.config.startYear, hist, seed, what });
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.founded > y) continue;
    if (!labelAliveAt33(lb.id, y)) push('selo_fora_epoca', `${lb.name} (${lb.id}) existe em ${y}`);
  }
  const byKey = new Map<string, string>();
  for (const a of Object.values(s.acts)) {
    if (!a.catalogNo) continue;
    const d = realDataOf(a);
    const lb = a.owner ? s.labels[a.owner] : undefined;
    if (lb && (lb.founded > y || !labelAliveAt33(lb.id, y))) push('dono_fora_epoca', `${a.name} → ${lb.name} (fundada ${lb.founded})`);
    const h = live(a) && s.week === 0 ? histLabelAt33(a.name, y) : undefined;
    const hl = h ? Object.values(s.labels).find((x) => x.name === h && x.active && x.founded <= y) : undefined;
    if (hl && lb?.name !== h && a.owner !== 'player') push('dono_historico', `${a.name}: ${lb?.name ?? 'independente'} em vez de ${h}`);
    const ms = a.members.map((id) => s.persons[id]).filter(Boolean);
    // morte histórica antes do começo
    if (d) {
      const solo = (d.m?.length ?? 0) <= 1;
      if (!d.m?.length && d.x !== undefined && d.x < s.config.startYear) {
        const p = ms[0];
        if (p?.alive || a.status !== 'retired') push('morto_ativo', `${a.name} (†${d.x}) ${a.status}${p?.alive ? ', vivo' : ''}`);
      }
      for (const m of d.m ?? []) {
        if (m[3] === undefined || m[3] >= s.config.startYear) continue;
        const p = ms.find((q) => q.name === m[0]);
        if (p?.alive) push('morto_ativo', `${m[0]} (${a.name}, †${m[3]}) vivo em ${y}`);
      }
      if (d.m?.length && d.m.every((m) => m[3] !== undefined && m[3] < s.config.startYear) && a.status !== 'retired') push('morto_ativo', `${a.name}: todos mortos antes de ${s.config.startYear}, status ${a.status}`);
      if (solo && ms.length > 1) push('solo_com_integrantes', `${a.name}: solo com ${ms.map((p) => p.name).join(', ')}`);
    }
    // nome do ato = nome de um integrante: só é banda se a base documenta mais de um integrante no ano (Alice Cooper 1969–74)
    const sh = a.debutYear - (d?.d ?? a.debutYear); // no ano da saída a troca ainda pode estar agendada para um mês adiante
    const band = [y, y - 1].some((yy) => (d?.m ?? []).filter((m) => inLineupAt(m, yy, sh)).length > 1);
    if (ms.length > 1 && !band && ms.some((p) => p.name === a.name)) push('solo_com_integrantes', `${a.name}: ${ms.map((p) => p.name).join(', ')}`);
    for (const p of ms) {
      const age = y - p.born;
      if (p.alive && (age < 5 || age > 110)) push('idade', `${p.name} (${a.name}) com ${age} anos em ${y}`);
      if (p.died !== undefined && p.died < p.born) push('idade', `${p.name} morre antes de nascer`);
      if (!p.alive) continue;
      const k = `${p.name}|${p.born}`;
      const prev = byKey.get(k);
      if (prev && prev !== p.id) push('integrante_duplo', `${p.name} (${p.born}) duplicado em ${a.name}`);
      else byKey.set(k, p.id);
    }
  }
  return out;
}

/** Morte na mesma partida: o ato com o nome de quem morreu não pode seguir ativo/separado depois. */
export function scanAfter33(s: GameState, hist: string, seed: string): Issue33[] {
  const out: Issue33[] = [];
  for (const a of Object.values(s.acts)) {
    if (!a.catalogNo) continue;
    const ms = a.members.map((id) => s.persons[id]).filter(Boolean);
    const self = ms.find((p) => p.name === a.name);
    if (a.deceased && a.status !== 'retired') out.push({ kind: 'morto_depois', year: s.config.startYear, hist, seed, what: `${a.name} (encerrado por morte) ${a.status} em ${s.year}` });
    else if (self && !self.alive && (a.status !== 'retired' || !a.deceased)) out.push({ kind: 'morto_depois', year: s.config.startYear, hist, seed, what: `${a.name} (†${self.died}) ${a.status} em ${s.year}` });
  }
  return out;
}

export const YEARS33 = [1900, 1930, 1950, 1962, 1975, 1990, 2005, 2020];
export const HISTS33 = ['strict', 'loose', 'free'] as const;

/** Varredura completa: anos × modos × sementes × (ui, bot, l29). `simYears` > 0 roda a partida e checa mortes na mesma partida. */
export function audit33(o: { years?: number[]; seeds?: number; hists?: readonly ('strict' | 'loose' | 'free')[]; simYears?: number; simYearsOf?: number[] } = {}): Issue33[] {
  const all: Issue33[] = [];
  for (const y of o.years ?? YEARS33) for (const h of o.hists ?? HISTS33) for (let i = 0; i < (o.seeds ?? 3); i++) for (const path of ['ui', 'bot', 'l29'] as const) {
    const seed = `d33-${path}-${y}-${h}-${i}`;
    const s = createGame(cfg33(seed, y, h, path));
    all.push(...scan33(s, h, seed));
    if (o.simYears && path === 'bot' && i === 0 && (o.simYearsOf ?? [1962]).includes(y)) {
      for (let m = 0; m < o.simYears * 12 && !s.ended; m++) { advanceMonth(s); if (m % 12 === 11) all.push(...scanAfter33(s, h, seed)); }
    }
  }
  return all;
}

export const count33 = (xs: Issue33[]): Record<Kind33, number> => Object.fromEntries(KINDS33.map((k) => [k, xs.filter((x) => x.kind === k).length])) as Record<Kind33, number>;
