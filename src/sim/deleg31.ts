// R31 · onda 2 (Q) — DELEGAÇÃO ÚNICA (estilo Football Manager). Fonte única de "quem decide o quê":
//
//   • uma lista de responsabilidades (RESP31), agrupadas por departamento, cada uma com quem responde —
//     'me' (eu decido: tudo chega para você), 'staff' (um funcionário com a função certa decide dentro das diretrizes),
//     'partial' (decide até um limite e consulta você acima dele) ou 'rule' (política fixa, sem pessoa);
//   • as diretrizes de cada uma (escopo, orçamento, tetos, "me pergunte acima de X", gêneros, nota mínima…);
//   • a diretriz por artista (prioridade/atenção/teto da agenda delegada + objetivo), antes espalhada em pacing8 e policy18;
//   • o REGISTRO DE AUTOMAÇÃO: tudo o que a equipe/regra decidiu, com quem, por quê, quanto gastou e o resultado,
//     com "desfazer" quando possível; as exceções (o que travou e voltou para você) são entradas do mesmo registro;
//   • os pedidos de aprovação (modo parcial, acima do limite), respondidos na tela ou na Caixa.
//
// Substitui os estados `policy18` (políticas), `bud19.dlg` (delegação por carreira), `pace8.pol/team/log` (delegação
// da agenda e registro da equipe) e `deleg16.log` (prestação de contas dos agentes). Os módulos antigos ficam como
// EXECUTORES (deleg16: ordens dos agentes/promotores; policy18: portões e renovações; budget19: empresário, festival e
// estúdio; pacing8: agenda e lançamento automático; sys/deleg31run: A&R e produtor executivo) e leem/escrevem aqui.
//
// Módulo leve (só ext4, util, dados): não importa sistemas com ganchos (regra da onda 0 para fontes únicas).
// Padrões = comportamento de antes: sem diretriz nova, delegar dá o mesmo resultado das regras antigas.

import { formatMoney, toReal } from '../core/money';
import { clamp } from '../core/rng';
import { STAFF_ROLES } from '../data/rules';
import { l, type L } from '../data/world';
import { registerExt4 } from './ext4';
import type { GameState, StaffMember } from './types';
import { fmtL } from './util';

// ---------------------------------------------------------------- tipos

export type Resp31 = 'anr' | 'renew' | 'exec' | 'agenda' | 'marketing' | 'tour' | 'fest' | 'studio' | 'mandates' | 'finance' | 'rest' | 'press' | 'legal' | 'people' | 'radio';
export type Mode31 = 'me' | 'staff' | 'partial' | 'rule';
export type Dept31 = 'cast' | 'music' | 'release' | 'stage' | 'money' | 'people';
export type Goal31 = 'grow' | 'profit' | 'rest' | 'catalog' | 'free';
export type Prio31 = 'auto' | 'develop' | 'commercial' | 'tour' | 'rest';
export type Tier31 = 0 | 1 | 2;

/** Diretrizes. Valores em dólares de hoje (reais); 0 = sem limite / desligado. */
export interface Dir31 {
  /** teto por decisão (A&R: adiantamento por contrato; produtor: marketing por lançamento; finanças: por gasto) */
  cap?: number;
  /** modo parcial: consultar você acima deste valor */
  ask?: number;
  /** orçamento por mês da responsabilidade (agentes/promotores; agenda: orçamento da equipe) */
  budget?: number;
  /** só estes gêneros (A&R); vazio = todos */
  genres?: string[];
  /** decisões por mês (A&R: propostas) */
  per?: number;
  /** nota mínima de uma faixa para lançar (produtor executivo, 0..100) */
  minQ?: number;
  /** formato preferido (produtor executivo) */
  fmt?: 'auto' | 'single' | 'lp';
  /** renovação: bônus máx. × adiantamento esperado; festival: fração do caixa para o adiantamento do headliner */
  frac?: number;
  /** renovação: prazo em meses */
  months?: number;
  /** confiança mínima (renovação de contrato/mandato) */
  minTrust?: number;
  /** finanças: reserva mínima em meses de custo fixo */
  reserve?: number;
  /** descanso: estresse/cansaço a partir do qual a turnê delegada para */
  rest?: number;
  /** descanso: máximo de shows em 13 semanas por artista */
  maxShows?: number;
  /** festival: aceitar patrocínios / fechar headliner */
  sponsor?: boolean;
  head?: boolean;
}
export interface Set31 { m: Mode31; st?: string; d: Dir31 }
/** Diretriz por artista (agenda delegada + objetivo). */
export interface ActDir31 { p: Prio31; cap: number; tier: Tier31; g?: Goal31 }

export interface Undo31 { k: string; id: string }
export interface Log31 {
  id: number;
  /** semana e mês (ano×12+mês) */
  w: number; m: number;
  r: Resp31;
  /** quem decidiu: id do funcionário, 'rule' (regra), 'team' (equipe sem pessoa), 'player' (você mudou a delegação) */
  who: string;
  /** nome de quem decidiu, no momento (funcionário); vazio para você/regra/equipe — a tela traduz por `logWho31` */
  n: string;
  t: L;
  why?: L;
  /** valor envolvido (centavos nominais; negativo = gasto) */
  amt?: number;
  tone: 'good' | 'bad' | 'info' | 'ask';
  act?: string;
  /** código curto (exceções: tipo; agenda: k do registro da equipe) */
  x?: string;
  /** registro compacto da agenda (pacing8): [o que, motivos] */
  c?: [string, string];
  undo?: Undo31;
  undone?: 1;
}
export interface Ask31 { id: number; r: Resp31; w: number; until: number; who: string; t: L; amt: number; act?: string; k: string; data: Record<string, string | number> }
export interface D31 {
  r: Partial<Record<Resp31, Set31>>;
  acts: Record<string, ActDir31>;
  /** liberações pontuais (chave → semana até quando vale) */
  once: Record<string, number>;
  /** renovações já tentadas (contrato → semana) */
  tried: Record<string, number>;
  /** gasto delegado por responsabilidade no mês */
  spent: { m: number; v: Partial<Record<Resp31, number>> };
  /** W2-REV: decisões desfeitas por você — "não repetir" (responsabilidade:ato → semana até quando vale) */
  nr?: Record<string, number>;
  log: Log31[];
  asks: Ask31[];
  seq: number;
}
declare module './ext4' { interface Ext4 { deleg31: D31 } }
const fresh = (): D31 => ({ r: {}, acts: {}, once: {}, tried: {}, spent: { m: -1, v: {} }, log: [], asks: [], seq: 0 });
registerExt4('deleg31', fresh);
export function d31(s: GameState): D31 {
  const x = s.x4 as unknown as { deleg31?: D31 };
  const d = (x.deleg31 ??= fresh());
  d.r ??= {}; d.acts ??= {}; d.once ??= {}; d.tried ??= {}; d.spent ??= { m: -1, v: {} }; d.log ??= []; d.asks ??= [];
  return d;
}
/** Leitura sem criar estado (quem só olha não mexe no save). */
const ro = (s: GameState): D31 | undefined => (s.x4 as unknown as { deleg31?: D31 } | undefined)?.deleg31;
export const LOG31_MAX = 400;
const mk = (s: GameState): number => s.year * 12 + s.month;

// ---------------------------------------------------------------- catálogo

export interface RespDef31 {
  id: Resp31;
  dept: Dept31;
  name: L;
  desc: L;
  /** funções que podem responder (vazio = só regra) */
  roles: string[];
  modes: Mode31[];
  /** quem responde por padrão (o comportamento de antes) */
  def: Mode31;
  /** diretrizes editáveis */
  dirs: (keyof Dir31)[];
  defDir: Dir31;
  /** linha sem executor nesta versão: o motivo (tudo continua chegando a você) */
  locked?: L;
}

export const DEPT31: Record<Dept31, { name: L; icon: string }> = {
  cast: { name: l('Elenco', 'Roster'), icon: 'people' },
  music: { name: l('Música', 'Music'), icon: 'mic' },
  release: { name: l('Lançamentos', 'Releases'), icon: 'cd' },
  stage: { name: l('Palco', 'Stage'), icon: 'tour-bus' },
  money: { name: l('Dinheiro', 'Money'), icon: 'coin' },
  people: { name: l('Pessoas e imprensa', 'People and press'), icon: 'megaphone' },
};

const R = (id: Resp31, dept: Dept31, name: L, desc: L, roles: string[], modes: Mode31[], def: Mode31, dirs: (keyof Dir31)[], defDir: Dir31 = {}, locked?: L): RespDef31 =>
  ({ id, dept, name, desc, roles, modes, def, dirs, defDir, locked });

export const RESP31: RespDef31[] = [
  R('anr', 'cast', l('A&R e contratação', 'A&R and signing'), l('Escolhe quem o selo tenta contratar entre os atos que você já conhece e faz a proposta (mesmas regras, reuniões e caixa da proposta manual).', 'Picks whom the label tries to sign among acts you already know and makes the offer (same rules, meetings and cash as a manual offer).'),
    ['anr'], ['me', 'staff', 'partial'], 'me', ['cap', 'ask', 'genres', 'per'], { cap: 0, ask: 0, genres: [], per: 1 }),
  R('renew', 'cast', l('Renovações de contrato', 'Contract renewals'), l('Renova contratos do elenco que vencem em até 9 semanas, dentro do bônus, prazo e confiança mínima.', 'Renews roster deals ending within 9 weeks, within the bonus, term and minimum trust.'),
    ['legal', 'manager', 'anr'], ['me', 'staff', 'partial'], 'me', ['frac', 'months', 'minTrust', 'ask'], { frac: 0.3, months: 24, minTrust: 40, ask: 0 }),
  R('exec', 'music', l('Produção executiva', 'Executive production'), l('Decide quando e como lançar o que a equipe gravou nas agendas delegadas: nota mínima, formato e marketing.', 'Decides when and how to release what the team recorded on delegated agendas: minimum grade, format and marketing.'),
    ['producer'], ['me', 'rule', 'staff', 'partial'], 'rule', ['minQ', 'fmt', 'cap', 'ask'], { minQ: 0, fmt: 'auto', cap: 0, ask: 0 }),
  R('studio', 'music', l('Estúdio próprio: sessões', 'Own studio: sessions'), l('Aceita pedidos de sessão quando há sala e engenheiro livres; sem, sobe a exceção.', 'Accepts session requests when a room and engineer are free; otherwise raises an exception.'),
    [], ['me', 'rule'], 'me', []),
  R('agenda', 'release', l('Agenda do elenco', 'Roster agenda'), l('A equipe monta a agenda de cada artista pela prioridade dele (abaixo), dentro do orçamento mensal da equipe.', 'The team plans each act\'s agenda by its priority (below), within the team\'s monthly budget.'),
    [], ['me', 'rule'], 'rule', ['budget'], { budget: 0 }),
  R('marketing', 'release', l('Marketing e divulgação', 'Marketing and promotion'), l('Promotores executam as ordens de divulgação, rádio/clubes e noites do selo.', 'Promoters run the promotion, radio/club and label-night orders.'),
    ['promoter'], ['me', 'staff', 'partial'], 'staff', ['budget', 'ask']),
  R('tour', 'stage', l('Turnês e cachês', 'Tours and fees'), l('Agentes de shows marcam datas, negociam cachês e preenchem os seus festivais pelas ordens permanentes.', 'Booking agents book dates, negotiate fees and fill your festivals through standing orders.'),
    ['booking_agent'], ['me', 'staff', 'partial'], 'staff', ['budget', 'ask']),
  R('radio', 'release', l('Programação da sua rádio/TV/revista', 'Your radio/TV/magazine programming'), l('O diretor de programação monta a grade da semana: troca o que cansou e preenche vagas vazias, com a fração de apostas em artistas novos da diretriz (R31 CAR).', 'The programme director builds the weekly grid: swaps what burned out and fills empty slots, with the directive\'s share of bets on new acts (R31 CAR).'),
    ['promoter', 'anr'], ['me', 'rule', 'staff'], 'me', ['frac', 'minQ'], { frac: 0.2, minQ: 0 }),
  R('rest', 'stage', l('Descanso do elenco', 'Roster rest'), l('Regra fixa: a turnê delegada para quando alguém da banda passa do limite de estresse/cansaço ou de shows no trimestre.', 'Fixed rule: delegated touring stops when a band member passes the stress/fatigue limit or the quarterly show count.'),
    [], ['rule'], 'rule', ['rest', 'maxShows'], { rest: 0, maxShows: 0 }),
  R('fest', 'stage', l('Festival próprio', 'Own festival'), l('Aceita patrocínios que cabem em 90% da projeção e fecha headliner a 5 meses da edição, dentro do teto do caixa.', 'Accepts sponsorships that fit 90% of the projection and books a headliner 5 months out, within the cash cap.'),
    [], ['me', 'rule'], 'me', ['sponsor', 'head', 'frac'], { sponsor: false, head: false, frac: 0.25 }),
  R('mandates', 'cast', l('Mandatos de empresariado', 'Management mandates'), l('A 8 semanas do fim, propõe os mesmos termos aos clientes; abaixo da confiança mínima, volta para você.', '8 weeks before the end, offers clients the same terms; below minimum trust, it comes back to you.'),
    [], ['me', 'rule'], 'me', ['minTrust'], { minTrust: 45 }),
  R('finance', 'money', l('Gastos da equipe', 'Staff spending'), l('Regra fixa para toda a equipe delegada: teto por gasto e reserva mínima de caixa. O que travar vira exceção.', 'Fixed rule for all delegated staff: cap per spend and minimum cash reserve. Anything blocked becomes an exception.'),
    [], ['rule'], 'rule', ['cap', 'reserve'], { cap: 0, reserve: 0 }),
  R('press', 'people', l('Imprensa e crises', 'Press and crises'), l('Entrevistas, notas e crises de imagem.', 'Interviews, statements and image crises.'),
    ['publicist'], ['me'], 'me', [], {}, l('Ainda sem delegação: as crises e pedidos de entrevista chegam para você.', 'No delegation yet: crises and interview requests come to you.')),
  R('legal', 'people', l('Jurídico e disputas', 'Legal and disputes'), l('Processos, cláusulas e disputas de direitos.', 'Lawsuits, clauses and rights disputes.'),
    ['legal'], ['me'], 'me', [], {}, l('Ainda sem delegação: processos e disputas chegam para você (o jurídico já reduz riscos).', 'No delegation yet: lawsuits and disputes come to you (legal staff already lowers risks).')),
  R('people', 'people', l('Equipe: aumentos e saídas', 'Staff: raises and exits'), l('Pedidos de aumento e propostas de rivais pela sua equipe.', 'Raise requests and rival offers for your staff.'),
    ['admin'], ['me'], 'me', [], {}, l('Ainda sem delegação: pedidos de aumento e propostas de rivais chegam para você.', 'No delegation yet: raise requests and rival offers come to you.')),
];
export const respDef31 = (id: Resp31): RespDef31 => RESP31.find((x) => x.id === id)!;

export const MODE31: Record<Mode31, { name: L; desc: L }> = {
  me: { name: l('Eu decido', 'I decide'), desc: l('Tudo chega para você.', 'Everything comes to you.') },
  staff: { name: l('Delegar', 'Delegate'), desc: l('O funcionário decide dentro das diretrizes.', 'The staff member decides within the directives.') },
  partial: { name: l('Parcial', 'Partial'), desc: l('Decide até o limite e consulta você acima dele.', 'Decides up to the limit and asks you above it.') },
  rule: { name: l('Automático pela regra', 'Automatic by rule'), desc: l('Política fixa, sem pessoa.', 'Fixed policy, no person.') },
};

// ---------------------------------------------------------------- leitura

/** Configuração atual (com os padrões de antes). */
export function set31(s: GameState, id: Resp31): Set31 {
  const def = respDef31(id);
  const cur = ro(s)?.r[id];
  return { m: cur?.m ?? def.def, st: cur?.st, d: { ...def.defDir, ...(cur?.d ?? {}) } };
}
export const modeOf31 = (s: GameState, id: Resp31): Mode31 => set31(s, id).m;
export const dirOf31 = (s: GameState, id: Resp31): Dir31 => set31(s, id).d;
/** A responsabilidade está nas mãos da equipe ou de uma regra (não "eu decido")? */
export const on31 = (s: GameState, id: Resp31): boolean => modeOf31(s, id) !== 'me';
/** W2-REV: agenda de quem ENTRA no elenco (assinatura, compra, retorno) — com "Agenda do elenco: Eu decido", fica com
 *  você (não delegada), como as que já estavam; a sua própria banda segue delegada como antes. */
export const joinDelegated31 = (s: GameState, act?: { playerBand?: boolean }): boolean => !!act?.playerBand || modeOf31(s, 'agenda') !== 'me';

const roleName = (role: string): L => STAFF_ROLES.find((x) => x.id === role)?.name ?? l(role, role);
/** Quem da equipe pode responder por esta responsabilidade. */
export const qualified31 = (s: GameState, id: Resp31): StaffMember[] => { const roles = respDef31(id).roles; return roles.length ? s.player.staff.filter((x) => roles.includes(x.role)) : []; };
/**
 * Quem responde: o escolhido (se ainda estiver na equipe e tiver a função) ou o primeiro qualificado na ordem da equipe
 * (a regra de antes da renovação: o primeiro jurídico/empresário/A&R).
 */
export function staffFor31(s: GameState, id: Resp31): StaffMember | undefined {
  const q = qualified31(s, id), want = ro(s)?.r[id]?.st;
  return (want && q.find((x) => x.id === want)) || q[0];
}
/** Motivo de o modo não estar disponível (null = disponível). */
export function lockWhy31(s: GameState, id: Resp31, m: Mode31): L | null {
  const def = respDef31(id);
  if (!def.modes.includes(m)) return def.locked ?? l('Esta responsabilidade não tem esse modo.', 'This responsibility has no such mode.');
  if ((m === 'staff' || m === 'partial') && def.roles.length && !qualified31(s, id).length)
    return fmtL(l('Falta alguém com o cargo: {r}. Contrate na Equipe.', 'You need someone in the role: {r}. Hire in Staff.'), { r: def.roles.map((r) => roleName(r)).reduce((a, b) => l(`${a.pt} / ${b.pt}`, `${a.en} / ${b.en}`)) });
  return null;
}

// ---------------------------------------------------------------- escrita (decisões do jogador)

export interface SetOpts31 { opine?: (s: GameState, key: string, d: number, why: L) => void }
/** Hook de opinião (o executor liga em opinion.ts; aqui não importamos sistemas). */
export const OPINE31: { f?: (s: GameState, key: string, d: number, why: L) => void } = {};

export function setMode31(s: GameState, id: Resp31, m: Mode31, staffId?: string, o: { force?: boolean } = {}): L | null {
  const why = lockWhy31(s, id, m);
  if (why && !(o.force && respDef31(id).modes.includes(m))) return why;
  const d = d31(s), cur = d.r[id] ?? { m: respDef31(id).def, d: {} };
  if (staffId !== undefined) {
    if (staffId && !qualified31(s, id).some((x) => x.id === staffId)) return l('Essa pessoa não tem a função certa.', 'That person does not have the right role.');
    cur.st = staffId || undefined;
  }
  const before = cur.m;
  cur.m = m;
  d.r[id] = cur;
  if (before !== m || staffId) {
    const st = (m === 'staff' || m === 'partial') ? staffFor31(s, id) : undefined;
    logAuto31(s, { r: id, who: 'player', t: fmtL(l('{r}: agora "{m}"{p}.', '{r}: now "{m}"{p}.'), { r: respDef31(id).name, m: MODE31[m].name, p: st ? fmtL(l(' com {n}', ' with {n}'), { n: st.name }) : '' }), tone: 'info' });
    if (st && before !== m) OPINE31.f?.(s, `s:${st.id}`, 2, fmtL(l('Você me confiou: {r}', 'You trusted me with: {r}'), { r: respDef31(id).name }));
  }
  return null;
}
export function setDir31(s: GameState, id: Resp31, patch: Dir31): void {
  const d = d31(s), cur = d.r[id] ?? { m: respDef31(id).def, d: {} };
  const nd: Dir31 = { ...cur.d, ...patch };
  for (const k of ['cap', 'ask', 'budget', 'per', 'minQ', 'frac', 'months', 'minTrust', 'reserve', 'rest', 'maxShows'] as const) if (nd[k] !== undefined) nd[k] = Math.max(0, Number(nd[k]) || 0);
  if (nd.minQ !== undefined) nd.minQ = clamp(nd.minQ, 0, 100);
  if (nd.minTrust !== undefined) nd.minTrust = clamp(nd.minTrust, 0, 100);
  if (nd.per !== undefined) nd.per = clamp(Math.round(nd.per), 1, 3);
  cur.d = nd;
  d.r[id] = cur;
}
/** Teto/limiar de uma regra (atalho de leitura para executores e telas). */
export const rule31 = (s: GameState, id: Resp31, k: keyof Dir31): number => Number(dirOf31(s, id)[k] ?? 0) || 0;

// ---------------------------------------------------------------- diretriz por artista

const ACT_DEF: ActDir31 = { p: 'auto', cap: 0, tier: 1 };
export const actDir31 = (s: GameState, actId: string): ActDir31 => ({ ...ACT_DEF, ...(ro(s)?.acts[actId] ?? {}) });
export function setActDir31(s: GameState, actId: string, patch: Partial<ActDir31>): void {
  const d = d31(s), cur: ActDir31 = { ...actDir31(s, actId), ...patch };
  cur.cap = Math.max(0, Math.round(cur.cap));
  if (cur.g === undefined) delete cur.g;
  if (cur.p === 'auto' && cur.cap === 0 && cur.tier === 1 && cur.g === undefined) delete d.acts[actId];
  else d.acts[actId] = cur;
}
/** Objetivo combinado para o artista (undefined = nenhum definido). */
export const goalSet31 = (s: GameState, actId: string): Goal31 | undefined => ro(s)?.acts[actId]?.g;
export const goalOf31 = (s: GameState, actId?: string): Goal31 => (actId ? goalSet31(s, actId) ?? 'grow' : 'grow');
export const setGoal31 = (s: GameState, actId: string, g: Goal31 | undefined): void => setActDir31(s, actId, { g });

// ---------------------------------------------------------------- liberações pontuais e gasto do mês

export const onceOk31 = (s: GameState, key: string): boolean => (ro(s)?.once[key] ?? -1) >= s.week;
export function allowOnce31(s: GameState, key: string, weeks = 5): void { d31(s).once[key] = s.week + weeks; }
export function spent31(s: GameState, id: Resp31): number {
  const sp = ro(s)?.spent;
  return sp && sp.m === mk(s) ? sp.v[id] ?? 0 : 0;
}
export function addSpent31(s: GameState, id: Resp31, cents: number): void {
  const d = d31(s);
  if (d.spent.m !== mk(s)) d.spent = { m: mk(s), v: {} };
  d.spent.v[id] = (d.spent.v[id] ?? 0) + cents;
}
/**
 * Portão de gasto de uma responsabilidade (orçamento do mês e "me pergunte acima de"). Devolve o motivo do bloqueio
 * (e registra a exceção) ou null. Sem diretriz nova, nunca bloqueia — o resultado é o de antes.
 */
export function spendGate31(s: GameState, id: Resp31, cents: number, who: StaffMember | undefined, act?: string, o: { quiet?: boolean } = {}): L | null {
  const st = set31(s, id);
  if (onceOk31(s, `${id}:all`)) return null;
  const real = toReal(cents, s.year);
  if (st.m === 'partial' && (st.d.ask ?? 0) > 0 && real > (st.d.ask ?? 0)) {
    const t = fmtL(l('{r}: gasto de {v} acima do seu limite de consulta ({a}) — precisa da sua autorização.', '{r}: spend of {v} above your ask-me limit ({a}) — needs your approval.'), { r: respDef31(id).name, v: usd31(real), a: usd31(st.d.ask ?? 0) });
    if (!o.quiet) exc31(s, id, 'ask', t, act, who);
    return l('Diretriz: acima do limite de consulta.', 'Directive: above the ask-me limit.');
  }
  const bud = st.d.budget ?? 0;
  if (bud > 0 && toReal(spent31(s, id), s.year) + real > bud) {
    const t = fmtL(l('{r}: orçamento do mês ({b}) esgotado; {v} não foram gastos.', '{r}: monthly budget ({b}) used up; {v} not spent.'), { r: respDef31(id).name, b: usd31(bud), v: usd31(real) });
    if (!o.quiet) exc31(s, id, 'budget', t, act, who);
    return l('Diretriz: orçamento do mês esgotado.', 'Directive: monthly budget used up.');
  }
  return null;
}
/** Dólares de hoje (reais) pelo formatador do jogo, em cada língua do texto. */
export const usd31 = (realDollars: number): L => l(formatMoney(Math.round(realDollars) * 100, 'pt-BR'), formatMoney(Math.round(realDollars) * 100, 'en-US'));
/** Centavos nominais pelo formatador do jogo, em cada língua do texto. */
export const cents31 = (c: number): L => l(formatMoney(Math.round(c), 'pt-BR'), formatMoney(Math.round(c), 'en-US'));

// ---------------------------------------------------------------- registro de automação

export interface LogIn31 { r: Resp31; who: string; t: L; why?: L; amt?: number; tone?: Log31['tone']; act?: string; x?: string; c?: [string, string]; undo?: Undo31; n?: string }
const SYS_WHO31: Record<string, L> = { player: l('Você', 'You'), rule: l('Regra', 'Rule'), team: l('Equipe', 'Team') };
/** Grava só o nome de funcionário (nome próprio); você/regra/equipe ficam como código e a tela traduz. */
const whoName = (s: GameState, who: string): string => (who in SYS_WHO31 ? '' : s.player.staff.find((x) => x.id === who)?.name ?? '');
/** Quem decidiu, no idioma da tela. */
export const logWho31 = (e: Pick<Log31, 'who' | 'n'>): L => SYS_WHO31[e.who] ?? (e.n ? l(e.n, e.n) : l('Ex-funcionário', 'Former staff'));

/** Grava uma decisão automática (quem, qual regra, quanto, resultado). Mais nova no fim. */
export function logAuto31(s: GameState, e: LogIn31): Log31 {
  const d = d31(s);
  const row: Log31 = { id: ++d.seq, w: s.week, m: mk(s), r: e.r, who: e.who, n: e.n ?? whoName(s, e.who), t: e.t, tone: e.tone ?? 'info' };
  if (e.why) row.why = e.why;
  if (e.amt) row.amt = e.amt;
  if (e.act) row.act = e.act;
  if (e.x) row.x = e.x;
  if (e.c) row.c = e.c;
  if (e.undo) row.undo = e.undo;
  d.log.push(row);
  if (d.log.length > LOG31_MAX) d.log.splice(0, d.log.length - LOG31_MAX);
  return row;
}
/** Leitura do registro (mais novas primeiro). */
export function autoLog31(s: GameState, f: { r?: Resp31 | Resp31[]; who?: string; act?: string; since?: number; tone?: Log31['tone']; n?: number } = {}): Log31[] {
  const all = ro(s)?.log ?? [];
  const rs = f.r === undefined ? null : Array.isArray(f.r) ? f.r : [f.r];
  const out: Log31[] = [];
  for (let i = all.length - 1; i >= 0; i--) {
    const e = all[i];
    if (rs && !rs.includes(e.r)) continue;
    if (f.who !== undefined && e.who !== f.who) continue;
    if (f.act !== undefined && e.act !== f.act) continue;
    if (f.since !== undefined && e.w < f.since) continue;
    if (f.tone && e.tone !== f.tone) continue;
    out.push(e);
    if (f.n && out.length >= f.n) break;
  }
  return out;
}

/** Exceção: o que travou e voltou para você (entra no registro com o tipo `k`). Deduplica: mesmo tipo e artista em 3
 *  semanas (a regra das políticas) ou, com `byText`, o mesmo texto em 8 semanas (a regra da delegação por carreira). */
export function exc31(s: GameState, id: Resp31, k: string, t: L, act?: string, who?: StaffMember, byText = false): boolean {
  const d = d31(s);
  if (d.log.some((e) => e.tone === 'ask' && e.x === k && (byText ? e.t.pt === t.pt && s.week - e.w < 8 : e.r === id && e.act === act && e.w >= s.week - 3))) return false;
  logAuto31(s, { r: id, who: who?.id ?? 'rule', t, tone: 'ask', act, x: k });
  return true;
}
export interface Exc31 { w: number; k: string; r: Resp31; act?: string; t: L }
/** Exceções recentes (vista do registro). */
export const excs31 = (s: GameState, sinceWeek = -Infinity): Exc31[] =>
  autoLog31(s, { tone: 'ask' }).filter((e) => e.w > sinceWeek).map((e) => ({ w: e.w, k: e.x ?? '', r: e.r, act: e.act, t: e.t }));

// ---------------------------------------------------------------- desfazer e pedidos de aprovação

/** Produção executiva: o executor (sys/deleg31run) ajusta a regra de lançamento automático das agendas delegadas
 *  (pacing8). Sem ele (ou sem diretriz), a regra de antes vale. `why` dá códigos extras de motivo para o registro. */
export interface RelPol31 { ok: boolean; minGap: number; budgetMult: number; maxSpend: number; type?: 'single' | 'lp'; songs?: string[] }
export const EXEC31: { release?: (s: GameState, act: import('./types').Act, base: RelPol31) => RelPol31; why?: (s: GameState, act: import('./types').Act) => string[] } = {};

/** Desfazedores registrados pelos executores: devolvem null (desfeito) ou o motivo. Recebem a entrada do registro
 *  (valor gasto, artista) para estornar o gasto do mês. */
export const UNDO31: Record<string, (s: GameState, id: string, e: Log31) => L | null> = {};
/** W2-REV: semanas em que a equipe/regra não repete, para o mesmo ato, a decisão que você desfez. */
export const NO_REPEAT31 = 12;
/** A decisão desta responsabilidade para este ato foi desfeita por você há pouco? (executores consultam) */
export const blocked31 = (s: GameState, id: Resp31, act: string | undefined): boolean => !!act && (ro(s)?.nr?.[`${id}:${act}`] ?? -1) >= s.week;
/** Pode desfazer agora? (null = sim) */
export function canUndo31(s: GameState, e: Log31): L | null {
  if (!e.undo) return l('Esta decisão não pode ser desfeita.', 'This decision cannot be undone.');
  if (e.undone) return l('Já desfeita.', 'Already undone.');
  return e.undo.k in UNDO31 ? null : l('Esta decisão não pode ser desfeita.', 'This decision cannot be undone.');
}
export function undo31(s: GameState, logId: number): L | null {
  const e = d31(s).log.find((x) => x.id === logId);
  if (!e) return l('Decisão não encontrada.', 'Decision not found.');
  const why = canUndo31(s, e);
  if (why) return why;
  const r = UNDO31[e.undo!.k](s, e.undo!.id, e);
  if (r) return r;
  e.undone = 1;
  if (e.act) (d31(s).nr ??= {})[`${e.r}:${e.act}`] = s.week + NO_REPEAT31;
  logAuto31(s, { r: e.r, who: 'player', t: fmtL(l('Você desfez: {t}', 'You undid: {t}'), { t: e.t }), tone: 'info', act: e.act });
  if (s.player.staff.some((x) => x.id === e.who)) OPINE31.f?.(s, `s:${e.who}`, -3, l('Você desfez uma decisão minha', 'You undid one of my decisions'));
  return null;
}

/** Aprovadores registrados pelos executores (sim = executa a decisão pendente). */
export const ASK31: Record<string, (s: GameState, a: Ask31) => L | null> = {};
export function askFor31(s: GameState, a: Omit<Ask31, 'id' | 'w'>): Ask31 | null {
  const d = d31(s);
  if (d.asks.some((x) => x.k === a.k && x.act === a.act && x.r === a.r)) return null;
  const row: Ask31 = { ...a, id: ++d.seq, w: s.week };
  d.asks.push(row);
  logAuto31(s, { r: a.r, who: a.who, t: a.t, tone: 'ask', act: a.act, x: 'ask', amt: a.amt ? -a.amt : undefined });
  return row;
}
export const asks31 = (s: GameState): Ask31[] => (ro(s)?.asks ?? []).filter((a) => a.until >= s.week);
export function answerAsk31(s: GameState, askId: number, yes: boolean): L | null {
  const d = d31(s), a = d.asks.find((x) => x.id === askId);
  if (!a) return l('Pedido não encontrado.', 'Request not found.');
  d.asks = d.asks.filter((x) => x !== a);
  if (!yes) {
    logAuto31(s, { r: a.r, who: 'player', t: fmtL(l('Você recusou: {t}', 'You declined: {t}'), { t: a.t }), tone: 'info', act: a.act });
    return null;
  }
  const f = ASK31[a.k];
  const r = f ? f(s, a) : l('Ninguém mais executa este pedido.', 'Nobody runs this request any more.');
  if (!r) logAuto31(s, { r: a.r, who: 'player', t: fmtL(l('Você aprovou: {t}', 'You approved: {t}'), { t: a.t }), tone: 'good', act: a.act });
  return r;
}
/** Limpa pedidos vencidos e liberações velhas (virada do mês). */
export function tidy31(s: GameState): void {
  const d = ro(s);
  if (!d) return;
  for (const a of d.asks.filter((x) => x.until < s.week)) logAuto31(s, { r: a.r, who: a.who, t: fmtL(l('Pedido sem resposta caducou: {t}', 'Unanswered request lapsed: {t}'), { t: a.t }), tone: 'info', act: a.act });
  d.asks = d.asks.filter((x) => x.until >= s.week);
  for (const k of Object.keys(d.once)) if (d.once[k] < s.week) delete d.once[k];
  for (const k of Object.keys(d.tried)) if (!s.contracts[k]) delete d.tried[k];
  if (d.nr) for (const k of Object.keys(d.nr)) if (d.nr[k] < s.week) delete d.nr[k];
}

// ---------------------------------------------------------------- visão agregada

export interface RespStat31 { done: number; exc: number; spent: number; last?: Log31 }
/** Decisões e exceções do mês de uma responsabilidade (para a linha da tela). */
export function stat31(s: GameState, id: Resp31): RespStat31 {
  const m = mk(s), all = ro(s)?.log ?? [];
  let done = 0, exc = 0, last: Log31 | undefined;
  for (const e of all) {
    if (e.r !== id || e.who === 'player') continue;
    if (e.m === m) { if (e.tone === 'ask') exc++; else done++; }
    last = e;
  }
  return { done, exc, spent: spent31(s, id), last };
}

export type Preset31 = 'garage' | 'mid' | 'multi';
export const PRESET31: Record<Preset31, { name: L; desc: L }> = {
  garage: { name: l('Garagem: eu faço tudo', 'Garage: I do everything'), desc: l('Tudo chega para você; só a agenda e a produção seguem a regra da equipe.', 'Everything comes to you; only the agenda and production follow the team rule.') },
  mid: { name: l('Selo médio', 'Mid-size label'), desc: l('Quem tem cargo decide até um limite e consulta acima; regras de reserva e descanso ligadas.', 'Whoever has the role decides up to a limit and asks above it; reserve and rest rules on.') },
  multi: { name: l('Multinacional: só exceções', 'Multinational: exceptions only'), desc: l('Tudo o que tem gente qualificada vai para ela; você só vê exceções.', 'Everything with qualified staff goes to them; you only see exceptions.') },
};
/** Aplica um conjunto pronto (o que não tiver gente qualificada fica como está ou cai na regra). */
export function applyPreset31(s: GameState, p: Preset31): L {
  const can = (id: Resp31, m: Mode31) => !lockWhy31(s, id, m);
  const put = (id: Resp31, ...ms: Mode31[]) => { const m = ms.find((x) => can(id, x)); if (m) setMode31(s, id, m); };
  if (p === 'garage') {
    for (const id of ['anr', 'renew', 'marketing', 'tour', 'fest', 'studio', 'mandates'] as Resp31[]) put(id, 'me');
    put('exec', 'rule'); put('agenda', 'rule');
  } else if (p === 'mid') {
    put('anr', 'partial', 'me'); put('renew', 'staff', 'me'); put('exec', 'partial', 'rule'); put('marketing', 'partial', 'me'); put('tour', 'staff', 'me');
    setDir31(s, 'anr', { ask: Math.max(rule31(s, 'anr', 'ask'), 20000) }); setDir31(s, 'marketing', { ask: Math.max(rule31(s, 'marketing', 'ask'), 3000) });
    setDir31(s, 'exec', { ask: Math.max(rule31(s, 'exec', 'ask'), 8000) });
    setDir31(s, 'finance', { reserve: Math.max(rule31(s, 'finance', 'reserve'), 3) }); setDir31(s, 'rest', { rest: rule31(s, 'rest', 'rest') || 65, maxShows: rule31(s, 'rest', 'maxShows') || 14 });
  } else {
    for (const id of ['anr', 'renew', 'exec', 'marketing', 'tour'] as Resp31[]) put(id, 'staff', 'rule');
    put('fest', 'rule'); put('studio', 'rule'); put('mandates', 'rule'); put('agenda', 'rule');
    if (modeOf31(s, 'fest') === 'rule') setDir31(s, 'fest', { sponsor: true, head: true });
    setDir31(s, 'finance', { reserve: Math.max(rule31(s, 'finance', 'reserve'), 3) }); setDir31(s, 'rest', { rest: rule31(s, 'rest', 'rest') || 65, maxShows: rule31(s, 'rest', 'maxShows') || 14 });
  }
  return fmtL(l('Delegação ajustada: {p}.', 'Delegation set: {p}.'), { p: PRESET31[p].name });
}
