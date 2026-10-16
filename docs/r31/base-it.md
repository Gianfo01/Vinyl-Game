# R31 · onda 4 · BASE-IT — base de artistas italianos

**Resultado:** 283 atos italianos novos (src/data/base31it.ts), todos com fonte, obra marcante com ano e cidade do jogo.
A Itália passa de **205 → 488** atos em REAL_ALL (desde 1992: 140 → 253). A meta de 1 000 **não** foi alcançada;
o motivo está em "Até onde deu e por quê", no fim.

- Entram no FIM de REAL_ALL, depois de BASE31_ACTS (`BASE31IT_FROM`/`BASE31IT_TO` em sim/sys/realworld.ts); os números de
  catálogo de quem já existia não mudam. Ordem combinada das frentes paralelas: BR, IT, HITS.
- Interruptor **`base31.it`** (ligado por padrão), lido de `config.base31it` (ausente = ligado). Vale na criação da partida;
  desligado no meio da partida, quem ainda não estreou sai da fila. Desligado, o mundo é exatamente o de antes (goldens
  r27-p2a, r27-p2b, r27-m3 e r16-playbot passam com os valores antigos).
- Curadoria por ato (fontes, cidade real, apelidos, a confirmar) em `IT31`, exposta em CUR31 (src/data/cur31.ts,
  `ref: base31it:<nome>`); nome real registrado em realnames31 (espaço `cur`, chave = slug do nome; homenagem gerada por
  homage31) — r31-realnames passa.
- Teste: tests/r31-base-it.test.ts (fonte, gênero, cidade, anos coerentes, integrantes vivos e adultos na entrada, sem
  duplicata com REAL_ALL nem com o catálogo, registro de nomes, contagem mínima 280, interruptor ligado/desligado).

## Contagens

### Por década de estreia

| Década | Atos |
|---|---:|
| 1900s | 1 |
| 1910s | 3 |
| 1930s | 5 |
| 1940s | 12 |
| 1950s | 29 |
| 1960s | 36 |
| 1970s | 43 |
| 1980s | 36 |
| 1990s | 45 |
| 2000s | 36 |
| 2010s | 29 |
| 2020s | 8 |

### Por gênero do jogo (nenhum gênero novo)

canzone 72 · cantautori 39 · pop_rock 19 · opera 12 · canzone_napoletana 12 · indie 12 · soundtrack 10 · italo 10 · prog 8 ·
alt_rock 8 · eurodance 7 · hiphop 6 · pop_rnb 6 · trad_pop 5 · classical 5 · new_wave 5 · beat 4 · folk 4 · dance_pop 4 · trap 4 ·
big_band 3 · vocal_jazz 3 · reggae 3 · cool_jazz 3 · rnr 2 · punk 2 · house 2 · trance 2 · edm 2 · cabaret, fusion, synthpop,
heavy_metal, celtic_rock, boom_bap, drill, reggaeton, death_metal 1 cada.

Mapeamentos: swing italiano → big_band / vocal_jazz; urlatori → rnr; italo dance → eurodance / trance / house; ópera e
tenores de disco → opera; Sanremo e música ligeira → canzone; trilhas → soundtrack.

### Por cidade

| Cidade do jogo | Atos | 
|---|---:|
| Milão | 144 |
| Roma | 79 |
| Nápoles | 60 |

O jogo só tem essas três cidades na Itália. 176 atos têm a cidade real anotada (`rc`) e a ficha diz "cidade do jogo
aproximada (real: …)". Regra: a mais próxima em linha reta — Norte, Emília e litoral toscano (Pisa, Carrara, Pontedera,
Santa Croce) → Milão; Florença, Arezzo, Grosseto, Marcas, Rimini/Cesena/Forlì, Úmbria, Lácio, Abruzos e Sardenha → Roma;
Campânia, Molise, Apúlia, Basilicata, Calábria, Sicília e Formia → Nápoles.

### Outros números

- 72 bandas/duplas, 211 solos; 57 em nível 2 (grande nome), o resto 3; nenhum nível 1 novo (os globais já estavam).
- Sanremo: 49 atos levam o albo d'oro como fonte; somados aos que já estavam na base, todos os vencedores de 1951 a 2026
  estão no jogo, menos os da lista de fora (abaixo).
- 148 atos com algum campo marcado aproximado (`ap`: quase sempre o ano da estreia em disco, que fica antes da obra
  marcante); nenhum `exact: false`.

## Fontes

Para todos: Wikipedia (it) — verbete do artista; Discogs — discografia. Por ato, quando cabe: albo d'oro do Festival di
Sanremo (49), Eurovision 1964 (Gigliola Cinquetti), Hit Parade Italia (classifiche annuali), FIMI (classifiche e
certificazioni). Os códigos ficam em `FO31` e são expandidos em `itSources31` (a ficha CUR31 mostra o texto).

Conferido por busca nesta sessão (código `ws`, 15 atos): Enzo Jannacci ("Vengo anch'io. No, tu no", 1968 — en.wikipedia,
luisbacalov.com); Giorgio Gaber ("Non arrossire", 1960 — Sky TG24); Franca Raimondi (Monopoli, 1932–1988 — en.wikipedia);
Mino Reitano ("Italia", Sanremo 1988 — Rockol); Gabriella Ferri ("Remedios", 1974); Mario Merola ("So' nnato carcerato",
1963); NCCP (estreia 1971, "Tammurriata nera" 1974 — globalpopularmusic.net); Eugenio Bennato ("Brigante se more",
1979/1980 — Rockol, Ticketone); Gabry Ponte ("Geordie", 2001); Mauro Picotto ("Komodo", 2000); Sottotono (1994, "Solo lei ha
quel che voglio" 1996 — Rockol); Sud Sound System (1991; "Comu na petra" 1996 — Rockol); Baby Gang (Lecco, 2001;
"Casablanca" 2021, "Mentalité" 2022); Benji & Fede ("Amore wi-fi", 2016 — Panorama); Sal Da Vinci (Sanremo 2026, "Per
sempre sì" — eroicafenice.com).

## Desempenho do mês e tamanho do save

`npx tsx scripts/r31/measure.ts --seeds 2 --starts 1955,1975,1995,2015 --months 24`, ligada (docs/r31/base-it-med.*)
e desligada (`R31_CFG=base31it=false`, docs/r31/base-it-med-off.*). `R31_CFG` é novo no measure.ts: entra na configuração
ANTES de criar a partida (o `R31_SW` de sempre só vale depois, e esta base nasce na criação).

| Era | ms/mês desligada | ms/mês ligada | Δ | Save JSON desligada | ligada | Δ | gzip desligada → ligada |
|---|---:|---:|---:|---:|---:|---:|---|
| 1955 | 786 | 828 | +5% | 5,16 MB | 5,48 MB | +6% | 1,03 → 1,09 MB |
| 1975 | 1.359 | 1.479 | +9% | 7,77 MB | 8,39 MB | +8% | 1,56 → 1,69 MB |
| 1995 | 1.950 | 2.215 | +14% | 9,75 MB | 10,84 MB | +11% | 1,95 → 2,18 MB |
| 2015 | 2.680 | 3.078 | +15% | 12,74 MB | 14,03 MB | +10% | 2,51 → 2,77 MB |

Mais atos reais = mais gente, discos e paradas para percorrer. O custo cresce com a era porque nas eras recentes quase
todos os 283 já estrearam (e trazem discografia simulada). Tempos variam com a máquina (2 sementes); os tamanhos de save
são determinísticos.

## O que ficou de fora e por quê

A sessão não alcançou Wikidata, MusicBrainz, Wikipedia, Hit Parade Italia nem Discogs direto (rede da sessão: 403/DNS);
só a busca na web, que devolve resumos. Sem poder abrir as fontes para conferir datas, nascimentos e cidades em massa,
a regra "nada inventado" limitou a base ao que eu tinha com segurança + o que a busca confirmou. Ficaram de fora:

- **Vencedores de Sanremo sem dado seguro:** Gilda (1975), Homo Sapiens (1977) e Mino Vergnaghi (1979) — cidade e
  nascimento sem fonte conferida; Lola Ponce (2008, argentina; Giò Di Tonno entrou).
- **Não italianos de carreira italiana:** Little Tony (San Marino — o jogo não tem ficha de país SMR), Mal, The Rokes,
  Shel Shapiro, Rocky Roberts, Wess, Heather Parisi, Whigfield, Ice MC, Double You, Maria Callas, Mario Lanza, Luis Bacalov.
- **Ivano Fossati:** fora de propósito, para não confundir com a família Fossati do jogo (regra do BRIEFING).
- **Dados incompletos (morte ou cidade sem confirmação):** La Bionda, Peppino Gagliardi, Gianni Nazzaro, James Senese
  (solo), Teresa De Sio, Giacomo Rondinella, Fausto Cigliano, Rosa Balistreri, Maria Carta, Giovanna Marini, Matteo
  Salvatore, Fernando De Lucia, Titta Ruffo, Luisa Tetrazzini, Lina Cavalieri, Gennaro Pasquariello, Elvira Donnarumma,
  Gilda Mignonette, Lelio Luttazzi, Ernesto Bonino, Achille Togliani, Gino Bechi, Katia Ricciarelli, Ruggero Raimondi,
  Uto Ughi, Ricky Gianco, Joe Sentieri, Linea 77, Gigi Finizio e dezenas de nomes de trap/drill recentes (anos e obras
  ainda sem fonte fixa).
- **Já estavam na base** (deduplicação): Mina, Massimo Ranieri, Domenico Modugno, Patty Pravo, Ornella Vanoni, Loredana
  Bertè, Natalino Otto, Tito Schipa, Andrea Bocelli, Equipe 84, Nek, Giorgia, Daniele Silvestri, Max Gazzè, Articolo 31,
  Eiffel 65, Gigi D'Agostino, Achille Lauro, Madame, Mahmood, Arisa, Annalisa, Ariete, Coez, Calcutta, Cosmo, Olly e os
  demais 205.

**Como chegar a 1 000:** liberar na rede do ambiente `query.wikidata.org`, `musicbrainz.org`, `it.wikipedia.org` e
`www.hitparadeitalia.it` e rodar uma segunda passada por consulta (lista de vencedores e finalistas de Sanremo, número 1
da Hit Parade/FIMI por ano, artistas com QID e país Itália), com o mesmo formato e o mesmo teste.
