// Rodada 20 (G4, uiux §3.4 / analise B34) — REGISTRO ÚNICO DE AÇÕES por entidade (hoje: artista do elenco).
// Uma definição alimenta o menu `Ações ▾` da página Artistas, o clique direito no card do elenco, os botões rápidos
// fixados no cabeçalho, a busca Ctrl+K, o cartão do artista na sede espacial e o tutorial. Cada ação tem id, rótulo
// bilíngue, categoria, alvo, elegibilidade com motivo de bloqueio, custo estimado, tempo/capacidade, forma (navegar,
// pré-visualizar e confirmar, ou painel próprio) e execução que REVALIDA a regra (o estado e o caixa podem ter mudado
// depois de abrir o menu). Abrir o menu ou a pré-visualização nunca muda o estado.
//
// Puro (sem DOM): a interface (ui/sys/actmenu20.ts) desenha; testes rodam em Node.
//
//   registerAction20({ id: 'x.y', label: l('…', '…'), cat: 'music', form: 'confirm', mutates: true, run: (s, c) => … });
//   actionRows20(s, { act })            // linhas do menu (visíveis), com bloqueio/custo/tempo/efeito já calculados
//   runAction20(s, 'x.y', { act })      // revalida e executa → { ok, text, nav?, cutscene? }
//   batchPreview20(s, 'rest.add', ids)  // escopo explícito: elegibilidade e custo por artista antes de aplicar

import { AGENDA_ACTIONS, agendaById } from '../data/people';
import { STUDIO_TIERS } from '../data/rules';
import { l, type L } from '../data/world';
import { defaultAgenda, freeCapacity, slotCost, slotsFor, slotWeek, usedSlots } from '../sim/agenda';
import { calendar19 } from '../sim/calendar19';
import { agendaLoad, slotLoad } from '../sim/capacity';
import { raiseRoyalty } from '../sim/contracts';
import type { Cutscene } from '../sim/ext4';
import { actState } from '../sim/people';
import { personActions18 } from '../sim/personact18';
import { recordingCost, recordingSessionsAvailable, unrecorded } from '../sim/production';
import { plannedCombos } from '../sim/sys/agenda7';
import { renewWithReading } from '../sim/sys/explain12';
import { actStatus } from '../sim/sys/hq8';
import { canTalk, talk } from '../sim/sys/people/talks';
import { STAGE_NAMES, openProjects, projectStage } from '../sim/sys/project8';
import { canInterview, startInterview } from '../sim/sys/scenes/interview';
import { canVisitRadio, startRadioVisit } from '../sim/sys/scenes/radio';
import type { Act, AgendaSlot, GameState } from '../sim/types';
import { fmtL, money, playerActs, rngOf, staffSkill } from '../sim/util';

// ---------------------------------------------------------------- tipos

export type Cat20 = 'music' | 'stage' | 'career' | 'media' | 'care' | 'more';
/** Grupos do menu (uiux §3.2), na ordem de exibição. */
export const CAT20: { id: Cat20; label: L }[] = [
  { id: 'music', label: l('Agenda e música', 'Agenda and music') },
  { id: 'stage', label: l('Palco', 'Stage') },
  { id: 'career', label: l('Carreira e contrato', 'Career and contract') },
  { id: 'media', label: l('Público e mídia', 'Audience and media') },
  { id: 'care', label: l('Relações e saúde', 'Relations and health') },
  { id: 'more', label: l('Mais detalhes', 'More details') },
];

/** Subabas da página Artistas (uiux §2.1); 'full' = ficha integral (modo especialista). */
export type Sub20 = 'overview' | 'agenda' | 'career' | 'audience' | 'members' | 'full';
export const SUB20: { id: Sub20; label: L; icon: string }[] = [
  { id: 'overview', label: l('Visão geral', 'Overview'), icon: 'eye' },
  { id: 'agenda', label: l('Agenda e projetos', 'Agenda and projects'), icon: 'calendar' },
  { id: 'career', label: l('Carreira e contrato', 'Career and contract'), icon: 'contract' },
  { id: 'audience', label: l('Público e mídia', 'Audience and media'), icon: 'fans' },
  { id: 'members', label: l('Integrantes e relações', 'Members and relations'), icon: 'people' },
  { id: 'full', label: l('Ficha completa', 'Full sheet'), icon: 'book' },
];
/** Chave do estado das subabas (vis.ts tabs/setTab): trocar de artista preserva a subaba. */
export const SUBTAB_KEY20 = 'artists20';

export interface Ctx20 { act: string }
/** Destino de navegação (a interface aplica). `sub` = subaba da página Artistas; `open` = painel/ficha a abrir. */
export interface Nav20 { area?: string; tab?: [string, string]; act?: string; sub?: Sub20; open?: 'act' | 'record20' | 'pa18' | 'batch' | 'pins'; person?: string }
export interface Out20 { ok: boolean; text: L; nav?: Nav20; cutscene?: Cutscene }
/** nav = só leva a outro lugar; confirm = pré-visualiza e pede confirmação; panel = formulário próprio. */
export type Form20 = 'nav' | 'confirm' | 'panel';

export interface Action20 {
  id: string;
  label: L;
  cat: Cat20;
  icon?: string;
  /** entidade-alvo (hoje só artistas do elenco) */
  target: 'act';
  desc?: L;
  form: Form20;
  /** muda o estado do jogo (as de navegação não mudam) */
  mutates: boolean;
  /** aceita aplicação em lote com escopo explícito */
  batch?: boolean;
  /** some quando falso (ex.: dinâmica só com 2+ integrantes) */
  visible?: (s: GameState, c: Ctx20) => boolean;
  /** elegibilidade: null = pode; L = por que não */
  block?: (s: GameState, c: Ctx20) => L | null;
  /** custo estimado em centavos da época */
  cost?: (s: GameState, c: Ctx20) => number;
  /** tempo/capacidade consumidos */
  time?: (s: GameState, c: Ctx20) => L | null;
  /** efeito esperado (o que vai mudar) */
  effect?: (s: GameState, c: Ctx20) => L | null;
  /** destino de navegação (form 'nav') ou painel (form 'panel') */
  nav?: (s: GameState, c: Ctx20) => Nav20;
  /** execução (form 'confirm'); só é chamada por runAction20, depois da revalidação */
  run?: (s: GameState, c: Ctx20) => Out20;
}

export interface Row20 { def: Action20; block: L | null; cost: number; time: L | null; effect: L | null }

const REG: Action20[] = [];
export function registerAction20(a: Action20): void {
  const i = REG.findIndex((x) => x.id === a.id);
  if (i >= 0) REG[i] = a; else REG.push(a);
}
export const actions20 = (): readonly Action20[] => REG;
export const action20 = (id: string): Action20 | undefined => REG.find((x) => x.id === id);

// ---------------------------------------------------------------- elegibilidade comum

const mineAct = (s: GameState, id: string): Act | undefined => (playerActs(s).includes(id) ? s.acts[id] : undefined);
const N = (pt: string, en: string): L => l(pt, en);
const NOT_MINE = N('Só artistas do seu elenco.', 'Only acts on your roster.');

/** Motivo de bloqueio comum a toda ação sobre artista (fora do elenco, separado, aposentado). */
function baseBlock(s: GameState, c: Ctx20): L | null {
  const a = mineAct(s, c.act);
  if (!a) return NOT_MINE;
  if (a.status === 'retired' || a.status === 'split') return N('O artista encerrou a carreira.', 'The act has ended its career.');
  return null;
}

/** Calcula a linha de uma ação (sem executar nada). */
function rowOf(s: GameState, def: Action20, c: Ctx20): Row20 {
  const block = baseBlock(s, c) ?? def.block?.(s, c) ?? null;
  const cost = def.cost?.(s, c) ?? 0;
  const cashBlock = !block && def.mutates && cost > 0 && s.player.cash < cost ? N('Caixa insuficiente.', 'Not enough cash.') : null;
  return { def, block: block ?? cashBlock, cost, time: def.time?.(s, c) ?? null, effect: def.effect?.(s, c) ?? null };
}

/** Linhas visíveis do menu para o alvo, na ordem das categorias e do registro. Ação com erro some (não derruba o menu). */
export function actionRows20(s: GameState, c: Ctx20): Row20[] {
  const out: Row20[] = [];
  for (const cat of CAT20) for (const def of REG) {
    if (def.cat !== cat.id) continue;
    try {
      if (def.visible && !def.visible(s, c)) continue;
      out.push(rowOf(s, def, c));
    } catch { /* ação quebrada some */ }
  }
  return out;
}

/** Uma linha (para pré-visualização e botões rápidos); undefined se invisível/inexistente. */
export function actionRow20(s: GameState, id: string, c: Ctx20): Row20 | undefined {
  const def = action20(id);
  if (!def) return undefined;
  try {
    if (def.visible && !def.visible(s, c)) return undefined;
    return rowOf(s, def, c);
  } catch { return undefined; }
}

/** Executa com REVALIDAÇÃO (visibilidade, bloqueio e caixa recalculados agora). Navegação/painel não mudam estado. */
export function runAction20(s: GameState, id: string, c: Ctx20): Out20 {
  const def = action20(id);
  if (!def) return { ok: false, text: N('Ação desconhecida.', 'Unknown action.') };
  const r = actionRow20(s, id, c);
  if (!r) return { ok: false, text: N('Ação indisponível para este artista agora.', 'Action unavailable for this act right now.') };
  if (r.block) return { ok: false, text: r.block };
  if (def.form !== 'confirm' || !def.run) return { ok: true, text: def.label, nav: def.nav?.(s, c) };
  return def.run(s, c);
}

// ---------------------------------------------------------------- lote (escopo explícito)

export interface BatchRow20 { act: string; name: string; block: L | null; cost: number }
export const batchable20 = (): Action20[] => REG.filter((x) => x.batch && x.form === 'confirm');
/** Prévia por artista: quem é elegível, quem não é (e por quê) e o custo total. Não muda nada. */
export function batchPreview20(s: GameState, id: string, acts: string[]): { rows: BatchRow20[]; total: number; ok: number } {
  const rows = acts.map((act) => {
    const r = actionRow20(s, id, { act });
    return { act, name: s.acts[act]?.name ?? act, block: r ? r.block : N('Não se aplica a este artista.', 'Does not apply to this act.'), cost: r?.cost ?? 0 };
  });
  return { rows, total: rows.filter((x) => !x.block).reduce((t, x) => t + x.cost, 0), ok: rows.filter((x) => !x.block).length };
}
/** Aplica a todos os elegíveis (cada um revalidado na hora). */
export function runBatch20(s: GameState, id: string, acts: string[]): { act: string; out: Out20 }[] {
  return acts.map((act) => ({ act, out: runAction20(s, id, { act }) }));
}

// ---------------------------------------------------------------- favoritos e busca

/** Fixados de fábrica no cabeçalho (uiux §2.1: Agenda e Abrir projeto). */
export const DEFAULT_PINS20 = ['agenda.edit', 'project.open'];
/** Fixa/desafixa uma ação (máx. 5, ordem de inclusão). */
export function togglePin20(pins: string[], id: string, max = 5): string[] {
  return pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id].slice(-max);
}

/** Entradas do Ctrl+K: "Ação › artista" para cada artista e ação visível (mesmo custo/bloqueio do menu). */
export function paletteEntries20(s: GameState, acts: string[]): { id: string; act: string; label: L; hint: L | null; block: L | null }[] {
  const out: { id: string; act: string; label: L; hint: L | null; block: L | null }[] = [];
  for (const act of acts) {
    const a = s.acts[act];
    if (!a) continue;
    for (const r of actionRows20(s, { act })) {
      if (r.def.id === 'batch.open' || r.def.id === 'pins.manage') continue;
      out.push({ id: r.def.id, act, label: fmtL(N('{x} — {a}', '{x} — {a}'), { x: r.def.label, a: a.name }), hint: r.block, block: r.block });
    }
  }
  return out;
}

// ---------------------------------------------------------------- leitura do artista (cabeçalho, elenco, filtros)

export interface Alert20 { text: L; critical: boolean; tone: 'bad' | 'warn' | 'info'; nav?: Nav20 }
const HEALTH: Record<string, L> = {
  voice_strain: N('voz forçada', 'voice strain'), burnout: N('esgotamento', 'burnout'), addiction: N('dependência', 'addiction'), ill: N('doente', 'ill'), recovering: N('em recuperação', 'recovering'),
};

/** Alertas objetivos do artista; os CRÍTICOS (contrato acabando, indisponível, crise de saúde, promessa vencendo,
 *  resposta pendente) nunca são escondidos — cabeçalho, visão geral e a contagem dos filtros os mostram. */
export function alerts20(s: GameState, a: Act): Alert20[] {
  const out: Alert20[] = [];
  const st = actStatus(s, a);
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (a.status === 'hiatus') out.push({ text: N('Indisponível: em pausa.', 'Unavailable: on hiatus.'), critical: true, tone: 'bad', nav: { sub: 'overview', act: a.id } });
  if (st.attention.includes('decision')) out.push({ text: N('Decisão esperando resposta.', 'Decision awaiting an answer.'), critical: true, tone: 'bad', nav: { area: 'cockpit' } });
  if (st.attention.includes('take')) out.push({ text: N('Take esperando escolha no estúdio.', 'Take waiting for a choice in the studio.'), critical: true, tone: 'bad', nav: { area: 'studio' } });
  if (st.attention.includes('crisis')) out.push({ text: N('Crise aberta.', 'Open crisis.'), critical: true, tone: 'bad', nav: { area: 'cockpit' } });
  if (st.attention.includes('contract') && c) out.push({ text: fmtL(N('Contrato acaba em {w} sem.', 'Contract ends in {w} wk.'), { w: Math.max(0, c.endWeek - s.week) }), critical: true, tone: 'bad', nav: { sub: 'career', act: a.id } });
  for (const p of c?.promises ?? []) if (p.kept === undefined && p.dueWeek >= s.week && p.dueWeek - s.week <= 8) {
    out.push({ text: fmtL(N('Promessa vence em {w} sem.', 'Promise due in {w} wk.'), { w: p.dueWeek - s.week }), critical: true, tone: 'bad', nav: { sub: 'career', act: a.id } });
    break;
  }
  const sick = a.members.map((m) => s.persons[m]).filter((p) => p?.alive && p.health && p.health !== 'ok');
  for (const p of sick.slice(0, 2)) out.push({ text: fmtL(N('{n}: {h}.', '{n}: {h}.'), { n: p.name, h: HEALTH[p.health] ?? p.health }), critical: p.health !== 'recovering', tone: p.health === 'recovering' ? 'warn' : 'bad', nav: { sub: 'members', act: a.id } });
  if (st.attention.includes('tired')) out.push({ text: N('Exausto: risco de quebrar.', 'Exhausted: at risk of breaking.'), critical: true, tone: 'bad', nav: { sub: 'agenda', act: a.id } });
  if (st.attention.includes('trust')) out.push({ text: N('Confiança baixa.', 'Low trust.'), critical: false, tone: 'warn', nav: { sub: 'career', act: a.id } });
  if (st.attention.includes('empty')) out.push({ text: N('Agenda vazia.', 'Empty agenda.'), critical: false, tone: 'warn', nav: { sub: 'agenda', act: a.id } });
  if (st.attention.includes('queue')) out.push({ text: N('Músicas na fila do estúdio.', 'Songs queued for the studio.'), critical: false, tone: 'info', nav: { sub: 'agenda', act: a.id } });
  return out.sort((x, y) => Number(y.critical) - Number(x.critical));
}

/** Próximo compromisso com data (lançamento programado ou prazo do calendário único que aponta para o artista). */
export function nextCommitment20(s: GameState, a: Act): { w: number; text: L } | null {
  const pr = s.pendingReleases.find((p) => p.actId === a.id);
  let best: { w: number; text: L } | null = pr ? { w: pr.week, text: fmtL(N('Lançamento "{t}"', 'Release "{t}"'), { t: pr.title }) } : null;
  try {
    const d = calendar19(s, { weeks: 26 }).find((x) => x.goto?.act === a.id);
    if (d && (!best || d.w < best.w)) best = { w: d.w, text: d.t };
  } catch { /* calendário indisponível */ }
  return best;
}

/** Projeto musical atual (sete fases) do artista, se houver. */
export function project20(s: GameState, a: Act): { id: string; title: string; stage: L } | null {
  try {
    const p = openProjects(s, a.id)[0];
    return p ? { id: p.id, title: p.title || p.type.toUpperCase(), stage: STAGE_NAMES[projectStage(s, p)] } : null;
  } catch { return null; }
}

export interface Filter20 { state: 'all' | 'active' | 'hiatus' | 'tired'; urgency: 'all' | 'critical'; project: 'all' | 'with' | 'without'; role: 'all' | 'band' | 'solo' | 'own' }
export const FILTER0_20: Filter20 = { state: 'all', urgency: 'all', project: 'all', role: 'all' };

/** Filtra o elenco. Devolve também quem tem alerta crítico e ficou oculto (para avisar — filtro não esconde obrigação). */
export function filterRoster20(s: GameState, ids: string[], f: Filter20): { shown: string[]; hiddenCritical: string[] } {
  const ok = (id: string): boolean => {
    const a = s.acts[id];
    if (!a) return false;
    if (f.role === 'band' && a.members.length < 2) return false;
    if (f.role === 'solo' && a.members.length >= 2) return false;
    if (f.role === 'own' && !a.playerBand) return false;
    if (f.state === 'active' && a.status === 'hiatus') return false;
    if (f.state === 'hiatus' && a.status !== 'hiatus') return false;
    if (f.state === 'tired') { const st = actState(s, a); if (st.fatigue <= 60 && st.stress <= 65) return false; }
    if (f.urgency === 'critical' && !alerts20(s, a).some((x) => x.critical)) return false;
    if (f.project !== 'all') { const has = !!project20(s, a); if ((f.project === 'with') !== has) return false; }
    return true;
  };
  const shown = ids.filter(ok);
  const hiddenCritical = ids.filter((id) => !shown.includes(id) && s.acts[id] && alerts20(s, s.acts[id]).some((x) => x.critical));
  return { shown, hiddenCritical };
}

// ---------------------------------------------------------------- agenda: plano com prévia (usada pelas ações e pelo Protótipo A)

/** Agenda atual editável (delegada → a sugestão da equipe, que vira manual ao confirmar). */
export function baseAgenda20(s: GameState, a: Act): AgendaSlot[] {
  const cur = s.delegated[a.id] !== false ? defaultAgenda(s, a) : (s.agenda[a.id] ?? []);
  return cur.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } }));
}

export interface AgendaPlan20 { slots: AgendaSlot[]; dropped: AgendaSlot[]; block: L | null; load: number; cap: number; cost: number }
/**
 * Acrescenta `add` à agenda do mês respeitando slots e capacidade reais; quando não cabe, tira do fim o que já
 * estava (nunca o que foi pedido) e lista o que saiu. `replace` tira antes as ações com esses ids (ex.: regravar o plano).
 */
export function planAgenda20(s: GameState, a: Act, add: AgendaSlot[], replace: string[] = []): AgendaPlan20 {
  const base = baseAgenda20(s, a).filter((x) => !replace.includes(x.action));
  const cap = freeCapacity(s, a);
  const max = slotsFor(a);
  const need = usedSlots(add), needLoad = agendaLoad(add);
  if (need > max || needLoad > cap) return { slots: base, dropped: [], block: N('Não cabe no mês: capacidade ou espaços da agenda insuficientes.', 'Does not fit this month: not enough capacity or agenda slots.'), load: agendaLoad(base), cap, cost: 0 };
  const keep = [...base];
  const dropped: AgendaSlot[] = [];
  while (keep.length && (usedSlots(keep) + need > max || agendaLoad(keep) + needLoad > cap)) dropped.unshift(keep.pop()!);
  const slots = [...keep, ...add];
  const cost = add.reduce((t, x) => t + money(s, agendaById[x.action]?.cost ?? 0), 0);
  return { slots, dropped, block: null, load: agendaLoad(slots), cap, cost };
}
/** Grava o plano (a agenda passa a manual). */
export function commitAgenda20(s: GameState, a: Act, slots: AgendaSlot[]): void {
  s.agenda[a.id] = slots;
  s.delegated[a.id] = false;
}

export const agName20 = (id: string): L => agendaById[id]?.name ?? l(id, id);
const agName = agName20;
const slotText = (xs: AgendaSlot[]): string => xs.map((x) => agName(x.action).pt).join(', ');
const slotL = (xs: AgendaSlot[]): L => l(xs.map((x) => agName(x.action).pt).join(', '), xs.map((x) => agName(x.action).en).join(', '));

/** Ação "acrescentar X à agenda do mês" com prévia do que sai, custo e capacidade. */
function addSlotAction(id: string, action: string, cat: Cat20, label: L, effect: L, icon: string): void {
  const plan = (s: GameState, c: Ctx20) => planAgenda20(s, s.acts[c.act], [{ action, params: { week: action === 'rest' ? 4 : 1 } }]);
  registerAction20({
    id, label, cat, icon, target: 'act', form: 'confirm', mutates: true, batch: true, desc: agendaById[action]?.desc,
    block: (s, c) => (s.acts[c.act].status === 'hiatus' && action !== 'rest' ? N('Em pausa: só descanso.', 'On hiatus: rest only.') : plan(s, c).block),
    cost: (s) => money(s, agendaById[action]?.cost ?? 0),
    time: (s, c) => { const p = plan(s, c); return fmtL(N('{l}% da capacidade do mês · ocupação {u}% de {c}%', '{l}% of the month\'s capacity · load {u}% of {c}%'), { l: slotLoad({ action }), u: p.load, c: p.cap }); },
    effect: (s, c) => { const p = plan(s, c); return p.dropped.length ? fmtL(N('{e} Sai da agenda: {d}.', '{e} Leaves the agenda: {d}.'), { e: effect, d: slotL(p.dropped) }) : effect; },
    run: (s, c) => {
      const a = s.acts[c.act];
      const p = plan(s, c);
      if (p.block) return { ok: false, text: p.block };
      commitAgenda20(s, a, p.slots);
      return { ok: true, text: fmtL(N('{x} na agenda de {a}.', '{x} added to {a}\'s agenda.'), { x: agName(action), a: a.name }), nav: { sub: 'agenda', act: a.id } };
    },
  });
}

// ---------------------------------------------------------------- Protótipo A: preparar gravação

export type RecOpt20 = 'now' | 'rehearse' | 'train' | 'producer';
export interface RecPlan20 {
  songs: { id: string; title: string; score: number }[];
  take: number;
  state: { morale: number; fatigue: number; stress: number; inspiration: number; rehearsed: number; health: L | null; mood: number };
  studio: { sessions: number; producer: number; tiers: { id: number; name: L; cost: number; ok: boolean }[] };
  options: { id: RecOpt20; name: L; fx: L; plan: AgendaPlan20 | null; nav?: Nav20 }[];
  block: L | null;
}

/** Dados do painel "Preparar gravação" — tudo das regras existentes (production.recordSongs, agenda, combos). */
export function recordPlan20(s: GameState, actId: string, tier = s.player.hq >= 1 ? 0 : 1, approach = 'balanced'): RecPlan20 {
  const a = s.acts[actId];
  const songs = unrecorded(s, a).sort((x, y) => y.melody + y.lyrics - (x.melody + x.lyrics));
  const take = a.playerBand && s.config.role === 'artist' ? 4 : 5;
  const st = actState(s, a);
  const sick = a.members.map((m) => s.persons[m]).find((p) => p?.alive && p.health && p.health !== 'ok');
  const mood = Math.round((st.morale - 50) / 8 - st.fatigue / 12);
  const n = Math.min(take, Math.max(1, songs.length));
  const tiers = STUDIO_TIERS.map((x) => ({ id: x.id, name: x.name, cost: recordingCost(s, x.id, approach, n), ok: x.id > 0 || s.player.hq >= 1 }));
  const rec: AgendaSlot = { action: 'record', params: { tier, approach, week: 2 } };
  const opt = (pre: string | null): AgendaPlan20 => {
    const add = pre ? [{ action: pre, params: { week: 1 } }, rec] : [{ ...rec, params: { ...rec.params, week: 1 } }];
    const p = planAgenda20(s, a, add, ['record']);
    p.cost += recordingCost(s, tier, approach, n);
    return p;
  };
  const dim = Math.max(0, 15 - a.rehearsed);
  const block = songs.length === 0 ? N('Nenhuma música escrita esperando gravação: componha primeiro.', 'No written songs waiting to be recorded: write first.')
    : a.status === 'hiatus' ? N('O artista está em pausa.', 'The act is on hiatus.')
    : sick && sick.health !== 'recovering' ? fmtL(N('{n} não está em condições ({h}).', '{n} is not fit ({h}).'), { n: sick.name, h: HEALTH[sick.health] ?? sick.health }) : null;
  return {
    songs: songs.slice(0, 8).map((x) => ({ id: x.id, title: x.title, score: Math.round((x.melody + x.lyrics) / 2) })),
    take,
    state: { ...st, rehearsed: a.rehearsed, health: sick ? (HEALTH[sick.health] ?? null) : null, mood },
    studio: { sessions: recordingSessionsAvailable(s), producer: Math.round(staffSkill(s, 'producer') * 0.22), tiers },
    options: [
      { id: 'now', name: N('Gravar agora', 'Record now'), fx: fmtL(N('Grava até {n} faixas já. Humor/cansaço pesam {m} na interpretação.', 'Records up to {n} tracks now. Mood/fatigue weigh {m} on the performance.'), { n: Math.min(take, songs.length), m: mood >= 0 ? `+${mood}` : mood }), plan: opt(null) },
      { id: 'rehearse', name: N('Ensaiar primeiro', 'Rehearse first'), fx: fmtL(N('Ensaio antes (semana 1): entrosamento +{r} → interpretação até +{p} por faixa; custa um espaço da agenda.', 'Rehearsal first (week 1): tightness +{r} → performance up to +{p} per track; costs an agenda slot.'), { r: Math.min(6, dim), p: Math.round(Math.min(6, dim) * 0.6 * 10) / 10 }), plan: opt('rehearse') },
      { id: 'train', name: N('Treinar antes ("Técnica em dia")', 'Train first ("Chops in shape")'), fx: N('Treino antes de gravar ativa a combinação: voz e instrumento sobem antes da sessão.', 'Training before recording triggers the combo: voice and instrument grow before the session.'), plan: opt('train') },
      { id: 'producer', name: N('Buscar produtor/sessão', 'Find a producer/session'), fx: fmtL(N('Produtor da casa soma +{p} de produção hoje. Contratar um melhor sobe a produção de cada faixa.', 'The in-house producer adds +{p} production today. Hiring a better one raises every track\'s production.'), { p: Math.round(staffSkill(s, 'producer') * 0.22) }), plan: null, nav: { area: 'producers15' } },
    ],
    block,
  };
}

/** Confirma o plano escolhido (revalida tudo agora). */
export function applyRecordPlan20(s: GameState, actId: string, opt: RecOpt20, tier?: number, approach?: string): Out20 {
  const a = mineAct(s, actId);
  if (!a) return { ok: false, text: NOT_MINE };
  const rp = recordPlan20(s, actId, tier, approach);
  if (rp.block) return { ok: false, text: rp.block };
  const o = rp.options.find((x) => x.id === opt);
  if (!o) return { ok: false, text: N('Opção inválida.', 'Invalid option.') };
  if (!o.plan) return { ok: true, text: o.name, nav: o.nav };
  if (o.plan.block) return { ok: false, text: o.plan.block };
  if (tier !== undefined && !rp.studio.tiers.find((x) => x.id === tier)?.ok) return { ok: false, text: N('Sem estúdio próprio na sede: escolha um estúdio de fora.', 'No in-house studio at HQ: pick an outside studio.') };
  if (s.player.cash < o.plan.cost) return { ok: false, text: N('Caixa insuficiente para a sessão.', 'Not enough cash for the session.') };
  commitAgenda20(s, a, o.plan.slots);
  const combos = plannedCombos(o.plan.slots).map((x) => x.combo.name);
  return { ok: true, text: fmtL(N('Plano de gravação de {a} na agenda: {x}{c}.', '{a}\'s recording plan is on the agenda: {x}{c}.'), { a: a.name, x: slotText(o.plan.slots.filter((x) => x.action === 'record' || x.action === opt)), c: combos.length ? ` ✦ ${combos.map((x) => x.pt).join(', ')}` : '' }), nav: { sub: 'agenda', act: a.id } };
}

// ---------------------------------------------------------------- catálogo de ações do artista (reutiliza regras existentes)

const leaderOf = (s: GameState, a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) && !s.persons[a.leaderId]?.isPlayer ? a.leaderId : a.members.find((m) => s.persons[m]?.alive && !s.persons[m].isPlayer));
const playerContract = (s: GameState, a: Act) => { const c = a.contractId ? s.contracts[a.contractId] : undefined; return c && c.party === 'player' && !a.playerBand ? c : undefined; };
const renewBonus = (s: GameState, a: Act) => money(s, 1500 + a.fame * a.fame * 15);

// Agenda e música
registerAction20({ id: 'agenda.edit', label: N('Editar agenda do mês', 'Edit this month\'s agenda'), cat: 'music', icon: 'calendar', target: 'act', form: 'nav', mutates: false,
  time: (s, c) => { const a = s.acts[c.act]; const sl = baseAgenda20(s, a); return fmtL(N('{u}/{m} espaços · {l}% de {c}%', '{u}/{m} slots · {l}% of {c}%'), { u: usedSlots(sl), m: slotsFor(a), l: agendaLoad(sl), c: freeCapacity(s, a) }); },
  nav: (_s, c) => ({ sub: 'agenda', act: c.act }) });
registerAction20({ id: 'project.open', label: N('Abrir projeto atual', 'Open current project'), cat: 'music', icon: 'disc', target: 'act', form: 'nav', mutates: false,
  effect: (s, c) => { const p = project20(s, s.acts[c.act]); return p ? fmtL(N('"{t}" · fase: {f}', '"{t}" · stage: {f}'), { t: p.title, f: p.stage }) : N('Sem disco em andamento: abre a tela para começar um.', 'No record in progress: opens the screen to start one.'); },
  nav: (_s, c) => ({ area: 'project', act: c.act }) });
registerAction20({ id: 'record.prepare', label: N('Preparar gravação', 'Prepare a recording'), cat: 'music', icon: 'mic', target: 'act', form: 'panel', mutates: false,
  desc: N('Músicas prontas, voz/energia e estúdio; compare gravar agora, ensaiar antes ou buscar produtor.', 'Ready songs, voice/energy and studio; compare recording now, rehearsing first or finding a producer.'),
  block: (s, c) => recordPlan20(s, c.act).block,
  time: (s, c) => fmtL(N('Gravar ocupa {n} espaços · {l}% da capacidade', 'Recording takes {n} slots · {l}% of capacity'), { n: slotCost('record'), l: slotLoad({ action: 'record' }) }),
  effect: (s, c) => fmtL(N('{n} música(s) escrita(s) esperando', '{n} written song(s) waiting'), { n: unrecorded(s, s.acts[c.act]).length }),
  nav: (_s, c) => ({ open: 'record20', act: c.act }) });
registerAction20({ id: 'repertoire.open', label: N('Abrir repertório', 'Open repertoire'), cat: 'music', icon: 'note', target: 'act', form: 'nav', mutates: false,
  nav: (_s, c) => ({ area: 'creation', tab: ['creation-write', 'repertoire'], act: c.act }) });
registerAction20({ id: 'agenda.manual', label: N('Assumir a agenda (sair da delegação)', 'Take over the agenda (stop delegating)'), cat: 'music', icon: 'pen', target: 'act', form: 'confirm', mutates: true, batch: true,
  visible: (s, c) => s.delegated[c.act] !== false,
  effect: (s, c) => fmtL(N('A sugestão da equipe vira sua agenda manual: {x}.', 'The team\'s suggestion becomes your manual agenda: {x}.'), { x: slotText(defaultAgenda(s, s.acts[c.act])) || '—' }),
  run: (s, c) => { const a = s.acts[c.act]; commitAgenda20(s, a, baseAgenda20(s, a)); return { ok: true, text: fmtL(N('Agenda de {a} agora é manual.', '{a}\'s agenda is now manual.'), { a: a.name }), nav: { sub: 'agenda', act: a.id } }; } });
registerAction20({ id: 'agenda.delegate', label: N('Delegar a agenda à equipe', 'Delegate the agenda to the team'), cat: 'music', icon: 'people', target: 'act', form: 'confirm', mutates: true, batch: true,
  visible: (s, c) => s.delegated[c.act] === false,
  effect: () => N('A equipe monta a agenda todo mês (descanso, composição, estúdio e shows conforme o estado).', 'The team builds the agenda every month (rest, writing, studio and gigs by state).'),
  run: (s, c) => { s.delegated[c.act] = true; return { ok: true, text: fmtL(N('Agenda de {a} delegada.', '{a}\'s agenda delegated.'), { a: s.acts[c.act].name }) }; } });

// Palco
addSlotAction('rehearse.add', 'rehearse', 'stage', N('Ensaiar este mês', 'Rehearse this month'), N('Entrosamento sobe: melhor palco e melhor próxima gravação.', 'Tightness rises: better stage and better next recording.'), 'guitar');
registerAction20({ id: 'shows.view', label: N('Ver shows e turnês', 'See gigs and tours'), cat: 'stage', icon: 'tour-bus', target: 'act', form: 'nav', mutates: false,
  effect: (s, c) => { const n = nextCommitment20(s, s.acts[c.act]); return n ? fmtL(N('Próximo: {t} (sem. {w})', 'Next: {t} (wk {w})'), { t: n.text, w: Math.max(0, n.w - s.week) }) : null; },
  nav: (_s, c) => ({ area: 'shows', act: c.act }) });
registerAction20({ id: 'calendar.view', label: N('Prazos no calendário', 'Deadlines on the calendar'), cat: 'stage', icon: 'datebook', target: 'act', form: 'nav', mutates: false,
  nav: () => ({ area: 'calendar19' }) });

// Carreira e contrato
registerAction20({ id: 'contract.view', label: N('Ver contrato', 'See contract'), cat: 'career', icon: 'contract', target: 'act', form: 'nav', mutates: false,
  visible: (s, c) => !!s.acts[c.act]?.contractId || !!s.acts[c.act]?.playerBand,
  effect: (s, c) => { const k = s.acts[c.act].contractId ? s.contracts[s.acts[c.act].contractId!] : undefined; return k ? fmtL(N('Acaba em {m} meses · royalty {r}% · lançamentos {d}/{o}', 'Ends in {m} months · royalty {r}% · releases {d}/{o}'), { m: Math.max(0, Math.round((k.endWeek - s.week) / 4.35)), r: Math.round(k.royalty * 100), d: k.releasesDone, o: k.releasesOwed }) : null; },
  nav: (_s, c) => ({ sub: 'career', act: c.act }) });
registerAction20({ id: 'contract.renew', label: N('Renovar contrato (36 meses)', 'Renew contract (36 months)'), cat: 'career', icon: 'quill', target: 'act', form: 'confirm', mutates: true,
  visible: (s, c) => !!playerContract(s, s.acts[c.act]),
  cost: (s, c) => renewBonus(s, s.acts[c.act]),
  effect: () => N('Bônus de assinatura; o artista pode recusar (a chance depende de confiança e de quanto cresceu). Recusa custa confiança.', 'Signing bonus; the act may refuse (odds depend on trust and growth). A refusal costs trust.'),
  run: (s, c) => { const a = s.acts[c.act]; const ok = renewWithReading(s, a.id, 36, renewBonus(s, a)); return ok ? { ok: true, text: fmtL(N('{a} renovou por 36 meses.', '{a} renewed for 36 months.'), { a: a.name }), nav: { sub: 'career', act: a.id } } : { ok: false, text: N('Renovação recusada ou sem caixa.', 'Renewal refused or no cash.') }; } });
registerAction20({ id: 'contract.royalty', label: N('Subir royalties (+2 p.p.)', 'Raise royalties (+2 pp)'), cat: 'career', icon: 'coin', target: 'act', form: 'confirm', mutates: true,
  visible: (s, c) => !!playerContract(s, s.acts[c.act]),
  block: (s, c) => (playerContract(s, s.acts[c.act])!.royalty >= 0.6 ? N('Royalty já no teto (60%).', 'Royalty already at the cap (60%).') : null),
  effect: (s, c) => fmtL(N('Royalty {a}% → {b}% em todas as vendas futuras; confiança sobe.', 'Royalty {a}% → {b}% on all future sales; trust rises.'), { a: Math.round(playerContract(s, s.acts[c.act])!.royalty * 100), b: Math.round(Math.min(0.6, playerContract(s, s.acts[c.act])!.royalty + 0.02) * 100) }),
  run: (s, c) => (raiseRoyalty(s, c.act, 0.02) ? { ok: true, text: fmtL(N('Royalties de {a} renegociados.', '{a} royalties renegotiated.'), { a: s.acts[c.act].name }), nav: { sub: 'career', act: c.act } } : { ok: false, text: N('Sem contrato com você.', 'No contract with you.') }) });
registerAction20({ id: 'contract.market', label: N('Mercado de contratos (opções, adiantamentos, licenças)', 'Contract market (options, advances, licences)'), cat: 'career', icon: 'handshake', target: 'act', form: 'nav', mutates: false,
  nav: () => ({ area: 'contracts19' }) });

// Público e mídia
registerAction20({ id: 'press.interview', label: N('Dar entrevista', 'Give an interview'), cat: 'media', icon: 'tv', target: 'act', form: 'confirm', mutates: true,
  block: (s, c) => canInterview(s, c.act),
  effect: () => N('Abre a cena da entrevista: o tom das respostas mexe em fama, imagem e momento; pode render polêmica.', 'Opens the interview scene: your answers\' tone moves fame, image and momentum; may spark controversy.'),
  run: (s, c) => { const cs = startInterview(s, rngOf(s), c.act); return 'kind' in cs ? { ok: true, text: N('Entrevista marcada.', 'Interview booked.'), cutscene: cs as Cutscene } : { ok: false, text: cs as L }; } });
registerAction20({ id: 'press.radio', label: N('Visitar uma rádio', 'Visit a radio station'), cat: 'media', icon: 'radio', target: 'act', form: 'confirm', mutates: true,
  block: (s, c) => canVisitRadio(s, c.act),
  effect: () => N('Abre a cena da rádio: o encaixe com o DJ define execução e alcance.', 'Opens the radio scene: the fit with the DJ sets airplay and reach.'),
  run: (s, c) => { const cs = startRadioVisit(s, rngOf(s), c.act); return 'kind' in cs ? { ok: true, text: N('Visita à rádio.', 'Radio visit.'), cutscene: cs as Cutscene } : { ok: false, text: cs as L }; } });
registerAction20({ id: 'fans.view', label: N('Fãs, fã-clube e imprensa', 'Fans, fan club and press'), cat: 'media', icon: 'fans', target: 'act', form: 'nav', mutates: false,
  effect: (s, c) => { const f = s.acts[c.act].fans; return fmtL(N('Casuais {a} · ativos {b} · núcleo {c}', 'Casual {a} · active {b} · core {c}'), { a: Math.round(f.casual), b: Math.round(f.active), c: Math.round(f.core) }); },
  nav: (_s, c) => ({ sub: 'audience', act: c.act }) });

// Relações e saúde
registerAction20({ id: 'leader.praise', label: N('Elogiar o líder', 'Praise the leader'), cat: 'care', icon: 'heart', target: 'act', form: 'confirm', mutates: true, batch: true,
  visible: (s, c) => !!leaderOf(s, s.acts[c.act]),
  block: (s, c) => canTalk(s, leaderOf(s, s.acts[c.act])!),
  effect: (s, c) => fmtL(N('Moral de {n} (e do grupo) sobe; repetir rende menos.', '{n}\'s (and the group\'s) morale rises; repeating yields less.'), { n: s.persons[leaderOf(s, s.acts[c.act])!]?.name ?? '' }),
  run: (s, c) => { const r = talk(s, leaderOf(s, s.acts[c.act])!, 'praise'); return { ok: r.ok, text: r.text }; } });
addSlotAction('rest.add', 'rest', 'care', N('Dar descanso (pausa na agenda)', 'Give a rest (break in the agenda)'), N('Fadiga e estresse caem; depois da estrada recupera o dobro.', 'Fatigue and stress drop; after the road it recovers twice as much.'), 'sleep');
registerAction20({ id: 'members.view', label: N('Ver integrantes e saúde', 'See members and health'), cat: 'care', icon: 'people', target: 'act', form: 'nav', mutates: false,
  nav: (_s, c) => ({ sub: 'members', act: c.act }) });
registerAction20({ id: 'band.dyn', label: N('Dinâmica da banda', 'Band dynamics'), cat: 'care', icon: 'network', target: 'act', form: 'nav', mutates: false,
  visible: (s, c) => (s.acts[c.act]?.members.length ?? 0) >= 2,
  nav: () => ({ area: 'dyn18', tab: ['dyn18', 'band'] }) });
registerAction20({ id: 'person.more', label: N('Mais ações com o líder…', 'More actions with the leader…'), cat: 'care', icon: 'handshake', target: 'act', form: 'panel', mutates: false,
  visible: (s, c) => !!leaderOf(s, s.acts[c.act]),
  effect: (s, c) => { const p = leaderOf(s, s.acts[c.act])!; const rows = personActions18(s, `p:${p}`); return fmtL(N('{n} ações com chance e custo ({k} disponíveis agora)', '{n} actions with odds and cost ({k} available now)'), { n: rows.length, k: rows.filter((r) => !r.block).length }); },
  nav: (s, c) => ({ open: 'pa18', act: c.act, person: leaderOf(s, s.acts[c.act]) }) });

// Mais detalhes
registerAction20({ id: 'sheet.full', label: N('Página do artista (histórico e explicações)', 'Artist page (history and explanations)'), cat: 'more', icon: 'eye', target: 'act', form: 'nav', mutates: false,
  nav: (_s, c) => ({ open: 'act', act: c.act }) });
registerAction20({ id: 'sheet.expert', label: N('Ficha completa (todos os números)', 'Full sheet (every number)'), cat: 'more', icon: 'book', target: 'act', form: 'nav', mutates: false,
  nav: (_s, c) => ({ sub: 'full', act: c.act }) });
registerAction20({ id: 'batch.open', label: N('Ação em lote…', 'Batch action…'), cat: 'more', icon: 'people', target: 'act', form: 'panel', mutates: false,
  visible: (s) => playerActs(s).length >= 2,
  desc: N('Escolha os artistas, veja quem é elegível e o custo, e aplique.', 'Pick the acts, see who is eligible and the cost, then apply.'),
  nav: (_s, c) => ({ open: 'batch', act: c.act }) });
registerAction20({ id: 'pins.manage', label: N('Fixar ações no cabeçalho…', 'Pin actions to the header…'), cat: 'more', icon: 'pin', target: 'act', form: 'panel', mutates: false,
  nav: (_s, c) => ({ open: 'pins', act: c.act }) });

/** Ações de agenda conhecidas (teste: o registro não inventa ação de agenda que a simulação não conhece). */
export const _agendaIds20 = (): string[] => AGENDA_ACTIONS.map((x) => x.id);
export const _slotWeek20 = slotWeek;

/** Sede espacial (G5 hubs20): sala → ação do registro sobre o artista selecionado (mesmas regras do menu/Ctrl+K). */
export const ROOM_ACTIONS20: Record<string, string> = { booth: 'record.prepare', control: 'record.prepare', rehearsal: 'rehearse.add', writing: 'repertoire.open', lounge: 'rest.add', meeting: 'contract.view' };
