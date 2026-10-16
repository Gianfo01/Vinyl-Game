# Plano 30 — Artistas faltantes e relíquias reais

Levantamento somente leitura (nenhum arquivo do repo foi alterado).

**Método.** A base de artistas foi exportada em tempo de execução de `REAL_ALL` (`src/sim/sys/realworld.ts`), que junta `realacts_*`, `more14`, `more17`, `lineups16`, `era1889`, `more19`, `acervo21`, `audit27_artists` e `new27c1`: 3.415 atos. A esses entram os 100 atos do catálogo (`src/data/realnames.ts`, que inclui Anitta, Carmen Miranda, Luiz Gonzaga, Chitãozinho & Xororó…). A comparação ignora acentos e caixa e casa por substring; nomes curtos foram conferidos por prefixo exato.
Os ids de gênero e de cidade abaixo existem em `src/data/world.ts` (`GENRES` / `CITIES`).

---

## A1. Lista pedida: o que já existe e o que falta

| Nome | Na base? | Onde / como está | Sugestão se faltar (gênero · cidade · estreia · integrantes) |
|---|---|---|---|
| Xuxa | **SIM** | `realacts_world.ts` (teen_pop, rio, 1986) | — |
| Eliana | não | — | teen_pop · sao_paulo · ~1991 (verificar o 1º LP; antes cantou no grupo Banana Split, verificar) |
| Angélica | não | — | teen_pop · rio · 1988 (LP "Angélica", com "Vou de Táxi") |
| Mara Maravilha | não | — | teen_pop · sao_paulo · ~1987 (Show Maravilha/SBT; depois gospel) (verificar) |
| Simony | não (só como ex-integrante, mas o Balão Mágico também falta) | — | teen_pop · sao_paulo · solo ~1987 (verificar) |
| Turma do Balão Mágico | não | — | teen_pop · sao_paulo · 1982 · Simony (v, 1976), Tob (v), Mike Biggs (v, 1975), Jairzinho (v, entra 1984) |
| Trem da Alegria | não | — | teen_pop · rio (verificar a cidade) · 1985 · Patrícia Marx, Juninho Bill, Luciano Nassyn, Amanda Acosta (depois Rubinho) |
| Paquitas | não | — | teen_pop · rio · 1989 (LP pela Som Livre) · formação de gravação: verificar |
| Sandy & Junior | **SIM** | `realacts_world.ts` (campinas, 1991) | — |
| Mamonas Assassinas | **SIM** | `realacts_world.ts` (rock_br, 1995) | — |
| É o Tchan | **SIM** | `realacts_world.ts` (axe, 1995) | — |
| Molejo | **SIM** | (pagode, rio, 1993; formação em `research27.ts`) | — |
| Só Pra Contrariar | **SIM** | `more14/latam.ts` (bh, 1993) | — |
| Raça Negra | **SIM** | `realacts_world.ts` (sao_paulo, 1991) | — |
| Netinho | não | — | axe · salvador · solo ~1994–96 (ex-Banda Beijo; "Milla", 1996) (verificar a estreia) |
| Rouge | **SIM** | `audit27_artists.ts` (girl_group, 2002) | — |
| KLB | não | — | boy_band · sao_paulo · 2000 · Kiko, Leandro e Bruno Scornavacca |
| Br'oz | não | — | boy_band · sao_paulo · 2003 (Popstars/SBT) · integrantes: verificar |
| Chiquititas | não | — | teen_pop · sao_paulo · 1997 (elenco SBT; versão original em buenos_aires, 1995) |
| Gugu Liberato | não | — | não recomendo como ato (pouca discografia); melhor como apresentador/NPC de TV que **criou o Dominó** |
| Sérgio Mallandro | não | — | teen_pop · rio · ~1986 ("Glu-Glu") (verificar) |
| Patati Patatá | não | — | teen_pop · sao_paulo · anos 1990/2000 (verificar) |
| Galinha Pintadinha | não | — | infantil (o jogo não tem gênero infantil: usar teen_pop) · sao_paulo · 2006 · Juliano Prado e Marcos Luporini |
| Palavra Cantada | não | — | mpb (infantil) · sao_paulo · 1994 · Sandra Peres e Paulo Tatit |
| Bia Bedran | não | — | mpb (infantil) · rio (Niterói) · anos 1980 (verificar) |
| Dominó | não (só aparece num álbum do Costa Gold) | — | boy_band · sao_paulo · 1984 · Afonso Nigro, Nill, Marcos Quintela, Marcelo Rodrigues (verificar) |
| Polegar | não (só aparece num item de equipamento) | — | boy_band · sao_paulo · 1988 · Rafael Ilha, Alex Gill, Ricardo Costa, Ângelo Dimitri (verificar) |
| Menudo | **SIM** | `lineups16.ts` (teen_pop, san_juan, 1977) | — |
| "Ilariê" | não está em songs22 nem no `al` de Xuxa | — | acrescentar ao `al` da Xuxa: ["Xou da Xuxa 3", 1988] já existe; "Ilariê" (1988) é faixa desse LP |
| Milton Guedes | não | — | pop_rock · rio (nasceu em Brasília) · anos 1990 · saxofonista/cantor (verificar) |
| Chacrinha | não como ato (está em `media19`, `milestones`, `eggs27`) | — | manter como figura de TV/NPC |
| Silvio Santos | não como ato (só em `world4/milestones.ts`) | — | gravou marchinhas nos anos 1960–70 (verificar); melhor como dono de TV/NPC |

**Faltam 24** (fora Chacrinha e Silvio, que já entram como mídia). Lacuna estrutural: **o jogo não tem gênero infantil** (Xuxa, Balão Mágico, Trem da Alegria, Galinha Pintadinha e Palavra Cantada caem em teen_pop ou mpb). Vale criar `infantil` (família pop, nascido ~1970) com `ensureGenre` (world.ts:617).

---

## A2. Propostas novas (nenhuma está na base; todas foram conferidas)

| # | Nome | Gênero | Cidade | Estreia | Integrantes / nota |
|---|---|---|---|---|---|
| 1 | Luiz Caldas | axe | salvador | 1985 | "Fricote" (1985), marco zero do axé |
| 2 | Sarajane | axe | salvador | 1986 | "A Roda" (verificar o ano) |
| 3 | Asa de Águia | axe | salvador | 1987 | Durval Lelys (v/g). Banda de trio elétrico |
| 4 | Mastruz com Leite | baiao | fortaleza | 1990 | Forró eletrônico; criado pelo empresário Emanuel Gurgel |
| 5 | Roberta Miranda | sertanejo | sao_paulo | 1986 | "Majestade, o Sabiá"; a "rainha" do sertanejo |
| 6 | Chrystian & Ralf | sertanejo | goiania | 1982 | Chrystian (v), Ralf (v). Irmãos; Chrystian antes cantava em inglês (verificar a estreia) |
| 7 | Wando | brega | bh | 1973 | "Fogo e Paixão" (1988) |
| 8 | Waldick Soriano | brega | rio | 1960 | "Eu Não Sou Cachorro, Não" (1972); baiano |
| 9 | Evaldo Braga | brega | rio | 1970 | Morreu em 1973; "Sorria, Sorria" |
| 10 | Nelson Ned | bolero | sao_paulo | 1965 | Sucesso enorme na América Latina e nos EUA |
| 11 | Agnaldo Timóteo | jovem_guarda | rio | 1965 | Romântico; depois foi político |
| 12 | Agepê | samba | rio | 1975 | "Deixa Eu Te Amar" (1984), o primeiro disco de samba a passar de 1 milhão (verificar) |
| 13 | Benito di Paula | samba | sao_paulo | 1971 | "Retalhos de Cetim" (1973) |
| 14 | Gretchen | disco | rio | 1979 | "Conga, Conga, Conga" |
| 15 | Ritchie | new_wave | rio | 1983 | "Menina Veneno"; inglês radicado no Brasil (n. 1952) |
| 16 | Angela Ro Ro | mpb | rio | 1979 | Voz rouca, piano |
| 17 | Leo Jaime | rock_br | rio | 1985 | Ex-João Penca; nasceu em Goiânia |
| 18 | Negritude Júnior | pagode | sao_paulo | 1993 | Netinho de Paula (v) (verificar o ano do 1º LP) |
| 19 | Kelly Key | teen_pop | rio | 2001 | "Baba" |
| 20 | Wanessa Camargo | teen_pop | goiania | 2000 | Filha de Zezé Di Camargo |
| 21 | Tati Quebra-Barraco | funk_carioca | rio | 2004 | Cidade de Deus (verificar a estreia) |
| 22 | MC Guimê | funk_ostentacao | sao_paulo | 2011 | Osasco; "Plaque de 100" |
| 23 | Banda Uó | tecnobrega | goiania | 2010 | Mateus Carrilho, Davi Sabbag, Candy Mel |
| 24 | Timbiriche | teen_pop | mexico_city | 1982 | Paulina Rubio, Sasha Sokol, Benny Ibarra, Diego Schoening, Mariana Garza, Alix Bauer; depois Thalía, Erik Rubín |
| 25 | Gloria Trevi | pop_latino | monterrey | 1989 | "Dr. Psiquiatra" |
| 26 | Los Bukis | bolero | guadalajara | 1975 | Marco Antonio Solís (v/g), Joel Solís (g). São de Michoacán; cidade aproximada |
| 27 | Los Ángeles Azules | cumbia | mexico_city | 1983 | Irmãos Mejía Avante (Iztapalapa) |
| 28 | Olga Tañón | merengue | san_juan | 1992 | "Mujer de Fuego" |
| 29 | Leo Dan | pop_latino | buenos_aires | 1962 | Balada da "nueva ola" |
| 30 | Ricardo Arjona | pop_latino | mexico_city | 1985 | Guatemalteco; o jogo não tem a Cidade da Guatemala |
| 31 | Demis Roussos | chanson_pop | paris | 1971 | Ex-Aphrodite's Child; "Forever and Ever" |
| 32 | Vicky Leandros | schlager | hamburg | 1965 | Venceu o Eurovision de 1972 por Luxemburgo |
| 33 | Dschinghis Khan | schlager | munich | 1979 | Ralph Siegel (prod.); Wolfgang e Henriette Heichel, Edina Pop, Leslie Mándoki, Louis Potgieter, Steve Bender |
| 34 | Isabel Pantoja | copla | sevilla | 1974 | Rainha da copla |
| 35 | André Rieu | classical | amsterdam | 1987 | Johann Strauss Orchestra; é de Maastricht |
| 36 | Momoe Yamaguchi | kayokyoku | tokyo | 1973 | Aposentou-se em 1980 no auge |
| 37 | Akina Nakamori | kayokyoku | tokyo | 1982 | Ídolo dos anos 80 |
| 38 | Pink Lady | kayokyoku | tokyo | 1976 | Mie (v), Kei (v) |
| 39 | Dreams Come True | jpop | tokyo | 1989 | Miwa Yoshida (v), Masato Nakamura (b), Takahiro Nishikawa (k, até 2002) |
| 40 | Wonder Girls | kpop | seoul | 2007 | "Tell Me", "Nobody" |
| 41 | Kumar Sanu | bollywood | kolkata | 1989 | Cantor de playback; "Aashiqui" (1990) |
| 42 | Alka Yagnik | bollywood | mumbai | 1980 | Cantora de playback |
| 43 | Barış Manço | anatolian_rock | istanbul | 1962 | Precursor do rock anatólio |
| 44 | Sharon Cuneta | opm | manila | 1978 | "Mr. DJ" |
| 45 | Awilo Longomba | ndombolo | kinshasa | 1995 | Ex-baterista do Viva La Musica |
| 46 | Yemi Alade | afrobeats | lagos | 2014 | "Johnny" |
| 47 | Mafikizolo | kwaito | johannesburg | 1997 | Theo Kgosinkwe, Nhlanhla Nciza, Tebogo Madingoane (morto em 2004) |
| 48 | Sam Mangwana | rumba_congolaise | kinshasa | 1963 | Passou pelo OK Jazz e pelo African Fiesta |

Outros nomes ausentes que encontrei (reserva): Psirico, Araketu, Bell Marques, Saulo, Parangolé, Gera Samba, Companhia do Pagode, Katinguelê, Grupo Raça, Os Travessos, Soweto, Belo, Trio Parada Dura, Rionegro & Solimões, Genival Lacerda, Frank Aguiar, Limão com Mel, Magníficos, Solteirões do Forró, Rosana, Joanna, Zélia Duncan, Biafra, Restart, Valesca Popozuda / Gaiola das Popozudas, MC Livinho, MC Kekel, Lexa, Fat Family, Perla, Lady Zu, Harmony Cats, Painel de Controle, Gang 90, Inimigos do Rei, Marcelo Nova, Paulina Rubio, RBD, Elvis Crespo, Bronco, Los Temerarios, Grupo Firme, Palito Ortega, Rocío Jurado, Nino Bravo, Heino, C.C. Catch, Vengaboys, Richard Clayderman, Glay, Morning Musume, Shinhwa, Pongsit Kampee, Koes Plus, Inul Daratista, Via Vallen, Wael Kfoury, Haifa Wehbe, İbrahim Tatlıses, Tshala Muana, DJ Arafat, Sona Jobarteh, José Chameleone.

---

## B. Relíquias reais

### B1. Onde estão e o que já existe

O catálogo real é `RELICS17` (`src/sim/relics17.ts`, 31 peças), mais `RELICS18` (`src/data/relics18.ts`, 11), `RELICS19` (`src/data/media19b.ts`, 62) e `RELICS_1889` (`src/data/era1889.ts`, 5). Dá cerca de 107 peças únicas. `relics9`, `relics28` e `relics29` são a parte de sistema e procedural (arquétipos), sem catálogo real.
**Hoje não existe sistema de tiers** (Comum/Notável/Rara/Lendária/Mítica). As peças têm só `value` e `kind`. Os tiers abaixo são sugestão.

| Pedido | Já existe? | id / observação |
|---|---|---|
| Stradivarius "Messiah" (1716) | **não** | — |
| Stradivarius "Lady Blunt" (1721) | **não** | — |
| Guarneri "Il Cannone" (Paganini) | **sim** | `paganini_cannone` (media19b) |
| Strat de Hendrix em Woodstock | **sim** | `woodstock_strat` |
| Martin D-18E de Cobain (Unplugged, US$ 6,01 mi em 2020) | **sim** | `unplugged_d18e` |
| "Blackie" de Clapton | **sim** | `clapton_blackie` (US$ 959,5 mil, 2004) |
| Rolls-Royce psicodélico de Lennon | **sim** | `lennon_rolls` (US$ 2,29 mi, 1985, Jim Pattison) |
| Console EMI TG12345 de Abbey Road | **sim, em parte** | `tg12345_desk` está descrita como a mesa de *Dark Side of the Moon* (Bonhams, 2017). Falta dizer que a TG12345 estreou no álbum *Abbey Road* (1969); conferir se é a mesma unidade |
| Luva de Michael Jackson | **sim** | `mj_glove` (Motown 25; Julien's, 2009) |
| Yellow Cloud de Prince | **em parte** | `prince_cloud` é a "Cloud" genérica em Paisley Park; a **Yellow Cloud** não está lá |
| Itens de Elvis | **sim (4)** | `my_happiness`, `elvis_cadillac`, `aloha_eagle`, `elvis_gold_lame` |
| Turbantes de Carmen Miranda | **sim** | `carmen_baiana` (Museu Carmen Miranda, 1976) |
| Sanfona de Luiz Gonzaga | **sim** | `gonzaga_sanfona` (Museu do Gonzagão, Exu) |
| Piano de Tom Jobim | **não** | — |
| Guitarra de Raul Seixas | **não** | — |
| Flauta ou sax de Pixinguinha | **não** | — |

### B2. Relíquias propostas (nenhuma está no catálogo)

| # | Relíquia | Ano | Cadeia de donos (documentada) | Local / situação atual | Recorde em leilão | Tier |
|---|---|---|---|---|---|---|
| 1 | Violino Stradivarius **"Messiah"** (Le Messie) | 1716 | Stradivari → conde Cozio di Salabue → Luigi Tarisio (escondido, daí o apelido) → J.-B. Vuillaume → Alard → família Hill, que doou em 1939 | Ashmolean Museum, Oxford. Quase não foi tocado; vive em vitrine | nunca foi a leilão (considerado "inestimável") | **Mítica** |
| 2 | Violino Stradivarius **"Lady Blunt"** | 1721 | Vuillaume → Lady Anne Blunt (neta de Byron, ~30 anos) → colecionadores → Nippon Music Foundation | Coleção particular desde 2011 | **US$ 15,9 mi (£ 9,8 mi)**, Tarisio, leilão online, jun/2011, em prol das vítimas do tsunami no Japão | **Mítica** |
| 3 | Guarneri del Gesù **"Vieuxtemps"** | 1741 | Henri Vieuxtemps → … → comprador anônimo (2012), que a cedeu em comodato vitalício a Anne Akiko Meyers | Tocado por Anne Akiko Meyers | venda privada de ~US$ 16 mi (2012, verificar) | **Lendária** |
| 4 | Stradivarius **"Joachim-Ma"** | 1714 | Joseph Joachim → … → Si-Hon Ma, que doou ao New England Conservatory | Vendido em 2025 | **US$ 11,25 mi**, Sotheby's NY, fev/2025 (verificar) | **Lendária** |
| 5 | Violoncelo Stradivarius **"Duport"** | 1711 | Jean-Louis Duport → … → Mstislav Rostropovich (1974–2007); diz a lenda que tem a marca da bota de Napoleão | Venda após a morte de Rostropovich (comprador: verificar) | ~US$ 20 mi, privada (verificar) | **Lendária** |
| 6 | Violoncelo Stradivarius **"Davidov"** | 1712 | Karl Davydov → … → Jacqueline du Pré (presente da madrinha, 1964) → comodato a Yo-Yo Ma | Tocado por Yo-Yo Ma (dono atual: verificar) | — | **Lendária** |
| 7 | **Piano Broadwood de Beethoven** | 1817 | Thomas Broadwood → Beethoven (1818) → Spina → Franz Liszt → doado ao Museu Nacional Húngaro (1874) | Museu Nacional Húngaro, Budapeste | — | **Mítica** |
| 8 | **Fortepiano Anton Walter de Mozart** | c. 1782 | Mozart → família → Mozarteum (1856) | Casa natal de Mozart, Salzburgo | — | **Mítica** |
| 9 | Piano Steinway **"Alma-Tadema"** | 1883–87 | Henry Marquand (encomenda, arte de Lawrence Alma-Tadema) → … → Clark Art Institute | Clark Art Institute, Williamstown | US$ 1,2 mi, Christie's, 1997 (recorde de piano na época) | **Rara** |
| 10 | Piano de strass de **Liberace** | anos 1970 | Liberace → Liberace Foundation | Acervo do Liberace Museum (fechado em 2010; peças itinerantes) (verificar) | — | **Rara** |
| 11 | **Yellow Cloud** de Prince | 1989 (verificar) | Prince → espólio/Paisley Park → Smithsonian (NMAAHC, 2016) | Smithsonian, Washington (verificar). Outra Cloud amarela foi vendida a um particular (verificar) | ~US$ 137,5 mil (verificar a casa e o ano) | **Rara** |
| 12 | Martin 000-42 de Clapton (MTV Unplugged) | 1939 | Clapton (Unplugged, 1992) → leilão Crossroads | Coleção particular | US$ 791,5 mil, Christie's, jun/2004 | **Rara** |
| 13 | Gibson J-160E de Lennon do filme **"Help!"** | 1964 | Lennon → Gordon Waller (Peter & Gordon) → particulares | Coleção particular | US$ 2,41 mi, Julien's, nov/2015 | **Lendária** |
| 14 | **"Wolf"**, a guitarra de Jerry Garcia (Doug Irwin) | 1973 | Garcia → Doug Irwin (testamento) → Dan Pritzker (2002) | Brian Halligan (2017); a renda foi para o SPLC | US$ 1,9 mi, Guernsey's, mai/2017 | **Rara** |
| 15 | Letra manuscrita de **"All You Need Is Love"** | 1967 | Lennon → Mal Evans → particular | Coleção particular | US$ 1,25 mi, Sotheby's, 2005 (verificar) | **Rara** |
| 16 | **Fedora do moonwalk** de Michael Jackson | 1983 (verificar se é a do Motown 25) | MJ → fã/particular | Coleção particular | ~€ 77,6 mil, Artcurial Paris, nov/2023 (verificar) | **Notável** |
| 17 | Vestido "Happy Birthday, Mr. President" de **Marilyn Monroe** | 1962 | Marilyn → Lee Strasberg → Christie's (1999) → Martin Zweig → Julien's (2016) → Ripley's | Ripley's Believe It or Not! | US$ 4,8 mi, Julien's, nov/2016 | **Lendária** |
| 18 | **Cadillac Fleetwood rosa** de Elvis | 1955 | Elvis (presente à mãe, Gladys) → Graceland | Graceland, Memphis | — | **Rara** |
| 19 | Jato **"Lisa Marie"** de Elvis (Convair 880) | 1975 | Elvis → … → Graceland (exposto desde 1984) | Graceland, Memphis | — | **Lendária** |
| 20 | Console **EMI REDD.37/REDD.51** dos Beatles (1963–68) | 1958–62 | EMI/Abbey Road → … | Peças em coleções (verificar a unidade) | (verificar) | **Lendária** |
| 21 | Letreiro original dos **Abbey Road Studios** / porta do Estúdio 2 | 1931 | EMI → Abbey Road | No lugar, Londres (verificar se há peça móvel) | — | **Notável** |
| 23 | **Piano de Tom Jobim** (o piano da casa do Jardim Botânico) | anos 1970 (verificar) | Jobim → família → Instituto Antonio Carlos Jobim (verificar) | Rio de Janeiro (verificar) | — | **Lendária** |
| 24 | **Guitarra de Raul Seixas** (a Gibson/Giannini dos shows dos anos 70–80) | anos 1970 (verificar) | Raul → herdeiras (Vivian/Simone Seixas) → exposições (verificar) | Família / exposições itinerantes (verificar) | — | **Rara** |
| 25 | **Sax/flauta de Pixinguinha** | anos 1920–40 | Pixinguinha → família → Instituto Moreira Salles (o arquivo está no IMS; conferir o instrumento) | IMS, Rio (verificar) | — | **Lendária** |
| 26 | **Bandolim de Jacob do Bandolim** | anos 1940–60 | Jacob → família → MIS-RJ (verificar) | Museu da Imagem e do Som, Rio (verificar) | — | **Rara** |
| 27 | **Violão Di Giorgio de João Gilberto** (o de "Chega de Saudade") | 1958 (verificar) | João Gilberto → herdeiros (disputa do espólio, verificar) | Família (verificar) | — | **Lendária** |
| 28 | **Piano de Chiquinha Gonzaga** | fim do séc. XIX (verificar) | Chiquinha → … (verificar) | (verificar) | — | **Notável** |
| 29 | **Chapéu de Chico Science** | 1994–97 | Chico Science → família (verificar) | Recife (verificar) | — | **Notável** |
| 30 | Bateria/pandeiro de **Jackson do Pandeiro** | anos 1950 | Jackson → … (verificar) | (verificar) | — | **Notável** |
| 31 | Microfone Neumann U47 da EMI usado por Lennon/Sinatra (genérico) | 1949+ | Fábrica Neumann → estúdios | Vários | (verificar) | **Comum/Notável** (bom molde para o relics29) |

Tiers propostos (régua): **Mítica** = peça única de museu nacional, nunca à venda (Messiah, Broadwood, Mozart). **Lendária** = recorde mundial ou peça que define uma era (Lady Blunt, Help! J-160E, Lisa Marie, Jobim). **Rara** = leilão de seis a sete dígitos ou peça de museu temático. **Notável** = marca registrada de um artista, valor baixo e documentação incerta. **Comum** = arquétipos genéricos (microfone, cartaz).

Correções sugeridas no que já existe:
- `tg12345_desk`: citar *Abbey Road* (1969) como a estreia da TG12345 no Estúdio 2 (verificar se é a mesma unidade vendida pela Bonhams).
- `prince_cloud`: separar a **Yellow Cloud** (Smithsonian) da Cloud de Paisley Park.
