# R33 · CATÁLOGO — decisões

Frente CATÁLOGO da versão 33 (`docs/r33/PLANO.md`, item 5 e o resto da linha). Branch `claude/r33-catalogo`.
Tudo em `src/sim/r33/` (registro em `catalogo33.ts`, importado na última linha de `src/sim/r31/index.ts`).
Cada mecânica tem interruptor próprio, **desligado no código**, com chave no editor (área Ferramentas).
O estado (`x4.cat33`) só nasce quando alguma mecânica roda ligada (sem `registerExt4`) e os sorteios usam fluxo próprio
por chave (`seed|exp33|tag|ano|mês`), sem tocar no rng do mês: desligado = mesmo save, mesmo jogo.

| Interruptor | Arquivo | O quê |
|---|---|---|
| `exp33.relics` | `relic33.ts` | Peça "de tocar" (guitarra, microfone, piano, bateria, baixo, ampli, sintetizador, metais, fita master) no acervo: +1% na qualidade das faixas do seu elenco, +1% se for do mesmo gênero; teto +3% (cadeia `songQ`). Peça Notável+ que chega às suas mãos sai na imprensa uma vez (fato público, +1/+2 reputação artística; 1 por mês). Garantia: ver ganchos. |
| `exp33.sampling` | `sample33.ts` | Artistas de outros selos pedem para samplear (1979+) ou regravar faixa sua (disco do selo com 3+ anos e 20 mil+ unidades; 6%/mês). Liberar: cachê, o original vende ×1,15 por 26 semanas e a versão entra na cadeia por 2 anos. Negar (ou não responder em 8 semanas): 35% (45% com fama 60+) de usarem assim mesmo → processo. |
| `exp33.resurface` | `resurf33.ts` | 5%/mês uma faixa antiga sua (regra `oldRel19`: 10+ anos) toca num filme (1930+), novela (1965+, mercado BR/América Latina), série (1955+, fora deles), comercial de TV (1950+) ou vídeo curto (2019+). Cachê de sync (só master seu), fato público, linha na vitrine e calor no `revival19.stage19` (+12 além do calor do tipo). Nome do veículo vem de um título de `POP31` (filme/série/brasil) ativo no ano. |
| `exp33.chain` | `chain33.ts` | Extrato por elo (`chain33`: compositor, editora, intérprete, produtor, selo, obra original). Efeito: versões de outros selos de obras que a sua editora administra pagam a sua fatia da edição todo mês (delta de receita do disco × 12% × fatia da versão × sua fatia de edição); a primeira leitura só marca. Mais as versões liberadas pelo sampling (pela fama de quem gravou). |
| `exp33.formats` | `formats33.ts` | Vida por formato pelas datas de tecnologia: vinil cheio até CD+6, morre até CD+14 (8%), volta de streaming+2 a 60% em streaming+12; cassete morre CD+8→+16 (respiro 10% após streaming+8); CD morre streaming+3→+12 (15%). Parte física das vendas × vida do melhor formato do disco ÷ melhor formato vivo (`chartUnits`). Viradas no jornal uma vez: vinil morre, cassete morre, vinil volta, CD morre. |

## Decisões
- Não dupliquei o que existia: leilão/consignação (auction31), sample e cover de obra ALHEIA (rights18), regravação do
  artista (rights18) e sucesso tardio (revival19) ficam como estão; a 33 liga neles.
- `auction31.ts` ganhou só `consignGuard31` (peça empenhada não vai a pregão). rights18, sealed31 e relics não mudaram.
- pop31 (dividido com a MUNDO): só leitura de `POP31` para dar nome ao veículo; nenhuma linha nova no arquivo de dados.
  Memes e bolhas com efeito econômico são da MUNDO.
- Fato novo `culture33` (catálogo que reaparece e viradas de formato); `case_ruling` para processos.
- Goldens não rodados (TESTES MÍNIMOS); com tudo desligado não há caminho que mude estado ou sorteio.

## Ganchos para outras frentes
- **Banco (INT-2 / GESTÃO)**: `collateral33(s)` (peças aceitas e valor = 50% do lance inicial), `pledge33(s, rid, credor)`,
  `unpledge33(s, rid)`, `seize33(s, rid, credor)` → valor apurado para abater a dívida (a peça vai a leilão em nome do credor).
- **Cartório/tribunal (INT-2)**: `openCases33(s)`, `resolveCase33(s, id, 'settle' | 'court' | 'drop')`, `caseOdds33(s)`.
  Sem ninguém chamar em 26 semanas o processo vira acordo automático (60%).
- **Interface (caixa de entrada / cartão da obra)**: `openReqs33(s)` e `answerReq33(s, id, ok)`.
- **Vitrine**: `resurfaced33(s, semanas)`. **Agência de publicidade / estúdio de TV (INT-2)**: `resurface33(s, rel, k)`.
- **Cartão do disco**: `chain33(s, rel)`, `chainYear33(s)`. **Robôs (GESTÃO)** e loja/prensa: `formatTrend33(s)`, `formatFit33`.
- **Museu (INT-1)**: `relicQ33` / imprensa já leem o acervo; exposição usa o `rl.ex` de sempre.

## Fora desta rodada
Telas/cartões de ação para pedidos, processos, extrato da cadeia e tendência de formato (só ganchos); robôs respondendo
pedidos de sample; efeito do formato no custo de prensa (o supply13 já tem a fila do vinil 2018–22).
