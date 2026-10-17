# R31 · onda 4 · BASE-BR — base brasileira ampliada

**Resultado (3 rodadas): meta atingida.** São 588 atos brasileiros novos, todos com fonte. O Brasil vai de 551 para
**1 139 atos** em REAL_ALL (603 desde 1992). Na integração, o lote só entra com base Enorme (z 3), e a frente DBTAM vai
redistribuir os atos por tamanho de base usando a notoriedade registrada aqui (campo `nt`).

## Como foi feito (3 rodadas)

1. **Busca web, 165 atos.** Fichas completas, com Wikipédia pt/en, Cravo Albin, IMMuB e Discogs. Cada turno tem um
   limite de 200 buscas, dividido entre todos os agentes.
2. **Busca web, uma busca por ato, 172 atos.** Prioridade para os pedidos do dono (LS Jack, Dalto, Hanói-Hanói…) e para
   os nomes mais conhecidos.
3. **MusicBrainz e conferência web, 251 atos.** A API do MusicBrainz passou a responder nesta rede. O coletor
   `scripts/r31/base-br-mb/mbbr.py` segue estas regras:
   - aceita só nome exato com país Brasil; homônimo brasileiro faz o ato ser pulado;
   - estreia = lançamento original próprio mais antigo (álbum, single ou EP, sem coletâneas nem ao vivo);
   - cidade = área de nascimento ou fundação levada à cidade do jogo do mesmo estado;
   - nascimento e morte vêm da ficha do MusicBrainz;
   - fontes = página do MusicBrainz, mais os links do Wikidata e da Wikipédia que ela traz.

   O MusicBrainz costuma não ter 78 rpm e compactos. Por isso a estreia dos 141 atos que estreiam antes de 2000 foi
   conferida com uma busca web cada: 65 estreias foram corrigidas, como Matogrosso & Mathias (1976, e não 1999) e Anjos do
   Inferno (1937, e não 1945). A estreia que não foi conferida fica marcada como aproximada (`ap: d`).

**Mortes que faltavam,** agora corrigidas com fonte: Marinês (2007), Moreira da Silva (2000), Dolores Duran (1959),
Herivelto Martins (1992) e Carlos Galhardo (1985).

**Ficaram de fora 169 candidatos:**
- 120 não têm artista brasileiro com esse nome no MusicBrainz e não foram pesquisados na web.
- 33 não têm lançamento próprio datado.
- 6 são ambíguos (homônimos brasileiros).
- 6 têm discografia incoerente com o nascimento.
- O resto ficou de fora por mérito: compositores sem gravação própria (Catulo, Zequinha de Abreu, Sinhô, Vanzolini) e
  estreias sem confirmação.

A lista completa está em `docs/r31/base-br/_gerado.txt`.

**Pedidos do dono:** Rádio Táxi e LS Jack entraram; Milton Guedes já existia no lote Z.

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

**Por década de estreia (novos / total BR):**

| Década | Novos / total |
|---|---:|
| 1880–1890 | 0 / 2 |
| 1900 | 3 / 5 |
| 1910 | 2 / 5 |
| 1920 | 4 / 8 |
| 1930 | 15 / 25 |
| 1940 | 15 / 18 |
| 1950 | 39 / 50 |
| 1960 | 61 / 110 |
| 1970 | 86 / 143 |
| 1980 | 85 / 141 |
| 1990 | 75 / 162 |
| 2000 | 91 / 160 |
| 2010 | 98 / 239 |
| 2020 | 14 / 71 |

**Por gênero (novos):**
- mpb 48, samba 35, gospel 35
- rock BR 29, forró 27, bossa 25
- MPB nova 22, sertanejo universitário 22, funk carioca 21
- indie 19, choro 18, samba-canção 18, axé 18
- sertanejo 15, fusion 15, pagode 15, jovem guarda 14, brega 13, soul BR 13, hip-hop 13
- trap 10, gaúcho 9, erudito 8, psicodélico 7, reggae 7, thrash 6
- e mais 40 gêneros com 1 a 5 atos cada

**Por cidade do jogo (novos):**
- rio 191, sao_paulo 171
- recife 43, salvador 42, bh 35
- porto_alegre 28, goiania 20
- belem 14, curitiba 13, fortaleza 10, brasilia 8, campinas 7
- sao_luis 4, manaus 1, florianopolis 1

175 fichas têm a cidade real anotada em `lugar`.

**Qualidade:**
- 320 atos têm algum campo aproximado; em 263 deles é a estreia.
- Notoriedade (`nt`): anos de carreira em todos os atos; número de álbuns e de lançamentos do MusicBrainz em 505 atos.
  Hits e certificações não estão em nenhuma das fontes acessíveis daqui (Pró-Música e as paradas ficaram fora do
  alcance) e ficam para a DBTAM.

## Fontes

1 592 referências:

| Fonte | Referências |
|---|---:|
| dicionariompb.com.br (Cravo Albin) | 361 |
| pt.wikipedia.org | 361 |
| musicbrainz.org | 253 |
| en.wikipedia.org | 239 |
| wikidata.org | 195 |
| discogs.com | 116 |
| immub.org | 67 |

## Interruptor e efeito no mundo

O interruptor `base31.br` vem ligado por padrão. Ele mora em `config.base31br`, então vale já na criação do mundo, e o
editor e o `measure.ts` gravam nesse campo. Desligado, nenhum ato do lote estreia. Se for desligado no meio da partida,
os atos que ainda estavam na fila de estreia saem dela.

O lote também não entra nas tabelas de pessoas reais quando o interruptor está desligado:
- o roteiro real (`lineup16`: não inventar carreira para pessoa real) usa uma tabela própria para cada estado do
  interruptor;
- a harmonização de nascimento e morte (`harmonize27`) ignora o lote, para não mudar os dados de quem já existia.

**Goldens (mundo combinado depois da integração BR, IT e HITS):** com o BR desligado, r27-p2a e r27-p2b voltam aos
valores da integração com IT e HITS: caixa 2 343, turnês 1 382 068 899 e rng 2 898 923 487. Os atos diferem só pelo número
de catálogo dos atos IT e HITS, que vêm depois do lote BR na ordem combinada. Descontado esse deslocamento, o hash é
3 720 502 148, o mesmo da integração (conferido). Com o BR ligado:

| Golden | Integração (sem BR) | Com BR |
|---|---:|---:|
| Caixa | 2 343 | 452 809 |
| Turnês | 1 382 068 899 | 4 058 172 360 |
| Acts | 3 720 502 148 | 3 810 020 408 |
| RNG | 2 898 923 487 | 4 020 433 329 → 2 332 586 623 |

A linha do RNG mostra antes o valor do BR sem IT e HITS (4 020 433 329) e depois o do mundo combinado (2 332 586 623).
r27-m3 não muda.

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

## Medição (desempenho do mês e tamanho do save, 337 atos; antes da regra z 3)

A medição foi feita antes de a integração receber as bases IT e HITS. Os números comparam só o lote BR ligado e
desligado.


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

**Depois da integração (z 3):** o lote só entra com base Enorme, então os goldens da base padrão voltaram aos de antes
das bases, e esta rodada não mexe neles. O r14-db (base Enorme) já falhava na integração com 3 471 ms/mês contra o
limite de 3 000, antes dos 251 atos desta rodada, e mediu o mesmo valor depois deles. O redimensionamento é da DBTAM e da
onda 6.
