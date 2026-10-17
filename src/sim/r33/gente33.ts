// R33 · GENTE33 parte A — MAIS GENTE COM PAPEL, tudo opt-in (só acontece quando o JOGADOR contrata ou ativa):
//
//   1. DIRETOR(A) DE FILIAL — uma pessoa real do jogo (executivo de rival, alguém da sua equipe, gente da cidade do
//      gente31, ex-artista) assume uma filial (sim/branches.ts, que não tinha ninguém no comando). Todo mês garimpa na
//      região (addSignal, o canal de radar de sempre), contrata talento local se a linha deixa (acceptOffer), marca shows
//      e divulga os artistas da filial na cidade (playGigs), cuida do orçamento dentro do teto e manda relatório na
//      Caixa (inbox18). O jogador define a linha (ousado/conservador) e o teto de gasto. Riscos: rival rouba o diretor,
//      ele sai levando o elenco regional e abre selo (foundLabel17 + signWithRival), desvio de dinheiro (fato com a
//      marca do submundo) e briga com a sede. Ex-artista da cena local ganha bônus regional.
//   2. CEO DA EMPRESA (fim de jogo: Complexo ou 25 anos de casa) — o jogador vira presidente do conselho: a delegação
//      única (deleg31) passa toda para a equipe/regra ("multinacional: só exceções"); o CEO propõe as grandes decisões
//      (ampliar a sede, abrir filial, recomprar bloco de raider) e o jogador só aprova; relatório mensal. Dispensar o CEO
//      devolve a delegação de antes. Sucessão (heirs8): se o dono muda com um CEO no cargo, ele segura a transição.
//   3. CONSELHO E ACIONISTAS — com sócios ou ações (capital/bolsa10), o jogador instala o conselho: reunião anual com
//      votos dos acionistas (holders); raiders hostis votam contra; maioria contra = moção para tirar o jogador da
//      presidência (recomprar o bloco com repelRaider, aceitar um CEO indicado ou brigar).
//   4. EQUIPE PESSOAL — motorista, segurança (setGuard33/papChance33 do vida33), personal trainer e médico particular
//      (saúde/estresse do dono); cada um é uma pessoa real com salário pago do bolso.
//   5. PESSOAS FIXAS — presidente do fã-clube (organiza ou briga em público), jornalista que acompanha a sua carreira
//      (sempre o mesmo; aliado ou inimigo; coluna mensal como fato de imprensa) e representante do sindicato (union20).
//
// Regra de ouro: estado em `s.x4.gente33` só nasce na primeira ação do jogador; sem ele o gancho do mês sai na primeira
// linha (nenhum sorteio, nenhuma chave no save). Sorteios com Rng.fromSeed (chave 'gente33'), nunca o fluxo do jogo.
// Interruptor `exp33.gente` (ligado por padrão; ligado não muda nada até o jogador agir). Família Fossati nunca entra.
// Docs: docs/r33/gente.md.

import { Rng, clamp } from '../../core/rng';
import { FAMILY31 } from '../../data/fossati31';
import { cityById, l, type L } from '../../data/world';
import { assignBranch, openBranch, upgradeBranch, hqBlocker, canOpenBranch } from '../branches';
import { acceptOffer, defaultOffer, endContract, signWithRival } from '../contracts';
import { applyPreset31, autoLog31, d31, type Set31, type Resp31 } from '../deleg31';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { LOW_KINDS18, pushInbox18, registerInboxKind } from '../inbox18';
import { playGigs } from '../live';
import { cashWhy20, freeCash20 } from '../oblig20';
import { purse } from '../r31/purse31';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { capital } from '../sys/capital';
import { bolsa, holders, raiders, repelRaider, OWN } from '../sys/bolsa10';
import { fan18 } from '../sys/fans18';
import { heirs } from '../sys/heirs8';
import { depart, leaders, succeed, type Leader, type LeaderStyle } from '../sys/leaders10';
import { foundLabel17 } from '../sys/npc17';
import { ownerOf } from '../sys/people/owner';
import { clamp01 } from '../sys/people/state';
import { union20 } from '../sys/union20';
import { gente31, peekGente31, parseSlot31, JOBS31 } from '../sys/gente31';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, playerActs, post, staffSkill } from '../util';
import { addSignal, talentScore } from '../worldgen';
import { setGuard33, vida33, SW33 } from './vida33';
import { HQ_LEVELS } from '../../data/rules';
import { histLocked } from '../history15';

void gente31;

// ---------------------------------------------------------------- interruptor

export const SW_GENTE33 = 'exp33.gente';
registerSwitch({
  id: SW_GENTE33, def: true, scope: 'game',
  desc: l('Versão 33 · gente com papel: diretor(a) de filial, CEO e conselho, equipe pessoal e pessoas fixas (fã-clube, jornalista, sindicato). Só acontece quando você contrata ou ativa. Desligado: as opções somem e quem já foi contratado fica parado.',
    'Version 33 · people with roles: branch director, CEO and board, personal staff and fixed people (fan club, journalist, union). Only happens when you hire or activate. Off: the options disappear and whoever was hired stays idle.'),
});
export const gente33On = (s: GameState): boolean => !!sw<boolean>(s, SW_GENTE33);
registerEditable({ id: `sw.${SW_GENTE33}`, area: 'tools', kind: 'bool', label: l('V33 · gente com papel (filial, CEO, conselho, equipe pessoal)', 'V33 · people with roles (branch, CEO, board, personal staff)'),
  get: (s) => gente33On(s), set: (s, v) => { setSw(s, SW_GENTE33, !!v); } });

/** Números da regra (editáveis no editor e nos testes). `risk` multiplica todos os riscos (1 = normal). */
export const GENTE33 = {
  risk: 1,
  /** orçamento padrão por mês da filial (dólares de hoje) por linha */
  budBold: 6000, budSafe: 2500,
  /** custo de garimpar uma noite / divulgar um artista na cidade (dólares de hoje) */
  scout: 300, promo: 400,
  /** semanas entre contratações da mesma filial */
  signGap: 13,
  /** CEO: nível mínimo da sede (Complexo) ou anos de casa */
  ceoHq: 3, ceoYears: 25,
};

// ---------------------------------------------------------------- estado

export type Src33 = 'staff' | 'exec' | 'city' | 'exart';
export type Style33 = 'bold' | 'careful' | 'social' | 'numbers';
export type Line33 = 'bold' | 'safe';
export type Crew33 = 'driver' | 'guard' | 'trainer' | 'doctor';
export type Fixed33 = 'fan' | 'press' | 'union';

/** Pessoa contratada (a mesma ficha para diretor, CEO, equipe pessoal e pessoas fixas). */
export interface Hire33 {
  /** chave do candidato: 's:<staffId>' · 'l:<leaderId>' · 'p:<personId>' */
  k: string;
  n: string;
  src: Src33;
  /** competência 0..1 */
  q: number;
  /** ambição 0..100 */
  amb: number;
  style: Style33;
  /** salário mensal em dólares de hoje */
  sal: number;
  /** lealdade 0..100 */
  loy: number;
  w: number;
}
export interface BrDir33 extends Hire33 {
  line: Line33;
  /** teto de gasto mensal (dólares de hoje); 0 = padrão da linha */
  cap: number;
  /** ex-artista da cena da cidade da filial */
  local?: 1;
  /** atrito com a sede 0..100 */
  fric: number;
  /** desvio em curso: total desviado (centavos nominais) e se já foi descoberto */
  skim?: number;
  lastSign?: number;
  /** resumo do último mês (para o cartão) */
  last?: { sc: number; sg: number; sh: number; sp: number };
}
export interface Ceo33 extends Hire33 {
  /** delegação de antes (volta quando o CEO sai) */
  prev: Partial<Record<Resp31, Set31>>;
  /** gerações da sucessão quando entrou (para notar a troca de dono) */
  gen: number;
  /** semana da próxima proposta de grande decisão */
  nextAsk: number;
}
export interface Board33 { since: number; next: number; conf: number; log: [number, number, number, L][] }
export interface Fix33 extends Hire33 { rel: number; act?: string; seen?: number }
export interface G33 {
  br: Record<string, BrDir33>;
  ceo?: Ceo33;
  board?: Board33;
  crew: Partial<Record<Crew33, Hire33>>;
  fix: Partial<Record<Fixed33, Fix33>>;
  log: [number, L][];
}
declare module '../ext4' { interface Ext4 { gente33: G33 } }
/** Estado (cria na primeira ação do jogador — nunca pelo motor nem pela tela). */
export function g33(s: GameState): G33 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const g = (x.gente33 ??= { br: {}, crew: {}, fix: {}, log: [] }) as G33;
  g.br ??= {}; g.crew ??= {}; g.fix ??= {}; g.log ??= [];
  return g;
}
/** Leitura sem criar estado (tela, cartões, motor). */
export const peek33 = (s: GameState): G33 | undefined => (s.x4 as unknown as { gente33?: G33 } | undefined)?.gente33;
const log33 = (s: GameState, t: L): void => { const g = g33(s); g.log.unshift([s.week, t]); if (g.log.length > 40) g.log.length = 40; };
const rr = (s: GameState, tag: string): Rng => Rng.fromSeed(`${s.config.seed}|gente33|${tag}|${s.week}`);
const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };
const usd = (s: GameState, real: number): L => { const v = Math.round(real); return l(`US$ ${v.toLocaleString('pt-BR')}`, `US$ ${v.toLocaleString('en-US')}`); };
void usd;

// ---------------------------------------------------------------- quem pode ser contratado

const FAM_NAMES = new Set(FAMILY31.map((m) => m.name));
/** Família Fossati, o próprio jogador e quem já trabalha para você num papel daqui ficam de fora. */
function blocked(s: GameState, k: string, name: string): boolean {
  if (FAM_NAMES.has(name) || k.includes('fam:')) return true;
  const pid = k.startsWith('p:') ? k.slice(2) : undefined;
  if (pid && (s.persons[pid]?.isPlayer || !s.persons[pid]?.alive)) return true;
  const g = peek33(s);
  if (!g) return false;
  const all: Hire33[] = [...Object.values(g.br), ...(g.ceo ? [g.ceo] : []), ...Object.values(g.crew), ...Object.values(g.fix)].filter(Boolean) as Hire33[];
  return all.some((h) => h.k === k);
}

export interface Cand33 {
  k: string; n: string; src: Src33; q: number; amb: number; style: Style33; sal: number; note: L;
  local?: boolean;
  /** executivo hoje à frente de um selo rival (contratar = tirá-lo de lá) */
  rival?: string;
}
const STYLE_OF_LEADER: Record<LeaderStyle, Style33> = { autocrat: 'bold', dealmaker: 'bold', showman: 'bold', visionary: 'bold', numbers: 'numbers', mentor: 'social', consensus: 'social' };
export const STYLE33: Record<Style33, L> = {
  bold: l('ousado(a)', 'bold'), careful: l('cuidadoso(a)', 'careful'), social: l('de gente', 'people person'), numbers: l('dos números', 'numbers person'),
};
export const SRC33: Record<Src33, L> = {
  staff: l('da sua equipe', 'from your staff'), exec: l('executivo(a) do mercado', 'industry executive'), city: l('gente da cidade', 'local townsperson'), exart: l('ex-artista', 'former artist'),
};
function personStyle(p: Person): Style33 {
  const P = p.persona;
  if (!P) return (['bold', 'careful', 'social', 'numbers'] as const)[Math.floor(hs(p.id) * 4)];
  if (P.discipline >= 65) return 'careful';
  if (P.sociability >= 65) return 'social';
  if (P.openness >= 60 || P.ambition >= 65) return 'bold';
  return 'numbers';
}
const personAmb = (p: Person): number => Math.round(p.persona?.ambition ?? (p.ambition === 'fame' || p.ambition === 'money' ? 65 : 45));
const bizQ = (p: Person): number => clamp((p.skills?.biz ?? 25) / 100, 0.1, 0.95);

/** Candidatos de uma busca: `city` (cidade da filial, para o bônus de cena local). Determinístico, só leitura. */
export function cands33(s: GameState, o: { city?: string; min?: number; n?: number; srcs?: Src33[] } = {}): Cand33[] {
  const want = new Set<Src33>(o.srcs ?? ['staff', 'exec', 'city', 'exart']);
  const out: Cand33[] = [];
  const push = (c: Cand33) => { if (!blocked(s, c.k, c.n) && c.q >= (o.min ?? 0)) out.push(c); };
  if (want.has('staff')) for (const st of s.player.staff) {
    const q = clamp(st.skill / 100, 0.1, 0.95), amb = Math.round(30 + hs(st.id) * 60);
    push({ k: `s:${st.id}`, n: st.name, src: 'staff', q, amb, style: (['bold', 'careful', 'social', 'numbers'] as const)[Math.floor(hs(`${st.id}:st`) * 4)], sal: Math.round(1200 + q * 3000), note: fmtL(l('Na sua equipe há {w} semanas', 'On your staff for {w} weeks'), { w: s.week - st.hiredWeek }) });
  }
  if (want.has('exec')) {
    const LS = leaders(s);
    for (const L0 of Object.values(LS?.L ?? {})) {
      if (L0.st !== 'free' && L0.st !== 'active') continue;
      if (s.year - L0.born > L0.retireAge - 1 || s.year - L0.born < 25) continue;
      const lb = L0.label ? s.labels[L0.label] : undefined;
      if (L0.st === 'active' && (!lb?.active || L0.founder)) continue; // fundador não larga o próprio selo
      const q = clamp(0.5 + L0.amb / 400 + L0.jobs.length * 0.03, 0.3, 0.95);
      push({ k: `l:${L0.id}`, n: L0.name, src: 'exec', q, amb: L0.amb, style: STYLE_OF_LEADER[L0.style] ?? 'bold', sal: Math.round((2500 + q * 5000) * (lb ? 1.6 : 1)), rival: lb?.id,
        note: lb ? fmtL(l('Hoje no comando de {l}', 'Now heading {l}'), { l: lb.name }) : fmtL(l('Livre no mercado ({n} cargo(s) no currículo)', 'Free on the market ({n} past post(s))'), { n: L0.jobs.length }) });
    }
  }
  if (want.has('city')) {
    const st = peekGente31(s);
    for (const [sl, j] of Object.entries(st?.j ?? {})) {
      const p = s.persons[j.p];
      if (!p?.alive || p.real27) continue;
      const { k, i } = parseSlot31(sl);
      const role = JOBS31[k]?.[i];
      const q = clamp(bizQ(p) + (i === 0 ? 0.1 : 0) + (k === 'office' ? 0.05 : 0), 0.1, 0.9);
      push({ k: `p:${p.id}`, n: p.name, src: 'city', q, amb: personAmb(p), style: personStyle(p), sal: Math.round(900 + q * 2500), note: role ?? l('Trabalha na cidade', 'Works in town') });
    }
  }
  if (want.has('exart')) {
    const seen = new Set<string>();
    for (const a of Object.values(s.acts)) {
      if ((a.status !== 'retired' && a.status !== 'split') || a.catalogNo) continue; // gente de ato real (catálogo) não vira funcionário
      for (const pid of a.members) {
        const p = s.persons[pid];
        if (!p?.alive || seen.has(pid) || p.role === 'synthetic' || p.real27) continue;
        const age = s.year - p.born;
        if (age < 25 || age > 76) continue;
        seen.add(pid);
        const local = !!o.city && a.city === o.city;
        const q = clamp(bizQ(p) * 0.7 + a.fame / 250 + (a.legend ? 0.1 : 0), 0.1, 0.9);
        push({ k: `p:${pid}`, n: p.name, src: 'exart', q, amb: personAmb(p), style: personStyle(p), sal: Math.round(1000 + q * 3000 + a.fame * 20), local,
          note: local ? fmtL(l('Ex-{a}, da cena de {c}', 'Ex-{a}, from the {c} scene'), { a: a.name, c: cityById[a.city]?.name ?? a.city }) : fmtL(l('Ex-{a}', 'Ex-{a}'), { a: a.name }) });
      }
    }
  }
  const score = (c: Cand33) => c.q + (c.local ? 0.15 : 0) - (c.rival ? 0.02 : 0) + hs(`${c.k}:${s.year}`) * 0.01;
  return out.sort((a, b) => score(b) - score(a)).slice(0, o.n ?? 6);
}
/** Busca um candidato pela chave (inclusive fora dos 6 primeiros). */
const candBy = (s: GameState, k: string, city?: string): Cand33 | undefined => cands33(s, { city, n: 999 }).find((c) => c.k === k);

/** Tira a pessoa do lugar de origem (equipe → sai da folha; executivo → deixa o selo rival, que põe um sucessor). */
function takeFrom(s: GameState, c: Cand33): void {
  if (c.src === 'staff') { const i = s.player.staff.findIndex((x) => `s:${x.id}` === c.k); if (i >= 0) s.player.staff.splice(i, 1); }
  if (c.src === 'exec') {
    const L0 = leaders(s)?.L[c.k.slice(2)];
    if (!L0) return;
    const lb = L0.label ? s.labels[L0.label] : undefined;
    if (lb) {
      depart(s, lb, L0, 'poached');
      succeed(s, rr(s, `succ:${lb.id}`), lb, fmtL(l('{n} foi trabalhar com {c}', '{n} went to work for {c}'), { n: L0.name, c: s.config.companyName }));
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 5;
    }
    L0.st = 'retired'; // fora do mercado enquanto trabalha para você (ninguém mais o escolhe como sucessor)
  }
}
/** Devolve o executivo ao mercado quando sai. */
function release(s: GameState, h: Hire33): void {
  if (h.src !== 'exec') return;
  const L0 = leaders(s)?.L[h.k.slice(2)];
  if (L0 && L0.st === 'retired' && s.year - L0.born < L0.retireAge) L0.st = 'free';
}
const leaderOfHire = (s: GameState, h: Hire33): Leader | undefined => (h.src === 'exec' ? leaders(s)?.L[h.k.slice(2)] : undefined);
/** A pessoa ainda existe (viva, executivo não morreu)? */
function alive(s: GameState, h: Hire33): boolean {
  if (h.k.startsWith('p:')) return s.persons[h.k.slice(2)]?.alive !== false;
  const L0 = leaderOfHire(s, h);
  return !L0 || L0.st !== 'dead';
}
function hireOf(s: GameState, c: Cand33, loyBase = 55): Hire33 {
  return { k: c.k, n: c.n, src: c.src, q: c.q, amb: c.amb, style: c.style, sal: c.sal, loy: clamp(loyBase + (c.src === 'staff' ? 15 : 0) + (c.local ? 10 : 0) - (c.rival ? 10 : 0), 0, 100), w: s.week };
}
/** Luvas (centavos): um salário; tirar executivo de selo rival custa seis. */
const signOn = (s: GameState, c: Cand33): number => money(s, c.sal * (c.rival ? 6 : 1));

// ================================================================ 1. DIRETOR(A) DE FILIAL

export const dirOf33 = (s: GameState, brId: string): BrDir33 | undefined => peek33(s)?.br[brId];
const budget33 = (d: BrDir33): number => d.cap || (d.line === 'bold' ? GENTE33.budBold : GENTE33.budSafe);
/** O quanto o diretor quer gastar por mês (ambição): teto abaixo disso gera atrito. */
const wants33 = (d: BrDir33): number => 1500 + d.amb * 70;

export function canHireBranchDir33(s: GameState, brId: string, k?: string): L | null {
  if (!gente33On(s)) return l('Diretores de filial estão desligados.', 'Branch directors are switched off.');
  const b = s.branches.find((x) => x.id === brId);
  if (!b) return l('Filial inválida.', 'Invalid branch.');
  if (dirOf33(s, brId)) return l('Esta filial já tem diretor(a).', 'This branch already has a director.');
  const c = k ? candBy(s, k, b.city) : cands33(s, { city: b.city, n: 1 })[0];
  if (!c) return l('Ninguém disponível agora: contrate equipe, conheça gente na cidade ou espere um executivo ficar livre.', 'Nobody available now: hire staff, meet people in town or wait for an executive to be free.');
  const fee = signOn(s, c);
  if (freeCash20(s) < fee) return cashWhy20(s, fee, l('Caixa insuficiente para as luvas.', 'Not enough cash for the signing fee.'));
  return null;
}

/** Contrata alguém para comandar a filial (sem `k`: o melhor candidato da busca). */
export function hireBranchDir33(s: GameState, brId: string, k?: string, o: { line?: Line33; cap?: number } = {}): L | null {
  const err = canHireBranchDir33(s, brId, k);
  if (err) return err;
  const b = s.branches.find((x) => x.id === brId)!;
  const c = (k ? candBy(s, k, b.city) : cands33(s, { city: b.city, n: 1 })[0])!;
  const fee = signOn(s, c);
  takeFrom(s, c);
  postCost(s, `g33:hire:${brId}`, fee, 'salaries', `Luvas: ${c.n} (filial ${b.name})`);
  const d: BrDir33 = { ...hireOf(s, c), line: o.line ?? (c.style === 'bold' ? 'bold' : 'safe'), cap: Math.max(0, o.cap ?? 0), fric: 0, ...(c.local ? { local: 1 as const } : {}) };
  g33(s).br[brId] = d;
  const t = fmtL(l('{n} ({w}) assume a filial {b}.', '{n} ({w}) takes over the {b} branch.'), { n: c.n, w: SRC33[c.src], b: cityById[b.city]?.name ?? b.city });
  log33(s, t);
  emitFact(s, { kind: 'hire33', actors: ['player', c.k.replace(/^[slp]:/, '')], place: b.city, severity: 20, visibility: 'public', tags: ['gente33', 'branch'], text: t, src: 'gente33', diary: true });
  return null;
}
export function setBranchLine33(s: GameState, brId: string, line: Line33, cap?: number): L | null {
  const d = dirOf33(s, brId);
  if (!d) return l('Esta filial não tem diretor(a).', 'This branch has no director.');
  d.line = line;
  if (cap !== undefined) d.cap = Math.max(0, Math.round(cap));
  return null;
}
/** Troca a linha da primeira filial com diretor (ação do cartão). */
export function toggleBranchLine33(s: GameState): L | null {
  const id = Object.keys(peek33(s)?.br ?? {})[0];
  if (!id) return l('Nenhuma filial tem diretor(a).', 'No branch has a director.');
  return setBranchLine33(s, id, dirOf33(s, id)!.line === 'bold' ? 'safe' : 'bold');
}
export function fireBranchDir33(s: GameState, brId: string, why?: L): L | null {
  const g = peek33(s), d = g?.br[brId];
  if (!g || !d) return l('Esta filial não tem diretor(a).', 'This branch has no director.');
  delete g.br[brId];
  release(s, d);
  postCost(s, `g33:fire:${brId}`, money(s, d.sal), 'salaries', `Rescisão: ${d.n}`);
  log33(s, why ?? fmtL(l('{n} deixa a filial.', '{n} leaves the branch.'), { n: d.n }));
  return null;
}

/** Lança um custo no livro de sempre (centavos nominais, positivo = saída). */
function postCost(s: GameState, key: string, cents: number, cat: string, memo: string): void {
  if (cents > 0) post(s, key, -cents, cat, memo);
}

/** Artistas do seu selo que a filial cuida. */
export const branchActs33 = (s: GameState, brId: string): Act[] =>
  Object.entries(s.branchOf ?? {}).filter(([, b]) => b === brId).map(([a]) => s.acts[a]).filter((a): a is Act => !!a && a.owner === 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split');

const liveAct = (a: Act): boolean => a.status !== 'retired' && a.status !== 'split' && !a.deceased;

/** O mês da filial: garimpo, contratação, shows, divulgação e orçamento. Devolve o resumo. */
export function branchMonth33(s: GameState, brId: string): BrDir33['last'] | undefined {
  const d = dirOf33(s, brId), b = s.branches.find((x) => x.id === brId);
  if (!d || !b) return undefined;
  const r = rr(s, `br:${brId}`);
  const bud = money(s, budget33(d));
  let spent = 0, sc = 0, sg = 0, sh = 0;
  const can = (c: number) => spent + c <= bud && freeCash20(s) >= c;
  const pay = (key: string, c: number, memo: string) => { postCost(s, `g33:${key}:${brId}`, c, 'hq', memo); spent += c; };
  const boost = d.local ? 1 : 0;
  // 1) garimpo: talento da cidade que ainda não está no radar
  const pool = Object.values(s.acts).filter((a) => a.city === b.city && a.owner === null && !a.playerBand && liveAct(a) && !s.knowledge[a.id]);
  pool.sort((x, y) => talentScore(s, y) - talentScore(s, x) || (x.id < y.id ? -1 : 1));
  const nights = (d.line === 'bold' ? 2 : 1) + boost + (d.q >= 0.7 ? 1 : 0);
  for (let i = 0; i < nights && pool.length; i++) {
    const c = money(s, GENTE33.scout);
    if (!can(c)) break;
    const a = pool.splice(Math.min(pool.length - 1, r.int(0, Math.min(2, pool.length - 1))), 1)[0];
    pay(`scout${i}`, c, `Filial ${b.name}: noite de garimpo`);
    addSignal(s, r, a.id, 'branch33', { city: b.city });
    sc++;
  }
  // 2) contratação local (ousado; conservador só com talento claro e caixa folgado)
  if (!d.skim && (d.lastSign === undefined || s.week - d.lastSign >= GENTE33.signGap)) {
    const known = Object.values(s.acts).filter((a) => a.city === b.city && a.owner === null && !a.playerBand && !histLocked(s, a) && liveAct(a) && s.knowledge[a.id]);
    known.sort((x, y) => talentScore(s, y) - talentScore(s, x) || (x.id < y.id ? -1 : 1));
    const a = known[0];
    const bar = d.line === 'bold' ? 35 : 55;
    if (a && talentScore(s, a) * (0.8 + d.q * 0.4) >= bar) {
      const off = defaultOffer(s, a);
      const limit = money(s, budget33(d) * (d.line === 'bold' ? 3 : 1.5));
      if (off.advance <= limit && freeCash20(s) >= off.advance * 2) {
        acceptOffer(s, a, { ...off, id: `g33o:${brId}:${s.week}`, week: s.week, status: 'pending' });
        if (a.owner === 'player') { assignBranch(s, a.id, brId); d.lastSign = s.week; sg++; spent += off.advance; }
      }
    }
  }
  // 3) shows e divulgação dos artistas da filial na cidade
  for (const a of branchActs33(s, brId).slice(0, d.line === 'bold' ? 3 : 2)) {
    if ((a.gigSat ?? 0) > 6 || a.members.some((m) => (s.persons[m]?.fatigue ?? 0) > 60) || (a.hiatusUntil ?? 0) > s.week) continue;
    playGigs(s, r, a, a.fame >= 35 ? 1 : 0, d.line === 'bold' ? 2 : 1);
    sh++;
    const c = money(s, GENTE33.promo);
    if (can(c)) {
      pay(`promo:${a.id}`, c, `Filial ${b.name}: divulgação de ${a.name}`);
      a.momentum = clamp(a.momentum + 2 + boost, 0, 100);
      a.fans.casual += Math.round((150 + d.q * 300) * (1 + boost * 0.5));
    }
  }
  // 4) salário
  postCost(s, `g33:sal:${brId}`, money(s, d.sal), 'salaries', `Salário: ${d.n} (diretor da filial ${b.name})`);
  d.last = { sc, sg, sh, sp: spent };
  return d.last;
}

function branchReport(s: GameState, brId: string, d: BrDir33): void {
  const b = s.branches.find((x) => x.id === brId);
  if (!b || !d.last) return;
  const L0 = d.last, city = cityById[b.city]?.name ?? b.city;
  pushInbox18(s, 'g33_br', {
    from: d.n, tone: 'info', ref: { br: brId },
    subject: fmtL(l('Filial {c}: relatório do mês', '{c} branch: monthly report'), { c: city }),
    body: fmtL(l('{n} ({st}, linha {ln}): {sc} noite(s) de garimpo, {sg} contratação(ões) local(is), {sh} artista(s) com shows na cidade. Gasto do mês: US$ {sp} de um teto de US$ {cap}.{loc}',
      '{n} ({st}, {ln} line): {sc} scouting night(s), {sg} local signing(s), {sh} act(s) gigging in town. Spent this month: US$ {sp} of a US$ {cap} cap.{loc}'), {
      n: d.n, st: STYLE33[d.style], ln: d.line === 'bold' ? l('ousada', 'bold') : l('conservadora', 'conservative'), sc: L0.sc, sg: L0.sg, sh: L0.sh,
      sp: Math.round(L0.sp / Math.max(1, money(s, 1))), cap: budget33(d),
      loc: d.local ? l(' Conhece a cena local: as portas se abrem mais fácil.', ' Knows the local scene: doors open more easily.') : '',
    }),
  });
}

// ---------------------------------------------------------------- riscos da filial

/** Rival leva o diretor embora. */
function poach(s: GameState, brId: string, d: BrDir33): void {
  const lbs = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash || (a.id < b.id ? -1 : 1));
  const lb = lbs[0];
  fireBranchDir33(s, brId, fmtL(l('{n} foi levado(a) por {l} e deixou a filial.', '{n} was poached by {l} and left the branch.'), { n: d.n, l: lb?.name ?? '?' }));
  if (lb) s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 3;
  const t = fmtL(l('{l} tira {n} do comando da sua filial em {c}.', '{l} lures {n} away from your {c} branch.'), { l: lb?.name ?? '?', n: d.n, c: cityById[s.branches.find((x) => x.id === brId)?.city ?? '']?.name ?? '' });
  emitFact(s, { kind: 'poach', actors: [lb?.id ?? '', 'player'], severity: 35, visibility: 'public', tags: ['gente33', 'branch', 'poach'], text: t, src: 'gente33', notify: 'bad', diary: true });
}
/** Sai levando o elenco regional e abre selo próprio. */
export function defect33(s: GameState, brId: string): L | null {
  const d = dirOf33(s, brId), b = s.branches.find((x) => x.id === brId);
  if (!d || !b) return l('Esta filial não tem diretor(a).', 'This branch has no director.');
  const r = rr(s, `defect:${brId}`);
  const take = branchActs33(s, brId).filter((a) => !histLocked(s, a) && a.trust < 75).slice(0, 2);
  const lb = foundLabel17(s, r, { by: d.k, name: d.n, city: b.city, genre: take[0]?.genre ?? 'rock', cash: 30000 + d.q * 40000, k: 'exec',
    why: l('saiu da filial para ter o próprio selo', 'left the branch to run their own label'), leaderId: d.src === 'exec' ? d.k.slice(2) : undefined });
  for (const a of take) { endContract(s, a, 'left', { quiet: true }); delete s.branchOf[a.id]; signWithRival(s, a, lb.id, r, true); }
  delete g33(s).br[brId];
  const t = fmtL(l('{n} deixa a filial de {c}, abre o selo {l} e leva {k} artista(s) do elenco regional.', '{n} quits the {c} branch, opens the label {l} and takes {k} regional act(s).'), { n: d.n, c: cityById[b.city]?.name ?? b.city, l: lb.name, k: take.length });
  log33(s, t);
  s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 10;
  emitFact(s, { kind: 'exit', actors: [lb.id, 'player', ...take.map((a) => a.id)], place: b.city, severity: 40 + take.length * 10, visibility: 'public', tags: ['gente33', 'branch', 'defect'], text: t, src: 'gente33', notify: 'bad', diary: { important: true } });
  return null;
}

/** Riscos do mês (sorteio próprio). Devolve o que aconteceu (para testes). */
export function branchRisks33(s: GameState, brId: string): 'poach' | 'defect' | 'skim' | 'caught' | 'clash' | 'gone' | null {
  const d = dirOf33(s, brId);
  if (!d) return null;
  if (!alive(s, d)) { fireBranchDir33(s, brId, fmtL(l('{n} morreu; a filial está sem comando.', '{n} died; the branch has no one in charge.'), { n: d.n })); return 'gone'; }
  const r = rr(s, `risk:${brId}`), k = GENTE33.risk;
  // atrito com a sede: estilo × linha e teto × ambição
  const mismatch = (d.style === 'bold' && d.line === 'safe') ? 6 : (d.style === 'careful' && d.line === 'bold') ? 4 : 0;
  const tight = d.cap && d.cap < wants33(d) ? 3 : 0;
  d.fric = clamp(d.fric + (mismatch + tight ? mismatch + tight : -3), 0, 100);
  d.loy = clamp(d.loy + (d.last && d.last.sg + d.last.sh > 0 ? 0.5 : 0) - (mismatch ? 1 : 0), 0, 100);
  // 1) rival rouba
  if (r.chance(clamp((0.006 + d.q * 0.012 + d.amb / 4000 - d.loy / 5000) * k, 0, 0.9))) { poach(s, brId, d); return 'poach'; }
  // 2) sai com o elenco regional
  if ((d.fric >= 50 || (d.amb >= 70 && d.loy < 40)) && r.chance(clamp((0.02 + d.fric / 2000) * k, 0, 0.9))) { defect33(s, brId); return 'defect'; }
  // 3) desvio de dinheiro (submundo): começa com ambição alta e lealdade baixa; o jurídico/contador ajuda a pegar
  if (d.skim !== undefined) {
    const take = Math.round(money(s, budget33(d)) * 0.15);
    postCost(s, `g33:skim:${brId}`, take, 'hq', `Filial: despesas diversas`);
    d.skim += take;
    if (r.chance(clamp(0.08 + staffSkill(s, 'legal') / 500 + staffSkill(s, 'admin') / 600, 0, 0.9))) { caught(s, brId, d); return 'caught'; }
    return 'skim';
  }
  if (d.amb >= 55 && d.loy < 55 && r.chance(clamp(0.04 * k, 0, 0.9))) {
    d.skim = 0;
    emitFact(s, { kind: 'situation', actors: [d.k.replace(/^[slp]:/, ''), 'player'], severity: 25, visibility: 'secret', tags: ['gente33', 'crime', 'under31', 'skim'], text: fmtL(l('{n} começa a desviar dinheiro da filial por uma fachada.', '{n} starts skimming branch money through a front.'), { n: d.n }), src: 'gente33' });
    return 'skim';
  }
  // 4) briga com a sede
  if (d.fric >= 70 && (d.loy < 80 || r.chance(0.5))) { clash(s, brId, d); return 'clash'; }
  return null;
}
function caught(s: GameState, brId: string, d: BrDir33): void {
  const b = s.branches.find((x) => x.id === brId);
  const v = Math.round((d.skim ?? 0) / Math.max(1, money(s, 1)));
  const t = fmtL(l('Desvio na filial de {c}: {n} tirou cerca de US$ {v} por uma fachada.', 'Embezzlement at the {c} branch: {n} took about US$ {v} through a front.'), { c: cityById[b?.city ?? '']?.name ?? '', n: d.n, v });
  emitFact(s, { kind: 'scandal', actors: [d.k.replace(/^[slp]:/, ''), 'player'], place: b?.city, severity: 45, visibility: 'rumor', tags: ['gente33', 'crime', 'under31', 'skim'], text: t, src: 'gente33' });
  pushInbox18(s, 'g33_skim', { from: l('Contabilidade', 'Accounting').pt, tone: 'bad', ref: { br: brId }, weeks: 4, subject: l('Dinheiro sumindo na filial', 'Money vanishing at the branch'), body: t,
    actions: [{ id: 'police', label: l('Dar parte à polícia (recupera 30%, vira notícia)', 'Report to the police (recover 30%, makes the news)') }, { id: 'fire', label: l('Demitir em silêncio (recupera 50%)', 'Fire quietly (recover 50%)') }, { id: 'keep', label: l('Fingir que não viu', 'Look the other way') }] });
}
registerInboxKind('g33_skim', { label: l('Desvio na filial', 'Branch embezzlement'), cat: 'decision', icon: 'coin', prio: 2, goto: () => ({ area: 'world' }),
  handle: (s, m, act) => {
    const brId = String(m.ref?.br ?? ''), d = dirOf33(s, brId);
    if (!d) return l('Essa pessoa já não está na filial.', 'That person is no longer at the branch.');
    const back = (f: number) => { s.player.cash += Math.round((d.skim ?? 0) * f); };
    if (act === 'police') { back(0.3); fireBranchDir33(s, brId, fmtL(l('{n} foi denunciado(a) e afastado(a).', '{n} was reported and removed.'), { n: d.n })); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100); return l('Caso na delegacia; parte do dinheiro voltou.', 'Case filed with the police; part of the money came back.'); }
    if (act === 'fire') { back(0.5); fireBranchDir33(s, brId); return l('Demitido em silêncio; metade voltou.', 'Fired quietly; half came back.'); }
    d.skim = undefined; d.loy = clamp(d.loy + 10, 0, 100);
    return l('Você deixou passar. Por ora o desvio para.', 'You let it slide. For now the skimming stops.');
  } });
function clash(s: GameState, brId: string, d: BrDir33): void {
  const b = s.branches.find((x) => x.id === brId);
  pushInbox18(s, 'g33_clash', { from: d.n, tone: 'bad', ref: { br: brId }, weeks: 4,
    subject: fmtL(l('Filial {c} em pé de guerra com a sede', '{c} branch at war with HQ'), { c: cityById[b?.city ?? '']?.name ?? '' }),
    body: fmtL(l('{n} diz que a linha da sede ({ln}) e o teto de gasto amarram a filial e quer carta branca.', '{n} says HQ\'s line ({ln}) and spending cap tie the branch down and wants a free hand.'), { n: d.n, ln: d.line === 'bold' ? l('ousada', 'bold') : l('conservadora', 'conservative') }),
    actions: [{ id: 'give', label: l('Dar carta branca (linha dele, sem teto)', 'Give a free hand (their line, no cap)') }, { id: 'firm', label: l('Manter a linha', 'Hold the line') }, { id: 'fire', label: l('Demitir', 'Fire') }] });
  d.fric = 55;
}
registerInboxKind('g33_clash', { label: l('Briga com a sede', 'Clash with HQ'), cat: 'decision', icon: 'person', prio: 2, goto: () => ({ area: 'world' }),
  handle: (s, m, act) => {
    const brId = String(m.ref?.br ?? ''), d = dirOf33(s, brId);
    if (!d) return l('Essa pessoa já não está na filial.', 'That person is no longer at the branch.');
    if (act === 'give') { d.line = d.style === 'careful' ? 'safe' : 'bold'; d.cap = 0; d.fric = 10; d.loy = clamp(d.loy + 10, 0, 100); return l('Carta branca dada.', 'Free hand given.'); }
    if (act === 'fire') { fireBranchDir33(s, brId); return l('Diretor(a) demitido(a).', 'Director fired.'); }
    d.fric = 40; d.loy = clamp(d.loy - 15, 0, 100);
    return l('A linha fica; o clima, nem tanto.', 'The line stays; the mood, not so much.');
  } });
registerInboxKind('g33_br', { label: l('Relatório da filial', 'Branch report'), cat: 'analyst', icon: 'chart', prio: 0, goto: () => ({ area: 'world' }) });
LOW_KINDS18.add('g33_br');

// ================================================================ 2. CEO DA EMPRESA

export const ceo33 = (s: GameState): Ceo33 | undefined => peek33(s)?.ceo;
export function ceoLock33(s: GameState): L | null {
  if (!gente33On(s)) return l('CEO está desligado.', 'CEO is switched off.');
  if (ceo33(s)) return l('A empresa já tem CEO.', 'The company already has a CEO.');
  const years = s.year - (s.config.startYear ?? s.year);
  if (s.player.hq < GENTE33.ceoHq && years < GENTE33.ceoYears) return fmtL(l('Só para empresa grande: sede {h} ou {y} anos de casa.', 'Only for a big company: {h} HQ or {y} years in business.'), { h: HQ_LEVELS[GENTE33.ceoHq].name, y: GENTE33.ceoYears });
  const c = cands33(s, { min: 0.55, n: 1 })[0];
  if (!c) return l('Ninguém à altura agora (competência mínima 55).', 'Nobody up to it right now (minimum competence 55).');
  if (freeCash20(s) < signOn(s, c) * 3) return cashWhy20(s, signOn(s, c) * 3, l('Caixa insuficiente para as luvas do CEO.', 'Not enough cash for the CEO\'s signing fee.'));
  return null;
}
/** Contrata o CEO (sem `k`: o melhor candidato com competência ≥ 55): toda a delegação vai para a equipe/regra. */
export function hireCeo33(s: GameState, k?: string): L | null {
  const err = ceoLock33(s);
  if (err) return err;
  const c = k ? candBy(s, k) : cands33(s, { min: 0.55, n: 1 })[0];
  if (!c || c.q < 0.55) return l('Esse candidato não tem estatura de CEO.', 'That candidate is not CEO material.');
  takeFrom(s, c);
  postCost(s, 'g33:ceo:hire', signOn(s, c) * 3, 'salaries', `Luvas do CEO: ${c.n}`);
  const prev = JSON.parse(JSON.stringify(d31(s).r)) as Ceo33['prev'];
  applyPreset31(s, 'multi');
  const ceo: Ceo33 = { ...hireOf(s, c, 60), sal: Math.round(c.sal * 2.5), prev, gen: heirs(s).lineage.length, nextAsk: s.week + 8 };
  g33(s).ceo = ceo;
  const t = fmtL(l('{n} é o(a) novo(a) CEO da {c}; {o} passa a presidir o conselho.', '{n} is the new CEO of {c}; {o} now chairs the board.'), { n: c.n, c: s.config.companyName, o: ownerOf(s).name });
  log33(s, t);
  emitFact(s, { kind: 'hire33', actors: ['player', c.k.replace(/^[slp]:/, '')], severity: 45, visibility: 'public', tags: ['gente33', 'ceo'], text: t, src: 'gente33', diary: { important: true }, notify: 'info' });
  return null;
}
export function fireCeo33(s: GameState, why?: L): L | null {
  const g = peek33(s), c = g?.ceo;
  if (!g || !c) return l('A empresa não tem CEO.', 'The company has no CEO.');
  d31(s).r = JSON.parse(JSON.stringify(c.prev));
  delete g.ceo;
  release(s, c);
  postCost(s, 'g33:ceo:fire', money(s, c.sal * 3), 'salaries', `Rescisão do CEO: ${c.n}`);
  log33(s, why ?? fmtL(l('{n} deixa o cargo de CEO; a delegação volta a ser como antes.', '{n} steps down as CEO; delegation goes back to how it was.'), { n: c.n }));
  return null;
}
/** As grandes decisões que o CEO leva ao presidente do conselho (aprovar chama a função de sempre). */
type Big33 = { id: string; t: L; run: (s: GameState) => L | null };
function bigAsks(s: GameState): Big33[] {
  const out: Big33[] = [];
  const rd = raiders(s).find((x) => x.hostile);
  if (rd && freeCash20(s) >= rd.cost) out.push({ id: `raid:${rd.k}`, t: fmtL(l('Recomprar o bloco de {n} ({p}%) antes que vire aquisição hostil.', 'Buy back {n}\'s block ({p}%) before it becomes a hostile takeover.'), { n: rd.name, p: Math.round(rd.frac * 100) }), run: (x) => repelRaider(x, rd.k) });
  if (!hqBlocker(s) && freeCash20(s) >= money(s, HQ_LEVELS[s.player.hq + 1]?.upgradeCost ?? Infinity) * 1.5) out.push({ id: 'hq', t: fmtL(l('Ampliar a sede para {n}.', 'Upgrade HQ to {n}.'), { n: HQ_LEVELS[s.player.hq + 1].name }), run: (x) => { const lv = HQ_LEVELS[x.player.hq + 1]; const c = money(x, lv.upgradeCost); if (freeCash20(x) < c) return l('Caixa insuficiente.', 'Not enough cash.'); postCost(x, 'g33:ceo:hq', c, 'hq', `Ampliação da sede: ${lv.name.pt}`); x.player.hq += 1; return null; } });
  const best = Object.values(cityById).filter((c) => !canOpenBranch(s, c.id)).sort((a, b) => ((b as { pop?: number }).pop ?? 0) - ((a as { pop?: number }).pop ?? 0) || (a.id < b.id ? -1 : 1))[0];
  if (best) out.push({ id: `br:${best.id}`, t: fmtL(l('Abrir filial em {c}.', 'Open a branch in {c}.'), { c: best.name }), run: (x) => openBranch(x, best.id) });
  const up = s.branches.find((b) => !upgradeBlock(s, b.id));
  if (up) out.push({ id: `bru:${up.id}`, t: fmtL(l('Ampliar a filial {n}.', 'Upgrade the {n} branch.'), { n: up.name }), run: (x) => upgradeBranch(x, up.id) });
  return out;
}
const upgradeBlock = (s: GameState, id: string): boolean => { const b = s.branches.find((x) => x.id === id); return !b || b.level >= 2 || s.player.hq < b.level + 2; };
function ceoMonth(s: GameState, c: Ceo33): void {
  if (!alive(s, c)) { fireCeo33(s, fmtL(l('{n} morreu; o conselho procura outro CEO.', '{n} died; the board looks for another CEO.'), { n: c.n })); return; }
  postCost(s, 'g33:ceo:sal', money(s, c.sal), 'salaries', `Salário do CEO: ${c.n}`);
  // sucessão: o dono mudou com o CEO no cargo → transição segura (ou o CEO sai se o herdeiro não o quer)
  const gen = heirs(s).lineage.length;
  if (gen > c.gen) {
    c.gen = gen;
    const r = rr(s, 'ceo:succ');
    if (c.loy >= 50 || r.chance(0.6)) {
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100);
      log33(s, fmtL(l('{n} segura a empresa na troca de dono: o mercado nem piscou.', '{n} holds the company together through the change of owner: the market barely blinked.'), { n: c.n }));
    } else { fireCeo33(s, fmtL(l('Com o novo dono, {n} prefere sair.', 'With the new owner, {n} prefers to leave.'), { n: c.n })); return; }
  }
  // grande decisão para o presidente aprovar
  if (s.week >= c.nextAsk) {
    const asks = bigAsks(s);
    c.nextAsk = s.week + 13;
    if (asks.length) {
      const a = asks[0];
      pushInbox18(s, 'g33_ceo', { from: c.n, tone: 'info', ref: { ask: a.id }, weeks: 6, subject: l('O CEO pede a aprovação do conselho', 'The CEO asks for board approval'), body: a.t,
        actions: [{ id: 'yes', label: l('Aprovar', 'Approve') }, { id: 'no', label: l('Vetar', 'Veto') }] });
    }
  }
  const n = autoLog31(s, { since: s.week - 5 }).length;
  pushInbox18(s, 'g33_ceo_rep', { from: c.n, tone: 'info', subject: l('Relatório do CEO ao conselho', 'CEO report to the board'),
    body: fmtL(l('{n}: {d} decisão(ões) da equipe no mês, {a} artista(s) no elenco, caixa de US$ {c}. Nada que precise do presidente fora as grandes decisões.', '{n}: {d} staff decision(s) this month, {a} act(s) on the roster, US$ {c} in cash. Nothing that needs the chair besides the big decisions.'),
      { n: c.n, d: n, a: playerActs(s).length, c: Math.round(s.player.cash / Math.max(1, money(s, 1))) }) });
}
registerInboxKind('g33_ceo', { label: l('Conselho', 'Board'), cat: 'decision', icon: 'person', prio: 2, goto: () => ({ area: 'office' }),
  handle: (s, m, act) => {
    const c = ceo33(s);
    if (!c) return l('A empresa já não tem CEO.', 'The company no longer has a CEO.');
    const a = bigAsks(s).find((x) => x.id === String(m.ref?.ask ?? ''));
    if (act !== 'yes') { c.loy = clamp(c.loy - 4, 0, 100); return l('Vetado. O CEO anota.', 'Vetoed. The CEO takes note.'); }
    if (!a) return l('A proposta já não vale.', 'The proposal no longer stands.');
    const err = a.run(s);
    c.loy = clamp(c.loy + 3, 0, 100);
    return err ?? fmtL(l('Aprovado: {t}', 'Approved: {t}'), { t: a.t });
  } });
registerInboxKind('g33_ceo_rep', { label: l('Relatório do CEO', 'CEO report'), cat: 'analyst', icon: 'chart', prio: 0, goto: () => ({ area: 'office' }) });
LOW_KINDS18.add('g33_ceo_rep');

// ================================================================ 3. CONSELHO E ACIONISTAS

export const board33 = (s: GameState): Board33 | undefined => peek33(s)?.board;
export function boardLock33(s: GameState): L | null {
  if (!gente33On(s)) return l('Conselho está desligado.', 'Board is switched off.');
  if (board33(s)) return l('O conselho já existe.', 'The board already exists.');
  if (!s.listing?.listed && !capital(s).investors.length) return l('Só com sócios ou ações na bolsa.', 'Only with partners or listed shares.');
  return null;
}
export function seatBoard33(s: GameState): L | null {
  const err = boardLock33(s);
  if (err) return err;
  g33(s).board = { since: s.week, next: s.week + 52, conf: 60, log: [] };
  log33(s, l('O conselho de acionistas foi instalado: reunião todo ano.', 'The shareholders\' board was seated: a meeting every year.'));
  return null;
}
/** Desempenho para o voto (−1..1): receita do ano contra o anterior, preço da ação e o CEO. */
function perf33(s: GameState): number {
  const ry = s.player.revenueByYear ?? {}, a = ry[s.year - 1] ?? 0, b = ry[s.year - 2] ?? 0;
  const grow = b > 0 ? clamp((a - b) / b, -1, 1) : 0;
  const q = bolsa(s).q?.[OWN];
  const px = q && q.hist.length > 13 ? clamp(q.p / Math.max(1, q.hist[q.hist.length - 13]) - 1, -1, 1) : 0;
  const c = ceo33(s);
  return clamp(grow * 0.6 + px * 0.4 + (c ? (c.q - 0.6) * 0.5 : 0), -1, 1);
}
export interface Vote33 { k: string; name: L; frac: number; yes: boolean }
/** A reunião anual: cada acionista vota a favor ou contra a presidência. Devolve os votos e o placar. */
export function boardMeeting33(s: GameState): { votes: Vote33[]; yes: number; no: number } | null {
  const bd = board33(s);
  if (!bd) return null;
  const r = rr(s, 'board');
  const p = perf33(s);
  const hostile = new Set(raiders(s).filter((x) => x.hostile).map((x) => x.k));
  const votes: Vote33[] = [];
  for (const h of holders(s, OWN, 12)) {
    if (h.kind === 'you' || h.kind === 'founder' || h.kind === 'co') { votes.push({ k: h.k, name: h.name, frac: h.frac, yes: true }); continue; }
    const lean = 0.55 + p * 0.4 + (bd.conf - 50) / 200 - (hostile.has(h.k) ? 0.6 : 0) - (h.kind === 'fund' && p < 0 ? 0.15 : 0);
    votes.push({ k: h.k, name: h.name, frac: h.frac, yes: r.chance(clamp(lean, 0.02, 0.98)) });
  }
  if (!s.listing?.listed) for (const inv of capital(s).investors) votes.push({ k: `I:${inv.id}`, name: l(inv.name, inv.name), frac: inv.share, yes: r.chance(clamp(0.6 + p * 0.4, 0.05, 0.95)) });
  const yes = votes.filter((v) => v.yes).reduce((t, v) => t + v.frac, 0), no = votes.filter((v) => !v.yes).reduce((t, v) => t + v.frac, 0);
  bd.conf = clamp(bd.conf + (yes >= no ? 6 : -12) + p * 10, 0, 100);
  const t = fmtL(l('Assembleia anual da {c}: {y}% a favor da presidência, {n}% contra.', '{c} annual meeting: {y}% for the chair, {n}% against.'), { c: s.config.companyName, y: Math.round(yes * 100), n: Math.round(no * 100) });
  bd.log.unshift([s.year, Math.round(yes * 100), Math.round(no * 100), t]); if (bd.log.length > 12) bd.log.length = 12;
  bd.next = s.week + 52;
  emitFact(s, { kind: 'board_vote33', actors: ['player'], severity: no > yes ? 50 : 20, visibility: 'public', tags: ['gente33', 'board', no > yes ? 'bad' : 'good'], text: t, src: 'gente33', diary: true });
  if (no > yes) pushInbox18(s, 'g33_board', { from: l('Conselho de acionistas', 'Shareholders\' board').pt, tone: 'bad', weeks: 6,
    subject: l('Moção para tirar você da presidência', 'Motion to remove you from the chair'),
    body: fmtL(l('{t} Os acionistas contra querem outra pessoa no comando.', '{t} The shareholders against want someone else in charge.'), { t }),
    actions: [{ id: 'buy', label: l('Recomprar o maior bloco hostil', 'Buy back the biggest hostile block') }, { id: 'ceo', label: l('Aceitar um CEO indicado', 'Accept a nominated CEO') }, { id: 'fight', label: l('Brigar na assembleia', 'Fight it out at the meeting') }] });
  return { votes, yes, no };
}
registerInboxKind('g33_board', { label: l('Conselho', 'Board'), cat: 'decision', icon: 'person', prio: 3, goto: () => ({ area: 'finance' }),
  handle: (s, _m, act) => {
    const bd = board33(s);
    if (!bd) return l('O conselho já não existe.', 'The board no longer exists.');
    if (act === 'buy') { const rd = raiders(s)[0]; const err = rd ? repelRaider(s, rd.k) : l('Não há bloco para recomprar.', 'No block to buy back.'); if (!err) bd.conf = clamp(bd.conf + 15, 0, 100); return err ?? l('Bloco recomprado: a moção perdeu força.', 'Block bought back: the motion lost steam.'); }
    if (act === 'ceo') { const err = ceo33(s) ? null : hireCeo33(s); bd.conf = clamp(bd.conf + 20, 0, 100); return err ?? l('Um CEO indicado pelo conselho assume; você fica na presidência.', 'A board-nominated CEO takes over; you keep the chair.'); }
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
    if (s.listing?.listed) s.listing.price = Math.max(1, Math.round(s.listing.price * 0.95));
    bd.conf = clamp(bd.conf + 5, 0, 100);
    return l('Você brigou e ficou, mas o mercado não gostou da guerra.', 'You fought and stayed, but the market disliked the war.');
  } });

// ================================================================ 4. EQUIPE PESSOAL

export const CREW33: Record<Crew33, { n: L; sal: number; desc: L }> = {
  driver: { n: l('Motorista', 'Driver'), sal: 450, desc: l('Menos estresse no trânsito e nas viagens.', 'Less stress in traffic and on the road.') },
  guard: { n: l('Segurança pessoal', 'Personal security'), sal: 900, desc: l('Reforça a segurança da casa: menos paparazzi.', 'Strengthens home security: fewer paparazzi.') },
  trainer: { n: l('Personal trainer', 'Personal trainer'), sal: 500, desc: l('Saúde sobe devagar todo mês.', 'Health rises slowly every month.') },
  doctor: { n: l('Médico(a) particular', 'Private doctor'), sal: 1500, desc: l('Cuida da saúde e do estresse; check-up quando a saúde cai.', 'Looks after health and stress; a check-up when health drops.') },
};
export const crew33 = (s: GameState, k: Crew33): Hire33 | undefined => peek33(s)?.crew[k];
/** Equipe pessoal: gente da cidade (o médico pode vir da sua equipe); ex-artista só se não há mais ninguém. */
const crewCand = (s: GameState, k: Crew33): Cand33 | undefined =>
  cands33(s, { srcs: k === 'doctor' ? ['city', 'staff'] : ['city'], n: 1 })[0] ?? cands33(s, { srcs: ['exart'], n: 1 })[0];
export function crewLock33(s: GameState, k: Crew33): L | null {
  if (!gente33On(s)) return l('Equipe pessoal está desligada.', 'Personal staff is switched off.');
  if (crew33(s, k)) return fmtL(l('Você já tem {n}.', 'You already have a {n}.'), { n: CREW33[k].n });
  if (!crewCand(s, k)) return l('Ninguém disponível na cidade agora.', 'Nobody available in town right now.');
  if (ownerOf(s).wealth < money(s, CREW33[k].sal)) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  return null;
}
/** Contrata alguém da equipe pessoal (paga do bolso). */
export function hireCrew33(s: GameState, k: Crew33): L | null {
  const err = crewLock33(s, k);
  if (err) return err;
  const c = crewCand(s, k)!;
  const h: Hire33 = { ...hireOf(s, c), sal: CREW33[k].sal };
  g33(s).crew[k] = h;
  purse(s, -money(s, h.sal), 'living', `g33:${k}`, { who: ownerOf(s) });
  if (k === 'guard') setGuard33(s, Math.max(vida33(s).guard, c.q >= 0.6 ? 2 : 1));
  log33(s, fmtL(l('{n} agora é {r} de {o}.', '{n} is now {o}\'s {r}.'), { n: c.n, r: CREW33[k].n, o: ownerOf(s).name }));
  return null;
}
export function fireCrew33(s: GameState, k: Crew33): L | null {
  const g = peek33(s), h = g?.crew[k];
  if (!g || !h) return l('Ninguém nesse posto.', 'Nobody in that post.');
  delete g.crew[k];
  if (k === 'guard') setGuard33(s, 0);
  return null;
}
function crewMonth(s: GameState, g: G33): void {
  const o = ownerOf(s);
  for (const k of Object.keys(g.crew) as Crew33[]) {
    const h = g.crew[k]!;
    if (!alive(s, h)) { delete g.crew[k]; if (k === 'guard') setGuard33(s, 0); continue; }
    // o segurança já é cobrado pelo vida33 quando o paparazzi está ligado (uma conta só)
    if (!(k === 'guard' && sw<boolean>(s, SW33.paparazzi))) purse(s, -money(s, h.sal), 'living', `g33:${k}`, { who: o });
    if (k === 'driver') o.stress = clamp01(o.stress - 1.5 * (0.6 + h.q * 0.6));
    if (k === 'trainer') { o.health = clamp01(o.health + 1 * (0.6 + h.q * 0.6)); o.stress = clamp01(o.stress - 0.5); }
    if (k === 'doctor') { o.health = clamp01(o.health + (o.health < 45 ? 4 : 1.2) * (0.6 + h.q * 0.6)); o.stress = clamp01(o.stress - 1); }
    if (k === 'guard') setGuard33(s, Math.max(vida33(s).guard, h.q >= 0.6 ? 2 : 1));
  }
}

// ================================================================ 5. PESSOAS FIXAS

export const FIX33: Record<Fixed33, { n: L; desc: L }> = {
  fan: { n: l('Presidente do fã-clube', 'Fan club president'), desc: l('Organiza os fãs do seu maior artista — e às vezes briga em público.', 'Organises your biggest act\'s fans — and sometimes fights in public.') },
  press: { n: l('Jornalista que acompanha você', 'Journalist on your beat'), desc: l('Sempre a mesma pessoa: escreve sobre a sua carreira, aliada ou inimiga.', 'Always the same person: writes about your career, friend or foe.') },
  union: { n: l('Representante do sindicato', 'Union representative'), desc: l('Ponte com o sindicato dos músicos: confiança sobe ou cai com a relação.', 'Bridge to the musicians\' union: trust rises or falls with the relationship.') },
};
export const fixed33 = (s: GameState, k: Fixed33): Fix33 | undefined => peek33(s)?.fix[k];
const topAct = (s: GameState): Act | undefined => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && liveAct(a)).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[0];
function fixCand(s: GameState, k: Fixed33): Cand33 | undefined {
  if (k === 'press') {
    const st = peekGente31(s);
    const pid = Object.entries(st?.j ?? {}).filter(([sl]) => sl.startsWith('press:')).map(([, j]) => j.p).find((p) => s.persons[p]?.alive && !blocked(s, `p:${p}`, s.persons[p].name));
    if (pid) return cands33(s, { srcs: ['city'], n: 999 }).find((c) => c.k === `p:${pid}`);
  }
  return cands33(s, { srcs: ['city', 'exart'], n: 1 })[0];
}
export function fixLock33(s: GameState, k: Fixed33): L | null {
  if (!gente33On(s)) return l('Pessoas fixas estão desligadas.', 'Fixed people are switched off.');
  if (fixed33(s, k)) return l('Essa pessoa já acompanha você.', 'That person already follows you.');
  if (k === 'fan' && !topAct(s)) return l('Precisa de um artista no elenco.', 'You need an act on the roster.');
  if (!fixCand(s, k)) return l('Ninguém disponível na cidade agora.', 'Nobody available in town right now.');
  return null;
}
/** Começa a relação com a pessoa fixa (fã-clube do seu maior artista, jornalista, representante do sindicato). */
export function adoptFixed33(s: GameState, k: Fixed33): L | null {
  const err = fixLock33(s, k);
  if (err) return err;
  const c = fixCand(s, k)!;
  const f: Fix33 = { ...hireOf(s, c), sal: 0, rel: k === 'press' ? 0 : 20, ...(k === 'fan' ? { act: topAct(s)!.id } : {}) };
  g33(s).fix[k] = f;
  log33(s, fmtL(l('{n}: {r}.', '{n}: {r}.'), { n: c.n, r: FIX33[k].n }));
  return null;
}
/** Agrado (almoço, exclusiva, ingresso): +relação; custa um pouco do caixa do selo. */
export function courtFixed33(s: GameState, k: Fixed33): L | null {
  const f = fixed33(s, k);
  if (!f) return l('Ninguém nesse papel ainda.', 'Nobody in that role yet.');
  const c = money(s, k === 'press' ? 300 : 150);
  if (freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.'));
  postCost(s, `g33:court:${k}`, c, 'marketing', `Agrado: ${f.n}`);
  f.rel = clamp(f.rel + (k === 'press' ? 15 : 10), -100, 100);
  return null;
}
function fixMonth(s: GameState, g: G33): void {
  const r = rr(s, 'fix');
  const fan = g.fix.fan;
  if (fan && alive(s, fan)) {
    const a = fan.act ? s.acts[fan.act] : undefined;
    const fa = a ? fan18(s, a.id, false) : undefined;
    if (a && liveAct(a)) {
      const roll = r.next();
      if (roll < 0.5 + fan.rel / 400) { a.momentum = clamp(a.momentum + 1, 0, 100); if (fa) fa.loy = clamp(fa.loy + 1, 0, 100); }
      else if (roll > 0.9 - Math.max(0, -fan.rel) / 400) {
        if (fa) fa.loy = clamp(fa.loy - 2, 0, 100);
        fan.rel = clamp(fan.rel - 5, -100, 100);
        emitFact(s, { kind: 'statement', actors: [a.id, fan.k.replace(/^[slp]:/, '')], severity: 25, visibility: 'public', tags: ['gente33', 'fanclub', 'bad'], src: 'gente33', notify: 'bad',
          text: fmtL(l('{n}, presidente do fã-clube de {a}, briga em público com o selo.', '{n}, president of {a}\'s fan club, picks a public fight with the label.'), { n: fan.n, a: a.name }) });
      }
    }
  }
  const pr = g.fix.press;
  if (pr && alive(s, pr)) {
    // escândalo do elenco no mês empurra para inimigo; caridade/prêmio para aliado (fatos do mês)
    pr.rel = clamp(pr.rel - 1 + (r.chance(0.3) ? (r.chance(0.5) ? 4 : -4) : 0), -100, 100);
    const a = topAct(s);
    const ally = pr.rel >= 20, foe = pr.rel <= -20;
    if (ally) s.player.reputation.artistic = clamp(s.player.reputation.artistic + 0.3, 0, 100);
    if (foe) s.player.reputation.artistic = clamp(s.player.reputation.artistic - 0.3, 0, 100);
    emitFact(s, { kind: 'statement', actors: ['player', pr.k.replace(/^[slp]:/, ''), ...(a ? [a.id] : [])], severity: 15, visibility: 'public', tags: ['gente33', 'press', 'column33', ally ? 'good' : foe ? 'bad' : 'info'], src: 'gente33',
      text: ally ? fmtL(l('Coluna de {n}: a {c} vive bom momento{a}.', '{n}\'s column: {c} is on a roll{a}.'), { n: pr.n, c: s.config.companyName, a: a ? fmtL(l(', e {x} lidera', ', with {x} leading'), { x: a.name }) : '' })
        : foe ? fmtL(l('Coluna de {n}: a {c} perdeu o rumo.', '{n}\'s column: {c} has lost its way.'), { n: pr.n, c: s.config.companyName })
          : fmtL(l('Coluna de {n}: de olho na {c}.', '{n}\'s column: keeping an eye on {c}.'), { n: pr.n, c: s.config.companyName }) });
  }
  const un = g.fix.union;
  if (un && alive(s, un)) {
    const u = union20(s);
    if (un.rel >= 30) u.trust = clamp(u.trust + 1, 0, 100);
    if (un.rel <= -30) u.trust = clamp(u.trust - 1, 0, 100);
    un.rel = clamp(un.rel - 0.5, -100, 100);
    if (u.cur && un.seen !== u.cur.w) {
      un.seen = u.cur.w;
      pushInbox18(s, 'g33_union', { from: un.n, tone: 'info', subject: l('Conversa com o representante do sindicato', 'A word with the union rep'),
        body: un.rel >= 30 ? fmtL(l('{n} adianta: a entidade aceita meio-termo se você negociar de boa-fé.', '{n} tips you off: the guild will take a middle ground if you negotiate in good faith.'), { n: un.n })
          : fmtL(l('{n} avisa: a pauta está na mesa e a base está desconfiada.', '{n} warns: the demand is on the table and the rank and file are wary.'), { n: un.n }) });
    }
  }
}
registerInboxKind('g33_union', { label: l('Sindicato', 'Union'), cat: 'staff', icon: 'person', prio: 1, goto: () => ({ area: 'finance' }) });

// ================================================================ mês

export function gente33Month(s: GameState): void {
  const g = peek33(s);
  if (!g || !gente33On(s)) return;
  for (const brId of Object.keys(g.br).sort()) {
    if (!s.branches.some((b) => b.id === brId)) { const d = g.br[brId]; delete g.br[brId]; release(s, d); continue; }
    branchMonth33(s, brId);
    const d = g.br[brId];
    if (d) branchReport(s, brId, d);
    branchRisks33(s, brId);
  }
  if (g.ceo) ceoMonth(s, g.ceo);
  if (g.board && s.week >= g.board.next) boardMeeting33(s);
  crewMonth(s, g);
  fixMonth(s, g);
}
registerSimHook('month', 'gente33', (s) => gente33Month(s));

// ---------------------------------------------------------------- leitura para cartões

/** Primeira filial sem diretor (ação do cartão do mapa). */
export const freeBranch33 = (s: GameState): string | undefined => s.branches.find((b) => !dirOf33(s, b.id))?.id;
/** Contrata o melhor candidato para a primeira filial sem diretor. */
export function hireFirstBranchDir33(s: GameState): L | null {
  const id = freeBranch33(s);
  return id ? hireBranchDir33(s, id) : l('Todas as filiais já têm diretor(a), ou não há filial.', 'Every branch already has a director, or there is no branch.');
}
export const log33Of = (s: GameState): [number, L][] => peek33(s)?.log ?? [];
