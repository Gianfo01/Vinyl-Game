// R31 · onda 5 (ACOES5, EXP-13) — CATÁLOGO das ações, números e linhas dos cartões de ação.
// Fonte única: cada ação chama a função de hoje (a mesma que o botão da página antiga chama) e guarda a referência em
// `fn` + o módulo em `src` (o teste confere que é a mesma exportação). Escolhas que a página antiga pede (qual artista,
// qual projeto, quanto) usam o padrão dela: artista selecionado ou o 1º do elenco; o 1º item elegível da lista; o valor
// inicial do campo. O bloqueio é o motivo que a própria regra de hoje devolve (mostrado no botão antes do clique).
// Montar números, linhas e travas só lê o estado.

import { l, MARKETS, type L, type MarketId } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rng19 } from '../../sim/rng19';
import { playerActs } from '../../sim/util';
import { lock31, UNLOCK31 } from '../../sim/r31/lock';
import { pendingList } from '../../sim/r31/pending';
import { freeCash20, position20 } from '../../sim/oblig20';
import { fin18, mIdx18, netProfit18 } from '../../sim/ledger18';
import { lastMonthView23 } from '../../sim/close23';
import { upgradeHq, takeLoan, loanOffer, openTerritory } from '../../sim/economy';
import { hqBlocker } from '../../sim/branches';
import { upgradeCost } from '../../sim/economy';
import { resolveDecision } from '../../sim/events';
import { restDay, vacation as vacationTime, network, setInv } from '../../sim/sys/agenda17';
import { vacation as vacationPaid, ownerOf } from '../../sim/sys/people/owner';
import { energyLeft, gym, life, maxEnergy, playerPerson, practice, therapy, writeAlone, familyTime, goOnDate } from '../../sim/sys/life';
import { injectCapital, lendToCompany, ownerShare, seekInvestors, withdrawFromCompany } from '../../sim/sys/capital';
import { COURSES, appear, APPEARANCES, buyGood, courseBlocker, GOODS, goodAvailable, goodPrice, lecture, study, type CourseId } from '../../sim/sys/goods8';
import { askLock31 } from '../../sim/sys/amor31';
import { knownPeople31 } from '../../sim/r31/items31';
import { myKnown31 } from '../../sim/sys/social31sys';
import { repayPersonalLoan } from '../../sim/sys/vices';
import { markRead, unreadCount } from '../../sim/sys/people/inbox';
import { feed17 } from '../../sim/sys/media17';
import { tvAppearance } from '../../sim/media';
import { nextGoals } from '../../sim/legacy';
import { liveOf } from '../../sim/sys/live/state';
import { famLock31, luciaLunch31 } from '../../sim/sys/fossati31';
import { answerAsk31, asks31 } from '../../sim/deleg31';
import { openProjects, projectStage, recordNow, scheduleProject } from '../../sim/sys/project8';
import { unrecorded } from '../../sim/production';
import { remaster } from '../../sim/sys/creation/core';
import { trainStaff } from '../../sim/sys/people/staff';
import { buildPlant } from '../../sim/sys/industry/supply';
import { campaign18 } from '../../sim/sys/awards18';
import { activeMgrs, lunch, lunchBlock } from '../../sim/sys/managers14';
import { activeProds, dinner, dinnerBlock } from '../../sim/sys/producers15';
import { chNow18, dig18 } from '../../sim/sys/discover18';
import { goOut14, spotsHere14, wentThisMonth, type Spot14 } from '../../sim/sys/leisure14';
import { acceptInvite, fest8 } from '../../sim/sys/fests8';
import { asks29, fulfill29 } from '../../sim/sys/mob29';
import { crime17 } from '../../sim/sys/crime17';
import { lobbyCouncil18 } from '../../sim/sys/society18';
import { buyErr31, buyOffer31, shopRows31 } from '../../sim/r31/items31';
import { careers, AMBITIONS } from '../../sim/sys/careers12';
import { startDate17 } from '../../sim/sys/scene17';
import { s17 } from '../../sim/sys/scene17';
import { $, rerender } from '../common';
import { store } from '../store';
import { openLook31 } from './look31ui';
import { openAsk31 } from './amor31ui';
import { openPersonPage } from '../pages';
import { openOffer } from '../ficha';
import { openFicha13 } from '../sys/persona13';
import { chooseAction20, openRecord20 } from '../sys/actmenu20';
import { compose23 } from '../sys/journey23';
import { reserveDialog } from '../panels/central';
import { openFos31 } from './fos31';
import { openCareer } from '../sys/careerui13';
import { openCutscene } from '../registry';
import { goDest31 } from './quick31';
import { travelGo5 } from './nav5';
import type { ActDef5, ActRes5, NumDef5, NumOut5 } from './acoes5model';

// ---------------------------------------------------------------- ajudas

/** Resultado da função de hoje → frase do toast (null/true = ok; L = erro; {ok,text} / {text}). */
function res5(x: unknown, ok: L): ActRes5 {
  if (x == null || x === true) return { text: ok };
  if (x === false) return { text: l('Não deu agora.', 'Not possible right now.'), bad: true };
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if ('pt' in o && 'en' in o) return { text: o as unknown as L, bad: true };
    if ('text' in o) return { text: o.text as L, bad: 'ok' in o ? !o.ok : false };
  }
  return { text: ok };
}
const act5 = (s: GameState): string | undefined => {
  const xs = playerActs(s);
  return store.selectedAct && xs.includes(store.selectedAct) ? store.selectedAct : xs[0];
};
const noAct = l('Você ainda não tem artista no elenco.', 'You have no act on the roster yet.');
const actLock = (s: GameState) => (act5(s) ? null : lock31(noAct, UNLOCK31.roster));
const pid5 = (s: GameState): string | undefined => playerPerson(s)?.id;
const R = (s: GameState) => rng19(s, 'act');
const pct = (v: number): number => Math.max(0, Math.min(1, v / 100));
const dots = (n: number, of: number): string => '●'.repeat(Math.max(0, n)) + '○'.repeat(Math.max(0, of - n));
const fame5 = (s: GameState): number => { const r = s.player.reputation; return Math.round((r.artistic + r.commercial + r.artists + r.institutional) / 4); };

/** Ação que chama uma função de hoje e mostra o retorno dela. */
function D(label: L, src: [string, string], fn: (...a: never[]) => unknown, call: (s: GameState) => unknown, ok: L, o: Partial<ActDef5> = {}): ActDef5 {
  return { label, kind: 'do', src, fn, run: (s) => res5(call(s), ok), same: (s) => { call(s); }, ...o };
}
/** Ação que abre um diálogo pequeno de hoje (editor de aparência, proposta, gravar…). */
function U(label: L, src: [string, string], fn: (...a: never[]) => unknown, call: (s: GameState) => void, o: Partial<ActDef5> = {}): ActDef5 {
  return { label, kind: 'ui', src, fn, run: (s, c) => { c.close(); call(s); }, ...o };
}
/** "abrir ▸": papel de outro objeto (ou do próprio). */
const O = (label: L, obj: string): ActDef5 => ({ label, kind: 'open', obj });

// escolhas padrão da página antiga
const course5 = (s: GameState): CourseId | undefined => (Object.keys(COURSES) as CourseId[]).find((id) => s.year >= COURSES[id].from && !courseBlocker(s, id));
const appear5 = (s: GameState) => (Object.keys(APPEARANCES) as (keyof typeof APPEARANCES)[]).find((k) => s.year >= APPEARANCES[k].from && (APPEARANCES[k].to ?? 9999) >= s.year);
const date5 = (s: GameState): string | undefined => knownPeople31(s, 40).find((id) => !askLock31(s, `p:${id}`));
const vehicle5 = (s: GameState) => GOODS.filter((d) => d.cat === 'vehicle' && goodAvailable(s, d)).sort((a, b) => goodPrice(s, a) - goodPrice(s, b))[0];
const personalLoan5 = (s: GameState): string | undefined => ((s.x4 as unknown as { vices?: { loans?: { id: string }[] } }).vices?.loans ?? [])[0]?.id;
const proj5 = (s: GameState, st: string) => { const a = act5(s); return a ? openProjects(s, a).find((p) => projectStage(s, p) === st) : undefined; };
const mgr5 = (s: GameState) => activeMgrs(s)[0];
const prod5 = (s: GameState) => activeProds(s)[0];
const spot5 = (s: GameState, k: Spot14): Spot14 | undefined => (spotsHere14(s).includes(k) ? k : undefined);
const remaster5 = (s: GameState): string | undefined => Object.values(s.releases).filter((r) => r.owner === 'player' && s.year - r.year >= 8).map((r) => r.id)[0];
const rel5 = (s: GameState): string | undefined => Object.values(s.releases).filter((r) => r.owner === 'player').sort((a, b) => b.week - a.week)[0]?.id;
const shop5 = (s: GameState) => shopRows31(s, s.config.homeCity).sort((a, b) => a.price - b.price)[0];
const invite5 = (s: GameState) => fest8(s).invites.find((x) => x.expires > s.week);
const none = (what: L) => lock31(what, UNLOCK31.generic);

// ---------------------------------------------------------------- AÇÕES

const A: Record<string, ActDef5> = {
  // vida pessoal (casa)
  aparencia: U(l('Cuidar da aparência', 'Take care of looks'), ['ui/r31/look31ui', 'openLook31'], openLook31, (s) => { const p = pid5(s); if (p) openLook31(s, p); },
    { lock: (s) => (pid5(s) ? null : none(l('Sem personagem.', 'No character.'))) }),
  ficha: U(l('Sua ficha', 'Your sheet'), ['ui/pages', 'openPersonPage'], openPersonPage, (s) => { const p = pid5(s); if (p) openPersonPage(p); }),
  descansar: D(l('Dia de folga (1 ●)', 'Day off (1 ●)'), ['sim/sys/agenda17', 'restDay'], restDay, (s) => restDay(s), l('Descansou.', 'Rested.'),
    { lock: (s) => (energyLeft(s) < 1 ? lock31(l('Sem tempo livre este mês.', 'No free time this month.'), UNLOCK31.agenda) : null), home: 'cama' }),
  ferias: D(l('Tirar férias (todo o tempo livre)', 'Take a holiday (all free time)'), ['sim/sys/agenda17', 'vacation'], vacationTime, (s) => vacationTime(s), l('Férias tiradas.', 'Holiday taken.'),
    { lock: (s) => (energyLeft(s) < 3 ? lock31(l('Precisa de 3 ● livres.', 'Needs 3 free ●.'), UNLOCK31.agenda) : null), home: 'cama' }),
  feriasPagas: D(l('Viagem de férias (paga)', 'Paid holiday trip'), ['sim/sys/people/owner', 'vacation'], vacationPaid, (s) => vacationPaid(s), l('Boa viagem!', 'Have a good trip!'),
    { lock: (s) => ((ownerOf(s).vacationUntil ?? 0) > s.week ? lock31(l('Você já está de férias.', 'You are already on holiday.'), UNLOCK31.generic) : null), home: 'cama' }),
  academia: D(l('Academia', 'Gym'), ['sim/sys/life', 'gym'], gym, (s) => gym(s), l('Treino feito.', 'Workout done.'), { home: 'casa.sofa' }),
  terapia: D(l('Terapia', 'Therapy'), ['sim/sys/life', 'therapy'], therapy, (s) => therapy(s), l('Sessão feita.', 'Session done.'), { home: 'cama' }),
  praticar: D(l('Praticar (1 ●)', 'Practise (1 ●)'), ['sim/sys/life', 'practice'], practice, (s) => practice(s), l('Praticou.', 'Practised.'), { home: 'casa.instrumento' }),
  comporSozinho: D(l('Compor sozinho', 'Write alone'), ['sim/sys/life', 'writeAlone'], writeAlone, (s) => writeAlone(s, R(s)), l('Canção nova na gaveta.', 'New song in the drawer.'), { home: 'casa.instrumento' }),
  transferir: D(l('Pôr US$ 5 mil na empresa', 'Put US$ 5k into the company'), ['sim/sys/capital', 'injectCapital'], injectCapital, (s) => injectCapital(s, 5000), l('Dinheiro aplicado na empresa.', 'Money put into the company.'), { home: 'cofrecasa' }),
  emprestarEmpresa: D(l('Emprestar US$ 5 mil à empresa', 'Lend US$ 5k to the company'), ['sim/sys/capital', 'lendToCompany'], lendToCompany, (s) => lendToCompany(s, 5000), l('Empréstimo feito.', 'Loan made.'), { home: 'cofrecasa' }),
  retirar: D(l('Retirar US$ 5 mil (imposto 20%)', 'Withdraw US$ 5k (20% tax)'), ['sim/sys/capital', 'withdrawFromCompany'], withdrawFromCompany, (s) => withdrawFromCompany(s, R(s), 5000), l('Dinheiro no seu bolso.', 'Money in your pocket.'), { home: 'cofrecasa' }),
  estudar: D(l('Assistir aula', 'Attend a class'), ['sim/sys/goods8', 'study'], study, (s) => study(s, course5(s)!), l('Aula feita.', 'Class done.'),
    { lock: (s) => (course5(s) ? null : none(l('Nenhum curso disponível agora.', 'No course available now.'))), home: 'calcozinha' }),
  aparicao: D(l('Aparição pública', 'Public appearance'), ['sim/sys/goods8', 'appear'], appear, (s) => appear(s, R(s), appear5(s)!), l('Apareceu.', 'Appeared.'),
    { lock: (s) => (appear5(s) ? null : none(l('Nenhuma aparição nesta época.', 'No appearance in this era.'))), home: 'calcozinha' }),
  palestra: D(l('Dar palestra', 'Give a lecture'), ['sim/sys/goods8', 'lecture'], lecture, (s) => lecture(s), l('Palestra dada.', 'Lecture given.'), { home: 'calcozinha' }),
  encontro: D(l('Jantar a dois', 'Dinner date'), ['sim/sys/life', 'goOnDate'], goOnDate, (s) => goOnDate(s, R(s), 'dinner'), l('Bom encontro.', 'Nice date.'),
    { when: (s) => !!life(s).partner, home: 'retratoscasa' }),
  familia: D(l('Tempo com a família', 'Family time'), ['sim/sys/life', 'familyTime'], familyTime, (s) => familyTime(s), l('Tempo em família.', 'Family time.'), { home: 'retratoscasa' }),
  chamarSair: U(l('Chamar para sair', 'Ask out'), ['ui/r31/amor31ui', 'openAsk31'], openAsk31, (s) => { const id = date5(s); if (id) openAsk31(s, `p:${id}`); },
    { lock: (s) => (date5(s) ? null : none(l('Ninguém conhecido para chamar agora.', 'Nobody you know to ask now.'))) }),
  ligar: U(l('Ligar para um contato', 'Call a contact'), ['ui/sys/persona13', 'openFicha13'], openFicha13, (s) => { const k = myKnown31(s)[0]; if (k) openFicha13(k.kind === 'person' ? `p:${k.id}` : k.id); },
    { lock: (s) => (myKnown31(s).length ? null : none(l('Sem contatos ainda.', 'No contacts yet.'))) }),
  encontroCena: U(l('Planejar um encontro', 'Plan a date'), ['sim/sys/scene17', 'startDate17'], startDate17, (s) => {
    const id = startDate17(s);
    const cs = typeof id === 'string' ? s.cutscenes.find((c) => c.id === id) : undefined;
    if (cs) openCutscene(s, cs, rerender);
  }, { when: (s) => !!life(s).partner }),
  veiculo: D(l('Comprar o veículo mais barato', 'Buy the cheapest vehicle'), ['sim/sys/goods8', 'buyGood'], buyGood, (s) => buyGood(s, vehicle5(s)!.id, 'me'), l('Veículo na garagem.', 'Vehicle in the garage.'),
    { lock: (s) => { const v = vehicle5(s); if (!v) return none(l('Nenhum veículo à venda.', 'No vehicle for sale.')); return ownerOf(s).wealth < goodPrice(s, v) ? lock31(l(`Custa ${$(goodPrice(s, v))}.`, `Costs ${$(goodPrice(s, v))}.`), UNLOCK31.cash) : null; }, home: 'garagem' }),
  sairNoite: D(l('Sair para o bar', 'Go to the bar'), ['sim/sys/leisure14', 'goOut14'], goOut14, (s) => goOut14(s, 'bar'), l('Noite fora.', 'Night out.'),
    { lock: (s) => (!spot5(s, 'bar') ? none(l('Não há bar aqui.', 'No bar here.')) : wentThisMonth(s, 'bar') ? lock31(l('Já foi este mês.', 'Already went this month.'), UNLOCK31.agenda) : energyLeft(s) < 1 ? lock31(l('Sem tempo livre.', 'No free time.'), UNLOCK31.agenda) : null), home: 'bar' }),
  irCidade: U(l('Sair para a cidade', 'Go out to the city'), ['ui/r31/nav5', 'travelGo5'], travelGo5, (s) => { travelGo5(s, 'cidade'); }),
  irMundo: U(l('Ver o mundo', 'See the world'), ['ui/r31/nav5', 'travelGo5'], travelGo5, (s) => { travelGo5(s, 'mundo'); }),
  irCasa: U(l('Ir para casa', 'Go home'), ['ui/r31/nav5', 'travelGo5'], travelGo5, (s) => { travelGo5(s, 'casa'); }),
  carreiras: U(l('Suas outras carreiras', 'Your other careers'), ['ui/sys/careerui13', 'openCareer'], openCareer, (s) => openCareer(careers(s).active[1] ?? careers(s).active[0] ?? 'label')),
  // sede
  decidirMes: D(l('Decidir a 1ª pendência (padrão)', 'Settle the 1st decision (default)'), ['sim/events', 'resolveDecision'], resolveDecision, (s) => { const d = s.decisions[0]; return resolveDecision(s, d.id, d.defaultOption ?? d.options[0].id); }, l('Decidido.', 'Decided.'),
    { lock: (s) => (s.decisions.length ? null : none(l('Nenhuma decisão pendente.', 'No pending decision.'))), home: 'mesames' }),
  lerTudo: D(l('Marcar tudo como lido', 'Mark all as read'), ['sim/sys/people/inbox', 'markRead'], markRead, (s) => markRead(s), l('Caixa em dia.', 'Inbox up to date.'), { home: 'correspondencia' }),
  reservar: U(l('Reservar atividade', 'Book an activity'), ['ui/panels/central', 'reserveDialog'], reserveDialog, (s) => reserveDialog(s, act5(s)!), { lock: actLock }),
  networking: D(l('Fazer contatos no setor', 'Network in the business'), ['sim/sys/agenda17', 'network'], network, (s) => network(s, careers(s).active[0] ?? 'label'), l('Contatos feitos.', 'Networking done.'),
    { lock: (s) => (energyLeft(s) < 1 ? lock31(l('Sem tempo livre este mês.', 'No free time this month.'), UNLOCK31.agenda) : null), home: 'agenda' }),
  liderar: D(l('Cuidar da carreira principal pessoalmente', 'Lead the main career yourself'), ['sim/sys/agenda17', 'setInv'], setInv, (s) => setInv(s, careers(s).active[0] ?? 'label', 'lead'), l('Você assume.', 'You take the lead.'), { home: 'agenda' }),
  emprestimo: D(l('Pedir empréstimo ao banco', 'Take a bank loan'), ['sim/economy', 'takeLoan'], takeLoan, (s) => takeLoan(s), l('Empréstimo na conta.', 'Loan in the account.'),
    { lock: (s) => (s.player.loans.length >= 3 ? lock31(l('Já tem 3 empréstimos.', 'Already 3 loans.'), l('Quite um empréstimo.', 'Pay off a loan.')) : !loanOffer(s) ? none(l('O banco não oferece crédito agora.', 'The bank offers no credit now.')) : null), home: 'livrocaixa' }),
  pagarDivida: D(l('Quitar empréstimo pessoal', 'Repay personal loan'), ['sim/sys/vices', 'repayPersonalLoan'], repayPersonalLoan, (s) => repayPersonalLoan(s, personalLoan5(s)!), l('Dívida quitada.', 'Debt repaid.'),
    { lock: (s) => (personalLoan5(s) ? null : none(l('Nenhuma dívida pessoal.', 'No personal debt.'))), home: 'livrocaixa' }),
  socios: D(l('Procurar sócios', 'Look for partners'), ['sim/sys/capital', 'seekInvestors'], seekInvestors, (s) => seekInvestors(s, R(s)), l('Procura aberta.', 'Search opened.'), { home: 'cofre' }),
  renovar: U(l('Renovar o contrato que vence antes', 'Renew the soonest contract'), ['ui/sys/actmenu20', 'chooseAction20'], chooseAction20, (s) => { const a = expiring5(s); if (a) chooseAction20(s, 'contract.renew', a); },
    { lock: (s) => (expiring5(s) ? null : none(l('Nenhum contrato seu para renovar.', 'No contract of yours to renew.'))) }),
  contratarArtista: U(l('Fazer proposta', 'Make an offer'), ['ui/ficha', 'openOffer'], openOffer, (s) => { const a = prospect5(s); if (a) openOffer(a); },
    { lock: (s) => (prospect5(s) ? null : none(l('Nenhum artista visto para propor.', 'No scouted act to offer.'))) }),
  almoco: D(l('Almoçar com um empresário', 'Lunch with a manager'), ['sim/sys/managers14', 'lunch'], lunch, (s) => lunch(s, mgr5(s)!.id), l('Almoço feito.', 'Lunch done.'),
    { lock: (s) => { const m = mgr5(s); return m ? lunchBlock(s, m.id) : none(l('Nenhum empresário ativo.', 'No active manager.')); }, home: 'telefone' }),
  tv: D(l('Levar o artista à TV', 'Take the act to TV'), ['sim/media', 'tvAppearance'], tvAppearance, (s) => tvAppearance(s, act5(s)!), l('Apareceu na TV.', 'On TV.'), { lock: actLock, home: 'radiotv' }),
  campanha: D(l('Campanha de prêmio (redes)', 'Awards campaign (social)'), ['sim/sys/awards18', 'campaign18'], campaign18, (s) => campaign18(s, rel5(s)!, 'social'), l('Campanha no ar.', 'Campaign running.'),
    { lock: (s) => (rel5(s) ? null : none(l('Nenhum disco seu lançado.', 'No record of yours released.'))), home: 'trofeus' }),
  almocoLucia: D(l('Almoço de domingo', 'Sunday lunch'), ['sim/sys/fossati31', 'luciaLunch31'], luciaLunch31, (s) => luciaLunch31(s), l('Almoço em família.', 'Family lunch.'),
    { lock: (s) => famLock31(s, 'lunch'), home: 'portaretrato' }),
  visitarFossati: U(l('Visitar a casa', 'Visit the house'), ['ui/r31/fos31', 'openFos31'], openFos31, (s) => openFos31('home', undefined, s)),
  aprovarPedido: D(l('Aprovar o pedido do chefe', 'Approve the chief\'s request'), ['sim/deleg31', 'answerAsk31'], answerAsk31, (s) => answerAsk31(s, asks31(s)[0].id, true), l('Aprovado.', 'Approved.'),
    { lock: (s) => (asks31(s).length ? null : none(l('Nenhum pedido.', 'No request.'))), home: 'chefe' }),
  lancar: D(l('Marcar o lançamento do projeto pronto', 'Schedule the finished project'), ['sim/sys/project8', 'scheduleProject'], scheduleProject, (s) => scheduleProject(s, R(s), proj5(s, 'finishing')!), l('Lançamento marcado.', 'Release scheduled.'),
    { lock: (s) => (proj5(s, 'finishing') ? null : lock31(l('Nenhum projeto pronto para lançar.', 'No project ready to release.'), UNLOCK31.record)), home: 'quadrobranco' }),
  mixar: D(l('Gravar/mixar o projeto atual', 'Record/mix the current project'), ['sim/sys/project8', 'recordNow'], recordNow, (s) => recordNow(s, proj5(s, 'recording')!), l('Sessão marcada.', 'Session booked.'),
    { lock: (s) => (proj5(s, 'recording') ? null : none(l('Nenhum projeto na fase de gravação.', 'No project in the recording stage.'))), home: 'mesasom' }),
  gravar: U(l('Preparar gravação', 'Prepare recording'), ['ui/sys/actmenu20', 'openRecord20'], openRecord20, (s) => openRecord20(s, act5(s)!), { lock: actLock }),
  compor: U(l('Compor', 'Write songs'), ['ui/sys/journey23', 'compose23'], compose23, (s) => compose23(s, act5(s)!), { lock: actLock }),
  ensaiar: U(l('Ensaiar', 'Rehearse'), ['ui/sys/actmenu20', 'chooseAction20'], chooseAction20, (s) => chooseAction20(s, 'rehearse.add', act5(s)!), { lock: actLock }),
  marcarShow: U(l('Marcar shows (agenda do artista)', 'Book gigs (act\'s agenda)'), ['ui/sys/actmenu20', 'chooseAction20'], chooseAction20, (s) => chooseAction20(s, 'agenda.edit', act5(s)!), { lock: actLock }),
  descansoArtista: U(l('Dar descanso ao artista', 'Give the act a rest'), ['ui/sys/actmenu20', 'chooseAction20'], chooseAction20, (s) => chooseAction20(s, 'rest.add', act5(s)!), { lock: actLock }),
  elogiar: U(l('Elogiar o líder', 'Praise the leader'), ['ui/sys/actmenu20', 'chooseAction20'], chooseAction20, (s) => chooseAction20(s, 'leader.praise', act5(s)!), { lock: actLock }),
  remaster: D(l('Remasterizar um clássico', 'Remaster a classic'), ['sim/sys/creation/core', 'remaster'], remaster, (s) => remaster(s, R(s), remaster5(s)!), l('Remaster em produção.', 'Remaster in production.'),
    { lock: (s) => (remaster5(s) ? null : none(l('Nenhum disco seu com 8+ anos.', 'No record of yours 8+ years old.'))), home: 'prateleiras' }),
  treinar: D(l('Treinar um funcionário', 'Train a staff member'), ['sim/sys/people/staff', 'trainStaff'], trainStaff, (s) => trainStaff(s, s.player.staff[0].id), l('Treino marcado.', 'Training booked.'),
    { lock: (s) => (s.player.staff.length ? null : none(l('Sem funcionários.', 'No staff.'))), home: 'quadrofunc' }),
  contratarFunc: O(l('Contratar (anúncio e candidatos)', 'Hire (ad and candidates)'), 'quadrofunc'),
  ampliarSede: D(l('Ampliar a sede', 'Expand the HQ'), ['sim/economy', 'upgradeHq'], upgradeHq, (s) => upgradeHq(s), l('Sede ampliada!', 'HQ expanded!'), { lock: (s) => hqBlocker(s), home: 'maquete' }),
  fabricaPropria: D(l('Construir fábrica na cidade', 'Build a plant in the city'), ['sim/sys/industry/supply', 'buildPlant'], buildPlant, (s) => buildPlant(s, s.config.homeCity), l('Fábrica em obra.', 'Plant under construction.'), { home: 'fabrica' }),
  garimpar: D(l('Garimpar talento', 'Dig for talent'), ['sim/sys/discover18', 'dig18'], dig18, (s) => dig18(s, chNow18(s)[0].id), l('Garimpo feito.', 'Dig done.'),
    { lock: (s) => (chNow18(s).length ? null : none(l('Nenhum canal nesta época.', 'No channel in this era.'))), home: 'demos' }),
  irRecado: U(l('Ir ao recado mais urgente', 'Go to the most urgent message'), ['ui/r31/quick31', 'goDest31'], goDest31, (s) => { const p = pendingList(s)[0]; if (p) goDest31(p.owner); },
    { lock: (s) => (pendingList(s).length ? null : none(l('Nenhum recado.', 'No messages.'))) }),
  meta: O(l('Ver metas e progresso', 'See goals and progress'), 'quadrometas'),
  responderCarta: O(l('Responder cartas', 'Answer letters'), 'correspondencia'),
  // cidade e mundo
  jantarProdutor: D(l('Jantar com um produtor', 'Dinner with a producer'), ['sim/sys/producers15', 'dinner'], dinner, (s) => dinner(s, prod5(s)!.id), l('Jantar feito.', 'Dinner done.'),
    { lock: (s) => { const p = prod5(s); return p ? dinnerBlock(s, p.id) : none(l('Nenhum produtor ativo.', 'No active producer.')); }, home: 'produtores' }),
  aceitarConvite: D(l('Aceitar o convite do festival', 'Accept the festival invite'), ['sim/sys/fests8', 'acceptInvite'], acceptInvite, (s) => acceptInvite(s, invite5(s)!.id), l('Convite aceito.', 'Invite accepted.'),
    { lock: (s) => (invite5(s) ? null : none(l('Nenhum convite agora.', 'No invite now.'))), home: 'festival' }),
  pedidoFamilia: D(l('Atender o pedido da família', 'Grant the family\'s request'), ['sim/sys/mob29', 'fulfill29'], fulfill29, (s) => fulfill29(s, asks29(s)[0].id), l('Pedido atendido.', 'Request granted.'),
    { lock: (s) => (asks29(s).length ? null : none(l('Nenhum pedido do submundo.', 'No underworld request.'))), home: 'beco' }),
  vereadores: D(l('Fazer lobby na câmara', 'Lobby the council'), ['sim/sys/society18', 'lobbyCouncil18'], lobbyCouncil18, (s) => lobbyCouncil18(s), l('Lobby feito.', 'Lobbying done.'), { home: 'prefeitura' }),
  comprarLoja: D(l('Comprar o item mais barato', 'Buy the cheapest item'), ['sim/r31/items31', 'buyOffer31'], buyOffer31, (s) => { const r = buyOffer31(s, shop5(s)!.offer, { k: 'me' }); return buyErr31(r) ? r : { text: r }; }, l('Comprado.', 'Bought.'),
    { lock: (s) => (shop5(s) ? null : none(l('Loja sem estoque.', 'Shop out of stock.'))), home: 'loja' }),
  territorio: D(l('Abrir o próximo mercado', 'Open the next market'), ['sim/economy', 'openTerritory'], openTerritory, (s) => openTerritory(s, nextMarket5(s)!), l('Mercado aberto.', 'Market opened.'),
    { lock: (s) => (nextMarket5(s) ? null : none(l('Todos os mercados já abertos.', 'All markets already open.'))), home: 'mapa' }),
};
A.estudar.same = undefined; // escolhe curso pelo estado (igual nos dois), mas a aula usa a data do sistema de cursos: conferido pela referência
A.marcarShow.label = l('Marcar shows', 'Book gigs');

// carreiras (um par por carreira)
for (const c of ['label', 'musician', 'manager', 'booking', 'festival', 'venue', 'studio', 'publisher', 'media', 'platform', 'screen', 'critic']) {
  A[`car.abrir:${c}`] = U(l('Abrir o painel da carreira', 'Open the career panel'), ['ui/sys/careerui13', 'openCareer'], openCareer, () => openCareer(c));
  A[`car.liderar:${c}`] = D(l('Cuidar pessoalmente', 'Lead it yourself'), ['sim/sys/agenda17', 'setInv'], setInv, (s) => setInv(s, c, 'lead'), l('Você assume.', 'You take the lead.'),
    { when: (s) => careers(s).active.includes(c), home: `car:${c}` });
}

function expiring5(s: GameState): string | undefined {
  return playerActs(s).map((id) => ({ id, c: s.contracts[s.acts[id]?.contractId ?? ''] })).filter((x) => x.c && x.c.party === 'player')
    .sort((a, b) => a.c.endWeek - b.c.endWeek)[0]?.id;
}
function prospect5(s: GameState): string | undefined {
  const mine = new Set(playerActs(s));
  return Object.keys(s.knowledge ?? {}).find((id) => s.acts[id] && !mine.has(id) && !s.acts[id].contractId);
}
function nextMarket5(s: GameState): MarketId | undefined {
  return MARKETS.map((m) => m.id).find((m) => !s.player.territories.includes(m));
}

export const ACTS_CAT5: Record<string, ActDef5> = A;

// ---------------------------------------------------------------- NÚMEROS (informação que vira coisa do mundo)

const N = (label: L, val: (s: GameState) => NumOut5 | null): NumDef5 => ({ label, val });
const money5 = (v: number): NumOut5 => ({ value: $(v), tone: v < 0 ? 'bad' : undefined });

export const NUMS_CAT5: Record<string, NumDef5> = {
  energia: N(l('Tempo livre', 'Free time'), (s) => ({ value: dots(energyLeft(s), maxEnergy(s)), bar: energyLeft(s) / Math.max(1, maxEnergy(s)) })),
  saude: N(l('Saúde', 'Health'), (s) => { const v = Math.round(ownerOf(s).health); return { value: `${v}`, bar: pct(v), tone: v < 40 ? 'bad' : v > 75 ? 'good' : undefined }; }),
  estresse: N(l('Estresse', 'Stress'), (s) => { const v = Math.round(ownerOf(s).stress); return { value: `${v}`, bar: pct(v), tone: v > 60 ? 'bad' : undefined }; }),
  famaPessoal: N(l('Sua fama', 'Your fame'), (s) => ({ value: `${Math.round(life(s).fame)}`, bar: pct(life(s).fame) })),
  fama: N(l('Fama do selo', 'Label fame'), (s) => ({ value: `★ ${fame5(s)}`, bar: pct(fame5(s)) })),
  pessoal: N(l('Seu dinheiro', 'Your money'), (s) => money5(ownerOf(s).wealth)),
  caixa: N(l('Caixa da empresa', 'Company cash'), (s) => money5(s.player.cash)),
  caixaLivre: N(l('Caixa livre', 'Free cash'), (s) => money5(freeCash20(s))),
  lucroMes: N(l('Lucro do mês', 'Month profit'), (s) => money5(netProfit18(fin18(s).m[mIdx18(s)]))),
  ultimoMes: N(l('Último mês', 'Last month'), (s) => money5(lastMonthView23(s).delta)),
  divida: N(l('Dívida', 'Debt'), (s) => { const d = position20(s).debt; return { value: $(d), tone: d > 0 ? 'bad' : 'good' }; }),
  participacao: N(l('Sua parte da empresa', 'Your share'), (s) => ({ value: `${Math.round(ownerShare(s) * 100)}%`, bar: ownerShare(s) })),
  parceiro: N(l('Par', 'Partner'), (s) => { const p = life(s).partner; return { value: p ? p.name : t(l('ninguém', 'nobody')) }; }),
  filhos: N(l('Filhos', 'Children'), (s) => ({ value: `${ownerOf(s).kids.length}` })),
  contatos: N(l('Contatos', 'Contacts'), (s) => ({ value: `${myKnown31(s).length}` })),
  idade: N(l('Idade', 'Age'), (s) => { const p = playerPerson(s); return p ? { value: `${s.year - p.born}` } : null; }),
  veiculos: N(l('Veículos', 'Vehicles'), (s) => ({ value: `${((s.x4 as unknown as { goods8?: { owned?: { id: string }[] } }).goods8?.owned ?? []).filter((o) => GOODS.find((g) => g.id === o.id)?.cat === 'vehicle').length}` })),
  decisoes: N(l('Decisões do mês', 'Month decisions'), (s) => ({ value: `${s.decisions.length}`, tone: s.decisions.length ? 'bad' : 'good' })),
  naoLidas: N(l('Não lidas', 'Unread'), (s) => ({ value: `${unreadCount(s)}` })),
  planos: N(l('Atividades reservadas', 'Booked activities'), (s) => ({ value: `${s.plans.length}` })),
  recados: N(l('Recados', 'Messages'), (s) => ({ value: `${pendingList(s).length}` })),
  artistas: N(l('Artistas no elenco', 'Acts on the roster'), (s) => ({ value: `${playerActs(s).length}` })),
  vencendo: N(l('Contratos vencendo (6 meses)', 'Contracts expiring (6 months)'), (s) => ({ value: `${playerActs(s).filter((id) => { const c = s.contracts[s.acts[id]?.contractId ?? '']; return c && c.party === 'player' && c.endWeek - s.week < 26; }).length}` })),
  conhecidos: N(l('Artistas conhecidos', 'Known acts'), (s) => ({ value: `${Object.keys(s.knowledge ?? {}).length}` })),
  equipe: N(l('Equipe', 'Staff'), (s) => ({ value: `${s.player.staff.length}` })),
  sedeNivel: N(l('Degrau da sede', 'HQ step'), (s) => ({ value: `${s.player.hq + 1}` })),
  sedeCusto: N(l('Próxima ampliação', 'Next expansion'), (s) => { const c = upgradeCost(s); return { value: c == null ? '—' : $(c) }; }),
  premios: N(l('Prêmios', 'Awards'), (s) => ({ value: `${s.player.stats.awards}` })),
  ouro: N(l('Discos de ouro', 'Gold records'), (s) => ({ value: `${s.player.stats.gold}` })),
  numero1: N(l('Nº 1', 'No. 1s'), (s) => ({ value: `${s.player.stats.number1s}` })),
  melhorParada: N(l('Sua melhor posição', 'Your best position'), (s) => {
    const xs = [...(s.charts?.singles ?? []), ...(s.charts?.albums ?? [])].map((e, i) => ({ e, i })).filter((x) => s.releases[x.e.releaseId]?.owner === 'player');
    const best = Math.min(...xs.map((x) => (x.e as { pos?: number }).pos ?? x.i + 1));
    return { value: Number.isFinite(best) ? `#${best}` : '—' };
  }),
  sessoes: N(l('Sessões em andamento', 'Sessions running'), (s) => ({ value: `${s.sessions.filter((x) => !x.done).length}` })),
  faixas: N(l('Canções sem gravar', 'Unrecorded songs'), (s) => { const a = act5(s); return { value: a && s.acts[a] ? `${unrecorded(s, s.acts[a]).length}` : '—' }; }),
  lancamentos: N(l('Lançamentos marcados', 'Scheduled releases'), (s) => ({ value: `${s.pendingReleases.length}` })),
  conquistas: N(l('Conquistas novas', 'New achievements'), (s) => ({ value: `${liveOf(s).achNew.length}` })),
  pedidosChefe: N(l('Pedidos', 'Requests'), (s) => ({ value: `${asks31(s).length}` })),
  noticias: N(l('Matérias sobre você', 'Stories about you'), (s) => ({ value: `${feed17(s, { mine: true, open: true }).length}` })),
  calor: N(l('Polícia de olho', 'Police heat'), (s) => { const v = Math.round(Object.values(crime17(s).heat).reduce((a, b) => Math.max(a, b), 0)); return { value: `${v}`, bar: pct(v), tone: v > 50 ? 'bad' : undefined }; }),
  lembrancas: N(l('Lembranças', 'Keepsakes'), (s) => ({ value: `${s17(s).book.length}` })),
  carreirasAtivas: N(l('Carreiras ativas', 'Active careers'), (s) => ({ value: `${careers(s).active.length}` })),
  ano: N(l('Ano', 'Year'), (s) => ({ value: `${s.year}` })),
};

// ---------------------------------------------------------------- LINHAS (o que se lê ali: manchetes, metas, recados)

export const LINES_CAT5: Record<string, (s: GameState) => L[]> = {
  manchetes: (s) => feed17(s, {}).slice(-4).reverse().map((x) => x.t),
  metas: (s) => nextGoals(s).filter((g) => !g.done).slice(0, 3).map((g) => g.text),
  recados: (s) => pendingList(s).slice(0, 3).map((p) => p.title),
  decisoes: (s) => s.decisions.slice(0, 3).map((d) => d.title as L),
  ambicao: (s) => { const a = AMBITIONS[careers(s).ambition]; return a ? [l(`Ambição: ${a.name.pt}`, `Ambition: ${a.name.en}`)] : []; },
  pedidosChefe: (s) => asks31(s).slice(0, 2).map((a) => a.t),
};
