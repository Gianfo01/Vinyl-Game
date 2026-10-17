// R31 · onda 5 (ACOES5, EXP-13) — MODELO DO CARTÃO DE AÇÕES (sem DOM; testes em tests/r31-acoes5.test.ts).
// O catálogo de AÇÕES (`ACTS5`) e de NÚMEROS (`NUMS5`) que os cartões usam; quais entram em cada objeto está em DADOS
// (acoes5data.ts). Fonte única: cada ação guarda a função de hoje (`fn`, com o módulo em `src` para o teste conferir a
// referência) e só a chama — nenhuma regra copiada. Bloqueio = o motivo que a própria regra de hoje devolve, mostrado no
// botão antes do clique. Montar o cartão só lê; só `run` escreve, e pela função de hoje.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { nav5On } from '../../sim/r31/exp5';
import type { Lock31 } from '../../sim/r31/lock';
import type { GameState } from '../../sim/types';
import { paperOf5 } from './nav5';
import { object5, type Open5 } from './objects5';
import { CARDS5 } from './acoes5data';
import { ACTS_CAT5, LINES_CAT5, NUMS_CAT5 } from './acoes5cat';
import '../r33/vida33ui'; // R33 VIDA: ações da vida nos cartões (exp33.*, só aparecem ligadas)
import '../r33/redes33ui'; // R33 REDES: "Ler o jornal" e "Abrir as redes" nos cartões do Jornal (exp33.redes, ligado)
import '../r33/gente33ui'; // R33 GENTE33: filial, CEO, conselho, equipe pessoal e pessoas fixas nos cartões (exp33.gente, opt-in)

export type ActKind5 = 'do' | 'ui' | 'open';
/** Resultado de uma ação "do": a frase do toast (erro da regra de hoje = bad). */
export interface ActRes5 { text: L; bad?: boolean }
/** O que a interface entrega à ação. */
export interface ActCtx5 {
  close: () => void;
  /** "ver tudo ▸": a página antiga inteira */
  all: () => void;
  /** "abrir ▸": o papel de um objeto (papéis já feitos) */
  open: (obj: string, m?: Open5) => void;
  say: (msg: L, kind?: string) => void;
  refresh: () => void;
}
export interface ActDef5 {
  label: L;
  kind: ActKind5;
  /** a função de hoje que a ação chama (fonte única) */
  fn?: (...a: never[]) => unknown;
  /** [módulo a partir de src/, nome exportado] de `fn` (o teste confere que é a mesma referência) */
  src?: [string, string];
  /** "abrir ▸": objeto cujo papel abre (e o marcador) */
  obj?: string;
  mark?: Open5;
  /** motivo do bloqueio (antes do clique) */
  lock?: (s: GameState) => Lock31 | L | null | undefined;
  /** só aparece quando faz sentido (ex.: tem filhos, tem dívida) */
  when?: (s: GameState) => boolean;
  run?: (s: GameState, c: ActCtx5) => ActRes5 | void;
  /** teste: a mesma ação feita direto pela função de hoje (o estado final tem de ser igual) */
  same?: (s: GameState) => void;
  /** objeto de referência para o teste "same" */
  home?: string;
}
export interface NumOut5 { value: string; bar?: number; tone?: 'good' | 'bad' }
export interface NumDef5 { label: L; val: (s: GameState) => NumOut5 | null }

export const ACTS5: Record<string, ActDef5> = ACTS_CAT5;
export const NUMS5: Record<string, NumDef5> = NUMS_CAT5;

/** As 20 ações mais comuns (medida de cliques). */
export const COMMON5: string[] = [
  'descansar', 'aparencia', 'transferir', 'pagarDivida', 'emprestimo', 'gravar', 'mixar', 'contratarArtista', 'renovar',
  'marcarShow', 'lancar', 'compor', 'campanha', 'responderCarta', 'ligar', 'chamarSair', 'ampliarSede', 'contratarFunc',
  'decidirMes', 'meta',
];

// ---------------------------------------------------------------- cartão montado

export interface CardAct5 { id: string; label: L; kind: ActKind5; lock?: Lock31 | L | null; run: (s: GameState, c: ActCtx5) => ActRes5 | void }
export interface CardNum5 { label: L; value: string; bar?: number; tone?: 'good' | 'bad' }
export interface Card5 { id: string; title: L; tip?: L; nums: CardNum5[]; lines: L[]; acts: CardAct5[]; all?: Open5 }

/** Todos os cartões com dados (objetos da onda 5 + peças só da cena da casa, `casa.<id>`). */
export const cardIds5 = (): string[] => Object.keys(CARDS5);

const titleOf5 = (id: string): L => object5(id)?.label ?? CARDS5[id]?.title ?? l(id, id);

function runOf5(id: string, d: ActDef5): CardAct5['run'] {
  if (d.kind === 'open') return (_s, c) => c.open(d.obj!, d.mark);
  return (s, c) => d.run?.(s, c);
}

/** Lê sem deixar rastro: as leituras de hoje (energyLeft, fin18…) criam/normalizam estado preguiçoso na 1ª vez; o cartão
 *  desfaz isso (explorar não muda o mundo). Só chaves novas em `x4`/`player` e o mês da bolinha de tempo livre. */
export function peek5<T>(s: GameState, fn: () => T): T {
  const x4 = (s as unknown as { x4: Record<string, unknown> }).x4 ?? {};
  const pl = s.player as unknown as Record<string, unknown>;
  const k4 = new Set(Object.keys(x4)), kp = new Set(Object.keys(pl));
  const lf = x4.life as { monthKey?: number; used?: number } | undefined;
  const keep = lf ? { monthKey: lf.monthKey, used: lf.used } : undefined;
  try { return fn(); } finally {
    for (const k of Object.keys(x4)) if (!k4.has(k)) delete x4[k];
    for (const k of Object.keys(pl)) if (!kp.has(k)) delete pl[k];
    if (lf && keep) { lf.monthKey = keep.monthKey; lf.used = keep.used; }
  }
}

/** Monta o cartão de um objeto (só leitura). */
export function card5(s: GameState, id: string): Card5 | undefined {
  return peek5(s, () => card5raw(s, id));
}
function card5raw(s: GameState, id: string): Card5 | undefined {
  const spec = CARDS5[id];
  if (!spec) return undefined;
  const o = object5(id);
  const acts: CardAct5[] = [];
  for (const a of spec.acts) {
    const d = ACTS5[a];
    if (!d || (d.when && !d.when(s))) continue;
    let lock: Lock31 | L | null | undefined = null;
    try { lock = d.lock?.(s) ?? null; } catch { lock = null; }
    acts.push({ id: a, label: d.label, kind: d.kind, lock, run: runOf5(a, d) });
  }
  // papel já feito (PAPEL, ELENCO, CASA): "abrir ▸" no fim, se os dados não puseram
  if (o && paperOf5(id) && !acts.some((x) => x.kind === 'open' && ACTS5[x.id]?.obj === id)) {
    const k = `abrir:${id}`;
    ACTS5[k] ??= { label: l('Abrir', 'Open'), kind: 'open', obj: id };
    acts.push({ id: k, label: ACTS5[k].label, kind: 'open', run: runOf5(k, ACTS5[k]) });
  }
  const nums: CardNum5[] = [];
  for (const n of spec.nums) {
    const d = NUMS5[n];
    let v: NumOut5 | null = null;
    try { v = d?.val(s) ?? null; } catch { v = null; }
    if (v) nums.push({ label: d.label, ...v });
  }
  let lines: L[] = [];
  if (spec.lines) { try { lines = LINES_CAT5[spec.lines]?.(s).slice(0, 4) ?? []; } catch { lines = []; } }
  const all = o ? o.opens[0] ?? o.links?.[0] : spec.all;
  return { id, title: titleOf5(id), tip: spec.tip, nums, lines, acts, all };
}

// ---------------------------------------------------------------- para onde vai o pedido de abrir um objeto

/** Como a casca abre um objeto: 'card' (cartão ao lado), 'paper' (página antiga/papel), 'travel' (objeto-lugar),
 *  'off' (interruptor desligado: como hoje). `pass` = "ver tudo ▸"/"abrir ▸"; `pause` = índice da pausa. */
export function route5(s: GameState, id: string, o: { pass?: boolean; pause?: boolean; paper?: boolean }): 'card' | 'paper' | 'travel' | 'off' {
  if (!nav5On(s)) return 'off';
  const ob = object5(id);
  if (ob && ob.place.endsWith('.lugar') && !ob.career) return 'travel';
  if (o.pass || o.pause || o.paper) return 'paper';
  return CARDS5[id] ? 'card' : 'paper';
}

// ---------------------------------------------------------------- informação como coisa do mundo (etiqueta no objeto)

/** Número que aparece no próprio objeto da cena (sem abrir nada): saúde no espelho, tempo livre em bolinhas na cama e no
 *  calendário, dinheiro no cofre/escrivaninha/livro-caixa, fama no jornal e na revista. Só leitura. */
const TAG5: Record<string, string> = {
  espelho: 'saude', cama: 'energia', 'casa.sofa': 'energia', calcozinha: 'energia', agenda: 'energia', cofrecasa: 'pessoal', 'casa.escrivaninha': 'pessoal',
  livrocaixa: 'caixa', cofre: 'caixaLivre', jornal: 'fama', revista: 'melhorParada', radiotv: 'fama', trofeus: 'premios', retratoscasa: 'filhos',
  quadrofunc: 'equipe', mural: 'artistas', jornalpredio: 'fama', banco: 'divida',
};
export function worldTag5(s: GameState, id: string): string | undefined {
  const n = TAG5[id];
  if (!n || !nav5On(s)) return undefined;
  return peek5(s, () => { try { const v = NUMS5[n].val(s); return v ? `${n === 'saude' || n === 'fama' ? `${t(NUMS5[n].label)} ` : ''}${v.value.replace(/^★ /, '')}` : undefined; } catch { return undefined; } });
}
