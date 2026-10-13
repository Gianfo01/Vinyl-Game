# Saúde da suíte — rodada 27

Medido em `claude/friendly-brown-vpsmfl` @ `b748d64` (merge CITY2 + ACH), numa máquina sem outra carga (4 vCPU), em 2026-10-12/13.

## Como foi medido

- `npm ci`, depois `npx tsc --noEmit -p .` → **OK, 0 erros**.
- Suíte inteira **em série**: `npx vitest run --no-file-parallelism --reporter=dot` (com `testTimeout: 120000` do `vitest.config.ts`).
- Cada arquivo com falha rodou de novo **sozinho** (`npx vitest run tests/<arquivo>`).
- Para separar "golden/semente velha" de "regressão", os 6 arquivos com falha determinística rodaram em worktrees nos commits de merge da r27 (bisect manual entre `a6aabda` e `c5d11cd`).

## Totais

| | |
|---|---|
| Arquivos de teste | 204 (197 passaram, **7 falharam**) |
| Testes | 1379 |
| Passaram | 1365 |
| Falharam | **13** |
| Pulados | 1 (`r19-infra` › "r19 11.9 — cobertura dos tipos da Caixa", pulado de propósito) |
| Duração | 2574 s (≈ 43 min; collect 355 s, tests 2163 s) |
| Erros fora de teste | 4 × `[vitest-worker]: Timeout calling "onTaskUpdate"` (timeout de RPC do worker do vitest, não é asserção; aparece quando um arquivo bloqueia o worker por muito tempo, ex. `sim.test.ts` com 238 s; não derrubou nenhum teste) |

**Nenhuma falha é timeout nem intermitente**: as 13 falham do mesmo jeito quando o arquivo roda sozinho. Todas são classe (a). Uma delas (`r14-db`) é um limite de desempenho.

## Falhas

Legenda: (a) falha real de asserção · (b) timeout que passa sozinho · (c) intermitente.

| # | Teste | Classe | Asserção | Onde quebrou | Diagnóstico |
|---|---|---|---|---|---|
| 1 | `r27-m2` › modo rápido intacto › tourDay refatorado (playStop) dá exatamente o mesmo mundo de antes | (a) | `expected +0 to be 7` (tests/r27-m2.test.ts:40) | passa em `57230cb` (branch M2); falha a partir de `3315dc2` (merge do M2 na linha principal) | **Golden velho.** Contagem de shows, caixa e hashes de `tours/acts/rng` foram medidos na worktree do M2. Depois do merge com M3/E2 (e mais tarde com F), a semente `r16pb-5` toma outro caminho. Hoje o playbot não marca **nenhuma** turnê nos 8 meses (`tours=0`), então os valores precisam ser medidos de novo. Não indica que `playStop` mudou o modo rápido. |
| 2–6 | `r27-m2` › show jogável › (5 testes: contexto coerente; determinístico; setlist bom > ruim; cada decisão na direção certa; bem jogado ≈ +0–30% de fãs) | (a) | `TypeError: Cannot read properties of undefined (reading 't')` em `key()` (tests/r27-m2.test.ts:49) | passam até `3315dc2`; falham a partir de `cacfee6` (merge do F, modelo histórico) | **Fixture velho.** `FIX` (7º mês da semente `r16pb-5`) deveria ter "duas turnês marcadas". Com os dados históricos novos do F, o playbot não marca turnê nenhuma (`s.tours.length = 0`, `playableShows27(FIX,40) = []`). `[0]` vira `undefined` e o teste cai antes de testar o show. É preciso outra semente/mês, ou marcar uma turnê à mão no `beforeAll`. Também convém um `expect(list.length).toBeGreaterThan(0)` para a falha ficar legível. |
| 7 | `r27-m2` › negociação jogável › a faixa revelada contém o mínimo escondido; proposta generosa fecha com contrato normal | (a) | `expected 'lost' to be 'deal'` (tests/r27-m2.test.ts:194) | passa em `57230cb`; falha a partir de `3315dc2` | **Fixture velho, o motor está certo.** Reproduzido: no `FIX` atual o ato escolhido é Bunny Wailer. A proposta "generosa" (6× adiantamento = $64.386) passa do caixa livre ($63.903, já com os +$50.000 do teste). `deal27` derruba o acordo pela trava `freeCash20`, como deve. O colchão de caixa do teste foi pensado para o mundo do branch. |
| 8 | `r27-m3` › modo rápido igual ao de antes (commitCrime sem plano; sem dq nada muda) | (a) | 2ª semente: esperado `"11:0.70/0.16:10331942"`, veio `"00:0.70/0.16:9926500"` (tests/r27-m3.test.ts:70) | passa em `be6b6fa` (branch M3); falha a partir de `6e56660` (merge do M3) | **Golden velho.** As chances (`p=0.70`, `q=0.16`) batem e a parte "sem dq nada muda" passa. Só a rolagem da 2ª semente (`r27m3-q2`) mudou de sucesso para fracasso, porque o mundo/RNG gerado na linha principal é diferente do da worktree. Basta medir de novo `QUICK_SNAPSHOT` (linha 206). |
| 9 | `r9-ventures` › gestão de artistas › empresaria artista de outro selo e recebe comissão no patrimônio pessoal | (a) | `expected false to be true` (tests/r9-ventures.test.ts:95) | falha a partir de `6e56660` (merge do M3) e também no branch F (`a64fb9d`) | **Teste frágil + semente que mudou de trajetória.** O laço `for (i<30) pitchClient(...)` dá na prática **uma** tentativa: na primeira recusa, `markRefused9` põe um cooldown e as outras 29 voltam "disse não há pouco". O teste passava só porque a 1ª rolagem de `mgChance` dava certo no mundo antigo. Com o mundo novo, a rolagem falha. Não é regressão de `ventures9`. Para corrigir, limpar o cooldown no laço ou escolher um candidato com chance alta. |
| 10 | `r16-playbot` › uma run curta tem ações variadas de jogador e é determinística | (a) | `expected 0 to be greater than 0` (tests/r16-playbot.test.ts:33 → `L.hires`) | falha a partir de `cacfee6` | **Sementes trocadas dos dois lados do merge.** A linha principal trocou `r16pb-5` por `r16pb-9`. O branch F manteve `pb-5`, que já falhava lá. No mundo combinado, `pb-9` termina o ano com `hires: 0`; `pb-5` contrata 1 mas fica com `tours: 0`. Parece semente velha, mas o próprio comentário do teste já avisa que "contratar no 1º ano ficou raro — revisar na frente do bot". Trocar de semente de novo esconde um sinal de equilíbrio do playbot (contratação/turnê no 1º ano). |
| 11 | `r12-career` › agente x promotor › promotor marca, prevê e liquida um show; força local e cansaço se movem | (a) | `expected 'cancelled' to be 'played'` (tests/r12-career.test.ts:27) | já falha no próprio branch F (`a64fb9d`) | **Fixture velho por causa dos dados históricos.** O teste pega o ato mais famoso de 1990 (seed `r12-tour`), hoje "The Broken Dreamers". Com o modelo histórico do F, esse ato **se separa** (`status: 'split'`) nos 3 meses seguintes. `resolve()` cancela o show porque `!activeAct(act)` (src/sim/sys/tour12.ts:267). O motor está certo. O teste deveria escolher um ato sem fim de carreira roteirizado, como o `r9-ventures` já faz. |
| 12 | `r19-infra` › matriz fato → consumidores › todo tipo emitido tem consumidor ou está na lista justificada | (a) | órfãos: `board27 (board27.ts)`, `crisis27 (crisis27.ts)` (tests/r19-infra.test.ts:98) | falha a partir de `15dc7fe` (merge do P2B) | **Regressão real (pequena).** O P2B passou a emitir os fatos `board27` (src/sim/sys/board27.ts:260) e `crisis27` (src/sim/sys/crisis27.ts:326) sem nenhum leitor e sem entrada em `WHITELIST19`. Para resolver, ligar um consumidor (crônica/memória/NPC) ou justificar os dois tipos na lista de exceções. Golden nenhum está envolvido. |
| 13 | `r14-db` › enorme: criar o jogo < 3s e avançar meses continua rápido | (a) desempenho | `expected 1904.75 to be less than 1500` (série); sozinho `1851` (tests/r14-db.test.ts:74) | — | **Possível regressão de desempenho.** Na base `huge` de 2010, um mês leva ~1,85–1,90 s contra o limite de 1,5 s, mesmo com a máquina livre e o arquivo rodando sozinho. Criar o jogo continua rápido (792 ms). Não deu para separar o quanto é desta máquina e o quanto é custo novo no tick da r27 (E2 cenas/rivais/economia, P2B, FLOW). Vale perfilar `advanceMonth` em `huge` antes de afrouxar o limite. |

### Resumo por causa

- **Golden/seed/fixture velho depois de merge** (o motor funciona; o teste foi medido numa worktree): #1–#8, #10, #11, além da fragilidade do #9.
- **Regressão real:** #12 (fatos `board27`/`crisis27` sem consumidor).
- **A investigar:** #13 (desempenho do tick em `huge`) e o sinal de equilíbrio do #10 (playbot quase não contrata nem sai em turnê no 1º ano).

## 10 arquivos mais lentos (execução em série)

| # | Arquivo | Duração |
|---|---|---|
| 1 | tests/sim.test.ts | 237,9 s |
| 2 | tests/r10-life.test.ts | 88,0 s |
| 3 | tests/r18-era1889.test.ts | 78,8 s |
| 4 | tests/r19-data-d.test.ts | 65,4 s |
| 5 | tests/r10-labels.test.ts | 54,6 s |
| 6 | tests/r8-social.test.ts | 48,7 s |
| 7 | tests/r18-talent.test.ts | 48,1 s |
| 8 | tests/r9-identity-plus.test.ts | 45,9 s |
| 9 | tests/r18-dm.test.ts | 40,5 s |
| 10 | tests/r4-scenes.test.ts | 39,6 s |
