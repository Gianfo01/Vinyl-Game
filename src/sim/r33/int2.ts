// R33 · INT-2 — PRÉDIOS NOVOS COM INTERIOR (sem DOM). Banco, cartório/tribunal, hospital/reabilitação, estádio, clube de
// jazz, boate, igreja/coral, estúdio de TV e cinema, agência de publicidade, escola de samba, gráfica/estúdio de arte,
// rádio pirata/garagem, estação de trem e porto. Interruptor `exp33.int2` (DESLIGADO no código, como os exp5.*):
// desligado, nenhum tipo existe (`int2Types` devolve vazio) e nenhuma ação roda.
//
//  • REGISTRO (`INT2`): cada tipo tem id, tamanho do lote, onde fica (`where`), e em que cidades e épocas existe. A MAPA33
//    lê `int2Types(cidade, ano)` e dá lote; quem desenha o prédio e o interior é ui/r33/int2px.ts.
//  • AÇÕES: pequenas e atrás de custo/bloqueio claros, no mesmo formato do cartão de lugar (`PAct27`). As regras de
//    dinheiro/pessoas de banco, hospital, cartório, estádio, TV, agência, gráfica e viagem passam pelos GANCHOS
//    (`INT2_HOOKS`, chave = `<lugar>.<ação>`): a frente dona (GESTÃO/VIDA/CATÁLOGO/MUNDO) registra a função e ela passa a
//    valer no lugar do efeito simples; sem gancho, vale o efeito pequeno daqui (reputação, estresse, saúde, caixa).
//  • Sem sorteio do jogo (nada de rng19): mesma semente, mesmo estado.

import { l, type L } from '../../data/world';
import { clamp } from '../../core/rng';
import { ownerOf } from '../sys/people/owner';
import { money, nextId, playerActs, post } from '../util';
import { freeCash20 } from '../oblig20';
import { loanOffer, takeLoan } from '../economy';
import { acceptInvite, fest8 } from '../sys/fests8';
import { ownFests } from '../sys/feststore';
import { addToLineup, setFestival } from '../sys/live/festival';
import type { PAct27 } from '../sys/place27';
import type { GameState } from '../types';
import { registerSwitch, sw } from '../r31/switches';

export const SW_INT2 = 'exp33.int2';
registerSwitch({ id: SW_INT2, def: false, scope: 'game',
  desc: l('INT-2 (v33): prédios novos com interior (banco, cartório, hospital, estádio, clubes, igreja, TV, agência, escola de samba, gráfica, rádio pirata, trem e porto) e as ações deles.',
    'INT-2 (v33): new buildings with interiors (bank, registry, hospital, stadium, clubs, church, TV, agency, samba school, print shop, pirate radio, train and port) and their actions.') });
export const int2On = (s: GameState): boolean => !!sw<boolean>(s, SW_INT2);

// ---------------------------------------------------------------- registro dos tipos

export type Int2Id = 'bank' | 'court' | 'hospital' | 'stadium' | 'jazz' | 'nightclub' | 'church' | 'tvstudio' | 'adagency' | 'samba' | 'festival' | 'print' | 'pirate' | 'station' | 'port';
/** Onde o lote deve ficar na cidade (a MAPA33 decide a posição exata). */
export type Int2Where = 'centro' | 'borda' | 'periferia' | 'bairro' | 'agua' | 'beco';
export interface Int2Type {
  id: Int2Id; name: L; /** tamanho do lote em células da grade da cidade */ lot: { w: number; d: number }; where: Int2Where;
  /** primeiro ano e ano em que fecha (exclusivo; 9999 = sem fim) */ from: number; to: number;
  /** só nestas cidades (ausente = qualquer) */ cities?: string[];
  /** precisa de cidade com porto/água */ water?: boolean;
  /** letreiro curto na fachada (fonte do jogo, sem acento) */ tag: string;
  /** arte do mapa isométrico enquanto o PRED não tem desenho próprio (id de `Art31`, ui/pixel/pred31) */ mapArt: string;
}
const MAP_ART: Record<Int2Id, string> = { bank: 'office', court: 'office', hospital: 'hotel', stadium: 'arena', jazz: 'venue', nightclub: 'venue', church: 'museum', tvstudio: 'tv', adagency: 'office', samba: 'arena', festival: 'fest', print: 'press', pirate: 'alley', station: 'platform', port: 'plant' };
const T = (id: Int2Id, pt: string, en: string, tag: string, lot: [number, number], where: Int2Where, from: number, to = 9999, x: Partial<Int2Type> = {}): Int2Type =>
  ({ id, name: l(pt, en), tag, lot: { w: lot[0], d: lot[1] }, where, from, to, mapArt: MAP_ART[id], ...x });

/** Cidades com porto de verdade (rio, mar ou lago grande) entre as do jogo. */
export const PORT_CITIES33: string[] = ['rio', 'salvador', 'recife', 'belem', 'fortaleza', 'manaus', 'sao_luis', 'florianopolis', 'porto_alegre', 'new_york', 'los_angeles', 'new_orleans',
  'detroit', 'chicago', 'seattle', 'san_francisco', 'miami', 'boston', 'houston', 'philadelphia', 'baltimore', 'toronto', 'montreal', 'vancouver', 'buenos_aires', 'montevideo', 'havana',
  'kingston', 'port_of_spain', 'cartagena', 'san_juan', 'santo_domingo', 'port_au_prince', 'pointe_a_pitre', 'panama', 'lima', 'santiago', 'london', 'liverpool', 'glasgow', 'dublin',
  'paris', 'lisbon', 'barcelona', 'naples', 'amsterdam', 'rotterdam', 'copenhagen', 'stockholm', 'st_petersburg', 'istanbul', 'athens', 'beirut', 'cairo', 'lagos', 'dakar',
  'johannesburg', 'mumbai', 'hong_kong', 'tokyo', 'seoul', 'bangkok', 'sydney', 'melbourne', 'honolulu', 'ibiza'];

/** Os 14 tipos novos. `to` do clube de jazz e `from` da boate se cruzam em 1970–79 (os dois existem). */
export const INT2: Int2Type[] = [
  T('bank', 'Banco', 'Bank', 'BANCO', [4, 4], 'centro', 1889),
  T('court', 'Cartório e tribunal', 'Registry and court', 'TRIBUNAL', [4, 4], 'centro', 1889),
  T('hospital', 'Hospital e reabilitação', 'Hospital and rehab', 'HOSPITAL', [4, 4], 'borda', 1889),
  T('stadium', 'Estádio', 'Stadium', 'ESTADIO', [8, 6], 'periferia', 1920),
  T('jazz', 'Clube de jazz', 'Jazz club', 'JAZZ CLUB', [4, 3], 'bairro', 1920, 1980),
  T('nightclub', 'Boate', 'Nightclub', 'BOATE', [4, 3], 'bairro', 1970),
  T('church', 'Igreja e coral', 'Church and choir', 'IGREJA', [4, 4], 'bairro', 1889),
  T('tvstudio', 'Estúdio de TV e cinema', 'TV and film studio', 'ESTUDIO TV', [6, 5], 'borda', 1920),
  T('adagency', 'Agência de publicidade', 'Advertising agency', 'AGENCIA', [4, 3], 'centro', 1900),
  T('samba', 'Escola de samba', 'Samba school', 'ESCOLA DE SAMBA', [6, 4], 'periferia', 1928, 9999, { cities: ['rio'] }),
  T('festival', 'Terreno do festival', 'Festival grounds', 'FESTIVAL', [8, 6], 'periferia', 1889),
  T('print', 'Gráfica e estúdio de arte', 'Print shop and art studio', 'GRAFICA', [4, 3], 'borda', 1889),
  T('pirate', 'Rádio pirata e garagem', 'Pirate radio and garage', 'GARAGEM', [3, 3], 'beco', 1960),
  T('station', 'Estação de trem', 'Train station', 'ESTACAO', [6, 4], 'centro', 1889),
  T('port', 'Porto', 'Harbour', 'PORTO', [6, 4], 'agua', 1889, 9999, { water: true }),
];
export const INT2_IDS: Int2Id[] = INT2.map((t) => t.id);
export const int2Def = (id: string): Int2Type | undefined => INT2.find((t) => t.id === id);

/** O tipo existe nesta cidade neste ano? (puro; não olha o interruptor — quem lê o mapa usa `int2Types`) */
export function int2Exists(t: Int2Type, city: string, year: number): boolean {
  if (year < t.from || year >= t.to) return false;
  if (t.cities && !t.cities.includes(city)) return false;
  if (t.water && !PORT_CITIES33.includes(city)) return false;
  return true;
}
/** Tipos que a MAPA33 deve dar lote nesta cidade e ano. Interruptor desligado: nenhum. */
export function int2Types(s: GameState, city = s.config.homeCity, year = s.year): Int2Type[] {
  return int2On(s) ? INT2.filter((t) => int2Exists(t, city, year)) : [];
}

/** Nome e o que o lugar é nesta época (o cartão e o letreiro lêem). */
export function int2What(id: Int2Id, year: number): L {
  switch (id) {
    case 'bank': return year < 1930 ? l('Banco de balcão e gaiolas de latão', 'Counting house with brass teller cages') : year < 1990 ? l('Banco: gerente, cofre e financiamento', 'Bank: manager, vault and loans')
      : l('Agência bancária e crédito digital', 'Branch bank and digital credit');
    case 'court': return year < 1950 ? l('Cartório e fórum: registro de obras e contratos', 'Registry and courthouse: works and contracts') : l('Cartório e tribunal: autoria, plágio e rescisão', 'Registry and court: authorship, plagiarism and termination');
    case 'hospital': return year < 1970 ? l('Hospital e sanatório', 'Hospital and sanatorium') : l('Hospital e clínica de reabilitação', 'Hospital and rehab clinic');
    case 'stadium': return year < 1970 ? l('Estádio de arquibancada de concreto', 'Concrete-stand stadium') : l('Estádio de shows e esportes', 'Concert and sports stadium');
    case 'jazz': return l('Clube de jazz: mesinhas, palco baixo e fumaça', 'Jazz club: small tables, low stage and smoke');
    case 'nightclub': return year < 1990 ? l('Discoteca: pista iluminada e globo de espelhos', 'Disco: lit floor and mirror ball') : year < 2010 ? l('Boate: cabine de DJ e lasers', 'Nightclub: DJ booth and lasers')
      : l('Casa noturna: telão de LED e som imersivo', 'Nightclub: LED wall and immersive sound');
    case 'church': return l('Igreja: nave, órgão e coral', 'Church: nave, organ and choir');
    case 'tvstudio': return year < 1950 ? l('Estúdio de cinema: refletores e câmera de manivela', 'Film studio: lamps and a hand-cranked camera')
      : year < 1990 ? l('Estúdio de TV: auditório, câmeras e programa de calouros', 'TV studio: audience, cameras and a talent show') : l('Estúdio de TV e cinema: telão verde e auditório', 'TV and film studio: green screen and audience');
    case 'adagency': return year < 1950 ? l('Agência: cartazes e anúncios de rádio', 'Agency: posters and radio spots') : l('Agência de publicidade: jingles e sincronização', 'Ad agency: jingles and sync');
    case 'samba': return l('Escola de samba: quadra, bateria e alegorias', 'Samba school: floor, drums and floats');
    case 'festival': return year < 1920 ? l('Coreto e feira ao ar livre', 'Bandstand and open-air fair') : year < 1950 ? l('Parque com banda e palco de concha', 'Park with a band and a bandshell')
      : year < 1970 ? l('Campo com palco de madeira e lona', 'Field with a wooden stage and canvas') : year < 1990 ? l('Festival na lama: palco de andaimes e acampamento', 'Muddy festival: scaffold stage and camping')
      : year < 2010 ? l('Megafestival: palco gigante e telões', 'Mega festival: giant stage and screens') : l('Festival de LED e drones', 'LED and drone festival');
    case 'print': return year < 1950 ? l('Gráfica de prensa e tipos de chumbo', 'Print shop with lead type') : year < 1990 ? l('Gráfica offset e estúdio de capas', 'Offset press and cover studio') : l('Estúdio de arte e impressão digital', 'Art studio and digital print');
    case 'pirate': return year < 1980 ? l('Rádio pirata no porão: transmissor e discos', 'Pirate radio in a cellar: transmitter and records') : year < 2005 ? l('Garagem e rádio livre', 'Garage and free radio') : l('Garagem e web-rádio underground', 'Garage and underground web radio');
    case 'station': return year < 1950 ? l('Estação de trem: saguão, relógio e vapor', 'Train station: hall, clock and steam') : year < 1990 ? l('Estação de trem: plataforma e painel de partidas', 'Train station: platform and departures board')
      : l('Estação de trem-bala e metrô', 'High-speed rail and metro station');
    case 'port': return year < 1950 ? l('Porto: cais, guindastes e navios a vapor', 'Harbour: quay, cranes and steamships') : l('Porto: contêineres e passagem de navio', 'Harbour: containers and ship passage');
  }
}

// ---------------------------------------------------------------- ações

export interface Int2Res { ok: boolean; text: L }
/** Gancho da frente dona: devolve o resultado, ou null para deixar valer o efeito simples daqui. Chave = `<lugar>.<ação>`. */
export type Int2Hook = (s: GameState, key: string) => Int2Res | null;
/**
 * Ganchos registrados por outras frentes (nenhum existe ainda): `bank.collateral` (CATÁLOGO: relíquias/catálogo como garantia),
 * `bank.loan` (GESTÃO), `court.plagio`/`court.rescisao`/`court.registro` (CATÁLOGO: rights18), `hospital.checkup` (VIDA),
 * `hospital.rehab` (VIDA/PESSOAS), `stadium.show` (PESSOAS/turnês), `tvstudio.audition`/`tvstudio.score` (CATÁLOGO: pop31),
 * `adagency.jingle`/`adagency.sync` (CATÁLOGO), `print.cover` (CATÁLOGO: capa pesa no físico), `station.trip`/`port.ship` (MUNDO).
 */
export const INT2_HOOKS: Record<string, Int2Hook> = {};

type RepK = 'artistic' | 'commercial' | 'artists' | 'institutional';
interface ActDef {
  id: string; label: L; desc: L;
  /** custo em dólares reais (vira nominal do ano); 0 = grátis */ cost?: number;
  /** ganho de caixa em dólares reais (show, jingle) */ gain?: number;
  stress?: number; health?: number; rep?: [RepK, number];
  /** semanas até poder repetir neste lugar */ cd?: number;
  /** só existe a partir deste ano (ex.: reabilitação depois de 1970) */ from?: number;
  /** efeito próprio (empréstimo, reabilitação) no lugar do efeito simples */ own?: (s: GameState, key: string) => Int2Res;
  /** motivo de bloqueio próprio além de caixa e espera */ block?: (s: GameState) => L | null;
}
const A = (id: string, pt: string, en: string, dpt: string, den: string, x: Partial<ActDef> = {}): ActDef => ({ id, label: l(pt, en), desc: l(dpt, den), ...x });

interface State33 { cd: Record<string, number>; used: Record<string, number> }
const st = (s: GameState): State33 => { const x = s.x4 as unknown as { int2?: State33 }; return (x.int2 ??= { cd: {}, used: {} }); };
/** Quantas vezes uma ação já foi usada (testes e relatório). */
export const int2Used = (s: GameState, key: string): number => st(s).used[key] ?? 0;

function clampRep(s: GameState, k: RepK, d: number): void { s.player.reputation[k] = clamp(s.player.reputation[k] + d, 0, 100); }

/** Crédito pequeno com o catálogo como garantia (efeito simples enquanto o gancho `bank.collateral` não existe). */
function smallLoan(s: GameState, key: string): Int2Res {
  const amount = money(s, 6000), rate = clamp(0.1 + (s.economy.recession ? 0.04 : 0), 0.04, 0.3), months = 12;
  const monthly = Math.round((amount * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -months)));
  s.player.loans.push({ id: nextId(s, 'ln'), principal: amount, balance: amount, rate, monthly, startWeek: s.week });
  post(s, `${key}:in`, amount, 'financing', 'Crédito com garantia do catálogo');
  return { ok: true, text: l(`O banco aceitou o catálogo como garantia: ${Math.round(rate * 100)}% ao ano em 12 meses.`, `The bank took the catalogue as collateral: ${Math.round(rate * 100)}% a year over 12 months.`) };
}
const loanBlock = (s: GameState): L | null =>
  s.player.loans.length >= 3 ? l('Você já tem 3 empréstimos abertos.', 'You already have 3 open loans.')
    : s.player.insolvencyMonths >= 2 ? l('O banco não empresta a quem está no vermelho.', 'The bank will not lend to someone in the red.') : null;

/** Reabilitação: o 1º integrante de artista seu com vício, burnout ou doença entra em tratamento (fica 'recovering'). */
function rehabTarget(s: GameState): { id: string; name: string } | null {
  for (const aid of playerActs(s)) {
    const a = s.acts[aid]; if (!a || a.deceased) continue;
    for (const m of a.members) { const p = s.persons[m]; if (p?.alive && (p.health === 'addiction' || p.health === 'burnout' || p.health === 'ill')) return { id: p.id, name: p.name }; }
  }
  return null;
}
function rehab(s: GameState): Int2Res {
  const t = rehabTarget(s)!; const p = s.persons[t.id];
  p.health = 'recovering'; p.stress = clamp(p.stress - 20, 0, 100); p.morale = clamp(p.morale + 6, 0, 100);
  return { ok: true, text: l(`${t.name} entrou em tratamento: estresse −20 e a saúde começa a se recuperar.`, `${t.name} started treatment: stress −20 and health begins to recover.`) };
}

const ACTS: Record<Int2Id, ActDef[]> = {
  bank: [
    A('loan', 'Pedir empréstimo', 'Take a loan', 'Crédito normal do banco (o mesmo da livro-caixa), com juros da época; em crise o crédito encarece.', 'Normal bank credit (same as the ledger) at period rates; in a crisis credit gets dearer.',
      { block: (s) => loanBlock(s) ?? (loanOffer(s) ? null : l('O banco não oferece crédito agora.', 'The bank offers no credit now.')),
        own: (s) => { const o = loanOffer(s); if (!takeLoan(s) || !o) return { ok: false, text: l('O banco recusou.', 'The bank refused.') };
          return { ok: true, text: l(`Empréstimo aprovado: ${Math.round(o.rate * 100)}% ao ano em ${o.months} meses.`, `Loan approved: ${Math.round(o.rate * 100)}% a year over ${o.months} months.`) }; } }),
    A('collateral', 'Catálogo como garantia', 'Catalogue as collateral', 'Crédito menor e rápido, com o seu catálogo de músicas como garantia.', 'A smaller, fast credit with your song catalogue as collateral.',
      { cd: 8, block: loanBlock, own: (s, key) => smallLoan(s, key) }),
  ],
  court: [
    A('registro', 'Registrar obras', 'Register works', 'Registrar autoria no cartório: a reputação institucional sobe um pouco.', 'Register authorship at the registry: institutional reputation rises a little.', { cost: 250, rep: ['institutional', 0.5], cd: 12 }),
    A('plagio', 'Consultar plágio e direitos', 'Check plagiarism and rights', 'Advogado do tribunal confere se suas músicas ou as de outros se parecem demais.', 'A court lawyer checks whether your songs, or someone else\'s, are too alike.', { cost: 500, stress: -3, rep: ['institutional', 0.2], cd: 8 }),
    A('rescisao', 'Rescisão de contrato', 'Contract termination', 'Ver como romper um contrato sem cair em processo.', 'See how to break a contract without being sued.', { cost: 800, stress: -2, rep: ['institutional', 0.2], cd: 12 }),
  ],
  hospital: [
    A('checkup', 'Consulta e exames', 'Check-up', 'A sua saúde: estresse menor e um ponto de saúde.', 'Your health: lower stress and a point of health.', { cost: 300, stress: -6, health: 2, cd: 4 }),
    A('rehab', 'Reabilitação de artista', 'Artist rehab', 'Interna um integrante seu com vício, burnout ou doença para tratar.', 'Admits one of your members with addiction, burnout or illness for treatment.',
      { cost: 4000, cd: 8, from: 1970, block: (s) => (rehabTarget(s) ? null : l('Nenhum integrante seu precisa de tratamento.', 'None of your members needs treatment.')), own: rehab }),
  ],
  stadium: [
    A('show', 'Reservar show de estádio', 'Book a stadium show', 'Uma noite para multidões: reputação comercial sobe.', 'A night for crowds: commercial reputation rises.', { cost: 5000, rep: ['commercial', 0.8], cd: 12 }),
    A('jogo', 'Ver o jogo da cidade', 'Watch the city match', 'Uma tarde de arquibancada: estresse menor.', 'An afternoon in the stands: lower stress.', { cost: 40, stress: -4, cd: 2 }),
  ],
  jazz: [
    A('tocar', 'Tocar uma noite', 'Play a night', 'Sobe ao palco baixo: cachê pequeno e prestígio artístico.', 'Step on the low stage: a small fee and artistic prestige.', { gain: 120, rep: ['artistic', 0.4], cd: 4 }),
    A('ouvir', 'Ouvir a casa', 'Listen to the house band', 'Uma noite de fumaça e improviso: estresse menor.', 'A night of smoke and improvisation: lower stress.', { cost: 30, stress: -4, cd: 2 }),
  ],
  nightclub: [
    A('tocar', 'Tocar na pista', 'Play the floor', 'Cabine do DJ: cachê e fama comercial.', 'The DJ booth: a fee and commercial fame.', { gain: 200, rep: ['commercial', 0.3], cd: 4 }),
    A('noite', 'Noite na pista', 'A night out', 'Dançar e ser visto: estresse menor.', 'Dance and be seen: lower stress.', { cost: 80, stress: -4, cd: 2 }),
  ],
  church: [
    A('coro', 'Missa e coral', 'Mass and choir', 'Uma hora de coral e silêncio: estresse menor.', 'An hour of choir and silence: lower stress.', { stress: -3, cd: 2 }),
    A('doar', 'Doar ao coral', 'Donate to the choir', 'Ajuda o coral da paróquia: reputação institucional e artistas.', 'Helps the parish choir: institutional and artists reputation.', { cost: 300, rep: ['institutional', 0.3], cd: 8 }),
  ],
  tvstudio: [
    A('calouros', 'Programa de calouros', 'Talent show', 'Leva um artista seu ao palco do auditório: reputação comercial sobe.', 'Takes one of your acts on the audience stage: commercial reputation rises.', { cost: 1200, rep: ['commercial', 0.5], cd: 8 }),
    A('trilha', 'Vender uma trilha', 'Sell a score', 'Trilha para filme ou programa: cachê e prestígio.', 'A score for a film or show: a fee and prestige.', { gain: 900, rep: ['artistic', 0.3], cd: 8 }),
  ],
  adagency: [
    A('jingle', 'Encomendar um jingle', 'Commission a jingle', 'Você compõe o jingle de um anunciante: cachê.', 'You write a client\'s jingle: a fee.', { gain: 700, rep: ['commercial', 0.2], cd: 6 }),
    A('sync', 'Sincronização em comercial', 'Ad sync licence', 'Licencia uma música sua para um comercial: cachê maior e fama.', 'Licenses one of your songs to a commercial: bigger fee and fame.', { gain: 1500, rep: ['commercial', 0.4], cd: 12, from: 1930 }),
  ],
  samba: [
    A('ensaio', 'Ensaio da bateria', 'Drum rehearsal', 'Noite de ensaio na quadra: estresse menor e prestígio artístico.', 'A rehearsal night on the floor: lower stress and artistic prestige.', { cost: 60, stress: -4, rep: ['artistic', 0.2], cd: 2 }),
    A('carnaval', 'Desfilar no Carnaval', 'Parade at Carnival', 'Apoia o enredo da escola: reputação artistic e artistas sobem.', 'Back the school\'s theme: artistic and artists reputation rise.', { cost: 1500, rep: ['artistic', 0.8], cd: 26 }),
  ],
  festival: [
    A('convite', 'Aceitar convite de festival', 'Accept a festival invitation', 'Aceita o convite mais antigo de um festival para um artista seu (o mesmo da carreira festival).', 'Accepts the oldest festival invitation for one of your acts (same as the festival career).',
      { cd: 1, block: (s) => (fest8(s).invites.length ? null : l('Nenhum convite pendente.', 'No pending invitation.')),
        own: (s) => { const inv = fest8(s).invites[0]; const e = acceptInvite(s, inv.id); return e ? { ok: false, text: e } : { ok: true, text: l('Convite aceito: o artista entrou no line-up.', 'Invitation accepted: the act joined the bill.') }; } }),
    A('escalar', 'Escalar artista no seu festival', 'Book an act at your festival', 'Põe um artista seu no line-up do seu festival (precisa de palco livre no terreno).', 'Puts one of your acts on your festival bill (needs a free stage on the grounds).',
      { cd: 1, block: (s) => (!ownFests(s).length ? l('Você ainda não tem festival próprio.', 'You have no festival of your own yet.') : freeAct(s) ? null : l('Todos os seus artistas já estão no line-up.', 'All your acts are already on the bill.')),
        own: (s) => { const f = ownFests(s)[0], a = freeAct(s)!; const e = addToLineup(s, f.id, a); return e ? { ok: false, text: e } : { ok: true, text: l('Artista escalado no festival.', 'Act booked at the festival.') }; } }),
    A('ingresso', 'Subir o preço do ingresso', 'Raise the ticket price', 'Sobe o ingresso do seu festival em 10%: mais receita, público mais exigente.', 'Raises your festival ticket by 10%: more revenue, a pickier crowd.',
      { cd: 4, block: (s) => (ownFests(s).length ? null : l('Você ainda não tem festival próprio.', 'You have no festival of your own yet.')),
        own: (s) => { const f = ownFests(s)[0]; setFestival(s, f.id, { price: f.price * 1.1 }); return { ok: true, text: l('Ingresso reajustado em 10%.', 'Ticket raised by 10%.') }; } }),
    A('visitar', 'Passar o dia no festival', 'Spend the day at the festival', 'Um dia na grama, ouvindo música: estresse menor.', 'A day on the grass listening to music: lower stress.', { cost: 40, stress: -4, cd: 2 }),
  ],
  print: [
    A('capa', 'Encomendar capa melhor', 'Order a better cover', 'Arte de capa feita por um artista gráfico: prestígio artístico.', 'Cover art by a graphic artist: artistic prestige.', { cost: 700, rep: ['artistic', 0.4], cd: 8 }),
    A('cartaz', 'Imprimir cartazes', 'Print posters', 'Cartazes para a cidade: fama comercial.', 'Posters for the city: commercial fame.', { cost: 150, rep: ['commercial', 0.2], cd: 4 }),
  ],
  pirate: [
    A('transmitir', 'Tocar na rádio pirata', 'Play on pirate radio', 'Sua música no ar sem licença: prestígio no submundo, mas o meio institucional torce o nariz.', 'Your song on air without a licence: underground cred, but the establishment frowns.', { rep: ['artists', 0.4], cd: 4 }),
    A('garagem', 'Ensaio na garagem', 'Garage jam', 'Um ensaio barulhento: estresse menor.', 'A noisy jam: lower stress.', { stress: -3, cd: 2 }),
  ],
  station: [
    A('viagem', 'Viajar de trem', 'Take the train', 'Uma viagem longa e calma: estresse menor.', 'A long calm trip: lower stress.', { cost: 150, stress: -4, cd: 4 }),
    A('bagagem', 'Despachar discos pelo trem', 'Ship records by rail', 'Frete ferroviário de discos para outras cidades: fama comercial.', 'Rail freight of records to other cities: commercial fame.', { cost: 250, rep: ['commercial', 0.2], cd: 6 }),
  ],
  port: [
    A('embarque', 'Passagem de navio', 'Ship passage', 'Travessia de navio: estresse menor (viagem lenta antes do avião).', 'A sea crossing: lower stress (slow travel before the plane).', { cost: 400, stress: -3, cd: 6 }),
    A('carga', 'Despachar discos pelo mar', 'Export records by sea', 'Exportação de discos: fama comercial.', 'Exporting records: commercial fame.', { cost: 300, rep: ['commercial', 0.2], cd: 6 }),
  ],
};
export const int2ActDefs = (id: Int2Id): { id: string; label: L }[] => ACTS[id].map((a) => ({ id: a.id, label: a.label }));

/** Primeiro artista seu que ainda não está no line-up do 1º festival próprio. */
function freeAct(s: GameState): string | undefined {
  const f = ownFests(s)[0];
  return f ? playerActs(s).find((id) => s.acts[id] && !f.lineup.some((x) => x.actId === id)) : undefined;
}
const weeksLeft = (s: GameState, key: string): number => Math.max(0, (st(s).cd[key] ?? 0) - s.week);

/** Ações do lugar no formato do cartão de lugar (PAct27): custo, motivo de bloqueio e descrição. */
export function int2Acts(s: GameState, id: Int2Id): PAct27[] {
  if (!int2On(s)) return [];
  return ACTS[id].filter((a) => !a.from || s.year >= a.from).map((a): PAct27 => {
    const key = `${id}.${a.id}`, cost = a.cost ? money(s, a.cost) : 0;
    let dis: L | undefined;
    const w = weeksLeft(s, key);
    if (w > 0) dis = l(`Volte em ${w} semana${w > 1 ? 's' : ''}.`, `Come back in ${w} week${w > 1 ? 's' : ''}.`);
    else if (cost && freeCash20(s) < cost) dis = l('Caixa livre insuficiente.', 'Not enough free cash.');
    else dis = a.block?.(s) ?? undefined;
    return { id: key, label: a.label, desc: a.desc, cost: cost || undefined, dis };
  });
}

/** Executa a ação `<lugar>.<ação>`. O gancho da frente dona vence; sem gancho vale o efeito simples. */
export function int2Do(s: GameState, key: string): Int2Res {
  if (!int2On(s)) return { ok: false, text: l('Prédios novos desligados nesta partida.', 'New buildings are off in this game.') };
  const [pid, aid] = key.split('.');
  const t = int2Def(pid), a = t && ACTS[t.id].find((x) => x.id === aid);
  if (!t || !a) return { ok: false, text: l('Ação desconhecida.', 'Unknown action.') };
  if (!int2Exists(t, s.config.homeCity, s.year)) return { ok: false, text: l('Este lugar não existe aqui nesta época.', 'This place does not exist here in this era.') };
  const dis = int2Acts(s, t.id).find((x) => x.id === key)?.dis;
  if (dis) return { ok: false, text: dis };
  const cost = a.cost ? money(s, a.cost) : 0;
  const hook = INT2_HOOKS[key]?.(s, key);
  if (hook) { if (hook.ok) { if (cost) post(s, `int2:${key}`, -cost, 'int2', a.label.pt); st(s).cd[key] = s.week + (a.cd ?? 0); st(s).used[key] = (st(s).used[key] ?? 0) + 1; } return hook; }
  let r: Int2Res | null = null;
  if (a.own) { r = a.own(s, `int2:${key}`); if (!r.ok) return r; }
  if (cost) post(s, `int2:${key}`, -cost, 'int2', a.label.pt);
  if (a.gain) post(s, `int2:${key}:g`, money(s, a.gain), 'int2', a.label.pt);
  const o = ownerOf(s);
  if (a.stress) o.stress = clamp(o.stress + a.stress, 0, 100);
  if (a.health) o.health = clamp(o.health + a.health, 0, 100);
  if (a.rep) clampRep(s, a.rep[0], a.rep[1]);
  st(s).cd[key] = s.week + (a.cd ?? 0); st(s).used[key] = (st(s).used[key] ?? 0) + 1;
  return r ?? { ok: true, text: l(`${a.label.pt}: feito.`, `${a.label.en}: done.`) };
}

/** Linha de situação do lugar para o cartão (crise de crédito, estado de saúde…). */
export function int2Now(s: GameState, id: Int2Id): L {
  switch (id) {
    case 'bank': return s.economy.recession ? l('Crise de crédito: o banco aperta e os juros sobem.', 'Credit crunch: the bank tightens and rates rise.') : l('Crédito normal.', 'Normal credit.');
    case 'hospital': { const t = rehabTarget(s); return t ? l(`${t.name} precisa de tratamento.`, `${t.name} needs treatment.`) : l('Ninguém seu precisa de tratamento.', 'Nobody of yours needs treatment.'); }
    default: return int2What(id, s.year);
  }
}
