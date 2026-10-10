// Rodada 17 — organizações criminosas por era/região. As REAIS só trazem laços DOCUMENTADOS (imprensa,
// processos, audiências públicas) e nunca põem pessoas reais vivas cometendo crimes inventados; as FICTÍCIAS
// (ids 'f…') nascem na cidade-base do jogador e podem tudo. Crônica real (DOC17) só com fatos públicos.

import { l, type L } from './world';

export type Racket17 = 'jukebox' | 'clubs' | 'payola' | 'bootleg' | 'tickets' | 'protection' | 'laundering' | 'violence' | 'carnival' | 'corridos';
export type OrgKind17 = 'mafia' | 'gang' | 'cartel' | 'syndicate' | 'firm';
export interface OrgDef17 {
  id: string;
  name: L;
  kind: OrgKind17;
  /** cidade-sede (id); fictícias: '' = cidade-base do jogador */
  city: string;
  from: number;
  to: number;
  real: boolean;
  /** 0..100 */
  power: number;
  rackets: Racket17[];
  desc: L;
  /** laços documentados (texto, ano) — os únicos exibidos no modo Vida real exata */
  ties?: { who: string; y: number; text: L }[];
  /** chefe documentado já falecido ou condenado (para persona); fictícias geram um nome */
  boss?: string;
  /** facetas do chefe (decidem planos) */
  f?: { coragem?: number; empatia?: number; ambicao?: number; impulsividade?: number; lealdade?: number; disciplina?: number };
}

export const RACKET_NAME: Record<Racket17, L> = {
  jukebox: l('Jukeboxes', 'Jukeboxes'), clubs: l('Boates e casas', 'Nightclubs and venues'), payola: l('Jabá', 'Payola'), bootleg: l('Pirataria', 'Bootlegging'),
  tickets: l('Bilheteria/cambistas', 'Tickets/scalping'), protection: l('Proteção (pizzo)', 'Protection money'), laundering: l('Lavagem', 'Laundering'),
  violence: l('Violência', 'Violence'), carnival: l('Carnaval e escolas', 'Carnival and samba schools'), corridos: l('Narcocorridos', 'Narcocorridos'),
};
export const KIND_NAME: Record<OrgKind17, L> = {
  mafia: l('Máfia', 'Mafia'), gang: l('Gangue', 'Gang'), cartel: l('Cartel', 'Cartel'), syndicate: l('Sindicato do crime', 'Crime syndicate'), firm: l('"Firma"', '"Firm"'),
};

export const ORGS17: OrgDef17[] = [
  { id: 'outfit', name: l('Chicago Outfit', 'Chicago Outfit'), kind: 'mafia', city: 'chicago', from: 1920, to: 2026, real: true, power: 80, rackets: ['jukebox', 'clubs', 'protection', 'laundering'],
    desc: l('Controlou jukeboxes, boates e cassinos de Chicago a Las Vegas; as audiências do Senado (1959) expuseram o racket das jukeboxes.', 'Controlled jukeboxes, nightclubs and casinos from Chicago to Las Vegas; Senate hearings (1959) exposed the jukebox racket.'),
    ties: [{ who: 'Frank Sinatra', y: 1960, text: l('Amizade documentada com Sam Giancana; Nevada cassou sua licença no Cal-Neva Lodge (1963) por hospedar o chefão. Nunca foi acusado de crime.', 'Documented friendship with Sam Giancana; Nevada revoked his Cal-Neva Lodge license (1963) for hosting the boss. Never charged with a crime.') }],
    boss: 'Sam Giancana', f: { coragem: 85, empatia: 15, ambicao: 85, impulsividade: 45, lealdade: 70, disciplina: 70 } },
  { id: 'genovese', name: l('Família Genovese', 'Genovese family'), kind: 'mafia', city: 'new_york', from: 1931, to: 2026, real: true, power: 85, rackets: ['jukebox', 'clubs', 'payola', 'bootleg', 'protection'],
    desc: l('Nova York: jukeboxes, boates da Rua 52, distribuição de discos e prensagem pirata nos anos 50–80.', 'New York: jukeboxes, 52nd Street clubs, record distribution and bootleg pressing in the 1950s–80s.'),
    ties: [{ who: 'Morris Levy', y: 1957, text: l('O dono da Roulette Records teve laços com a família relatados em investigações; condenado por extorsão em 1988.', 'The Roulette Records owner had ties to the family reported by investigators; convicted of extortion in 1988.') }],
    boss: 'Vincent Gigante', f: { coragem: 80, empatia: 10, ambicao: 80, impulsividade: 30, lealdade: 80, disciplina: 85 } },
  { id: 'kray', name: l('A Firma dos gêmeos Kray', 'The Kray twins\' Firm'), kind: 'firm', city: 'london', from: 1954, to: 1968, real: true, power: 55, rackets: ['clubs', 'protection', 'violence'],
    desc: l('Boates do West End frequentadas por astros; extorsão e violência até a prisão dos gêmeos em 1968.', 'West End clubs frequented by stars; extortion and violence until the twins\' arrest in 1968.'),
    boss: 'Ronnie Kray', f: { coragem: 90, empatia: 10, ambicao: 75, impulsividade: 80, lealdade: 60, disciplina: 35 } },
  { id: 'yamaguchi', name: l('Yamaguchi-gumi', 'Yamaguchi-gumi'), kind: 'syndicate', city: 'osaka', from: 1950, to: 2026, real: true, power: 85, rackets: ['tickets', 'clubs', 'protection'],
    desc: l('O clã de Kobe controlava a promoção de shows (kōgyō) no pós-guerra pela agência Kobe Geinosha.', 'The Kobe clan controlled postwar concert promotion (kōgyō) through the Kobe Geinosha agency.'),
    ties: [{ who: 'Misora Hibari', y: 1957, text: l('Seus shows foram organizados pela Kobe Geinosha, de Kazuo Taoka — fato público que lhe custou a TV estatal.', 'Her shows were organized by Kazuo Taoka\'s Kobe Geinosha — a public fact that cost her state TV.') }],
    boss: 'Kazuo Taoka', f: { coragem: 75, empatia: 25, ambicao: 85, impulsividade: 25, lealdade: 85, disciplina: 90 } },
  { id: 'bicho', name: l('Banqueiros do jogo do bicho', 'Jogo do bicho bankers'), kind: 'syndicate', city: 'rio', from: 1950, to: 2026, real: true, power: 65, rackets: ['carnival', 'protection', 'laundering'],
    desc: l('Patronos das escolas de samba do Rio; condenados em 1993 pela juíza Denise Frossard.', 'Patrons of Rio\'s samba schools; convicted in 1993 by judge Denise Frossard.'),
    boss: 'Castor de Andrade', f: { coragem: 70, empatia: 40, ambicao: 80, impulsividade: 35, lealdade: 75, disciplina: 70 } },
  { id: 'cv', name: l('Comando Vermelho', 'Comando Vermelho'), kind: 'gang', city: 'rio', from: 1979, to: 2026, real: true, power: 70, rackets: ['clubs', 'protection', 'violence'],
    desc: l('Facção nascida no presídio de Ilha Grande; domina bailes funk em favelas do Rio, berço do "proibidão".', 'A faction born in the Ilha Grande prison; dominates baile funk parties in Rio favelas, cradle of "proibidão".'),
    f: { coragem: 85, empatia: 15, ambicao: 75, impulsividade: 70, lealdade: 60, disciplina: 45 } },
  { id: 'camorra', name: l('Camorra', 'Camorra'), kind: 'mafia', city: 'naples', from: 1950, to: 2026, real: true, power: 75, rackets: ['bootleg', 'clubs', 'protection', 'tickets'],
    desc: l('Nápoles: CDs piratas, festas de casamento com cantores neomelódicos e cambismo — investigado pela promotoria antimáfia.', 'Naples: bootleg CDs, weddings with neomelodic singers and scalping — investigated by anti-mafia prosecutors.'),
    f: { coragem: 75, empatia: 20, ambicao: 80, impulsividade: 55, lealdade: 55, disciplina: 50 } },
  { id: 'medellin', name: l('Cartel de Medellín', 'Medellín Cartel'), kind: 'cartel', city: 'medellin', from: 1976, to: 1993, real: true, power: 90, rackets: ['laundering', 'violence', 'clubs'],
    desc: l('Lavagem de bilhões por boates, shows e empresas de fachada até a morte de Pablo Escobar (1993).', 'Laundered billions through clubs, concerts and shell firms until Pablo Escobar\'s death (1993).'),
    boss: 'Pablo Escobar', f: { coragem: 90, empatia: 10, ambicao: 95, impulsividade: 60, lealdade: 40, disciplina: 60 } },
  { id: 'sinaloa', name: l('Cartel de Sinaloa', 'Sinaloa Cartel'), kind: 'cartel', city: 'guadalajara', from: 1989, to: 2026, real: true, power: 90, rackets: ['corridos', 'laundering', 'violence'],
    desc: l('Encomenda narcocorridos e financia bailes; cantores do gênero já foram mortos após shows.', 'Commissions narcocorridos and funds dances; singers of the genre have been killed after shows.'),
    f: { coragem: 90, empatia: 10, ambicao: 90, impulsividade: 50, lealdade: 50, disciplina: 70 } },
  { id: 'mobpiru', name: l('Mob Piru Bloods', 'Mob Piru Bloods'), kind: 'gang', city: 'los_angeles', from: 1972, to: 2026, real: true, power: 50, rackets: ['violence', 'protection'],
    desc: l('Gangue de Compton; associados trabalharam como "seguranças" da Death Row nos anos 90.', 'A Compton gang; associates worked as Death Row "security" in the 1990s.'),
    ties: [{ who: 'Suge Knight', y: 1991, text: l('Associação documentada em processos; condenado em 2018 por homicídio culposo (atropelamento).', 'Association documented in court; convicted of voluntary manslaughter in 2018 (hit-and-run).') }],
    f: { coragem: 85, empatia: 15, ambicao: 70, impulsividade: 80, lealdade: 65, disciplina: 30 } },
  { id: 'sscrips', name: l('Southside Compton Crips', 'Southside Compton Crips'), kind: 'gang', city: 'los_angeles', from: 1970, to: 2026, real: true, power: 45, rackets: ['violence', 'protection'],
    desc: l('Rivais dos Piru; citados pela polícia de Las Vegas no inquérito da morte de 2Pac (1996).', 'Rivals of the Pirus; named by Las Vegas police in the 2Pac death inquiry (1996).'),
    f: { coragem: 85, empatia: 15, ambicao: 60, impulsividade: 85, lealdade: 60, disciplina: 25 } },
  // ---- fictícias: nascem na cidade-base do jogador
  { id: 'fnoite', name: l('Sindicato da Noite', 'The Night Syndicate'), kind: 'syndicate', city: '', from: 1940, to: 2100, real: false, power: 45, rackets: ['clubs', 'protection', 'tickets', 'violence'],
    desc: l('Donos invisíveis de boates e bilheterias da cidade; cobram "proteção" de quem faz show.', 'Invisible owners of the city\'s clubs and box offices; charge "protection" from anyone who plays.'),
    f: { coragem: 75, empatia: 20, ambicao: 75, impulsividade: 50, lealdade: 55, disciplina: 60 } },
  { id: 'fprensa', name: l('A Prensa Fantasma', 'The Ghost Press'), kind: 'syndicate', city: '', from: 1950, to: 2100, real: false, power: 35, rackets: ['bootleg', 'laundering'],
    desc: l('Fábrica clandestina: vinil, fita, CD e depois vazamentos digitais dos sucessos alheios.', 'A clandestine plant: vinyl, tape, CD and later digital leaks of other people\'s hits.'),
    f: { coragem: 50, empatia: 35, ambicao: 80, impulsividade: 30, lealdade: 40, disciplina: 70 } },
  { id: 'fomega', name: l('Escritório Ômega', 'Omega Office'), kind: 'firm', city: '', from: 1960, to: 2100, real: false, power: 55, rackets: ['laundering', 'payola'],
    desc: l('Contadores de terno que lavam dinheiro por selos e "consultorias" de rádio.', 'Suited accountants who launder money through labels and radio "consultancies".'),
    f: { coragem: 45, empatia: 30, ambicao: 85, impulsividade: 20, lealdade: 35, disciplina: 90 } },
  { id: 'fcrew', name: l('Os Lobos do Porto', 'The Harbor Wolves'), kind: 'gang', city: '', from: 1970, to: 2100, real: false, power: 40, rackets: ['violence', 'protection', 'clubs'],
    desc: l('Gangue de rua que vende "segurança" a rappers e roqueiros — e acerta contas a tiros.', 'A street gang that sells "security" to rappers and rockers — and settles scores with bullets.'),
    f: { coragem: 90, empatia: 15, ambicao: 65, impulsividade: 85, lealdade: 70, disciplina: 25 } },
];

/** Crônica real do crime na música: só fatos públicos; `dead` exige que a pessoa já tenha morrido no jogo. */
export const DOC17: { y: number; m: number; text: L; org?: string; dead?: string; a3: string }[] = [
  { y: 1959, m: 10, a3: 'USA', org: 'genovese', text: l('Audiências do Congresso sobre o jabá: DJs depõem e Alan Freed cai em desgraça.', 'Congressional payola hearings: DJs testify and Alan Freed falls from grace.') },
  { y: 1963, m: 8, a3: 'USA', org: 'outfit', text: l('Nevada cassa a licença de Frank Sinatra no Cal-Neva Lodge por hospedar Sam Giancana.', 'Nevada revokes Frank Sinatra\'s Cal-Neva Lodge license for hosting Sam Giancana.') },
  { y: 1968, m: 4, a3: 'GBR', org: 'kray', text: l('Os gêmeos Kray são presos em Londres; as boates do West End mudam de dono.', 'The Kray twins are arrested in London; the West End clubs change hands.') },
  { y: 1988, m: 4, a3: 'USA', org: 'genovese', text: l('Morris Levy, da Roulette Records, é condenado por extorsão.', 'Morris Levy of Roulette Records is convicted of extortion.') },
  { y: 1993, m: 4, a3: 'BRA', org: 'bicho', text: l('A juíza Denise Frossard condena a cúpula do jogo do bicho no Rio.', 'Judge Denise Frossard convicts the jogo do bicho leadership in Rio.') },
  { y: 1995, m: 7, a3: 'USA', text: l('Source Awards: a rixa Costa Leste × Costa Oeste explode em público.', 'Source Awards: the East Coast × West Coast feud explodes in public.') },
  { y: 1996, m: 8, a3: 'USA', dead: '2Pac', org: 'sscrips', text: l('2Pac é baleado em Las Vegas e morre dias depois; o caso fica décadas sem solução.', '2Pac is shot in Las Vegas and dies days later; the case stays unsolved for decades.') },
  { y: 1997, m: 2, a3: 'USA', dead: 'The Notorious B.I.G.', text: l('The Notorious B.I.G. é morto a tiros em Los Angeles; o crime nunca é solucionado.', 'The Notorious B.I.G. is shot dead in Los Angeles; the crime is never solved.') },
  { y: 2006, m: 10, a3: 'MEX', org: 'sinaloa', text: l('O cantor de narcocorridos Valentín Elizalde é assassinado após um show em Reynosa.', 'Narcocorrido singer Valentín Elizalde is murdered after a show in Reynosa.') },
  { y: 2018, m: 9, a3: 'USA', org: 'mobpiru', text: l('Suge Knight é condenado a 28 anos por homicídio culposo.', 'Suge Knight is sentenced to 28 years for voluntary manslaughter.') },
  { y: 2023, m: 8, a3: 'USA', dead: '2Pac', org: 'sscrips', text: l('A polícia de Las Vegas indicia um suspeito pela morte de 2Pac, 27 anos depois.', 'Las Vegas police indict a suspect in 2Pac\'s death, 27 years later.') },
];
