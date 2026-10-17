# R31 · onda 4 · BASE-IT — base de artistas italianos

**Resultado:** 564 atos italianos novos (src/data/base31it.ts), todos com fonte, obra com ano e cidade do jogo.
A Itália passa de **205 → 769** atos em REAL_ALL (EUA: 1 012; desde 1992, Itália 140 → 433). Meta de 1 000 não
alcançada — ver "Até onde deu e por quê".

Duas passadas:
1. **Manual (284 atos):** o que eu sabia com segurança + conferências por busca na web (Sanremo completo, napolitana,
   ópera, swing, cantautori, prog, italo, eurodance, rap/trap, indie, trilhas). Fontes: Wikipedia (it), Discogs, albo
   d'oro de Sanremo, HPI/FIMI e 15 conferências por busca.
2. **MusicBrainz (280 atos, gerados por script):** com a rede liberada só para musicbrainz.org, coleta por 91 gêneros
   (país IT, 3 644 nomes) → 2 103 fichas baixadas (pessoa/grupo com local de origem) → 280 aceitos. Fonte de cada um: o
   MBID (link na curadoria) e o QID do Wikidata. Regras (nada inventado; quem não cumpre fica fora):
   - link para o Wikidata (notoriedade; 832 fora por isso) e pelo menos 3 lançamentos;
   - local de origem na Itália → cidade do jogo pela região/província (51 fora sem local italiano);
   - estreia = 1º disco datado (álbum, single, EP; sem coletânea/ao vivo/remix); obras = esse disco + 1º e último álbum
     (não necessariamente os maiores sucessos);
   - pessoa: nascimento/morte do life-span; morte antes do 1º disco = fora (Verdi, Vivaldi, Rossini…); 1º disco datado
     mais de 40 anos depois do nascimento = fora (reedição em CD de cantor antigo: Peppe Barra, Francesco Albanese…), entre
     30 e 40 = estreia aproximada (`ap`);
   - banda: 1º disco mais de 15 anos depois da formação = fora; 9–15 = aproximada; integrantes só com voz/instrumento
     informado no MusicBrainz;
   - gênero e papel deduzidos das tags do MusicBrainz (anotado na ficha); papel sem tag de instrumento/voz em gênero que
     não é de cantor = fora (207 — quase todo o jazz e os regentes);
   - discografia com menos de 10 lançamentos → `z: 2` (só nas bases Grande/Enorme; 114 atos): a base padrão (Média) ganha
     450 atos novos, a Grande/Enorme ganha os 564;
   - duplicatas: 278 já na base pelo nome; mais 2 pegas por apelido (Sabrina Salerno = Sabrina; Alessandro Mannarino =
     Mannarino); Ivano e Daniele Fossati fora (família Fossati).

- Entram no FIM de REAL_ALL, depois de BASE31_ACTS (`BASE31IT_FROM`/`BASE31IT_TO` em sim/sys/realworld.ts); números de
  catálogo antigos estáveis. Ordem combinada das frentes paralelas: BR, IT, HITS.
- Interruptor **`base31.it`** (padrão ligado), lido de `config.base31it` (ausente = ligado); vale na criação da partida.
  Desligado, o mundo é o de antes (goldens r27-p2a, r27-p2b, r27-m3, r16-playbot com os valores antigos).
- Curadoria por ato em `IT31` → CUR31 (`ref: base31it:<nome>`; fontes, cidade real, apelidos, a confirmar); nome real
  em realnames31 (espaço `cur`, homenagem por homage31).
- Teste: tests/r31-base-it.test.ts (fonte, gênero, cidade, anos coerentes, integrantes, sem duplicata, registro de
  nomes, mínimo 560, interruptor).

## Contagens

### Por década de estreia

| Década | Atos |
|---|---:|
| 1900s | 1 |
| 1910s | 3 |
| 1930s | 5 |
| 1940s | 12 |
| 1950s | 38 |
| 1960s | 50 |
| 1970s | 73 |
| 1980s | 76 |
| 1990s | 118 |
| 2000s | 103 |
| 2010s | 72 |
| 2020s | 13 |

### Por gênero do jogo (nenhum gênero novo)

canzone 101 · cantautori 52 · heavy_metal 37 · classical 33 · prog 28 · pop_rock 25 · opera 21 · hiphop 20 · punk 19 · indie 19 ·
canzone_napoletana 16 · eurodance 16 · alt_rock 15 · italo 14 · dance_pop 13 · death_metal 11 · black_metal 11 · soundtrack 10 ·
folk 10 · pop_rnb 7 · cool_jazz 7 · post_punk 7 · new_wave 6 · reggae 6 · trad_pop 5 · trap 5 · edm 5 · beat 4 · ambient 4 ·
big_band, vocal_jazz, hardcore_punk, thrash, soul 3 cada · rnr, fusion, house, trance, hard_rock, ska 2 cada · cabaret,
synthpop, celtic_rock, boom_bap, drill, reggaeton, disco, psychedelic, gabber, garage_rock 1 cada.

Mapeamentos: swing italiano → big_band / vocal_jazz; urlatori → rnr; italo dance → eurodance / trance / house; ópera e
tenores de disco → opera; Sanremo e música ligeira → canzone; trilhas → soundtrack.

### Por cidade

| Cidade do jogo | Atos | 
|---|---:|
| Milão | 310 |
| Roma | 148 |
| Nápoles | 106 |

O jogo só tem essas três cidades na Itália. 371 atos têm a cidade real anotada (`rc`) e a ficha diz "cidade do jogo
aproximada (real: …)". Regra: a mais próxima em linha reta — Norte, Emília e litoral toscano (Pisa, Carrara, Pontedera,
Santa Croce) → Milão; Florença, Arezzo, Grosseto, Marcas, Rimini/Cesena/Forlì, Úmbria, Lácio, Abruzos e Sardenha → Roma;
Campânia, Molise, Apúlia, Basilicata, Calábria, Sicília e Formia → Nápoles.

### Outros números

- 229 bandas/duplas, 335 solos; 57 em nível 2 (grande nome, todos da passada manual), o resto 3; nenhum nível 1 novo.
- Sanremo: 50 atos levam o albo d'oro como fonte; somados aos que já estavam na base, todos os vencedores de 1951 a 2026
  estão no jogo (com Claudia Mori, 1970), menos os da lista de fora (abaixo) e Patricia Carli (1964, belga).
- 193 atos com algum campo marcado aproximado (`ap`: quase sempre o ano da estreia em disco, que fica antes da obra
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

| Era | ms/mês desligada | ligada (284) | ligada (566*) | Save JSON desligada | ligada (284) | ligada (566*) |
|---|---:|---:|---:|---:|---:|---:|
| 1955 | 786 | 828 | 787 | 5,16 MB | 5,48 MB | 5,48 MB |
| 1975 | 1.359 | 1.479 | 1.440 | 7,77 MB | 8,39 MB | 8,51 MB |
| 1995 | 1.950 | 2.215 | 2.194 | 9,75 MB | 10,84 MB | 11,27 MB |
| 2015 | 2.680 | 3.078 | 3.053 | 12,74 MB | 14,03 MB | 14,81 MB |

\* medido antes de tirar as 2 duplicatas (566 → 564); base padrão (Média), onde os 114 atos `z: 2` não nascem. Custo
do mês: +0% a +14% (o tempo oscila entre rodadas; 2 sementes); save: +6% a +16% (gzip 2,51 → 2,94 MB em 2015).
Arquivos: docs/r31/base-it-med.* (ligada, 566) e docs/r31/base-it-med-off.* (desligada).

Mais atos reais = mais gente, discos e paradas para percorrer; o custo cresce com a era porque nas eras recentes quase todos já estrearam.

## O que ficou de fora e por quê

A rede da sessão só alcança musicbrainz.org (Wikidata, Wikipedia, Hit Parade Italia e Discogs continuam bloqueados) e a
busca na web. O MusicBrainz cobre bem rock/metal/prog/clássica/cantautori, mas tem pouca marcação de instrumento (por
isso quase todo o jazz e os regentes ficaram fora) e pouca coisa dos anos 1900–1950 com data original (só reedições).
Ficaram fora, por regra: 832 sem Wikidata, 207 sem papel deduzível, 119 com menos de 3 lançamentos, 111 sem disco
datado, 105 com morte antes do 1º disco datado (compositores clássicos), 75 sem gênero mapeável, 51 sem local italiano,
36 com estreia tardia (reedição), 278 duplicatas.

Da passada manual ficaram de fora:
- vencedores de Sanremo sem dado seguro: Gilda (1975), Homo Sapiens (1977), Mino Vergnaghi (1979); Lola Ponce (2008,
  argentina) e Patricia Carli (1964, belga);
- não italianos de carreira italiana: Little Tony (San Marino, sem ficha de país SMR), Mal, The Rokes, Shel Shapiro,
  Rocky Roberts, Wess, Heather Parisi, Whigfield, Ice MC, Double You, Maria Callas, Mario Lanza, Luis Bacalov;
- Ivano Fossati (e Daniele Fossati no MusicBrainz), de propósito, pela família Fossati do jogo;
- o que já estava na base (Mina, Modugno, Patty Pravo, Vanoni, Bocelli, Eiffel 65, Mahmood, Olly… — os 205 de antes).

**Para chegar a 1 000:** liberar também `query.wikidata.org` (consulta por país Itália + ocupação músico + sitelinks,
com nascimento, local e gênero) ou `it.wikipedia.org`; rodar o mesmo script (scripts/r31/base-it-mb/: mbfetch.py,
mbbuild.py, mbemit.py) com o Wikidata para confirmar papel/instrumento e datas antigas, o que traria
de volta boa parte dos 207 sem papel e dos 36 de estreia tardia.
