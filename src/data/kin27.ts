// Rodada 27 (C1): laços familiares da auditoria (05_familia_eCa.json), no formato de kin15:
// S = irmãos · P = pai/mãe, filhos... · M = casal · X = ex · U = tio/tia, sobrinhos... · C = primos.
// Como em kin15, só valem entre pessoas presentes no banco (casamento por nome canônico); parentes que não existem no jogo
// (Katherine Jackson, Riley Keough…) ficam listados e ligam sozinhos quando a pessoa existir — como Joe Jackson.
// r27 (F): período e subtipo agora vão no último item da linha (KinMeta27, model27).
import type { KinRow } from './kin15';

export const KIN27: KinRow[] = [
  // Jackson / Presley
  ['X', 'Michael Jackson', 'Debbie Rowe', { from: 1996, to: 1999 }],
  ['P', 'Katherine Jackson', 'Michael Jackson', 'Janet Jackson', 'Jermaine Jackson', 'Jackie Jackson', 'Tito Jackson', 'Marlon Jackson', 'La Toya Jackson', 'Randy Jackson', 'Rebbie Jackson'],
  ['S', 'Taj Jackson', 'Taryll Jackson', 'TJ Jackson'], // 3T
  ['P', 'Lisa Marie Presley', 'Riley Keough'], ['X', 'Elvis Presley', 'Priscilla Presley'],
  // Elis / Bôscoli
  ['X', 'Elis Regina', 'Ronaldo Bôscoli', { from: 1967, to: 1972, src: 'a' }], ['P', 'Ronaldo Bôscoli', 'João Marcello Bôscoli', { sub: 'biological' }],
  // Índia, mundo árabe, Japão
  ['S', 'Lata Mangeshkar', 'Asha Bhosle', 'Usha Mangeshkar', 'Hridaynath Mangeshkar'], ['M', 'Asha Bhosle', 'R. D. Burman'], ['P', 'S. D. Burman', 'R. D. Burman'], ['P', 'Kishore Kumar', 'Amit Kumar'],
  ['M', 'Fairuz', 'Assi Rahbani'], ['S', 'Assi Rahbani', 'Mansour Rahbani'], ['P', 'Fairuz', 'Ziad Rahbani'],
  ['P', 'Alla Rakha', 'Zakir Hussain'], ['P', 'Keiko Fuji', 'Utada Hikaru'], ['X', 'Ryuichi Sakamoto', 'Akiko Yano'], ['P', 'Ryuichi Sakamoto', 'Miu Sakamoto'],
  // Reino Unido / EUA
  ['P', 'Don Arden', 'Sharon Osbourne'], ['M', 'Ozzy Osbourne', 'Sharon Osbourne'], ['P', 'Ozzy Osbourne', 'Kelly Osbourne', 'Jack Osbourne'],
  ['P', 'George Martin', 'Giles Martin'], ['P', 'Mathew Knowles', 'Beyoncé', 'Solange'], ['P', 'Tina Knowles', 'Beyoncé', 'Solange'],
  ['S', 'Billie Eilish', 'Finneas'], ['S', 'Kylie Minogue', 'Dannii Minogue'], ['S', 'Loretta Lynn', 'Crystal Gayle'],
  ['P', 'Brian Wilson', 'Carnie Wilson', 'Wendy Wilson'], ['P', 'John Phillips', 'Chynna Phillips', 'Mackenzie Phillips'],
  ['M', 'Kurt Cobain', 'Courtney Love'], ['P', 'Kurt Cobain', 'Frances Bean Cobain'],
  ['X', 'Ike Turner', 'Tina Turner'], ['X', 'Sonny Bono', 'Cher'], ['X', 'Bobby Brown', 'Whitney Houston'], ['P', 'Cissy Houston', 'Whitney Houston'], ['C', 'Whitney Houston', 'Dionne Warwick'],
  ['X', 'Marvin Gaye', 'Anna Gordy'], ['S', 'Berry Gordy', 'Anna Gordy'], ['X', 'Jermaine Jackson', 'Hazel Gordy', { from: 1973, to: 1988, src: 'a' }], ['P', 'Berry Gordy', 'Hazel Gordy'],
  ['P', 'Diana Ross', 'Tracee Ellis Ross', 'Evan Ross'], ['P', 'Steven Tyler', 'Liv Tyler'], ['M', 'Bruce Springsteen', 'Patti Scialfa'],
  ['X', 'George Harrison', 'Pattie Boyd'], ['X', 'Eric Clapton', 'Pattie Boyd'], ['P', 'George Harrison', 'Dhani Harrison'], ['M', 'Ringo Starr', 'Barbara Bach'],
  ['M', 'David Bowie', 'Iman'], ['P', 'David Bowie', 'Duncan Jones'], ['M', 'Sting', 'Trudie Styler'], ['M', 'Elton John', 'David Furnish'],
  ['X', 'James Taylor', 'Carly Simon'], ['X', 'Carole King', 'Gerry Goffin'], ['X', 'Phil Spector', 'Ronnie Spector'], ['M', 'Paul Simon', 'Edie Brickell'],
  ['X', 'Mariah Carey', 'Tommy Mottola'], ['M', 'Thalía', 'Tommy Mottola'], ['M', 'Celine Dion', 'René Angélil'], ['X', 'Shania Twain', 'Mutt Lange'],
  ['M', 'Gloria Estefan', 'Emilio Estefan'], ['X', 'Jennifer Lopez', 'Marc Anthony'], ['X', 'Shakira', 'Gerard Piqué'], ['X', 'Madonna', 'Sean Penn'], ['X', 'Madonna', 'Guy Ritchie'],
  ['X', 'Gwen Stefani', 'Gavin Rossdale'], ['M', 'Gwen Stefani', 'Blake Shelton'], ['M', 'Tim McGraw', 'Faith Hill'], ['X', 'George Jones', 'Tammy Wynette'],
  ['M', 'Waylon Jennings', 'Jessi Colter'], ['P', 'Waylon Jennings', 'Shooter Jennings'],
  // África / França
  ['X', 'Miriam Makeba', 'Hugh Masekela'], ['M', 'Amadou Bagayoko', 'Mariam Doumbia'],
  ['P', 'Serge Gainsbourg', 'Charlotte Gainsbourg'], ['X', 'Serge Gainsbourg', 'Jane Birkin'], ['P', 'Johnny Hallyday', 'David Hallyday'],
  ['P', 'Françoise Hardy', 'Thomas Dutronc'], ['P', 'Jacques Dutronc', 'Thomas Dutronc'], ['M', 'France Gall', 'Michel Berger'],
  // América Latina
  ['P', 'Pepe Aguilar', 'Ángela Aguilar'], ['M', 'Christian Nodal', 'Ángela Aguilar'], ['P', 'Jenni Rivera', 'Chiquis Rivera'],
  ['P', 'Abraham Quintanilla', 'Selena', 'A.B. Quintanilla'], ['S', 'Selena', 'A.B. Quintanilla'], ['P', 'Luisito Rey', 'Luis Miguel'],
  ['P', 'Gustavo Cerati', 'Benito Cerati'], ['P', 'Charly García', 'Migue García'],
  // Brasil
  ['P', 'Max Cavalera', 'Zyon Cavalera'], ['P', 'Zezé Di Camargo', 'Wanessa Camargo'], ['S', 'Simone', 'Simaria'],
  ['X', 'Marília Mendonça', 'Murilo Huff'], ['X', 'Sandy', 'Lucas Lima'],
  ['P', 'Fábio Jr.', 'Fiuk', 'Cleo'], ['P', 'Rita Lee', 'Beto Lee'], ['U', 'Tim Maia', 'Ed Motta'], ['P', 'Tim Maia', 'Léo Maia'], ['C', 'Elba Ramalho', 'Zé Ramalho'],
  ['P', 'Arlindo Cruz', 'Arlindinho'], ['P', 'César Faria', 'Paulinho da Viola'], ['P', 'Moraes Moreira', 'Davi Moraes'], ['P', 'Baby do Brasil', 'Pedro Baby'],
  ['P', 'Baden Powell', 'Marcel Powell', 'Philippe Baden Powell'], ['P', 'João Bosco', 'Francisco Bosco'], ['M', 'Gilberto Gil', 'Flora Gil'], ['X', 'Chico Buarque', 'Marieta Severo'],
  ['S', 'Emicida', 'Evandro Fióti'], ['M', 'Ludmilla', 'Brunna Gonçalves'], ['P', 'Marcelo D2', 'Stephan'], ['M', 'Michel Teló', 'Thais Fersoza'],
];
