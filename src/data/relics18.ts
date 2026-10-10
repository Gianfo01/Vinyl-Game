// Rodada 18 (talent18) — mais relíquias REAIS documentadas (leilões públicos com valor e casa conhecidos).
// Entram no catálogo do relics17 (só modo de nomes reais; fora do modo exato, só as nascidas antes do início).

import { l } from './world';
import type { RelicDef17 } from '../sim/relics17';

const R = (id: string, pt: string, en: string, owner: string, year: number, month: number, kind: RelicDef17['kind'], value: number, sp: string, se: string, lp: string, le: string, steps?: RelicDef17['steps']): RelicDef17 =>
  ({ id, name: l(pt, en), owner, year, month, kind, value, story: l(sp, se), location: l(lp, le), steps });

export const RELICS18: RelicDef17[] = [
  R('day_in_life_lyrics', 'A letra manuscrita de "A Day in the Life"', 'The handwritten "A Day in the Life" lyrics', 'The Beatles', 1967, 0, 'lyrics', 300,
    'Lennon escreveu a letra a lápis e caneta numa folha só, com correções, em janeiro de 1967.', 'Lennon wrote the lyric in pencil and pen on a single sheet, with corrections, in January 1967.',
    'Coleção particular', 'Private collection',
    [[2010, 5, 'auction', 1200000, 'colecionador anônimo', 'Sotheby\'s Nova York: US$ 1,2 milhão.', 'Sotheby\'s New York: US$1.2 million.']]),
  R('hey_jude_notes', 'As anotações de estúdio de "Hey Jude"', 'The "Hey Jude" studio lyric notes', 'The Beatles', 1968, 6, 'lyrics', 200,
    'Folha com a letra que Paul McCartney levou ao estúdio em julho de 1968, depois guardada por um engenheiro.', 'The lyric sheet Paul McCartney took into the studio in July 1968, later kept by an engineer.',
    'Coleção particular', 'Private collection',
    [[2020, 10, 'auction', 910000, 'colecionador anônimo', 'Julien\'s: US$ 910 mil.', 'Julien\'s: US$910,000.']]),
  R('brownie_strat', '"Brownie", a Stratocaster de "Layla"', '"Brownie", the "Layla" Stratocaster', 'Derek and the Dominos', 1970, 7, 'guitar', 1500,
    'Clapton gravou "Layla" com esta Strat sunburst de 1956, antes de montar a Blackie.', 'Clapton cut "Layla" on this 1956 sunburst Strat, before he built Blackie.',
    'Experience Music Project, Seattle', 'Experience Music Project, Seattle',
    [[1999, 5, 'auction', 497500, 'Paul Allen (EMP)', 'Christie\'s, leilão beneficente da clínica Crossroads: US$ 497,5 mil.', 'Christie\'s, Crossroads clinic charity sale: US$497,500.']]),
  R('american_pie_ms', 'O manuscrito de "American Pie"', 'The "American Pie" manuscript', 'Don McLean', 1971, 4, 'lyrics', 500,
    '16 páginas de rascunhos e notas da canção sobre "o dia em que a música morreu".', '16 pages of drafts and notes for the song about "the day the music died".',
    'Coleção particular', 'Private collection',
    [[2015, 3, 'auction', 1205000, 'colecionador anônimo', 'Christie\'s Nova York: US$ 1,2 milhão.', 'Christie\'s New York: US$1.2 million.']]),
  R('mercury_yamaha', 'O piano Yamaha de Freddie Mercury', 'Freddie Mercury\'s Yamaha piano', 'Queen', 1975, 3, 'piano', 7000,
    'O piano de cauda G2 que ele comprou em 1975 e em que compôs "Bohemian Rhapsody".', 'The G2 grand he bought in 1975 and on which he wrote "Bohemian Rhapsody".',
    'Coleção particular', 'Private collection',
    [[2023, 8, 'auction', 2200000, 'colecionador anônimo', 'Sotheby\'s Londres ("A World of His Own"): cerca de £ 1,7 milhão.', 'Sotheby\'s London ("A World of His Own"): about £1.7 million.']]),
  R('garcia_tiger', '"Tiger", a guitarra de Jerry Garcia', '"Tiger", Jerry Garcia\'s guitar', 'Grateful Dead', 1979, 7, 'guitar', 11000,
    'Feita à mão por Doug Irwin; Garcia a tocou em mais de dez anos de shows do Grateful Dead.', 'Hand-built by Doug Irwin; Garcia played it through more than a decade of Grateful Dead shows.',
    'Jim Irsay', 'Jim Irsay',
    [[2002, 4, 'auction', 957500, 'Jim Irsay', 'Leilão em Nova York: US$ 957,5 mil.', 'New York auction: US$957,500.']]),
  R('srv_lenny', '"Lenny", a Stratocaster de Stevie Ray Vaughan', '"Lenny", Stevie Ray Vaughan\'s Stratocaster', 'Stevie Ray Vaughan', 1980, 0, 'guitar', 350,
    'Presente de aniversário da esposa, Lenny, que juntou dinheiro com amigos para comprá-la.', 'A birthday gift from his wife Lenny, who pooled money with friends to buy it.',
    'Guitar Center', 'Guitar Center',
    [[2004, 5, 'auction', 623500, 'Guitar Center', 'Christie\'s (Crossroads): US$ 623,5 mil.', 'Christie\'s (Crossroads): US$623,500.']]),
  R('thriller_jacket', 'A jaqueta vermelha do clipe "Thriller"', 'The red "Thriller" video jacket', 'Michael Jackson', 1983, 9, 'outfit', 2000,
    'A jaqueta de couro vermelha e preta do clipe de 14 minutos dirigido por John Landis.', 'The red-and-black leather jacket from the 14-minute video directed by John Landis.',
    'Milton Verret', 'Milton Verret',
    [[2011, 5, 'auction', 1800000, 'Milton Verret', 'Julien\'s: US$ 1,8 milhão.', 'Julien\'s: US$1.8 million.']]),
  R('teen_spirit_mustang', 'A Fender Mustang do clipe "Smells Like Teen Spirit"', 'The "Smells Like Teen Spirit" video Fender Mustang', 'Nirvana', 1991, 7, 'guitar', 600,
    'A guitarra canhota azul-claro do clipe que levou o grunge ao mundo.', 'The lake-blue left-handed guitar from the video that took grunge worldwide.',
    'Jim Irsay', 'Jim Irsay',
    [[2022, 4, 'auction', 4560000, 'Jim Irsay', 'Julien\'s: US$ 4,56 milhões.', 'Julien\'s: US$4.56 million.']]),
  R('tupac_ring', 'O anel-coroa de Tupac Shakur', 'Tupac Shakur\'s crown ring', '2Pac', 1996, 8, 'prop', 5000,
    'Anel de ouro, rubis e diamantes desenhado por ele mesmo e usado no VMA de 1996, semanas antes de ser baleado.', 'A gold, ruby and diamond ring he designed himself and wore at the 1996 VMAs, weeks before he was shot.',
    'Coleção particular', 'Private collection',
    [[2023, 6, 'auction', 1016000, 'colecionador anônimo', 'Sotheby\'s Nova York: US$ 1,02 milhão.', 'Sotheby\'s New York: US$1.02 million.']]),
  R('winehouse_belgrade', 'O vestido do último show de Amy Winehouse', 'Amy Winehouse\'s last-concert dress', 'Amy Winehouse', 2011, 5, 'outfit', 3000,
    'O vestido verde e preto de Belgrado, em junho de 2011, um mês antes da morte dela.', 'The green-and-black dress from Belgrade, June 2011, a month before her death.',
    'Coleção particular', 'Private collection',
    [[2021, 10, 'auction', 243200, 'colecionador anônimo', 'Julien\'s: US$ 243 mil.', 'Julien\'s: US$243,000.']]),
];
