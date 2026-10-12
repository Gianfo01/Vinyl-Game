// Rodada 25: mais laços familiares reais (complementa src/data/kin15.ts). Formato [A, relação, B] = "A é <relação> de B".
// Só valem entre pessoas presentes no banco (casamento por nome canônico, em kin15.graph); sem sorteio.
// Só fatos bem documentados: na dúvida, fica de fora.
import type { KinMeta27 } from './model27';
export type KinRel25 = 'parent' | 'child' | 'sibling' | 'spouse' | 'ex' | 'cousin' | 'uncle' | 'nephew' | 'grandparent' | 'grandchild';
/** r27 (F): 4º item opcional = KinMeta27 (subtipo, período, procedência) */
export type KinRow25 = [string, KinRel25, string] | [string, KinRel25, string, KinMeta27];

/** irmãos: todos os pares do grupo */
const sib = (...ns: string[]): KinRow25[] => ns.flatMap((a, i) => ns.slice(i + 1).map((b) => [a, 'sibling', b] as KinRow25));
/** pai/mãe de vários */
const par = (p: string, ...kids: string[]): KinRow25[] => kids.map((k) => [p, 'parent', k] as KinRow25);

export const KIN25: KinRow25[] = [
  // Gil: Gilsons = José Gil (filho de Gilberto), Francisco Gil (neto; filho de Preta Gil) e João Gil (neto; filho de Nara Gil)
  ...par('Gilberto Gil', 'José Gil', 'Preta Gil', 'Nara Gil'),
  ['Preta Gil', 'parent', 'Francisco Gil'], ['Nara Gil', 'parent', 'João Gil'],
  ['Gilberto Gil', 'grandparent', 'Francisco Gil'], ['Gilberto Gil', 'grandparent', 'João Gil'],
  ['José Gil', 'uncle', 'Francisco Gil'], ['José Gil', 'uncle', 'João Gil'],
  ['Francisco Gil', 'cousin', 'João Gil'],
  // Brasil
  ...sib('Samuel Reoli', 'Sérgio Reoli'), // Mamonas Assassinas
  ...sib('Fê Lemos', 'Flávio Lemos'), // Capital Inicial
  ...sib('Max Cavalera', 'Igor Cavalera'), // Sepultura
  ...sib('Leandro', 'Leonardo'), ['Leonardo', 'parent', 'Zé Felipe'],
  ...sib('Henrique', 'Juliano'), ...sib('Maiara', 'Maraisa'), ...sib('Tonico', 'Tinoco'),
  ['Martinho da Vila', 'parent', "Mart'nália"],
  ['Baby Consuelo', 'ex', 'Pepeu Gomes'],
  // EUA / Reino Unido / Irlanda / Austrália
  ...sib('Duane Allman', 'Gregg Allman'), ['Gregg Allman', 'ex', 'Cher'],
  ...sib('John Fogerty', 'Tom Fogerty'),
  ...sib('Ronnie Van Zant', 'Johnny Van Zant'),
  ...sib('Ann Wilson', 'Nancy Wilson'),
  ...sib('Maurice White', 'Verdine White'),
  ...sib('Robert "Kool" Bell', 'Ronald Bell'),
  ...sib('Herbert Mills', 'Harry Mills', 'Donald Mills', 'John Mills Jr.'),
  ...sib('LaVerne Andrews', 'Maxene Andrews', 'Patty Andrews'),
  ...sib('Connee Boswell', 'Martha Boswell', 'Vet Boswell'),
  ...sib('Debbie Sledge', 'Joni Sledge', 'Kim Sledge', 'Kathy Sledge'),
  ...par("Roebuck 'Pops' Staples", 'Mavis Staples', 'Cleotha Staples', 'Pervis Staples', 'Yvonne Staples'), ...sib('Mavis Staples', 'Cleotha Staples', 'Pervis Staples', 'Yvonne Staples'),
  ['A.P. Carter', 'ex', 'Sara Carter'], ['Sara Carter', 'cousin', 'Maybelle Carter'],
  ...sib('Vinnie Paul', 'Dimebag Darrell'), // Pantera
  ...sib('Jeff Porcaro', 'Steve Porcaro', 'Mike Porcaro'), // Toto
  ...sib('Jonny Greenwood', 'Colin Greenwood'), // Radiohead
  ...sib('Gary Kemp', 'Martin Kemp'), // Spandau Ballet
  ...sib('Mark Knopfler', 'David Knopfler'), // Dire Straits
  ...sib('Noel Hogan', 'Mike Hogan'), // The Cranberries
  ...sib('Andrew Farriss', 'Tim Farriss', 'Jon Farriss'), // INXS
  ['Tina Weymouth', 'spouse', 'Chris Frantz'], // Talking Heads
  ['Jack White', 'ex', 'Meg White'], ['John McVie', 'ex', 'Christine McVie'], ['John Phillips', 'ex', 'Michelle Phillips'],
  ['Agnetha Fältskog', 'ex', 'Björn Ulvaeus'], ['Benny Andersson', 'ex', 'Anni-Frid Lyngstad'],
  // Europa / América Latina / África
  ...sib('Django Reinhardt', 'Joseph Reinhardt'),
  ...sib('Bill Kaulitz', 'Tom Kaulitz'), // Tokio Hotel
  ...sib('Joselo Rangel', 'Quique Rangel'), // Café Tacvba
  ['Johnny Hallyday', 'ex', 'Sylvie Vartan'], ['Jacques Dutronc', 'spouse', 'Françoise Hardy'],
  ['Vicente Fernández', 'parent', 'Alejandro Fernández'],
  ...par('Fela Kuti', 'Femi Kuti', 'Seun Kuti'), ...sib('Femi Kuti', 'Seun Kuti'),
];
