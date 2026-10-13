# Rodada 29 — Formação inicial real das bandas (mais famosa / original)

> Pedidos do autor:
> - *"faça o modo padrão ser utilizando nomes reais e formações iniciais reais, mas todo o resto inventado (ainda mais no modo rápido)"*
> - *"pessoas que surgiriam na banda podem surgir sem nenhuma banda no save"*
> - *"na verdade deixe escolher entre formação original e mais famosa"*
> - *"isso só na completa; na Nova run rápida faça começar com a formação mais famosa"*
> - *"e os outros artistas ficam sem banda (e se não participaram da banda no save não devem aparecer como ex-integrantes)"*

O mundo padrão da Nova run ("Reais em mundo aleatório") agora usa **nomes reais e a formação inicial real** de cada
banda. Todo o resto é inventado: catálogo, contratos, vínculos, **trocas de formação**, sucesso e trajetória.

## A escolha

Campo novo `RunConfig.lineup29?: 'famous' | 'original'` (`src/sim/lineup29.ts`).

| Opção | Quem forma a banda | Beatles em 1962 |
|---|---|---|
| **Mais famosa (padrão)** — `famous` | A formação clássica (`classicLineup25`, o maior elenco simultâneo documentado) ou, sem ela, a da estreia (`inLineupAt` no ano da estreia). | John, Paul, George e **Ringo** |
| **Original (da estreia)** — `original` | Quem estava na banda **no começo** do ano de estreia: o mês documentado (`MONTHS27`) decide entradas e saídas no próprio ano. Sem mês, vale o ano (como `inLineupAt`). | John, Paul, George e **Pete Best** |

- Vale **só** com nomes reais fora do modo exato: `history: 'free'` (aleatório, "sem estreias reais depois", caos) e
  `history: 'loose'` ("Real até o início, história alternativa depois"). Na **Fidelidade histórica** (`strict`) o campo
  é ignorado: os períodos documentados continuam exatamente como antes. No universo ficcional também não vale.
- A formação vale **desde a primeira aparição do ato**: quem já existe no início e quem surge depois (estreias reais
  futuras, catálogo clássico que surge pelo `worldSpawns`, com o deslocamento de ±2 anos do mundo aleatório).
- **Nada de troca agendada.** Nenhuma entrada/saída `lin` (nem a janela de identidade `identityYear27`/`IDENT_CAP27`):
  depois da criação, toda troca de formação é da simulação (lineup16, member29, kin…).
- **Morte:** quem da formação escolhida já morreu na data de início sai da banda. Se a banda já existia quando a pessoa
  morreu, ela fica como **ex-integrante por morte** (The Who em 1981 no mundo "Real até o início": Daltrey, Townshend e
  Entwistle; Keith Moon ex-integrante, †1978). Se morreu antes da estreia, nunca passou pela banda. Se a formação inteira
  já morreu, ela fica como está (o ato vira história, como antes).
- **Jovens demais:** quem ainda não tem 15 anos no início não entra na banda (vira pessoa livre quando tiver idade).
- A morte documentada fecha a passagem antes do cálculo da formação clássica: Keith Moon não tem saída nos dados, só a
  morte em 1978, e sem isso o "maior elenco" do The Who era Moon + Kenney Jones juntos (dois bateristas).
- **Formação menor que o papel pede:** fica menor. Não se inventa integrante de preenchimento.

### Quem fica de fora vira pessoa livre

Os integrantes reais que não estão na formação escolhida (Pete Best e Stuart Sutcliffe na mais famosa; Ringo e Stuart
na original) **existem no mundo sem banda**:

- criados pela mesma criação de Pessoa real e registrados no **mesmo índice canônico** (`rw.pid`), então qualquer ato
  real que surja depois com essa pessoa (carreira solo, outra banda, supergrupo) reaproveita a mesma Pessoa (a carreira
  solo de David Gilmour usa o Gilmour livre que não entrou no Pink Floyd de Syd Barrett);
- **não entram** em `rw.former`, nos ex-integrantes da página do ato, na Carreira/Alma/Trajetória da ficha
  (`connect29`) nem na biografia: nesta partida nunca tocaram na banda. A história real só aparece pela referência de
  "história real", quando existe;
- aparecem na busca (Ctrl+K) com a dica **"sem banda"**, e a ficha mostra "Bateria · sem banda"; dali valem as ações
  com a pessoa, e os sistemas que usam pessoas (feats, sessões, oferta a integrante do R29 quando ela entrar numa banda,
  kin) as enxergam como qualquer Pessoa;
- `rw.free29` guarda pessoa → ato da história real de onde ela vem (só referência; nunca vira "ex-integrante");
- quem é jovem demais no início espera em `rw.pend29` e surge aos 15 anos (gancho mensal do realworld);
- quem morreu antes do início (pela regra do mundo: data real no "Real até o início", sorteio por idade no aleatório)
  não é criado: fica só na história real.

## Onde está

- **Nova run rápida** (`src/ui/ps/home27model.ts`, `applyQuick27`): sempre `lineup29 = 'famous'`, sem campo na tela.
- **Nova run completa** (`src/ui/newgame17.ts`, `worldCard17` → `lineupPick29`, etapa 1 *Mundo*, também nas telas
  Atlas NR do R29, que embrulham o mesmo formulário): bloco **"Formação inicial das bandas reais"** com
  "Mais famosa (padrão)" e "Original (da estreia)" (`[data-lineup29]`). Só aparece com nomes reais e mundo não exato.
  Na revisão, a linha **"Formação inicial"** (grupo Mundo).
- `draftDefaults27` (os padrões que os cartões aplicam ao serem desenhados) põe `lineup29 ??= 'famous'`, então a
  rápida e a completa produzem a **mesma RunConfig** nas mesmas escolhas; o código de partida (`setupCode17`) leva o campo.
- Textos do mundo aleatório (`WORLDS17` `short`/`fx`, `EXPLAIN20` e o aviso de `notes17`): nomes e formações iniciais
  reais (a mais famosa por padrão); catálogo, contratos, vínculos, trocas de formação, sucesso e carreiras inventados.

## Motor

- `src/sim/sys/realworld.ts`:
  - `lineupPick29(m, estreia, opção, nomeDoAto)`: índices da formação escolhida (puro).
  - `members29`: no `decorate`, no lugar do laço de períodos quando `lineup29Of(config)` vale. Reaproveita os
    integrantes gerados pela posição e passa pelo `canonical()` como antes; os gerados que sobram saem do índice antes
    de criar as pessoas livres (senão o placeholder "Ringo" ocupava o nome e o Ringo de verdade não surgia).
  - `free29` / `pending29`: as pessoas livres.
  - Geradores próprios: `semente|lin29|ato` (integrantes) e `semente|free29|nome` (livres). O fluxo compartilhado não é
    consumido pelo bloco de integrantes — a mesma pessoa livre nasce igual nas duas opções. (O resto do mundo pode
    diferir entre as opções porque sistemas posteriores sorteiam por pessoa; isso é esperado.)
- `src/sim/sys/lineup16.ts` (`stints16`): com a formação escolhida, as passagens documentadas não são desta partida —
  os fundadores começam na formação do ato e as trocas vêm do log de formação.
- `src/ui/app.ts`: a busca lista as pessoas reais livres ("sem banda").

## Compatibilidade

- Sem o campo (saves antigos, testes, bot, códigos antigos que não passam pela Nova run) = geração de antes, idêntica.
  Os testes dourados (r27-p2a, r27-p2b, r27-m2) não definem o campo e não mudam.
- Modo exato com o campo = mesmo estado de sem o campo (teste).

## Auditoria

`npx tsx scripts/audit29connect.ts --lineup famous|original` (opção nova; sem ela, a geração de antes). Rodada com
2 sementes × 1950/1962/1975/1990/2005 × aleatório/sem estreias/real/caos × 0 e 6 anos, nas duas opções: **todos os
códigos de erro em 0** (R1, R2c/a/t, R3, R4, R5, R6, R7, R8, R9). Só aparecem os informativos R1s (troca da simulação na
história alternativa) e R3l (passagem só na crônica). Não foi preciso regra nova: a pessoa livre não está em nenhum ato,
então nenhuma vista a liga à banda.

## Testes

`tests/r29-lineup-start.test.ts`: escolha pura (Beatles), Beatles 1962 nas duas opções (Pete Best/Stuart/Ringo livres e
fora dos ex-integrantes), banda que surge depois, nenhuma troca `lin`, mortos fora da mais famosa (The Who 1981), vistas
do connect29 + auditoria limpa, modo exato inalterado, sem campo = antes, determinismo, rápida = mais famosa e a escolha
da completa sobrevivendo ao redesenho, ao código e ao preparo (`buildRun27`).

## Capturas

`docs/shots29formacao/` (script `scripts/r29/formacao.mjs`, servidor `npx vite --port 5183`):
- `completa-formacao-*.png`, `completa-original-*.png`, `completa-revisao-*.png` — a escolha na Nova run completa;
- `rapida-beatles-1962-desk.png`, `rapida-beatles-formacao-desk.png` — Nova run rápida de 1962: Beatles com 4 (Ringo);
- `rapida-pete-best-livre-desk.png` — Pete Best, "Bateria · sem banda".

## Limites conhecidos

- "Mais famosa" é a regra do maior elenco (`classicLineup25`): o Pink Floyd fica com Syd Barrett (nunca houve 5
  simultâneos nos dados), e bandas que cresceram em reuniões tardias podem ganhar a formação da reunião.
- Pessoa livre não tem um botão próprio de "contratar"; ela é achada pela busca e entra no mundo pelos caminhos que já
  existem (atos reais que surgem depois, sistemas de pessoas).
