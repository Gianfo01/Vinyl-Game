// Dados da identidade do selo e da liderança (rodada 8, §3.1 e §3.8 do documento do jogador).
// Perfis estratégicos nascem das decisões repetidas; cada um muda oportunidades, custos/riscos e reações
// de artistas, imprensa e concorrentes — nunca um bônus passivo solto. Trajetórias profissionais e
// estilos de liderança ligam a biografia do dono ao jeito como a indústria o trata.

import { l, type L } from '../../../data/world';
import type { BackgroundId } from '../life/data';
import { XDEFS } from './extra';

// ---------------------------------------------------------------- perfis do selo

export type CoreProfileId = 'hits' | 'catalog' | 'scene' | 'export' | 'dev' | 'tech' | 'live';
/** Perfis de selo: 7 do núcleo + 11 da rodada 9 (ver identity/extra.ts). */
export type ProfileId = CoreProfileId | 'hifi' | 'regional' | 'political' | 'sync' | 'gospel' | 'archive' | 'idol' | 'diy' | 'luxury' | 'starlabel' | 'predator';

export interface ProfileDef {
  id: ProfileId;
  name: L;
  desc: L;
  /** decisões que constroem o perfil */
  builds: L;
  opps: L[];
  costs: L[];
  reactions: L[];
}

const CORE_PROFILES: ProfileDef[] = [
  {
    id: 'hits', name: l('Selo de hits', 'Hit factory'),
    desc: l('Lança muito, rápido e para o grande público.', 'Releases a lot, fast, for the mass audience.'),
    builds: l('Lançamentos frequentes, singles, marketing forte e top 10.', 'Frequent releases, singles, heavy marketing and top 10s.'),
    opps: [l('Lançamentos novos +10% de apelo (a máquina está quente).', 'New releases +10% appeal (the machine is hot).'), l('Ação: Blitz nas rádios (+18% de apelo por 8 semanas).', 'Action: Radio blitz (+18% appeal for 8 weeks).'), l('Convites de TV para as estrelas.', 'TV invitations for your stars.')],
    costs: [l('Artistas esperam adiantamentos 10% maiores.', 'Artists expect 10% larger advances.'), l('Reedições rendem 15% menos (o público quer novidade).', 'Reissues earn 15% less (the public wants new stuff).'), l('Atos com 3+ lançamentos no ano se desgastam.', 'Acts with 3+ releases a year burn out.')],
    reactions: [l('Atos que querem fama/status gostam de você; os de arte/crítica, não.', 'Fame/status-driven acts like you; art/critics-driven ones do not.'), l('Imprensa: −0,3 nas notas ("fábrica").', 'Press: −0.3 on scores ("factory").'), l('Rivais de hits e impérios ficam mais hostis.', 'Hit-making and empire rivals grow hostile.')],
  },
  {
    id: 'catalog', name: l('Selo de catálogo', 'Catalog label'),
    desc: l('Vive do acervo: reedições, coletâneas e discos que vendem por décadas.', 'Lives off the vault: reissues, compilations and records that sell for decades.'),
    builds: l('Reedições, coletâneas, catálogo antigo que ainda vende.', 'Reissues, compilations, an old catalog that still sells.'),
    opps: [l('Reedições e coletâneas +25% de apelo.', 'Reissues and compilations +25% appeal.'), l('Ação: Licenciar o catálogo para coletâneas e sync.', 'Action: License the catalog for compilations and sync.'), l('Investidores valorizam o acervo (+12% no valor).', 'Investors value the vault (+12% valuation).')],
    costs: [l('Lançar com menos de 4 semanas de intervalo: −12% (não ganha o bônus de cadência).', 'Releasing less than 4 weeks apart: −12% (no cadence bonus).'), l('Rivais de catálogo fazem propostas pelo seu acervo.', 'Catalog rivals bid for your vault.')],
    reactions: [l('Atos que buscam segurança e legado gostam; os que buscam fama, não.', 'Security/legacy-driven acts like you; fame-driven ones do not.'), l('Imprensa: +0,4 em reedições.', 'Press: +0.4 on reissues.'), l('Rivais de catálogo disputam direitos com você.', 'Catalog rivals compete for rights with you.')],
  },
  {
    id: 'scene', name: l('Selo de cena', 'Scene label'),
    desc: l('Credibilidade local enorme, sem dominar o mercado global.', 'Huge local credibility without dominating the global market.'),
    builds: l('Contratar artistas da cidade-sede, shows em casa, elenco underground.', 'Signing acts from your HQ city, home shows, an underground roster.'),
    opps: [l('Atos da sua cidade: ofertas melhores e +6 de confiança.', 'Acts from your city: better offers and +6 trust.'), l('Shows no mercado de casa +15% de demanda.', 'Home-market shows +15% demand.'), l('Ação: Noite do selo (vitrine na cidade, sobe a cena).', 'Action: Label night (home showcase, lifts the scene).')],
    costs: [l('Lançamentos voltados ao exterior perdem até 15% de apelo.', 'Releases aimed abroad lose up to 15% appeal.'), l('Caçadores de cena rivais tentam levar seus atos.', 'Rival scene hunters try to take your acts.')],
    reactions: [l('Atos crossover (posicionamento alto) acham o selo pequeno.', 'Crossover acts think the label is small.'), l('Imprensa: +0,3 para discos underground.', 'Press: +0.3 for underground records.'), l('Rivais caçadores de cena ficam hostis.', 'Scene-hunter rivals grow hostile.')],
  },
  {
    id: 'export', name: l('Exportador regional', 'Regional exporter'),
    desc: l('Leva a música para fora do mercado de origem.', 'Takes the music beyond its home market.'),
    builds: l('Territórios abertos, lançamentos e shows fora do país.', 'Open territories, releases and shows abroad.'),
    opps: [l('Shows fora do mercado de casa +12% de demanda.', 'Shows outside the home market +12% demand.'), l('Lançamentos em 2+ territórios +8% de apelo.', 'Releases in 2+ territories +8% appeal.'), l('Ação: Acordo com parceiro estrangeiro (adiantamento na hora).', 'Action: Foreign partner deal (cash up front).')],
    costs: [l('Escritórios e parceiros no exterior custam todo mês.', 'Offices and partners abroad cost money every month.'), l('Atos da sua cidade se sentem deixados de lado.', 'Acts from your city feel left behind.')],
    reactions: [l('Atos que querem fama e status querem você.', 'Fame/status-driven acts want you.'), l('As majors (impérios) te veem como invasor.', 'Majors (empires) see you as an invader.'), l('Imprensa de fora ouve mais (+0,2 em lançamentos internacionais).', 'Foreign press listens more (+0.2 on international releases).')],
  },
  {
    id: 'dev', name: l('Selo formador', 'Artist-development label'),
    desc: l('Descobre cedo e lapida: carreiras longas, retorno lento.', 'Finds early and polishes: long careers, slow returns.'),
    builds: l('Assinar desconhecidos, contratos longos, gasto com desenvolvimento e mentoria.', 'Signing unknowns, long contracts, development spend and mentoring.'),
    opps: [l('Atos pequenos: +6 de confiança, +1,5 de qualidade e moral todo mês.', 'Small acts: +6 trust, +1.5 quality and monthly morale.'), l('Ação: Residência artística (inspiração e técnica).', 'Action: Artist residency (inspiration and chops).'), l('Estreias ganham atenção da crítica (+0,3).', 'Debuts get critics\' attention (+0.3).')],
    costs: [l('Estrelas (fama alta) acham o selo uma escola: ofertas piores.', 'Stars (high fame) see the label as a school: worse offers.'), l('Rivais caçadores de estrelas rondam quem você formou.', 'Star-hunting rivals circle the acts you developed.')],
    reactions: [l('Artistas iniciantes disputam uma vaga.', 'Up-and-coming acts compete for a slot.'), l('Imprensa: +0,3 em estreias.', 'Press: +0.3 on debuts.'), l('Rivais de estrelas ficam de olho.', 'Star-hunting rivals keep watch.')],
  },
  {
    id: 'tech', name: l('Pioneiro tecnológico', 'Tech pioneer'),
    desc: l('Primeiro a adotar formatos, ferramentas e (mais tarde) a era neural.', 'First to adopt formats, tools and (later) the neural era.'),
    builds: l('Lançar nos formatos mais novos, equipamento, adoção neural e atos sintéticos.', 'Releasing in the newest formats, gear, neural adoption and synthetic acts.'),
    opps: [l('Fabricação 10% mais barata.', 'Manufacturing 10% cheaper.'), l('Lançamentos digitais vendem +8%.', 'Digital releases sell +8%.'), l('Ação: Laboratório de formatos (mais desconto e vendas; risco de falha pública).', 'Action: Format lab (bigger discount and sales; risk of public failure).')],
    costs: [l('Falhas técnicas viram escândalo de vez em quando.', 'Technical failures sometimes become scandals.'), l('Atos movidos a arte ou crítica desconfiam (ofertas piores).', 'Art/critics-driven acts distrust you (worse offers).')],
    reactions: [l('Imprensa: −0,2 fora da música eletrônica ("frio").', 'Press: −0.2 outside electronic music ("cold").'), l('Rivais copiam suas apostas: rivalidade sobe com o maior concorrente.', 'Rivals copy your bets: rivalry rises with the biggest competitor.')],
  },
  {
    id: 'live', name: l('Selo de palco e comunidade', 'Live & fan-community label'),
    desc: l('A estrada é o centro: shows, turnês e fãs fiéis.', 'The road is the core: gigs, tours and loyal fans.'),
    builds: l('Muitos shows e turnês, bilheteria, fãs do núcleo.', 'Lots of gigs and tours, box office, core fans.'),
    opps: [l('Bilheteria +12% e demanda +8%.', 'Box office +12% and demand +8%.'), l('Fãs do núcleo crescem todo mês.', 'Core fans grow every month.'), l('Ação: Festival do selo (renda e fãs, uma vez por ano).', 'Action: Label festival (income and fans, once a year).')],
    costs: [l('Discos de estúdio vendem 6% menos (discos ao vivo, +20%).', 'Studio records sell 6% less (live records +20%).'), l('Elenco cansa mais; você vive na estrada (+estresse).', 'Roster tires faster; you live on the road (+stress).')],
    reactions: [l('Artistas de palco confiam mais (+3).', 'Stage acts trust you more (+3).'), l('Imprensa: +0,5 em discos ao vivo.', 'Press: +0.5 on live records.')],
  },
];
export const PROFILES: ProfileDef[] = [...CORE_PROFILES, ...XDEFS];
export const profileById = Object.fromEntries(PROFILES.map((p) => [p.id, p])) as Record<ProfileId, ProfileDef>;

// ---------------------------------------------------------------- trajetórias profissionais

export type OriginId = 'exMusician' | 'radio' | 'promoter' | 'journalist' | 'recordStore' | 'majorExec' | 'sceneOrganizer';

export interface OriginDef {
  id: OriginId;
  name: L;
  desc: L;
  contacts: L;
  advantages: L;
  drawbacks: L;
  /** perfil do selo para onde a trajetória empurra no começo */
  seed: Partial<Record<ProfileId, number>>;
  /** dívida inicial: parcelas mensais (dólares reais) */
  debt?: { months: number; real: number; memo: string };
}

export const ORIGINS: OriginDef[] = [
  {
    id: 'exMusician', name: l('Ex-músico(a)', 'Former musician'),
    desc: l('Tocou anos antes de abrir o selo.', 'Played for years before starting the label.'),
    contacts: l('Dois atos da cidade são velhos companheiros de palco (radar e confiança).', 'Two acts in town are old stage mates (radar and trust).'),
    advantages: l('Artistas confiam mais (+4) e ouvem você sobre arte.', 'Artists trust you more (+4) and listen to you about art.'),
    drawbacks: l('Lacuna: negociação −6. A indústria te acha amador (−4 de reputação institucional) e os amigos pedem adiantamentos 5% maiores.', 'Gap: negotiation −6. The industry finds you amateurish (−4 institutional reputation) and friends ask 5% larger advances.'),
    seed: { dev: 10 },
  },
  {
    id: 'radio', name: l('Radialista', 'Radio host'),
    desc: l('Comandou um programa e sabe o que toca.', 'Ran a show and knows what gets played.'),
    contacts: l('Programadores de rádio atendem sua ligação: singles +5% de apelo e +1 sinal por mês.', 'Radio programmers take your call: singles +5% appeal and +1 signal a month.'),
    advantages: l('Ouvido para single e acesso às rádios.', 'An ear for singles and radio access.'),
    drawbacks: l('Dívida de favores: 18 parcelas ao antigo patrão. A crítica te vê como "homem do jabá" (−0,2).', 'Favor debt: 18 instalments to your old boss. Critics see you as a "payola guy" (−0.2).'),
    seed: { hits: 10 },
    debt: { months: 18, real: 220, memo: 'Dívida com a antiga rádio' },
  },
  {
    id: 'promoter', name: l('Promotor(a) de shows', 'Show promoter'),
    desc: l('Montou noites, casas e festivais.', 'Put on nights, venues and festivals.'),
    contacts: l('Casas do mercado de casa: +10% de demanda e +6% de bilheteria.', 'Home-market venues: +10% demand and +6% box office.'),
    advantages: l('Sabe vender ingresso e montar turnê.', 'Knows how to sell tickets and route tours.'),
    drawbacks: l('Dívida de um festival que deu prejuízo (24 parcelas). Lacuna: ouvido −6.', 'Debt from a festival that lost money (24 instalments). Gap: ear −6.'),
    seed: { live: 10 },
    debt: { months: 24, real: 260, memo: 'Dívida do festival antigo' },
  },
  {
    id: 'journalist', name: l('Jornalista musical', 'Music journalist'),
    desc: l('Escreveu críticas e reportagens por anos.', 'Wrote reviews and features for years.'),
    contacts: l('Redações te recebem: críticas +0,4 e relatórios 8% mais precisos.', 'Newsrooms welcome you: reviews +0.4 and reports 8% sharper.'),
    advantages: l('Imprensa a favor e leitura fina dos artistas.', 'Press on your side and a sharp read on artists.'),
    drawbacks: l('Preconceito: três artistas que você detonou numa resenha desconfiam muito; um selo rival guarda rancor.', 'Prejudice: three artists you panned in a review distrust you deeply; a rival label holds a grudge.'),
    seed: { scene: 6, dev: 4 },
  },
  {
    id: 'recordStore', name: l('Herdeiro(a) de loja de discos', 'Record-store heir'),
    desc: l('Cresceu atrás do balcão, entre colecionadores.', 'Grew up behind the counter among collectors.'),
    contacts: l('Colecionadores e lojistas: reedições +10% de apelo e vendas +3%.', 'Collectors and retailers: reissues +10% appeal and sales +3%.'),
    advantages: l('Conhece o catálogo de todo mundo.', 'Knows everyone\'s catalog.'),
    drawbacks: l('Hipoteca da loja (24 parcelas). Lacuna: carisma −5.', 'The store mortgage (24 instalments). Gap: charisma −5.'),
    seed: { catalog: 10 },
    debt: { months: 24, real: 200, memo: 'Hipoteca da loja de discos' },
  },
  {
    id: 'majorExec', name: l('Ex-executivo(a) de major', 'Former major-label executive'),
    desc: l('Subiu numa grande gravadora e saiu para ter o próprio selo.', 'Climbed a major label and left to run your own.'),
    contacts: l('Agenda de executivos: +6 de negociação, adiantamentos 6% menores e atos ambiciosos te ouvem.', 'An executive rolodex: +6 negotiation, 6% smaller advances and ambitious acts listen.'),
    advantages: l('Sabe fechar contrato e falar com distribuidores.', 'Knows how to close deals and talk to distributors.'),
    drawbacks: l('A antiga major te persegue (rivalidade alta, ameaça de quebra de sigilo). Artistas underground desconfiam.', 'Your old major hounds you (high rivalry, non-compete threats). Underground acts distrust you.'),
    seed: { hits: 6, export: 6 },
  },
  {
    id: 'sceneOrganizer', name: l('Organizador(a) de cena independente', 'Indie scene organizer'),
    desc: l('Fanzines, porões, coletivos e noites do bairro.', 'Zines, basements, collectives and neighbourhood nights.'),
    contacts: l('Três atos underground da cidade no radar; atos locais +6 de confiança e +1 sinal por mês.', 'Three underground local acts on the radar; local acts +6 trust and +1 signal a month.'),
    advantages: l('Credibilidade de rua e faro para o que vem.', 'Street credibility and a nose for what is next.'),
    drawbacks: l('Estrelas e atos crossover te acham pequeno. Bancos e indústria te ignoram (−5 de reputação institucional). Lacuna: gestão −5.', 'Stars and crossover acts think you are small. Banks and the industry ignore you (−5 institutional reputation). Gap: management −5.'),
    seed: { scene: 10 },
  },
];
export const originById = Object.fromEntries(ORIGINS.map((o) => [o.id, o])) as Record<OriginId, OriginDef>;

/** Origem antiga (rodadas 5–6) → trajetória profissional. */
export const ORIGIN_OF_BACKGROUND: Record<BackgroundId, OriginId> = {
  musician: 'exMusician', producer: 'exMusician', academic: 'exMusician',
  dj: 'radio', roadie: 'promoter', critic: 'journalist', fan: 'recordStore',
  heir: 'majorExec', lawyer: 'majorExec', tech: 'majorExec', street: 'sceneOrganizer',
};

// ---------------------------------------------------------------- estilos de liderança

export type LeadId = 'artistFirst' | 'pragmatic' | 'paternal' | 'delegator' | 'controller';

export interface LeadDef {
  id: LeadId;
  name: L;
  desc: L;
  builds: L;
  trust: L;
  negotiation: L;
  retention: L;
  stress: L;
}

export const LEADS: LeadDef[] = [
  {
    id: 'artistFirst', name: l('Artista em primeiro lugar', 'Artist-first'),
    desc: l('Dá liberdade, cumpre o que promete e aceita perder margem.', 'Grants freedom, keeps promises and accepts thinner margins.'),
    builds: l('Controle criativo nos contratos, aumentos de royalty, apoiar artistas nas crises.', 'Creative control in deals, royalty raises, backing artists in crises.'),
    trust: l('+5 ao assinar e a confiança sobe todo mês.', '+5 on signing and trust rises every month.'),
    negotiation: l('Atos de arte/liberdade/crítica topam mais; royalties baixos pesam contra.', 'Art/freedom/critics acts agree more; low royalties count against you.'),
    retention: l('Renovações +10%.', 'Renewals +10%.'),
    stress: l('Carga emocional: um pouco mais de estresse.', 'Emotional load: a bit more stress.'),
  },
  {
    id: 'pragmatic', name: l('Pragmático(a)', 'Pragmatic'),
    desc: l('Números primeiro: corta o que não dá retorno.', 'Numbers first: cuts whatever does not pay.'),
    builds: l('Adiantamentos baixos, rescisões, 360, vender ativos, quebrar promessas.', 'Low advances, terminations, 360 deals, selling assets, breaking promises.'),
    trust: l('Atos insatisfeitos perdem confiança aos poucos.', 'Unhappy acts slowly lose trust.'),
    negotiation: l('Adiantamentos esperados 6% menores; atos de dinheiro/segurança gostam, os de arte não.', 'Expected advances 6% smaller; money/security acts like it, art acts do not.'),
    retention: l('Renovações −8%.', 'Renewals −8%.'),
    stress: l('Dorme bem: −10% de estresse.', 'Sleeps well: −10% stress.'),
  },
  {
    id: 'paternal', name: l('Paternalista', 'Paternalistic'),
    desc: l('Cuida de todos como família — e decide por eles.', 'Looks after everyone like family — and decides for them.'),
    builds: l('Mentorias, gasto com desenvolvimento, pagar tratamento e descanso, contratos longos com promessas.', 'Mentoring, development spend, paying for treatment and rest, long deals with promises.'),
    trust: l('+4 ao assinar e moral do elenco sobe.', '+4 on signing and roster morale rises.'),
    negotiation: l('Atos que buscam segurança adoram; os que querem liberdade se sentem sufocados.', 'Security-driven acts love it; freedom-driven ones feel smothered.'),
    retention: l('Renovações +12%.', 'Renewals +12%.'),
    stress: l('Carrega todo mundo: +15% de estresse e mais com elenco grande.', 'Carries everyone: +15% stress, more with a big roster.'),
  },
  {
    id: 'delegator', name: l('Delegador(a)', 'Delegator'),
    desc: l('Monta a equipe e sai da frente.', 'Builds the team and gets out of the way.'),
    builds: l('Atos no piloto automático, equipe grande, deixar a poeira baixar nas crises.', 'Acts on autopilot, a big staff, letting crises settle on their own.'),
    trust: l('−3 ao assinar (querem falar com o dono).', '−3 on signing (they want to talk to the owner).'),
    negotiation: l('Ofertas um pouco menos convincentes.', 'Offers slightly less convincing.'),
    retention: l('Renovações −5%.', 'Renewals −5%.'),
    stress: l('−20% de estresse e +1 tempo livre por mês.', '−20% stress and +1 free time a month.'),
  },
  {
    id: 'controller', name: l('Controlador(a)', 'Controller'),
    desc: l('Decide tudo: repertório, capa, agenda.', 'Decides everything: songs, cover, schedule.'),
    builds: l('Negar controle criativo, gerir a agenda de perto, segurar artistas pelo contrato.', 'Denying creative control, micromanaging schedules, holding artists to contracts.'),
    trust: l('−3 ao assinar; confiança cai aos poucos.', '−3 on signing; trust slowly erodes.'),
    negotiation: l('Atos de arte/liberdade fogem; os de segurança aceitam.', 'Art/freedom acts flee; security acts accept.'),
    retention: l('Renovações −10%, mas +1 de qualidade nas gravações (controle de qualidade).', 'Renewals −10%, but +1 recording quality (quality control).'),
    stress: l('+12% de estresse.', '+12% stress.'),
  },
];
export const leadById = Object.fromEntries(LEADS.map((x) => [x.id, x])) as Record<LeadId, LeadDef>;

/** Palavras das opções dos cartões de decisão que revelam um estilo. */
export const OPTION_STYLE: Record<string, Partial<Record<LeadId, number>>> = {
  refuse: { controller: 1.5 }, deny: { controller: 1.5, pragmatic: 0.5 }, hold: { controller: 2.5 }, force: { controller: 2.5 }, insist: { controller: 1.5 },
  sue: { controller: 1, pragmatic: 1 }, silence: { controller: 1.5 }, takedown: { controller: 1 }, bury: { controller: 1.5 }, dismiss: { controller: 1.5 },
  fight: { controller: 1 }, retaliate: { controller: 1.5 }, oppose: { controller: 1 }, push: { controller: 1.5 }, rush: { controller: 1, pragmatic: 1 }, replace: { controller: 1, pragmatic: 1 },
  support: { artistFirst: 2 }, accept: { artistFirst: 1 }, credit: { artistFirst: 2 }, let_go: { artistFirst: 1.5 }, letgo: { artistFirst: 1.5 }, listen: { artistFirst: 2 },
  grant: { artistFirst: 2 }, embrace: { artistFirst: 1.5 }, consent: { artistFirst: 1.5 }, equal: { artistFirst: 2 }, cowrite: { artistFirst: 1 }, collab: { artistFirst: 1 },
  roots: { artistFirst: 1 }, patience: { artistFirst: 1, paternal: 1 }, peace: { artistFirst: 1 }, apologize: { artistFirst: 1.5 }, praise: { artistFirst: 1 }, stand: { artistFirst: 1.5 }, match: { artistFirst: 1, paternal: 1 },
  pay: { paternal: 1.5 }, rest: { paternal: 2 }, hiatus: { paternal: 1.5 }, rehab: { paternal: 2.5 }, therapy: { paternal: 2.5 }, treatment: { paternal: 2.5 }, surgery: { paternal: 2 },
  protect: { paternal: 2 }, lend: { paternal: 2 }, mediate: { paternal: 1.5 }, talk: { paternal: 1.5 }, home: { paternal: 1 }, pause: { paternal: 1.5 }, keep: { paternal: 1 },
  sell: { pragmatic: 2 }, sell_catalog: { pragmatic: 2.5 }, sell_act: { pragmatic: 3 }, cheap: { pragmatic: 2 }, cashin: { pragmatic: 2 }, settle: { pragmatic: 1.5 }, license: { pragmatic: 1 },
  smaller: { pragmatic: 1.5 }, reduce: { pragmatic: 1.5 }, split: { pragmatic: 1 }, decline: { pragmatic: 0.8 }, double_down: { pragmatic: 1 }, charge: { pragmatic: 1.5 }, drop: { pragmatic: 2 },
  ignore: { delegator: 1.5 }, skip: { delegator: 1 }, wait: { delegator: 1.5 }, watch: { delegator: 1.5 }, pass: { delegator: 1 }, ok: { delegator: 0.8 }, comply: { delegator: 1 },
};
