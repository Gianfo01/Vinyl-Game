# Suíte final da rodada 27 (antes do build de release)

Medido em `claude/friendly-brown-vpsmfl` @ `74a5d2f` (merge CTX, depois de AUD1 e SONG), numa máquina de 4 vCPU, em 2026-10-13.
Correções em `claude/r27-suite-final`. A saída completa da execução em série está em [`suite27-final-output.txt`](suite27-final-output.txt).

## Como foi medido

1. `npm ci`, depois `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` → **OK, 0 erros** (também no fim, com as correções).
2. Suíte inteira **em série**: `npx vitest run --no-file-parallelism` (`testTimeout: 120000`).
3. Cada arquivo com falha rodou de novo **sozinho**, uma vez.
4. Para separar "valor velho" de "bug", o mesmo teste rodou em worktrees nos commits antes de cada merge:
   `b748d64` (base da suíte anterior), `c4c5bfd` (merge AUD2), `8b76776` / `e932a2f` (antes do AUD1, depois do SONG), `166a36e` (merge AUD1), commits do branch AUD1 (`dcfb96c^`, `dcfb96c`, `7fedf8a`, `3ccca72`, `a4702a8`) e `50da7b1` (CTX).

**Aviso sobre os tempos da execução completa:** enquanto a suíte rodava, rodei em paralelo alguns arquivos isolados (bisect), um processo por vez. Isso deixou a duração total maior que o normal. Por isso, **todo número de desempenho abaixo foi medido de novo com a máquina parada** (load ≈ 1, só o arquivo em questão).

## Totais (execução completa em `74a5d2f`, antes das correções)

| | |
|---|---|
| Arquivos de teste | 211 (202 passaram, **9 falharam**) |
| Testes | 1456 |
| Passaram | 1430 |
| Falharam | **7** (+ 2 arquivos que caíram antes de rodar os testes: `r16-menus` na importação, `r27-p2a` no `beforeAll`) |
| Pulados | 19 (18 do `r27-p2a`, por causa do `beforeAll` que falhou; 1 do `r19-infra`, pulado de propósito) |
| Duração | 4042 s (≈ 67 min; collect 540 s, tests 3416 s), inflada pelos bisects em paralelo |
| Erros fora de teste | 9 × `[vitest-worker]: Timeout calling "onTaskUpdate"`. É timeout de RPC do worker quando um arquivo segura o worker por muito tempo (ex. `sim.test.ts`, 386 s). Não é asserção e não derrubou teste nenhum. Igual ao relatório anterior. |

**Depois das correções:** `tsc` OK. Os 27 arquivos ligados ao que mudou (hubs, menu/ícones, mercado de canções, carreiras, e os 7 corrigidos) rodaram de novo em série: **27/27 arquivos, 209 passaram, 1 pulado, 0 falhas**. Sobram só os 2 itens de desempenho (c).

## Falhas

Legenda: **(a)** bug real · **(b)** valor/golden velho ou suposição frágil depois dos merges · **(c)** limite de tempo/desempenho.

| # | Teste | Classe | Sozinho | Causa (evidência) | Correção |
|---|---|---|---|---|---|
| 1 | `r27-ux` › hubs › quase toda página da árvore cabe num hub | **(a)** | falha igual | O SONG registrou a página `songmkt27` sem hub. Ela aparecia **solta** no menu Essencial (`['cockpit','songmkt27','tut18']`). Falha em `e932a2f` (pós-SONG) e em `166a36e`. | `src/ui/ps/hub27model.ts`: `songmkt27` entra no hub **Fazer um disco**, entre *compor* e *gravar* (mesma posição do menu r25 em `nav25`/`nav17`). |
| 2 | `r17-nav` › ícones únicos e existentes | **(a)** | falha igual | O SONG reusou o ícone `quill`, que já é de **Contratos** (`contracts19`): 95 ícones únicos para 96 páginas. Os dois apareciam iguais no menu. | Ícone novo `songsheet` (partitura com etiqueta de preço) em `src/ui/pixel/icons17.ts`; `nav17.ts` e o `registerArea` de `songmkt27` passam a usá-lo. |
| 3 | `r18-tutorial` › toda aba registrada e vista no navegador tem ajuda | **(b)** | falha igual | A lista fixa de abas vistas no Chromium ainda tinha `life-you:skills`. O AUD1 (`dcfb96c`) **apagou de propósito** a aba (`src/ui/sys/skills.ts`) e a ajuda dela. Passa em `e932a2f` (antes do AUD1). | Sai `life-you:skills` da lista `CRAWLED`, com comentário. |
| 4 | `r13-newgame` › toda seção tem ajuda bilíngue | **(b)** | falha igual | A lista pedia ajuda da seção `card`. O AUD1 (`a4702a8`) tirou a Carta do selo e o texto `HELP.card`. Passa em `e932a2f`. | Sai `'card'` da lista, com comentário. |
| 5 | `r27-p2b` › modo rápido intacto (caixa e hashes de `tours`/`acts`/`rng`) | **(b)** golden | falha igual (`1089445 ≠ 1301031`) | Medido com script no mesmo cenário (semente `r16pb-5`, 8 meses de playbot):<br>`b748d64`: 1301031 / 1382068899 / **2195685417** / 2442526734 (= valores antigos)<br>`c4c5bfd` (AUD2): 1301031 / 1382068899 / **3789538846** / 2442526734 → o AUD2 mudou só `acts`<br>`e932a2f` (SONG): igual ao AUD2 → o SONG não mexe<br>`166a36e` (AUD1): **1089445 / 529417993 / 1761475379 / 3113611029** → o playbot que compra negócios e contrata no 1º ano muda caixa, turnês, atos e RNG (mudança de propósito). | Valores re-medidos e a origem anotada no teste. A garantia "o P2B não mexe no modo rápido" continua no teste ao lado (gancho `STOP27.pre` ligado × desligado → mundos iguais), que passa. |
| 6 | `r27-p2a` (arquivo inteiro: `beforeAll`) | **(b)** golden | falha igual | Mesmos valores fixos do #5 (mesma semente). Por isso os 18 testes ficavam pulados. Com os valores antigos passa 18/18 em `b748d64`. | Valores re-medidos (iguais aos do #5). Os 18 testes passam. "Sem campanha nada muda" continua provado pelo 1º teste da campanha (comparação a × b). |
| 7 | `r16-menus` (arquivo inteiro: importação) | **(b)** suposição frágil | falha igual | `ReferenceError: Cannot access 'LOAD_EXTRA' before initialization`. O teste importa `sim/sys/careers12` antes de carregar a simulação. Isso cai no ciclo `careers12 → life → production → realworld → market → eras18 → econ18 → economy → worldgen → sys/index → manager12 → registerLoad()`, com `careers12` ainda em TDZ. Bisect no branch AUD1: passa em `dcfb96c^`, falha a partir de `dcfb96c` (remoção de `persona/skills` / `skillpts13`). O código apagado é que carregava a simulação antes, por acaso. O ciclo em si já existia antes (importar `careers12` sozinho já quebra em `e932a2f`). | O teste passa a importar `../src/sim/sys` primeiro, como o app e mais de 10 testes já fazem (`r13-self`, `r18-core`, …). 2/2 passam (o 3º teste foi apagado de propósito no AUD1). Veja "Pendências" sobre o ciclo. |
| 8 | `sim.test` › arco completo › run de 2030 chega a um dos 20 finais | **(c)** | **324,8 s** contra o limite de 300 s | As asserções passam: rodando o mesmo laço fora do vitest em HEAD dá `months=132, ended=true, endings=20, caixa consistente` (340 s). Tempo isolado, máquina parada: `b748d64` **296,6 s** (passa raspando), `e932a2f` **327,2 s**, HEAD **324,8 s**. AUD1, SONG e CTX **não** deixaram mais lento. Os ~+10% vieram entre `b748d64` e `e932a2f` (merges da rodada anterior: AUD2/INT/FLOW2/UX). | **Nenhuma.** O teste não mede tempo sob carga: ficou mais lento mesmo rodando sozinho, então não afrouxei o limite. Fica para quem cuida do desempenho decidir (perfilar, ou subir o limite com justificativa, como na r21). |
| 9 | `r14-db` › enorme: criar < 3 s e meses rápidos | **(c)** | **2940 ms/mês** contra 1500 (criar: 1277 ms, ok) | Nesta máquina dá o mesmo em todos os commits: `b748d64` 2974 ms, `e932a2f` 2842 ms, HEAD 2940 ms. Nenhuma piora nesta rodada. O relatório anterior mediu 1851 ms em `b748d64` noutra máquina. | **Não mexi**: está com a sessão `claude/r27-perf`. |

## Resumo por causa

- **Bugs reais (a), os dois do merge SONG:** página `songmkt27` sem hub (#1) e ícone `quill` repetido (#2). Corrigidos.
- **Golden/fixture/suposição velha (b) depois dos merges AUD1/AUD2:** #3–#7. Cada valor novo foi re-medido só depois de reproduzir o antigo no commit pai.
- **Tempo (c):** #8 (`sim.test` 2030, ≈ +10% desde a rodada anterior, não desta) e #9 (`r14-db`, com a sessão de desempenho). Nenhum limite foi alterado.

## Pendências

1. **`sim.test` "2030" estoura 300 s mesmo sozinho** (≈ 325 s nesta máquina). Não é desta rodada. Precisa de alguém de desempenho: ver o que AUD2/INT/FLOW2/UX somaram ao `advanceMonth` em 2030 com o cenário `established`.
2. **`r14-db` huge:** ~2,9 s/mês nesta máquina (limite 1,5 s). Fica com `claude/r27-perf`.
3. **Ciclo de importação em `sim/sys`:** qualquer código que importe `sim/sys/careers12` antes da entrada da simulação quebra. Tentei deixar os registros à prova de TDZ, mas o erro só muda de lugar: `LOAD_EXTRA` (careers12) → `ag17Reserve` (life) → `DEFS` (careers12/screen18) → …. Desfiz, porque não é uma correção mínima. O app não é afetado (carrega a simulação pela entrada). Para resolver de vez, quebrar a aresta `worldgen → import './sys'` ou uma das arestas `careers12 → life → production`.
4. **Texto de missão velho:** `src/ui/tracks18.ts` (trilha Músico) ainda diz "Ver suas habilidades e personalidade", mas a árvore de habilidades saiu no AUD1. A missão continua funcionando (abre a página *Você*), só o texto ficou velho.

## 10 arquivos mais lentos (execução completa; inflados pelos bisects em paralelo)

| # | Arquivo | Duração |
|---|---|---|
| 1 | tests/sim.test.ts | 386,3 s |
| 2 | tests/r10-life.test.ts | 145,9 s |
| 3 | tests/r18-era1889.test.ts | 122,7 s |
| 4 | tests/r19-data-d.test.ts | 110,5 s |
| 5 | tests/r10-labels.test.ts | 87,8 s |
| 6 | tests/r8-social.test.ts | 72,9 s |
| 7 | tests/r18-talent.test.ts | 71,8 s |
| 8 | tests/r9-identity-plus.test.ts | 70,7 s |
| 9 | tests/r18-dm.test.ts | 60,4 s |
| 10 | tests/r14-leisure.test.ts | 59,2 s |

## Commits

| Commit | O quê |
|---|---|
| `47be4a0` | `songmkt27` no hub *Fazer um disco* (#1) |
| `9ae097b` | `r18-tutorial` sem a aba apagada; `r27-p2b` re-medido (#3, #5) |
| `36150bd` | ícone `songsheet` para o mercado de canções (#2) |
| `bdc2ea8` | `r13-newgame` sem a seção `card` (#4) |
| `10802ce` | `r16-menus` carrega a sim pela entrada; `r27-p2a` re-medido (#6, #7) |
