// Rodada 15: visual característico de artistas reais famosos, por fase (só no modo nomes reais).
// Formato compacto: "ano:tokens|ano:tokens" — vale o último trecho com ano <= ano do jogo (o primeiro vale antes).
// Tokens: s pele 0-3 · h cabelo (src/ui/pixel/avatar.ts HAIR) · c cor do cabelo · r raiz · o roupa 0-3 · k cor da roupa
// · y corpo · f rosto · g óculos (0 comum 1 redondo 2 escuro 3 extravagante) · t chapéu (1 cartola 2 caubói 3 boina 4 gorro
// 5 faixa 6 boné 7 fedora 8 bandana) · a cor do chapéu · d barba (0 cheia 1 bigode 2 cavanhaque 3 por fazer)
// · p pintura (1 estrela 2 demônio 3 gato 4 espacial 5 raio 6 delineador 7 máscara branca) · m capacete (1 prata 2 ouro) · F mulher.
// Cabelos 0 careca 1 curto 2 franja 3 raspado 4 topete 5 cuia 6 black 7 longo 8 ondulado 9 rabo 10 coque 11 moicano
// 12 cacheado 13 chanel 14 espetado 15 dreads 16 mullet 17 bufante 18 gomalina 19 longo c/ franja 20 cachos longos 21 trancinhas 22 pixie.
// Cores do cabelo 0 preto 1 castanho-escuro 2 castanho 3 ruivo-escuro 4 loiro 5 ruivo 6 grisalho 7 tingido 8 platinado 9 vermelho
// 10 rosa 11 verde 12 azul. Roupa: 0 casual 1 social 2 vestido/casaco 3 malha. Cores 0 marinho 1 vermelho 2 verde 3 mostarda
// 4 roxo 5 branco 6 preto 7 laranja 8 dourado 9 rosa 10 prata 11 couro 12 celeste.

import type { Appearance } from '../sim/types';
import { LOOKS17 } from './looks17';

const L: Record<string, string> = {
  // anos 30–50
  'Louis Armstrong': 's3 h3 c0 o1 k6 y2 f2 d1|1960:s3 h3 c6 o1 k6 y2 f2 d1',
  'Carmen Miranda': 'F s1 h10 c0 t8 a7 o2 k3 f2 p6',
  'Édith Piaf': 'F s0 h12 c1 o2 k6 y0',
  'Frank Sinatra': 's0 h18 c1 o1 k0 t7 a6|1965:s0 h18 c1 o1 k6|1975:s0 h18 c6 o1 k6',
  'Elvis Presley': 's0 h4 c0 o1 k6 y0 f1|1968:s0 h4 c0 o0 k6 f1 y0|1970:s0 h4 c0 o2 k5 g2 y1|1974:s0 h4 c0 o2 k5 g2 y2',
  'Chuck Berry': 's3 h18 c0 o1 k5 d1',
  'Little Richard': 's2 h4 c0 o1 k10 d1 p6 f2',
  'Johnny Cash': 's0 h4 c0 o1 k6 f1|1980:s0 h4 c6 o1 k6 f1',
  'Ray Charles': 's3 h3 c0 o1 k6 g2 f2|1980:s3 h3 c6 o1 k6 g2 f2',
  'Celia Cruz': 'F s3 h17 c8 o2 k1 f2',
  'Tom Jobim': 's0 h18 c1 o1 k5|1980:s0 h2 c6 o1 k5 t7 a5',
  // anos 60
  'John Lennon': 's0 h5 c1 o1 k6|1966:s0 h5 c1 o1 k6 g1|1968:s0 h7 c1 o1 k5 g1 d0|1971:s0 h7 c1 o0 k6 g1|1975:s0 h2 c1 o0 k6 g1',
  'Paul McCartney': 's0 h5 c1 o1 k6 f2|1969:s0 h2 c1 o1 k6 d0|1972:s0 h16 c1 o0 k6 f2|1980:s0 h2 c1 o1 k0 f2|2005:s0 h2 c2 o1 k6 f2',
  'George Harrison': 's0 h5 c0 o1 k6|1967:s0 h7 c0 o2 k3 d1|1969:s0 h7 c0 o0 k2 d0|1980:s0 h7 c0 d1|1987:s0 h1 c0 d3 o1 k6',
  'Ringo Starr': 's0 h5 c1 o1 k6 d3|1967:s0 h5 c1 o2 k1 d1|1969:s0 h7 c1 o1 k6 d0|1975:s0 h1 c1 d0 g2|1990:s0 h1 c1 d2 g2 o0 k6',
  'Mick Jagger': 's0 h5 c2 o1 k6 y0 f2|1966:s0 h7 c2 o0 k1 y0|1970:s0 h7 c2 o2 k5 y0 p6|1980:s0 h16 c2 o0 k1 y0|2000:s0 h16 c1 o1 k6 y0',
  'Keith Richards': 's0 h5 c0 o1 k6 y0|1967:s0 h14 c0 o0 k6 y0|1975:s0 h14 c0 o0 k4 y0 t5 a1|1995:s0 h14 c6 o0 k6 y0 t5 a1',
  'Brian Jones': 's0 h5 c4 o2 k4',
  'Charlie Watts': 's0 h1 c1 o1 k6 y0|1990:s0 h1 c6 o1 k6 y0',
  'Bob Dylan': 's0 h12 c1 o0 k0 y0|1965:s0 h12 c1 o2 k6 y0 g2|1975:s0 h12 c1 o0 k6 y0 t7 a5|1997:s0 h12 c2 o1 k6 d1 y0',
  'Jimi Hendrix': 's3 h6 c0 o2 k4 d1 t5 a1 y0',
  'Janis Joplin': 'F s0 h8 c2 o2 k4 g1 f2',
  'Jim Morrison': 's0 h12 c2 o0 k11 f1|1970:s0 h8 c2 o0 k6 d0',
  'Aretha Franklin': 'F s3 h17 c0 o2 k3 y2 f2|1990:s3 h8 c0 o2 k9 y2 f2',
  'James Brown': 's3 h4 c0 o1 k1 f1|1980:s3 h18 c0 o1 k6 f1',
  'Marvin Gaye': 's3 h3 c0 o1 k6 d3|1971:s3 h3 c0 o3 k1 d0 t4 a1',
  'Stevie Wonder': 's3 h12 c0 o1 k6 g2|1972:s3 h15 c0 o2 k3 g2|1990:s3 h15 c0 o2 k3 g2 d2',
  'Diana Ross': 'F s3 h17 c0 o2 k10 f2|1975:s3 h6 c0 o2 k9 f2',
  'Elis Regina': 'F s0 h13 c0 o2 k5 f2|1972:s0 h22 c0 o2 k2 f2|1979:s0 h22 c0 o2 k5 f2',
  'Roberto Carlos': 's0 h5 c1 o0 k0|1970:s0 h7 c1 o1 k12|1980:s0 h8 c1 o1 k0|2000:s0 h8 c2 o1 k12',
  'Rita Lee': 'F s0 h19 c5 o2 k9|1975:s0 h19 c9 o2 k6|1990:s0 h19 c9 o2 k4 g2|2010:s0 h19 c9 o2 k4 g1|2019:s0 h22 c6 o2 k4 g1',
  'Arnaldo Baptista': 's0 h7 c4 o0 k3',
  'Caetano Veloso': 's1 h20 c0 o0 k5 y0|1972:s1 h20 c0 o2 k1 y0|1985:s1 h2 c0 o1 k5 y0|2010:s1 h1 c6 o0 k6 y0',
  'Gilberto Gil': 's3 h6 c0 d1 o0 k3|1975:s3 h6 c0 d0 o2 k3|1985:s3 h15 c0 d0 o2 k2|2003:s3 h15 c6 d0 o1 k5|2012:s3 h3 c6 d0 o1 k5',
  'Jorge Ben Jor': 's3 h6 c0 d1 o0 k1|1990:s3 h3 c0 d2 o0 k3',
  'Chico Buarque': 's0 h2 c1 o1 k12 f2|1990:s0 h2 c6 o0 k5 f2',
  'Gal Costa': 'F s1 h20 c0 o2 k3 f2|1985:s1 h8 c0 o2 k1 f2',
  'Maria Bethânia': 'F s1 h8 c0 o2 k5|2000:s1 h20 c6 o2 k5',
  'The Edge': 's0 h1 c1 o0 k6 y0|1990:s0 h1 c1 t4 a6 o0 k6 y0 d3',
  // anos 70
  'Tim Maia': 's3 h6 c0 d1 y2 o0 k5|1975:s3 h6 c0 d0 y2 o2 k5|1985:s3 h1 c0 d0 y2 g2 o0 k6',
  'Raul Seixas': 's0 h8 c0 d0 g2 o0 k6',
  'Ney Matogrosso': 's1 h7 c0 p7 o2 k8 y0|1977:s1 h7 c0 p6 o2 k8 y0|1990:s1 h1 c0 o1 k6 y0',
  'João Ricardo': 's0 h7 c1 p7 d0 o2 k6',
  'Gérson Conrad': 's0 h7 c0 p7 o2 k6',
  'Bob Marley': 's2 h12 c0 o0 k6 y0|1972:s2 h15 c0 d2 o0 k2 y0|1977:s2 h15 c0 d0 o3 k3 y0',
  'Peter Tosh': 's3 h15 c0 d0 o0 k6 g2',
  'Bunny Wailer': 's3 h15 c0 d0 o0 k2 t4 a2',
  'David Bowie': 's0 h7 c4 o0 k3 y0|1972:s0 h16 c9 o2 k12 y0 p6|1973:s0 h16 c9 o2 k12 y0 p5|1975:s0 h18 c4 o1 k5 y0|1977:s0 h2 c2 o1 k0 y0|1983:s0 h4 c4 o1 k3 y0|1995:s0 h14 c5 d2 o2 k6 y0|2002:s0 h2 c2 o1 k6 y0',
  'Freddie Mercury': 's1 h7 c0 o0 k6 p6 f1 y0|1975:s1 h7 c0 o2 k5 p6 f1 y0|1980:s1 h1 c0 d1 o0 k5 f1|1986:s1 h1 c0 d1 o2 k3 f1|1990:s1 h1 c0 d3 o1 k6 f1',
  'Brian May': 's0 h20 c0 o2 k5|2005:s0 h20 c6 o2 k6',
  'Roger Taylor': 's0 h7 c4 o0 k5|1990:s0 h1 c4 o0 k6 g2',
  'John Deacon': 's0 h7 c1 o0 k6|1980:s0 h1 c1 o1 k6',
  'Ozzy Osbourne': 's0 h7 c1 o0 k5|1980:s0 h7 c1 o2 k6|1990:s0 h7 c0 g1 o0 k6|2005:s0 h7 c0 g1 o2 k6',
  'Tony Iommi': 's0 h7 c0 d1 o1 k6|1990:s0 h7 c0 d2 o0 k6',
  'Elton John': 's0 h2 c2 g0 o1 k0|1972:s0 h2 c2 g3 o2 k9|1976:s0 h1 c2 g3 o2 k8 t1 a9|1985:s0 h1 c2 g2 o1 k4 t7 a6|2000:s0 h2 c3 g1 o1 k6|2015:s0 h2 c3 g3 o2 k9',
  'Paul Stanley': 's0 h12 c0 p1 o2 k6|1983:s0 h20 c0 o0 k9|1996:s0 h20 c0 p1 o2 k6',
  'Gene Simmons': 's0 h7 c0 p2 o2 k6 y2|1983:s0 h7 c0 o0 k6 y2|1996:s0 h7 c0 p2 o2 k6 y2',
  'Ace Frehley': 's0 h7 c0 p4 o2 k10|1983:s0 h7 c0 o0 k6|1996:s0 h7 c0 p4 o2 k10',
  'Peter Criss': 's0 h12 c0 p3 o2 k6|1983:s0 h12 c0 o0 k6|1996:s0 h12 c0 p3 o2 k6',
  'Eric Carr': 's0 h12 c0 o2 k6',
  'Angus Young': 's0 h7 c1 o1 k2 t6 a2 y0|2000:s0 h12 c1 o1 k2 t6 a2 y0',
  'Bon Scott': 's0 h12 c3 o0 k12 y0',
  'Brian Johnson': 's0 h12 c0 t6 a6 o0 k6|2005:s0 h12 c6 t6 a6 o0 k6',
  'Robert Plant': 's0 h20 c4 o0 k5 y0|2000:s0 h20 c6 o0 k6 d3 y0',
  'Jimmy Page': 's0 h8 c0 o2 k6 y0|2000:s0 h7 c6 o1 k6',
  'Lemmy': 's0 h7 c0 d1 o0 k6 t6 a6',
  'Roger Daltrey': 's0 h20 c4 o2 k5|1980:s0 h12 c4 o0 k5',
  'Pete Townshend': 's0 h1 c1 o2 k0 f1|1969:s0 h1 c1 o3 k5 f1 d0|1990:s0 h0 d3 g2 o0 k6',
  'Keith Moon': 's0 h5 c1 o0 k5 f2|1975:s0 h5 c1 o0 k6 f2 y2',
  'Johnny Rotten': 's0 h14 c5 o2 k5 f1 y0|1990:s0 h14 c4 o1 k1 y1',
  'Sid Vicious': 's0 h14 c0 o0 k11 y0 f1',
  'Joey Ramone': 's0 h19 c0 g2 o0 k11 y0',
  'Debbie Harry': 'F s0 h7 c8 r0 o2 k9 f1|2000:s0 h13 c8 o2 k6 f1',
  'Bruce Springsteen': 's0 h12 c1 o0 k12 t5 a1|1984:s0 h1 c1 o0 k12 t5 a1 d3|2005:s0 h1 c2 o0 k6 d2',
  'Steven Tyler': 's0 h7 c1 o2 k9 t8 a4 p6|2000:s0 h7 c2 o2 k4 p6 g2',
  'Barry Gibb': 's0 h20 c4 d0 o1 k5 y0|1990:s0 h20 c6 d0 o1 k6 y0',
  'Agnetha Fältskog': 'F s0 h7 c4 o2 k5',
  'Maurice White': 's3 h6 c0 d1 o2 k8',
  'Philip Bailey': 's3 h6 c0 d1 o2 k8',
  'Sly Stone': 's3 h6 c0 d1 o2 k5 g2',
  // anos 80
  'Michael Jackson': 's3 h6 c0 o0 k7 f2 y0|1979:s3 h6 c0 o1 k6 f2 y0|1982:s2 h20 c0 o2 k1 f2 y0|1987:s1 h20 c0 o2 k6 f2 y0|1991:s0 h7 c0 o1 k6 t7 a6 y0|1996:s0 h7 c0 o2 k1 y0|2001:s0 h7 c0 o2 k6 g2 y0',
  'Madonna': 'F s0 h8 c4 t5 a6 o0 k6 f2|1985:s0 h12 c4 o2 k6 f2|1989:s0 h13 c1 o2 k6|1990:s0 h9 c8 o2 k9|1992:s0 h7 c8 o2 k6|1998:s0 h8 c1 o2 k6|2000:s0 h8 c4 t2 a11 o0 k6|2005:s0 h8 c4 o2 k9|2015:s0 h7 c8 o2 k6',
  'Prince': 's2 h20 c0 d1 o0 k6 y0 f1|1984:s2 h20 c0 d1 o2 k4 y0 f1|1988:s2 h12 c0 d1 o2 k6 y0|1993:s2 h12 c0 d3 o2 k8 g2 y0|2000:s2 h6 c0 d1 o1 k4 y0',
  'Whitney Houston': 'F s3 h12 c1 o2 k5 f2|1992:s3 h13 c1 o1 k6 f2|2000:s3 h7 c1 o2 k8',
  'Bono': 's0 h16 c1 o0 k6|1992:s0 h18 c0 g2 o0 k11|2000:s0 h1 c1 g2 o0 k6 d3',
  'Adam Clayton': 's0 h14 c8 o0 k6|2000:s0 h1 c6 o1 k6',
  'Larry Mullen Jr.': 's0 h4 c4 o0 k6',
  'Axl Rose': 's0 h7 c3 t5 a1 o2 k6 y0|1991:s0 h7 c3 t5 a6 o0 k5 y0|2016:s0 h7 c3 g2 t6 a6 o0 k6 y1',
  'Slash': 's1 h20 c0 t1 a6 o0 k6 y0|2005:s1 h20 c0 t1 a6 g2 o0 k6 y0',
  'Duff McKagan': 's0 h14 c8 o0 k6 y0',
  'Izzy Stradlin': 's0 h7 c0 o0 k6 y0',
  'Robert Smith': 's0 h14 c0 o0 k6 p6 y1',
  'Boy George': 's0 h15 c0 t7 a6 o2 k5 p6 f2',
  'Morrissey': 's0 h4 c1 o0 k5 f1|2000:s0 h4 c6 o1 k6 f1',
  'Annie Lennox': 'F s0 h3 c5 o1 k6 f1',
  'Cyndi Lauper': 'F s0 h22 c10 r9 o2 k7 f2',
  'George Michael': 's0 h17 c4 o0 k11 d3 g2|1990:s0 h1 c1 o0 k11 d2 g2',
  'Jon Bon Jovi': 's0 h16 c4 o0 k11 f2|1995:s0 h2 c2 o0 k6 f2',
  'Bruce Dickinson': 's0 h7 c1 o0 k6',
  'Steve Harris': 's0 h7 c1 o0 k5 d3',
  'James Hetfield': 's0 h7 c4 o0 k6|1996:s0 h1 c4 d2 o0 k6',
  'Renato Russo': 's0 h1 c1 g1 o0 k5 y0',
  'Cazuza': 's0 h20 c1 o0 k5 t5 a1 y0|1988:s0 h1 c1 o0 k5 t5 a6 y0',
  'Roberto Frejat': 's0 h20 c0 o0 k6',
  'Arnaldo Antunes': 's0 h3 c0 o0 k6 y0 f1',
  'Max Cavalera': 's1 h15 c0 d0 o0 k6 y2',
  'Igor Cavalera': 's1 h7 c0 o0 k6|2000:s1 h11 c0 o0 k6',
  'Andreas Kisser': 's0 h7 c1 o0 k6 d3',
  'Gloria Estefan': 'F s0 h20 c2 o2 k1 f2',
  'Celine Dion': 'F s0 h8 c1 o2 k6|2000:s0 h13 c1 o2 k5',
  'Mariah Carey': 'F s1 h20 c2 o2 k6|1997:s1 h7 c4 o2 k5|2005:s1 h8 c4 o2 k8',
  'Cher': 'F s1 h7 c0 o2 k6|1987:s1 h20 c0 o2 k6|1998:s1 h7 c9 o2 k10',
  'Tina Turner': 'F s2 h8 c1 o2 k6|1984:s2 h17 c4 o2 k6',
  'Dolly Parton': 'F s0 h17 c8 o2 k9 f2|1990:s0 h17 c8 o2 k5 f2',
  // anos 90
  'Kurt Cobain': 's0 h8 c4 d3 o3 k2 y0|1993:s0 h8 c4 d3 o3 k2 g2 y0',
  'Krist Novoselic': 's0 h7 c1 o0 k6|1993:s0 h1 c1 d0 o0 k6',
  'Dave Grohl': 's0 h7 c1 o0 k6|2000:s0 h7 c1 d0 o0 k6',
  'Eddie Vedder': 's0 h12 c2 o3 k2|2000:s0 h1 c2 d3 o0 k6',
  'Anthony Kiedis': 's0 h7 c1 o0 k6 y0|1999:s0 h1 c1 o0 k6 y0|2010:s0 h7 c1 d1 o0 k6 y0',
  'Flea': 's0 h14 c11 o0 k6 y0 f2',
  'John Frusciante': 's0 h7 c1 o0 k6 y0',
  'Liam Gallagher': 's0 h5 c1 o2 k0 g1 f1',
  'Noel Gallagher': 's0 h5 c1 o0 k6 f1',
  'Thom Yorke': 's0 h7 c4 o0 k6|2005:s0 h9 c2 d3 o0 k6',
  'Billie Joe Armstrong': 's0 h14 c12 o0 k6 y0 p6|2004:s0 h14 c0 o1 k1 y0 p6',
  'Gwen Stefani': 'F s0 h18 c8 o2 k1 f2',
  '2Pac': 's3 h0 t8 a0 d2 o0 k5 y0|1996:s3 h0 d2 o1 k6 y0',
  'The Notorious B.I.G.': 's3 h3 c0 d3 o3 k1 t6 a6 g2 y2',
  'Snoop Dogg': 's3 h21 c0 o0 k12 y0|2000:s3 h15 c0 d1 o0 k12 y0|2010:s3 h15 c0 d2 o2 k8 y0',
  'Dr. Dre': 's3 h20 c0 d1 o0 k6|1996:s3 h3 c0 d2 o0 k6',
  'Ice Cube': 's3 h20 c0 o0 k6 f1|1995:s3 h3 c0 d2 o0 k6 f1',
  'Lauryn Hill': 'F s3 h15 c0 o2 k3',
  'Wyclef Jean': 's3 h3 c0 d2 o0 k6',
  'Missy Elliott': 'F s3 h3 c0 o3 k6 y2',
  'Jay-Z': 's3 h3 c0 o0 k5|2003:s3 h3 c0 d3 t6 a6 o0 k5|2010:s3 h3 c0 d0 o1 k6',
  'Eminem': 's0 h3 c8 o0 k5 f1 y0|2002:s0 h3 c1 o3 k6 f1 y0|2009:s0 h3 c1 d3 o3 k6 f1 y1',
  'Björk': 'F s0 h10 c0 o2 k5|2001:s0 h7 c0 o2 k5',
  'Sade': 'F s2 h18 c0 o2 k6',
  'Ricky Martin': 's0 h12 c1 o0 k1 f2|2005:s0 h3 c1 d3 o1 k6',
  'Jennifer Lopez': 'F s1 h18 c2 o2 k5 f2|2005:s1 h7 c4 o2 k8',
  'Britney Spears': 'F s0 h9 c4 o2 k5 f2|2001:s0 h8 c4 o2 k8 f2',
  'Thomas Bangalter': 's0 h1 c1 o0 k6|1996:s0 h1 c1 m1 o0 k6|2013:s0 h1 c1 m1 o1 k6',
  'Guy-Manuel de Homem-Christo': 's0 h1 c1 o0 k6 d3|1996:s0 h1 c1 m2 o0 k6|2013:s0 h1 c1 m2 o1 k6',
  'Marisa Monte': 'F s0 h7 c0 o2 k5',
  'Ivete Sangalo': 'F s1 h7 c4 o2 k3 f2',
  'Carlinhos Brown': 's3 h15 c0 t8 a1 d2 o2 k3',
  'Dinho': 's0 h1 c0 o2 k3 f2',
  // anos 2000+
  'Beyoncé': 'F s2 h8 c4 o2 k8|2013:s2 h8 c4 o2 k6|2016:s2 h15 c4 o2 k3|2024:s2 h7 c8 t2 a5 o2 k5',
  'Kelly Rowland': 'F s3 h7 c0 o2 k6',
  'Amy Winehouse': 'F s0 h7 c0 o2 k6 p6 y0|2006:s0 h17 c0 o2 k6 p6 y0',
  'Adele': 'F s0 h8 c2 o2 k6|2011:s0 h17 c4 o2 k6 p6',
  'Lady Gaga': 'F s0 h13 c8 g2 o2 k10|2010:s0 h10 c8 o2 k10 p5|2011:s0 h7 c8 o2 k6|2016:s0 h7 c4 t7 a9 o2 k9|2018:s0 h7 c4 o2 k6|2020:s0 h7 c10 o2 k9',
  'Rihanna': 'F s2 h7 c0 o2 k6|2007:s2 h22 c0 o2 k6|2010:s2 h12 c9 o2 k5|2012:s2 h7 c0 o2 k6|2016:s2 h15 c0 o2 k11|2020:s2 h7 c0 o2 k6',
  'Taylor Swift': 'F s0 h20 c4 o2 k12 f2|2008:s0 h20 c4 o2 k5 f2|2012:s0 h19 c4 o2 k1 f2|2014:s0 h13 c8 o2 k5 f2|2017:s0 h13 c8 o2 k6 f2|2019:s0 h19 c4 o2 k9 f2|2020:s0 h10 c4 o3 k5 f2|2023:s0 h19 c4 o2 k10 f2',
  'Ed Sheeran': 's0 h14 c5 o3 k6 f2|2017:s0 h1 c5 d3 o0 k6 f2|2021:s0 h1 c5 d0 o0 k6 f2',
  'Billie Eilish': 'F s0 h7 c12 o3 k12 y0|2019:s0 h7 c0 r11 o3 k2 y0|2021:s0 h17 c8 o2 k6 y0|2022:s0 h7 c0 o3 k6 y0',
  'Drake': 's1 h3 c0 d3 o3 k6|2012:s1 h3 c0 d0 o0 k6',
  'Kanye West': 's3 h3 c0 o1 k9|2008:s3 h3 c0 o1 k6 g2|2013:s3 h3 c0 d3 o0 k6|2016:s3 h3 c8 o0 k6|2021:s3 h0 o0 k6',
  'Kendrick Lamar': 's3 h15 c0 d2 o0 k6 y0|2022:s3 h15 c0 d0 o0 k6 y0',
  'Bruno Mars': 's1 h4 c0 t7 a6 o0 k8 d1 y0|2016:s1 h12 c0 d1 o0 k8 g2 y0',
  'The Weeknd': 's3 h14 c0 d3 o0 k6 y0|2016:s3 h3 c0 d3 o0 k6 y0|2020:s3 h3 c0 d1 o1 k1 y0',
  'Ariana Grande': 'F s0 h9 c9 o2 k9 y0|2014:s0 h9 c2 o2 k6 y0|2024:s0 h9 c8 o2 k9 y0',
  'Justin Bieber': 's0 h2 c2 o3 k4 f2 y0|2012:s0 h4 c2 o0 k6 f2 y0|2016:s0 h3 c8 o0 k6 y0|2020:s0 h3 c2 d3 t4 a9 o3 k9 y0',
  'Nicki Minaj': 'F s2 h19 c10 o2 k9|2014:s2 h7 c0 o2 k6|2018:s2 h7 c9 o2 k9',
  'Dua Lipa': 'F s0 h7 c0 o2 k6|2024:s0 h7 c9 o2 k6',
  'Harry Styles': 's0 h12 c1 o0 k6 f2 y0|2016:s0 h7 c1 o1 k6 y0|2017:s0 h2 c1 o1 k9 f2 y0|2020:s0 h12 c1 o2 k1 f2 y0',
  'Niall Horan': 's0 h4 c4 o0 k12 f2',
  'Zayn Malik': 's1 h4 c0 o0 k6 d3|2016:s1 h3 c9 o0 k6 d0',
  'Louis Tomlinson': 's0 h2 c1 o0 k6',
  'Liam Payne': 's0 h2 c1 o0 k6 d3',
  'Olivia Rodrigo': 'F s0 h7 c0 o2 k4 y0',
  'Doja Cat': 'F s2 h12 c0 o2 k9|2023:s2 h0 o2 k1 p6',
  'Post Malone': 's0 h15 c1 d0 o0 k6|2021:s0 h3 c1 d0 o0 k6',
  'Travis Scott': 's3 h15 c0 d1 o0 k11',
  'Frank Ocean': 's3 h3 c0 o0 k5|2016:s3 h3 c11 o0 k5',
  'Lana Del Rey': 'F s0 h17 c3 o2 k5 p6',
  'Anitta': 'F s1 h7 c0 o2 k9 f2|2017:s1 h7 c4 r1 o2 k8 f2|2021:s1 h7 c0 o2 k6 f2',
  'Ludmilla': 'F s3 h21 c0 o2 k6|2018:s3 h7 c4 r0 o2 k8',
  'Pabllo Vittar': 's1 h7 c10 o2 k9 p6 y0',
  'Marília Mendonça': 'F s0 h7 c1 o2 k9 y2|2019:s0 h7 c4 r1 o2 k6 y1',
  'Shakira': 'F s0 h7 c0 o2 k6|1998:s0 h15 c3 o2 k6|2001:s0 h20 c4 o2 k8|2010:s0 h20 c4 r2 o2 k6',
  'Bad Bunny': 's1 h12 c0 o0 k9 g2 d3|2020:s1 h3 c0 d3 o0 k5|2024:s1 h3 c0 d3 o0 k6 t6 a6',
  'Daddy Yankee': 's1 h3 c0 d2 t6 a6 o0 k5 g2',
  'J Balvin': 's1 h3 c11 d3 o0 k3|2020:s1 h3 c10 d3 o0 k9',
  'Karol G': 'F s1 h7 c12 o2 k12|2023:s1 h7 c9 o2 k1',
  'Rosalía': 'F s0 h18 c0 o2 k1 p6',
  'Cardi B': 'F s2 h7 c9 o2 k9',
  'SZA': 'F s3 h20 c3 o2 k3',
  'Sabrina Carpenter': 'F s0 h19 c8 o2 k9 f2',
  'Chappell Roan': 'F s0 h20 c9 o2 k9 p6',
  'Lil Nas X': 's3 h3 c0 t2 a6 o2 k9 y0|2021:s3 h3 c0 o2 k9 y0',
  'Psy': 's0 h18 c0 o1 k12 g2 y2',
  'RM': 's0 h2 c4 o0 k6',
  'Jin': 's0 h2 c1 o1 k9 f2',
  'Suga': 's0 h2 c11 o0 k6 f1',
  'J-Hope': 's0 h12 c3 o0 k3 f2',
  'Jungkook': 's0 h19 c0 o0 k6|2023:s0 h2 c0 o0 k6',
  'Jennie': 'F s0 h7 c0 o2 k6',
  'Lisa': 'F s0 h19 c8 o2 k9',
  'Jisoo': 'F s0 h7 c0 o2 k5',
  'Rosé': 'F s0 h7 c4 o2 k6',
  'Stromae': 's2 h18 c0 o1 k3 y0',
  'Fela Kuti': 's3 h6 c0 d1 o0 k3 y0',
  'Burna Boy': 's3 h15 c0 d0 o0 k6',
  'Chris Martin': 's0 h1 c4 d3 o0 k6',
  'Damon Albarn': 's0 h5 c4 o0 k6|2005:s0 h1 c1 d3 o0 k6',
  'André 3000': 's3 h15 c0 d1 o1 k12|2003:s3 h3 c0 t7 a5 o1 k12 d1',
  'Big Boi': 's3 h15 c0 d2 o0 k6',
  'will.i.am': 's3 h3 c0 g2 o0 k6 d3',
  'Fergie': 'F s0 h7 c4 o2 k6',
  'Seu Jorge': 's3 h3 c0 d0 o0 k5',
};
for (const [k, v] of Object.entries(LOOKS17)) L[k] ??= v; // rodada 17: mais visuais reais (não sobrescreve)
L['Beyoncé Knowles'] = L['Beyoncé'];

export interface RealLookSeg { from: number; look: Appearance }

const DEF: Appearance = { body: 1, face: 0, skin: 0, hair: 1, hairColor: 0, outfit: 0, outfitColor: 6, glasses: false, hat: false, beard: false };

/** Interpreta um trecho de tokens ("s3 h6 c0 …"). */
export function parseLook15(code: string): Appearance {
  const a: Appearance = { ...DEF };
  for (const tk of code.trim().split(/\s+/)) {
    if (tk === 'F') { a.sx = 'f'; continue; }
    const k = tk[0];
    const v = Number(tk.slice(1)) || 0;
    if (k === 's') a.skin = v; else if (k === 'h') a.hair = v; else if (k === 'c') a.hairColor = v; else if (k === 'r') a.roots = v;
    else if (k === 'o') a.outfit = v; else if (k === 'k') a.outfitColor = v; else if (k === 'y') a.body = v; else if (k === 'f') a.face = v;
    else if (k === 'g') { a.glasses = true; if (v) a.glT = v; }
    else if (k === 't') { a.hat = true; a.hatT = v || undefined; }
    else if (k === 'a') a.hatC = v;
    else if (k === 'd') { a.beard = true; if (v) a.bdT = v; }
    else if (k === 'p') a.paint = v;
    else if (k === 'm') a.helm = v;
  }
  if (!a.sx) a.sx = 'm';
  return a;
}

const SEGS = new Map<string, RealLookSeg[]>();
function segs(name: string): RealLookSeg[] | null {
  const code = L[name];
  if (!code) return null;
  let s = SEGS.get(name);
  if (!s) {
    s = code.split('|').map((part, i) => {
      const m = /^(\d{4}):(.*)$/.exec(part);
      return { from: m ? +m[1] : i ? 0 : -Infinity, look: parseLook15(m ? m[2] : part) };
    });
    if (/(^|\s)F(\s|$)/.test(code)) for (const x of s) x.look.sx = 'f'; // F vale para todas as fases
    SEGS.set(name, s);
  }
  return s;
}

/** Visual real (com a fase do ano) ou null se o nome não está na tabela. */
export function realLook15(name: string, year: number): Appearance | null {
  const ss = segs(name);
  if (!ss) return null;
  let seg = ss[0];
  for (const x of ss) if (x.from <= year) seg = x;
  return { ...seg.look, rl: `${name}@${seg.from === -Infinity ? 0 : seg.from}` };
}

export const REAL_LOOK_NAMES = (): string[] => Object.keys(L);
