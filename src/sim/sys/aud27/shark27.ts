// Rodada 27 (AUD2) — AGIOTA VIRA HISTÓRIA. Antes o agiota do vices.ts só cobrava juros; segredos23 só criava a
// dívida com agiota para artistas de NPC com caixa negativo. Agora:
//  • o SEU empréstimo de agiota (pessoal ou da empresa) vem de uma ORGANIZAÇÃO de verdade (crime17/crimemem23 do
//    seu país): vira segredo 'shark' do selo (secrets23), dívida da organização sobre você (holds17) e relação com ela
//    (crime17.org). Quitar fecha o segredo e a dívida; atrasar sobe o calor da polícia e a pressão.
//  • dois atrasos → VISITA (cartão): pagar o que der, pedir prazo em troca de um favor (a organização ganha um favor
//    e você passa a ter ligação com o crime), denunciar à polícia (dívida some, você vira informante e a organização
//    jura vingança — retaliações enquanto o rancor durar) ou ignorar (eles levam do caixa e assustam a equipe).
//  • NPCs: selos de NPC no vermelho e artistas viciados também pegam dinheiro com a organização da praça; depois de
//    meses sem pagar vêm as COBRANÇAS (ameaça → estresse e boato; selo: caixa levado e, no segundo calote, o dono
//    vira associado da organização — o selo passa a ser fachada).
// Sorteios próprios (Rng.fromSeed por empréstimo/semana); não toca no RNG do jogo.

import { Rng, clamp } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { deferEvents, registerExt4, registerSimHook } from '../../ext4';
import { emitEvent, type EventDef } from '../../events';
import { emitFact } from '../../facts17';
import { histMode } from '../../history15';
import { grantHold, holds17, voidHolds } from '../../holds17';
import { addStress } from '../../stress17';
import type { GameState } from '../../types';
import { fmtL, money, notify, post, remember } from '../../util';
import { a3Of, addHeat, crime17, isReal, orgById, orgs17, type Org17 } from '../crime17';
import { _crimemem23, mem23 } from '../crimemem23';
import { P } from '../people/state';
import { ownerOf } from '../people/owner';
import { _secrets23, addSecret23, raise23, sec23, secretsOf23, type Sec23 } from '../secrets23';
import { vices } from '../vices';
import { OFF_AUD27 } from './off';
import { actsNow27 } from '../../tickcache27';
import { purse } from '../../r31/purse31'; // R31 (P/B.17): dinheiro pessoal com registro

const N = (pt: string, en: string): L => l(pt, en);

export interface Shark27 { k: 'p' | 'c'; o: string; sec?: string; amt: number; miss: number; last: number; visit: number; w: number }
export interface SharkNpc27 { o: string; w: number; amt: number; miss: number; last: number }
export interface Shark27State {
  /** empréstimos de agiota do jogador (id do empréstimo → ligação) */
  L: Record<string, Shark27>;
  /** dívidas de NPCs criadas aqui (sujeito secrets23 → dívida) */
  npc: Record<string, SharkNpc27>;
  /** vingança da organização denunciada: id da organização → semana até quando */
  rev: Record<string, number>;
  log: [number, number, L][];
}
declare module '../../ext4' { interface Ext4 { shark27: Shark27State } }
const fresh = (): Shark27State => ({ L: {}, npc: {}, rev: {}, log: [] });
registerExt4('shark27', fresh);
export function shark27(s: GameState): Shark27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.shark27 ??= fresh()) as Shark27State;
  st.L ??= {}; st.npc ??= {}; st.rev ??= {}; st.log ??= [];
  return st;
}
const logIt = (s: GameState, t: L): void => { const st = shark27(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 30) st.log.length = 30; };
const rngK = (s: GameState, tag: string): Rng => Rng.fromSeed(`${s.config.seed}:shark27:${tag}:${s.week}`);
const live = (s: GameState, o: Org17) => (crime17(s).down[o.id] ?? -Infinity) < s.week;

/** Organização que empresta numa praça (país da cidade; senão a mais perto que existir na época). */
export function lenderOrg27(s: GameState, city: string, seed: string): Org17 | undefined {
  const a3 = a3Of(s, city);
  const here = orgs17(s).filter((o) => o.a3 === a3 && live(s, o));
  const pool = here.length ? here : orgs17(s).filter((o) => live(s, o));
  if (!pool.length) return undefined;
  return Rng.fromSeed(`${s.config.seed}:shark27:org:${seed}`).pick(pool);
}
const orgName = (s: GameState, oid: string): L => orgById(s, oid)?.name ?? N('a organização', 'the organization');

/** Empréstimos de agiota do jogador vivos: [id, pessoal?, saldo]. */
function myShark(s: GameState): { id: string; k: 'p' | 'c'; bal: number; missed: number }[] {
  const v = vices(s);
  const out: { id: string; k: 'p' | 'c'; bal: number; missed: number }[] = v.loans.filter((x) => x.lender === 'shark').map((x) => ({ id: x.id, k: 'p' as const, bal: x.balance, missed: x.missed }));
  for (const ln of s.player.loans) if (v.coLenders[ln.id] === 'shark') out.push({ id: ln.id, k: 'c', bal: ln.balance, missed: 0 });
  return out;
}

/** Liga um empréstimo de agiota novo à organização: segredo, dívida (holds17), relação. Idempotente. */
export function linkShark27(s: GameState, pick?: (loanId: string) => string | undefined): number {
  const st = shark27(s);
  let n = 0;
  for (const ln of myShark(s)) {
    if (st.L[ln.id]) continue;
    const chosen = pick?.(ln.id); // r29 (mob29): empréstimo pedido a uma família específica
    const o = (chosen ? orgById(s, chosen) : undefined) ?? lenderOrg27(s, s.config.homeCity, ln.id);
    const sec = addSecret23(s, { kind: 'shark', subject: 'player', sev: 40, ev: 45, data: { o: o?.id ?? '', amt: ln.bal, loan: ln.id }, base: { p: 4 } });
    st.L[ln.id] = { k: ln.k, o: o?.id ?? '', sec: sec.id, amt: ln.bal, miss: 0, last: ln.missed, visit: -99, w: s.week };
    if (o) {
      grantHold(s, { holder: o.key, target: 'player', kind: 'debt', strength: ln.k === 'c' ? 55 : 45, months: 24, src: 'shark27', ref: ln.id, quiet: true,
        text: fmtL(N('Dinheiro de {o} — e eles sabem onde fica a sede', 'Money from {o} — and they know where HQ is'), { o: o.name }) });
      crime17(s).org[o.id] = clamp((crime17(s).org[o.id] ?? 0) + 4, -100, 100);
    }
    logIt(s, fmtL(N('O dinheiro do agiota vem de {o}.', 'The loan shark\'s money comes from {o}.'), { o: o ? o.name : N('um agiota independente', 'an independent lender') }));
    n++;
  }
  return n;
}

/** Para a interface: de quem é o dinheiro do agiota (null se o empréstimo não é de agiota ou ainda não foi ligado). */
export function sharkNote27(s: GameState, loanId: string): L | null {
  const x = shark27(s).L[loanId];
  if (!x) return null;
  return fmtL(N('dinheiro de {o}{m}', 'money from {o}{m}'), { o: x.o ? orgName(s, x.o) : N('um agiota independente', 'an independent lender'), m: x.miss ? fmtL(N(' · {n} atraso(s)', ' · {n} missed'), { n: x.miss }) : '' });
}

function endLink(s: GameState, id: string, paid: boolean): void {
  const st = shark27(s), x = st.L[id];
  if (!x) return;
  const sec = sec23(s).own.find((y) => y.id === x.sec);
  if (sec && !sec.end) { sec.end = s.week; _secrets23.bust(); }
  voidHolds(s, (h) => h.src === 'shark27' && h.ref === id && h.kind === 'debt');
  if (x.o && paid) crime17(s).org[x.o] = clamp((crime17(s).org[x.o] ?? 0) + 3, -100, 100);
  if (paid) logIt(s, fmtL(N('Dívida com {o} quitada: o segredo morre aqui.', 'Debt to {o} paid off: the secret dies here.'), { o: orgName(s, x.o) }));
  delete st.L[id];
}

/** Mês do jogador: liga, detecta atraso (pessoal: missed do vices; empresa: caixa negativo), visita. */
function playerMonth(s: GameState): void {
  linkShark27(s);
  const st = shark27(s);
  const live0 = new Map(myShark(s).map((x) => [x.id, x]));
  for (const [id, x] of Object.entries(st.L)) {
    const ln = live0.get(id);
    if (!ln) { endLink(s, id, true); continue; }
    const missedNow = ln.k === 'p' ? ln.missed > x.last : s.player.cash < 0;
    x.last = ln.missed;
    if (!missedNow) continue;
    x.miss++;
    const a3 = a3Of(s, s.config.homeCity);
    addHeat(s, 'player', a3, 2);
    if (x.o) {
      crime17(s).org[x.o] = clamp((crime17(s).org[x.o] ?? 0) - 6, -100, 100);
      const o = orgById(s, x.o);
      if (o) grantHold(s, { holder: o.key, target: 'player', kind: 'debt', strength: 50 + x.miss * 8, months: 24, src: 'shark27', ref: id, quiet: true, text: fmtL(N('Parcela atrasada com {o}', 'Missed payment to {o}'), { o: o.name }) });
    }
    if (x.miss >= 2 && s.week - x.visit > 8 && !s.config.contentFilters.includes('crime') && !s.decisions.some((d) => d.eventId === 'shark27_visit')) {
      x.visit = s.week;
      emitEvent(s, rngK(s, `visit:${id}`), 'shark27_visit', { loan: id, orgName: orgName(s, x.o).pt });
    }
  }
  // vingança de quem você denunciou
  for (const [oid, until] of Object.entries(st.rev)) {
    if (until < s.week) { delete st.rev[oid]; continue; }
    const r = rngK(s, `rev:${oid}`);
    if (!r.chance(0.06)) continue;
    const v = money(s, 1500 + r.int(0, 4) * 500);
    post(s, `shark27rev:${oid}:${s.week}`, -v, 'misc', 'Vandalismo na sede (vingança)');
    ownerOf(s).stress = clamp(ownerOf(s).stress + 10, 0, 100);
    for (const m of s.player.staff) { const c = P(s).career[m.id]; if (c) c.loyalty = clamp(c.loyalty - 2, 0, 100); }
    const t = fmtL(N('Vidros quebrados e um recado na porta da sede: {o} não esqueceu a denúncia.', 'Smashed windows and a note on HQ\'s door: {o} has not forgotten the tip-off.'), { o: orgName(s, oid) });
    notify(s, t, 'bad');
    logIt(s, t);
    const o = orgById(s, oid);
    emitFact(s, { kind: 'crime', actors: [o?.key ?? `o:${oid}`, 'player'], place: s.config.homeCity, severity: 35, visibility: 'rumor', tags: ['shark', 'revenge', 'bad'], text: t, src: 'shark27' });
  }
}

// ---------------------------------------------------------------- a visita (cartão)

function loanOf(s: GameState, id: string): { bal: () => number; set: (v: number) => void; clearMiss: () => void; drop: () => void; k: 'p' | 'c' } | null {
  const pl = vices(s).loans.find((x) => x.id === id);
  if (pl) return { k: 'p', bal: () => pl.balance, set: (v) => { pl.balance = Math.max(0, Math.round(v)); }, clearMiss: () => { pl.missed = 0; }, drop: () => { vices(s).loans = vices(s).loans.filter((x) => x.id !== id); } };
  const cl = s.player.loans.find((x) => x.id === id);
  if (cl) return { k: 'c', bal: () => cl.balance, set: (v) => { cl.balance = Math.max(0, Math.round(v)); }, clearMiss: () => undefined, drop: () => { s.player.loans = s.player.loans.filter((x) => x.id !== id); delete vices(s).coLenders[id]; } };
  return null;
}
const orgOfLoan = (s: GameState, id: string): Org17 | undefined => { const x = shark27(s).L[String(id)]; return x?.o ? orgById(s, x.o) : undefined; };

export const SHARK_EVS27: EventDef[] = [{
  id: 'shark27_visit', cat: 'people', tone: 'bad', tags: ['crime', 'shark27'], cooldown: 0, forcedOnly: true,
  title: N('Visita do agiota', 'The loan shark pays a visit'),
  text: N('Dois homens de {orgName} esperam na recepção da sede. Educados, pacientes, sem pressa nenhuma: as parcelas estão atrasadas e eles vieram "conversar".',
    'Two men from {orgName} are waiting at HQ reception. Polite, patient, in no hurry at all: the payments are late and they came to "talk".'),
  options: [
    { id: 'pay', label: N('Pagar o que der agora', 'Pay what you can right now'), hint: N('Até 40% do patrimônio (dívida pessoal) ou 30% do caixa (empresa) vai para a dívida; eles baixam a guarda.', 'Up to 40% of your wealth (personal debt) or 30% of company cash goes to the debt; they back off.'),
      apply: (s, _r, c) => {
        const ln = loanOf(s, String(c.loan)); if (!ln) return;
        const can = ln.k === 'p' ? Math.max(0, ownerOf(s).wealth) * 0.4 : Math.max(0, s.player.cash) * 0.3;
        const pay = Math.round(Math.min(ln.bal(), can));
        if (pay > 0) { if (ln.k === 'p') purse(s, -pay, 'loan', 'shark27:visit', { ben: 'ext' }); else post(s, `shark27pay:${c.loan}:${s.week}`, -pay, 'loans', 'Pagamento ao agiota (visita)'); ln.set(ln.bal() - pay); }
        ln.clearMiss();
        const x = shark27(s).L[String(c.loan)]; if (x) { x.miss = 0; if (x.o) crime17(s).org[x.o] = clamp((crime17(s).org[x.o] ?? 0) + 4, -100, 100); }
        ownerOf(s).stress = clamp(ownerOf(s).stress + 4, 0, 100);
        logIt(s, N('Você pagou o que deu. Os homens agradecem e vão embora — por enquanto.', 'You paid what you could. The men thank you and leave — for now.'));
      } },
    { id: 'favor', label: N('Pedir prazo em troca de um favor', 'Ask for time in exchange for a favor'), hint: N('Dívida +10%; a organização ganha um favor sobre você (pode cobrar depois) e você passa a ter ligação com o crime (segredo). Calor da polícia +4.', 'Debt +10%; the organization gains a favor over you (to call in later) and you now have crime ties (a secret). Police heat +4.'),
      apply: (s, _r, c) => {
        const ln = loanOf(s, String(c.loan)); if (!ln) return;
        ln.set(ln.bal() * 1.1); ln.clearMiss();
        const x = shark27(s).L[String(c.loan)]; if (x) x.miss = 0;
        const o = orgOfLoan(s, String(c.loan));
        if (o) grantHold(s, { holder: o.key, target: 'player', kind: 'favor', strength: 65, months: 36, src: 'shark27', ref: `fav:${c.loan}`, text: fmtL(N('{o} te deu prazo: um dia vão pedir algo de volta', '{o} gave you time: one day they will ask for something back'), { o: o.name }) });
        addHeat(s, 'player', a3Of(s, s.config.homeCity), 4);
        if (!secretsOf23(s, 'player').some((y) => y.kind === 'crime')) addSecret23(s, { kind: 'crime', subject: 'player', sev: 45, ev: 35, data: { o: o?.id ?? '' }, base: { p: 4 } });
        logIt(s, N('Prazo concedido. A organização anotou o favor.', 'Time granted. The organization noted the favor.'));
      } },
    { id: 'police', label: N('Denunciar à polícia', 'Report them to the police'), hint: N('A dívida some no inquérito; você vira informante (segredo perigoso) e a organização jura vingança por anos.', 'The debt vanishes in the investigation; you become an informant (a dangerous secret) and the organization swears revenge for years.'),
      apply: (s, _r, c) => {
        const id = String(c.loan); const ln = loanOf(s, id); const o = orgOfLoan(s, id);
        ln?.drop();
        endLink(s, id, false);
        addSecret23(s, { kind: 'informant', subject: 'player', sev: 60, ev: 40, data: { o: o?.id ?? '' }, base: { p: 4 } });
        if (o) {
          grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 80, months: 60, src: 'shark27', ref: `cop:${id}`, text: fmtL(N('Você entregou {o} à polícia', 'You handed {o} to the police'), { o: o.name }) });
          crime17(s).org[o.id] = clamp((crime17(s).org[o.id] ?? 0) - 60, -100, 100);
          shark27(s).rev[o.id] = s.week + 260;
        }
        s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
        logIt(s, N('Você foi à polícia. A dívida evaporou; o medo, não.', 'You went to the police. The debt evaporated; the fear did not.'));
      } },
    { id: 'ignore', label: N('Fingir que não é com você', 'Pretend it is not your problem'), hint: N('Eles voltam: saúde −10, estresse +15, levam 15% do caixa e assustam a equipe; vira boato.', 'They come back: health −10, stress +15, they take 15% of cash and scare the staff; it becomes a rumor.'),
      apply: (s, _r, c) => {
        const o = ownerOf(s);
        o.health = clamp(o.health - 10, 0, 100); o.stress = clamp(o.stress + 15, 0, 100);
        const take = Math.round(Math.max(0, s.player.cash) * 0.15);
        const ln = loanOf(s, String(c.loan));
        if (take > 0) { post(s, `shark27take:${c.loan}:${s.week}`, -take, 'misc', 'Cobrança do agiota (levaram do caixa)'); if (ln) ln.set(ln.bal() - take); }
        for (const m of s.player.staff) { const cr = P(s).career[m.id]; if (cr) cr.loyalty = clamp(cr.loyalty - 3, 0, 100); }
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
        const org = orgOfLoan(s, String(c.loan));
        const t = fmtL(N('Cobradores de {o} levam dinheiro da sede de {c} na frente da equipe.', 'Collectors from {o} take cash from {c}\'s HQ in front of the staff.'), { o: org?.name ?? N('um agiota', 'a loan shark'), c: s.config.companyName });
        emitFact(s, { kind: 'crime', actors: [org?.key ?? 'shark', 'player'], place: s.config.homeCity, severity: 40, visibility: 'rumor', tags: ['shark', 'collection', 'bad'], text: t, src: 'shark27' });
        remember(s, 'vice', t, { important: true });
      } },
  ],
}];
deferEvents<EventDef>(SHARK_EVS27);

// ---------------------------------------------------------------- NPCs

const NPC_CAP = 60;
/** Mês dos NPCs: selos no vermelho e artistas viciados pegam dinheiro; cobranças de quem não paga. */
function npcMonth(s: GameState): void {
  const st = shark27(s);
  const strict = histMode(s) === 'strict';
  const r = rngK(s, 'npc');
  const n = Object.keys(st.npc).length;
  if (n < NPC_CAP) {
    // selos de NPC no vermelho
    for (const lb of Object.values(s.labels)) {
      if (!lb.active || lb.cash >= 0 || st.npc[`lb:${lb.id}`]) continue;
      const real = isReal(s, lb.id);
      if (real && strict) continue;
      if (!r.chance(0.03)) continue;
      const o = lenderOrg27(s, lb.city, `lb:${lb.id}`);
      if (!o || o.a3 !== a3Of(s, lb.city)) continue;
      const amt = money(s, 20000 + r.int(0, 6) * 5000);
      lb.cash += amt;
      addSecret23(s, { kind: 'shark', subject: `lb:${lb.id}`, sev: 40, ev: 35, real, data: { o: o.id, amt } });
      grantHold(s, { holder: o.key, target: lb.id, kind: 'debt', strength: 50, months: 36, src: 'shark27', quiet: true, text: N('O selo pegou dinheiro com a organização', 'The label borrowed from the organization') });
      st.npc[`lb:${lb.id}`] = { o: o.id, w: s.week, amt, miss: 0, last: -99 };
    }
    // artistas viciados (dinheiro para o vício) — de qualquer selo, inclusive o seu
    for (const a of actsNow27(s)) {
      if ((a.status !== 'active' && a.status !== 'emerging') || a.fame < 10) continue;
      for (const pid of a.members) {
        const p = s.persons[pid];
        const key = `p:${pid}`;
        if (!p?.alive || p.isPlayer || p.health !== 'addiction' || st.npc[key]) continue;
        const real = isReal(s, pid);
        if (real && strict) continue;
        if (!r.chance(0.04) || secretsOf23(s, key).some((x) => x.kind === 'shark')) continue;
        const o = lenderOrg27(s, a.city, key);
        if (!o || o.a3 !== a3Of(s, a.city)) continue;
        const amt = money(s, 1000 + r.int(0, 6) * 500);
        addSecret23(s, { kind: 'shark', subject: key, sev: 35, ev: 40, real, data: { o: o.id, amt } });
        grantHold(s, { holder: o.key, target: pid, kind: 'debt', strength: 45, months: 36, src: 'shark27', quiet: true, text: N('Pegou dinheiro com a organização para o vício', 'Borrowed from the organization to feed a habit') });
        st.npc[key] = { o: o.id, w: s.week, amt, miss: 0, last: -99 };
      }
    }
  }
  // cobranças: dívidas de agiota de NPC (daqui e as nativas do secrets23) com mais de 6 meses
  const owed = sec23(s).own.filter((x) => x.kind === 'shark' && !x.end && x.subject !== 'player' && s.week - x.since >= 26).slice(-40);
  for (const x of owed) collect(s, x, r);
}

function collect(s: GameState, x: Sec23, r: Rng): void {
  const st = shark27(s);
  const e = (st.npc[x.subject] ??= { o: String(x.data?.o ?? ''), w: x.since, amt: Number(x.data?.amt ?? 0), miss: 0, last: -99 });
  const o = e.o ? orgById(s, e.o) : undefined;
  if (x.subject.startsWith('lb:')) {
    const lb = s.labels[x.subject.slice(3)];
    if (!lb?.active) { x.end = s.week; _secrets23.bust(); delete st.npc[x.subject]; return; }
    if (lb.cash > e.amt * 2) { lb.cash -= Math.round(e.amt * 1.3); x.end = s.week; _secrets23.bust(); voidHolds(s, (h) => h.src === 'shark27' && h.target === lb.id); delete st.npc[x.subject]; return; }
    if (s.week - e.last < 13 || !r.chance(0.15)) return;
    e.last = s.week; e.miss++;
    lb.cash -= Math.round(e.amt * 0.3);
    const t = fmtL(N('Cobradores de {o} batem na porta de {l}.', 'Collectors from {o} knock on {l}\'s door.'), { o: o?.name ?? N('um agiota', 'a loan shark'), l: lb.name });
    emitFact(s, { kind: 'crime', actors: [o?.key ?? 'shark', lb.id], place: lb.city, severity: 30, visibility: 'rumor', tags: ['shark', 'collection', 'bad'], text: t, src: 'shark27' });
    raise23(s, x, 'press', 1, 'press');
    // segundo calote: o dono vira associado da organização — o selo passa a ser fachada
    const lead = lb.leaderId;
    if (o && e.miss >= 2 && lead && !mem23(s)[`l:${lead}`] && !(x.real && histMode(s) === 'strict') && !isReal(s, lb.id)) {
      _crimemem23.join(s, `l:${lead}`, o, [N('pagou a dívida com o próprio selo', 'paid the debt with their own label')], r, 'contador');
    }
    return;
  }
  const pid = x.subject.startsWith('p:') ? x.subject.slice(2) : '';
  const p = pid ? s.persons[pid] : undefined;
  if (!p?.alive) { x.end = s.week; _secrets23.bust(); delete st.npc[x.subject]; return; }
  if (s.week - e.last < 13 || !r.chance(0.12)) return;
  e.last = s.week; e.miss++;
  addStress(s, pid, 10, N('Ameaçado(a) por cobradores', 'Threatened by collectors'));
  const a = actsNow27(s).find((y) => y.members.includes(pid) && (y.status === 'active' || y.status === 'emerging'));
  if (a) a.momentum = clamp(a.momentum - 2, -100, 100);
  const t = fmtL(N('{p} recebe "uma visita" de cobradores de {o}.', '{p} gets "a visit" from {o}\'s collectors.'), { p: p.name, o: o?.name ?? N('um agiota', 'a loan shark') });
  emitFact(s, { kind: 'crime', actors: [o?.key ?? 'shark', pid, ...(a ? [a.id] : [])], place: a?.city, severity: 30, visibility: x.real ? 'secret' : 'rumor', tags: ['shark', 'threat', 'bad'], text: t, src: 'shark27' });
  if (!x.real) raise23(s, x, 'press', 1, 'press');
  // dívida que a pessoa não paga vira mão de obra: a organização puxa para dentro (links23 L15 pesa ×2,5)
  if (o && e.miss >= 2) grantHold(s, { holder: o.key, target: pid, kind: 'debt', strength: 60 + e.miss * 5, months: 36, src: 'shark27', quiet: true, text: N('Calote com a organização', 'Defaulted on the organization') });
}

registerSimHook('month', 'shark27', (s) => {
  if (OFF_AUD27.shark) return;
  playerMonth(s);
  npcMonth(s);
  void holds17;
});

export const _shark27 = { playerMonth, npcMonth, collect, endLink };
