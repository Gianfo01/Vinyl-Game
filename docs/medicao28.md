# Medição da R28 — Fase 0 (base da R27)

Data: 2026-10-13. Base: `claude/friendly-brown-vpsmfl` @ `b748d64` (fim da R27). Branch desta medição: `claude/r28-fase0`.
Comparação com `docs/analise-teoria-de-tudo-2026-10-12.md` (branch `claude/dazzling-ptolemy-yjiyf0`, apêndice C).
**Nenhum código de jogo foi alterado.** Só foi acrescentado o script `scripts/measure28.ts` (medição headless).

Máquina: 4 núcleos. Os lotes rodaram em paralelo (balance `--full` com 3 processos + rodada longa + sondagens), então
os tempos de **relógio** estão inflados; uso **CPU** sempre que possível. A rodada longa dividiu a máquina nos primeiros
~30 min (até ~1985) e rodou sozinha depois.

## 0. Comandos e opções

`npm run balance` continua apontando para `tools/balance19.ts`; todas as opções usadas pela análise existem
(`--quick`, `--full`, `--det`, `--years`, `--role`, `--seeds`, `--starts`, `--bots`, `--adv`, `--db`, `--jobs`, `--grid`, `--json`).
Duas observações:
- `--json` **exige um caminho** (`--json saida.json`); sozinho não grava nada.
- Usei `--jobs 3` no `--full` e `--jobs 1` nos `--quick` (a análise usou o padrão = nº de núcleos). Isso muda só o relógio, não os resultados.

| Medição | Comando |
|---|---|
| Lote completo | `npm run balance -- --full --jobs 3 --json full.json` |
| Rápido + determinismo | `npm run balance -- --quick --det --jobs 1` |
| Papel artista / híbrido | `npm run balance -- --quick --years 5 --role artist` (e `hybrid`), `--jobs 1` |
| 1962 → 2040 | `npx tsx scripts/measure28.ts long --out long.jsonl` (corte de 90 min) |
| Legibilidade (3a, 3b, 3c) | `npx tsx scripts/measure28.ts legib` (8 seeds × 5 anos, inícios 1889/1955/1975/2005, base média) |
| Testes citados | `npx vitest run tests/r16-playbot.test.ts tests/r14-db.test.ts --no-file-parallelism` |

## 1. Balanço

### 1.1 Lote completo (`--full`: 4 perfis + 6 adversários, 6 seeds × 5 anos, base média)

60 partidas, 1.088 s de relógio, 2.220 s de CPU (análise: 372 s / 1.431 s).

| Perfil | Quebra R27 | Quebra análise | Caixa mediano R27 | (análise) | Patrimônio mediano R27 | (análise) |
|---|---|---|---|---|---|---|
| Cauteloso | **17 %** | 0 % | 359 mil | 656 mil | 4,98 mi | 10,32 mi |
| Equilibrado | **33 %** | 50 % | 164 mil | 24 mil | 4,97 mi | 4,67 mi |
| Agressivo | **0 %** | 33 % | 67 mil | 18 mil | 2,61 mi | 2,81 mi |
| Artista | **0 %** | 17 % | 2,27 mi | 1,44 mi | 2,37 mi | 1,59 mi |

```
perfil       n  quebra  caixa p25/med/p75 (US$ 2020)   líquido  patrimônio  fama prest  nº1 escând mortes ecos
balanced     6    33%  26k / 164k / 271k                 77k       4.97M    14    56    1     67      4   54
cautious     6    17%  134k / 359k / 644k               339k       4.98M    12    75    0     62      2   56
aggressive   6     0%  28k / 67k / 145k                 -55k       2.61M    14    49    2     74      1   56
artist       6     0%  1.36M / 2.27M / 3.15M           2.26M       2.37M    39    52    3     58      2   51
```

Quebras dos perfis:
- equilibrado: 1975 (`b19-2`) em 1976 — **mesma seed e ano da análise**; 1889 (`b19-4`) em 1890 (na análise também quebrava; a `b19-0` de 1889 agora sobrevive);
- cauteloso: 1889 (`b19-4`) em 1891 — **novo** (era 0 %).

Por (seed, início), patrimônio em US$ 2020 (Q = quebrou):

| Seed | Início | Equilibrado | Cauteloso | Agressivo | Artista | Agressivo ≥ cauteloso? |
|---|---|---|---|---|---|---|
| b19-0 | 1889 | 6,17 mi | 5,36 mi | 5,59 mi | 3,10 mi | sim |
| b19-1 | 1955 | 5,32 mi | 4,61 mi | 1,19 mi | 4,97 mi | não |
| b19-2 | 1975 | −0,12 mi Q | 9,14 mi | 1,43 mi | 1,37 mi | não |
| b19-3 | 2005 | 14,37 mi | 12,46 mi | 16,70 mi | 1,63 mi | sim |
| b19-4 | 1889 | −0,12 mi Q | −0,07 mi Q | 3,80 mi | 0,78 mi | sim (cauteloso quebrou) |
| b19-5 | 1955 | 4,62 mi | 3,78 mi | 1,04 mi | 3,22 mi | não |

- Meta da 1C "agressivo ≥ cauteloso em ≥ 1/3": **3 de 6 (cumprida nesta amostra)**, mas um dos três é por quebra do cauteloso, e o patrimônio mediano do agressivo segue ~metade do cauteloso.
- Meta "equilibrado quebra 10–30 %": **33 % (fora, por pouco; 2 de 6)**. Melhor que os 50 % da análise.
- O equilibrado agora iguala o cauteloso no patrimônio mediano (4,97 × 4,98 mi) e ganha dele em 4 das 4 partidas em que não quebra.

Adversários:

| Adversário | Quebra R27 | Quebra análise | Observação |
|---|---|---|---|
| spam | 67 % | 67 % | = |
| loans | 33 % | 50 % | patrimônio 5,59 mi (1,12× equilibrado), abaixo da margem |
| flip | 0 % | 17 % | "caixa!": líquido 1,24 mi = 16× o equilibrado (análise: ≥ 2×) |
| signall | 100 % | 83 % | |
| catalog | 33 % | 50 % | |
| crime | 100 % | 100 % | |

"Nenhum exploit acima da margem" (igual à análise). O `flip` (vender o selo) continua sendo o único aviso de caixa e ficou mais forte em relação ao equilibrado.

### 1.2 Rápido + determinismo (`--quick --det`: equilibrado, 6 seeds × 3 anos, base pequena)

| | R27 | Análise |
|---|---|---|
| Quebra | **0 %** | 17 % (1975) |
| Caixa p25/med/p75 | 33k / 60k / 100k | 61k / 107k / 136k |
| Patrimônio mediano | 1,63 mi | 2,36 mi |
| Determinismo (partida repetida em outro processo) | **OK** | OK |

### 1.3 Papéis (`--quick --years 5 --role …`, base pequena)

| Papel | Quebra | Caixa mediano | Patrimônio mediano | (análise: quebra / caixa / patrimônio) |
|---|---|---|---|---|
| Artista | 0 % | 1,27 mi | 1,33 mi | 0 % / 1,67 mi / 1,69 mi |
| Híbrido | 0 % | 15,52 mi | 24,12 mi | 0 % / 13,52 mi / 25,02 mi |

O híbrido continua muito acima do selo: 24 mi em 5 anos contra 1,63 mi do equilibrado no `--quick` (3 anos) e 4,97 mi no `--full` (5 anos, base média) — o "paga ~60× o selo" da 1C segue de pé em ordem de grandeza.

### 1.4 CPU por ano de jogo, por início

| Lote | 1889 | 1955 | 1975 | 2005 |
|---|---|---|---|---|
| `--full` R27 (CPU) | 2,9 s | 8,0 s | 9,7 s | **20,4 s** |
| `--full` análise (CPU) | 1,7 s | 5,2 s | 5,4 s | 15,8 s |
| `--quick --det` R27 (CPU) | 2,7 s | 5,4 s | 9,2 s | 14,0 s |
| `--quick --det` análise (CPU) | 2,3 s | 5,7 s | 13,7 s | 13,2 s |
| `--quick` artista (CPU) | 2,0 s | 5,2 s | 8,7 s | 13,6 s |
| `--quick` híbrido (CPU) | 4,1 s | 9,6 s | 14,1 s | 23,6 s |

O lote completo ficou **~30–80 % mais caro em CPU** por ano de jogo (parte pode ser disputa de cache com os outros lotes; o `--quick` sem disputa pesada ficou parecido com a análise).

## 2. Rodada longa 1962 → 2040 (headless, bot equilibrado)

`createGame(defaultConfig('m28-long', { startYear: 1962 }))` (Londres, base média) + `playMonth('balanced')` + `advanceMonth`.
Amostra a cada 5 anos de jogo. **Cortada nos 90 min em set/2008** (562 de 936 meses; não chegou a 2040).
A partida não quebrou (caixa positivo o tempo todo).

| Ano | Atos | Pessoas | Lançamentos | Fatos (anel / emitidos) | Save (JSON) | CPU/mês (média 5 anos) | Pior mês | Heap |
|---|---|---|---|---|---|---|---|---|
| 1962 | 426 | 644 | 1.784 | 5 / 5 | 1,8 MB | — | — | 108 MB |
| 1967 | 793 | 1.516 | 3.395 | 568 / 2.154 | 8,5 MB | 1,23 s | 1,8 s | 333 MB |
| 1972 | 1.039 | 2.052 | 4.365 | 544 / 4.692 | 11,7 MB | 2,11 s | 3,2 s | 450 MB |
| 1977 | 1.180 | 2.313 | 5.370 | 587 / 7.785 | 14,5 MB | 4,53 s | 8,7 s | 753 MB |
| 1982 | 1.329 | 2.658 | 6.311 | 564 / 11.483 | 16,7 MB | 7,44 s | 14,7 s | 243 MB |
| 1987 | 1.456 | 2.944 | 7.313 | 542 / 15.182 | 19,8 MB | 10,25 s | 17,2 s | 429 MB |
| 1992 | 1.601 | 3.277 | 8.314 | 594 / 19.260 | 21,8 MB | 9,82 s | 20,3 s | 374 MB |
| 1997 | 1.727 | 3.556 | 9.416 | 570 / 23.933 | 24,4 MB | 12,41 s | 23,5 s | 566 MB |
| 2002 | 1.855 | 3.732 | 10.537 | 570 / 29.057 | 27,2 MB | 13,70 s | 32,1 s | 581 MB |
| 2007 | 1.952 | 3.906 | 11.665 | 541 / 34.335 | 28,8 MB | 22,96 s | 48,2 s | 583 MB |
| set/2008 | 2.024 | 4.026 | 12.841 | 587 / 36.089 | 31,2 MB | 18,66 s (20 meses) | 35,9 s | 590 MB |

Leitura:
- **CPU por mês cresce ~15–19× entre 1962–67 e 2002–08.** A meta do plano ("nenhuma década com mais de 2× o custo da primeira") falha já na 2ª década (1972–77: 3,7×).
  A análise media 1,2–1,3 s/mês em 1962 (bate com o 1º quinquênio daqui); o que é novo é a **curva**: ninguém tinha rodado além de 1982.
- Parte do salto 1967–1987 coincide com os outros lotes rodando ao mesmo tempo; mas de 1987 em diante a rodada estava sozinha e o custo continuou subindo (9,8 → 23 s/mês).
  Pior mês: 48 s de CPU (2002–07).
- **O save cresce linearmente** (~0,6 MB/ano; 1,8 → 31 MB em 46 anos), puxado por pessoas, atos e lançamentos. O anel de fatos está estável (~550–600, teto 600); os fatos emitidos não pesam no save.
- Lançamentos crescem ~230/ano; atos ~35/ano; pessoas ~75/ano. Nada é podado: o mundo só acumula.
- Projeção grosseira: chegar a 2040 a ~20–30 s/mês daria mais ~3 h de CPU; o save estaria em ~50 MB (JSON sem compressão).

## 3. Legibilidade

### 3a. Ecos com "Depois" errado

A UI (`src/ui/sys/decide18.ts:31`) mostra `fuzzy18(typeof e.p === 'number' ? e.p : 0.5)`; o sorteio usa `echoP18` (`src/sim/decide18.ts:135`).
Contei todos os ecos das chaves `ev:<evento>:<opção>` (2.255 chaves: todas as opções de `EVENTS` + as registradas à mão) e avaliei `echoP18` em 9 estados
(início de 1962 + fim das 8 partidas da sondagem), com `ctx = { act, person }` do primeiro ato do jogador.

| | Estado inicial 1962 | Faixa nos 8 estados finais |
|---|---|---|
| Ecos no total | 1.843 (1.371 com chance numérica, 472 com chance em função) | = |
| Mostram "provável" | 974 | = |
| **Mostram "provável" mas a chance real é menor** | **390** (246 "improvável", 144 "pode acontecer") | 320–398 |
| — dos ecos **padrão** (`echoes19`) com chance em função | **262 de 262** | 262 de 262 em todos |
| — dos ecos **escritos à mão** com chance em função | 128 de 210 | 58–136 |
| Rótulo mais otimista que a chance real (qualquer nível) | 390 | 320–398 |

- Igual à análise nos ecos padrão (262 de 262, sem mudança na R27). A contagem nova inclui os escritos à mão com chance em função: **mais 58–136**, dependendo da reputação do estado.
- Nenhuma função de chance lançou erro (`pLancouErro = 0`); o `ctx` sintético pode subestimar ecos que dependem de dados da decisão real.
- Ecos com chance numérica nunca saem errados (a UI usa o número).

### 3b. Calibração da previsão

309 lançamentos do jogador em 8 partidas (≥ 300). Para cada um: a previsão guardada no lançamento (`rel.fc`, `forecastUnits(...).mid`, `src/sim/market.ts:208`)
e a faixa que a tela mostra (`lo = mid·(1 − 0,6w)`, `hi = mid·(1 + w)`, `w = 0,6` ou `0,35` com analista; `src/ui/panels/creation.ts:50`),
comparadas com as unidades reais nas 10 primeiras semanas (`rel.fa`) e com a **procura** (vendido + perdido por falta de estoque, `rel.shortage`, lido na mesma semana 10).

| | R27 | Análise |
|---|---|---|
| Lançamentos | 309 | 336 |
| Faixa contém a **procura** (vendido + falta) | **49,2 %** | — |
| Faixa contém o **vendido** | **33,0 %** | 62,5 % ("procura real") |
| Procura abaixo da faixa / acima | 113 / 44 | — |
| Procura ÷ previsão: p10 / mediana / p90 | 0,33 / 0,83 / 1,85 | — |
| Lançamentos com falta de estoque | **279 de 309 (90 %)** | — |
| Falta mediana / máxima | 16,4 mil / 761 mil unidades | 344–394 mil (máx. citado) |

- **Pior que a análise**, seja qual for a definição dela. A faixa é otimista no centro (mediana 0,83) e larga demais para cima, curta para baixo: 37 % caem abaixo do piso.
- A falta de estoque afeta 9 em 10 lançamentos do bot: a tiragem sugerida não acompanha a procura (ligado ao item "tiragem lê o marketing" da 1B).
- Meta da 1B (78–82 %): distante.

### 3c. Eventos sorteados sem dica nem "Agora"

Contei os cartões de decisão que apareceram (`s.decisions`) nas 8 partidas (825 sorteios, 241 eventos distintos) e, para cada opção, se tem `hint` ou `conseq18(...).now`.

| | R27 | Análise |
|---|---|---|
| Opções sem dica nem "Agora", 120 eventos mais sorteados (todas as partidas) | **46,3 %** (150 de 324) | 57 % |
| Idem, ponderado pelo nº de sorteios | 46,1 % | — |
| Por partida (todos os eventos da partida, 28–90) | 40–65 % | — |

Melhorou ~11 pontos, mas quase metade das opções que o jogador mais vê continua sem prévia.

## 4. Testes citados pela análise

| Teste | Análise | R27 (em série) |
|---|---|---|
| `r16-playbot.test.ts` | falhava: `tours` = 0 (linha 28) | **falha** em outra asserção: `hires` = 0 (linha 33); `tours` agora passa |
| `r14-db.test.ts` "enorme: avançar meses continua rápido" | falhava sob carga (1.971 ms/mês > 1.500) | **falha** com 2.840 ms/mês (só a rodada longa disputava 1 núcleo) — parece regressão real, não só carga |

A suíte inteira em série não foi rodada nesta fase (fica para o fechamento da rodada, como manda o plano).

## 5. O que mudou em relação à análise

**Melhorou**
- Quebra do equilibrado no lote completo: 50 % → 33 %; agressivo 33 % → 0 %; artista 17 % → 0 %.
- Equilibrado e agressivo com caixa mediano positivo e maior (24 mil → 164 mil; 18 mil → 67 mil).
- Agressivo ≥ cauteloso em 3 de 6 (seed, início) — atinge o limiar de 1/3 (com ressalva).
- `--quick --det`: sem quebra (17 % → 0 %); determinismo OK.
- Eventos sem dica nem "Agora": 57 % → 46 %.
- `r16-playbot`: a falha de `tours` sumiu.

**Piorou**
- Cauteloso passou a quebrar (0 % → 17 %) e perdeu metade do patrimônio mediano (10,3 → 5,0 mi). A dominância da cautela diminuiu mais por queda do cauteloso do que por subida dos arriscados.
- Calibração da previsão: 62,5 % → 33 % (vendido) / 49 % (procura). Falta de estoque em 90 % dos lançamentos.
- CPU por ano de jogo no `--full`: +30–80 % (2005: 15,8 → 20,4 s).
- `r14-db`: 1.971 → 2.840 ms/mês na base enorme.
- `flip` (vender o selo): líquido de 2× → 16× o equilibrado.
- `--quick`: caixa e patrimônio medianos do equilibrado caíram (107k → 60k; 2,36 → 1,63 mi).

**Igual**
- Ecos padrão "provável" errados: 262 de 262 (mais 58–136 escritos à mão).
- Equilibrado de 1975 (`b19-2`) quebra em 1976; 1889 (`b19-4`) quebra em 1890.
- Nenhum exploit acima da margem; spam e crime quebram.
- Híbrido segue muito acima do selo (24 mi × 5 mi do equilibrado no `--full`).

**Novo (não medido antes)**
- Curva de custo até 2008: 1,2 s/mês (1962–67) → 19–23 s/mês (2002–08); save 1,8 → 31 MB; mundo sem poda.

## 6. Cinco maiores riscos para a R28

1. **Custo por mês explode com a idade do mundo (frente técnica, Fase 7).** 15–19× entre 1962 e 2008, pior mês de 48 s de CPU, save de 31 MB em 2008 e ~50 MB previstos em 2040. Uma run longa (a decisão do autor de deixar escolher o ano de fim e "continuar em sandbox") fica injogável no browser antes de 2000. Ninguém mediu isso antes: a 1C e a 1B vão mexer em balanço sem um orçamento de CPU, e o `r14-db` já está vermelho. Sugestão: perfilar os ~450 `registerSimHook` numa partida de 1990+, poda/agregação de lançamentos e pessoas inativas, e um teste de custo por década antes das fases 3–5.
2. **Quebras ligadas a início (1889 e 1975) mudam de perfil, não somem.** O equilibrado quebra em `b19-2` 1975 e `b19-4` 1889; o cauteloso passou a quebrar em 1889. Com 6 seeds, cada quebra vale 17 pontos: a meta 10–30 % da 1C fica refém de duas seeds. Risco de "consertar" o balanço olhando o agregado. Sugestão: `--grid` (seeds × inícios) para a 1C e investigar 1889/1975 antes de mexer em choques.
3. **A previsão está pior do que a análise viu, e a falta de estoque é sistêmica.** Calibrar para 80 % (1B) sem antes ligar tiragem ao marketing e sem decidir o que é "procura" (com ou sem falta) vai produzir uma faixa calibrada para um número que o jogador não controla. A 1B e a 1C mexem no mesmo mercado (hype, retorno convexo): a calibração precisa ser refeita depois da 1C.
4. **"Depois" errado é maior do que 262.** Corrigir só os ecos padrão deixa 58–136 escritos à mão ainda otimistas; e a chance depende do estado (reputação), então qualquer rótulo fixo erra. A troca para `echoP18` precisa do `ctx` real da decisão e de um teste que compare rótulo × sorteio em vários estados.
5. **Saída por venda (`flip`) e papel híbrido seguem fora de escala.** Líquido do `flip` 16× o equilibrado, híbrido ~5× o equilibrado do `--full`. Ao tornar o risco "valer a pena" (1C: retorno convexo, choques em % da receita), o mais provável é amplificar esses dois caminhos primeiro. Sugestão: incluir `flip` e `--role hybrid` como guarda-corpos no teste-meta da 1C.

Outros riscos menores: `r16-playbot` vermelho por outro motivo (`hires` = 0) — o bot pode estar deixando de contratar, o que distorce todas as medidas de balanço baseadas nele; tempos de relógio de lote paralelo enganam (sempre CPU); determinismo só verificado em processo novo (o "salvar + carregar + continuar" da 1A não foi medido aqui).

## Apêndice — dados brutos

- `scripts/measure28.ts` reproduz os itens 2 e 3 (`long`, `legib`, `echoes`). O gancho de medição (`registerSimHook('week', 'measure28', …)`) só lê o estado.
- 3c por partida (seed `m28-i`, início, nº de eventos distintos, % sem dica nem "Agora"):
  m28-0 1889 (quebrou em 1890) 29 ev. 40 % · m28-1 1955 79 ev. 41 % · m28-2 1975 86 ev. 50 % · m28-3 2005 87 ev. 52 % ·
  m28-4 1889 78 ev. 43 % · m28-5 1955 82 ev. 54 % · m28-6 1975 (quebrou em 1976) 28 ev. 65 % · m28-7 2005 90 ev. 53 %.
- As sondagens de legibilidade usam seeds `m28-*`, não as `b19-*` do balance; a quebra de `m28-0` (1889) e `m28-6` (1975) repete o padrão de início do balance.
