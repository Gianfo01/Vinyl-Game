# R29 DEMO — fãs e ouvintes por IDADE e REGIÃO, com gosto por geração

Ramo `claude/r29-demo`, a partir de `claude/friendly-brown-vpsmfl`. Pergunta do autor: "hoje temos sistema de fãs e
ouvintes por idade e por localidade? Também temos preferências de artistas e de ouvintes por certas bandas e estilos por
idade e região?" — antes: não (só um total global e proxies de idade). Agora sim, ligado ao resto do jogo.

Módulos: `src/sim/sys/demo29.ts` (simulação), `src/sim/demo29hook.ts` (pontos de encaixe sem ciclo de imports),
`src/ui/sys/demo29.ts` + `demo29.css` (vistas). Testes: `tests/r29-demo.test.ts`. Capturas: `docs/shots29demo/`.
Scripts de medição: `scripts/abl29demo.ts`, `mods29demo.ts`, `mix29demo.ts`, `bytes29demo.ts`, `shots29demo.mjs`.

## 1. Modelo

### Idade (5 faixas)
`13–17 · 18–24 · 25–34 · 35–49 · 50+`. Cada ato guarda as **fatias** (milésimos que somam 1000) sobre o total que já
existe (`act.fans.casual + active + core`). Nenhum número novo de fãs: quem lê `fans.casual/active/core` segue igual, e
`ageFans29` reparte o total por restos maiores (a soma bate exatamente).

- **Quem é guardado:** os atos do jogador e as 60 maiores estrelas de fora (fama ≥ 45). Os outros são **derivados** da
  carreira (função pura, sem custo de save).
- **Envelhecimento:** na virada do ano (fechamento de dezembro) 1/largura de cada faixa sobe para a próxima (13–17 → 5
  anos, 18–24 → 7, 25–34 → 10, 35–49 → 15); 50+ perde ~4%/ano. Quem tinha 15 em 1965 está em 35–49 nos anos 90.
- **Mês:** entrada líquida de fãs chega pelo *perfil de entrada*; saída líquida tira mais dos jovens (mais volúveis); e há
  **troca** mensal (0,3% + 1% × momento, +1% se viral): ato parado quase não troca e **envelhece com o público**.
- **Migração de saves antigos:** sem `x4.demo29`, `seed29` simula a carreira desde a estreia (perfil de entrada de cada
  ano + envelhecimento + troca maior enquanto lança discos). O primeiro mês grava o resultado.

### Perfil de entrada (quem vira fã agora) — `inflow29`
Produto de: demografia do mercado na época (`demog29`: baby boom → jovens nos anos 60; envelhecimento depois, mais cedo
na Europa e Ásia; África jovem) × quem descobre música nova (rádio/TV → streaming e vídeo curto puxam jovens) × gosto de
cada geração pelo gênero (`taste29`) × idade da formação (o público se aproxima de ~85% da idade do artista) ×
posicionamento (crossover puxa jovens) × público-alvo do projeto (recipe12/project12) × canais de marketing × canais de
lançamento (outlets17 `youth`) × formato das rádios que tocam (radio18) × redescoberta ativa (revival19/audience8).
O "por quê" está em `registerExplain('demo29.inflow')` (link "Por que esse público?" na aba).

### Gosto — `taste29(s, idade, região, gênero, ano?)`
- **Novidade:** jovem adota gênero novo; acima de 30 anos estranha (decai com a idade do gênero, ~10 anos).
- **Nostalgia:** cada coorte guarda afinidade com a música da juventude (ano de nascimento + 18): popularidade da família
  naquela época ÷ média das famílias. Popularidade histórica = curva por era (`HIST29`) misturada ao `genrePop` que a
  partida registra (média por família em blocos de 5 anos, `gh`). O peso da nostalgia cresce com a idade.
- **Região:** tendência regional por família (`rp`), medida todo mês nas paradas de cada mercado (`board('r:mk')`) sobre
  a preferência de base (`MARKET_PREF`), **normalizada para a média ponderada pelo tamanho dos mercados = 1** — o
  `genrePop` global continua sendo o agregado.

### Região
- **Mercados:** o livro regional de fãs já existia (`terr20`, só atos do jogador, somando o total por coorte). O demo29 o
  reaproveita; para atos de fora usa a fama regional (`target20`).
- **Países (até 8 por ato do jogador, como o teto de 12 do fame16):** base = tamanho do mercado do país × (0,5 + fama
  local) × diáspora do gênero (`regions18.dias18`) — herói local e favorito da diáspora saem daí. A conversão de cada show
  fica no PAÍS onde ele aconteceu; sem atividade, deriva 8%/mês para a base.

### API de leitura (sonda da R29 CONNECT)
`ageMix29(s, act)` (5 fatias), `regionMix29(s, act)` (`{ mk, top: [{a3, v, local}] }`), `taste29(s, idade, região, gênero)`.
Também: `inflow29`, `ageFans29`, `demog29`, `histPop29`, `rTrend29`, `fakeYouth29`.

## 2. Conexões

| Sistema | Como o público por idade/região entra |
|---|---|
| Mercado (market.ts, apelo) | `appeal:demo29` (família **fans**): formato × idade — single rende com base jovem; LP, ao vivo e luxo com adultos; relançamento/coletânea com 35+ e 50+ (antes de 1955 vale metade). Público-alvo do projeto: mirar onde o público está rende agora (0,95–1,05). Teto 0,82–1,18. |
| Mercado (tendência regional) | `appeal:demo29reg` (família **world**): tendência do gênero nos territórios do lançamento (0,85–1,15). |
| Canais / streaming | `chartUnits:demo29`: no streaming, single de base jovem e álbum de base adulta (±10%). |
| Físico (eras18) | `physShareRel18` × `DEMO29.phys`: base mais velha compra vinil/CD por mais tempo (0,7–1,35; só com download/streaming no mundo). |
| Paradas por país (charts7) | `countryWeights` × `DEMO29.cw`: tendência regional do gênero (√rp) e, nos seus atos, países com mais fãs do que a base explica. Muda paradas nacionais → fama regional → prêmios nacionais. |
| Ao vivo — demanda | `cityDemand:demo29`: quem vai a show por idade (0,82–1,15) × fãs no país além do que o mercado explica (0,9–1,15) × turnê de reunião. |
| Ao vivo — preço | tours.ts: expoente da elasticidade × `DEMO29.elast` (jovem sente mais; adulto de mercado rico paga). Sem efeito com preço padrão. |
| Banca / dinheiro | `showRevenue:demo29`: gasto por idade (±8%), sobre o poder de compra que já existia (pp18). |
| Mídia | `MEDIA18.eff` × `chanFit29`: o canal rende mais quando alcança a idade do público (vídeo curto com base de 50+ rende menos). Canais, outlets17 e formatos de rádio18 também mudam QUEM chega. |
| Projeto (recipe12) | o público-alvo (jovens/adultos/fiéis/crítica) muda o perfil de entrada por 26 semanas e o apelo da estreia. |
| Festivais (fests8) | line-up × `DEMO29.fest`: idade do público do festival (foco de gêneros × demografia × ida a show) × idade do público do ato (0,85–1,15). |
| Redescoberta (revival19/audience8) | escolha da faixa × ciclo de nostalgia de ~25 anos (`DEMO29.revW`); quem chega: vídeo curto/viral/remix/jogo/série → 13–24; comercial/filme/documentário → a coorte original. |
| Escândalo (fanscandal28) | `stance28` + `DEMO29.scandal`: base jovem perdoa mais (mainstream/comunidade); purista de base velha abandona (fora política/blasfêmia). |
| Prêmios (awards18) | `REL_ADJ19`: idade do corpo de votantes × idade do público (±4 pontos); fatia jovem dos votantes favorece base jovem. |
| Ofertas (contracts) | `registerOfferMod('demo29')`: carreiras de fama/status/dinheiro preferem um selo cujo elenco fala com a mesma geração (±0,04). |
| Submundo | `FRAUD29`/`registerFraud29` (gancho para fraudes novas; multiplica unidades, não vira fã). A fazenda de streams de sempre (`stream18.farm`, usada pelo `x:streams` do crime digital) já conta nas unidades; `fakeYouth29` a mostra como ouvintes de 13–24 na aba. |
| Vida pessoal | idade da formação puxa o público; ato parado envelhece com a base; reunião (`onFact('reunion')`) → por 2 anos a coorte 35+ lota a volta. |
| Mundo / eras | demografia por era e região no perfil de entrada e no público dos festivais. |
| Conselheiro / Cockpit | `registerAdvisorTip('demo29')`: "Seu público envelheceu: vinil vende mais…", "Público jovem…" (categoria Projetos/lançamento); diário anual na aba. |

Famílias de apelo (caps18 `APPEAL_CAT19`): `demo29` → fans, `demo29reg` → world. Retornos decrescentes de sempre.
Interruptor de ablação (só Node): `DEMO29_OFF=appeal,reg,units,phys,cw,live,elast,merch,eff,scandal,revw,fest,awards,offer`.

## 3. Interface (só vistas)
- **Ficha do ato › Público** (`registerPageTab('act','demo29')`): pirâmide em pixel (bonequinhos 3×5, estilo antigo),
  leitura do público, tabela por faixa (fatia, fãs, quem chega agora, gosto pelo gênero), mercados e países com bandeira
  (geo29) e "herói local", streams de robôs, diário.
- **Artistas › Público e mídia:** resumo (pirâmide, barra e 3 países).
- **Paradas › Rádio e outras paradas:** "Quem ouve cada estilo (idade)" por região, com a tendência regional.
- **Projeto:** sob "Público-alvo", quais faixas o alvo mira × onde está o público do ato.
- **Mundo › Mapa** (e Mapa detalhado): camada "Fãs por idade" (bolha e véu na cor da faixa dominante, dica com as fatias).
- **Cockpit › Mesa do mês:** dicas do conselheiro.

## 4. Números
(preenchido na seção 5/6 com as medições finais)

## 5. Testes
(ver abaixo)

## 6. Lacunas
(ver abaixo)
