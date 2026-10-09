// Rodada 10: mais gravadoras para escolher no Novo Jogo. Cada uma tem nome ficcional e nome real (modo
// "Nomes reais"), ano de fundação plausível (real), cidade, porte (família A–D), gêneros e um manual de
// estratégia reconhecível. Só existem a partir do ano de fundação: as que nascem depois são fundadas durante
// a partida, com notícia. Também lista executivos reais famosos (modo nomes reais) que assumem um selo
// quando ele existe.

import type { CatalogLabel } from './catalog';
import { l } from './world';

export interface ExtraLabel extends CatalogLabel {
  real: string;
  /** manual de estratégia (PlaybookId de rivals8; texto para não importar o simulador) */
  playbook: string;
}

const x = (id: string, name: string, real: string, pt: string, en: string, city: string, founded: number, family: CatalogLabel['family'], focus: string[], playbook: string): ExtraLabel =>
  ({ id, name, real, archetype: l(pt, en), city, founded, family, focus, playbook });

export const EXTRA_LABELS: ExtraLabel[] = [
  x('x_odeon_br', 'Casa Odeão', 'Odeon (Brasil)', 'A casa mais antiga do disco brasileiro; vive do acervo', 'The oldest house of Brazilian records; lives off its vault', 'rio', 1913, 'A', ['brazil'], 'catalog'),
  x('x_parlophone', 'Paragon Phone', 'Parlophone', 'Selo de novidades que aposta no inesperado', 'Novelty label that bets on the unexpected', 'london', 1923, 'C', ['rock', 'pop'], 'visionary'),
  x('x_rca', 'Victory Talking Records', 'RCA Victor', 'Rádio, eletrônicos e discos sob o mesmo teto', 'Radio, electronics and records under one roof', 'new_york', 1929, 'A', [], 'conglomerate'),
  x('x_decca', 'Thames Gramophone', 'Decca Records', 'Major britânica que compra quem já deu certo', 'British major that buys whoever already made it', 'london', 1929, 'A', [], 'vulture'),
  x('x_peerless', 'Discos Azteca', 'Discos Peerless', 'Discos baratos e muitos: bolero e ranchera em série', 'Cheap records and lots of them: bolero and ranchera in bulk', 'mexico_city', 1933, 'C', ['latin'], 'budget'),
  x('x_fuentes', 'Discos Cumbiamba', 'Discos Fuentes', 'Rei da cumbia e do circuito regional colombiano', 'King of cumbia and the Colombian regional circuit', 'medellin', 1934, 'B', ['latin', 'caribbean'], 'regional'),
  x('x_capitol', 'Starline Records', 'Capitol Records', 'Importa sucessos estrangeiros para o mercado americano', 'Imports foreign hits into the American market', 'los_angeles', 1942, 'A', [], 'importer'),
  x('x_continental', 'Discos Planalto', 'Continental', 'Música caipira e regional paulista', 'Country and regional music from São Paulo', 'sao_paulo', 1943, 'B', ['brazil', 'country_folk'], 'regional'),
  x('x_vogue_fr', 'Disques Rive Gauche', 'Disques Vogue', 'Traz o jazz americano para Paris', 'Brings American jazz to Paris', 'paris', 1947, 'B', ['blues_jazz', 'europe'], 'importer'),
  x('x_atlantic', 'Seaboard Records', 'Atlantic Records', 'Escola de R&B: forma artistas devagar', 'R&B school: develops artists slowly', 'new_york', 1947, 'C', ['rnb', 'blues_jazz'], 'school'),
  x('x_philips', 'Lumen Fonográfica', 'Philips Records', 'Fabricante de aparelhos que lança formatos', 'Hardware maker that launches formats', 'amsterdam', 1950, 'A', [], 'tech'),
  x('x_chess', 'Lakeside Records', 'Chess Records', 'Dona da cena de blues elétrico da cidade', 'Owns the city\'s electric blues scene', 'chicago', 1950, 'B', ['blues_jazz', 'rnb'], 'scene'),
  x('x_elektra', 'Voltage Records', 'Elektra Records', 'Folk e rock de prestígio, poucos discos', 'Prestige folk and rock, few records', 'new_york', 1950, 'B', ['country_folk', 'rock'], 'prestige'),
  x('x_sun', 'Daybreak Records', 'Sun Records', 'Descobre talentos crus na própria cena', 'Discovers raw talent in its own scene', 'memphis', 1952, 'B', ['rock', 'country_folk', 'rnb'], 'scene'),
  x('x_epic', 'Saga Records', 'Epic Records', 'Copia o sucesso do momento antes de todo mundo', 'Copies the hit of the moment before anyone else', 'new_york', 1953, 'C', ['pop', 'rnb'], 'copycat'),
  x('x_barclay', 'Disques Lumière', 'Barclay', 'Casa da canção francesa, forma ídolos devagar', 'Home of French chanson, slowly grooms idols', 'paris', 1953, 'C', ['europe', 'pop'], 'school'),
  x('x_stax', 'Soulsville Records', 'Stax Records', 'Banda da casa e escola de soul', 'House band and soul school', 'memphis', 1957, 'B', ['rnb'], 'school'),
  x('x_warner', 'Burbank Brothers Records', 'Warner Bros. Records', 'Braço musical de estúdio de cinema; compra quem sobe', 'Film studio\'s music arm; buys whoever rises', 'los_angeles', 1958, 'A', [], 'vulture'),
  x('x_ariola', 'Rheingold Musik', 'Ariola', 'Clube do disco de um grupo editorial gigante', 'Record club of a giant publishing group', 'munich', 1958, 'C', ['europe', 'pop'], 'conglomerate'),
  x('x_ricordi', 'Casa Verdi Dischi', 'Dischi Ricordi', 'Editora histórica com selo de autor', 'Historic publisher with a songwriter label', 'milan', 1958, 'B', ['europe'], 'prestige'),
  x('x_island', 'Reef Records', 'Island Records', 'Leva o som caribenho para o mundo', 'Takes the Caribbean sound to the world', 'kingston', 1959, 'B', ['caribbean', 'rock'], 'importer'),
  x('x_am', 'Trumpet & Co.', 'A&M Records', 'Pop elegante feito sob medida para trilhas', 'Elegant pop tailored for soundtracks', 'los_angeles', 1962, 'C', ['pop', 'rock'], 'sync'),
  x('x_ktel', 'TV Hits Direct', 'K-tel', 'Coletâneas baratas vendidas na TV', 'Cheap compilations sold on TV', 'toronto', 1962, 'D', [], 'budget'),
  x('x_sire', 'Bowery Records', 'Sire Records', 'Agitador do punk e da new wave', 'Punk and new wave agitator', 'new_york', 1966, 'B', ['rock'], 'agitator'),
  x('x_trojan', 'Ska Freighter Records', 'Trojan Records', 'Importa reggae e ska para as ilhas britânicas', 'Imports reggae and ska into Britain', 'london', 1968, 'B', ['caribbean'], 'importer'),
  x('x_sony', 'Ginza Sound Corporation', 'Sony Music', 'Conglomerado de aparelhos, filmes e música', 'Conglomerate of hardware, films and music', 'tokyo', 1968, 'A', [], 'conglomerate'),
  x('x_somlivre', 'Som da Rede', 'Som Livre', 'Selo da TV: novela, rádio e revista no mesmo grupo', 'The TV network\'s label: soaps, radio and magazine in one group', 'rio', 1969, 'C', ['brazil', 'pop'], 'conglomerate'),
  x('x_virgin', 'Maverick Isle Records', 'Virgin Records', 'Aposta no estranho e no escandaloso', 'Bets on the strange and the scandalous', 'london', 1972, 'C', ['rock', 'electronic'], 'visionary'),
  x('x_polygram', 'Polyphon Group', 'PolyGram', 'Holding que compra e reorganiza selos', 'Holding that buys and restructures labels', 'hamburg', 1972, 'A', [], 'fund'),
  x('x_mute', 'Silent Engine Records', 'Mute Records', 'Sintetizadores antes de todos', 'Synthesizers before anyone else', 'london', 1978, 'B', ['electronic'], 'tech'),
  x('x_geffen', 'Westwind Records', 'Geffen Records', 'Contrata estrelas prontas a peso de ouro', 'Signs ready-made stars at any price', 'los_angeles', 1980, 'C', ['rock', 'pop'], 'vulture'),
  x('x_4ad', 'Cathedral Sound', '4AD', 'Estética de culto, capa e som impecáveis', 'Cult aesthetic, impeccable sleeves and sound', 'london', 1980, 'B', ['rock', 'electronic'], 'prestige'),
  x('x_creation', 'Genesis Indie', 'Creation Records', 'Indie militante que vive de cena e barulho', 'Militant indie living on scene and noise', 'london', 1983, 'B', ['rock'], 'agitator'),
  x('x_subpop', 'Rainbelt Records', 'Sub Pop', 'Inventa uma cena e a vende ao mundo', 'Invents a scene and sells it to the world', 'seattle', 1986, 'B', ['rock'], 'agitator'),
  x('x_avex', 'Neon Trax', 'Avex Trax', 'Pega o hit das pistas antes de esfriar', 'Grabs the dancefloor hit before it cools', 'tokyo', 1988, 'C', ['electronic', 'pop'], 'viral'),
  x('x_xl', 'Rave Ledger', 'XL Recordings', 'Do rave às estrelas, sempre atrás do próximo estouro', 'From rave to stars, always after the next breakout', 'london', 1989, 'B', ['electronic', 'hiphop'], 'viral'),
  x('x_ninja', 'Shadow Tune', 'Ninja Tune', 'Coletivo de DJs independente e engajado', 'Independent, committed DJ collective', 'london', 1990, 'B', ['electronic', 'hiphop'], 'agitator'),
  x('x_yg', 'Hongdae Beat', 'YG Entertainment', 'Agência de ídolos com pegada hip hop', 'Idol agency with a hip hop edge', 'seoul', 1996, 'C', ['hiphop', 'pop', 'asia_me'], 'idol'),
  x('x_universal', 'Orbital Music Group', 'Universal Music Group', 'A maior major: compra catálogos e selos inteiros', 'The biggest major: buys catalogs and whole labels', 'los_angeles', 1996, 'A', [], 'vulture'),
  x('x_jyp', 'Han River Entertainment', 'JYP Entertainment', 'Anos de treino antes da estreia', 'Years of training before the debut', 'seoul', 1997, 'C', ['pop', 'asia_me'], 'school'),
  x('x_bighit', 'Bright Arrow Entertainment', 'Big Hit Entertainment', 'Ídolos com fandom organizado e mídia própria', 'Idols with an organized fandom and their own media', 'seoul', 2005, 'C', ['pop', 'asia_me'], 'idol'),
  x('x_empire', 'Bayline Distribution', 'EMPIRE', 'Distribuidora que fecha com quem viraliza', 'Distributor that signs whoever goes viral', 'san_francisco', 2010, 'B', ['hiphop', 'rnb'], 'viral'),
  x('x_mavin', 'Eko Pulse Records', 'Mavin Records', 'Afrobeats para exportação, escola de estrelas', 'Afrobeats for export, a school for stars', 'lagos', 2012, 'C', ['africa', 'pop'], 'school'),
  x('x_distrokid', 'UploadNow', 'DistroKid', 'Lança tudo de todos, barato e rápido', 'Releases everything by everyone, cheap and fast', 'new_york', 2013, 'A', [], 'budget'),
  x('x_hipgnosis', 'Songvault Fund', 'Hipgnosis Songs', 'Fundo que compra direitos de canções como ativo financeiro', 'Fund that buys song rights as a financial asset', 'london', 2018, 'D', [], 'royalty'),
];

/** Executivos reais (modo nomes reais): assumem o selo (por id de definição) a partir do ano `y`, se o selo existir. */
export interface RealExec { rid: string; name: string; born: number; died?: number; label: string; y: number; bg: string; style: string; pt: string; en: string }
const e = (rid: string, name: string, born: number, died: number | undefined, label: string, y: number, bg: string, style: string, pt: string, en: string): RealExec =>
  ({ rid, name, born, died, label, y, bg, style, pt, en });

export const REAL_EXECS: RealExec[] = [
  e('edward_lewis', 'Edward Lewis', 1900, 1980, 'x_decca', 1929, 'banker', 'numbers', 'Corretor da bolsa que comprou uma fábrica de gramofones.', 'Stockbroker who bought a gramophone factory.'),
  e('johnny_mercer', 'Johnny Mercer', 1909, 1976, 'x_capitol', 1942, 'artist', 'mentor', 'Compositor que fundou um selo para os amigos.', 'Songwriter who founded a label for his friends.'),
  e('ahmet_ertegun', 'Ahmet Ertegun', 1923, 2006, 'x_atlantic', 1947, 'heir', 'showman', 'Filho de diplomata, apaixonado por R&B.', 'Diplomat\'s son, in love with R&B.'),
  e('jac_holzman', 'Jac Holzman', 1931, undefined, 'x_elektra', 1950, 'engineer', 'visionary', 'Estudante que gravava folk no dormitório.', 'Student who recorded folk in his dorm.'),
  e('leonard_chess', 'Leonard Chess', 1917, 1969, 'x_chess', 1950, 'promoter', 'autocrat', 'Dono de clube que virou dono da cena.', 'Club owner who became the scene\'s owner.'),
  e('sam_phillips', 'Sam Phillips', 1923, 2003, 'x_sun', 1952, 'engineer', 'mentor', 'Radialista e engenheiro que ouvia o que ninguém ouvia.', 'Radio man and engineer who heard what nobody else did.'),
  e('jim_stewart', 'Jim Stewart', 1930, 2022, 'x_stax', 1957, 'artist', 'consensus', 'Violinista de country e bancário nas horas vagas.', 'Country fiddler and part-time banker.'),
  e('berry_gordy', 'Berry Gordy', 1929, undefined, 'harbor', 1959, 'artist', 'autocrat', 'Compositor e ex-operário que montou uma linha de montagem de hits.', 'Songwriter and ex-factory worker who built a hit assembly line.'),
  e('chris_blackwell', 'Chris Blackwell', 1937, undefined, 'x_island', 1959, 'heir', 'visionary', 'Herdeiro anglo-jamaicano que levou o reggae ao mundo.', 'Anglo-Jamaican heir who took reggae to the world.'),
  e('herb_alpert', 'Herb Alpert', 1935, undefined, 'x_am', 1962, 'artist', 'consensus', 'Trompetista que montou o selo na garagem.', 'Trumpeter who started the label in a garage.'),
  e('seymour_stein', 'Seymour Stein', 1942, 2023, 'x_sire', 1966, 'journalist', 'showman', 'Ouvido de A&R lendário para o novo.', 'Legendary A&R ear for the new.'),
  e('clive_davis', 'Clive Davis', 1932, undefined, 'imperial', 1967, 'lawyer', 'dealmaker', 'Advogado que virou o maior caçador de hits da indústria.', 'Lawyer who became the industry\'s greatest hit hunter.'),
  e('joao_araujo', 'João Araújo', 1935, 2013, 'x_somlivre', 1969, 'promoter', 'dealmaker', 'Produtor que juntou música e novela.', 'Producer who married music and soap operas.'),
  e('david_geffen', 'David Geffen', 1943, undefined, 'sunset_parkway', 1970, 'promoter', 'dealmaker', 'Agente que virou magnata.', 'Agent turned mogul.'),
  e('richard_branson', 'Richard Branson', 1950, undefined, 'x_virgin', 1972, 'promoter', 'showman', 'Dono de loja de discos por correio que quis tudo.', 'Mail-order record shop owner who wanted everything.'),
  e('geoff_travis', 'Geoff Travis', 1952, undefined, 'blackbird', 1978, 'dj', 'consensus', 'Lojista de discos que fez do indie uma ética.', 'Record shop owner who made indie an ethic.'),
  e('daniel_miller', 'Daniel Miller', 1951, undefined, 'x_mute', 1978, 'artist', 'visionary', 'Músico de sintetizador que fundou o próprio selo.', 'Synth musician who founded his own label.'),
  e('tony_wilson', 'Tony Wilson', 1950, 2007, 'foundry_wave', 1979, 'journalist', 'showman', 'Apresentador de TV e agitador de Manchester.', 'TV presenter and Manchester agitator.'),
  e('david_geffen', 'David Geffen', 1943, undefined, 'x_geffen', 1980, 'promoter', 'dealmaker', 'Volta ao disco com o próprio nome.', 'Back in records under his own name.'),
  e('rick_rubin', 'Rick Rubin', 1963, undefined, 'cipher_street', 1984, 'producer', 'visionary', 'Estudante produtor que fundou o selo no dormitório.', 'Student producer who founded the label in his dorm.'),
  e('jimmy_iovine', 'Jimmy Iovine', 1953, undefined, 'nova', 1990, 'engineer', 'dealmaker', 'Engenheiro de som que virou executivo.', 'Sound engineer turned executive.'),
  e('bruce_pavitt', 'Bruce Pavitt', 1959, undefined, 'x_subpop', 1986, 'journalist', 'showman', 'Fanzineiro que inventou uma cena.', 'Fanzine maker who invented a scene.'),
  e('lee_soo_man', 'Lee Soo-man', 1952, undefined, 'dragonfly', 1995, 'artist', 'autocrat', 'Cantor que criou o sistema de treinamento de ídolos.', 'Singer who created the idol training system.'),
  e('bang_si_hyuk', 'Bang Si-hyuk', 1972, undefined, 'x_bighit', 2005, 'producer', 'mentor', 'Compositor que apostou num grupo de garotos de fora do circuito.', 'Composer who bet on a boy band from outside the circuit.'),
];
