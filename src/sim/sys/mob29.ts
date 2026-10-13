// Rodada 29 (Submundo) — FAMÍLIAS: mais interações com as organizações criminosas, com consequências, e "Contratar a
// família" (a organização executa o serviço por você — mais chance, menos calor, uma taxa e um FAVOR DEVIDO).
// Pedidos do autor: "devemos ter mais opções de interações (com possíveis consequências) com as organizações
// criminais" e "em coisas do submundo (até selecionando com botão direito) devemos ter opções de contratar tal
// família (com consequências e nos fazendo dever favor...)".
//
// Nada aqui duplica sistema: os serviços são os crimes de sempre (crime17.commitCrime/crimeOdds), executados pela
// organização ('o:<id>'); o favor devido é uma obrigação do livro holds17 (src 'mob29') que a família cobra depois; o
// empréstimo é o agiota de sempre (vices + aud27/shark27) ligado à família escolhida; lavagem, proteção (pizzo),
// aproximação e denúncia são as funções do crime17. As cenas são as de sempre, disparadas por fatos/memórias que já
// existem (batida → 'arrest', jabá exposto → memória 'payola').
//
// Relação visível com cada família: respeito · medo · dívida · hostilidade (meter29). A família age sobre ela no mês:
// cobra o favor (pedido com prazo), oferece trabalho, cobra proteção ou retalia. Recusar escala (ameaça → sabotagem
// → violência); cumprir zera a dívida e sobe a confiança.
//
// Determinismo: sorteios próprios (Rng.fromSeed com chave 'mob29'); o estado só nasce na primeira interação do
// jogador (x4.mob29, preguiçoso) e o gancho mensal não faz nada sem ele — mundos sem interação ficam idênticos.

import { Rng, clamp } from '../../core/rng';
import { countryName } from '../../data/geo';
import type { Racket17 } from '../../data/orgs17';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { allHolds, grantHold, holds17, type Hold } from '../holds17';
import { histMode } from '../history15';
import { cashWhy20, freeCash20 } from '../oblig20';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { spawnProceduralAct } from '../worldgen';
import {
  ODDS17, SHIELD17, a3Of, addHeat, approachOrg, bossName, commitCrime, crime17, crimeById, crimeOdds, feedCase, hasRacket, heatIn, launderFee,
  mIdx, nameOf17, orgById, orgs17, pizzoFee, reportOrg, targetBlock17, targetId17, toggleLaunder, usd, type Ctx17, type Org17,
} from './crime17';
import { linkShark27 } from './aud27/shark27';
import { companyLoanBlocker, takeCompanyLoan } from './vices';

const N = (pt: string, en: string): L => l(pt, en);

// ================================================================ estado (preguiçoso)

export interface MobO29 {
  /** respeito, medo, hostilidade guardados (somam ao que vem de crime17/holds17 no medidor) */
  res: number; fear: number; hos: number;
  /** recusas seguidas (escalada) */
  esc: number;
  partner?: 1;
  /** proteção de artista: ato → semana até quando */
  guard?: Record<string, number>;
}
export type AskKind29 = 'sign' | 'club' | 'launder' | 'hide' | 'cut' | 'vote' | 'job';
export interface Ask29 { id: string; o: string; k: AskKind29; hold?: string; w: number; dl: number; esc: number }
export interface Mob29State { o: Record<string, MobO29>; asks: Ask29[]; seq: number; log: [number, number, string, L][] }

export const peek29 = (s: GameState): Mob29State | undefined => (s.x4 as unknown as { mob29?: Mob29State }).mob29;
export function mob29(s: GameState): Mob29State {
  const x = s.x4 as unknown as { mob29?: Mob29State };
  const st = (x.mob29 ??= { o: {}, asks: [], seq: 0, log: [] });
  st.o ??= {}; st.asks ??= []; st.log ??= [];
  return st;
}
const mo = (s: GameState, oid: string): MobO29 => (mob29(s).o[oid] ??= { res: 0, fear: 0, hos: 0, esc: 0 });
const bump = (s: GameState, oid: string, d: Partial<Pick<MobO29, 'res' | 'fear' | 'hos'>>): void => {
  const m = mo(s, oid);
  m.res = clamp(m.res + (d.res ?? 0), -100, 100); m.fear = clamp(m.fear + (d.fear ?? 0), 0, 100); m.hos = clamp(m.hos + (d.hos ?? 0), 0, 100);
};
const rel = (s: GameState, oid: string, d: number): void => { const st = crime17(s); st.org[oid] = clamp((st.org[oid] ?? 0) + d, -100, 100); };
function logIt(s: GameState, oid: string, text: L): void {
  const st = mob29(s);
  st.log.push([s.week, s.year, oid, text]);
  if (st.log.length > 80) st.log.splice(0, st.log.length - 80);
}
const rng = (s: GameState, tag: string): Rng => Rng.fromSeed(`${s.config.seed}:mob29:${tag}:${s.week}:${mob29(s).seq}`);
const home = (s: GameState): string => a3Of(s, s.config.homeCity);

// ================================================================ medidor: respeito · medo · dívida · hostilidade

export interface Meter29 { respect: number; fear: number; debt: number; hostility: number }
/** Obrigações abertas da família sobre o jogador (favores e dívidas), as próprias do livro. */
export const owed29 = (s: GameState, o: Org17): Hold[] => allHolds(s).filter((h) => h.holder === o.key && h.target === 'player' && (h.kind === 'favor' || h.kind === 'debt'));
export function meter29(s: GameState, oid: string): Meter29 {
  const o = orgById(s, oid);
  if (!o) return { respect: 0, fear: 0, debt: 0, hostility: 0 };
  const st = crime17(s);
  const m = peek29(s)?.o[o.id];
  const r = st.org[o.id] ?? 0;
  const vend = (st.vend[o.id] ?? 0) > s.week;
  const griev = allHolds(s).filter((h) => h.holder === o.key && h.target === 'player' && h.kind === 'grievance').reduce((t, h) => t + h.strength, 0);
  return {
    respect: Math.round(clamp((m?.res ?? 0) + Math.max(0, r) * 0.6 + ((st.pizzo[o.id] ?? 0) > 0 ? 10 : 0) + (st.laund[o.id] ? 10 : 0) + (m?.partner ? 20 : 0), 0, 100)),
    fear: Math.round(clamp((m?.fear ?? 0) + (vend ? 20 : 0) + ((st.pizzo[o.id] ?? 0) < 0 ? 15 : 0), 0, 100)),
    debt: Math.round(clamp(owed29(s, o).reduce((t, h) => t + h.strength, 0), 0, 100)),
    hostility: Math.round(clamp((m?.hos ?? 0) + Math.max(0, -r) * 0.6 + (vend ? 40 : 0) + griev * 0.4, 0, 100)),
  };
}
export const METER29: Record<keyof Meter29, L> = { respect: N('Respeito', 'Respect'), fear: N('Medo', 'Fear'), debt: N('Dívida', 'Debt'), hostility: N('Hostilidade', 'Hostility') };

// ================================================================ época e região

/** O que a época significa para esta família (texto e bônus). */
export function era29(s: GameState, o: Org17): { text: L; club: number } {
  const y = s.year;
  if (y < 1934 && o.kind === 'mafia') return { text: N('Lei Seca: bebida clandestina, speakeasies e as primeiras jukeboxes.', 'Prohibition: bootleg liquor, speakeasies and the first jukeboxes.'), club: 1.3 };
  if (y < 1980 && (o.kind === 'mafia' || o.kind === 'firm' || o.kind === 'syndicate')) return { text: N('A era das boates e jukeboxes: a família manda na noite e no jabá.', 'The age of nightclubs and jukeboxes: the family runs the night and the payola.'), club: y >= 1950 ? 1.4 : 1.2 };
  if (y < 2000 && o.kind === 'cartel') return { text: N('A era dos cartéis: dinheiro de sobra para lavar em shows, boates e selos.', 'The cartel era: money to burn, laundered through shows, clubs and labels.'), club: 1.1 };
  if (y >= 2000) return { text: N('Era digital: pirataria vira vazamento, jabá vira playlist e o caixa passa por empresas de fachada.', 'Digital era: bootlegs become leaks, payola becomes playlists and the cash runs through shell firms.'), club: 1 };
  return { text: N('Gangues de rua: proteção, credibilidade e rixas.', 'Street gangs: protection, credibility and feuds.'), club: 1 };
}
/** A família alcança este país? (sede no país, ou poder ≥ 85 = alcance internacional) */
export const present29 = (o: Org17, a3: string): boolean => o.a3 === a3 || o.power >= 85;
const liveAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const myActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter(liveAct).sort((a, b) => b.fame - a.fame);
/** Seus atos na área da família. */
const actsIn = (s: GameState, o: Org17): Act[] => myActs(s).filter((a) => present29(o, a3Of(s, a.city)) || present29(o, home(s)));

// ================================================================ bloqueios (sempre com o motivo)

const B = {
  down: N('Organização desmantelada.', 'Organization dismantled.'),
  era: N('Esta família não existe nesta época.', 'This family does not exist in this era.'),
  strict: N('Vida real exata: organização real não faz trabalhos inventados.', 'Exact real life: a real organization does not do invented jobs.'),
  far: N('Fora da área deles: não têm gente no país.', 'Out of their area: they have no people in that country.'),
  hostile: N('Eles não trabalham para você (hostilidade alta).', 'They will not work for you (high hostility).'),
  heat: N('Polícia em cima de você (calor 70+): a família não se expõe.', 'Police all over you (heat 70+): the family will not risk it.'),
  noAct: N('Você não tem artista ativo na área deles.', 'You have no active act in their area.'),
  cash: N('Caixa insuficiente.', 'Not enough cash.'),
  role: N('Jogando como artista, quem assina é um selo.', 'Playing as an artist, signing is a label\'s job.'),
};
function orgBlock29(s: GameState, o: Org17 | undefined, x: { job?: boolean; racket?: Racket17[]; a3?: string; cost?: number; act?: boolean } = {}): L | null {
  if (!o) return B.era;
  const st = crime17(s);
  if ((st.down[o.id] ?? 0) > s.week) return B.down;
  if (o.from > s.year || o.to < s.year) return B.era;
  if (x.job && o.real && histMode(s) === 'strict') return B.strict;
  if (x.racket && !x.racket.some((r) => hasRacket(o, r))) return fmtL(N('Não é o ramo deles ({r}).', 'Not their racket ({r}).'), { r: x.racket.join('/') });
  if (x.a3 && !present29(o, x.a3)) return B.far;
  if (x.job) {
    const m = meter29(s, o.id);
    if (m.hostility >= 60 || (st.org[o.id] ?? 0) < -20) return B.hostile;
    if (heatIn(s, home(s)) >= 70) return B.heat;
  }
  if (x.act && !actsIn(s, o).length) return B.noAct;
  if (x.cost && freeCash20(s) < x.cost) return cashWhy20(s, x.cost, B.cash);
  return null;
}

// ================================================================ interações com a família

export interface MobAct29 {
  id: string; name: L; icon: string; desc: L;
  /** custo agora (centavos; 0 = sem custo imediato) */
  cost: (s: GameState, o: Org17) => number;
  /** chance de dar certo (quando sorteia) */
  chance?: (s: GameState, o: Org17) => number;
  block: (s: GameState, o: Org17) => L | null;
  /** consequências (texto curto mostrado antes) */
  fx: L;
  run: (s: GameState, o: Org17, r: Rng) => L;
  /** some do menu quando não se aplica (em vez de desabilitar) */
  hide?: (s: GameState, o: Org17) => boolean;
}

const bestRecent = (s: GameState, o: Org17): Act | undefined => actsIn(s, o).find((a) => a.releases.some((id) => s.releases[id] && s.week - s.releases[id].week < 26));
const clubP = (s: GameState, o: Org17): number => clamp(0.88 - heatIn(s, a3Of(s, o.city)) / 150 - (s.year >= 1985 && o.real ? 0.05 : 0), 0.4, 0.95);
const jukeQ = (s: GameState, o: Org17): number => clamp(0.12 + heatIn(s, home(s)) / 300 + (s.year >= 1959 && s.year <= 1962 ? 0.1 : 0), 0.05, 0.6); // 1959–62: audiências do jabá

export const MOB29: MobAct29[] = [
  { id: 'approach', name: N('Aproximar-se (jantar e presente)', 'Approach (dinner and a gift)'), icon: 'handshake',
    desc: N('Um jantar com o chefe e um presente: abre portas.', 'Dinner with the boss and a gift: opens doors.'),
    fx: N('Relação +15, respeito +5, calor +3.', 'Relationship +15, respect +5, heat +3.'),
    cost: (s, o) => money(s, 2000 + o.power * 50),
    block: (s, o) => orgBlock29(s, o, { cost: money(s, 2000 + o.power * 50) }),
    run: (s, o) => { const t = approachOrg(s, o.id); bump(s, o.id, { res: 5 }); return t; } },
  { id: 'pizzo_pay', name: N('Negociar proteção (pagar o pizzo)', 'Negotiate protection (pay the pizzo)'), icon: 'shield',
    desc: N('Pagar a "taxa de proteção" mensal: seus shows na praça ficam em paz.', 'Pay the monthly "protection fee": your shows in town stay safe.'),
    fx: N('Taxa mensal; respeito +8, medo +5; calor +3; sem depredação de shows.', 'Monthly fee; respect +8, fear +5; heat +3; no trashed shows.'),
    cost: (s, o) => pizzoFee(s, o),
    hide: (s, o) => (crime17(s).pizzo[o.id] ?? 0) > 0,
    block: (s, o) => orgBlock29(s, o, { racket: ['protection'], a3: home(s), cost: pizzoFee(s, o) }),
    run: (s, o) => { crime17(s).pizzo[o.id] = Math.max(1, s.week); addHeat(s, 'player', o.a3, 3); bump(s, o.id, { res: 8, fear: 5 }); rel(s, o.id, 5); return fmtL(N('Combinado com {b}: {v}/mês e ninguém mexe nos seus shows.', 'Deal with {b}: {v}/month and nobody touches your shows.'), { b: bossName(o), v: usd(pizzoFee(s, o)) }); } },
  { id: 'pizzo_stop', name: N('Recusar / parar de pagar proteção', 'Refuse / stop paying protection'), icon: 'warning',
    desc: N('Dizer não ao pizzo. Eles lembram.', 'Say no to the pizzo. They remember.'),
    fx: N('Hostilidade +20, mágoa deles; ~30%/mês de show depredado por 6 meses.', 'Hostility +20, their grudge; ~30%/month chance of a trashed show for 6 months.'),
    cost: () => 0,
    hide: (s, o) => !((crime17(s).pizzo[o.id] ?? 0) > 0),
    block: (s, o) => orgBlock29(s, o),
    run: (s, o) => { crime17(s).pizzo[o.id] = -Math.max(1, s.week); rel(s, o.id, -15); bump(s, o.id, { hos: 20 }); grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 40, months: 24, src: 'crime17', text: N('Recusou a proteção', 'Refused protection'), quiet: true }); return fmtL(N('Você parou de pagar {o}. Melhor reforçar a segurança.', 'You stopped paying {o}. Better beef up security.'), { o: o.name }); } },
  { id: 'loan', name: N('Pedir um empréstimo (agiota da família)', 'Ask for a loan (the family\'s loan shark)'), icon: 'money',
    desc: N('Dinheiro na hora, juros absurdos, e a família sabe onde fica a sede.', 'Cash right now, absurd interest, and the family knows where HQ is.'),
    fx: N('Empréstimo de agiota ligado a eles: dívida (holds17), segredo; atrasar traz visita.', 'A loan-shark loan tied to them: debt (holds17), a secret; missing payments brings a visit.'),
    cost: () => 0,
    block: (s, o) => orgBlock29(s, o, { a3: home(s) }) ?? companyLoanBlocker(s, 'shark'),
    run: (s, o) => {
      const before = new Set(s.player.loans.map((x) => x.id));
      const err = takeCompanyLoan(s, 'shark');
      if (err) return err;
      const id = s.player.loans.find((x) => !before.has(x.id))?.id;
      linkShark27(s, (lid) => (lid === id ? o.id : undefined));
      bump(s, o.id, { res: 3 });
      return fmtL(N('{b} empresta {v}. Os juros correm desde hoje.', '{b} lends {v}. Interest runs from today.'), { b: bossName(o), v: usd(s.player.loans.find((x) => x.id === id)?.principal ?? 0) });
    } },
  { id: 'launder', name: N('Lavar dinheiro pelo seu selo', 'Launder money through your label'), icon: 'money',
    desc: N('Notas de shows fantasmas e prensagens que nunca existiram.', 'Invoices for ghost shows and pressings that never existed.'),
    fx: N('Renda mensal; calor +3/mês; eles guardam um segredo provado seu; casos viram crime organizado.', 'Monthly income; heat +3/month; they hold a proven secret on you; cases become organized crime.'),
    cost: () => 0,
    block: (s, o) => orgBlock29(s, o, { racket: ['laundering'] }) ?? (!crime17(s).laund[o.id] && (crime17(s).org[o.id] ?? 0) < -20 ? N('Eles não confiam em você.', 'They don\'t trust you.') : null),
    run: (s, o) => { const t = toggleLaunder(s, o.id); bump(s, o.id, crime17(s).laund[o.id] ? { res: 6 } : { hos: 15 }); return t; } },
  { id: 'club', name: N('Show na boate deles', 'A show at their club'), icon: 'mic',
    desc: N('Casas da família (clássico dos anos 1950–70): cachê bom, gente perigosa na plateia.', 'Family-owned venues (a 1950s–70s classic): good money, dangerous crowd.'),
    fx: N('Cachê (eles ficam com 30%), embalo +5; risco de batida policial (multa, calor, cena).', 'Fee (they keep 30%), momentum +5; risk of a police raid (fine, heat, scene).'),
    cost: () => 0, chance: clubP,
    block: (s, o) => orgBlock29(s, o, { racket: ['clubs'], act: true }),
    run: (s, o, r) => {
      const a = actsIn(s, o)[0];
      const gross = Math.round(money(s, 1500 + a.fame * 100) * era29(s, o).club);
      if (!r.chance(clubP(s, o))) {
        const fine = money(s, 1500);
        post(s, `mob29raid:${o.id}:${s.week}`, -fine, 'legal', `Multa: batida na boate (${o.name.pt})`);
        addHeat(s, 'player', o.a3, 8);
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
        for (const m of a.members) addStress(s, m, 8, N('Batida policial no show', 'Police raid at the show'));
        const text = fmtL(N('Batida policial na boate de {o} durante o show de {a}: multa {v}.', 'Police raid at {o}\'s club during {a}\'s show: {v} fine.'), { o: o.name, a: a.name, v: usd(fine) });
        emitFact(s, { kind: 'arrest', actors: ['player', o.key, a.id], place: o.city, severity: 40, visibility: 'public', tags: ['crime', 'raid', 'bad'], text, src: 'mob29' });
        return text;
      }
      const net = Math.round(gross * 0.7);
      post(s, `mob29club:${o.id}:${s.week}`, net, 'live', `Show na boate (${o.name.pt})`);
      a.momentum = clamp(a.momentum + 5, 0, 100);
      a.fame = clamp(a.fame + 0.3, 0, 100);
      addHeat(s, 'player', o.a3, 2);
      bump(s, o.id, { res: 5 }); rel(s, o.id, 3);
      return fmtL(N('{a} lota a boate de {o}: {v} líquidos (30% ficou com a casa).', '{a} packs {o}\'s club: {v} net (the house kept 30%).'), { a: a.name, o: o.name, v: usd(net) });
    } },
  { id: 'jukebox', name: N('Comprar lugar nas jukeboxes / rádios (jabá da família)', 'Buy jukebox / radio placement (the family\'s payola)'), icon: 'radio',
    desc: N('A rota das jukeboxes e dos DJs é deles: seu lançamento toca em todo lugar.', 'The jukebox and DJ route is theirs: your release plays everywhere.'),
    fx: N('+35% nas paradas por 6 semanas; eles fazem um favor (vão cobrar); risco de o jabá vir à tona (escândalo, caso).', '+35% chart units for 6 weeks; they do you a favor (they will collect); risk the payola surfaces (scandal, case).'),
    cost: (s, o) => money(s, 2500 + o.power * 40), chance: (s, o) => 1 - jukeQ(s, o),
    block: (s, o) => (!(hasRacket(o, 'jukebox') && s.year <= 1985) && !hasRacket(o, 'payola') ? (hasRacket(o, 'jukebox') ? N('A era das jukeboxes acabou (depois de 1985).', 'The jukebox era is over (after 1985).') : N('Não é o ramo deles (jukebox/jabá).', 'Not their racket (jukebox/payola).')) : null)
      ?? orgBlock29(s, o, { a3: home(s), cost: money(s, 2500 + o.power * 40) }) ?? (bestRecent(s, o) ? null : N('Nenhum lançamento seu dos últimos 6 meses para emplacar.', 'No release of yours from the last 6 months to push.')),
    run: (s, o, r) => {
      const a = bestRecent(s, o)!;
      const cost = money(s, 2500 + o.power * 40);
      post(s, `mob29juke:${o.id}:${s.week}`, -cost, 'marketing', `"Promoção" (${o.name.pt})`);
      const st = crime17(s);
      st.rig[a.id] = Math.max(st.rig[a.id] ?? 0, s.week + 6);
      addHeat(s, 'player', home(s), 4);
      owe29(s, o, 35, fmtL(N('Jukeboxes e DJs para {a}', 'Jukeboxes and DJs for {a}'), { a: a.name }), r);
      bump(s, o.id, { res: 3 });
      const via = hasRacket(o, 'jukebox') && s.year <= 1985 ? N('jukeboxes', 'jukeboxes') : s.year >= 2005 ? N('playlists', 'playlists') : N('DJs de rádio', 'radio DJs');
      if (r.chance(jukeQ(s, o))) {
        const text = fmtL(N('O jabá de {o} por {a} vem à tona: {v} comprados.', '{o}\'s payola for {a} comes out: bought {v}.'), { o: o.name, a: a.name, v: via });
        remember(s, 'payola', text, { actId: a.id, important: true });
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
        feedCase(s, 'player', home(s), 15, 35, true);
        return text;
      }
      return fmtL(N('{a} toca em todo lugar ({v}): +35% nas paradas por 6 semanas. A família vai cobrar.', '{a} plays everywhere ({v}): +35% chart units for 6 weeks. The family will collect.'), { a: a.name, v: via });
    } },
  { id: 'guard', name: N('Pedir proteção para um artista seu', 'Ask protection for one of your acts'), icon: 'shield',
    desc: N('Homens da família na porta do camarim: quem pensa em mexer com seu artista pensa duas vezes.', 'Family men at the dressing-room door: anyone thinking of touching your act thinks twice.'),
    fx: N('Taxa mensal; crimes contra o artista −25%; eles ficam com um favor seu.', 'Monthly fee; crimes against the act −25%; they hold a favor from you.'),
    cost: (s, o) => guardFee29(s, o),
    block: (s, o) => orgBlock29(s, o, { job: true, racket: ['protection', 'violence'], act: true, cost: guardFee29(s, o) }),
    run: (s, o, r) => {
      const a = actsIn(s, o).find((x) => !(mo(s, o.id).guard?.[x.id] ?? 0)) ?? actsIn(s, o)[0];
      const m = mo(s, o.id);
      if ((m.guard?.[a.id] ?? 0) > s.week) { delete m.guard![a.id]; return fmtL(N('{o} deixa de proteger {a}.', '{o} stops protecting {a}.'), { o: o.name, a: a.name }); }
      post(s, `mob29guard:${o.id}:${a.id}:${s.week}`, -guardFee29(s, o), 'admin', `Segurança da família (${o.name.pt})`);
      (m.guard ??= {})[a.id] = s.week + 5;
      owe29(s, o, 25, fmtL(N('Proteção para {a}', 'Protection for {a}'), { a: a.name }), r);
      bump(s, o.id, { res: 3 });
      return fmtL(N('{o} protege {a}: {v}/mês, e um favor na conta.', '{o} protects {a}: {v}/month, and a favor on the tab.'), { o: o.name, a: a.name, v: usd(guardFee29(s, o)) });
    } },
  { id: 'partner', name: N('Virar sócio da família', 'Become the family\'s partner'), icon: 'contract',
    desc: N('Uma fatia dos negócios: renda todo mês, proteção de graça — e você passa a ser um deles.', 'A slice of the business: income every month, free protection — and you become one of them.'),
    fx: N('Renda mensal; sem pizzo; calor +4/mês; eles têm um segredo provado seu; RICO se cair. Sair depois = hostilidade.', 'Monthly income; no pizzo; heat +4/month; they hold a proven secret; RICO if it falls apart. Leaving later = hostility.'),
    cost: () => 0,
    block: (s, o) => {
      if (peek29(s)?.o[o.id]?.partner) return orgBlock29(s, o);
      const b = orgBlock29(s, o, { job: true });
      if (b) return b;
      const m = meter29(s, o.id);
      return m.respect < 50 || (crime17(s).org[o.id] ?? 0) < 30 ? fmtL(N('Ainda não confiam o bastante (respeito {r}/50, relação {e}/30).', 'They don\'t trust you enough yet (respect {r}/50, relationship {e}/30).'), { r: m.respect, e: Math.round(crime17(s).org[o.id] ?? 0) }) : null;
    },
    run: (s, o) => {
      const m = mo(s, o.id);
      if (m.partner) {
        delete m.partner;
        bump(s, o.id, { hos: 30 }); rel(s, o.id, -30);
        grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 55, months: 60, src: 'mob29', text: N('Saiu da sociedade', 'Walked out of the partnership'), quiet: true });
        mob29(s).seq++;
        return fmtL(N('Você deixa a sociedade com {o}. Ninguém sai da família assim.', 'You leave the partnership with {o}. Nobody leaves the family like that.'), { o: o.name });
      }
      m.partner = 1;
      mob29(s).seq++;
      bump(s, o.id, { res: 10 }); rel(s, o.id, 10);
      grantHold(s, { holder: o.key, target: 'player', kind: 'secret', strength: 70, proof: 2, months: 240, src: 'mob29', text: N('Sócio nos negócios da família', 'Partner in the family business'), quiet: true });
      return fmtL(N('Aperto de mão com {b}: você é sócio de {o}. {v}/mês.', 'A handshake with {b}: you are {o}\'s partner. {v}/month.'), { b: bossName(o), o: o.name, v: usd(partnerCut29(s, o)) });
    } },
  { id: 'paydebt', name: N('Quitar a dívida com a família', 'Pay off your debt to the family'), icon: 'money',
    desc: N('Pagar em dinheiro os favores que você deve (os pedidos pendentes somem).', 'Pay cash for the favors you owe (pending requests go away).'),
    fx: N('Dívida zera; respeito +8; hostilidade −10; recusas esquecidas.', 'Debt cleared; respect +8; hostility −10; refusals forgotten.'),
    cost: (s, o) => payDebtCost29(s, o),
    block: (s, o) => (myFavors29(s, o).length ? orgBlock29(s, o, { cost: payDebtCost29(s, o) }) : N('Você não deve favor a eles.', 'You owe them no favor.')),
    run: (s, o) => {
      const cost = payDebtCost29(s, o);
      post(s, `mob29pay:${o.id}:${s.week}`, -cost, 'legal', `Acerto de contas (${o.name.pt})`);
      const ids = new Set(myFavors29(s, o).map((h) => h.id));
      for (const h of holds17(s).h) if (ids.has(h.id)) { h.status = 'used'; h.uses++; h.lastUse = s.week; }
      const st = mob29(s);
      st.asks = st.asks.filter((a) => !(a.o === o.id && a.hold && ids.has(a.hold)));
      st.seq++;
      const m = mo(s, o.id); m.esc = 0;
      bump(s, o.id, { res: 8, hos: -10 });
      return fmtL(N('Contas acertadas com {o}: {v}. Vocês estão quites.', 'Accounts settled with {o}: {v}. You are even.'), { o: o.name, v: usd(cost) });
    } },
  { id: 'inform', name: N('Delatar à polícia (trair a família)', 'Inform on them to the police (betray the family)'), icon: 'gavel',
    desc: N('Entregar o que sabe. A polícia agradece; a família, não.', 'Hand over what you know. The police thank you; the family does not.'),
    fx: N('Caso contra eles, reputação +3, calor −15 — hostilidade +50, medo +25, vingança por 18 meses (retaliação).', 'A case against them, reputation +3, heat −15 — hostility +50, fear +25, revenge for 18 months (retaliation).'),
    cost: () => 0,
    block: (s, o) => orgBlock29(s, o),
    run: (s, o) => { const t = reportOrg(s, o.id); bump(s, o.id, { hos: 50, fear: 25 }); const m = mo(s, o.id); delete m.partner; mob29(s).seq++; return t; } },
];
export const mobAct29 = (id: string): MobAct29 | undefined => MOB29.find((x) => x.id === id);
export const guardFee29 = (s: GameState, o: Org17): number => money(s, 700 + o.power * 15);
export const partnerCut29 = (s: GameState, o: Org17): number => money(s, 1500 + o.power * 40);
const myFavors29 = (s: GameState, o: Org17): Hold[] => holds17(s).h.filter((h) => h.status === 'open' && h.holder === o.key && h.target === 'player' && (h.kind === 'favor' || h.kind === 'debt') && h.src !== 'shark27' && (h.until === undefined || h.until >= s.week));
export const payDebtCost29 = (s: GameState, o: Org17): number => myFavors29(s, o).reduce((t, h) => t + money(s, 120) * h.strength, 0);

/** Lista do menu/card: interações visíveis com o motivo quando não dá. */
export function mobActs29(s: GameState, oid: string): { a: MobAct29; block: L | null; cost: number; chance?: number }[] {
  const o = orgById(s, oid);
  if (!o) return [];
  return MOB29.filter((a) => !a.hide?.(s, o)).map((a) => ({ a, block: a.block(s, o), cost: a.cost(s, o), chance: a.chance?.(s, o) }));
}
/** Executa uma interação (o mesmo caminho do card, do menu de ações e do Submundo). */
export function doMob29(s: GameState, oid: string, id: string): { ok: boolean; text: L } {
  const o = orgById(s, oid);
  const a = mobAct29(id);
  if (!o || !a) return { ok: false, text: N('Inválido.', 'Invalid.') };
  const b = a.block(s, o);
  if (b) return { ok: false, text: b };
  mob29(s).seq++;
  const text = a.run(s, o, rng(s, `act:${o.id}:${id}`));
  logIt(s, o.id, text);
  return { ok: true, text };
}

// ================================================================ favor devido (o livro holds17)

/** A família faz um favor e vai cobrar: obrigação com data de cobrança (6–18 semanas). */
function owe29(s: GameState, o: Org17, strength: number, what: L, r: Rng): Hold {
  const st = mob29(s);
  return grantHold(s, {
    holder: o.key, target: 'player', kind: 'favor', strength, months: 72, src: 'mob29', ref: `f${++st.seq}`, quiet: true,
    data: { due: s.week + r.int(6, 18) },
    text: fmtL(N('Favor de {o}: {w}', 'Favor from {o}: {w}'), { o: o.name, w: what }),
  });
}

// ================================================================ contratar a família

export interface Job29 { c: string; name: L; icon: string }
/** Serviços (os crimes de sempre, executados pela família) — 'guard' é a proteção de artista. */
export const JOBS29: Job29[] = [
  { c: 'assault', name: N('Intimidar ("convencer" alguém)', 'Intimidate ("convince" someone)'), icon: 'skull' },
  { c: 'blackmail', name: N('Cobrar / pressionar com um segredo', 'Collect / squeeze with a secret'), icon: 'eye' },
  { c: 'sabotage', name: N('Sabotar (disco, turnê, estúdio)', 'Sabotage (record, tour, studio)'), icon: 'fire' },
  { c: 'bribe', name: N('Fazer um problema sumir (polícia, testemunha, juiz)', 'Make a problem go away (police, witness, judge)'), icon: 'money' },
  { c: 'chart_rig', name: N('Pressionar rádio e DJs (paradas)', 'Lean on radio and DJs (charts)'), icon: 'radio' },
  { c: 'bootleg', name: N('Rodar uma pirataria', 'Run a bootleg operation'), icon: 'cd' },
  { c: 'wiretap', name: N('Grampear um selo', 'Wiretap a label'), icon: 'camera' },
  { c: 'steal_relic', name: N('Roubar uma relíquia', 'Steal a relic'), icon: 'vault' },
  { c: 'murder', name: N('Encomendar uma morte', 'Order a death'), icon: 'skull' },
];
export const jobOf29 = (c: string): Job29 | undefined => JOBS29.find((j) => j.c === c);
/** Tipo de alvo de cada serviço (para os menus: pessoa, ato, selo, seu ato, relíquia, caso). */
export const jobTk29 = (c: string): string => crimeById(c)?.tk ?? '';

export interface HireOdds29 { block: L | null; p: number; q: number; cost: number; fee: number; heatYou: number; favor: number; why: L[]; a3: string }
const ctxOf = (o: Org17, c: string, target: string, method?: string): Ctx17 => ({ actor: o.key, target, method: method ?? crimeById(c)?.methods?.[0]?.id, org: o.id, partners: [], dp: 0.08, dpWhy: N('Profissionais da família +8%', 'Family professionals +8%') });
export const hireFee29 = (s: GameState, o: Org17): number => Math.round(money(s, 2500 + o.power * 60) * clamp(1 - (crime17(s).org[o.id] ?? 0) / 200, 0.6, 1.4));

/** Chance, custo, calor que sobra para você e o favor devido — com o motivo quando não dá. */
export function hireOdds29(s: GameState, oid: string, c: string, rawTarget: string, method?: string): HireOdds29 {
  const o = orgById(s, oid);
  const d = crimeById(c);
  const target = targetId17(s, rawTarget);
  const zero = (block: L): HireOdds29 => ({ block, p: 0, q: 0, cost: 0, fee: 0, heatYou: 0, favor: 0, why: [], a3: home(s) });
  if (!o || !d) return zero(N('Inválido.', 'Invalid.'));
  const pre = orgBlock29(s, o, { job: true });
  if (pre) return zero(pre);
  const tb = targetBlock17(s, d, target);
  if (tb) return zero(tb);
  const od = crimeOdds(s, ctxOf(o, c, target, method), c);
  if (!present29(o, od.a3)) return zero(B.far);
  const fee = hireFee29(s, o);
  const cost = od.cost + fee;
  const block = od.block ?? (freeCash20(s) < cost ? cashWhy20(s, cost, B.cash) : null);
  return { block, p: od.p, q: od.q, cost, fee, heatYou: Math.round(od.heat * 0.35), favor: Math.round(clamp(25 + od.sev / 2, 25, 80)), why: od.why, a3: od.a3 };
}

/** Contrata a família para o serviço: ela executa (crime de sempre), você paga, fica com pouco calor e DEVE UM FAVOR. */
export function hire29(s: GameState, oid: string, c: string, rawTarget: string, method?: string): { ok: boolean; text: L } {
  const o = orgById(s, oid);
  const target = targetId17(s, rawTarget);
  const od = hireOdds29(s, oid, c, target, method);
  if (!o || od.block) return { ok: false, text: od.block ?? N('Inválido.', 'Invalid.') };
  const st = mob29(s);
  st.seq++;
  const r = rng(s, `hire:${o.id}:${c}:${target}`);
  post(s, `mob29hire:${o.id}:${s.week}:${st.seq}`, -od.cost, 'legal', `Serviço da família (${o.name.pt})`);
  const res = commitCrime(s, c, ctxOf(o, c, target, method), r);
  if (!(typeof res === 'object' && 'ok' in res)) { post(s, `mob29refund:${o.id}:${s.week}:${st.seq}`, od.cost, 'legal', `Devolução (${o.name.pt})`); return { ok: false, text: res }; }
  // o calor que sobra para você (a família leva o resto); exposto, a polícia pode ligar o serviço a você
  addHeat(s, 'player', od.a3, od.heatYou * (res.ex ? 2 : 1));
  let leak: L | null = null;
  if (res.ex && r.chance(0.45)) {
    const d = crimeById(c)!;
    feedCase(s, 'player', od.a3, 10 + d.sev / 5, d.sev, true);
    if (s.persons[target]?.alive) grantHold(s, { holder: target, target: 'player', kind: 'grievance', strength: clamp(d.sev, 30, 90), months: 240, src: 'mob29', text: fmtL(N('Mandou {o} fazer "{c}"', 'Sent {o} to do "{c}"'), { o: o.name, c: d.name }), quiet: true });
    const owner = s.acts[target]?.owner ?? (s.labels[target] ? target : undefined);
    if (owner && s.labels[owner]) s.rivalries[owner] = (s.rivalries[owner] ?? 0) + 15;
    leak = fmtL(N(' A polícia liga o serviço a {c}.', ' Police tie the job to {c}.'), { c: s.config.companyName });
  }
  owe29(s, o, od.favor, fmtL(N('serviço "{c}" contra {t}', 'the "{c}" job against {t}'), { c: crimeById(c)!.name, t: nameOf17(s, target) }), r);
  bump(s, o.id, { res: 3 }); rel(s, o.id, 4);
  const text = fmtL(N('{o} fez o serviço: {x}{l} Você deve um favor a {b}.', '{o} did the job: {x}{l} You owe {b} a favor.'), { o: o.name, x: res.text, l: leak ?? '', b: bossName(o) });
  logIt(s, o.id, text);
  return { ok: res.ok, text };
}

// ================================================================ a família cobra (pedidos com prazo)

export interface AskDef29 { k: AskKind29; name: L; desc: L; fx: L; block: (s: GameState, o: Org17) => L | null; cost: (s: GameState, o: Org17) => number; run: (s: GameState, o: Org17, r: Rng) => L }
const bestRev = (s: GameState): number => Math.max(0, ...myActs(s).flatMap((a) => a.releases.map((id) => s.releases[id]).filter((x) => x && s.week - x.week < 26).map((x) => x.revenue)));
export const ASKS29: AskDef29[] = [
  { k: 'sign', name: N('Assinar o afilhado deles', 'Sign their protégé'), desc: N('"O garoto canta. Ele merece um contrato."', '"The kid can sing. He deserves a contract."'),
    fx: N('Adiantamento; um artista novo (fraco) no seu elenco.', 'An advance; a new (weak) act on your roster.'),
    cost: (s) => money(s, 3000), block: (s) => (s.config.role === 'artist' ? B.role : freeCash20(s) < money(s, 3000) ? cashWhy20(s, money(s, 3000), B.cash) : null),
    run: (s, o, r) => { post(s, `mob29sign:${o.id}:${s.week}`, -money(s, 3000), 'advances', `Adiantamento: afilhado de ${o.name.pt}`); const a = spawnProceduralAct(s, r, { city: o.city, fame: 4, members: 1 }); a.owner = 'player'; return fmtL(N('{a} entra no seu elenco — afilhado(a) de {b}.', '{a} joins your roster — {b}\'s protégé.'), { a: a.name, b: bossName(o) }); } },
  { k: 'club', name: N('Escalar um artista seu na boate deles', 'Book one of your acts at their club'), desc: N('"Duas semanas na nossa casa. Cachê simbólico."', '"Two weeks at our place. A token fee."'),
    fx: N('O artista fica 2 semanas ocupado por um cachê baixo.', 'The act is busy 2 weeks for a low fee.'),
    cost: () => 0, block: (s, o) => (actsIn(s, o).length ? null : B.noAct),
    run: (s, o) => { const a = actsIn(s, o)[0]; a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 2); post(s, `mob29ask:${o.id}:${s.week}`, money(s, 400), 'live', `Temporada na boate (${o.name.pt})`); return fmtL(N('{a} faz a temporada na boate de {o}.', '{a} plays the season at {o}\'s club.'), { a: a.name, o: o.name }); } },
  { k: 'launder', name: N('Passar um dinheiro deles pelo selo', 'Run some of their money through the label'), desc: N('"Uma vez só. Notas de turnê, ninguém olha."', '"Just once. Tour invoices, nobody checks."'),
    fx: N('Calor +8; eles guardam um segredo provado; 20% de virar caso.', 'Heat +8; they hold a proven secret; 20% chance it becomes a case.'),
    cost: () => 0, block: () => null,
    run: (s, o, r) => { addHeat(s, 'player', home(s), 8); grantHold(s, { holder: o.key, target: 'player', kind: 'secret', strength: 55, proof: 2, months: 120, src: 'mob29', text: N('Lavou dinheiro deles uma vez', 'Laundered their money once'), quiet: true }); if (r.chance(0.2)) feedCase(s, 'player', home(s), 15, 50, true); return fmtL(N('O dinheiro de {o} passa pelo seu caixa e some.', '{o}\'s money passes through your books and vanishes.'), { o: o.name }); } },
  { k: 'hide', name: N('Esconder alguém por um tempo', 'Hide someone for a while'), desc: N('"Um amigo precisa sumir. Seu estúdio tem um quarto, não tem?"', '"A friend needs to disappear. Your studio has a back room, right?"'),
    fx: N('Calor +10; 25% de virar caso (acobertamento).', 'Heat +10; 25% chance it becomes a case (harboring).'),
    cost: () => 0, block: () => null,
    run: (s, o, r) => { addHeat(s, 'player', home(s), 10); if (r.chance(0.25)) feedCase(s, 'player', home(s), 20, 45, true); return fmtL(N('Um "amigo" de {o} dorme no seu estúdio por um mês.', 'A "friend" of {o} sleeps at your studio for a month.'), { o: o.name }); } },
  { k: 'cut', name: N('Dar uma parte de um lançamento', 'Give them a cut of a release'), desc: N('"15% do seu disco novo. Somos sócios nisso."', '"15% of your new record. We\'re partners on this."'),
    fx: N('Paga 15% do faturamento do seu lançamento mais forte (mínimo fixo).', 'Pays 15% of your strongest release\'s revenue (fixed minimum).'),
    cost: (s) => Math.max(money(s, 2000), Math.round(bestRev(s) * 0.15)), block: (s) => { const c = Math.max(money(s, 2000), Math.round(bestRev(s) * 0.15)); return freeCash20(s) < c ? cashWhy20(s, c, B.cash) : null; },
    run: (s, o) => { const c = Math.max(money(s, 2000), Math.round(bestRev(s) * 0.15)); post(s, `mob29cut:${o.id}:${s.week}`, -c, 'royalties', `Participação de ${o.name.pt}`); return fmtL(N('{o} leva {v} do seu disco.', '{o} takes {v} of your record.'), { o: o.name, v: usd(c) }); } },
  { k: 'vote', name: N('Votar como eles querem', 'Vote the way they want'), desc: N('"Na associação das gravadoras, você vota com a gente."', '"At the labels\' association, you vote with us."'),
    fx: N('Reputação institucional −4.', 'Institutional reputation −4.'),
    cost: () => 0, block: () => null,
    run: (s, o) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100); return fmtL(N('Você vota com {o}. Os outros selos reparam.', 'You vote with {o}. The other labels notice.'), { o: o.name }); } },
  { k: 'job', name: N('Aceitar um trabalho da família', 'Take a job from the family'), desc: N('"Um caminhão precisa chegar ao outro lado da cidade. Você tem caminhões."', '"A truck needs to cross town. You have trucks."'),
    fx: N('Dinheiro; calor +6; 15% de virar caso; a família fica devendo a você.', 'Cash; heat +6; 15% chance of a case; the family owes you.'),
    cost: () => 0, block: () => null,
    run: (s, o, r) => { const v = money(s, 3000 + o.power * 50); post(s, `mob29job:${o.id}:${s.week}`, v, 'other_income', `"Frete" (${o.name.pt})`); crime17(s).loot19 = (crime17(s).loot19 ?? 0) + v; addHeat(s, 'player', home(s), 6); if (r.chance(0.15)) feedCase(s, 'player', home(s), 15, 40, true); grantHold(s, { holder: 'player', target: o.key, kind: 'favor', strength: 40, months: 60, src: 'mob29', ref: `j${mob29(s).seq}`, text: fmtL(N('{o} deve um favor por um "frete"', '{o} owes a favor for a "delivery"'), { o: o.name }), quiet: true }); return fmtL(N('O "frete" de {o} rende {v}. Agora eles devem a você.', '{o}\'s "delivery" pays {v}. Now they owe you.'), { o: o.name, v: usd(v) }); } },
];
export const askDef29 = (k: AskKind29): AskDef29 => ASKS29.find((x) => x.k === k)!;
export const asks29 = (s: GameState, oid?: string): Ask29[] => (peek29(s)?.asks ?? []).filter((a) => !oid || a.o === oid.replace(/^o:/, ''));

/** Cria um pedido (a família cobra o favor ou oferece trabalho). */
function ask29(s: GameState, o: Org17, k: AskKind29, hold?: string): Ask29 {
  const st = mob29(s);
  const a: Ask29 = { id: `mk${++st.seq}`, o: o.id, k, hold, w: s.week, dl: s.week + 4, esc: mo(s, o.id).esc };
  st.asks.push(a);
  const def = askDef29(k);
  notify(s, k === 'job'
    ? fmtL(N('{b} ({o}) oferece um trabalho: {x} Decida em Submundo › Organizações (4 semanas).', '{b} ({o}) offers a job: {x} Decide in Underworld › Organizations (4 weeks).'), { b: bossName(o), o: o.name, x: def.desc })
    : fmtL(N('{b} ({o}) cobra o favor: {n}. {x} Decida em Submundo › Organizações (4 semanas).', '{b} ({o}) calls in the favor: {n}. {x} Decide in Underworld › Organizations (4 weeks).'), { b: bossName(o), o: o.name, n: def.name, x: def.desc }), 'event');
  return a;
}

/** Cumpre o pedido: a dívida some, a confiança sobe. */
export function fulfill29(s: GameState, askId: string): { ok: boolean; text: L } {
  const st = mob29(s);
  const a = st.asks.find((x) => x.id === askId);
  const o = a ? orgById(s, a.o) : undefined;
  if (!a || !o) return { ok: false, text: N('Pedido não encontrado.', 'Request not found.') };
  const def = askDef29(a.k);
  const b = def.block(s, o);
  if (b) return { ok: false, text: b };
  st.seq++;
  const text = def.run(s, o, rng(s, `ask:${a.id}`));
  if (a.hold) for (const h of holds17(s).h) if (h.id === a.hold) { h.status = 'used'; h.uses++; h.lastUse = s.week; }
  st.asks = st.asks.filter((x) => x.id !== a.id);
  const m = mo(s, o.id);
  m.esc = Math.max(0, m.esc - 1);
  bump(s, o.id, a.k === 'job' ? { res: 6 } : { res: 12, hos: -10 }); rel(s, o.id, a.k === 'job' ? 4 : 8);
  logIt(s, o.id, text);
  return { ok: true, text };
}

/** Recusa (ou deixa vencer): a dívida continua e a família escala — ameaça, sabotagem, violência. */
export function refuse29(s: GameState, askId: string): { ok: boolean; text: L } {
  const st = mob29(s);
  const a = st.asks.find((x) => x.id === askId);
  const o = a ? orgById(s, a.o) : undefined;
  if (!a || !o) return { ok: false, text: N('Pedido não encontrado.', 'Request not found.') };
  st.asks = st.asks.filter((x) => x.id !== a.id);
  st.seq++;
  if (a.k === 'job') { bump(s, o.id, { res: -2 }); return { ok: true, text: fmtL(N('Você recusa o trabalho de {o}. Sem ressentimento — por ora.', 'You turn down {o}\'s job. No hard feelings — for now.'), { o: o.name }) }; }
  const m = mo(s, o.id);
  m.esc++;
  bump(s, o.id, { hos: 15 * m.esc, fear: 5 }); rel(s, o.id, -10);
  // o favor continua devido: cobram de novo em ~8 semanas
  for (const h of holds17(s).h) if (h.id === a.hold && h.data) h.data.due = s.week + 8;
  const text = retaliate29(s, o, m.esc, rng(s, `ret:${a.id}`));
  logIt(s, o.id, text);
  return { ok: true, text };
}

/** Retaliação pela escalada: 1 ameaça · 2 sabotagem do disco · 3 intimidação do líder · 4+ incêndio no estúdio. */
function retaliate29(s: GameState, o: Org17, esc: number, r: Rng): L {
  const a = myActs(s)[0];
  const strict = histMode(s) === 'strict' && o.real;
  if (esc <= 1 || !a || strict) {
    const t = fmtL(N('Recado de {b}: "da próxima vez não pedimos." A equipe está com medo.', 'A message from {b}: "next time we won\'t ask." The staff is scared.'), { b: bossName(o) });
    if (a) for (const m of a.members) addStress(s, m, 6, N('Ameaça da família', 'A threat from the family'));
    notify(s, t, 'bad');
    return t;
  }
  const lead = a.members.find((m) => s.persons[m]?.alive && !s.persons[m].isPlayer);
  const ctx: Ctx17 = esc >= 4 ? { actor: o.key, target: a.id, method: 'fire', org: o.id, partners: [] }
    : esc === 3 && lead ? { actor: o.key, target: lead, org: o.id, partners: [] }
      : { actor: o.key, target: a.id, method: 'release', org: o.id, partners: [] };
  const c = esc === 3 && lead ? 'assault' : 'sabotage';
  const res = commitCrime(s, c, ctx, r);
  const t = typeof res === 'object' && 'ok' in res ? fmtL(N('{o} retalia: {x}', '{o} retaliates: {x}'), { o: o.name, x: res.text }) : fmtL(N('{o} ameaça, mas não age: {x}', '{o} threatens but holds off: {x}'), { o: o.name, x: res });
  notify(s, t, 'bad');
  return t;
}

// ================================================================ ganchos (só com estado: mundos sem interação ficam iguais)

// proteção de artista: crimes de outros contra o ato protegido (ou alguém dele) perdem 25%
ODDS17.push((s, c, _cid, x) => {
  const st = peek29(s);
  if (!st || c.actor === 'player') return;
  const act = s.acts[c.target] ?? Object.values(s.acts).find((a) => a.members.includes(c.target) && (a.owner === 'player' || a.playerBand));
  if (!act) return;
  for (const [oid, m] of Object.entries(st.o)) if ((m.guard?.[act.id] ?? 0) > s.week && `o:${oid}` !== c.actor) {
    x.p -= 0.25;
    x.why.push(fmtL(N('Protegido por {o} −25%', 'Protected by {o} −25%'), { o: orgById(s, oid)?.name ?? oid }));
    return;
  }
});
// sócio não paga pizzo
SHIELD17.push((s, oid) => (peek29(s)?.o[oid]?.partner ? 1 : 0));

registerSimHook('month', 'mob29', (s) => {
  const st = peek29(s);
  if (!st) return;
  const r = Rng.fromSeed(`${s.config.seed}:mob29:m:${mIdx(s)}`);
  // pedidos vencidos: recusa automática (oferta de trabalho só expira)
  for (const a of st.asks.slice()) if (a.dl <= s.week) refuse29(s, a.id);
  // favores vencidos viram pedido
  for (const h of holds17(s).h) {
    if (h.status !== 'open' || h.src !== 'mob29' || h.target !== 'player' || h.kind !== 'favor' || !h.holder.startsWith('o:')) continue;
    if (Number(h.data?.due ?? Infinity) > s.week || st.asks.some((a) => a.hold === h.id)) continue;
    const o = orgById(s, h.holder);
    if (!o) continue;
    const pool = ASKS29.filter((d) => d.k !== 'job' && !d.block(s, o) && (d.k !== 'club' || hasRacket(o, 'clubs')) && (d.k !== 'launder' || hasRacket(o, 'laundering') || o.kind === 'cartel'));
    if (pool.length) ask29(s, o, r.pick(pool).k, h.id);
  }
  // cada família com que você lida
  for (const [oid, m] of Object.entries(st.o)) {
    const o = orgById(s, oid);
    if (!o) continue;
    m.hos = Math.max(0, m.hos - 2); m.fear = Math.max(0, m.fear - 2); m.res += m.res > 0 ? -1 : m.res < 0 ? 1 : 0;
    // proteção de artista: cobra e renova
    for (const [aid, until] of Object.entries(m.guard ?? {})) {
      if (until < s.week || !liveAct(s.acts[aid])) { delete m.guard![aid]; continue; }
      if (freeCash20(s) < guardFee29(s, o)) { delete m.guard![aid]; notify(s, fmtL(N('Sem dinheiro para a proteção: {o} deixa de proteger {a}.', 'No money for protection: {o} stops protecting {a}.'), { o: o.name, a: s.acts[aid].name }), 'bad'); continue; }
      post(s, `mob29guard:${oid}:${aid}:${s.week}`, -guardFee29(s, o), 'admin', `Segurança da família (${o.name.pt})`);
      m.guard![aid] = s.week + 5;
    }
    // sociedade: renda, calor e o risco de cair junto
    if (m.partner) {
      post(s, `mob29part:${oid}:${s.week}`, partnerCut29(s, o), 'services', `Sociedade (${o.name.pt})`);
      crime17(s).loot19 = (crime17(s).loot19 ?? 0) + partnerCut29(s, o);
      addHeat(s, 'player', home(s), 4);
      if (heatIn(s, home(s)) >= 40 && r.chance(0.08)) feedCase(s, 'player', home(s), 15, 55, true);
    }
    const mt = meter29(s, oid);
    // hostilidade alta: retaliação
    if (mt.hostility >= 60 && myActs(s).length && r.chance(0.25)) { m.esc = Math.max(m.esc, 2); const t = retaliate29(s, o, m.esc, r); logIt(s, oid, t); continue; }
    // respeito alto: oferecem trabalho
    if (mt.respect >= 50 && !st.asks.some((a) => a.o === oid) && r.chance(0.12)) ask29(s, o, 'job');
  }
});

/** Para a interface e os testes. */
export const _mob29 = { owe29, ask29, retaliate29, orgBlock29, B };
void countryName; void launderFee; void orgs17;
