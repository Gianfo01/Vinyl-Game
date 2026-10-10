// Rodada 14 — empresários reais (managers). Anos de atividade, estilo, praça, gêneros e clientes históricos
// (nome real do ato + anos em que de fato o empresariaram). O jogo só liga o cliente se o ato existir no
// mundo e o ano estiver dentro do intervalo; com nomes reais desligados, o mesmo arquétipo entra com nome
// gerado. Atributos 1–99 no esquema da ficha unificada (ouvido, negociação, carisma, gestão, imagem).

import { l, type FamilyId, type L } from './world';
import { MGRS18 } from './people18';

/** shark: arranca adiantamentos; muscle: intimida e exige royalties; svengali: fabrica imagem e quer verba
 *  prometida; guardian: protege o artista e exige controle criativo; impresario: promotor, quer contratos curtos. */
export type MgrStyle = 'shark' | 'muscle' | 'svengali' | 'guardian' | 'impresario';
export type MgrAttrs = [ear: number, neg: number, cha: number, mgmt: number, img: number];
export interface RealMgr {
  id: string;
  name: string;
  born?: number;
  died?: number;
  city: string;
  from: number;
  to: number;
  style: MgrStyle;
  fam: FamilyId[];
  a: MgrAttrs;
  sex?: 'm' | 'f';
  skin?: number;
  /** comissão típica */
  rate: number;
  /** facetas marcantes (0–100) */
  f?: Record<string, number>;
  bio: L;
  /** [nome real do ato, de, até] */
  cl: [string, number, number][];
}

export const MGR_STYLE: Record<MgrStyle, [L, L]> = {
  shark: [l('Tubarão', 'Shark'), l('Exige adiantamento bem acima do normal para o cliente.', 'Demands an advance well above normal for the client.')],
  muscle: [l('Linha-dura', 'Enforcer'), l('Intimida na mesa e exige royalties mais altos.', 'Intimidates at the table and demands higher royalties.')],
  svengali: [l('Fabricante de imagem', 'Svengali'), l('Quer promessas de divulgação por escrito: a imagem é obra dele.', 'Wants written promotion promises: the image is their work.')],
  guardian: [l('Guardião do artista', 'Artist guardian'), l('Só fecha com controle criativo para o artista.', 'Only signs if the artist keeps creative control.')],
  impresario: [l('Empresário de palco', 'Impresario'), l('Vive de shows: quer contrato curto (até 3 anos) para renegociar logo.', 'Lives off shows: wants a short deal (3 years max) to renegotiate soon.')],
};

const NOW = 2026;

export const REAL_MGRS: RealMgr[] = [
  { id: 'parker', name: 'Colonel Tom Parker', born: 1909, died: 1997, city: 'memphis', from: 1945, to: 1977, style: 'shark', fam: ['country_folk', 'rock', 'pop'], a: [38, 95, 80, 72, 55], rate: 0.25, f: { ambicao: 92, generosidade: 12, teimosia: 85 },
    bio: l('Ex-feirante de circo holandês que se dizia "coronel". Empresariou Eddy Arnold e Hank Snow antes de achar Elvis; chegou a ficar com metade do que o cliente ganhava.', 'A Dutch-born former carnival barker who styled himself "Colonel". Managed Eddy Arnold and Hank Snow before finding Elvis; eventually took half of his client\'s earnings.'),
    cl: [['Elvis Presley', 1955, 1977]] },
  { id: 'glaser', name: 'Joe Glaser', born: 1896, died: 1969, city: 'new_york', from: 1926, to: 1969, style: 'muscle', fam: ['blues_jazz', 'pop'], a: [55, 86, 60, 80, 40], rate: 0.25, f: { teimosia: 80, coragem: 78 },
    bio: l('Dono da Associated Booking, ligado ao submundo de Chicago. Cuidou da carreira de Louis Armstrong por mais de 30 anos e também de Billie Holiday.', 'Owner of Associated Booking, with ties to Chicago\'s underworld. Ran Louis Armstrong\'s career for over 30 years and also Billie Holiday\'s.'),
    cl: [['Louis Armstrong', 1935, 1969], ['Billie Holiday', 1935, 1950]] },
  { id: 'parnes', name: 'Larry Parnes', born: 1929, died: 1989, city: 'london', from: 1956, to: 1968, style: 'svengali', fam: ['rock', 'pop'], a: [50, 70, 72, 60, 82], rate: 0.4, f: { vaidade: 80 },
    bio: l('"Mr. Parnes, Shillings and Pence": inventava nomes de palco (Tommy Steele, Billy Fury) e fabricou o primeiro rock britânico.', '"Mr. Parnes, Shillings and Pence": invented stage names (Tommy Steele, Billy Fury) and manufactured early British rock.'),
    cl: [] },
  { id: 'epstein', name: 'Brian Epstein', born: 1934, died: 1967, city: 'liverpool', from: 1961, to: 1967, style: 'svengali', fam: ['rock', 'pop'], a: [70, 55, 82, 58, 85], rate: 0.25, f: { lealdade: 88, ansiedade: 75, generosidade: 70 },
    bio: l('Gerente da loja de discos da família em Liverpool. Viu os Beatles no Cavern, trocou o couro por ternos e conseguiu o contrato com a EMI.', 'Ran his family\'s record shop in Liverpool. Saw the Beatles at the Cavern, swapped leather for suits and landed the EMI deal.'),
    cl: [['The Beatles', 1962, 1967]] },
  { id: 'oldham', name: 'Andrew Loog Oldham', born: 1944, city: 'london', from: 1963, to: 1970, style: 'svengali', fam: ['rock', 'pop'], a: [68, 62, 85, 45, 88], rate: 0.25, f: { rebeldia: 85, impulsividade: 80, ego: 78 },
    bio: l('Ex-assessor de Epstein que, aos 19 anos, vendeu os Rolling Stones como o anti-Beatles: "deixaria sua filha sair com um Rolling Stone?"', 'Former Epstein publicist who, at 19, sold the Rolling Stones as the anti-Beatles: "would you let your daughter go out with a Rolling Stone?"'),
    cl: [['The Rolling Stones', 1963, 1967]] },
  { id: 'lambert', name: 'Kit Lambert', born: 1935, died: 1981, city: 'london', from: 1964, to: 1975, style: 'svengali', fam: ['rock'], a: [78, 52, 75, 40, 70], rate: 0.2, f: { curiosidade: 85, impulsividade: 75 },
    bio: l('Com Chris Stamp, empresariou o The Who e empurrou Pete Townshend para a ópera-rock (Tommy).', 'With Chris Stamp, managed The Who and pushed Pete Townshend toward rock opera (Tommy).'),
    cl: [['The Who', 1964, 1975]] },
  { id: 'arden', name: 'Don Arden', born: 1926, died: 2007, city: 'london', from: 1955, to: 1990, style: 'muscle', fam: ['rock', 'pop'], a: [50, 85, 62, 60, 45], rate: 0.25, f: { coragem: 88, empatia: 15, teimosia: 85 },
    bio: l('O "Al Capone do pop": famoso por pendurar um rival pela janela. Empresariou o Small Faces e a Electric Light Orchestra.', 'The "Al Capone of pop": famous for dangling a rival out of a window. Managed the Small Faces and the Electric Light Orchestra.'),
    cl: [['Electric Light Orchestra', 1972, 1986]] },
  { id: 'klein', name: 'Allen Klein', born: 1931, died: 2009, city: 'new_york', from: 1961, to: 1985, style: 'shark', fam: ['rock', 'rnb', 'pop'], a: [45, 96, 66, 78, 40], rate: 0.2, f: { ambicao: 90, generosidade: 20 },
    bio: l('Contador que auditava gravadoras e sempre achava dinheiro. Cuidou dos negócios de Sam Cooke, renegociou para os Stones e assumiu os Beatles em 1969.', 'An accountant who audited labels and always found money. Handled Sam Cooke\'s business, renegotiated for the Stones and took over the Beatles in 1969.'),
    cl: [['Sam Cooke', 1963, 1964], ['The Rolling Stones', 1965, 1970], ['The Beatles', 1969, 1973]] },
  { id: 'grossman', name: 'Albert Grossman', born: 1926, died: 1986, city: 'new_york', from: 1958, to: 1979, style: 'guardian', fam: ['country_folk', 'rock'], a: [80, 88, 50, 70, 50], rate: 0.25, f: { paciencia: 75, teimosia: 70 },
    bio: l('O "urso" do folk de Greenwich Village: montou Peter, Paul and Mary e guiou Bob Dylan, Janis Joplin e The Band, sempre com as melhores condições.', 'The "bear" of Greenwich Village folk: assembled Peter, Paul and Mary and guided Bob Dylan, Janis Joplin and The Band, always on the best terms.'),
    cl: [['Bob Dylan', 1962, 1970], ['Janis Joplin', 1968, 1970], ['The Band', 1968, 1972]] },
  { id: 'graham', name: 'Bill Graham', born: 1931, died: 1991, city: 'san_francisco', from: 1965, to: 1991, style: 'impresario', fam: ['rock', 'latin'], a: [72, 75, 70, 85, 50], rate: 0.15, f: { impulsividade: 70, disciplina: 80 },
    bio: l('Refugiado do nazismo que virou o maior promotor de shows do rock (Fillmore). Empresariou Jefferson Airplane e Santana.', 'A refugee from Nazism who became rock\'s greatest concert promoter (the Fillmore). Managed Jefferson Airplane and Santana.'),
    cl: [['Jefferson Airplane', 1966, 1967], ['Santana', 1969, 1975]] },
  { id: 'grant', name: 'Peter Grant', born: 1935, died: 1995, city: 'london', from: 1963, to: 1982, style: 'muscle', fam: ['rock'], a: [60, 90, 58, 66, 40], rate: 0.2, f: { lealdade: 90, coragem: 90, empatia: 25 },
    bio: l('Ex-lutador de luta-livre de 1,90 m. Inverteu a divisão dos shows (90% para a banda) e protegeu o Led Zeppelin com punhos e contratos.', 'A 6\'3" former wrestler. Flipped the concert split (90% to the band) and shielded Led Zeppelin with fists and contracts.'),
    cl: [['The Yardbirds', 1966, 1968], ['Led Zeppelin', 1968, 1980]] },
  { id: 'orourke', name: "Steve O'Rourke", born: 1940, died: 2003, city: 'london', from: 1968, to: 2003, style: 'guardian', fam: ['rock'], a: [62, 80, 55, 78, 40], rate: 0.2,
    bio: l('Piloto amador e negociador frio: empresariou o Pink Floyd de 1968 até morrer.', 'Amateur racing driver and cool negotiator: managed Pink Floyd from 1968 until his death.'),
    cl: [['Pink Floyd', 1968, 2003]] },
  { id: 'reid', name: 'John Reid', born: 1949, city: 'london', from: 1971, to: 1998, style: 'shark', fam: ['rock', 'pop'], a: [60, 84, 68, 70, 65], rate: 0.2, f: { impulsividade: 78 },
    bio: l('Escocês que aos 21 anos assumiu Elton John e, de quebra, empresariou o Queen na época de "Bohemian Rhapsody".', 'A Scot who took on Elton John at 21 and also managed Queen in the "Bohemian Rhapsody" years.'),
    cl: [['Elton John', 1971, 1998], ['Queen', 1975, 1978]] },
  { id: 'gordon', name: 'Shep Gordon', born: 1945, city: 'los_angeles', from: 1968, to: NOW, style: 'svengali', fam: ['rock', 'rnb'], a: [65, 76, 90, 62, 80], rate: 0.2, f: { humor: 85, generosidade: 78 },
    bio: l('O mestre da jogada publicitária (Alice Cooper e o caminhão que "caiu" na Piccadilly). Também cuidou de Teddy Pendergrass e Luther Vandross.', 'Master of the publicity stunt (Alice Cooper and the truck that "broke down" in Piccadilly). Also looked after Teddy Pendergrass and Luther Vandross.'),
    cl: [['Luther Vandross', 1981, 1986]] },
  { id: 'azoff', name: 'Irving Azoff', born: 1947, city: 'los_angeles', from: 1972, to: NOW, style: 'shark', fam: ['rock', 'pop', 'country_folk'], a: [62, 97, 64, 88, 45], rate: 0.15, f: { ambicao: 95, teimosia: 82 },
    bio: l('"O homem mais temido da música": de empresário dos Eagles e do Steely Dan a dono de gravadora, bilheteria e Ticketmaster.', '"The most feared man in music": from managing the Eagles and Steely Dan to running a label, ticketing and Ticketmaster.'),
    cl: [['Eagles', 1974, NOW], ['Steely Dan', 1974, 1980]] },
  { id: 'mclaren', name: 'Malcolm McLaren', born: 1946, died: 2010, city: 'london', from: 1975, to: 1985, style: 'svengali', fam: ['rock', 'pop'], a: [66, 58, 86, 35, 92], rate: 0.25, f: { rebeldia: 95, vaidade: 80, impulsividade: 85 },
    bio: l('Dono da butique SEX na King\'s Road. Montou os Sex Pistols como provocação de arte e escândalo.', 'Owner of the SEX boutique on King\'s Road. Put together the Sex Pistols as art provocation and scandal.'),
    cl: [['Sex Pistols', 1975, 1978]] },
  { id: 'landau', name: 'Jon Landau', born: 1947, city: 'new_york', from: 1975, to: NOW, style: 'guardian', fam: ['rock'], a: [88, 82, 60, 76, 45], rate: 0.15, f: { lealdade: 92, disciplina: 80 },
    bio: l('Crítico que escreveu "eu vi o futuro do rock and roll e o nome dele é Bruce Springsteen" — e depois virou o empresário dele.', 'The critic who wrote "I saw rock and roll future and its name is Bruce Springsteen" — and then became his manager.'),
    cl: [['Bruce Springsteen', 1978, NOW]] },
  { id: 'gretton', name: 'Rob Gretton', born: 1953, died: 1999, city: 'manchester', from: 1978, to: 1999, style: 'guardian', fam: ['rock', 'electronic'], a: [80, 60, 55, 50, 40], rate: 0.2, f: { lealdade: 90, rebeldia: 75 },
    bio: l('Torcedor do City, sócio da Factory e da Haçienda: empresariou o Joy Division e o New Order sem contrato escrito.', 'City fan, Factory and Haçienda partner: managed Joy Division and New Order without a written contract.'),
    cl: [['Joy Division', 1978, 1980], ['New Order', 1980, 1998]] },
  { id: 'wilson', name: 'Tony Wilson', born: 1950, died: 2007, city: 'manchester', from: 1978, to: 2007, style: 'impresario', fam: ['rock', 'electronic'], a: [85, 45, 88, 35, 75], rate: 0.1, f: { curiosidade: 90, ego: 80, generosidade: 75 },
    bio: l('Apresentador de TV, dono da Factory Records e da Haçienda: o grande agitador de Manchester, que acreditava mais na cena do que no lucro.', 'TV presenter, owner of Factory Records and the Haçienda: Manchester\'s great agitator, who believed in the scene more than profit.'),
    cl: [] },
  { id: 'mcguinness', name: 'Paul McGuinness', born: 1951, city: 'dublin', from: 1978, to: 2013, style: 'guardian', fam: ['rock'], a: [72, 88, 70, 85, 50], rate: 0.2, f: { lealdade: 90, disciplina: 82 },
    bio: l('Empresariou o U2 desde o primeiro show pago até 2013, e garantiu à banda a posse dos próprios masters.', 'Managed U2 from their first paid gig until 2013 and secured the band ownership of its own masters.'),
    cl: [['U2', 1978, 2013]] },
  { id: 'smallwood', name: 'Rod Smallwood', born: 1950, city: 'london', from: 1979, to: NOW, style: 'guardian', fam: ['rock'], a: [70, 78, 60, 82, 40], rate: 0.2,
    bio: l('Viu o Iron Maiden num pub do East End e montou ali um império independente do rádio.', 'Saw Iron Maiden in an East End pub and built an empire that never needed radio.'),
    cl: [['Iron Maiden', 1979, NOW]] },
  { id: 'taylor', name: 'Don Taylor', born: 1943, died: 1999, city: 'kingston', from: 1973, to: 1985, style: 'shark', fam: ['caribbean', 'rnb'], a: [60, 80, 72, 55, 60], skin: 3, rate: 0.2,
    bio: l('Ex-empresário de Little Anthony que levou Bob Marley ao circuito mundial — e levou um tiro no ataque de 1976 em Kingston.', 'Former manager of Little Anthony who took Bob Marley to the world circuit — and took a bullet in the 1976 Kingston attack.'),
    cl: [['Bob Marley & The Wailers', 1974, 1980]] },
  { id: 'demann', name: 'Freddy DeMann', born: 1939, city: 'los_angeles', from: 1975, to: 1997, style: 'shark', fam: ['pop', 'rnb'], a: [72, 85, 70, 75, 70], rate: 0.2,
    bio: l('Com Ron Weisner, empresariou Michael Jackson na era Off the Wall/Thriller; depois apostou numa novata chamada Madonna.', 'With Ron Weisner, managed Michael Jackson in the Off the Wall/Thriller years; then bet on a newcomer named Madonna.'),
    cl: [['Michael Jackson', 1978, 1983], ['Madonna', 1983, 1997]] },
  { id: 'cavallo', name: 'Bob Cavallo', born: 1939, city: 'los_angeles', from: 1965, to: 2000, style: 'guardian', fam: ['rnb', 'pop', 'rock'], a: [78, 80, 62, 75, 50], rate: 0.2,
    bio: l('Do escritório Cavallo, Ruffalo & Fargnoli: deu a Prince controle total e produziu o filme Purple Rain.', 'Of Cavallo, Ruffalo & Fargnoli: gave Prince full control and produced the film Purple Rain.'),
    cl: [['Prince', 1979, 1989]] },
  { id: 'sharon', name: 'Sharon Osbourne', born: 1952, city: 'los_angeles', from: 1980, to: 2023, style: 'shark', fam: ['rock'], a: [60, 90, 82, 80, 75], sex: 'f', rate: 0.2, f: { coragem: 90, impulsividade: 72, lealdade: 85 },
    bio: l('Filha de Don Arden, rompeu com o pai para salvar a carreira de Ozzy, criou o Ozzfest e reuniu o Black Sabbath.', 'Don Arden\'s daughter, broke with her father to save Ozzy\'s career, created Ozzfest and reunited Black Sabbath.'),
    cl: [['Black Sabbath', 1997, 2017]] },
  { id: 'simmons', name: 'Russell Simmons', born: 1957, city: 'new_york', from: 1978, to: 2017, style: 'impresario', fam: ['hiphop', 'rnb'], a: [82, 78, 80, 70, 70], skin: 3, rate: 0.2, f: { ambicao: 90 },
    bio: l('Promotor de festas no Queens que fundou a Rush Management e a Def Jam; o irmão Joseph era o "Run" do Run-DMC.', 'A Queens party promoter who founded Rush Management and Def Jam; his brother Joseph was the "Run" in Run-DMC.'),
    cl: [['Run-DMC', 1983, 2002]] },
  { id: 'mensch', name: 'Peter Mensch', born: 1953, city: 'new_york', from: 1979, to: NOW, style: 'guardian', fam: ['rock'], a: [74, 86, 55, 84, 40], rate: 0.2,
    bio: l('Da Q Prime, com Cliff Burnstein: fez do Metallica a maior banda de metal do mundo quase sem rádio.', 'Of Q Prime, with Cliff Burnstein: made Metallica the world\'s biggest metal band with almost no radio.'),
    cl: [['Metallica', 1984, NOW]] },
  { id: 'heller', name: 'Jerry Heller', born: 1940, died: 2016, city: 'los_angeles', from: 1966, to: 2000, style: 'shark', fam: ['hiphop', 'rock'], a: [55, 84, 60, 62, 45], rate: 0.2,
    bio: l('Veterano do rock que se associou a Eazy-E na Ruthless e empresariou o N.W.A — até a briga por dinheiro implodir o grupo.', 'A rock veteran who partnered with Eazy-E at Ruthless and managed N.W.A — until money fights blew the group apart.'),
    cl: [['N.W.A', 1987, 1991]] },
  { id: 'suge', name: 'Suge Knight', born: 1965, city: 'los_angeles', from: 1989, to: 2006, style: 'muscle', fam: ['hiphop'], a: [70, 85, 60, 45, 70], skin: 3, rate: 0.25, f: { coragem: 90, empatia: 10, impulsividade: 90 },
    bio: l('Ex-jogador de futebol americano e segurança que fundou a Death Row: dono de Dr. Dre, Snoop Dogg e 2Pac nos anos de ouro — e do medo de toda a indústria.', 'Former football player and bodyguard who founded Death Row: in charge of Dr. Dre, Snoop Dogg and 2Pac in the golden years — and of the whole industry\'s fear.'),
    cl: [['Dr. Dre', 1991, 1996], ['Snoop Dogg', 1992, 1998], ['2Pac', 1995, 1996]] },
  { id: 'goldberg', name: 'Danny Goldberg', born: 1950, city: 'los_angeles', from: 1975, to: NOW, style: 'guardian', fam: ['rock'], a: [80, 75, 72, 72, 55], rate: 0.15,
    bio: l('Ex-assessor do Led Zeppelin; pela Gold Mountain empresariou o Nirvana no estouro de Nevermind.', 'Former Led Zeppelin publicist; through Gold Mountain he managed Nirvana when Nevermind exploded.'),
    cl: [['Nirvana', 1990, 1994]] },
  { id: 'knowles', name: 'Mathew Knowles', born: 1951, city: 'houston', from: 1990, to: 2011, style: 'shark', fam: ['rnb', 'pop'], a: [62, 82, 66, 80, 72], skin: 3, rate: 0.2, f: { disciplina: 88, ambicao: 88 },
    bio: l('Largou a venda de equipamentos médicos para treinar o Destiny\'s Child como atletas e empresariar a filha, Beyoncé.', 'Quit selling medical equipment to train Destiny\'s Child like athletes and to manage his daughter, Beyoncé.'),
    cl: [['Beyoncé', 2003, 2011]] },
  { id: 'russell', name: 'Marcus Russell', born: 1953, city: 'manchester', from: 1988, to: NOW, style: 'guardian', fam: ['rock'], a: [70, 78, 52, 80, 40], rate: 0.2,
    bio: l('Galês discreto da Ignition: segurou os irmãos Gallagher por 16 anos de Oasis.', 'Discreet Welshman of Ignition: kept the Gallagher brothers together for 16 years of Oasis.'),
    cl: [['Oasis', 1993, 2009]] },
  { id: 'pearlman', name: 'Lou Pearlman', born: 1954, died: 2016, city: 'miami', from: 1992, to: 2006, style: 'svengali', fam: ['pop'], a: [55, 80, 75, 50, 70], rate: 0.3, f: { generosidade: 10, ambicao: 90 },
    bio: l('Magnata de dirigíveis que fabricou boy bands (Backstreet Boys, NSYNC) — e ficava com a maior parte do dinheiro delas.', 'A blimp magnate who manufactured boy bands (Backstreet Boys, NSYNC) — and kept most of their money.'),
    cl: [['Backstreet Boys', 1993, 1998], ['NSYNC', 1995, 1998]] },
  { id: 'fuller', name: 'Simon Fuller', born: 1960, city: 'london', from: 1985, to: NOW, style: 'svengali', fam: ['pop'], a: [70, 85, 78, 82, 88], rate: 0.2, f: { ambicao: 92 },
    bio: l('Da 19 Entertainment: deu ao Spice Girls apelidos e marca — e depois inventou o Pop Idol.', 'Of 19 Entertainment: gave the Spice Girls nicknames and a brand — and later invented Pop Idol.'),
    cl: [['Spice Girls', 1995, 1997]] },
  { id: 'carter', name: 'Troy Carter', born: 1973, city: 'los_angeles', from: 1999, to: 2018, style: 'guardian', fam: ['pop', 'hiphop'], a: [80, 75, 82, 72, 70], skin: 3, rate: 0.2,
    bio: l('Pioneiro das redes sociais na gestão de carreira: levou Lady Gaga de estreante a fenômeno mundial.', 'A pioneer of social media in artist management: took Lady Gaga from newcomer to global phenomenon.'),
    cl: [['Lady Gaga', 2007, 2013]] },
  { id: 'braun', name: 'Scooter Braun', born: 1981, city: 'atlanta', from: 2007, to: 2024, style: 'shark', fam: ['pop', 'hiphop'], a: [72, 88, 84, 80, 75], rate: 0.2, f: { ambicao: 95 },
    bio: l('Achou Justin Bieber no YouTube e montou a SB Projects; também empresariou Ariana Grande — e comprou masters alheios.', 'Found Justin Bieber on YouTube and built SB Projects; also managed Ariana Grande — and bought other people\'s masters.'),
    cl: [['Justin Bieber', 2008, 2023], ['Ariana Grande', 2013, 2023]] },
  { id: 'lazaro', name: 'Marcos Lázaro', city: 'sao_paulo', from: 1960, to: 1985, style: 'impresario', fam: ['brazil', 'rock', 'pop'], a: [62, 82, 70, 75, 55], rate: 0.2,
    bio: l('Argentino radicado em São Paulo, o grande empresário da era da TV Record: Roberto Carlos, Elis Regina e os festivais.', 'An Argentine based in São Paulo, the top manager of the TV Record era: Roberto Carlos, Elis Regina and the festivals.'),
    cl: [['Elis Regina', 1965, 1972], ['Roberto Carlos', 1966, 1972]] },
  { id: 'araujo', name: 'Guilherme Araújo', born: 1936, died: 2007, city: 'rio', from: 1965, to: 2000, style: 'svengali', fam: ['brazil', 'pop'], a: [85, 66, 82, 55, 88], rate: 0.2, f: { curiosidade: 88, vaidade: 72 },
    bio: l('O empresário da Tropicália: deu nome e figurino ao movimento e conduziu Caetano, Gil, Gal e Bethânia.', 'The manager of Tropicália: gave the movement its name and look and steered Caetano, Gil, Gal and Bethânia.'),
    cl: [['Caetano Veloso', 1967, 1978], ['Gilberto Gil', 1967, 1978], ['Gal Costa', 1967, 1978], ['Maria Bethânia', 1967, 1978]] },
  { id: 'poladian', name: 'Manoel Poladian', born: 1941, city: 'sao_paulo', from: 1970, to: 2015, style: 'impresario', fam: ['brazil', 'rock', 'pop'], a: [58, 85, 66, 86, 45], rate: 0.2, f: { teimosia: 78, disciplina: 80 },
    bio: l('O rei das grandes turnês no Brasil: levou espetáculos a ginásios e estádios e empresariou Ney Matogrosso.', 'The king of big tours in Brazil: took shows to arenas and stadiums and managed Ney Matogrosso.'),
    cl: [['Ney Matogrosso', 1978, 1995]] },
];

REAL_MGRS.push(...MGRS18.filter((x) => !REAL_MGRS.some((y) => y.id === x.id))); // r18 (world18): mais empresários reais por região
export const mgrById: Record<string, RealMgr> = Object.fromEntries(REAL_MGRS.map((m) => [m.id, m]));
