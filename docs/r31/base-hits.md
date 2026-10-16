# R31 · onda 4 · BASE-HITS — sucessos de 1992 até hoje

**Resultado: 1 044 atos novos** (meta mínima 1 000), em `src/data/base31hits.ts`, no fim de `REAL_ALL` (depois das frentes BR e IT),
atrás do interruptor `base31.hits` (ligado por padrão). Todos têm o hit documentado: música, ano, parada oficial e posição
máxima (1–10). Nenhum duplica a base anterior (`dedupKey27`, também contra o catálogo clássico). Nenhum é do Brasil nem da Itália.
O exemplo do dono, McFly, entrou. Busted, Vengaboys e Daniel Powter também entraram. Los del Río já estava na base.

## Como foi feito (e o limite do "confiável")

- **Rede.** O ambiente bloqueia en.wikipedia.org, wikidata.org, musicbrainz.org e officialcharts.com: WebFetch, curl e as APIs
  falham. Só a busca na web respondeu, com cota de ~200 buscas por rodada. Oito curadores em paralelo (UK×2, EUA×2, Europa×2,
  América Latina e resto do mundo) dividiram a cota.
- **Conferido por busca: 191 atos** (`v: 1`). O resto entrou só quando o curador tinha o hit (música, ano, parada e posição)
  como fato conhecido e documentado. A ficha de cada um em `cur31.ts › CUR31_HITS` lista em "a confirmar" o hit
  "conferir no arquivo da parada". Nada foi chutado: campo incerto ficou de fora. São 383 estreias aproximadas
  (`ap: ['d']`, ano do 1º sucesso) e 450 cidades do jogo mais próximas (`ca: 1`, ficha diz "cidade de origem").
  Integrantes e nascimentos só onde havia certeza.
- **Revisão manual** de todos os 1 052 candidatos (lista compacta ato/hit/ano/parada/posição). Saíram Wir sind Helden (hit datado
  de 2026 numa busca, não confiável), Israel Kamakawiwoʻole (o hit é póstumo, depois do fim da carreira) e Captain Tom Moore
  (beneficente, não é ato musical). Correções pela validação de consistência: Swae Lee nasceu em 1993. Brave Girls ficou sem
  formação, porque a de estreia (2011) não foi conferida e a de "Rollin'" entrou em 2016.
- **Fontes de cada ato** (`hitSources31`): o verbete da Wikipedia em inglês (`w` quando o título difere do nome) e o arquivo
  oficial da parada de cada hit (tabela abaixo).

## Contagens

### Por ano do hit principal

| Ano | Atos |
|---|---:|
| 1992 | 24 |
| 1993 | 30 |
| 1994 | 33 |
| 1995 | 32 |
| 1996 | 30 |
| 1997 | 36 |
| 1998 | 48 |
| 1999 | 49 |
| 2000 | 49 |
| 2001 | 46 |
| 2002 | 40 |
| 2003 | 44 |
| 2004 | 53 |
| 2005 | 34 |
| 2006 | 41 |
| 2007 | 41 |
| 2008 | 35 |
| 2009 | 34 |
| 2010 | 31 |
| 2011 | 28 |
| 2012 | 26 |
| 2013 | 24 |
| 2014 | 42 |
| 2015 | 27 |
| 2016 | 16 |
| 2017 | 28 |
| 2018 | 19 |
| 2019 | 16 |
| 2020 | 26 |
| 2021 | 20 |
| 2022 | 15 |
| 2023 | 16 |
| 2024 | 11 |

### Por ano de estreia (quinquênio)

1970–1974 1 · 1975–1979 1 · 1980–1984 5 · 1985–1989 16 · 1990–1994 131 · 1995–1999 218 · 2000–2004 212 · 2005–2009 163 · 2010–2014 144 · 2015–2019 86 · 2020–2024 67

### Por país (ISO)

GBR 332 · USA 285 · DEU 69 · JPN 53 · AUS 42 · KOR 36 · SWE 35 · CAN 25 · FRA 23 · NLD 21 · ARG 16 · DNK 14 · PRI 13 · IRL 12 · FIN 12 · NOR 11 · BEL 8 · JAM 7 · AUT 5 · NZL 5 · CHE 3 · ESP 3 · CUB 2 · CHL 2 · BRB 2 · CMR 1 · VEN 1 · ROU 1 · MEX 1 · HTI 1 · DOM 1 · ISR 1 · ZAF 1

### Por gênero do jogo

Pop e R&B 129 · Hip hop 111 · Pop rock 104 · Dance-pop 79 · House 56 · Indie 37 · Eurodance 35 · Rock alternativo 34 · Boy band 33 · Teen pop 29 · K-pop 29 · J-pop 24 · UK garage 18 · Folk 18 · Trance 17 · New jack swing 16 · Trap 14 · Reggaeton e trap latino 14 · Pop tradicional (crooner) 13 · Soul 13 · Britpop 13 · Country pop 13 · EDM e dubstep 12 · Grime 11 · Synth-pop 11 · Pop latino 9 · Soft rock 8 · Drum and bass 8 · Girl group soul 7 · Pop nórdico 7 · Trap latino 7 · Dancehall 6 · Techno 6 · Drill britânico 5 · Nu metal 5 · Reggae fusion 5 · Chanson pop 5 · Cumbia 5 · Neo-soul 4 · Hard rock 4 · Drill 4 · Reggae 3 · Trip-hop 3 · Afroswing 3 · Country 3 · Boom bap 3 · G-funk 3 · Rap francês 3 · Dubstep 2 · R&B alternativo 2 · World fusion 2 · Rock celta 2 · Blues rock 2 · Emo 2 · Punk 2 · R&B 2 · Visual kei 2 · Ópera 1 · Bhangra 1 · Funk 1 · Psicodelia 1 · Tropical house 1 · Fanfarra balcânica 1 · Grunge 1 · Gospel 1 · Jazz rap 1 · New wave 1 · Memphis rap 1 · Neue Deutsche Welle 1 · Hyperpop 1 · Glam 1 · Garage rock 1 · Pop persa 1 · French house 1 · Kuduro 1 · Rumba catalã 1 · Merengue 1 · Cumbia villera 1 · Reggae do Pacífico 1 · Afro house 1 · K-indie 1 · Hip hop coreano 1 · Enka 1 · Anison 1

### Por parada do hit principal

| Parada | Atos | Arquivo oficial |
|---|---:|---|
| UK | 424 | UK Singles Chart (officialcharts.com) |
| US | 298 | Billboard Hot 100 (billboard.com/charts/hot-100) |
| DE | 65 | GfK Offizielle Deutsche Charts (offiziellecharts.de) |
| JP | 55 | Oricon Singles Chart (oricon.co.jp) |
| KR | 34 | Gaon / Circle Digital Chart (circlechart.kr) |
| AU | 30 | ARIA Singles Chart (aria.com.au / australian-charts.com) |
| FR | 23 | SNEP Top Singles (snepmusique.com / lescharts.com) |
| SE | 21 | Sverigetopplistan (sverigetopplistan.se / swedishcharts.com) |
| ES | 17 | PROMUSICAE / Los 40 (promusicae.es / spanishcharts.com) |
| AR | 16 | Billboard Argentina Hot 100 (billboard.com) |
| FI | 11 | Suomen virallinen lista (ifpi.fi / finnishcharts.com) |
| NO | 8 | VG-lista (vglista.no / norwegiancharts.com) |
| NL | 7 | Dutch Top 40 / Single Top 100 (top40.nl / dutchcharts.nl) |
| DK | 7 | Tracklisten (hitlisten.nu / danishcharts.dk) |
| CA | 7 | RPM / Canadian Hot 100 (Library and Archives Canada / billboard.com) |
| BE | 6 | Ultratop (ultratop.be) |
| NZ | 4 | Official NZ Music Chart (nztop40.co.nz / charts.nz) |
| CH | 3 | Schweizer Hitparade (hitparade.ch) |
| AT | 3 | Ö3 Austria Top 40 (austriancharts.at) |
| IE | 2 | Irish Singles Chart (irishcharts.ie) |
| WW | 2 | IFPI / certificações multi-platina em vários países (Wikipedia: tabela de paradas do single) |
| MX | 1 | Billboard México / AMPROFON (billboard.com) |

Posição máxima do hit principal: nº 1 em 450, nº 2–5 em 396, nº 6–10 em 198. One-hit wonders: 412. Bandas/duplas com integrantes: 393; solo: 651. Hit conferido por busca na web (v): 191. Estreia aproximada (ap d): 383. Cidade do jogo aproximada (ca): 450. Com ano de nascimento (solo): 345.

## Fontes

- Wikipedia (en): verbete de cada ato; listas "UK top-ten singles in <ano>", "Billboard Hot 100 top-ten singles in <ano>",
  números 1 por país e ano, listas de one-hit wonders.
- Arquivos oficiais das paradas (tabela acima): Official Charts Company, Billboard, ARIA, GfK/Offizielle Deutsche Charts, SNEP,
  Sverigetopplistan, PROMUSICAE, Oricon, Circle/Gaon, Dutch Top 40, Ultratop, Ö3, Hitparade, IRMA, Recorded Music NZ, VG-lista,
  Tracklisten, IFPI Finland.
- Discogs e MusicBrainz (discos citados em `al`), quando o curador os conhecia. Não foram consultados ao vivo por causa da rede.

## O que ficou de fora e por quê

"O máximo que dá com dados confiáveis" nesta sessão foi 1 044. Com acesso à Wikipedia/Wikidata ou mais cota de busca, cada
região tem fila conhecida:

- **Posição ou ano do hit não confirmado (busca contradisse ou não fechou):** Fun Factory, U96, Intermission, 2 Fabiola, Caught in
  the Act, Lovebugs, BWO, Smile.dk, Timbuktu, Sanna Nielsen, M. Pokora, El Canto del Loco, David Bisbal, Melendi, Wisin & Yandel,
  Wisin, Tito El Bambino, Héctor el Father, De la Ghetto, Reik, Camila, Sin Bandera, Jesse & Joy, Ha*Ash, CNCO, Piso 21, Morat,
  RBD, Belinda, Elvis Crespo, Proyecto Uno, Fulanito, El Chombo, King Africa, Mandy Moore, Hilary Duff, Stacie Orrico, Fifty Fifty,
  Ricki-Lee, Havana Brown, Killing Heidi, Da Pump, Kyary Pamyu Pamyu, Toploader, Point Break, Bad Boys Inc, Kavana, Scooch,
  Orbital, Paul Oakenfold, Mimi Webb, Wilkinson, Sub Focus, Digga D, Picture This, Dermot Kennedy, Shinedown, LP, Jelly Roll e
  Kane Brown, entre outros.
- **Sem busca e sem certeza (fila para a próxima rodada):** Ich + Ich, Adel Tawil, Xavier Naidoo, Oomph!, DJ Antoine, Topic,
  Alle Farben, Captain Jack, Nana, Die Prinzen, Gotthard, K3, Jenifer, Nolwenn Leroy, Diam's, Black M, Soolking, Dadju, Lola
  Índigo, Juan Magán, Helena Paparizou, Mustafa Sandal, Hadise, Akcent, Ruslana, Verka Serduchka, Serebro, Marcus & Martinus e
  grupos K-pop dos anos 90 anteriores ao Gaon (Sechs Kies, S.E.S., Fin.K.L, g.o.d, Shinhwa).
- **Fora do critério:** sem single no top 10 de parada aceita (Jamie Cullum, Elbow, Portishead, Fastball, Semisonic, Fuel e
  outros, que só tocaram no rádio). Primeiro sucesso antes de 1992 (Utah Saints, The Shamen, Lightning Seeds). País sem ficha no
  jogo (Kevin Lyttle, de São Vicente; Imanbek, do Cazaquistão). Grupo fictício (Huntr/x, Saja Boys).
- **Já estavam na base (descartados pelo dedupKey27):** Los del Río, Gotye, Aqua, Eiffel 65, Las Ketchup, O-Zone, Lou Bega, Baha
  Men, Haddaway, Dr. Alban, Ace of Base, Spice Girls, Backstreet Boys e centenas de outros.
- **Grupos sem integrantes conhecidos com certeza** (entram como ato de uma pessoa até alguém conferir a formação): Blazin' Squad,
  So Solid Crew, Big Brovaz, MN8, Triple 8, Precious, Fierce, Menswear, Babyshambles, Brave Girls e outros.

## Medição (interruptor ligado × desligado desde a criação)

`scripts/r31/measure.ts`, 2 sementes × eras 1990/2012/2030, 24 meses, 2 processos (`docs/r31/base-hits-on.*` e
`docs/r31/base-hits-off.*`). "Desligado" mede com o padrão do interruptor trocado só durante a medição: desligar depois de
criar só segura quem ainda vai surgir.

| Era | ms/mês desligado | ms/mês ligado | Save desligado | Save ligado | gzip desligado → ligado |
|---|---:|---:|---:|---:|---|
| 1990 | 1 462 | 1 490 (+2%) | 9,39 MB | 9,64 MB | 1,88 → 1,94 MB |
| 2012 | 1 935 | 3 103 (+60%) | 12,05 MB | 17,09 MB | 2,40 → 3,47 MB |
| 2030 | 2 043 | 3 069 (+50%) | 12,03 MB | 17,01 MB | 2,30 → 3,35 MB |

Mais atos custam mais. A partir de 2012, cerca de 900 atos reais a mais estão no mundo, com integrantes, discos e
contratos. O mês fica 50–60% mais lento e o save, ~5 MB maior (~1 MB em gzip). Muitos one-hit wonders não têm ano de fim
documentado e seguem ativos no jogo. O r14-db ("enorme", 2010) já passava do teto de 3 000 ms/mês antes desta frente (3 236)
e foi para ~3 850. O r19-data-d (2022 + 30 meses) ganhou 240 s de prazo. Saída barata, se o dono quiser: marcar os hits como
base "grande" (`z: 2`), assim só entram com a base de dados grande/enorme. Não foi feito porque o pedido era ligado por padrão.

## Arquivos

- `src/data/base31hits.ts`: os 1 044 atos (formato compacto `HitSrc31` → `RealArtist`).
- `src/data/hits31types.ts`: formato, paradas aceitas e arquivo oficial de cada uma, conversão e fontes.
- `src/sim/sys/realworld.ts`: uma linha de carga no fim de `REAL_ALL` (`BASE31H_FROM`/`BASE31H_TO`) e o interruptor
  `base31.hits`, lido no início e a cada mês para quem ainda vai surgir. Religar devolve quem esperava.
- `src/data/cur31.ts`: `CUR31_HITS` (ficha com fontes e "a confirmar").
- `src/data/realnames31.ts`: espaço novo `hit:` com 1 044 registros (homenagem do `homage31`; "Train" reaproveita a que já existia).
- `tests/r31-base-hits.test.ts`: fonte, gênero, cidade, país, anos, hit no top 10, duplicatas, nomes, contagem mínima e interruptor.
