# Lote 18: pedidos de peças e incoerências entre lotes

## Peças que faltam (usei a mais próxima)

| peça | quem | o que usei |
|---|---|---|
| Chapéu de couro de vaqueiro nordestino (meia-lua, aba virada na frente, estrelas) | Luiz Gonzaga | `cowboy` marrom com `trim` |
| Sitar | Ravi Shankar | `bouzouki` (braço longo) |
| Guitarra Explorer / Flying V | James Hetfield, The Edge | Strat padrão |
| Guitarra "Cloud" | Prince | Strat branca |
| Faixas de corrida na Fender Mustang (as `stripes` atuais fazem um X à la Van Halen) | Kurt Cobain | Mustang azul lisa |
| Óculos em formato de estrela e baixo em estrela (Space Bass) | Bootsy Collins | `round_tint` rosa e baixo cromado padrão |
| Relógio gigante pendurado no pescoço | Flavor Flav | `chain` + `chain_big` dourado |
| Corrente com cadeado | Sid Vicious | `chain` prateada |
| Cabelo com lateral raspada (undercut assimétrico) | Skrillex | `long` preto |
| Maria-chiquinha (pigtails) | Emma Bunton | `ponytail` |
| Estampa de oncinha | Melanie Brown | `jumpsuit` com `polka` marrom |
| Xadrez tartan na calça (`bottom.pattern`) | Johnny Rotten | paletó `checks` vermelho e calça vermelha lisa |
| Óculos redondos brancos de aro grosso | Flavor Flav | `dark` com `glasses_color` branco |

## Incoerências de banda com outros lotes (não editei)

- **Roger Taylor (lote_04)**: `people.json` funde o baterista do Queen com o do Duran Duran (`acts: ["Queen", "Duran Duran"]`, nascido em 1949, que é o do Queen). A ficha atual é do Duran Duran (1984). Para o Queen deste lote (Magic Tour, 1986), o certo seria o Roger Taylor do Queen: loiro, baterista.
- **Mick Jones (lote_05)**: o mesmo problema. `acts: ["The Clash", "Foreigner"]`, nascido em 1955 (o do Clash), mas a ficha descreve o do Foreigner. O Clash deste lote está em 1980 ("London Calling").
- **Rolling Stones**: alinhei Wyman, Watts, Keith e Ronnie Wood a Steel Wheels (1989), a fase do Mick Jagger do lote_09. Brian Jones (morto em 1969) ficou em 1967 e Mick Taylor (na banda de 1969 a 1974) em 1972. Se a banda for para os anos 60 ou 70, o Jagger precisa mudar.
- **Queen**: Brian May e John Deacon estão em 1986 (Magic Tour), alinhados ao Freddie da ficha feita à mão.
- **Beatles**: Lennon (1972), McCartney (1976), Harrison (1971) e Ringo (1974) estão todos em fase solo. Pete Best e Stuart Sutcliffe só cabem em 1962 (Hamburgo e Cavern, de jaqueta de couro), então não há Beatles na mesma fase.
- **Nirvana**: Dave Grohl (lote_05) está em 1999, no Foo Fighters. Kurt e Krist estão em 1992 e Chad Channing em 1989.
- **Oasis**: Liam (2017) e Noel (2015) estão em fase solo. Bonehead, Guigsy e Alan White estão em 1996 (Knebworth) e McCarroll em 1994.
- **Radiohead**: Thom (2010) e Jonny (2022) estão fora da fase. Colin, Ed e Phil estão em 1997 ("OK Computer").
- **The Smiths**: Morrissey está em 1992 (solo). Marr, Rourke, Joyce e Gannon estão em 1986.
- **Supremes**: Diana Ross está em 1980 (solo). Mary e Florence estão em 1965, Cindy em 1968 e Jean Terrell em 1971 (o ano é limitado pela entrada de cada uma).
- **Velvet Underground**: Lou Reed e John Cale estão em 1974 (solo). Moe Tucker e Sterling Morrison estão em 1966 e Doug Yule em 1970.
- **Pink Floyd**: Gilmour (1980), Waters (1987, solo) e Syd (1970). Mason e Wright estão em 1972 (Pompeia).
- **Soda Stereo**: Cerati está em 1999 (solo). Zeta e Charly estão em 1987.
- **Spice Girls**: Geri está em 2001 (solo). As outras quatro estão em 1997.
- **Os Mutantes**: Rita Lee está em 1975 (Tutti Frutti, ficha feita à mão). Arnaldo e Sérgio estão em 1969.
- **Yellow Magic Orchestra** e **Hot Club de France**: coerentes (Takahashi em 1980 com o uniforme vermelho; Louis Vola em 1938, de terno).

## Observações

- Copiei as fichas feitas à mão de Jimi Hendrix (1969), Roberto Carlos (1972) e Tim Maia (1975) como estão, com o `_meta` do rascunho. Os anos do rascunho (1963 e 1972) foram trocados pelos das fichas.
- James Hetfield e Kurt Cobain têm papel `vocal`, mas dei guitarra aos dois (Kurt canhoto), porque é assim que são reconhecidos.
