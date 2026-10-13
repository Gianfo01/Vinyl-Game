# Desempenho da r27 (perf27)

**Problema:** em `tests/r14-db.test.ts` ("enorme: criar o jogo < 3s e avançar meses continua rápido"), um mês do jogo
enorme de 2010 levava cerca de 1,85–1,90 s, acima do limite de 1,5 s.

**Resultado:** no build empacotado (sem o custo do vitest), um mês do enorme 2010 caiu de **≈1,70 s para ≈1,20 s
(−30%)**. O médio 1975 caiu de **≈0,52 s para ≈0,43 s (−17%)**. O estado depois de 12 meses é **idêntico byte a byte**
nos 4 cenários testados. Rodado sozinho, o r14-db passa (≈1,41 s/mês no vitest, contra 1,5 s de limite).

## Método

- `scripts/prof27.ts` cria o jogo como o r14-db: semente `r14perf`, nomes reais, base `huge`, 2010. Ele aquece 1 mês
  e depois mede N meses de `botMonth + advanceMonth`. O tempo de cada gancho vem do `globalThis.__hookProf`, que
  `runSimHooks` já suportava. Uso: `npx tsx scripts/prof27.ts huge 2010 12 30`.
- Para ver custo por linha, o script foi empacotado com esbuild (`npx esbuild scripts/prof27.ts --bundle
  --platform=node --format=esm`) e rodado com `node --cpu-prof`. O tsx junta cada módulo numa linha só; o bundle
  mantém as linhas e os comentários `// src/...`, então dá para atribuir o tempo próprio por arquivo, linha e função.
- Comparação A/B: uma worktree no commit base `8b76776` contra o branch atual, mesmo script empacotado, execuções
  alternadas. A máquina é barulhenta (±5–10%), então valem as médias de várias rodadas.

## Maiores custos antes (enorme 2010, ms/mês, tsx, base)

| ms/mês | gancho/sistema | r27? |
|---:|---|---|
| ~120 | `playerActs` (for-in em 2,8 mil atos, chamado centenas de vezes por mês, espalhado em dezenas de sistemas) | não |
| ~110 | `Object.values(s.releases)` (10 mil lançamentos, ~3 ms por chamada) em ~130 pontos (media19ev, ux19, license17, relics18, calendar19, zines19, **eggs27**, **scenes27**, **rivals27**…) | parcial |
| 109 | week:charts7 | não |
| 106 | week:hype12 | não |
| 99 | compose:sound | não |
| 99 | month:npc17 (oscila de mês para mês) | não |
| 48 | month:lineup16 (`srcFame` varre todos os atos por membro) | não |
| 40 | month:fame16 | não |
| 33 | month:bridge17 (stress17 `factPressure` por pessoa) | não |
| 31 | compose:creation | não |
| 29 | month:lifecycle7 | não |
| 27 | month:media17 | não |
| 24 | month:ux19 | não |
| 22 | month:managers14 | não |
| 21 | month:kin15 | não |
| 21 | month:ability18 (soul9 recalculado) | não |
| 17 | month:situations17 | não |
| 17 | month:fame15 | não |
| 16 | month:crimemem23 | não |
| 15 | month:secrets23 | não |
| 15 | month:crime17npc | não |
| 14 | month:chron9 | não |
| 13 | month:eggs27 | **sim** |
| 12 | month:sex17 | não |
| 9 | month:scenes27 | **sim** |

O mês não ficou lento por causa de um sistema novo específico. Os sistemas da r27 entram com custo pequeno cada
um (eggs27 ~13, scenes27 ~9, rivals27/aud27/critic27 alguns ms). O que cresceu foi o número de varreduras completas
de `s.acts` e `s.releases`, que no V8 custam 0,4–3 ms cada em objetos com milhares de chaves. Somadas, passavam de
200 ms/mês.

## Depois (enorme 2010, ms/mês, bundle)

| ms/mês | gancho |
|---:|---|
| ~87 | week:charts7 (já era um laço numérico enxuto; não mexi) |
| ~87 | compose:sound |
| ~80 | week:hype12 |
| ~32 | month:fame16 |
| ~24 | compose:creation |
| ~21 | month:bridge17 |
| ~18 | month:lifecycle7, month:ability18 |
| ~16 | month:managers14, month:soul9 |
| ~14 | month:npc17 |
| ~13 | month:kin15, month:fame15, month:lineup16 |

Total dos ganchos: 1180 → 785 ms/mês. Total do mês: 1700 → 1200 ms/mês.

### A/B final (bundle, 12 meses, 2 rodadas)

| cenário | base | depois |
|---|---:|---:|
| enorme 2010: avanço/mês | 1707 / 1696 ms | 1192 / 1214 ms |
| enorme 2010: CPU do processo/mês (inclui threads de GC/compilação) | 2425 / 2406 ms | 1910 / 1943 ms |
| médio 1975: avanço/mês | 536 / 501 ms | 434 / 424 ms |
| vitest r14-db, `simulate(1 ano)/mês` (inclui o `createGame`) | ~1850–1900 ms | 1406–1419 ms (sozinho) |

Sobre a meta de "≤ 1,3 s de CPU": o tempo da thread principal (JS) fica em ≈1,2 s/mês no bundle. Já o
`process.cpuUsage()` soma as threads paralelas de GC e de compilação e dá ≈1,9 s/mês. Pela régua do vitest, que
mede o tempo de relógio e inclui transformação e criação do jogo, o número é ≈1,41 s/mês. Isso fica abaixo do limite
do teste (1,5 s), mas **acima** de 1,3 s. Com 12 arquivos de teste rodando em paralelo numa máquina de 4 núcleos, o
r14-db ainda pode passar de 1,5 s por disputa de CPU (vi 1523 ms numa rodada assim).

## O que mudou (sem alterar resultados)

1. **`src/sim/tickcache27.ts` (novo): listas guardadas por passo do relógio.** `advanceWeek` roda dentro de
   `tickScope27`. Dentro do passo, `actsNow27(s)` e `releasesNow27(s)` devolvem `Object.values` montado uma vez e
   refeito quando um ato ou lançamento entra ou sai. Os avisos usados são os mesmos que já mantinham os índices da
   r17: `actsTouched17`, `noteRelease17` e `releasesTouched17`. Auditei todos os pontos que inserem ou apagam em
   `s.acts`/`s.releases`, e só o `tribute19.sign19` não avisava; ganhou `noteRelease17`. Inserções de lançamentos
   ficam pendentes e entram numa cópia nova na próxima leitura, com o mesmo conteúdo e a mesma ordem de
   `Object.values`. Os laços em andamento seguem no array antigo, como antes. **Fora do passo** (interface, testes
   que mexem no estado à mão) nada é guardado.
   - `util.playerActs` usa esse cache: a mesma varredura de dono/status, só que sobre um array (23 µs contra 400 µs).
   - `allReleases17` lê do cache dentro do passo. `noteRelease17` deixou de copiar 10 mil lançamentos por inserção.
   - Cerca de 230 varreduras `Object.values(s.acts|s.releases)` de leitura pura (`.filter/.some/.find/.reduce/.map`
     ou `for…of`) nos sistemas mais caros passaram a `actsNow27/releasesNow27`. O tipo `readonly` garante, na
     compilação, que ninguém ordena ou altera o array no lugar.
2. **soul9:** os sorteios base (hash de semente+id por faceta) ficam guardados por pessoa. A persona muda todo mês
   e invalidava o cache inteiro. A assinatura agora é comparada campo a campo, sem montar uma string por chamada.
3. **lineup16.carryFame:** um índice pessoa→atos (formação atual mais antigos do realworld) na ordem de `s.acts`,
   com o mesmo desempate de `srcFame` (`>` estrito; a fama é lida na hora).
4. **stress17.factPressure:** os fatos ruins das últimas 13 semanas são separados uma vez por (semana, seq), na mesma
   ordem do mais novo ao mais velho.
5. **hype12 (laço semanal):** `actBase` é lembrada até a chave `a:<ato>` decair. Esse decaimento é a única mudança
   nas entradas dela dentro do laço. As ~800 cenas usam um caminho só numérico (mesmo filtro `|v| ≥ 0,5`, mesma
   ordenação estável por |v|, mesma soma) e top 3 por seleção em vez de ordenar a cena inteira.
6. **fame16:** a maior cena por (país, gênero) fica lembrada durante `fame16Month`, onde `s.scenes` não muda.
7. **creation/core:** os hashes puros de tema (`themeTrend`, `themeAffinity`) ficam guardados; antes eram chamados
   por música × tema.
8. **npc17.careers:** usa `actsOfPerson17` (índice validado da r17) em vez de varrer todos os atos por pessoa.

Tentado e descartado: índice ator→fato para o `recentFacts` do hype17 (fatos mudam no meio da semana, como
visibilidade revelada e atores adicionados, e o ganho seria ~10 ms) e cache de `s.persons` (26 pontos de escrita
sem aviso, frágil).

## Prova de determinismo

`scripts/det27.mts` cria o jogo, roda 12 × (`botMonth` + `advanceMonth`) e grava o sha256 de `JSON.stringify(state)`
**a cada mês**. Rodei esse script na worktree do commit base (`8b76776`) e no branch, e comparei as saídas:

```
npx tsx scripts/det27.mts <raiz-do-repo> [m1962,m1985,m2005,h2010]
```

| cenário | semente / base / início | hash após 12 meses (base = depois) |
|---|---|---|
| m1962 | seedA / medium / 1962 | `d6e8a9d1ac` |
| m1985 | seedB / medium / 1985 | `4842ea852d` |
| m2005 | seedC / medium / 2005 | `99846f1a83` |
| h2010 | r14perf / huge / 2010 | `087b1576c6` |

Os 48 hashes mensais (4 cenários × 12 meses) são iguais entre base e depois. O diff ficou vazio depois de cada
etapa. O base também foi rodado 2 vezes para confirmar que ele próprio é determinístico.

## Testes

`npx vitest run tests/r14-db.test.ts tests/r19-infra.test.ts tests/r16-playbot.test.ts tests/r27-eggs.test.ts
tests/r27-consistency.test.ts tests/r27-factseed.test.ts tests/r27-world.test.ts tests/r27-mundo.test.ts
tests/r27-int.test.ts tests/r27-flow.test.ts tests/r27-flow2.test.ts tests/r27-audit.test.ts tests/r27-known.test.ts`:
174 de 176 testes passaram e 1 foi pulado. O teste de tempo do r14-db falhou nessa rodada por disputa de CPU, com
1523 ms/mês. Rodado sozinho 3 vezes, passou nas 3 (1406, 1409 e 1419 ms/mês). `npx tsc --noEmit` passou limpo.

## Rodada 2 (sobre `73ec77d`: AUD1, SONG, CTX já integrados)

Depois do merge, o r14-db "enorme" voltou a ficar perto do limite: 1505–1542 ms/mês no vitest, segundo a medição da
sessão integradora. Pelo perfil, voltaram a subir week:hype12 (130 ms no bundle), week:charts7, compose:sound e o
`createGame` que roda dentro de `simulate`.

### O que mudou (resultados idênticos)

1. **hype17/hype12: índice ator → fato mais recente** (`withFactIx17`). O laço semanal do hype chamava
   `recentFacts` uma vez por ato, varrendo 2 meses de fatos a cada vez. Agora um índice é montado sob demanda e vale
   só durante esse laço. O laço não emite nem altera fatos; fora dele os fatos podem mudar (visibilidade revelada,
   fato substituído no lugar), por isso o índice não sobrevive ao laço. O filtro é o mesmo (≥ 25, não secreto,
   2 meses) e devolve o primeiro fato do mais novo para o mais velho. **hype12: 130 → 61 ms/mês.**
2. **reviews.ctxOf: candidatos por (ano, família)** (`withRivalIx27`, só dentro do laço de resenhas de
   `mediaMonth`). Antes, cada resenha percorria os lançamentos do ano inteiro com `familyOf`. Agora os candidatos são
   separados uma vez, na mesma ordem; a qualidade é lida na hora e o desempate é `>` estrito. O laço não cria nem
   apaga lançamentos, nem muda gênero, ano ou qualidade.
3. **relidx17.allReleases17 fora do passo:** `noteRelease17` copiava a lista inteira (10 mil) a cada lançamento
   inserido. Ao semear a base enorme no `createGame`, isso virava O(n²). Agora os lançamentos ficam pendentes e a
   próxima leitura faz uma cópia só. **`createGame` (enorme 2010) caiu de ~880 ms para ~580 ms.** Como `simulate`
   chama `createGame`, isso também baixa o número por mês do teste.
4. **sound/moments.momentMarks:** dentro do passo do relógio, um índice diz quais atos têm marcas `mom:`. Só
   `markMoment` escreve essas chaves e atualiza o índice; ninguém apaga. Atos sem marca saem direto; os valores
   continuam lidos de `s.flags`, na ordem de `NEW_MOMENTS`.
5. `actidx17.ix` e as varreduras restantes nos sistemas novos e antigos que apareciam no perfil (songmkt27, scout23,
   night27, botbiz27, rivals8, money19, writers19, fakes19, love17 e outros, 91 pontos) passaram a usar
   `actsNow27`/`releasesNow27`.

### Medições (rodada 2)

| medição | 73ec77d | depois |
|---|---:|---:|
| bundle, enorme 2010, avanço/mês | ~1150 ms | ~1070–1115 ms |
| bundle, week:hype12 | 130 ms | 61 ms |
| vitest r14-db sozinho, `simulate(1 ano)/mês` (máquina ociosa) | 1300–1393 ms | **1231–1245 ms** |
| vitest r14-db, alternando base/novo com outra suíte rodando | 1380 / 1434 / 1859 ms | 1297 / 1345 / 1308 ms |
| `createGame` enorme 2010 (vitest) | 875–908 ms | 545–642 ms |

Com a máquina ociosa, o r14-db sozinho ficou em ≈1,24 s/mês, abaixo da meta de ~1,35 s. Um ponto de cautela: a
sessão integradora mediu o base em 1505–1542 ms, mais lento que os 1300–1393 ms medidos aqui. A melhora relativa
nesta rodada foi de ~8–10% no mês (mais ~300 ms no `createGame`). Numa máquina como a dela, isso deve dar perto de
1,35–1,40 s/mês.

### Determinismo (rodada 2, contra 73ec77d)

`scripts/det27.mts`, 4 cenários × 12 meses. Todos os 48 hashes mensais são iguais entre `73ec77d` e o branch:

| cenário | hash após 12 meses |
|---|---|
| m1962 (seedA, medium) | `bdd4ec6360` |
| m1985 (seedB, medium) | `a157bbfecc` |
| m2005 (seedC, medium) | `2c68b9cd46` |
| h2010 (r14perf, huge) | `8b017215e2` |

Testes: passaram r27-m2 (os 48 valores-referência), r19-infra, r16-playbot, r27-eggs, r27-consistency, r27-world,
r27-flow e r27-int (140 passados, 1 pulado). O r14-db passa sozinho. `npx tsc --noEmit` passou limpo.
