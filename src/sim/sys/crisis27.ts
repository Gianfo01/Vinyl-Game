// r27 (P2B) — CRISES COM RELÓGIO. Quando um gatilho que o jogo JÁ tem dispara — caixa no vermelho a caminho da
// insolvência (economy), processo contra o selo (session19/writers19/afterlife19/tribute19/regions19), fábrica de
// discos parada (eventos de fabricação, greve do sindicato do regions19/world4), incêndio/enchente no estúdio
// (crime17/hood19) ou prisão de um artista (crime17/society18) — o jogador pode abrir a SALA DE CRISE: N semanas,
// K ações por semana, um medidor de ameaça que sobe sozinho a cada semana e ações que o derrubam (com chance).
// No fim do relógio a crise vira desfecho nos sistemas de sempre: caixa (post), reputação, meses de insolvência,
// datas de lançamento, confiança/momento do ato, lealdade da equipe, fatos (facts17).
// • Seguro conta: seguro patrimonial (links19b) libera "acionar o seguro" no incêndio; seguro de pessoa-chave
//   (insure19) paga metade da fiança. • Delegação conta: na semana sem ação do jogador, a equipe certa (jurídico,
//   administração, fabricação, empresário…) age sozinha — só dentro da política de gasto (policy18); sem ninguém
//   da área, a crise corre solta. Ações fora da política são possíveis para o jogador, mas a diretoria reclama.
// Modo rápido: nenhuma crise é aberta sozinha — sem o jogador abrir a sala, o jogo segue exatamente como antes.
// Sorte: Rng.fromSeed(semente|crisis27v1|crise|ação|n) — nunca s.rng.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { INSOLVENT_AT, loanOffer, monthlyCosts, takeLoan } from '../economy';
import { eventById } from '../events';
import { emitFact, factSeedKey17, recentFacts, type Fact } from '../facts17';
import { registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, money, playerActs, post, staffSkill } from '../util';
import { addStress } from '../stress17';
import { capital, boardConfidence, opinion } from './capital';
import { ins19 } from './insure19';
import { l19b, insPrem19 } from './links19b';
import { careerOf } from './people/staff';
import { rule31 } from '../deleg31';
import { overPolicy27 } from './road27';
import { strikeActive } from './world4/common';
import { addStaffLoyalty } from '../opinion';

export const CRISIS27_RNG = 'crisis27v1';
export type CrisisKind27 = 'bankrupt' | 'lawsuit' | 'strike' | 'fire' | 'arrest';
export type Outcome27 = 'won' | 'partial' | 'lost';
export interface Crisis27 {
  id: string; k: CrisisKind27; title: L; text: L;
  w0: number; weeks: number; left: number; per: number; used: number; wk: number;
  threat: number; t0: number;
  ref: { act?: string; pid?: string; sev?: number };
  n: Record<string, number>;
  log: { w: number; t: L; tone: 'good' | 'bad' | 'info' }[];
  done?: { o: Outcome27; w: number; why: L[] };
}
export interface Cr27State { list: Crisis27[]; seen: Record<string, number> }
export const cr27 = (s: GameState): Cr27State => {
  const x = s.x4 as unknown as { crisis27?: Cr27State };
  return (x.crisis27 ??= { list: [], seen: {} });
};
const peek = (s: GameState): Cr27State | undefined => (s.x4 as unknown as { crisis27?: Cr27State }).crisis27;
const rng = (s: GameState, c: string, part: string) => Rng.fromSeed(`${s.config.seed}|${CRISIS27_RNG}|${c}|${part}`);

export const CRISIS_NAME27: Record<CrisisKind27, L> = {
  bankrupt: l('Ameaça de falência', 'Bankruptcy threat'), lawsuit: l('Processo na justiça', 'Lawsuit'), strike: l('Fábrica de discos parada', 'Pressing plant shutdown'),
  fire: l('Incêndio no estúdio', 'Studio fire'), arrest: l('Artista preso', 'Artist arrested'),
};
/** semanas no relógio, ameaça inicial, pressão por semana e quem da equipe cuida quando você não age */
export const CFG27: Record<CrisisKind27, { weeks: number; t0: number; push: number; roles: string[] }> = {
  bankrupt: { weeks: 8, t0: 60, push: 6, roles: ['admin', 'analyst', 'legal'] },
  lawsuit: { weeks: 6, t0: 52, push: 4, roles: ['legal'] },
  strike: { weeks: 5, t0: 55, push: 5, roles: ['manufacturing', 'admin'] },
  fire: { weeks: 4, t0: 60, push: 6, roles: ['admin', 'engineer'] },
  arrest: { weeks: 3, t0: 65, push: 8, roles: ['manager', 'legal', 'publicist'] },
};

// ---------------------------------------------------------------- gatilhos (puros: leem o que o jogo já registrou)

export interface Cand27 { id: string; k: CrisisKind27; text: L; ref: Crisis27['ref'] }
const SUITS27 = ['session_lawsuit', 'plagiarism_suit', 'estate_suit', 'tribute_sued', 'industry_suit'];

/** Crises que podem ser abertas agora (ainda não vistas). */
export function crisisCands27(s: GameState): Cand27[] {
  const mine = new Set(playerActs(s));
  const members = new Set<string>();
  for (const id of mine) for (const p of s.acts[id]?.members ?? []) members.add(p);
  const st = peek(s);
  const seen = (id: string) => !!st?.seen[id];
  const out: Cand27[] = [];
  const touches = (f: Fact) => f.actors.some((a) => a === 'player' || mine.has(a));
  // 1. falência: caixa negativo e meses contando para a insolvência
  if (s.player.cash < 0 && s.player.insolvencyMonths >= 1 && !(st?.list.some((c) => c.k === 'bankrupt' && c.w0 > s.week - 26))) {
    const id = `bankrupt:${Math.floor(s.week / 26)}`;
    if (!seen(id)) out.push({ id, k: 'bankrupt', ref: {}, text: fmtL(l('Caixa no vermelho há {m} mês(es): faltam {k} para a insolvência. Credores ligando todo dia.', 'Cash in the red for {m} month(s): {k} left before insolvency. Creditors call every day.'), { m: s.player.insolvencyMonths, k: Math.max(0, INSOLVENT_AT - s.player.insolvencyMonths) }) });
  }
  // 2. processos contra o selo / seus artistas (não os que você mesmo abriu)
  for (const f of recentFacts(s, { kinds: SUITS27, sinceWeek: s.week - 6 })) {
    if (!touches(f) || f.tags.includes('out') || f.actors[0] === 'player') continue;
    const id = `law:${factSeedKey17(f)}`;
    if (!seen(id)) out.push({ id, k: 'lawsuit', text: f.text, ref: { act: f.actors.find((a) => mine.has(a)), sev: f.severity } });
  }
  // 3. fábrica parada: evento ruim de fabricação recente ou greve do sindicato em curso
  for (const [eid, until] of Object.entries(s.eventCooldowns ?? {})) {
    const def = eventById[eid];
    if (!def || def.cat !== 'manufacturing' || def.tone !== 'bad') continue;
    const w = until - def.cooldown * 4;
    if (s.week - w > 4 || s.week < w) continue;
    const id = `strike:${eid}:${w}`;
    if (!seen(id)) out.push({ id, k: 'strike', ref: {}, text: fmtL(l('{t}: os discos não saem da fábrica e os lançamentos marcados correm risco.', '{t}: records are stuck at the plant and scheduled releases are at risk.'), { t: def.title }) });
  }
  const sk = strikeActive(s);
  if (sk && s.pendingReleases.some((p) => mine.has(p.actId))) {
    const id = `strike:union:${sk.from}`;
    if (!seen(id)) out.push({ id, k: 'strike', ref: {}, text: l('Greve do sindicato: prensas e estúdios parados, e você tem discos marcados.', 'Union strike: presses and studios idle, and you have records scheduled.') });
  }
  // 4. incêndio / enchente no estúdio ou na sede
  for (const f of recentFacts(s, { kind: 'disaster', sinceWeek: s.week - 6 })) {
    if (!touches(f) || !f.tags.some((t) => t === 'fire' || t === 'flood' || t === 'campus')) continue;
    const id = `fire:${factSeedKey17(f)}`;
    if (!seen(id)) out.push({ id, k: 'fire', text: f.text, ref: { act: f.actors.find((a) => mine.has(a)), sev: f.severity } });
  }
  // 5. prisão de alguém do seu elenco
  for (const f of recentFacts(s, { kind: 'arrest', sinceWeek: s.week - 6 })) {
    const pid = f.actors.find((a) => members.has(a));
    const act = f.actors.find((a) => mine.has(a)) ?? (pid ? [...mine].find((id) => s.acts[id]?.members.includes(pid)) : undefined);
    if (!act) continue;
    const id = `arrest:${factSeedKey17(f)}`;
    if (!seen(id)) out.push({ id, k: 'arrest', text: f.text, ref: { act, pid, sev: f.severity } });
  }
  return out;
}

/** Abre a sala de crise. */
export function openCrisis27(s: GameState, id: string): Crisis27 | L {
  const cand = crisisCands27(s).find((x) => x.id === id);
  if (!cand) return l('Essa crise não está mais na mesa.', 'That crisis is no longer on the table.');
  const st = cr27(s);
  const cfg = CFG27[cand.k];
  let t0 = cfg.t0 + Math.round((cand.ref.sev ?? 40) / 10) - 4;
  const why: L[] = [];
  if (cand.k === 'bankrupt') {
    t0 += (s.player.insolvencyMonths - 1) * 10;
    if (rule31(s, 'finance', 'reserve') > 0) { t0 -= 8; why.push(l('A política de reserva mínima deu credibilidade com os credores (−8).', 'The minimum-reserve policy gave you credibility with creditors (−8).')); }
  }
  const weeks = cand.k === 'bankrupt' ? Math.max(2, INSOLVENT_AT - s.player.insolvencyMonths) * 4 : cfg.weeks;
  const per = 2 + (s.player.staff.some((x) => x.role === 'admin') ? 1 : 0);
  const c: Crisis27 = { id: cand.id, k: cand.k, title: CRISIS_NAME27[cand.k], text: cand.text, w0: s.week, weeks, left: weeks, per, used: 0, wk: s.week, threat: clamp(t0, 20, 90), t0: clamp(t0, 20, 90), ref: cand.ref, n: {}, log: [] };
  for (const w of why) c.log.push({ w: s.week, t: w, tone: 'good' });
  st.list.unshift(c);
  st.seen[cand.id] = s.week;
  if (st.list.length > 12) st.list.length = 12;
  return c;
}
export const openCrises27 = (s: GameState): Crisis27[] => (peek(s)?.list ?? []).filter((c) => !c.done);
export const crisisById27 = (s: GameState, id: string): Crisis27 | undefined => peek(s)?.list.find((c) => c.id === id);
/** Deixa a crise de lado (não abre a sala): o jogo segue como sempre. */
export function dismissCrisis27(s: GameState, id: string): void { cr27(s).seen[id] = s.week; }

// ---------------------------------------------------------------- ações

export interface CrAct27 {
  id: string; label: L; hint: L;
  cost: (s: GameState, c: Crisis27) => number;
  p: (s: GameState, c: Crisis27) => number;
  d: number; fail?: number; once?: boolean; harsh?: boolean;
  need?: (s: GameState, c: Crisis27) => L | null;
  fx?: (s: GameState, c: Crisis27, ok: boolean) => L | null;
}
const sk = (s: GameState, ...roles: string[]) => Math.max(0, ...roles.map((r) => staffSkill(s, r)));
const act = (s: GameState, c: Crisis27) => (c.ref.act ? s.acts[c.ref.act] : undefined);
const rep = (s: GameState, k: 'artistic' | 'commercial' | 'artists' | 'institutional', d: number) => { s.player.reputation[k] = clamp(s.player.reputation[k] + d, 0, 100); };
const loyal = (s: GameState, d: number, roles?: string[]) => { for (const m of s.player.staff) if (!roles || roles.includes(m.role)) { careerOf(s, m); addStaffLoyalty(s, m.id, d); } };
const PR27: CrAct27 = { id: 'pr', label: l('Assessoria de crise', 'Crisis PR'), hint: l('Controla a narrativa na imprensa.', 'Controls the press narrative.'), cost: (s) => money(s, 400), p: (s) => clamp(0.5 + sk(s, 'publicist') / 200, 0.3, 0.92), d: 10 };

export const ACTS27: Record<CrisisKind27, CrAct27[]> = {
  bankrupt: [
    { id: 'loan', label: l('Crédito de emergência', 'Emergency credit'), hint: l('O banco empresta (se ainda emprestar); juros pesados nos próximos meses.', 'The bank lends (if it still will); heavy interest in the months ahead.'), cost: () => 0, p: () => 1, d: 25, once: true,
      need: (s) => (loanOffer(s) && s.player.loans.length < 3 ? null : l('O banco não empresta mais para você.', 'The bank won\'t lend to you anymore.')),
      fx: (s) => (takeLoan(s) ? l('Dinheiro na conta; a parcela começa no mês que vem.', 'Money in the bank; installments start next month.') : null) },
    { id: 'cut', label: l('Congelar salários e cortar mimos', 'Freeze salaries and cut perks'), hint: l('Entra caixa já; a equipe fica ressentida.', 'Cash now; staff resent it.'), cost: () => 0, p: () => 1, d: 12, once: true, harsh: true,
      fx: (s) => { const v = Math.round(monthlyCosts(s).salaries * 0.3); if (v) post(s, `cr27cut:${s.week}`, v, 'salaries', 'Crise: salários congelados'); loyal(s, -5); return fmtL(l('Economia de {v} no mês; lealdade da equipe −5.', '{v} saved this month; staff loyalty −5.'), { v: Math.round(v / 100) }); } },
    { id: 'creditors', label: l('Renegociar com credores', 'Renegotiate with creditors'), hint: l('Administração, analista ou jurídico pesam na chance.', 'Admin, analyst or legal raise the odds.'), cost: () => 0, p: (s) => clamp(0.4 + sk(s, 'admin', 'analyst', 'legal') / 200, 0.25, 0.9), d: 20, fail: 5 },
    { id: 'advance', label: l('Antecipar receitas com a distribuidora', 'Draw an advance from the distributor'), hint: l('Dinheiro agora; o mercado acha que você está desesperado.', 'Cash now; the market thinks you\'re desperate.'), cost: () => 0, p: () => 1, d: 15, once: true,
      fx: (s) => { post(s, `cr27adv:${s.week}`, money(s, 4000), 'financing', 'Crise: antecipação de receitas'); rep(s, 'commercial', -1); return l('Adiantamento recebido; reputação comercial −1.', 'Advance received; commercial reputation −1.'); } },
    { id: 'investor', label: l('Pedir aporte aos sócios', 'Ask partners for capital'), hint: l('Depende da confiança da diretoria/investidores.', 'Depends on board/investor confidence.'), cost: () => 0, p: (s) => clamp(boardConfidence(s) / 120, 0.15, 0.85), d: 30, fail: 6, once: true,
      need: (s) => (capital(s).investors.length ? null : l('Você não tem sócios.', 'You have no partners.')),
      fx: (s, _c, ok) => { for (const inv of capital(s).investors) { inv.mods.push({ label: ok ? l('Aporte na crise', 'Crisis capital call') : l('Pedido de socorro negado', 'Bailout refused'), value: ok ? -4 : -8, decay: 1 }); if (inv.mods.length > 10) inv.mods.shift(); } if (ok) post(s, `cr27inv:${s.week}`, money(s, 8000), 'financing', 'Crise: aporte dos sócios'); return ok ? l('Os sócios põem dinheiro — e passam a cobrar mais.', 'Partners put money in — and will demand more.') : l('Os sócios recusam e perdem a paciência.', 'Partners refuse and lose patience.'); } },
    PR27,
  ],
  lawsuit: [
    { id: 'lawyer', label: l('Advogado de peso', 'Heavyweight lawyer'), hint: l('Caro; o jurídico da casa ajuda.', 'Pricey; in-house legal helps.'), cost: (s) => money(s, 1500), p: (s) => clamp(0.55 + sk(s, 'legal') / 250, 0.4, 0.95), d: 22 },
    { id: 'evidence', label: l('Levantar provas', 'Gather evidence'), hint: l('De graça, mas pode não achar nada.', 'Free, but may turn up nothing.'), cost: () => 0, p: (s) => clamp(0.5 + sk(s, 'legal', 'rights') / 300, 0.35, 0.85), d: 12, fail: 3 },
    { id: 'settle', label: l('Fazer acordo', 'Settle'), hint: l('Encerra já, com um cheque — nem vitória, nem derrota.', 'Ends it now, with a cheque — neither win nor loss.'), cost: (s, c) => money(s, 2000 + (c.ref.sev ?? 40) * 50), p: () => 1, d: 0, once: true,
      fx: (_s, c) => { c.threat = 40; c.left = 0; return l('Acordo assinado: o caso sai das manchetes.', 'Settlement signed: the case leaves the headlines.'); } },
    { id: 'counter', label: l('Contra-processar', 'Countersue'), hint: l('Ousado: vira o jogo ou piora tudo.', 'Bold: turns the tables or makes it worse.'), cost: () => 0, p: (s) => clamp(0.35 + sk(s, 'legal') / 250, 0.25, 0.75), d: 25, fail: 12, harsh: true },
    PR27,
  ],
  strike: [
    { id: 'overtime', label: l('Pagar bônus aos grevistas', 'Pay the strikers a bonus'), hint: l('Certo e caro.', 'Sure and pricey.'), cost: (s) => money(s, 1200), p: () => 1, d: 18 },
    { id: 'abroad', label: l('Prensar em outra fábrica', 'Press at another plant'), hint: l('Frete e taxa de urgência.', 'Freight and rush fee.'), cost: (s) => money(s, 1800), p: () => 1, d: 25, once: true },
    { id: 'mediate', label: l('Mediar com o sindicato', 'Mediate with the union'), hint: l('Quem cuida da fabricação pesa; se der certo, os artistas gostam.', 'Your manufacturing head matters; artists like it if it works.'), cost: () => 0, p: (s) => clamp(0.45 + sk(s, 'manufacturing', 'admin') / 200, 0.3, 0.9), d: 22, fail: 4,
      fx: (s, _c, ok) => { if (ok) rep(s, 'artists', 1); return null; } },
    { id: 'stock', label: l('Vender o estoque que sobrou', 'Sell remaining stock'), hint: l('Pouco, mas certo.', 'Little, but sure.'), cost: () => 0, p: () => 1, d: 7 },
    { id: 'scab', label: l('Contratar fura-greve', 'Hire scabs'), hint: l('Rápido; o meio musical não perdoa.', 'Fast; the music world won\'t forgive it.'), cost: (s) => money(s, 400), p: () => 0.7, d: 28, fail: 14, harsh: true,
      fx: (s) => { rep(s, 'artists', -3); return l('Reputação com os artistas −3.', 'Reputation with artists −3.'); } },
  ],
  fire: [
    { id: 'claim', label: l('Acionar o seguro', 'Claim insurance'), hint: l('Só com seguro patrimonial: indenização já, prêmio sobe.', 'Property insurance only: payout now, premium rises.'), cost: () => 0, p: () => 1, d: 30, once: true,
      need: (s) => (l19b(s).ins ? null : l('Sem seguro patrimonial.', 'No property insurance.')),
      fx: (s) => { const ins = l19b(s).ins!; const v = money(s, 3000 + s.player.hq * 2000); post(s, `cr27ins:${s.week}`, v, 'other_income', 'Seguro: incêndio no estúdio'); ins.claims += 1; ins.prem = insPrem19(s); return l('A seguradora paga; o prêmio sobe.', 'The insurer pays; the premium rises.'); } },
    { id: 'rent', label: l('Alugar estúdio provisório', 'Rent a temporary studio'), hint: l('As sessões não param.', 'Sessions don\'t stop.'), cost: (s) => money(s, 900), p: () => 1, d: 15 },
    { id: 'crew', label: l('Mutirão da equipe', 'Team clean-up drive'), hint: l('De graça; une o pessoal — ou acaba em acidente.', 'Free; bonds the team — or ends in an accident.'), cost: () => 0, p: () => 0.7, d: 18, fail: 6,
      fx: (s, _c, ok) => { loyal(s, ok ? 2 : -1); return ok ? l('Equipe unida: lealdade +2.', 'A united team: loyalty +2.') : null; } },
    { id: 'probe', label: l('Perícia: foi criminoso?', 'Investigation: was it arson?'), hint: l('Achar o culpado muda a história.', 'Finding the culprit changes the story.'), cost: (s) => money(s, 400), p: () => 0.5, d: 20 },
    PR27,
  ],
  arrest: [
    { id: 'bail', label: l('Pagar a fiança', 'Post bail'), hint: l('Rua já; o seguro de pessoa-chave paga metade.', 'Out now; key-person cover pays half.'), cost: (s, c) => { const a = act(s, c); const v = money(s, 1000 + (a?.fame ?? 20) * 80); return a && ins19(s).pol.some((x) => x.act === a.id) ? Math.round(v / 2) : v; }, p: () => 1, d: 30, once: true },
    { id: 'lawyer', label: l('Criminalista', 'Criminal lawyer'), hint: l('O jurídico da casa ajuda.', 'In-house legal helps.'), cost: (s) => money(s, 1200), p: (s) => clamp(0.5 + sk(s, 'legal') / 250, 0.35, 0.9), d: 25 },
    { id: 'support', label: l('Apoio público ao artista', 'Publicly back the artist'), hint: l('O artista confia mais em você; as instituições, menos.', 'The artist trusts you more; institutions, less.'), cost: () => 0, p: () => 1, d: 8,
      fx: (s, c) => { const a = act(s, c); if (a) a.trust = clamp(a.trust + 8, 0, 100); rep(s, 'institutional', -2); return l('Confiança do ato +8; reputação institucional −2.', 'Act trust +8; institutional reputation −2.'); } },
    { id: 'distance', label: l('Distanciar o selo', 'Distance the label'), hint: l('Protege o selo; o artista não esquece.', 'Protects the label; the artist won\'t forget.'), cost: () => 0, p: () => 1, d: 35, once: true, harsh: true,
      fx: (s, c) => { const a = act(s, c); if (a) a.trust = clamp(a.trust - 20, 0, 100); rep(s, 'institutional', 2); return l('Confiança do ato −20; reputação institucional +2.', 'Act trust −20; institutional reputation +2.'); } },
    PR27,
  ],
};

export interface ActView27 { a: CrAct27; cost: number; p: number; block: L | null; policy: L | null }
/** As ações da crise com custo, chance, bloqueio e aviso de política. */
export function crisisActs27(s: GameState, c: Crisis27): ActView27[] {
  return ACTS27[c.k].map((a) => {
    const cost = a.cost(s, c);
    let block = a.need?.(s, c) ?? null;
    if (!block && a.once && c.n[a.id]) block = l('Já usado nesta crise.', 'Already used in this crisis.');
    if (!block && cost > 0 && s.player.cash < cost) block = l('Caixa insuficiente.', 'Not enough cash.');
    return { a, cost, p: a.p(s, c), block, policy: overPolicy27(s, cost) };
  });
}

/** Valor esperado de uma ação (para a equipe delegada e para a dica). */
export const evAct27 = (v: ActView27, c: Crisis27): number => (v.a.id === 'settle' ? c.threat - 45 : v.p * v.a.d - (1 - v.p) * (v.a.fail ?? 0)) - (v.cost > 0 ? 3 : 0) - (v.a.harsh ? 8 : 0);

/** Uma ação do jogador (ou da equipe, `auto`). */
export function actCrisis27(s: GameState, id: string, actId: string, auto = false): { ok: boolean; d: number; t: L } | L {
  const c = crisisById27(s, id);
  if (!c || c.done) return l('Crise encerrada.', 'Crisis over.');
  if (c.wk !== s.week) { c.wk = s.week; c.used = 0; }
  if (!auto && c.used >= c.per) return l('Sem ações nesta semana: avance a semana.', 'No actions left this week: advance the week.');
  const v = crisisActs27(s, c).find((x) => x.a.id === actId);
  if (!v) return l('Ação inválida.', 'Invalid action.');
  if (v.block) return v.block;
  c.n[actId] = (c.n[actId] ?? 0) + 1;
  if (!auto) c.used += 1;
  if (v.cost > 0) post(s, `cr27:${c.id}:${actId}:${c.n[actId]}`, -v.cost, 'misc', `Crise: ${v.a.label.pt}`);
  if (v.policy && !auto) loyal(s, -2, ['admin', 'analyst', 'legal']);
  const ok = rng(s, c.id, `${actId}:${c.n[actId]}:${s.week}`).next() < v.p;
  const d = ok ? -v.a.d : (v.a.fail ?? 0);
  c.threat = clamp(c.threat + d, 0, 100);
  const extra = v.a.fx?.(s, c, ok) ?? null;
  const t = fmtL(l('{w}{a}: {r}{x}', '{w}{a}: {r}{x}'), {
    w: auto ? l('Equipe — ', 'Staff — ') : '', a: v.a.label,
    r: ok ? fmtL(l('deu certo (ameaça −{d})', 'it worked (threat −{d})'), { d: v.a.d }) : v.a.fail ? fmtL(l('deu errado (ameaça +{d})', 'it went wrong (threat +{d})'), { d: v.a.fail }) : l('não adiantou', 'it did not help'),
    x: extra ? fmtL(l('. {e}', '. {e}'), { e: extra }) : v.policy && !auto ? fmtL(l('. Fora da política ({p}): a diretoria reclama.', '. Outside policy ({p}): the board grumbles.'), { p: v.policy }) : '',
  });
  c.log.unshift({ w: s.week, t, tone: ok ? 'good' : 'bad' });
  if (c.log.length > 30) c.log.length = 30;
  if (c.threat <= 0 || c.left <= 0) finish27(s, c);
  return { ok, d, t };
}

/** A ação que a equipe tomaria sozinha nesta crise (ou null: ninguém da área / nada dentro da política). */
export function delegatePick27(s: GameState, c: Crisis27): string | null {
  if (!s.player.staff.some((m) => CFG27[c.k].roles.includes(m.role))) return null;
  const vs = crisisActs27(s, c).filter((v) => !v.block && !v.policy && !v.a.harsh);
  if (!vs.length) return null;
  return vs.sort((a, b) => evAct27(b, c) - evAct27(a, c))[0].a.id;
}

/** Semana: quem não agiu, a equipe age; a ameaça sobe; o relógio anda. */
export function crisisWeek27(s: GameState): void {
  const st = peek(s);
  if (!st) return;
  for (const c of st.list) {
    if (c.done || c.wk === s.week) continue;
    if (c.used === 0) {
      const pick = delegatePick27(s, c);
      if (pick) actCrisis27(s, c.id, pick, true);
      else c.log.unshift({ w: s.week, t: l('Ninguém da equipe cuidou da crise nesta semana.', 'Nobody on staff handled the crisis this week.'), tone: 'bad' });
      if (c.done) continue;
    }
    c.threat = clamp(c.threat + CFG27[c.k].push, 0, 100);
    c.left -= 1; c.wk = s.week; c.used = 0;
    if (c.left <= 0 || c.threat >= 100) finish27(s, c);
  }
}
registerSimHook('week', 'crisis27', (s) => crisisWeek27(s));

export const outcomeOf27 = (threat: number): Outcome27 => (threat <= 30 ? 'won' : threat <= 65 ? 'partial' : 'lost');

/** Fim do relógio: o desfecho cai nos sistemas de sempre. */
export function finish27(s: GameState, c: Crisis27): void {
  if (c.done) return;
  const o = outcomeOf27(c.threat);
  const why: L[] = [];
  const a = act(s, c);
  const delay = (n: number) => { let k = 0; for (const p of s.pendingReleases) if (playerActs(s).includes(p.actId) && p.week - s.week <= 8) { p.week += n; k++; } return k; };
  switch (c.k) {
    case 'bankrupt':
      if (o === 'won') { s.player.insolvencyMonths = Math.max(0, s.player.insolvencyMonths - 1); rep(s, 'commercial', 1); why.push(l('Os credores dão um mês de fôlego: a contagem da insolvência recua.', 'Creditors grant a month of grace: the insolvency count steps back.')); }
      else if (o === 'lost') { if (s.player.cash < 0) s.player.insolvencyMonths += 1; rep(s, 'institutional', -2); why.push(l('Os credores perdem a paciência: a insolvência chega um mês antes.', 'Creditors lose patience: insolvency comes a month sooner.')); }
      else why.push(l('Os credores esperam para ver.', 'Creditors wait and see.'));
      break;
    case 'lawsuit':
      if (o === 'won') { rep(s, 'institutional', 1); why.push(l('Caso arquivado: reputação institucional +1.', 'Case dismissed: institutional reputation +1.')); }
      else if (o === 'lost') { const v = money(s, 2500 + (c.ref.sev ?? 40) * 80); post(s, `cr27dmg:${c.id}`, -v, 'legal', 'Crise: indenização do processo'); rep(s, 'institutional', -2); why.push(l('Derrota no tribunal: indenização e reputação institucional −2.', 'Lost in court: damages and institutional reputation −2.')); }
      else { post(s, `cr27fee:${c.id}`, -money(s, 800), 'legal', 'Crise: custas do processo'); why.push(l('Empate técnico: só as custas.', 'A draw: court costs only.')); }
      break;
    case 'strike':
      if (o === 'won') { loyal(s, 1, ['manufacturing']); why.push(l('Os discos saem no prazo.', 'Records ship on time.')); }
      else if (o === 'lost') { const k = delay(4); rep(s, 'commercial', -1); why.push(fmtL(l('{n} lançamento(s) atrasam 4 semanas; reputação comercial −1.', '{n} release(s) slip 4 weeks; commercial reputation −1.'), { n: k })); }
      else { const k = delay(1); why.push(fmtL(l('{n} lançamento(s) atrasam 1 semana.', '{n} release(s) slip 1 week.'), { n: k })); }
      break;
    case 'fire':
      if (o === 'won') { loyal(s, 2); rep(s, 'artistic', 1); why.push(l('O estúdio volta a funcionar e a equipe sai mais unida.', 'The studio is back and the team is closer.')); }
      else if (o === 'lost') { post(s, `cr27fire:${c.id}`, -money(s, 2000), 'misc', 'Crise: prejuízo do incêndio'); for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) { const p = s.persons[pid]; if (p?.alive) p.morale = clamp(p.morale - 3, 0, 100); } why.push(l('Sessões perdidas e equipamento queimado: prejuízo e moral do elenco −3.', 'Lost sessions and burnt gear: losses and roster morale −3.')); }
      else { post(s, `cr27fire:${c.id}`, -money(s, 600), 'misc', 'Crise: reparos'); why.push(l('Reparos pagos; vida que segue.', 'Repairs paid; life goes on.')); }
      break;
    case 'arrest':
      if (a) {
        if (o === 'won') { a.trust = clamp(a.trust + 5, 0, 100); a.momentum = clamp(a.momentum + 5, 0, 100); why.push(l('Solto e aplaudido: confiança +5, momento +5.', 'Released to applause: trust +5, momentum +5.')); }
        else if (o === 'lost') { a.trust = clamp(a.trust - 6, 0, 100); a.momentum = clamp(a.momentum - 12, 0, 100); rep(s, 'institutional', -2); if (c.ref.pid) addStress(s, c.ref.pid, 15, l('Prisão', 'Arrest')); why.push(l('O caso se arrasta: momento −12, confiança −6, reputação institucional −2.', 'The case drags on: momentum −12, trust −6, institutional reputation −2.')); }
        else { a.momentum = clamp(a.momentum - 3, 0, 100); why.push(l('Liberado com condições: momento −3.', 'Released on conditions: momentum −3.')); }
      }
      break;
  }
  c.done = { o, w: s.week, why };
  c.log.unshift({ w: s.week, t: fmtL(l('Fim do relógio: {o}.', 'Clock ran out: {o}.'), { o: OUT_NAME27[o] }), tone: o === 'won' ? 'good' : o === 'lost' ? 'bad' : 'info' });
  emitFact(s, { kind: 'crisis27', actors: ['player', ...(c.ref.act ? [c.ref.act] : [])], severity: o === 'lost' ? 45 : 25, visibility: 'public', tags: [c.k, o, o === 'won' ? 'good' : o === 'lost' ? 'bad' : 'crisis'], src: 'crisis27',
    text: fmtL(l('{t}: {o} ({w}).', '{t}: {o} ({w}).'), { t: c.title, o: OUT_NAME27[o], w: why[0] ?? l('', '') }) });
}
export const OUT_NAME27: Record<Outcome27, L> = { won: l('crise contornada', 'crisis averted'), partial: l('saída pela metade', 'half a way out'), lost: l('a crise venceu', 'the crisis won') };
/** a política (opinião média dos sócios) para a interface */
export const partnersMood27 = (s: GameState): number | null => { const inv = capital(s).investors; return inv.length ? Math.round(inv.reduce((t, x) => t + opinion(x), 0) / inv.length) : null; };
