# R29 CONNECT — o que não estava conectado (dados, vistas e mecânica)

Ramo `claude/r29-connect`, a partir de `claude/friendly-brown-vpsmfl` (Masters_28). Pedido do autor: "verificar tudo que
não está conectado, como no exemplo acima (Roger Waters ex-Led Zeppelin), e arrumar isso"; depois ampliado para a
mecânica inteira (o que deveria influenciar o quê e não influencia).

Resumo:
- **Causa raiz do caso Roger Waters**: índice nome → pessoa velho (`rw.pid`) — corrigido; 0 entradas velhas em 20 mundos.
- **Fonte canônica pessoa ↔ ato** (`src/sim/sys/connect29.ts`): Carreira, Trajetória, Alma/Bandas, crônica da pessoa e
  Ex-integrantes do ato leem a MESMA coisa. Ex-integrante fora da ficha da pessoa: **9083 → 0** (80 combinações).
- **Mecânica**: 7 arestas mortas na sonda A×B → 0. As maiores: os departamentos pagos da sede (Marketing, Agência de
  shows, Digital) não faziam nada; estresse/equipe/química eram apagados da nota de toda gravação.
- Auditoria (`scripts/audit29connect.ts`), sonda (`scripts/probe29mech.ts`), testes (`tests/r29-connect.test.ts`),
  capturas (`docs/shots29/antes|depois`).

---

## 1. O caso Roger Waters × Led Zeppelin — causa raiz

Os dados reais estão certos (Roger Waters só está no Pink Floyd em `src/data/realacts_classic.ts`; o Led Zeppelin não o
cita). O defeito era de **ligação**:

1. `realworld.ts` guarda em `rw.pid` um índice **nome canônico → id da Pessoa** ("a mesma pessoa em banda, solo e
   supergrupo").
2. O nome de uma Pessoa muda depois de indexado: em `decorate`, o integrante gerado `old[i]` é reaproveitado **pela
   posição** e renomeado (`p.name = name`) — quando a ordem de `REAL_ACTS[n].members` (worldgen) difere da de
   `REAL_CLASSIC[n].m`, quem foi indexado como "Jeremy Spencer" vira "Mick Fleetwood". O `kin15` também renomeava
   pessoas reais com sobrenome de "banda de irmãos" ("Marc Bolan" → "Marc Watts", "Ray Charles" → "Ray James").
3. `canonical()` confiava no índice: "jeremy spencer" → a Pessoa que agora se chama Mick Fleetwood; nascimento a ±1 ano
   bastava. Resultado: a vaga de um real ia para **outra pessoa real** (e no caminho de banda ela entra **sem ser
   renomeada**) — é assim que alguém aparece como (ex-)integrante de uma banda em que nunca esteve, e a bio/atos de
   carreira dela (que vêm dos dados reais e de outra fonte) não mencionam. Também partia identidades: "mick fleetwood"
   virava **duas Pessoas** (R8).

Correção (mínima):
- `canonical()` valida: se a Pessoa indexada não tem mais aquele nome canônico, a entrada é descartada (e refeita).
- `decorate` mantém o índice ao renomear o reaproveitado.
- `kin15.generate` não cria "banda de irmãos" (nem sobrenome) quando há pessoa real (`real27`) no ato (só com nomes
  reais; a checagem vem depois do sorteio, a sequência do RNG não muda).

Medido (`r29c-0`, ano 0, 5 inícios × 4 mundos): entradas velhas no índice 1–5 por mundo → **0**; depois de 6 anos,
o kin15 recriava 1–3 (R9) → **0**.

### 1b. "The Jackson 5" que nunca virava "The Jacksons" (r10-fixes, r16-lineups)

Mesma família de defeito (identidade/ligação dependente de ordem). Os renomes reais (`RENAMES16`) e a marcação "ato já
existia no início" (`l16.boost`, que impede a fama herdada no 1º mês) rodavam no gancho `newgame` do lineup16 — que só
vê os atos que já existem. Há um ciclo de imports realworld ↔ lineup16: com os imports de um teste (bot, tick, worldgen,
realworld) o gancho do lineup16 era registrado ANTES do realworld (medido: posição 16 × 40 de 41), então rodava antes de
os atos reais existirem — sem renome ("The Jackson 5" em 1985) e com os atos reais do início ganhando fama herdada no
1º mês. Com outra ordem de imports o mundo saía diferente (outros ids, renome acontecendo).

Correção: `src/sim/sys/after29.ts` (módulo sem imports) guarda `RW_AFTER_NEWGAME`; o gancho do realworld chama a lista no
fim do seu newgame e o lineup16 se registra nela (o gancho antigo fica; as duas operações são idempotentes). Agora a
ordem é a mesma em qualquer combinação de imports. `tests/r10-fixes` e `tests/r16-lineups` voltam a passar (falhavam
na base desde o merge 5ba47ed). Muda o mundo de propósito (golden em §6).

## 2. Vistas que liam fontes diferentes — fonte canônica

| Vista | Lia antes | Lê agora |
|---|---|---|
| Ficha → Carreira → "Atos:" | só `act.members` (ex-bandas sumiam) | `careerActs29` |
| Ficha → Alma → "Bandas:" | `chron9.mem` (só atos ativos/notáveis desde o início da run) | `careerActs29` |
| Ficha → Alma → "Na crônica" / Lendas → Vida | `biography` (passagens de `chron9.mem`) | `biography29` (passagens de `careerActs29`) |
| Ficha → Trajetória (e "outros atos" na Formação) | `path16` (members + former + log) | `careerActs29` (+ crônica; falecido não é "atual") |
| Ato → Integrantes → Ex-integrantes | `rw.former` | `exMembers29` (mesmo índice) |

`careerActs29`/`exMembers29` (`src/sim/sys/connect29.ts`) montam um índice só de leitura (cache por semana) com
`act.members` + `rw.former` + log de formação (`lineup16`) + `chron9.mem`; as duas pontas leem dele, então
"ex-integrante de X na página de X" ⇔ "X nos atos de carreira da pessoa" **por construção**. Nada da simulação lê o
índice (o `former` continua alimentando a fama herdada como antes).

Outros consertos de dados no mesmo caminho:
- **Créditos de composição** (`decorate`): músicas criadas pela formação provisória do worldgen ficavam creditadas a
  Pessoas apagadas (R7, "compositor inexistente") ou a quem já tinha saído (R7m: Syd Barrett em "Breathe (In the Air)"
  de 1975). Passam para quem ocupou a vaga / formação atual — ou para os compositores reais quando a obra está em
  `WORKS27`. Parceiros reais de fora (`real27.writer`) ficam.
- **Formação (stints16)**: saída simulada não fecha mais uma passagem documentada que só começa depois ("Richard Wright
  1980–1972", "Phil Rudd 1994–1983"); substituto gerado não "entra" antes de nascer.
- **Fatos com a pessoa**: `remember(..., { pid })` (novo campo opcional) — entradas/saídas de formação viram fato/crônica
  com a pessoa como ator (antes só o ato; quem saiu não via a própria saída na ficha). Relíquia cita a pessoa dona
  (`relics17`); eleição de ídolos cita quem ficou em último; fatos do ato incluem os que só citam um integrante
  (prisão, crime, caridade).

## 3. "Escrito e nunca mostrado" — ligações novas (sem redesenhar telas)

Aba **Conexões** (pessoa e ato, `src/ui/sys/connect29.ts`), só leitura:
- **Correio**: mensagens que citam a pessoa/o ato (mesmo reconhecimento de entidades da caixa de entrada `ents27`).
- **Promessas** feitas à pessoa: abertas, cumpridas e quebradas (antes só as abertas, no card do elenco).
- **Relíquias e prêmios** da pessoa e dos atos da carreira (a página do ato tinha; a da pessoa não).
- **Submundo**: organização ligada ao ato (`crime17.ties`), rixas e ocorrências do registro do crime.

Selo (dossiê): aba **Fatos e rivalidade** — fatos do barramento com o selo como ator e a memória da rivalidade
(`rivalMemory27`: mágoa, lembranças datadas, cópias) que só aparecia como um número.

Álbum de cenas: as cenas animadas (cut27) que tocaram também precisavam ir para o álbum — a rodada r29-cenas fez isso em
paralelo (`src/ui/ps/album29.ts`, `log29`); no merge fica só a versão dela (uma fonte, sem duplicar).

Diário "Só marcantes": troca de formação dos **seus** atos é marco (antes só passava com fama > 25–30).

## 4. Mapa de dependências e sonda de mecanismos

Mapa (quem lê/escreve) levantado por leitura do código (`registerMod`, `perk()`, ganchos). Pontos estruturais:
- O **apelo** é calculado UMA vez, na estreia (`computeAppeal`, market.ts) — modificador de apelo cuja entrada muda
  depois da estreia não tem efeito naquele disco.
- **Shows simples** (`playGigs`, live.ts) não passam pelos modificadores de show; só as paradas de turnê (tours.ts).
- Bônus empilhados têm teto (caps18: `MOD_CAP18`, `PERK_CAP18`).

`scripts/probe29mech.ts`: mesma semente, estado A × estado B (B = A com UMA entrada mexida), mede a saída esperada em
funções puras. |Δ| < 0,2% = morta; < 3% = fraca. Semente `r29m`, 1985, um ato seu com single lançado.

| aresta | de → para | antes | depois |
|---|---|---|---|
| E1a | escândalo (gênero rebelde) → vendas semanais | +6,0% (Streisand, intencional) | +6,0% |
| E1b | escândalo → público/bilheteria | −9,7% conectada | −9,7% |
| E1c | escândalo (rebelde, efeito ≤ 55) → apelo do próximo disco | +1,7% fraca (fama regional esquenta) | +1,7% |
| E1d | escândalo (não rebelde) → vendas semanais | −5,0% conectada | −5,0% |
| E1e | escândalo (não rebelde) → apelo do próximo disco | **0% MORTA** | **−14,8%** |
| E2 | jabá → vendas semanais | +28% conectada | +28% |
| E3 | publicitário melhor → alcance do marketing | +7,2% conectada | +7,2% |
| E3b | produtor melhor → nota da gravação | +6,2% conectada | +6,2% |
| E4a | sede: Marketing e promoção → apelo | **0% MORTA** | **+9,0%** |
| E4b | sede: Agência de shows → bilheteria | **0% MORTA** | **+15%** |
| E4c | sede: Digital e dados → vendas semanais | **0% MORTA** | **+12%** |
| E4d | sede: Estúdio interno → nota da gravação | +1,6% fraca | +1,6% fraca |
| E5 | fãs núcleo → demanda na cidade | +16% conectada | +16% |
| E6 | prêmios do selo → aceite de oferta | **0% MORTA** | **+10%** (placar) |
| E7 | estresse → modificador songQ | −6% | −6% |
| E7b | estresse → nota da gravação de verdade | **0% MORTA** | **−6%** |
| E8 | guerra/crise → tamanho do mercado | −30% conectada | −30% |
| E10 | confiança → chance de renovar | +33% conectada | +33% |
| E11a | reputação comercial → aceite de oferta | +2,4% fraca | +2,4% fraca |
| E11b | reputação artística → aceite de oferta | +3,3% conectada | +3,3% |
| E12 | momentum → apelo | +17% conectada | +17% |
| E14 | cena da cidade → demanda | +26% conectada | +26% |
| E16 | sua resenha (crítico) → vendas semanais | **0% MORTA** | **+10%** |

Consertos (cada um mínimo e aditivo):
- **Perks fracionários mortos** (`src/sim/sys/perks29.ts`): `appeal`, `chartUnits`, `showRevenue`, `pressingCost` eram
  escritos por departamentos e filiais da sede (hq6), cartas (cards6), cenários (scenarios17/23), agenda17, social8,
  era1889… e mostrados na interface, mas nada da simulação lia `perk(s, 'appeal')` etc. Viram modificadores registrados
  (aparecem na autópsia), só nos atos do jogador; teto de sempre.
- **songQ depois dos ganchos de gravação** (`production.ts`): instrumentos, mobília, saúde, temperamento, talento e
  marcos recalculam `song.q` a partir dos atributos no gancho `record` — e apagavam TODOS os modificadores `songQ`
  (estresse, equipe da casa, química, engenheiro, perks…). Agora a cadeia de modificadores roda depois dos ganchos.
- **Escândalo → próximo disco** (`src/sim/sys/mech29.ts`): disco lançado até 26 semanas depois de escândalo pesado
  (efeito ≥ 40, gênero não rebelde) estreia com apelo menor (até −15%). NPC também.
- **Prêmios → ofertas** (`mech29.ts`): prêmios do selo nos últimos 5 anos viram prestígio (perk `offer`, que
  `evaluateOffer` já lê): +0,012 por prêmio, até +0,06.
- **Sua resenha** (`press18.ts`): a nota sai depois da estreia (o mod de apelo nunca pegava); vale nas vendas das
  primeiras 12 semanas.
- **Previsão de renovação** (`explain12.renewChance`): usava só um dos ganchos de renovação; agora soma os mesmos da
  rolagem (`renewHooks29`) — a faixa mostrada e a chance real batem.

## 5. Auditoria pessoa ↔ ato ↔ bio ↔ formação

`npx tsx scripts/audit29connect.ts --seeds 2 --years 0,6` — sementes `r29c-0/1` × inícios 1950, 1962, 1975, 1990,
2005 × mundos random/exact/real/chaos × (ano 0 e +6 anos) = 80 medições. Códigos (`src/sim/audit29.ts`):

- R1 pessoa real em ato real que nunca a teve, sem troca simulada; R1s idem, explicada pela simulação (informativo);
- R2c/R2a/R2t ex-integrante fora da Carreira / Alma / Trajetória da pessoa;
- R3 ato de carreira cuja página não lista a pessoa (antes da R29 o R3 media "só na crônica", hoje R3l);
- R4 datas (passagem invertida, entrada antes de nascer); R5 parentesco assimétrico/romance órfão;
- R6 falecido mostrado como integrante atual; R7 compositor inexistente; R7m crédito a quem já tinha saído;
- R8 identidade partida (mesma pessoa real em duas Pessoas); R9 índice nome → pessoa velho.

Totais nas 80 medições (antes = base friendly-brown com as vistas antigas; depois = r29-connect):

| código | o que é | antes | depois |
|---|---|---|---|
| R1 | real em banda real sem registro | 0 | 0 |
| R2c | ex-integrante fora de Carreira → Atos | **9083** | **0** |
| R2a | ex-integrante fora de Alma → Bandas (bio) | **8126** | **0** |
| R2t | ex-integrante fora da Trajetória | 0 | 0 |
| R3 | ato de carreira cuja página não lista a pessoa | — | 0 |
| R4 | datas impossíveis (passagem invertida, entrada antes de nascer) | **78** | **0** |
| R5 | parentesco assimétrico / romance órfão | 0 | 0 |
| R6 | falecido mostrado como integrante atual | **302** | **0** |
| R7 | compositor(a) inexistente | **48** | **0** |
| R7m | crédito para quem já tinha saído antes de compor | (não medido) | **0** |
| R8 | mesma pessoa real em duas Pessoas | **6** | **0** |
| R9 | índice nome → pessoa velho | 26 no ano 0 (`r29c-0`, 20 mundos) | **0** |
| R1s | troca simulada põe real em banda real (história alternativa; informativo) | 57 | 67 |
| R3l | passagem só na crônica (log de formação não pegou; informativo, já coberto por connect29) | 106¹ | 103 |

¹ Na base esse número era o "R3" antigo (mesma medida). R1s/R3l não são erros: são o que a simulação faz na história
alternativa e o que o índice canônico já junta. Antes, por início (ano 0 / +6 anos): R2c 71/113 (1950), 143/237 (1962),
670/830 (1975), 1346/1619 (1990), 1828/2226 (2005); R6 30 (1975) → 168 (2005) no ano 0. Depois: zero em todos os
códigos de erro, em todos os inícios, mundos e nos dois instantes.

Medido no commit 6283222 (antes do §1b e do merge); confirmação na cabeça final em `r29c-0` (40 medições): R1s 37, R3l 42 (informativos), 0 em todos os códigos de erro depois de dois refinamentos da própria
auditoria: R7m acusava 3 créditos legítimos (obra real com autor documentado em lançamento posterior — "Another Brick in
the Wall, Pt. 2" de Roger Waters numa coletânea de 1995; "Under Pressure" de Mercury/Deacon) e R8 acusava 1 homônimo
(pessoa gerada que o gerador de nomes chamou de "Wilson" + "Batista", nascida em 1986 — não é o compositor de 1913).

## 6. Determinismo, golden e equilíbrio

Mundo mudado **de propósito**, em duas etapas. Golden re-medidos com comentário em `tests/r27-p2a.test.ts` e
`tests/r27-p2b.test.ts` (semente `r16pb-5`, 1975, 8 meses de playbot):

| | caixa | tours | acts | rng |
|---|---|---|---|---|
| antes da R29 | 446096 | 1382068899 | 4292160800 | 2262769409 |
| perks religados, songQ depois dos ganchos, escândalo → disco, prêmios → prestígio | 427926 | igual | 1063419696 | igual |
| + ganchos de início em ordem fixa (§1b) | 252 | igual | 2817744560 | 1576372716 |

O merge com friendly-brown (cenas/arte/reorg/fixes) não muda esses números. `r27-m2`: com o mundo novo, o fixture
`r16pb-7` quebra antes do show jogável e `r16pb-4` (o antigo) fecha com um rival na mesa; o fixture passa a `r16pb-8`
(show no 9º mês). O teste "proposta generosa fecha" agora põe no caixa o adiantamento de 6× que oferece — o ato aceitava
("Eles topam"), mas o caixa livre do fixture não cobria (na base, `r16pb-4` dá o mesmo 'sniped'/'lost': sensível ao
fixture, não à R29). As correções de dados/vistas
(índice, connect29, créditos, kin15, stints16) não mexem nesses golden. A sonda e a auditoria não avançam o tempo nem
tocam no estado.

Equilíbrio — `tools/balance19.ts --quick --seeds 12` (bot equilibrado, 3 anos, base pequena, mesmas 12 partidas):

| | quebra | caixa mediano | patrimônio mediano | fama | prestígio | escândalos |
|---|---|---|---|---|---|---|
| antes (base friendly-brown) | 33% | 43k | 1,07 mi | 11 | 59 | 34 |
| depois, sem os perks religados | 17% | 32k | 1,42 mi | 11 | 60 | 35 |
| depois (tudo) | 17% | 18k | 2,37 mi | 11 | 60 | 35 |

Leitura: a maior parte da alta do patrimônio vem dos **perks que passaram a valer** (departamentos da sede, cartas,
origem — bônus que o jogo já anunciava). A queda de quebras (33% → 17%) aparece nas duas variantes: uma partida de 1889
(b19-8) deixa de quebrar porque o mundo diverge — com 12 partidas é ruído de uma partida. Por era: 1955/1975 sobem,
2005 cai (b19-3 3,46 → 1,58 mi; b19-7 4,49 → 2,45 mi). Fama, prestígio e escândalos ficam iguais. Para calibrar sem
desligar a ligação há um botão: `PERKS29_SCALE.k` em `src/sim/sys/perks29.ts` (1 = valor anunciado).

## 7. Testes

`tests/r29-connect.test.ts` (10 testes): auditoria sem achados em 4 combinações (semente × início × mundo); índice
nunca aponta para outro nome (9 mundos); ex-integrante ⇔ carreira (Syd Barrett/Pink Floyd); um ano em Caos sem R8/R9;
estresse baixa a nota da gravação; departamentos da sede mexem em apelo e vendas; previsão de renovação com os ganchos.

Rodados (lotes pequenos, `--poolOptions.forks.maxForks=2`): `r29-connect` (10/10), `r27-p2a` (18/18), `r27-p2b`
(21/21), `r27-m2` (12/12), `r10-fixes`, `r16-lineups`, `r27-audit`, `r27-consistency`, `r15-kin`, `r16-links`, `r17-foundation`, `r25-kin` — todos
verdes. `r16-lineups` e `r10-fixes` (Michael Jackson / The Jacksons), que **falhavam na base**, passam (§1b). Depois do merge
com friendly-brown: `r29-art`, `r29-fixes`, `r29-reorg`, `r29-scenes`, `r9-bonds`, `r27-aud2` também verdes (77/77).
`tsc --noEmit` limpo.

## 8. Capturas

`docs/shots29/antes/` × `docs/shots29/depois/` (semente `r29c-0`, 1975, nomes reais; `scripts/shots29connect.mjs`):
- `pessoa-syd-carreira.png`: "Atos: Syd Barrett" → "Atos: Pink Floyd, Syd Barrett".
- `pessoa-syd-alma.png`: sem "Bandas:" → "Bandas: Pink Floyd (1964–1968) → Syd Barrett (1969–)".
- `pessoa-syd-trajetoria.png`, `ato-pinkfloyd-integrantes.png`, `pessoa-syd-conexoes.png`, `pessoa-petergreen-carreira.png`.

## 9. Lacunas (não feitas aqui)

- **Saves antigos** com a vaga já trocada (pessoa real errada dentro de outra banda) não são reparados: a correção vale
  daqui para frente (novos atos e novas entradas). Um reparo exigiria reescrever formações salvas.
- **Shows simples** (`playGigs`) não passam pelos modificadores de show (escândalo, poder de compra, facções, perks de
  bilheteria só valem na turnê). Ligar mexe no equilíbrio do bot inteiro — fica para uma rodada de balanço.
- **Apelo congelado na estreia**: efeitos que chegam depois (censura que tira território, cena que esquenta no mês da
  estreia — o "ride" do scenes27 registra depois do cálculo) só pegam nas vendas semanais/regionais.
- **Reputação → ofertas** segue fraca (comercial +2,4% com +30 pontos); preço do adiantamento não lê reputação.
- **Estúdio interno** da sede (+0,8 ponto de songQ por nível) é fraco por desenho (pontos, não %).
- **Escândalo/apelo** só no gênero não rebelde; no rebelde vale o efeito Streisand (intencional).
- **Mercado de canções**: a origem da canção comprada (licença × obra × presente) continua só na página do mercado.
- O índice de dependências completo (todas as ~140 fontes de `registerMod`) não foi sondado; a sonda cobre as 23
  arestas de maior impacto listadas pelo autor.
- **Homônimos gerados**: o gerador de nomes pode produzir o nome de uma pessoa real famosa para alguém inventado
  ("Wilson Batista", 1986, no SNJ). Não parte a identidade (a auditoria ignora quem não é real), mas confunde na tela.
- `R1s` (troca simulada põe pessoa real em banda real na história alternativa) é comportamento da simulação, não erro;
  segue informativo.


---

## 10. Conectar tudo (13 sistemas)

Pedido do autor: "TUDO deve estar conectado" — cada sistema lê e influencia os outros que deveria, nos dois sentidos
quando faz sentido. O "Mapa das conexões" da wiki agora sai da **medição**, não de uma lista escrita à mão.

### Como mede (`src/sim/probe29all.ts`, `scripts/probe29all.ts`)
- 13 sistemas do jogo: Dinheiro, Reputação, Imprensa, Projetos, Ao vivo, Sede, Fama, Mundo, Vida, Contratos, Prêmios,
  Submundo e **Público por idade e região** (`demo29`, chegou da sessão de demografia e entrou como 13º sistema).
- **22 empurrões** (entradas de cada sistema: caixa rico/quase zero, +25 de reputação, escândalo, resenha boa, single
  melhor, série de shows, sede nível 2 + equipe, +fama, crise/moda/dez anos depois, elenco estressado, confiança alta e
  baixa, rival em guerra, 4 prêmios, jabá, calor policial, público jovem / público maduro) × **43 saídas** (apelo, vendas, receita e despesas do período,
  caixa livre para gravar/turnê/departamento/adiantamento/crime/campanha, reação a escândalo, crítica, atenção da
  imprensa, bilheteria, eficácia da equipe, fama/embalo/fãs, influência nas leis, gosto e cena, estresse, aceite de
  proposta, renovação, confiança, Gramofone, Hall da Fama, chance e exposição de crime, calor policial, fatia jovem do
  público, fatia fora do país natal, gosto de quem tem 20 anos pelo gênero do ato…).
- Cada medição: braço de controle e braço com UM empurrão, a partir do MESMO estado (mesma semente), rodados do mesmo
  jeito (controle nulo × nulo = 0 exato). Leituras "puras" logo depois do empurrão; leituras "do período" depois de 6
  semanas nos dois braços (pega o que só existe nos ganchos mensais). Mediana de 3 sementes (`r29all`, `-b`, `-c`).
- Força: forte ≥ 10%, média ≥ 3%, fraca ≥ 0,5% (0,2% nas puras).
- `npx tsx scripts/probe29all.ts --write` regrava **`src/sim/connmap29.ts`** (`SYSTEMS29` e `CONNMAP29`: a, b, força,
  Δ e "via" = qual empurrão sobre qual saída). **É deste arquivo que a wiki deve ler o mapa.**

### Matriz antes (arestas novas desligadas): 60 de 132 pares
● forte · ◐ média · · fraca · vazio = nada medido

| de \ para | dinh | repu | impr | proj | aovi | sede | fama | mund | vida | cont | prem | subm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dinh | — |   | · | ● | ● | ● |   |   |   | ● | ● | ● |
| repu | ● | — |   |   |   |   |   |   |   | ● |   |   |
| impr | · |   | — | ● | ● |   | ◐ |   | ● |   |   |   |
| proj | ● | · | ● | — |   |   |   |   |   |   | ● |   |
| aovi | ● |   |   | · | — |   | ◐ |   | ● |   | · |   |
| sede | ● |   | ◐ | ◐ | ● | — | · | · | ◐ | ● |   |   |
| fama | ● | · | ● | ● | ● |   | — |   | ◐ | ● | ● |   |
| mund | ◐ | · | ● | ● | ● | · | · | — | ◐ | ◐ |   | ● |
| vida |   |   | ● | ◐ | ◐ |   | · |   | — |   |   |   |
| cont | ◐ |   | ◐ |   |   |   |   |   |   | — |   |   |
| prem |   |   |   |   |   |   |   |   |   | ◐ | — |   |
| subm | ● |   | ◐ | ● | · |   |   |   |   |   |   | — |

### Matriz depois: 104 de 132 pares (todas as 64 esperadas)

| de \ para | dinh | repu | impr | proj | aovi | sede | fama | mund | vida | cont | prem | subm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dinh | — |   | · | ● | ● | ● |   |   | ● | ● | ● | ● |
| repu | ● | — | ◐ | · | ◐ | ◐ | · |   | ◐ | ● | ◐ | · |
| impr | ◐ | ◐ | — | ● | ◐ | · | · |   | ● | ◐ | ◐ | ● |
| proj | ● | · | ● | — | ◐ |   | · |   | ● | ◐ | ● | ◐ |
| aovi | ● |   | ● | · | — |   | · |   | ● | ◐ | ◐ | ◐ |
| sede | ● |   | ◐ | ◐ | ◐ | — | · | · | ◐ | ● | · | ● |
| fama | ● | · | ● | ● | ● |   | — |   | ◐ | ● | ● | ● |
| mund | ◐ | · | ● | ● | ● | · | ◐ | — | ◐ | ◐ |   | ● |
| vida | · |   | ● | ◐ | ◐ |   | · |   | — | ◐ | ◐ | ◐ |
| cont | ◐ |   | ◐ | ◐ | ◐ |   |   |   | ● | — | · | ◐ |
| prem | ◐ | · | · | ● | ● |   | ◐ |   |   | ◐ | — |   |
| subm | ● | · | ● | ● | · |   |   |   | ● | ● | · | — |

(Entre rodadas o total oscila ±2 nas células fracas por causa da mediana; as 64 esperadas aparecem sempre — teste.)

### Matriz com o 13º sistema (público por idade e região, depois do merge de `r29-demo`): 114 de 156 pares
Todas as **72 arestas esperadas** medidas (58 com sinal conferido).

| de \ para | dinh | repu | impr | proj | aovi | sede | fama | mund | vida | cont | prem | subm | publ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dinh | — |   | ◐ | ● | ● | ● |   |   | ● | ● | ● | ● |   |
| repu | ◐ | — | ◐ | · | ◐ | ◐ | · |   | ◐ | ● | ◐ | · |   |
| impr | ◐ | ◐ | — | ● | ● | · | · |   | ● | ◐ | ● | ● | · |
| proj | ● | · | ● | — | ◐ |   | · |   | ● | ◐ | ● | ◐ |   |
| aovi | · | · | ● | · | — |   | ◐ |   | ● | ◐ | ◐ | ◐ |   |
| sede | ● |   | ● | ◐ | ● | — | · | · | ◐ | ● | · | ● |   |
| fama | ● | · | ● | ● | ● |   | — |   | ● | ● | ● | ● | ◐ |
| mund | ◐ | · | ● | ● | ● | · | · | — | ● | ◐ | · | ● | ● |
| vida | ◐ |   | ● | ◐ | ● |   |   |   | — | ◐ | ◐ | ◐ |   |
| cont | ◐ |   | ◐ | ◐ | ◐ |   |   |   | ● | — | · | ◐ |   |
| prem | ◐ | · | ● | ● | ● |   | ◐ |   |   | ◐ | — |   | · |
| subm | ● | · | ● | ● | · |   |   |   | ● | ● | · | — |   |
| publ | · |   |   | ● | ● |   |   |   |   | ◐ | ◐ |   | — |

O que o público faz e recebe (medido; o mecanismo é do `demo29`, aqui só ligado à sonda e ao mapa):
- **Público → Projetos / Ao vivo** (fortes): público maduro tira apelo de single (−20%) e esvazia a bilheteria (−25%);
  jovem faz o contrário.
- **Público → Prêmios** (média): o júri do Gramofone é mais velho — público maduro sobe a nota (+5%).
- **Público → Contratos** (média) e **→ Dinheiro** (fraca): afinidade de público entre selo e ato nas propostas; vendas.
- **Mundo → Público** (forte): dez anos depois o público envelheceu (fatia até 24 anos −60%).
- **Fama → Público** (média): mais fama espalha o público para fora do país natal; Imprensa e Prêmios → Público fracos.

Duas arestas novas nesta etapa (o merge tirou duas ligações que eram só efeito colateral):
- **Contratos → Imprensa** (`contratos_imprensa`): ato com confiança < 30 reclama do selo em entrevista (fato público,
  no máximo uma nota a cada 3 meses por ato). Antes só aparecia por acaso (rival → crítica).
- **Prêmios → Imprensa** (`premios_imprensa`): o prêmio do seu ato vira nota (uma por mês; o barramento junta com a
  nota da cerimônia da mesma semana).
- Vida → Fama (banda esgotada perde embalo, −3/mês) continua ligada, mas na sonda fica abaixo do caos entre sementes
  (+3%, 0, −4%): sai do mapa medido.

### O que foi ligado (`src/sim/sys/conn29.ts`, cada aresta com interruptor `CONN29_OFF` e o botão `CONN29.k`)
Ganchos novos mínimos: `REACT29` (multiplicadores na reação a escândalo, `scandal17`) e `PRESSURE29` (pressões de curto
prazo no estresse, `stress17`). O resto usa registros que já existiam (modificadores, Gramofone, chance de crime,
proposta, renovação, eficácia da equipe, ganchos mensais e de estreia, ouvintes de fato e do diário).

| de → para | o que acontece |
|---|---|
| Dinheiro → Vida | selo sem caixa livre: elenco teme cachê atrasado (estresse) |
| Dinheiro → Reputação | caixa negativo mancha a reputação comercial (mensal, com piso) |
| Reputação → Imprensa / Prêmios / Fama / Sede / Ao vivo / Vida | institucional amortece escândalo; júri do Gramofone pesa a reputação; selo de prestígio puxa a fama, atrai equipe melhor, pesa com promotores e tranquiliza o elenco |
| Imprensa → Reputação / Prêmios / Submundo / Contratos / Dinheiro | escândalo de ato seu mancha o selo, afasta o júri, atrai a polícia (drogas/crime/violência), faz artistas hesitarem e custa gestão de crise |
| Projetos → Fama / Ao vivo / Contratos / Vida / Submundo | aclamação na estreia; disco elogiado puxa ingresso; renova mais; crítica ruim estressa e disco muito bom alivia; disco de sucesso é pirateado mais fácil |
| Ao vivo → Imprensa / Contratos / Reputação / Submundo | série de shows vira notícia, sobe a confiança do ato e a reputação comercial; ato na estrada é presa fácil de pirataria |
| Sede → Imprensa / Fama / Prêmios / Submundo / Reputação | assessor amortece escândalo, puxa fama, monta a campanha do Gramofone e a reputação; jurídico reduz a exposição de crime |
| Fama → Submundo | alvo famoso: crime contra o ato chama mais atenção |
| Mundo → Ao vivo | guerra/crise esvazia as casas |
| Vida → Dinheiro / Contratos / Prêmios / Submundo / Fama / Reputação | terapia (só com caixa livre, até 3 pessoas); banda esgotada renova menos e perde embalo; rende menos no Gramofone; fala demais (exposição); "selo que esgota artistas" |
| Contratos → Vida / Projetos / Ao vivo / Reputação | confiança alta alivia e rende no estúdio e no palco; desconfiança faz o contrário e espalha má fama entre artistas |
| Prêmios → Fama / Reputação / Projetos / Dinheiro / Ao vivo / Prêmios | cada prêmio novo dá fama e reputação artística; apelo e vendas dos discos do ato; casa cheia; júri tem favoritos |
| Submundo → Imprensa / Vida / Contratos / Reputação / Dinheiro | polícia de olho: manchete pega mais, medo no elenco, artistas evitam o selo, reputação institucional cai e o jurídico cobra |

Anteriores desta rodada que contam aqui: perks da sede (Marketing/Agência/Digital) religados, songQ depois dos ganchos
de gravação, escândalo → próximo disco, prêmios → propostas, resenha → vendas (§4).

### Sem espiral (o autor pediu)
A primeira versão criou um ciclo **sem caixa → estresse → terapia → menos caixa** e outro **sem caixa → reputação com
artistas cai → não contrata → menos caixa** (medido: falência 25% → 33–42% nas variações). Corrigido:
- terapia só é cobrada com caixa livre, até 3 pessoas;
- quedas mensais de reputação vindas destas arestas param num **piso de 35**, e caixa negativo só toca a comercial;
- custos de crise e de jurídico pela metade.
Bônus de apelo novos entram na família de causa (caps18: `awards29a` em "image").

### Equilíbrio (`tools/balance19.ts --quick --seeds 24`, bot equilibrado, 3 anos)
| | quebra | caixa mediano | patrimônio mediano | fama | prestígio |
|---|---|---|---|---|---|
| arestas desligadas | 17% (4/24) | 43k | 2,71 mi | 11 | 57 |
| ligadas (final) | 21–29% (5–7/24 entre variações) | 4–18k | 1,1–2,1 mi | 17–18 | 53–59 |

Por partida (mesma semente, desligado × ligado): 12–13 de 24 terminam melhor com as arestas; mediana da diferença de
patrimônio entre −40 mil e +528 mil conforme a variação — a trajetória de cada partida diverge (contrata outros atos),
então a mediana geral oscila muito. Efeito estável: **mais fama** (11 → 17–18) e o jogo um pouco mais exigente com caixa
e escândalos. Botão: `CONN29.k` (0–1) suaviza tudo de uma vez; `CONN29_OFF` desliga arestas para medir.

### Testes
- `tests/r29-connect-all.test.ts`: toda aresta esperada (`EDGES29`, 72 com o público) medida; as 58 com sinal conhecido
  andam na direção certa; o mapa da wiki (`connmap29`) tem todas.
- Golden re-medidos (`r27-p2a`/`p2b`: 333758 / 1642544891 / 3380302445 / 2264116950; antes desta parte 450735 /
  1382068899 / 2386675548 / 2839816166). `r27-p2b` "turnê pelo caminho de sempre" escolhe um ato sem turnê marcada
  (mesmo critério do `roadFix` do arquivo). `r19-infra` verde (famílias de apelo, consumidores de fato).
- Depois do merge com friendly-brown (contratos+): 87 testes verdes no lote (golden iguais).

### Lacunas
- **Mundo como destino** (12 pares vazios): o jogador não muda era, tecnologia nem gosto do mundo; só leis (influência)
  e cenas, que aparecem fracas. Fica assim de propósito.
- Vazios restantes sem sentido de jogo ou só indiretos: → Sede (projetos, ao vivo, fama, contratos, prêmios, submundo),
  Dinheiro → Fama (passa por Projetos/marketing), Mundo → Prêmios, Prêmios → Vida/Submundo, Submundo → Fama.
- **Ao vivo → Reputação** existe (shows de ato seu sobem a reputação comercial), mas a sonda não a separa: no braço de
  controle o ato faz shows sozinho semanas depois (substituição).
- **Público como destino**: Dinheiro, Reputação, Projetos, Ao vivo, Sede, Vida, Contratos e Submundo não mexem na
  mistura de idade/região em 6 semanas (ela anda devagar: virada de mês e de ano). Ao vivo → Público existe (os fãs
  convertidos nascem no país do show), mas os shows da sonda são na cidade natal.
- **Público → Imprensa / Fama / Vida / Sede / Mundo / Reputação / Submundo**: sem ligação direta; passa por Projetos e
  Ao vivo.
- Shows simples (`playGigs`) seguem sem os modificadores de show (§9).
