// Rodada 15: laços familiares reais (só valem entre pessoas presentes no banco; casamento por nome).
// S = irmãos(ãs) · P = pai/mãe, filhos... · M = casal · X = ex · U = tio/tia, sobrinhos... · C = primos.
export type KinRow = ['S' | 'P' | 'M' | 'X' | 'U' | 'C', ...string[]];
const J = (...x: string[]) => x.map((n) => `${n} Jackson`);

export const KIN15: KinRow[] = [
  // Jackson
  ['S', ...J('Michael', 'Janet', 'Jermaine', 'Jackie', 'Tito', 'Marlon', 'La Toya', 'Randy', 'Rebbie')],
  ['P', 'Joe Jackson', ...J('Michael', 'Janet', 'Jermaine', 'Jackie', 'Tito', 'Marlon', 'La Toya', 'Randy')],
  ['U', 'Tito Jackson', 'Taj Jackson', 'TJ Jackson'],
  ['P', 'Michael Jackson', 'Prince Jackson', 'Paris Jackson'],
  ['P', 'Jermaine Jackson', 'Jaafar Jackson'],
  ['M', 'Michael Jackson', 'Lisa Marie Presley'], ['P', 'Elvis Presley', 'Lisa Marie Presley'],
  // irmãos de bandas
  ['S', 'Barry Gibb', 'Robin Gibb', 'Maurice Gibb', 'Andy Gibb'],
  ['S', 'Don Everly', 'Phil Everly'],
  ['S', 'Brian Wilson', 'Dennis Wilson', 'Carl Wilson'], ['C', 'Brian Wilson', 'Mike Love'], ['P', 'Murry Wilson', 'Brian Wilson', 'Dennis Wilson', 'Carl Wilson'],
  ['S', 'Noel Gallagher', 'Liam Gallagher'],
  ['S', 'Kevin Jonas', 'Joe Jonas', 'Nick Jonas'],
  ['S', 'Este Haim', 'Danielle Haim', 'Alana Haim'],
  ['S', 'Caleb Followill', 'Nathan Followill', 'Jared Followill'], ['C', 'Matthew Followill', 'Caleb Followill'],
  ['S', 'Eddie Van Halen', 'Alex Van Halen'], ['P', 'Eddie Van Halen', 'Wolfgang Van Halen'], ['M', 'Eddie Van Halen', 'Valerie Bertinelli'],
  ['S', 'Angus Young', 'Malcolm Young', 'George Young'],
  ['S', "O'Kelly Isley", 'Rudolph Isley', 'Ronald Isley', 'Ernie Isley', 'Marvin Isley'],
  ['S', 'Ruth Pointer', 'Anita Pointer', 'June Pointer', 'Bonnie Pointer'],
  ['S', 'Karen Carpenter', 'Richard Carpenter'],
  ['S', 'Ray Davies', 'Dave Davies'], ['S', 'Neil Finn', 'Tim Finn'], ['S', 'Isaac Hanson', 'Taylor Hanson', 'Zac Hanson'],
  ['S', 'Chitãozinho', 'Xororó'], ['S', 'Zezé Di Camargo', 'Luciano'],
  ['S', 'Arnaldo Baptista', 'Sérgio Dias'], ['X', 'Arnaldo Baptista', 'Rita Lee'], ['M', 'Rita Lee', 'Roberto de Carvalho'],
  // pais e filhos
  ['P', 'Bob Marley', 'Ziggy Marley', 'Damian Marley', 'Stephen Marley', 'Julian Marley', 'Ky-Mani Marley', 'Cedella Marley'], ['M', 'Bob Marley', 'Rita Marley'], ['P', 'Rita Marley', 'Ziggy Marley', 'Stephen Marley', 'Cedella Marley'],
  ['S', 'Ziggy Marley', 'Stephen Marley', 'Cedella Marley'],
  ['P', 'John Lennon', 'Julian Lennon', 'Sean Lennon'], ['M', 'John Lennon', 'Yoko Ono'], ['X', 'John Lennon', 'Cynthia Lennon'], ['P', 'Yoko Ono', 'Sean Lennon'], ['S', 'Julian Lennon', 'Sean Lennon'],
  ['M', 'Johnny Cash', 'June Carter Cash'], ['P', 'Johnny Cash', 'Rosanne Cash', 'John Carter Cash'], ['P', 'June Carter Cash', 'Carlene Carter', 'John Carter Cash'], ['P', 'Maybelle Carter', 'June Carter Cash'],
  ['P', 'Nat King Cole', 'Natalie Cole'], ['S', 'Nat King Cole', 'Freddy Cole'], ['U', 'Freddy Cole', 'Natalie Cole'],
  ['P', 'Frank Sinatra', 'Nancy Sinatra', 'Frank Sinatra Jr.'], ['S', 'Nancy Sinatra', 'Frank Sinatra Jr.'],
  ['P', 'Judy Garland', 'Liza Minnelli', 'Lorna Luft'], ['S', 'Liza Minnelli', 'Lorna Luft'],
  ['P', 'Billy Ray Cyrus', 'Miley Cyrus', 'Noah Cyrus', 'Trace Cyrus'], ['S', 'Miley Cyrus', 'Noah Cyrus', 'Trace Cyrus'],
  ['S', 'Beyoncé', 'Solange'], ['M', 'Beyoncé', 'Jay-Z'], ['P', 'Beyoncé', 'Blue Ivy Carter'],
  ['P', 'Hank Williams', 'Hank Williams Jr.'], ['P', 'Hank Williams Jr.', 'Hank Williams III'],
  ['P', 'Bob Dylan', 'Jakob Dylan'], ['P', 'Willie Nelson', 'Lukas Nelson', 'Micah Nelson'], ['S', 'Lukas Nelson', 'Micah Nelson'],
  ['P', 'Ravi Shankar', 'Norah Jones', 'Anoushka Shankar'], ['S', 'Norah Jones', 'Anoushka Shankar'],
  ['P', 'Julio Iglesias', 'Enrique Iglesias'], ['P', 'Phil Collins', 'Lily Collins'], ['P', 'Mick Jagger', 'Jade Jagger'],
  ['P', 'Ringo Starr', 'Zak Starkey'], ['P', 'Paul McCartney', 'Stella McCartney', 'James McCartney'], ['M', 'Paul McCartney', 'Linda McCartney'],
  // Brasil
  ['P', 'Dorival Caymmi', 'Dori Caymmi', 'Danilo Caymmi', 'Nana Caymmi'], ['S', 'Dori Caymmi', 'Danilo Caymmi', 'Nana Caymmi'], ['P', 'Nana Caymmi', 'Stella Caymmi'],
  ['S', 'Caetano Veloso', 'Maria Bethânia'], ['P', 'Caetano Veloso', 'Moreno Veloso', 'Zeca Veloso', 'Tom Veloso'], ['S', 'Moreno Veloso', 'Zeca Veloso', 'Tom Veloso'], ['M', 'Caetano Veloso', 'Paula Lavigne'],
  ['P', 'Gilberto Gil', 'Preta Gil', 'Bem Gil', 'Bela Gil', 'Nara Gil'], ['S', 'Preta Gil', 'Bem Gil', 'Bela Gil', 'Nara Gil'],
  ['P', 'Elis Regina', 'Maria Rita', 'Pedro Mariano', 'João Marcello Bôscoli'], ['S', 'Maria Rita', 'Pedro Mariano', 'João Marcello Bôscoli'], ['M', 'Elis Regina', 'César Camargo Mariano'], ['P', 'César Camargo Mariano', 'Pedro Mariano', 'Maria Rita'],
  ['P', 'Wilson Simonal', 'Wilson Simoninha', 'Max de Castro'], ['S', 'Wilson Simoninha', 'Max de Castro'],
  ['P', 'Luiz Gonzaga', 'Gonzaguinha'],
  ['S', 'Chico Buarque', 'Miúcha', 'Cristina Buarque', 'Ana de Hollanda'], ['P', 'Miúcha', 'Bebel Gilberto'], ['P', 'João Gilberto', 'Bebel Gilberto'], ['X', 'João Gilberto', 'Miúcha'], ['U', 'Chico Buarque', 'Bebel Gilberto'], ['M', 'João Gilberto', 'Astrud Gilberto'],
  ['P', 'Xororó', 'Sandy', 'Junior Lima'], ['S', 'Sandy', 'Junior Lima'],
  ['P', 'Tom Jobim', 'Paulo Jobim'], ['P', 'Paulo Jobim', 'Daniel Jobim'], ['P', 'Vinicius de Moraes', 'Luciana de Moraes'],

];
