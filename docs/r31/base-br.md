# R31 · onda 4 · BASE-BR — base brasileira ampliada

**Resultado (2 turnos de pesquisa):** 337 atos brasileiros novos, todos com fonte verificada nas buscas. O Brasil vai de
551 para **888 atos** em REAL_ALL (464 desde 1992), e a base inteira vai de 3 483 para 3 820 atos.
**Meta (≥ 1 000): faltam cerca de 112.** Ainda há 410 candidatos listados à espera de pesquisa, então mais um turno de
buscas passa da meta.

## Por que não chegou a 1 000 (e como continuar)

As fichas vêm de buscas na web: Wikipédia pt/en, Dicionário Cravo Albin da MPB, IMMuB e Discogs. As APIs do Wikidata e do
MusicBrainz e o acesso direto às páginas estão bloqueados nesta rede. Cada turno tem um limite de 200 buscas, dividido
entre todos os agentes.
- **1º turno:** 165 fichas.
- **2º turno:** 172 fichas, com uma busca por ato e prioridade para os nomes mais conhecidos e os pedidos do dono.

Nada foi preenchido de memória. Os pendentes estão em `docs/r31/base-br/*.jsonl` com `"status":"skip"` e o motivo
"limite de buscas".

Para continuar:
1. Mande uma nova mensagem à sessão.
2. Os agentes pesquisam os `skip` pendentes.
3. Rode `npx tsx scripts/r31/base31br-gen.ts`.
4. Rode `tests/r31-base-br.test.ts` e suba o piso de contagem.

**Ficaram de fora por mérito** (pesquisados, sem dado confirmável ou sem gravação própria):
- Só compositores: Catulo da Paixão Cearense, Zequinha de Abreu, Sinhô, Paulo Vanzolini e Zé Kéti. Do Zé Kéti, a fonte
  só confirma uma composição gravada por outros em 1946.
- Sem a primeira gravação documentada: Heitor Villa-Lobos, Bidu Sayão, Guiomar Novaes, Nelson Freire e João Carlos Martins.
- Estreia sem confirmação: DJ Marky, Naiara Azevedo, Pablo do Arrocha, Plutão Já Foi Planeta e Mestre Lucindo.

**Pedidos do dono:**
- Rádio Táxi: entrou, estreia em 1982.
- LS Jack: entrou, com o álbum *LS Jack* (1999), "Você Chegou" e *V.I.B.E.* (2002).
- Milton Guedes: já existia, no lote Z.
- "E mais": também entraram Dalto, Hanói-Hanói, Yahoo, Byafra, Marjorie Estiano, Hori, Afrodite se Quiser e Inimigos da HP.
  O Inimigos da HP é pagode, e não rock.

## Como o dado entra (regras de confiabilidade)

- **Uma ficha por ato** em `docs/r31/base-br/*.jsonl`. Cada ficha tem fontes (URLs), apelidos, campos a confirmar e a
  cidade real quando o jogo não tem a cidade. O gerador `scripts/r31/base31br-gen.ts` faz estas verificações e descarta o
  campo que falha em alguma delas:
  - gênero e cidade existem;
  - o gênero já existia até 6 anos depois da estreia (mesma regra do r19-data-base);
  - estreia ≤ obra ≤ fim;
  - o artista solo nasceu antes da estreia e morreu depois dela;
  - cada integrante nasceu antes de entrar e estava vivo ao entrar.

  As correções automáticas desta rodada (3 nascimentos em conflito com a base) estão em `docs/r31/base-br/_gerado.txt`.
- **Nada chutado.** Um campo em dúvida fica omitido ou marcado com `ap` (aproximado). O ato continua no modo exato, e a
  ficha mostra "aproximado". Os números estão em Contagem.
- **Dados que um agente completou de memória.** Um dos agentes preencheu algumas mortes e anos de discos sem fonte nas
  buscas. Esses dados ficaram marcados em `confirmar` e com `ap: x`: Johnny Alf, Sylvia Telles, Oscar Castro-Neves,
  Walter Wanderley, Miúcha, Monarco e os integrantes do Tamba Trio e do Zimbo Trio.
- **Estreia em disco coletivo ou de banda anterior** está anotada em `confirmar`. Por exemplo: Candeia com os Mensageiros
  do Samba, Monarco com a Velha Guarda, Ed Motta com a Conexão Japeri e Leoni com o Kid Abelha.
- **Sem gênero novo.** Tudo foi mapeado para gêneros que já existem. Caipira de raiz anterior a 1954 (Inezita Barroso)
  ficou em `modinha`, porque o sertanejo do jogo nasce em 1960.
- **Sem duplicata.** O teste compara o lote com REAL_ALL (dedupKey27), com o catálogo clássico e com as bandas de ficção.
- **Dados ausentes ficam ausentes.** Quando a busca não trouxe a morte, o ato aparece como ativo, e isso fica anotado em
  `confirmar` para a próxima rodada: Marinês, Zé Kéti (que ficou de fora), Moreira da Silva, Dolores Duran, Herivelto
  Martins e Carlos Galhardo. Cidade que a busca não trouxe fica com a sugestão da lista e a nota "cidade não confirmada".

## Contagem

**Por década de estreia (novos / total BR depois do lote):**

| Década | Novos / total |
|---|---:|
| 1880–1890 | 0 / 2 |
| 1900 | 3 / 5 |
| 1910 | 1 / 4 |
| 1920 | 4 / 8 |
| 1930 | 13 / 23 |
| 1940 | 10 / 13 |
| 1950 | 33 / 44 |
| 1960 | 41 / 90 |
| 1970 | 47 / 104 |
| 1980 | 51 / 107 |
| 1990 | 41 / 128 |
| 2000 | 41 / 110 |
| 2010 | 49 / 190 |
| 2020 | 3 / 60 |

**Por gênero (novos):**
- mpb 27, samba 21, bossa 20, gospel 19
- samba-canção 15, axé 15, forró 14, rock BR 14, funk carioca 14
- choro 12, jovem guarda 11, indie 11, sertanejo universitário 11, sertanejo 10
- gaúcho 9, pagode 9, soul BR 7, MPB nova 6
- modinha, frevo, marchinha, bolero e house: 5 cada
- punk, pop rock, reggae, heavy metal, hip-hop, alt rock e funk ostentação: 4 cada
- e mais 22 gêneros com 1 a 3 atos cada

**Por cidade do jogo (novos):**
- rio 124, sao_paulo 89
- salvador 27, recife 26
- porto_alegre 17, bh 15, goiania 13
- curitiba 7, fortaleza 6, campinas 5, brasilia 5
- belem 2, sao_luis 1

127 fichas têm a cidade real anotada em `lugar`, quando o jogo não tem a cidade ou quando ela foi aproximada.

**Qualidade dos dados:**
- 168 atos têm algum campo marcado como aproximado (`ap`), e um tem `exact: false` (Victor Ruiz).
- 16 atos têm t 2: Emilinha Borba, Dircinha Batista, Jamelão, Carlos Galhardo, Aline Barros, Padre Marcelo Rossi, Padre
  Fábio de Melo, Leonardo, Mano Brown, Alexandre Pires e outros. Os demais têm t 3, e nenhum tem t 1.

## Fontes

863 referências, de 1 a 4 por ato:

| Fonte | Referências |
|---|---:|
| pt.wikipedia.org | 284 |
| dicionariompb.com.br (Cravo Albin) | 267 |
| en.wikipedia.org | 177 |
| discogs.com | 87 |
| immub.org | 48 |

As URLs de cada ato estão em `BR31_NOTES` (`src/data/base31br.ts`) e na ficha de curadoria `CURBR31`.

## Interruptor e efeito no mundo

O interruptor `base31.br` vem ligado por padrão. Ele mora em `config.base31br`, então vale já na criação do mundo, e o
editor e o `measure.ts` gravam nesse campo. Desligado, nenhum ato do lote estreia. Se for desligado no meio da partida,
os atos que ainda estavam na fila de estreia saem dela.

O lote também não entra nas tabelas de pessoas reais quando o interruptor está desligado:
- o roteiro real (`lineup16`: não inventar carreira para pessoa real) usa uma tabela própria para cada estado do
  interruptor;
- a harmonização de nascimento e morte (`harmonize27`) ignora o lote, para não mudar os dados de quem já existia.

**Goldens:** com o interruptor desligado, r27-p2a, r27-p2b, r27-m3 e r16-playbot voltam aos valores de antes do lote
(182 589 / 3 575 668 786 / 1 693 608 899 / 3 302 724 126), conferido nos dois turnos. Ligado, r27-p2a e r27-p2b mudam de
propósito, porque mais atos reais estreiam:

| Golden | Antes | Depois |
|---|---:|---:|
| Caixa | 182 589 | 9 071 |
| Turnês | 3 575 668 786 | 283 887 455 |
| Acts | 1 693 608 899 | 1 695 895 254 |
| RNG | 3 302 724 126 | 4 020 433 329 |

O caixa do bot nesta semente oscila centenas de milhares de mês a mês, como já estava anotado no UNI-4.

- **r16-playbot:** a semente pb-11 deixou de ter todas as ações no 1º ano. Na varredura pb-1 a pb-16, 6 sementes têm todas
  as ações (pb-2, 5, 8, 10, 12 e 13), e o teste passou a usar a pb-10.
- **r27-p2b:** a turnê de teste esbarrava na agenda de um integrante que também está em outro ato. O fixture agora tenta a
  mesma estrada com 21, 35 ou 49 dias de folga, e o caso "a equipe decide no dia" corre até 2 meses a mais.

**Integrantes:** quando falta a data de um integrante, ele recebe as datas da mesma pessoa que já tem ficha, na base
anterior ou como solo deste lote. Por exemplo, Pixinguinha e Donga nos Oito Batutas, e Jacob do Bandolim no Época de Ouro.
Só vale com idade plausível (14 anos ou mais ao entrar), para não confundir homônimos: o Armandinho d'A Cor do Som não é o
Armandinho do reggae. Conflito de nascimento com a base fica omitido e anotado:
- Saulo Fernandes: 1977 contra 1973 na Banda Eva.
- Solange Almeida: 1974 contra 1976 no Aviões do Forró.
- Alexandre Pires: 1976 contra 1975 no Só Pra Contrariar.

## Medição (desempenho do mês e tamanho do save, 337 atos)

Rodei `npx tsx scripts/r31/measure.ts` com 4 sementes × 5 eras e 36 meses por partida, com o interruptor ligado e
desligado. Os arquivos completos são `docs/r31/base-br-medida.md` / `.json` e `base-br-medida-off.md` / `.json`.

| Era | ms/mês desligado → ligado | Save JSON desligado → ligado | gzip |
|---|---:|---:|---:|
| 1900 | 305 → 305 | 3,84 → 3,84 MB | 0,73 → 0,73 MB |
| 1955 | 759 → 814 (+7%) | 6,21 → 6,47 MB (+4%) | 1,21 → 1,28 MB |
| 1990 | 1 514 → 1 695 (+12%) | 10,62 → 11,71 MB (+10%) | 2,12 → 2,35 MB |
| 2012 | 2 167 → 2 496 (+15%) | 13,67 → 15,20 MB (+11%) | 2,69 → 3,01 MB |
| 2030 | 2 400 → 2 928 (+22%) | 13,14 → 14,79 MB (+13%) | 2,50 → 2,84 MB |

Mais atos vivos no mundo custam até 22% de tempo por mês e até 13% de save nas eras modernas. Em 1900 nada muda, porque
nenhum ato do lote estreia nos 36 meses medidos, o que também confirma o determinismo.

**Atenção:** em 2030 o tempo médio ficou em 2 928 ms/mês, perto do limite de 3 000 ms/mês do r14-db. Mais um turno de
atos deve passar desse limite, e o desempenho já está marcado para a onda 6 (FIM-7).

O balanço do jogador (mediana de 4 sementes) mudou nas eras de 1955 a 2030, para cima em umas e para baixo em outras:
- patrimônio em 1990: 2,80 → 1,59 mi;
- patrimônio em 2030: 7,39 → 12,34 mi.

O lote não mexe em nenhuma regra econômica, então essa diferença vem da trajetória de cada partida ter mudado com
concorrentes diferentes, não de uma tendência.
