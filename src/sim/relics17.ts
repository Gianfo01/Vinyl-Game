// Rodada 17 — catálogo de relíquias REAIS (guitarra de Hendrix em Woodstock, violão do Unplugged de Cobain,
// baixo Höfner roubado de McCartney…). Cada peça só aparece depois do fato que a criou (ano/mês reais) e segue a
// história real: some, reaparece, vai a leilão no ano real (com o comprador real se você não cobrir o lance), vira
// peça de museu. Dá para arrematar nos leilões, expor na sede, emprestar a museus e a exposições reais.
// Só no modo de nomes reais. Base sobre relics9 (estado, leilão, cofre); este módulo é dados + roteiro + API.
// API para outros sistemas (crime17: roubo/mercado negro): RELICS17, realRelics17(s), relic9Of17(s, id).

import { l, type L } from '../data/world';
import { registerExt4, registerSimHook } from './ext4';
import { emitFact } from './facts17';
import type { GameState } from './types';
import { fmtL, money, notify, post } from './util';
import { addRelic, relics, type Relic as Relic9, type RelicKind } from './sys/relics9';
import { realAct17 } from './sys/realidx17';
import { chron } from './sys/chron9';

export type RelicEv17 = 'gone' | 'found' | 'auction' | 'museum' | 'exhibit';
/** [ano, mês 0-11, tipo, valor real em US$ (leilão) ou 0, comprador/local, texto PT, texto EN] */
export type RelicStep17 = [number, number, RelicEv17, number, string, string, string];
export interface RelicDef17 { id: string; name: L; owner: string; year: number; month: number; kind: RelicKind; value: number; story: L; location: L; steps?: RelicStep17[] }
/** Forma enxuta pedida pelo crime17 (mercado negro): um item real ativo na partida. */
export interface Relic { id: string; name: L; ownerActId?: string; year: number; kind: RelicKind; value: number; story: L; location: L }

const R = (id: string, pt: string, en: string, owner: string, year: number, month: number, kind: RelicKind, value: number, sp: string, se: string, lp: string, le: string, steps?: RelicStep17[]): RelicDef17 =>
  ({ id, name: l(pt, en), owner, year, month, kind, value, story: l(sp, se), location: l(lp, le), steps });

export const RELICS17: RelicDef17[] = [
  R('carmen_baiana', 'Os turbantes e balangandãs de Carmen Miranda', 'Carmen Miranda\'s turbans and trinkets', 'Carmen Miranda', 1939, 5, 'outfit', 8000,
    'A baiana estilizada que ela levou à Broadway em 1939 virou marca registrada no mundo inteiro.', 'The stylised baiana costume she took to Broadway in 1939 became a worldwide trademark.',
    'Museu Carmen Miranda, Rio de Janeiro (desde 1976)', 'Carmen Miranda Museum, Rio de Janeiro (since 1976)',
    [[1976, 7, 'museum', 0, 'Museu Carmen Miranda', 'O acervo vai para o Museu Carmen Miranda, no Rio.', 'The collection goes to the Carmen Miranda Museum in Rio.']]),
  R('ruby_slippers', 'Os sapatinhos de rubi de Judy Garland', 'Judy Garland\'s ruby slippers', 'Judy Garland', 1939, 7, 'outfit', 5000,
    'Usados em O Mágico de Oz (1939). Um dos pares foi roubado de um museu em 2005 e só reapareceu numa operação do FBI.', 'Worn in The Wizard of Oz (1939). One pair was stolen from a museum in 2005 and only resurfaced in an FBI sting.',
    'Coleção particular', 'Private collection',
    [[2005, 7, 'gone', 0, '', 'Roubados do Museu Judy Garland, em Grand Rapids (Minnesota).', 'Stolen from the Judy Garland Museum in Grand Rapids, Minnesota.'],
      [2018, 6, 'found', 0, 'FBI', 'O FBI recupera os sapatinhos 13 anos depois.', 'The FBI recovers the slippers 13 years later.'],
      [2024, 11, 'auction', 28000000, 'colecionador anônimo', 'Leilão da Heritage: cerca de US$ 28 milhões.', 'Heritage auction: about US$28 million.']]),
  R('lucille', 'Lucille, a guitarra que B.B. King salvou do fogo', 'Lucille, the guitar B.B. King saved from the fire', 'B.B. King', 1949, 11, 'guitar', 3000,
    'Num baile em Twist (Arkansas), dois homens brigaram por uma mulher chamada Lucille e derrubaram um barril de querosene. King voltou ao salão em chamas para salvar a guitarra — e batizou todas as seguintes de Lucille.', 'At a dance in Twist, Arkansas, two men fought over a woman named Lucille and knocked over a kerosene barrel. King ran back into the burning hall to save his guitar — and named every one after it Lucille.',
    'Com B.B. King', 'With B.B. King'),
  R('my_happiness', 'O acetato de "My Happiness", primeira gravação de Elvis', 'The "My Happiness" acetate, Elvis\'s first recording', 'Elvis Presley', 1953, 6, 'record', 4,
    'Em julho de 1953, Elvis pagou cerca de quatro dólares no Memphis Recording Service para gravar um disco de presente. Foi assim que a Sun o conheceu.', 'In July 1953, Elvis paid about four dollars at the Memphis Recording Service to cut a record as a gift. That is how Sun Records found him.',
    'Jack White (Third Man Records)', 'Jack White (Third Man Records)',
    [[2015, 0, 'auction', 300000, 'Jack White', 'Arrematado por Jack White por US$ 300 mil.', 'Bought by Jack White for US$300,000.']]),
  R('buddy_glasses', 'Os óculos de Buddy Holly', 'Buddy Holly\'s glasses', 'Buddy Holly', 1959, 1, 'glasses', 2000,
    'Recolhidos no local da queda do avião, em fevereiro de 1959, e esquecidos num envelope no fórum de Mason City (Iowa) por 21 anos.', 'Recovered at the plane crash site in February 1959 and forgotten in an envelope at the Mason City, Iowa courthouse for 21 years.',
    'Buddy Holly Center, Lubbock', 'Buddy Holly Center, Lubbock',
    [[1959, 3, 'gone', 0, '', 'Os óculos somem num envelope do xerife.', 'The glasses vanish into a sheriff\'s envelope.'],
      [1980, 1, 'found', 0, 'viúva de Buddy Holly', 'Achados no fórum de Mason City e devolvidos à viúva.', 'Found at the Mason City courthouse and returned to his widow.']]),
  R('elvis_cadillac', 'O Cadillac "dourado" de Elvis', 'Elvis\'s "Solid Gold" Cadillac', 'Elvis Presley', 1960, 0, 'car', 25000,
    'Limusine de 1960 com pintura de pó de diamante e escamas de peixe, telefone e toca-discos. Elvis a cedeu à RCA para turnês promocionais.', 'A 1960 limousine with diamond-dust and fish-scale paint, a phone and a record player. Elvis lent it to RCA for promotional tours.',
    'Country Music Hall of Fame, Nashville', 'Country Music Hall of Fame, Nashville',
    [[1977, 0, 'museum', 0, 'Country Music Hall of Fame', 'A RCA doa o carro ao Country Music Hall of Fame.', 'RCA donates the car to the Country Music Hall of Fame.']]),
  R('hofner_bass', 'O baixo Höfner 500/1 original de Paul McCartney', 'Paul McCartney\'s original Höfner 500/1 bass', 'The Beatles', 1961, 5, 'bass', 300,
    'Comprado em Hamburgo em 1961 por cerca de 30 libras; está nas primeiras gravações dos Beatles. Roubado em 1972, ficou meio século sumido.', 'Bought in Hamburg in 1961 for about £30; it is on the Beatles\' first recordings. Stolen in 1972, it was missing for half a century.',
    'Com Paul McCartney', 'With Paul McCartney',
    [[1972, 9, 'gone', 0, '', 'Roubado de uma van em Londres.', 'Stolen from a van in London.'],
      [2024, 1, 'found', 0, 'Paul McCartney', 'O "Lost Bass Project" acha o baixo e ele volta para Paul.', 'The "Lost Bass Project" finds the bass and it goes back to Paul.']]),
  R('lennon_j160e', 'O violão Gibson J-160E perdido de John Lennon', 'John Lennon\'s lost Gibson J-160E', 'The Beatles', 1962, 8, 'guitar', 500,
    'Usado para compor e gravar os primeiros sucessos dos Beatles. Desapareceu nos shows de Natal de 1963, em Londres.', 'Used to write and record the Beatles\' first hits. It vanished at the 1963 Christmas shows in London.',
    'Coleção particular', 'Private collection',
    [[1963, 11, 'gone', 0, '', 'Some nos bastidores dos shows de Natal em Londres.', 'Disappears backstage at the London Christmas shows.'],
      [2014, 6, 'found', 0, 'um colecionador na Califórnia', 'Reaparece na Califórnia, comprado décadas antes sem saber a origem.', 'Resurfaces in California, bought decades earlier with no idea of its origin.'],
      [2015, 10, 'auction', 2410000, 'colecionador anônimo', 'Vendido por US$ 2,41 milhões.', 'Sold for US$2.41 million.']]),
  R('ringo_ludwig', 'A bateria Ludwig de Ringo no Ed Sullivan Show', 'Ringo\'s Ludwig kit from The Ed Sullivan Show', 'The Beatles', 1964, 1, 'drums', 1500,
    'Tocada em 9 de fevereiro de 1964, diante de cerca de 73 milhões de americanos: o início da Beatlemania nos EUA.', 'Played on 9 February 1964 before some 73 million Americans: the start of US Beatlemania.',
    'Jim Irsay', 'Jim Irsay',
    [[2015, 11, 'auction', 2200000, 'Jim Irsay', 'Leilão da Julien\'s: US$ 2,2 milhões.', 'Julien\'s auction: US$2.2 million.']]),
  R('dylan_newport', 'A Stratocaster de Dylan em Newport 1965', 'Dylan\'s Newport 1965 Stratocaster', 'Bob Dylan', 1965, 6, 'guitar', 1000,
    'A guitarra da noite em que Dylan "virou elétrico" e foi vaiado no festival folk. Depois, foi esquecida num avião particular.', 'The guitar from the night Dylan "went electric" and was booed at the folk festival. Later it was left on a private plane.',
    'Coleção particular', 'Private collection',
    [[1965, 8, 'gone', 0, '', 'Esquecida num avião; a família do piloto a guarda por décadas.', 'Left on a plane; the pilot\'s family keeps it for decades.'],
      [2012, 6, 'found', 0, 'família do piloto', 'Especialistas confirmam: é a guitarra de Newport.', 'Experts confirm: it is the Newport guitar.'],
      [2013, 11, 'auction', 965000, 'colecionador anônimo', 'Christie\'s: US$ 965 mil.', 'Christie\'s: US$965,000.']]),
  R('rolling_stone_lyrics', 'O rascunho de "Like a Rolling Stone"', 'The "Like a Rolling Stone" draft', 'Bob Dylan', 1965, 5, 'lyrics', 200,
    'Quatro folhas de papel de hotel com a letra cheia de rabiscos.', 'Four sheets of hotel stationery covered in scribbled lyrics.',
    'Coleção particular', 'Private collection',
    [[2014, 5, 'auction', 2045000, 'colecionador anônimo', 'Sotheby\'s: cerca de US$ 2 milhões.', 'Sotheby\'s: about US$2 million.']]),
  R('sgt_pepper_drum', 'O bumbo da capa de Sgt. Pepper', 'The Sgt. Pepper cover drum skin', 'The Beatles', 1967, 5, 'drums', 500,
    'A pele pintada à mão que está no centro da capa mais famosa do rock.', 'The hand-painted drum skin at the centre of rock\'s most famous cover.',
    'Coleção particular', 'Private collection',
    [[2008, 6, 'auction', 1070000, 'colecionador anônimo', 'Christie\'s: £541 mil.', 'Christie\'s: £541,000.']]),
  R('lennon_rolls', 'O Rolls-Royce Phantom V psicodélico de John Lennon', 'John Lennon\'s psychedelic Rolls-Royce Phantom V', 'The Beatles', 1967, 4, 'car', 20000,
    'Lennon mandou pintar o Rolls de amarelo com flores no estilo cigano em 1967, escandalizando os ingleses.', 'Lennon had the Rolls painted yellow with Romani-style flowers in 1967, scandalising the English.',
    'Royal BC Museum, Victoria (Canadá)', 'Royal BC Museum, Victoria (Canada)',
    [[1985, 5, 'auction', 2290000, 'Jim Pattison', 'Sotheby\'s Nova York: US$ 2,29 milhões.', 'Sotheby\'s New York: US$2.29 million.']]),
  R('monterey_strat', 'Os restos da Stratocaster que Hendrix queimou no Monterey Pop', 'The remains of the Strat Hendrix burned at Monterey Pop', 'The Jimi Hendrix Experience', 1967, 5, 'guitar', 500,
    'Hendrix ajoelhou, encharcou a guitarra de fluido de isqueiro e ateou fogo no palco. Os pedaços foram parar com Frank Zappa.', 'Hendrix knelt, doused the guitar in lighter fluid and set it on fire on stage. The pieces ended up with Frank Zappa.',
    'Coleção particular', 'Private collection'),
  R('janis_porsche', 'O Porsche 356 psicodélico de Janis Joplin', 'Janis Joplin\'s psychedelic Porsche 356', 'Janis Joplin', 1968, 6, 'car', 4000,
    'Pintado à mão por um roadie com paisagens, borboletas e a banda. Janis dirigia pela Califórnia e todos sabiam quem era.', 'Hand-painted by a roadie with landscapes, butterflies and the band. Janis drove it around California and everyone knew who it was.',
    'Coleção particular', 'Private collection',
    [[2015, 11, 'auction', 1760000, 'colecionador anônimo', 'Sotheby\'s: US$ 1,76 milhão.', 'Sotheby\'s: US$1.76 million.']]),
  R('woodstock_strat', 'A Stratocaster branca de Hendrix em Woodstock', 'Hendrix\'s white Woodstock Stratocaster', 'The Jimi Hendrix Experience', 1969, 7, 'guitar', 3000,
    'Na manhã de 18 de agosto de 1969, Hendrix fechou Woodstock tocando "The Star-Spangled Banner" distorcido nesta guitarra.', 'On the morning of 18 August 1969, Hendrix closed Woodstock playing a distorted "Star-Spangled Banner" on this guitar.',
    'MoPOP, Seattle', 'MoPOP, Seattle',
    [[1990, 3, 'auction', 330000, 'colecionador', 'Leiloada em Londres.', 'Auctioned in London.'],
      [2000, 5, 'museum', 0, 'Experience Music Project (MoPOP)', 'Paul Allen a expõe no museu que fundou em Seattle.', 'Paul Allen shows it in the museum he founded in Seattle.']]),
  R('clapton_blackie', '"Blackie", a Stratocaster montada por Eric Clapton', '"Blackie", the Stratocaster Eric Clapton built', 'Eric Clapton', 1970, 0, 'guitar', 300,
    'Clapton juntou as melhores peças de três Strats compradas em Nashville e tocou "Blackie" por mais de dez anos.', 'Clapton combined the best parts of three Strats bought in Nashville and played "Blackie" for over a decade.',
    'Guitar Center', 'Guitar Center',
    [[2004, 5, 'auction', 959500, 'Guitar Center', 'Christie\'s: US$ 959 mil para a clínica Crossroads.', 'Christie\'s: US$959,000 for the Crossroads clinic.']]),
  R('gilmour_black_strat', 'A Black Strat de David Gilmour', 'David Gilmour\'s Black Strat', 'Pink Floyd', 1970, 4, 'guitar', 300,
    'Comprada em Nova York em 1970; é o som dos solos de The Dark Side of the Moon e de "Comfortably Numb".', 'Bought in New York in 1970; it is the sound of the Dark Side of the Moon solos and "Comfortably Numb".',
    'Jim Irsay', 'Jim Irsay',
    [[2019, 5, 'auction', 3975000, 'Jim Irsay', 'Christie\'s: US$ 3,975 milhões, recorde para uma guitarra.', 'Christie\'s: US$3.975 million, a guitar record.']]),
  R('stones_tongue', 'A arte original da língua dos Rolling Stones', 'The original Rolling Stones tongue artwork', 'The Rolling Stones', 1971, 3, 'art', 100,
    'Desenho do estudante John Pasche, pago com cerca de 50 libras, que virou o logotipo mais famoso do rock.', 'A design by student John Pasche, paid about £50, that became rock\'s most famous logo.',
    'Victoria and Albert Museum, Londres', 'Victoria and Albert Museum, London',
    [[2008, 8, 'auction', 92500, 'Victoria and Albert Museum', 'O V&A compra a arte por US$ 92,5 mil.', 'The V&A buys the artwork for US$92,500.'],
      [2008, 9, 'museum', 0, 'Victoria and Albert Museum', 'Entra no acervo do V&A.', 'Enters the V&A collection.']]),
  R('imagine_piano', 'O piano Steinway em que Lennon compôs "Imagine"', 'The Steinway piano Lennon wrote "Imagine" on', 'The Beatles', 1971, 6, 'piano', 3000,
    'O piano de armário de Tittenhurst Park, onde Lennon compôs e gravou "Imagine" em 1971.', 'The upright piano at Tittenhurst Park, where Lennon wrote and recorded "Imagine" in 1971.',
    'George Michael (depois, exposições pela paz)', 'George Michael (then peace exhibitions)',
    [[2000, 9, 'auction', 2100000, 'George Michael', 'George Michael arremata por £1,45 milhão.', 'George Michael wins it for £1.45 million.']]),
  R('aloha_eagle', 'O macacão "American Eagle" do Aloha from Hawaii', 'The "American Eagle" jumpsuit from Aloha from Hawaii', 'Elvis Presley', 1973, 0, 'outfit', 5000,
    'Usado no primeiro show transmitido por satélite para o mundo, em janeiro de 1973.', 'Worn at the first concert broadcast worldwide by satellite, in January 1973.',
    'Graceland, Memphis', 'Graceland, Memphis',
    [[1982, 5, 'museum', 0, 'Graceland', 'Graceland abre ao público como museu.', 'Graceland opens to the public as a museum.']]),
  R('ziggy_suit', 'Um macacão de Ziggy Stardust (Kansai Yamamoto)', 'A Ziggy Stardust jumpsuit (Kansai Yamamoto)', 'David Bowie', 1973, 1, 'outfit', 3000,
    'Criação do estilista japonês Kansai Yamamoto para a era Ziggy/Aladdin Sane.', 'Created by Japanese designer Kansai Yamamoto for the Ziggy/Aladdin Sane era.',
    'Arquivo David Bowie, V&A (Londres)', 'David Bowie Archive, V&A (London)',
    [[2013, 2, 'exhibit', 0, '"David Bowie Is" (V&A)', 'Estrela da exposição "David Bowie Is", no V&A.', 'Star of the "David Bowie Is" exhibition at the V&A.'],
      [2023, 0, 'museum', 0, 'Victoria and Albert Museum', 'O arquivo de Bowie vai para o V&A.', 'Bowie\'s archive goes to the V&A.']]),
  R('waterloo_costumes', 'Os figurinos do ABBA no Eurovision de "Waterloo"', 'ABBA\'s "Waterloo" Eurovision costumes', 'ABBA', 1974, 3, 'outfit', 2000,
    'Botas de plataforma, cetim e lantejoulas na vitória de Brighton, em abril de 1974.', 'Platform boots, satin and sequins at the Brighton victory, April 1974.',
    'ABBA The Museum, Estocolmo', 'ABBA The Museum, Stockholm',
    [[2013, 4, 'museum', 0, 'ABBA The Museum', 'Abre o ABBA The Museum, em Estocolmo.', 'ABBA The Museum opens in Stockholm.']]),
  R('bohemian_drafts', 'Os rascunhos de "Bohemian Rhapsody"', 'The "Bohemian Rhapsody" drafts', 'Queen', 1975, 9, 'lyrics', 300,
    'Folhas em que Freddie Mercury rabiscou a letra — a canção chegou a se chamar "Mongolian Rhapsody".', 'Sheets where Freddie Mercury drafted the lyrics — the song was once called "Mongolian Rhapsody".',
    'Coleção particular', 'Private collection',
    [[2023, 8, 'auction', 1740000, 'colecionador anônimo', 'Sotheby\'s Londres: £1,38 milhão (acervo de Mary Austin).', 'Sotheby\'s London: £1.38 million (Mary Austin\'s collection).']]),
  R('algie_pig', 'Algie, o porco inflável de Animals', 'Algie, the inflatable pig from Animals', 'Pink Floyd', 1976, 11, 'prop', 2000,
    'Na sessão de fotos da capa de Animals, em dezembro de 1976, o porco de 12 metros se soltou da Battersea Power Station, cruzou a rota de Heathrow e caiu numa fazenda em Kent.', 'At the Animals cover shoot in December 1976, the 12-metre pig broke loose from Battersea Power Station, drifted across Heathrow\'s flight path and came down on a farm in Kent.',
    'Pink Floyd (turnês e exposições)', 'Pink Floyd (tours and exhibitions)',
    [[2017, 4, 'exhibit', 0, '"Their Mortal Remains" (V&A)', 'Exposto em "Pink Floyd: Their Mortal Remains", no V&A.', 'Shown at "Pink Floyd: Their Mortal Remains" at the V&A.']]),
  R('god_save_am', 'Prensagem A&M de "God Save the Queen"', 'A&M pressing of "God Save the Queen"', 'Sex Pistols', 1977, 2, 'record', 2,
    'A A&M contratou os Sex Pistols e os dispensou dias depois; quase toda a prensagem foi destruída. As cópias que sobraram valem uma fortuna.', 'A&M signed the Sex Pistols and dropped them days later; almost the whole pressing was destroyed. The surviving copies are worth a fortune.',
    'Colecionadores', 'Collectors'),
  R('mj_glove', 'A luva de strass do Motown 25', 'The rhinestone glove from Motown 25', 'Michael Jackson', 1983, 2, 'outfit', 1000,
    'Usada na apresentação de "Billie Jean" em que Michael estreou o moonwalk na TV.', 'Worn for the "Billie Jean" performance where Michael debuted the moonwalk on TV.',
    'Coleção particular (Macau)', 'Private collection (Macau)',
    [[2009, 10, 'auction', 350000, 'colecionador de Hong Kong', 'Leilão da Julien\'s: US$ 350 mil (martelo).', 'Julien\'s auction: US$350,000 (hammer).']]),
  R('unplugged_d18e', 'O violão Martin D-18E de Kurt Cobain (MTV Unplugged)', 'Kurt Cobain\'s Martin D-18E (MTV Unplugged)', 'Nirvana', 1993, 10, 'guitar', 5000,
    'O violão do MTV Unplugged in New York, gravado em novembro de 1993, cinco meses antes da morte de Cobain.', 'The guitar from MTV Unplugged in New York, taped in November 1993, five months before Cobain\'s death.',
    'Peter Freedman (exposição itinerante)', 'Peter Freedman (touring exhibition)',
    [[2020, 5, 'auction', 6010000, 'Peter Freedman', 'Julien\'s: US$ 6,01 milhões, recorde para um violão.', 'Julien\'s: US$6.01 million, a record for a guitar.']]),
  R('unplugged_cardigan', 'O cardigã de Cobain no Unplugged', 'Cobain\'s Unplugged cardigan', 'Nirvana', 1993, 10, 'outfit', 50,
    'Cardigã verde-oliva surrado, nunca lavado, com uma queimadura de cigarro.', 'A worn olive cardigan, never washed, with a cigarette burn.',
    'Coleção particular', 'Private collection',
    [[2019, 9, 'auction', 334000, 'colecionador anônimo', 'Julien\'s: US$ 334 mil.', 'Julien\'s: US$334,000.']]),
  R('biggie_crown', 'A coroa do retrato "King of New York" de Notorious B.I.G.', 'The crown from Notorious B.I.G.\'s "King of New York" portrait', 'The Notorious B.I.G.', 1997, 2, 'prop', 10,
    'Coroa de plástico de uma sessão de fotos feita três dias antes do assassinato de Biggie, em março de 1997.', 'A plastic crown from a photo shoot three days before Biggie was murdered, in March 1997.',
    'Coleção particular', 'Private collection',
    [[2020, 8, 'auction', 594750, 'colecionador anônimo', 'Sotheby\'s: US$ 594 mil.', 'Sotheby\'s: US$594,000.']]),
  R('meat_dress', 'O vestido de carne de Lady Gaga (VMA 2010)', 'Lady Gaga\'s meat dress (2010 VMAs)', 'Lady Gaga', 2010, 8, 'outfit', 10000,
    'Feito de carne crua por Franc Fernandez para o VMA 2010; depois foi preservado como charque.', 'Made of raw beef by Franc Fernandez for the 2010 VMAs; later preserved like jerky.',
    'Acervo de Lady Gaga', 'Lady Gaga\'s archive',
    [[2011, 8, 'exhibit', 0, 'Rock and Roll Hall of Fame', 'Exposto no Rock and Roll Hall of Fame.', 'Shown at the Rock and Roll Hall of Fame.']]),
];
export const relicDef17 = (id: string): RelicDef17 | undefined => RELICS17.find((x) => x.id === id);

/** Exposições/museus reais que pedem peças emprestadas: [nome, cidade, de, até (0 = permanente), tipos aceitos] */
export type Expo17 = [string, string, number, number, RelicKind[] | null];
export const EXPOS17: Expo17[] = [
  ['Museu da Imagem e do Som', 'rio', 1965, 0, ['record', 'lyrics', 'outfit', 'tape']],
  ['Rock and Roll Hall of Fame', 'cleveland', 1995, 0, null],
  ['Experience Music Project (MoPOP)', 'seattle', 2000, 0, ['guitar', 'bass', 'drums', 'outfit', 'prop']],
  ['Grammy Museum', 'los_angeles', 2008, 0, ['trophy', 'outfit', 'lyrics', 'record', 'mic']],
  ['"David Bowie Is" (V&A)', 'london', 2013, 2018, ['outfit', 'lyrics', 'art']],
  ['ABBA The Museum', 'stockholm', 2013, 0, ['outfit', 'record', 'trophy']],
  ['"Pink Floyd: Their Mortal Remains" (V&A)', 'london', 2017, 2017, ['prop', 'art', 'guitar']],
  ['"Play It Loud" (The Met)', 'new_york', 2019, 2019, ['guitar', 'bass', 'drums', 'piano']],
];
export const openExpos17 = (s: GameState, k?: RelicKind): Expo17[] => EXPOS17.filter((e) => e[2] <= s.year && (!e[3] || s.year <= e[3]) && (!k || !e[4] || e[4].includes(k)));

interface R17State { done: Record<string, number> }
declare module './ext4' { interface Ext4 { relics17: R17State } }
registerExt4('relics17', () => ({ done: {} }));
const st17 = (s: GameState): R17State => {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.relics17 ??= { done: {} }) as R17State;
  st.done ??= {};
  return st;
};
const reached = (s: GameState, y: number, m: number) => s.year > y || (s.year === y && s.month >= m);

/** Peça do relics9 que corresponde à relíquia real (se já apareceu). */
export const relic9Of17 = (s: GameState, id: string): Relic9 | undefined => relics(s).list.find((x) => x.rr === id);

/** Relíquias reais já existentes nesta partida (forma enxuta para crime/mercado negro e interface). */
export function realRelics17(s: GameState): Relic[] {
  const out: Relic[] = [];
  for (const d of RELICS17) {
    const rl = relic9Of17(s, d.id);
    if (!rl) continue;
    out.push({ id: d.id, name: d.name, ownerActId: rl.a, year: d.year, kind: d.kind, value: rl.v, story: d.story, location: whereNow17(s, d, rl) });
  }
  return out;
}

/** Onde está agora — nunca revela o futuro: o local final só aparece quando a história real já chegou lá. */
export function whereNow17(s: GameState, d: RelicDef17, rl: Relic9): L {
  if (rl.st === 'player') return l('Seu acervo', 'Your collection');
  if (rl.st === 'stolen') return l('Desaparecida', 'Missing');
  if (rl.st === 'auction') return l('Em leilão', 'At auction');
  const o = rl.own[rl.own.length - 1]?.[0];
  if (rl.st === 'kept' && pastSteps17(s, d).length === (d.steps ?? []).length && !(rl.own.length > 1 && rl.own[rl.own.length - 1][1] > (d.steps?.[d.steps.length - 1]?.[0] ?? 0))) return d.location;
  return o ? l(o, o) : d.location;
}

/** Passos reais já acontecidos (para a ficha da relíquia). */
export const pastSteps17 = (s: GameState, d: RelicDef17): RelicStep17[] => (d.steps ?? []).filter((x) => reached(s, x[0], x[1]));

function apply(s: GameState, d: RelicDef17, rl: Relic9, st: RelicStep17): void {
  const [y, , ev, val, who, pt, en] = st;
  const txt = l(pt, en);
  if (rl.st === 'player') { // você mudou a história: a peça é sua
    notify(s, fmtL(l('Na história real, em {y}: {t} — mas {n} está no seu acervo.', 'In real history, in {y}: {t} — but {n} is in your collection.'), { y, t: txt, n: d.name }), 'info');
    return;
  }
  if (ev === 'gone') { rl.st = 'stolen'; }
  else if (ev === 'found') { rl.st = 'kept'; if (who) rl.own.push([who, y, 'achado']); }
  else if (ev === 'museum') { rl.st = 'museum'; rl.own.push([who, y, 'museu']); }
  else if (ev === 'exhibit') { /* exposição temporária: só crônica */ }
  else if (ev === 'auction') { rl.st = 'auction'; rl.au = s.week + 13; rl.v = val; rl.rb = who; }
  chron(s, { k: 'relic', i: ev === 'auction' && val > 1e6 ? 4 : 3, a: rl.a ? [rl.a] : [], t: fmtL(l('{n}: {t}', '{n}: {t}'), { n: d.name, t: txt }) });
  emitFact(s, { kind: 'relic', actors: rl.a ? [rl.a] : [], severity: ev === 'auction' ? 45 : ev === 'gone' ? 50 : 30, visibility: 'public', tags: ['relic', ev, ...(ev === 'gone' ? ['crime'] : [])], src: 'relics17', text: fmtL(l('{n}: {t}', '{n}: {t}'), { n: d.name, t: txt }), data: { relic: d.id } });
  if (ev === 'auction') notify(s, fmtL(l('Leilão histórico: {n} (dá para dar lance em Lendas → Relíquias).', 'Historic auction: {n} (you can bid in Legends → Relics).'), { n: d.name }), 'info');
}

/** r18 (talent18): quem decide se uma peça real nasce nesta partida (modos de história). */
export const relics17Gate: { f: (s: GameState, d: RelicDef17) => boolean; step: (s: GameState, st: RelicStep17) => boolean } = { f: () => true, step: () => true };

registerSimHook('month', 'relics17', (s) => {
  if (!s.config.realNames) return;
  const st = st17(s);
  for (const d of RELICS17) {
    if (!reached(s, d.year, d.month)) continue;
    let rl = relic9Of17(s, d.id);
    if (!rl && st.done[d.id] === undefined && relics17Gate.f(s, d)) {
      const act = realAct17(s, d.owner);
      rl = addRelic(s, d.kind, d.name, act?.id, undefined, d.value, d.year);
      rl.rr = d.id;
      rl.own[0][0] = d.owner;
      st.done[d.id] = 0;
      // peça que nasce em partida iniciada depois: aplica a história já acontecida em silêncio
      for (const x of pastSteps17(s, d)) { if (x[2] === 'gone') rl.st = 'stolen'; else if (x[2] === 'found') { rl.st = 'kept'; if (x[4]) rl.own.push([x[4], x[0], 'achado']); } else if (x[2] === 'museum') { rl.st = 'museum'; rl.own.push([x[4], x[0], 'museu']); } else if (x[2] === 'auction') { rl.v = x[3]; rl.st = 'kept'; rl.own.push([x[4], x[0], 'leilão']); } st.done[d.id]++; }
      if (s.year - d.year <= 1) emitFact(s, { kind: 'relic', actors: act ? [act.id] : [], severity: 25, visibility: 'public', tags: ['relic', 'born'], src: 'relics17', text: fmtL(l('Nasce uma relíquia: {n}.', 'A relic is born: {n}.'), { n: d.name }), data: { relic: d.id } });
    }
    if (!rl) continue;
    // leilão histórico terminou sem você: o comprador real fica com a peça
    if (rl.rb && rl.st !== 'auction') { const o = rl.own[rl.own.length - 1]; if (rl.st === 'kept' && o && o[2] === 'leilão') o[0] = rl.rb; rl.rb = undefined; }
    const steps = d.steps ?? [];
    let i = st.done[d.id] ?? 0;
    while (i < steps.length && reached(s, steps[i][0], steps[i][1]) && relics17Gate.step(s, steps[i])) { if (rl.st !== 'auction') apply(s, d, rl, steps[i]); else break; i++; }
    st.done[d.id] = i;
  }
});

/** Emprestar uma peça do seu acervo a uma exposição real aberta: cachê maior que museu comum, prestígio e fama. */
export function lendToExpo17(s: GameState, relicId: string, expo: string): L | null {
  const rl = relics(s).list.find((x) => x.id === relicId);
  const e = EXPOS17.find((x) => x[0] === expo);
  if (!rl || rl.st !== 'player' || rl.ln) return l('A peça não está livre no seu cofre.', 'The piece is not free in your vault.');
  if (!e || !openExpos17(s, rl.k).includes(e)) return l('Essa exposição não está aberta para este tipo de peça.', 'That exhibition is not open for this kind of piece.');
  const until = e[3] ? Math.min(52, (e[3] - s.year + 1) * 52) : 52;
  rl.ln = { to: e[0], w: s.week + until };
  rl.ex = undefined;
  post(s, `relicexpo:${rl.id}`, Math.round(money(s, rl.v) * 0.08), 'asset_sales', `Exposição: ${rl.n.pt}`);
  s.player.reputation.artistic = Math.min(100, s.player.reputation.artistic + 2);
  const act = rl.a ? s.acts[rl.a] : undefined;
  if (act) act.fame = Math.min(100, act.fame + 2);
  emitFact(s, { kind: 'relic', actors: ['player', ...(rl.a ? [rl.a] : [])], place: e[1], severity: 30, visibility: 'public', tags: ['relic', 'good', 'exhibit'], src: 'relics17',
    text: fmtL(l('{c} empresta {n} para {e}.', '{c} lends {n} to {e}.'), { c: s.config.companyName, n: rl.n, e: e[0] }) });
  return null;
}
