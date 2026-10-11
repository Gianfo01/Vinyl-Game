# Verificação R19 (onda 4, Frente 10 WP-J)

Escopo: `src/data/more19/*` (artistas, selos, estúdios, equipamentos, casas, festivais, prêmios, sociedades, leis), `hist19.ts`, `media19*.ts`, `era1889.ts`.
Método: revisão linha a linha contra conhecimento documentado; busca na web em lote para os itens de maior risco (a busca retornou pouco, então várias conferências são por conhecimento geral e estão marcadas assim).

## Conferido (aprox. 1.500 itens)
- 668 artistas (anos de estreia, nascimento/morte, fim): sem erros de data encontrados além dos abaixo.
- 74 marcos de `hist19.ts` (dia/mês/ano de cada `ref`): todos coerentes; 1 mês corrigido.
- ~90 festivais, 40 prêmios, 19 sociedades, 20 leis (`wp_g`): fundações e datas de leis conferidas.
- ~120 selos (`wp_e_labels`), 70 estúdios, 230 equipamentos (anos de lançamento), 40 veículos de mídia, ~65 covers/samples, 11 organizações, 14 crônicas.
- Afirmações sobre pessoas reais: nenhuma apresenta pessoa real como autora ou vítima de crime; ninguém tem causa de morte. Processos de plágio só citam desfecho público (acordo, sentença, absolvição).

## Corrigido
1. Bug de dados: 5 linhas de grupos (Mills Brothers, Trío Los Panchos, Trío Matamoros, The Skatalites, Grand Kallé et l'African Jazz) tinham um separador faltando; o campo `e` virava NaN e os integrantes eram perdidos. Corrigido.
2. Mortes ausentes (artistas apareciam ativos para sempre): adicionado `e`/`x` para 27 nomes em `wp_c`, `wp_d1` e Daddy Lumba (2025), só onde a data é bem conhecida (ex.: Hayedeh 1990, Shajarian 2020, Didi Kempot 2020, Titiek Puspa 2025, Sakamoto 2023).
3. `exact: false` (somem no modo exato) por estreia não confirmada: Lord Flea, Count Lasher, Pat Thomas, Orlando Julius, Jil Jilala, Plastic People of the Universe, DDT.
4. Sony PCM-3348: lançamento 1982 → 1991 (o de 1982 é o PCM-3324); evita anacronismo.
5. Marco "El Manisero": mês maio → abril (1930).
6. Alegações suavizadas: Cartel de Cali ("segundo as acusações"), "I'll Be Missing You" (removido "sem pedir antes"), "Funky Drummer" (royalties passam a ser declaração do baterista), tríade 14K (removida a marcha de artistas de 1992, não confirmada).
7. Crônica de 1992 (marcha em Hong Kong) removida por não confirmada; incluída a do DMCA (28/10/1998, confirmada) para manter o mínimo do teste.

## Sinalizado, não verificado
- Mortes de Johnny Ventura, Orlando Julius, Ebo Taylor, Calypso Rose, Erkin Koray: sem confirmação na busca; deixados como ativos.
- Sinn Sisamouth e Ros Serey Sothea: `e` = 1975 sem causa, sem texto; é só o fim da carreira conhecida. Mantidos como contexto neutro.
- Lucky Dube e James Reese Europe: só ano de morte, sem causa nem autor. Mantidos.
- Datas de início de selos jamaicanos (Studio One 1962, Treasure Isle 1963) são aproximadas; Artisjus (1936 é do predecessor; nome atual de 1952).
- Estreias de artistas `t:3` regionais em `wp_c`/`wp_d1`/`wp_d2` seguem como "primeiro lançamento conhecido" sem checagem individual.
- Anacronismo: nenhum marco, festival, lei ou equipamento aparece antes do ano real após as correções acima. Os testes `r19-data-*`, `r19-history` e `r19-media` passam.
