# R33 · GESTÃO — decisões

Frente da versão 33 (plano: `docs/r33/PLANO.md`). Itens (6), (7) e (10). Três interruptores, todos **desligados no
código** (`scope: 'game'`, editor em Ferramentas): `exp33.learn`, `exp33.dir`, `exp33.bots`. Entrada:
`src/sim/r33/gestao33.ts` (uma linha em `sim/sys/index.ts`, antes de `facades19`). Teste: `tests/r33-gestao.test.ts`.

## (6) Aprendizados ensinam — `exp33.learn` (`src/sim/r33/learn33.ts`)
- **Previsão de vendas calibrada.** Para o lançamento planejado, as amostras do learn31 parecidas (mesma família de
  gênero ×1 / outra ×0,1; mesmo tipo ×1 / outro ×0,4; traços em comum 0,4 + 0,6 × Jaccard; meia-vida de 12 anos)
  dão a média em log de "vendeu ÷ previsão". Encolhe para 1 com pouca amostra: `k = exp(média × W/(W+3))`, limitado a
  ±40%. Abaixo do mínimo do learn31 (`learn31.min`), k = 1.
- **Onde entra:** fator de apelo só da previsão (`FORECAST31.appeal`, market31) — o lançamento real não passa por ali.
  Como a venda é sublinear no apelo, k no apelo é um pouco menos que k nas unidades (aceito: é uma correção).
- **Sem eco:** a previsão de cada lançamento seu guarda o k que já trazia (`x4.learn33.k`, gravado na semana do
  lançamento) e a amostra leva esse k (`Samp31.k`, gancho `SAMP31X` no learn31). A calibração usa a razão crua
  (vendeu ÷ previsão × k); a biblioteca na tela continua mostrando vendeu × previsão como antes.
- **Faixa:** `learnWidth33` (1 − 0,4 × W/(W+6)) está pronto, mas a faixa mín–máx mora em `market.forecastUnits`, que
  não é desta frente — **gancho** anotado abaixo.
- **Diretores:** A&R delegado ganha até ±8 pontos na leitura do ato pelo histórico do gênero (LP); produtor executivo
  em formato "auto" troca LP por single quando, no gênero do artista, os singles batem a previsão 15% mais que os LPs
  (com amostra mínima de singles). Ganchos `LEARN31X.anr/fmt` em `deleg31.ts`, chamados em `sys/deleg31run.ts`.

## (7) Diretores de imprensa, jurídico e RH — `exp33.dir` (`src/sim/r33/dir33.ts`)
- `deleg31.ts` ganhou `RESP_X31` + `respView31(s, id)`: uma regra ligada pode abrir uma linha travada (modos,
  diretrizes, descrição). Com `exp33.dir`, "Imprensa e crises", "Jurídico e disputas" e "Equipe: aumentos e saídas"
  passam a ter **Eu decido / Delegar**; a tela de delegação (`ui/sys/deleg31.ts`) e o editor leem a linha efetiva.
  Desligado, as três voltam travadas como antes.
- Toda semana (gancho `dir33`), com "Delegar" e alguém do cargo, o diretor responde pelos cartões de sempre
  (`resolveDecision`, mesmo fluxo de sorte do jogador) e anota no registro de automação (quem, cartão, opção, por quê):
  - **Imprensa (assessoria):** cartões `scandal` pela linha da casa (`PRESS33`: nota, desculpa, humor, silêncio…;
    nunca processar/dobrar/culpar). Qualidade < 0,35 → só o padrão do cartão. Qualidade ≥ 0,5 abre a **sala de crise
    de prisão** (`crisis27`), que a equipe já toca semana a semana.
  - **Jurídico:** cartões de disputa (`LEGAL33`: plágio, sample, coautoria, nome, espólio, auditoria, cláusula moral,
    IA, samples m19p) — briga com qualidade ≥ 0,6, faz acordo abaixo. Abre a **sala de crise de processo**.
    Casos de outras frentes pelo registro **`registerLegalCase33({ id, list, decide })`**: o diretor lê a chance
    (`win` ± qualidade) e faz acordo só dentro do teto (diretriz `cap`, dólares de hoje; 0 = sem teto).
  - **Equipe/RH (administração):** `r11_staff_raise`, `rival_poach_staff`, `producer_award_poach` — segura quem é bom
    (nível ≥ 55 + 20 × (1 − qualidade)) se o aumento anual couber no teto (`cap`); senão a saída barata (10% e título,
    bônus, trabalhos externos) ou deixa ir.
- No robô (playbot16) os cartões já são respondidos pelo próprio robô antes; os diretores só agem em partidas em que o
  jogador delegou.

## (10) Robô nas regras novas — `exp33.bots` (`src/sim/r33/bots33.ts`)
- `playbot16.playMonth` chama `botMonth33` depois de `botMedia18`. Desligado: retorna sem criar estado (valores de
  referência iguais). Ligado, uma vez por mês, pelas funções dos botões:
  - **jabá** (`payDJs`): com disco seu de até 4 semanas e caixa ≥ 40× (equilibrado) / 20× (agressivo) o envelope;
    equilibrado só nível 0 e só com jabá tolerado/promotores; lê o rosto do diretor (`jabaFace31`) e desiste se ele
    sua (equilibrado) ou fecha a cara (agressivo). Cauteloso nunca.
  - **leilões** (`raise31`): lote mais barato dos pregões marcados cujo lance inicial cabe em 1/2/4% do caixa; limite
    1,2/1,35/1,6× o inicial. (Nas sondas, os pregões do começo da partida ainda vinham sem lotes.)
  - **terrenos** (`buyLot31`): um por ano no máximo, o mais barato, até 3% (equilibrado) / 6% (agressivo) do caixa.
  - **casas:** `buyHouse` para a próxima casa de mais prestígio quando o patrimônio pessoal passa de 4× o preço
    (equilibrado e agressivo); `buyHome31` na maior cidade do mercado da sede com 6× o preço (agressivo).
  - **vitrine:** o primeiro "pôr no radar" da vitrine do mês (`runVit31`).
- Contadores em `x4.bots33` (só com o interruptor). **Gancho** `registerBot33({ id, on, run })` para as outras frentes.

## Ganchos para outras frentes
- **CATÁLOGO / INT-2 (cartório/tribunal):** registrar os processos (plágio, rescisão, sampling negado, regravação) em
  `registerLegalCase33` — `list(s)` com `{ id, t, settle (centavos), win (0..1) }` e `decide(s, id, 'fight'|'settle', staff)`.
- **CATÁLOGO (relíquias, leilões novos), CIDADE (lojas próprias, terrenos que valorizam/alugam), VIDA (casas):**
  ensinar o robô por `registerBot33({ id, on: (s) => <interruptor da regra>, run })`.
- **Mercado (`market.forecastUnits`, sem dono na 33):** multiplicar a largura da faixa por `learnWidth33(s, act, type)`
  quando `exp33.learn` estiver ligado (hoje só o k entra, pelo `FORECAST31.appeal`).
- **Interface:** a tela de aprendizados (`ui/r31/learn31ui`) pode mostrar o k atual da previsão (`calibAct33`).

## Fora desta rodada
- Modo "Parcial" (pedir aprovação acima de um limite) para imprensa/jurídico/RH; entrevistas pedidas pela imprensa.
- Robô comprando itens da vitrine com dinheiro e consignando relíquias.
- Goldens (r27-p2a/p2b/m3, r16-playbot) não rodados nesta frente (TESTES MÍNIMOS): tudo desligado no código, nenhum
  sorteio novo, nenhuma chave nova no save com os interruptores desligados — a junção confere.
