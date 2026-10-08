// Vida intensa (rodada 7): empréstimos pessoais e da empresa com credores diferentes, cigarro, bebida e
// drogas (com dependência, abstinência, saúde, polícia e escândalo), reabilitação e viagens pelo mundo.
// Tudo tem consequência e pode mudar os traços do personagem (Dependente, Sóbrio, Fumante, Viajado,
// Endividado). Os NPCs vivem as mesmas tentações em lifecycle7.ts.

import { clamp, type Rng } from '../../core/rng';
import { CITIES, cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { bumpPerks } from '../perks';
import type { GameState } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { energyLeft, playerPerson, spendEnergy } from './life';
import { ownerOf } from './people/owner';
import { persona } from './persona';
import { playerTraitById } from './persona/data';
import { addSignal } from '../worldgen';

// ---------------------------------------------------------------- estado

export type ViceId = 'smoke' | 'drink' | 'drugs';
export type LenderId = 'bank' | 'family' | 'shark';
export type CoLenderId = 'bank' | 'development' | 'angel' | 'shark';

export interface PersonalLoan { id: string; lender: LenderId; principal: number; balance: number; rate: number; monthly: number; missed: number; since: number }
export interface ViceState {
  dep: Record<ViceId, number>;
  /** fuma todo mês (hábito ligado) */
  smoking: boolean;
  usedThisMonth: Partial<Record<ViceId, number>>;
  clean: Record<ViceId, number>; // meses sem usar
  rehab?: { until: number; vice: ViceId };
  loans: PersonalLoan[];
  coLenders: Record<string, CoLenderId>;
  trips: { year: number; dest: string }[];
  heat: number; // atenção da polícia e da imprensa
  log: { week: number; text: L; tone: 'good' | 'bad' | 'info' }[];
}

declare module '../ext4' { interface Ext4 { vices: ViceState } }
registerExt4('vices', () => ({ dep: { smoke: 0, drink: 0, drugs: 0 }, smoking: false, usedThisMonth: {}, clean: { smoke: 0, drink: 0, drugs: 0 }, loans: [], coLenders: {}, trips: [], heat: 0, log: [] }));
export const vices = (s: GameState): ViceState => (s as unknown as { x4: { vices: ViceState } }).x4.vices;

function log(s: GameState, text: L, tone: 'good' | 'bad' | 'info' = 'info', important = false): void {
  const v = vices(s);
  v.log.unshift({ week: s.week, text, tone });
  if (v.log.length > 30) v.log.length = 30;
  if (important) remember(s, 'vice', text, { important: true });
}

/** Ganha um traço conquistado (respeita opostos; no máximo 6 traços no total). */
export function gainTrait(s: GameState, id: string): void {
  const P = persona(s);
  const def = playerTraitById[id];
  if (!def || P.traits.includes(id)) return;
  if (def.opposite) P.traits = P.traits.filter((x) => x !== def.opposite);
  if (P.traits.length >= 6) P.traits.shift();
  P.traits.push(id);
  bumpPerks();
  notify(s, fmtL(l('Novo traço: {t}.', 'New trait: {t}.'), { t: def.name }), 'event');
  log(s, fmtL(l('Você agora é {t}.', 'You are now {t}.'), { t: def.name }), 'info', true);
}

export function loseTrait(s: GameState, id: string): void {
  const P = persona(s);
  if (!P.traits.includes(id)) return;
  P.traits = P.traits.filter((x) => x !== id);
  bumpPerks();
  log(s, fmtL(l('Você deixou de ser {t}.', 'You are no longer {t}.'), { t: playerTraitById[id]?.name ?? l(id) }), 'good');
}

// ---------------------------------------------------------------- vícios

export const VICE_INFO: Record<ViceId, { name: L; desc: L; cost: number; stress: number; health: number; dep: number }> = {
  smoke: { name: l('Cigarro', 'Cigarettes'), desc: l('Acalma um pouco. Vicia, cansa a voz e a saúde (aos poucos).', 'Calms you a bit. Addictive; wears down voice and health (slowly).'), cost: 15, stress: 3, health: 0.6, dep: 7 },
  drink: { name: l('Bebida', 'Drinking'), desc: l('Uma noitada alivia muito o estresse. Ressaca, gastos, risco de escândalo.', 'A night out relieves a lot of stress. Hangovers, spending, scandal risk.'), cost: 120, stress: 10, health: 1.5, dep: 6 },
  drugs: { name: l('Drogas', 'Drugs'), desc: l('Alívio enorme e inspiração momentânea. Dependência rápida, saúde, polícia e escândalo.', 'Huge relief and fleeting inspiration. Fast addiction, health, police and scandal.'), cost: 400, stress: 18, health: 5, dep: 14 },
};

export function drugName(year: number): L {
  return year < 1960 ? l('morfina e anfetaminas', 'morphine and amphetamines') : year < 1975 ? l('LSD e maconha', 'LSD and marijuana') : year < 1995 ? l('cocaína', 'cocaine') : year < 2015 ? l('pílulas e cocaína', 'pills and cocaine') : l('opioides e sintéticos', 'opioids and synthetics');
}

function payWealth(s: GameState, real: number): L | null {
  const o = ownerOf(s);
  const c = money(s, real);
  if (o.wealth < c) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  o.wealth -= c;
  return null;
}

/** Liga/desliga o hábito de fumar (custa um pouco por mês). */
export function toggleSmoking(s: GameState): L | null {
  const v = vices(s);
  if (v.rehab && v.rehab.until > s.week) return l('Você está na reabilitação.', 'You are in rehab.');
  v.smoking = !v.smoking;
  log(s, v.smoking ? l('Você começou a fumar.', 'You started smoking.') : l('Você tenta largar o cigarro.', 'You try to quit smoking.'), v.smoking ? 'bad' : 'good');
  return null;
}

export function indulge(s: GameState, r: Rng, vice: 'drink' | 'drugs'): L | null {
  const v = vices(s);
  if (v.rehab && v.rehab.until > s.week) return l('Você está na reabilitação.', 'You are in rehab.');
  if (s.config.contentFilters.includes('drugs') && vice === 'drugs') return l('Tema desligado nos filtros de conteúdo.', 'Topic disabled in content filters.');
  const e = spendEnergy(s, 1);
  if (e) return e;
  const info = VICE_INFO[vice];
  const err = payWealth(s, info.cost);
  if (err) return err;
  const o = ownerOf(s);
  o.stress = clamp(o.stress - info.stress, 0, 100);
  o.health = clamp(o.health - info.health, 0, 100);
  v.dep[vice] = clamp(v.dep[vice] + info.dep * (persona(s).traits.includes('disciplined') ? 0.6 : 1), 0, 100);
  v.usedThisMonth[vice] = (v.usedThisMonth[vice] ?? 0) + 1;
  v.clean[vice] = 0;
  const p = playerPerson(s);
  if (vice === 'drugs' && p) p.inspiration = clamp(p.inspiration + 15, 0, 100);
  v.heat = clamp(v.heat + (vice === 'drugs' ? 8 : 2), 0, 100);
  // escândalo e polícia
  const famous = Math.max(0, ...Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => a.fame));
  if (r.chance((vice === 'drugs' ? 0.04 : 0.015) + v.heat / 1500 + famous / 3000)) scandal(s, r, vice);
  log(s, vice === 'drugs' ? fmtL(l('Noite de {d}: o estresse some por um tempo.', 'A night of {d}: stress fades for a while.'), { d: drugName(s.year) }) : l('Noitada: você esquece os problemas até amanhã.', 'A big night out: you forget your problems until tomorrow.'), 'info');
  if (v.dep[vice] >= 60) gainTrait(s, 'addicted');
  return null;
}

function scandal(s: GameState, r: Rng, vice: ViceId): void {
  const v = vices(s);
  const arrest = vice === 'drugs' && r.chance(0.35 + v.heat / 300);
  const rep = s.player.reputation;
  rep.institutional = clamp(rep.institutional - (arrest ? 8 : 3), 0, 100);
  rep.artists = clamp(rep.artists - (arrest ? 4 : 1), 0, 100);
  if (arrest) {
    const fine = money(s, 3000 + v.heat * 60);
    post(s, `vice:arrest:${s.week}`, -fine, 'w4_legal', 'Advogados e fiança');
    ownerOf(s).stress = clamp(ownerOf(s).stress + 20, 0, 100);
    v.heat = 0;
    const text = fmtL(l('Preso por porte de {d}. Fiança e advogados saem do caixa da empresa; a imprensa adora.', 'Arrested for possession of {d}. Bail and lawyers come out of company cash; the press loves it.'), { d: drugName(s.year) });
    notify(s, text, 'bad');
    log(s, text, 'bad', true);
  } else {
    const text = vice === 'drink' ? l('Fotografado bêbado saindo de um bar. Manchete constrangedora.', 'Photographed drunk leaving a bar. Embarrassing headline.') : l('Boatos sobre o seu uso de drogas circulam na indústria.', 'Rumours about your drug use spread through the industry.');
    notify(s, text, 'bad');
    log(s, text, 'bad', true);
  }
}

export function rehabCost(s: GameState): number { return money(s, 6000); }

/** Reabilitação: um mês e meio fora, caro, derruba a dependência (recaída possível). */
export function goToRehab(s: GameState): L | null {
  const v = vices(s);
  const worst = (Object.keys(v.dep) as ViceId[]).sort((a, b) => v.dep[b] - v.dep[a])[0];
  if (v.dep[worst] < 20) return l('Você não precisa de reabilitação agora.', 'You do not need rehab right now.');
  if (v.rehab && v.rehab.until > s.week) return l('Já está internado.', 'Already in rehab.');
  const o = ownerOf(s);
  const cost = rehabCost(s);
  if (o.wealth >= cost) o.wealth -= cost;
  else post(s, `rehab:${s.week}`, -cost, 'misc', 'Clínica de reabilitação');
  v.rehab = { until: s.week + 6, vice: worst };
  spendEnergy(s, energyLeft(s));
  log(s, fmtL(l('Você se interna para tratar {v}.', 'You check into rehab for {v}.'), { v: VICE_INFO[worst].name }), 'good', true);
  return null;
}

// ---------------------------------------------------------------- empréstimos pessoais

export const LENDERS: Record<LenderId, { name: L; desc: L; rate: number; months: number; max: (s: GameState) => number }> = {
  bank: { name: l('Banco', 'Bank'), desc: l('Juros razoáveis; exige patrimônio e nome limpo. Atrasos sujam seu nome e podem custar a casa.', 'Fair interest; needs assets and a clean record. Missed payments ruin your credit and may cost your house.'), rate: 0.14, months: 36, max: (s) => Math.max(money(s, 3000), ownerOf(s).wealth * 2 + money(s, 5000 + (ownerOf(s).house + 1) * 15000)) },
  family: { name: l('Família', 'Family'), desc: l('Sem juros, mas cobra em culpa: atrasar azeda a relação e a família desconta no seu estresse.', 'No interest, but guilt is the price: missing payments sours things and stresses you.'), rate: 0, months: 24, max: (s) => money(s, 4000 + ownerOf(s).generation * 1000) },
  shark: { name: l('Agiota', 'Loan shark'), desc: l('Dinheiro na hora, juros absurdos. Atrasou, recebe visita.', 'Cash right now, absurd interest. Miss a payment and you get a visit.'), rate: 0.9, months: 12, max: (s) => money(s, 25000) },
};

function annuity(amount: number, rate: number, months: number): number {
  if (rate <= 0) return Math.ceil(amount / months);
  const i = rate / 12;
  return Math.round((amount * i) / (1 - Math.pow(1 + i, -months)));
}

export function personalLoanBlocker(s: GameState, lender: LenderId, amount: number): L | null {
  const v = vices(s);
  if (amount <= 0) return l('Valor inválido.', 'Invalid amount.');
  if (amount > LENDERS[lender].max(s)) return l('Acima do que este credor empresta para você.', 'More than this lender will lend you.');
  if (v.loans.filter((x) => x.lender === lender).length >= (lender === 'shark' ? 2 : 1)) return l('Você já deve a este credor.', 'You already owe this lender.');
  if (lender === 'bank' && v.loans.some((x) => x.lender === 'bank' && x.missed > 0)) return l('Nome sujo no banco.', 'Bad credit at the bank.');
  if (lender === 'bank' && (s.flags.badCredit ?? 0) > s.week) return l('Nome sujo: o banco não empresta por enquanto.', 'Bad credit: the bank will not lend for now.');
  return null;
}

export function takePersonalLoan(s: GameState, lender: LenderId, amount: number): L | null {
  const err = personalLoanBlocker(s, lender, amount);
  if (err) return err;
  const def = LENDERS[lender];
  const loan: PersonalLoan = { id: nextId(s, 'pl'), lender, principal: amount, balance: amount, rate: def.rate, monthly: annuity(amount, def.rate, def.months), missed: 0, since: s.week };
  vices(s).loans.push(loan);
  ownerOf(s).wealth += amount;
  log(s, fmtL(l('Empréstimo pessoal: {l}.', 'Personal loan: {l}.'), { l: def.name }), lender === 'shark' ? 'bad' : 'info', lender === 'shark');
  return null;
}

export function repayPersonalLoan(s: GameState, id: string): L | null {
  const v = vices(s);
  const loan = v.loans.find((x) => x.id === id);
  if (!loan) return l('Empréstimo não encontrado.', 'Loan not found.');
  const o = ownerOf(s);
  if (o.wealth < loan.balance) return l('Patrimônio insuficiente para quitar.', 'Not enough wealth to pay it off.');
  o.wealth -= loan.balance;
  v.loans = v.loans.filter((x) => x.id !== id);
  log(s, l('Dívida quitada.', 'Debt paid off.'), 'good');
  return null;
}

function loansMonth(s: GameState, r: Rng): void {
  const v = vices(s);
  const o = ownerOf(s);
  for (const loan of [...v.loans]) {
    const interest = Math.round((loan.balance * loan.rate) / 12);
    const due = Math.min(loan.monthly, loan.balance + interest);
    if (o.wealth >= due) {
      o.wealth -= due;
      loan.balance = Math.max(0, loan.balance + interest - due);
      loan.missed = Math.max(0, loan.missed - 0.5);
    } else {
      loan.balance += interest + Math.round(due * 0.05); // multa
      loan.missed += 1;
      o.stress = clamp(o.stress + 6, 0, 100);
      if (loan.lender === 'bank') {
        s.flags.badCredit = s.week + 104;
        if (loan.missed >= 4 && o.house >= 0) {
          o.house = -1;
          loan.balance = Math.round(loan.balance * 0.4);
          log(s, l('O banco tomou a sua casa para cobrir a dívida.', 'The bank repossessed your house to cover the debt.'), 'bad', true);
          notify(s, l('Casa tomada pelo banco.', 'House repossessed by the bank.'), 'bad');
        } else log(s, l('Parcela do banco atrasada: nome sujo por dois anos.', 'Bank payment missed: bad credit for two years.'), 'bad');
      } else if (loan.lender === 'family') {
        o.stress = clamp(o.stress + 6, 0, 100);
        log(s, l('A família cobra a parcela atrasada no almoço de domingo.', 'The family brings up the missed payment at Sunday lunch.'), 'bad');
      } else {
        // agiota: visita, ameaça, saque do caixa da empresa
        o.health = clamp(o.health - 12, 0, 100);
        o.stress = clamp(o.stress + 15, 0, 100);
        if (loan.missed >= 3) {
          const take = Math.min(loan.balance, Math.max(0, s.player.cash) * 0.2);
          if (take > 0) {
            post(s, `shark:${loan.id}:${s.week}`, -Math.round(take), 'misc', 'Pagamento forçado (agiota)');
            loan.balance -= Math.round(take);
          }
          s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
          log(s, l('Os homens do agiota apareceram na sede. Levaram dinheiro do caixa e assustaram a equipe.', "The loan shark's men showed up at HQ. They took company cash and scared the staff."), 'bad', true);
        } else log(s, l('Recado do agiota: "a próxima é pessoalmente".', 'A message from the loan shark: "next time it\'s in person".'), 'bad');
        if (r.chance(0.1)) notify(s, l('Você está sendo ameaçado por um agiota.', 'You are being threatened by a loan shark.'), 'bad');
      }
    }
    if (loan.balance <= 0) {
      v.loans = v.loans.filter((x) => x.id !== loan.id);
      log(s, fmtL(l('Dívida com {l} quitada.', 'Debt with {l} paid off.'), { l: LENDERS[loan.lender].name }), 'good');
    }
  }
  const owed = v.loans.reduce((t, x) => t + x.balance, 0);
  if (owed > money(s, 30000) || v.loans.some((x) => x.missed >= 2)) gainTrait(s, 'indebted');
  else if (!v.loans.length) loseTrait(s, 'indebted');
}

// ---------------------------------------------------------------- empréstimos da empresa

export const CO_LENDERS: Record<CoLenderId, { name: L; desc: L; months: number; rate: (s: GameState) => number; amount: (s: GameState) => number; need?: (s: GameState) => L | null }> = {
  bank: { name: l('Banco comercial', 'Commercial bank'), desc: l('Juros pela reputação comercial e institucional.', 'Interest set by commercial and institutional reputation.'), months: 36,
    rate: (s) => clamp(0.16 - (s.player.reputation.commercial + s.player.reputation.institutional) / 1500 + (s.economy.recession ? 0.04 : 0), 0.05, 0.25),
    amount: (s) => money(s, 20000 + (s.player.reputation.commercial + s.player.reputation.institutional) * 600 + s.player.hq * 30000) },
  development: { name: l('Fomento à cultura', 'Cultural development fund'), desc: l('Juros baixos e prazo longo; exige reputação artística e institucional altas.', 'Low interest, long term; needs high artistic and institutional reputation.'), months: 60,
    rate: () => 0.04, amount: (s) => money(s, 40000 + s.player.reputation.artistic * 500),
    need: (s) => (s.player.reputation.artistic < 55 || s.player.reputation.institutional < 45 ? l('Precisa de reputação artística 55 e institucional 45.', 'Needs artistic reputation 55 and institutional 45.') : s.year < 1950 ? l('Ainda não existe.', 'Does not exist yet.') : null) },
  angel: { name: l('Dívida conversível (investidor)', 'Convertible debt (investor)'), desc: l('Juros médios; se atrasar, o investidor vira sócio.', 'Mid interest; miss payments and the investor becomes a partner.'), months: 24,
    rate: () => 0.1, amount: (s) => money(s, 60000 + s.player.hq * 40000) },
  shark: { name: l('Agiota empresarial', 'Business loan shark'), desc: l('Sem perguntas, juros absurdos. Para quem não tem mais a quem recorrer.', 'No questions, absurd interest. For those with nowhere else to go.'), months: 12,
    rate: () => 0.7, amount: (s) => money(s, 50000) },
};

export function companyLoanBlocker(s: GameState, id: CoLenderId): L | null {
  const def = CO_LENDERS[id];
  if (s.player.loans.length >= 4) return l('Já há empréstimos demais.', 'Too many loans already.');
  if (Object.values(vices(s).coLenders).includes(id) && s.player.loans.some((x) => vices(s).coLenders[x.id] === id)) return l('Já existe um empréstimo deste credor.', 'There is already a loan from this lender.');
  if (id === 'bank' && (s.flags.badCredit ?? 0) > s.week) return l('Nome sujo: o banco não empresta.', 'Bad credit: the bank will not lend.');
  return def.need?.(s) ?? null;
}

export function takeCompanyLoan(s: GameState, id: CoLenderId): L | null {
  const err = companyLoanBlocker(s, id);
  if (err) return err;
  const def = CO_LENDERS[id];
  const amount = def.amount(s);
  const rate = def.rate(s);
  const loanId = nextId(s, 'ln');
  s.player.loans.push({ id: loanId, principal: amount, balance: amount, rate, monthly: annuity(amount, rate, def.months), startWeek: s.week });
  vices(s).coLenders[loanId] = id;
  post(s, `loan_in:${loanId}`, amount, 'financing', `Empréstimo: ${def.name.pt}`);
  return null;
}

function companyLoansMonth(s: GameState): void {
  const v = vices(s);
  for (const loan of s.player.loans) {
    const kind = v.coLenders[loan.id];
    if (!kind) continue;
    // caixa negativo = parcela não paga de verdade
    if (s.player.cash < 0) {
      if (kind === 'shark') {
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
        ownerOf(s).stress = clamp(ownerOf(s).stress + 10, 0, 100);
        log(s, l('O agiota da empresa mandou recado para a sua família.', "The company's loan shark sent a message to your family."), 'bad');
      }
      if (kind === 'angel') {
        s.economy.investorShare = Math.min(0.49, s.economy.investorShare + 0.03);
        log(s, l('Parcela atrasada: o credor converteu parte da dívida em participação na empresa.', 'Missed payment: the lender converted part of the debt into equity.'), 'bad', true);
        loan.balance = Math.round(loan.balance * 0.85);
      }
    }
  }
  for (const id of Object.keys(v.coLenders)) if (!s.player.loans.some((x) => x.id === id)) delete v.coLenders[id];
}

// ---------------------------------------------------------------- viagens

export interface TripDef { id: string; city: string; name: L; desc: L; cost: number; stress: number; health: number; trait?: string; from?: number; inspiration: number }

export const TRIPS: TripDef[] = [
  { id: 'paris', city: 'paris', name: l('Paris', 'Paris'), desc: l('Museus, cafés e chanson: inspiração e prestígio.', 'Museums, cafés and chanson: inspiration and prestige.'), cost: 3500, stress: 22, health: 3, inspiration: 15 },
  { id: 'new_york', city: 'new_york', name: l('Nova York', 'New York'), desc: l('Clubes de jazz, hip hop e negócios: contatos da indústria.', 'Jazz clubs, hip hop and deals: industry contacts.'), cost: 4000, stress: 15, health: 0, inspiration: 12 },
  { id: 'rio', city: 'rio', name: l('Rio de Janeiro', 'Rio de Janeiro'), desc: l('Praia, samba e bossa: descanso e ritmo.', 'Beach, samba and bossa: rest and rhythm.'), cost: 2500, stress: 30, health: 6, inspiration: 12 },
  { id: 'tokyo', city: 'tokyo', name: l('Tóquio', 'Tokyo'), desc: l('Lojas de discos e tecnologia: vê o futuro antes.', 'Record shops and tech: see the future first.'), cost: 5000, stress: 18, health: 2, inspiration: 14, from: 1960 },
  { id: 'india', city: 'mumbai', name: l('Retiro na Índia', 'Retreat in India'), desc: l('Meditação e música clássica indiana. Pode mudar você.', 'Meditation and Indian classical music. It may change you.'), cost: 3000, stress: 40, health: 8, trait: 'spiritual', inspiration: 18 },
  { id: 'ibiza', city: 'ibiza', name: l('Ibiza', 'Ibiza'), desc: l('Festas sem fim e DJs: nada relaxa, tudo inspira — e tenta.', 'Endless parties and DJs: nothing relaxes, everything inspires — and tempts.'), cost: 3500, stress: 10, health: -6, trait: 'bohemian', inspiration: 16, from: 1975 },
  { id: 'kingston', city: 'kingston', name: l('Jamaica', 'Jamaica'), desc: l('Sound systems e estúdios lendários.', 'Sound systems and legendary studios.'), cost: 2800, stress: 26, health: 4, inspiration: 14, from: 1960 },
  { id: 'lagos', city: 'lagos', name: l('Lagos', 'Lagos'), desc: l('A cena mais quente da África.', 'The hottest scene in Africa.'), cost: 2600, stress: 12, health: 0, inspiration: 15, from: 1965 },
  { id: 'nashville', city: 'nashville', name: l('Nashville', 'Nashville'), desc: l('Compositores em cada esquina.', 'Songwriters on every corner.'), cost: 2200, stress: 18, health: 2, inspiration: 13 },
  { id: 'seoul', city: 'seoul', name: l('Seul', 'Seoul'), desc: l('Fábricas de ídolos e uma indústria disciplinada.', 'Idol factories and a disciplined industry.'), cost: 4500, stress: 14, health: 1, inspiration: 12, from: 1995 },
];
export const tripById: Record<string, TripDef> = Object.fromEntries(TRIPS.map((x) => [x.id, x]));

export function tripBlocker(s: GameState, id: string): L | null {
  const tp = tripById[id];
  if (!tp) return l('Destino inválido.', 'Invalid destination.');
  if (tp.from && s.year < tp.from) return l('Ainda não é um destino nesta época.', 'Not a destination in this era yet.');
  if (vices(s).rehab && vices(s).rehab!.until > s.week) return l('Você está na reabilitação.', 'You are in rehab.');
  if (energyLeft(s) < 2) return l('Precisa de 2 de tempo livre.', 'Needs 2 free time.');
  if (ownerOf(s).wealth < money(s, tp.cost)) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  return null;
}

export function takeTrip(s: GameState, r: Rng, id: string): L | null {
  const err = tripBlocker(s, id);
  if (err) return err;
  const tp = tripById[id];
  spendEnergy(s, 2);
  ownerOf(s).wealth -= money(s, tp.cost);
  const o = ownerOf(s);
  o.stress = clamp(o.stress - tp.stress, 0, 100);
  o.health = clamp(o.health + tp.health, 0, 100);
  const p = playerPerson(s);
  if (p) {
    p.inspiration = clamp(p.inspiration + tp.inspiration, 0, 100);
    p.skills.comp = clamp(p.skills.comp + 0.5, 0, 100);
  }
  const v = vices(s);
  v.trips.push({ year: s.year, dest: id });
  if (v.trips.length > 40) v.trips.shift();
  // cena local: novos sinais de artistas da cidade
  const locals = Object.values(s.acts).filter((a) => a.city === tp.city && !a.owner && (a.status === 'active' || a.status === 'emerging') && !s.knowledge[a.id]);
  for (const a of r.shuffle(locals).slice(0, 2)) addSignal(s, r, a.id, 'trip');
  if (tp.trait && r.chance(0.35)) gainTrait(s, tp.trait);
  if (new Set(v.trips.map((x) => x.dest)).size >= 4) gainTrait(s, 'worldly');
  if (id === 'ibiza' && r.chance(0.3)) { v.dep.drugs = clamp(v.dep.drugs + 8, 0, 100); v.dep.drink = clamp(v.dep.drink + 8, 0, 100); }
  log(s, fmtL(l('Viagem para {c}: {d}', 'Trip to {c}: {d}'), { c: cityById[tp.city]?.name ?? tp.name, d: tp.desc }), 'good', true);
  return null;
}

// ---------------------------------------------------------------- mês

function vicesMonth(s: GameState, r: Rng): void {
  const v = vices(s);
  const o = ownerOf(s);
  const P = persona(s);
  const inRehab = !!v.rehab && v.rehab.until > s.week;
  if (v.smoking && !inRehab) {
    const cost = money(s, VICE_INFO.smoke.cost);
    if (o.wealth >= cost) o.wealth -= cost;
    o.stress = clamp(o.stress - VICE_INFO.smoke.stress, 0, 100);
    o.health = clamp(o.health - VICE_INFO.smoke.health, 0, 100);
    v.dep.smoke = clamp(v.dep.smoke + VICE_INFO.smoke.dep, 0, 100);
    const p = playerPerson(s);
    if (p) p.skills.voice = Math.max(5, p.skills.voice - 0.15);
    v.clean.smoke = 0;
    if (v.dep.smoke >= 40) gainTrait(s, 'smoker');
  }
  for (const k of Object.keys(v.dep) as ViceId[]) {
    const used = k === 'smoke' ? v.smoking && !inRehab : (v.usedThisMonth[k] ?? 0) > 0;
    if (used) continue;
    v.clean[k] += 1;
    // abstinência: quem depende sofre sem
    if (v.dep[k] > 25 && !inRehab) o.stress = clamp(o.stress + v.dep[k] / 12, 0, 100);
    v.dep[k] = clamp(v.dep[k] - (inRehab ? 18 : 3), 0, 100);
    if (k === 'smoke' && v.clean.smoke >= 12 && P.traits.includes('smoker')) loseTrait(s, 'smoker');
  }
  // vencer a dependência
  if (P.traits.includes('addicted') && v.dep.drink < 15 && v.dep.drugs < 15 && v.clean.drugs >= 12 && v.clean.drink >= 12) {
    loseTrait(s, 'addicted');
    gainTrait(s, 'sober');
  }
  // dependência alta: recaída automática e saúde
  if (!inRehab && v.dep.drugs >= 70 && r.chance(0.4)) {
    o.health = clamp(o.health - 6, 0, 100);
    v.usedThisMonth.drugs = 1;
    log(s, l('Recaída: você usou de novo sem conseguir evitar.', 'Relapse: you used again without being able to stop.'), 'bad');
  }
  // fim da reabilitação
  if (v.rehab && v.rehab.until <= s.week) {
    const ok = r.chance(P.traits.includes('disciplined') ? 0.8 : 0.6);
    log(s, ok ? l('Você sai da reabilitação limpo e decidido.', 'You leave rehab clean and determined.') : l('Você sai da reabilitação, mas a vontade continua.', 'You leave rehab, but the craving remains.'), ok ? 'good' : 'bad', true);
    if (!ok) for (const k of Object.keys(v.dep) as ViceId[]) v.dep[k] = Math.max(v.dep[k], 30);
    v.rehab = undefined;
  }
  // saúde no limite: internação
  if (o.health < 15) {
    const cost = money(s, 5000);
    if (o.wealth >= cost) o.wealth -= cost;
    else post(s, `hospital:${s.week}`, -cost, 'misc', 'Internação hospitalar');
    o.health = 35;
    o.stress = clamp(o.stress + 10, 0, 100);
    const text = l('Internado às pressas: o corpo cobrou a conta. Os médicos mandam desacelerar.', 'Rushed to hospital: your body sent the bill. Doctors say slow down.');
    notify(s, text, 'bad');
    log(s, text, 'bad', true);
  }
  v.heat = Math.max(0, v.heat - 4);
  v.usedThisMonth = {};
}

registerSimHook('month', 'vices', (s, r) => {
  vicesMonth(s, r);
  loansMonth(s, r);
  companyLoansMonth(s);
});

export const randomTripCity = (r: Rng) => r.pick(CITIES).id;
