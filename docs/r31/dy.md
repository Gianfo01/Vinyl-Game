# Onda 3 · D (Mercado) e Y (Paradas por país) — o que mudou e o que a medição mostrou

Código: `src/sim/r31/market31.ts` (interruptores, pressão, ganchos), `src/sim/sys/mercado31.ts` (paradas por país),
`src/sim/market.ts`, `src/sim/sys/charts7.ts`, `src/sim/sys/fame16.ts`, `src/sim/travel.ts`, `src/sim/tours.ts`,
`src/ui/panels/tours.ts`. Testes: `tests/r31-mercado.test.ts`, `tests/r31-paradas.test.ts`.
Medições: `docs/r31/dy-medida.{md,json}` (tudo ligado) e `docs/r31/dy-medida-off.{md,json}` (interruptores D/Y
desligados), as duas no mesmo código (depois de juntar a Bolsa E), 4 sementes × 5 eras × 36 meses;
`docs/r31/dy-no1.json` / `dy-no1-off.json` (paradas). Scripts: `scripts/r31/home-no1.ts`, `forecast-err.ts`,
`charts-who.ts`; `measure.ts` ganhou `--sw id=v,...`.

## O que muda para o jogador

- **Sem a penalização pós-1990.** A qualidade dos seus discos (e da sua banda em selo de outro) não perde mais até
  15 pontos a partir de 1990. No lugar, o **mercado inteiro encolhe na era digital** — igual para todos, rivais
  incluídos (de 1990 a 2005 a demanda total cai até ×0,8). Aparece na explicação das vendas de cada disco:
  "Mercado saturado (era digital), igual para todos ×0,80".
- **Previsão de vendas pela mesma conta das vendas reais** (apelo, acaso médio, calor da semana, foco promocional,
  teto por lançamento, modificadores de unidades com a idade certa, expectativa do hype, canais de venda padrão,
  fator de escala do selo e pressão). Antes errava para baixo (o disco vendia 1,3–1,4× o previsto); agora acerta
  em média. A procura real das 10 primeiras semanas fica guardada no disco (`dem10`) para comparar.
- **Transporte por trecho de turnê.** No planejador (etapa Logística) cada trecho mostra as opções reais da época —
  navio, trem, ônibus, avião a hélice (caro e raro antes de 1946), jato (1958+), hyperloop (2035+) — com dias,
  custo e cansaço. O padrão continua automático; a escolha muda as datas da turnê e o cansaço do elenco (navio
  descansa, jato cansa mais por dia).
- **Paradas por país.** A fama do artista em cada país pesa nas vendas ali (turnê, divulgação, paradas e prêmios do
  país chegam à parada daquele país); mesma língua vende mais e língua estrangeira menos (peso caindo com streaming
  e vídeo curto); CanCon, Toubon, cota australiana, cinema indiano, Malvinas, Coreia × Japão, Indonésia, rádios
  livres, rádio comercial britânica e a cota da associação valem **só no país da lei** (cada uma uma vez); nº 1 num
  país puxa vizinhos e quem fala a mesma língua; estrela fora do seu mercado e língua tem teto de fama mais baixo; a
  parada nacional soma um pouco à fama global (pesada pelo tamanho do país); artistas do mundo guardam picos de
  parada por país; e, por último, parte de cada parada nacional fica reservada aos artistas da casa conforme a
  preferência local (Japão, Índia, Coreia altos; Holanda zero).

Cada parte tem interruptor (`d31.pressure`, `d31.pressureMin`, `d31.forecast`, `d31.transport`, `y31.local`,
`y31.lang`, `y31.laws`, `y31.domino`, `y31.fame`, `y31.reserve`), todos editáveis no editor (área Mundo).

## Números

### Nº 1 da casa nos últimos 40 (início 1985, 48 meses, 2 sementes, robô)

| País | Antes (Y desligado) | Depois | Referência real aprox. |
|---|---:|---:|---:|
| EUA | 83% | 78% | 85% |
| Reino Unido | 95% | 90% | 60% |
| Brasil | 100% | 100% | 80% |
| Japão | 15% | 81% | 90% |
| Alemanha | 5% | 9% | 30% |
| França | 19% | 91% | 55% |
| Itália | 74% | 75% | 60% |
| Canadá | 9% | 53% | 15% |
| Austrália | 0% | 6% | 25% |
| Holanda | 0% | 4% | 20% |
| Suécia | 14% | 29% | 30% |
| México | 39% | 52% | 70% |
| Coreia | 4% | 40% | 90% |
| Índia | 64% | 96% | 95% |
| Espanha | 0% | 59% | 45% |
| Argentina | 29% | 69% | 55% |
| **Erro médio absoluto** | **30,9 pontos** | **19,3 pontos** | |

(Antes de juntar a Bolsa, a mesma medida deu 33,0 → 17,3. Duas sementes: cada país oscila ±15 pontos entre
sementes.) O mercado reservado só entrou porque a medição mostrou necessidade: com fama local, língua, leis e
dominó o erro caiu de 33 para 25 pontos, mas o Japão ficou em 53% e a Coreia em 23% — o mundo gerado tem poucos
artistas japoneses, coreanos, alemães e holandeses ativos (9 no Japão, 6 na Holanda contra 188 nos EUA numa partida
de 1987). Ligado, o Japão vai a 81–98%. Alemanha, Holanda e Austrália seguem baixas pela mesma falta de artistas
locais (não é regra de mercado; fica para a base de artistas). Reino Unido e Brasil ficam acima do real.

Fama → vendas → parada → fama tem limites: a demanda por país **redistribui** (o fator de cada lançamento é dividido
pela média da semana, pelo apelo); sem isso, quem já está nas paradas ganha desvio local positivo em todo país e o
mercado infla contra os outros — numa medição intermediária, as 4 partidas de 1990 quebraram por isso. O desvio
local já tinha teto (±40) e esquecimento (fame16).

### Previsão × procura real das 10 primeiras semanas (robô, 3 sementes, 36 meses; média geométrica real/previsto)

| Início | Previsão antiga | Previsão nova |
|---|---:|---:|
| 1975 | 1,39 (quartis 1,06–1,87) | 0,98 (0,70–1,33) |
| 2008 | 1,37 (0,89–2,22) | 1,10 (0,83–1,36) |

### Balanço (US$ de 2020, 36 meses; receita do 3º ano, média geométrica das partidas que chegaram ao fim)

| Início | Desligado | Ligado |
|---|---:|---:|
| 1990 | 1,07 mi (1 de 4 quebrou) | 1,93 mi (1 de 4 quebrou) |
| 2012 | 2,67 mi | 2,08 mi |
| 2030 | 1,69 mi | 2,21 mi |
| **Tarde ÷ 1990** | 2012: 2,5× · 2030: 1,6× | 2012: 1,1× · 2030: 1,15× |

Medianas por era e tempos completos nos arquivos `dy-medida*.md`. 1900 e 1955 mudam pouco no sentido (1900: 1 → 0
partidas quebradas; 1955: 0 → 1), dentro do ruído de 4 sementes.

**Meta "começar tarde rende ~3× começar em 1990": não fechou pela pressão.** A atribuição (1990 sozinho, 4 sementes,
cada interruptor desligado) mostra que quem mais mexe é a **previsão nova**: no físico (CD), a previsão antiga
subestimava e o robô — e o jogador que seguisse a tiragem sugerida — prensava pouco e perdia vendas por falta de
estoque; com a previsão certa, o começo de 1990 sobe de ~0,65 mi para ~1,9 mi. A pressão só pode baixar o tarde, e
o tarde já está perto do 1990. Medição anterior (antes de juntar a Bolsa) deu 3,0× com a mesma pressão (×0,8):
o número é sensível ao mundo e a 4 sementes. Deixei `d31.pressureMin` em 0,8 (visível e editável) e registro a
decisão pendente em DECISOES: se a meta de 3× continua valendo, o ajuste certo não é a pressão (que mexe no tarde)
— é decidir quanto o começo físico deve render com a tiragem bem dimensionada.

### Desempenho

CPU por mês (medianas das eras, mesma máquina, mesmo código): 1900 200 → 275 ms; 1955 493 → 616; 1990 897 → 1.200;
2012 1.455 → 1.672; 2030 1.675 → 2.015 (+15–35%). O fator por país de cada lançamento é refeito uma vez por mês e
guardado no próprio lançamento (`y31k`), o que também mantém salvar/carregar no meio do mês igual; o custo que
sobra é a repartição por país das paradas (já existia) com os fatores novos e a média semanal. Save: até +0,3 MB
(picos por país dos artistas do mundo, `x4.y31`, podados por ano).
