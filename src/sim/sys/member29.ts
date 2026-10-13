// R29 (integrante) — OFERTA A UM INTEGRANTE ESPECÍFICO. Pedido do autor: "permita tentar contratar não só a banda, mas
// integrantes específicos da banda, seja oferecendo uma carreira solo, integrar em uma banda existente, dentre outras".
// Cada opção usa um mecanismo que já existia (nada de contrato paralelo — docs/act27.md, um caminho só):
//  • Carreira solo no seu selo: o ato solo nasce como a carreira solo paralela (dynasty.soloActFrom29), SEM dono, e é
//    assinado pela proposta de sempre (Fazer proposta → mesa r27 / proposta única → makeOffer → acceptOffer). Enquanto a
//    proposta corre, a pessoa segue na banda (como na carreira solo paralela). A chance é a de evaluateOffer + os fatores
//    da pessoa (gancho registerOfferMod abaixo). Assinou (com você — ou com um rival que cobriu): a pessoa SAI da banda pela
//    saída do lineup16 (departNpc16: exitMember20, ex-integrante, substituto do mercado, segue menor ou acaba) e o solo leva
//    fama e parte dos fãs. Sem acordo: o solo-proposta some e a banda fica sabendo (confiança cai um pouco).
//  • Entrar numa banda sua (lineup16.joinBand; substituir = leaveBand16 do substituído) — respeita a função na banda.
//  • Músico de sessão para um ato seu (session19: hireAce19, 6 meses, com crédito) — continua na banda.
//  • Projeto paralelo / supergrupo com o líder de um ato seu (bonds9 formBond 'super', liberação de feats8) — continua na banda.
//  • Equipe do selo (produtor / A&R, quem tem a habilidade) — deixa a banda; compositor(a) em segredo (writers19 ghostwriter).
//  • Participação num lançamento seu (feats8) — a interface abre o feat negociado de sempre com A PESSOA como convidada
//    (sys/featp29: só ela, sem a banda; liberação do selo da banda e reação dos colegas).
// Selo rival: rescisão paga ao selo (mágoa pequena) ou aliciamento sem pagar (mágoa grande, rivalidade e risco de processo
// por contrato — business.fileLawsuit). Modo exato: interferir marca a banda como história alterada (history15).
// Determinístico: Rng.fromSeed(semente|member29v1|…) próprio; nunca o fluxo compartilhado. Fatos e memórias alimentam o
// Diário, os avisos e as cenas r29 ('join' pela entrada num ato seu, 'steal' pela memória 'poach', 'split' se acabar).

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { staffRoleById } from '../../data/rules';
import { hqCaps } from '../branches';
import { fileLawsuit } from '../business';
import { defaultOffer, evaluateOffer, expectedAdvance } from '../contracts';
import { soloActFrom29 } from '../dynasty';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { cashWhy20, freeCash20 } from '../oblig20';
import type { Act, GameState, Label, Person } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember, staffSkill } from '../util';
import { actsNow27 } from '../tickcache27';
import { actsTouched17 } from '../actidx17';
import { admiration, bondCost, formBond } from './bonds9';
import { personFame } from './fame15';
import { clearance, featSongs } from './feats8';
import { featPersonBlock29 } from './featp29';
import { departNpc16, freePool, joinBand, l16, leaveBand16, newBand16, pressure16, WHY16 } from './lineup16';
import { careerActs29 } from './connect29';
import { rw } from './realworld';
import { opinionOf } from './persona13';
import { grudge27, temper27 } from './rivals27';
import { aceFee19, FREE19, hireAce19, ses19, type Inst19 } from './session19';
import { hireGhost19, wr19 } from './writers19';

export type MoKind29 = 'solo' | 'join' | 'session' | 'side' | 'staff' | 'ghost' | 'feat' | 'band';
/** free = banda sem selo · buyout = paga a rescisão ao selo rival · tamper = alicia sem pagar */
export type MoMode29 = 'free' | 'buyout' | 'tamper';
export const MO29_RNG = 'member29v1';

interface Shell29 { pid: string; from: string; w: number; lb?: string; mode: MoMode29; buy: number }
export interface Mo29Log { w: number; y: number; pid: string; k: MoKind29; ok: boolean; t: L }
export interface Mo29State {
  /** solo-proposta em negociação: ato → de onde veio */
  sh: Record<string, Shell29>;
  /** recusa recente: `${pessoa}|${tipo}` → semana em que dá para tentar de novo */
  cd: Record<string, number>;
  /** pessoa → id na equipe (saiu da banda para trabalhar no selo) */
  staff: Record<string, string>;
  n: number;
  log: Mo29Log[];
}
declare module '../ext4' { interface Ext4 { mo29: Mo29State } }
const fresh = (): Mo29State => ({ sh: {}, cd: {}, staff: {}, n: 0, log: [] });
registerExt4('mo29', fresh);
export function mo29(s: GameState): Mo29State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.mo29 ??= fresh()) as Mo29State;
  st.sh ??= {}; st.cd ??= {}; st.staff ??= {}; st.n ??= 0; st.log ??= [];
  return st;
}
const rng29 = (s: GameState, part: string): Rng => Rng.fromSeed(`${s.config.seed}|${MO29_RNG}|${part}|${s.week}|${mo29(s).n}`);
const logIt = (s: GameState, pid: string, k: MoKind29, ok: boolean, t: L): void => {
  const st = mo29(s);
  st.log.unshift({ w: s.week, y: s.year, pid, k, ok, t });
  if (st.log.length > 30) st.log.length = 30;
};
const T = (pt: string, en: string, p: Record<string, string | number | L> = {}): L => fmtL(l(pt, en), p);
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const live = (a: Act): boolean => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';
const mineAct = (a: Act): boolean => a.owner === 'player' || !!a.playerBand;
const front = (a: Act, p: Person): boolean => a.leaderId === p.id || p.role === 'vocal' || p.role === 'mc';

// ---------------------------------------------------------------- quem, de onde

/** A banda atual da pessoa (ativa, 2+ integrantes, não é solo-proposta); a de maior fama se houver mais de uma. */
export function bandOf29(s: GameState, pid: string): Act | undefined {
  const sh = mo29(s).sh;
  let best: Act | undefined;
  for (const a of actsNow27(s)) if (!sh[a.id] && live(a) && a.members.length >= 2 && a.members.includes(pid) && (!best || a.fame > best.fame)) best = a;
  return best;
}
/** Ato em atividade da pessoa, de qualquer tamanho (carreira solo incluída), fora os solos-proposta. */
const liveActOf = (s: GameState, pid: string): Act | undefined => actsNow27(s).find((a) => !mo29(s).sh[a.id] && live(a) && a.members.includes(pid));
const ageOf = (s: GameState, p: Person): number => s.year - p.born;
/** R29 (sem banda): músico(a) sem ato em atividade — pessoa livre da formação real (rw.free29), músico livre do lineup16,
 *  quem viu a banda acabar ou se aposentou. Viva, não é você, 15+ anos, fora da sua equipe. */
export function freeAgent29(s: GameState, pid: string): boolean {
  const p = s.persons[pid];
  return !!p && p.alive && !p.isPlayer && ageOf(s, p) >= 15 && !mo29(s).staff[pid] && !liveActOf(s, pid);
}
/** Molde de gênero/cidade para quem não tem banda: o ato mais recente da carreira (connect29); senão o de onde saiu
 *  (lineup16); senão a banda real de referência (rw.free29 — só molde, nunca apresentada como dela). */
export function refAct29(s: GameState, pid: string): Act | undefined {
  const end = (x: { segs: { from: number; to?: number }[] }) => x.segs[x.segs.length - 1]?.to ?? 9999;
  const ca = careerActs29(s, pid).filter((x) => !mo29(s).sh[x.act.id]).sort((a, b) => end(b) - end(a));
  return ca[0]?.act ?? s.acts[l16(s).free[pid]?.[1] ?? ''] ?? s.acts[rw(s).free29?.[pid] ?? ''];
}
/** Nota da história real (free29): referência curta, sem dizer que a banda é dela nesta partida. */
export function realNote29(s: GameState, pid: string): L | null {
  const a = s.acts[rw(s).free29?.[pid] ?? ''];
  return a ? T('Na história real tocou com {a} (nesta partida, sem banda).', 'In real history they played with {a} (no band in this run).', { a: a.name }) : null;
}
/** Selo rival dono do contrato da banda (ou nada: banda livre). */
export function rivalOf29(s: GameState, band: Act): Label | undefined {
  const lb = band.owner && band.owner !== 'player' ? s.labels[band.owner] : undefined;
  return lb && lb.active ? lb : undefined;
}
/** Rescisão: a fatia da pessoa no contrato da banda (adiantamento esperado ÷ integrantes × tempo que falta). */
export function buyout29(s: GameState, band: Act): number {
  const c = band.contractId ? s.contracts[band.contractId] : undefined;
  const left = c ? clamp((c.endWeek - s.week) / Math.max(1, c.endWeek - c.startWeek), 0.15, 1) : 0.5;
  const v = expectedAdvance(s, band) / Math.max(2, band.members.length) * (0.6 + left) + 1500;
  return Math.round(money(s, v) / 10000) * 10000;
}
const pendingFor = (s: GameState, pid: string): string | undefined => Object.entries(mo29(s).sh).find(([, x]) => x.pid === pid)?.[0];

/** Bloqueio comum (vale para todas as opções): morta, é você, já é seu, sem banda, proposta em andamento. */
export function memberBlock29(s: GameState, pid: string): L | null {
  const p = s.persons[pid];
  if (!p) return l('Pessoa desconhecida.', 'Unknown person.');
  if (!p.alive) return l('Faleceu.', 'Has passed away.');
  if (p.isPlayer) return l('É você.', 'That\'s you.');
  if (mo29(s).staff[pid]) return l('Já trabalha na sua equipe.', 'Already works on your staff.');
  if (actsNow27(s).some((a) => a.members.includes(pid) && mineAct(a) && live(a))) return l('Já está no seu elenco.', 'Already on your roster.');
  if (pendingFor(s, pid)) return l('Já há uma proposta em andamento para esta pessoa: veja na Caixa/Mercado.', 'An offer to this person is already in progress: see Inbox/Market.');
  if (!bandOf29(s, pid) && !freeAgent29(s, pid)) {
    if (ageOf(s, p) < 15) return l('Jovem demais: ainda não está em atividade.', 'Too young: not active yet.');
    return l('Já tem carreira solo em atividade: use "Fazer proposta".', 'Already has an active solo career: use "Make an offer".');
  }
  return null;
}
const cdBlock = (s: GameState, pid: string, k: MoKind29): L | null => {
  const until = mo29(s).cd[`${pid}|${k}`];
  return until !== undefined && until > s.week ? T('Recusou há pouco: espere {n} semana(s).', 'Turned it down recently: wait {n} week(s).', { n: until - s.week }) : null;
};
const LABEL_ONLY = l('Jogando como artista, quem contrata para selo é um selo.', 'Playing as an artist, label deals are a label\'s job.');

// ---------------------------------------------------------------- fatores da pessoa

export interface Factor29 { t: L; v: number }
/** Fatores pessoais no placar de evaluateOffer (0,1 ≈ ±20 pontos percentuais perto do meio). */
export function factors29(s: GameState, p: Person, band: Act | undefined, k: MoKind29, mode: MoMode29): Factor29[] {
  const out: Factor29[] = [];
  const add = (t: L, v: number) => { if (Number.isFinite(v) && Math.abs(v) >= 0.004) out.push({ t, v }); };
  const leaving = !!band && (k === 'solo' || k === 'join' || k === 'staff');
  if (!band) {
    // R29 (sem banda): quem está parado quer voltar a tocar; a fama e a habilidade dão confiança; a idade pesa
    add(l('Sem banda: quer voltar a tocar', 'No band: wants to play again'), k === 'staff' ? 0.04 : 0.06);
    if (k === 'solo' || k === 'join') {
      const pf = personFame(s, p.id).v;
      add(T('Fama própria ({f})', 'Own fame ({f})', { f: Math.round(pf) }), (pf - 15) / 300);
      const sk = Math.max(p.skills.voice, p.skills.instr, p.skills.comp);
      add(T('Habilidade ({v})', 'Skill ({v})', { v: Math.round(sk) }), (sk - 50) / 400);
    }
    const age = ageOf(s, p);
    if (age > 45) add(T('Idade ({a})', 'Age ({a})', { a: age }), -(age - 45) / 150);
    add(T('Moral ({m})', 'Morale ({m})', { m: Math.round(p.morale) }), (p.morale - 50) / 800);
  }
  if (band && leaving) {
    const pr = pressure16(s, band, p); // a mesma pressão que faz NPCs saírem (lineup16)
    if (pr.w) add(T('Pressão para sair ({w})', 'Pressure to leave ({w})', { w: WHY16[pr.why] }), Math.min(0.18, pr.w * 0.06));
    const mates = band.members.filter((id) => id !== p.id && s.persons[id]?.alive);
    const avg = mates.length ? mates.reduce((t, id) => t + (p.rel[id] ?? 0), 0) / mates.length : 0;
    add(T('Relação com a banda (média {v})', 'Bond with the band (avg {v})', { v: Math.round(avg) }), -avg / 400);
    const lead = band.leaderId && band.leaderId !== p.id ? s.persons[band.leaderId] : undefined;
    if (lead && (p.rel[lead.id] ?? 0) < -25) add(T('Briga com o líder ({n})', 'Feud with the leader ({n})', { n: lead.name }), 0.05);
    add(T('Ressentimento ({v})', 'Resentment ({v})', { v: Math.round(p.resentment) }), p.resentment / 700);
    add(T('Sucesso da banda (fama {f})', 'Band success (fame {f})', { f: Math.round(band.fame) }), -(band.fame - 30) / 350);
    const pf = personFame(s, p.id).v;
    if (pf > band.fame + 5) add(l('Fama própria maior que a da banda', 'Own fame bigger than the band\'s'), 0.05);
    if (band.members.length !== 3) add(T('Fatia de cada um ({n} integrantes)', 'Each one\'s share ({n} members)', { n: band.members.length }), (band.members.length - 3) * 0.015);
    if (p.traits.includes('loyal')) add(l('Leal à banda', 'Loyal to the band'), -0.08);
    add(T('Moral ({m})', 'Morale ({m})', { m: Math.round(p.morale) }), (50 - p.morale) / 600);
  }
  if (k === 'solo') {
    if (p.goal === 'solo') add(l('Sonha com a carreira solo', 'Dreams of a solo career'), 0.12);
    if (p.ambition === 'fame' || p.ambition === 'status') add(l('Ambição: fama', 'Ambition: fame'), 0.05);
    if (band) add(front(band, p) ? l('É a voz/rosto da banda', 'Is the band\'s voice/face') : l('Não é a frente da banda', 'Not the band\'s frontperson'), front(band, p) ? 0.03 : -0.04);
    else add(p.role === 'vocal' || p.role === 'mc' ? l('Canta: dá conta de um solo', 'Sings: can carry a solo act') : l('Não canta: solo instrumental', 'Doesn\'t sing: an instrumental solo act'), p.role === 'vocal' || p.role === 'mc' ? 0.03 : -0.03);
  }
  const lb = band ? rivalOf29(s, band) : undefined;
  if (lb && leaving) {
    if (mode === 'tamper') add(T('Contrato com {lb}: sem rescisão, medo de processo', 'Signed to {lb}: no buyout, fear of a lawsuit', { lb: lb.name }), -0.07);
    else add(T('Rescisão paga a {lb}', 'Buyout paid to {lb}', { lb: lb.name }), 0.02);
  }
  return out;
}
const F = (t: L, v: number): Factor29 => ({ t, v });
const sum = (fs: Factor29[]): number => fs.reduce((t, x) => t + x.v, 0);
const logit = (x: number): number => 1 / (1 + Math.exp(-x * 8));
const sg = (v: number): string => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 200))}`;
export interface Chance29 { p: number; why: L[] }
const chanceOf = (base: number, baseWhy: L, fs: Factor29[]): Chance29 => ({
  p: clamp(logit(base + sum(fs)), 0.03, 0.97),
  why: [baseWhy, ...fs.map((f) => fmtL(l('{t}: {v}', '{t}: {v}'), { t: f.t, v: sg(f.v) }))],
});

// ---------------------------------------------------------------- 1) carreira solo (a proposta de sempre)

const soloFame = (s: GameState, band: Act | undefined, p: Person): number => band ? Math.min(band.fame, Math.max(band.fame * (front(band, p) ? 0.45 : 0.25), personFame(s, p.id).v * 0.6)) : clamp(personFame(s, p.id).v * 0.6, 0, 40);

// a chance da proposta = evaluateOffer + fatores da pessoa (só para o solo-proposta)
registerOfferMod('member29', (s, act) => {
  const sh = (s.x4 as unknown as { mo29?: Mo29State }).mo29?.sh?.[act.id];
  if (!sh) return null;
  const p = s.persons[sh.pid], band = sh.from ? s.acts[sh.from] : undefined;
  if (!p || (sh.from && !band)) return null;
  const fs = factors29(s, p, band, 'solo', sh.mode);
  const top = [...fs].sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3).map((f) => `${f.t.pt} ${sg(f.v)}`).join('; ');
  const topEn = [...fs].sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3).map((f) => `${f.t.en} ${sg(f.v)}`).join('; ');
  return { delta: sum(fs), reason: band ? l(`Deixar ${band.name}: ${top || 'neutro'}`, `Leaving ${band.name}: ${topEn || 'neutral'}`) : l(`${p.name}, sem banda: ${top || 'neutro'}`, `${p.name}, no band: ${topEn || 'neutral'}`) };
});

/** Chance estimada da proposta padrão (sem criar nada): evaluateOffer num solo virtual + fatores da pessoa. */
export function soloChance29(s: GameState, pid: string, mode: MoMode29): Chance29 {
  const p = s.persons[pid], band = bandOf29(s, pid), mold = band ?? refAct29(s, pid);
  if (!p || !mold) return { p: 0, why: [] };
  const v: Act = { ...structuredClone(mold), id: `${mold.id}~mo29`, playerBand: undefined, trust: band ? mold.trust : 50, name: p.name, members: [p.id], leaderId: p.id, owner: null, contractId: undefined, status: 'emerging', fame: soloFame(s, band, p) };
  let score = 0.58;
  try { score = evaluateOffer(s, v, defaultOffer(s, v)).score; } catch { /* hooks que exigem o ato no mundo: placar neutro */ }
  return chanceOf(score - 0.58, T('Proposta padrão (adiantamento esperado para fama {f})', 'Standard offer (expected advance for fame {f})', { f: Math.round(v.fame) }), factors29(s, p, band, 'solo', mode));
}

/** Abre a proposta de carreira solo: cria o solo-proposta (sem dono, a pessoa segue na banda) para a mesa de sempre. */
export function startMemberSolo29(s: GameState, pid: string, mode: MoMode29): { actId: string } | L {
  if (s.config.role === 'artist') return LABEL_ONLY;
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'solo');
  if (b0) return b0;
  const p = s.persons[pid], band = bandOf29(s, pid);
  const mold = band ?? refAct29(s, pid); // sem banda: o molde é só gênero/cidade (refAct29), sem saída nem banda que fica
  if (!mold) return l('Sem referência de gênero e cidade para montar o solo.', 'No genre/city reference to build the solo act.');
  const lb = band ? rivalOf29(s, band) : undefined;
  const m: MoMode29 = lb ? (mode === 'free' ? 'buyout' : mode) : 'free';
  const buy = band && lb && m === 'buyout' ? buyout29(s, band) : 0;
  if (buy && freeCash20(s) < buy) return cashWhy20(s, buy, l('Caixa insuficiente para a rescisão.', 'Not enough cash for the buyout.'));
  const st = mo29(s);
  st.n++;
  const solo = soloActFrom29(s, rng29(s, `shell:${pid}`), mold, p, { owner: null });
  solo.formed = s.year; solo.debutYear = s.year; solo.cash = 0; solo.hiatusUntil = undefined;
  solo.fame = soloFame(s, band, p);
  solo.fans = { casual: 0, active: 0, core: 0 };
  if (!band) { delete s.soloOf[solo.id]; solo.trust = 50; solo.playerBand = undefined; solo.momentum = 30; } // não é solo "de" banda nenhuma
  st.sh[solo.id] = { pid, from: band?.id ?? '', w: s.week, lb: lb?.id, mode: m, buy };
  const k = band ? s.knowledge[band.id] : undefined;
  if (k) s.knowledge[solo.id] = { ...structuredClone(k), actId: solo.id, stage: 'negotiation', updatedWeek: s.week };
  return { actId: solo.id };
}

function discard(s: GameState, id: string, sh: Shell29): void {
  const a = s.acts[id];
  if (a && (a.songs.length || a.releases.length)) { a.status = 'split'; a.careerEnd = s.year; } // já tem obra (proposta que demorou semanas): vira solo encerrado, nada fica órfão
  else { delete s.acts[id]; delete s.soloOf[id]; delete s.delegated[id]; delete s.knowledge[id]; }
  actsTouched17(s);
  delete (s.agenda as Record<string, unknown>)[id];
  s.offers = s.offers.filter((o) => o.actId !== id);
  const ng = (s.x4 as unknown as { nego27?: Record<string, unknown> }).nego27;
  if (ng) delete ng[id];
  delete mo29(s).sh[id];
  // a banda fica sabendo da sondagem; a pessoa não topou agora
  const band = s.acts[sh.from], p = s.persons[sh.pid];
  if (band) band.trust = clamp(band.trust - 3, 0, 100);
  mo29(s).cd[`${sh.pid}|solo`] = s.week + 8;
  if (p) logIt(s, p.id, 'solo', false, T('{p} não fechou a carreira solo; segue em {a}.', '{p} did not close the solo deal; stays in {a}.', { p: p.name, a: band?.name ?? '?' }));
}

/** A banda que perdeu alguém reage: moral, confiança em você e momento caem. */
function bandReact(s: GameState, band: Act, p: Person, hard: boolean): void {
  for (const id of band.members) { const q = s.persons[id]; if (q && q.id !== p.id && q.alive) q.morale = clamp(q.morale - (hard ? 8 : 4), 0, 100); }
  band.trust = clamp(band.trust - (hard ? 10 : 4), 0, 100);
  band.momentum = clamp(band.momentum - (hard ? 5 : 2), 0, 100);
}

/** Selo rival: rescisão paga (mágoa pequena) ou aliciamento (mágoa, rivalidade e risco de processo por contrato). */
function rivalHit(s: GameState, r: Rng, lb: Label | undefined, mode: MoMode29, buy: number, p: Person, band: Act, actId: string): L | null {
  if (!lb) return null;
  if (mode === 'buyout' && buy > 0 && s.player.cash >= buy) {
    post(s, `mo29buy:${p.id}:${s.week}`, -buy, 'legal', `Rescisão: ${p.name} (${lb.name})`);
    lb.cash += buy;
    grudge27(s, lb.id, 6, T('comprou o contrato de {p} ({a}) por {v}', 'bought out {p}\'s contract ({a}) for {v}', { p: p.name, a: band.name, v: usd(buy) }));
    return T('Rescisão de {v} paga a {lb}.', '{v} buyout paid to {lb}.', { v: usd(buy), lb: lb.name });
  }
  grudge27(s, lb.id, 18, T('aliciou {p}, sob contrato com {a}', 'poached {p}, under contract with {a}', { p: p.name, a: band.name }));
  s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 10;
  const sue = clamp(0.35 + (temper27(s, lb) === 'vengeful' ? 0.2 : temper27(s, lb) === 'proud' ? 0.1 : 0) - staffSkill(s, 'legal') / 400, 0.1, 0.8);
  if (r.chance(sue)) {
    fileLawsuit(s, { kind: 'contract', plaintiff: lb.name, defendant: 'player', actId, claim: Math.round(buyout29(s, band) * 1.5), odds: clamp(0.3 + staffSkill(s, 'legal') / 400, 0.1, 0.8),
      text: T('{lb} processa {c} por aliciar {p}, sob contrato com {a}.', '{lb} sues {c} for poaching {p}, under contract with {a}.', { lb: lb.name, c: s.config.companyName, p: p.name, a: band.name }) });
    return T('{lb} entrou na justiça (aliciamento).', '{lb} went to court (tampering).', { lb: lb.name });
  }
  return T('{lb} não esquece o aliciamento.', '{lb} won\'t forget the poaching.', { lb: lb.name });
}
const alter = (s: GameState, band: Act): void => { if (band.catalogNo) (s.flags as Record<string, number>)[`h15alt:${band.id}`] = 1; };
const why16 = (s: GameState, band: Act, p: Person) => { const pr = pressure16(s, band, p); return pr.w ? pr.why : 'left'; };

function finalizeSolo(s: GameState, id: string, sh: Shell29): Settled29 {
  const solo = s.acts[id], p = s.persons[sh.pid], band = s.acts[sh.from];
  delete mo29(s).sh[id];
  const r = rng29(s, `solo:${id}`);
  const mine = solo.owner === 'player';
  const lb = sh.lb ? s.labels[sh.lb] : undefined;
  let extra: L | null = null;
  if (band && p && band.members.includes(p.id)) {
    const fr = front(band, p);
    solo.fame = Math.max(solo.fame, band.fame * (fr ? 0.45 : 0.25));
    solo.fans.casual += Math.round(band.fans.casual * (fr ? 0.12 : 0.05));
    solo.fans.active += Math.round(band.fans.active * (fr ? 0.08 : 0.03));
    solo.fans.core += Math.round(band.fans.core * (fr ? 0.06 : 0.02));
    band.fans.core = Math.round(band.fans.core * (fr ? 0.94 : 0.98));
    alter(s, band);
    departNpc16(s, r, band, p, 'solo'); // lineup16: saída, ex-integrante, substituto do mercado / segue menor / acaba
    bandReact(s, band, p, mine);
    if (mine) extra = rivalHit(s, r, lb, sh.mode, sh.buy, p, band, id);
  }
  l16(s).boost[id] = 1;
  delete l16(s).free[sh.pid]; // tem carreira de novo: sai do mercado de músicos livres
  if (solo.status === 'emerging' && solo.fame > 5) solo.status = 'active';
  const by = mine ? s.config.companyName : s.labels[solo.owner ?? '']?.name ?? '?';
  const txt = sh.from
    ? T('{p} deixa {a} e começa carreira solo com {c}.', '{p} leaves {a} and starts a solo career with {c}.', { p: p?.name ?? '?', a: band?.name ?? '?', c: by })
    : T('{p}, sem banda, começa carreira solo com {c}.', '{p}, without a band, starts a solo career with {c}.', { p: p?.name ?? '?', c: by });
  remember(s, mine && lb ? 'poach' : 'solo', txt, { actId: id, pid: sh.pid, important: true });
  emitFact(s, { kind: 'member_solo', actors: [mine ? 'player' : solo.owner ?? '', sh.pid, id, band?.id ?? ''], severity: clamp(25 + (band?.fame ?? 0) / 2, 25, 70), visibility: 'public', tags: ['member29', 'solo', ...(lb && mine ? ['poach'] : [])], text: txt, src: 'member29' });
  if (!mine) notify(s, txt, 'bad');
  const out = extra ? T('{t} {e}', '{t} {e}', { t: txt, e: extra }) : txt;
  if (p) logIt(s, p.id, 'solo', mine, out);
  return { t: out, ok: mine, actId: id };
}

/** Fecha os solos-proposta: assinados (por você ou por um rival) viram a saída da banda; sem acordo, somem.
 *  Chamado ao fechar a mesa/proposta e toda semana (pensando, contraproposta, prazo de 8 semanas). */
export interface Settled29 { t: L; ok: boolean; actId: string }
export function settleMember29(s: GameState): Settled29[] {
  const st = (s.x4 as unknown as { mo29?: Mo29State }).mo29;
  if (!st?.sh || !Object.keys(st.sh).length) return [];
  const out: Settled29[] = [];
  for (const [id, sh] of Object.entries(st.sh)) {
    const a = s.acts[id];
    if (!a) { delete st.sh[id]; continue; }
    if (a.owner) { out.push(finalizeSolo(s, id, sh)); continue; }
    const open = s.offers.some((o) => o.actId === id && (o.status === 'pending' || o.status === 'counter'));
    const p = s.persons[sh.pid];
    const gone = sh.from ? !s.acts[sh.from]?.members.includes(sh.pid) : actsNow27(s).some((x) => x.id !== id && live(x) && x.members.includes(sh.pid)); // sem banda: arrumou outro ato no meio
    if (!open || s.week - sh.w > 8 || !p?.alive || gone) discard(s, id, sh);
  }
  return out;
}
export const shells29 = (s: GameState): string[] => Object.keys(mo29(s).sh);

// ---------------------------------------------------------------- 2) entrar numa banda sua

const ROLE_NAME: Record<string, L> = {
  vocal: l('vocal', 'vocals'), guitar: l('guitarra', 'guitar'), bass: l('baixo', 'bass'), drums: l('bateria', 'drums'), keys: l('teclados', 'keys'),
  horns: l('sopros', 'horns'), dj: l('DJ', 'DJ'), producer: l('produção', 'production'), mc: l('MC', 'MC'), strings: l('cordas', 'strings'), synthetic: l('voz sintética', 'synthetic voice'),
};
export const roleName29 = (r: string): L => ROLE_NAME[r] ?? l(r, r);
/** Bandas suas que podem receber alguém (formação ativa com 2+ pessoas ou a sua própria banda). */
export const myBands29 = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && live(a) && !mo29(s).sh[a.id] && (a.members.length >= 2 || !!a.playerBand)).sort((a, b) => b.fame - a.fame);
/** Luvas para mudar de banda (centavos). */
export const joinFee29 = (s: GameState, pid: string): number => Math.round(money(s, 1500 + personFame(s, pid).v * 60) / 10000) * 10000;

/** Por que a pessoa não cabe nesta banda (função, tamanho) — ou null. */
export function joinFit29(s: GameState, pid: string, actId: string, replace?: string): L | null {
  const p = s.persons[pid], a = s.acts[actId];
  if (!p || !a || !mineAct(a)) return l('Escolha uma banda sua.', 'Pick one of your bands.');
  if (replace) {
    const o = s.persons[replace];
    if (!o || !a.members.includes(replace)) return l('Integrante não está mais na banda.', 'Member is no longer in the band.');
    if (o.isPlayer) return l('Não dá para substituir você mesmo.', 'You can\'t replace yourself.');
    return o.role === p.role ? null : T('{o} toca {r}; {p} toca {q}.', '{o} plays {r}; {p} plays {q}.', { o: o.name, r: roleName29(o.role), p: p.name, q: roleName29(p.role) });
  }
  if (a.members.length >= 6) return T('{a} já tem 6 integrantes.', '{a} already has 6 members.', { a: a.name });
  const same = a.members.map((id) => s.persons[id]).find((q) => q?.alive && q.role === p.role);
  return same ? T('{a} já tem {r} ({o}): use "Substituir".', '{a} already has {r} ({o}): use "Replace".', { a: a.name, r: roleName29(p.role), o: same.name }) : null;
}

export function joinChance29(s: GameState, pid: string, actId: string, mode: MoMode29): Chance29 {
  const p = s.persons[pid], band = bandOf29(s, pid), T0 = s.acts[actId];
  if (!p || !T0) return { p: 0, why: [] };
  const fs = factors29(s, p, band, 'join', mode);
  const mold = band ?? refAct29(s, pid);
  if (band) fs.push(F(T('{a} (fama {f}) × {b} (fama {g})', '{a} (fame {f}) × {b} (fame {g})', { a: T0.name, f: Math.round(T0.fame), b: band.name, g: Math.round(band.fame) }), (T0.fame - band.fame) / 200));
  else fs.push(F(T('Fama de {a} ({f})', 'Fame of {a} ({f})', { a: T0.name, f: Math.round(T0.fame) }), (T0.fame - personFame(s, pid).v) / 250));
  if (mold) fs.push(F(familyOf(T0.genre) === familyOf(mold.genre) ? l('Mesmo universo musical', 'Same musical world') : l('Outro universo musical', 'A different musical world'), familyOf(T0.genre) === familyOf(mold.genre) ? 0.03 : -0.08));
  fs.push(F(T('Reputação com artistas ({r})', 'Reputation with artists ({r})', { r: Math.round(s.player.reputation.artists) }), (s.player.reputation.artists - 50) / 500));
  return chanceOf(0.05, l('Base: proposta de troca de banda com luvas', 'Base: band-switch offer with a signing fee'), fs.filter((f) => Math.abs(f.v) >= 0.004));
}

export interface MoOut29 { ok: boolean; text: L; actId?: string }
const fail = (text: L): MoOut29 => ({ ok: false, text });
function refuse(s: GameState, pid: string, k: MoKind29, band: Act | undefined, text: L): MoOut29 {
  mo29(s).cd[`${pid}|${k}`] = s.week + 13;
  if (band && (k === 'join' || k === 'staff')) band.trust = clamp(band.trust - 2, 0, 100); // a banda fica sabendo
  logIt(s, pid, k, false, text);
  return { ok: false, text };
}

/** Oferece à pessoa entrar (ou substituir alguém) numa banda sua. Rival: a rescisão vai junto (ou aliciamento). */
export function memberJoin29(s: GameState, pid: string, actId: string, mode: MoMode29 = 'buyout', replace?: string): MoOut29 {
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'join') ?? joinFit29(s, pid, actId, replace);
  if (b0) return fail(b0);
  const p = s.persons[pid], band = bandOf29(s, pid), A = s.acts[actId];
  const lb = band ? rivalOf29(s, band) : undefined;
  const m: MoMode29 = lb ? (mode === 'free' ? 'buyout' : mode) : 'free';
  const buy = band && lb && m === 'buyout' ? buyout29(s, band) : 0;
  const fee = joinFee29(s, pid);
  if (freeCash20(s) < fee + buy) return fail(cashWhy20(s, fee + buy, l('Caixa insuficiente.', 'Not enough cash.')));
  const ch = joinChance29(s, pid, actId, m);
  const st = mo29(s);
  st.n++;
  const r = rng29(s, `join:${pid}:${actId}`);
  if (!r.chance(ch.p)) return refuse(s, pid, 'join', band, band
    ? T('{p} agradeceu, mas fica em {b} ({c}% de chance).', '{p} thanked you but stays in {b} ({c}% odds).', { p: p.name, b: band.name, c: Math.round(ch.p * 100) })
    : T('{p} agradeceu, mas não quer entrar em {a} ({c}% de chance).', '{p} thanked you but won\'t join {a} ({c}% odds).', { p: p.name, a: A.name, c: Math.round(ch.p * 100) }));
  post(s, `mo29join:${pid}:${s.week}`, -fee, 'artist_dev', `Luvas: ${p.name} → ${A.name}`);
  const wasFree = !!l16(s).free[pid]; // saiu de uma banda há pouco: a entrada cita "(ex-…)"
  if (band) {
    alter(s, band);
    departNpc16(s, r, band, p, why16(s, band, p));
    bandReact(s, band, p, true);
  }
  let swapTxt: L | null = null;
  if (replace && s.persons[replace]) { const o = s.persons[replace]; leaveBand16(s, A, o, 'left'); swapTxt = T(' {o} deixa {a}.', ' {o} leaves {a}.', { o: o.name, a: A.name }); for (const id of A.members) { const q = s.persons[id]; if (q && !q.isPlayer) q.morale = clamp(q.morale - 3, 0, 100); } }
  const ex = band || wasFree;
  joinBand(s, p, A, replace ? (ex ? l('{p} (ex-{o}) assume o lugar de {q} em {a}.', '{p} (ex-{o}) takes over from {q} in {a}.') : l('{p} assume o lugar de {q} em {a}.', '{p} takes over from {q} in {a}.'))
    : ex ? l('{p} (ex-{o}) entra em {a}.', '{p} (ex-{o}) joins {a}.') : l('{p} entra em {a}.', '{p} joins {a}.'), replace ? s.persons[replace]?.name ?? '' : '');
  delete l16(s).free[pid];
  for (const id of A.members) { const q = s.persons[id]; if (q && q.id !== pid) { q.rel[pid] = Math.max(q.rel[pid] ?? 0, 10); p.rel[q.id] = Math.max(p.rel[q.id] ?? 0, 10); } }
  p.morale = clamp(p.morale + 8, 0, 100);
  const extra = band ? rivalHit(s, r, lb, m, buy, p, band, actId) : null;
  if (lb && band) remember(s, 'poach', T('{c} tira {p} de {b} ({lb}) para {a}.', '{c} takes {p} from {b} ({lb}) into {a}.', { c: s.config.companyName, p: p.name, b: band.name, lb: lb.name, a: A.name }), { actId, pid, important: true });
  const txt = band ? T('{p} sai de {b} e entra em {a}.{x}', '{p} leaves {b} and joins {a}.{x}', { p: p.name, b: band.name, a: A.name, x: swapTxt ?? '' })
    : T('{p}, sem banda, entra em {a}.{x}', '{p}, without a band, joins {a}.{x}', { p: p.name, a: A.name, x: swapTxt ?? '' });
  const sev = band ? band.fame / 2 : personFame(s, pid).v / 2;
  emitFact(s, { kind: 'member_join', actors: ['player', pid, actId, band?.id ?? ''], severity: clamp(20 + sev, 20, 65), visibility: 'public', tags: ['member29', 'join', ...(lb ? ['poach'] : [])], text: txt, src: 'member29' });
  const out = extra ? T('{t} {e}', '{t} {e}', { t: txt, e: extra }) : txt;
  logIt(s, pid, 'join', true, out);
  return { ok: true, text: out, actId };
}

// ---------------------------------------------------------------- 3) músico de sessão (session19)

const INST29: Record<string, Inst19> = { vocal: 'vocal', mc: 'vocal', guitar: 'guitar', bass: 'bass', drums: 'drums', keys: 'keys', horns: 'horns', strings: 'strings', dj: 'keys', producer: 'keys', synthetic: 'keys' };
const aceSk = (p: Person): number => Math.round(clamp(Math.max(p.skills.instr, p.role === 'vocal' || p.role === 'mc' ? p.skills.voice : 0), 30, 99));
/** Cachê de 6 meses com crédito na capa + liberação do selo da banda (centavos). */
export function sessionCost29(s: GameState, pid: string): { cost: number; blocked: boolean; text: L } {
  const p = s.persons[pid], band = p ? bandOf29(s, pid) : undefined;
  if (!p || (!band && !freeAgent29(s, pid))) return { cost: 0, blocked: true, text: l('Indisponível.', 'Unavailable.') };
  const fee = aceFee19(s, { sk: aceSk(p) } as never, true) * 6;
  if (!band) return { cost: fee, blocked: false, text: l('Sem banda: não precisa de liberação.', 'No band: no clearance needed.') };
  const cl = clearance(s, band.id, fee);
  return { cost: fee + cl.cost, blocked: cl.blocked, text: cl.text };
}
export function sessionChance29(s: GameState, pid: string): Chance29 {
  const p = s.persons[pid], band = bandOf29(s, pid);
  if (!p || (!band && !freeAgent29(s, pid))) return { p: 0, why: [] };
  const fs: Factor29[] = [
    F(T('Opinião sobre você ({o})', 'Opinion of you ({o})', { o: Math.round(opinionOf(s, `p:${pid}`)) }), opinionOf(s, `p:${pid}`) / 600),
    F(l('Ambição: dinheiro/segurança', 'Ambition: money/security'), p.ambition === 'money' || p.ambition === 'security' ? 0.05 : 0),
    band ? F(T('Banda ocupada (fama {f})', 'Busy band (fame {f})', { f: Math.round(band.fame) }), -band.fame / 600) : F(l('Sem banda: trabalho bem-vindo', 'No band: work is welcome'), 0.08),
    F(T('Cansaço ({f})', 'Fatigue ({f})', { f: Math.round(p.fatigue) }), -p.fatigue / 800),
  ].filter((f) => Math.abs(f.v) >= 0.004);
  return chanceOf(0.08, band ? l('Base: trabalho pago, continua na banda', 'Base: paid work, keeps the band') : l('Base: trabalho pago', 'Base: paid work'), fs);
}
export function memberSession29(s: GameState, pid: string, actId: string): MoOut29 {
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'session');
  if (b0) return fail(b0);
  const p = s.persons[pid], band = bandOf29(s, pid), A = s.acts[actId];
  if (!A || !mineAct(A) || !live(A)) return fail(l('Escolha um ato do seu elenco.', 'Pick an act from your roster.'));
  const mold = band ?? refAct29(s, pid) ?? A;
  const sc = ses19(s);
  if (sc.aces.some((a) => a.pid === pid && a.hire && a.hire.until >= s.week)) return fail(l('Já está gravando com você.', 'Already recording with you.'));
  const c = sessionCost29(s, pid);
  if (c.blocked) return fail(c.text);
  if (freeCash20(s) < c.cost) return fail(cashWhy20(s, c.cost, l('Caixa insuficiente.', 'Not enough cash.')));
  const ch = sessionChance29(s, pid);
  mo29(s).n++;
  const r = rng29(s, `session:${pid}:${actId}`);
  if (!r.chance(ch.p)) return refuse(s, pid, 'session', band, T('{p} não tem agenda para sessões agora ({c}% de chance).', '{p} has no time for sessions right now ({c}% odds).', { p: p.name, c: Math.round(ch.p * 100) }));
  let ace = sc.aces.find((a) => a.pid === pid && a.crew === FREE19);
  if (!ace) { ace = { id: `ac${++sc.seq}`, name: p.name, crew: FREE19, inst: INST29[p.role] ?? 'keys', born: p.born, sk: aceSk(p), pid, hits: 0, unc: 0, cred: 0, grudge: 0, fame: 0, plays: [], fam: familyOf(mold.genre) }; sc.aces.push(ace); }
  const lbFee = band ? clearance(s, band.id, aceFee19(s, ace, true) * 6).cost : 0; // liberação do selo da banda (feats8)
  if (freeCash20(s) < aceFee19(s, ace, true) * 6 + lbFee) return fail(cashWhy20(s, aceFee19(s, ace, true) * 6 + lbFee, l('Caixa insuficiente.', 'Not enough cash.')));
  const err = hireAce19(s, ace.id, actId, true);
  if (err) return fail(err);
  const lb = band ? rivalOf29(s, band) : undefined;
  if (lb && lbFee > 0) { post(s, `mo29ses:${pid}:${s.week}`, -lbFee, 'recording', `Liberação: ${p.name} (${lb.name})`); lb.cash += lbFee; }
  if (band) alter(s, band);
  const txt = T('{p} ({b}) grava como músico(a) de sessão com {a} por 6 meses, com crédito.', '{p} ({b}) plays sessions for {a} for 6 months, credited.', { p: p.name, b: band?.name ?? l('sem banda', 'no band'), a: A.name });
  remember(s, 'session_hire', txt, { actId, pid });
  logIt(s, pid, 'session', true, txt);
  return { ok: true, text: txt, actId };
}

// ---------------------------------------------------------------- 4) projeto paralelo / supergrupo (bonds9)

const leadOf = (s: GameState, a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) && s.persons[a.leaderId]?.alive ? a.leaderId : a.members.find((id) => s.persons[id]?.alive));
export function sideChance29(s: GameState, pid: string, actId: string): Chance29 {
  const p = s.persons[pid], band = bandOf29(s, pid), M = s.acts[actId];
  if (!p || !M || (!band && !freeAgent29(s, pid))) return { p: 0, why: [] };
  const theirs = band?.fame ?? personFame(s, pid).v;
  let adm = 0;
  try { adm = admiration(s, pid, M.id); } catch { adm = 0; }
  const fs: Factor29[] = [
    F(T('Admiração por {a} ({v})', 'Admiration for {a} ({v})', { a: M.name, v: Math.round(adm) }), adm / 400),
    F(T('Fama: {a} {f} × {b} {g}', 'Fame: {a} {f} × {b} {g}', { a: M.name, f: Math.round(M.fame), b: band?.name ?? p.name, g: Math.round(theirs) }), (M.fame - theirs) / 300),
    F(l('Ambição artística', 'Artistic ambition'), p.ambition === 'art' || p.ambition === 'critics' || p.ambition === 'freedom' ? 0.04 : 0),
    F(T('Reputação com artistas ({r})', 'Reputation with artists ({r})', { r: Math.round(s.player.reputation.artists) }), (s.player.reputation.artists - 50) / 600),
  ].filter((f) => Math.abs(f.v) >= 0.004);
  if (!band) fs.push(F(l('Sem banda: quer voltar a tocar', 'No band: wants to play again'), 0.06));
  return chanceOf(-0.02, band ? l('Base: projeto paralelo, continua na banda', 'Base: side project, keeps the band') : l('Base: projeto com um ato seu', 'Base: a project with one of your acts'), fs);
}
export function memberSide29(s: GameState, pid: string, actId: string): MoOut29 {
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'side');
  if (b0) return fail(b0);
  const p = s.persons[pid], band = bandOf29(s, pid), M = s.acts[actId];
  if (!M || !mineAct(M) || !live(M)) return fail(l('Escolha um ato do seu elenco.', 'Pick an act from your roster.'));
  const lead = leadOf(s, M);
  if (!lead || lead === pid) return fail(l('O ato não tem quem lidere o projeto.', 'The act has nobody to lead the project.'));
  const c = bondCost(s, 'super', band?.id ?? ''); // sem banda: só a produção conjunta (sem liberação)
  if (c.blocked) return fail(c.text);
  if (freeCash20(s) < c.cost) return fail(cashWhy20(s, c.cost, l('Caixa insuficiente.', 'Not enough cash.')));
  const ch = sideChance29(s, pid, actId);
  mo29(s).n++;
  const r = rng29(s, `side:${pid}:${actId}`);
  if (!r.chance(ch.p)) return refuse(s, pid, 'side', band, T('{p} recusou o projeto paralelo ({c}% de chance).', '{p} turned down the side project ({c}% odds).', { p: p.name, c: Math.round(ch.p * 100) }));
  const b = formBond(s, 'super', [lead, pid], { pl: true, term: s.year + 3, r });
  if (!b?.act) return fail(l('Esse projeto já existe.', 'That project already exists.'));
  if (c.cost) post(s, `mo29side:${pid}:${s.week}`, -c.cost, 'recording', `Projeto paralelo: ${s.persons[lead].name} + ${p.name}`);
  if (band) alter(s, band);
  const txt = T('{p} ({b}) e {q} ({a}) formam o projeto paralelo {n}.', '{p} ({b}) and {q} ({a}) form the side project {n}.', { p: p.name, b: band?.name ?? l('sem banda', 'no band'), q: s.persons[lead].name, a: M.name, n: s.acts[b.act].name });
  remember(s, 'supergroup', txt, { actId: b.act, pid, important: true });
  logIt(s, pid, 'side', true, txt);
  return { ok: true, text: txt, actId: b.act };
}

// ---------------------------------------------------------------- 5) equipe do selo e compositor(a) em segredo

export type StaffRole29 = 'producer' | 'anr';
const STAFF_SKILL: Record<StaffRole29, 'prod' | 'biz'> = { producer: 'prod', anr: 'biz' };
export const staffSkill29 = (p: Person, role: StaffRole29): number => Math.round(p.skills[STAFF_SKILL[role]] ?? 0);
export const staffSalary29 = (s: GameState, p: Person, role: StaffRole29): number => money(s, staffRoleById[role].salary * (0.8 + staffSkill29(p, role) / 100));
export function staffBlock29(s: GameState, pid: string, role: StaffRole29): L | null {
  const p = s.persons[pid];
  if (!p) return l('Indisponível.', 'Unavailable.');
  if (s.config.role === 'artist') return LABEL_ONLY;
  const sk = staffSkill29(p, role);
  if (sk < 50) return T('Habilidade de {k} baixa ({v}/100; precisa de 50).', 'Low {k} skill ({v}/100; needs 50).', { k: role === 'producer' ? l('produção', 'production') : l('negócios', 'business'), v: sk });
  if (s.player.staff.length >= hqCaps(s).staff) return l('Sede sem vagas para equipe. Amplie a sede.', 'No staff room in the HQ. Upgrade it.');
  return null;
}
export function staffChance29(s: GameState, pid: string, role: StaffRole29, mode: MoMode29): Chance29 {
  const p = s.persons[pid], band = bandOf29(s, pid);
  if (!p || (!band && !freeAgent29(s, pid))) return { p: 0, why: [] };
  const age = s.year - p.born;
  const fs = factors29(s, p, band, 'staff', mode);
  fs.push(F(T('Idade ({a})', 'Age ({a})', { a: age }), (age - 35) / 200));
  fs.push(F(T('Talento para o cargo ({v})', 'Talent for the job ({v})', { v: staffSkill29(p, role) }), (staffSkill29(p, role) - 60) / 300));
  if (p.ambition === 'security' || p.ambition === 'money') fs.push(F(l('Ambição: estabilidade', 'Ambition: stability'), 0.05));
  return chanceOf(-0.1, l('Base: largar o palco por um emprego no selo', 'Base: leave the stage for a label job'), fs.filter((f) => Math.abs(f.v) >= 0.004));
}
export function memberStaff29(s: GameState, pid: string, role: StaffRole29, mode: MoMode29 = 'buyout'): MoOut29 {
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'staff') ?? staffBlock29(s, pid, role);
  if (b0) return fail(b0);
  const p = s.persons[pid], band = bandOf29(s, pid);
  const lb = band ? rivalOf29(s, band) : undefined;
  const m: MoMode29 = lb ? (mode === 'free' ? 'buyout' : mode) : 'free';
  const buy = band && lb && m === 'buyout' ? buyout29(s, band) : 0;
  const salary = staffSalary29(s, p, role);
  if (freeCash20(s) < salary + buy) return fail(cashWhy20(s, salary + buy, l('Caixa insuficiente.', 'Not enough cash.')));
  const ch = staffChance29(s, pid, role, m);
  mo29(s).n++;
  const r = rng29(s, `staff:${pid}:${role}`);
  if (!r.chance(ch.p)) return refuse(s, pid, 'staff', band, T('{p} prefere continuar tocando ({c}% de chance).', '{p} would rather keep playing ({c}% odds).', { p: p.name, c: Math.round(ch.p * 100) }));
  post(s, `mo29staff:${pid}:${s.week}`, -salary, 'salaries', `Contratação ${p.name}`);
  if (band) {
    alter(s, band);
    departNpc16(s, r, band, p, 'left');
    bandReact(s, band, p, true);
  }
  delete l16(s).free[pid]; // trabalha no selo: não volta ao mercado de músicos livres
  const id = nextId(s, 'st29');
  s.player.staff.push({ id, name: p.name, role, skill: staffSkill29(p, role), salary, hiredWeek: s.week });
  mo29(s).staff[pid] = id;
  const extra = band ? rivalHit(s, r, lb, m, buy, p, band, band.id) : null;
  const txt = band ? T('{p} deixa {b} para ser {r} do selo {c}.', '{p} leaves {b} to be {c}\'s {r}.', { p: p.name, b: band.name, r: staffRoleById[role].name, c: s.config.companyName })
    : T('{p}, sem banda, passa a ser {r} do selo {c}.', '{p}, without a band, becomes {c}\'s {r}.', { p: p.name, r: staffRoleById[role].name, c: s.config.companyName });
  remember(s, 'hire', txt, { actId: band?.id, pid, important: (band?.fame ?? 0) > 25 });
  emitFact(s, { kind: 'hire', actors: ['player', pid, band?.id ?? ''], severity: clamp(20 + (band?.fame ?? 0) / 3, 20, 55), visibility: 'public', tags: ['member29', 'staff', 'hire'], text: txt, src: 'member29' });
  const out = extra ? T('{t} {e}', '{t} {e}', { t: txt, e: extra }) : txt;
  logIt(s, pid, 'staff', true, out);
  return { ok: true, text: out };
}

const writeSk = (p: Person): number => Math.round(Math.max(p.skills.comp, p.skills.lyr));
export function ghostChance29(s: GameState, pid: string): Chance29 {
  const p = s.persons[pid];
  if (!p) return { p: 0, why: [] };
  const pf = personFame(s, pid).v;
  const fs: Factor29[] = [
    F(l('Ambição: dinheiro/segurança', 'Ambition: money/security'), p.ambition === 'money' || p.ambition === 'security' ? 0.06 : 0),
    F(T('Ressentimento ({v})', 'Resentment ({v})', { v: Math.round(p.resentment) }), p.resentment / 600),
    F(l('Sem banda: trabalho bem-vindo', 'No band: work is welcome'), freeAgent29(s, pid) ? 0.06 : 0),
    F(T('Fama própria ({f}): esconder o nome custa', 'Own fame ({f}): hiding their name costs', { f: Math.round(pf) }), -pf / 300),
    F(T('Talento de composição ({v})', 'Songwriting talent ({v})', { v: writeSk(p) }), (writeSk(p) - 55) / 300),
  ].filter((f) => Math.abs(f.v) >= 0.004);
  return chanceOf(0, l('Base: escrever em segredo, continua na banda', 'Base: write in secret, keeps the band'), fs);
}
export function ghostBlock29(s: GameState, pid: string, actId: string): L | null {
  const p = s.persons[pid];
  if (!p) return l('Indisponível.', 'Unavailable.');
  if (writeSk(p) < 50) return T('Composição/letra baixa ({v}/100; precisa de 50).', 'Low songwriting ({v}/100; needs 50).', { v: writeSk(p) });
  if (wr19(s).gh.some((g) => g.act === actId && g.st === 'on')) return l('Esse ato já tem um ghostwriter.', 'That act already has a ghostwriter.');
  return null;
}
export function memberGhost29(s: GameState, pid: string, actId: string): MoOut29 {
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'ghost') ?? ghostBlock29(s, pid, actId);
  if (b0) return fail(b0);
  const p = s.persons[pid], band = bandOf29(s, pid), A = s.acts[actId];
  if (!A || A.owner !== 'player') return fail(l('Escolha um ato do seu elenco.', 'Pick an act from your roster.'));
  const ch = ghostChance29(s, pid);
  mo29(s).n++;
  const r = rng29(s, `ghost:${pid}:${actId}`);
  if (!r.chance(ch.p)) return refuse(s, pid, 'ghost', band, T('{p} não quer escrever sem o nome na capa ({c}% de chance).', '{p} won\'t write without credit ({c}% odds).', { p: p.name, c: Math.round(ch.p * 100) }));
  const err = hireGhost19(s, actId, false, pid);
  if (err) return fail(err);
  const txt = T('{p} ({b}) passa a compor em segredo para {a}.', '{p} ({b}) starts writing in secret for {a}.', { p: p.name, b: band?.name ?? l('sem banda', 'no band'), a: A.name });
  logIt(s, pid, 'ghost', true, txt);
  return { ok: true, text: txt, actId };
}

// ---------------------------------------------------------------- 6) sem banda: montar uma banda em volta da pessoa (lineup16)

/** Audições para montar a banda (o mesmo valor do "Formar banda" da carreira de músico, sys/life). */
export const bandFee29 = (s: GameState): number => money(s, 800);
export function bandChance29(s: GameState, pid: string): Chance29 {
  const p = s.persons[pid];
  if (!p || !freeAgent29(s, pid)) return { p: 0, why: [] };
  const fs = factors29(s, p, undefined, 'join', 'free');
  fs.push(F(T('Reputação com artistas ({r})', 'Reputation with artists ({r})', { r: Math.round(s.player.reputation.artists) }), (s.player.reputation.artists - 50) / 500));
  if (p.goal === 'solo') fs.push(F(l('Prefere carreira solo', 'Would rather go solo'), -0.06));
  if (p.goal === 'leadership') fs.push(F(l('Quer liderar', 'Wants to lead'), 0.05));
  return chanceOf(0.04, l('Base: uma banda nova com o seu selo por trás', 'Base: a new band with your label behind it'), fs.filter((f) => Math.abs(f.v) >= 0.004));
}
/** Monta uma banda nova com a pessoa e músicos livres do mercado (newBand16; vagas restantes = gente nova). Nasce sem
 *  contrato (como os supergrupos do bonds9): a interface abre a proposta de sempre para ela. */
export function memberBand29(s: GameState, pid: string): MoOut29 {
  if (s.config.role === 'artist') return fail(LABEL_ONLY);
  const b0 = memberBlock29(s, pid) ?? cdBlock(s, pid, 'band');
  if (b0) return fail(b0);
  if (bandOf29(s, pid)) return fail(l('Já está numa banda.', 'Already in a band.'));
  const p = s.persons[pid], mold = refAct29(s, pid);
  if (!mold) return fail(l('Sem referência de gênero e cidade para a banda.', 'No genre/city reference for the band.'));
  const fee = bandFee29(s);
  if (freeCash20(s) < fee) return fail(cashWhy20(s, fee, l('Caixa insuficiente.', 'Not enough cash.')));
  const ch = bandChance29(s, pid);
  mo29(s).n++;
  const r = rng29(s, `band:${pid}`);
  if (!r.chance(ch.p)) return refuse(s, pid, 'band', undefined, T('{p} não quer montar banda agora ({c}% de chance).', '{p} doesn\'t want to form a band right now ({c}% odds).', { p: p.name, c: Math.round(ch.p * 100) }));
  post(s, `mo29band:${pid}:${s.week}`, -fee, 'artist_dev', `Audições: banda de ${p.name}`);
  const partners = r.shuffle(freePool(s, mold.genre, mold.id).filter((q) => q.id !== pid && q.role !== p.role)).slice(0, 2);
  const b = newBand16(s, r, p, mold, partners);
  if (b.genre !== mold.genre) b.genre = mold.genre;
  delete l16(s).free[pid];
  const txt = T('{p} monta a banda {b} com o apoio de {c}.', '{p} forms the band {b} backed by {c}.', { p: p.name, b: b.name, c: s.config.companyName });
  emitFact(s, { kind: 'member_band', actors: ['player', pid, b.id], severity: clamp(15 + personFame(s, pid).v / 2, 15, 50), visibility: 'public', tags: ['member29', 'band'], text: txt, src: 'member29' });
  logIt(s, pid, 'band', true, txt);
  return { ok: true, text: txt, actId: b.id };
}

// ---------------------------------------------------------------- opções (menu: clique direito e ficha)

export interface Opt29 { id: string; k: MoKind29; label: L; block: L | null; chance?: number; why?: L[]; cost?: number; note?: L; sec: 'career' | 'music' }
const ACTS_N = 3;
/** Todas as opções para a pessoa, com bloqueio (motivo), chance e custo. Puro: não muda o estado. */
export function memberOptions29(s: GameState, pid: string): Opt29[] {
  const p = s.persons[pid];
  if (!p) return [];
  const common = memberBlock29(s, pid);
  const band = bandOf29(s, pid);
  const lb = band ? rivalOf29(s, band) : undefined;
  const out: Opt29[] = [];
  const blk = (k: MoKind29, ...more: (L | null)[]): L | null => common ?? cdBlock(s, pid, k) ?? more.find((x) => !!x) ?? null;
  const buy = band && lb ? buyout29(s, band) : 0;
  const cash = (c: number): L | null => (c && freeCash20(s) < c ? cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.')) : null);
  const artist = s.config.role === 'artist' ? LABEL_ONLY : null;
  const realNote = band ? null : realNote29(s, pid);
  // solo
  const solos: [MoMode29, L, L][] = lb
    ? [['buyout', T('Carreira solo no seu selo — pagar a rescisão a {lb}…', 'Solo career on your label — pay {lb} the buyout…', { lb: lb.name }), T('Abre a mesa de negociação do solo. Rescisão de {v} ao assinar; mágoa pequena do rival.', 'Opens the solo negotiation table. {v} buyout on signing; a small rival grudge.', { v: usd(buy) })],
      ['tamper', T('Carreira solo no seu selo — aliciar sem pagar {lb}…', 'Solo career on your label — poach from {lb} without paying…', { lb: lb.name }), l('Abre a mesa. Sem rescisão: chance menor, mágoa e rivalidade maiores e risco de processo por aliciamento.', 'Opens the table. No buyout: lower odds, bigger grudge and rivalry, and a tampering lawsuit risk.')]]
    : band ? [['free', l('Carreira solo no seu selo…', 'Solo career on your label…'), l('Abre a mesa de negociação de sempre com o solo. Assinou: sai da banda e leva parte dos fãs.', 'Opens the usual negotiation table for the solo act. If signed: leaves the band and takes some fans.')]]
      : [['free', T('Assinar {n} como artista solo…', 'Sign {n} as a solo artist…', { n: p.name }),
        realNote ? T('Abre a mesa de negociação de sempre com o solo (sem banda: ninguém fica para trás). {r}', 'Opens the usual negotiation table for the solo act (no band: nobody is left behind). {r}', { r: realNote })
          : l('Abre a mesa de negociação de sempre com o solo (sem banda: ninguém fica para trás).', 'Opens the usual negotiation table for the solo act (no band: nobody is left behind).')]];
  for (const [mode, label, note] of solos) {
    const block = blk('solo', artist, mode === 'buyout' ? cash(buy) : null, !band && !refAct29(s, pid) ? l('Sem referência de gênero e cidade para montar o solo.', 'No genre/city reference to build the solo act.') : null);
    const ch = block ? null : soloChance29(s, pid, mode);
    out.push({ id: `mo.solo:${mode}`, k: 'solo', label, block, chance: ch?.p, why: ch?.why, cost: mode === 'buyout' ? buy : undefined, note, sec: 'career' });
  }
  // entrar numa banda sua
  const bands = myBands29(s);
  if (!bands.length) out.push({ id: 'mo.join:none', k: 'join', label: l('Entrar numa banda sua', 'Join one of your bands'), block: common ?? l('Você não tem banda com formação (2+ integrantes).', 'You have no band lineup (2+ members).'), sec: 'career' });
  let nj = 0;
  const fee = joinFee29(s, pid) + buy;
  for (const A of bands) {
    if (nj >= 6) break;
    const same = A.members.filter((id) => s.persons[id]?.alive && !s.persons[id].isPlayer && s.persons[id].role === p.role);
    const rows: [string, L, string | undefined][] = same.length
      ? same.slice(0, 2).map((o) => [`mo.join:${A.id}:${o}`, T('Substituir {o} em {a} ({r})', 'Replace {o} in {a} ({r})', { o: s.persons[o].name, a: A.name, r: roleName29(p.role) }), o])
      : [[`mo.join:${A.id}`, T('Entrar em {a} ({r})', 'Join {a} ({r})', { a: A.name, r: roleName29(p.role) }), undefined]];
    for (const [id, label, rep] of rows) {
      const block = blk('join', joinFit29(s, pid, A.id, rep), cash(fee));
      const ch = block ? null : joinChance29(s, pid, A.id, lb ? 'buyout' : 'free');
      out.push({ id, k: 'join', label, block, chance: ch?.p, why: ch?.why, cost: fee, sec: 'career',
        note: !band ? l('Luvas pela entrada. Sem banda: ninguém fica para trás.', 'Signing fee. No band: nobody is left behind.')
          : lb ? T('Luvas + rescisão de {v} a {lb}. Sai de {b}; a banda reage.', 'Signing fee + {v} buyout to {lb}. Leaves {b}; the band reacts.', { v: usd(buy), lb: lb.name, b: band?.name ?? '?' }) : T('Luvas pela troca. Sai de {b}; a banda reage (substituto, segue menor ou acaba).', 'Signing fee. Leaves {b}; the band reacts (replacement, smaller or split).', { b: band?.name ?? '?' }) });
      nj++;
    }
  }
  // equipe
  for (const role of ['producer', 'anr'] as StaffRole29[]) {
    const sal = staffSalary29(s, p, role) + buy;
    const block = blk('staff', staffBlock29(s, pid, role), cash(sal));
    const ch = block ? null : staffChance29(s, pid, role, lb ? 'buyout' : 'free');
    out.push({ id: `mo.staff:${role}`, k: 'staff', label: T('Trabalhar no selo como {r}', 'Work for the label as {r}', { r: staffRoleById[role].name }), block, chance: ch?.p, why: ch?.why, cost: sal, sec: 'career',
      note: T(band ? 'Deixa a banda; salário de {v}/mês (1º mês adiantado){x}.' : 'Salário de {v}/mês (1º mês adiantado){x}.', band ? 'Leaves the band; {v}/month salary (first month up front){x}.' : '{v}/month salary (first month up front){x}.', { v: usd(staffSalary29(s, p, role)), x: lb ? fmtL(l(' + rescisão a {lb}', ' + buyout to {lb}'), { lb: lb.name }) : '' }) });
  }
  // continua na banda: sessão, projeto paralelo, compor em segredo, feat
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && live(a) && !mo29(s).sh[a.id]).sort((a, b) => b.fame - a.fame);
  const NO_ACT = l('Você não tem artistas para este projeto.', 'You have no acts for this project.');
  const sc = sessionCost29(s, pid);
  if (!mine.length) out.push({ id: 'mo.session:none', k: 'session', label: l('Músico(a) de sessão para um ato seu', 'Session player for one of your acts'), block: common ?? NO_ACT, sec: 'music' });
  for (const A of mine.slice(0, ACTS_N)) {
    const block = blk('session', sc.blocked ? sc.text : null, cash(sc.cost), ses19(s).aces.some((a) => a.pid === pid && a.hire && a.hire.until >= s.week) ? l('Já está gravando com você.', 'Already recording with you.') : null);
    const ch = block ? null : sessionChance29(s, pid);
    out.push({ id: `mo.session:${A.id}`, k: 'session', label: T('Músico(a) de sessão para {a} (6 meses)', 'Session player for {a} (6 months)', { a: A.name }), block, chance: ch?.p, why: ch?.why, cost: sc.cost, sec: 'music',
      note: band ? l('Continua na banda; toca nas gravações (com crédito na capa) e melhora uma dimensão do disco (session19).', 'Keeps the band; plays on the recordings (credited) and lifts one record dimension (session19).')
        : l('Toca nas gravações (com crédito na capa) e melhora uma dimensão do disco (session19).', 'Plays on the recordings (credited) and lifts one record dimension (session19).') });
  }
  const bc = bondCost(s, 'super', band?.id ?? '');
  for (const A of mine.slice(0, 2)) {
    const lead = leadOf(s, A);
    const block = blk('side', bc.blocked ? bc.text : null, cash(bc.cost), !lead || lead === pid ? l('O ato não tem quem lidere o projeto.', 'The act has nobody to lead the project.') : null);
    const ch = block ? null : sideChance29(s, pid, A.id);
    out.push({ id: `mo.side:${A.id}`, k: 'side', label: T('Projeto paralelo com {l} ({a})', 'Side project with {l} ({a})', { l: lead ? s.persons[lead].name : '?', a: A.name }), block, chance: ch?.p, why: ch?.why, cost: bc.cost, sec: 'music',
      note: band ? l('Supergrupo de ~3 anos (bonds9); os dois continuam nas bandas. Depois, proponha contrato ao projeto.', 'A ~3-year supergroup (bonds9); both keep their bands. Then offer the project a deal.')
        : l('Supergrupo de ~3 anos (bonds9) com o líder de um ato seu. Depois, proponha contrato ao projeto.', 'A ~3-year supergroup (bonds9) with one of your act leaders. Then offer the project a deal.') });
  }
  const G = mine.find((a) => a.owner === 'player');
  if (G && s.config.role !== 'artist') {
    const block = blk('ghost', ghostBlock29(s, pid, G.id));
    const ch = block ? null : ghostChance29(s, pid);
    out.push({ id: `mo.ghost:${G.id}`, k: 'ghost', label: T('Compor em segredo para {a} (ghostwriter)', 'Write in secret for {a} (ghostwriter)', { a: G.name }), block, chance: ch?.p, why: ch?.why, sec: 'music',
      note: band ? l('Continua na banda; escreve sem crédito (writers19): barato, mas o rancor cresce com os hits.', 'Keeps the band; writes uncredited (writers19): cheap, but the grudge grows with the hits.')
        : l('Escreve sem crédito (writers19): barato, mas o rancor cresce com os hits.', 'Writes uncredited (writers19): cheap, but the grudge grows with the hits.') });
  }
  // sem banda: montar uma banda em volta da pessoa (lineup16.newBand16, o mesmo caminho dos músicos livres do mundo)
  if (!band) {
    const fee = bandFee29(s);
    const block = blk('band', artist, cash(fee), !refAct29(s, pid) ? l('Sem referência de gênero e cidade para a banda.', 'No genre/city reference for the band.') : null);
    const ch = block ? null : bandChance29(s, pid);
    out.push({ id: 'mo.band', k: 'band', label: T('Montar uma banda com {n}…', 'Form a band around {n}…', { n: p.name }), block, chance: ch?.p, why: ch?.why, cost: fee, sec: 'career',
      note: l('Audições: a banda nasce com músicos livres do mercado (lineup16) e a proposta de contrato abre em seguida. Sem contrato, ela segue independente.', 'Auditions: the band is formed with free musicians from the market (lineup16) and the deal offer opens next. Unsigned, it carries on independent.') });
  }
  const songs = mine.some((a) => featSongs(s, a.id).length);
  // R29 (feat de pessoa): o convidado é a PESSOA (não a banda inteira) — o feat negociado de sempre com ela pré-escolhida
  out.push({ id: 'mo.feat', k: 'feat', label: T('Participação (feat) de {n} num lançamento seu…', 'Feature by {n} on one of your releases…', { n: p.name }), sec: 'music',
    block: common ?? (!mine.length ? NO_ACT : !songs ? l('Nenhuma música sua pronta para receber participação.', 'None of your songs is ready for a feature.') : featPersonBlock29(s, pid)),
    note: T('Abre o feat negociado de sempre com {n} como convidado(a) — só a pessoa, sem a banda (feats8).', 'Opens the usual negotiated feature with {n} as the guest — just the person, not the band (feats8).', { n: p.name }) });
  return out;
}

/** R29 (feat de pessoa): o que a opção "Participação" pré-escolhe na tela do feat — a pessoa, não a banda. */
export function memberFeatPreset29(s: GameState, pid: string): { persons: string[]; host?: string } {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && live(a) && !mo29(s).sh[a.id] && featSongs(s, a.id).length > 0).sort((a, b) => b.fame - a.fame);
  return mine[0] ? { persons: [pid], host: mine[0].id } : { persons: [pid] };
}

/** Executa uma opção que resolve na hora (entrar, sessão, projeto, equipe, ghost). Solo e feat abrem telas (interface). */
export function runMemberOption29(s: GameState, pid: string, optId: string): MoOut29 {
  const [head, ...rest] = optId.split(':');
  switch (head) {
    case 'mo.join': return memberJoin29(s, pid, rest[0], 'buyout', rest[1]);
    case 'mo.session': return memberSession29(s, pid, rest[0]);
    case 'mo.side': return memberSide29(s, pid, rest[0]);
    case 'mo.staff': return memberStaff29(s, pid, rest[0] as StaffRole29);
    case 'mo.ghost': return memberGhost29(s, pid, rest[0]);
    case 'mo.band': return memberBand29(s, pid);
    default: return fail(l('Ação indisponível.', 'Action unavailable.'));
  }
}

// ---------------------------------------------------------------- semana: fecha propostas e mantém a equipe fora do mercado

registerSimHook('week', 'member29', (s) => {
  const st = (s.x4 as unknown as { mo29?: Mo29State }).mo29;
  if (!st) return;
  if (st.sh && Object.keys(st.sh).length) settleMember29(s);
  if (st.staff) for (const pid of Object.keys(st.staff)) if (l16(s).free[pid]) delete l16(s).free[pid];
});

// R29 (infra): a troca de integrante vira assunto — a imprensa e o público olham para quem chega. O ato que recebe
// ganha embalo proporcional à manchete (fama da banda de origem); a banda de origem já perdeu moral/embalo no acerto.
// Puro (sem sorteio): só lê o fato.
for (const kind of ['member_solo', 'member_join', 'member_band'] as const) { // R29 B: a banda nova montada em volta da pessoa também
  onFact(kind, (s, f) => {
    const to = s.acts[f.actors[2] ?? ''];
    if (!to || to.status === 'retired' || to.status === 'split') return;
    to.momentum = clamp(to.momentum + Math.round(f.severity / 12), 0, 100);
  });
}
