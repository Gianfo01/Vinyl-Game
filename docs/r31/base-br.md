# R31 · onda 4 · BASE-BR — base brasileira ampliada

**Resultado desta rodada:** 165 atos brasileiros novos, todos com fonte verificada nas buscas. O Brasil vai de 551 para
**716 atos** em REAL_ALL (402 desde 1992). A base inteira vai de 3 483 para 3 648 atos.
**Meta (≥ 1 000) ainda não alcançada.** Faltam cerca de 285 atos, e já há 580 candidatos listados à espera de pesquisa.

## Por que parou em 165 (e como continuar)

As fichas vêm de buscas na web: Wikipédia pt/en, Dicionário Cravo Albin da MPB, IMMuB e Discogs. As APIs do Wikidata e do
MusicBrainz e o acesso direto às páginas estão bloqueados nesta rede. A ferramenta de busca tem um limite de 200 buscas por
turno, dividido entre todos os agentes. O limite acabou depois de 165 fichas confirmadas. Os outros 580 candidatos estão
em `docs/r31/base-br/*.jsonl` com `"status":"skip"` e o motivo "limite de buscas". Não preenchi nenhum deles de memória.

Para continuar:

1. Mande uma nova mensagem à sessão. Cada turno libera mais 200 buscas, o que dá cerca de 150 a 190 fichas por turno.
2. Os agentes pesquisam as linhas `skip` com motivo de limite e trocam cada uma pela ficha `ok`.
3. Rode `npx tsx scripts/r31/base31br-gen.ts`. Ele regera `src/data/base31br.ts` e o bloco `br31` de `realnames31.ts`.
4. Rode `tests/r31-base-br.test.ts` e suba o piso de contagem.

Dois turnos a mais devem passar de 1 000 atos.

Dos candidatos pesquisados, três ficaram de fora por mérito. Os três são só compositores, sem gravação própria documentada:
Catulo da Paixão Cearense, Zequinha de Abreu (o "Tico-tico" foi gravado pela Orquestra Colbaz) e Sinhô. Paulo Vanzolini
também ficou de fora: o LP de estreia dele é cantado por outros intérpretes. Plutão Já Foi Planeta e Mestre Lucindo ficaram
fora por falta de dado confirmável.

## Como o dado entra (regras de confiabilidade)

- **Uma ficha por ato** em `docs/r31/base-br/*.jsonl`. Cada ficha tem fontes (URLs), apelidos, campos a confirmar e a
  cidade real quando o jogo não tem a cidade. O gerador `scripts/r31/base31br-gen.ts` faz estas verificações e descarta o
  campo que falha em alguma delas:
  - gênero e cidade existem;
  - o gênero já existia até 6 anos depois da estreia (mesma regra do r19-data-base);
  - estreia ≤ obra ≤ fim;
  - o artista solo nasceu antes da estreia e morreu depois dela;
  - cada integrante nasceu antes de entrar e estava vivo ao entrar.

  Nesta rodada nenhuma correção automática foi necessária.
- **Nada chutado.** Um campo em dúvida fica omitido ou marcado com `ap` (aproximado). O ato continua no modo exato, e a
  ficha mostra "aproximado". 85 atos têm algum campo `ap`, e um tem `exact: false` (Victor Ruiz, só com fonte no Discogs).
- **Dados que um agente completou de memória.** Um dos agentes preencheu algumas mortes e anos de discos sem fonte nas
  buscas. Esses dados ficaram marcados em `confirmar` e com `ap: x`: Johnny Alf, Sylvia Telles, Oscar Castro-Neves,
  Walter Wanderley, Miúcha, Monarco e os integrantes do Tamba Trio e do Zimbo Trio.
- **Estreia em disco coletivo ou de banda anterior** está anotada em `confirmar`. Por exemplo: Candeia com os Mensageiros
  do Samba, Monarco com a Velha Guarda, Ed Motta com a Conexão Japeri e Leoni com o Kid Abelha.
- **Sem gênero novo.** Tudo foi mapeado para gêneros que já existem. Caipira de raiz anterior a 1954 (Inezita Barroso)
  ficou em `modinha`, porque o sertanejo do jogo nasce em 1960.
- **Sem duplicata.** O teste compara o lote com REAL_ALL (dedupKey27), com o catálogo clássico e com as bandas de ficção.
- **Porte:** 6 atos com t 2 (Demônios da Garoa, Inezita Barroso, Agnaldo Rayol, Shirley Carvalhaes, Cassiane e Bell
  Marques). Os outros têm t 3, e nenhum tem t 1.

## Contagem

**Por década de estreia (novos / total BR depois do lote):**

| Década | Novos | Total BR |
|---|---:|---:|
| 1880–1890 | 0 | 2 |
| 1900 | 3 | 5 |
| 1910 | 1 | 4 |
| 1920 | 4 | 8 |
| 1930 | 2 | 12 |
| 1940 | 1 | 4 |
| 1950 | 17 | 28 |
| 1960 | 20 | 69 |
| 1970 | 21 | 78 |
| 1980 | 26 | 82 |
| 1990 | 19 | 106 |
| 2000 | 21 | 90 |
| 2010 | 28 | 169 |
| 2020 | 2 | 59 |

**Por gênero (novos):**
- bossa 14 · samba 13 · gospel 13 · axé 11 · rock BR 10
- gaúcho 8 · MPB 8 · funk carioca 8 · indie 7
- frevo 5 · forró 5 · house 5 · sertanejo universitário 5
- bolero 4 · samba-canção 4 · alt rock 4
- modinha 3 · choro 3 · prog 3 · soul BR 3
- jovem guarda, psicodélico, hard rock, nu metal e funk ostentação: 2 cada
- 1 cada: marchinha, trad pop, fusion, carimbó, punk, erudito, reggae, world fusion, post-punk, pagode, samba-reggae,
  dance pop, hardcore, heavy metal, MPB nova, techno, funk 150, piseiro e brega funk

**Por cidade do jogo (novos):**
- rio 58 · sao_paulo 43 · recife 18 · salvador 16
- porto_alegre 10 · bh 7 · goiania 5 · curitiba 4
- brasilia 2 · belem 1 · fortaleza 1

61 fichas têm a cidade real anotada em `lugar`, quando o jogo não tem a cidade. Alguns exemplos:
- Natal → recife
- Vitória → bh
- Campo Grande → goiania
- Maringá e Londrina → curitiba
- Juiz de Fora → rio
- Cuiabá → goiania

## Fontes

418 referências, de 1 a 4 por ato:

| Fonte | Referências |
|---|---:|
| pt.wikipedia.org | 143 |
| dicionariompb.com.br (Cravo Albin) | 119 |
| en.wikipedia.org | 76 |
| discogs.com | 54 |
| immub.org | 26 |

As URLs de cada ato estão em `BR31_NOTES` (`src/data/base31br.ts`) e na ficha de curadoria `CURBR31` (formato Cur31,
`ref: base31br:<nome>`).

## Lista dos 165

Os atos estão em ordem de estreia em `src/data/base31br.ts`. Os lotes cobrem:
- **choro e pioneiros:** Mário Pinheiro, Patápio Silva, Eduardo das Neves, João Pernambuco e Os Oito Batutas;
- **era do rádio:** Almirante, Aurora Miranda, Leny Eversong, Anísio Silva e Orlando Dias;
- **bossa:** Johnny Alf, Sylvia Telles, Alaíde Costa, Tamba Trio, Zimbo Trio e Wanda Sá;
- **gaúcho:** Gildo de Freitas, Os Serranos, Os Monarcas, Noel Guarany, Gaúcho da Fronteira e Renato Borghetti;
- **frevo e Nordeste:** Capiba, Nelson Ferreira, Claudionor Germano, Spok, Quinteto Violado, Lia de Itamaracá, Selma do
  Coco e Banda de Pífanos de Caruaru;
- **samba:** Candeia, Monarco, Velha Guarda da Portela, Wilson Moreira, Nei Lopes, Jovelina Pérola Negra, Germano
  Mathias e Geraldo Filme;
- **rock dos anos 70 e 80:** O Terço, Made in Brazil, Casa das Máquinas, Joelho de Porco, Rádio Táxi, Herva Doce, Fellini
  e Violeta de Outono;
- **axé:** Bell Marques, Margareth Menezes, Gerônimo, Banda Beijo, Psirico, Parangolé e Saulo Fernandes;
- **gospel:** Shirley Carvalhaes, Cassiane, Oficina G3, Resgate, Diante do Trono, Fernandinho e Anderson Freire;
- **funk e eletrônica:** MC Daleste, MC Gui, MC Pedrinho, MC Ryan SP, DJ Rennan da Penha, Mochakk e Dubdogz;
- **indie e alternativo:** Móveis Coloniais de Acaju, Vanguart, Scalene, Far From Alaska e Supercombo.

## Interruptor e efeito no mundo

O interruptor `base31.br` vem ligado por padrão. Ele mora em `config.base31br`, então vale já na criação do mundo, e o
editor e o `measure.ts` gravam nesse campo. Desligado, nenhum ato do lote estreia. Se for desligado no meio da partida,
os atos que ainda estavam na fila de estreia saem dela.

O lote também não entra nas tabelas de pessoas reais quando o interruptor está desligado:
- o roteiro real (`lineup16`: não inventar carreira para pessoa real) usa uma tabela própria para cada estado do
  interruptor;
- a harmonização de nascimento e morte (`harmonize27`) ignora o lote, para não mudar os dados de quem já existia.

**Goldens:** com o interruptor desligado, r27-p2a, r27-p2b, r27-m3 e r16-playbot ficam iguais. Conferi isso mudando
temporariamente o padrão para desligado. Com o interruptor ligado, r27-p2a e r27-p2b mudam de propósito, porque mais atos
reais estreiam:

| Golden | Antes | Depois |
|---|---:|---:|
| Caixa | 182 589 | 2 850 185 |
| Turnês | 3 575 668 786 | 1 724 144 784 |
| Acts | 1 693 608 899 | 1 632 616 710 |
| RNG | 3 302 724 126 | 4 125 773 869 |

Como o mundo mudou, a turnê de teste do r27-p2b passou a esbarrar na agenda de um integrante que também está em outro ato.
O fixture agora tenta a mesma estrada com mais folga (21, 35 ou 49 dias). O caso "a equipe decide no dia" corre até 2
meses a mais nos dois clones.

## Medição (desempenho do mês e tamanho do save)

Rodei `npx tsx scripts/r31/measure.ts` com 4 sementes × 5 eras e 36 meses por partida, com o interruptor ligado e
desligado. Os arquivos completos são `docs/r31/base-br-medida.md` / `.json` e `base-br-medida-off.md` / `.json`.

| Era | ms/mês desligado → ligado | Save JSON desligado → ligado | gzip |
|---|---:|---:|---:|
| 1900 | 330 → 326 | 3,84 → 3,84 MB | 0,73 → 0,73 MB |
| 1955 | 848 → 862 (+2%) | 6,21 → 6,32 MB (+2%) | 1,21 → 1,26 MB |
| 1990 | 1 649 → 1 613 (ruído) | 10,62 → 10,99 MB (+3%) | 2,12 → 2,23 MB |
| 2012 | 2 343 → 2 523 (+8%) | 13,67 → 14,46 MB (+6%) | 2,69 → 2,85 MB |
| 2030 | 2 654 → 2 823 (+6%) | 13,14 → 14,10 MB (+7%) | 2,50 → 2,68 MB |

Mais atos vivos no mundo custam até 8% de tempo por mês e até 7% de save nas eras modernas. Em 1900 nada muda, porque
nenhum ato do lote estreia nos 36 meses medidos, o que também confirma o determinismo.

O balanço do jogador (mediana de 4 sementes) mudou nas eras de 1955 a 2030, para cima em umas e para baixo em outras:
- patrimônio em 1990: 2,80 → 0,59 mi;
- patrimônio em 2030: 7,39 → 11,82 mi.

O lote não mexe em nenhuma regra econômica, então essa diferença vem da trajetória de cada partida ter mudado com
concorrentes diferentes, não de uma tendência.
