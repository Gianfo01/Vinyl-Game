// Rodada 29 (REORG, M06/M45 + G04/G08 da Bíblia de UI/UX) — vocabulário ÚNICO de estados de dado e de entidade.
// Sem DOM. "Desconhecido", "não se aplica", "zero", "estimado" e "desatualizado" são estados diferentes: um traço para
// todos deixa a tela compacta, mas ambígua. Dinheiro sempre com moeda, base e período; data sempre com o período.

import { l, type L } from '../../data/world';

export type Known29 = 'value' | 'zero' | 'unknown' | 'na' | 'estimated' | 'stale';
/** Um número com o seu estado de conhecimento, unidade/período e origem (G04: contrato de dados por campo). */
export interface Val29 { kind: Known29; n?: number; unit?: L; period?: L; source?: L; asOf?: string }

export const val29 = (n: number | null | undefined, o: Omit<Val29, 'kind' | 'n'> & { estimated?: boolean } = {}): Val29 => {
  const { estimated, ...rest } = o;
  if (n === null || n === undefined || Number.isNaN(n)) return { kind: 'unknown', ...rest };
  if (n === 0 && !estimated) return { kind: 'zero', n: 0, ...rest };
  return { kind: estimated ? 'estimated' : 'value', n, ...rest };
};
export const na29 = (why?: L): Val29 => ({ kind: 'na', source: why });

/** Rótulos dos estados de dado (glossário G04/G08). */
export const KNOWN_L29: Record<Known29, L> = {
  value: l('confirmado', 'confirmed'),
  zero: l('zero (registrado)', 'zero (recorded)'),
  unknown: l('desconhecido', 'unknown'),
  na: l('não se aplica', 'not applicable'),
  estimated: l('estimado', 'estimated'),
  stale: l('desatualizado', 'out of date'),
};

/** Texto de um valor: nunca transforma desconhecido em zero; estimativa ganha "≈"; desatualizado diz de quando. */
export function show29(v: Val29, fmt: (n: number) => string, lang: 'pt' | 'en' = 'pt'): string {
  const T = (x: L) => (lang === 'en' ? x.en : x.pt);
  switch (v.kind) {
    case 'unknown': return T(KNOWN_L29.unknown);
    case 'na': return T(KNOWN_L29.na);
    case 'zero': return fmt(0);
    case 'estimated': return `≈ ${fmt(v.n!)}`;
    case 'stale': return `${fmt(v.n ?? 0)} (${T(l('dado de', 'as of'))} ${v.asOf ?? '?'})`;
    default: return fmt(v.n!);
  }
}

/** Estados de ENTIDADE com significado fixo (M06): "agendado" não é "em andamento"; "proposta" não é "contrato". */
export const ENT_STATES29 = {
  scheduled: l('agendado', 'scheduled'),
  running: l('em andamento', 'in progress'),
  done: l('concluído', 'done'),
  proposal: l('proposta', 'proposal'),
  contract: l('contrato assinado', 'signed contract'),
  realized: l('realizado', 'realized'),
  committed: l('comprometido', 'committed'),
  estimated: l('estimado', 'estimated'),
  pending: l('pendente', 'pending'),
  met: l('atendido', 'met'),
  blocked: l('bloqueado', 'blocked'),
} as const;
export type EntState29 = keyof typeof ENT_STATES29;

// ---------------------------------------------------------------- M45: linguagem de dinheiro e calendário

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Mês completo da campanha ("jan/1962" · "Jan 1962"). */
export const month29 = (y: number, m: number): L => l(`${MES[m]}/${y}`, `${MON[m]} ${y}`);
/** Período de um valor de fluxo. */
export const PERIOD29 = {
  now: l('agora', 'now'),
  month: l('por mês', 'per month'),
  lastMonth: l('no último mês fechado', 'in the last closed month'),
  year: l('por ano', 'per year'),
  total: l('total', 'total'),
} as const;

/** Dólares a partir de centavos, com sinal explícito quando pedido (o jogo guarda centavos). */
export function usd29(cents: number, sign = false): string {
  const v = Math.round(cents / 100);
  const s = `$${Math.abs(v).toLocaleString('en-US')}`;
  return v < 0 ? `−${s}` : sign && v > 0 ? `+${s}` : s;
}
