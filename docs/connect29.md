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

Álbum de cenas: **Cenas animadas** (cut27) que tocaram — antes só as silenciosas iam para "Rever cena". As com decisão
aparecem marcadas (não se repete a escolha).

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

ANTES_DEPOIS_AQUI

## 6. Determinismo, golden e equilíbrio

Mundo mudado **de propósito** (perks religados, songQ depois dos ganchos, escândalo → próximo disco, prêmios →
prestígio). Golden re-medidos com comentário em `tests/r27-p2a.test.ts` e `tests/r27-p2b.test.ts` (semente `r16pb-5`,
1975, 8 meses de playbot): caixa **446096 → 427926**, acts **4292160800 → 1063419696**; tours (1382068899) e **rng
(2262769409) iguais** — nenhuma mudança consome o RNG do jogo. `r27-m2` passa sem mudança. As correções de dados/vistas
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
(21/21), `r27-m2` (12/12), `r27-audit`, `r27-consistency`, `r15-kin`, `r16-links`, `r17-foundation`, `r25-kin` — todos
verdes. `r16-lineups` › "Michael: nas Jacksons até 1984" **falha igual na base** (friendly-brown, antes da R29: "The
Jackson 5 já se chama The Jacksons em 1983: expected undefined") — não é desta rodada. `tsc --noEmit` limpo.

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
- `R1s` (troca simulada põe pessoa real em banda real na história alternativa) é comportamento da simulação, não erro;
  segue informativo.
